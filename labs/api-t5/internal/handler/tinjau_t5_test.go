package handler

import (
	"fmt"
	"testing"
	"time"
)

// Tes tambahan dari tinjauan independen lab api-t5: batas laju per akun untuk dua endpoint tulis Tahap 5. Tanpa batas
// ini satu akun admin atau satu pemakai bisa menulis tanpa henti.
func TestBatasLajuPengumumanDanCicilan(t *testing.T) {
	srv, db := serverT5(t, "")
	admin := akunTanpaBuku(t, db, "admin")
	tok := masuk(t, srv, admin)
	for i := 1; i <= 5; i++ {
		if code, _, isi := kirimReq(t, srv, "POST", "/pengumuman", tok, map[string]string{"judul": fmt.Sprintf("Batas laju %d", i)}); code != 201 {
			t.Fatalf("pengumuman ke-%d: %d %s, ingin 201", i, code, isi)
		}
	}
	if code, _, isi := kirimReq(t, srv, "POST", "/pengumuman", tok, map[string]string{"judul": "Batas laju 6"}); code != 429 {
		t.Fatalf("pengumuman ke-6: %d %s, ingin 429", code, isi)
	}

	_, pemilik := akunDB(t, db, "pemakai", "terverifikasi", 0)
	_, merchant := akunDB(t, db, "merchant", "terverifikasi", 0)
	tokP := masuk(t, srv, pemilik)
	badan := map[string]any{"jenis": "cicilan", "merchant_akun_id": idAkun(t, db, merchant), "jumlah_per_angsuran": 1000, "jumlah_angsuran": 1,
		"hari_tagih": 10, "mulai": time.Now().AddDate(0, 0, 1).Format("2006-01-02")}
	for i := 1; i <= 10; i++ {
		if code, _, isi := kirimReq(t, srv, "POST", "/cicilan", tokP, badan); code != 201 {
			t.Fatalf("cicilan ke-%d: %d %s, ingin 201", i, code, isi)
		}
	}
	if code, _, isi := kirimReq(t, srv, "POST", "/cicilan", tokP, badan); code != 429 {
		t.Fatalf("cicilan ke-11: %d %s, ingin 429", code, isi)
	}
}
