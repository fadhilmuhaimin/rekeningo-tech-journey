# Lab t4-audit · audit log berantai, jangkar, hak role, persetujuan dua orang, dan server MCP baca-saja

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3, 3b, tabel "Yang harus bisa dibuktikan lab"; masalah M38; Keamanan 9; ADR 43; tugas `lab-t4-audit`). Lab ini membuktikan lewat rekaman apa yang terjadi pada catatan audit bila ia berupa tabel biasa lawan tabel berantai hash; apa yang dideteksi rantai dan apa yang tidak; apa yang ditambah jangkar di luar database dan di mana batasnya; siapa yang tertahan hak tabel dan siapa yang tidak; apa yang sebenarnya ditegakkan "persetujuan dua orang"; dan apa yang dikerjakan dan tidak dikerjakan server MCP baca-saja untuk agen back office.

Server, skema, dan data awal adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`), bukan salinan. Lab ini menambah kode di api-t4 (mode rentan `bo-log-biasa`, jangkar, job `auditjob`) dan satu modul Go terpisah untuk server MCP (`mcp/`, go.mod sendiri, supaya api-t4 tidak mendapat dependency baru), serta skenario di atasnya di schema sendiri `tahap4_audit` (tes Go di `tahap4_audit_tes`). Semua pihak ketiga tidak ada; tidak ada model bahasa, layanan, data, atau kredensial nyata. Lab ini bukan uji kapasitas dan tidak mengklaim kepatuhan atau izin apa pun.

## Menjalankan

```bash
make -C labs/t4-audit run                      # semua bagian, ±25 detik, menulis labs/t4-audit/output/*.txt
make -C labs/t4-audit run BAGIAN=jangkar       # satu bagian: rantai jangkar role persetujuan mcp testing
make -C labs/t4-audit cek                      # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Butuh Docker dan Go; PostgreSQL lewat `labs/b3-race`. Port server MCP dasar 18300 (dan 18301 untuk satu perbandingan versi protokol), ditambah `LAB_PORT_OFFSET`; port api-t4 sama dengan `api-t4`, jadi lab ini tidak berjalan serentak dengan `api-t4` atau lab Tahap 4 lain yang berbagi server itu di satu lajur. Setiap bagian membuat ulang schema, tiga role (`t4a_pemilik`, `t4a_verifikator`, `t4a_agen`), dan data awal dari nol. Role bersifat global di klaster database: skrip membuang dan membuatnya lagi tiap kali, supaya hak sisa dari run lain tidak ikut. Hash baris audit bergantung pada waktu aksi, jadi hash tidak direkam; yang direkam adalah hasil pemeriksaannya. Token sesi, waktu, dan hash disamarkan, sehingga rekaman ulang identik per byte.

## Versi dasar dan sumber (dicek 2026-10-28)

| Komponen | Versi atau sumber | Catatan |
|---|---|---|
| MCP spesifikasi | 2026-07-28 (halaman `modelcontextprotocol.io/specification/2026-07-28`, dibuka 2026-10-28; rilis spesifikasi 2026-07-28 di GitHub) | Dipakai: Security Best Practices ("Token passthrough": server MCP "MUST NOT accept any tokens that were not explicitly issued for the MCP server"), Tools (client harus menganggap anotasi alat tidak tepercaya kecuali dari server tepercaya; alat yang tidak ada adalah galat protokol -32602), dan modelnya yang tanpa sesi (setiap permintaan membawa `_meta`) |
| go-sdk MCP | v1.8.0 (`proxy.golang.org`, tag diterbitkan 2026-09-04; GitHub Release 2026-09-14, rilis stabil terbaru saat lab ditulis); README SDK: v1.7.0 ke atas mendukung spesifikasi 2026-07-28 | `go.sum`: `h1:` dan `go.mod h1:` go-sdk v1.8.0 tercetak di `output/testing.txt`; `go mod verify` lolos. Dependency tidak langsung dari go-sdk: jsonschema-go v0.4.3, segmentio/encoding v0.5.4, uritemplate v3.0.2, oauth2 v0.35.0, x/time v0.15.0 (dari `go.mod` SDK). Lisensi: berkas `LICENSE` v1.8.0 menyebut peralihan dari MIT ke Apache-2.0 (kode baru Apache-2.0, kontribusi lama tetap MIT sampai ada izin relisensi), dan GitHub tidak memberi satu pengenal SPDX; untuk lab ini cukup, untuk produk perlu ditinjau [perlu verifikasi]. Modul ini hanya dipakai lab (`labs/t4-audit/mcp`), bukan api-t4 |
| PostgreSQL, Go, pgx | 17.11, go1.27.1, v5.11.0 | dari kepala rekaman dan `go.mod`; sama dengan `lab-api-t4` |
| Hak tabel PostgreSQL 17 | dokumentasi `GRANT` dan `SELECT` (versi 17.11, dibuka 2026-10-28) | Pemilik objek punya semua hak dan boleh mencabutnya dari dirinya; superuser melewati semua pemeriksaan hak; `TRUNCATE` hak tersendiri; `FOR UPDATE` butuh hak `UPDATE` |
| Log tahan ubah | Crosby dan Wallach, "Efficient Data Structures for Tamper-Evident Logging" (USENIX Security 2009, dibuka 2026-10-28) | Tujuannya mendeteksi, bukan mencegah; deteksi butuh pengawasan; pencatat tidak tepercaya bebas memberi riwayat berbeda bila tidak ada komitmen yang dipegang pihak lain |
| Python (hanya skrip rekaman) | 3.14.7, psycopg 3.3.6; modul standar `hashlib`, `urllib` | `labs/.venv`; `vektor.py` menghitung hash dengan implementasi ketiga |

