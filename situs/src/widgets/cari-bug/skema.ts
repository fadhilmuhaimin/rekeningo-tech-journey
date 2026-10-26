// Skema data widget cari-bug (keputusan 158): pembaca menandai baris kode yang jadi sumber bug.
import { z } from "zod";

export const DataCariBug = z
  .object({
    id: z.string().min(1),
    judul: z.string().min(1),
    sumber: z.object({ jenis: z.enum(["rekaman", "ilustrasi", "asumsi"]), teks: z.string().min(1) }),
    bahasa: z.string().min(1).default("go"),
    baris: z.array(z.string()).min(2),
    // Indeks baris (0-based) yang jadi sumber bug; pembaca harus menandai persis baris-baris ini.
    bug: z.array(z.number().int().nonnegative()).min(1),
    // Penjelasan per baris bug, kunci = indeks baris.
    alasan: z.record(z.string(), z.string()),
    // Penjelasan opsional untuk baris yang tampak berbahaya tapi aman; muncul bila pembaca menandainya.
    aman: z.record(z.string(), z.string()).default({}),
    tebak: z.object({ q: z.string().min(1), petunjuk: z.string().min(1) }),
    perbaikan: z.object({ label: z.string().min(1), baris: z.array(z.string()).min(2), catatan: z.string().min(1) }),
    // Opsional (halaman 3.4): matriks kejadian × hal yang harus benar, terisi setelah pembaca memeriksa tandanya.
    kejadian: z
      .object({
        judul: z.string().min(1),
        hal: z.array(z.string().min(1)).min(1),
        status: z.object({ ya: z.string().min(1), tidak: z.string().min(1), na: z.string().min(1) }),
        baris: z
          .array(
            z.object({
              nama: z.string().min(1),
              sel: z.array(z.object({ status: z.enum(["ya", "tidak", "na"]), detail: z.string().min(1).optional() })).min(1),
            }),
          )
          .min(1),
      })
      .optional(),
    label: z.object({
      sumber: z.string(),
      tebakDulu: z.string(),
      perintah: z.string(),
      periksa: z.string(),
      ulang: z.string(),
      benar: z.string(),
      lewat: z.string(),
      salahTanda: z.string(),
      perbaikanTombol: z.string(),
      // Opsional: kalimat ringkas untuk wilayah role="status"; {benar}, {bug}, {salah} diganti angkanya.
      ringkas: z.string().optional(),
    }),
  })
  .superRefine((d, ctx) => {
    for (const [n, b] of (d.kejadian?.baris ?? []).entries()) {
      if (b.sel.length !== d.kejadian!.hal.length) ctx.addIssue({ code: "custom", path: ["kejadian", "baris", n, "sel"], message: "jumlah sel harus sama dengan jumlah hal" });
    }
    for (const i of d.bug) {
      if (i >= d.baris.length) ctx.addIssue({ code: "custom", path: ["bug"], message: `baris ${i} di luar kode` });
      if (!(String(i) in d.alasan)) ctx.addIssue({ code: "custom", path: ["alasan"], message: `baris bug ${i} tanpa alasan` });
    }
    for (const k of Object.keys(d.aman)) {
      const i = Number(k);
      if (!Number.isInteger(i) || i < 0 || i >= d.baris.length) ctx.addIssue({ code: "custom", path: ["aman"], message: `baris ${k} di luar kode` });
      if (d.bug.includes(i)) ctx.addIssue({ code: "custom", path: ["aman"], message: `baris ${k} adalah bug, bukan baris aman` });
    }
  });

export type DataCariBug = z.infer<typeof DataCariBug>;
