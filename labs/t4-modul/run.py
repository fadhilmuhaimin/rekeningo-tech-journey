"""Rekam lab t4-modul: batas modul, schema dan role per modul, dan service pembayaran yang meminta jurnal lewat API ledger.

Server (monolith api-t4 dengan API ledger), skema, data awal, dan gateway tiruan adalah milik `labs/api-t4`
(`dasar_t4.py`, `cmd/api`, `cmd/tiruan`), bukan salinan. Yang baru di lab ini: `modul.sql` (enam schema modul dan role
per modul di atas schema api-t4), `cmd/pembayaran` (service pembayaran terpisah, role t4m_pembayaran), dan paket
`internal/modul/*` dengan tes batasnya (`go test -tags t4modul`). Setiap bagian membuat ulang schema dan data awal dari
nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Nomor order,
waktu, dan token disamarkan; angka yang bergantung mesin (latensi) hanya direkam sebagai batas yang diperiksa. Pihak
ketiga (gateway pembayaran) adalah tiruan lokal. Lab gagal keras bila hasil meleset dari yang diharapkan.

    make -C labs/t4-modul run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t4-modul run BAGIAN=ledger        (satu bagian: batas ledger proses-mati latensi testing)
"""
import json, os, pathlib, re, signal, subprocess, sys, threading, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import PORT, PORT_GATEWAY, bagian, catat, curl, gagal, harap, j  # noqa: E402

LAB = "t4-modul"
SCH = "tahap4_modul"          # schema api-t4 sebelum dipecah (satu schema, 22 tabel)
TES = "tahap4_modul_tes"      # schema untuk tes Go service dan handler
d.OUT = HERE / "output"       # dasar_t4.tulis menulis ke d.OUT; di sini output lab ini
DASAR_PEMBAYARAN = 18286      # service pembayaran (api-t4: 18280 sampai 18285)
PORT_PEMB = d.port_lab(DASAR_PEMBAYARAN)
BIN_PEMB = d.HERE / "pembayaran"
KUNCI = "kunci-layanan-pembayaran-lab"   # data lab, bukan secret: kunci layanan antar service
AKUN_BUDI = 419
GO_ENV = dict(d.ENV, T4M_HOST=f"127.0.0.1:{d.DB_PORT}", T4M_SCHEMA_SATU=SCH)


def url_role(role, nama):
    return f"postgres://{role}:{role}@127.0.0.1:{d.DB_PORT}/lab?application_name={nama}"


def ulang_samaran():
    d.samaran.clear()
    d._urut_order[0] = 0
    d._urut_uuid[0] = 0


def tulis(nama, judul, schema_teks):
    """Seperti dasar_t4.tulis, tetapi kepala menyebut semua schema yang dipakai bagian ini."""
    for port in list(d.server):
        d.stop(port)
    versi = d.satu("SHOW server_version", "public")
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX} · {schema_teks}",
              f"# Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


# ---------- Go ----------

