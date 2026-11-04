# Lab t5-rollout · rilis kartu bertahap dan satu sakelar untuk semua pod

Lab Tahap 5 untuk M49 dan ADR 55 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4). Tiga pod otorisasi kartu, semuanya proses `api-t5` dari satu image, berjalan di cluster k3d lokal. Argo Rollouts mengatur rilis versi baru dan plugin Gateway API mengatur bobotnya. HPA menambah replika, dan satu tabel `sakelar` di PostgreSQL menjadi kill switch kartu untuk semua pod. Lab ini berbagi kode, skema, dan data awal `labs/api-t5` lewat `dasar_t5.py` dan flag baru, bukan salinan.

Semuanya hanya memakai alamat di mesinmu. Pihak ketiga tiruan: PostgreSQL di container lab, penerbit kartu digantikan `run.py` yang memanggil `POST /penerbit/otorisasi` langsung. Jaringan hanya dipakai saat menyiapkan. Yang diunduh: k3d dan manifes Argo Rollouts (lewat `curl`, sha256 berpin), image k3s dan komponen cluster dari registry resmi, biner plugin Gateway API (oleh controller, sha256 diperiksa), dan toolchain Go (sekali, lewat proxy modul).

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Go | 1.27.3 | sama dengan `labs/api-t5`; image dikompilasi statis (`CGO_ENABLED=0`, `-tags timetzdata`) untuk linux/arm64 |
| PostgreSQL | 17.11 | satu container lab di host (`labs/b3-race`); pod menjangkaunya lewat `host.k3d.internal` |
| k3d | v5.9.0 | biner rilis resmi, sha256 di bawah |
| k3s | v1.37.1+k3s1 (`rancher/k3s:v1.37.1-k3s1`, 351 MB di Docker) | satu server, tanpa agent, `--no-lb`; membawa Traefik 3.7.13, CoreDNS 1.14.7, metrics-server v0.9.0, local-path-provisioner v0.0.37, dan CRD Gateway API v1.6.1 (kanal standard) |
| Argo Rollouts | v1.10.1 (`quay.io/argoproj/argo-rollouts:v1.10.1`, 49,3 MB di node) | `install.yaml` rilis resmi, sha256 di bawah |
| Plugin Gateway API | v0.17.0 | biner linux/arm64 73.576.483 byte, diunduh controller dan diperiksa sha256-nya |
| kubectl | v1.37.1+k3s1 (bawaan node k3s) | semua `apply` dan `get` memakai kubectl di dalam node; kubectl di host (v1.32.2) hanya dipakai untuk `port-forward`, selisih versinya di luar yang didukung Kubernetes dan tidak diuji lebih jauh |
| Python | venv `labs/.venv`, psycopg 3.3.6 | |

Argo CD v3.5.6 dan Flux **Tidak dijalankan**: Argo CD butuh repositori Git yang terjangkau dari dalam cluster, dan lab ini tidak menyediakannya.

## Alat yang diunduh dan di-pin

`run.py` mengunduh dua file dari rilis resmi GitHub ke `labs/t5-rollout/.alat/` (diabaikan git) dan memeriksa sha256-nya terhadap nilai yang tertulis di `run.py`. Bila beda, lab berhenti. File yang sudah ada di `.alat/` diperiksa lagi di tiap run, bukan hanya saat diunduh. Digest berasal dari API rilis GitHub (`digest` aset), dibuka 2026-11-03. Untuk k3d, `checksums.txt` rilis memuat hash yang sama. Rilis Argo Rollouts tidak memuat daftar checksum untuk `install.yaml`; hanya digest API itu yang dipakai.

| File | Sumber | Ukuran | sha256 |
| --- | --- | --- | --- |
| `k3d-darwin-arm64` | github.com/k3d-io/k3d, rilis v5.9.0 | 24.018.146 byte | `fe106541d5d0a3f18debcd4d432a16f8c0ce3e6ddc06f8fbb6f696a122313e00` |
| `argo-rollouts-install.yaml` | github.com/argoproj/argo-rollouts, rilis v1.10.1, `install.yaml` | 3.048.424 byte | `149148429a6f8258b789003ffb9bc6698a526d611ecb1b185624217cf51bae7f` |
| `gatewayapi-plugin-linux-arm64` | github.com/argoproj-labs/rollouts-plugin-trafficrouter-gatewayapi, rilis v0.17.0 | 73.576.483 byte | `5221279f7bf2c9b2c0ff6ed7ff12718ecce1d4892f1ff5e5224bb723cfd0fd92` (ditulis di `manifes/argo-rollouts-gateway.yaml`, diperiksa controller) |

