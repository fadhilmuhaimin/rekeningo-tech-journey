package main

import (
	"context"
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/corazawaf/coraza/v3"
	corazahttp "github.com/corazawaf/coraza/v3/http"
	"github.com/corazawaf/coraza/v3/types"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Tes tambahan dari tinjauan independen (keputusan 1661). Tiap tes menutup mutan yang lolos dari tes pelaksana:
// kunci bucket, urutan kuota dan tanda tangan, kebocoran slot, rute, query string, body, galat WAF yang ditelan,
// dan baris mitra_pos yang dibaca dari database.

// Kuota ada SEBELUM tanda tangan: kunci API yang sah tanpa rahasia penandatangannya masih memakai token mitra
// pemiliknya, dan mitra lain tidak terkena. Akibatnya (README, Keputusan desain): kunci API yang bocor tanpa rahasia
// penandatangan cukup untuk menghabiskan kuota mitra itu. Kunci yang tidak dikenal tidak memakai kuota siapa pun.
func TestGerbangKuotaSebelumTandaTangan(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	for i := 0; i < 100; i++ {
		l.harus(l.kirim(kunciA, "rahasia-lain", "GET", uriQR+"/x", ""), 401, "tanda-tangan-salah")
	}
	l.harus(l.kirim(kunciA, "rahasia-lain", "GET", uriQR+"/x", ""), 429, "kuota-terlampaui")
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 429, "kuota-terlampaui") // kasir A yang sah ikut terkena
	l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "")
	for i := 0; i < 5; i++ { // kunci tidak dikenal: 401, tidak memakai bucket siapa pun
		l.harus(l.kirim(fmt.Sprintf("tebakan-%d", i), rahasiaA, "GET", uriQR+"/x", ""), 401, "kunci-tidak-sah")
	}
	l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "")
	if n := l.dipanggil.Load(); n != 2 {
		t.Fatalf("hulu dipanggil %d kali, harus 2 (dua permintaan mitra B)", n)
	}
}

// Kunci bucket datang dari mitra yang kunci API-nya terverifikasi, bukan dari kepala yang dikirim client: A yang
// menulis X-Mitra-Id milik B tetap memakai bucket A, dan bucket B utuh.
func TestGerbangKunciBucketDariKunciYangSah(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	klaimB := func(r *http.Request) { r.Header.Set(HeaderMitra, "2") }
	for i := 0; i < 100; i++ {
		l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "", klaimB), 200, "")
	}
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "", klaimB), 429, "kuota-terlampaui")
	for i := 0; i < 100; i++ {
		l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "") // bucket B penuh: 100 permintaan lolos
	}
}

// Kuota tiap mitra datang dari barisnya (mitra_pos.kuota_per_detik), bukan angka tetap 100: mitra E punya 10.
func TestGerbangKuotaTiapMitraDariBarisnya(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	n := 0
	for i := 0; i < 15; i++ {
		if s, _ := status(l.kirim(kunciE, rahasiaE, "GET", uriQR+"/x", "")); s == 200 {
			n++
		}
	}
	if n != 10 {
		t.Fatalf("mitra E (10 per detik) meloloskan %d dari 15, harus 10", n)
	}
	l.jam.Add(500) // setengah detik: 5 token
	n = 0
	for i := 0; i < 15; i++ {
		if s, _ := status(l.kirim(kunciE, rahasiaE, "GET", uriQR+"/x", "")); s == 200 {
			n++
		}
	}
	if n != 5 {
		t.Fatalf("sesudah 500 ms mitra E meloloskan %d, harus 5", n)
	}
}

// Permintaan yang ditolak tidak meninggalkan apa pun: slot berjalan kembali bebas, dan penolakan karena terlalu banyak
// berjalan tidak memakai token. Hitungan berjalan yang bocor akan menolak mitra yang sudah sepi sampai kuncinya kedaluwarsa.
func TestGerbangBerjalanDanTokenTidakBocorSesudahDitolak(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.tahan = make(chan struct{})
	lepas := sync.OnceFunc(func() { close(l.tahan) })
	t.Cleanup(lepas)
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "")) }()
	}
	batas := time.Now().Add(5 * time.Second)
	for l.dipanggil.Load() < 20 {
		if time.Now().After(batas) {
			t.Fatalf("hanya %d dari 20 permintaan sampai ke hulu", l.dipanggil.Load())
		}
		time.Sleep(5 * time.Millisecond)
	}
	for i := 0; i < 30; i++ {
		l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 429, "terlalu-banyak-berjalan")
	}
	lepas()
	wg.Wait()
	// 20 token terpakai oleh yang berjalan; 30 penolakan tidak memakai token: tersisa 80, lalu bucket habis.
	n := 0
	for i := 0; i < 100; i++ {
		s, b := status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""))
		switch {
		case s == 200:
			n++
		case !strings.Contains(b, "kuota-terlampaui"):
			t.Fatalf("permintaan %d: %d %s (slot berjalan bocor?)", i, s, b)
		}
	}
	if n != 80 {
		t.Fatalf("sisa token %d, harus 80 (penolakan berjalan memakai token?)", n)
	}
}

