import { describe, expect, it } from "vitest";
import { BATAS_BYTE, bacaFile, ekspor, FORMAT, GagalSimpan, kunciProgres, namaFile, ringkas, terapkan, type Penyimpanan } from "./progres";

class Peti implements Penyimpanan {
  m = new Map<string, string>();
  gagalSetelah = Infinity;
  constructor(isi: Record<string, string> = {}) { for (const [k, v] of Object.entries(isi)) this.m.set(k, v); }
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  // Gagal sekali pada penulisan ke-(gagalSetelah + 1), seperti kuota yang penuh oleh isi baru.
  setItem(k: string, v: string) { if (this.gagalSetelah-- === 0) throw new Error("QuotaExceededError"); this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

const KINI = new Date("2026-10-13T02:00:00.000Z");
const isiAsli = () => ({
  "rtj-blok:/tahap-1/prd-v1/": JSON.stringify(["blok-mulai", "blok-coba"]),
  "rtj-blok:/tahap-1/transaction/": JSON.stringify(["blok-mulai"]),
  "bb1:selesai:/b-fondasi/b9-caching/": JSON.stringify({ waktu: "2026-10-01T08:00:00.000Z", judul: "B9 Caching" }),
  "bb1:kartu:A1-1": JSON.stringify({ k: 3, due: "2026-10-20" }),
  "rtj-peran": "mobile",
  "rtj-terakhir": JSON.stringify({ u: "/tahap-1/transaction/", j: "1.23 Transaction", n: 5 }),
  // Bukan progres: tidak ikut diekspor dan tidak disentuh impor.
  "starlight-theme": "light",
  "rtj-fokus": "ya",
  "rtj-toc": "buka",
  "bb1:fb:/b-fondasi/b9-caching/": JSON.stringify({ nilai: "pas", waktu: "2026-10-01T08:00:00.000Z", judul: "B9" }),
  "kunci-lain": "x",
});
const fileDari = (p: Peti) => JSON.stringify(ekspor(p, KINI).file);

describe("ekspor", () => {
  it("mengambil lima jenis kunci progres dan membuang kunci asing", () => {
    const { file, dilewati } = ekspor(new Peti(isiAsli()), KINI);
    expect(dilewati).toEqual([]);
    expect(file.format).toBe(FORMAT);
    expect(file.versi).toBe(1);
    expect(file.dibuat).toBe("2026-10-13T02:00:00.000Z");
    expect(file.blok).toEqual([
      { halaman: "/tahap-1/prd-v1/", selesai: ["blok-mulai", "blok-coba"] },
      { halaman: "/tahap-1/transaction/", selesai: ["blok-mulai"] },
    ]);
    expect(file.halamanSelesai).toEqual([{ halaman: "/b-fondasi/b9-caching/", waktu: "2026-10-01T08:00:00.000Z", judul: "B9 Caching" }]);
    expect(file.kartu).toEqual([{ id: "A1-1", kotak: 3, jadwal: "2026-10-20" }]);
    expect(file.jalur).toBe("mobile");
    expect(file.terakhir).toEqual({ halaman: "/tahap-1/transaction/", judul: "1.23 Transaction", blok: 5 });
    const teks = JSON.stringify(file);
    for (const asing of ["starlight-theme", "rtj-fokus", "rtj-toc", "bb1:fb", "kunci-lain", "nilai"]) expect(teks).not.toContain(asing);
  });

  it("menghitung entri rusak yang dilewati, tidak diam-diam membuangnya", () => {
    const p = new Peti({
      "rtj-blok:/a/": "bukan json",
      "rtj-blok:javascript:alert(1)": JSON.stringify(["blok-mulai"]),
      "bb1:kartu:A1-1": JSON.stringify({ k: 9, due: "2026-10-20" }),
      "rtj-peran": "admin",
      "rtj-terakhir": JSON.stringify({ u: "//situs-lain.example/", j: "x", n: 1 }),
      "bb1:kartu:A1-2": JSON.stringify({ k: 1, due: "2026-10-14" }),
    });
    const { file, dilewati } = ekspor(p, KINI);
    expect(dilewati).toEqual(["bb1:kartu:A1-1", "rtj-blok:/a/", "rtj-blok:javascript:alert(1)", "rtj-peran", "rtj-terakhir"]);
    expect(file.kartu).toEqual([{ id: "A1-2", kotak: 1, jadwal: "2026-10-14" }]);
    expect(file.jalur).toBeNull();
    expect(file.terakhir).toBeNull();
  });

  it("menamai file dengan tanggal lokal", () => {
    expect(namaFile(new Date(2026, 0, 5, 23, 59))).toBe("rekeningo-progres-2026-01-05.json");
  });
});

describe("bacaFile", () => {
  const sah = () => fileDari(new Peti(isiAsli()));

  it("menerima file hasil ekspor", () => {
    const h = bacaFile(sah(), sah().length);
    expect(h.ok).toBe(true);
    if (h.ok) expect(ringkas(h.file)).toEqual({ blok: 3, halaman: 2, selesai: 1, kartu: 1, jalur: "mobile", terakhir: "1.23 Transaction" });
  });

  it("menolak file yang bukan JSON, bukan file progres, atau terlalu besar", () => {
    expect(bacaFile("{rusak", 6)).toMatchObject({ ok: false, pesan: expect.stringContaining("bukan JSON") });
    expect(bacaFile(JSON.stringify([1, 2]), 5)).toMatchObject({ ok: false, pesan: expect.stringContaining("bukan file progres") });
    expect(bacaFile(JSON.stringify({ format: "lain", versi: 1 }), 30)).toMatchObject({ ok: false, pesan: expect.stringContaining("bukan file progres") });
    expect(bacaFile(sah(), BATAS_BYTE + 1)).toMatchObject({ ok: false, pesan: expect.stringContaining("terlalu besar") });
  });

  it("menolak versi yang tidak dikenal dengan menyebut versinya", () => {
    const f = { ...JSON.parse(sah()), versi: 2 };
    expect(bacaFile(JSON.stringify(f), 100)).toEqual({ ok: false, pesan: "File ini memakai format versi 2, sedangkan halaman ini membaca versi 1. Tidak ada yang diubah." });
  });

  it("menolak nilai yang tidak lolos skema dan menyebut letaknya", () => {
    const f = JSON.parse(sah());
    f.kartu[0].kotak = 6;
    expect(bacaFile(JSON.stringify(f), 100)).toEqual({ ok: false, pesan: 'File progres rusak di bagian "kartu.0.kotak". Tidak ada yang diubah.' });
    const g = JSON.parse(sah());
    g.terakhir.halaman = "javascript:alert(1)";
    expect(bacaFile(JSON.stringify(g), 100)).toMatchObject({ ok: false, pesan: expect.stringContaining("terakhir.halaman") });
    const h = JSON.parse(sah());
    h.kartu.push({ id: "__proto__", kotak: 1, jadwal: "2026-10-14" });
    expect(bacaFile(JSON.stringify(h), 100)).toMatchObject({ ok: false, pesan: expect.stringContaining("kartu.1.id") });
    const i = JSON.parse(sah());
    i.blok[0].selesai = ['blok-x"]'];
    expect(bacaFile(JSON.stringify(i), 100).ok).toBe(false);
    const j = JSON.parse(sah());
    j.kartu.push({ ...j.kartu[0] });
    expect(bacaFile(JSON.stringify(j), 100)).toMatchObject({ ok: false, pesan: expect.stringContaining('"kartu"') });
  });

  it("membuang field asing di file, sehingga tidak ada kunci asing yang ditulis", () => {
    const f = { ...JSON.parse(sah()), "starlight-theme": "light", "bb1:fb:/x/": { nilai: "berat" } };
    const h = bacaFile(JSON.stringify(f), 100);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    const p = new Peti();
    terapkan(p, h.file, "ganti");
    expect(kunciProgres(p).length).toBe(p.length);
    expect(p.getItem("starlight-theme")).toBeNull();
  });
});

describe("terapkan", () => {
  const baca = (teks: string) => { const h = bacaFile(teks, teks.length); if (!h.ok) throw new Error(h.pesan); return h.file; };

  it("ekspor, kosongkan, impor: progres kembali persis", () => {
    const asal = new Peti(isiAsli());
    const file = baca(fileDari(asal));
    const baru = new Peti({ "starlight-theme": "dark" });
    terapkan(baru, file, "ganti");
    for (const k of kunciProgres(asal)) expect(baru.getItem(k)).toBe(asal.getItem(k));
    expect(baru.getItem("starlight-theme")).toBe("dark");
  });

  it("gabung: blok dan halaman selesai digabung, kartu dan jalur di browser ini tetap, halaman terakhir dari file", () => {
    const file = baca(fileDari(new Peti(isiAsli())));
    const p = new Peti({
      "rtj-blok:/tahap-1/prd-v1/": JSON.stringify(["blok-paham"]),
      "bb1:selesai:/e-mobile/e2-offline-first/": JSON.stringify({ waktu: "2026-10-12T08:00:00.000Z", judul: "E2" }),
      "bb1:kartu:A1-1": JSON.stringify({ k: 1, due: "2026-10-14" }),
      "rtj-peran": "backend",
      "rtj-terakhir": JSON.stringify({ u: "/cara-pakai/", j: "Cara pakai", n: 0 }),
      "rtj-fokus": "ya",
    });
    terapkan(p, file, "gabung");
    expect(JSON.parse(p.getItem("rtj-blok:/tahap-1/prd-v1/")!)).toEqual(["blok-paham", "blok-mulai", "blok-coba"]);
    expect(p.getItem("rtj-blok:/tahap-1/transaction/")).toBe(JSON.stringify(["blok-mulai"]));
    expect(p.getItem("bb1:selesai:/e-mobile/e2-offline-first/")).not.toBeNull();
    expect(p.getItem("bb1:selesai:/b-fondasi/b9-caching/")).not.toBeNull();
    expect(JSON.parse(p.getItem("bb1:kartu:A1-1")!)).toEqual({ k: 1, due: "2026-10-14" });
    expect(p.getItem("rtj-peran")).toBe("backend");
    expect(JSON.parse(p.getItem("rtj-terakhir")!).u).toBe("/tahap-1/transaction/");
    expect(p.getItem("rtj-fokus")).toBe("ya");
  });

  it("ganti: progres lama hilang, pengaturan dan umpan balik tetap", () => {
    const file = baca(fileDari(new Peti({ "bb1:kartu:B2-1": JSON.stringify({ k: 2, due: "2026-10-15" }) })));
    const p = new Peti(isiAsli());
    terapkan(p, file, "ganti");
    expect(kunciProgres(p)).toEqual(["bb1:kartu:B2-1"]);
    for (const k of ["starlight-theme", "rtj-fokus", "rtj-toc", "bb1:fb:/b-fondasi/b9-caching/", "kunci-lain"]) expect(p.getItem(k)).not.toBeNull();
  });

  it("memulihkan isi lama bila penulisan gagal di tengah", () => {
    const file = baca(fileDari(new Peti(isiAsli())));
    const p = new Peti({ "bb1:kartu:B2-1": JSON.stringify({ k: 2, due: "2026-10-15" }), "rtj-peran": "web" });
    const sebelum = new Map(p.m);
    p.gagalSetelah = 2;
    expect(() => terapkan(p, file, "ganti")).toThrow(GagalSimpan);
    expect(p.m).toEqual(sebelum);
  });
});
