// Skema Zod registry halaman (situs/data/cerita.json), keputusan 117. Dites Vitest: registry yang salah bentuk
// menggagalkan gerbang. Field turunan (ada, nomor, menit) ditulis tools/sinkron_cerita.py; jalur_inti dihitung situs/tools/siapkan-aset.mjs saat build.
import { z } from "zod";
import { Arsitektur } from "../diagram/skema";

export const PERAN = ["mobile", "web", "backend", "devops", "security"] as const;
export const JENIS = ["prd", "fitur", "masalah", "konsep", "adr", "tim-infra"] as const;
const Tahap = z.union([z.number().int().min(1).max(6), z.enum(["pembuka", "sampingan", "alat"])]);
/** Nomor bagian naskah: 1–6, atau sub-bagian seperti "3b" (CERITA-TAHAP-2 "3b. Skema data"). */
const NoBagian = z.union([z.number().int().min(1).max(6), z.string().regex(/^[1-6][a-z]$/)]);

export const Halaman = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9.\-]+$/),
    judul: z.string().min(3),
    tahap: Tahap,
    path: z.string().regex(/^[a-z0-9\-/]+\.md$/),
    jenis: z.enum(JENIS).optional(),
    bagian: NoBagian.optional(),
    inti: z.boolean().optional(),
    peran: z.array(z.enum(PERAN)).optional(),
    adr: z.array(z.number().int().positive()).optional(),
    label: z.string().optional(),
    /** Isi masih versi sebelum naskah; ditulis ulang di Tugas 1, lalu field ini dihapus. */
    lama: z.boolean().optional(),
    lebur_ke: z.string().optional(),
    diganti_oleh: z.string().optional(),
    kelompok: z.string().optional(),
    topik: z.string().optional(),
    masalah: z.string().optional(),
    pendek: z.string().optional(),
    prasyarat: z.array(z.string()).optional(),
    prasyarat_lain: z.string().optional(),
    ada: z.boolean().optional(),
    nomor: z.string().optional(),
    menit: z.number().optional(),
    /** Lab yang dipakai halaman menurut peta halaman naskah (nama folder di labs/, termasuk yang belum dibuat). */
    lab: z.array(z.string().regex(/^[a-z0-9\-]+$/)).min(1).optional(),
  })
  .strict();

// Skala tahap dari naskah (CERITA "Skala yang akan dilalui cerita" dan "Eskalasi"), dipakai peta beranda (keputusan 208).
const Skala = z.object({ pendek: z.string(), lingkup: z.string(), user: z.string(), pembuat: z.string(), prd: z.string() }).strict();

const Bagian = z.object({ no: NoBagian, nama: z.string().min(2) }).strict();

export const Registry = z
  .object({
    app: z.string(),
    catatan: z.string(),
    tahap: z.array(
      z
        .object({
          no: z.number().int(),
          nama: z.string(),
          user: z.string(),
          rekap: z.string(),
          sebelumnya: z.string(),
          arsitektur: Arsitektur,
          asumsi: z.record(z.string(), z.union([z.number(), z.string()])),
          jalur_inti: z.object({ menit: z.number(), halaman: z.number() }).optional(),
          bagian: z.array(Bagian).optional(),
          naskah: z.string().optional(),
          /** Data tahap ini (nama, rekap, arsitektur, asumsi) masih versi lama. Dengan `naskah`, daftar halamannya sudah
           *  mengikuti naskah baru dan penanda versi lama pindah ke halaman (`lama`, `diganti_oleh`). */
          versi: z.literal("lama").optional(),
          skala: Skala.optional(),
        })
        .strict(),
    ),
    proyeksi: z.array(z.object({ no: z.number(), nama: z.string(), user: z.string(), catatan: z.string(), skala: Skala.optional() }).strict()),
    halaman: z.array(Halaman),
  })
  .strict()
  .superRefine((d, ctx) => {
    const ids = new Set(d.halaman.map((h) => h.id));
    for (const h of d.halaman) {
      for (const k of ["lebur_ke", "diganti_oleh"] as const) {
        const ke = h[k];
        if (ke && !ids.has(ke)) ctx.addIssue({ code: "custom", message: `${h.id}.${k} menunjuk ${ke} yang tidak ada` });
      }
      const t = d.tahap.find((x) => x.no === h.tahap);
      // Tahap dengan naskah baru: setiap halaman wajib punya bagian, dan halaman baru wajib punya jenis.
      if (t?.naskah) {
        if (!h.bagian) ctx.addIssue({ code: "custom", message: `${h.id} di Tahap ${t.no} tanpa bagian` });
        else if (!t.bagian?.some((b) => b.no === h.bagian)) ctx.addIssue({ code: "custom", message: `${h.id}: bagian ${h.bagian} tidak dikenal` });
        if (!h.jenis && !h.lebur_ke && !h.diganti_oleh) ctx.addIssue({ code: "custom", message: `${h.id} di Tahap ${t.no} tanpa jenis` });
      }
    }
  });

export type Registry = z.infer<typeof Registry>;
