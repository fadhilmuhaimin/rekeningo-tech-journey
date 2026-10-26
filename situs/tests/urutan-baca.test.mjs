// Urutan baca (EVAL2-F1, keputusan 1150, 1151): halaman lama yang penggantinya sudah ada dilewati; yang penggantinya
// masih "segera" tetap di urutan; halaman yang dilewati tidak hilang dari registry dan punya tetangga sendiri.
// Bagian pertama memakai registry buatan supaya tiap syarat bisa dimutasi sendiri-sendiri; bagian kedua memakai
// cerita.json sungguhan dan menjaga rantai Tahap 1 sampai Tahap 3 yang dilihat pembaca.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { muat, urutanBaca, penggantiAda, tetangga, byId, url, SITE_DOCS } from "../tools/registri.mjs";
import remarkRujukan from "../src/plugins/remark-rujukan.mjs";

const h = (id, tahap, lebih = {}) => ({ id, judul: `Halaman ${id}`, tahap, path: `x/${id}.md`, ada: true, ...lebih });
const id = (a) => a.map((x) => x.id);

// Tahap 1: a1 a2. Tahap 2: b1 b2, pembuka tahap T (diganti b1), L1 (lama, diganti b2 yang ada), L2 (lama, penggantinya
// s1 masih segera). Tahap 3: C (pembuka, diganti t3 yang masih segera), t3 (segera).
const buat = () => ({
  halaman: [
    h("a1", 1), h("a2", 1),
    h("b1", 2), h("b2", 2),
    h("T", 2, { diganti_oleh: "b1" }),
    h("L1", 2, { lama: true, lebur_ke: "b2" }),
    h("L2", 2, { lama: true, lebur_ke: "s1" }),
    h("C", 3, { diganti_oleh: "t3" }),
    h("t3", 3, { ada: false }),
    h("s1", 3, { ada: false }),
  ],
});

test("halaman yang penggantinya ada tidak masuk urutan baca, lama dan pembuka tahap sama-sama", () => {
  const u = id(urutanBaca(buat()));
  assert.ok(!u.includes("L1"), "L1 (lebur_ke b2 yang ada) harus dilewati");
  assert.ok(!u.includes("T"), "T (diganti_oleh b1 yang ada) harus dilewati");
});

test("halaman lama yang penggantinya masih segera tetap di urutan baca", () => {
  const u = id(urutanBaca(buat()));
  assert.ok(u.includes("L2"), "L2 (lebur_ke s1 yang belum ada) harus tetap");
  assert.ok(u.includes("C"), "C (diganti_oleh t3 yang belum ada) harus tetap");
  assert.deepEqual(u, ["a1", "a2", "b1", "b2", "L2", "C"]);
});

test("penggantinya baru ada: halaman lama ikut keluar dari urutan, tidak perlu mengubah halaman itu", () => {
  const d = buat();
  d.halaman.find((x) => x.id === "s1").ada = true;
  assert.deepEqual(id(urutanBaca(d)), ["a1", "a2", "b1", "b2", "C", "s1"]);
});

test("penggantinya diperiksa lewat ada, bukan lewat keberadaan id di registry", () => {
  const d = buat();
  assert.equal(penggantiAda(d.halaman.find((x) => x.id === "L2"), byId(d)), null);
  assert.equal(penggantiAda(d.halaman.find((x) => x.id === "L1"), byId(d)).id, "b2");
});

test("lebur_ke ke id yang tidak ada tidak menghilangkan halaman", () => {
  const d = buat();
  d.halaman.push(h("Y", 2, { lama: true, lebur_ke: "tidak-ada" }));
  assert.ok(id(urutanBaca(d)).includes("Y"));
});

test("rantai pengganti diikuti sampai ujung yang ada; siklus tidak menghilangkan halaman", () => {
  const d = { halaman: [h("a", 1), h("X", 2, { lebur_ke: "Y" }), h("Y", 2, { lebur_ke: "Z" }), h("Z", 2)] };
  assert.deepEqual(id(urutanBaca(d)), ["a", "Z"]);
  assert.equal(tetangga(d, d.halaman[1]).next.id, "Z", "X duduk sebelum Z, bukan sebelum Y yang juga dilewati");
  const s = { halaman: [h("P", 2, { lebur_ke: "Q" }), h("Q", 2, { lebur_ke: "P" })] };
  assert.deepEqual(id(urutanBaca(s)), ["P", "Q"], "siklus: keduanya tetap, tidak ada yang hilang");
});

test("halaman yang dilewati duduk tepat sebelum penggantinya: Berikutnya ke pengganti, Sebelumnya ke depan pengganti", () => {
  const d = buat();
  const t = (x) => { const r = tetangga(d, d.halaman.find((p) => p.id === x)); return [r.prev?.id ?? null, r.next?.id ?? null]; };
  assert.deepEqual(t("L1"), ["b1", "b2"]);
  assert.deepEqual(t("T"), ["a2", "b1"]);
  assert.deepEqual(t("b2"), ["b1", "L2"], "halaman di urutan: tetangga urutan biasa");
  assert.deepEqual(t("a1"), [null, "a2"]);
  assert.deepEqual(t("C"), ["L2", null]);
});

