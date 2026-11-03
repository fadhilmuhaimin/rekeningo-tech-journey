# Lab Rekeningo

Setiap folder di sini adalah satu lab dengan `run.py` atau `Makefile` sendiri, dan hasilnya direkam di `output/`. Daftar lab, schema, dan kontainernya ada di `README.md` di akar repo. Halaman ini hanya menjelaskan satu hal: cara menjalankan lab di beberapa lajur kerja sekaligus.

## Beberapa lajur sekaligus

Semua lab berbagi satu PostgreSQL di `127.0.0.1:54333`, dan tiap lab membuat ulang schema-nya setiap kali jalan. Server lab (Go, Node, Dart) mendengarkan port tetap di rentang 18080 sampai 18182. Dua lajur kerja (dua worktree) yang menjalankan lab bersamaan akan saling mereset database dan bentrok di port.

Empat variabel lingkungan memisahkan satu lajur dari lajur lain. Tanpa variabel, semuanya sama persis dengan sebelumnya.

| Variabel | Bawaan | Fungsi |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | nama folder compose (`b3-race`, `b9-cache`) | Nama proyek Docker Compose: nama kontainer dan jaringan |
| `LAB_DB_PORT` | `54333` | Port PostgreSQL bersama di host |
| `LAB_PORT_OFFSET` | `0` | Ditambahkan ke setiap port server lab |
| `LAB_REDIS_PORT` | `56379` | Port Redis lab `b9-cache` |

Lab Tahap 5 `t5-replika` punya tiga port database sendiri, satu per node kluster replikasinya: `LAB_REPLIKA_PRIMARY_PORT` (bawaan `54340`), `LAB_REPLIKA_REPLICA_PORT` (standby asinkron, bawaan `54341`), dan `LAB_REPLIKA_SINKRON_PORT` (standby sinkron, bawaan `54342`).

### Nilai per lajur

Pakai satu baris nilai per worktree. Offset kelipatan 100 menjaga port server tiap lajur tidak bertabrakan dengan lajur lain, dan database tiap lajur mendapat port dan kontainer sendiri.

| Worktree | `COMPOSE_PROJECT_NAME` | `LAB_DB_PORT` | `LAB_REDIS_PORT` | `LAB_PORT_OFFSET` |
|---|---|---|---|---|
| `rjt-konten` | kosong (bawaan) | 54333 | 56379 | 0 |
| `rjt-konten2` | `rjt-konten2` | 54433 | 56479 | 100 |
| `rjt-konten3` | `rjt-konten3` | 54533 | 56579 | 200 |
| `rjt-teknis` | `rjt-teknis` | 54633 | 56679 | 300 |
| `rjt-teknis2` | `rjt-teknis2` | 54733 | 56779 | 400 |
| `rjt-teknis3` | `rjt-teknis3` | 54833 | 56879 | 500 |

Lajur bawaan memakai kontainer `b3-race-db-1` yang dipakai bersama folder utama. Lajur lain memakai kontainernya sendiri (`<COMPOSE_PROJECT_NAME>-db-1`).

### Cara pakai

Tulis nilai lajurmu di awal perintah, atau simpan di `tmp/lajur.env` lalu `set -a; . tmp/lajur.env; set +a` di awal tiap perintah (setiap perintah Bash memulai shell baru).

```bash
export COMPOSE_PROJECT_NAME=rjt-teknis LAB_DB_PORT=54633 LAB_REDIS_PORT=56679 LAB_PORT_OFFSET=300
make lab-up                                   # PostgreSQL dan Redis milik lajur ini
make -C labs/e2-sync run                      # satu lab; server mendengarkan di 18396
make lab-down                                 # hanya proyek COMPOSE_PROJECT_NAME ini
```

Aturannya:

