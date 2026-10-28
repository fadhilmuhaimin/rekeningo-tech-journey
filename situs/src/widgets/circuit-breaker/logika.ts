// Logika murni widget "Circuit breaker interaktif" (W4-breaker, keputusan 1262): tanpa DOM, tanpa Math.random, tanpa jam
// sungguhan, dites Vitest. Pemecahan konsep:
//   pertanyaan : saat vendor verifikasi gagal atau lambat, kapan breaker membuka, permintaan mana yang ditolak cepat, dan
//                pekerjaan mana yang tetap hidup?
//   aktor      : pemanggil (request sinkron atau worker queue), breaker, vendor tiruan;
//   langkah    : jam simulasi 0 sampai 179 detik; tiap detik satu permintaan (sinkron) atau worker mengklaim pekerjaan (queue);
//   ubah satu  : jalur, error rate, latensi, jenis jawaban error (dan apakah 4xx dihitung sukses), breaker, pulihnya vendor,
//                jumlah worker serentak;
//   tebakan    : berapa dari 10 pekerjaan sudah mati sebelum breaker membuka (lajur.txt bagian B).
// Model (Simulasi; angka ambang dan jadwal dari labs/t4-integrasi/output lewat rekaman.ts, mesin keadaan di breaker.ts):
//   - waktu bilangan bulat detik; latensi bilangan bulat; permintaan yang melewati timeout (3 detik) menjadi timeout;
//   - error rate: urutan hasil acak berbenih tetap (acak per nomor permintaan), jadi error rate lebih tinggi hanya menambah
//     kegagalan; dalam jenis 4xx di queue, error rate menentukan berapa dari pekerjaan terdepan yang dokumennya rusak;
//   - worker queue: backoff 0 (seperti lab), pekerjaan yang gagal langsung diklaim lagi, urutan klaim menurut nomor;
//     lajur terbuka tidak diklaim, lajur setengah terbuka diklaim satu baris, baris yang ditolak breaker dilepas tanpa
//     menaikkan percobaan; permintaan percobaan di half-open memakai percobaan pekerjaan terdepan (temuan peninjau lab);
//   - jalur sinkron dengan breaker tidak ada di lab: seluruh jalur sinkron adalah Simulasi.
import { Breaker, acak, type PengaturanBreaker, type Status } from "./breaker";

export type { Status } from "./breaker";
export type Jalur = "sinkron" | "queue";
export type Jenis = "5xx" | "4xx-gagal" | "4xx-sukses";
export type Pulih = "sementara" | "terus";
export type HasilVendor = "ok" | "5xx" | "timeout" | "4xx";
export const JALUR: readonly Jalur[] = ["sinkron", "queue"];
export const JENIS: readonly Jenis[] = ["5xx", "4xx-gagal", "4xx-sukses"];
export const PULIH: readonly Pulih[] = ["sementara", "terus"];
export const HORIZON = 180; // detik simulasi: tiga baris satu menit, sama dengan Timeout breaker (60 detik)
export const BARIS = 60; // detik per baris pada papan

export interface Param {
  jalur: Jalur;
  error: number; // persen 0 sampai 100
  latensi: number; // detik, bilangan bulat; di atas timeout berarti timeout
  jenis: Jenis;
  breaker: boolean;
  pulih: Pulih; // hanya berlaku untuk jenis 5xx
  serentak: number; // slot worker (queue)
}
export interface Aturan extends PengaturanBreaker {
  timeout: number; // batas waktu client (detik)
  percobaan: number; // percobaan paling banyak per pekerjaan
  pekerjaan: number; // pekerjaan verifikasi yang menunggu saat vendor gagal
  pulihDetik: number; // detik vendor pulih pada pulih = sementara (Simulasi)
  benih: number; // benih urutan acak (Simulasi)
}

