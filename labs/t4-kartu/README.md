# Lab t4-kartu · penerbit kartu tiruan, hold di ledger, tenggat 2 detik, kedaluwarsa, dan kill switch

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3, M37, dan ADR 42; tugas `lab-t4-kartu`). Lab ini membuktikan enam hal tentang kartu virtual: tanpa hold dua otorisasi di bawah saldo sama-sama disetujui dan clearing kedua ditolak ledger, dengan hold yang kedua ditolak; `id_penerbit` yang sama dua kali menghasilkan satu hold; `lock_timeout` 1 detik membuat jawaban keluar dalam tenggat 2 detik penerbit, dan batasnya terbaca di kedua sisi; job kedaluwarsa hold berumur 7 hari dijalankan dua kali tidak melepas dua kali; kill switch menolak otorisasi baru tanpa deploy; dan dua keadaan penerbit menurut dokumentasi satu penerbit. Server, skema, data awal, dan penerbit tiruan adalah milik `labs/api-t4`, bukan salinan: perilaku jalur kartu sudah ada di sana (mode rentan `kartu-tanpa-hold`, hold dengan `ORDER BY id FOR UPDATE`, `lock_timeout`, job `-kedaluwarsa-hold`, kill switch), dan tesnya sudah ada. Yang baru di lab ini: rekaman terarah, jalur dua service (hold lewat API ledger dengan Idempotency-Key = `id_penerbit`, ADR 37), catatan keputusan di penerbit tiruan, dan tes Go serta uji mutasi untuk semuanya.

Penerbit kartu adalah proses tiruan lokal (`cmd/penerbit`): tidak ada kartu, nomor, kredensial, atau layanan nyata. Token kartu berasal dari penerbit tiruan dan nomor penuh tidak ada di mana pun. Lab ini bukan uji kapasitas, tidak menguji perilaku penerbit nyata, dan tidak mengklaim izin atau kepatuhan apa pun.

## Menjalankan

