# Setelah Tahap 2

Polesan dan pencegahan dari tinjauan lab dan halaman Tahap 2 yang sengaja tidak dikerjakan saat itu (lingkup Tahap 2 dibekukan sejak awal, ANTREAN bagian Tahap 2). Yang masuk ANTREAN hanya kategori rusak, aksesibilitas, kontras, atau gerbang yang gagal.

## Temuan polesan dari lab-b3-ledger (#254, keputusan 400–407)

- `buku.akun_id` dan `buku.jenis` tidak dikunci, padahal mengubah `jenis` melewati invarian 3. Usul: role app hanya boleh UPDATE `(saldo_cache, versi)`, atau trigger penolak.
- `migrasi_v1.sql` menulis nama `b3_ledger_v1` langsung; migrasi in-place bentrok nama tabel `akun`; tanpa LOCK tabel v1, tulisan bersamaan membuat migrasi gagal di cek langkah 6 (data tidak rusak).
- Biaya invarian 3 tumbuh dengan riwayat: setiap posting keluar menjumlah semua posting buku itu. Data besar (b2-query) dimuat dengan trigger dimatikan atau lewat snapshot saldo.
- Kepala rekaman mencetak versi server dari image `postgres:17` yang tidak di-pin (sama dengan b3-race); "read committed" ditulis tetap, tidak dibaca dari server.
- `make cek` tidak mendeteksi file output baru yang belum di-track.
- Frasa "pemilik tabel dan superuser" di skema dan `invarian.txt` sebaiknya menyebut `session_replication_role` butuh superuser atau hak SET; waktu `dibuat` koreksi v1 hanya tersisa di tabel v1.
- [perlu verifikasi] Fungsi trigger invarian berjalan sebagai SECURITY INVOKER; policy RLS SELECT-pemilik di `posting` (ADR 7) bisa membuat `cek_jurnal_seimbang` hanya melihat satu sisi jurnal dan menolak setiap bayar.

## Temuan polesan dari lab-api-t2 (#256, keputusan 408–418)

- Urutan lock top-up bergantung pada rencana query (GroupAggregate terurut mengunci tunjangan lebih dulu); dua top-up berlawanan arah tidak deadlock dalam 3 percobaan.
- `TestTutupBukuSeimbang` bergantung pada jurnal dari tes lain; riwayat bagian C di `run.py` hanya memeriksa baris ganda, belum baris terlewat; penolakan batas saldo warung 422 belum direkam atau dites.
- Lab gagal bila berjalan melewati pukul 00.00 WIB atau pergantian bulan.
- Kontrak: `/transfers` tanpa 403, `/topup` tanpa 400, `GET /warung` tidak ada; `minLength` alasan menghitung karakter, service menghitung byte; body JSON endpoint lain belum dibatasi ukurannya.
- `tools/erd.py` `bersihkan()` menolak `000010_ledger_tabel.up.sql` karena `SET search_path FROM CURRENT`; ERD2 perlu mengizinkannya.

## Temuan polesan dari lab-b3-race (#257, keputusan 430–434)

- `rekam.py:3` menulis "Klien" (aturan bahasa: client); docstring `run_ledger.py` "tanpa sleep" padahal ada ambang 0,3/0,5/3 detik (beban berat bisa gagal palsu, tidak lolos palsu); kepala `ledger-tanpa-lock` sebaiknya "bisa terjadi".
- Untuk 2.10: bila dua request tumpang tindih, hasil yang lebih mungkin adalah B 23514 (500); −Rp20.000 butuh dua COMMIT di celah commit yang sama, frekuensinya di produksi belum diukur.
- Untuk 2.11: footer `race.js` menulis "oleh labs/b3-race/run.py" (salah untuk replay ledger); langkah 8 for-update menampilkan mode "Update" (A sudah memegang FOR UPDATE); tab "bergantian" berwarna `is-good` padahal B error; `VAR_LABEL` belum mengenal `versi`; widget race 2.11 lama melanggar axe definition-list dan aria-allowed-role.
- Image `postgres:17` tidak di-pin dan versinya tercetak di kepala rekaman: `cek-ledger` gagal saat image naik. Target `run` lama menyalin ke `../../docs/` yang sudah dihapus.

## Temuan polesan dari T2-registry (#258, keputusan 450)

- Lima halaman lama memakai judul naskah "+ ADR 13–17" di sidebar, Berikutnya, dan kartu, padahal H1 dan isinya belum memuat ADR itu.
- CSS sorotan peran `html[data-peran] a[data-peran~]` mengalahkan gaya abu-abu butir "segera" (peran Security: tiga butir tampak bisa dibaca; badge tetap ada). Beranda menulis "menebalkan semua 11 halaman", padahal 14 (3 segera).
- Daftar peran di Vitest ditulis manual, tidak dibaca dari "Jalur per peran" naskah.

## Temuan polesan dari lab-b3-isolasi (#259, keputusan 440–447)

- Tambahkan `harap` `SHOW transaction_isolation` di tiap skenario supaya `run-ledger` sendiri gagal bila level tertukar.
- Penomoran beda dengan b3-race ("retry 1" lawan "percobaan 2", buku Budi id 2 lawan 3): seragamkan saat 2.11 dan 2.12 ditulis; sumber `trigger.c`/`snapmgr.c` layak masuk rasional 443.
- `api-t2` `TutupBuku` menjalankan dua query di pool, bukan satu transaction: ringkasan sistem bisa dari snapshot lebih baru (catat untuk 2.4, sesuai 442).
- README belum memuat schema `b3_race` dan target `run-ledger` b3-race; baris b3-race masih menulis 2.1. `b3-race` masih memakai ambang waktu 0,3/0,5/3 detik (gagal palsu saat mesin ramai), b3-isolasi sudah tidak.

## Temuan polesan dari lab-t2-pencairan (#260, keputusan 500–508)

- 2.26 wajib menulis "Keuangan mengambil file menurut status `dikirim`": file basi dengan nama akhir bisa tersisa sesudah job berhenti setelah rename lalu jurnal dibalik (508); `benar.txt` E belum menyebutnya.
- Periode sebaiknya dihitung dari tanggal Jumat (2026-W44 yang diketik di Jumat W43 diterima); batch kosong tetap jadi `dikirim` dengan file berisi kepala; `-urutan` tak dikenal membuat job rentan diam.
- Rekonsiliasi menurunkan kedua sisi dari `baris_pencairan`, jadi jumlah beku yang salah tidak tertangkap; pembalik dari pembalik tidak dihitung.
- CSV: nama yang diawali "=" tidak di-escape (berisiko saat file dibuka di spreadsheet). Beberapa komentar rekaman > 25 kata. Nomor rekening tujuan belum ada di ERD (505).

## Temuan polesan dari lab-e3-idempotency (#263, keputusan 510–518)

- Lock baris key bisa tertahan lama bila host server membeku sampai TCP keepalive mendeteksinya (ulangan dapat 409): usul `idle_in_transaction_session_timeout` di role app api-t2.
- Komentar `NiatBayar`: sesudah jawaban final (termasuk 422 saldo kurang yang disimpan 24 jam) tap baru harus membuat niat baru; 2.14 menulis aturan ini.
- Klaim 513 tentang key milik akun lain belum punya bukti lab (server selalu memakai Budi). `polaKunci` menolak UUID huruf besar (RFC 9562 membolehkan saat masuk); retry bersamaan atas key `selesai` bisa 409 karena NOWAIT; `.timeout()` Dart tidak membatalkan request; `Retry-After` belum dibaca; keterangan `aturan.txt` untuk 400 ke-4 (key bukan UUID).
- Usul api-t2 (517): pola `denganKunci` di `/transfers` dan `/kiriman`; `CHECK ((status='selesai') = (respons IS NOT NULL))` dan index `kedaluwarsa`; opsional `PRIMARY KEY (akun_id, kunci)`. gitleaks `generic-api-key` menandai `Idempotency-Key: "<UUID>"`: halaman 2.13/2.14 memendekkan key.

