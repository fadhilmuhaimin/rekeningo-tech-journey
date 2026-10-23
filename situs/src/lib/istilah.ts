// Halaman istilah (G-istilah, keputusan 685–691): satu rute /istilah/<slug>/ per istilah, delapan bagian tetap
// (PROPOSAL "Glosarium jadi halaman mendalam per istilah"). Kalimat pertama dan tooltip berasal dari baris istilah di
// situs/src/content/docs/alat/glosarium.mdx; tujuh bagian lain dari situs/data/halaman-istilah/<slug>.json, divalidasi
// skema di file ini saat build dan oleh Vitest (istilah.test.ts). Cara menambah istilah: README.md bagian
// "Menambah halaman istilah". Logika murni tanpa DOM.
import { z } from "zod";

const Teks = z.string().min(1);

/** Enam stack pembanding, urutan tampil tetap (Definisi selesai bersama, mode penyelesaian penuh). */
export const STACK = ["go", "node", "laravel", "django", "serverpod", "supabase"] as const;
export const NAMA_STACK: Record<(typeof STACK)[number], string> = {
  go: "Go",
  node: "Node.js",
  laravel: "Laravel",
  django: "Django",
  serverpod: "Serverpod",
  supabase: "Supabase",
};

/** Label kejujuran untuk satu baris stack: dari rekaman lab repo ini (path rekaman), atau dari dokumentasi resmi yang
 *  dibuka tanpa dijalankan (URL dokumentasi, versi dari dokumentasi itu). */
const BarisStack = z.discriminatedUnion("label", [
  z.object({ label: z.literal("Rekaman lab"), versi: Teks, teks: Teks, rekaman: z.string().regex(/^labs\/[\w./-]+$/) }).strict(),
  z.object({ label: z.literal("Tidak dijalankan"), versi: Teks, teks: Teks, dokumentasi: z.url() }).strict(),
]);

const StackEnam = z.object(Object.fromEntries(STACK.map((s) => [s, BarisStack])) as Record<(typeof STACK)[number], typeof BarisStack>).strict();
/** Istilah yang kodenya sama dengan istilah lain (mis. debit ditulis sebagai posting di jurnal): rujuk, jangan salin. */
const StackLihat = z.object({ lihat: z.string().regex(/^[a-z0-9-]+$/), teks: Teks }).strict();

const Sumber = z.union([
  z.object({ riset: z.string().regex(/^R\d-\d{2}$/), judul: Teks, url: z.url(), catatan: Teks }).strict(),
  z.object({ riset: z.string().regex(/^R\d-\d{2}$/).optional(), judul: Teks, rekaman: z.string().regex(/^labs\/[\w./-]+$/), catatan: Teks }).strict(),
]);

/** `null` berarti bagian itu belum ditulis: halaman menampilkan "Belum ditulis." Kunci yang hilang menggagalkan build. */
const atauBelum = <T extends z.ZodType>(s: T) => s.nullable();

export const HalamanIstilah = z
  .object({
    istilah: Teks,
    sehari_hari: atauBelum(Teks),
    cerita: atauBelum(z.array(z.object({ rujukan: z.string().regex(/^[A-Za-z0-9.\-]+$/), teks: Teks }).strict()).min(1).max(4)),
    mekanisme: atauBelum(z.array(Teks).min(3).max(5)),
    stack: atauBelum(z.union([StackEnam, StackLihat])),
    jebakan: atauBelum(z.array(Teks).min(2).max(3)),
    terkait: atauBelum(z.array(Teks).min(1).max(6)),
    sumber: atauBelum(z.array(Sumber).min(1).max(8)),
  })
  .strict()
  .refine((d) => d.sumber !== null || (d.mekanisme === null && d.stack === null && d.jebakan === null), {
    message: "mekanisme, stack, atau jebakan sudah ditulis, jadi sumber wajib diisi",
    path: ["sumber"],
  });
export type HalamanIstilah = z.infer<typeof HalamanIstilah>;

/** Satu baris glosarium seperti ditulis tools/build_istilah.py ke situs/data/glosarium.json. */
export const BarisGlosarium = z
  .object({ t: Teks, d: Teks, b: z.string().nullable(), n: z.string().nullable(), u: z.string().nullable(), s: z.string().regex(/^istilah-[a-z0-9-]+$/), h: z.string().nullable() })
  .strict();
export const Glosarium = z.array(BarisGlosarium);
export type BarisGlosarium = z.infer<typeof BarisGlosarium>;

/** Delapan bagian tetap, urutan dan judulnya sama di setiap halaman istilah. */
export const BAGIAN = [
  ["satu-kalimat", "Satu kalimat"],
  ["sehari-hari", "Dalam bahasa sehari-hari"],
  ["di-cerita", "Di mana ia muncul di cerita"],
  ["mekanisme", "Mekanismenya"],
  ["di-tiap-stack", "Di tiap stack"],
  ["jebakan", "Jebakan umum"],
  ["terkait", "Istilah terkait"],
  ["sumber", "Sumber"],
] as const;

export const slugDariS = (s: string) => s.replace(/^istilah-/, "");
export const urlIstilah = (slug: string) => `/istilah/${slug}/`;

/** Potongan teks satu baris: teks biasa, `kode`, [[ID]] atau [[ID|teks]] ke halaman registry, [teks](url). */
export type Potongan =
  | { jenis: "teks"; teks: string }
  | { jenis: "kode"; teks: string }
  | { jenis: "rujukan"; id: string; teks?: string }
  | { jenis: "tautan"; teks: string; url: string };

const POLA = /`([^`]+)`|\[\[([A-Za-z0-9.\-]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g;

export function potong(teks: string): Potongan[] {
  const out: Potongan[] = [];
  let akhir = 0;
  for (const m of teks.matchAll(POLA)) {
    if (m.index! > akhir) out.push({ jenis: "teks", teks: teks.slice(akhir, m.index) });
    if (m[1] !== undefined) out.push({ jenis: "kode", teks: m[1] });
    else if (m[2] !== undefined) out.push(m[3] ? { jenis: "rujukan", id: m[2], teks: m[3] } : { jenis: "rujukan", id: m[2] });
    else out.push({ jenis: "tautan", teks: m[4]!, url: m[5]! });
    akhir = m.index! + m[0].length;
  }
  if (akhir < teks.length) out.push({ jenis: "teks", teks: teks.slice(akhir) });
  return out;
}

/** Semua [[ID]] di satu halaman istilah, untuk diperiksa terhadap registry. */
export function semuaRujukan(d: HalamanIstilah): string[] {
  const teks: string[] = [];
  if (d.sehari_hari) teks.push(d.sehari_hari);
  for (const c of d.cerita ?? []) teks.push(`[[${c.rujukan}]]`, c.teks);
  teks.push(...(d.mekanisme ?? []), ...(d.jebakan ?? []));
  if (d.stack && "lihat" in d.stack) teks.push(d.stack.teks);
  else if (d.stack) for (const s of STACK) teks.push(d.stack[s].teks);
  return teks.flatMap(potong).flatMap((p) => (p.jenis === "rujukan" ? [p.id] : []));
}

/** Istilah terkait -> tujuan tautan: halaman istilahnya bila ada, bila belum baris glosariumnya. */
export function tujuanTerkait(nama: string, glos: BarisGlosarium[]): { teks: string; url: string } {
  const b = glos.find((g) => g.t === nama);
  if (!b) throw new Error(`istilah terkait "${nama}" tidak ada di glosarium (situs/src/content/docs/alat/glosarium.mdx)`);
  return { teks: nama, url: b.h ?? `/alat/glosarium/#${b.s}` };
}