// Penolakan karena token habis melepas slot berjalan yang baru diambil. Tanpa itu, 30 penolakan menahan 30 slot
// dan mitra yang sudah sepi ditolak "terlalu-banyak-berjalan" padahal tidak ada permintaan yang sedang jalan.
func TestGerbangSlotDilepasSesudahKuotaHabis(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	for i := 0; i < 100; i++ {
		status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""))
	}
	for i := 0; i < 30; i++ {
		l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 429, "kuota-terlampaui")
	}
	l.jam.Add(1000)
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 200, "")
}

// Keluar tidak pernah membuat hitungan di bawah nol, baik untuk kunci yang sudah nol maupun yang sudah kedaluwarsa:
// hitungan negatif memberi slot tambahan di atas batas 20.
func TestPembatasKeluarTidakDiBawahNol(t *testing.T) {
	for _, kasus := range []struct {
		nama  string
		siapa func(p *Pembatas, kunci string)
	}{
		{"kunci yang sudah nol", func(p *Pembatas, kunci string) {
			if put, err := p.Masuk(context.Background(), kunci, 1000); err != nil || !put.Boleh {
				t.Fatalf("masuk: %v %v", put, err)
			}
			p.Keluar(kunci)
			p.Keluar(kunci)
			p.Keluar(kunci)
		}},
		{"kunci yang tidak ada", func(p *Pembatas, kunci string) { p.Keluar(kunci); p.Keluar(kunci) }},
	} {
		p := BuatPembatas(redisTes(t), fmt.Sprintf("t5waf-tes-keluar-%d-%d:", time.Now().UnixNano(), os.Getpid()), 20)
		defer p.Tutup()
		p.Jam = func() int64 { return 1_800_000_000_000 }
		kasus.siapa(p, "k")
		n := 0
		for i := 0; i < 25; i++ {
			put, err := p.Masuk(context.Background(), "k", 1000)
			if err != nil {
				t.Fatal(err)
			}
			if put.Boleh {
				n++
			}
		}
		if n != 20 {
			t.Errorf("%s: %d slot berjalan terbuka, harus 20", kasus.nama, n)
		}
	}
}

// Hitungan berjalan yang bocor (gerbang mati sebelum Keluar) sembuh sendiri, tetapi hanya sesudah mitra itu sepi selama
// masa berlaku: setiap percobaan, juga yang ditolak, memasang ulang masa berlakunya. Mitra yang terus mengulang tanpa
// jeda (M50) tidak pernah melihat slotnya pulih. Tes ini mengunci perilaku itu supaya komentar di kuota.go tetap benar.
func TestPembatasSlotBocorSembuhHanyaSesudahSepi(t *testing.T) {
	p := BuatPembatas(redisTes(t), fmt.Sprintf("t5waf-tes-bocor-%d-%d:", time.Now().UnixNano(), os.Getpid()), 20)
	defer p.Tutup()
	p.Jam = func() int64 { return 1_800_000_000_000 }
	p.Napas = 600 * time.Millisecond
	ctx := context.Background()
	for i := 0; i < 20; i++ { // 20 slot diambil dan tidak pernah dilepas
		if put, err := p.Masuk(ctx, "k", 1000); err != nil || !put.Boleh {
			t.Fatalf("masuk %d: %v %v", i, put, err)
		}
	}
	for i := 0; i < 6; i++ { // 6 x 150 ms = 900 ms, lebih lama dari masa berlaku (600 ms): tetap ditolak karena terus mencoba
		time.Sleep(150 * time.Millisecond)
		if put, err := p.Masuk(ctx, "k", 1000); err != nil || put.Boleh {
			t.Fatalf("percobaan %d: %v %v, slot yang bocor harus masih menolak selama mitra terus mencoba", i, put, err)
		}
	}
	time.Sleep(900 * time.Millisecond) // sepi lebih lama dari masa berlaku
	if put, err := p.Masuk(ctx, "k", 1000); err != nil || !put.Boleh {
		t.Fatalf("sesudah sepi: %v %v, hitungan yang bocor harus sudah sembuh", put, err)
	}
}

