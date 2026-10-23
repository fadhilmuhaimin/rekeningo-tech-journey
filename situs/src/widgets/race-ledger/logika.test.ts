// Tes logika widget race ledger (W2-race, keputusan 707–711) atas rekaman yang di-commit di labs/b3-race/output/ledger.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import labelMentah from "../../../data/widget/race-ledger.json";
import { LabelRace, RekamanLedger } from "./skema";
import {
  bacaBanding, bagian, beda, caraBerikutnya, errorDatabase, fakta, indeksAwal, isi, jumlahRetry, keadaan, maju, mundur,
  nilaiTebakan, opsiTebakan, pembanding, siapkan, tandaiSelesai, tungguLain, type ReplayRace,
} from "./logika";

const DIR = "labs/b3-race/output/ledger";
const baca = (f: string) => readFileSync(new URL(`../../../../${DIR}/${f}`, import.meta.url), "utf8");
const CARA = ["tanpa-lock", "tanpa-lock-bergantian", "for-update", "atomik", "optimistic", "serializable"];
const rekaman = (c: string) => RekamanLedger.parse(JSON.parse(baca(`ledger-${c}.json`)));
const banding = bacaBanding(baca("banding.txt"));
const replay = Object.fromEntries(CARA.map((c) => [c, siapkan(rekaman(c), banding, DIR)])) as Record<string, ReplayRace>;
const L = LabelRace.parse(labelMentah);

describe("rekaman dan banding.txt", () => {
  it("banding.txt dibaca enam baris, satu per cara", () => {
    expect(banding.map((b) => b.cara)).toEqual([
      "Tanpa lock", "Tanpa lock, COMMIT bergantian", "SELECT ... FOR UPDATE", "UPDATE atomik bersyarat",
      "Optimistic lock (kolom versi)", "SERIALIZABLE + retry",
    ]);
  });
  it("saldo, menunggu, retry, dan error database per cara sesuai rekaman", () => {
    const r = (c: string) => [replay[c]!.akhir, replay[c]!.hasil.menunggu, replay[c]!.hasil.retry, replay[c]!.hasil.error.map((e) => e.kode).join()];
    expect(CARA.map(r)).toEqual([
      [-20000, 0, 0, ""], [30000, 0, 0, "23514"], [30000, 1, 0, ""], [30000, 1, 0, ""], [30000, 1, 1, ""], [30000, 0, 1, "40001"],
    ]);
    expect(replay["serializable"]!.hasil.error[0]).toMatchObject({ kode: "40001", nama: "serialization_failure" });
    expect(replay["tanpa-lock-bergantian"]!.hasil.error[0]).toMatchObject({ kode: "23514", nama: "check_violation" });
  });
  it("hasil tiap client diambil dari banding.txt", () => {
    expect(replay["serializable"]!.hasil).toMatchObject({ A: "COMMIT", B: "40001 saat COMMIT, retry: saldo kurang" });
    expect(replay["tanpa-lock"]!.hasil.B).toBe("COMMIT");
  });
  it("file sumber menunjuk rekaman JSON dan kepala .txt yang ada", () => {
    for (const c of CARA) {
      expect(replay[c]!.file).toBe(`${DIR}/ledger-${c}.json`);
      expect(() => baca(`ledger-${c}.txt`)).not.toThrow();
    }
  });
  it("label klien dan penerima sama dengan kepala rekaman .txt", () => {
    const kepala = baca("ledger-tanpa-lock.txt").split("\n")[2]!;
    expect(kepala).toContain(`A (HP) transfer 70000 ke ${L.penerima.A}, B (tablet) transfer 50000 ke ${L.penerima.B}`);
    expect([L.klien.A, L.klien.B]).toEqual(["HP Budi", "Tablet Budi"]);
  });
  it("rekaman yang berbeda dari banding.txt menggagalkan siapkan (gagal keras)", () => {
    const r = rekaman("for-update");
    const salah = { ...r, final: 50000, steps: r.steps.map((s, i) => (i === r.steps.length - 1 ? { ...s, committed: 50000 } : s)) };
    expect(() => siapkan(salah, banding, DIR)).toThrow(/saldo 30000 lawan final 50000/);
    expect(() => siapkan({ ...r, title: "Cara lain" }, banding, DIR)).toThrow(/tidak ada di banding/);
    const tanpaTunggu = { ...r, steps: r.steps.map((s) => (s.result === "MENUNGGU lock" ? { ...s, result: "100000" } : s)) };
    expect(() => siapkan(tanpaTunggu, banding, DIR)).toThrow(/menunggu 1 lawan 0/);
  });
  it("skema menolak final yang tidak sama dengan langkah terakhir", () => {
    const j = JSON.parse(baca("ledger-atomik.json"));
    expect(() => RekamanLedger.parse({ ...j, final: 0 })).toThrow();
    expect(() => RekamanLedger.parse({ ...j, ekstra: 1 })).toThrow();
  });
  it("banding.txt yang rusak ditolak", () => {
    const t = baca("banding.txt");
    expect(() => bacaBanding(t.replace("(6 rows)", "(5 rows)"))).toThrow(/penutup/);
    const rusak = t.replace("|     0 |  30000 |  30000 |", "|     x |  30000 |  30000 |");
    expect(rusak).not.toBe(t);
    expect(() => bacaBanding(rusak)).toThrow(/bukan angka/);
    expect(() => bacaBanding("kosong")).toThrow(/kepala/);
  });
  it("retry dan error hanya dari teks rekaman", () => {
    const s = replay["optimistic"]!.langkah;
    expect(jumlahRetry(s)).toBe(1);
    expect(errorDatabase(s)).toEqual([]);
  });
});

