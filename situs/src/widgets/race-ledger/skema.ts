// Skema widget race ledger (W2-race, keputusan 707–711). Dipakai saat build saja (RaceLedger.astro): rekaman yang
// tidak sesuai menggagalkan build, jadi island tidak memuat Zod. Bentuk rekaman = keluaran labs/b3-race/run_ledger.py
// (keputusan 430, 433): `output/ledger/ledger-<cara>.json`, satu langkah per statement atau keputusan kode aplikasi.
import { z } from "zod";

const Teks = z.string().min(1);
const Pelaku = z.enum(["A", "B"]);
const Rupiah = z.number().int();
// Variabel yang dibaca client sampai langkah itu: saldo_dibaca (semua cara), versi (optimistic lock).
const Vars = z.object({ saldo_dibaca: z.number().int().optional(), versi: z.number().int().optional() }).strict();

export const LangkahRekaman = z
  .object({
    actor: Pelaku,
    sql: Teks.nullable(), // null = keputusan kode aplikasi, bukan statement
    result: Teks,
    note: z.string(),
    committed: Rupiah, // jumlah posting buku Budi yang sudah COMMIT, dibaca koneksi pengamat
    lock: Teks.nullable(), // pemegang row lock baris buku Budi dan modenya (pgrowlocks)
    waiting: z.array(Pelaku),
    vars: z.object({ A: Vars, B: Vars }).strict(),
  })
  .strict();

export const RekamanLedger = z
  .object({
    id: z.string().regex(/^ledger-[a-z][a-z-]*$/),
    title: Teks,
    summary: Teks,
    postgres: Teks,
    isolation: Teks,
    start: Rupiah,
    withdraw: z.object({ A: Rupiah.positive(), B: Rupiah.positive() }).strict(),
    final: Rupiah,
    recorded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    steps: z.array(LangkahRekaman).min(1),
  })
  .strict()
  .superRefine((d, ctx) => {
    const akhir = d.steps.at(-1)!.committed;
    if (akhir !== d.final) ctx.addIssue({ code: "custom", path: ["final"], message: `final ${d.final} beda dengan committed langkah terakhir ${akhir}` });
    d.steps.forEach((s, i) => {
      if (s.result === "MENUNGGU lock" && !s.waiting.includes(s.actor))
        ctx.addIssue({ code: "custom", path: ["steps", i, "waiting"], message: `langkah MENUNGGU lock milik ${s.actor} tidak ada di waiting` });
    });
  });

export type RekamanLedger = z.infer<typeof RekamanLedger>;

// Semua teks widget. {nama} diisi dari rekaman saat dipakai (isi() di logika.ts).
export const LabelRace = z
  .object({
    judul: Teks,
    petunjuk: Teks,
    klien: z.object({ A: Teks, B: Teks }).strict(),
    penerima: z.object({ A: Teks, B: Teks }).strict(),
    cara: Teks,
    tebakDulu: Teks,
    pertanyaan: Teks,
    belumTahu: Teks,
    database: Teks,
    saldoCommit: Teks,
    rowLock: Teks,
    lockKosong: Teks,
    lockDipegang: Teks,
    vars: z.object({ saldo_dibaca: Teks, versi: Teks }).strict(),
    belumBaca: Teks,
    status: z.object({ siap: Teks, jalan: Teks, menunggu: Teks }).strict(),
    garisWaktu: Teks,
    kodeAplikasi: Teks,
    masihMenunggu: Teks,
    catatanTunggu: Teks,
    pilihDulu: Teks,
    belumLangkah: Teks,
    sekarang: Teks,
    hitungan: Teks,
    sebelumnya: Teks,
    berikutnya: Teks,
    ulang: Teks,
    saldoAkhir: Teks,
    hasilJudul: Teks,
    benar: Teks,
    meleset: Teks,
    fakta: z.object({ menunggu: Teks, retry: Teks, sqlstate: Teks, tanpaError: Teks, langkah: Teks }).strict(),
    bedaJudul: Teks,
    bedaKosong: Teks,
    sama: Teks,
    gantiCara: Teks,
    kaki: Teks,
  })
  .strict();

export type LabelRace = z.infer<typeof LabelRace>;
