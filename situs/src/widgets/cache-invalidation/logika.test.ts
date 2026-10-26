// Tes logika murni widget cache dan invalidation (W3-cache, keputusan 986). Angka di sini adalah angka contoh model
// (bukan rekaman); kecocokan dengan rekaman dijaga acuan.test.ts. Uji mutasi: tiap aturan sebab() dan selangBasi() punya
// tes sendiri, jadi mengubah satu cabang membuat satu tes gagal.
import { describe, expect, it } from "vitest";
import {
  HORIZON, JENIS_CACHE, KEJADIAN, URUTAN, bacaKunci, cariAcuan, caraLama, database, detikTeks, indeksBenar, isi, isiTeks, jumlahBasi,
  koma, lamaBasi, lihat, littleTanpa, pengamat, periksaMasukan, ringkas, rupiah, samaAcuan, sebab, selangBasi, waktuUbah,
  type AcuanDef, type Aturan, type Param,
} from "./logika";

const A: Aturan = { hargaAwal: 25000, hargaBaru: { promo: 22500, harga: 28000, "promo-nanti": 22500 }, stokAwal: 50, stokBaru: 49, promoMulai: 3, lambda: 5.21, w: 0.005, pool: 10 };
const P = (o: Partial<Param> = {}): Param => ({ cache: "memori", instance: 2, ttl: 300, kejadian: "promo", urutan: "sesudah", ...o });

describe("cache memori di dua instance (M23)", () => {
  it("instance A membuang entrinya sendiri, instance B tidak diberi tahu", () => {
    expect(sebab(P(), A, 0)).toBe("dihapus-sendiri");
    expect(sebab(P(), A, 1)).toBe("tidak-diberi-tahu");
    expect(selangBasi(P(), A, 0)).toBeNull();
    expect(selangBasi(P(), A, 1)).toEqual({ dari: 0, sampai: 300 });
  });
  it("B melihat harga lama sampai satu detik sebelum TTL, lalu harga baru", () => {
    expect(lihat(P(), A, 1, 0)).toEqual({ isi: { harga: 25000, stok: 50 }, basi: true });
    expect(lihat(P(), A, 1, 299)).toEqual({ isi: { harga: 25000, stok: 50 }, basi: true });
    expect(lihat(P(), A, 1, 300)).toEqual({ isi: { harga: 22500, stok: 50 }, basi: false });
    expect(lihat(P(), A, 1, HORIZON).basi).toBe(false);
  });
  it("A langsung melihat harga baru", () => {
    expect(lihat(P(), A, 0, 0)).toEqual({ isi: { harga: 22500, stok: 50 }, basi: false });
  });
  it("satu instance saja: tidak ada yang basi, M23 tidak terjadi", () => {
    const p = P({ instance: 1 });
    expect(pengamat(p)).toBe(0);
    expect(selangBasi(p, A, 0)).toBeNull();
    expect(ringkas(p, A)).toMatchObject({ pengamat: 0, sebab: "dihapus-sendiri", lama: 0, instanceBasi: 0 });
  });
  it("tiga instance: yang basi dua (B dan C)", () => {
    const p = P({ instance: 3 });
    expect(ringkas(p, A).instanceBasi).toBe(2);
    expect(jumlahBasi(p, A, 10)).toBe(2);
    expect(jumlahBasi(p, A, 300)).toBe(0);
  });
  it("hapus kunci sebelum COMMIT atau pembaca lambat: instance A juga mengisi ulang harga lama", () => {
    for (const urutan of ["sebelum", "lambat"] as const) {
      expect(sebab(P({ urutan }), A, 0)).toBe("diisi-ulang");
      expect(selangBasi(P({ urutan }), A, 0)).toEqual({ dari: 0, sampai: 300 });
      expect(sebab(P({ urutan }), A, 1)).toBe("tidak-diberi-tahu");
    }
  });
});

