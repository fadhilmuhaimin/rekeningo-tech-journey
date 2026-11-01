# Lab t5-fanout (Tahap 5): Kafka KRaft satu broker, relay outbox, consumer group, dan penyedia push tiruan dengan kuota,
# di atas labs/api-t5. Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus"); Kafka punya
# proyek compose sendiri (<COMPOSE_PROJECT_NAME>-t5-fanout), supaya `down` tidak menghapus PostgreSQL lajur.
include ../lab_env.mk
PROYEK_FANOUT := $(if $(COMPOSE_PROJECT_NAME),$(COMPOSE_PROJECT_NAME)-t5-fanout,t5-fanout)
.PHONY: run cek down test
# Rekam semua bagian berurutan; tiap bagian membuat ulang schema (tahap5_fanout, tahap5_fanout_tes) dan topik dari nol.
# Satu bagian: make run BAGIAN=kuota   (aliran kuota antrean pengirim testing)
# Server, skema, dan data awal dari ../api-t5 (dasar_t5.py): lab ini tidak menyalinnya. Redis tidak dipakai.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes Go paket stream, notifid, dan penyedia push tiruan (tanpa Kafka dan tanpa PostgreSQL).
test:
	cd ../api-t5 && go vet ./... && go test -count=1 ./internal/stream ./internal/notifid ./cmd/pushkuota

# Hentikan dan hapus Kafka lab ini (hanya proyek compose folder ini).
down:
	docker compose -p $(PROYEK_FANOUT) down -v --remove-orphans
