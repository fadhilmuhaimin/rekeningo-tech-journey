.PHONY: run cek
# Rekam semua bagian lab berurutan; database dibuat ulang dari nol (keputusan 408).
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py

# Rekam ulang lalu pastikan output/ dan migrasi/ (000010 dibuat run.py) identik dengan yang di-commit,
# termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/ migrasi/
	test -z "$$(git status --porcelain -- output/ migrasi/)"
