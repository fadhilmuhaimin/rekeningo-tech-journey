// Nilai penjaga halaman 4.24, dibangkitkan dari m38-siapa-membuka.mdx, diagram, skenario, dan baris riset oleh
// tmp/m38/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "90422027a6ded00f",
  riset: ["d0e98aff8ed95618","219d20f2ad69199c","bf83ddff989930a2","352d1ab8362ffaab","075d63f9cc170694"],
  diagram: "d7690196cebb9c54",
  skenario: "23082ab3b26c8c86",
};

// Nilai terpisah dari kalimat terkunci: lima baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-225 | Rekaman dan kode lab t4-audit dan api-t4 untuk M38 (dibaca untuk halaman 4.24, tanpa menjalankan ulang) | `labs/t4-audit/output/rantai.txt` baris 12 sampai 27 (bagian A: mode `bo-tanpa-audit`, enam aksi atas akun 40001, `audit_log` nol baris, jawaban untuk akun 40001 dan 40002 nol baris), baris 42 sampai 61 (bagian B: mode `bo-log-biasa`, enam baris, `UPDATE 1` dan `DELETE 1` oleh role `api_t4`, lima baris, nomor bolong 1), baris 66 sampai 95 (bagian C: log berantai, ubah baris 3 terdeteksi di baris 3, baris ke-7 palsu lolos, hapus baris 2 terdeteksi di baris 3); `role.txt` baris 83 sampai 89 (baca tabel `verifikasi` sebagai role `lab`, baris audit sama) dan baris 6 sampai 14 (bagian A: `lab` rolsuper t); baris 83 menyebut `lab` sebagai pemilik schema; `labs/t4-audit/peran.sql` baris 10 (`GRANT SELECT, INSERT, UPDATE, DELETE` atas `audit_biasa` untuk `api_t4`); `labs/api-t4/internal/service/t4_audit.go` baris 16 sampai 26 (fungsi `Audit`); `internal/service/bo.go` baris 147 sampai 163 (`LihatVerifikasiBO` memanggil `Audit` dalam transaction yang sama); README `labs/t4-audit` bagian \"Hal yang dikirim skrip lab\" dan \"Selisih dengan naskah\" butir 10 (naskah menulis akun bersama dan log sebagian, lab memakai dua mode; pemilik data Dina, bukan Budi); `labs/b3-race/docker-compose.yml` (database lab dijalankan dengan `log_statement=all`) | 4.24 | Tidak berubah |",
  "| R4-226 | CWE-778 Insufficient Logging: kejadian penting keamanan tidak dicatat (dibuka untuk halaman 4.24) | MITRE CWE, \"CWE-778: Insufficient Logging\" (cwe.mitre.org/data/definitions/778.html, dibuka 2026-10-30): \"When a security-critical event occurs, the product either does not record the event or omits important details about the event when logging it.\"; dampak: \"There will be no trail for forensic analysis, and discovering the cause of problems or the source of attacks may become more difficult or impossible.\" Kutipan dicocokkan dengan teks mentah halaman (curl, dibuka 2026-10-30); halaman memuat \"CWE-778: Insufficient Logging (5.0)\" | 4.24 (\"tidak ada catatan\": menamai keadaan versi pertama; klaim bahwa nol baris sama nilainya dengan tidak tahu berasal dari rekaman, bukan dari CWE) | Tidak diperiksa antar versi CWE |",
  "| R4-227 | OWASP Logging Cheat Sheet: deteksi perubahan pada catatan (dibuka untuk halaman 4.24) | OWASP Cheat Sheet Series, \"Logging Cheat Sheet\" (cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html; halaman tanpa tanggal pembaruan, dibuka 2026-10-30): bagian Deployment and operation, Protection, At rest: \"Build in tamper detection so you know if a record has been modified or deleted\"; bagian yang sama: \"All access to the logs must be recorded and monitored (and may need prior approval)\"; bagian Which events to log, higher-risk functionality: \"Access to sensitive data such as payment cardholder data\". Halaman itu menulis \"a separate database account that is only used for writing log data\" di bagian Where to record event data. Kutipan dicocokkan dengan teks mentah halaman (curl, dibuka 2026-10-30) | 4.24 (log biasa tidak punya deteksi perubahan); butir lain (akun database khusus tulis) untuk 4.25 | Tidak diperiksa |",
  "| R4-228 | Superuser PostgreSQL melewati pemeriksaan hak (dibuka untuk halaman 4.24) | Dokumentasi PostgreSQL 17 (17.11 menurut tautan Home di halaman), bab 21.2 Role Attributes (kutipan dicocokkan dengan teks mentah via curl; postgresql.org/docs/17/role-attributes.html, dibuka 2026-10-30): \"A database superuser bypasses all permission checks, except the right to log in.\" Lab memakai 17.11; `role.txt` bagian A mencatat `lab` dengan `rolsuper` t | 4.24 (role `lab` pemilik schema dan superuser di lab) | Tidak diperiksa antar versi PostgreSQL |",
  "| R4-229 | Pencatatan pernyataan SQL oleh server PostgreSQL (dibuka untuk halaman 4.24) | Dokumentasi PostgreSQL 17 (17.11 menurut tautan Home di halaman), bab 19.8 Error Reporting and Logging (postgresql.org/docs/17/runtime-config-logging.html, dibuka 2026-10-30, dicocokkan dengan teks mentah via curl): `log_statement` bernilai `none`, `ddl`, `mod`, atau `all`; \"The default is `none`.\" Database lab dijalankan dengan `log_statement=all` (`labs/b3-race/docker-compose.yml`); rekaman t4-audit tidak membaca log server itu | 4.24 (bagian \"Yang tidak direkam\": apakah pembacaan engineer ada di log server tidak diperiksa) | Tidak diperiksa antar versi PostgreSQL |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m38-siapa-membuka"
 ],
 [
  ".judul",
  "Yang direkam: tiga cara pertanyaan Pak Hadi tidak terjawab"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-audit · rantai.txt dan role.txt"
 ],
 [
  ".baris[0].label",
  "Tanpa catatan"
 ],
 [
  ".baris[0].sub",
  "bagian A di rantai.txt"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Dina: 6 aksi"
 ],
 [
  ".baris[0].simpul[0].sub",
  "disentuh"
 ],
 [
  ".baris[0].simpul[1].teks",
  "Catatan: 0 baris"
 ],
 [
  ".baris[0].simpul[1].sub",
  "untuk Dina"
 ],
 [
  ".baris[0].simpul[1].nada",
  "warn"
 ],
 [
  ".baris[0].simpul[2].teks",
  "Eko: 0 aksi"
 ],
 [
  ".baris[0].simpul[2].sub",
  "0 baris juga"
 ],
 [
  ".baris[1].label",
  "Log biasa"
 ],
 [
  ".baris[1].sub",
  "bagian B di rantai.txt"
 ],
 [
  ".baris[1].simpul[0].teks",
  "6 baris"
 ],
 [
  ".baris[1].simpul[0].sub",
  "tercatat"
 ],
 [
  ".baris[1].simpul[1].teks",
  "Satu diubah, satu dihapus"
 ],
 [
  ".baris[1].simpul[1].sub",
  "role aplikasi"
 ],
 [
  ".baris[1].simpul[2].teks",
  "5 baris"
 ],
 [
  ".baris[1].simpul[2].sub",
  "pelaku baris 3 berganti"
 ],
 [
  ".baris[1].simpul[2].nada",
  "warn"
 ],
 [
  ".baris[2].label",
  "Baca tabel langsung"
 ],
 [
  ".baris[2].sub",
  "bagian C di role.txt"
 ],
 [
  ".baris[2].simpul[0].teks",
  "Role lab"
 ],
 [
  ".baris[2].simpul[0].sub",
  "pemilik schema"
 ],
 [
  ".baris[2].simpul[1].teks",
  "Baca verifikasi"
 ],
 [
  ".baris[2].simpul[1].sub",
  "1 pengajuan"
 ],
 [
  ".baris[2].simpul[2].teks",
  "Catatan: tetap"
 ],
 [
  ".baris[2].simpul[2].sub",
  "tidak bertambah"
 ],
 [
  ".baris[2].simpul[2].nada",
  "warn"
 ],
 [
  ".catatan",
  "Pemilik data di rekaman adalah Dina (akun 40001), bukan Budi. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Siapa yang membuka data Dina: tanpa catatan, log biasa, dan baca tabel langsung"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-audit/output/rantai.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-audit/output/rantai.txt"
 ],
 [
  ".sumber.catatan",
  "Lab t4-audit, PostgreSQL 17.11, go1.27.1 (make -C labs/t4-audit run). Jalur utama: rantai.txt bagian A (tanpa catatan) dan bagian B (log biasa), lalu role.txt bagian C (baca tabel verifikasi sebagai role lab). Ubah satu hal: rantai.txt bagian C (log berantai). Pemilik data di rekaman adalah Dina (akun 40001), bukan Budi. Stafnya Ratih (akun 420) dan Tim Risk Dua (akun 421), masing-masing dengan akun sendiri. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log."
 ],
 [
  ".pengantar",
  "Back office versi pertama diuji dengan enam aksi atas akun Dina. Tebak dulu apa yang bisa dibaca Pak Hadi sesudahnya, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "ptg"
 ],
 [
  ".komponen[0].label",
  "Staf risk (Ratih)"
 ],
 [
  ".komponen[1].id",
  "bo"
 ],
 [
  ".komponen[1].label",
  "Back office"
 ],
 [
  ".komponen[2].id",
  "cat"
 ],
 [
  ".komponen[2].label",
  "Catatan aksi"
 ],
 [
  ".komponen[3].id",
  "eng"
 ],
 [
  ".komponen[3].label",
  "Engineer (role lab)"
 ],
 [
  ".predict.q",
  "Ratih menjalankan enam aksi atas akun Dina. Akun Eko tidak pernah dibuka siapa pun. Back office versi pertama tidak menulis catatan. Berapa baris yang ditemukan Pak Hadi untuk Dina dan untuk Eko?"
 ],
 [
  ".predict.options[0]",
  "Enam baris untuk Dina dan nol untuk Eko, sama seperti bila semua aksi tercatat"
 ],
 [
  ".predict.options[1]",
  "Tiga baris untuk Dina, yaitu tiga aksi yang mengubah data, dan nol untuk Eko"
 ],
 [
  ".predict.options[2]",
  "Nol baris untuk Dina dan nol baris untuk Eko, jadi dua jawaban itu sama"
 ],
 [
  ".predict.options[3]",
  "Dua baris untuk Dina, yaitu dua aksi membaca, dan nol untuk Eko"
 ],
 [
  ".predict.answer",
  2
 ],
 [
  ".predict.varian",
  false
 ],
 [
  ".predict.explain",
  "Mode bo-tanpa-audit tidak menulis catatan, jadi tabel audit_log kosong. Rekaman rantai.txt bagian A: enam aksi atas Dina menghasilkan nol baris, dan Eko yang tidak pernah disentuh juga nol baris."
 ],
 [
  ".langkah[0].dari",
  "ptg"
 ],
 [
  ".langkah[0].ke",
  "bo"
 ],
 [
  ".langkah[0].judul",
  "Enam aksi atas data Dina berjalan, catatan tidak bertambah"
 ],
 [
  ".langkah[0].kirim",
  "# Enam aksi sudah terjadi: Ratih melihat akun, melihat pengajuan, membuka kartu identitas, membekukan, membuka, mengubah batas.\nSELECT count(*) AS baris_audit FROM audit_log: 0"
 ],
 [
  ".langkah[0].jelas",
  "Versi pertama menjalankan semua aksi dan tidak menulis apa pun. Tabel audit_log tetap kosong."
 ],
 [
  ".langkah[0].nada",
  "warn"
 ],
 [
  ".langkah[1].dari",
  "cat"
 ],
 [
  ".langkah[1].judul",
  "Dina dan Eko dijawab sama: nol baris"
 ],
 [
  ".langkah[1].kirim",
  "Dina (akun 40001), disentuh enam aksi: 0 baris\nEko (akun 40002), tidak pernah disentuh: 0 baris\n# 'Tidak ada catatan' sama nilainya dengan 'tidak tahu'."
 ],
 [
  ".langkah[1].jelas",
  "Nol baris untuk Dina tidak berarti tidak ada yang membuka datanya. Eko memang tidak pernah dibuka, dan jawabannya juga nol baris. Tabel kosong tidak membedakan keduanya."
 ],
 [
  ".langkah[1].nada",
  "warn"
 ],
 [
  ".langkah[2].dari",
  "bo"
 ],
 [
  ".langkah[2].ke",
  "cat"
 ],
 [
  ".langkah[2].judul",
  "Log biasa: enam aksi yang sama tercatat"
 ],
 [
  ".langkah[2].kirim",
  "audit_biasa: 6 baris (lihat_akun, lihat_verifikasi, buka_berkas, bekukan, buka_blokir, ubah_batas)\npelaku 420 di keenam baris; penyetuju 421 di buka_blokir dan ubah_batas"
 ],
 [
  ".langkah[2].jelas",
  "Mode bo-log-biasa menulis aksi yang sama ke tabel biasa tanpa hash. Pertanyaan Pak Hadi kini punya jawaban, selama isi tabel itu tidak berubah."
 ],
 [
  ".langkah[2].nada",
  "good"
 ],
 [
  ".langkah[3].dari",
  "bo"
 ],
 [
  ".langkah[3].ke",
  "cat"
 ],
 [
  ".langkah[3].judul",
  "Role aplikasi mengubah satu baris dan menghapus satu baris"
 ],
 [
  ".langkah[3].kirim",
  "[api_t4] UPDATE audit_biasa SET pelaku_id = 421 WHERE aksi = 'buka_berkas': UPDATE 1\n[api_t4] DELETE FROM audit_biasa WHERE aksi = 'bekukan': DELETE 1\nbaris 5, nomor terbesar 6, nomor bolong 1"
 ],
 [
  ".langkah[3].jelas",
  "Kartu identitas Dina kini tercatat dibuka oleh akun 421, dan pembekuan tidak pernah terjadi. Nomor yang bolong menunjukkan satu penghapusan. Di isi tabel, ubahan pelaku tidak meninggalkan petunjuk."
 ],
 [
  ".langkah[3].nada",
  "warn"
 ],
 [
  ".langkah[4].dari",
  "eng"
 ],
 [
  ".langkah[4].judul",
  "Engineer membaca tabel verifikasi lewat role lab: catatan tidak bertambah"
 ],
 [
  ".langkah[4].kirim",
  "[lab] SELECT count(*) AS pengajuan_dibaca FROM verifikasi: 1\n# Baris audit sebelum dan sesudah membaca: sama."
 ],
 [
  ".langkah[4].jelas",
  "Role lab adalah pemilik schema dan superuser di lab ini. Pembacaan langsung ke database tidak menambah satu baris pun di tabel catatan."
 ],
 [
  ".langkah[4].nada",
  "warn"
 ],
 [
  ".varian.label",
  "catatan berantai hash menggantikan log biasa"
 ],
 [
  ".varian.mulai",
  0
 ],
 [
  ".varian.langkah[0].dari",
  "bo"
 ],
 [
  ".varian.langkah[0].ke",
  "cat"
 ],
 [
  ".varian.langkah[0].judul",
  "Pemilik tabel mengubah baris 3: terdeteksi di baris 3"
 ],
 [
  ".varian.langkah[0].kirim",
  "[t4a_pemilik] UPDATE audit_log SET pelaku_id = 421 WHERE id = 3: UPDATE 1\nverifikasi rantai: 6 baris, utuh: tidak, rusak di baris 3"
 ],
 [
  ".varian.langkah[0].jelas",
  "Tiap baris menyimpan hash, yaitu sidik tetap dari isi baris dan hash baris sebelumnya. Ubahan satu baris membuat verifikasi menunjuk baris itu. Pelakunya di sini pemilik tabel, bukan role aplikasi."
 ],
 [
  ".varian.langkah[0].nada",
  "good"
 ],
 [
  ".varian.langkah[1].dari",
  "bo"
 ],
 [
  ".varian.langkah[1].ke",
  "cat"
 ],
 [
  ".varian.langkah[1].judul",
  "Pemilik tabel menambah baris ke-7 dengan hash hitungannya sendiri: lolos"
 ],
 [
  ".varian.langkah[1].kirim",
  "[t4a_pemilik] INSERT INTO audit_log (...) VALUES (... 'buka_berkas', 'verifikasi:1/swafoto', ..., <hash_sebelumnya>, <hash hitungan skrip>): INSERT 0 1\nverifikasi rantai: 7 baris, utuh: ya"
 ],
 [
  ".varian.langkah[1].jelas",
  "Rantai tanpa kunci rahasia bukan tanda tangan. Siapa pun yang bisa menulis dan tahu rumusnya bisa menambah baris palsu yang lolos. Hash baris palsu itu dihitung skrip lab."
 ],
 [
  ".varian.langkah[1].nada",
  "warn"
 ],
 [
  ".varian.langkah[2].dari",
  "bo"
 ],
 [
  ".varian.langkah[2].ke",
  "cat"
 ],
 [
  ".varian.langkah[2].judul",
  "Pemilik tabel menghapus baris 2: terdeteksi di baris 3"
 ],
 [
  ".varian.langkah[2].kirim",
  "[t4a_pemilik] DELETE FROM audit_log WHERE id = 2: DELETE 1\nverifikasi rantai: 6 baris, utuh: tidak, rusak di baris 3"
 ],
 [
  ".varian.langkah[2].jelas",
  "Penghapusan di tengah terdeteksi di baris sesudah yang hilang, karena baris itu tidak lagi menyambung ke hash baris sebelumnya."
 ],
 [
  ".varian.langkah[2].nada",
  "good"
 ]
];
export const PROFIL_BARIS: string[] = [
 "",
 "",
 "",
 "",
 "",
 "",
 "3:1 7:1",
 "",
 "tidak:1 Budi:2 1:2",
 "satu:1 Raka:1 Pak Hadi:1 Budi:1 0:1 3:1 30:1",
 "",
 "sama:1 Raka:1 Ratih:1 Pak Hadi:1 Budi:1 Dina:1 bukan:1 Rekaman lab:1 Tidak dijalankan:1 Ilustrasi:2 Asumsi:1 0:1 3:1 30:1 lab:1",
 "",
 "Raka:1",
 "Raka:1 Budi:1",
 "",
 "hanya:1 Ratih:1",
 "belum:1 hanya:1 catatan:2",
 "",
 "tidak:1 Raka:1 Budi:1",
 "tetap:1 satu:1 enam:1 pertama:1 Rekaman lab:1 catatan:1 lab:2",
 "",
 "",
 "",
 "tidak:1 hanya:1 satu:1 empat:1 Pak Hadi:1 catatan:1 lab:1",
 "satu:1 bukan:1",
 "tidak:1 Ratih:1 Ilustrasi:1 0:1 1:1 420:1 421:1 lab:1",
 "sama:1 pertama:2 kedua:1 tanpa:1 Tidak dijalankan:1 bo-tanpa-audit:1 bo-log-biasa:1 catatan:1",
 "tanpa:1 1:2 6:4 catatan:1 lab:1",
 "tidak:1 enam:1 Ratih:1 Dina:1 Eko:1 nol:2 0:6 1:1 40001:1 40002:1",
 "sama:1 enam:1 Dina:1 Eko:1 Rekaman lab:1 nol:1 1:2 7:2 catatan:1 lab:1",
 "tidak:4 sama:2 Dina:1",
 "tidak:2 Tidak dijalankan:1 0:2 7:3 CWE:1 catatan:1",
 "Budi:1 Dina:1 bukan:1 1:4 7:2 lab:2",
 "tidak:1 hanya:1 sama:1 enam:1 bo-log-biasa:1 lab:1",
 "pertama:2 bukan:2 role:1 lab:2",
 "0:3 1:3 role:1 lab:1",
 "tidak:1 satu:2 lima:1 Dina:1 Hitungan:1 1:3 5:1 6:1 421:1",
 "satu:2 Rekaman lab:1 1:3 6:2 lab:1",
 "tidak:3 Tidak dijalankan:1 0:2 OWASP:2 catatan:2",
 "tidak:1 kecuali:1 semua:1 Tidak dijalankan:1 0:2 1:2 7:2 role:3 superuser:1 lab:3",
 "sebelum:1",
 "tidak:1 Rekaman lab:1 3:2 role:3 catatan:1 lab:2",
 "tidak:1 sama:1 Tidak dijalankan:1 lab:1",
 "satu:1 1:4 3:2 6:2 7:2 catatan:1 lab:1",
 "tidak:2",
 "",
 "tidak:1",
 "hanya:1 Pak Hadi:1 Budi:1 Ilustrasi:1 0:1 3:1 30:1",
 "tidak:4 hanya:1 satu:1 Raka:1 Pak Hadi:1 Budi:1 Tidak dijalankan:1 catatan:1 lab:1",
 "hanya:1 dua:1 tanpa:1 semua:1 catatan:1",
 "tidak:2 Tidak dijalankan:1 0:2 1:2 7:2 lab:1",
 "",
 "",
 "satu:1 Pak Hadi:1 role:1",
 "",
 "tetap:1 satu:4 tanpa:1 hash:4 catatan:1",
 "Rekaman lab:1 lolos:1 hash:1 lab:1",
 "satu:1 bukan:1 semua:1 catatan:1",
 "",
 "tidak:2 satu:1 Dina:1 Eko:1 tanpa:1 nol:1 role:1 catatan:2 lab:1",
 "",
 "",
 "",
 "tanpa:1",
 "Dina:1 Eko:1 Rekaman lab:1 nol:1 1:2 7:2 lab:1",
 "",
 "",
 "",
 "3:1 ADR 43:1 catatan:1",
 "tidak:2 tiga:1 Pak Hadi:1 tanpa:1 catatan:2",
 "",
 "tidak:1 enam:1 Ratih:1 Dina:1 Eko:1 nol:1 1:1 catatan:1",
 "",
 "",
 "tidak:5 sama:1 enam:1 bo-tanpa-audit:1 catatan:1",
 "",
 "satu:2 enam:1 role:1",
 "",
 "",
 "tidak:1 lima:1 0:1 1:2 3:1 420:1 421:1",
 "",
 "tidak:1 3:1 role:1 lab:1",
 "",
 "",
 "tidak:1 sama:1 sebelum:1 sesudah:1 Tidak dijalankan:1 role:1",
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
  "import siapaMembuka from \"../../../../data/diagram/t4-m38-siapa-membuka.json\";",
  "<p class=\"meta\">Baca 7 menit · coba 3 menit · Prasyarat: [[t4-modul]], [[t4-storage]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 11 Tahap 4. Budi menerima pesan dari nomor yang tidak ia kenal. Pengirimnya menulis nama lengkap Budi dan nomor identitasnya.",
  "Pak Hadi mendengar tentang pesan itu. Ia bertanya satu hal kepada Raka: siapa yang membuka data identitas Budi dalam 30 hari terakhir?",
  "Tidak ada yang bisa menjawab.",
  "*Angka cerita (Ilustrasi):* pesan ke Budi, waktu 30 hari, dugaan Raka, dan jawaban Ratih berasal dari cerita, bukan dari rekaman. Rekaman memuat pertanyaan Pak Hadi yang sama, tetapi tentang Dina. Arti Ilustrasi, Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka menduga data Budi bocor dari layanan verifikasi, yaitu pihak luar yang memeriksa kartu identitas pendaftar. Dugaan itu masuk akal, karena layanan itu menerima data identitas dari Rekeningo.",
  "Staf tim risk membuka data pendaftar lewat back office, yaitu aplikasi internal tempat staf melihat akun, membaca pengajuan verifikasi, membekukan akun, dan mengubah batas harian.",
  "Ratih, analis risiko di tim risk, menjawab: \"Kami hanya melihat data bila perlu.\" Jawaban itu terdengar masuk akal. Tim risk memang punya alasan untuk membuka data.",
  "Dua jawaban itu sama-sama belum diperiksa. Dugaan tentang pihak luar bisa diperiksa dengan meminta catatan dari mereka. Dugaan tentang pihak dalam hanya bisa diperiksa dari catatan Rekeningo sendiri.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: anggap layanan verifikasi tidak bocor. Apa yang bisa Raka baca di Rekeningo untuk tahu siapa dari dalam yang membuka data Budi?</summary>",
  "Tidak ada yang bisa menjawabnya. Di lab, back office versi pertama menjalankan enam aksi atas satu akun dan tabel catatan tetap kosong (dibaca di blok berikutnya, Rekaman lab).",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Pertanyaan Pak Hadi tidak bisa dijawab dari tabel catatan Rekeningo, apa pun yang terjadi di layanan verifikasi. Ada empat sebab. Tiga terekam di lab, dan satu hanya ada di cerita.",
  "**Satu akun bersama.** Di cerita, tim risk memakai satu akun bersama di back office. Catatan dari akun itu paling jauh menjawab \"akun risk\", bukan \"siapa\".",
  "Keadaan ini tidak direkam (Ilustrasi): lab memakai akun terpisah untuk tiap staf, yaitu Ratih (akun 420) dan Tim Risk Dua (akun 421).",
  "**Tanpa catatan.** Lab memerankan versi pertama dengan flag `-rentan`, yaitu server yang sama dengan perilaku versi pertama. Pada mode `bo-tanpa-audit`, fungsi `Audit` keluar tanpa menulis apa pun (Tidak dijalankan: dibaca dari kode). Cabang kedua, `bo-log-biasa`, dibahas di bawah:",
  "<Snippet file=\"labs/api-t4/internal/service/t4_audit.go\" lines=\"16:26\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/service/t4_audit.go baris 16 sampai 26 (mode tanpa catatan dan mode log biasa)\" />",
  "Ratih menjalankan enam aksi atas data Dina (akun 40001): melihat akun, melihat pengajuan, membuka kartu identitas, membekukan, membuka blokir, dan mengubah batas harian. Audit log adalah tabel yang menyimpan siapa melakukan aksi apa pada objek apa, dan kapan. Di mode ini tabel `audit_log` berisi nol baris. Eko (akun 40002) tidak pernah dilihat siapa pun, dan jawaban untuknya juga nol baris:",
  "<Snippet file=\"labs/t4-audit/output/rantai.txt\" lines=\"12:27\" title=\"Rekaman lab: labs/t4-audit/output/rantai.txt baris 12 sampai 27 (enam aksi, nol baris catatan, jawaban Dina dan Eko sama)\" />",
  "Dua jawaban yang sama itulah masalahnya. Nol baris untuk Dina tidak berarti tidak ada yang membuka datanya. Jawaban \"tidak ada\" di sini sama nilainya dengan \"tidak tahu\".",
  "Daftar jenis kelemahan perangkat lunak CWE (Common Weakness Enumeration) menamai keadaan ini Insufficient Logging. Kejadian penting keamanan tidak dicatat, jadi tidak ada catatan untuk analisis forensik ([CWE-778](https://cwe.mitre.org/data/definitions/778.html), dibuka 2026-10-30, Tidak dijalankan).",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan database lab yang dibuat bersih untuk tiap bagian. Pemilik data di rekaman adalah Dina, akun lab fiktif, bukan Budi.",
  "**Log biasa tercatat, tetapi bisa diubah.** Misalkan versi berikutnya mencatat aksi di tabel biasa. Itu mode `bo-log-biasa`: enam aksi yang sama masuk ke tabel `audit_biasa`, yang hanya ada di lab untuk mode ini. Tabel itu tidak punya pemeriksaan apakah sebuah baris pernah diubah.",
  "Role adalah identitas di database yang memegang hak atas tabel. Yang menulis ulang di rekaman adalah role aplikasi `api_t4`, karena versi pertama memberinya hak mengubah dan menghapus tabel itu. Hak itu setelan lab untuk versi pertama, bukan temuan. Dua perintah di bawah dikirim skrip lab, bukan terjadi karena kesalahan sistem:",
  "<Snippet file=\"labs/t4-audit/peran.sql\" lines=\"10:10\" lang=\"sql\" title=\"Kode lab: labs/t4-audit/peran.sql baris 10 (hak role aplikasi atas tabel log biasa)\" />",
  "Sesudah satu UPDATE dan satu DELETE, tabel berisi lima baris. Kartu identitas Dina kini tercatat dibuka oleh akun 421, dan pembekuan hilang. Nomor yang bolong adalah Hitungan, yaitu angka dari angka lain di rekaman: nomor terbesar 6 − 5 baris = 1, dan rekaman mencetak 1 juga. Di isi tabel, UPDATE tidak meninggalkan petunjuk:",
  "<Snippet file=\"labs/t4-audit/output/rantai.txt\" lines=\"42:61\" title=\"Rekaman lab: labs/t4-audit/output/rantai.txt baris 42 sampai 61 (satu baris diubah, satu dihapus, nomor bolong 1)\" />",
  "Log biasa lebih baik daripada tidak ada catatan, tetapi isinya tidak bisa diperiksa. OWASP menyarankan catatan dilengkapi deteksi perubahan, supaya ketahuan bila sebuah baris diubah atau dihapus ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), dibuka 2026-10-30, Tidak dijalankan). Tabel `audit_biasa` tidak punya deteksi itu.",
  "**Pembacaan langsung tidak lewat aplikasi.** Engineer yang membuka database langsung memakai role `lab`. Superuser adalah role yang melewati semua pemeriksaan hak kecuali hak untuk login ([PostgreSQL 17, Role Attributes](https://www.postgresql.org/docs/17/role-attributes.html), dibuka 2026-10-30, Tidak dijalankan). Di lab itu `lab` adalah pemilik schema dan sekaligus superuser (`role.txt` bagian A dan C).",
  "Rekaman membaca tabel `verifikasi`, yaitu tabel pengajuan verifikasi identitas, dan menghitung baris `audit_log` sebelum dan sesudahnya:",
  "<Snippet file=\"labs/t4-audit/output/role.txt\" lines=\"83:89\" title=\"Rekaman lab: labs/t4-audit/output/role.txt baris 83 sampai 89 (baca tabel verifikasi sebagai role lab, catatan tidak bertambah)\" />",
  "Catatan ditulis oleh kode aplikasi, di dalam fungsi aksi back office. Migrasi database lab tidak memuat trigger yang menulis `audit_log`. Fungsi `LihatVerifikasiBO` membaca pengajuan, lalu memanggil `Audit` dalam transaction yang sama (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t4/internal/service/bo.go\" lines=\"147:163\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/service/bo.go baris 147 sampai 163 (pembacaan dan catatan dalam satu transaction)\" />",
  "Query yang dikirim langsung ke database tidak melewati fungsi itu, jadi tidak ada panggilan `Audit`.",
  "<Rantai data={siapaMembuka} />",
  "**Yang tidak direkam.**",
  "- Pesan ke Budi, waktu 30 hari, dan pertanyaan Pak Hadi hanya ada di cerita (Ilustrasi).",
  "- Sumber pesan ke Budi tidak pernah dibuktikan. Lab tidak punya layanan verifikasi sungguhan (Tidak dijalankan), jadi dugaan Raka tidak bisa dibenarkan atau dibantah. Yang terbukti hanya satu hal: dari tabel catatan di database lab, pertanyaan Pak Hadi tidak bisa dijawab.",
  "- Satu akun bersama dan log yang mencatat sebagian aksi hanya ada di cerita. Lab memakai dua mode: tanpa catatan, dan log biasa yang mencatat semua aksi, termasuk membuka file.",
  "- Log server PostgreSQL tidak dibaca rekaman ini. Bawaan `log_statement` adalah `none` ([PostgreSQL 17, Error Reporting and Logging](https://www.postgresql.org/docs/17/runtime-config-logging.html), dibuka 2026-10-30, Tidak dijalankan), tetapi database lab dijalankan dengan `log_statement=all` (`labs/b3-race`). Apakah pembacaan engineer muncul di log server itu tidak diperiksa.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `rantai.txt` bagian A dan B dan `role.txt` bagian C, dengan satu varian dari `rantai.txt` bagian C. Tebak dulu apa yang ditemukan Pak Hadi, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m38.json\" />",
  "Hash adalah sidik tetap yang dihitung dari isi satu baris. Sesudah langkah terakhir, centang **Ubah satu hal: catatan berantai hash menggantikan log biasa**. Di varian ini tiap baris menyimpan hash yang dihitung dari isinya dan dari hash baris sebelumnya. Pemilik tabel yang mengubah satu baris tanpa menghitung ulang hash terdeteksi, begitu pula yang menghapus satu baris di tengah.",
  "Baris palsu di ujung dengan hash yang benar lolos (Rekaman lab, `rantai.txt` bagian C).",
  "Batasnya: rekaman ini memakai satu skenario, bukan semua cara menulis ulang catatan. Cara memeriksa rantai dan batasnya dibahas di [[t4-audit]].",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: tanpa catatan, jawaban untuk Dina dan untuk Eko sama-sama nol baris, dan membaca tabel verifikasi lewat role lab tidak menambah baris catatan.",
  "Rekaman bagian A ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman bagian A (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t4-audit/output/rantai.txt\" lines=\"12:27\" title=\"Rekaman lab: labs/t4-audit/output/rantai.txt baris 12 sampai 27 (bagian A: nol baris untuk Dina dan Eko)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-audit]]: back office dengan peran, catatan yang bisa diperiksa, dan agen baca-saja. Keputusannya ADR 43.",
  "Pertanyaan Pak Hadi gagal dijawab karena tiga hal: catatan tidak ada, catatan bisa diubah tanpa petunjuk di isi tabel, dan pembacaan langsung tidak tercatat.",
  "### Cek diri",
  "**1.** Ratih menjalankan enam aksi atas data Dina, dan Eko tidak pernah dibuka. Kenapa tabel catatan menjawab nol baris untuk keduanya?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Mode `bo-tanpa-audit` tidak menulis catatan. Nol baris tidak membedakan akun yang dibuka enam kali dari akun yang tidak pernah dibuka. Karena itu \"tidak ada\" sama nilainya dengan \"tidak tahu\" (`rantai.txt` bagian A).",
  "</details>",
  "**2.** Log biasa mencatat enam aksi. Apa yang terjadi bila role aplikasi mengubah satu baris dan menghapus satu baris, dan petunjuk apa yang tersisa?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tabel menjadi lima baris. Pelaku di baris 3 berganti dari 420 ke 421, dan baris pembekuan hilang. Satu-satunya petunjuk adalah nomor bolong 1, dan di isi tabel UPDATE tidak meninggalkan petunjuk (`rantai.txt` bagian B).",
  "</details>",
  "**3.** Engineer membaca tabel `verifikasi` lewat role `lab`. Kenapa jumlah baris `audit_log` tidak berubah?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Catatan ditulis oleh kode aplikasi di dalam fungsi aksi back office, dan query langsung ke database tidak melewati fungsi itu. Jumlah baris sebelum dan sesudah membaca sama (`role.txt` bagian C; dibaca dari kode, Tidak dijalankan).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />"
];
