"""Rekam lab API Tahap 1 versi naskah (keputusan 132): curl -i ke server Go + PostgreSQL 17 (schema tahap1).

Setiap halaman Tahap 1 yang memakai lab ini mendapat satu file di output/. Database dibuat ulang dari nol
setiap kali dijalankan. Header Date dan token acak disamarkan supaya rekaman ulang mudah dibandingkan.
Lab gagal keras bila port sudah dipakai, atau bila hasilnya tidak sesuai yang diharapkan (keputusan 79, 95).

    make -C labs/api-t1 run      (butuh: Docker, Go; PostgreSQL dijalankan lewat labs/b3-race)
"""
import filecmp, hashlib, json, os, pathlib, re, shutil, socket, subprocess, sys, tempfile, time

HERE = pathlib.Path(__file__).parent
OUT = HERE / "output"
PORT = 18083
URL = f"http://127.0.0.1:{PORT}"
DB = "postgres://lab:lab@127.0.0.1:54333/lab?search_path=tahap1&application_name=api-t1"
ENV = dict(os.environ, DATABASE_URL=DB, TZ="Asia/Jakarta")   # waktu di response sama di mesin mana pun
# Tes Go membaca TEST_DATABASE_URL, tidak pernah DATABASE_URL milik server (1.32); DATABASE_URL dibuang dari env tes.
ENV_TES = dict({k: v for k, v in ENV.items() if k != "DATABASE_URL"}, TEST_DATABASE_URL=DB)
DB_LAIN = "postgres://lab:lab@127.0.0.1:54333/postgres?application_name=api-t1"   # database lain di server yang sama
PSQL = ["docker", "compose", "-f", str(HERE / "../b3-race/docker-compose.yml"), "exec", "-T", "db",
        "psql", "-U", "lab", "-d", "lab", "-q"]
BIN = HERE / "api-t1"
srv = None
log = []
samaran = {}


def gagal(pesan):
    stop()
    raise SystemExit("GAGAL: " + pesan)


WAKTU = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)")


def samarkan(teks):
    # Stempel waktu dulu: tanggalnya diganti label hari (bila ada), jamnya disamarkan.
    teks = WAKTU.sub(lambda m: f"{samaran.get(m.group(0)[:10], m.group(0)[:10])}T<jam>{m.group(0)[-6:] if m.group(0)[-6] in '+-' else 'Z'}", teks)
    for asli, label in samaran.items():
        teks = teks.replace(asli, label)
    return teks


def sql(q):
    r = subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-c", "SET search_path = tahap1; " + q],
                       capture_output=True, text=True)
    if r.returncode:
        gagal(r.stderr)
    log.append(f"$ psql -c \"{q}\"\n{samarkan(r.stdout)}")
    return r.stdout


def sql_gagal(q, harus):
    """Perintah yang memang harus ditolak PostgreSQL; pesan error-nya masuk rekaman."""
    r = subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=terse", "-c", "SET search_path = tahap1; " + q],
                       capture_output=True, text=True)   # terse: tanpa DETAIL yang memuat seluruh baris
    if r.returncode == 0 or harus not in r.stderr:
        gagal(f"harus ditolak dengan '{harus}': {q}\n{r.stdout}{r.stderr}")
    log.append(f"$ psql -c \"{q}\"\n{samarkan(r.stderr)}\n")


def samarkan_hari_ini():
    """Tanggal Jakarta hari ini di response diganti <hari ini>, supaya rekaman ulang besok sama."""
    hari_ini = subprocess.run(PSQL + ["-At", "-c", "SELECT to_char((now() AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD')"],
                              capture_output=True, text=True).stdout.strip()
    samaran[hari_ini] = "<hari ini>"


def reset():
    subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1"], input=(HERE / "schema.sql").read_text(),
                   capture_output=True, text=True, check=True)
    subprocess.run([str(BIN), "-seed"], env=ENV, check=True)


def pastikan_bebas(port):
    """Rekaman tidak boleh diam-diam diambil dari server lama yang masih memegang port."""
    try:
        socket.create_connection(("127.0.0.1", port), 0.2).close()
    except OSError:
        return
    gagal(f"port {port} sudah dipakai proses lain; hentikan dulu")


def mulai(*flag, bin=BIN, tampil=None):
    """bin: binary lain (M6 menjalankan v1 dan v2 dari folder VPS tiruan). tampil: baris rekaman pengganti."""
    global srv
    stop()
    pastikan_bebas(PORT)
    srv = subprocess.Popen([str(bin), *flag], env=ENV, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", PORT), 0.2).close()
            break
        except OSError:
            time.sleep(0.05)
    else:
        gagal("server tidak mau menyala")
    log.append((tampil or f"# server: ./api-t1 {' '.join(flag)}".rstrip()) + "\n")


def stop():
    global srv
    if srv:
        srv.terminate()
        for l in srv.communicate()[0].splitlines():
            if "mendengar di" not in l:
                log.append("server log: " + re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d ", "", l) + "\n")
        srv = None


def curl(method, path, body=None, token=None, jenis="application/json", tampil_body=None, tampil_path=None, resp_tampil=None):
    """tampil_body: teks pengganti body panjang di rekaman. tampil_path: path yang ditampilkan (path asli boleh ter-encode)."""
    cmd = ["curl", "-s", "-i", "-X", method, URL + path]
    tampil = f"$ curl -i -X {method} '{tampil_path or path}'"
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
        tampil += f" -H 'Authorization: Bearer {samarkan(token)}'"
    if body is not None:
        cmd += ["-H", f"Content-Type: {jenis}", "--data-binary", body]
        if jenis != "application/json":
            tampil += f" -H 'Content-Type: {jenis}'"
        tampil += f" --data-binary {tampil_body}" if tampil_body else f" -d '{body}'"
    r = subprocess.run(cmd, capture_output=True, text=True).stdout.replace("\r\n", "\n")
    r = "\n".join(l for l in r.splitlines() if not l.startswith(("Date:", "Content-Length:")))
    status = int(r.split()[1]) if r.startswith("HTTP/") else 0
    badan = r.split("\n\n", 1)[1] if "\n\n" in r else ""
    r_log = r if resp_tampil is None else r.replace(badan, resp_tampil)
    log.append(f"{samarkan(tampil)}\n{samarkan(r_log)}\n")
    return status, badan


def login(email, password, label):
    s, b = curl("POST", "/login", json.dumps({"email": email, "password": password}))
    harap(s, 200, f"login {email}")
    token = json.loads(b)["token"]
    samaran[token] = label
    log[-1] = samarkan(log[-1])
    return token


def _log_db():
    return subprocess.run(["docker", "compose", "-f", str(HERE / "../b3-race/docker-compose.yml"), "logs",
                           "--no-log-prefix", "db"], capture_output=True, text=True).stdout.splitlines()


def posisi_log():
    """Jumlah baris log PostgreSQL saat ini; dipakai sebagai penanda awal sebelum request yang diamati."""
    return len(_log_db())


def log_statement(posisi):
    """Statement yang diterima PostgreSQL dari lab ini sesudah penanda posisi (log_statement=all di labs/b3-race)."""
    out = []
    for l in _log_db()[posisi:]:
        if "api-t1|" not in l:
            continue
        m = re.search(r"(?:statement|execute [^:]*): (.*)$", l)
        if m:
            out.append(m.group(1).strip())
    return out


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def header(nama):
    """Nilai header nama dari response terakhir di log (nama tidak peka huruf besar-kecil)."""
    for l in log[-1].splitlines():
        if l.lower().startswith(nama.lower() + ":"):
            return l.split(":", 1)[1].strip()
    return None


TANPA_TOKEN = "Bearer"  # RFC 6750 §3.1: tanpa informasi authentication, tanpa kode error
TOKEN_DITOLAK = 'Bearer error="invalid_token"'


def bagian(judul):
    log.append(f"\n# --- {judul} ---\n")


def tulis(nama):
    stop()
    OUT.mkdir(exist_ok=True)
    (OUT / nama).write_text("".join(log))
    print("ditulis:", (OUT / nama).relative_to(HERE.parent.parent))
    log.clear()


def rekam_login():
    """1.7 Fitur: login karyawan."""
    reset()
    mulai()
    bagian("A. Budi login dengan email perusahaan dan password sementara")
    s, b = curl("POST", "/login", '{"email": "budi@lestari.example", "password": "sementara-419"}')
    harap(s, 200, "login Budi")
    token = json.loads(b)["token"]
    harap(len(token), 64, "panjang token (32 byte acak, hex)")
    samaran[token] = "<token sesi Budi>"
    log[-1] = samarkan(log[-1])

    bagian("B. Password salah, dan email yang tidak terdaftar: jawabannya sama")
    s1, b1 = curl("POST", "/login", '{"email": "budi@lestari.example", "password": "tebakan"}')
    s2, b2 = curl("POST", "/login", '{"email": "tidak.ada@lestari.example", "password": "tebakan"}')
    harap((s1, s2), (401, 401), "status login gagal")
    harap(b1, b2, "body login gagal harus sama")

    bagian("C. Database hanya menyimpan SHA-256 dari token, bukan token yang dipegang HP Budi")
    hash16 = hashlib.sha256(token.encode()).hexdigest()[:16]
    samaran[hash16] = "<16 karakter awal SHA-256 token Budi>"
    hasil = sql("SELECT akun_id, left(token_hash, 16) AS token_hash, kedaluwarsa - now() > interval '7 hours 59 minutes' AS masih_8_jam FROM sesi")
    if token[:16] in hasil or hash16 not in hasil:
        gagal("tabel sesi harus berisi SHA-256 token, bukan token aslinya")

    bagian("D. Request dengan sesi Budi, dan tanpa sesi")
    s, b = curl("GET", "/akun/419", token=token)
    harap((s, json.loads(b)["nama"]), (200, "Budi"), "lihat akun sendiri")
    s, _ = curl("GET", "/akun/419")
    harap((s, header("WWW-Authenticate")), (401, TANPA_TOKEN), "tanpa sesi")

    bagian("E. Logout mematikan sesi di server; token yang sama ditolak")
    s, _ = curl("POST", "/logout", token=token)
    harap(s, 204, "logout")
    s, _ = curl("GET", "/akun/419", token=token)
    harap((s, header("WWW-Authenticate")), (401, TOKEN_DITOLAK), "token setelah logout")
    sql("SELECT count(*) AS sesi_tersisa FROM sesi")
    tulis("login.txt")


def csv_minggu(nominal, ubah=None):
    """CSV top-up 100 karyawan; ubah = {nomor_baris_file: (email, nominal)} untuk baris yang sengaja salah."""
    baris = ["email,nominal"]
    for id_ in range(401, 502):
        if id_ == 418:
            continue
        email = {417: "dimas@lestari.example", 419: "budi@lestari.example"}.get(id_, f"karyawan{id_}@lestari.example")
        baris.append(f"{email},{nominal}")
    for no, (e, n) in (ubah or {}).items():
        baris[no - 1] = f"{e},{n}"
    harap(len(baris), 101, "CSV berisi header + 100 baris")
    return "\n".join(baris) + "\n"


def rekam_topup():
    """1.8 Fitur: top-up oleh admin."""
    reset()
    mulai()
    bagian("A. Admin tunjangan login")
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "<token sesi admin>")

    bagian("B. Senin minggu 1: admin mengunggah CSV 100 karyawan, Rp250.000 per orang")
    csv1 = csv_minggu(250000)
    log.append("$ head -4 minggu-1.csv\n" + "\n".join(csv1.splitlines()[:4]) + "\n... (100 baris + header)\n\n")
    sejak = posisi_log()
    s, b = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%201", csv1, token=admin, jenis="text/csv",
                tampil_body="@minggu-1.csv")
    harap((s, json.loads(b)), (200, {"akun": 100, "total": 25000000}), "top-up minggu 1")

    bagian("C. Isi database sesudahnya: 100 saldo terisi, setiap perubahan punya catatan")
    hasil = sql("SELECT count(*) AS karyawan, sum(saldo) AS total_saldo FROM akun WHERE jenis = 'karyawan'")
    if "25000000" not in hasil:
        gagal("total saldo karyawan harus 25000000")
    sql("SELECT t.id, a.nama, t.nominal, t.admin_id, t.keterangan FROM topup t JOIN akun a ON a.id = t.akun_id ORDER BY t.id LIMIT 3")

    bagian("D. Yang diterima PostgreSQL dari api-t1 selama upload: satu transaction")
    st = log_statement(sejak)
    jumlah = lambda awal: sum(1 for x in st if x.lower().startswith(awal))
    ringkas = [f"begin                      : {jumlah('begin')}",
               f"UPDATE akun SET saldo ... : {jumlah('update akun')}",
               f"INSERT INTO topup ...     : {jumlah('insert into topup')}",
               f"commit                     : {jumlah('commit')}"]
    harap((jumlah("begin"), jumlah("update akun"), jumlah("insert into topup"), jumlah("commit")), (1, 100, 100, 1),
          "isi transaction top-up")
    urut = [x.split()[0].lower() for x in st
            if x.lower().startswith(("begin", "commit", "update akun", "insert into topup"))]
    harap((urut[0], urut[-1]), ("begin", "commit"), "begin di awal, commit di akhir")
    log.append("$ docker compose logs db | grep 'api-t1|'   (diringkas)\n" + "\n".join(ringkas) + "\n\n")

    bagian("E. Minggu 2: CSV dengan dua baris salah ditolak utuh")
    csv2 = csv_minggu(250000, {58: ("karyawan458@lestari.exmaple", 250000), 81: ("karyawan481@lestari.example", "250rb")})
    log.append("$ sed -n '58p;81p' minggu-2.csv\n" + "\n".join(csv2.splitlines()[57:58] + csv2.splitlines()[80:81]) + "\n\n")
    s, b = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%202", csv2, token=admin, jenis="text/csv",
                tampil_body="@minggu-2.csv")
    harap((s, [e["baris"] for e in json.loads(b)["errors"]]), (422, [58, 81]), "CSV minggu 2 ditolak dengan dua baris")
    hasil = sql("SELECT sum(saldo) AS total_saldo, (SELECT count(*) FROM topup) AS catatan FROM akun WHERE jenis = 'karyawan'")
    if "25000000" not in hasil or "100" not in hasil:
        gagal("CSV yang ditolak tidak boleh mengubah saldo atau menambah catatan")

    bagian("F. Budi mencoba top-up untuk dirinya sendiri")
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, _ = curl("POST", "/topup?keterangan=coba", "email,nominal\nbudi@lestari.example,1000000\n", token=budi,
                jenis="text/csv", tampil_body="'email,nominal\\nbudi@lestari.example,1000000'")
    harap(s, 403, "top-up oleh bukan admin")
    sql("SELECT saldo FROM akun WHERE id = 419")

    bagian("G. Admin tidak sengaja mengunggah file minggu 1 sekali lagi")
    s, b = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%201", csv1, token=admin, jenis="text/csv",
                tampil_body="@minggu-1.csv")
    harap(s, 200, "unggahan ulang diterima (belum ada pengaman)")
    hasil = sql("SELECT sum(saldo) AS total_saldo, (SELECT count(*) FROM topup) AS catatan FROM akun WHERE jenis = 'karyawan'")
    if "50000000" not in hasil:
        gagal("unggahan ulang harus menggandakan total (risiko yang direkam)")
    tulis("topup.txt")


def topup_awal():
    """Top-up minggu 1 tanpa menulis detailnya ke rekaman (rinciannya ada di topup.txt)."""
    n = len(log)
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "<token sesi admin>")
    s, _ = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%201", csv_minggu(250000), token=admin,
                jenis="text/csv", tampil_body="@minggu-1.csv")
    harap(s, 200, "top-up awal")
    del log[n:]
    log.append("# persiapan: admin top-up minggu 1, 100 karyawan x Rp250.000 (rinciannya di topup.txt)\n")