Dependency baru: satu, go-sdk v1.8.0, hanya di `labs/t4-audit/mcp`. `labs/api-t4/go.mod` tidak berubah.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `rantai.txt` | (a) Versi pertama tanpa catatan: dua akun, satu dibuka enam aksi dan satu tidak pernah disentuh, dijawab sama (nol baris). Log biasa: tercatat, tetapi role dengan hak tulis menggeser pelaku dan menghapus satu baris tanpa jejak. Log berantai: pemilik tabel (bukan superuser) mengubah satu baris (terdeteksi di baris itu), menambah baris palsu dengan hash yang ia hitung sendiri (lolos), dan menghapus satu baris di tengah (terdeteksi di baris sesudahnya) | 4.24, 4.25 |
| `jangkar.txt` | (b) Jangkar harian di file di luar database, dicatat oleh `auditjob` sebagai role baca-saja: ekor dipotong (lolos tanpa jangkar, terdeteksi dengan jangkar); baris tengah ditulis ulang dan rantai dihitung ulang sampai ujung (lolos tanpa jangkar, terdeteksi dengan jangkar); perubahan sesudah jangkar terakhir (tidak dicakup); penyerang yang juga memangkas atau menghapus file jangkar (lolos); file jangkar rusak (pemeriksaan gagal) | 4.25 |
| `role.txt` | (c) Sebagai `api_t4`: `UPDATE`, `UPDATE ... WHERE false`, `DELETE`, `TRUNCATE`, `SELECT ... FOR UPDATE` ditolak (SQLSTATE 42501), begitu juga `DISABLE TRIGGER`, `OWNER TO`, dan `DROP TABLE` ("must be owner"); audit_log tidak berubah. Sisi yang melewati: pemilik tabel non-superuser dan superuser mengubah dan menghapus baris; pemilik mencabut hak dirinya lalu memberikannya lagi; membaca tabel verifikasi sebagai pemilik schema tidak meninggalkan baris audit. Matriks hak role baca-saja. Jalan memutar tambahan sebagai `api_t4`: `INSERT ... ON CONFLICT DO UPDATE`, `MERGE ... UPDATE`, dan `CREATE TRIGGER` ditolak. Bagian E: yang tidak ditahan hak tabel, yaitu `INSERT` oleh role aplikasi (baris yang tak pernah terjadi, dengan hash yang benar, lolos pemeriksaan harian) | 4.25 |
| `persetujuan.txt` | (d) Pembekuan darurat satu staf dengan alasan wajib dan penyetuju kosong; buka blokir dan ubah batas ditolak untuk tujuh cara yang salah (tanpa token, token sendiri, sesi kedua akun yang sama, token user, token karyawan, token sembarang, penyetuju yang dibekukan) tanpa status berubah dan tanpa baris audit; satu token penyetuju yang sama menyetujui dua aksi berbeda atas dua akun; batas pembekuan (akun risk dan admin, pembekuan ganda) | 4.25 |
| `mcp.txt` | (e)(f) Versi protokol yang dinegosiasikan, kapabilitas, empat alat baca-saja; JSON-RPC mentah tanpa SDK client; enam alat tulis yang tidak ada ditolak dengan galat -32602 tanpa perubahan apa pun di database; alat baca menjawab "siapa yang membuka data Dina"; isi catatan berisi instruksi dikembalikan sebagai data; argumen bermusuhan; token sesi back office ditolak server MCP dan token agen ditolak back office; token tidak muncul di log; role agen tidak bisa menulis. Perilaku model terhadap isi catatan: Tidak dijalankan | 4.25 |
| `testing.txt` | `go vet` dan tes Go bertag `t4audit` di api-t4 dan di modul MCP, daftar tes yang muncul PASS, `go mod verify`, dan checksum go-sdk | 4.25 |