## Temuan polesan dari lab-b2-query (#266, keputusan 520–526)

- `n1.txt`: "Index tidak mengubah jumlah query" dan "hasil identik" hanya diukur sebelum index dibuat; dua-tiga kalimat rekaman > 25 kata.
- `data.txt` C "rencana sama di setiap rekaman" juga bergantung pada `random_page_cost`, `work_mem`, `effective_cache_size` server: kunci di `OPSI`. Autovacuum dimatikan sesudah COMMIT muat; `pembalik_cermin_asal` tidak diperiksa sesudah muat (data tanpa jurnal pembalik).
- Rekam risiko kursor (transaksi yang COMMIT belakangan terlewat) sebagai bagian `pagination.txt` sebelum 2.19 ditulis.

## Temuan polesan dari I6-erd (#262, keputusan 460–467)

- `membalik_jurnal_id` terpotong elipsis di node; petunjuk "Pilih tabel…" di bawah diagram; di mode bandingkan Tahap 1 (1366) garis yang memutar membentuk bingkai dan semua panah ke `akun` bertemu satu titik; label kunci 12 px (±10,4 px di zoom 0,87).
- Pemilih tahap tampil walau satu tahap; "foreign key" tanpa `translate="no"`; siklus FK di tahap nanti membuat build gagal; CI tidak menjalankan gestur sentuh sintetis (hanya `touch-action`). `role="application"` pembungkus React Flow tidak bisa diganti lewat prop.

## Temuan polesan dari lab-b4-skema (#264, keputusan 530–537)

- Rilis 1 punya jendela 3 detik (bayar P1 harus antre sebelum M menyerah): mesin sangat ramai bisa gagal palsu (gagal keras). `bayar()` dan `BATCH` menyusun SQL dengan `str.format` dari angka internal.
- Tanpa FOR UPDATE bayar Budi tetap menunggu karena `buka_buku` meng-UPDATE `nomor_karyawan`, jadi rekaman tidak membedakan kedua versi. Lab tidak punya penolak tulisan server v1 seperti REVOKE di api-t2 (hanya tertangkap cek malam). README root baris b4-skema belum menyebut `run-ledger`, 2.21, 2.22.

## Temuan polesan dari lab-c4-ratelimit (#268, keputusan 540–550)

- Map bucket di memori tumbuh tanpa batas karena key-nya email/IP dari penyerang; email belum dinormalisasi. x/crypto v0.58.0 sudah ada (2026-10-09).
- Teks keputusan 546 dan 549 masih menggambarkan penanda proxy konstan dan salt tetap (diganti 550); satu kolom rekaman B tidak rata; deskripsi PR #268 belum diperbarui.

## Temuan polesan dari ERD2 (#265, keputusan 470–473)

- Job CI dengan service PostgreSQL yang membangun ulang ERD dan membandingkan (menutup celah `--cek` yang hanya memeriksa hash sumber; juga catatan ERD1).
- `nomor_karyawan` terpotong "nomor_kar…" di node `akun` (HP dan desktop); teks pindah "arsip v1" belum menjelaskan bahwa itu schema arsip.
- Pagar lock `pastikan_di_schema()` menangkap pelanggaran sesudah SQL jalan; efek di luar transaction (mis. `nextval` sequence lab lain) tidak dibatalkan ROLLBACK. Pagar sebenarnya: role database per lab tanpa hak di schema lain (sekarang semua lab memakai satu role `lab`).

## Temuan dari A11y-diagram (#274, keputusan 680)

- Kategori aksesibilitas, di luar file tugas itu (pengatur memasukkannya ke ANTREAN, mis. bersama ERD-1.12): `ErdTumbuh.tsx` memakai pola keputusan 466, tapi pembungkus `<svg>` tiap garis tetap di pohon aksesibilitas Chromium sebagai `image` tanpa nama (11 dari 12 svg di `/uji/erd/` 1366×657, CDP `Accessibility.getFullAXTree`, 2026-10-24). Usul: cara keputusan 680 (lapisan `.react-flow__edges` aria-hidden) dan pemeriksaan "svg garis terbaca" di `ukur-erd.mjs`.
- React Flow 12.12.0 memasang `role="application"` di pembungkusnya sesudah props, jadi tidak bisa diganti lewat props (DiagramArsitektur dan ErdTumbuh). Efeknya di pembaca layar mode baca (NVDA, JAWS, VoiceOver) [perlu verifikasi]; axe 0. Usul: uji dengan pembaca layar sungguhan sebelum memutuskan.
- `cek_situs.sh` menjalankan `ukur-diagram.mjs` dan `ukur-erd.mjs` tanpa `--axe`; axe-core bukan dependency situs, jadi axe hanya dijalankan manual dengan salinan lokal. Usul: ADR axe-core sebagai devDependency dan `--axe` di gerbang.
## Temuan polesan dari tinjauan RISET-2 (#272, keputusan 601)