```bash
make -C labs/t4-kartu run                       # semua bagian, ±4 menit, menulis labs/t4-kartu/output/*.txt
make -C labs/t4-kartu run BAGIAN=tenggat        # satu bagian: otorisasi tenggat kedaluwarsa kill-switch penerbit dua-service testing
make -C labs/t4-kartu cek                       # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar (ditambah `LAB_PORT_OFFSET`): monolith api-t4 18280, penerbit tiruan 18285, service pembayaran 18286; rekaman selalu memakai port dasar. Lab ini memakai server dan penerbit api-t4 di port yang sama, jadi tidak berjalan bersamaan dengan `api-t4` atau `t4-modul` di satu lajur. Tiap bagian membuat ulang schema `tahap4_kartu` dan data awal dari nol, lalu menambah akun user dengan saldo yang dibutuhkan bagian itu (data awal tambahan lab, ditulis sebagai pemilik schema seperti seed). Waktu, tanggal, dan token disamarkan sehingga rekaman ulang identik per byte. Lama menunggu (`lock_timeout`, tenggat, latensi) tidak pernah direkam sebagai nilai: yang direkam adalah batas yang diperiksa ("di antara 1 dan 2 detik: ya"). Waktu yang panjang (7 hari, 24 jam) diperankan dengan jam maya, tidak ditunggu. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset.

## Versi dasar

| Komponen | Versi | Sumber dan catatan |
|---|---|---|
| PostgreSQL | 17.11 (kontainer `postgres:17`, dicetak di kepala setiap rekaman) | sama dengan api-t4 |
| Go | toolchain lokal go1.27.1 (kepala rekaman) | sama dengan api-t4 |
| pgx | v5.11.0 | `go.mod` api-t4 |
| Dokumentasi satu penerbit kartu | tenggat 2 detik, keputusan oleh setelan timeout, jaringan yang menyetujui sendiri | dibuka 2026-10-28; tanpa merek di halaman; baris riset R4-340 |
| OpenFeature go-sdk, flagd | v1.20.0 (2026-10-24), core v0.19.1 (2026-10-26) | tidak dipakai: kill switch adalah `Dep.KartuAktif` di memori proses; spesifikasi OpenFeature v0.9.0 belum 1.0 (R4-343) |

Dependency baru di lab ini: tidak ada. Paket baru memakai pustaka standar, pgx, dan paket api-t4 yang sudah ada.

## Yang ditambahkan ke api-t4

- `internal/service/ledger_kartu.go`, rute `POST /ledger/kartu/tahan` di `internal/handler/ledger_layanan.go` (hanya dengan `-ledger-kunci`, seperti `jurnal-topup`): hold sebagai satu transaction di ledger. Urutannya: `lock_timeout` dipasang, key diklaim (Idempotency-Key = `id_penerbit`), buku pemilik dikunci (`ORDER BY id FOR UPDATE`), akun dan saldo diperiksa sesudah lock, jurnal `kartu_tahan` (pemilik ke `dana_tertahan`) ditulis, key diikat ke jurnalnya. Penolakan di-ROLLBACK, jadi key tidak tertahan. Jawaban: 201, 200 untuk ulangan, 422 (`saldo-kurang`, `akun-dibekukan`, `key-dipakai-permintaan-lain`, `tidak-sah`), 404, 503 `sibuk` untuk `lock_timeout`.
- `internal/modul/pembayaran/kartu.go` dan `cmd/pembayaran -penerbit-kunci`: otorisasi di service pembayaran. Urutannya: validasi, kill switch, kartu, jawaban untuk id yang sudah pernah dijawab, status kartu dan batas harian (dibaca dari tabel sendiri, tanpa lock), satu panggilan ke API ledger, lalu baris `otorisasi_kartu`. Ledger yang tidak menjawab dijawab "tolak"; `lock_timeout` ledger dijawab "tolak, sibuk"; baris ditulis dengan konteks yang dilepas dari pembatalan permintaan. Modul tidak mengimpor `internal/repo` dan `internal/service` (dijaga tes batas t4-modul).
- `internal/modul/ledger/klien.go`: `TahanKartu` dan `ErrSibuk` (503 `sibuk`); `KreditTopup` dan `TahanKartu` memakai satu fungsi kirim yang sama.
- `cmd/penerbit`: catatan keputusan penerbit (`GET /lab/keputusan`, `POST /lab/reset`) dan `-api-otorisasi` (otorisasi ke service pembayaran, clearing dan reversal tetap ke monolith).
- `cmd/api`: `-lab-sekarang` berlaku juga untuk job `-kedaluwarsa-hold`, supaya batas 7 hari diperankan.
- Tes Go baru: `internal/service/ledger_kartu_test.go` (11), `internal/handler/ledger_kartu_test.go` (4), `internal/modul/pembayaran/kartu_test.go` (13).

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `otorisasi.txt` | M37: tanpa hold (dua serentak dan satu berurutan semuanya disetujui, clearing kedua dan ketiga ditolak ledger); dengan hold (yang kedua melihat saldo sesudah lock); `id_penerbit` yang sama berurutan, serentak, dan dengan jumlah lain | 4.22, 4.23 |
| `tenggat.txt` | `lock_timeout` 1 detik di bawah tenggat; sisi lain batas; `lock_timeout` 3 detik yang membuat penerbit memutuskan sendiri; lewat service pembayaran dan API ledger; `lock_timeout` berlaku per penantian lock; latensi tanpa kontensi sebagai batas | 4.23 |
| `kedaluwarsa.txt` | hold berumur 7 hari dengan jam maya (sebelum, tepat, sesudah batas, diulang); dua job bersamaan; hold yang sudah ditagih; reversal sesudah kedaluwarsa | 4.23 |
| `kill-switch.txt` | kill switch tanpa deploy, tidak berlaku untuk otorisasi yang sudah disetujui, hilang saat proses dimulai ulang; di service pembayaran | 4.23 |
| `penerbit.txt` | dua keadaan penerbit menurut dokumentasi; rekonsiliasi kartu yang dijalankan lab; jawaban terlambat sesudah hold selesai | 4.22, 4.23 |
| `dua-service.txt` | hold lewat API ledger, key = `id_penerbit`; service pembayaran dimatikan di antara ledger dan baris; batas harian | 4.23 |
| `testing.txt` | `go vet`, tes lab ini dengan PostgreSQL sungguhan, `TES_DB_WAJIB` | 4.23 |

### Yang dibuktikan

- **(a) Tanpa hold lawan dengan hold** (`otorisasi.txt` A sampai C). Handler versi pertama (`-rentan kartu-tanpa-hold`) membaca saldo tanpa lock lalu menyetujui tanpa menahan apa pun: AUTH-A dan AUTH-B serentak (jeda 300 ms melebarkan celah) sama-sama disetujui, dan AUTH-C yang datang sesudahnya juga. Keserentakan bukan syaratnya: tanpa hold tidak ada yang mengubah saldo yang dibaca otorisasi berikutnya. Clearing datang kemudian: yang pertama punya penutup (saldo Rp100.000 jadi Rp20.000), dua yang lain ditolak ledger (409) karena saldo tidak boleh negatif; Rp240.000 sudah disetujui kepada toko. Dengan hold, lab memegang lock buku, mengantrekan AUTH-A lalu AUTH-B, dan melepas lock: AUTH-A menahan Rp80.000 (jurnal `kartu_tahan`, pemilik ke `dana_tertahan`), AUTH-B membaca saldo Rp20.000 sesudah lock dan ditolak `saldo-kurang`. Urutan antre ditentukan lab (B dimulai sesudah A terlihat mengantre), bukan siapa yang cepat.
- **(b) `id_penerbit` yang sama dua kali** (`otorisasi.txt` D, `dua-service.txt` A dan B). Berurutan: satu baris, satu jurnal `kartu_tahan`, saldo turun sekali. Serentak (dua permintaan mengantre di lock yang sama): sama. Dengan jumlah lain: 409 `id-penerbit-dipakai`. Lewat service pembayaran: ulangan dijawab dari baris tanpa panggilan kedua ke ledger; ledger sendiri, dipanggil langsung dengan key yang sama, menjawab 200 `ulang` dengan jurnal yang sama, 422 untuk jumlah lain, dan key sesudah penolakan saldo kurang tidak tertahan. Key hidup 24 jam (ADR 14): sesudah itu id yang sama dianggap baru di ledger (tes Go `KeyHabisSesudah24Jam`, 23 jam ulangan dan 25 jam hold kedua); yang menahannya hanya baris `otorisasi_kartu`.
- **(c) `lock_timeout` dan tenggat** (`tenggat.txt` A sampai F). Buku pemilik dikunci transaction lain: dengan `lock_timeout` 1 detik jawaban "tolak, sibuk" keluar di antara 1 dan 2 detik, tanpa baris dan tanpa hold. Sisi lain: lock lepas lebih cepat, jawaban setuju dengan hold. Dengan `lock_timeout` 3 detik (di atas tenggat) penerbit tidak menunggu dan memutuskan sendiri (setuju bila timeout), di Rekeningo tidak ada baris dan tidak ada hold; Rekeningo berhenti menunggu begitu penerbit memutus koneksi (sekitar tenggat, sebelum `lock_timeout` habis). Lewat service pembayaran jawaban tetap di dalam tenggat lewat dua batas: `lock_timeout` ledger 1 detik, dan batas panggilan pembayaran ke ledger 1,5 detik (Asumsi lab) yang menyelamatkan tenggat saat `lock_timeout` salah dipasang 3 detik. Temuan: `lock_timeout` berlaku per penantian lock, bukan per transaction (dokumentasi PostgreSQL), dan hold bisa menunggu di dua buku (pemilik, lalu `dana_tertahan` yang di-UPDATE semua hold): dua penantian 0,6 detik masing-masing lolos dengan setuju sesudah lebih dari 1 detik, dan buku `dana_tertahan` yang terkunci menolak pemilik lain yang tidak berhubungan.
- **(d) Kedaluwarsa hold** (`kedaluwarsa.txt`). Hold berumur 7 hari (selisih `tahan_sampai` dan `dibuat` diperiksa dalam 5 detik). Job `-kedaluwarsa-hold` dengan jam maya: 1 detik sebelum batas dan tepat pada batas tidak melepas (kueri memakai tanda kurang dari), 1 detik sesudahnya melepas lewat satu jurnal pembalik, dijalankan lagi tidak melakukan apa pun. Dua proses job bersamaan, ditahan di lock baris otorisasi oleh lab dan dilepas bersama: satu melepas, satu tidak, saldo kembali Rp100.000 (bukan Rp180.000). Hold yang sudah ditagih tidak dilepas; reversal sesudah kedaluwarsa dijawab 200 tanpa jurnal kedua.
- **(e) Kill switch** (`kill-switch.txt`). `POST /bo/flag/kartu` (peran risk, tercatat di audit log berantai) mematikan otorisasi baru dengan alasan `kill-switch`: PID proses tidak berubah, tanpa baris dan tanpa hold. Otorisasi yang sudah disetujui tetap bisa ditagih. Batas: flag adalah `Dep.KartuAktif` (atomic.Bool) di memori satu proses, bukan OpenFeature dan bukan flag di tabel, jadi proses yang dimulai ulang kembali aktif tanpa ada yang menyalakannya; dua instance Tidak dijalankan. Rilis bertahap 1%, 5%, 25%, 100% (Asumsi, ADR 42) Tidak dijalankan.
- **(f) Dua keadaan penerbit** (`penerbit.txt`; riset R4-340). Keadaan pertama (jawaban terlambat diputuskan penerbit menurut setelan timeout) direkam: persetujuan oleh timeout tidak punya baris di Rekeningo, dana yang sama bisa disetujui lagi, dan penagihannya dijawab 404. Keadaan kedua (penerbit menolak, jaringan menyetujui, dana tidak ditahan tetapi bisa ditagih) hanya sebagian: dokumentasi menempatkan kalimatnya di bagian Autopilot (network fallback, user dengan BIN sendiri), penerbit tiruan tidak punya jaringan, jadi lab yang memerankan penagihan dengan mengirim clearing atas otorisasi yang ditolak Rekeningo: dijawab 409 `otorisasi-status` tanpa jurnal, apa pun saldonya. Rekonsiliasi kartu tetap perlu: lab membandingkan catatan keputusan penerbit tiruan dengan `otorisasi_kartu` lewat SQL (bukan job di api-t4) dan menemukan "setuju di penerbit, tidak ditahan di Rekeningo" serta (jalur dua service, jawaban terlambat sesudah hold selesai) "tolak di penerbit, dana ditahan di Rekeningo", yang baru dilepas job kedaluwarsa sesudah 7 hari.

### Selisih dengan naskah (ditulis juga di badan PR, `### USULAN-CERITA`; naskah tidak diubah)

