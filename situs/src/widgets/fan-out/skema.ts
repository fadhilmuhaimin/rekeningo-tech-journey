// Skema data widget fan-out notifikasi Tahap 5 (W5-fanout). Semua teks dari JSON; tidak ada teks atau angka hard-coded di komponen.
// Divalidasi saat build (pembungkus FanOut.astro) dan di tes. Pengikat antar bagian (pilihan, tebakan, acuan rekaman) diperiksa di
// superRefine; kecocokan dengan rekaman lab t5-fanout, kode api-t5, dan naskah diperiksa sumber.test.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const Id = z.string().regex(/^[a-z0-9_]+$/);

export const KELOMPOK = ["sebanyak", "lab"] as const;
export const KASUS = ["cukup", "partisi", "kuota"] as const;

const Pilihan = z.object({ id: Id, jumlah: z.number().int().positive(), label: Teks }).strict();

const Bukti = z.array(Teks).min(1); // baris yang harus ada di berkas dan bagian itu
const Rujukan = { berkas: z.string().regex(/^[a-z]+\.txt$/), bagian: z.string().regex(/^[A-Z]$/), teks: Teks, bukti: Bukti };

const Acuan = z
  .object({
    penerima: Id.optional(), // tanpa penerima, pengirim, dan kuota = berlaku untuk semua pilihan
    pengirim: Id.optional(),
    kuota: z.literal("lewat").optional(), // hanya bila kuota penyedia terlampaui pada kelompok partisi sebanyak consumer
    jenis: z.enum(["rekaman", "asumsi"]),
    ...Rujukan,
  })
  .strict();

const Label = z
  .object({
    sumber: Teks,
    tebakDulu: Teks,
    benar: Teks,
    belum: Teks,
    ubahJudul: Teks,
    pengirim: z.object({ label: Teks, nilai: Teks, petunjuk: Teks }).strict(), // nilai: {pengirim} {consumer}
    penerimaJudul: Teks,
    ringkas: z.object({ cukup: Teks, kuota: Teks }).strict(), // {penerima} {pengirim} {partisi} {durasi} {partisiLab} {durasiLab} {laju} {kuotaAngka}
    tabel: z.object({ caption: Teks, kolom: z.object({ consumer: Teks, antrean: Teks, laju: Teks, selesai: Teks, kuota: Teks, akibat: Teks }).strict() }).strict(),
    kelompok: z.object({ sebanyak: Teks, lab: Teks }).strict(), // {partisi}
    sel: z
      .object({
        consumer: Teks, // {bekerja} {consumer}
        antrean: Teks, // {perPartisi}
        laju: Teks, // {laju}
        selesai: Teks, // {durasi}
        selesaiKuota: Teks, // {durasi}
        kuota: Teks, // {persen} {kuotaAngka} {uang}
      })
      .strict(),
    akibat: z.object({ cukup: Teks, partisi: Teks, kuota: Teks }).strict(), // partisi: {menganggur}; kuota: {kelebihan} {batas} {durasiBatas}
    acuanJudul: Teks,
    acuanJenis: z.object({ rekaman: Teks, asumsi: Teks }).strict(),
    acuanBerkas: Teks, // {berkas} {bagian}
    tanpaAcuan: Teks,
    uangJudul: Teks,
    batasJudul: Teks,
    dasar: z.object({ kode: Teks, dokumentasi: Teks, rancangan: Teks }).strict(),
    tanpaJs: Teks,
    noscriptCaption: Teks,
    noscriptPengirim: Teks,
    noscriptSemua: Teks,
    noscriptKuota: Teks,
  })
  .strict();

