// Tes logika widget 3.16: angka dibaca dari rekaman batas.txt dan konstanta di kode api-t3, dan rekaman yang berubah
// bentuk menggagalkan build. Teks widget (t3-m22-batas.json) dicocokkan dengan angka itu, bukan dengan daftar tulisan tangan.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { KONDISI, bacaBatas, bacaBatasAlamat, indeksBenar, jumlahInstance, nilaiBatas, nilaiPerInstance, tabelBatas } from "./logika";
import { isi } from "../pertahanan-login/logika";
import { LabelBatasInstance } from "./skema";
import labelMentah from "../../../data/widget/t3-m22-batas.json";

const akar = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(akar, rel), "utf8");
const teks = baca("labs/t3-instance/output/batas.txt");
const kode = baca("labs/api-t3/internal/service/pembatas.go");
const runPy = baca("labs/t3-instance/run.py");

describe("rekaman batas.txt bagian A dan B", () => {
  const r = bacaBatas(teks);

  test("dua instance: 24 percobaan, 20 sampai (a 10, b 10), 4 ditolak; satu instance: 24, 10, 14 (langsung ke a)", () => {
    expect(r["dua-instance"]).toEqual({ percobaan: 24, sampai: 20, ditolak: 4, perInstance: "a 10 · b 10" });
    expect(r["satu-instance"]).toEqual({ percobaan: 24, sampai: 10, ditolak: 14, perInstance: "a 10" });
    expect(Object.keys(r).sort()).toEqual([...KONDISI].sort());
  });

  test("batas per alamat dibaca dari AmbangLoginIP: 10 sekaligus, isi ulang 10 per menit", () => {
    expect(bacaBatasAlamat(kode)).toEqual({ kapasitas: 10, perMenit: 10 });
  });

  test("run.py memerankan A dengan round_robin dan B langsung ke instance a, dua-duanya 24 akun", () => {
    const batas = runPy.slice(runPy.indexOf("def rekam_batas"));
    const a = batas.slice(batas.indexOf('bagian("A. '), batas.indexOf('bagian("B. '));
    const b = batas.slice(batas.indexOf('bagian("B. '), batas.indexOf('bagian("C. '));
    expect(a).toContain('proxy_mulai("bergilir")');
    expect(a).toContain("tebak(PORT_PROXY, emails)");
    expect(b).toContain("tebak(PORT_A, emails)");
    expect(runPy).toContain("emails = KARYAWAN[:24]");
    expect(runPy).toContain("def tebak(port, emails, password=SALAH)");
  });

  test("tabel menyorot hanya kondisi yang meloloskan lebih banyak dari jatah satu alamat", () => {
    expect(tabelBatas(r["dua-instance"], 10).map((b) => [b.kode, b.nilai, b.sorot])).toEqual([
      ["percobaan", "24", false], ["sampai", "20", true], ["ditolak", "4", false], ["terbuka", "a 10 · b 10", false],
    ]);
    expect(tabelBatas(r["satu-instance"], 10).filter((b) => b.sorot)).toEqual([]);
  });

  test("per instance bulat: 12 diterima dan 2 ditolak tiap instance; 2 instance", () => {
    expect(jumlahInstance(r["dua-instance"].perInstance)).toBe(2);
    expect(nilaiPerInstance(r["dua-instance"])).toEqual({ diterima: 12, tolakTiap: 2 });
    expect(nilaiBatas(r["dua-instance"], 10)).toMatchObject({ percobaan: 24, sampai: 20, ditolak: 4, batas: 10, diterima: 12, tolakTiap: 2 });
  });
});

