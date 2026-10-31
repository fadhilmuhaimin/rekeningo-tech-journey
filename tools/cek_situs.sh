#!/usr/bin/env bash
# Gerbang kualitas situs Astro (CLAUDE.md "gerbang_kualitas"), sama di laptop dan CI (keputusan 111).
# Syarat minimum, bukan bukti kualitas.
#
#   bash tools/cek_situs.sh                  # semua pemeriksaan tanpa browser
#   bash tools/cek_situs.sh --layar          # + semua alat ukur Playwright, berurutan (laptop)
#   bash tools/cek_situs.sh --ukur "gerak"   # hanya alat ukur yang disebut, atas situs/dist yang sudah dibangun (CI)
#   bash tools/cek_situs.sh --matriks-ci     # kelompok alat ukur sebagai JSON untuk strategy.matrix di cek.yml
#   bash tools/cek_situs.sh --bagian "layar@hp"  # ukuran yang dikerjakan satu bagian alat (untuk tools/test_kelompok_ukur.py)
#
# UKUR_HALAMAN=<berkas> mempersempit alat yang memeriksa semua halaman ke daftar di berkas itu (situs/tools/lib/pilih.mjs,
# keputusan 866); CI mengisinya hanya untuk PR yang cuma mengubah halaman (tools/pilih_halaman.py). Tanpa variabel: semua halaman.
#
# Python yang dipakai hanya pustaka standar, jadi tidak butuh .venv.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-python3}

# Alat ukur Playwright dalam tujuh kelompok. --layar menjalankan semuanya berurutan menurut daftar ini;
# CI menjalankan satu kelompok per job, paralel, dari daftar yang sama (--matriks-ci), jadi laptop dan CI
# selalu memeriksa hal yang sama. Durasi alat di CI main 5eb37bd, berurutan: kelompok pertama 257 s, kedua 309 s,
# ketiga 279 s; seluruh gerbang 14m30 (keputusan 357). Alat baru masuk ke kelompok terpendek. Langkah "Alat ukur" di
# CI main 3bd9850 (run 40014428595): 290 s, 417 s, 336 s; axe masuk kelompok pertama (keputusan 693).
# Alat race (W2-race, keputusan 709) ±21 s lokal masuk kelompok pertama, yang terpendek.
# Alat pool (W3-pool, keputusan 980) ±35 s lokal masuk "diagram luapan", kelompok yang kini terpendek (87 s di semua halaman).
# Alat outbox (W3-outbox, keputusan 983) ±17 s lokal masuk "diagram luapan" (perkiraan 87 s di CI semua halaman).
# Alat cache (W3-cache, keputusan 986) ±17 s lokal masuk kelompok yang sama; di CI "diagram luapan pool outbox" 3m5s (PR #354).
# Alat breaker (W4-breaker, keputusan 1262) ±17 s lokal masuk kelompok yang sama, yang terpendek; /uji/breaker/ juga di daftar axe.
# 2026-10-25: "gerak erd" kena batas 9 menit di CI main (run 40093802904: gerak ±7m54, erd terpotong); gerak tumbuh
# tiap halaman berblok baru, jadi dipecah dari erd (empat job, keputusan 726) dan batas langkah naik ke 13 menit.
# 2026-10-25 (keputusan 865): dua alat terbesar dibagi per ukuran layar, supaya waktu dinding job terpanjang turun dari 9m24
# (layar + tangkap, 413 s; gerak 456 s; run 40148968969) ke ±4 menit tanpa menghilangkan satu pemeriksaan pun. Nama dengan "@"
# adalah satu bagian ukuran dari alat yang sama (ukuran_bagian di bawah); gabungan bagiannya = semua ukuran alat itu, diuji
# tools/test_kelompok_ukur.py. "layar" (ukuran) ≈ 360 s, "tangkap" ≈ 30 s dari 413 s kelompok lama; "galur" = loop halaman alur
# yang dulu di dalam "gerak" (ukur-gerak-alur.mjs, ±90 s per ukuran), "gerak" tinggal bagian tetapnya (±100 s).
# Alat yang memeriksa semua halaman (layar, galur, rantai, kontras, cls, luapan, alur) menyusut di PR (keputusan 866); yang tetap
# (gerak ±100 s, erd ±67 s, diagram ±57 s, axe, tangkap, race, ilustrasi, judul) disebar supaya tak satu kelompok pun jadi
# penentu waktu PR: perkiraan detik di CI semua halaman / PR satu halaman = 209/40, 219/35, 218/48, 227/50, 215/110, 224/100, 87/70.
KELOMPOK_UKUR=(
  "layar@desktop judul ilustrasi"
  "layar@hp rantai race"
  "galur@potret-desktop axe"
  "galur@lanskap-hp tangkap kontras"
  "cls gerak"
  "alur erd"
  "diagram luapan pool outbox cache webhook breaker"
)
ukuran_bagian() {
  case "$1" in
    layar@desktop) echo "1366x768,1366x657" ;;
    layar@hp) echo "375x812,375x667" ;;
    galur@potret-desktop) echo "375x667,1366x657" ;;
    galur@lanskap-hp) echo "667x375,844x390" ;;
    *) return 1 ;;
  esac
}

