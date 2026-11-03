// Semua skenario alur di situs/lama/widgets/data/skenario/: valid, dan angka saldo di skenario
// rekaman sama dengan file rekaman lab (aturan: angka saldo di skenario sama dengan rekaman).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const core = require(path.join(ROOT, "situs/lama/widgets/alur-core.js"));
const DIR = path.join(ROOT, "situs/lama/widgets/data/skenario");
const rupiah = (n) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\\.")}`;

for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const d = core.normalize(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
  test(`${f}: valid`, () => {
    assert.deepEqual(core.validate(d, { exists: (p) => fs.existsSync(path.join(ROOT, p)) }), []);
  });
  if (d.sumber.jenis !== "rekaman") continue;
  const cek = (varian, file) => {
    const list = core.steps(d, varian);
    const rekaman = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const p of d.perangkat) {
      const akhir = core.layarAt(d, list, list.length - 1, p.id);
      // Rekaman memuat saldo sebagai angka polos (JSON) atau sebagai rupiah bertitik ("Rp50.000", rekaman lab t5-cicilan).
      if (akhir && akhir.saldo != null) assert.match(rekaman, new RegExp(`\\b${akhir.saldo}\\b|${rupiah(akhir.saldo)}(?!\\d|\\.\\d)`),
        `${f}: saldo akhir ${akhir.saldo} (${varian ? "varian" : "utama"}) tidak ada di ${file}`);
    }
  };
  test(`${f}: saldo akhir jalur utama ada di rekaman`, () => cek(false, d.sumber.file));
  if (d.varian && d.sumber.fileVarian) test(`${f}: saldo akhir varian ada di rekaman`, () => cek(true, d.sumber.fileVarian));
}
