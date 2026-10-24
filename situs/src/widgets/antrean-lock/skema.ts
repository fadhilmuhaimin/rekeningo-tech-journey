// Skema teks widget antrean lock (M13, keputusan 810). Dipakai saat build saja (AntreanLock.astro), jadi island tidak
// memuat Zod. Keadaan sesi tidak ditulis di sini: semuanya dari rekaman lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const Sesi = z.enum(["R", "M", "P1", "P2"]);

export const LabelAntrean = z
  .object({
    judul: Teks,
    sumber: Teks,
    papan: Teks, // nama daftar sesi untuk pembaca layar
    tebakDulu: Teks,
    pertanyaan: Teks,
    pilihan: z.array(z.object({ menunggu: z.union([Sesi, z.literal("-")]), alasan: Teks }).strict()).min(3).max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    nama: z.object({ R: Teks, M: Teks, P1: Teks, P2: Teks }).strict(),
    tanpaPilihan: Teks, // teks pilihan "tidak ada yang ditunggu"
    status: z.object({ belum: Teks, terbuka: Teks, menunggu: Teks, selesai: Teks, gagal: Teks, menyerah: Teks }).strict(),
    belakang: Teks, // {nama}
    langkah: Teks, // {no}, {total}
    berikutnya: Teks,
    mulaiUlang: Teks,
    ubahJudul: Teks,
    mode: z.object({ tanpa: Teks, dengan: Teks }).strict(),
    kesimpulan: z.object({ tanpa: Teks, dengan: Teks }).strict(),
    catatan: z.object({ tanpa: Teks, dengan: Teks }).strict(),
    tanpaJs: Teks,
  })
  .strict();

export type LabelAntrean = z.infer<typeof LabelAntrean>;
