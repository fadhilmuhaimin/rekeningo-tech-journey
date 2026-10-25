# Rekeningo Tech Journey

Panduan konsep backend lintas stack untuk mobile engineer. Kamu mengikuti aplikasi fiktif **Rekeningo** yang tumbuh dalam lima tahap: dari MVP, ke saldo yang salah dan request ganda, ke lambat di jam sibuk, ke integrasi pihak ketiga, sampai satu database tidak cukup. Setiap masalah di cerita membawa kamu ke satu konsep: transaction, lock, idempotency key, connection pool, queue, cache, webhook, replica, dan lainnya.

Panduan ini ditulis dalam bahasa Indonesia. Istilah teknis tetap dalam bahasa Inggris, karena istilah itu yang akan kamu temui di dokumentasi dan kode.

Yang membedakan panduan ini:

- **Konsep dulu, stack kemudian.** Contoh utama memakai Go dan PostgreSQL. Bagian "Di stack lain" membandingkannya dengan Laravel, Express, Django, Spring, dan BaaS.
- **Output asli, bukan karangan.** Setiap status code, query plan, dan angka di halaman yang ditandai **Rekaman lab** berasal dari lab di folder `labs/` yang bisa kamu jalankan sendiri. Yang tidak direkam ditandai **Ilustrasi**, **asumsi**, atau **[perlu verifikasi]**.
- **Dari sudut pandang app.** Banyak halaman dimulai dari layar HP: apa yang dilihat user saat backend salah.

## Isi repo

| Folder | Isi |
|---|---|
| `situs/` | Situs Astro + Starlight: halaman (MDX di `src/content/docs`), komponen, tema, dan alat tangkapan layar |
| `situs/data/cerita.json` | Registry semua halaman dan angka asumsi cerita; satu-satunya sumber urutan baca |
| `situs/lama/` | Widget interaktif lama, data widget, sql.js, dan ilustrasi yang dimuat situs apa adanya |
| `labs/` | Lab yang menghasilkan rekaman di halaman (Go, Python, Dart, Node, PostgreSQL, Redis) |
| `tools/` | Skrip sinkronisasi registry, istilah, audit bahasa, kontras, dan gerbang kualitas |
| `tests/` | Tes widget lama (Node) |
| `plan/` | Proposal, naskah cerita (`CERITA-TAHAP-N.md`), keputusan (`KEPUTUSAN.md`), memori kerja, dan status |

## Menjalankan situs

Butuh Node 22 atau lebih baru. Satu perintah mengunduh font (sekali), memasang paket, menjalankan server dev, dan membuka browser:

```bash
make jalan
```

Situs terbuka di `http://localhost:4321`; Ctrl+C menghentikannya. `make jalan-hp` sama, tetapi server juga bisa dibuka dari HP di Wi-Fi yang sama lewat alamat "Network" yang dicetak astro. Kalau server sudah jalan, astro menolak menyalakan server kedua dan menunjukkan alamatnya.

Keduanya memakai bun 1.4.2 lewat `npx`, jadi bun tidak perlu terpasang global. bun memasang paket dan menjalankan skrip; astro, Playwright, dan tes tetap berjalan di Node. Langkah manualnya:

```bash
bash tools/get_fonts.sh
npx --yes bun@1.4.2 install --cwd situs --frozen-lockfile
npx --yes bun@1.4.2 run --cwd situs dev
``` Versi dependency dikunci di `situs/package.json` dan `situs/bun.lock`.

### Font

File font tidak ikut repo. Satoshi memakai ITF Free Font License, yang mengizinkan self-host untuk situs sendiri tetapi melarang redistribusi file font, termasuk lewat repo publik. `tools/get_fonts.sh` mengunduh font ke folder proyek, bukan ke instalasi sistem.

Tanpa langkah ini situs tetap berjalan dengan font fallback (`Inter, system-ui, sans-serif`). JetBrains Mono untuk kode memakai SIL Open Font License 1.1.

## Menambah halaman istilah

Setiap istilah di Glosarium bisa punya halaman `/istilah/<slug>/` dengan delapan bagian tetap (keputusan 685–691). Istilah baru di halaman tahap mendapat halamannya di PR halaman itu. Langkahnya, tanpa menyentuh kode:

1. Tambah satu baris di tabel "Semua istilah" `situs/src/content/docs/alat/glosarium.mdx`, urut abjad: `| **Nama** | Satu kalimat, paling banyak 25 kata. | [[id-halaman]] |`. Kalimat ini jadi tooltip dan kalimat pertama halaman istilah.
2. Salin `situs/data/halaman-istilah/idempotency-key.json` ke `<slug>.json`. Slug adalah nama tanpa bagian dalam kurung, huruf kecil, dan setiap deret karakter selain huruf dan angka jadi satu strip ("Tutup buku" jadi `tutup-buku`, "Little's Law" jadi `little-s-law`). Slug persisnya ada di field `s` `situs/data/glosarium.json` tanpa awalan `istilah-`, sesudah `python3 tools/build_istilah.py` dijalankan. `istilah` ditulis persis seperti di Glosarium.
3. Isi tujuh bagian: `sehari_hari`, `cerita` (1–4 rujukan halaman registry), `mekanisme` (3–5 langkah), `stack`, `jebakan` (2–3), `terkait` (nama istilah di Glosarium), `sumber`. Bagian yang belum siap diisi `null` dan tampil "Belum ditulis.".
4. `stack` berisi enam kunci `go`, `node`, `laravel`, `django`, `serverpod`, `supabase`. Baris dari lab memakai `"label": "Rekaman lab"` dan `rekaman` (path file di `labs/`); baris lain `"label": "Tidak dijalankan"` dengan `versi` dan `dokumentasi` (URL resmi). Kalau kodenya sama dengan istilah lain, tulis `{"lihat": "<slug>", "teks": "..."}`.
5. Setiap `sumber` membawa `riset` (ID baris di `plan/RISET-TAHAP-N.md`, tidak tampil di halaman), `judul`, `catatan`, dan `url` atau `rekaman`.
6. Di teks: `` `kode` `` jadi kode, `[[id]]` jadi tautan ke halaman registry (halaman yang belum ditulis tampil "segera"), `[teks](url)` jadi tautan biasa.
7. Jalankan `python3 tools/build_istilah.py`, lalu `bun run --cwd situs test`. Tes menolak bagian yang hilang, stack yang kurang dari enam, rekaman yang tidak ada, dan ID riset yang tidak tercatat.

## Pemeriksaan

```bash
bash tools/cek_situs.sh --layar
```

Skrip yang sama dijalankan GitHub Actions di setiap pull request (`.github/workflows/cek.yml`). Isinya: sinkron registry dan angka asumsi, istilah, audit bahasa, build strict, ID internal yang tidak boleh tampil, kontras dua mode, tes, layar pertama setiap halaman di empat ukuran, dan tangkapan layar desktop dan HP dalam mode gelap dan terang.

Pemeriksaan layar butuh Chromium Playwright (`cd situs && bunx playwright install chromium`) dan font asli. Dengan font fallback, teks lebih tinggi dan halaman bisa gagal di layar 375×667. Tanpa `--layar`, skrip melewati pemeriksaan yang butuh browser. Lama jalannya sekitar 3 menit.

Lolos semua adalah syarat minimum, bukan bukti kualitas.

## Menjalankan lab

Setiap halaman yang menampilkan **Rekaman lab** menyebut file output-nya, misalnya `labs/api-t1/output/http.txt`. Output yang direkam sudah ada di repo. Kamu menjalankan lab untuk melihat perilakunya sendiri, atau untuk membuat ulang rekaman setelah mengubah kode lab.

### Yang dibutuhkan

| Alat | Versi yang direkam | Dipakai lab |
|---|---|---|
| Docker + Compose | – | Semua lab database (PostgreSQL 17), cache (Redis 8), replica, dan beberapa alat di image |
| Go | 1.27 | Sebagian besar server dan client lab |
| Python 3 | 3.14 | Skrip penggerak lab (`run.py`), dengan venv `labs/.venv` |
| Dart | 3.11 | Client app di lab retry, sync, dan ukuran payload |
| Node | 22+ | Lab concurrency dan perbandingan stack |
| PHP + Composer | – | Hanya untuk bagian Laravel di lab perbandingan stack |

