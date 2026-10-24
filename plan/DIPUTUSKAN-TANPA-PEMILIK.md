# Diputuskan tanpa pemilik (arsip)

Mode penyelesaian penuh sejak 2026-10-23 (keputusan 551). Butir lama dari MEMORI bagian "Diputuskan tanpa pemilik", urut waktu; rincian di KEPUTUSAN dengan nomor yang disebut. LAPORAN-AKHIR mengumpulkan file ini dan MEMORI.

## Sampai 2026-10-24 siang

- T2-mulai ditandai selesai tanpa tinjauan Tahap 1 (keputusan 552). Mudah dibatalkan: halaman 2.x bisa ditarik per PR.
- Nomor keputusan per tahap (keputusan 553): T2 konten 600–679, teknis 680–719, pengatur 720–799; T3 800–999; T4 1000–1199; T5 1200–1399; T6 1400–1499; laporan akhir 1500+. Di dalam blok tahap: konten +0–99, teknis +100–149, pengatur +150–199.
- Crosscheck kecil K4–K9 dan X1-t2/X2-t2 dihapus dari ANTREAN; EVALUASI-TAHAP-N menggantikannya (keputusan 554).
- Halaman 2.1 dan 2.2 ditulis sebelum lab-api-t2a karena Docker tertahan; lab tetap sebelum halaman yang memakainya (keputusan 562).
- Angka pertumbuhan Tahap 2 memakai rumus naskah 3b; 1.38 tidak diubah (keputusan 600).
- Halaman istilah di luar registry dan sidebar (688); tooltip istilah baru juga tampil di Tahap 1 (690). axe di gerbang per PR untuk 10 halaman yang 0 pelanggaran (693).
- Halaman cerita Tahap 2 lama tidak dihapus, dipindah ke akhir Tahap 2 di registry (605). 2.4 ditulis sebelum 2.3; selama Docker tertahan, halaman memakai rekaman yang sudah ada (722).
- 2.8 ditulis sebagai revisi ADR 6 tanpa nomor baru, karena ADR 12 sudah dipakai 1.40 dan ADR Tahap 2 lain 13–21; jembatan 1.42 dan 2.1 menyebut ADR 6 dan 5 dibuka lagi (723).
- "Di stack lain" 2.5 membahas penjadwalan, bukan kode job, supaya jawaban M15/ADR 19 tidak terbuka (622); versi pg_cron Supabase 1.6.4 dari image Supabase (671).
- Versi statis 1.12 tetap Erd.astro di dalam ErdTumbuh (697); wadah tabel gulir diberi role region + nama walau tidak wajib, skrip 425 B gzip di semua halaman berartikel (712).
- Halaman istilah buku dan saldo_cache ditunda ke 2.7/2.9; trigger batas saldo di widget SQLite 2.6 (lab membacanya di app) diminta diberi label oleh peninjau.
- Konvensi tanda ledger: positif = uang masuk ke buku, tanpa pemetaan debit/kredit (627); istilah "Buku ledger" supaya tooltip tidak menandai "buku" di Tahap 1 (628).
- Replay ledger sebagai widget React baru `RaceLedger`, bukan mode race.js (708); halaman lama B3.2 ditandai `lebur_ke` ke 2.11, tidak dihapus (638).
- api-t2: tanpa endpoint cek nama penerima, tetap bcrypt, nomor `K`+nomor akun dipertahankan dengan risiko tertulis (646–648).
- Serializable menangkap dua transfer M9 dengan 40001, jadi hanya Repeatable Read yang bukan pengganti lock (788); Coba 2.12 memakai laporan tutup buku, bukan replay M9 (642).
- Halaman lama diganti dengan `lebur_ke`, dipindah ke akhir Tahap 2, tidak dihapus (638, 642, 653, 781); halaman istilah di luar registry (688).
- Adegan M9 dengan penerima dari lab dan label "Rekaman lab, kondisi dibuat" untuk −Rp20.000 (637, 785); M10 memakai alur dua HP, bukan RaceLedger (650).
- ADR 14: app 1.0/1.1 masa peralihan, Bayar tanpa key diterima, wajib key sesudah satu minggu tanpa Bayar tanpa key (Asumsi, belum direkam) (654).
- Halaman Tahap 2 yang isinya mandiri dimulai sebelum prasyarat di-merge (722, 724); `lipat_masuk.py` menolak argumen asing dan diuji (725).
- Halaman lama B2.4, E3 diganti dengan `lebur_ke` dan dipindah ke akhir Tahap 2 (665, 653); "4 detik" M11 berlabel Ilustrasi dengan angka lab terpisah (663); "Di stack lain" 2.5 membahas penjadwalan (622).
- ADR 14 aturan 5 (masa peralihan app 1.0/1.1) berlabel rancangan belum ada di lab dan belum direkam; mode `-key-opsional` jadi pekerjaan lab berikutnya (793).
- lab-c4a: latar tugas keliru (api-t2 yang belum memeriksa daftar bocor), api-t2 tidak disentuh; daftar fiktif 27 entri jauh di bawah 3.000 ASVS 6.2.4 (661).
- Insiden jalur_inti: merge saat main maju membuat CI main merah; aturan baku: cek ancestor, merge main, `sinkron_cerita.py` dan `build_istilah.py`, CI ulang (BRIEF-SUBAGEN).
