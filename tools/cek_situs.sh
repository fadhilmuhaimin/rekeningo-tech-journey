#!/usr/bin/env bash
# Gerbang kualitas situs Astro (CLAUDE.md "gerbang_kualitas"), sama di laptop dan CI (keputusan 111).
# Syarat minimum, bukan bukti kualitas.
#
#   bash tools/cek_situs.sh           # semua pemeriksaan tanpa browser
#   bash tools/cek_situs.sh --layar   # + layar pertama 4 ukuran dan tangkapan 2 ukuran x 2 mode (Playwright)
#
# Python yang dipakai hanya pustaka standar, jadi tidak butuh .venv.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-python3}

echo "== sinkron registry (prasyarat, nomor, [[ID]], angka asumsi, kartu, indeks)"
$PY tools/sinkron_cerita.py --check | grep -v "^PERINGATAN" || true
$PY tools/sinkron_cerita.py --check >/dev/null

echo "== antrean loop otomatis"; $PY tools/antrean.py --check
echo "== batas baris file yang diimpor CLAUDE.md (keputusan 235)"
$PY tools/ukur_konteks.py --cek-baris plan/MEMORI.md:80 plan/RINGKAS.md:60
echo "== istilah";              $PY tools/build_istilah.py --check
echo "== audit bahasa";         $PY tools/audit_bahasa.py --check | tail -1
$PY tools/audit_bahasa.py --check >/dev/null

echo "== build strict"
LOG=$(mktemp)
if bun run --cwd situs build >"$LOG" 2>&1; then OK=1; else OK=0; fi
if grep -E "\[WARN\]|\[ERROR\]" "$LOG"; then OK=0; fi
# Urutan argumen bun yang salah (`bun --cwd x run build`) mencetak bantuan dengan exit 0 (keputusan 225).
grep -q "Complete!" "$LOG" || OK=0
rm -f "$LOG"
if [ "$OK" != 1 ]; then echo "GAGAL: build strict"; exit 1; fi
echo "build strict lolos (0 warning)"

echo "== ID internal tidak tampil"; $PY tools/cek_id_tampil.py
echo "== kontras dua mode";          $PY tools/contrast.py | tail -1
echo "== uji pemeriksa kontras (lolos palsu, keputusan 262)"; $PY tools/test_contrast.py | tail -1
echo "== tipe (astro check, strict)"
LOG=$(mktemp)
if ! bun run --cwd situs cek-tipe >"$LOG" 2>&1; then sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -B1 -A4 " - error" || true; rm -f "$LOG"; echo "GAGAL: tipe"; exit 1; fi
sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -E "^- [0-9]+ errors"; rm -f "$LOG"
echo "== tes situs (node:test + Vitest)"
bun run --cwd situs test 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "^# (pass|fail)|Tests +[0-9]"
echo "== tes widget lama";           node --test tests/widgets/*.cjs 2>&1 | grep -E "^# (pass|fail)"
node --test tests/widgets/*.cjs >/dev/null 2>&1

if [ "${1:-}" = "--layar" ]; then
  echo "== layar pertama 4 ukuran + tangkapan"
  PORT="${PORT_PREVIEW:-4321}"   # worktree paralel memakai port lain, mis. PORT_PREVIEW=4323
  # Astro 7 menjalankan preview sebagai daemon (otomatis bila dijalankan agen), dicatat di lock
  # situs/.astro/preview.json milik worktree ini. `preview stop` hanya menghentikan daemon itu,
  # bukan server worktree lain. Penanda acak di dist membuktikan server di $PORT melayani
  # build ini, bukan daemon lama atau server lain di port yang sama (keputusan 249).
  henti_preview() { bun run --cwd situs preview stop >/dev/null 2>&1 || true; rm -f situs/dist/gerbang-tanda.txt; }
  henti_preview
  TANDA="$$-$RANDOM-$(date +%s)"
  echo "$TANDA" > situs/dist/gerbang-tanda.txt
  trap henti_preview EXIT
  bun run --cwd situs preview --background --port "$PORT" --host 127.0.0.1 >/dev/null 2>&1 || true
  SIAP=0; BATAS=$((SECONDS + 30))
  while [ "$SECONDS" -lt "$BATAS" ]; do
    if [ "$(curl -sf --max-time 2 "http://127.0.0.1:$PORT/gerbang-tanda.txt" 2>/dev/null)" = "$TANDA" ]; then SIAP=1; break; fi
    sleep 1
  done
  if [ "$SIAP" != 1 ]; then
    echo "GAGAL: http://127.0.0.1:$PORT tidak melayani situs/dist worktree ini dalam 30 detik (preview tidak menyala, tidak menjawab, atau port dipegang server lain). Log daemon: situs/.astro/preview.log. Cek: lsof -nP -iTCP:$PORT -sTCP:LISTEN; worktree lain pakai PORT_PREVIEW=4323."
    exit 1
  fi
  (cd situs && node tools/layar.mjs --url "http://127.0.0.1:$PORT" && node tools/tangkap.mjs --url "http://127.0.0.1:$PORT")
  echo "== jarak judul ke meta (K0d)"
  (cd situs && node tools/ukur-judul.mjs --url "http://127.0.0.1:$PORT" | grep -v "^ok ")
  echo "== teks ilustrasi di dalam bingkai (K0c, K0e)"
  (cd situs && node tools/ukur-ilustrasi.mjs --url "http://127.0.0.1:$PORT")
  echo "== reduced motion mematikan gerak (I3)"
  (cd situs && node tools/ukur-gerak.mjs --url "http://127.0.0.1:$PORT")
  echo "== diagram: versi statis, scroll, keyboard (I4)"
  (cd situs && node tools/ukur-diagram.mjs --url "http://127.0.0.1:$PORT")
  echo "== CLS widget alur saat dimuat, skrip ditunda (I5c-b)"
  (cd situs && node tools/ukur-cls.mjs --url "http://127.0.0.1:$PORT" | grep -v "^ok ")
  echo "== kontras langkah runsql setelah dijalankan, computed style (K2a)"
  (cd situs && node tools/ukur-kontras.mjs --url "http://127.0.0.1:$PORT")
  echo "== luapan horizontal seluruh halaman 360 dan 375, chip di dalam wadahnya (K2d)"
  (cd situs && node tools/ukur-luapan.mjs --url "http://127.0.0.1:$PORT")
fi
echo "== semua pemeriksaan lolos"
