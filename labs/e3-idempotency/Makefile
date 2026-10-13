# Lab E3 · retry + idempotency key: client Dart → server Go → PostgreSQL 17 (lab b3-race).
.PHONY: run run-ledger cek-ledger
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py

# Versi ledger Tahap 2 (M10, ADR 14; keputusan 510): rekaman ke output/ledger/. Target run dan
# rekaman output/kunci-*.txt di atas tetap dipakai halaman E3 versi lama.
run-ledger:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python ledger/run.py

# Rekam ulang lalu bandingkan dengan yang di-commit (rekaman tanpa waktu: identik per byte).
# File rekaman baru yang belum di-track juga membuat cek gagal.
cek-ledger: run-ledger
	git diff --exit-code -- output/ledger/
	@baru="$$(git ls-files --others --exclude-standard -- output/ledger/)"; \
	if [ -n "$$baru" ]; then echo "GAGAL: rekaman belum di-track: $$baru"; exit 1; fi
