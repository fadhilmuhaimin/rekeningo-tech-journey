// Penjaga teks dan data widget cache dan invalidation (W3-cache, keputusan 986): setiap angka yang dibaca pembaca berasal dari
// rekaman atau pengaturan yang dites; tidak ada angka rekaman yang ditulis tangan di data widget. Uji mutasi: satu label atau
// satu angka di data widget diubah, tes harus gagal.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { aturanDari, bacaRekaman, daftarAcuan } from "./rekaman";
import { isi, ringkas } from "./logika";
import { LabelCache } from "./skema";
import { isiSebagian, nilaiBuild, periksaTombol, siapkanTeks } from "./teks";
import labelMentah from "../../../data/widget/t3-cache-invalidation.json";

const DIR = path.resolve(__dirname, "../../../../labs/t3-cache/output");
const baca = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const R = bacaRekaman(baca("memori.txt"), baca("redis.txt"), baca("gagal.txt"), baca("beban.txt"));
const A = aturanDari(R);
const acuan = daftarAcuan(R);
const L = LabelCache.parse(labelMentah);
const T = siapkanTeks(L, R, acuan);

/** Semua string dengan jalurnya di data widget. */
function daun(x: unknown, jalur = ""): [string, string][] {
  if (typeof x === "string") return [[jalur, x]];
  if (Array.isArray(x)) return x.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => daun(v, jalur ? `${jalur}.${k}` : k));
  return [];
}
const SEMUA = daun(labelMentah);
// Nama yang diisi island saat dijalankan; sisanya diisi saat build dari rekaman.
const RUNTIME = new Set(["x", "lama", "apa", "Apa", "n", "stale", "k", "l", "isi", "nama", "horizon", "ttl", "awalX", "awal", "kiniX", "kini", "harga", "stok", "cara"]);
const nama = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
const BUILD = nilaiBuild(R);

describe("data widget: tidak ada angka rekaman yang ditulis tangan", () => {
  it("angka di teks hanya 0, 1 di tempat yang dikenal, dan nilai tombol TTL dan instance", () => {
    const dibolehkan = (jalur: string, token: string): boolean => {
      if (/^pilihNilai\.(ttl|instance)\[\d\]\.label$/.test(jalur)) return true;
      return token === "0";
    };
    const liar = SEMUA.flatMap(([jalur, t]) =>
      [...t.replace(/\{\w+\}/g, "").replace(/t3-cache/g, "").matchAll(/\d+(?:[.,]\d+)?/g)].filter((m) => !dibolehkan(jalur, m[0])).map((m) => `${jalur}: ${m[0]}`),
    ).filter((s) => !/\.txt/.test(s));
    // Nama file rekaman (memori.txt B) tidak berangka; jalur yang masih memuat angka adalah kebocoran.
    expect(liar).toEqual([]);
  });
  it("setiap {nama} dikenal: diisi saat build dari rekaman atau diisi island", () => {
    for (const [jalur, t] of SEMUA) for (const n of nama(t)) expect(n in BUILD || RUNTIME.has(n) || n === "detik", `${jalur}: {${n}}`).toBe(true);
  });
  it("teks yang diisi saat build tidak menyisakan kurung kurawal, selain {k} dan {l} milik island", () => {
    const sisa = [
      T.pertanyaan, ...T.pilihan.flatMap((p) => [p.teks, p.alasan]), ...T.opsi.kejadian.map((o) => o.label), ...Object.values(T.acuanTeks),
      ...Object.values(T.catatan), ...T.asal.butir, T.hitungan.bacaKunciNilai.tanpa,
    ].filter((t) => /[{}]/.test(t));
    expect(sisa).toEqual([]);
    expect(nama(T.hitungan.bacaKunciNilai.memori)).toEqual(["k"]);
    expect(nama(T.hitungan.bacaKunciNilai.redis)).toEqual(["k"]);
    expect(nama(T.hitungan.bebanNilai)).toEqual(["l"]);
  });
  it("ID riset tidak tampil ke pembaca", () => {
    const semua = [...SEMUA.map(([, t]) => t), T.pertanyaan, ...Object.values(T.acuanTeks), ...Object.values(T.catatan), ...T.asal.butir];
    for (const t of semua) expect(t).not.toMatch(/\bR\d-\d+/);
  });
  it("tanpa kata yang dilarang audit bahasa, tanpa tanda seru dan emoji", () => {
    const larang = /\b(basi|klien\w*|berkas\w*|pengguna|pemakai|Anda|kita|murah|mahal|bocor\w*)\b|!|\p{Extended_Pictographic}/iu;
    for (const [jalur, t] of SEMUA) expect(t.replace(/\{\w+\}/g, ""), jalur).not.toMatch(larang);
  });
  it("kalimat tidak lebih dari 25 kata", () => {
    for (const [jalur, t] of SEMUA) for (const k of t.split(/(?<=[.?])\s+/)) expect(k.split(/\s+/).length, `${jalur}: ${k}`).toBeLessThanOrEqual(25);
  });
});

