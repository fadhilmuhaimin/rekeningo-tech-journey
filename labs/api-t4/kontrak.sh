#!/usr/bin/env bash
# Kontrak OpenAPI v4 (lab-api-t4): lint, lalu perubahan yang merusak client dibanding kontrak api-t3 (Tahap 3).
# Keluaran: output/kontrak.txt. Alat dan versinya sama dengan labs/api-t3/kontrak.sh. Butuh jaringan (npx) dan Docker.
cd "$(dirname "$0")"
OASDIFF="tufin/oasdiff@sha256:64c510d2535e1aa2332e864d696ecdecd2c652b3da5e97d4c3a9c5350713a8ee"
cp ../api-t3/openapi.yaml .openapi-t3.yaml
mkdir -p output
{
  echo "\$ npx @redocly/cli@2.58.2 lint openapi.yaml"
  npx -y @redocly/cli@2.58.2 lint openapi.yaml 2>&1 | sed -E 's/in [0-9]+ms/in …ms/; s/\x1b\[[0-9;]*m//g' | grep -v "^$" | grep -v "Woohoo\|run with --" | grep -vF -e "╔" -e "║" -e "╚"
  echo
  echo "\$ oasdiff breaking ../api-t3/openapi.yaml openapi.yaml --fail-on ERR   # Tahap 3 -> Tahap 4"
  docker run --rm -v "$PWD:/s" "$OASDIFF" breaking /s/.openapi-t3.yaml /s/openapi.yaml --fail-on ERR 2>&1
  echo "(exit code $?)"
} > output/kontrak.txt
rm -f .openapi-t3.yaml
cat output/kontrak.txt
