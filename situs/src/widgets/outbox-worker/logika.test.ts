// Tes mesin widget outbox dan worker (W3-outbox, keputusan 983): tabel kebenaran tiap skenario, determinisme, aturan
// yang membedakan mode (cara kirim, kursor lawan klaim, kelas), dan pagar bentuk (knob, kunci, templat).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaAcuan } from "./rekaman";
import {
  AWAL, KNOB, TITIK, acuanDari, indeksBenar, isi, jalankan, jalankanAntrean, jalankanCara, jalankanGanda, jalankanKursor, jalankanUlang,
  jawabanTebak, konstanta, kunciKonfig, nilaiTebak, rp, semuaKonfig, tampil, tungguMaks, CARA, KEJADIAN, type NamaSkenario,
} from "./logika";

const akar = path.resolve(__dirname, "../../../..");
const baca = (f: string) => fs.readFileSync(path.join(akar, "labs/t3-outbox/output", f + ".txt"), "utf8");
const a = bacaAcuan({ transaksi: baca("transaksi"), kursor: baca("kursor"), ganda: baca("ganda"), retry: baca("retry"), queue: baca("queue") });
const k = konstanta(a);
const SEMUA: NamaSkenario[] = ["cara", "kursor", "ulang", "ganda", "antrean"];

