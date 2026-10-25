// Logika murni widget outbox dan worker (W3-outbox, keputusan 983): tanpa DOM, tanpa Math.random, tanpa jam; dites Vitest.
// Lima skenario kecil, masing-masing fungsi deterministik dari konfigurasi dan konstanta rekaman:
//   cara     jurnal dan notifikasi di dua tempat: push di dalam transaction, sesudah COMMIT, atau lewat outbox (3.9, ADR 23)
//   kursor   dua transfer ke penerima yang sama: poller kursor (dibuat, id) lawan klaim per baris (3.10, 3.11, ADR 24)
//   ulang    retry dengan backoff, batas percobaan, dead-letter (3.13, ADR 25)
//   ganda    klaim habis sebelum kirim selesai: at-least-once, penyaring notifikasi_id (3.12, 3.13)
//   antrean  10.000 promo di depan notifikasi uang: kapasitas c ÷ t, kelas, laju promo (3.26, ADR 32)
// Angka acuan datang dari rekaman labs/t3-outbox/output lewat rekaman.ts (Acuan). Konfigurasi yang sama dengan
// konfigurasi rekaman harus menghasilkan angka rekaman (periksaAcuan); selebihnya Hitungan atau Ilustrasi.
import type { Acuan } from "./rekaman";

export type Lajur = "uang" | "outbox" | "worker" | "push" | "hp";
export type Tanda = "baik" | "buruk" | "netral";
export type Nilai = Record<string, string | number | boolean>;
export type Jenis = "rekaman" | "hitungan" | "ilustrasi";
export type Konfig = Record<string, string>;
export type NamaSkenario = "cara" | "kursor" | "ulang" | "ganda" | "antrean";

/** Waktu sebuah peristiwa: nomor urut, detik, batas atas detik (jitter acak di bawahnya), atau nomor klaim. Teksnya dari label. */
export interface Waktu { n: number; satuan: "urut" | "detik" | "paling" | "klaim" }
export interface Peristiwa { waktu: Waktu; lajur: Lajur; kunci: string; nilai: Nilai; tanda: Tanda }
export interface Hasil {
  garis: Peristiwa[];
  angka: Record<string, number | boolean>;
  tanda: Record<string, Tanda>;
  ringkas: { kunci: string; nilai: Nilai };
  acuan: { jenis: Jenis; sumber: string };
}

export interface Konstanta {
  pushTimeout: number; // detik; batas waktu client push (ADR 22), header transaksi.txt
  klaim: number; // detik; klaim bawaan worker, ganda.txt A
  klaimPendek: number; // detik; ganda.txt B
  klaimPanjang: number; // detik; ASUMSI (usulan di README lab, tidak direkam): dua kali klaim bawaan
  pushLambat: number; // detik; ganda.txt B
  maksPercobaan: number; // retry.txt A
  backoffAwal: number; // detik; retry.txt A putaran 1
  backoffMaks: number; // detik; retry.txt A
  c: number; // pengirim serentak per worker, queue.txt A
  t: number; // detik per pengiriman, queue.txt A
  nPromo: number; // queue.txt B
  laju: number; // promo per detik (ADR 32), queue.txt F
  tiba: number; // detik uang tiba saat laju dibatasi, queue.txt F
  putaran: number; // detik satu putaran worker, queue.txt E ("2 × 0,3 detik")
  puncak: number; // pembayaran per detik di puncak (Asumsi naskah), queue.txt F
  nominal: number; // Rp per transfer, kursor.txt B
}

export function konstanta(a: Acuan): Konstanta {
  return {
    pushTimeout: a.transaksi.pushTimeout,
    klaim: a.ganda.klaim,
    klaimPendek: a.ganda.klaimPendek,
    klaimPanjang: 2 * a.ganda.klaim,
    pushLambat: a.ganda.pushLambat,
    maksPercobaan: a.retry.batasA,
    backoffAwal: a.retry.batasBackoff[0]!,
    backoffMaks: a.retry.backoffMaks,
    c: a.queue.c,
    t: a.queue.t,
    nPromo: a.queue.nPromo,
    laju: a.queue.lajuBatas,
    tiba: a.queue.lajuDetik,
    putaran: a.queue.putaranUang,
    puncak: a.queue.puncak,
    nominal: a.kursor.nominal,
  };
}

// ---------- format ----------
const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
/** Angka id-ID, paling banyak dua desimal: 13,33 · 0,6 · 10.000. */
export const tampil = (n: number): string => fmt.format(n);
/** Rupiah integer: Rp25.000. */
export const rp = (n: number): string => "Rp" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const bulat1 = (n: number): number => Math.round(n * 10) / 10;

/** Isi {nama} di templat; nama yang tidak diisi gagal keras. Boolean menjadi kata dari `kata`. */
export function isi(teks: string, nilai: Nilai, kata: { ya: string; tidak: string }): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    const v = nilai[k]!;
    return typeof v === "boolean" ? (v ? kata.ya : kata.tidak) : typeof v === "number" ? tampil(v) : v;
  });
}

