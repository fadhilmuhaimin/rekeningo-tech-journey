// Rujukan antar halaman [[ID]], [[ID|teks]], [[berikutnya]] -> link berjudul + nomor tampilan.
// ID tidak pernah tampil. ID yang tidak dikenal menggagalkan build (padanan hook MkDocs).
// Rujukan ke halaman yang belum ditulis jadi teks "segera" tanpa tautan, bukan link ke 404 (keputusan 104, 450).
import path from "node:path";
import { muat, byId, label, url, tetangga, urlDariId, SITE_DOCS, JUDUL_MENYUSUL } from "../../tools/registri.mjs";

const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\|([^\]]+))?\]\]/g;
const LEWATI = new Set(["code", "inlineCode", "link", "linkReference", "mdxJsxTextElement"]);

function idEntri(file) {
  const p = file.path || (file.history && file.history[0]);
  if (!p) return null;
  const rel = path.relative(SITE_DOCS, p).replace(/\\/g, "/").replace(/\.(mdx?|md)$/, "");
  return rel.startsWith("..") ? null : rel;
}

export default function remarkRujukan() {
  return (tree, file) => {
    const d = muat();
    const by = byId(d);
    const id = idEntri(file);
    const halamanIni = id ? d.halaman.find((h) => url(h) === urlDariId(id)) : null;

    function berikutnya() {
      if (!halamanIni) throw new Error(`${file.path}: [[berikutnya]] dipakai di halaman yang tidak ada di cerita.json`);
      const { next } = tetangga(d, halamanIni);
      if (!next) throw new Error(`${file.path}: [[berikutnya]] dipakai, tapi halaman ini tidak punya halaman berikutnya`);
      return next;
    }

    function linkNode(h, teks) {
      if (!h.diporting) {
        const props = { class: "rujukan-menyusul", title: JUDUL_MENYUSUL };
        return { type: "emphasis", children: [{ type: "text", value: `${teks} (segera)` }], data: { hName: "span", hProperties: props } };
      }
      return { type: "link", url: url(h), children: [{ type: "text", value: teks }], data: { hProperties: {} } };
    }

    function pecah(node) {
      const out = [];
      let last = 0;
      for (const m of node.value.matchAll(TOKEN)) {
        const [tok, key, teks] = m;
        const h = key === "berikutnya" ? berikutnya() : by[key];
        if (!h) throw new Error(`${file.path}: rujukan [[${key}]] tidak ada di cerita.json`);
        if (m.index > last) out.push({ type: "text", value: node.value.slice(last, m.index) });
        out.push(linkNode(h, teks || label(h, true)));
        last = m.index + tok.length;
      }
      if (!out.length) return null;
      if (last < node.value.length) out.push({ type: "text", value: node.value.slice(last) });
      return out;
    }

    (function walk(node) {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const c = node.children[i];
        if (LEWATI.has(c.type)) continue;
        if (c.type === "text" && c.value.includes("[[")) {
          const ganti = pecah(c);
          if (ganti) { node.children.splice(i, 1, ...ganti); i += ganti.length - 1; }
        } else walk(c);
      }
    })(tree);
  };
}
