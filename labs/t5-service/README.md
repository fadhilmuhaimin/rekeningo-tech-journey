# Lab t5-service · mTLS antar service, daftar jenis jurnal per identitas, dan OpenTelemetry Collector

Lab Tahap 5 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4; masalah M47, ADR 53, dan bagian OpenTelemetry di ADR 58). Lab ini memisahkan ledger dari proses `api-t5` menjadi service sendiri, lalu merekam empat hal:

1. Pemanggil tanpa sertifikat, dengan sertifikat dari CA lain, dengan sertifikat kedaluwarsa, atau dengan sertifikat yang hanya berlaku untuk server ditolak server saat handshake. Handler ledger tidak jalan dan tidak ada jurnal baru. Sertifikat yang sah tetapi tanpa izin untuk satu jenis jurnal dijawab 403.
2. Tanpa mTLS dan tanpa daftar jenis jurnal (mode rentan `ledger-tanpa-identitas`), pemanggil mana pun dengan Idempotency-Key baru membuat jurnal.
3. Permintaan yang sama dikirim dua kali lewat service pembayaran menghasilkan satu jurnal.
4. Header `traceparent` merambat dari service pemanggil ke ledger, dan Collector dengan tail sampling menyimpan semua trace berkesalahan dan membuang sebagian trace normal. Jumlah trace dihitung.

Server, skema, role, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`), bukan salinan. Kode lab ini ada di `labs/api-t5` sebagai kode bersama dan mode rentan (pola `api-t1`, `api-t3`, `api-t4`): `cmd/ledger`, `cmd/layanan`, `cmd/panggil`, `cmd/pki`, dan paket `internal/identitas`, `internal/pki`, `internal/jejak`. Di folder ini ada `docker-compose.yml` dan `otelcol.yaml` (Collector), `run.py`, dan rekaman. Pihak ketiga hanya Collector di container lokal; tidak ada panggilan keluar saat merekam. Jaringan hanya dipakai saat membangun: toolchain dan modul Go lewat proxy modul, dan image Collector sekali dari Docker Hub.

## Menjalankan

```bash
make -C labs/t5-service run                    # semua bagian, menulis labs/t5-service/output/*.txt
make -C labs/t5-service run BAGIAN=mtls        # satu bagian: mtls rentan idempoten jejak testing
make -C labs/t5-service cek                    # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t5-service down                   # hentikan Collector lab ini (hanya proyek compose folder ini)
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar (ditambah `LAB_PORT_OFFSET`): ledger 18320, service pembayaran 18321, service notifikasi 18322, OTLP/HTTP Collector 18323, metrik Collector 18324; rekaman selalu memakai port dasar. Lab ini memakai schema dan role `api-t5` (`t5_ledger` dan lainnya, global di database lab bersama), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Collector berjalan di proyek compose `<COMPOSE_PROJECT_NAME>-t5-service` dengan batas memori 256 MB. Biner, sertifikat, dan kunci dibuat di folder sementara di luar repo dan dihapus di akhir `run.py`.

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Go | 1.27.3 | toolchain dari `labs/api-t5/go.mod` (kepala rekaman mencetak versi yang membangun biner) |
| PostgreSQL | 17.11 (`postgres:17`) | sama dengan lab lain |
| OpenTelemetry Go | otel, sdk, otlptracehttp v1.47.0; contrib otelhttp v0.72.0 | Apache-2.0 (file `LICENSE` kedua modul dibaca); dependency baru di `go.mod` api-t5, modul lab tidak memakai ADR. `go list -deps` memuat OpenTelemetry di `cmd/ledger` dan `cmd/layanan` (53 paket) dan tidak di `cmd/api`, `cmd/panggil`, `cmd/pki` |
| OpenTelemetry Collector | image `otel/opentelemetry-collector-contrib:0.163.2` (`otelcol-contrib version 0.163.2`, komponen v0.163.0) | `docker images` menulis 496 MB, `docker image inspect` 105 MB ukuran konten; digest `sha256:7f22d2a6…`. Naskah menulis v0.163.0, tetapi tag image 0.163.0 tidak ada di Docker Hub (rilis GitHub v0.163.1 menyebut "fix an issue with the release"); lab memakai 0.163.2 |
| cert-manager v1.21.3, SPIFFE/SPIRE v1.15.5 | hanya disebut | Tidak dijalankan |

Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini (butuh unduhan basis data kerentanan), sama dengan `api-t5`.