## Yang ditambahkan ke api-t4 oleh lab ini

- **Mode rentan `bo-log-biasa`** (M38): aksi back office yang sama dicatat di tabel biasa `audit_biasa` (DDL di `internal/repo/audit_biasa.sql`, dibuat lab dan tes, bukan migration), tanpa hash. `bo-tanpa-audit` yang sudah ada tetap tidak mencatat apa pun.
- **Jangkar** (`internal/repo/audit_jangkar.go`, `internal/jangkar`, `cmd/auditjob`): `VerifikasiAuditJangkar` menghitung ulang rantai dan mencocokkan tiap jangkar dalam satu lintasan (`baris-hilang`, `hash-beda`); `jangkar.Jalankan` hanya mencatat jangkar baru (baris terakhir dari lintasan yang sama) bila rantai utuh dan semua jangkar lama cocok, dan tidak menambah jangkar bila baris terakhir sudah dijangkarkan; file jangkar hanya bertambah dan jangkar yang rusak membuat pemeriksaan gagal, bukan dilewati. `auditjob` keluar 0 (sehat), 2 (rantai putus atau jangkar tidak cocok), atau 1 (gagal dijalankan).
- **`HasilVerifikasiAudit.IDTerakhir`**: nomor baris terakhir dari lintasan verifikasi, supaya jangkar tidak diambil dari pembacaan kedua.
- **`peran.sql`**: pemilik `audit_log` yang bukan superuser (`t4a_pemilik`), role pemeriksa harian (`t4a_verifikator`, hanya `SELECT audit_log`), role agen (`t4a_agen`: `SELECT audit_log`, kolom `id, jenis, status, tingkat` dari `akun`, kolom `id, akun_id, subjek, status` dari `verifikasi`; tanpa nama, surel, hash password, kunci objek file, checksum, dan tabel `sesi`), dan hak penuh `api_t4` atas `audit_biasa` (setelan versi pertama).
- **Tes Go bertag `t4audit`** (tidak ikut `api-t4/output/testing.txt`): `internal/repo/audit_t4audit_test.go`, `internal/jangkar/jangkar_t4audit_test.go`, `internal/service/bo_t4audit_test.go`. Dijalankan `-p 1`, karena paket-paket itu mengosongkan `audit_log` di schema tes yang sama.
- **Modul MCP** (`mcp/`): `agen/agen.go` (server, empat alat, verifier token), `cmd/agen` (server HTTP), `cmd/klien` (client go-sdk tanpa model), `agen/agen_test.go`. Rumus hash ditulis ulang di modul ini dan diperiksa terhadap `vektor-hash.json`, yang dihitung `vektor.py` (Python): tiga implementasi (api-t4, modul MCP, Python) harus sama.

## Server MCP baca-saja: apa yang ada dan apa yang bukan jaminan

- **Alat**: `cari_audit`, `siapa_membuka`, `ringkasan_akun`, `verifikasi_rantai`; semuanya berpetunjuk `readOnlyHint`. Petunjuk itu bukan jaminan (spesifikasi: anotasi tidak tepercaya kecuali dari server tepercaya). Jaminannya tiga lapis yang diperiksa: tidak ada alat tulis (daftar alat, galat -32602 untuk alat yang tidak ada, dan tes yang memindai sumber: hanya empat `AddTool`, tanpa resource, prompt, perintah SQL tulis, `Exec`, atau transaction); kredensial database server adalah role `t4a_agen` yang tidak punya hak tulis (`mcp.txt` bagian G, `role.txt` bagian D); dan server tidak menafsirkan isi data sebagai perintah.
- **Token**: server menerima satu token agen (dibandingkan dalam waktu tetap) dan menolak token lain, termasuk token sesi back office, karena token itu tidak diterbitkan untuknya. Token agen tidak berlaku di back office. Token masuk tidak dikirim ke tempat mana pun: satu-satunya jalan keluar server adalah koneksi PostgreSQL dengan kredensial role `t4a_agen` miliknya sendiri. Yang membuktikan: tes memindai sumber (tanpa client HTTP, tanpa `exec`, tanpa pembacaan header selain di verifier), token kenari tidak muncul di hasil alat maupun log server, dan semua koneksi database server memakai identitas `t4a_agen`.
- **Yang tidak terbukti**: jalur HTTP hilir (di lab hilirnya PostgreSQL, bukan API HTTP), pertukaran token atas nama pemanggil (token exchange), validasi audience token OAuth, dan batas laju per agen: Tidak dijalankan.
- **Versi protokol**: dengan opsi bawaan go-sdk (sesi) client yang sama jatuh kembali ke handshake lama dan memakai 2025-11-25 (`mcp.txt` bagian A). Dengan `Stateless: true` (tanpa sesi, sesuai spesifikasi 2026-07-28) versi yang dinegosiasikan 2026-07-28. Server lab memakai mode tanpa sesi; `-berstatus` hanya untuk perbandingan.
- **Kapabilitas**: go-sdk v1.8.0 mengumumkan `logging` bila `Capabilities` tidak diisi. Server lab menimpanya: hanya `tools`, daftarnya tidak berubah.

