// Skema teks widget webhook masuk langkah demi langkah (W4-webhook, keputusan 1258). Dipakai saat build dan di tes saja
// (WebhookLangkah.astro, logika.ts), jadi island tidak memuat Zod. Angka tidak ditulis di sini: setiap angka di teks adalah
// {placeholder} yang diisi dari rekaman lewat logika.ts; tes menolak angka dan kata bilangan yang diketik tangan.
import { z } from "zod";

const Teks = z.string().min(1);
const Tanda = z.enum(["netral", "baik", "buruk"]);
const JenisSumber = z.enum(["rekaman", "hitungan", "ilustrasi", "asumsi", "tidak"]);

const Baris = z.object({ label: Teks, nilai: Teks, tanda: Tanda }).strict();

/** Sumber satu hasil. Rekaman wajib menyebut lab, berkas, dan bagian (huruf bagian di berkas itu). */
const Sumber = z
  .object({
    jenis: JenisSumber,
    lab: z.enum(["t4-webhook", "api-t4"]).optional(),
    berkas: z.string().regex(/^[a-z]+\.txt$/).optional(),
    bagian: z.string().regex(/^[A-Z]\d?$/).optional(),
    teks: Teks,
  })
  .strict()
  .refine((s) => s.jenis !== "rekaman" || (s.lab && s.berkas && s.bagian), { message: "Rekaman lab wajib menyebut lab, berkas, dan bagian" });

const Hasil = z.object({ ringkas: Teks, baris: z.array(Baris).min(3).max(4), sumber: z.array(Sumber).min(1).max(2) }).strict();

export const IdLangkah = z.enum(["buat", "kabar1", "ulang", "terlambat", "hilang", "cek", "rekon", "hasil"]);

const Langkah = z
  .object({
    id: IdLangkah,
    judul: Teks,
    teks: Teks,
    hasil: z.union([z.object({ semua: Hasil }).strict(), z.object({ pertama: Hasil, adr34: Hasil }).strict()]),
  })
  .strict();

const PilihanTebak = z.object({ nilai: z.number().int().nonnegative(), teks: Teks, alasan: Teks }).strict();

export const LabelWebhook = z
  .object({
    judul: Teks,
    sumberChip: Teks,
    jenisChip: z.object({ rekaman: Teks, hitungan: Teks, ilustrasi: Teks, asumsi: Teks, tidak: Teks }).strict(),
    tebakDulu: Teks,
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    modeJudul: Teks,
    mode: z.object({ pertama: Teks, adr34: Teks }).strict(),
    modeKalimat: z.object({ pertama: Teks, adr34: Teks }).strict(),
    petunjuk: Teks,
    keadaanJudul: Teks,
    langkahJudul: Teks,
    berikutnya: Teks,
    sebelumnya: Teks,
    statusLangkah: Teks,
    tanda: z.object({ baik: Teks, buruk: Teks }).strict(),
    tanpaJs: Teks,
    kolomTabel: z.object({ langkah: Teks, versi: Teks, hasil: Teks, sumber: Teks }).strict(),
    tebak: z.object({ pertanyaan: Teks, pilihan: z.array(PilihanTebak).length(3) }).strict(),
    langkah: z.array(Langkah).length(8),
  })
  .strict();

export type LabelWebhook = z.infer<typeof LabelWebhook>;
export type HasilWebhook = z.infer<typeof Hasil>;
export type JenisSumberWebhook = z.infer<typeof JenisSumber>;
export type TandaWebhook = z.infer<typeof Tanda>;
