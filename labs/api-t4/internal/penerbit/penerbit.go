// Package penerbit adalah client ke penerbit kartu tiruan (kartu virtual, Tahap 4). Isinya ditulis tugas kartu.
package penerbit

import (
	"net/http"
	"time"

	"lab/apit4/internal/klien"
)

type Klien struct {
	url  string
	http *http.Client
}

func Baru(alamat string, timeout time.Duration) *Klien {
	return &Klien{url: alamat, http: klien.Baru(timeout)}
}
