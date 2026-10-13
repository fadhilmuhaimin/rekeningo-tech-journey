# Satu perintah untuk menyiapkan lingkungan lab di mesin siapa pun yang clone repo
# (plan/PROPOSAL.md "Jalur B: make lab di Mac"). Tidak ada compose baru: PostgreSQL 17
# dan Redis 8 dipakai lewat compose lab yang sudah ada, supaya nama project dan port
# sama dengan yang disebut README dan Makefile tiap lab (keputusan 100).
.PHONY: jalan jalan-hp siapkan-situs lab lab-up lab-down cek

# bun versi CI lewat npx, jadi tidak perlu bun terpasang global (cukup Node 22+).
BUN := npx --yes bun@1.4.2

# Satu perintah untuk membaca situs: font (sekali), paket, lalu server dev di
# http://localhost:4321 dan browser terbuka sendiri. Ctrl+C menghentikannya.
jalan: siapkan-situs
	$(BUN) run --cwd situs dev --open

# Sama dengan `jalan`, tetapi server juga bisa dibuka dari HP di Wi-Fi yang sama:
# buka alamat "Network" yang dicetak astro.
jalan-hp: siapkan-situs
	$(BUN) run --cwd situs dev --host

siapkan-situs:
	@test -f situs/public/fonts/Satoshi-Variable.woff2 || bash tools/get_fonts.sh
	$(BUN) install --cwd situs --frozen-lockfile

lab:
	bash tools/cek_lab_env.sh
	$(MAKE) -C labs/b3-race setup
	$(MAKE) lab-up
	@echo
	@echo "Lab siap. PostgreSQL 17 di 127.0.0.1:54333, Redis 8 di 127.0.0.1:56379."
	@echo "Coba: make -C labs/b3-race run    (daftar lab lain: README.md)"

# PostgreSQL 17 bersama (schema per lab) + Redis 8.
lab-up:
	docker compose -f labs/b3-race/docker-compose.yml up -d --wait
	docker compose -f labs/b9-cache/docker-compose.yml up -d --wait

# Mematikan dan menghapus volume (semua schema lab ikut terhapus).
lab-down:
	docker compose -f labs/b9-cache/docker-compose.yml down -v
	docker compose -f labs/b3-race/docker-compose.yml down -v

# Gerbang kualitas situs (sama dengan CI, keputusan 111).
cek:
	bash tools/cek_situs.sh --layar
