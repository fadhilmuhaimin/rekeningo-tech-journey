# Lab t3-dasbor · dasbor kecil Wulan, mode rentan dan benar

Lab untuk masalah M25 Tahap 3 (`plan/CERITA-TAHAP-3.md` bagian 4) dan ADR 30 (Keamanan 5). Setiap Ani membuka "Riwayat penerimaan" di dasbor, muncul kotak peringatan berisi angka 1. Dimas menaruh `<img src=x onerror=alert(1)>` di catatan satu pembayaran ke Warung Ani, untuk mencoba. Lab ini merekam apa yang terjadi di browser sungguhan saat dasbor menampilkan catatan itu apa adanya, dan apa yang menahannya.

Server dan data awal adalah milik `labs/api-t3` lewat `dasar_t3.py`, tanpa salinan dan tanpa mengubah satu pun file `labs/api-t3/`. Yang baru: dua program Go kecil (`go/cmd/dasbor`, `go/cmd/serangan`), satu penggerak Playwright (`js/driver.js`), dan rekamannya (`run.py`).

`dasbor` membaca schema `tahap3` langsung dari database, dengan query yang sama dengan `RiwayatPenerimaan` di `labs/api-t3/internal/repo/katalog.go`. Ia tidak memanggil server api-t3 lewat HTTP. Semua serangan hanya terhadap proses lokal di mesin ini.

