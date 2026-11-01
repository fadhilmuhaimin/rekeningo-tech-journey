// Skema data widget peta lima zona Tahap 5 (W5-zona). Semua teks dari JSON; tidak ada teks atau angka hard-coded di komponen.
// Divalidasi saat build (pembungkus PetaZona.astro) dan di tes. Pengikat antar bagian (zona uang, service, tim, tebakan) diperiksa
// di superRefine; kecocokan dengan ERD5, rekaman lab, naskah, dan registry diperiksa sumber.test.ts.
import { z } from "zod";

const Teks = z.string().min(1);
const Id = z.string().regex(/^[a-z0-9-]+$/);

export const ZONA_ID = ["client", "edge", "service", "data", "operasi"] as const;
export const ZonaId = z.enum(ZONA_ID);
export type ZonaId = z.infer<typeof ZonaId>;

export const JENIS = ["uang", "salinan", "lain"] as const;
export const STATUS = ["terjaga", "rusak", "tidak"] as const;

const Komponen = z
  .object({
    label: Teks,
    jenis: z.enum(JENIS),
    catatan: Teks,
    service: Id.optional(), // komponen ini adalah service tersebut (id di `service`)
  })
  .strict();

const Zona = z
  .object({
    id: ZonaId,
    label: Teks,
    ringkas: Teks,
    komponen: z.array(Komponen).min(1).max(6), // skill visualisasi: paling banyak 6 kotak per zona
    tim: z.array(Id).min(1).max(5),
    halaman: z.array(Id).min(1).max(4), // id registry
  })
  .strict();

const Service = z.object({ id: Id, schema: z.string().regex(/^t5_[a-z]+$/), tim: Id, tabel: z.array(z.string().regex(/^[a-z_]+$/)).min(1) }).strict();
const Tim = z.object({ id: Id, nama: Teks, orang: z.number().int().positive(), pemimpin: Teks, memegang: Teks }).strict();

const Sel = z
  .object({ s: z.enum(STATUS), alasan: Teks.optional() })
  .strict()
  .refine((c) => (c.s === "rusak") === (c.alasan !== undefined), { message: "alasan wajib untuk sel rusak dan hanya untuk sel rusak" });

const Kejadian = z
  .object({
    id: Id,
    label: Teks,
    masalah: z.string().regex(/^M\d+$/),
    halaman: Id, // id registry halaman masalahnya
    zona: ZonaId, // zona tempat kejadian berawal; membuka zona itu mengisi barisnya
    sumber: z.enum(["asumsi", "tidak-dijalankan"]),
    sel: z.tuple([Sel, Sel, Sel]),
  })
  .strict();

const Label = z
  .object({
    sumber: Teks,
    tebakDulu: Teks,
    mulai: Teks,
    lanjut: Teks, // {zona}
    benar: Teks,
    belum: Teks,
    ubah: Teks,
    zonaJudul: Teks,
    panelKosong: Teks,
    komponenJudul: Teks,
    timJudul: Teks,
    halamanJudul: Teks,
    kejadianJudul: Teks,
    tanpaKejadian: Teks, // {total}
    tandaUang: Teks,
    tigaJudul: Teks,
    tiga: z.tuple([Teks, Teks, Teks]),
    captionTabel: Teks,
    kolom: z.object({ kejadian: Teks, hal: Teks }).strict(),
    status: z.object({ terjaga: Teks, rusak: Teks, tidak: Teks, belum: Teks }).strict(),
    jenis: z.object({ uang: Teks, salinan: Teks, lain: Teks }).strict(),
    sumberJenis: z.object({ asumsi: Teks, "tidak-dijalankan": Teks }).strict(),
    segera: Teks,
    serviceMeta: Teks, // {schema} {tabel} {tim}
    timMeta: Teks, // {orang} {pemimpin}
    ringkas: Teks, // {zona} {n} {total} {terisi} {rusak}
    ringkasKosong: Teks,
    tanpaJs: Teks,
  })
  .strict();

