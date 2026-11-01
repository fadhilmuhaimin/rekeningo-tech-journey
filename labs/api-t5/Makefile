# Lab api-t5 (Tahap 5): api-t4 naik ke enam service dan satu negara. Port dan nama kontainer dari lingkungan (labs/README.md).
include ../lab_env.mk
.PHONY: run cek kontrak test beban
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema dan data awal dari nol.
# Satu bagian: make run BAGIAN=laporan   (skema laporan pooler beban testing)
run:
	$(MAKE) -C ../b3-race up
	docker compose -f ../b9-cache/docker-compose.yml up -d --wait   # Redis lab: cache laporan (BAGIAN=laporan) dan tes internal/redisbatas (BAGIAN=testing)
	../.venv/bin/python run.py $(BAGIAN)

# Beban berjadwal 1.388,9 request per detik di laptop lab (bukan kapasitas produksi).
beban:
	$(MAKE) run BAGIAN=beban

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/ migrasi/
	test -z "$$(git status --porcelain -- output/ migrasi/)"

# Kontrak OpenAPI: lint dan perubahan yang merusak client dibanding api-t4 (butuh jaringan untuk npx dan Docker).
kontrak:
	bash kontrak.sh

# Tes Go tanpa rekaman. TEST_DATABASE_URL harus menunjuk schema tahap5_tes (dibuat run.py BAGIAN=testing).
test:
	go vet ./... && go test -count=1 -p 1 ./...
