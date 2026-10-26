package service

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/repo"
)

// Top-up dari bank lewat gateway (PRD v4 P0, M29, M30, ADR 34, ADR 35). Satu proses (minggu 3 naskah): jurnal top-up
// ditulis lewat fungsi kreditTopup di transaction yang sama dengan webhook_event dan status topup_bank. Sesudah service
// pembayaran dipisah (ADR 37), langkah itu menjadi panggilan ke API ledger dengan Idempotency-Key = order_id; lab
// t4-modul membuktikannya.

var (
	ErrGatewayTidakAda    = errors.New("gateway tidak dikonfigurasi")
	ErrGatewayDitolak     = errors.New("gateway menolak atau tidak terjangkau; top-up tidak dibuat")
	ErrTandaTangan        = errors.New("tanda tangan webhook tidak sah")
	ErrEmailTerpakai      = errors.New("email sudah terdaftar")
	ErrSudahTerverifikasi = errors.New("akun sudah terverifikasi")
	ErrVerifikasiBerjalan = errors.New("pengajuan verifikasi sebelumnya belum selesai")
	ErrLayananTidakAda    = errors.New("layanan pendukung tidak dikonfigurasi")
)

// statusGateway memetakan status di kabar gateway ke status topup_bank.
var statusGateway = map[string]string{"settlement": "dibayar", "pending": "menunggu", "expire": "kedaluwarsa", "failure": "gagal"}

// KabarGateway adalah isi webhook dari gateway.
type KabarGateway struct {
	EventID string `json:"event_id"`
	OrderID string `json:"order_id"`
	Status  string `json:"status"` // settlement, pending, expire, failure
	Jumlah  int64  `json:"jumlah"`
}

// HasilWebhook: yang dijawab ke gateway. Hasil: diproses, ganda, diparkir, ditolak (sama dengan webhook_event.hasil).
type HasilWebhook struct {
	Hasil  string `json:"hasil"`
	Jurnal *int64 `json:"jurnal,omitempty"`
}

// --8<-- [start:tanda-tangan]
// TandaTangan: HMAC-SHA256 atas "<timestamp>.<byte mentah body>" dengan rahasia bersama, heksadesimal. Dihitung atas
// byte yang tiba, sebelum JSON diurai: JSON yang diurai ulang dan ditulis lagi bisa berbeda satu spasi dari yang
// ditandatangani gateway (ADR 34).
func TandaTangan(rahasia string, timestamp int64, body []byte) string {
	m := hmac.New(sha256.New, []byte(rahasia))
	fmt.Fprintf(m, "%d.", timestamp)
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// PeriksaTandaTangan menerima kiriman bila timestamp ada dalam ToleransiWebhook dari waktu service, dan tanda tangan
// cocok dengan salah satu rahasia (rahasia pertama = yang dipakai sekarang, berikutnya = masa tumpang tindih
// rotasi). Perbandingan dengan hmac.Equal (waktu tetap). Kiriman lama yang diputar ulang gagal di timestamp.
func (s Service) PeriksaTandaTangan(timestamp, tanda string, body []byte) error {
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
	for _, r := range s.t4.RahasiaWebhook {
		hitung, _ := hex.DecodeString(TandaTangan(r, ts, body))
		if hmac.Equal(hitung, diterima) { // tidak berhenti di yang pertama: waktu tidak membocorkan rahasia mana yang cocok
			cocok = true
		}
	}
	if !cocok {
		return ErrTandaTangan
	}
	return nil
}

// --8<-- [end:tanda-tangan]

func acakHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err) // sumber acak sistem gagal: tidak ada cara melanjutkan dengan aman
	}
	return hex.EncodeToString(b)
}