export const DataZona = z
  .object({
    id: Teks,
    judul: Teks,
    sumber: z.object({ jenis: z.enum(["rekaman", "ilustrasi", "asumsi"]), teks: Teks }).strict(),
    tebak: z
      .object({ q: Teks, pilihan: z.array(Teks).min(2).max(4), jawaban: z.number().int().nonnegative(), alasan: Teks })
      .strict(),
    zona: z.array(Zona).length(5),
    service: z.array(Service).min(1),
    tim: z.array(Tim).min(1),
    kejadian: z.array(Kejadian).min(1),
    label: Label,
  })
  .strict()
  .superRefine((d, ctx) => {
    const salah = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    // lima zona, urutan tetap seperti PROPOSAL: client, edge, service, data, operasi
    d.zona.forEach((z, i) => z.id !== ZONA_ID[i] && salah(["zona", i, "id"], `zona ke-${i + 1} harus ${ZONA_ID[i]}`));
    const timIds = new Set(d.tim.map((t) => t.id));
    if (timIds.size !== d.tim.length) salah(["tim"], "id tim ganda");
    const serviceIds = new Set(d.service.map((s) => s.id));
    if (serviceIds.size !== d.service.length) salah(["service"], "id service ganda");
    d.service.forEach((s, i) => !timIds.has(s.tim) && salah(["service", i, "tim"], `tim ${s.tim} tidak dikenal`));
    d.zona.forEach((z, i) => z.tim.forEach((t) => !timIds.has(t) && salah(["zona", i, "tim"], `tim ${t} tidak dikenal`)));
    // komponen bertanda service: tepat satu per service, hanya di zona service
    const dipakai: string[] = [];
    d.zona.forEach((z, i) =>
      z.komponen.forEach((k, j) => {
        if (!k.service) return;
        if (z.id !== "service") salah(["zona", i, "komponen", j], "hanya zona service yang memuat komponen bertanda service");
        if (!serviceIds.has(k.service)) salah(["zona", i, "komponen", j, "service"], `service ${k.service} tidak dikenal`);
        dipakai.push(k.service);
      }),
    );
    if (dipakai.length !== serviceIds.size || new Set(dipakai).size !== serviceIds.size) salah(["service"], "tiap service tepat satu komponen di zona service");
    // ledger tetap satu-satunya tempat uang bergerak: tepat dua komponen bertanda uang (service ledger dan primary), di dua zona
    const uang = d.zona.flatMap((z) => z.komponen.filter((k) => k.jenis === "uang").map((k) => ({ z: z.id, k })));
    if (uang.length !== 2 || new Set(uang.map((u) => u.z)).size !== 2) salah(["zona"], "tepat dua komponen uang di dua zona berbeda");
    if (!uang.some((u) => u.k.service === "ledger")) salah(["zona"], "komponen uang pertama harus service ledger");
    d.kejadian.forEach((k, i) => {
      if (!d.zona.some((z) => z.id === k.zona)) salah(["kejadian", i, "zona"], "zona tidak dikenal");
    });
    if (new Set(d.kejadian.map((k) => k.id)).size !== d.kejadian.length) salah(["kejadian"], "id kejadian ganda");
    if (d.tebak.jawaban >= d.tebak.pilihan.length) salah(["tebak", "jawaban"], "di luar pilihan");
    for (const kunci of ["lanjut", "tanpaKejadian", "serviceMeta", "timMeta", "ringkas", "ringkasKosong"] as const) {
      const perlu = { lanjut: ["{zona}"], tanpaKejadian: ["{total}"], serviceMeta: ["{schema}", "{tabel}", "{tim}"], timMeta: ["{orang}", "{pemimpin}"], ringkas: ["{zona}", "{n}", "{total}", "{terisi}", "{rusak}"], ringkasKosong: ["{zona}", "{total}", "{terisi}", "{rusak}"] }[kunci];
      for (const p of perlu) if (!d.label[kunci].includes(p)) salah(["label", kunci], `templat tanpa ${p}`);
    }
  });
export type DataZona = z.infer<typeof DataZona>;

/** Rujukan halaman yang sudah diselesaikan pembungkus Astro dari registry: href null = halaman belum ditulis. */
export const Halaman = z.record(z.string(), z.object({ label: Teks, href: z.string().nullable() }).strict());
export type Halaman = z.infer<typeof Halaman>;
