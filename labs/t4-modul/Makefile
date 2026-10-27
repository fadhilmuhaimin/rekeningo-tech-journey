# Lab t4-modul (Tahap 4): batas modul, schema dan role per modul, dan service pembayaran yang meminta jurnal lewat API ledger,
# di atas labs/api-t4. Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema tahap4_modul (dan enam schema t4m_*) dan data awal dari nol.
# Satu bagian: make run BAGIAN=latensi   (batas ledger proses-mati latensi testing)
# Server, skema, gateway tiruan, dan data awal dari ../api-t4 (dasar_t4.py): lab ini tidak menyalinnya.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
