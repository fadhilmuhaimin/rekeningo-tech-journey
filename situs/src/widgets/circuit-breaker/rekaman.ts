// Pembaca rekaman lab t4-integrasi untuk widget "Circuit breaker interaktif" (W4-breaker, keputusan 1262): tanpa DOM, dites
// Vitest. Dipakai saat build (CircuitBreaker.astro) dan di tes; island tidak memuat berkas ini. Semua angka acuan widget
// berasal dari labs/t4-integrasi/output/{breaker,lajur,worker}.txt dan dari kalimat Hitungan di README lab. Rekaman yang
// berubah bentuk menggagalkan build: tiap pola harus cocok persis satu kali di bagiannya, dan angka yang saling bergantung
// diperiksa silang. Yang BUKAN dari rekaman (Simulasi): horizon 180 detik, vendor pulih pada detik 30, benih urutan acak.
import type { AcuanDef, Aturan, Param } from "./logika";

export const SIMULASI = { pulihDetik: 30, benih: 1 } as const;

export type TabelOutbox = Record<string, number>; // "mati 5" -> jumlah
export interface Rekaman {
  breaker: {
    versi: string; // gobreaker v2.4.0, dari kepala breaker.txt
    gagalKe: number; // kegagalan berturut-turut yang membuka breaker (ke-6)
    lebihDari: number; // ReadyToTrip bawaan: lebih dari 5
    bukaDetik: number; // Timeout bawaan, dari 59,999 detik = open dan 60,001 detik = half-open
    permintaanHalfOpen: number; // permintaan yang berjalan di half-open (1)
    bukaLagiDetik: number; // sesudah permintaan percobaan gagal: 59 detik open, 61 detik half-open
    empatBawaan: number; // jawaban 4xx berturut-turut yang membuka breaker dengan IsSuccessful bawaan
    empatKustom: number; // jawaban 4xx berturut-turut yang tidak membuka breaker dengan IsSuccessful kustom
  };
  lajur: {
    pendaftar: number; percobaan: number;
    a: { mati: number; permintaan: number };
    b: { kapasitas: number; awal: TabelOutbox; akhir: TabelOutbox; lulus: number; gagal: number; permintaanBuka: number; permintaanAkhir: number };
    c: { mati: number; lulus: number };
    d: { rusak: number; awal: TabelOutbox; permintaan: number };
    e: { akhir: TabelOutbox; gagal: number; lulus: number; permintaan: number };
  };
  worker: {
    serentak: number; timeoutClient: number; laju: number; percobaan: number; detik: number; slot: number; persen: number;
    lajuUang: number; detikUang: number; slotUang: number; bersama: number; kapasitas: number;
  };
  outage: { detik: number; lajuRataRata: number; probe: number; matiMaks: number; pekerjaan: number };
}

const angka = (s: string): number => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`rekaman t4-integrasi: "${s}" bukan angka`);
  return n;
};
const desimal = (s: string): number => {
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`rekaman t4-integrasi: "${s}" bukan angka`);
  return n;
};

/** Baris-baris satu bagian: dari "# --- {huruf}." sampai "# --- " berikutnya. */
function bagian(teks: string, huruf: string, nama: string): string[] {
  const baris = teks.split("\n");
  const i = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (i < 0) throw new Error(`rekaman t4-integrasi: bagian ${nama} tidak ada`);
  let j = i + 1;
  while (j < baris.length && !baris[j]!.startsWith("# --- ")) j++;
  return baris.slice(i, j);
}
function lawan(baris: string[], pola: RegExp, nama: string): RegExpMatchArray {
  const cocok = baris.map((b) => b.match(pola)).filter((m): m is RegExpMatchArray => m !== null);
  if (cocok.length !== 1) throw new Error(`rekaman t4-integrasi: baris "${nama}" cocok ${cocok.length} kali, harus tepat satu`);
  return cocok[0]!;
}
/** Tabel `status | percobaan | jumlah` hasil SELECT outbox, urut seperti di rekaman. */
function tabelOutbox(baris: string[]): TabelOutbox[] {
  const hasil: TabelOutbox[] = [];
  let kini: TabelOutbox | null = null;
  for (const b of baris) {
    if (b.startsWith("=> SELECT status, percobaan, count(*)")) { kini = {}; hasil.push(kini); continue; }
    if (b.startsWith("=> ") || b.startsWith("# ") || b.startsWith("$ ") || b.startsWith("log")) kini = null;
    const m = kini && b.match(/^ (\w+)\s+\| (\d+)\s+\| (\d+)$/);
    if (kini && m && m[1] !== "status") kini[`${m[1]} ${m[2]}`] = Number(m[3]);
  }
  return hasil;
}
/** Jumlah pengajuan berstatus tertentu di tabel verifikasi TERAKHIR bagian itu. */
function tabelStatus(baris: string[], status: string): number {
  const cocok = baris.map((b) => b.match(new RegExp(`^ ${status}\\s+\\| (\\d+)$`))).filter((m): m is RegExpMatchArray => m !== null);
  if (!cocok.length) throw new Error(`rekaman t4-integrasi: verifikasi ${status} tidak ada`);
  return Number(cocok.at(-1)![1]);
}
const jumlah = (t: TabelOutbox, kunci: string): number => t[kunci] ?? 0;

