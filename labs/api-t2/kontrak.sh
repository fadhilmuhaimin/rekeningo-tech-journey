#!/usr/bin/env bash
# Kontrak OpenAPI v2 (keputusan 416): lint, lalu perubahan yang merusak client dibanding kontrak expand Tahap 1.
# Keluaran: output/kontrak.txt. Alat dan versinya sama dengan labs/b1-openapi/run.sh.
cd "$(dirname "$0")"
OASDIFF="tufin/oasdiff@sha256:64c510d2535e1aa2332e864d696ecdecd2c652b3da5e97d4c3a9c5350713a8ee"
cp ../b1-openapi/openapi-expand.yaml .openapi-expand.yaml
{
  echo "\$ npx @redocly/cli@2.58.2 lint openapi.yaml"
  npx -y @redocly/cli@2.58.2 lint openapi.yaml 2>&1 | sed -E 's/in [0-9]+ms/in …ms/; s/\x1b\[[0-9;]*m//g' | grep -v "^$" | grep -v "Woohoo\|run with --" | grep -vF -e "╔" -e "║" -e "╚"
  echo
  echo "\$ oasdiff breaking ../b1-openapi/openapi-expand.yaml openapi.yaml --fail-on ERR   # Tahap 1 expand -> Tahap 2"
  docker run --rm -v "$PWD:/s" "$OASDIFF" breaking /s/.openapi-expand.yaml /s/openapi.yaml --fail-on ERR 2>&1
  echo "(exit code $?)"
} > output/kontrak.txt
rm -f .openapi-expand.yaml
cat output/kontrak.txt
