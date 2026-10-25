// Lab B8 · Go: 10 notifikasi ke layanan tiruan (500 ms per kiriman), lalu server yang tetap responsif saat ada kerja CPU.
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"sync"
	"time"
)

func kirim() {
	res, err := http.Post("http://127.0.0.1:"+portLab(18090)+"/kirim", "application/json", nil)
	if err == nil {
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
	}
}

// --8<-- [start:paralel]
func berurutan(n int) {
	for i := 0; i < n; i++ {
		kirim()
	}
}

func paralel(n int) {
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); kirim() }() // satu goroutine per kiriman
	}
	wg.Wait()
}

func dibatasi(n, maks int) {
	var wg sync.WaitGroup
	slot := make(chan struct{}, maks) // semaphore: paling banyak `maks` kiriman bersamaan
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			slot <- struct{}{}
			defer func() { <-slot }()
			kirim()
		}()
	}
	wg.Wait()
}

// --8<-- [end:paralel]

// --8<-- [start:leak]
// Goroutine leak: hasil dikirim ke channel yang tidak pernah dibaca, jadi goroutine menunggu selamanya.
func cariDenganBatasWaktu() {
	hasil := make(chan string) // tanpa buffer
	go func() { time.Sleep(50 * time.Millisecond); hasil <- "selesai" }()
	select {
	case <-hasil:
	case <-time.After(10 * time.Millisecond): // pemanggil menyerah duluan
	}
}

// --8<-- [end:leak]

func ukur(nama string, f func()) {
	t := time.Now()
	f()
	fmt.Printf("%-28s %6.2f detik\n", nama, time.Since(t).Seconds())
}

func main() {
	fmt.Println("# Go", runtime.Version(), "· 10 notifikasi, layanan tiruan 500 ms per kiriman")
	ukur("berurutan", func() { berurutan(10) })
	ukur("paralel (10 goroutine)", func() { paralel(10) })
	ukur("dibatasi 3 bersamaan", func() { dibatasi(10, 3) })

	fmt.Println("\n# goroutine leak: 1.000 kali memanggil fungsi yang menyerah setelah 10 ms")
	fmt.Println("goroutine sebelum:", runtime.NumGoroutine())
	for i := 0; i < 1000; i++ {
		cariDenganBatasWaktu()
	}
	time.Sleep(100 * time.Millisecond)
	fmt.Println("goroutine sesudah:", runtime.NumGoroutine())

}

// Server untuk uji kerja CPU, dijalankan sebagai proses terpisah: go run . server
func init() {
	if len(os.Args) > 1 && os.Args[1] == "server" {
		http.HandleFunc("/cpu", func(w http.ResponseWriter, r *http.Request) {
			akhir := time.Now().Add(time.Second)
			for time.Now().Before(akhir) { // kerja CPU 1 detik
			}
		})
		http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {})
		if err := http.ListenAndServe("127.0.0.1:"+portLab(18091), nil); err != nil {
			fmt.Fprintln(os.Stderr, "GAGAL:", err)
			os.Exit(1)
		}
	}
}
