// Skema teks widget outbox dan worker (W3-outbox, keputusan 983). Dipakai saat build dan di tes saja
// (OutboxWorker.astro, siap.ts), jadi island tidak memuat Zod. Angka tidak ditulis di sini: setiap angka di teks
// adalah {placeholder} yang diisi dari rekaman lewat logika.ts; tes menolak angka yang diketik tangan.
import { z } from "zod";

const Teks = z.string().min(1);
const Jenis = z.enum(["yatidak", "jumlah", "detik", "persen", "perdetik", "rupiah"]);
const Pilihan = z
  .object({ nilai: z.union([z.string().min(1), z.number()]), teks: Teks.optional(), alasan: Teks })
  .strict();

const Skenario = z
  .object({
    nama: Teks,
    tebak: z
      .object({ pertanyaan: Teks, pilihanTeks: Teks.optional(), pilihan: z.array(Pilihan).length(3) })
      .strict(),
    knob: z
      .array(z.object({ id: Teks, label: Teks, opsi: z.record(Teks, Teks) }).strict())
      .min(2)
      .max(3),
    angka: z.array(z.object({ kunci: Teks, label: Teks, jenis: Jenis }).strict()).min(3),
    ringkas: z.record(Teks, Teks),
    peristiwa: z.record(Teks, Teks),
  })
  .strict();

export const LabelOutbox = z
  .object({
    judul: Teks,
    sumberChip: Teks,
    jenisChip: z.object({ rekaman: Teks, hitungan: Teks, ilustrasi: Teks }).strict(),
    tebakDulu: Teks,
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    skenarioJudul: Teks,
    garisJudul: Teks,
    angkaJudul: Teks,
    waktu: z.object({ urut: Teks, detik: Teks, paling: Teks, klaim: Teks }).strict(),
    lajur: z.object({ uang: Teks, outbox: Teks, worker: Teks, push: Teks, hp: Teks }).strict(),
    tanda: z.object({ baik: Teks, buruk: Teks }).strict(),
    kata: z.object({ ya: Teks, tidak: Teks }).strict(),
    satuan: z.object({ jumlah: Teks, detik: Teks, persen: Teks, perdetik: Teks, rupiah: Teks }).strict(),
    acuan: z.object({ rekaman: Teks, hitungan: Teks, ilustrasi: Teks }).strict(),
    tanpaJs: Teks,
    kolomTabel: z.object({ pengaturan: Teks, hasil: Teks, sumber: Teks }).strict(),
    skenario: z
      .object({ cara: Skenario, kursor: Skenario, ulang: Skenario, ganda: Skenario, antrean: Skenario })
      .strict(),
  })
  .strict();

export type LabelOutbox = z.infer<typeof LabelOutbox>;
