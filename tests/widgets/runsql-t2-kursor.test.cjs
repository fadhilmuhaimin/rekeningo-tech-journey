// 2.19 Pagination kursor (keputusan 726): angka widget runsql t2-kursor sama dengan rekaman pagination.txt A dan halaman.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const VENDOR = path.join(ROOT, "situs/lama/vendor/sql.js-1.14.2");
const core = require(path.join(ROOT, "situs/lama/widgets/runsql-core.js"));
const initSqlJs = require(path.join(VENDOR, "sql-wasm.js"));
const s = require(path.join(ROOT, "situs/lama/widgets/data/t2-kursor.json"));
const rekaman = fs.readFileSync(path.join(ROOT, "labs/b2-query/output/ledger/pagination.txt"), "utf8");
const halaman = fs.readFileSync(path.join(ROOT, "situs/src/content/docs/tahap-2/pagination-kursor.mdx"), "utf8");
let SQL;
test.before(async () => { SQL = await initSqlJs({ locateFile: (f) => path.join(VENDOR, f) }); });
const baris = (out) => out.table.values.map((r) => r.join("|"));
const hasil = (out, i) => out.log[i].result;

// baris_di_layar | posting_berbeda | ganda | tidak_tampil
test("2.19 kursor: id, lawan, dan jumlah di setup widget sama dengan rekaman pagination.txt A", () => {
  const baru = [
    [760066, "Karyawan 961", 50000], [760028, "Karyawan 842", 50000], [759818, "Karyawan 1233", 50000],
    [759615, "Warung Ani", -8000], [759460, "Karyawan 1135", 50000], [759127, "Warung 509", -5000],
    [759027, "Warung 512", -15000], [758974, "Karyawan 1103", 25000], [758878, "Karyawan 1035", 50000],
  ];
  for (const [id, lawan, jumlah] of baru) {
    assert.ok(s.setup.includes(`(${id}, '${lawan}', ${jumlah}, '`), `setup memuat ${id}`);
    const arah = jumlah < 0 ? "keluar" : "masuk";
    const rp = "Rp" + String(Math.abs(jumlah)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const re = new RegExp(`\\s${id} \\|\\s+\\d+ \\|\\s+\\w+\\s*\\|\\s+${arah}\\s+\\|\\s+${lawan} *\\|\\s+${rp.replace(".", "\\.")}`);
    assert.match(rekaman, re, `rekaman memuat ${id} ${lawan} ${rp} ${arah}`);
  }
  assert.match(rekaman, /Dimas mengirim Rp5\.000 ke Budi: jurnal 380226\./);
  assert.match(rekaman, /760451 \| 380226 \| transfer \| masuk\s+\| Dimas\s+\| Rp5\.000/);
  assert.ok(s.panels.before.steps[1].sql.includes("760451, 'Dimas', 5000"));
});

test("2.19 kursor: Before (OFFSET) menampilkan 10 baris, 9 berbeda, 1 ganda, kiriman Dimas tidak tampil; sama dengan rekaman A", () => {
  const out = core.runPanel(SQL, s, "before", []);
  assert.ok(out.log.every((l) => l.ok), JSON.stringify(out.log.filter((l) => !l.ok)));
  assert.deepEqual(baris(out), ["10|9|1|1"]);
  assert.equal(hasil(out, 0), "760066; 760028; 759818; 759615; 759460");
  assert.equal(hasil(out, 2), "759460; 759127; 759027; 758974; 758878");
  assert.match(rekaman, /Di layar: 10 baris, 9 posting berbeda\. Kiriman Dimas \(jurnal 380226\) tidak ada di daftar\./);
});

test("2.19 kursor: After tanpa baris ganda dan kiriman Dimas tampil lewat tarik ke bawah", () => {
  const out = core.runPanel(SQL, s, "after", []);
  assert.ok(out.log.every((l) => l.ok), JSON.stringify(out.log.filter((l) => !l.ok)));
  assert.deepEqual(baris(out), ["10|10|0|0"]);
  assert.equal(hasil(out, 2), "759127; 759027; 758974; 758878");
  assert.equal(hasil(out, 3), "760451");
  assert.match(rekaman, /Di layar: 11 baris, 11 posting berbeda\. Kiriman Citra \(jurnal 380227\) ada\./);
});

test("2.19 kursor: jawaban tebakan = satu di OFFSET, tidak ada di kursor", () => {
  assert.equal(s.predict.options[s.predict.answer], "Satu di OFFSET, tidak ada di kursor");
  const o = baris(core.runPanel(SQL, s, "before", [])).map((r) => r.split("|").map(Number));
  const k = baris(core.runPanel(SQL, s, "after", [])).map((r) => r.split("|").map(Number));
  assert.equal(o[0][2], 1);
  assert.equal(k[0][2], 0);
});

test("2.19 kursor: ubah satu hal (COMMIT belakangan) tidak mengubah OFFSET; kursor tanpa ganda tetapi satu baris tidak tampil", () => {
  const sebelum = core.runPanel(SQL, s, "before", s.toggles);
  assert.ok(sebelum.log.every((l) => l.ok));
  assert.deepEqual(baris(sebelum), ["10|9|1|1"]);
  const sesudah = core.runPanel(SQL, s, "after", s.toggles);
  assert.ok(sesudah.log.every((l) => l.ok));
  assert.deepEqual(baris(sesudah), ["9|9|0|1"]);
  assert.equal(hasil(sesudah, 2), "759127; 759027; 758974; 758878");
  assert.equal(hasil(sesudah, 3), "0 baris berubah");
});

test("2.19 kursor: angka halaman sama dengan rekaman C dan D", () => {
  assert.match(rekaman, / OFFSET \|\s+205 \|\s+4098 \|\s+204 \|\s+0 \|\s+204 \|\s+204/);
  assert.match(rekaman, / kursor \|\s+205 \|\s+4302 \|\s+0 \|\s+0 \|\s+204 \|\s+0/);
  assert.equal(4098 - 204, 3894);
  assert.equal(3894 + 204, 4098);
  assert.equal(4098 + 204, 4302);
  assert.match(rekaman, /Buffers: shared hit=472/);
  assert.match(rekaman, /Buffers: shared hit=19/);
  assert.match(rekaman, /rows=1020 loops=1/);
  assert.match(rekaman, /ROW\(dibuat, id\) < ROW\(/);
  for (const angka of ["205 halaman", "4.098", "4.302", "1.020", "204 baris ganda"]) assert.ok(halaman.includes(angka), `halaman memuat ${angka}`);
});
