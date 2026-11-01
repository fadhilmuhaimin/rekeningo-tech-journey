#!/bin/bash
# Standby dari primary: pg_basebackup membuat salinan (slot sudah dibuat di init-primary.sh), lalu postgres berjalan sebagai
# hot standby. Dijalankan lagi saat container dimulai ulang: salinan yang sudah ada tidak dibuat ulang.
# Variabel: STANDBY_NAMA (application_name, dipakai synchronous_standby_names), STANDBY_SLOT, STANDBY_ROLE.
set -e
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  rm -rf "$PGDATA"/*
  until pg_basebackup -h primary -U "$STANDBY_ROLE" -D "$PGDATA" -R -X stream --checkpoint=fast -S "$STANDBY_SLOT"; do
    rm -rf "$PGDATA"/*
    sleep 1
  done
  chmod 700 "$PGDATA"
fi
exec postgres -c hot_standby=on -c primary_slot_name="$STANDBY_SLOT" \
  -c primary_conninfo="host=primary port=5432 user=$STANDBY_ROLE password=lab application_name=$STANDBY_NAMA"