// BuatTopupBank: user memilih nominal, Rekeningo membuat order di gateway dan menjawab dengan tujuan bayar.
// Baris topup_bank ditulis lebih dulu; panggilan ke gateway di luar transaction dengan timeout 3 detik (ADR 22) dan
// Idempotency-Key = order_id. Timeout menghasilkan status tidak_pasti (order mungkin sudah dibuat), penolakan atau
// gateway yang tidak terjangkau menghasilkan gagal. Gateway lambat atau mati tidak menyentuh pembayaran dan transfer.
func (s Service) BuatTopupBank(ctx context.Context, peminta, jumlah int64) (repo.TopupBank, error) {
	if s.t4.Gateway == nil {
		return repo.TopupBank{}, ErrGatewayTidakAda
	}
	if jumlah < MinTopupBank || jumlah > MaksTopupBank {
		return repo.TopupBank{}, ErrValidasi{"jumlah", fmt.Sprintf("paling sedikit %d dan paling banyak %d", MinTopupBank, MaksTopupBank)}
	}
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return repo.TopupBank{}, err
	}
	if a.Jenis != "karyawan" && a.Jenis != "pemakai" {
		return repo.TopupBank{}, ErrDilarang
	}
	if a.Status == "dibekukan" {
		return repo.TopupBank{}, ErrDibekukan
	}
	if err := s.BatasAkun("topup-bank", peminta); err != nil {
		return repo.TopupBank{}, err
	}
	// Pemeriksaan awal tanpa lock, supaya user tidak membayar ke bank untuk top-up yang pasti ditolak. Pemeriksaan
	// yang menentukan ada saat kredit, sesudah buku dikunci (kreditTopup).
	if a.Saldo+jumlah > BatasSaldoTingkat(a.Tingkat) {
		return repo.TopupBank{}, ErrBatasTingkat
	}
	orderID := "TB-" + acakHex(8)
	kedaluwarsa := s.kini().Add(UmurTopupBank)
	id, err := s.repo.BuatTopupBank(ctx, peminta, orderID, jumlah, kedaluwarsa)
	if err != nil {
		return repo.TopupBank{}, err
	}
	o, gerr := s.t4.Gateway.BuatOrder(ctx, orderID, jumlah, kedaluwarsa)
	switch {
	case gerr == nil:
		if err := s.repo.AturTujuanBayar(ctx, id, o.TujuanBayar); err != nil {
			return repo.TopupBank{}, err
		}
	case errors.Is(gerr, gateway.ErrTidakPasti):
		if _, err := s.repo.UbahStatusTopup(ctx, id, []string{"menunggu"}, "tidak_pasti"); err != nil {
			return repo.TopupBank{}, err
		}
	default:
		if _, err := s.repo.UbahStatusTopup(ctx, id, []string{"menunggu"}, "gagal"); err != nil {
			return repo.TopupBank{}, err
		}
		gerr = ErrGatewayDitolak
	}
	t, err := s.repo.TopupBank(ctx, id)
	if err != nil {
		return t, err
	}
	if gerr != nil && errors.Is(gerr, ErrGatewayDitolak) {
		return t, gerr
	}
	return t, nil
}

// LihatTopupBank: hanya pemiliknya; milik orang lain dijawab tidak ditemukan.
func (s Service) LihatTopupBank(ctx context.Context, peminta, id int64) (repo.TopupBank, error) {
	t, err := s.repo.TopupBank(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && t.AkunID != peminta) {
		return repo.TopupBank{}, ErrTidakDitemukan
	}
	return t, err
}