describe("bentuk", () => {
  test("jumlah konfigurasi dan kunci unik", () => {
    const harap = { cara: 15, kursor: 4, ulang: 9, ganda: 8, antrean: 16 };
    for (const s of SEMUA) {
      const semua = semuaKonfig(s);
      expect(semua.length).toBe(harap[s]);
      expect(new Set(semua.map((kf) => kunciKonfig(s, kf))).size).toBe(harap[s]);
    }
  });
  test("knob yang salah gagal keras", () => {
    expect(() => kunciKonfig("cara", { cara: "outbox" })).toThrow(/knob kejadian/);
    expect(() => kunciKonfig("cara", { cara: "kafka", kejadian: "lancar" })).toThrow(/knob cara/);
    expect(() => jalankan("antrean", { kelas: "dengan", laju: "5", c: "3" }, k)).toThrow(/knob c/);
  });
  test("konfigurasi awal sah dan titik rekaman sah", () => {
    for (const s of SEMUA) expect(() => kunciKonfig(s, AWAL[s])).not.toThrow();
    for (const t of TITIK) expect(() => kunciKonfig(t.skenario, t.konfig)).not.toThrow();
    expect(new Set(TITIK.map((t) => t.skenario + kunciKonfig(t.skenario, t.konfig))).size).toBe(TITIK.length);
  });
  test("deterministik: dua kali jalan sama, tanpa jam dan acak di sumber", () => {
    for (const s of SEMUA) for (const kf of semuaKonfig(s)) expect(jalankan(s, kf, k)).toEqual(jalankan(s, kf, k));
    for (const f of ["logika.ts", "rekaman.ts", "siap.ts", "OutboxWorker.tsx"]) {
      const teks = fs.readFileSync(path.join(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(teks, f).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now|setInterval|setTimeout|requestAnimationFrame/);
    }
  });
  test("isi templat: nama yang tidak diisi gagal, boolean jadi kata", () => {
    expect(isi("{a} dan {b}", { a: 1, b: true }, { ya: "ya", tidak: "tidak" })).toBe("1 dan ya");
    expect(() => isi("{c}", {}, { ya: "ya", tidak: "tidak" })).toThrow(/\{c\}/);
    expect(tampil(13.3333)).toBe("13,33");
    expect(tampil(10000)).toBe("10.000");
    expect(rp(25000)).toBe("Rp25.000");
  });
  test("indeksBenar: tepat satu", () => {
    expect(indeksBenar([{ nilai: 1 }, { nilai: 2 }, { nilai: 3 }], 2)).toBe(1);
    expect(() => indeksBenar([{ nilai: 1 }, { nilai: 2 }, { nilai: 3 }], 4)).toThrow();
    expect(() => indeksBenar([{ nilai: 1 }, { nilai: 1 }, { nilai: 3 }], 1)).toThrow();
  });
});

describe("cara kirim: tiga hal yang harus selalu benar", () => {
  // [jurnal, outboxBaris, notif, p1 tidak mendahului, p2 tidak hilang diam-diam, p3 tidak menunggu push]
  const harap: Record<string, [number, number, number, boolean, boolean, boolean]> = {
    "langsung|lancar": [1, 0, 1, true, true, false],
    "langsung|commit-ditolak": [0, 0, 1, false, true, false],
    "langsung|push-503": [1, 0, 0, true, false, false],
    "langsung|push-menggantung": [1, 0, 1, true, true, false],
    "langsung|proses-mati": [0, 0, 1, false, true, false],
    "sesudah-commit|lancar": [1, 0, 1, true, true, false],
    "sesudah-commit|commit-ditolak": [0, 0, 0, true, true, true],
    "sesudah-commit|push-503": [1, 0, 0, true, false, false],
    "sesudah-commit|push-menggantung": [1, 0, 1, true, true, false],
    "sesudah-commit|proses-mati": [1, 0, 0, true, false, true],
    "outbox|lancar": [1, 1, 1, true, true, true],
    "outbox|commit-ditolak": [0, 0, 0, true, true, true],
    "outbox|push-503": [1, 1, 0, true, true, true],
    "outbox|push-menggantung": [1, 1, 1, true, true, true],
    "outbox|proses-mati": [1, 1, 1, true, true, true],
  };
  test.each(Object.entries(harap))("%s", (kunci, [jurnal, outboxBaris, notif, p1, p2, p3]) => {
    const [cara, kejadian] = kunci.split("|") as [(typeof CARA)[number], (typeof KEJADIAN)[number]];
    const h = jalankanCara(cara, kejadian, k);
    expect([h.angka.jurnal, h.angka.outboxBaris, h.angka.notif, h.angka.p1, h.angka.p2, h.angka.p3]).toEqual([jurnal, outboxBaris, notif, p1, p2, p3]);
  });
  test("hanya outbox memenuhi ketiganya di semua kejadian; cara lain tidak pernah", () => {
    for (const kj of KEJADIAN) {
      expect(jalankanCara("outbox", kj, k).angka.lolos).toBe(3);
      expect(jalankanCara("langsung", kj, k).angka.lolos).toBeLessThan(3);
    }
    expect(CARA.filter((c) => KEJADIAN.every((kj) => jalankanCara(c, kj, k).angka.lolos === 3))).toEqual(["outbox"]);
  });
  test("tebakan: hanya outbox yang mengirim dan uangnya ada saat proses mati", () => {
    expect(jawabanTebak("cara", k)).toBe("outbox");
  });
  test("baris outbox ikut dibuang saat COMMIT ditolak dan teksnya berbeda dari tanpa outbox", () => {
    const o = jalankanCara("outbox", "commit-ditolak", k);
    expect(o.garis.map((e) => e.kunci)).toContain("rollback-bersama");
    expect(jalankanCara("langsung", "commit-ditolak", k).garis.map((e) => e.kunci)).not.toContain("rollback-bersama");
  });
  test("acuan: outbox direkam, dua cara lain Ilustrasi", () => {
    expect(acuanDari("cara", { cara: "outbox", kejadian: "proses-mati" })).toEqual({ jenis: "rekaman", sumber: "transaksi.txt F" });
    expect(acuanDari("cara", { cara: "langsung", kejadian: "lancar" }).jenis).toBe("ilustrasi");
    expect(acuanDari("cara", { cara: "sesudah-commit", kejadian: "proses-mati" }).jenis).toBe("ilustrasi");
  });
});

describe("kursor lawan klaim", () => {
  test.each([
    ["kursor", "berurutan", 2],
    ["kursor", "terbalik", 1],
    ["klaim", "berurutan", 2],
    ["klaim", "terbalik", 2],
  ] as const)("%s %s: %i pesan", (poller, urutan, pesan) => {
    const h = jalankanKursor(poller, urutan, k);
    expect(h.angka.pesan).toBe(pesan);
    expect(h.angka.tertinggal).toBe(2 - pesan);
    expect(h.angka.saldoNaik).toBe(2 * a.kursor.nominal);
  });
  test("mode klaim dan kursor berbeda hanya saat urutan terbalik", () => {
    expect(jalankanKursor("kursor", "terbalik", k).angka.pesan).not.toBe(jalankanKursor("klaim", "terbalik", k).angka.pesan);
    expect(jalankanKursor("kursor", "berurutan", k).angka.pesan).toBe(jalankanKursor("klaim", "berurutan", k).angka.pesan);
  });
  test("baris Budi dilewati kursor, bukan Dimas", () => {
    const lewat = jalankanKursor("kursor", "terbalik", k).garis.filter((e) => e.kunci === "kursor-lewat");
    expect(lewat.map((e) => e.nilai.siapa)).toEqual(["Budi"]);
  });
  test("tebakan 1 notifikasi", () => {
    expect(jawabanTebak("kursor", k)).toBe(1);
  });
});

describe("retry, backoff, dead-letter", () => {
  test("batas atas tunggu berlipat dua sampai batas maksimum", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((i) => tungguMaks(k, i))).toEqual([2, 4, 8, 16, 32, 60, 60, 60]);
  });
  test("push 503 terus: permintaan = batas, dead-letter, selang akumulasi batas atas", () => {
    for (const [batas, selang] of [[2, 2], [5, 30], [8, 182]] as const) {
      const h = jalankanUlang("push-503", batas, k);
      expect(h.angka).toMatchObject({ permintaan: batas, percobaan: batas, terkirim: false, mati: true, selang });
    }
  });
  test("push pulih sesudah dua kegagalan: terkirim di percobaan ketiga bila batas cukup, mati bila batas dua", () => {
    expect(jalankanUlang("pulih-sesudah-2", 5, k).angka).toMatchObject({ permintaan: 3, percobaan: 3, terkirim: true, mati: false, selang: 6 });
    expect(jalankanUlang("pulih-sesudah-2", 8, k).angka).toMatchObject({ permintaan: 3, terkirim: true });
    expect(jalankanUlang("pulih-sesudah-2", 2, k).angka).toMatchObject({ permintaan: 2, terkirim: false, mati: true });
  });
  test("worker mati: pesan = batas, percobaan = batas + 1, klaim terakhir tidak mengirim", () => {
    for (const batas of [2, 5, 8]) {
      const h = jalankanUlang("worker-mati", batas, k);
      expect(h.angka).toMatchObject({ permintaan: batas, percobaan: batas + 1, terkirim: false, mati: true });
      expect(h.garis.at(-1)!.kunci).toBe("mati-batas");
      expect(h.garis.filter((e) => e.kunci === "mati-kirim").length).toBe(batas);
    }
  });
  test("tebakan 5 pesan, bukan 4 atau 6", () => {
    expect(jawabanTebak("ulang", k)).toBe(5);
    expect(nilaiTebak("ulang", k)).toEqual({ batas: 5, pesan: 5, klaimMati: 6 });
  });
});

