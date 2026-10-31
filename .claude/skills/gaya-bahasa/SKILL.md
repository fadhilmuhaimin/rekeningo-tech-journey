---
name: gaya-bahasa
description: Aturan menulis semua teks Rekeningo Tech Journey - cerita, PRD, halaman konsep, ADR, label widget, pesan commit, bahkan komentar kode. Gunakan skill ini SETIAP KALI menulis atau mengubah teks berbahasa Indonesia yang akan dibaca pembaca, termasuk saat memindahkan halaman lama, menulis ilustrasi, atau membuat soal Cek diri. Juga gunakan saat mereview teks buatan sendiri sebelum commit.
---

# Gaya bahasa Rekeningo Tech Journey

Tujuan: teks yang terasa seperti engineer senior menjelaskan ke teman, bukan buku pelajaran dan bukan novel. Pembaca utama: mobile engineer Indonesia yang bahasa Inggris teknisnya cukup, tapi belum pernah memegang backend.

## Dasar yang dipakai

Narasi membuka, ekspositori menjelaskan. Meta-analisis (Mar 2021; Tobler 2024) menunjukkan cerita membantu ingatan, terutama untuk pembaca baru, dan teks ekspositori yang rapi paling berguna setelah ada cerita. Prinsip Mayer: gaya percakapan, potongan pendek, buang yang tidak perlu.

## Tiga mode teks, jangan dicampur dalam satu paragraf

1. **Cerita** (PRD, adegan masalah, ilustrasi): ada tokoh yang melihat sesuatu, ada angka konkret, ada sebab-akibat. Satu adegan maksimal 6 paragraf. Tidak menjelaskan konsep.
2. **Konsep** (Inti, Cara kerjanya, Di stack lain): netral, urut, tanpa tokoh kecuali satu kalimat penghubung ke adegan. Setiap paragraf menjawab satu pertanyaan yang bisa ditulis sebagai judul.
3. **Keputusan** (ADR, trade-off): tabel atau daftar bernomor, kalimat pendek, selalu ada alternatif yang ditolak dan kapan keputusan ini salah.

## Aturan kalimat (dipaksakan oleh tools/audit_bahasa.py)

- Sapaan "kamu". Tidak ada "Anda", "kita" untuk pembaca, atau "pengguna" untuk pembaca.
- Kalimat ≤ 25 kata, satu ide per kalimat. Paragraf ≤ 4 kalimat.
- Kalimat punya subjek dan predikat. Fragmen hanya di label widget.
- Istilah teknis tetap bahasa Inggris dan diberi `translate="no"` di HTML: transaction, lock, queue, retry, idempotency key, user, client, file, key, bucket, handler, service, repo. Jangan diterjemahkan, jangan diganti metafora.
- Tanpa idiom terjemahan literal: bukan "sumber kebenaran" tapi source of truth; bukan "jalur bahagia" tapi happy path.
- Tanpa metafora berlapis (dunia kantor, loket, bawang). Boleh analogi satu kalimat yang langsung ditinggalkan.
- Kelebihan / Kekurangan, bukan untung/rugi. Rupiah integer: Rp70.000.
- Tanpa nama merek nyata di cerita. Nama produk hanya sebagai stack yang dibandingkan atau sumber rujukan.
- Angka selalu konkret dan selalu dari lab atau asumsi berlabel. Tidak ada "sangat cepat", "banyak sekali".

## Label, tautan, dan teks alternatif (diperiksa peninjau, belum oleh alat)

- Label tombol menyebut aksinya ("Buka langkah 3", "Tutup diagram"), bukan ikonnya. Label yang terlihat menjadi awal nama aksesibelnya (WCAG 2.2 SC 2.5.3), dan prosa menyebut tombol dengan labelnya persis.
- Teks tautan bermakna tanpa kalimat di sekitarnya: judul halaman atau frasa deskriptif, bukan "di sini" atau "halaman ini". Dalam satu halaman, teks tautan yang sama tidak menuju dua halaman berbeda.
- Ilustrasi yang `aria-hidden` tidak membawa informasi sendiri: setiap angka dan siapa melihat apa juga ada di teks DOM di dekatnya. Teks alternatif menyebut pesan gambar dan tidak mengulang judul atau keterangan di sebelahnya.
- Sumber ketiga aturan ini: plan/RISET-SKILL.md butir 5–7.

## Angka, label, dan istilah (diperiksa peninjau dan penjaga angka; bukti Tahap 2)

