"""Uji mutasi defensif atas labs/api-t4/internal/unduh (fetcher gambar versi aman) dan internal/klien.

    make -C labs/t4-ssrf mutasi                 (±20 menit; butuh Go dan Docker; image golang:1.27-alpine sudah ada lokal)
    make -C labs/t4-ssrf mutasi MUTAN="D03 L05" (hanya mutan itu)

Satu perubahan per mutan (atau satu kelompok perubahan untuk mutan gabungan C*) dibuat pada salinan di folder sementara,
tidak pernah di repo. Tes dikompilasi di host menjadi biner Linux lalu dijalankan di container tanpa jaringan
(--network none): mutan yang melemahkan pemeriksaan alamat tidak bisa menyambung ke mana pun selain loopback container
itu sendiri. Mutan "TERTANGKAP" berarti suite gagal (tes bawaan api-t4 dan tes bertag t4ssrf); "LOLOS" berarti suite
tetap hijau dan mutan itu harus dijelaskan (setara perilaku atau lapis pertahanan ganda). Tabel hasilnya di README lab.
Hasil tidak ditulis ke output/ karena lamanya dan bergantung mesin; yang dicetak adalah tabel ringkas.
"""
import concurrent.futures, json, os, pathlib, re, shutil, subprocess, sys, tempfile

REPO = pathlib.Path(__file__).resolve().parent.parent / "api-t4"
KERJA = pathlib.Path(tempfile.mkdtemp(prefix="t4ssrf-mutasi-"))
ARCH = subprocess.run(["go", "env", "GOARCH"], capture_output=True, text=True).stdout.strip()

U, K = "internal/unduh/unduh.go", "internal/klien/klien.go"
PREFIX = ["0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24",
          "203.0.113.0/24", "240.0.0.0/4", "64:ff9b::/96", "2002::/16", "2001::/32", "100::/64",
          "64:ff9b:1::/48", "100:0:0:1::/64", "2001::/23", "2001:db8::/32", "3fff::/20", "5f00::/16", "::/96", "fec0::/10",
          "192.88.99.0/24"]
NL = "\n"
T2, T3, T4 = "\t\t", "\t\t\t", "\t\t\t\t"

# (id, [(berkas, lama, baru), ...], apa). Tiap pola harus cocok tepat satu kali.
M = []
def m(i, f, lama, baru, apa):
    M.append((i, [(f, lama, baru)], apa))
def gabung(i, pasang, apa):
    M.append((i, pasang, apa))

m("U01", U, "ip = ip.Unmap()" + NL, "", "bentuk IPv4-mapped tidak dinormalkan")
m("U02", U, "return !a.IzinkanLoopback", "return false", "loopback selalu boleh")
m("U03", U, "return !a.IzinkanLoopback", "return true", "loopback selalu ditolak, juga untuk tes")
m("U04", U, "ip.IsPrivate() || ", "", "IsPrivate dibuang")
m("U05", U, "ip.IsLinkLocalUnicast() || ", "", "link-local unicast dibuang")
m("U06", U, "ip.IsLinkLocalMulticast() || ip.IsInterfaceLocalMulticast() ||", "", "multicast skop tautan dan antarmuka dibuang")
m("U07", U, "ip.IsMulticast() || ", "", "IsMulticast dibuang")
m("U08", U, " || ip.IsUnspecified()", "", "IsUnspecified dibuang")
for n, x in enumerate(PREFIX):
    m(f"P{n+1:02d}", U, f'"{x}",', "", f"awalan {x} dibuang dari daftar")
