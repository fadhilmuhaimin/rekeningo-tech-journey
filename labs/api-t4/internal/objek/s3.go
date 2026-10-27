package objek

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// S3 adalah klien penyimpanan objek yang berbicara S3 (SigV4 dengan parameter di query string, gaya path) dan
// ditulis dengan pustaka standar saja: tidak ada dependency baru. Semua operasi memakai URL bertanda tangan
// berumur pendek, jadi hanya ada satu jalur penandatanganan yang dites. Penyimpanan di belakangnya adalah
// SeaweedFS lokal di container lab (labs/t4-storage); tidak ada layanan atau kredensial nyata.
//
// Kunci akses dan rahasia adalah data lab, bukan secret. Pesan galat tidak pernah memuat URL: URL bertanda
// tangan adalah bearer token (ADR 38), dan *url.Error dari net/http menulis URL lengkap di pesannya.
type S3 struct {
	Endpoint string // mis. http://127.0.0.1:<port lab>, tanpa garis miring di akhir
	Bucket   string
	Kunci    string // access key
	Rahasia  string // secret key
	Region   string // bawaan us-east-1
	Jam      func() time.Time
	HTTP     *http.Client

	// MaksBaca membatasi byte yang dibaca Baca dari satu objek (0 = tanpa batas). Objek yang lebih besar ditolak
	// dengan ErrTerlaluBesar, bukan dibaca ke memori.
	MaksBaca int64
}

var (
	// ErrTerlaluBesar: objek lebih besar dari S3.MaksBaca.
	ErrTerlaluBesar = errors.New("objek lebih besar dari batas baca")
	// umurPanggilan: umur URL yang dibuat server untuk panggilannya sendiri.
	umurPanggilan = time.Minute
)

// BatasUmurPresign: kedua ujung X-Amz-Expires menurut dokumentasi SigV4 (1 sampai 604800 detik).
const (
	UmurPresignMin = time.Second
	UmurPresignMax = 604800 * time.Second
)

func (s S3) kini() time.Time {
	if s.Jam != nil {
		return s.Jam().UTC()
	}
	return time.Now().UTC()
}

func (s S3) region() string {
	if s.Region == "" {
		return "us-east-1"
	}
	return s.Region
}

// klienBawaan: satu client untuk semua panggilan (koneksi dipakai ulang), tanpa proxy dan tanpa mengikuti redirect.
var klienBawaan = &http.Client{Timeout: 30 * time.Second, Transport: &http.Transport{Proxy: nil},
	CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}

func (s S3) klien() *http.Client {
	if s.HTTP != nil {
		return s.HTTP
	}
	return klienBawaan
}

func hmacSHA256(kunci []byte, pesan string) []byte {
	h := hmac.New(sha256.New, kunci)
	h.Write([]byte(pesan))
	return h.Sum(nil)
}

// kodeS3 meng-encode sesuai aturan SigV4: huruf, angka, '-', '_', '.', '~' apa adanya; sisanya %XX huruf besar.
func kodeS3(s string, garisMiring bool) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c >= 'A' && c <= 'Z', c >= 'a' && c <= 'z', c >= '0' && c <= '9', c == '-', c == '_', c == '.', c == '~':
			b.WriteByte(c)
		case c == '/' && garisMiring:
			b.WriteByte(c)
		default:
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

