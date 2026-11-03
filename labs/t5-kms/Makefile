# Lab t5-kms (Tahap 5): envelope encryption file arsip partisi dengan OpenBao transit (mode dev), di atas labs/t5-partisi dan labs/api-t5.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus"). OpenBao berjalan di container
# `t5kms-<LAB_DB_PORT>-bao`, dihapus oleh run.py sesudah tiap bagian; PostgreSQL datang dari ../b3-race.
include ../lab_env.mk
.PHONY: run cek test
# Rekam semua bagian berurutan; tiap bagian membuat ulang schema tahap5_kms dan container OpenBao dari nol.
# Satu bagian: make run BAGIAN=rotasi   (arsip rotasi testing)
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes Go milik lab ini tanpa OpenBao: tes yang butuh OpenBao dilewati (di bagian `testing` run.py wajib, TES_KMS_WAJIB=1).
test:
	go vet ./... && go test -count=1 ./...
