// Generator beban berjadwal untuk lab api-t4 (`make beban`, M39, naskah bagian 3). Kedatangan tetap (open loop):
// permintaan ke-i berangkat pada waktu mulai + i ÷ rps, tidak menunggu jawaban permintaan sebelumnya. Itu yang
// membuat antrean terlihat: client yang menunggu jawaban (closed loop) memperlambat dirinya sendiri dan menyembunyikan
// pool yang penuh. Di sisi database generator menyampel pg_stat_activity tiap 100 ms untuk koneksi milik api-t4.
//
// Sesi dibuat langsung di tabel sesi sebagai pemilik schema (data lab): POST /login dibatasi 10 percobaan per
// alamat (ADR 20), jadi 200 login dari satu alamat tidak mungkin dan bukan itu yang diukur.
//
// Keluaran: satu objek JSON di stdout. Nilai mentah (waktu, jumlah koneksi) bergantung mesin; lab (run.py)
// memeriksanya terhadap batas dan tidak merekamnya sebagai nilai tunggal. Ini BUKAN uji kapasitas produksi.
package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	mrand "math/rand/v2"
	"net/http"
	"os"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	url := flag.String("url", "http://127.0.0.1:"+portLab(18280), "alamat api-t4")
	dsn := flag.String("db", "", "DSN pemilik schema (membuat sesi dan menyampel pg_stat_activity)")
	aplikasi := flag.String("aplikasi", "api-t4", "application_name koneksi api-t4 yang disampel")
	rps := flag.Float64("rps", 138.9, "permintaan per detik (kedatangan tetap)")
	detik := flag.Int("detik", 20, "lama beban, detik")
	pengguna := flag.Int("pengguna", 200, "jumlah karyawan yang dipakai (karyawan10001..)")
	flag.String("password", "", "tidak dipakai (sesi dibuat langsung); ada supaya perintah sama dengan run.py lama")
	flag.Parse()
	if *dsn == "" {
		log.Fatal("-db wajib")
	}
	db, err := sql.Open("pgx", *dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Sesi per pengguna.
	token := make([]string, *pengguna)
	akun := make([]int64, *pengguna)
	for i := range token {
		b := make([]byte, 24)
		rand.Read(b)
		token[i] = "beban-" + hex.EncodeToString(b)
		akun[i] = int64(10001 + i)
		h := sha256.Sum256([]byte(token[i]))
		if _, err := db.Exec(`INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES ($1, $2, now() + interval '1 hour')`,
			hex.EncodeToString(h[:]), akun[i]); err != nil {
			log.Fatalf("sesi %d: %v", i, err)
		}
	}
	warung := []int{505, 506, 507, 508, 509, 510, 511, 512, 513}

	klien := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: 512, MaxIdleConns: 512}}
	rng := mrand.New(mrand.NewPCG(1, 2)) // benih tetap: campuran permintaan sama di setiap run
	total := int(*rps * float64(*detik))

	// Sampler koneksi.
	var koneksiMaks, aktifMaks atomic.Int64
	berhenti := make(chan struct{})
	var sg sync.WaitGroup
	sg.Add(1)
	go func() {
		defer sg.Done()
		sampler, err := sql.Open("pgx", *dsn)
		if err != nil {
			return
		}
		defer sampler.Close()
		sampler.SetMaxOpenConns(1)
		for {
			select {
			case <-berhenti:
				return
			case <-time.After(100 * time.Millisecond):
			}
			var n, a int64
			if sampler.QueryRow(`SELECT count(*), count(*) FILTER (WHERE state = 'active') FROM pg_stat_activity
				WHERE application_name = $1 AND pid <> pg_backend_pid()`, *aplikasi).Scan(&n, &a) == nil {
				for old := koneksiMaks.Load(); n > old && !koneksiMaks.CompareAndSwap(old, n); old = koneksiMaks.Load() {
				}
				for old := aktifMaks.Load(); a > old && !aktifMaks.CompareAndSwap(old, a); old = aktifMaks.Load() {
				}
			}
		}
	}()

	var mu sync.Mutex
	status := map[string]int{}
	lat := make([]float64, 0, total)
	var lagMaks atomic.Int64
	var wg sync.WaitGroup
	mulai := time.Now().Add(300 * time.Millisecond)
	for i := 0; i < total; i++ {
		jadwal := mulai.Add(time.Duration(float64(i) / *rps * float64(time.Second)))
		time.Sleep(time.Until(jadwal))
		if lag := time.Since(jadwal).Milliseconds(); lag > lagMaks.Load() {
			lagMaks.Store(lag)
		}
		u := rng.IntN(*pengguna)
		jenis := rng.IntN(100)
		ke := warung[rng.IntN(len(warung))]
		wg.Add(1)
		go func() {
			defer wg.Done()
			var req *http.Request
			switch {
			case jenis < 50:
				req, _ = http.NewRequest("GET", fmt.Sprintf("%s/akun/%d", *url, akun[u]), nil)
			case jenis < 75:
				req, _ = http.NewRequest("GET", fmt.Sprintf("%s/akun/%d/riwayat?batas=20", *url, akun[u]), nil)
			case jenis < 90:
				req, _ = http.NewRequest("GET", *url+"/katalog", nil)
			default:
				req, _ = http.NewRequest("POST", *url+"/transfers",
					bytes.NewReader([]byte(fmt.Sprintf(`{"ke":%d,"nominal":1000}`, ke))))
				req.Header.Set("Content-Type", "application/json")
			}
			req.Header.Set("Authorization", "Bearer "+token[u])
			t0 := time.Now()
			resp, err := klien.Do(req)
			ms := float64(time.Since(t0).Microseconds()) / 1000
			kode := "galat"
			if err == nil {
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				kode = fmt.Sprint(resp.StatusCode)
			}
			mu.Lock()
			status[kode]++
			lat = append(lat, ms)
			mu.Unlock()
		}()
	}
	wg.Wait()
	close(berhenti)
	sg.Wait()

	sort.Float64s(lat)
	pct := func(p float64) float64 {
		if len(lat) == 0 {
			return 0
		}
		return lat[min(len(lat)-1, int(p*float64(len(lat))))]
	}
	json.NewEncoder(os.Stdout).Encode(map[string]any{
		"dijadwalkan": total, "selesai": len(lat), "status": status,
		"p50_ms": pct(0.50), "p95_ms": pct(0.95), "p99_ms": pct(0.99), "maks_ms": lat[len(lat)-1],
		"lag_maks_ms": lagMaks.Load(), "koneksi_maks": koneksiMaks.Load(), "aktif_maks": aktifMaks.Load(),
	})
	_ = context.Background
}