// tandaiURL menghitung URL bertanda tangan untuk host dan jalur tertentu. `header` adalah header (nama huruf
// kecil) yang ikut ditandatangani selain host; client harus mengirim persis nilai itu. Dipisah dari PresignPUT
// supaya contoh bertanda tangan dari dokumentasi AWS bisa dipakai sebagai tes.
func tandaiURL(skema, host, jalur, metode, kunci, rahasia, region string, waktu time.Time, umur time.Duration, header map[string]string) string {
	waktu = waktu.UTC()
	stempel := waktu.Format("20060102T150405Z")
	tanggal := stempel[:8]
	h := map[string]string{"host": host}
	for k, v := range header {
		h[strings.ToLower(k)] = strings.TrimSpace(v)
	}
	nama := make([]string, 0, len(h))
	for k := range h {
		nama = append(nama, k)
	}
	sort.Strings(nama)
	ditandatangani := strings.Join(nama, ";")
	q := map[string]string{
		"X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
		"X-Amz-Credential":    fmt.Sprintf("%s/%s/%s/s3/aws4_request", kunci, tanggal, region),
		"X-Amz-Date":          stempel,
		"X-Amz-Expires":       fmt.Sprint(int64(umur / time.Second)),
		"X-Amz-SignedHeaders": ditandatangani,
	}
	kq := make([]string, 0, len(q))
	for k := range q {
		kq = append(kq, k)
	}
	sort.Strings(kq)
	var qs []string
	for _, k := range kq {
		qs = append(qs, kodeS3(k, false)+"="+kodeS3(q[k], false))
	}
	query := strings.Join(qs, "&")
	var ch strings.Builder
	for _, k := range nama {
		ch.WriteString(k + ":" + h[k] + "\n")
	}
	jalurKanonik := kodeS3(jalur, true)
	kanonik := strings.Join([]string{metode, jalurKanonik, query, ch.String(), ditandatangani, "UNSIGNED-PAYLOAD"}, "\n")
	hash := sha256.Sum256([]byte(kanonik))
	ruang := fmt.Sprintf("%s/%s/s3/aws4_request", tanggal, region)
	untukDitandatangani := strings.Join([]string{"AWS4-HMAC-SHA256", stempel, ruang, hex.EncodeToString(hash[:])}, "\n")
	kunciTTD := hmacSHA256(hmacSHA256(hmacSHA256(hmacSHA256([]byte("AWS4"+rahasia), tanggal), region), "s3"), "aws4_request")
	tanda := hex.EncodeToString(hmacSHA256(kunciTTD, untukDitandatangani))
	return skema + "://" + host + jalurKanonik + "?" + query + "&X-Amz-Signature=" + tanda
}

func (s S3) pecahEndpoint() (skema, host string, err error) {
	u, err := url.Parse(s.Endpoint)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", "", errors.New("penyimpanan objek: endpoint tidak sah")
	}
	return u.Scheme, u.Host, nil
}

func (s S3) presign(metode, jalur string, umur time.Duration, header map[string]string) (string, error) {
	if umur < UmurPresignMin || umur > UmurPresignMax {
		return "", errors.New("penyimpanan objek: umur URL di luar 1 detik sampai 7 hari")
	}
	skema, host, err := s.pecahEndpoint()
	if err != nil {
		return "", err
	}
	return tandaiURL(skema, host, jalur, metode, s.Kunci, s.Rahasia, s.region(), s.kini(), umur, header), nil
}

func (s S3) jalurObjek(kunci string) (string, error) {
	if !kunciSah.MatchString(kunci) {
		return "", fmt.Errorf("kunci objek tidak sah: %q", kunci)
	}
	return "/" + s.Bucket + "/" + kunci, nil
}

// PresignPUT membuat URL untuk satu PUT ke kunci itu, berlaku `umur`. Siapa pun yang memegang URL bisa memakainya
// sampai kedaluwarsa dan menimpa objeknya (URL ini bearer token). ukuran > 0 menandatangani header Content-Length,
// jadi penyimpanan menolak PUT yang panjangnya lain; ukuran <= 0 tidak membatasi ukuran apa pun.
func (s S3) PresignPUT(kunci string, umur time.Duration, ukuran int64) (string, error) {
	jalur, err := s.jalurObjek(kunci)
	if err != nil {
		return "", err
	}
	var h map[string]string
	if ukuran > 0 {
		h = map[string]string{"content-length": fmt.Sprint(ukuran)}
	}
	return s.presign(http.MethodPut, jalur, umur, h)
}

// galatS3 membuang URL dari galat jaringan: hanya sebab aslinya yang dipertahankan.
func galatS3(aksi string, err error) error {
	var ue *url.Error
	if errors.As(err, &ue) {
		err = ue.Err
	}
	return fmt.Errorf("penyimpanan objek %s: %w", aksi, err)
}