def rekam_bayar():
    """1.9 Fitur: bayar ke warung."""
    reset()
    mulai()
    bagian("A. Persiapan")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")

    bagian("B. Budi membayar Rp25.000 ke Warung Ani (akun 418)")
    sejak = posisi_log()
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)), (201, {"id": 1, "saldo": 225000}), "bayar Rp25.000")

    bagian("C. Dua saldo berubah, satu catatan transaksi ditulis")
    hasil = sql("SELECT id, nama, saldo FROM akun WHERE id IN (418, 419) ORDER BY id")
    if "225000" not in hasil or "25000" not in hasil:
        gagal("saldo Budi 225000 dan Warung Ani 25000")
    sql("SELECT id, dari, ke, jumlah FROM transaksi")

    bagian("D. Yang diterima PostgreSQL selama pembayaran: satu transaction")
    st = [x for x in log_statement(sejak) if x.lower().startswith(("begin", "commit", "update akun", "insert into transaksi"))]
    harap([x.split()[0].lower() for x in st], ["begin", "update", "update", "insert", "commit"], "urutan transaction bayar")
    log.append("$ docker compose logs db | grep 'api-t1|'   (hanya statement pembayaran)\n" + "\n".join(st) + "\n\n")

    bagian("E. Budi membayar Rp200.000 ke Warung Sari (502)")
    s, b = curl("POST", "/transfers", '{"ke": 502, "jumlah": 200000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 25000), "bayar Rp200.000")

    bagian("F. Sisa saldo Rp25.000; Budi mencoba membayar Rp30.000")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 30000}', token=budi)
    harap(s, 422, "saldo kurang")
    sql("SELECT saldo FROM akun WHERE id = 419")

    bagian("G. Budi mencoba membayar ke Dimas (karyawan, bukan warung)")
    s, b = curl("POST", "/transfers", '{"ke": 417, "jumlah": 10000}', token=budi)
    harap((s, json.loads(b)["errors"][0]["field"]), (422, "ke"), "ke akun karyawan")

    bagian("H. Ani membuka akun warungnya")
    ani = login("warung.ani@lestari.example", "sementara-418", "<token sesi Warung Ani>")
    s, b = curl("GET", "/akun/418", token=ani)
    harap((s, json.loads(b)["saldo"]), (200, 25000), "saldo Warung Ani")
    tulis("bayar.txt")


def rekam_riwayat():
    """1.10 Fitur: saldo, riwayat, laporan warung."""
    reset()
    mulai()
    bagian("A. Persiapan")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    k420 = login("karyawan420@lestari.example", "sementara-420", "<token sesi Karyawan 420>")
    ani = login("warung.ani@lestari.example", "sementara-418", "<token sesi Warung Ani>")

    bagian("B. Empat pembayaran")
    for token, ke, jumlah in [(budi, 418, 25000), (dimas, 418, 30000), (k420, 418, 40000), (budi, 502, 15000)]:
        s, _ = curl("POST", "/transfers", json.dumps({"ke": ke, "jumlah": jumlah}), token=token)
        harap(s, 201, f"bayar {jumlah} ke {ke}")

    bagian("C. Lab menggeser waktu dua transaksi, supaya laporan berisi tiga hari")
    sql("UPDATE transaksi SET dibuat = dibuat - interval '2 days' WHERE id = 1")
    sql("UPDATE transaksi SET dibuat = dibuat - interval '1 day' WHERE id = 2")
    hari = subprocess.run(PSQL + ["-At", "-c", "SELECT to_char((now() AT TIME ZONE 'Asia/Jakarta')::date - n, 'YYYY-MM-DD') "
                                  "FROM generate_series(2, 0, -1) n"], capture_output=True, text=True).stdout.split()
    harap(len(hari), 3, "tiga tanggal Jakarta")
    for tgl, label in zip(hari, ["<2 hari lalu>", "<kemarin>", "<hari ini>"]):
        samaran[tgl] = label

    bagian("D. Budi membuka riwayatnya: terbaru dulu")
    s, b = curl("GET", "/akun/419/riwayat", token=budi)
    r = json.loads(b)["riwayat"]
    harap((s, [(x["arah"], x["lawan"], x["jumlah"]) for x in r]),
          (200, [("keluar", "Warung Sari", 15000), ("keluar", "Warung Ani", 25000)]), "riwayat Budi")

    bagian("E. Budi mencoba membuka riwayat Warung Ani")
    s, _ = curl("GET", "/akun/418/riwayat", token=budi)
    harap(s, 404, "riwayat milik orang lain")

    bagian("F. Ani membuka laporan tiga hari terakhir")
    s, b = curl("GET", f"/warung/418/laporan?dari={hari[0]}&sampai={hari[2]}", token=ani)
    harap((s, [(x["transaksi"], x["total"]) for x in json.loads(b)["per_hari"]]),
          (200, [(1, 25000), (1, 30000), (1, 40000)]), "laporan per hari")
    sql("SELECT count(*) AS transaksi, sum(jumlah) AS total FROM transaksi WHERE ke = 418")

    bagian("G. Dimas mencoba membuka laporan Warung Ani")
    s, _ = curl("GET", f"/warung/418/laporan?dari={hari[0]}&sampai={hari[2]}", token=dimas)
    harap(s, 404, "laporan milik warung lain")
    tulis("riwayat.txt")


def total():
    """Baris hasil TOTAL sebagai daftar nilai: [total_saldo, total_topup, transaksi]."""
    return [x.strip() for x in sql(TOTAL).split("\n")[2].split("|")]


TOTAL = "SELECT (SELECT sum(saldo) FROM akun) AS total_saldo, (SELECT sum(nominal) FROM topup) AS total_topup, (SELECT count(*) FROM transaksi) AS transaksi"


def rekam_pertukaran():
    """1.11 Pertukaran saldo: tiga hal yang harus selalu benar."""
    reset()
    mulai()
    bagian("A. Persiapan")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")

    bagian("B. Sebelum bayar: semua saldo dijumlah, dan sama dengan semua top-up")
    harap(total(), ["25000000", "25000000", "0"], "total sebelum")
    sql("SELECT id, nama, saldo FROM akun WHERE id IN (418, 419) ORDER BY id")

    bagian("C. Budi membayar Rp25.000 ke Warung Ani")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 225000), "bayar Rp25.000")

    bagian("D. Sesudah bayar: dua saldo berubah, totalnya tidak")
    sql("SELECT id, nama, saldo FROM akun WHERE id IN (418, 419) ORDER BY id")
    harap(total(), ["25000000", "25000000", "1"], "total sesudah")

    bagian("E. Budi membayar Rp200.000 ke Warung Sari; sisa saldonya Rp25.000")
    s, b = curl("POST", "/transfers", '{"ke": 502, "jumlah": 200000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 25000), "bayar Rp200.000")

    bagian("F. Budi mencoba membayar Rp30.000: ditolak, tidak ada yang berubah")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 30000}', token=budi)
    harap(s, 422, "saldo kurang")
    harap(total(), ["25000000", "25000000", "2"], "tidak ada yang berubah")

    bagian("G. Pagar terakhir: UPDATE langsung yang membuat saldo negatif ditolak database")
    sql_gagal("UPDATE akun SET saldo = saldo - 30000 WHERE id = 419", "saldo_tidak_negatif")
    sql("SELECT saldo FROM akun WHERE id = 419")
    tulis("pertukaran.txt")


def rekam_relasi():
    """1.12 Data modeling dan relasi."""
    reset()
    mulai()
    bagian("A. Persiapan: top-up minggu 1, lalu Budi membayar Rp25.000 ke Warung Ani")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap(s, 201, "bayar Rp25.000")

    bagian("B. Relasi di skema minggu 1 (tabel koreksi baru ada sejak minggu 3): setiap foreign key menunjuk ke akun")
    fk = sql("SELECT conrelid::regclass AS tabel, conname AS nama, pg_get_constraintdef(oid) AS aturan "
             "FROM pg_constraint WHERE contype = 'f' AND connamespace = 'tahap1'::regnamespace "
             "AND conrelid <> 'koreksi'::regclass ORDER BY 1, 2")
    harap(fk.count("REFERENCES akun(id)"), 5, "lima foreign key ke akun")

    bagian("C. Transaksi ke akun yang tidak ada ditolak database")
    sql_gagal("INSERT INTO transaksi (dari, ke, jumlah) VALUES (419, 999, 1000)", "transaksi_ke_fkey")

    bagian("D. Warung Ani punya transaksi, jadi akunnya tidak bisa dihapus")
    sql_gagal("DELETE FROM akun WHERE id = 418", "transaksi_ke_fkey")

    bagian("E. Ani mengganti nama warungnya; riwayat Budi menampilkan nama baru, jumlahnya tetap")
    sql("UPDATE akun SET nama = 'Warung Bu Ani' WHERE id = 418")
    samarkan_hari_ini()
    s, b = curl("GET", "/akun/419/riwayat", token=budi)
    r = json.loads(b)["riwayat"]
    harap((s, [(x["lawan"], x["jumlah"]) for x in r]), (200, [("Warung Bu Ani", 25000)]), "riwayat dengan nama baru")
    tulis("relasi.txt")


def rekam_m1():
    """1.14 M1: Nominal minus lolos (mode rentan m1, keputusan 148)."""
    SALDO = "SELECT id, nama, saldo FROM akun WHERE id IN (418, 419) ORDER BY id"
    reset()
    bagian("A. Minggu 1: service belum memeriksa jumlah, skema belum punya constraint uang")
    sql("ALTER TABLE akun DROP CONSTRAINT saldo_tidak_negatif")
    sql("ALTER TABLE transaksi DROP CONSTRAINT jumlah_positif")
    mulai("-rentan", "m1")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")

    bagian("B. Raka menguji sendiri: bayar minus Rp5.000 ke Warung Ani")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": -5000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 255000), "minus lolos")
    hasil = sql(SALDO)
    if "-5000" not in hasil or "255000" not in hasil:
        gagal("saldo Ani -5000 dan Budi 255000")
    harap(total(), ["25000000", "25000000", "1"], "total tetap walau saldo negatif")
    stop()

    bagian("C. Constraint ada di skema, service masih tanpa pemeriksaan")
    reset()
    mulai("-rentan", "m1")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": -5000}', token=budi)
    harap(s, 500, "constraint menolak, tapi app dapat 500")
    sql(SALDO)
    stop()

    bagian("D. Versi benar: service memeriksa jumlah sebelum uang disentuh")
    reset()
    mulai()
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": -5000}', token=budi)
    harap((s, json.loads(b)["errors"][0]["field"]), (422, "jumlah"), "jumlah minus ditolak 422")
    sql(SALDO)
    tulis("m1.txt")


def rekam_http():
    """1.16 HTTP: method, status, header."""
    reset()
    mulai()
    bagian("A. Persiapan")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")

    bagian("B. GET membaca, tidak mengubah apa pun")
    s, _ = curl("GET", "/akun/419", token=budi)
    harap(s, 200, "GET akun sendiri")

    bagian("C. POST membuat satu transaksi: 201 dan header Location")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap(s, 201, "POST transfers")

    bagian("D. Alamat di Location bisa dibuka")
    samarkan_hari_ini()
    s, b = curl("GET", "/transfers/1", token=budi)
    harap((s, json.loads(b)["jumlah"]), (200, 25000), "GET transfers/1")

    bagian("E. Method yang tidak didaftarkan untuk path ini: 405 dan header Allow")
    s, _ = curl("GET", "/transfers", token=budi)
    harap(s, 405, "GET transfers")
    s, _ = curl("DELETE", "/transfers/1", token=budi)
    harap(s, 405, "DELETE transfers/1")

    bagian("F. Tanpa token: 401 dan header WWW-Authenticate")
    s, _ = curl("GET", "/transfers/1")
    harap((s, header("WWW-Authenticate")), (401, TANPA_TOKEN), "tanpa token")

    bagian("G. Dimas membuka transaksi milik Budi: 404, sama dengan transaksi yang tidak ada")
    s, _ = curl("GET", "/transfers/1", token=dimas)
    harap(s, 404, "transaksi orang lain")
    s, _ = curl("GET", "/transfers/999", token=budi)
    harap(s, 404, "transaksi tidak ada")
    tulis("http.txt")


