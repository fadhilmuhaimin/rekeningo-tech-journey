# Lab t3-dasbor · dasbor kecil Wulan, mode rentan dan benar

Lab untuk masalah M25 Tahap 3 (`plan/CERITA-TAHAP-3.md` bagian 4) dan ADR 30 (Keamanan 5). Setiap Ani membuka "Riwayat penerimaan" di dasbor, muncul kotak peringatan berisi angka 1. Dimas menaruh `<img src=x onerror=alert(1)>` di catatan satu pembayaran ke Warung Ani, untuk mencoba. Lab ini merekam apa yang terjadi di browser sungguhan saat dasbor menampilkan catatan itu apa adanya, dan apa yang menahannya.

Server dan data awal adalah milik `labs/api-t3` lewat `dasar_t3.py`, tanpa salinan dan tanpa mengubah satu pun file `labs/api-t3/`. Yang baru: dua program Go kecil (`go/cmd/dasbor`, `go/cmd/serangan`), satu penggerak Playwright (`js/driver.js`), dan rekamannya (`run.py`).

`dasbor` membaca schema `tahap3` langsung dari database, dengan query yang sama dengan `RiwayatPenerimaan` di `labs/api-t3/internal/repo/katalog.go`. Ia tidak memanggil server api-t3 lewat HTTP. Semua serangan hanya terhadap proses lokal di mesin ini.

`dasbor` dan `serangan` hanya mau mendengar di loopback (`go/internal/pagar`, pola yang sama dengan `labs/t3-mitm`): alamat lain, termasuk `0.0.0.0` dan alamat tanpa host, ditolak dengan `GAGAL:` sebelum membuka port. `run.py` memberi keduanya `127.0.0.1:<port>` secara harfiah (dicek dengan `lsof`: hanya `127.0.0.1`), jadi bind tidak bergantung pada resolver. Browser tetap membuka `http://localhost:<port>` untuk dasbor dan `http://penyerang.localhost:<port>` untuk halaman Dimas; Chromium me-resolve keduanya ke loopback sendiri (RFC 6761 §6.3).

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

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar: dasbor 18200, halaman serangan 18201; keduanya belum dipakai lab Tahap 3 lain. Teks rekaman selalu memakai port dasar, jadi `output/` sama di semua lajur.

Setiap bagian membuat ulang schema `tahap3` dan data awalnya dari nol lewat `labs/api-t3`. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan.

| Bagian | File | Peran |
|---|---|---|
| `go/cmd/dasbor` | Dasbor Ani (port 18200) | Login, `GET /dasbor`, `GET /api/riwayat`, `POST /api/menu/harga`; lima sumbu mode lewat flag (`-escape`, `-csp`, `-cookie`, `-samesite` dengan nilai `none` dan `default`, `-token`) |
| `go/cmd/serangan` | Halaman Dimas (port 18201, host `penyerang.localhost`) | Satu form tersembunyi yang langsung submit POST ke dasbor begitu halaman dimuat |
| `js/driver.js` | Chromium lewat Playwright | `xss`, `xss-lawan-csrf`, `csrf`, `webauthn`: satu proses Chromium per panggilan, hasil ditulis sebagai satu baris JSON |

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `xss.txt` | A: innerHTML tanpa escape, tanpa CSP, cookie tanpa HttpOnly. B: textContent, CSP, cookie `__Host-`. C: innerHTML tetap dipakai tapi CSP tetap menahan (dengan laporan pelanggaran dari browser). D: XSS mengalahkan CSRF yang benar. E: textContent saja, CSP mati | 3.22, 3.23 |
| `csrf.txt` | A: tanpa token, `SameSite=None`. B: `SameSite=Lax` saja. C: token dan Origin/Sec-Fetch-Site, `SameSite=Lax`. D: token dan Origin/Sec-Fetch-Site saat `SameSite=None` (token sendirian diuji). E: atribut `SameSite` tidak ditulis. F: token milik sesi lain. Tiap skenario mencatat status, isi jawaban, dan ada tidaknya header `Cookie` pada POST lintas situs | 3.23 |
| `webauthn.txt` | Percobaan WebAuthn dengan authenticator virtual lewat Chrome DevTools Protocol (R3-20, R3-82) | 3.23 |

