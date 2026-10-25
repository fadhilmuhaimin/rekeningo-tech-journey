import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaRekaman, indeksBenar, isi, tabelGiliran } from "./logika";
import { LabelKunciAkun } from "./skema";
import labelMentah from "../../../data/widget/t2-m16-kunci.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/c4-ratelimit/output/login/ratelimit.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman ratelimit.txt (M16)", () => {
  const r = bacaRekaman(teks);

  test("ambang lima, batas atas kunci 32 menit", () => {
    expect(r.ambang).toBe(5);
    expect(r.maksMenit).toBe(32);
  });

  test("tiga putaran: lima tebakan lalu satu tebakan per kunci, lama kunci menggandakan", () => {
    expect(r.putaran.map((p) => [p.ke, p.tebakan, p.status, p.terkunciDetik])).toEqual([
      [1, 5, 401, 60],
      [2, 1, 401, 120],
      [3, 1, 401, 240],
    ]);
  });

  test("jawaban untuk Ani yang terkunci sama dengan jawaban password salah", () => {
    expect(r.judulJawaban).toBe("Email atau password salah");
  });

  test("password benar sesudah kunci lewat: 200 dan penghitung 0", () => {
    expect(r.aniBenar).toEqual({ sesudahDetik: 61, status: 200, gagalLogin: 0 });
  });
});

describe("tebakan dan tabel dari data widget", () => {
  const r = bacaRekaman(teks);
  const L = LabelKunciAkun.parse(labelMentah);
  const nilai = { awal: 5, lebih: 6, ambang: 5, kunci1: 60, ke2: 1, detik2: 120, detik3: 240, maks: 32, sesudah: 61 };
  const pilihan = L.pilihan.map((p) => ({ ...p, alasan: isi(p.alasan, nilai) }));
  const t = {
    judul: { penyerang: L.tabel.penyerang.judul, ani: L.tabel.ani.judul },
    kolom: { penyerang: [...L.tabel.penyerang.kolom], ani: [...L.tabel.ani.kolom] },
    sel: L.sel,
  };

  test("tepat satu pilihan benar: satu tebakan", () => {
    const i = indeksBenar(pilihan, r);
    expect(pilihan[i]!.tebakan).toBe(1);
  });

  test("dua pilihan dengan jumlah tebakan sama menggagalkan build", () => {
    expect(() => indeksBenar([...pilihan, { ...pilihan[2]! }], r)).toThrow(/2 pilihan cocok/);
  });

  test("tidak ada pilihan yang cocok menggagalkan build", () => {
    expect(() => indeksBenar(pilihan.filter((p) => p.tebakan !== 1), r)).toThrow(/0 pilihan cocok/);
  });

  test("tabel penyerang: tiga baris, kolom sama banyak dengan kepala", () => {
    const tb = tabelGiliran(r, "penyerang", t);
    expect(tb.baris).toHaveLength(3);
    expect(tb.baris.every((b) => b.length === tb.kolom.length)).toBe(true);
    expect(tb.baris[1]).toEqual(["Kunci ke-2", "1 tebakan salah", "401: Email atau password salah", "120 detik"]);
  });

  test("tabel Ani: satu baris, 200, tidak terkunci, penghitung 0", () => {
    const tb = tabelGiliran(r, "ani", t);
    expect(tb.baris).toEqual([["Password benar", "200, login berhasil", "Tidak terkunci", "0"]]);
  });

  test("templat dengan {nama} yang tidak diisi gagal keras", () => {
    expect(() => isi("{ada} {hilang}", { ada: 1 })).toThrow(/hilang/);
  });
});

describe("rekaman yang berubah bentuk menggagalkan build", () => {
  test("kepala kunci per akun hilang", () => {
    expect(() => bacaRekaman(teks.replace("Kunci per akun: ambang", "Lain: ambang"))).toThrow(/kepala kunci per akun/);
  });

  test("lama kunci ke-2 tidak dua kali lipat", () => {
    expect(() => bacaRekaman(teks.replace("terkunci 120 s lagi", "terkunci 90 s lagi"))).toThrow(/tidak menggandakan/);
  });

  test("jawaban untuk Ani bukan 401", () => {
    expect(() => bacaRekaman(teks.replace("kunci ke-1: Ani (IP sendiri, password BENAR) ditolak 401", "kunci ke-1: Ani (IP sendiri, password BENAR) ditolak 423"))).toThrow(/harus 401/);
  });

  test("password benar sesudah kunci lewat tidak 200", () => {
    expect(() => bacaRekaman(teks.replace("→ 200 ok=True; gagal_login 0, terkunci tidak", "→ 401 ok=True; gagal_login 0, terkunci tidak"))).toThrow(/harus 200/);
  });

  test("baris bagian G hilang", () => {
    expect(() => bacaRekaman(teks.replace("password BENAR sesudah kunci lewat", "password lain sesudah kunci lewat"))).toThrow(/bagian G/);
  });
});
