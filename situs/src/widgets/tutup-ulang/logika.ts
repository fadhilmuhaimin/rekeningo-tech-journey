// Logika murni widget "Tutup buku diulang" (M17, keputusan 760): tanpa DOM, dites Vitest.
// Semua angka dibaca saat build dari rekaman labs/api-t2/output/tutup-buku.txt bagian C: laporan yang dibuat saat
// transaction [A] belum COMMIT, lalu laporan yang sama sesudah [A] COMMIT. Rekaman yang bentuknya berubah, jumlah
// jurnal yang tidak sama dengan baris hitung rekaman, atau tebakan yang tidak punya tepat satu jawaban cocok
// menggagalkan build.

export type Waktu = "sebelum" | "sesudah";
export type Arah = "sama" | "naik-cocok" | "tidak-cocok";

export interface Laporan {
  buku: number;
  cocok: number;
  tidakCocok: number;
  jurnal: number;
  tidakSeimbang: number;
  jumlahPosting: number;
  budi: { awal: number; masuk: number; keluar: number; akhir: number; cache: number };
}
export interface Rekaman {
  sebelum: Laporan;
  sesudah: Laporan;
  tambahan: number; // nilai jurnal top-up susulan di transaction [A]
  jurnalSesudahCommit: number; // hasil hitung rekaman sesudah [A] COMMIT
  jurnalDilaporkan: number; // jumlah jurnal yang dihitung laporan pertama menurut baris hitung rekaman
}

const POLA_BUKU = /^buku: (\d+), awal \+ masuk - keluar = akhir = saldo_cache: (\d+), tidak cocok: (\d+)$/;
const POLA_SISTEM = /^sistem: (\{.*\})$/;
const POLA_BUDI = /^\s*Budi\s+\|\s+(-?\d+) \|\s+(-?\d+) \|\s+(-?\d+) \|\s+(-?\d+) \|\s+(-?\d+)\s*$/;
const POLA_HITUNG = /^jurnal: (\d+) \(laporan menghitung (\d+)\); jurnal \[A\] dibuat sebelum laporan: t$/;
const POLA_TAMBAHAN = /^\[A\] => BEGIN;.*\(-(\d+), \+(\d+)\)/;

function bagianC(teks: string): string[] {
  const baris = teks.split("\n");
  const awal = baris.findIndex((b) => b.startsWith("# --- C. "));
  if (awal < 0) throw new Error("rekaman tutup-buku: bagian C tidak ada");
  const i = baris.findIndex((b, k) => k > awal && b.startsWith("# --- "));
  return baris.slice(awal, i < 0 ? baris.length : i);
}

/** Satu laporan: dari satu baris `$ curl ... /tutup-buku` sampai sebelum yang berikutnya. */
function bacaLaporan(b: string[], nama: string): Laporan {
  const buku = b.map((x) => x.match(POLA_BUKU)).find((m) => m !== null);
  if (!buku) throw new Error(`rekaman tutup-buku bagian C (${nama}): baris ringkasan buku tidak ada`);
  const sistemTeks = b.map((x) => x.match(POLA_SISTEM)).find((m) => m !== null);
  if (!sistemTeks) throw new Error(`rekaman tutup-buku bagian C (${nama}): baris sistem tidak ada`);
  const sistem = JSON.parse(sistemTeks[1]!) as Record<string, number>;
  for (const k of ["jurnal", "jurnal_tidak_seimbang", "jumlah_semua_posting"]) {
    if (typeof sistem[k] !== "number") throw new Error(`rekaman tutup-buku bagian C (${nama}): sistem.${k} tidak ada`);
  }
  const budi = b.map((x) => x.match(POLA_BUDI)).find((m) => m !== null);
  if (!budi) throw new Error(`rekaman tutup-buku bagian C (${nama}): baris Budi tidak terbaca`);
  const [awal, masuk, keluar, akhir, cache] = budi.slice(1).map(Number) as [number, number, number, number, number];
  if (awal + masuk - keluar !== akhir || akhir !== cache) {
    throw new Error(`rekaman tutup-buku bagian C (${nama}): buku Budi tidak cocok (${awal} + ${masuk} - ${keluar} lawan ${akhir}, cache ${cache})`);
  }
  return {
    buku: Number(buku[1]),
    cocok: Number(buku[2]),
    tidakCocok: Number(buku[3]),
    jurnal: sistem.jurnal!,
    tidakSeimbang: sistem.jurnal_tidak_seimbang!,
    jumlahPosting: sistem.jumlah_semua_posting!,
    budi: { awal, masuk, keluar, akhir, cache },
  };
}

