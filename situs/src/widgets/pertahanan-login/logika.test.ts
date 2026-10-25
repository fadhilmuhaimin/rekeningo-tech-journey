import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { KONDISI, bacaRekaman, hashDuaLapis, indeksBenar, isi, nilaiTeks, tabelKondisi, terkunciKunciSaja } from "./logika";
import { LabelPertahananLogin } from "./skema";
import labelMentah from "../../../data/widget/t2-login-pertahanan.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/c4-ratelimit/output/login/ratelimit.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");
const RUN = fs.readFileSync(path.resolve(__dirname, "../../../../labs/c4-ratelimit/run-login.py"), "utf8");

describe("rekaman c4 login (2.28)", () => {
  const r = bacaRekaman(teks);

  test("enam kondisi, angka persis seperti di rekaman", () => {
    expect(r["dua-lapis"]).toEqual({ percobaan: 29, sampai: 10, ditolak: 19, terbuka: 0 });
    expect(r["kunci-saja"]).toEqual({ percobaan: 29, sampai: 29, ditolak: 0, terbuka: 1 });
    expect(r["xff-mentah"]).toEqual({ percobaan: 20, sampai: 20, ditolak: 0, terbuka: 0 });
    expect(r["proxy-palsu"]).toEqual({ percobaan: 20, sampai: 10, ditolak: 10, terbuka: 0 });
    expect(r["dua-instance"]).toEqual({ percobaan: 24, sampai: 20, ditolak: 4, terbuka: 0 });
    expect(r.ipv6).toEqual({ percobaan: 12, sampai: 10, ditolak: 2, terbuka: 0 });
    expect(Object.keys(r).sort()).toEqual([...KONDISI].sort());
  });

  test("hash dan akun terkunci dibaca dari baris yang sama dengan hasilnya", () => {
    expect(hashDuaLapis(teks)).toBe(10);
    expect(terkunciKunciSaja(teks)).toBe(0);
  });

  test("jumlah percobaan proxy-palsu cocok dengan 20 percobaan di run-login.py (rekaman tidak menulisnya)", () => {
    const bagianE = RUN.slice(RUN.indexOf("def bagian_e"), RUN.indexOf("def bagian_f"));
    const proxy = bagianE.slice(bagianE.indexOf('ip_sumber="proxy"'));
    expect(proxy).toContain("for i in range(20):");
  });

  test("tabel menyorot kondisi yang tidak menahan apa pun dan akun yang terbuka", () => {
    expect(tabelKondisi(r["kunci-saja"]).map((b) => [b.kode, b.nilai, b.sorot])).toEqual([
      ["percobaan", "29", false], ["sampai", "29", true], ["ditolak", "0", false], ["terbuka", "1", true],
    ]);
    expect(tabelKondisi(r["dua-lapis"]).filter((b) => b.sorot)).toEqual([]);
    expect(tabelKondisi(r["xff-mentah"]).find((b) => b.kode === "sampai")!.sorot).toBe(true);
  });
});

describe("rekaman yang berubah bentuk menggagalkan build", () => {
  test("bagian D hilang", () => {
    expect(() => bacaRekaman(teks.replace("== D. ", "== X. "))).toThrow(/bagian D tidak ada/);
  });
  test("jumlah jawaban tidak sama dengan jumlah percobaan", () => {
    const rusak = teks.replace("→ 401: 10 · 429: 19", "→ 401: 10 · 429: 18");
    expect(rusak).not.toBe(teks);
    expect(() => bacaRekaman(rusak)).toThrow(/28 percobaan tertulis|29 percobaan tertulis/);
  });
  test("baris IP_SUMBER=proxy hilang", () => {
    expect(() => bacaRekaman(teks.replace("IP_SUMBER=proxy, penyerang menebak", "IP_SUMBER=lain, penyerang menebak"))).toThrow(/IP_SUMBER=proxy tidak ada/);
  });
  test("jumlah hash dan query akun berbeda", () => {
    expect(() => hashDuaLapis(teks.replace("query akun 10 kali", "query akun 11 kali"))).toThrow(/berbeda/);
  });
  test("baris akun terkunci hilang", () => {
    expect(() => terkunciKunciSaja(teks.replace("akun yang terkunci oleh serangan ini", "akun lain"))).toThrow(/tidak ada/);
  });
});

describe("teks widget (t2-login-pertahanan.json)", () => {
  const L = LabelPertahananLogin.parse(labelMentah);
  const r = bacaRekaman(teks);
  const nilai = nilaiTeks(r["dua-lapis"], hashDuaLapis(teks), terkunciKunciSaja(teks));

  test("tepat satu pilihan yang cocok dengan rekaman, dan itu pilihan B (sepuluh)", () => {
    expect(indeksBenar(L.pilihan, r["dua-lapis"].sampai)).toBe(1);
  });

  test("dua pilihan dengan angka yang sama menggagalkan build", () => {
    const dobel = [L.pilihan[1]!, { ...L.pilihan[1]! }, L.pilihan[0]!];
    expect(() => indeksBenar(dobel, 10)).toThrow(/2 pilihan cocok/);
  });

  test("templat memakai nama yang tidak diisi gagal keras; angka masuk ke teks", () => {
    expect(() => isi("{tidakAda}", nilai)).toThrow(/tidak diisi/);
    expect(isi(L.pilihan[1]!.alasan, nilai)).toBe(
      "10 tebakan sampai ke pemeriksaan password dan 19 ditolak 429 sebelum menyentuh database. Server menjalankan argon2id 10 kali, bukan 29 kali.",
    );
    expect(isi(L.kondisi["kunci-saja"].kesimpulan, nilaiTeks(r["kunci-saja"], 10, 0))).toContain("Akun yang terkunci: 0");
  });

  test("tiap kondisi punya label, kesimpulan, dan catatan; semua {nama} di templat terisi", () => {
    for (const k of KONDISI) {
      const v = nilaiTeks(r[k], 10, 0);
      expect(() => isi(L.kondisi[k].kesimpulan, v), k).not.toThrow();
      expect(L.kondisi[k].label.length, k).toBeGreaterThan(0);
    }
  });
});