## Bentuk lab

| Proses | Kode | Identitas dan database |
| --- | --- | --- |
| ledger | `cmd/ledger` | HTTPS dengan mTLS; role database `t5_ledger` (bukan `t5_app`) |
| pembayaran | `cmd/layanan -peran pembayaran` | sertifikat `pembayaran`; tidak membuka database |
| notifikasi | `cmd/layanan -peran notifikasi` | sertifikat `notifikasi`; tidak membuka database |
| Collector | container `otelcol` | menerima OTLP/HTTP, tail sampling, menulis file |
| alat lab | `cmd/pki`, `cmd/panggil` | membuat sertifikat; memerankan pod uji, service `cicilan`, atau client dengan sertifikat salah |

Ledger memakai dua rute yang sudah ada di `api-t5` (`POST /ledger/jurnal-topup` untuk jenis jurnal `topup_bank` dan `POST /ledger/kartu/tahan` untuk `kartu_tahan`), sekarang lewat `handler.JurnalTopup` dan `handler.TahanKartu` yang dipisahkan dari pemeriksa pemanggil. Pemeriksa kunci bersama versi ADR 37 (`PasangLedger`, `X-Layanan-Kunci`) tetap ada dan dijaga tes; lab ini tidak memakainya.

## Keputusan desain