// ---------- pembangun garis waktu ----------
type Urut = { t: number; i: number; e: Peristiwa };
class Garis {
  private daftar: Urut[] = [];
  /** `t` urutan (angka) atau detik untuk mengurutkan; `waktu` yang tampil. */
  tulis(t: number, waktu: Waktu, lajur: Lajur, kunci: string, nilai: Nilai = {}, tanda: Tanda = "netral"): number {
    this.daftar.push({ t, i: this.daftar.length, e: { waktu, lajur, kunci, nilai, tanda } });
    return this.daftar.length - 1;
  }
  tandai(i: number, tanda: Tanda): void {
    this.daftar[i]!.e.tanda = tanda;
  }
  hasil(): Peristiwa[] {
    return [...this.daftar].sort((x, y) => x.t - y.t || x.i - y.i).map((x) => x.e);
  }
}

// ---------- skenario 1: cara ----------
export const CARA = ["langsung", "sesudah-commit", "outbox"] as const;
export const KEJADIAN = ["lancar", "commit-ditolak", "push-503", "push-menggantung", "proses-mati"] as const;
export type CaraKirim = (typeof CARA)[number];
export type KejadianCara = (typeof KEJADIAN)[number];

type Langkah = "mulai" | "jurnal" | "outbox" | "push" | "commit" | "selesai";
/** Program permintaan pembayaran per cara. Outbox tidak punya langkah push: worker yang mengirim. */
const PROGRAM: Record<CaraKirim, Langkah[]> = {
  langsung: ["mulai", "jurnal", "push", "commit", "selesai"],
  "sesudah-commit": ["mulai", "jurnal", "commit", "push", "selesai"],
  outbox: ["mulai", "jurnal", "outbox", "commit", "selesai"],
};
/** Proses mati tepat sesudah langkah ini: di antara dua langkah yang menyentuh dua tempat. */
const MATI_SESUDAH: Record<CaraKirim, Langkah> = { langsung: "push", "sesudah-commit": "commit", outbox: "commit" };

export function jalankanCara(cara: CaraKirim, kejadian: KejadianCara, k: Konstanta): Hasil {
  const g = new Garis();
  let n = 0;
  const tulis = (lajur: Lajur, kunci: string, nilai: Nilai = {}, tanda: Tanda = "netral"): number => {
    n += 1;
    return g.tulis(n, { n, satuan: "urut" }, lajur, kunci, nilai, tanda);
  };
  let transaksiTerbuka = false;
  let baris = false;
  let uang = false;
  let notif = 0;
  let menunggu = false;
  let mati = false; // baris outbox masuk dead-letter
  let terlambat = false;
  let hpAwal = -1;

  for (const langkah of PROGRAM[cara]) {
    if (langkah === "mulai") {
      transaksiTerbuka = true;
      tulis("uang", "mulai");
    } else if (langkah === "jurnal") {
      tulis("uang", "jurnal");
    } else if (langkah === "outbox") {
      baris = true;
      tulis("outbox", "outbox-tulis");
    } else if (langkah === "push") {
      menunggu = true;
      if (kejadian === "push-503") {
        tulis("push", "push-503", {}, "buruk");
        tulis("uang", "push-dicatat", {}, "buruk");
      } else if (kejadian === "push-menggantung") {
        tulis("push", transaksiTerbuka ? "push-menggantung-tx" : "push-menggantung-api", {}, "buruk");
        notif += 1;
        tulis("push", "push-menjawab");
        hpAwal = tulis("hp", "hp-terima");
      } else {
        notif += 1;
        tulis("push", "push-terima");
        hpAwal = tulis("hp", "hp-terima");
      }
    } else if (langkah === "commit") {
      if (kejadian === "commit-ditolak") {
        tulis("uang", "commit-ditolak", {}, "netral");
        tulis("uang", baris ? "rollback-bersama" : "rollback");
        transaksiTerbuka = false;
        baris = false;
        break;
      }
      uang = true;
      transaksiTerbuka = false;
      tulis("uang", "commit");
    } else {
      tulis("uang", "selesai");
    }
    if (kejadian === "proses-mati" && langkah === MATI_SESUDAH[cara]) {
      tulis("uang", `mati-${cara}`, {}, "buruk");
      if (transaksiTerbuka) {
        transaksiTerbuka = false;
        baris = false;
        tulis("uang", "rollback-mati");
      }
      break;
    }
  }

  if (cara === "outbox" && uang && baris) {
    tulis("worker", "klaim");
    if (kejadian === "push-503") {
      tulis("push", "push-503-berulang", { n: k.maksPercobaan }, "buruk");
      tulis("worker", "dead-letter", { n: k.maksPercobaan });
      mati = true;
    } else if (kejadian === "push-menggantung") {
      tulis("worker", "tunggu-batas", { detik: k.pushTimeout });
      tulis("worker", "tunda");
      tulis("push", "push-terima");
      tulis("worker", "tandai");
      hpAwal = tulis("hp", "hp-terima-terlambat");
      notif = 1;
      terlambat = true;
    } else {
      tulis("push", "push-terima");
      tulis("worker", "tandai");
      hpAwal = tulis("hp", "hp-terima");
      notif = 1;
    }
  }

  const jejak = baris && uang; // baris outbox yang tersimpan: terkirim atau dead-letter
  const mendahului = notif > 0 && !uang;
  const hilangDiam = uang && notif === 0 && !jejak;
  if (mendahului && hpAwal >= 0) g.tandai(hpAwal, "buruk");
  if (hilangDiam) tulis("hp", "hp-kosong", {}, "buruk");
  const p1 = !mendahului;
  const p2 = !hilangDiam;
  const p3 = !menunggu;
  const lolos = Number(p1) + Number(p2) + Number(p3);
  return {
    garis: g.hasil(),
    angka: { jurnal: Number(uang), outboxBaris: Number(baris && uang), notif, terlambat, deadLetter: mati, p1, p2, p3, lolos },
    tanda: {
      jurnal: "netral", outboxBaris: "netral", notif: "netral", terlambat: "netral", deadLetter: "netral",
      p1: p1 ? "baik" : "buruk", p2: p2 ? "baik" : "buruk", p3: p3 ? "baik" : "buruk", lolos: lolos === 3 ? "baik" : "buruk",
    },
    ringkas: { kunci: lolos === 3 ? "ringkas-semua" : "ringkas-sebagian", nilai: { lolos } },
    acuan: acuanDari("cara", { cara, kejadian }),
  };
}

