# Lab t4-qr · payload QR dengan CRC, QR statis lawan dinamis, dan laporan QR palsu

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3, M35, dan ADR 40; tugas `lab-t4-qr`). Lab ini membuktikan lima hal tentang QR pembayaran merchant luar: CRC di tag 63 mendeteksi salah baca tetapi bukan penggantian, QR dinamis dibayar sekali dan kedaluwarsa tepat pada 5 menit (Asumsi), nominal terikat pada id QR, QR statis milik merchant lain menjadi jurnal sah ke merchant itu, dan laporan QR palsu membekukan merchant lebih dulu. Server, skema, data awal, dan semua perilaku QR di sisi server adalah milik `labs/api-t4` (`dasar_t4.py`); lab ini tidak menyalin server dan **tidak menambah flag, mode rentan, endpoint, atau migrasi**. Yang baru: paket payload `internal/qrpayload`, perintah `cmd/qrlab`, dan tes Go berbuild tag `t4qr`, semuanya di dalam modul `labs/api-t4` karena paket `internal` hanya bisa diimpor dari modul itu.

Server api-t4 **tidak membaca payload**. Yang diterimanya hanya id QR (uuid) dan nominal. Pemindai di rekaman adalah skrip lab (`qrlab urai`, lalu `GET /qr/{id}`), pemalsu adalah pemanggilan `qrlab ganti`, dan pembeli adalah akun seed. Tidak ada app di lab ini. Semua pihak ketiga tiruan, semua berjalan di komputer lab, tidak ada kredensial nyata, dan lab ini tidak mengklaim kepatuhan atau izin apa pun. Format payload "bergaya EMV", bukan implementasi EMVCo penuh; PDF EMVCo belum dibuka [perlu verifikasi di PDF EMVCo].

## Menjalankan

