// Nilai penjaga halaman 4.16, dibangkitkan dari m34-verifikasi-ditolak.mdx, diagram, skenario, dan baris riset oleh
// tmp/m34/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "0c40dc3689a71999",
  riset: ["4a9a582dcee61123","a52c3cef510eecc1","f32a368401494e53"],
  diagram: "d72e706d587df75c",
  skenario: "96b2c37fc4de4da0",
  istilah: "cf8b330f01cd9b45",
  glosarium: "7c65d3f43ad1a1b6",
};

// Nilai terpisah dari kalimat terkunci: tiga baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R4-185 | Arti 403 dan kelas 4xx (dibuka untuk halaman 4.16) | RFC 9110 HTTP Semantics (Juni 2022, rfc-editor.org/rfc/rfc9110, bagian 15.5 dan 15.5.4, dibuka 2026-10-30): \"The 4xx (Client Error) class of status code indicates that the client seems to have erred.\"; \"The 403 (Forbidden) status code indicates that the server understood the request but refuses to fulfill it.\"; bagian yang sama menulis bahwa permintaan bisa dilarang karena alasan yang tidak terkait kredensial | 4.16 (Tebak dulu: 403 berarti server memahami permintaan dan menolak memenuhinya; ADR 36 menghitung jawaban 4xx sukses) | Tidak berubah |",
  "| R4-186 | State OpenTofu memuat atribut sumber daya dan state lokal berupa teks biasa (dibuka untuk halaman 4.16) | OpenTofu documentation v1.13.x, \"Sensitive Data in State\" (opentofu.org/docs/language/state/sensitive-data/, dibuka 2026-10-30): \"The state contains resource IDs and all resource attributes. For resources such as databases, this may contain initial passwords.\"; \"When using local state, state is stored in plain-text JSON files.\"; state jarak jauh hanya di memori saat dipakai dan boleh dienkripsi at rest tergantung backend | 4.16 (state IaC memuat secret; rekaman `state.txt` bagian A sampai C membuktikan mekanismenya untuk `random_password`, variabel, dan data source `local`) | Tidak berubah (README lab mencatat dibuka 2026-10-27; dibuka ulang 2026-10-30) |",
  "| R4-187 | Rekaman dan kode lab t4-infra dan t3-mitm untuk M34 (dibaca untuk halaman 4.16, tanpa menjalankan ulang) | `labs/t4-infra/output/alamat.txt` bagian A (host lama terdaftar: tiga pendaftar lulus; host baru beralamat berbeda: 15 penolakan 403 dari tiga pekerjaan, tiga pengajuan `gagal`, vendor menjawab), bagian B (proxy keluar: enam permintaan diterima dari satu alamat, tanpa penolakan) dan bagian C (aturan ADR 36: delapan pekerjaan, 40 penolakan, delapan `gagal`, tanpa perpindahan status; bawaan pustaka: terbuka sesudah enam penolakan, tujuh lulus dan satu `gagal` sesudah alamat didaftarkan; Timeout breaker 3 detik); `state.txt` A sampai C; `staging.txt` B; kode `labs/api-t4/cmd/tiruan/main.go` dan `alamat.go`, `internal/verifikasi/verifikasi.go`, `internal/lajur/lajur.go`; `labs/t3-mitm/output/pin.txt` bagian C (Tahap 3: app dengan pin A dan B ditolak saat server memakai kunci C); kepala rekaman: PostgreSQL 17.11, go1.27.1, pgx v5.11.0, OpenTofu v1.13.2 | 4.16 | Tidak berubah |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t4-m34-alamat-berubah"
 ],
 [
  ".judul",
  "Alamat host berubah, vendor menolak, breaker tidak menyelesaikan"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t4-infra · alamat.txt bagian A dan C"
 ],
 [
  ".baris[0].label",
  "Sesudah pindahan"
 ],
 [
  ".baris[0].sub",
  "bagian A, tanpa breaker"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Host baru menyala"
 ],
 [
  ".baris[0].simpul[0].sub",
  "alamat beda dari host lama"
 ],
 [
  ".baris[0].simpul[1].teks",
  "Tiga pendaftar mengajukan"
 ],
 [
  ".baris[0].simpul[1].sub",
  "tiga pekerjaan"
 ],
 [
  ".baris[0].simpul[2].teks",
  "403 di tiap percobaan"
 ],
 [
  ".baris[0].simpul[2].sub",
  "15 = 3 × 5"
 ],
 [
  ".baris[0].simpul[2].nada",
  "warn"
 ],
 [
  ".baris[0].simpul[3].teks",
  "Tiga pengajuan gagal"
 ],
 [
  ".baris[0].simpul[3].sub",
  "vendor menjawab"
 ],
 [
  ".baris[0].simpul[3].nada",
  "warn"
 ],
 [
  ".baris[1].label",
  "Yang dilakukan breaker"
 ],
 [
  ".baris[1].sub",
  "bagian C, delapan pekerjaan"
 ],
 [
  ".baris[1].simpul[0].teks",
  "Aturan ADR 36"
 ],
 [
  ".baris[1].simpul[0].sub",
  "403 dihitung sukses"
 ],
 [
  ".baris[1].simpul[1].teks",
  "Tidak pernah terbuka"
 ],
 [
  ".baris[1].simpul[1].sub",
  "40 penolakan, 8 gagal"
 ],
 [
  ".baris[1].simpul[1].nada",
  "warn"
 ],
 [
  ".baris[1].simpul[2].teks",
  "Aturan bawaan pustaka"
 ],
 [
  ".baris[1].simpul[2].sub",
  "403 dihitung gagal"
 ],
 [
  ".baris[1].simpul[3].teks",
  "Terbuka sesudah enam penolakan"
 ],
 [
  ".baris[1].simpul[3].sub",
  "7 menunggu, 1 gagal"
 ],
 [
  ".baris[1].simpul[4].teks",
  "Alamat didaftarkan"
 ],
 [
  ".baris[1].simpul[4].sub",
  "7 lulus, 1 gagal"
 ],
 [
  ".baris[1].simpul[4].nada",
  "good"
 ],
 [
  ".catatan",
  "Alamat host di lab adalah alamat container Docker, bukan alamat akun cloud. Kotak oranye adalah akibat yang direkam."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Pindahan host: vendor menolak alamat baru"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/t4-infra/output/alamat.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/t4-infra/output/alamat.txt"
 ],
 [
  ".sumber.catatan",
  "Lab t4-infra, PostgreSQL 17.11, dari database bersih (make -C labs/t4-infra run BAGIAN=alamat). Jalur utama: bagian A (tanpa proxy, tanpa breaker) dan bagian C (breaker per lajur). Alamat host adalah alamat container Docker di satu jaringan lab, bukan alamat akun cloud. Pendaftaran alamat di vendor tiruan seketika; dua hari kerja di cerita adalah Asumsi. Ubah satu hal: bagian B, permintaan keluar lewat proxy keluar bertetap. Baris diawali tanda pagar atau panah diringkas dari rekaman yang sama, bukan baris log."
 ],
 [
  ".pengantar",
  "Rekeningo pindah host, dan layanan verifikasi hanya menerima alamat yang didaftarkan. Tebak dulu apa yang dijawab layanan itu, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "host"
 ],
 [
  ".komponen[0].label",
  "Host aplikasi"
 ],
 [
  ".komponen[1].id",
  "brk"
 ],
 [
  ".komponen[1].label",
  "Breaker lajur verifikasi"
 ],
 [
  ".komponen[2].id",
  "vnd"
 ],
 [
  ".komponen[2].label",
  "Layanan verifikasi (tiruan)"
 ],
 [
  ".komponen[3].id",
  "prx"
 ],
 [
  ".komponen[3].label",
  "Proxy keluar"
 ],
 [
  ".predict.q",
  "Host aplikasi pindah ke alamat baru. Layanan verifikasi hanya menerima alamat yang didaftarkan, dan alamat host baru belum didaftarkan. Apa jawaban layanan atas permintaan host baru?"
 ],
 [
  ".predict.options[0]",
  "Timeout: layanan tidak menjawab sampai batas 3 detik"
 ],
 [
  ".predict.options[1]",
  "503: layanan sedang mati, seperti M31"
 ],
 [
  ".predict.options[2]",
  "403: layanan menjawab, tetapi menolak alamat sumber host baru"
 ],
 [
  ".predict.options[3]",
  "200 dengan status ditolak: layanan menilai foto pendaftar buram"
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
  "Layanan memeriksa alamat sumber koneksi, bukan isi permintaan dan bukan foto. Alamat host baru tidak ada di daftar, jadi tiap permintaan dijawab 403. Rekaman alamat.txt bagian A: ditolak 403 per alamat sumber {'host baru': 15}."
 ],
 [
  ".langkah[0].dari",
  "host"
 ],
 [
  ".langkah[0].ke",
  "vnd"
 ],
 [
  ".langkah[0].judul",
  "Sebelum pindahan: host lama terdaftar, tiga pendaftar lulus"
 ],
 [
  ".langkah[0].kirim",
  "daftar alamat di vendor: host lama\nditerima, per alamat sumber yang dilihat vendor: {'host lama': 3}\nditolak 403, per alamat sumber: (tidak ada)\nverifikasi: lulus 3"
 ],
 [
  ".langkah[0].jelas",
  "Vendor menerima alamat host lama karena sudah didaftarkan. Tiga pekerjaan lulus dengan satu percobaan tiap pekerjaan."
 ],
 [
  ".langkah[1].dari",
  "host"
 ],
 [
  ".langkah[1].judul",
  "Akhir pekan: host baru menyala, host lama dimatikan"
 ],
 [
  ".langkah[1].kirim",
  "# alamat host baru berbeda dari alamat host lama: ya\n# host lama dimatikan. Senin pagi tiga pendaftar baru mengajukan verifikasi"
 ],
 [
  ".langkah[1].jelas",
  "Host baru dinyalakan sebelum host lama dimatikan, dan lab memeriksa bahwa alamatnya berbeda. Tidak ada yang mendaftarkan alamat host baru di vendor."
 ],
 [
  ".langkah[2].dari",
  "host"
 ],
 [
  ".langkah[2].ke",
  "vnd"
 ],
 [
  ".langkah[2].judul",
  "Senin: tiap percobaan dijawab 403"
 ],
 [
  ".langkah[2].kirim",
  "daftar alamat di vendor: host lama\nditerima, per alamat sumber yang dilihat vendor: {'host lama': 3}\nditolak 403, per alamat sumber: {'host baru': 15}"
 ],
 [
  ".langkah[2].jelas",
  "Tiga pekerjaan dikali lima percobaan menghasilkan 15 penolakan. Vendor menjawab setiap permintaan, jadi penyebabnya alamat sumber, bukan vendor yang mati."
 ],
 [
  ".langkah[2].nada",
  "warn"
 ],
 [
  ".langkah[3].dari",
  "host"
 ],
 [
  ".langkah[3].judul",
  "Lima percobaan habis, tiga pengajuan gagal"
 ],
 [
  ".langkah[3].kirim",
  "verifikasi: gagal 3 (tingkat belum)\noutbox verifikasi: mati 3 (5 percobaan)"
 ],
 [
  ".langkah[3].jelas",
  "Worker mengulang jawaban 403 sampai batas lima percobaan (ADR 25). Status ketiga pengajuan menjadi gagal."
 ],
 [
  ".langkah[3].nada",
  "warn"
 ],
 [
  ".langkah[4].dari",
  "brk"
 ],
 [
  ".langkah[4].judul",
  "Breaker dengan aturan ADR 36 tidak terbuka"
 ],
 [
  ".langkah[4].kirim",
  "delapan pekerjaan, 4xx dihitung sukses:\nditolak 403, per alamat sumber: {'host baru': 40}\nverifikasi: gagal 8; outbox: mati 8 (5 percobaan)\n# breaker tidak pernah terbuka"
 ],
 [
  ".langkah[4].jelas",
  "403 adalah jawaban 4xx, dan aturan ADR 36 menghitungnya sukses. Delapan pekerjaan dikali lima percobaan menghabiskan 40 percobaan."
 ],
 [
  ".langkah[4].nada",
  "warn"
 ],
 [
  ".langkah[5].dari",
  "brk"
 ],
 [
  ".langkah[5].ke",
  "vnd"
 ],
 [
  ".langkah[5].judul",
  "Aturan bawaan pustaka: breaker terbuka sesudah enam penolakan"
 ],
 [
  ".langkah[5].kirim",
  "delapan pekerjaan, 4xx dihitung gagal:\nditolak 403, per alamat sumber: {'host baru': 6}\nverifikasi: diajukan 7, gagal 1; outbox: menunggu 7, mati 1\nlog breaker: closed -> open"
 ],
 [
  ".langkah[5].jelas",
  "Tujuh pekerjaan menunggu dan vendor tidak dihubungi lagi. Dengan satu slot, satu pekerjaan sudah mati, karena ambang breaker 6 lebih tinggi daripada batas lima percobaan."
 ],
 [
  ".langkah[6].dari",
  "vnd"
 ],
 [
  ".langkah[6].ke",
  "host"
 ],
 [
  ".langkah[6].judul",
  "Alamat host baru didaftarkan: lajur pulih, satu pekerjaan tidak"
 ],
 [
  ".langkah[6].kirim",
  "daftar alamat di vendor: host baru\nverifikasi: lulus 7, gagal 1\nlog breaker: open -> half-open, half-open -> closed"
 ],
 [
  ".langkah[6].jelas",
  "Sesudah Timeout breaker (3 detik di lab) satu permintaan percobaan lulus, dan breaker menutup. Tujuh dari delapan pekerjaan lulus. Pekerjaan yang sudah mati tetap gagal, karena tidak ada yang mengantrekannya ulang."
 ],
 [
  ".langkah[6].nada",
  "good"
 ],
 [
  ".varian.label",
  "permintaan keluar lewat proxy keluar bertetap"
 ],
 [
  ".varian.mulai",
  0
 ],
 [
  ".varian.langkah[0].dari",
  "host"
 ],
 [
  ".varian.langkah[0].ke",
  "prx"
 ],
 [
  ".varian.langkah[0].judul",
  "Sebelum pindahan: yang didaftarkan adalah alamat proxy"
 ],
 [
  ".varian.langkah[0].kirim",
  "daftar alamat di vendor: proxy keluar\nditerima, per alamat sumber yang dilihat vendor: {'proxy keluar': 3}\nditolak 403, per alamat sumber: (tidak ada)\nverifikasi: lulus 3"
 ],
 [
  ".varian.langkah[0].jelas",
  "Host lama memakai proxy lewat variabel lingkungan HTTP_PROXY, tanpa perubahan kode aplikasi. Vendor hanya melihat alamat proxy."
 ],
 [
  ".varian.langkah[1].dari",
  "host"
 ],
 [
  ".varian.langkah[1].judul",
  "Akhir pekan: host baru memakai proxy yang sama"
 ],
 [
  ".varian.langkah[1].kirim",
  "# tiga alamat berbeda satu sama lain (host lama, host baru, proxy): ya"
 ],
 [
  ".varian.langkah[1].jelas",
  "Host baru dinyalakan dengan HTTP_PROXY yang sama, dan host lama dimatikan. Alamat host baru tidak pernah didaftarkan."
 ],
 [
  ".varian.langkah[2].dari",
  "prx"
 ],
 [
  ".varian.langkah[2].ke",
  "vnd"
 ],
 [
  ".varian.langkah[2].judul",
  "Senin: tiga pendaftar lulus lagi"
 ],
 [
  ".varian.langkah[2].kirim",
  "verifikasi: lulus 3\nditerima, per alamat sumber yang dilihat vendor: {'proxy keluar': 6}\nditolak 403, per alamat sumber: (tidak ada)"
 ],
 [
  ".varian.langkah[2].jelas",
  "Enam permintaan diterima dari satu alamat, dan tidak ada yang ditolak. Alamat host baru tidak pernah sampai ke vendor."
 ],
 [
  ".varian.langkah[2].nada",
  "good"
 ],
 [
  ".varian.langkah[3].dari",
  "prx"
 ],
 [
  ".varian.langkah[3].judul",
  "Batasnya: proxy menjadi titik gagal tunggal baru"
 ],
 [
  ".varian.langkah[3].kirim",
  "# alamat proxy hanya tetap selama proxy itu sendiri tidak dipindah\n# NAT dengan IP tetap di cloud: Tidak dijalankan"
 ],
 [
  ".varian.langkah[3].jelas",
  "Vendor tidak perlu didaftari lagi saat host berpindah, selama proxy tetap di alamat yang sama. Lab tidak merekam matinya proxy."
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
 "sesudah:1 Senin:1 pertama:1 gagal:1",
 "Laras:1 bukan:1 gagal:1 403:1 vendor:1",
 "Laras:1 bukan:1 Rekaman lab:1 Tidak dijalankan:1 Ilustrasi:2 Asumsi:2 Hitungan:1 lab:1",
 "",
 "Raka:1",
 "sama:1 Raka:1 gagal:1 mati:1 vendor:1",
 "tidak:1 lima:1 ADR 36:1 vendor:1 breaker:2",
 "",
 "bukan:2 setiap:1 403:1 vendor:1",
 "bukan:2 Rekaman lab:1 Tidak dijalankan:1 ditolak:2 403:2 mati:1 alamat:1 vendor:2 lab:1",
 "",
 "",
 "",
 "ditolak:1 alamat:1",
 "satu:1 dua:1 Asumsi:1 403:1 allowlist:1 alamat:3",
 "sebelum:1 bukan:1 Tidak dijalankan:1 403:1 alamat:1 lab:1",
 "tidak:1 403:1 alamat:1 lab:1",
 "sebelum:1 bukan:1 alamat:1 host:3 lab:3",
 "tiga:1 lulus:1 pindahan:1",
 "sebelum:1 Rekaman lab:1 alamat:2 pindahan:1 lab:1",
 "alamat:1 host:1 pindahan:1",
 "Rekaman lab:1 alamat:3 host:1 lab:1",
 "sesudah:1 Rekaman lab:1 403:1 alamat:2 pindahan:1 lab:1",
 "tidak:2 sebelum:1 tiga:1 lima:1 mati:1 ADR 25:1 host:1 pindahan:1",
 "",
 "tidak:2 tetap:1 sama:1 sebelum:1 satu:3 delapan:2 gagal:1 terbuka:2 ADR 36:2 breaker:3 pindahan:1",
 "tidak:1 Rekaman lab:1 terbuka:1 ADR 36:1 alamat:2 breaker:1 lab:1",
 "tidak:1 satu:1 setiap:1 Tidak dijalankan:1 403:1 4xx:3 sukses:2 ADR 36:1 vendor:1 breaker:2 lab:1",
 "4xx:1 vendor:1 lab:1",
 "sukses:1 lab:1",
 "sama:1 sesudah:1 satu:1 enam:1 gagal:1 403:1 terbuka:1 menunggu:1 mati:1 bawaan:1",
 "Rekaman lab:1 terbuka:1 alamat:2 breaker:1 bawaan:1 lab:1",
 "tidak:1 sesudah:1 alamat:1 host:1",
 "Rekaman lab:1 alamat:3 lab:1",
 "",
 "tujuh:1 delapan:1 bukan:1 menunggu:1 mati:2 ADR 36:1 bawaan:1",
 "tidak:1 tetap:1 satu:1 dua:1 Tidak dijalankan:1 Asumsi:1 menunggu:1 mati:1 alamat:1 lab:1",
 "tidak:2 tetap:2 sebelum:1 satu:2 lima:1 pertama:1 Tidak dijalankan:1 gagal:1 terbuka:1 mati:3 vendor:1 breaker:2",
 "tidak:1 belum:2 tetap:1 bukan:1 gagal:1 403:3 sukses:1 menunggu:1 mati:1 401:3 408:1 429:1 ADR 36:1 alamat:1 lab:1",
 "sama:1 sesudah:1 tiga:1 Ilustrasi:1 pindahan:1 lab:1",
 "state:1 secret:1",
 "semua:1 Tidak dijalankan:1 state:2",
 "tidak:1 hanya:1 satu:1 Rekaman lab:1 state:2 secret:1 alamat:1 lab:1",
 "hanya:1 Tidak dijalankan:1",
 "tidak:1 hanya:1 dua:2 Rekaman lab:1 secret:1 lab:1",
 "tidak:1 sebelum:1 satu:1 ADR 31:1 lab:1",
 "bukan:1 Rekaman lab:1 vendor:1 lab:1",
 "tidak:1",
 "Tidak dijalankan:1 alamat:2",
 "hanya:2 dua:1 Laras:1 Senin:1 Ilustrasi:1 Asumsi:1 gagal:2",
 "tidak:1 Tidak dijalankan:1 403:1 alamat:1 vendor:1 lab:1",
 "",
 "",
 "satu:1 alamat:1 host:1 vendor:1",
 "",
 "tidak:1 satu:2 enam:1 tanpa:1 selalu:1 Rekaman lab:1 proxy:3 alamat:3 host:1 vendor:2 pindahan:1 lab:1",
 "tidak:1 tetap:2 Tidak dijalankan:1 gagal:1 proxy:2 alamat:1 lab:1",
 "",
 "tidak:1 sesudah:1 satu:1 tiga:1 gagal:1 403:1 host:1 vendor:1 pindahan:1",
 "tidak:1 satu:2 enam:1 proxy:1 alamat:1 vendor:1",
 "",
 "",
 "tanpa:1",
 "tidak:1 Rekaman lab:1 proxy:1 alamat:3 host:1 vendor:1 lab:1",
 "",
 "",
 "",
 "tetap:1 tanpa:1 ADR 39:1 state:1 secret:2 alamat:1",
 "belum:1 403:1 401:1 breaker:1",
 "ADR 44:1",
 "sebelum:1 ADR 31:1",
 "tidak:2 sebelum:1 alamat:1 breaker:1",
 "",
 "tidak:1 ditolak:1 terbuka:1 ADR 36:1 vendor:1 breaker:1",
 "",
 "",
 "satu:1 delapan:1 tanpa:1 gagal:1 403:1 4xx:2 sukses:1 ADR 36:1 alamat:1 breaker:1",
 "",
 "tidak:1 mati:1 vendor:1",
 "",
 "",
 "belum:1 sebelum:1 tiga:1 setiap:1 403:1 alamat:2 host:3 pindahan:1",
 "",
 "tidak:1 sesudah:1 enam:1 terbuka:1 bawaan:1",
 "",
 "",
 "tetap:1 sesudah:1 satu:2 lima:1 tujuh:1 delapan:1 bukan:1 lulus:1 menunggu:1 mati:2 alamat:3",
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
  "import alamatBerubah from \"../../../../data/diagram/t4-m34-alamat-berubah.json\";",
  "<p class=\"meta\">Baca 8 menit · coba 3 menit · Prasyarat: [[t4-breaker]], [[t1-secret]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 8 Tahap 4. Senin pukul 07.50 menjadi hari kerja pertama sesudah Rekeningo dipindah ke infrastruktur PT pada akhir pekan. Semua pendaftar baru melihat \"Verifikasi gagal\".",
  "Pendaftar yang gagal mencoba lagi, rata-rata ±42 orang per jam. Log vendor menolak dengan 403. Laras, dari tim security, berkata: \"Ini bukan pemadaman.\"",
  "*Angka cerita (Ilustrasi):* hari, jam, dan kutipan Laras berasal dari cerita, bukan dari rekaman. Laju ±42 per jam berasal dari 1.000 pendaftar per hari ÷ 24 jam = 41,67. Itu Hitungan, yaitu angka yang dihitung dari angka lain di halaman, dan 1.000 per hari termasuk Asumsi. Arti Ilustrasi, Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Layar pendaftar sama dengan layar M31 di minggu 5 ([[t4-m31]]): \"Verifikasi gagal\". Raka menduga vendor mati lagi dan M31 terulang.",
  "Dugaan itu masuk akal. Pada M31 layanan verifikasi tidak menjawab, dan tiap pekerjaan menghabiskan lima percobaan. Sesudah M31, ADR 36 menambah breaker per vendor ([[t4-breaker]]). Apakah breaker itu ikut bekerja di M34, rekaman di blok berikutnya yang menjawab.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: vendor menjawab setiap permintaan dengan 403, bukan 503 dan bukan timeout. Apa yang ditolaknya?</summary>",
  "Yang ditolak bukan isi permintaan dan bukan vendor yang mati: yang ditolak pemanggilnya. RFC 9110 bagian 15.5.4 menulis bahwa 403 berarti server memahami permintaan dan menolak memenuhinya ([RFC 9110, 403 Forbidden](https://www.rfc-editor.org/rfc/rfc9110.html#name-403-forbidden), dibuka 2026-10-30, Tidak dijalankan). Akhir pekan itu Rekeningo berpindah tempat, jadi yang berubah adalah alamat IP yang dilihat vendor (Rekaman lab, bagian A di blok berikutnya).",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Vendor hidup dan menjawab. Yang ditolak adalah alamat tempat Rekeningo memanggilnya.",
  "**Alamat keluar.** Alamat keluar adalah alamat IP yang dilihat server tujuan saat service Rekeningo memanggilnya. Vendor di cerita memakai allowlist, yaitu daftar alamat yang boleh memanggilnya. Alamat di luar daftar dijawab 403, dan mendaftarkan satu alamat butuh dua hari kerja (Asumsi dari cerita).",
  "Layanan verifikasi tiruan di lab memeriksa alamat ujung koneksi TCP, bukan header. Ia menjawab 403 sebelum membaca isi permintaan (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t4/cmd/tiruan/main.go\" lines=\"475:478\" lang=\"go\" title=\"Kode lab: labs/api-t4/cmd/tiruan/main.go baris 475 sampai 478 (alamat tidak terdaftar dijawab 403)\" />",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan pgx v5.11.0, dari database bersih. Satu jaringan Docker lab memuat layanan verifikasi tiruan dan host aplikasi, yaitu worker `api-t4` yang dikompilasi untuk Linux. Pindahan diperankan dengan menyalakan host baru sebelum host lama dimatikan, dan lab memeriksa bahwa alamat keduanya berbeda. Alamat itu milik container di jaringan lab, bukan milik akun cloud.",
  "**Sebelum pindahan.** Host lama terdaftar, dan tiga pendaftar lulus:",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"19:23\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian A (sebelum pindahan)\" />",
  "**Sesudah pindahan.** Tidak ada yang mendaftarkan alamat host baru. Tiga pendaftar baru mengajukan verifikasi:",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"26:27\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian A (host baru, alamat berbeda)\" />",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"28:43\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian A (sesudah pindahan: 403 di tiap percobaan)\" />",
  "Tiga pekerjaan dikali lima percobaan menghasilkan 15 penolakan. Lima percobaan adalah batas ADR 25 ([[t3-at-least-once]]), dan worker mengulang jawaban yang tidak akan berubah. Vendor tidak mati: ia menjawab, dan sebelum pindahan ia meluluskan tiga pendaftar dari host lama.",
  "<Rantai data={alamatBerubah} />",
  "**Kenapa breaker tidak menolong.** Rekaman bagian C menjalankan pindahan yang sama untuk delapan pekerjaan dan satu slot worker, yaitu satu pekerjaan berjalan pada satu waktu. Breaker memakai aturan ADR 36 dan Timeout breaker 3 detik, yaitu lama breaker tetap terbuka sebelum mencoba lagi (ADR 36 memakai 60 detik). Breaker tidak pernah terbuka: 8 × 5 = 40 penolakan, dan delapan pengajuan berstatus `gagal`:",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"102:108\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian C (aturan ADR 36: breaker tidak terbuka)\" />",
  "Sebabnya satu aturan. ADR 36 menghitung jawaban 4xx sebagai sukses, supaya permintaan yang salah tidak membuka breaker ([[t4-breaker]]), dan 403 termasuk 4xx. Kode lab menandai setiap jawaban 4xx vendor sebagai penolakan, lalu breaker menghitung penolakan itu sukses (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t4/internal/verifikasi/verifikasi.go\" lines=\"84:86\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/verifikasi/verifikasi.go baris 84 sampai 86 (jawaban 4xx menjadi penolakan vendor)\" />",
  "<Snippet file=\"labs/api-t4/internal/lajur/lajur.go\" lines=\"60:63\" lang=\"go\" title=\"Kode lab: labs/api-t4/internal/lajur/lajur.go baris 60 sampai 63 (penolakan dihitung sukses)\" />",
  "Rekaman yang sama menjalankan pengaturan bawaan pustaka, yang menghitung 403 gagal. Breaker terbuka sesudah enam penolakan beruntun. Tujuh pekerjaan menunggu, dan satu pekerjaan sudah mati:",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"125:129\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian C (bawaan pustaka: breaker terbuka)\" />",
  "Terbuka tidak memperbaiki penyebabnya. Lajur pulih sesudah operator mendaftarkan alamat host baru:",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"146:151\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian C (alamat didaftarkan, lajur pulih)\" />",
  "Tiga hal terbaca dari rekaman itu:",
  "1. Breaker bawaan membuat tujuh pekerjaan menunggu, bukan mati. Aturan ADR 36 membuat delapan pekerjaan mati.",
  "2. Menunggu berlangsung sampai alamat didaftarkan. Di lab pendaftaran seketika. Di cerita butuh dua hari kerja (Asumsi), dan rekaman tidak menjalankan selama itu. Selama menunggu panjang, tiap permintaan percobaan di half-open memakai satu percobaan pekerjaan terdepan, jadi sebagian pekerjaan bisa tetap mati ([[t4-breaker]], Tidak dijalankan untuk M34).",
  "3. Dengan satu slot, satu pekerjaan tetap mati karena ambang breaker 6 lebih tinggi daripada batas lima percobaan, jadi pekerjaan pertama habis sebelum breaker terbuka. Pendaftarnya tetap gagal, dan tidak ada yang mengantrekannya ulang, seperti di M31. Di [[t4-breaker]], pada 4 slot dan vendor yang mati, tidak ada pekerjaan yang mati. M34 dengan 4 slot Tidak dijalankan.",
  "**Penilaian 401 dan 403 belum diputuskan.** ADR 36 menulis bahwa apakah 401, 403, 408, dan 429 dihitung netral belum diputuskan ([[t4-breaker]]). Lab mengusulkan 401 dan 403 dihitung gagal, dan 400 dan 422 tetap sukses (usul lab, bukan keputusan). Usul itu mengubah pekerjaan yang mati menjadi menunggu, tetapi tidak mendaftarkan alamat.",
  "**Tiga hal lain dari pindahan yang sama.** Pemeriksaan sesudah M34 menemukan tiga hal lain. Kejadian di Rekeningo berasal dari cerita (Ilustrasi), dan mekanismenya direkam lab bila disebut.",
  "**State IaC memuat secret.** IaC (infrastructure as code) mendeskripsikan infrastruktur dalam file yang dijalankan alat seperti OpenTofu. Alat itu mencatat sumber daya yang dibuatnya di state, yaitu file yang menyimpan atribut tiap sumber daya. Atribut itu bisa berisi password.",
  "Dokumentasi OpenTofu menulis bahwa state memuat semua atribut sumber daya. State lokal berupa file JSON teks biasa ([OpenTofu: Sensitive Data in State](https://opentofu.org/docs/language/state/sensitive-data/), versi 1.13.x, dibuka 2026-10-30, Tidak dijalankan).",
  "Lab merekam mekanismenya dengan OpenTofu v1.13.2. Password dari `random_password` dan kunci dari variabel yang dipakai satu resource masuk state, walau keluaran CLI menulis \"(sensitive value)\". Data source `local_sensitive_file` yang membaca file rahasia juga memasukkan isinya. Konfigurasi yang hanya menulis alamat dan path secret manager tidak memuat nilai (Rekaman lab, `state.txt` bagian A sampai C).",
  "Data source milik provider Vault atau OpenBao Tidak dijalankan [perlu verifikasi]. State Rekeningo sendiri hanya ada di cerita.",
  "**Staging memakai kunci gateway produksi.** Lab tidak merekam kejadian ini. Lab hanya merekam pemindai atas dua file contoh, yang menemukan dua kunci produksi (Rekaman lab, `staging.txt` bagian B). Pemisahan secret staging dan produksi ada di [[t4-infra-secret]], dan pemindaian di pipeline ada di [[t4-tim-infra]].",
  "**Pin ADR 31 harus ditinjau sebelum pindah.** Pindahan mengganti server tepi dan mungkin kunci TLS-nya (penalaran dari cerita, tidak dijalankan lab Tahap 4). App memakai pin SPKI, yaitu hash kunci publik server yang disimpan app, dengan satu cadangan ([[t3-tls-pinning]]).",
  "Di Tahap 3, app dengan pin A dan B menolak koneksi saat server memakai kunci C. App dengan pin B dan C terhubung (Rekaman lab, `labs/t3-mitm/output/pin.txt` bagian C). Di M34 penolakan datang dari vendor, bukan dari pin app.",
  "**Yang tidak direkam.**",
  "- Hosting terkelola, akun cloud PT, dan alamat IP publik nyata Tidak dijalankan. Alamat di rekaman adalah alamat container.",
  "- Layar \"Verifikasi gagal\", Senin 07.50, kutipan Laras, dan dua hari kerja pendaftaran hanya ada di cerita (Ilustrasi atau Asumsi). Rekaman hanya mencatat status `gagal` di database.",
  "- Perilaku vendor nyata atas alamat yang tidak terdaftar Tidak dijalankan. Jawaban 403 adalah pilihan tiruan lab.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `alamat.txt` bagian A dan C, dengan satu varian dari bagian B. Tebak dulu apa yang dijawab vendor atas permintaan host baru, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t4-m34.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: permintaan keluar lewat proxy keluar bertetap**. Proxy keluar adalah server perantara yang meneruskan panggilan keluar Rekeningo ke vendor, jadi vendor selalu melihat alamat proxy itu. Yang didaftarkan sekali adalah alamat proxy, dan pindahan host tidak mengubahnya: enam permintaan diterima dari satu alamat, tanpa penolakan (Rekaman lab, bagian B).",
  "Batasnya: proxy keluar menjadi titik gagal tunggal baru, dan lab tidak merekam matinya proxy. NAT dengan IP tetap di cloud, cara lain membuat alamat keluar tetap, Tidak dijalankan. Cara memilihnya ada di [[t4-infra-secret]].",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: sesudah pindahan, vendor menolak 15 percobaan dari host baru dengan 403, dan tiga pengajuan berstatus `gagal`.",
  "Bila permintaan keluar lewat proxy keluar bertetap, vendor menerima enam permintaan dari satu alamat dan tidak menolak satu pun. Rekaman bagian B ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman bagian B (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t4-infra/output/alamat.txt\" lines=\"80:86\" title=\"Rekaman lab: labs/t4-infra/output/alamat.txt, bagian B (proxy keluar: alamat host baru tidak sampai ke vendor)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t4-infra-secret]]: alamat keluar tetap, secret manager, dan IaC tanpa nilai secret di state. Keputusannya ADR 39.",
  "- [[t4-breaker]]: penilaian 401 dan 403 di breaker, yang belum diputuskan.",
  "- [[t4-tim-infra]]: pemindaian kunci produksi di pipeline. Keputusannya ADR 44.",
  "- [[t3-tls-pinning]]: pin ADR 31, yang dibaca ulang sebelum pindah.",
  "Di M34 breaker sudah ada dan tidak menyelesaikan masalah. Yang diperlukan sebelum pindah adalah alamat keluar yang tidak berubah atau sudah didaftarkan lebih dulu.",
  "### Cek diri",
  "**1.** Semua permintaan ke vendor ditolak, tetapi breaker ADR 36 tidak pernah terbuka. Kenapa?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "ADR 36 menghitung jawaban 4xx sebagai sukses, dan 403 termasuk 4xx. Delapan pekerjaan menghabiskan 8 × 5 = 40 penolakan dan delapan pengajuan berstatus `gagal`, tanpa satu pun perpindahan status breaker (`alamat.txt` bagian C).",
  "</details>",
  "**2.** Kenapa halaman ini tidak menyimpulkan bahwa vendor mati lagi?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Vendor menjawab setiap permintaan dari host baru dengan 403, dan sebelum pindahan ia meluluskan tiga pendaftar dari host lama. Yang berubah adalah alamat sumber host, yang belum didaftarkan (`alamat.txt` bagian A).",
  "</details>",
  "**3.** Breaker bawaan pustaka terbuka sesudah enam penolakan. Apa yang ia ubah dan apa yang tidak?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tujuh pekerjaan menunggu, bukan mati, dan tujuh dari delapan lulus sesudah alamat didaftarkan. Penyebabnya tetap sampai operator mendaftarkan alamat. Pada satu slot worker, satu pekerjaan sudah mati karena ambang 6 lebih tinggi daripada batas lima percobaan (`alamat.txt` bagian C).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