MODE="${1:-}"
case "$MODE" in
  ""|--layar) ;;
  --bagian) ukuran_bagian "${2:-}" || { echo "GAGAL: bagian ukuran tidak dikenal: ${2:-}"; exit 1; }; exit 0 ;;
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
  echo "== uji pemeriksa alokasi antrean: nomor keputusan dan ID riset tidak bertumpuk (keputusan 1415)"; $PY tools/test_antrean.py | tail -1
  echo "== tabel plan: pipe tanpa escape per baris = header (keputusan 362)"; $PY tools/cek_tabel_plan.py
  echo "== uji pemeriksa tabel plan (lolos palsu, keputusan 362)"; $PY tools/test_cek_tabel_plan.py | tail -1
  echo "== catatan masuk dari PR subagen (keputusan 564)"; $PY tools/lipat_masuk.py --cek
  echo "== uji lipat_masuk (argumen asing tidak melipat, keputusan 725)"; $PY tools/test_lipat_masuk.py | tail -1
  echo "== uji alat penulis berkas menolak argumen asing (keputusan 727)"; $PY tools/test_alat_argumen.py | tail -1
  echo "== uji pemilih halaman PR: semua bila ragu, sebagian hanya bila yakin (keputusan 866)"; $PY tools/test_pilih_halaman.py | tail -1
  echo "== uji kelompok alat ukur: tiap alat dan tiap ukuran tepat sekali (keputusan 865)"; $PY tools/test_kelompok_ukur.py | tail -1
  echo "== port lab dibaca dari variabel, bukan tertulis tetap (keputusan 860)"; $PY tools/cek_port_lab.py
  echo "== uji pemeriksa port lab (lolos palsu, keputusan 860)"; $PY tools/test_cek_port_lab.py | tail -1
  echo "== uji pembaca port lab: nilai aneh ditolak, bukan dibaca 0 (keputusan 864)"; $PY tools/test_lab_env.py | tail -1
  echo "== ERD dari skema lab: hash sumber dan bentuk JSON (keputusan 375)"; $PY tools/erd.py --cek
  echo "== uji pemeriksa ERD (lolos palsu, keputusan 375)"; $PY tools/test_erd.py | tail -1
  echo "== batas baris file yang diimpor CLAUDE.md (keputusan 235)"
  $PY tools/ukur_konteks.py --cek-baris plan/MEMORI.md:80 plan/RINGKAS.md:60
  echo "== istilah";              $PY tools/build_istilah.py --check
  echo "== audit bahasa";         $PY tools/audit_bahasa.py --check | tail -1
  $PY tools/audit_bahasa.py --check >/dev/null
  echo "== uji audit bahasa: pengecualian nama kode tidak melemahkan aturan (keputusan 1321)"; $PY tools/test_audit_bahasa.py | tail -1

  echo "== build strict"
  LOG=$(mktemp)
  if bun run --cwd situs build >"$LOG" 2>&1; then OK=1; else OK=0; fi
  if grep -E "\[WARN\]|\[ERROR\]" "$LOG"; then OK=0; fi
  # Urutan argumen bun yang salah (`bun --cwd x run build`) mencetak bantuan dengan exit 0 (keputusan 225).
  grep -q "Complete!" "$LOG" || OK=0
  rm -f "$LOG"
  if [ "$OK" != 1 ]; then echo "GAGAL: build strict"; exit 1; fi
  echo "build strict lolos (0 warning)"

  echo "== ID internal tidak tampil: ID halaman, ID riset (R2-04), nomor keputusan, dan nomor PR di teks, atribut, SVG, dan data JSON (keputusan 1170, 1180)"; $PY tools/cek_id_tampil.py
  echo "== uji pemeriksa ID internal (lolos palsu, keputusan 1170, 1180)"; $PY tools/test_cek_id_tampil.py | tail -1
  echo "== tautan internal di dist: path, anchor, data widget (P6, keputusan 318)"; $PY tools/cek_tautan.py
  echo "== uji pemeriksa tautan (lolos palsu, keputusan 318)"; $PY tools/test_cek_tautan.py | tail -1
  echo "== uji pemeriksa rantai dan ADR (lolos palsu, keputusan 1129)"; $PY tools/test_eval_tahap.py | tail -1
  echo "== rantai Berikutnya Tahap 1 sampai 3 di dist: urutan sama dengan nomor, tanpa 404, tanpa halaman lama sesudah jembatan (keputusan 1164, 1129)"
  for T in 1 2 3; do
    LOG=$(mktemp)
    if $PY tools/eval_tahap.py rantai "$T" >"$LOG" 2>&1; then tail -1 "$LOG"; rm -f "$LOG"
    else cat "$LOG"; rm -f "$LOG"; echo "GAGAL: rantai Berikutnya Tahap $T"; exit 1; fi
  done
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
    layar@desktop|layar@hp)
      local U; U=$(ukuran_bagian "$1")
      echo "== layar pertama ${1#layar@} ($U)"
      (cd situs && node tools/layar.mjs --url "$URL" --ukuran "$U") ;;
    tangkap)
      echo "== tangkapan layar halaman contoh, desktop dan HP, gelap dan terang"
      (cd situs && node tools/tangkap.mjs --url "$URL") ;;
    galur@potret-desktop|galur@lanskap-hp)
      local U; U=$(ukuran_bagian "$1")
      echo "== gerak widget alur: paket dan tombol Berikutnya terlihat bersamaan, ${1#galur@} ($U)"
      (cd situs && node tools/ukur-gerak-alur.mjs --url "$URL" --ukuran "$U") ;;
    judul)
      echo "== jarak judul ke meta (K0d)"
      (cd situs && node tools/ukur-judul.mjs --url "$URL" | grep -v "^ok ") ;;
    ilustrasi)
      echo "== teks ilustrasi di dalam bingkai (K0c, K0e)"
      (cd situs && node tools/ukur-ilustrasi.mjs --url "$URL") ;;
    gerak)
      echo "== reduced motion mematikan gerak (I3), bagian tetap; loop halaman alur ada di galur"
      (cd situs && node tools/ukur-gerak.mjs --url "$URL") ;;
    diagram)
      echo "== diagram: versi statis, scroll, keyboard (I4)"
      (cd situs && node tools/ukur-diagram.mjs --url "$URL") ;;
    erd)
      echo "== ERD bertumbuh: versi statis, scroll, keyboard, reduced motion, CLS, React Flow hanya di halamannya (I6-erd)"
      (cd situs && node tools/ukur-erd.mjs --url "$URL") ;;
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
    rantai)
      echo "== simpul dan panah Rantai di dalam figure 360 dan 375 (P10)"
      (cd situs && node tools/ukur-rantai.mjs --url "$URL") ;;
    axe)
      # Daftar kecil yang mewakili setiap template dan setiap island React, semuanya 0 pelanggaran saat dipasang, ditambah
      # empat halaman yang tabelnya meluap di HP (wadah tabel gulir, A11y-gulir-tabel, keputusan 712); seluruh tahap
      # diperiksa saat evaluasi (W4): node tools/ukur-axe.mjs --url ... --semua --awalan /tahap-N/ (keputusan 693, 694).
      # /uji/race/ dan widget race lama B3.2 (definition-list diperbaiki) masuk sesudah W2-race (keputusan 707, 709);
      # /uji/pool/ masuk sesudah W3-pool (keputusan 980).
      # /uji/outbox/ masuk sesudah W3-outbox (keputusan 983); /uji/cache/ sesudah W3-cache (keputusan 986);
      # /uji/breaker/ sesudah W4-breaker (keputusan 1262).
      echo "== axe-core wcag2a, wcag2aa, wcag21aa, wcag22aa: 20 halaman × 375 dan 1366 × gelap dan terang, uji diri fixture (G-axe)"
      (cd situs && node tools/ukur-axe.mjs --url "$URL" --path / --path /tahap-1/prd-v1/ --path /tahap-1/fitur-bayar/ \
        --path /tahap-1/data-modeling/ \
        --path /tahap-1/transaction/ --path /tahap-1/m3-tanda-kutip/ --path /tahap-1/m8-uji-coba-lolos/ \
        --path /tahap-1/sengaja-belum/ --path /tahap-1/tim-infra/ --path /tahap-2/prd-v2/ --path /uji/erd/ \
        --path /tahap-1/struktur-folder/ --path /tahap-1/pertukaran-saldo/ --path /tahap-1/kontrak-openapi/ \
        --path /tahap-1/authorization/ --path /uji/race/ --path /uji/pool/ --path /b-fondasi/b3-2-race-condition-lock/ --path /uji/outbox/ \
        --path /uji/cache/ --path /uji/breaker/) ;;
    pool)
      echo "== widget pool dan Little's Law: tebak dulu, keyboard, angka dari rekaman, kontras, axe, luapan, CLS (W3-pool)"
      (cd situs && node tools/ukur-pool.mjs --url "$URL" | grep -v "^ok ") ;;
    cache)
      echo "== widget cache dan invalidation: tebak dulu, keyboard, angka dari rekaman, kontras, axe, luapan, CLS (W3-cache)"
      (cd situs && node tools/ukur-cache.mjs --url "$URL" | grep -v "^ok ") ;;
    breaker)
      echo "== widget circuit breaker: tebak dulu, keyboard, ARIA, reduced motion, angka dari rekaman, papan detik demi detik, 320 px Verdana, kontras, axe, CLS (W4-breaker)"
      (cd situs && node tools/ukur-breaker.mjs --url "$URL" | grep -v "^ok ") ;;
    race)
      echo "== widget race ledger: tebak dulu, keyboard, ARIA, reduced motion, angka dari rekaman, axe akhir, CLS (W2-race)"
      (cd situs && node tools/ukur-race.mjs --url "$URL" | grep -v "^ok ") ;;
    outbox)
      echo "== widget outbox dan worker: tebak dulu, keyboard, ARIA, reduced motion, angka dari rekaman, tata letak 320, kontras, axe, CLS (W3-outbox)"
      (cd situs && node tools/ukur-outbox.mjs --url "$URL" | grep -v "^ok ") ;;
    webhook)
      echo "== widget webhook masuk langkah demi langkah: tebak dulu, keyboard, langkah dan gulir, angka dari rekaman, tata letak 320, kontras, axe, CLS (W4-webhook)"
      (cd situs && node tools/ukur-webhook.mjs --url "$URL" | grep -v "^ok ") ;;
    alur)
      echo "== detail alur dekat jalur sesudah menebak 1366x657, fokus sesudah tebakan keyboard 375x667 (I5c-g), jawaban tebakan hanya di akhir jalur yang ditanyakan (keputusan 1184)"
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