function salahMasukan(p: Param, a: Aturan): string[] {
  const salah: string[] = [];
  const bulat = (x: number, min: number, maks: number) => Number.isInteger(x) && x >= min && x <= maks;
  if (!JALUR.includes(p.jalur)) salah.push(`jalur ${String(p.jalur)} tidak dikenal`);
  if (!JENIS.includes(p.jenis)) salah.push(`jenis ${String(p.jenis)} tidak dikenal`);
  if (!PULIH.includes(p.pulih)) salah.push(`pulih ${String(p.pulih)} tidak dikenal`);
  if (!bulat(p.error, 0, 100)) salah.push(`error ${p.error} harus bilangan bulat 0 sampai 100`);
  if (!bulat(p.latensi, 0, 600)) salah.push(`latensi ${p.latensi} harus bilangan bulat detik 0 sampai 600`);
  if (!bulat(p.serentak, 1, 16)) salah.push(`serentak ${p.serentak} harus bilangan bulat 1 sampai 16`);
  if (typeof p.breaker !== "boolean") salah.push("breaker harus benar atau salah");
  if (!bulat(a.timeout, 1, 600)) salah.push(`timeout ${a.timeout} harus bilangan bulat detik > 0`);
  if (!bulat(a.percobaan, 1, 99)) salah.push(`percobaan ${a.percobaan} harus bilangan bulat 1 sampai 99`);
  if (!bulat(a.pekerjaan, 1, 99)) salah.push(`pekerjaan ${a.pekerjaan} harus bilangan bulat 1 sampai 99`);
  if (!bulat(a.pulihDetik, 0, HORIZON)) salah.push(`pulihDetik ${a.pulihDetik} harus bilangan bulat 0 sampai ${HORIZON}`);
  if (!bulat(a.bukaDetik, 1, 3600)) salah.push(`bukaDetik ${a.bukaDetik} harus bilangan bulat detik > 0`);
  if (!Number.isInteger(a.benih)) salah.push("benih harus bilangan bulat");
  return salah;
}
/** Masukan yang tidak masuk akal gagal keras: latensi pecahan membuat waktu tidak lagi bilangan bulat, NaN lolos semua banding. */
export function periksaMasukan(p: Param, a: Aturan): void {
  const salah = salahMasukan(p, a);
  if (salah.length) throw new Error(`simulasi breaker: ${salah.join("; ")}`);
  new Breaker(a); // pengaturan breaker diperiksa konstruktornya
}

/** IsSuccessful: jawaban ok sukses; 4xx sukses hanya bila diatur (ADR 36), bawaan pustaka menganggapnya gagal. */
export const berhasilBagiBreaker = (h: HasilVendor, jenis: Jenis): boolean => h === "ok" || (h === "4xx" && jenis === "4xx-sukses");

export interface JawabanVendor { durasi: number; hasil: HasilVendor }
/** Jawaban vendor tiruan. `rusak`: permintaan ini kena error rate (5xx) atau membawa dokumen rusak (4xx). */
export function vendor(p: Param, a: Aturan, detik: number, rusak: boolean): JawabanVendor {
  const empat = p.jenis !== "5xx";
  const gangguan = empat || p.pulih === "terus" || detik < a.pulihDetik;
  if (!gangguan) return { durasi: 0, hasil: "ok" };
  if (p.latensi > a.timeout) return { durasi: a.timeout, hasil: "timeout" };
  return { durasi: p.latensi, hasil: rusak ? (empat ? "4xx" : "5xx") : "ok" };
}

interface Selesai { waktu: number; urut: number; generasi: number; berhasil: boolean; pekerjaan?: Pekerjaan; hasil: HasilVendor }
function urutkan(antri: Selesai[]): void {
  antri.sort((x, y) => x.waktu - y.waktu || x.urut - y.urut);
}

// --- Jalur sinkron ------------------------------------------------------------------------------------------------------

export interface SelSinkron { detik: number; status: Status; hasil: HasilVendor | "tolak"; tunggu: number }
export interface HasilSinkron {
  sel: SelSinkron[];
  kevendor: number; ditolak: number; ok: number; gagalVendor: number; empat: number; tunggu: number;
  buka: number | null; kaliBuka: number;
}