// ---------- skenario 2: kursor ----------
export const URUTAN = ["berurutan", "terbalik"] as const;
export const POLLER = ["kursor", "klaim"] as const;

export function jalankanKursor(poller: "kursor" | "klaim", urutan: "berurutan" | "terbalik", k: Konstanta): Hasil {
  // dibuat = awal transaction; nomor = urutan INSERT outbox (sesudah lock buku penerima).
  type B = { siapa: "Budi" | "Dimas"; dibuat: number; nomor: number };
  const budi: B = { siapa: "Budi", dibuat: 1, nomor: urutan === "berurutan" ? 1 : 2 };
  const dimas: B = { siapa: "Dimas", dibuat: 2, nomor: urutan === "berurutan" ? 2 : 1 };
  const urutCommit = urutan === "berurutan" ? [budi, dimas] : [dimas, budi];
  const g = new Garis();
  let n = 0;
  const tulis = (lajur: Lajur, kunci: string, nilai: Nilai = {}, tanda: Tanda = "netral") => g.tulis(++n, { n, satuan: "urut" }, lajur, kunci, nilai, tanda);
  tulis("uang", urutan === "berurutan" ? "mulai-berurutan" : "mulai-terbalik");
  let kursor = { dibuat: 0, nomor: 0 };
  const dikirim: B[] = [];
  const commit: B[] = [];
  urutCommit.forEach((b, i) => {
    commit.push(b);
    tulis("outbox", i === 0 ? "commit-pertama" : "commit-kedua", { siapa: b.siapa, nomor: b.nomor });
    const layak = commit.filter((x) => !dikirim.includes(x));
    if (poller === "kursor") {
      const lewat = layak.filter((x) => x.dibuat > kursor.dibuat || (x.dibuat === kursor.dibuat && x.nomor > kursor.nomor));
      lewat.sort((x, y) => x.dibuat - y.dibuat || x.nomor - y.nomor);
      for (const x of lewat) {
        dikirim.push(x);
        tulis("worker", "kursor-kirim", { siapa: x.siapa, nomor: x.nomor });
        tulis("hp", "hp-terima", { siapa: x.siapa });
        kursor = { dibuat: x.dibuat, nomor: x.nomor };
      }
      for (const x of layak.filter((y) => !lewat.includes(y))) {
        tulis("worker", "kursor-lewat", { siapa: x.siapa, nomor: x.nomor }, "buruk");
      }
    } else {
      for (const x of layak) {
        dikirim.push(x);
        tulis("worker", "klaim-kirim", { siapa: x.siapa, nomor: x.nomor });
        tulis("hp", "hp-terima", { siapa: x.siapa });
      }
    }
  });
  const pesan = dikirim.length;
  const saldo = 2 * k.nominal;
  const tertinggal = 2 - pesan;
  return {
    garis: g.hasil(),
    angka: { pesan, tertinggal, saldoNaik: saldo, terbalik: urutan === "terbalik" },
    tanda: { pesan: pesan === 2 ? "baik" : "buruk", tertinggal: tertinggal === 0 ? "baik" : "buruk", saldoNaik: "netral", terbalik: "netral" },
    ringkas: { kunci: pesan === 2 ? "ringkas-dua" : "ringkas-hilang", nilai: { pesan, saldo: rp(saldo) } },
    acuan: acuanDari("kursor", { poller, urutan }),
  };
}

// ---------- skenario 3: ulang ----------
export const PENYEBAB = ["push-503", "pulih-sesudah-2", "worker-mati"] as const;
export const BATAS = ["2", "5", "8"] as const;
/** Gagal berturut-turut sebelum push pulih pada penyebab "pulih-sesudah-2". */
export const GAGAL_SEBELUM_PULIH = 2;

/** Batas atas tunggu sesudah kegagalan ke-n: awal × 2^(n−1), paling banyak backoffMaks (retry.txt A). */
export const tungguMaks = (k: Konstanta, gagalKe: number): number => Math.min(k.backoffMaks, k.backoffAwal * 2 ** (gagalKe - 1));