export function bacaRekaman(breaker: string, lajur: string, worker: string, readme: string): Rekaman {
  // --- breaker.txt
  const versi = lawan(breaker.split("\n"), /^# Lab t4-integrasi · breaker github\.com\/sony\/gobreaker\/v2 (v\d+\.\d+\.\d+) dengan pengaturan bawaan/, "versi gobreaker")[1]!;
  const bA = bagian(breaker, "A", "breaker A");
  for (let n = 1; n <= 5; n++) {
    const m = lawan(bA, new RegExp(`^\\s+gagal berturut-turut ke-${n}: status closed, hitungan gagal berturut-turut (\\d+)$`), `gagal ke-${n}`);
    if (Number(m[1]) !== n) throw new Error(`rekaman t4-integrasi: gagal ke-${n} harus berhitungan ${n}`);
  }
  const gagalKe = Number(lawan(bA, /^\s+gagal berturut-turut ke-(\d+): status open$/, "gagal yang membuka")[1]);
  lawan(bA, /^\s+permintaan saat open: circuit breaker is open; vendor dipanggil: false$/, "ditolak saat open");
  const sebelumBuka = desimal(lawan(bA, /^\s+sesudah (\d+,\d{3}) detik: status open$/, "sebelum Timeout")[1]!);
  const sesudahBuka = desimal(lawan(bA, /^\s+sesudah (\d+,\d{3}) detik: status half-open$/, "sesudah Timeout")[1]!);
  const bukaDetik = Math.round((sebelumBuka + sesudahBuka) / 2);
  if (!(sebelumBuka < bukaDetik && bukaDetik < sesudahBuka && sesudahBuka - sebelumBuka < 0.01)) {
    throw new Error(`rekaman t4-integrasi: Timeout tidak terapit ${sebelumBuka} dan ${sesudahBuka} detik`);
  }
  lawan(bA, /^\s+half-open, permintaan pertama berjalan, permintaan kedua: too many requests$/, "permintaan kedua di half-open");
  lawan(bA, /^\s+permintaan pertama sukses: status closed$/, "sukses menutup");
  const bB = bagian(breaker, "B", "breaker B");
  const dalam = Number(lawan(bB, /^\s+(\d+) detik sesudah membuka lagi: status open$/, "sebelum Timeout kedua")[1]);
  const luar = Number(lawan(bB, /^\s+(\d+) detik sesudah membuka lagi: status half-open$/, "sesudah Timeout kedua")[1]);
  const bC = bagian(breaker, "C", "breaker C");
  const empatBawaan = Number(lawan(bC, /^\s+IsSuccessful bawaan pustaka, (\d+) jawaban 4xx berturut-turut: status open$/, "4xx bawaan")[1]);
  const empatKustom = Number(lawan(bC, /^\s+IsSuccessful kustom \(4xx sukses\), (\d+) jawaban 4xx berturut-turut: status closed, gagal berturut-turut 0$/, "4xx kustom")[1]);
  lawan(bC, /^\s+kustom, 6 kegagalan vendor berturut-turut: status open$/, "kegagalan vendor tetap membuka");

  // --- lajur.txt
  const lA = bagian(lajur, "A", "lajur A");
  const lajurKapasitasA = Number(lawan(lA, /^# worker: kapasitas (\d+), lima percobaan/, "kapasitas A")[1]);
  const pendaftar = Number(lawan(lA, /^# (\d+) pendaftar mengajukan verifikasi: \d+ baris verifikasi dan \d+ pekerjaan di outbox/, "pendaftar")[1]);
  const tA = tabelOutbox(lA);
  const permintaanA = Number(lawan(lA, /^# vendor mati: (\d+) permintaan masuk, 0 objek dibuat/, "permintaan A")[1]);
  const lB = bagian(lajur, "B", "lajur B");
  const tB = tabelOutbox(lB);
  const kapasitasB = Number(lawan(lB, /^# worker yang berputar terus: kapasitas (\d+), lima percobaan/, "kapasitas B")[1]);
  const lC = bagian(lajur, "C", "lajur C");
  const matiC = Number(lawan(lC, /^ (\d+)\s+\| t\s+\| t$/, "tidak ada yang mati, paling banyak dua percobaan, enam sampai delapan")[1]);
  const lD = bagian(lajur, "D", "lajur D");
  const rusak = Number(lawan(lD, /^UPDATE (\d+)$/, "dokumen rusak")[1]);
  const tD = tabelOutbox(lD);
  const lE = bagian(lajur, "E", "lajur E");
  const tE = tabelOutbox(lE);
  if (tA.length !== 2 || tB.length !== 2 || tD.length !== 1 || tE.length !== 1) throw new Error("rekaman t4-integrasi: jumlah tabel outbox per bagian berubah");
  const permintaanBuka = Number(lawan(lB, /^# vendor mati, breaker terbuka: (\d+) permintaan masuk, 0 objek dibuat/, "permintaan B sebelum pulih")[1]);
  const permintaanAkhir = Number(lawan(lB, /^# sesudah vendor pulih: (\d+) permintaan masuk, \d+ objek dibuat/, "permintaan B sesudah pulih")[1]);

  // --- worker.txt
  const serentak = Number(lawan(worker.split("\n"), /^# c terukur: permintaan bersamaan paling banyak yang sampai di vendor = (\d+) /, "c terukur")[1]);
  const timeoutClient = Number(lawan(worker.split("\n"), /^# t terukur: .*\(batas diperiksa; batas waktu client (\d+) detik\)\.$/, "batas waktu client")[1]);
  const wC = bagian(worker, "C", "worker C");
  const v = lawan(wC, /^verifikasi: (\d,\d+) per detik x (\d+) percobaan x (\d+) detik = (\d,\d+) slot worker dari (\d+)$/, "slot verifikasi");
  const persen = lawan(wC, /^\s+(\d,\d+) \/ (\d+) = (\d+,\d+)% dari kapasitas worker$/, "persen kapasitas");
  const u = lawan(wC, /^notifikasi uang: (\d,\d+) per detik x (\d,\d+) detik = (\d,\d+) slot$/, "slot uang");
  const j = lawan(wC, /^bersama: (\d,\d+) \+ (\d,\d+) = (\d,\d+) dari (\d+) slot$/, "slot bersama");

  // --- README: Hitungan atas angka naskah, tidak dijalankan
  const baris = readme.split("\n");
  const rataRata = desimal(lawan(baris, /\((\d,\d+) per detik rata-rata, selang ±\d+ detik\)/, "laju rata-rata")[1]!);
  const o = lawan(baris, /outage (\d+\.\d{3}) detik \(naskah M31\) memberi (\d+) permintaan percobaan, yaitu sampai (\d+) dari (\d+) pekerjaan mati sebelum vendor pulih/, "hitungan outage");

  const R: Rekaman = {
    breaker: { versi, gagalKe, lebihDari: gagalKe - 1, bukaDetik, permintaanHalfOpen: 1, bukaLagiDetik: (dalam + luar) / 2, empatBawaan, empatKustom },
    lajur: {
      pendaftar, percobaan: 5,
      a: { mati: jumlah(tA[1]!, "mati 5"), permintaan: permintaanA },
      b: { kapasitas: kapasitasB, awal: tB[0]!, akhir: tB[1]!, lulus: tabelStatus(lB, "lulus"), gagal: tabelStatus(lB, "gagal"), permintaanBuka, permintaanAkhir },
      c: { mati: matiC, lulus: tabelStatus(lC, "lulus") },
      d: { rusak, awal: tD[0]!, permintaan: Number(lawan(lD, /^# vendor sehat: (\d+) permintaan masuk, 0 objek dibuat/, "permintaan D")[1]) },
      e: { akhir: tE[0]!, gagal: tabelStatus(lE, "gagal"), lulus: tabelStatus(lE, "lulus"), permintaan: Number(lawan(lE, /^# vendor sehat: (\d+) permintaan masuk, \d+ objek dibuat/, "permintaan E")[1]) },
    },
    worker: {
      serentak, timeoutClient, laju: desimal(v[1]!), percobaan: Number(v[2]), detik: Number(v[3]), slot: desimal(v[4]!), kapasitas: Number(v[5]),
      persen: desimal(persen[3]!), lajuUang: desimal(u[1]!), detikUang: desimal(u[2]!), slotUang: desimal(u[3]!), bersama: desimal(j[3]!),
    },
    outage: { detik: angka(o[1]!), lajuRataRata: rataRata, probe: Number(o[2]), matiMaks: Number(o[3]), pekerjaan: Number(o[4]) },
  };
  if (lajurKapasitasA !== kapasitasB) throw new Error("rekaman t4-integrasi: kapasitas worker lajur A dan B harus sama");
  periksaSilang(R, lawan(lA, /^# worker: kapasitas \d+, (lima) percobaan/, "lima percobaan")[1]!);
  return R;
}

/** Angka yang saling bergantung diperiksa silang; yang berselisih menggagalkan build. */
function periksaSilang(R: Rekaman, kalimatLima: string): void {
  const salah: string[] = [];
  if (kalimatLima !== "lima" || R.worker.percobaan !== 5) salah.push(`percobaan ${R.worker.percobaan} di worker.txt harus sama dengan "lima" di lajur.txt`);
  if (R.breaker.gagalKe !== 6 || R.breaker.lebihDari !== 5) salah.push(`breaker membuka pada gagal ke-${R.breaker.gagalKe} (lebih dari ${R.breaker.lebihDari}); harus 6 dan 5`);
  if (R.breaker.bukaDetik !== 60 || R.breaker.bukaLagiDetik !== 60) salah.push(`Timeout ${R.breaker.bukaDetik} dan ${R.breaker.bukaLagiDetik} detik harus sama dan 60`);
  if (R.breaker.empatBawaan !== R.breaker.gagalKe || R.breaker.empatKustom !== R.breaker.gagalKe) salah.push("jumlah 4xx di breaker.txt C harus sama dengan kegagalan yang membuka");
  if (R.lajur.a.mati !== R.lajur.pendaftar || R.lajur.a.permintaan !== R.lajur.pendaftar * R.worker.percobaan) salah.push("lajur A: semua pekerjaan mati dan permintaan = pekerjaan × percobaan");
  const sumB = (t: TabelOutbox) => Object.values(t).reduce((x, y) => x + y, 0);
  if (sumB(R.lajur.b.awal) !== R.lajur.pendaftar || sumB(R.lajur.b.akhir) !== R.lajur.pendaftar || sumB(R.lajur.d.awal) !== R.lajur.pendaftar || sumB(R.lajur.e.akhir) !== R.lajur.pendaftar) salah.push("jumlah pekerjaan per tabel outbox harus sama dengan pendaftar");
  if (R.lajur.b.lulus + R.lajur.b.gagal !== R.lajur.pendaftar) salah.push("lajur B: lulus + gagal harus sama dengan pendaftar");
  if (R.lajur.b.permintaanBuka !== R.breaker.gagalKe) salah.push(`lajur B: ${R.lajur.b.permintaanBuka} permintaan sebelum pulih harus ${R.breaker.gagalKe}`);
  if (R.lajur.d.permintaan !== R.breaker.gagalKe || R.lajur.d.rusak !== R.breaker.gagalKe) salah.push("lajur D: enam dokumen rusak dan enam permintaan");
  if (R.lajur.e.permintaan !== R.lajur.e.gagal * R.worker.percobaan + R.lajur.e.lulus) salah.push("lajur E: permintaan = rusak × percobaan + sehat");
  const percobaanTotal = (t: TabelOutbox) => Object.entries(t).reduce((j, [k, v]) => j + Number(k.split(" ")[1]) * v, 0);
  if (percobaanTotal(R.lajur.b.awal) !== R.lajur.b.permintaanBuka || percobaanTotal(R.lajur.b.akhir) !== R.lajur.b.permintaanAkhir) salah.push("lajur B: permintaan harus sama dengan jumlah percobaan di tabel outbox");
  if (percobaanTotal(R.lajur.d.awal) !== R.lajur.d.permintaan || percobaanTotal(R.lajur.e.akhir) !== R.lajur.e.permintaan) salah.push("lajur D dan E: permintaan harus sama dengan jumlah percobaan di tabel outbox");
  const w = R.worker;
  if (w.timeoutClient !== w.detik) salah.push(`batas waktu client ${w.timeoutClient} detik di worker.txt A harus sama dengan ${w.detik} detik per percobaan di bagian C`);
  if (Math.abs(w.laju * w.percobaan * w.detik - w.slot) > 0.005 || Math.abs(w.lajuUang * w.detikUang - w.slotUang) > 0.005 || Math.abs(w.slot + w.slotUang - w.bersama) > 0.005 || w.bersama !== w.kapasitas) salah.push("worker C: hitungan slot tidak cocok dengan rumusnya");
  if (Math.abs((100 * w.slot) / w.kapasitas - w.persen) > 0.05) salah.push("worker C: persen kapasitas tidak cocok");
  const o = R.outage;
  if (o.probe !== Math.floor(o.detik / R.breaker.bukaDetik) || o.matiMaks !== Math.floor(o.probe / R.worker.percobaan) || o.pekerjaan !== Math.round(o.lajuRataRata * o.detik)) salah.push("README: hitungan outage tidak cocok dengan rumusnya");
  if (Math.abs(o.lajuRataRata * 10 - w.laju) > 1e-9) salah.push("laju rata-rata × 10 harus sama dengan laju puncak");
  if (!(SIMULASI.pulihDetik < R.breaker.bukaDetik)) salah.push("vendor harus pulih sebelum permintaan percobaan pertama, seperti di lajur.txt B");
  if (salah.length) throw new Error(`rekaman t4-integrasi: ${salah.join("; ")}`);
}

/** Aturan simulasi dari rekaman; hanya pulihDetik dan benih yang Simulasi. */
export function aturanDari(R: Rekaman): Aturan {
  return {
    gagalLebihDari: R.breaker.lebihDari, bukaDetik: R.breaker.bukaDetik, maksHalfOpen: R.breaker.permintaanHalfOpen,
    timeout: R.worker.timeoutClient, percobaan: R.worker.percobaan, pekerjaan: R.lajur.pendaftar,
    pulihDetik: SIMULASI.pulihDetik, benih: SIMULASI.benih,
  };
}

const DASAR: Param = { jalur: "queue", error: 100, latensi: 0, jenis: "5xx", breaker: true, pulih: "sementara", serentak: 1 };
/** Pengaturan awal: lajur.txt bagian B (queue, breaker, vendor mati lalu pulih, satu worker). */
export const awalDari = (R: Rekaman): Param => ({ ...DASAR, serentak: R.lajur.b.kapasitas });

/** Titik acuan: setiap pengaturan yang punya rekaman. Kunci dipakai data widget (acuan) dan alat ukur. */
export function daftarAcuan(R: Rekaman): AcuanDef[] {
  const persenRusak = Math.round((100 * R.lajur.d.rusak) / R.lajur.pendaftar);
  return [
    { kunci: "sinkron-bawaan", param: { ...DASAR, jalur: "sinkron", pulih: "terus" } },
    { kunci: "sinkron-4xx-gagal", param: { ...DASAR, jalur: "sinkron", jenis: "4xx-gagal" } },
    { kunci: "sinkron-4xx-sukses", param: { ...DASAR, jalur: "sinkron", jenis: "4xx-sukses" } },
    { kunci: "queue-tanpa", param: { ...DASAR, breaker: false } },
    { kunci: "queue-satu", param: awalDari(R) },
    { kunci: "queue-empat", param: { ...DASAR, serentak: R.worker.serentak } },
    { kunci: "queue-4xx-gagal", param: { ...DASAR, error: persenRusak, jenis: "4xx-gagal" } },
    { kunci: "queue-4xx-sukses", param: { ...DASAR, error: persenRusak, jenis: "4xx-sukses" } },
  ];
}
