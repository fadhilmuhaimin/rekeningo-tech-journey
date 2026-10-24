// 2.17 Index dan query plan (keputusan 800): rencana query widget runsql t2-index sama dengan teks halaman dan tebakan.
// Planner SQLite berbeda dari PostgreSQL; yang dijaga di sini hanya apa yang halaman tulis tentang widget (Ilustrasi).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const s = require(path.join(ROOT, "situs/lama/widgets/data/t2-index.json"));
const halaman = fs.readFileSync(path.join(ROOT, "situs/src/content/docs/tahap-2/index-query-plan.mdx"), "utf8");
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });

// Satu hasil EXPLAIN QUERY PLAN berbentuk "id, parent, notused, detail; ..."; hanya detail yang dibandingkan
// (angka id dan notused berubah antar versi SQLite).
const detail = (entry) => entry.result.split("; ").map((r) => r.split(", ").slice(3).join(", "));
const rencana = (out) => out.log.filter((l) => /^EXPLAIN QUERY PLAN/.test(l.sql)).map(detail);

const TANPA_INDEX = [["SCAN posting", "USE TEMP B-TREE FOR ORDER BY"], ["SCAN posting", "USE TEMP B-TREE FOR ORDER BY"]];

test("2.17 index: data buatan 100.000 baris di 1.000 buku, 100 baris per buku, sama dengan teks halaman", () => {
  const db = new SQL.Database();
  db.run(s.setup);
  const [[jumlah, buku, budi]] = db.exec("SELECT count(*), count(DISTINCT buku_id), sum(buku_id = 20) FROM posting")[0].values;
  assert.deepEqual([jumlah, buku, budi], [100000, 1000, 100]);
  db.close();
  assert.ok(halaman.includes("100.000 baris buatan di 1.000 buku"));
  assert.ok(halaman.includes("(Ilustrasi)"));
});

test("2.17 index: Before memindai seluruh tabel lalu mengurutkan, untuk riwayat Budi dan satu hari semua buku", () => {
  const out = core.runPanel(SQL, s, "before", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.deepEqual(rencana(out), TANPA_INDEX);
  assert.ok(halaman.includes("`SCAN posting` dan `USE TEMP B-TREE FOR ORDER BY`"));
});

test("2.17 index: After membuat riwayat Budi SEARCH tanpa langkah mengurutkan, query satu hari semua buku tidak berubah", () => {
  const out = core.runPanel(SQL, s, "after", []);
  assert.ok(out.log.every((l) => l.ok));
  const [budi, hari] = rencana(out);
  assert.deepEqual(budi, ["SEARCH posting USING INDEX posting_riwayat (buku_id=?)"]);
  assert.deepEqual(hari, TANPA_INDEX[1]);
  assert.ok(halaman.includes("`SEARCH posting USING INDEX posting_riwayat (buku_id=?)`"));
  assert.equal(s.predict.options[s.predict.answer], "Keduanya");
  assert.equal(out.table.values.length, 1);
  assert.equal(out.table.values[0][1], "CREATE INDEX posting_riwayat ON posting (buku_id, dibuat, id)");
});

test("2.17 index: ubah satu hal (buku_id kolom terakhir) membalik query mana yang terlayani, Before tidak berubah", () => {
  const out = core.runPanel(SQL, s, "after", s.toggles);
  assert.ok(out.log.every((l) => l.ok));
  const [budi, hari] = rencana(out);
  assert.deepEqual(budi, ["SCAN posting USING INDEX posting_riwayat"]);
  assert.equal(hari.length, 1);
  assert.match(hari[0], /^SEARCH posting USING INDEX posting_riwayat \(dibuat>\? AND dibuat<\?\)$/);
  assert.equal(out.table.values[0][1], "CREATE INDEX posting_riwayat ON posting (dibuat, id, buku_id)");
  assert.deepEqual(rencana(core.runPanel(SQL, s, "before", s.toggles)), TANPA_INDEX);
  assert.ok(halaman.includes("`SCAN posting USING INDEX`"));
});