describe("Redis bersama", () => {
  const R = (o: Partial<Param> = {}) => P({ cache: "redis", ttl: 60, ...o });
  it("hapus kunci sesudah COMMIT: tidak ada yang melihat harga lama, untuk harga dan promo", () => {
    for (const kejadian of ["harga", "promo"] as const) {
      expect(sebab(R({ kejadian }), A, 1)).toBe("dihapus-bersama");
      expect(selangBasi(R({ kejadian, instance: 3 }), A, 2)).toBeNull();
      expect(lihat(R({ kejadian }), A, 1, 0)).toEqual({ isi: { harga: A.hargaBaru[kejadian], stok: 50 }, basi: false });
    }
  });
  it("sebelum COMMIT dan pembaca lambat: semua instance melihat harga lama sampai TTL", () => {
    for (const urutan of ["sebelum", "lambat"] as const) {
      for (const i of [0, 1, 2]) {
        expect(sebab(R({ urutan, instance: 3 }), A, i)).toBe("diisi-ulang");
        expect(selangBasi(R({ urutan, instance: 3 }), A, i)).toEqual({ dari: 0, sampai: 60 });
      }
      expect(lihat(R({ urutan, kejadian: "harga" }), A, 1, 59)).toEqual({ isi: { harga: 25000, stok: 50 }, basi: true });
      expect(lihat(R({ urutan, kejadian: "harga" }), A, 1, 60)).toEqual({ isi: { harga: 28000, stok: 50 }, basi: false });
    }
  });
  it("Redis mati saat tulis: hapus kunci gagal, entri lama bertahan sampai TTL, di semua instance", () => {
    const p = R({ cache: "redis-mati", kejadian: "harga" });
    expect(sebab(p, A, 0)).toBe("hapus-gagal");
    expect(sebab(p, A, 1)).toBe("hapus-gagal");
    expect(selangBasi(p, A, 0)).toEqual({ dari: 0, sampai: 60 });
    expect(lihat(p, A, 1, 30).basi).toBe(true);
  });
  it("Redis mati tidak mengubah apa pun bila perubahan tidak menghapus kunci", () => {
    expect(sebab(R({ cache: "redis-mati", kejadian: "promo-nanti" }), A, 1)).toBe("tanpa-tulis");
    expect(sebab(R({ cache: "redis-mati", kejadian: "pesanan" }), A, 1)).toBe("tanpa-tulis");
  });
});

describe("perubahan tanpa tulis", () => {
  it("promo yang mulai nanti: harga lama baru basi sesudah promo mulai, sampai TTL, di semua cache", () => {
    for (const cache of ["memori", "redis"] as const) {
      const p = P({ cache, ttl: 60, kejadian: "promo-nanti", instance: 3 });
      expect(waktuUbah(p, A)).toBe(3);
      for (const i of [0, 1, 2]) {
        expect(sebab(p, A, i)).toBe("tanpa-tulis");
        expect(selangBasi(p, A, i)).toEqual({ dari: 3, sampai: 60 });
      }
      expect(lihat(p, A, 1, 2)).toEqual({ isi: { harga: 25000, stok: 50 }, basi: false }); // sebelum mulai harga lama memang benar
      expect(lihat(p, A, 1, 3)).toEqual({ isi: { harga: 25000, stok: 50 }, basi: true });
      expect(database(p, A, 3).harga).toBe(22500);
      expect(lihat(p, A, 1, 60)).toEqual({ isi: { harga: 22500, stok: 50 }, basi: false });
    }
  });
  it("urutan hapus kunci tidak berpengaruh bila tidak ada yang menghapus", () => {
    for (const kejadian of ["promo-nanti", "pesanan"] as const) {
      const hasil = URUTAN.map((urutan) => JSON.stringify(Array.from({ length: 3 }, (_, i) => selangBasi(P({ kejadian, urutan, instance: 3 }), A, i))));
      expect(new Set(hasil).size).toBe(1);
    }
  });
  it("pesanan: stok di cache tertinggal, harga tidak berubah", () => {
    const p = P({ kejadian: "pesanan" });
    expect(database(p, A, 0)).toEqual({ harga: 25000, stok: 49 });
    expect(lihat(p, A, 0, 100)).toEqual({ isi: { harga: 25000, stok: 50 }, basi: true }); // instance A pun, karena Pesan tidak menghapus kunci
    expect(lihat(p, A, 1, 300)).toEqual({ isi: { harga: 25000, stok: 49 }, basi: false });
  });
  it("entri yang habis sebelum perubahan terjadi tidak pernah basi", () => {
    const p = P({ kejadian: "promo-nanti", ttl: 3 });
    expect(sebab(p, A, 1)).toBe("entri-habis-dulu");
    expect(selangBasi(p, A, 1)).toBeNull();
    expect(lamaBasi(p, A, 1)).toBe(0);
  });
});

