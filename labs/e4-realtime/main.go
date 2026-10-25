// Lab E4 · status pesanan: polling vs Server-Sent Events (SSE). Status berubah 7 detik setelah server mulai.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type pesanan struct {
	mu      sync.Mutex
	status  string
	berubah chan struct{} // ditutup saat status berubah
}

func main() {
	p := &pesanan{status: "disiapkan", berubah: make(chan struct{})}
	go func() {
		time.Sleep(7 * time.Second)
		p.mu.Lock()
		p.status = "siap diambil"
		close(p.berubah)
		p.mu.Unlock()
	}()

	// Polling: app bertanya berulang kali.
	http.HandleFunc("GET /pesanan/812", func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		defer p.mu.Unlock()
		json.NewEncoder(w).Encode(map[string]string{"status": p.status})
	})

	// --8<-- [start:sse]
	// SSE: satu koneksi HTTP dibiarkan terbuka, server mengirim saat ada perubahan.
	http.HandleFunc("GET /pesanan/812/stream", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		kirim := func() {
			p.mu.Lock()
			fmt.Fprintf(w, "event: status\ndata: {\"status\":%q}\n\n", p.status)
			p.mu.Unlock()
			w.(http.Flusher).Flush()
		}
		kirim()
		select {
		case <-p.berubah:
			kirim()
		case <-r.Context().Done(): // app menutup koneksi
		}
	})
	// --8<-- [end:sse]
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18093), nil))
}
