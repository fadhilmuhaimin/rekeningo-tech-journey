// Checkbox daftar tugas GFM (`- [ ] teks`) dirender sebagai <input type="checkbox" disabled> tanpa nama: pembaca layar
// mengumumkan "kotak centang, tidak tersedia" tanpa teks butirnya, dan aturan ACT e086e5 (axe `label`, WCAG 4.1.2)
// tetap berlaku untuk form field disabled. Di situs ini kotak itu hanya tanda visual daftar periksa (tidak bisa
// dicentang), jadi diberi aria-hidden: keluar dari pohon aksesibilitas, butir tetap terbaca sebagai daftar biasa,
// tampilan tidak berubah (XF6, keputusan 374). Checkbox yang bisa dioperasikan (tanpa disabled) tidak disentuh.
// Di daftar longgar checkbox ada di dalam <p> pertama butir, jadi yang dicari adalah <li> terdekat, bukan induk langsung.
const kelas = (node) => [].concat(node.properties?.className ?? []);

export default function rehypeDaftarCek() {
  return (tree) => {
    (function walk(node, dalamButir) {
      for (const c of node.children ?? []) {
        if (c.type !== "element") { walk(c, dalamButir); continue; }
        if (dalamButir && c.tagName === "input" && c.properties?.type === "checkbox" && c.properties.disabled)
          c.properties.ariaHidden = "true";
        walk(c, c.tagName === "li" ? kelas(c).includes("task-list-item") : dalamButir);
      }
    })(tree, false);
  };
}