func (s S3) panggil(ctx context.Context, metode, kunci string, isi []byte) (*http.Response, error) {
	jalur, err := s.jalurObjek(kunci)
	if err != nil {
		return nil, err
	}
	return s.panggilJalur(ctx, metode, jalur, isi)
}

func (s S3) panggilJalur(ctx context.Context, metode, jalur string, isi []byte) (*http.Response, error) {
	u, err := s.presign(metode, jalur, umurPanggilan, nil)
	if err != nil {
		return nil, err
	}
	var badan io.Reader
	if isi != nil {
		badan = bytes.NewReader(isi)
	}
	req, err := http.NewRequestWithContext(ctx, metode, u, badan)
	if err != nil {
		return nil, galatS3(metode, err)
	}
	resp, err := s.klien().Do(req)
	if err != nil {
		return nil, galatS3(metode, err)
	}
	return resp, nil
}

func tutup(r *http.Response) {
	io.Copy(io.Discard, io.LimitReader(r.Body, 1<<16))
	r.Body.Close()
}

// PastikanBucket membuat bucket bila belum ada. Bucket baru privat: tanpa tanda tangan semua akses ditolak.
func (s S3) PastikanBucket(ctx context.Context) error {
	resp, err := s.panggilJalur(ctx, http.MethodPut, "/"+s.Bucket, nil)
	if err != nil {
		return err
	}
	defer tutup(resp)
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusConflict {
		return nil
	}
	return fmt.Errorf("penyimpanan objek membuat bucket: status %d", resp.StatusCode)
}

func (s S3) Simpan(ctx context.Context, kunci string, isi []byte) error {
	resp, err := s.panggil(ctx, http.MethodPut, kunci, isi)
	if err != nil {
		return err
	}
	defer tutup(resp)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("penyimpanan objek PUT: status %d", resp.StatusCode)
	}
	return nil
}

func (s S3) Baca(ctx context.Context, kunci string) ([]byte, error) {
	resp, err := s.panggil(ctx, http.MethodGet, kunci, nil)
	if err != nil {
		return nil, err
	}
	defer tutup(resp)
	switch {
	case resp.StatusCode == http.StatusNotFound:
		return nil, ErrTidakAda
	case resp.StatusCode != http.StatusOK:
		return nil, fmt.Errorf("penyimpanan objek GET: status %d", resp.StatusCode)
	}
	if s.MaksBaca > 0 && resp.ContentLength > s.MaksBaca {
		return nil, ErrTerlaluBesar
	}
	batas := int64(1<<62 - 1)
	if s.MaksBaca > 0 {
		batas = s.MaksBaca + 1
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, batas))
	if err != nil {
		return nil, galatS3("GET", err)
	}
	if s.MaksBaca > 0 && int64(len(b)) > s.MaksBaca {
		return nil, ErrTerlaluBesar
	}
	return b, nil
}

// Ukuran membaca panjang objek lewat HEAD, tanpa mengunduh isinya.
func (s S3) Ukuran(ctx context.Context, kunci string) (int64, error) {
	resp, err := s.panggil(ctx, http.MethodHead, kunci, nil)
	if err != nil {
		return 0, err
	}
	defer tutup(resp)
	switch {
	case resp.StatusCode == http.StatusNotFound:
		return 0, ErrTidakAda
	case resp.StatusCode != http.StatusOK:
		return 0, fmt.Errorf("penyimpanan objek HEAD: status %d", resp.StatusCode)
	case resp.ContentLength < 0:
		return 0, errors.New("penyimpanan objek HEAD: tanpa Content-Length")
	}
	return resp.ContentLength, nil
}

// Hapus menghapus objek; objek yang memang tidak ada dianggap sudah terhapus.
func (s S3) Hapus(ctx context.Context, kunci string) error {
	resp, err := s.panggil(ctx, http.MethodDelete, kunci, nil)
	if err != nil {
		return err
	}
	defer tutup(resp)
	if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNotFound {
		return nil
	}
	return fmt.Errorf("penyimpanan objek DELETE: status %d", resp.StatusCode)
}