## Cara merekam

Setiap bagian memanggil `dasar_t3.buat_schema()` dan `seed()` dari `labs/api-t3`. Bagian `xss` lalu menyalakan api-t3 sungguhan, login sebagai Dimas, dan mengirim `POST /transfers` Rp5.000 ke Warung Ani dengan catatan `<img src=x onerror=alert(1)>` — persis M25, bukan data buatan tangan. api-t3 lalu dihentikan; `dasbor` lab ini membaca baris itu langsung dari `jurnal` dan `posting`.

Bukti perilaku browser datang dari Chromium nyata lewat Playwright, bukan dari membaca kode. `js/driver.js` login lewat form HTML sungguhan, menunggu navigasi, lalu membaca `document.cookie`, jumlah elemen `<img>` nyata di DOM, dan dialog `alert()` yang benar-benar muncul; Playwright mencatatnya lewat event `dialog` dan menutupnya sendiri. Token sesi dan token CSRF acak tiap kali lab jalan. `driver.js` tidak pernah mengembalikan nilainya mentah-mentah, hanya "bisa dibaca atau tidak", supaya rekaman tetap identik di setiap jalan.

Harga yang tidak berubah belum membuktikan sebab penolakan: permintaan tanpa cookie (401), permintaan yang ditolak gerbang CSRF (403), dan permintaan yang tidak pernah sampai meninggalkan harga yang sama. Karena itu `driver.js` menangkap POST lintas situs di sisi browser (status, isi jawaban, ada tidaknya header `Cookie`, `Sec-Fetch-Site`, dan `Origin`), dan `run.py` menuntut jenis penolakannya. Untuk CSP, driver memasang pendengar `securitypolicyviolation` sebelum halaman dimuat: browser sendiri melaporkan direktif yang memblokir (`script-src-attr`, event handler inline), jadi 0 dialog di skenario C bukan kebetulan.

Halaman serangan Dimas dijalankan di host `penyerang.localhost`, bukan sekadar port lain di `localhost`. Keduanya punya *site* yang berbeda menurut aturan `SameSite` (RFC 6265bis §5.2): `localhost` bukan domain yang terdaftar di Public Suffix List, jadi setiap label sebelum `.localhost` dihitung sebagai *site*-nya sendiri. `*.localhost` di-resolve ke `127.0.0.1` tanpa DNS oleh OS dan oleh Chromium sendiri (RFC 6761 §6.3); dicek langsung di mesin ini dengan `python3 -c "import socket; socket.gethostbyname('penyerang.localhost')"`.

Harga produk 1 (Nasi goreng, Warung Ani) dipakai sebagai bukti CSRF: sebelum dan sesudah serangan dibandingkan lewat SQL langsung (status, bukan waktu), sama seperti bukti saldo di lab ledger.

## Yang terekam (Rekaman lab)

**XSS tersimpan (M25).**

