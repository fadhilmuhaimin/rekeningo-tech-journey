// Skema teks widget daftar bergeser (M12, keputusan 672). Dipakai saat build saja (GeserRiwayat.astro), jadi island
// tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman pagination.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);

export const LabelGeser = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {limit}, {offset}, {kiriman}, {lawan}, {jumlah}
    pilihan: z
      .array(
        z
          .object({
            teks: Teks,
            alasan: Teks, // {limit}, {offset}, {posisi}, {ganda}
            ganda: z.number().int().nonnegative(),
            kirimanTampil: z.boolean(),
            terlewat: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    layar: Teks, // judul daftar di layar sesudah halaman 1
    database: Teks, // judul daftar di database sesudah kiriman, {kiriman}
    garis: Teks, // {offset}, {awal}, {akhir}
    tanda: z.object({ baru: Teks, ganda: Teks }).strict(),
    kolom: z.object({ halaman: Teks, kiriman: Teks, tampil: Teks, ganda: Teks, tidakTampil: Teks }).strict(),
    ubahJudul: Teks,
    nama: z.object({ "dua-halaman": Teks, seluruh: Teks }).strict(), // {baris}
    kalimat: Teks, // {halaman}, {kiriman}, {tampil}, {ganda}, {tidakTampil}
    catatan: Teks,
    tanpaJs: Teks,
  })
  .strict();

export type LabelGeser = z.infer<typeof LabelGeser>;
