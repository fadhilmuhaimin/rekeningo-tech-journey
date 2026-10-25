# Lab t3-instance (Tahap 3): proxy Caddy, dua instance api-t3, dan rate limit lintas instance. Port dan nama kontainer
# dari lingkungan (labs/README.md). Server api-t3 dan data awalnya dari labs/api-t3.
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema t3_instance dan data awal dari nol (keputusan 965).
# Satu bagian: make run BAGIAN=batas   (proxy panic bergulir batas)
run:
	$(MAKE) -C ../b3-race up
	docker compose -f ../b9-cache/docker-compose.yml up -d --wait
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
