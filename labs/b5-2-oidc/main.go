// Lab B5.2 · login sosial dengan OAuth 2.0 authorization code + PKCE dan ID token (OpenID Connect).
// Server identitas di sini tiruan (Go, kunci RSA dibuat setiap run). Token di output disensor.
//
//	go run .   → output/oidc.txt
package main

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	b64    = base64.RawURLEncoding
	kunci  *rsa.PrivateKey
	out    strings.Builder
	idp    = "http://127.0.0.1:" + portLab(18130)
	wajib  = true // server identitas mewajibkan PKCE
	mu     sync.Mutex
	kodeDB = map[string]struct{ client, redirect, challenge string }{}
)

func tulis(format string, a ...any) { fmt.Fprintf(&out, format+"\n", a...) }
func sensor(t string) string        { return t[:10] + "…(disensor)" }

// --8<-- [start:pkce]
func challenge(verifier string) string { // RFC 7636 §4.2: BASE64URL(SHA256(verifier))
	h := sha256.Sum256([]byte(verifier))
	return b64.EncodeToString(h[:])
}

// --8<-- [end:pkce]

// ---- server identitas tiruan ----------------------------------------------------------------

func serverIdentitas() {
	m := http.NewServeMux()
	m.HandleFunc("GET /authorize", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query() // anggap Budi sudah login dan menyetujui di browser
		kode := acak(16)
		mu.Lock()
		kodeDB[kode] = struct{ client, redirect, challenge string }{q.Get("client_id"), q.Get("redirect_uri"), q.Get("code_challenge")}
		mu.Unlock()
		http.Redirect(w, r, q.Get("redirect_uri")+"?code="+kode+"&state="+q.Get("state"), http.StatusFound)
	})
	m.HandleFunc("POST /token", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		mu.Lock()
		k, ada := kodeDB[r.Form.Get("code")]
		delete(kodeDB, r.Form.Get("code")) // code hanya boleh dipakai sekali
		mu.Unlock()
		pkceOK := k.challenge == "" && !wajib || k.challenge != "" && challenge(r.Form.Get("code_verifier")) == k.challenge
		if !ada || k.client != r.Form.Get("client_id") || k.redirect != r.Form.Get("redirect_uri") || !pkceOK {
			w.WriteHeader(400)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid_grant"})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"access_token": acak(24), "id_token": idToken(k.client, time.Hour)})
	})
	m.HandleFunc("GET /jwks", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{"kty": "RSA", "kid": "lab-1",
			"n": b64.EncodeToString(kunci.N.Bytes()), "e": b64.EncodeToString(big.NewInt(int64(kunci.E)).Bytes())}}})
	})
	jalan("127.0.0.1:"+portLab(18130), m)
}

func idToken(aud string, berlaku time.Duration) string {
	h, _ := json.Marshal(map[string]string{"alg": "RS256", "typ": "JWT", "kid": "lab-1"})
	c, _ := json.Marshal(map[string]any{"iss": idp, "sub": "akun-7781", "aud": aud, "email": "budi@contoh.test",
		"iat": time.Now().Unix(), "exp": time.Now().Add(berlaku).Unix()})
	isi := b64.EncodeToString(h) + "." + b64.EncodeToString(c)
	d := sha256.Sum256([]byte(isi))
	sig, _ := rsa.SignPKCS1v15(rand.Reader, kunci, crypto.SHA256, d[:])
	return isi + "." + b64.EncodeToString(sig)
}

// ---- Monolith API Rekeningo: menerima ID token -------------------------------------------------

// --8<-- [start:verifikasi]
func periksaIDToken(tok string) (string, error) {
	p := strings.Split(tok, ".")
	if len(p) != 3 {
		return "", fmt.Errorf("format salah")
	}
	var h struct{ Alg string }
	hb, _ := b64.DecodeString(p[0])
	if json.Unmarshal(hb, &h) != nil || h.Alg != "RS256" { // jangan percaya alg dari token begitu saja
		return "", fmt.Errorf("alg %q ditolak", h.Alg)
	}
	sig, _ := b64.DecodeString(p[2])
	d := sha256.Sum256([]byte(p[0] + "." + p[1]))
	if rsa.VerifyPKCS1v15(kunciPublik(), crypto.SHA256, d[:], sig) != nil { // kunci dari JWKS server identitas
		return "", fmt.Errorf("signature tidak cocok")
	}
	var c struct {
		Iss, Aud, Sub string
		Exp           int64
	}
	cb, _ := b64.DecodeString(p[1])
	json.Unmarshal(cb, &c)
	switch {
	case c.Iss != idp:
		return "", fmt.Errorf("iss %q bukan server identitas yang dipercaya", c.Iss)
	case c.Aud != "rekeningo-app":
		return "", fmt.Errorf("aud %q bukan client id Rekeningo", c.Aud)
	case time.Now().Unix() > c.Exp:
		return "", fmt.Errorf("kedaluwarsa")
	}
	return c.Sub, nil
}

// --8<-- [end:verifikasi]