export function jalankanUlang(penyebab: (typeof PENYEBAB)[number], batas: number, k: Konstanta): Hasil {
  const g = new Garis();
  let permintaan = 0;
  let percobaan = 0;
  let terkirim = false;
  let mati = false;
  let selang = 0;
  if (penyebab === "worker-mati") {
    for (let i = 1; i <= batas; i++) {
      permintaan += 1;
      percobaan = i;
      g.tulis(i, { n: i, satuan: "klaim" }, "worker", "mati-kirim", { n: i });
    }
    percobaan = batas + 1;
    mati = true;
    g.tulis(batas + 1, { n: batas + 1, satuan: "klaim" }, "worker", "mati-batas", { n: batas + 1, batas }, "netral");
  } else {
    let kum = 0;
    for (let i = 1; ; i++) {
      permintaan += 1;
      percobaan = i;
      const ok = penyebab === "pulih-sesudah-2" && i > GAGAL_SEBELUM_PULIH;
      const waktu: Waktu = i === 1 ? { n: 0, satuan: "detik" } : { n: kum, satuan: "paling" };
      if (ok) {
        g.tulis(i, waktu, "push", "kirim-berhasil", { n: i }, "baik");
        terkirim = true;
        selang = kum;
        break;
      }
      if (i >= batas) {
        g.tulis(i, waktu, "push", "gagal-mati", { n: i, batas }, "buruk");
        mati = true;
        selang = kum;
        break;
      }
      const tunggu = tungguMaks(k, i);
      g.tulis(i, waktu, "push", "gagal-ulang", { n: i, tunggu }, "netral");
      kum += tunggu;
    }
  }
  return {
    garis: g.hasil(),
    angka: { permintaan, percobaan, terkirim, mati, ...(penyebab === "worker-mati" ? {} : { selang }) },
    tanda: { permintaan: "netral", percobaan: "netral", terkirim: terkirim ? "baik" : "buruk", mati: mati ? "buruk" : "baik", selang: "netral" },
    ringkas: { kunci: terkirim ? "ringkas-terkirim" : penyebab === "worker-mati" ? "ringkas-mati-worker" : "ringkas-mati", nilai: { permintaan, percobaan, batas } },
    acuan: acuanDari("ulang", { penyebab, batas: String(batas) }),
  };
}

// ---------- skenario 4: ganda ----------
export const VARIAN = ["mati-klaim-5", "klaim-pendek", "dua-hp-klaim-5", "dua-hp-klaim-10"] as const;
type Kirim = "cepat" | "lambat" | "menggantung";
const DEF_VARIAN: Record<(typeof VARIAN)[number], { klaim: (k: Konstanta) => number; kirim: Kirim[]; mati: boolean }> = {
  "mati-klaim-5": { klaim: (k) => k.klaim, kirim: ["cepat"], mati: true },
  "klaim-pendek": { klaim: (k) => k.klaimPendek, kirim: ["lambat"], mati: false },
  "dua-hp-klaim-5": { klaim: (k) => k.klaim, kirim: ["menggantung", "menggantung"], mati: false },
  "dua-hp-klaim-10": { klaim: (k) => k.klaimPanjang, kirim: ["menggantung", "menggantung"], mati: false },
};
const lamaKirim = (j: Kirim, k: Konstanta): number => (j === "cepat" ? 0 : j === "lambat" ? k.pushLambat : k.pushTimeout);

export function jalankanGanda(varian: (typeof VARIAN)[number], penyaring: boolean, k: Konstanta): Hasil {
  const d = DEF_VARIAN[varian];
  const klaim = d.klaim(k);
  const g = new Garis();
  const dtk = (t: number): Waktu => ({ n: t, satuan: "detik" });
  g.tulis(0, dtk(0), "worker", "klaim-a", { klaim });
  let t = 0;
  d.kirim.forEach((j, i) => {
    g.tulis(t, dtk(t), "push", `kirim-a-${j}`, { hp: i + 1 }, j === "menggantung" ? "buruk" : "netral");
    t += lamaKirim(j, k);
  });
  const selesaiA = t;
  const adaTimeout = d.kirim.includes("menggantung");
  const bersamaan = d.mati || selesaiA > klaim;
  if (d.mati) g.tulis(0, dtk(0), "worker", "a-mati");
  if (bersamaan) {
    g.tulis(klaim, dtk(klaim), "worker", "klaim-habis", { klaim });
    g.tulis(klaim, dtk(klaim), "worker", "klaim-b");
    d.kirim.forEach((_, i) => g.tulis(klaim, dtk(klaim), "push", "kirim-b", { hp: i + 1 }));
    g.tulis(klaim, dtk(klaim), "worker", "tandai-b");
  }
  if (!d.mati) {
    g.tulis(selesaiA, dtk(selesaiA), "worker", adaTimeout ? "a-ditunda" : "a-tandai", { selesai: selesaiA });
  }
  const perangkat = d.kirim.length;
  const pesan = perangkat * (bersamaan ? 2 : 1);
  const tampilDi = penyaring ? perangkat : pesan;
  const akhir = Math.max(selesaiA, bersamaan ? klaim : 0);
  g.tulis(akhir, dtk(akhir), "hp", penyaring ? "hp-saring" : "hp-semua", { diterima: pesan, tampil: tampilDi }, tampilDi > perangkat ? "buruk" : "baik");
  return {
    garis: g.hasil(),
    angka: { pesan, id: 1, bersamaan, tampil: tampilDi, perangkat },
    tanda: { pesan: "netral", id: "netral", bersamaan: bersamaan ? "buruk" : "baik", tampil: tampilDi > perangkat ? "buruk" : "baik", perangkat: "netral" },
    ringkas: { kunci: bersamaan ? "ringkas-ganda" : "ringkas-satu", nilai: { pesan, tampil: tampilDi, klaim } },
    acuan: acuanDari("ganda", { varian, penyaring: penyaring ? "hidup" : "mati" }),
  };
}

