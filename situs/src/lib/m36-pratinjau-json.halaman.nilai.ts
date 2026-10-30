// Nilai penjaga halaman 4.20, dibangkitkan dari m36-pratinjau-json.mdx, diagram, skenario, dan baris riset oleh
// tmp/m36/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "5f184305261ba02e",
  riset: ["ec844cee4f2ee54d","a769235f92afbc8b","0b00e9bd8267a763"],
  diagram: "5abfaefbc8dd57fe",
  skenario: "b4281043ee7a2e9b",
};

// Nilai terpisah dari kalimat terkunci: tiga baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-205 | SSRF: definisi, contoh URL gambar dari user, redirect dimatikan, deny-list pilihan terakhir (dibuka untuk halaman 4.20) | OWASP Cheat Sheet Series, \"Server-Side Request Forgery Prevention\" (cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html; halaman tanpa tanggal pembaruan, dibuka 2026-10-30): bagian Context: \"SSRF is an attack vector that abuses an application to interact with the internal/external network or the machine itself.\"; contoh user yang memasukkan URL gambar avatar untuk diunduh aplikasi; \"Disable the support for the following of the redirection in your web client\"; \"Deny-lists are bypass-prone. Prefer allow-lists.\" dan bagian \"Deny-list (Last Resort)\". Halaman itu tidak membahas pesan kesalahan atau isi respons yang ditampilkan ke user (dibaca 2026-10-30) | 4.20 (definisi SSRF, contoh avatar, deny-list, redirect); klaim pesan kesalahan memuat isi respons berasal dari kode lab, bukan dari OWASP | Tidak berubah (R4-14 memuat butir yang sama untuk 4.21) |",
  "| R4-206 | Client HTTP Go mengikuti redirect secara bawaan (dibuka untuk halaman 4.20) | Dokumentasi paket net/http, tipe Client (pkg.go.dev/net/http#Client, go1.27.3, dibuka 2026-10-30): \"If CheckRedirect is nil, the Client uses its default policy, which is to stop after 10 consecutive requests.\"; bagian Client.Do: \"If the server replies with a redirect, the Client first uses the CheckRedirect function to determine whether the redirect should be followed.\" Versi lab go1.27.1; teks dibaca pada go1.27.3 | 4.20 (butir 3: redirect diikuti oleh client bawaan; Cek diri 3) | Tidak diperiksa antar versi Go: dokumentasi dibaca di go1.27.3, lab memakai go1.27.1 |",
  "| R4-207 | Rekaman dan kode lab t4-ssrf dan api-t4 untuk M36 (dibaca untuk halaman 4.20, tanpa menjalankan ulang) | `labs/t4-ssrf/output/alamat.txt` baris 44 sampai 45 (32 dari 32 alamat terlarang ditolak; 29 lolos bila `IsPrivate` satu-satunya pemeriksaan; 26 lolos bila hanya empat penanda; lima alamat kontrol lolos), `batas.txt` (redirect tujuh kode: server pertama tersentuh 1, server tujuan redirect 0; pesan galat: 200 berisi JSON dijawab \"bukan gambar\", 403, 404, dan 500 dijawab \"gambar tidak bisa diunduh\", delapan penolakan alamat literal satu pesan, server uji tersentuh 0), `labs/api-t4/output/testing.txt` baris 491 sampai 492 (`TestRentanPesanGalatMembocorkanIsiLayananDalam` dan `TestRentanMengikutiRedirectKeAlamatDalam` lulus; tanpa rekaman tingkat endpoint), kode `labs/api-t4/internal/unduh/unduh.go` (fungsi `Rentan` baris 277 sampai 308) dan `internal/service/katalog_impor.go` (`HasilImpor` dan penyimpanan pesan di kolom `galat`), `internal/handler/handler_bo.go` (hasil dikembalikan ke pemanggil); README `labs/t4-ssrf` (lingkup dipersempit, butir a sampai d Tidak dijalankan) | 4.20 | Tidak berubah |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m36-pratinjau-json"
 ],
 [
  ".judul",
  "Yang direkam dari sisi pembela: alamat dalam, redirect, dan pesan galat"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-ssrf · alamat.txt dan batas.txt"
 ],
 [
  ".baris[0].label",
  "Versi aman menolak"
 ],
 [
  ".baris[0].sub",
  "alamat.txt dan batas.txt"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Alamat dalam"
 ],
 [
  ".baris[0].simpul[0].sub",
  "32 dari 32 ditolak"
 ],
 [
  ".baris[0].simpul[1].teks",
  "Redirect"
 ],
 [
  ".baris[0].simpul[1].sub",
  "tujuan tersentuh 0 kali"
 ],
 [
  ".baris[0].simpul[2].teks",
  "Jawaban bukan gambar"
 ],
 [
  ".baris[0].simpul[2].sub",
  "pesan: bukan gambar"
 ],
 [
  ".baris[0].simpul[2].nada",
  "good"
 ],
 [
  ".baris[1].label",
  "Bila hanya IsPrivate diperiksa"
 ],
 [
  ".baris[1].sub",
  "alamat.txt"
 ],
 [
  ".baris[1].simpul[0].teks",
  "32 alamat terlarang"
 ],
 [
  ".baris[1].simpul[0].sub",
  "3 ditandai private"
 ],
 [
  ".baris[1].simpul[1].teks",
  "29 lolos"
 ],
 [
  ".baris[1].simpul[1].sub",
  "32 − 3"
 ],
 [
  ".baris[1].simpul[1].nada",
  "warn"
 ],
 [
  ".baris[1].simpul[2].teks",
  "5 alamat kontrol"
 ],
 [
  ".baris[1].simpul[2].sub",
  "tetap lolos"
 ],
 [
  ".catatan",
  "Alamat contoh adalah angka karangan lab, dan server uji hanya di 127.0.0.1 di dalam proses tes. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Fetcher gambar versi aman: alamat dalam, redirect, dan pesan galat"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-ssrf/output/batas.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-ssrf/output/alamat.txt"
 ],
 [
  ".sumber.catatan",
  "Lab t4-ssrf, go1.27.1, tanpa database, server uji hanya di 127.0.0.1 di dalam proses tes (make -C labs/t4-ssrf run). Jalur utama: alamat.txt (alamat terlarang) dan batas.txt (redirect dan pesan galat). Ubah satu hal: alamat.txt, hanya IsPrivate yang diperiksa. Lab ini hanya menjalankan versi aman; versi pertama Tidak dijalankan di lab ini. Alamat contoh adalah angka karangan lab. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log."
 ],
 [
  ".pengantar",
  "Fetcher gambar versi aman diuji dengan server uji di dalam proses tes. Tebak dulu pesan apa yang diterima merchant, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "mer"
 ],
 [
  ".komponen[0].label",
  "Merchant (pengisi URL)"
 ],
 [
  ".komponen[1].id",
  "fch"
 ],
 [
  ".komponen[1].label",
  "Fetcher gambar versi aman"
 ],
 [
  ".komponen[2].id",
  "tuj"
 ],
 [
  ".komponen[2].label",
  "Server tujuan (uji)"
 ],
 [
  ".predict.q",
  "Server tujuan menjawab 200, tetapi isinya JSON dari layanan lain, bukan gambar. Pesan apa yang diterima merchant dari fetcher versi aman?"
 ],
 [
  ".predict.options[0]",
  "\"bukan gambar\": kalimat tetap, tanpa satu byte pun isi JSON"
 ],
 [
  ".predict.options[1]",
  "Awal isi JSON itu, supaya merchant tahu kenapa gambarnya ditolak"
 ],
 [
  ".predict.options[2]",
  "\"tujuan tidak diizinkan\": JSON dianggap alamat yang dilarang"
 ],
 [
  ".predict.options[3]",
  "\"tidak menjawab\": isi JSON dianggap jawaban yang tidak lengkap"
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
  "Versi aman menilai isi dari byte-nya dan memakai kalimat tetap, jadi isi respons tidak ikut ke pesan. Rekaman batas.txt, bagian pesan galat: 200 berisi JSON layanan dalam dijawab \"bukan gambar\"."
 ],
 [
  ".langkah[0].dari",
  "mer"
 ],
 [
  ".langkah[0].ke",
  "fch"
 ],
 [
  ".langkah[0].judul",
  "Alamat di jaringan dalam: ditolak, server tujuan tidak tersentuh"
 ],
 [
  ".langkah[0].kirim",
  "ditolak fetcher aman: 32 dari 32 alamat terlarang\npenolakan karena alamat literal: 8 alamat (loopback terbuka dan tertutup, private, link-local, CGNAT, ULA, 0.0.0.0): 1 pesan berbeda: map[tujuan tidak diizinkan:8]\nserver uji disentuh oleh unduhan yang ditolak: 0"
 ],
 [
  ".langkah[0].jelas",
  "Alamat contoh loopback, private, link-local, dan CGNAT ditolak oleh pemeriksaan alamat. Delapan penolakan karena alamat literal memakai satu pesan yang sama, dan server uji tidak tersentuh."
 ],
 [
  ".langkah[0].nada",
  "good"
 ],
 [
  ".langkah[1].dari",
  "fch"
 ],
 [
  ".langkah[1].ke",
  "tuj"
 ],
 [
  ".langkah[1].judul",
  "Alamat luar menjawab redirect: tidak diikuti"
 ],
 [
  ".langkah[1].kirim",
  "redirect 302 ke server lain: ditolak (tujuan tidak diizinkan); server pertama disentuh: 1, server tujuan redirect disentuh: 0"
 ],
 [
  ".langkah[1].jelas",
  "Tujuh kode redirect diuji, dari 300 sampai 308 tanpa 305 dan 306. Di tiap kode server pertama tersentuh satu kali, dan server tujuan redirect tidak tersentuh sama sekali."
 ],
 [
  ".langkah[1].nada",
  "good"
 ],
 [
  ".langkah[2].dari",
  "tuj"
 ],
 [
  ".langkah[2].ke",
  "fch"
 ],
 [
  ".langkah[2].judul",
  "Server menjawab 200 dengan isi JSON: bukan gambar"
 ],
 [
  ".langkah[2].kirim",
  "200 berisi JSON layanan dalam pesan: \"bukan gambar\"\n403 berisi JSON layanan dalam pesan: \"gambar tidak bisa diunduh\"\n404 berisi JSON layanan dalam pesan: \"gambar tidak bisa diunduh\"\n500 berisi JSON layanan dalam pesan: \"gambar tidak bisa diunduh\""
 ],
 [
  ".langkah[2].jelas",
  "Isi JSON dari server uji tidak ikut ke pesan. Jawaban 200 yang bukan gambar dijawab \"bukan gambar\", dan 403, 404, dan 500 dijawab \"gambar tidak bisa diunduh\"."
 ],
 [
  ".langkah[3].dari",
  "fch"
 ],
 [
  ".langkah[3].ke",
  "mer"
 ],
 [
  ".langkah[3].judul",
  "Merchant hanya menerima kalimat tetap"
 ],
 [
  ".langkah[3].kirim",
  "pesan galat versi aman di kode: 5 kalimat tetap (dibaca dari unduh.go, bukan diamati di tiap jalur)"
 ],
 [
  ".langkah[3].jelas",
  "Kalimat tetap itu dibaca dari kode, bukan diamati di tiap jalur. Di bagian pesan galat rekaman memuat tiga kalimat itu: bukan gambar, gambar tidak bisa diunduh, dan tujuan tidak diizinkan."
 ],
 [
  ".langkah[3].nada",
  "good"
 ],
 [
  ".varian.label",
  "pemeriksaan alamat hanya memakai IsPrivate"
 ],
 [
  ".varian.mulai",
  0
 ],
 [
  ".varian.langkah[0].dari",
  "mer"
 ],
 [
  ".varian.langkah[0].ke",
  "fch"
 ],
 [
  ".varian.langkah[0].judul",
  "Bila IsPrivate satu-satunya pemeriksaan: 29 dari 32 lolos"
 ],
 [
  ".varian.langkah[0].kirim",
  "ditolak fetcher aman: 32 dari 32 alamat terlarang; dari itu 29 lolos bila IsPrivate satu-satunya pemeriksaan"
 ],
 [
  ".varian.langkah[0].jelas",
  "Tiga alamat contoh ditandai private: 10.0.0.1, fd00::5, dan ::ffff:10.0.0.1. Jadi 32 − 3 = 29 alamat terlarang tidak tertahan, termasuk loopback, link-local, dan CGNAT."
 ],
 [
  ".varian.langkah[0].nada",
  "warn"
 ],
 [
  ".varian.langkah[1].dari",
  "fch"
 ],
 [
  ".varian.langkah[1].judul",
  "Empat penanda bawaan Go: 26 dari 32 masih lolos"
 ],
 [
  ".varian.langkah[1].kirim",
  "dari 32 alamat terlarang yang sama, 26 lolos bila hanya empat penanda di tabel (IsPrivate, IsLoopback, IsLinkLocalUnicast, IsUnspecified) yang diperiksa"
 ],
 [
  ".varian.langkah[1].jelas",
  "Enam alamat tertangkap oleh salah satu dari empat penanda, jadi 32 − 6 = 26. Dua dari 26 alamat itu adalah alamat multicast, yang tertangkap penanda bawaan Go lain, IsMulticast. Sisanya, termasuk CGNAT, benchmark, dan bentuk IPv6 transisi, hanya tertangkap oleh daftar awalan yang ditulis fetcher (dibaca dari kode, bukan dicatat rekaman)."
 ],
 [
  ".varian.langkah[1].nada",
  "warn"
 ],
 [
  ".varian.langkah[2].dari",
  "fch"
 ],
 [
  ".varian.langkah[2].judul",
  "Kontrol: lima alamat yang bukan terlarang tetap lolos"
 ],
 [
  ".varian.langkah[2].kirim",
  "# 5 alamat kontrol di tabel yang sama lolos, termasuk 100.63.255.255 dan 100.128.0.1 yang tepat di luar blok CGNAT"
 ],
 [
  ".varian.langkah[2].jelas",
  "Daftar tidak menolak semuanya. Lima alamat kontrol, termasuk dua yang tepat di luar blok CGNAT, tetap lolos."
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
 "",
 "",
 "Ratih:1 Senin:1 pratinjau:1 merchant:1",
 "tidak:1",
 "sama:1 Laras:1",
 "Laras:1 bukan:1 Rekaman lab:1 Tidak dijalankan:1 Ilustrasi:2 Asumsi:1 lab:1",
 "",
 "Raka:1",
 "dua:1 pertama:1 merchant:1",
 "hanya:1 bukan:1 alamat:1 pratinjau:1",
 "",
 "hanya:1 alamat:1 pratinjau:1",
 "bukan:1 Tidak dijalankan:1 alamat:1 merchant:1",
 "",
 "",
 "",
 "tidak:1 alamat:1 merchant:1",
 "dua:1 bukan:1 Tidak dijalankan:1 alamat:1 galat:1 pratinjau:2 merchant:1 lab:1",
 "32:2 galat:1 pratinjau:1 lab:1",
 "tidak:1 alamat:1 merchant:1 server:2",
 "Tidak dijalankan:1 Ilustrasi:1 OWASP:2 merchant:1",
 "pertama:2 Tidak dijalankan:1 versi pertama:1 lab:1",
 "hanya:1 dua:1 alamat:1",
 "tidak:1 alamat:1",
 "alamat:1 server:1",
 "pertama:1 bukan:2 200:2 merchant:1",
 "tidak:2 hanya:1 sama:1 dua:1 Tidak dijalankan:1 lolos:1 deny-list:2 OWASP:1 alamat:2",
 "hanya:1 lab:1",
 "tidak:1 hanya:1 sesudah:1 pertama:1 tanpa:1 Tidak dijalankan:1 redirect:2 OWASP:1 10:1 alamat:2",
 "redirect:1 lab:1",
 "merchant:1",
 "29:2 galat:1 lab:1",
 "hanya:1 bukan:1 galat:1 pratinjau:2",
 "galat:2 lab:1",
 "tidak:1 tanpa:1 Rekaman lab:1 Ilustrasi:1 galat:1 pratinjau:1 lab:3",
 "Rekaman lab:1 lab:1",
 "hanya:1 pertama:1 Tidak dijalankan:1 versi aman:1 versi pertama:1 lab:2",
 "hanya:1 tanpa:1 server:1 lab:1",
 "tidak:1 terlarang:1 32:3 versi aman:1 alamat:4",
 "hanya:1 satu:1 empat:1 Hitungan:1 lolos:1 IsPrivate:1 32:1 29:3 alamat:1",
 "Rekaman lab:1 lolos:1 terlarang:1 IsPrivate:1 alamat:3 lab:1",
 "satu:1 tujuh:1 pertama:1 redirect:2 server:2",
 "tidak:1 Rekaman lab:1 redirect:1 lab:1",
 "tidak:1 sama:1 satu:1 versi aman:1 alamat:1 galat:1 server:1",
 "tanpa:1 Rekaman lab:1 26:2 galat:1 lab:1",
 "",
 "tidak:1",
 "hanya:1 pertama:1 tanpa:1 Tidak dijalankan:1",
 "hanya:1 Ratih:1 Laras:1 Ilustrasi:1",
 "tidak:1 Tidak dijalankan:1 alamat:2",
 "tidak:2 belum:1 versi aman:1 galat:1 lab:1",
 "",
 "",
 "satu:1 alamat:2 merchant:1",
 "",
 "hanya:2 satu:1 empat:1 Rekaman lab:1 lolos:2 terlarang:1 IsPrivate:2 32:2 29:1 26:1 alamat:3 lab:1",
 "tidak:1 satu:1 bukan:1 semua:1 alamat:2",
 "",
 "tidak:1 satu:1 bukan:2 redirect:1 200:1",
 "hanya:1 lolos:1 terlarang:1 IsPrivate:1 32:1 29:1 alamat:2",
 "",
 "",
 "tanpa:1 alamat:1",
 "hanya:1 Rekaman lab:1 IsPrivate:1 alamat:2 lab:1",
 "",
 "",
 "",
 "ADR 41:1 alamat:1 server:1",
 "redirect:1 alamat:1 server:1",
 "",
 "hanya:1 alamat:1 merchant:1",
 "",
 "",
 "pertama:2 bukan:1 Tidak dijalankan:1 200:1 versi pertama:1 alamat:1 galat:1 merchant:1",
 "",
 "tidak:1 terlarang:1 IsPrivate:1 32:2 alamat:1",
 "",
 "",
 "hanya:1 tiga:1 lolos:1 IsPrivate:1 32:1 29:1 alamat:2",
 "",
 "redirect:1 versi aman:1 alamat:1",
 "",
 "",
 "tujuh:1 Tidak dijalankan:1 redirect:3 10:1 server:1",
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
  "import pratinjauJson from \"../../../../data/diagram/t4-m36-pratinjau-json.json\";",
  "<p class=\"meta\">Baca 6 menit · coba 3 menit · Prasyarat: [[t4-storage]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 9 Tahap 4. Senin Ratih, analis risiko di tim risk, meninjau merchant baru. Ia membuka toko \"Toko Andalan\" dan melihat kolom \"pratinjau gambar\".",
  "Kolom itu tidak berisi gambar. Isinya teks JSON dengan kata `penyimpanan-internal`.",
  "Laras, dari tim security, menemukan hal yang sama dalam security review.",
  "*Angka cerita (Ilustrasi):* hari, nama toko, kata `penyimpanan-internal`, dan temuan Laras berasal dari cerita, bukan dari rekaman. Arti Ilustrasi, Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Dugaan pertama ada dua, dan keduanya menyalahkan file merchant: gambar produknya rusak, atau file CSV impornya salah isi.",
  "Dugaan itu masuk akal. Merchant mengisi kolom `gambar_url` di file CSV sendiri, dan pratinjau dibuat dari kolom itu. Tetapi file CSV hanya memuat alamat, bukan isi gambar.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: file CSV hanya berisi alamat gambar. Dari mana teks JSON di kolom pratinjau itu datang?</summary>",
  "Dari jawaban layanan yang beralamat di kolom itu. Server Rekeningo mengunduh alamat tersebut, dan jawabannya bukan gambar melainkan teks JSON dari layanan lain. Teks itu lalu ikut dikirim kembali ke merchant (dibaca dari kode di blok berikutnya, Tidak dijalankan).",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Merchant tidak mengirim JSON itu. Server Rekeningo yang mengambilnya dari alamat yang diisi merchant, lalu mengembalikannya.",
  "**Server yang mengunduh, bukan merchant.** Impor katalog menerima daftar produk, dan tiap produk punya field `gambar_url`. Di cerita daftar itu berasal dari file CSV, dan di kode lab daftar itu dikirim sebagai JSON. Server mengunduh tiap alamat untuk membuat pratinjau, lalu mengembalikan hasil tiap baris dengan dua kolom, `pratinjau` dan `galat` (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t4/internal/service/katalog_impor.go\" lines=\"27:32\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/service/katalog_impor.go baris 27 sampai 32 (hasil tiap baris: pratinjau dan galat)\" />",
  "**Kenapa ini masalah.** Alamat itu diisi merchant, tetapi yang memintanya adalah server Rekeningo, dengan akses jaringan milik server. Merchant luar tidak punya akses ke jaringan dalam, yaitu jaringan tempat service Rekeningo saling memanggil. Server punya. Masalah seperti ini disebut SSRF (server-side request forgery): aplikasi dipakai untuk menghubungi alamat yang dipilih pihak luar.",
  "OWASP memakai contoh serupa, yaitu user yang mengisi URL gambar avatarnya untuk diunduh aplikasi ([OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), dibuka 2026-10-30, Tidak dijalankan). Di cerita, pihak yang mencoba adalah merchant luar yang mengisi `gambar_url` dengan nama layanan penyimpanan objek di jaringan dalam (Ilustrasi). Penyimpanan objek dibahas di [[t4-storage]]. Konsep dan keputusannya ada di [[t4-ssrf]].",
  "**Empat kelemahan versi pertama.** Versi pertama bernama `Rentan` di kode lab. Keempat kelemahan ini dibaca dari kode (Tidak dijalankan: dibaca dari kode):",
  "1. Pemeriksaan alamat hanya mencocokkan teks: fungsi mencari dua teks, `localhost` dan `127.0.0.1`, di dalam URL.",
  "2. Alamat hasil resolusi tidak diperiksa. Resolusi DNS adalah proses mengubah nama di URL menjadi alamat IP, dan jawabannya langsung dipakai.",
  "3. Redirect diikuti. Redirect adalah jawaban server yang menyuruh client pindah ke alamat lain.",
  "4. Untuk jawaban yang bukan gambar atau berstatus bukan 200, pesan kesalahan memuat 200 byte pertama isinya. Pesan itu dikembalikan ke merchant.",
  "Butir 1 adalah deny-list, yaitu daftar yang dilarang. Alamat yang sama bisa ditulis dengan cara lain, dan nama yang diselesaikan ke alamat dalam tidak memuat dua teks itu. OWASP menulis bahwa deny-list mudah dilewati dan hanya pilihan terakhir (Tidak dijalankan: dibaca dari sumber). Bentuk penulisan yang lolos bergantung pada resolver platform, yaitu bagian sistem yang mengubah nama menjadi alamat, jadi halaman ini tidak mencatatnya.",
  "<Snippet file=\"labs/api-t4/internal/unduh/unduh.go\" lines=\"279:281\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/unduh/unduh.go baris 279 sampai 281 (pemeriksaan hanya teks)\" />",
  "Butir 3 datang dari client bawaan. Dokumentasi Go menulis bahwa tanpa `CheckRedirect` client berhenti sesudah 10 request beruntun ([net/http, Client](https://pkg.go.dev/net/http#Client), go1.27.3, dibuka 2026-10-30, Tidak dijalankan). OWASP menyarankan redirect dimatikan di client. Pemeriksaan teks hanya melihat URL pertama, jadi alamat luar yang menjawab redirect ke alamat dalam tidak diperiksa lagi.",
  "<Snippet file=\"labs/api-t4/internal/unduh/unduh.go\" lines=\"289:289\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/unduh/unduh.go baris 289 (client bawaan: redirect diikuti)\" />",
  "Butir 4 menjawab kenapa isi layanan dalam sampai ke merchant:",
  "<Snippet file=\"labs/api-t4/internal/unduh/unduh.go\" lines=\"299:306\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/unduh/unduh.go baris 299 sampai 306 (isi respons ikut di pesan galat)\" />",
  "Pesan itu disimpan di kolom `galat`, bukan `pratinjau`, karena `pratinjau` hanya terisi bila unduhan berhasil:",
  "<Snippet file=\"labs/api-t4/internal/service/katalog_impor.go\" lines=\"124:130\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/service/katalog_impor.go baris 124 sampai 130 (pesan galat disimpan di kolom galat)\" />",
  "Jadi \"kolom pratinjau\" di cerita adalah Ilustrasi, dan di kode lab teks itu ada di kolom `galat`. Dua tes unit `api-t4` menjaga butir 3 dan butir 4, dan keduanya tercatat lulus. Hanya nama tes dan hasilnya yang tercatat, tanpa rekaman tingkat endpoint (Rekaman lab api-t4, tidak dijalankan ulang di lab ini):",
  "<Snippet file=\"labs/api-t4/output/testing.txt\" lines=\"491:492\" title=\"Rekaman lab: labs/api-t4/output/testing.txt baris 491 sampai 492 (tes butir 4 dan butir 3, lulus)\" />",
  "**Yang direkam: sisi pembela.** Lab `t4-ssrf` hanya menjalankan versi aman dari fetcher, yaitu fungsi yang mengunduh gambar dari URL. Menjalankan versi pertama terhadap layanan tiruan di jaringan container Tidak dijalankan di lab ini, karena lingkup lab dipersempit ke verifikasi sisi pembela.",
  "*Kondisi rekaman:* go1.27.1, tanpa database, dan server uji hanya di 127.0.0.1 di dalam proses tes. Alamat contoh di rekaman adalah angka karangan lab.",
  "**Alamat.** Alamat terlarang adalah alamat yang tidak boleh menjadi tujuan unduhan, misalnya alamat mesin itu sendiri (loopback) dan alamat jaringan internal (private). Rekaman menguji 32 alamat contoh, dan versi aman menolak 32 dari 32.",
  "Tiga di antaranya ditandai `IsPrivate`, yaitu satu dari empat penanda bawaan Go di tabel rekaman. Bila hanya penanda itu yang diperiksa, 29 alamat lolos. Itu Hitungan, yaitu angka dari angka lain di rekaman: 32 − 3 = 29, dan rekaman mencetak 29 juga:",
  "<Snippet file=\"labs/t4-ssrf/output/alamat.txt\" lines=\"44:45\" title=\"Rekaman lab: labs/t4-ssrf/output/alamat.txt baris 44 sampai 45 (alamat terlarang dan yang lolos bila IsPrivate saja)\" />",
  "**Redirect.** Di tujuh kode redirect, server pertama tersentuh satu kali dan server tujuan redirect nol kali:",
  "<Snippet file=\"labs/t4-ssrf/output/batas.txt\" lines=\"12:18\" title=\"Rekaman lab: labs/t4-ssrf/output/batas.txt baris 12 sampai 18 (redirect tidak diikuti)\" />",
  "**Pesan galat.** Isi JSON dari server uji tidak ikut ke pesan versi aman. Delapan penolakan karena alamat literal memakai satu pesan yang sama:",
  "<Snippet file=\"labs/t4-ssrf/output/batas.txt\" lines=\"122:126\" title=\"Rekaman lab: labs/t4-ssrf/output/batas.txt baris 122 sampai 126 (pesan galat tanpa isi respons)\" />",
  "<Rantai data={pratinjauJson} />",
  "**Yang tidak direkam.**",
  "- Versi pertama terhadap layanan tiruan di jaringan container Tidak dijalankan. Yang ada hanya tes unit `api-t4`, tanpa rekaman tingkat endpoint.",
  "- Layar Ratih, nama toko, kata `penyimpanan-internal`, dan temuan Laras hanya ada di cerita (Ilustrasi).",
  "- Perilaku di cloud sungguhan, layanan terkelola, dan alamat layanan metadata cloud Tidak dijalankan, dan alamat itu tidak ditulis sebagai tujuan.",
  "- Pesan galat versi aman tidak memuat isi respons, tetapi membedakan nama yang ada dari nama yang tidak ada (`batas.txt`, bagian terakhir; belum diperbaiki di lab).",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `alamat.txt` dan `batas.txt`, dengan satu varian dari `alamat.txt`. Tebak dulu pesan yang diterima merchant, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m36.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: pemeriksaan alamat hanya memakai IsPrivate**. Daftar alamat terlarang yang ditulis fetcher menolak 32 dari 32. Bila `IsPrivate` satu-satunya pemeriksaan, 29 lolos. Bila hanya empat penanda bawaan Go yang diperiksa, 26 lolos (Rekaman lab, `alamat.txt`).",
  "Batasnya: tabel itu memuat alamat contoh, bukan semua alamat yang mungkin. Kenapa satu pemeriksaan tidak cukup dibahas di [[t4-ssrf]].",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: jawaban 200 yang bukan gambar dijawab \"bukan gambar\", dan tujuan redirect tersentuh nol kali.",
  "Bila hanya `IsPrivate` yang diperiksa, 29 dari 32 alamat terlarang lolos. Rekaman alamat ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman alamat (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t4-ssrf/output/alamat.txt\" lines=\"44:45\" title=\"Rekaman lab: labs/t4-ssrf/output/alamat.txt baris 44 sampai 45 (varian: hanya IsPrivate)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-ssrf]]: SSRF, alamat tujuan yang diperiksa saat server menghubunginya, dan batas unduhan. Keputusannya ADR 41.",
  "Di M36 server sudah mengunduh gambar dengan akses jaringan dalam. Yang kurang adalah batas pada alamat tujuan, pada redirect, dan pada isi pesan kesalahan.",
  "### Cek diri",
  "**1.** Kolom `gambar_url` hanya berisi alamat. Kenapa teks JSON dari layanan lain bisa sampai ke merchant?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Server mengunduh alamat itu dengan akses jaringannya sendiri. Untuk jawaban yang bukan gambar, versi pertama menaruh 200 byte pertama isinya di pesan kesalahan. Pesan itu dikembalikan ke merchant di kolom `galat` (dibaca dari kode, Tidak dijalankan).",
  "</details>",
  "**2.** Versi aman menolak 32 dari 32 alamat terlarang. Kenapa pemeriksaan `IsPrivate` saja tidak cukup?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Hanya tiga dari 32 alamat itu ditandai private, jadi 29 lolos bila hanya `IsPrivate` yang diperiksa (`alamat.txt`).",
  "</details>",
  "**3.** Alamat luar menjawab redirect ke alamat lain. Apa yang direkam di versi aman, dan apa yang dilakukan client bawaan?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Versi aman menolak redirect, dan server tujuan redirect tersentuh nol kali di tujuh kode (`batas.txt`). Client bawaan Go mengikuti redirect sampai 10 request beruntun (dokumentasi, Tidak dijalankan).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />"
];
