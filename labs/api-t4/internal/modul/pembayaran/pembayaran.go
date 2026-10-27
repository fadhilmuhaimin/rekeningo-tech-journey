// Package pembayaran adalah modul pembayaran yang dipisah menjadi service sendiri (ADR 37): top-up dari bank lewat
// gateway, webhook masuk, dan job cek status. Modul ini hanya memegang tabel schema pembayaran (topup_bank,
// webhook_event, insiden_rekon) dan kredensial gateway. Uang bergerak di ledger: modul ini meminta jurnal lewat
// API ledger dengan Idempotency-Key = order_id (ADR 34), di luar transaction-nya sendiri (ADR 22), lalu menulis
// webhook_event dan status topup_bank dalam satu transaction. Modul ini tidak mengimpor internal/repo dan
// internal/service (dijaga tes).
package pembayaran

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/modul/ledger"
)

// ToleransiWebhook: selisih waktu terbesar antara timestamp kiriman dan jam service (bawaan satu gateway nyata,
// Asumsi untuk tiruan; ADR 34).
const ToleransiWebhook = 5 * time.Minute

var (
	ErrTandaTangan = errors.New("tanda tangan webhook tidak sah")
	ErrKabar       = errors.New("kabar gateway tidak sah")
	ErrTidakAda    = errors.New("top-up tidak ada")
)

// statusGateway memetakan status di kabar gateway ke status topup_bank.
var statusGateway = map[string]string{"settlement": "dibayar", "pending": "menunggu", "expire": "kedaluwarsa", "failure": "gagal"}

// Kabar: isi webhook dari gateway. Dipercaya hanya sesudah tanda tangannya cocok.
type Kabar struct {
	EventID string `json:"event_id"`
	OrderID string `json:"order_id"`
	Status  string `json:"status"`
	Jumlah  int64  `json:"jumlah"`
}

// Hasil: yang dijawab ke gateway. Hasil: diproses, ganda, diparkir, ditolak (sama dengan webhook_event.hasil).
type Hasil struct {
	Hasil  string `json:"hasil"`
	Jurnal *int64 `json:"jurnal,omitempty"`
}

// Topup adalah satu baris topup_bank.
type Topup struct {
	ID       int64
	AkunID   int64
	OrderID  string
	Jumlah   int64
	Status   string
	JurnalID *int64
	Dibuat   time.Time
}

// Pengkredit adalah kontrak ke ledger (dipenuhi ledger.Klien).
type Pengkredit interface {
	KreditTopup(ctx context.Context, kunci string, p ledger.Permintaan) (ledger.Hasil, error)
}

// Gateway adalah kontrak ke gateway pembayaran (dipenuhi gateway.Klien).
type Gateway interface {
	BuatOrder(ctx context.Context, orderID string, jumlah int64, kedaluwarsa time.Time) (gateway.Order, error)
	Status(ctx context.Context, orderID string) (gateway.Order, error)
}

// Service memegang koneksi dengan role pembayaran saja.
type Service struct {
	DB      *sql.DB
	Ledger  Pengkredit
	Gateway Gateway
	Rahasia []string // yang pertama dipakai gateway sekarang, berikutnya masa tumpang tindih rotasi (ADR 35)
	// RahasiaFn, bila diisi, menggantikan Rahasia dan dipanggil di setiap pemeriksaan: rahasia dibaca dari secret
	// manager saat runtime, jadi rotasi tidak butuh deploy (lab t4-infra, ADR 39).
	RahasiaFn func() []string
	Kini      func() time.Time

	// Lab saja: dipanggil di titik tertentu ("sesudah-ledger": ledger sudah menjurnal, transaction pembayaran belum
	// dibuka). Lab memasang SIGKILL ke proses sendiri di sini.
	TitikGagal func(titik string)
}

func (s *Service) kini() time.Time {
	if s.Kini != nil {
		return s.Kini()
	}
	return time.Now()
}

func (s *Service) titik(nama string) {
	if s.TitikGagal != nil {
		s.TitikGagal(nama)
	}
}

func (s *Service) daftarRahasia() []string {
	if s.RahasiaFn != nil {
		return s.RahasiaFn()
	}
	return s.Rahasia
}