### Langkah pertama

Satu perintah dari root repo memeriksa alat yang dibutuhkan, membuat venv lab, dan menjalankan PostgreSQL 17 serta Redis 8:

```bash
make lab
```

`make lab-down` mematikan keduanya dan menghapus volumenya. Repo juga punya `.devcontainer/` untuk VS Code Dev Containers atau GitHub Codespaces: Go, Node, Python, Docker, dan Dart terpasang tanpa instalasi di mesin kamu. Langkah manualnya ada di bawah.


Hampir semua lab memakai satu PostgreSQL bersama di port `54333` (bawaan; `LAB_DB_PORT` menggantinya). Setiap lab punya schema sendiri dan membuatnya ulang setiap kali dijalankan, jadi lab bisa dijalankan dalam urutan apa pun. Tidak ada lab yang menulis ke schema `public`.

| Schema | Lab |
|---|---|
| `tahap1` | `api-t1` (versi naskah Tahap 1, keputusan 132) |
| `tahap3`, `tahap3_tes` | `api-t3` (skema akhir Tahap 2 lalu migrasi `labs/api-t3/migrasi`; `tahap3_tes` untuk tes Go, keputusan 950), `t3-pool` (memakai schema `tahap3` lewat `dasar_t3.py`, keputusan 957), `t3-mitm` (juga schema `tahap3` lewat `dasar_t3.py`, keputusan 977) |
| `tahap3_cache` | `t3-cache` (di atas server dan skema `api-t3`; schema sendiri, keputusan 968) |
| `tahap3_outbox` | `t3-outbox` (di atas server dan skema `api-t3`; schema sendiri, keputusan 960) |
| `t3_instance` | `t3-instance` (data awal `api-t3` dibuat ulang di schema sendiri, keputusan 965) |
| `b2`, `b2q` | `b2-model`, `b2-query` (`e5-payload` membaca `b2q`, jadi jalankan `b2-query` dulu) |
| `b3r`, `b3s`, `b33` | `b3-race`, `b3-stack`, `b3-isolasi` |
| `b3_ledger`, `b3_ledger_v1` | `b3-ledger` (ledger Tahap 2; `b3_ledger_v1` dibuat dari `labs/api-t1/schema.sql` sebagai sumber migrasi) |
| `b3_isolasi` | `b3-isolasi` versi ledger (skema dari `labs/b3-ledger/schema.sql`) |
| `t2_pencairan` | `t2-pencairan` (job pencairan Jumat; ledger dari `labs/b3-ledger/schema.sql`, tabel pencairan dari `schema.sql` lab) |
| `b4m`, `b4` | `b4-migration`, `b4-skema` |
| `b5`, `b9` | `b5-rls`, `b9-cache` |
| `pembayaran`, `pesanan` | `b7-2-modul` (dua modul, dua schema) |
| `e2`, `e3` | `e2-sync`, `e3-idempotency` |
| `t3`, `t4w`, `t5p` | `t3-bayar`, `b10-2-webhook`, `t5-skala` |

Lab yang gagal membuat schema-nya berhenti dengan error, bukan merekam hasil dari schema lama.

```bash
make -C labs/b3-race setup
```

```bash
make -C labs/b3-race up
```

`setup` membuat `labs/.venv` dan memasang `labs/requirements.txt`. `up` menjalankan PostgreSQL 17 di Docker. Kredensialnya (`lab`/`lab`) khusus lab lokal dan hanya mendengarkan `127.0.0.1`.

### Kontainer lab dan reset

| Kontainer | Port | Dibuat oleh | Dipakai |
|---|---|---|---|
| PostgreSQL 17 bersama | `54333` | `make -C labs/b3-race up` | Semua lab di tabel schema di atas |
| Redis 8 | `56379` | `make -C labs/b9-cache run` | `b9-cache` |
| PostgreSQL primary + replica | `54340`–`54341` | `make -C labs/t5-replika run` | `t5-replika` |

