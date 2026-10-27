# Lab t4-modul · batas modul, schema dan role per modul, dan service pembayaran

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3b, M32, dan ADR 37; tugas `lab-t4-modul`). Lab ini membuktikan lima hal tentang pemecahan monolith menjadi modul dan satu service pembayaran: perubahan nama kolom lintas modul gagal sebelum rilis, dua jalur kabar ke ledger dengan Idempotency-Key yang sama menghasilkan satu jurnal, service pembayaran yang mati di tengah pulih lewat kiriman ulang, tambahan latensi HTTP internal terukur sebagai batas, dan CODEOWNERS tidak dijalankan. Server, skema, data awal, dan gateway tiruan adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`, `cmd/tiruan`), bukan salinan; lab ini menambah `modul.sql`, `cmd/pembayaran`, paket `internal/modul/*`, dan tes batasnya di `labs/api-t4`, di belakang flag `-ledger-kunci`. Gateway pembayaran adalah tiruan lokal; tidak ada layanan, data, atau kredensial nyata, dan tidak ada klaim kepatuhan atau izin.

## Menjalankan

```bash
make -C labs/t4-modul run                       # semua bagian, ±2,5 menit, menulis labs/t4-modul/output/*.txt
make -C labs/t4-modul run BAGIAN=ledger         # satu bagian: batas ledger proses-mati latensi testing
make -C labs/t4-modul cek                       # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar (ditambah `LAB_PORT_OFFSET`): monolith api-t4 18280, gateway tiruan 18283, service pembayaran 18286; rekaman selalu memakai port dasar. Lab ini memakai server dan gateway api-t4 di port yang sama, jadi tidak berjalan bersamaan dengan `api-t4` di satu lajur. Tiap bagian membuat ulang schema `tahap4_modul` dan data awal dari nol, lalu `modul.sql` memecahnya; role dibuang dan dibuat ulang di awal `modul.sql`, karena role bersifat global di klaster dan keanggotaan atau hak yang tersisa dari run lain akan mengubah hasil (ditemukan saat uji mutasi). Angka yang bergantung mesin (latensi) hanya direkam sebagai batas yang diperiksa. Lab gagal keras bila hasilnya meleset.

## Versi dasar (dicek 2026-10-27)

| Komponen | Versi | Sumber dan catatan |
|---|---|---|
| PostgreSQL | 17.11 (kontainer `postgres:17`, dicetak di kepala rekaman) | sama dengan api-t4 |
| Go | toolchain lokal go1.27.1 (kepala rekaman); dokumentasi `cmd/go` dibuka pada go1.27.3 | aturan direktori `internal` dan `-overlay` (R4-315) |
| pgx | v5.11.0 | `go.mod` api-t4 |

Dependency baru di lab ini: tidak ada. Paket baru memakai pustaka standar, pgx, dan paket api-t4 yang sudah ada.

## Bentuk akhir pembagian modul

Enam schema dengan awalan `t4m_` (nama schema dan role global di database lab bersama), 22 tabel, sama dengan tabel "Modul (schema)" naskah 3b: `ledger` 6 (`buku`, `jurnal`, `posting`, `kunci_idempotensi`, `batch_pencairan`, `baris_pencairan`), `akun` 4 (`akun`, `sesi`, `perangkat`, `kota`), `identitas` 1 (`verifikasi`), `merchant` 4 (`produk`, `promo`, `operasi_sinkron`, `qr`), `pembayaran` 5 (`topup_bank`, `webhook_event`, `insiden_rekon`, `kartu`, `otorisasi_kartu`), `platform` 2 (`outbox`, `audit_log`). `modul.sql` memindahkan tabel dengan `ALTER TABLE ... SET SCHEMA` dari schema api-t4, memindahkan empat fungsi trigger invarian ledger beserta `search_path`-nya, dan membuat satu role per modul, `t4m_monolit` (mewarisi lima role modul; tanpa `t4m_pembayaran`), dan role service pembayaran `t4m_pembayaran`. Hak tiap role modul adalah hak role aplikasi api-t4 (`dasar_t4.py`, `HAK`) yang dibagi menurut modul pemilik tabel. Satu-satunya hak lintas modul adalah kontrak kolom yang dipakai kode lab: ledger membaca `akun.id`, `tingkat`, dan `status` (`Tx.AkunTingkat`, batas saldo menurut tingkat); kolom `nama` bukan kontrak siapa pun.

Kunci asing lintas schema dibaca dari katalog (`batas.txt` bagian B): 21, semuanya menuju `akun` (14: `akun` 12, `kota` 1, `perangkat` 1) atau `jurnal` (7). Tujuh di antaranya berasal dari schema `pembayaran`. Database memeriksa kunci asing sebagai pemilik tabel yang diacu, jadi role pembayaran menulis `topup_bank` untuk akun yang ada tanpa hak apa pun di schema akun, dan akun yang tidak ada tetap ditolak (23503).

### Selisih dengan naskah (ditulis juga di badan PR, `### USULAN-CERITA`; naskah tidak diubah)

- Naskah 3b menulis "schema dan role per modul" dan ADR 37 "satu schema dan satu role database per modul". Di lab keenam role ada dan dites sebagai kontrak, tetapi proses monolith memakai satu role, `t4m_monolit`, yang mewarisi lima role modul. Satu pool per modul belum dibangun. Role `t4m_pembayaran` dipakai sungguhan oleh proses terpisah.
- ADR 34 menulis bahwa sesudah 24 jam hanya status `topup_bank` yang menahan jurnal kedua. Itu benar bila transaction pembayaran pernah selesai. Bila proses mati di antara ledger dan transaction pembayaran, status masih `menunggu` dan tidak menahan apa pun: kiriman ulang sesudah key habis menghasilkan jurnal kedua (`proses-mati.txt` bagian C). Jalur penutupnya dalam 24 jam adalah kiriman ulang gateway dan job cek status (umur 30 menit, Asumsi naskah); sesudah itu tinggal rekonsiliasi harian.
- M32 menulis bahwa modul pembayaran membaca `akun.nama` dengan SQL langsung. Kode top-up api-t4 tidak membaca kolom itu; `TeksTopupLangsung` di `internal/modul/pembayaran` adalah kode lab yang ditulis seperti uraian naskah, jadi bagian "tanpa batas" adalah Ilustrasi mekanisme dengan kode dan database nyata, bukan rekaman kode produksi.
- Aturan direktori `internal` Go melindungi paket di bawah `internal/modul/`. Kode ledger lama (`internal/repo`, `internal/service`) tetap di tempatnya, jadi di sana batasnya hanya tes `go list -deps` untuk modul pembayaran, bukan compiler.
- Naskah ADR 37 menyerahkan anggaran latensi ke lab: lab menetapkan 50 ms untuk tambahan satu lompatan HTTP (Hitungan dari ADR 42, tenggat 2.000 ms dikurangi `lock_timeout` 1.000 ms menyisakan 1.000 ms; 5% adalah Asumsi lab).

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `batas.txt` | M32 pada versi tanpa batas (CI hijau, kode yang sama gagal `column "nama" does not exist`); pembagian 22 tabel, matriks hak enam role, kontrak kolom, kunci asing lintas schema; M32 dengan batas (permission denied, relation does not exist, rename tidak mematahkan modul lain, rename kolom kontrak terdeteksi, impor `internal/` ditolak compiler); CODEOWNERS Tidak dijalankan | 4.12, 4.13, 4.5 |
| `ledger.txt` | API ledger: 401, 400, 422, 201 lalu 200 untuk key yang sama; webhook ganda lewat service pembayaran; webhook dan job cek status bertemu di key yang sama (dua panggilan ledger, satu jurnal) | 4.13 |
| `proses-mati.txt` | SIGKILL sesudah ledger menjurnal: satu jurnal, `topup_bank` menunggu; kiriman ulang menutupnya; pemulihan lewat job; batas key 24 jam | 4.13 |
| `latensi.txt` | Tambahan latensi HTTP internal sebagai batas | 4.13 |
| `testing.txt` | `go vet`, tes API ledger dan modul pembayaran dengan PostgreSQL, tes tanpa database, `TES_DB_WAJIB` | 4.13 |

### Yang dibuktikan

- **(a) Rename lintas modul.** Tanpa batas: satu schema dan satu role aplikasi, `go build`, `go vet`, dan tes pembayaran dengan data tiruan lolos, lalu `ALTER TABLE akun RENAME COLUMN nama TO nama_tampil` membuat kode pembayaran yang sama gagal `column "nama" does not exist` (42703). Dengan batas: kode itu tidak bisa jalan sama sekali sebelum rename, yaitu `relation "akun" does not exist` (42P01) tanpa awalan schema dan `permission denied for schema t4m_akun` (42501) dengan awalan; kontrolnya, role `t4m_akun` menjalankan SQL yang sama pada baris yang sama dan berhasil. Impor `lab/apit4/internal/modul/akun/internal/data` dari paket pembayaran ditolak `go build` (`use of internal package ... not allowed`), dan impor paket publik `akun` lolos. Sesudah rename oleh pemilik schema akun dan kodenya ikut berubah, `pembayaran.TeksTopup` lewat kontrak akun tetap jalan. Mengganti nama kolom yang ada di kontrak (`tingkat`) membuat tes kontrak ledger gagal 42703: terdeteksi di CI, bukan di produksi.
- **(b) Satu jurnal per key.** Dua panggilan ke API ledger dengan key yang sama: 201 lalu 200 dengan jurnal yang sama. Webhook dan job cek status: webhook menjurnal, dijeda 1,5 detik sebelum transaction pembayaran, job cek status memanggil ledger dengan key yang sama selama jeda itu, log ledger menunjukkan dua panggilan (201 lalu 200) dan satu jurnal, webhook yang kalah menjawab `ganda`.
- **(c) Proses dimatikan.** Titik kegagalan disuntik, proses dimatikan sungguhan: `cmd/pembayaran -lab-mati-sesudah-ledger` mengirim `SIGKILL` ke dirinya sendiri tepat sesudah ledger menjawab, tanpa defer dan tanpa balasan ke gateway (`proses-mati.txt` merekam keluar dengan sinyal 9). Hasilnya satu jurnal, `topup_bank` `menunggu`, tanpa `webhook_event`; kiriman ulang event yang sama atau job cek status menutupnya dengan satu jurnal. Tes Go memerankan titik yang sama dengan `panic` yang dipulihkan, jadi di sana tidak ada proses yang mati.
- **(d) Latensi.** Fungsi ledger yang sama dipanggil langsung dan lewat HTTP di localhost, 200 panggilan bergantian: tambahan p95 di bawah anggaran 50 ms. Nilai mentah tidak direkam (satu run di laptop pengembangan pada 2026-10-27 memberi p50 tambahan 1,5 ms). Selisih p95 dua distribusi yang berisik bisa bertanda negatif. Jaringan antar host, TLS, dan beban serentak tidak diukur.
- **(e) CODEOWNERS dan review wajib.** Tidak dijalankan: keduanya fitur GitHub. Menurut dokumentasi (dibuka 2026-10-27, R4-318) pola terakhir yang cocok menang dan review code owner wajib dinyalakan lewat branch protection rule; apakah plan repositori pemilik mengizinkannya [perlu verifikasi: plan pemilik]. Halaman memakai dokumentasi dan checklist PR sebagai cadangan.

## Yang belum ada di lab ini

- Proses monolith memakai satu role (`t4m_monolit`); satu pool per modul dan transaction yang menyeberang modul lewat API belum dibangun. Kontrak kolom hanya diturunkan untuk yang dipakai kode lab (ledger ke akun); kontrak identitas, merchant, dan platform belum.
- Batas compiler hanya untuk paket baru di `internal/modul/`; kode ledger lama belum dipindah.
- Kartu dan `otorisasi_kartu` ada di schema pembayaran, tetapi alur kartu (otorisasi lewat API ledger dengan `id_penerbit`) belum dipindah ke service pembayaran: itu bahan `t4-kartu`. Rekonsiliasi harian dan `insiden_rekon` tetap kode monolith api-t4 (`-rekon`), yang tidak terbaca dari role monolith di schema ini; Tidak dijalankan di lab ini.
- Kunci asing lintas schema tetap ada. Memisahkan database fisik memerlukan membuangnya; Tidak dijalankan.
- Kunci layanan di header `X-Layanan-Kunci` adalah data lab; rotasi, TLS antar service, dan autentikasi user di service pembayaran (`POST /lab/topup` hanya dengan `-lab`, tanpa sesi) tidak ada.
- Kontrak OpenAPI API ledger tidak ditulis; rute ini sengaja di luar `openapi.yaml`.
- Kapasitas dan beban serentak service pembayaran, dan jaringan antar host, tidak diukur.
- CODEOWNERS, review wajib, dan branch protection: Tidak dijalankan.

## Uji mutasi lab ini

Satu perubahan per mutan pada kode uang, keamanan, dan batas milik lab ini (skrip sementara `tmp/mutasi_modul.py` pada salinan kerja, tidak ada di repo). Schema tes dibangun ulang sebelum tiap mutan dan layout modular dibangun ulang dengan role dibuang dan dibuat ulang untuk mutan `modul.sql`; file dipulihkan sesudahnya. Hasil: 52 dari 53 mutan tertangkap karena sebab yang diuji, dan satu setara perilaku (D12).

Putaran pertama menemukan tiga mutan yang lolos karena tesnya belum ada atau terlalu longgar: jumlah di luar batas (S7), umur key dengan literal 23 dan 25 jam (S10), dan umur job cek status dari dua sisi (P11). Tesnya ditambah. Satu mutan awal (D4, `search_path` role pembayaran memuat schema akun) ternyata setara perilaku, karena PostgreSQL melewati schema di `search_path` yang tidak boleh diakses role itu (R4-316); ia kini D12, dan D4 menguji `search_path` monolith. Putaran itu juga menemukan keanggotaan role dari satu mutan yang tertinggal di klaster dan meracuni mutan berikutnya; `modul.sql` kini membuang dan membuat ulang role.

| Mutan | Bagian | Perilaku yang diubah | Tes yang menangkap | Hasil |
|---|---|---|---|---|
| S1 | API ledger (service) | key tidak diklaim: tiap panggilan menulis jurnal | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib`, `TestLedgerKeyHidup24JamLaluMenjurnalLagi` dan 11 lain | tertangkap |
| S2 | API ledger (service) | key yang sama dengan permintaan lain diterima (hash dan akun tidak dibandingkan) | `TestLedgerKlienBaruUlangDitolak`, `TestLedgerKunciHarusSamaDenganOrderDanDipakaiSatuPermintaan` | tertangkap |
| S3 | API ledger (service) | hash permintaan tidak memuat jumlah | `TestLedgerKlienBaruUlangDitolak`, `TestLedgerKunciHarusSamaDenganOrderDanDipakaiSatuPermintaan` | tertangkap |
| S4 | API ledger (service) | key boleh berbeda dari order_id | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib`, `TestLedgerKunciHarusSamaDenganOrderDanDipakaiSatuPermintaan` | tertangkap |
| S5 | API ledger (service) | batas saldo menurut tingkat tidak diperiksa | `TestLedgerDitolakDibekukanDanBatasTingkatTidakMenahanKey` | tertangkap |
| S6 | API ledger (service) | akun dibekukan boleh dikredit | `TestLedgerDitolakDibekukanDanBatasTingkatTidakMenahanKey`, `TestLedgerKlienBaruUlangDitolak` dan 1 lain | tertangkap |
| S7 | API ledger (service) | jumlah di atas Rp5.000.000 diterima | `TestLedgerJumlahTidakSah` | tertangkap |
| S8 | API ledger (service) | baris outbox tidak ditulis bersama jurnal | `TestLedgerKreditTopupSatuJurnalPerKey` | tertangkap |
| S9 | API ledger (service) | key tidak diikat ke jurnalnya | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib`, `TestLedgerKeyHidup24JamLaluMenjurnalLagi` dan 9 lain | tertangkap |
| S10 | API ledger (service) | umur key 72 jam, bukan 24 | `TestLedgerKeyHidup24JamLaluMenjurnalLagi` | tertangkap |
| S11 | API ledger (service) | tanda posting dibalik (bank dikredit, akun didebit) | `TestJobCekStatusUmurDariDuaSisi`, `TestLedgerDitolakDibekukanDanBatasTingkatTidakMenahanKey` dan 19 lain | tertangkap |
| S12 | API ledger (service) | ulangan dijawab seperti permintaan baru | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib`, `TestLedgerKeyHidup24JamLaluMenjurnalLagi` dan 5 lain | tertangkap |
| S13 | API ledger (service) | akun yang tidak ada dijawab galat umum | `TestLedgerAkunTidakAda` | tertangkap |
| H1 | API ledger (handler) | kunci layanan tidak diperiksa | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib`, `TestLedgerKlienBaruUlangDitolak` | tertangkap |
| H2 | API ledger (handler) | Idempotency-Key tidak diwajibkan | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib` | tertangkap |
| H3 | API ledger (handler) | status 201 dan 200 tertukar | `TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib` | tertangkap |
| H4 | API ledger (handler) | key dipakai permintaan lain dijawab 500 | `TestLedgerKlienBaruUlangDitolak` | tertangkap |
| H5 | API ledger (handler) | rute dipasang walau kunci layanan kosong | `TestLedgerTanpaKunciLayananRuteTidakAda` | tertangkap |
| K1 | client ledger | header X-Layanan-Kunci tidak dikirim | `TestJobCekStatusUmurDariDuaSisi`, `TestLedgerKlienBaruUlangDitolak` dan 12 lain | tertangkap |
| K2 | client ledger | header Idempotency-Key kosong | `TestJobCekStatusUmurDariDuaSisi`, `TestLedgerKlienBaruUlangDitolak` dan 12 lain | tertangkap |
| K3 | client ledger | timeout atau koneksi putus dijawab sebagai permintaan tidak sah, bukan tidak pasti | `TestLedgerTimeoutPemanggilBukanGagal` | tertangkap |
| K4 | client ledger | 5xx dijawab sebagai permintaan tidak sah, bukan tidak pasti | `TestLedgerTidakPastiTidakMenandaiApaPun` | tertangkap |
| K5 | client ledger | 422 tidak dipetakan ke penolakan | `TestLedgerKlienBaruUlangDitolak`, `TestLedgerMenolakDiparkirTanpaMengubahStatus` | tertangkap |
| P1 | modul pembayaran | kecocokan tanda tangan tidak diperiksa | `TestTandaTanganDanTimestamp` | tertangkap |
| P2 | modul pembayaran | toleransi timestamp 1 jam, bukan 5 menit | `TestTandaTanganDanTimestamp` | tertangkap |
| P3 | modul pembayaran | hanya rahasia pertama diperiksa (masa tumpang tindih rotasi hilang) | `TestTandaTanganDanTimestamp` | tertangkap |
| P4 | modul pembayaran | jumlah di kabar tidak dibandingkan dengan baris top-up | `TestJumlahDariBarisTopupBukanDariKabar` | tertangkap |
| P5 | modul pembayaran | status akhir bisa diubah lagi (kabar mundur tidak diparkir) | `TestStatusHanyaMaju` | tertangkap |
| P6 | modul pembayaran | kabar yang sama dengan status sekarang tidak dijawab ganda | `TestWebhookDuaEventSatuKejadianSatuJurnal` | tertangkap |
| P7 | modul pembayaran | penolakan ledger diperlakukan sebagai galat, bukan diparkir | `TestLedgerMenolakDiparkirTanpaMengubahStatus` | tertangkap |
| P8 | modul pembayaran | titik gagal sesudah ledger dilewati | `TestMatiSesudahLedgerLaluKirimUlangSatuJurnal`, `TestWebhookKalahDariJobDiTengahMenjawabGanda` dan 1 lain | tertangkap |
| P9 | modul pembayaran | topup_bank tidak diikat ke jurnal ledger | `TestMatiSesudahLedgerLaluKirimUlangSatuJurnal` | tertangkap |
| P10 | modul pembayaran | event_id ganda menimpa catatan event pertama | `TestWebhookSettlementSatuJurnalWalauDuaKiriman` | tertangkap |
| P11 | modul pembayaran | umur minimal job cek status dihitung ke depan | `TestJobCekStatusUmurDariDuaSisi` | tertangkap |
| P12 | modul pembayaran | pembaruan status tanpa syarat status asal | `TestWebhookKalahDariJobDiTengahMenjawabGanda` | tertangkap |
| P13 | modul pembayaran | event ganda dijawab diproses | `TestWebhookSettlementSatuJurnalWalauDuaKiriman` | tertangkap |
| P14 | modul pembayaran | tanda tangan dibandingkan hanya dari panjangnya | `TestTandaTanganDanTimestamp` | tertangkap |
| P15 | modul pembayaran | timestamp di masa depan tidak ditolak | `TestTandaTanganDanTimestamp` | tertangkap |
| D1 | modul.sql | kontrak kolom ledger ke akun ikut memuat kolom nama | `TestKontrakKolomLedgerKeAkunHanyaTigaKolom` | tertangkap |
| D2 | modul.sql | role pembayaran boleh membaca tabel akun | `TestMatriksRoleModul`, `TestPembayaranTidakBisaMembacaAkunLangsung` | tertangkap |
| D3 | modul.sql | role monolith mewarisi role pembayaran | `TestMonolitMembacaLimaModulTapiBukanPembayaran` | tertangkap |
| D4 | modul.sql | search_path role monolith tanpa schema merchant | `TestMonolitMembacaLimaModulTapiBukanPembayaran` | tertangkap |
| D12 | modul.sql | search_path role pembayaran memuat schema akun (tanpa USAGE) | - | setara perilaku |
| D5 | modul.sql | CREATE di schema public diberikan ke PUBLIC | `TestRoleModulTidakBisaMembuatObjek` | tertangkap |
| D6 | modul.sql | tabel kartu dipindah ke schema platform | `TestMatriksRoleModul`, `TestMonolitMembacaLimaModulTapiBukanPembayaran` dan 1 lain | tertangkap |
| D7 | modul.sql | role pembayaran boleh INSERT ke jurnal ledger (tanpa SELECT) | `TestMatriksRoleModul` | tertangkap |
| D8 | modul.sql | role platform boleh UPDATE dan DELETE audit_log | `TestRoleTidakBisaMengubahCatatanYangHanyaBertambah` | tertangkap |
| D9 | modul.sql | role ledger boleh UPDATE jurnal dan posting | `TestRoleTidakBisaMengubahCatatanYangHanyaBertambah` | tertangkap |
| D10 | modul.sql | role ledger tanpa USAGE di schema akun (kontrak kolom tak terbaca) | `TestKontrakKolomLedgerKeAkunHanyaTigaKolom`, `TestMatriksRoleModul` dan 2 lain | tertangkap |
| D11 | modul.sql | role ledger boleh membaca tabel sesi akun | `TestMatriksRoleModul` | tertangkap |
| B1 | batas impor Go | modul pembayaran mengimpor internal/repo | `TestPembayaranTidakMengimporRepoDanService` | tertangkap |
| B2 | batas impor Go | modul pembayaran mengimpor internal/handler | `TestPembayaranTidakMengimporRepoDanService` | tertangkap |
| L1 | latensi | handler ledger menunggu 80 ms per panggilan | `TestLatensiHTTPInternalDiBawahAnggaran` | tertangkap |

- **D12**: setara perilaku. Menambah schema `t4m_akun` ke `search_path` role pembayaran tidak mengubah apa pun, karena schema yang tidak boleh diakses role itu dilewati.
- Tidak ada mutan untuk batas ukuran body API ledger (4 KiB) dan untuk urutan lock buku: kode ledger memakai `KunciBukuAkun` api-t4, yang mutannya ada di tabel api-t4, dan batas body belum punya tes.
