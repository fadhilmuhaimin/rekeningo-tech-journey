package notifid

import (
	"regexp"
	"testing"
)

var bentukUUID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

func TestPengumumanDeterministik(t *testing.T) {
	a, b := Pengumuman(7, 42), Pengumuman(7, 42)
	if a != b {
		t.Fatalf("id berbeda untuk pengumuman dan perangkat yang sama: %s dan %s", a, b)
	}
	if !bentukUUID.MatchString(a) {
		t.Fatalf("%s bukan UUID versi 5 varian RFC 9562", a)
	}
}

func TestPengumumanBedaMenurutPengumumanDanPerangkat(t *testing.T) {
	semua := map[string]string{}
	for p := int64(1); p <= 3; p++ {
		for d := int64(1); d <= 50; d++ {
			id := Pengumuman(p, d)
			if lain, ada := semua[id]; ada {
				t.Fatalf("id %s dipakai dua kali: %s dan pengumuman %d perangkat %d", id, lain, p, d)
			}
			semua[id] = "ada"
		}
	}
	// Pembeda yang dipakai: 7 dan 42 tidak sama dengan 42 dan 7.
	if Pengumuman(7, 42) == Pengumuman(42, 7) {
		t.Fatal("pengumuman dan perangkat tertukar menghasilkan id yang sama")
	}
}

func TestKelas(t *testing.T) {
	if k := Kelas(Pengumuman(1, 1)); k != "pengumuman" {
		t.Fatalf("id pengumuman terbaca %q", k)
	}
	if k := Kelas(AcakSebagaiPengumuman()); k != "pengumuman" {
		t.Fatalf("id acak berbentuk pengumuman terbaca %q", k)
	}
	// UUID acak versi 4 dari database (gen_random_uuid) adalah notifikasi uang.
	if k := Kelas("4b1d2c3e-1111-4222-8333-444455556666"); k != "uang" {
		t.Fatalf("UUID versi 4 terbaca %q", k)
	}
	if k := Kelas("v1-tanpa-id"); k != "uang" {
		t.Fatalf("id bukan UUID terbaca %q", k)
	}
}

func TestAcakBerbedaTiapPanggilan(t *testing.T) {
	if AcakSebagaiPengumuman() == AcakSebagaiPengumuman() {
		t.Fatal("dua id acak sama")
	}
}
