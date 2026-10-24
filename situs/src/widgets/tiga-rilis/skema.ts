// Skema teks widget tiga rilis (2.22, keputusan 813-815). Dipakai saat build saja (TigaRilis.astro), jadi island tidak
// memuat Zod. Keadaan app dan isi fase tidak ditulis di sini: semuanya dari rekaman lewat logika.ts.
import { z } from "zod";

const Teks = z.string().min(1);

export const LabelTigaRilis = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks,
    pilihan: z.array(z.object({ kunci: z.enum(["bayar", "keduanya", "tidak"]), teks: Teks, alasan: Teks }).strict()).length(3),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    fase: z.array(z.object({ judul: Teks, ringkas: Teks }).strict()).length(5),
    papan: Teks, // nama daftar app untuk pembaca layar
    app: z.object({ "1.0": Teks, "1.1": Teks }).strict(),
    status: z.object({ jalan: Teks, berhenti: Teks, belum: Teks }).strict(),
    sesi: z.object({ S: Teks, BF: Teks, P: Teks, Q: Teks, X: Teks, P1: Teks, P2: Teks }).strict(),
    bayarRiwayat: Teks, // {saldo}, {baris}
    cek: Teks, // {akun}, {tanpa}, {beda}
    langkah: Teks, // {no}, {total}
    berikutnya: Teks,
    mulaiUlang: Teks,
    ubahJudul: Teks,
    mode: z.object({ tiga: Teks, satu: Teks }).strict(),
    kesimpulan: z.object({ tiga: Teks, satu: Teks }).strict(),
    catatan: z.object({ tiga: Teks, satu: Teks }).strict(),
    satu: z.object({ judul: Teks, ringkas: Teks, serverLama: Teks, appBerhenti: Teks }).strict(), // {versi}
    tanpaJs: Teks,
  })
  .strict();

export type LabelTigaRilis = z.infer<typeof LabelTigaRilis>;
