<!-- Fragmen README untuk kartu virtual (lab-api-t4, bagian kartu). Induk menyisipkannya ke README.md lab dan menyambung flag di cmd/api/main.go. -->

## Kartu virtual dan penerbit tiruan

Naskah M37 dan ADR 42. Penerbit kartu memanggil Rekeningo untuk meminta persetujuan (otorisasi), menagih (clearing), dan membatalkan (reversal). Persetujuan tidak bisa ditarik kembali, jadi dana ditahan sebelum jawaban setuju: hold adalah jurnal di ledger dari buku pemilik ke buku sistem `dana_tertahan`. Penerbit di lab adalah proses tiruan lokal `cmd/penerbit`; tidak ada nomor kartu penuh di mana pun, hanya token dari penerbit dan empat digit terakhir (Asumsi desain, naskah 3b).

| Endpoint | Siapa | Hasil |
|---|---|---|
| `POST /kartu` | pemilik (login; akun `terverifikasi`, tidak dibekukan) | 201 kartu; 403 belum terverifikasi atau dibekukan; 429; 502 penerbit tidak tersedia, tanpa baris |
| `GET /kartu` | pemilik | 200 daftar kartu sendiri |
| `POST /kartu/{id}/bekukan`, `/buka` | pemilik | 200; 404 bila kartu milik orang lain; 409 bila kartu `ditutup`; akun yang dibekukan tim risk tidak bisa membuka |
| `POST /penerbit/otorisasi` | penerbit (`X-Penerbit-Kunci`) | 200 `{keputusan: setuju\|tolak, alasan?}`; 401 kunci salah; 409 `id_penerbit` dipakai untuk otorisasi lain; 422 |
| `POST /penerbit/clearing` | penerbit | 200 `ditangkap`; 404; 409 status atau saldo; 422 jumlah berbeda |
| `POST /penerbit/reversal` | penerbit | 200 `dibalik`; diulang tetap 200; 404; 409 bila sudah ditagih |

Aturan:

- **Hold sebelum setuju.** Otorisasi membuka satu transaction dengan `lock_timeout` (1 detik, flag `-kartu-lock-timeout`), mengunci buku pemilik (`ORDER BY id FOR UPDATE`, ADR 13), memeriksa saldo dan batas harian kartu sesudah lock, lalu menulis jurnal `kartu_tahan` (pemilik ke `dana_tertahan`) dan baris `otorisasi_kartu` berstatus `ditahan` dengan `jurnal_tahan_id` dan `tahan_sampai` 7 hari (Asumsi). Tidak ada panggilan jaringan di dalam transaction (ADR 22).
- **Idempotency-Key ke ledger = `id_penerbit`.** Key diklaim di `kunci_idempotensi` di transaction yang sama dengan jurnal dan berumur 24 jam. Ulangan dengan `id_penerbit` yang sama dijawab dari baris otorisasi tanpa jurnal kedua; baris itu permanen (`UNIQUE id_penerbit`), jadi sesudah key habis hanya baris yang menahan hold kedua. Bila jurnal dan key ada tetapi barisnya belum tertulis (proses mati di antaranya, ADR 37), ulangan menulis baris yang menunjuk jurnal tahan semula. Di lab satu proses kedua langkah itu satu transaction; kasus mati di antaranya diuji dengan menghapus barisnya dari luar.
- **Lock tidak didapat dalam `lock_timeout`** (SQLSTATE 55P03): jawaban `tolak` dengan alasan `sibuk`, tetap 200, supaya sampai sebelum tenggat penerbit. Hasilnya aman tetapi menolak pemilik yang sah; angka p95 jawaban terhadap tenggat 2 detik diukur lab `t4-kartu`, bukan di sini.
- **Alasan penolakan** satu kata: `kartu-tidak-dikenal` (tanpa baris, karena `kartu_id` wajib ada), `kartu-dibekukan` (kartu atau akun), `batas-harian`, `saldo-kurang`, `sibuk`, `kill-switch`. Penolakan yang tercatat dijawab `ditolak-sebelumnya` bila diulang; skema tidak menyimpan alasannya.
- **Clearing** memindahkan dana dari `dana_tertahan` ke `settlement_kartu` tanpa menyentuh saldo pemilik. Jumlah harus sama dengan otorisasi. Diulang tetap 200 dengan jurnal yang sama.
- **Reversal dan job kedaluwarsa** membalik jurnal tahan dengan jurnal pembalik (cermin, alasan lebih dari 20 karakter). Baris otorisasi dikunci dan statusnya harus `ditahan`; `membalik_jurnal_id` UNIQUE menjadi lapis kedua. Dua job bersamaan melepas sekali.
- **Kill switch:** `Dep.KartuAktif` (`atomic.Bool`) mematikan otorisasi baru tanpa deploy dan tanpa menyentuh database. Endpoint yang membalik nilainya ada di bagian back office; di sini hanya `Service.KartuAktifSekarang()`.
- **Rentan `-rentan kartu-tanpa-hold` (M37):** handler versi pertama. Saldo dibaca tanpa lock, lalu otorisasi disetujui dan dicatat `ditahan` tanpa jurnal; batas harian tidak diperiksa. `-lab-jeda-cek-tulis` melebarkan celah di antara cek dan tulis (Asumsi lab: celah alami hanya mikrodetik, tidak diukur). Clearing otorisasi tanpa hold mengambil dari saldo pemilik; bila saldo sudah tidak cukup, database menolak saat COMMIT (`saldo_karyawan_tidak_negatif`) dan jawabannya 409 `saldo-kurang`, sedangkan persetujuan sudah diberikan.