// ---------- skenario 5: antrean ----------
export const KELAS = ["tanpa", "dengan"] as const;
export const LAJU = ["bebas", "5"] as const;
export const PENGIRIM = ["1", "4", "8", "20"] as const;
/** Jendela pengamatan jumlah promo terkirim (detik): naskah dan queue.txt C. */
export const JENDELA = 30;
/** Bagian promo yang harus terkirim dalam jendela untuk "selesai tepat waktu" (naskah: 95%). */
export const TARGET = 0.95;

export function jalankanAntrean(kelas: "tanpa" | "dengan", laju: "bebas" | "5", c: number, k: Konstanta): Hasil {
  const kap = c / k.t;
  const rilis = laju === "5" ? Math.min(kap, k.laju) : kap;
  const promo30 = Math.min(k.nPromo, rilis * JENDELA);
  const persen = (promo30 / k.nPromo) * 100;
  const habis = k.nPromo / rilis;
  const tiba = laju === "5" ? k.tiba : 0;
  // Menunggu notifikasi uang. Dengan kelas: paling lama dua putaran. Tanpa kelas dan semua promo layak: semua promo di depan.
  // Tanpa kelas dan promo dijadwalkan: hanya promo yang sudah layak dan belum terkirim di depan.
  const dua = 2 * k.putaran;
  const antreDepan = laju === "5" ? (Math.max(0, k.laju - kap) * k.tiba) / kap : k.nPromo / kap;
  const tunggu = kelas === "dengan" ? dua : antreDepan + (laju === "5" ? dua : 0);
  const umurSemua = k.nPromo - promo30 > 0 ? JENDELA : 0;
  const umurUang = tunggu > JENDELA ? JENDELA : 0;
  const butuh95 = (TARGET * k.nPromo * k.t) / JENDELA;
  const sisa = laju === "5" ? kap - rilis : 0;
  const g = new Garis();
  g.tulis(0, { n: 0, satuan: "detik" }, "outbox", "promo-masuk", { n: k.nPromo });
  g.tulis(0, { n: 0, satuan: "detik" }, "worker", "worker-mulai", { c, t: k.t, kap });
  if (laju === "5") g.tulis(0, { n: 0, satuan: "detik" }, "outbox", "laju-promo", { laju: k.laju });
  g.tulis(tiba, { n: tiba, satuan: "detik" }, "outbox", kelas === "dengan" ? "uang-masuk-kelas" : "uang-masuk", {});
  g.tulis(tiba + tunggu, { n: tiba + tunggu, satuan: "detik" }, "push", "uang-terkirim", { w: tunggu }, tunggu <= 1.5 ? "baik" : "buruk");
  g.tulis(JENDELA, { n: JENDELA, satuan: "detik" }, "push", "promo-30", { jendela: JENDELA, kirim: Math.round(promo30), persen: bulat1(persen) });
  g.tulis(habis, { n: habis, satuan: "detik" }, "push", "promo-habis", { detik: habis, menit: habis / 60 });
  return {
    garis: g.hasil(),
    angka: { kapasitas: kap, promo30: Math.round(promo30), persen30: bulat1(persen), habis, tunggu, umurSemua, umurUang, butuh95, ...(laju === "5" ? { sisa } : {}) },
    tanda: {
      kapasitas: "netral", promo30: "netral", persen30: "netral", habis: "netral", tunggu: tunggu <= 1.5 ? "baik" : "buruk",
      umurSemua: "netral", umurUang: umurUang === 0 ? "baik" : "buruk", butuh95: "netral", sisa: "netral",
    },
    ringkas: { kunci: tunggu <= 1.5 ? "ringkas-cepat" : "ringkas-lambat", nilai: { w: tunggu, kap } },
    acuan: acuanDari("antrean", { kelas, laju, c: String(c) }),
  };
}

// ---------- rangkaian konfigurasi ----------
export interface Knob { id: string; opsi: readonly string[] }
export const KNOB: Record<NamaSkenario, Knob[]> = {
  cara: [{ id: "cara", opsi: CARA }, { id: "kejadian", opsi: KEJADIAN }],
  kursor: [{ id: "poller", opsi: POLLER }, { id: "urutan", opsi: URUTAN }],
  ulang: [{ id: "penyebab", opsi: PENYEBAB }, { id: "batas", opsi: BATAS }],
  ganda: [{ id: "varian", opsi: VARIAN }, { id: "penyaring", opsi: ["mati", "hidup"] }],
  antrean: [{ id: "kelas", opsi: KELAS }, { id: "laju", opsi: LAJU }, { id: "c", opsi: PENGIRIM }],
};
/** Konfigurasi awal sesudah menebak = konfigurasi yang ditanyakan tebakan. */
export const AWAL: Record<NamaSkenario, Konfig> = {
  cara: { cara: "langsung", kejadian: "proses-mati" },
  kursor: { poller: "kursor", urutan: "terbalik" },
  ulang: { penyebab: "worker-mati", batas: "5" },
  ganda: { varian: "mati-klaim-5", penyaring: "mati" },
  antrean: { kelas: "tanpa", laju: "bebas", c: "4" },
};

