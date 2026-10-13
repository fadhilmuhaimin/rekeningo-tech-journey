# Lab b3-ledger · ledger double-entry Tahap 2 (keputusan 400).
# Butuh: Docker, Python 3 (venv labs/.venv: make -C labs/b3-race setup). PostgreSQL 17 bersama dari labs/b3-race.
# Schema b3_ledger dan b3_ledger_v1 dibuat ulang setiap kali; schema lab lain tidak disentuh.
.PHONY: run cek

# Rekam semua bagian ke output/*.txt.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py

# Rekam ulang lalu bandingkan dengan yang di-commit. Rekaman tanpa waktu, jadi harus identik per byte.
cek: run
	git diff --exit-code -- output/