def rekam_m2():
    """1.17 M2: amount lawan jumlah (kontrak yang belum tertulis); E: sesudah ADR 3 (1.18)."""
    reset()
    mulai("-rentan", "m2")
    bagian("A. Persiapan")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")

    bagian("B. App mengirim field amount; server membaca jumlah")
    s, b = curl("POST", "/transfers", '{"ke": 418, "amount": 25000}', token=budi)
    harap((s, json.loads(b)["errors"][0]["field"]), (422, "jumlah"), "amount diabaikan, jumlah 0")
    harap(sql("SELECT saldo FROM akun WHERE id = 419").split()[2], "250000", "saldo Budi tetap")

    bagian("C. App mengirim ke sebagai teks; server mengharapkan angka")
    s, _ = curl("POST", "/transfers", '{"ke": "418", "jumlah": 25000}', token=budi)
    harap(s, 400, "tipe ke salah")
    harap(sql("SELECT saldo FROM akun WHERE id = 419").split()[2], "250000", "saldo Budi tetap")

    bagian("D. Bentuk yang dibaca server")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap(s, 201, "bentuk benar")
    sql("SELECT count(*) AS transaksi FROM transaksi")
    stop()

    bagian("E. Sesudah kontrak (ADR 3): field wajib dan tipe yang salah dijawab 400 dengan namanya")
    mulai()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, b = curl("POST", "/transfers", '{"ke": 418, "amount": 25000}', token=budi)
    harap((s, json.loads(b)["errors"]), (400, [{"field": "jumlah", "pesan": "wajib diisi"}]), "jumlah wajib")
    s, b = curl("POST", "/transfers", '{"ke": "418", "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)["errors"][0]["field"]), (400, "ke"), "tipe ke")
    tulis("m2.txt")


def rekam_m3():
    """1.19 M3: Tanda kutip di pencarian (mode rentan m3, keputusan 157)."""
    reset()
    mulai("-rentan", "m3")
    bagian("A. Persiapan")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")

    bagian("B. Budi mencari warung bernama Ani")
    s, b = curl("GET", "/warung?cari=Ani", token=budi)
    harap((s, [(w["nama"], w.get("saldo")) for w in json.loads(b)["warung"]]),
          (200, [("Warung Ani", 0)]), "cari Ani: saldo ikut terkirim")

    bagian("C. Budi mencari nama dengan tanda kutip")
    s, _ = curl("GET", "/warung?cari=%27%20nasi", token=budi, tampil_path="/warung?cari=' nasi")
    harap(s, 500, "tanda kutip: 500")

    bagian("D. Dimas mencoba ' OR 1=1 -- dan melihat semua akun beserta saldo")
    bocor = ('{"warung":[{"id":400,"jenis":"admin","nama":"Admin Tunjangan","saldo":0},'
             '{"id":418,"jenis":"warung","nama":"Warung Ani","saldo":0},'
             '{"id":419,"jenis":"karyawan","nama":"Budi","saldo":250000},'
             ' ... 99 akun lain, semuanya dengan saldo]}')
    s, b = curl("GET", "/warung?cari=%27%20OR%201%3D1%20--", token=dimas, tampil_path="/warung?cari=' OR 1=1 --", resp_tampil=bocor)
    hasil = json.loads(b)["warung"]
    harap((s, len(hasil) > 100, any(w["jenis"] == "karyawan" for w in hasil)),
          (200, True, True), "injection: semua akun bocor")
    stop()

    reset()
    mulai()
    bagian("E. Versi benar: pencarian memakai parameter query")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    s, b = curl("GET", "/warung?cari=Ani", token=budi)
    harap((s, json.loads(b)["warung"]), (200, [{"id": 418, "nama": "Warung Ani"}]), "cari Ani: hanya id dan nama")

    bagian("F. Tanda kutip dan ' OR 1=1 -- jadi teks biasa, bukan perintah")
    s, b = curl("GET", "/warung?cari=%27%20nasi", token=budi, tampil_path="/warung?cari=' nasi")
    harap((s, json.loads(b)["warung"]), (200, []), "tanda kutip: 0 hasil, bukan 500")
    s, b = curl("GET", "/warung?cari=%27%20OR%201%3D1%20--", token=dimas, tampil_path="/warung?cari=' OR 1=1 --")
    harap((s, json.loads(b)["warung"]), (200, []), "injection jadi teks: 0 hasil")
    tulis("m3.txt")


def diterima_db(posisi):
    """Query pencarian warung yang diterima PostgreSQL sesudah penanda posisi, beserta baris parameternya."""
    time.sleep(0.3)   # log container ditulis asinkron
    out = []
    for l in _log_db()[posisi:]:
        if not l.startswith("api-t1|"):
            continue
        isi = l.split("|", 2)[2]
        if "FROM akun WHERE" in isi or (out and isi.startswith("DETAIL:")):
            out.append(re.sub(r"stmtcache_[0-9a-f]+", "stmtcache_…", isi))
        elif out:
            break
    if not out:
        gagal("query pencarian tidak ada di log PostgreSQL")
    log.append("# yang diterima PostgreSQL (log_statement=all):\n" + "\n".join(out) + "\n\n")
    return out


GOSEC = "github.com/securego/gosec/v2/cmd/gosec@v2.29.0"


def rekam_injection():
    """1.20 Keamanan 1: SQL injection (keputusan 160). Teks SQL vs parameter di log PostgreSQL, lalu gosec."""
    reset()
    mulai("-rentan", "m3")
    bagian("A. Mode rentan: isi pencarian masuk ke teks SQL")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    p = posisi_log()
    s, _ = curl("GET", "/warung?cari=%27%20OR%201%3D1%20--", token=dimas, tampil_path="/warung?cari=' OR 1=1 --",
                resp_tampil="{\"warung\":[ ... semua akun, beserta saldo]}")
    harap(s, 200, "rentan: 200")
    st = diterima_db(p)
    harap(any("LIKE '%' OR 1=1 --%'" in x for x in st) and not any(x.startswith("DETAIL:") for x in st), True,
          "rentan: OR 1=1 ada di teks SQL, tanpa parameter")
    stop()

    reset()
    mulai()
    bagian("B. Versi benar: teks SQL tetap, isi pencarian dikirim terpisah sebagai $1")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    p = posisi_log()
    s, b = curl("GET", "/warung?cari=%27%20OR%201%3D1%20--", token=dimas, tampil_path="/warung?cari=' OR 1=1 --")
    harap((s, json.loads(b)["warung"]), (200, []), "benar: 0 hasil")
    st = diterima_db(p)
    harap(any("|| $1 ||" in x for x in st) and any(x.startswith("DETAIL:  Parameters: $1 = ") for x in st), True,
          "benar: SQL memakai $1, parameter di baris terpisah")
    stop()

    bagian("C. Linter: gosec aturan G201 dan G202 (SQL dibangun dari string)")
    r = subprocess.run(["go", "run", GOSEC, "-fmt=text", "-include=G201,G202", "./..."], cwd=HERE,
                       capture_output=True, text=True)
    # gosec mewarnai keluarannya bila lingkungan terlihat mendukung warna, juga tanpa terminal; kode warna dibuang.
    hasil = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout).replace(str(HERE) + "/", "").replace("\n\n\n", "\n\n").strip()
    harap(("G202" in hasil, "Issues : 1" in hasil, r.returncode != 0), (True, True, True),
          "gosec: tepat satu temuan, di fungsi rentan")
    hasil = "\n".join(l.rstrip() for l in hasil.splitlines())
    log.append(f"$ go run {GOSEC} -include=G201,G202 ./...\n{hasil}\n# exit status {r.returncode}\n")

    bagian("D. Batas parameter: nama kolom tidak bisa jadi $1")
    log.append("# $1 selalu nilai. ORDER BY $1 memberi semua baris nilai yang sama, jadi teks nama DESC tidak berpengaruh.\n")
    a = sql("PREPARE urut(text) AS SELECT id, nama FROM akun WHERE jenis = 'warung' ORDER BY $1; EXECUTE urut('nama DESC');")
    b = sql("SELECT id, nama FROM akun WHERE jenis = 'warung' ORDER BY nama DESC;")
    harap((a.split().index("418") < a.split().index("502"), b.split().index("502") < b.split().index("418")),
          (True, True), "ORDER BY $1 tidak mengurutkan; ORDER BY nama DESC mengurutkan")

    bagian("E. Latihan: draf AI laporan warung (latihan/laporan.go), dites ke database lalu di-lint")
    reset()
    t = subprocess.run(["go", "test", "-v", "-count=1", "./..."], cwd=HERE / "latihan", env=ENV_TES,
                       capture_output=True, text=True)
    keluaran = re.sub(r" \(\d+\.\d+s\)", "", t.stdout)
    keluaran = re.sub(r"(ok\s+lab/latihan)\s+\d+\.\d+s", r"\1", keluaran).strip()
    harap((t.returncode, "division by zero" in keluaran, "urut tidak dikenal" in keluaran), (0, True, True),
          "latihan: draf menjalankan urut sebagai SQL, versi benar menolaknya")
    log.append(f"$ cd latihan && go test -v ./...\n{keluaran}\n")
    r = subprocess.run(["go", "run", GOSEC, "-fmt=text", "-include=G201,G202", "./..."], cwd=HERE / "latihan",
                       capture_output=True, text=True)
    ringkas = "\n".join(l.rstrip() for l in re.sub(r"\x1b\[[0-9;]*m", "", r.stdout).splitlines() if l.strip() and not l.startswith("Results"))
    harap(("Issues : 0" in ringkas, r.returncode), (True, 0), "gosec tidak menandai draf (query di return)")
    log.append(f"$ cd latihan && go run {GOSEC} -include=G201,G202 ./...\n{ringkas}\n")
    log.append("# Draf menjalankan urut sebagai SQL (tes pertama), tapi gosec tidak menandainya:\n"
               "# aturan G202 memeriksa query di assignment (rows, err := ...), bukan yang langsung di return.\n")
    tulis("injection.txt")


PINTAS = """package handler

import (
	"database/sql"
	"net/http"
)

// cariLangsung: pintas buatan AI. Handler menjalankan SQL sendiri, melewati service dan repo.
func cariLangsung(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`SELECT id, nama FROM akun WHERE jenis = 'warung' AND nama ILIKE '%' || $1 || '%'`, r.URL.Query().Get("cari"))
	if err == nil {
		rows.Close()
	}
}
"""


def rekam_lapisan():
    """1.21 Lapisan dasar (keputusan 165): arah import antar lapisan, diperiksa cek_arah.py."""
    bagian("A. Import tiap lapisan, menurut go list")
    r = subprocess.run(["go", "list", "-f", "{{.ImportPath}}: {{join .Imports \" \"}}", "./internal/..."],
                       cwd=HERE, capture_output=True, text=True, check=True)
    log.append("$ go list -f '{{.ImportPath}}: {{join .Imports \" \"}}' ./internal/...\n" + r.stdout.replace("lab/apit1/", "") + "\n")

    bagian("B. Aturan arah: handler tidak tahu SQL, service tidak tahu HTTP, repo tidak tahu aturan uang")
    c = subprocess.run([sys.executable, "cek_arah.py"], cwd=HERE, capture_output=True, text=True)
    harap((c.returncode, c.stdout.count("lolos")), (0, 3), "cek_arah: tiga lapisan lolos")
    log.append(f"$ python3 cek_arah.py\n{c.stdout}# exit status {c.returncode}\n")

    bagian("C. Pintas AI: handler menjalankan SQL sendiri (file sementara internal/handler/pintas_ai.go)")
    f = HERE / "internal/handler/pintas_ai.go"
    try:
        f.write_text(PINTAS)
        log.append("$ cat internal/handler/pintas_ai.go\n" + PINTAS + "\n")
        b = subprocess.run(["go", "build", "./..."], cwd=HERE, capture_output=True, text=True)
        harap(b.returncode, 0, "pintas tetap lolos compile")
        log.append(f"$ go build ./...\n# exit status {b.returncode}: compiler Go tidak tahu soal lapisan\n")
        c = subprocess.run([sys.executable, "cek_arah.py"], cwd=HERE, capture_output=True, text=True)
        harap((c.returncode, "handler: mengimpor database/sql (dilarang)" in c.stdout), (1, True), "cek_arah menolak pintas")
        log.append(f"$ python3 cek_arah.py\n{c.stdout}# exit status {c.returncode}\n")
    finally:
        f.unlink(missing_ok=True)
    tulis("lapisan.txt")


def bayar_banyak(n, jumlah):
    """Persiapan: n karyawan (selain Budi dan Dimas) membayar ke Warung Ani. Rinciannya tidak ditulis ke rekaman."""
    k = len(log)
    ids = [i for i in range(401, 520) if i not in (417, 418, 419)][:n]
    for i in ids:
        t = login(f"karyawan{i}@lestari.example", f"sementara-{i}", f"<token {i}>")
        s, _ = curl("POST", "/transfers", json.dumps({"ke": 418, "jumlah": jumlah}), token=t)
        harap(s, 201, f"bayar karyawan {i}")
    del log[k:]
    log.append(f"# persiapan: {n} karyawan lain masing-masing membayar Rp{jumlah:,} ke Warung Ani\n".replace(",", "."))


BATAS_WARUNG = "ALTER TABLE akun ADD CONSTRAINT batas_saldo_warung CHECK (jenis <> 'warung' OR saldo <= 1500000)"
SALDO_M4 = "SELECT id, nama, saldo FROM akun WHERE id IN (418, 419) ORDER BY id"


def rekam_m4():
    """1.22 M4: Rp70.000 yang hilang (mode rentan m4, keputusan 167)."""
    reset()
    bagian("A. Minggu 2: Raka menambah batas saldo warung langsung di server, lewat psql (tidak ada di schema.sql)")
    sql(BATAS_WARUNG)
    mulai("-rentan", "m4")
    topup_awal()
    bagian("B. Minggu 3, Jumat siang: Warung Ani ramai")
    bayar_banyak(29, 50000)
    harap("1450000" in sql(SALDO_M4), True, "Ani 1.450.000 sebelum Budi")
    harap(total(), ["25000000", "25000000", "29"], "total sebelum Budi")

    bagian("C. Budi membayar Rp70.000; app menampilkan gagal")
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    p = posisi_log()
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 70000}', token=budi)
    harap(s, 500, "UPDATE kedua ditolak batas warung")
    time.sleep(0.3)
    st = [x for x in log_statement(p) if x.lower().startswith(("begin", "commit", "rollback", "update akun", "insert into transaksi"))]
    harap([x.split()[0].upper() for x in st], ["UPDATE", "UPDATE"], "tanpa transaction: dua UPDATE, tanpa BEGIN/ROLLBACK")
    log.append("# yang diterima PostgreSQL (log_statement=all):\n" + "\n".join(st) + "\n\n")
    hasil = sql(SALDO_M4)
    harap(("180000" in hasil, "1450000" in hasil), (True, True), "Budi berkurang, Ani tetap")
    sql("SELECT count(*) AS transaksi_budi FROM transaksi WHERE dari = 419")
    harap(total(), ["24930000", "25000000", "29"], "Rp70.000 hilang dari total")
    stop()

    bagian("D. Versi benar: tiga perubahan dalam satu transaction, batas warung yang sama")
    reset()
    sql(BATAS_WARUNG)
    mulai()
    topup_awal()
    bayar_banyak(29, 50000)
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    p = posisi_log()
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 70000}', token=budi)
    harap(s, 500, "versi benar: tetap gagal")
    time.sleep(0.3)
    st = [x for x in log_statement(p) if x.lower().startswith(("begin", "commit", "rollback", "update akun", "insert into transaksi"))]
    harap([x.split()[0].upper() for x in st], ["BEGIN", "UPDATE", "UPDATE", "ROLLBACK"], "transaction dibatalkan")
    log.append("# yang diterima PostgreSQL (log_statement=all):\n" + "\n".join(st) + "\n\n")
    hasil = sql(SALDO_M4)
    harap(("250000" in hasil, "1450000" in hasil), (True, True), "Budi utuh, Ani tetap")
    harap(total(), ["25000000", "25000000", "29"], "total utuh")
    tulis("m4.txt")


KOREKSI_BUDI = ("SELECT a.saldo, t.topup, k.keluar, m.masuk, x.koreksi, t.topup - k.keluar + m.masuk + x.koreksi AS dari_catatan "
                "FROM akun a, (SELECT coalesce(sum(nominal), 0) AS topup FROM topup WHERE akun_id = 419) t, "
                "(SELECT coalesce(sum(jumlah), 0) AS keluar FROM transaksi WHERE dari = 419) k, "
                "(SELECT coalesce(sum(jumlah), 0) AS masuk FROM transaksi WHERE ke = 419) m, "
                "(SELECT coalesce(sum(jumlah), 0) AS koreksi FROM koreksi WHERE akun_id = 419) x WHERE a.id = 419")


def rekam_koreksi():
    """1.24 ADR 6: tabel koreksi (keputusan 170). Insiden M4, lalu koreksi Rp70.000 yang tercatat."""
    reset()
    bagian("A. Insiden M4 diulang: server minggu 3 (mode rentan m4), batas saldo warung, 29 pembayaran, Budi Rp70.000")
    sql(BATAS_WARUNG)
    mulai("-rentan", "m4")
    topup_awal()
    bayar_banyak(29, 50000)
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    n = len(log)
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 70000}', token=budi)
    harap(s, 500, "insiden M4")
    del log[n:]
    log.append("# Budi membayar Rp70.000: 500, saldo terpotong tanpa baris transaksi (rinciannya di m4.txt)\n")
    harap(total(), ["24930000", "25000000", "29"], "selisih Rp70.000")
    stop()

    bagian("B. Versi benar di-deploy (data tetap). Hanya admin yang boleh mengoreksi, dan alasan wajib")
    mulai()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "<token sesi admin>")
    s, _ = curl("POST", "/koreksi", '{"akun": 419, "jumlah": 70000, "alasan": "saldo saya hilang, tolong kembalikan"}', token=budi)
    harap(s, 403, "karyawan tidak boleh koreksi")
    s, b = curl("POST", "/koreksi", '{"akun": 419, "jumlah": 70000, "alasan": "salah sistem"}', token=admin)
    harap((s, json.loads(b)["errors"][0]["field"]), (422, "alasan"), "alasan terlalu pendek")

    bagian("C. Admin mengoreksi saldo Budi, dengan alasan yang bisa dibaca Keuangan")
    p = posisi_log()
    alasan = "Pembayaran Budi ke Warung Ani, Jumat minggu 3 pukul 12.15, gagal di tengah; saldo terpotong tanpa baris transaksi (M4)"
    s, b = curl("POST", "/koreksi", json.dumps({"akun": 419, "jumlah": 70000, "alasan": alasan}, ensure_ascii=False), token=admin)
    harap((s, json.loads(b)["saldo"]), (201, 250000), "koreksi tercatat")
    time.sleep(0.3)
    st = [x for x in log_statement(p) if x.lower().startswith(("begin", "commit", "rollback", "update akun", "insert into koreksi"))]
    harap([x.split()[0].upper() for x in st], ["BEGIN", "UPDATE", "INSERT", "COMMIT"], "koreksi dalam satu transaction")
    log.append("# yang diterima PostgreSQL (log_statement=all):\n" + "\n".join(st) + "\n\n")
    sql("SELECT akun_id, jumlah, admin_id, alasan FROM koreksi")
    harap(total(), ["25000000", "25000000", "29"], "total kembali")

    bagian("D. Rekonsiliasi akun Budi dari catatan: top-up - keluar + masuk + koreksi")
    hasil = sql(KOREKSI_BUDI)
    harap([x.strip() for x in hasil.split("\n")[2].split("|")], ["250000", "250000", "0", "0", "70000", "320000"],
          "pemotongan M4 tanpa baris: catatan menghitung 320000")
    log.append("# Saldo Rp250.000, catatan menghitung Rp320.000. Pemotongan Rp70.000 di M4 tidak punya baris di tabel mana pun.\n")
    tulis("koreksi.txt")


