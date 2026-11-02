# Lab t5-waf (Tahap 5): gerbang untuk mitra POS (Coraza + OWASP CRS, kuota per mitra, HMAC bertimestamp, Idempotency-Key wajib)
# di atas labs/api-t5. Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek test
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema dan data awal dari nol.
# Satu bagian: make run BAGIAN=kuota   (kuota waf tandatangan testing)
# Server, skema, dan data awal dari ../api-t5 (dasar_t5.py): lab ini tidak menyalinnya.
run:
	$(MAKE) -C ../b3-race up
	docker compose -f ../b9-cache/docker-compose.yml up -d --wait   # Redis lab: kuota per mitra
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/ ../api-t5/output/testing.txt
	test -z "$$(git status --porcelain -- output/)"

# Tes Go gerbang tanpa rekaman. TEST_REDIS_ADDR menunjuk Redis lab; tanpa itu tes kuota dilewati.
test:
	cd gerbang && go vet ./... && TEST_REDIS_ADDR=127.0.0.1:$(LAB_REDIS_PORT) go test -count=1 ./...