describe("tanpa cache", () => {
  it("tidak pernah basi, berapa pun instance, TTL, kejadian, atau urutan", () => {
    for (const instance of [1, 2, 3]) for (const kejadian of KEJADIAN) for (const urutan of URUTAN) for (const ttl of [6, 60, 300]) {
      const p = P({ cache: "tanpa", instance, kejadian, urutan, ttl });
      for (let i = 0; i < instance; i++) {
        expect(sebab(p, A, i)).toBe("tanpa-cache");
        expect(selangBasi(p, A, i)).toBeNull();
        expect(lihat(p, A, i, 100).basi).toBe(false);
      }
    }
  });
  it("beban: tiap bacaan membaca database, L = λ × W", () => {
    expect(bacaKunci(P({ cache: "tanpa" }))).toBeNull();
    expect(littleTanpa(A)).toBeCloseTo(0.02605, 10);
    expect(koma(littleTanpa(A), 3)).toBe("0,026");
    expect(littleTanpa(A)).toBeLessThan(A.pool);
  });
});

describe("baca database untuk mengisi satu kunci", () => {
  it("memori satu per instance, Redis satu", () => {
    expect(bacaKunci(P({ cache: "memori", instance: 1 }))).toBe(1);
    expect(bacaKunci(P({ cache: "memori", instance: 2 }))).toBe(2);
    expect(bacaKunci(P({ cache: "memori", instance: 3 }))).toBe(3);
    expect(bacaKunci(P({ cache: "redis", instance: 3 }))).toBe(1);
    expect(bacaKunci(P({ cache: "redis-mati", instance: 3 }))).toBe(1);
  });
});

describe("invarian di seluruh kombinasi", () => {
  const JAM = [0, 1, 2, 3, 5, 6, 59, 60, 61, 299, 300, 301, HORIZON];
  it("yang ditampilkan selalu isi database atau isi awal, dan basi tepat bila berbeda dari database", () => {
    let kombinasi = 0;
    for (const cache of JENIS_CACHE) for (const instance of [1, 2, 3]) for (const ttl of [6, 60, 300]) for (const kejadian of KEJADIAN) for (const urutan of URUTAN) {
      const p = P({ cache, instance, ttl, kejadian, urutan });
      kombinasi++;
      for (let i = 0; i < instance; i++) {
        const s = selangBasi(p, A, i);
        if (s) {
          expect(s.dari).toBe(waktuUbah(p, A));
          expect(s.sampai).toBe(ttl);
          expect(lamaBasi(p, A, i)).toBe(ttl - waktuUbah(p, A));
          expect(lamaBasi(p, A, i)).toBeLessThanOrEqual(ttl);
        } else expect(lamaBasi(p, A, i)).toBe(0);
        for (const jam of JAM) {
          const l = lihat(p, A, i, jam);
          const db = database(p, A, jam);
          const awal = { harga: A.hargaAwal, stok: A.stokAwal };
          expect(l.isi).toEqual(l.basi ? awal : db);
          expect(l.basi).toBe(JSON.stringify(l.isi) !== JSON.stringify(db));
          expect(l.basi).toBe(s !== null && jam >= s.dari && jam < s.sampai);
        }
      }
      expect(jumlahBasi(p, A, 0)).toBeLessThanOrEqual(instance);
    }
    expect(kombinasi).toBe(4 * 3 * 3 * 4 * 3);
  });
  it("Redis bersama yang menghapus sesudah COMMIT tidak pernah lebih lama basi daripada cache lain", () => {
    for (const kejadian of ["harga", "promo"] as const) for (const ttl of [6, 60, 300]) {
      const redis = lamaBasi(P({ cache: "redis", kejadian, ttl }), A, 1);
      for (const lain of [P({ cache: "memori", kejadian, ttl }), P({ cache: "redis", kejadian, ttl, urutan: "sebelum" }), P({ cache: "redis-mati", kejadian, ttl })]) {
        expect(redis).toBeLessThan(lamaBasi(lain, A, 1));
      }
    }
  });
  it("memperpanjang TTL memperpanjang lama basi, tidak pernah memperpendek", () => {
    for (const cache of JENIS_CACHE) for (const kejadian of KEJADIAN) for (const urutan of URUTAN) {
      const lama = [6, 60, 300].map((ttl) => lamaBasi(P({ cache, kejadian, urutan, ttl }), A, 1));
      expect(lama).toEqual([...lama].sort((x, y) => x - y));
    }
  });
  it("instance yang diamati adalah B bila ada dua instance atau lebih", () => {
    expect(pengamat(P({ instance: 1 }))).toBe(0);
    expect(pengamat(P({ instance: 2 }))).toBe(1);
    expect(pengamat(P({ instance: 3 }))).toBe(1);
  });
});

