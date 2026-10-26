// Registry halaman dari situs/data/cerita.json, padanan tools/registri.py untuk situs Astro.
// ID halaman (A1, B3.1) hanya kunci internal; yang tampil: nomor "T.N" (urutan baca di tahap T, dihitung dari
// semua halaman di registry supaya nomor tidak bergeser) dan judul.
import fs from "node:fs";
import path from "node:path";

// Root repo dicari dari direktori kerja ke atas (penanda: situs/package.json + registry), bukan dari import.meta.url,
// karena saat build Astro memindahkan modul ini ke dist/.prerender/chunks/.
function cariRoot() {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, "situs/package.json")) && fs.existsSync(path.join(d, "situs/data/cerita.json"))) return d + path.sep;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  throw new Error("root repo (situs/package.json + situs/data/cerita.json) tidak ditemukan dari " + process.cwd());
}
export const ROOT = cariRoot();
export const LAMA = path.join(ROOT, "situs/lama"); // widget lama, data widget, vendor, ilustrasi
export const CERITA = path.join(ROOT, "situs/data/cerita.json");
export const SITE_DOCS = path.join(ROOT, "situs/src/content/docs");
const URUT_BACA = ["pembuka", 1, 2, 3, 4, 5, "sampingan"]; // "alat" di luar urutan baca

export function muat() {
  const d = JSON.parse(fs.readFileSync(CERITA, "utf8"));
  const hitung = {};
  for (const h of d.halaman) {
    const mdx = path.join(SITE_DOCS, h.path.replace(/\.md$/, ".mdx"));
    h.ada = fs.existsSync(mdx) || fs.existsSync(path.join(SITE_DOCS, h.path)); // ada di situs (dasar urutan baca)
    h.diporting = h.ada; // nama lama yang dipakai komponen; halaman yang belum ditulis tetap tampil sebagai "menyusul"
    delete h.nomor;
    const t = h.tahap;
    if (Number.isInteger(t) && !/^T\d$/.test(h.id) && !h.lebur_ke) { // halaman yang akan dilebur tanpa nomor sendiri
      hitung[t] = (hitung[t] || 0) + 1;
      h.nomor = `${t}.${hitung[t]}`;
    }
  }
  return d;
}

export const pendek = (h) => h.pendek || h.judul.split(":")[0];
export const label = (h, singkat = false) => {
  const j = singkat ? pendek(h) : h.judul;
  return h.nomor ? `${h.nomor} ${j}` : j;
};

// docs path -> URL: a/b.md -> /a/b/, a/index.md -> /a/, index.md -> /
export function url(h) {
  const p = h.path;
  if (p === "index.md") return "/";
  if (p.endsWith("/index.md")) return "/" + p.slice(0, -"index.md".length);
  return "/" + p.slice(0, -3) + "/";
}

// id entri Starlight ("b-fondasi/b3-1-transaction", "cerita/index", "index") -> URL yang sama dengan url(h)
export function urlDariId(id) {
  const s = id.replace(/(^|\/)index$/, "");
  return s ? `/${s}/` : "/";
}

// title tautan ke halaman yang belum ditulis, sama di sidebar dan di rujukan teks (keputusan 245).
export const JUDUL_MENYUSUL = "Halaman ini belum ditulis";
export const byId = (d) => Object.fromEntries(d.halaman.map((h) => [h.id, h]));
export const dariUrl = (d, u) => d.halaman.find((h) => url(h) === u);

// Pengganti halaman h yang sudah ada di situs (`ada: true`), atau null. Penggantinya ditunjuk `lebur_ke` (halaman lama
// yang isinya sudah ditulis ulang di slot naskah) atau `diganti_oleh` (halaman pembuka tahap versi lama). Rantai
// A -> B -> C diikuti sampai ujungnya yang ada; pengganti yang belum ada ("segera") dan siklus berarti tidak digantikan.
export function penggantiAda(h, by) {
  const lihat = new Set([h.id]);
  let sekarang = h;
  for (;;) {
    const t = by[sekarang.lebur_ke ?? sekarang.diganti_oleh];
    if (!t?.ada) return sekarang === h ? null : sekarang;
    if (lihat.has(t.id)) return null;
    lihat.add(t.id);
    sekarang = t;
  }
}

// Urutan baca (Berikutnya/Sebelumnya, [[berikutnya]], peran di beranda). Halaman yang penggantinya sudah ada dilewati,
// supaya pembaca yang mengikuti Berikutnya dari jembatan tahap tidak masuk halaman versi lama (EVAL2-F1, keputusan 1150).
// Halaman itu tidak dihapus: tetap di sidebar, di URL-nya, dan sebagai rujukan [[ID]]. Selama penggantinya masih
// "segera", halaman lama tetap di urutan supaya jalur baca tidak putus.
export const urutanBaca = (d) => {
  const by = byId(d);
  return URUT_BACA.flatMap((k) => d.halaman.filter((h) => h.tahap === k && h.ada && !penggantiAda(h, by)));
};

// Tetangga h di urutan baca. Halaman yang dilewati diperlakukan duduk tepat sebelum penggantinya: Berikutnya menuju
// penggantinya, Sebelumnya menuju halaman di depan penggantinya, jadi pembaca di halaman lama masuk ke jalur baca
// (keputusan 1151). Halaman di luar urutan (alat, belum ada, atau tidak dikenal) tidak punya tetangga.
export function tetangga(d, h) {
  const kosong = { prev: null, next: null };
  if (!h) return kosong;
  const urut = urutanBaca(d);
  const peng = penggantiAda(h, byId(d));
  const i = urut.findIndex((x) => x.id === (peng ? peng.id : h.id));
  if (i < 0) return kosong;
  return { prev: urut[i - 1] ?? null, next: peng ? urut[i] : (urut[i + 1] ?? null) };
}

const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\|([^\]]+))?\]\]/g;
// [[ID]] di teks data widget -> teks polos
export function tokenKeTeks(teks, d) {
  const by = byId(d);
  return teks.replace(TOKEN, (m, id, t) => {
    const h = by[id];
    if (!h) throw new Error(`rujukan [[${id}]] tidak ada di cerita.json`);
    return t || label(h, true);
  });
}
