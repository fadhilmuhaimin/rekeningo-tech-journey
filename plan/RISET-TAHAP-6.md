# Riset Tahap 6 · Regional (proyeksi)
Dikerjakan 2026-10-25, skill riset-tahap (hierarki bukti dari analisis-kritis). Semua tautan dibuka 2026-10-25; versi paket dari GitHub Releases (`gh api`) hari itu. Tahap 6 adalah proyeksi konseptual tanpa lab dan tanpa widget (PROPOSAL "Enam tahap dalam satu tabel", "Tahap 6: apa yang berbeda saat 50+ developer"): riset ini ringkas untuk 10 sampai 12 halaman konsep. Registry `proyeksi[0]`: 10 juta user, 3 negara, multi-mata uang, 10+ tim, PRD v6 (multi-mata uang, aturan per negara); tidak punya `asumsi`, jadi aktif 20%, 60 request, puncak 10, trx 2, baris 300 B diteruskan dari Tahap 4 dan 5 sebagai Asumsi. Semua angka di sini Asumsi dan semua padanan cerita berlabel Ilustrasi. Naskah Tahap 3 sampai 6 belum ada; angka Tahap 5 dari RISET-TAHAP-5. Merek nyata hanya sebagai sumber. Dokumen yang menolak bot (Gartner, UK Finance, FATF, ISO 20022, ISO.org, Netflix Tech Blog) tidak dibuka dan masuk "Belum bisa dicek".

