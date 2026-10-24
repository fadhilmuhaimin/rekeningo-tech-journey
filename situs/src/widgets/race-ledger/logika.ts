// Logika murni widget race ledger (W2-race, keputusan 707–711): tanpa DOM, tanpa Zod (island tidak memuatnya), dites
// Vitest. Widget hanya memutar ulang rekaman labs/b3-race (keputusan 430–434); tidak ada saldo, status, SQLSTATE, atau
// retry yang dihitung sendiri. siapkan() mencocokkan setiap replay dengan baris banding.txt dari run yang sama dan
// gagal keras bila berbeda, jadi rekaman ulang yang berubah menggagalkan build dan tes, bukan diam-diam tampil.
//
// Pemecahan konsep (skill visualisasi, Langkah 1):
// 1. Pertanyaan: dua transfer dari saldo Budi yang sama berjalan hampir bersamaan; saldo Budi akhirnya berapa, dan apa
//    yang diterima transfer kedua?
// 2. Aktor: HP Budi (client A), tablet Budi (client B), PostgreSQL (saldo yang sudah COMMIT, row lock baris buku).
// 3. Langkah: statement rekaman satu per satu (12–17 per cara), waktu turun.
// 4. Ubah satu hal: cara mengunci (tanpa lock dua urutan, FOR UPDATE, UPDATE atomik, optimistic, SERIALIZABLE).
// 5. Tebakan: tiga saldo akhir yang mungkin (keduanya berhasil, hanya HP, hanya tablet) + "Belum tahu".
import type { LabelRace, RekamanLedger } from "./skema";
import { rupiah } from "../jumlah-total/logika";

export { rupiah };

export type Pelaku = "A" | "B";
export type Langkah = RekamanLedger["steps"][number];

/** Satu baris labs/b3-race/output/ledger/banding.txt (tabel psql). */
export interface BarisBanding {
  cara: string;
  A: string;
  B: string;
  menunggu: number;
  retry: number;
  saldo: number;
  cache: number;
  jurnal: number;
}

const KOLOM_BANDING = ["cara", "A", "B", "menunggu", "retry", "saldo", "cache", "jurnal"];

/** Baca tabel psql di banding.txt. Kepala, pemisah, jumlah kolom, angka, dan "(n rows)" diperiksa. */
export function bacaBanding(teks: string): BarisBanding[] {
  const baris = teks.split("\n");
  const k = baris.findIndex((b) => /^\s*cara\s*\|/.test(b));
  if (k < 0) throw new Error("banding.txt: kepala tabel tidak ada");
  const kepala = baris[k]!.split("|").map((s) => s.trim());
  if (kepala.join("|") !== KOLOM_BANDING.join("|")) throw new Error(`banding.txt: kolom ${kepala.join("|")}`);
  if (!/^-+(\+-+)+$/.test(baris[k + 1]?.trim() ?? "")) throw new Error("banding.txt: pemisah kepala tidak ada");
  const angka = (s: string) => {
    if (!/^-?\d+$/.test(s)) throw new Error(`banding.txt: "${s}" bukan angka`);
    return Number(s);
  };
  const hasil: BarisBanding[] = [];
  let i = k + 2;
  for (; i < baris.length && !/^\(\d+ rows?\)$/.test(baris[i]!.trim()); i++) {
    const sel = baris[i]!.split("|").map((s) => s.trim());
    if (sel.length !== KOLOM_BANDING.length) throw new Error(`banding.txt baris ${i + 1}: ${sel.length} kolom`);
    hasil.push({ cara: sel[0]!, A: sel[1]!, B: sel[2]!, menunggu: angka(sel[3]!), retry: angka(sel[4]!), saldo: angka(sel[5]!), cache: angka(sel[6]!), jurnal: angka(sel[7]!) });
  }
  const m = baris[i]?.trim().match(/^\((\d+) rows?\)$/);
  if (!m || Number(m[1]) !== hasil.length) throw new Error(`banding.txt: ${hasil.length} baris, penutup "${baris[i] ?? ""}"`);
  return hasil;
}

/** Error database di hasil statement: "ERROR 40001 serialization_failure: ..." → kode dan nama SQLSTATE. */
export interface ErrorDb {
  kode: string;
  nama: string;
  langkah: number; // nomor langkah, mulai 1
}

export function errorDatabase(langkah: Langkah[]): ErrorDb[] {
  return langkah.flatMap((s, i) => {
    const m = s.result.match(/^ERROR ([0-9A-Z]{5}) ([a-z_]+)\b/);
    return m ? [{ kode: m[1]!, nama: m[2]!, langkah: i + 1 }] : [];
  });
}

/** Langkah yang tertahan row lock (hasil "MENUNGGU lock"). */
export const jumlahMenunggu = (langkah: Langkah[]) => langkah.filter((s) => s.result === "MENUNGGU lock").length;

