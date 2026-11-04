// Skema data widget kalkulator koneksi dan pooler (ADR 52). Semua teks dan semua angka masukan dari JSON; komponen tidak
// memuat angka sendiri. Divalidasi saat build dan di tes.
import { z } from "zod";

const Teks = z.string().min(1);
const Bulat = z.number().int().nonnegative();
const Positif = z.number().int().positive();

/** Masukan kalkulator. `maxDbPerInstance` 0 berarti `max_db_connections` tidak diisi (bawaan PgBouncer: tanpa batas). */
export const Masukan = z
  .object({
    service: Positif, // jumlah service yang menyambung ke database
    pod: Positif, // pod (instance) tiap service
    poolPod: Positif, // ukuran pool koneksi tiap pod
    maxConnections: Positif, // max_connections PostgreSQL
    cadangan: Bulat, // superuser_reserved_connections ditambah reserved_connections
    instance: Positif, // jumlah instance PgBouncer
    role: Positif, // jumlah role database yang menyambung lewat PgBouncer
    defaultPoolSize: Positif, // default_pool_size: batas per pasangan user dan database, per instance
    maxDbPerInstance: Bulat, // max_db_connections per instance; 0 = tanpa batas
    maxClient: Positif, // max_client_conn per instance
  })
  .strict();
export type Masukan = z.infer<typeof Masukan>;

const Skenario = z.object({ label: Teks, ubah: Masukan.partial().optional() }).strict();

export const DataKoneksi = z
  .object({
    id: Teks,
    judul: Teks,
    sumber: z.object({ jenis: z.enum(["rekaman", "ilustrasi", "asumsi"]), teks: Teks }).strict(),
    masukan: Masukan,
    skenario: z.array(Skenario).min(2).max(6),
    awal: z.number().int().nonnegative(),
    tebak: z
      .object({
        q: Teks,
        pilihan: z.array(Teks).min(2).max(4),
        jawaban: z.number().int().nonnegative(),
        skenario: z.number().int().nonnegative(), // skenario yang membuka jawaban
        alasan: Teks,
      })
      .strict(),
    label: z
      .object({
        sumber: Teks,
        tebakDulu: Teks,
        lanjut: Teks,
        benar: Teks,
        belum: Teks,
        ubah: Teks,
        caption: Teks,
        tanpa: Teks,
        dengan: Teks,
        besaran: Teks,
        baris: z.object({ potensi: Teks, keServer: Teks, tersedia: Teks, ditolak: Teks, batasKlien: Teks, klienLebih: Teks }).strict(),
        // templat kalimat kesimpulan; isian: {potensi} {tersedia} {ditolak} {ditolakServer} {keServer} {serverMaks} {maxClient} {klienLebih}
        kesimpulan: z.object({ muatTanpa: Teks, pooler: Teks, serverLewat: Teks, klienLewat: Teks }).strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const n = d.skenario.length;
    if (d.awal >= n) ctx.addIssue({ code: "custom", path: ["awal"], message: "di luar skenario" });
    if (d.tebak.jawaban >= d.tebak.pilihan.length) ctx.addIssue({ code: "custom", path: ["tebak", "jawaban"], message: "di luar pilihan" });
    if (d.tebak.skenario >= n) ctx.addIssue({ code: "custom", path: ["tebak", "skenario"], message: "di luar skenario" });
    if (d.tebak.skenario === d.awal) ctx.addIssue({ code: "custom", path: ["tebak", "skenario"], message: "jawaban harus dibuka dengan mengubah skenario" });
    if (d.masukan.cadangan >= d.masukan.maxConnections) ctx.addIssue({ code: "custom", path: ["masukan", "cadangan"], message: "cadangan melewati max_connections" });
  });
export type DataKoneksi = z.infer<typeof DataKoneksi>;
