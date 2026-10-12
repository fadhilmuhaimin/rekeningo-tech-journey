// Logika murni widget kalkulator estimasi (keputusan 303): tanpa DOM, dites Vitest.
// Rumus sama dengan hitung() di tools/sinkron_cerita.py, yang memeriksa tabel angka di halaman:
//   user aktif per hari = user × aktif%
//   request per hari    = user aktif × request per user aktif
//   rata-rata per detik = request per hari ÷ 86.400
//   puncak per detik    = rata-rata × faktor puncak
//   jarak di puncak     = 1 ÷ puncak (detik antar request, rata-rata di jam paling ramai)
import type { Asumsi, DataKalkulator } from "./skema";

export const DETIK_SEHARI = 86_400;

export interface Hasil {
  user: number;
  dau: number;
  reqHari: number;
  rata: number;
  puncak: number;
  jarak: number; // detik
}

export type Kunci = keyof Hasil;
export const URUTAN: Kunci[] = ["user", "dau", "reqHari", "rata", "puncak", "jarak"];
/** Baris tabel; jarak antar request tampil di kalimat kesimpulan, supaya tabel muat di layar HP. */
export type KunciBaris = Exclude<Kunci, "jarak">;

export function hitung(a: Asumsi): Hasil {
  const dau = (a.user * a.aktif) / 100;
  const reqHari = dau * a.req;
  const rata = reqHari / DETIK_SEHARI;
  const puncak = rata * a.puncak;
  return { user: a.user, dau, reqHari, rata, puncak, jarak: 1 / puncak };
}

/** Titik ribuan: 1200 → "1.200". */
export function titik(n: number): string {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "−" : "") + s;
}

/** n angka penting dengan koma desimal: (0,01389, 2) → "0,014"; (0,13889, 3) → "0,139". */
export function angkaPenting(x: number, n: number): string {
  if (x === 0 || !Number.isFinite(x)) return "0";
  const ax = Math.abs(x);
  let e = Math.floor(Math.log10(ax));
  let r = Math.round(ax / 10 ** (e - n + 1)) * 10 ** (e - n + 1);
  if (r >= 10 ** (e + 1)) e += 1; // 0,0996 dibulatkan jadi 0,10: satu desimal lebih sedikit
  r = Math.round(ax / 10 ** (e - n + 1)) * 10 ** (e - n + 1);
  const des = Math.max(0, n - 1 - e);
  const [bulat, pecahan] = r.toFixed(des).split(".");
  return (x < 0 ? "−" : "") + titik(Number(bulat)) + (pecahan ? "," + pecahan : "");
}

/** Dua angka penting: 0,01389 → "0,014"; 1,389 → "1,4"; 138,9 → "140"; 1.389 → "1.400". */
export function duaAngka(x: number): string {
  return angkaPenting(x, 2);
}

/** Rata-rata di cara hitung puncak: dua angka penting, atau tiga bila hasil kali dua angka itu tampil
 *  beda dari puncak (0,14 × 24 = 3,4, padahal puncaknya 3,3; maka ditulis 0,139 × 24). */
export function rataDiCara(rata: number, faktor: number): string {
  const sama = duaAngka(Number(rata.toPrecision(2)) * faktor) === duaAngka(rata * faktor);
  return sama ? duaAngka(rata) : angkaPenting(rata, 3);
}

/** Jarak antar request: detik bila ≥ 1 detik, milidetik bila kurang. */
export function jarak(detik: number, satuan: { detik: string; ms: string }): string {
  return detik >= 1 ? `${duaAngka(detik)} ${satuan.detik}` : `${duaAngka(detik * 1000)} ${satuan.ms}`;
}

export interface Baris {
  kunci: KunciBaris;
  nilai: number;
  skala: number; // nilai × skala dibulatkan = bilangan bulat yang digerakkan tween
  cara: string;
}

/** Nilai yang ditampilkan untuk satu baris, dari bilangan bulat tween (nilai × skala). */
export function format(kunci: Kunci, bulat: number, skala: number, satuan: { detik: string; ms: string }): string {
  const v = bulat / skala;
  if (kunci === "user" || kunci === "dau" || kunci === "reqHari") return titik(v);
  if (kunci === "jarak") return jarak(v, satuan);
  return duaAngka(v);
}

export function baris(a: Asumsi, labelAsumsi: string): Baris[] {
  const h = hitung(a);
  return [
    { kunci: "user", nilai: h.user, skala: 1, cara: labelAsumsi },
    { kunci: "dau", nilai: h.dau, skala: 1, cara: `${titik(a.user)} × ${duaAngka(a.aktif)}%` },
    { kunci: "reqHari", nilai: h.reqHari, skala: 1, cara: `${titik(h.dau)} × ${duaAngka(a.req)}` },
    { kunci: "rata", nilai: h.rata, skala: 1e4, cara: `${titik(h.reqHari)} ÷ ${titik(DETIK_SEHARI)}` },
    { kunci: "puncak", nilai: h.puncak, skala: 1e4, cara: `${rataDiCara(h.rata, a.puncak)} × ${duaAngka(a.puncak)}` },
  ];
}

/** Asumsi lengkap untuk setiap skenario: asumsi tahapnya dari registry, ditimpa `ubah`. */
export function siapkan(data: DataKalkulator, daftar: Asumsi[]): Asumsi[] {
  return data.skenario.map((s) => {
    const dasar = daftar[s.tahap - 1];
    if (!dasar) throw new Error(`kalkulator ${data.id}: asumsi Tahap ${s.tahap} tidak dikirim`);
    return { ...dasar, ...s.ubah };
  });
}

/** Baris yang angkanya berubah dari skenario sebelumnya (ditandai di tabel). */
export function berubah(a: Asumsi, b: Asumsi): Kunci[] {
  const ha = hitung(a);
  const hb = hitung(b);
  return URUTAN.filter((k) => Math.abs(ha[k] - hb[k]) > 1e-9 * Math.max(1, Math.abs(ha[k])));
}

/** Kalimat kesimpulan dari templat data: {puncak}, {jarak}, {user}. */
export function kesimpulan(templat: string, a: Asumsi, satuan: { detik: string; ms: string }): string {
  const h = hitung(a);
  return templat
    .replaceAll("{puncak}", duaAngka(h.puncak))
    .replaceAll("{jarak}", jarak(h.jarak, satuan))
    .replaceAll("{user}", titik(h.user));
}
