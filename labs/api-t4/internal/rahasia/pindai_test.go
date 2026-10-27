package rahasia_test

import (
	"strings"
	"testing"

	"lab/apit4/internal/rahasia"
)

// Pemindai kunci produksi di berkas staging (lab t4-infra, M34, ADR 39).

const prod = "gw_live_0123456789abcdef"

func TestPindaiAwalanKunciProduksiMenangkapBarisYangBenarTanpaMenyalinNilai(t *testing.T) {
	isi := "# staging\nGATEWAY_URL=http://gateway-staging\nGATEWAY_KEY=" + prod + "\nLAIN=gw_test_aaaaaaaaaaaa\n"
	got := rahasia.Pindai("staging/.env", []byte(isi), "gw_live_", nil)
	if len(got) != 1 || got[0].Berkas != "staging/.env" || got[0].Baris != 3 || got[0].Alasan != rahasia.AlasanAwalan {
		t.Fatalf("temuan: %+v", got)
	}
	if strings.Contains(strings.Join([]string{got[0].Berkas, got[0].Alasan}, " "), prod) {
		t.Fatal("temuan menyalin nilai")
	}
}

func TestPindaiBerkasStagingBersihTidakMenghasilkanTemuan(t *testing.T) {
	isi := `{"gateway_key": "gw_test_aaaaaaaaaaaa", "catatan": "kunci live ada di secret manager"}`
	if got := rahasia.Pindai("s.json", []byte(isi), "gw_live_", map[string]bool{rahasia.SidikPenuh(prod): true}); len(got) != 0 {
		t.Fatalf("berkas bersih: %+v", got)
	}
}

func TestPindaiSidikMenangkapNilaiTersalinDenganFormatLainTermasukPadding(t *testing.T) {
	sidik := map[string]bool{rahasia.SidikPenuh("kunci-tanpa-awalan-99"): true, rahasia.SidikPenuh("YmFzZTY0LXBhZGRpbmc="): true}
	isi := "a: 1\nkunci = \"kunci-tanpa-awalan-99\"\nlain: YmFzZTY0LXBhZGRpbmc=\nbukan: kunci-tanpa-awalan-98\n"
	got := rahasia.Pindai("x.yml", []byte(isi), "", sidik)
	if len(got) != 2 || got[0].Baris != 2 || got[1].Baris != 3 || got[0].Alasan != rahasia.AlasanSidik || got[1].Alasan != rahasia.AlasanSidik {
		t.Fatalf("temuan: %+v", got)
	}
}

func TestPindaiAturanDimatikanBilaMasukanKosongDanAwalanMenangAtasSidik(t *testing.T) {
	isi := []byte("K=" + prod + "\n")
	if got := rahasia.Pindai("x", isi, "", nil); len(got) != 0 {
		t.Fatalf("tanpa aturan: %+v", got)
	}
	got := rahasia.Pindai("x", isi, "gw_live_", map[string]bool{rahasia.SidikPenuh(prod): true})
	if len(got) != 1 || got[0].Alasan != rahasia.AlasanAwalan {
		t.Fatalf("awalan dan sidik cocok sekaligus: %+v", got)
	}
}

func TestPindaiSatuTemuanPerBarisDanNomorBarisDimulaiDariSatu(t *testing.T) {
	isi := "gw_live_aaaaaaaa gw_live_bbbbbbbb\n\ngw_live_cccccccc\n"
	got := rahasia.Pindai("x", []byte(isi), "gw_live_", nil)
	if len(got) != 2 || got[0].Baris != 1 || got[1].Baris != 3 {
		t.Fatalf("temuan: %+v", got)
	}
}

func TestPindaiAwalanHanyaBerlakuDiAwalTokenBukanDiTengah(t *testing.T) {
	isi := []byte("catatan: aturan_gw_live_dipakai_untuk_produksi\nURL=http://x.internal/gw_live_/path\n")
	if got := rahasia.Pindai("x", isi, "gw_live_", nil); len(got) != 0 {
		t.Fatalf("awalan di tengah token bukan kunci produksi: %+v", got)
	}
}

func TestPindaiSidikMenangkapTokenPendekDanBerhubungDanNilaiBerkarakterKhusus(t *testing.T) {
	sidik := map[string]bool{
		rahasia.SidikPenuh("hunter22"):        true, // tepat delapan karakter, di baris bebas tanpa = atau :
		rahasia.SidikPenuh("abc-def-ghi-jkl"): true, // tanda hubung di dalam token, di array JSON
		rahasia.SidikPenuh("p@ss.w0rd!"):      true, // karakter di luar token: hanya lewat nilai sesudah =, tanda kutip dibuang
		rahasia.SidikPenuh("k7"):              true, // nilai pendek sesudah =
	}
	isi := "jalankan hunter22 sekarang\n[\"abc-def-ghi-jkl\"]\nPASS=\"p@ss.w0rd!\"\nK=k7\nbersih: tidak ada apa-apa di sini\n"
	got := rahasia.Pindai("x", []byte(isi), "", sidik)
	if len(got) != 4 {
		t.Fatalf("temuan: %+v", got)
	}
	for i, g := range got {
		if g.Baris != i+1 || g.Alasan != rahasia.AlasanSidik {
			t.Errorf("temuan %d: %+v", i, g)
		}
	}
}

func TestPindaiBarisLebihPanjangDariBatasTidakMenyembunyikanSisaBerkas(t *testing.T) {
	// Tanpa pemeriksaan galat pembaca, baris pertama yang terlalu panjang menghentikan pemindaian dan berkas ini
	// tampak bersih padahal baris kedua memuat kunci produksi.
	isi := "CATATAN=" + strings.Repeat("x", rahasia.BatasBaris+1) + "\nGATEWAY_KEY=" + prod + "\n"
	got := rahasia.Pindai("besar.env", []byte(isi), "gw_live_", nil)
	if len(got) != 1 || got[0].Baris != 1 || got[0].Alasan != rahasia.AlasanTakTerbaca || got[0].Berkas != "besar.env" {
		t.Fatalf("baris yang tidak terbaca harus dilaporkan: %+v", got)
	}
	if got := rahasia.Pindai("pas.env", []byte("CATATAN="+strings.Repeat("x", rahasia.BatasBaris-100)+"\nGATEWAY_KEY="+prod+"\n"), "gw_live_", nil); len(got) != 1 || got[0].Baris != 2 || got[0].Alasan != rahasia.AlasanAwalan {
		t.Fatalf("baris di bawah batas dipindai biasa: %+v", got)
	}
}