- `make lab-down` dan `docker compose down` hanya menghentikan proyek yang dipilih `COMPOSE_PROJECT_NAME`. Tanpa variabel, yang dihentikan adalah proyek bawaan milik semua lajur lain. Pastikan variabel terisi sebelum `down`.
- Rekaman tidak berubah: teks yang masuk `output/` selalu memakai port dasar, bukan port dengan offset.
- Dua lajur tidak boleh menjalankan lab yang sama di folder yang sama. Tiap lajur punya worktree dan folder `output/` sendiri.
- Di dalam satu lajur, lab yang punya port dasar sama tidak boleh jalan bersamaan: `api-t1` dan `t3-bayar` (18083), `t3-bayar` dan `b8-concurrency` (notif 18090), `api-t2` dan `e4-realtime` (18093), `api-t2` dan `c4-ratelimit` (18094), `api-t3`, `t3-pool`, `t3-outbox`, `t3-offline` (18180, 18181), `t3-cache` (18180 dan 18182), `t3-instance` (18180 sampai 18183), dan `t3-mitm` (18180, 18181; `t3-mitm` juga memakai 18190 sampai 18193). Jalankan secara berurutan; lab yang bentrok berhenti dengan `GAGAL: port ... sudah dipakai`.
- `api-t4` memakai port dasar 18280 sampai 18285 (API, push tiruan, instance kedua, gateway pembayaran, layanan verifikasi, penerbit kartu); lab Tahap 4 lain yang berbagi server itu lewat `dasar_t4.py` tidak jalan bersamaan dengannya dalam satu lajur.
- `api-t5` memakai port dasar 18310 sampai 18316 (API, push tiruan, instance kedua, gateway pembayaran, layanan verifikasi, penerbit kartu, PgBouncer); lab Tahap 5 lain yang berbagi server itu lewat `dasar_t5.py` tidak jalan bersamaan dengannya dalam satu lajur. Container PgBouncer `api-t5-pgbouncer-<port>` hanya hidup selama bagian `pooler` (image `api-t5-pgbouncer:1.26.1` dibangun dari `postgres:17` lokal dan paket PGDG).
- `t4-pipeline` memakai satu port, 18295, untuk registry image lokal di container `t4p-<port>-registry`, dan tidak memakai PostgreSQL; tidak bentrok dengan lab lain, tetapi dua lajur memakai offset berbeda (`LAB_PORT_OFFSET`).
- `b9-cache` membaca schema `b2q` dari `b2-query`, jadi database lajur yang baru dibuat butuh `make -C labs/b2-query run` dulu.
- Redis dan port replika tidak ikut offset; mereka punya variabel sendiri (tabel di atas). Lajur selain bawaan yang menjalankan `t5-replika` mengisi `LAB_REPLIKA_PRIMARY_PORT`, `LAB_REPLIKA_REPLICA_PORT`, dan `LAB_REPLIKA_SINKRON_PORT` sendiri, misalnya `54640`, `54641`, dan `54642`; tanpa itu dua lajur berebut `54340`, `54341`, dan `54342`.
- `t5-fanout` memakai server dan port `api-t5` (18310 sampai 18316), dua port sendiri (penyedia push tiruan berkuota 18317 dan Kafka 19092, keduanya ditambah `LAB_PORT_OFFSET`), dan PostgreSQL bersama di `LAB_DB_PORT`. Kafka (`apache/kafka:4.3.2`, satu broker KRaft) berjalan di proyek compose sendiri `<COMPOSE_PROJECT_NAME>-t5-fanout` (tanpa variabel: `t5-fanout`), terpisah dari proyek lajur yang memegang PostgreSQL dan Redis; `make -C labs/t5-fanout down` hanya menghapus proyek itu. Lab ini tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur.
- `t5-service` memakai skema, role, dan kode `api-t5` (`dasar_t5.py`, `cmd/ledger`, `cmd/layanan`), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Port dasar (ditambah `LAB_PORT_OFFSET`): ledger 18320, service pembayaran 18321, service notifikasi 18322, OTLP/HTTP Collector 18323, metrik Collector 18324. Collector berjalan di proyek compose sendiri (`<COMPOSE_PROJECT_NAME>-t5-service`, image `otel/opentelemetry-collector-contrib:0.163.2`), jadi `make -C labs/t5-service down` tidak menyentuh PostgreSQL lajur. Sertifikat dan kunci dibuat di folder sementara di luar repo.
- `t5-waf` memakai skema, role, dan server `api-t5` (`dasar_t5.py`; flag `-pos-rahasia` dan mode rentan `pos-tanpa-cakupan`), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Port dasar sendiri (ditambah `LAB_PORT_OFFSET`): gerbang 18330. Gerbang (modul Go di `labs/t5-waf/gerbang`) memakai Redis lajur di `LAB_REDIS_PORT` untuk kuota per mitra dan hanya mau mendengar dan meneruskan ke alamat lokal. Biner dan rahasia tanda tangan dibuat di folder sementara di luar repo.
- `t5-rollout` memakai skema, role, dan kode `api-t5` (`dasar_t5.py`, `cmd/api`: biner host hanya untuk `-seed`; pod di cluster memakai image yang dibangun dari kode yang sama), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Cluster k3d `<COMPOSE_PROJECT_NAME>-t5-rollout` (tanpa variabel: `lab-t5-rollout`) memakai port dasar (ditambah `LAB_PORT_OFFSET`): Gateway Traefik 18360, API server k3s 18361, dan satu port per pod untuk `kubectl port-forward` mulai 18362 (sepuluh port, sampai 18371). Pod menjangkau PostgreSQL lajur lewat `host.k3d.internal` di `LAB_DB_PORT`. `make -C labs/t5-rollout down` hanya menghapus cluster lajur itu; biner `k3d` dan manifes Argo Rollouts yang diunduh ada di `labs/t5-rollout/.alat/` (di luar git).
- `t5-kms` memakai skema, role, dan kode `api-t5` (`dasar_t5.py`) serta `labs/t5-partisi` (riwayat posting dan ekspor CSV), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Ia memakai satu port dasar sendiri, 18331 (OpenBao mode dev, ditambah `LAB_PORT_OFFSET`); 18330 dipakai gerbang `t5-waf`. OpenBao berjalan di container `t5kms-<LAB_DB_PORT>-bao` (label `rjt.lab=t5-kms-<LAB_DB_PORT>`), dihapus `run.py` sesudah tiap bagian, dan tidak menyentuh proyek compose lajur. Image `ghcr.io/openbao/openbao:2.7.2` (259 MB) diunduh sekali bila belum ada. Kunci dan file sementara ada di folder sementara di luar repo (`t5-kms-<LAB_DB_PORT>`).
- `t5-replika` tidak memakai PostgreSQL bersama di `LAB_DB_PORT`: ia menjalankan kluster compose sendiri (primary, `replika`, `sinkron`; proyek compose bernama `t5-replika`, atau `<COMPOSE_PROJECT_NAME>-t5-replika` di lajur lain, terpisah dari proyek lajur yang memegang PostgreSQL dan Redis bersama) dan memindahkan semua sambungan `dasar_t5.py` ke port primary-nya (`pakai_database`). Ia memakai server dan port `api-t5` (18310 sampai 18316), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Container proyek itu dihapus oleh `run.py` sesudah rekaman.
- Lab deploy `api-t1` (halaman 1.31) memindahkan port host lewat `compose.lab-port.yaml`, berkas khusus lab yang memakai tag `!override` dari Docker Compose; `compose.yaml` yang dibaca halaman tidak berubah.

