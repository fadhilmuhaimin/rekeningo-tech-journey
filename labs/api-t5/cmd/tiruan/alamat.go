package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"sort"
	"strings"
	"sync"
)

// Daftar alamat sumber untuk layanan verifikasi tiruan (lab t4-infra, M34, ADR 39). Banyak vendor KYC hanya menerima
// permintaan dari alamat IP yang didaftarkan lebih dulu. Tiruan ini meniru syaratnya: bila daftar tidak kosong, hanya
// POST /verifikasi dari alamat yang terdaftar yang diproses; alamat lain dijawab 403.
//
// Alamat yang diperiksa adalah alamat peer koneksi TCP (r.RemoteAddr), bukan header apa pun. Header X-Forwarded-For
// dikirim client dan bisa diisi siapa saja; vendor yang mempercayainya tidak memeriksa apa-apa. Di belakang proxy keluar,
// peer-nya adalah proxy itu, dan itulah satu-satunya alamat yang perlu didaftarkan.
//
// Daftar kosong berarti semua alamat diterima (perilaku semua lab lain tidak berubah). Hanya /verifikasi yang diperiksa;
// /lab/* tetap terbuka karena dipakai penggerak lab.

// daftarAlamat: alamat atau CIDR yang diizinkan, dan hitungan per alamat sumber (diterima dan ditolak).
type daftarAlamat struct {
	mu       sync.Mutex
	izin     []netip.Prefix
	diterima map[string]int
	ditolak  map[string]int
}

func daftarBaru() *daftarAlamat {
	return &daftarAlamat{diterima: map[string]int{}, ditolak: map[string]int{}}
}

// parseIzin mengubah "172.18.0.3" atau "172.18.0.0/24" (dipisah koma) menjadi prefiks. Alamat IPv4-mapped IPv6
// diperlakukan sebagai IPv4-nya. Elemen kosong dilewati; elemen yang bukan alamat atau CIDR menghasilkan galat.
func parseIzin(teks string) ([]netip.Prefix, error) {
	var hasil []netip.Prefix
	for _, e := range strings.Split(teks, ",") {
		if e = strings.TrimSpace(e); e == "" {
			continue
		}
		if p, err := netip.ParsePrefix(e); err == nil {
			hasil = append(hasil, p.Masked())
			continue
		}
		a, err := netip.ParseAddr(e)
		if err != nil {
			return nil, fmt.Errorf("bukan alamat atau CIDR: %q", e)
		}
		a = a.Unmap()
		hasil = append(hasil, netip.PrefixFrom(a, a.BitLen()))
	}
	return hasil, nil
}

// sumber: alamat peer koneksi TCP, tanpa port, IPv4-mapped dilepas. Header tidak dibaca.
func sumber(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if a, err := netip.ParseAddr(host); err == nil {
		return a.Unmap().String()
	}
	return host
}

// Atur mengganti daftar izin.
func (d *daftarAlamat) Atur(izin []netip.Prefix) {
	d.mu.Lock()
	d.izin = izin
	d.mu.Unlock()
}

// Periksa mencatat satu permintaan dari alamat itu dan mengembalikan apakah diterima. Daftar kosong menerima semua.
func (d *daftarAlamat) Periksa(alamat string) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	ok := len(d.izin) == 0
	if a, err := netip.ParseAddr(alamat); err == nil {
		for _, p := range d.izin {
			if p.Contains(a.Unmap()) {
				ok = true
			}
		}
	}
	if ok {
		d.diterima[alamat]++
	} else {
		d.ditolak[alamat]++
	}
	return ok
}

// Ulang mengosongkan hitungan (daftar izin tidak berubah).
func (d *daftarAlamat) Ulang() {
	d.mu.Lock()
	d.diterima, d.ditolak = map[string]int{}, map[string]int{}
	d.mu.Unlock()
}

type ringkasanAlamat struct {
	Izin     []string       `json:"izin"`
	Diterima map[string]int `json:"diterima"`
	Ditolak  map[string]int `json:"ditolak"`
}

func (d *daftarAlamat) Ringkas() ringkasanAlamat {
	d.mu.Lock()
	defer d.mu.Unlock()
	r := ringkasanAlamat{Izin: []string{}, Diterima: map[string]int{}, Ditolak: map[string]int{}}
	for _, p := range d.izin {
		r.Izin = append(r.Izin, p.String())
	}
	sort.Strings(r.Izin)
	for k, v := range d.diterima {
		r.Diterima[k] = v
	}
	for k, v := range d.ditolak {
		r.Ditolak[k] = v
	}
	return r
}

// pasang memasang dua rute lab: POST /lab/izinkan {"alamat": ["172.18.0.3", ...]} mengganti daftar (pendaftaran
// alamat di vendor nyata makan waktu hari kerja; di tiruan seketika), dan GET /lab/alamat membaca daftar dan hitungan.
func (d *daftarAlamat) pasang(mux *http.ServeMux) {
	mux.HandleFunc("POST /lab/izinkan", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Alamat []string `json:"alamat"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil {
			http.Error(w, "body harus {alamat: [...]}", http.StatusBadRequest)
			return
		}
		izin, err := parseIzin(strings.Join(in.Alamat, ","))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		d.Atur(izin)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /lab/alamat", func(w http.ResponseWriter, r *http.Request) {
		tulis(w, 200, d.Ringkas())
	})
}
