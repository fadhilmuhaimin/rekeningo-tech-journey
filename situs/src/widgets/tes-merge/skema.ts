// Skema teks widget tes merge (M14, keputusan 826). Dipakai saat build saja (TesMerge.astro), jadi island tidak memuat
// Zod. Angka dan nama tes tidak ditulis di sini: semuanya dari rekaman m14.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);

export const LabelTesMerge = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {gagal}
    pilihan: z
      .array(
        z
          .object({
            teks: Teks,
            alasan: Teks, // {gagal}, {nama}
            bisaBangun: z.boolean(),
            unitPeriksaGagal: z.boolean(),
            kirimGagal: z.boolean(),
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    tabel: z.object({ judul: Teks, kode: Teks, pemanggil: Teks, hasil: Teks }).strict(),
    nama: z.object({ asli: Teks, tanpa: Teks }).strict(),
    status: z.object({ lolos: Teks, gagal: Teks }).strict(),
    hitung: Teks, // {lolos}, {gagal}, {dilewati}
    ubahJudul: Teks,
    mode: z.object({ dengan: Teks, tanpa: Teks }).strict(),
    kesimpulan: z.object({ dengan: Teks, tanpa: Teks }).strict(), // {gagal}, {dilewati}, {nama}
    catatan: z.object({ dengan: Teks, tanpa: Teks }).strict(),
    tanpaJs: Teks,
  })
  .strict();

export type LabelTesMerge = z.infer<typeof LabelTesMerge>;
