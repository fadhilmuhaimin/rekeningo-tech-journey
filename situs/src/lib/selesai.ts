// Satu definisi "halaman selesai" untuk kedua jenis halaman (P5, keputusan 320). Logika murni tanpa DOM dan tanpa
// Zod, karena ikut dimuat di halaman Kartu ulang dan Peta cerita (DataSelesai.astro).
//   Halaman versi lama (26 halaman b/c/d/e): pembaca mencentang "Tandai selesai", widget lama menulis
//     bb1:selesai:<path> = {waktu, judul} (lama/widgets/core.js).
//   Halaman berblok (Tahap 1): Blok.astro menulis rtj-blok:<path> = daftar id blok yang selesai. Halaman selesai bila
//     setiap blok yang ada di halaman itu sekarang tercatat selesai. Daftar blok per halaman dihitung saat build.
// Tidak ada kunci baru: status halaman diturunkan dari kunci yang sudah ditulis, jadi file ekspor progres versi 1
// tetap membawa semua yang dibutuhkan untuk menghitungnya di perangkat lain.

export const KUNCI_BLOK = "rtj-blok:";
export const KUNCI_SELESAI = "bb1:selesai:";

/** path halaman ("/tahap-1/transaction/") -> id blok halaman itu dalam urutan tampil. */
export type BlokHalaman = Readonly<Record<string, readonly string[]>>;

export interface Baca { getItem(k: string): string | null }

const json = (s: string | null): unknown => {
  if (s === null) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
};

/** Benar bila halaman versi lama ditandai selesai, atau semua blok halaman berblok sudah selesai. Nilai yang rusak
 *  dihitung belum selesai. Penanda versi lama dibaca sama dengan widget lama: nilai JSON apa pun yang truthy. */
export function halamanSelesai(s: Baca, path: string, blok: BlokHalaman): boolean {
  if (json(s.getItem(KUNCI_SELESAI + path))) return true;
  const daftar = Object.hasOwn(blok, path) ? blok[path] : undefined;
  if (!daftar?.length) return false;
  const tercatat = json(s.getItem(KUNCI_BLOK + path));
  if (!Array.isArray(tercatat)) return false;
  // Bandingkan id, bukan jumlah: id blok yang sudah diganti namanya tidak ikut menghitung.
  return daftar.every((id) => tercatat.includes(id));
}
