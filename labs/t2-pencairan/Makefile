# Lab t2-pencairan · job pencairan warung Jumat dan rekonsiliasi, M15 dan ADR 19 (keputusan 500).
# Butuh: Docker, Python 3 (venv labs/.venv: make -C labs/b3-race setup), Go. PostgreSQL 17 bersama dari labs/b3-race.
# Schema t2_pencairan dibuat ulang setiap skenario; schema lab lain tidak disentuh.
.PHONY: run cek

# Bangun job (bin/pencairan), lalu rekam semua bagian ke output/*.txt.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py

# Rekam ulang lalu bandingkan dengan yang di-commit. Rekaman tanpa waktu, jadi harus identik per byte.
# File rekaman baru yang belum di-commit juga membuat cek gagal.
cek: run
	git diff --exit-code -- output/
	@baru="$$(git ls-files --others --exclude-standard -- output/)"; \
	if [ -n "$$baru" ]; then echo "rekaman belum di-commit: $$baru"; exit 1; fi