Di lab satu proses, "service pembayaran memanggil API ledger" (ADR 37) adalah panggilan fungsi di dalam transaction yang sama. Pemisahan service, dan akibatnya bagi ADR 42, dibuktikan lab `t4-modul`.

### Penerbit tiruan (`cmd/penerbit`)

Port dasar 18285 (`portLab`). Flag: `-addr`, `-api` (alamat Rekeningo), `-kunci` (nilai `X-Penerbit-Kunci`; data lab, bukan secret), `-tenggat` (bawaan 2 detik, mengikuti naskah M37), `-bila-timeout setuju|tolak` (bawaan `setuju`). `POST /kartu` menurunkan token dan empat digit dari `Idempotency-Key`, jadi key yang sama menghasilkan kartu yang sama. `POST /lab/otorisasi` meneruskan ke `/penerbit/otorisasi` dengan tenggat itu; bila jawaban terlambat atau gagal, penerbit memutuskan sendiri menurut aturan timeout dan membalas `{keputusan, sumber: "rekeningo"|"timeout"}`. `POST /lab/clearing` dan `/lab/reversal` meneruskan apa adanya. `POST /lab/aturan` `{bila_timeout, tenggat_ms}` mengganti aturan tanpa memulai ulang. Bawaan "setuju bila timeout" mengikuti naskah M37 (rujukan penerbit nyata ada di riset; [perlu verifikasi] ke dokumentasi penerbit saat halaman 4.22 dan 4.23 ditulis).

### Yang harus disambung di `cmd/api/main.go`

