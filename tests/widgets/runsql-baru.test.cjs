// Skenario Before/After SQL halaman baru: hasilnya sesuai teks di halaman dan di tebakan.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const load = (id) => require(path.join(ROOT, "situs/lama/widgets/data", id + ".json"));
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });
const baris = (out) => out.table.values.map((r) => r.join("|"));

test("B2.3: tanpa index SCAN + TEMP B-TREE, index komposit SEARCH, index dibuat saja SCAN USING INDEX", () => {
  const s = load("b2-3-index");
  const plan = (out) => out.log[out.log.length - 1].result;
  assert.match(plan(core.runPanel(SQL, s, "before", [])), /SCAN pesanan.*USE TEMP B-TREE/);
  assert.match(plan(core.runPanel(SQL, s, "after", [])), /SEARCH pesanan USING INDEX idx_riwayat \(toko_id=\?\)/);
  assert.match(plan(core.runPanel(SQL, s, "after", s.toggles)), /SCAN pesanan USING INDEX idx_riwayat/);
});

test("B2.4: Before 6 query, After 1 query, hasil item sama", () => {
  const s = load("b2-4-n1");
  const before = core.runPanel(SQL, s, "before", []);
  const after = core.runPanel(SQL, s, "after", []);
  assert.equal(before.log.filter((e) => e.ok).length, 6);
  assert.equal(after.log.filter((e) => e.ok).length, 1);
  assert.equal(after.log[0].result.split("; ").length, 9);
});

test("B1.3: OFFSET menampilkan 108 dua kali, cursor tidak", () => {
  const s = load("b1-3-pagination");
  const b = core.runPanel(SQL, s, "before", []);
  assert.equal(b.log[0].result, "110; 109; 108");
  assert.equal(b.log[2].result, "108; 107; 106");
  const a = core.runPanel(SQL, s, "after", []);
  assert.equal(a.log[3].result, "107; 106; 105");
});

test("1.8 top-up: tanpa transaction 2 dari 4 terisi; dengan transaction 0; CSV dibetulkan 4", () => {
  const s = load("t1-topup");
  const before = core.runPanel(SQL, s, "before", []);
  assert.match(before.log.find((x) => !x.ok).result, /CHECK constraint failed/);
  assert.deepEqual(baris(before).slice(-2), ["TOTAL|500000", "CATATAN TOP-UP|2"]);
  assert.equal(s.predict.options[s.predict.answer], "2 karyawan");
  assert.deepEqual(baris(core.runPanel(SQL, s, "after", [])).slice(-2), ["TOTAL|0", "CATATAN TOP-UP|0"]);
  for (const p of ["before", "after"]) assert.deepEqual(baris(core.runPanel(SQL, s, p, s.toggles)).slice(-2), ["TOTAL|1000000", "CATATAN TOP-UP|4"]);
});

test("1.10 laporan: tanggal UTC memindahkan sarapan ke hari lain; WIB sama dengan buku Ani", () => {
  const s = load("t1-laporan");
  assert.deepEqual(baris(core.runPanel(SQL, s, "before", [])), ["2026-10-06|1|15000", "2026-10-07|3|67000", "2026-10-08|2|65000"]);
  const wib = ["2026-10-07|3|70000", "2026-10-08|3|77000"];
  assert.deepEqual(baris(core.runPanel(SQL, s, "after", [])), wib);
  assert.equal(s.predict.options[s.predict.answer], "Rp67.000");
  for (const p of ["before", "after"]) assert.deepEqual(baris(core.runPanel(SQL, s, p, s.toggles)), wib);
});

test("1.12 relasi: tanpa FK pembayaran yatim, dengan FK DELETE ditolak, CASCADE menghapus catatan Budi", () => {
  const s = load("t1-relasi");
  assert.deepEqual(baris(core.runPanel(SQL, s, "before", [])), ["1|25000|(akun hilang)", "3|15000|Warung Sari"]);
  const after = core.runPanel(SQL, s, "after", []);
  assert.equal(after.log[1].ok, false);
  assert.match(after.log[1].result, /FOREIGN KEY/);
  assert.deepEqual(baris(after), ["1|25000|Warung Ani", "3|15000|Warung Sari"]);
  assert.deepEqual(baris(core.runPanel(SQL, s, "after", s.toggles)), ["3|15000|Warung Sari"]);
  assert.equal(s.predict.options[s.predict.answer], "Tetap ada, tapi penerimanya hilang");
});

test("1.14 M1: tanpa constraint minus lolos (Budi 255000, Ani -5000); dengan constraint ditolak dan dibatalkan", () => {
  const s = load("t1-m1");
  assert.deepEqual(baris(core.runPanel(SQL, s, "before", [])), ["Warung Ani|-5000", "Budi|255000", "BARIS TRANSAKSI|1"]);
  const after = core.runPanel(SQL, s, "after", []);
  assert.ok(after.log.some((l) => l.ok === false && /CHECK/.test(l.result)));
  assert.deepEqual(baris(after), ["Warung Ani|0", "Budi|250000", "BARIS TRANSAKSI|0"]);
  for (const p of ["before", "after"]) assert.deepEqual(baris(core.runPanel(SQL, s, p, s.toggles)), ["Warung Ani|5000", "Budi|245000", "BARIS TRANSAKSI|1"]);
  assert.equal(s.predict.options[s.predict.answer], "Rp255.000");
});

test("2.4 tutup buku: jurnal cocok semua; UPDATE saldo_cache langsung membuat Citra tidak cocok; akhir dari posting tidak menangkapnya", () => {
  const s = load("t2-tutup-buku");
  const cocok = ["Budi|180000|0|45000|135000|ya", "Warung Ani|0|25000|0|25000|ya"];
  const before = core.runPanel(SQL, s, "before", []);
  assert.ok(before.log.every((l) => l.ok));
  assert.equal(before.log[before.log.length - 1].result, "0");
  assert.deepEqual(baris(before), ["tunjangan|-180000|0|10000|-190000|ya", cocok[0], "Citra|0|30000|0|30000|ya", cocok[1]]);
  const after = core.runPanel(SQL, s, "after", []);
  assert.equal(after.log[after.log.length - 1].result, "0");
  assert.deepEqual(baris(after), ["tunjangan|-180000|0|0|-180000|ya", cocok[0], "Citra|0|20000|0|30000|TIDAK", cocok[1]]);
  assert.equal(s.predict.options[s.predict.answer], "Buku Citra tidak cocok, dan tidak ada jurnal yang tidak seimbang");
  assert.deepEqual(baris(core.runPanel(SQL, s, "after", s.toggles)), ["tunjangan|-180000|0|0|-180000|ya", cocok[0], "Citra|0|20000|0|20000|ya", cocok[1]]);
  assert.deepEqual(baris(core.runPanel(SQL, s, "before", s.toggles)), baris(before));
});
