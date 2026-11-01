#!/bin/bash
# Satu role replikasi dan satu slot fisik per standby. Role terpisah supaya lab bisa memutus satu standby tanpa menyentuh
# yang lain (ALTER ROLE ... NOLOGIN); slot dibuat di sini supaya primary menyimpan WAL dari awal sampai standby mengambilnya.
# Kredensial lab lokal, bukan rahasia. Izin koneksi replikasi dari jaringan docker.
set -e
for r in replikator_laporan replikator_sinkron; do
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE ROLE $r WITH REPLICATION LOGIN PASSWORD 'lab';"
  echo "host replication $r all scram-sha-256" >> "$PGDATA/pg_hba.conf"
done
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT pg_create_physical_replication_slot('slot_laporan'), pg_create_physical_replication_slot('slot_sinkron');"