test("halaman di luar urutan (belum ada, alat, tidak dikenal) tidak punya tetangga", () => {
  const d = buat();
  d.halaman.push(h("alat1", "alat"));
  for (const x of ["t3", "alat1"]) assert.deepEqual(tetangga(d, d.halaman.find((p) => p.id === x)), { prev: null, next: null });
  assert.deepEqual(tetangga(d, undefined), { prev: null, next: null });
});

// ---- cerita.json sungguhan ----------------------------------------------------------------------

const d = muat();
const by = byId(d);
const urut = urutanBaca(d);
const digantiAda = (x) => [x.lebur_ke, x.diganti_oleh].some((k) => k && by[k]?.ada);
const nomor = (n) => urut.findIndex((x) => x.nomor === n);

test("registry: halaman masuk urutan baca tepat bila penggantinya belum ada (dibaca langsung dari data)", () => {
  const punyaPengganti = d.halaman.filter((x) => x.ada && (x.lebur_ke || x.diganti_oleh));
  assert.ok(punyaPengganti.length > 0, "registry tanpa halaman lama: tes ini tidak lagi membuktikan apa pun, hapus atau ganti");
  const salah = punyaPengganti.filter((x) => urut.some((u) => u.id === x.id) === digantiAda(x)).map((x) => x.id);
  assert.deepEqual(salah, []);
  assert.ok(punyaPengganti.some(digantiAda), "harus ada halaman yang dilewati");
});

test("registry: halaman yang dilewati tidak dihapus: tetap di registry, punya URL, bisa dirujuk [[ID]]", () => {
  const dilewati = d.halaman.filter((x) => x.ada && digantiAda(x));
  assert.ok(dilewati.length > 0);
  for (const x of dilewati) {
    assert.equal(by[x.id], x);
    assert.match(url(x), /^\/.+\/$/);
  }
});

test("registry: Berikutnya dari 1.42 tetap 2.1, dan Tahap 2 berurutan 2.1 sampai 2.33 tanpa halaman lama di tengah", () => {
  const i = nomor("1.42");
  assert.ok(i >= 0);
  assert.equal(urut[i + 1].nomor, "2.1");
  const dua = urut.slice(nomor("2.1"), nomor("2.33") + 1);
  assert.deepEqual(dua.map((x) => x.nomor), Array.from({ length: 33 }, (_, k) => `2.${k + 1}`));
});

test("registry: sesudah jembatan Tahap 2 jalur masuk Tahap 3, bukan halaman lama Tahap 2; Sebelumnya dari sana 2.33", () => {
  const akhir = nomor("2.33");
  const sesudah = urut[akhir + 1];
  assert.ok(sesudah, "2.33 tidak punya halaman berikutnya");
  assert.equal(sesudah.tahap, 3, `sesudah 2.33 ada ${sesudah.id} (tahap ${sesudah.tahap})`);
  assert.ok(!digantiAda(sesudah), `${sesudah.id} sudah punya pengganti yang ada`);
  assert.equal(tetangga(d, sesudah).prev.nomor, "2.33");
  assert.equal(tetangga(d, by["t2-jembatan"]).next.id, sesudah.id);
});

test("registry: Tahap 3 yang penggantinya masih segera tetap ada di urutan baca", () => {
  const segera = d.halaman.filter((x) => x.tahap === 3 && x.ada && (x.lebur_ke || x.diganti_oleh) && !digantiAda(x));
  for (const x of segera) assert.ok(urut.some((u) => u.id === x.id), `${x.id} hilang dari urutan padahal penggantinya belum ada`);
});

test("registry: tiap halaman yang dilewati punya Berikutnya sendiri (tidak mati) dan Berikutnya itu masuk urutan", () => {
  for (const x of d.halaman.filter((p) => p.ada && digantiAda(p))) {
    const { next } = tetangga(d, x);
    assert.ok(next, `${x.id} dilewati tapi tidak punya Berikutnya`);
    assert.ok(urut.some((u) => u.id === next.id));
  }
});

test("remark-rujukan: [[berikutnya]] di halaman yang dilewati tidak menggagalkan build dan menuju pengganti", () => {
  const dilewati = d.halaman.find((x) => x.ada && digantiAda(x) && x.lebur_ke);
  assert.ok(dilewati, "tidak ada halaman lama yang dilewati");
  const tree = { type: "root", children: [{ type: "paragraph", children: [{ type: "text", value: "Lompat ke [[berikutnya]]." }] }] };
  remarkRujukan()(tree, { path: path.join(SITE_DOCS, dilewati.path) });
  const tautan = tree.children[0].children.find((c) => c.type === "link");
  assert.ok(tautan, "[[berikutnya]] tidak jadi tautan");
  assert.equal(tautan.url, url(by[dilewati.lebur_ke]));
});
