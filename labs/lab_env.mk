# Port lab dari lingkungan (keputusan 860). Dipakai dengan `include ../lab_env.mk` di Makefile lab.
# Tanpa variabel, nilainya sama dengan sebelumnya; penjelasan di labs/README.md "Beberapa lajur sekaligus".
LAB_DB_PORT ?= 54333
LAB_REDIS_PORT ?= 56379
LAB_PORT_OFFSET ?= 0
# Bila COMPOSE_PROJECT_NAME diisi, compose b3-race dan b9-cache menjadi satu proyek; peringatan "orphan" dimatikan.
export COMPOSE_IGNORE_ORPHANS ?= true
export LAB_DB_PORT LAB_REDIS_PORT LAB_PORT_OFFSET
