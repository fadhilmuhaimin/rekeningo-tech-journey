// Penjaga angka widget cache dan invalidation (W3-cache, keputusan 986): angka acuan diturunkan dari rekaman t3-cache dengan
// pola sendiri (bukan rekaman.ts), lalu dibandingkan dengan pembaca rekaman, simulasi, dan teks yang tampil. Uji mutasi pada
// teks rekaman: satu angka diubah, pembaca atau perbandingan harus gagal.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { aturanDari, awalDari, bacaRekaman, daftarAcuan } from "./rekaman";
import { bacaKunci, cariAcuan, database, isi, koma, lamaBasi, lihat, littleTanpa, periksaMasukan, pengamat, ringkas, rupiah, selangBasi, URUTAN } from "./logika";
import { LabelCache } from "./skema";
import { nilaiBuild, periksaTombol, siapkanTeks } from "./teks";
import labelMentah from "../../../data/widget/t3-cache-invalidation.json";

const DIR = path.resolve(__dirname, "../../../../labs/t3-cache/output");
const baca = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const TEKS = { memori: baca("memori.txt"), redis: baca("redis.txt"), gagal: baca("gagal.txt"), beban: baca("beban.txt") };
const bacaDari = (t: typeof TEKS) => bacaRekaman(t.memori, t.redis, t.gagal, t.beban);
const R = bacaDari(TEKS);
const A = aturanDari(R);
const L = LabelCache.parse(labelMentah);
const acuan = daftarAcuan(R);
const T = siapkanTeks(L, R, acuan);
const dari = (kunci: string) => acuan.find((d) => d.kunci === kunci)!.param;

