# Setelah Tahap 4

Polesan dari tinjauan Tahap 4 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `b11-integrasi` (skema lama) perlu versi ledger: gateway tanpa timeout, breaker dan antrean per gateway (R4-07, R4-32).
- Lab `b10-2-webhook`: tambah tiga gaya tanda tangan (HMAC atas timestamp dan body, SHA512 atas field, token statis) dan jadwal retry per status code (R4-08).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Jalur Security di peta tidak memuat 4.17 (secret di state IaC) padahal bagian isinya keamanan; pertimbangkan menambahkannya.
- Redis 8.10.2 (pin lab Tahap 3) lawan 8.10.3 terbaru: ulang cek versi saat `T4-siap` menulis lab.
- Paragraf 4.26 sampai 4.29 di naskah memakai "Tidak dijalankan" untuk k6 dan Testcontainers; periksa konsisten dengan 3.27 saat halaman ditulis.
- Halaman 4.15 memuat dua topik (file di penyimpanan objek dan presigned URL) dan 4.17 tiga (secret manager, IaC, alamat keluar tetap): pecah bila baca lebih dari 10 menit.
- Halaman 4.26 (pipeline, supply chain, CODEOWNERS, rilis bertahap, on-call) berpotensi paling panjang; pertimbangkan dua halaman.
- Lab `t4-webhook` memakai jadwal retry tiruan yang diskalakan; tulis skala di README supaya halaman tidak menyebut menit sebagai rekaman.
- RINGKAS 58 dari 60 baris: lipat peta Tahap 3 sesudah 3.32 merge, dan lipat peta Tahap 4 per kelompok begitu lab selesai.
- `registri.test.ts` mengunci judul tugas ANTREAN (`### lab-<nama> · ` dan `### 4.n · `): mengganti nama tugas menuntut mengubah tes.
- `plan/RISET-TAHAP-4.md` R4-20 masih menulis OpenTofu "provider Docker lokal" sebagai kemampuan; tidak diubah karena riset adalah catatan sumber, tetapi lab memakai provider `random` dan `local`.
- `eval_tahap.py peta 4` keluar 1 selama ada halaman "segera"; pertimbangkan opsi untuk mengabaikan "segera" di gerbang awal tahap.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Tes `TestKedaluwarsaHoldDijalankanDuaKali` bergantung pada `application_name = 'api-t4-tes'` untuk melihat penunggu lock; salinan tes dengan DSN lain gagal tanpa pesan yang jelas.
- Satu run `make run` gagal sekali di bagian `testing` saat CPU penuh; tes yang goyah tidak ditelusuri. Jalankan `make cek` di mesin yang tidak sedang dipakai.
- Rekonsiliasi memakai tanggal Asia/Jakarta di sisi ledger dan tiruan; gateway nyata mungkin memakai zona lain (selisih tanggal akan terbaca sebagai `tidak_di_gateway`).
- `labs/api-t4` menyalin kode api-t3 (±8.500 baris); pertimbangkan memindahkan paket bersama ke satu modul bila lab Tahap 5 menyalin lagi.
- `ERD4` perlu daftar migrasi `labs/api-t3/migrasi/000015..000019` dan `labs/api-t4/migrasi/000020..000023` di `tools/erd.py`.
- Otorisasi ulang dengan `id_penerbit` yang sama bersamaan dengan reversal untuk id itu masih memakai urutan lock berbeda (otorisasi: buku pemilik lalu baris otorisasi; reversal: baris otorisasi lalu buku pemilik): deadlock mungkin tetapi sempit. Perbaikan penuh membaca baris otorisasi tanpa lock, mengunci pemilik, lalu mengunci baris otorisasi.
- `LaporkanQR` tidak menolak karakter kontrol di `alasan` padahal back office menolaknya, dan hash audit memisah kolom dengan `0x1f`: bentuk kanonik ambigu bila `alasan` memuat `0x1f`. `audit_log.hash_sebelumnya` tidak UNIQUE: cabang rantai hanya dicegah advisory lock, bukan database.
- `alamatKhusus` di `internal/unduh` tidak memuat `64:ff9b:1::/48` dan `192.88.99.0/24`; tidak terjangkau dari jaringan container, tetapi daftar produksi perlu melengkapinya.
- `kontrak.txt` tidak mencetak versi oasdiff (hanya digest di `kontrak.sh`); `GET /warung` dan `POST /webhooks/pembayaran` 404 pada mode rentan tidak ada di kontrak.
- `CekTopup` sesudah kabar diparkir tidak pernah mengubah status pada kasus yang bisa dicapai (batas saldo, akun dibekukan, status akhir); halaman 4.7 jangan menulis bahwa pemeriksaan itu menemukan kebenaran baru.
- Dana tertahan yang dikembalikan reversal bisa menaikkan saldo `pemakai` di atas batas tingkat (batas hanya dijaga di top-up).
- Mutan tidak tertutup: `!l.Dibayar` di rekonsiliasi, pemeriksaan alamat harfiah sebelum dial di unduh, dan `KunciBukuID(dana_tertahan, settlement)` eksplisit di clearing.
