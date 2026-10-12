#!/usr/bin/env bash
# Gerbang kualitas situs Astro (CLAUDE.md "gerbang_kualitas"), sama di laptop dan CI (keputusan 111).
# Syarat minimum, bukan bukti kualitas.
#
#   bash tools/cek_situs.sh                  # semua pemeriksaan tanpa browser
#   bash tools/cek_situs.sh --layar          # + semua alat ukur Playwright, berurutan (laptop)
#   bash tools/cek_situs.sh --ukur "gerak"   # hanya alat ukur yang disebut, atas situs/dist yang sudah dibangun (CI)
#   bash tools/cek_situs.sh --matriks-ci     # kelompok alat ukur sebagai JSON untuk strategy.matrix di cek.yml
#
# Python yang dipakai hanya pustaka standar, jadi tidak butuh .venv.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-python3}

# Alat ukur Playwright dalam tiga kelompok. --layar menjalankan semuanya berurutan menurut daftar ini;
# CI menjalankan satu kelompok per job, paralel, dari daftar yang sama (--matriks-ci), jadi laptop dan CI
# selalu memeriksa hal yang sama. Durasi alat di CI main 5eb37bd, berurutan: kelompok pertama 257 s, kedua 309 s,
# ketiga 279 s; seluruh gerbang 14m30 (keputusan 357). Alat baru masuk ke kelompok terpendek.
KELOMPOK_UKUR=("layar judul ilustrasi" "gerak" "diagram cls kontras luapan alur")

MODE="${1:-}"
case "$MODE" in
  ""|--layar) ;;
  --matriks-ci)
    printf '{"kelompok":['; pisah=""
    for k in "${KELOMPOK_UKUR[@]}"; do printf '%s"%s"' "$pisah" "$k"; pisah=","; done
    printf ']}\n'; exit 0 ;;
  --ukur)
    UKUR="${2:-}"
    # Hanya spasi juga daftar kosong: tanpa ini loop di bawah tidak menjalankan alat apa pun lalu lolos.
    if [ -z "${UKUR//[[:space:]]/}" ]; then echo "GAGAL: --ukur butuh nama alat, mis. --ukur \"gerak\""; exit 1; fi
    for n in $UKUR; do
      case " ${KELOMPOK_UKUR[*]} " in *" $n "*) ;; *) echo "GAGAL: alat ukur tidak dikenal: $n (dikenal: ${KELOMPOK_UKUR[*]})"; exit 1 ;; esac
    done
    # Tanpa build: dist berasal dari job build CI yang sudah lolos gerbang tanpa browser. Di laptop pakai --layar,
    # supaya yang diukur bukan build lama.
    if [ ! -f situs/dist/index.html ]; then echo "GAGAL: situs/dist belum ada. --ukur dipakai CI atas artefak build; di laptop pakai --layar."; exit 1; fi ;;
  *) echo "GAGAL: argumen tidak dikenal: $MODE"; exit 1 ;;
esac

if [ "$MODE" != "--ukur" ]; then
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
fi

# Satu alat ukur. Teks penanda dan perintahnya sama dengan sebelum alat dikelompokkan (keputusan 357).
jalan_ukur() {
  local URL="http://127.0.0.1:$PORT"
  case "$1" in
    layar)
      echo "== layar pertama 4 ukuran + tangkapan"
      (cd situs && node tools/layar.mjs --url "$URL" && node tools/tangkap.mjs --url "$URL") ;;
    judul)
      echo "== jarak judul ke meta (K0d)"
      (cd situs && node tools/ukur-judul.mjs --url "$URL" | grep -v "^ok ") ;;
    ilustrasi)
      echo "== teks ilustrasi di dalam bingkai (K0c, K0e)"
      (cd situs && node tools/ukur-ilustrasi.mjs --url "$URL") ;;
    gerak)
      echo "== reduced motion mematikan gerak (I3)"
      (cd situs && node tools/ukur-gerak.mjs --url "$URL") ;;
    diagram)
      echo "== diagram: versi statis, scroll, keyboard (I4)"
      (cd situs && node tools/ukur-diagram.mjs --url "$URL") ;;
    cls)
      # Mode font telat (keputusan 361): Satoshi selalu datang sesudah paint pertama, seperti di jaringan lambat.
      echo "== CLS widget alur saat dimuat, skrip dan font ditunda (I5c-b, I5c-h)"
      (cd situs && node tools/ukur-cls.mjs --url "$URL" --font-telat 1500 --fallback Verdana --paralel 8 | grep -v "^ok ") ;;
    kontras)
      echo "== kontras langkah runsql setelah dijalankan, computed style (K2a)"
      (cd situs && node tools/ukur-kontras.mjs --url "$URL") ;;
    luapan)
      echo "== luapan horizontal seluruh halaman 360 dan 375, chip di dalam wadahnya (K2d)"
      (cd situs && node tools/ukur-luapan.mjs --url "$URL") ;;
    alur)
      echo "== detail alur dekat jalur sesudah menebak, 1366x657 (I5c-g)"
      (cd situs && node tools/ukur-detail-alur.mjs --url "$URL") ;;
    *) echo "GAGAL: alat ukur $1 ada di KELOMPOK_UKUR tetapi tidak punya perintah"; exit 1 ;;
  esac
}

if [ "$MODE" = "--layar" ] || [ "$MODE" = "--ukur" ]; then
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
  if [ "$MODE" = "--ukur" ]; then DAFTAR="$UKUR"; else DAFTAR="${KELOMPOK_UKUR[*]}"; fi
  JALAN=0
  for n in $DAFTAR; do jalan_ukur "$n"; JALAN=$((JALAN + 1)); done
  # Pagar kedua: gerbang yang tidak mengukur apa pun tidak boleh lolos (keputusan 357).
  if [ "$JALAN" -eq 0 ]; then echo "GAGAL: tidak ada alat ukur yang dijalankan"; exit 1; fi
fi
if [ "$MODE" = "--ukur" ]; then echo "== alat ukur lolos: $UKUR"; else echo "== semua pemeriksaan lolos"; fi