- `plan/RISET-TAHAP-2.md`: R2-29 (GitHub Docs) dan R2-34 (OWASP Cheat Sheet) tidak menulis versi atau tanggal ubah halaman, hanya tanggal akses di kepala; judul tautan forum di "Jebakan" belum dicocokkan karena stackoverflow.com dan security.stackexchange.com menolak WebFetch.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Kategori rusak, di luar file PR #274 (pengatur memasukkannya ke ANTREAN bersama temuan svg ErdTumbuh dari keputusan 680): tombol node `ErdTumbuh.tsx` di `/uji/erd/` punya masalah yang sama dengan keputusan 681. Klik di tengah node kena `.react-flow__pane`, tombol `pointer-events: none`, aria-pressed tetap false (Playwright 1366×657, 2026-10-24). Usul: `pointer-events: auto` di `.erd-tumbuh__node` dan uji klik lewat koordinat di `ukur-erd.mjs`.
- `ukur-diagram.mjs` memeriksa atribut bawaan React Flow yang sudah dikenal (roledescription, label "Edge from", describedby, svg garis, application tanpa nama) di DOM, bukan di pohon aksesibilitas Chromium, jadi label Inggris baru di versi React Flow berikutnya bisa lolos. Usul: saat React Flow dinaikkan, tambah pemeriksaan lewat CDP `Accessibility.getFullAXTree` (image tanpa nama, nama atau deskripsi berbahasa Inggris).
- `plan/SETELAH-TAHAP-2.md`: bagian "Temuan dari A11y-diagram" tidak dipisah baris kosong dari judul "Temuan polesan dari tinjauan RISET-2" sesudahnya (hasil gabung main di PR #274).
- `situs_ukur`: saat cache apt miss, job matriks yang kuncinya sama sama-sama mencoba menyimpan; satu berhasil, yang lain mencetak peringatan "Unable to reserve cache ... another job may be creating this cache" (run 40005551753). Tidak menggagalkan job. Usul bila mengganggu: simpan dengan `actions/cache/save` hanya dari `strategy.job-index == 0`.
- `situs_ukur`: langkah restore `actions/cache@v6` tidak punya batas sendiri; README v6 menulis `SEGMENT_DOWNLOAD_TIMEOUT_MINS` default 10 menit, jadi unduhan cache yang macet bisa mendorong job melewati 18 menit dan berakhir cancelled. Usul: `env: SEGMENT_DOWNLOAD_TIMEOUT_MINS: 2` di langkah itu (restore yang dibatalkan menjadi cache miss).
- `situs_ukur`: cache lain di job yang sama (binary bun dari `oven-sh/setup-bun@v2`, log "Cache hit for: bun-…") belum diperiksa apakah isinya diverifikasi sebelum dijalankan [perlu verifikasi]; kelas risikonya sama dengan keputusan 684 (dokumentasi GitHub: isi cache tidak ditandatangani).
- `urutanBaca` di `situs/tools/registri.mjs` melewati halaman `diganti_oleh` yang penggantinya sudah ada, supaya Berikutnya halaman terakhir Tahap 2 tidak menuju "Tahap 2 · Ceritanya" versi lama (sejak keputusan 605 T2 ada di akhir Tahap 2; keputusan 603, jalur teknis).
- Data `tahap[1]` registry masih versi lama (nama "Saldo salah dan dobel bayar", rekap "tiga kompleks", "menarik saldo dari HP dan tablet") dan tampil di sidebar, Kamu di sini, dan peta beranda; selaraskan ke naskah Tahap 2 sesudah pemilik meninjau kalkulator 1.37/1.38 (keputusan 603).
- Ilustrasi latar kampus untuk blok Latar masalah 2.1, setara ilustrasi `prd` di 1.1 (keputusan 602, jalur teknis).
- G-istilah: halaman istilah untuk debit, kredit, jurnal, tutup buku, dan ERP yang muncul pertama di 2.1 tanpa penjelasan (Definisi selesai mode penuh; G-istilah belum ada saat 2.1 di-merge, keputusan 602).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Halaman istilah belum diperiksa alat ukur khusus: `layar.mjs` mendaftarnya sebagai "tanpa Inti" (halaman rujukan tanpa blok Inti) dan `ukur-luapan.mjs` memeriksa luapan 360/375 seperti halaman lain; belum ada pemeriksa bahwa kalimat pertama terlihat di layar pertama 375×667.
- Sidebar tidak menandai Glosarium sebagai halaman aktif di rute `/istilah/`; jalur "Kamu di sini" yang menunjukkan tempatnya.
- 116 istilah lama dan istilah PROPOSAL yang belum ada (DTO, dependency injection, PL/pgSQL, Kubernetes, bottleneck, service mesh, event bus, authorization code, Read Committed) belum punya halaman; target PROPOSAL ±130.
- Definisi lama *Idempotency key* di Glosarium 30 kata (> 25), dan halaman istilah memakainya apa adanya sebagai kalimat pertama supaya tooltip Tahap 1 tidak berubah.
- Naskah bagian 3 menyebut posting "debit dan kredit" tanpa konvensi tanda (keputusan 691); halaman 2.7 perlu memilih satu konvensi atau menulis bahwa Rekeningo hanya memakai jumlah bertanda.
- Popover istilah ber-`role="tooltip"` padahal berisi tautan yang kini bisa difokus (keputusan 702); pola WAI-ARIA yang cocok adalah disclosure atau dialog non-modal. Mengubahnya menyentuh semua halaman bertooltip.
- Sumber halaman istilah: `riset` R2-18 (Stripe) dipasang di sumber rekaman lab `key-per-niat.txt` *idempotency key*; rekaman lab tidak perlu ID riset atau sebaiknya memakai ID baris lab e3.
- Skema halaman istilah memakai `z.url()` untuk `url` dan `dokumentasi`, yang menerima skema apa pun; batasi ke `https:` supaya data dari PR berikutnya tidak bisa memasang `javascript:`.
- Widget pilah 2.2 masih widget lama (`WidgetLama`, data `situs/lama/widgets/data/t2-fitur-pilah.json` tanpa Zod); saat pilah dipindah ke React, data 1.2 dan 2.2 ikut divalidasi (keputusan 606, jalur teknis).
- 2.2 blok "Keputusan sebelum kode" menulis "Model ini tidak menjawab dua pertanyaan terbuka PRD v2" tapi hanya menyebut satu (race, M9); pertanyaan kedua (app mengulang request, M10 `t2-m10`) belum disebut (tinjauan PR #279).
- Chip sumber Rantai jenis ilustrasi di halaman lain tidak menyebut kata "Ilustrasi" (mis. `t2-prd-sebelum-sesudah.json`, `t1-prd-sebelum-sesudah.json`, `cerita-tokoh.json`, `t1-rekap-kejadian.json` di `situs/data/diagram/`), jadi jenisnya hanya terbaca dari warna; usul `Rantai.astro` menambah kata jenis dari `sumber.jenis` (jalur teknis, keputusan 608).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- `tabel-gulir`: skrip inline (425 B gzip) ikut di semua 92 halaman berartikel, termasuk yang tanpa tabel; usul: plugin menandai halaman bertabel (mis. atribut di `<article>`) supaya skrip hanya ada bila perlu.
- `tabel-gulir`: tabel yang dibuat JavaScript (peta cerita `/cerita/peta/`, `jt-tabel` di island, `progres__banding` di cara pakai) tidak dibungkus; sekarang lolos karena berisi tautan atau tidak meluap. Usul: komponen wadah yang sama untuk widget yang membuat tabel, sebelum ada tabel widget yang meluap tanpa tautan.
- `ukur-axe`: dengan `scrollable-region-focusable` 0, `--semua --awalan /tahap-1/ --awalan /tahap-2/` di gerbang (usul G-axe) tidak lagi terhalang tugas ini; sisa pelanggaran seluruh `dist/` hanya `definition-list` di `/b-fondasi/` (A11y-race-dl).
- Alat keyboard umum: Tab mencapai setiap wadah yang meluap, `:focus-visible` dan garis ≥ 3:1, panah menggulir (pemeriksaan sekali pakai keputusan 714) belum jadi alat gerbang; axe tidak punya rule untuk fokus terlihat (RISET-SKILL 13).
- `tabel-gulir` (tinjauan #286): mutasi `PEMILIH` salah di `src/lib/tabel-gulir.ts` membuat skrip tidak menemukan wadah, jadi semua wadah tetap tab stop (1366: 3 dari 3 di 1.11, tidak ada yang meluap), tetapi `ukur-axe` dan `bun run test` tetap lolos. Usul: `ukur-luapan.mjs` (sudah membuka semua blok di 92 halaman × 2 ukuran) memeriksa `.tabel-gulir[tabindex]` hanya ada bila wadah meluap dan setiap wadah yang meluap punya `tabindex`, `role`, dan nama, dengan fixture uji diri.
- `tabel-gulir` (tinjauan #286): nama wadah memisahkan judul kolom dengan koma, padahal judul kolom bisa berkoma (1.40: "B. Siapkan antarmuka, belum dipasang"), dan nama terpanjang 114 karakter; tanpa JavaScript wadah yang muat ikut bernama "gulir ke samping". Usul: pemisah titik koma atau garis miring antar judul, atau dua judul pertama saja; uji dengar dengan pembaca layar nyata sebelum diubah.
- `ukur-axe`: daftar halaman gerbang `axe` di `tools/cek_situs.sh` diperluas ke seluruh `/tahap-1/` dan `/tahap-2/` (`--semua --awalan ...`, lokal ±28 s) sesudah `A11y-gulir-tabel` selesai, supaya halaman baru Tahap 2 ikut terjaga tanpa menambah daftar tangan.
- `ukur-axe`: incomplete `color-contrast` (1.466 node di 176 run Tahap 1 + beranda + 2.1, keputusan 695; `kbd` pintasan cari, label zona diagram, panah Rantai, `.il-teks-aksen`) belum dilihat satu per satu; usul: `--rinci` sekali per evaluasi dan catat yang memang di bawah 4,5:1 sebagai tugas kontras.
- `ukur-axe`: iframe tidak diperiksa (axe hanya disuntik ke frame utama, keputusan 692); bila halaman memuat iframe kelak, alat harus gagal atau menyuntik ke setiap frame.
- `lib/axe.mjs`: `ukur-diagram`, `ukur-erd`, `ukur-gerak`, `audit-tampilan` masih menulis daftar tag WCAG sendiri di 6 panggilan `axe.run`; usul: pakai `TAG_WCAG` dari helper supaya tag yang diminta tidak bisa berbeda antar alat (keputusan 693).
- Widget runsql 2.5 `t2-pencairan` masih widget lama (`WidgetLama`, data JSON tanpa Zod), sama dengan 2.4; ikut dipindah ke React bersama runsql lain (keputusan 620, jalur teknis).
- Lab `t2-pencairan` belum punya rekaman satu jalan normal tanpa titik henti; usul bagian "jalan normal" di `run.py` saat Docker bisa dipakai, lalu 2.5 merujuknya (keputusan 621).
- Layar pencairan di app warung belum ada di lab mana pun; 2.5 menulisnya di catatan PetaFitur (keputusan 620).
- Istilah 2.5 tanpa halaman istilah: kas pencairan, rekonsiliasi, timer systemd, cron (hanya "Job terjadwal" yang dibuat di PR ini, keputusan 620).
- 2.4 `fitur-tutup-buku.mdx` paragraf Coba tidak menyebut SQLite untuk widget runsql `t2-tutup-buku`; tambah "dengan SQLite" seperti 2.5 dan halaman Tahap 1 (keputusan 671).
- 2.5 tidak menyebut kolom app naskah bagian 2 ("Notifikasi sederhana di app warung") di prosa; hanya catatan PetaFitur menulis app warung belum punya layar pencairan di lab, padahal 2.2 sudah menyebut notifikasi pencairan di dalam app warung (keputusan 671).
- PetaFitur 2.5 langkah 6 menulis "Tutup buku: file dicocokkan dengan ledger", padahal di `benar.txt` perbandingan itu dijalankan penggerak lab langsung sesudah file dibuat; usul judul langkah "File dicocokkan dengan ledger" dan tutup buku di rinci (keputusan 671).
- Halaman istilah Job terjadwal, stack Go berlabel Rekaman lab tetapi kalimat timer systemd tidak dijalankan; usul pisah kalimat atau tulis "timer systemd tidak dijalankan" (keputusan 671).
- Widget runsql 2.6 memakai SQLite (sql.js); batas saldo warung di panel After ditulis sebagai trigger, padahal di lab `buku.batas_saldo` dibaca app dan belum dijaga database. Saat PGlite dipasang, pindahkan `t2-saldo-bukan-kolom` ke skema `labs/b3-ledger/schema.sql` dengan deferred constraint trigger, supaya panel After bisa menunjukkan jurnal setengah jadi ditolak saat `COMMIT` (keputusan 624, jalur teknis).
- Halaman istilah *buku* (ledger) dan *saldo_cache* masih belum ada; buat di PR 2.7 atau 2.9 bersama skemanya (keputusan 625).
- Ukur lama query tutup buku dengan posting setahun (data `b2-query`, 760.448 posting) di lab `api-t2` atau `b2-query`, supaya metrik PRD "< 1 hari" punya rekaman; 2.4 sekarang menulis "belum diukur" (keputusan 618).
- Menutup periode tutup buku: tunggu transaction yang masih terbuka atau tabel penutupan periode, dengan rekaman; usulkan halaman atau baris naskah ke pemilik (rekaman `labs/api-t2/output/tutup-buku.txt` C, keputusan 618).
- Widget runsql 2.4 memakai SQLite (sql.js), bukan PostgreSQL; saat PGlite dipasang, pindahkan `t2-tutup-buku` supaya `FILTER` dan `timestamptz` sama dengan lab (keputusan 616, jalur teknis).
- G-istilah: istilah baru di 2.4 tanpa halaman istilah di PR ini (G-istilah PR #281 di-merge selama tinjauan; `jurnal` dan `tutup buku` sudah punya halaman): posting, buku (ledger), mutasi, saldo awal, saldo akhir, `saldo_cache`, agregat `FILTER` perlu halaman `situs/data/halaman-istilah/` (keputusan 615).
- 2.4 tab Node.js dan Django: `sum` atas `bigint` menghasilkan `numeric`, yang dibaca `pg` sebagai string dan psycopg sebagai `Decimal`; tulis satu kalimat supaya JSON laporan tidak tiba-tiba berisi string angka (cek ke dokumentasi pg-types dan psycopg dulu; tinjauan PR #282).
- Lab api-t2 `TutupBuku` (dugaan, belum dibuktikan): query per buku dan query seluruh jurnal adalah dua statement READ COMMITTED terpisah, jadi jurnal yang COMMIT di antara keduanya membuat ringkasan sistem dan baris buku berbeda; jalankan keduanya dalam satu transaction `REPEATABLE READ READ ONLY` dan rekam (tinjauan PR #282).
- 2.4 tab Supabase: kalimat menyebut hak `EXECUTE` diberikan lagi ke role Keuangan, tapi snippet hanya memuat `REVOKE`; tambahkan baris `GRANT EXECUTE ... TO <role>` (tinjauan PR #282).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- W2-race: ringkasan rekaman (`summary` di `ledger-<cara>.json`) menyebut "A" dan "B", widget menyebut HP Budi dan Tablet Budi (lencana A/B di lajur menghubungkan keduanya); usul `run_ledger.py` menulis "HP" dan "tablet" saat lab dijalankan lagi.
- W2-race: baris MENUNGGU lock menampilkan catatan "menunggu lock (transactionid)" di bawah "→ MENUNGGU lock", mengulang di HP; bisa disembunyikan untuk baris itu.
- W2-race: enam tombol cara memakan lima baris di 375 px; di 2.11 cukup lima cara (tanpa "COMMIT bergantian") bila halaman tidak membahasnya.
- W2-race: dd di daftar fakta hasil dan `.bb-vars` menjorok ±16 px dari gaya dd Starlight di HP; disamakan dengan dt bila mengganggu.
- Widget race lama: tab "Cara mengamankan penarikan" memakai role tab tanpa tabpanel dan tanpa panah antar-tab (axe tidak menandainya); halaman versi lama dibiarkan.
- W2-race (peninjau): `siapkan()` mencocokkan saldo, menunggu, dan retry dengan `banding.txt`, tetapi kode SQLSTATE di kolom B ("40001 saat COMMIT", "ERROR 23514 saat COMMIT") hanya dicocokkan Vitest yang menulis angkanya sendiri; usul `siapkan()` juga mencocokkan kode di kolom A/B dengan `errorDatabase()`.
- W2-race (peninjau): istilah di label (COMMIT, lock, row lock, client, Retry) belum diberi `translate="no"`; di 1366 px kartu HP dan tablet tidak sejajar atas saat chip status tablet turun ke baris kedua.
- api-t2 `http.ListenAndServe` tanpa timeout (gosec G114, sudah ada sebelum lab-api-t2a); c4 memakai `http.Server` dengan `ReadHeaderTimeout` dan kawan-kawannya.
- Batas jumlah penerima berbeda per hari di database sebagai pengaman enumerasi yang lebih tepat dari rate limit, bila PRD berikutnya menyetujuinya (keputusan 645, 646).
- Mode rentan `-rentan m16` di api-t2 (cek penerima membedakan nomor, tanpa rate limit) bila halaman 2.27 butuh rekaman "sebelum" dari api-t2; sekarang "sebelum" hanya ada di c4.
- api-t2 pindah ke argon2id dengan rehash saat login berhasil (ADR 20), menghapus batas 72 byte bcrypt (keputusan 648).
- Waktu respons `/kiriman` untuk nomor terdaftar dan tidak terdaftar belum diukur (keputusan 646).
- Layar app untuk 403 `wajib-ganti-password` dan 429 belum ada di lab mana pun; app 1.0 dan 1.1 tidak punya layar ganti password (keputusan 648).
- `labs/c4-ratelimit/login` membaca kunci tanpa lock dan memasangnya sesudah argon2id, dan key per IP memakai alamat IPv6 penuh: dua celah yang ditutup di api-t2 oleh keputusan 718 dan 719.
- `/ganti-password` api-t2 belum memeriksa daftar password bocor (ASVS 5.0.0 6.2.4 L1: minimal 3.000 password teratas yang sesuai kebijakan panjang); c4 sudah memeriksanya lewat daftar `go:embed`.
- Keputusan 646 menulis aturan pengirim diperiksa "di transaction yang sama"; nominal diperiksa sebelum transaction dibuka (urutannya tetap sebelum nomor penerima).
- Halaman istilah *Event sourcing* `stack: null`; isi enam baris "Tidak dijalankan" bila ada dokumentasi resmi per stack, atau biarkan (keputusan 631).
- Situs belum punya status ADR (diterima, digantikan); 1.24 hanya menautkan 2.8. Usul jalur teknis: field registry `adr_digantikan` yang menampilkan "ADR 6 versi Tahap 1, digantikan 2.8" di kicker 1.24 (keputusan 629).
- Widget runsql 2.8 memeriksa cermin pembalik per baris di SQLite; di lab PostgreSQL pemeriksaannya constraint trigger saat COMMIT dan jurnal seimbang ikut diperiksa. Saat PGlite dipasang, pindahkan `t2-adr-ledger` ke skema `labs/b3-ledger/schema.sql` (keputusan 630).
- 2.8 "Kapan salah" baris data pribadi: `jurnal.keterangan` berisi teks bebas dengan nama ("Patungan makan siang ke Citra"), dan jurnal tidak bisa dihapus. Naskah belum menjadwalkan cara menghapus data pribadi; usul Tahap 4 (verifikasi identitas) menaruh data pribadi di luar jurnal (keputusan 629).
- 2.8 "Kapan salah" baris data pribadi: kolom Rencana bisa menyebut dua pola dari Microsoft Learn Event Sourcing bagian "Personal data and regulatory compliance" (R2-66): data pribadi di luar store yang hanya ditambah dan dirujuk dengan ID, atau crypto-shredding dengan key per orang (keputusan 677).
- Halaman istilah `saldo_cache` belum ada; buat di 2.9 bersama skemanya, atau putuskan cukup istilah Cache (keputusan 628).
- Lama pemeriksaan invarian 3 (`sum` semua posting buku karyawan di setiap posting keluar) belum diukur; data `labs/b2-query` (±44 ribu posting) bisa dipakai untuk mengukurnya sebelum 2.17 (keputusan 626).
- Penolakan invarian saat COMMIT belum direkam lewat HTTP di api-t2; `petaError` menjadikannya 500. Rekam di b3-race untuk 2.10, atau petakan 23514 `saldo_karyawan_tidak_negatif` ke 422 sesudah ADR 13 (keputusan 626).
- Halaman istilah *invarian*, sumber terakhir (R2-63) berjudul "SQLSTATE dan nama constraint di lima stack" tapi url-nya halaman Serverpod saja; pecah per stack atau tanpa url (keputusan 676).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Tutup buku api-t2 (`labs/api-t2/internal/repo/tutupbuku.go`) menjalankan query per buku dan query ringkasan jurnal lewat pool tanpa transaction, jadi ringkasan bisa membaca jurnal yang COMMIT di antaranya; bungkus keduanya dalam satu transaction `REPEATABLE READ READ ONLY` dan rekam (R2-94, keputusan 641).
- Halaman lama `b-fondasi/b3-3-isolation-level.mdx` (`B3.3`, `lebur_ke`) masih tampil di indeks topik, sidebar, dan Kartu ulang (tiga kartu lama); hapus dengan persetujuan pemilik seperti pola Tahap 1, lalu arahkan prasyarat D3 ke 2.12 (keputusan 642).
- R2-36 menulis `attempts` Laravel "hanya untuk deadlock"; kode sumber 13.x juga mengulang SQLSTATE 40001 (R2-93). Halaman istilah yang memakai R2-36 (*jurnal*, *idempotency key*) perlu dicek ulang (keputusan 643).
- Lock baris di `transfer-cache.txt` menahan saldo negatif bersama invarian 3: di Read Committed B hanya menunggu A, lalu COMMIT B ditolak trigger 23514. Tanpa trigger, UPDATE B di atas versi baris A kemungkinan membuat saldo_cache −Rp20.000 (disimpulkan dari rumus UPDATE, tidak direkam); kalimat "Lock baris yang menahan saldo negatif" di Paham belum menyebut trigger, dan lab tanpa trigger belum direkam (peninjau PR 298).
- Halaman istilah *Snapshot*: "Satu kalimat" memuat dua arti (keputusan 782), tapi "Dalam bahasa sehari-hari" dan mekanismenya hanya arti MVCC; tambah satu kalimat untuk saldo akhir periode yang disimpan (peninjau PR 298).
- 2.10: ilustrasi `m9` tanpa teks, jadi `ukur-ilustrasi.mjs` tidak perlu mengukurnya; bila kelak diberi label teks, tambahkan `/tahap-2/m9-saldo-minus/` ke daftar halaman alat itu (keputusan 635).
- 2.10/2.11: status HTTP yang diterima app saat COMMIT ditolak 23514 belum direkam lab mana pun; bila 2.11 ingin menulisnya (mis. 500), rekam dulu di api-t2 mode tanpa lock (keputusan 635).
- 2.10: frekuensi −Rp20.000 tanpa alat lab hanya "muncul" di `batas.txt` 2b; rekaman berbilang (mis. N dari 1.000 percobaan per mesin) akan membuat paragraf "Kedua COMMIT hampir bersamaan" lebih kuat (keputusan 635).
- 2.10/2.11: widget RaceLedger cara `tanpa-lock` menulis "Saldo akhir −Rp20.000" dan ringkasan tanpa menyebut `SET CONSTRAINTS`; ringkasan di `labs/b3-race/run_ledger.py` bisa ditambah "(alat lab SET CONSTRAINTS; tanpa alat lab lihat batas.txt 2b)" lalu lab diulang (keputusan 785).
- Halaman Tahap 1 (1.11, 1.23, 1.37, 1.38, 1.40) dan halaman versi lama (B3.3, B9, D3, E2) masih merujuk `[[B3.2]]` versi lama; sesudah pembekuan dibuka, ganti ke `[[t2-race-lock]]` (keputusan 639).
- Halaman istilah *Deadlock* dan *Lost update* belum ada; keduanya dipakai 2.11 dan barisnya kini menunjuk 2.11 (keputusan 639).
- Halaman istilah *Optimistic lock* `stack: null`; isi enam baris bila ada dokumentasi resmi atau rekaman lab per stack (keputusan 639).
- `situs/tools/ukur-race.mjs` hanya memeriksa `/uji/race/`; tambahkan `--path` supaya widget di 2.10 dan 2.11 ikut diukur (keputusan 638).
- Deadlock dua arah (Budi ke Citra dan Citra ke Budi bersamaan) belum direkam; usul bagian baru lab b3-race: dua UPDATE tanpa urutan (40P01) lawan `ORDER BY id FOR UPDATE` (keputusan 638).
- Lama tunggu lock di buku warung saat puncak belum diukur; "kapan ADR 13 salah" butuh angka itu sebelum Tahap 3 (keputusan 638).
- Lab b3-stack masih skema Tahap 1 (`akun.saldo`); tab Di stack lain 2.11 menyebutnya. Versi ledger lima stack bisa menggantikannya (keputusan 640).
- Top-up CSV api-t2 mengunci buku karyawan menurut urutan baris CSV; urutkan posting per `buku.id` atau panggil `KunciBukuID` untuk semua buku tujuan di awal transaction, lalu rekam top-up CSV bersamaan dengan transfer dua arah (keputusan 780).
- Status 500 untuk 23514 di 2.11 berasal dari kode `petaError`; rekam satu transfer api-t2 yang ditolak invarian saat COMMIT lewat HTTP (keputusan 780).
- 2.11 merujuk isolation level ke halaman versi lama [[B3.3]]; ganti ke 2.12 sesudah halaman itu ditulis (keputusan 679).
- Snippet `lines` di halaman tidak bergeser saat rekaman lab berubah; pertimbangkan pemeriksa gerbang yang mencocokkan isi potongan dengan teks yang dikutip, atau penanda region di rekaman (keputusan 679).
- `urutanBaca` memasukkan halaman `lebur_ke` ke urutan baca; 2.11 memindah B3.2 ke akhir Tahap 2 sebagai jalan pintas. Halaman yang dilebur berikutnya (mis. B3.3 ke 2.12) butuh pola yang sama atau `urutanBaca` yang melewatinya (keputusan 781).
- Halaman versi lama B3.2 (dan T2) tidak punya penunjuk ke halaman barunya di isi halaman; pembaca dari tautan Tahap 1 "Race condition (versi lama)" hanya melihat "(versi lama)" di breadcrumb dan catatan sidebar. Usul satu baris "Versi baru: [[t2-race-lock]]" di kepala halaman `lebur_ke`/`diganti_oleh` (keputusan 781).
- ErdTumbuh: prop bandingkan awal dengan pesanan tinggi untuk dua panel (bertumpuk di HP, berdampingan dengan zoom di desktop), supaya halaman skema tiap tahap terbuka langsung berdampingan seperti naskah 3b, tanpa geser saat hydrate (keputusan 632).
- Tab Serverpod 2.9: jalankan `serverpod generate` dan `create-migration` sekali untuk memastikan `id` boleh di daftar field index dan bahwa CHECK yang ditulis tangan di `migration.sql` tidak ikut ke `definition.sql` database baru (keputusan 634).
- 2.9 Tebak `t2-skema-tebak`: jawabannya (topup, transaksi, koreksi dan tujuan isinya) sudah tertulis di Inti dan catatan Rantai tepat di atasnya, jadi tebakan berfungsi sebagai pengingat, bukan tebakan sungguhan. Usul: Inti menyebut "tiga tabel catatan uang" tanpa nama, atau pertanyaan Tebak diganti yang belum dijawab Inti (mis. ke mana batas saldo warung pindah).
- 2.9 "Tiga angka": rumus memakai MB = juta byte, lab memakai `pg_size_pretty` (MiB). Usul: tulis ±99 MB lab juga sebagai ±104 juta byte supaya ketiga angka satu satuan.
- Halaman istilah Saldo cache: sumber pertama memakai riset R2-09 untuk `migrasi.txt` bagian E, padahal baris R2-09 hanya menyebut `b3-ledger` `kejadian.txt` dan `b2-query` `data.txt` E. Usul: tambah `migrasi.txt` E ke R2-09 atau rujuk R2-73.
- Halaman istilah *Rate limit* belum ada; enam baris stack (bucket per akun dan per IP) diriset saat 2.27/2.28 ditulis (keputusan 658).
- Dua kiriman berlawanan arah bersamaan (Budi ke Citra, Citra ke Budi) belum direkam di api-t2; tambah bagian rekaman bila 2.11 ingin membuktikan urutan lock, bukan hanya mengutip dokumentasi (keputusan 657).
- Layar konfirmasi kiriman tidak bisa menampilkan nama penerima karena tidak ada endpoint cek nama (keputusan 646); bila salah kirim jadi keluhan di cerita, nama disamarkan dipertimbangkan lagi (2.3 tabel "Pertanyaan yang belum dijawab").
- 2.3 menampilkan `KunciBukuAkun` tanpa menyebut bahwa kunci baru dipasang sesudah M9 (2.11: ADR 13 diterima minggu 1 sesudah M9); saat 2.10 ditulis, tambahkan satu kalimat urutan waktu di 2.3 seperti 1.9 untuk transaction dan M4, dan pastikan 2.10 menyebut kode minggu 1 belum mengunci (keputusan 787).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- `KunciAlamat` api-t2 (`net.ParseIP`) membiarkan alamat bertzone (`fe80::1%eth0`) apa adanya, sedangkan `kunciAlamat` c4 (`net/netip`) membuang zone dan memotong ke /64; selaraskan bila api-t2 diubah lagi (keputusan 660).
- `/ganti-password` api-t2 belum memeriksa daftar password bocor (ASVS 5.0.0 6.2.4); c4 sudah, dengan tes dan bagian I rekaman. Usul: tugas api-t2 yang memakai pola c4 (daftar fiktif `go:embed`, dibandingkan sesudah kebijakan panjang) (keputusan 661).
- Login c4 kini menulis baris akun dua kali per login benar (naik, lalu reset) dan percobaan ke-5 memasang kunci sebelum argon2id selesai, jadi login sah kedua dari perangkat lain pada jendela itu dijawab 401 generik; latensi, antrean lock di satu akun, dan selisih waktu respons antara email terdaftar (ada transaction tambahan) dan tidak terdaftar (ASVS 5.0.0 6.3.8) belum diukur [tidak diukur] (keputusan 659).
- Tes `TestGantiPasswordMenolakDaftarBocor` mengganti password akun 523 di kasus terakhir dan seed berjalan sekali per proses, jadi `go test -count=2` gagal di putaran kedua (401, bukan 422); usul: pulihkan hash akun itu di awal tes (tinjauan #304).
- `kunciAlamat` c4 memakai teks yang bukan alamat apa adanya (`[2001:db8::1]`, `192.0.2.7:443`, alamat berspasi): bila proxy tepercaya kelak meneruskan `X-Forwarded-For` berbentuk daftar atau berport, key per IP terpecah menjadi banyak bucket (gagal terbuka). Produksi perlu mengurai header itu dari proxy dan menolak ke alamat koneksi bila bukan alamat (tinjauan #304, keputusan 660).
- Judul bagian I rekaman c4 memakai "daftar bocor fiktif" untuk daftar yang berisi password umum sungguhan; ganti "daftar kecil buatan lab" saat rekaman berikutnya diulang (keputusan 799).
- Pola key belum dipasang di `labs/api-t2` (`POST /transfers`, `POST /kiriman`); pakai `denganKunci` dari `labs/e3-idempotency/server/ledger/main.go`, tambah `CHECK ((status = 'selesai') = (respons IS NOT NULL))` dan index `kedaluwarsa` (keputusan 517, 654).
- Mode peralihan ADR 14 (Bayar tanpa key diterima, dengan key diperiksa, header bukan UUID 400) belum ada di lab e3; tambah mode `-key-opsional` dan rekaman, plus hitungan Bayar tanpa key per hari yang dipakai aturan 5 (keputusan 654).
- Belum direkam: 422 saldo kurang yang disimpan 24 jam lalu tap baru dengan key baru, dua niat dengan key bertabrakan (respons Bayar pertama dikirim untuk Bayar kedua), empat percobaan gagal berturut-turut ("status belum pasti"), dan pembacaan `Retry-After` untuk 429 dan 503 (keputusan 654).
- Jitter app lab hanya tambahan 0–99 ms dan tidak diukur; simulasi pembanding tanpa jitter, jitter tambahan kecil, dan Full Jitter di lab belum ada. Angka 243 kali di 2.14 berasal dari Builders' Library, bukan rekaman.
- Halaman versi lama E3 dan B3.2 tidak punya penunjuk ke halaman barunya di isi halaman; pembaca dari tautan Tahap 1 hanya melihat "(versi lama)" di breadcrumb (keputusan 653).
- Widget alur punya satu varian: 409 (`diproses.txt`), server mati (`mati-di-tengah.txt`), dan 422 (`aturan.txt`) hanya Snippet di Paham; varian kedua atau mode tab bisa menampilkannya.
- Job pembersih key harus idempoten dan tidak menghapus key sebelum 24 jam; antrean offline ([[E2]]) lebih dari 24 jam membuka celah dobel (keputusan 654).
- Naskah ADR 14 tidak menyebut app 1.0 dan 1.1 tanpa key; usul satu kalimat di bagian 4: Bayar tanpa key diterima selama masa peralihan (keputusan 654).
- CLS mode font telat (`ukur-cls.mjs`, Verdana lalu Satoshi) peka pada jumlah baris teks di layar pertama 1440×900: tiap paragraf yang membungkus ulang menambah skor karena potongan teksnya berpindah jauh ke samping. Paragraf Inti baru ke dua kalimat di bawah Rantai; pertimbangkan pemeriksa di `tools/audit_bahasa.py` yang memperingatkan Inti lebih dari ±350 karakter sesudah Rantai (keputusan 653).
- Aturan 5 ADR 14: satu HP lama yang tidak pernah diperbarui menahan hitungan Bayar tanpa key di atas nol selamanya, jadi masa peralihan tidak pernah berakhir; tulis tanggal akhir atau kriteria lain di ADR 10 sesudah versi minimum app ada (keputusan 793).
- Sitasi "naskah bagian 3b" di kebutuhan ADR 14 mencakup puncak ±1,4 request per detik, tetapi angka itu ada di baris M17 naskah bagian 4; ±900 transaksi per hari dari rumus 3b (1.000 × 30% × 3). Perbaiki sitasinya saat 2.14 dibuka lagi (keputusan 792).
- Paham 2.14 memakai tiga kalimat bertokoh ("Raka mengira ... interceptor") di blok konsep; gaya-bahasa mode konsep membatasi tokoh pada satu kalimat penghubung. Pindahkan ke adegan M10 atau ringkas jadi satu kalimat.
- Header `aturan.txt` menyebut draft -07 bagian 2.7, halaman memakai -08. Appendix A -08 hanya memperbarui rujukan dan teks retry, status 400, 409, dan 422 tidak berubah; selaraskan komentar lab saat e3 diulang.
- Kartu ulang Tahap 1 (1.40 dan satu kartu e-mobile) memuat "(Retry dan idempotency key (versi lama))" dengan kurung ganda, dan tautan [[E3]] di tiga halaman Tahap 1 (1.15, 1.16, 1.40) mengarah ke versi lama; arahkan ke [[t2-idempotency]] sesudah pembekuan Tahap 1 dicabut (keputusan 369, 653).
- Opsi A di ADR 14 memakai `tanpa-key.txt` sebagai bukti, padahal rekaman itu retry otomatis, sedangkan A melarang retry otomatis. Server yang sama menerima tap manual dan retry otomatis sebagai request identik, tetapi rekaman tap manual setelah app menyerah belum ada; tambah satu varian di e3 bila A perlu dibantah dengan rekaman sendiri.
- 2.13: lab e3 versi ledger mencetak `COMMIT` hanya untuk request #1 (bersama titik henti); request #2 langsung `→ 201`. Usul: jejak server mencetak `COMMIT` di setiap request supaya widget alur bisa mengutip baris yang sama untuk kedua jurnal (sekarang langkah 7 menulis `→ COMMIT` tanpa label server).
- 2.13: saldo awal Warung Ani di lab e3 Rp0 (schema bersih), jadi HP Warung Ani di widget mulai dari Rp0. Usul: data lab memberi warung saldo awal yang masuk akal, atau widget menulis "saldo di lab" di label.
- 2.13: mockup HP widget alur menampilkan jam bawaan 12.05 karena naskah M10 tidak menyebut jam. Usul: komponen `hp` bisa menyembunyikan jam bila `waktu` kosong.
- 2.13: kalimat "tanpa retry pembayaran Budi tidak pernah tercatat" (mati-di-tengah.txt) adalah turunan: rekaman itu sendiri memakai retry dengan key. Usul: lab e3 merekam skenario server mati tanpa retry (app berhenti di percobaan 1) bila halaman ingin mengutip baris langsung.
- Usulan perubahan cerita (M11): angka naskah "4 detik" tidak bisa diturunkan dari lab bahkan dengan pertumbuhan linear: riwayat Budi di minggu 3 ≈ 3.892 ÷ 52 × 3 ≈ 225 posting, jadi N+1 ≈ 226 query × ±0,5 ms ≈ 0,1 detik (R2-116). Halaman pertama riwayat juga 20 baris per halaman (M12 memakai pagination offset), jadi 4 detik hanya masuk akal bila app memuat seluruh riwayat sekaligus. Usul: naskah menyebut mekanismenya (21 query untuk 20 baris, index per buku dan waktu tidak ada), atau memakai angka dari lab dengan data setahun (minggu 52 bukan minggu 3).
- 2.15: `labs/b2-query` tidak merekam rencana query untuk query nama lawan satu baris (query ke-2 sampai ke-21 di N+1); halaman hanya bisa bilang ada tiga index di `posting`, bukan bahwa query itu memakai `posting_jurnal`. Rekam `EXPLAIN` satu query itu bila 2.16 butuh membuktikan bahwa tiap query kecil cepat.
- 2.15/2.16: 2.15 sengaja tidak membuka bagian B `n1.txt` (satu query, ADR 15) dan kolom "dengan index riwayat" bagian E; 2.16 dan 2.17 yang membukanya. Widget `QueryRiwayat` hanya memuat cara N+1 tanpa index; kalau 2.16 ingin membandingkan dengan satu query, tambah mode di widget yang sama (logika.ts sudah mengurai bagian D dan E).
- 2.15: ilustrasi `m11` tanpa teks, jadi `ukur-ilustrasi.mjs` tidak perlu mengukurnya (pola 2.10, keputusan 635); bila kelak diberi label teks, tambahkan `/tahap-2/m11-riwayat-lambat/` ke daftar halaman alat itu.
- 2.15: tombol widget tebak memakai margin-bawah 20 px dari Starlight di Tebak lama (`li > button`); `QueryRiwayat` menolaknya hanya di dalam `.qr`. Tebak di 2.9, 1.42, dan beranda kemungkinan memakai jarak antar-pilihan 27 px (belum diukur); bila ingin sama dengan 7 px, ubah `.tb-pilihan` dan ukur ulang layar pertama beranda.
- 2.15: widget `QueryRiwayat` menaruh jawaban benar selalu di pilihan C (21 query), dan alasan pilihan A ("Satu query hanya cukup bila nama lawan ikut diambil di dalamnya") menyebut bentuk perbaikan ADR 15 sebelum 2.16 dan 2.17; acak urutan pilihan dan tulis alasan A tanpa petunjuk perbaikan.
- 2.15: kalimat "mencatat semua statement yang diterima database" lebih luas dari dokumentasi PostgreSQL 17 (R2-115: galat sintaks sederhana tidak tercatat walau `log_statement = all`); tidak mengubah hitungan 21 query, tapi tulis "semua statement yang lolos parsing dasar" bila 2.16 mengulang kalimat itu.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Halaman lama `b-fondasi/b2-4-n-plus-1.mdx` (`B2.4`, `lebur_ke`) masih tampil di indeks topik, sidebar, dan Kartu ulang (tiga kartu lama); hapus dengan persetujuan pemilik seperti pola Tahap 1, lalu cek rujukan `[[B2.4]]` yang tersisa (keputusan 665).
- `situs/src/content/docs/d-system-design/d2-scaling.mdx` baris 57 masih merujuk `[[B2.4]]` (halaman lama); arahkan ke `[[t2-n-plus-1]]` bila D2 ditinjau (keputusan 665).
- Halaman 1.12 (`B2.1`) tidak memuat kata ORM dan istilah ORM kini menaut ke 2.16 (keputusan 797); bila ORM perlu penjelasan sendiri, tambahkan bagian di halaman Tahap 2 yang membahas ORM, bukan di Tahap 1 (dibekukan, keputusan 369).
- Rekaman `n1.txt` tidak memuat hasil `JOIN` biasa di data lab, jadi "Tunjangan makan hilang" di halaman adalah kesimpulan dari aturan SQL; tambahkan satu bagian rekaman bila halaman perlu menunjukkan bukti (keputusan 667).
- Tes jumlah query untuk `Riwayat` api-t2 belum ada dan Go tidak punya penghitung query bawaan (`DB.Stats()` hanya koneksi): bungkus driver atau pakai `log_statement = all` di tes integrasi 2.24 (R2-122, keputusan 667).
- [perlu verifikasi] Jumlah query SQL di balik satu embedding PostgREST/Supabase tidak disebut dokumentasi; ukur lewat log PostgreSQL bila tab Supabase ingin mengklaim satu query (R2-124, keputusan 667).
- Tab Node.js memakai `LAWAN_BANYAK_SQL` tanpa menulis query-nya (`DISTINCT ON (q.jurnal_id)` dengan `= ANY($1)`); tulis lengkap dan jalankan di lab bila 2.24 atau Tahap 3 membutuhkannya.
- Dokumentasi Serverpod "Relation queries" bertanda versi 4.0.0 sedangkan halaman dan halaman istilah menulis 4.0.4 (paket di pub.dev); samakan tulisannya "dokumentasi 4.0.0, paket 4.0.4" bila ada pembaruan dokumentasi (keputusan 796).
- Rekaman `n1.txt` bagian E dan `index.txt` bagian B memakai metode berbeda (median client lawan EXPLAIN ANALYZE), jadi halaman 2.16 memberi catatan; satukan sumbernya bila lab b2-query direkam ulang (keputusan 796).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Halaman lama `b-fondasi/b2-3-index.mdx` (`B2.3`, `lebur_ke`) masih tampil di indeks topik, sidebar, dan Kartu ulang (tiga kartu lama); hapus dengan persetujuan pemilik seperti pola Tahap 1. Rujukan `[[B2.3]]` yang tersisa ada di `b9-caching`, `d2-scaling`, `d4b-feed-notifikasi`, `b1-3-pagination-idempotent` (halaman lama), dan di `kerangka-estimasi`, `fitur-saldo`, `data-modeling` (Tahap 1, dibekukan); arahkan ke `[[t2-index]]` saat halaman itu ditinjau (keputusan 668).
- Rekaman `b2-query` tidak memuat `ORDER BY` yang tidak cocok dengan urutan index, `CREATE INDEX CONCURRENTLY` di tabel yang sedang ditulis, atau `posting_buku` yang dihapus; halaman menulis ketiganya sebagai aturan dokumentasi atau Tidak dijalankan. Tambahkan bagian rekaman bila 2.22 membutuhkannya (keputusan 668, 669).
- [perlu verifikasi] node-pg-migrate 9.0.0: dokumentasi tag v9.0.0 menyebut opsi `concurrently` tanpa `pgm.noTransaction()`, dokumentasi 10.0.0-alpha.7 menyebutnya. Laravel 13.38.0: dokumentasi tidak menyebut cara `->online()` berjalan di luar transaction migration. Serverpod 4.0.4: `id` di daftar `fields` index belum dijalankan (R2-129).
- Aturan 3 ADR 15 (plan tanpa `Seq Scan` untuk query per akun) belum punya alat: usul tes plan di tes integrasi `api-t2` pada halaman 2.24.
- `posting_buku (buku_id)` kini memuat kolom depan yang sama dengan `posting_riwayat`; ukur invarian saldo dan ukuran sebelum menghapusnya (keputusan 668, ADR 15 pre-mortem 3).
- Widget Coba 2.17 memakai SQLite dengan 100.000 baris di dua database per putaran; bila HP lama terasa lambat, kurangi jumlah baris atau pindahkan setup ke satu database (keputusan 669).
- Kolom `masalah` 2.17 di registry (tampil di halaman Cerita dan indeks topik) memuat angka rekaman dan terbaca seperti log; naskah menulis "Query lambat setelah data bertambah". Usul yang terlihat orang: "Riwayat Budi dan laporan Ani tetap lambat walau query-nya sudah satu" (keputusan 800).
- Snippet plan memuat baris `Buffers: shared hit=6107` lawan `shared hit=99 read=3`, tetapi prosa belum menjelaskan artinya; tambah satu kalimat bila 2.17 ditinjau pembaca (keputusan 800).
- Usulan perubahan cerita (M13): naskah menulis "ALTER pada tabel besar mengambil lock lama" dan tidak menyebut apa yang ditunggu. Di lab tabel `akun` 1.013 baris sudah cukup; yang menahan adalah transaction panjang (laporan Keuangan) di depan migrasi, dan semua permintaan sesudahnya ikut menunggu. Usul: naskah menyebut mekanismenya ("ALTER menunggu di belakang laporan yang terbuka, dan pembayaran menunggu di belakang ALTER"), dan bahwa pembayaran yang menunggu akhirnya gagal 42703 karena kolom `saldo` dihapus di transaction yang sama sementara server v1 masih melayani. Angka 40 detik tetap angka cerita. Catatan: ALTER yang memindai tabel untuk memeriksa CHECK memang bisa memegang lock lama di tabel besar (PostgreSQL 17 ALTER TABLE, Notes), jadi kalimat naskah tidak salah untuk migrasi ini; yang tidak terulang di lab adalah penyebab pembayaran menunggu.
- 2.21/2.22: halaman istilah `lock` hanya membahas lock baris; lock tabel `ACCESS EXCLUSIVE`, urutan tunggu (soft block), dan `pg_locks` belum punya halaman istilah. 2.22 boleh menulisnya bersama `lock_timeout` dan expand-migrate-contract (halaman ini sengaja tidak).
- 2.21: mode "Batas tunggu 3 detik" di widget `AntreanLock` memakai rekaman file 000009 saja; bila 2.22 ingin membandingkan lima file dengan `lock_timeout`, rekam ulang di `labs/b4-skema` (satu-langkah dengan `SET LOCAL lock_timeout`).
- 2.21: jawaban benar widget `AntreanLock` selalu di pilihan B (Migrasi); acak urutan pilihan bila ingin menghindari pola, tanpa mengubah `indeksBenar`.
- 2.21: registry `masalah` t2-m13 ("menunggu 40 detik") tampil sebagai fakta di `alat/indeks-topik` dan `cerita/tahap-2`; label Ilustrasi hanya ada di halamannya. Ubah bila pemilik menyetujui usulan di atas.
- RISET-TAHAP-2.md "Belum bisa dicek": butir "Antrean lock di belakang ALTER" sudah tertutup sampai tingkat kode sumber oleh R2-155 (dokumentasi 9.27.1 dan `lock.c` REL_17_STABLE); hapus butir itu saat melipat.
- 2.21: `AntreanLock` belum punya alat ukur di gerbang seperti `ukur-race.mjs` (tebak dulu, keyboard, ARIA, reduced motion, axe akhir); tinjauan memakai skrip sementara yang menguji hydrate sesudah semua `details` dibuka, tebak dulu menahan hasil, Tab dan Enter sampai langkah 8, aria-pressed mode, target 24 px, reduced motion, dan fokus. Usul: jadikan alat ukur `ukur-antrean.mjs` bila widget dipakai halaman lain (2.22).
- 2.21: usul lab untuk 2.22: rekam ALTER yang memindai tabel untuk CHECK atau NOT NULL pada tabel `transaksi` 15.000 baris (lama lock) dibanding `NOT VALID` lalu `VALIDATE CONSTRAINT`; halaman 2.21 hanya menyebutnya dari dokumentasi.
