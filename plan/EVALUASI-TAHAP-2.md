# Evaluasi Tahap 2 · Seluruh kampus

Dievaluasi 2026-10-26 oleh subagent evaluasi (skill evaluasi-tahap) yang tidak menulis halaman Tahap 2. Seed acak: 2. Putaran: 1 (bagian lain di bawah) dan 2 (bagian "Putaran 2" di akhir file).

Dasar yang dievaluasi: `origin/main` 7b2c84a, 33 halaman 2.1 sampai 2.33. Skill lain yang dipakai: analisis-kritis (bukti yang bisa diulang, tiga klaim dicek ke sumber), gaya-bahasa (teks dokumen ini), riset-tahap (jejak klaim). Nomor keputusan: 750 sampai 753.

## Kartu nilai

W1 sampai W4 wajib YA dan keempatnya YA. Satu butir (W5) TIDAK; alasannya ada di barisnya.

| Butir | Hasil | Bukti (perintah → keluaran, PR, tangkapan) |
| --- | --- | --- |
| W1 | YA | `python3 tools/eval_tahap.py peta 2` → naskah 33 halaman, registry 33, 0 halaman "segera", 0 selisih nomor, bintang, atau lab; satu judul berbeda dari naskah dengan sengaja: 2.8 "ADR 6 direvisi" menggantikan "ADR 12" karena nomor 12 sudah dipakai 1.40 (keputusan 723). Gerbang penuh `bash tools/cek_situs.sh --layar` di 7b2c84a → "semua pemeriksaan lolos", LOLOS, 27 menit (`tmp/cek-eval2.txt`, 1.430 baris). `gh run list --branch main --workflow cek` → run 40224485525 (merge #349) success dan run 40223718197 (merge #353, halaman 2.33) success. Tiap PR halaman MERGED dengan semua check SUCCESS dan 0 FAILURE (7 sampai 11 check): tabel PR di bagian "Daftar PR halaman" |
| W2 | YA | 14 angka dari 6 halaman (seed 2) ditelusuri ke baris rekaman, ditambah satu angka dari 2.18; 0 angka tanpa rekaman atau label (daftar di bagian "Telusur angka W2"). Tujuh lab diulang dari database bersih di lajur `rjt-konten4` (container baru `rjt-konten4-db-1`, port 54933) dan rekamannya identik per byte dengan yang di-commit: `make -C labs/b3-ledger cek`, `api-t2 cek`, `c4-ratelimit cek-login`, `t2-pencairan cek`, `e3-idempotency cek-ledger`, `b3-isolasi cek-ledger`, `b3-race cek-ledger` → exit 0 semuanya, `git status labs` kosong (`tmp/eval2-cek/*.txt`, `tmp/eval2-cek-b3-ledger.txt`) |
| W3 | YA | `python3 tools/audit_bahasa.py --check` → "262 file · 0 error · 235 peringatan"; hanya 33 halaman Tahap 2: "33 file · 0 error · 34 peringatan". Blok Gejala enam halaman masalah (seed 2: 2.10, 2.13, 2.29, 2.15, 2.27, 2.23) dibaca: 66 sampai 94 kata, hanya kejadian dan dialog. Istilah teknis di adegan hanya yang tampil di layar atau dibaca tokoh ("timeout" di layar Ani 2.15, "log login" yang dibuka Raka 2.27, "cabang" dan "main" di 2.23 karena kejadiannya memang penggabungan git) |
| W4 | YA | Layar pertama: `layar.mjs` di gerbang → 0 gagal di 1366×768, 1366×657, 375×812, 375×667. Terukur 20 dari 33 halaman (80 pengukuran); 13 halaman tanpa Inti dicetak "info" dan tidak diukur (2.1, 2.8, 2.10, 2.13, 2.15, 2.18, 2.21, 2.23, 2.25, 2.27, 2.29, 2.31, 2.33). Satu margin tipis: 2.26 di 375×667 sisa 13 px. Kontras: `python3 tools/contrast.py` → "843/843 lolos" dua mode (716 pasangan di tema.css, 4 dilewati sebagai pengecualian tertulis). axe-core 4.14.0 (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`): lima halaman seed 2 (2.4, 2.6, 2.24, 2.11, 2.20) → 20 run, 0 pelanggaran; seluruh 33 halaman `node tools/ukur-axe.mjs --semua --awalan /tahap-2/` → 132 run, 0 pelanggaran, uji diri 4/4 (axe "incomplete" color-contrast 1.912 node untuk mata manusia). Keyboard saja: `node tools/eval-keyboard.mjs` di 2.4, 2.11, 2.24 pada 375×667 dan 1366×657 → stop pertama "Lewati ke konten", Berikutnya halaman tercapai (121, 262, 162 Tab di HP; 271, 411, 309 di desktop), 0 stop tanpa tanda fokus, 0 kontrol di isi halaman yang terlewat; uji diri alat lolos (tanda fokus dimatikan → 121 stop terdeteksi) |
| W5 | TIDAK | `python3 tools/eval_tahap.py coba 2` dan baca data widget: dari 15 halaman konsep, 14 punya tebakan sebelum hasil dan satu masukan yang bisa diubah (tabel di bagian "Lampiran W5"). 2.32 (rekap): Coba = kartu "tebak lalu buka" tanpa masukan yang bisa diubah, jadi butir "ubah satu hal" tidak terpenuhi. Di luar kelompok konsep, 2.2 (pilah) juga tanpa "ubah satu hal". Catatan yang memperlemah butir ini walau tidak menggagalkannya menurut huruf skill: pada 2.12, 2.14, dan 2.16 jawaban tebakan sudah tertulis di Rantai Inti sebelum blok Coba (selisih Rp25.000, saldo Rp50.000, 3.893 query; `python3 tools/eval_tahap.py bocor 2`, yang hanya mendeteksi jawaban berangka) |
| W6 | YA | `python3 tools/eval_tahap.py adr 2` → 10 ADR (ADR 6 revisi di 2.8, ADR 13 sampai 21): 9 punya 4 opsi dan ADR 21 punya 3, semuanya dengan pre-mortem 3 penyebab, bagian "Kapan keputusan ini salah", dan 6 sampai 23 tautan sumber di halamannya. Tiga klaim sumber dicek ke primer 2026-10-26: RFC 9106 pilihan kedua t=3, p=4, m=64 MiB (2.28); draft IETF Idempotency-Key revisi -08, 22 Oktober 2026, Active, belum RFC, bagian 2.7 menyarankan 409 (2.14); halaman Microsoft Learn Event Sourcing menyebut event yang hanya mencatat keadaan sebagai change log tanpa makna bisnis dan biaya pindah yang besar (2.8). Ketiganya cocok |
| W7 | YA | `python3 tools/erd.py --cek` → "lolos: Tahap 1 5 tabel, Tahap 2 8 tabel, Tahap 3 14 tabel; hash sumber cocok". `labs/.venv/bin/python tools/erd.py --tahap 2` dari PostgreSQL lajur → "8 tabel, 11 foreign key; tidak berubah situs/data/erd/tahap-2.json; pembanding identik (10 file)"; Tahap 1 juga tidak berubah. Halaman 2.9 memuat `<ErdHalaman tahap={[1, 2]} />` dengan tombol "Bandingkan dengan Tahap 1"; `ukur-erd` di gerbang → "bandingkan → bertumpuk, 13 node, 18 edge, 0 di luar wadah" |
| W8 | YA | `python3 tools/eval_tahap.py rantai 2` → 33 langkah dari 2.1 sampai 2.33, semuanya 200, 0 tautan Berikutnya hilang; `python3 tools/cek_tautan.py` → "173 HTML: 27725 tautan internal ... rusak: 0 path, 0 anchor". Catatan: Berikutnya dari 2.33 menuju `/cerita/tahap-2/` ("Tahap 2 · Ceritanya", `diganti_oleh` t2-prd, halaman lama), lalu delapan halaman lama lain sebelum Tahap 3. Itu di luar rumusan W8 (sampai jembatan) tetapi merusak jalur sesudahnya; lihat "Putaran perbaikan" |

## Daftar PR halaman

| Halaman | PR | Halaman | PR | Halaman | PR |
| --- | --- | --- | --- | --- | --- |
| 2.1 | #277 | 2.12 | #298 | 2.23 | #318 |
| 2.2 | #279 | 2.13 | #300 | 2.24 | #323 |
| 2.3 | #299 | 2.14 | #301 | 2.25 | #327 |
| 2.4 | #282 | 2.15 | #302 | 2.26 | #334 |
| 2.5 | #287 | 2.16 | #305 | 2.27 | #335 |
| 2.6 | #288 | 2.17 | #307 | 2.28 | #337 |
| 2.7 | #292 | 2.18 | #311 | 2.29 | #339 |
| 2.8 | #290 | 2.19 | #312 | 2.30 | #341 |
| 2.9 | #293 | 2.20 | #322 | 2.31 | #346 |
| 2.10 | #296 | 2.21 | #309 | 2.32 | #351 |
| 2.11 | #295 | 2.22 | #319 | 2.33 | #353 |

Sumber: `git log origin/main --merges` dan `gh pr view <n> --json statusCheckRollup` (`tmp/eval2-ci.txt`). Semua 33 PR MERGED; PR terakhir (#353) merge 2026-10-25 18:57 UTC, 02.57 WITA 26 Oktober.

## Telusur angka W2

Halaman dipilih dengan seed 2 dari halaman Tahap 2 yang punya lab: `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==2 and x.get('nomor') and x.get('lab')]; random.seed(2); print([x['nomor'] for x in random.sample(h,6)])"` → 2.4, 2.5, 2.27, 2.14, 2.8, 2.12.

| Halaman | Angka atau status di halaman | Rekaman |
| --- | --- | --- |
| 2.4 | Budi Rp180.000 jadi Rp385.000, sama dengan cache | `labs/b3-ledger/output/tutup-buku.txt:32` |
| 2.4 | 11 jurnal, 0 tidak seimbang, jumlah posting 0 | `labs/b3-ledger/output/tutup-buku.txt:45` |
| 2.4 | 1.016 buku cocok, 1.122 jurnal; sesudah COMMIT 1.123 dan Rp1.020.000 jadi Rp1.021.000 | `labs/api-t2/output/tutup-buku.txt:10-11`, `:59`, `:66`, `:72`, `:84` |
| 2.4 | Jurnal −Rp225.000 ditolak SQLSTATE 23514 | `labs/b3-ledger/output/invarian.txt:21,23` |
| 2.5 | 12 warung bersaldo Rp2.450.000 | `labs/t2-pencairan/output/benar.txt:48` |
| 2.5 | Warung Ani Rp310.000 | `labs/t2-pencairan/output/benar.txt:17` |
| 2.27 | 29 akun disemprot, 1 tembus (Karyawan 514), 0 terkunci | `labs/c4-ratelimit/output/login/ratelimit.txt:30-32` |
| 2.27 | Kunci 60, 120, lalu 240 detik | `labs/c4-ratelimit/output/login/ratelimit.txt:37,39,40` |
| 2.14 | Satu key per niat: saldo Budi Rp75.000 | `labs/e3-idempotency/output/ledger/key-per-niat.txt:23-24` |
| 2.14 | Dua baris key dengan hash sama `708cd1009764…` | `labs/e3-idempotency/output/ledger/key-per-percobaan.txt:60-61` |
| 2.8 | 9 buku cocok, 11 jurnal seimbang | `labs/b3-ledger/output/tutup-buku.txt:26-34`, `:45` |
| 2.8 | Catatan Budi Rp320.000, saldo Rp250.000 (ADR 6 versi kolom) | `labs/api-t1/output/koreksi.txt:74` |
| 2.12 | Selisih −Rp25.000 di buku Budi dan +Rp25.000 di Warung Ani | `labs/b3-isolasi/output/ledger/laporan.txt:63-64` |
| 2.12 | Dua transfer M9 tanpa lock, saldo −Rp20.000 | `labs/b3-isolasi/output/ledger/transfer.txt:48,91` |

Tambahan di luar sampel: 2.18 "205 halaman, 204 baris ganda, 4.098 jadi 4.302 posting" ← `labs/b2-query/output/ledger/pagination.txt:79-80`. Kondisi yang tidak terulang di lab dilabeli di halaman: Ilustrasi untuk M11 "4 detik", M15 "ditemukan di tutup buku bulan pertama" (Rp15.000 sendiri terulang untuk satu Jumat di `rentan.txt`), dan skenario Dimas di 2.27; Asumsi untuk paket data 2.20 dan angka beban 2.30; "dibaca dari kode, belum direkam" untuk klaim yang tidak punya rekaman. Penghitungan label per halaman (`grep` Ilustrasi, Asumsi, Tidak dijalankan, perlu verifikasi): semua 33 halaman memuat sedikitnya satu label atau "Rekaman lab"; 2.10, 2.13, dan 2.18 tanpa label Ilustrasi atau Asumsi karena seluruh angkanya ada di rekaman.

## Lampiran W5

Halaman konsep (registry `jenis: konsep`). Data diperiksa di `situs/public/widgets/data/*.json` (kunci `predict`, `toggles`, `varian`), komponen React di `situs/src/widgets/*`, dan teks Coba di MDX.

| Halaman | Komponen Coba | Tebak dulu | Ubah satu hal |
| --- | --- | --- | --- |
| 2.6 | runsql `t2-saldo-bukan-kolom` | `predict` | `toggles` |
| 2.7 | alur `t2-ledger` | `predict` | `varian` |
| 2.9 | ErdHalaman dan Tebak | komponen Tebak | tombol "Bandingkan dengan Tahap 1" |
| 2.11 | RaceLedger | tebak saldo per cara | "Ubah satu hal: cara mengunci" (aria-pressed) |
| 2.12 | alur `t2-isolasi` | `predict` | `varian` REPEATABLE READ |
| 2.14 | alur `t2-idempotency` | `predict` | `varian` key per niat |
| 2.16 | alur `t2-n1` | `predict` | `varian` |
| 2.17 | runsql `t2-index` | `predict` | `toggles` |
| 2.19 | runsql `t2-kursor` | `predict` | `toggles` |
| 2.20 | UkuranPayload | tebak | lima tombol aria-pressed |
| 2.22 | TigaRilis | tebak | "gabungkan semuanya jadi satu langkah" |
| 2.26 | TabSet empat kejadian | `details.question` | "Sekarang ubah satu hal: pilih kejadiannya" |
| 2.28 | PertahananLogin | tebak | "kondisi penyemprotan" |
| 2.30 | Kalkulator | tebak | skenario (aria-pressed) |
| 2.32 | kartu `t2-rekap-kartu` | tebak lalu buka | tidak ada |

Halaman masalah, fitur, dan ADR memakai pola yang sama (runsql, alur, atau widget React dengan tebak dan "ubah satu hal"); 2.2 memakai pilah. Halaman PRD (2.1, 2.33) tidak punya blok Coba.

Dua catatan tentang kekuatan tebakan. Di 2.26 tebakan berupa lipatan (`details.question`) dan hasil tab A terlihat tanpa menebak; widget runsql, alur, dan React menyembunyikan hasil sampai pembaca memilih, sedangkan TabSet (2.24, 2.26) tidak menegakkannya. Di 2.12, 2.14, dan 2.16 jawaban tebakan sudah tertulis di Rantai Inti (`python3 tools/eval_tahap.py bocor 2` membandingkan angka di jawaban `predict` dengan teks `situs/dist` sebelum blok Coba: Rp25.000, Rp50.000, dan 3.893 muncul di Inti; 2.3 juga cocok dengan Rp0 yang lemah, dan 2.13 menampilkan hasil di blok Yang sebenarnya menurut rancangan halaman masalah; jawaban berupa teks di 2.6, 2.7, 2.8, 2.17, dan 2.19 tidak bisa diperiksa dengan cara ini). Kedua catatan itu masuk TINJAUAN-PEMILIK butir 3.

## Pertanyaan pembaca

Halaman dipilih dengan `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==2 and x.get('nomor')]; random.seed(2); print([x['nomor'] for x in random.sample(h,5)])"` → 2.4, 2.6, 2.24, 2.11, 2.20 (lima pertama untuk axe, tiga pertama di bawah). Tangkapan 375×667 gelap yang dibuka: `situs/tangkapan/tahap-2_fitur-tutup-buku-hp-dark.png` (2.4) dan `situs/tangkapan/tahap-2_tim-infra-hp-dark.png` (2.24). Halaman 2.6 dijawab dari DOM (`situs/tmp/eval2_dom.mjs` di 375×667, hasil di `tmp/eval2-dom.txt`).

| Halaman | Di mana | Dari mana | Ke mana |
| --- | --- | --- | --- |
| 2.4 | Jalur "Tahap 2 › Fitur ke teknis" dan judul "2.4 Fitur: tutup buku bulanan"; kepala blok "Yang diminta PRD · Blok 1 dari 4" | Baris meta "Prasyarat: 2.3 Fitur transfer" (tautan, terlihat di layar pertama); Sebelumnya "2.3 Fitur: transfer antar karyawan" | Tombol "Berikutnya: Coba: buku yang tidak cocok →" di akhir blok 1 (di bawah layar pertama); Berikutnya halaman "2.5 Fitur: pencairan warung terjadwal" |
| 2.6 | Jalur "Tahap 2" dan judul "2.6 Kenapa saldo bukan kolom"; "Blok 1 dari 5 · 1 menit" | "Prasyarat: 2.4 Fitur tutup buku"; Sebelumnya "2.5 Fitur: pencairan warung terjadwal" | "Berikutnya: Coba →" di akhir blok 1; Berikutnya halaman "2.7 Ledger double-entry: jurnal, posting, invarian" |
| 2.24 | Jalur "Tahap 2" dan judul "2.24 Tim dan infra Tahap 2: review, branch protection, tes integrasi + ADR 18"; "Blok 1 dari 5" | "Prasyarat: 2.23 M14"; Sebelumnya "2.23 M14: Batas harian yang hilang" | "Berikutnya: Coba →" di akhir blok 1; Berikutnya halaman "2.25 M15: Rp15.000 di file bank" |

Dalam tiga detik di layar pertama pembaca tahu halaman mana (judul bernomor dan jalur), apa yang dibaca dulu (Inti dan Rantai di bawah kepala blok), dan dari mana (meta Prasyarat). Tombol Berikutnya antarblok baru terlihat sesudah menggulir; layar pertama hanya menunjukkan "Blok 1 dari N". Jalur di 2.6 dan 2.24 hanya "Tahap 2", karena butir terakhir jalur dibuang bila judul sudah memuatnya (keputusan 210).

## Uji baca: 5 hal membingungkan

Pembaca: satu subagent segar (tipe general-purpose, tanpa konteks proyek) yang diberi persona mobile engineer baru di backend dan teks polos tiga halaman Tahap 2 dari `situs/dist` (2.10, 2.14, 2.28, plus akses ke halaman istilah dan 2.7). Ia tidak diberi tahu apa yang dicari dan dilarang membuka folder repo lain. Lima butir di bawah dari laporannya, ringkas tanpa mengubah maksud; kolom terakhir klasifikasi evaluator.

| No | Halaman dan kalimat | Kenapa membingungkan (kata pembaca) | Klasifikasi |
| --- | --- | --- | --- |
| 1 | 2.10, blok "Yang sebenarnya": "SET CONSTRAINTS ALL IMMEDIATE ... alat lab: pemeriksaan invarian 3 dijalankan sekarang, bukan di dalam COMMIT" | Kejadian Budi muncul hanya lewat alat buatan lab; tanpa alat itu rekaman berakhir error 23514. Pembaca tidak tahu mana yang realistis. "Invarian 3", "pemeriksaan yang ditunda", dan `saldo_cache` muncul tanpa penjelasan di halaman ini | Kosakata dan prasyarat (istilah dari 2.7; 2.10 menautkannya tetapi pembaca tidak membukanya) ditambah desain (kejadian bergantung alat lab, sudah berlabel "kondisi dibuat") |
| 2 | 2.28, blok Paham: "Setiap jawaban gagal sama: status 401 ..." padahal rekaman api-t2 memuat `429 Too Many Requests ... Terlalu banyak percobaan untuk akun ini` | Batas per akun di memori dan kunci akun di database sama-sama bernilai 5; pembaca tidak bisa membedakan fungsinya, dan 429 tampak bertentangan dengan "penebak tidak tahu akun ini terkunci" | Kekeliruan teks kecil: kalimat itu melebih-lebihkan. Diperbaiki di PR #356 (keputusan 750): hanya tebakan yang lolos kedua batas di memori dijawab 401; yang ditolak batas dijawab 429, dan karena kunci bucket per akun adalah teks email sebelum akun dicari (`labs/c4-ratelimit/login/main.go:333`), email yang tidak terdaftar pun mendapat 429, jadi 429 bukan tanda akun ada. Dua lapis (memori dan database) yang sama-sama berambang 5 tetap membingungkan: polesan |
| 3 | 2.14, Inti dan Coba: "App mengenalkannya dengan satu key per niat bayar" dan "dengan sidik jari yang sama" | "Niat" dan "sidik jari" dipakai sejak awal, baru didefinisikan di blok Paham. Hasil Rp50.000 sudah terbaca di Rantai Inti, jadi "Tebak dulu" di blok Coba tidak berarti | Kosakata (dua istilah dipakai sebelum dijelaskan) ditambah desain (Inti membocorkan jawaban tebakan; terbukti juga di 2.12 dan 2.16) |
| 4 | 2.14, ADR 14: "Mode peralihan ini rancangan: belum ada di lab dan belum direkam." | Status ADR "diterima", tetapi mode peralihan belum ada di lab dan penyimpanan niat di app serta job pembersih ditunda. Pembaca Flutter tidak tahu apa yang harus dibuat sekarang. Aturan 5 merujuk ADR 10 yang tidak dijelaskan di halaman ini | Desain (keputusan diterima bercampur dengan bagian yang belum dibangun; label jujur sudah ada) ditambah di luar lingkup (keputusan 654 dan 793, ADR 10 ada di Tahap 1; butir pemilik sudah ada) |
| 5 | 2.28, bagian Hash password dan ADR 20: "Argon2id 64 MiB dipilih karena lab sudah menjalankannya", lalu "RAM VPS Tahap 2 tidak ada di naskah [perlu verifikasi]" | Keputusan diambil dengan angka yang syaratnya belum diketahui (64 MiB, 10 hash bersamaan = 640 MiB, RAM server tidak diketahui). Label "Asumsi" dan "[perlu verifikasi]" bertebaran tanpa penjelasan | Di luar lingkup (naskah tidak menyebut RAM; sudah di daftar pemilik) ditambah desain (arti label dijelaskan di `/cara-pakai/`, bukan di halaman yang memakainya) |

## Putaran perbaikan

Satu tugas perbaikan disisipkan di `plan/ANTREAN.md` tepat sesudah EVAL-2, lalu `EVAL-2-ulang` sekali (keputusan 752):

- `EVAL2-F1` · Berikutnya sesudah jembatan Tahap 2 tidak masuk halaman lama. Kategori rusak: Berikutnya dari 2.33 menuju `/cerita/tahap-2/` dan delapan halaman lama (B3.2, B3.3, B2.4, B2.3, E3, B4.2, B1.3, E5) yang sudah digantikan halaman 2.x. Halaman lama tidak dihapus (itu butuh persetujuan pemilik); tugas hanya mengubah urutan baca.
- `EVAL-2-ulang` · satu evaluasi ulang ringan dengan seed 2 yang sama, bergantung pada EVAL2-F1. `DIRI-2` dan `KONSISTENSI-3` kini bergantung pada EVAL-2-ulang.

Tidak ada tugas halaman untuk W5. 2.32 adalah halaman rekap dan 2.2 latihan memilah; menambah masukan "ubah satu hal" di sana berarti merancang interaksi yang dibuat-buat, jadi keputusannya diserahkan ke pemilik (butir 3 di `plan/TINJAUAN-PEMILIK.md`) dan ke DIRI-2 (butir 1 di bagian Pelajaran). W5 tetap TIDAK sampai ada keputusan itu.

Hasil evaluasi ulang: bagian "Putaran 2" di akhir file (2026-10-26, EVAL-2-ulang): W1 sampai W4 dan W6 sampai W8 YA, W5 TIDAK; tahap dinyatakan selesai.

## Ke TINJAUAN-PEMILIK

Disalin ke `plan/TINJAUAN-PEMILIK.md` bagian "Tahap 2": W5 yang tetap TIDAK (butir 3), halaman lama yang menumpuk di akhir Tahap 2 (butir 2), lima hal membingungkan (butir 8), dan butir dari catatan PR #317 sampai #353 serta arsip MEMORI yang belum pernah dilihat pemilik (butir 1, 4 sampai 7, 9, dan 10).

## Pelajaran Tahap 2

Bahan untuk DIRI-2. Setiap butir menyebut bukti dari Tahap 2 dan skill yang bisa berubah; keputusan perubahannya ada di DIRI-2, bukan di sini.

1. evaluasi-tahap, W5: definisi "ubah satu hal" tidak cocok untuk halaman rekap (2.32, kartu) dan latihan memilah (2.2, pilah), dan tidak menangkap tebakan yang jawabannya sudah tertulis di Inti (2.12, 2.14, 2.16). Usul: kecualikan halaman rekap secara tertulis, dan tambahkan syarat "jawaban tebakan tidak muncul di teks sebelum blok Coba" yang diperiksa `tools/eval_tahap.py`.
2. evaluasi-tahap, W8: rumusan "sampai jembatan" lolos walau Berikutnya dari jembatan menuju halaman lama (`urutanBaca` memasukkan halaman `lama` yang sudah digantikan). Usul: tambah syarat "langkah sesudah jembatan bukan halaman bertanda lama"; `tools/eval_tahap.py rantai` sudah mencetaknya.
3. evaluasi-tahap, W4: `layar.mjs` melewati 13 dari 33 halaman karena tanpa Inti, jadi kartu harus menyebut jumlah halaman yang terukur. `ukur-axe --semua --awalan /tahap-N/` ringan (132 run, 24,7 detik), jadi W4 bisa memakai seluruh halaman, bukan lima. Uji keyboard memang menemukan nol cacat, tetapi versi pertama alatnya salah menganggap `:focus-visible` sebagai tanda fokus dan lolos palsu sampai uji diri (tanda fokus dimatikan) membuatnya gagal: setiap alat bukti diuji mutasi.
4. analisis-kritis: kata "setiap", "selalu", "semua" di prosa menjadi klaim yang paling sering melebihi rekaman. Contoh nyata: 2.28 menulis "setiap jawaban gagal sama" sementara `labs/api-t2/output/pengaman.txt:140` merekam 429; peninjau tiap halaman Tahap 2 menemukan klaim melebihi rekaman (MEMORI Pelajaran, 2026-10-25). Usul: sebelum menulis kata penuh itu, cari satu kasus tandingan di rekaman.
5. analisis-kritis: dua angka naskah tidak terulang di lab (M11 "4 detik", M13 "40 detik") dan satu terulang hanya untuk satu Jumat (M15 Rp15.000, tanpa penemuan di tutup buku bulan pertama) dan satu hanya lewat alat lab (M9 −Rp20.000); 2.32 mempersempit tiga dari sepuluh kalimat naskah (label Dipersempit). Praktik "jalankan lab dulu, catat apakah angka naskah terulang, lalu tulis halaman" berhasil dan layak masuk skill sebagai langkah tertulis.
6. riset-tahap: delapan butir "Belum bisa dicek" di `plan/RISET-TAHAP-2.md` tetap terbuka; ID riset bertabrakan sekali (R2-36 dipakai dua PR, PELAJARAN-ARSIP) sampai nomor dialokasikan per tugas. Usul: alokasi blok ID per tugas masuk skill.
7. visualisasi: widget baru Tahap 2 semuanya punya tebak dan ubah satu hal, tetapi Inti-Rantai yang memuat hasil membuat tebakan pertama tidak berarti (2.12, 2.14, 2.16). Usul: Rantai Inti menyebut pertanyaan, bukan hasil, pada halaman yang punya blok Coba dengan tebakan; ini keputusan desain pemilik (TINJAUAN-PEMILIK butir 3).
8. gaya-bahasa: istilah yang dipakai di Inti sebelum didefinisikan ("niat", "sidik jari" di 2.14; "invarian 3" di 2.10) dua dari lima keluhan pembaca segar. Label kejujuran ([perlu verifikasi], Asumsi, Ilustrasi) dijelaskan hanya di `/cara-pakai/`; pembaca yang masuk lewat tautan langsung tidak tahu artinya (keluhan 5). Usul: satu kalimat penjelas pada pemakaian pertama label di halaman, atau tooltip.

## Cara mengulang

```
git fetch origin && git checkout -B tahap-2/evaluasi origin/main
bun install --cwd situs && bash tools/get_fonts.sh
bash tools/cek_situs.sh --layar > tmp/cek.txt 2>&1 && echo LOLOS || echo GAGAL      # W1, W3, W4 (layar, kontras)
python3 tools/eval_tahap.py peta 2        # W1
python3 tools/eval_tahap.py coba 2        # W5 (lalu baca data widget)
python3 tools/eval_tahap.py bocor 2       # W5: jawaban tebakan yang sudah tertulis sebelum blok Coba
python3 tools/eval_tahap.py adr 2         # W6
python3 tools/eval_tahap.py rantai 2      # W8 (butuh situs/dist dari build)
python3 tools/erd.py --cek                # W7; bangun ulang: labs/.venv/bin/python tools/erd.py --tahap 2 dengan LAB_DB_PORT lajur
bun run --cwd situs preview --background --port 4329 --host 127.0.0.1
cd situs && node tools/ukur-axe.mjs --url http://127.0.0.1:4329 --semua --awalan /tahap-2/
cd situs && node tools/eval-keyboard.mjs --url http://127.0.0.1:4329 --path /tahap-2/fitur-tutup-buku/ --ukuran 375x667
export COMPOSE_PROJECT_NAME=rjt-konten4 LAB_DB_PORT=54933 LAB_REDIS_PORT=56979 LAB_PORT_OFFSET=600 && make lab-up
make -C labs/b3-ledger cek                # dan api-t2 cek, c4-ratelimit cek-login, t2-pencairan cek, e3-idempotency cek-ledger, b3-isolasi cek-ledger
```

Lajur lab di atas milik `rjt-konten4`; di worktree lain pakai nilai lajurnya (`labs/README.md`). Penelusuran angka W2 dan pemeriksaan tiga halaman memakai skrip sementara di `tmp/` yang tidak masuk repo; semua angka yang ditelusuri ada di tabel "Telusur angka W2" dengan file dan baris.

## Pemeriksaan tambahan di luar W1 sampai W8

| Pemeriksaan | Hasil |
| --- | --- |
| Tes | Vitest 853 lolos (48 file), `node --test` situs 20 lolos, widget lama 177 lolos, `astro check` 0 error (gerbang) |
| ID internal | "ID internal tidak tampil di teks halaman, sidebar, dan data widget" (gerbang) |
| Istilah | "istilah sinkron" (gerbang); 52 halaman istilah di `situs/dist/istilah/` |
| Keamanan | `gitleaks detect` v8.30.1 → 1.163 commit dipindai, "no leaks found". `python3 tools/cek_port_lab.py` → lolos, 420 file. Lab serangan Tahap 2 (c4-ratelimit, api-t2, t2-pencairan): `grep` host `http(s)://` non-lokal di skrip dan kode → 0 temuan; alamat penyerang di rekaman adalah alamat dokumentasi (RFC 5737) |
| KEPUTUSAN, MEMORI, STATUS | Belum mutakhir untuk 2.20 dan 2.24 sampai 2.33. MEMORI "Sedang dikerjakan" dan STATUS masih menulis "22 dari 33"; KEPUTUSAN belum memuat nomor 743 sampai 759, 775 sampai 779, 806, 807, 825, 830, 838, 839, dan 844 (catatan ada di badan PR #317 sampai #353). Itu tugas pengatur sesuai aturan file bersama (keputusan 727); evaluasi ini tidak mengubahnya |
| Perubahan di PR ini | Satu perbaikan teks 2.28 (keputusan 750), dua alat bukti (keputusan 753), dokumen ini, `plan/TINJAUAN-PEMILIK.md`, dan ANTREAN |

## Putaran 2

Dievaluasi 2026-10-26 oleh subagent evaluasi (skill evaluasi-tahap) yang bukan penulis halaman Tahap 2 dan bukan pelaksana EVAL2-F1. Seed acak 2, sampel sama dengan putaran 1: `random.sample` memberi 2.4, 2.5, 2.27, 2.14, 2.8, 2.12 (halaman berlab, W2) dan 2.4, 2.6, 2.24, 2.11, 2.20 (W4 dan pertanyaan pembaca).

Dasar: `origin/main` 1a3b0aa (merge #362), 33 halaman 2.1 sampai 2.33. Skill lain yang dipakai: analisis-kritis (kata penuh dan klaim negatif, butir 6 dan 7 yang berlaku sekarang) dan gaya-bahasa (bagian "Angka, label, dan istilah"). Definisi evaluasi-tahap dibaca sesudah DIRI-2 (`git log -p -3 -- .claude/skills`: #359 dan koreksi 1ef981c). Nomor keputusan: 1166 sampai 1168. Tidak ada halaman, skill, lab, atau naskah yang diubah di putaran ini, dan tidak ada putaran perbaikan kedua.

Dua batasan dari tugas ini. Pertama, lab tidak dijalankan ulang, jadi W2 dan W7 bertumpu pada rekaman yang di-commit. `git diff --stat 7b2c84a HEAD` kosong atas sepuluh lab Tahap 2 (b3-ledger, api-t2, c4-ratelimit, t2-pencairan, e3-idempotency, b3-isolasi, b3-race, b2-query, b4-skema, e5-payload), atas `situs/data/erd`, dan atas `tools/erd.py`. Hasil ulang tujuh lab di putaran 1 (identik per byte) karena itu tetap berlaku.

Kedua, uji baca oleh pembaca segar tidak diulang. Satu-satunya halaman yang berubah sejak putaran 1 adalah 2.28 (perbaikan keputusan 750), dan tugas ini boleh lebih ringan.

### Kartu nilai putaran 2

| Butir | Putaran 1 | Putaran 2 | Bukti (perintah → keluaran) |
| --- | --- | --- | --- |
| W1 | YA | YA | `python3 tools/eval_tahap.py peta 2` → "naskah 33 halaman, registry 33 halaman", 0 selisih, 0 "segera". Gerbang penuh `PORT_PREVIEW=4327 bash tools/cek_situs.sh --layar` di 1a3b0aa → "semua pemeriksaan lolos", LOLOS, 25 menit (`tmp/cek.txt`, 1.450 baris). `gh run list --branch main --workflow cek` → run 40257564474 (merge #361) dan 40258603680 (merge #362) success. 33 PR halaman (tabel "Daftar PR halaman") semuanya MERGED dengan semua check SUCCESS: 16 PR dengan 7 check, 9 dengan 8, 8 dengan 11, 0 selain SUCCESS (`gh pr view <n> --json state,statusCheckRollup`, 33 panggilan) |
| W2 | YA | YA | 15 dari 15 angka dari 6 halaman seed 2 cocok di teks halaman dan di baris rekaman yang di-commit (tabel "Telusur angka W2 putaran 2"). Label diperiksa terhadap definisi gaya-bahasa di 5 tempat (tabel yang sama): tiga sesuai, dua sebagian (2.30 dan 2.32), tidak ada yang salah. Lab tidak dijalankan ulang (batasan di atas); `git diff --stat 7b2c84a HEAD -- labs/<sepuluh lab>` kosong. Catatan: pencarian label per halaman di putaran 1 tidak lengkap, lihat "Koreksi atas putaran 1" |
| W3 | YA | YA | `python3 tools/audit_bahasa.py --check` → "262 file · 0 error · 236 peringatan"; Tahap 2 saja (`--check situs/src/content/docs/tahap-2`) → "33 file · 0 error · 35 peringatan". Satu peringatan lebih banyak daripada putaran 1 (34): kalimat 33 kata di 2.28 baris 86, dari perbaikan keputusan 750. Blok Gejala enam halaman seed 2 (2.10, 2.13, 2.29, 2.15, 2.27, 2.23) dibaca ulang: adegan 66 sampai 94 kata dalam 4 paragraf, hanya kejadian dan dialog. Istilah teknis di adegan hanya "timeout" di layar Ani (2.15), "log login" yang dibuka Raka (2.27), serta git, cabang, dan main di 2.23, yang memang kejadiannya |
| W4 | YA | YA | `layar.mjs` di gerbang → "LOLOS: 0 gagal, 0 margin tipis" (desktop) dan "0 gagal, 1 margin tipis" (HP); dari 33 halaman Tahap 2, 20 terukur dan 13 tanpa Inti dicetak "info" (daftar sama dengan putaran 1); margin tipis satu: 2.26 di 375×667 sisa 13 px. `python3 tools/contrast.py` di gerbang → "883/883 lolos" dua mode (putaran 1: 843). `node tools/ukur-axe.mjs --url http://127.0.0.1:4327 --semua --awalan /tahap-2/` → "uji diri 4/4 lolos; 33 halaman × 2 ukuran × 2 tema = 132 run; 0 halaman berpelanggaran; incomplete untuk dicek manusia: color-contrast 1912", 33,2 detik. `node tools/eval-keyboard.mjs` di 2.4 dan 2.11 → 121 dan 262 Tab di 375×667, 271 dan 411 di 1366×657, stop pertama "Lewati ke konten", Berikutnya halaman tercapai, tanpa tanda fokus 0, kontrol terlewat 0; `--uji-diri` di 2.11 → 262 stop tanpa tanda fokus terdeteksi, alat gagal bila tanda fokus dimatikan |
| W5 | TIDAK | TIDAK | Definisi sekarang: halaman rekap dan pilah tetap di daftar dan tidak dikecualikan; keluaran `bocor` dicatat tetapi tidak mengubah hasil. Dari 15 halaman konsep, 14 punya tebakan lalu satu masukan yang bisa diubah (tabel "Lampiran W5 putaran 2"); 2.32 (rekap) memakai kartu "tebak lalu buka" tanpa masukan yang bisa diubah, dan 2.2 (pilah) memakai latihan memilah tanpa masukan "ubah satu hal". `python3 tools/eval_tahap.py bocor 2` → 5 halaman dengan angka jawaban di teks sebelum blok Coba: 2.3 (Rp0), 2.12 (Rp25.000), 2.13 (Rp50.000, halaman masalah), 2.14 (Rp50.000), 2.16 (3.893). Penyebab TIDAK tetap 2.32 (dan 2.2 bila semua blok Coba dihitung, bukan hanya halaman konsep), bukan Inti hasil-dulu: tanpa keduanya butir ini YA menurut huruf skill |
| W6 | YA | YA | `python3 tools/eval_tahap.py adr 2` → 10 ADR (ADR 6 revisi di 2.8, ADR 13 sampai 21): 9 punya 4 opsi dan ADR 21 punya 3, semua `pre-mortem True`, `kapan salah True`, tautan sumber 6 sampai 23 per halaman. Pre-mortem berisi tepat tiga penyebab bernomor di 10 dari 10 (dihitung dari butir sesudah baris "Pre-mortem"; putaran 1 menulis angka ini tanpa alat yang menghitungnya). Tiga klaim sumber lain daripada putaran 1 dicek ke primer 2026-10-26: NIST SP 800-63B-4 bagian 3.1.1.2 menetapkan minimal 15 karakter dan melarang aturan komposisi (2.28); draft IETF Idempotency-Key revisi -08, 22 Oktober 2026, Active, belum RFC, bagian 2.7: 409 bila request asal masih dikerjakan, 422 bila key sama dengan isi berbeda (2.14, cocok dengan tabel di halaman); dokumentasi PostgreSQL 17 bagian 13.3.5: advisory lock tingkat sesi dilepas saat sesi berakhir (2.26). Ketiganya cocok |
| W7 | YA | YA | `python3 tools/erd.py --cek` → "lolos: Tahap 1 5 tabel, Tahap 2 8 tabel, Tahap 3 14 tabel; hash sumber cocok". `situs/data/erd/tahap-2.json` ada dan `git diff 7b2c84a HEAD -- situs/data/erd tools/erd.py` kosong; bangun ulang dari PostgreSQL tidak dijalankan (batasan di atas). 2.9 memuat `<ErdHalaman id="erd-t2" tahap={[1, 2]} />` dengan tombol "Bandingkan dengan Tahap 1"; `ukur-erd` di gerbang → "bandingkan → bertumpuk, 13 node, 18 edge, 0 di luar wadah" |
| W8 | YA | YA | `python3 tools/eval_tahap.py rantai 2` → "langkah dari 2.1 sampai 2.33: 33; 404 atau tautan hilang: 0"; 2.33 → `/cerita/tahap-3/` (T3, "Tahap 3 · Ceritanya", "halaman lama (penggantinya ada)=False"). `rantai 1` → 42 langkah, 1.42 → `/tahap-2/prd-v2/` (2.1). `python3 tools/cek_tautan.py` di gerbang → "175 HTML: 27975 tautan internal ... rusak: 0 path, 0 anchor". Uji diri: satu Berikutnya di `situs/dist/tahap-2/ledger/` diubah melompati satu halaman → `rantai 2` exit 1 ("TAUTAN AKHIR BLOK BEDA", "URUTAN SALAH ... seharusnya 2.8"), file dipulihkan dan exit 0 lagi |

W1 sampai W4 wajib YA dan keempatnya YA. W5 tetap TIDAK. Tidak ada putaran perbaikan kedua.

### Perubahan dibanding putaran 1

- W8: di putaran 1 Berikutnya dari 2.33 menuju `/cerita/tahap-2/` lalu delapan halaman lama; sekarang menuju `/cerita/tahap-3/`. Perbaikannya EVAL2-F1 (#361, keputusan 1150 sampai 1153), dan pagarnya ada di gerbang (keputusan 1164). Sembilan halaman lama (T2, B3.2, B3.3, B2.4, B2.3, E3, B4.2, B1.3, E5) tidak dihapus. Semuanya masih ada di `situs/dist` dan di sidebar (dicek per halaman), dan dari sidebar tetap menuju penggantinya.
- W5: hasil sama (TIDAK), tetapi definisinya sekarang tertulis: rekap dan pilah tidak dikecualikan, dan `bocor` hanya dicatat. Putaran 1 menulis bahwa jawaban tebakan di Inti "memperlemah butir ini walau tidak menggagalkannya"; definisi baru membenarkannya.
- W3: peringatan Tahap 2 dari 34 menjadi 35 (kalimat 33 kata di 2.28 yang menjelaskan 429).
- W4 dan W2 tidak berubah menurut isi. Angka alat bertambah karena Tahap 3: kontras 843 menjadi 883 pasangan, Vitest 853 menjadi 1.059, `node --test` situs 20 menjadi 35.

### Telusur angka W2 putaran 2

Lima belas angka sampel putaran 1 dicari lagi di teks MDX halaman dan di baris rekaman yang disebut. Skrip sementara di `tmp/` tidak masuk repo; tiap baris bisa diulang dengan `sed -n '<baris>p' <file>`. Hasil: 15 dari 15 cocok. Untuk 2.8, "9 buku" ada di `labs/b3-ledger/output/tutup-buku.txt:26-34` dan "11 jurnal" di `:45`.

Label diperiksa terhadap definisi gaya-bahasa dan `/cara-pakai/` "Label sumber":

| Halaman | Angka dan label | Sesuai definisi |
| --- | --- | --- |
| 2.15 | "4 detik" dan timeout, "Angka cerita (Ilustrasi)": rekaman tidak mengulangnya | Ya: contoh cerita, bukan hasil sistem |
| 2.25 | Rp15.000 "Angka cerita (Ilustrasi)": rekaman mengulang satu Jumat (2026-W43), saldo Warung 508 dibuat Rp15.000 | Ya; sesuai koreksi pengatur (terulang untuk satu Jumat, penemuan di tutup buku bulan pertama tidak) |
| 2.20 | 0,176 persen paket 1 GB pada 20 buka per hari, (Asumsi) | Ya: angka pelaksana, rumus di halaman |
| 2.30 | Tabel Little baris 1 dan 2: "(W: Rekaman lab)" dengan λ 1,39 dan L 2,69 dan 0,0425 | Sebagian: label hanya di W; L diturunkan dari λ Asumsi dan tidak berlabel di tabel, tetapi paragraf sesudahnya menyebut λ Asumsi dan batas atas. Aturan hasil rumus memakai label masukan terlemah belum dipenuhi di tabelnya |
| 2.32 | Label "Dipersempit" untuk tiga dari sepuluh kalimat | Sebagian: bukan satu dari lima label di `/cara-pakai/`, tetapi didefinisikan di halaman pada pemakaian pertama (baris 21 dan 54) |

### Lampiran W5 putaran 2

Data diperiksa ulang dari `situs/public/widgets/data/*.json` (`predict`, `toggles`, `varian`) dan komponen React; skrip sementara di `tmp/`.

| Halaman | Komponen Coba | Tebak dulu | Ubah satu hal |
| --- | --- | --- | --- |
| 2.6 | runsql `t2-saldo-bukan-kolom` | `predict` 4 opsi | `toggles` 1 |
| 2.7 | alur `t2-ledger` | `predict` 4 opsi | `varian` 3 |
| 2.9 | ErdHalaman dan Tebak | komponen Tebak | tombol "Bandingkan dengan Tahap 1" |
| 2.11 | RaceLedger | tebak saldo | "Ubah satu hal" memutar cara mengunci |
| 2.12 | alur `t2-isolasi` | `predict` 4 opsi | `varian` 3 |
| 2.14 | alur `t2-idempotency` | `predict` 3 opsi | `varian` 3 |
| 2.16 | alur `t2-n1` | `predict` 4 opsi | `varian` 3 |
| 2.17 | runsql `t2-index` | `predict` 3 opsi | `toggles` 1 |
| 2.19 | runsql `t2-kursor` | `predict` 4 opsi | `toggles` 1 |
| 2.20 | UkuranPayload | tebak | lima tombol `aria-pressed` |
| 2.22 | TigaRilis | tebak | "Satu langkah (rekaman M13)" |
| 2.26 | TabSet | `details` "Tebak dulu" | "Sekarang ubah satu hal: pilih kejadiannya" |
| 2.28 | PertahananLogin | tebak | `ubahJudul` (kondisi penyemprotan) |
| 2.30 | Kalkulator | tebak | skenario (`aria-pressed`) |
| 2.32 | kartu `t2-rekap-kartu` (10 entri) | tebak lalu buka | tidak ada |

Di luar kelompok konsep, 2.2 (pilah) meminta pembaca memilah sepuluh pekerjaan lalu memeriksa jawaban, tanpa "ubah satu hal". 2.31 (ADR 21, JarakPemicu) punya tebakan dan `ubahJudul`, jadi lolos. Halaman fitur, masalah, dan ADR lain memakai runsql, alur, atau widget React dengan tebakan dan satu masukan. Halaman PRD (2.1, 2.33) tanpa blok Coba.

Tebakan 2.24 dan 2.26 berupa lipatan, dan hasil tab pertama TabSet terlihat tanpa menebak. Widget runsql, alur, dan React menyembunyikan hasil sampai pembaca memilih.

### Pertanyaan pembaca (ringan, dari `situs/dist`)

Jawaban dibaca dari DOM tiga halaman pertama seed 2 tanpa tangkapan layar (putaran 1 membuka dua tangkapan).

| Halaman | Di mana | Dari mana | Ke mana |
| --- | --- | --- | --- |
| 2.4 | Jalur "Tahap 2 · Saldo salah dan dobel bayar", judul "2.4 Fitur: tutup buku bulanan", "Blok 1 dari 4" | Prasyarat "2.3 Fitur transfer"; Sebelumnya "2.3 Fitur: transfer antar karyawan" | Berikutnya "2.5 Fitur: pencairan warung terjadwal"; tautan akhir blok sama |
| 2.6 | Jalur yang sama, judul "2.6 Kenapa saldo bukan kolom", "Blok 1 dari 5" | Prasyarat "2.4 Fitur tutup buku"; Sebelumnya "2.5 Fitur: pencairan warung terjadwal" | Berikutnya "2.7 Ledger double-entry: jurnal, posting, invarian" |
| 2.24 | Jalur yang sama, judul "2.24 Tim dan infra Tahap 2: review, branch protection, tes integrasi + ADR 18", "Blok 1 dari 5" | Prasyarat "2.23 M14"; Sebelumnya "2.23 M14: Batas harian yang hilang" | Berikutnya "2.25 M15: Rp15.000 di file bank" |

### Koreksi atas putaran 1 (klaim yang terlalu kuat atau tidak bisa diulang)

1. W2 putaran 1: "2.10, 2.13, dan 2.18 tanpa label Ilustrasi atau Asumsi". Perintah `grep -L 'Ilustrasi\|Asumsi' situs/src/content/docs/tahap-2/*.mdx` memberi delapan halaman: 2.3, 2.4, 2.5, 2.7, 2.10, 2.12, 2.13, 2.18. Ketiganya benar, tetapi daftarnya tidak lengkap. Ke-33 halaman tetap punya sedikitnya satu dari lima label: `grep -L` atas kelimanya mengembalikan 0 file. Angka di delapan halaman itu berasal dari rekaman (2.4, 2.5, 2.12 ada di sampel W2).
2. W2 putaran 1: "0 angka tanpa rekaman atau label". Itu hanya benar untuk sampel 15 angka. Di luar sampel, 2.30 punya dua hasil yang tidak bisa diulang dari angka yang tertulis di halamannya (bagian "Temuan baru"). Label L di tabel Little juga belum mengikuti aturan label masukan terlemah.
3. W3 putaran 1 menulis blok Gejala "66 sampai 94 kata". Benar bila catatan "Angka cerita (Ilustrasi)" tidak dihitung; dengan catatan itu 66 sampai 125 kata. Adegannya sendiri tetap 4 paragraf.
4. W6 putaran 1 menulis "pre-mortem 3 penyebab" tanpa alat yang menghitungnya (`eval_tahap.py adr` hanya memeriksa ada atau tidaknya). Putaran ini menghitung butir bernomor sesudah baris Pre-mortem: 3 dari 3 di 10 halaman. Klaimnya benar; alat gerbangnya belum menegakkannya (polesan).
5. Klaim "M15 Rp15.000 tidak terulang di lab" sudah dikoreksi pengatur (terulang untuk satu Jumat di `rentan.txt`, penemuan di tutup buku bulan pertama tidak); koreksinya tidak dibalik.

### Temuan baru

- 2.30, baris tabel dan Latihan 2: "0,87 × (0,02 + 2) = 1,75". 0,87 × 2,02 = 1,7574, jadi 1,76. Angka 1,75 berasal dari λ 0,868 (0,868 × 2,02 = 1,7534), dan halaman tidak menulis 0,868 maupun kalimat pembulatan untuk 0,87. 2.33 sudah memakai 0,868. Kelasnya sama dengan contoh di gaya-bahasa ("satu angka, satu bentuk"). Polesan, bukan butir W.
- 2.30, baris terakhir tabel dan Latihan 2: "17,4 × 2 = 34,7", padahal 17,4 × 2 = 34,8. Angka 34,7 berasal dari 17,36 × 2 = 34,72, dan halaman menulis "17,36 dibulatkan" hanya di baris 79. Polesan.
- 2.28, baris 86: satu kalimat 33 kata ("Batas per akun memakai teks email ...") dari perbaikan keputusan 750. Isinya cocok dengan `labs/c4-ratelimit/login/main.go:330-345` dan `output/login/ratelimit.txt`; hanya panjangnya melebihi 25 kata. Polesan.
- 2.32 memakai label "Dipersempit" yang bukan bagian dari lima label di `/cara-pakai/`. Polesan; sudah dekat dengan butir "Hitungan" di USULAN-PERBAIKAN.
- Alat gerbang `eval_tahap.py adr` tidak menghitung penyebab pre-mortem (butir 4 di atas). Polesan.
- TINJAUAN-PEMILIK butir 2 masih menulis keadaan sebelum EVAL2-F1 (halaman lama masuk urutan baca). Diperbarui di PR ini (keputusan 1168).

### Hasil putaran 2

Tahap 2 dinyatakan selesai apa pun hasilnya (skill evaluasi-tahap, langkah "Setelah kartu" butir 2). Hasil: W1 sampai W4 dan W6 sampai W8 YA, W5 TIDAK.

Butir yang tetap TIDAK ada di `plan/TINJAUAN-PEMILIK.md` bagian Tahap 2 butir 3 (W5), dengan satu baris hasil putaran 2. Tidak ada butir TIDAK yang baru, jadi tidak ada butir baru di file itu. Butir 2 diperbarui karena keadaannya berubah sesudah EVAL2-F1. Lima hal membingungkan dari uji baca putaran 1 tetap di butir 8 dan tidak diulang.

### Cara mengulang putaran 2

```
git fetch origin && git checkout -B tahap-2/eval2-ulang origin/main
bun install --cwd situs && bash tools/get_fonts.sh
PORT_PREVIEW=4327 bash tools/cek_situs.sh --layar > tmp/cek.txt 2>&1 && echo LOLOS || echo GAGAL   # W1, W3, W4 (layar, kontras), W8 (rantai 1 dan 2, tautan)
python3 tools/eval_tahap.py peta 2        # W1
python3 tools/eval_tahap.py coba 2        # W5 (lalu baca data widget dan komponen)
python3 tools/eval_tahap.py bocor 2       # W5: dicatat saja
python3 tools/eval_tahap.py adr 2         # W6
python3 tools/eval_tahap.py rantai 2      # W8; juga rantai 1; butuh situs/dist dari build
python3 tools/erd.py --cek                # W7
python3 tools/audit_bahasa.py --check situs/src/content/docs/tahap-2   # W3, hanya Tahap 2
grep -L 'Ilustrasi\|Asumsi' situs/src/content/docs/tahap-2/*.mdx          # label per halaman
bun run --cwd situs preview --background --port 4327 --host 127.0.0.1
cd situs && node tools/ukur-axe.mjs --url http://127.0.0.1:4327 --semua --awalan /tahap-2/
cd situs && node tools/eval-keyboard.mjs --url http://127.0.0.1:4327 --path /tahap-2/fitur-tutup-buku/ --ukuran 375x667   # dan race-lock, 1366x657, --uji-diri
bun run --cwd situs preview stop
gitleaks detect --no-banner               # 1.211 commit, no leaks found
```

Tanpa menjalankan lab: tujuh lab dan bangun ulang ERD dari PostgreSQL (baris terakhir "Cara mengulang" putaran 1) hanya perlu diulang bila `git diff --stat 7b2c84a HEAD -- labs situs/data/erd tools/erd.py` tidak kosong untuk lab Tahap 2.

Penelusuran angka, label, dan pre-mortem memakai skrip sementara di `tmp/` yang tidak masuk repo. Semua angka yang ditelusuri ada di tabel di atas dengan file dan baris.
