"""Rekam lab t5-gabung: alur skor risiko dalam satu proses lawan tiga proses dengan antrean (peraga untuk ADR 50,
bagian kapan menggabungkan kembali).

Skor risiko di lab ini peraga, bukan fitur produk dan bukan model risiko. Lab tidak memakai database dan tidak memakai
container: semua proses adalah satu biner Go (`gabung`, pustaka standar saja) yang berjalan di loopback, dengan broker
antrean tiruan. Data akun, perangkat, dan riwayat dibangkitkan dari benih tetap di memori.

Yang direkam: jumlah panggilan jaringan per transaksi, dihitung oleh penghitung di kode (dibawa pesan, dicocokkan dengan
penghitung klien tiap proses dan penghitung broker), byte isi pesan, hasil skor yang sama persis di kedua versi, p95
sebagai rasio dengan batas yang diperiksa, dan akibat satu proses mati. Waktu dan p95 bergantung mesin: rekaman menulis
hasil pemeriksaan terhadap batas, bukan angkanya; angka mesin hanya dicetak ke layar. Jeda per panggilan adalah jeda
buatan (Asumsi), bukan hasil ukur jaringan antar host. Lab gagal keras bila hasil meleset.

    make -C labs/t5-gabung run                    (butuh: Go; tanpa Docker)
    make -C labs/t5-gabung run BAGIAN=panggilan   (satu bagian: panggilan latensi mati testing)
"""
import errno
import json
import os
import pathlib
import re
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from lab_env import OFFSET, port_lab  # noqa: E402

LAB = "t5-gabung"
OUT = HERE / "output"
BIN = HERE / "gabung"
# Port dasar (api-t5 18310-18316, t5-fanout 18317, t5-service 18320-18324, t5-waf 18330, t5-kms 18331, t5-rollout 18360-18371).
DASAR = {"antrean": 18340, "satu": 18341, "masuk": 18342, "perangkat": 18343, "riwayat": 18344}
PORT = {nama: port_lab(dasar) for nama, dasar in DASAR.items()}
KERJA = pathlib.Path(tempfile.gettempdir()) / f"t5-gabung-{OFFSET}"
PIDFILE = KERJA / "pid.txt"
URL_ANTREAN = f"http://127.0.0.1:{PORT['antrean']}"
BATAS_MASUK = 2.0      # detik: batas tunggu hasil di proses masuk (flag -batas)
ANGGARAN_MS = 50       # anggaran satu transaksi (naskah: data akun, perangkat, dan riwayat dalam 50 ms)
HOP_PER_TRANSAKSI = 6  # kirim masuk, ambil perangkat, kirim perangkat, ambil riwayat, kirim riwayat, ambil hasil
N_PANGGILAN = 400      # transaksi di bagian panggilan
N_LATENSI, PUTARAN, PEMANASAN = 100, 5, 20
HOP_MS = (0, 2, 4, 10)  # jeda buatan per panggilan, Asumsi
BATAS_RASIO = {0: 2, 2: 10, 4: 10, 10: 10}  # rasio p95 tiga/satu paling kecil yang diperiksa (batas longgar, bukan hasil)

log = []
proses = {}


def catat(teks=""):
    log.append(teks)


def bagian(judul):
    catat(f"\n# --- {judul} ---")


def gagal(pesan):
    hentikan_semua()
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def versi_go():
    r = subprocess.run(["go", "version"], cwd=HERE, capture_output=True, text=True)
    return r.stdout.split()[2] if r.returncode == 0 and len(r.stdout.split()) > 2 else "go?"


