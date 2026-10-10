# Memori kerja

Catatan kerja lintas sesi dan lintas model. Maksimal 80 baris (gerbang menolak lebih, keputusan 235). Pelajaran dan catatan lama di `plan/PELAJARAN-ARSIP.md` (tidak diimpor; cari dengan grep).

## Keputusan baru

- Nomor baru = terbesar di KEPUTUSAN + 1: `grep -o '^| [0-9]*' plan/KEPUTUSAN.md | tail -1`. Daftar per nomor ada di KEPUTUSAN, tidak diulang di sini.
- 235: hemat konteks (RINGKAS menggantikan impor CERITA/PROPOSAL, MEMORI ≤ 80 baris, PROTOKOL bagian k, `tools/ukur_konteks.py`); loop CLI diganti sesi pengatur + satu subagent per tugas.

## Usulan perubahan cerita

- M4: naskah belum menyebut asal batas saldo warung. 1.22 memakai: minggu 2 Raka menambah batas Rp1.500.000 lewat psql; Jumat minggu 3 saldo Ani Rp1.450.000. Disetujui pemilik 2026-10-09; mohon naskah M4 diperbarui.
- M2: naskah menulis server membaca `nominal`; lab dan halaman sejak 1.9 memakai `jumlah` (label layar "Nominal"). Usul: naskah menyebut `jumlah`, atau dibiarkan.
- M5: naskah menulis "100 saldo"; lab membaca 103 akun (100 karyawan + 3 warung), 1.26 menulis 103. Usul: naskah menyebut 103.

## Catatan untuk halaman Tahap 1 berikutnya

- 1.39 (F1) menyerap F2: hapus halaman F2 dan entrinya di PR yang sama (pola keputusan 150).
- 1.31 `deploy.txt`: kode api-t1 diambil dari commit main `f128167` (`KODE_V1` di `run.py`), Dockerfile dari folder lab; hash 390ff47/f5ea0b4 (±27 tempat: halaman, `t1-deploy.json`, `t1-deploy-tag.json`, `kartu.json`) hanya berubah bila salah satunya diubah, dan `harap` membuat lab gagal keras.
- 1.36 (Tim-infra) memakai ulang `labs/api-t1/deploy/compose.yaml` dan `ci.yml` dari 1.31; jeda ganti container belum diukur, jangan tulis angkanya tanpa rekaman.
- Ilustrasi latar Grup Lestari belum ada; ilustrasi baru wajib lolos `ukur-ilustrasi.mjs` (tambahkan path halamannya ke alat itu). `situs/lama/assets/cerita/tahap-1.svg` tidak dipakai lagi.
- Tabel "Angka di tahap ini" ditulis ulang di 1.37/1.38, angka dari `tahap[0].asumsi`.
- `/cara-pakai/` (A0) masih menjelaskan susunan lama; tulis ulang untuk lima blok dan tiga pintu.
- `labs/api-t1-lama` boleh dihapus (disetujui pemilik 2026-10-08) hanya setelah `grep -rn api-t1-lama situs/ labs/ tools/` kosong; bukti grep di PR hapus. Kolom "Halaman" di README lab memakai nomor lama.
- Audit bahasa menolak "kantor" (pakai "perusahaan") dan "pemakai" (pakai "user").
- Pola tulis ulang halaman lama: pindah ke `tahap-1/<slug>.mdx`, lima blok, contoh PRD v1; hapus file lama dan data widget lama; perbarui `path`, `prasyarat`, hapus `lama` di registry, perbarui `alat/indeks-topik.mdx`, lalu `python3 tools/sinkron_cerita.py`.

## Perintah dan pola kerja

