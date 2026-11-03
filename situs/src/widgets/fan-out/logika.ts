// Logika murni widget fan-out notifikasi Tahap 5 (W5-fanout): tanpa DOM, dites logika.test.ts.
// Model satu pengumuman ke N perangkat, dihitung dari rumus naskah (Little's Law, L = λ × t) tanpa jam simulasi:
//   consumer   K = ceil(pengirim ÷ c)                   tiap consumer memegang c pengirim serentak (c = 4 di lab)
//   partisi    S                                         "sebanyak" = K (rancangan ADR 51), "lab" = 6 (labs/t5-fanout)
//   bekerja    W = min(K, S)                             satu partisi dibaca satu consumer dalam satu grup (R5-07)
//   laju       λ = min(pengirim, W × c) ÷ t              pengumuman, permintaan per detik ke penyedia
//   kuota      total = λ + uang; lewat bila total > kuota
//   selesai    N ÷ λ, atau N ÷ (kuota − uang) bila kuota terlampaui (paling cepat)
// Hasil adalah Simulasi atas Asumsi; hanya struktur (satu baris, enam rekaman, consumer membagi partisi) punya rekaman lab.
import type { Acuan, DataFanOut, Kasus, Kelompok, Pilihan } from "./skema";

/** Enam baris tiap kelompok tabel, dari atas ke bawah. */
export const BARIS = ["consumer", "antrean", "laju", "selesai", "kuota", "akibat"] as const;
export type Baris = (typeof BARIS)[number];

export type Hasil = {
  kelompok: Kelompok;
  partisi: number;
  consumer: number;
  bekerja: number;
  pengirimAktif: number;
  perPartisi: number;
  laju: number;
  total: number;
  persen: number;
  kasus: Kasus;
  /** Laju yang benar-benar diterima penyedia untuk pengumuman: laju, atau kuota dikurangi uang bila kuota terlampaui. */
  lajuEfektif: number;
  detik: number;
  /** Permintaan per detik di atas kuota (0 bila tidak terlampaui). */
  kelebihan: number;
  /** Selesai dengan batas laju (persen kuota di skenario) bila kuota terlampaui, selain itu null. */
  detikBatas: number | null;
};