// TerimaWebhook memproses satu kiriman dari gateway. Versi benar (ADR 34): tanda tangan atas byte mentah dan
// timestamp diperiksa dulu; lalu satu transaction berisi event (kunci utama event_id), status top-up, jurnal, dan
// baris outbox. Dua mode rentan (M29) memerankan versi pertama.
func (s Service) TerimaWebhook(ctx context.Context, body []byte, timestamp, tanda string) (HasilWebhook, error) {
	if s.rentan != RentanWebhookV1 {
		if err := s.PeriksaTandaTangan(timestamp, tanda, body); err != nil {
			return HasilWebhook{}, err
		}
	}
	var k KabarGateway
	if err := json.Unmarshal(body, &k); err != nil {
		return HasilWebhook{}, ErrValidasi{"body", "bukan JSON yang valid"}
	}
	if k.EventID == "" || k.OrderID == "" {
		return HasilWebhook{}, ErrValidasi{"event_id", "event_id dan order_id wajib"}
	}
	if _, ok := statusGateway[k.Status]; !ok {
		return HasilWebhook{}, ErrValidasi{"status", "status tidak dikenal"}
	}
	switch s.rentan {
	case RentanWebhookV1:
		return s.webhookV1(ctx, k)
	case RentanWebhookCekTulis:
		return s.webhookCekTulis(ctx, k)
	}
	return s.webhookAman(ctx, k)
}

// --8<-- [start:webhook-aman]
func (s Service) webhookAman(ctx context.Context, k KabarGateway) (HasilWebhook, error) {
	var h HasilWebhook
	var topupID int64
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		baru, err := tx.CatatEvent(ctx, k.EventID, k.Status)
		if err != nil {
			return err
		}
		if !baru { // event ini sudah tercatat: nol baris. Dijawab 200 supaya gateway berhenti mengulang.
			h = HasilWebhook{Hasil: "ganda"}
			return nil
		}
		tp, err := tx.TopupBankUntukUbah(ctx, k.OrderID)
		if errors.Is(err, repo.ErrTidakAda) {
			h = HasilWebhook{Hasil: "ditolak"}
			return tx.SelesaiEvent(ctx, k.EventID, nil, "ditolak", nil)
		}
		if err != nil {
			return err
		}
		topupID = tp.ID
		hasil, jurnal, err := s.terapkanStatus(ctx, tx, tp, statusGateway[k.Status], k.Jumlah)
		if err != nil {
			return err
		}
		h = HasilWebhook{Hasil: hasil, Jurnal: jurnal}
		return tx.SelesaiEvent(ctx, k.EventID, &tp.ID, hasil, jurnal)
	})
	if err != nil {
		return HasilWebhook{}, err // ROLLBACK: event tidak tercatat, jadi kiriman ulang dari gateway diproses penuh
	}
	if h.Hasil == "diparkir" && topupID != 0 {
		// Kabar yang tidak berurutan dicek ke gateway, di luar transaction (ADR 34).
		if _, err := s.CekTopup(ctx, topupID); err != nil {
			log.Printf("cek status top-up %d sesudah kabar diparkir: %v", topupID, err)
		}
	}
	return h, nil
}

// --8<-- [end:webhook-aman]

// --8<-- [start:terapkan-status]
// terapkanStatus memajukan status satu top-up (baris sudah dikunci FOR UPDATE oleh pemanggil) dan, untuk
// settlement, mengkreditkan saldo. Status hanya maju: kabar yang tidak maju diparkir, kabar yang sama dengan
// status sekarang adalah ganda. Dipakai webhook dan job cek status, jadi dua jalur kabar itu tidak bisa
// menjurnal dua kali (kunci order_id di ledger, ditambah status).
func (s Service) terapkanStatus(ctx context.Context, tx repo.Tx, tp repo.TopupBank, target string, jumlahGateway int64) (string, *int64, error) {
	cur := tp.Status
	if s.t4.TanpaLapis["status"] {
		cur = "menunggu" // lab: lapisan "status hanya maju" dimatikan
	}
	belumAkhir := cur == "menunggu" || cur == "tidak_pasti"
	switch {
	case target == "menunggu":
		if cur == "tidak_pasti" {
			_, err := tx.UbahStatusTopupTx(ctx, tp.ID, []string{"tidak_pasti"}, "menunggu")
			return "diproses", nil, err
		}
		if cur == "menunggu" {
			return "diproses", nil, nil
		}
		return "diparkir", nil, nil // mundur dari status akhir
	case target == cur:
		return "ganda", tp.JurnalID, nil
	case !belumAkhir:
		return "diparkir", nil, nil // mis. kedaluwarsa sesudah dibayar
	case target != "dibayar":
		_, err := tx.UbahStatusTopupTx(ctx, tp.ID, []string{"menunggu", "tidak_pasti"}, target)
		return "diproses", nil, err
	case jumlahGateway != tp.Jumlah:
		return "ditolak", nil, nil // jumlah di kabar bukan jumlah order: rekonsiliasi mencatatnya sebagai jumlah_beda
	}
	return s.kreditTopup(ctx, tx, tp)
}

