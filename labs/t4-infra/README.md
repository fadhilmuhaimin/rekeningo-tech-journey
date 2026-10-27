# Lab t4-infra · alamat keluar tetap, secret di state IaC, rotasi secret, dan secret staging lawan produksi

Lab Tahap 4 untuk masalah M34 dan ADR 39 (`plan/CERITA-TAHAP-4.md` bagian 3b dan 4, tugas `lab-t4-infra`; M30 dan ADR 35 untuk rotasi). Pertanyaannya: apa yang terjadi pada panggilan keluar ke vendor yang menuntut daftar alamat saat aplikasi berpindah host, apa yang masuk ke state OpenTofu, apakah service membaca rotasi secret tanpa deploy, dan bagaimana kunci produksi di staging terdeteksi.

Lab ini berjalan di atas `labs/api-t4`: server Go, skema, data awal, worker, dan layanan verifikasi tiruan dipakai dari `labs/api-t4/dasar_t4.py`, bukan salinan. Yang ditambahkan ke api-t4 adalah kode dan tesnya (daftar alamat sumber di layanan verifikasi tiruan, proxy keluar, pembaca rahasia dari secret manager, pemindai kunci produksi); yang ditambahkan di sini adalah skenario, konfigurasi OpenTofu, dan rekamannya, di schema sendiri (`t4_infra`). Semua berjalan lokal di container; tidak ada layanan, data, atau kredensial nyata. Token dev OpenBao dan semua nilai "rahasia" di `run.py` adalah data lab. Lab ini bukan uji hosting: tidak membuktikan perilaku penyedia cloud.

## Menjalankan

```bash
make lab-up                                       # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/t4-infra run                         # semua bagian, ±40 detik sesudah image dan provider terunduh, menulis labs/t4-infra/output/*.txt
make -C labs/t4-infra run BAGIAN=alamat           # satu bagian: alamat state rotasi staging testing
make -C labs/t4-infra cek                         # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t4-infra verifikasi-alat             # bandingkan biner di image dengan arsip rilis (jaringan, ±100 MB)
```

Butuh Docker dan Go; PostgreSQL lewat `labs/b3-race`. Image pertama kali diunduh (OpenBao ±75 MB, OpenTofu ±45 MB), dan `tofu init` mengunduh dua provider ke `labs/t4-infra/.cache-tofu` (tidak di-commit). Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar lab ini 18292 (verifikasi tiruan di container), 18293 (OpenBao), dan 18294 (service pembayaran), ditambah `LAB_PORT_OFFSET`; nama kontainer dan jaringan memakai `t4i-<LAB_DB_PORT>`, jadi dua lajur tidak bertabrakan. Rekaman selalu menulis port dasar dan label, tidak alamat container. Setiap bagian membuat ulang schema dan data awal dari nol. Lab gagal keras bila hasil meleset; waktu tunggu dan hitungan percobaan diperiksa lewat keadaan (database, log, status), bukan jeda tetap.

## Versi dasar (dicek 2026-10-27)

| Komponen | Versi | Sumber dan catatan |
|---|---|---|
| OpenBao | v2.7.2, image `ghcr.io/openbao/openbao@sha256:5046911075e137e154ce49ab051502f4ec7cf367d484ae4a4dce665d9b90561f` | GitHub Releases (terbit 2026-10-26; catatan rilis memuat lima perbaikan keamanan di auth/cert, approle, identity, ssh, transit; tidak menyentuh KV). Naskah menulis v2.7.1; v2.7.2 adalah rilis terbaru pada hari lab ditulis. Digest indeks sama di ghcr.io dan quay.io |
| OpenTofu | v1.13.2, image `ghcr.io/opentofu/opentofu@sha256:25bdfbe87000b8a88d44c7ef0cca53381da95f6203f7aed1e8cf5b81ecbe18eb` | GitHub Releases (terbit 2026-10-21) |
| Provider | `hashicorp/random` 3.9.1, `hashicorp/local` 2.9.1 | registry.opentofu.org (2026-10-27); dikunci di `tofu/*/.terraform.lock.hcl` untuk linux_arm64 dan linux_amd64 |
| Terraform v1.17.0, Vault v2.2.1 | hanya dibandingkan | Lisensi BSL (R4-20). Tidak diunduh dan tidak dijalankan |
| PostgreSQL, Go, pgx | 17.11, go1.27.1, v5.11.0 | dari api-t4 (README api-t4, "Versi dasar"); dicetak di kepala rekaman |
| Image dasar container Go | `gcr.io/distroless/static-debian12:nonroot` | hanya menjalankan biner Go statis; tag mengambang, tidak memengaruhi rekaman |

