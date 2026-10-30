// Nilai penjaga halaman 4.22, dibangkitkan dari m37-kartu-dua-kali.mdx, diagram, skenario, dan baris riset oleh
// tmp/m37/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "8085f198dd993fa3",
  riset: ["3e76498315d0e3ab","71bd39bc847958e1","bd23ebcb9db8c83e","705a7dc77719f8a2","05827e414a3ea179"],
  diagram: "346625d7af69c80b",
  skenario: "6b7259ad002e3857",
  snippet: ["97bfef51738baa51","bdff5fbcd682ddac","a8fc33ce88c48e55","c3292ec26b54f46b","28f412c8939184c0"],
};

// Nilai terpisah dari kalimat terkunci: lima baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-215 | Rekaman dan kode lab t4-kartu untuk M37 (dibaca untuk halaman 4.22, tanpa menjalankan ulang) | Rekaman `labs/t4-kartu/output/otorisasi.txt` bagian A (Budi akun 40301, saldo 100000; AUTH-A dan AUTH-B Rp80.000 serentak, keduanya setuju dengan sumber rekeningo; tabel `otorisasi_kartu` dua baris `ditahan` dengan `ada_jurnal_tahan` f; buku `dana_tertahan` 0 dan `pemakai` 100000; kontrol AUTH-C berurutan juga setuju; 3 disetujui, jumlah 240000), B (clearing AUTH-A 200, AUTH-B dan AUTH-C 409 `saldo-kurang`; saldo `pemakai` 20000, `settlement_kartu` 80000), D (balasan 409 dari Rekeningo dibaca penerbit tiruan sebagai timeout: setuju dengan sumber timeout); `penerbit.txt` bagian A (server `-kartu-lock-timeout 3s`, buku dikunci lebih lama dari tenggat; AUTH-P1 setuju dengan sumber timeout tanpa baris; AUTH-P2 setuju dengan sumber rekeningo; clearing P1 404 dan P2 200; Rp160.000 disetujui lawan saldo Rp100.000, penutup Rp80.000), B (clearing atas otorisasi yang ditolak dijawab 409 tanpa jurnal), C (rekonsiliasi dengan SQL); kode `labs/api-t4/internal/service/kartu.go` (`otorisasiTanpaHold` baris 307 sampai 354: saldo dari `saldo_cache` tanpa lock, jeda lab, status `ditahan` tanpa jurnal; `Clearing` baris 373 sampai 442: SQLSTATE 23514 dengan constraint `saldo_karyawan_tidak_negatif` dipetakan ke ErrSaldoKurang), `labs/api-t4/internal/handler/handler_kartu.go` (rute: terbitkan, daftar, bekukan, buka, dan tiga rute penerbit otorisasi, clearing, reversal), `labs/api-t4/cmd/penerbit/main.go` (sumber keputusan rekeningo atau timeout; balasan bukan 200 dianggap tidak ada jawaban), `labs/t4-kartu/run.py` (`rekam_otorisasi`: server `-rentan kartu-tanpa-hold -lab-jeda-cek-tulis 300ms`, tenggat penerbit 10 detik di bagian itu); README lab bagian 'Selisih dengan naskah' butir 3, 6, dan 7. PostgreSQL 17.11, go1.27.1, pgx v5.11.0 | 4.22 (semua blok, Cek diri, diagram, widget alur t4-m37): angka rekaman, label 'dibaca dari kode', dan lingkup klaim negatif | Baru |",
  "| R4-216 | Dokumentasi satu penerbit kartu: tenggat 2 detik, keputusan oleh setelan timeout, dan alasan kegagalan (dibuka ulang 2026-10-30, dibaca dari teks mentah dengan curl; halaman menyebutnya tanpa nama merek) | docs.stripe.com/issuing/controls/real-time-authorizations (dibuka 2026-10-30; versi API dalam contoh kode 2025-03-31.basil): 'If Stripe doesn’t receive your approve or decline response within 2 seconds, the `Authorization` is automatically approved or declined based on your timeout settings, or Autopilot settings, if configured'. Bagian 'Monitor your webhook responses': `request_history.reason` bernilai `webhook_error` atau `webhook_timeout` bila respons tidak diterima. Bagian Autopilot: `webhook_error` bila versi API di header tidak valid atau respons tidak bisa diproses, `webhook_timeout` untuk semua kegagalan lain. Bagian 'Stripe Autopilot' (pengguna BIN sendiri): 'Stripe doesn’t hold the authorized funds, but they might still be captured' bila jaringan menyetujui sesudah Stripe menolak. Status HTTP selain 200 tidak dirinci, dan kalimat bahwa persetujuan tidak bisa ditarik tidak ada di dokumentasi [perlu verifikasi] | 4.22 (Yang Raka kira: tenggat 2 detik; tenggat membuka jalan kedua; Yang belum terjawab: dua alasan kegagalan tanpa rincian status HTTP) | Sama dengan R4-100 dan R4-340 (dibuka 2026-10-26 dan 2026-10-28): kalimat dan bagian tidak berubah |",
  "| R4-217 | Hitungan 4.22 atas angka yang tertulis di halaman (Hitungan, Ilustrasi) | 2 x Rp80.000 = Rp160.000 (masukan Ilustrasi dari naskah M37, jadi hasilnya Ilustrasi); Rp100.000 - Rp80.000 = Rp20.000 dan 3 x Rp80.000 = Rp240.000 (`otorisasi.txt` bagian A dan B); Rp240.000 - Rp80.000 = Rp160.000 yang tidak punya penutup (komentar akhir `otorisasi.txt` bagian B); `penerbit.txt` bagian A menulis sendiri Rp160.000 disetujui penerbit lawan saldo Rp100.000 dan penutup Rp80.000 | 4.22 (Gejala, Yang sebenarnya, Cek diri): label Hitungan dan Ilustrasi; Hitungan tidak diberi label Rekaman lab | Baru |",
  "| R4-218 | Selisih naskah M37 dengan lab untuk halaman 4.22 (penalaran dari rekaman, bukan sumber luar) | Naskah M37 menulis dua pembelian di dua toko online dalam beberapa detik dan clearing kedua 'esok harinya': lab memakai satu kartu, dua otorisasi serentak dengan jeda lab 300 ms ditambah kontrol ketiga berurutan, dan menagih segera sesudah otorisasi (toko, jam, dan laporan harian tidak ada di lab). Saldo Rp100.000 dan nominal Rp80.000 sama dengan rekaman, tetapi halaman tetap memberi label Ilustrasi pada ceritanya. Naskah menulis 'persetujuan tidak bisa ditarik': dokumentasi satu penerbit tidak memuat kalimat itu (R4-216), jadi halaman menulisnya hanya untuk api-t4 (rute di `handler_kartu.go`: hanya penerbit yang membatalkan lewat `/penerbit/reversal`). Naskah tidak menyebut siapa yang menduga bug di penerbit: halaman memakai Raka; yang diperiksa adalah sumber keputusan di penerbit tiruan. README lab butir 6 dan 7 (balasan bukan 200 dibaca timeout; penagihan atas otorisasi ditolak atau tak dikenal tidak dijurnal) ditulis sebagai pertanyaan terbuka, dan butir 1, 2, 4, 5 (jalur dengan hold) diserahkan ke halaman ADR 42 | 4.22 (Gejala, Yang sebenarnya, Yang belum terjawab, Yang tidak direkam); usulan ke badan PR | Baru |",
  "| R4-219 | Aturan saldo tidak negatif dijaga database dan berlaku untuk buku pemakai (dibaca untuk halaman 4.22) | `labs/api-t2/migrasi/000010_ledger_tabel.up.sql` baris 162 sampai 164: `CREATE CONSTRAINT TRIGGER saldo_karyawan_tidak_negatif AFTER INSERT ON posting DEFERRABLE INITIALLY DEFERRED` (diperiksa saat COMMIT); `labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql` baris 30 sampai 44: 'Invarian 3 (saldo tidak negatif) berlaku juga untuk buku pemakai dan merchant', galat `check_violation` dengan `CONSTRAINT = 'saldo_karyawan_tidak_negatif'`; `kartu.go` `Clearing` memetakan 23514 dengan nama constraint itu ke ErrSaldoKurang. Rekaman `otorisasi.txt` bagian B hanya menunjukkan jawaban 409 `saldo-kurang`, bukan SQLSTATE | 4.22 (Penagihan datang kemudian, dan ledger menolaknya): berlabel Tidak dijalankan, dibaca dari kode dan migrasi | Baru |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m37-tanpa-dana-tertahan"
 ],
 [
  ".judul",
  "Tanpa menahan dana, dua otorisasi lolos; bila jawaban terlambat, penerbit memutuskan sendiri"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-kartu · otorisasi.txt bagian A dan B, penerbit.txt bagian A"
 ],
 [
  ".baris[0].label",
  "Tanpa menahan dana"
 ],
 [
  ".baris[0].sub",
  "otorisasi.txt bagian A dan B"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Otorisasi 1: setuju"
 ],
 [
  ".baris[0].simpul[0].sub",
  "saldo dibaca Rp100.000"
 ],
 [
  ".baris[0].simpul[1].teks",
  "Otorisasi 2: setuju"
 ],
 [
  ".baris[0].simpul[1].sub",
  "saldo masih Rp100.000"
 ],
 [
  ".baris[0].simpul[2].teks",
  "Penagihan 2: ditolak ledger"
 ],
 [
  ".baris[0].simpul[2].sub",
  "saldo tidak boleh negatif"
 ],
 [
  ".baris[0].simpul[2].nada",
  "warn"
 ],
 [
  ".baris[1].label",
  "Jawaban lewat dari 2 detik"
 ],
 [
  ".baris[1].sub",
  "penerbit.txt bagian A"
 ],
 [
  ".baris[1].simpul[0].teks",
  "Jawaban Rekeningo terlambat"
 ],
 [
  ".baris[1].simpul[0].sub",
  "satu buku terkunci lebih dari 2 detik"
 ],
 [
  ".baris[1].simpul[1].teks",
  "Penerbit setuju sendiri"
 ],
 [
  ".baris[1].simpul[1].sub",
  "setelan lab: setuju bila timeout"
 ],
 [
  ".baris[1].simpul[2].teks",
  "Rekeningo tidak mencatat"
 ],
 [
  ".baris[1].simpul[2].sub",
  "tanpa baris, dana tidak ditahan"
 ],
 [
  ".baris[1].simpul[2].nada",
  "warn"
 ],
 [
  ".catatan",
  "Toko online, jam, dan laporan harian adalah Ilustrasi. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Kartu virtual Budi: dua otorisasi Rp80.000 untuk saldo Rp100.000, keduanya disetujui"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-kartu/output/otorisasi.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-kartu/output/otorisasi.txt"
 ],
 [
  ".sumber.catatan",
  "Lab t4-kartu, PostgreSQL 17.11, dari database bersih (make -C labs/t4-kartu run). Jalur utama: otorisasi.txt bagian A (dua otorisasi serentak) dan B (penagihan). Penerbit adalah proses tiruan lokal; toko online, jam, dan laporan harian adalah Ilustrasi. Ubah satu hal: otorisasi.txt bagian A (otorisasi ketiga sesudah dua yang pertama selesai) dan B. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log."
 ],
 [
  ".pengantar",
  "Penerbit kartu meminta dua otorisasi Rp80.000 untuk kartu Budi, yang saldonya Rp100.000. Tebak dulu apa yang dijawab Rekeningo, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "pnb"
 ],
 [
  ".komponen[0].label",
  "Penerbit tiruan"
 ],
 [
  ".komponen[1].id",
  "srv"
 ],
 [
  ".komponen[1].label",
  "Server api-t4 (versi pertama)"
 ],
 [
  ".komponen[2].id",
  "dbm"
 ],
 [
  ".komponen[2].label",
  "Database: otorisasi_kartu dan buku"
 ],
 [
  ".predict.q",
  "Penerbit meminta dua otorisasi Rp80.000 sekaligus untuk kartu Budi, yang saldonya Rp100.000. Versi pertama handler membaca saldo, lalu menjawab. Apa yang dijawab Rekeningo?"
 ],
 [
  ".predict.options[0]",
  "Setuju untuk yang pertama dan tolak untuk yang kedua, karena saldo hanya cukup satu kali"
 ],
 [
  ".predict.options[1]",
  "Tolak keduanya, karena dua permintaan serentak ditolak sebagai pengaman"
 ],
 [
  ".predict.options[2]",
  "Setuju untuk keduanya, dan saldo Budi menjadi −Rp60.000 sebelum penagihan"
 ],
 [
  ".predict.options[3]",
  "Setuju untuk keduanya, dan saldo Budi masih Rp100.000 sesudahnya"
 ],
 [
  ".predict.answer",
  3
 ],
 [
  ".predict.varian",
  false
 ],
 [
  ".predict.explain",
  "Handler versi pertama hanya membaca saldo dan tidak menahan dana. Kedua otorisasi membaca Rp100.000 dan keduanya disetujui, dan saldo Budi masih Rp100.000 sesudahnya. Rekaman otorisasi.txt bagian A."
 ],
 [
  ".langkah[0].dari",
  "pnb"
 ],
 [
  ".langkah[0].ke",
  "srv"
 ],
 [
  ".langkah[0].judul",
  "Penerbit meminta dua otorisasi Rp80.000 untuk Budi"
 ],
 [
  ".langkah[0].kirim",
  "# Budi (akun 40301): saldo Rp100.000, kartu virtual diterbitkan lewat POST /kartu\n# server: ./api-t4 -lab -rentan kartu-tanpa-hold -lab-jeda-cek-tulis 300ms"
 ],
 [
  ".langkah[0].jelas",
  "Budi punya kartu virtual dan saldo Rp100.000. Server memakai versi pertama handler otorisasi, dengan jeda 300 ms di antara cek dan tulis supaya celahnya terekam. Penerbit tiruan memberi tenggat 10 detik di bagian ini."
 ],
 [
  ".langkah[1].dari",
  "pnb"
 ],
 [
  ".langkah[1].ke",
  "srv"
 ],
 [
  ".langkah[1].judul",
  "Rekeningo menjawab setuju untuk keduanya"
 ],
 [
  ".langkah[1].kirim",
  "AUTH-A Rp80.000: setuju (sumber: rekeningo)\nAUTH-B Rp80.000: setuju (sumber: rekeningo)"
 ],
 [
  ".langkah[1].jelas",
  "Catatan penerbit tiruan menulis sumber keputusan: rekeningo. Penerbit tidak memutuskan sendiri, dan kedua id_penerbit berbeda."
 ],
 [
  ".langkah[1].nada",
  "warn"
 ],
 [
  ".langkah[2].dari",
  "srv"
 ],
 [
  ".langkah[2].ke",
  "dbm"
 ],
 [
  ".langkah[2].judul",
  "Dua baris berstatus ditahan, tanpa jurnal tahan"
 ],
 [
  ".langkah[2].kirim",
  "=> SELECT id_penerbit, status, jumlah, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu ORDER BY id_penerbit\n id_penerbit | status  | jumlah | ada_jurnal_tahan\n-------------+---------+--------+------------------\n AUTH-A      | ditahan | 80000  | f\n AUTH-B      | ditahan | 80000  | f\n(2 rows)\n=> SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis\n jenis         | saldo_cache\n---------------+-------------\n dana_tertahan | 0\n pemakai       | 100000\n(2 rows)"
 ],
 [
  ".langkah[2].jelas",
  "Kolom ada_jurnal_tahan bernilai f di kedua baris, dan buku dana_tertahan Rp0. Saldo Budi di buku tetap Rp100.000."
 ],
 [
  ".langkah[2].nada",
  "warn"
 ],
 [
  ".langkah[3].dari",
  "pnb"
 ],
 [
  ".langkah[3].ke",
  "srv"
 ],
 [
  ".langkah[3].judul",
  "Penagihan datang: yang pertama lolos, yang kedua ditolak"
 ],
 [
  ".langkah[3].kirim",
  "clearing AUTH-A Rp80.000: HTTP 200\nclearing AUTH-B Rp80.000: HTTP 409, /problems/saldo-kurang"
 ],
 [
  ".langkah[3].jelas",
  "Penagihan AUTH-A menutup Rp80.000 dari saldo. Penagihan AUTH-B ditolak ledger, karena saldo yang tersisa tidak cukup."
 ],
 [
  ".langkah[3].nada",
  "warn"
 ],
 [
  ".langkah[4].dari",
  "srv"
 ],
 [
  ".langkah[4].ke",
  "dbm"
 ],
 [
  ".langkah[4].judul",
  "Saldo Budi Rp20.000, dan Rp80.000 tanpa penutup"
 ],
 [
  ".langkah[4].kirim",
  "=> SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'settlement_kartu' ORDER BY b.jenis\n jenis            | saldo_cache\n------------------+-------------\n pemakai          | 20000\n settlement_kartu | 80000\n(2 rows)"
 ],
 [
  ".langkah[4].jelas",
  "Saldo Budi Rp20.000, dan penagihan pertama Rp80.000 tercatat di settlement_kartu. Persetujuan kedua, Rp80.000, sudah diberikan tanpa saldo yang menutupinya (Hitungan: Rp100.000 − Rp80.000 = Rp20.000)."
 ],
 [
  ".langkah[4].nada",
  "warn"
 ],
 [
  ".varian.label",
  "otorisasi ketiga datang sesudah dua yang pertama selesai"
 ],
 [
  ".varian.mulai",
  3
 ],
 [
  ".varian.langkah[0].dari",
  "pnb"
 ],
 [
  ".varian.langkah[0].ke",
  "srv"
 ],
 [
  ".varian.langkah[0].judul",
  "Otorisasi ketiga datang sesudah dua yang pertama selesai"
 ],
 [
  ".varian.langkah[0].kirim",
  "# Kontrol: otorisasi ketiga datang sesudah dua yang pertama selesai, bukan bersamaan.\nAUTH-C Rp80.000: setuju (sumber: rekeningo)"
 ],
 [
  ".varian.langkah[0].jelas",
  "Tidak ada yang berjalan bersamaan, dan AUTH-C tetap disetujui. Tanpa dana tertahan, tidak ada yang mengubah saldo yang dibaca otorisasi berikutnya."
 ],
 [
  ".varian.langkah[0].nada",
  "warn"
 ],
 [
  ".varian.langkah[1].dari",
  "srv"
 ],
 [
  ".varian.langkah[1].ke",
  "dbm"
 ],
 [
  ".varian.langkah[1].judul",
  "Tiga persetujuan berjumlah Rp240.000"
 ],
 [
  ".varian.langkah[1].kirim",
  "=> SELECT count(*) AS disetujui, sum(jumlah) AS jumlah_disetujui FROM otorisasi_kartu WHERE status = 'ditahan'\n disetujui | jumlah_disetujui\n-----------+------------------\n 3         | 240000\n(1 row)"
 ],
 [
  ".varian.langkah[1].jelas",
  "Tiga persetujuan masing-masing Rp80.000 berjumlah Rp240.000, untuk saldo Rp100.000 (3 × Rp80.000, Hitungan)."
 ],
 [
  ".varian.langkah[1].nada",
  "warn"
 ],
 [
  ".varian.langkah[2].dari",
  "pnb"
 ],
 [
  ".varian.langkah[2].ke",
  "srv"
 ],
 [
  ".varian.langkah[2].judul",
  "Penagihan kedua dan ketiga ditolak ledger"
 ],
 [
  ".varian.langkah[2].kirim",
  "clearing AUTH-A Rp80.000: HTTP 200\nclearing AUTH-B Rp80.000: HTTP 409, /problems/saldo-kurang\nclearing AUTH-C Rp80.000: HTTP 409, /problems/saldo-kurang"
 ],
 [
  ".varian.langkah[2].jelas",
  "Hanya penagihan pertama yang punya penutup. Rp160.000 yang sudah disetujui tidak punya saldo yang menutupinya (Rp240.000 − Rp80.000, Hitungan)."
 ],
 [
  ".varian.langkah[2].nada",
  "warn"
 ]
];
export const PROFIL_BARIS: string[] = [
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "Budi:1 Rp100.000:1 kartu:1",
 "satu:1 Rp80.000:2",
 "tidak:1 Budi:1 Hadi:1 pertama:1 kedua:1 ditolak:1 saldo:2 ledger:1 Rp20.000:1 negatif:1",
 "tidak:1 disetujui:1 saldo:1 Rekeningo:1 Rp80.000:1",
 "sama:1 dua:2 Hadi:1 bukan:1 tanpa:1 Rekaman lab:2 Tidak dijalankan:1 Ilustrasi:3 Asumsi:1 Hitungan:1 saldo:2 Rp100.000:1 Rp80.000:2 Rp160.000:1 lab:2 rekaman:1",
 "",
 "Raka:1",
 "satu:1 dua:1 Raka:1 saldo:1 penerbit:1 kartu:1 bug:1",
 "tidak:1 satu:1 Budi:1 Tidak dijalankan:1 setuju:1 tolak:1 otorisasi:1 penerbit:4 Rekeningo:2 Rp80.000:1 2 detik:1 lab:1 tiruan:1 kartu:5",
 "sama:2 dua:1 Raka:1 kedua:1 tanpa:1 otorisasi:2 penerbit:6 Rekeningo:1 bisa:1",
 "",
 "tidak:1 sesudah:1 pertama:1 kedua:1 bukan:1 penerbit:2 Rekeningo:2",
 "pertama:1 kedua:1 tanpa:1 Rekaman lab:1 ditahan:1 dana:1 saldo:1 otorisasi:3 Rp100.000:1 lab:1 jurnal:1",
 "",
 "",
 "",
 "sesudah:1 kedua:1 tanpa:1 dana:1 saldo:1 otorisasi:2 Rekeningo:1 Rp100.000:1",
 "",
 "tidak:1 hanya:1 satu:1 bukan:1 penerbit:1 300 ms:1 lab:2 tiruan:1 kartu:1 database:1 kode:2 rekaman:1 Kondisi rekaman:1",
 "tidak:1 hanya:1 dua:1 Budi:1 kedua:1 otorisasi:1 penerbit:2 Rekeningo:1 Rp80.000:1 rekeningo:1 10 detik:1 tiruan:1 kartu:1",
 "dua:1 Rekaman lab:1 otorisasi:4 lab:1 kartu:1",
 "tidak:1 hanya:1 satu:1 Raka:1 otorisasi:1 penerbit:2 Rekeningo:1 AUTH-A:1 AUTH-B:1 tiruan:1 rekaman:1 dugaan:1",
 "satu:1 pertama:1 setuju:2 saldo:2 otorisasi:1 kartu:2",
 "pertama:1 otorisasi:1 lab:1 kartu:2",
 "sama:1 satu:1 dua:1 cek-lalu-tulis:1 bisa:1 bisa sudah berubah:1 kode:1",
 "tidak:2 tanpa:1 lab:1",
 "tidak:1 satu:2 hold:1 dana:3 saldo:2 otorisasi:2 jurnal:1 dana_tertahan:1",
 "ditahan:1 dana:1 jurnal:1 dana_tertahan:1",
 "sesudah:1 dua:1 pertama:1 ketiga:1 bukan:1 otorisasi:1 bersamaan:1",
 "ketiga:1 Rekaman lab:1 disetujui:1 otorisasi:3 lab:1",
 "tidak:2 tetap:1 dua:1 ketiga:1 Hitungan:1 disetujui:1 saldo:2 otorisasi:1 Rp100.000:1 Rp80.000:2 Rp240.000:1",
 "tidak:1 sesudah:1 satu:2 ketiga:1 otorisasi:2 clearing:1 penerbit:1 ledger:1 lab:1 esok harinya:1",
 "Rekaman lab:1 saldo:1 otorisasi:2 penagihan:1 lab:1",
 "tidak:1 Budi:1 pertama:1 Hitungan:2 ditolak:1 disetujui:1 saldo:3 penagihan:1 409:1 Rp100.000:1 Rp80.000:4 Rp160.000:1 Rp240.000:2 Rp20.000:2 kartu:1 settlement_kartu:1 kurang:1",
 "tidak:1 hanya:1 Tidak dijalankan:1 saldo:1 409:2 lab:1 kartu:1 COMMIT:1 negatif:1 pemakai:1 database:1 kode:1 dibaca dari kode:1",
 "penerbit:1 terlambat:1",
 "tidak:1 hanya:1 Tidak dijalankan:1 menolak:1 otorisasi:2 penerbit:2 Rekeningo:1 kartu:3 reversal:1 bisa:1 dibaca dari file itu:1",
 "sama:1 satu:1 kedua:1 bukan:1 Tidak dijalankan:1 setuju:1 penerbit:2 Rekeningo:2 timeout:2 terlambat:1 2 detik:2 lab:1 tiruan:1 kartu:1",
 "satu:1 pertama:1 bukan:1 tanpa:1 timeout:1 lock_timeout:1 terlambat:1 tenggat:1",
 "Rekaman lab:1 penerbit:2 terlambat:1 lab:1",
 "tidak:2 hanya:1 disetujui:1 hold:1 saldo:1 Rekeningo:2 ledger:1 404:1 Rp100.000:1 Rp80.000:2 Rp160.000:1 AUTH-P1:2 AUTH-P2:1",
 "sama:1 Budi:1 pertama:1 kedua:1",
 "belum:1",
 "tidak:2 belum:1 satu:2 dua:1 setiap:1 otorisasi:1 penerbit:1 Rekeningo:1 409:2 200:2 timeout:3 [perlu verifikasi]:1 tiruan:1 kartu:1 bisa:1 rekaman:1",
 "tidak:3 belum:1 ditolak:2 saldo:1 otorisasi:1 penagihan:1 penerbit:1 Rekeningo:1 409:1 404:1 lab:1 cukup:1",
 "tidak:1 belum:1 setuju:1 ditahan:1 otorisasi:1 penerbit:3 Rekeningo:1 AUTH-P1:1 lab:1 kartu:2",
 "tidak:1",
 "hanya:1 sesudah:1 Hadi:1 Ilustrasi:1 otorisasi:1",
 "tidak:1 lab:1",
 "Tidak dijalankan:1 penerbit:1 lab:1 tiruan:1 kartu:1",
 "tidak:1 kepatuhan:1",
 "",
 "",
 "satu:1 dua:1 otorisasi:2 Rekeningo:1 serentak:1 rekaman:1",
 "",
 "tidak:2 sama:1 sesudah:1 satu:1 dua:1 tiga:1 pertama:1 ketiga:1 bukan:1 saldo:1 otorisasi:1 Rp100.000:1 Rp80.000:1",
 "",
 "tidak:1 satu:1 dua:1 kedua:1 tanpa:1 setuju:1 ditolak:1 dana:1 saldo:1 otorisasi:1 penagihan:1 Rekeningo:1 ledger:1 409:1 Rp100.000:1 Rp80.000:1 serentak:1",
 "sesudah:1 dua:1 tiga:1 pertama:1 ketiga:1 disetujui:1 Rp240.000:1",
 "",
 "",
 "",
 "sebelum:1 setuju:1 dana:1 otorisasi:1 ADR 42:1",
 "dua:1 cek-lalu-tulis:1",
 "tidak:1 saldo:1",
 "penerbit:1 terlambat:1 kartu:1",
 "otorisasi:1 kartu:2",
 "kartu:1",
 "tidak:2 sebelum:1 setuju:1 dana:1 saldo:1 Rekeningo:1 lab:1 bisa:1 cukup:1",
 "",
 "tidak:1 pertama:1 disetujui:1 saldo:1 otorisasi:2 Rp100.000:1 Rp80.000:1",
 "",
 "",
 "tidak:1 hanya:1 tetap:1 sesudah:1 dua:1 pertama:2 ketiga:1 disetujui:1 dana:1 saldo:2 otorisasi:2 Rp100.000:1",
 "",
 "tidak:1 kedua:1 menolak:1 penagihan:1",
 "",
 "",
 "sesudah:1 dua:1 ditolak:1 disetujui:1 saldo:1 otorisasi:1 penagihan:1 penerbit:1 409:1 Rp100.000:1 Rp240.000:1",
 "",
 "Rekeningo:2 2 detik:1",
 "",
 "",
 "tidak:2 setuju:1 dana:1 penerbit:1 Rekeningo:1 404:1 lab:1",
 "",
 "",
 ""
];

