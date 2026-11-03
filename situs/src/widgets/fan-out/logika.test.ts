// Tes logika murni widget fan-out (W5-fanout): rumus model, pembulatan, pemformatan, pemilihan rekaman, dan bentuk data (skema Zod).
// Harapan ditulis dari aturan model di komentar logika.ts dan rumus naskah, bukan dari fungsi yang diuji.
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-fanout.json";
import { DataFanOut } from "./skema";
import { acuanUntuk, angka, bulat, durasiTeks, hitung, indeksPengirim, isi, jawabanTebak, nilaiPengirim, penerimaDari, pengirimDari, persenTeks, ribuan, ringkasan, selTeks } from "./logika";

const d = DataFanOut.parse(mentah);
const N = (id: string) => penerimaDari(d, id);
const P = (id: string) => pengirimDari(d, id);

describe("format angka", () => {
  it("bulat membulatkan setengah ke atas seperti pembaca, bukan seperti toFixed", () => {
    expect(bulat(8.685, 2)).toBe(8.69);
    expect((0.579 * 15).toFixed(2)).toBe("8.68"); // pembanding: toFixed memakai nilai biner 8,684999..., jadi bulat tidak memakainya
    expect(bulat(0.579 * 15, 2)).toBe(8.69);
    expect(bulat(2.5)).toBe(3);
    expect(bulat(1.4999)).toBe(1);
  });
  it("ribuan memakai titik; angka memakai koma satu desimal tanpa ',0' dan tanpa desimal dari seribu ke atas", () => {
    expect(ribuan(1000000)).toBe("1.000.000");
    expect(ribuan(10281)).toBe("10.281");
    expect(ribuan(999)).toBe("999");
    expect(angka(556.69)).toBe("556,7");
    expect(angka(13.3333)).toBe("13,3");
    expect(angka(40)).toBe("40");
    expect(angka(75.2)).toBe("75,2");
    expect(angka(16666.67)).toBe("16.667");
    expect(angka(1000)).toBe("1.000");
  });
  it("persen: satu desimal di bawah 100, bulat dari 100 ke atas", () => {
    expect(persenTeks(6.319)).toBe("6,3%");
    expect(persenTeks(0.885)).toBe("0,9%");
    expect(persenTeks(99.95)).toBe("100%");
    expect(persenTeks(167.419)).toBe("167%");
  });
  it("durasi: detik di bawah 120, menit sampai 10.000 detik (satu desimal di bawah 100 menit), selebihnya jam", () => {
    expect(durasiTeks(100.757)).toBe("101 detik");
    expect(durasiTeks(119.4)).toBe("119 detik");
    expect(durasiTeks(120)).toBe("2 menit");
    expect(durasiTeks(1796.4)).toBe("29,9 menit");
    expect(durasiTeks(7500)).toBe("125 menit");
    expect(durasiTeks(9375)).toBe("156 menit");
    expect(durasiTeks(9999)).toBe("167 menit");
    expect(durasiTeks(10000)).toBe("2,8 jam");
    expect(durasiTeks(12500)).toBe("3,5 jam");
    expect(durasiTeks(75000)).toBe("20,8 jam");
  });
  it("isi menolak templat yang memakai nama tanpa nilai", () => {
    expect(isi("{a} dan {b}", { a: 1, b: "x" })).toBe("1 dan x");
    expect(() => isi("{a} dan {c}", { a: 1 })).toThrow(/\{c\}/);
  });
});

