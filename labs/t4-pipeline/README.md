# Lab t4-pipeline · pemeriksaan merge per modul atas kontrak dan image api-t4

Lab Tahap 4 untuk ADR 44 (`plan/CERITA-TAHAP-4.md` bagian 3 dan "Yang harus bisa dibuktikan lab", tugas `lab-t4-pipeline`, sumber halaman 4.26). Pertanyaannya: apa yang sungguh ditangkap tiap alat yang disebut ADR 44 ketika satu PR mengubah kontrak OpenAPI, kode, dependensi, atau image `api-t4`, dan di mana gerbang yang memakainya lolos palsu.

Lima pemeriksaan direkam dari alat sungguhan, masing-masing dengan kasus yang disiapkan dan kasus tandingannya:

1. **Kontrak**: `oasdiff breaking` atas dua versi kontrak `labs/api-t4/openapi.yaml`, termasuk dua isu terbuka di proyek alatnya.
2. **Client Dart**: client dibuat ulang dari kontrak dengan `openapi-generator` (image resmi) dan diff-nya diperiksa.
3. **SAST dan audit dependensi**: `gosec` dan `govulncheck` atas contoh yang disiapkan (`contoh/`, bukan kode api-t4) dan `govulncheck` atas kode api-t4 yang sebenarnya.
4. **SBOM dan pindai**: SBOM CycloneDX dari `syft`, dipindai `grype` dengan basis data yang dikunci, atas contoh dan atas image api-t4.
5. **Tanda tangan image**: `cosign verify` atas image tanpa tanda tangan, yang ditandatangani lewat tag lalu tag dipindah, dan yang ditandatangani lewat digest, di registry image lokal.

Keputusan lulus atau gagal ada di `gerbang.py`: fungsi murni yang membaca keluaran alat dan dites (`tes_gerbang.py`). `run.py` menjalankan alat lalu memanggil fungsi itu, jadi rekaman memuat keluaran alat dan putusan gerbang yang sama. Semua berjalan lokal. Registry image berjalan di container yang hanya mendengar `127.0.0.1`; tidak ada layanan, data, atau kredensial nyata. Lab ini tidak memakai PostgreSQL: alat membaca file dan image, bukan database.

## Menjalankan

```bash
make -C labs/t4-pipeline run                      # semua bagian, ±1 menit sesudah alat dan basis data terunduh, menulis labs/t4-pipeline/output/*.txt
make -C labs/t4-pipeline run BAGIAN=kontrak       # satu bagian: kontrak klien sast sbom tanda testing
make -C labs/t4-pipeline cek                      # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t4-pipeline test                     # tes gerbang.py dan alat.py, tanpa alat dan tanpa jaringan
make -C labs/t4-pipeline verifikasi-alat          # tanda tangan rilis alat (jaringan; bukan bagian run)
make -C labs/t4-pipeline bersih                   # hapus .alat dan .kerja
```

Butuh Docker dan Go. Run pertama mengunduh alat ke `labs/t4-pipeline/.alat/` (di-gitignore), memeriksa checksum-nya, mengimpor basis data grype, dan menarik dua image (`openapi-generator-cli` ±462 MB di Docker lokal, `registry` ±82 MB). Ruang disk yang dipakai: `.alat` ±3,4 GB (basis data grype yang diimpor ±3,1 GB; unduhannya 196 MB), ditambah image di atas. Lab berhenti dengan `GAGAL` bila port registry dipakai proses lain.

