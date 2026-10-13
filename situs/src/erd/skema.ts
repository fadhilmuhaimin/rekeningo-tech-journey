// Skema JSON ERD per tahap (situs/data/erd/tahap-<n>.json, dibangun tools/erd.py dari skema lab, keputusan 375).
// Padanan TypeScript dari periksa() di tools/erd.py: gerbang memeriksa JSON tanpa Node, komponen Erd.astro memeriksanya
// lagi saat build, jadi data yang rusak menggagalkan build, bukan menggambar diagram yang salah.
import { z } from "zod";

const Nama = z.string().regex(/^[a-z_][a-z0-9_]*$/);
const DaftarKolom = z.array(Nama).min(1);
const terurut = (xs: { nama: string }[]) => xs.every((x, i) => i === 0 || xs[i - 1].nama <= x.nama);

export const Kolom = z
  .object({ nama: Nama, tipe: z.string().min(1), wajib: z.boolean(), bawaan: z.string().min(1).nullable() })
  .strict();

export const Fk = z
  .object({
    nama: Nama,
    kolom: DaftarKolom,
    ke_tabel: Nama,
    ke_kolom: DaftarKolom,
    saat_hapus: z.enum(["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]),
  })
  .strict()
  .refine((f) => f.kolom.length === f.ke_kolom.length, { message: "jumlah kolom asal dan tujuan berbeda" });

export const Unik = z.object({ nama: Nama, kolom: DaftarKolom }).strict();
export const Cek = z.object({ nama: Nama, kolom: DaftarKolom, ekspresi: z.string().min(1) }).strict();
export const Index = z.object({ nama: Nama, unik: z.boolean(), definisi: z.string().min(1) }).strict();

export const Tabel = z
  .object({
    nama: Nama,
    kolom: z.array(Kolom).min(1),
    pk: z.array(Nama),
    fk: z.array(Fk).refine(terurut, "fk tidak terurut menurut nama"),
    unik: z.array(Unik).refine(terurut, "unik tidak terurut menurut nama"),
    cek: z.array(Cek).refine(terurut, "cek tidak terurut menurut nama"),
    index: z.array(Index).refine(terurut, "index tidak terurut menurut nama"),
  })
  .strict()
  .superRefine((t, ctx) => {
    const ada = new Set(t.kolom.map((k) => k.nama));
    if (ada.size !== t.kolom.length) ctx.addIssue({ code: "custom", message: `${t.nama}: kolom ganda` });
    const cek = (kolom: string[], asal: string) => {
      for (const k of kolom) if (!ada.has(k)) ctx.addIssue({ code: "custom", message: `${t.nama}.${asal}: kolom ${k} tidak ada` });
    };
    cek(t.pk, "pk");
    for (const c of [...t.fk, ...t.unik, ...t.cek]) cek(c.kolom, c.nama);
  });

const KolomDi = z.object({ tabel: Nama, kolom: Nama }).strict();
export const Selisih = z
  .object({
    terhadap: z.number().int().min(1),
    tabel_baru: z.array(Nama),
    tabel_dihapus: z.array(z.object({ nama: Nama, pindah_ke: z.string().min(1) }).strict()),
    kolom_baru: z.array(KolomDi),
    kolom_dihapus: z.array(KolomDi),
    kolom_berubah: z.array(KolomDi.extend({ sebelum: Kolom, sesudah: Kolom }).strict()),
  })
  .strict();

export const DataErd = z
  .object({
    format: z.literal(1),
    tahap: z.number().int().min(1),
    postgres: z.number().int().min(10),
    sumber: z
      .object({ file: z.array(z.string().min(1)).min(1), pembanding: z.array(z.string().min(1)), sha256: z.string().regex(/^[0-9a-f]{64}$/) })
      .strict(),
    tabel: z.array(Tabel).min(1),
    selisih: Selisih.nullable(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const tabel = new Map(d.tabel.map((t) => [t.nama, t]));
    if (tabel.size !== d.tabel.length) ctx.addIssue({ code: "custom", message: "tabel ganda" });
    for (const t of d.tabel)
      for (const f of t.fk) {
        const ke = tabel.get(f.ke_tabel);
        if (!ke) {
          ctx.addIssue({ code: "custom", message: `${t.nama}.${f.nama}: tabel tujuan ${f.ke_tabel} tidak ada` });
          continue;
        }
        for (const k of f.ke_kolom)
          if (!ke.kolom.some((x) => x.nama === k))
            ctx.addIssue({ code: "custom", message: `${t.nama}.${f.nama}: kolom tujuan ${f.ke_tabel}.${k} tidak ada` });
      }
    if (d.tahap === 1 && d.selisih !== null) ctx.addIssue({ code: "custom", message: "Tahap 1 tidak punya tahap sebelumnya" });
  });

export type Kolom = z.infer<typeof Kolom>;
export type Tabel = z.infer<typeof Tabel>;
export type DataErd = z.infer<typeof DataErd>;
