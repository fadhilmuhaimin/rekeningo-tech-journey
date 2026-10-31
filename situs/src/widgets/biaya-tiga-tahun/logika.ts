// Logika murni model biaya tiga tahun (ADR 59): tanpa DOM, dites Vitest. Rumus dari naskah Tahap 5:
//   biaya = infrastruktur + orang operasi + migrasi + risiko, ditulis per tahun untuk dua pilihan.
// Semua masukan Ilustrasi (juta rupiah), jadi hasilnya Ilustrasi: yang diajarkan bentuk rumusnya dan masukan mana yang
// membalik urutan, bukan harga. Kapasitas yang dibutuhkan naik `tumbuh` persen tiap tahun: k(t) = (1 + tumbuh%)^(t − 1).
//   cloud    infra(t)    = cloudInfra1 × k(t)                         (membayar yang dipakai)
//   on-prem  infra(t)    = perangkat1 × (k(t) − k(t − 1)) + sewa      (membeli kenaikan kapasitas; tahun 1: perangkat1 + sewa)
//   orang(t)             = (orangDasar + tambahan) × biayaOrang       (tambahan = 0 di cloud)
//   migrasi(t)           = migrasi bila t = 1 dan on-prem, selain itu 0
//   risiko(t)            = peluang% × dampak
import type { DataBiaya, Masukan } from "./skema";

export const TAHUN = 3;

export interface Tahun { infra: number; orang: number; migrasi: number; risiko: number; total: number }
export interface Hasil { cloud: Tahun[]; onprem: Tahun[] }
export type Komponen = "infra" | "orang" | "migrasi" | "risiko" | "total";
export const URUTAN: Komponen[] = ["infra", "orang", "migrasi", "risiko", "total"];

/** Pembulatan setengah ke atas seperti pembaca. Masukan bulat dan pertumbuhan persen bulat memberi hasil bulat bila 100^(t−1) membaginya. */
const bulat = (x: number): number => Math.floor(x + 0.5 + 1e-9);

/** k(t) × 100^(t−1): bilangan bulat, supaya tidak ada galat pecahan. */
const faktor = (tumbuh: number, t: number): number => (100 + tumbuh) ** (t - 1);

export function infraCloud(m: Masukan, t: number): number {
  return bulat((m.cloudInfra1 * faktor(m.tumbuh, t)) / 100 ** (t - 1));
}

export function perangkat(m: Masukan, t: number): number {
  if (t === 1) return m.perangkat1;
  const naik = faktor(m.tumbuh, t) / 100 ** (t - 1) - faktor(m.tumbuh, t - 1) / 100 ** (t - 2);
  return bulat(m.perangkat1 * naik);
}

function tahun(infra: number, orang: number, migrasi: number, risiko: number): Tahun {
  return { infra, orang, migrasi, risiko, total: infra + orang + migrasi + risiko };
}

export function hitung(m: Masukan): Hasil {
  const cloud: Tahun[] = [];
  const onprem: Tahun[] = [];
  for (let t = 1; t <= TAHUN; t++) {
    cloud.push(tahun(infraCloud(m, t), m.orangDasar * m.biayaOrang, 0, bulat((m.cloudRisikoPeluang * m.cloudRisikoDampak) / 100)));
    onprem.push(
      tahun(
        perangkat(m, t) + m.sewa,
        (m.orangDasar + m.orangTambahan) * m.biayaOrang,
        t === 1 ? m.migrasi : 0,
        bulat((m.onpremRisikoPeluang * m.onpremRisikoDampak) / 100),
      ),
    );
  }
  return { cloud, onprem };
}

/** Jumlah tiga tahun per komponen. */
export function jumlah(daftar: Tahun[]): Tahun {
  const s = { infra: 0, orang: 0, migrasi: 0, risiko: 0, total: 0 };
  for (const t of daftar) for (const k of URUTAN) s[k] += t[k];
  return s;
}

/** Biaya kumulatif sampai akhir tahun t (1 sampai TAHUN). */
export function kumulatif(daftar: Tahun[]): number[] {
  let acc = 0;
  return daftar.map((t) => (acc += t.total));
}

/** Tahun pertama (1 sampai TAHUN) saat kumulatif on-prem lebih rendah dari cloud; null bila tidak pernah dalam TAHUN tahun. */
export function titikImpas(h: Hasil): number | null {
  const c = kumulatif(h.cloud);
  const o = kumulatif(h.onprem);
  const i = o.findIndex((v, idx) => v < c[idx]!);
  return i < 0 ? null : i + 1;
}

/** Masukan lengkap tiap skenario: masukan dasar ditimpa `ubah`. */
export function siapkan(data: DataBiaya): Masukan[] {
  return data.skenario.map((s) => ({ ...data.masukan, ...s.ubah }));
}

/** Komponen yang angkanya berubah dari skenario sebelumnya (ditandai di tabel). */
export function berubah(a: Hasil, b: Hasil): Komponen[] {
  const ja = { cloud: jumlah(a.cloud), onprem: jumlah(a.onprem) };
  const jb = { cloud: jumlah(b.cloud), onprem: jumlah(b.onprem) };
  return URUTAN.filter((k) => ja.cloud[k] !== jb.cloud[k] || ja.onprem[k] !== jb.onprem[k]);
}

/** Titik ribuan: 18690 → "18.690". */
export function titik(n: number): string {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "−" : "") + s;
}

/** Kalimat kesimpulan dari templat data: {selisih} juta rupiah, {impas} nomor tahun, {total} juta rupiah. */
export function kesimpulan(label: DataBiaya["label"]["kesimpulan"], h: Hasil): string {
  const c = jumlah(h.cloud).total;
  const o = jumlah(h.onprem).total;
  const impas = titikImpas(h);
  const isi = (s: string) => s.replaceAll("{selisih}", titik(Math.abs(c - o))).replaceAll("{impas}", String(impas ?? "")).replaceAll("{total}", titik(c));
  if (c === o) return isi(label.sama);
  if (o < c) return isi(label.onpremMurah);
  return isi(impas === null ? label.cloudMurah : label.cloudMurahImpas);
}