- **A, mode rentan.** `escape=rentan`, `csp=mati`, `cookie=rentan`. Dialog `alert()` dengan pesan `"1"` muncul — persis cerita M25. Satu elemen `<img>` nyata terbentuk di `#daftar` lewat `innerHTML`. `document.cookie` bisa dibaca skrip dan memuat nama cookie sesi (cookie tanpa HttpOnly): skrip yang sama bisa membaca token sesi Ani, bukan hanya menampilkan dialog. Lab tidak mengirim token itu ke mana pun; yang terekam hanya "bisa dibaca".
- **B, mode benar.** `textContent` tidak pernah menafsir string sebagai HTML: 0 elemen `<img>`, 0 dialog, payload tetap terlihat pembaca sebagai teks biasa. Cookie `__Host-sesi` dengan HttpOnly: `document.cookie` kosong.
- **C, innerHTML tetap dipakai tapi CSP tetap aktif.** 1 elemen `<img>` tetap terbentuk (escape memang rentan di skenario ini), tetapi 0 dialog: CSP (`script-src 'nonce-...'` tanpa `'unsafe-inline'`) menolak atribut `onerror` sebagai sumber skrip, terlepas dari bagaimana elemen itu masuk DOM (R3-80). Browser sendiri melaporkan satu pelanggaran (`script-src-attr`, `inline`). D memakai `escape=rentan` dan `csp=mati`: dialog muncul, jadi CSP satu-satunya yang berbeda dari C.
- **E, `textContent` saja, CSP mati.** 0 elemen `<img>`, 0 dialog, 0 pelanggaran CSP, payload terlihat sebagai teks. Escape sendirian cukup untuk payload ini. Dengan C, keduanya masing-masing cukup sendirian; hanya saat keduanya mati sekaligus (A, D) `onerror` berjalan.
- **D, XSS mengalahkan CSRF.** `escape=rentan`, `csp=mati`, cookie dan token CSRF tetap bawaan benar. Dialog tetap muncul, lalu skrip yang sama memanggil `fetch('/api/menu/harga', ...)` dengan `credentials: 'same-origin'` dan token CSRF yang ia baca dari variabel global halaman sendiri (`window.csrf`). Jawabannya 200 dan harga berubah dari Rp25.000 ke Rp2, walau token, Origin, Sec-Fetch-Site, dan cookie `__Host-` semuanya benar. Skrip tidak menembus pemeriksaan itu; ia berjalan sebagai halaman itu sendiri, jadi semuanya lolos secara sah (R3-19: "XSS mengalahkan semua mitigasi CSRF"). Cookie di D berstatus `HttpOnly`, dan aksinya tetap terjadi: `HttpOnly` melarang skrip membaca cookie, bukan memakainya lewat `fetch` (MDN Set-Cookie).

**CSRF.**

- **A, tanpa token, `SameSite=None;Secure`.** Form lintas situs Dimas berhasil: cookie terkirim, jawaban 200, harga berubah ke Rp1, versi naik satu kali.
- **B, `SameSite=Lax` saja, masih tanpa token.** Serangan yang sama ditolak: harga tidak berubah. Browser mencatat POST lintas situs itu tanpa header `Cookie`, dan dasbor menjawab 401 `belum login` (R3-81). Pemeriksaan token tidak pernah tercapai.
- **C, token dan Origin/Sec-Fetch-Site, `SameSite=Lax`.** Sama dengan B: tanpa `Cookie`, 401. Karena cookie tidak pernah sampai, tidak ada rekaman browser yang bisa membedakan satu pemeriksaan dari yang lain di skenario ini (lihat "Uji mutasi").
- **D, token dan Origin/Sec-Fetch-Site diperiksa, cookie `SameSite=None`.** Cookie kali ini sungguh terkirim (`Cookie` ada, `Sec-Fetch-Site: cross-site`, `Origin` asing), dan dasbor menjawab 403 `csrf`: token, Origin, dan Sec-Fetch-Site sendirian yang menahan, bukan atribut cookie. Skenario ini yang membuktikan tiga pemeriksaan itu bekerja, bukan hanya tertulis di kode.
- **E, atribut `SameSite` tidak ditulis, tanpa token.** Serangan berhasil: cookie terkirim, 200, harga Rp1. Itu cocok dengan masa tenggang dua menit untuk `Lax` bawaan (MDN Set-Cookie, R3-81). Lab tidak menunggu dua menit, jadi batas waktunya sendiri tidak diukur. Yang menahan di B adalah `Lax` yang ditulis eksplisit.
- **F, token milik sesi lain.** Dua sesi (Ani dan Sari) dalam dua konteks browser. Token Ani dipakai di sesi Sari: 403 `csrf`. Kontrolnya token Sari sendiri di sesi Sari: lolos gerbang CSRF dan baru ditolak karena produk 1 milik Ani (403 `produk bukan milik akun ini`). Token yang sama untuk semua sesi tidak akan lolos dari skenario ini.

