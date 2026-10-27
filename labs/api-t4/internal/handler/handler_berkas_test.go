package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tes HTTP unggah file identitas lewat presigned PUT dan unduh sesudah retensi (ADR 38, lab t4-storage).

type penandaPalsu struct {
	objek.Dir
	ukuran []int64
}

func (p *penandaPalsu) PresignPUT(kunci string, umur time.Duration, ukuran int64) (string, error) {
	p.ukuran = append(p.ukuran, ukuran)
	return "palsu://" + kunci + "?X-Amz-Signature=tanda", nil
}

func siapkanBerkas(t *testing.T, denganPresign bool) (*bo, *penandaPalsu) {
	t.Helper()
	_, db, _ := siapkanDB(t)
	dir := objek.Dir{Akar: t.TempDir()}
	p := &penandaPalsu{Dir: dir}
	var o objek.Penyimpan = p
	if !denganPresign {
		o = dir
	}
	b := &bo{t: t, db: db, objek: dir}
	b.srv = httptest.NewServer(Baru(service.Baru(repo.Baru(db), time.Hour).DenganT4(service.Dep{Objek: o})).Rute())
	t.Cleanup(b.srv.Close)
	return b, p
}

func TestHandlerBerkasUnggahanLoginUkuranDanTanpaCache(t *testing.T) {
	b, p := siapkanBerkas(t, true)
	pemohon, token := b.akun("pemakai", "belum")
	if r, _ := b.panggil("POST", "/verifikasi/unggahan", "", ""); r.StatusCode != 401 {
		t.Fatalf("tanpa login: %d, harus 401", r.StatusCode)
	}
	r, isi := b.panggil("POST", "/verifikasi/unggahan", token, "")
	if r.StatusCode != 201 {
		t.Fatalf("body kosong: %d %s", r.StatusCode, isi)
	}
	if got := r.Header.Get("Cache-Control"); got != "no-store" {
		t.Errorf("Cache-Control %q, harus no-store (URL adalah bearer token)", got)
	}
	var u struct {
		KunciKartu, URLKartu, KunciSwafoto, URLSwafoto string
		BerlakuSampai                                  time.Time
	}
	var mentah map[string]any
	json.Unmarshal(isi, &mentah)
	for _, k := range []string{"kunci_kartu", "url_kartu", "kunci_swafoto", "url_swafoto", "berlaku_sampai"} {
		if _, ada := mentah[k]; !ada {
			t.Errorf("jawaban tanpa %s: %s", k, isi)
		}
	}
	json.Unmarshal(isi, &u)
	if awalan := fmt.Sprintf("identitas/%d/", pemohon); !strings.HasPrefix(mentah["kunci_kartu"].(string), awalan) {
		t.Errorf("kunci %v tanpa awalan %s", mentah["kunci_kartu"], awalan)
	}
	if len(p.ukuran) != 2 || p.ukuran[0] != 0 || p.ukuran[1] != 0 {
		t.Errorf("tanpa ukuran, PresignPUT harus 0 dan 0: %v", p.ukuran)
	}
	// Ukuran yang disebut ikut ditandatangani (diteruskan ke PresignPUT); {} juga diterima.
	p.ukuran = nil
	if r, isi := b.panggil("POST", "/verifikasi/unggahan", token, `{"ukuran_kartu":1000,"ukuran_swafoto":2000}`); r.StatusCode != 201 {
		t.Fatalf("dengan ukuran: %d %s", r.StatusCode, isi)
	}
	if len(p.ukuran) != 2 || p.ukuran[0] != 1000 || p.ukuran[1] != 2000 {
		t.Errorf("ukuran ke PresignPUT: %v", p.ukuran)
	}
	for _, c := range []struct {
		body   string
		status int
		// Badan permintaan URL paling besar 1 KiB: JSON yang sah tetapi 2 KiB ditolak sebelum diurai (bukan diterima dan
		// dijawab 201 dengan bidang asing diabaikan).
	}{{`{"ukuran_kartu":1048577}`, 422}, {`{"ukuran_swafoto":-1}`, 422}, {`{`, 400}, {`{"ukuran_kartu":"seribu"}`, 400},
		{`{"ukuran_kartu":0,"catatan":"` + strings.Repeat("a", 2048) + `"}`, 400}} {
		if r, isi := b.panggil("POST", "/verifikasi/unggahan", token, c.body); r.StatusCode != c.status {
			t.Errorf("%s: %d %s, harus %d", c.body, r.StatusCode, isi, c.status)
		}
	}
	// Penyimpanan tanpa kemampuan presign (direktori lokal): 503, bukan 500.
	b2, _ := siapkanBerkas(t, false)
	_, token2 := b2.akun("pemakai", "belum")
	if r, _ := b2.panggil("POST", "/verifikasi/unggahan", token2, ""); r.StatusCode != 503 {
		t.Errorf("tanpa presign: %d, harus 503", r.StatusCode)
	}
	// Akun terverifikasi: 409.
	_, tokenT := b.akun("pemakai", "terverifikasi")
	if r, _ := b.panggil("POST", "/verifikasi/unggahan", tokenT, ""); r.StatusCode != 409 {
		t.Errorf("sudah terverifikasi: %d, harus 409", r.StatusCode)
	}
}