## Hal yang dikirim skrip lab, bukan akibat sistem

- **Skrip berperan sebagai penyerang dengan hak tulis.** `UPDATE`, `DELETE`, dan `INSERT` atas `audit_log` sebagai `t4a_pemilik` atau `lab` adalah perintah SQL dari skrip. Pemotongan ekor, penulisan ulang, dan baris palsu tidak terjadi karena sistem salah; mereka memperlihatkan apa yang terdeteksi bila seseorang dengan hak itu melakukannya.
- **Hash dihitung ulang oleh skrip.** Untuk penulisan ulang dan baris palsu, skrip memakai `vektor.hash_baris` (rumus yang sama dengan kode), bukan program api-t4. Penulisan ulang di `jangkar.txt` bagian C dijalankan sebagai `t4a_pemilik`; menyalin log dari `audit_salinan` ke `audit_log` (memerankan hari) dan memotong log (`TRUNCATE`) dijalankan sebagai pemilik schema lab (superuser) dan bukan bagian dari serangan yang diperlihatkan.
- **Hari diperankan.** "Hari 1, 2, 3" di `jangkar.txt` adalah log yang dipulihkan dari salinan (`audit_salinan`) sampai baris tertentu, lalu `auditjob` dijalankan. Tidak ada jam harian yang berjalan.
- **Sesi dan pembekuan.** Sesi kedua Ratih adalah login kedua; pembekuan Tim Risk Dua di `persetujuan.txt` adalah SQL dari pemilik schema.
- **Isi catatan berbunyi perintah** ditulis skrip lewat endpoint back office atas nama Ratih. Itu bukan serangan nyata dan tidak ada model yang membacanya.
- **Pemilik data** di rekaman adalah Dina (akun publik 40001), yang punya pengajuan verifikasi dan file. Naskah M38 memakai Budi; di data awal Budi karyawan terverifikasi lewat HR tanpa file identitas.
- **Password role dan akun** adalah data lab (`dasar_t4.PASSWORD`, `t4a_*:t4a_*`), bukan secret.

## Selisih dengan naskah

Naskah tidak diubah (usulan masuk badan PR, `### USULAN-CERITA`). Yang rekaman perlihatkan dan naskah belum tulis:

1. **Rantai tanpa kunci rahasia bukan tanda tangan.** Naskah menulis "UPDATE pada baris tengah log berantai: verifikasi gagal di baris itu". Itu benar untuk perubahan yang tidak menghitung ulang hash. Penulis yang menghitung ulang hash dari baris yang ia ubah sampai ujung membuat verifikasi lolos (`jangkar.txt` bagian C), dan baris palsu di ujung dengan hash yang benar juga lolos (`rantai.txt` bagian C). ADR 43 menyebut hanya "pelaku yang bisa menulis ulang seluruh rantai termasuk jangkar".
2. **Jangkar mencakup baris sampai saat dicatat.** Yang dihapus atau ditulis ulang sesudah jangkar terakhir dan sebelum jangkar berikutnya tidak terdeteksi, dan jangkar berikutnya dicatat dari keadaan yang sudah berubah (`jangkar.txt` bagian D). "Jangkar harian" berarti jendela sampai satu hari.
3. **File jangkar yang hilang dibaca "belum ada jangkar".** Pemeriksaan tidak bisa membedakannya dari hari pertama (`jangkar.txt` bagian E). Dalam produksi, hilangnya jangkar harus menjadi peringatan tersendiri: belum dikerjakan.
4. **"Persetujuan dua orang" yang ditegakkan kode adalah dua akun risk berbeda dan aktif.** Pelaku dan penyetuju dibandingkan menurut nomor akun, bukan orangnya (Asumsi satu akun satu orang). Satu token penyetuju menyetujui dua aksi berbeda atas dua akun (`persetujuan.txt` bagian D): penyetuju tidak diminta menyetujui aksi tertentu. Antrean persetujuan tidak ada (skema naskah tidak punya tabelnya).
5. **Percobaan yang ditolak tidak meninggalkan baris audit.** Hanya aksi yang berhasil tercatat. Naskah menulis "setiap akses staf ke file dan data identitas tercatat" (P0); percobaan yang ditolak (mis. akun non-risk) tidak tercatat di `audit_log`. Apakah log aplikasi biasa mencatatnya tidak diperiksa [perlu verifikasi].
6. **Kolom `alasan` adalah teks bebas dari manusia.** Log yang hanya bertambah berisi apa pun yang diketik staf, termasuk (bila staf menuliskannya) data pribadi, dan tidak ada penyaring. Tidak dijalankan.
7. **ADR 43 menulis "bekukan lebih dari 24 jam" sebagai aksi berisiko.** Kode tidak membedakan lamanya: semua pembekuan wajib alasan, tidak butuh penyetuju, dan tidak kedaluwarsa sendiri.
8. **Peran `cs`, `keuangan`, `admin-sistem` tetap tidak ada** (hanya `risk`), seperti di README `api-t4`.
9. **go-sdk dan spesifikasi.** Naskah menulis "spesifikasi 2026-07-28 dan go-sdk v1.8.0". Kombinasi itu benar bila server HTTP berjalan tanpa sesi; dengan opsi bawaan SDK client memakai 2025-11-25 (`mcp.txt` bagian A).
10. **Keadaan awal M38 di naskah bukan persis dua mode lab.** Naskah menulis back office versi pertama dengan satu akun bersama dan log aplikasi yang mencatat sebagian aksi tetapi tidak pembacaan file. Lab memakai akun petugas masing-masing, `bo-tanpa-audit` (tidak ada catatan sama sekali) dan `bo-log-biasa` (semua aksi tercatat, termasuk membuka berkas, tanpa hash). Jawaban "tidak ada catatan sama nilainya dengan tidak tahu" terbukti dalam bentuk yang lebih kuat (nol baris untuk akun yang disentuh dan yang tidak); "sebagian aksi tercatat" tidak direkam.

