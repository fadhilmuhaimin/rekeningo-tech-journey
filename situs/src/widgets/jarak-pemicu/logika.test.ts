import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  AMBANG, POOL, angka, bacaCara, besar, desimal1, desimal2, duaAngkaPenting, indeksBenar, isi, kaliPuncak, koneksi, koneksiTeks,
  lambdaPemicu, lebarLog, puncakPerDetik, waktu,
} from "./logika";
import { LabelJarak } from "./skema";
import labelMentah from "../../../data/widget/t2-adr21-jarak.json";
import cerita from "../../../data/cerita.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/b2-query/output/ledger/n1.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");
const a2 = cerita.tahap[1]!.asumsi;
const puncak = puncakPerDetik(a2);

describe("rekaman n1.txt bagian E (ADR 21)", () => {
  const c = bacaCara(teks);

  test("lima cara, urutan tetap, waktu dari kolom yang benar", () => {
    expect(c.map((x) => [x.id, x.ms])).toEqual([
      ["hal1-n1", 30.5],
      ["hal1-join", 27.4],
      ["hal1-join-index", 1.4],
      ["seluruh-n1", 1936.4],
      ["seluruh-join", 30.6],
    ]);
    expect(c.map((x) => x.indeks)).toEqual([false, false, true, false, false]);
  });

  test("kolom dengan index dibaca untuk halaman pertama JOIN, bukan kolom tanpa index", () => {
    expect(c[2]!.ms).toBe(1.4);
    expect(c[1]!.ms).toBe(27.4);
  });

  test("baris yang hilang ditolak", () => {
    const e = teks.indexOf("# --- E. ");
    const rusak = teks.slice(0, e) + teks.slice(e).replace(/ Riwayat Budi hal\. 1\s+\| JOIN \|[^\n]*\n/, "");
    expect(rusak).not.toBe(teks);
    expect(() => bacaCara(rusak)).toThrow(/tidak ada di bagian E/);
  });

  test("bagian E yang hilang ditolak", () => {
    const rusak = teks.replace("# --- E. ", "# --- X. ");
    expect(rusak).not.toBe(teks);
    expect(() => bacaCara(rusak)).toThrow(/bagian E tidak ada/);
  });

  test("baris ganda ditolak", () => {
    const e = teks.indexOf("# --- E. ");
    const baris = teks.slice(e).match(/ Seluruh riwayat Budi\s+\| JOIN \|[^\n]*\n/)![0];
    const rusak = teks.replace(baris, baris + baris);
    expect(() => bacaCara(rusak)).toThrow(/baris ganda/);
  });
});

describe("hitungan", () => {
  test("puncak dari registry: 12.000 request per hari, 1,389 per detik", () => {
    expect([a2.user, a2.aktif, a2.req, a2.puncak]).toEqual([1000, 30, 40, 10]);
    expect(puncak).toBeCloseTo(1.3888889, 6);
    expect(desimal1(puncak)).toBe("1,4");
  });

  test("pool 10 dan pemicu 5 koneksi (Asumsi)", () => {
    expect(POOL).toBe(10);
    expect(AMBANG).toBe(5);
  });

  test("L = λ × W dan λ pemicu = ambang ÷ W", () => {
    expect(koneksi(2, 500)).toBe(1);
    expect(lambdaPemicu(1000)).toBe(5);
    expect(lambdaPemicu(1.4)).toBeCloseTo(3571.43, 2);
    expect(koneksi(lambdaPemicu(30.6), 30.6)).toBeCloseTo(AMBANG, 10);
  });

  test("kali puncak untuk lima cara: 118, 131, 2.571, 1,9, 118", () => {
    const c = bacaCara(teks);
    const kali = c.map((x) => besar(kaliPuncak(x.ms, puncak)));
    expect(kali).toEqual(["118", "131", "2.571", "1,9", "118"]);
  });

  test("L sekarang: 0,0424; 0,0381; 0,0019; 2,69; 0,0425", () => {
    const c = bacaCara(teks);
    expect(c.map((x) => koneksiTeks(koneksi(puncak, x.ms)))).toEqual(["0,0424", "0,0381", "0,0019", "2,69", "0,0425"]);
  });

  test("index riwayat menggeser jarak halaman pertama ±22 kali; seluruh riwayat N+1 ke JOIN 63 kali", () => {
    const c = bacaCara(teks);
    expect(c[0]!.ms / c[2]!.ms).toBeCloseTo(21.79, 2);
    expect(Math.round(c[3]!.ms / c[4]!.ms)).toBe(63);
  });
});

