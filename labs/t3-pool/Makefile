# Lab t3-pool (Tahap 3): layanan push yang menggantung dan connection pool. Port dan nama kontainer dari lingkungan (labs/README.md).
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan (±5 menit); setiap bagian membuat ulang schema dan data awal dari nol.
# Satu bagian: make run BAGIAN=little   (m18 little adr22 jejak)
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
