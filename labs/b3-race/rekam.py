"""Pencatat dua koneksi untuk lab b3-race versi ledger (keputusan 430), dipakai run_ledger.py.

Klien A dan B menjalankan statement di thread sendiri. Statement yang tertahan lock dicatat sebagai MENUNGGU dan
dilanjutkan sesudah lock dilepas. Pengamat (koneksi ketiga, tidak direkam) membaca sesudah tiap langkah: saldo Budi
yang sudah COMMIT, pemegang row lock baris buku Budi (pgrowlocks), dan siapa menunggu lock (hanya pid A dan B).
Setiap langkah disimpan dengan kunci yang sama dengan rekaman lama output/*.json, supaya bisa diputar widget race.
"""
import threading, time
from decimal import Decimal
import psycopg

SCHEMA = "b3_race"
DSN = "host=127.0.0.1 port=54333 user=lab password=lab dbname=lab application_name=b3-race-ledger"
NAMA_SQLSTATE = {"23514": "check_violation", "40001": "serialization_failure"}
SALDO_AWAL = 100000
B_BUDI = 2


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def rp(n):
    return ("-" if n < 0 else "") + "Rp" + f"{abs(n):,}".replace(",", ".")


def sambung():
    # search_path lewat parameter koneksi (keputusan 80): SQL yang direkam tetap tanpa nama schema.
    c = psycopg.connect(DSN + f" options=-csearch_path={SCHEMA}", autocommit=True)
    c.prepare_threshold = None
    return c


def nilai(v):
    return int(v) if isinstance(v, Decimal) else v


# ---------- pengamat: koneksi ketiga, tidak masuk rekaman ----------

class Pengamat:
    def __init__(self, klien):
        self.c = sambung()
        self.klien = klien

    def satu(self, q):
        return nilai(self.c.execute(q).fetchone()[0])

    def saldo(self):
        return self.satu(f"SELECT coalesce(sum(jumlah), 0) FROM posting WHERE buku_id = {B_BUDI}")

    def cache(self):
        return self.satu(f"SELECT saldo_cache FROM buku WHERE id = {B_BUDI}")

    def menunggu(self, pid):
        r = self.c.execute("SELECT wait_event_type, wait_event FROM pg_stat_activity WHERE pid = %s", (pid,)).fetchone()
        return r[1] if r and r[0] == "Lock" else None

    def lock(self):
        """Pemegang row lock di baris buku Budi, mis. 'A (For Update)' atau 'A,B (For Key Share)'."""
        r = self.c.execute(f"SELECT l.pids, l.modes FROM {SCHEMA}.buku b, public.pgrowlocks('{SCHEMA}.buku') l "
                           f"WHERE l.locked_row = b.ctid AND b.id = {B_BUDI}").fetchall()
        if not r:
            return None
        harap(len(r), 1, "baris buku Budi yang terkunci")
        nama = {k.pid: n for n, k in self.klien.items()}
        # pid 0 = anggota multixact yang transaction-nya sudah selesai: lock-nya tidak dipegang lagi.
        pemegang = [(nama.get(p, "?"), m) for p, m in zip(*r[0]) if p != 0]
        if not pemegang:
            return None
        harap(all(n != "?" for n, _ in pemegang), True, f"lock dipegang koneksi di luar A dan B: {r}")
        if len({m for _, m in pemegang}) == 1:
            return ",".join(n for n, _ in pemegang) + f" ({pemegang[0][1]})"
        return ", ".join(f"{n} ({m})" for n, m in pemegang)


# ---------- dua client ----------

class Hasil:
    def __init__(self, rows=None, status=None, err=None, tunggu=None):
        self.rows, self.status, self.err, self.tunggu = rows, status, err, tunggu

    def satu(self):
        return nilai(self.rows[0][0])