| Flag | Dep atau fungsi |
|---|---|
| `-penerbit-url` (bawaan `http://127.0.0.1:` + `portLab(18285)`) | `Dep.Penerbit = penerbit.Baru(url, klien.BatasBawaan)`; kosong = nil, `POST /kartu` menjawab 502 |
| `-penerbit-kunci` (tanpa bawaan; lab memakai `kunci-penerbit-lab`) | `Dep.KunciPenerbit`; kosong = semua panggilan `/penerbit/*` ditolak 401 |
| `-kartu-lock-timeout` (bawaan 1 detik) | `Dep.LockTimeoutKartu` |
| `-lab-jeda-cek-tulis` (bawaan 0) | `Dep.JedaCekTulis` |
| `-rentan kartu-tanpa-hold` | daftar mode yang sah; `svc = svc.DenganRentan(*rentan, push.Baru(...))` supaya `service.rentan` terisi |
| (tanpa flag) | `Dep.KartuAktif = &atomic.Bool{}` bernilai true; simpan rujukannya untuk endpoint kill switch |
| `-kedaluwarsa-hold` (job, keluar sesudahnya) | `svc.KedaluwarsaHold(ctx)` mencetak `diperiksa` dan `dilepas` |

`dasar_t4.py` perlu membangun `./cmd/penerbit` dan menjalankannya di `PORT_PENERBIT` (sudah didefinisikan). `.gitignore` perlu `/penerbit`.

### Yang belum ada di lab ini

- p95 jawaban otorisasi terhadap tenggat 2 detik, dan jawaban saat buku terkunci oleh otorisasi lain yang beruntun: `t4-kartu`.
- Baris buku `dana_tertahan` dipakai semua hold, jadi menjadi titik panas lain selain buku pemilik (naskah ADR 42 hanya menyebut buku pemilik). Pada 0,116 otorisasi per detik puncak (Asumsi naskah) belum terukur sebagai masalah.
- Penerbit yang timeout saat menerbitkan kartu meninggalkan kartu yatim di sisi penerbit; token-nya tidak pernah kita simpan, jadi tidak ada yang menagihnya.
- Satu kartu per permintaan tanpa batas jumlah kartu per akun; hanya batas laju (3 kartu, isi ulang 3 per jam, Asumsi lab).
- Pembekuan akun oleh tim risk dan endpoint kill switch: bagian back office. Kartu `ditutup` belum punya endpoint yang menulisnya.
- Clearing sebagian (jumlah lebih kecil dari hold) dan kartu multi-mata uang: tidak ada; jumlah berbeda ditolak 422.
- Kasus penerbit yang menolak tetapi jaringan kartu menyetujui (dokumentasi satu penerbit): Tidak dijalankan.

### Uji mutasi

Satu hal diubah di kode, tes (`-run` kartu di `internal/service` dan `internal/handler`) harus gagal karena sebab yang diuji, lalu kode dipulihkan. Tes memakai PostgreSQL sungguhan. 26 mutan; 25 tertangkap, 1 setara (tidak mengubah perilaku). Mutan M8, M15, dan M25 pertama kali lolos; tes kedaluwarsa kemudian diperkuat (dua job dipaksa bertemu di lock buku, dan `diperiksa` harus 0 sebelum jatuh tempo), lalu M8 dan M15 tertangkap. M1 dan M2 gagal lewat trigger saldo database (23514) saat COMMIT, jadi yang menangkap adalah invarian ledger, bukan cek di kode kartu.