describe("pemilihan replay dan urutan langkah", () => {
  const daftar = CARA.map((c) => replay[c]!);
  it("indeks awal: bawaan pertama, nama yang tidak ada atau ganda ditolak", () => {
    expect(indeksAwal(daftar)).toBe(0);
    expect(indeksAwal(daftar, "atomik")).toBe(3);
    expect(() => indeksAwal(daftar, "tanpa")).toThrow();
    expect(() => indeksAwal([daftar[0]!, daftar[0]!])).toThrow(/ganda/);
    expect(() => indeksAwal([])).toThrow(/kosong/);
  });
  it("Berikutnya hanya sesudah menebak dan berhenti di langkah terakhir", () => {
    expect(maju(0, 12, false)).toBe(0);
    expect(maju(0, 12, true)).toBe(1);
    expect(maju(12, 12, true)).toBe(12);
    expect(mundur(0)).toBe(0);
    expect(mundur(5)).toBe(4);
  });
  it("keadaan langkah 0: semua siap, saldo awal, tanpa lock", () => {
    const k = keadaan(replay["for-update"]!, 0);
    expect(k).toMatchObject({ saldo: 100000, lock: null, selesai: false, A: { status: "siap" }, B: { status: "siap" } });
    expect(() => keadaan(replay["for-update"]!, 13)).toThrow();
  });
  it("FOR UPDATE: B menunggu di langkah 4 sampai A COMMIT, lalu membaca Rp30.000", () => {
    const r = replay["for-update"]!;
    const k4 = keadaan(r, 4);
    expect(k4.B.status).toBe("menunggu");
    expect(k4.lock).toBe("A (For Update)");
    expect(tungguLain(r.langkah[4]!)).toEqual(["B"]);
    const k10 = keadaan(r, 10);
    expect(k10.B.vars).toEqual({ saldo_dibaca: 30000 });
    expect(k10.A).toMatchObject({ status: "selesai", akhir: "COMMIT" });
    const akhir = keadaan(r, r.langkah.length);
    expect(akhir).toMatchObject({ saldo: 30000, selesai: true, B: { status: "selesai", akhir: "ditolak kode: saldo kurang" } });
  });
  it("tanpa lock: kedua COMMIT, saldo yang sudah COMMIT jadi -Rp20.000 di langkah terakhir", () => {
    const r = replay["tanpa-lock"]!;
    expect(r.langkah.map((s) => s.committed).slice(-3)).toEqual([100000, 30000, -20000]);
    expect(keadaan(r, r.langkah.length).saldo).toBe(-20000);
  });
  it("optimistic: versi yang dibaca ikut tampil", () => {
    expect(keadaan(replay["optimistic"]!, 2).B.vars).toEqual({ saldo_dibaca: 100000, versi: 0 });
  });
});

