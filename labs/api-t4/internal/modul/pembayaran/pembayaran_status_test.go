package pembayaran_test

import (
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/modul/pembayaran"
)

// Pemetaan status gateway, top-up yang tidak pasti, urutan pemeriksaan webhook, dan batas timestamp (ADR 34, ADR 35).
// Dengan PostgreSQL sungguhan lewat siapkan dari pembayaran_test.go.

// Kabar expire dan failure memajukan top-up yang menunggu ke status akhir masing-masing tanpa menyentuh ledger.
func TestKabarGatewayDipetakanKeStatusTopup(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	for kabar, ingin := range map[string]string{"expire": "kedaluwarsa", "failure": "gagal"} {
		order := l.topup(t, a, 100_000)
		h, err := l.kirim(event(l), order, kabar, 100_000)
		if err != nil || h.Hasil != "diproses" || l.status(t, order) != ingin {
			t.Fatalf("kabar %s: %+v, %v, status %s; ingin diproses dan %s", kabar, h, err, l.status(t, order), ingin)
		}
		if l.jurnal(t, order) != 0 {
			t.Fatalf("kabar %s menjurnal %d kali, ingin 0", kabar, l.jurnal(t, order))
		}
	}
}

// Order yang timeout saat dibuat berstatus tidak_pasti, dan gateway mungkin sudah membuatnya. Bila pengguna membayar,
// top-up itu tetap dikreditkan, lewat webhook maupun lewat job cek status. Status tidak_pasti yang dianggap akhir atau
// yang dilewati job membuat uang yang sudah dibayar tidak pernah masuk.
func TestTopupTidakPastiYangDibayarTetapDikredit(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	l.gw.galat = gateway.ErrTidakPasti // BuatOrder timeout: status top-up menjadi tidak_pasti
	lewatWebhook, lewatJob := l.topup(t, a, 100_000), l.topup(t, a, 150_000)
	l.gw.galat = nil
	for order, jumlah := range map[string]int64{lewatWebhook: 100_000, lewatJob: 150_000} {
		if l.status(t, order) != "tidak_pasti" {
			t.Fatalf("status %s sesudah timeout membuat order, ingin tidak_pasti", l.status(t, order))
		}
		l.gw.order[order] = gateway.Order{OrderID: order, Jumlah: jumlah, Status: "pending", TujuanBayar: "88000"} // order ternyata sampai
		l.gw.bayar(order)
	}
	h, err := l.kirim(event(l), lewatWebhook, "settlement", 100_000)
	if err != nil || h.Hasil != "diproses" || l.status(t, lewatWebhook) != "dibayar" || l.jurnal(t, lewatWebhook) != 1 {
		t.Fatalf("webhook untuk top-up tidak_pasti: %+v, %v, status %s, jurnal %d", h, err, l.status(t, lewatWebhook), l.jurnal(t, lewatWebhook))
	}
	if _, err := l.p.CekBelumSelesai(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if l.status(t, lewatJob) != "dibayar" || l.jurnal(t, lewatJob) != 1 {
		t.Fatalf("job cek status untuk top-up tidak_pasti: status %s, jurnal %d; ingin dibayar dan 1", l.status(t, lewatJob), l.jurnal(t, lewatJob))
	}
}

// Tanda tangan diperiksa atas byte mentah sebelum JSON diurai (ADR 34): kiriman palsu berisi JSON rusak dijawab
// ErrTandaTangan, bukan ErrKabar. Kontrol: tanda tangan yang sah atas body yang sama menghasilkan ErrKabar.
func TestTandaTanganDiperiksaSebelumJSONDiurai(t *testing.T) {
	l := siapkan(t)
	body := []byte("{bukan json")
	ts := time.Now().Unix()
	if _, err := l.p.TerimaWebhook(t.Context(), body, fmt.Sprint(ts), "00"); !errors.Is(err, pembayaran.ErrTandaTangan) {
		t.Fatalf("tanda tangan palsu atas JSON rusak: %v; ingin ErrTandaTangan", err)
	}
	if _, err := l.p.TerimaWebhook(t.Context(), body, fmt.Sprint(ts), pembayaran.TandaTangan(rahasiaTes, ts, body)); !errors.Is(err, pembayaran.ErrKabar) {
		t.Fatalf("kontrol, tanda tangan sah atas JSON rusak: %v; ingin ErrKabar", err)
	}
}

// Toleransi timestamp tepat 5 menit ke dua arah dengan jam service yang dibekukan: 300 detik diterima, 301 ditolak.
func TestToleransiTimestampTepatLimaMenit(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	t0 := time.Unix(1_800_000_000, 0)
	l.p.Kini = func() time.Time { return t0 }
	for _, c := range []struct {
		selisih  int64
		diterima bool
	}{{-300, true}, {300, true}, {-301, false}, {301, false}} {
		body, _ := json.Marshal(map[string]any{"event_id": event(l), "order_id": order, "status": "pending", "jumlah": 100_000})
		ts := t0.Unix() + c.selisih
		_, err := l.p.TerimaWebhook(t.Context(), body, fmt.Sprint(ts), pembayaran.TandaTangan(rahasiaTes, ts, body))
		if c.diterima != (err == nil) || (!c.diterima && !errors.Is(err, pembayaran.ErrTandaTangan)) {
			t.Errorf("selisih %d detik: %v; diterima seharusnya %v", c.selisih, err, c.diterima)
		}
	}
}

// Order di gateway berumur 24 jam dari jam service, dan baris top-up mencatat kedaluwarsa yang sama.
func TestOrderTopupBerumurDuaPuluhEmpatJam(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	t0 := time.Unix(1_800_000_000, 0)
	l.p.Kini = func() time.Time { return t0 }
	order := l.topup(t, a, 100_000)
	var kedaluwarsa time.Time
	if err := l.db.QueryRow(`SELECT kedaluwarsa_pada FROM topup_bank WHERE order_id = $1`, order).Scan(&kedaluwarsa); err != nil {
		t.Fatal(err)
	}
	if !kedaluwarsa.Equal(t0.Add(24 * time.Hour)) {
		t.Fatalf("kedaluwarsa %v, ingin %v", kedaluwarsa, t0.Add(24*time.Hour))
	}
}
