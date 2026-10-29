// 4.9 Rekonsiliasi dengan gateway: widget runsql t4-rekonsiliasi (Simulasi, SQLite di browser) menghasilkan insiden yang sama
// dengan rekaman rekon.txt bagian B. Angka diturunkan dari rekaman dan skrip lab, bukan ditulis sendiri.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const s = require(path.join(ROOT, "situs/lama/widgets/data/t4-rekonsiliasi.json"));
const rekon = fs.readFileSync(path.join(ROOT, "labs/t4-webhook/output/rekon.txt"), "utf8").split("\n");
const runPy = fs.readFileSync(path.join(ROOT, "labs/t4-webhook/run.py"), "utf8");
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });
const baris = (out) => out.table.values.map((r) => r.join("|"));

// Insiden bagian B rekaman: baris tabel pertama sesudah "-rekon <tanggal>" di bagian B (jenis | selisih | status | ...).
function insidenRekaman() {
  const b = rekon.findIndex((l) => l.startsWith("# --- B. "));
  const mulai = rekon.findIndex((l, i) => i > b && l.startsWith(" jenis "));
  const out = [];
  for (let i = mulai + 2; rekon[i].startsWith(" "); i++) {
    const k = rekon[i].split("|").map((x) => x.trim());
    out.push(`${k[0]}|${k[1]}`);
  }
  return out;
}
// Jumlah tiap order di skrip lab, bagian B: buat_topup(<akun>, <jumlah>) dan gateway_bayar(..., jumlah=...).
function jumlahLab() {
  const b = runPy.slice(runPy.indexOf('bagian("B. Rekonsiliasi harian'), runPy.indexOf('bagian("C. Dua job bersamaan'));
  const ambil = (nama) => Number(b.match(new RegExp(`${nama} = buat_topup\\((\\w+), ([\\d_]+)\\)`))[2].replace(/_/g, ""));
  return { t1: ambil("t1"), t2a: ambil("t2a"), t2b: ambil("t2b"), t3: ambil("t3"), t3Gateway: Number(b.match(/gateway_bayar\(t3\["order_id"\], jumlah=([\d_]+)\)/)[1].replace(/_/g, "")), t4: ambil("t4"), t5: ambil("t5") };
}

test("4.9 runsql: panel After menghasilkan insiden yang sama dengan rekon.txt bagian B (jenis dan selisih)", () => {
  const out = core.runPanel(SQL, s, "after", []);
  assert.ok(out.log.every((l) => l.ok));
  const insiden = out.table.values.filter((r) => /^insiden \d+: /.test(r[0]));
  const dariWidget = insiden.map((r) => `${r[0].match(/^insiden \d+: (\w+) /)[1]}|${r[1]}`);
  const dariRekaman = insidenRekaman();
  assert.equal(dariRekaman.length, 5);
  assert.deepEqual([...dariWidget].sort(), [...dariRekaman].sort());
  assert.equal(out.table.values.find((r) => r[0] === "insiden bernomor")[1], dariRekaman.length);
});

test("4.9 runsql: data widget memakai jumlah yang sama dengan skrip lab (budi-1, dina-2, budi-2, budi-3, eko-1)", () => {
  const j = jumlahLab();
  const setup = s.setup;
  const laporan = (id) => Number(setup.match(new RegExp(`INSERT INTO laporan VALUES[^;]*\\('${id}', '\\w+', (\\d+)\\)`))[1]);
  const jurnal = (id) => Number(setup.match(new RegExp(`INSERT INTO jurnal_topup VALUES[^;]*\\('${id}', '\\w+', (\\d+)\\)`))[1]);
  assert.equal(laporan("budi-1"), j.t1);
  assert.equal(laporan("dina-2"), j.t2b);
  assert.equal(jurnal("dina-1"), j.t2a);
  assert.equal(laporan("budi-2"), j.t3Gateway);
  assert.equal(jurnal("budi-2"), j.t3);
  assert.equal(jurnal("budi-3"), j.t4);
  assert.equal(laporan("budi-3"), j.t4);
  assert.equal(jurnal("eko-1"), j.t5);
  assert.equal(laporan("citra-1"), jurnal("citra-1"));
  // order Citra memakai jumlah bagian A rekaman: top-up Rp500.000
  assert.equal(laporan("citra-1"), Number(runPy.match(/ct = buat_topup\(citra, ([\d_]+)\)/)[1].replace(/_/g, "")));
  assert.match(setup, /\('budi-3', 'lain', /); // settlement tanggal lain, seperti gateway_bayar(t4, tanggal=...)
  assert.match(runPy, /gateway_bayar\(t4\["order_id"\], tanggal="2020-01-01"\)/);
  assert.ok(!/eko-1/.test(setup.match(/INSERT INTO laporan VALUES[^;]*;/)[0])); // t5 dibatalkan gateway: tidak di laporan
});

test("4.9 runsql: Before hanya melihat dua total (660.000 lawan 650.000), dan total berselisih sama dengan jumlah semua insiden", () => {
  const before = core.runPanel(SQL, s, "before", []);
  assert.deepEqual(baris(before), ["total laporan gateway|660000", "total jurnal di ledger|650000", "selisih total|10000", "insiden bernomor|0"]);
  const after = core.runPanel(SQL, s, "after", []);
  const jumlah = after.table.values.filter((r) => /^insiden \d+: /.test(r[0])).reduce((a, r) => a + r[1], 0);
  assert.equal(jumlah, 10000);
  assert.equal(s.predict.options[s.predict.answer].slice(0, 9), "5 insiden");
  assert.notEqual(s.predict.answer, 0); // posisi jawaban benar tidak di pilihan pertama
  assert.notEqual(s.predict.answer, s.predict.options.length - 1);
});

test("4.9 runsql: Ubah satu hal memindahkan settlement budi-3 ke hari rekon, jadi insiden tidak_di_gateway -40.000 hilang dan selisih total 50.000", () => {
  const after = core.runPanel(SQL, s, "after", s.toggles);
  assert.ok(after.log.every((l) => l.ok));
  assert.deepEqual(baris(after), [
    "total laporan gateway|700000", "total jurnal di ledger|650000", "selisih total|50000", "insiden bernomor|4",
    "insiden 1: tidak_di_ledger budi-1|15000", "insiden 2: tidak_di_ledger dina-2|60000", "insiden 3: jumlah_beda budi-2|5000", "insiden 4: tidak_di_gateway eko-1|-30000",
  ]);
});