Di platform selain macOS arm64, pasang k3d v5.9.0 dari rilis resmi sendiri (cocokkan sha256 dengan `checksums.txt` rilisnya) lalu jalankan dengan `K3D=<path>`. Biner plugin Gateway API di `manifes/argo-rollouts-gateway.yaml` adalah linux/arm64 (URL dan sha256 untuk arm64), jadi lab ini hanya diuji di host arm64. Di host amd64 URL dan sha256-nya harus diganti ke biner amd64 dari rilis plugin: Tidak dijalankan. Tidak ada perintah `curl | sh`, `sudo`, atau Homebrew. Docker Desktop memberi 7,6 GiB RAM; cluster dibatasi 3 GiB.

## Yang baru di api-t5

Tanpa flag baru, `api-t5` tidak berubah. Detailnya ada di `labs/api-t5/README.md`.

| Flag | Fungsi |
| --- | --- |
| `-sakelar-tabel` | kill switch kartu dibaca dari baris `kartu_aktif` di tabel `sakelar`, dengan cache; nilai tidak terbaca = tolak (ADR 55). Tanpa flag: flag memori satu proses (ADR 42), versi pertama M49 |
| `-sakelar-ttl` | lama nilai sakelar dipakai ulang; bawaan 5 detik (Asumsi naskah) |
| `-lab-tolak-persen N` | lab saja: N persen otorisasi ditolak dengan alasan `versi-baru`, tersebar rata: sesudah k panggilan tepat k × N ÷ 100 (dibulatkan ke bawah) yang ditolak. Hitungannya tepat, bukan acak |
| `GET /lab/otorisasi` | dengan `-lab`: jumlah keputusan, setuju, tolak, dan rasio tolak di satu pod |

`POST /bo/flag/kartu` dengan `-sakelar-tabel` menulis baris `sakelar` di transaction yang sama dengan baris audit; tanpa flag, perilakunya sama dengan Tahap 4. Kode: `internal/service/sakelar.go`, `internal/repo/sakelar.go`, `internal/service/bo.go`, dan pemanggilnya di `internal/service/kartu.go`.

## Cluster dan beban kerja

Cluster bernama `<COMPOSE_PROJECT_NAME>-t5-rollout` (tanpa variabel: `lab-t5-rollout`). Tiap bagian rekaman menghapus beban kerja bagian sebelumnya, membuat ulang schema dan data awal di PostgreSQL, lalu menerapkan manifesnya. Data awal tambahan: akun Ira (saldo Rp20.000.000, satu kartu dengan batas harian Rp50.000.000). Peran risk memakai Ratih dari data awal `api-t5`.

| File | Isi |
| --- | --- |
| `manifes/traefik-gateway.yaml` | HelmChartConfig: menyalakan provider Gateway di Traefik bawaan k3s dan menerima HTTPRoute dari semua namespace |
| `manifes/argo-rollouts-gateway.yaml` | ConfigMap `argo-rollouts-config` untuk plugin Gateway API, dan RBAC atas `httproutes` |
| `manifes/kartu-tanpa-router.yaml` | Rollout canary dasar (satu langkah `setWeight: 5`, lalu jeda), satu Service, satu HTTPRoute tanpa bobot |
| `manifes/kartu-gateway.yaml` | Rollout 3 replika dengan `stableService`, `canaryService`, plugin Gateway API, HTTPRoute berbobot, dan AnalysisTemplate (provider web) |
| `manifes/kartu-sakelar.yaml` | Deployment 3 pod, dengan atau tanpa `-sakelar-tabel` |
| `manifes/kartu-hpa.yaml` | Deployment satu replika, HPA CPU 50% (1 sampai 4), Service, dan HTTPRoute |

Image `api-t5-rollout:v1` (30,2 MB, satu file statis dari `scratch`) dibangun dari `labs/api-t5` dan diimpor ke containerd node lewat `docker save | ctr images import`, tanpa registry. Kata sandi database ada di `run.py`, bukan di manifes: itu data lab (`t5_app`), bukan secret. Pod mengakses Rollouts di namespace `default`; `kubectl port-forward` per pod dipakai agar permintaan sampai ke pod tertentu. Lewat `kubectl proxy`, `POST /bo/flag/kartu` dengan token Bearer dijawab 401 padahal login berhasil (pengamatan saat menyusun lab; penyebabnya diduga kepala `Authorization` milik client tidak diteruskan, belum dibuktikan).

## Menjalankan