// --8<-- [end:terapkan-status]

// --8<-- [start:kredit-topup]
// kreditTopup menjurnal satu top-up dibayar: buku akun dikunci (ADR 13), batas saldo menurut tingkat diperiksa
// sesudah lock, Idempotency-Key = order_id diklaim di ledger (ADR 14), jurnal topup_bank ditulis (lawan: buku bank),
// status top-up diikat ke jurnalnya, dan satu baris outbox ditulis (ADR 23). Tidak ada panggilan jaringan di sini.
func (s Service) kreditTopup(ctx context.Context, tx repo.Tx, tp repo.TopupBank) (string, *int64, error) {
	buku, err := tx.KunciBukuAkun(ctx, tp.AkunID)
	if err != nil {
		return "", nil, err
	}
	b := buku[tp.AkunID]
	tingkat, status, err := tx.AkunTingkat(ctx, tp.AkunID)
	if err != nil {
		return "", nil, err
	}
	// Uang sudah di bank. Akun yang dibekukan atau yang saldonya akan melewati batas tingkatnya tidak dikredit
	// otomatis: kabar diparkir, dan rekonsiliasi harian mencatat order ini sebagai tidak_di_ledger sampai tim risk
	// memutuskan (Asumsi produk; PRD v4 belum menjawab pengembalian dana).
	if status == "dibekukan" || b.Saldo+tp.Jumlah > BatasSaldoTingkat(tingkat) {
		return "diparkir", nil, nil
	}
	kini := s.kini()
	if !s.t4.TanpaLapis["kunci"] {
		j, baru, err := tx.KunciLedger(ctx, tp.OrderID, tp.AkunID, hashPermintaan(tp.OrderID, tp.Jumlah), kini, kini.Add(24*time.Hour))
		if err != nil {
			return "", nil, err
		}
		if !baru { // key hidup: jurnal pertama sudah ada, tidak ada jurnal kedua
			if j != nil {
				if _, err := tx.UbahTopupDibayar(ctx, tp.ID, *j, []string{"menunggu", "tidak_pasti"}); err != nil {
					return "", nil, err
				}
			}
			return "ganda", j, nil
		}
	}
	bank, err := tx.BukuSistem(ctx, "bank")
	if err != nil {
		return "", nil, err
	}
	id, err := tx.CatatJurnal(ctx, "topup_bank", "Top-up bank "+tp.OrderID, tp.AkunID, nil,
		[]repo.Posting{{BukuID: bank, Jumlah: -tp.Jumlah}, {BukuID: b.ID, Jumlah: tp.Jumlah}})
	if err != nil {
		return "", nil, err
	}
	if !s.t4.TanpaLapis["kunci"] {
		if err := tx.SelesaiKunciLedger(ctx, tp.OrderID, id); err != nil {
			return "", nil, err
		}
	}
	var dari []string
	if !s.t4.TanpaLapis["status"] {
		dari = []string{"menunggu", "tidak_pasti"}
	}
	ok, err := tx.UbahTopupDibayar(ctx, tp.ID, id, dari)
	if err != nil {
		return "", nil, err
	}
	if !ok {
		return "", nil, ErrTopupBukan // baris dikunci dan statusnya sudah dicek: tidak boleh terjadi
	}
	if err := s.beritahu(ctx, tx, id, tp.AkunID, "topup", nil, pesanUang("Bank", tp.Jumlah, id, "")); err != nil {
		return "", nil, err
	}
	return "diproses", &id, nil
}

