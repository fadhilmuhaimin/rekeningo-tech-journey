// Skema teks widget query riwayat (M11, keputusan 662). Dipakai saat build saja (QueryRiwayat.astro), jadi island
// tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman n1.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);

export const LabelQuery = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {baris}
    pilihan: z.array(z.object({ query: z.number().int().positive(), alasan: Teks }).strict()).min(3).max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    nama: z.object({ "halaman-1": Teks, "laporan-ani": Teks, seluruh: Teks }).strict(),
    kolom: z.object({ baris: Teks, query: Teks, waktu: Teks }).strict(),
    kalimat: Teks, // {baris}, {query}
    catatan: Teks,
    tanpaJs: Teks,
  })
  .strict();

export type LabelQuery = z.infer<typeof LabelQuery>;
