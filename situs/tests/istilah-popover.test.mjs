// Popover istilah (situs/lama/javascripts/istilah.js) membuka entri dari data-arti, bukan dari teks yang tampil
// (keputusan 1891, peninjau PR EVAL5-F1). Popover yang dilihat pembaca bukan atribut title: istilah.js membuang title dan
// membuka ISTILAH[kunci], jadi title yang benar tetap menampilkan arti lama bila kuncinya salah. Tak ada jsdom di situs ini;
// kode dijalankan di vm dengan DOM tiruan sekecil mungkin, dan data nyata dari istilah-data.js.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const baca = (rel) => fs.readFileSync(new URL(`../lama/javascripts/${rel}`, import.meta.url), "utf8");

class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.anak = [];
    this.atribut = {};
    this.dataset = {};
    this.kelas = new Set();
    this.classList = { add: (c) => this.kelas.add(c) };
    this.pengendali = {};
    this.hidden = false;
    this.style = {};
    this.tabIndex = -1;
    this.offsetWidth = 200;
    this.offsetHeight = 80;
    this.teks = "";
    this.pengganti = null;
    this.previousElementSibling = null;
  }
  get textContent() { return this.teks + this.anak.map((a) => a.textContent).join(""); }
  set textContent(v) { this.teks = String(v); this.anak = []; }
  appendChild(a) { this.anak.push(a); return a; }
  setAttribute(k, v) { this.atribut[k] = v; }
  removeAttribute(k) { delete this.atribut[k]; }
  addEventListener(t, f) { (this.pengendali[t] ||= []).push(f); }
  contains(x) { return x === this || this.anak.some((a) => a.contains?.(x)); }
  querySelectorAll() { return []; }
  closest(sel) { return sel === "article" ? this.artikel : null; }
  getBoundingClientRect() { return { left: 10, right: 50, top: 100, bottom: 120, width: 40, height: 20 }; }
  replaceWith(n) { this.pengganti = n; }
  set className(v) { this.kelasNama = v; }
  get className() { return this.kelasNama; }
}

/** Menjalankan istilah.js atas `abbr` (daftar {teks, arti}); mengembalikan elemen abbr, body, dan halaman. */
function jalankan(daftar, { adaData = true } = {}) {
  const body = new El("body");
  const artikel = new El("article");
  const abbr = daftar.map(({ teks, arti }) => {
    const a = new El("abbr");
    a.teks = teks;
    if (arti) a.dataset.arti = arti;
    a.atribut.title = "arti-bawaan-di-title";
    a.artikel = artikel;
    a.parentElement = artikel;
    return a;
  });
  artikel.querySelectorAll = (sel) => (sel === "abbr[title]" ? abbr : []);
  const document = {
    readyState: "complete",
    querySelector: (sel) => (sel === "article.md-content__inner" ? artikel : null),
    createElement: (t) => new El(t),
    createTextNode: (t) => ({ teksNode: t }),
    body,
    addEventListener() {},
    documentElement: { clientWidth: 1000 },
    activeElement: null,
  };
  const konteks = { document, location: { pathname: "/tahap-5/rekap/" }, setTimeout, clearTimeout, Node: { DOCUMENT_POSITION_FOLLOWING: 4 } };
  konteks.window = konteks;
  konteks.window.addEventListener = () => {};
  konteks.window.innerHeight = 800;
  konteks.window.scrollX = 0;
  konteks.window.scrollY = 0;
  vm.createContext(konteks);
  if (adaData) vm.runInContext(baca("istilah-data.js"), konteks);
  vm.runInContext(baca("istilah.js"), konteks);
  return { abbr, body, ISTILAH: konteks.ISTILAH };
}

const buka = (a) => {
  a.pengendali.click[0]({ preventDefault() {} });
};
const popover = (body) => ({ istilah: body.anak[0].anak[0].textContent, definisi: body.anak[0].anak[1].textContent });

test("data-arti memilih entri popover: kata token membuka Token LSN, kata router membuka Router database dan Traffic router", () => {
  const { abbr, body, ISTILAH } = jalankan([
    { teks: "token", arti: "Token LSN" },
    { teks: "router", arti: "Router database" },
    { teks: "router", arti: "Traffic router" },
  ]);
  for (const a of abbr) {
    assert.ok(a.pengendali.click, "abbr pertama per bagian dibuat bisa diklik");
    assert.equal(a.tabIndex, 0, "dan bisa difokus keyboard");
    assert.equal("title" in a.atribut, false, "title dibuang supaya tooltip bawaan browser tidak menumpuk");
  }
  buka(abbr[0]);
  assert.deepEqual(popover(body), { istilah: "Token LSN", definisi: ISTILAH["Token LSN"].d });
  assert.match(popover(body).definisi, /posisi di log, bukan bukti siapa pengirimnya/);
});

test("tanpa data-arti popover memakai arti bawaan dari teks kata", () => {
  const { abbr, body, ISTILAH } = jalankan([{ teks: "token" }]);
  buka(abbr[0]);
  assert.deepEqual(popover(body), { istilah: "Token", definisi: ISTILAH["token"].d });
  assert.match(popover(body).definisi, /bukti siapa pengirimnya, mis\. token login/);
});

test("pemakaian kedua entri yang sama di satu bagian diganti teks aslinya, bukan nama entri", () => {
  const { abbr } = jalankan([{ teks: "token", arti: "Token LSN" }, { teks: "Token", arti: "Token LSN" }]);
  assert.equal(abbr[0].pengganti, null);
  assert.deepEqual(abbr[1].pengganti, { teksNode: "Token" });
});

test("data-arti yang tidak ada di ISTILAH tidak membuka popover dan menampilkan teks aslinya", () => {
  const { abbr } = jalankan([{ teks: "token", arti: "Entri Tak Ada" }]);
  assert.deepEqual(abbr[0].pengganti, { teksNode: "token" });
  assert.equal(abbr[0].pengendali.click, undefined);
});

test("arti bawaan dan arti halaman dalam satu bagian tampil keduanya (kunci berbeda)", () => {
  const { abbr, body } = jalankan([{ teks: "token", arti: "Token LSN" }, { teks: "token" }]);
  assert.equal(abbr[0].pengganti, null);
  assert.equal(abbr[1].pengganti, null);
  buka(abbr[1]);
  assert.equal(popover(body).istilah, "Token");
});
