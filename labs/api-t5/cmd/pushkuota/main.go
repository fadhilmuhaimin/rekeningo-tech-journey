// Penyedia push tiruan dengan kuota untuk lab t5-fanout. Hanya di localhost, tanpa kredensial. Bentuk permintaannya sama
// dengan cmd/pushpalsu (POST /v1/pesan, satu pesan ke satu token), ditambah tiga hal:
//
//	kuota    paling banyak -kuota pesan diterima dalam satu jendela satu detik; sisanya dijawab 429. Jendela dibuka oleh
//	         permintaan pertama sesudah jendela sebelumnya habis (menit atau detik tidak selaras jam, seperti dokumentasi
//	         satu penyedia push). Jawaban 429 tidak menghabiskan kuota.
//	latensi  tiap pesan yang diterima dijawab sesudah -latensi (waktu proses penyedia, t di naskah).
//	kelas    permintaan dihitung per kelas notifikasi: "pengumuman" bila notifikasi_id UUID versi 5, selain itu "uang".
//
// Token berawalan "mati-" dijawab 404 dan tidak menghabiskan kuota. GET /lab/ringkasan memuat hitungan per kelas,
// notifikasi berbeda, panggilan ganda, dan jumlah penerima per kelas ganda; POST /lab/reset menghapus semuanya.
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"lab/apit5/internal/notifid"
)

// Jendela adalah penghitung kuota. Waktu disuntik supaya tes tidak bergantung jam dinding.
type Jendela struct {
	Kuota   int
	Panjang time.Duration
	mulai   time.Time
	hitung  int
}

// --8<-- [start:jendela]
// Coba mengembalikan true bila satu pesan boleh diterima sekarang, dan menghitungnya. Kuota 0 berarti tanpa batas.
func (j *Jendela) Coba(sekarang time.Time) bool {
	if j.Kuota <= 0 {
		return true
	}
	if j.mulai.IsZero() || sekarang.Sub(j.mulai) >= j.Panjang {
		j.mulai, j.hitung = sekarang, 0
	}
	if j.hitung >= j.Kuota {
		return false
	}
	j.hitung++
	return true
}

// --8<-- [end:jendela]

type kelasHitung struct {
	Permintaan int `json:"permintaan"`
	Diterima   int `json:"diterima"`
	Ditolak429 int `json:"ditolak_429"`
}

type layanan struct {
	mu        sync.Mutex
	jendela   Jendela
	latensi   time.Duration
	hitung    map[string]*kelasHitung
	perID     map[string]int            // notifikasi_id -> berapa kali diterima
	perToken  map[string]map[string]int // pengumuman: token -> notifikasi_id berbeda yang diterimanya
	serentak  int
	serentakM int
}

func baru(kuota int, latensi time.Duration) *layanan {
	l := &layanan{jendela: Jendela{Kuota: kuota, Panjang: time.Second}, latensi: latensi}
	l.reset()
	return l
}

func (l *layanan) reset() {
	l.hitung = map[string]*kelasHitung{"uang": {}, "pengumuman": {}}
	l.perID = map[string]int{}
	l.perToken = map[string]map[string]int{}
	l.serentakM = 0
	l.jendela.mulai, l.jendela.hitung = time.Time{}, 0
}

func main() {
	alamat := flag.String("addr", "127.0.0.1:"+portLab(18317), "alamat server")
	kuota := flag.Int("kuota", 10000, "pesan diterima per jendela satu detik; 0 = tanpa batas (naskah: 600.000 per menit = 10.000 per detik)")
	latensi := flag.Duration("latensi", 0, "waktu proses satu pesan yang diterima")
	flag.Parse()
	l := baru(*kuota, *latensi)
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/pesan", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token        string `json:"token"`
			NotifikasiID string `json:"notifikasi_id"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || in.Token == "" || in.NotifikasiID == "" {
			http.Error(w, `{"error":{"status":"INVALID_ARGUMENT"}}`, http.StatusBadRequest)
			return
		}
		kelas := notifid.Kelas(in.NotifikasiID)
		l.mu.Lock()
		h := l.hitung[kelas]
		h.Permintaan++
		if strings.HasPrefix(in.Token, "mati-") {
			l.mu.Unlock()
			http.Error(w, `{"error":{"status":"UNREGISTERED"}}`, http.StatusNotFound)
			return
		}
		if !l.jendela.Coba(time.Now()) {
			h.Ditolak429++
			l.mu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":{"status":"RESOURCE_EXHAUSTED"}}`, http.StatusTooManyRequests)
			return
		}
		h.Diterima++
		l.perID[in.NotifikasiID]++
		if kelas == "pengumuman" {
			if l.perToken[in.Token] == nil {
				l.perToken[in.Token] = map[string]int{}
			}
			l.perToken[in.Token][in.NotifikasiID]++
		}
		l.serentak++
		l.serentakM = max(l.serentakM, l.serentak)
		l.mu.Unlock()
		if l.latensi > 0 {
			time.Sleep(l.latensi)
		}
		l.mu.Lock()
		l.serentak--
		l.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"name":"pesan/ok"}`))
	})
	mux.HandleFunc("POST /lab/reset", func(w http.ResponseWriter, r *http.Request) {
		l.mu.Lock()
		l.reset()
		l.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /lab/ringkasan", func(w http.ResponseWriter, r *http.Request) {
		l.mu.Lock()
		defer l.mu.Unlock()
		berbeda, ganda := map[string]int{}, 0
		for id, n := range l.perID {
			berbeda[notifid.Kelas(id)]++
			if n > 1 {
				ganda += n - 1
			}
		}
		tepatSatu, lebih := 0, 0
		for _, ids := range l.perToken {
			if len(ids) == 1 {
				tepatSatu++
			} else {
				lebih++
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"uang": l.hitung["uang"], "pengumuman": l.hitung["pengumuman"],
			"notifikasi_berbeda": berbeda, "panggilan_ganda": ganda,
			"penerima_pengumuman": len(l.perToken), "penerima_tepat_satu": tepatSatu, "penerima_lebih_dari_satu": lebih,
			"serentak_maks": l.serentakM,
		})
	})
	log.Printf("pushkuota mendengar di %s (kuota %d per detik, latensi %s)", *alamat, *kuota, *latensi)
	log.Fatal(http.ListenAndServe(*alamat, mux))
}
