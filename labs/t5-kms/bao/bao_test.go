package bao

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// Tes dengan server tiruan: apa yang dikirim klien dan cara ia memetakan jawaban.
func tiruan(t *testing.T, tangani func(w http.ResponseWriter, r *http.Request)) *Klien {
	s := httptest.NewServer(http.HandlerFunc(tangani))
	t.Cleanup(s.Close)
	return &Klien{Alamat: s.URL, Token: "token-uji", Kunci: "kek-uji"}
}

func TestMengirimTokenDanJalur(t *testing.T) {
	var jalur, token string
	k := tiruan(t, func(w http.ResponseWriter, r *http.Request) {
		jalur, token = r.URL.Path, r.Header.Get("X-Vault-Token")
		dek := base64.StdEncoding.EncodeToString(make([]byte, 32))
		json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"plaintext": dek, "ciphertext": "vault:v1:AAAA"}})
	})
	if _, _, err := k.BuatDataKey(context.Background()); err != nil {
		t.Fatal(err)
	}
	if jalur != "/v1/transit/datakey/plaintext/kek-uji" || token != "token-uji" {
		t.Fatalf("jalur %q token %q", jalur, token)
	}
	if _, err := k.Buka(context.Background(), "vault:v1:AAAA"); err != nil || jalur != "/v1/transit/decrypt/kek-uji" {
		t.Fatalf("jalur %q galat %v", jalur, err)
	}
}

// Rewrap memanggil jalur rewrap (kebijakan token pembungkus-ulang hanya mengizinkan jalur itu) dan mengembalikan ciphertext baru.
func TestRewrapJalur(t *testing.T) {
	var jalur string
	k := tiruan(t, func(w http.ResponseWriter, r *http.Request) {
		jalur = r.URL.Path
		json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"ciphertext": "vault:v2:BBBB"}})
	})
	baru, err := k.Rewrap(context.Background(), "vault:v1:AAAA")
	if err != nil || baru != "vault:v2:BBBB" || jalur != "/v1/transit/rewrap/kek-uji" {
		t.Fatalf("jalur %q, hasil %q, galat %v", jalur, baru, err)
	}
}

func TestStatusBukan2xxMenjadiGalatBao(t *testing.T) {
	for _, status := range []int{400, 403, 404, 500, 503} {
		k := tiruan(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(status)
			json.NewEncoder(w).Encode(map[string]any{"errors": []string{"pesan dari server"}})
		})
		_, err := k.Buka(context.Background(), "vault:v1:AAAA")
		var g *GalatBao
		if !errors.As(err, &g) || g.Status != status || len(g.Pesan) != 1 {
			t.Errorf("status %d: dapat %v", status, err)
		}
	}
}

func TestDataKeyBukan32Byte(t *testing.T) {
	k := tiruan(t, func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"plaintext": base64.StdEncoding.EncodeToString(make([]byte, 16)), "ciphertext": "vault:v1:AAAA"}})
	})
	if _, _, err := k.BuatDataKey(context.Background()); err == nil {
		t.Fatal("data key 16 byte harus ditolak")
	}
}

func TestRewrapTidakBolehMenjawabPlaintext(t *testing.T) {
	k := tiruan(t, func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"plaintext": "AAAA", "ciphertext": "vault:v2:AAAA"}})
	})
	if _, err := k.Rewrap(context.Background(), "vault:v1:AAAA"); err == nil {
		t.Fatal("rewrap yang menjawab plaintext harus ditolak")
	}
}