Asal alat. `make verifikasi-alat` (dijalankan 2026-10-27, linux_arm64) memeriksa dua hal untuk tiap alat: SHA-256 arsip rilis sama dengan file checksum rilis (`tofu_1.13.2_SHA256SUMS`: `6e815c58…`; OpenBao `checksums.txt`: `5b97bf81…`), dan biner di dalam image sama byte per byte dengan biner di arsip (tofu `92fb0913…`, bao `23545b22…`). Yang tidak diperiksa oleh target ini: tanda tangan rilis (cosign untuk OpenTofu, sigstore dan gpg untuk OpenBao), sehingga checksum berasal dari tempat yang sama dengan arsipnya; rantai ini menangkap unduhan rusak atau image yang berbeda dari rilis, bukan rilis yang dipalsukan di sumbernya. Peninjau memeriksa sekali dengan tangan (2026-10-28, tidak ada di `make`): `gpg --verify` atas `checksums.txt.gpgsig` dan `tofu_1.13.2_SHA256SUMS.gpgsig` dengan kunci dari `openbao.org/assets` (ID kunci D200CD702853E6D0, sama dengan dokumentasi instalasi OpenBao) dan `get.opentofu.org`, hasilnya Good signature; sidik jari kunci OpenTofu tidak dicocokkan dengan sumber ketiga [perlu verifikasi]. Cosign dan sigstore tetap Tidak dijalankan. Hasilnya bergantung arsitektur, jadi tidak masuk `output/`.

Dependency baru: tidak ada di `go.mod` (hanya stdlib). Image dan provider didapat dari sumber resmi dan dikunci dengan digest dan hash.

## Cara lab ini menyusun M34

Docker menyediakan alamat sumber yang sungguhan. Satu jaringan Docker lab memuat tiga jenis container: layanan verifikasi tiruan (`cmd/tiruan -peran verifikasi`; daftar alamat lewat `POST /lab/izinkan` di bagian A dan B, lewat flag `-izinkan-alamat` di bagian C), proxy keluar (`cmd/proxykeluar`), dan host aplikasi. Host aplikasi adalah worker api-t4 yang dikompilasi untuk Linux dan membaca outbox PostgreSQL lab lewat `host.docker.internal`; jadi panggilan ke vendor berasal dari kode `internal/worker` dan `internal/verifikasi` yang sama dengan lab lain. "Pindahan" adalah host kedua yang dinyalakan sebelum host pertama dimatikan; alamatnya berbeda (diperiksa, supaya Docker tidak memakai ulang alamat yang baru dilepas). Vendor tiruan menolak permintaan dari alamat yang tidak terdaftar dengan 403, dan memeriksa alamat peer TCP, bukan header: `X-Forwarded-For` diisi client dan tidak dipercaya.

