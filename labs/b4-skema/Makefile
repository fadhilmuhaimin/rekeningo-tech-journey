.PHONY: run run-ledger cek-ledger
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py
	../.venv/bin/python lock_timeout.py

# Versi ledger untuk M13 (keputusan 530): ledger.py memakai file migration labs/api-t2/migrasi/000009-000013 di
# schema b4_ledger dan menulis output/ledger/. Target run di atas dan output/*.txt lama (halaman B4.2) tidak berubah.
# Butuh Dart (app/riwayat_v1.dart = app 1.0 dan 1.1).
run-ledger:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python ledger.py

# Rekam ulang dari schema baru, lalu bandingkan dengan yang di-commit: file berubah atau file baru yang belum di-track
# sama-sama gagal. Rekaman tanpa waktu, jadi harus identik per byte. PostgreSQL harus sudah jalan (make -C ../b3-race up).
cek-ledger:
	../.venv/bin/python ledger.py
	git diff --exit-code -- output/ledger/
	test -z "$$(git status --porcelain --untracked-files=all -- output/ledger/)"