describe("rekaman yang berubah bentuk menggagalkan build", () => {
  const ganti = (a: string, b: string) => {
    expect(teks).toContain(a);
    return teks.replace(a, b);
  };

  test("jumlah jawaban yang tidak sama dengan jumlah percobaan", () => {
    expect(() => bacaBatas(ganti("24 percobaan → 401: 20 · 429: 4", "24 percobaan → 401: 20 · 429: 3"))).toThrow(/jawaban/);
    expect(() => bacaBatas(ganti("langsung ke instance a → 401: 10 · 429: 14", "langsung ke instance a → 401: 10 · 429: 13"))).toThrow(/jawaban/);
  });

  test("kode status lain di baris hasil", () => {
    expect(() => bacaBatas(ganti("24 percobaan → 401: 20 · 429: 4", "24 percobaan → 200: 1 · 401: 19 · 429: 4"))).toThrow(/kode lain/);
  });

  test("jumlah per instance yang tidak sama dengan jumlah yang lolos", () => {
    expect(() => bacaBatas(ganti("per instance: 401 a 10, b 10", "per instance: 401 a 10, b 9"))).toThrow(/per instance/);
    expect(() => bacaBatas(ganti("429 a 2, b 2", "429 a 2, b 1"))).toThrow(/per instance/);
  });

  test("bagian atau baris yang hilang", () => {
    expect(() => bacaBatas(teks.replace("# --- A. ", "# --- Z. "))).toThrow(/bagian A/);
    expect(() => bacaBatas(teks.replace("percobaan langsung ke instance a", "percobaan ke instance a"))).toThrow(/bagian B/);
  });

  test("konstanta batas yang berubah bentuk", () => {
    expect(() => bacaBatasAlamat(kode.replace("AmbangLoginIP", "AmbangMasukIP"))).toThrow(/AmbangLoginIP/);
  });
});

describe("teks widget cocok dengan rekaman", () => {
  const r = bacaBatas(teks);
  const batas = bacaBatasAlamat(kode).kapasitas;
  const L = LabelBatasInstance.parse(labelMentah);
  const utama = nilaiBatas(r["dua-instance"], batas);
  const KATA: Record<string, number> = { sepuluh: 10, "dua belas": 12, "dua puluh": 20, "dua puluh empat": 24 };

  test("tepat satu pilihan tebakan cocok dengan rekaman, dan jawaban benar bukan pilihan pertama", () => {
    const i = indeksBenar(L.pilihan, r["dua-instance"].sampai);
    expect(L.pilihan[i]!.angka).toBe(20);
    expect(i).toBe(3);
  });

  test("kata bilangan di tiap pilihan sama dengan angkanya, dan angka salah punya alasan dari rekaman", () => {
    for (const p of L.pilihan) {
      const awal = p.teks.split(":")[0]!.toLowerCase();
      expect(KATA[awal], p.teks).toBe(p.angka);
    }
    const nilai = L.pilihan.map((p) => p.angka).sort((a, b) => a - b);
    expect(nilai).toEqual([batas, utama.diterima, r["dua-instance"].sampai, r["dua-instance"].percobaan]);
  });

  test("templat terisi: tidak ada {nama} yang tersisa, dan nama yang tidak diisi gagal keras", () => {
    for (const p of L.pilihan) expect(isi(p.alasan, utama)).not.toMatch(/\{\w+\}/);
    for (const k of KONDISI) expect(isi(L.kondisi[k].kesimpulan, nilaiBatas(r[k], batas))).not.toMatch(/\{\w+\}/);
    expect(isi(L.pertanyaan, utama)).not.toMatch(/\{\w+\}/);
    expect(() => isi("{tidakAda}", utama)).toThrow(/tidakAda/);
  });

  test("kesimpulan tiap kondisi memuat angka yang sama dengan rekaman", () => {
    expect(isi(L.kondisi["dua-instance"].kesimpulan, utama)).toBe(
      "20 dari 24 percobaan sampai ke pemeriksaan password (a 10 · b 10), dan 4 ditolak 429.",
    );
    expect(isi(L.kondisi["satu-instance"].kesimpulan, nilaiBatas(r["satu-instance"], batas))).toBe(
      "10 dari 24 percobaan sampai ke pemeriksaan password, dan 14 ditolak 429 sesudah jatah 10 habis.",
    );
  });

  test("tiap kesimpulan satu kalimat (wilayah status satu kalimat)", () => {
    for (const k of KONDISI) {
      const t = isi(L.kondisi[k].kesimpulan, nilaiBatas(r[k], batas));
      expect(t.replace(/\d+\.\d+/g, "").split(/[.!?](?:\s|$)/).filter(Boolean)).toHaveLength(1);
    }
  });

  test("label baris dan kondisi memakai kata yang sama dengan halaman, tanpa ID riset atau nomor keputusan", () => {
    expect(Object.keys(L.kondisi).sort()).toEqual([...KONDISI].sort());
    expect(JSON.stringify(labelMentah)).not.toMatch(/\bR\d-\d+\b|keputusan \d+/);
  });
});
