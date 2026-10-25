// Logika murni widget "Kapan pool koneksi penuh?" (W3-pool, keputusan 980): tanpa DOM, tanpa Math.random, dites Vitest.
// Model (Ilustrasi mekanisme; angka acuan di rekaman.ts dari labs/t3-pool/output):
//   - pembayaran ke-j datang pada detik j ÷ λ (jadwal tetap seperti lab: λ = 17,4 ÷ 20 = 0,87 per detik);
//   - satu pembayaran memegang satu koneksi selama W = W0 + lama push di dalam transaction, dibatasi timeout push
//     (pengaman "timeout-push") atau 0 bila push di luar transaction (pengaman "di-luar", lewat outbox);
//   - client app menyerah T detik sesudah datang (tClient): transaction dibatalkan dan koneksi kembali (m18.txt C;
//     R3-63), atau pembayaran keluar dari antrean bila belum dapat koneksi;
//   - pool berisi n koneksi, antrean FIFO. L = λ × W (Little's Law): rata-rata koneksi yang dipegang.
// Pembacaan saldo tidak dimodelkan sebagai beban: ia hanya butuh satu koneksi sebentar dan menunggu bila semua n koneksi
// dipegang pembayaran (m18.txt A: 190 dari 190 pembacaan sesudah pool penuh tanpa jawaban).

export type Pengaman = "tidak" | "timeout-push" | "idle-tx" | "di-luar";

export interface Param {
  n: number; // ukuran pool
  t: number | null; // detik layanan push menjawab; null = tidak pernah
  tClient: number | null; // client app menyerah sesudah sekian detik; null = tanpa batas
  pengaman: Pengaman;
}
export interface Aturan {
  lambda: number; // pembayaran per detik
  w0: number; // detik, W di luar push (Asumsi)
  timeoutPush: number; // detik, pengaman "timeout-push"
  idleTx: number; // detik, pengaman "idle-tx" (hanya melindungi PostgreSQL)
}
export const HORIZON = 62; // detik; cukup untuk pool 50 (penuh pada 57,5) dan pengamatan akhir m18.txt B (61,6)

/** Lama layanan push yang ditunggu di dalam transaction. */
export function lamaPush(p: Param, a: Aturan): number {
  if (p.pengaman === "di-luar") return 0;
  const t = p.t ?? Infinity;
  return p.pengaman === "timeout-push" ? Math.min(t, a.timeoutPush) : t;
}
/** Lama satu pembayaran memegang koneksi (W), sudah dibatasi client yang menyerah. */
export function lamaTahan(p: Param, a: Aturan): number {
  return Math.min(a.w0 + lamaPush(p, a), p.tClient ?? Infinity);
}
/** L = λ × W. */
export function littleL(p: Param, a: Aturan): number {
  return a.lambda * lamaTahan(p, a);
}
/** Detik pool penuh menurut rumus: n ÷ λ, hanya bila koneksi ke-1 masih dipegang saat pembayaran ke-n datang. */
export function waktuPenuhRumus(p: Param, a: Aturan): number | null {
  return littleL(p, a) > p.n - 1 + 1e-9 ? p.n / a.lambda : null;
}
/** Koneksi terpakai paling banyak menurut rumus tanpa antrean: ⌈λ × W⌉, paling besar n. */
export function puncakRumus(p: Param, a: Aturan): number {
  const L = littleL(p, a);
  return Number.isFinite(L) ? Math.min(p.n, Math.max(1, Math.ceil(L - 1e-9))) : p.n;
}

export interface Bayar {
  datang: number;
  mulai: number; // detik koneksi didapat; Infinity bila tidak pernah
  selesai: number; // detik koneksi kembali; Infinity bila tidak pernah
  pergi: number; // detik client menyerah; Infinity bila tanpa batas
  menyerah: boolean; // client benar-benar menyerah sebelum pembayaran selesai
}

/** Simulasi deterministik antrean FIFO n koneksi sampai `horizon` detik. */
export function simulasi(p: Param, a: Aturan, horizon: number = HORIZON): Bayar[] {
  const S = a.w0 + lamaPush(p, a);
  const bebas: number[] = Array.from({ length: p.n }, () => 0);
  const hasil: Bayar[] = [];
  for (let j = 1; j / a.lambda <= horizon + 1e-9; j++) {
    const datang = j / a.lambda;
    const pergi = p.tClient === null ? Infinity : datang + p.tClient;
    let k = 0;
    for (let i = 1; i < bebas.length; i++) if (bebas[i]! < bebas[k]!) k = i;
    const mulai = Math.max(datang, bebas[k]!);
    if (mulai >= pergi) {
      hasil.push({ datang, mulai: Infinity, selesai: Infinity, pergi, menyerah: Number.isFinite(pergi) });
      continue;
    }
    const selesai = Math.min(mulai + S, pergi);
    bebas[k] = selesai;
    hasil.push({ datang, mulai, selesai, pergi, menyerah: Number.isFinite(pergi) && mulai + S >= pergi });
  }
  return hasil;
}

export const terpakaiPada = (j: Bayar[], x: number): number => j.filter((r) => r.mulai <= x && x < r.selesai).length;
export const menungguPada = (j: Bayar[], x: number): number => j.filter((r) => r.datang <= x && x < Math.min(r.mulai, r.pergi)).length;