Port dasar 18295 (registry image) ditambah `LAB_PORT_OFFSET`; kontainernya `t4p-<port>-registry`, dihapus di akhir run, dan image yang dibuat lab dihapus dari Docker lokal. Rekaman selalu menulis port dasar. Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`); lab ini hanya membaca offset.

Rekaman diulang identik per byte (`make cek`, juga di bawah beban CPU). Yang bisa berubah antar run dinormalisasi atau dibaca dari alat: digest image diberi label tetap (A sampai E) dan dibaca dari keluaran `docker push`; jalur absolut dan port diganti; dua baris kemajuan `cosign sign` ditulis dalam urutan tetap karena urutannya berubah di bawah beban; jejak panggilan govulncheck untuk temuan stdlib tidak dicetak karena alat memilih salah satu dari banyak jejak dan pilihannya berubah antar run. Rekaman bergantung pada empat hal yang dicatat di kepalanya atau di tabel berikut: versi alat, basis data grype yang dikunci, salinan basis data kerentanan Go (diunduh sekali, tidak dikunci), dan versi Go lokal.

## Versi dan asal alat (dicek 2026-10-29)

Semua alat hanya dari rilis resmi proyeknya. `alat.py` mengunduh arsip dan file checksum dari GitHub Releases, lalu menghentikan lab bila SHA-256 arsip berbeda dari baris di file checksum rilis atau dari nilai yang dikunci di `alat.json` (nilai itu dicatat 2026-10-29 untuk darwin arm64, linux amd64, dan linux arm64; arsip darwin oasdiff berlaku untuk kedua arsitektur). Tidak ada `curl | sh`, tidak ada skrip pemasang yang dijalankan, dan tidak ada yang dipasang ke sistem. Tes `tes_alat.py` memeriksa kedua pembandingan itu tanpa jaringan.

| Alat | Versi | Asal | SHA-256 arsip (darwin arm64) | Tanda tangan rilis (`make verifikasi-alat`, 2026-10-29) |
|---|---|---|---|---|
| oasdiff | v1.34.1 (terbit 2026-10-21) | github.com/oasdiff/oasdiff/releases, `oasdiff_1.34.1_darwin_all.tar.gz` (13.509.569 byte) | `64948ba3…07cb5` | Tidak ada: rilis hanya menerbitkan `checksums.txt` |
| gosec | v2.30.0 (2026-10-23) | github.com/securego/gosec/releases, `gosec_2.30.0_darwin_arm64.tar.gz` (36.757.576 byte) | `cac8c480…6dd97` | Tidak dijalankan: bundle `.sigstore.json` bertanda kunci (hanya hint kunci), dan kunci publik rilis tidak ditemukan di dokumentasi proyek; `cosign verify-blob` dengan identitas GitHub gagal di "transparency log certificate does not match" |
| syft | v1.55.0 (2026-10-19) | github.com/anchore/syft/releases, `syft_1.55.0_darwin_arm64.tar.gz` (28.090.287 byte) | `1217c258…74625` | `cosign verify-blob` atas `syft_1.55.0_checksums.txt`: Verified OK (identitas tepat `https://github.com/anchore/syft/.github/workflows/release.yaml@refs/heads/main`, penerbit GitHub Actions) |
| grype | v0.121.0 (2026-10-19) | github.com/anchore/grype/releases, `grype_0.121.0_darwin_arm64.tar.gz` (29.343.080 byte) | `7be39d3a…f27` | Verified OK atas `grype_0.121.0_checksums.txt` (identitas tepat `https://github.com/anchore/grype/.github/workflows/release.yaml@refs/heads/main`, penerbit GitHub Actions) |
| cosign | v3.1.4 (2026-10-20) | github.com/sigstore/cosign/releases, `cosign-darwin-arm64` (99.023.586 byte; biner tunggal) | `9f9b8cd5…3a4` | Verified OK atas `cosign_checksums.txt` (identitas akun layanan `keyless@projectsigstore.iam.gserviceaccount.com`, penerbit accounts.google.com) |
| govulncheck | v1.9.0 (modul `golang.org/x/vuln`, 2026-10-11) | `go install golang.org/x/vuln/cmd/govulncheck@v1.9.0` ke `.alat/bin`; checksum modul diperiksa sum.golang.org. Tidak punya arsip rilis | (tidak ada) | (tidak ada) |
| openapi-generator | v7.26.0 (2026-10-06) | image `openapitools/openapi-generator-cli:v7.26.0` dikunci dengan digest indeks `sha256:a304ddf1e2e5f24f68fa3153568d6174cea4959d09aa8e3db6d526fd0782326d`; dijalankan `--network none` | (image) | Tidak diperiksa |
| registry | v3.1.2 (image `registry:3`, 2026-09-24) | image `registry:3` dikunci dengan digest indeks `sha256:d4032d4cc323c1731c707931ecada07a53076eac38e3b61ae57533f170f2c6c3` | (image) | Tidak diperiksa |
| image dasar | distroless `static-debian12:nonroot` | digest indeks `sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab` (ditulis di `Dockerfile` dan `alat.json`, dijaga tes) | (image) | Tidak diperiksa |

