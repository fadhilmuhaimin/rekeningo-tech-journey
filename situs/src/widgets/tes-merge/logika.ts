// Logika murni widget "Tes mana yang merah?" (M14, keputusan 826): tanpa DOM, dites Vitest.
// Angka, nama tes yang gagal, dan hasil build dibaca saat build dari rekaman labs/api-t2/output/m14.txt (bagian B, C,
// dan E), bukan ditulis tangan. Rekaman yang bentuknya berubah, jumlah tes gagal yang tidak cocok dengan daftar
// namanya, atau tebakan yang tidak punya tepat satu jawaban cocok menggagalkan build.

export type Mode = "dengan" | "tanpa";
export type KodeSalinan = "asli" | "tanpa";

export interface HasilTes { exit: number; lolos: number; gagal: number; dilewati: number }
export interface BarisKode { kode: KodeSalinan; pemanggil: number; tanpaPostgres: HasilTes; denganPostgres: HasilTes }
export interface Rekaman {
  baris: Record<KodeSalinan, BarisKode>;
  gagalNama: string[]; // tes yang gagal pada kode tanpa pemeriksaan, dengan PostgreSQL
  bisaBangun: boolean; // go build dan go vet pada kode tanpa pemeriksaan
}
export interface Fakta { bisaBangun: boolean; unitPeriksaGagal: boolean; kirimGagal: boolean }

const SEL = String.raw`exit (\d+) · (\d+) lolos · (\d+) gagal · (\d+) dilewati`;
const POLA_BARIS = new RegExp(String.raw`^(kode asli api-t2|tanpa pemeriksaan) \| (\d+) \| ${SEL} \| ${SEL}$`);
const NAMA_UNIT = "TestBatasHarian"; // memanggil periksaBatas langsung, tanpa database

const sel = (m: RegExpMatchArray, dari: number): HasilTes => ({
  exit: Number(m[dari]), lolos: Number(m[dari + 1]), gagal: Number(m[dari + 2]), dilewati: Number(m[dari + 3]),
});

export function bacaRekaman(teks: string): Rekaman {
  const baris = teks.split("\n");
  const kepala = baris.findIndex((b) => b.startsWith("# kode | pemanggil periksaBatas"));
  if (kepala < 0) throw new Error("rekaman m14: baris kepala ringkasan (# kode | pemanggil ...) tidak ada");
  const hasil: Partial<Record<KodeSalinan, BarisKode>> = {};
  for (const b of baris.slice(kepala + 1)) {
    const m = b.match(POLA_BARIS);
    if (!m) break;
    const kode: KodeSalinan = m[1] === "kode asli api-t2" ? "asli" : "tanpa";
    hasil[kode] = { kode, pemanggil: Number(m[2]), tanpaPostgres: sel(m, 3), denganPostgres: sel(m, 7) };
  }
  if (!hasil.asli || !hasil.tanpa) throw new Error("rekaman m14: ringkasan harus punya baris kode asli dan tanpa pemeriksaan");

  const gagalNama = [...teks.matchAll(/^--- FAIL: (\w+)/gm)].map((m) => m[1]!);
  if (gagalNama.length !== hasil.tanpa.denganPostgres.gagal) {
    throw new Error(`rekaman m14: ringkasan menulis ${hasil.tanpa.denganPostgres.gagal} tes gagal, bagian C memuat ${gagalNama.length}`);
  }
  if (!/^--- PASS: TestBatasHarian$/m.test(teks)) throw new Error("rekaman m14: TestBatasHarian lolos pada kode tanpa pemeriksaan tidak ada di bagian C");

  const i = baris.findIndex((b) => b.startsWith("$ go build ./... && go vet ./..."));
  if (i < 0) throw new Error("rekaman m14: perintah go build dan go vet tidak ada di bagian B");
  const status = (baris[i + 1] ?? "").match(/^# exit status (\d+)$/);
  if (!status) throw new Error("rekaman m14: hasil go build dan go vet tidak punya baris exit status");
  return { baris: hasil as Record<KodeSalinan, BarisKode>, gagalNama, bisaBangun: status[1] === "0" };
}

/** Fakta dari rekaman yang dipakai untuk menilai tebakan. */
export function faktaDari(r: Rekaman): Fakta {
  return {
    bisaBangun: r.bisaBangun,
    unitPeriksaGagal: r.gagalNama.includes(NAMA_UNIT),
    kirimGagal: r.gagalNama.some((n) => n !== NAMA_UNIT),
  };
}

export interface PilihanTebak extends Fakta { teks: string; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang faktanya sama dengan rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], fakta: Fakta): number {
  const cocok = pilihan.flatMap((p, i) =>
    p.bisaBangun === fakta.bisaBangun && p.unitPeriksaGagal === fakta.unitPeriksaGagal && p.kirimGagal === fakta.kirimGagal ? [i] : [],
  );
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan rekaman, harus tepat satu`);
  return cocok[0]!;
}

export interface BarisTabel { kode: KodeSalinan; pemanggil: number; hasil: HasilTes }

/** Dua baris tabel untuk satu cara menjalankan tes. */
export function tabelMode(r: Rekaman, mode: Mode): BarisTabel[] {
  return (["asli", "tanpa"] as const).map((k) => ({
    kode: k,
    pemanggil: r.baris[k].pemanggil,
    hasil: mode === "dengan" ? r.baris[k].denganPostgres : r.baris[k].tanpaPostgres,
  }));
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