- **Identitas hanya dari SAN yang lolos verifikasi.** `identitas.Nama` membaca sertifikat daun dari `VerifiedChains`, bukan `PeerCertificates`, dan menuntut tepat satu SAN DNS `<nama>.t5.lab` dengan nama huruf kecil tanpa titik. CN dan header diabaikan. Rekaman bagian D membuktikannya: sertifikat dengan CN `pembayaran` dan SAN `notifikasi` bertindak sebagai notifikasi, dan header `X-Layanan-Nama: pembayaran` tidak mengubah apa pun.
- **Dua lapis dengan jawaban berbeda.** Rantai sertifikat yang tidak sah ditolak saat handshake (server menjalankan `RequireAndVerifyClientCert`, hanya TLS 1.3). Rantai sah tanpa SAN identitas dijawab 401 oleh handler. Identitas sah tanpa izin untuk jenis jurnal rute itu dijawab 403.
- **Tabel izin dari naskah ADR 53**: `pembayaran` (topup_bank, kartu_tahan, kartu_tangkap), `cicilan` (angsuran, tabungan), `merchant` (bayar), `notifikasi` dan `akun` tanpa jenis jurnal. Tes membandingkan semua jenis di tabel dengan constraint `jurnal_jenis_check` di database. Rute hanya ada untuk `topup_bank` dan `kartu_tahan`; `kartu_tangkap`, `angsuran`, `tabungan`, dan `bayar` belum punya rute di ledger lab ini (milik `t5-cicilan` dan lab berikutnya), jadi izinnya tercatat tetapi belum bisa dipakai.
- **Satu rute, satu jenis.** Jenis yang diperiksa rute sama dengan jenis yang ditulisnya (tes `TestIzinSatuJenisTidakMembukaRuteJenisLain` memakai daftar izin sempit dan membaca `jurnal.jenis` dari database).
- **Role `t5_ledger` dengan `search_path=t5_ledger,t5_akun`.** `layanan.sql` memberi role itu hak baca `akun(id, tingkat, status)`, tetapi `search_path` bawaan rolenya hanya `t5_ledger`, dan SQL ledger membaca `akun` tanpa awalan. DSN lab menambahkan `t5_akun` ke `search_path`; hak tetap dari `layanan.sql` (rekaman bagian A: `t5_ledger` tidak bisa membaca `t5_akun.sesi` dan `t5_notifikasi.perangkat`).
- **Sertifikat dibaca ulang tiap handshake** (`GetCertificate` dan `GetClientCertificate` membaca file), supaya penggantian file berlaku tanpa restart. Rotasi otomatis oleh cert-manager atau penggantian file **Tidak dijalankan**: tidak ada rekaman yang menggantinya.
- **Sonde.** Client TLS 1.3 menganggap handshake selesai sebelum server menilai sertifikat client, jadi penolakan baru terbaca pada pembacaan pertama. `cmd/panggil -sonde` menyelesaikan handshake, tidak mengirim apa pun, lalu menunggu paling lama 500 ms untuk alert. Perilaku client yang langsung mengirim permintaan sesudah handshake tidak direkam. Alert dari server di koneksi TCP adalah `*net.OpError` dengan Op "remote error", bukan `tls.AlertError`; `identitas.KelasGalat` membedakannya dari koneksi yang mati. Alasan menurut server dibaca dari log server (`TLS handshake error ... client didn't provide a certificate`, `unknown authority`, `expired`, `incompatible key usage`).
- **ID trace berurutan hanya di lab** (`-lab-id-urut`): 16 byte pertama SHA-256 dari nama service dan penghitung, supaya jumlah trace yang dipilih sampling berbasis hash bisa diulang tepat. Di produksi ID acak, jadi jumlah yang disimpan berfluktuasi di sekitar persentasenya; angka di `jejak.txt` bukan perkiraan produksi.
- **Collector.** Dua kebijakan: `status_code` ERROR (semua trace yang memuat satu span berstatus Error) dan `probabilistic` 5 persen untuk sisanya; Collector menyimpan trace bila salah satu kebijakan memilihnya (teramati di metrik: trace berkesalahan tercatat `sampled` di kebijakan `status_code` dan `not_sampled` di kebijakan `probabilistic`, dan tetap disimpan). `decision_wait` 3 detik dan satu instance (README processor: semua span satu trace harus sampai ke instance yang sama). Menunggu Collector memakai hitungan dari metriknya sendiri (`new_trace_id_received`, `global_count_traces_sampled`), bukan jeda tetap.
- **Status span.** Jawaban 403 membuat span client notifikasi berstatus Error (client: 4xx Error menurut konvensi semantik HTTP) dan span server ledger tanpa status (server: 4xx dibiarkan). Trace "berkesalahan" di lab ini artinya trace yang memuat span client berstatus Error karena 403, bukan galat server.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/mtls.txt` | `mtls` | A sertifikat lab dan role `t5_ledger`; B empat penolakan handshake (alert, log server, jurnal tetap 0); C izin per jenis jurnal; D identitas hanya dari SAN; E keputusan di log ledger |
| `output/rentan.txt` | `rentan` | mode `ledger-tanpa-identitas` membuat jurnal untuk akun uji tanpa sertifikat; versi benar di port yang sama menolak pod uji yang sama |
| `output/idempoten.txt` | `idempoten` | dua permintaan sama berurutan dan serentak menghasilkan satu jurnal; key berbeda dengan isi sama adalah permintaan lain; key sama dengan isi berbeda ditolak 422 |
| `output/jejak.txt` | `jejak` | satu trace tiga span dengan induk-anak lintas service; 211 trace melewati Collector: semua 11 berkesalahan disimpan, 5 dari 200 normal disimpan |
| `output/testing.txt` | `testing` | `go vet` dan `go test -v` untuk `internal/identitas`, `internal/jejak`, `internal/pki`, `cmd/ledger` dengan PostgreSQL |

Rekaman dari database bersih. Nomor jurnal diberi label menurut kemunculan pertama (`<jurnal 1>`). Rekaman diulang tiga kali dengan satu run di bawah beban CPU dan identik per byte; angka yang bergantung mesin tidak direkam.

## Yang terbaca dari rekaman

- **Penolakan terjadi sebelum handler.** Empat sertifikat yang salah mendapat empat alert berbeda dari server (certificate required, unknown certificate authority, expired certificate, bad certificate), dan jumlah jurnal tetap 0 sebelum dan sesudah. Klaim "gagal di handshake" benar dari sisi server; dari sisi client TLS 1.3 alert terbaca pada pembacaan pertama.
- **mTLS membuktikan siapa, bukan niatnya.** Sertifikat notifikasi yang sah tetap dijawab 403 untuk `topup_bank`, dan sertifikat pembayaran yang sah boleh membuat jurnal topup. Service sah yang dibajak tetap memegang izin jenis jurnalnya (pre-mortem ADR 53); lab ini tidak membuktikan sebaliknya.
- **Mode rentan.** Tanpa TLS dan tanpa daftar, satu panggilan dari client tanpa sertifikat membuat jurnal `topup_bank` Rp1.000 untuk akun uji (saldo akun itu naik dari 0 ke 1.000). Itu rekaman dari kode lab, bukan Ilustrasi seperti kalimat M47 di naskah.
- **Idempotency-Key tidak mengotorisasi.** Key baru dengan isi yang sama menghasilkan jurnal kedua (`idempoten.txt` bagian C); key hanya mencegah pemrosesan ganda untuk permintaan yang sama.
- **Sampling.** Dari 211 trace, 16 disimpan: 11 berkesalahan (11 dari 11) dan 5 normal (5 dari 200). Di setiap trace yang disimpan, span server ledger beranak span client pemanggilnya (16 dari 16).

## Selisih dengan naskah (lab yang benar; naskah tidak diubah)

- Naskah menulis Collector v0.163.0; image dengan tag itu tidak ada, lab memakai 0.163.2 (komponen v0.163.0).
- Naskah menulis "dua service dengan mTLS". Lab menjalankan tiga proses (ledger, pembayaran, notifikasi) dan menerbitkan tiga sertifikat service sah; `cicilan` hanya sertifikat yang dipakai `cmd/panggil`, bukan proses.
- Naskah M47 menulis pod uji di namespace notifikasi. Di lab, "pod uji" adalah `cmd/panggil` tanpa sertifikat (ditolak di versi benar), dan service notifikasi dengan sertifikat sah ditolak dengan 403. Dua keadaan itu berbeda dan keduanya direkam.
- Naskah menyebut sertifikat dari CA internal yang diputar otomatis. Lab memakai CA yang dibuat saat dijalankan; rotasi **Tidak dijalankan**.
- Naskah menghitung tail sampling ±6% (1 persen error dan 5 persen sisanya, Asumsi). Lab memakai 5 persen untuk sisanya dan semua trace berkesalahan; karena 11 dari 211 trace sengaja berkesalahan, 16 dari 211 disimpan. Itu bukan perkiraan persentase produksi.
- Naskah 3b tidak menyebut bahwa role `t5_ledger` butuh `search_path` yang memuat `t5_akun` agar SQL ledger yang membaca `akun` tanpa awalan berjalan (bagian "Keputusan desain").

## Tidak dijalankan atau belum ada

NetworkPolicy dan jaringan yang menegakkannya **Tidak dijalankan** [perlu verifikasi]: dokumentasi Kubernetes menulis bahwa NetworkPolicy "implemented by the network plugin" dan tanpa controller "will have no effect", dan lab ini tidak memakai Kubernetes. cert-manager, SPIFFE/SPIRE, service mesh (Istio, Linkerd), dan DPoP hanya disebut. Rotasi sertifikat, jalur `kartu_tangkap`, `angsuran`, `tabungan`, dan `bayar` di ledger, backend trace (Tempo), metrik dan log OpenTelemetry, dan lebih dari satu Collector (tail sampling dengan load balancing) **Tidak dijalankan**. Lab ini tidak menguji kapasitas dan tidak mengklaimnya.

## Uji mutasi

Tabel hasil ada di badan PR. Setiap mutan mengubah satu hal di kode keamanan (konfigurasi TLS, pembacaan SAN, tabel izin, pembungkus rute, propagator) dan tes Go harus gagal karena sebab yang diuji; file dikembalikan sesudahnya.