describe("model: consumer, partisi, laju, kuota", () => {
  // jumlah consumer = ceil(pengirim ÷ 4); partisi sebanyak consumer atau 6 di lab; bekerja = min; laju = pengirim aktif ÷ 0,3
  it("satu consumer memegang empat pengirim: 4, 12, 32, 167, 5.000 pengirim = 1, 3, 8, 42, 1.250 consumer", () => {
    expect(d.pengirim.map((p) => hitung(d, N("n1000000"), p, "sebanyak").consumer)).toEqual([1, 3, 8, 42, 1250]);
  });
  it("tebakan awal: 167 pengirim, 1.000.000 perangkat, 6 partisi: 6 dari 42 consumer bekerja, 24 pengirim, 12.500 detik", () => {
    const h = hitung(d, N("n1000000"), P("p167"), "lab");
    expect([h.partisi, h.consumer, h.bekerja, h.pengirimAktif, h.kasus]).toEqual([6, 42, 6, 24, "partisi"]);
    expect(h.laju).toBe(80);
    expect(h.detik).toBe(12500);
    expect(durasiTeks(h.detik)).toBe("3,5 jam");
  });
  it("angka naskah: 4 pengirim 20,8 jam, 32 pengirim 156 menit, 167 pengirim di bawah 30 menit, 100.000 perangkat dengan 4 pengirim 125 menit", () => {
    const s = (n: string, p: string) => durasiTeks(hitung(d, N(n), P(p), "sebanyak").detik);
    expect(s("n1000000", "p4")).toBe("20,8 jam");
    expect(s("n1000000", "p32")).toBe("156 menit");
    expect(s("n1000000", "p167")).toBe("29,9 menit");
    expect(s("n100000", "p4")).toBe("125 menit");
    expect(hitung(d, N("n1000000"), P("p167"), "sebanyak").detik).toBeLessThan(1800);
  });
  it("laju dan kuota pada 167 pengirim: 167 ÷ 0,3 = 556,7 per detik, ditambah uang 75,2 = 631,9, 6,3% dari kuota 10.000", () => {
    const h = hitung(d, N("n1000000"), P("p167"), "sebanyak");
    expect(angka(h.laju)).toBe("556,7");
    expect(angka(h.total)).toBe("631,9");
    expect(persenTeks(h.persen)).toBe("6,3%");
    expect([h.kasus, h.kelebihan, h.detikBatas]).toEqual(["cukup", 0, null]);
    expect(h.perPartisi).toBeCloseTo(23809.52, 1);
  });
  it("kuota terlampaui hanya pada 5.000 pengirim dengan partisi sebanyak consumer: laju 16.667 + 75,2 = 167%, kelebihan 6.742, selesai paling cepat 101 detik", () => {
    for (const n of d.penerima) {
      for (const p of d.pengirim) {
        for (const k of ["sebanyak", "lab"] as const) {
          const h = hitung(d, n, p, k);
          expect(h.kasus === "kuota", `${n.id} ${p.id} ${k}`).toBe(p.id === "p5000" && k === "sebanyak");
        }
      }
    }
    const h = hitung(d, N("n1000000"), P("p5000"), "sebanyak");
    expect(angka(h.laju)).toBe("16.667");
    expect(persenTeks(h.persen)).toBe("167%");
    expect(ribuan(h.kelebihan)).toBe("6.742");
    expect(h.lajuEfektif).toBeCloseTo(10000 - 75.2, 6);
    expect(durasiTeks(h.detik)).toBe("101 detik");
    // batas laju 60% kuota = 6.000 per detik: 1.000.000 ÷ 6.000 = 166,7 detik
    expect(durasiTeks(h.detikBatas!)).toBe("2,8 menit");
  });
  it("partisi lab membatasi consumer: bekerja = min(consumer, 6); consumer menganggur hanya bila consumer lebih dari 6", () => {
    for (const p of d.pengirim) {
      const h = hitung(d, N("n100000"), p, "lab");
      const consumer = Math.ceil(p.jumlah / 4);
      expect(h.bekerja).toBe(Math.min(consumer, 6));
      expect(h.kasus === "partisi").toBe(consumer > 6);
    }
  });
  it("antrean tiap partisi = perangkat ÷ partisi: 10.281 ÷ 6 = 1.714, seperti rentang di aliran.txt", () => {
    expect(ribuan(hitung(d, N("n10281"), P("p12"), "lab").perPartisi)).toBe("1.714");
    expect(ribuan(hitung(d, N("n1000000"), P("p167"), "sebanyak").perPartisi)).toBe("23.810");
    expect(ribuan(hitung(d, N("n1000000"), P("p167"), "lab").perPartisi)).toBe("166.667");
  });
  it("pengirim aktif tidak melebihi pengirim yang diminta (167 pengirim di 42 consumer = 168 tempat)", () => {
    expect(hitung(d, N("n1000000"), P("p167"), "sebanyak").pengirimAktif).toBe(167);
    for (const n of d.penerima) for (const p of d.pengirim) for (const k of ["sebanyak", "lab"] as const) expect(hitung(d, n, p, k).pengirimAktif).toBeLessThanOrEqual(p.jumlah);
  });
  it("lebih banyak pengirim tidak pernah memperlambat pengumuman (partisi sebanyak consumer)", () => {
    for (const n of d.penerima) {
      const lama = d.pengirim.map((p) => hitung(d, n, p, "sebanyak").detik);
      for (let i = 1; i < lama.length; i++) expect(lama[i]!).toBeLessThanOrEqual(lama[i - 1]!);
    }
  });
  it("dengan enam partisi, 32, 167, dan 5.000 pengirim sama lambatnya: partisi, bukan pengirim, yang membatasi", () => {
    const lama = ["p32", "p167", "p5000"].map((p) => hitung(d, N("n1000000"), P(p), "lab").detik);
    expect(new Set(lama).size).toBe(1);
  });
  it("hitung deterministik: dua panggilan sama menghasilkan objek sama", () => {
    expect(hitung(d, N("n100000"), P("p32"), "lab")).toEqual(hitung(d, N("n100000"), P("p32"), "lab"));
  });
});