// --8<-- [end:kredit-topup]

func hashPermintaan(orderID string, jumlah int64) string {
	h := sha256.Sum256([]byte(orderID + "|" + strconv.FormatInt(jumlah, 10)))
	return hex.EncodeToString(h[:])
}

// --8<-- [start:webhook-v1]
// webhookV1 adalah handler paling pendek (minggu 2 naskah, mode rentan webhook-v1): JSON diurai, bila status
// settlement jurnal top-up ditulis sebesar jumlah di isi kabar dan top-up ditandai dibayar, lalu 200. Tanpa
// pemeriksaan tanda tangan, tanpa tabel event, tanpa status bersyarat, tanpa Idempotency-Key, tanpa batas tingkat.
func (s Service) webhookV1(ctx context.Context, k KabarGateway) (HasilWebhook, error) {
	var h HasilWebhook
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		tp, err := tx.TopupBankUntukUbah(ctx, k.OrderID)
		if err != nil {
			return err
		}
		if k.Status != "settlement" {
			h = HasilWebhook{Hasil: "diproses"}
			return tx.UbahStatusTanpaSyarat(ctx, k.OrderID, statusGateway[k.Status])
		}
		return s.kreditV1(ctx, tx, tp, k.Jumlah, &h)
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return HasilWebhook{}, ErrTidakDitemukan
	}
	return h, err
}

// kreditV1: jurnal dari jumlah di isi kabar, status dibayar tanpa syarat. jurnal_id topup_bank tidak diisi: jurnal
// kedua tidak bertabrakan dengan yang pertama, dan tidak ada yang tahu jurnal mana milik order ini selain
// keterangannya.
func (s Service) kreditV1(ctx context.Context, tx repo.Tx, tp repo.TopupBank, jumlah int64, h *HasilWebhook) error {
	buku, err := tx.KunciBukuAkun(ctx, tp.AkunID)
	if err != nil {
		return err
	}
	bank, err := tx.BukuSistem(ctx, "bank")
	if err != nil {
		return err
	}
	id, err := tx.CatatJurnal(ctx, "topup_bank", "Top-up bank "+tp.OrderID, tp.AkunID, nil,
		[]repo.Posting{{BukuID: bank, Jumlah: -jumlah}, {BukuID: buku[tp.AkunID].ID, Jumlah: jumlah}})
	if err != nil {
		return err
	}
	*h = HasilWebhook{Hasil: "diproses", Jurnal: &id}
	return tx.UbahStatusTanpaSyarat(ctx, tp.OrderID, "dibayar")
}

// --8<-- [end:webhook-v1]

// --8<-- [start:webhook-cek-tulis]
// webhookCekTulis: tanda tangan diperiksa, tetapi duplikat dicegah dengan cek-lalu-tulis: baca status top-up,
// bila sudah dibayar jawab ganda, bila belum jurnalkan. Tidak ada kunci di antara membaca dan menulis, jadi dua
// kiriman bersamaan sama-sama melihat `menunggu` dan sama-sama menjurnal. Jeda lab (Dep.JedaCekTulis) memperlebar
// celah itu supaya rekaman tidak bergantung pada nasib (M29).
func (s Service) webhookCekTulis(ctx context.Context, k KabarGateway) (HasilWebhook, error) {
	tp, err := s.repo.TopupBankLewatOrder(ctx, k.OrderID)
	if errors.Is(err, repo.ErrTidakAda) {
		return HasilWebhook{}, ErrTidakDitemukan
	}
	if err != nil {
		return HasilWebhook{}, err
	}
	if tp.Status == "dibayar" {
		return HasilWebhook{Hasil: "ganda"}, nil
	}
	if k.Status != "settlement" {
		return HasilWebhook{Hasil: "diproses"}, nil // mode ini hanya mengurus settlement
	}
	if s.t4.JedaCekTulis > 0 {
		select {
		case <-time.After(s.t4.JedaCekTulis):
		case <-ctx.Done():
			return HasilWebhook{}, ctx.Err()
		}
	}
	var h HasilWebhook
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error { return s.kreditV1(ctx, tx, tp, k.Jumlah, &h) })
	return h, err
}

