package pembayaran_test

import (
	"errors"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/modul/pembayaran"
)

// Rahasia webhook yang dibaca dari secret manager saat runtime (lab t4-infra, ADR 35 dan ADR 39). Tanpa database:
// PeriksaTandaTangan hanya memakai jam, rahasia, dan byte mentah.

func kirimTanda(rahasia string, ts time.Time, body []byte) (string, string) {
	return strconv.FormatInt(ts.Unix(), 10), pembayaran.TandaTangan(rahasia, ts.Unix(), body)
}

func TestRahasiaFnDipanggilTiapPemeriksaanDanMenggantikanDaftarTetap(t *testing.T) {
	kini := time.Date(2026, 10, 27, 8, 0, 0, 0, time.UTC)
	var daftar atomic.Pointer[[]string]
	set := func(d ...string) { daftar.Store(&d) }
	set("v1")
	s := &pembayaran.Service{Rahasia: []string{"tetap"}, RahasiaFn: func() []string { return *daftar.Load() }, Kini: func() time.Time { return kini }}
	body := []byte(`{"event_id":"e1"}`)
	periksa := func(rahasia string) error {
		ts, tanda := kirimTanda(rahasia, kini, body)
		return s.PeriksaTandaTangan(ts, tanda, body)
	}
	if err := periksa("v1"); err != nil {
		t.Fatalf("v1 dari RahasiaFn: %v", err)
	}
	if err := periksa("tetap"); !errors.Is(err, pembayaran.ErrTandaTangan) {
		t.Fatalf("daftar tetap tidak boleh dipakai bila RahasiaFn diisi: %v", err)
	}
	set("v2", "v1") // rotasi dengan masa tumpang tindih: tanpa membuat Service baru
	for _, r := range []string{"v2", "v1"} {
		if err := periksa(r); err != nil {
			t.Fatalf("%s selama tumpang tindih: %v", r, err)
		}
	}
	set("v2") // rotasi selesai
	if err := periksa("v1"); !errors.Is(err, pembayaran.ErrTandaTangan) {
		t.Fatalf("v1 sesudah tumpang tindih berakhir harus ditolak: %v", err)
	}
	if err := periksa("v2"); err != nil {
		t.Fatalf("v2: %v", err)
	}
	set() // secret manager belum pernah terbaca: tidak ada rahasia, semua ditolak
	if err := periksa("v2"); !errors.Is(err, pembayaran.ErrTandaTangan) {
		t.Fatalf("tanpa rahasia semua kiriman harus ditolak: %v", err)
	}
}

func TestTanpaRahasiaFnDaftarTetapTetapBerlaku(t *testing.T) {
	kini := time.Date(2026, 10, 27, 8, 0, 0, 0, time.UTC)
	s := &pembayaran.Service{Rahasia: []string{"tetap"}, Kini: func() time.Time { return kini }}
	body := []byte(`{}`)
	ts, tanda := kirimTanda("tetap", kini, body)
	if err := s.PeriksaTandaTangan(ts, tanda, body); err != nil {
		t.Fatalf("daftar tetap: %v", err)
	}
}
