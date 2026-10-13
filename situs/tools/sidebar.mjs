// Sidebar Starlight dari cerita.json: satu grup per tahap, ★ untuk jalur inti (keputusan 117).
// Redesain (keputusan 202): semua grup terlipat; Starlight membuka grup yang memuat halaman aktif, jadi
// yang terlihat hanya jalur ke halaman ini.
// Tahap dengan naskah dikelompokkan per bagian naskah (PRD, fitur ke teknis, ...); tahap lain per kelompok lama dan
// ditandai "versi lama". Halaman yang belum ditulis tetap tampil (urutan dan nomor tidak berubah) dengan
// data-nav="menyusul" dan badge "segera"; tautannya dicabut src/rute-segera.ts supaya tidak menuju 404 (keputusan 104,
// 450). Halaman versi lama di tahap bernaskah mendapat badge "versi lama". Peran yang ditonjolkan dibawa sebagai
// data-peran untuk pemilih peran.
// Penanda inti/menyusul/lama memakai data-nav, bukan class: Starlight 0.42.5 (SidebarSublist.astro) memasang
// attrs.class lewat class:list lalu menyebar attrs lagi, jadi class tercetak dua kali (keputusan 245).
import { muat, label, url, byId, JUDUL_MENYUSUL } from "./registri.mjs";

// Badge Starlight: teks terlihat di HP juga, bukan hanya warna atau title (WCAG 1.4.1).
const TANDA_SEGERA = { text: "segera", variant: "default", class: "nav-tanda" };
const TANDA_LAMA = { text: "versi lama", variant: "default", class: "nav-tanda" };

function item(h, by) {
  const nav = [h.inti ? "inti" : "", h.ada ? "" : "menyusul", h.lama || h.lebur_ke || h.diganti_oleh ? "lama" : ""]
    .filter(Boolean).join(" ");
  const attrs = {};
  if (nav) attrs["data-nav"] = nav;
  if (!h.ada) attrs.title = JUDUL_MENYUSUL;
  if (h.lama) attrs.title = "Versi lama; akan ditulis ulang mengikuti naskah";
  if (h.lebur_ke) attrs.title = `Versi lama; isinya ${by[h.lebur_ke].ada ? "digabung" : "akan digabung"} ke ${label(by[h.lebur_ke])}`;
  if (h.diganti_oleh) attrs.title = `Versi lama; ${by[h.diganti_oleh].ada ? "digantikan" : "akan digantikan"} ${label(by[h.diganti_oleh])}`;
  if (h.inti) attrs["data-inti"] = "★ jalur inti";
  if (h.peran?.length) attrs["data-peran"] = h.peran.join(" ");
  const badge = !h.ada ? TANDA_SEGERA : nav.includes("lama") ? TANDA_LAMA : undefined;
  return { label: label(h), link: url(h), attrs, ...(badge && { badge: { ...badge } }) };
}

function grupTahap(d, t, by) {
  const hs = d.halaman.filter((h) => h.tahap === t.no);
  const items = [];
  for (const h of hs) {
    const kel = t.bagian ? t.bagian.find((b) => b.no === h.bagian)?.nama : h.kelompok;
    if (/^T\d$/.test(h.id) || !kel) { items.push(item(h, by)); continue; }
    let g = items.find((x) => x.items && x.label === kel);
    if (!g) { g = { label: kel, collapsed: true, items: [] }; items.push(g); }
    g.items.push(item(h, by));
  }
  // Tahap bernaskah menandai versi lama per halaman, bukan di judul grup (keputusan 450).
  const versi = t.versi === "lama" && !t.naskah ? " · versi lama" : "";
  return { label: `Tahap ${t.no} · ${t.nama}${versi}`, collapsed: true, items };
}

export function sidebar() {
  const d = muat();
  const by = byId(d);
  const out = [];
  // Beranda sudah ditautkan judul situs; tidak diulang di sidebar.
  out.push({ label: "Pembuka", collapsed: true, items: d.halaman.filter((h) => h.tahap === "pembuka" && h.id !== "Beranda").map((h) => item(h, by)) });
  for (const t of d.tahap) out.push(grupTahap(d, t, by));
  const samping = d.halaman.filter((h) => h.tahap === "sampingan");
  if (samping.length) out.push({ label: "Studi sampingan", collapsed: true, items: samping.map((h) => item(h, by)) });
  const alat = d.halaman.filter((h) => h.tahap === "alat");
  if (alat.length) out.push({ label: "Alat", collapsed: true, items: alat.map((h) => item(h, by)) });
  return out;
}