// TandaTangan: HMAC-SHA256 atas "<timestamp>.<byte mentah body>", heksadesimal (ADR 34).
func TandaTangan(rahasia string, timestamp int64, body []byte) string {
	m := hmac.New(sha256.New, []byte(rahasia))
	fmt.Fprintf(m, "%d.", timestamp)
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// PeriksaTandaTangan menerima kiriman bila timestamp ada dalam ToleransiWebhook dari jam service dan tanda tangan
// cocok dengan salah satu rahasia. Perbandingan dengan hmac.Equal; semua rahasia diperiksa tanpa berhenti di yang
// pertama cocok.
func (s *Service) PeriksaTandaTangan(timestamp, tanda string, body []byte) error {
	ts, err := strconv.ParseInt(strings.TrimSpace(timestamp), 10, 64)
	if err != nil {
		return ErrTandaTangan
	}
	selisih := s.kini().Sub(time.Unix(ts, 0))
	if selisih < 0 {
		selisih = -selisih
	}
	if selisih > ToleransiWebhook {
		return ErrTandaTangan
	}
	diterima, err := hex.DecodeString(strings.TrimSpace(tanda))
	if err != nil {
		return ErrTandaTangan
	}
	cocok := false
	for _, r := range s.daftarRahasia() {
		hitung, _ := hex.DecodeString(TandaTangan(r, ts, body))
		if hmac.Equal(hitung, diterima) {
			cocok = true
		}
	}
	if !cocok {
		return ErrTandaTangan
	}
	return nil
}

// --8<-- [start:terima-webhook]
// TerimaWebhook memproses satu kiriman. Urutannya: tanda tangan atas byte mentah dan timestamp, JSON diurai,
// top-up dicari (jumlah dan akun diambil dari baris top-up, bukan dari isi kabar), lalu status dimajukan.
func (s *Service) TerimaWebhook(ctx context.Context, body []byte, timestamp, tanda string) (Hasil, error) {
	if err := s.PeriksaTandaTangan(timestamp, tanda, body); err != nil {
		return Hasil{}, err
	}
	var k Kabar
	if err := json.Unmarshal(body, &k); err != nil || k.EventID == "" || k.OrderID == "" {
		return Hasil{}, ErrKabar
	}
	target, ok := statusGateway[k.Status]
	if !ok {
		return Hasil{}, ErrKabar
	}
	tp, err := s.topupLewatOrder(ctx, k.OrderID)
	if errors.Is(err, ErrTidakAda) {
		return s.selesai(ctx, k.EventID, k.Status, nil, "ditolak", nil, nil)
	}
	if err != nil {
		return Hasil{}, err
	}
	return s.terapkan(ctx, k.EventID, k.Status, tp, target, k.Jumlah)
}

// --8<-- [end:terima-webhook]

// --8<-- [start:terapkan]
// terapkan memajukan status satu top-up. Status hanya maju: kabar yang sama dengan status sekarang adalah ganda,
// kabar yang mundur diparkir. Untuk dibayar, ledger diminta menjurnal lewat API dengan key = order_id (di luar
// transaction), lalu event dan status ditulis dalam satu transaction (selesai). Dipakai webhook dan job cek status,
// jadi dua jalur kabar bertemu di key yang sama.
func (s *Service) terapkan(ctx context.Context, eventID, jenis string, tp Topup, target string, jumlahKabar int64) (Hasil, error) {
	belumAkhir := tp.Status == "menunggu" || tp.Status == "tidak_pasti"
	switch {
	case target == "menunggu":
		if tp.Status == "tidak_pasti" {
			return s.selesai(ctx, eventID, jenis, &tp, "diproses", nil, []string{"tidak_pasti"}, "menunggu")
		}
		if tp.Status == "menunggu" {
			return s.selesai(ctx, eventID, jenis, &tp, "diproses", nil, nil)
		}
		return s.selesai(ctx, eventID, jenis, &tp, "diparkir", nil, nil) // mundur dari status akhir
	case target == tp.Status:
		return s.selesai(ctx, eventID, jenis, &tp, "ganda", tp.JurnalID, nil)
	case !belumAkhir:
		return s.selesai(ctx, eventID, jenis, &tp, "diparkir", nil, nil)
	case target != "dibayar":
		return s.selesai(ctx, eventID, jenis, &tp, "diproses", nil, []string{"menunggu", "tidak_pasti"}, target)
	case jumlahKabar != tp.Jumlah:
		return s.selesai(ctx, eventID, jenis, &tp, "ditolak", nil, nil)
	}
	h, err := s.Ledger.KreditTopup(ctx, tp.OrderID, ledger.Permintaan{OrderID: tp.OrderID, AkunID: tp.AkunID, Jumlah: tp.Jumlah})
	switch {
	case errors.Is(err, ledger.ErrDitolak):
		return s.selesai(ctx, eventID, jenis, &tp, "diparkir", nil, nil) // dibekukan atau batas tingkat: tim risk memutuskan
	case err != nil:
		return Hasil{}, err // hasil tidak diketahui: tidak menandai apa pun, kiriman ulang memakai key yang sama
	}
	s.titik("sesudah-ledger")
	return s.selesai(ctx, eventID, jenis, &tp, "diproses", &h.Jurnal, []string{"menunggu", "tidak_pasti"}, "dibayar")
}

// --8<-- [end:terapkan]

// --8<-- [start:selesai]
// selesai menulis event dan status top-up dalam satu transaction; balasan 2xx ke gateway baru sesudah COMMIT.
// event_id adalah kunci utama webhook_event: kiriman yang sama atau yang kalah serentak mendapat nol baris dan
// dijawab ganda tanpa mengubah status. dari/ke kosong berarti status tidak berubah. eventID kosong (job cek
// status) tidak menulis event.
func (s *Service) selesai(ctx context.Context, eventID, jenis string, tp *Topup, hasil string, jurnal *int64, dari []string, ke ...string) (Hasil, error) {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return Hasil{}, err
	}
	defer tx.Rollback()
	if eventID != "" {
		r, err := tx.ExecContext(ctx, `INSERT INTO webhook_event (event_id, jenis, hasil) VALUES ($1, $2, 'diproses') ON CONFLICT (event_id) DO NOTHING`, eventID, jenis)
		if err != nil {
			return Hasil{}, err
		}
		if n, _ := r.RowsAffected(); n == 0 {
			return Hasil{Hasil: "ganda"}, tx.Commit()
		}
	}
	h := Hasil{Hasil: hasil, Jurnal: jurnal}
	if tp != nil && dari != nil && len(ke) == 1 {
		var r sql.Result
		if ke[0] == "dibayar" && jurnal != nil {
			r, err = tx.ExecContext(ctx, `UPDATE topup_bank SET status = 'dibayar', jurnal_id = $2 WHERE id = $1 AND status = ANY($3)`, tp.ID, *jurnal, dari)
		} else {
			r, err = tx.ExecContext(ctx, `UPDATE topup_bank SET status = $3 WHERE id = $1 AND status = ANY($2)`, tp.ID, dari, ke[0])
		}
		if err != nil {
			return Hasil{}, err
		}
		if n, _ := r.RowsAffected(); n == 0 { // kiriman atau job lain sudah memajukan baris ini lebih dulu
			h = Hasil{Hasil: "ganda", Jurnal: jurnal}
		}
	}
	if eventID != "" {
		var tid *int64
		if tp != nil {
			tid = &tp.ID
		}
		if _, err := tx.ExecContext(ctx, `UPDATE webhook_event SET topup_id = $2, hasil = $3, jurnal_id = $4 WHERE event_id = $1`, eventID, tid, h.Hasil, h.Jurnal); err != nil {
			return Hasil{}, err
		}
	}
	return h, tx.Commit()
}