export const DataFanOut = z
  .object({
    id: Teks,
    judul: Teks,
    sumber: z.object({ teks: Teks }).strict(),
    skenario: z
      .object({
        detikKirim: z.number().positive(), // t: lama satu pengiriman ke penyedia (Asumsi naskah)
        serentak: z.number().int().positive(), // c: pengirim serentak tiap consumer
        kuota: z.number().int().positive(), // permintaan per detik yang diterima penyedia
        uang: z.number().positive(), // notifikasi uang per detik pada puncak harian, memakai kuota yang sama
        batasPersen: z.number().int().positive().lt(100), // batas laju pengirim, persen dari kuota
        partisiLab: z.number().int().positive(), // partisi topik di lab t5-fanout
      })
      .strict(),
    awal: z.object({ penerima: Id, pengirim: Id }).strict(), // keadaan sesudah tebakan = keadaan yang ditanyakan
    penerima: z.array(Pilihan).length(3),
    pengirim: z.array(Pilihan).length(5),
    tebak: z.object({ q: Teks, pilihan: z.array(Teks).length(4), jawaban: z.number().int().nonnegative(), alasan: Teks }).strict(),
    acuan: z.array(Acuan).min(1),
    uang: z.array(z.object(Rujukan).strict()).min(1),
    batas: z.array(z.object({ dasar: z.enum(["kode", "dokumentasi", "rancangan"]), teks: Teks }).strict()).min(1),
    label: Label,
  })
  .strict()
  .superRefine((d, ctx) => {
    const salah = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    for (const daftar of ["penerima", "pengirim"] as const) {
      const ids = d[daftar].map((x) => x.id);
      if (new Set(ids).size !== ids.length) salah([daftar], `id ${daftar} ganda`);
      d[daftar].forEach((x, i) => {
        const sebelum = d[daftar][i - 1]?.jumlah;
        if (sebelum !== undefined && x.jumlah <= sebelum) salah([daftar, i, "jumlah"], `jumlah ${daftar} harus naik tegas`);
      });
    }
    const idPenerima = d.penerima.map((x) => x.id);
    const idPengirim = d.pengirim.map((x) => x.id);
    if (!idPenerima.includes(d.awal.penerima)) salah(["awal", "penerima"], "penerima awal tidak dikenal");
    if (!idPengirim.includes(d.awal.pengirim)) salah(["awal", "pengirim"], "pengirim awal tidak dikenal");
    if (d.tebak.jawaban >= d.tebak.pilihan.length) salah(["tebak", "jawaban"], "di luar pilihan");
    d.acuan.forEach((a, i) => {
      if (a.penerima !== undefined && !idPenerima.includes(a.penerima)) salah(["acuan", i, "penerima"], `penerima ${a.penerima} tidak dikenal`);
      if (a.pengirim !== undefined && !idPengirim.includes(a.pengirim)) salah(["acuan", i, "pengirim"], `pengirim ${a.pengirim} tidak dikenal`);
    });
    const perlu: Record<string, string[]> = {
      "label.pengirim.nilai": ["{pengirim}", "{consumer}"],
      "label.kelompok.sebanyak": ["{partisi}"],
      "label.kelompok.lab": ["{partisi}"],
      "label.sel.consumer": ["{bekerja}", "{consumer}"],
      "label.sel.antrean": ["{perPartisi}"],
      "label.sel.laju": ["{laju}"],
      "label.sel.selesai": ["{durasi}"],
      "label.sel.selesaiKuota": ["{durasi}"],
      "label.sel.kuota": ["{persen}", "{kuotaAngka}", "{uang}"],
      "label.akibat.partisi": ["{menganggur}"],
      "label.akibat.kuota": ["{kelebihan}", "{batas}", "{durasiBatas}"],
      "label.acuanBerkas": ["{berkas}", "{bagian}"],
      "label.ringkas.cukup": ["{penerima}", "{pengirim}", "{partisi}", "{durasi}", "{partisiLab}", "{durasiLab}"],
      "label.ringkas.kuota": ["{penerima}", "{pengirim}", "{partisi}", "{laju}", "{kuotaAngka}", "{partisiLab}", "{durasiLab}"],
    };
    const baca = (p: string) => p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], d) as string;
    for (const [p, daftar] of Object.entries(perlu)) for (const t of daftar) if (!baca(p).includes(t)) salah(p.split("."), `templat tanpa ${t}`);
  });
export type DataFanOut = z.infer<typeof DataFanOut>;
export type Pilihan = z.infer<typeof Pilihan>;
export type Acuan = z.infer<typeof Acuan>;
export type Kelompok = (typeof KELOMPOK)[number];
export type Kasus = (typeof KASUS)[number];