// --8<-- [end:webhook-cek-tulis]

// HasilCek: ringkasan satu putaran job cek status.
type HasilCek struct {
	Diperiksa, Dikredit, Selesai, Tertunda, Galat int
}

// CekTopup menanyakan keadaan satu order ke gateway (di luar transaction, timeout 3 detik) dan menerapkannya lewat
// terapkanStatus yang sama dengan webhook. Mengembalikan status top-up sesudahnya.
func (s Service) CekTopup(ctx context.Context, id int64) (string, error) {
	if s.t4.Gateway == nil {
		return "", ErrGatewayTidakAda
	}
	tp, err := s.repo.TopupBank(ctx, id)
	if err != nil {
		return "", err
	}
	if tp.Status != "menunggu" && tp.Status != "tidak_pasti" {
		return tp.Status, nil
	}
	o, err := s.t4.Gateway.Status(ctx, tp.OrderID)
	if errors.Is(err, gateway.ErrTidakAda) {
		// Gateway tidak mengenal order ini: order tidak pernah dibuat (mis. timeout sebelum sampai).
		_, err := s.repo.UbahStatusTopup(ctx, id, []string{"menunggu", "tidak_pasti"}, "gagal")
		return "gagal", err
	}
	if err != nil {
		return tp.Status, err
	}
	target, ok := statusGateway[o.Status]
	if !ok {
		return tp.Status, fmt.Errorf("status gateway tidak dikenal: %q", o.Status)
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		terkunci, err := tx.TopupBankUntukUbah(ctx, tp.OrderID)
		if err != nil {
			return err
		}
		_, _, err = s.terapkanStatus(ctx, tx, terkunci, target, o.Jumlah)
		return err
	})
	if err != nil {
		return tp.Status, err
	}
	akhir, err := s.repo.TopupBank(ctx, id)
	return akhir.Status, err
}

// CekTopupBelumSelesai: job (flag -cek-topup). Top-up yang masih menunggu atau tidak pasti lebih dari `umur`
// ditanyakan ke gateway satu per satu; hasil dibayar dikredit lewat jurnal normal (ADR 35).
func (s Service) CekTopupBelumSelesai(ctx context.Context, umur time.Duration) (HasilCek, error) {
	var h HasilCek
	daftar, err := s.repo.TopupBelumSelesai(ctx, s.kini().Add(-umur))
	if err != nil {
		return h, err
	}
	for _, tp := range daftar {
		h.Diperiksa++
		status, err := s.CekTopup(ctx, tp.ID)
		switch {
		case err != nil:
			h.Galat++
			log.Printf("cek top-up %d (%s): %v", tp.ID, tp.OrderID, err)
		case status == "dibayar":
			h.Dikredit++
		case status == "menunggu" || status == "tidak_pasti":
			h.Tertunda++
		default:
			h.Selesai++
		}
	}
	return h, nil
}

// HasilRekon: jumlah insiden baru per jenis dari satu rekonsiliasi.
type HasilRekon struct {
	BarisGateway, TidakDiLedger, TidakDiGateway, JumlahBeda int
}

