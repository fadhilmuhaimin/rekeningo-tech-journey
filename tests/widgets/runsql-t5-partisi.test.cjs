// 5.11 Partisi tabel ledger: widget runsql t5-partisi (Simulasi, SQLite di browser). Yang dijaga: data buatan 12 bulan × 10.000 baris,
// rencana dan hitungan baris tiap panel, pasangan Ubah satu hal, tebakan, dan kalimat halaman yang menyebut hasilnya.
// Planner SQLite berbeda dari PostgreSQL: angka PostgreSQL (14 dari 14 partisi) diturunkan dari rekaman pruning.txt, bukan dari widget.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const s = require(path.join(ROOT, "situs/lama/widgets/data/t5-partisi.json"));
const halaman = fs.readFileSync(path.join(ROOT, "situs/src/content/docs/tahap-5/partisi-snapshot.mdx"), "utf8");
const pruning = fs.readFileSync(path.join(ROOT, "labs/t5-partisi/output/pruning.txt"), "utf8");
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });

const BULAN = 12, PER_BULAN = 10000, TOTAL = BULAN * PER_BULAN;
const detail = (entry) => entry.result.split("; ").map((r) => r.split(", ").slice(3).join(", "));
const langkah = (out, awalan) => out.log.find((l) => l.sql.includes(awalan));
const hitung = (out) => out.log.filter((l) => /^SELECT .*count/.test(l.sql)).map((l) => Number(l.result));

test("5.11 runsql: Before berisi 120.000 baris di satu tabel, 10.000 per bulan", () => {
  const db = new SQL.Database();
  db.run(s.setup);
  const [[jumlah]] = db.exec("SELECT count(*) FROM posting")[0].values;
  assert.equal(jumlah, TOTAL);
  const perBulan = db.exec("SELECT substr(dibuat, 1, 7), count(*) FROM posting GROUP BY 1 ORDER BY 1")[0].values;
  assert.equal(perBulan.length, BULAN);
  assert.ok(perBulan.every(([, n]) => n === PER_BULAN));
  assert.equal(perBulan[0][0], "2026-01");
  assert.equal(perBulan[BULAN - 1][0], "2026-12");
  const [[pk]] = db.exec("SELECT count(*) FROM pragma_table_info('posting') WHERE pk > 0")[0].values;
  assert.equal(pk, 2, "PRIMARY KEY memuat id dan dibuat");
  db.close();
  assert.ok(halaman.includes("12 bulan × 10.000 = 120.000 baris buatan (Ilustrasi)"));
});

test("5.11 runsql: After berisi 12 tabel bulanan masing-masing 10.000 baris, bulan sesuai nama tabel", () => {
  const db = new SQL.Database();
  db.run(s.panels.after.setup);
  const tabel = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")[0].values.map((r) => r[0]);
  assert.deepEqual(tabel, Array.from({ length: BULAN }, (_, i) => `posting_${String(i + 1).padStart(2, "0")}`));
  for (const t of tabel) {
    const [[n, bulan]] = db.exec(`SELECT count(*), count(DISTINCT substr(dibuat, 1, 7)) FROM ${t}`)[0].values;
    assert.deepEqual([n, bulan], [PER_BULAN, 1], t);
    const [[b]] = db.exec(`SELECT substr(min(dibuat), 6, 2) FROM ${t}`)[0].values;
    assert.equal(`posting_${b}`, t);
  }
  const [[ids]] = db.exec(`SELECT count(DISTINCT id) FROM (${tabel.map((t) => `SELECT id FROM ${t}`).join(" UNION ALL ")})`)[0].values;
  assert.equal(ids, TOTAL, "id tidak bertabrakan antar tabel");
  db.close();
});