export const kunciKonfig = (s: NamaSkenario, kf: Konfig): string =>
  KNOB[s].map((b) => {
    const v = kf[b.id];
    if (v === undefined || !b.opsi.includes(v)) throw new Error(`${s}: knob ${b.id} bernilai "${v}", bukan salah satu ${b.opsi.join("|")}`);
    return v;
  }).join("|");

export function semuaKonfig(s: NamaSkenario): Konfig[] {
  return KNOB[s].reduce<Konfig[]>((acc, b) => acc.flatMap((kf) => b.opsi.map((o) => ({ ...kf, [b.id]: o }))), [{}]);
}

export function jalankan(s: NamaSkenario, kf: Konfig, k: Konstanta): Hasil {
  kunciKonfig(s, kf); // memeriksa semua knob
  if (s === "cara") return jalankanCara(kf.cara as CaraKirim, kf.kejadian as KejadianCara, k);
  if (s === "kursor") return jalankanKursor(kf.poller as "kursor" | "klaim", kf.urutan as "berurutan" | "terbalik", k);
  if (s === "ulang") return jalankanUlang(kf.penyebab as (typeof PENYEBAB)[number], Number(kf.batas), k);
  if (s === "ganda") return jalankanGanda(kf.varian as (typeof VARIAN)[number], kf.penyaring === "hidup", k);
  return jalankanAntrean(kf.kelas as "tanpa" | "dengan", kf.laju as "bebas" | "5", Number(kf.c), k);
}

// ---------- acuan: konfigurasi yang direkam ----------
interface Titik { skenario: NamaSkenario; konfig: Konfig; sumber: string }
/** Konfigurasi yang sama dengan satu bagian rekaman. Sumber = "<berkas> <bagian>". */
export const TITIK: Titik[] = [
  { skenario: "cara", konfig: { cara: "outbox", kejadian: "lancar" }, sumber: "transaksi.txt A" },
  { skenario: "cara", konfig: { cara: "outbox", kejadian: "commit-ditolak" }, sumber: "transaksi.txt C dan D" },
  { skenario: "cara", konfig: { cara: "outbox", kejadian: "proses-mati" }, sumber: "transaksi.txt F" },
  { skenario: "cara", konfig: { cara: "outbox", kejadian: "push-503" }, sumber: "retry.txt A" },
  { skenario: "cara", konfig: { cara: "outbox", kejadian: "push-menggantung" }, sumber: "ganda.txt D" },
  { skenario: "kursor", konfig: { poller: "kursor", urutan: "berurutan" }, sumber: "kursor.txt A" },
  { skenario: "kursor", konfig: { poller: "kursor", urutan: "terbalik" }, sumber: "kursor.txt B" },
  { skenario: "kursor", konfig: { poller: "klaim", urutan: "terbalik" }, sumber: "kursor.txt C" },
  { skenario: "ulang", konfig: { penyebab: "push-503", batas: "5" }, sumber: "retry.txt A" },
  { skenario: "ulang", konfig: { penyebab: "worker-mati", batas: "5" }, sumber: "retry.txt C" },
  { skenario: "ganda", konfig: { varian: "mati-klaim-5", penyaring: "mati" }, sumber: "ganda.txt A" },
  { skenario: "ganda", konfig: { varian: "mati-klaim-5", penyaring: "hidup" }, sumber: "ganda.txt C" },
  { skenario: "ganda", konfig: { varian: "klaim-pendek", penyaring: "mati" }, sumber: "ganda.txt B" },
  { skenario: "ganda", konfig: { varian: "dua-hp-klaim-5", penyaring: "mati" }, sumber: "ganda.txt D" },
  { skenario: "antrean", konfig: { kelas: "tanpa", laju: "bebas", c: "4" }, sumber: "queue.txt C" },
  { skenario: "antrean", konfig: { kelas: "dengan", laju: "bebas", c: "4" }, sumber: "queue.txt D dan E" },
  { skenario: "antrean", konfig: { kelas: "dengan", laju: "5", c: "4" }, sumber: "queue.txt F" },
];

export function acuanDari(s: NamaSkenario, kf: Konfig): { jenis: Jenis; sumber: string } {
  const kunci = kunciKonfig(s, kf);
  const t = TITIK.find((x) => x.skenario === s && kunciKonfig(s, x.konfig) === kunci);
  if (t) return { jenis: "rekaman", sumber: t.sumber };
  // Mekanisme yang tidak dijalankan di lab: push di dalam transaction dan kirim sesudah COMMIT tanpa outbox.
  if (s === "cara" && kf.cara !== "outbox") return { jenis: "ilustrasi", sumber: "naskah bagian 3" };
  return { jenis: "hitungan", sumber: s };
}

// ---------- tebakan ----------
export interface Pilihan { nilai: string | number }

