# Lab B3 · race condition & lock di Postgres 17
# Butuh: Docker, Python 3. Sekali saja: make setup
VENV := ../.venv
PY   := $(VENV)/bin/python

.PHONY: setup up run down run-ledger cek-ledger

setup:
	python3 -m venv $(VENV) && $(VENV)/bin/pip install -q -r ../requirements.txt

up:
	docker compose up -d --wait

# Menjalankan semua skenario dan menulis ulang output/*.txt + output/*.json.
# .txt ditampilkan di docs lewat snippet; .json disalin untuk widget race.js.
run: up
	$(PY) run.py
	mkdir -p ../../docs/widgets/data/b3-race
	cp output/*.json ../../docs/widgets/data/b3-race/

# Versi ledger untuk M9 (keputusan 430): run_ledger.py memakai labs/b3-ledger/schema.sql di schema b3_race dan
# menulis output/ledger/ (rekaman + replay widget race). Target run di atas dan output/*.txt|json lama tidak berubah.
run-ledger: up
	$(PY) run_ledger.py

# Rekam ulang dari schema baru, lalu bandingkan dengan yang di-commit: file berubah atau file baru yang belum di-track
# sama-sama gagal. Rekaman tanpa waktu, jadi harus identik per byte. PostgreSQL harus sudah jalan (make up).
cek-ledger:
	$(PY) run_ledger.py
	git diff --exit-code -- output/ledger/
	test -z "$$(git status --porcelain --untracked-files=all -- output/ledger/)"

down:
	docker compose down -v
