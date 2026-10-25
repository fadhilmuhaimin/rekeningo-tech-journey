// Skema teks widget ukuran payload (2.20, keputusan 821). Dipakai saat build saja (UkuranPayload.astro), jadi island
// tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman ukuran.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);

export const LabelUkuran = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {baris}, {api}
    pilihan: z
      .array(
        z
          .object({
            teks: Teks, // {baris}
            alasan: Teks, // {baris}, {api}, {layar}, {gzip}, {layarGzip}, {hematLayar}, {hematGzip}, {hematLayarGzip}, {selisih}
            pemenang: z.enum(["layar", "gzip", "sama", "tidak"]),
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    grup: z.object({ bentuk: Teks, kompresi: Teks, baris: Teks, buka: Teks }).strict(),
    bentuk: z.object({ api: Teks, layar: Teks, penuh: Teks }).strict(),
    kompresi: z.object({ tidak: Teks, ya: Teks }).strict(),
    kolom: z.object({ byte: Teks, banding: Teks, kuota: Teks, satuPersen: Teks }).strict(),
    kalimat: Teks, // {bentuk}, {kompresi}, {baris}, {byte}, {banding}, {buka}, {kuota}, {paket}, {satuPersen}
    catatan: Teks,
    tanpaJs: Teks,
  })
  .strict();

export type LabelUkuran = z.infer<typeof LabelUkuran>;
