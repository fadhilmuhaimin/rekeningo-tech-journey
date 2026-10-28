// Tes mesin keadaan breaker (W4-breaker, keputusan 1262): jam diperankan, tanpa jam sungguhan. Perilaku yang dites sama
// dengan yang direkam labs/t4-integrasi/output/breaker.txt (acuan.test.ts membandingkan keduanya dengan rekamannya).
import { describe, expect, it } from "vitest";
import { Breaker, acak } from "./breaker";

const BAWAAN = { gagalLebihDari: 5, bukaDetik: 60, maksHalfOpen: 1 };
/** Satu permintaan penuh: sebelum, lalu sesudah di waktu yang sama. */
function panggil(b: Breaker, now: number, berhasil: boolean): "ditolak" | "jalan" {
  const izin = b.sebelum(now);
  if (!izin.ok) return "ditolak";
  b.sesudah(izin.generasi, berhasil, now);
  return "jalan";
}
const gagalkan = (b: Breaker, n: number, now = 0) => { for (let i = 0; i < n; i++) panggil(b, now, false); };

describe("closed: gagal berturut-turut lebih dari 5 membuka", () => {
  it("lima gagal masih closed dan hitungannya naik, yang keenam membuka", () => {
    const b = new Breaker(BAWAAN);
    for (let i = 1; i <= 5; i++) {
      panggil(b, 0, false);
      expect(b.keadaan(0)).toBe("closed");
      expect(b.gagalBerturut).toBe(i);
    }
    panggil(b, 0, false);
    expect(b.keadaan(0)).toBe("open");
    expect(b.kaliBuka).toBe(1);
  });
  it("satu sukses di antaranya mengembalikan hitungan ke nol", () => {
    const b = new Breaker(BAWAAN);
    gagalkan(b, 5);
    panggil(b, 0, true);
    expect(b.gagalBerturut).toBe(0);
    gagalkan(b, 5);
    expect(b.keadaan(0)).toBe("closed");
    gagalkan(b, 1);
    expect(b.keadaan(0)).toBe("open");
  });
  it("ambang mengikuti pengaturan: lebih dari 2 membuka pada gagal ketiga, lebih dari 0 pada yang pertama", () => {
    const b2 = new Breaker({ ...BAWAAN, gagalLebihDari: 2 });
    gagalkan(b2, 2);
    expect(b2.keadaan(0)).toBe("closed");
    gagalkan(b2, 1);
    expect(b2.keadaan(0)).toBe("open");
    const b0 = new Breaker({ ...BAWAAN, gagalLebihDari: 0 });
    gagalkan(b0, 1);
    expect(b0.keadaan(0)).toBe("open");
  });
});

describe("open: menolak tanpa memanggil vendor, half-open sesudah Timeout", () => {
  it("permintaan saat open ditolak dengan sebab open dan tidak dihitung", () => {
    const b = new Breaker(BAWAAN);
    gagalkan(b, 6);
    expect(b.sebelum(1)).toEqual({ ok: false, sebab: "open" });
    expect(b.perpindahan).toEqual([{ detik: 0, dari: "closed", ke: "open" }]);
  });
  it("59,999 detik masih open, 60,001 detik half-open, tepat 60 detik masih open (strict, seperti pustaka)", () => {
    const b = new Breaker(BAWAAN);
    gagalkan(b, 6, 10);
    expect(b.keadaan(10 + 59.999)).toBe("open");
    expect(b.keadaan(70)).toBe("open");
    expect(b.keadaan(70.001)).toBe("half-open");
    expect(b.perpindahan.at(-1)).toEqual({ detik: 70.001, dari: "open", ke: "half-open" });
  });
  it("lama open mengikuti pengaturan, bukan angka tetap", () => {
    const b = new Breaker({ ...BAWAAN, bukaDetik: 3 });
    gagalkan(b, 6);
    expect(b.keadaan(3)).toBe("open");
    expect(b.keadaan(3.5)).toBe("half-open");
  });
});