// --8<-- [end:selesai]

const kolomTopup = `id, akun_id, order_id, jumlah, status, jurnal_id, dibuat`

func pindai(row interface{ Scan(...any) error }) (Topup, error) {
	var t Topup
	err := row.Scan(&t.ID, &t.AkunID, &t.OrderID, &t.Jumlah, &t.Status, &t.JurnalID, &t.Dibuat)
	if errors.Is(err, sql.ErrNoRows) {
		return t, ErrTidakAda
	}
	return t, err
}

func (s *Service) topupLewatOrder(ctx context.Context, orderID string) (Topup, error) {
	return pindai(s.DB.QueryRowContext(ctx, `SELECT `+kolomTopup+` FROM topup_bank WHERE order_id = $1`, orderID))
}

// Topup membaca satu top-up lewat nomor order.
func (s *Service) Topup(ctx context.Context, orderID string) (Topup, error) {
	return s.topupLewatOrder(ctx, orderID)
}

// BuatTopup menulis baris menunggu, lalu memanggil gateway di luar transaction (timeout dari klien, ADR 22).
// Timeout menghasilkan tidak_pasti (order mungkin sudah ada), penolakan menghasilkan gagal.
func (s *Service) BuatTopup(ctx context.Context, orderID string, akun, jumlah int64) (Topup, error) {
	kedaluwarsa := s.kini().Add(24 * time.Hour)
	var id int64
	if err := s.DB.QueryRowContext(ctx, `INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES ($1, $2, $3, $4) RETURNING id`,
		akun, orderID, jumlah, kedaluwarsa).Scan(&id); err != nil {
		return Topup{}, err
	}
	_, gerr := s.Gateway.BuatOrder(ctx, orderID, jumlah, kedaluwarsa)
	switch {
	case gerr == nil:
	case errors.Is(gerr, gateway.ErrTidakPasti):
		_, err := s.DB.ExecContext(ctx, `UPDATE topup_bank SET status = 'tidak_pasti' WHERE id = $1 AND status = 'menunggu'`, id)
		if err != nil {
			return Topup{}, err
		}
	default:
		_, err := s.DB.ExecContext(ctx, `UPDATE topup_bank SET status = 'gagal' WHERE id = $1 AND status = 'menunggu'`, id)
		if err != nil {
			return Topup{}, err
		}
	}
	return s.topupLewatOrder(ctx, orderID)
}

