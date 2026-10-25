// Logika murni widget "File lawan ledger" (M15, keputusan 840): tanpa DOM, dites Vitest.
// Semua angka dibaca saat build dari rekaman labs/t2-pencairan/output/rentan.txt bagian D (baris file ditulis sebelum
// COMMIT) dan bagian E (jurnal di-COMMIT lebih dulu), bukan ditulis tangan. Rekaman yang bentuknya berubah, selisih yang
// tidak sama dengan total file dikurangi mutasi ledger, atau tebakan yang tidak punya tepat satu jawaban cocok
// menggagalkan build.

export type Urutan = "file-dulu" | "jurnal-dulu";
export type Arah = "nol" | "file-lebih-besar" | "file-lebih-kecil";

export interface Perbandingan {
  barisFile: number;
  totalFile: number;
  jurnal: number;
  mutasiKas: number;
  selisih: number; // total file dikurangi mutasi kas pencairan; positif = file lebih besar
  warung: { nama: string; barisFile: number; jumlahFile: number; jurnal: number; jumlahLedger: number };
}
export type Rekaman = Record<Urutan, Perbandingan>;

const POLA_TOTAL = /^\s*(\d+) \|\s+(\d+) \|\s+(\d+) \|\s+(\d+)\s*$/;
const POLA_WARUNG = /^\s*\d+ \| (Warung [\w ]+?)\s+\|\s+(\d+) \|\s+(\d+) \|\s+(\d+) \|\s+(\d+)\s*$/;
const POLA_SELISIH = /^-- Selisih file - ledger: (-?)Rp([\d.]+)\.$/;

/** Nilai rupiah bertitik ("2.465.000") menjadi bilangan bulat. */
const dariRp = (s: string): number => Number(s.replace(/\./g, ""));

function bagian(teks: string, huruf: string, berikut: string | null): string[] {
  const baris = teks.split("\n");
  const awal = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (awal < 0) throw new Error(`rekaman rentan: bagian ${huruf} tidak ada`);
  let akhir = baris.length;
  if (berikut) {
    const i = baris.findIndex((b, k) => k > awal && b.startsWith(`# --- ${berikut}. `));
    if (i >= 0) akhir = i;
  }
  return baris.slice(awal, akhir);
}

function barisSesudah(b: string[], awalan: string, nama: string): string {
  const i = b.findIndex((x) => x.startsWith(awalan));
  const nilai = i < 0 ? undefined : b[i + 2];
  if (nilai === undefined) throw new Error(`rekaman rentan: tabel ${nama} tidak ada`);
  return nilai;
}

function bacaBagian(b: string[], huruf: string): Perbandingan {
  const t = barisSesudah(b, " baris_file | total_file | jurnal_pencairan | mutasi_kas_pencairan", "total").match(POLA_TOTAL);
  if (!t) throw new Error(`rekaman rentan bagian ${huruf}: baris total tidak terbaca`);
  const w = barisSesudah(b, " akun |    nama    | baris_file | jumlah_file | jurnal_ledger | jumlah_ledger", "per warung").match(POLA_WARUNG);
  if (!w) throw new Error(`rekaman rentan bagian ${huruf}: baris per warung tidak terbaca`);
  const s = b.map((x) => x.match(POLA_SELISIH)).find((m) => m !== null);
  if (!s) throw new Error(`rekaman rentan bagian ${huruf}: baris "Selisih file - ledger" tidak ada`);
  const p: Perbandingan = {
    barisFile: Number(t[1]),
    totalFile: Number(t[2]),
    jurnal: Number(t[3]),
    mutasiKas: Number(t[4]),
    selisih: Number(t[2]) - Number(t[4]),
    warung: { nama: w[1]!, barisFile: Number(w[2]), jumlahFile: Number(w[3]), jurnal: Number(w[4]), jumlahLedger: Number(w[5]) },
  };
  const tertulis = (s[1] === "-" ? -1 : 1) * dariRp(s[2]!);
  if (tertulis !== p.selisih) {
    throw new Error(`rekaman rentan bagian ${huruf}: selisih tertulis ${tertulis}, total file dikurangi mutasi ledger ${p.selisih}`);
  }
  return p;
}

export function bacaRekaman(teks: string): Rekaman {
  const d = bacaBagian(bagian(teks, "D", "E"), "D");
  const e = bacaBagian(bagian(teks, "E", null), "E");
  return { "file-dulu": d, "jurnal-dulu": e };
}

export function arahDari(p: Perbandingan): Arah {
  return p.selisih === 0 ? "nol" : p.selisih > 0 ? "file-lebih-besar" : "file-lebih-kecil";
}

export interface PilihanTebak { teks: string; alasan: string; arah: Arah }

/** Indeks pilihan yang benar untuk urutan file-dulu: tepat satu pilihan yang arahnya sama dengan rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], fakta: Arah): number {
  const cocok = pilihan.flatMap((p, i) => (p.arah === fakta ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan rekaman, harus tepat satu`);
  return cocok[0]!;
}

/** Rupiah dengan titik ribuan; negatif memakai tanda minus (U+2212) seperti di halaman. */
export function rp(n: number): string {
  const t = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "−" : "") + "Rp" + t;
}

export interface BarisTabel { kode: "baris" | "total" | "jurnal" | "mutasi" | "selisih" | "warungFile" | "warungLedger"; nilai: string; sorot: boolean }

/** Baris tabel untuk satu urutan, dengan nilai yang sudah diformat. */
export function tabelUrutan(p: Perbandingan): BarisTabel[] {
  return [
    { kode: "baris", nilai: String(p.barisFile), sorot: false },
    { kode: "total", nilai: rp(p.totalFile), sorot: false },
    { kode: "jurnal", nilai: String(p.jurnal), sorot: false },
    { kode: "mutasi", nilai: rp(p.mutasiKas), sorot: false },
    { kode: "selisih", nilai: p.selisih === 0 ? rp(0) : rp(p.selisih), sorot: p.selisih !== 0 },
    { kode: "warungFile", nilai: String(p.warung.barisFile), sorot: p.warung.barisFile !== p.warung.jurnal },
    { kode: "warungLedger", nilai: String(p.warung.jurnal), sorot: false },
  ];
}

/** Nilai untuk templat teks: {baris}, {total}, {jurnal}, {mutasi}, {selisih}, {warung}, {warungFile}, {warungLedger}. */
export function nilaiTeks(p: Perbandingan): Record<string, string | number> {
  return {
    baris: p.barisFile,
    total: rp(p.totalFile),
    jurnal: p.jurnal,
    mutasi: rp(p.mutasiKas),
    selisih: rp(Math.abs(p.selisih)),
    warung: p.warung.nama,
    warungFile: p.warung.barisFile,
    warungLedger: p.warung.jurnal,
  };
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
