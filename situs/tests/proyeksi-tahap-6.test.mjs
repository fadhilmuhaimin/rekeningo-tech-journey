// Tahap 6 di sidebar lewat `proyeksi` registry, bukan `tahap` (keputusan 1760, 1761). Tahap 6 tanpa lab dan tanpa asumsi,
// jadi entri `tahap[5]` dihindari (ia memaksa `asumsi`, membalik keputusan 1800, dan menyentuh tes lima tahap). Bagian
// pertama memakai registry buatan supaya tiap syarat bisa dimutasi sendiri-sendiri; bagian kedua memakai cerita.json
// sungguhan, dengan naskah `plan/CERITA-TAHAP-6.md` sebagai sumber nama bagian.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { muat, urutanBaca, tetangga, ROOT } from "../tools/registri.mjs";
import { sidebar } from "../tools/sidebar.mjs";

const baca = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const d = muat();
const grup = (out, awal) => out.find((g) => g.label.startsWith(awal));
const bagianT6 = d.proyeksi[0].bagian;
const t6 = d.halaman.filter((x) => x.tahap === 6);
const halamanT6 = t6.filter((x) => !/^T\d$/.test(x.id));

test("proyeksi: Tahap 6 hanya di `proyeksi`, tidak di `tahap` (tanpa asumsi, keputusan 1800)", () => {
  assert.deepEqual(d.tahap.map((t) => t.no), [1, 2, 3, 4, 5]);
  assert.deepEqual(d.proyeksi.map((t) => t.no), [6]);
  assert.equal(d.proyeksi[0].asumsi, undefined);
});

test("sidebar: grup Tahap 6 ada sesudah Tahap 5 dan sebelum studi sampingan, bernama dari `proyeksi`", () => {
  const out = sidebar();
  const label = out.map((g) => g.label);
  const i = label.findIndex((l) => l.startsWith("Tahap 6"));
  assert.ok(i > 0, `grup Tahap 6 tidak ada: ${label.join(" | ")}`);
  assert.equal(label[i], `Tahap ${d.proyeksi[0].no} · ${d.proyeksi[0].nama}`);
  assert.ok(label[i - 1].startsWith("Tahap 5"), `sebelum Tahap 6: ${label[i - 1]}`);
  assert.equal(label[i + 1], "Studi sampingan");
  assert.equal(label.filter((l) => l.startsWith("Tahap 6")).length, 1);
});

test("sidebar: halaman Tahap 6 dikelompokkan per bagian naskah, urut registry, dan halaman Cerita di luar kelompok", () => {
  const g = grup(sidebar(), "Tahap 6");
  const subgrup = g.items.filter((x) => x.items);
  const namaBagian = (no) => bagianT6.find((b) => b.no === no).nama;
  const harus = [...new Set(halamanT6.map((x) => x.bagian))].map((no) => [namaBagian(no), halamanT6.filter((x) => x.bagian === no).length]);
  assert.deepEqual(subgrup.map((x) => [x.label, x.items.length]), harus);
  assert.equal(subgrup.reduce((n, x) => n + x.items.length, 0), halamanT6.length, "setiap halaman Tahap 6 ada tepat sekali");
  const cerita = g.items.filter((x) => !x.items);
  assert.deepEqual(cerita.map((x) => x.link), ["/cerita/tahap-6/"]);
  assert.ok(subgrup.every((x) => x.collapsed === true), "semua subgrup terlipat (keputusan 202)");
  // Grup tahap juga terlipat (mutan tinjauan: collapsed false di grupTahap lolos semua tes): Tahap 1 sampai 6 sama.
  const tahapGrup = sidebar().filter((x) => /^Tahap \d/.test(x.label));
  assert.equal(tahapGrup.length, d.tahap.length + d.proyeksi.length);
  assert.ok(tahapGrup.every((x) => x.collapsed === true), "grup Tahap 1 sampai 6 terlipat (keputusan 202)");
});

test("sidebar: halaman Cerita Tahap 6 tidak bertanda versi lama; T5 yang penggantinya ada tetap bertanda (kontrol)", () => {
  const out = sidebar();
  const t6c = grup(out, "Tahap 6").items.find((x) => x.link === "/cerita/tahap-6/");
  assert.equal(t6c.badge, undefined, "halaman baru dari naskah bukan versi lama");
  assert.equal(t6c.attrs.title, undefined);
  assert.ok(!String(t6c.attrs["data-nav"] ?? "").includes("lama"));
  const t5c = grup(out, "Tahap 5").items.find((x) => x.link === "/cerita/tahap-5/");
  assert.equal(t5c.badge.text, "versi lama");
  assert.match(t5c.attrs.title, /^Versi lama; digantikan /);
});

