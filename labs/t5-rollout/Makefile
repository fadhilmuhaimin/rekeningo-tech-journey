# Lab t5-rollout (Tahap 5): rilis kartu bertahap (Argo Rollouts, plugin Gateway API) dan satu sakelar untuk semua pod
# di atas labs/api-t5, di cluster k3d bernama <lajur>-t5-rollout. Port dan nama kontainer dari lingkungan
# (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek down test
# Rekam semua bagian berurutan; setiap bagian membuat ulang schema dan data awal dari nol. Cluster dibuat bila belum ada dan
# dihapus sesudahnya (T5R_PERTAHANKAN=1 menyimpannya untuk bagian berikutnya).
# Satu bagian: make run BAGIAN=sakelar   (tanpa-router gateway analisis sakelar hpa testing)
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"

# Hapus cluster lajur ini (hanya <COMPOSE_PROJECT_NAME>-t5-rollout) dan jaringannya.
down:
	../.venv/bin/python -c "import run; run.hapus_cluster()"

# Tes Go sakelar tanpa cluster (hanya PostgreSQL lab): sama dengan make run BAGIAN=testing.
test:
	$(MAKE) run BAGIAN=testing
