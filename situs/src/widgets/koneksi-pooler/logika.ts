// Logika murni kalkulator koneksi dan pooler (ADR 52): tanpa DOM, dites Vitest. Rumus:
//   potensi    = service × pod × poolPod                     koneksi yang diminta semua pod bila pool-nya penuh bersamaan
//   tersedia   = maxConnections − cadangan                   untuk role biasa (PostgreSQL 17: superuser_reserved_connections
//                                                            dan reserved_connections)
//   ditolak    = max(0, potensi − tersedia)                  tanpa pooler, paling sedikit
//   perInstance = maxDbPerInstance > 0 ? min(maxDbPerInstance, role × defaultPoolSize) : role × defaultPoolSize
//                                                            default_pool_size berlaku per pasangan user dan database
//   serverMaks = instance × perInstance                      koneksi ke PostgreSQL yang boleh dibuka semua instance PgBouncer
//   keServer   = min(potensi, serverMaks)                    batas atas bila semua client sedang di dalam transaction
//   klienLebih = max(0, potensi − maxClient)                 client di atas max_client_conn satu instance, bila instance lain mati
// Semua role dianggap sama besar. Hasil adalah batas atas dari rumus, bukan ukuran di server.
import type { DataKoneksi, Masukan } from "./skema";

export interface Hasil {
  potensi: number;
  tersedia: number;
  ditolakTanpa: number;
  serverMaks: number;
  keServer: number;
  ditolakDengan: number;
  maxClient: number;
  klienLebih: number;
}
export type Baris = "potensi" | "keServer" | "tersedia" | "ditolak" | "batasKlien" | "klienLebih";
export const URUTAN: Baris[] = ["potensi", "keServer", "tersedia", "ditolak", "batasKlien", "klienLebih"];

export function hitung(m: Masukan): Hasil {
  const potensi = m.service * m.pod * m.poolPod;
  const tersedia = m.maxConnections - m.cadangan;
  const dasar = m.role * m.defaultPoolSize;
  const perInstance = m.maxDbPerInstance > 0 ? Math.min(m.maxDbPerInstance, dasar) : dasar;
  const serverMaks = m.instance * perInstance;
  const keServer = Math.min(potensi, serverMaks);
  return {
    potensi,
    tersedia,
    ditolakTanpa: Math.max(0, potensi - tersedia),
    serverMaks,
    keServer,
    ditolakDengan: Math.max(0, keServer - tersedia),
    maxClient: m.maxClient,
    klienLebih: Math.max(0, potensi - m.maxClient),
  };
}

/** Isi sel tabel: [tanpa pooler, dengan PgBouncer]; null berarti baris itu tidak berlaku tanpa pooler. */
export function sel(h: Hasil, b: Baris): [number | null, number] {
  switch (b) {
    case "potensi": return [h.potensi, h.potensi];
    case "keServer": return [h.potensi, h.keServer];
    case "tersedia": return [h.tersedia, h.tersedia];
    case "ditolak": return [h.ditolakTanpa, h.ditolakDengan];
    case "batasKlien": return [null, h.maxClient];
    case "klienLebih": return [null, h.klienLebih];
  }
}

/** Masukan lengkap tiap skenario: masukan dasar ditimpa `ubah`. */
export function siapkan(data: DataKoneksi): Masukan[] {
  return data.skenario.map((s) => ({ ...data.masukan, ...s.ubah }));
}

/** Baris yang angkanya berubah dari skenario sebelumnya (ditandai di tabel). */
export function berubah(a: Hasil, b: Hasil): Baris[] {
  return URUTAN.filter((k) => {
    const x = sel(a, k), y = sel(b, k);
    return x[0] !== y[0] || x[1] !== y[1];
  });
}

/** Titik ribuan: 1200 → "1.200". */
export function titik(n: number): string {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "−" : "") + s;
}

export type Kasus = "klienLewat" | "serverLewat" | "pooler" | "muatTanpa";
/** Kalimat kesimpulan yang berlaku: client di atas batas didahulukan, lalu server pool yang melewati tersedia, lalu pooler yang menolong. */
export function kasus(h: Hasil): Kasus {
  if (h.klienLebih > 0) return "klienLewat";
  if (h.ditolakDengan > 0) return "serverLewat";
  if (h.ditolakTanpa > 0) return "pooler";
  return "muatTanpa";
}

export function kesimpulan(label: DataKoneksi["label"]["kesimpulan"], h: Hasil): string {
  const isi: Record<string, number> = {
    potensi: h.potensi, tersedia: h.tersedia, ditolak: h.ditolakTanpa, ditolakServer: h.ditolakDengan, keServer: h.keServer,
    serverMaks: h.serverMaks, maxClient: h.maxClient, klienLebih: h.klienLebih,
  };
  return label[kasus(h)].replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in isi)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return titik(isi[k]!);
  });
}