func TestHandlerBerkasTerunggahAlurDanNomorIdentitasTidakDiulang(t *testing.T) {
	b, p := siapkanBerkas(t, true)
	_, token := b.akun("pemakai", "belum")
	_, isi := b.panggil("POST", "/verifikasi/unggahan", token, "")
	var u map[string]string
	json.Unmarshal(isi, &u)
	kartu, swafoto := append(append([]byte{}, pngTes...), "k"...), append(append([]byte{}, pngTes...), "s"...)
	b.objek.Simpan(context.Background(), u["kunci_kartu"], kartu)
	b.objek.Simpan(context.Background(), u["kunci_swafoto"], swafoto)
	sk, ss := sha256.Sum256(kartu), sha256.Sum256(swafoto)
	badan := func(nomor any) string {
		j, _ := json.Marshal(map[string]any{"kunci_kartu": u["kunci_kartu"], "kunci_swafoto": u["kunci_swafoto"],
			"checksum_kartu": hex.EncodeToString(sk[:]), "checksum_swafoto": hex.EncodeToString(ss[:]), "nomor_identitas": nomor})
		return string(j)
	}
	const nomor = "1111222233334444"
	// Nomor bertipe salah (angka JSON): 422 tanpa mengutip nilainya, juga tidak di pesan pengurai JSON.
	r, isi := b.panggil("POST", "/verifikasi/terunggah", token, badan(1111222233334444))
	if r.StatusCode != 422 || strings.Contains(string(isi), "1111222233334444") || strings.Contains(string(isi), "1.111222233334444e+15") {
		t.Fatalf("nomor angka JSON: %d %s", r.StatusCode, isi)
	}
	// Nomor teks yang bentuknya salah: 422 tanpa mengutip nilainya.
	r, isi = b.panggil("POST", "/verifikasi/terunggah", token, badan("1111-2222"))
	if r.StatusCode != 422 || strings.Contains(string(isi), "1111-2222") {
		t.Fatalf("nomor salah bentuk: %d %s", r.StatusCode, isi)
	}
	// Badan yang bukan JSON: 400 tanpa mengutip apa pun.
	if r, isi = b.panggil("POST", "/verifikasi/terunggah", token, `{"nomor_identitas":`+nomor); r.StatusCode != 400 || strings.Contains(string(isi), nomor) {
		t.Fatalf("JSON rusak: %d %s", r.StatusCode, isi)
	}
	// Badan terlalu besar (lebih dari 4 KiB): ditolak sebelum dibaca.
	if r, _ = b.panggil("POST", "/verifikasi/terunggah", token, `{"nomor_identitas":"`+strings.Repeat("9", 5000)+`"}`); r.StatusCode != 400 {
		t.Errorf("badan besar: %d, harus 400", r.StatusCode)
	}
	r, isi = b.panggil("POST", "/verifikasi/terunggah", token, badan(nomor))
	if r.StatusCode != 202 {
		t.Fatalf("pengajuan sah: %d %s", r.StatusCode, isi)
	}
	var v struct {
		ID     int64  `json:"id"`
		Status string `json:"status"`
	}
	json.Unmarshal(isi, &v)
	if v.Status != "diajukan" || r.Header.Get("Location") != fmt.Sprintf("/verifikasi/%d", v.ID) {
		t.Errorf("status %q, Location %q", v.Status, r.Header.Get("Location"))
	}
	if strings.Contains(string(isi), nomor) || strings.Contains(string(isi), "identitas/") {
		t.Errorf("jawaban memuat nomor identitas atau kunci objek: %s", isi)
	}
	if r, _ := b.panggil("POST", "/verifikasi/terunggah", "", badan(nomor)); r.StatusCode != 401 {
		t.Errorf("tanpa login: %d", r.StatusCode)
	}
	_ = p
}

