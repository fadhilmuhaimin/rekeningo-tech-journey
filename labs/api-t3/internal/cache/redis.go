package cache

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"time"
)

// Redis adalah klien RESP2 minimal (GET, SET PX, DEL, SCAN) untuk lab. Sengaja bukan go-redis: lab tidak menambah
// dependency tanpa ADR, dan untuk produksi yang dirujuk adalah go-redis (R3-12). Satu koneksi TCP per operasi, tanpa
// pool dan tanpa retry. `Batas` memagari dial, tulis, dan baca sekaligus (go-redis bawaannya 5 detik, R3-12):
// Redis yang mati atau menggantung membuat satu operasi paling lama `Batas`, lalu galat.
type Redis struct {
	Alamat string
	Batas  time.Duration
}

// ErrRedis: Redis menjawab galat (awalan "-" di RESP).
type ErrRedis string

func (e ErrRedis) Error() string { return "redis: " + string(e) }

func (r Redis) perintah(ctx context.Context, arg ...string) (any, error) {
	d := net.Dialer{Timeout: r.Batas}
	c, err := d.DialContext(ctx, "tcp", r.Alamat)
	if err != nil {
		return nil, err
	}
	defer c.Close()
	if err := c.SetDeadline(time.Now().Add(r.Batas)); err != nil {
		return nil, err
	}
	w := bufio.NewWriter(c)
	fmt.Fprintf(w, "*%d\r\n", len(arg))
	for _, a := range arg {
		fmt.Fprintf(w, "$%d\r\n%s\r\n", len(a), a)
	}
	if err := w.Flush(); err != nil {
		return nil, err
	}
	return bacaRESP(bufio.NewReader(c))
}

func bacaRESP(br *bufio.Reader) (any, error) {
	baris, err := br.ReadString('\n')
	if err != nil {
		return nil, err
	}
	if len(baris) < 3 || baris[len(baris)-2] != '\r' {
		return nil, errors.New("redis: baris RESP tanpa CRLF")
	}
	isi := baris[1 : len(baris)-2]
	switch baris[0] {
	case '+':
		return isi, nil
	case '-':
		return nil, ErrRedis(isi)
	case ':':
		return strconv.ParseInt(isi, 10, 64)
	case '$':
		n, err := strconv.Atoi(isi)
		if err != nil {
			return nil, err
		}
		if n < 0 {
			return nil, nil
		}
		b := make([]byte, n+2)
		if _, err := io.ReadFull(br, b); err != nil {
			return nil, err
		}
		return b[:n], nil
	case '*':
		n, err := strconv.Atoi(isi)
		if err != nil {
			return nil, err
		}
		if n < 0 {
			return nil, nil
		}
		out := make([]any, n)
		for i := range out {
			if out[i], err = bacaRESP(br); err != nil {
				return nil, err
			}
		}
		return out, nil
	}
	return nil, fmt.Errorf("redis: tipe RESP %q tidak dikenal", baris[0])
}

func (r Redis) Ambil(ctx context.Context, kunci string) ([]byte, bool, error) {
	v, err := r.perintah(ctx, "GET", kunci)
	if err != nil {
		return nil, false, err
	}
	if v == nil {
		return nil, false, nil
	}
	b, ok := v.([]byte)
	if !ok {
		return nil, false, fmt.Errorf("redis: GET mengembalikan %T", v)
	}
	return b, true, nil
}

func (r Redis) Simpan(ctx context.Context, kunci string, nilai []byte, ttl time.Duration) error {
	_, err := r.perintah(ctx, "SET", kunci, string(nilai), "PX", strconv.FormatInt(ttl.Milliseconds(), 10))
	return err
}

func (r Redis) Hapus(ctx context.Context, kunci string) (int, error) {
	v, err := r.perintah(ctx, "DEL", kunci)
	if err != nil {
		return 0, err
	}
	n, ok := v.(int64)
	if !ok {
		return 0, fmt.Errorf("redis: DEL mengembalikan %T", v)
	}
	return int(n), nil
}

// HapusAwalan: SCAN dengan MATCH awalan*, lalu DEL. Awalan tidak boleh berisi karakter glob (* ? [ ] \); kunci
// katalog hanya berisi huruf kecil, angka, dan titik dua.
func (r Redis) HapusAwalan(ctx context.Context, awalan string) (int, error) {
	kursor, total := "0", 0
	for {
		v, err := r.perintah(ctx, "SCAN", kursor, "MATCH", awalan+"*", "COUNT", "200")
		if err != nil {
			return total, err
		}
		a, ok := v.([]any)
		if !ok || len(a) != 2 {
			return total, errors.New("redis: jawaban SCAN tidak dikenal")
		}
		kb, ok1 := a[0].([]byte)
		daftar, ok2 := a[1].([]any)
		if !ok1 || !ok2 {
			return total, errors.New("redis: jawaban SCAN tidak dikenal")
		}
		if len(daftar) > 0 {
			arg := []string{"DEL"}
			for _, d := range daftar {
				b, _ := d.([]byte)
				arg = append(arg, string(b))
			}
			n, err := r.perintah(ctx, arg...)
			if err != nil {
				return total, err
			}
			if jml, ok := n.(int64); ok {
				total += int(jml)
			}
		}
		kursor = string(kb)
		if kursor == "0" {
			return total, nil
		}
	}
}
