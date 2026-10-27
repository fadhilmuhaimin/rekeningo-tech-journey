# Lab t4-storage (Tahap 4): file identitas di bytea lawan penyimpanan objek, presigned URL, checksum, dan retensi.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek down
# Rekam semua bagian berurutan; tiap bagian membuat ulang schema tahap4_storage, data awal, dan penyimpanan objek.
# Satu bagian: make run BAGIAN=presign   (ukuran presign unggah unduh retensi testing)
# Server, skema, dan data awal dari ../api-t4 (dasar_t4.py); penyimpanan objek: SeaweedFS 4.51 di docker-compose.yml.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Hentikan dan hapus container penyimpanan objek (run.py melakukannya sendiri di akhir).
down:
	docker compose rm -sfv seaweedfs
