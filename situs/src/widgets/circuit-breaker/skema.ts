// Skema teks widget "Circuit breaker interaktif" (W4-breaker, keputusan 1262). Dipakai saat build saja (CircuitBreaker.astro),
// jadi island tidak memuat Zod. Angka acuan tidak ditulis di sini: semuanya dari rekaman t4-integrasi lewat rekaman.ts;
// teks hanya memakai {nama} yang diisi dari angka itu (teks.ts) atau dari simulasi (island).
import { z } from "zod";

const Teks = z.string().min(1);
const Jalur = z.enum(["sinkron", "queue"]);
const Jenis = z.enum(["5xx", "4xx-gagal", "4xx-sukses"]);
const Pulih = z.enum(["sementara", "terus"]);
export const KUNCI_ACUAN = ["sinkron-bawaan", "sinkron-4xx-gagal", "sinkron-4xx-sukses", "queue-tanpa", "queue-satu", "queue-empat", "queue-4xx-gagal", "queue-4xx-sukses"] as const;
const Acuan = z.enum(KUNCI_ACUAN);
const Pilih = <T extends z.ZodType>(nilai: T, maks = 4) => z.array(z.object({ nilai, label: Teks }).strict()).min(2).max(maks);
const Vonis = z.enum(["sinkron-tanpa", "sinkron-tetap", "sinkron-membuka", "queue-tanpa", "queue-tetap", "queue-membuka"]);
const Hasil = z.enum(["ok", "5xx", "timeout", "4xx", "tolak", "diam"]);

export const LabelBreaker = z
  .object({
    judul: Teks,
    sumber: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks, // {n}, {percobaan}, {lebihDari}
    pilihan: z
      .array(
        z
          .object({
            teks: Teks, // {n}, {gagalKe}, {mati}
            jumlah: z.number().int().min(0), // tebakan: jumlah pekerjaan mati; yang benar sama dengan rekaman
            alasan: Teks, // {n}, {percobaan}, {gagalKe}, {mati}, {menunggu}, {permintaan}
          })
          .strict(),
      )
      .min(3)
      .max(4),
    benar: Teks,
    belum: Teks,
    ulang: Teks,
    ubahJudul: Teks,
    kelompok: z.object({ jalur: Teks, error: Teks, latensi: Teks, jenis: Teks, breaker: Teks, pulih: Teks, serentak: Teks }).strict(),
    pilihNilai: z
      .object({
        jalur: Pilih(Jalur),
        error: Pilih(z.number().int().min(0).max(100)),
        latensi: Pilih(z.number().int().min(0)),
        jenis: Pilih(Jenis),
        breaker: Pilih(z.boolean()),
        pulih: Pilih(Pulih),
        serentak: Pilih(z.number().int().min(1)),
      })
      .strict(),
    awal: Teks, // tombol kembali ke pengaturan awal
    papan: z
      .object({
        judul: Teks,
        baris: Teks, // {dari}, {sampai}
        legenda: Teks,
        status: z.object({ closed: Teks, open: Teks, "half-open": Teks }).strict(),
        hasil: z.record(Hasil, Teks),
      })
      .strict(),
    angka: z
      .object({
        sinkron: z.object({ permintaan: Teks, kevendor: Teks, ditolak: Teks, tunggu: Teks, ditolakSehat: Teks }).strict(),
        queue: z.object({ terkirim: Teks, menunggu: Teks, mati: Teks, kevendor: Teks, probe: Teks }).strict(),
        detik: Teks, // {x}
        tanpaBreaker: Teks, // {x}
      })
      .strict(),
    pekerjaan: z.object({ judul: Teks, kolom: z.tuple([Teks, Teks, Teks]), status: z.object({ menunggu: Teks, terkirim: Teks, mati: Teks }).strict() }).strict(),
    vonis: z.record(Vonis, Teks), // {x}, {n}, {ditolak}, {tunggu}, {terkirim}, {mati}, {menunggu}, {kevendor}, {percobaan}, {horizon}
    ringkas: z.object({ sinkron: Teks, queue: Teks }).strict(), // {ditolak}, {tunggu}; {mati}, {terkirim}, {kevendor}
    banding: z.object({ sama: Teks, beda: Teks }).strict(), // {awal}, {kini}
    cocok: Teks,
    tanpaAcuan: Teks,
    acuan: z.record(Acuan, Teks),
    namaAcuan: z.record(Acuan, Teks),
    catatan: z.object({ sinkron: Teks, ambang: Teks, probe: Teks, empatSukses: Teks, empatDiulang: Teks, harga: Teks }).strict(),
    hitungan: z
      .object({
        judul: Teks,
        worker: Teks, // {laju}, {percobaan}, {detik}, {slot}, {kapasitas}
        bersama: Teks, // {lajuUang}, {detikUang}, {slotUang}, {bersama}, {kapasitas}
        label: Teks, // {laju}, {lajuUang}, {detikUang}, {serentak}, {timeoutClient}
        dijeda: Teks,
        outage: Teks, // {outageDetik}, {buka}, {probe}, {percobaan}, {matiMaks}, {pekerjaan}
      })
      .strict(),
    asal: z.object({ judul: Teks, butir: z.array(Teks).min(4) }).strict(),
    tanpaJs: Teks,
    tabel: z.object({ judul: Teks, kolom: z.tuple([Teks, Teks]) }).strict(),
  })
  .strict();

export type LabelBreaker = z.infer<typeof LabelBreaker>;
export type KunciAcuanLabel = (typeof KUNCI_ACUAN)[number];
