# Lab t5-gabung (Tahap 5): skor risiko dalam satu proses lawan tiga proses dengan antrean, peraga ADR 50 (kapan menggabungkan kembali).
# Tanpa Docker dan tanpa database: satu biner Go (pustaka standar) di loopback. Port dari lingkungan (labs/README.md,
# "Beberapa lajur sekaligus"): 18340 sampai 18344 ditambah LAB_PORT_OFFSET.
include ../lab_env.mk
.PHONY: run cek test
# Venv lab bila ada (labs/.venv); run.py hanya memakai pustaka standar Python, jadi python3 juga cukup.
PYTHON ?= $(if $(wildcard ../.venv/bin/python),../.venv/bin/python,python3)

# Rekam semua bagian berurutan; tiap bagian memulai proses dari nol.
# Satu bagian: make run BAGIAN=panggilan   (panggilan latensi mati testing)
run:
	$(PYTHON) run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes Go milik lab ini (tanpa proses lab yang berjalan).
test:
	go vet ./... && go test -count=1 ./...
