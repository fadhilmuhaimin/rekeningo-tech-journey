// rehype-tabel-gulir (A11y-gulir-tabel, keputusan 712): tabel GFM dibungkus wadah region bernama dengan tabindex 0;
// tabel berkelas, tabel di .not-content, dan tabel di dalam wadah tidak dibungkus.
import test from "node:test";
import assert from "node:assert/strict";
import rehypeTabelGulir, { namaTabel } from "../src/plugins/rehype-tabel-gulir.mjs";

const el = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });
const teks = (value) => ({ type: "text", value });
const tabel = (judul, props = {}) =>
  el("table", props, [el("thead", {}, [el("tr", {}, judul.map((j) => el("th", {}, typeof j === "string" ? [teks(j)] : j)))]), el("tbody", {}, [])]);
const akar = (children) => ({ type: "root", children });

test("tabel GFM dibungkus wadah region bernama dari judul kolom", () => {
  const t = tabel(["Stack", [el("code", {}, [teks("Handler")])], "  Service\n", "Repo"]);
  const pohon = akar([el("p", {}, [teks("isi")]), t]);
  rehypeTabelGulir()(pohon);
  const w = pohon.children[1];
  assert.equal(w.tagName, "div");
  assert.deepEqual(w.properties, { className: ["tabel-gulir"], role: "region", ariaLabel: "Tabel: Stack, Handler, Service, Repo; gulir ke samping", tabIndex: 0 });
  assert.equal(w.children[0], t);
});

test("tabel di dalam blok dibungkus di tempatnya, sekali saja walau plugin jalan dua kali", () => {
  const t = tabel(["A", "B"]);
  const isi = el("div", { className: ["blok__isi"] }, [t]);
  const pohon = akar([el("details", {}, [isi])]);
  rehypeTabelGulir()(pohon);
  rehypeTabelGulir()(pohon);
  assert.deepEqual(isi.children[0].properties.className, ["tabel-gulir"]);
  assert.equal(isi.children[0].children[0], t);
});

test("tabel berkelas dan tabel di .not-content tidak disentuh", () => {
  const widget = tabel(["x"], { className: ["bb-table"] });
  const luar = tabel(["y"]);
  const pohon = akar([widget, el("div", { className: ["not-content"] }, [el("section", {}, [luar])])]);
  rehypeTabelGulir()(pohon);
  assert.equal(pohon.children[0], widget);
  assert.equal(pohon.children[1].children[0].children[0], luar);
});

test("nama: paling banyak empat kolom, sisanya dihitung; tanpa judul tetap bernama", () => {
  assert.equal(namaTabel(["a", "b", "c", "d", "e", "f"]), "Tabel: a, b, c, d, dan 2 kolom lain; gulir ke samping");
  assert.equal(namaTabel([]), "Tabel; gulir ke samping");
  const kosong = tabel(["", " "]);
  const pohon = akar([kosong]);
  rehypeTabelGulir()(pohon);
  assert.equal(pohon.children[0].properties.ariaLabel, "Tabel; gulir ke samping");
});

test("tabel dengan judul kolom sama di satu halaman mendapat urutan, yang lain tidak", () => {
  const pohon = akar([tabel(["Opsi", "Kelebihan"]), tabel(["Lain"]), tabel(["Opsi", "Kelebihan"])]);
  rehypeTabelGulir()(pohon);
  assert.deepEqual(pohon.children.map((w) => w.properties.ariaLabel), [
    "Tabel 1 dari 2: Opsi, Kelebihan; gulir ke samping",
    "Tabel: Lain; gulir ke samping",
    "Tabel 2 dari 2: Opsi, Kelebihan; gulir ke samping",
  ]);
});
