# Lab t3-dasbor (Tahap 3): dasbor kecil Wulan, mode rentan dan benar untuk M25 (XSS, CSRF, cookie, WebAuthn).
# Port dan nama kontainer dari lingkungan (labs/README.md). Butuh Docker, Go, Node (Playwright dari situs/).
include ../lab_env.mk
.PHONY: run cek test mutasi

# Rekam semua bagian berurutan (±1 menit); setiap bagian membuat ulang schema dan data awal dari nol.
# Satu bagian: make run BAGIAN=csrf   (xss csrf webauthn)
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes Go: pagar loopback dan gerbang cookie/CSRF (tanpa PostgreSQL, tanpa Node).
test:
	cd go && go vet ./... && go test -count=1 ./...

# Uji mutasi: ubah satu hal di kode dan pastikan lab GAGAL (mutasi.py; satu mutasi: make mutasi MUTASI=escape-selalu-rentan).
mutasi:
	../.venv/bin/python mutasi.py $(MUTASI)
