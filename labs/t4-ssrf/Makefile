# Lab t4-ssrf (Tahap 4): verifikasi defensif fetcher gambar versi aman (labs/api-t4/internal/unduh). Tanpa database dan tanpa
# Docker: semua server uji hanya mendengar di 127.0.0.1 di dalam proses tes Go.
.PHONY: run cek mutasi
# Rekam semua bagian berurutan. Satu bagian: make run BAGIAN=batas   (batas alamat testing)
run:
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Uji mutasi atas internal/unduh dan internal/klien (±20 menit, butuh Docker). Tidak menulis output/.
mutasi:
	../.venv/bin/python mutasi.py $(MUTAN)
