# Lab t4-qr (Tahap 4): payload QR bergaya EMV dengan CRC, QR statis lawan dinamis, dan laporan QR palsu, di atas labs/api-t4.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek test
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema tahap4_qr dan data awal dari nol.
# Satu bagian: make run BAGIAN=dinamis   (crc statis dinamis lapor testing)
# Server, skema, dan data awal dari ../api-t4 (dasar_t4.py); paket internal/qrpayload dan cmd/qrlab ada di ../api-t4 karena
# paket internal hanya bisa diimpor dari dalam modul itu. Lab ini tidak menyalin kode server.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Tes payload tanpa database (tes service butuh TEST_DATABASE_URL; run.py BAGIAN=testing menjalankan semuanya).
test:
	cd ../api-t4 && go vet -tags t4qr ./internal/qrpayload ./cmd/qrlab && go test -count=1 -tags t4qr ./internal/qrpayload