m("W01", U, '"2001::/23"', '"2001::/16"', "2001::/23 diperlebar jadi /16")
m("W02", U, '"100.64.0.0/10"', '"100.64.0.0/9"', "CGNAT diperlebar jadi /9")
m("W03", U, '"100.64.0.0/10"', '"100.64.0.0/11"', "CGNAT dipersempit jadi /11")
m("W04", U, '"198.18.0.0/15"', '"198.18.0.0/16"', "benchmark dipersempit jadi /16")
m("W05", U, '"240.0.0.0/4"', '"240.0.0.0/5"', "cadangan dipersempit jadi /5")
m("W06", U, '"2002::/16"', '"2002::/17"', "6to4 dipersempit jadi /17")
m("W07", U, '"64:ff9b::/96"', '"64:ff9b::/112"', "NAT64 dipersempit jadi /112")
m("N01", U, "if ip.IsLoopback() {", "if false {", "pemeriksaan loopback dibuang")
m("S01", U, 'u.Scheme != "https" &&', 'u.Scheme != "http" &&', "skema https dan http tertukar")
m("S02", U, '(a.IzinkanHTTP && u.Scheme == "http")', '(u.Scheme == "http")', "http selalu boleh")
m("S03", U, "u.User != nil || ", "", "userinfo di URL diterima")
m("L01", U, "BatasWaktu = 3 * time.Second", "BatasWaktu = 4 * time.Second", "batas waktu 4 detik")
m("L02", U, "BatasUkuran = 2 << 20", "BatasUkuran = 3 << 20", "batas ukuran 3 MiB")
m("L03", U, "io.LimitReader(resp.Body, maks+1)", "io.LimitReader(resp.Body, maks)", "pembaca dipotong tepat di batas")
m("L04", U, "if int64(len(isi)) > maks {", "if int64(len(isi)) >= maks {", "tepat 2 MiB ditolak")
m("L05", U, "if resp.ContentLength > maks {", "if false {", "Content-Length tidak diperiksa")
m("L06", U, "if resp.ContentLength > maks {", "if resp.ContentLength >= maks {", "Content-Length tepat di batas ditolak")
m("L07", U, "ctx, batal := context.WithTimeout(ctx, waktu)", "ctx, batal := context.WithCancel(ctx)", "context tanpa batas waktu (client masih punya Timeout)")
m("N04", U, "maks = BatasUkuran", "maks = BatasUkuran * 2", "batas ukuran bawaan digandakan")
m("N05", U, "waktu = BatasWaktu", "waktu = 2 * BatasWaktu", "batas waktu bawaan digandakan")
m("R01", U, "if resp.StatusCode >= 300 && resp.StatusCode < 400 {", "if false {", "pemeriksaan 3xx dibuang")
m("R02", K, "return http.ErrUseLastResponse", "return nil", "redirect diikuti")
m("R03", K, "Timeout: timeout,", "Timeout: 0,", "client tanpa Timeout (context masih membatasi)")
m("T01", U, "if resp.StatusCode != http.StatusOK {" + NL + T2 + "return Gambar{}, ErrGagal",
  "if resp.StatusCode >= 400 {" + NL + T2 + "return Gambar{}, ErrGagal", "semua status di bawah 400 diterima")
m("T02", U, "tipe := http.DetectContentType(isi)" + NL + "\tswitch tipe {",
  'tipe := resp.Header.Get("Content-Type")' + NL + "\tswitch tipe {", "tipe dari header, bukan byte")