- Situs (bun 1.4.2): `bun run --cwd situs build|preview|test|cek-tipe|tangkap|layar` (urutan ini; `bun --cwd situs run x` hanya mencetak bantuan dengan exit 0). bun lokal 1.2.19; versi CI lewat `npx --yes bun@1.4.2 ...`.
- Gerbang: `bash tools/cek_situs.sh --layar > tmp/cek.txt 2>&1 && echo LOLOS || echo GAGAL`, lalu `tail -30 tmp/cek.txt`. Gerbang menghentikan preview worktree ini sendiri (sebelum mulai dan di trap) dan gagal keras bila port dipegang server lain (keputusan 249). Preview manual (argumen sama dengan gerbang): `bun run --cwd situs preview --background --port 4321 --host 127.0.0.1`, hentikan `bun run --cwd situs preview stop`; tanpa `--host` server hanya mendengar `[::1]:4321` dan `--url http://127.0.0.1:4321` gagal.
- Tangkapan dari root: `npm --prefix situs run tangkap -- --url http://127.0.0.1:4321 --path /<path>/` (ke `situs/tangkapan/`). Layar pertama: `npm --prefix situs run layar -- --url http://127.0.0.1:4321`; `layar.mjs` tidak mengukur halaman ADR.
- Layar pertama HP sempit: 1.23 hanya punya 28 px di 375×667; jangan tambah tinggi di atas Inti. Rantai di Inti selalu `ringkas`, maksimal dua baris pendek.
- Gerak: bungkus island dengan `MotionProvider` (`situs/src/gerak/`), `import * as m from "motion/react-m"`, `transition` dari `useGerak(...)`, `initial` dari `useAwal(...)`; jangan tulis `duration: <angka>`. Contoh `/uji/gerak/`; diperiksa `ukur-gerak.mjs`.
- Gerak masuk tanpa React/domMax: `muncul(el)` dari `situs/src/gerak/muncul.ts` di useLayoutEffect sesudah pilihan (Tebak, PetaDiagram).
- Diagram arsitektur: `<DiagramArsitektur client:visible id="..." judul="Arsitektur Tahap N" data={Arsitektur.parse(t.arsitektur)} />` dari `situs/src/diagram/`; data di registry `tahap[].arsitektur`; wajib lolos `ukur-diagram.mjs`. Contoh `/uji/diagram/`.
- Per halaman: branch `tahap-1/<slug>` dari main; lab dulu bila perlu (PR sendiri); halaman (PR sendiri); KEPUTUSAN + STATUS + MEMORI + ANTREAN; merge bila CI hijau; akhiri "Siap dilanjutkan dari <halaman>". Setelah 1.42: `plan/PROMPT-CROSSCHECK.md`, lalu `plan/LAPORAN-TAHAP-1.md`.

## Perlu dicek pemilik

- Redesain #120: usulan perubahan PROPOSAL "Desain visual final" dan CLAUDE.md `<tampilan>` di `plan/AUDIT-TAMPILAN.md` bagian 6, belum diubah.
- ADR 7 (keputusan 240): RLS sebagai pagar kedua dipasang di tabel ledger Tahap 2, tidak di tabel v1 `api-t1` (rekaman `b5-rls` bagian 5: policy pemilik membuat bayar ke warung `UPDATE 0`). Kalau RLS harus sudah berjalan di Tahap 1, perlu tugas lab `api-t1` sendiri.
- Cloudflare Pages (keputusan 115): butuh API token (Account > Cloudflare Pages > Edit) dan Account ID, lalu `gh secret set CLOUDFLARE_API_TOKEN` dan `gh secret set CLOUDFLARE_ACCOUNT_ID`.
- Serverpod 4 (1.32): apakah exception buatan sendiri sampai ke tes `withServerpod` dengan tipe aslinya [perlu verifikasi].

## Sedang dikerjakan

2026-10-11 · 1.33 App versi lama + ADR 10 di branch `tahap-1/app-versi-lama` (keputusan 252, 253): rekaman `versi.txt`, halaman `tahap-1/app-versi-lama.mdx`, alur `t1-versi`; E1 lama dan `e1-versi.json` dihapus. PR menunggu tinjauan; jangan merge sebelum disetujui. Berikutnya sesudah merge: python3 tools/antrean.py berikut

## Pelajaran

