"""Bagian jejak lab t3-pool (keputusan 957-959): satu pembayaran selama M18 dilihat dari luar."""
import subprocess
import threading
import time

from umum import *  # noqa: E402,F401,F403
from umum import b, d  # noqa: E402


TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"   # contoh dari W3C Trace Context (R3-14)


def rekam_jejak():
    bagian("J. Satu pembayaran dari app ke database selama M18: apa yang terlihat dari luar")
    sesi, warung = pasang(["-rentan", "push-dalam-tx"], tampil="$ ./api-t3 -rentan push-dalam-tx -lab   # pool 10, push timeout 0, idle-tx 0")
    catat("$ curl -X POST '/lab/mode' -d '{\"mode\": \"gantung\"}'   # layanan push tiruan: menerima permintaan, tidak pernah menjawab")
    baris_awal = len(d.log_server())
    catat("# App mengirim header traceparent (contoh dari spesifikasi W3C Trace Context). Satu pembayaran, tanpa beban lain.")
    catat("$ curl -i -X POST '/transfers' -H 'Authorization: Bearer <token sesi Karyawan>' -H 'traceparent: " + TRACEPARENT
          + f"' -d '{{\"ke\": {warung[0]}, \"nominal\": 10000}}'")
    threading.Thread(target=lambda: curl("POST", "/transfers", {"ke": warung[0], "nominal": 10000}, sesi[0][0], tampil=False,
                                         kepala=[f"traceparent: {TRACEPARENT}"]), daemon=True).start()
    d.tunggu(lambda: menggantung() >= 1, "pembayaran sampai di layanan push")
    time.sleep(4.0)
    catat("(belum ada jawaban sesudah 4 detik; client masih menunggu)")
    catat("# 1. Log: api-t3 tidak mencatat request, hanya kejadian server dan kesalahan internal. Request yang menggantung tidak meninggalkan baris.")
    baru = d.log_server()[baris_awal:]
    harap(baru, [], "log tidak menulis baris baru")
    catat(f"baris log baru sesudah 4 detik: {len(baru)}")
    harap(sum(TRACEPARENT.split("-")[1] in l for l in d.log_server()), 0, "trace id tidak muncul di log")
    catat("baris log yang memuat trace-id dari app: 0")
    r = subprocess.run(["grep", "-rli", "traceparent", "cmd", "internal"], cwd=d.HERE, capture_output=True, text=True)
    harap(r.returncode, 1, "kode api-t3 menyebut traceparent")
    catat("$ grep -rli traceparent cmd internal   # di labs/api-t3")
    catat("(tidak ada berkas): kode api-t3 tidak membaca traceparent, jadi trace-id dari app berhenti di perbatasan API")
    catat("# 2. Metric: kolom dipakai dan terbuka dari database/sql DBStats lewat GET /lab/pool.")
    p = cetak_pool()
    harap((p["dipakai"], p["maks"], p["terbuka"]), (1, 10, 1), "satu koneksi dipakai")
    catat("# 3. Database: transaction itu terbuka lebih dari 3 detik dan PostgreSQL sedang menunggu client, bukan menjalankan query.")
    q = ("SELECT state, wait_event_type, wait_event, now() - xact_start > interval '3 seconds' AS lebih_dari_3_detik "
         "FROM pg_stat_activity WHERE application_name = 'api-t3'")
    sql(q)
    baris = sql(q, tampil=False)
    harap([(r[0], r[1], r[2], r[3]) for r in baris], [("idle in transaction", "Client", "ClientRead", True)], "keadaan koneksi")
    catat("# Dari luar proses, petunjuk itu satu-satunya: yang lambat bukan PostgreSQL. Bagian mana di API yang menunggu, tidak terlihat.")
    catat("# Pembanding untuk butir 1, dijalankan sesudah butir 2 dan 3 karena pembacaan membuka koneksi kedua: satu pembacaan saldo yang selesai.")
    s, _ = curl("GET", f"/akun/{sesi[1][1]}", None, sesi[1][0], tampil=False)
    harap(s, 200, "pembacaan saldo pembanding")
    harap(d.log_server()[baris_awal:], [], "pembacaan yang selesai juga tidak menulis baris log")
    catat("pembacaan saldo yang selesai (200): baris log baru sejak awal: 0. Log kosong bukan tanda request menggantung: server ini tidak punya log akses.")
    catat("# 4. Trace: Tidak dijalankan. OpenTelemetry tidak dipasang di api-t3: dependency baru butuh ADR (paket otelhttp [perlu verifikasi], R3-14). "
          "Traces dan Metrics di OpenTelemetry Go berstatus Stable, hanya Logs yang masih Release Candidate (R3-14).")
    hentikan(PORT, PORT_PUSH)
    tulis("jejak.txt", "satu pembayaran selama M18: log, metric, dan database dari luar", lab="t3-pool", keputusan="959")
