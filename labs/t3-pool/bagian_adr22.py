"""Bagian adr22 lab t3-pool (keputusan 957-959): opsi ADR 22: timeout di dalam transaction, idle-tx saja, push di luar transaction."""
import statistics
import threading
import time

import psycopg

from umum import *  # noqa: E402,F401,F403
from umum import b, d  # noqa: E402


def rekam_adr22():
    bagian("D. Timeout push 3 detik, tetapi tetap di dalam transaction: pool selamat, lock buku warung tertahan")
    sesi, warung = pasang(["-rentan", "push-dalam-tx", "-push-timeout", "3s"],
                          tampil="$ ./api-t3 -rentan push-dalam-tx -push-timeout 3s -lab   # pool 10, push timeout 3 detik, idle-tx 0")
    catat("$ curl -X POST '/lab/mode' -d '{\"mode\": \"gantung\"}'   # layanan push tiruan: menerima permintaan, tidak pernah menjawab")
    for k in KOMENTAR_BEBAN:
        catat(k)
    t0 = time.monotonic()
    pg = b.Pengamat(d.PEMILIK, t0)
    be = b.Beban(PORT, sesi, warung)
    pg.mulai()
    be.mulai(t0)
    be.tidur_sampai(15.0)
    be.henti()
    rb, rr = be.rekap(1, 200, "bayar"), be.rekap(1, 250, "baca")
    nr = len(be.nomor(1, 250, "baca"))
    harap(rb, {201: 10}, "pembayaran dengan timeout push")
    harap(rr, {200: nr}, "pembacaan dengan timeout push")
    lambat = [x for x in be.durasi("bayar", 1, 200) if x > 2.9]
    harap(len(lambat), 10, "tiap pembayaran memakan lebih dari 2,9 detik")
    log = [l for l in d.log_server() if "push gagal, hanya dicatat" in l]
    harap(len(log), 10, "baris log push gagal")
    puncak = pg.puncak(1)
    harap(puncak, 3, "puncak idle in transaction dengan timeout 3 detik")
    catat(f"pembayaran request 1 sampai 200: 10 pembayaran: {ringkas(rb)}; tiap pembayaran memakan lebih dari 2,9 detik: ya")
    catat(f"pembacaan request 1 sampai 250: {nr} pembacaan: {ringkas(rr)}")
    catat(f"koneksi idle in transaction: puncak {puncak} dari 10 (0,87 × 3 detik = {kom(LAMBDA * 3, 2)}, jadi paling banyak 3): pool tidak penuh")
    catat("server log: 10 baris 'push gagal, hanya dicatat: ... Client.Timeout exceeded ...' (satu per pembayaran)")
    harap(all("Client.Timeout" in l for l in log), True, "log menyebut Client.Timeout")
    pg.henti()
    d.tunggu(be.semua_selesai, "semua request selesai", batas=20)
    catat("# Timeout menyelamatkan pool, tetapi pembayaran tetap menahan lock buku warung selama push menunggu. Dua pembayaran ke warung yang sama, selisih 0,5 detik:")
    (token_x, _), (token_y, _) = sesi[40], sesi[41]
    w = warung[30]
    d.push_reset()
    d.push_mode("gantung")
    hasil, thread = {}, []

    def bayar(nama, token):
        mulai = time.monotonic()
        s, _ = curl("POST", "/transfers", {"ke": w, "nominal": 10000}, token, tampil=False, maks=30)
        hasil[nama] = (s, time.monotonic() - mulai)

    for nama, token, tunda in (("x", token_x, 0.0), ("y", token_y, 0.5)):
        time.sleep(tunda)
        th = threading.Thread(target=bayar, args=(nama, token))
        th.start()
        thread.append(th)
    d.tunggu(lambda: satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND wait_event_type = 'Lock'") >= 1,
             "pembayaran kedua menunggu lock buku warung", batas=5)
    catat("=> SELECT count(*) AS menunggu_lock FROM pg_stat_activity WHERE application_name = 'api-t3' AND wait_event_type = 'Lock'")
    menunggu = satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND wait_event_type = 'Lock'")
    harap(menunggu, 1, "satu transaction menunggu lock")
    catat(f"menunggu_lock: {menunggu} (transaction kedua menunggu lock buku warung)")
    for th in thread:
        th.join(30)
    harap((hasil["x"][0], hasil["y"][0]), (201, 201), "dua pembayaran selesai")
    print(f"  (konsol) pertama {hasil['x'][1]:.2f} detik, kedua {hasil['y'][1]:.2f} detik")
    catat("pembayaran pertama: 201 sesudah sekitar 3 detik (lebih dari 2,9 dan kurang dari 3,5): " + ya(2.9 < hasil["x"][1] < 3.5, "pembayaran pertama"))
    catat("pembayaran kedua: 201 sesudah lebih dari 5 detik (menunggu yang pertama selesai di detik ke-3, lalu push-nya sendiri 3 detik; tanpa rebutan lock 3 detik): "
          + ya(5.0 < hasil["y"][1] < 6.5, "pembayaran kedua"))
    catat("# Satu warung hanya menerima satu pembayaran per 3 detik selama push menggantung, walau pool kosong.")
    hentikan(PORT, PORT_PUSH)

    bagian("E. idle_in_transaction_session_timeout 5 detik saja, push tanpa batas waktu: PostgreSQL bebas, pool di Go tidak")
    sesi, warung = pasang(["-rentan", "push-dalam-tx", "-idle-tx", "5s"],
                          tampil="$ ./api-t3 -rentan push-dalam-tx -idle-tx 5s -lab   # pool 10, push timeout 0, idle-tx 5 detik")
    catat("$ curl -X POST '/lab/mode' -d '{\"mode\": \"gantung\"}'   # layanan push tiruan: menerima permintaan, tidak pernah menjawab")
    for k in KOMENTAR_BEBAN:
        catat(k)
    fatal0 = satu("SELECT sessions_fatal FROM pg_stat_database WHERE datname = 'lab'")
    t0 = time.monotonic()
    pg = b.Pengamat(d.PEMILIK, t0)
    be = b.Beban(PORT, sesi, warung)
    pg.mulai()
    be.mulai(t0)
    be.tidur_sampai(15.4)
    be.henti()
    puncak = pg.puncak(1)
    harap(puncak, 5, "puncak idle in transaction dengan idle-tx 5 detik")
    fatal = satu("SELECT sessions_fatal FROM pg_stat_database WHERE datname = 'lab'") - fatal0
    harap(fatal >= 8, True, f"sesi dihentikan PostgreSQL: {fatal}")
    print(f"  (konsol) sessions_fatal naik {fatal}")
    catat("=> SELECT sessions_fatal FROM pg_stat_database WHERE datname = 'lab'   # selisih sejak beban mulai")
    catat("sesi yang dihentikan PostgreSQL dengan kesalahan fatal (idle-in-transaction timeout): paling sedikit 8: ya")
    catat(f"di PostgreSQL: idle in transaction puncak {puncak} (0,87 × 5 detik = {kom(LAMBDA * 5, 2)}); sesi yang lebih tua dari 5 detik dihentikan PostgreSQL")
    harap(idle_tx() <= 2, True, "idle in transaction sekarang")
    catat("di PostgreSQL sekarang: idle in transaction tidak lebih dari 2 (pembayaran ke-1 sampai ke-8 sudah diputus)")
    with d.sambung() as c:
        c.execute("SELECT id FROM buku WHERE akun_id = %s FOR UPDATE NOWAIT", (warung[0],))
        catat(f"=> SELECT id FROM buku WHERE akun_id = {warung[0]} FOR UPDATE NOWAIT   # warung pembayaran ke-1 (putus pada detik ke-6)")
        catat("lock buku warung pembayaran ke-1: didapat (PostgreSQL sudah melepasnya)")
        try:
            c.execute("SELECT id FROM buku WHERE akun_id = %s FOR UPDATE NOWAIT", (warung[9],))
            gagal("lock buku warung pembayaran ke-10 seharusnya masih dipegang")
        except psycopg.errors.LockNotAvailable as e:
            catat(f"=> SELECT id FROM buku WHERE akun_id = {warung[9]} FOR UPDATE NOWAIT   # warung pembayaran ke-10 (putus pada detik ke-16)")
            catat(f"lock buku warung pembayaran ke-10: ditolak {e.sqlstate} (masih dipegang; baru lepas sesudah 5 detik)")
    p = cetak_pool()
    harap((p["dipakai"], p["maks"], p["terbuka"]), (10, 10, 10), "pool Go tetap penuh")
    r2 = be.rekap(201, 212, "baca")
    harap(r2, {0: 12}, "pembacaan sesudah pool Go penuh")
    catat(f"di Go: pool tetap penuh walau PostgreSQL sudah memutus sesinya. Pembacaan request 201 sampai 212: 12 pembacaan: {ringkas(r2)}")
    sql("SELECT count(*) AS jurnal_bayar FROM jurnal WHERE jenis = 'bayar'")
    harap(satu("SELECT count(*) FROM jurnal WHERE jenis = 'bayar'"), 0, "tidak ada jurnal bayar")
    catat("# idle_in_transaction_session_timeout melindungi PostgreSQL (lock dan transaction terbuka). Slot pool ada di proses Go dan tetap terpakai selama handler menunggu push.")
    pg.henti()
    hentikan(PORT, PORT_PUSH)

    bagian("F. Versi benar (ADR 22 dan 23): push di luar transaction, timeout 3 detik, pemberitahuan lewat outbox")
    sesi, warung = pasang([], tampil="$ ./api-t3 -lab   # pool 10, push timeout 3 detik, idle-tx 5 detik; pembayaran menulis outbox, tanpa panggilan jaringan")
    catat("$ curl -X POST '/lab/mode' -d '{\"mode\": \"gantung\"}'   # layanan push tiruan: menerima permintaan, tidak pernah menjawab")
    d.mulai_worker("worker", ["-selang", "100ms", "-maks-percobaan", "20"])
    catat("$ ./api-t3 -peran worker -maks-percobaan 20 &   # mengirim isi outbox; push timeout 3 detik")
    catat("# Batas percobaan dinaikkan dari 5 (ADR 25) ke 20 hanya di rekaman ini: dengan batas bawaan, baris tertua bisa masuk dead-letter sebelum detik ke-30 "
          "karena jitter backoff acak, dan hitungan baris di bawah tidak sama di setiap run.")
    for k in KOMENTAR_BEBAN:
        catat(k)
    t0 = time.monotonic()
    pg = b.Pengamat(d.PEMILIK, t0)
    be = b.Beban(PORT, sesi, warung)
    pg.mulai()
    be.mulai(t0)
    be.tidur_sampai(30.4)
    be.henti()
    nb, nr = len(be.nomor(1, 520, "bayar")), len(be.nomor(1, 520, "baca"))
    rb, rr = be.rekap(1, 520, "bayar"), be.rekap(1, 520, "baca")
    harap(rb, {201: nb}, "pembayaran dengan push di luar transaction")
    harap(rr, {200: nr}, "pembacaan dengan push di luar transaction")
    w_bayar, w_baca = statistics.mean(be.durasi("bayar", 1, 520)), statistics.mean(be.durasi("baca", 1, 520))
    print(f"  (konsol) W bayar {w_bayar * 1000:.1f} ms, W baca {w_baca * 1000:.1f} ms, puncak tx {pg.puncak(2)}, puncak idle {pg.puncak(1)}")
    catat(f"pembayaran request 1 sampai 520: {nb} pembayaran: {ringkas(rb)}")
    catat(f"pembacaan request 1 sampai 520: {nr} pembacaan: {ringkas(rr)}")
    catat("W rata-rata satu pembayaran dan satu pembacaan kurang dari 50 ms (batas lab; Asumsi naskah 20 ms): "
          + ya(w_bayar < BATAS_W and w_baca < BATAS_W, f"W bayar {w_bayar:.4f} W baca {w_baca:.4f}"))
    l_semua = RPS * statistics.mean(be.durasi("bayar", 1, 520) + be.durasi("baca", 1, 520))
    catat("L semua request = 17,4 × W rata-rata dari data kurang dari 0,87 koneksi (batas lab 17,4 × 50 ms; hitungan naskah R3-32 dengan 20 ms: 0,35): "
          + ya(l_semua < RPS * BATAS_W, f"L semua request {l_semua:.3f}"))
    print(f"  (konsol) L semua request {l_semua:.3f}")
    harap(pg.puncak(2) <= 1, True, "transaction terbuka paling banyak 1")
    catat("transaction terbuka paling banyak 1 pada satu waktu (satu pembayaran setiap 1,149 detik, tiap transaction hanya milidetik): ya")
    harap(menggantung() > 0, True, "worker mencoba push yang menggantung")
    catat("layanan push sedang menahan permintaan dari worker: ya; pembayaran tetap selesai dalam milidetik")
    sql("SELECT status, count(*) AS baris FROM outbox GROUP BY status")
    harap(satu("SELECT count(*) FROM outbox WHERE status = 'menunggu'"), 26, "26 baris outbox menunggu")
    catat("# Pemberitahuan tidak hilang: 26 baris menunggu untuk dicoba lagi (backoff). Layanan push pulih:")
    d.stop("worker", sinyal="kill")
    d.stop(PORT_PUSH, sinyal="kill")
    d.mulai_push()
    sql("UPDATE outbox SET coba_lagi = now(), klaim_sampai = NULL WHERE status = 'menunggu'")
    d.worker(["-serentak", "4", "-maks-percobaan", "20"])
    harap(d.push_diterima()["jumlah"], 26, "26 pesan diterima push tiruan")
    p2 = d.push_diterima()
    harap((p2["notifikasi_berbeda"], p2["notifikasi_ganda"]), (26, 0), "tanpa notifikasi ganda")
    catat(f"push tiruan menerima: {p2['jumlah']} pesan, {p2['notifikasi_berbeda']} notifikasi berbeda, {p2['notifikasi_ganda']} ganda")
    pg.henti()
    hentikan(PORT, PORT_PUSH)
    tulis("adr22.txt", "ADR 22: timeout di dalam transaction, idle-tx saja, dan push di luar transaction", lab="t3-pool", keputusan="958")
