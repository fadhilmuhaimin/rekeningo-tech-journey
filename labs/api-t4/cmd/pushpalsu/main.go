// Layanan push tiruan untuk lab api-t4 (warisan api-t3, Tahap 3). Hanya di localhost, tanpa kredensial: pihak ketiga di lab selalu
// tiruan lokal. Bentuknya sengaja mirip FCM v1 (R3-16): satu POST per pesan ke satu token, 404 untuk token yang
// tidak terdaftar. Perilakunya diatur lewat POST /lab/mode, supaya lab bisa menjalankan keadaan yang sama berulang:
//
//	jawab    langsung 200
//	lambat   200 sesudah `ms` milidetik
//	gantung  menerima koneksi dan permintaan, tidak pernah menjawab (M18)
//	503      503 (layanan tidak tersedia)
//
// "kali" membatasi berapa permintaan pertama yang mengikuti mode itu; sesudahnya kembali ke jawab. Token berawalan
// "mati-" selalu dijawab 404 (token tidak terdaftar). Setiap permintaan yang diterima dicatat sebelum dijawab, jadi
// permintaan yang menggantung ikut terhitung.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type terima struct {
	Urutan       int    `json:"urutan"`
	NotifikasiID string `json:"notifikasi_id"`
	Token        string `json:"token"`
}

type layanan struct {
	mu          sync.Mutex
	mode        string
	ms          int
	sisa        int // permintaan yang masih mengikuti mode; 0 = tanpa batas
	diterima    []terima
	menggantung atomic.Int64
}

func (l *layanan) pilihMode() (string, int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	mode, ms := l.mode, l.ms
	if l.sisa > 0 {
		if l.sisa--; l.sisa == 0 {
			l.mode, l.ms = "jawab", 0
		}
	}
	return mode, ms
}

func main() {
	alamat := flag.String("addr", "127.0.0.1:"+portLab(18281), "alamat server")
	flag.Parse()
	l := &layanan{mode: "jawab"}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/pesan", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token        string `json:"token"`
			NotifikasiID string `json:"notifikasi_id"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || in.Token == "" {
			http.Error(w, `{"error":{"status":"INVALID_ARGUMENT"}}`, http.StatusBadRequest)
			return
		}
		l.mu.Lock()
		l.diterima = append(l.diterima, terima{len(l.diterima) + 1, in.NotifikasiID, in.Token})
		n := len(l.diterima)
		l.mu.Unlock()
		if strings.HasPrefix(in.Token, "mati-") {
			http.Error(w, `{"error":{"status":"UNREGISTERED"}}`, http.StatusNotFound)
			return
		}
		mode, ms := l.pilihMode()
		switch mode {
		case "lambat":
			time.Sleep(time.Duration(ms) * time.Millisecond)
		case "gantung":
			l.menggantung.Add(1)
			defer l.menggantung.Add(-1)
			select {
			case <-r.Context().Done(): // client menyerah
			case <-time.After(10 * time.Minute):
			}
			return
		case "503":
			http.Error(w, `{"error":{"status":"UNAVAILABLE"}}`, http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"name":"pesan/%d"}`, n)
	})
	mux.HandleFunc("POST /lab/mode", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Mode string `json:"mode"`
			Ms   int    `json:"ms"`
			Kali int    `json:"kali"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || (in.Mode != "jawab" && in.Mode != "lambat" && in.Mode != "gantung" && in.Mode != "503") {
			http.Error(w, "mode: jawab, lambat, gantung, atau 503", http.StatusBadRequest)
			return
		}
		l.mu.Lock()
		l.mode, l.ms, l.sisa = in.Mode, in.Ms, in.Kali
		l.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /lab/reset", func(w http.ResponseWriter, r *http.Request) {
		l.mu.Lock()
		l.mode, l.ms, l.sisa, l.diterima = "jawab", 0, 0, nil
		l.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /lab/diterima", func(w http.ResponseWriter, r *http.Request) {
		l.mu.Lock()
		defer l.mu.Unlock()
		per := map[string]int{}
		for _, t := range l.diterima {
			per[t.NotifikasiID]++
		}
		ganda := 0
		for _, n := range per {
			if n > 1 {
				ganda++
			}
		}
		out := map[string]any{"jumlah": len(l.diterima), "notifikasi_berbeda": len(per), "notifikasi_ganda": ganda,
			"menggantung": l.menggantung.Load()}
		if r.URL.Query().Get("daftar") == "1" {
			out["daftar"] = l.diterima
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
	})
	log.Printf("pushpalsu mendengar di %s", *alamat)
	log.Fatal(http.ListenAndServe(*alamat, mux))
}
