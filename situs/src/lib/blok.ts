// Blok lipat halaman (keputusan 118): logika murni yang dipakai middleware daftar isi, komponen Blok, dan tes.
// Sumber daftar blok adalah teks MDX halaman itu sendiri: setiap <Blok nama="..." buka menit={n} aman="...">.
import templatJson from "../../data/templat.json";

export interface InfoBlok { nama: string; buka: boolean; menit?: number }
export interface Templat { blok?: { nama: string; menit: number }[]; minimal?: number; buka: number }
export const TEMPLAT = templatJson.jenis as Record<string, Templat>;

const ATRIBUT = /(\w+)(?:=(?:"([^"]*)"|\{(\d+)\}))?/g;

/** Daftar blok dalam urutan tampil, dibaca dari teks MDX. */
export function daftarBlok(mdx: string): InfoBlok[] {
  const out: InfoBlok[] = [];
  for (const m of mdx.matchAll(/<Blok\b([^>]*?)\/?>/g)) {
    const a: Record<string, string | true> = {};
    for (const x of (m[1] ?? "").matchAll(ATRIBUT)) a[x[1]!] = x[2] ?? x[3] ?? true;
    if (typeof a.nama !== "string") throw new Error(`Blok tanpa nama: ${m[0]}`);
    out.push({ nama: a.nama, buka: a.buka === true, ...(typeof a.menit === "string" ? { menit: Number(a.menit) } : {}) });
  }
  return out;
}

/** id elemen blok: "Yang Raka kira" -> "blok-yang-raka-kira". */
export function slugBlok(nama: string): string {
  return "blok-" + nama.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** id elemen semua blok halaman, sama dengan data-blok yang dirender Blok.astro dan dicatat di rtj-blok:<path>. */
export function idBlok(mdx: string): string[] {
  return daftarBlok(mdx).map((b) => slugBlok(b.nama));
}

/** Menit blok: atribut di halaman, kalau tidak ada dari templat. */
export function menitBlok(jenis: string | undefined, b: InfoBlok): number | undefined {
  return b.menit ?? TEMPLAT[jenis ?? ""]?.blok?.find((t) => t.nama === b.nama)?.menit;
}

/** Kesalahan susunan blok terhadap templat jenis halaman. Kosong = sesuai. */
export function cekTemplat(jenis: string, bloks: InfoBlok[]): string[] {
  const t = TEMPLAT[jenis];
  if (!t) return [`jenis "${jenis}" tidak punya templat`];
  const err: string[] = [];
  if (t.blok) {
    const harus = t.blok.map((x) => x.nama);
    const ada = bloks.map((x) => x.nama);
    if (harus.join("|") !== ada.join("|")) err.push(`urutan blok ${JSON.stringify(ada)}, harus ${JSON.stringify(harus)}`);
  } else if (bloks.length < (t.minimal ?? 1)) {
    err.push(`${bloks.length} blok, minimal ${t.minimal}`);
  }
  const nama = bloks.map((b) => b.nama);
  if (new Set(nama).size !== nama.length) err.push("nama blok ganda");
  bloks.forEach((b, i) => {
    const harusBuka = i < t.buka;
    if (b.buka !== harusBuka) err.push(`blok "${b.nama}" ${harusBuka ? "harus terbuka (buka)" : "harus tertutup"} saat dimuat`);
  });
  return err;
}
