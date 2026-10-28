"""Uji mutasi lab t4-audit: satu perubahan pada salinan kerja, lalu tes Go atau rekaman lab harus gagal.

    python3 labs/t4-audit/mutasi/jalankan.py [id ...]      (tanpa argumen: semua mutan di daftar.py, ±30 menit)

Salinan kerja dan hasil.jsonl ada di folder sementara (t4-audit-mutasi di folder temp sistem), bukan di repo; folder itu
dihapus di akhir. Butuh lajur lab yang menyala (make -C labs/b3-race up) dan tidak boleh dijalankan bersamaan dengan
make run lab ini di lajur yang sama: schema, role, dan audit_log dibangun ulang tiap mutan.

Tiap mutan: terapkan satu penggantian pada salinan, pastikan dikompilasi, bangun ulang schema tes dan role (role dan
audit_log bersifat global: satu mutan yang menulis hash lain meracuni run berikutnya), jalankan runner, pulihkan berkas.
Hasil per mutan ditulis ke hasil.jsonl.
"""
import importlib.util, json, os, pathlib, re, shutil, subprocess, sys, time

import tempfile

SELF = pathlib.Path(__file__).resolve().parent
AKAR = SELF.parent.parent                      # labs/
TEMP = pathlib.Path(tempfile.gettempdir()) / "t4-audit-mutasi"
WORK = TEMP / "work" / "labs"
HASIL = TEMP / "hasil.jsonl"
VENV_PY = AKAR / ".venv/bin/python"
ORIG_OUT = AKAR / "t4-audit/output"
TEMP.mkdir(exist_ok=True)

spec = importlib.util.spec_from_file_location("daftar", SELF / "daftar.py")
daftar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(daftar)

sys.path.insert(0, str(AKAR))
from lab_env import DB_PORT  # noqa: E402  (port database lab dari lingkungan, labs/README.md)
DB_PORT = str(DB_PORT)
TES = "tahap4_audit_tes"


def siapkan_salinan():
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(parents=True)
    ex = ["--exclude", "/api-t4", "--exclude", "/pushpalsu", "--exclude", "/tiruan", "--exclude", "/penerbit", "--exclude", "/beban",
          "--exclude", "/pembayaran", "--exclude", "/proxykeluar", "--exclude", "/pindairahasia", "--exclude", "/agen", "--exclude", "/klien",
          "--exclude", "/auditjob", "--exclude", "__pycache__", "--exclude", ".git"]
    for sub in ("api-t1", "api-t2", "api-t3", "api-t4", "b4-migration", "b3-ledger", "t4-audit"):
        subprocess.run(["rsync", "-a", *ex, f"{AKAR / sub}/", f"{WORK / sub}/"], check=True)
    for f in ("lab_env.py", "lab_env.sh", "lab_env.mk", "requirements.txt"):
        shutil.copy(AKAR / f, WORK / f)
    (WORK / ".venv").symlink_to(AKAR / ".venv")


