import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { appSesudah, bacaKejadian, bacaRekaman, bacaSatuLangkah, indeksBenar, isi, JUMLAH_FASE, kunciBenar, type HasilApp } from "./logika";
import { LabelTigaRilis } from "./skema";
import labelMentah from "../../../data/widget/t2-skema-tiga-rilis.json";

const DIR = path.resolve(__dirname, "../../../../labs/b4-skema/output/ledger");
const tiga = fs.readFileSync(path.join(DIR, "tiga-rilis.txt"), "utf8");
const satu = fs.readFileSync(path.join(DIR, "satu-langkah.txt"), "utf8");

describe("rekaman tiga-rilis.txt (2.22)", () => {
  const r = bacaRekaman(tiga);

  test("lima fase, tiap fase berisi kejadian", () => {
    expect(r.fase).toHaveLength(JUMLAH_FASE);
    r.fase.forEach((f) => expect(f.length).toBeGreaterThan(0));
  });

  test("app 1.0 dan 1.1 jalan di setiap fase: bayar COMMIT dan riwayat tidak kosong", () => {
    for (let n = 1; n <= JUMLAH_FASE; n++) {
      const a = appSesudah(r.fase, n);
      for (const v of ["1.0", "1.1"] as const) {
        expect(a[v]?.bayar).toBe("COMMIT");
        expect(a[v]!.baris).toBeGreaterThan(0);
      }
    }
  });

  test("riwayat turun dari 17 ke 3 baris sesudah server membaca ledger (riwayat mulai dari jurnal pembuka)", () => {
    expect(appSesudah(r.fase, 3)["1.0"]!.baris).toBe(17);
    expect(appSesudah(r.fase, 4)["1.0"]!.baris).toBe(3);
  });

  test("backfill: Bayar menunggu di belakang BF, riwayat tanpa menunggu, tebakan benar = bayar", () => {
    expect(kunciBenar(r.fase)).toBe("bayar");
  });

  test("cek malam 0 akun tanpa buku dan 0 cache berbeda ada di fase 4", () => {
    const cek = r.fase[3]!.find((k) => k.jenis === "cek");
    expect(cek).toMatchObject({ jenis: "cek", tanpaBuku: 0, berbeda: 0 });
  });

  test("contract adalah langkah 13 di fase 5", () => {
    expect(r.fase[4]!.some((k) => k.jenis === "langkah" && k.no === 13)).toBe(true);
  });
});

describe("rekaman satu-langkah.txt (M13)", () => {
  const s = bacaSatuLangkah(satu);
  test("server lama gagal 42703 dan kedua app berhenti", () => {
    expect(s.galat.map((g) => g.no)).toEqual([7, 8]);
    expect(s.app.map((a) => a.versi)).toEqual(["1.0", "1.1"]);
    expect(s.app[0]!.teks).toMatch(/Null/);
  });
});

describe("rekaman yang berubah menggagalkan build (uji mutasi)", () => {
  test("app yang tidak lagi COMMIT ditolak", () => {
    const rusak = tiga.replace("app 1.1 (Karyawan 421) bayar COMMIT · nomor 16.017", "app 1.1 (Karyawan 421) bayar ERROR · nomor 16.017");
    expect(rusak).not.toBe(tiga);
    expect(() => bacaRekaman(rusak)).toThrow(/tidak jalan|tidak diikuti|jumlah sama/);
  });

  test("riwayat kosong ditolak", () => {
    const rusak = tiga.replace("app 1.0 layar riwayat: 5 baris", "app 1.0 layar riwayat: 0 baris");
    expect(rusak).not.toBe(tiga);
    expect(() => bacaRekaman(rusak)).toThrow(/0 baris/);
  });

  test("Bayar yang tidak lagi menunggu backfill ditolak", () => {
    const rusak = tiga.replace("MENUNGGU ShareLock pada baris yang dikunci transaction lain, di belakang BF", "COMMIT");
    expect(rusak).not.toBe(tiga);
    expect(() => bacaRekaman(rusak)).toThrow(/menunggu lock baris/);
  });

  test("riwayat yang ikut menunggu ditolak", () => {
    const rusak = tiga.replace("tanpa menunggu: lock baris tidak menahan SELECT biasa", "menunggu");
    expect(rusak).not.toBe(tiga);
    expect(() => bacaRekaman(rusak)).toThrow(/tanpa menunggu/);
  });

  test("cache yang berbeda di cek malam ditolak", () => {
    const rusak = tiga.replace(/ 1012 \| 0          \| 0/, " 1012 | 0          | 3");
    expect(rusak).not.toBe(tiga);
    expect(() => bacaRekaman(rusak)).toThrow(/cek malam/);
  });

  test("label app yang tidak dikenal dan langkah tak berurutan ditolak", () => {
    const rusak = tiga.replace(/^rilis 3 \(ledger saja\)/m, "rilis 9 (lain)");
    expect(rusak).not.toBe(tiga);
    expect(() => bacaRekaman(rusak)).toThrow(/tidak dikenal/);
    expect(() => bacaKejadian(" 2 [S] X\n      -> COMMIT\n")).toThrow(/berurutan/);
  });

  test("baris bayar tanpa baris riwayat ditolak", () => {
    expect(() => bacaKejadian("rilis 1 (server v1)               app 1.0 (Karyawan 420) bayar COMMIT · nomor 15.002 · saldo Rp240.000\n")).toThrow(/riwayat/);
  });

  test("galat satu-langkah selain 42703 ditolak", () => {
    const rusak = satu.replace(/ERROR 42703 undefined_column/g, "ERROR 23505 unique_violation");
    expect(rusak).not.toBe(satu);
    expect(() => bacaSatuLangkah(rusak)).toThrow(/42703/);
  });
});

describe("teks widget", () => {
  const L = LabelTigaRilis.parse(labelMentah);
  const r = bacaRekaman(tiga);

  test("tepat satu pilihan sama dengan rekaman (Bayar menunggu), dan bukan pilihan pertama", () => {
    const i = indeksBenar(L.pilihan, r.fase);
    expect(L.pilihan[i]!.kunci).toBe("bayar");
    expect(i).not.toBe(0);
  });

  test("dua pilihan dengan kunci sama ditolak", () => {
    const ganda = L.pilihan.map((p) => ({ ...p, kunci: "bayar" as const }));
    expect(() => indeksBenar(ganda, r.fase)).toThrow(/tepat satu/);
  });

  test("templat memakai nama yang tidak diisi gagal keras", () => {
    expect(isi("riwayat {baris} baris", { baris: 17 })).toBe("riwayat 17 baris");
    expect(() => isi("{lain}", {})).toThrow(/tidak diisi/);
  });

  test("templat bayarRiwayat dan cek terisi dari rekaman", () => {
    const a = appSesudah(r.fase, 1)["1.0"] as HasilApp;
    expect(isi(L.bayarRiwayat, { saldo: a.saldo, baris: a.baris })).toMatch(/Rp240\.000.*16 baris/);
  });

  test("skema menolak kunci tambahan dan jumlah fase yang salah", () => {
    expect(LabelTigaRilis.safeParse({ ...labelMentah, lain: "x" }).success).toBe(false);
    expect(LabelTigaRilis.safeParse({ ...labelMentah, fase: labelMentah.fase.slice(0, 4) }).success).toBe(false);
  });
});