Nama project Docker Compose diambil dari nama folder lab (`b3-race`, `b9-cache`, `t5-replika`). Kalau kamu punya lebih dari satu clone repo ini, semua clone memakai kontainer yang sama, dan `down` di satu clone mematikan kontainer untuk clone lain. Untuk menjalankan lab di beberapa clone atau worktree sekaligus, isi `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` per clone: caranya di [`labs/README.md`](labs/README.md), bagian "Beberapa lajur sekaligus".

Urutan reset sebelum merekam ulang untuk dikirim:

```bash
make -C labs/b3-race down
```

```bash
make -C labs/b3-race up
```

Lalu jalankan lab yang kamu ubah. `down` memakai `-v`, jadi semua schema lab di database bersama ikut terhapus. Setelah reset, lab bisa dijalankan dalam urutan apa pun, kecuali `e5-payload` yang butuh data `b2-query`. Untuk `t5-replika`, jalankan `make -C labs/t5-replika down` sebelum `run` supaya primary dan replica dibuat dari awal.

### Daftar lab

Lab yang punya `Makefile` dijalankan dengan `make -C labs/<nama> run`. Sisanya dijalankan dari foldernya.

| Lab | Halaman | Cara menjalankan |
|---|---|---|
| `api-t1` | 1.4, 1.6–1.12, 1.14–1.24, 1.26–1.33 | `make -C labs/api-t1 run` (satu bagian: `make -C labs/api-t1 run BAGIAN=login`) |
| `api-t3` | Belum dirujuk halaman (rencana 3.3, 3.5, 3.7, 3.27; dasar lab Tahap 3 lain) | `make -C labs/api-t3 run` (satu bagian: `make -C labs/api-t3 run BAGIAN=outbox`); `make -C labs/api-t3 cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit |
| `t3-cache` | Belum dirujuk halaman (rencana 3.18, 3.19) | `make -C labs/t3-cache run` (±50 detik; satu bagian: `make -C labs/t3-cache run BAGIAN=redis`); `make -C labs/t3-cache cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit; memakai server api-t3 dan Redis lab di port yang sama, jadi tidak bersamaan dengan `api-t3` |
| `t3-pool` | Belum dirujuk halaman (rencana 3.6, 3.7, 3.8) | `make -C labs/t3-pool run` (±5 menit; satu bagian: `make -C labs/t3-pool run BAGIAN=little`); `make -C labs/t3-pool cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit |
| `t3-outbox` | Belum dirujuk halaman (rencana 3.9–3.13, 3.26) | `make -C labs/t3-outbox run` (satu bagian: `make -C labs/t3-outbox run BAGIAN=kursor`); `make -C labs/t3-outbox cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit; memakai server api-t3 di port yang sama, jadi tidak bersamaan dengan `api-t3` |
| `t3-instance` | Belum dirujuk halaman (rencana 3.14–3.17) | `make -C labs/t3-instance run` (satu bagian: `make -C labs/t3-instance run BAGIAN=batas`); `make -C labs/t3-instance cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit; butuh Docker untuk Caddy 2.11.7 |
| `t3-mitm` | Belum dirujuk halaman (rencana 3.24, 3.25) | `make -C labs/t3-mitm run` (±1 menit; satu bagian: `make -C labs/t3-mitm run BAGIAN=pin`); `make -C labs/t3-mitm cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit; `make -C labs/t3-mitm mutasi` uji mutasi; butuh Go dan Dart; memakai server api-t3 di port yang sama, jadi tidak bersamaan dengan `api-t3`; sertifikat dan kunci dibuat acak di folder sementara dan tidak di-commit |
| `b1-openapi` | 1.18, 1.33 | `make -C labs/b1-openapi run` |
| `b2-model` | Belum dirujuk halaman | `make -C labs/b2-model run` |
| `b4-migration` | 1.25 | `make -C labs/b4-migration run` |
| `b3-stack` | 1.11, 1.23, 2.1 | `make -C labs/b3-stack run` (butuh Go, Node, PHP + Composer; gagal bila hasil satu stack tidak sesuai skenario) |
| `b5-rls` | 1.28, 1.29 | `make -C labs/b5-rls run` (gagal bila hasil RLS tidak sesuai) |
| `f2-review` | F2 (halaman lama) | `make -C labs/f2-review run` |
| `b3-ledger` | Belum dirujuk halaman (rencana 2.4, 2.6–2.8) | `make -C labs/b3-ledger run`; `make -C labs/b3-ledger cek` merekam ulang dan gagal bila rekaman berbeda dari yang di-commit |
| `t2-pencairan` | Belum dirujuk halaman (rencana 2.5, 2.25, 2.26) | `make -C labs/t2-pencairan run` (butuh Go); `make -C labs/t2-pencairan cek` merekam ulang dan gagal bila rekaman berbeda atau ada rekaman baru yang belum di-commit |
| `b3-race` | 2.1 | `make -C labs/b3-race run` |
| `b3-isolasi` | 2.2 (halaman lama); versi ledger untuk 2.12 belum dirujuk halaman | `make -C labs/b3-isolasi run`; versi ledger `make -C labs/b3-isolasi run-ledger`, dan `cek-ledger` merekam ulang lalu gagal bila rekaman berbeda dari yang di-commit atau ada file baru |
| `e3-idempotency` | 2.3 | `make -C labs/e3-idempotency run` |
| `b2-query` | 2.4–2.6 | `make -C labs/b2-query run` |
| `e5-payload` | 2.7 | `make -C labs/e5-payload run` |
| `b4-skema` | 2.8 | `make -C labs/b4-skema run` |
| `t3-bayar` | 3.1–3.3 | `make -C labs/t3-bayar run` |
| `b8-concurrency` | 3.4 | `make -C labs/b8-concurrency run` |
| `e4-realtime` | 3.5 | `make -C labs/e4-realtime run` |
| `b9-cache` | 3.6 | `make -C labs/b9-cache run` (Redis di compose sendiri) |
| `c4-ratelimit` | 3.7 | `make -C labs/c4-ratelimit run` |
| `e2-sync` | 3.8 | `make -C labs/e2-sync run` |
| `b11-integrasi` | 4.1 | `cd labs/b11-integrasi && ../.venv/bin/python run.py` |
| `b11-2-proxy` | 4.2 | `cd labs/b11-2-proxy && ../.venv/bin/python run.py` |
| `b10-2-webhook` | 4.3 | `make -C labs/b10-2-webhook run` |
| `b5-2-oidc` | 4.4 | `cd labs/b5-2-oidc && go run .` |
| `b7-2-modul` | 4.5 | `make -C labs/b7-2-modul run` |
| `t5-skala` | 5.1 | `make -C labs/t5-skala run` |
| `t5-replika` | 5.2 | `make -C labs/t5-replika run`, lalu `make -C labs/t5-replika down` (primary + replica di compose sendiri, port 54340–54341) |