## Yang belum ada di lab ini

- **Tempat jangkar yang tidak bisa ditulis siapa pun yang bisa menulis log** (akun atau bucket lain dengan hak tulis-sekali), jadwal harian nyata, peringatan bila file jangkar hilang atau menyusut: Tidak dijalankan. Di lab, "di luar database" adalah satu file di folder sementara.
- **Kunci rahasia atas baris** (HMAC atau tanda tangan dengan kunci yang tidak dipegang aplikasi), pohon riwayat (Merkle) dengan bukti logaritmik, log di penyimpanan yang tak bisa diubah di luar database, dan ekstensi audit seperti pgaudit: Tidak dijalankan.
- **Akses langsung ke database lewat role baca per modul dengan sesi tercatat** (ADR 43): ada di `t4-modul` sebagai pembagian role, tetapi pencatatan sesinya tidak dijalankan.
- **Agen LLM nyata**, perilaku model terhadap isi catatan yang berisi instruksi (prompt injection tidak langsung), dan kontrol yang bergantung pada model: Tidak dijalankan. Yang dibuktikan hanya kontrol deterministik.
- **OAuth penuh di server MCP** (audience, resource indicator, scope), token exchange atas nama pemanggil, batas laju per agen, dan tanda persetujuan manusia untuk pemanggilan alat (spesifikasi menyarankan manusia dalam lingkaran): Tidak dijalankan.
- **Lintas instance.** `auditjob` satu proses dan tidak menyerialkan dirinya dengan penulis audit; dua `auditjob` serentak bisa menambah jangkar yang sama dua kali (tidak merusak, karena baris yang sama). Tidak dijalankan.
- **Urutan menurut waktu.** Rantai menjaga urutan nomor, bukan jam: waktu aksi diisi service dan tidak diverifikasi terhadap sumber waktu luar.
- **Antrean persetujuan per aksi, peran tambahan, dan tampilan back office:** Tidak dijalankan.
- **Validasi header `Origin` dan penyaringan keluaran alat.** Spesifikasi 2026-07-28 meminta server Streamable HTTP memvalidasi `Origin` (DNS rebinding) dan, di bagian keamanan alat, menyaring keluaran alat; server lab hanya mendengar di 127.0.0.1, tidak memeriksa `Origin` sendiri, dan mengembalikan isi `alasan` apa adanya sebagai data. Tidak dijalankan.
- **Penyandian hash baris.** `HashAudit` memisahkan kolom dengan 0x1f tanpa menyandikan panjang kolom, sehingga teks yang memuat 0x1e atau 0x1f bisa menggeser batas antar kolom tanpa mengubah hash. Tidak terjangkau lewat service (`periksaAlasan` menolak semua karakter kontrol, `objek` dibentuk dari angka dan kata tetap) dan dikunci tes; kolom bebas baru atau jalur lain ke `audit_log` perlu penyandian dengan panjang.
- **Pembuktian di sisi database untuk dua orang.** Aturan penyetuju ditegakkan kode service; `api_t4` punya hak `UPDATE` atas kolom `status` di `akun` dan kolom `batas_harian` di `buku` (`dasar_t4.py`), jadi aplikasi yang diambil alih tidak butuh penyetuju. Rekaman `persetujuan.txt` membuktikan perilaku kode, bukan pagar database.