1. ADR 42 menulis "`lock_timeout` 1 detik ... supaya jawaban sampai sebelum tenggat 2 detik". Lab: `lock_timeout` membatasi satu penantian lock, dan hold bisa menunggu dua (buku pemilik, buku `dana_tertahan`); jaminan terhadap tenggat butuh batas untuk seluruh panggilan (di jalur dua service ada: 1,5 detik, Asumsi lab; di versi satu proses tidak ada, dan penerbit memutuskan sendiri).
2. ADR 42 menyebut titik panas hanya di buku pemilik. Lab: semua hold meng-UPDATE satu baris `dana_tertahan`; baris itu terkunci menolak pemilik lain yang tidak berhubungan ("sibuk"). Pada 0,116 otorisasi per detik (Asumsi naskah) belum terukur sebagai masalah.
3. ADR 42 menulis baris `otorisasi_kartu` ditulis sesudah hold dan ulangan penerbit membawa hold yang sama. Lab: terbukti untuk ulangan; hold yang tidak pernah diulang yatim (ada di ledger tanpa baris) dan tidak bisa dikedaluwarsakan job, yang bekerja dari baris. Naskah tidak menyebut rekonsiliasi hold-tanpa-baris.
4. Naskah tidak menyebut batas harian kartu di jalur dua service. Versi satu proses memeriksanya sesudah lock buku, jadi dua otorisasi serentak yang bersama melewati batas ditolak yang kedua; di jalur dua service batas dibaca sebelum hold, tanpa lock, dan keduanya disetujui (`dua-service.txt` C). Celah ini tidak ditutup di lab.
5. ADR 42 "kill switch lewat feature flag": lab menjalankan flag di memori proses; hilang saat mulai ulang dan tidak lintas instance. Halaman perlu menyebut flag harus hidup di luar proses.
6. Persetujuan oleh timeout: naskah M37 menulis penerbit memutuskan menurut aturan timeout. Lab: tiruan memutuskan "setuju" bila jawaban Rekeningo terlambat atau bukan 200 (penyederhanaan tiruan; dokumentasi satu penerbit tidak merinci status HTTP lain [perlu verifikasi]). Akibatnya satu galat Rekeningo (di lab: 409) menjadi persetujuan tanpa hold.
7. Rekeningo tidak menjurnal penagihan atas otorisasi yang ditolaknya (409), walau saldo pemilik cukup. Dokumentasi satu penerbit menyebut dana yang tidak ditahan "bisa tetap ditangkap". Naskah belum memutuskan perlakuan penagihan seperti itu.