/** Satu permintaan per detik; pemanggil menunggu jawaban (atau timeout) atau ditolak cepat. */
export function simulasiSinkron(p: Param, a: Aturan): HasilSinkron {
  periksaMasukan(p, a);
  const b = p.breaker ? new Breaker(a) : null;
  const antri: Selesai[] = [];
  const sel: SelSinkron[] = [];
  let urut = 0;
  const proses = (sampai: number) => {
    urutkan(antri);
    while (antri.length && antri[0]!.waktu <= sampai) {
      const s = antri.shift()!;
      b?.sesudah(s.generasi, s.berhasil, s.waktu);
    }
  };
  for (let t = 0; t < HORIZON; t++) {
    proses(t);
    const status = b ? b.keadaan(t) : "closed";
    const izin = b ? b.sebelum(t) : ({ ok: true, generasi: 0 } as const);
    if (!izin.ok) { sel.push({ detik: t, status, hasil: "tolak", tunggu: 0 }); continue; }
    const v = vendor(p, a, t, acak(a.benih, t) < p.error / 100);
    antri.push({ waktu: t + v.durasi, urut: urut++, generasi: izin.generasi, berhasil: berhasilBagiBreaker(v.hasil, p.jenis), hasil: v.hasil });
    sel.push({ detik: t, status, hasil: v.hasil, tunggu: v.durasi });
  }
  const hitung = (f: (s: SelSinkron) => boolean) => sel.filter(f).length;
  return {
    sel,
    kevendor: hitung((s) => s.hasil !== "tolak"),
    ditolak: hitung((s) => s.hasil === "tolak"),
    ok: hitung((s) => s.hasil === "ok"),
    gagalVendor: hitung((s) => s.hasil === "5xx" || s.hasil === "timeout"),
    empat: hitung((s) => s.hasil === "4xx"),
    tunggu: sel.reduce((j, s) => j + s.tunggu, 0),
    buka: b?.perpindahan.find((x) => x.ke === "open")?.detik ?? null,
    kaliBuka: b?.kaliBuka ?? 0,
  };
}

// --- Jalur queue --------------------------------------------------------------------------------------------------------

export type StatusPekerjaan = "menunggu" | "terkirim" | "mati";
export interface Pekerjaan { id: number; percobaan: number; status: StatusPekerjaan; riwayat: ("ok" | "gagal")[] }
export interface SelQueue { detik: number; status: Status; percobaan: number; gagal: number }
export interface HasilQueue {
  sel: SelQueue[];
  pekerjaan: Pekerjaan[];
  saatBuka: Pekerjaan[] | null; // keadaan pekerjaan di akhir detik breaker pertama kali membuka
  kevendor: number; probe: number; buka: number | null; kaliBuka: number;
}

const salin = (js: Pekerjaan[]): Pekerjaan[] => js.map((j) => ({ ...j, riwayat: [...j.riwayat] }));

