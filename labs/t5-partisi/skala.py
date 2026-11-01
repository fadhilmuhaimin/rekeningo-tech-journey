"""Bagian `skala` lab t5-partisi: pruning.txt dan snapshot.txt (12 bulan × 150.000 posting)."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from alat import *  # noqa: E402,F401,F403

def rekam_skala():
    S = SKALA
    x.siapkan_riwayat(S, BULAN_SKALA, BAYAR_SKALA, BAYAR_INI_SKALA)
    nama_partisi = partisi(S)
    # ---- pruning.txt ----
    bagian("A. Data awal: 11 bulan lalu dan bulan berjalan, 150.000 posting per bulan, di partisi bulanan")
    catat("# Schema bersih api-t5 (30 tabel), data awal (10.000 karyawan, 60 warung), lalu `posting_sebelum` (kosong) diganti 11 partisi")
    catat("# bulanan lewat buat_partisi_posting, dan riwayat dimuat dengan session_replication_role = replica (pemuatan massal tanpa trigger).")
    catat("# Jumlah dan pasangan buku dihitung dari nomor urut, tanpa angka acak. Invarian diperiksa lewat query sesudah pemuatan.")
    rows = jalan("SELECT tableoid::regclass AS partisi, count(*) AS posting FROM posting GROUP BY 1 ORDER BY 1", S)
    jumlah = {r[0]: r[1] for r in rows}
    harap(sorted(set(jumlah.values())), [POSTING_BULAN], "posting per partisi berisi")
    harap(len(jumlah), BULAN_SKALA + 1, "partisi berisi")
    harap(len(nama_partisi), BULAN_SKALA + 3, "jumlah partisi (11 bulan lalu, bulan berjalan, dua bulan depan)")
    catat(f"# {len(nama_partisi)} partisi di katalog: {len(jumlah)} berisi 150.000 posting masing-masing, dan dua (bulan depan dan sesudahnya) kosong.")
    total = satu("SELECT count(*) FROM posting", S)
    harap(total, 12 * POSTING_BULAN, "jumlah posting")
    tidak_seimbang, jurnal_kosong, negatif = x.periksa_invarian_muatan(S)
    catat(f"# Invarian atas data yang dimuat, dihitung langsung dari tabel: jurnal tidak seimbang {tidak_seimbang}, jurnal tanpa posting {jurnal_kosong}, karyawan bersaldo negatif {negatif}.")

    bagian("B. Pruning: query satu bulan membaca satu partisi, query tanpa dibuat membaca semuanya")
    dari, ke = batas(4, S), batas(3, S)
    q1 = f"SELECT sum(jumlah) FROM posting WHERE dibuat >= '{dari}' AND dibuat < '{ke}'"
    jalan("EXPLAIN (COSTS OFF) " + q1, S)
    harap(relasi_plan(q1, S), {"posting_lalu_04"}, "partisi yang dibaca query satu bulan")
    catat(f"# Dibaca: 1 dari {len(nama_partisi)} partisi (posting_lalu_04). Batas partisi menentukan partisi mana yang dibaca; index tidak ikut menentukannya.")
    q2 = "SELECT sum(jumlah) FROM posting WHERE jumlah > 13000"
    kosong = sorted(set(nama_partisi) - set(jumlah))
    harap(len(kosong), 2, "dua partisi kosong (bulan depan dan sesudahnya)")
    explain_tanpa_kosong(q2, S, kosong)
    harap(relasi_plan(q2, S), set(nama_partisi), "partisi yang dibaca query tanpa dibuat")
    simpul2 = {s["Relation Name"]: s for s in simpul_plan(q2, S) if "Relation Name" in s}
    harap({n for n in kosong if simpul2[n]["Node Type"] == "Seq Scan"}, set(kosong), "partisi kosong dipindai dengan Seq Scan")
    harap(sum(1 for n in jumlah if simpul2[n]["Node Type"] == "Seq Scan" and simpul2[n]["Parallel Aware"]), len(jumlah), "partisi berisi dipindai Parallel Seq Scan")
    catat(f"# Dibaca: {len(nama_partisi)} dari {len(nama_partisi)} partisi: {len(jumlah)} partisi berisi dengan Parallel Seq Scan di bawah Parallel Append, dan dua partisi kosong ({', '.join(kosong)}).")
    catat("# Simpul dua partisi kosong tidak ditampilkan di atas: untuk tabel kosong biaya Seq Scan dan Parallel Seq Scan sama (0,00), dan planner memilih salah satunya tidak tetap.")
    q3 = "SELECT * FROM posting WHERE id = 424242"
    jalan("EXPLAIN (COSTS OFF) " + q3, S)
    harap(relasi_plan(q3, S), set(nama_partisi), "partisi yang dibaca query berdasarkan id")
    simpul3 = [s for s in simpul_plan(q3, S) if "Relation Name" in s]
    lewat_indeks = sorted(s["Relation Name"] for s in simpul3 if s["Node Type"] == "Index Scan" and s["Index Name"].endswith("_pkey"))
    lewat_seq = sorted(s["Relation Name"] for s in simpul3 if s["Node Type"] == "Seq Scan")
    harap((lewat_indeks, lewat_seq), (sorted(jumlah), kosong), "id: index primary key di partisi berisi, Seq Scan di partisi kosong")
    catat(f"# Mencari satu baris dengan id saja membaca {len(nama_partisi)} dari {len(nama_partisi)} partisi: index primary key di {len(lewat_indeks)} partisi berisi dan Seq Scan di {len(lewat_seq)} partisi kosong.")
    catat("# id tidak memuat kolom kunci partisi, jadi batas partisi tidak bisa menyisihkan satu pun.")

    bagian("B2. Parallel Append tidak menunggu partisi sebesar 8 MB")
    catat("# min_parallel_table_scan_size (bawaan 8 MB) menentukan apakah tabel biasa boleh dipindai paralel. Kode planner mengecualikan partisi")
    catat("# (anak inheritance) dari batas itu (PostgreSQL 17, allpaths.c, compute_parallel_worker). Diukur di sini: 12 partisi bulanan berisi 30.000 baris.")
    jalan("CREATE TABLE uji_kecil (LIKE posting INCLUDING DEFAULTS) PARTITION BY RANGE (dibuat)", S)
    catat("# 12 partisi bulanan uji_kecil_NN dibuat dengan batas yang sama dengan posting, masing-masing diisi 30.000 baris.")
    with konek(S) as c:
        for i in range(BULAN_SKALA, -1, -1):
            c.execute(f"CREATE TABLE uji_kecil_{i:02d} PARTITION OF uji_kecil FOR VALUES FROM ('{batas(i, S)}') TO ('{batas(i - 1, S)}')")
            c.execute(f"""INSERT INTO uji_kecil (id, jurnal_id, buku_id, jumlah, dibuat)
                          SELECT g, g, 1 + g % 1000, 1000, '{batas(i, S)}'::timestamptz + (g % 86400) * interval '1 second'
                          FROM generate_series(1, 30000) g""")
        c.execute("VACUUM (ANALYZE) uji_kecil")
    terbesar = satu("""SELECT max(pg_relation_size(c.oid)) FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
                       WHERE i.inhparent = 'uji_kecil'::regclass""", S)
    harap(terbesar < 8 * 1024 * 1024, True, "partisi uji_kecil di bawah 8 MB")
    qk = "SELECT sum(jumlah) FROM uji_kecil WHERE jumlah > 13000"
    harap(satu("SELECT count(*) FROM uji_kecil", S), 12 * 30_000, "baris uji_kecil")
    simpul_k = simpul_plan(qk, S)
    harap(any(s["Node Type"] == "Append" and s["Parallel Aware"] for s in simpul_k), True, "Parallel Append atas partisi kecil")
    harap(sum(1 for s in simpul_k if s["Node Type"] == "Seq Scan" and s["Parallel Aware"]), 12, "Parallel Seq Scan atas 12 partisi kecil")
    catat("# Partisi terbesar kurang dari 8 MB. Plan untuk query tanpa dibuat: Parallel Append dengan 12 Parallel Seq Scan, satu per partisi.")
    catat("# Jadi ukuran partisi bukan syarat Parallel Append. Seberapa kecil partisi boleh sebelum planner memilih Append biasa tidak diukur di sini.")
    jalan("DROP TABLE uji_kecil", S, tulis_hasil=False)

    bagian("C. PRIMARY KEY dan UNIQUE harus memuat kolom kunci partisi")
    tolak("CREATE TABLE coba_partisi (id bigint PRIMARY KEY, dibuat timestamptz NOT NULL) PARTITION BY RANGE (dibuat)", "0A000", S,
          pesan="unique constraint on partitioned table must include all partitioning columns")
    tolak("ALTER TABLE posting ADD CONSTRAINT posting_id_unik UNIQUE (id)", "0A000", S,
          pesan="unique constraint on partitioned table must include all partitioning columns")
    jalan("SELECT pg_get_constraintdef(oid) AS primary_key FROM pg_constraint WHERE conrelid = 'posting'::regclass AND contype = 'p'", S)
    catat("# Akibatnya id tidak unik menurut database: dua baris dengan id yang sama dan dibuat berbeda diterima. Keunikan id hanya datang dari sequence.")
    hasil = dalam_transaksi([
        "INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'uji id ganda', 400)",
        "INSERT INTO posting (id, jurnal_id, buku_id, jumlah, dibuat) VALUES"
        " ((SELECT min(id) FROM posting_lalu_04), currval('jurnal_id_seq'), (SELECT id FROM buku WHERE jenis = 'tunjangan'), -1000, now()),"
        " ((SELECT min(id) FROM posting_lalu_04), currval('jurnal_id_seq'), (SELECT min(id) FROM buku WHERE jenis = 'karyawan'), 1000, now() + interval '1 second')",
        "SELECT count(*) AS baris_dengan_id_itu FROM posting WHERE id = (SELECT min(id) FROM posting_lalu_04)",
    ], S)
    harap(hasil[0][0], 3, "baris dengan id yang sama")
    x.tulis("pruning.txt", "pruning partisi posting per bulan dan akibat PRIMARY KEY (id, dibuat)", S)

    # ---- snapshot.txt ----
    bagian("A. Pemeriksaan malam tanpa snapshot: seluruh posting sejak awal (versi pertama)")
    catat("# Job malam membandingkan buku.saldo_cache dengan jumlah posting tiap buku. Baris yang dibaca = selisih seq_tup_read + idx_tup_fetch")
    catat("# di pg_stat_user_tables atas semua partisi posting, sebelum dan sesudah job (proses job sudah keluar, statistiknya sudah dilepas ke server).")
    s0 = stat_baca(S)
    rc, out = job(S, "-cek-cache")
    s1 = stat_baca(S)
    penuh = selisih_stat(s0, s1)
    catat("$ ./api-t5 -cek-cache")
    catat(out)
    catat(f"# exit status {rc}")
    harap(rc, 0, f"-cek-cache: {out}")
    catat(f"# Baris posting dibaca: {penuh:,}".replace(",", ".") + f" dari {total:,} posting di tabel.".replace(",", "."))
    harap(penuh, total, "baris dibaca pemeriksaan tanpa snapshot")

    bagian("B. Snapshot akhir bulan: 11 bulan, satu job per bulan, dari yang paling lama")
    n = buat_snapshot_semua(S, BULAN_SKALA)
    harap(len(set(n)), 1, "tiap bulan menulis jumlah buku yang sama")
    jalan("SELECT count(*) AS baris, count(DISTINCT periode) AS periode, (SELECT count(*) FROM buku) AS buku FROM snapshot_saldo", S)
    harap(satu("SELECT count(*) FROM snapshot_saldo", S), BULAN_SKALA * satu("SELECT count(*) FROM buku", S), "baris snapshot = 11 × buku")
    beda = cocokkan_snapshot(S, BULAN_SKALA)
    catat(f"# Tiap snapshot dibandingkan dengan hitungan langsung atas tabel posting (saldo dan jumlah posting sampai akhir bulannya): {beda} baris berbeda dari {BULAN_SKALA * n[0]:,}.".replace(",", "."))
    rc, out = job(S, "-buat-snapshot", tgl(BULAN_SKALA, S))
    catat("$ ./api-t5 -buat-snapshot <bulan paling lama>   # dijalankan lagi")
    catat(d.samarkan(out))
    harap((rc, out.endswith(": 0 buku ditulis")), (0, True), "snapshot dijalankan ulang menulis 0 baris")
    rc, out = job(S, "-buat-snapshot", tgl(0, S))
    catat("$ ./api-t5 -buat-snapshot <tanggal 1 bulan berjalan>   # bulan belum selesai")
    catat(d.samarkan(out))
    catat(f"# exit status {rc}")
    harap((rc, "bulan belum selesai" in out), (2, True), "snapshot bulan berjalan ditolak")

    bagian("C. Pemeriksaan malam dari snapshot terakhir: posting sesudahnya saja")
    bulan_ini = satu(f"SELECT count(*) FROM posting WHERE dibuat >= ({awal_bulan(0)})", S)
    s0 = stat_baca(S)
    rc, out = job(S, "-cek-cache", "-dari-snapshot")
    s1 = stat_baca(S)
    dari_snapshot = selisih_stat(s0, s1)
    catat("$ ./api-t5 -cek-cache -dari-snapshot")
    catat(d.samarkan(out))
    catat(f"# exit status {rc}")
    harap(rc, 0, f"-cek-cache -dari-snapshot: {out}")
    catat("# Baris posting dibaca: " + f"{dari_snapshot:,}".replace(",", ".") + " dari " + f"{total:,}".replace(",", ".")
          + ", yaitu " + persen(dari_snapshot, total) + " (satu bulan dari 12).")
    harap(dari_snapshot, bulan_ini, "baris dibaca dari snapshot = posting bulan berjalan")
    harap(12 * dari_snapshot, total, "satu bulan dari 12")
    catat("# Snapshot yang lebih tua membuat pemeriksaan membaca lebih banyak bulan: -snapshot-periode memilih periodenya.")
    lama = tgl(3, S)
    s0 = stat_baca(S)
    rc, out = job(S, "-cek-cache", "-dari-snapshot", "-snapshot-periode", lama)
    s1 = stat_baca(S)
    catat("$ ./api-t5 -cek-cache -dari-snapshot -snapshot-periode <tanggal 1 tiga bulan lalu>")
    catat(d.samarkan(out))
    catat(f"# exit status {rc}")
    harap(rc, 0, f"-snapshot-periode: {out}")
    dari_lama = selisih_stat(s0, s1)
    harap(dari_lama, satu("SELECT count(*) FROM posting WHERE dibuat >= %s::timestamptz", S, arg=(batas(2, S),)), "baris dibaca dari snapshot tiga bulan lalu")
    catat("# Baris posting dibaca: " + f"{dari_lama:,}".replace(",", ".") + ", yaitu tiga bulan (dua bulan lalu, bulan lalu, dan bulan berjalan) × "
          + f"{POSTING_BULAN:,}".replace(",", ".") + " posting.")
    harap(dari_lama, 3 * POSTING_BULAN, "tiga bulan posting")

    bagian("D. Jawaban yang sama: satu selisih cache yang nyata terlihat oleh kedua pemeriksaan")
    catat("# Kode yang menulis saldo_cache tanpa posting dibuat dengan UPDATE sebagai role aplikasi (api_t5 memegang hak UPDATE atas kolom itu).")
    jalan("UPDATE buku SET saldo_cache = saldo_cache + 5000 WHERE id = (SELECT min(id) FROM buku WHERE jenis = 'karyawan')", S, role="api_t5")
    rc1, out1 = job(S, "-cek-cache")
    rc2, out2 = job(S, "-cek-cache", "-dari-snapshot")
    catat("$ ./api-t5 -cek-cache")
    catat(d.samarkan(out1))
    catat(f"# exit status {rc1}")
    catat("$ ./api-t5 -cek-cache -dari-snapshot")
    catat(d.samarkan(out2))
    catat(f"# exit status {rc2}")
    harap((rc1, rc2), (1, 1), "kedua pemeriksaan melaporkan selisih")
    pola = re.compile(r"^buku (\d+) \((.*?)\): saldo_cache (-?\d+), [^,]*? (-?\d+), selisih (-?\d+)$", re.M)
    a, b = pola.findall(out1), pola.findall(out2)
    harap((len(a), a), (1, b), "kedua pemeriksaan menandai buku yang sama dengan angka yang sama")
    harap(a[0][4], "5000", "selisih")
    catat("# Kedua pemeriksaan menandai satu buku yang sama dengan saldo_cache, hitungan, dan selisih yang sama (5000).")
    jalan("UPDATE buku SET saldo_cache = saldo_cache - 5000 WHERE id = (SELECT min(id) FROM buku WHERE jenis = 'karyawan')", S, role="api_t5")
    rc, out = job(S, "-cek-cache")
    harap(rc, 0, f"cache dikembalikan: {out}")
    x.tulis("snapshot.txt", "snapshot saldo akhir bulan dan pemeriksaan malam yang membaca satu bulan", S)
