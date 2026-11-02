package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var (
	ErrWaktu = errors.New("waktu di luar toleransi")
	ErrTanda = errors.New("tanda tangan tidak cocok")
)

// --8<-- [start:tanda-tangan]
// TandaTangan: HMAC-SHA256 atas "<timestamp>.<METHOD>.<path dan query>.<byte mentah body>", heksadesimal. Pola ADR 34
// (timestamp dan byte mentah) ditambah method dan alamat: permintaan GET tidak punya body, jadi tanda tangan atas
// timestamp dan body saja berlaku untuk GET mana pun dalam jendela waktunya.
func TandaTangan(rahasia string, ts int64, method, uri string, body []byte) string {
	m := hmac.New(sha256.New, []byte(rahasia))
	fmt.Fprintf(m, "%d.%s.%s.", ts, method, uri)
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// PeriksaTanda menerima bila timestamp ada dalam toleransi dari sekarang (ke dua arah) dan tanda tangan cocok.
// Perbandingan dengan hmac.Equal (waktu tetap).
func PeriksaTanda(rahasia string, sekarang time.Time, toleransi time.Duration, timestamp, tanda, method, uri string, body []byte) error {
	ts, err := strconv.ParseInt(strings.TrimSpace(timestamp), 10, 64)
	if err != nil {
		return ErrWaktu
	}
	selisih := sekarang.Sub(time.Unix(ts, 0))
	if selisih < 0 {
		selisih = -selisih
	}
	if selisih > toleransi {
		return ErrWaktu
	}
	diterima, err := hex.DecodeString(strings.TrimSpace(tanda))
	if err != nil {
		return ErrTanda
	}
	hitung, _ := hex.DecodeString(TandaTangan(rahasia, ts, method, uri, body))
	if !hmac.Equal(hitung, diterima) {
		return ErrTanda
	}
	return nil
}

// --8<-- [end:tanda-tangan]

// SidikKunci: yang tersimpan di mitra_pos.kunci_hash adalah SHA-256 heksadesimal dari kunci API, bukan kuncinya.
func SidikKunci(kunci string) string {
	h := sha256.Sum256([]byte(kunci))
	return hex.EncodeToString(h[:])
}
