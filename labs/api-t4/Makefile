# Lab api-t4 (Tahap 3): api-t2 naik ke enam kota. Port dan nama kontainer dari lingkungan (labs/README.md).
include ../lab_env.mk
.PHONY: run cek kontrak test
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema dan data awal dari nol (keputusan 950).
# Satu bagian: make run BAGIAN=outbox   (skema outbox push rentan katalog sinkron web testing)
run:
	$(MAKE) -C ../b3-race up
	docker compose -f ../b9-cache/docker-compose.yml up -d --wait   # Redis lab: tes internal/redisbatas (BAGIAN=testing)
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/ migrasi/
	test -z "$$(git status --porcelain -- output/ migrasi/)"

# Kontrak OpenAPI: lint dan perubahan yang merusak client dibanding api-t2 (butuh jaringan untuk npx dan Docker).
kontrak:
	bash kontrak.sh

# Tes Go tanpa rekaman. TEST_DATABASE_URL harus menunjuk schema tahap4_tes (dibuat run.py BAGIAN=testing).
test:
	go vet ./... && go test -count=1 -p 1 ./...