## Uji mutasi

Dijalankan pelaksana lab ini: 57 mutan baru, satu perubahan per mutan pada salinan terpisah di folder sementara (`mutasi/jalankan.py`, daftar di `mutasi/daftar.py`; bisa diulang peninjau). Schema tes, role, dan `audit_log` dibangun ulang sebelum tiap mutan, karena `audit_log` append-only dan role bersifat global: satu mutan yang menulis hash lain meracuni run berikutnya. Hasil dibaca dari nama tes yang gagal atau dari pesan `run.py` yang gagal keras atau rekaman yang berbeda, bukan dari koneksi yang mati. Lima mutan pertama (R1, O1, O2, O3, O9) tidak dikompilasi atau jangkarnya salah, lalu diulang dalam bentuk yang sah.

Hasil pelaksana: 56 dari 57 tertangkap (30 kali oleh tes Go api-t4 bertag `t4audit`, 16 kali oleh tes modul MCP, 22 kali oleh rekaman lab; satu mutan bisa tertangkap beberapa runner). Satu lolos dan dianggap setara: K9 membuang `Sync` sesudah menulis jangkar, dan durabilitas tulisan tidak bisa diuji tanpa mematikan proses atau mesin. Dua kelas bug punya tes sendiri sebelum uji mutasi dijalankan, karena sering terlewat: pelaporan baris pertama yang putus (V1; `MelaporkanBarisPutusPertama`) dan perbandingan hash yang menormalkan bentuk (huruf besar, spasi; `MenolakHashBerbentukLainWalauNilainyaSama`, K1). Di antara tes bertag t4audit, mutan O3 (penyetuju yang dibekukan) semula hanya tertangkap rekaman `persetujuan.txt`; tinjauan menambah `PenyetujuYangDibekukanDitolak`.