m("T03", U, '"image/gif", ', "", "GIF tidak diterima")
m("T04", U, ', "image/webp"', "", "WebP tidak diterima")
m("T05", U, '"image/jpeg", ', "", "JPEG tidak diterima")
m("T06", U, 'case "image/png",', 'case "text/plain; charset=utf-8", "image/png",', "teks biasa diterima sebagai gambar")
m("E01", U, "case errors.Is(err, ErrTujuan):" + NL + "\t\treturn ErrTujuan", "case false:" + NL + "\t\treturn ErrTujuan", "ErrTujuan dari dial tidak dipetakan")
m("E02", U, "case errors.Is(err, context.DeadlineExceeded):", "case false:", "DeadlineExceeded tidak dipetakan sendiri")
m("E03", U, "return ErrTidakMenjawab" + NL + "\t}" + NL + "\treturn ErrGagal", "return ErrGagal" + NL + "\t}" + NL + "\treturn ErrGagal", "timeout jaringan jadi ErrGagal")
m("N02", U, "return Gambar{}, ErrBukanGambar", 'return Gambar{}, fmt.Errorf("%w: %s", ErrBukanGambar, isi[:min(len(isi), 50)])', "pesan bukan-gambar memuat awal isi respons")
m("N03", U, "\treturn ErrGagal" + NL + "}", '\treturn fmt.Errorf("%w: %v", ErrGagal, err)' + NL + "}", "pesan galat transport diteruskan (alamat, sertifikat)")
m("N06", U, "return Gambar{}, ErrTidakMenjawab", "return Gambar{}, ErrTujuan", "nama yang tidak ada dijawab sebagai ditolak")
m("D01", U, "for _, x := range semua {" + NL + T3 + "if ip, ok", "for _, x := range semua[:1] {" + NL + T3 + "if ip, ok", "pemeriksaan awal hanya jawaban DNS pertama")
m("D02", U, "semua, err := a.cari(ctx, h) // resolusi kedua", "semua, err := net.DefaultResolver.LookupIPAddr(ctx, h) // resolusi kedua", "resolusi kedua mengabaikan Resolver")
m("D03", U, "err != nil || a.alamatDilarang(ip) {", "err != nil || a.alamatDilarang(ip) && false {", "ControlContext tidak memeriksa alamat")
m("D04", U, "if a.alamatDilarang(ip) {", "if a.alamatDilarang(ip) && false {", "pemeriksaan awal alamat literal dibuang")
m("D05", U, "ok && a.alamatDilarang(ip) {", "ok && a.alamatDilarang(ip) && false {", "pemeriksaan awal hasil resolusi dibuang")
m("N07", U, "ok && a.alamatDilarang(ip) {", "ok && a.alamatDilarang(ip.Unmap()) && ip.Is4() {", "pemeriksaan awal hasil resolusi hanya IPv4")
m("D06", U, "Proxy:           nil,", "Proxy:           http.ProxyFromEnvironment,", "proxy dari lingkungan dipakai")
m("D07", U, "DisableKeepAlives: true,", "DisableKeepAlives: false,", "koneksi dipakai ulang")
m("D08", U, "klien.BaruDenganTransport(waktu, tr)", "klien.BaruDenganTransport(0, tr)", "client tanpa Timeout dari pembuat")
m("H01", U, "MaxResponseHeaderBytes: BatasHeader,", "", "batas header jawaban dibuang")
m("H02", U, "BatasHeader = 64 << 10", "BatasHeader = 1 << 20", "batas header jawaban 1 MiB")
m("H03", U, "BatasHeader = 64 << 10", "BatasHeader = 16 << 10", "batas header jawaban 16 KiB")
m("X01", U, "for _, x := range semua {" + NL + T3 + "if ip, ok", "for _, x := range semua[:min(len(semua), 8)] {" + NL + T3 + "if ip, ok", "pemeriksaan awal hanya 8 jawaban DNS pertama")
m("X02", U, "if ip, err := netip.ParseAddr(host); err == nil {", "if ip, err := netip.ParseAddr(host); err == nil && false {", "alamat literal dianggap nama (pemeriksaan awal lewat resolver)")
gabung("C01", [(U, "ctx, batal := context.WithTimeout(ctx, waktu)", "ctx, batal := context.WithCancel(ctx)"),
               (K, "Timeout: timeout,", "Timeout: 0,"), (U, "Timeout: waktu,", "Timeout: 0,")], "semua batas waktu dibuang (context, client, dialer)")
gabung("C02", [(U, "case errors.Is(err, context.DeadlineExceeded):", "case false:"),
               (U, "return ErrTidakMenjawab" + NL + "\t}" + NL + "\treturn ErrGagal", "return ErrGagal" + NL + "\t}" + NL + "\treturn ErrGagal")], "tidak ada pemetaan timeout sama sekali")
gabung("C03", [(U, "Proxy:           nil,", "Proxy:           http.ProxyFromEnvironment,"),
               (U, "DisableKeepAlives: true,", "DisableKeepAlives: false,")], "proxy lingkungan dan keep-alive")