/** `pekerjaan` pekerjaan menunggu di t = 0; worker `serentak` slot, backoff 0, urutan klaim menurut nomor. */
export function simulasiQueue(p: Param, a: Aturan): HasilQueue {
  periksaMasukan(p, a);
  const b = p.breaker ? new Breaker(a) : null;
  const js: Pekerjaan[] = Array.from({ length: a.pekerjaan }, (_, i) => ({ id: i + 1, percobaan: 0, status: "menunggu", riwayat: [] }));
  const jalan = new Set<number>();
  const antri: Selesai[] = [];
  const sel: SelQueue[] = [];
  const rusakEmpat = Math.round((p.error * a.pekerjaan) / 100); // dokumen rusak: pekerjaan terdepan (lajur.txt bagian D dan E)
  let urut = 0, kevendor = 0, probe = 0;
  let saatBuka: Pekerjaan[] | null = null;
  const proses = (sampai: number) => {
    urutkan(antri);
    while (antri.length && antri[0]!.waktu <= sampai) {
      const s = antri.shift()!;
      const j = s.pekerjaan!;
      jalan.delete(j.id);
      j.riwayat.push(s.hasil === "ok" ? "ok" : "gagal");
      j.status = s.hasil === "ok" ? "terkirim" : j.percobaan >= a.percobaan ? "mati" : "menunggu";
      b?.sesudah(s.generasi, s.berhasil, s.waktu);
    }
  };
  for (let t = 0; t < HORIZON; t++) {
    proses(t);
    const status = b ? b.keadaan(t) : "closed";
    const baris: SelQueue = { detik: t, status, percobaan: 0, gagal: 0 };
    for (;;) {
      proses(t);
      const k = b ? b.keadaan(t) : "closed";
      if (k === "open") break;
      const batas = k === "half-open" ? 1 : p.serentak - jalan.size;
      const kandidat = js.filter((j) => j.status === "menunggu" && !jalan.has(j.id)).slice(0, Math.max(0, batas));
      let diterima = 0;
      for (const j of kandidat) {
        j.percobaan++;
        const izin = b ? b.sebelum(t) : ({ ok: true, generasi: 0 } as const);
        if (!izin.ok) { j.percobaan--; continue; } // dilepas: percobaan tidak bertambah
        diterima++;
        const rusak = p.jenis === "5xx" ? acak(a.benih, j.id * 100 + j.percobaan) < p.error / 100 : j.id <= rusakEmpat;
        const v = vendor(p, a, t, rusak);
        jalan.add(j.id);
        antri.push({ waktu: t + v.durasi, urut: urut++, generasi: izin.generasi, berhasil: berhasilBagiBreaker(v.hasil, p.jenis), pekerjaan: j, hasil: v.hasil });
        kevendor++;
        if (k === "half-open") probe++;
        baris.percobaan++;
        if (v.hasil !== "ok") baris.gagal++;
      }
      if (!diterima) break;
    }
    sel.push(baris);
    if (saatBuka === null && b && b.kaliBuka > 0) saatBuka = salin(js);
  }
  return { sel, pekerjaan: js, saatBuka, kevendor, probe, buka: b?.perpindahan.find((x) => x.ke === "open")?.detik ?? null, kaliBuka: b?.kaliBuka ?? 0 };
}

export type Hasil = ({ jalur: "sinkron" } & HasilSinkron) | ({ jalur: "queue" } & HasilQueue);
export function jalankan(p: Param, a: Aturan): Hasil {
  return p.jalur === "sinkron" ? { jalur: "sinkron", ...simulasiSinkron(p, a) } : { jalur: "queue", ...simulasiQueue(p, a) };
}

// --- Ringkasan dan kalimat ----------------------------------------------------------------------------------------------

export type Vonis = "sinkron-tanpa" | "sinkron-tetap" | "sinkron-membuka" | "queue-tanpa" | "queue-tetap" | "queue-membuka";
export const VONIS: readonly Vonis[] = ["sinkron-tanpa", "sinkron-tetap", "sinkron-membuka", "queue-tanpa", "queue-tetap", "queue-membuka"];
export interface Ringkas {
  vonis: Vonis;
  buka: number | null; kaliBuka: number;
  kevendor: number; kevendorTanpa: number;
  ditolak: number; tunggu: number; tungguTanpa: number; // sinkron
  mati: number; menunggu: number; terkirim: number; probe: number; // queue
  kebuka: boolean;
}
const hitungStatus = (js: Pekerjaan[], s: StatusPekerjaan) => js.filter((j) => j.status === s).length;

export function ringkas(p: Param, a: Aturan): Ringkas {
  const h = jalankan(p, a);
  const tanpa = jalankan({ ...p, breaker: false }, a);
  const dasar = { buka: h.buka, kaliBuka: h.kaliBuka, kevendor: h.kevendor, kevendorTanpa: tanpa.kevendor, kebuka: h.kaliBuka > 0 };
  if (h.jalur === "sinkron" && tanpa.jalur === "sinkron") {
    const vonis: Vonis = !p.breaker ? "sinkron-tanpa" : h.kaliBuka > 0 ? "sinkron-membuka" : "sinkron-tetap";
    return { ...dasar, vonis, ditolak: h.ditolak, tunggu: h.tunggu, tungguTanpa: tanpa.tunggu, mati: 0, menunggu: 0, terkirim: 0, probe: 0 };
  }
  if (h.jalur !== "queue") throw new Error("ringkas: jalur tidak konsisten");
  const vonis: Vonis = !p.breaker ? "queue-tanpa" : h.kaliBuka > 0 ? "queue-membuka" : "queue-tetap";
  return {
    ...dasar, vonis, ditolak: 0, tunggu: 0, tungguTanpa: 0, probe: h.probe,
    mati: hitungStatus(h.pekerjaan, "mati"), menunggu: hitungStatus(h.pekerjaan, "menunggu"), terkirim: hitungStatus(h.pekerjaan, "terkirim"),
  };
}

