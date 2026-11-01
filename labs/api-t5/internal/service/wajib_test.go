package service

import (
	"fmt"
	"os"
	"testing"
)

// --8<-- [start:wajib]
// TestMain: bila lingkungan menuntut tes database (CI mengisi TES_DB_WAJIB=1), tes tidak boleh berjalan tanpa
// database. Tanpa penjaga ini, siapkan() memanggil t.Skip dan go test keluar 0 (rekaman m14.txt bagian C).
func TestMain(m *testing.M) {
	if os.Getenv("TES_DB_WAJIB") == "1" && os.Getenv("TEST_DATABASE_URL") == "" {
		fmt.Fprintln(os.Stderr, "TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong: tes yang butuh PostgreSQL tidak boleh dilewati")
		os.Exit(1)
	}
	os.Exit(m.Run())
}

// --8<-- [end:wajib]
