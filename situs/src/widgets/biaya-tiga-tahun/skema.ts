// Skema data widget model biaya tiga tahun (ADR 59). Semua teks dari JSON; semua angka masukan juga dari JSON
// (juta rupiah, Ilustrasi), tidak ada angka hard-coded di komponen. Divalidasi saat build dan di tes.
import { z } from "zod";

const Teks = z.string().min(1);
const Bulat = z.number().int().nonnegative();

/** Masukan model, dalam juta rupiah kecuali disebut. Semua Ilustrasi, kecuali orangDasar (naskah Tahap 5, Asumsi). */
export const Masukan = z
  .object({
    biayaOrang: Bulat, // biaya satu orang operasi selama satu tahun
    orangDasar: Bulat, // platform + SRE: sama di kedua pilihan
    orangTambahan: Bulat, // orang operasi perangkat dan jaringan yang hanya dibutuhkan pilihan on-prem
    tumbuh: Bulat, // kapasitas yang dibutuhkan naik berapa persen tiap tahun
    cloudInfra1: Bulat, // infrastruktur cloud tahun 1
    cloudRisikoPeluang: Bulat.max(100), // persen per tahun
    cloudRisikoDampak: Bulat,
    perangkat1: Bulat, // perangkat on-prem yang dibeli di muka untuk kapasitas tahun 1
    sewa: Bulat, // tempat, listrik, dan jaringan on-prem per tahun
    migrasi: Bulat, // sekali, di tahun 1, hanya on-prem
    onpremRisikoPeluang: Bulat.max(100),
    onpremRisikoDampak: Bulat,
  })
  .strict();
export type Masukan = z.infer<typeof Masukan>;

const Skenario = z.object({ label: Teks, ubah: Masukan.partial().optional() }).strict();

export const DataBiaya = z
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
        captionKomponen: Teks,
        captionKumulatif: Teks,
        cloud: Teks,
        onprem: Teks,
        komponen: z.object({ infra: Teks, orang: Teks, migrasi: Teks, risiko: Teks, total: Teks }).strict(),
        tahun: Teks,
        kumulatif: Teks,
        // templat kalimat kesimpulan: {selisih} dalam juta rupiah, {impas} nomor tahun, {total} juta rupiah
        kesimpulan: z.object({ cloudMurah: Teks, cloudMurahImpas: Teks, onpremMurah: Teks, sama: Teks }).strict(),
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
    if (!d.label.kesimpulan.onpremMurah.includes("{selisih}") || !d.label.kesimpulan.cloudMurah.includes("{selisih}")) ctx.addIssue({ code: "custom", path: ["label", "kesimpulan"], message: "templat tanpa {selisih}" });
  });
export type DataBiaya = z.infer<typeof DataBiaya>;
