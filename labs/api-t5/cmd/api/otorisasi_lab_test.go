//go:build t5rollout

package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"lab/apit5/internal/service"
)

// GET /lab/otorisasi (lab t5-rollout): analisis rollout membaca total dan rasio tolak dari pod canary.
func TestEndpointOtorisasiMemperlihatkanPencacah(t *testing.T) {
	h := &service.HitungOtorisasi{}
	for i := 0; i < 7; i++ {
		h.Catat(service.Keputusan{Keputusan: "setuju"})
	}
	for i := 0; i < 3; i++ {
		h.Catat(service.Keputusan{Keputusan: "tolak", Alasan: "versi-baru"})
	}
	mux := http.NewServeMux()
	pasangEndpointOtorisasi(mux, h)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/lab/otorisasi", nil))
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("status %d, jenis %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	var got struct {
		Total, Setuju, Tolak int64
		RasioTolak           float64 `json:"rasio_tolak"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.Total != 10 || got.Setuju != 7 || got.Tolak != 3 || got.RasioTolak != 0.3 {
		t.Fatalf("jawaban %+v, ingin total 10, setuju 7, tolak 3, rasio_tolak 0,3", got)
	}
}