// CekStatus menanyakan keadaan satu order ke gateway (di luar transaction) dan menerapkannya lewat terapkan yang
// sama dengan webhook. Mengembalikan hasil penerapan.
func (s *Service) CekStatus(ctx context.Context, orderID string) (Hasil, error) {
	tp, err := s.topupLewatOrder(ctx, orderID)
	if err != nil {
		return Hasil{}, err
	}
	if tp.Status != "menunggu" && tp.Status != "tidak_pasti" {
		return Hasil{Hasil: "ganda", Jurnal: tp.JurnalID}, nil
	}
	o, err := s.Gateway.Status(ctx, tp.OrderID)
	if errors.Is(err, gateway.ErrTidakAda) { // order tidak pernah dibuat di gateway (mis. timeout sebelum sampai)
		return s.terapkan(ctx, "", "", tp, "gagal", 0)
	}
	if err != nil {
		return Hasil{}, err
	}
	target, ok := statusGateway[o.Status]
	if !ok {
		return Hasil{}, fmt.Errorf("status gateway tidak dikenal: %q", o.Status)
	}
	return s.terapkan(ctx, "", "", tp, target, o.Jumlah)
}

// Ringkasan satu putaran job cek status.
type Ringkasan struct{ Diperiksa, Dikredit, Selesai, Tertunda, Galat int }

// CekBelumSelesai: top-up menunggu atau tidak_pasti yang lebih tua dari umur ditanyakan ke gateway satu per satu
// (ADR 35). Umur diukur dari jam service.
func (s *Service) CekBelumSelesai(ctx context.Context, umur time.Duration) (Ringkasan, error) {
	var r Ringkasan
	rows, err := s.DB.QueryContext(ctx, `SELECT order_id FROM topup_bank WHERE status IN ('menunggu', 'tidak_pasti') AND dibuat <= $1 ORDER BY id`, s.kini().Add(-umur))
	if err != nil {
		return r, err
	}
	var orders []string
	for rows.Next() {
		var o string
		if err := rows.Scan(&o); err != nil {
			rows.Close()
			return r, err
		}
		orders = append(orders, o)
	}
	rows.Close()
	for _, o := range orders {
		r.Diperiksa++
		h, err := s.CekStatus(ctx, o)
		switch {
		case err != nil:
			r.Galat++
		case h.Hasil == "diproses" && h.Jurnal != nil:
			r.Dikredit++
		case h.Hasil == "diproses" || h.Hasil == "diparkir":
			r.Tertunda++
		default:
			r.Selesai++
		}
	}
	return r, nil
}
