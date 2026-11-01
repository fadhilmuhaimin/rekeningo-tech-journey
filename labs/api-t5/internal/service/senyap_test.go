package service

import (
	"io"
	"log"
)

// Log service tidak ikut keluaran `go test -v`: berisi waktu, nomor goroutine, dan jalur berkas, jadi rekaman
// output/testing.txt tidak akan identik di rekaman ulang. Tes memeriksa hasilnya lewat nilai balik dan hitungan,
// bukan lewat teks log.
func init() { log.SetOutput(io.Discard) }
