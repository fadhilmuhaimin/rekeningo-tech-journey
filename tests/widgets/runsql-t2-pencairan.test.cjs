// 2.5 Fitur pencairan (keputusan 620): angka widget runsql t2-pencairan sama dengan teks halaman dan tebakan.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const s = require(path.join(ROOT, "situs/lama/widgets/data/t2-pencairan.json"));
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });
const baris = (out) => out.table.values.map((r) => r.join("|"));

const SEKALI = [
  "Warung Ani|0|1|310000",
  "Warung Sari|0|1|185000",
  "Warung Mie Pak Joko|0|1|420000",
  "Warung 505|0|1|240000",
  "kas_pencairan (total)|1155000|4|1155000",
];

test("2.5 pencairan: satu jalan mencairkan 4 warung Rp1.155.000; ledger sama dengan file", () => {
  const out = core.runPanel(SQL, s, "before", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.equal(out.log[0].result, "4 warung dicairkan, Rp1.155.000");
  assert.deepEqual(baris(out), SEKALI);
});

test("2.5 pencairan: jalan kedua sesudah jalan pertama selesai tidak menulis apa-apa", () => {
  const out = core.runPanel(SQL, s, "after", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.equal(out.log[2].result, "0 warung dicairkan, Rp0");
  assert.deepEqual(baris(out), SEKALI);
  assert.equal(s.predict.options[s.predict.answer], "Rp1.155.000, sama dengan satu jalan");
});

test("2.5 pencairan: bayar Rp25.000 di antara dua jalan membuat Warung Ani dua baris di file, ledger tetap sama", () => {
  const out = core.runPanel(SQL, s, "after", s.toggles);
  assert.ok(out.log.every((l) => l.ok));
  assert.equal(out.log[2].result, "1 warung dicairkan, Rp25.000");
  assert.deepEqual(baris(out), [
    "Warung Ani|0|2|335000", SEKALI[1], SEKALI[2], SEKALI[3],
    "kas_pencairan (total)|1180000|5|1180000",
  ]);
  assert.deepEqual(baris(core.runPanel(SQL, s, "before", s.toggles)), SEKALI);
});
