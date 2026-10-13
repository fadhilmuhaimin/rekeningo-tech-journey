// Konsistensi data cerita Rekeningo dan data stepper lintas stack.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

test("cerita.json: lima tahap berurutan, diagram maks 6 elemen", () => {
  const d = json("situs/data/cerita.json");
  assert.equal(d.app, "Rekeningo");
  assert.deepEqual(d.tahap.map((t) => t.no), [1, 2, 3, 4, 5]);
  for (const t of d.tahap) {
    const n = t.arsitektur.baris.reduce((s, b) => s + b.length, 0);
    assert.ok(n <= 6, `tahap ${t.no}: ${n} elemen`);
    assert.ok(t.rekap && t.sebelumnya && t.arsitektur.caption, `tahap ${t.no} lengkap`);
    const kalimat = t.rekap.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(kalimat <= 2, `tahap ${t.no}: rekap ${kalimat} kalimat`);
  }
});

// Tahap dengan naskah baru (plan/CERITA-TAHAP-N.md, keputusan 109) dicocokkan ke tabel skala naskah;
// tahap yang datanya masih versi lama (`versi: "lama"`, juga Tahap 2 yang daftar halamannya sudah dari naskah,
// keputusan 450) tetap ke heading plan/STORY.md.
test("cerita.json sama dengan naskah (rentang user per tahap)", () => {
  const story = read("plan/STORY.md");
  for (const t of json("situs/data/cerita.json").tahap) {
    if (t.naskah && t.versi !== "lama") {
      const baris = read(t.naskah).split("\n").find((l) => l.startsWith(`| ${t.no} |`));
      assert.ok(baris && baris.includes(`| ${t.user} |`), `${t.naskah}: baris Tahap ${t.no} memuat "${t.user}"`);
    } else {
      assert.ok(story.includes(`### Tahap ${t.no} · ${t.user}`), `heading Tahap ${t.no} · ${t.user}`);
    }
  }
});

// Ambil teks sumber: bagian bertanda --8<-- [start:x] di file lab, atau isi tab di halaman MDX
// (<TabSet labels={[...]}> lalu <Fragment slot="tN">, keputusan 103).
function source(spec, label) {
  if (spec.src && spec.md) return source({ src: spec.src }, label) + source({ md: spec.md }, label);
  if (spec.src) {
    const [file, section] = spec.src.split("#");
    const text = read(file);
    const m = text.match(new RegExp(`--8<-- \\[start:${section}\\]([\\s\\S]*?)--8<-- \\[end:${section}\\]`));
    assert.ok(m, `section ${section} di ${file}`);
    return m[1];
  }
  const md = read(spec.md);
  for (const m of md.matchAll(/<TabSet [^>]*labels=\{\[([^\]]*)\]\}>/g)) {
    const labels = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const i = labels.indexOf(label);
    if (i < 0) continue;
    const buka = md.indexOf(`<Fragment slot="t${i}">`, m.index);
    assert.ok(buka >= 0, `slot t${i} untuk tab "${label}" di ${spec.md}`);
    const tutup = md.indexOf("</Fragment>", buka);
    return md.slice(buka, tutup);
  }
  assert.fail(`tab "${label}" di ${spec.md}`);
}

for (const file of ["b3-1-stackstep.json", "b3-2-stackstep.json"]) {
  test(`${file}: setiap pola ada di kode yang ditampilkan`, () => {
    const cfg = json(`situs/lama/widgets/data/${file}`);
    const ids = cfg.langkah.map((l) => l.id);
    for (const [label, spec] of Object.entries(cfg.stack)) {
      const text = source(spec, label);
      for (const id of ids) {
        const pats = spec.pola[id] || [];
        if (!pats.length) assert.ok(spec.catatan && spec.catatan[id], `${label}/${id}: tanpa pola wajib ada catatan`);
        for (const p of pats) {
          assert.ok(text.includes(p), `${label}/${id}: pola "${p}" tidak ditemukan`);
          const lines = text.split("\n").filter((l) => l.includes(p));
          const komentar = (l) => /^\s*(\/\/|#|--)/.test(l);
          assert.ok(lines.some((l) => !komentar(l)), `${label}/${id}: pola "${p}" hanya cocok di komentar`);
          assert.ok(!lines.some(komentar), `${label}/${id}: pola "${p}" juga menyorot baris komentar`);
        }
      }
    }
  });
}
