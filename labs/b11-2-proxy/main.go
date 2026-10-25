// Lab B11.2 · proxy ke layanan eksternal, file lewat proxy vs signed URL, dan BFF.
// Semua komponen tiruan, nama netral. Credential dan secret di file ini hanya untuk lab.
//
//	b112 layanan  layanan verifikasi identitas tiruan :18111 (hanya menerima X-Kredensial yang benar). LAMBAT=detik
//	b112 proxy    proxy verifikasi Go :18112. TIMEOUT=detik (0 = tanpa timeout)
//	b112 storage  object storage tiruan :18113 (hanya melayani signed URL)
//	b112 api      Monolith API :18114: /bukti (proxy file dan signed URL), /beranda (BFF) dan 5 endpoint bagiannya
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const kredensial = "kred-lab-123" // hanya dipegang proxy, tidak pernah ada di app
var rahasiaStorage = []byte("rahasia-storage-lab")

// stempel menulis waktu tulis (nanodetik) di depan setiap baris log. run.py mengurutkan log beberapa
// proses menurut waktu kejadian ini, bukan menurut kapan baris itu sempat dibaca.
type stempel struct{}

func (stempel) Write(p []byte) (int, error) {
	fmt.Fprintf(os.Stderr, "%d %s", time.Now().UnixNano(), p)
	return len(p), nil
}

func main() {
	log.SetFlags(0)
	log.SetOutput(stempel{})
	map[string]func(){"layanan": layanan, "proxy": proxy, "storage": storage, "api": api}[os.Args[1]]()
}

func tulis(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

// ---- layanan verifikasi identitas tiruan ------------------------------------------------------

func layanan() {
	lambat, _ := strconv.Atoi(os.Getenv("LAMBAT"))
	http.HandleFunc("POST /v2/identity/match", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Kredensial") != kredensial {
			log.Printf("layanan  ditolak: tanpa kredensial yang benar → 401")
			tulis(w, 401, map[string]string{"error": "unauthorized"})
			return
		}
		time.Sleep(time.Duration(lambat) * time.Second)
		log.Printf("layanan  diterima dengan kredensial → 200 (setelah %d detik)", lambat)
		tulis(w, 200, map[string]any{"match": true, "score": 0.97, "ref": "vx-88213"})
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18111), nil))
}

// ---- proxy verifikasi -------------------------------------------------------------------------

func proxy() {
	detik, _ := strconv.Atoi(os.Getenv("TIMEOUT"))
	// --8<-- [start:proxy]
	client := &http.Client{Timeout: time.Duration(detik) * time.Second} // 0 = tanpa timeout
	http.HandleFunc("POST /verifikasi", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-budi" { // lab: token user Rekeningo
			tulis(w, 401, map[string]string{"title": "Token tidak valid"})
			return
		}
		var in struct{ NIK, Nama string }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || len(in.NIK) != 16 {
			tulis(w, 422, map[string]string{"title": "NIK harus 16 digit"})
			return
		}
		body, _ := json.Marshal(map[string]string{"national_id": in.NIK, "full_name": in.Nama})
		req, _ := http.NewRequest("POST", "http://127.0.0.1:"+portLab(18111)+"/v2/identity/match", strings.NewReader(string(body)))
		req.Header.Set("X-Kredensial", kredensial) // credential ditambahkan di sini, bukan di app
		mulai := time.Now()
		res, err := client.Do(req)
		lama := time.Since(mulai).Round(100 * time.Millisecond)
		log.Printf("proxy    audit: user=budi nik=%s… hasil=%v lama=%v", in.NIK[:4], err == nil, lama) // NIK tidak ditulis utuh
		if err != nil {
			tulis(w, 504, map[string]string{"title": "Verifikasi sedang lambat, coba lagi nanti"})
			return
		}
		defer res.Body.Close()
		var out struct{ Match bool }
		json.NewDecoder(res.Body).Decode(&out)
		status := map[bool]string{true: "terverifikasi", false: "tidak_cocok"}[out.Match]
		tulis(w, 200, map[string]string{"status": status}) // format eksternal tidak bocor ke app
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18112), nil))
}

// --8<-- [end:proxy]

// ---- object storage tiruan --------------------------------------------------------------------

func tandaTangan(kunci string, exp int64) string {
	m := hmac.New(sha256.New, rahasiaStorage)
	fmt.Fprintf(m, "%s|%d", kunci, exp)
	return hex.EncodeToString(m.Sum(nil))
}

