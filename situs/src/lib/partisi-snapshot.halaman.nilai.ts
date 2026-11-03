// Nilai penjaga halaman 5.11, dibangkitkan dari partisi-snapshot.mdx, diagram, widget, snippet, dan baris riset oleh
// tmp/p511/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "dc0a0f949c1ebdc7",
  riset: ["0575c5e32057f58c","a0f1b55cdf0663dd","f9d50eafa42178e4","96a864e4cbf775cf","c9d4d4576c8530fa"],
  diagram: "4d34f3c2963fe660",
  widget: "6f3c6f92989b9150",
  snippet: ["0f4fe278272c81e1","a3862ee4c40fcf98","693752d78406f3fd","7abc108083b60411","0d7a9f5e382f277b","18a16517b8c74068","5f76be9f10e5b080","026381d32ef0e85f","cdc8bab174b51489","27f054153b20a603","7275234851abbabd","71d6af7dae68cd79","75344ca07c4a92b8","bb78fac6790ab22b","201ba0a8b94ec1bd","6767f0f782425996"],
  kode: ["3cf13e936790feec","4e51c2618b074a3b","0214dbfdcf8e4a73"],
  kata: {"hanya":20,"tidakAda":5,"tidakPernah":2,"semua":10,"setiap":0,"selalu":0,"tiap":10},
};