Naskah menulis oasdiff v1.34.1, oapi-codegen v2.8.1, openapi-generator v7.26.0, gosec v2.30.0, syft v1.55.0, grype v0.121.0, dan cosign v3.1.4. Enam dari tujuh versi itu sama dengan rilis terbaru di GitHub Releases API pada 2026-10-29. Satu berbeda: oasdiff v1.35.0 terbit 2026-10-28T16:31Z, sesudah naskah. Catatan rilisnya tidak menyebut parameter tingkat path, style, atau explode. Peninjau menjalankan 23 perbandingan kontrak yang sama pada v1.35.0 (arsip rilis resmi, SHA-256 cocok dengan `checksums.txt`) dan hasilnya identik dengan v1.34.1. Percobaan itu tidak direkam di lab, dan lab tetap memakai v1.34.1 [perlu verifikasi: hasil pada versi sesudah v1.35.0]. govulncheck dan registry tidak punya versi di naskah. oapi-codegen Tidak dijalankan: kontrak lab ini dibaca oasdiff dan openapi-generator, dan handler api-t4 ditulis tangan (kecocokannya dengan kontrak dijaga `internal/handler/kontrak_test.go`).

Brief tugas menyebut `registry:2`; lab memakai `registry:3` karena itu tag image resmi untuk rilis terbaru (distribution v3.1.2). Perilaku `registry:2` tidak dicoba [perlu verifikasi].

Data yang diunduh sekali:

| Data | Asal | Ukuran | Dikunci |
|---|---|---|---|
| Basis data kerentanan grype | `grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-10-28T00:24:28Z_1793168610.tar.zst` (`latest.json` 2026-10-29: skema v6.1.10, dibangun 2026-10-28T06:23:30Z) | unduhan 196.243.021 byte, diimpor ±3,1 GB | SHA-256 `b08902b9…e278` di `alat.json`; `grype db import`, tanpa pembaruan otomatis dan tanpa pemeriksaan umur; versinya ditulis di tiap hasil grype di `sbom.txt` dan lab gagal bila berbeda |
| Basis data kerentanan Go | `vuln.go.dev/vulndb.zip` (go.dev/security/vuln/database: seluruh basis data dalam satu zip; `-db` menerima `file://`) | 3.516.204 byte | Tidak dikunci: berubah tiap hari. `sast.txt` hanya memuat yang stabil (GO-2022-1059, versi perbaikan, dan advisory x/text); bila basis data baru menambah advisory yang dipanggil, lab gagal dan rekaman perlu direkam ulang |

Basis data grype 3,1 GB melampaui batas 1 GB yang disebut brief bila batas itu dihitung atas data yang diimpor; unduhannya 196 MB. Butir (d) tetap dijalankan dan keputusannya ada di badan PR.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `kontrak.txt` | A: enam perubahan atas kontrak api-t4 (response enum ditambah, request enum dikurangi, field wajib dihapus: ERR; request enum ditambah, response enum dikurangi, field opsional dihapus: tidak ada temuan `breaking`). B: field opsional dihapus berstatus INFO dan tidak menahan gerbang pada ambang ERR maupun WARN; `--severity-levels` menaikkannya. C: kontrak mini; parameter tingkat path (wajib, hapus, sempit) lolos tanpa `--flatten-params`, style dan explode tidak tertangkap di kedua tingkat | 4.26 |
| `klien.txt` | Client Dart dari kontrak yang sama identik; field wajib dihapus mengubah tiga file (12 baris hilang dari `akun.dart`); nilai enum ditambah mengubah satu file; kode yang dihasilkan memakai `!` pada enum wajib | 4.26 |
| `sast.txt` | A: gosec menemukan G701 di `temuan.go:16`, `aman.go` bersih. A2: query yang sama dengan masukan konstanta tidak dilaporkan. B: gosec dengan `-quiet` pada kode yang tidak terkompilasi mengembalikan keluaran kosong dan exit code 0; tanpa `-quiet`, galat pemindaian dan nol temuan. C: govulncheck, GO-2022-1059 dipanggil lewat `bahasaPilihan`, dua advisory x/text lain tidak dipanggil. D: x/text v0.43.0, tidak ada yang dipanggil, gosec tetap menemukan G701. E: audit atas api-t4, 10 kerentanan stdlib dipanggil | 4.26 |
| `sbom.txt` | A: SBOM contoh (CycloneDX 1.7) dan tiga advisory grype atas x/text v0.3.7. B: x/text v0.43.0 bersih; SBOM kosong lolos grype tetapi ditolak gerbang. C: SBOM image api-t4 (12 modul Go dari `go.mod` ada semua), 15 temuan grype | 4.26 |
| `tanda-tangan.txt` | A: image tanpa tanda tangan, B: ditandatangani lewat tag lalu tag dipindah, C: tag dipindah sebelum ditandatangani, D: ditandatangani lewat digest dan kunci publik lain | 4.26 |
| `testing.txt` | Daftar tes `tes_gerbang.py` dan `tes_alat.py` yang harus lulus | 4.26 |