// RekonHarian membandingkan laporan settlement gateway untuk satu tanggal (YYYY-MM-DD, zona Asia/Jakarta di tiruan)
// dengan top-up yang dijurnal pada tanggal itu, per order_id. Tiga jenis selisih menjadi insiden_rekon bernomor;
// job tidak mengoreksi apa pun (koreksi lewat jurnal normal ada di lab t4-webhook, bukan UPDATE pada posting).
// (tanggal, order_id, jenis) unik, jadi job aman dijalankan dua kali.
func (s Service) RekonHarian(ctx context.Context, tanggal string) (HasilRekon, error) {
	var h HasilRekon
	if s.t4.Gateway == nil {
		return h, ErrGatewayTidakAda
	}
	if _, err := time.Parse("2006-01-02", tanggal); err != nil {
		return h, ErrValidasi{"tanggal", "format YYYY-MM-DD"}
	}
	baris, err := s.t4.Gateway.Settlement(ctx, tanggal)
	if err != nil {
		return h, err
	}
	h.BarisGateway = len(baris)
	orders := make([]string, len(baris))
	di := map[string]bool{}
	for i, b := range baris {
		orders[i] = b.OrderID
		di[b.OrderID] = true
	}
	ledger, err := s.repo.LedgerTopupTanggal(ctx, tanggal, orders)
	if err != nil {
		return h, err
	}
	catat := func(order string, topup *int64, jenis string, selisih int64, n *int) error {
		baru, err := s.repo.CatatInsiden(ctx, tanggal, order, topup, jenis, selisih)
		if baru {
			*n++
		}
		return err
	}
	for _, b := range baris {
		l, ada := ledger[b.OrderID]
		var tid *int64
		if ada {
			tid = &l.TopupID
		}
		switch {
		case !ada || !l.Dibayar:
			if err := catat(b.OrderID, tid, "tidak_di_ledger", b.Jumlah, &h.TidakDiLedger); err != nil {
				return h, err
			}
		case l.Jurnal != b.Jumlah:
			if err := catat(b.OrderID, tid, "jumlah_beda", b.Jumlah-l.Jurnal, &h.JumlahBeda); err != nil {
				return h, err
			}
		}
	}
	for order, l := range ledger {
		if di[order] || !l.Dibayar {
			continue
		}
		tid := l.TopupID
		if err := catat(order, &tid, "tidak_di_gateway", -l.Jurnal, &h.TidakDiGateway); err != nil {
			return h, err
		}
	}
	return h, nil
}

// --- daftar ---

// Daftar membuat akun pemakai atau merchant yang mendaftar sendiri: tingkat belum, status aktif (bawaan kolom).
// Password minimal 15 karakter dan paling banyak 72 byte (batas bcrypt). Email yang sudah terdaftar dijawab
// ErrEmailTerpakai; jawaban itu membuka enumerasi email, yang di lab ditahan batas laju per alamat saja (Asumsi).
func (s Service) Daftar(ctx context.Context, jenis, nama, email, password string) (int64, error) {
	if jenis == "" {
		jenis = "pemakai"
	}
	if jenis != "pemakai" && jenis != "merchant" {
		return 0, ErrValidasi{"jenis", "pemakai atau merchant"}
	}
	nama = strings.TrimSpace(nama)
	if n := utf8.RuneCountInString(nama); n < 1 || n > 100 {
		return 0, ErrValidasi{"nama", "1 sampai 100 karakter"}
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if at := strings.Index(email, "@"); at < 1 || at != strings.LastIndex(email, "@") || at == len(email)-1 ||
		len(email) > 254 || strings.ContainsAny(email, " \t\r\n") {
		return 0, ErrValidasi{"email", "alamat email tidak sah"}
	}
	if utf8.RuneCountInString(password) < 15 {
		return 0, ErrValidasi{"password", "minimal 15 karakter"}
	}
	if len(password) > 72 {
		return 0, ErrValidasi{"password", "paling banyak 72 byte"}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}
	id, err := s.repo.BuatAkunPublik(ctx, jenis, nama, email, string(hash))
	if isUnik(err) {
		return 0, ErrEmailTerpakai
	}
	return id, err
}
