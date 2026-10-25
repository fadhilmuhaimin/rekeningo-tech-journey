// Tes logika widget pool dan Little's Law (W3-pool, keputusan 980). Simulasi dicocokkan dengan angka rekaman lab t3-pool
// (m18.txt, little.txt, adr22.txt) yang dibaca lewat rekaman.ts; rumus L = λ × W dicocokkan dengan simulasi di seluruh
// kombinasi pengaturan tanpa antrean. Model yang salah arah, jadwal yang bergeser, atau rekaman yang berubah menggagalkan tes.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  HORIZON, cariAcuan, caraW, deret, detikTeks, indeksBenar, isi, keadaanPada, koma, lTeks, lamaTahan, littleL, puncakRumus,
  periksaMasukan, ringkas, samaParam, simulasi, terpakaiPada, vonis, waktuPenuhRumus, wTeks, type Param,
} from "./logika";
import { aturanDari, awalDari, bacaRekaman, daftarAcuan } from "./rekaman";

const DIR = path.resolve(__dirname, "../../../../labs/t3-pool/output");
const baca = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const R = bacaRekaman(baca("m18.txt"), baca("little.txt"), baca("adr22.txt"));
const A = aturanDari(R);
const awal = awalDari(R);
const jalan = (p: Param) => {
  const j = simulasi(p, A);
  return { j, r: ringkas(j, p, A) };
};

describe("rekaman: konstanta dan titik", () => {
  test("beban: 17,4 request per detik, tiap request ke-20, λ = 0,87, W di luar push 20 ms (Asumsi), batas lab 50 ms", () => {
    expect(R.beban).toEqual({ lambda: 0.87, rpsTotal: 17.4, tiap: 20, w0: 0.02, batasWMs: 50 });
    expect(A).toEqual({ lambda: 0.87, w0: 0.02, timeoutPush: 3, idleTx: 5 });
  });
  test("pool penuh A dan B, client menyerah C, pengaman D, E, F", () => {
    expect([R.a.ukuran, R.a.dari, R.a.sampai, R.a.hitungan]).toEqual([10, 11, 12, 11.5]);
    expect([R.b.ukuran, R.b.dari, R.b.sampai, R.b.hitungan]).toEqual([50, 57, 58, 57.5]);
    expect(R.c).toEqual({ menyerah: 5, puncak: 5, ukuran: 10 });
    expect(R.d).toEqual({ timeoutPush: 3, puncak: 3, ukuran: 10, keduaLebihDari: 5 });
    expect(R.e).toEqual({ idleTx: 5, puncakPg: 5, dipakai: 10, maks: 10 });
    expect(R.f).toEqual({ bayar201: 26, terbukaMaks: 1 });
  });
  test("Little: t = 0,3, 2, 10 detik, L tiga desimal dan paling banyak terukur", () => {
    expect(R.little).toEqual([
      { t: 0.3, L: 0.278, paling: 1, ukuran: 10 },
      { t: 2, L: 1.757, paling: 2, ukuran: 10 },
      { t: 10, L: 8.717, paling: 9, ukuran: 10 },
    ]);
  });
});