Yang dikirim penggerak lab, bukan akibat sistem: pendaftaran alamat di vendor (`POST /lab/izinkan`, seketika; di vendor nyata makan dua hari kerja, Asumsi naskah), pengajuan verifikasi, pemilihan host mana yang menyala, variabel `HTTP_PROXY`, dan semua perintah operator ke OpenBao. Di bagian rotasi, gateway tiruan menandatangani kabar dengan rahasia yang dipilih lab; kiriman ulang gateway nyata (M30) tidak diperankan, hanya pengiriman ulang oleh lab.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `alamat.txt` | A: tanpa proxy, host lama terdaftar; sesudah pindahan host baru ditolak 403, 15 penolakan untuk tiga pekerjaan, tiga pengajuan `gagal`. B: proxy keluar bertetap didaftarkan sekali, pindahan tidak mengubah alamat yang dilihat vendor. C: pindahan tanpa proxy dengan breaker per lajur (vendor dimulai dengan flag `-izinkan-alamat`): pengaturan ADR 36 tidak pernah membuka breaker atas 403, bawaan pustaka membukanya sesudah enam penolakan dan lajur pulih sesudah alamat didaftarkan. Bagian C membaca keadaan dalam 3 detik (`-breaker-timeout`) sesudah breaker terbuka; di mesin yang sangat sibuk bagian ini gagal keras, bukan merekam angka lain | 4.16, 4.17 |
| `state.txt` | A: `random_password` dan variabel masuk `terraform.tfstate` walau CLI menulis `(sensitive value)`. B: konfigurasi yang hanya menulis alamat dan path secret manager tidak memuat nilai; operator menulis nilai langsung ke OpenBao. C: data source yang membaca rahasia (provider local) juga memasukkannya ke state | 4.16, 4.17 |
| `rotasi.txt` | A: cara OpenBao mode dev berjalan (flag, KV v2, memori, data hilang sesudah restart). B: service pembayaran membaca rahasia saat runtime dengan token baca-saja; dengan token yang tidak dikenal OpenBao service tidak menyala. C: rotasi dengan masa tumpang tindih tanpa memulai ulang proses; sesudah tumpang tindih berakhir, token service masih membaca versi lama dokumen dari riwayat KV sampai operator menghancurkannya. D: urutan terbalik (gateway dulu) ditolak 401 sampai service membaca. E: OpenBao mati, service memakai pembacaan terakhir dan menghitung kegagalan | 4.17 |
| `staging.txt` | A: token staging membaca secret staging, tidak membaca atau menulis produksi (403). B: pemindai menemukan kunci produksi di dua file staging (satu lewat awalan, satu lewat sidik), tanpa mencetak nilainya; baris lebih panjang dari 1 MiB dilaporkan dan file yang tidak ada menghasilkan exit 2, bukan file tampak bersih; lalu bersih sesudah diperbaiki | 4.17 |
| `testing.txt` | daftar tes Go yang ditambahkan lab ini dan `go vet` | 4.17 |

## Yang ditambahkan ke api-t4

- **Daftar alamat sumber** (`cmd/tiruan/alamat.go`, flag `-izinkan-alamat`, rute `POST /lab/izinkan` dan `GET /lab/alamat`): vendor tiruan menolak `POST /verifikasi` dari alamat di luar daftar dengan 403, sebelum membaca isi dan sebelum membuat objek. Daftar kosong menerima semua, jadi lab lain tidak berubah. Alamat adalah peer TCP; IPv4-mapped dilepas; CIDR dimasker.
- **Proxy keluar** (`cmd/proxykeluar`): meneruskan HTTP biasa hanya ke tujuan yang didaftarkan lewat `-tujuan` (wajib; daftar kosong menolak start), tidak menambah atau meneruskan `X-Forwarded-For`, tidak meneruskan header per koneksi, tidak memakai proxy lain. CONNECT (HTTPS) dijawab 501: Tidak dijalankan, vendor tiruan tidak memakai TLS. Aplikasi tidak diubah: `internal/klien.Baru` memakai transport bawaan Go yang membaca `HTTP_PROXY`.
- **Pembaca rahasia** (`internal/rahasia/bao.go`): membaca dokumen KV v2 `{sekarang, lama}` dari OpenBao dengan `X-Vault-Token`, tanpa pustaka client. `sekarang` dipakai, `lama` masih diterima selama masa tumpang tindih. Bila pembacaan gagal, daftar terakhir dipertahankan dan kegagalan dihitung (`gagal_beruntun`); tidak ada batas umur untuk pembacaan lama (fail-static, bukan gagal tertutup): rahasia yang sudah dicabut di OpenBao tetap diterima sampai pembacaan berhasil lagi atau service dimulai ulang. Galat tidak menyalin isi jawaban, dan status tidak memuat nilai (hanya delapan karakter SHA-256).
- **Rahasia dari secret manager di service pembayaran** (`internal/modul/pembayaran.Service.RahasiaFn`, flag `-rahasia-bao`, `-rahasia-bao-path`, `-rahasia-segar`, token dari `BAO_TOKEN`, `GET /lab/rahasia` di mode `-lab`): menggantikan `-rahasia-webhook`. Pembacaan awal yang gagal menghentikan service. Tanpa flag baru perilaku sama dengan sebelumnya (tes dan rekaman lab lain tidak berubah).
- **Pemindai kunci produksi** (`internal/rahasia/pindai.go`, `cmd/pindairahasia`): mencari token berawalan kunci produksi (`gw_live_`) atau yang SHA-256-nya ada di daftar sidik rahasia produksi. Keluaran memuat file, baris, dan alasan, tidak pernah nilainya. Baris yang lebih panjang dari 1 MiB tidak bisa dipindai: baris itu dilaporkan (exit 1), tidak dilewati diam-diam. Awalan dicocokkan di awal token dan peka huruf besar-kecil; nilai yang diubah bentuknya (base64, dipecah beberapa baris) hanya tertangkap bila bentuk itu sendiri ada di daftar sidik.