def persiapan_m5():
    """Top-up minggu 1, lalu Budi membayar Rp25.000 ke Warung Ani supaya saldo Ani tidak nol."""
    topup_awal()
    k = len(log)
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap(s, 201, "Budi bayar Ani")
    del log[k:]
    log.append("# persiapan: Budi membayar Rp25.000 ke Warung Ani (rinciannya di bayar.txt)\n")
    return login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")


def enumerasi(token):
    """Dimas mencoba akun 401 sampai 503 satu per satu. Hanya ringkasannya yang ditulis ke rekaman."""
    status, baris = {}, []
    for i in range(401, 504):
        r = subprocess.run(["curl", "-s", "-w", "\n%{http_code}", "-H", f"Authorization: Bearer {token}",
                            f"{URL}/akun/{i}"], capture_output=True, text=True).stdout
        badan, kode = r.rsplit("\n", 1)
        status[kode] = status.get(kode, 0) + 1
        if kode == "200":
            a = json.loads(badan)
            baris.append(f"{a['id']},{a['nama']},{a['saldo']}")
    log.append("$ for id in $(seq 401 503); do curl -s -H 'Authorization: Bearer <token sesi Dimas>' '/akun/'$id; done\n")
    log.append("# status: " + ", ".join(f"{k} x {v}" for k, v in sorted(status.items())) + "\n")
    # Yang ditampilkan hanya baris 416-420 (Dimas, Warung Ani, Budi dan tetangganya); sisanya dihitung.
    tampil = [x for x in baris if 416 <= int(x.split(",")[0]) <= 420]
    log.append(f"# yang terbaca, disimpan ke saldo.csv (id,nama,saldo), {len(baris)} baris:\n" + "\n".join(tampil) +
               (f"\n... {len(baris) - len(tampil)} baris lain" if len(baris) > len(tampil) else "") + "\n\n")
    return status, baris


def rekam_m5():
    """1.26 M5: Angka di URL (mode rentan m5, keputusan 233)."""
    reset()
    mulai("-rentan", "m5")
    bagian("A. Persiapan: server minggu 4, login dicek, kepemilikan tidak")
    dimas = persiapan_m5()

    bagian("B. Dimas membuka akunnya sendiri, 417")
    s, b = curl("GET", "/akun/417", token=dimas)
    harap((s, json.loads(b)["nama"]), (200, "Dimas"), "akun sendiri")

    bagian("C. Dimas mengganti 417 jadi 418 di URL")
    s, b = curl("GET", "/akun/418", token=dimas)
    harap((s, json.loads(b)["nama"], json.loads(b)["saldo"]), (200, "Warung Ani", 25000), "rentan: saldo Ani terbaca")

    bagian("D. Dimas mencoba semua nomor dari 401 sampai 503")
    status, baris = enumerasi(dimas)
    harap((status, len(baris)), ({"200": 103}, 103), "rentan: 103 akun terbaca")
    harap(any(x.startswith("419,Budi,225000") for x in baris), True, "saldo Budi ikut terbaca")
    stop()

    reset()
    mulai()
    bagian("E. Versi benar: service bertanya apakah yang login pemilik akun itu")
    dimas = persiapan_m5()
    s, _ = curl("GET", "/akun/417", token=dimas)
    harap(s, 200, "benar: akun sendiri")
    s1, b1 = curl("GET", "/akun/418", token=dimas)
    s2, b2 = curl("GET", "/akun/9999", token=dimas)
    harap((s1, s2), (404, 404), "akun orang lain dan akun yang tidak ada: 404")
    harap(b1, b2, "body 418 dan 9999 harus sama")
    log.append("# Jawaban untuk 418 (ada, milik Ani) dan 9999 (tidak ada) sama persis: Dimas tidak bisa membedakannya.\n\n")

    bagian("F. Enumerasi yang sama di versi benar")
    status, baris = enumerasi(dimas)
    harap((status, baris), ({"200": 1, "404": 102}, ["417,Dimas,250000"]), "benar: hanya akun sendiri")
    tulis("m5.txt")


def status_saja(method, path, token=None):
    cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", method, URL + path]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    return int(subprocess.run(cmd, capture_output=True, text=True).stdout)


def rekam_authz():
    """1.28 Authorization (keputusan 237): sesudah login, setiap request ditanya pemilik atau peran."""
    reset()
    mulai()
    samarkan_hari_ini()
    bagian("A. Persiapan: versi benar, Budi membayar Rp25.000 ke Warung Ani (transaksi 1)")
    topup_awal()
    k = len(log)
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "<token sesi admin>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    ani = login("warung.ani@lestari.example", "sementara-418", "<token sesi Warung Ani>")
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap(s, 201, "Budi bayar Ani")
    del log[k:]
    log.append("# persiapan: login admin tunjangan (400), Dimas (417), Warung Ani (418), Budi (419)\n"
               "# persiapan: Budi membayar Rp25.000 ke Warung Ani, transaksi 1 (rinciannya di bayar.txt)\n")

    bagian("B. Satu transaksi, tiga peminta: pembayar, penerima, orang lain")
    s1, b1 = curl("GET", "/transfers/1", token=budi)
    s2, b2 = curl("GET", "/transfers/1", token=ani)
    s3, _ = curl("GET", "/transfers/1", token=dimas)
    harap((s1, s2, s3, b1 == b2), (200, 200, 404, True), "pembayar dan penerima 200, orang lain 404")

    bagian("C. Peran: hanya admin tunjangan yang boleh top-up")
    isi = "email,nominal\nbudi@lestari.example,10000"
    s1, _ = curl("POST", "/topup?keterangan=Uji%20peran", isi, token=budi, jenis="text/csv",
                 tampil_body="'email,nominal\\nbudi@lestari.example,10000'")
    s2, _ = curl("POST", "/topup?keterangan=Uji%20peran", isi, token=admin, jenis="text/csv",
                 tampil_body="'email,nominal\\nbudi@lestari.example,10000'")
    harap((s1, s2), (403, 200), "karyawan 403, admin 200")
    sql("SELECT akun_id, nominal, admin_id, keterangan FROM topup WHERE akun_id = 419 ORDER BY id")
    sql("SELECT saldo FROM akun WHERE id = 419")

    bagian("D. Urutan: login diperiksa sebelum izin")
    s, _ = curl("POST", "/topup?keterangan=Uji%20peran", isi, jenis="text/csv",
                tampil_body="'email,nominal\\nbudi@lestari.example,10000'")
    harap((s, header("WWW-Authenticate")), (401, TANPA_TOKEN), "tanpa token: 401, bukan 403")

    bagian("E. Ringkasan: empat request yang sama dari lima peminta, status saja")
    hari_ini = next(k for k, v in samaran.items() if v == "<hari ini>")
    peminta = [("Budi", budi), ("Ani", ani), ("Dimas", dimas), ("admin", admin), ("tanpa-token", None)]
    request = [("/akun/419", "/akun/419"), ("/akun/419/riwayat", "/akun/419/riwayat"), ("/transfers/1", "/transfers/1"),
               (f"/warung/418/laporan?dari={hari_ini}&sampai={hari_ini}", "/warung/418/laporan")]
    harus = {"/akun/419": [200, 404, 404, 404, 401], "/akun/419/riwayat": [200, 404, 404, 404, 401],
             "/transfers/1": [200, 200, 404, 404, 401], "/warung/418/laporan": [404, 200, 404, 404, 401]}
    log.append("$ for p in Budi Ani Dimas admin tanpa; do curl -s -o /dev/null -w '%{http_code}' ...; done\n"
               "# tanpa = tanpa header Authorization; laporan memakai ?dari=<hari ini>&sampai=<hari ini>\n")
    log.append(f"{'GET':<22}" + "".join(f"{n:>7}" for n in ["Budi", "Ani", "Dimas", "admin", "tanpa"]) + "\n")
    for asli, tampil in request:
        hasil = [status_saja("GET", asli, t) for _, t in peminta]
        harap(hasil, harus[tampil], f"matriks {tampil}")
        log.append(f"{tampil:<22}" + "".join(f"{h:>7}" for h in hasil) + "\n")
    tulis("authz.txt")


# Commit v2 Raka di minggu 5: kolom transaksi.jumlah diganti nominal, supaya sama dengan topup.nominal dan label
# layar. Field JSON ikut berganti. Lab membangun v2 dari salinan kode v1 dengan penggantian di bawah. Setiap
# penggantian harus ditemukan tepat n kali; kalau kode v1 berubah, lab berhenti dengan error.
V2_UBAH = [  # (file, teks v1, teks v2, n)
    ("internal/handler/handler.go", 'Ke     *int64 `json:"ke"`\n\t\tJumlah *int64 `json:"jumlah"`',
     'Ke     *int64 `json:"ke"`\n\t\tJumlah *int64 `json:"nominal"`', 1),
    ("internal/handler/handler.go", '[]string{"ke", "jumlah"}', '[]string{"ke", "nominal"}', 1),
    ("internal/service/bayar.go", 'ErrValidasi{"jumlah", ', 'ErrValidasi{"nominal", ', 1),
    ("internal/repo/transaksi.go", "INSERT INTO transaksi (dari, ke, jumlah)", "INSERT INTO transaksi (dari, ke, nominal)", 2),
    ("internal/repo/transaksi.go", "SELECT id, dari, ke, jumlah, dibuat", "SELECT id, dari, ke, nominal, dibuat", 1),
    ("internal/repo/transaksi.go", 'Jumlah int64     `json:"jumlah"`', 'Jumlah int64     `json:"nominal"`', 1),
    ("internal/repo/riwayat.go", 'Jumlah int64     `json:"jumlah"`', 'Jumlah int64     `json:"nominal"`', 1),
    ("internal/repo/riwayat.go", "a.nama, t.jumlah, t.dibuat", "a.nama, t.nominal, t.dibuat", 1),
    ("internal/repo/riwayat.go", "sum(jumlah)", "sum(nominal)", 1),
]


def bangun_v2(tmp):
    src = tmp / "src-v2"
    src.mkdir()
    for nama in ("go.mod", "go.sum"):
        shutil.copy2(HERE / nama, src / nama)
    for nama in ("cmd", "internal"):
        shutil.copytree(HERE / nama, src / nama)
    for f, lama, baru, n in V2_UBAH:
        teks = (src / f).read_text()
        harap(teks.count(lama), n, f"v2: '{lama}' di {f}")
        (src / f).write_text(teks.replace(lama, baru))
    bin_v2 = tmp / "laptop" / "api-t1"
    subprocess.run(["go", "build", "-o", str(bin_v2), "./cmd/api"], cwd=src, check=True)
    for f, lama, baru, _ in V2_UBAH:
        log.append(f"#   {f:<28} {lama.splitlines()[-1].strip()}  ->  {baru.splitlines()[-1].strip()}\n")
    log.append("$ go build -o laptop:api-t1 ./cmd/api   # di laptop Raka, kode v2\n")
    return bin_v2


def baca_riwayat(token, akun, versi):
    """Satu request app: GET riwayat, lalu membaca transaksi teratas seperti app versi itu membacanya."""
    r = subprocess.run(["curl", "-s", "-m", "2", "-w", "\n%{http_code}", "-H", f"Authorization: Bearer {token}",
                        f"{URL}/akun/{akun}/riwayat"], capture_output=True, text=True).stdout
    badan, kode = r.rsplit("\n", 1)
    if kode == "000":
        return "tidak ada jawaban"
    if kode != "200":
        return kode
    field = "jumlah" if versi == "1.0" else "nominal"   # app 1.0 membaca "jumlah", app 1.1 membaca "nominal"
    item = json.loads(badan)["riwayat"][0]
    return f"200 · {field} {item[field]}" if field in item else f"200 · field {field} tidak ada"


class Prober:
    """Satu putaran per detik: setiap HP membaca riwayatnya sekali. Perintah deploy dijalankan di antara dua putaran,
    jadi rekaman sama di mesin mana pun. Jumlah putaran yang gagal = jumlah perintah, bukan lama perintah itu di VPS."""

    def __init__(self, hp):
        self.hp, self.hasil, self.jam = hp, [], None   # hp: [[nama, token, akun, versi app]]

    def putaran(self, kali=1):
        for _ in range(kali):
            if self.jam is not None:
                time.sleep(max(0.0, self.jam + 1 - time.monotonic()))
            self.jam = time.monotonic()
            hasil = [baca_riwayat(t, a, v) for _, t, a, v in self.hp]
            self.hasil.append(hasil)
            log.append(f"{len(self.hasil):<7}" + "".join(f"{'app ' + h[3] + ' · ' + x:<41}" for h, x in zip(self.hp, hasil)).rstrip() + "\n")

    def ringkasan(self):
        for i, h in enumerate(self.hp):
            hitung = {}
            for baris in self.hasil:
                x = baris[i]
                jenis = "berhasil" if re.fullmatch(r"200 · (jumlah|nominal) \d+", x) else x.replace("200 · ", "")
                hitung[jenis] = hitung.get(jenis, 0) + 1
            log.append(f"# HP {h[0]}: " + ", ".join(f"{v} {k}" for k, v in hitung.items()) + "\n")


def rekam_m6():
    """1.30 M6: Deploy hari Senin (keputusan 241). Deploy v1 ke v2 ala minggu 5 sambil prober memanggil API tiap detik."""
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="api-t1-m6-"))
    try:
        _rekam_m6(tmp)
    finally:
        stop()
        shutil.rmtree(tmp, ignore_errors=True)


