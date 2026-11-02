// Skema data widget jeda replica Tahap 5 (W5-lag). Semua teks dari JSON; tidak ada teks atau angka hard-coded di komponen.
// Divalidasi saat build (pembungkus JedaReplica.astro) dan di tes. Pengikat antar bagian (jeda, aturan, tebakan, acuan rekaman)
// diperiksa di superRefine; kecocokan dengan rekaman lab t5-replika, kode api-t5, dan naskah diperiksa sumber.test.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const Id = z.string().regex(/^[a-z0-9_]+$/);

export const ATURAN_ID = ["replica", "token", "remote_apply"] as const;
export const AturanId = z.enum(ATURAN_ID);
export type AturanId = z.infer<typeof AturanId>;

export const KASUS = ["lama", "sama", "keprimary", "tunda", "macet"] as const;
export const SUMBER_BACA = ["primary", "replica", "replica_sinkron"] as const;

const Jeda = z
  .object({
    id: Id,
    detik: z.number().nonnegative().nullable(), // null = replay ditahan sampai dilanjutkan (jeda buatan)
    label: Teks,
    kalimat: Teks, // dipakai di kalimat ringkasan: "jeda 2 detik", "replay ditahan"
  })
  .strict();

const Aturan = z.object({ id: AturanId, label: Teks, kode: z.boolean(), ringkas: Teks }).strict();

const Acuan = z
  .object({
    jeda: Id,
    aturan: AturanId.optional(), // tanpa aturan = berlaku untuk ketiga aturan
    jenis: z.enum(["rekaman", "ilustrasi"]),
    berkas: z.string().regex(/^[a-z]+\.(txt|md)$/),
    bagian: z.string().regex(/^[A-Z]$/),
    teks: Teks,
    bukti: z.array(Teks).min(1), // baris yang harus ada di berkas dan bagian itu
  })
  .strict();

const Label = z
  .object({
    sumber: Teks,
    tebakDulu: Teks,
    benar: Teks,
    belum: Teks,
    ubahJudul: Teks,
    jeda: z.object({ label: Teks, nilai: Teks, petunjuk: Teks }).strict(), // nilai: {jeda}
    aturanJudul: Teks,
    ringkas: z.object({ lama: Teks, sama: Teks, keprimary: Teks, tunda: Teks, macet: Teks }).strict(), // {aturan} {jeda} {saldo} {sumber} {primary} {tunda}
    tabel: z.object({ caption: Teks, kolom: z.object({ dibaca: Teks, layar: Teks, akibat: Teks }).strict(), dipilih: Teks }).strict(),
    sumberNama: z.object({ primary: Teks, replica: Teks, replica_sinkron: Teks }).strict(),
    layar: z.object({ saldo: Teks, menunggu: Teks }).strict(), // saldo: {saldo} {baris}
    akibat: z.object({ lama: Teks, sama: Teks, keprimary: Teks, tunda: Teks, macet: Teks }).strict(), // tunda: {tunda}
    acuanJudul: Teks,
    acuanJenis: z.object({ rekaman: Teks, ilustrasi: Teks }).strict(),
    acuanBerkas: Teks, // {berkas} {bagian}
    tanpaAcuan: Teks,
    uangJudul: Teks,
    batasJudul: Teks,
    dasar: z.object({ kode: Teks, dokumentasi: Teks, rancangan: Teks }).strict(),
    tanpaJs: Teks,
    noscriptCaption: Teks,
    noscriptJeda: Teks,
  })
  .strict();