## Yang belum ada di lab ini

- Clearing, reversal, dan job kedaluwarsa lewat API ledger (jalur dua service): hanya otorisasi. Baris yang ditulis service pembayaran ditagih dan dikedaluwarsakan oleh monolith, yang membaca schema yang sama.
- Role dan schema per modul untuk jalur kartu: service pembayaran memakai role `api_t4`; layout enam schema dibuktikan `t4-modul`.
- Jaringan kartu, file penagihan penerbit, `is_amount_controllable` (jumlah hold selalu sama dengan jumlah yang diminta), clearing sebagian, kartu fisik, dan multi-mata uang: tidak ada.
- Job rekonsiliasi kartu: tidak ada; perbandingan di `penerbit.txt` dijalankan lab.
- Kapasitas dan beban serentak: latensi hanya diukur sebagai batas atas 200 permintaan berurutan (batas lab 250 ms, Asumsi, seperdelapan tenggat); p95 tidak direkam sebagai nilai.
- Tiga penantian lock berurutan dan dua instance monolith: Tidak dijalankan. Rilis bertahap, flag di tabel, dan OpenFeature: Tidak dijalankan.
- Perilaku penerbit nyata terhadap status HTTP selain 200, dan apakah tenggat 2 detik sama pada penerbit lain: [perlu verifikasi].