## Konsep dan sumber
| ID | Konsep | Sumber primer (versi, tanggal) | Yang dipakai halaman | Berubah sejak Okt 2026 |
|---|---|---|---|---|
| R6-01 | Versi dasar | PostgreSQL 18.6, Kubernetes 1.37.1, Argo CD v3.5.6, Kafka 4.3 (R5-01). GitHub Releases: Backstage v1.56.2 (2026-10-22), Istio 1.31.3 (2026-10-22), Linkerd edge-26.10.1, OPA v1.21.4 (2026-10-23), LitmusChaos 3.33.0, Chaos Mesh v2.8.6, TigerBeetle 0.17.9; OpenSLO tanpa rilis GitHub | Catatan versi | Semua baru kecuali R5-01 |
| R6-02 | Platform sebagai produk | CNCF Platforms White Paper (tag-app-delivery.cncf.io): "Platform as a product", platform ada untuk melayani kebutuhan penggunanya dan dirancang serta dikembangkan dari kebutuhan itu; ada bagian pengukuran keberhasilan dan Platform Engineering Maturity Model. Team Topologies (teamtopologies.com): empat tipe tim (stream-aligned, enabling, complicated subsystem, platform) dan tiga mode interaksi (collaboration, X-as-a-Service, facilitation). Klaim Gartner "80% pada 2026": halaman tidak terbuka (403) | Platform sebagai produk | Tidak berubah |
| R6-03 | Golden path dan katalog | Spotify Engineering (2020-08-17): Golden Path = jalur "opinionated and supported" untuk membangun sesuatu, berupa tutorial langkah demi langkah; yang pertama untuk backend lahir enam tahun sebelumnya di Hack Week. Backstage docs: framework open source untuk developer portal dengan Software Catalog, Software Templates, TechDocs | Golden path | Tidak berubah |
| R6-04 | Ukuran keberhasilan platform dan tim | DORA (dora.dev): kini lima metrik: change lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate; kecepatan dan stabilitas tidak saling menukar; paling cocok per satu aplikasi atau service; dibagi bersama dev, ops, rilis | Platform, tim | Empat kunci jadi lima metrik (MTTR diganti) |
| R6-05 | Kepemilikan domain | Conway, "How Do Committees Invent?" (Datamation, 1968-04): organisasi yang merancang sistem menghasilkan struktur yang menyalin struktur komunikasinya (versi informal dari catatan penulis); setiap delegasi mempersempit alternatif desain. R4-03 (satu modul satu schema satu role) | Kepemilikan domain | Tidak berubah |
| R6-06 | Data mesh sederhana | Dehghani, "Data Mesh Principles and Logical Architecture" (martinfowler.com, 2020-12-03): empat prinsip, domain-oriented ownership, data as a product, self-serve data infrastructure, federated computational governance | Data antar domain | Tidak berubah |
| R6-07 | Strategi disaster recovery | AWS Whitepaper, Disaster Recovery of Workloads on AWS: backup and restore, pilot light, warm standby, multi-site active/active; waktu dan titik pemulihan lebih dari nol sesudah failover; failover otomatis dari health check harus hati-hati (alarm palsu); multi-site paling kompleks dan mahal dengan waktu pemulihan hampir nol; replikasi asinkron memberi RPO hampir nol, bukan nol. R5-24 | Multi-region aktif-pasif | Tidak berubah |
| R6-08 | Konsistensi lawan latensi | Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design" (IEEE Computer, 2012-02): dampak CAP lebih terbatas dari dugaan; tradeoff konsistensi lawan latensi lebih langsung, dirumuskan PACELC. Spanner (OSDI 2012): replikasi sinkron dengan TrueTime, epsilon 1 sampai 7 ms (±4 ms biasanya); F1 memakai lima replika di Amerika Serikat; kebanyakan aplikasi 3 sampai 5 datacenter di satu wilayah geografis; jarak antar replika mengatur latensi tulis | Multi-region | Tidak berubah |
| R6-09 | Latensi antar wilayah | Kecepatan cahaya di serat ±2/3 c = 200.000 km per detik (Asumsi; lembar data Corning tidak terunduh); Spanner paper (R6-08): jarak replika mengendalikan latensi tulis | Multi-region | - |
| R6-10 | Multi-mata uang di ledger | Stripe docs (currencies): jumlah dalam minor unit; zero-decimal seperti JPY; ISK ditulis dua desimal demi kompatibilitas; IDR tidak di daftar zero-decimal (dua desimal). TigerBeetle docs, currency exchange: tiap mata uang di akun terpisah (ledger berbeda), transfer antar ledger tidak diizinkan, tukar = dua transfer terhubung antara dua pasang akun (empat akun, liquidity provider), hindari normalisasi ke satu mata uang di aplikasi karena kurs berubah. SIX = Maintenance Agency ISO 4217; tabel minor unit tidak terunduh. R2-06 | Multi-mata uang | Tidak berubah |
| R6-11 | Aturan per negara sebagai kebijakan | OPA v1.21.4 docs: memisahkan keputusan kebijakan dari penegakan; CNCF: Graduated sejak 2021-01-29. R4-21 (OpenFeature). Residensi data: label [perlu verifikasi] | Aturan per negara | Tidak berubah |
| R6-12 | Fraud, AML, rekonsiliasi lintas negara | Tidak ada sumber primer yang terbuka (FATF, ISO 20022, UK Finance: 403). PROPOSAL "Peta ancaman" (sekunder); R2-31, R4-11. Play Integrity (R4-25) hanya satu sinyal | Fraud sebagai fungsi engineering | - |
| R6-13 | SLO per tim dan error budget | SRE Workbook "Alerting on SLOs" (R5-17): burn rate 14,4, 6, 1. Appendix B Example Error Budget Policy: bila budget empat minggu terakhir terlampaui, hentikan semua perubahan kecuali P0 dan perbaikan keamanan; kebijakan bukan hukuman. OpenSLO: spesifikasi YAML vendor-agnostic | SLO per tim | Tidak berubah |
| R6-14 | Perubahan aman di skala | SRE Workbook "Canarying Releases": canary = deployment sebagian dan sementara lalu dievaluasi untuk memutuskan lanjut atau tidak; memakai SLO dan error budget untuk mengukur dampak rilis. R5-16 (Argo Rollouts), R4-21 (flag), R4-22 (rilis app bertahap) | Perubahan aman | Tidak berubah |
| R6-15 | On-call dan beban operasi | Google SRE Book bab 11: operasi murni maksimum 50%; on-call maksimum 25% waktu; dua orang on-call (primer dan sekunder); minimum delapan engineer untuk rotasi 24/7 satu lokasi, enam per lokasi untuk dua lokasi; rata-rata 6 jam per insiden, maksimum 2 insiden per shift 12 jam; respons 5 menit untuk layanan pengguna | On-call per tim | Tidak berubah |
| R6-16 | Biaya sebagai kendala arsitektur | FinOps Foundation: FinOps = kerangka operasi dan praktik budaya yang memaksimalkan nilai bisnis teknologi lewat kolaborasi engineering, finance, dan bisnis. R5-25 (Prime Video), R5-26 (37signals) | FinOps | Tidak berubah |
| R6-17 | Chaos engineering | principlesofchaos.org: steady state terukur, hipotesis, variasi peristiwa nyata, jalankan di produksi, otomatis, minimalkan blast radius. Chaos Mesh v2.8.6, LitmusChaos 3.33.0 | Chaos testing | Tidak berubah |
| R6-18 | Service mesh | Istio 1.31.3 (mode ambient dan sidecar di docs). Buoyant (blog 2024, catatan 2024-10-23): Linkerd 2.15 tanpa stable open source; kode tetap Apache-2.0, rilis edge di GitHub. R5-20 | "Ada, kapan butuh" | Linkerd stable lewat Buoyant |
| R6-19 | GraphQL, event sourcing, aktif-aktif | spec.graphql.org (edisi tidak terbaca); R2-66 (event sourcing); R6-07, R6-08 (aktif-aktif) | "Ada, kapan butuh" | - |

