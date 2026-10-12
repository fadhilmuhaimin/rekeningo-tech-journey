// Skema data widget kalkulator estimasi (keputusan 303). Data teks divalidasi saat build dan di tes.
// Angka asumsi tidak ditulis di data widget: halaman mengirim `tahap[].asumsi` dari registry (cerita.json),
// dan setiap skenario menunjuk satu tahap, dengan perubahan opsional (mis. faktor puncak lain).
import { z } from "zod";

const Teks = z.string().min(1);

/** Asumsi beban satu tahap, bentuknya sama dengan `tahap[].asumsi` di cerita.json (kunci lain diabaikan). */
export const Asumsi = z.object({
  user: z.number().int().positive(), // user terdaftar
  aktif: z.number().gt(0).max(100), // persen user aktif per hari
  req: z.number().positive(), // request per user aktif per hari
  puncak: z.number().min(1), // faktor puncak: jam paling ramai dibanding rata-rata harian
});
export type Asumsi = z.infer<typeof Asumsi>;

export const DaftarAsumsi = z.array(Asumsi).min(1); // indeks 0 = Tahap 1

const Skenario = z
  .object({
    label: Teks,
    tahap: z.number().int().min(1),
    ubah: Asumsi.partial().optional(),
  })
  .strict();

export const DataKalkulator = z
  .object({
    id: Teks,
    judul: Teks,
    sumber: z.object({ jenis: z.enum(["rekaman", "ilustrasi", "asumsi"]), teks: Teks }).strict(),
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
        ubah: Teks,
        asumsi: Teks,
        detik: Teks,
        ms: Teks,
        baris: z
          .object({ user: Teks, dau: Teks, reqHari: Teks, rata: Teks, puncak: Teks })
          .strict(),
        kesimpulan: Teks, // templat: {puncak}, {jarak}, {user}; minimal satu angka hasil
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
    if (!/\{(puncak|jarak)\}/.test(d.label.kesimpulan)) ctx.addIssue({ code: "custom", path: ["label", "kesimpulan"], message: "templat tanpa {puncak} atau {jarak}" });
  });

export type DataKalkulator = z.infer<typeof DataKalkulator>;