describe("masukan yang tidak masuk akal gagal keras", () => {
  it("TTL, jumlah instance, jenis, dan jam", () => {
    for (const ttl of [0, -1, NaN, Infinity]) expect(() => periksaMasukan(P({ ttl }), A)).toThrow(/TTL/);
    for (const instance of [0, -1, 1.5, NaN]) expect(() => periksaMasukan(P({ instance }), A)).toThrow(/instance/);
    expect(() => periksaMasukan(P({ cache: "valkey" as never }), A)).toThrow(/jenis cache/);
    expect(() => periksaMasukan(P({ kejadian: "diskon" as never }), A)).toThrow(/kejadian/);
    expect(() => periksaMasukan(P({ urutan: "bersamaan" as never }), A)).toThrow(/urutan/);
    for (const jam of [-1, HORIZON + 1, NaN, Infinity]) expect(() => periksaMasukan(P(), A, jam)).toThrow(/jam/);
    expect(() => periksaMasukan(P(), A, 0)).not.toThrow();
    expect(() => periksaMasukan(P(), A, HORIZON)).not.toThrow();
  });
  it("aturan: harga, stok, promo mulai, beban", () => {
    expect(() => periksaMasukan(P(), { ...A, hargaAwal: 0 })).toThrow(/harga/);
    expect(() => periksaMasukan(P(), { ...A, hargaBaru: { ...A.hargaBaru, harga: 28000.5 } })).toThrow(/harga/);
    expect(() => periksaMasukan(P(), { ...A, stokBaru: 50 })).toThrow(/stok/);
    expect(() => periksaMasukan(P(), { ...A, stokAwal: 0, stokBaru: 0 })).toThrow(/stok/);
    expect(() => periksaMasukan(P(), { ...A, promoMulai: NaN })).toThrow(/promo mulai/);
    expect(() => periksaMasukan(P(), { ...A, lambda: 0 })).toThrow(/λ/);
    expect(() => periksaMasukan(P(), { ...A, w: -1 })).toThrow(/W/);
  });
  it("fungsi publik memeriksa masukannya sendiri", () => {
    const salah = P({ ttl: 0 });
    expect(() => database(salah, A, 0)).toThrow();
    expect(() => sebab(salah, A, 0)).toThrow();
    expect(() => selangBasi(salah, A, 0)).toThrow();
    expect(() => lihat(salah, A, 0, 0)).toThrow();
    expect(() => ringkas(salah, A)).toThrow();
    expect(() => bacaKunci(salah)).toThrow();
    expect(() => database(P(), A, -1)).toThrow();
    expect(() => lihat(P(), A, 0, HORIZON + 1)).toThrow();
  });
  it("instance di luar jumlah instance ditolak", () => {
    expect(() => sebab(P({ instance: 2 }), A, 2)).toThrow(/instance 2/);
    expect(() => sebab(P({ instance: 2 }), A, -1)).toThrow();
    expect(() => selangBasi(P({ instance: 1 }), A, 1)).toThrow();
  });
});

