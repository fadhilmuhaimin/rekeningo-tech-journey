// Perintah gabung: semua proses lab t5-gabung dalam satu biner.
//
//	gabung satu      -alamat A                       versi satu proses
//	gabung antrean   -alamat A                       broker antrean tiruan
//	gabung masuk     -alamat A -antrean URL          proses 1 dari versi tiga proses
//	gabung perangkat -alamat A -antrean URL          proses 2
//	gabung riwayat   -alamat A -antrean URL          proses 3
//	gabung beban     -url URL/skor -n N              penggerak beban berurutan, mencetak JSON ringkasan
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"syscall"
	"time"

	"lab/t5gabung/antrean"
	"lab/t5gabung/layanan"
	"lab/t5gabung/skor"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "pakai: gabung satu|antrean|masuk|perangkat|riwayat|beban [flag]")
		os.Exit(2)
	}
	var err error
	switch os.Args[1] {
	case "satu":
		err = jalankanSatu(os.Args[2:])
	case "antrean":
		err = jalankanAntrean(os.Args[2:])
	case "masuk":
		err = jalankanMasuk(os.Args[2:])
	case "perangkat":
		err = jalankanTahap(os.Args[2:], "perangkat")
	case "riwayat":
		err = jalankanTahap(os.Args[2:], "riwayat")
	case "beban":
		err = jalankanBeban(os.Args[2:])
	default:
		err = fmt.Errorf("perintah tidak dikenal: %s", os.Args[1])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "gabung:", err)
		os.Exit(1)
	}
}

// layani menjalankan server sampai SIGINT atau SIGTERM, lalu menutupnya dengan batas 2 detik.
func layani(ctx context.Context, alamat string, h http.Handler) error {
	srv := &http.Server{Addr: alamat, Handler: h, ReadHeaderTimeout: 5 * time.Second}
	selesai := make(chan error, 1)
	go func() { selesai <- srv.ListenAndServe() }()
	select {
	case err := <-selesai:
		return err
	case <-ctx.Done():
		c, batal := context.WithTimeout(context.Background(), 2*time.Second)
		defer batal()
		return srv.Shutdown(c)
	}
}

func sinyal() (context.Context, context.CancelFunc) {
	return signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
}

func jalankanSatu(args []string) error {
	fs := flag.NewFlagSet("satu", flag.ExitOnError)
	alamat := fs.String("alamat", "", "alamat dengar, mis. 127.0.0.1:PORT")
	_ = fs.Parse(args)
	if *alamat == "" {
		return errors.New("-alamat wajib")
	}
	ctx, batal := sinyal()
	defer batal()
	return layani(ctx, *alamat, (&layanan.Satu{Toko: skor.NewToko()}).Handler())
}

func jalankanAntrean(args []string) error {
	fs := flag.NewFlagSet("antrean", flag.ExitOnError)
	alamat := fs.String("alamat", "", "alamat dengar")
	_ = fs.Parse(args)
	if *alamat == "" {
		return errors.New("-alamat wajib")
	}
	ctx, batal := sinyal()
	defer batal()
	return layani(ctx, *alamat, antrean.NewBroker().Handler())
}

func jalankanMasuk(args []string) error {
	fs := flag.NewFlagSet("masuk", flag.ExitOnError)
	alamat := fs.String("alamat", "", "alamat dengar")
	url := fs.String("antrean", "", "URL broker, mis. http://127.0.0.1:PORT")
	batas := fs.Duration("batas", 5*time.Second, "batas tunggu hasil per permintaan")
	_ = fs.Parse(args)
	if *alamat == "" || *url == "" {
		return errors.New("-alamat dan -antrean wajib")
	}
	ctx, batal := sinyal()
	defer batal()
	m := layanan.NewMasuk(antrean.NewKlien(*url), skor.NewTokoAkun(), *batas)
	m.JalankanHasil(ctx, 2)
	return layani(ctx, *alamat, m.Handler())
}