// Hanya alamat di bawah /pos/v1/ yang diteruskan: versi lain, awalan tanpa garis miring, dan /pos/ sendiri tidak.
func TestGerbangRuteHanyaPosV1(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	for _, uri := range []string{"/pos/v2/merchant/30001/qr", "/pos/v1", "/pos/", "/pos", "/pos/v10/x", "/posv1/x"} {
		l.harus(l.kirim(kunciA, rahasiaA, "GET", uri, ""), 404, "tidak-ditemukan")
	}
	if n := l.dipanggil.Load(); n != 0 {
		t.Fatalf("hulu dipanggil %d kali", n)
	}
	l.harus(l.kirim(kunciA, rahasiaA, "GET", "/pos/v1/merchant/30001/qr/x", ""), 200, "")
}

// Query string ikut ditandatangani: tanda tangan untuk ?a=1 tidak berlaku untuk ?a=2, dan yang bertanda tangan sah
// dengan query diterima.
func TestGerbangTandaTanganMencakupQuery(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x?a=1", ""), 200, "")
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x?a=1", "", func(r *http.Request) { r.URL.RawQuery = "a=2" }), 401, "tanda-tangan-salah")
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x?a=1", "", func(r *http.Request) { r.URL.RawQuery = "" }), 401, "tanda-tangan-salah")
	if n := l.dipanggil.Load(); n != 1 {
		t.Fatalf("hulu dipanggil %d kali, harus 1", n)
	}
}

// Body yang lolos diteruskan utuh ke hulu (byte yang sama dengan yang ditandatangani).
func TestGerbangBodyDiteruskanUtuh(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	const isi = `{"nominal":25000,"referensi":"MEJA 12"}`
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, isi), 200, "")
	if got, _ := l.badan.Load().(string); got != isi {
		t.Fatalf("body di hulu %q, harus %q", got, isi)
	}
}

// Batas yang diketahui dan sengaja dicatat (README, "Batas tanda tangan"): tanda tangan tidak memuat Idempotency-Key
// dan tidak ada nonce, jadi permintaan bertanda tangan sah yang diputar ulang di dalam jendela 5 menit diterima lagi,
// juga dengan Idempotency-Key lain. Tes ini mengunci keadaan itu: bila kelak kepala itu ikut ditandatangani, tes ini
// berubah menjadi 401 dan README harus ikut diubah.
func TestGerbangPutarUlangDalamJendelaDiterima(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	const isi = `{"nominal":25000}`
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, isi), 200, "")
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, isi), 200, "") // putar ulang persis sama
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, isi, func(r *http.Request) {
		r.Header.Set("Idempotency-Key", `"11111111-1111-4111-8111-111111111111"`) // kepala yang tidak ditandatangani, diganti
	}), 200, "")
	h := l.kepala.Load().(http.Header)
	if h.Get("Idempotency-Key") != `"11111111-1111-4111-8111-111111111111"` {
		t.Errorf("Idempotency-Key di hulu %q", h.Get("Idempotency-Key"))
	}
}

// Perbandingan tanda tangan memakai hmac.Equal (waktu tetap). Perilakunya tidak terlihat dari luar, jadi dijaga
// lewat sumbernya: PeriksaTanda memanggil hmac.Equal dan tidak membandingkan tanda tangan dengan ==, bytes.Equal,
// atau subtle.
func TestPeriksaTandaMemakaiHmacEqual(t *testing.T) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "tanda.go", nil, 0)
	if err != nil {
		t.Fatal(err)
	}
	var panggil []string
	var banding int
	for _, d := range f.Decls {
		fn, ok := d.(*ast.FuncDecl)
		if !ok || fn.Name.Name != "PeriksaTanda" {
			continue
		}
		ast.Inspect(fn.Body, func(n ast.Node) bool {
			switch x := n.(type) {
			case *ast.CallExpr:
				if s, ok := x.Fun.(*ast.SelectorExpr); ok {
					if id, ok := s.X.(*ast.Ident); ok {
						panggil = append(panggil, id.Name+"."+s.Sel.Name)
					}
				}
			case *ast.BinaryExpr:
				for _, o := range []ast.Expr{x.X, x.Y} {
					if id, ok := o.(*ast.Ident); ok && (id.Name == "hitung" || id.Name == "diterima") {
						banding++
					}
				}
			}
			return true
		})
	}
	var equal, lain int
	for _, p := range panggil {
		switch p {
		case "hmac.Equal":
			equal++
		case "bytes.Equal", "subtle.ConstantTimeCompare":
			lain++
		}
	}
	if equal != 1 || lain != 0 || banding != 0 {
		t.Fatalf("hmac.Equal %d kali, pembanding lain %d, == atas tanda tangan %d; panggilan: %v", equal, lain, banding, panggil)
	}
}

// --- galat WAF yang tidak boleh ditelan ---

type trxGalatBaca struct{ types.Transaction }

func (trxGalatBaca) ReadRequestBodyFrom(io.Reader) (*types.Interruption, int, error) {
	return nil, 0, errors.New("disk penuh")
}

type trxGalatProses struct{ types.Transaction }

func (trxGalatProses) ProcessRequestBody() (*types.Interruption, error) {
	return nil, errors.New("parser rusak")
}

