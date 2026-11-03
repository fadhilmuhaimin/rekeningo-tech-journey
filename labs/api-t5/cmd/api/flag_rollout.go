package main

import (
	"flag"

	"lab/apit5/internal/service"
)

// Flag lab t5-rollout (M49, ADR 55), didaftarkan di tingkat paket dan dibaca main sesudah flag.Parse.
var (
	sakelarTabel   = flag.Bool("sakelar-tabel", false, "kill switch kartu dari tabel sakelar yang dibaca semua pod; nilai tidak terbaca = tolak (ADR 55, lab t5-rollout); mati = flag memori satu proses (ADR 42, versi pertama M49)")
	sakelarTTL     = flag.Duration("sakelar-ttl", service.TTLSakelar, "dengan -sakelar-tabel: lama nilai sakelar dipakai ulang sebelum dibaca lagi (Asumsi naskah: 5 detik)")
	labTolakPersen = flag.Int("lab-tolak-persen", 0, "lab saja: otorisasi kartu ditolak dengan alasan versi-baru sebanyak persen ini, tersebar rata (memerankan versi baru yang salah, M49)")
)
