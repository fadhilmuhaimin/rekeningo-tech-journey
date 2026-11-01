# Lab t5-partisi (Tahap 5): partisi tabel ledger `posting` per bulan, snapshot saldo, DETACH dan ATTACH, di atas labs/api-t5.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; tiap bagian membuat ulang schema (tahap5_partisi, tahap5_lepas, tahap5_partisi_tes) dari nol.
# Satu bagian: make run BAGIAN=lepas   (skala lepas testing)
# Server, skema, dan data awal dari ../api-t5 (dasar_t5.py): lab ini tidak menyalinnya. Redis tidak dipakai.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
