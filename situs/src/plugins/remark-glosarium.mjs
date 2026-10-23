// Halaman Glosarium (G-istilah, keputusan 687): setiap baris tabel istilah mendapat id statis `istilah-<slug>` (tujuan
// tautan tooltip dan "Istilah terkait"; dulu dipasang JavaScript sesudah halaman dimuat), dan nama istilah yang sudah
// punya halaman /istilah/<slug>/ dibungkus tautan ke halaman itu. Datanya situs/data/glosarium.json dari
// tools/build_istilah.py, jadi teks glosarium.mdx (sumber tooltip) tidak berubah. Hanya berlaku di alat/glosarium.mdx.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../tools/registri.mjs";

const teksPolos = (n) => (n.value !== undefined && n.type !== "html" ? n.value : (n.children ?? []).map(teksPolos).join(""));

export default function remarkGlosarium() {
  return (tree, file) => {
    const p = (file.path || file.history?.[0] || "").replace(/\\/g, "/");
    if (!p.endsWith("/alat/glosarium.mdx")) return;
    const baris = JSON.parse(fs.readFileSync(path.join(ROOT, "situs/data/glosarium.json"), "utf8"));
    const per = new Map(baris.map((b) => [b.t, b]));
    const dipakai = new Set();
    (function walk(node) {
      for (const c of node.children ?? []) {
        if (c.type !== "table") { walk(c); continue; }
        for (const row of c.children.slice(1)) {
          const sel = row.children[0];
          const b = per.get(teksPolos(sel).replace(/\s+/g, " ").trim());
          if (!b) continue;
          if (dipakai.has(b.s)) throw new Error(`glosarium: istilah "${b.t}" muncul dua kali`);
          dipakai.add(b.s);
          row.data = { ...row.data, hProperties: { ...row.data?.hProperties, id: b.s } };
          const i = sel.children.findIndex((x) => x.type === "strong");
          if (b.h && i >= 0) sel.children[i] = { type: "link", url: b.h, children: [sel.children[i]] };
        }
      }
    })(tree);
    const hilang = baris.filter((b) => !dipakai.has(b.s));
    if (hilang.length) throw new Error(`glosarium: baris tanpa id: ${hilang.map((b) => b.t).join(", ")}`);
  };
}
