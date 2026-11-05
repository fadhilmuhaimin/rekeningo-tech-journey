// remark-abbr (keputusan 84, 1893): kunci terpanjang menang, dan halaman yang memakai kata dengan arti lain memakai entri
// glosarium dari situs/data/arti-istilah.json (data-arti), dengan frasa `kecuali` yang tetap memakai arti bawaan.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import remarkAbbr, { artiKemunculan, kunciHalaman, muatArti } from "../src/plugins/remark-abbr.mjs";

const istilah = fs.readFileSync(new URL("../data/istilah.md", import.meta.url), "utf8");
const def = Object.fromEntries([...istilah.matchAll(/^\*\[([^\]]+)\]:\s*(.+)$/gm)].map((m) => [m[1], m[2].trim()]));
const berkas = (halaman) => ({ path: `/x/situs/src/content/docs/${halaman}.mdx` });
const para = (...anak) => ({ type: "root", children: [{ type: "paragraph", children: anak }] });
const teks = (value) => ({ type: "text", value });
const abbr = (pohon) => {
  const hasil = [];
  (function jalan(n) {
    if (n.type === "abbr") hasil.push({ teks: n.children[0].value, ...n.data.hProperties });
    for (const c of n.children ?? []) jalan(c);
  })(pohon);
  return hasil;
};
const jalankan = (halaman, nilai) => {
  const pohon = para(teks(nilai));
  remarkAbbr()(pohon, berkas(halaman));
  return abbr(pohon);
};

test("kunciHalaman: path di src/content/docs tanpa ekstensi", () => {
  assert.equal(kunciHalaman(berkas("tahap-5/rekap")), "tahap-5/rekap");
  assert.equal(kunciHalaman({ history: ["C:\\x\\situs\\src\\content\\docs\\tahap-5\\rekap.md"] }), "tahap-5/rekap");
  assert.equal(kunciHalaman({ path: "/x/situs/src/pages/a.mdx" }), null);
  assert.equal(kunciHalaman(undefined), null);
});

test("halaman tanpa aturan: token dan router memakai arti bawaan, tanpa data-arti", () => {
  for (const h of ["tahap-1/authentication", "tahap-5/mtls-antar-service"]) {
    const a = jalankan(h, "Token dan router di sini.");
    assert.deepEqual(a.map((x) => [x.teks, x.title, x["data-arti"]]), [["Token", def["Token"], undefined], ["router", def["router"], undefined]]);
  }
});

test("halaman beraturan: kata token memakai Token LSN di tiap kemunculan, huruf besar atau kecil, dengan data-arti", () => {
  const a = jalankan("tahap-5/replication-lag", "Token itu dikirim. Lalu token kembali, dan router memilih koneksi.");
  assert.deepEqual(a.map((x) => [x.teks, x["data-arti"]]), [["Token", "Token LSN"], ["token", "Token LSN"], ["router", "Router database"]]);
  assert.ok(a.every((x) => x.title === def[x["data-arti"]]));
  assert.equal(jalankan("tahap-5/progressive-delivery", "router memegang bobot")[0].title, def["Traffic router"]);
});

test("kunci terpanjang menang: token bucket dan token LSN tidak ikut aturan kata token", () => {
  const a = jalankan("tahap-5/replication-lag", "token bucket dan token LSN dan token biasa");
  assert.deepEqual(a.map((x) => [x.teks, x["data-arti"]]), [["token bucket", undefined], ["token LSN", undefined], ["token", "Token LSN"]]);
  assert.equal(a[0].title, def["token bucket"]);
  assert.equal(a[1].title, def["Token LSN"]);
});

test("frasa kecuali di rekap tetap arti bawaan, kemunculan lain di teks yang sama memakai Token LSN", () => {
  const a = jalankan("tahap-5/rekap", "Bacaan tanpa token. Itu hitungan token, bukan laju. Lalu token tanpa hak decrypt dijawab 403, dan token lagi.");
  assert.deepEqual(a.map((x) => x["data-arti"] ?? null), ["Token LSN", null, null, "Token LSN"]);
  assert.equal(a[1].title, def["token"]);
  assert.equal(a[2].title, def["token"]);
});

test("artiKemunculan: kata di luar aturan, dan kecuali yang hanya mencakup sebagian kata, tidak menggantikan", () => {
  const peta = new Map([["token", { arti: "Token LSN", kecuali: ["hitungan token"] }]]);
  assert.equal(artiKemunculan(peta, "token", "hitungan token", 9), null);
  assert.equal(artiKemunculan(peta, "token", "token hitungan", 0), "Token LSN");
  assert.equal(artiKemunculan(peta, "router", "router", 0), null);
  assert.equal(artiKemunculan(undefined, "token", "token", 0), null);
});

test("heading, kode, dan tautan tidak disentuh, dan teks di dalam abbr tidak dibungkus lagi", () => {
  const pohon = { type: "root", children: [
    { type: "heading", children: [teks("token")] },
    { type: "paragraph", children: [{ type: "inlineCode", value: "token" }, { type: "link", url: "x", children: [teks("token")] }, teks("router")] },
  ] };
  remarkAbbr()(pohon, berkas("tahap-5/replication-lag"));
  assert.deepEqual(abbr(pohon).map((x) => x.teks), ["router"]);
});

test("muatArti: entri yang tidak ada di glosarium menggagalkan, dan bentuk string dan objek dinormalkan", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arti-"));
  const tulis = (isi) => { const f = path.join(dir, "a.json"); fs.writeFileSync(f, JSON.stringify(isi)); return f; };
  assert.throws(() => muatArti(def, tulis({ "tahap-5/x": { token: "Token Tak Ada" } })), /tidak ada di glosarium/);
  const peta = muatArti(def, tulis({ "tahap-5/x": { Token: { arti: "Token LSN", kecuali: ["Hitungan Token"] }, router: "Traffic router" } }));
  assert.deepEqual(peta.get("tahap-5/x").get("token"), { arti: "Token LSN", kecuali: ["hitungan token"] });
  assert.deepEqual(peta.get("tahap-5/x").get("router"), { arti: "Traffic router", kecuali: [] });
});
