"""Lab b4-skema versi ledger: M13, migrasi ke ledger di jam makan siang (keputusan 530-536).

Naskah Tahap 2 M13: migrasi ke ledger di jam makan siang membuat semua pembayaran menunggu 40 detik, lalu app versi
lama gagal membaca riwayat. Lab ini merekam dua jalan di PostgreSQL 17 bersama, schema b4_ledger dibuat ulang:

  satu-langkah.txt  yang terjadi: migration api-t2 000009-000013 dijalankan sebagai SATU transaction tanpa
                    lock_timeout, saat laporan Keuangan masih terbuka dan server v1 melayani bayar.
  lock-timeout.txt  rilis 1 (expand) dengan lock_timeout 3 detik saat laporan yang sama terbuka: gagal cepat, bayar
                    lanjut, skema tidak berubah, percobaan ulang berhasil; ADD COLUMN dengan default tetap tanpa rewrite.
  tiga-rilis.txt    lanjutan lock-timeout.txt: migrate (backfill per 1.000 akun, bayar tetap jalan) lalu contract,
                    dengan app 1.0 dan 1.1 (app/riwayat_v1.dart) bayar dan membaca riwayat di setiap langkah.

Tabel dan langkah sama dengan labs/api-t2 (keputusan 409-412): file migration api-t2 dibaca apa adanya, query riwayat
diambil dari kode Go api-t1 dan api-t2. Rekaman tanpa waktu: lama tunggu ditulis sebagai urutan kejadian dan batas
dari parameter lab; detiknya hanya dicetak ke layar. Lab gagal keras bila urutan, status, atau saldo berbeda.

    make -C labs/b4-skema run-ledger   (rekam; butuh PostgreSQL bersama labs/b3-race dan Dart)
    make -C labs/b4-skema cek-ledger   (rekam ulang, lalu bandingkan dengan yang di-commit)
"""
import time
from alat_ledger import Klien, Lab, app_lama, galat, gagal, harap, rp, sambung, tabel
from bertahap import bertahap
from server_ledger import (ANI, CITRA, OUT, SCHEMA, SEMUA, TABEL_AKHIR, TAHAN, antre, bayar, berkas, buat_schema,
                           buka_laporan, json_pendek, kepala, kode_bayar, riwayat)

# ---------- A. satu langkah: yang terjadi di M13 ----------

