# Setelah Tahap 4

Polesan dari tinjauan Tahap 4 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `b11-integrasi` (skema lama) perlu versi ledger: gateway tanpa timeout, breaker dan antrean per gateway (R4-07, R4-32).
- Lab `b10-2-webhook`: tambah tiga gaya tanda tangan (HMAC atas timestamp dan body, SHA512 atas field, token statis) dan jadwal retry per status code (R4-08).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Jalur Security di peta tidak memuat 4.17 (secret di state IaC) padahal bagian isinya keamanan; pertimbangkan menambahkannya.
- Redis 8.10.2 (pin lab Tahap 3) lawan 8.10.3 terbaru: ulang cek versi saat `T4-siap` menulis lab.
- Paragraf 4.26 sampai 4.29 di naskah memakai "Tidak dijalankan" untuk k6 dan Testcontainers; periksa konsisten dengan 3.27 saat halaman ditulis.
- Halaman 4.15 memuat dua topik (file di penyimpanan objek dan presigned URL) dan 4.17 tiga (secret manager, IaC, alamat keluar tetap): pecah bila baca lebih dari 10 menit.
- Halaman 4.26 (pipeline, supply chain, CODEOWNERS, rilis bertahap, on-call) berpotensi paling panjang; pertimbangkan dua halaman.
- Lab `t4-webhook` memakai jadwal retry tiruan yang diskalakan; tulis skala di README supaya halaman tidak menyebut menit sebagai rekaman.
- RINGKAS 58 dari 60 baris: lipat peta Tahap 3 sesudah 3.32 merge, dan lipat peta Tahap 4 per kelompok begitu lab selesai.
- `registri.test.ts` mengunci judul tugas ANTREAN (`### lab-<nama> · ` dan `### 4.n · `): mengganti nama tugas menuntut mengubah tes.
- `plan/RISET-TAHAP-4.md` R4-20 masih menulis OpenTofu "provider Docker lokal" sebagai kemampuan; tidak diubah karena riset adalah catatan sumber, tetapi lab memakai provider `random` dan `local`.
- `eval_tahap.py peta 4` keluar 1 selama ada halaman "segera"; pertimbangkan opsi untuk mengabaikan "segera" di gerbang awal tahap.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Tes `TestKedaluwarsaHoldDijalankanDuaKali` bergantung pada `application_name = 'api-t4-tes'` untuk melihat penunggu lock; salinan tes dengan DSN lain gagal tanpa pesan yang jelas.
- Satu run `make run` gagal sekali di bagian `testing` saat CPU penuh; tes yang goyah tidak ditelusuri. Jalankan `make cek` di mesin yang tidak sedang dipakai.
- Rekonsiliasi memakai tanggal Asia/Jakarta di sisi ledger dan tiruan; gateway nyata mungkin memakai zona lain (selisih tanggal akan terbaca sebagai `tidak_di_gateway`).
- `labs/api-t4` menyalin kode api-t3 (±8.500 baris); pertimbangkan memindahkan paket bersama ke satu modul bila lab Tahap 5 menyalin lagi.
- `ERD4` perlu daftar migrasi `labs/api-t3/migrasi/000015..000019` dan `labs/api-t4/migrasi/000020..000023` di `tools/erd.py`.
- Otorisasi ulang dengan `id_penerbit` yang sama bersamaan dengan reversal untuk id itu masih memakai urutan lock berbeda (otorisasi: buku pemilik lalu baris otorisasi; reversal: baris otorisasi lalu buku pemilik): deadlock mungkin tetapi sempit. Perbaikan penuh membaca baris otorisasi tanpa lock, mengunci pemilik, lalu mengunci baris otorisasi.
- `LaporkanQR` tidak menolak karakter kontrol di `alasan` padahal back office menolaknya, dan hash audit memisah kolom dengan `0x1f`: bentuk kanonik ambigu bila `alasan` memuat `0x1f`. `audit_log.hash_sebelumnya` tidak UNIQUE: cabang rantai hanya dicegah advisory lock, bukan database.
- `alamatKhusus` di `internal/unduh` tidak memuat `64:ff9b:1::/48` dan `192.88.99.0/24`; tidak terjangkau dari jaringan container, tetapi daftar produksi perlu melengkapinya.
- `kontrak.txt` tidak mencetak versi oasdiff (hanya digest di `kontrak.sh`); `GET /warung` dan `POST /webhooks/pembayaran` 404 pada mode rentan tidak ada di kontrak.
- `CekTopup` sesudah kabar diparkir tidak pernah mengubah status pada kasus yang bisa dicapai (batas saldo, akun dibekukan, status akhir); halaman 4.7 jangan menulis bahwa pemeriksaan itu menemukan kebenaran baru.
- Dana tertahan yang dikembalikan reversal bisa menaikkan saldo `pemakai` di atas batas tingkat (batas hanya dijaga di top-up).
- Mutan tidak tertutup: `!l.Dibayar` di rekonsiliasi, pemeriksaan alamat harfiah sebelum dial di unduh, dan `KunciBukuID(dana_tertahan, settlement)` eksplisit di clearing.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Halaman 4.6 sampai 4.9 mewarisi: `urutan.txt` F2 (satu pertanyaan ke gateway) dan F3 sebagai kejadian "uang di bank tanpa jurnal"; `tandatangan.txt` A sebagai bukti "byte mentah, bukan JSON yang ditulis ulang".
- Notifikasi ke pemilik akun saat kreditnya dibalik, pembatasan umur insiden, dan retensi `webhook_event` 30 hari belum ada di api-t4.
- Jitter dan pengalihan 3xx pada gateway tiruan belum ditiru.
- Rekaman `rekon.txt` B: skenario `jumlah_beda` (gateway menerima Rp25.000 untuk order Rp20.000) tidak berlabel; halaman 4.9 menulisnya Asumsi lab atau Ilustrasi.
- `url_target` pada `/lab/webhook` dan `/lab/jadwal` menerima alamat apa pun; tiruan hanya mendengar loopback, tetapi batasi ke 127.0.0.1 bila lab ditambah.
- Halaman 4.9: sebut bahwa batas 30 menit terjaga dari dua sisi (29 dan 31 menit) di `rekon.txt` A; tidak ada klaim bahwa celah cek-lalu-tulis tanpa jeda mikrodetik.
- Kasus tandingan penolakan `url_target` dan 15 detik client tiruan tidak dijaga tes (mutan R33 dan R40 tidak tertutup).
- Gateway tiruan (`cmd/tiruan`, `buat` dan penerima webhook) membaca body sesudah mode gangguan, jadi mode `menggantung` tidak mendeteksi client yang menyerah dan handler bocor; samakan dengan tiruan verifikasi di `t4-webhook`.
- Breaker hidup di memori satu proses worker: worker yang dimulai ulang memulai dari tertutup, dua worker tidak berbagi hitungan; untuk produksi hitungan bersama atau satu worker per lajur.
- `ReadyToTrip` kustom dengan ambang sama dengan batas percobaan (5), atau hitungan per pekerjaan berbeda, menghindari pekerjaan pertama yang mati.
- 4xx permanen sebaiknya langsung dead-letter atau berstatus `ditolak`, bukan lima percobaan.
- `testing.txt` api-t4 memuat awalan `berkas_test.go:baris:` dari `t.Log`; nomor baris berubah bila tes diedit dan rekaman ikut berubah. Pertimbangkan menyaringnya di `go_test` (31 baris lama ikut berubah).
- `cmd/beban`, `cmd/tiruan`, dan `cmd/penerbit` membuat client HTTP sendiri (alat lab, di luar klaim "semua panggilan keluar" yang dibatasi ke `internal/`).
- Jalur sinkron breaker (`POST /topup-bank`): pustaka `internal/lajur` bisa dipakai, belum dipasang.
- Pengajuan `tidak_pasti` menahan pendaftar sampai selesai; butuh job pemeriksa status vendor sebelum produksi.
- `SalahPermintaan` menghitung semua 4xx sukses bagi breaker, termasuk 429 (vendor membatasi laju) dan 408; ADR 36 membacanya begitu, tetapi 429 meminta backoff dan sebaiknya dihitung gagal atau menunda lajur.
- Jendela pengamatan `lajur.txt` bagian B (Timeout breaker 3 detik, pengamatan ±1,1 detik) bisa kurang pada mesin yang sangat sibuk; naikkan Timeout bila `cek` goyah.
- Flake `beban` p95 tidak terulang di bawah beban CPU 30 proses (p95 7,05 ms, load average 33 pada 10 inti): kemungkinan jeda I/O Docker Desktop; bila berulang, ulangi bagian itu sekali atau naikkan batas 500 ms.
- Penanda Snippet `tanpa-redirect` pindah dari `internal/unduh/unduh.go` ke `internal/klien/klien.go`; halaman 4.21 merujuk berkas baru.
- Tes worker dengan jendela breaker 150 ms bergantung jam nyata; aman sampai 30 proses sibuk di mesin ini (tujuh run), tetapi tetap bukan jam palsu seperti tes `internal/lajur`.
- Mutan setara yang tidak ditutup: `len(hasil) <= Serentak` di `klaim` (hanya satu lajur punya vendor), timeout 0 di client unduh (konteks `WithTimeout` tetap memutus), dan `serentak_maks` yang menyimpan nilai terakhir di tiruan; jadi relevan bila lab menambah lajur vendor kedua.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- `RekonHarian`: jumlahkan semua jurnal `topup_bank` per order (bukan hanya yang dipegang `topup_bank`) dan buat insiden bila lebih dari satu; tes dan rekaman di lab `t4-webhook`.
- Pindahkan handler `cmd/pembayaran` ke paket agar bisa dites unit; sekarang statusnya (401, 400, 503) dijaga rekaman `ledger.txt` bagian D, bukan tes.
- Api-t4: `go test -race ./internal/handler` gagal di `TestTopupBankEndpoint` (data race, `handler_pembayaran_test.go:347`; berkas tidak disentuh PR ini, diduga pra-ada), perbaiki sebelum `-race` dijadikan gerbang.
- Lab `t4-modul`: golden hak (`rancanganHak` di `batas_test.go`) harus diperbarui bersama `modul.sql`; pertimbangkan membangkitkannya dari satu sumber.
- Turunkan kontrak kolom identitas, merchant, dan platform dari kode, dan bangun satu pool per modul di monolith.
- Pindahkan kode ledger lama ke `internal/modul/ledger/internal/...` supaya compiler yang menjaga batasnya, bukan hanya `go list -deps`.
- Tulis kontrak OpenAPI untuk API ledger, serta TLS dan rotasi kunci layanan.
- Halaman 4.12 dan 4.13: Snippet dari `ledger_api.go` bagian `ledger-kredit`, `pembayaran.go` bagian `terapkan` dan `selesai`, dan `modul.sql`; rekaman `batas.txt` untuk M32.
- Halaman 4.14 dan 4.15: kutip `ukuran.txt` (rasio), `presign.txt`, `unggah.txt`, `unduh.txt`, dan `retensi.txt` lewat Snippet berrentang baris; tahan label Hitungan, Asumsi, Ilustrasi (file karangan), dan [perlu verifikasi] persis seperti di rekaman.
- `GET /bo/verifikasi/{id}/berkas/...` menjawab 500 `berkas-rusak` untuk checksum tidak cocok; 5xx untuk data yang rusak bisa dibaca sebagai galat server: 409 atau 422 lebih tepat (perubahan perilaku api-t4, bukan bagian lab ini).
- Pembersihan file yatim dari URL yang diminta tetapi tidak pernah diajukan: tidak ada job (aturan lifecycle penyimpanan atau job penyapu).
- Presigned POST dengan `content-length-range` dan aturan lifecycle SeaweedFS 4.51: dukungan belum diperiksa [perlu verifikasi].
- Bagian `beban` di `make -C labs/api-t4 cek` sekali gagal pada load average 29 ("generator tidak tertinggal"), lulus pada ulangan; ambang lag 100 ms bergantung mesin.
- `make -C labs/t4-storage run` ±3,5 menit karena `docker compose stop` dan `start` SeaweedFS di bagian `retensi` ±45 detik; bisa dipersingkat bila penyimpanan tiruan cukup.
- Presign bagian C: batas bawah 3,5 detik diukur dari saat jawaban server dibaca skrip, sedangkan tanggal tanda tangan dipotong ke detik di server; jawaban yang terlambat lebih dari sekitar 0,5 detik menggagalkan bagian itu (gagal keras). Lulus di bawah 16 proses CPU sibuk (load average satu menit 66,8); bila menjadi goyah, ukur dari waktu penandatanganan yang dikembalikan server.
- README lab menyebut "AWS S3 API Reference"; halaman berjudul itu kini ada di S3 User Guide (`developerguide/sigv4-query-string-auth.html`) dan alamat `API/` mengarah ke indeks: sebut User Guide dan tanggal akses di halaman 4.15.
- Halaman 4.15: tulis bahwa URL tanpa `content-length` ditandatangani tidak membatasi ukuran dan bahwa ukuran opsional di API ini (lihat PERLU-DICEK-PEMILIK).
- `go test -run` lab t4-storage memuat empat paket dan penjaga pola; bila ada berkas tes jalur berkas baru, tambahkan ke daftar di `rekam_testing` (`run.py`).
- ADR 36: terapkan usulan 401 dan 403 dihitung gagal di `internal/lajur` dan rekam ulang `t4-integrasi` (lab ini tidak mengubah kode lajur).
- Rekam matinya proxy keluar (semua panggilan keluar gagal bersamaan) dan CONNECT untuk HTTPS bila halaman 4.17 membahas titik gagal tunggal.
- Jalankan `cmd/pindairahasia` atas state IaC staging dan seluruh konfigurasi staging di pipeline (halaman 4.26), bukan hanya dua file contoh.
- Periksa tanda tangan rilis dengan cosign dan gpg bila alatnya dipasang di mesin pengembang.
- Alert atas `gagal_beruntun` pembaca rahasia dan rotasi token service belum ada.
- Pemindai: nilai yang diubah bentuknya (base64) atau dipecah beberapa baris tidak tertangkap; awalan peka huruf besar-kecil; file `produksi.sidik` berisi SHA-256 penuh dan menjadi bahan tebakan bila rahasia berentropi rendah. Perlu diputuskan sebelum pemindai masuk pipeline (halaman 4.26).
- Dugaan dari kode, tidak dijalankan: `internal/klien.Baru` memakai transport bawaan yang membaca `HTTP_PROXY`, jadi bila service produksi diberi `HTTP_PROXY` untuk proxy keluar, pembacaan OpenBao ikut lewat proxy (tujuan tak terdaftar dijawab 403, pembacaan awal gagal, service tidak menyala) kecuali `NO_PROXY` memuat alamat OpenBao. Rekam bila halaman 4.17 membahas konfigurasi proxy.
- `TestProxyTidakMemakaiProxyLainDariLingkungan` meresolve nama `.invalid` dan memakan ±1 sampai 5 detik tergantung resolver mesin.
- `labs/api-t4/internal/service/qr.go`: pindahkan validasi bentuk (nominal kosong atau di bawah 1, alasan 20 sampai 200 karakter) sebelum `BatasAkun` dan `KunciQR` bila pemilik memutuskan masukan salah tidak memakai jatah laju.
- `GET /qr/{id}` tidak membawa `kota` bila `akun.kota_id` kosong; client Flutter harus menangani field opsional itu.
- Dua pemeriksaan di `qrpayload.go` berlapis tanpa efek beda (`n <= 0` dan awalan `0` pada nominal; `peta["26"] == ""` dan pengenal penerbit); boleh disederhanakan bila halaman tidak mengutipnya.
- Rekaman `statis.txt` dan `dinamis.txt` bergantung pada UPDATE kota merchant di data awal lab; hapus langkah itu bila seed api-t4 kelak mengisi kota merchant luar.
- `make -C labs/t4-qr test` hanya menjalankan tes payload; tes service butuh `TEST_DATABASE_URL`, jadi tes itu hanya lewat `run.py BAGIAN=testing`.
- `qrlab ganti -nominal 0` tidak bisa membuang nominal dari payload dinamis (0 berarti tidak diisi); cukup untuk lab ini.
- `labs/api-t4/README.md` menulis jatah `qr-bayar` 20 pembayaran per menit, tetapi tidak ada tes atau rekaman yang menjalankannya (mutan M21 lolos semua tes dan rekaman); tambahkan tes di lab api-t4.
- `repo/ledger.go` `KunciBukuAkun`: menghapus `ORDER BY id` (ADR 13) lolos seluruh tes service dan repo api-t4 (mutan M24). Urutan hasil `WHERE akun_id = ANY($1)` tidak bergantung pada urutan argumen, jadi mutan itu mungkin tidak berbahaya dalam praktik, tetapi urutan lock tidak dijaga tes; jaga bila ADR 13 butuh bukti di tingkat SQL.
- Samakan pesan penolakan untuk nama yang ada dan yang tidak ada (ubah `Unduh`, `ErrTujuan` lawan `ErrTidakMenjawab`; ubah `TestSSRFBatasPesanMembedakanNamaDikenalDariTidakDikenal`, `batas.txt`, README lab, dan ADR 41 bila disentuh).
- Halaman 4.20 dan 4.21: kutip `batas.txt` dan `alamat.txt` lewat Snippet berrentang baris; jangan menulis "rekaman" untuk perilaku versi rentan yang hanya ada di tes unit api-t4.
- Rekaman tingkat endpoint `POST /merchant/katalog/impor` dengan `-rentan unduh-rentan` di `api-t4` (`rekam_fitur`) bila pemilik ingin halaman 4.20 bersandar pada rekaman, bukan tes unit.
- Tes untuk proxy dan keep-alive (mutan D06, D07, C03) butuh tujuan non-loopback; tidak mungkin di lab host.
- `batas.txt` memakai batas waktu nyata (dua tes menunggu 3 detik, ±7 detik total; margin 2 detik di sisi "dalam batas"); di bawah beban CPU ekstrem bagian waktu bisa gagal keras, bukan merekam salah.
- Memori yang ditahan header besar tidak diukur (80 MiB adalah batas atas dari hitungan).
- `make -C labs/t4-ssrf mutasi` ±20 menit; bisa dibatasi dengan `MUTAN="D03 L05"`.
- Alamat IPv6 di `0000::/8` di luar blok terdaftar (misalnya `::ffff:0:a00:1`, IPv4-translated usang menurut RFC 2765) lolos `alamatDilarang`; tidak ada host sungguhan di sana, tetapi `::/8` satu baris bila pemilik ingin daftar lebih ketat daripada registri.
- Awalan NAT64 khusus operator (RFC 6052 bagian 2.2) tidak bisa didaftar di kode; yang menutupnya penempatan jaringan proses pengunduh (ADR 41), yang Tidak dijalankan. Halaman 4.21 menyebut batas ini.
- Halaman 4.21: kutip `alamat.txt` bagian tepi blok registri (27 blok, 54 tepi dalam, 39 tepi luar) bila ingin menunjukkan daftar dicocokkan dengan registri dari dua sisi, dan bagian berzona bila membahas bentuk alamat yang melewati daftar; jangan menulis "29 dari 32" tanpa angka 26 dari 32 bila alasannya `IsPrivate` tidak cukup.
- Mutan V66 (membaca sampai dua kali batas) tidak teramati: butuh pengukuran memori atau pembaca yang bisa dihitung byte-nya; fetcher tidak membatasi panjang URL sendiri (batas 2.048 karakter ada di `ImporKatalog`).
- `make -C labs/t4-ssrf mutasi` kini 136 mutan (±30 menit); `MUTAN="V21 V80"` membatasi.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- (Selesai di tinjauan: tes lama `TestOtorisasiLockTimeoutMenjawabSibuk` kini melepas lock lewat `t.Cleanup`.)
- `kunci_idempotensi` dipakai bersama oleh `order_id` (`TB-`), Idempotency-Key user (UUID), dan `id_penerbit` tanpa awalan: `id_penerbit` yang bertabrakan dengan key lain dijawab `key-dipakai-permintaan-lain` dan bisa memblokir top-up dengan `order_id` yang sama; hanya penerbit berkunci yang bisa memicunya, tetapi awalan `KT-` di ledger menutupnya.
- `LedgerTahanKartu` hanya memeriksa panjang `id_penerbit`; bentuk (karakter kontrol, UTF-8) diperiksa service pembayaran sebelum memanggilnya. Bila rute `POST /ledger/kartu/tahan` dibuka ke pemanggil lain, pindahkan pemeriksaan bentuk ke ledger.
- Dua penantian lock lolos di bawah `lock_timeout`, tiga akan melewati tenggat: bila lab Tahap 5 mengukur p95 otorisasi pada beban, ukur juga jumlah penantian per transaction.
- Job rekonsiliasi kartu (hold di ledger tanpa baris, otorisasi disetujui penerbit tanpa baris, penagihan tanpa otorisasi) belum ada.
- Dua instance monolith dan kill switch lintas instance (ADR 27) belum direkam untuk kartu.
- Halaman 4.25 memakai label "Rekaman lab" untuk apa yang terbukti di `rantai.txt`, `jangkar.txt`, `role.txt`, `persetujuan.txt`, dan `mcp.txt`, dan "Tidak dijalankan" untuk agen LLM, OAuth penuh, token exchange, tempat jangkar tulis-sekali, dan kunci rahasia atas baris; hash baris tidak ada di rekaman (bergantung pada waktu aksi), jadi halaman tidak menulis nilai hash.
- Tabel `audit_log` tidak punya kolom nilai: perubahan batas ikut di kolom `objek` (`akun:40001/batas_harian=300000`); halaman yang menampilkan audit memakai bentuk itu apa adanya.
- `auditjob` satu proses: dua job serentak bisa menambah jangkar yang sama dua kali (tidak dijalankan); produksi butuh satu penjadwal.
- Pemeriksa harian dan jangkar tidak menjaga urutan menurut waktu: `waktu` diisi service dan tidak diverifikasi terhadap jam luar.
- Daftar mutan di `labs/t4-audit/mutasi/daftar.py` bisa dipakai peninjau dan KONSISTENSI-4 untuk memeriksa kalimat halaman yang terkunci (tiap klaim "terdeteksi" dan "tidak terdeteksi" punya kasus tandingan di rekaman).
- Berkas jangkar hilang atau menyusut tidak terbedakan dari hari pertama: butuh penanda inisialisasi (mis. flag `-inisialisasi`), peringatan bila jumlah jangkar berkurang, dan tempat tulis-sekali.
- Token penyetuju tidak terikat pada satu aksi dan berlaku selama sesinya; penyetuju diperiksa di luar transaction (dibekukan di antaranya tetap lolos sekali). Antrean persetujuan per aksi memperbaiki keduanya.
- Percobaan yang ditolak (penyetuju salah, alasan tidak sah, akun non-risk) tidak tercatat di `audit_log`: butuh log aplikasi terpisah atau tabel percobaan bila "siapa mencoba" harus terjawab.
- Halaman 4.25: hak tabel menahan `UPDATE` dan `DELETE` oleh aplikasi, bukan `INSERT` (`role.txt` bagian E: baris yang tak pernah terjadi lolos dan dijangkarkan); dua orang ditegakkan kode service karena `api_t4` punya hak `UPDATE` kolom `status` di `akun` dan `batas_harian` di `buku`.
- `HashAudit` tidak menyandikan panjang kolom: bila kolom teks bebas baru masuk ke hash, ganti dengan penyandian berpanjang (tes karakterisasi akan memberi tahu).
- Spesifikasi MCP 2026-07-28 meminta server memvalidasi `Origin` dan membatasi laju pemanggilan alat dan menyaring keluaran; tidak dijalankan di lab (server di 127.0.0.1).
- Halaman 4.26: `sast.txt` bagian A2 menunjukkan G701 butuh sumber input yang terlacak; jangan menulis "gosec menemukan SQL injection pada `fmt.Sprintf`" tanpa syarat itu.
- Halaman 4.26: kutip `kontrak.txt` bagian C dan `tanda-tangan.txt` bagian B dan C lewat Snippet berrentang baris; jangan menulis "cosign menolak tag" (cosign menerimanya dengan peringatan); jangan menulis oasdiff "tidak mendeteksi" tingkat path tanpa menyebut `--flatten-params`.
- Halaman 4.26: rekaman api-t4 memuat 15 temuan grype dan 10 kerentanan stdlib yang dipanggil karena Go 1.27.1; tulis sebagai Rekaman lab dengan versi Go, bukan sebagai kelemahan desain.
- Bila pemilik ingin gerbang yang berjalan: workflow GitHub Actions per modul memakai `langkah_untuk`, `oasdiff breaking --flatten-params --severity-levels`, gosec tanpa `-quiet`, govulncheck JSON, SBOM lengkap, dan verifikasi digest; belum ada.
- Naikkan Go ke 1.27.3 (tugas terpisah) lalu rekam ulang semua lab, `sast.txt` bagian E, dan `sbom.txt` bagian C.
- Jalankan client Dart yang dihasilkan (Flutter SDK ada di mesin pemilik, `dart pub get` ke `PUB_CACHE` lokal) untuk membuktikan galat null check pada enum baru; sekarang hanya dibaca dari kode.
- Kunci SHA-256 basis data Go bila drift mengganggu `make cek` di mesin baru; atau simpan hanya entri OSV yang dikutip.
- Periksa arti baris cosign "verified offline" bila `--insecure-ignore-tlog` dipakai (perlu verifikasi).
- `make test` (105 tes) belum masuk gerbang `tools/cek_situs.sh`; satu baris di sana bila pemilik ingin tes lab ini jalan di CI.
- `unduh` di `alat.py` menulis langsung ke file tujuan: unduhan basis data grype yang terputus meninggalkan file parsial dan run berikutnya gagal di "SHA-256 arsip basis data grype" tanpa pemulihan; tulis ke file sementara lalu pindahkan.
- `alat.pastikan` memeriksa checksum hanya saat mengunduh; biner yang sudah ada di `.alat` hanya diperiksa lewat `--version`. SHA-256 arsip basis data grype juga hanya diperiksa saat impor.
- `putuskan_sbom` menerima daftar modul yang diharapkan kosong dan lulus; `parse_gosec` gagal dengan `IndexError` (bukan `ValueError`) bila satu galat paket berisi teks kosong. Keduanya tetap gagal tertutup di run, tetapi pesannya tidak jelas.
- Bagian klien memakai `--skip-validate-spec` pada openapi-generator; README belum menyebutnya. `docker rmi` image lab di akhir run tidak dijaga tes.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- ERD Tahap 4 di HP setinggi ±5.800 px (22 tabel bertumpuk satu kolom); usul untuk halaman 4.5: lipat per modul (enam bagian dari `modul-tahap-4.json`) atau tampilkan hanya modul yang dipilih.
- `ukur-erd.mjs`: tambah CLS hydrate dengan Tahap 4 sebagai tahap awal (`awal={4}`) saat halaman 4.5 ditulis; ukur juga mode font telat (Verdana) karena `METRIK` diukur dengan Satoshi dan JetBrains Mono terpasang.
- Penjaga serupa ERD3 dan ERD4 (baris katalog dan hash `tabel`) untuk `tahap-1.json` dan `tahap-2.json`; atau `tabel_sha256` di format JSON (keputusan 1256, alternatif).
- Tahap 4 bandingkan di 1366 px setinggi ±3.150 px dengan teks 0,83 sampai 0,85; halaman 4.5 bisa memilih tampil tunggal bila ingin teks tidak diperkecil.
- `ErdTumbuh` memuat bundel React Flow (±57 KB gzip) hanya untuk halaman uji dan halaman skema; ukuran JS `/uji/erd/` dicatat di `plan/AUDIT-TAMPILAN.md`.
- Peninjau: dengan font Verdana di layar 320 px Tahap 4 punya 4 nama terpotong (`buku.akun_id`, kepala `batch_pencairan`, `baris_pencairan`, `operasi_sinkron` dengan status "tetap"; Courier New 3, Georgia 1, Arial 0; Tahap 3 nol di semua font yang dicoba): `METRIK` mengandalkan Satoshi dan JetBrains Mono, dan kepala `batch_pencairan` hanya punya sisa ±0,8 px pada perkiraan di node 200 px. Pertimbangkan membungkus kepala atau memberi margin, dan ukur dengan font cadangan seperti butir SETELAH-TAHAP-4 di atas.
- Peninjau: trigger invarian ledger (tiga constraint trigger dan fungsi `tolak_ubah`) tidak tampil di ERD semua tahap (tercatat di `erd.py`); halaman skema Tahap 2 sampai 4 bisa menambah baris "Dijaga trigger" di detail `jurnal` dan `posting` dari katalog.
- Peninjau: tombol pemilih tahap dan "Bandingkan" tampil dan tidak berfungsi tanpa JavaScript (sama di main); BRIEF-HALAMAN meminta tombol seperti itu disembunyikan, jadi sembunyikan sebelum hydrate di halaman 4.5.
- Peninjau: `banding_mermaid` menghitung index UNIQUE parsial (`WHERE`) sebagai relasi satu-ke-satu; belum ada kasusnya di Tahap 4, tambah syarat definisi tanpa `WHERE`.
- Peninjau: hash `modul-tahap-4.json` mencakup seluruh `modul.sql` termasuk baris GRANT, jadi perubahan hak di lab `t4-modul` memaksa `erd.py --tahap 4` ulang (butuh database) walau pembagian tabel sama; bila mengganggu, hash hanya baris `CREATE SCHEMA` dan `ALTER TABLE ... SET SCHEMA`.
- Peninjau: commit widget `690e4356` 546 baris non-generated (255 tes) melampaui batas 300; tidak bisa dipecah sesudah PR.
- Peninjau: `ukur-erd.mjs` bagian 6d belum mengukur CLS, versi tanpa JavaScript, dan axe dengan Tahap 4 sebagai tahap awal; diukur peninjau di salinan (CLS 0,0000 di 320, 375, 1366 px, tanpa JS tampil benar, axe 320 px 0), jadikan pemeriksaan tetap saat halaman 4.5 punya `awal={4}`.
- Halaman 4.7: pasang `<WebhookLangkah />` di blok Coba dan jangan menyalin angka widget; kalimat bebas tiap langkah terkunci sidik, jadi perubahan teks harus memperbarui `KUNCI` di `penjaga.test.ts`.
- `/uji/webhook/` belum ada di daftar halaman `ukur-axe.mjs`; alat widget memeriksa axe sendiri (tiga keadaan, dua tema).
- Rekonsiliasi atas dua jurnal dari handler versi pertama belum punya rekaman; bila 4.9 ingin klaim, butuh bagian lab.
- `scroll-margin-top` pada langkah setara di Chromium; Firefox dan Safari belum diuji.
- Papan keadaan lengket dua kolom untuk desktop lebar belum dicoba.
- `ukur-webhook.mjs` +427 baris dalam satu commit (aturan 300 baris non-generated): pecah menurut bagian bila diubah lagi.
- Tombol "Langkah sebelumnya" (quiet) berlatar putih di dalam langkah aktif mode terang desktop; pertimbangkan latar transparan.
- Sesudah "Langkah berikutnya" fokus pindah ke langkah tujuan, jadi pengguna keyboard menekan Tab satu sampai dua kali sebelum tombol berikutnya; pertimbangkan memindahkan fokus ke tombol Langkah berikutnya milik langkah tujuan.
- `rentan.txt` A tidak mencetak perintah yang mengirim kabar pending (hanya hasil `SELECT`); lab api-t4 sebaiknya mencatatnya supaya halaman 4.7 bisa menelusuri kejadiannya.
- `z-index` bilah lengket setara dengan DOM sekarang; bila elemen berposisi lain masuk ke widget, tambahkan pemeriksaan tumpang tindih di `ukur-webhook.mjs`.
- Horizon 180 detik tidak memuat outage panjang; 210 permintaan percobaan dan sampai 42 dari 146 pekerjaan hanya Hitungan. Bila 4.11 butuh melihatnya, tambah penggeser lama outage dengan jam diperankan.
- Hanya vendor yang pulih di bawah Timeout (detik 30) atau tidak pernah pulih; vendor yang pulih sesudah permintaan percobaan pertama (probe gagal lalu sukses) belum punya tombol.
- `IsExcluded` (hasil netral v2.4.0, `breaker.txt` bagian D) dan Interval nonnol tidak dimodelkan.
- Gerak masuk jawaban tebakan (`muncul`) tidak diukur di halaman uji; satu mutan yang menghapusnya hidup.
- `ukur-breaker.mjs` menjalankan Playwright dengan batas bawaan 30 detik per aksi yang gagal; mutasi yang merusak halaman membuatnya lambat (±40 detik per mutan).
- Legenda papan memakai swatch seragam 0,8 rem: kode tinggi kotak (Gagal 5xx 100%, Jawaban 4xx 70%, Timeout 55%, Berhasil 30%) hanya terbaca di papan; Gagal 5xx dan Timeout satu warna dan satu swatch di legenda. Tampilkan tinggi relatif di swatch.
- Lima mutan tampilan masih hidup dan kosmetik atau setara: daftar jenis jawaban flex bukan grid, bobot huruf angka, jarak antar tombol 0, dan pilih tebakan tanpa `setParam(awal)` (setara).
- Kotak "Ditolak cepat" dibuat dari dua bayangan dalam 1 px: di lebar kotak bukan bilangan bulat garisnya bergantian tajam dan buram (kosmetik).
- "lajur" dan "dijeda" dipakai di Hitungan dan alasan tebakan tanpa arti di dalam widget: 4.10 atau 4.11 menjelaskannya sebelum widget.
- `ukur-breaker.mjs` kini ±450 baris dan lambat saat halaman rusak (±40 detik per mutan); pertimbangkan dipecah per bagian.
- Audit bahasa naskah 4 memberi 13 peringatan (3 sebelum tugas ini); sepuluh baru adalah kalimat atau paragraf panjang di tambalan: pecah bila pemilik meninjau naskah.
- Daftar kelompok di kepala naskah 4 ditulis dua kali (kepala dan tambalan di tempatnya); bila pemilik meninjau, lipat kepala menjadi satu paragraf seperti naskah 3.
- `python3 tools/erd.py --naskah 4` hanya menandai selisih informasi; bila blok mermaid kelak disamakan dengan lab, `test_erd.py` (mutasi `text hash_sebelumnya`) ikut berubah.
- Tinjauan 1393: halaman 3.5 menulis "13 developer dalam tiga tim" sedangkan 3.27, 3.29, dan 3.32 menulis "10 sampai 15" (orang atau engineer) dan tanpa label Asumsi cerita di 3.5; samakan satu bentuk saat pemilik memutuskan angkanya.
- Tinjauan 1393: kalimat "13 orang dalam tiga tim" ada dua kali di naskah 4, jadi `tim-infra-t3.halaman.test.ts:194` (`toContain`) tidak menangkap perubahan salah satunya; angka tambalan naskah 4 (0,5787; ±13,8; 13,333; 8,7 kali; ±65.000; Pembayaran 5) tanpa penjaga sampai halaman 4.x menurunkannya.
- Tinjauan 1393: catatan ANTREAN yang bertentangan dengan naskah sesudah tambalan (pengatur yang mengubah): blok 4.1 ("Jembatan 3.32 menulis tiga tim gateway, kartu, dasbor"; salah menurut keputusan 1126), blok 4.5 ("Halaman 3.5 menulis tim 6–10 dalam 2 tim"; sudah diperbaiki di PR ini), blok 4.16 ("breaker ADR 36 terbuka dengan benar"; ADR 36 menghitung 403 sukses, breaker bawaan yang terbuka), blok 4.17 ("OpenBao v2.7.1"; lab v2.7.2), blok 4.21 ("2 MB"; kode 2 MiB). Registry dan RINGKAS tidak bertentangan.
- Tinjauan 1393: "Simulasi" (label widget W4-breaker, disebut di ADR 36 naskah) bukan salah satu dari lima label di `/cara-pakai/`; halaman 4.11 memakai Ilustrasi atau memberi satu kalimat arti di pemakaian pertama. Halaman 4.26 jangan menulis gosec memakai G701 untuk setiap `fmt.Sprintf` ke `database/sql` (README t4-pipeline temuan 4). `fitur.txt` dan `rentan.txt` di `api-t4` menunjuk rekaman unduh-rentan di lab ssrf yang tidak ada.
- Tinjauan 1393: IsExcluded (hasil netral gobreaker v2.4.0, `breaker.txt` D) dan `tidak_pasti` yang berakhir `gagal` belum jadi kalimat ADR 36; halaman 4.11 boleh memuatnya.
