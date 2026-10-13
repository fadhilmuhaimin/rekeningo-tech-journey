package service

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"lab/apit2/internal/repo"
)

// --8<-- [start:unit]
// Unit test: aturan jumlah di service, tanpa database. repo.Repo{} tidak punya koneksi,
// jadi kalau Bayar menyentuh database sebelum memeriksa jumlah, tes ini panic.
func TestBayarMenolakJumlahDiLuarBatas(t *testing.T) {
	svc := Baru(repo.Repo{}, 0)
	for _, jumlah := range []int64{-70000, 0, 200001} {
		t.Run(fmt.Sprint(jumlah), func(t *testing.T) {
			_, _, err := svc.Bayar(context.Background(), 419, 418, jumlah)
			var v ErrValidasi
			if !errors.As(err, &v) || v.Field != "jumlah" {
				t.Fatalf("Bayar(%d): ingin ErrValidasi field jumlah, dapat %v", jumlah, err)
			}
		})
	}
}

// --8<-- [end:unit]
