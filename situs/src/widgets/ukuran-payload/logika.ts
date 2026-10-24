// Logika murni widget ukuran payload (2.20, keputusan 821): tanpa DOM, dites Vitest.
// Angka dibaca saat build dari labs/e5-payload/output/ledger/ukuran.txt: bagian C (ukuran body riwayat Budi, tiga bentuk,
// tiga jumlah baris, mentah dan gzip) dan bagian D (kuota, Asumsi). Rekaman yang bentuknya berubah, atau yang hitungannya
// tidak sama dengan hitungan dari barisnya (persen gzip, byte per baris, tabel kuota), menggagalkan build.

export type Bentuk = "api" | "layar" | "penuh";
export const BENTUK: Bentuk[] = ["api", "layar", "penuh"];

export interface Ukuran { baris: number; bentuk: Bentuk; mentah: number; gzip: number }

export interface Asumsi {
  paket: number; // byte per bulan
  hari: number; // hari per bulan
  barisKuota: number; // jumlah baris yang dipakai tabel kuota rekaman
  bukaPerHari: number[]; // pilihan buka per hari di tabel kuota rekaman
}

export interface Rekaman { ukuran: Ukuran[]; asumsi: Asumsi }

export type Pemenang = "layar" | "gzip" | "sama" | "tidak";

