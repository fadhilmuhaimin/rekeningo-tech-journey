package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Jadwal pengulangan gateway tiruan (lab t4-webhook). Bentuknya mengikuti dokumentasi satu gateway nyata yang dibuka
// ulang 2026-10-27 (riset R4-305): kiriman yang tidak dijawab 2xx diulang dengan jeda 2, 10, 30, 90, dan 210 menit
// sejak percobaan sebelumnya (total 342 menit), dengan jumlah ulangan menurut kode status. Dokumentasi itu juga
// menggeser tiap percobaan sedikit secara acak dan membatasi tunggu 15 detik; tiruan ini tidak menggeser (supaya
// rekaman identik) dan memakai batas 15 detik yang sama. Waktu DIPERANKAN, bukan ditunggu: tiap percobaan
// ditandatangani dengan waktu maya, dan penerima yang punya jam lab (api-t4 -jam-lab) diberi tahu waktu itu lebih dulu.

// jedaUlang adalah jeda sebelum ulangan ke-1, ke-2, dan seterusnya, sejak percobaan sebelumnya.
var jedaUlang = []time.Duration{2 * time.Minute, 10 * time.Minute, 30 * time.Minute, 90 * time.Minute, 210 * time.Minute}

// --8<-- [start:jumlah-ulang]
// jumlahUlang: berapa kali gateway mengulang kiriman yang dijawab `kode` (0 = tidak ada jawaban sama sekali, dihitung
// kode lain). Dokumentasi tidak menjelaskan apa yang terjadi bila kode berganti di antara percobaan; tiruan memakai
// kode kiriman terakhir dan jumlah ulangan yang sudah dipakai (Asumsi).
func jumlahUlang(kode int) int {
	switch {
	case kode >= 200 && kode < 300:
		return 0
	case kode == 400 || kode == 404:
		return 2
	case kode == 500:
		return 1
	case kode == 503:
		return 4
	}
	return 5
}

// --8<-- [end:jumlah-ulang]

// offsetKiriman: waktu kiriman ke-n (n = 1 kiriman pertama) sejak kiriman pertama.
func offsetKiriman(n int) time.Duration {
	var d time.Duration
	for i := 0; i < n-1 && i < len(jedaUlang); i++ {
		d += jedaUlang[i]
	}
	return d
}