describe("tebakan dan ubah satu hal", () => {
  it("tiga pilihan dari angka rekaman, jawaban selalu di antaranya", () => {
    for (const c of CARA) expect(opsiTebakan(replay[c]!)).toEqual([-20000, 30000, 50000]);
    expect(() => opsiTebakan({ ...replay["atomik"]!, akhir: 1 })).toThrow();
  });
  it("nilai tebakan", () => {
    expect(nilaiTebakan(replay["tanpa-lock"]!, -20000)).toBe("benar");
    expect(nilaiTebakan(replay["tanpa-lock"]!, 30000)).toBe("meleset");
    expect(nilaiTebakan(replay["tanpa-lock"]!, "belum")).toBe("belum");
  });
  it("beda tanpa lock dengan FOR UPDATE: saldo, tablet, dan menunggu berubah; HP, retry, error sama", () => {
    const b = beda(fakta(replay["tanpa-lock"]!, L), fakta(replay["for-update"]!, L));
    expect(b.berubah).toEqual([
      { label: "Saldo akhir", lama: "−Rp20.000", baru: "Rp30.000" },
      { label: "Tablet Budi", lama: "COMMIT", baru: "ditolak kode: saldo kurang" },
      { label: "Langkah yang menunggu lock", lama: "0 langkah", baru: "1 langkah" },
    ]);
    expect(b.sama.map((f) => f.kunci)).toEqual(["A", "retry", "sqlstate"]);
  });
  it("FOR UPDATE dan UPDATE atomik: hasil akhirnya sama", () => {
    expect(beda(fakta(replay["for-update"]!, L), fakta(replay["atomik"]!, L)).berubah).toEqual([]);
  });
  it("SERIALIZABLE: error database dan retry tampil", () => {
    const f = fakta(replay["serializable"]!, L);
    expect(f.find((x) => x.kunci === "sqlstate")!.nilai).toBe("40001 serialization_failure");
    expect(f.find((x) => x.kunci === "retry")!.nilai).toBe("1");
  });
  it("pembanding = cara lain yang paling akhir selesai; tawaran berikutnya melewati yang sudah selesai", () => {
    let s = tandaiSelesai([], "tanpa-lock");
    s = tandaiSelesai(s, "for-update");
    expect(pembanding(s, "for-update")).toBe("tanpa-lock");
    expect(pembanding(["for-update"], "for-update")).toBeNull();
    expect(tandaiSelesai(s, "tanpa-lock")).toEqual(["for-update", "tanpa-lock"]);
    expect(caraBerikutnya(CARA, "tanpa-lock", s)).toBe("tanpa-lock-bergantian");
    expect(caraBerikutnya(CARA, "serializable", ["tanpa-lock"])).toBe("tanpa-lock-bergantian");
    expect(caraBerikutnya(CARA, "atomik", CARA)).toBe("optimistic");
    expect(caraBerikutnya(["tanpa-lock"], "tanpa-lock", [])).toBeNull();
  });
});

describe("label", () => {
  it("isi mengganti {nama} dan menolak nama yang tidak diisi", () => {
    expect(isi(L.hitungan, { i: 2, n: 12 })).toBe("Langkah 2 dari 12");
    expect(() => isi(L.hitungan, { i: 2 })).toThrow(/\{n\}/);
  });
  it("kaki: path file jadi bagian kode", () => {
    const r = replay["atomik"]!;
    const b = bagian(L.kaki, { versi: r.postgres, isolation: r.isolation, tanggal: r.tanggal, file: r.file, kepala: r.kepala }, ["file", "kepala"]);
    expect(b.filter((x) => x.kode).map((x) => x.teks)).toEqual([`${DIR}/ledger-atomik.json`, `${DIR}/ledger-atomik.txt`]);
    expect(b.map((x) => x.teks).join("")).toContain("Rekaman PostgreSQL 17.11, isolation read committed, direkam 2026-10-14.");
  });
});