def _rekam_m6(tmp):
    reset()
    samarkan_hari_ini()
    log.append("# laptop: adalah folder build di laptop Raka, vps: adalah /opt/rekeningo di VPS. Di lab, keduanya folder sementara.\n")
    bagian("A. Kode v2: kolom transaksi.jumlah diganti nominal, field JSON ikut berganti")
    bin_v2 = bangun_v2(tmp)
    vps = tmp / "vps"
    vps.mkdir()
    shutil.copy2(BIN, vps / "api-t1")

    bagian("B. Persiapan: v1 berjalan, Budi dan Dimas memakai app 1.0")
    mulai(bin=vps / "api-t1", tampil="# server: vps:/opt/rekeningo/api-t1 (v1)")
    topup_awal()
    k = len(log)
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    for token, n in ((budi, 25000), (dimas, 20000)):
        s, _ = curl("POST", "/transfers", json.dumps({"ke": 418, "jumlah": n}), token=token)
        harap(s, 201, "bayar ke Warung Ani di v1")
    del log[k:]
    log.append("# persiapan: login Budi (419) dan Dimas (417); Budi membayar Rp25.000 dan Dimas Rp20.000 ke Warung Ani\n")
    s, b = curl("GET", "/akun/419/riwayat", token=budi)
    harap((s, "jumlah" in json.loads(b)["riwayat"][0]), (200, True), "v1: riwayat memakai field jumlah")

    bagian("C. Deploy: prober memanggil API tiap detik, perintah Raka dijalankan di antara dua putaran")
    log.append("# prober: GET /akun/419/riwayat dari HP Budi dan GET /akun/417/riwayat dari HP Dimas\n"
               "# app 1.0 membaca field \"jumlah\" di riwayat; app 1.1 membaca \"nominal\"\n")
    log.append(f"{'detik':<7}{'HP Budi':<41}HP Dimas\n")
    p = Prober([["Budi", budi, 419, "1.0"], ["Dimas", dimas, 417, "1.0"]])
    p.putaran(2)
    log.append("$ kill -TERM <pid v1>   # v1 berhenti\n")
    stop()
    p.putaran()
    # Naskah: Raka memakai migrate up sejak minggu 3 (1.25). Lab memakai psql supaya mode lock terbaca: satu psql -c
    # adalah satu transaction (dokumentasi psql 17), jadi pg_locks masih melihat lock milik ALTER TABLE.
    log.append("# di cerita: migrate up, file 000006_transaksi_nominal.up.sql berisi ALTER TABLE ini\n"
               "# lab: mode lock dibaca dari pg_locks di transaction yang sama; SELECT ini bukan bagian dari deploy Raka\n")
    kunci = sql("ALTER TABLE transaksi RENAME COLUMN jumlah TO nominal; "
                "SELECT mode FROM pg_locks WHERE relation = 'transaksi'::regclass AND pid = pg_backend_pid()")
    harap("AccessExclusiveLock" in kunci, True, "RENAME COLUMN memegang ACCESS EXCLUSIVE lock")
    p.putaran()
    shutil.copy2(bin_v2, vps / "api-t1")
    log.append("$ cp laptop:api-t1 vps:/opt/rekeningo/api-t1   # di cerita: scp; binary v1 tertimpa\n")
    p.putaran()
    mulai(bin=vps / "api-t1", tampil="$ vps:/opt/rekeningo/api-t1 &   # v2 menyala")
    p.putaran()
    log.append("# Dimas memperbarui app ke 1.1. Budi belum.\n")
    p.hp[1][3] = "1.1"
    p.putaran(2)
    jalan = ["200 · jumlah 25000", "200 · jumlah 20000"]
    mati = ["tidak ada jawaban"] * 2
    harap(p.hasil, [jalan, jalan, mati, mati, mati, ["200 · field jumlah tidak ada"] * 2]
          + [["200 · field jumlah tidak ada", "200 · nominal 20000"]] * 2, "hasil prober per putaran")
    log.append(f"# Ringkasan {len(p.hasil)} putaran:\n")
    p.ringkasan()

    bagian("D. Sesudah deploy: Budi (app 1.0) dan Dimas (app 1.1) membayar Warung Ani")
    s1, b1 = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    s2, _ = curl("POST", "/transfers", '{"ke": 418, "nominal": 20000}', token=dimas)
    harap((s1, json.loads(b1)["errors"][0]["field"], s2), (400, "nominal", 201), "v2: app 1.0 ditolak, app 1.1 diterima")
    saldo = sql("SELECT id, nama, saldo FROM akun WHERE id IN (417, 418, 419) ORDER BY id")
    harap(re.findall(r"\|\s*(\d+)\s*$", saldo, re.M), ["210000", "65000", "225000"], "saldo sesudah dua pembayaran")

    bagian("E. Raka ingin kembali ke v1")
    for label, folder in (("vps:/opt/rekeningo/", vps), ("laptop:", tmp / "laptop")):
        isi = sorted(x.name for x in folder.iterdir())
        harap(isi, ["api-t1"], f"isi {label}")
        log.append(f"$ ls {label}\n" + "\n".join(isi) + "\n")
    harap((filecmp.cmp(vps / "api-t1", bin_v2, shallow=False), filecmp.cmp(vps / "api-t1", BIN, shallow=False)),
          (True, False), "binary di VPS adalah v2, bukan v1")
    log.append("$ cmp vps:/opt/rekeningo/api-t1 laptop:api-t1 && echo sama\nsama\n")
    log.append("# Satu-satunya binary di VPS dan di laptop adalah v2. Binary v1 tertimpa oleh cp (di cerita: scp) ke path yang sama.\n")

    bagian("F. Kalaupun v1 dibangun ulang dari kode v1, kolomnya sudah bernama nominal")
    log.append("$ kill -TERM <pid v2>\n")
    stop()
    mulai(tampil="$ go build -o api-t1 ./cmd/api && ./api-t1 &   # binary v1 dibangun ulang dari kode v1")
    s, _ = curl("GET", "/akun/419/riwayat", token=budi)
    harap(s, 500, "v1 di skema baru: 500")
    log.append("$ kill -TERM <pid v1>\n")
    k = len(log)
    stop()
    harap(any("column t.jumlah does not exist" in x for x in log[k:]), True, "log v1 menyebut kolom t.jumlah")

    bagian("G. Kembali ke v1: kolom dikembalikan ke jumlah, v1 yang dibangun ulang dijalankan")
    log.append("# di cerita: migrate up, file baru 000007_transaksi_jumlah.up.sql berisi ALTER TABLE ini (di server, mundur lewat migration baru)\n")
    sql("ALTER TABLE transaksi RENAME COLUMN nominal TO jumlah")
    mulai(tampil="$ ./api-t1 &   # v1 yang dibangun ulang di bagian F")
    log.append("# prober yang sama, detik dihitung dari v1 menyala. Budi masih app 1.0, Dimas sudah app 1.1.\n")
    log.append(f"{'detik':<7}{'HP Budi':<41}HP Dimas\n")
    p = Prober([["Budi", budi, 419, "1.0"], ["Dimas", dimas, 417, "1.1"]])
    p.putaran(2)
    harap(p.hasil, [["200 · jumlah 25000", "200 · field nominal tidak ada"]] * 2, "v1 sesudah kolom kembali: app 1.0 jalan, app 1.1 tidak")
    log.append("# v2 melayani app 1.1, tidak app 1.0 (bagian C). v1 melayani app 1.0, tidak app 1.1. Dari dua versi yang ada, tidak satu pun melayani keduanya.\n"
               "# Rekaman halaman sesudah 1.30 mulai dari keadaan ini: kolom jumlah, kode v1.\n")
    tulis("m6.txt")

# 1.33 App versi lama + ADR 10 (keputusan 252): expand lalu contract untuk field nominal, lanjutan m6 bagian G.
# Setiap entri: file, teks lama, teks baru, jumlah kemunculan, baris yang ditulis ke rekaman.
EXPAND_UBAH = [
    ("internal/handler/handler.go", 'Jumlah *int64 `json:"jumlah"`',
     'Jumlah *int64 `json:"jumlah"`\n\t\tNominal *int64 `json:"nominal"`', 1, '+ Nominal *int64 `json:"nominal"`   (request bayar)'),
    ("internal/handler/handler.go", 'if p := wajibAda([]string{"ke", "jumlah"}',
     'if in.Jumlah == nil {\n\t\tin.Jumlah = in.Nominal\n\t}\n\tif p := wajibAda([]string{"ke", "jumlah"}', 1,
     '+ if in.Jumlah == nil { in.Jumlah = in.Nominal }'),
    ("internal/repo/transaksi.go", 'Jumlah int64     `json:"jumlah"`',
     'Jumlah int64     `json:"jumlah"`\n\tNominal int64    `json:"nominal"`', 1, '+ Nominal int64 `json:"nominal"`   (GET /transfers/{id})'),
    ("internal/repo/transaksi.go", "\tif errors.Is(err, sql.ErrNoRows) {\n\t\treturn t, ErrTidakAda",
     "\tt.Nominal = t.Jumlah\n\tif errors.Is(err, sql.ErrNoRows) {\n\t\treturn t, ErrTidakAda", 1, "+ t.Nominal = t.Jumlah"),
    ("internal/repo/riwayat.go", 'Jumlah int64     `json:"jumlah"`',
     'Jumlah int64     `json:"jumlah"`\n\tNominal int64    `json:"nominal"`', 1, '+ Nominal int64 `json:"nominal"`   (riwayat)'),
    ("internal/repo/riwayat.go", "&x.Jumlah, &x.Waktu); err != nil {\n\t\t\treturn nil, err\n\t\t}",
     "&x.Jumlah, &x.Waktu); err != nil {\n\t\t\treturn nil, err\n\t\t}\n\t\tx.Nominal = x.Jumlah", 1,
     "+ x.Nominal = x.Jumlah"),
]
# Contract dijalankan di atas kode expand: jumlah tidak dikirim dan tidak dibaca lagi (`json:"-"`).
CONTRACT_UBAH = [
    ("internal/handler/handler.go", 'Jumlah *int64 `json:"jumlah"`', 'Jumlah *int64 `json:"-"`', 1,
     'Jumlah *int64 `json:"jumlah"`  ->  `json:"-"`   (request bayar)'),
    ("internal/handler/handler.go", '[]string{"ke", "jumlah"}', '[]string{"ke", "nominal"}', 1,
     '[]string{"ke", "jumlah"}  ->  []string{"ke", "nominal"}'),
    ("internal/service/bayar.go", 'ErrValidasi{"jumlah",', 'ErrValidasi{"nominal",', 1,
     'ErrValidasi{"jumlah",  ->  ErrValidasi{"nominal",'),
    ("internal/repo/transaksi.go", 'Jumlah int64     `json:"jumlah"`', 'Jumlah int64     `json:"-"`', 1,
     'Jumlah int64 `json:"jumlah"`  ->  `json:"-"`   (GET /transfers/{id})'),
    ("internal/repo/riwayat.go", 'Jumlah int64     `json:"jumlah"`', 'Jumlah int64     `json:"-"`', 1,
     'Jumlah int64 `json:"jumlah"`  ->  `json:"-"`   (riwayat)'),
]


def bangun_dari_v1(tmp, nama, *daftar_ubah):
    """Salinan kode v1 dengan perubahan teks berurutan, dibangun ke tmp/<nama>. Kode lab sendiri tidak disentuh.
    Hanya perubahan dari daftar terakhir yang ditulis ke rekaman."""
    src = tmp / f"src-{nama}"
    src.mkdir()
    for f in ("go.mod", "go.sum"):
        shutil.copy2(HERE / f, src / f)
    for f in ("cmd", "internal"):
        shutil.copytree(HERE / f, src / f)
    for ubah in daftar_ubah:
        for f, lama, baru, n, _ in ubah:
            teks = (src / f).read_text()
            harap(teks.count(lama), n, f"{nama}: '{lama.splitlines()[0]}' di {f}")
            (src / f).write_text(teks.replace(lama, baru))
    b = tmp / nama
    subprocess.run(["go", "build", "-o", str(b), "./cmd/api"], cwd=src, check=True)
    for f, _, _, _, tampil in daftar_ubah[-1]:
        log.append(f"#   {f:<28} {tampil}\n")
    log.append(f"$ go build -o {nama} ./cmd/api\n")
    return b


def ganti_server(p, bin, label):
    """Server lama berhenti, prober berputar sekali tanpa jawaban, server baru menyala."""
    log.append("$ kill -TERM <pid server lama>\n")
    stop()
    p.putaran()
    mulai(bin=bin, tampil=f"$ ./{bin.name} &   # {label} menyala")


def rekam_versi():
    """1.33 App versi lama + ADR 10 (keputusan 252): satu server melayani app 1.0 dan app 1.1, lalu contract."""
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="api-t1-versi-"))
    try:
        _rekam_versi(tmp)
    finally:
        stop()
        shutil.rmtree(tmp, ignore_errors=True)


def _rekam_versi(tmp):
    reset()
    samarkan_hari_ini()
    log.append("# Keadaan awal sama dengan akhir m6.txt bagian G (database bersih): kolom transaksi.jumlah, server v1. App 1.0 membaca field \"jumlah\", app 1.1 membaca \"nominal\".\n"
               "# Di lab, setiap versi server adalah binary di folder sementara.\n")
    bagian("A. Kode expand: field nominal ditambah di samping jumlah, kolom database tidak diubah")
    bin_expand = bangun_dari_v1(tmp, "api-t1-expand", EXPAND_UBAH)
    log.append("# migration: tidak ada. Kolom transaksi.jumlah tetap; nama nominal hanya ada di JSON.\n")

    bagian("B. Keadaan awal: v1 berjalan, Budi memakai app 1.0, Dimas app 1.1")
    mulai(tampil="# server: api-t1 (v1)")
    topup_awal()
    k = len(log)
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    dimas = login("dimas@lestari.example", "sementara-417", "<token sesi Dimas>")
    for token, n in ((budi, 25000), (dimas, 20000)):
        s, _ = curl("POST", "/transfers", json.dumps({"ke": 418, "jumlah": n}), token=token)
        harap(s, 201, "bayar ke Warung Ani di v1")
    del log[k:]
    log.append("# persiapan: login Budi (419) dan Dimas (417); keduanya membayar dari app 1.0 (Rp25.000 dan Rp20.000), lalu Dimas memperbarui app ke 1.1\n")

    bagian("C. Deploy expand: prober memanggil riwayat tiap detik, perintah dijalankan di antara dua putaran")
    log.append(f"{'detik':<7}{'HP Budi':<41}HP Dimas\n")
    p = Prober([["Budi", budi, 419, "1.0"], ["Dimas", dimas, 417, "1.1"]])
    p.putaran()
    ganti_server(p, bin_expand, "server expand")
    p.putaran(2)
    dua = ["200 · jumlah 25000", "200 · nominal 20000"]
    harap(p.hasil, [["200 · jumlah 25000", "200 · field nominal tidak ada"], ["tidak ada jawaban"] * 2, dua, dua],
          "expand: app 1.0 dan app 1.1 sama-sama 200")
    log.append(f"# Ringkasan {len(p.hasil)} putaran:\n")
    p.ringkasan()
    s, b = curl("GET", "/akun/419/riwayat", token=budi)
    x = json.loads(b)["riwayat"][0]
    harap((s, x["jumlah"], x["nominal"]), (200, 25000, 25000), "expand: riwayat mengirim jumlah dan nominal")

    bagian("D. Bayar dari app 1.0 (mengirim jumlah) dan app 1.1 (mengirim nominal) ke server expand")
    s1, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    s2, _ = curl("POST", "/transfers", '{"ke": 418, "nominal": 20000}', token=dimas)
    harap((s1, s2), (201, 201), "expand: kedua bentuk request diterima")
    saldo = sql("SELECT id, nama, saldo FROM akun WHERE id IN (417, 418, 419) ORDER BY id")
    harap(re.findall(r"\|\s*(\d+)\s*$", saldo, re.M), ["210000", "90000", "200000"], "saldo sesudah empat pembayaran")

    bagian("E. Migration expand: kolom baru yang boleh kosong, server expand yang sedang jalan tidak terganggu")
    log.append("# Contoh migration (latihan lab, bukan kejadian di cerita): nomor sesudah 000007 di m6.txt.\n"
               "# 000008_transaksi_catatan.up.sql berisi ALTER TABLE ini. Kode server expand tidak menyebut kolom catatan.\n")
    sql("ALTER TABLE transaksi ADD COLUMN catatan text")
    log.append(f"{'detik':<7}{'HP Budi':<41}HP Dimas\n")
    p = Prober([["Budi", budi, 419, "1.0"], ["Dimas", dimas, 417, "1.1"]])
    p.putaran()
    harap(p.hasil, [dua], "sesudah 000008: riwayat kedua app tetap 200")
    s, _ = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap(s, 201, "sesudah 000008: server expand tetap mencatat pembayaran")
    isi = sql("SELECT count(*) AS transaksi, count(catatan) AS berisi_catatan FROM transaksi")
    harap(re.findall(r"^\s*(\d+)\s*\|\s*(\d+)\s*$", isi, re.M), [("5", "0")], "lima transaksi, catatan kosong semua")

    bagian("F. Contract: jumlah tidak dikirim dan tidak dibaca lagi, sesudah tidak ada app 1.0")
    log.append("# Di lab: Budi memperbarui app ke 1.1, jadi tidak ada lagi HP yang membaca atau mengirim jumlah.\n"
               "# Kode contract = kode expand dengan perubahan ini:\n")
    bin_contract = bangun_dari_v1(tmp, "api-t1-contract", EXPAND_UBAH, CONTRACT_UBAH)
    log.append(f"{'detik':<7}{'HP Budi':<41}HP Dimas\n")
    p = Prober([["Budi", budi, 419, "1.1"], ["Dimas", dimas, 417, "1.1"]])
    p.putaran()
    ganti_server(p, bin_contract, "server contract")
    p.putaran(2)
    baru = ["200 · nominal 25000", "200 · nominal 20000"]
    harap(p.hasil, [baru, ["tidak ada jawaban"] * 2, baru, baru], "contract: app 1.1 tetap 200")
    log.append("# Kalau masih ada satu HP dengan app 1.0, contract mengulang m6.txt bagian D:\n")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)["errors"][0]["field"]), (400, "nominal"), "contract: request app 1.0 ditolak")
    tulis("versi.txt")