// tandatangani: HMAC-SHA256 atas "<timestamp>.<body>", heksadesimal (sama dengan yang diperiksa api-t4).
func tandatangani(rahasia string, ts int64, body []byte) string {
	m := hmac.New(sha256.New, []byte(rahasia))
	fmt.Fprintf(m, "%d.", ts)
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// percobaan adalah satu kiriman dalam jadwal.
type percobaan struct {
	Ke    int    `json:"ke"`
	Menit int    `json:"menit"` // sejak kiriman pertama, waktu maya
	Kode  int    `json:"kode"`  // 0 = tidak ada jawaban
	Hasil string `json:"hasil"`
}

type perintahJadwal struct {
	EventID   string `json:"event_id"`
	OrderID   string `json:"order_id"`
	Status    string `json:"status"` // settlement (bawaan), pending, expire, failure
	Jumlah    int64  `json:"jumlah"` // 0 = jumlah order
	Rahasia   string `json:"rahasia"`
	Mulai     int64  `json:"mulai"`      // waktu maya kiriman pertama, detik Unix
	Dari      int    `json:"dari"`       // kiriman pertama yang dimainkan (bawaan 1); yang sebelumnya dianggap sudah gagal dengan kode yang sama
	Sampai    int    `json:"sampai"`     // kiriman terakhir yang dimainkan (0 = sampai jadwal habis atau diterima)
	URLTarget string `json:"url_target"` // pengganti alamat webhook Rekeningo
	URLJam    string `json:"url_jam"`    // penerima yang punya jam lab: POST {"ms": waktu maya} sebelum tiap kiriman
}

// --8<-- [start:main-jadwal]
// mainkanJadwal memainkan kiriman satu event menurut jadwal ulangan. Kembali: daftar percobaan dan alasan berhenti
// (`diterima`: dijawab 2xx; `jadwal habis`: ulangan yang diizinkan kode itu sudah dipakai; `sesuai perintah lab`).
func mainkanJadwal(klien *http.Client, p perintahJadwal, asli []byte) ([]percobaan, string) {
	if p.Dari < 1 {
		p.Dari = 1
	}
	var hasil []percobaan
	for ke := p.Dari; ; ke++ {
		maya := time.Unix(p.Mulai, 0).Add(offsetKiriman(ke))
		if p.URLJam != "" {
			b, _ := json.Marshal(map[string]int64{"ms": maya.UnixMilli()})
			if r, err := klien.Post(p.URLJam, "application/json", bytes.NewReader(b)); err == nil {
				r.Body.Close()
			}
		}
		ts := maya.Unix()
		req, _ := http.NewRequest(http.MethodPost, p.URLTarget, bytes.NewReader(asli))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Gateway-Timestamp", fmt.Sprint(ts))
		req.Header.Set("X-Gateway-Signature", tandatangani(p.Rahasia, ts, asli))
		x := percobaan{Ke: ke, Menit: int(offsetKiriman(ke) / time.Minute)}
		if resp, err := klien.Do(req); err != nil {
			x.Hasil = "tidak ada jawaban"
		} else {
			x.Kode = resp.StatusCode
			var isi struct {
				Hasil string `json:"hasil"`
			}
			json.NewDecoder(resp.Body).Decode(&isi)
			resp.Body.Close()
			x.Hasil = isi.Hasil
		}
		hasil = append(hasil, x)
		switch {
		case x.Kode >= 200 && x.Kode < 300:
			return hasil, "diterima"
		case ke-1 >= jumlahUlang(x.Kode): // ulangan yang diizinkan sudah dipakai
			return hasil, "jadwal habis"
		case p.Sampai > 0 && ke >= p.Sampai:
			return hasil, "sesuai perintah lab"
		}
	}
}

// --8<-- [end:main-jadwal]

// jadwal: POST /lab/jadwal. Gateway memainkan jadwal ulangan untuk satu kabar.
func (g *gateway) jadwal(w http.ResponseWriter, r *http.Request) {
	var p perintahJadwal
	if json.NewDecoder(r.Body).Decode(&p) != nil || p.EventID == "" || p.OrderID == "" || p.Mulai == 0 {
		http.Error(w, "body harus {event_id, order_id, mulai, ...}", http.StatusBadRequest)
		return
	}
	if p.Status == "" {
		p.Status = "settlement"
	}
	if p.Jumlah == 0 {
		g.mu.Lock()
		if o, ok := g.order[p.OrderID]; ok {
			p.Jumlah = o.Jumlah
		}
		g.mu.Unlock()
	}
	if p.Rahasia == "" {
		p.Rahasia = g.rahasiaSekarang()
	}
	if p.URLTarget == "" {
		p.URLTarget = g.webhook
	}
	asli, _ := json.Marshal(map[string]any{"event_id": p.EventID, "order_id": p.OrderID, "status": p.Status, "jumlah": p.Jumlah})
	hasil, berhenti := mainkanJadwal(&http.Client{Timeout: 15 * time.Second}, p, asli)
	tulis(w, 200, map[string]any{"percobaan": hasil, "berhenti": berhenti, "jadwal": ringkasJadwal()})
}

// ringkasJadwal: jeda dalam menit, untuk dicetak di rekaman.
func ringkasJadwal() string {
	var s []string
	var total time.Duration
	for _, j := range jedaUlang {
		s = append(s, fmt.Sprint(int(j/time.Minute)))
		total += j
	}
	return fmt.Sprintf("%s menit (total %d menit)", strings.Join(s, ", "), int(total/time.Minute))
}

// rotasi: POST /lab/rahasia. Gateway merotasi rahasia penanda tangan dan langsung memakainya (M30): tidak ada masa
// tumpang tindih di sisi gateway tiruan.
func (g *gateway) rotasi(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Rahasia string `json:"rahasia"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Rahasia == "" {
		http.Error(w, "body harus {rahasia}", http.StatusBadRequest)
		return
	}
	g.mu.Lock()
	g.rahasia = in.Rahasia
	g.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func (g *gateway) rahasiaSekarang() string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.rahasia
}