/** Nilai untuk templat tebakan dan alasannya, dari mesin yang sama dengan jawaban. */
export function nilaiTebak(s: NamaSkenario, k: Konstanta): Nilai {
  if (s === "cara") return { nominal: rp(k.nominal) };
  if (s === "kursor") return { nominal: rp(k.nominal), pesan: jalankanKursor("kursor", "terbalik", k).angka.pesan as number, saldo: rp(2 * k.nominal) };
  if (s === "ulang") {
    const h = jalankanUlang("worker-mati", k.maksPercobaan, k);
    return { batas: k.maksPercobaan, pesan: h.angka.permintaan as number, klaimMati: h.angka.percobaan as number };
  }
  if (s === "ganda") return { klaim: k.klaim, pesan: jalankanGanda("mati-klaim-5", false, k).angka.pesan as number };
  const h = jalankanAntrean("tanpa", "bebas", k.c, k);
  return {
    n: k.nPromo, c: k.c, t: k.t, jendela: JENDELA, kap: h.angka.kapasitas as number, promo30: h.angka.promo30 as number,
    persen: h.angka.persen30 as number, habis: h.angka.habis as number, target: TARGET * 100,
    perlu: Math.round((TARGET * k.nPromo) / JENDELA), butuh95: h.angka.butuh95 as number,
  };
}
/** Nilai jawaban benar tiap skenario, dihitung dari mesin yang sama dengan hasil (bukan ditulis tangan). */
export function jawabanTebak(s: NamaSkenario, k: Konstanta): string | number {
  if (s === "cara") {
    const ok = CARA.filter((c) => {
      const h = jalankanCara(c, "proses-mati", k);
      return h.angka.notif! === 1 && h.angka.jurnal === 1 && h.angka.terlambat === false;
    });
    if (ok.length !== 1) throw new Error(`tebakan cara: ${ok.length} cara memenuhi, harus satu`);
    return ok[0]!;
  }
  if (s === "kursor") return jalankanKursor("kursor", "terbalik", k).angka.pesan as number;
  if (s === "ulang") return jalankanUlang("worker-mati", k.maksPercobaan, k).angka.permintaan as number;
  if (s === "ganda") return jalankanGanda("mati-klaim-5", false, k).angka.pesan as number;
  return jalankanAntrean("tanpa", "bebas", k.c, k).angka.persen30 as number;
}