// Angka dengan pola sendiri, langsung dari teks rekaman.
const dec = (s: string) => Number(s.replace(",", "."));
const ambil = (teks: string, pola: RegExp, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const sendiri = {
  ttlMemori: Number(ambil(TEKS.memori, /\(TTL (\d+) detik\)/, "TTL memori")[1]),
  ttlRedis: Number(ambil(TEKS.redis, /-katalog-ttl (\d+)s/, "TTL redis")[1]),
  ttlLab: Number(ambil(TEKS.redis, /# TTL (\d+) detik di bagian ini/, "TTL lab")[1]),
  mulai: Number(ambil(TEKS.redis, /mulai (\d+) detik lagi -> 201/, "promo mulai nanti")[1]),
  lama: Number(ambil(TEKS.memori, /detik ke-(\d+): masih entri lama/, "detik lama")[1]),
  baru: Number(ambil(TEKS.memori, /detik ke-(\d+): entri habis/, "detik baru")[1]),
  pttl: Number(ambil(TEKS.redis, /paling banyak (\d+)\.(\d{3}) ms/, "PTTL").slice(1).join("")),
  serentak: Number(ambil(TEKS.gagal, /: (\d+) GET \/katalog\?warung=418 serentak/, "serentak")[1]),
  koneksi: Number(ambil(TEKS.gagal, /dicuplik tiap 5 ms selama \d+ bacaan: paling banyak (\d+) koneksi/, "koneksi")[1]),
  tanpaDb: Number(ambil(TEKS.beban, /^(\d+) bacaan -> baca database (\d+), hit 0$/m, "tanpa cache")[2]),
  redisDb: Number(ambil(TEKS.beban, /^\d+ bacaan -> baca database (\d+), hit (\d+), galat cache 0$/m, "dengan Redis")[1]),
  redisHit: Number(ambil(TEKS.beban, /^\d+ bacaan -> baca database (\d+), hit (\d+), galat cache 0$/m, "dengan Redis")[2]),
  lambda: dec(ambil(TEKS.beban, /beban: \d+ bacaan katalog Jakarta, (\d+,\d+) per detik/, "lambda")[1]),
  l: dec(ambil(TEKS.beban, /W = \d+ ms \(Asumsi\), L = \d,\d+ x \d,\d+ = (\d,\d+)\./, "L")[1]),
  wMs: Number(ambil(TEKS.beban, /W = (\d+) ms \(Asumsi\), L = /, "W")[1]),
  batasWMs: Number(ambil(TEKS.beban, /terukur di bawah (\d+) ms/, "batas W")[1]),
};

describe("rekaman dibaca persis dan angkanya sama dengan pola sendiri", () => {
  it("TTL, detik, harga, dan sisa TTL", () => {
    expect(R.memori.ttl).toBe(sendiri.ttlMemori);
    expect(R.redis.ttl).toBe(sendiri.ttlRedis);
    expect(R.redis.nanti.ttl).toBe(sendiri.ttlLab);
    expect(R.redis.nanti.mulai).toBe(sendiri.mulai);
    expect(R.memori.lamaTerakhir).toBe(sendiri.lama);
    expect(R.memori.baruMulai).toBe(sendiri.baru);
    expect(R.redis.pttlMs).toBe(sendiri.pttl);
    expect([sendiri.ttlMemori, sendiri.ttlRedis, sendiri.ttlLab, sendiri.mulai, sendiri.lama, sendiri.baru]).toEqual([300, 60, 6, 3, 299, 300]);
  });
  it("harga dan stok dari baris JSON dan baris database", () => {
    expect(A.hargaAwal).toBe(25000);
    expect(A.hargaBaru).toEqual({ promo: 22500, harga: 28000, "promo-nanti": 22500 });
    expect([A.stokAwal, A.stokBaru]).toEqual([50, 49]);
    expect(R.memori.tagih).toBe(22500);
  });
  it("kegagalan dan beban", () => {
    expect(R.gagal.serentak).toBe(sendiri.serentak);
    expect(R.gagal.koneksiMaks).toBe(sendiri.koneksi);
    expect(R.beban.tanpaDb).toBe(sendiri.tanpaDb);
    expect(R.beban.redisDb).toBe(sendiri.redisDb);
    expect(R.beban.redisHit).toBe(sendiri.redisHit);
    expect(R.beban.lambda).toBe(sendiri.lambda);
    expect(R.beban.l).toBe(sendiri.l);
    expect(R.beban.w * 1000).toBeCloseTo(sendiri.wMs, 9);
    expect(R.beban.batasWMs).toBe(sendiri.batasWMs);
    expect(A.lambda).toBe(5.21);
  });
});

describe("simulasi cocok dengan setiap titik rekaman", () => {
  it("memori.txt B dan D: instance B stale sampai detik ke-300, A tidak", () => {
    const p = dari("memori-promo");
    expect(p).toEqual(awalDari(R));
    expect(selangBasi(p, A, 1)).toEqual({ dari: 0, sampai: R.memori.baruMulai });
    expect(selangBasi(p, A, 0)).toBeNull(); // promo membuang kunci di A (dihapusA)
    expect([R.memori.dihapusA, R.memori.dihapusB]).toEqual([1, 0]);
    expect(lihat(p, A, 1, R.memori.lamaTerakhir)).toEqual({ isi: { harga: R.memori.citraLama.efektif, stok: R.memori.awal.stok }, basi: true });
    expect(lihat(p, A, 1, R.memori.baruMulai)).toMatchObject({ isi: { harga: R.memori.budiBaru.efektif, stok: R.memori.stokDb === 49 ? 50 : 0 }, basi: false });
    expect(lihat(p, A, 0, 0).isi.harga).toBe(R.memori.budiBaru.efektif);
    expect(lihat(p, A, 1, 0).isi.harga).toBe(R.memori.citraLama.efektif);
  });
  it("memori.txt C: stok di cache B masih awal, database sudah turun, tagihan dari database", () => {
    const p = dari("memori-stok");
    expect(lihat(p, A, 1, 0).isi.stok).toBe(R.memori.citraStok);
    expect(database(p, A, 0).stok).toBe(R.memori.stokDb);
    expect(lihat(p, A, 1, 0).basi).toBe(true);
    expect(database(p, A, 0).harga).toBe(A.hargaAwal);
  });
  it("redis.txt B, C, dan E: hapus kunci sesudah COMMIT, instance lain langsung melihat harga baru", () => {
    expect(selangBasi(dari("redis-harga"), A, 1)).toBeNull();
    expect(lihat(dari("redis-harga"), A, 1, 0).isi.harga).toBe(R.redis.harga.baru);
    expect(selangBasi(dari("redis-promo"), A, 1)).toBeNull();
    expect(lihat(dari("redis-promo"), A, 1, 0).isi.harga).toBe(R.redis.promoBaru);
  });
  it("redis.txt D dan F: harga lama bertahan sampai TTL, dan TTL terpasang tidak melebihi sisa TTL rekaman", () => {
    for (const [kunci, rek] of [["redis-sebelum", R.redis.sebelum], ["redis-lambat", R.redis.lambat]] as const) {
      const p = dari(kunci);
      expect(selangBasi(p, A, 1)).toEqual({ dari: 0, sampai: R.redis.ttl });
      expect(selangBasi(p, A, 0)).toEqual({ dari: 0, sampai: R.redis.ttl }); // Budi di instance A juga melihat harga lama (D, F)
      expect(lihat(p, A, 1, 1).isi.harga).toBe(rek.dilihat);
      expect(database(p, A, 1).harga).toBe(rek.db);
      expect(R.redis.ttl * 1000).toBeLessThanOrEqual(R.redis.pttlMs);
    }
  });
  it("redis.txt G: promo mulai nanti, tidak ada kunci terhapus, stale dari detik mulai sampai TTL lab", () => {
    const p = dari("redis-nanti");
    expect(p.ttl).toBe(R.redis.nanti.ttl);
    expect(selangBasi(p, A, 1)).toEqual({ dari: R.redis.nanti.mulai, sampai: R.redis.nanti.ttl });
    expect(lamaBasi(p, A, 1)).toBe(R.redis.nanti.ttl - R.redis.nanti.mulai);
    expect(lihat(p, A, 1, R.redis.nanti.mulai).isi.harga).toBe(R.redis.nanti.lama);
    expect(lihat(p, A, 1, R.redis.nanti.ttl).isi.harga).toBe(R.redis.nanti.baru);
  });
  it("gagal.txt C: Redis mati saat tulis, entri lama kembali padahal database sudah berubah", () => {
    const p = dari("redis-mati");
    expect(selangBasi(p, A, 1)).toEqual({ dari: 0, sampai: R.redis.ttl });
    expect(lihat(p, A, 1, 1).isi.harga).toBe(R.gagal.mati.dilihat);
    expect(database(p, A, 1).harga).toBe(R.gagal.mati.db);
    expect(R.gagal.mati.galatCache).toBe(2); // dua DEL, kunci kota dan kunci warung
  });
  it("beban.txt: tanpa cache tiap bacaan membaca database, L = λ × W jauh di bawah pool dan batas rekaman", () => {
    const p = dari("tanpa");
    expect(selangBasi(p, A, 1)).toBeNull();
    expect(bacaKunci(p)).toBeNull();
    expect(R.beban.tanpaDb).toBe(R.beban.bacaan);
    expect(Math.round(littleTanpa(A) * 1000) / 1000).toBe(R.beban.l);
    expect(littleTanpa(A)).toBeLessThan(R.beban.batasL);
    expect(R.beban.w * 1000).toBeLessThan(R.beban.batasWMs);
    expect(littleTanpa(A)).toBeLessThan(A.pool / 100);
  });
  it("baca database untuk satu kunci: memori dua instance dan Redis cocok dengan memori.txt A dan redis.txt A", () => {
    expect(bacaKunci(awalDari(R))).toBe(R.memori.bacaDb);
    expect(bacaKunci(dari("redis-harga"))).toBe(R.redis.bacaDbA + R.redis.bacaDbB);
    expect(R.beban.redisDb + R.beban.redisHit).toBe(R.beban.bacaan);
  });
  it("daftar acuan: tiap titik valid, unik, cocok dengan dirinya, dan punya teks", () => {
    expect(new Set(acuan.map((d) => d.kunci)).size).toBe(acuan.length);
    expect(Object.keys(L.acuan).sort()).toEqual(acuan.map((d) => d.kunci).sort());
    for (const d of acuan) {
      expect(() => periksaMasukan(d.param, A)).not.toThrow();
      expect(cariAcuan(d.param, acuan), d.kunci).toBe(d.kunci);
      expect(T.acuanTeks[d.kunci], d.kunci).toBeTruthy();
    }
    expect(() => periksaTombol(L, R)).not.toThrow();
  });
  it("urutan yang tidak direkam tidak mendapat acuan, tombol mana pun", () => {
    for (const urutan of URUTAN) {
      const p = { ...dari("memori-promo"), urutan };
      expect(cariAcuan(p, acuan) !== null).toBe(urutan === "sesudah");
    }
  });
});

describe("tebakan dan teks memakai angka rekaman", () => {
  it("pilihan benar berdetik sama dengan detik pertama harga baru, pengecoh diambil dari rekaman", () => {
    expect(L.pilihan[T.benar]!.detik).toBe(sendiri.baru);
    expect(L.pilihan.filter((p) => p.detik === sendiri.ttlRedis)).toHaveLength(1); // 60 detik: TTL Redis
    for (const p of L.pilihan) if (p.detik !== null && p.detik !== sendiri.baru) expect(p.detik).toBeLessThan(sendiri.baru);
    expect(T.pertanyaan).toContain(`TTL ${sendiri.ttlMemori} detik`);
    expect(T.pilihan[T.benar]!.alasan).toContain(`detik ke-${sendiri.lama}`);
    expect(T.pilihan[T.benar]!.alasan).toContain(`detik ke-${sendiri.baru}`);
    expect(T.pilihan[T.benar]!.teks).toContain(`detik ke-${sendiri.baru}`);
  });
  it("opsi TTL persis tiga nilai rekaman, label sama dengan nilai", () => {
    expect(T.opsi.ttl.map((o) => o.nilai).sort((a, b) => a - b)).toEqual([sendiri.ttlLab, sendiri.ttlRedis, sendiri.ttlMemori]);
    for (const o of T.opsi.ttl) expect(o.label).toBe(String(o.nilai));
  });
  it("teks acuan memuat angka rekaman", () => {
    const ada = (kunci: string, ...potong: (string | number)[]) => { for (const x of potong) expect(T.acuanTeks[kunci], `${kunci}: ${x}`).toContain(String(x)); };
    ada("memori-promo", rupiah(22500), rupiah(25000), sendiri.lama, sendiri.baru);
    ada("memori-stok", 49, 50, rupiah(22500));
    ada("redis-harga", rupiah(28000));
    ada("redis-promo", rupiah(22500));
    ada("redis-sebelum", rupiah(25000), rupiah(28000), "60.000");
    ada("redis-lambat", rupiah(25000), rupiah(28000));
    ada("redis-nanti", sendiri.mulai, sendiri.ttlLab);
    ada("redis-mati", rupiah(25000), rupiah(28000), 2);
    ada("tanpa", sendiri.tanpaDb, sendiri.redisDb, sendiri.redisHit, R.beban.bacaan);
  });
  it("hitungan beban memuat λ, W, dan pool dari rekaman; L dihitung island dari rumus", () => {
    expect(T.hitungan.bebanNilai).toContain(`${String(sendiri.lambda).replace(".", ",")} × 0,005 = {l} koneksi dari pool 10`);
    expect(T.hitungan.bebanNilai).toContain(`W = ${sendiri.wMs} ms`);
    expect(isi(T.hitungan.bebanNilai, { l: koma(littleTanpa(A), 3) })).toContain(`= ${String(sendiri.l).replace(".", ",")} koneksi dari pool`); // sama dengan L di rekaman
    expect(T.hitungan.bacaKunciNilai.memori).toContain("{k}"); // diisi island dari bacaKunci
    expect(T.hitungan.bacaKunciNilai.memori).toContain(`${R.memori.bacaDb} untuk dua instance`);
    expect(T.hitungan.bacaKunciNilai.redis).toContain(`${R.redis.bacaDbA} di instance A, ${R.redis.bacaDbB} di instance B`);
  });
  it("catatan memuat angka kegagalan dan tagihan dari rekaman", () => {
    expect(T.catatan.mati).toContain(`${sendiri.serentak} bacaan serentak menjadi ${sendiri.serentak} baca database`);
    expect(T.catatan.mati).toContain(`paling banyak ${sendiri.koneksi}`);
    expect(T.catatan.uang).toContain(rupiah(22500));
    expect(T.catatan.uang).toContain(rupiah(25000));
    expect(T.catatan.ttlLab).toContain(`TTL ${sendiri.ttlLab} detik`);
  });
  it("nilai build memuat harga dan hitungan dari rekaman", () => {
    const v = nilaiBuild(R);
    expect(v).toMatchObject({ hargaAwal: "Rp25.000", hargaBaru: "Rp22.500", hargaUbah: "Rp28.000", pttl: "60.000", lambda: "5,21", w: "0,005", wMs: 5 });
    expect(v).not.toHaveProperty("l"); // L dihitung island dari rumus, bukan disalin dari rekaman
  });
  it("ringkasan pengaturan awal: instance B stale sebesar TTL memori", () => {
    expect(ringkas(awalDari(R), A)).toEqual({ pengamat: 1, sebab: "tidak-diberi-tahu", lama: sendiri.ttlMemori, instanceBasi: 1 });
    expect(pengamat(awalDari(R))).toBe(1);
  });
});

describe("uji mutasi pada teks rekaman: satu angka diubah, pembaca atau perbandingan harus gagal", () => {
  const bandingan = JSON.stringify(R);
  const ubah = (berkas: keyof typeof TEKS, dari: string | RegExp, ke: string) => {
    const t = { ...TEKS, [berkas]: TEKS[berkas].replace(dari, ke) };
    if (t[berkas] === TEKS[berkas]) throw new Error(`mutasi tidak mengubah ${berkas}: ${String(dari)}`);
    return t;
  };
  const gagal = (t: typeof TEKS) => {
    try {
      const r = bacaDari(t);
      aturanDari(r);
      return JSON.stringify(r) !== bandingan ? "berbeda" : null;
    } catch (e) {
      return (e as Error).message;
    }
  };
  const MUTASI: [keyof typeof TEKS, string | RegExp, string][] = [
    ["memori", "detik ke-300: entri habis", "detik ke-301: entri habis"],
    ["memori", "detik ke-299: masih entri lama", "detik ke-298: masih entri lama"],
    ["memori", "(TTL 300 detik)", "(TTL 301 detik)"],
    ["memori", /"harga_efektif":22500,"stok":50,"versi":1\}   # miss, dari database/, '"harga_efektif":22000,"stok":50,"versi":1}   # miss, dari database'],
    ["memori", "kunci dihapus 1, galat cache 0   # entri katalog:1:418 dibuang", "kunci dihapus 2, galat cache 0   # entri katalog:1:418 dibuang"],
    ["memori", '"stok_sisa":49', '"stok_sisa":48'],
    ["redis", "-katalog-ttl 60s", "-katalog-ttl 61s"],
    ["redis", "paling banyak 60.000 ms (TTL 60 detik terpasang)", "paling banyak 61.000 ms (TTL 60 detik terpasang)"],
    ["redis", "mulai 3 detik lagi -> 201", "mulai 4 detik lagi -> 201"],
    ["redis", "# TTL 6 detik di bagian ini", "# TTL 7 detik di bagian ini"],
    ["redis", "# miss: harga baru", "# hit: harga lama"],
    ["gagal", "galat cache 2   # dua DEL", "galat cache 3   # dua DEL"],
    ["gagal", "50 GET /katalog?warung=418 serentak", "49 GET /katalog?warung=418 serentak"],
    ["gagal", "paling banyak 10 koneksi", "paling banyak 11 koneksi"],
    ["beban", "-> baca database 13, hit 39", "-> baca database 13, hit 40"],
    ["beban", "52 bacaan -> baca database 52, hit 0", "52 bacaan -> baca database 51, hit 0"],
    ["beban", "5,21 per detik", "5,22 per detik"],
    ["beban", "L = 5,21 x 0,005 = 0,026", "L = 5,21 x 0,005 = 0,027"],
    ["beban", "terukur di bawah 20 ms", "terukur di bawah 25 ms"],
  ];
  for (const [berkas, dariTeks, ke] of MUTASI) {
    it(`${berkas}: ${String(dariTeks).slice(0, 60)}`, () => {
      expect(gagal(ubah(berkas, dariTeks, ke))).not.toBeNull();
    });
  }
  it("rekaman tanpa mutasi tidak dianggap gagal", () => {
    expect(gagal(TEKS)).toBeNull();
  });
  it("bagian yang hilang gagal dengan pesan yang menyebut bagiannya", () => {
    expect(() => bacaRekaman(TEKS.memori.replace("# --- D. ", "# --- X. "), TEKS.redis, TEKS.gagal, TEKS.beban)).toThrow(/bagian memori D tidak ada/);
    expect(() => bacaRekaman(TEKS.memori, TEKS.redis, TEKS.gagal, TEKS.beban.replace("# --- C. ", "# --- X. "))).toThrow(/bagian beban C tidak ada/);
  });
});
