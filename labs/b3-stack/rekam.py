"""Rekam contoh B3 di setiap stack: output program + statement yang diterima PostgreSQL.

PostgreSQL lab dijalankan dengan log_statement=all dan log_line_prefix "%a|%p|"
(application_name|pid|). Setiap stack memakai application_name sendiri, jadi
log bisa dipisah per stack. Hasilnya menjawab "siapa yang benar-benar mengirim
ROLLBACK" dengan bukti dari sisi database, bukan dari klaim di kode.

Keluaran: output/<stack>-<skenario>.txt   (skenario: transfer, tarik)
Jalankan: make rekam   (butuh: make -C ../b3-race up)
"""
import os, pathlib, re, subprocess, time
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

HERE = pathlib.Path(__file__).parent
OUT = HERE / "output"
COMPOSE = ["docker", "compose", "-f", str(HERE / "../b3-race/docker-compose.yml")]
BASE = f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?options=-c%20search_path%3Db3s"  # schema b3s
PSQL = COMPOSE + ["exec", "-T", "-e", "PGOPTIONS=-csearch_path=b3s"]


# stack -> skenario -> (tampilan perintah, daftar perintah)
def commands(stack, scen):
    env = dict(os.environ, DATABASE_URL=f"{BASE}&application_name={stack}", APP_NAME=stack)
    if stack == "go":
        return f"go run . {scen}", [(["go", "run", ".", scen], HERE / "go", env)]
    if stack == "node":
        return f"node main.js {scen}", [(["node", "main.js", scen], HERE / "node", env)]
    if stack == "django":
        return f"python django/main.py {scen}", [([str(HERE / "../.venv/bin/python"), "django/main.py", scen], HERE, env)]
    if stack == "laravel":
        if scen == "transfer":
            return "php main.php transfer", [(["php", "main.php", "transfer"], HERE / "laravel", env)]
        # dua request = dua proses PHP yang berjalan bersamaan
        return "php main.php tarik 70000 & php main.php tarik 50000", [
            ("RESET", None, None),
            ("PARALEL", [["php", "main.php", "tarik", "70000"], ["php", "main.php", "tarik", "50000"]], (HERE / "laravel", env)),
            (["php", "main.php", "cetak"], HERE / "laravel", env)]
    if stack == "supabase":
        return f"psql -f supabase/uji-{scen}.sql", [("RESET", None, None),
                                                    ("PSQL", HERE / f"supabase/uji-{scen}.sql", stack)]
    raise ValueError(stack)


def logs():
    r = subprocess.run(COMPOSE + ["logs", "--no-log-prefix", "db"], capture_output=True, text=True)
    return (r.stdout + r.stderr).splitlines()


def reset():
    for f in ("schema.sql", "supabase/fungsi.sql"):
        # ON_ERROR_STOP=1: tanpa ini psql keluar 0 walau DROP/CREATE gagal, dan lab merekam hasil skema lama.
        r = subprocess.run(PSQL + ["-e", "PGAPPNAME=setup", "db", "psql", "-U", "lab", "-d", "lab", "-q",
                               "-v", "ON_ERROR_STOP=1"],
                           input=(HERE / f).read_text(), text=True, capture_output=True)
        if r.returncode:
            raise SystemExit(f"GAGAL reset {f}:\n{r.stderr.strip()}\nRekaman lama tidak ditimpa.")


def run(stack, scen):
    shown, steps = commands(stack, scen)
    before = len(logs())
    out = []
    for step in steps:
        if step[0] == "RESET":
            reset()
        elif step[0] == "PARALEL":
            cwd, env = step[2]
            procs = [subprocess.Popen(c, cwd=cwd, env=env, stdout=subprocess.PIPE, text=True) for c in step[1]]
            out += [p.communicate()[0] for p in procs]
            for c, p in zip(step[1], procs):
                if p.returncode:
                    raise SystemExit(f"GAGAL: {' '.join(c)} keluar dengan kode {p.returncode}")
        elif step[0] == "PSQL":
            r = subprocess.run(PSQL + ["-e", f"PGAPPNAME={step[2]}", "db", "psql", "-U", "lab", "-d", "lab", "-q",
                                       "-v", "ON_ERROR_STOP=0", "-t", "-A"],
                               input=step[1].read_text(), text=True, capture_output=True)
            out.append("".join("ERROR: " + l.split("ERROR:", 1)[1].strip() + "\n"
                               for l in r.stderr.splitlines() if "ERROR:" in l) + r.stdout)
        else:
            cmd, cwd, env = step
            r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=True)
            out.append(r.stdout)
    time.sleep(0.5)  # beri waktu log tertulis
    return shown, "".join(out).strip(), parse(logs()[before:], stack)


SKIP = re.compile(r"^(--|drop |create |insert |set |show |select set_config|select pg_|select version|"
                  r"select current_|deallocate)", re.I)