**WebAuthn (R3-20, R3-82).** `navigator.credentials.create()` lewat authenticator virtual Chrome DevTools Protocol berhasil tanpa interaksi manusia: dokumentasi resmi CDP WebAuthn adalah halaman pengalihan yang tidak terbaca lewat fetch sederhana, tetapi lab membuktikan langsung bahwa domain itu menjalankan ceremony sungguhan, bukan hanya pengalihan.

## Temuan yang mengubah cara M25 dan ADR 30 ditulis

1. Escaping dan CSP adalah dua lapis independen, bukan satu lapis yang diulang: skenario C menunjukkan CSP sendirian menahan `onerror` walau HTML sempat masuk DOM. ADR 30 menulis keduanya, bukan memilih salah satu.
2. "SameSite=Lax saja sudah cukup" tidak benar secara umum (R3-19), tetapi untuk serangan form POST yang paling sederhana, SameSite=Lax yang ditulis eksplisit sudah menahannya di Chromium versi lab ini (R3-81), sebelum token sempat diperiksa (B: tanpa `Cookie`, 401). Bila atributnya tidak ditulis, serangan yang sama lewat (E). Klaim "token wajib" perlu skenario yang membuat cookie tetap terkirim (D) supaya benar-benar teruji, dan skenario token sesi lain (F) supaya "terikat sesi" juga teruji.
3. XSS mengalahkan CSRF bukan dengan memalsukan permintaan lintas situs, tetapi dengan tidak perlu melakukannya: skrip yang berjalan karena stored XSS sudah berada di origin yang benar, dengan cookie dan token yang benar. Pertahanan CSRF tidak dirancang untuk melawan XSS (R3-19); keduanya harus ditulis sebagai dua ancaman terpisah di ADR 30, bukan satu dianggap mencakup yang lain.
4. Cookie tanpa HttpOnly menambah satu akibat XSS: token sesi bisa dibaca skrip (`cookieJSBisaDibaca` di A). Dengan HttpOnly, skrip yang berjalan tetap bisa bertindak atas nama Ani (D). HttpOnly mengurangi akibat XSS; ia tidak menggantikan escape dan CSP.
5. Chrome DevTools Protocol WebAuthn menjalankan ceremony sungguhan (R3-82), bukan hanya pengalihan seperti catatan riset sebelumnya menduga: halaman pembaca bisa memakai klaim ini untuk membedakan "passkey belum diuji" dari "passkey tidak bisa diuji".

## Dependency lab

Tidak ada dependency baru. Go memakai `github.com/jackc/pgx/v5` dan `golang.org/x/crypto/bcrypt` pada versi yang sama dengan `labs/api-t3` (pgx v5.11.0, x/crypto v0.57.0; hash `go.sum` identik). Node memakai Playwright yang sudah dipasang `situs/` (`situs/node_modules`, lewat `NODE_PATH`); lab ini tidak menambah `package.json` atau `node_modules` sendiri.

## Yang tidak ada di lab ini

