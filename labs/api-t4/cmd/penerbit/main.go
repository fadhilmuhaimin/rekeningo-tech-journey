// Penerbit kartu tiruan untuk lab api-t4 (Tahap 4, kartu virtual). Hanya di localhost, tanpa kredensial nyata:
// pihak ketiga di lab selalu tiruan lokal. Dua peran dalam satu proses:
//
//   - Dipanggil Rekeningo: POST /kartu menerbitkan kartu (token dan empat digit deterministik dari Idempotency-Key).
//   - Memanggil Rekeningo (endpoint lab, dipicu run.py atau curl): POST /lab/otorisasi, /lab/clearing, dan
//     /lab/reversal meneruskan ke /penerbit/* dengan header X-Penerbit-Kunci. Otorisasi memakai tenggat (bawaan
//     2 detik, mengikuti dokumentasi satu penerbit); bila jawaban Rekeningo terlambat atau gagal, penerbit memutuskan
//     sendiri menurut aturan timeout yang dipasang (bawaan setuju), bukan menurut Rekeningo.
//
// POST /lab/aturan {"bila_timeout":"setuju|tolak","tenggat_ms":N} mengganti aturan tanpa memulai ulang proses.
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type penerbit struct {
	api, kunci string

	mu          sync.Mutex
	tenggat     time.Duration
	bilaTimeout string
}

// kartu menurunkan token dan empat digit dari key: key yang sama menghasilkan kartu yang sama, jadi pengulangan
// karena timeout tidak menerbitkan dua kartu.
func kartu(kunci string) (token, empat string) {
	h := sha256.Sum256([]byte("kartu|" + kunci))
	n := uint32(h[0])<<24 | uint32(h[1])<<16 | uint32(h[2])<<8 | uint32(h[3])
	return "tok_" + hex.EncodeToString(h[4:16]), fmt.Sprintf("%04d", n%10000)
}

func (p *penerbit) aturan() (time.Duration, string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.tenggat, p.bilaTimeout
}

// teruskan memanggil Rekeningo dan mengembalikan status dan isi jawaban. err bila tidak ada jawaban (timeout,
// koneksi putus).
func (p *penerbit) teruskan(path string, body []byte, tenggat time.Duration) (int, []byte, error) {
	c := &http.Client{Timeout: tenggat}
	req, _ := http.NewRequest(http.MethodPost, p.api+path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Penerbit-Kunci", p.kunci)
	resp, err := c.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	return resp.StatusCode, isi, err
}

func jawab(w http.ResponseWriter, status int, isi any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(isi)
}

func main() {
	alamat := flag.String("addr", "127.0.0.1:"+portLab(18285), "alamat server")
	api := flag.String("api", "http://127.0.0.1:"+portLab(18280), "alamat Rekeningo (api-t4)")
	kunci := flag.String("kunci", "kunci-penerbit-lab", "nilai header X-Penerbit-Kunci (data lab, bukan secret)")
	tenggat := flag.Duration("tenggat", 2*time.Second, "tenggat jawaban otorisasi dari Rekeningo")
	bila := flag.String("bila-timeout", "setuju", "keputusan penerbit bila jawaban terlambat atau gagal: setuju atau tolak")
	flag.Parse()
	if *bila != "setuju" && *bila != "tolak" {
		log.Fatalf("-bila-timeout harus setuju atau tolak, bukan %q", *bila)
	}
	p := &penerbit{api: strings.TrimRight(*api, "/"), kunci: *kunci, tenggat: *tenggat, bilaTimeout: *bila}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /kartu", func(w http.ResponseWriter, r *http.Request) {
		k := r.Header.Get("Idempotency-Key")
		if k == "" {
			http.Error(w, `{"error":"Idempotency-Key wajib"}`, http.StatusBadRequest)
			return
		}
		token, empat := kartu(k)
		jawab(w, http.StatusCreated, map[string]string{"token": token, "empat_digit": empat})
	})
	mux.HandleFunc("POST /lab/otorisasi", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<16))
		tg, bila := p.aturan()
		status, isi, err := p.teruskan("/penerbit/otorisasi", body, tg)
		var k struct {
			Keputusan string `json:"keputusan"`
			Alasan    string `json:"alasan"`
		}
		if err != nil || status != http.StatusOK || json.Unmarshal(isi, &k) != nil || (k.Keputusan != "setuju" && k.Keputusan != "tolak") {
			// Tidak ada keputusan dari Rekeningo dalam tenggat: penerbit memutuskan menurut aturan timeout-nya.
			jawab(w, http.StatusOK, map[string]string{"keputusan": bila, "sumber": "timeout"})
			return
		}
		out := map[string]string{"keputusan": k.Keputusan, "sumber": "rekeningo"}
		if k.Alasan != "" {
			out["alasan"] = k.Alasan
		}
		jawab(w, http.StatusOK, out)
	})
	teruskanLangsung := func(path string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<16))
			status, isi, err := p.teruskan(path, body, 10*time.Second)
			if err != nil {
				jawab(w, http.StatusBadGateway, map[string]string{"error": "Rekeningo tidak menjawab"})
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(status)
			w.Write(isi)
		}
	}
	mux.HandleFunc("POST /lab/clearing", teruskanLangsung("/penerbit/clearing"))
	mux.HandleFunc("POST /lab/reversal", teruskanLangsung("/penerbit/reversal"))
	mux.HandleFunc("POST /lab/aturan", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			BilaTimeout string `json:"bila_timeout"`
			TenggatMS   int    `json:"tenggat_ms"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || (in.BilaTimeout != "" && in.BilaTimeout != "setuju" && in.BilaTimeout != "tolak") || in.TenggatMS < 0 {
			http.Error(w, "bila_timeout: setuju atau tolak; tenggat_ms: bilangan tidak negatif", http.StatusBadRequest)
			return
		}
		p.mu.Lock()
		if in.BilaTimeout != "" {
			p.bilaTimeout = in.BilaTimeout
		}
		if in.TenggatMS > 0 {
			p.tenggat = time.Duration(in.TenggatMS) * time.Millisecond
		}
		p.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	log.Printf("penerbit mendengar di %s (api %s, tenggat %s, bila timeout %s)", *alamat, p.api, *tenggat, *bila)
	log.Fatal(http.ListenAndServe(*alamat, mux))
}