# Mutan tambahan dari peninjau (seri V). Lebar awalan: tiap awalan di alamatKhusus diperlebar dan dipersempit satu bit,
# kecuali yang sudah ada di W01 sampai W07 dan yang setara karena tumpang tindih dengan awalan lain.
m("V01", U, 'ip = ip.WithZone("")' + NL, "", "zona IPv6 tidak dibuang sebelum dicocokkan")
LEBAR = [("0.0.0.0/8", "0.0.0.0/7", "0.0.0.0/9"), ("192.0.0.0/24", "192.0.0.0/23", "192.0.0.0/25"),
         ("192.0.2.0/24", "192.0.2.0/23", "192.0.2.0/25"), ("198.18.0.0/15", "198.18.0.0/14", None),
         ("198.51.100.0/24", "198.51.100.0/23", "198.51.100.0/25"), ("203.0.113.0/24", "203.0.113.0/23", "203.0.113.0/25"),
         ("64:ff9b::/96", "64:ff9b::/95", "64:ff9b::/97"), ("2002::/16", "2002::/15", None),
         ("100::/64", "100::/63", "100::/65"), ("64:ff9b:1::/48", "64:ff9b:1::/47", "64:ff9b:1::/49"),
         ("100:0:0:1::/64", "100:0:0:1::/63", "100:0:0:1::/65"), ("2001::/23", "2001::/22", "2001::/24"),
         ("2001:db8::/32", "2001:db8::/31", "2001:db8::/33"), ("3fff::/20", "3fff::/19", "3fff::/21"),
         ("5f00::/16", "5f00::/15", "5f00::/17"), ("::/96", "::/95", "::/97"), ("fec0::/10", "fec0::/9", "fec0::/11"),
         ("192.88.99.0/24", "192.88.99.0/23", "192.88.99.0/25")]
n = 10
for asal, lebar, sempit in LEBAR:
    m(f"V{n}", U, f'"{asal}"', f'"{lebar}"', f"{asal} diperlebar jadi {lebar.split('/')[1] and '/' + lebar.split('/')[1]}")
    n += 1
    if sempit:
        m(f"V{n}", U, f'"{asal}"', f'"{sempit}"', f"{asal} dipersempit jadi /{sempit.split('/')[1]}")
        n += 1
m("V50", U, "TLSClientConfig: a.TLSConfig,", "TLSClientConfig: &tls.Config{InsecureSkipVerify: true},", "sertifikat server tidak diverifikasi")
m("V51", K, "Transport: tr,", "Transport: nil,", "client memakai transport bawaan, bukan yang memeriksa alamat")
m("V52", U, " || u.Hostname() == \"\"", "", "host kosong sesudah nomor port tidak ditolak di awal")
m("V54", U, "if err != nil || u.Host == \"\" ||", "if u.Host == \"\" ||", "galat URL.Parse diabaikan")
m("V59", U, "if _, err := netip.ParseAddr(h); err == nil {", "if _, err := netip.ParseAddr(h); err != nil {", "dial: nama dihubungi langsung, alamat literal lewat resolver")
m("V61", U, "resp.StatusCode >= 300 && resp.StatusCode < 400", "resp.StatusCode >= 301 && resp.StatusCode < 400", "status 300 tidak dihitung pengalihan")
m("V62", U, "resp.StatusCode >= 300 && resp.StatusCode < 400", "resp.StatusCode >= 300 && resp.StatusCode <= 400", "status 400 dihitung pengalihan")
m("V63", U, 'case "image/png", "image/jpeg", "image/gif", "image/webp":', 'case "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp":', "BMP diterima")
m("V64", U, 'case "image/png", "image/jpeg", "image/gif", "image/webp":', 'case "image/png", "image/jpeg", "image/gif", "image/webp", "image/x-icon":', "ICO diterima")
m("V66", U, "io.LimitReader(resp.Body, maks+1)", "io.LimitReader(resp.Body, 2*maks)", "pembaca dibatasi dua kali lipat batas")
m("V69", U, "maks = BatasUkuran", "maks = BatasUkuran - 1", "batas ukuran bawaan satu byte kurang")
m("V70", U, "waktu = BatasWaktu", "waktu = BatasWaktu / 2", "batas waktu bawaan separuh")
m("V71", U, "h, _, err := net.SplitHostPort(address)\n\t\t\tif err != nil {\n\t\t\t\treturn ErrTujuan", "h, _, err := net.SplitHostPort(address)\n\t\t\tif err != nil {\n\t\t\t\treturn nil", "ControlContext: alamat tak terurai lolos")
m("V74", U, "c, err := dialer.DialContext(ctx, network, net.JoinHostPort(x.IP.String(), port))", "_ = x" + NL + T4 + "c, err := dialer.DialContext(ctx, network, net.JoinHostPort(h, port))", "dial: nama dihubungi lagi, bukan alamat hasil resolusi kedua")
m("V75", U, "for _, x := range semua {" + NL + T4 + "c, err := dialer.DialContext", "for _, x := range semua[:1] {" + NL + T4 + "c, err := dialer.DialContext", "dial hanya ke alamat pertama")
m("V80", U, "MaxResponseHeaderBytes: BatasHeader,", "MaxResponseHeaderBytes: 2 * BatasHeader,", "batas header jawaban dua kali lipat")
m("V81", U, "BatasHeader = 64 << 10", "BatasHeader = 48 << 10", "batas header jawaban 48 KiB")
m("V90", K, "return http.ErrUseLastResponse", 'return errors.New("pengalihan")', "CheckRedirect mengembalikan galat, bukan jawaban pertama")
m("V95", U, "ip.IsMulticast() ||", "ip.IsMulticast() && ip.Is4() ||", "multicast IPv6 tidak ditolak")
m("V96", U, "ip.IsPrivate() || ", "ip.IsPrivate() && ip.Is4() || ", "ULA IPv6 tidak ditolak")


