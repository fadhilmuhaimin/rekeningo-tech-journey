# Lab t5-cicilan (Tahap 5): batch harian tahan crash, referensi unik di jurnal, kompensasi, dan DBOS Go, di atas labs/api-t5.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus"). Lab ini tidak menjalankan container
# sendiri: PostgreSQL datang dari ../b3-race, dan program pembanding DBOS (dbos/) adalah proses lokal.
include ../lab_env.mk
.PHONY: run cek test
# Rekam semua bagian berurutan; tiap bagian membuat ulang schema (tahap5_cicilan, tahap5_cicilan_tes, tahap5_cicilan_dbos) dari nol.
# Satu bagian: make run BAGIAN=crash   (crash serentak kompensasi langkah laju testing)
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes Go milik lab ini (dua job serentak, kompensasi) dan seluruh tes cicilan api-t5. TEST_DATABASE_URL harus menunjuk schema tes.
test:
	cd ../api-t5 && go vet ./... && go test -count=1 -p 1 -run 'Cicilan|Kompensasi' ./internal/service