Lab server memakai port tetap di rentang 18080–18142. Lab sejak halaman 3.7 sengaja gagal kalau port sudah terpakai, supaya rekaman tidak diam-diam diambil dari server lama. Lab yang lebih lama belum semuanya diperiksa untuk pola ini, jadi pastikan proses lab sebelumnya sudah mati sebelum kamu menjalankan lab berikutnya.

Angka waktu (latency, downtime, jumlah request per detik) bergantung pada mesinmu. Yang harus sama dengan halaman adalah perilakunya: status code, saldo akhir, urutan kejadian.

### Rekaman deploy M6

`make -C labs/api-t1 run BAGIAN=m6` mengulang deploy minggu 5 untuk halaman 1.30 dan menulis `labs/api-t1/output/m6.txt`. Lab membangun v2 dari salinan kode v1: kolom `transaksi.jumlah` diganti `nominal`, dan field JSON ikut berganti. Dua folder sementara meniru laptop Raka dan `/opt/rekeningo` di VPS.

Prober membaca riwayat dari HP Budi dan HP Dimas satu kali per detik. Setiap perintah deploy dijalankan di antara dua putaran prober. Karena itu jumlah putaran yang gagal sama dengan jumlah perintah, bukan lama perintah itu di mesinmu.

Di cerita, Raka mengganti nama kolom lewat `migrate up` (file `000006`). Lab menjalankan `ALTER TABLE` yang sama lewat `psql`, supaya mode lock terbaca dari `pg_locks` di transaction yang sama.