/** Indeks pilihan yang benar: tepat satu pilihan sama dengan jawaban, nilai pilihan unik. */
export function indeksBenar(pilihan: Pilihan[], jawaban: string | number): number {
  const nilai = pilihan.map((p) => p.nilai);
  if (new Set(nilai).size !== nilai.length) throw new Error("tebakan: nilai pilihan ganda");
  const cocok = nilai.flatMap((v, i) => (v === jawaban ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan sama dengan jawaban ${jawaban}, harus satu`);
  return cocok[0]!;
}

// ---------- penjaga: hasil mesin sama dengan rekaman ----------
function harap(nama: string, sebenarnya: unknown, diharapkan: unknown): void {
  if (sebenarnya !== diharapkan) throw new Error(`acuan ${nama}: mesin ${String(sebenarnya)}, rekaman ${String(diharapkan)}`);
}
const antara = (nama: string, x: number, bawah: number, atas: number): void => {
  if (!(x >= bawah && x <= atas)) throw new Error(`acuan ${nama}: ${x} di luar ${bawah} sampai ${atas}`);
};

/** Gagal keras bila konfigurasi yang direkam menghasilkan angka berbeda dari rekamannya. Dipakai build dan tes. */
export function periksaAcuan(a: Acuan, k: Konstanta = konstanta(a)): void {
  // cara × outbox
  const lancar = jalankanCara("outbox", "lancar", k);
  const idxKlaim = lancar.garis.findIndex((e) => e.kunci === "klaim");
  harap("transaksi A push sebelum worker", lancar.garis.slice(0, idxKlaim).filter((e) => e.lajur === "push").length, a.transaksi.pushSebelumWorker);
  harap("transaksi A push sesudah worker", lancar.angka.notif, a.transaksi.pushSesudahWorker);
  harap("transaksi A uang tercatat", lancar.angka.jurnal, 1);
  const ditolak = jalankanCara("outbox", "commit-ditolak", k);
  harap("transaksi C jurnal dibuang", ditolak.angka.jurnal, a.transaksi.rollback.jurnal);
  harap("transaksi C outbox dibuang", ditolak.angka.outboxBaris, a.transaksi.rollback.outbox);
  harap("transaksi D jurnal dibuang", ditolak.angka.jurnal, a.transaksi.commitDitolak.jurnal);
  harap("transaksi D outbox dibuang", ditolak.angka.outboxBaris, a.transaksi.commitDitolak.outbox);
  harap("transaksi D notifikasi", ditolak.angka.notif, 0);
  const mati = jalankanCara("outbox", "proses-mati", k);
  harap("transaksi F baris menunggu", mati.angka.outboxBaris, a.transaksi.apiMati.statusSebelum === "menunggu" ? 1 : -1);
  harap("transaksi F percobaan sebelum", a.transaksi.apiMati.percobaanSebelum, 0);
  harap("transaksi F notifikasi", mati.angka.notif, a.transaksi.apiMati.percobaanSesudah);
  harap("transaksi F status akhir", a.transaksi.apiMati.statusSesudah, "terkirim");
  harap("transaksi B worker sebelum COMMIT", a.transaksi.workerSaatBelumCommit, 0);
  harap("transaksi B worker sesudah COMMIT", a.transaksi.workerSesudahCommit, 1);
  const mg = jalankanCara("outbox", "push-menggantung", k);
  if (!mg.garis.some((e) => e.kunci === "tunda") || a.ganda.duaHpDitundaA < 1) throw new Error("acuan ganda D: ditunda tidak sama dengan mesin");
  // kursor
  harap("kursor A pesan", jalankanKursor("kursor", "berurutan", k).angka.pesan, a.kursor.berurutanPesan);
  harap("kursor B pesan", jalankanKursor("kursor", "terbalik", k).angka.pesan, a.kursor.terbalikKursorPesan);
  harap("kursor C pesan", jalankanKursor("klaim", "terbalik", k).angka.pesan, a.kursor.terbalikKlaimPesan);
  harap("kursor B saldo naik", jalankanKursor("kursor", "terbalik", k).angka.saldoNaik, a.kursor.saldoNaik);
  // ulang
  [1, 2, 3, 4].forEach((i) => harap(`retry A batas backoff ${i}`, tungguMaks(k, i), a.retry.batasBackoff[i - 1]));
  const u503 = jalankanUlang("push-503", a.retry.batasA, k);
  harap("retry A permintaan", u503.angka.permintaan, a.retry.permintaanA);
  harap("retry A percobaan", u503.angka.percobaan, a.retry.batasA);
  harap("retry A status", u503.angka.mati ? "mati" : "lain", a.retry.statusA);
  const c503 = jalankanCara("outbox", "push-503", k);
  harap("cara × push 503: dead-letter", c503.angka.deadLetter, a.retry.statusA === "mati");
  harap("cara × push 503: permintaan sebelum dead-letter", c503.garis.find((e) => e.kunci === "push-503-berulang")!.nilai.n, a.retry.permintaanA);
  const uMati = jalankanUlang("worker-mati", a.retry.batasA, k);
  harap("retry C pesan", uMati.angka.permintaan, a.retry.pesanMati);
  harap("retry C percobaan", uMati.angka.percobaan, a.retry.percobaanMati);
  harap("retry C klaim terakhir", a.retry.batasA + 1, a.retry.klaimMati);
  harap("retry C status", uMati.angka.mati ? "mati" : "lain", a.retry.statusMati);
  // ganda
  const gA = jalankanGanda("mati-klaim-5", false, k);
  harap("ganda A pesan", gA.angka.pesan, a.ganda.matiPesan);
  harap("ganda A notifikasi_id", gA.angka.id, a.ganda.matiId);
  harap("ganda B pesan", jalankanGanda("klaim-pendek", false, k).angka.pesan, a.ganda.pendekPesan);
  harap("ganda D pesan", jalankanGanda("dua-hp-klaim-5", false, k).angka.pesan, a.ganda.duaHpPesan);
  harap("ganda D perangkat", jalankanGanda("dua-hp-klaim-5", false, k).angka.perangkat, a.ganda.duaHp);
  const gC = jalankanGanda("mati-klaim-5", true, k);
  harap("ganda C diterima", gC.garis.at(-1)!.nilai.diterima, a.ganda.penyaringDiterima);
  harap("ganda C ditampilkan", gC.angka.tampil, a.ganda.penyaringTampil);
  // antrean
  const q = a.queue;
  const tanpa = jalankanAntrean("tanpa", "bebas", q.c, k);
  harap("queue A kapasitas", Math.round((tanpa.angka.kapasitas as number) * 100) / 100, q.kapasitas);
  antara("queue A kapasitas diukur", tanpa.angka.kapasitas as number, q.kapasitasBawah, q.kapasitas + 0.005);
  antara("queue C persen 30 detik", tanpa.angka.persen30 as number, q.persen30Bawah, q.persen30Atas);
  harap("queue C habis", Math.round(tanpa.angka.habis as number), q.habisDetik);
  harap("queue C perlu per detik", Math.round(((q.nPromo * TARGET) / JENDELA)), q.perluPerDetik);
  if ((tanpa.angka.tunggu as number) < q.uangMenunggu30) throw new Error("acuan queue C: uang menunggu kurang dari rekaman");
  harap("queue C umur semua kelas", tanpa.angka.umurSemua, q.umurSemua30);
  const dengan = jalankanAntrean("dengan", "bebas", q.c, k);
  if (!((dengan.angka.tunggu as number) < q.uangBatas)) throw new Error("acuan queue D dan E: uang dengan kelas tidak di bawah batas rekaman");
  harap("queue E umur uang", dengan.angka.umurUang, q.umurUang);
  harap("queue E putaran", 2 * k.putaran, 0.6);
  const f = jalankanAntrean("dengan", "5", q.c, k);
  antara("queue F laju", k.laju, q.lajuBawah, q.lajuAtas);
  harap("queue F habis", Math.round((f.angka.habis as number)), q.lajuHabis);
  harap("queue F menit", Math.floor((f.angka.habis as number) / 60), q.lajuHabisMenit);
  harap("queue F sisa", Math.round((f.angka.sisa as number) * 100) / 100, q.sisa);
  harap("queue F kali puncak", Math.round(((f.angka.sisa as number) / q.puncak) * 10) / 10, q.kaliPuncak);
  if (!((f.angka.tunggu as number) < q.uangBatas)) throw new Error("acuan queue F: uang tidak di bawah batas rekaman");
  harap("queue D uang lebih dulu", q.urutanKelas[0], "tiruan-418");
}