- Data widget lama (skenario alur) ditulis di `situs/lama/widgets/data/`; `situs/public/widgets/` tidak dilacak git dan disalin saat build. `tools/sinkron_cerita.py` mengabaikan argumen (`--help` pun langsung menyinkronkan).
- Astro 7 `preview` otomatis jadi daemon bila agen terdeteksi, dan bila daemon lama hidup ia keluar tanpa menyalakan server baru; `curl /` berhasil tidak membuktikan server melayani build ini (G1 memakai penanda per jalan di `situs/dist`).
- Island yang mengganti versi statis wajib memesan tinggi akhirnya di SSR; ukur CLS dengan modul JS ditunda dan gulir tanpa input (`ukur-diagram.mjs` bagian 7), karena tangkapan dan `layar.mjs` tidak melihat geser.
- Island React Astro di-hydrate di `startTransition` dan atribut `ssr` dilepas sebelum React selesai; keadaan yang dibaca dari DOM di efek butuh CSS yang menyembunyikan isi SSR sampai cocok, bukan selektor `[ssr]`.
- Widget alur hanya menerima nada `warn` dan `good` (`alur-core.js` NADA, diperiksa `tools/validasi_skenario.mjs` saat build); Rantai menerima juga `system`.
- ADR 7: policy RLS yang menyaring `UPDATE` membuat kredit ke baris orang lain jadi `UPDATE 0` tanpa error (`b5-rls` bagian 5); RLS di Rekeningo hanya untuk baca, di tabel ledger Tahap 2.
- Konteks awal tiap iterasi loop 94–103k token, puncak 127–209k; 46% token yang diproses berasal dari panggilan dengan konteks > 150k. Penyumbang hasil alat terbesar: gambar (22%), grep (17%), PROTOKOL dibaca ulang (10%), `tail` KEPUTUSAN (baris ribuan karakter).
- Retrospektif I4–1.28: halaman lama yang ditulis ulang membawa data lab lama yang bertentangan dengan naskah (JWT 15 menit di B5.1, ID teks `budi`/`ani` di b5-rls); cocokkan rekaman lama dengan skema v1 dan ADR naskah sebelum dipakai ulang. Satu rekaman khusus per halaman (`authz.txt`) lebih jelas daripada potongan dari lima file rekaman.
- Lab SQL yang di-pipe ke `grep` kehilangan exit status psql; tambahkan pemeriksaan hasil di Makefile (pola `labs/b5-rls/Makefile`).
- OWASP API Security pindah ke `api-security.owasp.org` (308 dari `owasp.org/API-Security/...`); link baru memakai alamat baru.
- Retrospektif K0e–I3: alat ukur kecil (ukur-gerak, ukur-ilustrasi, ukur-judul) menangkap yang tidak terlihat di tangkapan. Pola: ukur dulu, perbaiki, ukur ulang, masukkan alat ke gerbang.
- Motion `reducedMotion="user"` hanya mematikan transform dan layout; ukur frame pertama sesudah klik.
- Route baru di `src/pages/` atau `import()` lazy mengubah chunk bersama Vite: semua halaman berganti hash; bandingkan sidik `tmp/sidik_dist.py`.
- Perubahan CSS global di atas Inti menggeser layar pertama semua halaman; simpan keluaran `layar.mjs` sebelum dan bandingkan sesudahnya (`tmp/banding_layar.py`).
- Setelah gerbang lolos, perubahan teks apa pun wajib diikuti `python3 tools/sinkron_cerita.py` dan gerbang ulang (CI #119 gagal karena `kartu.json` tertinggal).
- `git rm` langsung men-stage penghapusan; `git add <file baru> && git commit` ikut membawanya. Hapus file lama di commit yang sama dengan perubahan registry, supaya setiap commit tetap bisa dibangun.
- Widget lama alur diuji tanpa melihat gambar: `node situs/tangkapan/uji-alur.mjs <url>` (tangkapan/ di-.gitignore, jadi skrip ditulis ulang bila hilang) membuka semua blok (`details.open`), menekan tebakan, Berikutnya, dan varian, lalu menghitung error konsol.
- Merge ditolak pengaman: berhenti, laporkan di baris pertama, jangan memulai halaman berikutnya di atas PR yang belum di-merge.
- Komentar XML di SVG tidak boleh memuat `--` (mis. nama token `--aksen`): favicon jadi gambar rusak tanpa error build; parse SVG dengan `xml.etree`.
- Lab psql dengan `-e`: `\set ECHO none` menyembunyikan setup panjang (fungsi, policy); `DROP SCHEMA ... CASCADE` atas lebih dari satu objek mencetak `DETAIL:` yang tidak tersaring `^NOTICE`, jadi run ulang berbeda dari run bersih.
- Mode dontAsk/auto menolak: perintah majemuk dengan `cd`, heredoc, loop shell, awalan env (`AXE=...`), diff `<(...)`, pipa ke `gzip`/`wc`, mengubah `.claude/settings.json`; pakai skrip di `tmp/` dan path relatif.
- Ukur konteks sesi pengatur 1.28 (tools/ukur_konteks.py pada transcript subagen): awal 65–66k (loop lama 94–101k), puncak pelaksana 279k, 24,9 juta token diproses, 86% di atas 150k; peninjau 98–176k. Pelaksana wajib serah-terima di ±120k (PROTOKOL k.4).
- Animasi CSS yang dipicu event `toggle` (async) mulai satu sampai dua frame sesudah `<details>` terbuka: isi penuh sempat berkedip. Ukur frame per rAF sesudah klik sungguhan (`page.click`, bukan `el.click()`, yang tidak mengirim pointerdown).
- Penanda selesai di `tmp/` bisa tertinggal dari sesi lama (K1: `tmp/cek-hasil.txt` membuat Monitor menyala saat gerbang masih jalan); hapus penanda sebelum gerbang mulai, atau tunggu prosesnya (`pgrep -f cek_situs`).
- `tmp/sidik_dist.py` hanya menghitung file yang dirujuk HTML; chunk yang diimpor island (React Flow) terlihat lewat `tmp/ukur_diagram_js.py` atau byte jaringan (`situs/tangkapan/i5b-jaringan.mjs`). React Flow `fitView` hanya untuk node awal: data baru = ReactFlow baru (`key`).
- layar.mjs tidak menghitung Snippet sebagai visual Inti; Inti butuh Rantai atau widget (1.32 gagal 4 ukuran sebelum Rantai).
