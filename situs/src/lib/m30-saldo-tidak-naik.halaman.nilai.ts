// Nilai penjaga halaman 4.8, dibangkitkan dari m30-saldo-tidak-naik.mdx, diagram, skenario, dan baris riset oleh
// tmp/m30/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "f1015e9d246eddcc",
  riset: ["9c12202ae3f0d282","1d1645f35f34ad44"],
  diagram: "ba4c7cc2370a8387",
  skenario: "cd86146b9a80e8cc",
};

// Nilai terpisah dari kalimat terkunci: dua baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, hari, urutan gateway, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-145 | Rotasi secret penanda tangan: secret lama tetap aktif sampai 24 jam (gateway nyata pertama, dibuka untuk halaman 4.8) | Stripe docs, \"Receive Stripe events in your webhook endpoint\" (docs.stripe.com/webhooks, dibuka 2026-10-29), bagian Roll endpoint signing secrets periodically: \"You can choose to immediately expire the current secret or delay its expiration for up to 24 hours to allow yourself time to update the verification code on your server. During this time, multiple secrets are active for the endpoint. Stripe generates one signature per secret until expiration.\"; bagian Preventing replay attacks: \"we generate a new signature and timestamp for the new delivery attempt\"; bagian Automatic retries: \"for up to three days with an exponential back off in live mode\" | 4.8 (Yang sebenarnya, tabel Dua gateway nyata): secret lama bisa tetap aktif sampai 24 jam dengan satu tanda tangan per secret, dan kiriman yang gagal diulang sampai tiga hari di mode live; ditulis tanpa merek sebagai gateway pertama | Tidak berubah dari R4-08 dan R4-126 (dicek ulang 2026-10-29) |",
  "| R4-146 | Kegagalan lain lima kali, 401 dan rotasi tidak disebut, dan anjuran menanyakan status (gateway nyata kedua, dibuka untuk halaman 4.8) | Midtrans docs, \"HTTP(S) Notification / Webhooks\" (docs.midtrans.com/docs/https-notification-webhooks, dibuka 2026-10-29), seluruh halaman terbaca (100.000 karakter pertama dan sisa 6.898 karakter): tabel status memuat \"2XX\" (\"No retries\"), \"500\" (\"Retry only once\"), \"503\" (\"Retry four times\"), \"400/404\" (\"Retry two times\"), \"301/302/303\" (\"No retries\"), dan \"Other\" (\"Retry five times\"); \"Midtrans retry at most 5 times\"; \"Midtrans put a random time shift for each attempt based on above interval\" dengan contoh \"the first retry time might be 33s (up to 2m) after previous attempt\"; \"you should use the GET Status API\" bila notifikasi terlambat; isi halaman (tabel dan teks) tidak menyebut kode 401 atau 403 sendiri dan tidak menyebut rotasi atau penggantian server key; judul FAQ lain di menu samping halaman itu menyebut galat 401 untuk client key atau server key yang salah, bukan jawaban penerima notifikasi (HTML mentah dibaca dengan curl, 2026-10-29) | 4.8: kode 401 jatuh ke baris \"Other\" lima kali (pembacaan, bukan kutipan; Asumsi untuk tiruan); jeda dihitung sejak percobaan sebelumnya (tersirat dari contoh geseran); dokumentasi tidak menyebut rotasi; dokumentasi menyarankan menanyakan status bila notifikasi terlambat | Tidak berubah dari R4-08, R4-125, dan R4-136 (dicek ulang 2026-10-29) |",
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m30-rahasia-berganti"
 ],
 [
  ".judul",
  "Secret berganti, kiriman ditolak"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-webhook · retry.txt bagian B dan C"
 ],
 [
  ".baris[0].label",
  "Secret diganti, api-t4 belum"
 ],
 [
  ".baris[0].sub",
  "jadwal 2, 10, 30, 90, 210 menit"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Tanda tangan secret baru"
 ],
 [
  ".baris[0].simpul[0].sub",
  "api-t4 memegang yang lama"
 ],
 [
  ".baris[0].simpul[1].teks",
  "Enam kiriman, enam 401"
 ],
 [
  ".baris[0].simpul[1].sub",
  "menit 0 sampai 342"
 ],
 [
  ".baris[0].simpul[1].nada",
  "warn"
 ],
 [
  ".baris[0].simpul[2].teks",
  "Jadwal habis"
 ],
 [
  ".baris[0].simpul[2].sub",
  "nol event, nol jurnal"
 ],
 [
  ".baris[0].simpul[2].nada",
  "warn"
 ],
 [
  ".baris[1].label",
  "Disamakan di menit 2 sampai 12"
 ],
 [
  ".baris[1].sub",
  "api-t4 dinyalakan ulang"
 ],
 [
  ".baris[1].simpul[0].teks",
  "Kiriman 1 dan 2: 401"
 ],
 [
  ".baris[1].simpul[0].sub",
  "secret belum sama"
 ],
 [
  ".baris[1].simpul[1].teks",
  "Secret disamakan"
 ],
 [
  ".baris[1].simpul[1].sub",
  "baru dan lama diterima"
 ],
 [
  ".baris[1].simpul[2].teks",
  "Kiriman 3: 200 diproses"
 ],
 [
  ".baris[1].simpul[2].sub",
  "top-up dibayar, satu jurnal"
 ],
 [
  ".baris[1].simpul[2].nada",
  "good"
 ],
 [
  ".catatan",
  "Baris pertama memakai top-up Citra Rp500.000 dan baris kedua top-up Eko Rp200.000, dengan alur yang sama. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Secret berganti: enam kiriman untuk top-up Citra, enam 401"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-webhook/output/retry.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-webhook/output/retry.txt"
 ],
 [
  ".sumber.catatan",
  "Server Go api-t4 dan gateway tiruan lokal dengan PostgreSQL 17.11, dari database bersih (make -C labs/t4-webhook run BAGIAN=retry). Jalur utama: bagian B, top-up Citra Rp500.000, api-t4 memegang secret lama dan gateway menandatangani dengan secret baru. Ubah satu hal: bagian C, top-up Eko Rp200.000 dengan alur yang sama, dan secret di api-t4 disamakan di antara kiriman 2 dan 3; itu top-up lain, bukan top-up Citra. Waktu diperankan: gateway tiruan memainkan jadwal atas perintah skrip lab dan menandatangani tiap kiriman dengan waktu maya, jadi tidak ada yang menunggu 342 menit. Baris diawali tanda panah diringkas dari rekaman yang sama, bukan baris log. Layar HP digambar dari isi rekaman: lab tidak punya app Flutter, dan rekaman tidak mencetak saldo, jadi layar tidak menampilkan saldo. Jam 09.40 di layar HP mengikuti jam cerita (Ilustrasi) dan adalah pilihan penulis."
 ],
 [
  ".pengantar",
  "Gateway merotasi secret, dan api-t4 belum disamakan. Tebak dulu, lalu ikuti enam kiriman untuk top-up Citra sampai HP-nya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "gw"
 ],
 [
  ".komponen[0].label",
  "Gateway (tiruan)"
 ],
 [
  ".komponen[1].id",
  "api"
 ],
 [
  ".komponen[1].label",
  "api-t4"
 ],
 [
  ".komponen[2].id",
  "db"
 ],
 [
  ".komponen[2].label",
  "PostgreSQL"
 ],
 [
  ".perangkat[0].id",
  "hp"
 ],
 [
  ".perangkat[0].label",
  "HP pemilik top-up"
 ],
 [
  ".layarAwal.hp.judul",
  "Rekeningo"
 ],
 [
  ".layarAwal.hp.waktu",
  "09.40"
 ],
 [
  ".layarAwal.hp.sinyal",
  3
 ],
 [
  ".layarAwal.hp.isi[0].jenis",
  "teks"
 ],
 [
  ".layarAwal.hp.isi[0].teks",
  "Top-up Citra Rp500.000"
 ],
 [
  ".layarAwal.hp.isi[1].jenis",
  "baris"
 ],
 [
  ".layarAwal.hp.isi[1].kiri",
  "Status"
 ],
 [
  ".layarAwal.hp.isi[1].kanan",
  "menunggu"
 ],
 [
  ".predict.q",
  "Gateway menandatangani dengan secret baru, dan api-t4 masih memegang secret lama. Gateway mengirim kiriman ke-6 pada menit 342. Apa jawaban api-t4, dan apa yang terjadi sesudahnya?"
 ],
 [
  ".predict.options[0]",
  "401, lalu gateway terus mengulang sampai secret disamakan"
 ],
 [
  ".predict.options[1]",
  "200 diproses: api-t4 menerima kiriman terakhir"
 ],
 [
  ".predict.options[2]",
  "401, lalu gateway berhenti; top-up tetap menunggu tanpa event dan tanpa jurnal"
 ],
 [
  ".predict.options[3]",
  "500: api-t4 gagal mengurai kiriman"
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
  "Secret di api-t4 tidak berubah selama jadwal, jadi kiriman ke-6 juga dijawab 401. Jadwal gateway berhenti di situ. Rekaman retry.txt bagian B: enam kiriman 401, webhook_event 0 baris, dan top-up menunggu tanpa jurnal."
 ],
 [
  ".langkah[0].dari",
  "gw"
 ],
 [
  ".langkah[0].judul",
  "Gateway merotasi secret dan memakai yang baru"
 ],
 [
  ".langkah[0].kirim",
  "# Gateway merotasi rahasia dan langsung menandatangani dengan yang baru; menit 0 = kiriman pertama dengan rahasia baru (waktu maya)."
 ],
 [
  ".langkah[0].jelas",
  "Citra sudah membayar di bank, diperankan perintah lab ke gateway tiruan. Gateway langsung menandatangani dengan secret baru, tanpa masa tumpang tindih. api-t4 masih memegang secret yang lama."
 ],
 [
  ".langkah[1].dari",
  "gw"
 ],
 [
  ".langkah[1].ke",
  "api"
 ],
 [
  ".langkah[1].judul",
  "Kiriman 1 (menit 0)"
 ],
 [
  ".langkah[1].kirim",
  "→ kiriman 1, menit 0: tanda tangan dengan secret baru"
 ],
 [
  ".langkah[1].jelas",
  "Kiriman pertama membawa kabar bahwa order Citra sudah dibayar. api-t4 menghitung tanda tangan dengan secret lama, dan hasilnya tidak sama (kode PeriksaTandaTangan)."
 ],
 [
  ".langkah[2].dari",
  "api"
 ],
 [
  ".langkah[2].ke",
  "gw"
 ],
 [
  ".langkah[2].judul",
  "api-t4 menjawab 401"
 ],
 [
  ".langkah[2].kirim",
  " kiriman | menit sejak kiriman pertama | jawaban api-t4\n 1       | 0                           | 401"
 ],
 [
  ".langkah[2].jelas",
  "Tanda tangan yang salah dijawab 401 sebelum JSON diurai, jadi tidak ada baris event dan tidak ada jurnal."
 ],
 [
  ".langkah[2].nada",
  "warn"
 ],
 [
  ".langkah[3].dari",
  "gw"
 ],
 [
  ".langkah[3].ke",
  "api"
 ],
 [
  ".langkah[3].judul",
  "Gateway mengulang: kiriman 2 sampai 6"
 ],
 [
  ".langkah[3].kirim",
  "→ kiriman 2 sampai 6 pada menit 2, 12, 42, 132, dan 342"
 ],
 [
  ".langkah[3].jelas",
  "Gateway tidak tahu kenapa kirimannya ditolak. Ia mengulang menurut jadwal, dengan jeda 2, 10, 30, 90, dan 210 menit sejak percobaan sebelumnya. Waktunya diperankan, tidak ditunggu."
 ],
 [
  ".langkah[4].dari",
  "api"
 ],
 [
  ".langkah[4].ke",
  "gw"
 ],
 [
  ".langkah[4].judul",
  "Kelima ulangan juga dijawab 401"
 ],
 [
  ".langkah[4].kirim",
  " 2       | 2                           | 401\n 3       | 12                          | 401\n 4       | 42                          | 401\n 5       | 132                         | 401\n 6       | 342                         | 401"
 ],
 [
  ".langkah[4].jelas",
  "Secret di api-t4 tidak berubah selama jadwal berjalan, jadi tiap kiriman ditolak."
 ],
 [
  ".langkah[4].nada",
  "warn"
 ],
 [
  ".langkah[5].dari",
  "gw"
 ],
 [
  ".langkah[5].judul",
  "Jadwal habis, gateway berhenti"
 ],
 [
  ".langkah[5].kirim",
  "gateway berhenti: jadwal habis (342 menit sesudah kiriman pertama, ±5,7 jam)"
 ],
 [
  ".langkah[5].jelas",
  "Kiriman keenam adalah yang terakhir. Gateway tidak mengirim lagi."
 ],
 [
  ".langkah[5].nada",
  "warn"
 ],
 [
  ".langkah[6].dari",
  "api"
 ],
 [
  ".langkah[6].ke",
  "db"
 ],
 [
  ".langkah[6].judul",
  "Tidak ada event, tidak ada jurnal"
 ],
 [
  ".langkah[6].kirim",
  "=> SELECT count(*) AS webhook_event FROM webhook_event\n webhook_event\n---------------\n 0\n(1 row)\n=> SELECT status, jurnal_id FROM topup_bank\n status   | jurnal_id\n----------+-----------\n menunggu |\n(1 row)"
 ],
 [
  ".langkah[6].jelas",
  "Tabel webhook_event kosong, dan top-up Citra tetap menunggu tanpa jurnal. Rekaman tidak mencetak saldo, tetapi tanpa jurnal untuk top-up itu saldo Citra tidak bertambah Rp500.000."
 ],
 [
  ".langkah[6].nada",
  "warn"
 ],
 [
  ".langkah[6].layar.hp.judul",
  "Rekeningo"
 ],
 [
  ".langkah[6].layar.hp.waktu",
  "09.40"
 ],
 [
  ".langkah[6].layar.hp.sinyal",
  3
 ],
 [
  ".langkah[6].layar.hp.isi[0].jenis",
  "teks"
 ],
 [
  ".langkah[6].layar.hp.isi[0].teks",
  "Top-up Citra Rp500.000"
 ],
 [
  ".langkah[6].layar.hp.isi[1].jenis",
  "baris"
 ],
 [
  ".langkah[6].layar.hp.isi[1].kiri",
  "Status"
 ],
 [
  ".langkah[6].layar.hp.isi[1].kanan",
  "menunggu"
 ],
 [
  ".langkah[6].layar.hp.isi[1].nada",
  "warn"
 ],
 [
  ".varian.label",
  "secret di api-t4 disamakan sebelum jadwal habis"
 ],
 [
  ".varian.mulai",
  0
 ],
 [
  ".varian.langkah[0].dari",
  "gw"
 ],
 [
  ".varian.langkah[0].ke",
  "api"
 ],
 [
  ".varian.langkah[0].judul",
  "Kiriman 1 dan 2 ditolak"
 ],
 [
  ".varian.langkah[0].kirim",
  "kiriman 1 dan 2: 401, 401 (sesuai perintah lab)"
 ],
 [
  ".varian.langkah[0].jelas",
  "Ini top-up lain, milik Eko Rp200.000, dengan alur yang sama: secret baru di gateway dan secret lama di api-t4. Skrip lab menghentikan jadwal sesudah kiriman kedua."
 ],
 [
  ".varian.langkah[0].nada",
  "warn"
 ],
 [
  ".varian.langkah[1].dari",
  "api"
 ],
 [
  ".varian.langkah[1].judul",
  "Secret disamakan, api-t4 dinyalakan ulang"
 ],
 [
  ".varian.langkah[1].kirim",
  "# menit 2 sampai 12: rahasia di api-t4 disamakan, server dinyalakan ulang dengan <baru>,<lama>"
 ],
 [
  ".varian.langkah[1].jelas",
  "Daftar secret di api-t4 berubah: yang baru dipakai, yang lama masih diterima. Isi kiriman sama, dan jam maya dipasang sebelum tiap kiriman."
 ],
 [
  ".varian.langkah[2].dari",
  "gw"
 ],
 [
  ".varian.langkah[2].ke",
  "api"
 ],
 [
  ".varian.langkah[2].judul",
  "Gateway mengirim kiriman ke-3 (menit 12)"
 ],
 [
  ".varian.langkah[2].kirim",
  "→ kiriman 3, menit 12: tanda tangan dengan secret baru"
 ],
 [
  ".varian.langkah[2].jelas",
  "Skrip lab melanjutkan jadwal dari kiriman ke-3, pada menit 12."
 ],
 [
  ".varian.langkah[3].dari",
  "api"
 ],
 [
  ".varian.langkah[3].ke",
  "gw"
 ],
 [
  ".varian.langkah[3].judul",
  "api-t4 menjawab 200"
 ],
 [
  ".varian.langkah[3].kirim",
  " kiriman | menit sejak kiriman pertama | jawaban api-t4\n 3       | 12                          | 200 diproses"
 ],
 [
  ".varian.langkah[3].jelas",
  "Tanda tangan cocok sekarang, jadi kabarnya diproses."
 ],
 [
  ".varian.langkah[3].nada",
  "good"
 ],
 [
  ".varian.langkah[4].dari",
  "api"
 ],
 [
  ".varian.langkah[4].ke",
  "db"
 ],
 [
  ".varian.langkah[4].judul",
  "Top-up dibayar, satu jurnal"
 ],
 [
  ".varian.langkah[4].kirim",
  "=> SELECT status, jurnal_id IS NOT NULL AS ada_jurnal FROM topup_bank WHERE id = 2\n status  | ada_jurnal\n---------+------------\n dibayar | t\n(1 row)"
 ],
 [
  ".varian.langkah[4].jelas",
  "Uangnya tercatat satu kali. Rekaman bagian C tidak mencetak saldo, jadi layar tidak menampilkannya."
 ],
 [
  ".varian.langkah[4].nada",
  "good"
 ],
 [
  ".varian.langkah[4].layar.hp.judul",
  "Rekeningo"
 ],
 [
  ".varian.langkah[4].layar.hp.waktu",
  "09.40"
 ],
 [
  ".varian.langkah[4].layar.hp.sinyal",
  3
 ],
 [
  ".varian.langkah[4].layar.hp.isi[0].jenis",
  "teks"
 ],
 [
  ".varian.langkah[4].layar.hp.isi[0].teks",
  "Top-up Eko Rp200.000"
 ],
 [
  ".varian.langkah[4].layar.hp.isi[1].jenis",
  "baris"
 ],
 [
  ".varian.langkah[4].layar.hp.isi[1].kiri",
  "Status"
 ],
 [
  ".varian.langkah[4].layar.hp.isi[1].kanan",
  "dibayar"
 ],
 [
  ".varian.langkah[4].layar.hp.isi[1].nada",
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
 "",
 "",
 "Citra:1 Sabtu:1 Minggu:1",
 "belum:1 Citra:1 Raka:1 Sabtu:1 Minggu:1 naik:1",
 "tidak:1 satu:1 tujuh:2 Senin:1",
 "sama:1 tujuh:1 Citra:1 bukan:1 Rekaman lab:2 Tidak dijalankan:1 Ilustrasi:2",
 "",
 "Raka:1",
 "tidak:1 sama:1 satu:2 Citra:1 Raka:1 pertama:1 tanpa:2 Rekaman lab:1 diterima:1",
 "tidak:2 hanya:1 Citra:1 kedua:1 diterima:1",
 "Raka:1",
 "",
 "tidak:2 satu:1 Citra:1",
 "tidak:2 sebelum:1 satu:1 ditolak:1",
 "tetap:1 enam:1 Rekaman lab:1",
 "",
 "",
 "",
 "tidak:1 sebelum:1 habis:1",
 "hanya:1",
 "tidak:1 Sabtu:1 Ilustrasi:1",
 "",
 "tidak:1",
 "sebelum:2 satu:1 Tidak dijalankan:1 diterima:1",
 "",
 "gagal:1",
 "tidak:1 lima:1 enam:1 Citra:1 pertama:1",
 "enam:1 Rekaman lab:1 habis:1",
 "Hitungan:1",
 "tidak:1 hanya:1 lima:1",
 "tidak:2 satu:1 dua:1 empat:1 lima:1 kedua:1 Tidak dijalankan:2",
 "tidak:1 bukan:1 Asumsi:1",
 "Rekaman lab:1",
 "tidak:1 satu:1 dua:1 pertama:1 kedua:1 Tidak dijalankan:1",
 "",
 "",
 "sama:1 tiga:1 lima:1 pertama:1 kedua:1 tanpa:1 gagal:1",
 "tidak:2 tetap:1 satu:1 pertama:1 kedua:1",
 "satu:1 dua:1 kedua:1 bukan:1 tanpa:1",
 "tidak:1 sebelum:2 sesudah:1 Bayu:1 Minggu:1 pertama:1 Ilustrasi:1",
 "tidak:1 hanya:1 sesudah:2 Citra:1 Sabtu:2 Minggu:1 pertama:1",
 "tidak:1 sebelum:1 Citra:1 Raka:2",
 "tujuh:1 Senin:1 kedua:1 tanpa:1 Ilustrasi:1",
 "sama:1 sebelum:2 bukan:1 Tidak dijalankan:1",
 "tidak:1 belum:2 sesudah:1 kedua:1 Tidak dijalankan:1 habis:1",
 "sesudah:1",
 "tidak:1 sama:1 Citra:1 Senin:1 kedua:1 Tidak dijalankan:1",
 "kedua:1",
 "",
 "",
 "enam:1 Citra:2",
 "",
 "tidak:1 sama:1 sebelum:1 satu:2 Eko:1 habis:1 diterima:1",
 "",
 "tidak:1 tetap:1 satu:1 Citra:1 tanpa:1",
 "sebelum:1 satu:1 habis:1",
 "",
 "",
 "tanpa:1",
 "satu:1 Rekaman lab:1",
 "",
 "",
 "",
 "kedua:1",
 "",
 "",
 "sama:1",
 "tidak:1 hanya:1 sebelum:1 kedua:1 habis:1",
 "",
 "tidak:2 satu:1 enam:1 Citra:1",
 "",
 "",
 "sebelum:1 enam:1",
 "",
 "tidak:1 tetap:1 Citra:1 Bayu:1 Sabtu:1 Minggu:1 naik:1",
 "",
 "",
 "tidak:1 sebelum:2 pertama:1 semua:1 Ilustrasi:1 Hitungan:1",
 "",
 "tidak:1 satu:1",
 "",
 "",
 "tidak:1 tiga:1 lima:1 pertama:1 kedua:2 Tidak dijalankan:1",
 "",
 "",
 "",
];

