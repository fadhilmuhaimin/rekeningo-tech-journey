// Lab B11 · memanggil payment gateway yang lambat atau gangguan.
//
//	b11 gateway   payment gateway tiruan di :18101. GW_MODE: lambat (10 detik) | lambat-sekali
//	              (tagihan dibuat, response pertama per key ditahan 3 detik)
//	b11 api       Monolith API di :18102. KEBIJAKAN: tanpa-timeout | timeout | breaker | retry | retry-key-baru
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"
)

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
	switch os.Args[1] {
	case "gateway":
		gateway()
	case "api":
		api()
	}
}

// ---- payment gateway tiruan ------------------------------------------------------------------

func gateway() {
	mode := os.Getenv("GW_MODE")
	var mu sync.Mutex
	tagihan := map[string]string{} // Idempotency-Key -> id tagihan
	http.HandleFunc("POST /charges", func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("Idempotency-Key")
		mu.Lock()
		id, ada := tagihan[key]
		if !ada {
			id = fmt.Sprintf("ch_%d", len(tagihan)+1)
			tagihan[key] = id
		}
		jumlah := len(tagihan)
		mu.Unlock()
		log.Printf("gateway  key %s → %s (%s), total tagihan dibuat: %d", key, id, map[bool]string{true: "tagihan lama", false: "tagihan baru"}[ada], jumlah)
		if mode == "lambat" {
			time.Sleep(10 * time.Second)
		}
		if mode == "lambat-sekali" && !ada {
			time.Sleep(3 * time.Second) // tagihan sudah dibuat, response terlambat
		}
		json.NewEncoder(w).Encode(map[string]string{"id": id, "status": "menunggu_bayar"})
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18101), nil))
}

// ---- Monolith API -----------------------------------------------------------------------------

type breaker struct {
	mu      sync.Mutex
	gagal   int           // gagal berturut-turut
	batas   int           // gagal sebanyak ini → terbuka
	jeda    time.Duration // lama terbuka sebelum mencoba lagi
	terbuka time.Time     // kapan terakhir terbuka
	mencoba bool          // sedang ada satu request percobaan (half-open)
}

var errTerbuka = errors.New("breaker terbuka")

// --8<-- [start:breaker]
func (b *breaker) panggil(f func() error) error {
	b.mu.Lock()
	if b.gagal >= b.batas {
		if time.Since(b.terbuka) < b.jeda || b.mencoba {
			b.mu.Unlock()
			return errTerbuka // gagal cepat, tanpa menyentuh gateway
		}
		b.mencoba = true // jeda habis: biarkan satu request mencoba
	}
	b.mu.Unlock()
	err := f()
	b.mu.Lock()
	defer b.mu.Unlock()
	b.mencoba = false
	if err != nil {
		b.gagal++
		if b.gagal >= b.batas {
			b.terbuka = time.Now()
		}
		return err
	}
	b.gagal = 0
	return nil
}

// --8<-- [end:breaker]

func api() {
	k := os.Getenv("KEBIJAKAN")
	client := &http.Client{Timeout: 2 * time.Second}
	if k == "tanpa-timeout" {
		client = &http.Client{} // bawaan Go: tanpa timeout
	}
	br := &breaker{batas: 3, jeda: 5 * time.Second}
	var jalan atomic.Int32 // request top-up yang sedang menunggu gateway

	buatTagihan := func(key string) (string, error) {
		req, _ := http.NewRequest("POST", "http://127.0.0.1:"+portLab(18101)+"/charges", nil)
		req.Header.Set("Idempotency-Key", key)
		res, err := client.Do(req)
		if err != nil {
			return "", err
		}
		defer res.Body.Close()
		var out struct{ ID string }
		return out.ID, json.NewDecoder(res.Body).Decode(&out)
	}

	http.HandleFunc("POST /topup", func(w http.ResponseWriter, r *http.Request) {
		n := jalan.Add(1)
		defer jalan.Add(-1)
		mulai := time.Now()
		key := r.Header.Get("X-Topup-Id") // dibuat app, lihat halaman retry dan idempotency key
		var id string
		var err error
		switch k {
		case "breaker":
			err = br.panggil(func() (e error) { id, e = buatTagihan(key); return })
		// --8<-- [start:retry]
		case "retry", "retry-key-baru":
			for coba := 1; coba <= 3; coba++ {
				keyKirim := key
				if k == "retry-key-baru" {
					keyKirim = fmt.Sprintf("%s-%d", key, coba) // salah: key baru setiap retry
				}
				if id, err = buatTagihan(keyKirim); err == nil || coba == 3 {
					break
				}
				tunggu := 200 * time.Millisecond << (coba - 1)          // 200, 400, 800 ms
				tunggu += time.Duration(rand.Int64N(int64(tunggu / 2))) // jitter, supaya retry tidak serempak
				log.Printf("api      %s percobaan %d gagal (%v), tunggu %v", key, coba, errSingkat(err), tunggu.Round(time.Millisecond))
				time.Sleep(tunggu)
			}
		// --8<-- [end:retry]
		default:
			id, err = buatTagihan(key)
		}
		lama := time.Since(mulai).Round(10 * time.Millisecond)
		if err != nil {
			log.Printf("api      %s → 503 setelah %v (%v), menunggu gateway saat masuk: %d", key, lama, errSingkat(err), n)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(503)
			json.NewEncoder(w).Encode(map[string]string{"title": "Pembayaran sedang gangguan, coba lagi nanti"})
			return
		}
		log.Printf("api      %s → 202 tagihan %s setelah %v, menunggu gateway saat masuk: %d", key, id, lama, n)
		w.WriteHeader(202)
		json.NewEncoder(w).Encode(map[string]string{"status": "pending", "tagihan": id})
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18102), nil))
}

func errSingkat(err error) string {
	if errors.Is(err, errTerbuka) {
		return "breaker terbuka, gateway tidak dipanggil"
	}
	var t interface{ Timeout() bool }
	if errors.As(err, &t) && t.Timeout() {
		return "timeout 2 detik"
	}
	return err.Error()
}
