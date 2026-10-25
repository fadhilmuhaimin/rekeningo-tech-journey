// Layanan notifikasi tiruan: setiap kiriman butuh JEDA (bawaan 2 detik). Mode -gagal-dulu N: N kiriman pertama dijawab 503.
package main

import (
	"flag"
	"log"
	"net/http"
	"sync/atomic"
	"time"
)

func main() {
	jeda := flag.Duration("jeda", 2*time.Second, "lama setiap kiriman")
	gagal := flag.Int64("gagal-dulu", 0, "jumlah kiriman pertama yang dijawab 503")
	flag.Parse()
	var n atomic.Int64
	http.HandleFunc("POST /kirim", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(*jeda)
		if n.Add(1) <= *gagal {
			http.Error(w, "sedang gangguan", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18090), nil))
}
