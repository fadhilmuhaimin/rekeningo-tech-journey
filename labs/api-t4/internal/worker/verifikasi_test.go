package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/push"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// Tes pekerjaan verifikasi di worker (M31, ADR 25, ADR 36) dengan PostgreSQL sungguhan. Layanan verifikasi adalah
// server httptest: tiruan lokal.

type vendorTes struct {
	srv   *httptest.Server
	mu    sync.Mutex
	mode  string // "", "503", "422" (permintaan salah), "ditolak", "tidur"
	tidur time.Duration
	kunci []string
	n     atomic.Int32
}

func vendorUji(t *testing.T) *vendorTes {
	v := &vendorTes{}
	v.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		v.n.Add(1)
		v.mu.Lock()
		mode, tidur := v.mode, v.tidur
		v.kunci = append(v.kunci, r.Header.Get("Idempotency-Key"))
		v.mu.Unlock()
		switch mode {
		case "503":
			http.Error(w, "mati", 503)
			return
		case "422":
			http.Error(w, "dokumen tidak terbaca", 422)
			return
		case "tidur":
			select {
			case <-time.After(tidur):
			case <-r.Context().Done():
				return
			}
		}
		status := "lulus"
		if mode == "ditolak" {
			status = "ditolak"
		}
		json.NewEncoder(w).Encode(map[string]string{"referensi_vendor": "VND-1", "status": status})
	}))
	t.Cleanup(v.srv.Close)
	return v
}

func (v *vendorTes) atur(mode string, tidur time.Duration) {
	v.mu.Lock()
	v.mode, v.tidur = mode, tidur
	v.mu.Unlock()
}

