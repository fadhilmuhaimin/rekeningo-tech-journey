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