export const isi = (templat: string, nilai: Record<string, string | number>): string =>
  templat.replace(/\{([A-Za-z]+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diberi nilai`);
    return String(nilai[k]);
  });

/** Pembulatan setengah ke atas seperti pembaca yang menghitung dengan tangan (toFixed membulatkan 8,685 ke 8,68). */
export const bulat = (x: number, desimal = 0): number => {
  const f = 10 ** desimal;
  return Math.round(Number((x * f).toPrecision(12))) / f;
};

/** Titik ribuan: 1000000 -> "1.000.000". */
export const ribuan = (n: number): string => String(bulat(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Satu desimal berkoma, tanpa ",0": 556.69 -> "556,7", 40 -> "40". Angka dari seribu ke atas tanpa desimal: 16666.7 -> "16.667". */
export const angka = (n: number): string => {
  if (n >= 1000) return ribuan(n);
  const r = bulat(n, 1);
  return String(r).replace(".", ",");
};

/** Persen kuota: dari 100 ke atas bulat ("167%"), selain itu satu desimal ("6,3%"). */
export const persenTeks = (p: number): string => `${p >= 100 ? ribuan(p) : angka(p)}%`;

/** Lama: di bawah 120 detik dalam detik, sampai 10.000 detik dalam menit (satu desimal di bawah 100 menit), selebihnya dalam jam. */
export const durasiTeks = (detik: number): string => {
  if (detik < 120) return `${bulat(detik)} detik`;
  if (detik < 10000) {
    const menit = detik / 60;
    return `${menit < 100 ? angka(menit) : ribuan(menit)} menit`;
  }
  return `${angka(detik / 3600)} jam`;
};

export const penerimaDari = (d: DataFanOut, id: string): Pilihan => {
  const x = d.penerima.find((p) => p.id === id);
  if (!x) throw new Error(`penerima ${id} tidak ada`);
  return x;
};
export const pengirimDari = (d: DataFanOut, id: string): Pilihan => {
  const x = d.pengirim.find((p) => p.id === id);
  if (!x) throw new Error(`pengirim ${id} tidak ada`);
  return x;
};
export const indeksPengirim = (d: DataFanOut, id: string): number => d.pengirim.findIndex((x) => x.id === id);

export const consumerDari = (d: DataFanOut, p: Pilihan): number => Math.ceil(p.jumlah / d.skenario.serentak);

export function hitung(d: DataFanOut, n: Pilihan, p: Pilihan, kelompok: Kelompok): Hasil {
  const { detikKirim: t, serentak: c, kuota, uang, batasPersen, partisiLab } = d.skenario;
  const consumer = consumerDari(d, p);
  const partisi = kelompok === "sebanyak" ? consumer : partisiLab;
  const bekerja = Math.min(consumer, partisi);
  const pengirimAktif = Math.min(p.jumlah, bekerja * c);
  const laju = pengirimAktif / t;
  const total = laju + uang;
  const lewat = total > kuota;
  const lajuEfektif = lewat ? kuota - uang : laju;
  const batas = (kuota * batasPersen) / 100;
  return {
    kelompok,
    partisi,
    consumer,
    bekerja,
    pengirimAktif,
    perPartisi: n.jumlah / partisi,
    laju,
    total,
    persen: (total / kuota) * 100,
    kasus: lewat ? "kuota" : bekerja < consumer ? "partisi" : "cukup",
    lajuEfektif,
    detik: n.jumlah / lajuEfektif,
    kelebihan: lewat ? total - kuota : 0,
    detikBatas: lewat ? n.jumlah / batas : null,
  };
}

export const batasLaju = (d: DataFanOut): number => (d.skenario.kuota * d.skenario.batasPersen) / 100;

/** Teks sel tabel menurut kolom. */
export function selTeks(d: DataFanOut, h: Hasil, kolom: Baris): string {
  const L = d.label;
  switch (kolom) {
    case "consumer":
      return isi(L.sel.consumer, { bekerja: ribuan(h.bekerja), consumer: ribuan(h.consumer) });
    case "antrean":
      return isi(L.sel.antrean, { perPartisi: ribuan(h.perPartisi) });
    case "laju":
      return isi(L.sel.laju, { laju: angka(h.laju) });
    case "selesai":
      return isi(h.kasus === "kuota" ? L.sel.selesaiKuota : L.sel.selesai, { durasi: durasiTeks(h.detik) });
    case "kuota":
      return isi(L.sel.kuota, { persen: persenTeks(h.persen), kuotaAngka: ribuan(d.skenario.kuota), uang: angka(d.skenario.uang) });
    case "akibat":
      if (h.kasus === "partisi") return isi(L.akibat.partisi, { menganggur: ribuan(h.consumer - h.bekerja) });
      if (h.kasus === "kuota") return isi(L.akibat.kuota, { kelebihan: ribuan(h.kelebihan), batas: ribuan(batasLaju(d)), durasiBatas: durasiTeks(h.detikBatas!) });
      return L.akibat.cukup;
  }
}

export const namaKelompok = (d: DataFanOut, h: Hasil): string => isi(d.label.kelompok[h.kelompok], { partisi: ribuan(h.partisi) });

/** Satu kalimat untuk wilayah status: pilihan, lama dengan partisi sebanyak consumer, dan lama dengan partisi lab. */
export function ringkasan(d: DataFanOut, n: Pilihan, p: Pilihan): string {
  const a = hitung(d, n, p, "sebanyak");
  const b = hitung(d, n, p, "lab");
  return isi(d.label.ringkas[a.kasus === "kuota" ? "kuota" : "cukup"], {
    penerima: ribuan(n.jumlah),
    pengirim: p.label,
    partisi: ribuan(a.partisi),
    durasi: durasiTeks(a.detik),
    laju: angka(a.laju),
    kuotaAngka: ribuan(d.skenario.kuota),
    partisiLab: ribuan(b.partisi),
    durasiLab: durasiTeks(b.detik),
  });
}

/** Kalimat jawaban tebakan sesudah pembaca memilih. */
export const jawabanTebak = (d: DataFanOut, pilih: number): string => `${pilih === d.tebak.jawaban ? d.label.benar : d.label.belum} ${d.tebak.alasan}`;

/** Rekaman dan Asumsi yang cocok dengan pilihan; kuota lewat dihitung pada kelompok partisi sebanyak consumer. */
export const acuanUntuk = (d: DataFanOut, n: Pilihan, p: Pilihan): Acuan[] => {
  const lewat = hitung(d, n, p, "sebanyak").kasus === "kuota";
  return d.acuan.filter((a) => (a.penerima === undefined || a.penerima === n.id) && (a.pengirim === undefined || a.pengirim === p.id) && (a.kuota === undefined || lewat));
};

/** Nilai aria-valuetext penggeser pengirim. */
export const nilaiPengirim = (d: DataFanOut, p: Pilihan): string => isi(d.label.pengirim.nilai, { pengirim: p.label, consumer: ribuan(consumerDari(d, p)) });