export interface Keadaan {
  dikirim: number; // pembayaran yang sudah masuk
  terpakai: number; // memegang koneksi
  menunggu: number; // menunggu koneksi
  menyerah: number; // client yang sudah menyerah
  pg: number; // sesi idle in transaction di PostgreSQL bila idle_in_transaction_session_timeout menyala
}
export function keadaanPada(j: Bayar[], x: number, a: Aturan): Keadaan {
  return {
    dikirim: j.filter((r) => r.datang <= x).length,
    terpakai: terpakaiPada(j, x),
    menunggu: menungguPada(j, x),
    menyerah: j.filter((r) => r.menyerah && r.pergi <= x).length,
    pg: j.filter((r) => r.mulai <= x && x < Math.min(r.selesai, r.mulai + a.idleTx)).length,
  };
}

export interface Ringkas {
  puncak: number; // koneksi terpakai paling banyak
  puncakPg: number; // sesi idle in transaction paling banyak di PostgreSQL (idle-tx)
  waktuPenuh: number | null; // detik semua n koneksi terpakai untuk pertama kali
  antreMulai: number | null; // detik pertama ada pembayaran yang harus menunggu koneksi
}
export function ringkas(j: Bayar[], p: Param, a: Aturan): Ringkas {
  const mulai = j.map((r) => r.mulai).filter(Number.isFinite);
  const jumlah = mulai.map((s) => terpakaiPada(j, s));
  const puncak = jumlah.length ? Math.max(...jumlah) : 0;
  const penuh = mulai.filter((_, i) => jumlah[i] === p.n);
  const antre = j.filter((r) => r.mulai > r.datang).map((r) => r.datang);
  const pg = mulai.map((s) => keadaanPada(j, s, a).pg);
  return {
    puncak,
    puncakPg: pg.length ? Math.max(...pg) : 0,
    waktuPenuh: penuh.length ? Math.min(...penuh) : null,
    antreMulai: antre.length ? Math.min(...antre) : null,
  };
}

export type Vonis = "muat" | "sempat" | "penuh";
/** muat: pool tidak pernah penuh; sempat: semua koneksi terpakai tetapi tidak ada yang menunggu; penuh: ada yang menunggu. */
export function vonis(r: Ringkas): Vonis {
  if (r.waktuPenuh === null) return "muat";
  return r.antreMulai === null ? "sempat" : "penuh";
}

/** Koneksi terpakai pada detik 0..horizon (satu batang tiap detik). */
export function deret(j: Bayar[], horizon: number = HORIZON): number[] {
  return Array.from({ length: horizon + 1 }, (_, x) => terpakaiPada(j, x));
}

// --- Titik acuan dari rekaman -------------------------------------------------------------------------------------

export type KunciAcuan = "A" | "B" | "C" | "D" | "E" | "F" | "L03" | "L2" | "L10";
export interface AcuanDef { kunci: KunciAcuan; param: Param }

export const samaParam = (a: Param, b: Param): boolean => a.n === b.n && a.t === b.t && a.tClient === b.tClient && a.pengaman === b.pengaman;
export function cariAcuan(p: Param, daftar: AcuanDef[]): KunciAcuan | null {
  return daftar.find((d) => samaParam(d.param, p))?.kunci ?? null;
}

// --- Teks -----------------------------------------------------------------------------------------------------------

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
/** Angka dengan koma desimal: (11,494, 1) → "11,5". */
export const koma = (x: number, d: number): string => x.toFixed(d).replace(".", ",");
/** Detik seperti di rekaman: bilangan bulat tanpa desimal, selain itu satu desimal. */
export const detikTeks = (x: number): string => (Number.isInteger(x) ? String(x) : koma(x, 1));
export const lTeks = (L: number): string => (Number.isFinite(L) ? koma(L, 3) : "tak terhingga");
export const lambdaTeks = (a: Aturan): string => koma(a.lambda, 2);

/** Cara W dihitung, untuk ditulis di samping hasilnya. */
export function caraW(p: Param, a: Aturan): string {
  const w0 = koma(a.w0, 2);
  const t = p.t === null ? "∞" : detikTeks(p.t);
  const dasar =
    p.pengaman === "di-luar" ? w0
    : p.pengaman === "timeout-push" ? `${w0} + min(${t}, ${a.timeoutPush})`
    : `${w0} + ${t}`;
  return p.tClient === null ? dasar : `min(${dasar}, ${p.tClient})`;
}
/** W dalam detik tanpa nol di belakang koma: "2,02", "5", atau "tak terhingga". */
export function wTeks(p: Param, a: Aturan): string {
  const w = lamaTahan(p, a);
  return Number.isFinite(w) ? koma(w, 2).replace(/(,\d*?)0+$/, "$1").replace(/,$/, "") : "tak terhingga";
}

export interface PilihanTebak { teks: string; detik: number | null }
/** Indeks pilihan yang benar: tepat satu pilihan yang detiknya jatuh di "antara detik ke-{dari} dan ke-{sampai}" rekaman A. */
export function indeksBenar(pilihan: PilihanTebak[], dari: number, sampai: number): number {
  const cocok = pilihan.flatMap((q, i) => (q.detik !== null && q.detik >= dari && q.detik <= sampai ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan jatuh antara detik ke-${dari} dan ke-${sampai}, harus tepat satu`);
  return cocok[0]!;
}