`dasbor` dan `serangan` hanya mau mendengar di loopback atau `*.localhost` (`go/internal/pagar`, pola yang sama dengan `labs/t3-mitm`): alamat lain, termasuk `0.0.0.0` dan alamat tanpa host, ditolak dengan `GAGAL:` sebelum membuka port.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/t3-dasbor run                    # semua bagian, ±1 menit, menulis labs/t3-dasbor/output/*.txt
make -C labs/t3-dasbor run BAGIAN=csrf        # satu bagian: xss csrf webauthn
make -C labs/t3-dasbor cek                    # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t3-dasbor test                   # tes Go (pagar loopback, gerbang cookie dan CSRF)
make -C labs/t3-dasbor mutasi                 # uji mutasi (bagian "Uji mutasi")
```

Butuh Docker, Go, dan Node. Bila Go atau Node tidak ada di PATH, lab berhenti dengan `GAGAL:` yang menyebut alatnya. Node memanggil Playwright lewat `NODE_PATH` yang diarahkan ke `situs/node_modules` (situs sudah memasangnya untuk tangkapan layar dan tes; lab ini tidak memasang Playwright sendiri).

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar: dasbor 18200, halaman serangan 18201; keduanya belum dipakai lab Tahap 3 lain.

Setiap bagian membuat ulang schema `tahap3` dan data awalnya dari nol lewat `labs/api-t3`. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan.

| Bagian | File | Peran |
|---|---|---|
| `go/cmd/dasbor` | Dasbor Ani (port 18200) | Login, `GET /dasbor`, `GET /api/riwayat`, `POST /api/menu/harga`; lima sumbu mode lewat flag (`-escape`, `-csp`, `-cookie`, `-samesite`, `-token`) |
| `go/cmd/serangan` | Halaman Dimas (port 18201, host `penyerang.localhost`) | Satu form tersembunyi yang langsung submit POST ke dasbor begitu halaman dimuat |
| `js/driver.js` | Chromium lewat Playwright | `xss`, `xss-lawan-csrf`, `csrf`, `webauthn`: satu proses Chromium per panggilan, hasil ditulis sebagai satu baris JSON |

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `xss.txt` | A: innerHTML tanpa escape, tanpa CSP, cookie tanpa HttpOnly. B: textContent, CSP, cookie `__Host-`. C: innerHTML tetap dipakai tapi CSP tetap menahan. D: XSS mengalahkan CSRF yang benar | 3.22, 3.23 |
| `csrf.txt` | A: tanpa token, `SameSite=None`. B: `SameSite=Lax` saja. C: token dan Origin/Sec-Fetch-Site, `SameSite=Lax`. D: token dan Origin/Sec-Fetch-Site saat `SameSite=None` (token sendirian diuji) | 3.23 |
| `webauthn.txt` | Percobaan WebAuthn dengan authenticator virtual lewat Chrome DevTools Protocol (R3-20, R3-82) | 3.23 |

## Cara merekam

Setiap bagian memanggil `dasar_t3.buat_schema()` dan `seed()` dari `labs/api-t3`. Bagian `xss` lalu menyalakan api-t3 sungguhan, login sebagai Dimas, dan mengirim `POST /transfers` Rp5.000 ke Warung Ani dengan catatan `<img src=x onerror=alert(1)>` — persis M25, bukan data buatan tangan. api-t3 lalu dihentikan; `dasbor` lab ini membaca baris itu langsung dari `jurnal` dan `posting`.

Bukti perilaku browser datang dari Chromium nyata lewat Playwright, bukan dari membaca kode. `js/driver.js` login lewat form HTML sungguhan, menunggu navigasi, lalu membaca `document.cookie`, jumlah elemen `<img>` nyata di DOM, dan dialog `alert()` yang benar-benar muncul; Playwright mencatatnya lewat event `dialog` dan menutupnya sendiri. Token sesi dan token CSRF acak tiap kali lab jalan. `driver.js` tidak pernah mengembalikan nilainya mentah-mentah, hanya "bisa dibaca atau tidak", supaya rekaman tetap identik di setiap jalan.

Halaman serangan Dimas dijalankan di host `penyerang.localhost`, bukan sekadar port lain di `localhost`. Keduanya punya *site* yang berbeda menurut aturan `SameSite` (RFC 6265bis §5.2): `localhost` bukan domain yang terdaftar di Public Suffix List, jadi setiap label sebelum `.localhost` dihitung sebagai *site*-nya sendiri. `*.localhost` di-resolve ke `127.0.0.1` tanpa DNS oleh OS dan oleh Chromium sendiri (RFC 6761 §6.3); dicek langsung di mesin ini dengan `python3 -c "import socket; socket.gethostbyname('penyerang.localhost')"`.

Harga produk 1 (Nasi goreng, Warung Ani) dipakai sebagai bukti CSRF: sebelum dan sesudah serangan dibandingkan lewat SQL langsung (status, bukan waktu), sama seperti bukti saldo di lab ledger.

## Yang terekam (Rekaman lab)

**XSS tersimpan (M25).**

- **A, mode rentan.** `escape=rentan`, `csp=mati`, `cookie=rentan`. Dialog `alert()` dengan pesan `"1"` muncul — persis cerita M25. Satu elemen `<img>` nyata terbentuk di `#daftar` lewat `innerHTML`. `document.cookie` bisa dibaca skrip dan memuat nama cookie sesi (cookie tanpa HttpOnly): skrip yang sama bisa mencuri token sesi Ani, bukan hanya menampilkan dialog.
- **B, mode benar.** `textContent` tidak pernah menafsir string sebagai HTML: 0 elemen `<img>`, 0 dialog, payload tetap terlihat pembaca sebagai teks biasa. Cookie `__Host-sesi` dengan HttpOnly: `document.cookie` kosong.
- **C, innerHTML tetap dipakai tapi CSP tetap aktif.** 1 elemen `<img>` tetap terbentuk (escape memang rentan di skenario ini), tetapi 0 dialog: CSP (`script-src 'nonce-...'` tanpa `'unsafe-inline'`) menolak atribut `onerror` sebagai sumber skrip, terlepas dari bagaimana elemen itu masuk DOM (R3-80). Escape (B) dan CSP (C) masing-masing cukup sendirian; hanya saat keduanya mati sekaligus (A) `onerror` berjalan.
- **D, XSS mengalahkan CSRF.** `escape=rentan`, `csp=mati`, cookie dan token CSRF tetap bawaan benar. Dialog tetap muncul, lalu skrip yang sama memanggil `fetch('/api/menu/harga', ...)` dengan `credentials: 'same-origin'` dan token CSRF yang ia baca dari variabel global halaman sendiri (`window.csrf`). Jawabannya 200 dan harga berubah dari Rp25.000 ke Rp2, walau token, Origin, Sec-Fetch-Site, dan cookie `__Host-` semuanya benar. Skrip tidak menembus pemeriksaan itu; ia berjalan sebagai halaman itu sendiri, jadi semuanya lolos secara sah (R3-19: "XSS mengalahkan semua mitigasi CSRF").

**CSRF.**

- **A, tanpa token, `SameSite=None;Secure`.** Form lintas situs Dimas berhasil: harga berubah ke Rp1, versi naik satu kali.
- **B, `SameSite=Lax` saja, masih tanpa token.** Serangan yang sama ditolak: harga tidak berubah. Cookie `SameSite=Lax` yang ditulis eksplisit tidak pernah terkirim lintas situs untuk permintaan POST di Chromium versi lab ini (R3-81); permintaan sampai ke server sebagai belum login, dan pemeriksaan token tidak pernah tercapai.
- **C, token dan Origin/Sec-Fetch-Site, `SameSite=Lax`.** Ditolak, sama dengan B; karena cookie tidak pernah sampai, mutasi yang menghapus pemeriksaan token, Origin, atau Sec-Fetch-Site di skenario ini tidak terlihat (lihat "Uji mutasi").
- **D, token dan Origin/Sec-Fetch-Site diperiksa, cookie `SameSite=None`.** Cookie kali ini sungguh terkirim, dan serangan tetap ditolak: token, Origin, dan Sec-Fetch-Site sendirian yang menahan, bukan atribut cookie. Skenario ini yang membuktikan tiga pemeriksaan itu benar bekerja, bukan hanya tertulis di kode.

