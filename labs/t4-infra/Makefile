# Lab t4-infra (Tahap 4): alamat keluar tetap, secret di state IaC, rotasi secret di OpenBao, dan secret staging lawan produksi, di atas labs/api-t4.
# Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek verifikasi-alat
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema t4_infra dan data awal dari nol.
# Satu bagian: make run BAGIAN=alamat   (alamat state rotasi staging testing)
# Server, skema, worker, dan layanan verifikasi tiruan dari ../api-t4 (dasar_t4.py): lab ini tidak menyalinnya.
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Bandingkan biner OpenBao dan OpenTofu di image dengan arsip rilis resmi (butuh jaringan; mengunduh ±100 MB ke folder sementara).
# Bukan bagian run: hasilnya bergantung arsitektur mesin, jadi hanya dicatat di README dengan tanggal.
verifikasi-alat:
	../.venv/bin/python verifikasi_alat.py
