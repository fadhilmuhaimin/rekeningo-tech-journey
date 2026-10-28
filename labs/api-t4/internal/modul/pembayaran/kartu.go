package pembayaran

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"lab/apit4/internal/modul/ledger"
)

// Otorisasi kartu di service pembayaran (ADR 42 dan ADR 37, lab t4-kartu). Penerbit meminta persetujuan dengan
// tenggat 2 detik. Persetujuan tidak bisa ditarik, jadi service ini tidak menjawab "setuju" sebelum ledger
// menahan dana: satu panggilan ke API ledger dengan Idempotency-Key = id_penerbit, di luar transaction service ini
// (ADR 22), lalu satu baris otorisasi_kartu di schema pembayaran. Di antara dua langkah itu ada jendela: proses yang
// mati di dalamnya meninggalkan hold di ledger tanpa baris. Ulangan penerbit dengan id yang sama mendapat hold yang
// sama (key ledger), tetapi hold yang tidak pernah diulang tidak punya baris yang bisa dikedaluwarsakan.

// UmurTahanKartu: hold kedaluwarsa 7 hari sesudah otorisasi (Asumsi, ADR 42).
const UmurTahanKartu = 7 * 24 * time.Hour

// MaksJumlahKartu: batas wajar satu otorisasi (Asumsi lab), sama dengan versi satu proses.
const MaksJumlahKartu = 50_000_000

var (
	// ErrOtorisasiBeda: id_penerbit sudah dipakai untuk kartu atau jumlah lain.
	ErrOtorisasiBeda = errors.New("id_penerbit sudah dipakai untuk otorisasi lain")
	// ErrKartuValidasi: bentuk permintaan penerbit salah (id, token, atau jumlah).
	ErrKartuValidasi = errors.New("permintaan otorisasi tidak sah")
)

// Penahan adalah kontrak ke ledger untuk hold kartu (dipenuhi ledger.Klien).
type Penahan interface {
	TahanKartu(ctx context.Context, kunci string, p ledger.PermintaanTahan) (ledger.Hasil, error)
}

// PermintaanOtorisasi: yang dikirim penerbit.
type PermintaanOtorisasi struct {
	IDPenerbit string
	Token      string
	Jumlah     int64
}

// Keputusan: jawaban untuk penerbit. Alasan satu kata, hanya pada penolakan.
type Keputusan struct {
	Keputusan string `json:"keputusan"` // setuju atau tolak
	Alasan    string `json:"alasan,omitempty"`
}

func setuju() Keputusan             { return Keputusan{Keputusan: "setuju"} }
func tolak(alasan string) Keputusan { return Keputusan{Keputusan: "tolak", Alasan: alasan} }

type kartuBaris struct {
	id, akun, batasHarian int64
	status                string
}

type otorisasiBaris struct {
	kartuID, jumlah int64
	status          string
}

func periksaPermintaan(in PermintaanOtorisasi) error {
	switch {
	case in.IDPenerbit == "" || len(in.IDPenerbit) > 64:
		return fmt.Errorf("%w: id_penerbit wajib, paling banyak 64 karakter", ErrKartuValidasi)
	case in.Token == "" || len(in.Token) > 128:
		return fmt.Errorf("%w: token wajib, paling banyak 128 karakter", ErrKartuValidasi)
	case in.Jumlah <= 0 || in.Jumlah > MaksJumlahKartu:
		return fmt.Errorf("%w: jumlah harus lebih dari 0 dan paling banyak %d", ErrKartuValidasi, MaksJumlahKartu)
	}
	return nil
}

func (s *Service) kartuAktif() bool { return s.KartuAktif == nil || s.KartuAktif.Load() }

func (s *Service) bacaKartu(ctx context.Context, token string) (kartuBaris, error) {
	var k kartuBaris
	err := s.DB.QueryRowContext(ctx, `SELECT id, akun_id, status, batas_harian FROM kartu WHERE token_penerbit = $1`, token).
		Scan(&k.id, &k.akun, &k.status, &k.batasHarian)
	return k, err
}

func (s *Service) bacaOtorisasi(ctx context.Context, idPenerbit string) (otorisasiBaris, error) {
	var o otorisasiBaris
	err := s.DB.QueryRowContext(ctx, `SELECT kartu_id, jumlah, status FROM otorisasi_kartu WHERE id_penerbit = $1`, idPenerbit).
		Scan(&o.kartuID, &o.jumlah, &o.status)
	return o, err
}

// jawabUlang: id_penerbit yang sama dijawab dengan keputusan yang sama, tanpa hold kedua. Kartu atau jumlah yang
// berbeda dengan otorisasi yang tercatat berarti id itu dipakai untuk hal lain.
func jawabUlang(o otorisasiBaris, k kartuBaris, in PermintaanOtorisasi) (Keputusan, error) {
	if o.kartuID != k.id || o.jumlah != in.Jumlah {
		return Keputusan{}, ErrOtorisasiBeda
	}
	if o.status == "ditolak" {
		return tolak("ditolak-sebelumnya"), nil
	}
	return setuju(), nil
}