test("5.11 runsql: Before memindai tabel 120.000 baris, DELETE melaporkan 10000 baris, sisa 110.000", () => {
  const out = core.runPanel(SQL, s, "before", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.deepEqual(detail(langkah(out, "EXPLAIN QUERY PLAN")), ["SCAN posting"]);
  assert.deepEqual(hitung(out), [TOTAL, TOTAL - PER_BULAN]);
  assert.equal(langkah(out, "DELETE FROM posting").result, "10000 baris berubah");
  assert.deepEqual(out.table.values, [["posting"]]);
  assert.ok(halaman.includes("Panel Before menulis `SCAN posting`, dan tabel yang dipindai berisi 120.000 baris."));
  assert.ok(halaman.includes("`DELETE` di Before melaporkan 10000 baris berubah"));
});

test("5.11 runsql: After memindai posting_04 berisi 10.000 baris, DROP TABLE tidak melaporkan hitungan baris, sisa 110.000", () => {
  const out = core.runPanel(SQL, s, "after", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.deepEqual(detail(langkah(out, "EXPLAIN QUERY PLAN")), ["SCAN posting_04"]);
  assert.deepEqual(hitung(out), [PER_BULAN, TOTAL - PER_BULAN]);
  assert.equal(langkah(out, "DROP TABLE posting_01").result, "ok");
  assert.ok(!/baris berubah/.test(langkah(out, "DROP TABLE posting_01").result));
  assert.equal(out.table.values.length, BULAN - 1);
  assert.ok(!out.table.values.some((r) => r[0] === "posting_01"));
  assert.ok(halaman.includes("Panel After menulis `SCAN posting_04`, dan tabel yang dipindai berisi 10.000 baris."));
  assert.ok(halaman.includes("`DROP TABLE` di After tidak melaporkan hitungan baris"));
  assert.ok(halaman.includes("Kedua panel menyisakan 110.000 baris."));
});

test("5.11 runsql: Ubah satu hal membuat After memindai 12 tabel berisi 120.000 baris, Before tidak berubah", () => {
  assert.equal(s.toggles.length, 1);
  const out = core.runPanel(SQL, s, "after", s.toggles);
  assert.ok(out.log.every((l) => l.ok));
  const rencana = detail(langkah(out, "EXPLAIN QUERY PLAN"));
  const scan = rencana.filter((d) => /^SCAN posting_\d\d$/.test(d)).map((d) => d.slice(5));
  assert.deepEqual(scan, Array.from({ length: BULAN }, (_, i) => `posting_${String(i + 1).padStart(2, "0")}`));
  assert.equal(rencana.filter((d) => d === "UNION ALL").length, BULAN - 1);
  assert.deepEqual(hitung(out), [TOTAL, TOTAL - PER_BULAN]);
  const sebelum = core.runPanel(SQL, s, "before", []);
  const sesudah = core.runPanel(SQL, s, "before", s.toggles);
  assert.deepEqual(sesudah.log.map((l) => [l.sql, l.result]), sebelum.log.map((l) => [l.sql, l.result]));
  assert.ok(halaman.includes("Rencananya memuat `SCAN` atas `posting_01` sampai `posting_12`, dan tabel yang dipindai berisi 120.000 baris, sama dengan Before."));
});

test("5.11 runsql: tebakan menunjuk 120.000 di Before dan 10.000 di After, dan posisi jawaban bukan pilihan pertama atau terakhir", () => {
  const p = s.predict;
  assert.equal(p.options.length, 4);
  assert.equal(p.options[p.answer], "120.000 di Before dan 10.000 di After");
  assert.ok(p.answer > 0 && p.answer < p.options.length - 1);
  assert.ok(p.q.includes("Query bulan April menyebut posting di Before dan posting_04 di After."));
  assert.ok(p.explain.includes("SCAN posting memindai tabel berisi 120.000 baris"));
  // rentang satu bulan (April) sama di kedua panel, dan tabel Before tidak punya index pada dibuat: dasar kalimat penjelasan
  for (const panel of ["before", "after"]) assert.ok(s.panels[panel].steps[0].sql.includes("WHERE dibuat >= '2026-04-01' AND dibuat < '2026-05-01'"), panel);
  assert.ok(!/CREATE\s+(UNIQUE\s+)?INDEX/i.test(s.setup) && /PRIMARY KEY \(id, dibuat\)/.test(s.setup));
  assert.ok(p.explain.includes("karena tidak ada index pada dibuat"));
  assert.ok(p.explain.includes("SCAN posting_04 memindai tabel berisi 10.000 baris"));
});

test("5.11 runsql: yang dikatakan halaman tentang PostgreSQL berasal dari rekaman, bukan dari widget", () => {
  assert.ok(pruning.includes("# Dibaca: 14 dari 14 partisi: 12 partisi berisi dengan Parallel Seq Scan"));
  assert.ok(halaman.includes("Rekaman lab: query tanpa kondisi itu membaca 14 dari 14 partisi (`pruning.txt` bagian B)"));
  // jembatan widget ke PostgreSQL: query ubah-satu-hal di widget tetap memuat kondisi dibuat, jadi yang berubah adalah nama tabel, bukan kolom kunci
  assert.ok(halaman.includes("Di widget, satu tabel dibaca karena kamu menulis namanya."));
  let q = s.panels.after.steps[0].sql;
  for (const [dari, ke] of s.toggles[0].pairs) q = q.split(dari).join(ke);
  assert.ok(!q.includes("FROM posting_04 WHERE") && (q.match(/UNION ALL/g) || []).length === 11 && q.includes("WHERE dibuat >= '2026-04-01' AND dibuat < '2026-05-01'"));
  assert.ok(halaman.includes("Tabel di widget tidak dijaga trigger ledger, jadi `DELETE` di Before berjalan."));
  assert.ok(halaman.includes("**Simulasi** di halaman ini berarti SQL dijalankan oleh SQLite (sql.js 1.14.2)"));
  assert.ok(halaman.includes("hasilnya tidak pernah berlabel Rekaman lab"));
  assert.match(s.title, /\(SQLite, Simulasi\)$/);
  assert.equal(core.engineVersion(SQL).startsWith("SQLite "), true);
  assert.ok(halaman.includes('<WidgetLama nama="runsql" src="data/t5-partisi.json" />'));
});
