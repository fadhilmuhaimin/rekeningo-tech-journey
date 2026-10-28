# Lab t4-pipeline (Tahap 4): pemeriksaan merge per modul atas kontrak dan image api-t4 (oasdiff, client Dart, gosec,
# govulncheck, syft, grype, cosign). Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek test verifikasi-alat bersih
# Rekam semua bagian berurutan; tiap bagian membuat ulang folder kerjanya di .kerja dari nol.
# Satu bagian: make run BAGIAN=kontrak   (kontrak klien sast sbom tanda testing)
# Tanpa PostgreSQL: lab ini tidak memakai database (alat membaca berkas dan image).
run:
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes kebijakan gerbang (tanpa alat, tanpa jaringan).
test:
	python3 -B -m unittest -v tes_gerbang tes_alat

# Tanda tangan rilis alat (sigstore, butuh jaringan). Bukan bagian run: hasilnya dicatat di README dengan tanggal.
verifikasi-alat:
	../.venv/bin/python verifikasi_alat.py

# Hapus unduhan dan basis data (±3,4 GB di .alat) dan folder kerja; run berikutnya mengunduh dan memverifikasi lagi.
bersih:
	rm -rf .alat .kerja
