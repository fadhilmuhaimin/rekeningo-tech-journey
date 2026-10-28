# Lab t4-audit (Tahap 4): audit log berantai hash, jangkar di luar database, hak role, persetujuan dua orang, dan server MCP
# baca-saja, di atas labs/api-t4. Port dan nama kontainer dari lingkungan (labs/README.md, "Beberapa lajur sekaligus").
include ../lab_env.mk
.PHONY: run cek
# Rekam semua bagian berurutan; tiap bagian membuat ulang schema tahap4_audit, role t4a_*, dan data awal dari nol.
# Satu bagian: make run BAGIAN=jangkar   (rantai jangkar role persetujuan mcp testing)
# Server, skema, dan data awal dari ../api-t4 (dasar_t4.py): lab ini tidak menyalinnya. Modul MCP: mcp/ (go.mod sendiri).
run:
	$(MAKE) -C ../b3-race up
	../.venv/bin/python run.py $(BAGIAN)

# Rekam ulang lalu pastikan output/ identik dengan yang di-commit, termasuk file baru yang belum di-track.
cek: run
	git diff --exit-code -- output/
	test -z "$$(git status --porcelain -- output/)"
