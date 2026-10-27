// Package push adalah client layanan push (di lab: tiruan lokal cmd/pushpalsu; FCM v1 hanya rujukan, R3-16).
// Setiap panggilan punya batas waktu: client Go tanpa pengaturan tidak punya batas, karena "A Timeout of zero means
// no timeout" (net/http, R3-08). Package ini tidak pernah dipanggil di dalam transaction database (ADR 22),
// kecuali oleh mode rentan push-dalam-tx yang merekam M18.
package push

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"lab/apit4/internal/klien"
)

// BatasBawaan: batas waktu satu panggilan ke layanan luar (ADR 22).
const BatasBawaan = 3 * time.Second

// ErrTidakTerdaftar: layanan push menjawab 404 atau 400, token itu tidak dipakai lagi (R3-16: UNREGISTERED,
// INVALID_ARGUMENT). Bukan kegagalan sementara: mengulang tidak mengubah jawabannya.
var ErrTidakTerdaftar = errors.New("token push tidak terdaftar")

// ErrSementara: timeout, jaringan putus, atau layanan menjawab 5xx atau 429. Worker mencoba lagi nanti.
type ErrSementara struct{ Sebab string }

func (e ErrSementara) Error() string { return "push gagal sementara: " + e.Sebab }

// Klien memanggil layanan push lewat HTTP.
type Klien struct {
	url  string
	http *http.Client
}

// Baru: batas 0 membuat client tanpa batas waktu, hanya untuk mode rentan M18. Client dibuat oleh klien.Baru seperti
// semua panggilan keluar lain (ADR 22).
func Baru(url string, batas time.Duration) Klien {
	return Klien{url: url, http: klien.Baru(batas)}
}

// Aktif: ada alamat layanan push.
func (k Klien) Aktif() bool { return k.url != "" }

// --8<-- [start:kirim]
// Kirim mengirim satu pemberitahuan ke satu token. notifikasi_id ikut dikirim dan sama di semua percobaan:
// penerima yang menyaring id itu tidak menampilkan ulangan dua kali (ADR 25).
func (k Klien) Kirim(ctx context.Context, token, notifikasiID, judul, isi string) error {
	body, _ := json.Marshal(map[string]string{"token": token, "notifikasi_id": notifikasiID, "judul": judul, "isi": isi})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.url+"/v1/pesan", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := k.http.Do(req)
	if err != nil {
		return ErrSementara{Sebab: err.Error()}
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
	switch {
	case resp.StatusCode/100 == 2:
		return nil
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusBadRequest:
		return ErrTidakTerdaftar
	default:
		return ErrSementara{Sebab: fmt.Sprintf("status %d", resp.StatusCode)}
	}
}

// --8<-- [end:kirim]