// pengajuan: akun pemakai, satu baris verifikasi diajukan, dan satu pekerjaan di outbox. Kembali: akun dan verifikasi.
func pengajuan(t *testing.T, db *sql.DB) (akun, ver int64) {
	t.Helper()
	db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 300000) + 1 FROM akun`).Scan(&akun)
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash) VALUES ($1::bigint, 'pemakai', 'Tes verifikasi', 'v' || $1::text || '@publik.example', '!')`, akun); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, 'pemakai', 'identitas/k', 'identitas/s', 'ck', 'cs') RETURNING id`, akun).Scan(&ver); err != nil {
		t.Fatal(err)
	}
	payload, _ := json.Marshal(map[string]int64{"verifikasi_id": ver})
	if _, err := db.Exec(`INSERT INTO outbox (akun_id, kelas, jenis, tujuan, payload) VALUES ($1, 1, 'verifikasi', 'verifikasi', $2)`, akun, payload); err != nil {
		t.Fatal(err)
	}
	return akun, ver
}

func keadaan(t *testing.T, db *sql.DB, akun, ver int64) (statusVer, tingkat, statusOutbox string, percobaan int) {
	t.Helper()
	db.QueryRow(`SELECT status FROM verifikasi WHERE id = $1`, ver).Scan(&statusVer)
	db.QueryRow(`SELECT tingkat FROM akun WHERE id = $1`, akun).Scan(&tingkat)
	db.QueryRow(`SELECT status, percobaan FROM outbox WHERE akun_id = $1`, akun).Scan(&statusOutbox, &percobaan)
	return
}

func workerVerifikasi(r repo.Repo, v *vendorTes, tujuan ...string) *Worker {
	k := konfigTes()
	k.Tujuan = tujuan
	var w = Baru(r, push.Baru("http://127.0.0.1:1", time.Second), k)
	if v != nil {
		w = w.DenganVerifikasi(verifikasi.Baru(v.srv.URL, 400*time.Millisecond))
	}
	return w
}

func TestVerifikasiLulusMenaikkanTingkat(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	akun, ver := pengajuan(t, db)
	h, err := workerVerifikasi(r, v).Putaran(context.Background())
	if err != nil || h.Terkirim != 1 {
		t.Fatalf("%+v %v", h, err)
	}
	sv, tg, so, p := keadaan(t, db, akun, ver)
	if sv != "lulus" || tg != "terverifikasi" || so != "terkirim" || p != 1 {
		t.Errorf("lulus: verifikasi %s, tingkat %s, outbox %s/%d", sv, tg, so, p)
	}
	if len(v.kunci) != 1 || v.kunci[0] != fmt.Sprint(ver) {
		t.Errorf("Idempotency-Key ke vendor = %v, harus id pengajuan %d", v.kunci, ver)
	}
	var ref *string
	var hapus *time.Time
	var selesai *time.Time
	db.QueryRow(`SELECT referensi_vendor, hapus_pada, selesai FROM verifikasi WHERE id = $1`, ver).Scan(&ref, &hapus, &selesai)
	if ref == nil || *ref != "VND-1" || selesai == nil || hapus == nil || hapus.Sub(*selesai).Round(time.Hour) != 30*24*time.Hour {
		t.Errorf("referensi %v, selesai %v, hapus_pada %v (harus selesai + 30 hari)", ref, selesai, hapus)
	}
}

func TestVerifikasiDitolakTidakMenaikkanTingkat(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("ditolak", 0)
	akun, ver := pengajuan(t, db)
	if h, err := workerVerifikasi(r, v).Putaran(context.Background()); err != nil || h.Terkirim != 1 {
		t.Fatalf("%+v %v", h, err)
	}
	if sv, tg, so, _ := keadaan(t, db, akun, ver); sv != "ditolak" || tg != "belum" || so != "terkirim" {
		t.Errorf("ditolak: %s %s %s", sv, tg, so)
	}
}

func TestVerifikasiTimeoutTidakPastiLaluPulih(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("tidur", 3*time.Second)
	akun, ver := pengajuan(t, db)
	w := workerVerifikasi(r, v)
	if h, _ := w.Putaran(context.Background()); h.Ditunda != 1 {
		t.Fatalf("timeout: %+v", h)
	}
	sv, tg, so, p := keadaan(t, db, akun, ver)
	if sv != "tidak_pasti" || tg != "belum" || so != "menunggu" || p != 1 {
		t.Errorf("timeout harus tidak_pasti (bukan gagal) dan pekerjaan menunggu: %s %s %s %d", sv, tg, so, p)
	}
	v.atur("", 0)
	time.Sleep(20 * time.Millisecond) // lewat backoff
	if h, _ := w.Putaran(context.Background()); h.Terkirim != 1 {
		t.Fatalf("sesudah pulih: %+v", h)
	}
	if sv, tg, _, p := keadaan(t, db, akun, ver); sv != "lulus" || tg != "terverifikasi" || p != 2 {
		t.Errorf("sesudah pulih: %s %s %d", sv, tg, p)
	}
	if len(v.kunci) != 2 || v.kunci[0] != v.kunci[1] {
		t.Errorf("retry memakai key yang sama: %v", v.kunci)
	}
}

func TestVerifikasiVendorMatiLimaPercobaanLaluGagal(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	akun, ver := pengajuan(t, db)
	w := workerVerifikasi(r, v)
	for i := 1; i <= 5; i++ {
		time.Sleep(10 * time.Millisecond)
		w.Putaran(context.Background())
		_, _, so, p := keadaan(t, db, akun, ver)
		harus := "menunggu"
		if i == 5 {
			harus = "mati"
		}
		if so != harus || p != i {
			t.Fatalf("percobaan %d: outbox %s/%d", i, so, p)
		}
	}
	sv, tg, _, _ := keadaan(t, db, akun, ver)
	if sv != "gagal" || tg != "belum" || v.n.Load() != 5 {
		t.Errorf("vendor mati: verifikasi %s, tingkat %s, %d panggilan (harus gagal, belum, 5)", sv, tg, v.n.Load())
	}
	// sesudah dead-letter tidak ada pekerjaan yang tersisa: vendor yang pulih tidak menghidupkannya (lajur dan breaker: t4-integrasi).
	v.atur("", 0)
	time.Sleep(10 * time.Millisecond)
	if h, _ := w.Putaran(context.Background()); h.Diklaim != 0 {
		t.Errorf("baris mati diklaim lagi: %+v", h)
	}
}

func TestVerifikasiLajurDanKlaimTunggal(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	akun, ver := pengajuan(t, db)
	// worker lajur push tidak menyentuh pekerjaan verifikasi.
	if h, _ := workerVerifikasi(r, v, "push").Putaran(context.Background()); h.Diklaim != 0 || v.n.Load() != 0 {
		t.Errorf("lajur push mengklaim pekerjaan verifikasi: %+v, %d panggilan", h, v.n.Load())
	}
	// dua worker lajur verifikasi bersamaan: satu klaim, satu panggilan ke vendor (FOR UPDATE SKIP LOCKED + klaim_sampai).
	var wg sync.WaitGroup
	var klaim atomic.Int32
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			h, _ := workerVerifikasi(r, v, "verifikasi").Putaran(context.Background())
			klaim.Add(int32(h.Diklaim))
		}()
	}
	wg.Wait()
	if klaim.Load() != 1 || v.n.Load() != 1 {
		t.Errorf("klaim %d, panggilan vendor %d (harus 1 dan 1)", klaim.Load(), v.n.Load())
	}
	if sv, _, _, _ := keadaan(t, db, akun, ver); sv != "lulus" {
		t.Errorf("status %s", sv)
	}
}

func TestVerifikasiYangSudahSelesaiDilewati(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	akun, ver := pengajuan(t, db)
	db.Exec(`UPDATE verifikasi SET status = 'ditolak' WHERE id = $1`, ver)
	if h, _ := workerVerifikasi(r, v).Putaran(context.Background()); h.Dilewati != 1 || v.n.Load() != 0 {
		t.Errorf("%+v, %d panggilan", h, v.n.Load())
	}
	if _, _, so, _ := keadaan(t, db, akun, ver); so != "dilewati" {
		t.Errorf("outbox %s", so)
	}
}

func TestVerifikasiTanpaVendorDitundaTanpaMengubahApaPun(t *testing.T) {
	r, db := siapkan(t)
	akun, ver := pengajuan(t, db)
	if h, _ := workerVerifikasi(r, nil).Putaran(context.Background()); h.Ditunda != 1 {
		t.Fatalf("%+v", h)
	}
	if sv, tg, so, _ := keadaan(t, db, akun, ver); sv != "diajukan" || tg != "belum" || so != "menunggu" {
		t.Errorf("%s %s %s", sv, tg, so)
	}
}
