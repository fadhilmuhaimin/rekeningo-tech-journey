import { describe, expect, it } from "vitest";
import data from "../../../data/widget/t5-pooler-kalkulator.json";
import { DataKoneksi } from "./skema";
import { URUTAN, berubah, hitung, kasus, kesimpulan, sel, siapkan, titik } from "./logika";

const d = DataKoneksi.parse(data);
const semua = siapkan(d).map(hitung);

describe("kalkulator koneksi dan pooler: rumus", () => {
  it("skenario naskah: 6 × 3 × 10 = 180 koneksi, 100 − 3 = 97 tersedia, 83 ditolak tanpa pooler", () => {
    const h = semua[0]!;
    expect([h.potensi, h.tersedia, h.ditolakTanpa]).toEqual([180, 97, 83]);
  });
  it("dengan PgBouncer: 2 instance × min(30, 6 × 20) = 60 koneksi server, 60 ke PostgreSQL, 0 ditolak, 0 client di atas 400", () => {
    const h = semua[0]!;
    expect([h.serverMaks, h.keServer, h.ditolakDengan, h.maxClient, h.klienLebih]).toEqual([60, 60, 0, 400, 0]);
  });
  it("enam skenario dihitung ulang dengan aritmetika sendiri", () => {
    const m = d.masukan;
    const harap = [
      { pod: 3, pool: 10, maxDb: 30 },
      { pod: 5, pool: 10, maxDb: 30 },
      { pod: 8, pool: 10, maxDb: 30 },
      { pod: 3, pool: 5, maxDb: 30 },
      { pod: 5, pool: 5, maxDb: 30 },
      { pod: 3, pool: 10, maxDb: 0 },
    ];
    harap.forEach((x, i) => {
      const potensi = m.service * x.pod * x.pool;
      const server = x.maxDb > 0 ? m.instance * Math.min(x.maxDb, m.role * m.defaultPoolSize) : m.instance * m.role * m.defaultPoolSize;
      const h = semua[i]!;
      expect(h.potensi, `skenario ${i}`).toBe(potensi);
      expect(h.serverMaks, `skenario ${i}`).toBe(server);
      expect(h.keServer, `skenario ${i}`).toBe(Math.min(potensi, server));
      expect(h.ditolakTanpa, `skenario ${i}`).toBe(Math.max(0, potensi - 97));
      expect(h.ditolakDengan, `skenario ${i}`).toBe(Math.max(0, Math.min(potensi, server) - 97));
      expect(h.klienLebih, `skenario ${i}`).toBe(Math.max(0, potensi - 400));
    });
    expect(semua.map((h) => h.potensi)).toEqual([180, 300, 480, 90, 150, 180]);
    expect(semua.map((h) => h.keServer)).toEqual([60, 60, 60, 60, 60, 180]);
    expect(semua.map((h) => h.ditolakTanpa)).toEqual([83, 203, 383, 0, 53, 83]);
    expect(semua.map((h) => h.ditolakDengan)).toEqual([0, 0, 0, 0, 0, 83]);
    expect(semua.map((h) => h.klienLebih)).toEqual([0, 0, 80, 0, 0, 0]);
  });
  it("batas database yang kosong membuat 2 × 6 × 20 = 240 koneksi server, melewati 97 tersedia", () => {
    expect(semua[5]!.serverMaks).toBe(240);
    expect(semua[5]!.serverMaks).toBeGreaterThan(semua[5]!.tersedia);
  });
  it("batas database yang lebih besar dari 6 × 20 tidak menaikkan batas di atas default_pool_size × role", () => {
    const h = hitung({ ...d.masukan, maxDbPerInstance: 500 });
    expect(h.serverMaks).toBe(2 * 6 * 20);
  });
  it("dua baris yang tidak berlaku tanpa pooler adalah null, bukan nol", () => {
    expect(sel(semua[0]!, "batasKlien")).toEqual([null, 400]);
    expect(sel(semua[0]!, "klienLebih")).toEqual([null, 0]);
    expect(sel(semua[0]!, "keServer")).toEqual([180, 60]);
  });
});