describe("simulasi lawan rekaman m18.txt", () => {
  test("A: pool 10 penuh antara detik ke-11 dan ke-12, dan 10 ÷ 0,87 = 11,5", () => {
    const { r } = jalan(awal);
    expect(r.waktuPenuh).toBeCloseTo(10 / 0.87, 9);
    expect(Math.floor(r.waktuPenuh!)).toBe(R.a.dari);
    expect(Math.floor(r.waktuPenuh!) + 1).toBe(R.a.sampai);
    expect(Number(r.waktuPenuh!.toFixed(1))).toBe(R.a.hitungan);
    expect(vonis(r)).toBe("penuh");
  });
  test("A: sesudah 30 detik 26 pembayaran masuk, 10 menggantung, 16 menunggu", () => {
    const { j } = jalan(awal);
    const k = keadaanPada(j, R.a.detik, A);
    expect([k.dikirim, k.terpakai, k.menunggu]).toEqual([R.a.dikirim, R.a.menggantung, R.a.menunggu]);
    expect([k.dikirim, k.terpakai, k.menunggu]).toEqual([26, 10, 16]);
  });
  test("B: pool 50 penuh antara detik ke-57 dan ke-58; sesudah 62 detik 53 masuk, 50 menggantung, 3 menunggu", () => {
    const { j, r } = jalan({ ...awal, n: 50 });
    expect(Math.floor(r.waktuPenuh!)).toBe(R.b.dari);
    expect(Math.floor(r.waktuPenuh!) + 1).toBe(R.b.sampai);
    expect(Number(r.waktuPenuh!.toFixed(1))).toBe(R.b.hitungan);
    // rekaman mengamati pada 61,6 detik; pembayaran ke-54 baru datang pada 62,07, jadi detik 62 sama keadaannya.
    const k = keadaanPada(j, 61.6, A);
    expect([k.dikirim, k.terpakai, k.menunggu]).toEqual([R.b.dikirim, R.b.menggantung, R.b.menunggu]);
    expect([k.dikirim, k.terpakai, k.menunggu]).toEqual([53, 50, 3]);
    expect(keadaanPada(j, HORIZON, A)).toMatchObject({ dikirim: 53, terpakai: 50, menunggu: 3 });
  });
  test("C: client menyerah sesudah 5 detik: koneksi terpakai paling banyak 5, pool tidak penuh, tidak ada antrean", () => {
    const { r } = jalan({ ...awal, tClient: R.c.menyerah });
    expect(r.puncak).toBe(R.c.puncak);
    expect(r.puncak).toBe(Math.ceil(0.87 * 5));
    expect(vonis(r)).toBe("muat");
    expect(r.antreMulai).toBeNull();
  });
  test("A, pembacaan: sesudah penuh semua koneksi dipegang pembayaran, jadi pembacaan menunggu", () => {
    const { j } = jalan(awal);
    for (const x of [12, 20, 30, 62]) expect(terpakaiPada(j, x)).toBe(10);
    expect(terpakaiPada(j, 11)).toBe(9);
  });
});

describe("simulasi lawan rekaman little.txt dan adr22.txt", () => {
  test.each(R.little.map((l) => [l.t, l.L, l.paling] as const))("t = %s detik: L dihitung %s, paling banyak %s", (t, L, paling) => {
    const p = { ...awal, t };
    expect(Number(littleL(p, A).toFixed(3))).toBe(L);
    const { r } = jalan(p);
    expect(r.puncak).toBe(paling);
    expect(vonis(r)).toBe("muat");
  });
  test("ringkasan Little: 30 detik memberi L = 26,117 dan melewati pool 10", () => {
    expect(Number(littleL({ ...awal, t: 30 }, A).toFixed(3))).toBe(26.117);
    expect(vonis(jalan({ ...awal, t: 30 }).r)).toBe("penuh");
  });
  test("D: timeout push 3 detik di dalam transaction: paling banyak 3 koneksi", () => {
    const { r } = jalan({ ...awal, pengaman: "timeout-push" });
    expect(r.puncak).toBe(R.d.puncak);
    expect(vonis(r)).toBe("muat");
  });
  test("E: idle_in_transaction_session_timeout tidak mengubah slot pool, sesi PostgreSQL paling banyak 5", () => {
    const e = jalan({ ...awal, pengaman: "idle-tx" });
    const a = jalan(awal);
    expect(e.j).toEqual(a.j);
    expect(e.r.waktuPenuh).toBe(a.r.waktuPenuh);
    expect(e.r.puncakPg).toBe(R.e.puncakPg);
    expect(keadaanPada(e.j, 30, A).terpakai).toBe(R.e.dipakai);
    expect(keadaanPada(e.j, 30, A).pg).toBeLessThan(R.e.dipakai);
  });
  test("F: push di luar transaction: transaction terbuka paling banyak 1", () => {
    const { r } = jalan({ ...awal, pengaman: "di-luar" });
    expect(r.puncak).toBe(R.f.terbukaMaks);
    expect(vonis(r)).toBe("muat");
  });
});