Yang terekam: jeda layanan selama tiga putaran, lalu app 1.0 yang tidak menemukan field `jumlah`. App 1.0 yang membayar mendapat `400`, app 1.1 mendapat `201`. VPS dan laptop hanya punya binary v2, dan v1 yang dibangun ulang mendapat `500` di skema baru.

Sesudah kolom dikembalikan ke `jumlah`, v1 melayani app 1.0 lagi, tapi app 1.1 mendapat `200` tanpa field `nominal`. Rekaman halaman sesudah 1.30 mulai dari keadaan itu: kolom `jumlah`, kode v1. Lab berhenti dengan error bila satu penggantian v2 tidak ditemukan atau hasil prober berbeda dari skenario.

### Rekaman M7: `.env` di riwayat git

`make -C labs/api-t1 run BAGIAN=m7` mengulang temuan minggu 5 untuk halaman 1.34 dan menulis `labs/api-t1/output/m7.txt`. Lab membuat repo git sementara yang meniru laptop Raka. Commit minggu 1 memuat `.env`, commit minggu 5 melepasnya dengan `git rm --cached`, dan `git show <commit>:.env` tetap mencetak isinya.

Nilai di `.env` palsu. Lab membangkitkannya saat berjalan, jadi nilainya tidak ada di file repo mana pun. Rekaman menggantinya dengan label seperti `<password-lama>`, dan lab berhenti dengan error bila satu nilai asli lolos ke rekaman. Nama dan tanggal commit tetap, jadi hash commit sama di setiap rekaman.

gitleaks v8.30.1 dipasang dengan `go install` ke folder sementara dan selalu dipanggil dengan `--redact`. Aturan bawaannya menandai baris `POSTGRES_PASSWORD`, tapi tidak menandai `DATABASE_URL` yang memuat password yang sama. Aturan tambahan di `.gitleaks.toml` repo contoh menemukan baris itu.

Sesudah itu Postgres lab memerankan database di VPS. Password dari riwayat masih bisa dipakai login sampai `ALTER ROLE` menggantinya, lalu login dengan password lama ditolak. Pre-commit hook menolak `.env.example` yang berisi password. `git commit --no-verify` melewati hook itu, dan pemindaian commit baru seperti di CI tetap menemukannya.

Yang dibutuhkan: Docker, Go, dan koneksi internet saat `go install` pertama kali.

### Semua pihak ketiga di lab adalah tiruan

Tidak ada lab yang menghubungi layanan luar atau butuh akun vendor. Payment gateway, layanan verifikasi identitas, object storage, server identitas (OAuth/OpenID Connect), layanan notifikasi, dan pengirim webhook di lab adalah program kecil di folder lab itu sendiri. Namanya netral, dan perilakunya (lambat, gagal, mengirim ulang) diatur supaya konsepnya terlihat. Program-program ini tidak meniru API vendor tertentu. Format webhook mengikuti spesifikasi terbuka Standard Webhooks.

Data di lab dan halaman juga karangan: nama user, NIK, nomor HP, email (`@contoh.test`), dan saldo. Kunci dan token dibuat ulang setiap kali lab berjalan, dan token di output disensor.

## Kontribusi

Repo ini adalah tempat kerja utama panduan. Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk aturan konten, pemeriksaan, dan cara merekam ulang lab.

## Lisensi

- **Teks dan gambar panduan** (halaman di `situs/src/content/`, registry dan istilah di `situs/data/`, data cerita dan skenario di `situs/lama/widgets/data/`, ilustrasi di `situs/lama/assets/cerita/`, `plan/`): [CC BY-SA 4.0](LICENSES/CC-BY-SA-4.0.txt). Kamu boleh menyalin, mengubah, dan menerbitkan ulang, termasuk untuk tujuan komersial, asal mencantumkan sumber dan membagikan hasil turunannya dengan lisensi yang sama.
- **Kode** (`tools/`, `labs/`, `tests/`, `situs/` selain halaman, JavaScript dan CSS widget): [MIT](LICENSE).
- **Pengecualian:** `situs/lama/vendor/` (sql.js) dan dependency yang diunduh package manager memakai lisensinya masing-masing. File font tidak ikut repo (lihat bagian Font).