def tulis(nama, judul):
    kepala = [f"# Lab {LAB} · {judul}",
              f"# {versi_go()} · tanpa database dan tanpa container · modul lab/t5gabung (pustaka standar) · broker queue tiruan di loopback",
              "# Skor risiko di lab ini peraga, bukan fitur produk dan bukan model risiko.",
              f"# Rekaman: make -C labs/{LAB} run. Waktu dan p95 tidak ditulis; yang ditulis hasil pemeriksaan terhadap batas."]
    OUT.mkdir(exist_ok=True)
    (OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    log.clear()


# ---------- proses ----------

def bangun():
    r = subprocess.run(["go", "build", "-o", str(BIN), "./cmd/gabung"], cwd=HERE, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("GAGAL: go build: " + (r.stderr or r.stdout).strip()[-400:])


def ps_perintah(pid):
    r = subprocess.run(["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True)
    return r.stdout.strip()


def bersihkan_sisa():
    """Hentikan proses lab yang tertinggal dari run yang mati (dikenali dari PID di berkas dan nama biner), per PID."""
    if not PIDFILE.exists():
        return
    for baris in PIDFILE.read_text().split():
        if baris.isdigit() and ps_perintah(int(baris)).startswith(str(BIN)):
            os.kill(int(baris), 15)
    PIDFILE.unlink()


def alamat(nama):
    return f"127.0.0.1:{PORT[nama]}"


def jalan(nama):
    args = {
        "antrean": ["antrean", "-alamat", alamat("antrean")],
        "satu": ["satu", "-alamat", alamat("satu")],
        "masuk": ["masuk", "-alamat", alamat("masuk"), "-antrean", URL_ANTREAN, "-batas", f"{BATAS_MASUK:g}s"],
        "perangkat": ["perangkat", "-alamat", alamat("perangkat"), "-antrean", URL_ANTREAN],
        "riwayat": ["riwayat", "-alamat", alamat("riwayat"), "-antrean", URL_ANTREAN],
    }[nama]
    KERJA.mkdir(parents=True, exist_ok=True)
    p = subprocess.Popen([str(BIN), *args], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=open(KERJA / f"{nama}.log", "w"))
    proses[nama] = p
    PIDFILE.write_text(" ".join(str(q.pid) for q in proses.values()) + "\n")
    deadline = time.time() + 10
    while time.time() < deadline:
        if p.poll() is not None:
            gagal(f"proses {nama} berhenti saat mulai (lihat {KERJA / (nama + '.log')})")
        try:
            get(nama, "/metrik")
            return
        except OSError:
            time.sleep(0.05)
    gagal(f"proses {nama} tidak siap dalam 10 detik")


def mulai(*nama):
    for n in nama:
        harap(n in proses, False, f"proses {n} sudah berjalan")
        jalan(n)


def henti(nama):
    p = proses.pop(nama)
    p.terminate()
    try:
        p.wait(timeout=5)
    except subprocess.TimeoutExpired:
        p.kill()
        p.wait()


def hentikan_semua():
    for n in list(proses):
        henti(n)
    if PIDFILE.exists():
        PIDFILE.unlink()


def get(nama, jalur):
    for percobaan in range(6):  # port sementara host bisa habis oleh TIME_WAIT proses lain (EADDRNOTAVAIL): ulangi
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT[nama]}{jalur}", timeout=5) as r:
                return json.loads(r.read())
        except urllib.error.URLError as e:
            if getattr(e.reason, "errno", None) != errno.EADDRNOTAVAIL or percobaan == 5:
                raise
            time.sleep(1)


def atur_hop(ms):
    req = urllib.request.Request(f"{URL_ANTREAN}/atur?hop_ms={ms}", method="POST")
    with urllib.request.urlopen(req, timeout=5) as r:
        harap(r.status, 204, "atur hop")


def beban(nama, n, pemanasan=0, mulai_dari=0):
    r = subprocess.run([str(BIN), "beban", "-url", f"http://127.0.0.1:{PORT[nama]}/skor", "-n", str(n),
                        "-pemanasan", str(pemanasan), "-mulai", str(mulai_dari), "-anggaran-ms", str(ANGGARAN_MS)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        gagal(f"beban {nama}: {r.stderr.strip()[-300:]}")
    return json.loads(r.stdout)


def tiga_proses():
    return ("masuk", "perangkat", "riwayat")


def foto():
    return {n: get(n, "/metrik") for n in ("satu", "masuk", "perangkat", "riwayat", "antrean")}


def p95_ms(r):
    return r["p95_us"] / 1000


def f1(x):
    return f"{x:.2f}".replace(".", ",")


# ---------- bagian panggilan ----------

def rekam_panggilan():
    mulai("antrean", "satu", "masuk", "perangkat", "riwayat")
    try:
        atur_hop(0)
        bagian("A. Yang dijalankan")
        catat("$ gabung satu -alamat <satu>                                   # satu proses: tiga pembacaan data lewat pemanggilan fungsi")
        catat("$ gabung antrean -alamat <antrean>                             # broker queue tiruan")
        catat("$ gabung masuk|perangkat|riwayat -alamat <...> -antrean <antrean>   # tiga proses layanan, satu data tiap proses")
        catat("# Satu proses berjalan: 1. Tiga proses berjalan: 3 layanan (masuk, perangkat, riwayat) dan 1 broker queue, jadi 4 proses.")
        catat("# Data (memori, benih tetap): 2000 akun di proses masuk, 1500 perangkat di proses perangkat, 60 baris riwayat per akun di proses riwayat.")
        catat("# Versi satu proses memegang ketiganya. Jeda buatan per panggilan: 0 ms.")
        catat("# Panggilan dari client ke pintu masuk (satu POST per transaksi) sama di kedua versi dan tidak ikut dihitung di bawah.")
        catat("# Lingkup: satu bentuk pembagian (rantai tiga proses lewat queue, urut) dan satu skor. Bentuk lain, mis. satu pemanggil yang memanggil")
        catat("# tiga service sekaligus tanpa queue, Tidak dijalankan.")

        sebelum = foto()
        # Pekerja yang menunggu pesan menjawab kosong sesudah 500 ms. Tunggu kejadian itu (bukan jeda tetap) di jendela hitungan, supaya
        # terbukti bahwa ambil kosong tidak ikut dihitung: penghitung client dan broker di bawah harus tetap tepat.
        batas = time.time() + 5
        while get("antrean", "/metrik")["ambil_kosong"] == 0 and time.time() < batas:
            time.sleep(0.05)
        harap(get("antrean", "/metrik")["ambil_kosong"] > 0, True, "ambil yang habis waktu tanpa pesan terjadi sebelum beban")
        s = beban("satu", N_PANGGILAN)
        tiga = beban("masuk", N_PANGGILAN)
        sesudah = foto()

        bagian("B. Panggilan jaringan antar proses per transaksi, dihitung")
        catat(f"$ gabung beban -url <satu>/skor -n {N_PANGGILAN} -pemanasan 0")
        harap(s["gagal"], 0, "transaksi gagal di satu proses")
        pan_s = [h["panggilan"] for h in s["hasil"]]
        harap(set(pan_s), {0}, "panggilan satu proses")
        catat(f"transaksi {s['n']}, gagal 0")
        catat(f"panggilan per transaksi (dibawa pesan): 0 pada {len(pan_s)} dari {len(pan_s)} transaksi")
        catat(f"$ gabung beban -url <masuk>/skor -n {N_PANGGILAN} -pemanasan 0")
        harap(tiga["gagal"], 0, "transaksi gagal di tiga proses")
        pan_t = [h["panggilan"] for h in tiga["hasil"]]
        harap(set(pan_t), {HOP_PER_TRANSAKSI}, "panggilan tiga proses per transaksi")
        catat(f"transaksi {tiga['n']}, gagal 0")
        catat(f"panggilan per transaksi (dibawa pesan): {HOP_PER_TRANSAKSI} pada {len(pan_t)} dari {len(pan_t)} transaksi")

        catat(f"# Penghitung client tiap proses (selisih selama {N_PANGGILAN} transaksi tiga proses): panggilan yang membawa pesan")
        catat("proses      kirim  ambil")
        jumlah_kirim = jumlah_ambil = 0
        for n in tiga_proses():
            kl = {k: sesudah[n]["klien"][k] - sebelum[n]["klien"][k] for k in sesudah[n]["klien"]}
            harap(kl["keluar"], N_PANGGILAN, f"{n}: kirim")
            harap(kl["masuk"], N_PANGGILAN, f"{n}: ambil")
            jumlah_kirim += kl["keluar"]
            jumlah_ambil += kl["masuk"]
            catat(f"{n:<11} {kl['keluar']:>5}  {kl['masuk']:>5}")
        catat(f"{'jumlah':<11} {jumlah_kirim:>5}  {jumlah_ambil:>5}   => {jumlah_kirim + jumlah_ambil} = {HOP_PER_TRANSAKSI} x {N_PANGGILAN}")
        harap(jumlah_kirim + jumlah_ambil, HOP_PER_TRANSAKSI * N_PANGGILAN, "jumlah penghitung klien")
        harap(sesudah["satu"]["klien"], sebelum["satu"]["klien"], "satu proses tidak punya klien antrean")
        harap(sesudah["satu"]["diproses"] - sebelum["satu"]["diproses"], N_PANGGILAN, "transaksi diproses satu proses")
        b = sesudah["antrean"]  # hitungan broker dikosongkan oleh atur_hop(0) sebelum beban pertama
        harap(b["publikasi"], 3 * N_PANGGILAN, "publikasi di broker")
        harap(b["ambil_berisi"], 3 * N_PANGGILAN, "ambil berisi di broker")
        harap(b["tertinggal"], 0, "pesan tertinggal di broker")
        catat(f"# Penghitung broker (sisi penerima, berdiri sendiri dari client): publikasi {b['publikasi']}, ambil berisi {b['ambil_berisi']}, pesan tertinggal {b['tertinggal']}.")
        catat("# Tiga penghitung sama (hitungan dalam pesan, client tiap proses, broker): ya. Penghitung yang tidak cocok menggagalkan lab.")
        catat(f"# Satu proses: metrik prosesnya menulis {N_PANGGILAN} transaksi diproses dan tidak punya client queue, jadi 0 panggilan antar proses.")
        catat("# Ambil yang habis waktu tanpa pesan terjadi di jendela hitungan ini (broker mencatat lebih dari 0 kali; jumlahnya bergantung waktu dan tidak ditulis)")
        catat("# dan tidak ikut dihitung: penghitung client dan broker di atas tetap tepat.")

        bagian("C. Hasil skor sama persis di kedua versi")
        harap(len(s["hasil"]), len(tiga["hasil"]), "jumlah hasil")
        beda = [i for i, (x, y) in enumerate(zip(s["hasil"], tiga["hasil"]))
                if (x["id"], x["skor"], x["keputusan"], x["alasan"]) != (y["id"], y["skor"], y["keputusan"], y["alasan"])]
        harap(beda, [], "transaksi yang hasilnya berbeda")
        keputusan = {}
        for h in s["hasil"]:
            keputusan[h["keputusan"]] = keputusan.get(h["keputusan"], 0) + 1
        harap(sorted(keputusan), ["setuju", "tinjau", "tolak"], "keputusan yang muncul")
        catat(f"# {N_PANGGILAN} transaksi: id, skor, keputusan, dan kode alasan sama di kedua versi: {N_PANGGILAN - len(beda)} dari {N_PANGGILAN}.")
        catat(f"# Keputusan: setuju {keputusan['setuju']}, tinjau {keputusan['tinjau']}, tolak {keputusan['tolak']}. (Perbandingan waktu tidak berarti bila hasilnya beda.)")
        catat("id      skor  keputusan  alasan")
        for h in s["hasil"][:6]:
            catat(f"{h['id']}  {h['skor']:>4}  {h['keputusan']:<9}  {','.join(h['alasan']) or '-'}")

        bagian("D. Byte isi pesan yang lewat jaringan")
        masuk_b, keluar_b = sesudah["antrean"]["byte_masuk"], sesudah["antrean"]["byte_keluar"]
        harap(masuk_b, keluar_b, "byte dikirim dan diterima di broker")
        kl_keluar = sum(sesudah[n]["klien"]["byte_keluar"] - sebelum[n]["klien"]["byte_keluar"] for n in tiga_proses())
        kl_masuk = sum(sesudah[n]["klien"]["byte_masuk"] - sebelum[n]["klien"]["byte_masuk"] for n in tiga_proses())
        harap((kl_keluar, kl_masuk), (masuk_b, keluar_b), "byte klien lawan byte broker")
        catat("# Isi pesan JSON (tanpa header HTTP dan tanpa isi POST dari client). Pesan membawa permintaan, fitur akun, fitur perangkat, dan hasil.")
        catat(f"tiga proses: dikirim ke broker {masuk_b} byte, diterima dari broker {keluar_b} byte, jumlah {masuk_b + keluar_b} byte untuk {N_PANGGILAN} transaksi")
        catat(f"per transaksi: {f1(masuk_b / N_PANGGILAN)} byte dikirim dan {f1(keluar_b / N_PANGGILAN)} byte diterima ({HOP_PER_TRANSAKSI} panggilan)")
        catat("satu proses: 0 byte (tidak ada pesan antar proses)")
        catat("# Byte client tiap proses dijumlahkan sama dengan byte broker: ya.")
        tulis("panggilan.txt", "panggilan jaringan per transaksi: satu proses lawan tiga proses dengan antrean")
    finally:
        hentikan_semua()


# ---------- bagian latensi ----------

def rekam_latensi():
    mulai("antrean", "satu", "masuk", "perangkat", "riwayat")
    try:
        baris = []
        for hop in HOP_MS:
            atur_hop(hop)
            p_satu, p_tiga, lebih_tiga = [], [], []
            for _ in range(PUTARAN):  # bergantian, supaya perubahan beban mesin mengenai kedua versi
                s = beban("satu", N_LATENSI, PEMANASAN)
                t = beban("masuk", N_LATENSI, PEMANASAN)
                harap((s["gagal"], t["gagal"]), (0, 0), f"transaksi gagal pada hop {hop} ms")
                p_satu.append(p95_ms(s))
                p_tiga.append(p95_ms(t))
                lebih_tiga.append(t["lebih_dari_anggaran"])
            ms, mt = statistics.median(p_satu), statistics.median(p_tiga)
            baris.append((hop, ms, mt, p_tiga, lebih_tiga))
            print(f"[layar] hop {hop} ms: p95 satu {ms:.3f} ms, tiga {mt:.3f} ms, rasio {mt / ms:.1f}; "
                  f"p95 tiga per putaran {[round(x, 2) for x in p_tiga]}", flush=True)

        bagian("A. p95 satu transaksi sebagai rasio, bukan nilai mutlak")
        catat(f"# Cara: {PUTARAN} putaran bergantian (satu proses, lalu tiga proses). Tiap putaran {N_LATENSI} transaksi berurutan dan {PEMANASAN} transaksi pemanasan yang tidak diukur.")
        catat("# p95 dihitung per putaran dengan nearest-rank; yang dibandingkan adalah median dari 5 p95 tiap versi. Angka mesin tidak ditulis di rekaman.")
        catat(f"# Jeda buatan per panggilan (Asumsi: {', '.join(str(h) for h in HOP_MS)} ms; lab tidak mengukur jaringan antar host). Satu transaksi tiga proses melewati {HOP_PER_TRANSAKSI} panggilan.")
        catat("# time.Sleep tidak kembali sebelum durasinya lewat, jadi p95 tiga proses paling sedikit 6 x jeda (batas bawah, Hitungan).")
        catat("jeda ms  batas bawah p95 tiga (6 x jeda)  p95 tiga >= batas bawah  rasio p95 tiga/satu >= batas")
        for hop, ms, mt, p_tiga, _ in baris:
            bawah = HOP_PER_TRANSAKSI * hop
            harap(min(p_tiga) >= bawah, True, f"p95 tiga proses pada jeda {hop} ms harus >= {bawah} ms: {p_tiga}")
            harap(mt / ms >= BATAS_RASIO[hop], True, f"rasio p95 pada jeda {hop} ms harus >= {BATAS_RASIO[hop]}: {mt / ms:.2f}")
            catat(f"{hop:>7}  {bawah:>8} ms                    ya                     ya (batas {BATAS_RASIO[hop]})")
        catat("# Pada jeda 0 ms jeda buatan tidak ada: rasionya datang dari kerja tambahan tiga proses (enam panggilan HTTP di loopback, serialisasi JSON, perpindahan goroutine); lab tidak memprofil bagian terbesarnya.")
        catat("# Pada jeda lain rasio didominasi jeda buatan: ia menunjukkan jumlah panggilan dikali jeda, bukan kecepatan jaringan nyata.")

        bagian("B. Anggaran 50 ms")
        per_panggilan = ANGGARAN_MS / HOP_PER_TRANSAKSI
        catat(f"# {ANGGARAN_MS} ms dibagi {HOP_PER_TRANSAKSI} panggilan = {f1(per_panggilan)} ms per panggilan (Hitungan): di atas jeda itu tiga proses melewati anggaran bahkan tanpa kerja apa pun di dalam proses.")
        for hop, ms, mt, p_tiga, lebih in baris:
            harap(ms < ANGGARAN_MS, True, f"p95 satu proses pada jeda {hop} ms di bawah anggaran: {ms:.3f}")
        catat(f"p95 satu proses di bawah {ANGGARAN_MS} ms pada semua jeda: ya (satu proses tidak punya panggilan yang bisa dijedakan)")
        for hop, ms, mt, p_tiga, lebih in baris:
            if hop == 4:
                harap(HOP_PER_TRANSAKSI * hop < ANGGARAN_MS, True, "batas bawah pada jeda 4 ms di bawah anggaran")
                catat(f"jeda 4 ms: batas bawah {HOP_PER_TRANSAKSI * hop} ms, masih di bawah {ANGGARAN_MS} ms; sisa {ANGGARAN_MS - HOP_PER_TRANSAKSI * hop} ms untuk kerja di dalam proses dan keterlambatan timer. "
                      "p95 sebenarnya bergantung mesin dan tidak diperiksa (putaran bisa melewati 50 ms: keterlambatan time.Sleep ikut dihitung)")
            if hop == 10:
                harap(lebih, [N_LATENSI] * PUTARAN, "transaksi tiga proses di atas anggaran pada jeda 10 ms")
                catat(f"jeda 10 ms: batas bawah {HOP_PER_TRANSAKSI * hop} ms, transaksi tiga proses di atas {ANGGARAN_MS} ms: {sum(lebih)} dari {N_LATENSI * PUTARAN} (semuanya, karena batas bawah melewati anggaran)")
        harap(per_panggilan < 10 and per_panggilan > 4, True, "jeda 4 dan 10 ms harus mengapit batas per panggilan")
        tulis("latensi.txt", "p95 sebagai rasio dan anggaran 50 ms: satu proses lawan tiga proses")
    finally:
        hentikan_semua()


# ---------- bagian mati ----------

def rekam_mati():
    mulai("antrean", "satu", "masuk", "perangkat", "riwayat")
    try:
        atur_hop(0)
        bagian("A. Semua proses hidup")
        t = beban("masuk", 1, mulai_dari=1)
        harap((t["gagal"], t["hasil"][0]["panggilan"]), (0, HOP_PER_TRANSAKSI), "transaksi sebelum proses mati")
        catat(f"transaksi T00001 ke tiga proses: 200, {HOP_PER_TRANSAKSI} panggilan")

        bagian("B. Proses riwayat mati, dua proses lain tetap hidup")
        henti("riwayat")
        catat("$ (proses riwayat dihentikan dengan SIGTERM; masuk, perangkat, dan broker tetap hidup)")
        harap("riwayat" in proses, False, "riwayat sudah berhenti")
        t = beban("masuk", 1, mulai_dari=2)
        h = t["hasil"][0]
        harap(h["galat"].startswith("status 504"), True, f"permintaan saat riwayat mati harus 504: {h['galat']}")
        harap(t["p50_us"] / 1e6 >= BATAS_MASUK, True, "permintaan menunggu sampai batas tunggu proses masuk")
        harap(t["p50_us"] / 1e6 < BATAS_MASUK + 6, True, "permintaan tidak menggantung jauh melewati batas tunggu")
        catat(f"transaksi T00002 ke tiga proses: 504 sesudah menunggu paling sedikit {BATAS_MASUK:g} detik (batas tunggu proses masuk), hasil tidak datang")
        tertinggal = get("antrean", "/metrik")["tertinggal"]
        harap(tertinggal, 1, "pesan tertinggal di antrean riwayat")
        catat(f"pesan yang menunggu di queue (topik riwayat): {tertinggal}")
        s = beban("satu", 1, mulai_dari=2)
        harap((s["gagal"], s["hasil"][0]["panggilan"]), (0, 0), "satu proses menjawab transaksi yang sama")
        catat("transaksi T00002 ke satu proses: 200, 0 panggilan (tidak ada proses lain yang bisa mati di tengah jalan)")
        tanpa_sebelum = get("masuk", "/metrik")["hasil_tanpa_penunggu"]

        bagian("C. Proses riwayat hidup lagi")
        jalan("riwayat")
        deadline = time.time() + 10
        while time.time() < deadline:  # tunggu kejadian (pesan lama habis dan hasilnya sampai), bukan jeda tetap
            if get("antrean", "/metrik")["tertinggal"] == 0 and get("masuk", "/metrik")["hasil_tanpa_penunggu"] == tanpa_sebelum + 1:
                break
            time.sleep(0.05)
        harap(get("antrean", "/metrik")["tertinggal"], 0, "pesan lama diproses setelah riwayat hidup")
        harap(get("masuk", "/metrik")["hasil_tanpa_penunggu"], tanpa_sebelum + 1, "hasil pesan lama tanpa penunggu")
        catat("pesan T00002 yang tertinggal diproses oleh proses riwayat yang baru; pesan di queue: 0")
        catat("hasilnya sampai ke proses masuk, tetapi permintaannya sudah dijawab 504: hasil tanpa penunggu bertambah 1")
        t = beban("masuk", 1, mulai_dari=3)
        harap((t["gagal"], t["hasil"][0]["panggilan"]), (0, HOP_PER_TRANSAKSI), "transaksi sesudah riwayat hidup lagi")
        catat(f"transaksi T00003 ke tiga proses: 200, {HOP_PER_TRANSAKSI} panggilan")
        catat("# Queue menahan pesan selama pemrosesnya mati. Pesan itu disimpan di memori broker: broker yang mati membuangnya, dan kasus itu Tidak dijalankan.")
        tulis("mati.txt", "satu proses mati di versi tiga proses")
    finally:
        hentikan_semua()


# ---------- bagian testing ----------

def go(*args):
    r = subprocess.run(["go", *args], cwd=HERE, capture_output=True, text=True)
    t = (r.stdout + r.stderr).replace("\t", "  ")
    t = re.sub(r" \(\d+\.\d+s\)", "", t)
    t = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", t, flags=re.M)
    return r.returncode, t.rstrip()


def rekam_testing():
    bagian("A. go vet dan tes Go")
    rc, t = go("vet", "./...")
    catat("$ go vet ./...")
    catat(t or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, t = go("test", "-v", "-count=1", "./...")
    t = "\n".join(l for l in t.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
    catat("$ go test -v -count=1 ./...")
    catat(t)
    catat(f"# exit status {rc}")
    if rc != 0:
        print(t, file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in t, False, "tes dilewati")
    tulis("testing.txt", "tes Go untuk skor, antrean, dan alur tiga proses")


BAGIAN = {"panggilan": rekam_panggilan, "latensi": rekam_latensi, "mati": rekam_mati, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    bangun()
    bersihkan_sisa()
    for nama in pilih:
        log.clear()
        BAGIAN[nama]()
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