describe("rumus lawan simulasi", () => {
  const nilaiN = [4, 10, 50];
  const nilaiT = [0.3, 2, 10, 30, null];
  const nilaiC = [null, 30, 10, 5];
  const pengaman = ["tidak", "timeout-push", "idle-tx", "di-luar"] as const;
  const semua: Param[] = nilaiN.flatMap((n) => nilaiT.flatMap((t) => nilaiC.flatMap((tClient) => pengaman.map((p) => ({ n, t, tClient, pengaman: p })))));

  test("waktu penuh: n ÷ λ bila L > n − 1, selain itu tidak pernah (tiap kombinasi yang penuhnya terjadi dalam horizon)", () => {
    let diperiksa = 0;
    for (const p of semua) {
      const rumus = waktuPenuhRumus(p, A);
      const { r } = jalan(p);
      if (rumus === null) expect(r.waktuPenuh, JSON.stringify(p)).toBeNull();
      else {
        expect(r.waktuPenuh, JSON.stringify(p)).toBeCloseTo(rumus, 9);
        diperiksa++;
      }
    }
    expect(diperiksa).toBeGreaterThan(30);
  });
  test("puncak: ⌈L⌉ paling besar n, di seluruh kombinasi", () => {
    for (const p of semua) expect(jalan(p).r.puncak, JSON.stringify(p)).toBe(puncakRumus(p, A));
  });
  test("tanpa antrean bila L ≤ n; ada antrean bila L > n (client menyerah mengubah W, jadi L-nya ikut)", () => {
    for (const p of semua) {
      const { r } = jalan(p);
      const L = littleL(p, A);
      if (L > p.n + 1e-9) expect(r.antreMulai, JSON.stringify(p)).not.toBeNull();
      if (L <= p.n - 1 + 1e-9) expect(r.antreMulai, JSON.stringify(p)).toBeNull();
    }
  });
  test("koneksi terpakai tidak pernah melebihi n dan menunggu tidak pernah negatif", () => {
    for (const p of semua) {
      const j = simulasi(p, A);
      for (let x = 0; x <= HORIZON; x += 0.5) {
        expect(terpakaiPada(j, x)).toBeLessThanOrEqual(p.n);
        expect(keadaanPada(j, x, A).menunggu).toBeGreaterThanOrEqual(0);
      }
    }
  });
  test("pool 50 menunda tetapi tidak menolong layanan yang tidak pernah menjawab; menolong push 30 detik", () => {
    expect(vonis(jalan({ ...awal, n: 50 }).r)).toBe("penuh");
    expect(vonis(jalan({ ...awal, n: 50, t: 30 }).r)).toBe("muat");
    expect(vonis(jalan({ ...awal, n: 10, t: 30 }).r)).toBe("penuh");
  });
  test("pool 4 penuh pada 4 ÷ 0,87 = 4,6 detik (R3-33)", () => {
    expect(Number(jalan({ ...awal, n: 4 }).r.waktuPenuh!.toFixed(1))).toBe(4.6);
  });
  test("client yang menyerah melepas koneksinya: pool 4 dengan T = 5 penuh (L 4,35 lebih dari 4) tetapi antrean pendek", () => {
    const p = { ...awal, n: 4, tClient: 5 };
    const { j, r } = jalan(p);
    expect(vonis(r)).toBe("penuh");
    // Tiap koneksi kembali pada datang + T, jadi tiap pembayaran mulai sebelum clientnya pergi dan menunggu kurang dari 1 detik.
    expect(j.every((b) => b.mulai < b.pergi && b.mulai - b.datang < 1)).toBe(true);
    const k = keadaanPada(j, HORIZON, A);
    expect(k.terpakai).toBe(4);
    expect(k.menunggu).toBeLessThanOrEqual(1);
    expect(k.menyerah).toBeGreaterThan(40);
  });
  test("tanpa client yang menyerah antrean tumbuh terus; dengan push 30 detik pool 10 juga", () => {
    const a = keadaanPada(simulasi(awal, A), HORIZON, A);
    expect(a.menunggu).toBe(43);
    const b = keadaanPada(simulasi({ ...awal, t: 30 }, A), HORIZON, A);
    expect(b.menunggu).toBeGreaterThan(20);
    expect(b.terpakai).toBe(10);
  });
  test("deret: satu batang per detik 0..62, naik sampai n pada pengaturan awal", () => {
    const d = deret(simulasi(awal, A));
    expect(d).toHaveLength(HORIZON + 1);
    expect(d[0]).toBe(0);
    expect(d[11]).toBe(9);
    expect(d[12]).toBe(10);
    expect(Math.max(...d)).toBe(10);
  });
  test("simulasi deterministik: dua kali jalan sama persis", () => {
    for (const p of semua.slice(0, 20)) expect(simulasi(p, A)).toEqual(simulasi(p, A));
  });
});

