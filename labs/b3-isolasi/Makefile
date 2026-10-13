.PHONY: run run-ledger cek-ledger
# Versi lama (halaman b3-3 lama): tabel akun dengan kolom saldo, schema b33, output/*.txt.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py

# Versi ledger (halaman 2.12, keputusan 440): skema dari ../b3-ledger/schema.sql, schema b3_isolasi, output/ledger/.
run-ledger:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python ledger.py

# Rekam ulang lalu bandingkan dengan yang di-commit. Rekaman tanpa waktu, jadi harus identik per byte.
# File baru yang belum di-track juga dihitung berbeda.
cek-ledger: run-ledger
	git diff --exit-code -- output/ledger/
	@test -z "$$(git status --porcelain --untracked-files=all -- output/ledger/)" || \
	  { git status --porcelain --untracked-files=all -- output/ledger/; echo "GAGAL: rekaman ledger belum di-commit"; exit 1; }
