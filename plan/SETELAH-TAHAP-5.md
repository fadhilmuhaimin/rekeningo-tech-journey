# Setelah Tahap 5

Polesan dari tinjauan Tahap 5 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `t5-replika` (skema saldo lama, jeda buatan) perlu versi ledger dengan jeda alami di bawah beban (R5-02, R5-39).
- Lab `t5-skala` partisi: periksa kunci primer dan FK ke tabel partisi di skema ledger (R5-04).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- `plan/RISET-TAHAP-5.md` 119 dari 120 baris: baris riset halaman akan melewati 120; batas 120 di skill riset-tahap hanya untuk riset awal (RISET-TAHAP-4 293 baris). Perjelas kalimat batas di skill saat DIRI-5.
- `labs/t5-skala`: hapus atau arsipkan sesudah `t5-partisi` dan `api-t5` merge, dengan persetujuan pemilik; `lb.txt` (sesi di memori lawan token) tidak punya halaman Tahap 5.
- `labs/README.md` dan `tools/cek_port_lab.py`: daftarkan port Kafka, k3d, OpenBao, PgBouncer, replica ketiga, dan Redis tiap lab baru sebelum lab pertama merge.
- `registri.test.ts` mengunci judul tugas ANTREAN (`### lab-<nama> · ` dan `### 5.n · `): mengganti nama tugas menuntut mengubah tes.
- Registry D2, D3, dan D4b kini tanpa nomor; `cek_tautan.py` lolos, tetapi teks luar yang masih menulis "5.1 Scaling" tidak ada di repo.
- `G3-rantai` bisa dipecah: `for T in 1 2 3 4` di `tools/cek_situs.sh` lolos hari ini (rantai 4: 31 langkah, sesudah 4.31 ke halaman Tahap 5; sesudah 5.1 terbit, 4.31 menuju 5.1) dan menjaga Berikutnya dari 4.31 selama 32 halaman ditulis; rantai 5 dan `gejala` menunggu 5.32.
- Penjaga yang tidak ada: path halaman "segera" (mutan R22) dan id serta path halaman setelah ditulis tetap mengikuti penjaga halamannya; tes `registri.test.ts` membekukan id Tahap 5, jadi mengganti id satu halaman menuntut mengubah tes itu.
- Kepala `catatan` registry `cerita.json` ("Tahap 3-5 masih versi lama dari plan/STORY.md") sudah usang sejak Tahap 3; bukan data tampil.
- Tes peta RINGKAS di `registri.test.ts` hanya meminta baris lipat `5.1–5.32 selesai` begitu pengatur melipat peta Tahap 5; tulis baris itu persis dengan tanda "–" panjang.
