// Nilai penjaga halaman 4.18, dibangkitkan dari m35-qr-bu-marni.mdx, diagram, skenario, dan baris riset oleh
// tmp/m35/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "805e7ce8bce69be9",
  riset: ["239e6e74beb06e05","1b3632655c2f0f18","346eb631969580bd","67909f4dd109abb9","fe70d8b353139f75"],
  diagram: "7b7da6e96feab02c",
  skenario: "5640442d90d236f5",
  istilah: "e9a5b56b95e54f49",
  glosarium: "38a27b798af80c2f",
};

// Nilai terpisah dari kalimat terkunci: lima baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-195 | Rekaman dan kode lab t4-qr untuk M35 (dibaca untuk halaman 4.18, tanpa menjalankan ulang) | Rekaman `labs/t4-qr/output/statis.txt` bagian A (saldo Budi 250000, kedua merchant 0), B (pemindai dan pembayaran Rp35.000 ke payload Toko Andalan: nama di payload dan jawaban server sama, 201, saldo 215000, merchant Toko Andalan; jurnal bayar -35000 dan 35000, jumlah posting 0; 0 posting di buku Bu Marni; kedua merchant aktif dan terverifikasi; tabel `qr` tujuh kolom tanpa lokasi), C (payload Bu Marni dengan id QR Toko Andalan dan CRC dihitung ulang: nama di payload Toko Sumber Rejeki, server menjawab Toko Andalan); `crc.txt` bagian A sampai D (nilai uji 29B1; payload statis dan tabel tag; 8562 dari 8562 dan 104 dari 104 pada payload contoh 138 karakter; id diganti dengan CRC B29D menjadi 4D5E lolos, tanpa CRC baru ditolak, sama dengan `binascii.crc_hqx`); kode `labs/t4-qr/run.py` (`pindai` dan `rekam_statis`: pemindai = `qrlab urai` lalu `GET /qr/{id}`, pemalsu = `qrlab ganti`, komentar skenario stiker berlabel Ilustrasi); README lab bagian 'Selisih dengan naskah' butir 3 sampai 5. PostgreSQL 17.11, go1.27.1, pgx v5.11.0 | 4.18 (semua blok, Cek diri, widget alur t4-m35): angka rekaman, label pemindai dan pemalsu sebagai skrip lab, dan 'dibaca dari kode' | Baru |",
  "| R4-196 | Parameter CRC-16/IBM-3740 dan spesifikasi EMVCo untuk tag 63 (dibuka ulang 2026-10-30) | Katalog CRC (reveng.sourceforge.io/crc-catalogue/16.htm, dibuka 2026-10-30, dibaca dari HTML mentah dengan curl; penutup halaman 'Last updated 11 December 2024'): CRC-16/IBM-3740, `width=16 poly=0x1021 init=0xffff refin=false refout=false xorout=0x0000 check=0x29b1 residue=0x0000`, alias CRC-16/AUTOSAR dan CRC-16/CCITT-FALSE, 'commonly misidentified as CRC-CCITT'. Halaman EMVCo (emvco.com/emv-technologies/qr-codes/ dan halaman spesifikasinya, dibuka 2026-10-30, dibaca dengan curl) mendaftarkan 'EMV QR Code Specification for Payment Systems (EMV QRCPS) Merchant-Presented Mode', Version v1.1, Published 27 Nov 2020, Public Access; unduhan lewat formulir yang memuat syarat situs (`download-form`), tidak diisi. Salinan PDF pihak ketiga (mvallim.github.io) menjawab 404. Parameter CRC dan nilai tag 01 menurut spesifikasi itu tetap sumber sekunder (R4-101, R4-331) [perlu verifikasi di PDF EMVCo] | 4.18 (Isi QR dan CRC): parameter CRC dari katalog (Tidak dijalankan) dan dua implementasi lab; versi dan tanggal spesifikasi dari halaman EMVCo | Tidak berubah dari R4-330 (dibuka 2026-10-27); tanggal 'Updated' di PR lab #410 (4 Agustus 2023) tidak sama dengan penutup halaman hari ini, jadi halaman memakai tanggal penutup |",
  "| R4-197 | CRC tidak melindungi dari perubahan yang disengaja (dibuka untuk halaman 4.18) | Wikipedia, 'Cyclic redundancy check' (en.wikipedia.org/wiki/Cyclic_redundancy_check, dibuka 2026-10-30, oldid 1381579923): CRC dirancang untuk melindungi dari kesalahan umum pada kanal komunikasi, 'they are not suitable for protecting against intentional alteration of data', dan tanpa autentikasi penyerang dapat mengubah pesan lalu menghitung ulang CRC. Tulisan ensiklopedia komunitas tanpa kutipan inline pada kalimat itu: sumber tingkat 4. Pembuktiannya ada di lab (`crc.txt` bagian D) | 4.18 (CRC tidak menangkap penggantian) dan halaman istilah CRC: sebagai sumber sekunder, berlabel Tidak dijalankan | Tidak diriset sebelumnya |",
  "| R4-198 | Hitungan 4.18 atas angka yang tertulis di halaman (Hitungan, Ilustrasi) | Rp35.000 + Rp48.000 + Rp22.000 = Rp105.000 (masukan Ilustrasi dari naskah M35, jadi hasilnya Ilustrasi); saldo Budi Rp250.000 - Rp35.000 = Rp215.000 (`statis.txt` bagian A dan B); 8.314 + 248 = 8.562 (`crc.txt` bagian C); 4 karakter heksadesimal x 4 bit = 16 bit, 2^16 = 65.536 | 4.18 (Gejala, Yang sebenarnya, Cek diri): label Hitungan dan Ilustrasi; Hitungan tidak diberi label Rekaman lab | Baru |",
  "| R4-199 | Selisih naskah M35 dengan lab untuk halaman 4.18 (penalaran dari rekaman, bukan sumber luar) | Naskah M35 menulis app Budi mencatat 'Berhasil: Toko Sumber Rejeki'; di lab Toko Sumber Rejeki adalah Bu Marni (`statis.txt` bagian A) dan jawaban pembayaran ke stiker sah milik merchant lain menyebut merchant pemilik stiker, Toko Andalan (bagian B), sedangkan nama Bu Marni hanya muncul bila payload dipalsukan (bagian C). Naskah menulis layar konfirmasi versi pertama 'dengan nama merchant berhuruf kecil' (ANTREAN menulis hanya 'Bayar?'): tidak ada layar di lab (README lab butir 3), dan naskah tidak menulis dari mana layar mengambil nama itu. 4.1 menulis kelemahan Bu Marni: memasang satu stiker sejak hari pertama dan tidak memeriksanya lagi | 4.18 (Gejala memakai Toko Andalan, bukan Toko Sumber Rejeki; layar konfirmasi berlabel Ilustrasi dan Asumsi); usulan ke badan PR | Baru |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m35-stiker-berganti"
 ],
 [
  ".judul",
  "Stiker sah milik merchant lain lolos semua pemeriksaan, dan isi stiker yang diubah lolos CRC"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-qr · statis.txt bagian B dan crc.txt bagian D"
 ],
 [
  ".baris[0].label",
  "Stiker sah milik merchant lain"
 ],
 [
  ".baris[0].sub",
  "statis.txt bagian B"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Budi memindai stiker"
 ],
 [
  ".baris[0].simpul[0].sub",
  "nama cocok dengan server"
 ],
 [
  ".baris[0].simpul[1].teks",
  "Server: QR sah"
 ],
 [
  ".baris[0].simpul[1].sub",
  "merchant aktif, saldo cukup"
 ],
 [
  ".baris[0].simpul[2].teks",
  "Rp35.000 ke Toko Andalan"
 ],
 [
  ".baris[0].simpul[2].sub",
  "jurnal seimbang, buku Bu Marni kosong"
 ],
 [
  ".baris[0].simpul[2].nada",
  "warn"
 ],
 [
  ".baris[1].label",
  "Isi stiker diubah"
 ],
 [
  ".baris[1].sub",
  "crc.txt bagian D"
 ],
 [
  ".baris[1].simpul[0].teks",
  "Id QR diganti"
 ],
 [
  ".baris[1].simpul[0].sub",
  "teks lain tetap"
 ],
 [
  ".baris[1].simpul[1].teks",
  "Angka pemeriksa dihitung ulang"
 ],
 [
  ".baris[1].simpul[1].sub",
  "rumus terbuka, tanpa key"
 ],
 [
  ".baris[1].simpul[2].teks",
  "Pemindai menerima"
 ],
 [
  ".baris[1].simpul[2].sub",
  "CRC cocok"
 ],
 [
  ".baris[1].simpul[2].nada",
  "warn"
 ],
 [
  ".catatan",
  "Penempelan stiker adalah Ilustrasi; lab hanya memerankan pemindai dan pemalsu. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Stiker QR statis di kasir Bu Marni: pembayaran sah, CRC tidak menahan"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-qr/output/statis.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-qr/output/crc.txt"
 ],
 [
  ".sumber.catatan",
  "Lab t4-qr, PostgreSQL 17.11, dari database bersih (make -C labs/t4-qr run). Jalur utama: statis.txt bagian A, B, dan C. Pemindai dan pemalsu adalah skrip lab (qrlab), bukan app dan bukan penyerang; stiker yang tertempel di kasir adalah Ilustrasi. Ubah satu hal: crc.txt bagian C dan D. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log."
 ],
 [
  ".pengantar",
  "Stiker QR milik Toko Andalan tertempel di kasir Bu Marni, dan Budi membayar Rp35.000. Tebak dulu apa yang dijawab server, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "stk"
 ],
 [
  ".komponen[0].label",
  "Stiker dan pemindai"
 ],
 [
  ".komponen[1].id",
  "srv"
 ],
 [
  ".komponen[1].label",
  "Server api-t4"
 ],
 [
  ".komponen[2].id",
  "dbm"
 ],
 [
  ".komponen[2].label",
  "Database: jurnal dan tabel qr"
 ],
 [
  ".predict.q",
  "Budi memindai stiker yang tertempel di kasir Bu Marni dan membayar Rp35.000. Stiker itu milik Toko Andalan, merchant sah yang terverifikasi. Apa yang dijawab server?"
 ],
 [
  ".predict.options[0]",
  "201: Rp35.000 masuk ke Toko Andalan, dan jurnalnya seimbang"
 ],
 [
  ".predict.options[1]",
  "Ditolak: server tahu stiker itu tidak berada di kasir Bu Marni"
 ],
 [
  ".predict.options[2]",
  "201, tetapi saldo Budi belum berkurang sampai merchant mengonfirmasi"
 ],
 [
  ".predict.options[3]",
  "Ditolak: nama di payload tidak sama dengan nama di tabel akun"
 ],
 [
  ".predict.answer",
  0
 ],
 [
  ".predict.varian",
  false
 ],
 [
  ".predict.explain",
  "Server hanya menerima sesi Budi, id QR, dan nominal. Stiker itu QR sah, jadi pembayaran diterima: saldo Budi turun dari Rp250.000 ke Rp215.000, dan Toko Andalan menerima Rp35.000. Rekaman statis.txt bagian B."
 ],
 [
  ".langkah[0].dari",
  "stk"
 ],
 [
  ".langkah[0].ke",
  "srv"
 ],
 [
  ".langkah[0].judul",
  "Dua merchant menerbitkan QR statis"
 ],
 [
  ".langkah[0].kirim",
  "=> SELECT a.nama, b.saldo_cache AS saldo FROM buku b JOIN akun a ON a.id = b.akun_id WHERE a.id IN (419, 30001, 30002) ORDER BY a.id\n Budi               | 250000\n Toko Sumber Rejeki | 0\n Toko Andalan       | 0"
 ],
 [
  ".langkah[0].jelas",
  "Bu Marni dan Toko Andalan menerbitkan QR statis masing-masing, dan payload tiap stiker dibangun dari jawaban server. Saldo Budi Rp250.000, saldo kedua merchant Rp0."
 ],
 [
  ".langkah[1].dari",
  "stk"
 ],
 [
  ".langkah[1].judul",
  "Budi memindai stiker yang tertempel di kasir Bu Marni"
 ],
 [
  ".langkah[1].kirim",
  "# Skenario (Ilustrasi): stiker Toko Andalan tertempel di kasir Bu Marni.\npemindai: CRC cocok; jenis statis; id <qr statis Toko Andalan>; nama di payload 'Toko Andalan'; kota di payload 'Surabaya'\nserver: GET /qr/{id} -> 200; nama 'Toko Andalan'; kota 'Surabaya'; terverifikasi ya\nnama dan kota di payload sama dengan jawaban server: ya"
 ],
 [
  ".langkah[1].jelas",
  "Stiker itu tidak dipalsukan: nama di payload sama dengan nama yang dijawab server. Letak stiker tidak ada di sistem, jadi penempelannya hanya Ilustrasi."
 ],
 [
  ".langkah[2].dari",
  "stk"
 ],
 [
  ".langkah[2].ke",
  "srv"
 ],
 [
  ".langkah[2].judul",
  "Budi membayar Rp35.000, server menjawab 201"
 ],
 [
  ".langkah[2].kirim",
  "$ curl -i -X POST '/qr/<qr statis Toko Andalan>/bayar' -H 'Authorization: Bearer <token sesi Budi>' -d '{\"nominal\": 35000}'\nHTTP/1.1 201 Created\n{\"id\":10201,\"saldo\":215000,\"nominal\":35000,\"merchant\":\"Toko Andalan\"}"
 ],
 [
  ".langkah[2].jelas",
  "Pembayaran diterima. Saldo Budi menjadi Rp215.000, dan jawabannya menyebut Toko Andalan sebagai merchant penerima."
 ],
 [
  ".langkah[2].nada",
  "warn"
 ],
 [
  ".langkah[3].dari",
  "srv"
 ],
 [
  ".langkah[3].ke",
  "dbm"
 ],
 [
  ".langkah[3].judul",
  "Jurnal seimbang, buku Bu Marni tidak tersentuh"
 ],
 [
  ".langkah[3].kirim",
  " bayar | Budi         | -35000\n bayar | Toko Andalan | 35000\n posting_di_buku_bu_marni\n 0"
 ],
 [
  ".langkah[3].jelas",
  "Dua posting berjumlah nol, dan Bu Marni tidak punya satu posting pun dari pembayaran itu. Pemeriksaan yang Raka rencanakan semuanya lolos."
 ],
 [
  ".langkah[3].nada",
  "warn"
 ],
 [
  ".langkah[4].dari",
  "dbm"
 ],
 [
  ".langkah[4].judul",
  "Server tidak menyimpan letak stiker"
 ],
 [
  ".langkah[4].kirim",
  " id\n akun_id\n jenis\n nominal\n berlaku_sampai\n status\n jurnal_id\n# Tidak ada data yang menunjukkan di mana stiker itu tertempel, jadi tidak ada aturan yang bisa menolaknya."
 ],
 [
  ".langkah[4].jelas",
  "Tabel qr punya tujuh kolom, dan tidak ada yang berisi lokasi atau pengenal stiker. Yang diterima server untuk membayar hanya sesi pembeli, id QR, dan nominal."
 ],
 [
  ".langkah[5].dari",
  "stk"
 ],
 [
  ".langkah[5].ke",
  "srv"
 ],
 [
  ".langkah[5].judul",
  "Payload Bu Marni dengan id Toko Andalan lolos CRC, nama berbeda dari server"
 ],
 [
  ".langkah[5].kirim",
  "pemindai: CRC cocok; jenis statis; id <qr statis Toko Andalan>; nama di payload 'Toko Sumber Rejeki'; kota di payload 'Jakarta'\nserver: GET /qr/{id} -> 200; nama 'Toko Andalan'; kota 'Surabaya'; terverifikasi ya\nnama dan kota di payload sama dengan jawaban server: tidak"
 ],
 [
  ".langkah[5].jelas",
  "Payload yang dipalsukan membawa nama Bu Marni, padahal id QR-nya milik Toko Andalan, dan CRC-nya dihitung ulang. Pemindai lab menerimanya. Nama yang dijawab server tetap Toko Andalan."
 ],
 [
  ".langkah[5].nada",
  "warn"
 ],
 [
  ".varian.label",
  "stiker salah terbaca satu karakter, bukan diganti"
 ],
 [
  ".varian.mulai",
  0
 ],
 [
  ".varian.langkah[0].dari",
  "stk"
 ],
 [
  ".varian.langkah[0].judul",
  "Satu karakter payload berubah: CRC tidak cocok"
 ],
 [
  ".varian.langkah[0].kirim",
  "karakter ke-115 (di nama merchant) diganti; galat crc: CRC tidak cocok\nkarakter ke-51 (di id QR) diganti; galat crc: CRC tidak cocok\nkarakter ke-96 (di nominal) diganti; galat crc: CRC tidak cocok"
 ],
 [
  ".varian.langkah[0].jelas",
  "Pemindai lab menolak payload yang satu karakternya berubah, di nama, di id QR, dan di nominal."
 ],
 [
  ".varian.langkah[1].dari",
  "stk"
 ],
 [
  ".varian.langkah[1].judul",
  "Setiap penggantian yang dicoba pada payload contoh terdeteksi"
 ],
 [
  ".varian.langkah[1].kirim",
  "salah baca satu karakter pada payload contoh statis milik tes (138 karakter): 8562 dari 8562 terdeteksi (8314 oleh CRC, 248 oleh tag 63 yang rusak)\ndua karakter bersebelahan bertukar tempat pada payload contoh yang sama: 104 dari 104 terdeteksi (hasil untuk payload ini, bukan jaminan umum)"
 ],
 [
  ".varian.langkah[1].jelas",
  "Hasil ini berlaku untuk satu payload contoh dan dua jenis kesalahan. Sifat CRC terhadap kesalahan lain tidak dibuktikan lab."
 ],
 [
  ".varian.langkah[2].dari",
  "stk"
 ],
 [
  ".varian.langkah[2].ke",
  "srv"
 ],
 [
  ".varian.langkah[2].judul",
  "Isi payload diganti dan CRC dihitung ulang: lolos"
 ],
 [
  ".varian.langkah[2].kirim",
  "selisih: id QR berubah; CRC berubah dari B29D menjadi 4D5E\nteks diganti tanpa menghitung CRC baru: galat crc: CRC tidak cocok\nteks diganti lalu CRC dihitung ulang dengan binascii.crc_hqx (tanpa alat lab): lolos, hasilnya sama persis dengan keluaran qrlab ganti"
 ],
 [
  ".varian.langkah[2].jelas",
  "Tanpa CRC baru, payload ditolak. Dengan CRC yang dihitung ulang tanpa key apa pun, payload yang berubah lolos. CRC menangkap salah baca, bukan penggantian."
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
 "nama:1",
 "Marni:1 Rabu:1 Rp35.000:1 Rp48.000:1 Rp22.000:1",
 "satu:1 Budi:1 Marni:1 bukan:1 stiker:1 Toko Andalan:1 Rp35.000:1",
 "Rp35.000:1 Rp48.000:1 Rp22.000:1 Rp105.000:1",
 "tiga:1 Rabu:1 bukan:1 Rekaman lab:1 Tidak dijalankan:1 Ilustrasi:3 Asumsi:1 Hitungan:1 stiker:2 merchant:1 Toko Andalan:1 lab:2 Rp105.000:1",
 "",
 "Raka:1 nama:1",
 "tidak:1 satu:1 tiga:1 Raka:1",
 "tidak:2 Budi:2 tanpa:1 merchant:1",
 "",
 "tidak:1 Budi:1 lolos:1 merchant:1 server:1",
 "tidak:1 hanya:1 Rekaman lab:1 stiker:2 statis:1 lab:1",
 "tidak:1 stiker:2",
 "",
 "",
 "nama:1",
 "tidak:1 Budi:1 sah:1 stiker:1 server:2",
 "",
 "tidak:2 Marni:1 sah:1 palsu:1 stiker:2 merchant:1 statis:2 server:1",
 "tidak:1 hanya:1 empat:1 Budi:1 pertama:1 bukan:1 semua:1 CRC:2 payload:1 stiker:1 Bayar:1",
 "tidak:2 satu:1 payload:1 server:1",
 "tidak:1 bukan:2 Ilustrasi:1 payload:1 stiker:2 lab:1",
 "satu:2 dua:1 Budi:1 Marni:2 sah:1 payload:2 Toko Andalan:2 statis:1 server:1 Rp35.000:1",
 "Rekaman lab:1 statis:2 lab:1",
 "sama:1 Budi:1 Hitungan:1 diterima:1 201:1 payload:1 Toko Andalan:1 statis:1 server:1 nama:2 Rp35.000:1 Rp215.000:1 Rp250.000:1",
 "Raka:1 Budi:1 lolos:1 Toko Andalan:1 Rp35.000:2",
 "Rekaman lab:1 statis:2 lab:1",
 "tidak:1 satu:1 Marni:1",
 "Marni:1 Rekaman lab:1 statis:2 lab:1",
 "tidak:1 hanya:1 tujuh:1 kedua:1 stiker:1 merchant:1",
 "Rekaman lab:1 merchant:1 statis:2 lab:1",
 "tidak:1 hanya:1 satu:1 semua:1 diterima:1 sah:1 statis:1 server:3 lab:1",
 "dua:1 CRC:1 tag:1",
 "CRC:1 statis:1 dinamis:1",
 "Rekaman lab:1 payload:1 statis:1 lab:1 16:1",
 "semua:1 menolak:1 CRC:3 payload:1 tag:1",
 "belum:1 Asumsi:1 CRC:2 tag:1 lab:1 EMVCo:2",
 "sama:1 dua:1 Rekaman lab:1 Tidak dijalankan:1 CRC:2 lab:2 16:1 0x1021:1 0xFFFF:1 0x29B1:1",
 "tidak:1 tiga:1 CRC:2 lab:1",
 "Rekaman lab:1 lab:1",
 "satu:1 Hitungan:1 CRC:1 payload:1 tag:1 8.562:3 8.314:2 248:2 138:1",
 "sama:1 bukan:2 kecuali:1 Hitungan:1 payload:1 8.562:1 138:1",
 "satu:1 dua:2 bukan:1 payload:2 104:2",
 "tidak:1 lolos:1 CRC:3 payload:1 lab:1 B29D:1 4D5E:1",
 "Rekaman lab:1 CRC:1 lab:1",
 "sama:1 tanpa:2 CRC:1 lab:1",
 "tidak:1 satu:2 empat:1 tanpa:1 Hitungan:1 CRC:2 payload:1 key:1 rahasia:1 65.536:2 16:2",
 "tidak:1 Tidak dijalankan:1 CRC:3 Wikipedia:2",
 "tidak:4 hanya:1 Budi:1 pertama:1 Ilustrasi:1 Asumsi:1 merchant:1 Bayar:1 nama:2",
 "hanya:1 satu:1 Marni:1 lolos:1 CRC:1 Toko Andalan:2 Toko Sumber Rejeki:1 nama:2",
 "Rekaman lab:1 payload:1 statis:2 server:1 lab:1 nama:2",
 "tidak:1 pertama:1 payload:2 merchant:1 server:1 nama:2 kota:1",
 "tidak:1",
 "tidak:1 Asumsi:1 lab:1",
 "hanya:1 Marni:1 Rabu:1 Ilustrasi:1 stiker:1 Rp35.000:1 Rp48.000:1 Rp22.000:1",
 "Tidak dijalankan:1 payload:1 lab:1",
 "tidak:1 sah:1 stiker:1 merchant:1 lab:1",
 "tidak:2",
 "",
 "nama:1",
 "satu:1 stiker:1 statis:1 server:1",
 "nama:1",
 "tidak:2 satu:2 bukan:1 lolos:1 menolak:1 CRC:2 payload:2 stiker:1",
 "",
 "tidak:1 satu:1 Marni:1 tanpa:1 diterima:1 201:1 Toko Andalan:1 Rp35.000:1",
 "satu:1 lolos:1 ditolak:1 CRC:1 payload:1 8.562:2",
 "",
 "",
 "nama:1",
 "palsu:1 merchant:1 statis:1 dinamis:1 nama:1 ADR 40:1",
 "merchant:1",
 "",
 "merchant:1",
 "tidak:1 CRC:1 merchant:1 server:1 nama:1",
 "",
 "tidak:1 CRC:2 stiker:1",
 "",
 "",
 "bukan:1 tanpa:1 lolos:1 CRC:2 key:1 rahasia:1 B29D:1 4D5E:1",
 "",
 "tidak:1 Budi:1 lolos:1 merchant:1 server:1",
 "",
 "",
 "tidak:1 hanya:1 stiker:1 merchant:1 statis:1",
 "",
 "semua:1 CRC:1 8.562:2",
 "",
 "",
 "tidak:1 satu:2 dua:2 CRC:1 payload:1 lab:1 138:1",
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
  "import stikerBerganti from \"../../../../data/diagram/t4-m35-stiker-berganti.json\";",
  "<p class=\"meta\">Baca 8 menit · coba 3 menit · Prasyarat: [[t4-topup-verifikasi]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 8 Tahap 4, hari Rabu. Bu Marni, pemilik toko kelontong di seberang kampus, mengeluh ke Rekeningo. Tiga pelanggannya bilang sudah membayar dengan QR: Rp35.000, Rp48.000, dan Rp22.000. Tidak ada yang masuk ke laporan tokonya.",
  "Budi, salah satu pelanggan itu, menunjukkan app-nya. Di sana tercatat \"Berhasil: Toko Andalan, Rp35.000\". Saat Bu Marni memeriksa kasirnya, stiker QR di sana bukan lagi stikernya.",
  "Ketiga pembayaran itu berjumlah Rp105.000 (Rp35.000 + Rp48.000 + Rp22.000).",
  "*Angka cerita (Ilustrasi):* hari Rabu, tiga nominal, dan stiker yang berganti berasal dari naskah, bukan dari rekaman. Nama Toko Andalan dipakai rekaman lab untuk merchant pemilik stiker itu. Rp105.000 adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman, dan masukannya Ilustrasi. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka membaca tiga laporan itu dan melihat satu pola: pembayaran tercatat berhasil di app, tetapi uangnya tidak sampai ke toko yang dituju. Ia menduga app salah mencatat tujuan pembayaran.",
  "Dugaan itu bisa diperiksa. Bila app salah mencatat, jurnal pembayaran Budi tidak seimbang, merchant penerimanya tidak aktif, atau saldo Budi berkurang tanpa ada yang menerima. Rekaman di blok berikutnya memeriksa ketiganya.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: pembayaran Budi lolos pemeriksaan jurnal, merchant, dan saldo. Data apa yang tidak dimiliki server?</summary>",
  "Letak stiker. Tabel `qr` tidak punya kolom lokasi atau pengenal stiker, dan permintaan bayar hanya membawa sesi pembeli, id QR, dan nominal (Rekaman lab, `statis.txt` bagian B).",
  "Karena itu pembayaran ke stiker yang tertempel di toko lain tidak berbeda dari pembayaran ke stiker yang benar.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Pembayaran Budi sah menurut server, karena yang berganti adalah stikernya, dan server tidak menyimpan di mana stiker itu tertempel.",
  "<Rantai data={stikerBerganti} ringkas />",
  "Pihak yang mencoba, orang yang tidak dikenal, menempelkan stiker QR statis miliknya di atas stiker Bu Marni. QR statis dipakai berulang untuk banyak pembayaran, dan pembeli mengisi nominalnya sendiri. Miliknya adalah merchant sah yang terverifikasi dengan identitasnya sendiri, jadi server tidak melihat yang palsu.",
  "Angka pemeriksa di stiker itu bernama CRC: empat karakter di ujung payload, yaitu teks di dalam QR, yang dihitung dari semua teks di depannya. CRC menangkap salah baca, bukan penggantian. Layar konfirmasi versi pertama hanya bertanya \"Bayar?\", jadi tidak ada langkah yang menghentikan Budi.",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan pgx v5.11.0, dari database bersih, dengan server `api-t4` satu proses. Lab tidak punya app dan tidak punya gambar QR, karena payload adalah teks.",
  "Pemindai adalah skrip yang membaca payload lalu meminta `GET /qr/{id}`, dan pemalsu adalah perintah `qrlab ganti`. Keduanya skrip lab, bukan app dan bukan penyerang. Letak stiker tidak ada di sistem, jadi penempelan stiker adalah Ilustrasi.",
  "**Server menilai pembayaran itu sah.** Lab menerbitkan dua QR statis, satu untuk Bu Marni dan satu untuk Toko Andalan, lalu membangun payload keduanya dari jawaban server. Budi memindai payload Toko Andalan, seolah stikernya tertempel di kasir Bu Marni, dan membayar Rp35.000:",
  "<Snippet file=\"labs/t4-qr/output/statis.txt\" lines=\"39:48\" title=\"Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (pindai dan bayar)\" />",
  "Pemindai membaca nama Toko Andalan di payload, dan server menjawab nama yang sama. Pembayaran diterima dengan 201, dan saldo Budi menjadi Rp215.000, yaitu Rp250.000 dikurangi Rp35.000 (Hitungan; saldo awal dari `statis.txt` bagian A).",
  "Tiga pemeriksaan Raka lolos. Pertama, jurnal seimbang: Rp35.000 keluar dari Budi dan Rp35.000 masuk ke Toko Andalan, jadi jumlahnya nol.",
  "<Snippet file=\"labs/t4-qr/output/statis.txt\" lines=\"56:61\" title=\"Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (jurnal pembayaran)\" />",
  "Kedua, buku Bu Marni tidak tersentuh. Tidak ada satu posting pun dari pembayaran itu di bukunya:",
  "<Snippet file=\"labs/t4-qr/output/statis.txt\" lines=\"67:71\" title=\"Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (posting di buku Bu Marni)\" />",
  "Ketiga, kedua merchant aktif dan terverifikasi. Tabel `qr` hanya menyimpan tujuh kolom, dan tidak ada yang berisi lokasi atau pengenal stiker:",
  "<Snippet file=\"labs/t4-qr/output/statis.txt\" lines=\"77:93\" title=\"Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (merchant dan kolom tabel qr)\" />",
  "Rekaman menutup bagian itu dengan satu kesimpulan: pembayaran sah menurut semua aturan yang dimiliki server. Yang diterima server untuk membayar hanya sesi pembeli, id QR, dan nominal, jadi tidak ada aturan di server lab yang bisa menolaknya (`statis.txt` bagian B).",
  "**Isi QR dan CRC.** Payload adalah teks yang dibaca pemindai dari gambar QR. Isinya potongan berurutan, dan tiap potongan diawali tag, yaitu dua angka yang menamai bagian itu, lalu panjangnya.",
  "Tag 01 bernilai 11 untuk QR statis dan 12 untuk QR dinamis, yang dibuat baru untuk tiap pembayaran. Tag 63 di ujung memuat CRC:",
  "<Snippet file=\"labs/t4-qr/output/crc.txt\" lines=\"16:29\" title=\"Rekaman lab: labs/t4-qr/output/crc.txt, bagian B (payload QR statis dan tag-nya)\" />",
  "CRC dihitung dari semua teks di depannya, termasuk `6304`, yaitu tag dan panjang CRC itu sendiri. Pemindai menghitung CRC lagi dari teks yang ia baca dan menolak payload bila hasilnya berbeda.",
  "Lab memakai format bergaya EMV: tag 00, 01, dan 63 serta cara menghitung CRC berasal dari sumber yang bisa dibuka, dan selebihnya pilihan lab (Asumsi). Halaman EMVCo mendaftarkan spesifikasi QR merchant-presented sebagai versi 1.1 (27 November 2020; dibuka 2026-10-30), tetapi PDF-nya belum terbaca. Parameter CRC menurut spesifikasi itu [perlu verifikasi di PDF EMVCo].",
  "Rumus CRC punya parameter, dan lab memakai CRC-16/IBM-3740: polinomial 0x1021 dan nilai awal 0xFFFF. [Katalog CRC](https://reveng.sourceforge.io/crc-catalogue/16.htm) memuatnya dengan nilai uji 0x29B1 untuk teks `123456789` (halaman terakhir diperbarui 11 Desember 2024, dibuka 2026-10-30, Tidak dijalankan). Lab menghasilkan nilai yang sama dengan dua implementasi, yaitu Go dan `binascii.crc_hqx` dari Python (Rekaman lab, `crc.txt` bagian A).",
  "**CRC menangkap salah baca.** Satu karakter yang berubah membuat CRC tidak cocok, di tiga posisi yang dicoba lab:",
  "<Snippet file=\"labs/t4-qr/output/crc.txt\" lines=\"53:57\" title=\"Rekaman lab: labs/t4-qr/output/crc.txt, bagian C (salah baca)\" />",
  "Lab lalu mengganti tiap karakter satu payload contoh milik tes Go, sepanjang 138 karakter, dengan karakter lain dari 63 pilihan: angka, huruf, dan spasi. Hasilnya 8.562 dari 8.562 terdeteksi: 8.314 oleh CRC dan 248 oleh tag 63 yang rusak, dan 8.314 + 248 = 8.562 (Hitungan).",
  "Jumlah 8.562 sama dengan 138 × 62 + 6. Tiap posisi diganti dengan 62 karakter lain, kecuali enam posisi berisi titik atau strip yang diganti dengan 63 karakter (Hitungan, dibaca dari kode tes `TestPayloadSalahBacaSatuKarakterTerdeteksiSemua`). Payload itu bukan payload di cuplikan di atas: kotanya Bandung, bukan Jakarta.",
  "Pertukaran dua karakter bersebelahan yang berbeda juga terdeteksi, 104 dari 104. Itu hasil untuk satu payload dan dua jenis kesalahan, bukan jaminan untuk payload lain atau kesalahan lain.",
  "**CRC tidak menangkap penggantian.** Pelaku yang mengganti isi payload lalu menghitung CRC baru lolos. Di lab, id QR diganti dan CRC berubah dari `B29D` menjadi `4D5E`, dan pemindai menerimanya:",
  "<Snippet file=\"labs/t4-qr/output/crc.txt\" lines=\"60:66\" title=\"Rekaman lab: labs/t4-qr/output/crc.txt, bagian D (penggantian dengan CRC dihitung ulang)\" />",
  "Bila teks diganti tanpa CRC baru, pemindai menolaknya. Hasil `qrlab ganti` sama persis dengan hasil `binascii.crc_hqx` yang dijalankan tanpa alat lab.",
  "CRC dihitung tanpa key rahasia: rumusnya terbuka, jadi siapa pun yang memegang payload bisa menghitungnya lagi. CRC punya empat karakter heksadesimal, yaitu 4 × 4 = 16 bit, dan 2^16 = 65.536 nilai yang mungkin (Hitungan). Pelaku tidak menebak salah satu dari 65.536 nilai itu, karena satu perhitungan memberinya nilai yang benar.",
  "Wikipedia menulis hal serupa tentang CRC pada umumnya. CRC tidak cocok untuk melindungi dari perubahan yang disengaja. Penyerang bisa mengubah pesan dan menghitung ulang CRC ([Wikipedia: Cyclic redundancy check](https://en.wikipedia.org/wiki/Cyclic_redundancy_check), dibuka 2026-10-30, sumber sekunder, Tidak dijalankan).",
  "**Layar konfirmasi versi pertama hanya bertanya \"Bayar?\".** Naskah menulis layar itu menampilkan nama merchant berhuruf kecil, dan Budi tidak membandingkannya dengan papan toko (Ilustrasi). Lab tidak punya app dan tidak punya layar itu, jadi apakah pembeli membaca nama itu tidak terukur (Asumsi).",
  "Yang terbukti hanya satu hal. Payload Bu Marni yang id QR-nya diganti ke id Toko Andalan, dengan CRC dihitung ulang, lolos pemindai dan membawa nama Toko Sumber Rejeki. Server menjawab nama Toko Andalan:",
  "<Snippet file=\"labs/t4-qr/output/statis.txt\" lines=\"102:105\" title=\"Rekaman lab: labs/t4-qr/output/statis.txt, bagian C (nama di payload lawan nama dari server)\" />",
  "Nama dan kota di payload ditulis oleh siapa pun yang memegang payload. Nama yang bisa dipercaya adalah nama yang dijawab server dari tabel akun merchant terverifikasi. Naskah Tahap 4 tidak menulis dari mana layar pertama mengambil nama itu.",
  "**Yang tidak direkam.**",
  "- App Flutter, layar konfirmasi, papan toko, dan perilaku pembeli tidak ada di lab (Asumsi).",
  "- Hari Rabu, nominal Rp48.000 dan Rp22.000, stiker fisik, dan laporan Bu Marni hanya ada di cerita (Ilustrasi). Lab memakai Rp35.000 sebagai nominal pembayaran.",
  "- Gambar QR dan kamera Tidak dijalankan: payload di lab adalah teks.",
  "- Siapa yang menempelkan stiker tidak pernah dibuktikan. Lab memerankan pihak itu dengan merchant sah milik lab.",
  "- Skema pembayaran nasional dan regulasi tidak dipakai, dan halaman ini tidak mengklaim kepatuhan atau izin apa pun.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `statis.txt` bagian A, B, dan C, dengan satu varian dari `crc.txt` bagian C dan D. Tebak dulu apa yang dijawab server atas pembayaran ke stiker itu, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m35.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: stiker salah terbaca satu karakter, bukan diganti**. CRC menolak payload yang salah baca, tetapi payload yang diganti dengan CRC dihitung ulang lolos. Lab tidak punya app Flutter dan tidak merekam layar.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: pembayaran Rp35.000 diterima dengan 201 ke Toko Andalan, jurnal seimbang, dan buku Bu Marni tanpa posting.",
  "Payload yang id QR-nya diganti dengan CRC dihitung ulang lolos pemindai, sedangkan salah baca satu karakter ditolak: 8.562 dari 8.562 pada payload contoh. Rekamannya ada di cuplikan pada blok sebelumnya.",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-qr]]: QR statis lawan dinamis, layar konfirmasi dengan nama merchant terverifikasi, dan pelaporan QR palsu. Keputusannya ADR 40.",
  "- [[t4-prd]]: PRD v4 menulis risiko \"QR yang bisa diganti orang\" untuk merchant luar.",
  "- [[t4-skema]]: tabel `qr` dan aturan yang dijaga database.",
  "- [[t4-fitur-teknis]]: QR merchant luar sebagai fitur dan pekerjaan teknisnya.",
  "Stiker bisa diganti dan CRC tidak menahannya. Yang bisa diperiksa pembeli adalah nama merchant yang dijawab server, dan itu dibahas di [[t4-qr]].",
  "### Cek diri",
  "**1.** CRC di stiker cocok, tetapi pembayaran masuk ke toko lain. Kenapa CRC tidak mencegahnya?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "CRC dihitung tanpa key rahasia, jadi ia menangkap salah baca, bukan penggantian. Payload yang id QR-nya diganti lolos setelah CRC dihitung ulang, dari `B29D` menjadi `4D5E` (`crc.txt` bagian D).",
  "</details>",
  "**2.** Pembayaran Budi lolos pemeriksaan jurnal, merchant, dan saldo. Kenapa server tidak bisa menolaknya?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Permintaan bayar hanya membawa sesi, id QR, dan nominal, dan tabel `qr` tidak punya lokasi atau pengenal stiker. Jurnal seimbang, merchant aktif dan terverifikasi, dan saldo cukup (`statis.txt` bagian B).",
  "</details>",
  "**3.** Lab merekam 8.562 dari 8.562 salah baca terdeteksi. Apakah itu berarti CRC menangkap semua salah baca?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tidak. Angka itu untuk satu payload contoh 138 karakter dan dua jenis kesalahan: satu karakter berubah dan dua karakter bersebelahan bertukar. Sifat CRC terhadap kesalahan lain tidak dibuktikan lab (`crc.txt` bagian C).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
