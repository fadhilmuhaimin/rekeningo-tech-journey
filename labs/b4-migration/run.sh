#!/usr/bin/env bash
# Lab 1.25 (B4.1) · golang-migrate v4.20.1 ke PostgreSQL 17, skema v1 Rekeningo (keputusan 172).
# Dua schema meniru dua mesin: b4m_laptop (laptop Raka) dan b4m_server (VPS uji coba).
# Keluaran: output/migrate.txt. Gagal keras bila hasilnya tidak sesuai harapan (keputusan 79, 95).
set -u
cd "$(dirname "$0")"
. ../lab_env.sh   # LAB_DB_PORT, LAB_PORT_OFFSET (labs/README.md)
DC="docker compose -f ../b3-race/docker-compose.yml exec -T db"
M="go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.20.1"
url() { echo "postgres://lab:lab@127.0.0.1:${LAB_DB_PORT}/lab?sslmode=disable&search_path=b4m_$1&x-migrations-table=schema_migrations"; }
$DC psql -U lab -d lab -q -v ON_ERROR_STOP=1 \
  -c "DROP SCHEMA IF EXISTS b4m_laptop CASCADE; DROP SCHEMA IF EXISTS b4m_server CASCADE; DROP SCHEMA IF EXISTS b4m CASCADE; CREATE SCHEMA b4m_laptop; CREATE SCHEMA b4m_server;" >/dev/null \
  || { echo "GAGAL: schema lab tidak bisa dibuat ulang" >&2; exit 1; }
rm -f migrations/000004_* migrations/000005_*
gagal() { echo "GAGAL: $1" >&2; rm -f migrations/000004_* migrations/000005_*; exit 1; }
# jalan <mesin> <argumen migrate...>
jalan() { local m=$1; shift; echo "\$ migrate $*   # $m"; $M -path migrations -database "$(url "$m")" "$@" 2>&1 | sed -E 's/^[0-9]{4}\/[0-9]{2}\/[0-9]{2} [0-9:]{8} //; s/\(([0-9.]+)(ms|µs|s)\)/(…)/'; echo; }
# sql <mesin> <query>
sql() { echo "\$ psql -c \"$2\"   # $1"; $DC psql -U lab -d lab -c "SET search_path = b4m_$1; $2" 2>&1 | grep -v "^SET$"; echo; }
CEK="SELECT conname, pg_get_constraintdef(oid) AS aturan FROM pg_constraint WHERE conrelid = 'akun'::regclass AND contype = 'c' ORDER BY 1"
{
  echo "# golang-migrate v4.20.1 · PostgreSQL 17.11"
  echo
  echo "# --- A. Minggu 1: laptop dan server dibangun dari file migration yang sama ---"
  jalan laptop up
  jalan server up
  echo "# --- B. Minggu 2: batas saldo warung ditambah tangan di server, lewat psql ---"
  sql server "ALTER TABLE akun ADD CONSTRAINT batas_saldo_warung CHECK (jenis <> 'warung' OR saldo <= 1500000)"
  echo "# --- C. Versi sama, skema berbeda ---"
  jalan laptop version
  jalan server version
  sql laptop "$CEK"
  sql server "$CEK"
  echo "# --- D. Minggu 3, setelah M4: tabel koreksi (ADR 6) dan batas warung ditulis sebagai file ---"
  cp baru/000004_* baru/000005_* migrations/
  echo "\$ ls migrations"
  ls migrations
  echo
  jalan laptop up
  jalan server up
  jalan server version
  echo "# Server menolak migration 5 karena batas itu sudah ada sejak minggu 2. Periksa dulu skemanya:"
  sql server "$CEK"
  echo "# Isi server sudah sama dengan migration 5. Tandai versi 5 sebagai bersih, lalu periksa:"
  jalan server force 5
  jalan server up
  echo "# --- E. Laptop dan server sekarang sama, dan versinya jujur ---"
  sql laptop "SELECT * FROM schema_migrations"
  sql server "SELECT * FROM schema_migrations"
  sql laptop "$CEK"
  sql server "$CEK"
} > output/migrate.txt
rm -f migrations/000004_* migrations/000005_*
O=output/migrate.txt
grep -q "1/u akun_sesi" $O && grep -q "3/u transaksi" $O || gagal "migration 1–3 tidak jalan"
[ "$(grep -c '^3$' $O)" -ge 2 ] || gagal "laptop dan server harus sama-sama versi 3 di bagian C"
grep -q 'constraint "batas_saldo_warung" for relation "akun" already exists' $O || gagal "migration 5 di server harus gagal karena constraint sudah ada"
grep -q "^5 (dirty)$" $O || gagal "server harus dirty di versi 5"
[ "$(grep -cE "batas_saldo_warung +\| CHECK" $O)" -eq 4 ] || gagal "batas warung harus muncul: server C, server D, laptop E, server E"
[ "$(grep -c "^       5 | f$" $O)" -eq 2 ] || gagal "laptop dan server harus versi 5 bersih di bagian E"
cat $O