describe("kalimat kesimpulan", () => {
  it("kasus tiap skenario: pooler, pooler, klienLewat, muatTanpa, pooler, serverLewat", () => {
    expect(semua.map(kasus)).toEqual(["pooler", "pooler", "klienLewat", "muatTanpa", "pooler", "serverLewat"]);
  });
  it("kalimat tiap skenario, kata demi kata", () => {
    expect(semua.map((h) => kesimpulan(d.label.kesimpulan, h))).toEqual([
      "Tanpa pooler paling sedikit 83 dari 180 koneksi ditolak 53300. Dengan PgBouncer paling banyak 60 koneksi sampai ke PostgreSQL, di bawah 97 tersedia.",
      "Tanpa pooler paling sedikit 203 dari 300 koneksi ditolak 53300. Dengan PgBouncer paling banyak 60 koneksi sampai ke PostgreSQL, di bawah 97 tersedia.",
      "480 koneksi pod melewati max_client_conn 400 satu instance: 80 client di atas batas bila instance lain mati.",
      "90 koneksi muat di 97 yang tersedia, jadi tanpa pooler tidak ada galat 53300 pada angka ini.",
      "Tanpa pooler paling sedikit 53 dari 150 koneksi ditolak 53300. Dengan PgBouncer paling banyak 60 koneksi sampai ke PostgreSQL, di bawah 97 tersedia.",
      "Kedua instance boleh membuka 240 koneksi ke PostgreSQL, jadi sampai 180 sekaligus: paling sedikit 83 tetap ditolak 53300 walau ada pooler.",
    ]);
  });
  it("templat dengan isian yang tidak dikenal gagal keras", () => {
    expect(() => kesimpulan({ ...d.label.kesimpulan, pooler: "{asing}" }, semua[0]!)).toThrow(/asing/);
  });
});

describe("tebakan dan skenario di data", () => {
  it("skenario dan urutannya sama dengan yang dipakai halaman: enam, awal 0, pembuka jawaban di skenario terakhir", () => {
    expect(d.skenario.map((s) => s.label)).toEqual([
      "Naskah: 6 service × 3 pod",
      "5 pod tiap service",
      "8 pod tiap service",
      "Pool tiap pod 5, 3 pod",
      "Pool tiap pod 5, 5 pod",
      "Enam role, batas database kosong",
    ]);
    expect(d.awal).toBe(0);
    expect(d.tebak.skenario).toBe(5);
  });
  it("jawaban tebakan diturunkan dari hitungan: 240 koneksi di posisi ketiga, bukan yang terpendek maupun terpanjang", () => {
    const benar = d.tebak.pilihan[d.tebak.jawaban]!;
    expect(d.tebak.jawaban).toBe(2);
    expect(benar).toBe(`${titik(semua[d.tebak.skenario]!.serverMaks)} koneksi`);
    const lain = d.tebak.pilihan.filter((_, i) => i !== d.tebak.jawaban);
    expect(lain.some((p) => p.length > benar.length)).toBe(true);
    expect(lain.some((p) => p.length < benar.length)).toBe(true);
  });
  it("tiga pilihan salah adalah angka yang pembaca kenal: 20 (lab), 60 (ADR), 97 (tersedia)", () => {
    const angka = d.tebak.pilihan.map((p) => Number(p.match(/^\d+/)![0]));
    expect(angka).toEqual([20, semua[0]!.serverMaks, 240, semua[0]!.tersedia]);
    expect(angka[0]).toBe(d.masukan.defaultPoolSize);
  });
  it("alasan tebakan memuat hitungan 6 × 20 × 2 = 240 dan 97", () => {
    expect(d.tebak.alasan).toContain("Enam role × 20 × dua instance = 240");
    expect(d.tebak.alasan).toContain("97 tersedia");
  });
  it("skenario yang membuka jawaban bukan skenario awal, dan tebakan tidak dijawab di pertanyaan", () => {
    expect(d.tebak.skenario).not.toBe(d.awal);
    expect(d.tebak.q).not.toMatch(/240/);
    expect(d.tebak.q).toContain("max_db_connections tidak diisi");
  });
  it("tiap skenario mengubah paling sedikit satu baris dari skenario sebelumnya", () => {
    for (let i = 1; i < semua.length; i++) expect(berubah(semua[i - 1]!, semua[i]!).length, `skenario ${i}`).toBeGreaterThan(0);
    expect(berubah(semua[0]!, semua[0]!)).toEqual([]);
    expect(URUTAN).toHaveLength(6);
  });
});

describe("skema", () => {
  it("menolak kunci asing, cadangan yang melewati max_connections, dan awal di luar skenario", () => {
    expect(() => DataKoneksi.parse({ ...data, asing: 1 })).toThrow();
    expect(() => DataKoneksi.parse({ ...data, masukan: { ...data.masukan, cadangan: 100 } })).toThrow(/cadangan/);
    expect(() => DataKoneksi.parse({ ...data, awal: 9 })).toThrow(/di luar skenario/);
    expect(() => DataKoneksi.parse({ ...data, tebak: { ...data.tebak, skenario: 0 } })).toThrow(/dibuka dengan mengubah/);
  });
  it("titik ribuan", () => {
    expect([titik(0), titik(999), titik(1000), titik(1234567)]).toEqual(["0", "999", "1.000", "1.234.567"]);
  });
});
