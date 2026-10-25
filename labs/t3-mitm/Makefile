# Lab t3-mitm (Tahap 3): proxy tiruan, pinning SPKI, dan rotasi pin. Port dan nama kontainer dari lingkungan (labs/README.md).
include ../lab_env.mk
.PHONY: run cek test mutasi
# Rekam semua bagian berurutan (±3 menit); setiap bagian membuat ulang schema dan data awal dari nol.
# Satu bagian: make run BAGIAN=pin   (m26 pin dio hsts token)
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes Go untuk pki, tepi, dan mitm (tanpa PostgreSQL) dan analisis statis client Dart.
test:
	cd go && go vet ./... && go test -count=1 ./...
	cd dart && dart pub get && dart analyze

# Uji mutasi: ubah satu hal di kode dan pastikan lab gagal (mutasi.py; satu mutasi: make mutasi MUTASI=pin-hash-berubah).
mutasi:
	../.venv/bin/python mutasi.py $(MUTASI)