def parse(lines, app):
    """Gabungkan baris log milik app, isi parameter, buang setup dan SELECT cetak."""
    entries, cur = [], None
    for line in lines:
        m = re.match(r"^([^|]*)\|(\d+)\|(\w+):\s+(.*)$", line)
        if m:
            cur = {"app": m[1], "pid": m[2], "kind": m[3], "text": m[4]}
            entries.append(cur)
        elif cur is not None:
            cur["text"] += " " + line.strip()
    keep, labels, pending = [], {}, None
    for e in entries:
        if e["app"] != app:
            continue
        text = re.sub(r"\s+", " ", e["text"]).strip()
        if e["kind"] == "LOG":
            m = re.match(r"^(statement|execute [^:]*):\s*(.*)$", text)
            if not m:
                continue
            stmt = m[2].strip().rstrip(";")
            cetak = re.match(r"select", stmt, re.I) and not re.search(r"for update|transfer\(|tarik\(", stmt, re.I)
            if not stmt or SKIP.match(stmt) or cetak:
                pending = None
                continue
            pending = {"pid": e["pid"], "sql": stmt}
            keep.append(pending)
        elif e["kind"] == "DETAIL" and text.startswith("Parameters:") and pending:
            for k, v in re.findall(r"\$(\d+) = ('(?:[^']|'')*'|NULL)", text):
                val = v if not re.fullmatch(r"'-?\d+'", v) else v.strip("'")
                pending["sql"] = re.sub(rf"\${k}(?!\d)", val, pending["sql"])
        elif e["kind"] == "ERROR":
            keep.append({"pid": e["pid"], "sql": "ERROR: " + text})
            pending = None
    for k in keep:
        labels.setdefault(k["pid"], "AB"[len(labels)] if len(labels) < 2 else "?")
        if re.fullmatch(r"(begin|commit|rollback)", k["sql"], re.I):
            k["sql"] = k["sql"].upper()
    multi = len(labels) > 1
    return [(f"[{labels[k['pid']]}] " if multi else "") + k["sql"] for k in keep]


# Error yang memang bagian skenario: CHECK saldo <= batas di transfer. Error lain berarti lab rusak
# (skema lama, kolom hilang, koneksi gagal), dan program stack menangkapnya lalu keluar 0.
DIHARAPKAN = "akun_check"
TANDA_ERROR = re.compile(r"error|sqlstate|exception|does not exist|fatal|traceback", re.I)


def periksa(stack, scen, stdout):
    """Gagal keras bila hasil tidak sesuai skenario. Mengembalikan pesan, atau None bila benar."""
    for line in stdout.splitlines():
        if TANDA_ERROR.search(line) and not (scen == "transfer" and DIHARAPKAN in line):
            return f"error tak terduga: {line.strip()[:200]}"
    saldo = dict(re.findall(r"(budi|ani)=(\d+)", stdout))
    if scen == "transfer":
        if DIHARAPKAN not in stdout:
            return "transfer seharusnya ditolak CHECK akun_check"
        if saldo != {"budi": "100000", "ani": "980000"}:
            return f"saldo setelah transfer gagal seharusnya tidak berubah, didapat {saldo}"
    else:
        if stdout.count(": sukses") != 1 or stdout.count(": saldo tidak cukup") != 1:
            return "tepat satu penarikan harus sukses dan satu ditolak"
        if saldo.get("ani") != "980000" or saldo.get("budi") not in ("30000", "50000"):
            return f"saldo akhir tidak mungkin: {saldo}"
    return None


def main():
    OUT.mkdir(exist_ok=True)
    hasil = {}
    version = subprocess.run(PSQL + ["db", "psql", "-U", "lab", "-d", "lab", "-tAc", "SHOW server_version"],
                             capture_output=True, text=True).stdout.split()[0]
    for stack in ("go", "node", "laravel", "django", "supabase"):
        for scen in ("transfer", "tarik"):
            if stack != "supabase":
                reset()
            shown, stdout, received = run(stack, scen)
            salah = periksa(stack, scen, stdout)
            if salah:
                raise SystemExit(f"GAGAL {stack} {scen}: {salah}\nOutput:\n{stdout}\nRekaman lama tidak ditimpa.")
            text = [f"$ {shown}", stdout, "",
                    f"-- diterima PostgreSQL {version} (log_statement=all), urut saat diterima:"] + received
            hasil[f"{stack}-{scen}.txt"] = "\n".join(text) + "\n"
            print("\n".join(text), "\n")
    # Ditulis hanya bila semua stack dan skenario lolos, supaya rekaman tidak setengah lama setengah baru.
    for nama, isi in hasil.items():
        (OUT / nama).write_text(isi)


if __name__ == "__main__":
    main()