describe("pengiriman ganda", () => {
  test.each([
    ["mati-klaim-5", 2, true, 1],
    ["klaim-pendek", 2, true, 1],
    ["dua-hp-klaim-5", 4, true, 2],
    ["dua-hp-klaim-10", 2, false, 2],
  ] as const)("%s: %i pesan, bersamaan %s", (varian, pesan, bersamaan, perangkat) => {
    const h = jalankanGanda(varian, false, k);
    expect(h.angka).toMatchObject({ pesan, bersamaan, perangkat, id: 1, tampil: pesan });
  });
  test("klaim 5 detik muat satu perangkat yang menggantung, bukan dua (README lab, temuan 2)", () => {
    expect(2 * k.pushTimeout).toBeGreaterThan(k.klaim);
    expect(k.pushTimeout).toBeLessThan(k.klaim);
  });
  test("penyaring menampilkan satu per perangkat; tanpa penyaring semua pesan tampil", () => {
    expect(jalankanGanda("mati-klaim-5", true, k).angka.tampil).toBe(1);
    expect(jalankanGanda("dua-hp-klaim-5", true, k).angka.tampil).toBe(2);
    expect(jalankanGanda("dua-hp-klaim-5", false, k).angka.tampil).toBe(4);
  });
  test("klaim panjang menghilangkan tumpang tindih; peristiwa worker 2 hilang", () => {
    const kunci = (v: Parameters<typeof jalankanGanda>[0]) => jalankanGanda(v, false, k).garis.map((e) => e.kunci);
    expect(kunci("dua-hp-klaim-5")).toContain("klaim-b");
    expect(kunci("dua-hp-klaim-10")).not.toContain("klaim-b");
    expect(kunci("dua-hp-klaim-10")).toContain("a-ditunda");
  });
  test("garis waktu terurut menurut waktu", () => {
    for (const v of ["mati-klaim-5", "klaim-pendek", "dua-hp-klaim-5", "dua-hp-klaim-10"] as const) {
      const w = jalankanGanda(v, false, k).garis.map((e) => e.waktu.n);
      expect([...w].sort((x, y) => x - y)).toEqual(w);
    }
  });
});