// Pengajuan terunggah dibatasi per alamat (10 per jam) sebelum badan permintaan dibaca, terpisah dari batas per akun
// (3 per jam): sepuluh akun berbeda dari satu alamat masing-masing satu kali lolos ke validasi (422), yang kesebelas
// dijawab 429 dari lapis alamat.
func TestHandlerBerkasTerunggahDibatasiPerAlamatTerpisahDariBatasAkun(t *testing.T) {
	b, _ := siapkanBerkas(t, true)
	for i := 1; i <= 11; i++ {
		_, token := b.akun("pemakai", "belum")
		r, isi := b.panggil("POST", "/verifikasi/terunggah", token, `{}`)
		want := 422
		if i == 11 {
			want = 429
		}
		if r.StatusCode != want {
			t.Fatalf("akun ke-%d dari alamat yang sama: %d %s, harus %d", i, r.StatusCode, isi, want)
		}
	}
}

func TestHandlerBerkasBukaSesudahRetensiMenjawab410DanTetapMencatatAudit(t *testing.T) {
	b, _ := siapkanBerkas(t, true)
	_, risk := b.akun("risk", "terverifikasi")
	pemohon, _ := b.akun("pemakai", "belum")
	var id int64
	if err := b.db.QueryRow(`INSERT INTO verifikasi (akun_id, subjek, status, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto, selesai, hapus_pada)
		VALUES ($1, 'pemakai', 'lulus', '', '', $2, $2, now() - interval '31 days', now() - interval '1 day') RETURNING id`, pemohon, strings.Repeat("a", 64)).Scan(&id); err != nil {
		t.Fatal(err)
	}
	var sebelum int
	b.db.QueryRow(`SELECT count(*) FROM audit_log WHERE objek = $1`, fmt.Sprintf("verifikasi:%d/kartu", id)).Scan(&sebelum)
	jalur := fmt.Sprintf("/bo/verifikasi/%d/berkas/kartu?alasan=%s", id, url.QueryEscape("memeriksa pengajuan yang filenya sudah dihapus"))
	r, isi := b.panggil("GET", jalur, risk, "")
	if r.StatusCode != 410 || !strings.Contains(string(isi), "/problems/berkas-dihapus") {
		t.Fatalf("sesudah retensi: %d %s, harus 410 berkas-dihapus", r.StatusCode, isi)
	}
	var sesudah int
	b.db.QueryRow(`SELECT count(*) FROM audit_log WHERE objek = $1`, fmt.Sprintf("verifikasi:%d/kartu", id)).Scan(&sesudah)
	if sesudah != sebelum+1 {
		t.Errorf("baris audit %d sebelum dan %d sesudah; percobaan membuka harus tercatat", sebelum, sesudah)
	}
}