## Cara lab ini menyusun pemeriksaan

- **Satu PR, satu perubahan.** Kontrak sebelum adalah salinan `labs/api-t4/openapi.yaml` di main; tiap varian mengganti satu jangkar teks yang harus ada tepat satu kali (lab gagal bila jangkar hilang atau ganda). Kontrak mini (`kontrak/mini-sebelum.yaml`) dipakai untuk parameter tingkat path dan `explode`, yang tidak ada di kontrak api-t4.
- **Gerbang tidak boleh gagal terbuka.** `gerbang.py` menolak keluaran kosong, pemindaian tidak lengkap (`Golang errors` gosec), SBOM yang tidak memuat modul dari `go.mod`, tingkat keparahan yang tidak dikenal (dihitung paling berat), referensi image berupa tag, dan digest di tanda tangan yang berbeda dari digest yang dibangun.
- **Putusan per langkah.** `langkah_untuk` memetakan file yang berubah ke langkah pipeline (`internal/modul/<nama>/*.go` → `tes-modul:<nama>` dan `sast:<nama>`; `openapi.yaml` → `kontrak`, `klien`; `go.mod`/`go.sum` → `audit-dependensi`, `sbom`; `Dockerfile`/`cmd/api` → `image`). Ini hanya aturan pemetaan yang dites; lab tidak menjalankan CI sungguhan. File di luar aturan itu (misalnya `internal/service`, `internal/handler`, `internal/repo`, `migrasi`) tidak menjalankan langkah apa pun: celahnya dicatat di bagian "Yang belum ada".
- **Digest dibaca, bukan ditulis.** Digest image diambil dari keluaran `docker push` (tepat satu per push) dan diberi label tetap di rekaman.
- **Kunci cosign dibuat per run** di `.kerja/` (di-gitignore) dengan kata sandi uji; bukan secret dan tidak dipakai di luar lab. Tanda tangan memakai `--tlog-upload=false --use-signing-config=false` dan verifikasi memakai `--insecure-ignore-tlog=true`, supaya tidak ada yang dikirim ke log transparansi publik. Keyless, Fulcio, dan Rekor Tidak dijalankan.

## Temuan (lab yang benar; KONSISTENSI-4 menyelaraskan naskah)