**WebAuthn (R3-20, R3-82).** `navigator.credentials.create()` lewat authenticator virtual Chrome DevTools Protocol berhasil tanpa interaksi manusia: dokumentasi resmi CDP WebAuthn adalah halaman pengalihan yang tidak terbaca lewat fetch sederhana, tetapi lab membuktikan langsung bahwa domain itu menjalankan ceremony sungguhan, bukan hanya pengalihan.

## Temuan yang mengubah cara M25 dan ADR 30 ditulis

1. Escaping dan CSP adalah dua lapis independen, bukan satu lapis yang diulang: skenario C menunjukkan CSP sendirian menahan `onerror` walau HTML sempat masuk DOM. ADR 30 menulis keduanya, bukan memilih salah satu.
2. "SameSite=Lax saja sudah cukup" tidak benar secara umum (R3-19), tetapi untuk serangan form POST yang paling sederhana, SameSite=Lax yang ditulis eksplisit sudah menahannya di Chromium versi lab ini (R3-81) — sebelum token sempat diperiksa. Klaim "token wajib" perlu skenario yang membuat cookie tetap terkirim (D) supaya benar-benar teruji, bukan hanya skenario yang kebetulan sudah ditahan lapis lain.
3. XSS mengalahkan CSRF bukan dengan memalsukan permintaan lintas situs, tetapi dengan tidak perlu melakukannya: skrip yang berjalan karena stored XSS sudah berada di origin yang benar, dengan cookie dan token yang benar. Pertahanan CSRF tidak dirancang untuk melawan XSS (R3-19); keduanya harus ditulis sebagai dua ancaman terpisah di ADR 30, bukan satu dianggap mencakup yang lain.
4. Cookie tanpa HttpOnly mengubah dampak XSS dari "mengganggu tampilan" jadi "token sesi bisa dibaca skrip" — ditunjukkan langsung oleh `cookieJSBisaDibaca` di skenario A, bukan disimpulkan dari kode.
5. Chrome DevTools Protocol WebAuthn menjalankan ceremony sungguhan (R3-82), bukan hanya pengalihan seperti catatan riset sebelumnya menduga: halaman pembaca bisa memakai klaim ini untuk membedakan "passkey belum diuji" dari "passkey tidak bisa diuji".

## Dependency lab

Tidak ada dependency baru. Go memakai `github.com/jackc/pgx/v5` dan `golang.org/x/crypto/bcrypt`, keduanya sudah dipasang dan dipakai `labs/api-t3`. Node memakai Playwright yang sudah dipasang `situs/` (`situs/node_modules`, lewat `NODE_PATH`); lab ini tidak menambah `package.json` atau `node_modules` sendiri.

## Yang tidak ada di lab ini

- **Login passkey penuh (registrasi tersimpan di server, verifikasi signature oleh relying party, assertion login): Tidak dijalankan.** Itu butuh pustaka WebAuthn sisi server (mis. go-webauthn) sebagai dependency baru di luar lingkup dasbor kecil ini, dan perlu ADR tersendiri. Lab ini hanya membuktikan ceremony sisi browser (`navigator.credentials.create`) bisa diselesaikan lewat authenticator virtual.
- **Browser selain Chromium (Firefox, Safari, Chromium versi lain): Tidak dijalankan.** Perilaku `SameSite=Lax` dan CSP yang direkam adalah perilaku Chromium versi Playwright `situs/` memakainya hari ini.
- **Android dan iOS (WebView, Chrome Custom Tabs): Tidak dijalankan.** Dasbor Tahap 3 adalah halaman web biasa, dibuka dari laptop warung (PRD v3), bukan dari dalam app Flutter.
- **HTTPS sungguhan: Tidak dijalankan.** Lab berjalan di `http://` sepanjang `localhost` dan `*.localhost`, yang diperlakukan Chromium sebagai *potentially trustworthy* sehingga cookie `Secure` tetap terpasang tanpa TLS. Produksi butuh HTTPS sungguhan; batas ini dicatat, bukan disembunyikan.
- **Subdomain berbagi cookie, client tanpa dukungan SameSite, dan endpoint yang menerima GET untuk mengubah data: Tidak dijalankan.** Ini jalur yang disebut R3-19 sebagai alasan SameSite tidak menggantikan token, di luar serangan form POST yang direkam lab ini.
- **`labs/api-t3` tidak diubah.** `dasbor` membaca schema yang sama lewat koneksi sendiri, dengan role `api_t3` yang sudah ada haknya (`SELECT` pada `jurnal`, `posting`, `akun`; `SELECT`/`UPDATE` pada `produk`, dari migrasi `labs/api-t3/migrasi`).

