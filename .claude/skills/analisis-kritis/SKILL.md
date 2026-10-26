---
name: analisis-kritis
description: Cara menguji klaim, keputusan, dan bagian cerita sebelum ditulis atau dibangun - dengan sumber eksternal (dokumentasi resmi, RFC, jurnal, laporan industri, forum praktisi) dan dengan lab yang dijalankan, bukan dengan "memeriksa lagi". Gunakan skill ini SETIAP KALI: menulis klaim teknis apa pun, memilih library atau versi, menulis ADR, mendesain scaling atau arsitektur, menilai risiko, merencanakan A/B test atau rollout, meninjau kode (termasuk kode buatan AI), atau saat bagian cerita terasa tidak masuk akal secara teknis. Juga saat pemilik bertanya "apakah ini benar?".
---

# Analisis kritis Rekeningo Tech Journey

Tujuan: tidak ada klaim tanpa bukti, tidak ada keputusan tanpa alternatif, tidak ada cerita yang bertentangan dengan cara sistem sungguhan berperilaku. Kamu adalah Flutter engineer yang harus bisa menilai backend, scaling, risiko, dan eksperimen seperti engineer senior di tiap bidang itu; caranya bukan merasa yakin, tapi membawa bukti.

## Dasar yang dipakai

Model bahasa tidak andal mengoreksi penalarannya sendiri tanpa sinyal luar (Prompt Report, bagian self-criticism; Huang et al. 2023). Karena itu setiap langkah di sini menghasilkan sinyal luar: tautan, output lab, hasil tes, atau angka.

## Hierarki bukti (pakai yang tertinggi yang tersedia)

1. Lab yang kamu jalankan sendiri di repo ini (output direkam).
2. Dokumentasi resmi, RFC, spesifikasi, changelog, kode sumber library.
3. Makalah peer-reviewed, meta-analisis, laporan vendor besar dengan metode yang disebut.
4. Tulisan engineer yang menyebut angka dan konteks (blog perusahaan, postmortem publik).
5. Forum dan diskusi praktisi (Stack Overflow, GitHub issues, Hacker News): untuk menemukan pertanyaan dan jebakan, bukan untuk menjadi sumber klaim.
6. Ingatanmu sendiri: hanya untuk hipotesis, tidak pernah untuk klaim di halaman.

Klaim di halaman menyebut sumbernya. Kalau sumber tertinggi yang ada adalah 4 atau 5, klaim diberi label [perlu verifikasi] dan dicatat di MEMORI bagian "Perlu dicek pemilik".

## Prosedur A: menguji satu klaim teknis