# 1.31 Deployment dan rollback (keputusan 247): image per commit, rollback = tag lama, satu container lewat Compose.
DEPLOY = HERE / "deploy"
DB_CONTAINER = DB.replace("127.0.0.1:54333", "db:5432")
GIT_ENV = dict(os.environ, GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM="1",
               GIT_AUTHOR_NAME="Raka", GIT_AUTHOR_EMAIL="raka@lestari.example",
               GIT_COMMITTER_NAME="Raka", GIT_COMMITTER_EMAIL="raka@lestari.example",
               GIT_AUTHOR_DATE="2026-02-09T09:00:00+07:00", GIT_COMMITTER_DATE="2026-02-09T09:00:00+07:00")
IMAGE = "ghcr.io/grup-lestari/rekeningo-api"   # nama fiktif; di lab image hanya dibangun lokal, tidak di-push
KODE_V1 = "f128167"   # main sesudah 1.30 dan K1c; kode api-t1 di commit ini = kode v1 rekaman deploy.txt
HASH_V1, HASH_V2 = "390ff47", "f5ea0b4"   # ditulis di halaman 1.31, t1-deploy.json, t1-deploy-tag.json (keputusan 247)
BUG_RIWAYAT = ("internal/repo/riwayat.go", "WHERE t.dari = $1 OR t.ke = $1", "WHERE t.dari = $1 AND t.ke = $1")


def git(repo, *arg):
    return subprocess.run(["git", *arg], cwd=repo, env=GIT_ENV, capture_output=True, text=True, check=True).stdout


def compose(tag, *arg, boleh_gagal=False):
    env = dict(os.environ, COMPOSE_FILE="compose.yaml:compose.lab.yaml", DATABASE_URL=DB_CONTAINER)
    env.pop("TAG", None)
    if tag:
        env["TAG"] = tag
    r = subprocess.run(["docker", "compose", *arg], cwd=DEPLOY, env=env, capture_output=True, text=True)
    if r.returncode and not boleh_gagal:
        gagal(f"docker compose {' '.join(arg)}: {r.stderr}")
    return r


def hapus_image():
    ada = subprocess.run(["docker", "image", "ls", IMAGE, "--format", "{{.Repository}}:{{.Tag}}"],
                         capture_output=True, text=True).stdout.split()
    if ada:
        subprocess.run(["docker", "image", "rm", "-f", *ada], capture_output=True)


def tunggu_menjawab():
    """Lab menunggu container baru menjawab (401 tanpa token pun dihitung menjawab). Lama jedanya tidak direkam."""
    for _ in range(150):
        kode = subprocess.run(["curl", "-s", "-o", "/dev/null", "-m", "1", "-w", "%{http_code}", f"{URL}/warung"],
                              capture_output=True, text=True).stdout
        if kode not in ("", "000"):
            return
        time.sleep(0.1)
    gagal("container tidak menjawab")


def isi_riwayat(token):
    r = subprocess.run(["curl", "-s", "-m", "2", "-w", "\n%{http_code}", "-H", f"Authorization: Bearer {token}",
                        f"{URL}/akun/419/riwayat"], capture_output=True, text=True).stdout
    badan, kode = r.rsplit("\n", 1)
    if kode == "000":
        return "tidak ada jawaban"
    if kode != "200":
        return kode
    return f"200 · {len(json.loads(badan)['riwayat'])} transaksi"


def image_ls():
    tag = sorted(subprocess.run(["docker", "image", "ls", IMAGE, "--format", "{{.Repository}}:{{.Tag}}"],
                                capture_output=True, text=True).stdout.split())
    log.append(f"$ docker image ls {IMAGE} --format '{{{{.Repository}}}}:{{{{.Tag}}}}' | sort\n" + "".join(x + "\n" for x in tag))
    return tag


def image_container(label):
    i = subprocess.run(["docker", "inspect", "--format", "{{.Image}}", "rekeningo-api-1"],
                       capture_output=True, text=True, check=True).stdout.strip()
    log.append(f"$ docker inspect --format '{{{{.Image}}}}' rekeningo-api-1\n{label}\n")
    return i


def rekam_deploy():
    """1.31 Deployment dan rollback (keputusan 247)."""
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="api-t1-deploy-"))
    try:
        _rekam_deploy(tmp)
    finally:
        compose("x", "down", boleh_gagal=True)
        hapus_image()
        shutil.rmtree(tmp, ignore_errors=True)


def _rekam_deploy(tmp):
    stop()
    compose("x", "down", boleh_gagal=True)
    hapus_image()
    reset()
    samarkan_hari_ini()
    pastikan_bebas(PORT)
    repo = tmp / "rekeningo"
    repo.mkdir()
    # Kode diambil dari commit main yang tetap (keputusan 247), jadi perubahan api-t1 sesudah 1.31 tidak menggeser hash.
    # Dockerfile tetap dari folder lab; kalau ia berubah, harap() di bawah gagal keras.
    arsip = subprocess.run(["git", "archive", "--format=tar", f"{KODE_V1}:labs/api-t1", "go.mod", "go.sum", "cmd", "internal"],
                           cwd=HERE.parents[1], capture_output=True)   # dari root repo: path relatif ke tree labs/api-t1
    if arsip.returncode:
        gagal(f"git archive {KODE_V1}: {arsip.stderr.decode()[-500:]} (clone dangkal? jalankan git fetch --unshallow)")
    subprocess.run(["tar", "-x", "-C", str(repo)], input=arsip.stdout, check=True)
    shutil.copy2(HERE / "Dockerfile", repo / "Dockerfile")
    log.append(f"# repo: kode api-t1 dari commit main {KODE_V1} di repo git sementara. Nama dan tanggal commit tetap, jadi hash sama di setiap rekaman.\n"
               "# Kode v1 = keadaan sesudah 1.30: kolom jumlah, field jumlah. vps: Docker di mesin lab.\n"
               "# lab: COMPOSE_FILE=compose.yaml:compose.lab.yaml; berkas kedua hanya menyambungkan container ke jaringan database lab.\n")

    bagian("A. Satu commit, satu image: tag image = hash commit")
    git(repo, "init", "-q", "-b", "main")
    git(repo, "add", ".")
    git(repo, "commit", "-q", "-m", "api-t1 v1")
    v1 = git(repo, "rev-parse", "--short", "HEAD").strip()
    f, lama, baru = BUG_RIWAYAT
    teks = (repo / f).read_text()
    harap(teks.count(lama), 1, f"bug latihan: '{lama}' di {f}")
    (repo / f).write_text(teks.replace(lama, baru))
    git(repo, "commit", "-q", "-am", "Saring riwayat per akun")
    v2 = git(repo, "rev-parse", "--short", "HEAD").strip()
    harap((v1, v2), (HASH_V1, HASH_V2), "hash commit sama dengan yang ditulis di halaman 1.31 dan widgetnya")
    log.append(f"$ git log --oneline\n{git(repo, 'log', '--oneline')}")
    log.append(f"# commit {v2} adalah latihan lab dengan bug buatan, bukan kejadian di cerita:\n#   {f}  {lama}  ->  {baru}\n")
    for tag in (v1, v2):
        git(repo, "checkout", "-q", tag)
        r = subprocess.run(["docker", "build", "-q", "-t", f"{IMAGE}:{tag}", "."], cwd=repo, capture_output=True, text=True)
        if r.returncode:
            gagal("docker build: " + r.stderr[-3000:])
        log.append(f"$ git checkout -q {tag} && docker build -q -t {IMAGE}:{tag} .   # keluaran build tidak direkam\n")
    harap(image_ls(), sorted([f"{IMAGE}:{v1}", f"{IMAGE}:{v2}"]), "dua image, satu per commit")

    bagian("B. Commit v1 berjalan; Budi membayar Warung Ani")
    r = compose(None, "up", "-d", boleh_gagal=True)
    harap(r.returncode != 0 and "TAG" in r.stderr, True, "tanpa TAG, compose menolak jalan")
    log.append("$ docker compose up -d   # TAG lupa diisi\n" + r.stderr.strip() + "\n")
    compose(v1, "up", "-d")
    log.append(f"$ TAG={v1} docker compose up -d\n")
    tunggu_menjawab()
    topup_awal()
    k = len(log)
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, _ = curl("POST", "/transfers", json.dumps({"ke": 418, "jumlah": 25000}), token=budi)
    harap(s, 201, "Budi bayar ke Warung Ani di v1")
    del log[k:]
    log.append("# persiapan: login Budi (419); Budi membayar Rp25.000 ke Warung Ani\n")
    id_v1 = image_container(f"sha256:<id image {v1}>")
    harap(id_v1, subprocess.run(["docker", "image", "inspect", "--format", "{{.Id}}", f"{IMAGE}:{v1}"],
                                capture_output=True, text=True, check=True).stdout.strip(), "container menjalankan image v1")

    bagian(f"C. Deploy commit {v2}: perintah yang sama, tag lain")
    log.append("# prober: GET /akun/419/riwayat dari HP Budi; perintah dijalankan di antara dua putaran.\n"
               "# Sesudah setiap up -d, lab menunggu container baru menjawab; lama jeda itu tidak diukur.\n")
    log.append(f"{'putaran':<9}HP Budi\n")
    hasil = []
    def putaran(n):
        for _ in range(n):
            x = isi_riwayat(budi)
            hasil.append(x)
            log.append(f"{len(hasil):<9}{x}\n")
            time.sleep(0.2)
    putaran(2)
    compose(v2, "up", "-d")
    log.append(f"$ TAG={v2} docker compose up -d\n")
    tunggu_menjawab()
    putaran(2)
    curl("GET", "/akun/419", token=budi)
    harap(hasil, ["200 · 1 transaksi"] * 2 + ["200 · 0 transaksi"] * 2, "v2: riwayat kosong, status tetap 200")

    bagian(f"D. Rollback: tag {v1} dijalankan lagi, tanpa build ulang")
    compose(v1, "up", "-d")
    log.append(f"$ TAG={v1} docker compose up -d   # rollback\n")
    tunggu_menjawab()
    log.append(f"{'putaran':<9}HP Budi\n")
    putaran(2)
    harap(hasil[4:], ["200 · 1 transaksi"] * 2, "rollback: riwayat kembali")
    harap(image_container(f"sha256:<id image {v1}>"), id_v1, "rollback memakai image yang sama dengan bagian B")
    log.append(f"# Image yang berjalan sama persis dengan bagian B. Image {v2} tetap ada untuk diperiksa:\n")
    image_ls()
    log.append(f"# Ringkasan 6 putaran HP Budi: 4 kali 1 transaksi ({v1}), 2 kali 0 transaksi ({v2}). Saldo Budi tidak berubah.\n"
               "# Rollback ini hanya mengganti kode. Kalau commit baru juga mengubah skema, tag lama gagal seperti m6.txt bagian F.\n")
    tulis("deploy.txt")


def go_test(*args, cwd=HERE, env=ENV_TES):
    """go test tanpa waktu: (0.01s) dan durasi paket dibuang, tab jadi spasi, supaya rekaman ulang sama."""
    r = subprocess.run(["go", "test", *args], cwd=cwd, env=env, capture_output=True, text=True)
    k = re.sub(r" \(\d+\.\d+s\)", "", r.stdout + r.stderr)
    k = re.sub(r"^(ok|FAIL)(\s+\S+)\s+\d+\.\d+s$", r"\1\2", k, flags=re.M)
    return r.returncode, "\n".join(l.rstrip().replace("\t", "  ") for l in k.strip().splitlines())


def salinan_dengan_bug(f, lama, baru):
    """Salinan kode lab di folder sementara dengan satu bug dikembalikan; kode lab sendiri tidak disentuh."""
    d = pathlib.Path(tempfile.mkdtemp(prefix="api-t1-bug-"))
    for x in ["go.mod", "go.sum"]:
        shutil.copy(HERE / x, d)
    for x in ["cmd", "internal"]:
        shutil.copytree(HERE / x, d / x)
    teks = (d / f).read_text()
    if teks.count(lama) != 1:
        gagal(f"bug {f}: teks lama harus muncul tepat sekali")
    (d / f).write_text(teks.replace(lama, baru))
    return d


BUG_M4 = ("internal/service/bayar.go", "return s.pindahkan(ctx, peminta, ke, jumlah)",
          "return s.repo.PindahkanM4(ctx, peminta, ke, jumlah)")


def rekam_testing():
    """1.32 Testing: apa dites di level mana. Tes Go di lab, tanpa dan dengan PostgreSQL, lalu bug lama dikembalikan."""
    tanpa_db = {k: v for k, v in ENV_TES.items() if k != "TEST_DATABASE_URL"}
    bagian("A. Tanpa database, seperti CI pertama di 1.31: TEST_DATABASE_URL tidak diisi")
    rc, k = go_test("-v", "-count=1", "./...", env=tanpa_db)
    harap((rc, k.count("--- PASS: TestBayarMenolakJumlahDiLuarBatas/"), k.count("--- PASS: TestTokenBearer"), k.count("--- SKIP")),
          (0, 3, 1, 4), "tanpa database: unit test lolos (termasuk skema Bearer, K1xc), empat tes database dilewati")
    log.append(f"$ go test -v ./...\n{k}\n# exit status {rc}\n")

    bagian("B. Dengan PostgreSQL (database dibuat ulang dari nol, data awal uji coba Gedung A)")
    reset()
    log.append("# -p 1: paket dites satu per satu, karena tes database di dua paket memakai database yang sama\n")
    rc, k = go_test("-v", "-count=1", "-p", "1", "./...")
    harap((rc, k.count("--- PASS: Test"), "SKIP" in k), (0, 9, False), "dengan database: semua tes lolos")
    log.append(f"$ TEST_DATABASE_URL=postgres://.../lab?search_path=tahap1 go test -v -p 1 ./...\n{k}\n# exit status {rc}\n")

    bagian("C. Bug M4 dikembalikan di salinan kode: Bayar tanpa transaction (1.22)")
    f, lama, baru = BUG_M4
    log.append(f"# {f}: {lama}\n#   menjadi: {baru}\n")
    reset()
    d = salinan_dengan_bug(f, lama, baru)
    rc, k = go_test("-count=1", "-run", "TestBayarGagalTidakMengubahSaldo", "./internal/service/", cwd=d)
    shutil.rmtree(d)
    harap((rc, "saldo Budi 180000, ingin 250000" in k, "total saldo 1630000, ingin 1700000" in k), (1, True, True),
          "regression test M4 gagal untuk bug M4")
    log.append(f"$ go test -run TestBayarGagalTidakMengubahSaldo ./internal/service/\n{k}\n# exit status {rc}\n")

    bagian("D. Bug commit f5ea0b4 dikembalikan di salinan kode: riwayat kosong (1.31)")
    f, lama, baru = BUG_RIWAYAT
    log.append(f"# {f}: {lama}\n#   menjadi: {baru}\n")
    reset()
    d = salinan_dengan_bug(f, lama, baru)
    rc, k = go_test("-count=1", "-run", "TestRiwayatMemuatPembayaran", "./internal/service/", cwd=d)
    shutil.rmtree(d)
    harap((rc, "riwayat akun 419: 0 transaksi" in k, "riwayat akun 418: 0 transaksi" in k), (1, True, True),
          "regression test riwayat gagal untuk bug f5ea0b4")
    log.append(f"$ go test -run TestRiwayatMemuatPembayaran ./internal/service/\n{k}\n# exit status {rc}\n")

    bagian("E. TEST_DATABASE_URL menunjuk database lain: penjaga di siapkan berhenti sebelum menghapus")
    rc, k = go_test("-count=1", "-run", "TestRiwayatMemuatPembayaran", "./internal/service/",
                    env=dict(ENV_TES, TEST_DATABASE_URL=DB_LAIN))
    harap((rc, "bukan database tes lab/tahap1: tidak ada data yang dihapus" in k), (1, True),
          "penjaga menolak database selain lab/tahap1")
    log.append(f"$ TEST_DATABASE_URL=postgres://.../postgres go test -run TestRiwayatMemuatPembayaran ./internal/service/\n{k}\n# exit status {rc}\n")
    tulis("testing.txt")


