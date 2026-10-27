// Pihak ketiga tiruan Tahap 4 (lab api-t4): gateway pembayaran bank (-peran gateway) dan layanan verifikasi identitas
// (-peran verifikasi). Keduanya server HTTP lokal di memori; tidak ada layanan nyata dan tidak ada data nyata. Perilaku
// yang salah (mati, lambat, menggantung, setengah menjawab, kiriman ganda, tanda tangan palsu) dinyalakan lewat
// POST /lab/mode dan POST /lab/webhook, supaya rekaman tidak bergantung pada nasib.
package main

import (
	"bufio"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"hash/fnv"
	"log"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

func main() {
	peran := flag.String("peran", "", "gateway atau verifikasi")
	alamat := flag.String("addr", "", "alamat server (bawaan: gateway 127.0.0.1:"+portLab(18283)+", verifikasi 127.0.0.1:"+portLab(18284)+")")
	webhook := flag.String("webhook-url", "http://127.0.0.1:"+portLab(18280)+"/webhooks/pembayaran", "gateway: alamat webhook Rekeningo")
	rahasia := flag.String("rahasia", "rahasia-gateway-lab-1", "gateway: rahasia penanda tangan webhook (data lab, bukan secret)")
	flag.Parse()
	var h http.Handler
	switch *peran {
	case "gateway":
		if *alamat == "" {
			*alamat = "127.0.0.1:" + portLab(18283)
		}
		h = (&gateway{order: map[string]*order{}, kunci: map[string]string{}, webhook: *webhook, rahasia: *rahasia}).rute()
	case "verifikasi":
		if *alamat == "" {
			*alamat = "127.0.0.1:" + portLab(18284)
		}
		h = (&verifikasi{objek: map[string]string{}}).rute()
	default:
		log.Fatal("-peran harus gateway atau verifikasi")
	}
	log.Printf("tiruan %s mendengar di %s", *peran, *alamat)
	log.Fatal(http.ListenAndServe(*alamat, h))
}

// mode: perilaku server tiruan. Dipasang lewat POST /lab/mode.
type mode struct {
	mu   sync.Mutex
	nama string // normal, mati, lambat, menggantung, setelah-buat-menggantung (gateway), setengah (verifikasi), ditolak (verifikasi)
	ms   int
}

func (m *mode) ambil() (string, int) { m.mu.Lock(); defer m.mu.Unlock(); return m.nama, m.ms }

func (m *mode) pasang(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Mode string `json:"mode"`
		Ms   int    `json:"ms"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Mode == "" {
		http.Error(w, "body harus {mode, ms}", http.StatusBadRequest)
		return
	}
	m.mu.Lock()
	m.nama, m.ms = in.Mode, in.Ms
	m.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func tulis(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// gangguan menjalankan mode yang tidak menjawab normal. true = permintaan sudah ditangani (jangan lanjut).
func gangguan(m *mode, w http.ResponseWriter, r *http.Request) bool {
	nama, ms := m.ambil()
	switch nama {
	case "mati":
		http.Error(w, "layanan tidak tersedia", http.StatusServiceUnavailable)
		return true
	case "lambat":
		time.Sleep(time.Duration(ms) * time.Millisecond)
	case "menggantung":
		<-r.Context().Done() // tidak menjawab sampai client menyerah
		return true
	}
	return false
}

// --- gateway pembayaran ---

type order struct {
	OrderID     string `json:"order_id"`
	Jumlah      int64  `json:"jumlah"`
	Status      string `json:"status"` // pending, settlement, expire, failure
	TujuanBayar string `json:"tujuan_bayar"`
	Tanggal     string `json:"-"` // tanggal settlement (YYYY-MM-DD)
}

type gateway struct {
	mu      sync.Mutex
	m       mode
	order   map[string]*order
	kunci   map[string]string // Idempotency-Key -> order_id
	webhook string
	rahasia string
}

func tujuanBayar(orderID string) string {
	h := fnv.New64a()
	h.Write([]byte(orderID))
	return fmt.Sprintf("88%014d", h.Sum64()%100_000_000_000_000)
}

func (g *gateway) rute() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /lab/mode", g.m.pasang)
	mux.HandleFunc("POST /lab/reset", func(w http.ResponseWriter, r *http.Request) {
		g.mu.Lock()
		g.order, g.kunci = map[string]*order{}, map[string]string{}
		g.mu.Unlock()
		g.m.mu.Lock()
		g.m.nama, g.m.ms = "", 0
		g.m.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /orders", g.buat)
	mux.HandleFunc("GET /orders/{id}", g.status)
	mux.HandleFunc("GET /settlement", g.settlement)
	mux.HandleFunc("POST /lab/bayar", g.bayar)
	mux.HandleFunc("POST /lab/webhook", g.kirimWebhook)
	mux.HandleFunc("POST /lab/jadwal", g.jadwal)   // jadwal ulangan dengan waktu maya (jadwal.go)
	mux.HandleFunc("POST /lab/rahasia", g.rotasi)  // rotasi rahasia penanda tangan (jadwal.go)
	mux.HandleFunc("GET /lab/orders", func(w http.ResponseWriter, r *http.Request) {
		g.mu.Lock()
		defer g.mu.Unlock()
		daftar := []*order{}
		for _, o := range g.order {
			daftar = append(daftar, o)
		}
		sort.Slice(daftar, func(i, j int) bool { return daftar[i].OrderID < daftar[j].OrderID })
		tulis(w, 200, map[string]any{"jumlah": len(daftar), "order": daftar})
	})
	return mux
}

// buat: Idempotency-Key yang sama tidak membuat order kedua (satu objek per key).
func (g *gateway) buat(w http.ResponseWriter, r *http.Request) {
	nama, ms := g.m.ambil()
	if gangguan(&g.m, w, r) {
		return
	}
	var in struct {
		OrderID string `json:"order_id"`
		Jumlah  int64  `json:"jumlah"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.OrderID == "" || in.Jumlah <= 0 {
		http.Error(w, "body harus {order_id, jumlah}", http.StatusBadRequest)
		return
	}
	k := r.Header.Get("Idempotency-Key")
	g.mu.Lock()
	status := http.StatusCreated
	if ada, ok := g.kunci[k]; ok && k != "" {
		in.OrderID, status = ada, http.StatusOK
	} else {
		g.order[in.OrderID] = &order{OrderID: in.OrderID, Jumlah: in.Jumlah, Status: "pending", TujuanBayar: tujuanBayar(in.OrderID)}
		if k != "" {
			g.kunci[k] = in.OrderID
		}
	}
	o := *g.order[in.OrderID]
	g.mu.Unlock()
	if nama == "setelah-buat-menggantung" { // order sudah dibuat, jawabannya tidak pernah sampai: client timeout
		_ = ms
		<-r.Context().Done()
		return
	}
	tulis(w, status, o)
}

func (g *gateway) status(w http.ResponseWriter, r *http.Request) {
	if gangguan(&g.m, w, r) {
		return
	}
	g.mu.Lock()
	o, ok := g.order[r.PathValue("id")]
	var salin order
	if ok {
		salin = *o
	}
	g.mu.Unlock()
	if !ok {
		http.NotFound(w, r)
		return
	}
	tulis(w, 200, salin)
}

func (g *gateway) settlement(w http.ResponseWriter, r *http.Request) {
	if gangguan(&g.m, w, r) {
		return
	}
	tanggal := r.URL.Query().Get("tanggal")
	g.mu.Lock()
	baris := []map[string]any{}
	for _, o := range g.order {
		if o.Status == "settlement" && o.Tanggal == tanggal {
			baris = append(baris, map[string]any{"order_id": o.OrderID, "jumlah": o.Jumlah})
		}
	}
	g.mu.Unlock()
	sort.Slice(baris, func(i, j int) bool { return baris[i]["order_id"].(string) < baris[j]["order_id"].(string) })
	tulis(w, 200, map[string]any{"tanggal": tanggal, "baris": baris})
}

// bayar: pembayar membayar di app bank. Order menjadi settlement; webhook dikirim terpisah (POST /lab/webhook).
func (g *gateway) bayar(w http.ResponseWriter, r *http.Request) {
	var in struct {
		OrderID string `json:"order_id"`
		Status  string `json:"status"`  // settlement (bawaan), expire, failure
		Jumlah  int64  `json:"jumlah"`  // 0 = jumlah order; selain itu dipakai laporan settlement (selisih jumlah)
		Tanggal string `json:"tanggal"` // tanggal settlement; kosong = hari ini (Asia/Jakarta)
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		http.Error(w, "body rusak", http.StatusBadRequest)
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	o, ok := g.order[in.OrderID]
	if !ok {
		if in.Jumlah <= 0 {
			http.NotFound(w, r)
			return
		}
		// Pembayaran untuk order yang tidak dikenal Rekeningo (mis. order dibuat di luar): dicatat apa adanya.
		o = &order{OrderID: in.OrderID, Jumlah: in.Jumlah}
		g.order[in.OrderID] = o
	}
	o.Status = "settlement"
	if in.Status != "" {
		o.Status = in.Status
	}
	if in.Jumlah > 0 {
		o.Jumlah = in.Jumlah
	}
	o.Tanggal = in.Tanggal
	if o.Tanggal == "" {
		loc, _ := time.LoadLocation("Asia/Jakarta")
		o.Tanggal = time.Now().In(loc).Format("2006-01-02")
	}
	tulis(w, 200, o)
}

// kirimWebhook mengirim kabar ke Rekeningo sebanyak `kali` (berurutan, atau serentak bila `serentak`), bertanda tangan
// HMAC-SHA256 atas "<timestamp>.<body>". Penyimpangan yang bisa dipilih: tanpa tanda tangan, rahasia lain,
// timestamp bergeser, body yang diubah sesudah ditandatangani, dan `putus_balasan`.
func (g *gateway) kirimWebhook(w http.ResponseWriter, r *http.Request) {
	var in struct {
		EventID      string `json:"event_id"`
		OrderID      string `json:"order_id"`
		Status       string `json:"status"` // settlement (bawaan), pending, expire, failure
		Jumlah       int64  `json:"jumlah"`
		Kali         int    `json:"kali"`
		Serentak     bool   `json:"serentak"`
		Rahasia      string `json:"rahasia"` // kosong = rahasia bawaan
		TanpaTanda   bool   `json:"tanpa_tanda_tangan"`
		GeserDetik   int64  `json:"geser_detik"`   // timestamp = sekarang + geser
		UbahBody     bool   `json:"ubah_body"`     // body diubah sesudah ditandatangani
		BodyAneh     bool   `json:"body_spasi"`    // body ditulis ulang dengan spasi lain, tanda tangan atas versi asli
		PutusBalasan bool   `json:"putus_balasan"` // koneksi ditutup begitu balasan mulai datang, sebelum dibaca
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.EventID == "" || in.OrderID == "" {
		http.Error(w, "body harus {event_id, order_id, ...}", http.StatusBadRequest)
		return
	}
	if in.Status == "" {
		in.Status = "settlement"
	}
	if in.Kali <= 0 {
		in.Kali = 1
	}
	if in.Jumlah == 0 {
		g.mu.Lock()
		if o, ok := g.order[in.OrderID]; ok {
			in.Jumlah = o.Jumlah
		}
		g.mu.Unlock()
	}
	rahasia := g.rahasiaSekarang()
	if in.Rahasia != "" {
		rahasia = in.Rahasia
	}
	asli, _ := json.Marshal(map[string]any{"event_id": in.EventID, "order_id": in.OrderID, "status": in.Status, "jumlah": in.Jumlah})
	hasil := make([]string, in.Kali)
	kirim := func(i int) {
		ts := time.Now().Unix() + in.GeserDetik
		m := hmac.New(sha256.New, []byte(rahasia))
		fmt.Fprintf(m, "%d.", ts)
		m.Write(asli)
		tanda := hex.EncodeToString(m.Sum(nil))
		body := asli
		if in.UbahBody {
			body, _ = json.Marshal(map[string]any{"event_id": in.EventID, "order_id": in.OrderID, "status": in.Status, "jumlah": in.Jumlah * 10})
		}
		if in.BodyAneh {
			body = []byte(strings.Replace(string(asli), ",", ", ", 1))
		}
		kepala := map[string]string{"X-Gateway-Timestamp": fmt.Sprint(ts), "X-Gateway-Signature": tanda}
		if in.TanpaTanda {
			kepala = map[string]string{}
		}
		if in.PutusBalasan {
			hasil[i] = g.kirimPutus(body, kepala)
			return
		}
		req, _ := http.NewRequest(http.MethodPost, g.webhook, strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		for k, v := range kepala {
			req.Header.Set(k, v)
		}
		resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
		if err != nil {
			hasil[i] = "galat: " + err.Error()
			return
		}
		defer resp.Body.Close()
		var isi struct {
			Hasil string `json:"hasil"`
		}
		json.NewDecoder(resp.Body).Decode(&isi)
		hasil[i] = fmt.Sprintf("%d %s", resp.StatusCode, isi.Hasil)
	}
	if in.Serentak {
		var wg sync.WaitGroup
		for i := 0; i < in.Kali; i++ {
			wg.Add(1)
			go func() { defer wg.Done(); kirim(i) }()
		}
		wg.Wait()
	} else {
		for i := 0; i < in.Kali; i++ {
			kirim(i)
		}
	}
	tulis(w, 200, map[string]any{"hasil": hasil})
}

// kirimPutus: balasan hilang di jalan. Permintaan dikirim utuh lewat soket mentah, gateway menunggu sampai byte
// pertama balasan tiba (tanda Rekeningo sudah selesai dan COMMIT), lalu menutup koneksi tanpa membaca isinya. Gateway
// menganggap kiriman itu belum dijawab dan akan mengulangnya dengan event_id yang sama.
func (g *gateway) kirimPutus(body []byte, kepala map[string]string) string {
	u, err := url.Parse(g.webhook)
	if err != nil {
		return "galat: " + err.Error()
	}
	c, err := net.DialTimeout("tcp", u.Host, 5*time.Second)
	if err != nil {
		return "galat: " + err.Error()
	}
	defer c.Close()
	var b strings.Builder
	fmt.Fprintf(&b, "POST %s HTTP/1.1\r\nHost: %s\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n", u.Path, u.Host, len(body))
	for k, v := range kepala {
		fmt.Fprintf(&b, "%s: %s\r\n", k, v)
	}
	b.WriteString("\r\n")
	b.Write(body)
	c.SetDeadline(time.Now().Add(10 * time.Second))
	if _, err := c.Write([]byte(b.String())); err != nil {
		return "galat: " + err.Error()
	}
	if _, err := bufio.NewReader(c).Peek(1); err != nil {
		return "galat: " + err.Error()
	}
	return "koneksi diputus sesudah balasan mulai datang"
}

// --- layanan verifikasi identitas ---

type verifikasi struct {
	mu         sync.Mutex
	m          mode
	objek      map[string]string // Idempotency-Key -> referensi_vendor
	permintaan int
}

func (v *verifikasi) rute() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /lab/mode", v.m.pasang)
	mux.HandleFunc("POST /lab/reset", func(w http.ResponseWriter, r *http.Request) {
		v.mu.Lock()
		v.objek, v.permintaan = map[string]string{}, 0
		v.mu.Unlock()
		v.m.mu.Lock()
		v.m.nama, v.m.ms = "", 0
		v.m.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /lab/diterima", func(w http.ResponseWriter, r *http.Request) {
		v.mu.Lock()
		defer v.mu.Unlock()
		tulis(w, 200, map[string]int{"permintaan": v.permintaan, "objek": len(v.objek)})
	})
	mux.HandleFunc("POST /verifikasi", v.proses)
	return mux
}

// proses: satu objek per Idempotency-Key. Mode: mati (503), lambat (tidur ms), menggantung, setengah (tubuh
// jawaban terpotong lalu koneksi ditutup), ditolak (jawaban sah: status ditolak).
func (v *verifikasi) proses(w http.ResponseWriter, r *http.Request) {
	v.mu.Lock()
	v.permintaan++
	v.mu.Unlock()
	nama, _ := v.m.ambil()
	if gangguan(&v.m, w, r) {
		return
	}
	k := r.Header.Get("Idempotency-Key")
	var in struct {
		Referensi string `json:"referensi"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || k == "" || in.Referensi == "" {
		http.Error(w, "butuh Idempotency-Key dan {referensi}", http.StatusBadRequest)
		return
	}
	v.mu.Lock()
	ref, ada := v.objek[k]
	if !ada {
		ref = fmt.Sprintf("VND-%04d", len(v.objek)+1)
		v.objek[k] = ref
	}
	v.mu.Unlock()
	status := "lulus"
	if nama == "ditolak" {
		status = "ditolak"
	}
	if nama == "setengah" {
		hj, ok := w.(http.Hijacker)
		if !ok {
			return
		}
		c, buf, err := hj.Hijack()
		if err != nil {
			return
		}
		fmt.Fprintf(buf, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 200\r\n\r\n{\"referensi_vendor\":\"%s\",", ref)
		buf.Flush()
		c.Close()
		return
	}
	tulis(w, 200, map[string]string{"referensi_vendor": ref, "status": status})
}
