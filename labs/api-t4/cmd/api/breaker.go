package main

import (
	"time"

	"lab/apit4/internal/lajur"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// breakerLajur: breaker per vendor untuk worker (ADR 36). Mati = peta kosong = ADR 25 apa adanya. Satu-satunya
// lajur yang punya vendor di lab ini adalah verifikasi; lajur push memanggil layanan push milik platform sendiri.
func breakerLajur(aktif bool, timeout time.Duration, bawaan bool) map[string]*lajur.Breaker {
	if !aktif {
		return nil
	}
	return map[string]*lajur.Breaker{repo.TujuanVerifikasi: lajur.Baru(repo.TujuanVerifikasi, lajur.Opsi{
		Timeout: timeout, Bawaan: bawaan, SalahPermintaan: verifikasi.SalahPermintaan})}
}