/** Retry terbesar yang ditulis kode aplikasi di rekaman: "... (retry 1)". */
export function jumlahRetry(langkah: Langkah[]): number {
  return Math.max(0, ...langkah.flatMap((s) => (s.sql === null ? [...s.result.matchAll(/\(retry (\d+)\)/g)].map((m) => Number(m[1])) : [])));
}

/** Satu replay yang siap diputar island: data rekaman + ringkasan dari banding.txt. Bisa diserialisasi. */
export interface ReplayRace {
  cara: string; // ledger-for-update → for-update
  judul: string;
  ringkasan: string;
  postgres: string;
  isolation: string;
  tanggal: string;
  awal: number;
  kirim: { A: number; B: number };
  akhir: number;
  file: string;
  kepala: string;
  langkah: Langkah[];
  hasil: { A: string; B: string; menunggu: number; retry: number; error: ErrorDb[] };
}

/** Gabungkan satu rekaman dengan baris banding.txt-nya (judul = kolom cara). Gagal bila angka keduanya berbeda. */
export function siapkan(r: RekamanLedger, banding: BarisBanding[], dir: string): ReplayRace {
  const b = banding.find((x) => x.cara === r.title);
  if (!b) throw new Error(`${r.id}: "${r.title}" tidak ada di banding.txt`);
  const menunggu = jumlahMenunggu(r.steps);
  const retry = jumlahRetry(r.steps);
  const beda = [
    b.saldo !== r.final && `saldo ${b.saldo} lawan final ${r.final}`,
    b.menunggu !== menunggu && `menunggu ${b.menunggu} lawan ${menunggu} langkah MENUNGGU lock`,
    b.retry !== retry && `retry ${b.retry} lawan ${retry} di catatan kode aplikasi`,
  ].filter(Boolean);
  if (beda.length) throw new Error(`${r.id} tidak cocok dengan banding.txt: ${beda.join("; ")}`);
  return {
    cara: r.id.replace(/^ledger-/, ""),
    judul: r.title,
    ringkasan: r.summary,
    postgres: r.postgres.split(" ")[0]!,
    isolation: r.isolation,
    tanggal: r.recorded,
    awal: r.start,
    kirim: r.withdraw,
    akhir: r.final,
    file: `${dir}/${r.id}.json`,
    kepala: `${dir}/${r.id}.txt`,
    langkah: r.steps,
    hasil: { A: b.A, B: b.B, menunggu, retry, error: errorDatabase(r.steps) },
  };
}

/** Isi {nama} di teks label. Nama yang tidak diberi nilai adalah kesalahan data, bukan teks kosong. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`label "${teks}": {${k}} tidak diisi`);
    return String(nilai[k]);
  });
}

/** Seperti isi(), tetapi nilai bernama `kode` dikembalikan sebagai bagian tersendiri (ditulis sebagai <code>). */
export function bagian(teks: string, nilai: Record<string, string | number>, kode: string[]): { teks: string; kode: boolean }[] {
  return teks
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((p) => {
      const k = p.match(/^\{(\w+)\}$/)?.[1];
      return k && kode.includes(k) ? { teks: isi(p, nilai), kode: true } : { teks: isi(p, nilai), kode: false };
    });
}

/** Replay yang tampil pertama: `awal` bila diberikan (harus ada), kalau tidak replay pertama. */
export function indeksAwal(daftar: ReplayRace[], awal?: string): number {
  if (!daftar.length) throw new Error("race ledger: daftar replay kosong");
  const cara = daftar.map((r) => r.cara);
  if (new Set(cara).size !== cara.length) throw new Error(`race ledger: cara ganda ${cara.join(",")}`);
  if (awal === undefined) return 0;
  const i = cara.indexOf(awal);
  if (i < 0) throw new Error(`race ledger: awal "${awal}" tidak ada di ${cara.join(",")}`);
  return i;
}

/** Tiga saldo akhir yang mungkin dari angka rekaman: keduanya berhasil, hanya A, hanya B. Jawaban harus di antaranya. */
export function opsiTebakan(r: ReplayRace): number[] {
  const v = [...new Set([r.awal - r.kirim.A - r.kirim.B, r.awal - r.kirim.A, r.awal - r.kirim.B])].sort((a, b) => a - b);
  if (!v.includes(r.akhir)) throw new Error(`${r.cara}: saldo akhir ${r.akhir} tidak ada di pilihan ${v.join(",")}`);
  return v;
}

/** Tebakan: saldo yang dipilih, atau "belum" (Belum tahu). */
export type Tebakan = number | "belum";

export function nilaiTebakan(r: ReplayRace, t: Tebakan): "benar" | "meleset" | "belum" {
  return t === "belum" ? "belum" : t === r.akhir ? "benar" : "meleset";
}

