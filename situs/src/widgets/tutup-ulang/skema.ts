// Skema teks widget "Tutup buku diulang" (M17, keputusan 760). Dipakai saat build saja (TutupUlang.astro), jadi island
// tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman tutup-buku.txt lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const PerWaktu = z.object({ sebelum: Teks, sesudah: Teks }).strict();

export const LabelTutupUlang = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks,
    pilihan: z
      .array(z.object({ teks: Teks, alasan: Teks, arah: z.enum(["sama", "naik-cocok", "tidak-cocok"]) }).strict())
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    tabel: z.object({ judul: Teks, periksa: Teks, nilai: Teks }).strict(),
    baris: z.object({ jurnal: Teks, cocok: Teks, tidakCocok: Teks, tidakSeimbang: Teks, masuk: Teks, akhir: Teks, cache: Teks }).strict(),
    ubahJudul: Teks,
    ubahChip: Teks,
    tetapChip: Teks,
    waktu: PerWaktu,
    kesimpulan: PerWaktu,
    catatan: PerWaktu,
    tanpaJs: Teks,
  })
  .strict();

export type LabelTutupUlang = z.infer<typeof LabelTutupUlang>;