describe("teks dan acuan", () => {
  test("pengaturan awal dan daftar acuan: sembilan titik, tanpa kembar", () => {
    const d = daftarAcuan(R);
    expect(d.map((x) => x.kunci)).toEqual(["A", "B", "C", "D", "E", "F", "L03", "L2", "L10"]);
    for (const x of d) expect(cariAcuan(x.param, d)).toBe(x.kunci);
    expect(d.filter((x, i) => d.findIndex((y) => samaParam(y.param, x.param)) !== i)).toEqual([]);
    expect(cariAcuan({ ...awal, n: 4 }, d)).toBeNull();
    expect(cariAcuan({ ...awal, t: 30 }, d)).toBeNull();
  });
  test("W dan L dalam teks: koma, tanpa nol di belakang, tak terhingga", () => {
    expect(wTeks({ ...awal, t: 2 }, A)).toBe("2,02");
    expect(wTeks({ ...awal, t: 10 }, A)).toBe("10,02");
    expect(wTeks({ ...awal, tClient: 5 }, A)).toBe("5");
    expect(wTeks(awal, A)).toBe("tak terhingga");
    expect(wTeks({ ...awal, pengaman: "di-luar" }, A)).toBe("0,02");
    expect(lTeks(littleL({ ...awal, t: 2 }, A))).toBe("1,757");
    expect(lTeks(littleL(awal, A))).toBe("tak terhingga");
    expect(caraW({ ...awal, t: 2 }, A)).toBe("0,02 + 2");
    expect(caraW({ ...awal, pengaman: "timeout-push", tClient: 5 }, A)).toBe("min(0,02 + min(∞, 3), 5)");
    expect(lamaTahan({ ...awal, pengaman: "timeout-push" }, A)).toBeCloseTo(3.02, 9);
    expect(detikTeks(0.3)).toBe("0,3");
    expect(detikTeks(10)).toBe("10");
    expect(koma(11.494, 1)).toBe("11,5");
  });
  test("isi gagal keras bila templat memakai nama yang tidak diisi", () => {
    expect(isi("a {x} b", { x: 3 })).toBe("a 3 b");
    expect(() => isi("a {y}", { x: 3 })).toThrow(/\{y\}/);
  });
  test("indeksBenar: tepat satu pilihan di antara detik ke-11 dan ke-12", () => {
    const pilihan = [{ teks: "a", detik: null }, { teks: "b", detik: 3 }, { teks: "c", detik: 12 }, { teks: "d", detik: 58 }];
    expect(indeksBenar(pilihan, R.a.dari, R.a.sampai)).toBe(2);
    expect(() => indeksBenar([pilihan[0]!, pilihan[1]!], R.a.dari, R.a.sampai)).toThrow(/0 pilihan/);
    expect(() => indeksBenar([...pilihan, { teks: "e", detik: 11 }], R.a.dari, R.a.sampai)).toThrow(/2 pilihan/);
  });
});