# --- 1.34 M7: .env di riwayat git (keputusan 259) ---
GITLEAKS = "github.com/zricethezav/gitleaks/v8@v8.30.1"   # rilis resmi terbaru per 2026-10-11; dipasang ke folder sementara
TGL_M7 = {"minggu 1": "2026-01-12T08:30:00+07:00", "minggu 5": "2026-02-11T10:00:00+07:00"}
ROLE_M7 = "rekeningo_app"
# Konfigurasi gitleaks di repo Raka: aturan bawaan ditambah satu aturan untuk password di URL koneksi.
ATURAN_URL = """[extend]
useDefault = true

[[rules]]
id = "url-dengan-password"
description = "Password di dalam URL koneksi database"
regex = '''[a-z][a-z0-9+.-]*://[^:@/\\s]+:([^@/\\s]{8,})@'''
secretGroup = 1
keywords = ["://"]
"""


def palsu(nama):
    """Nilai palsu lab M7: dibangkitkan saat run dari nama tetap, jadi isi commit dan hash-nya sama di setiap rekaman.
    Nilainya tidak pernah ditulis di file repo, dan rekaman menggantinya dengan label (keputusan 259)."""
    huruf = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(huruf[b % len(huruf)] for b in hashlib.sha256(f"rekeningo-lab-m7:{nama}".encode()).digest()[:24])


def env_m7(pw):
    return ("# Postgres di VPS dan URL yang dibaca server (cmd/api membaca DATABASE_URL)\n"
            f"POSTGRES_PASSWORD={pw}\n"
            f"DATABASE_URL=postgres://{ROLE_M7}:{pw}@127.0.0.1:5432/rekeningo\n")


def rekam_m7():
    """1.34 M7: .env di riwayat git (keputusan 259). Repo git sementara, gitleaks, rotasi password, pre-commit hook."""
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="api-t1-m7-"))
    try:
        _rekam_m7(tmp)
    finally:
        subprocess.run(PSQL + ["-c", f"DROP ROLE IF EXISTS {ROLE_M7}"], capture_output=True)
        shutil.rmtree(tmp, ignore_errors=True)


def _rekam_m7(tmp):
    stop()
    lama, baru, latihan = palsu("password-lama"), palsu("password-baru"), palsu("password-latihan")
    bin_dir, repo = tmp / "bin", tmp / "rekeningo"
    subprocess.run(["go", "install", GITLEAKS], env=dict(os.environ, GOBIN=str(bin_dir)), cwd=tmp,
                   check=True, capture_output=True)
    gl = bin_dir / "gitleaks"
    label = {lama: "<password-lama>", baru: "<password-baru>", latihan: "<password-latihan>",
             str(gl): "gitleaks", str(tmp): "<tmp>"}

    def catat(teks):
        for asli, ganti in label.items():
            teks = teks.replace(asli, ganti)
        log.append(teks)

    def g(minggu, *arg, cek=True):
        env = dict(GIT_ENV, GIT_AUTHOR_DATE=TGL_M7[minggu], GIT_COMMITTER_DATE=TGL_M7[minggu])
        r = subprocess.run(["git", *arg], cwd=repo, env=env, capture_output=True, text=True)
        if cek and r.returncode:
            gagal(f"git {' '.join(arg)}: {r.stderr[-500:]}")
        return r

    def rapikan(teks):
        # Warna, jam di awal baris log, dan lama pemindaian berubah tiap run; isinya tidak.
        teks = re.sub(r"\x1b\[[0-9;]*m", "", teks)
        teks = re.sub(r"\n?    ○\n    │╲\n    │ ○\n    ○ ░\n    ░    gitleaks\n\n", "", teks)
        teks = re.sub(r"(?m)^\d{1,2}:\d\d(AM|PM) ", "", teks)
        teks = re.sub(r" in [\d.]+(ns|µs|ms|s|m)\b", " in <durasi>", teks)
        # gitleaks memindai secara paralel, jadi urutan temuan berubah antar-run: diurutkan menurut file dan baris.
        pola = r"(?ms)^Finding:.*?\n\n"
        def kunci(b):
            return (re.search(r"^File:\s+(.*)$", b, re.M).group(1), int(re.search(r"^Line:\s+(\d+)$", b, re.M).group(1)))
        return "".join(sorted(re.findall(pola, teks), key=kunci)) + re.sub(pola, "", teks)

    def scan(*arg):
        r = subprocess.run([str(gl), "git", "--no-banner", "--redact", "-v", *arg, "."], cwd=repo, env=GIT_ENV,
                           capture_output=True, text=True)
        return r.returncode, rapikan(r.stdout + r.stderr)

    def masuk(pw):
        import psycopg
        try:
            with psycopg.connect(host="127.0.0.1", port=54333, dbname="lab", user=ROLE_M7, password=pw,
                                 connect_timeout=5) as c:
                return "masuk sebagai " + c.execute("SELECT current_user").fetchone()[0]
        except psycopg.OperationalError as e:
            return "ditolak: " + re.search(r"FATAL:\s+(.*)", str(e)).group(1).strip()

    catat("# repo: repo git sementara meniru laptop Raka. Nama dan tanggal commit tetap, jadi hash sama di setiap rekaman.\n"
          "# Nilai di .env palsu: dibangkitkan saat lab berjalan, tidak ada di file repo, dan diganti label di rekaman.\n"
          f"# gitleaks: go install {GITLEAKS}, dipanggil dengan --redact (secret tidak dicetak).\n"
          "# database VPS: Postgres lab (labs/b3-race) memerankan database di VPS untuk bagian F dan I.\n"
          "# Banner gambar gitleaks yang dicetak hook di bagian G dibuang dari rekaman.\n")

    bagian("A. Minggu 1: repo pertama, .env ikut ter-commit")
    repo.mkdir()
    (repo / "README.md").write_text("# rekeningo-api\n\nAPI Rekeningo Tahap 1. Jalankan: go run ./cmd/api\n")
    (repo / "go.mod").write_text("module rekeningo/api\n\ngo 1.24\n")
    (repo / ".env").write_text(env_m7(lama))
    g("minggu 1", "init", "-q", "-b", "main")
    g("minggu 1", "add", ".")
    g("minggu 1", "commit", "-q", "-m", "Kerangka api-t1")
    c1 = g("minggu 1", "rev-parse", "--short", "HEAD").stdout.strip()
    catat("$ git add . && git commit -m \"Kerangka api-t1\"\n"
          f"$ git show --stat --format='%h %ad %s' --date=short HEAD\n"
          f"{g('minggu 1', 'show', '--stat', '--format=%h %ad %s', '--date=short', 'HEAD').stdout}\n"
          f"$ cat .env\n{(repo / '.env').read_text()}")

    bagian("B. Minggu 5: Raka menemukan .env di repo, lalu menghapusnya")
    g("minggu 5", "rm", "--cached", "-q", ".env")
    (repo / ".gitignore").write_text(".env\n")
    g("minggu 5", "add", ".gitignore")
    g("minggu 5", "commit", "-q", "-m", "Hapus .env dari repo")
    dilacak = g("minggu 5", "ls-files").stdout
    harap(".env" in dilacak.split(), False, ".env tidak lagi dilacak sesudah git rm --cached")
    harap((repo / ".env").exists(), True, ".env tetap ada di laptop (git rm --cached)")
    catat("$ git rm --cached .env && echo .env > .gitignore && git add .gitignore && git commit -m \"Hapus .env dari repo\"\n"
          f"$ git ls-files\n{dilacak}"
          "# .env tidak lagi dilacak. File di laptop Raka tetap ada, karena git rm --cached hanya melepasnya dari index.\n")

    bagian("C. Riwayat masih menyimpan isinya")
    riwayat = g("minggu 5", "log", "--oneline", "--", ".env").stdout
    isi_lama = g("minggu 5", "show", f"{c1}:.env").stdout
    harap((len(riwayat.splitlines()), isi_lama), (2, env_m7(lama)), "commit pertama masih memuat .env yang sama persis")
    catat(f"$ git log --oneline -- .env\n{riwayat}\n$ git show {c1}:.env\n{isi_lama}"
          "# Siapa pun yang punya clone repo ini bisa membaca password itu, juga sesudah file dihapus.\n")

    bagian("D. gitleaks memindai seluruh riwayat (aturan bawaan v8.30.1)")
    rc_akhir, k_akhir = scan("--log-opts=-1")
    harap((rc_akhir, "no leaks found" in k_akhir), (0, True), "commit terakhir saja (penghapusan) tidak memuat temuan")
    catat(f"$ gitleaks git --redact -v --log-opts=-1 .   # commit terakhir saja\n{k_akhir}# exit status {rc_akhir}\n"
          "# Commit penghapusan sendiri tidak memuat temuan. Temuannya ada di commit sebelumnya:\n\n")
    rc, k = scan()
    harap((rc, k.count("Finding:"), "POSTGRES_PASSWORD=REDACTED" in k, "DATABASE_URL" in k), (1, 1, True, False),
          "aturan bawaan menandai POSTGRES_PASSWORD, tidak menandai DATABASE_URL")
    catat(f"$ gitleaks git --redact -v .   # seluruh riwayat\n{k}# exit status {rc}\n"
          "# Satu temuan, di commit minggu 1. Baris DATABASE_URL memuat password yang sama, tapi tidak ditandai aturan bawaan.\n")

    bagian("E. Aturan tambahan: password di dalam URL")
    (repo / ".gitleaks.toml").write_text(ATURAN_URL)
    g("minggu 5", "add", ".gitleaks.toml")
    g("minggu 5", "commit", "-q", "-m", "Tambah aturan gitleaks untuk password di URL")
    rc, k = scan()
    harap((rc, k.count("Finding:"), "url-dengan-password" in k), (1, 2, True), "aturan URL menemukan baris DATABASE_URL")
    catat(f"$ cat .gitleaks.toml\n{ATURAN_URL}\n$ gitleaks git --redact -v .\n{k}# exit status {rc}\n")

    bagian("F. Password harus diganti: menghapus file tidak mengubah password")
    for q in (f"DROP ROLE IF EXISTS {ROLE_M7}", f"CREATE ROLE {ROLE_M7} LOGIN PASSWORD '{lama}'"):
        subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-c", q], check=True, capture_output=True)
    pw_riwayat = re.search(r"^POSTGRES_PASSWORD=(.*)$", isi_lama, re.M).group(1)
    sebelum = masuk(pw_riwayat)
    subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-c", f"ALTER ROLE {ROLE_M7} PASSWORD '{baru}'"],
                   check=True, capture_output=True)
    sesudah, baru_masuk = masuk(pw_riwayat), masuk(baru)
    harap((sebelum, sesudah.startswith("ditolak: password authentication failed"), baru_masuk),
          (f"masuk sebagai {ROLE_M7}", True, f"masuk sebagai {ROLE_M7}"), "password lama berlaku sampai diganti")
    (repo / ".env").write_text(env_m7(baru))
    catat(f"# persiapan: role {ROLE_M7} dengan password lama, seperti database di VPS sejak minggu 1.\n"
          "# Koneksi dibuka dari mesin lab lewat TCP (psycopg), jadi Postgres benar-benar memeriksa password;\n"
          "# baris psql di bawah adalah padanan koneksi itu.\n"
          f"$ psql \"postgres://{ROLE_M7}:<password dari git show {c1}:.env>@db/lab\" -c 'SELECT current_user'\n-> {sebelum}\n\n"
          f"$ psql -c \"ALTER ROLE {ROLE_M7} PASSWORD '{baru}'\"\nALTER ROLE\n"
          f"$ psql \"postgres://{ROLE_M7}:<password dari git show {c1}:.env>@db/lab\" -c 'SELECT current_user'\n-> {sesudah}\n"
          f"$ psql \"postgres://{ROLE_M7}:{baru}@db/lab\" -c 'SELECT current_user'\n-> {baru_masuk}\n"
          "# .env di laptop dan di VPS diisi password baru. Password lama di riwayat tidak lagi membuka apa pun.\n")

    bagian("G. Pre-commit hook: commit berikutnya yang memuat secret ditolak")
    hook = repo / ".git" / "hooks" / "pre-commit"
    hook.write_text(f"#!/bin/sh\n# entry hook resmi gitleaks (.pre-commit-hooks.yaml di v8.30.1)\nexec {gl} git --pre-commit --redact --staged --verbose\n")
    hook.chmod(0o755)
    catat(f"$ cat .git/hooks/pre-commit\n{hook.read_text()}\n")
    sebelum_head = g("minggu 5", "rev-parse", "--short", "HEAD").stdout.strip()
    (repo / ".env.example").write_text(env_m7(baru))
    g("minggu 5", "add", ".env.example")
    r = g("minggu 5", "commit", "-q", "-m", "Tambah .env.example", cek=False)
    head = g("minggu 5", "rev-parse", "--short", "HEAD").stdout.strip()
    harap((r.returncode, head, "Finding:" in r.stderr), (1, sebelum_head, True), "hook menolak .env.example berisi password")
    catat("# .env.example disalin dari .env, password baru ikut tersalin.\n"
          f"$ git add .env.example && git commit -m \"Tambah .env.example\"\n{rapikan(r.stdout + r.stderr)}# exit status {r.returncode}\n"
          f"$ git log --oneline -1\n{g('minggu 5', 'log', '--oneline', '-1').stdout}# commit tidak dibuat; HEAD tetap {head}\n\n")
    (repo / ".env.example").write_text("# Salin ke .env, lalu isi. Laptop: database lokal. Nilai untuk VPS hanya ada di VPS.\n"
                                       "POSTGRES_PASSWORD=\nDATABASE_URL=\n")
    g("minggu 5", "add", ".env.example")
    r = g("minggu 5", "commit", "-q", "-m", "Tambah .env.example", cek=False)
    harap((r.returncode, "no leaks found" in r.stderr), (0, True), "hook meloloskan .env.example tanpa nilai")
    catat(f"$ cat .env.example\n{(repo / '.env.example').read_text()}"
          f"$ git add .env.example && git commit -m \"Tambah .env.example\"\n{rapikan(r.stdout + r.stderr)}# exit status {r.returncode}\n"
          f"$ git log --oneline\n{g('minggu 5', 'log', '--oneline').stdout}\n")

    bagian("H. Hook tinggal di .git/hooks laptop Raka: --no-verify melewatinya, pemindaian di CI tidak")
    (repo / "catatan-vps.env").write_text(f"POSTGRES_PASSWORD={latihan}\n")
    g("minggu 5", "add", "catatan-vps.env")
    r = g("minggu 5", "commit", "-q", "--no-verify", "-m", "Catatan VPS", cek=False)
    harap((r.returncode, "Finding:" in r.stderr + r.stdout), (0, False), "--no-verify melewati hook")
    rc, k = scan("--log-opts=-1")
    harap((rc, k.count("Finding:"), "catatan-vps.env" in k), (1, 1, True), "pemindaian commit baru menemukan password latihan")
    catat("# latihan lab, bukan kejadian di cerita: nilai <password-latihan> tidak dipakai di mana pun.\n"
          f"$ git add catatan-vps.env && git commit --no-verify -m \"Catatan VPS\"\n# exit status {r.returncode}\n"
          f"$ git log --oneline -1\n{g('minggu 5', 'log', '--oneline', '-1').stdout}\n"
          f"$ gitleaks git --redact -v --log-opts=-1 .   # commit yang di-push saja; langkah CI ADR 11 memindai seluruh riwayat (bagian J)\n{k}# exit status {rc}\n")

    # 1.35 ADR 11 (keputusan 300): urutan rotasi di VPS. Sesi A dibuka sebelum ALTER ROLE dan tetap terbuka.
    bagian("I. Rotasi di VPS: ALTER ROLE tidak menutup sesi yang sudah terbuka")
    import psycopg
    rotasi = palsu("password-rotasi")
    label[rotasi] = "<password-rotasi>"

    def admin(q):
        return subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-At", "-c", q], check=True, capture_output=True,
                              text=True).stdout.strip()

    sesi = psycopg.connect(host="127.0.0.1", port=54333, dbname="lab", user=ROLE_M7, password=baru,
                           connect_timeout=5, autocommit=True)
    try:
        a_awal = sesi.execute("SELECT current_user").fetchone()[0]
        waktu = admin("SELECT clock_timestamp()")
        admin(f"ALTER ROLE {ROLE_M7} PASSWORD '{rotasi}'")
        a_tengah = sesi.execute("SELECT current_user").fetchone()[0]
        pakai_lama, pakai_rotasi = masuk(baru), masuk(rotasi)
        putus = admin(f"SELECT pg_terminate_backend(pid, 5000) FROM pg_stat_activity "
                      f"WHERE usename = '{ROLE_M7}' AND backend_start < '{waktu}'")
        try:
            sesi.execute("SELECT current_user")
            a_akhir = "masih jalan"
        except psycopg.OperationalError as e:
            a_akhir = ("terputus: terminating connection due to administrator command"
                       if "terminating connection due to administrator command" in str(e) else "terputus: " + str(e))
    finally:
        sesi.close()
    harap((a_awal, a_tengah, pakai_lama.startswith("ditolak: password authentication failed"), pakai_rotasi, putus, a_akhir),
          (ROLE_M7, ROLE_M7, True, f"masuk sebagai {ROLE_M7}", "t",
           "terputus: terminating connection due to administrator command"),
          "sesi lama hidup sesudah ALTER ROLE sampai diputus; koneksi baru hanya dengan password baru")
    catat("# latihan lab, bukan kejadian di cerita. Sesi A dibuka dengan password yang sedang berlaku, seperti koneksi\n"
          "# di pool container API, atau sesi siapa pun yang sudah masuk dengan password itu sebelum diganti.\n"
          f"$ psql \"postgres://{ROLE_M7}:<password-baru>@db/lab\"   # sesi A, dibiarkan terbuka\n"
          f"(sesi A) SELECT current_user\n-> masuk sebagai {a_awal}\n\n"
          f"$ psql -c \"ALTER ROLE {ROLE_M7} PASSWORD '<password-rotasi>'\"\nALTER ROLE\n"
          f"(sesi A) SELECT current_user\n-> masih jalan: {a_tengah}\n"
          f"$ psql \"postgres://{ROLE_M7}:<password-baru>@db/lab\" -c 'SELECT current_user'   # koneksi baru, password lama\n"
          f"-> {pakai_lama}\n"
          f"$ psql \"postgres://{ROLE_M7}:<password-rotasi>@db/lab\" -c 'SELECT current_user'   # koneksi baru, password baru\n"
          f"-> {pakai_rotasi}\n\n"
          f"$ psql -At -c \"SELECT pg_terminate_backend(pid, 5000) FROM pg_stat_activity\n"
          f"            WHERE usename = '{ROLE_M7}' AND backend_start < '<waktu ALTER ROLE>'\"\n{putus}\n"
          f"(sesi A) SELECT current_user\n-> {a_akhir}\n"
          "# Satu baris t: hanya sesi A yang dibuka sebelum ALTER ROLE.\n")

    # 1.35 ADR 11 (keputusan 300): langkah CI memindai seluruh riwayat; temuan yang password-nya sudah diganti diabaikan.
    bagian("J. CI memindai seluruh riwayat: temuan lama dicatat di .gitleaksignore")
    c1_penuh = g("minggu 5", "rev-parse", c1).stdout.strip()
    rc0, k0 = scan()
    sidik = sorted(s for s in re.findall(r"(?m)^Fingerprint:\s+(\S+)$", k0) if s.startswith(c1_penuh + ":"))
    harap((rc0, k0.count("Finding:"), len(sidik)), (1, 3, 2), "seluruh riwayat: dua temuan minggu 1, satu temuan latihan")
    (repo / ".gitleaksignore").write_text("".join(s + "\n" for s in sidik))
    g("minggu 5", "add", ".gitleaksignore")
    g("minggu 5", "commit", "-q", "-m", "Abaikan temuan minggu 1: password sudah diganti")
    rc, k = scan()
    harap((rc, k.count("Finding:"), "catatan-vps.env" in k, re.search(r"(?m)^File:\s+\.env$", k) is None),
          (1, 1, True, True), ".gitleaksignore hanya membuang dua temuan minggu 1")
    catat("# latihan lab: repo yang sama, termasuk commit latihan bagian H. Langkah CI di ADR 11 memindai clone penuh.\n"
          f"$ gitleaks git --redact -v .   # sebelum .gitleaksignore, baris akhir saja\n"
          f"{re.search(r'WRN leaks found: \d+', k0).group(0)}\n"
          "# dua di commit minggu 1, satu di catatan-vps.env\n"
          f"# exit status {rc0}\n\n"
          f"$ cat .gitleaksignore\n{(repo / '.gitleaksignore').read_text()}"
          "$ git add .gitleaksignore && git commit -m \"Abaikan temuan minggu 1: password sudah diganti\"\n\n"
          f"$ gitleaks git --redact -v .\n{k}# exit status {rc}\n"
          "# Dua temuan minggu 1 dilewati menurut fingerprint-nya. Temuan di commit lain tetap menggagalkan pemindaian.\n")

    teks = "".join(log)
    harap([s in teks for s in (lama, baru, latihan, rotasi, str(tmp))], [False] * 5, "rekaman tidak memuat nilai palsu atau path sementara")
    tulis("m7.txt")


