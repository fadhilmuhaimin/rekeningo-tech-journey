// Logika murni widget "Satu penyemprotan, satu atau dua instance" (3.16): tanpa DOM, dites Vitest.
// Semua angka dibaca saat build dari rekaman labs/t3-instance/output/batas.txt bagian A (dua instance, round_robin) dan
// bagian B (satu instance, langsung ke a), dan batas per alamat dari konstanta AmbangLoginIP di kode api-t3, bukan ditulis
// tangan. Rekaman yang bentuknya berubah, jumlah jawaban yang tidak sama dengan jumlah percobaan, atau jumlah per
// instance yang tidak sama dengan jumlah yang lolos menggagalkan build.
// Island yang dipakai sama dengan widget 2.28 (pertahanan-login); kunci `terbuka` di BarisTabel di sini membawa baris
// "per instance" (nilai berupa teks), karena baris "akun yang terbuka" tidak ada artinya untuk password yang salah.
import type { BarisTabel } from "../pertahanan-login/logika";

export type KondisiBatas = "dua-instance" | "satu-instance";
export const KONDISI: readonly KondisiBatas[] = ["dua-instance", "satu-instance"];

export interface HasilBatas {
  percobaan: number; // jumlah percobaan yang dikirim
  sampai: number; // jawaban 401: sampai ke pemeriksaan password
  ditolak: number; // jawaban 429: ditolak penahan per alamat
  perInstance: string; // mis. "a 10 · b 10": percobaan yang sampai, per instance
}
export type RekamanBatas = Record<KondisiBatas, HasilBatas>;

function bagian(teks: string, huruf: string): string[] {
  const baris = teks.split("\n");
  const awal = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (awal < 0) throw new Error(`rekaman batas.txt: bagian ${huruf} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > awal && b.startsWith("# --- "));
  return baris.slice(awal, akhir < 0 ? baris.length : akhir);
}

/** Potongan "401: 20 · 429: 4" menjadi peta kode ke jumlah. */
function bacaKode(teks: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of teks.matchAll(/(\d{3}): (\d+)/g)) out[m[1]!] = Number(m[2]);
  return out;
}

function cari(b: string[], huruf: string, re: RegExp): RegExpMatchArray {
  for (const baris of b) {
    const m = baris.match(re);
    if (m) return m;
  }
  throw new Error(`rekaman batas.txt bagian ${huruf}: baris ${re} tidak ada`);
}

function periksa(huruf: string, percobaan: number, kode: Record<string, number>): { sampai: number; ditolak: number } {
  const sampai = kode["401"] ?? 0;
  const ditolak = kode["429"] ?? 0;
  const lain = Object.keys(kode).filter((k) => k !== "401" && k !== "429");
  if (lain.length > 0) throw new Error(`rekaman batas.txt bagian ${huruf}: kode lain ${lain.join(", ")}`);
  if (sampai + ditolak !== percobaan) throw new Error(`rekaman batas.txt bagian ${huruf}: ${sampai} + ${ditolak} jawaban, ${percobaan} percobaan tertulis`);
  return { sampai, ditolak };
}

/** "a 10, b 10" menjadi pasangan per instance; jumlahnya harus sama dengan yang lolos. */
function bacaPerInstance(huruf: string, teks: string, total: number): string {
  const pasang = [...teks.matchAll(/(\w+) (\d+)/g)].map((m) => ({ nama: m[1]!, n: Number(m[2]) }));
  if (pasang.length === 0 || pasang.reduce((s, p) => s + p.n, 0) !== total) {
    throw new Error(`rekaman batas.txt bagian ${huruf}: per instance "${teks}" tidak berjumlah ${total}`);
  }
  return pasang.map((p) => `${p.nama} ${p.n}`).join(" · ");
}

export function bacaBatas(teks: string): RekamanBatas {
  const a = bagian(teks, "A");
  const ma = cari(a, "A", /^(\d+) percobaan → (.*)$/);
  const percA = Number(ma[1]);
  const { sampai: sA, ditolak: tA } = periksa("A", percA, bacaKode(ma[2]!));
  const pi = cari(a, "A", /^\s+per instance: 401 (.+?) · 429 (.+)$/);
  const perA = bacaPerInstance("A", pi[1]!, sA);
  bacaPerInstance("A (429)", pi[2]!, tA);

  const b = bagian(teks, "B");
  const mb = cari(b, "B", /^(\d+) percobaan langsung ke instance (\w+) → (.*)$/);
  const percB = Number(mb[1]);
  const { sampai: sB, ditolak: tB } = periksa("B", percB, bacaKode(mb[3]!));

  return {
    "dua-instance": { percobaan: percA, sampai: sA, ditolak: tA, perInstance: perA },
    "satu-instance": { percobaan: percB, sampai: sB, ditolak: tB, perInstance: `${mb[2]} ${sB}` },
  };
}

/** Batas per alamat dari kode: AmbangLoginIP = [2]float64{10, 10.0 / 60}. */
export function bacaBatasAlamat(kode: string): { kapasitas: number; perMenit: number } {
  const m = kode.match(/AmbangLoginIP\s*=\s*\[2\]float64\{(\d+),\s*(\d+)\.0\s*\/\s*60\}/);
  if (!m) throw new Error("pembatas.go: AmbangLoginIP tidak terbaca");
  return { kapasitas: Number(m[1]), perMenit: Number(m[2]) };
}

export interface PilihanTebak { teks: string; angka: number; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang angkanya sama dengan jumlah percobaan yang sampai di rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], fakta: number): number {
  const cocok = pilihan.flatMap((p, i) => (p.angka === fakta ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan rekaman, harus tepat satu`);
  return cocok[0]!;
}

/** Baris tabel untuk satu kondisi; sorot bila lebih banyak percobaan sampai daripada jatah satu alamat. */
export function tabelBatas(h: HasilBatas, batasAlamat: number): BarisTabel[] {
  return [
    { kode: "percobaan", nilai: String(h.percobaan), sorot: false },
    { kode: "sampai", nilai: String(h.sampai), sorot: h.sampai > batasAlamat },
    { kode: "ditolak", nilai: String(h.ditolak), sorot: false },
    { kode: "terbuka", nilai: h.perInstance, sorot: false },
  ];
}

/** Nilai untuk templat teks: {percobaan}, {sampai}, {ditolak}, {perInstance}, {batas}, {diterima}, {tolakTiap}. */
export function nilaiBatas(h: HasilBatas, batasAlamat: number): Record<string, string | number> {
  return { percobaan: h.percobaan, sampai: h.sampai, ditolak: h.ditolak, perInstance: h.perInstance, batas: batasAlamat, ...nilaiPerInstance(h) };
}

/** Jumlah instance yang tertulis di "a 10 · b 10" (pasangan nama dan jumlah). */
export function jumlahInstance(perInstance: string): number {
  return perInstance.split(" · ").length;
}

/** Nilai tambahan untuk templat: percobaan dan penolakan per instance (harus bulat). */
export function nilaiPerInstance(h: HasilBatas): { diterima: number; tolakTiap: number } {
  const n = jumlahInstance(h.perInstance);
  if (h.percobaan % n !== 0 || h.ditolak % n !== 0) throw new Error(`rekaman batas.txt: ${h.percobaan} percobaan atau ${h.ditolak} ditolak tidak terbagi rata ke ${n} instance`);
  return { diterima: h.percobaan / n, tolakTiap: h.ditolak / n };
}