- Satu angka, satu bentuk di semua halaman. Bila registry, rekaman, atau halaman prasyarat sudah menulis angka itu, pakai bentuk yang sama atau tulis nilai tepat dengan satu kalimat pembulatan. Hasil turunan dihitung dari angka yang tertulis di halaman, supaya pembaca bisa mengulang hitungannya. Tahap 2: 2.31 menulis "0,10 × (0,02 + t) = 5, jadi t ≈ 48 detik", padahal hasilnya 49,98 (48 datang dari 0,104), dan 3.571 ÷ 1,4 = 2.551, bukan 2.571 (#346). 2.33 menulis 0,87 × 2,02 = 1,75, padahal hasilnya 1,76 (#353).
- Satu arti per label, sama dengan `/cara-pakai/` (Label sumber). Rekaman lab: keluaran lab di repo, ditunjuk dengan file dan bagian. Asumsi: angka beban cerita atau pilihan penulis tanpa rekaman; rumusnya ditulis di halaman. Ilustrasi: skenario atau contoh, bukan hasil sistem. Tidak dijalankan: dicek ke dokumentasi atau kode, tidak dijalankan. [perlu verifikasi]: belum bisa dicek ke sumber primer.
- Hasil rumus memakai label masukan terlemahnya: satu masukan Asumsi membuat hasilnya Asumsi, dan "Hitungan" hanya penjelas, bukan pengganti label. Tahap 2: tabel Little di 2.30 menulis "(W: Rekaman lab)", sehingga L terbaca rekaman padahal λ Asumsi (#341). Kartu 2.32 menulis bacaan atas naskah sebagai "didukung rekaman" (#351).
- Pemakaian pertama label di prosa atau tabel satu halaman diberi satu kalimat arti atau tautan ke `/cara-pakai/`; chip di komponen widget belum diatur aturan ini. Pembaca masuk lewat tautan langsung. Uji baca EVAL-2 (butir 5): "Asumsi" dan "[perlu verifikasi]" tanpa penjelasan di 2.28.
- Inti, Rantai, dan pertanyaan Tebak memakai kata yang pembaca kenal dari halaman prasyarat atau kata sehari-hari. Istilah yang baru dijelaskan di blok Paham atau halaman lain diberi satu kalimat arti di pemakaian pertama, ditaut ke halaman istilahnya, atau diganti kata biasa. Bukti: 2.14 ("niat", "sidik jari") dan 2.10 ("invarian 3") menjadi dua dari lima keluhan pembaca segar.
- Halaman istilah dan tooltip menjelaskan arti istilah, bukan jawaban masalah di halaman lain. Istilah "buku ledger" menulis jawaban M9 sebelum ADR 13 dibaca (#292).
- Hitungan diulang dari angka di teks halaman, bukan dari registry. Tahap 3 mengulang galat Tahap 2: 3.1 menulis 12,5 kali padahal 17,4 ÷ 1,4 = 12,4 (#364). 3.3 menulis 13,3 dan 13,33 sekaligus, jadi 10.000 ÷ 13,3 = 752, bukan 750 (#366). 3.9 menulis L = 8,717 dari λ = 0,87, padahal 0,868 × 10,02 = 8,697 (#374).
- Angka masukan yang asalnya ada di halaman lain, atau di rekaman di luar kutipan, diberi satu kalimat asal atau tautan di pemakaian pertamanya. Tahap 4: 7,52 di 4.10 punya rumus 6,94 + 0,579 hanya di 4.28 (EVAL-4 uji baca butir 7). 4.11 menulis 146, 12.600 detik, dan faktor puncak 10 tanpa asal (#439). 4.19 menulis Rp20.000 tanpa asalnya (#451). 4.28 menulis 10,95 lawan 6,57 GB tanpa selisihnya (#462).
- Satu simbol atau angka tidak memegang dua besaran. Di 3.9, t berarti 10 detik (push menggantung) dan 0,3 detik (lama kirim) (EVAL-3 uji baca butir 2). 3.28 menulis "Angka 0,87 itu koneksi", padahal potongan rekaman di halaman yang sama memakai 0,87 per detik untuk pembayaran (#408). Pakai dua simbol, atau tulis asal angka itu di tiap pemakaian.
- Sebelum PR, cari pemakaian pertama (`grep -n`) setiap simbol (L, λ, W, c), singkatan, dan kata bermakna khusus (klaim, flag, poller, diperankan). Cari di halaman, Tebak, dan Cek diri. Artinya ada di kalimat itu atau sebelumnya. Audit bahasa 0 error tidak menangkapnya: 3.9 (klaim, L, λ, W, c, poller), 3.24 (flag, diperankan), dan 3.32 ("dari batas 18") terbit dan hanya tercatat sebagai polesan (#374, #414, #418).
- Rujukan ke bagian lain harus bisa diikuti pembaca. "Di atas" menunjuk elemen yang memang lebih dulu di halaman. "Bagian G" hanya dipakai bila kutipan di dekatnya memuat baris penandanya (`# --- G.`). Tahap 4: 4.4 menulis "keenam kejadian di atas" padahal tabelnya ada di blok Paham di bawah. Ia juga menulis "bagian G di atas" padahal kutipannya tidak memuat penanda di baris 106 (EVAL-4 uji baca butir 1 dan 2). Bila ragu, tulis nama elemennya: "tabel Enam kejadian di blok Paham".
- Pakai satu kata per konsep dalam satu tahap. Sebelum menulis, hitung kata itu di halaman tetangga (`grep -c`). 4.7 menulis "rahasia" 6 kali tanpa "secret", sedangkan 4.8 menulis "secret" 34 kali (`grep -o -i`, 2026-10-31; #436). 4.9 memuat keduanya dalam satu kalimat sebelum tinjauan (#438), dan 4.18 memakai "pelanggan" dan "pembeli" untuk orang yang sama (#448).
- Label turunan ("Hitungan", "Ilustrasi mekanisme", "Dipersempit", "Batas", "penalaran", "dibaca dari kode") bukan label sumber dan tidak ada di `/cara-pakai/`. Pakai hanya berdampingan dengan satu dari lima label di sana, dan beri satu kalimat arti di pemakaian pertama halaman. Di Tahap 3, "Ilustrasi mekanisme" berarti jam, HP, atau proxy di lab diperankan. Hasilnya tetap rekaman (EVAL-3 W2; 3.20, 3.21, 3.24; "Dipersempit" dan "Batas" di 3.31).
- Adegan Gejala tanpa kalimat definisi. `python3 tools/eval_tahap.py gejala N` mencetak kalimat berpenanda (adalah, yaitu, artinya, berarti, merupakan, disebut). 3.16 menulis definisi di adegan dan lolos audit bahasa 0 error serta tinjauan #386 sampai EVAL-3 menemukannya (#418, #421).

## Cara membuat cerita yang diingat

1. Mulai dari apa yang **dilihat** seseorang: layar HP, buku Ani, laporan Pak Hadi. Bukan dari log server, bukan dari konsep.
2. Beri angka: Rp70.000, 11 HP, 5 menit. Angka adalah pegangan ingatan.
3. Tulis **yang Raka kira** sebelum **yang sebenarnya**. Tebakan yang salah membuat pembaca menebak juga.
4. Satu konflik per adegan. Jangan menumpuk dua masalah dalam satu adegan.
5. Emosi proporsional: "tangan gemetar" boleh sekali di Tahap 1; tidak ada drama, tidak ada humor sinis.
6. Akhiri adegan dengan satu kalimat yang menunjuk ke halaman konsep, bukan dengan menjelaskan konsepnya.

## Cara menjelaskan konsep supaya tidak kaku

1. Kalimat pertama: apa konsep ini dalam satu kalimat, tanpa istilah baru yang belum dijelaskan.
2. Kalimat kedua: kejadian di cerita yang membutuhkannya.
3. Lalu mekanismenya, 3–5 langkah, dengan diagram atau widget di tengah (lihat skill visualisasi).
4. Hubungkan ke pengalaman mobile engineer sekali: "kalau kamu pernah memakai `database.transaction()` di sqflite, konsepnya sama persis."
5. Tutup dengan apa yang salah kalau konsep ini tidak dipakai, bukan dengan ringkasan.

## Prosedur saat menulis atau mengubah teks

1. Tentukan modenya (cerita / konsep / keputusan). Tulis mode itu di komentar sementara.
2. Tulis draf.
3. Jalankan `python tools/audit_bahasa.py <file>`. Nol error wajib.
4. Baca ulang dengan tiga pertanyaan: Apakah seseorang yang belum pernah memegang backend tahu apa yang terjadi? Apakah ada kalimat yang bisa dihapus tanpa kehilangan arti? Apakah ada istilah yang muncul sebelum dijelaskan atau masuk glosarium?
5. Tulis alasan singkat perubahan di pesan commit.

<examples>
<example>
Buruk (konsep dicampur cerita, kalimat panjang, idiom literal):
"Transaction, yang merupakan sumber kebenaran dalam dunia database, adalah hal yang dialami Budi ketika ia mentransfer uang dan terjadi kegagalan yang menyebabkan saldonya hilang karena sistem tidak menjalankan kedua perintah sebagai satu unit yang atomik."

Baik (dipisah: cerita, lalu konsep):
"Budi mentransfer Rp70.000. Layarnya menunjukkan 'gagal'. Saldonya berkurang, saldo Ani tidak bertambah."
"Transaction menjadikan beberapa perintah database satu unit: berhasil semua, atau batal semua. Transfer Budi butuh dua UPDATE. Tanpa transaction, UPDATE pertama bisa berhasil saat UPDATE kedua gagal."
</example>
<example>
Buruk (metafora berlapis): "Bayangkan database sebagai kantor pelayanan dengan loket; transaction adalah petugas yang mengunci pintu."
Baik: "Transaction adalah pagar di sekitar beberapa perintah. Di dalam pagar, semua terjadi atau tidak sama sekali."
</example>
<example>
Buruk (angka kabur): "Server jadi sangat lambat saat banyak orang memakai."
Baik (angka dari lab): "Pada 17 request per detik, p95 naik dari 40 ms ke 2.100 ms karena pool 10 koneksi habis (rekaman lab t3-bayar)."
</example>
</examples>

## Yang tidak boleh

- Menjelaskan konsep di dalam adegan cerita.
- Mengubah nama tokoh, perusahaan, atau angka cerita tanpa memperbarui plan/CERITA-TAHAP-N.md.
- Menulis "mudah", "cukup", "tinggal" untuk hal yang belum ditunjukkan.
- Menambah humor, emoji, atau tanda seru.