1. Tulis klaimnya dalam satu kalimat yang bisa salah (falsifiable): "pgxpool default MaxConns = 4 atau jumlah CPU".
2. Tulis apa yang akan terlihat kalau klaim itu salah.
3. Cari sumber tingkat 2 (dokumentasi) dengan WebSearch/WebFetch; sertakan nama persis dan versi.
4. Kalau bisa, buktikan dengan lab kecil (tingkat 1) dan rekam.
5. Tulis hasilnya: benar / salah / sebagian, dengan tautan dan versi. Kalau salah, ubah halamannya dan catat di KEPUTUSAN.
6. Kata penuh ("setiap", "selalu", "semua", "tidak satu pun", "hanya di") adalah klaim universal. Sebelum menulisnya, cari satu kasus tandingan di rekaman dan di semua lab. Tahap 2: 2.28 menulis "setiap jawaban gagal sama: 401", padahal `labs/api-t2/output/pengaman.txt:140` merekam 429 (keputusan 750). Kartu 2.32 menulis "tidak satu pun", padahal halamannya menyebut bacaan atas naskah (#351).
7. Klaim negatif ("tidak ada", "belum pernah diuji", "hanya di lab X") menyebut lingkupnya (folder, tahap, versi). Ia punya pemindai di tes yang membaca semua jenis file lab, bukan hanya kode. Tahap 2: "dua instance hanya direkam di c4-ratelimit" di 2.29 salah, karena `labs/t5-skala` juga merekamnya. Sembilan mutasi klaim "tidak ada" diuji di PR itu (#339).

## Prosedur B: menulis ADR

1. Kebutuhan: fitur dari PRD atau masalah dari cerita yang memicunya, dengan angka.
2. Minimal tiga opsi. Untuk tiap opsi: cara kerja (satu paragraf), kelebihan, kekurangan, biaya operasional, dan sumber.
3. Pre-mortem: bayangkan keputusan ini gagal 6 bulan lagi; tulis tiga penyebab paling mungkin. Kalau salah satunya mudah dicegah, masukkan pencegahannya ke keputusan.
4. Pilih satu. Tulis "kapan keputusan ini salah" dan "yang akan merevisinya di tahap berikutnya".
5. Lab yang membuktikan opsi terpilih dan satu opsi yang ditolak.

## Prosedur C: menilai scaling dan arsitektur

1. Hitung dulu: DAU, RPS rata-rata, puncak, ukuran data per tahun, dengan rumus yang ditulis. Tanpa angka, tidak ada diskusi scaling.
2. Cari bottleneck dengan Little's Law (L = λ × W): yang menahan koneksi lama (W) lebih sering jadi masalah daripada yang banyak (λ).
3. Urutan yang diajarkan dan diuji: query dan index → keluarkan kerja lambat → cache baca → tambah instance → replica → partisi → service terpisah → event streaming. Lompat urutan harus dibenarkan dengan angka.
4. Setiap tambahan komponen punya biaya: operasional, kognitif, dan uang. Tulis ketiganya.
5. Uji dengan beban nyata di lab (k6 atau skrip Go) sebelum menulis angka di halaman.

## Prosedur D: risiko, rollout, dan A/B test

1. Risiko: daftar "apa yang bisa salah" × kemungkinan × dampak × cara mendeteksi lebih awal × pengaman. Tanpa kolom "cara mendeteksi", risiko belum dianalisis.
2. Rollout bertahap: canary 1–5% → 25% → 100%, dengan metrik penjaga (error rate, p95, saldo tidak seimbang) dan ambang rollback otomatis yang ditulis sebelum deploy.
3. A/B test hanya untuk pertanyaan produk (mis. layar konfirmasi mengurangi dobel bayar?), bukan untuk kebenaran uang. Tulis hipotesis, metrik utama, satu metrik penjaga, ukuran sampel kasar, dan lama uji sebelum mulai. Jangan membaca hasil di tengah. Rujukan: Kohavi, Tang, Xu, Trustworthy Online Controlled Experiments [perlu verifikasi: edisi].
4. Untuk fitur uang, pengaman selalu feature flag + kill switch, bukan A/B.

## Prosedur E: meninjau kode, termasuk buatan AI

1. Baca kode sebelum menjalankannya. Tulis apa yang kamu kira kode ini lakukan.
2. Jalankan: tes, linter, `go vet`, gosec/semgrep. Bandingkan dengan tebakanmu. Lab RLS dan hak akses berjalan sebagai role aplikasi, bukan superuser atau pemilik tabel, karena keduanya melewati RLS kecuali `FORCE ROW LEVEL SECURITY` (PostgreSQL 18 §5.9); aturan append-only dibuktikan dengan UPDATE dan DELETE yang ditolak saat dijalankan sebagai role itu.
3. Checklist uang: transaction membungkus semua baris uang? Cek pemilik ada? Input diparameterisasi? Idempotency key dihormati? Error dipetakan ke status yang benar? Secret tidak di kode? Batas dari PRD (batas harian, saldo tidak negatif) dijaga server dan database, dan diuji dengan dua request bersamaan (OWASP ASVS 5.0.0 V2.3.2, V2.3.4)? Endpoint yang membuka data akun lain (cek penerima, nama di riwayat) punya batas per akun (V2.4.1)? Baris yang dikunci bersama dikunci dalam urutan tetap (`ORDER BY id FOR UPDATE`) supaya tidak deadlock (PostgreSQL 18 §13.3.4)? Tidak ada panggilan jaringan (bank, notifikasi, HTTP) di dalam transaction yang memegang lock?
4. Cari apa yang **tidak ada**: validasi yang hilang, kasus gagal yang tidak ditangani, retry tanpa batas.
5. Tulis temuan sebagai daftar bernomor dengan baris kode dan perbaikan konkret.
6. Setiap temuan membawa bukti: tes atau mutasi yang gagal karena temuan itu, atau baris dokumentasi. Temuan tanpa bukti ditulis "dugaan" dan tidak memblok merge. Baca juga komentar tinjauan PR sebelumnya yang menyentuh file yang sama (sumber butir 2–6 Prosedur E yang baru: plan/RISET-SKILL.md 8–11).
7. Halaman atau widget dengan angka punya penjaga angka: tes yang menurunkan angka, ID, nomor ADR, versi sumber, dan kata kunci dari rekaman, registry, atau halaman lain. Tes lalu membandingkannya dengan MDX, diagram, dan JSON widget. Uji mutasi mengubah satu nilai per jenis file dan per jenis nilai; tes harus gagal. Tahap 2: sebelum penjaga ditambah, mutasi lolos di 2.25 (2 dari 2), 2.26 (3 dari 3), 2.27 (3 dari 4), 2.28 (8 dari 12), 2.30 (9 dari 28), 2.31 (4 dari 23), 2.32 (6 dari 32), dan 2.33 (15 dari 53). PR: #327, #334, #335, #337, #341, #346, #351, #353.
8. Alat ukur diuji mutasi sebelum dipercaya: hapus `aria-pressed`, `role="status"`, atau tanda fokus, dan alat harus gagal. Mutasi komponen atau CSS widget diuji lewat build dan alat ukur browser, bukan hanya Vitest. Tahap 2: axe lolos palsu bila path 404 atau hasil terpangkas (#283). `eval-keyboard` lolos palsu sampai uji diri (keputusan 753). Satu byte di 2.20 lolos build dan hanya ditangkap Vitest (#322). Penguat dari widget Tahap 3: empat mutasi tampilan widget pool (penanda jam, garis L, tinggi batang, `role="status"`) baru tertangkap oleh pemeriksaan geometri `ukur-pool.mjs` (#352).
9. Assertion keamanan menuntut jenis penolakan dan bukti sisi server (status, header, atau baris database). Mutasi harus gagal karena sebab yang diuji. Tahap 2: tes tebakan bersamaan biasa tetap lolos tanpa `FOR UPDATE`, karena jendelanya milidetik, jadi lab-c4a menambah tes yang menahan baris (#304). Penguat dari lab Tahap 3: "ditolak" terjadi karena koneksi mati atau cookie tidak terkirim, bukan karena pin atau token (#348, #355).
10. Angka yang bergantung mesin (waktu, antrean, urutan) direkam sebagai batas yang diperiksa, bukan nilai tunggal. Bila lab atau gerbang gagal, jalankan satu A/B di `origin/main` bersih sebelum menyebutnya regresi. Tahap 2: ambang waktu tetap membuat lab b3-race gagal palsu saat mesin ramai (2026-10-14). Gerbang "gerak" gagal di halaman 1.11, yang tidak disentuh PR 2.33 (#353).

## Prosedur F: saat cerita tidak masuk akal secara teknis

1. Tulis bagian cerita yang meragukan dan kenapa (mis. "webhook dikirim dua kali dalam 1 detik" tidak realistis untuk gateway yang menunggu timeout 30 detik).
2. Cari bagaimana sistem sungguhan berperilaku: dokumentasi gateway/standar (tingkat 2), postmortem publik (tingkat 4).
3. Usulkan perubahan cerita yang tetap mengajarkan konsep yang sama, dengan sumber.
4. Tulis di plan/MEMORI.md bagian "Usulan perubahan cerita" dan tandai halaman yang terpengaruh. Jangan mengubah plan/CERITA-TAHAP-N.md tanpa persetujuan pemilik; cerita adalah sumber kebenaran yang dimiliki pemilik.
5. Bila naskah menyebut angka kejadian (detik, rupiah, jumlah), jalankan lab lebih dulu dan catat terulang atau tidak. Yang tidak terulang berlabel Ilustrasi di halaman dan masuk usulan perubahan cerita. Tahap 2: M11 "4 detik", M13 "40 detik", dan M15 Rp15.000 tidak terulang. M9 −Rp20.000 hanya muncul lewat alat lab (#296, #302, #309, #327).

## Format keluaran yang tetap (supaya hasil konsisten antar sesi dan model)

Klaim: <satu kalimat>
Sumber: <tautan, versi, tanggal diakses> atau [perlu verifikasi]
Hasil: benar / salah / sebagian
Akibat untuk repo: <file dan perubahan>
Dicatat di: KEPUTUSAN #n / MEMORI

<examples>
<example>
Buruk: "Saya sudah memeriksa dan kode transfer ini aman."
Baik:
Klaim: handler transfer membungkus dua UPDATE dalam satu transaction.
Sumber: labs/b3-stack/go/main.go baris 41–58; dijalankan `make run`, output b3-stack/output/go-transfer.txt menunjukkan ROLLBACK saat UPDATE kedua gagal.
Hasil: benar untuk Go; Node belum dicek.
Akibat: tambah tes Node yang sama.
</example>
<example>
Buruk: memilih Redis untuk queue karena "umum dipakai".
Baik: ADR dengan tiga opsi (outbox di PostgreSQL, Redis Streams, RabbitMQ), angka beban Tahap 3 (17 RPS puncak, 2 detik per notifikasi), pre-mortem ("pesan hilang saat Redis restart tanpa persistence"), pilihan outbox dengan alasan beban kecil dan satu komponen lebih sedikit, dan "salah saat: antrean > 10.000 pesan/menit atau butuh fan-out lintas service".
</example>
<example>
Buruk: "Riset menunjukkan microservices lebih scalable."
Baik: "Heuristik praktisi (sumber tingkat 4: easy.bi, RaftLabs, 2025) menyebut microservices masuk akal di atas ±50 developer; ThoughtWorks (tingkat 4) melaporkan stabilitas turun saat memecah terlalu awal. Tidak ada studi terkontrol; ditulis sebagai heuristik, bukan fakta."
</example>
</examples>