def satu_langkah():
    buat_schema()
    lab = Lab()
    try:
        kepala(lab, "M13 · migrasi ke ledger dalam satu langkah, jam makan siang (keputusan 532)", [
            "Isi labs/api-t2/migrasi/000009 sampai 000013 dijalankan sebagai SATU transaction tanpa SET LOCAL",
            "lock_timeout, saat laporan Keuangan (R) masih terbuka dan server v1 masih melayani bayar.",
            f"R ditahan terbuka {TAHAN} detik sesudah bayar masuk antrean (parameter lab; naskah: 40 detik)."])
        kode_bayar(lab, "v1")
        lab.tulis()
        R, M, P1, P2 = (Klien(n, lab) for n in ("R", "M", "P1", "P2"))
        buka_laporan(lab, R)
        satu = "\n".join(berkas(f, tanpa_lock_timeout=True) for f in SEMUA)

        def migrasi(k):
            k.sql("BEGIN")
            k.sql(satu)
            k.sql("COMMIT")
            return "; ".join(k.notice)
        M.mulai(migrasi)
        antre(lab, M, "BEGIN; isi 000009 ... 000013 (tanpa lock_timeout); COMMIT", "R")
        P1.mulai(bayar("v1", CITRA, ANI, 25000))
        antre(lab, P1, f"bayar Citra ({CITRA}) ke Warung Ani ({ANI}) {rp(25000)} di server v1", "M")
        t_antre = time.monotonic()
        P2.mulai(lambda k: k.sql("SELECT saldo FROM akun WHERE id = 420")[0][0])
        antre(lab, P2, "app Karyawan 420 membuka saldo: SELECT saldo FROM akun WHERE id = 420", "M")

        lab.tulis()
        lab.tulis(f"# {TAHAN} detik kemudian laporan masih terbuka dan tiga request masih antre (pg_locks, pg_blocking_pids):")
        time.sleep(TAHAN)
        isi = []
        for k in (M, P1, P2):
            mode, objek, blok = lab.menunggu(k) or gagal(f"{k.nama} tidak menunggu lagi sebelum R COMMIT")
            isi.append((k.nama, f"{mode} pada {objek}", blok))
        harap(lab.keadaan(R), "idle in transaction", "keadaan R")
        lab.baris += tabel(["sesi", "menunggu", "di belakang"], [("R", "-", "-")] + isi)
        lab.tulis()

        R.sql("COMMIT")
        lab.langkah("R", "COMMIT", "laporan selesai; lock R dilepas")
        hm = M.selesai(60)
        if "err" in hm:
            gagal(f"migrasi satu langkah gagal: {hm['err']}")
        lab.langkah("M", "(lanjut sesudah R COMMIT) ... COMMIT", f"COMMIT · NOTICE {hm['ok']}")
        h1, h2 = P1.selesai(), P2.selesai()
        for k, h in ((P1, h1), (P2, h2)):
            harap(getattr(h.get("err"), "sqlstate", None), "42703", f"galat {k.nama} sesudah migrasi")
        lab.langkah("P1", "(lanjut sesudah M COMMIT)", f"{galat(h1['err'])} -> server v1 menjawab 500")
        lab.langkah("P2", "(lanjut sesudah M COMMIT)", f"{galat(h2['err'])} -> server v1 menjawab 500")
        if h1["detik"] < TAHAN:
            gagal(f"P1 menunggu {h1['detik']:.1f} detik, harus >= {TAHAN}")
        print(f"satu langkah: P1 menunggu {h1['detik']:.1f} detik, P2 {h2['detik']:.1f} detik "
              f"(R ditahan {TAHAN} detik sesudah P1 antre; {time.monotonic() - t_antre:.1f} detik sejak itu)")
        lab.tulis()
        lab.tulis(f"# Lama tunggu P1 dan P2 = sisa laporan R + lama migrasi M. Di lab paling sedikit {TAHAN} detik")
        lab.tulis("# (R ditahan selama itu sesudah keduanya antre); naskah: 40 detik. Keduanya tetap gagal: kolom saldo")
        lab.tulis("# sudah dihapus contract di transaction yang sama, padahal server yang melayani mereka masih v1.")
        lab.tulis("# Dokumentasi PostgreSQL 17: ALTER TABLE mengambil ACCESS EXCLUSIVE kecuali disebut lain (ALTER TABLE,")
        lab.tulis("# Description); ACCESS EXCLUSIVE bentrok dengan semua mode, termasuk ACCESS SHARE milik SELECT (13.3")
        lab.tulis("# Explicit Locking); request yang bentrok dengan request yang antre lebih dulu ikut menunggu (soft block,")
        lab.tulis("# pg_blocking_pids di 9.27; kode lock.c: conflictTab[lockmode] & lock->waitMask).")
        lab.tulis()

        lab.tulis("# Server v2 (satu langkah) di-deploy. App 1.0 dan 1.1 membuka riwayat; response dibuat untuk app baru.")
        body = riwayat(R, "satu", 420)
        lab.tulis("$ curl '/akun/420/riwayat'   (Karyawan 420)")
        lab.tulis(json_pendek(body))
        for versi, akun in (("1.0", 420), ("1.1", 421)):
            ok, teks = app_lama(versi, riwayat(R, "satu", akun))
            harap(ok, False, f"app {versi} membaca riwayat satu langkah")
            lab.tulis(f"app {versi} (Karyawan {akun}): {teks}")
        tabel_akhir = [r[0] for r in R.sql("SELECT table_name FROM information_schema.tables "
                                           "WHERE table_schema = %s ORDER BY 1", (SCHEMA,))]
        harap(tabel_akhir, TABEL_AKHIR, "tabel sesudah migrasi satu langkah")
        lab.tulis()
        lab.tulis(f"# Skema akhir sama dengan api-t2 ({len(tabel_akhir)} tabel): {', '.join(tabel_akhir)}")
        lab.simpan(OUT / "satu-langkah.txt")
    finally:
        lab.tutup()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    satu_langkah()
    bertahap()
    with sambung() as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
    print("selesai: " + ", ".join(sorted(p.name for p in OUT.iterdir())))