```bash
make -C labs/t4-qr run                       # semua bagian, ±1 menit, menulis labs/t4-qr/output/*.txt
make -C labs/t4-qr run BAGIAN=dinamis        # satu bagian: crc statis dinamis lapor testing
make -C labs/t4-qr cek                       # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t4-qr test                      # hanya tes payload (tanpa database)
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Lab ini memakai port server api-t4 (dasar 18280 ditambah `LAB_PORT_OFFSET`), jadi tidak berjalan bersamaan dengan `api-t4` atau lab Tahap 4 lain yang berbagi server itu di satu lajur. Tiap bagian membuat ulang schema `tahap4_qr` dan data awal dari nol; bagian `testing` memakai schema `tahap4_qr_tes`. Rekaman memakai port dasar dan label menggantikan id QR, token, waktu, dan nilai CRC pada payload dari server, jadi hasilnya sama di semua lajur.

Tes Go berbuild tag `t4qr` hanya dijalankan lab ini (`go test -tags t4qr`), supaya rekaman `testing.txt` milik `api-t4` tidak berubah. Tes service butuh `TEST_DATABASE_URL` yang menunjuk schema tes dan `LAB_TES_SCHEMA` yang sama; `run.py BAGIAN=testing` menyiapkannya.

## Versi dasar dan sumber (dicek 2026-10-27)

| Komponen | Versi | Sumber dan catatan |
|---|---|---|
| PostgreSQL | 17.11 (kontainer lab, dicetak di kepala rekaman) | sama dengan api-t4 |
| Go | go1.27.1 (kepala rekaman) | toolchain lokal |
| pgx | v5.11.0 | `labs/api-t4/go.mod` |
| Python | 3.14.7 (`labs/.venv`) | hanya skrip rekaman dan pembanding CRC `binascii.crc_hqx` (dokumentasi Python dibuka 2026-10-27) |
| Parameter CRC | CRC-16/IBM-3740, alias CRC-16/CCITT-FALSE: polinomial 0x1021, nilai awal 0xFFFF, tanpa pembalikan bit, tanpa XOR akhir, nilai uji 0x29B1 | katalog CRC (reveng.sourceforge.io/crc-catalogue/16.htm, dibuka 2026-10-27; R4-330). Katalog menjelaskan parameter CRC itu, bukan isi spesifikasi EMVCo |
| Tag 00, 01, 63 | tag 00 bernilai `01`; tag 01 bernilai `11` (statis) atau `12` (dinamis); tag 63 berpanjang 04, CRC atas semua data object termasuk `6304` tanpa nilainya, empat karakter heksadesimal dengan nol di depan | dokumen turunan yang menyatakan isinya mengikuti EMV QRCPS (R4-331, dibuka 2026-10-27) dan halaman Mastercard Developers (R4-101); **PDF EMVCo belum dibuka** [perlu verifikasi di PDF EMVCo] |

Dependency baru di lab ini: tidak ada. Kode baru memakai pustaka standar Go; skrip rekaman memakai pustaka standar Python dan psycopg yang sudah dipakai lab lain.

## Apa yang ditambahkan ke api-t4

| Berkas | Isi |
|---|---|
| `internal/qrpayload/qrpayload.go` | `CRC16`, `Bangun`, `Urai`, `UraiTanpaCRC`, `PasangCRC`, `Ganti`. Pustaka standar saja |
| `internal/qrpayload/qrpayload_test.go` (tag `t4qr`) | 13 tes payload tanpa database: nilai uji CRC, CRC berawalan nol, payload contoh yang dihitung terpisah, semua salah baca satu karakter, kasus ditolak (bentuk, tag 01, tag 00, tag ganda, nominal, id) |
| `internal/service/qr_pindai_test.go` (tag `t4qr`) | 8 tes service dengan PostgreSQL: batas Rp200.000, nominal terikat, 5 menit, sekali pakai, pembekuan, saldo tepat, dan alur payload ke server |
| `cmd/qrlab/main.go` | Alat lab: `buat`, `urai`, `ganti`, `rusak`, `crc`. Bukan bagian server |
| `.gitignore` | `/qrlab` (biner hasil build) |

Semua batas di tes service ditulis sebagai angka (Rp200.000, Rp200.001, Rp5.000.000, 4 menit 59 detik, 5 menit, 19 dan 20 dan 200 dan 201 karakter), bukan lewat konstanta paket, supaya mengubah konstanta di kode menggagalkan tes. Jam diperankan lewat `DenganJam`, tidak ditunggu.

## Format payload yang dipakai

Urutan tag naik, tag 63 di ujung. Yang berasal dari sumber yang bisa dibuka: tag 00, tag 01, tag 63, dan cara CRC dihitung dan ditulis. Selebihnya pilihan lab.

| Tag | Isi di lab | Asal |
|---|---|---|
| 00 | `01`, paling depan | sumber (R4-331) |
| 01 | `11` statis, `12` dinamis | sumber (R4-101, R4-331) |
| 26 | template merchant: sub-tag `00` pengenal penerbit milik lab (`id.rekeningo.lab`) dan sub-tag `01` id QR (uuid huruf kecil) | pilihan lab; ID 02 sampai 51 dicadangkan untuk template merchant menurut R4-331, pembagian sub-tagnya tidak dibaca dari PDF |
| 52, 53, 58 | kategori `5411`, mata uang `360`, negara `ID`: nilai tetap lab, tidak dibaca server dan tidak diperiksa `Urai` selain bentuk TLV | pilihan lab |
| 54 | nominal bulat tanpa titik, hanya QR dinamis | pilihan lab |
| 59, 60 | nama paling banyak 25 dan kota paling banyak 15 karakter ASCII | batas Asumsi lab, bukan batas spesifikasi |
| 63 | CRC empat karakter heksadesimal **huruf besar** | huruf besar adalah pilihan lab; sumber tidak menyebut huruf besar atau kecil |

`Urai` memeriksa tag 63 di ujung lebih dulu, lalu CRC, lalu isi. Kode galatnya: `crc`, `bentuk`, `inisiasi` (tag 01 hilang atau bukan 11 dan 12), dan `isi` (QR statis membawa nominal, QR dinamis tanpa nominal, id bukan uuid, nama atau kota kosong). Tag ganda dan tag 63 kedua di tengah payload ditolak (`bentuk`).

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `crc.txt` | Bagian A: CRC di Go sama dengan `binascii.crc_hqx` pada empat masukan dan nilai uji 0x29B1. B: payload statis dan dinamis dengan id tetap, tabel TLV, tag 01 = 11 dan 12. C: salah baca (tiga posisi, lalu semua 8.562 penggantian satu karakter dan semua 104 pertukaran dua karakter bersebelahan pada payload contoh). D: id diganti dengan CRC dihitung ulang lolos; tanpa CRC baru ditolak; CRC baru dari Python sama persis. E: tag 01, tag 00, nominal yang bertentangan ditolak walau CRC benar | 4.18, 4.19 |
| `statis.txt` | Payload Toko Andalan dipindai dan dibayar Budi Rp35.000: jurnal seimbang ke Toko Andalan, nol posting di buku Bu Marni, tabel `qr` tanpa kolom lokasi; payload Bu Marni dengan id Toko Andalan lolos CRC dan membawa nama dan kota yang lain dari jawaban server; batas Rp200.000 di kedua sisi dan dua pembayaran berturut-turut | 4.18, 4.19 |
| `dinamis.txt` | `berlaku_sampai` = jam server + 300 detik; sekali pakai (409 untuk pembayar yang sama dan pembayar lain); payload dengan nominal Rp1 dan CRC baru lolos pemindai tetapi nominal Rp1, Rp34.999, dan Rp35.001 ditolak (422) dan body kosong memotong Rp35.000; jam diperankan 299, 300, dan 301 detik | 4.19 |
| `lapor.txt` | Laporan terhadap stiker palsu membekukan Toko Andalan; laporan terhadap QR Bu Marni yang asli dari akun terverifikasi membekukannya dan QR-nya dijawab 404; akun yang baru didaftarkan membekukan tiga merchant dan laporan keempat ditolak batas laju; tim risk membuka dengan penyetuju kedua | 4.18, 4.19 |
| `testing.txt` | `go vet -tags t4qr`, 21 tes bertag `t4qr` dengan baris `LAB|` hasilnya, dan pemeriksaan bahwa tiap tes yang terdaftar muncul sebagai PASS | 4.19 |

## Pernyataan naskah dan rekamannya

| Pernyataan (naskah, "Yang harus bisa dibuktikan lab") | Rekaman | Hasil |
|---|---|---|
| Payload yang CRC-nya dihitung ulang untuk payload lain lolos validasi CRC | `crc.txt` D; `statis.txt` C; `dinamis.txt` C | Terbukti: lolos pemindai lab; id QR, nama, kota, dan nominal bisa diganti tanpa kunci |
| QR dinamis sekali pakai: pembayaran kedua ditolak | `dinamis.txt` B | Terbukti (409, satu jurnal terikat ke id QR) |
| Pembayaran sesudah kedaluwarsa (5 menit, Asumsi) ditolak | `dinamis.txt` D | Terbukti di kedua sisi: 299 detik terbayar; 300 dan 301 detik 410. Jam diperankan, tidak ditunggu |
| Nominal terikat pada id QR | `dinamis.txt` C | Terbukti: body selain nominal QR 422; payload yang nominalnya diganti tidak mengubah apa yang dipotong |
| QR statis milik merchant lain menghasilkan jurnal sah ke merchant itu; server tidak punya cara mencegahnya | `statis.txt` B | Terbukti untuk api-t4: jurnal seimbang, merchant aktif dan terverifikasi, saldo cukup; tabel `qr` tidak punya lokasi atau pengenal stiker, dan permintaan bayar hanya membawa sesi, id QR, dan nominal |
| Batas Rp200.000 per transaksi QR statis (Asumsi produk) | `statis.txt` D; `testing.txt` | Terbukti di kedua sisi (Rp200.000 diterima, Rp200.001 ditolak) dan berlaku per pembayaran, bukan per QR atau per hari |
| Layar konfirmasi dengan nama dan kota merchant terverifikasi | `statis.txt` C | Server mengembalikan nama dan kota dari tabel akun. **Layar dan perilaku pembeli tidak ada di lab**: apakah pembeli membaca dan membandingkannya dengan papan toko tidak terukur (Asumsi) |
| Laporan QR palsu membekukan merchant lebih dulu | `lapor.txt` | Terbukti, termasuk dampaknya pada merchant sah (bagian C dan D) |
| CRC-16, polinomial 0x1021, nilai awal 0xFFFF, nilai uji 0x29B1 untuk "123456789" | `crc.txt` A | Terbukti dengan dua implementasi dan nilai uji katalog CRC. Bahwa spesifikasi EMVCo memakai parameter itu untuk tag 63: [perlu verifikasi di PDF EMVCo] |

## Yang diperankan lab, Asumsi, dan yang tidak terukur

- **Pemindai dan pemalsu diperankan.** `qrlab urai` lalu `GET /qr/{id}` adalah urutan yang diasumsikan untuk app; `qrlab ganti` memalsukan tanpa kunci. Keduanya skrip lab, bukan app dan bukan penyerang. Skenario stiker yang tertempel adalah Ilustrasi: letak stiker tidak ada di sistem.
- **Perilaku pembeli di layar konfirmasi tidak terukur** (Asumsi). Rekaman hanya menunjukkan apa yang dijawab server.
- **Angka Asumsi**: masa berlaku QR dinamis 5 menit (ADR 40), batas Rp200.000 per pembayaran QR statis (Asumsi produk), batas Rp5.000.000 per QR dinamis (Asumsi lab), laporan QR 3 per jam per akun (Asumsi lab), alasan laporan 20 sampai 200 karakter, batas panjang nama 25 dan kota 15.
- **Data awal**: seed api-t4 tidak mengisi kota merchant luar. Lab mengisi kota Bu Marni (Jakarta) dan Toko Andalan (Surabaya) lewat SQL pemilik schema supaya konfirmasi memuat kota. Merchant 3 sampai 6 di `lapor.txt` diberi QR statis lewat SQL pemilik schema, karena batas login 10 per menit per alamat membatasi jumlah login dalam satu rekaman.
- **Alamat tunggal**: semua permintaan datang dari 127.0.0.1, jadi batas laju per alamat tidak diuji di sini.

## Selisih dengan naskah (lab yang benar; naskah tidak diubah)

1. Naskah ADR 40 menulis QR dinamis "dibuat server per transaksi". Di lab, server membuat baris `qr` dan mengembalikan id, nominal, dan `berlaku_sampai`; **payload tidak dibangun oleh server**. `qrlab buat` memerankan penerbit stiker atau app merchant. Server api-t4 tidak punya endpoint payload.
2. Naskah menulis layar konfirmasi menampilkan nama dan kota merchant. Seed api-t4 tidak mengisi `akun.kota_id` untuk merchant luar, jadi `GET /qr/{id}` tidak membawa kota sampai data merchant memilikinya; naskah 3b tidak menulis dari mana kota merchant berasal.
3. Naskah M35 menulis layar konfirmasi versi pertama menampilkan nama berhuruf kecil. Tidak ada layar di lab; yang terbukti hanya bahwa nama di payload tidak sama dengan nama yang dijawab server bila payload dipalsukan.
4. Laporan QR palsu: naskah menulis "membekukan merchant lebih dulu, memeriksa kemudian". Rekaman menambah tiga hal yang naskah tidak tulis: satu laporan dari akun yang belum terverifikasi cukup, QR merchant beku dijawab 404 yang sama dengan QR yang tidak pernah ada, dan merchant tetap beku sampai staf risk dan penyetuju kedua bertindak (tidak ada pemulihan otomatis).
5. Naskah menyebut CRC "mendeteksi salah baca". Rekaman membatasinya pada satu payload contoh: semua penggantian satu karakter dan semua pertukaran dua karakter bersebelahan terdeteksi, tetapi itu hasil untuk payload itu, bukan jaminan umum. Sifat umum CRC-16 (kesalahan beruntun sampai 16 bit selalu terdeteksi) tidak dibuktikan di sini.
6. Batas Rp200.000 hanya membatasi kerugian per pembayaran (ADR 40 sudah menulisnya): dua pembayaran Rp200.000 berturut-turut sama-sama diterima.

## Uji mutasi lab ini

MUTASI

## Yang belum ada di lab ini

- **PDF EMVCo**: parameter CRC, daftar tag wajib, dan batas panjang nama dan kota belum dibaca dari spesifikasi asli (R4-27, R4-101, R4-331).
- **App dan layar konfirmasi**: tidak ada; perilaku pembeli, tampilan huruf, dan tes keterbacaan tidak terukur.
- **Pemalsuan fisik stiker**: tidak ada pemindai kamera, tidak ada gambar QR; payload adalah teks.
- **Pembatalan QR oleh merchant** dan job yang menandai QR kedaluwarsa tanpa pembayaran: lihat README `api-t4`.
- **Verifikasi laporan**: tidak ada. Lab tidak memodelkan bukti, bobot pelapor, atau pembekuan bertahap; itu keputusan produk di luar ADR 40.
- **Batas laju lintas instance dan lintas alamat** untuk `POST /qr/{id}/laporkan` dan `/daftar`: satu proses, satu alamat.
- **Skema pembayaran nasional dan merek**: tidak dipakai; pengenal penerbit di tag 26 milik lab.