1. **Isu #1163 dan #1164 terbukti di oasdiff v1.34.1, dan #1163 punya jalan keluar yang naskah belum tulis.** Status isu (GitHub API, 2026-10-29): keduanya open; #1163 dibuat 2026-08-16 dan diperbarui 2026-10-16 (komentar proyek: `--flatten-params` menggabungkan parameter tingkat path ke tiap operasi), #1164 dibuat 2026-08-16. Rekaman: perubahan parameter tingkat path (jadi wajib, dihapus, batas diperkecil) tidak dilaporkan `breaking` bawaan dan dilaporkan dengan `--flatten-params`; perubahan yang sama di tingkat operasi dilaporkan tanpa flag. Perubahan `explode` tidak dilaporkan di tingkat mana pun, juga dengan flag. Kontrak api-t4 tidak memakai parameter tingkat path maupun `explode`, jadi risikonya muncul bila tim mulai memakainya. Kalimat naskah ADR 44 ("belum memeriksa parameter tingkat path dan style atau explode") benar untuk v1.34.1; flag itu menambahnya.
2. **`breaking` tidak melihat field opsional yang dihapus.** `response-optional-property-removed` berstatus INFO (`changelog`), jadi gerbang pada ambang ERR atau WARN meloloskannya, padahal client lama yang menampilkan field itu terpengaruh. `--severity-levels` dengan satu baris `response-optional-property-removed err` menaikkannya (rekaman B). Menghapus field dari daftar `required` tanpa menghapus properti terbaca ERR (`response-property-became-optional`), dan penghapusan field wajib ERR.
3. **Arah perubahan enum menentukan.** Nilai ditambah di respons dan nilai dikurangi di request adalah ERR; nilai ditambah di request dan dikurangi di respons lolos. Client Dart yang dibuat dari kontrak lama menguraikan enum respons wajib dengan `!` setelah decode yang mengembalikan null untuk nilai tak dikenal, jadi nilai baru menghentikan client lama dengan galat null check (dibaca dari kode yang dihasilkan; Dart tidak dijalankan). Naskah menyebut "client Dart dibuat ulang dengan diff diperiksa"; rekaman menunjukkan diff untuk satu enum hanya dua baris di satu file, dan untuk satu field wajib 12 baris di tiga file.
4. **gosec: aturan G701, dan `-quiet` gagal terbuka.** Pada contoh lab, query yang disusun `fmt.Sprintf` ke `database/sql` dilaporkan G701 (analisis taint, CWE-89, HIGH/HIGH), bukan G201 atau G202, karena `os.Args[1]` mengalir sampai `db.Query`. Dengan kode yang sama dan masukan konstanta gosec tidak melapor apa pun (rekaman bagian A2), jadi G701 melapor aliran dari sumber input, bukan pola `fmt.Sprintf` itu sendiri. G201 dan G202 ada di daftar aturan gosec 2.30.0; pola query lain tidak diuji di lab ini. Pada kode yang tidak terkompilasi, `gosec -fmt=json -quiet` berakhir dengan keluaran kosong dan exit code 0; tanpa `-quiet` exit code 1, `Golang errors` terisi, dan temuan yang sama hilang dari `Issues`. Gerbang memakai keluaran tanpa `-quiet` dan menolak galat pemindaian.
5. **govulncheck melaporkan yang dipanggil; grype melaporkan yang ada.** Atas contoh, govulncheck memanggil satu kerentanan (GO-2022-1059) dan grype mencatat tiga advisory untuk x/text v0.3.7 (dua lainnya, GO-2026-5970 dan GO-2026-6629, ada di modul tetapi tidak dipanggil). Dengan `-format json` govulncheck selalu exit 0 (dokumentasi pkg.go.dev, 2026-10-29), jadi gerbang membaca JSON-nya.
6. **Toolchain lab Go 1.27.1 membuat api-t4 tidak lolos gerbang ADR 44 hari ini.** Audit govulncheck atas kode api-t4 (tanpa mengubahnya): 10 kerentanan stdlib dipanggil, diperbaiki di Go 1.27.2 atau 1.27.3; grype atas SBOM image: 15 temuan (14 stdlib go1.27.1, termasuk dua Critical, dan satu golang.org/x/crypto v0.57.0 tanpa versi perbaikan di basis data). Semua berasal dari stdlib yang ikut terkompilasi ke biner, bukan dari `go.mod` atau image dasar. Dua Critical: GO-2026-6612 (CVE-2026-78663, HTTP/2 server di `net/http`; dipanggil kode api-t4 menurut govulncheck) dan GO-2026-6604 (CVE-2026-56857; ringkasan advisory menyebut `os.Root.Mkdir` mengikuti junction di Windows; tidak dipanggil). Temuan x/crypto adalah GO-2026-5932 (paket openpgp tidak dipelihara); govulncheck melaporkannya hanya di tingkat modul, bukan sebagai dipanggil, 13 di antaranya bertingkat Critical, High, atau Unknown (dihitung paling berat). README api-t4 mencatat `go1.27.3` sebagai rilis terbaru dan lab belum memakainya. Lab ini tidak menaikkan toolchain (itu mengubah api-t4 dan semua rekamannya); angkanya bergantung pada basis data yang dikunci dan pada Go lokal.
7. **SBOM kosong tidak ditolak grype.** `grype` atas SBOM dari folder kosong mengembalikan nol temuan dan lulus; hanya pemeriksaan "SBOM memuat semua modul dari `go.mod`" yang menolaknya.
8. **cosign v3.1.4 menerima tag, dan masalahnya ada di ke mana tag menunjuk.** `cosign sign` atas tag menandatangani digest yang ditunjuk tag saat itu dan mencetak peringatan yang menyebut kemampuan itu "will be removed in a future release". Tag dipindah sesudah ditandatangani: `cosign verify` atas tag gagal ("no signatures found", exit code 10) dan atas digest lama berhasil, sesuai naskah. Tag dipindah SEBELUM ditandatangani: tanda tangan dan `cosign verify` atas tag berhasil, tetapi atas image yang bukan hasil build CI; hanya perbandingan dengan digest yang dibangun (`putuskan_tanda_tangan`) yang menolaknya. Kalimat naskah "tanda tangan di tag tidak berarti" benar dengan catatan itu: tanda tangannya sah, objek yang ditandatangani yang bisa keliru. Flag `--tlog-upload` dan `--use-signing-config` ditandai deprecated oleh cosign v3.1.4.
9. **Pesan cosign yang perlu dibaca hati-hati.** Dengan `--insecure-ignore-tlog=true`, `cosign verify` tetap mencetak "Existence of the claims in the transparency log was verified offline"; rekaman tidak menyalin baris itu karena lab sengaja tidak memakai log transparansi [perlu verifikasi: arti baris itu bila kunci dipakai tanpa entri log].

