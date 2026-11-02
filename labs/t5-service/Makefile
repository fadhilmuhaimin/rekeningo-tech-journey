# Lab t5-service (Tahap 5): mTLS antar service, daftar jenis jurnal per identitas, dan OpenTelemetry Collector, di atas labs/api-t5.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus"); Collector berjalan di proyek compose sendiri.
include ../lab_env.mk
PROYEK_SERVICE := $(if $(COMPOSE_PROJECT_NAME),$(COMPOSE_PROJECT_NAME)-t5-service,t5-service)
.PHONY: run cek down
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema dan data awal dari nol.
# Satu bagian: make run BAGIAN=mtls   (mtls rentan idempoten jejak testing)
# Server, skema, dan data awal dari ../api-t5 (dasar_t5.py): lab ini tidak menyalinnya. Redis tidak dipakai.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Hentikan dan hapus Collector lab ini (hanya proyek compose folder ini).
down:
	JEJAK_DIR=/nonexistent docker compose -p $(PROYEK_SERVICE) down -v --remove-orphans