// catatTolak menulis satu baris otorisasi berstatus ditolak. Dua penolakan serentak untuk id yang sama: yang kedua
// tidak menulis apa pun (ON CONFLICT DO NOTHING) dan tetap dijawab tolak.
func (s *Service) catatTolak(ctx context.Context, k kartuBaris, in PermintaanOtorisasi, alasan string) (Keputusan, error) {
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO otorisasi_kartu (kartu_id, id_penerbit, jumlah, status) VALUES ($1, $2, $3, 'ditolak')
		ON CONFLICT (id_penerbit) DO NOTHING`, k.id, in.IDPenerbit, in.Jumlah)
	if err != nil {
		return Keputusan{}, err
	}
	return tolak(alasan), nil
}

// --8<-- [start:otorisasi-pembayaran]
// Otorisasi menjawab penerbit. Urutan: validasi, kill switch, kartu, jawaban untuk id yang sudah pernah dijawab,
// status kartu dan batas harian (dibaca dari tabel sendiri, tanpa lock), lalu hold di ledger dan baris otorisasi.
//
// Ledger yang tidak menjawab (timeout, 5xx) dijawab "tolak": hold mungkin sudah ditulis, dan ulangan penerbit
// dengan id yang sama akan mendapat hold itu, bukan hold kedua. Lock yang tidak didapat ledger dalam lock_timeout
// dijawab "tolak, sibuk" tanpa baris, karena tidak ada hold.
func (s *Service) Otorisasi(ctx context.Context, in PermintaanOtorisasi) (Keputusan, error) {
	if err := periksaPermintaan(in); err != nil {
		return Keputusan{}, err
	}
	if !s.kartuAktif() {
		return tolak("kill-switch"), nil
	}
	k, err := s.bacaKartu(ctx, in.Token)
	if errors.Is(err, sql.ErrNoRows) {
		return tolak("kartu-tidak-dikenal"), nil
	}
	if err != nil {
		return Keputusan{}, err
	}
	if o, err := s.bacaOtorisasi(ctx, in.IDPenerbit); err == nil {
		return jawabUlang(o, k, in)
	} else if !errors.Is(err, sql.ErrNoRows) {
		return Keputusan{}, err
	}
	if k.status != "aktif" {
		return s.catatTolak(ctx, k, in, "kartu-dibekukan")
	}
	var hariIni int64
	if err := s.DB.QueryRowContext(ctx, `
		SELECT coalesce(sum(jumlah), 0) FROM otorisasi_kartu
		WHERE kartu_id = $1 AND status IN ('ditahan', 'ditangkap')
		  AND dibuat >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'`, k.id).Scan(&hariIni); err != nil {
		return Keputusan{}, err
	}
	if hariIni+in.Jumlah > k.batasHarian {
		return s.catatTolak(ctx, k, in, "batas-harian")
	}
	h, err := s.Penahan.TahanKartu(ctx, in.IDPenerbit, ledger.PermintaanTahan{IDPenerbit: in.IDPenerbit, AkunID: k.akun, Jumlah: in.Jumlah})
	var pen ledger.Penolakan
	switch {
	case errors.Is(err, ledger.ErrSibuk):
		return tolak("sibuk"), nil
	case errors.As(err, &pen) && pen.Alasan == "saldo-kurang":
		return s.catatTolak(ctx, k, in, "saldo-kurang")
	case errors.As(err, &pen) && pen.Alasan == "akun-dibekukan":
		return s.catatTolak(ctx, k, in, "kartu-dibekukan")
	case errors.As(err, &pen) && pen.Alasan == "key-dipakai-permintaan-lain":
		return Keputusan{}, ErrOtorisasiBeda
	case errors.Is(err, ledger.ErrTidakPasti):
		return tolak("ledger-tidak-menjawab"), nil
	case err != nil:
		return Keputusan{}, err
	}
	s.titik("sesudah-ledger") // lab: proses dimatikan atau ditahan di antara hold di ledger dan baris otorisasi
	// Hold sudah ada di ledger. Baris ditulis walau penerbit sudah memutus koneksi (tenggat 2 detik lewat): tanpa baris,
	// tidak ada yang bisa mengedaluwarsakan hold itu. Konteks dilepas dari pembatalan permintaan dan diberi batas sendiri.
	ctx, batal := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer batal()
	tahanSampai := s.kini().Add(UmurTahanKartu)
	hasil, err := s.DB.ExecContext(ctx, `
		INSERT INTO otorisasi_kartu (kartu_id, id_penerbit, jumlah, status, jurnal_tahan_id, tahan_sampai)
		VALUES ($1, $2, $3, 'ditahan', $4, $5)
		ON CONFLICT (id_penerbit) DO NOTHING`, k.id, in.IDPenerbit, in.Jumlah, h.Jurnal, tahanSampai)
	if err != nil {
		return Keputusan{}, err
	}
	if n, _ := hasil.RowsAffected(); n == 0 { // dua permintaan dengan id yang sama tiba bersamaan: yang pertama menang
		o, err := s.bacaOtorisasi(ctx, in.IDPenerbit)
		if err != nil {
			return Keputusan{}, err
		}
		return jawabUlang(o, k, in)
	}
	return setuju(), nil
}

// --8<-- [end:otorisasi-pembayaran]