func storage() {
	isi := map[string][]byte{"bukti/123.jpg": []byte(strings.Repeat("JPEG", 61440))} // 240 KB, pemilik budi
	http.HandleFunc("GET /obj/{kunci...}", func(w http.ResponseWriter, r *http.Request) {
		k := r.PathValue("kunci")
		exp, _ := strconv.ParseInt(r.URL.Query().Get("exp"), 10, 64)
		if !hmac.Equal([]byte(tandaTangan(k, exp)), []byte(r.URL.Query().Get("sig"))) {
			log.Printf("storage  GET %s → 403 signature salah", k)
			tulis(w, 403, map[string]string{"error": "signature_mismatch"})
			return
		}
		if time.Now().UnixMilli() >= exp {
			log.Printf("storage  GET %s → 403 kedaluwarsa", k)
			tulis(w, 403, map[string]string{"error": "expired"})
			return
		}
		log.Printf("storage  GET %s → 200 %d byte", k, len(isi[k]))
		w.Write(isi[k])
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18113), nil))
}

// ---- Monolith API: file dan BFF ---------------------------------------------------------------

func urlBertanda(kunci string, berlaku time.Duration) string {
	// exp dalam milidetik: dengan detik penuh (Unix()), masa berlaku efektif jadi 3–4 detik
	// tergantung pecahan detik saat URL dibuat, dan rekaman 3,5 detik kadang 200, kadang 403.
	exp := time.Now().Add(berlaku).UnixMilli()
	return fmt.Sprintf("http://127.0.0.1:%s/obj/%s?exp=%d&sig=%s", portLab(18113), kunci, exp, tandaTangan(kunci, exp))
}

func api() {
	pemilik := map[string]string{"123": "budi"}
	user := func(r *http.Request) string {
		return strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer token-")
	}

	// Proxy file: cek pemilik di setiap unduhan, lalu teruskan isi dari storage.
	http.HandleFunc("GET /bukti/{id}", func(w http.ResponseWriter, r *http.Request) {
		if pemilik[r.PathValue("id")] != user(r) {
			log.Printf("api      GET /bukti/%s oleh %s → 404 (bukan pemilik)", r.PathValue("id"), user(r))
			tulis(w, 404, map[string]string{"title": "Bukti tidak ditemukan"})
			return
		}
		res, err := http.Get(urlBertanda("bukti/"+r.PathValue("id")+".jpg", 10*time.Second))
		if err != nil {
			tulis(w, 502, map[string]string{"title": "Storage tidak bisa dihubungi"})
			return
		}
		defer res.Body.Close()
		n, _ := io.Copy(w, res.Body)
		log.Printf("api      GET /bukti/%s oleh %s → 200, %d byte lewat API", r.PathValue("id"), user(r), n)
	})
	// Signed URL: cek pemilik sekali, lalu app mengunduh langsung dari storage.
	http.HandleFunc("GET /bukti/{id}/url", func(w http.ResponseWriter, r *http.Request) {
		if pemilik[r.PathValue("id")] != user(r) {
			tulis(w, 404, map[string]string{"title": "Bukti tidak ditemukan"})
			return
		}
		log.Printf("api      GET /bukti/%s/url oleh %s → URL berlaku 3 detik", r.PathValue("id"), user(r))
		tulis(w, 200, map[string]string{"url": urlBertanda("bukti/"+r.PathValue("id")+".jpg", 3*time.Second)})
	})

	// Lima bagian layar beranda. Kerja tiap bagian ditiru 40 ms (asumsi lab).
	bagian := map[string]any{
		"saldo":      map[string]any{"saldo": 250000},
		"pesanan":    []map[string]any{{"id": 812, "toko": "Warung Ani", "status": "disiapkan"}},
		"promo":      []map[string]any{{"judul": "Cashback 10% di Warung Ani", "berlaku": "2026-10-31"}},
		"notifikasi": map[string]any{"belum_dibaca": 3},
		"profil":     map[string]any{"nama": "Budi", "terverifikasi": true},
	}
	for nama, isi := range bagian {
		http.HandleFunc("GET /"+nama, func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(40 * time.Millisecond)
			tulis(w, 200, isi)
		})
	}
	// --8<-- [start:bff]
	http.HandleFunc("GET /beranda", func(w http.ResponseWriter, r *http.Request) {
		hasil := map[string]any{}
		var mu sync.Mutex
		var wg sync.WaitGroup
		for nama, isi := range bagian { // lima bagian diambil bersamaan, bukan berurutan
			wg.Go(func() {
				time.Sleep(40 * time.Millisecond) // kerja yang sama dengan endpoint bagian
				mu.Lock()
				hasil[nama] = isi
				mu.Unlock()
			})
		}
		wg.Wait()
		tulis(w, 200, hasil)
	})
	// --8<-- [end:bff]
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18114), nil))
}
