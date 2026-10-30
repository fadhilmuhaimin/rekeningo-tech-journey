# Evaluasi Tahap 4 · Dibuka ke publik

Dievaluasi 2026-10-31 oleh subagent evaluasi (skill evaluasi-tahap) yang tidak menulis satu pun halaman Tahap 4. Seed acak: 4. Putaran: 1.

Dasar yang dievaluasi: `origin/main` d6e2b521 (merge #465, halaman 4.31), 31 halaman 4.1 sampai 4.31. Commit sesudahnya (8042f678, #467) hanya mengubah `plan/` (`git diff --stat d6e2b521 origin/main`: 6 file, semuanya di `plan/`). Skill lain yang dipakai: analisis-kritis (bukti yang bisa diulang, tiga klaim dicek ke sumber primer, mutasi alat), gaya-bahasa (pemeriksaan label dan klasifikasi uji baca), visualisasi (tiga tangkapan 375×667 dinilai). Nomor keputusan: 1394 sampai 1396, dicatat di badan PR.

## Kartu nilai

W1 sampai W4 wajib YA. Hasil: W1, W3, W4, W6, W7, W8 YA. W5 TIDAK, sama seperti Tahap 2 dan 3. W2 YA atas penelusuran angka dan pemeriksaan label, tetapi bagian "ulang lab" belum dijalankan: Docker Desktop tidak bisa dihidupkan dari sesi ini (lihat baris W2), jadi pengatur melengkapinya.

| Butir | Hasil | Bukti (perintah → keluaran, PR, tangkapan) |
| --- | --- | --- |
| W1 | YA | `python3 tools/eval_tahap.py peta 4` → "naskah 31 halaman, registry 31 halaman", "halaman bercatatan: 0", 31 baris `ada=True`, 0 halaman "segera", 0 selisih bintang atau lab. Judul registry dibandingkan terpisah dengan tabel peta di `plan/CERITA-TAHAP-4.md`: 31 dari 31 sama; jenis cocok 31 dari 31 sesudah menormalkan nama ("Konsep + ADR" dan "Keamanan + ADR" adalah konsep dengan kunci `adr`, "Fitur → teknis" adalah fitur, "Tim dan infra" adalah tim-infra). `gh run list --branch main --workflow cek` → run 41141319115 (merge #465, 4.31) success 11m46s, 41142231464 (merge #467) success 12m12s, 41140404504 (merge #466) success. 31 PR halaman MERGED, masing-masing dengan 11 check SUCCESS dan 0 selain itu (bagian "Daftar PR halaman", `gh pr view <n> --json statusCheckRollup`). Gerbang penuh `cek_situs.sh --layar` tidak diulang di sini; CI menjalankannya per PR dan di main, dan alat gerbang yang relevan dijalankan satu per satu di bawah |
| W2 | YA, ulang lab tertunda | 20 baris tabel (lebih dari 40 angka dan status) dari 6 halaman berlab (seed 4: 4.10, 4.12, 4.6, 4.15, 4.18, 4.7) ditelusuri ke baris rekaman atau label, 0 tanpa keduanya (bagian "Telusur angka W2"). Label dibandingkan dengan definisi di gaya-bahasa di 6 tempat: 6 sesuai. 16 persamaan dihitung ulang dengan skrip: 0 salah. **Ulang lab belum jalan:** `docker info` → "Cannot connect to the Docker daemon"; Docker Desktop yang dibuka dari sesi ini menunggu dialog izin administrator di layar (log `com.docker.backend.log`: `osascript ... do shell script ... with administrator privileges`), dan evaluasi ini tidak memasukkan kata sandi. Pengganti memakai PostgreSQL 15 Homebrew ditolak: kepala tiap rekaman menulis "PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)", jadi `make cek` pasti berbeda. Yang harus dijalankan pengatur sesudah Docker hidup: `make -C labs/<lab> cek` untuk t4-webhook, t4-integrasi, t4-modul, t4-storage, t4-qr (lajur `rjt-konten`, port bawaan 54333), dan tulis hasilnya di bagian "Putaran 2" |
| W3 | YA | `python3 tools/audit_bahasa.py --check` → "403 file · 0 error · 415 peringatan"; hanya Tahap 4 → "31 file · 0 error · 106 peringatan". `python3 tools/eval_tahap.py gejala 4` → exit 0, 11 dari 11 halaman Masalah "ok" (adegan 2 sampai 4 paragraf, 46 sampai 95 kata). Enam blok Gejala dibaca tangan (4.6, 4.8, 4.10, 4.12, 4.18, 4.24): adegan hanya kejadian dan dialog, istilah teknis hanya yang tokoh lihat atau ucapkan ("401", "top-up", "menunggu", "QR"). Catatan "Angka cerita (Ilustrasi)" di bawah adegan memuat arti label ("Rp105.000 adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman" di 4.18, juga di 4.12): itu definisi label sumber, bukan konsep teknis di dalam adegan, jadi bukan pelanggaran 3.16. `python3 tools/test_eval_tahap.py` → "26/26 kasus uji eval_tahap lolos" |
| W4 | YA | `situs/tools/layar.mjs` (UKUR_HALAMAN = 31 halaman Tahap 4, preview port 4323) → "LOLOS: 0 gagal, 0 margin tipis"; 18 dari 31 halaman terukur (72 pengukuran), 13 tanpa Inti dicetak "info" (4.1, 4.6, 4.8, 4.10, 4.12, 4.14, 4.16, 4.18, 4.20, 4.22, 4.24, 4.27, 4.31); margin terkecil 30 px (4.26 di 375×667), lalu 31 px (4.2, 4.21) dan 32 px (4.19). `python3 tools/contrast.py` → "957/957 lolos" gelap dan terang. `situs/tools/ukur-axe.mjs --url http://127.0.0.1:4323 --semua --awalan /tahap-4/` → "axe 4.14.0 runOnly wcag2a, wcag2aa, wcag21aa, wcag22aa: uji diri 4/4 lolos; 31 halaman × 2 ukuran × 2 tema = 124 run; 0 halaman berpelanggaran; incomplete untuk dicek manusia: color-contrast 2832; 23,7 s". Keyboard saja, `situs/tools/eval-keyboard.mjs` pada 4.24 (seed): 375×667 → 71 Tab, stop pertama "Lewati ke konten", isi di Tab ke-5, Berikutnya di Tab ke-71, 8 blok dibuka dengan Enter, tanpa tanda fokus 0, kontrol terlewat 0; 1366×657 → 291 Tab, 42 blok, 0 dan 0; `--uji-diri` → "alat melihat stop tanpa tanda fokus saat tanda fokus dimatikan". Catatan 4.13: lihat "Temuan alat keyboard" di bawah (6 kontrol diagram "terlewat" pada kecepatan Tab penuh, semuanya tercapai dengan jeda 150 ms). Tangkapan 375×667 gelap dibuka: `situs/tangkapan/tahap-4_m30-saldo-tidak-naik-hp-dark.png`, `..._m31-verifikasi-tertahan-hp-dark.png`, `..._dua-arah-pihak-ketiga-hp-dark.png` |
| W5 | TIDAK | `python3 tools/eval_tahap.py coba 4` dan `bocor 4`, ditambah kontrol di DOM sesudah hidrasi (bagian "Lampiran W5"): dari 29 halaman dengan blok Coba, 22 punya tebakan lalu satu hal yang bisa diubah (kontrol). Tujuh tidak: 4.2, 4.17, 4.26 (pilah) tanpa kontrol ubah; 4.19, 4.23, 4.29 (Tebak) dengan "Ubah satu hal" berupa prosa yang bertaut ke rekaman; 4.30 (rekap) tanpa masukan ubah. 4.1 dan 4.31 (PRD) tanpa blok Coba. `bocor 4` → 7 halaman Masalah (4.3, 4.6, 4.8, 4.12, 4.16, 4.18, 4.22) dengan angka jawaban di teks sebelum blok Coba; dicatat saja, hasil-dulu adalah desain pemilik |
| W6 | YA | `python3 tools/eval_tahap.py adr 4` → 12 baris (ADR 34 sampai 45), exit 1 karena satu baris "KURANG": 4.9 (ADR 35) terbaca "opsi 0" sebab tabelnya berformat satu opsi per baris (kolom "Opsi", "Cara kerja", "Kelebihan", "Kekurangan", "Bukti"). Dibaca tangan: 4 opsi (A sampai D), pre-mortem 3 penyebab, "Kapan keputusan ini salah" 5 butir, bukti di kolom Bukti dan 3 tautan di "Bacaan lanjut"; yang tidak ada hanya subbagian "Kasus industri" milik 11 ADR lain. Sebelas lainnya "ok": ADR 44 punya 3 opsi, sepuluh ADR 4 opsi, semuanya `pre-mortem True (3 penyebab)`, `kapan salah True`, 4 sampai 20 tautan sumber. ADR 45 (4.29) dan ADR 44 (4.26) dibaca khusus (bagian "Lampiran W6"). Tiga klaim dicek ke sumber primer 2026-10-31: Shopify Engineering 2019-02-21 di 4.29, dokumentasi AWS S3 presigned URL di 4.15, dokumentasi Stripe webhook di 4.7. Ketiganya cocok |
| W7 | YA | `python3 tools/erd.py --cek` → "erd --cek lolos: Tahap 1 5 tabel, Tahap 2 8 tabel, Tahap 3 14 tabel, Tahap 4 22 tabel; hash sumber cocok; modul Tahap 4: 6 schema". `situs/data/erd/tahap-4.json` (56.665 B) dan `modul-tahap-4.json` ada. 4.5 memuat `<ErdHalaman id="erd-t4" tahap={[3, 4]} />` (baris 52). Di halaman 4.5 sesudah hidrasi: tampilan awal 22 node dan 35 edge; menekan "Bandingkan dengan Tahap 3" → 36 node dan 55 edge di 1366×657 dan di 375×667. `situs/tools/ukur-erd.mjs` → "Tahap 4 bandingkan → berdampingan, 36 node, 55 edge, 8 baru, 5 berubah, 0 dihapus, zoom 0.85/0.83, 0 di luar wadah" di 1366×657 dan "bertumpuk" di 375×667. `python3 tools/test_erd.py` → "110/110 kasus uji erd lolos". Bangun ulang dari PostgreSQL (`tools/erd.py --tahap 4`) tidak dijalankan: Docker |
| W8 | YA | `python3 tools/eval_tahap.py rantai 4` → "langkah dari 4.1 sampai 4.31: 31; 404 atau tautan hilang: 0", semua 200; Berikutnya dari 4.31 → `/cerita/tahap-5/` ("Tahap 5 · Ceritanya", id T5, `ada=True`, bukan halaman `lama`, `diganti_oleh`, atau `lebur_ke`). `rantai 3` → 3.32 sekarang menuju `/tahap-4/prd-v4/` (4.1); `rantai 1` 42 langkah, `rantai 2` 33 langkah (2.33 menuju 3.1), 0 hilang. `python3 tools/cek_tautan.py` → "284 HTML: 63763 tautan internal diperiksa (5729 dengan anchor); 124 JSON data widget: 499 url diperiksa; ... rusak: 0 path, 0 anchor". `cek_situs.sh` baris 120 menjalankan `rantai` hanya untuk Tahap 1 sampai 3 (`for T in 1 2 3`): Tahap 4 belum masuk gerbang |

## Daftar PR halaman

| Halaman | PR | Halaman | PR | Halaman | PR |
| --- | --- | --- | --- | --- | --- |
| 4.1 | #429 | 4.12 | #442 | 4.23 | #456 |
| 4.2 | #431 | 4.13 | #441 | 4.24 | #457 |
| 4.3 | #430 | 4.14 | #443 | 4.25 | #455 |
| 4.4 | #432 | 4.15 | #445 | 4.26 | #458 |
| 4.5 | #434 | 4.16 | #446 | 4.27 | #460 |
| 4.6 | #433 | 4.17 | #447 | 4.28 | #462 |
| 4.7 | #435 | 4.18 | #448 | 4.29 | #463 |
| 4.8 | #436 | 4.19 | #451 | 4.30 | #464 |
| 4.9 | #438 | 4.20 | #450 | 4.31 | #465 |
| 4.10 | #437 | 4.21 | #452 | | |
| 4.11 | #439 | 4.22 | #453 | | |

Sumber: `gh pr list --state merged --search "head:tahap-4/"` (49 PR bercabang `tahap-4/*`, termasuk riset, naskah, lab, ERD, widget) dan `gh pr view <n> --json state,files,statusCheckRollup` per PR halaman (`tmp/eval-ci.txt`): 31 dari 31 MERGED, slug halaman ada di diff tiap PR, 11 check SUCCESS. Nomor PR halaman tidak berurutan dengan nomor halaman (4.3 sebelum 4.2, 4.19 sesudah 4.20, 4.25 sebelum 4.24). Di luar halaman: riset #329, naskah #379, registry #384, `KONSISTENSI-4` #427, ERD4 #419, widget #425 dan #426, dan 11 lab: api-t4 #392, t4-webhook #396, t4-integrasi #398, t4-modul #401, t4-storage #405, t4-infra #409, t4-qr #410, t4-ssrf #412 (dipersempit ke sisi defensif), t4-kartu #415, t4-audit #416, t4-pipeline #420.

## Telusur angka W2

Halaman dipilih dengan seed 4 dari halaman Tahap 4 yang punya lab: `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==4 and x.get('nomor') and x.get('lab')]; random.seed(4); print([(x['nomor'],x['lab']) for x in random.sample(h,6)])"` → 24 halaman berlab, hasil `[('4.10', ['t4-integrasi']), ('4.12', ['t4-modul']), ('4.6', ['t4-webhook']), ('4.15', ['t4-storage']), ('4.18', ['t4-qr']), ('4.7', ['t4-webhook'])]`. (Prompt tugas menulis bahwa registry tidak punya kunci `lab` di baris halaman; kunci itu ada, berisi daftar, dan dipakai di sini.)

| Halaman | Angka atau status di halaman | Rekaman atau label |
| --- | --- | --- |
| 4.6 | Saldo awal Budi Rp250.000, sesudah dua jurnal Rp650.000 | `labs/api-t4/output/topup.txt:12` (saldo 250000), `labs/api-t4/output/rentan.txt:27` (saldo 650000) |
| 4.6 | Handler pertama menulis dua jurnal untuk Rp200.000, 10201 dan 10202 | `labs/t4-webhook/output/ganda.txt:12-15` |
| 4.6 | Kiriman kedua dengan `event_id` sama dijawab `200 ganda` | `labs/t4-webhook/output/ganda.txt:22` |
| 4.6 | Jeda lab 300 ms; dua kiriman bersamaan menghasilkan 2 jurnal | `labs/t4-webhook/output/ganda-serentak.txt:4`, `:11` |
| 4.6 | Kabar tanpa tanda tangan berjumlah Rp1.234.567 dikreditkan ke Budi | `labs/api-t4/output/rentan.txt:35-40` |
| 4.7 | Jadwal ulang 2, 10, 30, 90, 210 menit, total 342; 2xx 1 kiriman, 400 dan 404 3, 500 2, 503 5, 401 6 | `labs/t4-webhook/output/retry.txt:6`, `:9-14` |
| 4.7 | Body berindentasi 109 byte dengan 5 baris baru | `labs/t4-webhook/output/tandatangan.txt:8` |
| 4.7 | Gaya 1 menolak kiriman 6 menit, menerima 60 detik | `labs/t4-webhook/output/tandatangan.txt:44-45` |
| 4.7 | Kabar `pending` sesudah `settlement`: `200 diparkir`, gateway ditanya 0 kali | `labs/t4-webhook/output/urutan.txt:7`, `:19` |
| 4.7 | Sesudah 25 jam tanpa lapis status, event kedua `diproses`, 2 jurnal | `labs/t4-webhook/output/urutan.txt:70` |
| 4.10 | 10 dari 10 pengajuan gagal saat layanan verifikasi mati; worker mengklaim 0 | `labs/t4-integrasi/output/lajur.txt:22`, `:27` |
| 4.10 | Paling banyak 4 permintaan bersamaan; percobaan menggantung ditahan 2,9 sampai 3,6 detik | `labs/t4-integrasi/output/worker.txt:11-12` |
| 4.10 | Vendor pulih: pengajuan `lulus`, 2 permintaan masuk, 1 objek | `labs/t4-integrasi/output/retry.txt:35-53` |
| 4.12 | `column "nama" does not exist` (42703); `go build`, `go vet`, `go test` exit 0 | `labs/t4-modul/output/batas.txt:24`, `:7-17` |
| 4.15 | PUT 120.000 byte lalu 90.000 byte lewat URL yang sama, keduanya 200, isi akhir 90.000 byte | `labs/t4-storage/output/presign.txt:19-21` |
| 4.15 | PUT sesudah umur URL 403; X-Amz-Expires 604801 ditolak 400 | `labs/t4-storage/output/presign.txt:25`, `:34` |
| 4.15 | Kunci objek 48 karakter, checksum 64; rasio dump 1,1 (2, 4, 8 pengajuan), 2,0 untuk dump teks | `labs/t4-storage/output/ukuran.txt:39`, `:20-24` |
| 4.15 | Lima percobaan ditolak (Dina 403, Eko 403, tanpa token 401, Ratih tanpa alasan 422, alasan 6 karakter 422) | `labs/t4-storage/output/unduh.txt:21-25` |
| 4.18 | 8.562 dari 8.562 salah baca terdeteksi (8.314 oleh CRC, 248 oleh tag 63) | `labs/t4-qr/output/crc.txt:56`; 138 × 62 + 6 = 8.562 dihitung (Hitungan) |
| 4.18 | CRC `B29D` menjadi `4D5E`; nilai uji `29B1` | `labs/t4-qr/output/crc.txt:60-61`, `:8` |
| 4.18 | Saldo Budi Rp250.000 menjadi Rp215.000 sesudah bayar Rp35.000 (201) | `labs/t4-qr/output/statis.txt:31`, `:48`, `:52` |

Angka yang berlabel di halaman dan tidak terulang di lab: 4.10 "09.10", "12.40", dan "146 pendaftar" (Ilustrasi, naskah; 146 dihitung 0,0116 × 12.600 = 146,16 dan 1.000 ÷ 86.400 × 12.600 = 145,8, keduanya 146); 4.12 "36 menit" (15.58 − 15.22, Hitungan atas jam cerita Ilustrasi); 4.18 "Rp105.000" (Hitungan: 35.000 + 48.000 + 22.000 = 105.000, masukan Ilustrasi); 4.15 "365 GB per tahun" (2.000 × 500 KB × 365 = 365 GB, Hitungan atas Asumsi); 4.7 "W > 9 ÷ 3,47 = 2,6 detik" dan "6 × 0,579 = 3,47" (Hitungan atas Asumsi dan Tidak dijalankan, `retry.txt:61` merekam 3,47); 4.18 "2^16 = 65.536" (Hitungan).

Label dibandingkan dengan definisi di gaya-bahasa:

| Tempat | Angka dan label | Sesuai definisi |
| --- | --- | --- |
| 4.10, hitungan 146 | "Hitungan atas Asumsi dan Ilustrasi: hasil rumus dari angka yang tertulis di halaman ini, berlabel sama dengan masukan terlemahnya" | Ya: masukan Asumsi dan Ilustrasi, hasil bukan rekaman |
| 4.12, 36 menit | "(Hitungan: angka yang dihitung dari angka lain di halaman)" di bawah "Angka cerita (Ilustrasi)" | Ya |
| 4.18, Rp105.000 | "Hitungan ... masukannya Ilustrasi" | Ya |
| 4.15, 365 GB | "Hitungan ... labelnya sama dengan masukan terlemahnya. Semua masukan di bawah adalah Asumsi naskah" | Ya |
| 4.7, tabel pool | "Hitungan atas Asumsi dan Tidak dijalankan, karena lab tidak menahan koneksi 5 detik per kabar" | Ya: tidak ada hasil rumus berlabel Rekaman lab |
| 4.10, tabel slot | "Semua baris tabel adalah Hitungan atas Asumsi, kecuali lama 12.600 detik yang berasal dari jam cerita (Ilustrasi). Rekaman mengukur dua masukannya (4 slot, timeout 3 detik)" | Ya |

Satu angka, satu bentuk: 7,52 ditulis tanpa asal di 4.10 ("Dua lagi dari pemberitahuan uang: 7,52 per detik pada puncak", berlabel Asumsi). Rumusnya (6,94 + 0,579 = 7,52) hanya ada di 4.28 (`estimasi.mdx:101`), halaman yang dibaca sesudahnya; di 4.1 yang ada 6,94 (`prd-v4.mdx:125`). Polesan, bukan salah label. Sapuan `grep -n 'Hitungan' ... | grep -i 'rekaman lab'` atas 31 halaman tidak menemukan hasil rumus berlabel Rekaman lab. Satu catatan di rekaman, bukan di halaman: `labs/t4-storage/output/unduh.txt:26` menulis "sebelum dan sesudah keempat percobaan", padahal baris 21 sampai 25 mencatat lima (kode: `labs/t4-storage/run.py:685`); halaman 4.15 menulis "lima" dan benar.

## Lampiran W5

Blok Coba (judul "Coba" atau "Coba sendiri") diambil dari registry, `eval_tahap.py coba 4`, dan DOM sesudah hidrasi di 1366×657 (`details` dibuka, halaman digulir, `reducedMotion`): `input[type=checkbox]`, `button[aria-pressed]`, tab, dan tombol yang muncul sesudah Periksa atau menebak. Data widget alur: 12 file `situs/public/widgets/data/skenario/t4-*.json`, semuanya punya `predict` dan `varian`.

| Halaman | Komponen Coba | Tebak dulu | Ubah satu hal |
| --- | --- | --- | --- |
| 4.3, 4.6, 4.8, 4.10, 4.12, 4.14, 4.16, 4.18, 4.20, 4.22, 4.24 | alur (`WidgetLama`, data `t4-topup`, `t4-verifikasi`, `t4-m29` sampai `t4-m38`) | `predict` | kotak centang "Ubah satu hal" (4.3: dua kotak) |
| 4.4, 4.21 | CariBug | menandai baris, lalu Periksa | tombol "Lihat versi benar" dan "Ulang" sesudah Periksa |
| 4.5 | Tebak dan ErdTumbuh | Tebak | tombol "Bandingkan dengan Tahap 3" (22 node menjadi 36) |
| 4.7 | WebhookLangkah | pilihan A sampai C | tombol versi handler, muncul sesudah menebak (`WebhookLangkah.tsx:167`) |
| 4.9 | runsql (`t4-rekonsiliasi`) | pilihan jumlah insiden | kotak centang "Gateway menulis settlement budi-3 pada hari yang dicocokkan" |
| 4.11 | CircuitBreaker | pilihan A sampai D | kelompok tombol Breaker (Tanpa breaker) |
| 4.13, 4.15, 4.25 | Tebak dan banding | Tebak | tombol pilih kejadian di banding |
| 4.27, 4.28 | Kalkulator | tebak | tombol skenario (`aria-pressed`) |
| 4.2 | pilah `t4-fitur-pilah` | memilah pekerjaan | tidak ada |
| 4.17 | pilah `t4-infra-pilah` | memilah | prosa "Ubah satu hal" bertaut ke rekaman |
| 4.26 | pilah `t4-tim-infra-pilah` | memilah | prosa "Ubah satu hal" bertaut ke rekaman |
| 4.19 | Tebak | Tebak | prosa "Ubah satu hal: bayangkan QR itu dinamis" bertaut ke `dinamis.txt` B dan D |
| 4.23 | Tebak | Tebak | prosa "Ubah satu hal: buang hold" bertaut ke rekaman |
| 4.29 | Tebak | Tebak | prosa "Ubah satu hal: pemicu PgBouncer dihitung dari rumus koneksi" |
| 4.30 | kartu `t4-rekap-kartu` | tebak lalu "Tunjukkan jawaban" | tidak ada (kotak centang hanya menyaring kartu) |
| 4.1, 4.31 | tanpa blok Coba | halaman PRD | halaman PRD |

Dua catatan. Pertama, halaman PRD (4.1, 4.31) tidak punya blok Coba, seperti 2.1, 2.33, 3.1, dan 3.32; tebakan 4.31 ada di blok "Pratinjau PRD v5". Kedua, hasil-dulu: `bocor 4` menemukan 7 halaman dengan angka jawaban di teks sebelum Coba (4.3 Rp250.000, 4.6 dan 4.18 status 200 dan 201, 4.8 401, 4.12 42703, 4.16 403, 4.22 Rp100.000); semuanya halaman yang menampilkan hasil di "Yang sebenarnya" atau Gejala menurut rancangannya. Jawaban `predict` berupa teks (4.9, 4.10, 4.14, 4.20, 4.24) tidak bisa diperiksa dengan cara ini.

## Lampiran W6

`python3 tools/eval_tahap.py adr 4`, ditambah pembacaan tangan: "Kasus industri", "Yang akan merevisinya", "Status", dan bagian bukti.

| ADR | Halaman | Opsi | Pre-mortem | Kapan salah | Tautan sumber | Kasus industri |
| --- | --- | --- | --- | --- | --- | --- |
| 34 | 4.7 | 4 | 3 penyebab | ada | 10 | ada |
| 35 | 4.9 | 4 (tangan) | 3 penyebab | ada | 3 | tidak ada subbagian |
| 36 | 4.11 | 4 | 3 penyebab | ada | 12 | ada |
| 37 | 4.13 | 4 | 3 penyebab | ada | 20 | ada |
| 38 | 4.15 | 4 | 3 penyebab | ada | 14 | ada |
| 39 | 4.17 | 4 | 3 penyebab | ada | 13 | ada |
| 40 | 4.19 | 4 | 3 penyebab | ada | 12 | ada |
| 41 | 4.21 | 4 | 3 penyebab | ada | 20 | ada |
| 42 | 4.23 | 4 | 3 penyebab | ada | 4 | ada |
| 43 | 4.25 | 4 | 3 penyebab | ada | 12 | ada |
| 44 | 4.26 | 3 | 3 penyebab | ada | 13 | ada (tj-actions/changed-files) |
| 45 | 4.29 | 4 | 3 penyebab | ada | 16 | ada (Shopify, 2019) |

ADR 44 (4.26) memilih opsi C dengan sembilan aturan, menyebut "Beda dengan naskah", dan "Yang akan merevisinya" memakai tim 13 menjadi 20 sampai 40. Halaman yang sama menulis jujur bahwa gerbang lab menolak api-t4 dengan Go 1.27.1 (grype 15 temuan: dua Critical, sembilan High, dua Medium, dua Unknown; govulncheck 10 temuan dipanggil; `tim-infra.mdx:209-217`); itu hasil rekaman yang dilaporkan, bukan kegagalan butir ini. ADR 45 (4.29) memilih opsi C (enam aturan), menolak A, B, dan D masing-masing dengan alasan, dan menulis lima syarat bila login sosial nanti dikerjakan.

Tiga klaim sumber dicek ke halaman primer 2026-10-31:

1. 4.29: "Shopify Engineering menulis bahwa aplikasi Rails mereka dikerjakan lebih dari sepuluh tahun oleh lebih dari seribu developer", "pipeline ... mahal untuk dibuat, disesuaikan, dan dipelihara", dan "tidak ada satu solusi terbaik untuk semua". Artikel "Deconstructing the Monolith", Published Feb 21, 2019: "It has been worked on for over a decade by more than a thousand developers", "These pipelines can be expensive to create, customize, and maintain", "only having to maintain one test and deployment pipeline", "there is no one size fits all best solution, and microservices would bring their own set of challenges". Cocok, termasuk tanggal.
2. 4.15: PUT ke kunci yang sama menimpa; URL dari kredensial sementara berakhir bersama kredensialnya; umur paling lama 7 hari. Dokumentasi AWS S3 "Download and upload objects with presigned URLs": "If an object with the same key already exists ... Amazon S3 replaces the existing object", "the URL expires when the credential expires", IAM user "Valid up to 7 days when you're using AWS Signature Version 4". Cocok. Angka 604.800 detik dan penolakan 604.801 adalah rekaman lab (`presign.txt:34`), bukan klaim dokumentasi.
3. 4.7 dan 4.6: Stripe menulis format tanda tangan yang sama (`t=...,v1=...`), body harus byte yang dikirim tanpa perubahan, dan kiriman ulang sampai tiga hari. Dokumentasi Stripe "Manage webhook endpoints": "The request body must be the exact UTF-8 string Stripe sent, without any modifications", format `t=xxx,v1=yyy,v0=zzz`, "Stripe automatically retries undelivered events for up to three days". Cocok. Toleransi 5 menit tidak ada di halaman itu (ada di halaman "Set up events", tidak dibuka); halaman 4.7 menulis toleransi 5 menit sebagai milik gaya 1 di lab (`tandatangan.txt:D`), bukan sebagai klaim Stripe.

## Pertanyaan pembaca

Halaman dipilih dengan `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==4 and x.get('nomor')]; random.seed(4); print([x['nomor'] for x in random.sample(h,5)])"` → 4.8, 4.10, 4.4, 4.24, 4.13 (tiga pertama untuk pertanyaan ini, 4.24 untuk keyboard, 4.13 untuk catatan alat). Tangkapan 375×667 gelap yang dibuka: `situs/tangkapan/tahap-4_m30-saldo-tidak-naik-hp-dark.png` (4.8), `situs/tangkapan/tahap-4_m31-verifikasi-tertahan-hp-dark.png` (4.10), `situs/tangkapan/tahap-4_dua-arah-pihak-ketiga-hp-dark.png` (4.4).

| Halaman | Di mana | Dari mana | Ke mana |
| --- | --- | --- | --- |
| 4.8 | Jalur "Tahap 4 › minggu 4", judul "4.8 M30: Saldo Citra tidak naik, padahal bank sudah memotong", "Baca 8 menit · coba 3 menit", kepala blok "Gejala · Blok 1 dari 5 · 1 menit" | Baris meta "Prasyarat: 4.7 Webhook masuk" (tautan di layar pertama); "← Sebelumnya: 4.7 Webhook masuk" di akhir halaman | Tombol "Berikutnya: Yang Raka kira →" di akhir blok Gejala (di bawah layar pertama); "Berikutnya →: 4.9 Rekonsiliasi dengan gateway + ADR 35" di akhir halaman |
| 4.10 | Jalur "Tahap 4 › minggu 5", judul "4.10 M31: 146 pendaftar tertahan "Sedang diverifikasi"", "Baca 8 menit · coba 3 menit", "Jalur inti" | Baris meta "Prasyarat: 3.13 At-least-once dan penyaring di app" (tautan); "← Sebelumnya: 4.9 Rekonsiliasi dengan gateway" di akhir halaman | "Berikutnya: Yang Raka kira →" di blok Gejala, lalu "Berikutnya →: 4.11 Timeout, retry berkunci, circuit breaker, lajur per vendor + ADR 36" di akhir halaman |
| 4.4 | Jalur "Tahap 4" (halaman konsep tanpa sub minggu), judul "4.4 Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar", kepala "Mulai · Blok 1 dari 5 · 1 menit", Inti dan Rantai "Kabar dari gateway adalah klaim, bukan fakta, dan gateway tidak ikut COMMIT" | Baris meta "Prasyarat: 4.3 Fitur top-up dan verifikasi" (tautan); "← Sebelumnya: 4.3 Fitur: top-up dari bank dan verifikasi identitas" di akhir halaman | Tombol Berikutnya antarblok (Coba) di bawah Rantai; "Berikutnya →: 4.5 Skema data: ERD Tahap 3 → Tahap 4 dan pertumbuhannya" di akhir halaman |

Dalam tiga detik di layar pertama pembaca tahu halaman mana (judul bernomor dan jalur), dari mana (meta Prasyarat) dan apa yang dibaca dulu (adegan Gejala di 4.8 dan 4.10, Inti dan Rantai di 4.4). Tombol Berikutnya antarblok baru terlihat sesudah menggulir, seperti di Tahap 3. Layar pertama 4.4 sudah memuat Rantai "Dikirim dua kali" dan "Dikirim siapa pun" dengan chip sumber, jadi hasilnya terlihat tanpa menggulir.

## Uji baca: 5 hal membingungkan

Pembaca: satu subagent segar (tipe general-purpose, model sonnet, tanpa konteks proyek). Ia hanya diberi persona mobile engineer baru di backend, tiga halaman seed 4 (4.4, 4.8, 4.10) yang diekspor sesudah hidrasi di 375×667 dengan semua bagian lipat terbuka (tautan ditulis `[-> /path/]`), dan teks seluruh 31 halaman Tahap 4 di folder terpisah untuk dibuka bila halaman menyebutnya. Ia tidak diberi tahu apa yang dicari dan dilarang menjalankan shell, mencari di web, atau membuka file lain. Percobaan pertama gagal: alat Read tidak bisa melihat isi folder, sehingga nama file harus ditulis eksplisit di prompt (percobaan kedua berhasil, 4 panggilan alat, 53 detik). Ia membaca teks saja: widget tidak ia operasikan, jadi tabel yang terisi sesudah Periksa tidak ia lihat. Lima butir di bawah dari laporannya; kolom terakhir klasifikasi evaluator, dengan kutipan yang dicek ke sumber MDX.

| No | Halaman dan kalimat | Kenapa membingungkan (kata pembaca) | Klasifikasi |
| --- | --- | --- | --- |
| 1 | 4.4, blok Coba: "Tiga baris yang kamu tandai mengisi keenam kejadian di atas." (`dua-arah-pihak-ketiga.mdx:51`) | Pembaca tidak tahu berapa baris yang harus ditandai dan dengan patokan apa; "keenam kejadian di atas" tidak ada di atas | Urutan, terbukti. Kalimat menunjuk tabel "Enam kejadian" yang ada di blok Paham di bawah (baris 107, "Tabel yang terisi di blok Coba"). Di blok Coba tidak ada elemen tabel, juga sesudah menandai baris 3, 12, dan 16 lalu Periksa (DOM di 375×667: 0 `table`, hasilnya hanya "Kamu menandai 3 dari 3 baris yang bermasalah, dan 0 baris lain ikut ditandai"), jadi "di atas" tidak menunjuk apa pun yang terlihat. Keluhan patokan ("dua dari tiga hal" lawan "paling sedikit satu") tidak terbukti: pertanyaan menyebut efek tiga baris bersama, perintah menyebut efek tiap baris. Polesan |
| 2 | 4.4, blok Paham: "Sel Terjaga dan Tidak berlaku berlabel Tidak dijalankan: ... kecuali baris 6 yang memakai rekaman `topup.txt` bagian G di atas." (`:118`) | "Bagian G" tidak terlihat di rekaman yang tampil, dan "baris 6", "hal 2" bercampur | Desain, terbukti. Kutipan di atasnya memakai `topup.txt:108-118`, `:119-125`, dan `:126-133`, sedangkan penanda "# --- G." ada di baris 106 (`labs/api-t4/output/topup.txt:106`), di luar kutipan. Label "Tidak dijalankan" didefinisikan di `/cara-pakai/`. Polesan |
| 3 | 4.8, "Yang sebenarnya": "Dokumentasi gateway kedua memuat jumlah ulangan per kode status (...)" (`m30-saldo-tidak-naik.mdx:71`) | "Gateway pertama" belum diperkenalkan, dan tautan yang disebut lebih dulu dilabeli "kedua" | Kosakata dan urutan, terbukti. "Gateway kedua" dipakai di baris 71 dan baru dijelaskan di baris 77 ("Dua gateway nyata, dua kebiasaan"). Sama dengan keluhan "dipakai sebelum didefinisikan" di Tahap 2 dan 3. Polesan |
| 4 | 4.8, "Kiriman yang tidak datang lagi": "Kiriman pertama sebelum 09.10 − 342 menit = 03.28 memakai keenam percobaannya sebelum 09.10." (`:86`) | Pengurangan jam dengan menit di tengah kalimat; Bayu menyamakan secret pukul 09.10, lebih awal dari keluhan Citra pukul 09.40 di Gejala, dan Bayu tidak pernah diperkenalkan | Desain, terbukti sebagian. Hitungannya benar (910 − 342 = 568 menit, 09.10 − 5 jam 42 menit = 03.28), tetapi jam 09.10 (Ilustrasi) lebih awal 30 menit dari keluhan 09.40, dan Bayu baru muncul di blok ini tanpa peran. Naskah memberi jam, bukan lab. Polesan |
| 5 | 4.10, "Yang sebenarnya": "Yang bertahan 3 jam 30 menit adalah layanan yang mati, bukan layar pendaftar." (`m31-verifikasi-tertahan.mdx:120`) | Judul bilang "tertahan", adegan bilang layar berganti ke "Verifikasi gagal"; lamanya 3 jam 30 menit tidak dinyatakan sebagai lama gangguan; "7,52" baru dijelaskan sebagai Asumsi sesudah tabel | Desain, terbukti. Judul ("146 pendaftar tertahan "Sedang diverifikasi"") dan hitungan di halaman (layar berganti dalam 45 sampai 48 detik bila slot bebas) tidak segaris, dan jawabannya baru muncul di blok ketiga. 7,52 tidak punya rumus di halaman ini (rumus di 4.28). Keluhan bahwa 7,52 "tidak cocok dengan angka di 4.4" tidak terbukti (4.4 tidak memuat 6,94 atau 7,52). Polesan |

Tidak ada butir yang berkategori kesalahan fakta. Dua dari lima (butir 3 dan 1) adalah istilah atau rujukan yang dipakai sebelum dijelaskan, pola yang sama dengan Tahap 2 dan 3.

## Temuan alat keyboard

`eval-keyboard.mjs` pada 4.13 (`/tahap-4/modular-monolith/`) di 375×667 menulis "266 Tab ... kontrol terlewat 6": tombol "Modul ledger sudah ada", "Modul akun sudah ada", "Modul identitas sudah ada", "Modul merchant sudah ada", "Modul platform sudah ada", dan "Service pembayaran baru" (`button.diagram__kotak`, `tabIndex` 0). Di 1366×657 hasilnya sama (483 Tab, 6 terlewat); 4.24 tidak punya masalah itu. Dicek tangan dengan tiga skrip kecil (`tmp/` scratchpad evaluasi, tidak di repo):

- Semua `details` dibuka dan halaman digulir sampai diagram hidup, lalu Tab dari atas → 272 stop, keenam tombol tercapai.
- Tab tanpa jeda, dengan Enter pada summary seperti alat → 266 stop, enam tombol tidak muncul (sama dengan alat).
- Tab dengan jeda 150 ms sesudah tiap tekanan, tanpa menggulir lebih dulu → 272 stop, keenam tombol tercapai.

Jadi kontrolnya tercapai dan fokusnya terlihat; yang terjadi adalah balapan hidrasi: diagram `client:visible` baru hidup sesudah Tab membawanya ke layar, dan alat sudah melewatinya. Pembaca yang menahan Tab bisa mengalami hal yang sama, tetapi itu tidak terukur di sini. Karena itu butir W4 tetap YA dan alatnya dicatat: menunggu hidrasi (misalnya jeda singkat atau menunggu atribut `ssr` hilang dari `astro-island` sesudah tiap Tab) belum ada. Polesan alat.

## Putaran perbaikan

Tidak ada tugas perbaikan yang diusulkan. Alasan:

- W5 TIDAK karena tujuh halaman, dan sebabnya sama dengan 2.2, 2.32, 3.2, dan 3.31 (pilah, rekap, dan "Ubah satu hal" sebagai prosa bertaut rekaman). Skill menyerahkan keputusan itu ke pemilik (TINJAUAN-PEMILIK Tahap 2 butir 3 dan Tahap 3 butir 1); evaluasi ini tidak menambah tugas halaman.
- W2: bagian yang tertunda bukan perbaikan, tetapi satu langkah pengatur: hidupkan Docker Desktop (izin administrator di layar), jalankan `make -C labs/<lab> cek` untuk lima lab sampel, tulis hasilnya. Bila ada yang gagal, itu butir W2 TIDAK dan menjadi tugas perbaikan lab itu.
- Tidak ada W1 sampai W4 yang gagal, jadi `EVAL-4-ulang` tidak diperlukan kecuali W2 gagal.

## Ke TINJAUAN-PEMILIK

Urut dari yang paling berat. Pengatur memindahkannya ke `plan/TINJAUAN-PEMILIK.md` bagian "Tahap 4"; dokumen ini tidak mengubah file itu.

1. W2, ulang lab belum dijalankan. Docker Desktop tidak bisa dihidupkan dari sesi evaluasi: ia menunggu dialog izin administrator di layar pemilik. Lima lab sampel (t4-webhook, t4-integrasi, t4-modul, t4-storage, t4-qr) perlu `make -C labs/<lab> cek` dan hasil "identik". Penelusuran angka (20 baris) dan pemeriksaan label sudah lengkap dan tanpa temuan.
2. W5 TIDAK (belum ada keputusan). Tujuh dari 29 halaman bukan "tebak dulu lalu ubah satu hal" menurut huruf skill: 4.2, 4.17, 4.26 (pilah), 4.19, 4.23, 4.29 (Tebak dengan prosa bertaut rekaman), dan 4.30 (rekap). Pilihan seperti Tahap 3: kecualikan rekap, pilah, dan ADR "Sengaja belum" dari definisi W5 secara tertulis, terima prosa bertaut rekaman, atau tambahkan kontrol. Hasil-dulu di tujuh halaman Masalah (4.3, 4.6, 4.8, 4.12, 4.16, 4.18, 4.22) tetap desain pemilik.
3. Lima hal membingungkan (tabel di atas), terutama butir 3 dan 1: "gateway kedua" dipakai sebelum didefinisikan (4.8) dan "keenam kejadian di atas" menunjuk tabel di bawah (4.4). Butir 2 (4.4, kutipan rekaman yang tidak memuat huruf bagiannya) dan 5 (judul 4.10 lawan hitungan) adalah cacat tulis yang nyata dan kecil perbaikannya; butir 4 (jam 09.10 lebih awal dari keluhan 09.40, Bayu tanpa perkenalan) menyentuh naskah dan butuh keputusan pemilik.
4. `/cara-pakai/` hanya mendefinisikan lima label; "Hitungan" didefinisikan ulang di sembilan halaman Tahap 4 (4.1, 4.10, 4.12, 4.15, 4.18, 4.27, 4.29, 4.30, 4.31) dan "Simulasi" masih sebuah TODO di MEMORI. Putuskan: tambahkan ke `/cara-pakai/` atau tetap lokal.
5. Tahap 4 belum masuk gerbang rantai (`tools/cek_situs.sh` baris 120, `for T in 1 2 3`). `rantai 4` lolos hari ini; tanpa gerbang, Berikutnya dari 4.31 ke Tahap 5 bisa pecah saat halaman Tahap 5 menggantikan "Tahap 5 · Ceritanya" tanpa ada yang melihat.
6. Pemeriksaan di luar W: butir dari catatan PR #429 sampai #465 dan arsip MEMORI yang belum pernah dilihat pemilik (pengatur yang menyalinnya; evaluasi ini tidak membaca ulang semuanya). Catatan MEMORI yang sudah ada tidak diulang di sini: api-t4 gagal gerbang ADR 44 dengan Go 1.27.1 (ditulis jujur di 4.26), Chromium Playwright tidak terpasang, Firefox dan Safari tidak diuji.

## Pelajaran Tahap 4

Bahan untuk DIRI-4. Tiap butir menyebut bukti dari evaluasi ini dan skill yang bisa berubah; keputusannya ada di DIRI-4.

1. evaluasi-tahap, prasyarat: W2 butuh Docker hidup, dan Docker Desktop yang mati di mesin pemilik tidak bisa dihidupkan dari sesi agen (izin administrator). Usul: baris W2 skill dan brief EVAL menyebut `docker info` sebagai pemeriksaan pertama dan menyuruh pengatur menghidupkan Docker sebelum meluncurkan evaluasi.
2. evaluasi-tahap, W5: perbedaan kontrol dan prosa tidak punya alat; skrip DOM (`coba.mjs`, tidak di repo) ditulis ulang tiap tahap, dan hasilnya bergantung keadaan widget (kontrol "Lihat versi benar" dan versi handler baru muncul sesudah Periksa atau menebak). Usul: simpan sebagai `situs/tools/eval-coba.mjs` dengan uji diri, dan tulis di skill bahwa kontrol yang muncul sesudah interaksi dihitung.
3. evaluasi-tahap, W6: `eval_tahap.py adr` mengenali satu bentuk tabel; ADR 35 (4 opsi, satu per baris) terbaca "opsi 0 KURANG" dan membuat exit 1 walau halamannya lengkap. Usul: parser juga membaca tabel dengan kolom pertama "A. ..." per baris, atau kolom "Opsi" sebagai kepala.
4. evaluasi-tahap, W4 keyboard: `eval-keyboard.mjs` memberi 6 terlewat palsu pada island `client:visible` (4.13) karena Tab lebih cepat dari hidrasi; dengan jeda 150 ms semuanya tercapai. Usul: opsi `--jeda` atau tunggu hidrasi, supaya hasil "terlewat" bisa dipercaya pada halaman berdiagram.
5. evaluasi-tahap, uji baca: pembaca segar tidak bisa membuka folder lewat Read, jadi brief wajib memuat nama file lengkap; percobaan pertama gagal tanpa membaca apa pun. Tabel yang terisi sesudah interaksi tidak terlihat dalam ekspor teks, jadi keluhan "tidak ada tabel" perlu dicek ke MDX (butir 1).
6. gaya-bahasa, rujukan: tiga dari lima keluhan pembaca (4.8 "gateway kedua", 4.4 "di atas" dan "bagian G") adalah rujukan yang tidak bisa diikuti: istilah sebelum arti, "di atas" menunjuk tabel di bawah, dan huruf bagian rekaman yang tidak ada di kutipan. Usul: kutipan Snippet yang dirujuk dengan huruf bagian harus memuat baris `# --- X.`; penjaga halaman bisa memeriksanya (rentang `lines` lawan baris penanda di rekaman).
7. gaya-bahasa, hitungan: 4.10 memakai 7,52 tanpa rumus di halaman itu. Aturan "Hitungan diulang dari angka di teks halaman" sudah ada; usul: tambahkan "angka dari halaman yang dibaca sesudahnya diberi satu kalimat asal atau tautan".
8. analisis-kritis, rekaman: `unduh.txt:26` menulis "keempat percobaan" padahal lima dicatat (`run.py:685`). Halaman benar, rekaman salah. Usul: cacah dalam keterangan rekaman dicocokkan dengan jumlah baris yang dicatat, sama seperti klaim universal di halaman.
9. analisis-kritis, label: sapuan `Hitungan` lawan `Rekaman lab` di 31 halaman menemukan 0 hasil rumus berlabel rekaman; pelajaran Tahap 2 dan 3 terserap. Tiga klaim sumber (Shopify, AWS, Stripe) cocok.
10. Prompt tugas EVAL: menulis "registry tak punya kunci `lab` di baris halaman" (ada, 24 halaman), menyebut `tmp/brief-halaman-t4.md` dan preload `pw-chrome.cjs` (brief ada di `tmp/` folder utama, bukan di worktree; preload yang ada bernama `pw-chrome.mjs` di `rjt-teknis/tmp/` dan dipakai dengan `NODE_OPTIONS=--import`). Usul: simpan preload Chrome sistem di `situs/tools/lib/`.

## Cara mengulang

```
git fetch origin && git checkout -B eval-4 origin/main
bun install --cwd situs && bun run --cwd situs build
python3 tools/eval_tahap.py peta 4        # W1
python3 tools/eval_tahap.py gejala 4      # W3 (exit 0)
python3 tools/eval_tahap.py coba 4 && python3 tools/eval_tahap.py bocor 4   # W5 (lalu baca DOM dan data widget)
python3 tools/eval_tahap.py adr 4         # W6 (exit 1 karena 4.9; baca tangan)
python3 tools/eval_tahap.py rantai 4      # W8 (juga rantai 1, 2, 3)
python3 tools/test_eval_tahap.py          # uji diri alat bukti: 26/26
python3 tools/audit_bahasa.py --check     # W3: 403 file, 0 error
python3 tools/erd.py --cek                # W7
python3 tools/cek_tautan.py && python3 tools/contrast.py   # W8, W4
bun run --cwd situs preview --background --port 4323 --host 127.0.0.1
# Chromium Playwright tidak terpasang: pakai Chrome sistem lewat preload ESM
#   NODE_OPTIONS="--import <preload.mjs>"  (preload: chromium.launch dengan executablePath Google Chrome)
printf '%s\n' $(python3 -c "import json;print(' '.join('/'+x['path'].replace('.mdx','').replace('.md','')+'/' for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==4 and x.get('nomor')))") > tmp/halaman4.txt
cd situs && UKUR_HALAMAN=$PWD/../tmp/halaman4.txt node tools/layar.mjs --url http://127.0.0.1:4323        # W4: 18 dari 31 terukur
cd situs && node tools/ukur-axe.mjs --url http://127.0.0.1:4323 --semua --awalan /tahap-4/                # W4: 124 run
cd situs && node tools/eval-keyboard.mjs --url http://127.0.0.1:4323 --path /tahap-4/m38-siapa-membuka/ --ukuran 375x667   # dan 1366x657, --uji-diri
cd situs && node tools/ukur-erd.mjs --url http://127.0.0.1:4323     # W7
cd situs && node tools/tangkap.mjs --url http://127.0.0.1:4323 --path /tahap-4/m30-saldo-tidak-naik/,/tahap-4/m31-verifikasi-tertahan/,/tahap-4/dua-arah-pihak-ketiga/
bun run --cwd situs preview stop
# Lab (W2; butuh Docker hidup), lajur rjt-konten, port bawaan:
make -C labs/t4-webhook cek && make -C labs/t4-integrasi cek && make -C labs/t4-modul cek && make -C labs/t4-storage cek && make -C labs/t4-qr cek
gitleaks detect --no-banner               # no leaks found
```

Telusur angka, kontrol Coba, dan ekspor teks untuk pembaca segar memakai skrip sementara di folder scratchpad sesi evaluasi dan `tmp/` yang tidak masuk repo; semua angka yang ditelusuri ada di tabel di atas dengan file dan baris.

## Pemeriksaan tambahan di luar W1 sampai W8

| Pemeriksaan | Hasil |
| --- | --- |
| Uji diri alat | `test_eval_tahap.py` 26/26, `test_contrast.py` 14/14, `test_erd.py` 110/110, `test_cek_tautan.py` 13/13, `test_audit_bahasa.py` 26/26; `ukur-axe.mjs` uji diri 4/4; `eval-keyboard.mjs --uji-diri` lolos. `layar.mjs` tidak punya uji diri |
| ID internal | `python3 tools/cek_id_tampil.py` → "ID internal (halaman, riset, nomor keputusan, nomor PR) tidak tampil di teks halaman, atribut, SVG, data JSON, sidebar, dan data widget" |
| Keamanan | `gitleaks detect --no-banner` → "no leaks found" (27,18 MB dipindai). Lab serangan Tahap 4 tidak dijalankan di sini (Docker) |
| Build | `bun run --cwd situs build` (bun 1.2.19 lokal) → "284 page(s) built", exit 0 |
| Perubahan di PR ini | Dokumen ini saja. Tidak ada halaman, lab, naskah, skill, alat, atau file bersama yang diubah |
