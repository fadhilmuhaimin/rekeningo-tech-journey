# Evaluasi Tahap 5 · Satu database tidak cukup

Dievaluasi 2026-11-05 (mulai 11.31 WITA, dokumen selesai ±12.15 WITA) oleh subagent evaluasi (skill evaluasi-tahap) yang tidak menulis satu pun halaman Tahap 5. Seed acak: 5. Putaran: 1.

Dasar yang dievaluasi: `origin/main` 58d1e65d (merge #528, halaman 5.32), 32 halaman 5.1 sampai 5.32, `situs/dist` dibangun ulang dari dasar itu (`bun run --cwd situs build` → 336 halaman, exit 0). `git fetch origin && git diff --stat 58d1e65d origin/main` kosong saat evaluasi berjalan, jadi tidak ada perubahan sesudah dasar. Skill lain yang dipakai: analisis-kritis (bukti yang bisa diulang, penelusuran angka, klaim universal), gaya-bahasa (label, kosakata, arti istilah), visualisasi (tiga tangkapan 375×667 dinilai, kontrol Coba dibaca dari DOM). Nomor keputusan: 1690 sampai 1692, dicatat di badan PR. Skrip bantu (`tmp/eval5-*.py`, `tmp/eval5-*.mjs`) ada di folder `tmp/` worktree dan tidak di-commit; perintah pentingnya ada di bagian "Cara mengulang".

## Kartu nilai

W1 sampai W4 wajib YA. Hasil: W1 sampai W4, W6, W7, W8 YA. W5 TIDAK, sama seperti Tahap 2, 3, dan 4. Satu tugas perbaikan disisipkan (EVAL5-F1, tooltip istilah salah arti), jadi `EVAL-5-ulang` sekali menyusul.

| Butir | Hasil | Bukti (perintah → keluaran, PR, tangkapan) |
| --- | --- | --- |
| W1 | YA | `python3 tools/eval_tahap.py peta 5` → "naskah 32 halaman, registry 32 halaman", 32 baris `ada=True`, 0 "segera", "halaman bercatatan: 0", exit 0. Judul, jenis, ★, dan lab registry dibandingkan terpisah dengan tabel "Peta halaman Tahap 5" di `plan/CERITA-TAHAP-5.md`: 32 dari 32 judul sama, 0 selisih lab, ★ pada 32 halaman. `gh run list --branch main --workflow cek --limit 1` → run 41961984609 (merge #528, 58d1e65d) success, jobs gitleaks, build, dan semua job ukur success (sebelumnya 41952900165, merge #527, success). 32 PR halaman MERGED, masing-masing 11 check SUCCESS, total 352 check SUCCESS dan 0 selain itu (bagian "Daftar PR halaman", `tmp/eval5-prci.txt`). Gerbang penuh `cek_situs.sh --layar` tidak diulang di sini: CI menjalankannya per PR dan di main, dan alat gerbang yang relevan dijalankan satu per satu di bawah |
| W2 | YA | 16 baris angka atau status (lebih dari 30 angka) dari 6 halaman berlab (seed 5: 5.21, 5.10, 5.25, 5.13, 5.24, 5.22) ditelusuri ke baris rekaman, 0 tanpa rekaman atau label (bagian "Telusur angka W2"). Label dibandingkan dengan definisi di gaya-bahasa di 6 tempat: 5 sesuai, 1 sesuai dengan catatan (chip Rekaman lab di Tebak 5.13 memuat hasil terukur di bawah masukan Asumsi lab). 22 persamaan beban naskah dihitung ulang dengan skrip: 0 salah. **Ulang lab (2026-11-05, Docker 28.3.2 hidup):** `docker info \| head -3` → `Client:`, ` Version:    28.3.2`, ` Context:    desktop-linux`. `make -C labs/<lab> cek` satu per satu di lajur `rjt-ev5`: t5-cicilan 43 s, t5-partisi 65 s, t5-gabung 77 s, t5-waf 56 s, t5-rollout 329 s: 5 dari 5 exit 0, `git diff --exit-code -- output/` dan `git status --porcelain` kosong sesudah tiap lab (bagian "Ulang lab W2 (2026-11-05)"; satu percobaan t5-rollout gagal karena port 19268 dipegang proses lain, diulang di offset berbeda) |
| W3 | YA | `python3 tools/audit_bahasa.py --check` → "470 file · 0 error · 527 peringatan"; hanya Tahap 5 → "32 file · 0 error · 84 peringatan". `python3 tools/eval_tahap.py gejala 5` → exit 0, 12 dari 12 halaman Masalah "ok" (adegan 2 sampai 4 paragraf, 35 sampai 65 kata). Enam blok Gejala dibaca tangan dari ekspor 375×667 (5.4, 5.8, 5.14, 5.18, 5.22, 5.24): adegan hanya kejadian dan dialog; "kill switch", "canary", "pod" (5.22), "POS", "mitra POS", dan "429" (5.24) dijelaskan satu per satu di paragraf sesudah adegan ("Tiga istilah di cerita", "Dua istilah di cerita"), bukan di dalam adegan. Catatan "Angka cerita (Ilustrasi)" memuat arti label, bukan konsep teknis. `python3 tools/test_eval_tahap.py` → "26/26 kasus uji eval_tahap lolos" |
| W4 | YA | `situs/tools/layar.mjs` (UKUR_HALAMAN = 32 path Tahap 5, preview port 4323, Chrome sistem lewat preload) → "LOLOS: 0 gagal, 0 margin tipis"; 18 dari 32 halaman terukur (72 pengukuran), 14 tanpa Inti dicetak "info" (5.1, 12 halaman Masalah, 5.32); margin terkecil 21 px (5.5 dan 5.15 di 1366×657), lalu 22 px (5.13, 1366×657), 23 px (5.7, 375×667), dan 24 px (5.2, 1366×657). `python3 tools/contrast.py` → "987/987 lolos" gelap dan terang. `situs/tools/ukur-axe.mjs --url http://127.0.0.1:4323 --semua --awalan /tahap-5/` → "axe 4.14.0 runOnly wcag2a, wcag2aa, wcag21aa, wcag22aa: uji diri 4/4 lolos; 32 halaman × 2 ukuran × 2 tema = 128 run; 0 halaman berpelanggaran; incomplete untuk dicek manusia: color-contrast 3594; 0 gagal lain; 31.6 s". Keyboard saja, `situs/tools/eval-keyboard.mjs` pada 5.17 (halaman pertama seed): 375×667 → 223 Tab, stop pertama "Lewati ke konten", isi di Tab ke-5, Berikutnya di Tab ke-223, 8 blok dibuka dengan Enter, tanpa tanda fokus 0, kontrol terlewat 0; 1366×657 → 478 Tab, 48 blok, 0 dan 0; `--uji-diri` → "alat melihat stop tanpa tanda fokus saat tanda fokus dimatikan". Tangkapan 375×667 gelap dibuka: `situs/tangkapan/tahap-5_pooler-koneksi-hp-dark.png`, `..._progressive-delivery-hp-dark.png`, `..._fitur-ke-teknis-hp-dark.png` |
| W5 | TIDAK | `python3 tools/eval_tahap.py coba 5` dan `bocor 5`, ditambah kontrol di DOM sesudah hidrasi (bagian "Lampiran W5"): dari 30 halaman dengan blok Coba, 24 punya tebakan lalu satu hal yang bisa diubah (kontrol). Enam tidak: 5.9, 5.23, 5.30 (Tebak dengan "Ubah satu hal" berupa prosa yang bertaut ke rekaman atau dokumentasi), 5.25 dan 5.27 (pilah tanpa kontrol ubah), 5.31 (rekap). 5.1 dan 5.32 (PRD) tanpa blok Coba. `bocor 5` → 5 halaman Masalah (5.6, 5.10, 5.14, 5.16, 5.20) dengan angka jawaban di teks sebelum blok Coba; dicatat saja, hasil-dulu adalah desain pemilik |
| W6 | YA | `python3 tools/eval_tahap.py adr 5` → 15 baris (ADR 46 sampai 60), exit 1 karena satu baris "KURANG": 5.15 (ADR 51) terbaca "opsi 0" sebab tabelnya satu opsi per baris. Dibaca tangan: 6 opsi (A sampai F), pre-mortem 3 penyebab, "Kapan keputusan ini salah", 9 tautan sumber. Empat belas lainnya "ok": 3 opsi (ADR 58, 60), 4 opsi (ADR 52, 54, 55, 56), 5 opsi (ADR 46, 47, 48, 49, 50, 53, 57, 59), semuanya `pre-mortem True (3 penyebab)`, `kapan salah True`, 6 sampai 21 tautan sumber; tiga klaim (PgBouncer mode transaction di 5.17, `ANY num_sync` di 5.9, consumer group Kafka di 5.15) dicek ke dokumentasi aslinya 2026-11-05 dan cocok (bagian "Lampiran W6") |
| W7 | YA | `python3 tools/erd.py --cek` → "erd --cek lolos: Tahap 1 5 tabel, Tahap 2 8 tabel, Tahap 3 14 tabel, Tahap 4 22 tabel, Tahap 5 30 tabel; hash sumber cocok; modul Tahap 4: 6 schema, service Tahap 5: 6 schema". `situs/data/erd/tahap-5.json` (68.582 B) dan `service-tahap-5.json` ada. 5.3 memuat `<ErdHalaman id="erd-t5" tahap={[4, 5]} />` (`skema-data.mdx:52`). Di 5.3 sesudah hidrasi (`tmp/eval5-erd53.mjs`): tampilan awal 30 node dan 19 edge; menekan "Bandingkan dengan Tahap 4" → 52 node dan 54 edge dalam dua wadah ("Tahap 4, sebelum", "Tahap 5, sesudah"), sama di 1366×657 dan 375×667. `situs/tools/ukur-erd.mjs` → exit 0, "Tahap 5 bandingkan → bertumpuk, 52 node, 54 edge, 8 baru, 16 berubah, 0 dihapus, 0 di luar wadah" di 375×667. `python3 tools/test_erd.py` → "184/184 kasus uji erd lolos". Bangun ulang dari PostgreSQL (`tools/erd.py --tahap 5`) tidak dijalankan di sini (`--cek` membandingkan hash) |
| W8 | YA | `python3 tools/eval_tahap.py rantai 5` → "langkah dari 5.1 sampai 5.32: 32; 404 atau tautan hilang: 0", semua 200; Berikutnya dari 5.32 → `/d-system-design/d4c-laporan-lapangan-offline/` ("Studi desain: laporan lapangan offline", id D4c, `ada=True`, bukan halaman `lama`, `diganti_oleh`, atau `lebur_ke`). Tahap 6 belum punya halaman. `rantai 4` → 31 langkah, 4.31 menuju `/tahap-5/prd-v5/` langsung; `rantai 3` → 32 langkah, 3.32 menuju `/tahap-4/prd-v4/`. `python3 tools/cek_tautan.py` → "336 HTML: 86375 tautan internal diperiksa (6666 dengan anchor); 144 JSON data widget: 626 url diperiksa; ... rusak: 0 path, 0 anchor". `cek_situs.sh` baris 120 baru menjalankan `rantai` untuk Tahap 1 sampai 3 (G3-rantai, PR #529, sedang dikerjakan agen lain) |

## Daftar PR halaman

| Halaman | PR | Halaman | PR | Halaman | PR |
| --- | --- | --- | --- | --- | --- |
| 5.1 | #477 | 5.12 | #487 | 5.23 | #511 |
| 5.2 | #493 | 5.13 | #505 | 5.24 | #514 |
| 5.3 | #490 | 5.14 | #513 | 5.25 | #519 |
| 5.4 | #483 | 5.15 | #516 | 5.26 | #522 |
| 5.5 | #495 | 5.16 | #515 | 5.27 | #521 |
| 5.6 | #496 | 5.17 | #517 | 5.28 | #476 |
| 5.7 | #500 | 5.18 | #509 | 5.29 | #524 |
| 5.8 | #499 | 5.19 | #518 | 5.30 | #475 |
| 5.9 | #503 | 5.20 | #502 | 5.31 | #527 |
| 5.10 | #485 | 5.21 | #507 | 5.32 | #528 |
| 5.11 | #504 | 5.22 | #506 | | |

Sumber: `gh pr list --state merged --search "head:tahap-5/" --limit 100` (47 PR bercabang `tahap-5/*`) dan `gh pr view <n> --json state,statusCheckRollup,files` per PR halaman (`python3 tmp/eval5-prci.py` → `tmp/eval5-prci.txt`): 32 dari 32 MERGED, slug halaman ada di diff tiap PR, 11 check SUCCESS. Nomor PR halaman tidak berurutan dengan nomor halaman (5.2 sesudah 5.3 dan 5.4 dibuka lebih dulu, 5.14 sesudah 5.15 mulai). Di luar halaman: riset #330, 10 lab (api-t5 #479, t5-partisi #480, t5-replika #481, t5-fanout #484, t5-service #489, t5-cicilan #491, t5-waf #494, t5-kms #497, t5-rollout #498, t5-gabung #501), ERD5 #482, dan tiga widget (W5-zona #486, W5-lag #492, W5-fanout #508).

## Telusur angka W2

Halaman dipilih dengan seed 5 dari halaman Tahap 5 yang punya lab: `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==5 and x.get('nomor') and x.get('lab')]; random.seed(5); print([(x['nomor'],x['id'],x['lab']) for x in random.sample(h,6)])"` → 27 halaman berlab, hasil `[('5.21', 't5-batch', ['t5-cicilan']), ('5.10', 't5-m43', ['t5-partisi']), ('5.25', 't5-waf', ['t5-waf']), ('5.13', 't5-service', ['t5-gabung', 't5-rollout']), ('5.24', 't5-m50', ['t5-waf']), ('5.22', 't5-m49', ['t5-rollout'])]`. Lima lab berbeda, jadi kelima `make cek` di bawah berasal dari sampel itu.

| Halaman | Angka atau status di halaman | Rekaman atau label |
| --- | --- | --- |
| 5.21 | Angsuran ke-1 tetap satu jurnal dan berstatus `dicatat` sesudah job dimatikan lalu diulang; saldo Citra Rp150.000 | `labs/t5-cicilan/output/crash.txt:69`, `:75`, `:77` |
| 5.21 | Dua job berebut buku: jurnal baru 1, jurnal sudah ada 1, gagal 0 | `labs/t5-cicilan/output/serentak.txt:40` |
| 5.21 | Satu job menyelesaikan 2.000 angsuran; 13.333 ÷ 20 = 666,65, dibulatkan 667 detik = 11,1 menit | `labs/t5-cicilan/output/laju.txt:20`; `:42` (berlabel "Hitungan atas Asumsi naskah (bukan rekaman)"; halaman: "Hitungan atas Asumsi") |
| 5.10 | 1.800.000 dari 1.800.000 posting dibaca; 150.000 baris per bulan, 8,3% | `labs/t5-partisi/output/snapshot.txt:11`, `:37`, `:62` |
| 5.10 | Pemeriksaan penuh menandai 10.061 dari 10.288 buku sesudah data lama keluar; pemeriksaan dari snapshot menandai 0 | `labs/t5-partisi/output/lepas.txt:136`, `:140` |
| 5.10 | `DELETE` atas posting ditolak dengan SQLSTATE 23001; selisih cache 5.000 | `labs/t5-partisi/output/lepas.txt:35`; `labs/t5-partisi/output/snapshot.txt:71`, `:74` |
| 5.25 | WAF menolak 8 dari 8 payload serangan dengan 403, 37 dari 37 payload POS sah lolos; di mode `waf-deteksi` 0 dari 8 diblokir | `labs/t5-waf/output/waf.txt:25`, `:66`; `:83` ("status tanpa blokir: {201: 4, 404: 4}; tidak ada 403") |
| 5.25 | Paling banyak 20 permintaan berjalan per mitra: dari 25 permintaan A, 20 menjadi 200 dan 5 menjadi 429 `terlalu-banyak-berjalan`; token bucket 100 per detik berlabel Asumsi di halaman | `labs/t5-waf/output/kuota.txt:24`; "(Asumsi)" di `pintu-mitra-waf.mdx:112` |
| 5.24 | 520 dari 620 permintaan 429 dan 100 lolos 200; mitra B ikut 429 | `labs/t5-waf/output/kuota.txt:29-30` (bagian C, kuota bersama) |
| 5.24 | Dengan bucket per mitra: A 100 jawaban 200 dan 500 jawaban 429, B 20 dari 20 tetap 200 | `labs/t5-waf/output/kuota.txt:9-10` (bagian A) |
| 5.24 | Tanpa Idempotency-Key dua baris `qr`, dengan key yang sama satu baris; 201 dua kali | `labs/t5-waf/output/tandatangan.txt:9`, `:14` |
| 5.13 | Satu proses 0 panggilan per transaksi, tiga proses 6; 1.200 kirim dan 1.200 ambil, 2.400 = 6 × 400 | `labs/t5-gabung/output/panggilan.txt:20`, `:23`, `:29-30` |
| 5.13 | 504 sesudah menunggu paling sedikit 2 detik saat satu proses mati | `labs/t5-gabung/output/mati.txt:11` |
| 5.13 | Jeda 10 ms: 500 dari 500 transaksi melewati 50 ms; 50 ÷ 6 = 8,33 ms | `labs/t5-gabung/output/latensi.txt:23`, `:15`; `:20` ("Hitungan"); jeda dan batas 50 ms berlabel Asumsi lab |
| 5.22 | Bagian pod versi baru 25,0% (3 replika), 5,0% (20 replika), 33,3% (3 replika, `maxSurge: 0`) | `labs/t5-rollout/output/tanpa-router.txt:54-56` |

Angka yang berlabel di halaman dan tidak terulang di lab: 5.22 "Hari, jam, 2%, dan 31% adalah Ilustrasi" (`m49-canary-sepertiga.mdx:157`); 5.24 "3.000 permintaan per detik" (Ilustrasi) dan "216%" (Hitungan atas Ilustrasi: 3.000 ÷ 1.388,9 = 2,16); 5.10 "438 juta baris" (Asumsi, rumus di blok sesudahnya).

Label dibandingkan dengan definisi di gaya-bahasa:

| Tempat | Angka dan label | Sesuai definisi |
| --- | --- | --- |
| 5.21, 11,1 menit | "(Hitungan atas Asumsi)" untuk 13.333 ÷ 20 | Ya: masukan 13.333 dan 20 per detik adalah Asumsi naskah, hasil bukan rekaman |
| 5.13, 8,33 ms | "(Hitungan atas Asumsi lab)" untuk 50 ÷ 6 | Ya |
| 5.24, 216% | "Hitungan atas Ilustrasi" | Ya: label ikut masukan terlemah (3.000 per detik Ilustrasi) |
| 5.22, 31% dan 2% | "adalah Ilustrasi" | Ya: angka cerita, bukan hasil sistem |
| 5.10, 438 juta | "(Asumsi)" | Ya: rumus naskah, bukan rekaman |
| 5.13, Tebak "500 dari 500" dan "60 ms" | Chip "Rekaman lab · latensi.txt", dan `sumber.teks` menulis "jeda 10 ms dan batas 50 ms adalah Asumsi lab" | Sesuai dengan catatan: 500 dari 500 adalah hitungan terukur di lab, tetapi kondisinya (jeda 10 ms, batas 50 ms) Asumsi, dan 60 ms = 6 × 10 adalah "Hitungan" menurut kepala `latensi.txt:10`. Chip lebih kuat dari masukannya; kualifikasinya ada di teks sumber dan di prosa (`modul-ke-service.mdx:111`, `:126`), jadi bukan label salah |

Satu angka, satu bentuk: 8 dari 22 persamaan yang dihitung ulang dipakai di 5.2, 5.29, atau 5.31 (bagian "Angka beban naskah" di bawah). Sapuan `grep -n 'Hitungan'` yang berdampingan dengan "Rekaman lab" pada hasil rumus tidak menemukan hasil rumus berlabel Rekaman lab di 32 halaman.

## Ulang lab W2 (2026-11-05)

Dijalankan 2026-11-05 pukul 11.33 sampai 11.48 WITA atas `origin/main` 58d1e65d di worktree `rjt-konten`, oleh sesi yang tidak menulis satu pun halaman Tahap 5.

Keadaan sebelum lab pertama:

- `docker info | head -3` → `Client:`, ` Version:    28.3.2`, ` Context:    desktop-linux`. Server 28.3.2, 10 CPU, 8,2 GB memori (`docker info --format`).
- `df -h /System/Volumes/Data` → 58 GiB bebas (batas berhenti 15 GiB). `uptime` → load average 1 menit 5,66 pada awal lab pertama, 6,88 dan 6,19 pada dua lab sesudahnya, 11,54 pada t5-rollout (mesin dipakai sesi proyek lain); tidak ada lab yang gagal karena beban.
- Lajur sendiri: `COMPOSE_PROJECT_NAME=rjt-ev5 LAB_DB_PORT=55233 LAB_REDIS_PORT=57279 LAB_PORT_OFFSET=900` (`labs/README.md`, "Beberapa lajur sekaligus"). Kontainer `rjt-ev5-db-1` (`postgres:17`, PG_VERSION 17.11-1.pgdg13+2) dan Redis `rjt-ev5-redis-1`, dihapus sesudahnya dengan `docker compose down -v`; kontainer lajur lain (`rjt-teknis2-*`, `rjt-konten2-*`, `rjt-konten3-*`, `rjt-konten4-*`, `b3-race-db-1`) tidak disentuh. Satu lab sekaligus, berurutan; `labs/.venv` di worktree ini (psycopg 3.3.6, redis 8.1.0) dipakai apa adanya.

| Lab | Perintah | Hasil | Durasi | Kepala rekaman yang terbaca | Catatan |
| --- | --- | --- | --- | --- | --- |
| t5-cicilan | `make -C labs/t5-cicilan cek` | identik, exit 0 | 43 detik (11.33.23 sampai 11.34.06) | PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) · go1.27.3 · pgx v5.11.0 | `git status --porcelain` kosong, `git diff` atas `output/` 0 byte |
| t5-partisi | `make -C labs/t5-partisi cek` | identik, exit 0 | 65 detik | sama | sama |
| t5-gabung | `make -C labs/t5-gabung cek` | identik, exit 0 | 77 detik | go1.27.3 · tanpa database dan tanpa container | sama |
| t5-waf | `make -C labs/t5-waf cek` | identik, exit 0 | 56 detik | PostgreSQL 17.11 · go1.27.3 · Coraza v3.8.1 · OWASP CRS v4.30.0 · Redis 8.10.2 | Redis lajur dinyalakan lab sendiri |
| t5-rollout, percobaan 1 | `make -C labs/t5-rollout cek` (offset 900) | GAGAL, exit 2 sesudah 284 detik | 284 detik | go1.27.3 · k3s v1.37.1+k3s1 · Argo Rollouts v1.10.1 · Traefik 3.7.13 · k3d v5.9.0 | `tanpa-router.txt`, `gateway.txt`, `analisis.txt` ditulis ulang dan identik; lalu "GAGAL: port 19268 sudah dipakai proses lain" |
| t5-rollout, percobaan 2 | `make -C labs/t5-rollout cek` (`LAB_PORT_OFFSET=1000`) | identik, exit 0 | 329 detik (11.42.36 sampai 11.48.05) | sama | enam rekaman ditulis (`tanpa-router`, `gateway`, `analisis`, `sakelar`, `hpa`, `testing`), `git diff` 0 byte; cluster dihapus `make down` |

Kegagalan percobaan 1: port 19268 (= 18368 + offset 900, satu port `kubectl port-forward` pod) dipegang proses "Code Helper" PID 83422 yang bukan milik lab (`lsof -nP -iTCP:19268`). Itu bukan cacat lab: `run.py` berhenti dengan pesan yang jelas, dan rekaman yang sudah ditulis identik. Percobaan 2 memakai offset 1000 (port 19360 sampai 19371, diperiksa bebas dengan `lsof`), sedangkan DB dan Redis tetap di port lajur. Offset 900 pada brief tidak dipakai di percobaan 2; hasilnya tetap identik, karena rekaman memakai port dasar.

Cara "identik" dibaca. Target `cek` menjalankan `run` (menulis ulang `output/*.txt`), lalu `git diff --exit-code -- output/` dan `test -z "$(git status --porcelain -- output/)"`. Tambahan di sini: `git status --porcelain --untracked-files=all` pada seluruh worktree kosong sesudah tiap lab, dan waktu ubah file rekaman berada di jendela lab itu (contoh `labs/t5-cicilan/output/crash.txt` 11.33.37, `labs/t5-rollout/output/*.txt` 11.45.07 sampai 11.48.04), jadi rekaman benar-benar ditulis ulang, bukan dilewati. Kontainer dan jaringan `rjt-ev5` dan cluster k3d `rjt-ev5-t5-rollout` tidak tersisa (`docker ps -a`, `docker network ls`).

Yang tidak dibuktikan:

- Satu putaran per lab (kestabilan antar putaran dan di bawah beban CPU tinggi tidak diukur terpisah); pengulangan t5-rollout terjadi pada load average 3 sampai 5.
- `cek` membandingkan rekaman dengan rekaman. Bahwa angka di halaman sama dengan rekaman adalah penelusuran angka di atas.
- Lab lain Tahap 5 (api-t5, t5-replika, t5-fanout, t5-service, t5-kms) tidak dijalankan; sampel evaluasi hanya lima. govulncheck dan grype Tidak dijalankan untuk lab Tahap 5 (sudah tercatat di TINJAUAN-PEMILIK).
- Plugin Gateway API Argo Rollouts diunduh controller di dalam cluster (sha256 berpin, rancangan lab); k3d dan manifes Argo sudah ada di `labs/t5-rollout/.alat/`, jadi tidak ada unduhan baru ke host.

Kesimpulan: lima dari lima lab sampel identik, jadi butir W2 YA tanpa catatan "ulang lab tertunda". Tidak ada rekaman yang berubah dan tidak ada yang di-commit dari lab.

## Angka beban naskah (hitung ulang)

Rumus dari `plan/CERITA-TAHAP-5.md` bagian 3 "Angka beban Tahap 5", masukan registry `tahap[4].asumsi` (200.000 aktif, 60 request, puncak 10). `python3 tmp/eval5-hitung.py` → 22 persamaan, 0 selisih dari naskah. Delapan yang dipakai di 5.2, 5.29, atau 5.31:

| Besaran | Hitungan | Hasil | Dipakai di |
| --- | --- | --- | --- |
| Request per detik puncak | 200.000 × 60 ÷ 86.400 × 10 | 1.388,9 | 5.2, 5.29 (11 kali), 5.31 |
| Transaksi uang puncak (trx 3 dan trx 2) | 200.000 × 3 ÷ 86.400 × 10 | 69,4 dan 46,3 | 5.2, 5.29, 5.31 |
| Notifikasi uang puncak | (600.000 + 50.000) ÷ 86.400 × 10 | 75,2 | 5.29 |
| Worker notifikasi, kapasitas 4 ÷ 0,3 = 13,33 | 75,2 ÷ 13,33 | 564% (trx 2: 391%) | 5.2 |
| Notifikasi makan siang | 650.000 × 0,8 ÷ 5.400 | 96,3 per detik (722%) | 5.31 |
| Pengumuman 1.000.000 HP, 4 pengirim | 1.000.000 × 0,3 ÷ 4 | 75.000 detik = 20,8 jam | 5.29 |
| Koneksi terpasang lawan tersedia | 6 × 3 × 10; 100 − 3 | 180 lawan 97 (186%) | 5.2, 5.31 |
| Posting per tahun; polling merchant | 200.000 × 3 × 2 × 365; 20.000 ÷ 30 | 438 juta (109,5 GB); 666,7 per detik | 5.2, 5.29, 5.31; 5.3 |

Tabel PRD v6 di 5.29 diperiksa dengan masukan 2.000.000 aktif: 694,4 (463,0) transaksi uang, 752,3 (520,8) notifikasi, 4,38 (2,92) miliar posting, semuanya cocok. Satu selisih bentuk, bukan hasil: 5.31 menulis 216% (3.000 ÷ 1.388,9 = 2,16) dan 13,3 query berjalan, keduanya cocok dengan tabel naskah.

## Lampiran W5

Blok Coba (judul "Coba", "Coba sendiri", "Coba keduanya", atau "Coba dulu di mana uang bergerak"; selektor `details.blok[data-blok^="blok-coba"]`) diambil dari registry, `eval_tahap.py coba 5`, dan DOM sesudah hidrasi di 1366×657 (`details` dibuka, halaman digulir): `input[type=checkbox]`, `input[type=range]`, `button[aria-pressed]`, dan tombol atau kontrol yang muncul sesudah memilih satu tebakan (`tmp/eval5-coba-dom.mjs`, `tmp/eval5-coba-dom2.mjs`).

| Halaman | Komponen Coba | Tebak dulu | Ubah satu hal |
| --- | --- | --- | --- |
| 5.4, 5.6, 5.8, 5.10, 5.12, 5.14, 5.16, 5.18, 5.20, 5.22, 5.24 (11 halaman Masalah), 5.26 | alur (`WidgetLama`, `predict`) | pilihan jawaban | kotak centang "Ubah satu hal: ..." (mis. "dua client untuk tiap warung" di 5.4, "trim sesudah rewrap sebagian" di 5.26) |
| 5.11 | runsql | pilihan 120.000 lawan 10.000 | kotak centang "Ubah satu hal: query bulan April ..." |
| 5.3 | Tebak dan ErdHalaman | Tebak | tombol "Bandingkan dengan Tahap 4" (30 node menjadi 52) |
| 5.5, 5.13, 5.19, 5.21 | Tebak dan banding | Tebak | tombol pilih kejadian atau skenario di banding (mis. "Pemanggil tanpa sertifikat", "Mati sesudah jurnal ditulis") |
| 5.7 | JedaReplica | Tebak | slider dan tiga tombol mode (Replica biasa, Token LSN, remote_apply) muncul sesudah memilih |
| 5.15 | FanOut | Tebak | slider dan tiga tombol skala perangkat (10.281 lab, 100.000, 1.000.000) muncul sesudah memilih |
| 5.17 | KoneksiPooler | Tebak | tombol "Naskah: 6 service × 3 pod", "5 pod", "8 pod" |
| 5.28 | BiayaTigaTahun | tebak | tombol "Tanpa", "Satu", "Dua orang tambahan" |
| 5.29 | Kalkulator | tebak | tombol Tahap 5, Tahap 6, Aktif 10% |
| 5.2 | PetaZona | "Tebak dulu" di teks | tombol zona (client, edge, service, dst.); memilih zona membuka isinya, bukan mengubah masukan |
| 5.9 | Tebak | Tebak | prosa "Ubah satu hal: isi `synchronous_standby_names` dengan dua nama" (Tidak dijalankan) |
| 5.23 | Tebak | Tebak | prosa "Ubah satu hal: ganti penyebab sakelar tidak terbaca" bertaut ke `sakelar.txt` D |
| 5.30 | Tebak | Tebak | prosa "Ubah satu hal: kapasitas K ..." |
| 5.25 | pilah | memilah | prosa "Ubah satu hal: bayangkan Idempotency-Key ikut ditandatangani" (Penalaran) |
| 5.27 | pilah | memilah | prosa "Ubah satu hal: ganti ukuran tim yang bergiliran jaga" |
| 5.31 | kartu | "Tunjukkan jawaban" | tidak ada (kotak centang hanya menyaring kartu) |
| 5.1, 5.32 | tanpa blok Coba | halaman PRD; tebakan 5.32 ada di blok "Menuju Tahap 6" | halaman PRD |

Tiga catatan. Pertama, hasil-dulu: `bocor 5` menemukan 5 halaman Masalah dengan angka jawaban di teks sebelum Coba (5.6 Rp250.000, 5.10 150.000, 5.14 429, 5.16 120, 5.20 Rp50.000); semuanya halaman yang menampilkan hasil di Gejala atau "Yang sebenarnya" menurut rancangannya. Kedua, jawaban Tebak di luar widget (bagian "Pemeriksaan tambahan (c)"): paragraf `aman` di akhir blok Coba menulis ulang jawaban di 4 dari 6 halaman Tebak yang disampel. Ketiga, kontrol yang muncul sesudah menebak (slider 5.7 dan 5.15) dihitung, seperti aturan skill.

## Lampiran W6

`python3 tools/eval_tahap.py adr 5` (opsi, pre-mortem, kapan salah, tautan sumber di halaman). 5.15 dibaca tangan karena tabel ADR 51 satu opsi per baris (kolom Opsi, Cara kerja, Kelebihan, Kekurangan, Biaya operasional, Bukti), bentuk yang sama dengan ADR 35 di Tahap 4.

| ADR | Halaman | Opsi | Pre-mortem | Kapan salah | Tautan sumber |
| --- | --- | --- | --- | --- | --- |
| 46 | 5.5 | 5 | 3 penyebab | ada | 7 |
| 47 | 5.7 | 5 | 3 | ada | 9 |
| 48 | 5.9 | 5 | 3 | ada | 21 |
| 49 | 5.11 | 5 | 3 | ada | 8 |
| 50 | 5.13 | 5 | 3 | ada | 13 |
| 51 | 5.15 | 6 (A sampai F, dibaca tangan; alat: "opsi 0 KURANG") | 3 | ada | 9 |
| 52 | 5.17 | 4 | 3 | ada | 18 |
| 53 | 5.19 | 5 | 3 | ada | 18 |
| 54 | 5.21 | 4 | 3 | ada | 9 |
| 55 | 5.23 | 4 | 3 | ada | 17 |
| 56 | 5.25 | 4 | 3 | ada | 13 |
| 57 | 5.26 | 5 | 3 | ada | 11 |
| 58 | 5.27 | 3 | 3 | ada | 19 |
| 59 | 5.28 | 5 | 3 | ada | 6 |
| 60 | 5.30 | 3 | 3 | ada | 15 |

Subbagian berjudul "Kasus industri" hanya ada di 5.7, 5.13, dan 5.28 (`grep -c -i 'kasus industri'`); ADR lain memuat sumbernya di kolom Bukti atau "Bacaan lanjut". Itu bukan kekurangan menurut definisi butir ("ada kasus/sumber"), sama dengan Tahap 4. Exit 1 `adr 5` muncul walau halamannya lengkap.

Tiga klaim dicek ke sumber primer pada 2026-11-05 (WebFetch ke halaman aslinya): (1) 5.17, PgBouncer, tabel fitur: mode transaction menandai SET/RESET, LISTEN, WITH HOLD CURSOR, PREPARE/DEALLOCATE, tabel sementara PRESERVE/DELETE ROWS, LOAD, dan session-level advisory locks sebagai "Never" (pgbouncer.org/features.html); halaman tidak menyebut SET LOCAL, `set_config(..., true)`, atau advisory lock tingkat transaction, sama dengan kalimat 5.17 (`pooler-koneksi.mdx:115`). (2) 5.9, PostgreSQL 17 bagian 19.6.2: `ANY num_sync (...)` membuat COMMIT dilepas begitu paling sedikit `num_sync` standby yang terdaftar menjawab, sama dengan kalimat "Ubah satu hal" 5.9 (`rpo-rto-failover.mdx:49`). (3) 5.15, Kafka 4.3 `docs/design/design.md`: tiap partisi dibaca "exactly one consumer within each subscribing consumer group at any given time"; dokumen itu tidak membahas consumer lebih banyak dari partisi untuk consumer group, dan hanya share group yang boleh melebihi jumlah partisi, sesuai catatan 5.15 bahwa share group Tidak dijalankan. Ketiganya cocok.

## Pertanyaan pembaca

Tiga halaman pertama dari lima halaman acak tanpa filter lab: `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==5 and x.get('nomor')]; random.seed(5); print([(x['nomor'],x['id']) for x in random.sample(h,5)])"` → `[('5.17', 't5-pooler'), ('5.23', 't5-rollout'), ('5.2', 't5-fitur-teknis'), ('5.30', 't5-adr-60'), ('5.16', 't5-m46')]`. Tangkapan 375×667 gelap dibuka dan elemen dibaca di DOM (`tmp/eval5-nav.txt`).

| Halaman | Di mana | Dari mana | Ke mana |
| --- | --- | --- | --- |
| 5.17 Pooler koneksi | Breadcrumb "Tahap 5" di atas judul, judul "5.17 Pooler koneksi: PgBouncer + ADR 52", lencana "Blok 1 dari 5 · 1 menit", dan butir sidebar yang `aria-current` | Baris meta "Prasyarat: 5.16 M46" (tautan ke `/tahap-5/m46-failover-semua-error/`) | Tombol Berikutnya di akhir tiap blok; di blok terakhir "Berikutnya → 5.18 M47: Pod notifikasi membuat jurnal" (`a.bb-lanjut__next`). Di layar pertama hanya terlihat Inti dan Rantai, jadi tujuan berikutnya baru terbaca sesudah menggulir; "Sudah tahu? Cek 3 pertanyaan" memuat tautan lompat ke 5.18 |
| 5.23 Progressive delivery | Breadcrumb "Tahap 5", judul "5.23 Progressive delivery, GitOps, kill switch + ADR 55", "Blok 1 dari 5 · 1 menit" | "Prasyarat: 5.22 M49" | "Berikutnya → 5.24 M50: Satu POS mengirim 3.000 permintaan per detik" di akhir blok terakhir |
| 5.2 Dari fitur ke pekerjaan teknis | Breadcrumb "Tahap 5 › Fitur ke teknis", judul 5.2, "Blok 1 dari 5" | "Prasyarat: 5.1 PRD v5" | "Berikutnya → 5.3 Skema data: ERD Tahap 4 → Tahap 5 dan pertumbuhannya" di akhir blok terakhir |

Dalam 3 detik pembaca HP tahu di mana ia berada (judul bernomor dan "Tahap 5"), apa yang dibaca dulu (Inti satu kalimat dan Rantai ringkas, utuh di layar pertama), dan dari mana ia datang (Prasyarat). "Ke mana selanjutnya" tidak ada di layar pertama 375×667 di ketiga halaman; ia ada di akhir tiap blok, seperti di Tahap 2 sampai 4. Breadcrumb HP menampilkan "Tahap 5" saja di 5.17 dan 5.23 dan "Tahap 5 › Fitur ke teknis" di 5.2 (nama grup "Masalah yang muncul" dan nama halaman ada di DOM, tidak di tampilan HP).

## Uji baca: 5 hal membingungkan

Pembaca: satu subagent segar (tipe general-purpose, model sonnet, tanpa konteks proyek; 4 panggilan alat, 81 detik). Ia hanya diberi persona mobile engineer baru di backend, tiga halaman seed 5 (5.17, 5.23, 5.2) yang diekspor sesudah hidrasi di 375×667 dengan semua bagian lipat terbuka (tautan ditulis `[-> /path/]`, tombol `[tombol]`), dan 32 file teks Tahap 5 untuk dibuka bila halaman menyebutnya, semuanya dengan path lengkap (pelajaran EVAL-4). Ia tidak diberi tahu apa yang dicari dan dilarang menjalankan shell, mencari di web, atau membuka file lain. Ia membaca teks saja: widget tidak ia operasikan. Lima butir di bawah dari laporannya; kolom terakhir klasifikasi evaluator, dengan kutipan yang dicek ke sumber MDX.

| No | Halaman dan kalimat | Kenapa membingungkan (kata pembaca) | Klasifikasi |
| --- | --- | --- | --- |
| 1 | 5.17: "Dua belas client dengan pool pod 10 meminta 120 koneksi." (`pooler-koneksi.mdx:318`, juga `:25`, `:85`) dan "supaya 180 client muat di satu instance" (`:271`) | Kata "client" dipakai untuk satu pod yang membuka 10 koneksi dan untuk satu koneksi; pembaca tidak bisa menghitung 12, 120, 180, dan batas 400 dengan satu pegangan | Kosakata, terbukti: `:81` mendefinisikan "Koneksi client", tetapi 12 client di `:25`, `:85`, `:89`, `:318` berarti proses dengan pool 10, sedangkan 180 client di `:271` dan `max_client_conn` di `:145` berarti koneksi. Aturan gaya-bahasa "satu simbol, satu besaran". Polesan |
| 2 | 5.23, paragraf aman Coba: "sakelar kill switch yang tidak terbaca dijawab HTTP 200 dengan keputusan tolak, karena penerbit tiruan membaca jawaban yang bukan 200 sebagai timeout dan menyetujui." | "Penerbit" tidak pernah dijelaskan, jadi pembaca tidak tahu apakah 200-tolak praktik yang benar atau akal-akalan tiruan lab | Istilah sebelum arti, terbukti: "penerbit" dipakai di `progressive-delivery.mdx:43`, `:59`, `:146`, `:335` tanpa satu kalimat arti (penerbit kartu dikenalkan di 4.22 dan 4.23, bukan prasyarat 5.22). Halaman jujur memberi label: perilaku penerbit sungguhan [perlu verifikasi] (`:146`). Paragraf `aman` yang sama menulis ulang jawaban Tebak (bagian "Pemeriksaan tambahan (c)"). Polesan |
| 3 | 5.2: "Budi membayar Rp35.000 dan Rp12.000 ke Warung 505, ... total Rp47.000 (`laporan.txt`)", lalu "Dari baris laporan itu lahir pertanyaan pertama Tahap 5." (`fitur-ke-teknis.mdx:23`) | Contoh pembuka tidak memperlihatkan kesalahan: 35.000 + 12.000 memang 47.000; pembaca tidak melihat apa yang rusak | Desain pengantar, terbukti sebagian. Hitungannya benar dan laporan itu memang benar; yang rusak (pembayaran melambat saat laporan dibuka) baru ada di 5.4. Kalimat "lahir pertanyaan pertama" menunjuk ke pertanyaan salinan lawan tempat uang bergerak, bukan ke selisih angka. Polesan |
| 4 | 5.23: "Satu pod dari empat adalah 25,0% (Hitungan atas rekaman), tetapi bobotnya 5." (`progressive-delivery.mdx:90`) lawan "Rollout tiga replika" (`:33`, `:303`) | Dari mana pod keempat datang tidak dijelaskan; hubungan jumlah pod dan persen lalu lintas baru dimengerti bila Rollout, HTTPRoute, dan `setWeight` sudah dikenal | Rujukan ke halaman lain, terbukti: `maxSurge` (pod tambahan di samping tiga pod lama) hanya disebut di `:262` dan dijelaskan di 5.22 (prasyarat), tanpa kalimat asal di halaman ini. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal. Polesan |
| 5 | 5.17: "Tabel itu tidak menyebut `SET LOCAL`, `set_config` dengan argumen ketiga `true`, maupun advisory lock tingkat transaction (dicari di teks halaman)." (`pooler-koneksi.mdx:115`) lalu "Lab tidak menjalankannya lewat PgBouncer (Tidak dijalankan)." (`:332`) | Halaman bertanya fitur apa yang dipakai kode lab, lalu menjawab belum dijalankan; pembaca tidak tahu apakah kode itu aman lewat mode transaction, dan aturan 6 ADR 52 ikut menggantung | Celah bukti yang berlabel jujur, terbukti (`:115`, `:274`, `:332`, `:356`): `kartu.go` memakai `set_config(..., true)` dan `audit.go` `pg_advisory_xact_lock`, dan tesnya lewat PgBouncer baru ada "sebelum cutover". Bukan label salah. Kalimat "(dicari di teks halaman)" terbaca ganjil. Usul tugas lab kecil atau tetap [perlu verifikasi] |

Tidak ada butir yang berkategori kesalahan fakta. Tiga dari lima (butir 1, 2, 4) adalah kosakata atau istilah yang dipakai sebelum dijelaskan, pola yang sama dengan Tahap 2, 3, dan 4 (EVAL-2 butir 5, EVAL-3 butir 2, EVAL-4 butir 3).

## Pemeriksaan tambahan di luar W1 sampai W8

Tujuh pemeriksaan atas temuan tinjauan Tahap 5. Perintah dan keluarannya ada di `tmp/eval5-*.txt` (tidak di-commit).

**(a) Kosakata dan tooltip salah arti** (`tmp/eval5-istilah.py`, `tmp/eval5-konteks.py`: `<abbr title>` di `<main>` HTML build 32 halaman dibandingkan dengan arti tiap istilah di prosa MDX). Plugin tooltip memasang satu definisi di setiap kemunculan istilah, bukan hanya yang pertama.

| Istilah | Tooltip | Pemakaian di Tahap 5 | Hasil |
| --- | --- | --- | --- |
| token | "String yang dibawa request sebagai bukti siapa pengirimnya, mis. token login ... Di token bucket, token berarti satu jatah request." (128 kemunculan di 8 halaman) | 5.7 (78 kemunculan) dan 5.6 (4) memakai "token" sebagai token LSN, yaitu posisi primary di WAL sesudah COMMIT (`X-Lsn-Tulis`), bukan bukti pengirim; 5.31 (13) memakai tiga arti (token LSN di `rekap.mdx:64`, `:66`, `:185`, `:190`, token bucket di `:116`, token OpenBao di `:120`) | SALAH ARTI di 5.6 dan 5.7 (82 kemunculan) dan sebagian dari 13 di 5.31. Cocok di 5.19 (token akses), 5.24 dan 5.25 (token bucket), 5.26 (token OpenBao) |
| router | "Bagian framework yang mencocokkan method dan path request dengan handler yang tepat." (34 kemunculan di 7 halaman) | 5.22 (7), 5.23 (18), 5.25 (1), 5.31 (3), 5.13 (1) berarti traffic router, komponen yang menggeser lalu lintas antar versi (Gateway API, Traefik); 5.5 (2) dan 5.7 (2) berarti router database di stack Django yang memilih koneksi tiap query (`read-replica.mdx:188`, `replication-lag.mdx:180`) | SALAH ARTI di 7 halaman: konteks yang dibaca di tiap halaman memakai traffic router atau router database, bukan router HTTP framework (Inti 5.23 menulis "Router memegang bobot canary", dengan tooltip router framework) |
| nonce | "Nilai sekali pakai ..." dua arti (tanda tangan pesan, AES-GCM) | 5.25 (11), 5.26 (19), memakai kedua arti | Cocok |
| partisi | satu bagian tabel (database) dan satu log berurutan (Kafka) | 13 halaman, 346 kemunculan; "partition" Inggris 41 kemunculan di 5 halaman tanpa tooltip | Cocok; ada entri "Partisi topik" dan "Partitioning" terpisah |
| alert | "Pemberitahuan otomatis ke orang yang sedang jaga ..." | 11 halaman; 5.19 punya entri "Alert TLS" sendiri yang menang atas "alert" (7 kemunculan), dan 2 "alert" biasa berarti pemberitahuan | Cocok |
| KMS, HSM | satu arti | 5.26 (33, 6) | Cocok |

Kosakata satu kata per konsep (`grep -o -i -w`): "replica" 310 kemunculan (18 halaman) berarti salinan database, sedangkan "replika" 131 (11 halaman) berarti dua hal: jumlah salinan pod Kubernetes ("tiga replika" di 5.22 dan 5.23, `m49-canary-sepertiga.mdx` 15 kali, `progressive-delivery.mdx` 20 kali) dan nama lab/berkas (`t5-replika`, `replika.txt`, `replika_laporan`); glosarium punya "Read replica" dan "Replication lag" dan tidak punya entri untuk "replika" Kubernetes. "secret" 31 kemunculan di 4 halaman dan "rahasia" 4 (hanya nama kode `rahasia-runtime` dan header `X-Gerbang-Rahasia`); "pembeli" 3 (2 halaman), "pelanggan" dan "pembayar" 0; "pengumuman" 110, "broadcast" 0; "angsuran" 157 (7 halaman) untuk satu pembayaran dan "cicilan" 72 (10 halaman) untuk fitur dan jadwal, sesuai naskah; "service" 477 dan "layanan" 30 (8 halaman, mis. "layanan verifikasi" tiruan). Satu kata dua arti di dalam satu halaman: "client" di 5.17 (uji baca butir 1).

**(b) Label di luar `/cara-pakai/` dan skill** (`tmp/eval5-label.py`, sapuan parentesis label di 32 MDX). Lima label ada di `/cara-pakai/` (Rekaman lab, Asumsi, Ilustrasi, Tidak dijalankan, [perlu verifikasi]). Dipakai di Tahap 5 di luar itu: "Hitungan" (31 halaman, 220 pemakaian; mis. "Hitungan atas Asumsi" 81 kali), "penalaran" atau "Penalaran" (26 halaman, 159), "dibaca dari kode" (23 halaman, 83; sering "Tidak dijalankan: dibaca dari kode"), kualifikasi Asumsi ("Asumsi naskah" 10, "Asumsi desain" 8 dan 2 dengan "belum ada di lab", "Asumsi produk" 7, "Asumsi cerita" 7, "Asumsi pembacaan" 3, "Asumsi lab" 2 dan 4 di dalam kalimat, "Asumsi halaman ini" 2), "Hitungan atas rekaman/kode" (9), dan "Dibaca dari riwayat CI" (hanya 5.27, 3 pemakaian). Skill gaya-bahasa mengizinkan label turunan bila berdampingan dengan satu label sumber dan diberi satu kalimat arti di pemakaian pertama halaman. Kalimat arti label turunan ada (`grep -l` atas pola definisi "Hitungan adalah/berarti" atau butir "**Hitungan:**", dan padanannya) di 27 dari 31 halaman untuk "Hitungan", 13 dari 26 untuk "Penalaran", dan 6 dari 23 untuk "Dibaca dari kode"; di halaman lain "dibaca dari kode" biasanya berdampingan dengan "Tidak dijalankan", yang artinya "dicek ke dokumentasi atau kode", jadi artinya bisa diturunkan tetapi tidak ditulis. 5.27 mendefinisikan keempat label turunan dalam satu daftar di blok Coba (`tim-infra.mdx:49-54`); 5.23 (`progressive-delivery.mdx:47`) dan 5.24 (`m50-satu-pos.mdx:55`) mendefinisikan tiga. "Cocok dengan halaman ADR" dan "Belum cocok dengan halaman ADR" bukan label sumber: itu teks hasil widget Tebak 5.32 (`t5-jembatan-tebak.json`) yang membandingkan pilihan dengan kalimat halaman ADR; "Dibaca dari riwayat CI" di 5.27 didefinisikan satu kalimat di halaman itu ("angka dari riwayat GitHub Actions situs belajar ini, bukan dari lab"; 5.27 `:54`).

**(c) Jawaban Tebak di prosa, meta description, dan paragraf aman** (`tmp/eval5-tebak.py`). Sembilan halaman memakai komponen Tebak (5.3, 5.5, 5.9, 5.13, 5.19, 5.21, 5.23, 5.30, 5.32); sampel 6 dengan seed 5: 5.19, 5.21, 5.23, 5.30, 5.32, 5.3. Hasil: paragraf `aman` di akhir blok Coba ("Kalau berhenti di sini, kamu sudah tahu: ...") menulis ulang jawaban benar di 4 dari 6 (5.19 "dijawab 403", 5.21 "tidak menulis jurnal kedua", 5.23 "HTTP 200 dengan keputusan tolak", 5.3 "PRIMARY KEY posting harus memuat kolom dibuat"); ia tampil sesudah widget di urutan DOM, tidak tersembunyi. Inti sebelum blok Coba menyebut jawaban di 5.19 ("menjawab 403 bila izin jenis jurnalnya tidak ada", `mtls-antar-service.mdx:21`) dan 5.21 ("Referensi unik di jurnal menahan jurnal kedua"); meta description 5.21 menulis mekanismenya ("menahan jurnal angsuran kedua dengan referensi unik"). 5.30 dan 5.32 bersih: jawaban 5.32 (ADR 58, 59, 60) tidak tertulis di prosa. Atribut island HTML 5.32 memuat `benar: true` dan alasan (catatan PR #528). Hasil-dulu dan paragraf `aman` adalah desain pemilik; dicatat tanpa mengubah YA atau TIDAK.

**(d) Angka beban** (`tmp/eval5-hitung.py`): lihat bagian "Angka beban naskah": 22 persamaan, 0 selisih, 8 dipakai di 5.2, 5.29, dan 5.31.

**(e) Rantai dan peta**: W1 dan W8 di kartu (`peta 5` exit 0; `rantai 5` 32 langkah, 0 hilang, exit 0).

**(f) Waktu baca** (`tmp/eval5-baca.py`, meta "Baca N menit" dan jumlah kata di `dist`): total 456 menit baca untuk 32 halaman. 19 dari 32 halaman di atas 10 menit; 16 halaman di atas 15 menit: 5.13 (24), 5.15 (22), 5.7 (21), 5.30 (21), 5.9 (20), 5.17 (20), 5.27 (20), 5.19 (19), 5.21 (19), 5.26 (19), 5.25 (18), 5.11 (17), 5.23 (17), 5.1 (16), 5.3 (16), 5.5 (16). Kata terbanyak: 5.15 (6.524), 5.26 (6.122), 5.3 (5.771). Dilaporkan, tidak dipecah (lingkup dibekukan; sama dengan polesan Tahap 3 dan 4).

**(g) Run main merah** (`gh run list --branch main --event push --limit 40`, 2026-11-02 17.38 sampai 11-05 03.30 UTC): 31 success, 8 failure, 1 berjalan (run 41961984609, merge #528; sekarang success, jadi 32 dari 40). Semua 8 gagal di job yang sama, "situs (Astro) ukur diagram luapan pool outbox cache webhook", dengan pesan "MACET luapan ... tidak selesai dalam 30 s" (G2d): run 41861320349 (/tahap-3/m21-satu-proses-mati/), 41854329471 (/tahap-2/saldo-bukan-kolom/), 41845039046 (/tahap-2/m10-dibayar-dua-kali/), 41696145926 (/tahap-2/fitur-transfer/), 41693746086 (/tahap-2/brute-force/), 41648920554 (/tahap-1/adr-transaction-koreksi/), 41592738792 (/tahap-2/race-lock/), 41529342877 (/tahap-1/apa-yang-dikerjakan-backend/). Tidak satu pun halaman yang macet adalah halaman Tahap 5 (0 dari 8); semuanya halaman Tahap 1 sampai 3. Laju naik: MEMORI mencatat 1 merah dari 41 untuk run main selama Tahap 4 (d08e467), sekarang 8 dari 40 (20%) sejak merge #491 (2026-11-02 21.32 UTC). Halaman Tahap 5 menambah 32 dari 336 halaman (±10%) yang diperiksa job itu, jadi tambahan paparan sebesar itu tidak menjelaskan kenaikan 8 kali lipat; penyebabnya tidak ditemukan di sini (beban runner atau jumlah tangkapan per job tidak diukur). Tiap run hijau lewat ulang job tanpa mengubah kode.

## Putaran perbaikan

Satu tugas perbaikan disisipkan di ANTREAN tepat sesudah EVAL-5, kategori rusak (informasi salah di depan pembaca), dan satu evaluasi ulang:

- `EVAL5-F1`: tooltip istilah salah arti. "token" di 5.6, 5.7, 5.31 (token LSN) dan "router" di 5.5, 5.7, 5.13, 5.22, 5.23, 5.25, 5.31 (traffic router dan router database) menampilkan arti yang berbeda dari pemakaian. Jalan perbaikan: entri glosarium sendiri untuk tiap arti ("Token LSN", "Traffic router", "Router database"), yang lebih panjang menang seperti "Alert TLS" menang atas "alert"; sapuan `<abbr>` atas HTML build sebagai penjaga.
- `EVAL-5-ulang`: seed 5 yang sama; W3, W4 (axe seluruh Tahap 5), W8, dan sapuan tooltip dinilai ulang; lab, ERD, dan uji baca tidak diulang bila `git diff --name-only 58d1e65d HEAD -- labs situs/data/erd tools/erd.py` kosong.

W5 tidak menjadi tugas perbaikan: skill menyerahkan keputusan itu ke pemilik (TINJAUAN-PEMILIK Tahap 2 butir 3, Tahap 3 butir 10, Tahap 4 butir 5), dan Tahap 4 tidak membuat tugas untuknya. Lima hal uji baca dan polesan lain tidak menjadi tugas (lingkup dibekukan, bukan kategori rusak, aksesibilitas, kontras, atau gerbang gagal).

## Ke TINJAUAN-PEMILIK

Evaluasi ini menulis bagian "Tahap 5" di `plan/TINJAUAN-PEMILIK.md` (14 butir, urut dari yang paling berat; sumbernya arsip "Perlu dicek pemilik" Tahap 5, catatan PR #526 sampai #528, dan evaluasi ini). Butir yang berasal dari evaluasi ini: W5 TIDAK pada enam halaman; tooltip salah arti dan tiga label turunan yang belum ada di `/cara-pakai/`; paragraf `aman` yang menulis ulang jawaban Tebak; lima hal membingungkan; waktu baca 16 halaman di atas 15 menit; run main merah 8 dari 40.

## Pelajaran Tahap 5

Bahan untuk DIRI-5. Tiap butir menyebut bukti dari evaluasi ini dan skill yang bisa berubah; keputusannya ada di DIRI-5.

1. evaluasi-tahap, W2: dua `make cek` sekaligus tidak mungkin di satu lajur, dan port server dengan offset bisa dipegang proses di luar repo (port 19268 dipegang "Code Helper"; t5-rollout gagal sesudah tiga bagian). Usul: skill dan brief menyebut `lsof -nP -iTCP:<port>` untuk rentang port lab berat sebelum mulai, dan mengulang dengan offset lain (rekaman memakai port dasar, jadi hasil tetap identik).
2. evaluasi-tahap, W5: nama blok Coba tidak seragam (`blok-coba`, `blok-coba-sendiri`, `blok-coba-keduanya`, `blok-coba-dulu-di-mana-uang-bergerak`); selektor `details.blok[data-blok^="blok-coba"]` perlu. Kontrol sesudah menebak (slider JedaReplica dan FanOut) baru muncul sesudah klik pilihan pertama. Usul: simpan `situs/tools/eval-coba.mjs` dengan uji diri (pelajaran EVAL-4 butir 2 berulang).
3. evaluasi-tahap, W6: `eval_tahap.py adr` salah baca tabel satu opsi per baris untuk ADR 51 (5.15) seperti ADR 35 (4.9). Usul: parser membaca kolom "Opsi" dan baris berawalan "A. ".
4. gaya-bahasa, istilah: plugin tooltip memasang satu arti di tiap kemunculan istilah, jadi istilah dengan beberapa arti (token, router) salah di halaman yang memakai arti lain. Usul: satu entri glosarium per arti dan entri yang lebih panjang menang; sapuan `<abbr>` atas `dist` (`tmp/eval5-istilah.py`) di evaluasi.
5. gaya-bahasa, label turunan: "Hitungan" (31 halaman), "penalaran" (26), "dibaca dari kode" (23), dan tujuh kualifikasi "Asumsi ..." dipakai luas, sedangkan `/cara-pakai/` dan skill hanya mengatur lima label dan satu kalimat arti per halaman. Usul: masukkan ketiga label turunan ke `/cara-pakai/` (keputusan pemilik; TINJAUAN-PEMILIK Tahap 3 butir 10 dan Tahap 4 butir 10 menanyakan hal yang sama).
6. gaya-bahasa, kosakata: "client" berarti proses dan koneksi di 5.17; "replika" berarti salinan pod dan nama lab di samping "replica" untuk salinan database. Usul: aturan "satu kata per konsep" mencakup kata yang tampak satu padanan dengan kata Inggrisnya ("replika" lawan "replica").
7. analisis-kritis, label: chip "Rekaman lab" pada hasil terukur di bawah masukan Asumsi (5.13: 500 dari 500 pada jeda 10 ms) sesuai bila `sumber.teks` menulis Asumsi lab. Usul: tulis di skill bahwa hasil terukur di bawah masukan Asumsi memakai chip Rekaman lab plus kualifikasi di teks tampil, sedangkan hasil rumus tetap memakai label masukan terlemah.
8. visualisasi, Tebak: paragraf `aman` di blok Coba menulis ulang jawaban Tebak di 4 dari 6 halaman yang disampel, dan atribut island memuat `benar: true`. Usul: keputusan pemilik; bila hasil harus tersembunyi, `Blok` butuh opsi `aman` yang muncul sesudah memilih.
9. evaluasi-tahap, uji baca: ekspor sesudah hidrasi menulis tombol sebagai `[tombol]` dan tautan sebagai `[-> /path/]`; pembaca segar menyelesaikan dalam 4 panggilan alat. Keluhan "penerbit tidak dijelaskan" dan "pod keempat" adalah istilah atau angka dari halaman prasyarat; aturan DIRI-4 "angka masukan yang asalnya di halaman lain" tetap belum menangkapnya.
10. analisis-kritis, CI: 8 dari 40 run main merah sejak 2026-11-02, semuanya satu job (ukur diagram luapan, G2d) di halaman Tahap 1 sampai 3; tidak ada hubungan dengan halaman Tahap 5. Usul: ukur penyebab (beban runner atau jumlah tangkapan per job) sebelum menambah halaman Tahap 6.

## Cara mengulang

Dari root worktree `rjt-konten` di `origin/main` 58d1e65d, dengan `situs/dist` dibangun (`bun run --cwd situs build`) dan preview di port 4323 (`bun run --cwd situs preview --background --port 4323 --host 127.0.0.1`):

```
python3 tools/eval_tahap.py peta 5 ; python3 tools/eval_tahap.py rantai 5 ; python3 tools/eval_tahap.py adr 5
python3 tools/eval_tahap.py coba 5 ; python3 tools/eval_tahap.py bocor 5 ; python3 tools/eval_tahap.py gejala 5
python3 tools/audit_bahasa.py --check ; python3 tools/contrast.py ; python3 tools/erd.py --cek ; python3 tools/cek_tautan.py
cd situs && UKUR_HALAMAN=<berkas 32 path> NODE_OPTIONS="--import <preload Chrome sistem>" node tools/layar.mjs --url http://127.0.0.1:4323
cd situs && NODE_OPTIONS="--import <preload>" node tools/ukur-axe.mjs --url http://127.0.0.1:4323 --semua --awalan /tahap-5/
cd situs && NODE_OPTIONS="--import <preload>" node tools/eval-keyboard.mjs --url http://127.0.0.1:4323 --path /tahap-5/pooler-koneksi/ --ukuran 375x667
export COMPOSE_PROJECT_NAME=rjt-ev5 LAB_DB_PORT=55233 LAB_REDIS_PORT=57279 LAB_PORT_OFFSET=900   # t5-rollout: 1000 bila 19268 terpakai
make -C labs/t5-cicilan cek ; make -C labs/t5-partisi cek ; make -C labs/t5-gabung cek ; make -C labs/t5-waf cek ; make -C labs/t5-rollout cek
```

Preload Chrome sistem hanya untuk `layar.mjs`, `tangkap.mjs`, `ukur-axe.mjs`, `ukur-erd.mjs`, dan `eval-keyboard.mjs`, bukan untuk Vitest atau `cek_situs.sh`; ia mengimpor Playwright dari worktree sendiri. Chromium Playwright tidak diunduh. Firefox dan Safari tidak diuji.