- **Login passkey penuh (registrasi tersimpan di server, verifikasi signature oleh relying party, assertion login): Tidak dijalankan.** Itu butuh pustaka WebAuthn sisi server (mis. go-webauthn) sebagai dependency baru di luar lingkup dasbor kecil ini, dan perlu ADR tersendiri. Lab ini hanya membuktikan ceremony sisi browser (`navigator.credentials.create`) bisa diselesaikan lewat authenticator virtual.
- **Browser selain Chromium (Firefox, Safari, Chromium versi lain): Tidak dijalankan.** Perilaku `SameSite=Lax` dan CSP yang direkam adalah perilaku Chromium versi Playwright `situs/` memakainya hari ini.
- **Android dan iOS (WebView, Chrome Custom Tabs): Tidak dijalankan.** Dasbor Tahap 3 adalah halaman web biasa, dibuka dari laptop warung (PRD v3), bukan dari dalam app Flutter.
- **HTTPS sungguhan: Tidak dijalankan.** Dasbor berjalan di `http://localhost`. MDN Set-Cookie menulis bahwa situs `http:` tidak bisa memasang cookie `Secure`, dan syarat `https:` diabaikan bila yang memasangnya `localhost`. Karena itu `__Host-sesi` (yang mensyaratkan `Secure`) terpasang tanpa TLS di rekaman B sampai E; ini pengecualian `localhost`, bukan bukti bahwa `__Host-` jalan di `http://` biasa. Cookie dari `*.localhost` tidak dicoba (halaman Dimas tidak memasang cookie). Produksi butuh HTTPS sungguhan; batas ini dicatat, bukan disembunyikan.
- **Subdomain berbagi cookie, client tanpa dukungan SameSite, dan endpoint yang menerima GET untuk mengubah data: Tidak dijalankan.** Ini jalur yang disebut R3-19 sebagai alasan SameSite tidak menggantikan token, di luar serangan form POST yang direkam lab ini.
- **`labs/api-t3` tidak diubah.** `dasbor` membaca schema yang sama lewat koneksi sendiri, dengan role `api_t3` yang sudah ada haknya (`SELECT` pada `jurnal`, `posting`, `akun`; `SELECT`/`UPDATE` pada `produk`, dari migrasi `labs/api-t3/migrasi`).

## Uji mutasi

`make -C labs/t3-dasbor mutasi` mengubah satu hal di kode, menjalankan bagian rekaman atau tes Go yang menjaganya, lalu mengembalikan file-nya. Pembunuh yang sah adalah assertion lab (`GAGAL: ...`) atau tes Go yang gagal (`--- FAIL`). Kompilasi rusak atau traceback juga membuat exit tidak nol, tetapi `mutasi.py` menandainya `TANPA-SEBAB` dan menghitungnya menyimpang. Hasil terakhir (2026-10-26, sesudah tinjauan):

| Mutasi | Perubahan | Penjaga | Hasil |
|---|---|---|---|
| `escape-selalu-rentan` | render dipaksa `innerHTML` walau `-escape` bawaan | `xss` | Dibunuh: elemen `<img>` muncul di skenario B, harus 0 |
| `csp-tidak-pernah-aktif` | header CSP tidak pernah ditulis | `xss` | Dibunuh: dialog muncul lagi di skenario C |
| `cookie-selalu-httponly-salah` | cookie tidak pernah HttpOnly | `xss` | Dibunuh: `document.cookie` bisa dibaca di skenario B, harus kosong |
| `cookie-nama-selalu-aman` | `namaCookie()` selalu `__Host-sesi` | `xss` | Dibunuh: nama cookie salah di skenario A (rentan), harus `sesi` |
| `csrf-gerbang-dimatikan` | gerbang `csrfSah` dimatikan seluruhnya | `csrf` | Dibunuh: harga berubah di skenario D |
| `csrf-origin-dihapus` | pemeriksaan Origin dihapus | tes Go | Dibunuh: `TestCsrfSahMenolakOriginAsing` |
| `csrf-origin-dihapus@rekaman` | sama | `csrf` | **Lolos** (lihat di bawah) |
| `csrf-secfetchsite-dihapus` | pemeriksaan Sec-Fetch-Site dihapus | tes Go | Dibunuh: `TestCsrfSahMenolakSecFetchSiteLintasSitus` |
| `csrf-secfetchsite-dihapus@rekaman` | sama | `csrf` | **Lolos** (lihat di bawah) |
| `csrf-token-diabaikan` | pemeriksaan token dihapus | tes Go | Dibunuh: `TestCsrfSahMenolakTokenSalahAtauKosong` |
| `csrf-token-diabaikan@rekaman` | sama | `csrf` | **Lolos** (lihat di bawah) |
| `csrf-token-sama-semua-sesi` | token CSRF sama untuk semua sesi | `csrf` | Dibunuh: skenario F, token Ani diterima di sesi Sari |
| `samesite-selalu-none` | atribut `SameSite` dipaksa `None` walau `-samesite` bawaan | `csrf` | Dibunuh: harga berubah di skenario C (cookie kini sungguh terkirim) |
| `samesite-tidak-ditulis` | atribut `SameSite` tidak ditulis | `csrf` | Dibunuh: serangan lewat di skenario B (Lax bawaan browser) |
| `csp-unsafe-inline-ditambah` | `'unsafe-inline'` ditambah di samping nonce | `xss` | **Lolos** (lihat di bawah) |
| `csrf-query-tanpa-format` | `?csrf=` disisipkan ke `<script>` tanpa memeriksa format | tes Go | Dibunuh: `TestDasborQueryCsrfTidakBisaMenyisipSkrip` |
| `pagar-menerima-semua-alamat` | `pagar.Loopback` menerima alamat apa saja | tes Go | Dibunuh: `TestLoopbackHanyaMenerimaAlamatLokal` |
| `pagar-akhiran-localhost-longgar` | akhiran `localhost` tanpa titik diterima | tes Go | Dibunuh: `TestLoopbackHanyaMenerimaAlamatLokal` |