describe("kalimat vonis (role=status) satu kalimat dan sesuai sebab", () => {
  it("tiap kalimat berakhir titik dan tanpa titik di tengah", () => {
    for (const [sebab, t] of Object.entries(L.vonis)) {
      expect(t, sebab).toMatch(/\.$/);
      expect(t.slice(0, -1), sebab).not.toMatch(/\.(\s|$)/);
    }
  });
  it("sebab yang menyebut lama memuat {lama}, yang tidak, tidak", () => {
    const denganLama = ["tidak-diberi-tahu", "diisi-ulang", "hapus-gagal", "tanpa-tulis"];
    for (const [sebab, t] of Object.entries(L.vonis)) expect(t.includes("{lama}"), sebab).toBe(denganLama.includes(sebab));
  });
  it("tiap sebab di model punya kalimat", () => {
    const sebab = new Set(Object.keys(L.vonis));
    for (const s of ["tanpa-cache", "dihapus-sendiri", "dihapus-bersama", "entri-habis-dulu", "tidak-diberi-tahu", "diisi-ulang", "hapus-gagal", "tanpa-tulis"]) expect(sebab.has(s)).toBe(true);
    expect(sebab.size).toBe(8);
  });
  it("kalimat vonis pengaturan awal menyebut lama dari rekaman", () => {
    const r = ringkas(daftarAcuan(R)[0]!.param, A);
    expect(isi(L.vonis[r.sebab], { x: "B", lama: r.lama, apa: "harga", Apa: "Harga" })).toBe(`Instance B tidak diberi tahu dan melihat harga lama selama ${R.memori.baruMulai} detik, sampai entrinya habis oleh TTL.`);
  });
});

describe("tebakan dan tombol", () => {
  it("tepat satu pilihan benar, sisanya berdetik beda; pilihan tidak lebih dari empat", () => {
    expect(L.pilihan.length).toBeLessThanOrEqual(4);
    expect(L.pilihan.filter((p) => p.detik === R.memori.baruMulai)).toHaveLength(1);
    expect(T.benar).toBe(L.pilihan.findIndex((p) => p.detik === R.memori.baruMulai));
  });
  it("tiap tombol pengaturan unik per kelompok, dan tiap titik rekaman bisa dipilih", () => {
    for (const k of Object.keys(L.pilihNilai) as (keyof typeof L.pilihNilai)[]) {
      const label = L.pilihNilai[k].map((o) => o.label);
      expect(new Set(label).size, k).toBe(label.length);
      const nilai = L.pilihNilai[k].map((o) => o.nilai);
      expect(new Set(nilai).size, k).toBe(nilai.length);
    }
    expect(() => periksaTombol(L, R)).not.toThrow();
  });
  it("tombol yang hilang menggagalkan build", () => {
    const tanpaTtl = structuredClone(L);
    tanpaTtl.pilihNilai.ttl = tanpaTtl.pilihNilai.ttl.filter((o) => o.nilai !== R.redis.nanti.ttl);
    expect(() => periksaTombol(tanpaTtl, R)).toThrow(/tombol untuk pengaturan/);
    const tanpaUrutan = structuredClone(L);
    tanpaUrutan.pilihNilai.urutan = tanpaUrutan.pilihNilai.urutan.filter((o) => o.nilai !== "lambat");
    expect(() => periksaTombol(tanpaUrutan, R)).toThrow(/redis-lambat/);
    const labelSalah = structuredClone(L);
    labelSalah.pilihNilai.ttl[2]!.label = "301";
    expect(() => periksaTombol(labelSalah, R)).toThrow(/label TTL/);
  });
  it("angka di pilihan dan alasan diubah: tebakan benar bergeser atau gagal", () => {
    const m = structuredClone(L);
    m.pilihan[2]!.detik = 299;
    expect(() => siapkanTeks(m, R, acuan)).toThrow(/tebakan/);
    const dua = structuredClone(L);
    dua.pilihan[1]!.detik = R.memori.baruMulai;
    expect(() => siapkanTeks(dua, R, acuan)).toThrow(/2 pilihan/);
  });
  it("templat dengan nama yang tidak diisi menggagalkan build", () => {
    const m = structuredClone(L);
    m.acuan["memori-promo"] += " {tidakAda}";
    expect(() => siapkanTeks(m, R, acuan)).toThrow(/tidakAda/);
  });
  it("isiSebagian membiarkan nama island", () => {
    expect(isiSebagian("{n} dan {bacaDb}", { bacaDb: 2 })).toBe("{n} dan 2");
  });
});

describe("island tidak memuat berkas build", () => {
  it("CacheInvalidation.tsx tidak mengimpor Zod, rekaman, skema, atau teks (ukuran JS)", () => {
    const sumber = fs.readFileSync(path.resolve(__dirname, "CacheInvalidation.tsx"), "utf8");
    const impor = [...sumber.matchAll(/\bfrom "([^"]+)";/g)].map((m) => m[1]!);
    expect(impor.sort()).toEqual(["../../gerak/muncul", "./logika", "react"]);
    expect(sumber).not.toMatch(/Math\.random|Date\.now|setInterval|setTimeout|requestAnimationFrame/);
  });
});
