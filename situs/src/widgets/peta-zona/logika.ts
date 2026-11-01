// Logika murni widget peta lima zona Tahap 5 (W5-zona): tanpa DOM, dites logika.test.ts.
// Model: pembaca menebak dulu, lalu membuka zona satu per satu. Zona yang pernah dibuka mengisi baris tabel kejadian yang berawal di
// zona itu. Jawaban tebakan dibuka bila semua zona tempat uang bergerak pernah dibuka. Jenis komponen (uang, salinan, lain) baru
// tampil sesudah jawaban dibuka, supaya tebakan tidak terbaca dari isi zona.
import type { DataZona, ZonaId } from "./skema";

export type Zona = DataZona["zona"][number];
export type Kejadian = DataZona["kejadian"][number];
export type Pernah = ReadonlySet<ZonaId>;

export const isi = (templat: string, nilai: Record<string, string | number>): string =>
  templat.replace(/\{([a-z]+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diberi nilai`);
    return String(nilai[k]);
  });

/** "a", "a dan b", "a, b, dan c" */
export const sebut = (daftar: readonly string[]): string =>
  daftar.length <= 1 ? (daftar[0] ?? "") : daftar.length === 2 ? `${daftar[0]} dan ${daftar[1]}` : `${daftar.slice(0, -1).join(", ")}, dan ${daftar.at(-1)}`;

export const zonaDari = (d: DataZona, id: ZonaId): Zona => {
  const z = d.zona.find((x) => x.id === id);
  if (!z) throw new Error(`zona ${id} tidak ada`);
  return z;
};

/** Zona yang memuat komponen tempat uang bergerak, dalam urutan zona. */
export const zonaUang = (d: DataZona): ZonaId[] => d.zona.filter((z) => z.komponen.some((k) => k.jenis === "uang")).map((z) => z.id);

/** Jawaban dibuka sesudah pembaca menebak dan membuka semua zona tempat uang bergerak. */
export const diungkap = (d: DataZona, tebakan: number | null, pernah: Pernah): boolean => tebakan !== null && zonaUang(d).every((z) => pernah.has(z));

/** Zona tempat uang bergerak yang belum dibuka, untuk kalimat petunjuk. */
export const belumDibuka = (d: DataZona, pernah: Pernah): Zona[] => zonaUang(d).filter((z) => !pernah.has(z)).map((z) => zonaDari(d, z));

export const kejadianDi = (d: DataZona, id: ZonaId): Kejadian[] => d.kejadian.filter((k) => k.zona === id);

export const terisi = (d: DataZona, pernah: Pernah): Kejadian[] => d.kejadian.filter((k) => pernah.has(k.zona));

const hitungRusak = (ks: readonly Kejadian[]): number => ks.reduce((n, k) => n + k.sel.filter((c) => c.s === "rusak").length, 0);
export const jumlahRusak = (d: DataZona, pernah: Pernah): number => hitungRusak(terisi(d, pernah));
export const jumlahRusakSemua = (d: DataZona): number => hitungRusak(d.kejadian);

/** Satu kalimat untuk wilayah status pertama: zona yang baru dibuka dan keadaan tabel. */
export function ringkasan(d: DataZona, zona: ZonaId | null, pernah: Pernah): string {
  const L = d.label;
  if (zona === null) return L.mulai;
  const z = zonaDari(d, zona);
  const n = kejadianDi(d, zona).length;
  const nilai = { zona: z.label, n, total: d.kejadian.length, terisi: terisi(d, pernah).length, rusak: jumlahRusak(d, pernah) };
  return isi(n === 0 ? L.ringkasKosong : L.ringkas, nilai);
}

/** Kalimat untuk wilayah status kedua: kosong sebelum menebak, petunjuk sesudahnya, jawaban sesudah dibuka. */
export function jawaban(d: DataZona, tebakan: number | null, pernah: Pernah): { jenis: "kosong" | "lanjut" | "benar" | "belum"; teks: string } {
  const L = d.label;
  if (tebakan === null) return { jenis: "kosong", teks: "" };
  if (!diungkap(d, tebakan, pernah)) return { jenis: "lanjut", teks: isi(L.lanjut, { zona: sebut(belumDibuka(d, pernah).map((z) => z.label)) }) };
  const benar = tebakan === d.tebak.jawaban;
  return { jenis: benar ? "benar" : "belum", teks: `${benar ? L.benar : L.belum} ${d.tebak.alasan}` };
}

export type SelTabel = { s: "belum" } | { s: "terjaga" | "rusak" | "tidak"; alasan?: string };

/** Isi tabel: sel baris yang zonanya belum dibuka bernilai "belum". */
export function barisTabel(d: DataZona, pernah: Pernah): { kejadian: Kejadian; sel: SelTabel[] }[] {
  return d.kejadian.map((k) => ({
    kejadian: k,
    sel: pernah.has(k.zona) ? k.sel.map((c) => (c.alasan === undefined ? { s: c.s } : { s: c.s, alasan: c.alasan })) : k.sel.map(() => ({ s: "belum" as const })),
  }));
}

export const serviceDari = (d: DataZona, id: string) => d.service.find((s) => s.id === id);
export const timDari = (d: DataZona, id: string) => d.tim.find((t) => t.id === id);

export const jumlahOrang = (d: DataZona): number => d.tim.reduce((n, t) => n + t.orang, 0);
