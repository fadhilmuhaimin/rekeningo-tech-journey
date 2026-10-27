package handler

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"lab/apit4/internal/service"
)

// API ledger untuk service pembayaran (ADR 37, lab t4-modul). Berkas ini sengaja tidak bernama handler*.go: tes
// kontrak_test.go membandingkan rute publik di handler*.go dengan openapi.yaml, dan rute ini bukan rute publik. Bukan bagian kontrak publik (openapi.yaml): hanya
// service pembayaran yang memanggilnya, dengan kunci layanan di header X-Layanan-Kunci. Tanpa kunci yang
// dikonfigurasi, rute ini tidak dipasang sama sekali.

// KunciLayananHeader: kunci bersama antar service (di lab: data lab, bukan secret).
const KunciLayananHeader = "X-Layanan-Kunci"

// PasangLedger memasang POST /ledger/jurnal-topup di mux. Kunci kosong = tidak memasang apa pun.
func PasangLedger(mux *http.ServeMux, svc service.Service, kunciLayanan string) {
	if kunciLayanan == "" {
		return
	}
	mux.HandleFunc("POST /ledger/jurnal-topup", func(w http.ResponseWriter, r *http.Request) {
		// Perbandingan waktu tetap; kunci salah dan kunci kosong dijawab sama.
		if subtle.ConstantTimeCompare([]byte(r.Header.Get(KunciLayananHeader)), []byte(kunciLayanan)) != 1 {
			ledgerJawab(w, http.StatusUnauthorized, map[string]any{"alasan": "kunci-layanan"})
			return
		}
		kunci := r.Header.Get("Idempotency-Key")
		if kunci == "" {
			ledgerJawab(w, http.StatusBadRequest, map[string]any{"alasan": "idempotency-key-wajib"})
			return
		}
		var in struct {
			OrderID string `json:"order_id"`
			AkunID  int64  `json:"akun_id"`
			Jumlah  int64  `json:"jumlah"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in) != nil || in.OrderID == "" || in.AkunID <= 0 {
			ledgerJawab(w, http.StatusBadRequest, map[string]any{"alasan": "body-tidak-sah"})
			return
		}
		h, err := svc.LedgerKreditTopup(r.Context(), kunci, in.OrderID, in.AkunID, in.Jumlah)
		var ev service.ErrValidasi
		status, isi := http.StatusInternalServerError, map[string]any{"alasan": "galat-server"}
		switch {
		case err == nil && h.Ulang:
			status, isi = http.StatusOK, map[string]any{"jurnal": h.Jurnal, "ulang": true}
		case err == nil:
			status, isi = http.StatusCreated, map[string]any{"jurnal": h.Jurnal, "ulang": false}
		case errors.As(err, &ev):
			status, isi = http.StatusUnprocessableEntity, map[string]any{"alasan": "tidak-sah", "field": ev.Field}
		case errors.Is(err, service.ErrKunciBentrok):
			status, isi = http.StatusUnprocessableEntity, map[string]any{"alasan": "key-dipakai-permintaan-lain"}
		case errors.Is(err, service.ErrDibekukan):
			status, isi = http.StatusUnprocessableEntity, map[string]any{"alasan": "akun-dibekukan"}
		case errors.Is(err, service.ErrBatasTingkat):
			status, isi = http.StatusUnprocessableEntity, map[string]any{"alasan": "batas-tingkat"}
		case errors.Is(err, service.ErrTidakDitemukan):
			status, isi = http.StatusNotFound, map[string]any{"alasan": "akun-tidak-ada"}
		default:
			log.Printf("ledger jurnal-topup %s: %v", kunci, err)
		}
		// Satu baris per panggilan, supaya lab bisa menunjukkan dua panggilan dengan key yang sama dan jurnal yang sama.
		log.Printf("ledger: key=%s status=%d jurnal=%v ulang=%v", kunci, status, isi["jurnal"], isi["ulang"])
		ledgerJawab(w, status, isi)
	})
}

func ledgerJawab(w http.ResponseWriter, status int, isi map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(isi)
}