## Uji mutasi lab ini

Satu perubahan per mutan pada kode uang dan keamanan milik lab ini, pada salinan kerja di folder sementara (`tmp/mutasi_kartu.py`, skrip sementara, tidak di repo); schema tes dibangun ulang sebelum tiap mutan dan kode dipulihkan dengan membuat salinan baru. Hasil dibaca dari nama tes yang gagal (Go) atau dari pesan `GAGAL` lab (rekaman), bukan dari koneksi mati atau proses yang tidak menyala. Hasil: 52 dari 53 mutan tertangkap karena sebab yang diuji, dan satu setara perilaku (L13). 46 mutan diuji lewat tes Go, tujuh hanya terlihat oleh rekaman lab. PostgreSQL 17.11.

Mutan yang lolos di putaran awal dan membuat tes atau rekaman berubah:

- **L3** (buku pemilik dikunci tanpa `FOR UPDATE`) lolos karena dua goroutine tanpa lock hampir tidak pernah tumpang tindih. Tes `DuaIDMengantreDiLockSaldoDibacaSesudahLock` ditambah: lab memegang lock buku, menunggu sampai dua otorisasi terhitung mengantre lewat `pg_stat_activity` (disaring menurut `application_name`), baru melepasnya.
- **P11** (`ON CONFLICT` hanya pada `id_penerbit`) lolos karena tes serentak biasa tidak bertemu di jendela balapan. Tes dengan gerbang di titik sesudah-ledger diulang 40 kali menangkapnya, dan sekaligus menemukan kesalahan nyata di versi pertama kode: dua permintaan dengan id yang sama yang bertemu di titik itu kadang gagal dengan `23505` pada UNIQUE `jurnal_tahan_id` (jurnal tahan yang sama), bukan pada `id_penerbit`. Perbaikannya `ON CONFLICT DO NOTHING` tanpa sasaran.
- **K2** dan **K4** pertama kali tertangkap oleh `KeyError` di skrip lab (jawaban tanpa `alasan`), bukan oleh pesan `GAGAL`; pemeriksaannya diganti `.get`.
- Tes yang memegang lock bocor lock bila gagal di tengah: mutan L15 pernah menggantung seluruh paket sampai batas waktu `go test`. Semua tes yang memegang lock kini melepasnya lewat `t.Cleanup`.
- Dua mutan pertama tidak dikompilasi atau jangkarnya salah (L6 `status` tak terpakai, C4) dan ditulis ulang; yang tidak dikompilasi tidak dihitung.

