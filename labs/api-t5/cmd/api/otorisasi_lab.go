package main

import (
	"encoding/json"
	"net/http"

	"lab/apit5/internal/service"
)

// pasangEndpointOtorisasi (hanya dengan -lab): GET /lab/otorisasi memperlihatkan jumlah keputusan otorisasi kartu di
// pod ini sejak proses mulai dan rasio tolaknya. Analisis rollout (lab t5-rollout, M49) membacanya dari pod canary.
func pasangEndpointOtorisasi(rute *http.ServeMux, h *service.HitungOtorisasi) {
	rute.HandleFunc("GET /lab/otorisasi", func(w http.ResponseWriter, r *http.Request) {
		total, setuju, tolak, rasio := h.Ringkas()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"total": total, "setuju": setuju, "tolak": tolak, "rasio_tolak": rasio})
	})
}