def go(*args, env=None):
    r = subprocess.run(["go", *args], cwd=d.HERE, env=env or GO_ENV, capture_output=True, text=True)
    teks = (r.stdout + "\n" + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    teks = re.sub(r"(?<=:)\d{4,5}\b", "<port>", teks)
    return r.returncode, teks.strip()


def jalankan_go(perintah, args, *, env=None, hanya_lab=False, harus=0):
    """Jalankan `go <args>`, catat perintah dan keluarannya. hanya_lab: tampilkan baris LAB| dan ringkasan tes."""
    rc, teks = go(*args, env=env)
    catat("$ " + perintah)
    baris = teks.splitlines()
    if hanya_lab:
        baris = [l[4:] if l.startswith("LAB|") else l for l in baris
                 if l.startswith(("LAB|", "--- PASS", "--- FAIL", "--- SKIP", "PASS", "FAIL", "ok ", "?"))]
    elif baris:
        baris = [l for l in baris if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT"))]
    catat("\n".join(baris) if baris else "(tanpa keluaran)")
    catat(f"# exit status {rc}")
    if rc != harus:
        print(teks, file=sys.stderr)
    harap(rc, harus, f"go {args[0]}")
    if harus == 0:
        harap("--- SKIP" in teks, False, "tes dilewati")
        harap(len(re.findall(r"^--- FAIL", teks, flags=re.M)), 0, "tes yang gagal")
    return teks


def pastikan_semua_tes_bertag_berjalan(*keluaran):
    """Setiap tes bertag t4modul di ./internal/modul harus muncul sebagai PASS di keluaran bagian ini. Pola -run yang
    tidak mencocokkan satu tes (ditemukan peninjau: tes hak UPDATE dan DELETE audit_log tidak pernah dijalankan gerbang)
    membuat mutan hak lolos walau tesnya ada."""
    rc, daftar = go("test", "-tags", "t4modul", "-list", ".", "./internal/modul/")
    harap(rc, 0, "go test -list")
    ada = {l.strip() for l in daftar.splitlines() if l.startswith("Test")}
    jalan = set(re.findall(r"^--- PASS: (\S+)", "\n".join(keluaran), flags=re.M))
    harap(sorted(ada - jalan), [], "tes bertag t4modul yang tidak dijalankan gerbang")


# ---------- schema ----------

def siapkan_satu():
    """Schema api-t4 apa adanya: satu schema, satu role aplikasi (api_t4) dengan hak dari dasar_t4.HAK."""
    d.buat_schema(SCH)
    d.seed(SCH)


def siapkan_modul():
    """Schema yang sama dipecah menjadi enam schema modul dengan role per modul (modul.sql)."""
    d.buat_schema(SCH, hak=False)
    d.seed(SCH)
    with d.sambung("public") as c:
        c.execute((HERE / "modul.sql").read_text().replace("{s}", SCH))


def sql_m(q, tampil=True):
    """Satu perintah sebagai pemilik schema (keluaran seperti psql); tabel ditulis dengan awalan schema modul.
    Perintah yang ditampilkan ikut disamarkan: nomor order acak per run."""
    with d.sambung("public") as c:
        cur = c.execute(q)
        hasil = [x.name for x in cur.description] if cur.description else None
        isi = cur.fetchall() if hasil else []
    if tampil:
        catat(d.samarkan("=> " + q.strip().replace("\n", "\n   ")))
        for b in (d.tabel(hasil, isi) if hasil else [cur.statusmessage]):
            catat(d.samarkan(b))
    return isi


def satu_m(q, arg=None):
    return d.satu(q, "public", arg)


# ---------- proses ----------

def bangun():
    d.bangun()
    subprocess.run(["go", "build", "-o", str(BIN_PEMB), "./cmd/pembayaran"], cwd=d.HERE, check=True)


def mulai_gateway():
    """Gateway tiruan; webhook-nya menuju service pembayaran, bukan monolith."""
    d.mulai(d.BIN_TIRUAN, PORT_GATEWAY, ["-peran", "gateway", "-webhook-url", f"http://127.0.0.1:{PORT_PEMB}/webhooks/pembayaran",
                                          "-rahasia", d.RAHASIA_WEBHOOK])


def mulai_monolith(extra=()):
    """Monolith api-t4 sebagai role t4m_monolit (lima modul, tanpa schema pembayaran) dengan API ledger."""
    d.mulai(d.BIN, PORT, ["-lab", "-ledger-kunci", KUNCI, *extra], db=url_role("t4m_monolit", "t4m-monolit"))


def mulai_pembayaran(extra=()):
    d.mulai(BIN_PEMB, PORT_PEMB, ["-lab", "-ledger-url", f"http://127.0.0.1:{PORT}", "-ledger-kunci", KUNCI,
                                   "-gateway-url", f"http://127.0.0.1:{PORT_GATEWAY}", "-rahasia-webhook", d.RAHASIA_WEBHOOK, *extra],
              db=url_role("t4m_pembayaran", "t4m-pembayaran"))


def mulai_semua(api=(), pembayaran=()):
    mulai_gateway()
    mulai_monolith(api)
    mulai_pembayaran(pembayaran)


def job_cek_topup():
    """`pembayaran -cek-topup -cek-umur 0s`: job cek status (ADR 35); umur 0 supaya top-up baru langsung ditanyakan."""
    r = subprocess.run([str(BIN_PEMB), "-cek-topup", "-cek-umur", "0s", "-ledger-url", f"http://127.0.0.1:{PORT}",
                        "-ledger-kunci", KUNCI, "-gateway-url", f"http://127.0.0.1:{PORT_GATEWAY}"],
                       env=dict(d.ENV, DATABASE_URL=url_role("t4m_pembayaran", "t4m-pembayaran-job")), capture_output=True, text=True)
    harap(r.returncode, 0, "job cek top-up")
    return r.stdout.strip()


def topup(akun, jumlah):
    s, isi = curl("POST", "/lab/topup", {"akun_id": akun, "jumlah": jumlah}, port=PORT_PEMB, tampil=False)
    harap(s, 201, "buat top-up")
    return j(isi)["order_id"]


def gateway(path, body):
    s, isi = curl("POST", path, body, port=PORT_GATEWAY, tampil=False)
    return s, j(isi)


def bayar_di_gateway(order):
    s, _ = gateway("/lab/bayar", {"order_id": order})
    harap(s, 200, "gateway bayar")


def webhook(order, event, **kw):
    """Gateway mengirim webhook ke service pembayaran; mengembalikan hasil per kiriman, port disamarkan."""
    s, h = gateway("/lab/webhook", {"event_id": event, "order_id": order, **kw})
    harap(s, 200, "perintah webhook")
    # Putusnya koneksi karena proses penerima mati bisa terbaca EOF atau connection reset, bergantung waktu: satu kalimat.
    return ["galat: koneksi putus, tidak ada balasan" if x.startswith("galat:") else x for x in h["hasil"]]


def jumlah_jurnal(order):
    return int(satu_m("SELECT count(*) FROM t4m_ledger.jurnal WHERE jenis = 'topup_bank' AND keterangan = %s", ("Top-up bank " + order,)))


def saldo(akun=AKUN_BUDI):
    return int(satu_m("SELECT saldo_cache FROM t4m_ledger.buku WHERE akun_id = %s", (akun,)))


def keadaan(order, judul):
    """Keadaan satu order di tiga modul: ledger, pembayaran, dan platform (outbox)."""
    catat(f"# {judul}")
    sql_m(f"""SELECT t.status AS topup_bank, t.jurnal_id IS NOT NULL AS terikat_jurnal,
                     (SELECT count(*) FROM t4m_ledger.jurnal WHERE jenis = 'topup_bank' AND keterangan = 'Top-up bank ' || t.order_id) AS jurnal_di_ledger,
                     (SELECT count(*) FROM t4m_platform.outbox o JOIN t4m_ledger.jurnal j ON j.id = o.jurnal_id WHERE j.keterangan = 'Top-up bank ' || t.order_id) AS outbox_di_platform
              FROM t4m_pembayaran.topup_bank t WHERE t.order_id = '{order}'""")


def log_ledger(port=PORT):
    """Baris log API ledger (satu per panggilan) di monolith, dalam urutan datang."""
    return [d.samarkan(l) for l in d.log_server(port) if l.startswith("ledger: key=")]


def baris_ledger(sebelum):
    semua = log_ledger()
    harap(semua[:len(sebelum)], sebelum, "log ledger lama berubah")
    return semua[len(sebelum):]


# ---------- batas.txt ----------

def rekam_batas():
    ulang_samaran()
    siapkan_satu()
    bagian("A. M32 pada versi tanpa batas: satu schema (tahap4_modul), satu role aplikasi (api_t4) untuk semua modul")
    catat("# Langkah CI tim Pembayaran dan tim Akun. Tes pembayaran memakai data tiruan, seperti pada naskah: tidak ada skema tim lain di dalamnya.")
    jalankan_go("go build ./...", ["build", "./..."])
    jalankan_go("go vet ./internal/modul/...", ["vet", "./internal/modul/..."])
    jalankan_go("go test -count=1 -run TestTeksTopupLangsungDenganDataTiruanLolos -v ./internal/modul/pembayaran",
                ["test", "-count=1", "-run", "TestTeksTopupLangsungDenganDataTiruanLolos", "-v", "./internal/modul/pembayaran"], hanya_lab=True)
    catat("# Ketiga langkah CI tidak membuka koneksi database: tes pembayaran memakai driver tiruan, jadi migration tim Merchant tidak mengubah hasilnya.")
    catat("")
    catat("# Pemeriksaan terhadap skema nyata (di lingkungan yang meniru produksi):")
    tes_a = jalankan_go("T4M_SCHEMA_SATU=tahap4_modul go test -tags t4modul -count=1 -v -run TestM32TanpaBatas ./internal/modul/",
                        ["test", "-tags", "t4modul", "-count=1", "-v", "-run", "TestM32TanpaBatas", "./internal/modul/"], hanya_lab=True)
    catat("# Ilustrasi mekanisme: TeksTopupLangsung adalah kode lab yang ditulis seperti uraian M32 di naskah (kode top-up api-t4 tidak membaca akun.nama);")
    catat("# skema, role, dan pesan galatnya nyata (PostgreSQL), tetapi kodenya bukan rekaman kode produksi.")

    siapkan_modul()
    bagian("B. Dengan batas: enam schema modul, satu role per modul, dan paket internal/ Go")
    catat("# Pembagian dan hak dari modul.sql; tes berjalan sebagai role modul, bukan sebagai pemilik schema.")
    tes_b = jalankan_go("go test -tags t4modul -count=1 -v -run 'TestPembagian|TestMatriks|TestKontrakKolom|TestRoleModul|TestMonolit|TestKunciAsing|TestKeterikatan|TestHakRole|TestRoleTidak' ./internal/modul/",
                        ["test", "-tags", "t4modul", "-count=1", "-v", "-run",
                         "TestPembagian|TestMatriks|TestKontrakKolom|TestRoleModul|TestMonolit|TestKunciAsing|TestKeterikatan|TestHakRole|TestRoleTidak",
                         "./internal/modul/"], hanya_lab=True)
    catat("")
    catat("# M32 lagi, sekarang dengan batas:")
    tes_c = jalankan_go("go test -tags t4modul -count=1 -v -run 'TestPembayaranTidakBisa|TestRenameKolom|TestImporInternal' ./internal/modul/",
                        ["test", "-tags", "t4modul", "-count=1", "-v", "-run", "TestPembayaranTidakBisa|TestRenameKolom|TestImporInternal", "./internal/modul/"], hanya_lab=True)
    pastikan_semua_tes_bertag_berjalan(tes_a, tes_b, tes_c)
    catat("")
    catat("# CODEOWNERS dan review wajib: Tidak dijalankan di lab ini. Keduanya fitur GitHub; lab hanya menjalankan hal yang bisa dijalankan di container lokal.")
    tulis("batas.txt", "batas modul: schema dan role per modul, paket internal Go, dan perubahan nama kolom lintas modul (M32)",
          f"schema {SCH} (satu schema), lalu t4m_ledger, t4m_akun, t4m_identitas, t4m_merchant, t4m_pembayaran, t4m_platform")


# ---------- ledger.txt ----------

def rekam_ledger():
    ulang_samaran()
    siapkan_modul()
    mulai_semua()
    bagian("A. API ledger: satu jurnal per Idempotency-Key (permintaan langsung ke ledger, tanpa gateway)")
    catat("# Akun Budi (419) punya saldo awal dari data awal; top-up Rp200.000 dengan key = order_id.")
    awal = saldo()
    catat(f"# saldo Budi sebelum: {awal}")
    order = "TB-0123456789abcdef"
    d.daftar_samaran(order, "<order A>")
    isi = json.dumps({"order_id": order, "akun_id": AKUN_BUDI, "jumlah": 200000})
    for judul, kepala, ingin in [("tanpa kunci layanan", ["Idempotency-Key: " + order], 401),
                                 ("tanpa Idempotency-Key", ["X-Layanan-Kunci: " + KUNCI], 400),
                                 ("Idempotency-Key bukan order_id", ["X-Layanan-Kunci: " + KUNCI, "Idempotency-Key: lain"], 422)]:
        catat(f"# {judul}")
        s, _ = curl("POST", "/ledger/jurnal-topup", isi, kepala=kepala, tampil=True)
        harap(s, ingin, judul)
    harap(satu_m("SELECT count(*) FROM t4m_ledger.kunci_idempotensi WHERE kunci = %s", (order,)), 0, "key tertahan oleh permintaan yang ditolak")
    catat("# permintaan sah, lalu ulangan yang sama")
    sah = ["X-Layanan-Kunci: " + KUNCI, "Idempotency-Key: " + order]
    s1, _ = curl("POST", "/ledger/jurnal-topup", isi, kepala=sah)
    s2, _ = curl("POST", "/ledger/jurnal-topup", isi, kepala=sah)
    harap((s1, s2), (201, 200), "status pertama dan ulangan")
    catat("# key yang sama, jumlah lain")
    s3, _ = curl("POST", "/ledger/jurnal-topup", json.dumps({"order_id": order, "akun_id": AKUN_BUDI, "jumlah": 200001}), kepala=sah)
    harap(s3, 422, "key dipakai ulang untuk jumlah lain")
    sql_m(f"SELECT count(*) AS jurnal_untuk_key, (SELECT count(*) FROM t4m_ledger.posting p JOIN t4m_ledger.jurnal j ON j.id = p.jurnal_id WHERE j.keterangan = 'Top-up bank {order}') AS posting FROM t4m_ledger.jurnal WHERE keterangan = 'Top-up bank {order}'")
    harap(jumlah_jurnal(order), 1, "jurnal untuk key")
    harap(saldo() - awal, 200000, "saldo naik sekali")
    catat(f"# saldo Budi bertambah Rp{saldo() - awal} (sekali), outbox untuk jurnal itu:")
    sql_m(f"SELECT count(*) AS outbox_di_platform FROM t4m_platform.outbox o JOIN t4m_ledger.jurnal j ON j.id = o.jurnal_id WHERE j.keterangan = 'Top-up bank {order}'")

    bagian("B. Webhook dari gateway lewat service pembayaran: kiriman yang sama, dan event berbeda untuk kejadian yang sama")
    catat("# proses: gateway tiruan, monolith (role t4m_monolit, API ledger), service pembayaran (role t4m_pembayaran)")
    b = topup(AKUN_BUDI, 200000)
    bayar_di_gateway(b)
    catat("# kiriman pertama event e1")
    catat("hasil: " + "; ".join(webhook(b, "e1")))
    catat("# kiriman e1 yang sama lagi, lalu event e2 (berbeda) untuk kejadian yang sama")
    catat("hasil: " + "; ".join(webhook(b, "e1")) + "; " + "; ".join(webhook(b, "e2")))
    keadaan(b, "keadaan order di tiga modul")
    sql_m(f"SELECT w.event_id, w.hasil, w.jurnal_id IS NOT NULL AS ada_jurnal FROM t4m_pembayaran.webhook_event w JOIN t4m_pembayaran.topup_bank t ON t.id = w.topup_id WHERE t.order_id = '{b}' ORDER BY w.event_id")
    harap(jumlah_jurnal(b), 1, "jurnal untuk order B")

    bagian("C. Webhook dan job cek status datang ke ledger dengan key yang sama")
    catat("# service pembayaran dinyalakan dengan gerbang sesudah ledger menjurnal dan sebelum transaction pembayaran (lab saja):")
    catat("# webhook berhenti di gerbang, job cek status berjalan, bertanya ke gateway, dan memanggil ledger dengan key yang sama, lalu gerbang dilepas.")
    d.stop(PORT_PEMB)
    mulai_pembayaran(["-lab-tahan-sesudah-ledger"])
    c = topup(AKUN_BUDI, 100000)
    bayar_di_gateway(c)
    sebelum = log_ledger()
    hasil = {}
    t = threading.Thread(target=lambda: hasil.update(w=webhook(c, "e3")))
    t.start()
    d.tunggu(lambda: jumlah_jurnal(c) == 1, "jurnal dari jalur webhook")
    catat("# jurnal sudah ada (jalur webhook), transaction pembayaran belum jalan; job cek status berjalan sekarang")
    catat("$ pembayaran -cek-topup -cek-umur 0s")
    catat(job_cek_topup())
    s_lepas, _ = curl("POST", "/lab/lepas", port=PORT_PEMB, tampil=False)
    harap(s_lepas, 204, "lepas gerbang")
    t.join()
    catat("# gerbang dilepas; webhook e3 menyelesaikan transaction-nya: " + "; ".join(hasil["w"]))
    catat("# log API ledger, satu baris per panggilan (urutan datang):")
    for l in baris_ledger(sebelum):
        catat(l)
    keadaan(c, "keadaan order di tiga modul")
    harap(jumlah_jurnal(c), 1, "jurnal untuk order C")
    harap(len(baris_ledger(sebelum)), 2, "panggilan ke ledger untuk order C")

    bagian("D. Jawaban service pembayaran ke gateway: yang bukan 2xx membuat gateway mengulang kirimannya")
    catat("# service pembayaran dinyalakan lagi tanpa gerbang; satu top-up Rp100.000 sudah dibayar di gateway, belum ada kabar yang sah.")
    d.stop(PORT_PEMB)
    mulai_pembayaran()
    e = topup(AKUN_BUDI, 100000)
    bayar_di_gateway(e)
    awal = saldo()
    catat("# tanda tangan atas rahasia lain: ditolak sebelum kabar dibaca (401), tidak ada yang ditandai")
    palsu = webhook(e, "e4", rahasia="rahasia-lain")
    harap(palsu, ["401 ditolak"], "tanda tangan atas rahasia lain")
    catat("hasil: " + "; ".join(palsu))
    catat("# monolith (API ledger) dimatikan; kabar yang sah sampai, ledger tidak menjawab: bukan 2xx (503), tidak ada yang ditandai")
    d.stop(PORT)
    mati = webhook(e, "e4")
    harap(mati, ["503 gagal"], "ledger tidak menjawab")
    catat("hasil: " + "; ".join(mati))
    keadaan(e, "sesudah dua kiriman yang tidak berhasil")
    sql_m("SELECT count(*) AS webhook_event_e4 FROM t4m_pembayaran.webhook_event WHERE event_id = 'e4'")
    harap((jumlah_jurnal(e), saldo() - awal), (0, 0), "kiriman yang tidak berhasil tidak menyentuh ledger")
    mulai_monolith()
    catat("# monolith hidup lagi; gateway mengulang event e4 yang sama")
    ulang = webhook(e, "e4")
    harap(ulang, ["200 diproses"], "kiriman ulang sesudah ledger hidup")
    catat("hasil: " + "; ".join(ulang))
    keadaan(e, "sesudah kiriman ulang")
    harap((jumlah_jurnal(e), saldo() - awal), (1, 100000), "kiriman ulang menjurnal sekali")
    catat("# service pembayaran tanpa -lab (bentuk produksi): rute /lab/* tidak dipasang, kabar dari gateway tetap diterima")
    d.stop(PORT_PEMB)
    d.mulai(BIN_PEMB, PORT_PEMB, ["-ledger-url", f"http://127.0.0.1:{PORT}", "-ledger-kunci", KUNCI,
                                  "-gateway-url", f"http://127.0.0.1:{PORT_GATEWAY}", "-rahasia-webhook", d.RAHASIA_WEBHOOK],
            db=url_role("t4m_pembayaran", "t4m-pembayaran"))
    for metode, path in [("POST", "/lab/topup"), ("POST", "/lab/lepas"), ("GET", "/lab/topup/x")]:
        st, _ = curl(metode, path, {"akun_id": AKUN_BUDI, "jumlah": 1000} if metode == "POST" else None, port=PORT_PEMB, tampil=False)
        harap(st, 404, f"{metode} {path} tanpa -lab")
        catat(f"{metode} {path} -> {st}")
    st, _ = curl("GET", "/healthz", port=PORT_PEMB, tampil=False)
    harap(st, 200, "healthz tanpa -lab")
    catat(f"GET /healthz -> {st}")
    catat("# rute webhook tetap ada: kabar bertanda tangan atas rahasia lain dijawab 401")
    palsu = webhook(e, "e5", rahasia="rahasia-lain")
    harap(palsu, ["401 ditolak"], "tanda tangan palsu tanpa -lab")
    catat("hasil: " + "; ".join(palsu))
    tulis("ledger.txt", "API ledger dan Idempotency-Key: satu jurnal per order lewat webhook, kiriman ganda, dan job cek status",
          f"schema t4m_* (enam modul), monolith di 127.0.0.1:{18280}, service pembayaran di 127.0.0.1:{DASAR_PEMBAYARAN}")


# ---------- proses-mati.txt ----------

def tunggu_mati(nama):
    p, f = d.server.pop(PORT_PEMB)
    p.wait(timeout=15)
    return p.returncode


def rekam_proses_mati():
    ulang_samaran()
    siapkan_modul()
    mulai_semua(pembayaran=["-lab-mati-sesudah-ledger"])
    bagian("A. Service pembayaran mati (SIGKILL) sesudah ledger menjurnal dan sebelum topup_bank ditandai dibayar, lalu gateway mengulang kirimannya")
    catat("# Titik kematian disuntik: proses mengirim SIGKILL ke dirinya sendiri tepat sesudah ledger menjawab, tanpa defer dan tanpa balasan ke gateway.")
    awal = saldo()
    a = topup(AKUN_BUDI, 200000)
    bayar_di_gateway(a)
    catat("# gateway mengirim webhook e1; service pembayaran mati di tengah")
    catat("hasil: " + "; ".join(webhook(a, "e1")))
    rc = tunggu_mati("pembayaran")
    harap(rc, -signal.SIGKILL, "proses pembayaran dimatikan sinyal")
    catat("# proses service pembayaran: keluar dengan sinyal 9 (SIGKILL)")
    keadaan(a, "sesudah mati: ledger sudah menjurnal, pembayaran belum menandai apa pun")
    sql_m(f"SELECT count(*) AS webhook_event_e1 FROM t4m_pembayaran.webhook_event WHERE event_id = 'e1'")
    harap((jumlah_jurnal(a), saldo() - awal), (1, 200000), "sesudah mati")
    harap(satu_m(f"SELECT status FROM t4m_pembayaran.topup_bank WHERE order_id = '{a}'"), "menunggu", "status sesudah mati")
    mulai_pembayaran()
    catat("# service pembayaran dinyalakan lagi; gateway mengulang event e1 yang sama (jadwal ulangan gateway nyata berbeda, di sini satu kiriman)")
    catat("hasil: " + "; ".join(webhook(a, "e1")))
    keadaan(a, "sesudah kiriman ulang")
    sql_m(f"SELECT w.event_id, w.hasil, w.jurnal_id IS NOT NULL AS ada_jurnal FROM t4m_pembayaran.webhook_event w JOIN t4m_pembayaran.topup_bank t ON t.id = w.topup_id WHERE t.order_id = '{a}'")
    harap((jumlah_jurnal(a), saldo() - awal, satu_m(f"SELECT status FROM t4m_pembayaran.topup_bank WHERE order_id = '{a}'")), (1, 200000, "dibayar"), "sesudah kiriman ulang")

    bagian("B. Sama, tetapi pemulihan lewat job cek status, tanpa kiriman ulang dari gateway")
    d.stop(PORT_PEMB)
    mulai_pembayaran(["-lab-mati-sesudah-ledger"])
    b = topup(AKUN_BUDI, 150000)
    bayar_di_gateway(b)
    catat("hasil: " + "; ".join(webhook(b, "e2")))
    harap(tunggu_mati("pembayaran"), -signal.SIGKILL, "proses pembayaran dimatikan sinyal")
    catat("# proses service pembayaran: keluar dengan sinyal 9 (SIGKILL)")
    mulai_pembayaran()
    catat("$ pembayaran -cek-topup -cek-umur 0s")
    catat(job_cek_topup())
    keadaan(b, "sesudah job cek status")
    harap(jumlah_jurnal(b), 1, "jurnal order B")

    bagian("C. Batas: Idempotency-Key ledger hidup 24 jam; sesudah itu hanya status topup_bank yang menahan jurnal kedua")
    d.stop(PORT)
    d.stop(PORT_PEMB)
    mulai_monolith(["-jam-lab"])
    mulai_pembayaran(["-lab-mati-sesudah-ledger"])
    c = topup(AKUN_BUDI, 100000)
    bayar_di_gateway(c)
    catat("hasil: " + "; ".join(webhook(c, "e3")))
    harap(tunggu_mati("pembayaran"), -signal.SIGKILL, "proses pembayaran dimatikan sinyal")
    catat("# service pembayaran mati sesudah ledger menjurnal (topup_bank masih menunggu)")
    s, _ = curl("POST", "/lab/jam", {"ms": int(time.time() * 1000) + 25 * 3600 * 1000}, tampil=False)
    harap(s, 204, "geser jam ledger")
    catat("# jam ledger digeser 25 jam sebelum kiriman ulang (key berumur 24 jam)")
    mulai_pembayaran()
    awal = saldo()
    catat("hasil: " + "; ".join(webhook(c, "e3")))
    sql_m(f"SELECT j.id IS NOT NULL AS jurnal, (t.jurnal_id = j.id) AS dipegang_topup_bank FROM t4m_pembayaran.topup_bank t JOIN t4m_ledger.jurnal j ON j.keterangan = 'Top-up bank ' || t.order_id WHERE t.order_id = '{c}' ORDER BY j.id")
    harap((jumlah_jurnal(c), saldo() - awal), (2, 100000), "jurnal kedua sesudah key habis")
    catat("# dua jurnal untuk satu top-up Rp100.000 dan saldo naik dua kali; hanya rekonsiliasi harian (ADR 35) yang menangkapnya, dan itu Tidak dijalankan di lab ini")
    tulis("proses-mati.txt", "service pembayaran dimatikan di antara ledger dan transaction pembayaran: kiriman ulang, job cek status, dan batas key 24 jam",
          f"schema t4m_* (enam modul), monolith di 127.0.0.1:{18280}, service pembayaran di 127.0.0.1:{DASAR_PEMBAYARAN}")


# ---------- latensi.txt ----------

def rekam_latensi():
    ulang_samaran()
    d.buat_schema(TES)
    env = dict(GO_ENV, TEST_DATABASE_URL=d.db_pemilik(TES, "t4-modul-latensi"), LAB_TES_SCHEMA=TES)
    bagian("A. Tambahan latensi HTTP internal: fungsi ledger yang sama dipanggil langsung dan lewat HTTP")
    catat("# Anggaran 50 ms (Hitungan dari naskah: tenggat penerbit 2.000 ms dikurangi lock_timeout 1.000 ms menyisakan 1.000 ms; 5% dari sisa itu adalah Asumsi lab).")
    catat("# Yang diukur hanya satu lompatan HTTP di localhost di satu mesin; jaringan antar host tidak diukur. Nilai mentah tidak direkam, hanya batasnya.")
    jalankan_go("TEST_DATABASE_URL=<pemilik, schema tahap4_modul_tes> go test -tags t4modul -count=1 -v -run TestLatensiHTTPInternal ./internal/handler",
                ["test", "-tags", "t4modul", "-count=1", "-v", "-run", "TestLatensiHTTPInternal", "./internal/handler"], env=env, hanya_lab=True)
    catat("# Hitungan untuk ADR 37: pada puncak 0,579 top-up per detik (naskah bagian 3), satu lompatan HTTP yang menahan koneksi")
    catat("# selama W ms memakai L = 0,579 x W ms; dengan W = 50 ms L = 0,029 koneksi dari pool pembayaran 10 (2 instance x 5, Asumsi naskah; Hitungan).")
    tulis("latensi.txt", "tambahan latensi HTTP internal sebagai batas yang diperiksa", f"schema {TES}, monolith dan klien ledger di localhost")


# ---------- testing.txt ----------

def rekam_testing():
    ulang_samaran()
    d.buat_schema(TES)
    env = dict(GO_ENV, TEST_DATABASE_URL=d.db_pemilik(TES, "t4-modul-tes"), LAB_TES_SCHEMA=TES)
    bagian("A. go vet, dengan dan tanpa tag t4modul")
    jalankan_go("go vet ./...", ["vet", "./..."])
    jalankan_go("go vet -tags t4modul ./...", ["vet", "-tags", "t4modul", "./..."])
    bagian("B. Tes API ledger (service dan HTTP) dan modul pembayaran dengan PostgreSQL sungguhan (schema tahap4_modul_tes)")
    jalankan_go("TEST_DATABASE_URL=<pemilik, schema tahap4_modul_tes> go test -count=1 -p 1 -v -run TestLedger ./internal/service ./internal/handler",
                ["test", "-count=1", "-p", "1", "-v", "-run", "TestLedger", "./internal/service", "./internal/handler"], env=env, hanya_lab=True)
    jalankan_go("TEST_DATABASE_URL=<pemilik, schema tahap4_modul_tes> go test -count=1 -p 1 -v ./internal/modul/...",
                ["test", "-count=1", "-p", "1", "-v", "./internal/modul/..."], env=env, hanya_lab=True)
    bagian("C. Tanpa TEST_DATABASE_URL: tes yang butuh database dilewati, tes tanpa itu tetap jalan; TES_DB_WAJIB=1 menggagalkannya")
    sans = {k: v for k, v in d.ENV.items() if k not in ("TEST_DATABASE_URL", "TEST_REDIS_ADDR")}
    jalankan_go("go test -count=1 ./internal/modul/...", ["test", "-count=1", "./internal/modul/..."], env=sans)
    jalankan_go("TES_DB_WAJIB=1 go test -count=1 ./internal/modul/pembayaran", ["test", "-count=1", "./internal/modul/pembayaran"],
                env=dict(sans, TES_DB_WAJIB="1"), harus=1)
    tulis("testing.txt", "tes Go API ledger, client ledger, modul pembayaran, dan batas modul", f"schema {TES} dan t4m_*")


BAGIAN = {"batas": rekam_batas, "ledger": rekam_ledger, "proses-mati": rekam_proses_mati, "latensi": rekam_latensi,
          "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian {p!r} tidak dikenal; pilihan: {', '.join(BAGIAN)}")
    bangun()
    for p in pilih:
        for port in list(d.server):
            d.stop(port)
        BAGIAN[p]()
        for port in list(d.server):
            d.stop(port)


if __name__ == "__main__":
    main()