def jalankan(cmd, cwd, env=None, timeout=900):
    e = dict(os.environ, TZ="Asia/Jakarta")
    e.update(env or {})
    r = subprocess.run(cmd, cwd=cwd, env=e, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout + "\n" + r.stderr


def kompilasi():
    for cwd in (WORK / "api-t4", WORK / "t4-audit/mcp"):
        rc, out = jalankan(["go", "vet", "-tags", "t4audit", "./..."], cwd)
        if rc != 0:
            return False, out[-400:]
    return True, ""


def siapkan_tes():
    rc, out = jalankan([str(VENV_PY), "-c", "import sys; sys.path.insert(0, '.'); import run; run.bangun(); run.siapkan(run.TES)"], WORK / "t4-audit")
    return rc, out


def env_tes():
    pemilik = f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?search_path={TES}&application_name=t4-audit-tes"
    agen = f"postgres://t4a_agen:t4a_agen@127.0.0.1:{DB_PORT}/lab?search_path={TES}&application_name=t4-audit-tes-agen"
    return {"TEST_DATABASE_URL": pemilik, "LAB_TES_SCHEMA": TES, "TES_DB_WAJIB": "1",
            "T4A_TEST_DATABASE_URL": pemilik, "T4A_TEST_SCHEMA": TES, "T4A_TEST_AGEN_URL": agen}


def gagal_tes(out):
    return sorted(set(re.findall(r"^--- FAIL: (\S+)", out, flags=re.M)))


def runner_api():
    rc, out = jalankan(["go", "test", "-tags", "t4audit", "-p", "1", "-count=1", "-run", "TestT4A", "./internal/repo", "./internal/jangkar", "./internal/service"],
                       WORK / "api-t4", env_tes())
    return rc != 0, gagal_tes(out) or ([out.strip().splitlines()[-1][:120]] if rc else [])


def runner_luas():
    """Tes bertag t4audit ditambah tes api-t4 tanpa tag untuk back office dan audit (bo_test.go, audit_test.go,
    handler_bo_test.go): yang tertangkap hanya di sini sudah tertangkap `make -C labs/api-t4 cek`. Satu tes yang butuh
    pengaturan role lain dilewati."""
    rc, out = jalankan(["go", "test", "-tags", "t4audit", "-p", "1", "-count=1", "-run", "TestBO|TestAudit|TestPeriksa|TestHTTPBO",
                        "-skip", "TestAuditRoleAplikasiDitolak", "./internal/repo", "./internal/service", "./internal/handler"],
                       WORK / "api-t4", env_tes())
    return rc != 0, gagal_tes(out) or ([out.strip().splitlines()[-1][:120]] if rc else [])


def runner_mcp():
    rc, out = jalankan(["go", "test", "-p", "1", "-count=1", "./..."], WORK / "t4-audit/mcp", env_tes())
    return rc != 0, gagal_tes(out) or ([out.strip().splitlines()[-1][:120]] if rc else [])


def runner_lab(bagian):
    rc, out = jalankan([str(VENV_PY), "run.py", bagian], WORK / "t4-audit")
    if rc != 0:
        m = re.search(r"GAGAL: (.*)", out)
        return True, [("run.py gagal: " + (m.group(1) if m else out.strip().splitlines()[-1]))[:140]]
    beda = []
    for f in sorted((WORK / "t4-audit/output").glob("*.txt")):
        asli = ORIG_OUT / f.name
        if not asli.exists() or asli.read_text() != f.read_text():
            beda.append(f.name)
    # bagian yang dijalankan hanya menulis berkas miliknya; yang lain tetap sama dengan salinan awal
    return bool(beda), ["selisih rekaman: " + ", ".join(beda)] if beda else []


def pulihkan_output():
    sumber = AKAR / "t4-audit/output"
    tujuan = WORK / "t4-audit/output"
    if tujuan.exists():
        shutil.rmtree(tujuan)
    shutil.copytree(sumber, tujuan)


def main():
    ids = sys.argv[1:]
    siapkan_salinan()
    pulihkan_output()
    daftar_m = [m for m in daftar.M if not ids or m[0] in ids]
    HASIL.write_text("") if not ids else None
    for (mid, berkas, lama, baru, runners) in daftar_m:
        t0 = time.time()
        path = WORK / berkas
        asli = (AKAR / berkas).read_text()
        if lama not in asli:
            rec = {"id": mid, "status": "JANGKAR-HILANG"}
            HASIL.open("a").write(json.dumps(rec) + "\n")
            print(mid, rec["status"], flush=True)
            continue
        path.write_text(asli.replace(lama, baru, 1))
        try:
            ok, pesan = kompilasi()
            if not ok:
                rec = {"id": mid, "status": "TIDAK-DIKOMPILASI", "pesan": pesan}
            else:
                rc, out = siapkan_tes()
                if rc != 0:
                    rec = {"id": mid, "status": "SIAPKAN-GAGAL", "pesan": out[-300:]}
                else:
                    tangkap = []
                    for r in runners.split(","):
                        if r == "api":
                            t, d = runner_api()
                        elif r == "luas":
                            t, d = runner_luas()
                        elif r == "mcp":
                            t, d = runner_mcp()
                        elif r.startswith("lab:"):
                            pulihkan_output()
                            t, d = runner_lab(r[4:])
                        else:
                            continue
                        if t:
                            tangkap.append({"runner": r, "oleh": d[:3]})
                    rec = {"id": mid, "berkas": berkas, "status": "TERTANGKAP" if tangkap else "LOLOS", "oleh": tangkap}
        finally:
            path.write_text(asli)
        rec["detik"] = round(time.time() - t0)
        HASIL.open("a").write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(mid, rec["status"], json.dumps(rec.get("oleh", rec.get("pesan", "")), ensure_ascii=False)[:160], flush=True)
    # pembersihan: biner dan salinan kerja
    shutil.rmtree(TEMP / "work", ignore_errors=True)


if __name__ == "__main__":
    main()
