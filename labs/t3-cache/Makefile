# Lab t3-cache (Tahap 3): katalog di memori proses lawan Redis, di atas labs/api-t3.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema tahap3_cache dan data awal dari nol (keputusan 968).
# Satu bagian: make run BAGIAN=redis   (memori redis gagal beban)
# Server, skema, cache katalog, dan data awal dari ../api-t3 (dasar_t3.py): lab ini tidak menyalinnya.
# PostgreSQL dari ../b3-race, Redis dari ../b9-cache (satu proyek compose per lajur).
run:
	$(MAKE) -C ../b3-race up
	docker compose -f ../b9-cache/docker-compose.yml up -d --wait redis
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