describe("antrean promo", () => {
  test("kapasitas c ÷ t dan persen promo dalam jendela", () => {
    for (const [c, kap] of [[1, 3.33], [4, 13.33], [8, 26.67], [20, 66.67]] as const) {
      const h = jalankanAntrean("tanpa", "bebas", c, k);
      expect(Math.round((h.angka.kapasitas as number) * 100) / 100).toBe(kap);
    }
    expect(jalankanAntrean("tanpa", "bebas", 4, k).angka).toMatchObject({ promo30: 400, persen30: 4, habis: 750, tunggu: 750 });
    expect(jalankanAntrean("tanpa", "bebas", 20, k).angka).toMatchObject({ habis: 150, persen30: 20 });
  });
  test("kelas: uang menunggu paling lama dua putaran, berapa pun kapasitas dan promo", () => {
    for (const c of [1, 4, 8, 20]) for (const laju of ["bebas", "5"] as const) {
      expect(jalankanAntrean("dengan", laju, c, k).angka.tunggu).toBeCloseTo(2 * k.putaran, 10);
    }
  });
  test("tanpa kelas: uang menunggu semua promo; laju dibatasi menghapus antrean selama kapasitas melebihi laju", () => {
    expect(jalankanAntrean("tanpa", "bebas", 4, k).angka.tunggu).toBe(750);
    expect(jalankanAntrean("tanpa", "5", 4, k).angka.tunggu).toBeCloseTo(2 * k.putaran, 10);
    expect(jalankanAntrean("tanpa", "5", 1, k).angka.tunggu as number).toBeGreaterThan(2 * k.putaran);
  });
  test("laju 5 per detik: promo habis dalam 2.000 detik, sisa kapasitas dan kelipatan puncak", () => {
    const h = jalankanAntrean("dengan", "5", 4, k);
    expect(h.angka.habis).toBe(2000);
    expect(Math.round((h.angka.sisa as number) * 100) / 100).toBe(8.33);
    expect(jalankanAntrean("dengan", "5", 1, k).angka.habis).toBeCloseTo(k.nPromo / (1 / k.t), 6);
  });
  test("pengirim serentak untuk 95% dalam jendela dihitung dari t, bukan diketik", () => {
    expect(jalankanAntrean("tanpa", "bebas", 4, k).angka.butuh95).toBeCloseTo(95, 10);
    expect(jalankanAntrean("tanpa", "bebas", 4, { ...k, t: 0.6 }).angka.butuh95).toBeCloseTo(190, 10);
  });
  test("alert semua kelas bunyi walau uang tepat waktu (queue.txt E)", () => {
    const h = jalankanAntrean("dengan", "bebas", 4, k).angka;
    expect(h.umurSemua).toBe(30);
    expect(h.umurUang).toBe(0);
  });
  test("tebakan 4 persen", () => {
    expect(jawabanTebak("antrean", k)).toBe(4);
  });
});

describe("acuan per konfigurasi", () => {
  test("setiap titik rekaman menghasilkan jenis rekaman, selebihnya bukan", () => {
    for (const t of TITIK) expect(acuanDari(t.skenario, t.konfig)).toEqual({ jenis: "rekaman", sumber: t.sumber });
    expect(acuanDari("ulang", { penyebab: "push-503", batas: "8" }).jenis).toBe("hitungan");
    expect(acuanDari("antrean", { kelas: "tanpa", laju: "5", c: "20" }).jenis).toBe("hitungan");
    expect(acuanDari("kursor", { poller: "klaim", urutan: "berurutan" }).jenis).toBe("hitungan");
    // Klaim 10 detik tidak direkam: Asumsi. Satu push menggantung bukan bagian rekaman: ganda.txt D merekam dua HP dan dua worker.
    expect(acuanDari("ganda", { varian: "dua-hp-klaim-10", penyaring: "mati" })).toEqual({ jenis: "asumsi", sumber: "ganda.txt A" });
    expect(acuanDari("ganda", { varian: "dua-hp-klaim-10", penyaring: "hidup" }).jenis).toBe("asumsi");
    expect(acuanDari("cara", { cara: "outbox", kejadian: "push-menggantung" }).jenis).toBe("hitungan");
  });
  test("semua knob terdaftar", () => {
    expect(Object.keys(KNOB).sort()).toEqual([...SEMUA].sort());
  });
});
