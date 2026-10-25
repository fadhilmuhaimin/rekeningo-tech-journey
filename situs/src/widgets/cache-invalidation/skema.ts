// Skema teks widget cache dan invalidation (W3-cache, keputusan 986). Dipakai saat build saja (CacheInvalidation.astro), jadi
// island tidak memuat Zod. Angka acuan tidak ditulis di sini: semuanya dari rekaman t3-cache lewat rekaman.ts; teks hanya
// memakai {nama} yang diisi dari angka itu (teks.ts) atau oleh island saat dijalankan (jam, jumlah instance, lama).
import { z } from "zod";

const Teks = z.string().min(1);
const Pilih = <T extends z.ZodType>(nilai: T, min = 2, max = 6) => z.array(z.object({ nilai, label: Teks }).strict()).min(min).max(max);
const Sebab = z.enum(["tanpa-cache", "dihapus-sendiri", "dihapus-bersama", "entri-habis-dulu", "tidak-diberi-tahu", "diisi-ulang", "hapus-gagal", "tanpa-tulis"]);
const KunciAcuan = z.enum(["memori-promo", "memori-stok", "redis-harga", "redis-promo", "redis-sebelum", "redis-lambat", "redis-nanti", "redis-mati", "tanpa"]);

export const LabelCache = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks,
    pilihan: z
      .array(
        z
          .object({
            teks: Teks, // {detik}
            detik: z.number().int().positive().nullable(), // detik pertama harga baru terbaca; null = tidak pernah
            alasan: Teks,
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    kelompok: z.object({ cache: Teks, instance: Teks, ttl: Teks, kejadian: Teks, urutan: Teks }).strict(),
    pilihNilai: z
      .object({
        cache: Pilih(z.enum(["memori", "redis", "redis-mati", "tanpa"]), 4, 4),
        instance: Pilih(z.number().int().positive(), 3, 3),
        ttl: Pilih(z.number().positive(), 3, 3),
        kejadian: Pilih(z.enum(["promo", "harga", "promo-nanti", "pesanan"]), 4, 4), // label boleh memakai {mulai}
        urutan: Pilih(z.enum(["sesudah", "sebelum", "lambat"]), 3, 3),
      })
      .strict(),
    instance: z.array(Teks).length(3), // nama tiap instance
    awal: Teks,
    jam: z
      .object({
        label: Teks,
        keluar: Teks, // {x}
        nilai: Teks, // {x} {basi} {n}
        lompatSebelum: Teks, // {x}
        lompatSaat: Teks, // {x}
      })
      .strict(),
    papan: z
      .object({
        judul: Teks, // {x}
        database: Teks, // {isi}
        isi: Teks, // {harga} {stok}
        stale: Teks,
        benar: Teks,
        istilah: Teks,
        garis: Teks, // {nama} {horizon} {ttl}
      })
      .strict(),
    vonis: z.record(Sebab, Teks), // {x} {lama}
    ringkas: z.object({ ada: Teks, tidak: Teks }).strict(), // {lama}
    banding: z.object({ sama: Teks, beda: Teks }).strict(), // {awalX} {awal} {kiniX} {kini}
    cocok: Teks,
    tanpaAcuan: Teks,
    acuan: z.record(KunciAcuan, Teks),
    hitungan: z
      .object({
        judul: Teks,
        diisi: Teks,
        diisiNilai: Teks,
        lama: Teks, // {x}
        lamaNilai: Teks, // {cara}
        lamaNol: Teks,
        instanceBasi: Teks,
        instanceBasiNilai: Teks, // {k} {n}
        bacaKunci: Teks,
        bacaKunciNilai: z.object({ memori: Teks, redis: Teks, tanpa: Teks }).strict(), // memori: {n}
        beban: Teks,
        bebanNilai: Teks,
      })
      .strict(),
    catatan: z.object({ uang: Teks, ttlLab: Teks, sebelum: Teks, lambat: Teks, mati: Teks, nanti: Teks, pesanan: Teks }).strict(),
    asal: z.object({ judul: Teks, butir: z.array(Teks).min(5) }).strict(),
    tanpaJs: Teks,
    tabel: z.object({ judul: Teks, kolom: z.tuple([Teks, Teks, Teks]), tidakAda: Teks, ada: Teks }).strict(), // ada: {lama}
  })
  .strict();

export type LabelCache = z.infer<typeof LabelCache>;
export type KunciAcuanLabel = z.infer<typeof KunciAcuan>;
export type SebabLabel = z.infer<typeof Sebab>;