func TestJawabanTanpaDataDitolak(t *testing.T) {
	k := tiruan(t, func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{}`)) })
	if _, err := k.Buka(context.Background(), "vault:v1:AAAA"); err == nil {
		t.Fatal("jawaban 200 tanpa data harus ditolak")
	}
}

// Jawaban 200 yang bentuknya rusak tidak boleh lolos: string kosong (data key terbungkus kosong, plaintext kosong) dan
// base64 yang tidak sah. Tiap panggilan diuji sendiri supaya yang menolak adalah pemeriksaan jawaban, bukan panjang data key.
func TestJawabanRusakDitolak(t *testing.T) {
	dek := base64.StdEncoding.EncodeToString(make([]byte, 32))
	jawab := func(data map[string]any) *Klien {
		return tiruan(t, func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{"data": data})
		})
	}
	if _, _, err := jawab(map[string]any{"plaintext": dek, "ciphertext": ""}).BuatDataKey(context.Background()); err == nil {
		t.Error("BuatDataKey: data key terbungkus kosong harus ditolak")
	}
	if _, err := jawab(map[string]any{"plaintext": ""}).Buka(context.Background(), "vault:v1:AAAA"); err == nil {
		t.Error("Buka: plaintext kosong harus ditolak")
	}
	if b, err := jawab(map[string]any{"plaintext": "!!bukan-base64!!"}).Buka(context.Background(), "vault:v1:AAAA"); err == nil {
		t.Errorf("Buka: plaintext yang bukan base64 harus ditolak, dapat %d byte", len(b))
	}
	if _, err := jawab(map[string]any{"ciphertext": ""}).Rewrap(context.Background(), "vault:v1:AAAA"); err == nil {
		t.Error("Rewrap: ciphertext kosong harus ditolak")
	}
}

// Tes dengan OpenBao sungguhan: BAO_ADDR, BAO_TOKEN, dan BAO_KUNCI diisi `make test`. Tanpa itu dilewati, kecuali TES_KMS_WAJIB=1.
func openbao(t *testing.T) *Klien {
	k := &Klien{Alamat: os.Getenv("BAO_ADDR"), Token: os.Getenv("BAO_TOKEN"), Kunci: os.Getenv("BAO_KUNCI")}
	if k.Alamat == "" || k.Token == "" || k.Kunci == "" {
		if os.Getenv("TES_KMS_WAJIB") == "1" {
			t.Fatal("TES_KMS_WAJIB=1 tetapi BAO_ADDR, BAO_TOKEN, atau BAO_KUNCI kosong")
		}
		t.Skip("tanpa OpenBao")
	}
	return k
}

func TestOpenBaoBolakBalik(t *testing.T) {
	k := openbao(t)
	dek, terbungkus, err := k.BuatDataKey(context.Background())
	if err != nil || len(dek) != 32 || !strings.HasPrefix(terbungkus, "vault:v") {
		t.Fatalf("data key: %d byte, %q, %v", len(dek), terbungkus, err)
	}
	balik, err := k.Buka(context.Background(), terbungkus)
	if err != nil || string(balik) != string(dek) {
		t.Fatalf("buka: %v", err)
	}
}

func TestOpenBaoMenolakTokenSalahDanCiphertextRusak(t *testing.T) {
	k := openbao(t)
	_, terbungkus, err := k.BuatDataKey(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	asing := *k
	asing.Token = "bukan-token"
	var g *GalatBao
	if _, err := asing.Buka(context.Background(), terbungkus); !errors.As(err, &g) || g.Status != 403 {
		t.Fatalf("token tidak dikenal harus 403 dari OpenBao, dapat %v", err)
	}
	b, _ := base64.StdEncoding.DecodeString(strings.SplitN(terbungkus, ":", 3)[2])
	b[20] ^= 1
	rusak := strings.SplitN(terbungkus, ":", 3)[0] + ":" + strings.SplitN(terbungkus, ":", 3)[1] + ":" + base64.StdEncoding.EncodeToString(b)
	if _, err := k.Buka(context.Background(), rusak); !errors.As(err, &g) || g.Status != 400 || !strings.Contains(strings.Join(g.Pesan, " "), "message authentication failed") {
		t.Fatalf("data key terbungkus yang diubah harus 400 'message authentication failed', dapat %v", err)
	}
	tak := *k
	tak.Kunci = "kunci-yang-tidak-ada"
	if _, err := tak.Buka(context.Background(), terbungkus); !errors.As(err, &g) || g.Status != 400 {
		t.Fatalf("kunci tidak ada harus 400, dapat %v", err)
	}
}
