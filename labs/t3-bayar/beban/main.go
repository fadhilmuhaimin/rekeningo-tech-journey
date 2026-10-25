// Generator beban: RPS tetap (open model) selama DURASI, timeout client 5 detik.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"
)

func main() {
	rps := flag.Int("rps", 17, "request per detik")
	durasi := flag.Duration("durasi", 10*time.Second, "lama beban")
	flag.Parse()
	client := &http.Client{Timeout: 5 * time.Second}
	var mu sync.Mutex
	var lat []time.Duration
	status := map[string]int{}
	var wg sync.WaitGroup
	rng := rand.New(rand.NewSource(7))
	tick := time.NewTicker(time.Second / time.Duration(*rps))
	selesai := time.After(*durasi)
loop:
	for {
		select {
		case <-selesai:
			break loop
		case <-tick.C:
			akun := 1 + rng.Intn(5000)
			wg.Add(1)
			go func() {
				defer wg.Done()
				t := time.Now()
				res, err := client.Post("http://127.0.0.1:"+portLab(18083)+"/bayar", "application/json",
					bytes.NewBufferString(fmt.Sprintf(`{"akun_id":%d,"jumlah":25000}`, akun)))
				d := time.Since(t)
				mu.Lock()
				defer mu.Unlock()
				if err != nil {
					status["timeout (5 s)"]++
					return
				}
				res.Body.Close()
				status[fmt.Sprint(res.StatusCode)]++
				lat = append(lat, d)
			}()
		}
	}
	wg.Wait()
	sort.Slice(lat, func(i, j int) bool { return lat[i] < lat[j] })
	p := func(q float64) string {
		if len(lat) == 0 {
			return "-"
		}
		return lat[int(q*float64(len(lat)-1))].Round(time.Millisecond).String()
	}
	total := 0
	for _, n := range status {
		total += n
	}
	fmt.Printf("beban: %d request/detik selama %s → %d request\n", *rps, *durasi, total)
	fmt.Printf("hasil: %v\n", status)
	fmt.Printf("latency yang dijawab: p50 %s · p95 %s · maks %s\n", p(0.5), p(0.95), p(1))
}
