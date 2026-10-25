// Lab Tahap 5 · dua instance API di belakang load balancer (round robin).
//
//	t5 lb             load balancer :18140 → :18141, :18142
//	t5 api <port>     instance API. SESI=memori: sesi disimpan di memori instance; SESI=token: token bertanda tangan
//
// Secret token hanya untuk lab.
package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
)

var rahasia = []byte("rahasia-token-lab")

func main() {
	log.SetFlags(0)
	if os.Args[1] == "lb" {
		lb()
		return
	}
	api(os.Args[2])
}

func lb() {
	var n atomic.Int64
	tujuan := []string{"http://127.0.0.1:" + portLab(18141), "http://127.0.0.1:" + portLab(18142)}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		u, _ := url.Parse(tujuan[n.Add(1)%2]) // round robin: bergantian
		log.Printf("lb       %s %s → %s", r.Method, r.URL.Path, u.Host)
		httputil.NewSingleHostReverseProxy(u).ServeHTTP(w, r)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18140), nil))
}

func tanda(user string) string {
	m := hmac.New(sha256.New, rahasia)
	m.Write([]byte(user))
	return user + "." + hex.EncodeToString(m.Sum(nil))
}

// --8<-- [start:sesi]
func api(port string) {
	memori := os.Getenv("SESI") == "memori"
	var mu sync.Mutex
	sesi := map[string]string{} // hanya ada di instance ini
	http.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		if memori {
			b := make([]byte, 8)
			rand.Read(b)
			id := hex.EncodeToString(b)
			mu.Lock()
			sesi[id] = "budi"
			mu.Unlock()
			w.Write([]byte(id))
		} else {
			w.Write([]byte(tanda("budi"))) // bisa diperiksa instance mana pun yang tahu secret
		}
	})
	http.HandleFunc("GET /riwayat", func(w http.ResponseWriter, r *http.Request) {
		tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		mu.Lock()
		user, ok := sesi[tok]
		mu.Unlock()
		if !memori {
			user, _, _ = strings.Cut(tok, ".")
			ok = hmac.Equal([]byte(tanda(user)), []byte(tok))
		}
		if !ok {
			log.Printf("api:%s GET /riwayat → 401 (sesi tidak dikenal di instance ini)", port)
			w.WriteHeader(401)
			return
		}
		log.Printf("api:%s GET /riwayat → 200 untuk %s", port, user)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+port, nil))
}

// --8<-- [end:sesi]