/** Berikutnya hanya sesudah menebak, sampai langkah terakhir; Sebelumnya sampai 0. */
export const maju = (pos: number, n: number, ditebak: boolean) => (ditebak && pos < n ? pos + 1 : pos);
export const mundur = (pos: number) => Math.max(0, pos - 1);

export type JenisStatus = "siap" | "jalan" | "menunggu" | "selesai";
export interface Klien {
  status: JenisStatus;
  akhir?: string; // hasil client dari banding.txt sesudah langkah terakhirnya
  vars: Partial<Record<"saldo_dibaca" | "versi", number>>;
}

/** Keadaan sesudah `i` langkah ditampilkan (0 = belum ada langkah). */
export function keadaan(r: ReplayRace, i: number) {
  const n = r.langkah.length;
  if (!Number.isInteger(i) || i < 0 || i > n) throw new Error(`${r.cara}: langkah ${i} di luar 0..${n}`);
  const s = i > 0 ? r.langkah[i - 1]! : null;
  const klien = (p: Pelaku): Klien => {
    const vars = s ? s.vars[p] : {};
    if (s?.waiting.includes(p)) return { status: "menunggu", vars };
    if (!r.langkah.slice(0, i).some((x) => x.actor === p)) return { status: "siap", vars };
    if (!r.langkah.slice(i).some((x) => x.actor === p)) return { status: "selesai", akhir: r.hasil[p], vars };
    return { status: "jalan", vars };
  };
  return { sekarang: s, saldo: s ? s.committed : r.awal, lock: s?.lock ?? null, A: klien("A"), B: klien("B"), selesai: i === n };
}

/** Client lain yang sedang menunggu lock saat langkah ini (lajurnya bergaris putus-putus). */
export const tungguLain = (s: Langkah) => s.waiting.filter((w) => w !== s.actor);

/** Langkah keputusan kode aplikasi, bukan statement. */
export const langkahKode = (s: Langkah) => s.sql === null;

export interface Fakta {
  kunci: "saldo" | "A" | "B" | "menunggu" | "retry" | "sqlstate";
  label: string;
  nilai: string;
}

/** Ringkasan hasil satu replay, semuanya dari rekaman dan banding.txt. */
export function fakta(r: ReplayRace, L: LabelRace): Fakta[] {
  const err = r.hasil.error.map((e) => `${e.kode} ${e.nama}`).join(", ");
  return [
    { kunci: "saldo", label: L.saldoAkhir, nilai: rupiah(r.akhir) },
    { kunci: "A", label: L.klien.A, nilai: r.hasil.A },
    { kunci: "B", label: L.klien.B, nilai: r.hasil.B },
    { kunci: "menunggu", label: L.fakta.menunggu, nilai: isi(L.fakta.langkah, { n: r.hasil.menunggu }) },
    { kunci: "retry", label: L.fakta.retry, nilai: String(r.hasil.retry) },
    { kunci: "sqlstate", label: L.fakta.sqlstate, nilai: err || L.fakta.tanpaError },
  ];
}

/** Ubah satu hal: fakta yang berubah dan yang sama antara dua replay. */
export function beda(lama: Fakta[], baru: Fakta[]) {
  const berubah: { label: string; lama: string; baru: string }[] = [];
  const sama: Fakta[] = [];
  baru.forEach((f) => {
    const l = lama.find((x) => x.kunci === f.kunci);
    if (!l) throw new Error(`fakta ${f.kunci} tidak ada di pembanding`);
    if (l.nilai === f.nilai) sama.push(f);
    else berubah.push({ label: f.label, lama: l.nilai, baru: f.nilai });
  });
  return { berubah, sama };
}

/** Catat cara yang baru selesai diputar sampai langkah terakhir; urutan = urutan selesai. */
export const tandaiSelesai = (selesai: string[], cara: string) => [...selesai.filter((c) => c !== cara), cara];

/** Pembanding untuk "ubah satu hal": cara lain yang paling akhir selesai diputar. */
export function pembanding(selesai: string[], sekarang: string): string | null {
  return [...selesai].reverse().find((c) => c !== sekarang) ?? null;
}

/** Cara yang ditawarkan sesudah selesai: berikutnya dalam urutan yang belum selesai, kalau semua sudah, berikutnya. */
export function caraBerikutnya(daftar: string[], sekarang: string, selesai: string[]): string | null {
  if (daftar.length < 2) return null;
  const i = daftar.indexOf(sekarang);
  if (i < 0) throw new Error(`cara "${sekarang}" tidak ada`);
  const putar = [...daftar.slice(i + 1), ...daftar.slice(0, i)];
  return putar.find((c) => !selesai.includes(c)) ?? putar[0]!;
}
