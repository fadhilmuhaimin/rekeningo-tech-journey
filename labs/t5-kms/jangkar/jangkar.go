// Package jangkar mencatat checksum tiap file arsip di berkas di luar database. Berkasnya hanya bertambah: satu baris JSON
// per periode. Pemalsuan checksum di database terlihat sebagai selisih dengan jangkar. Yang tidak dicakup: pihak yang
// bisa mengubah berkas ini bersama database dan file arsip sekaligus.
package jangkar

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"time"
)

// Entri adalah satu jangkar.
type Entri struct {
	Periode  string `json:"periode"`
	Checksum string `json:"checksum"`
	Dicatat  string `json:"dicatat"`
}

// ErrBeda: periode sudah punya jangkar dengan checksum lain.
var ErrBeda = errors.New("periode sudah punya jangkar dengan checksum berbeda")

var (
	polaChecksum = regexp.MustCompile(`^[0-9a-f]{64}$`)
	polaPeriode  = regexp.MustCompile(`^\d{4}-\d{2}-01$`)
)

// Baca membaca semua jangkar. Berkas yang belum ada berarti belum ada jangkar; baris rusak membuat pembacaan gagal.
func Baca(path string) ([]Entri, error) {
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var hasil []Entri
	s := bufio.NewScanner(bytes.NewReader(b))
	s.Buffer(make([]byte, 1<<16), 1<<20)
	n := 0
	for s.Scan() {
		n++
		var e Entri
		d := json.NewDecoder(bytes.NewReader(s.Bytes()))
		d.DisallowUnknownFields()
		if err := d.Decode(&e); err != nil {
			return nil, fmt.Errorf("jangkar baris %d: %w", n, err)
		}
		if !polaChecksum.MatchString(e.Checksum) || !polaPeriode.MatchString(e.Periode) {
			return nil, fmt.Errorf("jangkar baris %d: periode atau checksum tidak sah", n)
		}
		hasil = append(hasil, e)
	}
	return hasil, s.Err()
}

// Cari mengembalikan jangkar sebuah periode.
func Cari(path, periode string) (Entri, bool, error) {
	semua, err := Baca(path)
	if err != nil {
		return Entri{}, false, err
	}
	for _, e := range semua {
		if e.Periode == periode {
			return e, true, nil
		}
	}
	return Entri{}, false, nil
}

// Catat menambah satu baris. Periode yang sama dengan checksum yang sama tidak menambah baris; checksum lain ditolak.
func Catat(path, periode, checksum string) error {
	if !polaChecksum.MatchString(checksum) || !polaPeriode.MatchString(periode) {
		return errors.New("periode atau checksum tidak sah")
	}
	ada, ketemu, err := Cari(path, periode)
	if err != nil {
		return err
	}
	if ketemu {
		if ada.Checksum == checksum {
			return nil
		}
		return ErrBeda
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	b, _ := json.Marshal(Entri{Periode: periode, Checksum: checksum, Dicatat: time.Now().UTC().Format(time.RFC3339)})
	if _, err := f.Write(append(b, '\n')); err != nil {
		f.Close()
		return err
	}
	return f.Close()
}
