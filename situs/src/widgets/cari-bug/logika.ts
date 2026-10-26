// Logika murni widget cari-bug (keputusan 158): tanpa DOM, dites Vitest.
import type { DataCariBug } from "./skema";

export type Nilai = "benar" | "lewat" | "salah";

export interface Hasil {
  // nilai per baris yang diperiksa: benar (bug yang ditandai), lewat (bug tak ditandai), salah (baris biasa ditandai)
  nilai: Record<number, Nilai>;
  // true kalau semua baris bug ditandai dan tidak ada baris lain yang ditandai
  tepat: boolean;
  jumlahBenar: number;
  jumlahBug: number;
}

export function periksa(data: DataCariBug, ditandai: ReadonlySet<number>): Hasil {
  const bug = new Set(data.bug);
  const nilai: Record<number, Nilai> = {};
  for (const i of bug) nilai[i] = ditandai.has(i) ? "benar" : "lewat";
  for (const i of ditandai) if (!bug.has(i)) nilai[i] = "salah";
  const jumlahBenar = data.bug.filter((i) => ditandai.has(i)).length;
  const adaSalah = [...ditandai].some((i) => !bug.has(i));
  return { nilai, tepat: jumlahBenar === data.bug.length && !adaSalah, jumlahBenar, jumlahBug: data.bug.length };
}

/** Kalimat ringkas untuk wilayah status: {benar} bug yang ditandai, {bug} jumlah bug, {salah} baris biasa yang ikut ditandai. */
export function ringkas(templat: string, h: Hasil): string {
  const salah = Object.values(h.nilai).filter((n) => n === "salah").length;
  return templat.replace("{benar}", String(h.jumlahBenar)).replace("{bug}", String(h.jumlahBug)).replace("{salah}", String(salah));
}