describe("hitungan dan teks", () => {
  it("cara lama dihitung", () => {
    expect(caraLama(P(), A, 1)).toBe("300 − 0 = 300");
    expect(caraLama(P({ cache: "redis", ttl: 6, kejadian: "promo-nanti" }), A, 1)).toBe("6 − 3 = 3");
    expect(caraLama(P(), A, 0)).toBeNull();
  });
  it("ringkasan memuat sebab dan lama instance yang diamati", () => {
    expect(ringkas(P(), A)).toEqual({ pengamat: 1, sebab: "tidak-diberi-tahu", lama: 300, instanceBasi: 1 });
    expect(ringkas(P({ cache: "redis" }), A)).toEqual({ pengamat: 1, sebab: "dihapus-bersama", lama: 0, instanceBasi: 0 });
    expect(ringkas(P({ cache: "redis", urutan: "sebelum", instance: 3, ttl: 60 }), A)).toEqual({ pengamat: 1, sebab: "diisi-ulang", lama: 60, instanceBasi: 3 });
  });
  it("rupiah, koma, detik", () => {
    expect(rupiah(25000)).toBe("Rp25.000");
    expect(rupiah(22500)).toBe("Rp22.500");
    expect(rupiah(0)).toBe("Rp0");
    expect(rupiah(999)).toBe("Rp999");
    expect(rupiah(1234567)).toBe("Rp1.234.567");
    expect(koma(5.21, 2)).toBe("5,21");
    expect(detikTeks(300)).toBe("300");
    expect(detikTeks(2.5)).toBe("2,5");
    expect(isiTeks({ harga: 25000, stok: 50 }, "{harga}, stok {stok}")).toBe("Rp25.000, stok 50");
  });
  it("isi: nama yang tidak diisi gagal keras", () => {
    expect(isi("detik ke-{x}", { x: 3 })).toBe("detik ke-3");
    expect(() => isi("detik ke-{x} {y}", { x: 3 })).toThrow(/\{y\}/);
  });
  it("tebakan: tepat satu pilihan berdetik sama dengan detik pertama harga baru", () => {
    const pil = [{ teks: "a", detik: 1 }, { teks: "b", detik: 60 }, { teks: "c", detik: 300 }, { teks: "d", detik: null }];
    expect(indeksBenar(pil, 300)).toBe(2);
    expect(() => indeksBenar(pil, 299)).toThrow(/0 pilihan/);
    expect(() => indeksBenar([...pil, { teks: "e", detik: 300 }], 300)).toThrow(/2 pilihan/);
  });
  it("horizon melewati TTL terpanjang supaya akhir masa basi terlihat", () => {
    expect(HORIZON).toBeGreaterThan(300);
  });
});

describe("titik acuan", () => {
  const D: AcuanDef[] = [
    { kunci: "m", param: P() },
    { kunci: "mati", param: P({ cache: "redis-mati", ttl: 60, kejadian: "harga" }) },
    { kunci: "sebelum", param: P({ cache: "redis", ttl: 60, kejadian: "harga", urutan: "sebelum" }) },
    { kunci: "nanti", param: P({ cache: "redis", ttl: 6, kejadian: "promo-nanti" }) },
    { kunci: "tanpa", param: P({ cache: "tanpa", ttl: 60 }) },
  ];
  it("jenis, instance, TTL, dan kejadian harus sama", () => {
    expect(cariAcuan(P(), D)).toBe("m");
    expect(cariAcuan(P({ instance: 3 }), D)).toBeNull();
    expect(cariAcuan(P({ instance: 1 }), D)).toBeNull();
    expect(cariAcuan(P({ ttl: 60 }), D)).toBeNull();
    expect(cariAcuan(P({ kejadian: "harga" }), D)).toBeNull();
    expect(cariAcuan(P({ cache: "redis" }), D)).toBeNull();
  });
  it("urutan dihitung hanya untuk perubahan lewat tulis", () => {
    expect(cariAcuan(P({ urutan: "sebelum" }), D)).toBeNull();
    expect(cariAcuan(P({ cache: "redis", ttl: 60, kejadian: "harga", urutan: "sebelum" }), D)).toBe("sebelum");
    expect(cariAcuan(P({ cache: "redis", ttl: 60, kejadian: "harga", urutan: "sesudah" }), D)).toBeNull();
    for (const urutan of URUTAN) expect(cariAcuan(P({ cache: "redis", ttl: 6, kejadian: "promo-nanti", urutan }), D)).toBe("nanti");
  });
  it("tanpa cache cocok dengan rekaman beban untuk semua pengaturan", () => {
    for (const instance of [1, 2, 3]) for (const kejadian of KEJADIAN) expect(cariAcuan(P({ cache: "tanpa", instance, kejadian, ttl: 6 }), D)).toBe("tanpa");
    expect(samaAcuan(P({ cache: "tanpa" }), D[0]!)).toBe(false);
  });
});