describe("model: batas dan urutan kasus (data sintetis)", () => {
  const dengan = (ubah: (x: any) => void) => {
    const x = structuredClone(d) as any;
    ubah(x);
    return x as typeof d;
  };
  it("kuota terlampaui hanya bila laju + uang LEBIH dari kuota: sama persis dengan kuota belum terlampaui", () => {
    const laju = 167 / d.skenario.detikKirim;
    const pas = dengan((x) => (x.skenario.kuota = laju + d.skenario.uang));
    expect(hitung(pas, N("n1000000"), P("p167"), "sebanyak").kasus).toBe("cukup");
    const kurang = dengan((x) => (x.skenario.kuota = laju + d.skenario.uang - 0.001));
    expect(hitung(kurang, N("n1000000"), P("p167"), "sebanyak").kasus).toBe("kuota");
  });
  it("kuota terlampaui didahulukan dari partisi kurang: kuota 100 per detik, 167 pengirim, 6 partisi (laju 80 + uang 75,2)", () => {
    const sempit = dengan((x) => (x.skenario.kuota = 100));
    const h = hitung(sempit, N("n1000000"), P("p167"), "lab");
    expect([h.bekerja < h.consumer, h.kasus]).toEqual([true, "kuota"]);
  });
  it("durasi antara 100 dan 120 menit memakai menit bulat: 6.630 detik = 110,5 menit = 111 menit", () => {
    expect(durasiTeks(6630)).toBe("111 menit");
    expect(durasiTeks(5970)).toBe("99,5 menit");
  });
  it("sel Selesai dalam memakai 'paling cepat' hanya bila kuota terlampaui; sel Akibat menyebut consumer menganggur hanya bila partisi kurang", () => {
    const sel = (n: string, p: string, k: "sebanyak" | "lab", b: "selesai" | "akibat") => selTeks(d, hitung(d, N(n), P(p), k), b);
    expect(sel("n1000000", "p5000", "sebanyak", "selesai")).toBe("paling cepat 101 detik");
    expect(sel("n1000000", "p167", "lab", "selesai")).toBe("3,5 jam");
    expect(sel("n1000000", "p167", "sebanyak", "selesai")).toBe("29,9 menit");
    expect(sel("n1000000", "p167", "lab", "akibat")).toBe("36 consumer menganggur karena partisi kurang");
    expect(sel("n1000000", "p32", "lab", "akibat")).toBe("2 consumer menganggur karena partisi kurang");
    expect(sel("n1000000", "p32", "sebanyak", "akibat")).toBe("semua consumer mendapat partisi dan kuota tidak terlampaui");
  });
  it("ringkasan memakai templat kuota hanya bila partisi sebanyak consumer melewati kuota, dan menyebut partisi lab dan lamanya", () => {
    expect(ringkasan(d, N("n1000000"), P("p5000"))).toContain("melewati kuota 10.000");
    expect(ringkasan(d, N("n1000000"), P("p167"))).not.toContain("melewati kuota");
    expect(ringkasan(d, N("n1000000"), P("p167"))).toContain("dengan 6 partisi dalam 3,5 jam");
    expect(ringkasan(d, N("n1000000"), P("p5000"))).toContain("dengan 6 partisi selesai dalam 3,5 jam");
  });
});