func kunciPublik() *rsa.PublicKey {
	res, err := http.Get(idp + "/jwks")
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	var j struct{ Keys []struct{ N, E string } }
	json.NewDecoder(res.Body).Decode(&j)
	n, _ := b64.DecodeString(j.Keys[0].N)
	e, _ := b64.DecodeString(j.Keys[0].E)
	return &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
}

func apiRekeningo() {
	m := http.NewServeMux()
	m.HandleFunc("POST /auth/sosial", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			IDToken string `json:"id_token"`
		}
		json.NewDecoder(r.Body).Decode(&in)
		sub, err := periksaIDToken(in.IDToken)
		if err != nil {
			tulis("api      POST /auth/sosial → 401 (%v)", err)
			w.WriteHeader(401)
			return
		}
		tulis("api      POST /auth/sosial → 200, akun Rekeningo terhubung ke sub=%s, token Rekeningo diterbitkan", sub)
	})
	jalan("127.0.0.1:"+portLab(18131), m)
}

// ---- pembantu dan skenario ----------------------------------------------------------------------

func acak(n int) string { b := make([]byte, n); rand.Read(b); return b64.EncodeToString(b) }

func jalan(alamat string, h http.Handler) {
	l, err := net.Listen("tcp", alamat)
	if err != nil {
		fmt.Fprintln(os.Stderr, "port terpakai:", alamat)
		os.Exit(1)
	}
	go http.Serve(l, h)
}

var tanpaRedirect = &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}

func authorize(denganPKCE bool, verifier string) string {
	q := url.Values{"response_type": {"code"}, "client_id": {"rekeningo-app"}, "redirect_uri": {"rekeningo://callback"}, "state": {"s-41"}}
	if denganPKCE {
		q.Set("code_challenge", challenge(verifier))
		q.Set("code_challenge_method", "S256")
	}
	res, _ := tanpaRedirect.Get(idp + "/authorize?" + q.Encode())
	loc, _ := url.Parse(res.Header.Get("Location"))
	tulis("browser  GET /authorize (PKCE: %v) → %d, Location: rekeningo://callback?code=%s&state=s-41", denganPKCE, res.StatusCode, sensor(loc.Query().Get("code")))
	return loc.Query().Get("code")
}

func tukar(siapa, code, verifier string) string {
	f := url.Values{"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {"rekeningo://callback"}, "client_id": {"rekeningo-app"}}
	if verifier != "" {
		f.Set("code_verifier", verifier)
	}
	res, _ := http.PostForm(idp+"/token", f)
	b, _ := io.ReadAll(res.Body)
	var t map[string]string
	json.Unmarshal(b, &t)
	if res.StatusCode != 200 {
		tulis("%-9s POST /token (code_verifier: %v) → %d %s", siapa, verifier != "", res.StatusCode, strings.TrimSpace(string(b)))
		return ""
	}
	tulis("%-9s POST /token (code_verifier: %v) → 200 access_token=%s id_token=%s", siapa, verifier != "", sensor(t["access_token"]), sensor(t["id_token"]))
	return t["id_token"]
}

func kirimKeAPI(label, tok string) {
	b, _ := json.Marshal(map[string]string{"id_token": tok})
	tulis("app      %s", label)
	http.Post("http://127.0.0.1:"+portLab(18131)+"/auth/sosial", "application/json", strings.NewReader(string(b)))
}

func main() {
	kunci, _ = rsa.GenerateKey(rand.Reader, 2048)
	serverIdentitas()
	apiRekeningo()

	tulis("== A. Vektor uji RFC 7636 Lampiran B")
	v := "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	tulis("code_verifier  = %s\ncode_challenge = %s\nsama dengan RFC: %v", v, challenge(v), challenge(v) == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")

	tulis("\n== B. Server identitas mewajibkan PKCE · app jahat dengan skema URL yang sama mencegat code")
	verifier := acak(32)
	code := authorize(true, verifier)
	tukar("app jahat", code, "")
	tulis("(code hanya berlaku sekali; Budi login ulang dan kali ini app Rekeningo yang menerima code)")
	code = authorize(true, verifier)
	idTok := tukar("app", code, verifier)

	tulis("\n== C. Server identitas tanpa PKCE · app jahat mencegat code")
	wajib = false
	code = authorize(false, "")
	tukar("app jahat", code, "")

	tulis("\n== D. API Rekeningo memeriksa ID token")
	kirimKeAPI("kirim ID token dari langkah B", idTok)
	kirimKeAPI("kirim ID token yang diterbitkan untuk app lain (aud=app-lain)", idToken("app-lain", time.Hour))
	kirimKeAPI("kirim ID token yang sudah kedaluwarsa", idToken("rekeningo-app", -time.Minute))
	p := strings.Split(idTok, ".")
	palsu := strings.Replace(p[1], p[1][5:9], "AAAA", 1) // isi token diubah, signature lama
	kirimKeAPI("kirim ID token dari langkah B dengan isi diubah", p[0]+"."+palsu+"."+p[2])
	time.Sleep(200 * time.Millisecond)
	os.WriteFile("output/oidc.txt", []byte(out.String()), 0o644)
	fmt.Print(out.String())
}