## Uji mutasi

Tes: 103 di `tes_gerbang.py` dan `tes_alat.py` (`testing.txt`): 90 dari pelaksana dan 13 dari peninjau. Mutan dijalankan pada salinan sementara `gerbang.py` dan `alat.py` (68 mutan, tiap satu kompilasi dan jangkar ada tepat satu kali; tes harus gagal) dan pada `run.py` (bagian yang dijalankan sungguhan, lab harus gagal atau rekaman berubah; 18 mutan, 17 tertangkap dan satu setara karena salinan identik). Skrip mutan sementara dan tidak ada di repo. Tabel dan mutan yang setara ada di badan PR.

Peninjau menjalankan 84 mutan lain atas `gerbang.py` dan `alat.py`. Tes pelaksana menangkap 71 dan melewatkan 13. Tiga belas tes baru menutup 11 dari 13 itu: urutan hasil gosec, osv yang muncul di dua tingkat, kerentanan stdlib yang dipanggil, digest di baris `docker push` lain, akhiran `.go`, titik di `openapi.yaml`, hash lebih dari satu blok, dua file biner dalam arsip, direktori bernama biner, dan oasdiff di Linux. Dua mutan setara: `re.match` sudah berjangkar di awal, dan pembersihan folder sementara tidak terlihat dari tes. Seluruh 84 diulang sesudah tes ditambah: 82 tertangkap, 2 setara.

## Yang belum ada di lab ini

- **Keyless, Fulcio, Rekor**: Tidak dijalankan; tanda tangan lab memakai kunci sendiri. Verifikasi keyless hanya dipakai untuk tanda tangan rilis alat (`make verifikasi-alat`), bukan untuk image.
- **Provenance SLSA, atestasi app (Play Integrity, App Attest), HTTP Message Signatures**: hanya disebut di naskah; Tidak dijalankan.
- **Aturan "jalankan semua" untuk kode bersama**: `langkah_untuk` tidak memetakan kode di luar `internal/modul/<nama>/`, sehingga PR yang hanya menyentuh `internal/service`, `internal/handler`, `internal/repo`, atau `migrasi` menjalankan nol langkah. Tes `test_kode_bersama_di_luar_modul_belum_dipetakan` mencatat celah itu; ADR 44 perlu menulis apa yang berjalan untuk kode bersama.
- **Workflow GitHub Actions per modul, branch protection, CODEOWNERS**: lab tidak menjalankan CI. `gerbang.py` adalah kebijakan yang dites, dan `langkah_untuk` hanya aturan pemetaan; pipeline sungguhan dan batas 10 menit per PR (Asumsi ADR 44) tidak diukur.
- **Lint dan tes per modul api-t4**: dijalankan lab `t4-modul` dan `testing.txt` api-t4, bukan di sini.
- **oapi-codegen** (server Go dari kontrak): Tidak dijalankan.
- **Client Dart yang dikompilasi atau dijalankan**: Tidak dijalankan; yang dibandingkan adalah kode hasil generasi.
- **Image yang berasal dari build yang bisa diulang (reproducible)**: digest image berubah tiap build (konfigurasi memuat waktu); rekaman memberi label tetap.
- **Kerentanan di dalam image dasar distroless**: SBOM mencatat lima paket Debian dan grype tidak menemukan temuan atasnya di basis data yang dikunci; tidak ada pemeriksaan lain.
- **`registry:2`, registry dengan autentikasi, dan referrers API**: tidak dicoba.
- **Rekaman bergantung pada Go 1.27.1 lokal** (kepala `sast.txt`, `sbom.txt`, `tanda-tangan.txt`): di mesin dengan Go lain, bagian E `sast.txt` dan temuan stdlib di `sbom.txt` berbeda dan `make cek` gagal sampai direkam ulang.
- **Dependensi baru**: tidak ada di `labs/api-t4/go.mod`. `contoh/` adalah modul Go terpisah yang SENGAJA memuat golang.org/x/text v0.3.7 (versi rentan, bukan untuk diimpor kode lain) dan kode yang sengaja bercelah; modul itu hanya dibaca alat dan tidak pernah dijalankan.
