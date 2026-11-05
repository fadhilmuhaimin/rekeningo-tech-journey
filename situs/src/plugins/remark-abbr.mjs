// Singkatan/istilah dari situs/data/istilah.md (`*[istilah]: definisi`, dibuat tools/build_istilah.py) dibungkus
// <abbr title="definisi">, padanan ekstensi `abbr` Python-Markdown. Setiap kemunculan dibungkus; skrip lama
// javascripts/istilah.js lalu menandai kemunculan pertama per bagian sebagai tooltip. Kunci terpanjang dicocokkan
// lebih dulu (keputusan 84). Teks di heading, link, dan kode tidak disentuh.
//
// Satu kata, satu arti bawaan. Halaman yang memakai kata itu dengan arti lain (mis. "token" untuk token LSN, "router"
// untuk traffic router) menyebut entri glosarium yang benar di situs/data/arti-istilah.json: path halaman di
// src/content/docs tanpa ekstensi -> { kata: entri | { arti: entri, kecuali: [frasa] } }. Tiap kemunculan kata itu di
// halaman tersebut memakai definisi entri itu dan membawa atribut data-arti (kunci entri) yang dibaca istilah.js untuk
// popover. `kecuali` menyebut frasa yang tetap memakai arti bawaan. Frasa yang memang ditulis utuh ("token LSN") tidak
// perlu masuk berkas itu, karena kunci terpanjang menang (keputusan 1893).
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../tools/registri.mjs";

const LEWATI = new Set(["code", "inlineCode", "link", "linkReference", "heading", "mdxJsxTextElement"]);

function muatIstilah() {
  const teks = fs.readFileSync(path.join(ROOT, "situs/data/istilah.md"), "utf8");
  const def = {};
  for (const m of teks.matchAll(/^\*\[([^\]]+)\]:\s*(.+)$/gm)) def[m[1]] = m[2].trim();
  const kunci = Object.keys(def).sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}_-])(${kunci.map(esc).join("|")})(?![\\p{L}\\p{N}_-])`, "gu");
  return { def, re };
}

/** Arti per halaman dari situs/data/arti-istilah.json, dinormalkan ke Map(halaman -> Map(kata huruf kecil -> { arti, kecuali[] })). */
export function muatArti(def, berkas = path.join(ROOT, "situs/data/arti-istilah.json")) {
  const mentah = JSON.parse(fs.readFileSync(berkas, "utf8"));
  const out = new Map();
  for (const [halaman, kata] of Object.entries(mentah)) {
    const peta = new Map();
    for (const [k, v] of Object.entries(kata)) {
      const { arti, kecuali = [] } = typeof v === "string" ? { arti: v } : v;
      if (!def[arti]) throw new Error(`arti-istilah.json: ${halaman}: "${k}" menunjuk "${arti}", yang tidak ada di glosarium`);
      peta.set(k.toLowerCase(), { arti, kecuali: kecuali.map((f) => f.toLowerCase()) });
    }
    out.set(halaman, peta);
  }
  return out;
}

/** Path halaman di src/content/docs tanpa ekstensi, atau null (mis. berkas di luar konten). */
export function kunciHalaman(file) {
  const p = (file?.path || file?.history?.[0] || "").replace(/\\/g, "/");
  const m = p.match(/\/src\/content\/docs\/(.+)\.mdx?$/);
  return m ? m[1] : null;
}

/** Entri glosarium yang dipakai satu kemunculan `kata` di `nilai` pada posisi `indeks`, atau null (arti bawaan). */
export function artiKemunculan(petaHalaman, kata, nilai, indeks) {
  const o = petaHalaman?.get(kata.toLowerCase());
  if (!o) return null;
  const huruf = nilai.toLowerCase();
  for (const f of o.kecuali) {
    for (let i = huruf.indexOf(f); i >= 0; i = huruf.indexOf(f, i + 1)) {
      if (indeks >= i && indeks + kata.length <= i + f.length) return null;
    }
  }
  return o.arti;
}

export default function remarkAbbr() {
  return (tree, file) => {
    const { def, re } = muatIstilah();
    const peta = muatArti(def).get(kunciHalaman(file));
    (function walk(node, dalamAbbr) {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const c = node.children[i];
        if (LEWATI.has(c.type)) continue;
        if (c.type === "text") {
          if (dalamAbbr) continue;
          const out = [];
          let last = 0;
          for (const m of c.value.matchAll(re)) {
            if (m.index > last) out.push({ type: "text", value: c.value.slice(last, m.index) });
            const arti = artiKemunculan(peta, m[1], c.value, m.index);
            const props = arti ? { title: def[arti], "data-arti": arti } : { title: def[m[1]] };
            out.push({ type: "abbr", data: { hName: "abbr", hProperties: props }, children: [{ type: "text", value: m[1] }] });
            last = m.index + m[0].length;
          }
          if (!out.length) continue;
          if (last < c.value.length) out.push({ type: "text", value: c.value.slice(last) });
          node.children.splice(i, 1, ...out);
          i += out.length - 1;
        } else walk(c, dalamAbbr || c.type === "abbr");
      }
    })(tree, false);
  };
}
