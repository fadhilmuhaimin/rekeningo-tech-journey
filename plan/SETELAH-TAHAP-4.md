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