## Temuan (lab yang benar; KONSISTENSI-4 menyelaraskan naskah)

1. **Breaker ADR 36 tidak terbuka atas 403.** Naskah M34 menulis "Breaker ADR 36 terbuka dengan benar, tetapi tidak memperbaiki penyebabnya". ADR 36 menghitung jawaban 4xx sebagai sukses, dan 403 adalah 4xx, jadi breaker tidak pernah berpindah status (`alamat.txt` bagian C: delapan pekerjaan, 40 penolakan, delapan pengajuan `gagal`). Kalimat naskah benar hanya untuk `IsSuccessful` bawaan pustaka: breaker terbuka sesudah enam penolakan beruntun dan pekerjaan menunggu, bukan mati; sesudah alamat didaftarkan lajur pulih sendiri dan tujuh dari delapan lulus. Satu pekerjaan tetap mati karena ambang breaker (6) lebih tinggi daripada batas percobaan (5), sama dengan temuan 1 `t4-integrasi`. Usulan, bukan keputusan lab: jawaban 401 dan 403 (pihak yang kita panggil menolak kita, bukan dokumen yang salah) dihitung gagal oleh breaker, supaya M34 menunggu, bukan mati.
2. **Versi OpenBao.** Naskah menulis v2.7.1. Pada 2026-10-27 rilis terbaru v2.7.2 (patch keamanan, terbit satu hari sebelumnya); lab memakai v2.7.2.
3. **Satu kalimat naskah ADR 39 diperjelas lab.** "Secret dibaca saat runtime dari secret manager" menjaga state hanya bila tidak ada resource atau data source di konfigurasi yang menyentuh nilainya. Data source yang membaca nilai di dalam OpenTofu juga menyimpannya di state (`state.txt` bagian C, provider local; provider Vault atau OpenBao Tidak dijalankan [perlu verifikasi]). Yang diwajibkan adalah service membaca nilainya sendiri, bukan OpenTofu.
4. **Urutan rotasi.** ADR 35 menulis dua secret diterima sampai rotasi selesai. Itu hanya membantu bila operator menulis ke secret manager dan service sudah membacanya sebelum penanda tangan beralih (`rotasi.txt` bagian C). Bila penanda tangan lebih dulu (bagian D, gambaran M30) kabar ditolak 401 selama satu jeda baca. Jeda baca produksi (bawaan service 30 detik) adalah Asumsi; lab memakai 50 ms dan tidak merekam jendelanya.
5. **Mode dev kehilangan data dan token saat restart**, dan service yang kehilangan token tidak pulih tanpa token baru (bagian E). Bukan temuan tentang naskah, tetapi pembaca perlu tahu bahwa mode dev hanya untuk lab.
6. **Retry atas 403.** Worker menjalankan lima percobaan atas jawaban 403 yang tidak akan berubah; hanya breaker yang menghentikannya (temuan 4 `t4-integrasi`, kini dengan penyebab alamat).
7. **Pembacaan lama tanpa batas umur.** Saat OpenBao mati atau token dicabut, service terus menerima rahasia terakhir yang dibacanya (`rotasi.txt` bagian E). Itu menjaga pembayaran tetap berjalan, tetapi mencabut rahasia di OpenBao tidak berlaku sampai pembacaan berhasil lagi. Lab tidak mengklaim ini siap produksi; batas umur (tolak sesudah N menit gagal) dan alert atas `gagal_beruntun` belum ada.
8. **Versi lama dokumen tetap terbaca.** KV v2 menyimpan riwayat versi: sesudah operator menulis dokumen tanpa `lama`, token service masih membaca `?version=1` dan versi 2 yang memuat rahasia lama (`rotasi.txt` bagian C). Hanya `destroy` yang menutupnya. ADR 35 dan ADR 39 tidak menyebut langkah ini; untuk rotasi karena kebocoran ia bagian dari rotasi.

