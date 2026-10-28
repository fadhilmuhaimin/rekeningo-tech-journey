// Contoh yang disiapkan lab t4-pipeline: bukan kode api-t4. Berisi tepat satu temuan gosec (G201, SQL dari fmt.Sprintf)
// dan satu pemanggilan fungsi rentan di dependensi (golang.org/x/text v0.3.7, language.ParseAcceptLanguage), yang
// ditemukan govulncheck karena dipanggil dan oleh grype karena versinya ada di SBOM.
package main

import (
	"database/sql"
	"fmt"
	"os"

	"golang.org/x/text/language"
)

// cariAkun menyusun SQL dari masukan: sengaja rentan (temuan gosec G201).
func cariAkun(db *sql.DB, nomor string) (*sql.Rows, error) {
	return db.Query(fmt.Sprintf("SELECT id, nama FROM akun WHERE nomor_karyawan = '%s'", nomor))
}

// bahasaPilihan membaca header Accept-Language lewat fungsi yang rentan di x/text v0.3.7 (GO-2022-1059).
func bahasaPilihan(header string) []language.Tag {
	tag, _, err := language.ParseAcceptLanguage(header)
	if err != nil {
		return nil
	}
	return tag
}

func main() {
	var db *sql.DB // tanpa koneksi: contoh ini hanya dianalisis, tidak dijalankan
	if len(os.Args) > 1 {
		rows, _ := cariAkun(db, os.Args[1])
		_ = rows
	}
	fmt.Println(bahasaPilihan(os.Getenv("ACCEPT_LANGUAGE")))
}
