---
name: visualisasi
description: Cara memecah konsep backend yang rumit (race condition, transaction, pool, replica, outbox, circuit breaker, enkripsi) menjadi potongan visual dan interaksi yang bisa dicerna, lalu memilih bentuknya: diagram statis, stepper, widget hands-on, simulasi, atau scrollytelling. Gunakan skill ini SETIAP KALI membuat atau mengubah widget, diagram, ilustrasi, layout halaman, atau saat halaman punya bagian "Lihat sendiri" / "Coba". Juga saat memutuskan apakah suatu konsep butuh visual sama sekali.
---

# Visualisasi Rekeningo Tech Journey

Tujuan: pembaca melihat mekanisme, bukan membaca deskripsi mekanisme. Setiap visual menjawab satu pertanyaan yang bisa ditulis sebagai judulnya.

## Dasar yang dipakai

Mayer: kata + gambar; potongan yang diatur pembaca; sinyal; teks dekat gambar; buang dekorasi. Explorable explanations: ubah satu hal, lihat akibatnya. Riset scrollytelling 2026: interaktif menang dalam keterlibatan dan kepatuhan, setara dalam pemahaman; jadi interaksi dipakai untuk mengunci, bukan menggantikan penjelasan.

## Langkah 1: pecah konsepnya dulu, sebelum memilih bentuk

Tulis di komentar sementara:
1. Pertanyaan yang dijawab visual ini (satu kalimat).
2. Aktor (≤ 4): mis. App Budi, API, PostgreSQL.
3. Langkah (≤ 10) dalam urutan waktu.
4. Satu "ubah satu hal" yang mengubah hasil.
5. Hasil yang bisa ditebak pembaca (≤ 4 pilihan).
Kalau salah satu tidak bisa ditulis, konsepnya belum siap divisualkan; kembali ke teks.

## Langkah 2: pilih bentuk dari tabel ini

