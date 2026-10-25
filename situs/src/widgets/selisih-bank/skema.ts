// Skema teks widget "File lawan ledger" (M15, keputusan 840). Dipakai saat build saja (SelisihBank.astro), jadi island
// tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman rentan.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const PerUrutan = z.object({ "file-dulu": Teks, "jurnal-dulu": Teks }).strict();

export const LabelSelisihBank = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks,
    pilihan: z
      .array(z.object({ teks: Teks, alasan: Teks, arah: z.enum(["nol", "file-lebih-besar", "file-lebih-kecil"]) }).strict())
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    tabel: z.object({ judul: Teks, perbandingan: Teks, nilai: Teks }).strict(),
    baris: z.object({ baris: Teks, total: Teks, jurnal: Teks, mutasi: Teks, selisih: Teks, warungFile: Teks, warungLedger: Teks }).strict(),
    ubahJudul: Teks,
    urutan: PerUrutan,
    kesimpulan: PerUrutan,
    catatan: PerUrutan,
    tanpaJs: Teks,
  })
  .strict();

export type LabelSelisihBank = z.infer<typeof LabelSelisihBank>;