| Mutan | Tes yang menangkap | Gagal karena |
|---|---|---|
| M1 hapus `FOR UPDATE` pada `KunciBukuAkun` (ledger.go) | SerentakVersiBenar | dua otorisasi serentak lolos; ledger menolak saldo negatif saat COMMIT |
| M2 hapus cek saldo | SerentakVersiBenar, DitolakDiulangDijawabSama, handler OtorisasiClearingReversal | otorisasi melebihi saldo tidak lagi `tolak saldo-kurang` |
| M3 hapus `lock_timeout` | LockTimeoutMenjawabSibuk | jawaban `setuju` sesudah menunggu lock, bukan `tolak sibuk` dalam batas |
| M4 balik tanda posting hold | MenahanDana, SerentakVersiBenar, IDSamaSatuHold | saldo pemilik naik, bukan turun |
| M5 kunci server kosong diterima | KunciPenerbit, handler PenerbitTanpaKunciYangSahDitolak | server tanpa kunci menerima kunci kosong |
| M6 pembanding kunci selalu benar | KunciPenerbit, handler PenerbitTanpaKunciYangSahDitolak | kunci salah diterima |
| M7 hapus syarat status `dibalik` pada reversal | ReversalIdempoten, KedaluwarsaHold, handler OtorisasiClearingReversal | reversal diulang membalik lagi (ditolak UNIQUE pembalik) |
| M8 hapus `FOR UPDATE` pada baris otorisasi | KedaluwarsaHoldDijalankanDuaKali | job kedua membalik hold yang sudah dibalik: UNIQUE `membalik_jurnal_id` |
| M9 key ledger tidak diklaim | MenahanDana, PulihDariKeyLedger | tidak ada key `selesai` untuk `id_penerbit` |
| M10 key ledger tidak diikat ke jurnal | MenahanDana, PulihDariKeyLedger | key tidak mengikat jurnal tahan |
| M11 hapus pemulihan dari key ledger | PulihDariKeyLedger | ulangan ditolak `ErrOtorisasiBeda`, bukan hold yang sama |
| M12 clearing diulang tidak idempoten | ClearingIdempoten | clearing kedua error status, bukan jawaban yang sama |
| M13 balik tanda posting clearing | ClearingIdempoten, TanpaHold | `dana_tertahan` naik saat ditagih |
| M14 hapus kill switch | KillSwitchMenolakTanpaBaris | otorisasi disetujui saat dimatikan |
| M15 job kedaluwarsa tanpa syarat jatuh tempo | KedaluwarsaHoldDijalankanDuaKali | job memeriksa hold yang belum jatuh tempo |
| M16 batas harian kartu dikalikan 1000 | Ditolak | otorisasi di atas batas harian disetujui |
| M17 abaikan akun dibekukan | Ditolak | akun dibekukan masih disetujui |
| M18 hapus syarat tingkat pada penerbitan | TerbitkanKartu | akun belum terverifikasi mendapat kartu |
| M19 ubah status kartu tanpa cek pemilik | UbahStatusKartu | kartu orang lain berhasil dibekukan |
| M20 hapus pemetaan saldo tidak negatif dari ledger | SerentakTanpaHoldDanClearingKeduaDitolak, handler TanpaHoldClearingKedua409 | clearing kedua mengembalikan error database mentah, bukan `ErrSaldoKurang` |
| M21 `id_penerbit` sama dengan jumlah lain dianggap ulangan | IDSamaSatuHold, handler OtorisasiClearingReversal | tidak ada `ErrOtorisasiBeda` |
| M22 hapus pemeriksaan kunci di handler penerbit | handler PenerbitTanpaKunciYangSahDitolak | permintaan tanpa kunci diproses (409, bukan 401) |
| M23 clearing tanpa hold mengambil dari `dana_tertahan` | SerentakTanpaHoldDanClearingKeduaDitolak, handler TanpaHoldClearingKedua409 | clearing kedua lolos, tidak ditolak ledger |
| M24 reversal memberi status `kedaluwarsa` | ReversalIdempoten, handler OtorisasiClearingReversal | status bukan `dibalik` |
| M25 hapus syarat jatuh tempo di `lepasHold` | tidak ada (mutan setara) | `tahan_sampai` tidak pernah berubah dan jam tidak mundur, jadi kueri `HoldKedaluwarsa` sudah menyaring hal yang sama |
| M26 mode rentan tidak berlaku | SerentakTanpaHoldDanClearingKeduaDitolak, handler TanpaHoldClearingKedua409 | otorisasi kedua ditolak saldo, bukan disetujui |

Tes tambahan `TestKartuSebagaiRoleAplikasi` menjalankan alur penuh sebagai role aplikasi `api_t4` (hak kolom dan tabel); dilewati bila `TEST_APP_DATABASE_URL` kosong, dan schema harus dibuat dengan hak.