| Kalau konsepnya... | Bentuk | Widget yang ada / dibuat |
| --- | --- | --- |
| Siapa mengerjakan apa (tanggung jawab) | Pilah kartu ke kelompok, lalu cek | pilah |
| Urutan kejadian antar komponen, dengan apa yang dilihat user | Stepper dengan kolom komponen dan mockup HP | alur |
| Dua cara dibandingkan untuk fitur yang sama | Dua arsitektur berdampingan, pilih fitur, simpul tersorot | banding |
| Perilaku SQL (constraint, transaction, index, plan) | Before/After yang benar-benar dijalankan di browser | runsql (PGlite) |
| Dua request bersamaan (race) | Replay rekaman dua client, tebak saldo akhir | race |
| Satu langkah netral → baris kode per stack | Stepper lintas stack | stackstep |
| Mekanisme berparameter (rate limit, pool, Little's Law, replica lag) | Simulasi dengan slider dan jam simulasi; pembaca mengubah satu parameter | ember; baru: pool, lag |
| Rumus dengan angka cerita | Kalkulator: geser input, lihat output dan kalimat kesimpulan | kalkulator |
| Menemukan kesalahan di kode | Tandai baris; umpan balik per baris | cari-bug |
| Invarian uang | Hitung total sebelum/sesudah | jumlah-total |
| Alur panjang (webhook, OAuth, outbox) yang butuh cerita | Scrollytelling: teks di kiri, diagram berubah saat scroll, maks 8 langkah | baru: scrolly |
| Struktur statis (arsitektur tahap, folder) | Diagram kotak-panah bertoken, ≤ 6 elemen | arsitektur, bb-flow |
| Adegan cerita | Ilustrasi SVG datar dari tools/ilustrasi_cerita.py | ilustrasi |

Animasi yang berjalan sendiri tidak dipakai. Semua gerak dipicu klik, scroll, atau slider; `prefers-reduced-motion` dihormati.

## Langkah 3: aturan yang dipaksakan

- Satu visual per blok "Coba". Halaman dengan empat widget dipecah jadi dua halaman.
- Visual pertama sesudah "Inti" utuh tanpa scroll di 375×667 (diperiksa `tools/layar.mjs`).
- Teks penjelas berada di samping atau di bawah elemen yang dijelaskan, bukan di paragraf jauh di atas.
- Warna lewat token (system/good/warn/old) dan lolos `contrast.py` di gelap dan terang. Tidak ada heksadesimal di komponen.
- Label widget adalah elemen DOM (bisa diterjemahkan browser), bukan teks dalam SVG, kecuali ilustrasi.
- Setiap widget punya chip sumber: Rekaman lab / Ilustrasi / Asumsi.
- Setiap widget punya "tebak dulu" sebelum hasil dan "ubah satu hal" sesudahnya.
- Keyboard: Tab mencapai semua kontrol dalam urutan baca, dan status hasil memakai role="status". Fokus terlihat dengan indikator ≥ 3:1 terhadap latar (WCAG 2.2 SC 2.4.7, 1.4.11) dan tidak tertutup penuh oleh header lengket (SC 2.4.11). Panel yang menimpa isi ditutup dengan Esc, lalu fokus kembali ke tombol yang membukanya (sumber: plan/RISET-SKILL.md 1).
- Kontrol memakai elemen asli (`<button>`, `<a href>`, `<details>`), bukan `<div>` dengan role. Kontrol buka-tutup dan pilihan memperbarui `aria-expanded`, `aria-pressed`, atau `aria-checked` setiap kali berubah (SC 4.1.2); buktinya `locator.ariaSnapshot()` Playwright sebelum dan sesudah satu klik.
- Target klik dan sentuh minimal 24×24 CSS px, atau berjarak sehingga lingkaran 24 px di tengahnya tidak menyentuh target lain (SC 2.5.8); tautan di dalam kalimat dikecualikan. Halaman tidak bergulir ke samping di lebar 320 CSS px (SC 1.4.10); diagram dan tabel data boleh digulir di dalam wadahnya sendiri.
- Widget runsql tentang index atau query plan memakai data yang cukup besar dan menulis jumlah barisnya: di tabel kecil planner benar memilih Seq Scan (PostgreSQL 18 §11.12), jadi data 100 baris tidak menunjukkan guna index.
- Data widget: JSON divalidasi Zod; logika murni di `.ts` tanpa DOM, dites Vitest.
- Tiap wilayah `role="status"` (hasil tebakan, ringkasan hasil) berisi satu kalimat ringkas yang memuat angka kunci yang berubah (SC 4.1.3). Bukan batang, tabel, dan empat angka sekaligus, dan bukan hanya satu dari beberapa angka penting. Alat ukur widget baru menghitung jumlah wilayah status dan panjang isinya (`ukur-pool.mjs`, `ukur-outbox.mjs`). Tahap 2: terlalu banyak di 2.20, 2.31, dan 2.33 (#322, #346, #353). Terlalu sedikit di 2.30, yang hanya menyebut jarak antar request (#341). Alat ukur widget outbox lolos palsu sampai pemeriksaan ini ada (#354).
- Sesudah klik, fokus tidak jatuh ke `<body>` atau `<astro-island>`. Tombol yang dilepas dari DOM kehilangan fokus, dan tombol `disabled` bisa memindahkannya ke `<body>` atau menahannya di tombol mati (#346 dan #353 mengukur berbeda). Pakai `aria-disabled`, atau pindahkan fokus ke hasil atau kontrol berikutnya, lalu ukur lewat `document.activeElement`. Bukti: widget Tebak, kalkulator, dan kartu 2.32 (#346, #351, #353).
- Tabel hasil widget diukur di 320 px (`scrollWidth` ≤ 320), bukan dilihat. Tabel yang melebihi wadahnya menggeser halaman (2.27: 327 lawan 320, keputusan 856, #335). Tanpa JavaScript, hasil ada di HTML (`<noscript>` atau dirender statis), dan tombol yang tidak berfungsi tanpa JS tidak ditampilkan (Tebak di 2.33 menampilkan tiga tombol mati, #353).
- Tabel Markdown di halaman punya jumlah kolom sama di header, baris pemisah, dan tiap baris. Bila beda, GFM menampilkannya sebagai teks biasa tanpa pesan galat. Hitung `<table>` di `dist` lawan jumlah tabel di MDX. 4.29 punya tabel "Kapan keputusan ini salah" dengan pemisah 4 kolom lawan header 5, dan ketahuan saat tabel di `dist` dihitung (4 dari 5 dirender, #463).
- Chip dan sel yang memuat angka berunit tidak terpecah di tengah: `white-space: nowrap` (`.bb-chip` memecah "−Rp15.000" di 375 px, #327). Satuan satu huruf ditulis lengkap ("byte", bukan "B"), karena `cek_id_tampil.py` membaca "B" dan "147" di dua node sebagai ID internal "B147" (#322).
- "Tebak dulu" hanya sah bila hasil di dalam widget tersembunyi sampai pembaca memilih. Lipatan `details` atau tab yang menampilkan hasil pertama tanpa pilihan bukan tebakan (2.24 dan 2.26 memakai TabSet; EVAL-2, Lampiran W5). Aturan ini tidak mengubah Inti hasil-dulu (kalimat, Rantai ringkas, dua paragraf), yang tetap desain pemilik.
- Posisi pilihan benar divariasikan antar widget, karena pola posisi bisa dikenali tanpa membaca soal. Di 12 tebakan alur dan runsql Tahap 2, enam jawaban benar ada di pilihan kedua, empat di ketiga, dua di pertama, dan tak satu pun di keempat. Dari enam tebakan berpilihan empat, tak satu pun benar di pilihan pertama atau keempat (hitungan atas `situs/public/widgets/data/t2-*.json` dan `skenario/t2-*.json`).
- Layar pertama diukur sebelum bagian lain ditulis: Dari `situs/`: `UKUR_HALAMAN=<berkas daftar path> node tools/layar.mjs --url <preview>` memakai ambang 20 px di 375×667. Tahap 3: 3.11 gagal 25 px (#376), 3.19 gagal 3 px (#391), 3.27 gagal 29 px (#406), dan 3.2 serta 3.15 tipis 12 px (#365, #383). Bila gagal, pendekkan kalimat Inti, judul Rantai, dan teks simpul. Jangan menambah baris. `layar.mjs` mencetak "tipis" dan exit 0, jadi margin 12 sampai 19 px lolos gerbang.
- Komponen atau CSS baru diuji di 320 px dengan font yang lebih lebar dari Satoshi (Playwright `addStyleTag` memasang Verdana), karena CI memakai font cadangan yang lebih lebar daripada Satoshi di laptop. Pemilih dan tabel ERD Tahap 4 meluap dengan font itu dan lolos di laptop (#419, `ukur-erd.mjs` bagian 6c).
- Teks di widget (tombol, pertanyaan Tebak, label garis waktu, catatan sumber) berasal dari klaim halaman yang sama dan dijaga tes turunan, bukan hanya pertanyaan dan label knob. 3.26 menulis "satu urutan waktu" di tombol dan Tebak, padahal halaman dan kode memakai urutan `id` (#404). Empat mutasi teks widget 3.10 lolos penjaga awal (#375).
- Jalur varian ("Ubah satu hal") tidak membuka jawaban tebakan jalur utama. Widget `alur` membukanya di akhir kedua jalur pada 23 skenario Tahap 1 sampai 3. Peninjau 3.18 melihat "Tebakanmu benar" sesudah langkah varian yang hasilnya lain (#389, #394). Uji di browser: pilih varian, buka langkah terakhir, baca teksnya.

## Tech stack visual (dicek ke registry saat dipakai)

| Kebutuhan | Pilihan | Alasan |
| --- | --- | --- |
| Komponen interaktif | React 19 + TypeScript sebagai Astro island | Keputusan PROPOSAL; hydrate hanya di halaman yang perlu |
| SQL live | PGlite (PostgreSQL WASM, < 3 MB gzip) | Planner dan constraint asli PostgreSQL; dimuat saat tombol pertama ditekan |
| Diagram statis | SVG/HTML bertoken yang ditulis sendiri atau dibuat skrip | Palet dan kontras terjaga; Mermaid tidak dipakai di halaman |
| Scrollytelling | IntersectionObserver + state React; tanpa library | Cukup untuk ≤ 8 langkah; hindari dependency besar |
| Animasi transisi kecil | CSS transition; Motion (motion.dev) hanya bila CSS tidak cukup [perlu verifikasi: versi] | Ringan |
| Grafik data (p95, RPS) | Observable Plot atau D3 untuk kasus khusus [perlu verifikasi: versi] | Standar, bertoken |
| Mockup HP | Komponen hp yang ada, dipindah ke React | Sudah terbukti |
| Tangkapan dan uji visual | Playwright, screenshot diff | Sudah di CI |

## Prosedur membuat widget baru

1. Tulis pemecahan konsep (Langkah 1) di plan/MEMORI.md.
2. Buat data JSON dan skema Zod dulu, lalu logika murni `.ts` + tes.
3. Baru komponen React. Tanpa teks hard-coded; semua dari JSON.
4. Tangkap layar 375 dan 1366, gelap dan terang. Lihat sendiri: apakah dalam 3 detik jelas apa yang harus diklik?
5. Uji "ubah satu hal": hasilnya harus berbeda dan perbedaannya terlihat tanpa membaca teks.

<examples>
<example>
Buruk: satu halaman race condition dengan animasi otomatis dua bola bergerak, tanpa tebakan, hasil akhir hanya di teks.
Baik: replay rekaman langkah demi langkah dengan tombol Berikutnya; tebakan saldo akhir sebelum mulai; empat cara (tanpa lock, FOR UPDATE, UPDATE atomik, optimistic) sebagai tab; chip "Rekaman lab b3-race".
</example>
<example>
Buruk: diagram arsitektur Tahap 5 dengan 14 kotak dan 20 panah.
Baik: lima zona (client, edge, service, data, operasi), ≤ 6 kotak per zona, komponen baru berwarna, komponen lama abu; detail per zona di halaman ADR-nya.
</example>
<example>
Buruk: kalimat "pool habis karena koneksi ditahan lama" tanpa visual.
Baik: simulasi pool 10 koneksi dengan slider "lama panggilan notifikasi" 0–2.000 ms; pembaca melihat antrean tumbuh saat W naik walau RPS tetap 17; kalimat kesimpulan berubah mengikuti angka.
</example>
</examples>
