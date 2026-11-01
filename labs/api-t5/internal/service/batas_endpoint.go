package service

import (
	"fmt"
	"sync"
)

// Batas laju untuk endpoint Tahap 4 yang belum punya (README api-t3, "Yang belum ada di lab ini"): perangkat,
// pesanan, promo, sinkron, daftar, verifikasi, top-up bank. Token bucket di memori satu proses, pola Pembatas
// (ADR 20); lintas instance tetap butuh penghitung bersama (ADR 27). Semua angka adalah Asumsi lab: kapasitas awal
// dan isi ulang per detik.
//
// Per akun: tugas lain menambah entri di init() berkasnya sendiri sebelum Baru membuat pembatasnya.
var AmbangEndpoint = map[string][2]float64{
	"perangkat":  {10, 10.0 / 3600}, // 10 pendaftaran perangkat, isi ulang 10 per jam
	"pesanan":    {20, 20.0 / 60},   // 20 pesanan, isi ulang 20 per menit
	"promo":      {5, 5.0 / 3600},   // 5 promo, isi ulang 5 per jam
	"sinkron":    {30, 30.0 / 60},   // 30 sinkron, isi ulang 30 per menit
	"verifikasi": {3, 3.0 / 3600},   // 3 pengajuan, isi ulang 3 per jam
	"topup-bank": {10, 10.0 / 3600}, // 10 top-up, isi ulang 10 per jam
}

// AmbangEndpointIP: batas per alamat untuk endpoint yang dipakai sebelum ada akun atau yang gratis dicoba penyerang.
var AmbangEndpointIP = map[string][2]float64{
	"daftar":     {5, 5.0 / 3600},   // 5 pendaftaran per alamat, isi ulang 5 per jam
	"verifikasi": {10, 10.0 / 3600}, // 10 pengajuan per alamat
	"topup-bank": {30, 30.0 / 3600}, // 30 top-up per alamat
}

type batasEndpoint struct {
	mu     sync.Mutex
	akun   map[string]*Pembatas
	alamat map[string]*Pembatas
}

func batasEndpointBaru() *batasEndpoint {
	b := &batasEndpoint{akun: map[string]*Pembatas{}, alamat: map[string]*Pembatas{}}
	for nama, a := range AmbangEndpoint {
		b.akun[nama] = PembatasBaru(a[0], a[1])
	}
	for nama, a := range AmbangEndpointIP {
		b.alamat[nama] = PembatasBaru(a[0], a[1])
	}
	return b
}

// BatasAkun mengambil satu token dari bucket akun untuk endpoint itu. Endpoint tanpa entri tidak dibatasi.
func (s Service) BatasAkun(nama string, akun int64) error {
	p := s.batas.akun[nama]
	if p == nil {
		return nil
	}
	if ok, tunggu := p.Izinkan(fmt.Sprint(akun), s.kini()); !ok {
		return ErrTerlaluSering{Lapis: "akun", Tunggu: tunggu}
	}
	return nil
}

// BatasAlamat: sama, per alamat (kunci dari KunciAlamat), dipanggil handler.
func (s Service) BatasAlamat(nama, alamat string) error {
	p := s.batas.alamat[nama]
	if p == nil {
		return nil
	}
	if ok, tunggu := p.Izinkan(KunciAlamat(alamat), s.kini()); !ok {
		return ErrTerlaluSering{Lapis: "ip", Tunggu: tunggu}
	}
	return nil
}
