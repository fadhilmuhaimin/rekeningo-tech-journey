"""Bagian `lepas` lab t5-partisi: lepas.txt dan pasang.txt (DETACH, DROP, arsip, ATTACH, aturan ledger)."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from alat import *  # noqa: E402,F401,F403

ALASAN = "Koreksi atas pembayaran ganda"
ARSIP_NAMA = "posting_lalu_05"


def rekam_lepas():
    S = LEPAS
    x.siapkan_riwayat(S, BULAN_LEPAS, BAYAR_LEPAS, BAYAR_INI_LEPAS)
    total_awal = satu("SELECT count(*) FROM posting", S)
    partisi_awal = partisi(S)
    harap(len(partisi_awal), BULAN_LEPAS + 3, "jumlah partisi awal")
    bagian("A. Keadaan awal: lima bulan lalu dan bulan berjalan di partisi bulanan, snapshot sampai bulan lalu")
    catat("# Riwayat dimuat seperti di bagian skala dengan 28.000 posting per bulan. Snapshot ditulis dulu: partisi hanya boleh dilepas")
    catat("# bila saldo yang dikandungnya sudah ada di snapshot.")
    jalan("SELECT tableoid::regclass AS partisi, count(*) AS posting FROM posting GROUP BY 1 ORDER BY 1", S)
    harap(satu("SELECT count(DISTINCT tableoid) FROM posting", S), BULAN_LEPAS + 1, "partisi berisi")
    n = buat_snapshot_semua(S, BULAN_LEPAS)
    harap(len(set(n)), 1, "tiap bulan menulis jumlah buku yang sama")
    harap(cocokkan_snapshot(S, BULAN_LEPAS), 0, "snapshot lepas")
    catat("# Snapshot dibandingkan dengan hitungan langsung atas tabel posting: 0 baris berbeda.")

    bagian("B. Ledger menolak DELETE, tetapi DETACH dan DROP hanya dijaga hak pemilik tabel")
    tolak(f"DELETE FROM {ARSIP_NAMA} WHERE jumlah > 0", "23001", S, constraint=f"{ARSIP_NAMA}_tidak_diubah")
    tolak(f"ALTER TABLE posting DETACH PARTITION {ARSIP_NAMA} CONCURRENTLY", "42501", S, role="api_t5", pesan="must be owner of table posting")
    tolak(f"DROP TABLE {ARSIP_NAMA}", "42501", S, role="api_t5", pesan=f"must be owner of table {ARSIP_NAMA}")
    catat("# Trigger append-only tidak menyala untuk DROP atau DETACH: yang menahannya di sini hak. Role aplikasi bukan pemilik, jadi ditolak.")

    bagian("C. DETACH PARTITION ... CONCURRENTLY: tidak di dalam blok transaction, dan tidak bila ada partisi DEFAULT")
    catat("# Di dalam blok transaction (klien membuka BEGIN sebelum perintah ini):")
    tolak(f"ALTER TABLE posting DETACH PARTITION {ARSIP_NAMA} CONCURRENTLY", "25001", S, autocommit=False,
          pesan="DETACH CONCURRENTLY cannot run inside a transaction block")
    jalan("CREATE TABLE posting_default PARTITION OF posting DEFAULT", S)
    tolak(f"ALTER TABLE posting DETACH PARTITION {ARSIP_NAMA} CONCURRENTLY", "55000", S,
          pesan="cannot detach partitions concurrently when a default partition exists")
    jalan("DROP TABLE posting_default", S)
    catat("# Tanpa partisi DEFAULT dan di luar blok transaction, perintah yang sama berhasil:")
    jalan(f"ALTER TABLE posting DETACH PARTITION {ARSIP_NAMA} CONCURRENTLY", S)
    harap(len(partisi(S)), len(partisi_awal) - 1, "partisi sesudah DETACH")
    catat(f"# Posting yang terlihat lewat tabel induk: {satu('SELECT count(*) FROM posting', S):,} dari {total_awal:,}; sisanya ada di tabel {ARSIP_NAMA} yang berdiri sendiri.".replace(",", "."))
    jalan(f"SELECT conname, pg_get_constraintdef(oid) AS definisi FROM pg_constraint WHERE conrelid = '{ARSIP_NAMA}'::regclass AND contype = 'c' ORDER BY conname", S)
    harap(satu(f"SELECT count(*) FROM pg_constraint WHERE conrelid = '{ARSIP_NAMA}'::regclass AND conname = '{ARSIP_NAMA}_dibuat_check'", S), 1,
          "CHECK batas partisi ditambahkan DETACH CONCURRENTLY")
    catat("# DETACH CONCURRENTLY menambah CHECK yang setara batas partisi pada tabel yang dilepas (posting_lalu_05_dibuat_check).")
    r1 = jalan(f"SELECT tgname AS trigger FROM pg_trigger WHERE tgrelid = '{ARSIP_NAMA}'::regclass AND NOT tgisinternal ORDER BY 1", S)
    r2 = jalan("SELECT tgname AS trigger FROM pg_trigger WHERE tgrelid = 'posting_lalu_04'::regclass AND NOT tgisinternal ORDER BY 1", S)
    harap([r[0] for r in r1], ["posting_tidak_dikosongkan"], "trigger tabel yang dilepas")
    harap([r[0] for r in r2], ["jurnal_seimbang", "posting_tidak_dikosongkan", "posting_tidak_diubah", "saldo_karyawan_tidak_negatif"], "trigger partisi terpasang")
    catat("# Tabel yang dilepas kehilangan tiga trigger ledger baris demi baris (jurnal_seimbang, posting_tidak_diubah, saldo_karyawan_tidak_negatif)")
    catat("# yang tadinya ikut dari tabel induk. Hanya penjaga TRUNCATE, yang dipasang di partisinya sendiri, yang tertinggal.")
    dalam_transaksi([f"UPDATE {ARSIP_NAMA} SET jumlah = jumlah WHERE id = (SELECT min(id) FROM {ARSIP_NAMA})"], S)
    catat("# UPDATE atas tabel yang sudah dilepas berhasil untuk pemiliknya: sesudah DETACH, aturan append-only bergantung pada hak akses tabel itu.")

    bagian("D. Membuang satu bulan: DETACH dan DROP lawan DELETE, dengan jumlah baris sama (tabel uji tanpa trigger ledger)")
    catat("# DELETE atas posting ditolak ledger (bagian B), jadi pembandingnya adalah dua tabel uji dengan kolom dan index yang sama dengan posting,")
    catat("# masing-masing 200.000 baris di bulan yang dibuang dan 200.000 baris di bulan lain. Waktunya hanya diperiksa terhadap batas.")
    awal_a, awal_b, awal_c = batas(4, S), batas(3, S), batas(2, S)
    jalan("CREATE TABLE uji_biasa (LIKE posting INCLUDING DEFAULTS INCLUDING INDEXES)", S, tulis_hasil=True)
    jalan("CREATE TABLE uji_part (LIKE posting INCLUDING DEFAULTS INCLUDING INDEXES) PARTITION BY RANGE (dibuat)", S, tulis_hasil=True)
    jalan(f"CREATE TABLE uji_part_a PARTITION OF uji_part FOR VALUES FROM ('{awal_a}') TO ('{awal_b}')", S)
    jalan(f"CREATE TABLE uji_part_b PARTITION OF uji_part FOR VALUES FROM ('{awal_b}') TO ('{awal_c}')", S)
    with konek(S) as c:
        for tabel in ("uji_biasa", "uji_part"):
            for mulai in (awal_a, awal_b):
                c.execute(f"""INSERT INTO {tabel} (jurnal_id, buku_id, jumlah, dibuat)
                              SELECT g, 1 + g % 1000, 1000, '{mulai}'::timestamptz + (g % 86400) * interval '1 second' FROM generate_series(1, 200000) g""")
        c.execute("VACUUM (ANALYZE) uji_biasa")
        c.execute("VACUUM (ANALYZE) uji_part")
    jalan("SELECT (SELECT count(*) FROM uji_biasa) AS uji_biasa, (SELECT count(*) FROM uji_part) AS uji_part, (SELECT count(*) FROM uji_part_a) AS bulan_dibuang", S)
    with konek(S) as c:
        t0 = time.perf_counter()
        baris_delete = c.execute(f"DELETE FROM uji_biasa WHERE dibuat >= '{awal_a}' AND dibuat < '{awal_b}'").rowcount
        t_delete = time.perf_counter() - t0
        t0 = time.perf_counter()
        c.execute("ALTER TABLE uji_part DETACH PARTITION uji_part_a CONCURRENTLY")
        c.execute("DROP TABLE uji_part_a")
        t_detach = time.perf_counter() - t0
    harap(baris_delete, 200_000, "baris yang dihapus DELETE")
    tampil("=> DELETE FROM uji_biasa WHERE <bulan yang dibuang>")
    tampil(f"DELETE {baris_delete}")
    tampil("=> ALTER TABLE uji_part DETACH PARTITION uji_part_a CONCURRENTLY; DROP TABLE uji_part_a")
    tampil("DROP TABLE   -- 200000 baris di partisi yang dibuang")
    harap(t_delete > 2 * t_detach, True, f"DELETE ({t_delete:.3f} s) harus lebih dari dua kali DETACH + DROP ({t_detach:.3f} s)")
    catat("# DELETE dan DETACH + DROP membuang 200.000 baris yang sama. Batas yang diperiksa: DELETE memerlukan lebih dari dua kali waktu DETACH + DROP. Nilai waktunya tidak direkam.")
    jalan("SELECT (SELECT count(*) FROM uji_biasa) AS uji_biasa, (SELECT count(*) FROM uji_part) AS uji_part", S)
    jalan("DROP TABLE uji_biasa, uji_part", S, tulis_hasil=False)

    bagian("E. Arsip: tabel yang dilepas diekspor ke file, dipulihkan ke tabel baru, dan dibandingkan")
    catat("# File arsip belum dienkripsi: enkripsi dan baris arsip_partisi adalah pekerjaan lab t5-kms, yang membaca file ini.")
    shutil.rmtree(ARSIP, ignore_errors=True)
    ARSIP.mkdir(parents=True)
    berkas = ARSIP / f"{ARSIP_NAMA}.csv"
    baris_arsip = satu(f"SELECT count(*) FROM {ARSIP_NAMA}", S)
    sha = ekspor(S, f"SELECT * FROM {ARSIP_NAMA} ORDER BY id, dibuat", berkas)
    jalan(f"CREATE TABLE posting_pulih (LIKE posting INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)", S)
    with konek(S) as c, open(berkas, "rb") as f, c.cursor().copy("COPY posting_pulih FROM STDIN (FORMAT csv)") as cp:
        while blok := f.read(1 << 20):
            cp.write(blok)
    harap(satu("SELECT count(*) FROM posting_pulih", S), baris_arsip, "baris tabel pulih")
    harap(satu(f"SELECT count(*) FROM (SELECT * FROM {ARSIP_NAMA} EXCEPT ALL SELECT * FROM posting_pulih) x", S), 0, "baris yang hilang di tabel pulih")
    harap(satu(f"SELECT count(*) FROM (SELECT * FROM posting_pulih EXCEPT ALL SELECT * FROM {ARSIP_NAMA}) x", S), 0, "baris tambahan di tabel pulih")
    sha_pulih = ekspor(S, "SELECT * FROM posting_pulih ORDER BY id, dibuat", ARSIP / "pulih.csv")
    harap(sha_pulih, sha, "checksum ekspor tabel pulih")
    catat(f"# File arsip: {baris_arsip:,} baris; tabel pulih memuat baris yang sama (EXCEPT ALL kedua arah: 0 baris), dan ekspor ulang tabel pulih punya SHA-256 yang sama dengan file.".replace(",", "."))
    catat("# File ada di $TMP/t5-partisi-arsip-<port>/posting_lalu_05.csv; isinya tidak direkam.")

    bagian("F. Pemeriksaan malam sesudah satu bulan dilepas: tanpa snapshot menuduh, dengan snapshot cocok")
    hilang = satu(f"SELECT count(*) FROM (SELECT buku_id FROM {ARSIP_NAMA} GROUP BY buku_id HAVING sum(jumlah) <> 0) x", S)
    rc, out = job(S, "-cek-cache")
    baris = out.splitlines()
    catat("$ ./api-t5 -cek-cache")
    catat("\n".join(baris[:2] + ["..."] + baris[-1:]))
    catat(f"# exit status {rc}")
    m = re.search(r"cek cache: (\d+) buku diperiksa, (\d+) tidak cocok", baris[-1])
    harap((rc, int(m.group(2))), (1, hilang), "pemeriksaan penuh sesudah DETACH menandai buku yang saldonya ada di partisi yang dilepas")
    catat(f"# {hilang:,} buku ditandai: persis buku yang jumlah posting-nya di partisi yang dilepas bukan 0 (dihitung dari tabel {ARSIP_NAMA}).".replace(",", "."))
    rc, out = job(S, "-cek-cache", "-dari-snapshot")
    catat("$ ./api-t5 -cek-cache -dari-snapshot")
    catat(d.samarkan(out))
    catat(f"# exit status {rc}")
    harap(rc, 0, f"pemeriksaan dari snapshot sesudah DETACH: {out}")

    bagian("G. Jurnal pembalik atas jurnal yang postingnya sudah dilepas")
    d.mulai_api(db=d.db_app(S))
    token = d.login("admin.tunjangan@lestari.example", label="Admin")
    j_arsip = satu(f"SELECT min(jurnal_id) FROM {ARSIP_NAMA} WHERE buku_id IN (SELECT id FROM buku WHERE jenis = 'warung')", S)
    j_biasa = satu("SELECT min(jurnal_id) FROM posting_lalu_01 WHERE buku_id IN (SELECT id FROM buku WHERE jenis = 'warung')", S)
    harap(satu("SELECT count(*) FROM jurnal WHERE id = %s", S, arg=(j_arsip,)), 1, "jurnal asal masih ada di tabel jurnal")
    harap(satu("SELECT count(*) FROM posting WHERE jurnal_id = %s", S, arg=(j_arsip,)), 0, "posting jurnal arsip terlihat lewat tabel induk")
    for label, jid in (("jurnal bulan yang masih terpasang", j_biasa), ("jurnal bulan yang sudah dilepas", j_arsip)):
        status, isi = d.curl("POST", f"/jurnal/{jid}/pembalik", {"alasan": ALASAN}, token=token, tampil=False)
        isi_tampil = re.sub(r'"(id|membalik)":\s*\d+', r'"\1":<id>', isi.strip())
        catat(f"# {label}:")
        catat(f"$ curl -i -X POST '/jurnal/<jurnal>/pembalik' -H 'Authorization: Bearer <token sesi Admin>' -d '{json.dumps({'alasan': ALASAN})}'")
        catat(f"HTTP {status}")
        catat(isi_tampil)
        pembalik = satu("SELECT count(*) FROM jurnal WHERE membalik_jurnal_id = %s", S, arg=(jid,))
        if jid == j_biasa:
            harap((status, pembalik), (201, 1), "pembalik atas jurnal bulan yang terpasang")
        else:
            harap((status != 201, pembalik), (True, 0), "pembalik atas jurnal yang postingnya sudah dilepas ditolak, tanpa jurnal tertinggal")
    galat = [l for l in d.log_server() if "tidak seimbang" in l]
    harap(len(galat) >= 1 and "0 posting, jumlah 0" in galat[-1], True, f"log server untuk pembalik yang ditolak: {galat}")
    catat("# Log server untuk permintaan kedua:")
    catat(re.sub(r"\bjurnal \d+", "jurnal <n>", galat[-1]))
    catat("# Jurnal yang postingnya sudah dilepas tidak bisa dibalik dari database utama: jurnal pembalik tanpa posting ditolak saat COMMIT")
    catat("# oleh aturan jurnal seimbang, dan tidak ada jurnal pembalik yang tertinggal (0 baris).")
    d.stop(d.PORT)
    terlihat_sesudah_g = satu("SELECT count(*) FROM posting", S)   # jurnal pembalik kontrol menambah dua posting di bulan berjalan
    x.tulis("lepas.txt", "DETACH, membuang satu bulan, arsip, dan akibatnya pada pemeriksaan dan jurnal pembalik", S)

    # ---- pasang.txt ----
    bagian("A. ATTACH PARTITION memindai tabel kecuali ada CHECK valid yang setara batas partisi")
    catat("# Tabel pulih dibuat dari arsip dengan kolom, CHECK bawaan (jumlah <> 0), dan index yang sama dengan posting, tetapi tanpa CHECK batas partisi.")
    dari, ke = batas(5, S), batas(4, S)
    catat("# Percobaan 1: tabel pulih tanpa CHECK batas partisi.")
    pesan = jalan_pesan(f"ALTER TABLE posting ATTACH PARTITION posting_pulih FOR VALUES FROM ('{dari}') TO ('{ke}')", S)
    harap(pesan[0], 'verifying table "posting_pulih"', "ATTACH tanpa CHECK memindai tabel")
    catat("# PostgreSQL memindai tabel ('verifying table') dan memvalidasi foreign key ke jurnal dan buku ('validating foreign key constraint').")
    harap(satu("SELECT count(*) FROM posting", S), terlihat_sesudah_g + baris_arsip, "posting terlihat sesudah ATTACH")
    bagian("B. Aturan ledger sesudah ATTACH: trigger baris ikut terpasang, penjaga TRUNCATE tidak")
    jalan("SELECT tgname AS trigger FROM pg_trigger WHERE tgrelid = 'posting_pulih'::regclass AND NOT tgisinternal ORDER BY 1", S)
    catat("# Tiga trigger baris dikloning dari tabel induk saat ATTACH. Penjaga TRUNCATE (posting_tidak_dikosongkan) dipasang per partisi oleh buat_partisi_posting")
    catat("# dan tidak ikut: tabel pulih tidak memilikinya.")
    harap(satu("SELECT count(*) FROM pg_trigger WHERE tgrelid = 'posting_pulih'::regclass AND tgname = 'posting_tidak_dikosongkan'", S), 0, "tabel pulih tanpa penjaga TRUNCATE")
    catat("# TRUNCATE partisi itu berhasil untuk pemiliknya (dibatalkan dengan ROLLBACK):")
    dalam_transaksi(["TRUNCATE posting_pulih", "SELECT count(*) AS posting_pulih FROM posting_pulih"], S)
    jalan("CREATE TRIGGER posting_tidak_dikosongkan BEFORE TRUNCATE ON posting_pulih FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah()", S)
    tolak("TRUNCATE posting_pulih", "23001", S, constraint="posting_pulih_tidak_diubah")
    catat("# Sesudah penjaga dipasang, TRUNCATE ditolak. Tiga invarian ledger atas partisi hasil ATTACH, sebagai pemilik schema:")
    tolak("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'tidak seimbang', 400);\n"
          f"INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES (currval('jurnal_id_seq'), (SELECT min(id) FROM buku WHERE jenis = 'karyawan'), 1000, '{dari}'::timestamptz + interval '1 day')",
          "23514", S, constraint="jurnal_seimbang")
    tolak("UPDATE posting_pulih SET jumlah = jumlah + 1", "23001", S, constraint="posting_pulih_tidak_diubah")
    tolak("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('bayar', 'saldo minus', 400);\n"
          "INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES"
          f" (currval('jurnal_id_seq'), (SELECT min(id) FROM buku WHERE jenis = 'karyawan'), -900000000, '{dari}'::timestamptz + interval '1 day'),"
          f" (currval('jurnal_id_seq'), (SELECT min(id) FROM buku WHERE jenis = 'warung'), 900000000, '{dari}'::timestamptz + interval '1 day')",
          "23514", S, constraint="saldo_karyawan_tidak_negatif")
    catat("# Mutan: trigger posting_tidak_diubah dimatikan di partisi itu, dan UPDATE yang tadi ditolak berhasil (dibatalkan dengan ROLLBACK). Aturannya hidup dari trigger itu.")
    dalam_transaksi(["ALTER TABLE posting_pulih DISABLE TRIGGER posting_tidak_diubah", "UPDATE posting_pulih SET jumlah = jumlah"], S)
    tolak("UPDATE posting_pulih SET jumlah = jumlah + 1", "23001", S, constraint="posting_pulih_tidak_diubah")

    bagian("C. Dengan CHECK yang setara batas partisi, tabel tidak dipindai")
    jalan("ALTER TABLE posting DETACH PARTITION posting_pulih", S)
    jalan("DROP TABLE posting_pulih", S, tulis_hasil=False)
    catat("# Percobaan 2: tabel pulih kedua dipulihkan dari file yang sama, lalu diberi CHECK dengan batas literal yang sama dengan FOR VALUES.")
    jalan("CREATE TABLE posting_pulih2 (LIKE posting INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)", S, tulis_hasil=False)
    with konek(S) as c, open(berkas, "rb") as f, c.cursor().copy("COPY posting_pulih2 FROM STDIN (FORMAT csv)") as cp:
        while blok := f.read(1 << 20):
            cp.write(blok)
    jalan(f"ALTER TABLE posting_pulih2 ADD CONSTRAINT posting_pulih2_batas CHECK (dibuat >= '{dari}' AND dibuat < '{ke}')", S)
    pesan = jalan_pesan(f"ALTER TABLE posting ATTACH PARTITION posting_pulih2 FOR VALUES FROM ('{dari}') TO ('{ke}')", S)
    harap(('partition constraint for table "posting_pulih2" is implied by existing constraints' in pesan, 'verifying table "posting_pulih2"' in pesan),
          (True, False), "ATTACH dengan CHECK tidak memindai tabel")
    catat("# Batas partisi tidak dipindai lagi (partition constraint ... is implied by existing constraints). Foreign key tetap divalidasi karena tabel pulih tidak memilikinya.")
    jalan("ALTER TABLE posting DETACH PARTITION posting_pulih2", S, tulis_hasil=False)
    jalan("DROP TABLE posting_pulih2", S, tulis_hasil=False)
    catat("# Percobaan 3: tabel asal yang dilepas DETACH CONCURRENTLY, yang membawa CHECK dan foreign key-nya sendiri, dipasang kembali.")
    pesan = jalan_pesan(f"ALTER TABLE posting ATTACH PARTITION {ARSIP_NAMA} FOR VALUES FROM ('{dari}') TO ('{ke}')", S)
    harap(pesan, [f'partition constraint for table "{ARSIP_NAMA}" is implied by existing constraints'], "ATTACH tabel asal")
    harap(sorted(partisi(S)), sorted(partisi_awal), "partisi sesudah dipasang kembali")
    harap(satu("SELECT count(*) FROM posting", S), terlihat_sesudah_g + baris_arsip, "posting sesudah dipasang kembali")
    catat("# Tidak ada pemindaian dan tidak ada validasi foreign key. Partisi dan jumlah posting kembali seperti di awal.")
    rc, out = job(S, "-cek-cache")
    harap(rc, 0, f"pemeriksaan penuh sesudah dipasang kembali: {out}")
    catat("$ ./api-t5 -cek-cache")
    catat(out)
    catat(f"# exit status {rc}")

    bagian("D. Partisi bulan depan belum ada saat bulan mulai: INSERT gagal")
    catat("# Jam diperankan dengan kolom dibuat yang eksplisit di bulan ke-3 sesudah bulan berjalan: tabel punya partisi sampai bulan ke-2.")
    bulan_x = f"(({awal_bulan(-3)}) + interval '1 day')"
    tolak(f"INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES ((SELECT min(id) FROM jurnal), (SELECT min(id) FROM buku), 1000, {bulan_x})",
          "23514", S, pesan='no partition of relation "posting" found for row')
    catat("# Job bulanan memanggil buat_partisi_posting sebelum bulannya mulai; sesudah itu baris yang sama masuk (dibatalkan dengan ROLLBACK):")
    dalam_transaksi([f"SELECT buat_partisi_posting('posting_bulan_03', '{tgl(-3, S)}'::date)",
                     f"INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES ((SELECT min(id) FROM jurnal), (SELECT min(id) FROM buku), 1000, {bulan_x})"], S)
    x.tulis("pasang.txt", "ATTACH, aturan ledger sesudah dipasang, dan partisi bulan depan", S)


def ekspor(schema, q, berkas):
    """COPY ... TO STDOUT (csv) ke file; mengembalikan SHA-256 isinya."""
    h = hashlib.sha256()
    with konek(schema) as c, open(berkas, "wb") as f, c.cursor().copy(f"COPY ({q}) TO STDOUT (FORMAT csv)") as cp:
        for blok in cp:
            b = bytes(blok)
            h.update(b)
            f.write(b)
    return h.hexdigest()