describe("half-open: satu permintaan percobaan", () => {
  function setengah(): Breaker {
    const b = new Breaker(BAWAAN);
    gagalkan(b, 6);
    expect(b.keadaan(61)).toBe("half-open");
    return b;
  }
  it("permintaan pertama berjalan, yang kedua ditolak terlalu banyak", () => {
    const b = setengah();
    const pertama = b.sebelum(61);
    expect(pertama.ok).toBe(true);
    expect(b.sebelum(61)).toEqual({ ok: false, sebab: "terlalu-banyak" });
  });
  it("sukses menutup dan hitungan gagal kembali nol", () => {
    const b = setengah();
    expect(panggil(b, 61, true)).toBe("jalan");
    expect(b.keadaan(61)).toBe("closed");
    expect(b.gagalBerturut).toBe(0);
    gagalkan(b, 5, 62);
    expect(b.keadaan(62)).toBe("closed");
  });
  it("gagal membuka lagi selama 60 detik penuh", () => {
    const b = setengah();
    panggil(b, 61, false);
    expect(b.keadaan(61)).toBe("open");
    expect(b.keadaan(61 + 59)).toBe("open");
    expect(b.keadaan(61 + 61)).toBe("half-open");
    expect(b.kaliBuka).toBe(2);
  });
  it("lebih dari satu permintaan percobaan bila MaxRequests lebih dari satu: semuanya harus sukses", () => {
    const b = new Breaker({ ...BAWAAN, maksHalfOpen: 2 });
    gagalkan(b, 6);
    const a1 = b.sebelum(61);
    const a2 = b.sebelum(61);
    expect(a1.ok && a2.ok).toBe(true);
    expect(b.sebelum(61)).toEqual({ ok: false, sebab: "terlalu-banyak" });
    if (a1.ok) b.sesudah(a1.generasi, true, 61);
    expect(b.keadaan(61)).toBe("half-open");
    if (a2.ok) b.sesudah(a2.generasi, true, 61);
    expect(b.keadaan(61)).toBe("closed");
  });
});

describe("generasi dan masukan", () => {
  it("hasil dari generasi lama diabaikan: permintaan yang berangkat sebelum breaker membuka tidak mengubah apa-apa", () => {
    const b = new Breaker(BAWAAN);
    const lama = b.sebelum(0);
    gagalkan(b, 6);
    expect(b.keadaan(1)).toBe("open");
    if (lama.ok) b.sesudah(lama.generasi, true, 2);
    expect(b.keadaan(2)).toBe("open");
    expect(b.perpindahan).toHaveLength(1);
  });
  it("hasil lama yang tiba di half-open atau closed berikutnya diabaikan dan tidak menutup breaker", () => {
    const b = new Breaker(BAWAAN);
    const lama = b.sebelum(0);
    gagalkan(b, 6);
    expect(b.keadaan(61)).toBe("half-open");
    if (lama.ok) b.sesudah(lama.generasi, true, 61);
    expect(b.keadaan(61)).toBe("half-open");
    const percobaan = b.sebelum(61);
    if (percobaan.ok) b.sesudah(percobaan.generasi, true, 62);
    expect(b.keadaan(62)).toBe("closed");
    if (lama.ok) b.sesudah(lama.generasi, false, 63);
    expect(b.gagalBerturut).toBe(0);
    expect(b.keadaan(63)).toBe("closed");
  });
  it("hitungan menyala dari nol di tiap generasi: sesudah membuka gagal berturut-turut 0, dan sukses beruntun half-open dimulai dari nol", () => {
    const b = new Breaker({ ...BAWAAN, maksHalfOpen: 2 });
    gagalkan(b, 6);
    expect(b.gagalBerturut).toBe(0);
    expect(b.keadaan(61)).toBe("half-open");
    const a1 = b.sebelum(61), a2 = b.sebelum(61);
    if (a1.ok) b.sesudah(a1.generasi, true, 61);
    if (a2.ok) b.sesudah(a2.generasi, false, 61);
    expect(b.keadaan(61)).toBe("open");
    expect(b.keadaan(122)).toBe("half-open");
    const c1 = b.sebelum(122);
    if (c1.ok) b.sesudah(c1.generasi, true, 122);
    expect(b.keadaan(122)).toBe("half-open");
  });
  it("pengaturan yang tidak masuk akal gagal keras", () => {
    for (const salah of [{ gagalLebihDari: -1 }, { gagalLebihDari: 1.5 }, { bukaDetik: 0 }, { bukaDetik: NaN }, { maksHalfOpen: 0 }, { maksHalfOpen: 1.2 }]) {
      expect(() => new Breaker({ ...BAWAAN, ...salah })).toThrow(/pengaturan tidak masuk akal/);
    }
  });
});

describe("acak: deterministik dan di [0, 1)", () => {
  it("sama masukan sama keluaran, benih atau kunci beda memberi nilai beda", () => {
    expect(acak(7, 3)).toBe(acak(7, 3));
    expect(acak(7, 3)).not.toBe(acak(8, 3));
    expect(acak(7, 3)).not.toBe(acak(7, 4));
  });
  it("semua nilai di [0, 1) dan sebarannya masuk akal untuk error rate", () => {
    let di = 0;
    for (let k = 0; k < 2000; k++) {
      const u = acak(7, k);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      if (u < 0.3) di++;
    }
    expect(di).toBeGreaterThan(500);
    expect(di).toBeLessThan(700);
  });
});
