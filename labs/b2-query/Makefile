# Lab B2.3 (index) dan B2.4 (N+1) di PostgreSQL 17 (container lab b3-race).
DC := docker compose -f ../b3-race/docker-compose.yml exec -T db
PY := ../.venv/bin/python
.PHONY: run run-ledger cek-ledger
.DEFAULT_GOAL := run

# Versi ledger untuk M11 dan M12 (keputusan 520): run_ledger.py memuat labs/b3-ledger/schema.sql ke schema b2_ledger
# dan menulis output/ledger/. Target run di bawah dan output/*.txt lama (halaman B2.3, B2.4, B1.3) tidak berubah.
run-ledger:
	$(MAKE) -C ../b3-race up
	$(PY) run_ledger.py

# Rekam ulang ke folder sementara, lalu bandingkan dengan output/ledger/ yang di-commit. Waktu, buffer, dan ukuran
# disamarkan (keputusan 523); node, index, rows, jumlah query, dan baris ganda harus sama. File yang berubah, file
# yang belum di-track, dan file yang tidak lagi dihasilkan sama-sama gagal.
cek-ledger:
	$(MAKE) -C ../b3-race up
	$(PY) run_ledger.py --cek
	test -z "$$(git status --porcelain --untracked-files=all -- output/ledger/)"

run:
	$(MAKE) -C ../b3-race up
	$(DC) psql -U lab -d lab -q -v ON_ERROR_STOP=1 < data.sql > /dev/null
	{ echo "-- PostgreSQL 17.11 · 200.000 pesanan, 600.000 item, data dari data.sql"; $(DC) sh -c 'psql -U lab -d lab -q -e 2>&1' < index.sql | grep -v "^SET\|^--"; } > output/index.txt
	../.venv/bin/python n1.py
	../.venv/bin/python pagination.py
