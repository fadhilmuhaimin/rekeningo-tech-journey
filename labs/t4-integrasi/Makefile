# Lab t4-integrasi (Tahap 4): layanan verifikasi tiruan, retry, breaker, dan lajur queue di atas labs/api-t4.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema t4_integrasi dan data awal dari nol.
# Satu bagian: make run BAGIAN=lajur   (lajur retry worker breaker testing)
# Server, skema, worker, dan pihak ketiga tiruan dari ../api-t4 (dasar_t4.py): lab ini tidak menyalinnya.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