// Nilai terpisah dari kalimat terkunci: lima baris riset utuh, tiap daun diagram dan widget.
export const RISET_TERKUNCI: string[] = [
  "| R5-160 | Pruning, kunci partisi, partisi hash, dan pemeliharaan (5.11) | PostgreSQL 17, postgresql.org/docs/17/ddl-partitioning.html, diunduh dengan curl dan dibaca dari teks 2026-11-03. Bagian 5.12.4: \"With partition pruning enabled, the planner will examine the definition of each partition and prove that the partition need not be scanned because it could not contain any rows meeting the query's WHERE clause\". Bagian 5.12.2.3: constraint unik atau primary key pada tabel berpartisi harus memuat semua kolom kunci partisi, karena index hanya menegakkan keunikan di dalam partisinya sendiri. Bagian 5.12.2.2: `DETACH PARTITION ... CONCURRENTLY` hanya butuh SHARE UPDATE EXCLUSIVE di tabel induk, sedangkan bentuk pertama butuh ACCESS EXCLUSIVE. Bagian partisi hash: \"Each partition will hold the rows for which the hash value of the partition key divided by the specified modulus will produce the specified remainder\". Bagian 5.12.6: \"dividing the table into too many partitions can also cause issues. Too many partitions can mean longer query planning times and higher memory consumption during both query planning and execution\" | 5.11: Cara kerjanya (pruning, PRIMARY KEY, melepas), opsi D ADR 49, Kapan keputusan ini salah | Tidak berubah (versi 17, sama dengan lab 17.11) |",
  "| R5-161 | ALTER TABLE: ATTACH, DETACH CONCURRENTLY, dan trigger kloning (5.11) | PostgreSQL 17, postgresql.org/docs/17/sql-altertable.html, dibaca dari teks 2026-11-03. ATTACH: \"If the new partition is a regular table, a full table scan is performed to check that existing rows in the table do not violate the partition constraint. It is possible to avoid this scan by adding a valid CHECK constraint to the table that allows only rows satisfying the desired partition constraint before running this command.\"; tabel yang dipasang \"must have all the NOT NULL and CHECK constraints of the target table\"; \"For each user-defined row-level trigger that exists in the target table, a corresponding one is created in the attached table\". DETACH: \"Any triggers that were created as clones of those in the target table are removed\". CONCURRENTLY: \"A CHECK constraint that duplicates the partition constraint is added to the partition. CONCURRENTLY cannot be run in a transaction block and is not allowed if the partitioned table contains a default partition.\" | 5.11: Cara kerjanya (melepas, memasang kembali), ADR 49 aturan 3 dan 7 | Tidak berubah (versi 17) |",
  "| R5-162 | pg_partman v5.5.0 (5.11) | api.github.com/repos/pgpartman/pg_partman/releases/latest, dibaca 2026-11-03: tag v5.5.0, nama rilis v5.5.0, published_at 2026-07-22T14:46:50Z, draft false, prerelease false. Fungsi ekstensi dibaca dari halaman repositori di R5-124 (dibuka 2026-11-02); README lab t5-partisi menulis pg_partman hanya disebut dan Tidak dijalankan | 5.11: Cara kerjanya (partisi bulan depan), ADR 49 aturan 2, Sengaja belum dilakukan | Rilis v5.5.0 masih yang terbaru pada 2026-11-03 |",
  "| R5-163 | Stack lain untuk DDL partisi dan PRIMARY KEY dua kolom (5.11) | Halaman diunduh dengan curl 2026-11-03 dan dicari teksnya. Knex Schema Builder (knexjs.org/guide/schema-builder.html, tanpa nomor versi): kata partition, tanpa membedakan huruf besar, muncul sekali, sebagai `partitionBy` di daftar navigasi Query Builder. Laravel 13.x Migrations: 0 kemunculan. Django 5.2: catatan rilis menulis `CompositePrimaryKey` baru; halaman topics/composite-primary-key menulis \"Django doesn't support migrating to, or from, a composite primary key\" dan \"ForeignKey currently cannot reference models with composite primary keys\", dan tidak memuat kata partition. Serverpod 4.1.0: halaman Migrations menulis \"Migrations are plain SQL, so you can edit a generated migration.sql\" dan \"Serverpod applies the file as-is\"; Migrations, Raw access, dan Tables memuat 0 kata partition. Supabase, Partitioning tables (pembaruan 25 Jun 2026): contoh `primary key (order_date, id)`; kolom partisi harus ada di tiap unique index; \"When you query the parent table, Postgres automatically routes the query to the relevant partitions\"; \"There are several other tools available for Postgres partitioning, most notably pg_partman. Native partitioning was introduced in Postgres 10 and is generally thought to have better performance.\" | 5.11: Di stack lain (lima tab selain Go) | Tidak berubah |",
  "| R5-164 | Hitungan atas angka yang tertulis di halaman 5.11 (Hitungan atas Asumsi, Rekaman lab, Simulasi) | Dihitung dengan skrip sendiri, dibaca 2026-11-03: 438.000.000 ÷ 12 = 36.500.000; 36,5 juta × 250 byte = 9,125 GB (ditulis 9,1); 292.000.000 ÷ 12 = 24,33 juta (24,3); 24,33 juta × 250 byte = 6,08 GB (6,1); 200.000 × 3 × 365 = 219.000.000; 200.000 × 2 × 365 = 146.000.000; 168.000 − 140.000 = 28.000 (lepas.txt bagian A dan C); 12 × 10.000 = 120.000 dan 120.000 − 10.000 = 110.000 (widget). Rekaman labs/t5-partisi/output/pruning.txt bagian A sampai C, lepas.txt bagian A sampai G, pasang.txt bagian A sampai D, testing.txt, README lab, kode labs/api-t5/migrasi/000024_posting_partisi.up.sql; widget t5-partisi.json dijalankan di Node dengan sql.js 1.14.2 (SQLite), hasilnya dikunci tests/widgets/runsql-t5-partisi.test.cjs | 5.11: tabel Hitungan, Rantai, widget, kartu Cek diri | Tidak berubah |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t5-partisi-inti"
 ],
 [
  ".judul",
  "Query satu bulan membaca satu partisi; satu bulan dilepas, bukan dihapus"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab t5-partisi · pruning.txt bagian B dan lepas.txt bagian B dan C"
 ],
 [
  ".baris[0].label",
  "Dibaca"
 ],
 [
  ".baris[0].sub",
  "pruning.txt bagian B"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Query menyebut dibuat"
 ],
 [
  ".baris[0].simpul[0].sub",
  "satu bulan"
 ],
 [
  ".baris[0].simpul[0].nada",
  "system"
 ],
 [
  ".baris[0].simpul[1].teks",
  "1 dari 14 partisi dibaca"
 ],
 [
  ".baris[0].simpul[1].sub",
  "posting_lalu_04"
 ],
 [
  ".baris[0].simpul[1].nada",
  "good"
 ],
 [
  ".baris[1].label",
  "Dibuang"
 ],
 [
  ".baris[1].sub",
  "lepas.txt bagian B dan C"
 ],
 [
  ".baris[1].simpul[0].teks",
  "DELETE atas posting ditolak"
 ],
 [
  ".baris[1].simpul[0].sub",
  "SQLSTATE 23001"
 ],
 [
  ".baris[1].simpul[0].nada",
  "warn"
 ],
 [
  ".baris[1].simpul[1].teks",
  "DETACH melepas 28.000 posting"
 ],
 [
  ".baris[1].simpul[1].sub",
  "jadi tabel sendiri"
 ],
 [
  ".baris[1].simpul[1].nada",
  "good"
 ],
 [
  ".catatan",
  "Angka dari rekaman lab skala kecil: 12 bulan × 150.000 posting di 14 partisi, dan 28.000 posting per bulan di rekaman lepas. Pada skala naskah posting setahun 438 juta (Asumsi)."
 ]
];
export const WIDGET_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t5-partisi"
 ],
 [
  ".title",
  "Posting 12 bulan, 10.000 baris per bulan (SQLite, Simulasi)"
 ],
 [
  ".setup",
  "CREATE TABLE posting (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM g WHERE x < 120000)\nINSERT INTO posting SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-01-01', '+' || ((x - 1) / 10000) || ' months'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;"
 ],
 [
  ".check",
  "SELECT name AS tabel_yang_tersisa FROM sqlite_master WHERE type = 'table' ORDER BY name"
 ],
 [
  ".predict.q",
  "Panel Before menyimpan 12 bulan di satu tabel, panel After di 12 tabel. Query bulan April menyebut posting di Before dan posting_04 di After. Berapa baris ada di tabel yang dipindai query itu?"
 ],
 [
  ".predict.options[0]",
  "120.000 di kedua panel"
 ],
 [
  ".predict.options[1]",
  "120.000 di Before dan 10.000 di After"
 ],
 [
  ".predict.options[2]",
  "10.000 di kedua panel"
 ],
 [
  ".predict.options[3]",
  "10.000 di Before dan 120.000 di After"
 ],
 [
  ".predict.answer",
  1
 ],
 [
  ".predict.explain",
  "Before: SCAN posting memindai tabel berisi 120.000 baris, karena tidak ada index pada dibuat. After: SCAN posting_04 memindai tabel berisi 10.000 baris. Di SQLite tiap bulan adalah tabel sendiri dan query menyebut namanya; di PostgreSQL planner memilih partisi dari batas dibuat (rekaman pruning.txt bagian B). Centang 'Ubah satu hal' untuk query yang tidak menyebut bulan."
 ],
 [
  ".panels.before.label",
  "Before: satu tabel posting"
 ],
 [
  ".panels.before.onError",
  "stop"
 ],
 [
  ".panels.before.steps[0].sql",
  "EXPLAIN QUERY PLAN SELECT sum(jumlah) FROM posting WHERE dibuat >= '2026-04-01' AND dibuat < '2026-05-01'"
 ],
 [
  ".panels.before.steps[0].note",
  "rencana query bulan April"
 ],
 [
  ".panels.before.steps[1].sql",
  "SELECT count(*) AS baris_di_tabel_yang_dipindai FROM posting"
 ],
 [
  ".panels.before.steps[1].note",
  "baris di tabel yang dipindai"
 ],
 [
  ".panels.before.steps[2].sql",
  "DELETE FROM posting WHERE dibuat < '2026-02-01'"
 ],
 [
  ".panels.before.steps[2].note",
  "buang Januari"
 ],
 [
  ".panels.before.steps[3].sql",
  "SELECT count(*) AS baris_tersisa FROM posting"
 ],
 [
  ".panels.before.steps[3].note",
  "sisa baris"
 ],
 [
  ".panels.after.label",
  "After: satu tabel per bulan"
 ],
 [
  ".panels.after.onError",
  "stop"
 ],
 [
  ".panels.after.setup",
  "CREATE TABLE posting_01 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM g WHERE x < 10000)\nINSERT INTO posting_01 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-01-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_02 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 10001 UNION ALL SELECT x + 1 FROM g WHERE x < 20000)\nINSERT INTO posting_02 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-02-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_03 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 20001 UNION ALL SELECT x + 1 FROM g WHERE x < 30000)\nINSERT INTO posting_03 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-03-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_04 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 30001 UNION ALL SELECT x + 1 FROM g WHERE x < 40000)\nINSERT INTO posting_04 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-04-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_05 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 40001 UNION ALL SELECT x + 1 FROM g WHERE x < 50000)\nINSERT INTO posting_05 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-05-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_06 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 50001 UNION ALL SELECT x + 1 FROM g WHERE x < 60000)\nINSERT INTO posting_06 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-06-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_07 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 60001 UNION ALL SELECT x + 1 FROM g WHERE x < 70000)\nINSERT INTO posting_07 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-07-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_08 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 70001 UNION ALL SELECT x + 1 FROM g WHERE x < 80000)\nINSERT INTO posting_08 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-08-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_09 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 80001 UNION ALL SELECT x + 1 FROM g WHERE x < 90000)\nINSERT INTO posting_09 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-09-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_10 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 90001 UNION ALL SELECT x + 1 FROM g WHERE x < 100000)\nINSERT INTO posting_10 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-10-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_11 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 100001 UNION ALL SELECT x + 1 FROM g WHERE x < 110000)\nINSERT INTO posting_11 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-11-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;\nCREATE TABLE posting_12 (id INTEGER NOT NULL, jurnal_id INTEGER NOT NULL, buku_id INTEGER NOT NULL, jumlah INTEGER NOT NULL, dibuat TEXT NOT NULL, PRIMARY KEY (id, dibuat));\nWITH RECURSIVE g(x) AS (SELECT 110001 UNION ALL SELECT x + 1 FROM g WHERE x < 120000)\nINSERT INTO posting_12 SELECT x, 1 + x / 2, 1 + (x % 1000), CASE WHEN x % 2 = 0 THEN -25000 ELSE 25000 END, datetime(date('2026-12-01'), '+' || (((x - 1) % 10000) * 200) || ' seconds') FROM g;"
 ],
 [
  ".panels.after.steps[0].sql",
  "EXPLAIN QUERY PLAN SELECT sum(jumlah) FROM posting_04 WHERE dibuat >= '2026-04-01' AND dibuat < '2026-05-01'"
 ],
 [
  ".panels.after.steps[0].note",
  "rencana query bulan April"
 ],
 [
  ".panels.after.steps[1].sql",
  "SELECT count(*) AS baris_di_tabel_yang_dipindai FROM posting_04"
 ],
 [
  ".panels.after.steps[1].note",
  "baris di tabel yang dipindai"
 ],
 [
  ".panels.after.steps[2].sql",
  "DROP TABLE posting_01"
 ],
 [
  ".panels.after.steps[2].note",
  "buang Januari"
 ],
 [
  ".panels.after.steps[3].sql",
  "SELECT (SELECT count(*) FROM posting_02) + (SELECT count(*) FROM posting_03) + (SELECT count(*) FROM posting_04) + (SELECT count(*) FROM posting_05) + (SELECT count(*) FROM posting_06) + (SELECT count(*) FROM posting_07) + (SELECT count(*) FROM posting_08) + (SELECT count(*) FROM posting_09) + (SELECT count(*) FROM posting_10) + (SELECT count(*) FROM posting_11) + (SELECT count(*) FROM posting_12) AS baris_tersisa"
 ],
 [
  ".panels.after.steps[3].note",
  "sisa baris"
 ],
 [
  ".toggles[0].label",
  "query bulan April tidak menyebut tabel bulan"
 ],
 [
  ".toggles[0].pairs[0][0]",
  "FROM posting_04 WHERE"
 ],
 [
  ".toggles[0].pairs[0][1]",
  "FROM (SELECT * FROM posting_01 UNION ALL SELECT * FROM posting_02 UNION ALL SELECT * FROM posting_03 UNION ALL SELECT * FROM posting_04 UNION ALL SELECT * FROM posting_05 UNION ALL SELECT * FROM posting_06 UNION ALL SELECT * FROM posting_07 UNION ALL SELECT * FROM posting_08 UNION ALL SELECT * FROM posting_09 UNION ALL SELECT * FROM posting_10 UNION ALL SELECT * FROM posting_11 UNION ALL SELECT * FROM posting_12) WHERE"
 ],
 [
  ".toggles[0].pairs[1][0]",
  "baris_di_tabel_yang_dipindai FROM posting_04"
 ],
 [
  ".toggles[0].pairs[1][1]",
  "baris_di_tabel_yang_dipindai FROM (SELECT * FROM posting_01 UNION ALL SELECT * FROM posting_02 UNION ALL SELECT * FROM posting_03 UNION ALL SELECT * FROM posting_04 UNION ALL SELECT * FROM posting_05 UNION ALL SELECT * FROM posting_06 UNION ALL SELECT * FROM posting_07 UNION ALL SELECT * FROM posting_08 UNION ALL SELECT * FROM posting_09 UNION ALL SELECT * FROM posting_10 UNION ALL SELECT * FROM posting_11 UNION ALL SELECT * FROM posting_12)"
 ]
];