L13 setara perilaku: hash permintaan tanpa akun tidak mengubah hasil karena akun dibandingkan terpisah (`a != akun` sesudah `IsiKunci`).

| Mutan | Bagian | Perilaku yang diubah | Tes atau rekaman yang menangkap | Hasil |
|---|---|---|---|---|
| L1 | hold di ledger | key boleh berbeda dari id_penerbit | `LedgerTahanKartuKeyBentrokDanValidasi` | tertangkap |
| L2 | hold di ledger | tanda posting hold dibalik | `LedgerTahanKartuDuaIDMengantreDiLockSaldoDibacaSesudahLock`, `LedgerTahanKartuDuaIDSerentakSatuSaldo` dan 2 lain | tertangkap |
| L3 | hold di ledger | buku pemilik dikunci tanpa FOR UPDATE | `LedgerTahanKartuDuaIDMengantreDiLockSaldoDibacaSesudahLock`, `LedgerTahanKartuDuaIDSerentakSatuSaldo` | tertangkap |
| L4 | hold di ledger | saldo tepat ditolak | `LedgerTahanKartuSaldoKurangTidakMenahanKey` | tertangkap |
| L5 | hold di ledger | saldo tidak diperiksa sesudah lock | `LedgerTahanKartuDuaIDMengantreDiLockSaldoDibacaSesudahLock`, `LedgerTahanKartuDuaIDSerentakSatuSaldo` dan 1 lain | tertangkap |
| L6 | hold di ledger | akun dibekukan boleh ditahan | `LedgerTahanKartuAkunDibekukanDanTidakAda` | tertangkap |
| L7 | hold di ledger | key tidak diikat ke jurnalnya | `LedgerTahanKartuKeyHabisSesudah24Jam`, `LedgerTahanKartuMenahanDanaSekaliPerKey` dan 1 lain | tertangkap |
| L8 | hold di ledger | lock_timeout tidak dipasang | `LedgerTahanKartuBukuDanaTertahanTerkunciMenolakSibuk`, `LedgerTahanKartuLockTimeoutSibuk` | tertangkap |
| L9 | hold di ledger | lock_timeout tidak dipetakan ke ErrLedgerSibuk | `LedgerTahanKartuBukuDanaTertahanTerkunciMenolakSibuk`, `LedgerTahanKartuLockTimeoutSibuk` | tertangkap |
| L10 | hold di ledger | key hidup 48 jam | `LedgerTahanKartuKeyHabisSesudah24Jam` | tertangkap |
| L11 | hold di ledger | key hidup 12 jam | `LedgerTahanKartuKeyHabisSesudah24Jam` | tertangkap |
| L12 | hold di ledger | hash permintaan tanpa jumlah | `LedgerTahanKartuKeyBentrokDanValidasi` | tertangkap |
| L13 | hold di ledger | hash permintaan tanpa akun | - | setara perilaku: akun dibandingkan terpisah dari hash (`a != akun` sesudah `IsiKunci`), jadi hash tanpa akun tidak mengubah hasil |
| L14 | hold di ledger | jumlah 0 diterima | `LedgerTahanKartuKeyBentrokDanValidasi` | tertangkap |
| L15 | hold di ledger | hold masuk buku settlement | `LedgerTahanKartuBukuDanaTertahanTerkunciMenolakSibuk`, `LedgerTahanKartuLockTimeoutBerlakuPerPenantianBukanPerTransaction` dan 1 lain | tertangkap |
| L16 | hold di ledger | jenis jurnal hold salah | `LedgerTahanKartuKeyBentrokDanValidasi`, `LedgerTahanKartuKeyHabisSesudah24Jam` dan 2 lain | tertangkap |
| H1 | API ledger | sibuk dijawab 500 | `LedgerKartuTahanLockDitahanMenjawab503SibukDanClientMemetakan` | tertangkap |
| H2 | API ledger | saldo kurang dijawab 409 | `LedgerKartuClientMemetakanJawaban`, `LedgerKartuTahanStatusDanAlasan` | tertangkap |
| H3 | API ledger | kunci layanan tidak diperiksa di rute hold | `LedgerKartuClientMemetakanJawaban`, `LedgerKartuTahanStatusDanAlasan` | tertangkap |
| H4 | API ledger | ulangan dijawab 201 | `LedgerKartuTahanBaruLaluUlangDanBentrok` | tertangkap |
| H5 | API ledger | Idempotency-Key tidak wajib di rute hold | `LedgerKartuTahanStatusDanAlasan` | tertangkap |
| H6 | API ledger | alasan akun dibekukan berubah | `LedgerKartuTahanStatusDanAlasan` | tertangkap |
| C1 | client ledger | 503 sibuk dipetakan ke tidak pasti | `LedgerKartuTahanLockDitahanMenjawab503SibukDanClientMemetakan` | tertangkap |
| C2 | client ledger | 422 bukan penolakan | `LedgerKartuClientMemetakanJawaban` | tertangkap |
| C3 | client ledger | Idempotency-Key tidak dikirim | `LedgerKartuClientMemetakanJawaban`, `LedgerKartuTahanBaruLaluUlangDanBentrok` dan 2 lain | tertangkap |
| C4 | client ledger | hold memanggil rute top-up | `LedgerKartuClientMemetakanJawaban`, `LedgerKartuTahanLockDitahanMenjawab503SibukDanClientMemetakan` | tertangkap |
| P1 | service pembayaran | kill switch tidak diperiksa | `KartuKillSwitchTanpaBarisDanTanpaLedger` | tertangkap |
| P2 | service pembayaran | id sama dengan jumlah lain dianggap ulangan | `KartuIDDipakaiUntukOtorisasiLainDitolak` | tertangkap |
| P3 | service pembayaran | id sama dengan kartu lain dianggap ulangan | `KartuIDDipakaiUntukOtorisasiLainDitolak` | tertangkap |
| P4 | service pembayaran | tepat di batas harian ditolak | `KartuDibekukanDanBatasHarianTanpaLedger` | tertangkap |
| P5 | service pembayaran | batas harian tidak diperiksa | `KartuDibekukanDanBatasHarianTanpaLedger` | tertangkap |
| P6 | service pembayaran | kartu dibekukan boleh menahan | `KartuDibekukanDanBatasHarianTanpaLedger` | tertangkap |
| P7 | service pembayaran | ledger sibuk menjadi galat | `KartuLedgerSibukDanTidakMenjawabDitolakTanpaBaris` | tertangkap |
| P8 | service pembayaran | ledger tidak menjawab disetujui (fail terbuka) | `KartuLedgerSibukDanTidakMenjawabDitolakTanpaBaris` | tertangkap |
| P9 | service pembayaran | penolakan saldo kurang tanpa baris | `KartuSaldoKurangDitolakDanDiulangTanpaLedger` | tertangkap |
| P10 | service pembayaran | hold berumur 8 hari | `KartuOtorisasiMenahanLewatLedgerLaluMenulisBaris` | tertangkap |
| P11 | service pembayaran | ON CONFLICT hanya pada id_penerbit (UNIQUE jurnal_tahan_id menabrak) | `KartuIDSamaDiTitikSesudahLedgerSatuBarisDuaJawabanSetuju` | tertangkap |
| P20 | service pembayaran | baris ditahan tanpa ON CONFLICT | `KartuIDSamaDiTitikSesudahLedgerSatuBarisDuaJawabanSetuju`, `KartuIDSamaSerentakSatuHoldSatuBaris` | tertangkap |
| P12 | service pembayaran | titik sesudah-ledger dihapus | `KartuMatiSesudahLedgerPulihLewatUlanganPenerbit` | tertangkap |
| P13 | service pembayaran | baris ditulis dengan konteks permintaan | `KartuBarisTetapDitulisBilaPenerbitSudahPergi` | tertangkap |
| P14 | service pembayaran | status baris sesudah hold salah | `KartuBarisTetapDitulisBilaPenerbitSudahPergi`, `KartuMatiSesudahLedgerPulihLewatUlanganPenerbit` dan 1 lain | tertangkap |
| P15 | service pembayaran | jurnal hold tidak disimpan di baris | `KartuBarisTetapDitulisBilaPenerbitSudahPergi`, `KartuMatiSesudahLedgerPulihLewatUlanganPenerbit` dan 1 lain | tertangkap |
| P16 | service pembayaran | kartu tak dikenal disetujui | `KartuTokenTidakDikenalDanValidasi` | tertangkap |
| P17 | service pembayaran | jumlah di atas batas wajar diterima | `KartuTokenTidakDikenalDanValidasi` | tertangkap |
| P18 | service pembayaran | penolakan dicatat sebagai ditahan | `KartuDibekukanDanBatasHarianTanpaLedger`, `KartuSaldoKurangDitolakDanDiulangTanpaLedger` | tertangkap |
| P19 | service pembayaran | alasan kill switch salah | `KartuKillSwitchTanpaBarisDanTanpaLedger` | tertangkap |
| K1 | satu proses (rekaman) | kedaluwarsa hold memakai kurang dari atau sama dengan | rekaman kedaluwarsa A: job tepat di batas memeriksa 1, harus 0 | tertangkap |
| K2 | satu proses (rekaman) | lock_timeout bawaan 3 detik (di atas tenggat) | rekaman tenggat A: setuju oleh timeout, harus tolak sibuk | tertangkap |
| K3 | satu proses (rekaman) | hold berumur 6 hari di versi satu proses | rekaman kedaluwarsa A: umur hold bukan 7 hari | tertangkap |
| K4 | satu proses (rekaman) | kill switch tidak berlaku | rekaman kill-switch A: disetujui, harus tolak kill-switch | tertangkap |
| T1 | penerbit tiruan (rekaman) | penerbit tiruan tidak menghormati tenggat | rekaman tenggat C: tolak oleh Rekeningo, harus setuju oleh timeout | tertangkap |
| T2 | penerbit tiruan (rekaman) | penerbit tiruan selalu menolak bila timeout | rekaman tenggat C: tolak oleh timeout, harus setuju | tertangkap |
| T3 | penerbit tiruan (rekaman) | otorisasi tidak dikirim ke service pembayaran | rekaman dua-service A: ledger menjawab 422, harus 200 ulang | tertangkap |

