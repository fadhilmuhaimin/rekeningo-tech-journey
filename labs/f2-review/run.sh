#!/usr/bin/env bash
# Lab f2-review (1.39) · draf satu kalimat diperiksa alat, lalu diuji tes penerimaan dari spesifikasi.
# Database: container lab b3-race (PostgreSQL 17), schema f2review. Keluaran: output/review.txt
set -u
cd "$(dirname "$0")"
. ../lab_env.sh || exit 1   # LAB_DB_PORT (labs/README.md)
DB="postgres://lab:lab@127.0.0.1:${LAB_DB_PORT}/lab?search_path=f2review&application_name=f2-review"
GOSEC_VERSI=v2.29.0
go install "github.com/securego/gosec/v2/cmd/gosec@$GOSEC_VERSI" 2>/dev/null
GOSEC="$(go env GOPATH)/bin/gosec"
{
  echo "== A. Alat otomatis pada kode_ai.go"
  echo "\$ go vet ./...   # $(go env GOVERSION)"
  go vet ./... 2>&1; echo "(exit code $?)"; echo
  echo "\$ gosec ./...    # gosec $GOSEC_VERSI"
  "$GOSEC" -quiet -fmt text ./... 2>&1 | sed -E "s#$PWD/##; s/\x1b\[[0-9;]*m//g" \
    | grep -E "^\[|^Results" | sort -t: -k2 -n ; echo "(exit code ${PIPESTATUS[0]})"
  echo
  echo "== B. Tes penerimaan dari spesifikasi, ke PostgreSQL bersih (schema dibuat ulang tiap tes)"
  echo "\$ go test -v -count=1 ./..."
  TEST_DATABASE_URL="$DB" go test -v -count=1 ./... 2>&1 \
    | grep -E "^(=== RUN|--- |    penerimaan_test|PASS|FAIL|ok)" | sed -E 's/ \([0-9.]+s\)$//; s/\t[0-9.]+s$//'
  echo "(exit code ${PIPESTATUS[0]})"
} > output/review.txt
cat output/review.txt

# harap: lab gagal keras bila hasilnya bukan yang ditulis di halaman 1.39.
gagal() { echo "GAGAL: $1"; exit 1; }
grep -q '^--- PASS: TestDemoSaldoPindah$' output/review.txt || gagal "demo harus lolos"
[ "$(grep -c '^--- FAIL: ' output/review.txt)" = 6 ] || gagal "harus tepat 6 tes penerimaan gagal"
grep -q 'total saldo 475000; mau 422 dan 500000' output/review.txt || gagal "ke 999 harus menghilangkan Rp25.000"
grep -q 'saldo Budi 200000; mau tetap 225000' output/review.txt || gagal "token Dimas harus memindah uang Budi di draf"
grep -q 'SKIP' output/review.txt && gagal "tes dilewati: database tidak terhubung"
exit 0