describe("batas penuh: W lawan (n − 1) ÷ λ (tinjauan, keputusan 982)", () => {
  // Pembayaran ke-n datang (n − 1) ÷ λ sesudah yang pertama. Pool penuh pada n ÷ λ bila koneksi pertama masih dipegang saat itu,
  // yaitu bila W > (n − 1) ÷ λ = 10,34 detik untuk pool 10, bukan bila W > n ÷ λ = 11,49 detik. Tombol widget tidak punya nilai di
  // antara keduanya, jadi tanpa tes ini ambang yang salah (L > n) tidak terdeteksi.
  const batas = (10 - 1) / A.lambda;
  test("client menyerah tepat di bawah batas: pool 10 tidak pernah penuh; tepat di atasnya penuh pada 10 ÷ λ tanpa antrean", () => {
    const bawah = jalan({ ...awal, tClient: Math.floor(batas * 10) / 10 }); // 10,3
    expect(bawah.r.waktuPenuh).toBeNull();
    expect(vonis(bawah.r)).toBe("muat");
    expect(waktuPenuhRumus({ ...awal, tClient: 10.3 }, A)).toBeNull();
    const atas = jalan({ ...awal, tClient: Math.ceil(batas * 10) / 10 }); // 10,4: kurang dari 11,49 detik, tetapi pool sempat penuh
    expect(atas.r.waktuPenuh).toBeCloseTo(10 / A.lambda, 9);
    expect(waktuPenuhRumus({ ...awal, tClient: 10.4 }, A)).toBeCloseTo(10 / A.lambda, 9);
    expect(vonis(atas.r)).toBe("sempat");
    expect(atas.r.antreMulai).toBeNull();
    expect(littleL({ ...awal, tClient: 10.4 }, A)).toBeLessThan(10); // L di antara n − 1 dan n
  });
  test("di atas n ÷ λ pool penuh dan pembayaran menunggu", () => {
    const { r } = jalan({ ...awal, tClient: 12 });
    expect(vonis(r)).toBe("penuh");
    expect(r.waktuPenuh).toBeCloseTo(10 / A.lambda, 9);
  });
});

describe("masukan yang tidak masuk akal gagal keras", () => {
  test("pool 0, λ nol atau negatif atau NaN, W0 negatif, lama push negatif, client 0, horizon negatif", () => {
    expect(() => simulasi({ ...awal, n: 0 }, A)).toThrow(/ukuran pool/);
    expect(() => simulasi({ ...awal, n: 2.5 }, A)).toThrow(/ukuran pool/);
    expect(() => simulasi(awal, { ...A, lambda: 0 })).toThrow(/λ/);
    expect(() => simulasi(awal, { ...A, lambda: -1 })).toThrow(/λ/); // dulu loop tanpa akhir
    expect(() => simulasi(awal, { ...A, lambda: NaN })).toThrow(/λ/);
    expect(() => simulasi(awal, { ...A, w0: -1 })).toThrow(/W di luar push/);
    expect(() => simulasi({ ...awal, t: -1 }, A)).toThrow(/lama push/);
    expect(() => simulasi({ ...awal, tClient: 0 }, A)).toThrow(/client menyerah/);
    expect(() => simulasi(awal, A, -1)).toThrow(/horizon/);
    expect(() => periksaMasukan(awal, A, HORIZON)).not.toThrow();
  });
  test("W sangat besar tidak menggantung: pool tetap n koneksi dan antrean tumbuh", () => {
    const j = simulasi({ ...awal, t: 1e12 }, A);
    expect(keadaanPada(j, HORIZON, A).terpakai).toBe(10);
    expect(j.length).toBe(Math.floor(HORIZON * A.lambda + 1e-9));
  });
});