```
make -C labs/t5-rollout run                       # semua bagian; cluster dibuat bila belum ada, dihapus sesudahnya
make -C labs/t5-rollout run BAGIAN=sakelar        # satu bagian: tanpa-router gateway analisis sakelar hpa testing
T5R_PERTAHANKAN=1 make -C labs/t5-rollout run     # cluster tidak dihapus (bagian berikutnya lebih cepat)
make -C labs/t5-rollout cek                       # rekam ulang, lalu output/ harus identik dengan yang di-commit
make -C labs/t5-rollout test                      # hanya tes Go sakelar (tanpa cluster)
make -C labs/t5-rollout down                      # hapus cluster lajur ini
```

Port dasar (ditambah `LAB_PORT_OFFSET`): Gateway Traefik 18360, API server k3s 18361, `port-forward` ke pod mulai 18362. PostgreSQL memakai `LAB_DB_PORT`. Lab ini tidak jalan bersamaan dengan lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Bagian `sakelar` (D4) menjalankan `docker pause` pada kontainer PostgreSQL lajur, jadi lab menolak berjalan tanpa `COMPOSE_PROJECT_NAME`: lajur bawaan berbagi PostgreSQL dengan lajur lain.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/tanpa-router.txt` | `tanpa-router` | `setWeight: 5` dengan 3 dan 20 replika, tanpa traffic router: ReplicaSet, pod, dan bagian permintaan yang sampai ke versi baru |
| `output/gateway.txt` | `gateway` | bobot 95 dan 5 di HTTPRoute lewat plugin Gateway API; 200 permintaan dihitung per versi; analisis latar untuk versi yang baik |
| `output/analisis.txt` | `analisis` | versi baru yang menolak 31% otorisasi: analisis gagal, Rollout dibatalkan, bobot kembali 0, pod versi baru hilang |
| `output/sakelar.txt` | `sakelar` | kill switch di tiga pod: flag memori lawan tabel; jendela cache; sakelar tidak terbaca; PostgreSQL berhenti |
| `output/hpa.txt` | `hpa` | HPA menaikkan replika di bawah beban CPU |
| `output/testing.txt` | `testing` | `go vet` dan tes bertag `t5rollout`, dan tes kill switch lama |

Rekaman dari database bersih dan beban kerja baru. Hitungan pod, bobot, status, dan keputusan direkam persis. Lama menunggu, jumlah pengukuran, dan nilai CPU bergantung mesin: hanya batasnya yang diperiksa (lab gagal bila batas itu terlewati) dan nilainya tidak direkam.

## Yang terbaca dari rekaman

- **Tanpa traffic router, 5% jarang jadi 5%.** Dengan 3 replika dan `maxSurge` yang tidak ditulis, bawaan v1.10.1 adalah 25% dari jumlah replika dibulatkan ke atas (`DefaultMaxSurge = "25"` di `utils/defaults/defaults.go`, dihitung `resolveFenceposts` di `utils/replicaset/replicaset.go` dengan pembulatan ke atas; kode dibaca 2026-11-04), yaitu 1 pod untuk 3 replika dan 5 pod untuk 20 replika. Dengan izin itu Argo Rollouts v1.10.1 menambah satu pod canary dan membiarkan 3 pod stabil: 4 pod di belakang satu Service, jadi bagian pod versi baru 25,0%. Dengan `maxSurge: 0` (bagian ketiga rekaman) total pod tetap 3, yaitu 1 canary dan 2 stabil (33,3%): angka naskah muncul hanya dengan pengaturan itu. Dengan 20 replika: 1 canary dan 19 stabil (5,0%). Izin 5 pod tambahan tidak dipakai: `approximateWeightedCanaryStableReplicaCounts` (`utils/replicaset/canary.go`) hanya membandingkan dua jumlah total, `spec.replicas` dan `spec.replicas + 1`, lalu memilih pasangan yang bobot canary-nya paling dekat dengan 5%. Untuk 20 replika, 1 dari 20 tepat 5,0% dan 1 dari 21 hanya 4,8%, jadi totalnya 20. Untuk 3 replika, 1 dari 4 (25,0%) lebih dekat ke 5% daripada 1 dari 3 (33,3%), jadi totalnya 4. Di fungsi itu `maxSurge` hanya diperiksa lebih dari 0 atau tidak (pilihan `spec.replicas + 1` ada atau tidak); besarnya baru berpengaruh di `CalculateReplicaCountsForBasicCanary` sebagai batas atas `spec.replicas + maxSurge` saat pod ditambah. Karena itu rekaman 3 dan 20 replika tidak membedakan bawaan 25% dari `maxSurge: 1`. Salinan fungsi itu, dijalankan di luar cluster pada 2026-11-04 (Tidak dijalankan di cluster), memberi 1 canary dan 19 stabil untuk 20 replika dengan `maxSurge` 1 maupun 5, dan 1 canary dan 3 stabil untuk 3 replika dengan `maxSurge` 1. Bagian permintaan yang sampai ke versi baru mengikuti bagian pod dalam batas yang direkam. Hitungan tepatnya bergantung penyeimbang beban Traefik: run pelaksana mencatat 50 dari 200 (3 replika, bawaan) dan 10 dari 200 (20 replika), dan satu run peninjau mencatat 9 dari 200 (4,5%) untuk 20 replika yang sama. Karena itu rekaman hanya mencatat batasnya, dan hitungan permintaan itu bukan angka untuk halaman. Aturannya ada di `utils/replicaset/canary.go`. Untuk bobot 5 dan dua replika atau lebih, pasangan yang dipilih selalu memuat minimal satu pod canary (dibaca dari kode). Untuk bobot lain dengan `maxSurge: 0` itu tidak berlaku: salinan fungsi memberi 0 canary untuk 2 replika dan bobot 75. Jumlah total pod boleh `spec.replicas` atau satu lebih (kode dibaca 2026-11-03). Rekaman hanya berlaku untuk v1.10.1 dengan pengaturan di manifes.
- **Dengan Gateway API, bobot lepas dari jumlah pod.** Pod canary tetap 1 dari 4, tetapi HTTPRoute memuat bobot 95 dan 5. Bagian permintaan yang sampai ke versi baru ada di batas 1,5% sampai 8,5% (10 dari 200, 5,0%, di run pelaksana dan run peninjau pertama; hitungan tepat tidak direkam). Itu hasil satu kombinasi: Traefik 3.7.13, Gateway API v1.6.1, plugin v0.17.0. Halaman provider-status dokumentasi plugin (tanpa nomor versi, dibuka 2026-11-03) mencantumkan Traefik 3.7.0 dengan Gateway API 1.5.1 dan plugin 0.13.0 dalam daftar yang "actually tested".
- **Analisis yang gagal membalik rollout.** Versi baru menolak 31% otorisasi (`-lab-tolak-persen 31`; Ilustrasi, karena kesalahannya dibuat sengaja). Satu pengukuran gagal, AnalysisRun menjadi `Failed`, dan Rollout menjadi `Degraded` dengan abort. Bobot canary kembali 0, pod versi baru hilang, dan 100 dari 100 permintaan berikutnya dijawab versi lama.
- **Analisis lewat Service bisa membaca pod yang salah.** Di satu run saat mesin sangat sibuk (load average di atas 100 pada 10 inti), 40 pengukuran berturut-turut membaca pod stabil lewat Service `kartu-canary`: jumlah otorisasi 973 sampai 1.177 dan nol penolakan. Pod canary saat itu sudah menolak (62 dari 188 sesaat sesudahnya), selector Service sudah benar, dan analisis tidak pernah gagal. Dugaan penyebab: koneksi keep-alive yang tersambung sebelum endpoint Service diperbarui. Dugaan itu belum dibuktikan. Sesudah `Connection: close` ditambahkan di AnalysisTemplate, bagian `analisis` lolos di bawah beban yang sama; satu keberhasilan bukan bukti penyebabnya.
- **Flag di memori tidak lintas pod.** Kill switch dimatikan lewat pod 1: pod 1 menolak, pod 2 dan pod 3 tetap menyetujui. Pod 1 yang dimulai ulang menyetujui lagi tanpa ada yang menyalakannya (pola `labs/t4-kartu`, bagian B, kini dengan tiga pod).
- **Sakelar dari tabel lintas pod, dengan jendela cache.** Sakelar dimatikan lewat pod 1. Pod 1 menolak seketika (cache-nya ditulis ulang), pod 2 dan pod 3 masih menyetujui selama cache mereka belum habis, lalu semuanya menolak. Batas yang diperiksa: dalam 5 detik ditambah dua detik toleransi pengukuran. Dinyalakan lagi lewat pod 2, semua pod menyetujui lagi.
- **Sakelar tidak terbaca ditolak dengan jawaban 200.** Dengan hak SELECT atas tabel dicabut, dan dengan kontainer PostgreSQL di-`docker pause`, pod yang cache-nya sudah habis menjawab `200` dengan `tolak` dan alasan `sakelar-tak-terbaca`. Saat PostgreSQL berhenti, jawaban tiba kurang dari 2 detik (batas diperiksa), juga untuk tiga otorisasi sekaligus ke satu pod. Pembacaan sakelar yang menggantung dibagi semua pemanggil yang tiba selama pembacaan itu berjalan. Versi pertama kode ini membaca satu per satu di bawah satu mutex. Pemanggil ke-n menunggu n kali batas baca (1 detik): dari lima pemanggil, yang kelima menunggu 5 detik, jauh di atas tenggat 2 detik penerbit. Penerbit tiruan membaca keterlambatan sebagai setuju (ADR 42). Tes `TestSakelarKartuTakTerbacaTidakMengantre` menjaganya.
- **HPA menaikkan replika menurut CPU.** Di bawah beban dari 16 thread, rata-rata CPU pod melewati target 50% dari requests. HPA menaikkan replika di atas 1 tanpa melewati `maxReplicas`, dan peristiwa HPA menulis alasan "cpu resource utilization (percentage of request) above target". Jumlah replika tepatnya tidak direkam.

## Selisih dengan naskah (lab yang benar)

- Naskah menulis bobot yang bisa dicapai dengan 3 replika hanya 0%, 33,3%, 66,7%, atau 100%. Rekaman: satu pod canary ditambahkan ke 3 pod stabil, jadi bagian canary 25,0%. Alasannya `maxSurge` bawaan v1.10.1 (25% dari 3 replika, dibulatkan ke atas, jadi 1) mengizinkan `spec.replicas + 1`, dan 1 dari 4 pod lebih dekat ke 5% daripada 1 dari 3 (bagian di atas). Dengan `maxSurge: 0` rekaman memberi 1 canary dan 2 stabil (33,3%), seperti angka naskah; naskah tidak menyebut `maxSurge`.
- Naskah menulis `setWeight` 5 jatuh ke 0 pod atau, bila dipaksa, ke 1 pod, dengan aturan minimal satu pod `[perlu verifikasi]`. Rekaman dan kode v1.10.1: minimal satu pod terpaksa.
- Naskah menulis "2% ke 31%" di M49. Versi lama di lab menolak 0% (saldo cukup) dan angka 31% dibangkitkan `-lab-tolak-persen`: Ilustrasi, bukan hasil rilis sungguhan.
- Naskah menulis plugin Gateway API tidak mendukung router yang dipilih `[perlu verifikasi]`. Dengan Traefik 3.7.13 plugin berjalan. Router lain (NGINX Gateway Fabric, Istio, dan lain-lain) Tidak dijalankan.
- Naskah menulis sakelar tak terbaca dijawab tolak yang eksplisit. Lab menambah satu hal: baris yang tidak ada juga dianggap tak terbaca (tolak), bukan menyala.
- Naskah menulis analisis atas rasio tolak, p95 otorisasi, dan selisih rekonsiliasi kartu. Lab hanya merekam rasio tolak (provider web ke `GET /lab/otorisasi`). p95 dan selisih rekonsiliasi Tidak dijalankan; Prometheus tidak dipasang.
- Naskah menulis langkah 1%, 5%, 25%, 100% dan jeda manual sebelum 100%. Lab hanya merekam langkah 5%; kenaikan ke 25% dan 100% dan promosi manual Tidak dijalankan.

## Tidak dijalankan atau [perlu verifikasi]

- Argo CD v3.5.6 dan GitOps (repositori konfigurasi). Bentrok HPA dan Argo CD soal `spec.replicas` tetap `[perlu verifikasi]`. HPA di sini menargetkan Deployment, bukan Rollout; HPA atas Rollout belum dicoba.
- Penyebab pengukuran analisis yang membaca pod stabil (bagian Yang terbaca): tidak dibuktikan.
- Router selain Traefik, dan Ingress NGINX (dihentikan sejak Maret 2026, R5-14).
- Analisis dengan Prometheus, p95, dan selisih rekonsiliasi; langkah 1% dan 25%; promosi manual; blue/green.
- OpenFeature dan flagd (ADR 60); `maxUnavailable`, dan `maxSurge` selain bawaan (25% dari replika) dan 0.
- Dua service pembayaran (monolith dan service terpisah) di balik satu sakelar: semua pod di lab ini adalah proses `api-t5` yang sama.
- Gerbang ADR 44 (govulncheck, grype) atas image: Tidak dijalankan di lab ini (lihat `labs/api-t5/README.md`).

## Uji mutasi

Tabel hasil ada di badan PR. Tiap mutan mengubah satu hal di kode sakelar dan dijalankan terhadap tes bertag `t5rollout`; untuk flag memori lama dipakai `go test -run KillSwitch`. Mutan harus gagal karena sebab yang diuji, lalu file dikembalikan dari git.
