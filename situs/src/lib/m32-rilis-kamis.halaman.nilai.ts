// Nilai penjaga halaman 4.12, dibangkitkan dari m32-rilis-kamis.mdx, diagram, skenario, dan baris riset oleh
// tmp/m32/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "d2599ecc4db70c05",
  riset: ["95ef53b340dce350","80e08e30e324a4ad","c77d2801b54c4a69","edecd1de8950e2d3"],
  diagram: "d17f9a9bffa401ac",
  skenario: "505961dbfd4e74b0",
};

// Nilai terpisah dari kalimat terkunci: empat baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, hari, urutan gateway, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-165 | Kode galat PostgreSQL 42703, 42P01, dan 42501 (dibuka untuk halaman 4.12) | PostgreSQL 17.11 Documentation, Appendix A \"PostgreSQL Error Codes\", Table A.1, Class 42 \"Syntax Error or Access Rule Violation\" (postgresql.org/docs/17/errcodes-appendix.html, dibuka 2026-10-29): `42703` `undefined_column`, `42P01` `undefined_table`, `42501` `insufficient_privilege`; pengantar lampiran: \"All messages emitted by the PostgreSQL server are assigned five-character error codes that follow the SQL standard's conventions for SQLSTATE codes.\" (tanda kutip ganda di sekitar SQLSTATE pada sumber ditulis lurus) | 4.12 (Tebak dulu: arti 42703 satu kalimat; noscript menyebut 42P01 dan 42501 dari rekaman bagian B) | Tidak berubah |",
  "| R4-166 | ALTER TABLE ... RENAME COLUMN: yang dijanjikan dokumentasi (dibuka untuk halaman 4.12) | PostgreSQL 17.11 Documentation, ALTER TABLE (postgresql.org/docs/17/sql-altertable.html, judul halaman \"PostgreSQL 17.11 Documentation\", dibuka 2026-10-29), bagian Description: \"The RENAME forms change the name of a table (or an index, sequence, view, materialized view, or foreign table), the name of an individual column in a table, or the name of a constraint of the table. When renaming a constraint that has an underlying index, the index is renamed as well. There is no effect on the stored data.\"; contoh `ALTER TABLE distributors RENAME COLUMN address TO city;`; halaman itu tidak menyebut akibat rename pada query yang masih memakai nama lama, jadi akibat itu hanya ada di rekaman (`batas.txt` bagian A, 42703) | 4.12 (Yang sebenarnya: rename mengganti nama kolom dan tidak mengubah data tersimpan; akibatnya pada query ditulis dari rekaman, bukan dari dokumentasi) | Tidak berubah |",
  "| R4-167 | Integration Database: database bersama sebagai titik kopling (dibuka untuk halaman 4.12) | Martin Fowler, \"Integration Database\" (martinfowler.com/bliki/IntegrationDatabase.html, terbit 25 Mei 2004, diperbarui 2015-07-01, dibuka 2026-10-29): \"An integration database is a database which acts as the data store for multiple applications, and thus integrates data across these applications\"; \"On the whole integration databases lead to serious problems becaue the database becomes a point of coupling between the applications that access it.\"; \"This is usually a deep coupling that significantly increases the risk involved in changing those applications and making it harder to evolve them.\" Tulisan itu membahas beberapa aplikasi yang berbagi satu database, bukan modul dari tiga tim di satu aplikasi: halaman menulisnya sebagai analogi (tingkat 4, tulisan praktisi, atribusi bukan fakta) | 4.12 (Yang sebenarnya: kalimat \"point of coupling\" dengan atribusi dan satu kalimat batas analogi) | Tidak berubah |",
  "| R4-168 | Rekaman dan kode lab t4-modul untuk M32 (dibaca untuk halaman 4.12, tanpa menjalankan ulang) | `labs/t4-modul/output/batas.txt` bagian A (tiga langkah CI lolos tanpa koneksi database; sebelum rename `TeksTopupLangsung` menjawab \"Top-up Rp200000 masuk ke Budi\"; sesudah rename `column \"nama\" does not exist (42703)`) dan bagian B (`relation \"akun\" does not exist (42P01)`, `permission denied for schema t4m_akun (42501)`, kontrol role `t4m_akun` berhasil, rename oleh pemilik schema akun tidak mematahkan `pembayaran.TeksTopup`); kepala rekaman: PostgreSQL 17.11, go1.27.1, pgx v5.11.0. Kode: `labs/api-t4/internal/modul/pembayaran/notifikasi.go` baris 24 sampai 30 (`SELECT nama FROM akun WHERE id = $1`), `notifikasi_test.go` baris 33 sampai 46 (driver tiruan membalas satu baris \"Budi\" untuk perintah apa pun), `labs/api-t4/internal/modul/satu_test.go` (rename oleh role pemilik). `labs/api-t4/internal/service/pembayaran.go` tidak punya SQL sendiri yang memilih `nama`, tetapi `BuatTopupBank` memanggil `repo.Akun` (`repo.go` baris 34 sampai 40, `SELECT a.id, a.jenis, a.nama, ...`); `labs/api-t4/internal/repo` membaca `a.nama` di `Akun`, `AkunBO`, `Katalog`, `CekCache`, `TutupBuku`, dan satu query QR di `qr.go` (dibaca dari kode, tidak dijalankan sesudah rename) | 4.12 (semua angka, kode galat, dan pernyataan \"dibaca dari kode\") | Tidak berubah |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m32-rename-tes-hijau"
 ],
 [
  ".judul",
  "Tes hijau, kolom berganti nama, top-up gagal"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-modul · batas.txt bagian A (Ilustrasi mekanisme)"
 ],
 [
  ".baris[0].label",
  "Yang dilihat CI tim Pembayaran"
 ],
 [
  ".baris[0].sub",
  "tanpa koneksi database"
 ],
 [
  ".baris[0].simpul[0].teks",
  "go build"
 ],
 [
  ".baris[0].simpul[0].sub",
  "tanpa keluaran, exit 0"
 ],
 [
  ".baris[0].simpul[1].teks",
  "go vet"
 ],
 [
  ".baris[0].simpul[1].sub",
  "tanpa keluaran, exit 0"
 ],
 [
  ".baris[0].simpul[2].teks",
  "go test"
 ],
 [
  ".baris[0].simpul[2].sub",
  "PASS, data tiruan"
 ],
 [
  ".baris[1].label",
  "Yang terjadi di database"
 ],
 [
  ".baris[1].sub",
  "satu schema, satu role"
 ],
 [
  ".baris[1].simpul[0].teks",
  "Rename kolom"
 ],
 [
  ".baris[1].simpul[0].sub",
  "nama jadi nama_tampil"
 ],
 [
  ".baris[1].simpul[1].teks",
  "SELECT nama FROM akun"
 ],
 [
  ".baris[1].simpul[1].sub",
  "kode Pembayaran, tidak berubah"
 ],
 [
  ".baris[1].simpul[2].teks",
  "Galat 42703"
 ],
 [
  ".baris[1].simpul[2].sub",
  "column \"nama\" does not exist"
 ],
 [
  ".baris[1].simpul[2].nada",
  "warn"
 ],
 [
  ".catatan",
  "Kode yang dijalankan adalah TeksTopupLangsung, kode lab yang ditulis mengikuti cerita. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Rename kolom: tes hijau, top-up gagal"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-modul/output/batas.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-modul/output/batas.txt"
 ],
 [
  ".sumber.catatan",
  "Lab t4-modul, PostgreSQL 17.11, dari database bersih (make -C labs/t4-modul run BAGIAN=batas). Jalur utama: bagian A, versi tanpa batas, dengan satu schema dan satu role aplikasi. TeksTopupLangsung adalah kode lab yang ditulis mengikuti cerita, jadi jalur utama adalah Ilustrasi mekanisme: skema, role, dan pesan galat adalah PostgreSQL yang nyata, tetapi kodenya bukan kode produksi. Ubah satu hal: bagian B, enam schema dan satu role per modul. Pada varian rename dilakukan oleh pemilik schema akun, bukan oleh tim Merchant. Baris diawali tanda panah diringkas dari rekaman yang sama, bukan baris log. Layar HP digambar dari cerita (Ilustrasi): lab tidak punya app Flutter, dan jam 15.22 serta kesalahan di layar berasal dari cerita."
 ],
 [
  ".pengantar",
  "Tim Merchant mengganti nama satu kolom, dan kode top-up tim Pembayaran tidak berubah. Tebak dulu, lalu ikuti langkahnya sampai HP penerima. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "mer"
 ],
 [
  ".komponen[0].label",
  "Migration"
 ],
 [
  ".komponen[1].id",
  "ci"
 ],
 [
  ".komponen[1].label",
  "CI tim Pembayaran"
 ],
 [
  ".komponen[2].id",
  "byr"
 ],
 [
  ".komponen[2].label",
  "Modul pembayaran"
 ],
 [
  ".komponen[3].id",
  "db"
 ],
 [
  ".komponen[3].label",
  "PostgreSQL"
 ],
 [
  ".perangkat[0].id",
  "hp"
 ],
 [
  ".perangkat[0].label",
  "HP penerima top-up"
 ],
 [
  ".layarAwal.hp.judul",
  "Rekeningo"
 ],
 [
  ".layarAwal.hp.waktu",
  "15.20"
 ],
 [
  ".layarAwal.hp.sinyal",
  3
 ],
 [
  ".layarAwal.hp.isi[0].jenis",
  "tombol"
 ],
 [
  ".layarAwal.hp.isi[0].teks",
  "Terima top-up Rp200.000"
 ],
 [
  ".predict.q",
  "Tim Merchant mengganti nama kolom akun.nama. Kode top-up tim Pembayaran tidak berubah, dan tesnya hijau. Apa yang terjadi saat top-up membaca nama penerima?"
 ],
 [
  ".predict.options[0]",
  "Berhasil: PostgreSQL masih menerima nama lama sebagai alias"
 ],
 [
  ".predict.options[1]",
  "Gagal dengan 42703: kolom nama tidak ada, walau tes tim Pembayaran hijau"
 ],
 [
  ".predict.options[2]",
  "Berhasil, tetapi nama penerima kosong karena kolom lama sudah tidak berisi"
 ],
 [
  ".predict.options[3]",
  "Gagal dengan 42P01: tabel akun tidak ditemukan di database"
 ],
 [
  ".predict.answer",
  1
 ],
 [
  ".predict.varian",
  false
 ],
 [
  ".predict.explain",
  "Sesudah rename, SELECT nama FROM akun dijawab 42703: kolom nama tidak ada. Hasilnya bukan nama lama dan bukan nama kosong. Tes tetap hijau karena memakai driver tiruan tanpa koneksi database. Rekaman batas.txt bagian A."
 ],
 [
  ".langkah[0].dari",
  "ci"
 ],
 [
  ".langkah[0].judul",
  "Tiga langkah CI tim Pembayaran lolos"
 ],
 [
  ".langkah[0].kirim",
  "$ go build ./...\n(tanpa keluaran)\n# exit status 0\n$ go vet ./internal/modul/...\n(tanpa keluaran)\n# exit status 0\n$ go test -count=1 -run TestTeksTopupLangsungDenganDataTiruanLolos -v ./internal/modul/pembayaran\n--- PASS: TestTeksTopupLangsungDenganDataTiruanLolos\nPASS\nok    lab/apit4/internal/modul/pembayaran\n# exit status 0"
 ],
 [
  ".langkah[0].jelas",
  "go build, go vet, dan go test lolos. Tes pembayaran memakai driver tiruan dan tidak membuka koneksi database."
 ],
 [
  ".langkah[1].dari",
  "byr"
 ],
 [
  ".langkah[1].ke",
  "db"
 ],
 [
  ".langkah[1].judul",
  "Kode top-up membaca nama dengan SQL langsung"
 ],
 [
  ".langkah[1].kirim",
  "sebelum rename, role aplikasi (satu role untuk semua modul): pembayaran.TeksTopupLangsung -> \"Top-up Rp200000 masuk ke Budi\""
 ],
 [
  ".langkah[1].jelas",
  "Sebelum rename, SELECT nama FROM akun berhasil dan teks notifikasi terbentuk. Fungsinya TeksTopupLangsung, kode lab yang ditulis mengikuti cerita (Ilustrasi mekanisme)."
 ],
 [
  ".langkah[2].dari",
  "mer"
 ],
 [
  ".langkah[2].ke",
  "db"
 ],
 [
  ".langkah[2].judul",
  "Migration Merchant mengganti nama kolom"
 ],
 [
  ".langkah[2].kirim",
  "migration tim Merchant: ALTER TABLE akun RENAME COLUMN nama TO nama_tampil"
 ],
 [
  ".langkah[2].jelas",
  "Satu perintah, dan database menerimanya. Kolom nama sekarang bernama nama_tampil."
 ],
 [
  ".langkah[3].dari",
  "ci"
 ],
 [
  ".langkah[3].judul",
  "CI tim Pembayaran tidak melihat perubahan itu"
 ],
 [
  ".langkah[3].kirim",
  "→ tes pembayaran memakai driver tiruan, tanpa koneksi ke PostgreSQL"
 ],
 [
  ".langkah[3].jelas",
  "Driver tiruan membalas satu baris untuk perintah apa pun. Hasil tes tidak bergantung pada skema, jadi rename tidak mengubahnya (dibaca dari kode lab, tidak dijalankan sesudah rename)."
 ],
 [
  ".langkah[4].dari",
  "byr"
 ],
 [
  ".langkah[4].ke",
  "db"
 ],
 [
  ".langkah[4].judul",
  "Kode yang sama dijalankan terhadap database"
 ],
 [
  ".langkah[4].kirim",
  "sesudah rename, pembayaran.TeksTopupLangsung dengan role dan skema yang sama -> column \"nama\" does not exist (42703)"
 ],
 [
  ".langkah[4].jelas",
  "Role dan skema sama dengan langkah 2. PostgreSQL menjawab 42703: kolom nama tidak ada."
 ],
 [
  ".langkah[4].nada",
  "warn"
 ],
 [
  ".langkah[4].layar.hp.judul",
  "Rekeningo"
 ],
 [
  ".langkah[4].layar.hp.waktu",
  "15.22"
 ],
 [
  ".langkah[4].layar.hp.sinyal",
  3
 ],
 [
  ".langkah[4].layar.hp.isi[0].jenis",
  "tombol"
 ],
 [
  ".langkah[4].layar.hp.isi[0].teks",
  "Terima top-up Rp200.000"
 ],
 [
  ".langkah[4].layar.hp.isi[1].jenis",
  "toast"
 ],
 [
  ".langkah[4].layar.hp.isi[1].teks",
  "Terjadi kesalahan"
 ],
 [
  ".langkah[4].layar.hp.isi[1].nada",
  "warn"
 ],
 [
  ".varian.label",
  "modul pembayaran dan modul akun dipisah schema dan role"
 ],
 [
  ".varian.mulai",
  1
 ],
 [
  ".varian.langkah[0].dari",
  "byr"
 ],
 [
  ".varian.langkah[0].ke",
  "db"
 ],
 [
  ".varian.langkah[0].judul",
  "Kode yang sama, modul sudah dipisah"
 ],
 [
  ".varian.langkah[0].kirim",
  "pembayaran menjalankan SQL M32 apa adanya (SELECT nama FROM akun): relation \"akun\" does not exist (42P01)\npembayaran menulis awalan schema sendiri (SELECT nama FROM t4m_akun.akun): permission denied for schema t4m_akun (42501)"
 ],
 [
  ".varian.langkah[0].jelas",
  "Role pembayaran tidak punya hak di schema akun. Tanpa awalan schema tabel akun tidak ditemukan, dengan awalan hak ditolak. Kodenya gagal sebelum rename apa pun."
 ],
 [
  ".varian.langkah[0].nada",
  "warn"
 ],
 [
  ".varian.langkah[1].dari",
  "db"
 ],
 [
  ".varian.langkah[1].judul",
  "Kontrol: pemilik schema akun menjalankan SQL yang sama"
 ],
 [
  ".varian.langkah[1].kirim",
  "kontrol: role t4m_akun menjalankan SQL yang sama pada baris yang sama: berhasil"
 ],
 [
  ".varian.langkah[1].jelas",
  "Yang gagal adalah batasnya, bukan SQL-nya."
 ],
 [
  ".varian.langkah[2].dari",
  "mer"
 ],
 [
  ".varian.langkah[2].ke",
  "db"
 ],
 [
  ".varian.langkah[2].judul",
  "Rename oleh pemilik schema akun, kodenya ikut diubah"
 ],
 [
  ".varian.langkah[2].kirim",
  "sesudah ALTER TABLE akun RENAME COLUMN nama TO nama_tampil oleh pemilik schema akun dan kode modul akun ikut diubah:\n  modul akun membaca nama_tampil: berhasil; pembayaran.TeksTopup lewat kontrak akun: \"Top-up Rp200000 masuk ke Budi\""
 ],
 [
  ".varian.langkah[2].jelas",
  "Pembayaran mengambil nama lewat kontrak modul akun, bukan lewat tabelnya. Rename tidak mematahkannya."
 ],
 [
  ".varian.langkah[2].nada",
  "good"
 ],
 [
  ".varian.langkah[2].layar.hp.judul",
  "Rekeningo"
 ],
 [
  ".varian.langkah[2].layar.hp.waktu",
  "15.22"
 ],
 [
  ".varian.langkah[2].layar.hp.sinyal",
  3
 ],
 [
  ".varian.langkah[2].layar.hp.isi[0].jenis",
  "tombol"
 ],
 [
  ".varian.langkah[2].layar.hp.isi[0].teks",
  "Terima top-up Rp200.000"
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
 "nama:1",
 "tidak:1 Kamis:1 Merchant:1",
 "tidak:1 satu:1 Nadia:1 Pembayaran:1",
 "pertama:1 bukan:1 Rekaman lab:1 Tidak dijalankan:1 Ilustrasi:2 Hitungan:1",
 "",
 "Raka:1 nama:1",
 "Raka:1 Kamis:1 pertama:1 bukan:1 Merchant:1 Pembayaran:1",
 "tidak:1 sama:1 Nadia:1 Ilustrasi:1",
 "tidak:1 tetap:1 Raka:1 Rekaman lab:1 gagal:1 hijau:2 Pembayaran:1",
 "",
 "tidak:1 sama:1 sesudah:1 gagal:1 hijau:1",
 "satu:1 Rekaman lab:1 Merchant:1 42703:1 nama:3",
 "tidak:1 tetap:1 lima:1 Tidak dijalankan:1 hijau:1 42703:1",
 "",
 "",
 "nama:1",
 "tidak:1 sama:1 satu:2 Rekaman lab:1 Ilustrasi:1 Merchant:1 nama:2 nama_tampil:1",
 "tidak:1 Tidak dijalankan:1 nama:1",
 "sebelum:1 satu:3 nama:1",
 "satu:2 Pembayaran:1 nama:1",
 "",
 "tidak:2 sesudah:1 Tidak dijalankan:1 nama:2",
 "bukan:1 Ilustrasi:1 Ilustrasi mekanisme:1",
 "tetap:2 satu:2 Budi:1 tanpa:1 Tidak dijalankan:1 hijau:1",
 "satu:1",
 "tidak:3 tanpa:1 lolos:1",
 "tiga:1 Rekaman lab:1 lolos:1 Pembayaran:1",
 "hanya:1 sama:2 sebelum:1 sesudah:1 dua:1",
 "Rekaman lab:1 gagal:1 lolos:1",
 "",
 "tidak:1 sama:1 sebelum:3 tiga:2 kedua:1 Merchant:1",
 "tidak:1",
 "tidak:1 tanpa:1 Ilustrasi:1 Merchant:1",
 "tidak:2 satu:2 Tidak dijalankan:1 nama:2",
 "tidak:2 sebelum:1 bukan:1 Ilustrasi:1 Merchant:1",
 "sama:1 satu:2 tiga:1 bukan:1 Tidak dijalankan:1",
 "tidak:1",
 "tidak:2 sesudah:1",
 "tidak:1 sesudah:1 Rekaman lab:1",
 "tidak:1 sesudah:1 satu:1 Tidak dijalankan:1 nama:1",
 "hanya:1 Ilustrasi:1 Merchant:1",
 "",
 "nama:1",
 "sesudah:1 satu:1",
 "nama:1",
 "tetap:1 sama:1 sebelum:1 satu:1 bukan:1 Rekaman lab:1 gagal:1 nama:1",
 "tidak:2 sesudah:1",
 "tidak:1 hanya:1 satu:1 Ilustrasi:1",
 "",
 "tidak:1 sesudah:1 satu:1 tiga:1 lolos:1 42703:1 nama:1",
 "sama:1 42P01:1 42501:1",
 "",
 "",
 "tanpa:1",
 "sama:1 Rekaman lab:1 ditolak:1",
 "tidak:1 Rekaman lab:1",
 "",
 "",
 "nama:1",
 "",
 "sebelum:1",
 "sebelum:1",
 "tidak:1 sebelum:2",
 "",
 "tidak:1 sebelum:1 sesudah:1 gagal:1 hijau:1 Merchant:1 Pembayaran:1",
 "",
 "",
 "tidak:2 sama:1 satu:1 Budi:1 Tidak dijalankan:1 nama:1",
 "",
 "bukan:1 Ilustrasi:1 Ilustrasi mekanisme:1",
 "",
 "",
 "tidak:2 bukan:1 Tidak dijalankan:1 nama:1",
 "",
 "tidak:1 Merchant:1",
 "",
 "",
 "tidak:1 sebelum:1 satu:1 Tidak dijalankan:1 Ilustrasi:1",
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
  "import renameTesHijau from \"../../../../data/diagram/t4-m32-rename-tes-hijau.json\";",
  "<p class=\"meta\">Baca 6 menit · coba 3 menit · Prasyarat: [[t2-skema-tanpa-downtime]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 6 Tahap 4. Kamis pukul 15.20 tim Merchant merilis versi baru. Pukul 15.22 tombol \"Terima top-up\" memunculkan kesalahan, dan notifikasi \"Rp200.000 masuk\" tidak muncul di HP penerima.",
  "Rollback rilis itu selesai pukul 15.58. Nadia bertanya ke tim Pembayaran, yang memegang top-up. Jawabannya satu kalimat: \"Kami tidak mengubah apa pun.\"",
  "*Angka cerita (Ilustrasi):* hari, jam, dan nominal berasal dari cerita, bukan dari rekaman. Dari kesalahan pertama sampai rollback selesai berlalu 15.58 − 15.22 = 36 menit (Hitungan: angka yang dihitung dari angka lain di halaman). Arti Ilustrasi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Rilis Kamis datang dari tim Merchant, yang memegang merchant luar, QR, katalog, dan dasbor web ([[t4-prd]]). Top-up bukan bagian mereka. Karena itu dugaan pertama Raka jatuh ke tim yang memegang top-up: rilis tim Pembayaran yang rusak.",
  "Nadia membaca daftar commit timnya sendiri. Hasilnya sama dengan jawaban timnya: tidak ada perubahan di kode top-up (Ilustrasi).",
  "Raka lalu memeriksa tes tim Pembayaran. Tiga langkah CI-nya hijau: `go build`, `go vet`, dan `go test` (Rekaman lab, bagian A di blok berikutnya). Kode top-up tidak berubah, tesnya hijau, dan top-up tetap gagal.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: kode top-up tidak berubah dan tesnya hijau, tetapi top-up gagal sesudah rilis tim lain. Apa yang bisa berubah di bawah kode yang sama?</summary>",
  "Skema database. Tim Merchant mengganti nama satu kolom di tabel `akun`, dan kode top-up masih membaca nama lamanya. Database menjawab `column \"nama\" does not exist`, dengan kode SQLSTATE 42703 (Rekaman lab, bagian A).",
  "SQLSTATE adalah kode lima karakter yang dipakai PostgreSQL untuk jenis galat. Kode 42703 berarti kolom tidak ada ([dokumentasi PostgreSQL 17.11, lampiran kode galat](https://www.postgresql.org/docs/17/errcodes-appendix.html), dibuka 2026-10-29, Tidak dijalankan). Kenapa tesnya tetap hijau ada di blok berikutnya.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Kode top-up tidak rusak oleh timnya sendiri. Yang berubah ada di bawah kodenya: tim Merchant menjalankan satu migration, yaitu file yang mengubah skema database ([[B4.1]]). Isinya satu perintah, `ALTER TABLE akun RENAME COLUMN nama TO nama_tampil` (Rekaman lab, bagian A; migration di cerita memakai perintah yang sama, Ilustrasi).",
  "Perintah itu mengganti nama kolom dan tidak mengubah data yang tersimpan ([dokumentasi PostgreSQL 17.11, ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html), dibuka 2026-10-29, Tidak dijalankan).",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan pgx v5.11.0, dari database bersih. Semua modul memakai satu schema, yaitu ruang nama untuk tabel di dalam satu database (`tahap4_modul`). Mereka juga memakai satu role, yaitu identitas login database yang punya hak sendiri (`api_t4`). Dengan role itu SQL langsung ke tabel `akun` berhasil sebelum rename.",
  "**Kode yang membaca kolom milik modul lain.** Modul adalah sekelompok kode di satu codebase yang dipegang satu tim. Modul pembayaran, milik tim Pembayaran, membaca `akun.nama` dengan SQL langsung untuk teks notifikasi. Di lab fungsinya bernama `TeksTopupLangsung`:",
  "<Snippet file=\"labs/api-t4/internal/modul/pembayaran/notifikasi.go\" lines=\"24:30\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/modul/pembayaran/notifikasi.go baris 24 sampai 30 (SQL langsung ke tabel akun)\" />",
  "`labs/api-t4/internal/service/pembayaran.go` tidak punya SQL sendiri yang memilih kolom `nama`. Fungsi `BuatTopupBank` di file itu membaca akun lewat `repo.Akun`, yang memilih `nama` (Tidak dijalankan: dibaca dari kode). Rekaman tidak menjalankan jalur itu sesudah rename.",
  "`TeksTopupLangsung` ditulis lab mengikuti cerita. Karena itu bagian ini Ilustrasi mekanisme: kodenya ditulis mengikuti cerita, sedangkan skema, role, dan pesan galat adalah PostgreSQL yang nyata. Hasilnya bukan rekaman kode produksi.",
  "**Kenapa tesnya tetap hijau.** Tes pembayaran di cerita memakai data tiruan, yaitu pengganti database yang membalas data tetap tanpa membuka koneksi. Rekaman menjalankan satu tes bernama lewat `-run`, dan tes itu memakai data tiruan. Driver tiruan di tes itu membalas satu baris berisi \"Budi\" untuk perintah apa pun (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t4/internal/modul/pembayaran/notifikasi_test.go\" lines=\"33:46\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/modul/pembayaran/notifikasi_test.go baris 33 sampai 46 (driver tiruan membalas satu baris)\" />",
  "Perintah apa pun termasuk perintah yang menyebut kolom yang sudah tidak ada. Tes itu tidak menyentuh skema, jadi rename tidak mengubah hasilnya. Tiga langkah CI lolos tanpa koneksi database:",
  "<Snippet file=\"labs/t4-modul/output/batas.txt\" lines=\"7:17\" title=\"Rekaman lab: labs/t4-modul/output/batas.txt, bagian A (tiga langkah CI tim Pembayaran lolos)\" />",
  "**Kolom yang hilang hanya terlihat di database.** Rekaman menjalankan fungsi yang sama dua kali dengan role dan skema yang sama, sebelum dan sesudah migration:",
  "<Snippet file=\"labs/t4-modul/output/batas.txt\" lines=\"22:24\" title=\"Rekaman lab: labs/t4-modul/output/batas.txt, bagian A (rename lolos di CI, gagal di database)\" />",
  "<Rantai data={renameTesHijau} />",
  "**Siapa yang tahu sebelum rilis?** Pertanyaan kedua di PRD v4 berbunyi: kalau tiga tim mengubah tabel yang sama, siapa yang tahu sebelum rilis ([[t4-prd]])? Di M32 tidak ada orang atau pemeriksaan di luar tim Merchant yang melihat migration itu sebelum rilis. Sebabnya tiga:",
  "1. Tes tiap tim memakai data tiruan, jadi tidak membawa skema tim lain.",
  "2. Folder migration dipakai bersama tanpa pemilik, dan yang meninjau migration itu anggota tim Merchant sendiri (Ilustrasi: dari cerita, tidak ada di lab).",
  "3. ADR 17 sudah ada ([[t2-skema-tanpa-downtime]]). Aturan 1 memecah perubahan menjadi expand, migrate, dan contract, dengan contract tidak pernah satu file dengan expand, dan berlaku untuk tabel `akun`. Satu `RENAME COLUMN` menambah nama baru dan menghapus nama lama dalam satu perintah, jadi tidak memenuhi aturan itu (Tidak dijalankan: dibaca dari ADR 17).",
  "Di cerita tidak ada mesin yang memeriksa aturan 1 lintas tim sebelum rilis (Ilustrasi). Aturan itu juga tidak menjawab siapa pembaca terakhir kolom lama. Modul pembayaran membacanya di file yang bukan milik tim Merchant.",
  "Martin Fowler menulis tentang beberapa aplikasi yang berbagi satu database. Menurutnya database itu menjadi \"point of coupling\" di antara aplikasi tersebut ([Integration Database](https://martinfowler.com/bliki/IntegrationDatabase.html), 25 Mei 2004, dibuka 2026-10-29, Tidak dijalankan). Di M32 yang berbagi database adalah modul dari tiga tim di satu aplikasi, jadi ini analogi, bukan kasus yang sama.",
  "**Yang tidak direkam.**",
  "- Rekaman tidak menjalankan jalur top-up penuh sesudah rename. Apakah jurnal top-up sudah tertulis saat kesalahan muncul, rekaman tidak menjawabnya.",
  "- Sebagian tes lain di paket `internal/modul/pembayaran` memakai PostgreSQL dan dilewati bila `TEST_DATABASE_URL` kosong (Rekaman lab, `testing.txt` bagian B dan C). Rekaman tidak menjalankannya sesudah rename.",
  "- Query lain di `labs/api-t4/internal/repo` juga membaca `akun.nama`, misalnya `Akun`, `Katalog`, dan `TutupBuku` (Tidak dijalankan: dibaca dari kode). Rekaman tidak menjalankan satu pun dari query itu sesudah rename.",
  "- Rollback, jam rilis, folder migration, dan peninjau dari tim Merchant hanya ada di cerita (Ilustrasi).",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `batas.txt` bagian A, dengan satu varian dari bagian B. Tebak dulu apa yang terjadi pada kode top-up sesudah rename, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m32.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: modul pembayaran dan modul akun dipisah schema dan role**. Kode pembayaran yang sama gagal sejak sebelum rename. Pemilik schema akun lalu menjalankan rename dan mengubah kode modul akun. Modul pembayaran tetap bekerja karena mengambil nama lewat modul akun, bukan lewat tabelnya (Rekaman lab, bagian B).",
  "Kode lama di `labs/api-t4/internal/repo` tidak ikut dipindah, dan rekaman tidak menjalankannya sesudah rename. Cara pemisahan dan alasan memilihnya ada di [[t4-modul]].",
  "Di lab hanya modul pembayaran, yang berjalan sebagai service sendiri, memakai role modulnya sendiri. Modul lain di proses monolith berbagi satu role. Layar HP digambar dari cerita (Ilustrasi): lab tidak punya app Flutter.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: tiga langkah CI lolos, lalu sesudah rename `pembayaran.TeksTopupLangsung` dijawab `column \"nama\" does not exist` (42703).",
  "Bila modul dipisah schema dan role, kode yang sama dijawab `relation \"akun\" does not exist` (42P01) atau `permission denied for schema t4m_akun` (42501). Rekaman bagian B ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman bagian B (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t4-modul/output/batas.txt\" lines=\"77:79\" title=\"Rekaman lab: labs/t4-modul/output/batas.txt, bagian B (modul dipisah: kode yang sama ditolak)\" />",
  "<Snippet file=\"labs/t4-modul/output/batas.txt\" lines=\"81:82\" title=\"Rekaman lab: labs/t4-modul/output/batas.txt, bagian B (rename oleh pemilik schema akun tidak mematahkan pembayaran)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-modul]]: batas modul yang dijaga compiler dan database, CODEOWNERS, dan ADR wajib untuk perubahan lintas modul. Keputusannya ADR 37.",
  "- [[t2-skema-tanpa-downtime]]: expand, migrate, dan contract, aturan yang sudah ada sebelum M32.",
  "- [[t4-tim-infra]]: pipeline per modul dan pemeriksaan sebelum rilis. Keputusannya ADR 44.",
  "Di M32 ADR 17 sudah tertulis dan tidak menghentikan migration itu. Siapa yang tahu sebelum rilis harus dijawab oleh sesuatu yang berjalan sebelum rilis.",
  "### Cek diri",
  "**1.** Tes tim Pembayaran hijau sebelum dan sesudah migration Merchant, tetapi top-up gagal. Kenapa tesnya tidak menangkapnya?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tesnya memakai driver tiruan, yang tidak membuka koneksi. Driver itu membalas satu baris \"Budi\" untuk perintah apa pun, jadi skema tidak ikut diuji (Tidak dijalankan: dibaca dari `notifikasi_test.go`). Terhadap database, fungsi yang sama dijawab `column \"nama\" does not exist` (`batas.txt` bagian A).",
  "</details>",
  "**2.** Kenapa halaman ini menyebut `TeksTopupLangsung` Ilustrasi mekanisme, bukan rekaman kode top-up?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Kode top-up di `labs/api-t4` tidak memilih `nama` dengan SQL sendiri. Ia membaca kolom itu lewat `repo.Akun` (Tidak dijalankan: dibaca dari kode). Rekaman tidak menjalankan jalur itu. `TeksTopupLangsung` ditulis lab mengikuti cerita, sedangkan skema, role, dan pesan galat adalah PostgreSQL yang nyata. Rekaman membuktikan mekanismenya, bukan kode produksi.",
  "</details>",
  "**3.** Kenapa ADR 17 tidak menghentikan migration Merchant?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Aturan 1 memisahkan expand dan contract dan berlaku untuk tabel `akun`, tetapi satu `RENAME COLUMN` menjalankan keduanya sekaligus (Tidak dijalankan: dibaca dari ADR 17). Di cerita tidak ada pemeriksaan yang menjalankan aturan itu sebelum rilis (Ilustrasi).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
