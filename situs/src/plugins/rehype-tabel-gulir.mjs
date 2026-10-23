// Tabel Markdown yang lebih lebar dari kolom isi digulir ke samping di dalam kotaknya sendiri (Starlight memberi
// <table> overflow: auto). Tanpa elemen yang bisa difokus di dalamnya, pembaca keyboard tidak bisa menggulirnya
// (WCAG 2.2 SC 2.1.1; aturan ACT 0ssw9k, axe-core 4.14.0 `scrollable-region-focusable`). Plugin ini membungkus setiap
// tabel GFM dengan <div class="tabel-gulir" role="region" aria-label="Tabel: <judul kolom>; gulir ke samping"
// tabindex="0">: wadah itu yang digulir dan bisa dicapai Tab, dan namanya diambil dari baris judul tabel karena tabel
// Markdown tidak punya <caption>. Skrip `src/lib/tabel-gulir.ts` mencabut ketiga atribut dari wadah yang tidak
// meluap, jadi tabel yang muat tidak menambah tab stop; tanpa JavaScript semua wadah tetap bisa difokus
// (A11y-gulir-tabel, keputusan 712). Tabel berkelas (widget) dan tabel di dalam .not-content tidak disentuh.
const kelas = (node) => [].concat(node.properties?.className ?? []);
const KOLOM_MAKS = 4;

function teks(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(teks).join("");
}

function barisJudul(table) {
  const cari = (node) => {
    for (const c of node.children ?? []) {
      if (c.type !== "element") continue;
      if (c.tagName === "tr") return c;
      const r = cari(c);
      if (r) return r;
    }
    return null;
  };
  const tr = cari(table);
  if (!tr) return [];
  return tr.children
    .filter((c) => c.type === "element" && (c.tagName === "th" || c.tagName === "td"))
    .map((c) => teks(c).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Nama aksesibel wadah: judul kolom dari baris pertama, paling banyak empat, lalu petunjuk gulir. Tabel dengan judul
 * kolom sama di satu halaman diberi urutan ("Tabel 2 dari 3") supaya nama region tidak kembar.
 */
export function namaTabel(kolom, ke = 0, dari = 0) {
  const awal = dari > 1 ? `Tabel ${ke} dari ${dari}` : "Tabel";
  if (!kolom.length) return `${awal}; gulir ke samping`;
  const tampil = kolom.slice(0, KOLOM_MAKS).join(", ");
  const sisa = kolom.length - KOLOM_MAKS;
  return `${awal}: ${tampil}${sisa > 0 ? `, dan ${sisa} kolom lain` : ""}; gulir ke samping`;
}

export default function rehypeTabelGulir() {
  return (tree) => {
    const wadah = [];
    (function walk(node, dalamNotContent) {
      const children = node.children ?? [];
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        if (c.type !== "element") { walk(c, dalamNotContent); continue; }
        const notContent = dalamNotContent || kelas(c).includes("not-content");
        if (c.tagName === "table" && !notContent && !kelas(c).length && !kelas(node).includes("tabel-gulir")) {
          const w = { type: "element", tagName: "div", properties: { className: ["tabel-gulir"], role: "region", ariaLabel: "", tabIndex: 0 }, children: [c] };
          children[i] = w;
          wadah.push({ w, kunci: barisJudul(c).join("\u0000") });
          continue; // tabel di dalam sel tabel tidak dibungkus lagi
        }
        walk(c, notContent);
      }
    })(tree, false);
    const jumlah = new Map();
    for (const { kunci } of wadah) jumlah.set(kunci, (jumlah.get(kunci) ?? 0) + 1);
    const urutan = new Map();
    for (const { w, kunci } of wadah) {
      const ke = (urutan.get(kunci) ?? 0) + 1;
      urutan.set(kunci, ke);
      w.properties.ariaLabel = namaTabel(kunci ? kunci.split("\u0000") : [], ke, jumlah.get(kunci));
    }
  };
}