| Kode | File | Mutan | Ditangkap oleh |
|---|---|---|---|
| H1 | `internal/repo/audit.go` | hash tanpa pemisah sesudah hash sebelumnya | `VektorHashDariPython` |
| H2 | `internal/repo/audit.go` | pemisah antar kolom diganti 0x1e | `VektorHashDariPython` |
| H3 | `internal/repo/audit.go` | alasan tidak ikut hash | `JangkarMendeteksiRantaiYangDitulisUlangSampaiUjung` |
| H4 | `internal/repo/audit.go` | pelaku dan peran tertukar urutan di hash | `VektorHashDariPython` |
| V1 | `internal/repo/audit.go` | verifikasi melaporkan baris putus terakhir, bukan yang pertama | `RantaiMelaporkanBarisPutusPertama` |
| V2 | `internal/repo/audit.go` | tanpa pemeriksaan sambungan hash sebelumnya | `RantaiBarisTengahDiubahDihapusDanBarisPalsuDiUjung` |
| V3 | `internal/repo/audit.go` | tanpa hitung ulang hash dari isi baris | `JalankanTidakMenjangkarkanKeadaanRusak` |
| V4 | `internal/repo/audit.go` | nomor baris terakhir tidak dicatat | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| V5 | `internal/repo/audit.go` | hash terakhir tidak diperbarui tiap baris | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| V6 | `internal/repo/audit.go` | log dibaca menurun menurut nomor | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| R1 | `internal/repo/audit_jangkar.go` | temuan baris-hilang tidak pernah muncul | `JalankanTidakMenjangkarkanKeadaanRusak` |
| R2 | `internal/repo/audit_jangkar.go` | jangkar yang cocok dianggap beda, dan sebaliknya | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| R3 | `internal/repo/audit_jangkar.go` | label temuan baris-hilang diganti hash-beda | `JalankanTidakMenjangkarkanKeadaanRusak` |
| R4 | `internal/repo/audit_jangkar.go` | jangkar tidak ikut dicocokkan | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| K1 | `internal/jangkar/jangkar.go` | hash huruf besar diterima di file jangkar | `BerkasJangkarRusakDitolak` |
| K2 | `internal/jangkar/jangkar.go` | nomor jangkar 0 diterima | `BerkasJangkarRusakDitolak` |
| K3 | `internal/jangkar/jangkar.go` | baris jangkar rusak dilewati | `BerkasJangkarRusakDitolak` |
| K4 | `internal/jangkar/jangkar.go` | file jangkar ditimpa, bukan ditambah | `BerkasJangkarHanyaBertambahDanUrut` |
| K5 | `internal/jangkar/jangkar.go` | keadaan yang rusak tetap dijangkarkan | `JalankanTidakMenjangkarkanKeadaanRusak` |
| K6 | `internal/jangkar/jangkar.go` | jangkar yang sama ditambah dua kali | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| K7 | `internal/jangkar/jangkar.go` | `Sehat` memakai OR | `JalankanTidakMenjangkarkanKeadaanRusak` |
| K8 | `internal/jangkar/jangkar.go` | log kosong menghasilkan jangkar | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali` |
| K9 | `internal/jangkar/jangkar.go` | `Sync` dibuang sesudah menulis jangkar | lolos: setara perilaku (durabilitas tulisan tidak bisa diuji tanpa mematikan proses) |
| K10 | `internal/jangkar/jangkar.go` | file jangkar yang belum ada menjadi galat | `BerkasJangkarBelumAdaBerartiBelumAdaJangkar`; rekaman jangkar |
| K11 | `cmd/auditjob/main.go` | `auditjob` keluar 0 untuk keadaan rusak | rekaman jangkar |
| K12 | `internal/jangkar/jangkar.go` | jangkar baru memakai hash yang salah | `JalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali`; rekaman jangkar |
| O1 | `internal/service/bo.go` | sesi web diterima sebagai penyetuju | `PenyetujuBersesiWebDitolak` |
| O2 | `internal/service/bo.go` | penyetuju boleh akun yang sama dengan pelaku | `SesiKeduaPelakuBukanPenyetujuKedua`; rekaman persetujuan |
| O3 | `internal/service/bo.go` | penyetuju yang dibekukan diterima | rekaman persetujuan |
| O4 | `internal/service/bo.go` | akun admin bisa dibekukan | rekaman persetujuan |
| O5 | `internal/service/bo.go` | ubah batas tanpa penyetuju | `PersetujuanTidakTerikatPadaSatuAksi`; rekaman persetujuan |
| O6 | `internal/service/bo.go` | alasan minimal 1 karakter | rekaman persetujuan |
| O7 | `internal/service/bo.go` | token penyetuju kosong diterima | rekaman persetujuan |
| O8 | `internal/service/bo.go` | pembekuan darurat mencatat penyetuju | rekaman persetujuan |
| O9 | `internal/service/bo.go` | buka blokir tidak mencatat penyetuju | `PersetujuanTidakTerikatPadaSatuAksi`; rekaman persetujuan |
| L1 | `internal/service/t4_audit.go` | mode log biasa juga menulis ke audit_log | `ModeLogBiasaMenulisKeTabelBiasaDanBukanKeAuditLog` |
| L2 | `internal/repo/audit_biasa.go` | pelaku dan penyetuju tertukar di log biasa | `ModeLogBiasaMenulisKeTabelBiasaDanBukanKeAuditLog`; rekaman rantai |
| P1 | `dasar_t4.py` | `api_t4` mendapat UPDATE atas audit_log | rekaman role |
| P2 | `peran.sql` | agen mendapat UPDATE kolom status akun | `RoleAgenTidakBisaMenulisDanTidakMembacaDataIdentitas`; rekaman role |
| P3 | `peran.sql` | agen mendapat SELECT kolom email | `RoleAgenTidakBisaMenulisDanTidakMembacaDataIdentitas`; rekaman role |
| P4 | `peran.sql` | audit_log tidak dipindah ke pemilik non-superuser | rekaman role; rekaman rantai |
| P5 | `peran.sql` | pemeriksa harian mendapat INSERT | rekaman role |
| P6 | `peran.sql` | agen mendapat DELETE atas audit_log | `RoleAgenTidakBisaMenulisDanTidakMembacaDataIdentitas`; rekaman role |
| P7 | `peran.sql` | agen mendapat SELECT checksum_kartu | `RoleAgenTidakBisaMenulisDanTidakMembacaDataIdentitas` |
| P8 | `peran.sql` | `api_t4` kehilangan UPDATE dan DELETE atas audit_biasa | rekaman rantai |
| M1 | `mcp/agen/agen.go` | alat kelima (`bekukan_akun`) dipasang | `DaftarAlatPersisBacaSajaDanTanpaFiturLain` |
| M2 | `mcp/agen/agen.go` | petunjuk `readOnlyHint` false | `DaftarAlatPersisBacaSajaDanTanpaFiturLain` |
| M3 | `mcp/agen/agen.go` | perbandingan token terbalik | `TokenMasukTidakDiteruskanDanTokenLainDitolak` |
| M4 | `mcp/agen/agen.go` | server tanpa token yang dikonfigurasi menerima token kosong | `VerifierMenolakTokenKosongBahkanBilaDiharapkanKosong` |
| M5 | `mcp/agen/agen.go` | server mencatat header Authorization ke log | `SumberTidakMemuatAlatTulisResourcePromptAtauKlienKeluar` |
| M6 | `mcp/agen/agen.go` | pencarian objek memakai LIKE awalan | `ArgumenBermusuhanBukanSQL` |
| M7 | `mcp/agen/agen.go` | batas maksimum jumlah baris dibuang | `BatasJumlahBaris` |
| M8 | `mcp/agen/agen.go` | `siapa_membuka` tanpa filter aksi baca | `CariAuditSiapaMembukaDanBatas` |
| M9 | `mcp/agen/agen.go` | kapabilitas bawaan SDK (logging) tidak ditimpa | `DaftarAlatPersisBacaSajaDanTanpaFiturLain`; rekaman mcp |
| M10 | `mcp/agen/agen.go` | server berstatus (opsi bawaan SDK) | `TokenMasukTidakDiteruskanDanTokenLainDitolak`; rekaman mcp |
| M12 | `mcp/agen/agen.go` | rumus hash modul MCP memakai milidetik | `HashBarisCocokDenganVektorPython` |
| M13 | `mcp/agen/agen.go` | verifikasi MCP tanpa sambungan hash sebelumnya | `VerifikasiRantaiUtuhPutusDanTepi` |

### Mutan peninjau

Dijalankan peninjau dengan tambahan 54 mutan (seri Q, W, B, G, N di `mutasi/daftar.py`; runner `luas` menjalankan juga tes api-t4 tanpa tag untuk back office dan audit). Tiap `lama` muncul tepat sekali di berkasnya, dan tanpa perubahan harness lolos. Seluruh 111 mutan diulang sesudah gabung main (tiga tes terakhir ditambah sesudahnya, dan Q5, B6, B9 diulang): 107 tertangkap, 4 setara.

| Mutan | Apa yang diubah | Yang menangkap sekarang |
|---|---|---|
| Q10, Q11 | verifikasi memotong waktu ke detik; verifikasi membuang `penyetuju_id` dari hitungan | `RantaiMendeteksiPerubahanDiSetiapKolomYangDiHash`, `RantaiWaktuDenganPecahanSubDetik` (semula hanya tes tanpa tag) |
| Q5 | kunci advisory penulis dibuang | `RantaiPenulisSerentakTidakBercabang` (semula hanya tes tanpa tag) |
| W1, W2 | regex hash jangkar tanpa `^` atau dengan `{64,}` | `BerkasJangkarRusakDitolak` (kasus berawalan dan terlalu panjang) |
| W3 | semua galat membuka berkas jangkar dibaca "belum ada jangkar" | `BerkasJangkarYangTidakBisaDibacaMenggagalkanPembacaan` |
| W4 | galat pemindai (baris lebih dari 1 MiB) dibuang | `BerkasJangkarBarisTerlaluPanjangMenggagalkanPembacaan` |
| B1, B2 | `periksaAlasan` menerima 0x1f atau 0x7f | `AlasanMenolakKarakterKontrolTermasukPemisahHash` |
| B4, B5 | tepi bawah dan atas batas harian | `UbahBatasHarianDiTepiRentang` |
| B6 | petugas risk yang dibekukan boleh bertindak | `PetugasRiskYangDibekukanTidakBisaBertindak` (semula hanya tes tanpa tag) |
| B9 | batas atas panjang alasan 3.000 | `AlasanMenolakKarakterKontrolTermasukPemisahHash` (semula hanya tes tanpa tag) |
| G3 | agen membaca kunci objek swafoto | `HakRoleBacaSajaPersisSamaDenganDaftarPutih`, rekaman `role.txt` |
| N2, N4 | `siapa_membuka` mencocokkan awalan nomor akun; `BatasBawaan` 21 | `BatasBawaanDanAwalanTidakBocorLintasAkun` |
| N16, N17 | `http.Head` atau `http.Post` di sumber server MCP | `SumberHanyaMemakaiRujukanHttpYangDiizinkanUntukServer` |

Setara (tidak bisa dibedakan dari perilaku asli): K9 (`Sync`), Q13 (`TrimSpace` pada `hash_sebelumnya`: hash baris dihitung dari nilai yang tidak dipangkas, jadi baris tetap putus), N13 dan N14 (`Utuh` selalu ditimpa dari `RusakDiID`; `Baris == 0` berarti `RusakDiID == 0`). Hanya rekaman yang menangkap: K11, O4, O6, O7, O8, P1, P4, P5, P8, W6, W7, B8, G1, G5 sampai G9, N5, N8, N12; tes bertag yang menjaga hal yang sama belum ada.

Tidak termasuk: mutasi atas `vektor.py` dan `run.py` (alat lab; tiga implementasi hash saling dibandingkan lewat `vektor-hash.json`, dan bila salah satu salah, tes atau rekaman gagal).

