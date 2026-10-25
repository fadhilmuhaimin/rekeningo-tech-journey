include ../lab_env.mk
.PHONY: run run-login cek-login test-login

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

# Tes Go login/pengaman_test.go (keputusan 659-661) terhadap schema c4_login, dengan race detector. run-login.py
# menjalankannya juga (bagian J, tanpa -race). Seed menghapus dan membuat ulang schema c4_login: jangan jalankan
# bersamaan dengan run-login.
test-login:
	$(MAKE) -C ../b3-race up
	cd login && TEST_DATABASE_URL='postgres://lab:lab@127.0.0.1:$(LAB_DB_PORT)/lab?search_path=c4_login&application_name=c4-ratelimit' go test -count=1 -race ./...