func jalankanTahap(args []string, nama string) error {
	fs := flag.NewFlagSet(nama, flag.ExitOnError)
	alamat := fs.String("alamat", "", "alamat dengar (hanya GET /metrik)")
	url := fs.String("antrean", "", "URL broker")
	_ = fs.Parse(args)
	if *alamat == "" || *url == "" {
		return errors.New("-alamat dan -antrean wajib")
	}
	ctx, batal := sinyal()
	defer batal()
	k := antrean.NewKlien(*url)
	var t *layanan.Tahap
	if nama == "perangkat" {
		t = layanan.NewPerangkat(k, skor.NewTokoPerangkat())
	} else {
		t = layanan.NewRiwayat(k, skor.NewTokoRiwayat())
	}
	t.Jalankan(ctx, 2)
	return layani(ctx, *alamat, t.Handler())
}

// ringkasan adalah keluaran penggerak beban.
type ringkasan struct {
	N      int               `json:"n"`
	P50us  int64             `json:"p50_us"`
	P95us  int64             `json:"p95_us"`
	Maksus int64             `json:"maks_us"`
	Gagal  int               `json:"gagal"`
	Lebih  int               `json:"lebih_dari_anggaran"` // transaksi yang lebih lama dari -anggaran-ms
	Hasil  []layanan.Jawaban `json:"hasil"`
}

// persentil memakai nearest-rank: nilai ke-ceil(p × n) dari data terurut.
func persentil(terurut []int64, p float64) int64 {
	if len(terurut) == 0 {
		return 0
	}
	idx := int(math.Ceil(float64(len(terurut))*p-1e-9)) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(terurut) {
		idx = len(terurut) - 1
	}
	return terurut[idx]
}

func jalankanBeban(args []string) error {
	fs := flag.NewFlagSet("beban", flag.ExitOnError)
	url := fs.String("url", "", "URL lengkap POST /skor")
	n := fs.Int("n", 200, "jumlah transaksi terukur, berurutan satu per satu")
	pemanasan := fs.Int("pemanasan", 20, "transaksi pemanasan, tidak diukur dan tidak dicetak")
	mulai := fs.Int("mulai", 0, "nomor transaksi pertama yang terukur")
	anggaran := fs.Int("anggaran-ms", 50, "anggaran waktu satu transaksi (ms), untuk menghitung yang melebihinya")
	_ = fs.Parse(args)
	if *url == "" {
		return errors.New("-url wajib")
	}
	klien := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: 1}}
	kirimSatu := func(i int) (layanan.Jawaban, time.Duration, error) {
		isi, _ := json.Marshal(skor.Transaksi(i))
		t0 := time.Now()
		resp, err := klien.Post(*url, "application/json", bytes.NewReader(isi))
		if err != nil {
			return layanan.Jawaban{}, 0, err
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		d := time.Since(t0)
		var j layanan.Jawaban
		if err := json.Unmarshal(b, &j); err != nil {
			return j, d, err
		}
		if resp.StatusCode != http.StatusOK {
			j.Galat = fmt.Sprintf("status %d: %s", resp.StatusCode, j.Galat)
		}
		return j, d, nil
	}
	for i := 0; i < *pemanasan; i++ {
		if _, _, err := kirimSatu(1_000_000 + i); err != nil {
			return fmt.Errorf("pemanasan: %w", err)
		}
	}
	r := ringkasan{N: *n, Hasil: make([]layanan.Jawaban, 0, *n)}
	lat := make([]int64, 0, *n)
	for i := 0; i < *n; i++ {
		j, d, err := kirimSatu(*mulai + i)
		if err != nil {
			return fmt.Errorf("transaksi %d: %w", *mulai+i, err)
		}
		if j.Galat != "" {
			r.Gagal++
		}
		r.Hasil = append(r.Hasil, j)
		lat = append(lat, d.Microseconds())
		if d > time.Duration(*anggaran)*time.Millisecond {
			r.Lebih++
		}
	}
	sort.Slice(lat, func(a, b int) bool { return lat[a] < lat[b] })
	r.P50us, r.P95us, r.Maksus = persentil(lat, 0.50), persentil(lat, 0.95), lat[len(lat)-1]
	return json.NewEncoder(os.Stdout).Encode(r)
}