## Uji mutasi

Lihat badan PR (tabel mutan, hasil, dan mutan yang setara). Mutan dijalankan pada salinan terpisah `labs/api-t4` (tes Go) dan salinan `labs/` (mutan yang hanya terlihat lewat lab) di folder sementara; skripnya sementara dan tidak ada di repo. Schema dan role dibangun ulang sebelum tiap mutan lab.

## Yang belum ada di lab ini

- **Hosting terkelola, NAT cloud, dan failover PostgreSQL terkelola**: Tidak dijalankan. "Alamat tetap" di lab adalah alamat container proxy dalam satu jaringan Docker; NAT dengan IP tetap, aturan keluar, dan perilaku penyedia tidak direkam. Proxy keluar adalah titik gagal tunggal baru; matinya proxy tidak direkam.
- **Provider Docker atau cloud untuk OpenTofu**: Tidak dijalankan (keputusan pemilik: hanya provider `random` dan `local`). Backend state terenkripsi, state jarak jauh, dan enkripsi state dan plan bawaan OpenTofu Tidak dijalankan (dokumentasi OpenTofu menganjurkan mempertimbangkan penandaan sensitif, enkripsi state dan plan, dan nilai ephemeral bersama; dibuka 2026-10-28); state di lab adalah file lokal teks biasa.
- **Terraform v1.17.0 dan Vault v2.2.1**: hanya dibandingkan lisensinya (BSL); tidak diunduh.
- **Tanda tangan rilis OpenBao dan OpenTofu**: tidak diperiksa (lihat "Versi dasar").
- **HTTPS lewat proxy (CONNECT)** dan vendor dengan TLS: Tidak dijalankan.
- **Pemisahan staging dan produksi sebagai instance atau akun terpisah**: di lab keduanya satu instance mode dev dengan dua path dan dua kebijakan. Pemisahan instance Tidak dijalankan.
- **Pemindai atas seluruh repositori, state IaC staging, dan riwayat git**: yang direkam hanya dua file contoh. Gitleaks sudah mencakup riwayat git (`1.34`); pemindai ini tidak menggantikannya.
- **Alert atas `gagal_beruntun`, rotasi token service, dan unseal OpenBao produksi**: Tidak dijalankan.
- **Ephemeral resources dan write-only attributes OpenTofu**: Tidak dijalankan; dokumentasi (language/ephemerality, dibuka 2026-10-27) menulis nilai ephemeral tidak disimpan di state atau plan.
- **Kunci produksi di staging pada kenyataannya**: skenario naskah (Ilustrasi); lab merekam pemindainya, bukan kejadiannya.
