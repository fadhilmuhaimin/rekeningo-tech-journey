# Lab Rekeningo

Setiap folder di sini adalah satu lab dengan `run.py` atau `Makefile` sendiri, dan hasilnya direkam di `output/`. Daftar lab, schema, dan kontainernya ada di `README.md` di akar repo. Halaman ini hanya menjelaskan satu hal: cara menjalankan lab di beberapa lajur kerja sekaligus.

## Beberapa lajur sekaligus

Semua lab berbagi satu PostgreSQL di `127.0.0.1:54333`, dan tiap lab membuat ulang schema-nya setiap kali jalan. Server lab (Go, Node, Dart) mendengarkan port tetap di rentang 18080 sampai 18171. Dua lajur kerja (dua worktree) yang menjalankan lab bersamaan akan saling mereset database dan bentrok di port.

Empat variabel lingkungan memisahkan satu lajur dari lajur lain. Tanpa variabel, semuanya sama persis dengan sebelumnya.

| Variabel | Bawaan | Fungsi |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | nama folder compose (`b3-race`, `b9-cache`) | Nama proyek Docker Compose: nama kontainer dan jaringan |
| `LAB_DB_PORT` | `54333` | Port PostgreSQL bersama di host |
| `LAB_PORT_OFFSET` | `0` | Ditambahkan ke setiap port server lab |
| `LAB_REDIS_PORT` | `56379` | Port Redis lab `b9-cache` |

Lab Tahap 5 `t5-replika` punya dua port database sendiri: `LAB_REPLIKA_PRIMARY_PORT` (bawaan `54340`) dan `LAB_REPLIKA_REPLICA_PORT` (bawaan `54341`).

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
- Redis dan port replika tidak ikut offset; mereka punya variabel sendiri (tabel di atas).

### Cara kerjanya

| Bahasa | Cara membaca variabel |
|---|---|
| Python | `from lab_env import DB_PORT, port_lab` (`labs/lab_env.py`): `f"port={DB_PORT}"` untuk database, `port_lab(18083)` untuk server |
| Shell | `. ../lab_env.sh` (`labs/lab_env.sh`): `$LAB_DB_PORT`, `$(port_lab 18090)` |
| Makefile | `include ../lab_env.mk` (`labs/lab_env.mk`): `$(LAB_DB_PORT)` |
| Compose | `${LAB_DB_PORT:-54333}` di `docker-compose.yml` |
| Go | `portLab(18101)` di `portlab.go` tiap modul: membaca `LAB_PORT_OFFSET` |
| Dart, Node | `LAB_PORT_OFFSET` dari lingkungan, ditambahkan ke port dasar |

Nilai yang bukan bilangan bulat atau di luar 1 sampai 65535 menghentikan lab dengan `GAGAL`. Server Go yang menerima alamat lewat flag (`api-t1`, `api-t2`, `e5-payload`, `e3-idempotency/ledger`) dijalankan `run.py` dengan `-addr` atau `-alamat`; bawaan flag itu tidak diubah karena kodenya ikut dibangun ke image atau salinan yang hash-nya ditulis halaman.

### Gerbang

`tools/cek_port_lab.py` menolak port database, Redis, dan replika (`54333`, `54340`, `54341`, `56379`) yang tertulis tetap di luar helper dan nilai bawaan compose, dan menolak port server lab 18xxx yang tertulis tepat sesudah alamat host. Tesnya `tools/test_cek_port_lab.py` memutasi pohon contoh dan harus gagal. Keduanya jalan di `bash tools/cek_situs.sh`. Pengecualiannya ada di bagian atas `tools/cek_port_lab.py`.
