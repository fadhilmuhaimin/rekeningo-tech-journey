PY := ../.venv/bin/python
.PHONY: run run-ledger cek-ledger

# Versi lama (tabel pesanan b2q), dipakai halaman E5 versi lama; output/ukuran.txt dan output/dart-header.txt
# tidak berubah.
run:
	$(MAKE) -C ../b2-query run
	../.venv/bin/python ukur.py
	dart run cek_header.dart > output/dart-header.txt

# Versi ledger untuk halaman 2.20 (keputusan 818): riwayat Budi dari data labs/b2-query di schema e5_ledger sendiri,
# dilayani server Go riwayat/ (salinan persis query dan JSON labs/api-t2, ditambah gzip). Tulis ke output/ledger/.
run-ledger:
	$(MAKE) -C ../b3-race up
	$(PY) run_ledger.py

# Rekam ulang ke folder sementara, lalu bandingkan dengan output/ledger/ yang di-commit. Hanya byte, baris, dan
# struktur; file yang berubah, belum di-track, atau tidak lagi dihasilkan sama-sama gagal.
cek-ledger:
	$(MAKE) -C ../b3-race up
	$(PY) run_ledger.py --cek
	test -z "$$(git status --porcelain --untracked-files=all -- output/ledger/)"
