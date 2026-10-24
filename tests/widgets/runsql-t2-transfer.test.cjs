// 2.3 Fitur transfer (keputusan 656, 786): angka widget runsql t2-transfer sama dengan rekaman, tebakan, dan teks halaman.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const s = require(path.join(ROOT, "situs/lama/widgets/data/t2-transfer.json"));
const rekaman = fs.readFileSync(path.join(ROOT, "labs/api-t2/output/transfer.txt"), "utf8");
const halaman = fs.readFileSync(path.join(ROOT, "situs/src/content/docs/tahap-2/fitur-transfer.mdx"), "utf8");
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });
const baris = (out) => out.table.values.map((r) => r.join("|"));

// buku | saldo | dihitung_batas | sisa_batas
const TANPA_WARUNG = ["Budi|430000|500000|0", "Citra|250000|500000|0"];

test("2.3 transfer: nominal widget sama dengan rekaman transfer.txt A dan C", () => {
  assert.match(rekaman, /\{"id":1119,"saldo":410000,"sisa_batas_harian":480000\}/);
  assert.match(rekaman, /\{"id":1123,"saldo":405000,"sisa_batas_harian":0\}/);
  assert.match(rekaman, /'\{"ke": 418, "nominal": 25000\}'/);
});

test("2.3 transfer: Before tanpa bayar warung, kiriman Rp80.000 diterima dan sisa batas Rp0", () => {
  const out = core.runPanel(SQL, s, "before", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.deepEqual(baris(out), TANPA_WARUNG);
});

test("2.3 transfer: After dengan bayar warung Rp25.000 tetap diterima, sama dengan akhir rekaman C dan jawaban tebakan", () => {
  const out = core.runPanel(SQL, s, "after", []);
  assert.ok(out.log.every((l) => l.ok));
  assert.deepEqual(baris(out), ["Budi|405000|500000|0", "Citra|250000|500000|0"]);
  assert.equal(s.predict.options[s.predict.answer], "Diterima, sisa batas Budi Rp0");
});

test("2.3 transfer: ubah satu hal (bayar warung ikut dihitung) menolak kiriman di After, Before tidak berubah", () => {
  const out = core.runPanel(SQL, s, "after", s.toggles);
  const gagal = out.log.filter((l) => l.ok === false);
  assert.equal(gagal.length, 1);
  assert.match(gagal[0].sql, /^INSERT INTO posting VALUES \(6, 419, -80000\)/);
  assert.match(gagal[0].result, /422 batas-harian/);
  assert.deepEqual(baris(out), ["Budi|485000|445000|55000", "Citra|170000|500000|0"]);
  assert.ok(halaman.includes("Rp20.000 + Rp400.000 + Rp25.000 + Rp80.000 = Rp525.000"));
  assert.equal(445000 + 80000, 525000);
  assert.deepEqual(baris(core.runPanel(SQL, s, "before", s.toggles)), TANPA_WARUNG);
});