export const DataLag = z
  .object({
    id: Teks,
    judul: Teks,
    sumber: z.object({ teks: Teks }).strict(),
    skenario: z
      .object({
        saldoAwal: z.number().int().positive(),
        bayar: z.number().int().positive(),
        barisAwal: z.number().int().nonnegative(),
        bacaDetik: z.number().positive(), // detik antara jawaban bayar dan bacaan app
      })
      .strict(),
    awal: z.object({ jeda: Id, aturan: AturanId }).strict(), // keadaan sesudah tebakan = keadaan yang ditanyakan
    jeda: z.array(Jeda).min(3),
    aturan: z.array(Aturan).length(3),
    tebak: z.object({ q: Teks, pilihan: z.array(Teks).length(4), jawaban: z.number().int().nonnegative(), alasan: Teks }).strict(),
    acuan: z.array(Acuan).min(1),
    uang: z.object({ teks: Teks, berkas: z.string().regex(/^[a-z]+\.txt$/), bagian: z.string().regex(/^[A-Z]$/), bukti: z.array(Teks).min(1) }).strict(),
    batas: z.array(z.object({ dasar: z.enum(["kode", "dokumentasi", "rancangan"]), teks: Teks }).strict()).min(1),
    label: Label,
  })
  .strict()
  .superRefine((d, ctx) => {
    const salah = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    d.aturan.forEach((a, i) => a.id !== ATURAN_ID[i] && salah(["aturan", i, "id"], `aturan ke-${i + 1} harus ${ATURAN_ID[i]}`));
    const ids = d.jeda.map((j) => j.id);
    if (new Set(ids).size !== ids.length) salah(["jeda"], "id jeda ganda");
    // urutan geser: detik naik tegas, dan hanya yang terakhir ditahan (detik null)
    d.jeda.forEach((j, i) => {
      const terakhir = i === d.jeda.length - 1;
      if ((j.detik === null) !== terakhir) salah(["jeda", i, "detik"], "hanya jeda terakhir yang boleh null (ditahan)");
      const sebelum = d.jeda[i - 1]?.detik;
      if (i > 0 && j.detik !== null && sebelum != null && j.detik <= sebelum) salah(["jeda", i, "detik"], "detik jeda harus naik tegas");
    });
    if (!ids.includes(d.awal.jeda)) salah(["awal", "jeda"], "jeda awal tidak dikenal");
    if (d.skenario.bayar >= d.skenario.saldoAwal) salah(["skenario", "bayar"], "bayar harus lebih kecil dari saldo awal");
    if (d.tebak.jawaban >= d.tebak.pilihan.length) salah(["tebak", "jawaban"], "di luar pilihan");
    d.acuan.forEach((a, i) => !ids.includes(a.jeda) && salah(["acuan", i, "jeda"], `jeda ${a.jeda} tidak dikenal`));
    const perlu: Record<string, string[]> = {
      "label.jeda.nilai": ["{jeda}"],
      "label.layar.saldo": ["{saldo}", "{baris}"],
      "label.akibat.tunda": ["{tunda}"],
      "label.acuanBerkas": ["{berkas}", "{bagian}"],
    };
    const baca = (p: string) => p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], d) as string;
    for (const [p, daftar] of Object.entries(perlu)) for (const t of daftar) if (!baca(p).includes(t)) salah(p.split("."), `templat tanpa ${t}`);
    for (const k of ["lama", "sama", "keprimary", "tunda", "macet"] as const) {
      const dasar = ["{aturan}", "{jeda}"];
      const tambahan = { lama: ["{saldo}", "{sumber}", "{primary}"], sama: ["{saldo}", "{sumber}"], keprimary: ["{saldo}"], tunda: ["{saldo}", "{sumber}", "{tunda}"], macet: [] as string[] }[k];
      for (const t of [...dasar, ...tambahan]) if (!d.label.ringkas[k].includes(t)) salah(["label", "ringkas", k], `templat tanpa ${t}`);
    }
  });
export type DataLag = z.infer<typeof DataLag>;
export type Jeda = DataLag["jeda"][number];
export type Aturan = DataLag["aturan"][number];
export type Acuan = DataLag["acuan"][number];
export type Kasus = (typeof KASUS)[number];
export type SumberBaca = (typeof SUMBER_BACA)[number];