def rekam_cadangan():
    """1.36 Tim dan infra: database di VPS yang sama, satu cadangan pg_dump, lalu dipulihkan (keputusan 302)."""
    reset()
    samarkan_hari_ini()
    exec_db = PSQL[:7]   # docker compose ... exec -T db
    log.append("# Latihan lab, bukan kejadian di cerita: naskah Tahap 1 tidak menyebut cadangan database.\n"
               "# database VPS: Postgres lab (labs/b3-race), schema tahap1. VPS yang mati diperankan dengan DROP SCHEMA.\n"
               "# File cadangan disimpan di container database lab. Di VPS sungguhan file itu disalin keluar VPS.\n")
    mulai()
    bagian("A. Persiapan: Budi membayar Rp25.000 ke Warung Ani")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 225000), "bayar Rp25.000")

    bagian("B. Cadangan: pg_dump menyalin schema tahap1 ke satu file")
    r = subprocess.run(exec_db + ["pg_dump", "-U", "lab", "-d", "lab", "-n", "tahap1", "-Fc", "-f", "/tmp/tahap1.dump"],
                       capture_output=True, text=True)
    harap((r.returncode, r.stderr), (0, ""), "pg_dump")
    log.append("$ pg_dump -U lab -d lab -n tahap1 -Fc -f tahap1.dump\n")
    r = subprocess.run(exec_db + ["pg_restore", "-l", "/tmp/tahap1.dump"], capture_output=True, text=True)
    tabel = sorted(re.findall(r"TABLE DATA tahap1 (\S+)", r.stdout))
    harap((r.returncode, [t for t in ("akun", "sesi", "transaksi") if t in tabel]), (0, ["akun", "sesi", "transaksi"]),
          "isi cadangan")
    log.append("$ pg_restore -l tahap1.dump   # hanya nama tabel di baris TABLE DATA\n" + "\n".join(tabel) + "\n")
    harap(total(), ["25000000", "25000000", "1"], "total saat cadangan")

    bagian("C. Sesudah cadangan: Budi membayar Rp20.000 ke Warung Ani")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 20000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 205000), "bayar Rp20.000")
    harap(total(), ["25000000", "25000000", "2"], "total sebelum database hilang")

    bagian("D. VPS mati bersama database: HP Budi tidak bisa membaca saldo")
    sql("DROP SCHEMA tahap1 CASCADE")
    s, _ = curl("GET", "/akun/419", token=budi)
    harap(s, 500, "akun tanpa database")
    stop()

    bagian("E. VPS baru: cadangan dipulihkan, server dinyalakan lagi")
    r = subprocess.run(exec_db + ["pg_restore", "-U", "lab", "-d", "lab", "/tmp/tahap1.dump"], capture_output=True, text=True)
    harap((r.returncode, r.stderr), (0, ""), "pg_restore")
    log.append("$ pg_restore -U lab -d lab tahap1.dump\n")
    mulai()
    harap(total(), ["25000000", "25000000", "1"], "total sesudah pulih")
    s, b = curl("GET", "/akun/419", token=budi)
    harap((s, json.loads(b)["saldo"]), (200, 225000), "saldo Budi sesudah pulih")
    s, b = curl("GET", "/akun/419/riwayat", token=budi)
    harap((s, [x["jumlah"] for x in json.loads(b)["riwayat"]]), (200, [25000]), "riwayat sesudah pulih")
    subprocess.run(exec_db + ["rm", "-f", "/tmp/tahap1.dump"], check=True)
    log.append("# Semua yang tercatat sebelum pg_dump kembali, termasuk sesi Budi (tabel sesi ada di cadangan).\n"
               "# Pembayaran Rp20.000 sesudah pg_dump tidak ada di cadangan, jadi hilang bersama database.\n")
    tulis("cadangan.txt")


# --- 1.40 ADR 12: dua yang belum pernah diuji selama uji coba (keputusan 306) ---
MENUNGGU_LOCK = ("SELECT count(*) FROM pg_stat_activity "
                 "WHERE application_name = 'api-t1' AND wait_event_type = 'Lock'")
PENAHAN_SIAP = ("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'psql' "
                "AND state = 'idle in transaction' AND backend_xid IS NOT NULL")


def curl_diam(path, body, token):
    """curl tanpa menulis ke log: dua thread berjalan bersamaan, jadi urutan tulisnya tidak tetap."""
    r = subprocess.run(["curl", "-s", "-i", "-X", "POST", URL + path, "-H", f"Authorization: Bearer {token}",
                        "-H", "Content-Type: application/json", "--data-binary", body],
                       capture_output=True, text=True).stdout.replace("\r\n", "\n")
    r = "\n".join(l for l in r.splitlines() if not l.startswith(("Date:", "Content-Length:")))
    return int(r.split()[1]), r


def tunggu_sql(q, harus, apa):
    for _ in range(200):
        if subprocess.run(PSQL + ["-At", "-c", q], capture_output=True, text=True).stdout.strip() == harus:
            return
        time.sleep(0.05)
    gagal(apa)


def rekam_sengaja_belum():
    """1.40 ADR 12: dua request Bayar bersamaan, lalu Bayar yang dikirim ulang app (keputusan 306)."""
    import threading
    reset()
    mulai()
    bagian("A. Persiapan: saldo Budi Rp250.000")
    topup_awal()
    budi = login("budi@lestari.example", "sementara-419", "<token sesi Budi>")

    bagian("B. Dua request Bayar Rp200.000 dari akun Budi tiba hampir bersamaan")
    log.append("# Lab menahan baris Budi dari sesi psql lain (SELECT ... FOR UPDATE), supaya kedua request pasti\n"
               "# membaca saldo sebelum salah satunya menulis. Tanpa penahan, urutan ini bisa terjadi, bisa tidak,\n"
               "# tergantung selisih waktu kedua request.\n")
    tahan = subprocess.Popen(PSQL + ["-v", "ON_ERROR_STOP=1"], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                             stderr=subprocess.PIPE, text=True)
    tahan.stdin.write("SET search_path = tahap1; BEGIN; SELECT saldo FROM akun WHERE id = 419 FOR UPDATE;\n")
    tahan.stdin.flush()
    tunggu_sql(PENAHAN_SIAP, "1", "sesi penahan tidak memegang baris Budi")
    body = '{"ke": 418, "jumlah": 200000}'
    hasil = []
    th = [threading.Thread(target=lambda: hasil.append(curl_diam("/transfers", body, budi))) for _ in range(2)]
    for t in th:
        t.start()
    tunggu_sql(MENUNGGU_LOCK, "2", "kedua request tidak sampai ke UPDATE saldo")
    log.append(f"$ psql -c \"{MENUNGGU_LOCK}\"\n 2\n"
               "# Kedua request sudah lolos pemeriksaan saldo di service dan sama-sama menunggu di UPDATE saldo.\n")
    tahan.stdin.write("COMMIT;\n")
    tahan.stdin.close()
    harap(tahan.wait(), 0, "sesi penahan")
    for t in th:
        t.join()
    hasil.sort()
    for i, (_, r) in enumerate(hasil, 1):
        log.append(f"$ curl -i -X POST '/transfers' -H 'Authorization: Bearer <token sesi Budi>' -d '{body}'"
                   f"   # request {i} dari 2, diurutkan menurut status\n{samarkan(r)}\n")
    harap([s for s, _ in hasil], [201, 500], "status dua request bersamaan")
    harap(json.loads(hasil[0][1].split("\n\n", 1)[1])["saldo"], 50000, "saldo sesudah request yang lolos")

    bagian("C. Saldo dan catatan sesudah dua request bersamaan")
    harap("50000" in sql("SELECT id, nama, saldo FROM akun WHERE id IN (418, 419) ORDER BY id"), True, "saldo Budi 50.000")
    harap(total(), ["25000000", "25000000", "1"], "total sesudah dua request bersamaan")

    bagian("D. Bayar Rp25.000; response pertama tidak sampai ke HP, app mengirim ulang body yang sama")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 25000), "bayar pertama")
    log.append("# HP Budi tidak menerima response di atas (sinyal putus). App menganggapnya gagal dan mengirim ulang.\n")
    s, b = curl("POST", "/transfers", '{"ke": 418, "jumlah": 25000}', token=budi)
    harap((s, json.loads(b)["saldo"]), (201, 0), "bayar yang dikirim ulang")

    bagian("E. Budi membayar sekali; server mencatat dua pembayaran")
    harap(sql("SELECT id, dari, ke, jumlah FROM transaksi ORDER BY id").count(" 25000"), 2, "dua baris Rp25.000")
    harap(" 0\n" in sql("SELECT id, nama, saldo FROM akun WHERE id = 419"), True, "saldo Budi 0")
    harap(total(), ["25000000", "25000000", "3"], "total sesudah dikirim ulang")
    log.append("# Total saldo tetap sama dengan total top-up: tidak ada uang yang hilang atau muncul.\n"
               "# Yang salah adalah niat Budi: ia membayar sekali, server mencatat dua kali.\n")
    tulis("sengaja-belum.txt")


if __name__ == "__main__":
    subprocess.run(["go", "build", "-o", str(BIN), "./cmd/api"], cwd=HERE, check=True)
    pilihan = sys.argv[1:] or ["login", "topup", "bayar", "riwayat", "pertukaran", "relasi", "m1", "http", "m2", "m3", "injection", "lapisan", "m4", "koreksi", "m5", "authz", "m6", "deploy", "testing", "versi", "m7", "cadangan", "sengaja-belum"]
    for p in pilihan:
        globals()["rekam_" + p.replace("-", "_")]()