## Uji mutasi

`make -C labs/t3-dasbor mutasi` mengubah satu hal di kode, menjalankan bagian rekaman yang menjaganya, lalu mengembalikan file-nya. Rekaman harus gagal lewat assertion lab (`GAGAL: ...`) atau tes Go yang gagal (`--- FAIL`). Kompilasi rusak atau traceback juga membuat exit tidak nol, tetapi `mutasi.py` menandainya `TANPA-SEBAB` dan menghitungnya menyimpang. Hasil terakhir (2026-10-26):

| Mutasi | Perubahan | Bagian | Hasil |
|---|---|---|---|
| `escape-selalu-rentan` | render dipaksa `innerHTML` walau `-escape` bawaan | `xss` | Dibunuh: elemen `<img>` muncul di skenario B, harus 0 |
| `csp-tidak-pernah-aktif` | header CSP tidak pernah ditulis | `xss` | Dibunuh: dialog muncul lagi di skenario C |
| `cookie-selalu-httponly-salah` | cookie tidak pernah HttpOnly | `xss` | Dibunuh: `document.cookie` bisa dibaca di skenario B, harus kosong |
| `cookie-nama-selalu-aman` | `namaCookie()` selalu `__Host-sesi` | `xss` | Dibunuh: nama cookie salah di skenario A (rentan), harus `sesi` |
| `csrf-gerbang-dimatikan` | gerbang `csrfSah` dimatikan seluruhnya | `csrf` | Dibunuh: harga berubah di skenario D |
| `csrf-origin-dihapus` | pemeriksaan Origin dihapus, token dan Sec-Fetch-Site tetap | `csrf` | **Lolos** (lihat di bawah) |
| `csrf-secfetchsite-dihapus` | pemeriksaan Sec-Fetch-Site dihapus, token dan Origin tetap | `csrf` | **Lolos** (lihat di bawah) |
| `csrf-token-diabaikan` | pemeriksaan token dihapus, Origin dan Sec-Fetch-Site tetap | `csrf` | **Lolos** (lihat di bawah) |
| `samesite-selalu-none` | atribut `SameSite` dipaksa `None` walau `-samesite` bawaan | `csrf` | Dibunuh: harga berubah di skenario C (cookie kini sungguh terkirim) |
| `pagar-menerima-semua-alamat` | `pagar.Loopback` menerima alamat apa saja | `go-test` | Dibunuh oleh tes Go `internal/pagar` |

Tujuh dari sepuluh mutasi dibunuh. Tiga lolos, dan ketiganya bukan pemeriksaan yang percuma.

Form HTML polos Dimas gagal di **ketiga** pemeriksaan sekaligus. Chromium mengirim `Sec-Fetch-Site: cross-site` dan `Origin` lintas situs untuk navigasi form. Form juga tidak bisa memasang header `X-CSRF-Token` sama sekali. Jadi menghapus satu pemeriksaan saja masih menyisakan dua yang lain menolak serangan yang sama persis; baru saat ketiganya hilang sekaligus (`csrf-gerbang-dimatikan`) serangan ini lewat.

Ini bukti redundansi yang diukur, bukan pemeriksaan tanpa guna. Ketiganya tetap perlu untuk serangan lain yang tidak dicoba lab ini: token yang bocor lewat jalur lain, Origin yang dipalsukan lewat proxy, atau client yang tidak mengirim Sec-Fetch-Site sama sekali.

## Keterbatasan uji

- Hasil Origin dan Sec-Fetch-Site bergantung pada perilaku Chromium versi Playwright `situs/` hari ini. Client lama yang tidak mengirim kedua header itu tidak diuji di sini.
- `csrf.txt` skenario D sengaja memakai `SameSite=None` untuk membuktikan token sendirian; ini bukan konfigurasi yang disarankan ADR 30 (yang memakai `SameSite=Lax` sebagai lapis tambahan, bukan pengganti token).
- Satu mesin: client (Chromium), dasbor, halaman serangan, dan PostgreSQL berjalan di satu laptop. Hasil tidak bergantung pada waktu, tetapi bergantung pada versi Chromium yang dipasang Playwright.