Empat baris lolos, dan tiap satu punya sebab yang sah.

**Tiga pemeriksaan gerbang CSRF di rekaman browser.** Form HTML polos Dimas gagal di ketiga pemeriksaan sekaligus. Chromium mengirim `Sec-Fetch-Site: cross-site` dan `Origin` lintas situs untuk navigasi form, dan form tidak bisa memasang header `X-CSRF-Token` sama sekali. Menghapus satu pemeriksaan saja masih menyisakan dua yang lain; baru saat ketiganya hilang (`csrf-gerbang-dimatikan`) serangan ini lewat. Ini bukti redundansi yang diukur, dan rekaman browser memang tidak bisa memisahkannya. Tes Go bisa: ia memanggil `csrfSah` dengan satu pelanggaran per tes, jadi ketiga mutasi itu mati di sana.

**`'unsafe-inline'` di samping nonce.** Browser mengabaikan `'unsafe-inline'` bila direktif memuat nonce atau hash (MDN, panduan CSP), jadi event handler `onerror` tetap diblokir dan skenario C tetap lolos. Ini mutan setara di Chromium versi lab, bukan celah rekaman. Kesimpulan untuk halaman: nonce menutup event handler inline walau `'unsafe-inline'` ikut tertulis, tetapi jangan mengandalkannya; client tanpa dukungan nonce tidak diuji.

## Keterbatasan uji

- Hasil Origin dan Sec-Fetch-Site bergantung pada perilaku Chromium versi Playwright `situs/` hari ini. Client lama yang tidak mengirim kedua header itu tidak diuji di sini.
- `csrf.txt` skenario D sengaja memakai `SameSite=None` untuk membuktikan token sendirian; ini bukan konfigurasi yang disarankan ADR 30 (yang memakai `SameSite=Lax` sebagai lapis tambahan, bukan pengganti token).
- Dasbor lab mengirim token CSRF lewat query di redirect login, lalu halaman menghapusnya dari URL. `labs/api-t3` mengirimnya di body JSON. Query bocor ke riwayat browser dan log akses sebelum dihapus; jangan menyalin pola ini ke produksi. Nilai `?csrf=` yang bukan token 32 byte hex dibuang (tanpa itu query menjadi reflected XSS saat `-csp` mati; `TestDasborQueryCsrfTidakBisaMenyisipSkrip`).
- Skenario E tidak menunggu dua menit, jadi batas masa tenggang `Lax` bawaan tidak diukur.
- Satu mesin: client (Chromium), dasbor, halaman serangan, dan PostgreSQL berjalan di satu laptop. Hasil tidak bergantung pada waktu, tetapi bergantung pada versi Chromium yang dipasang Playwright.