/** Ke jalur mana sebuah kalimat vonis dan ringkasnya berlaku. */
export const jalurVonis = (v: Vonis): Jalur => (v.startsWith("sinkron") ? "sinkron" : "queue");

// --- Hitungan (Hitungan, Asumsi): pemakaian worker dan permintaan percobaan -------------------------------------------------

/** Slot worker = laju × percobaan × detik per percobaan (hukum Little: L = λ × W). */
export const slotWorker = (laju: number, percobaan: number, detik: number): number => laju * percobaan * detik;
/** Laju verifikasi puncak (per detik) dari pendaftar per hari dan faktor puncak: 1.000 ÷ 86.400 × 10. */
export const lajuPuncak = (perHari: number, faktor: number): number => (perHari / 86400) * faktor;
export interface HitunganOutage { pekerjaan: number; probe: number; matiMaks: number }
/**
 * Selama vendor mati, tiap Timeout breaker menghabiskan satu percobaan pekerjaan terdepan (permintaan percobaan di half-open):
 * probe ≈ outage ÷ Timeout, dan paling banyak probe ÷ percobaan pekerjaan mati. Hitungan atas angka naskah, tidak dijalankan.
 */
export function hitunganOutage(outageDetik: number, bukaDetik: number, percobaan: number, lajuRataRata: number): HitunganOutage {
  if (!(outageDetik > 0 && bukaDetik > 0 && percobaan >= 1 && lajuRataRata > 0)) throw new Error("hitungan outage: masukan harus > 0");
  const probe = Math.floor(outageDetik / bukaDetik);
  return { pekerjaan: Math.round(lajuRataRata * outageDetik), probe, matiMaks: Math.floor(probe / percobaan) };
}

// --- Titik acuan dari rekaman -------------------------------------------------------------------------------------------

export interface AcuanDef { kunci: string; param: Param }
/** Pengaturan cocok bila semua yang berpengaruh sama; `pulih` hanya berpengaruh pada 5xx, `serentak` hanya di queue. */
export function samaAcuan(p: Param, d: AcuanDef): boolean {
  const q = d.param;
  if (p.jalur !== q.jalur || p.error !== q.error || p.latensi !== q.latensi || p.jenis !== q.jenis || p.breaker !== q.breaker) return false;
  if (p.jenis === "5xx" && p.pulih !== q.pulih) return false;
  return p.jalur === "sinkron" || p.serentak === q.serentak;
}
export function cariAcuan(p: Param, daftar: AcuanDef[]): string | null {
  return daftar.find((d) => samaAcuan(p, d))?.kunci ?? null;
}

// --- Teks ---------------------------------------------------------------------------------------------------------------

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
/** Angka dengan koma desimal: (1,74, 2) → "1,74". */
export const koma = (x: number, d: number): string => x.toFixed(d).replace(".", ",");
/** Ribuan dengan titik: 12600 → "12.600". */
export const ribuan = (x: number): string => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export interface PilihanTebak { teks: string; jumlah: number }
/** Indeks pilihan yang benar: tepat satu pilihan yang jumlahnya sama dengan jumlah pekerjaan mati di rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], jumlah: number): number {
  const cocok = pilihan.flatMap((q, i) => (q.jumlah === jumlah ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan berjumlah ${jumlah}, harus tepat satu`);
  return cocok[0]!;
}
