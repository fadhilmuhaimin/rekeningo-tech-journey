# Lab t3-offline (Tahap 3): sinkron stok dan harga, key 24 jam lawan offline 62 jam, di atas labs/api-t3.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema tahap3_offline dan data awal dari nol (keputusan 971).
# Satu bagian: make run BAGIAN=m24   (m24 versi kunci24 sinkron14)
# Server, skema, dan data awal dari ../api-t3 (dasar_t3.py): lab ini tidak menyalinnya.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