## Teknik terbaru
| Teknik | Masuk / tidak | Alasan dengan angka tahap ini | ID |
|---|---|---|---|
| Platform internal (IDP) dengan golden path | masuk (konseptual) | 50+ developer, 10+ tim: lima developer per tim di bawah syarat on-call (R6-37) | R6-02, R6-03, R6-15 |
| Backstage atau portal serupa | hanya disebut | Konsep katalog, bukan produk; Backstage#34765 bisa macet | R6-03 |
| Data mesh sederhana | masuk (konseptual) | Schema per domain (R4-03) dan event; tanpa alat mesh | R6-06 |
| Multi-region aktif-pasif | masuk (konseptual) | RPO = jeda × TPS puncak: 463 sampai 694 transaksi per detik jeda (R6-34) | R6-07, R6-34 |
| Multi-region aktif-aktif | tidak masuk, disebut | Akun panas dibatasi 1 ÷ RTT: 33 per detik pada 3.000 km (R6-35) | R6-08, R6-35 |
| Ledger multi-mata uang | masuk (konseptual) | Tiap mata uang satu ledger, tukar = dua transfer terhubung | R6-10 |
| Aturan per negara lewat kebijakan dan data | masuk (konseptual) | OPA memisahkan keputusan dari kode | R6-11 |
| Skor risiko real-time, graph akun-perangkat | Ilustrasi | Tanpa sumber primer yang terbuka | R6-12 |
| SLO dan error budget per tim | masuk | 99,9% = 43,2 menit sebulan (R6-36) | R6-13 |
| Chaos testing | masuk (konseptual) | Eksperimen sendiri bisa merusak (Chaos Mesh#4827) | R6-17 |
| FinOps | masuk (konseptual) | Prime Video: biaya jadi kendala (R5-25) | R6-16 |
| Service mesh, GraphQL, event sourcing penuh | tidak masuk, disebut | PROPOSAL; Istio ambient punya isu rollout 503 (istio#58514) | R6-18, R6-19 |
| Kubernetes multi-cluster, GitOps skala ratusan aplikasi | disebut | Sharding Argo CD punya bug terbuka (argo-cd#28558) | R6-01 |

## Kasus industri untuk ADR
- R6-20 Platform sebagai produk: Spotify Engineering, "How We Use Golden Paths to Solve Fragmentation in Our Software Ecosystem" (2020-08-17). Golden Path backend lahir dari Hack Week (delapan engineer menulis tutorial); kini ada jalur untuk klien, data engineering, data science, machine learning, web, audio. Tulisan menyebut konsep itu tetap relevan setelah enam tahun. Batas: satu perusahaan, tanpa angka adopsi di teks yang dibaca; padanan Rekeningo berlabel Ilustrasi.
- R6-21 Multi-region sinkron: Corbett dkk., "Spanner: Google's Globally-Distributed Database" (OSDI 2012). Replikasi sinkron dengan TrueTime (epsilon ±4 ms); F1 lima replika di Amerika Serikat; mereka menyebut kebanyakan aplikasi cukup 3 sampai 5 datacenter di satu wilayah geografis demi latensi tulis. Batas: infrastruktur jam dan jaringan Google; bukan resep untuk sistem tanpa jam atomik.

## Jebakan (bahan "yang Raka kira")
| Pertanyaan forum (tautan) | Yang dikira | Yang benar (ID sumber) |
|---|---|---|
| [shopspring/decimal#338 "Add default division precision WARNING in README"](https://github.com/shopspring/decimal/issues/338) (closed, 2026-10-16) dan [#211 "1.5 * 1/3 = 0.49999999999999995"](https://github.com/shopspring/decimal/issues/211) (open, 2021-02) | Pustaka decimal 31 digit aman untuk kurs | Pembagian punya presisi bawaan; simpan minor unit integer dan tulis pembulatan sendiri (R6-10) |
| [backstage/backstage#34765 "Catalog Stitch Queue Poison Entry"](https://github.com/backstage/backstage/issues/34765) (closed, 2026-09-30) dan [#35734](https://github.com/backstage/backstage/issues/35734) (closed, 2026-09) | Katalog layanan selalu mutakhir | Entri gagal stitch bisa menyumbat antrean; entri hilang dari daftar setelah error sementara (R6-03) |
| [argoproj/argo-cd#28558 "Consistent-Hashing Sharding Bug: Cluster Orphaning After Redistribution"](https://github.com/argoproj/argo-cd/issues/28558) (open, 2026-07) dan [#14947 server-side pagination](https://github.com/argoproj/argo-cd/issues/14947) (open, 2023-08) | GitOps otomatis skala ke ratusan cluster | Cluster bisa tak dimiliki shard mana pun; UI tanpa paginasi lambat (R6-01) |
| [istio/istio#58514 "503 Spikes During Pod Rollout"](https://github.com/istio/istio/issues/58514) (open, 2025-12) | Mesh membuat rilis lebih aman | Laporan: 200 sampai 500 ms 503 per pod yang berhenti, mode ambient (R6-18) |
| [chaos-mesh/chaos-mesh#4827 "NetworkChaos Recovery Fails When Pods Restart During Chaos"](https://github.com/chaos-mesh/chaos-mesh/issues/4827) (closed, 2026-04) | Eksperimen chaos selalu pulih sendiri | Pod restart saat partisi jaringan membuat ipset tertinggal (R6-17) |
| Dokumen AWS DR dan SRE (R6-07, R6-15), bukan forum | Aktif-aktif = RPO nol; tim 5 orang cukup untuk on-call 24/7 | Replikasi asinkron: RPO hampir nol; SRE Book: minimum 8 engineer satu lokasi |
| Dokumen Buoyant (R6-18), bukan forum | Linkerd gratis seperti dulu | Stable release lewat Buoyant; edge tetap di GitHub |

## Angka tahap ini (Asumsi)
Semua Asumsi: 10 juta user, aktif 20%, 60 request, puncak 10, trx 2 (naskah Tahap 2: 3), posting 300 B (naskah: 2 × 250 B), upload 200.000 per hari (10× Tahap 5) × 500 KB.
| Besaran | Rumus | Masukan | Hasil | Tahap sebelumnya |
|---|---|---|---|---|
| R6-30 Request puncak | aktif × request ÷ 86.400 × puncak | 2.000.000 × 60 = 120 juta per hari | 1.388,9 rata-rata, 13.888,9 RPS puncak | R5-30: 1.388,9; naik 10× |
| R6-31 Transaksi uang | aktif × trx ÷ 86.400 × puncak | trx 2 atau 3; 80% dalam 90 menit | 4 juta per hari: 46,3 / 463 / 593; 6 juta: 69,4 / 694 / 889 | R5-31: 46,3 / 69,4; naik 10× |
| R6-32 Data dan file | aktif × trx × posting × 365 × byte; upload × KB × 365 | 2 × 1 × 300 B lawan 3 × 2 × 250 B | 1,46 miliar baris 0,44 TB lawan 4,38 miliar baris 1,1 TB per tahun; file 100 GB per hari, 36,5 TB per tahun | R5-32: 43,8 dan 109,5 GB; R5-33: 3,65 TB |
| R6-33 Latensi antar wilayah | RTT = 2 × jarak ÷ 200.000 km per detik | 1.000 km; 3.000 km (Asumsi) | 10 ms; 30 ms | - |
| R6-34 RPO aktif-pasif | jeda × TPS puncak | jeda 1 detik; 5 detik (Asumsi) | 463 sampai 694 transaksi; 2.315 sampai 3.472 | R5-39: 46 sampai 69 |
| R6-35 Akun panas lintas wilayah | 1 ÷ RTT per akun; 5% dari TPS puncak | merchant besar 5% (Asumsi): 23,1 (trx 2) atau 34,7 (trx 3) per detik | batas 100 per detik pada 1.000 km, 33,3 pada 3.000 km: trx 3 melewati batas pada 3.000 km | R2-87 (akun panas) |
| R6-36 Error budget | (1 − SLO) × 43.200 menit; transaksi bulanan × (1 − SLO) | SLO 99,9 / 99,95 / 99,99%; 120 sampai 180 juta transaksi per bulan | 43,2 / 21,6 / 4,32 menit; 0,1% = 120.000 sampai 180.000 transaksi gagal | - |
| R6-37 On-call per tim | developer ÷ tim lawan minimum | 50 ÷ 10 = 5 per tim; SRE Book minimum 8 (satu lokasi) atau 6 per lokasi (dua lokasi) | 5 di bawah 6 dan 8: butuh rotasi lintas tim atau tim SRE | R5-42: 20 sampai 40 developer |
| R6-38 Ukuran tim | dua sumber | PROPOSAL 50+ developer (10+ tim, platform sebagai produk); registry `proyeksi[0].skala.pembuat` 10+ tim | konsisten | R5-42 |

## Keamanan
| Ancaman | Sumber | Direkam di lab / Ilustrasi |
|---|---|---|
| Pengambilalihan akun dan penipuan lintas negara, APP fraud | PROPOSAL "Peta ancaman" (sekunder); UK Finance dan FATF tidak terbuka | Ilustrasi |
| Kunci dan data lintas wilayah, residensi data | R5-18 (NIST SP 800-57), R6-11 | Ilustrasi; tanpa klaim kepatuhan |
| Eksperimen chaos merusak produksi | R6-17, chaos-mesh#4827 | Ilustrasi; blast radius kecil |
| Mesh dan GitOps di skala (rollout 503, shard yatim) | R6-18, R6-01 | Ilustrasi |
| Rujukan regulasi untuk label (tidak masuk cerita) | R4-40 (UU 27/2022, PBI 23/6/PBI/2021) | [perlu verifikasi]; cerita tanpa klaim kepatuhan |

## Untuk NASKAH-6 (temuan yang belum ada di naskah Tahap 1 dan 2)
1. On-call (R6-37): lima developer per tim di bawah minimum SRE Book (8 satu lokasi, 6 per lokasi); cerita perlu rotasi lintas tim atau tim SRE, bukan "setiap tim on-call sendiri".
2. Aktif-aktif (R6-35): merchant 5% dari puncak melewati batas 1 ÷ RTT pada 3.000 km bila sinkron; aktif-pasif dengan RPO 463 sampai 694 transaksi per detik jeda lebih jujur.
3. Registry Tahap 6 tanpa `asumsi`: naskah harus menetapkan aktif, request, trx, dan jumlah negara (R6-30 sampai R6-32).
4. Multi-mata uang: IDR dua desimal di API Stripe; tiap mata uang satu ledger, tukar = dua transfer terhubung (R6-10).
5. DORA kini lima metrik (R6-04); "adopsi golden path" tidak punya definisi baku, tulis sebagai Asumsi.

## Belum bisa dicek
- Gartner "80% pada 2026" (hanya hasil pencarian), UK Finance Annual Fraud Report 2026 (angka APP £576,4 juta dari pers, tidak dari laporan), FATF, ISO 20022 camt.053, tabel minor unit ISO 4217, lembar data serat Corning, Netflix Simian Army, Apple App Attest (R4-25): halaman menolak bot atau tidak terbaca.
- Status stabil mode ambient Istio dan edisi spesifikasi GraphQL tidak tertulis di halaman yang terbaca; adopsi Backstage dan OpenSLO tidak diukur.
- Tidak ada lab: semua angka (aktif 20%, 200 ribu upload per hari, merchant 5%, jarak 1.000 dan 3.000 km, jeda 1 dan 5 detik, 5% konversi) adalah Asumsi dan semua padanan cerita Ilustrasi; plan GitHub pemilik (R2).
