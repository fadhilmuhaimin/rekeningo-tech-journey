// Skema teks widget pool dan Little's Law (W3-pool, keputusan 980). Dipakai saat build saja (PoolLittle.astro), jadi island
// tidak memuat Zod. Angka acuan tidak ditulis di sini: semuanya dari rekaman t3-pool lewat rekaman.ts dan logika.ts;
// teks hanya memakai {nama} yang diisi dari angka itu.
import { z } from "zod";

const Teks = z.string().min(1);
const Pengaman = z.enum(["tidak", "timeout-push", "idle-tx", "di-luar"]);
const Kunci = z.enum(["A", "B", "C", "D", "E", "F", "L03", "L2", "L10"]);
const Angka = z.number().positive();
const Pilih = <T extends z.ZodType>(nilai: T) => z.array(z.object({ nilai, label: Teks }).strict()).min(2).max(6);

export const LabelPool = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {lambda}, {n}
    pilihan: z
      .array(
        z
          .object({
            teks: Teks, // {lambda}, {n}
            detik: z.number().int().positive().nullable(), // tebakan dalam detik; null = tidak pernah
            alasan: Teks, // {lambda}, {n}, {hitungan}, {dari}, {sampai}, {penuhB}, {bayar3}
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    kelompok: z.object({ n: Teks, t: Teks, tClient: Teks, pengaman: Teks }).strict(),
    pilihNilai: z
      .object({
        n: Pilih(Angka),
        t: Pilih(Angka.nullable()),
        tClient: Pilih(Angka.nullable()),
        pengaman: Pilih(Pengaman),
      })
      .strict(),
    awal: Teks, // tombol kembali ke pengaturan awal
    jam: z.object({ label: Teks, keluar: Teks, nilai: Teks }).strict(), // keluar: {x}; nilai: {x} {terpakai} {n} {menunggu}
    papan: z.object({ pool: Teks, antre: Teks, kosongAntre: Teks, grafik: Teks, garisL: Teks }).strict(), // pool: {n}
    keadaan: z
      .object({
        judul: Teks, // {x}
        dikirim: Teks,
        terpakai: Teks,
        menunggu: Teks,
        menyerah: Teks,
        pg: Teks,
        baca: Teks,
        bacaDijawab: Teks,
        bacaMenunggu: Teks,
      })
      .strict(),
    hitungan: z
      .object({
        judul: Teks,
        lambda: Teks,
        lambdaNilai: Teks, // {lambda}, {rps}, {tiap}
        w: Teks,
        wNilai: Teks, // {cara}, {w}
        l: Teks,
        lNilai: Teks, // {lambda}, {w}, {l}
        penuh: Teks,
        penuhNilai: Teks, // {n}, {lambda}, {x}
        tidakPenuh: Teks,
        detik: Teks,
        koneksi: Teks,
      })
      .strict(),
    vonis: z.object({ muat: Teks, sempat: Teks, penuh: Teks }).strict(), // {n} {puncak} {l} {x}
    banding: z.object({ sama: Teks, beda: Teks }).strict(), // {awal} {kini}
    ringkasVonis: z.object({ muat: Teks, sempat: Teks, penuh: Teks }).strict(), // {puncak} {x}
    cocok: Teks, // {acuan}
    tanpaAcuan: Teks,
    acuan: z.record(Kunci, Teks), // templat per titik acuan, diisi dari rekaman
    catatan: z.object({ "timeout-push": Teks, "idle-tx": Teks, "di-luar": Teks, tClient: Teks }).strict(),
    asal: z.object({ judul: Teks, butir: z.array(Teks).min(4) }).strict(),
    tanpaJs: Teks,
    tabel: z.object({ judul: Teks, kolom: z.tuple([Teks, Teks, Teks]), tidakPernah: Teks, penuh: Teks }).strict(), // penuh: {x}
  })
  .strict();

export type LabelPool = z.infer<typeof LabelPool>;
export type KunciAcuanLabel = z.infer<typeof Kunci>;