describe("pemilihan rekaman dan teks bentuk", () => {
  const pilih = (n: string, p: string) => acuanUntuk(d, N(n), P(p)).map((a) => `${a.berkas} ${a.bagian}`);
  it("rekaman lab: 10.281 perangkat memuat aliran A; 4 pengirim pengirim B; 12 pengirim grup A", () => {
    expect(pilih("n10281", "p4")).toEqual(["aliran.txt A", "pengirim.txt B"]);
    expect(pilih("n100000", "p12")).toEqual(["grup.txt A"]);
    expect(pilih("n10281", "p12")).toEqual(["aliran.txt A", "grup.txt A"]);
  });
  it("Asumsi: 32 pengirim pengirim A; 167 dan 5.000 pengirim hanya untuk 1.000.000 perangkat", () => {
    expect(pilih("n100000", "p32")).toEqual(["pengirim.txt A"]);
    expect(pilih("n1000000", "p167")).toEqual(["pengirim.txt A"]);
    expect(pilih("n100000", "p167")).toEqual([]);
    expect(pilih("n10281", "p167")).toEqual(["aliran.txt A"]);
  });
  it("kuota terlampaui menambah kuota.txt A dan B, pada semua jumlah perangkat", () => {
    expect(pilih("n1000000", "p5000")).toEqual(["pengirim.txt A", "kuota.txt A", "kuota.txt B"]);
    expect(pilih("n100000", "p5000")).toEqual(["kuota.txt A", "kuota.txt B"]);
    expect(pilih("n1000000", "p32").some((x) => x.startsWith("kuota"))).toBe(false);
  });
  it("hanya jenis rekaman dan asumsi; Asumsi hanya untuk berkas pengirim.txt A (hitungan naskah)", () => {
    for (const a of d.acuan) if (a.jenis === "asumsi") expect([a.berkas, a.bagian]).toEqual(["pengirim.txt", "A"]);
    expect(new Set(d.acuan.map((a) => a.jenis))).toEqual(new Set(["rekaman", "asumsi"]));
  });
  it("nilai aria penggeser memuat pengirim dan consumer; indeks pengirim sesuai urutan", () => {
    expect(nilaiPengirim(d, P("p167"))).toBe("167 pengirim, 42 consumer");
    expect(nilaiPengirim(d, P("p5000"))).toBe("5.000 pengirim, 1.250 consumer");
    expect(d.pengirim.map((p) => indeksPengirim(d, p.id))).toEqual([0, 1, 2, 3, 4]);
  });
  it("jawaban tebakan: tepat atau belum, diikuti alasan", () => {
    expect(jawabanTebak(d, d.tebak.jawaban)).toBe(`Tebakanmu tepat. ${d.tebak.alasan}`);
    expect(jawabanTebak(d, (d.tebak.jawaban + 1) % 4)).toBe(`Tebakanmu belum tepat. ${d.tebak.alasan}`);
  });
  it("keadaan sesudah tebakan sama dengan yang ditanyakan: 1.000.000 perangkat dan 167 pengirim", () => {
    expect([d.awal.penerima, d.awal.pengirim]).toEqual(["n1000000", "p167"]);
  });
});

describe("skema data", () => {
  const ubah = (f: (x: any) => void) => {
    const x = structuredClone(mentah) as any;
    f(x);
    return DataFanOut.safeParse(x);
  };
  it("data asli lolos", () => expect(DataFanOut.safeParse(mentah).success).toBe(true));
  it("menolak kunci asing, id ganda, jumlah tidak naik, penerima awal tak dikenal, dan jawaban di luar pilihan", () => {
    expect(ubah((x) => (x.asing = 1)).success).toBe(false);
    expect(ubah((x) => (x.pengirim[1].id = x.pengirim[0].id)).success).toBe(false);
    expect(ubah((x) => (x.pengirim[2].jumlah = 5)).success).toBe(false);
    expect(ubah((x) => (x.awal.penerima = "nxx")).success).toBe(false);
    expect(ubah((x) => (x.tebak.jawaban = 4)).success).toBe(false);
  });
  it("menolak acuan ke pilihan yang tidak ada dan templat yang kehilangan nama", () => {
    expect(ubah((x) => (x.acuan[0].penerima = "nxx")).success).toBe(false);
    expect(ubah((x) => (x.acuan[1].pengirim = "pxx")).success).toBe(false);
    expect(ubah((x) => (x.label.sel.kuota = "{persen} dari kuota")).success).toBe(false);
    expect(ubah((x) => (x.label.ringkas.kuota = x.label.ringkas.kuota.replace("{laju}", ""))).success).toBe(false);
    expect(ubah((x) => (x.label.acuanBerkas = "{berkas}")).success).toBe(false);
  });
  it("menolak batas laju 100% atau lebih dan acuan jenis lain", () => {
    expect(ubah((x) => (x.skenario.batasPersen = 100)).success).toBe(false);
    expect(ubah((x) => (x.acuan[0].jenis = "ilustrasi")).success).toBe(false);
    expect(ubah((x) => (x.penerima = x.penerima.slice(1))).success).toBe(false);
  });
});
