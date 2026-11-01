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

// Vektor uji RFC 9562 Lampiran A.4: namespace DNS 6ba7b810-9dad-11d1-80b4-00c04fd430c8, nama "www.example.com".
// Menjaga bahwa uuid5 memang SHA-1 atas namespace lalu nama (versi 5), bukan hash lain dengan bit versi 5.
func TestUUID5VektorRFC9562(t *testing.T) {
	dns := [16]byte{0x6b, 0xa7, 0xb8, 0x10, 0x9d, 0xad, 0x11, 0xd1, 0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8}
	if got, want := uuid5(dns, "www.example.com"), "2ed6657d-e927-568b-95e1-2665a8aea6a2"; got != want {
		t.Fatalf("uuid5 = %s, harus %s (RFC 9562 Lampiran A.4)", got, want)
	}
}

// Vektor id pengumuman dihitung dengan uuid.uuid5 dari pustaka standar Python 3.14 (namespace lab ini, nama
// "pengumuman:<pengumuman>:perangkat:<perangkat>"), bukan dari kode Go. Mengunci format nama: id yang berubah akan
// membuat pengiriman ulang sesudah deploy terlihat sebagai notifikasi baru.
func TestPengumumanVektorPustakaPython(t *testing.T) {
	for _, c := range []struct {
		pengumuman, perangkat int64
		want                  string
	}{
		{7, 42, "8c5e04e4-eff0-563b-95a3-a23903dd10be"},
		{1, 1, "727807c9-d50c-5695-9bb7-5da7fd1906e8"},
		{1, 10281, "d2297eaa-0b37-58b1-8593-83232626a84b"},
		{42, 7, "065e60c0-325b-5609-8673-6c4e1aa79635"},
	} {
		if got := Pengumuman(c.pengumuman, c.perangkat); got != c.want {
			t.Fatalf("Pengumuman(%d, %d) = %s, harus %s", c.pengumuman, c.perangkat, got, c.want)
		}
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