describe("format dan tebakan", () => {
  test("angka besar tanpa desimal, kecil satu desimal, W dengan satuan", () => {
    expect(besar(3571.43)).toBe("3.571");
    expect(besar(99.94)).toBe("99,9");
    expect(angka(2600)).toBe("2.600");
    expect(waktu(1936.4)).toBe("1.936,4 ms");
    expect(duaAngkaPenting(2571.4)).toBe(2600);
    expect(duaAngkaPenting(117.6)).toBe(120);
    expect(duaAngkaPenting(131.4)).toBe(130);
    expect(duaAngkaPenting(1.86)).toBe(1.9);
  });

  test("batang logaritma: terbesar 100, terkecil minimal 2", () => {
    expect(lebarLog(2571, 2571)).toBe(100);
    expect(lebarLog(1.9, 2571)).toBeGreaterThanOrEqual(2);
    expect(lebarLog(118, 2571)).toBeGreaterThan(lebarLog(1.9, 2571));
    expect(lebarLog(5, 1)).toBe(100);
  });

  test("isi templat dan nama yang tidak diisi gagal", () => {
    expect(isi("{a} dan {b}", { a: 1, b: "x" })).toBe("1 dan x");
    expect(() => isi("{c}", {})).toThrow(/\{c\}/);
  });

  test("indeksBenar: tepat satu dalam 5%, yang lain jauh", () => {
    const hit = 2571.43;
    expect(indeksBenar([{ kali: 2, alasan: "a" }, { kali: 120, alasan: "b" }, { kali: 2600, alasan: "c" }], hit)).toBe(2);
    expect(() => indeksBenar([{ kali: 2, alasan: "a" }, { kali: 120, alasan: "b" }, { kali: 2000, alasan: "c" }], hit)).toThrow(/tepat satu/);
    expect(() => indeksBenar([{ kali: 2600, alasan: "a" }, { kali: 2700, alasan: "b" }, { kali: 2, alasan: "c" }], hit)).toThrow(/tepat satu/);
    expect(() => indeksBenar([{ kali: 2600, alasan: "a" }, { kali: 1800, alasan: "b" }, { kali: 2, alasan: "c" }], hit)).toThrow(/terlalu dekat/);
  });
});

describe("teks widget t2-adr21-jarak.json", () => {
  const L = LabelJarak.parse(labelMentah);

  test("skema menerima data dan menolak kunci asing", () => {
    expect(() => LabelJarak.parse({ ...labelMentah, tambahan: 1 })).toThrow();
    expect(() => LabelJarak.parse({ ...labelMentah, pilihan: labelMentah.pilihan.slice(0, 2) })).toThrow();
  });

  test("pilihan tebakan: yang benar adalah jarak halaman pertama dengan index, yang salah adalah dua baris rekaman lain", () => {
    const c = bacaCara(teks);
    const hit = kaliPuncak(c[2]!.ms, puncak);
    expect(indeksBenar(L.pilihan, hit)).toBe(2);
    expect(duaAngkaPenting(hit)).toBe(L.pilihan[2]!.kali);
    expect(L.pilihan[0]!.kali).toBe(Math.round(kaliPuncak(c[3]!.ms, puncak)));
    expect(L.pilihan[1]!.kali).toBe(duaAngkaPenting(kaliPuncak(c[1]!.ms, puncak)));
  });

  test("semua templat memakai hanya nama yang disediakan halaman", () => {
    const sedia = { w: 1, puncak: 1, lambda: 1, kali: 1, kali_seluruh_n1: 1, kali_hal1_join: 1, w_hal1_join: 1, pool: 1, ambang: 1 };
    const semua = [L.pertanyaan, L.catatan, ...L.pilihan.map((p) => p.alasan), ...Object.values(L.kalimat)];
    for (const t of semua) expect(() => isi(t, sedia)).not.toThrow();
  });
});

describe("arah galat dan pembacaan layar (peninjau PR 346)", () => {
  const L = LabelJarak.parse(labelMentah);

  test("teks pilihan tebakan menyebut dua kesalahan berlawanan arah, bukan 'batas bawah' satu arah", () => {
    expect(L.pilihan[2]!.alasan).toContain("dua kesalahan berlawanan arah");
    expect(L.pilihan[2]!.alasan).toContain("jarak sebenarnya lebih dekat");
    expect(L.pilihan[2]!.alasan).toContain("jarak sebenarnya lebih jauh");
    expect(L.pilihan[2]!.alasan).not.toContain("batas bawah untuk jarak");
    expect(L.catatan).toContain("jarak sebenarnya lebih dekat");
  });

  test("puncak di teks widget ditulis dua desimal (1,39) supaya kelipatan bisa dihitung ulang", () => {
    expect(desimal2(puncak)).toBe("1,39");
    expect(Math.round(lambdaPemicu(1.4) / Number(desimal2(puncak).replace(",", ".")))).toBe(2569); // pembaca dengan 1,39: 2.569, selisih 0,1% dari 2.571
  });

  test("live region hanya satu kalimat ringkasan, bukan empat angka sekaligus", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "JarakPemicu.tsx"), "utf8");
    expect(src.match(/role="status"/g)).toHaveLength(2); // hasil tebakan dan kalimat jarak
    expect(src).toMatch(/<p role="status" aria-live="polite">\{b\.kalimat\}<\/p>/);
    expect(src).not.toMatch(/<div role="status"[^>]*className="qr-hasil"/);
  });
});