test("sidebar: halaman Tahap 6 yang belum ada bertanda segera dan tanpa tautan ke 404 lewat badge", () => {
  const g = grup(sidebar(), "Tahap 6");
  for (const x of g.items.flatMap((y) => y.items ?? [])) {
    const hal = halamanT6.find((p) => x.link === `/${p.path.slice(0, -3)}/`);
    assert.ok(hal, x.link);
    assert.equal(!!x.badge, !hal.ada, `${hal.id}: badge segera hanya bila belum ada`);
    if (!hal.ada) assert.equal(x.badge.text, "segera");
  }
});

test("registry: nama bagian proyeksi cocok dengan heading naskah, dan setiap halaman Tahap 6 memakai bagian yang dikenal", () => {
  const naskah = baca(d.proyeksi[0].naskah);
  const heading = [...naskah.matchAll(/^## (\d[a-z]?)\. (.+)$/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(heading.map(([n]) => n), bagianT6.map((b) => String(b.no)), "nomor bagian sama dengan heading naskah");
  const kata = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((k) => k.length > 2);
  for (const [no, judul] of heading) {
    const nama = bagianT6.find((b) => String(b.no) === no).nama;
    const sisa = kata(nama).filter((k) => !kata(judul).includes(k));
    assert.deepEqual(sisa, [], `bagian ${no} "${nama}" memuat kata yang tak ada di heading naskah "${judul}"`);
  }
  for (const x of t6) assert.ok(bagianT6.some((b) => b.no === x.bagian), `${x.id}: bagian ${x.bagian}`);
});

test("urutan baca: Tahap 6 belum atau sudah di urutan baca, dan halaman Cerita-nya tidak pernah menyela jembatan 5.32 ke 6.1", () => {
  const urut = urutanBaca(d);
  const urut6 = urut.filter((x) => x.tahap === 6);
  const t6c = d.halaman.find((x) => x.id === "T6");
  const sesudah532 = tetangga(d, d.halaman.find((x) => x.id === "t5-jembatan")).next;
  const prd = d.halaman.find((x) => x.id === "t6-prd");
  if (urut6.length === 0) {
    // Keadaan sekarang: Tahap 6 masuk `URUT_BACA` hanya lewat tugas 6.1 (keputusan 1805), jadi T6 tidak punya tetangga.
    assert.deepEqual(tetangga(d, t6c), { prev: null, next: null });
    assert.notEqual(sesudah532?.tahap, 6, "5.32 baru menuju 6.1 lewat tugas 6.1");
  } else {
    // Sesudah 6.1: T6 (diganti_oleh t6-prd) dilewati bila 6.1 ada, dan Berikutnya dari T6 dan dari 5.32 adalah 6.1.
    assert.equal(urut6.some((x) => x.id === "T6"), !prd.ada, "T6 di urutan baca tepat bila 6.1 belum ada");
    if (prd.ada) {
      assert.equal(tetangga(d, t6c).next.id, "t6-prd");
      assert.equal(sesudah532.id, "t6-prd", "Berikutnya 5.32 adalah 6.1, bukan halaman Cerita");
    }
  }
});

test("registry: T6 mengikuti pola T5 (Cerita tahap, diganti oleh PRD tahapnya) dan ada tepat sekali", () => {
  const t6c = d.halaman.filter((x) => x.id === "T6");
  assert.equal(t6c.length, 1);
  const t5c = d.halaman.find((x) => x.id === "T5");
  const { id: _i, judul: _j, tahap: _t, path: _p, ada: _a, menit: _m, diganti_oleh: dg5, ...sisa5 } = t5c;
  const { id: _i6, judul: _j6, tahap: _t6, path: _p6, ada: _a6, menit: _m6, diganti_oleh: dg6, ...sisa6 } = t6c[0];
  assert.deepEqual(sisa6, sisa5, "kunci lain (bagian) sama dengan T5");
  assert.equal(dg6, "t6-prd");
  assert.equal(dg5, "t5-prd");
  assert.equal(t6c[0].path, "cerita/tahap-6.md");
  assert.equal(t6c[0].judul, "Tahap 6 · Ceritanya");
  assert.equal(t6c[0].ada, true);
  const idx = (x) => d.halaman.findIndex((p) => p.id === x);
  assert.ok(idx("T6") > idx("t6-penutup"), "T6 sesudah halaman Tahap 6 terakhir, seperti T5 sesudah t5-jembatan");
});
