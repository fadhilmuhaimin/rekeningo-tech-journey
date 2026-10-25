# Lab t3-instance · proxy, dua instance, dan rate limit lintas instance

Lab Tahap 3 untuk masalah M21 dan M22 (`plan/CERITA-TAHAP-3.md`, keputusan 965 dan 966). Dua proses `api-t3` berjalan di host, di belakang proxy Caddy 2.11.7 di kontainer. PostgreSQL 17 dan Redis 8 dari lab `b3-race` dan `b9-cache`. Semuanya satu mesin: VPS kedua baru muncul di Tahap 4, jadi satu VPS tetap titik gagal tunggal.

Server, skema, dan data awalnya milik `labs/api-t3`; lab ini tidak menyalin kodenya. Bagian baru di `api-t3` untuk lab ini ada di bagian "Yang ditambah di api-t3" di bawah. Skema lab ini bernama `t3_instance`, jadi `make -C labs/api-t3 run` tidak mengganggunya.

## Menjalankan

```bash
make -C labs/t3-instance run                  # semua bagian, ±2 menit, menulis labs/t3-instance/output/*.txt
make -C labs/t3-instance run BAGIAN=batas     # satu bagian: proxy panic bergulir batas
make -C labs/t3-instance cek                  # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar: instance a 18180, instance b 18182, proxy 18183. Dua port pertama juga milik `api-t3`, jadi dua lab itu tidak boleh jalan bersamaan dalam satu lajur. Rekaman selalu memakai port dasar.

Setiap bagian membuat ulang schema dan data awal dari nol. Yang dicatat adalah status, jumlah, dan urutan, bukan waktu. Kebijakan Caddy `random` (bawaan) tidak menghasilkan angka tetap, jadi bagian yang butuh angka tetap memakai `round_robin`, satu-satunya perubahan dari bawaan; bagian `random` hanya memeriksa batas. Lab gagal keras bila hasilnya meleset.

| Rekaman | Isi | Halaman |
|---|---|---|
| `proxy.txt` | Satu instance mati: bawaan Caddy, retry saja, health check saja, dan keduanya, termasuk selang antara kematian dan pemeriksaan berikutnya | 3.15 |
| `panic.txt` | M21: panic di goroutine latar mematikan proses, panic di goroutine handler tidak; ekspor laporan kosong; dua instance menahan satu kematian | 3.14 |
| `bergulir.txt` | Deploy bergulir: `Shutdown` saat SIGTERM lawan tanpa itu, dengan dan tanpa health check dan retry | 3.14, 3.15 |
| `batas.txt` | M22: bucket di memori dua instance lawan hitungan bersama di Redis; Redis mati dan Redis menggantung | 3.16, 3.17 |

## Yang direkam

**Instance mati (`proxy.txt`).** Dengan satu instance mati, `round_robin` tanpa pengaman menjawab 502 pada 10 dari 20 request. Retry saja (`lb_retries 2`) menutup semuanya, termasuk POST, karena koneksi ke instance mati gagal sebelum ada byte terkirim. 

Health check aktif saja masih menyisakan selang: dengan selang bawaan 30 detik, 5 dari 10 request sesudah kematian gagal. Health check dan retry bersama menutup selang itu. 

Health check saja, tanpa retry, dengan selang 1 detik: instance mati dikeluarkan dari pilihan dan masuk lagi sesudah lolos pemeriksaan. Tanpa retry, instance yang masih dipilih menjawab 502 pada setiap request kedua, jadi rekaman ini hanya lolos bila health check benar-benar jalan (dengan retry, retry menutup 502 itu dan health check yang mati tidak terlihat).

**Panic (`panic.txt`).** Panic di goroutine handler dipulihkan `net/http`: proses hidup, koneksi request itu putus. Panic di goroutine yang dibuka handler tidak dipulihkan siapa pun: proses keluar dengan kode 2 dan tidak ada yang memulainya lagi. Pemicunya di lab adalah ringkasan audit ekspor laporan yang mengira laporan tidak pernah kosong (mode rentan `ekspor-panic`); CSV sudah terkirim sebelum proses mati. 

Dengan dua instance di belakang proxy, satu laporan kosong mematikan satu instance dan yang lain melayani. Tombol Ekspor yang ditekan lagi mematikan instance kedua, dan proxy menjawab 503 untuk semua request. Dua instance menahan satu kematian, bukan satu bug yang bisa dipicu berulang.

**Deploy bergulir (`bergulir.txt`).** Dengan `Shutdown`, request lambat yang sedang jalan selesai, koneksi baru ditolak, dan proses keluar dengan kode 0. 

Tanpa `signal.Notify` (mode rentan `tanpa-shutdown`), SIGTERM mengakhiri proses seketika dan request itu putus. Di belakang proxy dengan health check dan retry, mengganti a lalu b saat beban berjalan tidak menghasilkan satu pun jawaban selain 200. Tanpa keduanya, ada 502 selama pengganti naik.

Lab menemukan celah di `api-t3` sendiri: versi pertama keluar dari `main` begitu `ListenAndServe` kembali, padahal fungsi itu kembali segera setelah `Shutdown` dimulai, bukan setelah selesai. Dokumentasi `http.Server.Shutdown` menyuruh program menunggu `Shutdown` kembali (R3-72). `main` sekarang menunggu, dan bagian A di `bergulir.txt` membuktikannya.

**Rate limit (`batas.txt`).** Satu client menebak password dari satu alamat ke 24 akun berbeda, batas per IP 10.

| Penahan | Satu instance | Dua instance, round_robin | Dua instance, random | Redis, dua instance |
|---|---|---|---|---|
| Per IP, 24 percobaan | 10 sampai password | 20 | antara 10 dan 20 | 10 |
| Per akun, 12 tebakan ke satu akun | 5 | 10 | tidak direkam | 5 |

Kunci akun di database tidak berlipat: `gagal_login` berhenti di 5 pada semua kasus, dan akun terkunci sekali. Yang berlipat adalah penahan banjir di memori. Satu tebakan per akun tidak pernah menyentuh kunci akun, jadi penyerang yang menyemprot banyak akun hanya dihentikan penahan per IP.

Hitungan bersama memakai skrip Lua dalam satu perintah: `INCR`, lalu `PEXPIRE` bila key baru. Dua perintah terpisah meninggalkan key tanpa masa berlaku bila proses mati di antaranya (bagian H).

Redis mati: batas jatuh ke bucket lokal, login tetap dijawab, dan angkanya sama dengan bucket di memori. Redis menggantung: dengan batas 50 ms satu login selesai kurang dari 1 detik. Dengan bawaan go-redis (5 detik dan 3 retry), satu login menunggu lebih dari 5 detik. Waktu pastinya bergantung pada mesin dan tidak direkam. Asumsi dari satu kali lihat di mesin pengembang: ±10 detik untuk dua pemeriksaan.

## Yang ditambah di api-t3

Semuanya di belakang flag; tanpa flag, `api-t3` berperilaku seperti sebelumnya.

| Flag atau endpoint | Fungsi |
|---|---|
| `-instance <nama>` | Header `X-Instance` di setiap jawaban |
| `-redis <alamat>`, `-redis-timeout` | Batas login bersama di Redis (`internal/redisbatas`, `service.PembatasBersama`); batas waktu bawaan 50 ms, 0 = bawaan go-redis |
| `-rentan ekspor-panic` | M21: goroutine latar tanpa pelindung dan ringkasan ekspor yang mengira laporan tidak pernah kosong |
| `-rentan tanpa-shutdown` | Tanpa `signal.Notify`: SIGTERM mengakhiri proses seketika |
| `GET /healthz` | 200 bila database menjawab dalam 1 detik, untuk health check proxy; endpoint operasi, tidak ada di OpenAPI app |
| `GET /lab/lambat?ms=`, `/lab/panik?di=`, `/lab/batas` | Hanya dengan `-lab`: request yang menahan satu koneksi database, panic di handler atau latar, hitungan pemeriksaan bersama lawan lokal |

Tes Go ada di `labs/api-t3` (`make -C labs/api-t3 run BAGIAN=testing`): `batas_bersama_test.go`, `instance_test.go`, `latar_test.go`, dan `internal/redisbatas` dengan Redis sungguhan (`TEST_REDIS_ADDR`; `TES_REDIS_WAJIB=1` menolak tes yang dilewati).

## Yang belum ada di lab ini

- **Alamat client di belakang proxy.** `api-t3` memakai alamat koneksi (`RemoteAddr`). Di belakang proxy, itu alamat proxy untuk semua client, jadi seluruh client berbagi satu key per IP. `X-Forwarded-For` dari proxy tepercaya belum dibaca. Caddy mengabaikan nilai masuk bila `trusted_proxies` tidak diisi (R3-71), dan lab tidak bisa membedakan dua client lewat proxy di Docker Desktop, jadi perilaku ini tidak direkam.
- **Jendela tetap.** Di batas dua jendela, paling banyak 2 × batas lolos dalam selang pendek. Tidak dijalankan.
- **Penahan kiriman.** Hanya login yang berpindah ke Redis. Penahan `/kiriman` masih bucket di memori.
- **Redis penuh.** `maxmemory` tidak diatur di lab. Key penahan yang terbuang saat memori penuh (kapan ADR 27 salah) tidak dijalankan.
- **Pengawas proses.** Yang memulai ulang instance sesudah panic (systemd `Restart=`, restart policy Docker). Caddy tidak memulai proses. Tidak dijalankan.
- **Pemeriksaan pertama Caddy.** Request yang datang tepat saat proxy baru dinyalakan dengan health check aktif (caddy#6410). Tidak dijalankan.
- **POST yang terputus.** POST yang sudah diterima kernel instance lama tetapi belum dibaca saat listener ditutup tidak diulang proxy (`lb_retry_match` bawaan hanya GET). Tidak dijalankan; app mengulang dengan idempotency key (ADR 14).
- **Linux.** Lab hanya dijalankan di Docker Desktop. Instance mendengar di `127.0.0.1`; di Docker Engine Linux, alamat `host-gateway` biasanya tidak menjangkau proses yang hanya mendengar di loopback, jadi proxy mungkin tidak sampai ke instance. Tidak dijalankan [perlu verifikasi].
- **Redis tanpa autentikasi.** Lab hanya memasangnya di `127.0.0.1`. Valkey sebagai pembanding lisensi hanya dicatat, tidak dijalankan.
- **Versi baru.** Deploy bergulir mengganti proses dengan binary yang sama dan nama instance lain (`a2`, `b2`). Migrasi skema selama deploy bergulir adalah lab `b4-skema`.