def jalankan(mut):
    i, pasang, apa = mut
    d = KERJA / i
    if d.exists():
        shutil.rmtree(d)
    (d / "internal").mkdir(parents=True)
    shutil.copytree(REPO / "internal/klien", d / "internal/klien")
    shutil.copytree(REPO / "internal/unduh", d / "internal/unduh")
    (d / "go.mod").write_text("module lab/apit4\n\ngo 1.27\n")
    if i != "BASE":
        for berkas, lama, baru in pasang:
            teks = (d / berkas).read_text()
            if teks.count(lama) != 1:
                return dict(id=i, apa=apa, hasil=f"LEWAT-POLA ({teks.count(lama)}x)", gagal=[])
            (d / berkas).write_text(teks.replace(lama, baru))
    env = dict(os.environ, GOOS="linux", GOARCH=ARCH, CGO_ENABLED="0")
    b = subprocess.run(["go", "test", "-tags", "t4ssrf", "-c", "-o", str(d / "unduh.test"), "./internal/unduh"], cwd=d, env=env, capture_output=True, text=True)
    if b.returncode != 0:
        return dict(id=i, apa=apa, hasil="TIDAK-TERKOMPILASI", gagal=[b.stderr.strip()[:300]])
    try:
        r = subprocess.run(["docker", "run", "--rm", "--network", "none", "-v", f"{d}:/t:ro", "golang:1.27-alpine", "/t/unduh.test", "-test.count=1", "-test.timeout=120s"],
                           capture_output=True, text=True, timeout=240)
    except subprocess.TimeoutExpired:
        return dict(id=i, apa=apa, hasil="TERTANGKAP-TIMEOUT", gagal=[])
    nama = sorted(set(re.findall(r"^--- FAIL: (\w+)", r.stdout + r.stderr, flags=re.M)))
    hasil = "LOLOS" if r.returncode == 0 else "TERTANGKAP"
    return dict(id=i, apa=apa, hasil=hasil, gagal=nama, rc=r.returncode)


if __name__ == "__main__":
    pilih = sys.argv[1:]
    daftar = [x for x in M if not pilih or x[0] in pilih]
    if "BASE" in pilih:
        daftar = [("BASE", [], "kontrol tanpa perubahan")]
    hitung = {}
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
            for h in ex.map(jalankan, daftar):
                hitung[h["hasil"]] = hitung.get(h["hasil"], 0) + 1
                print(f'{h["id"]:5} {h["hasil"]:20} {h["apa"]}' + (f'  <- {", ".join(h["gagal"][:2])}' if h["hasil"].startswith("TERTANGKAP") else ""), flush=True)
    finally:
        shutil.rmtree(KERJA, ignore_errors=True)
    print("ringkasan:", hitung)
