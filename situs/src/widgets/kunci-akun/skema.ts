// Skema teks widget kunci akun (M16, keputusan 850). Dipakai saat build saja (KunciAkun.astro), jadi island tidak
// memuat Zod. Angka, status, dan lama kunci tidak ditulis di sini: semuanya dari rekaman ratelimit.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);

export const LabelKunciAkun = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {awal}, {kunci1}
    pilihan: z
      .array(
        z
          .object({
            teks: Teks,
            alasan: Teks, // {awal}, {ke2}, {detik2}, {detik3}
            tebakan: z.number().int().min(0),
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    giliran: z.object({ penyerang: Teks, ani: Teks }).strict(),
    tabel: z
      .object({
        penyerang: z.object({ judul: Teks, kolom: z.tuple([Teks, Teks, Teks, Teks]) }).strict(),
        ani: z.object({ judul: Teks, kolom: z.tuple([Teks, Teks, Teks, Teks]) }).strict(),
      })
      .strict(),
    sel: z
      .object({
        putaran: Teks, // {ke}
        tebakan: Teks, // {n}
        jawaban: Teks, // {status}, {judul}
        jawabanAni: Teks, // {status}
        kunci: Teks, // {detik}
        tanpaKunci: Teks,
        aniKirim: Teks,
        penghitung: Teks, // {n}
      })
      .strict(),
    kesimpulan: z.object({ penyerang: Teks, ani: Teks }).strict(), // {ke2}, {detik2}, {detik3}, {maks}, {sesudah}
    catatan: z.object({ penyerang: Teks, ani: Teks }).strict(), // {sesudah}
    tanpaJs: Teks,
  })
  .strict();

export type LabelKunciAkun = z.infer<typeof LabelKunciAkun>;