/** Angka berformat Indonesia dari rekaman: "2.932" jadi 2932, "0,176 %" jadi 0.176. */
export function bacaAngka(teks: string): number {
  const bersih = teks.replace(/%/g, "").replace(/x$/, "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(bersih);
  if (!Number.isFinite(n) || bersih === "") throw new Error(`ukuran.txt: "${teks}" bukan angka`);
  return n;
}

function bagian(teks: string, huruf: string): string[] {
  const baris = teks.split("\n");
  const mulai = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (mulai < 0) throw new Error(`ukuran.txt: bagian ${huruf} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > mulai && b.startsWith("# --- "));
  return baris.slice(mulai, akhir < 0 ? undefined : akhir);
}

const kolom = (b: string) => b.split("|").map((x) => x.trim());

/** Persen kuota bulanan yang dipakai: byte per buka x buka per hari x hari per bulan dibagi paket. */
export function persenKuota(byte: number, buka: number, a: Asumsi): number {
  return ((byte * buka * a.hari) / a.paket) * 100;
}

/** Buka per hari yang memakai 1 % kuota, dibulatkan seperti tabel rekaman. */
export function bukaSatuPersen(byte: number, a: Asumsi): number {
  return Math.round((a.paket * 0.01) / a.hari / byte);
}

export function bacaRekaman(teks: string): Rekaman {
  const C = bagian(teks, "C");
  const ukuran: Ukuran[] = [];
  for (const b of C) {
    const k = kolom(b);
    if (k.length !== 6 || !/^\d/.test(k[0]!) || !/^(api|layar|penuh)$/.test(k[1]!)) continue;
    const u: Ukuran = { baris: bacaAngka(k[0]!), bentuk: k[1] as Bentuk, mentah: bacaAngka(k[2]!), gzip: bacaAngka(k[3]!) };
    // Persen gzip dan byte per baris di rekaman harus sama dengan hitungan dari byte-nya.
    const persen = Math.round((1000 * u.gzip) / u.mentah) / 10;
    if (persen !== bacaAngka(k[4]!)) throw new Error(`ukuran.txt: gzip/mentah ${u.bentuk} ${u.baris} baris bukan ${persen} %`);
    if (Math.round(u.mentah / u.baris) !== bacaAngka(k[5]!)) throw new Error(`ukuran.txt: mentah per baris ${u.bentuk} ${u.baris} baris tidak cocok`);
    if (u.gzip >= u.mentah) throw new Error(`ukuran.txt: gzip ${u.bentuk} ${u.baris} baris tidak lebih kecil dari mentah`);
    ukuran.push(u);
  }
  const barisAda = [...new Set(ukuran.map((u) => u.baris))].sort((x, y) => x - y);
  if (barisAda.length !== 3 || ukuran.length !== 9) throw new Error(`ukuran.txt: bagian C butuh 3 jumlah baris x 3 bentuk, ada ${ukuran.length} baris`);
  for (const n of barisAda) {
    for (const bt of BENTUK) {
      if (ukuran.filter((u) => u.baris === n && u.bentuk === bt).length !== 1) throw new Error(`ukuran.txt: bagian C butuh tepat satu baris ${bt} untuk ${n} baris`);
    }
  }

  const D = bagian(teks, "D");
  const gabung = D.join(" ");
  const paket = gabung.match(/paket [\d.]+ GB \(([\d.]+) B\) per bulan, (\d+) hari/);
  const barisKuota = gabung.match(/satu response (\d+) baris/);
  const buka = gabung.match(/buka per hari ([\d, dan]+?)\./);
  if (!paket || !barisKuota || !buka) throw new Error("ukuran.txt: kalimat Asumsi bagian D tidak terbaca (paket, hari, baris, buka per hari)");
  const a: Asumsi = {
    paket: bacaAngka(paket[1]!),
    hari: Number(paket[2]),
    barisKuota: Number(barisKuota[1]),
    bukaPerHari: buka[1]!.split(/,| dan /).map((x) => x.trim()).filter(Boolean).map(Number),
  };
  if (a.bukaPerHari.length !== 3 || a.bukaPerHari.some((x) => !Number.isInteger(x) || x <= 0)) throw new Error("ukuran.txt: buka per hari bagian D bukan tiga bilangan");

  // Tabel kuota rekaman (Asumsi) harus sama dengan hitungan dari ukuran bagian C dan rumus di atas.
  let cocok = 0;
  for (const b of D) {
    const k = kolom(b);
    if (k.length !== 7 || !/^(api|layar|penuh)$/.test(k[0]!) || !/^(tidak|ya)$/.test(k[1]!)) continue;
    const u = ukuran.find((x) => x.baris === a.barisKuota && x.bentuk === k[0]);
    if (!u) throw new Error(`ukuran.txt: bagian D memakai ${a.barisKuota} baris yang tidak ada di bagian C`);
    const byte = k[1] === "ya" ? u.gzip : u.mentah;
    if (byte !== bacaAngka(k[2]!)) throw new Error(`ukuran.txt: B per buka ${k[0]} ${k[1]} di bagian D tidak sama dengan bagian C`);
    if (bukaSatuPersen(byte, a) !== bacaAngka(k[3]!)) throw new Error(`ukuran.txt: buka per hari untuk 1 % ${k[0]} ${k[1]} tidak cocok dengan hitungan`);
    a.bukaPerHari.forEach((n, i) => {
      const hitung = Math.round(persenKuota(byte, n, a) * 1000) / 1000;
      if (hitung !== bacaAngka(k[4 + i]!)) throw new Error(`ukuran.txt: kuota ${k[0]} ${k[1]} ${n}/hari bukan ${hitung} %`);
    });
    cocok++;
  }
  if (cocok !== 6) throw new Error(`ukuran.txt: tabel kuota bagian D butuh 6 baris, ada ${cocok}`);
  return { ukuran, asumsi: a };
}

export function cari(r: Rekaman, bentuk: Bentuk, baris: number): Ukuran {
  const u = r.ukuran.find((x) => x.bentuk === bentuk && x.baris === baris);
  if (!u) throw new Error(`tidak ada rekaman ${bentuk} ${baris} baris`);
  return u;
}

export const byteBuka = (u: Ukuran, gzip: boolean) => (gzip ? u.gzip : u.mentah);

/** Bagian yang hemat dari api-t2 apa adanya (tanpa gzip) pada jumlah baris yang sama. */
export interface Hemat { layar: number; gzip: number; layarGzip: number }
export function hemat(r: Rekaman, baris: number): Hemat {
  const api = cari(r, "api", baris);
  const layar = cari(r, "layar", baris);
  return {
    layar: 1 - layar.mentah / api.mentah,
    gzip: 1 - api.gzip / api.mentah,
    layarGzip: 1 - layar.gzip / api.mentah,
  };
}

/** Jawaban tebakan: yang paling banyak memperkecil response api-t2 pada jumlah baris itu. */
export function pemenang(h: Hemat): Pemenang {
  const terbesar = Math.max(h.layar, h.gzip);
  if (terbesar < 0.05) return "tidak";
  if (Math.abs(h.layar - h.gzip) < 0.05) return "sama";
  return h.layar > h.gzip ? "layar" : "gzip";
}

export interface PilihanTebak { teks: string; pemenang: Pemenang }

/** Indeks pilihan yang benar: tepat satu pilihan yang pemenangnya sama dengan hasil hitungan rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], hasil: Pemenang): number {
  const cocok = pilihan.flatMap((p, i) => (p.pemenang === hasil ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan hasil rekaman, harus tepat satu`);
  return cocok[0]!;
}

const bulat = new Intl.NumberFormat("id-ID");
const desimal = (n: number) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: n, maximumFractionDigits: n });
export const angka = (n: number) => bulat.format(n);
export const persen = (n: number, digit = 1) => desimal(digit).format(n);
/** Pecahan jadi persen berformat Indonesia: 0.1012 jadi "10,1". */
export const persenDari = (pecahan: number) => persen(pecahan * 100, 1);
export const kali = (n: number) => desimal(2).format(n);
export const labelPaket = (a: Asumsi) => (a.paket % 1e9 === 0 ? `${angka(a.paket / 1e9)} GB` : `${angka(a.paket / 1e6)} MB`);

/** Lebar batang 0 sampai 100 relatif terhadap yang terbesar, minimal 1 supaya yang kecil tetap terlihat. */
export function lebarBatang(byte: number, maks: number): number {
  return Math.max(1, Math.round((byte / maks) * 100));
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
