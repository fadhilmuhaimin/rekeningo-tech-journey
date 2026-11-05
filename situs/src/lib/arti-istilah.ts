// Arti kata per halaman (keputusan 1893): satu kata di glosarium punya satu arti bawaan, dan halaman yang memakai kata itu
// dengan arti lain menyebut entri yang benar di situs/data/arti-istilah.json (dibaca plugin remark-abbr). EVAL-5 menemukan
// 128 tooltip "token" dan 34 tooltip "router" di Tahap 5 yang menjelaskan arti lain daripada yang dipakai halaman: plugin
// memasang satu definisi di setiap kemunculan kata. Logika murni di sini diuji arti-istilah.test.ts terhadap berkas data
// dan HTML hasil build; tidak ada DOM.
import { z } from "zod";

/** Satu kata di satu halaman: nama entri glosarium, atau entri beserta frasa yang tetap memakai arti bawaan. */
const Aturan = z.union([
  z.string().min(1),
  z.object({ arti: z.string().min(1), kecuali: z.array(z.string().min(1)).min(1) }).strict(),
]);
export const ArtiIstilah = z.record(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/), z.record(z.string().regex(/^[a-z]+$/), Aturan));
export type ArtiIstilah = z.infer<typeof ArtiIstilah>;

export type Peta = Record<string, string>;

/** Definisi per kunci dari situs/data/istilah.md (`*[kunci]: definisi`). */
export function bacaDefinisi(istilahMd: string): Peta {
  const def: Peta = {};
  for (const m of istilahMd.matchAll(/^\*\[([^\]]+)\]:\s*(.+)$/gm)) def[m[1]!] = m[2]!.trim();
  return def;
}

const normal = (a: string | { arti: string; kecuali: string[] }) => (typeof a === "string" ? { arti: a, kecuali: [] as string[] } : a);

/** Masalah di berkas aturan: halaman tanpa berkas, entri yang tidak ada, entri yang sama dengan arti bawaan, frasa tanpa kata. */
export function periksaAturan(aturan: ArtiIstilah, def: Peta, adaHalaman: (halaman: string) => boolean): string[] {
  const masalah: string[] = [];
  for (const [halaman, kata] of Object.entries(aturan)) {
    if (!adaHalaman(halaman)) masalah.push(`${halaman}: tidak ada berkas di src/content/docs`);
    for (const [k, a] of Object.entries(kata)) {
      const { arti, kecuali } = normal(a);
      if (!(arti in def)) masalah.push(`${halaman}: "${k}" menunjuk "${arti}", yang tidak ada di glosarium`);
      else if (!(k in def)) masalah.push(`${halaman}: "${k}" bukan kunci glosarium, jadi tak ada arti bawaan yang diganti`);
      else if (def[arti] === def[k]) masalah.push(`${halaman}: "${arti}" berdefinisi sama dengan arti bawaan "${k}"`);
      for (const f of kecuali) if (!f.toLowerCase().includes(k)) masalah.push(`${halaman}: frasa "${f}" tidak memuat kata "${k}"`);
    }
  }
  return masalah;
}

const buka = (s: string) =>
  s.replace(/&#x22;|&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const tanpaTag = (s: string) => buka(s.replace(/<[^>]*>/g, ""));

export interface Abbr {
  teks: string;
  judul: string;
  /** Nilai atribut data-arti, atau null (arti bawaan). */
  arti: string | null;
  /** Teks tampil (tanpa tag) di sekitar kata: ke kiri dan kanan, cukup panjang untuk frasa `kecuali`. */
  kiri: string;
  kanan: string;
}

/** Semua <abbr title> di dalam <main> HTML hasil build. */
export function abbrDiMain(html: string): Abbr[] {
  const main = /<main\b[\s\S]*?<\/main>/.exec(html)?.[0] ?? "";
  const hasil: Abbr[] = [];
  for (const m of main.matchAll(/<abbr title="([^"]*)"([^>]*)>([^<]*)<\/abbr>/g)) {
    const mulai = m.index!;
    hasil.push({
      teks: buka(m[3]!),
      judul: buka(m[1]!),
      arti: /data-arti="([^"]*)"/.exec(m[2]!)?.[1] ?? null,
      kiri: tanpaTag(main.slice(Math.max(0, mulai - 400), mulai)).slice(-60),
      kanan: tanpaTag(main.slice(mulai + m[0].length, mulai + m[0].length + 400)).slice(0, 60),
    });
  }
  return hasil;
}

/** Apakah kemunculan `a` ada di dalam salah satu frasa `kecuali` (teks sekitarnya dibaca tanpa tag). */
export function dalamKecuali(a: Abbr, kecuali: string[]): boolean {
  const s = (a.kiri + a.teks + a.kanan).toLowerCase();
  const awal = a.kiri.length;
  return kecuali.some((f) => {
    const g = f.toLowerCase();
    for (let i = s.indexOf(g); i >= 0; i = s.indexOf(g, i + 1)) if (i <= awal && awal + a.teks.length <= i + g.length) return true;
    return false;
  });
}

/** Pelanggaran satu halaman: kata yang diatur harus bertooltip entri halaman itu (atau arti bawaan di dalam frasa `kecuali`). */
export function periksaHalaman(html: string, halaman: string, aturan: ArtiIstilah, def: Peta): string[] {
  const atur = aturan[halaman];
  if (!atur) return [];
  const masalah: string[] = [];
  const terpakai = new Set<string>();
  for (const a of abbrDiMain(html)) {
    const o = atur[a.teks.toLowerCase()];
    if (!o) continue;
    const { arti, kecuali } = normal(o);
    const kata = a.teks.toLowerCase();
    if (a.judul === def[arti] && a.arti === arti) terpakai.add(kata);
    else if (a.judul === def[kata] && a.arti === null && dalamKecuali(a, kecuali)) continue;
    else masalah.push(`${halaman}: "${a.teks}" bertooltip ${a.judul === def[kata] ? "arti bawaan" : "arti lain"} di "${(a.kiri.slice(-25) + a.teks + a.kanan.slice(0, 25)).replace(/\s+/g, " ")}"`);
  }
  for (const k of Object.keys(atur)) if (!terpakai.has(k)) masalah.push(`${halaman}: aturan "${k}" tidak dipakai satu kemunculan pun`);
  return masalah;
}