### Cara kerjanya

| Bahasa | Cara membaca variabel |
|---|---|
| Python | `from lab_env import DB_PORT, port_lab` (`labs/lab_env.py`): `f"port={DB_PORT}"` untuk database, `port_lab(18083)` untuk server |
| Shell | `. ../lab_env.sh || exit 1` (`labs/lab_env.sh`): `$LAB_DB_PORT`, `P=$(port_lab 18090) || exit 1` |
| Makefile | `include ../lab_env.mk` (`labs/lab_env.mk`): `$(LAB_DB_PORT)` |
| Compose | `${LAB_DB_PORT:-54333}` di `docker-compose.yml` |
| Go | `portLab(18101)` di `portlab.go` tiap modul: membaca `LAB_PORT_OFFSET` |
| Dart, Node | `LAB_PORT_OFFSET` dari lingkungan, ditambahkan ke port dasar |

Nilai yang bukan bilangan bulat desimal atau di luar 1 sampai 65535 menghentikan runner Python, skrip shell, dan server Go dengan `GAGAL`; Dart dan Node berhenti dengan galat bawaannya, dan Makefile hanya meneruskan nilai ke proses itu. Nilai kosong sama dengan tidak diisi. Server Go yang menerima alamat lewat flag (`api-t1`, `api-t2`, `e5-payload`, `e3-idempotency/ledger`) dijalankan `run.py` dengan `-addr` atau `-alamat`; bawaan flag itu tidak diubah karena kodenya ikut dibangun ke image atau salinan yang hash-nya ditulis halaman.

### Gerbang

`tools/cek_port_lab.py` menolak port database, Redis, dan replika (`54333`, `54340`, `54341`, `56379`) yang tertulis tetap di luar helper dan nilai bawaan compose, dan menolak port server lab 18xxx yang tertulis tepat sesudah alamat host. Tesnya `tools/test_cek_port_lab.py` memutasi pohon contoh dan harus gagal. Keduanya jalan di `bash tools/cek_situs.sh`. Pengecualiannya ada di bagian atas `tools/cek_port_lab.py`.
