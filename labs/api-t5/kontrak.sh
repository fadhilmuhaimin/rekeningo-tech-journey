#!/usr/bin/env bash
# Kontrak OpenAPI v5 (lab-api-t5): lint, lalu perubahan yang merusak client dibanding kontrak api-t4 (Tahap 4).
# Keluaran: output/kontrak.txt. Alat dan versinya sama dengan labs/api-t4/kontrak.sh. Redocly dijalankan dari cache npx
# bila ada (versi 2.58.2), kalau tidak lewat npx dengan jaringan. oasdiff berjalan hanya bila image-nya sudah ada di cache
# Docker lokal; script ini tidak mengunduhnya (ditulis "Tidak dijalankan" di keluaran bila tidak ada).
cd "$(dirname "$0")"
OASDIFF="tufin/oasdiff@sha256:64c510d2535e1aa2332e864d696ecdecd2c652b3da5e97d4c3a9c5350713a8ee"
REDOCLY_CACHE="$(ls -d "$HOME"/.npm/_npx/*/node_modules/.bin/redocly 2>/dev/null | head -1)"
cp ../api-t4/openapi.yaml .openapi-t4.yaml
mkdir -p output
{
  echo "\$ npx @redocly/cli@2.58.2 lint openapi.yaml"
  if [ -n "$REDOCLY_CACHE" ] && "$REDOCLY_CACHE" --version 2>/dev/null | grep -q '^2.58.2'; then
    "$REDOCLY_CACHE" lint openapi.yaml 2>&1
  else
    npx -y @redocly/cli@2.58.2 lint openapi.yaml 2>&1
  fi | sed -E 's/in [0-9]+ms/in …ms/; s/\x1b\[[0-9;]*m//g' | grep -v "^$" | grep -v "Woohoo\|run with --" | grep -vF -e "╔" -e "║" -e "╚"
  echo
  echo "\$ oasdiff breaking ../api-t4/openapi.yaml openapi.yaml --fail-on ERR   # Tahap 4 -> Tahap 5"
  if docker image inspect "$OASDIFF" > /dev/null 2>&1; then
    docker run --rm -v "$PWD:/s" "$OASDIFF" breaking /s/.openapi-t4.yaml /s/openapi.yaml --fail-on ERR 2>&1
    echo "(exit code $?)"
  else
    echo "Tidak dijalankan: image oasdiff tidak ada di cache Docker lokal dan script ini tidak mengunduhnya."
    echo "Perubahan di kontrak ini hanya menambah empat rute (laporan hari ini, pengumuman, buat cicilan, lihat cicilan), satu parameter header opsional (X-Lsn-Tulis) di GET /akun/{id} dan GET /akun/{id}/riwayat, dua header jawaban opsional (X-Lsn-Tulis di bayar dan kirim, X-Dibaca-Dari di kedua GET), dan jawaban 422 di GET /akun/{id}, serta mengganti judul, versi, deskripsi, dan port bawaan server (empat baris); tidak ada rute atau field yang dihapus (diff teks openapi.yaml lawan api-t4)."
  fi
} > output/kontrak.txt
rm -f .openapi-t4.yaml
cat output/kontrak.txt