class Klien:
    """Satu koneksi = satu request di server API (A = HP Budi, B = tablet Budi)."""

    def __init__(self, nama, rec):
        self.nama, self.rec = nama, rec
        self.conn = sambung()
        self.pid = self.conn.info.backend_pid
        self.vars = {}
        self.tunda = None

    def sql(self, q, simpan=(), tolak=None, note=""):
        """Jalankan q. tolak = SQLSTATE yang harus muncul. Statement yang tertahan lock dicatat sebagai MENUNGGU."""
        kotak = {}
        t = threading.Thread(target=self._kerja, args=(q, kotak))
        t.start()
        t.join(0.3)
        if t.is_alive():
            tunggu = self.rec.pengamat_tunggu(self.pid)
            if tunggu:
                self.tunda = (t, kotak, q, simpan, tolak)
                self.rec.langkah(self.nama, q, "MENUNGGU lock", note or f"menunggu lock ({tunggu})")
                return Hasil(tunggu=tunggu)
            t.join()
        return self._selesai(kotak, q, simpan, tolak, note)

    def lanjut(self, note):
        """Statement yang tadi menunggu lock selesai sesudah lock dilepas."""
        t, kotak, q, simpan, tolak = self.tunda
        self.tunda = None
        t.join(10)
        if t.is_alive():
            gagal(f"{self.nama} masih menunggu sesudah lock dilepas")
        return self._selesai(kotak, q, simpan, tolak, note)

    def _kerja(self, q, kotak):
        try:
            cur = self.conn.execute(q)
            kotak["ok"] = (cur.fetchall() if cur.description else None, cur.statusmessage)
        except psycopg.Error as e:
            kotak["err"] = e

    def _selesai(self, kotak, q, simpan, tolak, note):
        if "err" in kotak:
            e = kotak["err"]
            if tolak is None:
                gagal(f"{self.nama}: tidak diharapkan ditolak: {e}")
            harap(e.sqlstate, tolak, f"SQLSTATE {self.nama}")
            self.rec.langkah(self.nama, q, f"ERROR {e.sqlstate} {NAMA_SQLSTATE.get(e.sqlstate, '?')}: {e.diag.message_primary}", note)
            return Hasil(err=e.sqlstate)
        if tolak is not None:
            gagal(f"{self.nama}: harus ditolak dengan {tolak}: {q}")
        rows, status = kotak["ok"]
        if simpan and rows:
            self.vars.update(zip(simpan, (nilai(v) for v in rows[0])))
        if rows is None:
            teks = status
        elif not rows:
            teks = "(0 rows)"
        else:
            teks = "; ".join(" | ".join(str(nilai(v)) for v in r) for r in rows)
        self.rec.langkah(self.nama, q, teks, note)
        return Hasil(rows=rows, status=status)

    def tutup(self):
        self.conn.close()


class Rekaman:
    def __init__(self):
        self.steps, self.klien = [], {}
        self.p = None

    def pengamat_tunggu(self, pid, batas=3.0):
        akhir = time.time() + batas
        while time.time() < akhir:
            w = self.p.menunggu(pid)
            if w:
                return w
            time.sleep(0.05)
        return None

    def tenang(self):
        """Statement yang menunggu lock diberi waktu selesai sesudah lock dilepas, supaya pengamatan tidak bergantung
        pada seberapa cepat proses PostgreSQL bangun. Yang masih tertahan lock 0,5 detik kemudian memang menunggu."""
        for k in self.klien.values():
            if k.tunda:
                t = k.tunda[0]
                t.join(0.5)
                if t.is_alive() and not self.p.menunggu(k.pid):
                    t.join(10)

    def langkah(self, actor, sql, result, note=""):
        self.tenang()
        self.steps.append(dict(
            actor=actor, sql=sql, result=result, note=note,
            committed=self.p.saldo(), lock=self.p.lock(),
            waiting=[n for n, k in self.klien.items() if self.p.menunggu(k.pid)],
            vars={n: dict(k.vars) for n, k in self.klien.items()}))

    def app(self, actor, teks):
        """Langkah di kode API (bukan SQL), mis. 'saldo cukup, lanjut'."""
        self.langkah(actor, None, teks, "kode aplikasi")



def teks_langkah(steps):
    out, saldo = [], SALDO_AWAL
    for n, s in enumerate(steps, 1):
        apa = f"{s['sql']}  -> {s['result']}" if s["sql"] else f"({s['result']})"
        tambah = f"   [lock: {s['lock']}]" if s["lock"] else ""
        if s["committed"] != saldo:
            tambah += f"   [saldo COMMIT {s['committed']}]"
            saldo = s["committed"]
        out.append(f"{n:2d} [{s['actor']}] {apa}{tambah}")
        if s["note"] and s["note"] != "kode aplikasi":
            out.append(f"         -- {s['note']}")
    return out


def tabel(kolom, isi):
    lebar = [max([len(k)] + [len(str(r[i])) for r in isi]) for i, k in enumerate(kolom)]
    out = [" " + " | ".join(k.center(w) for k, w in zip(kolom, lebar)),
           "-" + "-+-".join("-" * w for w in lebar) + "-"]
    for r in isi:
        out.append(" " + " | ".join(str(v).rjust(w) if isinstance(v, int) else str(v).ljust(w) for v, w in zip(r, lebar)))
    out.append(f"({len(isi)} rows)")
    return out
