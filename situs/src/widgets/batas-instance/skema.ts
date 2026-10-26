// Skema teks widget "Satu penyemprotan, satu atau dua instance" (3.16). Dipakai saat build saja (BatasInstance.astro), jadi
// island tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman labs/t3-instance/output/batas.txt dan kode
// api-t3 lewat logika.ts. Angka di pilihan tebakan hanyalah tebakan; templat {nama} diisi dari rekaman.
import { z } from "zod";

const Teks = z.string().min(1);
const PerKondisi = z.object({ label: Teks, kesimpulan: Teks, catatan: Teks }).strict();

export const LabelBatasInstance = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks,
    pilihan: z.array(z.object({ teks: Teks, angka: z.number().int().nonnegative(), alasan: Teks }).strict()).min(3).max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    tabel: z.object({ judul: Teks, perbandingan: Teks, nilai: Teks }).strict(),
    baris: z.object({ percobaan: Teks, sampai: Teks, ditolak: Teks, terbuka: Teks }).strict(),
    ubahJudul: Teks,
    kondisi: z.object({ "dua-instance": PerKondisi, "satu-instance": PerKondisi }).strict(),
    tanpaJs: Teks,
  })
  .strict();

export type LabelBatasInstance = z.infer<typeof LabelBatasInstance>;
