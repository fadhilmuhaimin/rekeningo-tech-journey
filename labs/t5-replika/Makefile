# Lab t5-replika (Tahap 5): replica streaming, baca sesudah tulis, replica sinkron, dan promosi, di atas labs/api-t5.
# Port database dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus"): lab ini punya tiga port
# sendiri (LAB_REPLIKA_PRIMARY_PORT, LAB_REPLIKA_REPLICA_PORT, LAB_REPLIKA_SINKRON_PORT) dan memakai kluster compose sendiri.
include ../lab_env.mk
# Proyek compose sendiri (sama dengan NAMA_PROYEK di run.py): `down --remove-orphans` di proyek lajur menghapus PostgreSQL dan Redis bersama.
PROYEK_REPLIKA := $(if $(COMPOSE_PROJECT_NAME),$(COMPOSE_PROJECT_NAME)-t5-replika,t5-replika)
.PHONY: run cek down
# Rekam semua bagian berurutan; setiap bagian membuat ulang kluster (primary dan dua standby) dan data awal dari nol.
# Satu bagian: make run BAGIAN=baca   (replika jeda baca sinkron promosi konflik)
# Server, skema, data awal, dan generator beban dari ../api-t5 (dasar_t5.py): lab ini tidak menyalinnya.
run:
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Hentikan dan hapus kluster lab ini (hanya proyek compose folder ini).
down:
	docker compose -p $(PROYEK_REPLIKA) down -v --remove-orphans