export const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import rahasiaBerganti from \"../../../../data/diagram/t4-m30-rahasia-berganti.json\";",
  "<p class=\"meta\">Baca 8 menit · coba 3 menit · Prasyarat: [[t4-webhook]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 4 Tahap 4. Sabtu malam Citra mengisi saldo Rp500.000 dari rekening banknya lewat app. Rekeningnya terpotong Rp500.000, dan app menampilkan top-up itu berstatus \"menunggu\".",
  "Minggu pukul 09.40 Citra menulis ke layanan pelanggan. Uangnya sudah keluar dari bank, tetapi saldo di app belum naik. Statusnya masih \"menunggu\" sejak Sabtu malam, dan layanan pelanggan meneruskan pesannya ke Raka.",
  "Senin pagi Pak Hadi mencocokkan laporan gateway dengan ledger, seperti tiap hari. Laporan itu memuat tujuh top-up yang sudah dibayar di bank. Ledger tidak punya jurnal untuk satu pun dari tujuh itu.",
  "*Angka cerita (Ilustrasi):* hari, jam, dan jumlah tujuh top-up berasal dari naskah, bukan dari rekaman. Nominal Rp500.000 sama dengan top-up Citra di rekaman (Rekaman lab). Arti Ilustrasi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Dugaan pertama Raka datang dari sisi yang ia pegang: layar status di app tidak menyegarkan diri. Ia menyingkirkannya dengan membaca status top-up Citra langsung dari database. Hasilnya sama dengan layar: `menunggu`, tanpa jurnal, dan tanpa satu pun event dari gateway (Rekaman lab, bagian B di blok berikutnya). Event adalah satu baris di tabel `webhook_event`, dicatat untuk tiap kabar yang diterima.",
  "Dugaan kedua: top-up Citra hilang. Barisnya ada dan berstatus `menunggu`, jadi top-up tidak hilang. Yang tidak ada hanya kabar dari gateway bahwa uangnya sudah diterima.",
  "Dugaan ketiga: gateway sedang lambat. Raka memutuskan menunggu sehari.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: gateway sudah mengirim kabar \"dibayar\" untuk top-up Citra, tetapi database tidak memuat satu pun event. Kenapa tidak ada event?</summary>",
  "Kabarnya sampai ke Rekeningo, tetapi ditolak sebelum satu pun baris event ditulis. Penolakannya 401, karena tanda tangan di kiriman tidak cocok dengan secret yang dipegang Rekeningo. Secret di sini adalah kata rahasia bersama antara gateway dan Rekeningo. Kenapa tidak cocok ada di blok berikutnya.",
  "Rekaman lab memerankannya: enam kiriman dijawab 401, dan tabel `webhook_event` tetap kosong.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Gateway tidak lambat. Ia mengirim kabarnya sesuai jadwal, dan Rekeningo menolak tiap kiriman dengan 401. Jadwal gateway habis sebelum penyebab penolakannya diperbaiki.",
  "Penyebabnya ada di secret. Secret adalah kata rahasia yang hanya diketahui gateway dan Rekeningo; rekaman lab menulisnya rahasia. Gateway memakainya untuk menghitung tanda tangan tiap kiriman ([[t4-webhook]]), dan Rekeningo memakainya untuk memeriksa tanda tangan itu. Rotasi berarti mengganti secret dengan yang baru.",
  "Sabtu 18.00 (Ilustrasi) gateway tiruan merotasi secretnya dan langsung menandatangani dengan secret baru. Service pembayaran masih memegang secret lama. Tanda tangan baru tidak cocok dengan secret lama, jadi tiap kiriman dijawab 401.",
  "<Rantai data={rahasiaBerganti} />",
  "*Kondisi rekaman:* PostgreSQL 17.11, server Go `api-t4`, dan gateway tiruan lokal. Gateway memainkan jadwal ulangnya atas perintah skrip lab. Waktunya diperankan: gateway tidak menunggu 342 menit, tetapi menandatangani tiap kiriman dengan waktu maya dan memberi tahu jam itu ke api-t4.",
  "**Penolakan terjadi sebelum event ditulis.** Di rekaman bagian B service memeriksa tanda tangan lebih dulu, sebelum JSON diurai. Daftar secret yang diterima berisi satu secret, yaitu yang lama. Handler mengubah kegagalan itu menjadi 401 (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t4/internal/service/pembayaran.go\" lines=\"86:95\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/service/pembayaran.go baris 86 sampai 95 (tanda tangan dicocokkan dengan daftar secret)\" />",
  "<Snippet file=\"labs/api-t4/internal/handler/handler_pembayaran.go\" lines=\"198:199\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/handler/handler_pembayaran.go baris 198 sampai 199 (gagal tanda tangan jadi 401)\" />",
  "**Enam kiriman, enam 401.** Gateway tiruan mengirim kiriman pertama dan lima ulangan untuk top-up Citra Rp500.000. Semuanya dijawab 401. Sesudah kiriman keenam gateway berhenti, dan database tidak memuat event maupun jurnal:",
  "<Snippet file=\"labs/t4-webhook/output/retry.txt\" lines=\"21:44\" title=\"Rekaman lab: labs/t4-webhook/output/retry.txt, bagian B (enam kiriman 401, jadwal habis)\" />",
  "Jeda antar percobaan 2, 10, 30, 90, dan 210 menit sejak percobaan sebelumnya. Kiriman jatuh pada menit 0, 2, 12, 42, 132, dan 342. Totalnya 342 menit, atau 342 ÷ 60 = 5,7 jam (Hitungan: angka yang dihitung dari angka lain di halaman).",
  "**Kenapa 401 diulang sampai lima kali.** Gateway tidak tahu kenapa Rekeningo menolak. Ia hanya melihat kode status.",
  "Dokumentasi gateway kedua memuat jumlah ulangan per kode status ([dokumentasi notifikasi HTTP sebuah gateway pembayaran](https://docs.midtrans.com/docs/https-notification-webhooks), dibuka 2026-10-29, Tidak dijalankan). Tanpa ulangan untuk 2xx, satu kali untuk 500, empat kali untuk 503, dua kali untuk 400 dan 404, dan lima kali untuk kegagalan lain. Pengalihan 301, 302, dan 303 tidak diulang, dan tiruan tidak memerankannya (Tidak dijalankan).",
  "Tabel kode status di dokumentasi itu tidak menyebut 401 sendiri. Kode itu jatuh ke baris kegagalan lain, dan itu pembacaan, bukan kutipan. Tiruan memakai pembacaan itu (Asumsi), dan tabel bagian A merekam jumlah kirimannya per kode:",
  "<Snippet file=\"labs/t4-webhook/output/retry.txt\" lines=\"5:16\" title=\"Rekaman lab: labs/t4-webhook/output/retry.txt, bagian A (jumlah kiriman per kode status)\" />",
  "**Dua gateway nyata, dua kebiasaan.** Jadwal tiruan datang dari dokumentasi gateway kedua. Perilaku rotasi yang berbeda ada di dokumentasi gateway pertama ([dokumentasi webhook gateway pembayaran lain](https://docs.stripe.com/webhooks), dibuka 2026-10-29, Tidak dijalankan). Keduanya tidak boleh dibaca sebagai satu gateway:",
  "| | Dokumentasi gateway nyata | Tiruan lab |",
  "|---|---|---|",
  "| Kiriman yang gagal | Gateway pertama: diulang sampai tiga hari dalam mode live. Gateway kedua: paling banyak lima kali, jeda 2, 10, 30, 90, dan 210 menit, digeser acak | Lima ulangan dengan jeda yang sama, tanpa geseran (`retry.txt` bagian A) |",
  "| Rotasi secret | Gateway pertama: secret lama bisa langsung kedaluwarsa atau tetap aktif sampai 24 jam, sesuai pilihan; tiap secret yang aktif memberi satu tanda tangan. Gateway kedua: tidak disebut di dokumentasi yang dibuka | Langsung memakai secret baru; secret lama dan baru tidak berlaku bersamaan (`retry.txt` bagian B) |",
  "Masa tumpang tindih adalah jangka waktu ketika secret lama dan secret baru sama-sama berlaku. Kegagalan seperti M30 butuh dua sifat sekaligus: rotasi tanpa masa tumpang tindih, dan jadwal ulang yang lebih pendek daripada waktu penyamaan secret. Gabungan itu bukan perilaku yang tertulis di salah satu dari kedua dokumentasi.",
  "**Kiriman yang tidak datang lagi.** Bayu menyamakan secret Minggu 09.10 (Ilustrasi), atau 910 menit sesudah rotasi pukul 18.00. Jadwal terpanjang gateway 342 menit. Kiriman pertama sebelum 09.10 − 342 menit = 03.28 memakai keenam percobaannya sebelum 09.10.",
  "Semuanya dijawab 401, dan gateway tidak mengirim lagi. Rentang itu dimulai dari rotasi: Sabtu 18.00 sampai Minggu 03.28, atau 910 − 342 = 568 menit. Top-up Citra, Sabtu malam, ada di rentang itu. Kiriman pertama sesudah 03.28 masih punya percobaan sesudah 09.10, jadi tercatat, hanya terlambat.",
  "Karena itu keputusan Raka, menunggu sehari, tidak menolong Citra. Gateway sudah berhenti mengirim sebelum Raka mulai menunggu.",
  "Batas 03.28 berlaku untuk tiruan. Gateway kedua menggeser tiap percobaan secara acak, jadi batasnya di sana bergeser sedikit. Jumlah top-up di rentang itu bergantung pada berapa orang mengisi saldo; naskah menyebut tujuh top-up tanpa jurnal pada hari Senin (Ilustrasi).",
  "**Penyebabnya secret, bukan waktu atau isi.** Di bagian C api-t4 dinyalakan ulang sebelum kiriman ke-3, dengan secret baru di depan dan secret lama sesudahnya. Isi kiriman sama, dan jam maya dipasang sebelum tiap kiriman (Tidak dijalankan: dibaca dari `run.py`). Kiriman 1 dan 2 dijawab 401, dan kiriman 3 pada menit 12 dijawab 200 diproses.",
  "**Tidak ada jalan kedua.** Di cerita, minggu 4 belum punya job yang menanyakan status top-up ke gateway, dan belum ada job yang mencocokkan laporan gateway dengan ledger. Skrip rekaman bagian B tidak menjalankan job apa pun sesudah jadwal habis (Tidak dijalankan: dibaca dari `run.py`).",
  "Catatan penutup rekaman itu menyebut keduanya, cek status dan rekonsiliasi, sebagai yang menemukan uangnya. Keduanya lahir sesudah M30.",
  "Dokumentasi gateway kedua sendiri menyarankan menanyakan status transaksi lewat API-nya bila notifikasi terlambat (dokumentasi yang sama, Tidak dijalankan). Webhook di versi ini adalah satu-satunya jalan kabar uang masuk. Pertanyaan PRD v4, siapa yang tahu bila kabar tidak datang, di sini dijawab dengan buruk: Citra lewat pesan, dan Pak Hadi lewat laporan hari Senin.",
  "Jalan kedua, dan cara selisih seperti ini menjadi insiden bernomor, dibuka di [[t4-rekonsiliasi]].",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `retry.txt` bagian B: enam kiriman untuk top-up Citra, sampai HP Citra. Tebak dulu, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m30.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: secret di api-t4 disamakan sebelum jadwal habis**. Bagian C memakai top-up Eko Rp200.000 dengan alur yang sama: kiriman ke-3 pada menit 12 diterima, dan jurnalnya satu. Layar HP di widget digambar dari isi rekaman: lab tidak punya app Flutter.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: api-t4 menjawab 401 untuk keenam kiriman (menit 0, 2, 12, 42, 132, dan 342), tabel webhook_event kosong, dan top-up Citra tetap menunggu tanpa jurnal.",
  "Bila secret disamakan sebelum jadwal habis, kiriman ke-3 pada menit 12 dijawab 200 diproses, dan top-up berstatus dibayar dengan satu jurnal. Rekaman bagian C ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman bagian C (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t4-webhook/output/retry.txt\" lines=\"46:57\" title=\"Rekaman lab: labs/t4-webhook/output/retry.txt, bagian C (secret disamakan, uang tercatat satu kali)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-rekonsiliasi]]: jalan kedua untuk kabar uang, dan selisih antara bank dan ledger yang menjadi insiden bernomor. Keputusannya ADR 35.",
  "- [[t4-webhook]]: tanda tangan yang diperiksa Rekeningo, dan penolakannya berupa 401.",
  "- [[t4-infra-secret]]: tempat secret disimpan dan urutan menggantinya.",
  "- [[t3-at-least-once]]: pola yang sama dilihat dari sisi pengirim: kiriman diulang menurut jadwal, lalu berhenti.",
  "Gateway hanya mengulang selama jadwalnya, dan ia tidak tahu kenapa Rekeningo menolak. Jalan kedua untuk kabar uang harus sudah ada sebelum jadwal itu habis.",
  "### Cek diri",
  "**1.** Gateway mengirim enam kiriman untuk top-up Citra, dan database tidak memuat satu pun event. Kenapa tidak ada event?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tanda tangan kiriman memakai secret baru, sedangkan api-t4 masih memegang secret lama. Tiap kiriman dijawab 401 sebelum event ditulis (`retry.txt` bagian B: enam kiriman 401, `webhook_event` 0 baris).",
  "</details>",
  "**2.** Bayu menyamakan secret Minggu 09.10. Kenapa top-up Citra dari Sabtu malam tetap tidak naik?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Jadwal terpanjang gateway 342 menit. Kiriman pertama sebelum 09.10 − 342 menit = 03.28 sudah memakai semua percobaannya sebelum 09.10. Jadi gateway tidak mengirim lagi (Hitungan atas jadwal `retry.txt` bagian A, dengan jam cerita berlabel Ilustrasi).",
  "</details>",
  "**3.** Kenapa halaman ini tidak menulis jadwal ulang dan masa tumpang tindih secret sebagai perilaku satu gateway?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Jadwal lima kali dengan jeda 2, 10, 30, 90, dan 210 menit ada di dokumentasi gateway kedua, yang tidak menyebut rotasi. Masa tumpang tindih sampai 24 jam dan pengulangan sampai tiga hari ada di dokumentasi gateway pertama (Tidak dijalankan). Tiruan lab memakai jadwal gateway kedua dengan rotasi langsung.",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