// Galat saat WAF membaca atau memproses body dikembalikan sebagai galat (gerbang menjawabnya 503), bukan ditelan
// menjadi "tidak ada temuan".
func TestWAFGalatBodyDikembalikan(t *testing.T) {
	w := bukaWAFTes(t, "On")
	p := muatPayload(t).Sah[0]
	for nama, bungkus := range map[string]func(types.Transaction) types.Transaction{
		"baca":   func(tx types.Transaction) types.Transaction { return trxGalatBaca{tx} },
		"proses": func(tx types.Transaction) types.Transaction { return trxGalatProses{tx} },
	} {
		r, body := p.permintaan()
		it, err := proses(bungkus(w.waf.NewTransaction()), r, body)
		if err == nil || it != nil {
			t.Errorf("%s: interupsi %v, galat %v; galat harus dikembalikan", nama, it, err)
		}
	}
}

type bacaPutus struct{}

func (bacaPutus) Read([]byte) (int, error) { return 0, errors.New("koneksi putus di tengah body") }

// Alasan gerbang menulis middleware sendiri (R5-308): saat pemrosesan galat, WrapHandler bawaan Coraza v3.8.1 TIDAK
// meneruskan permintaan ke aplikasi, tetapi juga tidak menulis jawaban, sehingga client menerima 200 kosong.
// Aman bagi data, menyesatkan bagi kasir (QR belum dibuat, jawabannya 200). Bila versi Coraza berubah dan tes ini
// gagal, baca ulang middleware.go dan README sebelum menyesuaikan angkanya.
func TestCorazaWrapHandlerBawaanGalatMenjawab200Kosong(t *testing.T) {
	waf, err := coraza.NewWAF(coraza.NewWAFConfig().WithDirectives("SecRuleEngine On\nSecRequestBodyAccess On\n" +
		"SecRule REQUEST_HEADERS:Content-Type \"^application/x-www-form-urlencoded\" \"id:1,phase:1,pass,nolog,ctl:requestBodyProcessor=URLENCODED\"\n"))
	if err != nil {
		t.Fatal(err)
	}
	dipanggil := false
	h := corazahttp.WrapHandler(waf, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dipanggil = true
		io.WriteString(w, "isi dari aplikasi")
	}))
	r := httptest.NewRequest("POST", "/x", io.MultiReader(strings.NewReader("a=b&"), bacaPutus{}))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	if dipanggil || rec.Code != 200 || rec.Body.Len() != 0 {
		t.Fatalf("aplikasi dipanggil %v, status %d, body %q; yang dicatat: tidak dipanggil, 200, kosong", dipanggil, rec.Code, rec.Body.String())
	}
}

// --- baris mitra_pos dari database ---

// tokoPG membaca status dan kuota dari baris mitra_pos; tes rantai memakai toko palsu, jadi SQL-nya dijaga di sini.
// Butuh PostgreSQL lab (TEST_DATABASE_URL, schema tes api-t5); TES_DB_WAJIB=1 gagal keras bila kosong.
func TestTokoPGMembacaBarisMitra(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL lab")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	awal := fmt.Sprintf("tes-%d-%d", time.Now().UnixNano(), os.Getpid())
	var idAktif, idBeku int64
	for _, c := range []struct {
		nama, status string
		kuota        int
		id           *int64
	}{{"Tes aktif", "aktif", 37, &idAktif}, {"Tes beku", "dibekukan", 42, &idBeku}} {
		if err := pool.QueryRow(ctx, `INSERT INTO mitra_pos (nama, kunci_hash, status, kuota_per_detik) VALUES ($1, $2, $3, $4) RETURNING id`,
			c.nama, SidikKunci(awal+c.nama), c.status, c.kuota).Scan(c.id); err != nil {
			t.Fatal(err)
		}
	}
	toko := tokoPG{pool}
	m, ok, err := toko.CariKunci(ctx, SidikKunci(awal+"Tes aktif"))
	if err != nil || !ok || m.ID != idAktif || m.Status != "aktif" || m.KuotaPerDetik != 37 || m.Nama != "Tes aktif" {
		t.Fatalf("mitra aktif: %+v ok=%v err=%v", m, ok, err)
	}
	m, ok, err = toko.CariKunci(ctx, SidikKunci(awal+"Tes beku"))
	if err != nil || !ok || m.ID != idBeku || m.Status != "dibekukan" || m.KuotaPerDetik != 42 {
		t.Fatalf("mitra dibekukan: %+v ok=%v err=%v", m, ok, err)
	}
	if _, ok, err = toko.CariKunci(ctx, SidikKunci(awal+"tidak ada")); err != nil || ok {
		t.Fatalf("kunci tidak dikenal: ok=%v err=%v", ok, err)
	}
}