export const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import TabSet from \"../../../components/TabSet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import intiDiagram from \"../../../../data/diagram/t5-partisi-inti.json\";",
  "<p class=\"meta\">Baca 17 menit · coba 3 menit · Prasyarat: [[t5-m43]] · Jalur inti</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Posting dipartisi per bulan, jadi query satu bulan membaca satu partisi dan bulan lama dilepas, bukan dihapus.",
  "<Rantai data={intiDiagram} ringkas />",
  "Partisi membagi satu tabel menjadi beberapa tabel fisik menurut nilai satu kolom, di sini `dibuat`. Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `pruning.txt` bagian B, `posting` punya 14 partisi dan query satu bulan hanya membaca `posting_lalu_04`.",
  "Ledger menolak DELETE atas posting, jadi satu bulan lama dilepas dengan `DETACH` dan diarsipkan. Harganya tiga: PRIMARY KEY memuat `dibuat`, partisi bulan depan harus sudah ada, dan tabel yang dilepas tidak lagi dijaga tiga trigger ledger.",
  "<details class=\"question\">",
  "<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Kenapa `PRIMARY KEY (id)` ditolak pada `posting` yang dipartisi menurut `dibuat`, dan apa akibatnya untuk `id`?",
  "2. Apa jawaban PostgreSQL bila `DETACH PARTITION ... CONCURRENTLY` dijalankan di dalam blok transaction, atau saat ada partisi default?",
  "3. Tabel pulih dari arsip dipasang dengan `ATTACH PARTITION` tanpa CHECK batas partisi. Apa yang dikerjakan PostgreSQL?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: query yang menyebut bulannya memindai satu bulan, query yang tidak menyebutnya memindai semua bulan, dan membuang satu bulan lewat DROP TABLE tidak menghapus baris.\">",
  "Widget ini menjalankan SQLite sungguhan di browser, bukan PostgreSQL. **Simulasi** di halaman ini berarti SQL dijalankan oleh SQLite (sql.js 1.14.2), datanya dibuat skrip di widget, dan hasilnya tidak pernah berlabel Rekaman lab.",
  "SQLite tidak punya partisi deklaratif, jadi panel After memakai satu tabel per bulan dan query menyebut nama tabelnya. Di PostgreSQL planner memilih partisi dari batas `dibuat`, dan itu hanya ada di rekaman lab pada blok berikutnya. Datanya 12 bulan × 10.000 = 120.000 baris buatan (Ilustrasi).",
  "Tebak dulu berapa baris yang dipindai query bulan April di tiap panel, lalu jalankan.",
  "<WidgetLama nama=\"runsql\" src=\"data/t5-partisi.json\" />",
  "Panel Before menulis `SCAN posting`, dan tabel yang dipindai berisi 120.000 baris. Panel After menulis `SCAN posting_04`, dan tabel yang dipindai berisi 10.000 baris. Sesudah itu Januari dibuang. `DELETE` di Before melaporkan 10000 baris berubah, sedangkan `DROP TABLE` di After tidak melaporkan hitungan baris. Kedua panel menyisakan 110.000 baris.",
  "**Ubah satu hal:** centang kotak di atas kedua panel, lalu tekan Jalankan ulang. Query April di panel After kini tidak menyebut tabel bulan, jadi ia menggabungkan 12 tabel. Rencananya memuat `SCAN` atas `posting_01` sampai `posting_12`, dan tabel yang dipindai berisi 120.000 baris, sama dengan Before.",
  "Partisi memangkas bacaan hanya bila query memuat kolom kuncinya. Rekaman lab menunjukkan hal yang sama di PostgreSQL: query tanpa `dibuat` membaca 14 dari 14 partisi (`pruning.txt` bagian B).",
  "<noscript>",
  "<p>Tanpa JavaScript widget tidak berjalan. Hasilnya: query bulan April memindai tabel berisi 120.000 baris di Before dan tabel berisi 10.000 baris di After. Sesudah Januari dibuang, kedua panel menyisakan 110.000 baris. Bila query April tidak menyebut tabel bulan, panel After memindai 12 tabel berisi 120.000 baris.</p>",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t5-m43]] menunjukkan pemeriksaan harian yang membaca semua posting, dan data lama yang tidak boleh dihapus. ADR 6 ([[t2-adr-ledger]], revisi di Tahap 2) sudah menjadwalkan partisi `posting` per bulan dan snapshot saldo di Tahap 5 ([[t5-prd]]). ADR 49 mengerjakannya.",
  "Angka beban halaman ini Asumsi, yaitu angka pilihan penulis tanpa rekaman. Hitungan adalah hasil rumus dari angka yang tertulis di halaman, dan ia berlabel sama dengan masukan terlemahnya. Penalaran adalah kesimpulan dari definisi atau angka di halaman, bukan hasil ukuran. Tidak dijalankan berarti dicek ke dokumentasi atau kode tanpa dijalankan.",
  "Puncak transaksi uang 69,4 per detik dan 438 juta posting per tahun memakai tiga transaksi per user aktif per hari ([[t5-prd]]). Dengan dua transaksi hasilnya 46,3 dan 292 juta.",
  "Ukuran bukan alasan partisi. Posting setahun 109,5 GB lawan batas 32 TB per relasi, yaitu 292 tahun (Hitungan atas Asumsi, diturunkan di [[t5-m43]]). Alasannya dua: pemeriksaan yang membaca semuanya, dan data lama yang harus keluar dari tabel tanpa DELETE.",
  "### Cara kerjanya",
  "**Partisi memilih tempat baris dari `dibuat`.** Rekaman bagian A memuat 14 partisi `posting` di lab: 12 berisi 150.000 posting, dan dua kosong untuk bulan depan dan sesudahnya. Angka 150.000 adalah pilihan lab, bukan beban produksi.",
  "<Snippet file=\"labs/t5-partisi/output/pruning.txt\" lines=\"9:25\" title=\"Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian A (partisi dan jumlah posting)\" />",
  "Satu fungsi di migration `api-t5` membuat satu partisi bulan. Fungsi itu menolak tanggal yang bukan awal bulan, lalu memasang penjaga TRUNCATE di partisi barunya.",
  "<Snippet file=\"labs/api-t5/migrasi/000024_posting_partisi.up.sql\" lines=\"41:52\" lang=\"sql\" title=\"Kode lab: labs/api-t5/migrasi/000024_posting_partisi.up.sql baris 41 sampai 52 (buat_partisi_posting)\" />",
  "Migration memanggilnya untuk bulan berjalan dan dua bulan sesudahnya, dan semua baris sebelum bulan berjalan masuk satu partisi `posting_sebelum`. Lab `t5-partisi` menggantinya dengan sebelas partisi bulanan (README lab). Memindahkan baris lama per bulan di database yang sudah berisi tidak direkam (Tidak dijalankan).",
  "**Pruning memangkas partisi dari batas `dibuat`.** Dokumentasi PostgreSQL menulis bahwa planner membuktikan partisi mana yang tidak mungkin berisi baris yang dicari, lalu tidak memindainya ([PostgreSQL 17, 5.12.4](https://www.postgresql.org/docs/17/ddl-partitioning.html), dibuka 2026-11-03). Pada query satu bulan, 13 partisi lain dipangkas:",
  "<Snippet file=\"labs/t5-partisi/output/pruning.txt\" lines=\"29:39\" title=\"Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian B (query satu bulan)\" />",
  "Query `WHERE jumlah > 13000` tidak menyebut `dibuat`. Rencananya memuat `Parallel Seq Scan` atas 12 partisi berisi, dan dua partisi kosong ikut dibaca tetapi simpulnya tidak ditampilkan, karena bentuknya tidak tetap. Pencarian satu baris dengan `id` saja memakai 12 `Index Scan` atas index primary key dan dua `Seq Scan` atas partisi kosong:",
  "<Snippet file=\"labs/t5-partisi/output/pruning.txt\" lines=\"108:109\" title=\"Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian B (pencarian id)\" />",
  "Index tidak menggantikan batas partisi. `id` tidak memuat `dibuat`, jadi batas partisi tidak menyisihkan satu pun.",
  "**PRIMARY KEY harus memuat `dibuat`.** PostgreSQL menolak UNIQUE dan PRIMARY KEY yang tidak memuat semua kolom kunci partisi, dengan SQLSTATE 0A000. Dokumentasi menulis alasannya: index yang membentuk constraint hanya menegakkan keunikan di dalam partisinya sendiri ([PostgreSQL 17, 5.12.2.3](https://www.postgresql.org/docs/17/ddl-partitioning.html), dibuka 2026-11-03).",
  "<Snippet file=\"labs/t5-partisi/output/pruning.txt\" lines=\"122:132\" title=\"Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian C (PRIMARY KEY dan UNIQUE)\" />",
  "Akibatnya database tidak lagi menjaga `id` unik lintas partisi. Satu transaction yang dibatalkan menyisipkan dua baris dengan `id` yang sudah ada, dan `id` itu muncul tiga kali:",
  "<Snippet file=\"labs/t5-partisi/output/pruning.txt\" lines=\"137:143\" title=\"Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian C (id ganda diterima)\" />",
  "Keunikan `id` di lab datang dari sequence `posting_id_seq` ([[t5-skema]]).",
  "**Aturan ledger dijaga per partisi.** Tiga trigger baris, yaitu `jurnal_seimbang`, `posting_tidak_diubah`, dan `saldo_karyawan_tidak_negatif`, dipasang di tabel induk dan dikloning ke tiap partisi. Penjaga TRUNCATE bertingkat statement tidak ikut dikloning. Fungsi `buat_partisi_posting` memasangnya di partisi, satu per satu.",
  "Tabel pulih yang dipasang dengan ATTACH dari tabel baru mendapat tiga trigger baris, tetapi tidak mendapat penjaga TRUNCATE. TRUNCATE atasnya berhasil untuk pemilik schema (dibatalkan ROLLBACK), dan ditolak sesudah penjaganya dipasang:",
  "<Snippet file=\"labs/t5-partisi/output/pasang.txt\" lines=\"29:45\" title=\"Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian B (penjaga TRUNCATE di partisi hasil ATTACH)\" />",
  "Aturan append-only hidup dari trigger itu. Pada partisi hasil ATTACH, trigger `posting_tidak_diubah` yang dimatikan membuat UPDATE atas 28.000 baris berhasil (dibatalkan ROLLBACK). Sesudah trigger menyala, UPDATE yang sama ditolak lagi (`pasang.txt` bagian B).",
  "**Partisi bulan depan harus ada sebelum bulannya mulai.** Tabel di lab punya partisi sampai bulan ke-2 sesudah bulan berjalan. INSERT dengan `dibuat` di bulan ke-3 ditolak, dan baris yang sama masuk sesudah fungsi pembuat partisi dipanggil. Jam diperankan dengan `dibuat` yang eksplisit:",
  "<Snippet file=\"labs/t5-partisi/output/pasang.txt\" lines=\"131:133\" title=\"Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian D (bulan tanpa partisi)\" />",
  "Lab tidak punya penjadwal yang memanggil fungsi itu tiap bulan. Skrip lab memanggilnya (Tidak dijalankan: penjadwal).",
  "Ada dua cara. Yang pertama job sendiri seperti fungsi 12 baris itu. Yang kedua pg_partman, ekstensi yang membuat dan memelihara partisi berbasis waktu ([pg_partman](https://github.com/pgpartman/pg_partman), rilis v5.5.0 terbit 2026-07-22, dibuka 2026-11-03). pg_partman hanya disebut dan tidak dijalankan.",
  "**Snapshot saldo mengikat retensi.** Snapshot adalah saldo akhir bulan per buku. Pemeriksaan malam membaca snapshot terakhir dan posting sesudahnya: 150.000 dari 1.800.000 posting di lab, yaitu 8,3% ([[t5-m43]]). Lima snapshot ditulis sebelum satu partisi dilepas, dan dicocokkan dengan hitungan langsung atas tabel posting: 0 baris berbeda (`lepas.txt` bagian A).",
  "Aturan \"snapshot dulu, lepas kemudian\" adalah prosedur ADR 49. Di lab tidak ada event trigger yang menolak DETACH, dan migration `api-t2` sampai `api-t5` tidak memuatnya. DETACH hanya dijaga hak pemilik tabel (`lepas.txt` bagian B). Sesudah satu partisi dilepas, pemeriksaan tanpa snapshot menandai 10.061 dari 10.288 buku dan pemeriksaan dari snapshot menandai 0 (`lepas.txt` bagian F, dijelaskan di [[t5-m43]]).",
  "**Melepas satu bulan tidak lewat DELETE.** Ledger menolak DELETE atas posting dengan SQLSTATE 23001. DETACH dan DROP tidak memicu trigger itu, jadi yang menahannya hak pemilik tabel: role aplikasi `api_t5` ditolak dengan 42501.",
  "<Snippet file=\"labs/t5-partisi/output/lepas.txt\" lines=\"33:42\" title=\"Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian B (DELETE, DETACH, dan DROP)\" />",
  "Dokumentasi menulis bahwa `DETACH PARTITION ... CONCURRENTLY` hanya butuh kunci SHARE UPDATE EXCLUSIVE di tabel induk, sedangkan bentuk biasa butuh ACCESS EXCLUSIVE ([PostgreSQL 17, 5.12.2.2](https://www.postgresql.org/docs/17/ddl-partitioning.html), dibuka 2026-11-03). Dokumentasi ALTER TABLE menulis dua batasnya, dan lab merekam keduanya:",
  "<Snippet file=\"labs/t5-partisi/output/lepas.txt\" lines=\"46:59\" title=\"Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian C (DETACH CONCURRENTLY dan batasnya)\" />",
  "Tabel yang dilepas tetap ada sebagai tabel sendiri. Dokumentasi ALTER TABLE menulis bahwa `DETACH CONCURRENTLY` menambahkan CHECK yang menduplikasi batas partisi, dan bahwa trigger kloning dari tabel induk dihapus ([PostgreSQL 17, ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html), dibuka 2026-11-03).",
  "<Snippet file=\"labs/t5-partisi/output/lepas.txt\" lines=\"60:81\" title=\"Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian C (CHECK dan trigger sesudah DETACH)\" />",
  "Pemilik tabel masih bisa UPDATE baris tabel yang dilepas (dibatalkan ROLLBACK). Role aplikasi ditolak dengan 42501 untuk UPDATE dan DELETE, karena hak, bukan karena trigger. Apakah hak atas arsip dicabut segera sesudah DETACH belum diputuskan.",
  "**DETACH dan DROP lawan DELETE diukur sebagai batas.** Lab membuang 200.000 baris dari dua tabel uji tanpa trigger ledger, karena DELETE atas `posting` ditolak. Waktu terkecil DELETE dari tiga percobaan lebih dari dua kali waktu terkecil DETACH + DROP, dan nilai waktunya tidak direkam (`lepas.txt` bagian D).",
  "Dokumentasi menulis DROP atau DETACH jauh lebih cepat daripada operasi massal. Keduanya juga menghindari beban `VACUUM` dari DELETE massal ([PostgreSQL 17, 5.12.1](https://www.postgresql.org/docs/17/ddl-partitioning.html), dibuka 2026-11-03). `VACUUM` tidak diukur di lab (Tidak dijalankan).",
  "**Arsip dibandingkan sebelum dipercaya.** Satu partisi 28.000 baris diekspor ke file, dipulihkan ke tabel baru, dan dibandingkan:",
  "<Snippet file=\"labs/t5-partisi/output/lepas.txt\" lines=\"126:129\" title=\"Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian E (arsip dan pemulihan)\" />",
  "File itu CSV tanpa enkripsi di folder sementara lab. Enkripsi dan baris `arsip_partisi` dibahas di [[t5-kms]] (ADR 57).",
  "**Memasang kembali memindai tabel kecuali ada CHECK yang tepat.** Tabel pulih dari arsip harus membawa CHECK bawaan `jumlah <> 0`, atau ATTACH ditolak dengan 42804. Tanpa CHECK batas partisi, PostgreSQL memindai tabel dan memvalidasi foreign key:",
  "<Snippet file=\"labs/t5-partisi/output/pasang.txt\" lines=\"7:19\" title=\"Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian A (ATTACH tanpa dan dengan CHECK bawaan)\" />",
  "Dokumentasi ALTER TABLE menulis bahwa ATTACH atas tabel biasa memindai penuh untuk memeriksa batas partisi. Pemindaian itu dapat dihindari dengan CHECK valid yang hanya mengizinkan baris sesuai batas ([PostgreSQL 17, ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html), dibuka 2026-11-03). Lab mencoba beberapa bentuk CHECK, dan hanya satu membebaskan pemindaian:",
  "| Tabel yang dipasang | Pemindaian batas partisi | Validasi foreign key |",
  "| --- | --- | --- |",
  "| Tanpa CHECK bawaan `jumlah <> 0` | ditolak: 42804 | tidak sampai ke sini |",
  "| Dengan CHECK bawaan, tanpa CHECK batas | memindai | divalidasi |",
  "| CHECK batas literal sama dengan `FOR VALUES` | tidak memindai | divalidasi |",
  "| CHECK batas berupa ekspresi | memindai | divalidasi |",
  "| CHECK batas literal yang `NOT VALID` | memindai | divalidasi |",
  "| CHECK batas atas lebih longgar | memindai | divalidasi |",
  "| Tabel asal dari `DETACH CONCURRENTLY` | tidak memindai | tidak divalidasi |",
  "Semua baris tabel itu dari `pasang.txt` bagian A dan C. Di bentuk yang dicoba lab, CHECK yang sesuai berarti CHECK dengan literal yang sama dengan batas partisi, bukan ekspresi yang bernilai sama.",
  "<Snippet file=\"labs/t5-partisi/output/pasang.txt\" lines=\"74:82\" title=\"Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian C (CHECK literal sama dengan batas partisi)\" />",
  "**Jurnal pembalik tidak bisa dibuat untuk bulan yang dilepas.** `Balik` melihat nol posting untuk jurnal yang postingnya sudah dilepas, dan menjawab 409 `posting-diarsipkan` sebelum transaction dibuka:",
  "<Snippet file=\"labs/t5-partisi/output/lepas.txt\" lines=\"144:153\" title=\"Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian G (jurnal pembalik atas bulan terpasang dan bulan dilepas)\" />",
  "Jendela koreksi 13 bulan adalah Asumsi, dan PRD v5 belum menulis jendela koreksi ([[t5-prd]]). Nama jenis masalah dan teks pesan 409 belum disetujui.",
  "**Skala produksi dihitung, bukan dijalankan.** Masukannya dari [[t5-m43]]: 438 juta posting per tahun, yaitu 200.000 × 3 × 2 × 365, dan 250 byte per posting termasuk index. Keduanya Asumsi, jadi semua baris di bawah Hitungan atas Asumsi.",
  "| Besaran | Rumus | Hasil | Dengan 2 transaksi |",
  "| --- | --- | --- | --- |",
  "| Posting per bulan | 438 juta ÷ 12 | 36,5 juta | 24,3 juta |",
  "| Ukuran posting per bulan | 36,5 juta × 250 byte | 9,1 GB | 6,1 GB |",
  "| Jurnal per tahun | 200.000 × 3 × 365 | 219 juta | 146 juta |",
  "Lab memakai 150.000 posting per bulan supaya satu bulan dari 12 sama dengan 8,3% ([[t5-m43]]). Lab tidak mengklaim kapasitas tulis satu primary: partisi tidak menambahnya (README lab).",
  "### Di stack lain",
  "**Skenario:** satu tabel yang hanya bertambah dipartisi per bulan, dengan PRIMARY KEY yang memuat kolom waktu. Yang ditanyakan: bagaimana stack menulis DDL partisi dan PRIMARY KEY dua kolom?",
  "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-03. Kode di tab lain adalah Ilustrasi.",
  "<TabSet id=\"stack\" labels={[\"Go\", \"Node.js\", \"Laravel\", \"Django\", \"Dart (Serverpod)\", \"Supabase\"]}>",
  "<Fragment slot=\"t0\">",
  "*Dijalankan: lab api-t5 dan t5-partisi, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0 (rekaman `pruning.txt`, `lepas.txt`, `pasang.txt`).*",
  "<Snippet file=\"labs/api-t5/migrasi/000024_posting_partisi.up.sql\" lines=\"18:25\" lang=\"sql\" title=\"labs/api-t5/migrasi/000024_posting_partisi.up.sql\" />",
  "**Yang berbeda di stack ini:** DDL partisi ditulis sebagai SQL di file migration, dan tidak ada lapisan yang membuatnya dari model.",
  "</Fragment>",
  "<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke [Knex: Schema Builder](https://knexjs.org/guide/schema-builder.html), halaman tanpa nomor versi, dibuka 2026-11-03. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"js\" code={`await knex.raw(\\`",
  "CREATE TABLE posting (",
  "id bigint NOT NULL, dibuat timestamptz NOT NULL,",
  "PRIMARY KEY (id, dibuat)",
  ") PARTITION BY RANGE (dibuat)\\`);`} />",
  "**Yang berbeda di stack ini:** di halaman Schema Builder kata partition hanya muncul sekali, sebagai method `partitionBy` di daftar navigasi Query Builder. Karena itu tab ini menulis DDL partisi lewat `knex.raw`.",
  "</Fragment>",
  "<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: Migrations](https://laravel.com/docs/13.x/migrations), dibuka 2026-11-03. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"php\" code={`DB::statement('",
  "CREATE TABLE posting (",
  "id bigint NOT NULL, dibuat timestamptz NOT NULL,",
  "PRIMARY KEY (id, dibuat)",
  ") PARTITION BY RANGE (dibuat)');`} />",
  "**Yang berbeda di stack ini:** kata partition tidak muncul di halaman Migrations itu. Tab ini menaruh DDL partisi di `DB::statement`.",
  "</Fragment>",
  "<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [Django 5.2: Composite primary keys](https://docs.djangoproject.com/en/5.2/topics/composite-primary-key/), dibuka 2026-11-03. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"python\" code={`class Posting(models.Model):",
  "pk = models.CompositePrimaryKey(\"id\", \"dibuat\")",
  "id = models.BigIntegerField()",
  "dibuat = models.DateTimeField()`} />",
  "**Yang berbeda di stack ini:** Django 5.2 menambah `CompositePrimaryKey` untuk PRIMARY KEY lebih dari satu kolom. Dokumentasi menulis bahwa `ForeignKey` belum bisa menunjuk model dengan composite primary key, dan bahwa Django tidak mendukung migrasi ke atau dari composite primary key. Halaman itu tidak memuat kata partition.",
  "</Fragment>",
  "<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Dicek ke [Serverpod: Migrations](https://docs.serverpod.dev/concepts/data-and-the-database/database/migrations), Serverpod 4.1.0, dibuka 2026-11-03. Kode Dart tidak ditulis di tab ini.*",
  "**Yang berbeda di stack ini:** halaman Migrations menulis bahwa migration adalah SQL biasa dan `migration.sql` hasil generator boleh disunting. Serverpod menerapkan file itu apa adanya. Kata partition tidak muncul di halaman Migrations, Raw access, dan Tables.",
  "</Fragment>",
  "<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke [Supabase: Partitioning tables](https://supabase.com/docs/guides/database/partitions), pembaruan 25 Jun 2026, dibuka 2026-11-03.*",
  "**Yang berbeda di stack ini:** panduan itu memakai contoh `primary key (order_date, id)` dan menulis bahwa kolom partisi harus ada di tiap unique index. Query ke tabel induk diarahkan ke partisi yang relevan. pg_partman disebut sebagai alat lain. Partisi bawaan Postgres, yang muncul di versi 10, dianggap umumnya lebih cepat.",
  "</Fragment>",
  "</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 49: `posting` dipartisi per bulan, bulan lama dilepas dan diarsipkan",
  "**Kebutuhan.** Posting tidak boleh dihapus, dan pemeriksaan harian harus selesai pukul 06.00, target Pak Hadi yang berlabel Ilustrasi ([[t5-m43]]). Posting tumbuh 438 juta per tahun (Asumsi).",
  "**Status:** diterima sesudah M43, dan menjalankan jadwal ADR 6 ([[t2-adr-ledger]]). Dibaca ulang di [[t5-kms]]. Naskah tidak menulis tanggal ADR.",
  "| | A. Satu tabel dan index | B. Sharding | C. Database ledger khusus | D. Partisi hash | E. Partisi per bulan |",
  "|---|---|---|---|---|---|",
  "| Cara kerja | `posting` tetap satu tabel dengan index | Data dibagi ke beberapa instance menurut wilayah atau buku | Ledger pindah ke database khusus ledger, mis. TigerBeetle | `posting` dibagi menurut hash `buku_id` | `posting` dibagi per bulan menurut `dibuat` |",
  "| Kelebihan | Tidak ada pekerjaan bulanan | Tulis dibagi ke beberapa instance (penalaran) | Dirancang untuk ledger (penalaran) | Baris menyebar rata antar partisi (penalaran) | Satu bulan dibaca, dilepas, dan diarsip sendiri |",
  "| Kekurangan | Ledger menolak DELETE, jadi data lama tidak bisa dibuang | Transfer lintas shard tidak lagi satu transaction (penalaran) | Saldo dan snapshot tidak lagi satu database dengan data lain (penalaran) | Tiap partisi berisi semua bulan, jadi satu bulan tidak bisa dilepas (penalaran) | PRIMARY KEY memuat `dibuat`, dan partisi bulan depan harus dibuat |",
  "| Biaya operasional | Pemeriksaan membaca 1.800.000 dari 1.800.000 posting di lab | Rute data, rebalancing, dan transaksi lintas shard (penalaran) | Server dan keahlian baru, ledger keluar dari PostgreSQL (penalaran) | Pekerjaan retensi tidak berkurang (penalaran) | Job bulanan, uji pasang kembali, dan penjaga TRUNCATE |",
  "| Bukti | Rekaman lab `snapshot.txt` bagian A dan `lepas.txt` bagian B | Tidak dijalankan: dibahas di [[t5-adr-60]] | Tidak dijalankan: TigerBeetle hanya disebut | Tidak dijalankan: definisi di dokumentasi PostgreSQL 17 | Rekaman lab `pruning.txt`, `lepas.txt`, `pasang.txt`, `snapshot.txt` |",
  "**Keputusan: opsi E.** Delapan aturan:",
  "1. `posting` dipartisi `RANGE (dibuat)` per bulan dengan PRIMARY KEY `(id, dibuat)`. Keunikan `id` dijaga sequence, dan INSERT yang menyebut `id` sendiri diuji.",
  "2. Partisi bulan depan dibuat sebelum bulannya mulai, oleh job sendiri yang memanggil fungsi seperti `buat_partisi_posting`, atau oleh pg_partman (hanya disebut). Penjadwalnya belum ada di lab (Tidak dijalankan).",
  "3. Tanpa partisi default, supaya `DETACH ... CONCURRENTLY` boleh dipakai.",
  "4. Snapshot saldo ditulis tiap akhir bulan per buku. Pemeriksaan harian membaca snapshot terakhir dan posting sesudahnya ([[t5-m43]]).",
  "5. Partisi yang lebih tua dari 13 bulan (Asumsi) dilepas dengan `DETACH ... CONCURRENTLY` di luar blok transaction, hanya sesudah snapshot bulannya ada dan cocok dengan hitungan langsung.",
  "6. Tabel yang dilepas diekspor, dipulihkan ke tabel baru, dan dibandingkan: 0 baris beda dan checksum sama. Enkripsi dan baris `arsip_partisi` mengikuti ADR 57 ([[t5-kms]]). Posting tidak pernah dihapus dengan DELETE.",
  "7. Tabel pulih dipasang dengan CHECK bawaan `jumlah <> 0` dan CHECK batas yang literalnya sama dengan `FOR VALUES`. Pemasangan diuji tiap kuartal (Asumsi desain).",
  "8. Jendela koreksi harus lebih pendek dari 13 bulan (Asumsi). Jurnal pembalik atas jurnal yang dilepas dijawab 409.",
  "**Belum diputuskan.** Tiga hal ini pertanyaan terbuka, bukan aturan. Pertama, hak atas tabel yang dilepas dicabut segera atau tidak, karena hanya hak yang menjaganya. Kedua, cara memasang penjaga TRUNCATE di partisi hasil ATTACH. Ketiga, nama dan pesan jawaban 409 bersama jendela koreksi yang belum ada di PRD v5.",
  "**Kenapa E, bukan A, B, C, atau D.**",
  "- **A ditolak** karena ledger menolak DELETE (23001), sehingga data lama tidak punya jalan keluar dari tabel, dan pemeriksaan membaca semua posting. Ukuran sendiri bukan masalah: 292 tahun sampai batas 32 TB ([[t5-m43]]).",
  "- **B ditolak untuk sekarang** karena M43 adalah pemeriksaan yang membaca terlalu banyak dan data lama yang harus keluar, bukan beban tulis. Transfer lintas shard juga tidak lagi satu transaction (penalaran). Sharding dibahas di [[t5-adr-60]], dan beban tulis satu primary belum terukur.",
  "- **C ditolak** karena ledger dan snapshot tetap di PostgreSQL, dan pemisahan itu tidak terekam. TigerBeetle hanya disebut (Tidak dijalankan).",
  "- **D ditolak** karena dokumentasi PostgreSQL 17 menulis tiap partisi hash menampung baris yang hash kuncinya dibagi modulus menghasilkan sisa tertentu. Satu bulan karena itu tersebar di semua partisi dan tidak bisa dilepas utuh (penalaran dari definisi, Tidak dijalankan).",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Partisi bulan depan belum ada saat bulan mulai, dan INSERT posting ditolak dengan 23514 (`pasang.txt` bagian D). Pencegahannya partisi dibuat dua bulan di depan, seperti migration, dengan alert bila partisi terjauh kurang dari dua bulan.",
  "2. Arsip tidak bisa dipasang kembali dengan cepat atau aman: ATTACH tanpa CHECK literal memindai seluruh tabel, dan penjaga TRUNCATE tidak ikut. Pencegahannya aturan 7: uji pasang tiap kuartal, dengan CHECK literal dan penjaga yang dipasang.",
  "3. Pemeriksaan atau pekerja koreksi menyentuh bulan yang sudah dilepas. Pemeriksaan tanpa snapshot menandai 10.061 dari 10.288 buku, dan jurnal pembalik dijawab 409. Pencegahannya aturan 5 dan 8: snapshot lebih dulu, jendela koreksi lebih pendek dari 13 bulan.",
  "**Kapan keputusan ini salah.**",
  "- Saat satu primary tidak menampung tulis 69,4 transaksi uang per detik (46,3 dengan dua transaksi; Hitungan atas Asumsi). Partisi tidak menambah kapasitas tulis, dan kapasitas satu primary belum terukur. Pilihan berikutnya sharding ([[t5-adr-60]]).",
  "- Saat partisi bulan depan belum ada ketika bulan mulai. Pembandingnya dua partisi di depan yang dibuat migration.",
  "- Saat query yang harus cepat tidak menyebut `dibuat`: ia membaca semua partisi, 14 dari 14 di rekaman. Jumlah partisi naik satu tiap bulan sampai yang lama dilepas, dan dokumentasi menulis terlalu banyak partisi memperpanjang waktu perencanaan query ([PostgreSQL 17, 5.12.6](https://www.postgresql.org/docs/17/ddl-partitioning.html), dibuka 2026-11-03).",
  "- Saat jendela koreksi lebih panjang dari 13 bulan (Asumsi).",
  "- Saat memasang kembali satu bulan terlalu lama: tanpa CHECK literal, ATTACH memindai tabel. Satu bulan di skala naskah 36,5 juta posting dan 9,1 GB (Hitungan atas Asumsi), dan waktu pindainya Tidak dijalankan.",
  "- Saat pemeriksaan atas `jurnal` melewati target pukul 06.00. Tabel `jurnal` 219 juta baris per tahun (146 juta dengan dua transaksi; Hitungan atas Asumsi) dipartisi dengan aturan yang sama.",
  "**Yang akan merevisinya.** [[t5-kms]] menambah enkripsi arsip dan membuat pemulihan bergantung pada KMS. [[t5-adr-60]] mencatat pg_partman, partisi `jurnal`, dan sharding sebagai hal yang sengaja belum dilakukan.",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |",
  "|---|---|---|",
  "| pg_partman | Fungsi 12 baris cukup di lab, dan ekstensi hanya disebut | Belum dijadwalkan |",
  "| Partisi `jurnal` | Tidak ada rekaman bahwa pemeriksaan membaca `jurnal` terlalu lama | Belum dijadwalkan |",
  "| Memindahkan baris lama dari satu partisi ke partisi bulanan di database berisi | Lab memuat riwayat langsung ke partisi bulanan | Belum dijadwalkan |",
  "| Penjadwal bulanan untuk partisi baru dan job snapshot | Lab memanggil fungsi dan job dari skrip | Belum dijadwalkan |",
  "| Pemulihan arsip terenkripsi | Pemulihan di lab membaca CSV tanpa enkripsi | [[t5-kms]] |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** `PRIMARY KEY (id)` ditolak pada `posting` yang dipartisi menurut `dibuat`. Dengan kode apa, kenapa, dan apa akibatnya untuk `id`?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Ditolak dengan SQLSTATE 0A000, karena index yang membentuk constraint hanya menegakkan keunikan di dalam partisinya sendiri. PRIMARY KEY jadi `(id, dibuat)`, dan satu `id` muncul tiga kali di rekaman (`pruning.txt` bagian C). Keunikan `id` di lab datang dari sequence.",
  "</details>",
  "**2.** Kapan `DETACH PARTITION ... CONCURRENTLY` ditolak, dan apa yang tersisa pada tabel yang dilepas?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Di dalam blok transaction dijawab 25001, dan saat ada partisi default dijawab 55000. Tabel yang dilepas mendapat CHECK yang setara batas partisi dan kehilangan tiga trigger ledger baris demi baris. Role aplikasi ditolak 42501 karena hak (`lepas.txt` bagian C).",
  "</details>",
  "**3.** Tabel pulih dipasang dengan `ATTACH PARTITION` tanpa CHECK batas. Apa yang terjadi, dan bentuk CHECK mana yang membebaskan pemindaian?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "PostgreSQL memindai tabel dan memvalidasi foreign key. Hanya CHECK dengan batas literal yang sama dengan `FOR VALUES` membebaskan pemindaian batas, dan foreign key tetap divalidasi. Ekspresi, `NOT VALID`, dan batas atas yang lebih longgar tetap memindai (`pasang.txt` bagian A dan C).",
  "</details>",
  "**4.** Partisi dipasang dan pemeriksaan malam membaca satu bulan. Apakah itu menambah kapasitas tulis satu primary?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tidak. Partisi memangkas bacaan dan memudahkan retensi, tetapi tidak menambah kapasitas tulis, dan lab tidak mengklaimnya (README lab). Kapasitas tulis 69,4 transaksi uang per detik belum terukur, dan pilihan berikutnya sharding ([[t5-adr-60]]).",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] PRIMARY KEY dan UNIQUE atas tabel berpartisi memuat kolom kunci, dan kolom lain yang harus unik dijaga dan diuji dengan INSERT.",
  "- [ ] Partisi bulan depan dibuat sebelum bulannya mulai, dan INSERT diuji untuk bulan yang belum punya partisi.",
  "- [ ] Tidak ada partisi default bila `DETACH ... CONCURRENTLY` dipakai, dan DETACH tidak dijalankan di dalam blok transaction.",
  "- [ ] Snapshot bulan yang dilepas sudah ada dan cocok sebelum DETACH.",
  "- [ ] Tabel yang dilepas diperiksa: trigger, CHECK, dan hak akses.",
  "- [ ] Tabel pulih membawa CHECK bawaan dan CHECK batas literal, dan penjaga TRUNCATE dipasang.",
  "- [ ] Query yang harus cepat memuat kolom kunci partisi.",
  "### Bacaan lanjut",
  "- [PostgreSQL 17: Table Partitioning](https://www.postgresql.org/docs/17/ddl-partitioning.html)",
  "- [PostgreSQL 17: ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html)",
  "- [pg_partman](https://github.com/pgpartman/pg_partman)",
  "- [Knex: Schema Builder](https://knexjs.org/guide/schema-builder.html)",
  "- [Laravel 13.x: Migrations](https://laravel.com/docs/13.x/migrations)",
  "- [Django 5.2: Composite primary keys](https://docs.djangoproject.com/en/5.2/topics/composite-primary-key/)",
  "- [Serverpod: Migrations](https://docs.serverpod.dev/concepts/data-and-the-database/database/migrations)",
  "- [Supabase: Partitioning tables](https://supabase.com/docs/guides/database/partitions)",
  "</Blok>",
  "<SkripLama daftar={[\"runsql-core\",\"runsql\"]} />",
];