export const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import tanpaDanaTertahan from \"../../../../data/diagram/t4-m37-tanpa-dana-tertahan.json\";",
  "<p class=\"meta\">Baca 8 menit · coba 3 menit · Prasyarat: [[t2-race-lock]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 10 Tahap 4. Budi menerbitkan kartu virtual dari saldonya, Rp100.000, untuk belanja online.",
  "Ia membeli barang Rp80.000 di satu toko online. Beberapa detik kemudian ia membeli barang lain Rp80.000 di toko online yang berbeda. Kedua toko menjawab pembayaran berhasil.",
  "Esok harinya Pak Hadi membuka laporan harian. Penagihan toko pertama masuk, dan saldo Budi turun ke Rp20.000. Penagihan toko kedua ditolak ledger, karena saldo tidak boleh negatif.",
  "Rp80.000 itu sudah disetujui Rekeningo kepada toko, dan tidak ada saldo yang menutupinya.",
  "*Angka cerita (Ilustrasi):* saldo Rp100.000, dua pembelian Rp80.000, dua toko online, dan Pak Hadi yang menemukan selisihnya berasal dari naskah, bukan dari rekaman. Rekaman lab memakai saldo dan nominal yang sama, tetapi tanpa toko, jam, dan laporan harian. Rp160.000 adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman (2 × Rp80.000), dan masukannya Ilustrasi. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka membaca laporan itu dan menghitung dua persetujuan untuk satu saldo. Ia menduga ada bug di penerbit kartu.",
  "Penerbit kartu adalah pihak yang menerbitkan nomor kartu virtual. Tiap kali Budi membeli sesuatu, penerbit meminta izin ke Rekeningo lewat otorisasi: \"setujui pembelian Rp80.000 dari kartu ini?\". Rekeningo menjawab setuju atau tolak, dan penerbit menunggu paling lama 2 detik ([dokumentasi satu penerbit kartu](https://docs.stripe.com/issuing/controls/real-time-authorizations), dibuka 2026-10-30, Tidak dijalankan). Di lab, penerbit adalah proses tiruan di komputer sendiri: tidak ada kartu, nomor, atau layanan nyata.",
  "Dugaan Raka bisa diperiksa dari catatan keputusan penerbit. Tiap otorisasi membawa `id_penerbit`, nomor yang penerbit berikan untuk otorisasi itu. Bila penerbit mengirim permintaan yang sama dua kali, kedua permintaan membawa nomor yang sama. Bila penerbit menyetujui sendiri tanpa Rekeningo, catatannya menulis penerbit sebagai pemutus.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: kedua persetujuan datang dari Rekeningo, bukan dari penerbit, dan id_penerbit keduanya berbeda. Apa yang tidak dilakukan Rekeningo sesudah menyetujui yang pertama?</summary>",
  "Menahan dana. Baris otorisasi pertama berstatus `ditahan`, tetapi tanpa jurnal tahan, jadi saldo yang dibaca otorisasi kedua masih Rp100.000 (Rekaman lab, `otorisasi.txt` bagian A).",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Rekeningo menyetujui otorisasi sesudah membaca saldo, tetapi tanpa menahan dana, jadi otorisasi kedua masih membaca Rp100.000.",
  "<Rantai data={tanpaDanaTertahan} ringkas />",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan pgx v5.11.0, dari database bersih, dengan server `api-t4` satu proses dan penerbit tiruan. Server memakai mode `-rentan kartu-tanpa-hold`: kode lab yang ditulis seperti uraian naskah, bukan salinan kode yang pernah berjalan di cerita. Jeda 300 ms di antara cek dan tulis hanya ada di lab. Lab tidak punya app, toko online, atau layanan kartu nyata.",
  "**Penerbit hanya meneruskan jawaban Rekeningo.** Lab meminta dua otorisasi Rp80.000 sekaligus untuk kartu Budi. Catatan penerbit tiruan menulis sumber kedua keputusan: `rekeningo`. Tenggat penerbit di bagian ini dinaikkan ke 10 detik, jadi waktu tidak ikut menentukan hasilnya:",
  "<Snippet file=\"labs/t4-kartu/output/otorisasi.txt\" lines=\"9:16\" title=\"Rekaman lab: labs/t4-kartu/output/otorisasi.txt, bagian A (dua otorisasi dan tabel otorisasi_kartu)\" />",
  "Kedua otorisasi punya id_penerbit berbeda, `AUTH-A` dan `AUTH-B`, dan masing-masing satu baris. Di rekaman ini penerbit tiruan hanya meneruskan jawaban Rekeningo, jadi dugaan Raka tidak didukung.",
  "**Handler versi pertama membaca saldo lalu setuju.** Handler membaca saldo kartu, memeriksa statusnya, lalu menulis satu baris `otorisasi_kartu` lewat fungsi `catat` dan menjawab setuju. Cuplikan ini memuat bagian akhirnya:",
  "<Snippet file=\"labs/api-t4/internal/service/kartu.go\" lines=\"344:353\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/service/kartu.go baris 344 sampai 353 (handler otorisasi versi pertama)\" />",
  "Pola ini bernama cek-lalu-tulis: kode membaca satu nilai, memutuskan dari nilai itu, lalu menulis hasilnya sebagai langkah terpisah. Di antara keduanya, nilai itu bisa sudah berubah. [[t2-m9]] memuat pola yang sama pada dua transfer.",
  "Jeda lab di cuplikan memperlebar celah di antara cek dan tulis, supaya hasilnya tidak bergantung pada waktu. Lebar celah tanpa jeda tidak diukur.",
  "**Tidak ada dana yang berpindah.** Hold adalah dana di saldo yang dipisahkan sementara untuk satu otorisasi, supaya otorisasi berikutnya membaca saldo yang sudah berkurang. Dana itu dicatat di buku sistem `dana_tertahan` lewat satu jurnal. Handler ini tidak membuat hold.",
  "Status `ditahan` di tabel hanyalah nama status: kolom `ada_jurnal_tahan` bernilai `f`, dan buku `dana_tertahan` berisi 0.",
  "Lab juga mengirim otorisasi ketiga sesudah dua yang pertama selesai, bukan bersamaan:",
  "<Snippet file=\"labs/t4-kartu/output/otorisasi.txt\" lines=\"17:30\" title=\"Rekaman lab: labs/t4-kartu/output/otorisasi.txt, bagian A (buku, otorisasi ketiga, dan jumlah yang disetujui)\" />",
  "Otorisasi ketiga tetap disetujui. Tiga persetujuan Rp80.000 berjumlah Rp240.000 untuk saldo Rp100.000 (3 × Rp80.000, Hitungan). Di [[t2-m9]], kegagalan butuh dua request yang tumpang tindih. Di sini menunggu pun tidak menolong, karena langkah tulis tidak mengubah saldo yang dibaca otorisasi berikutnya.",
  "**Penagihan datang kemudian, dan ledger menolaknya.** Penagihan dari toko lewat penerbit disebut clearing. Di cerita ia datang esok harinya, sedangkan lab memanggilnya segera sesudah otorisasi karena jedanya tidak diukur. Lab menagih ketiga otorisasi satu per satu:",
  "<Snippet file=\"labs/t4-kartu/output/otorisasi.txt\" lines=\"33:49\" title=\"Rekaman lab: labs/t4-kartu/output/otorisasi.txt, bagian B (penagihan dan saldo)\" />",
  "Penagihan pertama memindahkan Rp80.000 dari saldo ke buku `settlement_kartu`, jadi saldo Budi tinggal Rp20.000 (Hitungan: Rp100.000 − Rp80.000). Dua penagihan lain ditolak dengan 409, karena Rp20.000 kurang dari Rp80.000. Dari Rp240.000 yang disetujui, Rp160.000 tidak punya saldo yang menutupinya (Rp240.000 − Rp80.000, Hitungan).",
  "Penolakan itu datang dari database. Aturan saldo tidak boleh negatif ([[t2-ledger]]) diperiksa saat COMMIT dan berlaku juga untuk buku jenis `pemakai`. Kode lab memetakan pelanggarannya ke 409 `saldo-kurang`. Rekamannya hanya menunjukkan 409, jadi sebabnya dibaca dari kode: fungsi `Clearing` di `labs/api-t4/internal/service/kartu.go`, migrasi `000010` di `labs/api-t2/migrasi`, dan migrasi `000020` di `labs/api-t4/migrasi` (Tidak dijalankan).",
  "Ledger menjaga uang, tetapi terlambat. Persetujuan sudah sampai ke penerbit dan toko.",
  "Persetujuan itu tidak bisa ditarik dari sisi Rekeningo. Di `labs/api-t4/internal/handler/handler_kartu.go`, rute untuk pemilik kartu hanya menerbitkan, melihat, membekukan, dan membuka kartu, dan membekukan menolak otorisasi baru. Satu-satunya rute yang membatalkan otorisasi, `POST /penerbit/reversal`, dipanggil penerbit (Tidak dijalankan: dibaca dari file itu).",
  "**Tenggat 2 detik membuka jalan kedua ke gejala yang sama.** Bila jawaban Rekeningo terlambat dari 2 detik, penerbit memutuskan menurut setelan timeout miliknya, bukan menurut Rekeningo (dokumentasi satu penerbit kartu, Tidak dijalankan). Penerbit tiruan memakai setelan lab: setuju bila timeout.",
  "Lab membuat jawaban terlambat dengan sengaja. Satu buku dikunci transaction lain lebih lama dari tenggat. Server dijalankan dengan `-kartu-lock-timeout 3s`, setelan yang salah dan sengaja dipasang. `lock_timeout` adalah batas waktu PostgreSQL untuk menunggu satu lock. Server di bagian ini bukan versi pertama, tanpa `-rentan`.",
  "<Snippet file=\"labs/t4-kartu/output/penerbit.txt\" lines=\"8:21\" title=\"Rekaman lab: labs/t4-kartu/output/penerbit.txt, bagian A (jawaban terlambat)\" />",
  "Penerbit menyetujui `AUTH-P1` sendiri, dan Rekeningo tidak punya baris maupun hold untuk id itu. Saldo tidak berkurang, jadi `AUTH-P2` Rp80.000 disetujui lagi oleh Rekeningo. Penagihan `AUTH-P1` dijawab 404. Penerbit menyetujui Rp160.000 untuk saldo Rp100.000, dan hanya Rp80.000 yang punya penutup di ledger.",
  "Itu angka yang sama dengan cerita Budi, dari jalan yang berbeda. Apa yang membedakan server ini dari versi pertama, dan cara menutup kedua jalan, ada di [[t4-kartu]].",
  "**Yang belum terjawab.**",
  "- Penerbit tiruan membaca setiap balasan selain 200 sebagai tidak ada jawaban, lalu memutuskan menurut setelan timeout. Di rekaman, satu balasan 409 dari Rekeningo menjadi persetujuan dengan sumber `timeout` (`otorisasi.txt` bagian D). Dokumentasi satu penerbit kartu memberi dua alasan kegagalan, `webhook_error` dan `webhook_timeout`, tetapi tidak merinci status HTTP selain 200. Apakah balasan 409 atau 500 dihitung sebagai kegagalan itu, belum bisa dicek ke sumber primer [perlu verifikasi].",
  "- Penagihan atas otorisasi yang tidak dikenal (404) atau yang ditolak Rekeningo (409) tidak dijurnal di lab. Rekaman `penerbit.txt` bagian B memakai saldo pemilik yang tidak cukup. Apakah penagihan itu didebit, ditolak, atau menjadi insiden bernomor adalah keputusan produk yang belum final.",
  "- Rekonsiliasi kartu, yaitu mencocokkan catatan penerbit dengan tabel `otorisasi_kartu`, belum ada sebagai job di lab. Perbandingannya dijalankan dengan SQL di `penerbit.txt` bagian C, dan menemukan `AUTH-P1`: setuju di penerbit, tidak ditahan di Rekeningo.",
  "**Yang tidak direkam.**",
  "- Toko online, hari berikutnya, Pak Hadi, dan laporan harian hanya ada di cerita (Ilustrasi). Lab menagih segera sesudah otorisasi.",
  "- App Flutter dan layar belanja tidak ada di lab.",
  "- Perilaku penerbit nyata di luar dokumentasi yang dibuka Tidak dijalankan. Penerbit, kartu, dan nomor di lab adalah tiruan lokal.",
  "- Halaman ini tidak mengklaim izin atau kepatuhan regulasi apa pun.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `otorisasi.txt` bagian A dan B, dengan satu varian dari bagian A. Tebak dulu apa yang dijawab Rekeningo atas dua otorisasi serentak, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m37.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: otorisasi ketiga datang sesudah dua yang pertama selesai**. Hasilnya sama: tiga persetujuan Rp80.000 untuk saldo Rp100.000, jadi keserentakan bukan syaratnya. Lab tidak punya app dan tidak merekam layar.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: dua otorisasi Rp80.000 serentak dijawab setuju oleh Rekeningo untuk saldo Rp100.000, tanpa dana tertahan, dan penagihan kedua ditolak ledger dengan 409.",
  "Otorisasi ketiga yang datang sesudah dua yang pertama selesai juga disetujui, jadi tiga persetujuan berjumlah Rp240.000. Rekamannya ada di cuplikan pada blok sebelumnya.",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-kartu]]: otorisasi yang menahan dana sebelum menjawab setuju, dan batas waktu jawabannya. Keputusannya ADR 42.",
  "- [[t2-m9]]: pola cek-lalu-tulis pada dua transfer.",
  "- [[t2-race-lock]]: lock yang membuat membaca dan menulis saldo tidak disela request lain.",
  "- [[t4-prd]]: PRD v4 menulis kartu virtual sebagai P1, dan jawaban yang terlambat diputuskan penerbit menurut setelannya.",
  "- [[t4-skema]]: tabel `kartu` dan `otorisasi_kartu`.",
  "- [[t4-fitur-teknis]]: kartu virtual sebagai fitur dan pekerjaan teknisnya.",
  "Di lab, persetujuan yang sudah dijawab tidak bisa ditarik Rekeningo, jadi mengecek saldo saja tidak cukup. Cara menahan dana sebelum menjawab setuju ada di [[t4-kartu]].",
  "### Cek diri",
  "**1.** Dua otorisasi Rp80.000 untuk saldo Rp100.000 sama-sama disetujui. Kenapa menunggu otorisasi pertama selesai tidak menolong?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Handler versi pertama hanya membaca saldo dan tidak menahan dana, jadi saldo yang dibaca otorisasi berikutnya tetap Rp100.000. Otorisasi ketiga yang datang sesudah dua yang pertama selesai juga disetujui (`otorisasi.txt` bagian A).",
  "</details>",
  "**2.** Ledger menolak penagihan kedua. Kenapa itu tidak menyelesaikan masalahnya?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Penolakan datang sesudah persetujuan, dan persetujuan sudah sampai ke penerbit dan toko. Rp240.000 disetujui untuk saldo Rp100.000, dan dua penagihan ditolak dengan 409 (`otorisasi.txt` bagian B).",
  "</details>",
  "**3.** Jawaban Rekeningo lewat dari 2 detik. Siapa yang memutuskan otorisasinya, dan apa yang dicatat Rekeningo?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Penerbit memutuskan menurut setelan timeout-nya, yang di lab berarti setuju. Rekeningo tidak punya baris dan tidak menahan dana, dan penagihannya dijawab 404 (`penerbit.txt` bagian A).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
