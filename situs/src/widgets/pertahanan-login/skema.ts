// Skema teks widget "Satu penyemprotan, enam kondisi" (2.28, keputusan 853). Dipakai saat build saja
// (PertahananLogin.astro), jadi island tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman
// labs/c4-ratelimit/output/login/ratelimit.txt lewat logika.ts. Angka di pilihan tebakan hanyalah tebakan.
import { z } from "zod";

const Teks = z.string().min(1);
const PerKondisi = z.object({ label: Teks, kesimpulan: Teks, catatan: Teks }).strict();

export const LabelPertahananLogin = z
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
    kondisi: z
      .object({
        "dua-lapis": PerKondisi,
        "kunci-saja": PerKondisi,
        "xff-mentah": PerKondisi,
        "proxy-palsu": PerKondisi,
        "dua-instance": PerKondisi,
        ipv6: PerKondisi,
      })
      .strict(),
    tanpaJs: Teks,
  })
  .strict();

export type LabelPertahananLogin = z.infer<typeof LabelPertahananLogin>;