export function bacaRekaman(teks: string): Rekaman {
  const c = bagianC(teks);
  const mulai = c.flatMap((b, i) => (b.startsWith("$ curl -i -X GET '/tutup-buku") ? [i] : []));
  if (mulai.length !== 2) throw new Error(`rekaman tutup-buku bagian C: ${mulai.length} laporan, harus dua`);
  const sebelum = bacaLaporan(c.slice(mulai[0]!, mulai[1]!), "sebelum");
  const sesudah = bacaLaporan(c.slice(mulai[1]!), "sesudah");
  const tambah = c.map((x) => x.match(POLA_TAMBAHAN)).find((m) => m !== null);
  if (!tambah) throw new Error("rekaman tutup-buku bagian C: baris transaction [A] tidak terbaca");
  if (tambah[1] !== tambah[2]) throw new Error("rekaman tutup-buku bagian C: dua posting [A] tidak berlawanan");
  const hitung = c.map((x) => x.match(POLA_HITUNG)).find((m) => m !== null);
  if (!hitung) throw new Error("rekaman tutup-buku bagian C: baris hitung jurnal sesudah COMMIT tidak ada");
  const r: Rekaman = {
    sebelum,
    sesudah,
    tambahan: Number(tambah[1]),
    jurnalSesudahCommit: Number(hitung[1]),
    jurnalDilaporkan: Number(hitung[2]),
  };
  if (r.jurnalDilaporkan !== sebelum.jurnal) {
    throw new Error(`rekaman tutup-buku bagian C: baris hitung menulis ${r.jurnalDilaporkan} jurnal, laporan pertama ${sebelum.jurnal}`);
  }
  if (r.jurnalSesudahCommit !== sesudah.jurnal) {
    throw new Error(`rekaman tutup-buku bagian C: baris hitung menulis ${r.jurnalSesudahCommit} jurnal, laporan kedua ${sesudah.jurnal}`);
  }
  if (sesudah.budi.masuk - sebelum.budi.masuk !== r.tambahan) {
    throw new Error("rekaman tutup-buku bagian C: kenaikan uang masuk Budi tidak sama dengan top-up susulan");
  }
  return r;
}

/** Arah perubahan laporan pertama ke kedua: sama, naik dan semua buku tetap cocok, atau ada buku tidak cocok. */
export function arahDari(r: Rekaman): Arah {
  if (r.sesudah.tidakCocok > 0 || r.sesudah.tidakSeimbang > 0) return "tidak-cocok";
  if (r.sesudah.jurnal === r.sebelum.jurnal && r.sesudah.budi.masuk === r.sebelum.budi.masuk) return "sama";
  return "naik-cocok";
}

export interface PilihanTebak { teks: string; alasan: string; arah: Arah }

/** Indeks pilihan yang benar: tepat satu pilihan yang arahnya sama dengan rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], fakta: Arah): number {
  const cocok = pilihan.flatMap((p, i) => (p.arah === fakta ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan rekaman, harus tepat satu`);
  return cocok[0]!;
}

/** Bilangan dengan titik ribuan ("1.016"). */
export function bil(n: number): string {
  return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Rupiah dengan titik ribuan; negatif memakai tanda minus (U+2212) seperti di halaman. */
export function rp(n: number): string {
  return (n < 0 ? "−" : "") + "Rp" + bil(n);
}

export type KodeBaris = "jurnal" | "cocok" | "tidakCocok" | "tidakSeimbang" | "masuk" | "akhir" | "cache";
export interface BarisTabel { kode: KodeBaris; nilai: string; sorot: "ubah" | "tetap" | null }

/**
 * Baris tabel untuk satu waktu. Di laporan "sesudah", baris yang nilainya naik dari laporan "sebelum" bertanda "ubah";
 * dua baris pemeriksaan (buku tidak cocok, jurnal tidak seimbang) bertanda "tetap" di kedua laporan.
 */
export function tabelWaktu(r: Rekaman, waktu: Waktu): BarisTabel[] {
  const l = r[waktu];
  const naik = (a: number, b: number): "ubah" | null => (waktu === "sesudah" && a !== b ? "ubah" : null);
  return [
    { kode: "jurnal", nilai: bil(l.jurnal), sorot: naik(l.jurnal, r.sebelum.jurnal) },
    { kode: "cocok", nilai: `${bil(l.cocok)} dari ${bil(l.buku)}`, sorot: null },
    { kode: "tidakCocok", nilai: bil(l.tidakCocok), sorot: "tetap" },
    { kode: "tidakSeimbang", nilai: bil(l.tidakSeimbang), sorot: "tetap" },
    { kode: "masuk", nilai: rp(l.budi.masuk), sorot: naik(l.budi.masuk, r.sebelum.budi.masuk) },
    { kode: "akhir", nilai: rp(l.budi.akhir), sorot: naik(l.budi.akhir, r.sebelum.budi.akhir) },
    { kode: "cache", nilai: rp(l.budi.cache), sorot: naik(l.budi.cache, r.sebelum.budi.cache) },
  ];
}

/** Nilai untuk templat teks: {buku}, {jurnal1}, {jurnal2}, {tambahan}, {masuk1}, {masuk2}, {akhir1}, {akhir2}. */
export function nilaiTeks(r: Rekaman): Record<string, string | number> {
  return {
    buku: bil(r.sesudah.buku),
    jurnal1: bil(r.sebelum.jurnal),
    jurnal2: bil(r.sesudah.jurnal),
    tambahan: rp(r.tambahan),
    masuk1: rp(r.sebelum.budi.masuk),
    masuk2: rp(r.sesudah.budi.masuk),
    akhir1: rp(r.sebelum.budi.akhir),
    akhir2: rp(r.sesudah.budi.akhir),
  };
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
