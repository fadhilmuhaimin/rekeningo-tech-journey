.PHONY: run run-login cek-login

# Lab lama C4 (Tahap 3): rate limit token bucket tanpa database. Target dan output/ratelimit.txt tidak berubah.
run:
	../.venv/bin/python run.py

# Lab login untuk M16 (Tahap 2): argon2id, wajib ganti password, kunci per akun bertahap,
# rate limit dua lapis di memori. Butuh PostgreSQL bersama (schema c4_login) dari labs/b3-race.
run-login:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run-login.py

# Rekam ulang lalu pastikan output/login/ identik dengan yang di-commit, termasuk file baru yang
# belum di-track. Rekaman tanpa waktu, jadi harus identik per byte. Lab tidak macet saat gagal.
cek-login: run-login
	git diff --exit-code -- output/login/
	test -z "$$(git status --porcelain --untracked-files=all -- output/login/)"
