// Skema teks widget jarak ke pemicu cache (ADR 21, keputusan 772). Dipakai saat build saja (JarakPemicu.astro), jadi island
// tidak memuat Zod. Angka tidak ditulis di sini: semuanya dari rekaman n1.txt dan registry lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const PerCara = z
  .object({ "hal1-n1": Teks, "hal1-join": Teks, "hal1-join-index": Teks, "seluruh-n1": Teks, "seluruh-join": Teks })
  .strict();

export const LabelJarak = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {w}, {puncak}
    pilihan: z.array(z.object({ kali: z.number().positive(), alasan: Teks }).strict()).min(3).max(3),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    nama: PerCara,
    kolom: z.object({ w: Teks, l: Teks, lambda: Teks, kali: Teks }).strict(),
    kalimat: PerCara, // {w}, {lambda}, {kali}
    catatan: Teks, // {puncak}, {pool}, {ambang}
    tanpaJs: Teks,
  })
  .strict();

export type LabelJarak = z.infer<typeof LabelJarak>;
