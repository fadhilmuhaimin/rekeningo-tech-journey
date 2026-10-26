// Penjaga halaman 3.18 (keputusan 1068 sampai 1070): angka, harga, stok, hitungan beban, ID `[[...]]`, nomor ADR, label sumber, rentang
// Snippet, klaim "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, skenario alur t3-m23.json, dan kartu Cek diri di
// m23-dua-harga.mdx diturunkan dari rekaman labs/t3-cache (memori.txt, redis.txt, beban.txt), kode lab labs/api-t3 (cache, katalog_cache.go,
// katalog.go, repo/katalog.go, cmd/api/cache.go), run.py lab, registry (cerita.json), naskah Tahap 3, baris riset R3-37 dan R3-69, dan halaman
// tetangga (2.31, 3.15). Nilai diturunkan di tes ini, bukan dari daftar yang ditulis ulang. Seluruh kalimat halaman dan seluruh data widget
// dikunci lewat file snapshot di __teks__: mengubah satu kata menggagalkan tes, dan itu tanda untuk meninjau klaimnya terhadap sumber.
// Snapshot tidak menangkap SALAHNYA kalimat yang terkunci, jadi klaim yang mudah keliru (hanya satu instance yang membuang entri, pesanan
// membaca database, tertinggalnya tepat TTL, "tidak ada app Flutter") dijaga tes khusus yang membaca kode dan rekaman.
// Tes hanya membaca file yang dilacak git (bukan hasil build atau binari lokal, pelajaran 3.2).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const terlacak = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: akar, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean),
);
const baca = (rel: string): string => {
  if (!terlacak.has(rel)) throw new Error(`${rel} tidak dilacak git: tes tidak boleh membaca hasil build atau file lokal`);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-3/m23-dua-harga.mdx";
const mdx = baca(HALAMAN);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const memoriTeks = baca("labs/t3-cache/output/memori.txt");
const redisTeks = baca("labs/t3-cache/output/redis.txt");
const bebanTeks = baca("labs/t3-cache/output/beban.txt");
const memori = memoriTeks.split("\n");
const redis = redisTeks.split("\n");
const beban = bebanTeks.split("\n");
const runPy = baca("labs/t3-cache/run.py");
const readmeLab = baca("labs/t3-cache/README.md");
const cacheGo = baca("labs/api-t3/internal/cache/cache.go");
const cmdCacheGo = baca("labs/api-t3/cmd/api/cache.go");
const katalogCacheGo = baca("labs/api-t3/internal/service/katalog_cache.go");
const katalogGo = baca("labs/api-t3/internal/service/katalog.go");
const repoKatalogGo = baca("labs/api-t3/internal/repo/katalog.go");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const hal315 = baca("situs/src/content/docs/tahap-3/dua-instance.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const diagramMentah = JSON.parse(baca("situs/data/diagram/t3-m23-dua-harga.json")) as unknown;
const rantai = DataRantai.parse(diagramMentah);
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t3-m23.json");

interface Layar { judul?: string; waktu?: string; nada?: string; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
interface Langkah { dari: string; ke?: string; lapisan?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, Layar> }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string; lapisan?: string[] }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
const skenario = JSON.parse(skenarioMentah) as Skenario;
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const fmt = (x: number, d = 0): string => {
  const [bulat, pecah] = x.toFixed(d).split(".");
  const ribuan = bulat!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return pecah ? `${ribuan},${pecah}` : ribuan;
};
const rp = (n: number): string => `Rp${fmt(n)}`;
const nomor = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && cocok(b));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const bagian = (baris: string[], huruf: string): string[] => {
  const i = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(i, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const j = baris.findIndex((b, n) => n > i && b.startsWith("# --- "));
  return baris.slice(i, j < 0 ? undefined : j);
};
const awal = (baris: string[], huruf: string): number => nomor(baris, (b) => b.startsWith(`# --- ${huruf}. `));
const terakhirIsi = (baris: string[], sampaiIdx = baris.length): number => {
  let i = sampaiIdx;
  while (baris[i - 1]!.trim() === "") i--;
  return i;
};
interface Bacaan { siapa: string; inst: string; nama: string; harga: number; harga_efektif: number; stok: number; versi: number }
const bacaanKatalog = (b: string[]): Bacaan[] =>
  b.flatMap((l) => {
    const m = l.match(/^(Budi|Citra) +lewat instance ([AB]): GET \/katalog\?warung=418 -> (\{[^}]*\})/);
    return m ? [{ siapa: m[1]!, inst: m[2]!, ...(JSON.parse(m[3]!) as Omit<Bacaan, "siapa" | "inst">) }] : [];
  });
interface Stat { inst: string; hit: number; miss: number; db: number; hapus: number; galat: number }
const statistik = (b: string[]): Stat[] =>
  b.flatMap((l) => {
    const m = l.match(/^instance ([AB]): hit (\d+), miss (\d+), baca database (\d+), kunci dihapus (\d+), galat cache (\d+)/);
    return m ? [{ inst: m[1]!, hit: +m[2]!, miss: +m[3]!, db: +m[4]!, hapus: +m[5]!, galat: +m[6]! }] : [];
  });
interface BarisDb { produk: number; harga: number; efektif: number; stok: number; versi: number }
const barisDb = (b: string[]): BarisDb[] =>
  b.flatMap((l) => {
    const m = l.match(/^ (\d+) +\| (\d+) +\| (\d+) +\| (\d+) +\| (\d+)$/);
    return m ? [{ produk: +m[1]!, harga: +m[2]!, efektif: +m[3]!, stok: +m[4]!, versi: +m[5]! }] : [];
  });

// ---- rekaman memori.txt: semua harga, stok, dan hitungan halaman diturunkan dari sini -----------------------------------------
const mA = bagian(memori, "A");
const mB = bagian(memori, "B");
const mC = bagian(memori, "C");
const mD = bagian(memori, "D");
const bacA = bacaanKatalog(mA);
const bacB = bacaanKatalog(mB);
const bacC = bacaanKatalog(mC);
const bacD = bacaanKatalog(mD);
const statA = statistik(mA);
const statB = statistik(mB);
const statD = statistik(mD);
const dbB = barisDb(mB)[0]!;
const dbC = barisDb(mC)[0]!;
const pesanan = JSON.parse(mC.find((l) => l.startsWith('{"id":'))!) as { id: number; saldo: number; nominal: number; harga_satuan: number; potongan_persen: number; stok_sisa: number };
const ttlDetik = Number(cmdCacheGo.match(/BaruMemori\(jam\), (\d+)\*time\.Minute/)![1]) * 60;
const rC = bagian(redis, "C");
const rA = bagian(redis, "A");
const bacRC = bacaanKatalog(rC);
const bacRA = bacaanKatalog(rA);
const statRA = statistik(rA);

// ---- rentang Snippet diturunkan dari isi rekaman dan kode -----------------------------------------------------------------------
const kodeBaris = (teks: string): string[] => teks.split("\n");
const tutupFungsi = (baris: string[], dariIdx: number): number => {
  const i = baris.findIndex((b, n) => n > dariIdx && b === "}");
  expect(i).toBeGreaterThan(dariIdx);
  return i + 1;
};
const barisCache = kodeBaris(cacheGo);
const barisKatalogCache = kodeBaris(katalogCacheGo);
const barisRepo = kodeBaris(repoKatalogGo);
const memori0 = nomor(barisCache, (b) => b.startsWith("// Memori menyimpan entri di peta di dalam proses."));
const hapusKota0 = nomor(barisKatalogCache, (b) => b.startsWith("// hapusKatalogKota:"));
const kunci0 = nomor(barisRepo, (b) => b.includes("--8<-- [start:kunci-produk]")) + 1;
const kunci1 = nomor(barisRepo, (b) => b.includes("--8<-- [end:kunci-produk]")) - 1;
const RENTANG = {
  memoriA: `${awal(memori, "A")}:${terakhirIsi(memori, awal(memori, "B") - 1)}`,
  memoriB: `${awal(memori, "B")}:${terakhirIsi(memori, awal(memori, "C") - 1)}`,
  memoriC: `${awal(memori, "C")}:${terakhirIsi(memori, awal(memori, "D") - 1)}`,
  memoriD: `${awal(memori, "D")}:${terakhirIsi(memori)}`,
  memoriSemua: `${awal(memori, "A")}:${terakhirIsi(memori)}`,
  struktur: `${memori0}:${tutupFungsi(barisCache, memori0)}`,
  hapusKota: `${hapusKota0}:${tutupFungsi(barisKatalogCache, hapusKota0)}`,
  kunciProduk: `${kunci0}:${terakhirIsi(barisRepo, kunci1)}`,
};
const SNIPPET_DIHARAPKAN: [string, string, string][] = [
  ["labs/t3-cache/output/memori.txt", RENTANG.memoriA, "Rekaman lab"],
  ["labs/api-t3/internal/cache/cache.go", RENTANG.struktur, "Kode lab"],
  ["labs/t3-cache/output/memori.txt", RENTANG.memoriB, "Rekaman lab"],
  ["labs/api-t3/internal/service/katalog_cache.go", RENTANG.hapusKota, "Kode lab"],
  ["labs/t3-cache/output/memori.txt", RENTANG.memoriC, "Rekaman lab"],
  ["labs/api-t3/internal/repo/katalog.go", RENTANG.kunciProduk, "Kode lab"],
  ["labs/t3-cache/output/memori.txt", RENTANG.memoriD, "Rekaman lab"],
  ["labs/t3-cache/output/memori.txt", RENTANG.memoriSemua, "Rekaman lab"],
];

describe("registry, meta, blok, widget, dan tautan", () => {
  test("3.18 ada, masalah, bukan jalur inti, lab t3-cache, prasyarat 3.17, peran backend; menit sama dengan baris meta; peta naskah memakai widget alur", () => {
    expect(dari("t3-m23")).toMatchObject({ ada: true, nomor: "3.18", jenis: "masalah", prasyarat: ["t3-rate-limit-redis"], lab: ["t3-cache"], peran: ["backend"], tahap: 3, label: "Masalah 23 · minggu 6" });
    expect(dari("t3-m23").inti).toBeUndefined();
    expect(dari("t3-m23").judul).toBe("M23: Dua harga di satu meja");
    expect(mdx).toContain(`title: "3.18 ${dari("t3-m23").judul}"`);
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe(
      "Minggu 6. HR menyalakan promo pukul 11.30, lalu HP Budi menampilkan nasi goreng Rp22.500 dan HP Citra di meja yang sama Rp25.000. Cache katalog di memori tiap instance hanya dibuang di instance yang menerima promo.",
    );
    expect(naskah).toContain("| 3.18 | 4 | M23: Dua harga di satu meja | Masalah |  | t3-cache | alur |");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-rate-limit-redis\]\]<\/p>/);
    expect(m, "baris meta tanpa Jalur inti").not.toBeNull();
    expect(dari("t3-m23").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(dari("t3-rate-limit-redis").nomor).toBe("3.17");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah; dua pertama terbuka; satu widget alur di blok Coba, satu noscript nyata di luar komentar", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba sendiri"'), badan.indexOf('<Blok nama="Konsep yang lahir"'));
    expect(coba.match(/<WidgetLama nama="alur" src="data\/skenario\/t3-m23\.json" \/>/g)).toHaveLength(1);
    expect(coba.match(/<WidgetLama /g)).toHaveLength(1);
    expect(coba.match(/<noscript>\n[\s\S]+?\n<\/noscript>/g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<SkripLama daftar=\{\["hp","alur-core","alur"\]\} \/>/g)).toHaveLength(1);
    expect(badan).toContain('import duaHarga from "../../../../data/diagram/t3-m23-dua-harga.json";');
    expect(badan.match(/<Rantai data=\{duaHarga\} \/>/g)).toHaveLength(1);
    harus("**Ubah satu hal: satu Redis untuk kedua instance**");
  });
  test("tautan [[id]]: himpunan, jumlah pemakaian, nomor dan judul sama dengan peta naskah dan registry; janji halaman tetangga ditepati", () => {
    const hitung: Record<string, number> = {};
    for (const x of badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) hitung[x[1]!] = (hitung[x[1]!] ?? 0) + 1;
    expect(hitung).toEqual({ A0: 1, "t3-cache": 3, "t3-dua-instance": 3, "t3-m22": 1, "t2-adr-21": 1, "t3-rate-limit-redis": 1 });
    const sesuai: [string, string, string, number[]?][] = [
      ["t3-cache", "3.19", "Cache dan invalidation + ADR 28", [28]],
      ["t3-dua-instance", "3.15", "Dua instance di belakang proxy + ADR 26", [26]],
      ["t3-m22", "3.16", "M22: Batas login jadi dua kali lipat"],
      ["t2-adr-21", "2.31", "ADR 21: Sengaja belum dilakukan", [21]],
      ["t3-rate-limit-redis", "3.17", "Rate limit lintas instance dan Redis + ADR 27", [27]],
    ];
    for (const [idh, nomorHal, judul, adr] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomorHal);
      expect(dari(idh).judul.startsWith(judul.slice(0, 14)), `${idh} di registry`).toBe(true);
      if (adr) expect(dari(idh).adr).toEqual(adr);
      if (nomorHal.startsWith("3.")) expect(naskah, `${nomorHal} di peta`).toMatch(new RegExp(`\\| ${nomorHal.replace(".", "\\.")} \\| \\d+ \\| ${judul.split(" + ")[0]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    // Nomor ADR yang disebut halaman: 21 (pemicu cache), 26 (dua instance), 28 (cache).
    expect([...new Set([...badan.matchAll(/ADR (\d+)/g)].map((x) => Number(x[1])))].sort((a, b) => a - b)).toEqual([21, 26, 28]);
    // 3.15 sudah menjanjikan halaman ini: pre-mortem 3 menyebut cache katalog stale dan menaut 3.16 dan 3.18.
    expect(hal315).toContain("Cache katalog di memori menjadi stale di satu instance.");
    expect(hal315).toContain("([[t3-m22]], [[t3-m23]])");
    expect(hal315).toContain("dan dibahas di [[t3-m22]] dan [[t3-m23]].");
    // Kalimat penaut ke halaman lain.
    harus("Instance kedua datang lewat [[t3-dua-instance]].");
    harus("ADR 21 membuka cache bila L kelas itu mencapai 5 koneksi ([[t2-adr-21]]).");
    harus("Apakah cache dipasang sama sekali dibahas di [[t3-cache]].");
    harus("- [[t3-m22]]: masalah dengan sebab yang sama.");
  });
});

describe("rekaman memori.txt: harga, stok, hitungan baca database, dan kunci yang dihapus", () => {
  test("A: empat bacaan, semuanya Rp25.000 stok 50 versi 1; tiap instance hit 1, miss 1, baca database 1, tanpa kunci dihapus", () => {
    expect(bacA.map((x) => `${x.siapa}:${x.inst}`)).toEqual(["Budi:A", "Citra:B", "Budi:A", "Citra:B"]);
    for (const x of bacA) expect([x.nama, x.harga, x.harga_efektif, x.stok, x.versi]).toEqual(["Nasi goreng", 25000, 25000, 50, 1]);
    expect(statA).toEqual([
      { inst: "A", hit: 1, miss: 1, db: 1, hapus: 0, galat: 0 },
      { inst: "B", hit: 1, miss: 1, db: 1, hapus: 0, galat: 0 },
    ]);
    expect(statA.reduce((s, x) => s + x.db, 0)).toBe(2);
    harus("Empat bacaan menghasilkan dua baca database. Tiap instance membaca database satu kali");
    expect(bacA).toHaveLength(4);
  });
  test("B: promo lewat A, A membuang satu kunci dan B nol; Budi lewat A Rp22.500, Citra lewat B Rp25.000; database Rp22.500", () => {
    expect(mB.join("\n")).toContain("HR Jakarta lewat instance A: POST /promo potongan 10%, mulai 1 menit lalu (sudah berlaku) -> 201");
    expect(statB.map((x) => [x.inst, x.hapus])).toEqual([["A", 1], ["B", 0]]);
    expect(bacB.map((x) => [x.siapa, x.inst, x.harga, x.harga_efektif, x.stok])).toEqual([["Budi", "A", 25000, 22500, 50], ["Citra", "B", 25000, 25000, 50]]);
    expect(dbB).toMatchObject({ harga: 25000, efektif: 22500, stok: 50, versi: 1 });
    harus(`Budi menerima ${rp(bacB[0]!.harga_efektif)} dari database`);
    harus(`Citra menerima ${rp(bacB[1]!.harga_efektif)} dari entri B yang stale`);
    harus(`Database menyebut ${rp(dbB.efektif)}`);
    // Satu-satunya harga selain harga dasar yang disebut halaman adalah harga promo; promo 10% = Rp25.000 × 90% = Rp22.500.
    expect(Math.floor((dbB.harga * (100 - 10)) / 100)).toBe(dbB.efektif);
    harus(`${rp(dbB.efektif)} adalah ${rp(dbB.harga)} dikurangi 10%`);
    expect([...new Set(badan.match(/Rp\d{1,3}(?:\.\d{3})*/g))].sort()).toEqual([rp(dbB.efektif), rp(dbB.harga)].sort());
  });
  test("C: pesanan ditagih Rp22.500, stok sisa 49; katalog B tetap Rp25.000 stok 50; database stok 49 versi 2", () => {
    expect(pesanan).toMatchObject({ nominal: 22500, harga_satuan: 22500, potongan_persen: 10, stok_sisa: 49 });
    expect(mC.join("\n")).toContain("HTTP/1.1 201 Created");
    expect(bacC).toHaveLength(1);
    expect([bacC[0]!.inst, bacC[0]!.harga_efektif, bacC[0]!.stok]).toEqual(["B", 25000, 50]);
    expect(dbC).toMatchObject({ harga: 25000, efektif: 22500, stok: 49, versi: 2 });
    harus(`Pesanan ditagih ${rp(pesanan.nominal)} dan stok sisa ${pesanan.stok_sisa}.`);
    harus(`Sesudah itu katalog B masih menjawab ${rp(bacC[0]!.harga_efektif)} dan stok ${bacC[0]!.stok}, sedangkan database berisi stok ${dbC.stok} dan versi ${dbC.versi}.`);
    harus(`Layar Citra menunjukkan stok ${bacC[0]!.stok} padahal database ${dbC.stok} (bagian C).`);
    harus(`Di rekaman, harga yang stale menguntungkan Citra: layarnya ${rp(bacC[0]!.harga_efektif)} dan tagihannya ${rp(pesanan.nominal)}.`);
  });
  test("D: detik ke-299 masih Rp25.000 stok 50; detik ke-300 Rp22.500 stok 49 versi 2; instance B hit 4, miss 2, baca database 2; TTL 300 detik dari kode", () => {
    expect(bacD.map((x) => [x.harga_efektif, x.stok, x.versi])).toEqual([[25000, 50, 1], [22500, 49, 2]]);
    expect(mD.join("\n")).toContain("# detik ke-299: masih entri lama");
    expect(mD.join("\n")).toContain("# detik ke-300: entri habis, dibaca dari database");
    expect(mD[0]).toContain(`TTL ${ttlDetik} detik`);
    expect(ttlDetik).toBe(300);
    expect(readmeLab).toContain("Peta di dalam proses, TTL 5 menit");
    expect(statD).toEqual([{ inst: "B", hit: 4, miss: 2, db: 2, hapus: 0, galat: 0 }]);
    harus(`Pada detik ke-${ttlDetik - 1} Citra masih menerima ${rp(bacD[0]!.harga_efektif)}, dan pada detik ke-${ttlDetik} ia menerima ${rp(bacD[1]!.harga_efektif)} dengan stok ${bacD[1]!.stok}:`);
    harus(`TTL 5 menit, yaitu ${ttlDetik} detik.`);
    harus(`TTL 5 menit, yaitu ${ttlDetik} detik. TTL adalah masa berlaku satu entri sebelum dibuang.`);
    expect([...badan.matchAll(/ke-(\d+)/g)].map((x) => Number(x[1]))).toEqual([ttlDetik - 1, ttlDetik, ttlDetik, ttlDetik, ttlDetik, ttlDetik - 1, ttlDetik]);
    expect(runPy).toContain("jam(PORT_KEDUA, base + 299_000)");
    expect(runPy).toContain("jam(PORT_KEDUA, base + 300_000)");
  });
  test("kondisi rekaman: PostgreSQL 17.11, dua proses api-t3 dengan cache memori, satu database, tanpa proxy; harga dibekukan oleh jam lab", () => {
    expect(memori[1]).toContain("PostgreSQL 17.11");
    harus("*Kondisi rekaman:* PostgreSQL 17.11 dan dua proses `api-t3` yang sama, instance A dan instance B");
    harus("masing-masing dengan cache katalog di memori dan TTL 300 detik.");
    const fn = runPy.slice(runPy.indexOf("def rekam_memori("), runPy.indexOf("# ---------- redis.txt"));
    expect(fn).toContain("for port in (PORT, PORT_KEDUA):");
    expect(fn).toContain('mulai_instance(port, cache="memori")');
    expect(fn).toContain("jam(port, base)");
    expect(runPy).toContain("d.mulai_api([*a, *args], port=port, db=DB)");
    expect(runPy).toContain('a += ["-jam-lab"]');
    expect(baca("labs/api-t3/cmd/api/main.go")).toContain('"lab saja: POST /lab/jam {\\"ms\\": ...} membekukan waktu service dan rate limit"');
    harus("Jam cache di lab dibekukan dan digeser lewat `POST /lab/jam`");
    harus("Entri B diisi pada jam yang sama dengan saat promo dibuat, jadi tertinggalnya tepat 300 detik.");
  });
});

describe("redis.txt bagian A dan C: varian satu Redis untuk kedua instance", () => {
  test("C: Budi dan Citra Rp25.000, promo lewat A, kunci tidak ada, Citra lewat B dan Budi lewat A Rp22.500; A: satu baca database untuk dua instance", () => {
    expect(bacRC.map((x) => [x.siapa, x.inst, x.harga_efektif])).toEqual([["Budi", "A", 25000], ["Citra", "B", 25000], ["Citra", "B", 22500], ["Budi", "A", 22500]]);
    expect(rC.join("\n")).toContain("HR Jakarta lewat instance A: POST /promo potongan 10%, mulai 1 menit lalu (sudah berlaku) -> 201");
    expect(rC.join("\n")).toContain("redis EXISTS katalog:1:418: 0 (SCAN katalog:1:* lalu DEL)");
    expect(redis[3]).toContain("Redis 8.10.2 (container lokal)");
    expect(statRA).toEqual([
      { inst: "A", hit: 0, miss: 1, db: 1, hapus: 0, galat: 0 },
      { inst: "B", hit: 1, miss: 0, db: 0, hapus: 0, galat: 0 },
    ]);
    expect(bacRA.map((x) => [x.siapa, x.inst, x.harga_efektif])).toEqual([["Budi", "A", 25000], ["Citra", "B", 25000]]);
    harus("Langkahnya dari `redis.txt` bagian C: A dan B membaca satu Redis, container lokal di lab.");
    harus("Dengan satu Redis untuk kedua instance, Citra juga menerima Rp22.500.");
  });
});

describe("hitungan beban katalog: rumus dari registry, naskah, dan riset; rekaman beban.txt memeriksa batas", () => {
  test("17,36 × 0,30 = 5,208 dibulatkan 5,2 baca per detik; L = 5,208 × 0,005 = 0,026; ambang 5 koneksi dari 2.31", () => {
    const a = cerita.tahap[2]!.asumsi;
    const puncak = (a.user * (a.aktif / 100) * a.req) / 86400 * a.puncak;
    const barisR37 = riset.split("\n").find((l) => l.startsWith("| R3-37 Katalog |"))!;
    expect(barisR37).toContain("30% request; 5 ms (Asumsi)");
    const persen = Number(barisR37.match(/(\d+)% request/)![1]) / 100;
    const msBaca = Number(barisR37.match(/; (\d+) ms \(Asumsi\)/)![1]);
    const baca = puncak * persen;
    const L = baca * (msBaca / 1000);
    expect([fmt(puncak, 2), fmt(baca, 3), fmt(baca, 1), fmt(L, 3)]).toEqual(["17,36", "5,208", "5,2", "0,026"]);
    harus(`${fmt(a.user)} × ${a.aktif}% × ${a.req} ÷ 86.400 × ${a.puncak} = ${fmt(puncak, 2)} request per detik (Asumsi, angka registry).`);
    harus(`Bila ${persen * 100}% request membaca katalog, hasilnya ${fmt(puncak, 2)} × ${fmt(persen, 2)} = ${fmt(baca, 3)}, dibulatkan ${fmt(baca, 1)} baca per detik.`);
    harus(`Satu baca database berlangsung ${msBaca} ms, jadi L = ${fmt(baca, 3)} × ${fmt(msBaca / 1000, 3)} = ${fmt(L, 3)} koneksi (Asumsi: ${persen * 100}% dan ${msBaca} ms).`);
    expect(naskah).toContain("| M23 | 6 |");
    expect(naskah).toContain("Beban katalog sebenarnya 5,2 baca per detik, 0,03 koneksi: cache tidak diperlukan oleh beban");
    expect(naskah).toContain("katalog: 0,026");
    const ambang = Number(hal231.match(/mencapai (\d+) koneksi/)![1]);
    expect(ambang).toBe(5);
    expect(hal231).toContain("L = λ × W untuk kelas itu mencapai 5 koneksi");
    expect(L).toBeLessThan(ambang);
    harus(`ADR 21 membuka cache bila L kelas itu mencapai ${ambang} koneksi`);
  });
  test("beban.txt B: 52 bacaan tanpa cache menjadi 52 baca database; W di bawah 20 ms dan L di bawah 0,1 koneksi dari pool 10; label batas", () => {
    const bB = bagian(beban, "B").join("\n");
    expect(bB).toContain("52 bacaan -> baca database 52, hit 0");
    expect(bB).toContain("W (waktu satu baca katalog di database, termasuk JSON) terukur di bawah 20 ms");
    expect(bB).toContain("L rata-rata (jumlah waktu baca database dibagi lama beban) terukur di bawah 0,1 koneksi dari pool 10");
    harus("Tanpa cache, 52 bacaan menjadi 52 baca database. Waktu baca tetap di bawah 20 ms dan L di bawah 0,1 koneksi dari pool 10 (Rekaman lab, batas).");
    expect(readmeLab).toContain("W per baca database di bawah 20 ms dan L rata-rata di bawah 0,1 koneksi | `beban.txt` B, batas | Rekaman lab (batas)");
  });
});

describe("kode lab: promo membuang kunci di prosesnya sendiri, Pesan membaca database, TTL dan aturan habis; klaim negatif berlingkup", () => {
  test("hapusKatalogKota hanya menyentuh cache milik prosesnya (s.kc); BuatPromo memanggilnya sesudah transaction selesai; tidak ada pemanggil lain", () => {
    const f = katalogCacheGo.slice(katalogCacheGo.indexOf("func (s Service) hapusKatalogKota("));
    expect(f.slice(0, f.indexOf("\n}\n") + 3)).toBe(
      'func (s Service) hapusKatalogKota(ctx context.Context, kota int64) {\n\tif s.kc != nil {\n\t\ts.kc.HapusAwalan(ctx, fmt.Sprintf("katalog:%d:", kota))\n\t}\n}\n',
    );
    const promo = katalogGo.slice(katalogGo.indexOf("func (s Service) BuatPromo("), katalogGo.indexOf("// DaftarPromo:"));
    expect(promo.indexOf("s.repo.DalamTx(")).toBeGreaterThan(0);
    expect(promo.indexOf("s.hapusKatalogKota(ctx, *a.KotaID)")).toBeGreaterThan(promo.indexOf("s.repo.DalamTx("));
    expect(promo).toContain("if err == nil {\n\t\ts.hapusKatalogKota(ctx, *a.KotaID)");
    // Klaim negatif berlingkup: di semua file .go non-tes labs/api-t3, hapusKatalogKota hanya didefinisikan di katalog_cache.go dan dipanggil di katalog.go.
    const pemakai = [...terlacak].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go") && baca(f).includes("hapusKatalogKota("));
    expect(pemakai.sort()).toEqual(["labs/api-t3/internal/service/katalog.go", "labs/api-t3/internal/service/katalog_cache.go"]);
    const pemanggilHapusAwalan = [...terlacak].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go") && /\.HapusAwalan\(/.test(baca(f)));
    expect(pemanggilHapusAwalan).toEqual(["labs/api-t3/internal/cache/cache.go", "labs/api-t3/internal/service/katalog_cache.go"]);
    expect(cacheGo).toContain("n, err := k.P.HapusAwalan(ctx, awalan)");
    harus("Sesudah COMMIT, pembuatan promo memanggil `hapusKatalogKota`, dan fungsi itu hanya menyentuh cache milik prosesnya sendiri (`s.kc`):");
    expect(barisCache[memori0 - 1]).toBe("// Memori menyimpan entri di peta di dalam proses. Dua instance berarti dua peta yang tidak saling tahu.");
  });
  test("Pesan: KunciProduk lalu pemeriksaan stok lalu tagihan, semuanya dari hasil KunciProduk; fungsi Pesan tidak menyentuh cache; KunciProduk membaca promo now() di database", () => {
    const pesan = katalogGo.slice(katalogGo.indexOf("func (s Service) Pesan("), katalogGo.indexOf("// --8<-- [end:pesan]"));
    const i1 = pesan.indexOf("p, err := tx.KunciProduk(ctx, produk)");
    const i2 = pesan.indexOf("if p.Stok < porsi {");
    const i3 = pesan.indexOf("h.HargaSatuan = p.Harga * int64(100-p.Potongan) / 100");
    expect(i1).toBeGreaterThan(0);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(pesan).not.toMatch(/\.kc\b|katalogDariCacheAtauDB|s\.Katalog\(|s\.repo\.Katalog\(/);
    harus("`Pesan` memanggil `KunciProduk`, yang mengunci produk dan membaca harga, stok, dan promo yang berlaku sekarang dari database:");
    harus("Tagihan memakai `p.Harga * int64(100-p.Potongan) / 100`, dan pemeriksaan stok memakai `p.Stok < porsi`.");
    harus("(dibaca dari kode; rekaman tidak memesan sampai stok habis)");
    const kunci = barisRepo.slice(kunci0 - 1, kunci1).join("\n");
    expect(kunci).toContain("FOR UPDATE OF p");
    expect(kunci).toContain("WHERE kota_id = a.kota_id AND mulai <= now() AND selesai > now()");
    expect(kunci).toContain("SEKARANG, dari database");
    // Arah terbalik (promo selesai selagi entri hidup): Katalog menyimpan harga_efektif saat entri diisi, Pesan menghitung ulang. Dibaca dari kode, tidak direkam.
    expect(repoKatalogGo).toContain("// Ini jawaban baca: boleh di-cache dan boleh basi sebentar. Harga yang ditagih dihitung ulang dari database di");
    expect(katalogCacheGo).toContain("return json.Marshal(m)");
    harus("(penalaran dari kode; tidak direkam)");
    expect(baca("labs/api-t3/output/testing.txt")).toContain("TestPesanTidakMembacaCache");
  });
  test("TTL memori 5 menit dari kode, entri habis bila jam tidak lebih awal dari waktu habis; stok hanya diubah pesanan tanpa membuang entri", () => {
    expect(cmdCacheGo).toContain("k.P, k.TTL = cache.BaruMemori(jam), 5*time.Minute");
    expect(cacheGo).toContain("if !c.kini().Before(e.sampai) {\n\t\tdelete(c.m, kunci)\n\t\treturn nil, false, nil\n\t}");
    expect(cacheGo).toContain("c.m[kunci] = entri{nilai: append([]byte(nil), nilai...), sampai: c.kini().Add(ttl)}");
    harus("Kode `Memori.Ambil` membuang entri bila jam cache tidak lebih awal dari waktu habisnya. Jadi entri yang diisi pada detik 0 habis tepat pada detik ke-300 (dibaca dari kode).");
    // Pesan tidak menghapus kunci: satu-satunya penghapus di service adalah ubah produk dan promo.
    const penghapus = [...katalogGo.matchAll(/hapusKatalog\w*\(/g)].map((x) => x[0]);
    expect(penghapus).toEqual(["hapusKatalogKota("]);
    expect(katalogGo.slice(katalogGo.indexOf("func (s Service) Pesan("), katalogGo.indexOf("// --8<-- [end:pesan]"))).not.toMatch(/hapusKatalog/);
    harus("Pesanan mengurangi stok di database tanpa membuang entri.");
  });
  test("klaim negatif: lab t3-cache dan api-t3 tidak punya app Flutter atau Dart; lab t3-cache tidak memakai proxy; tidak ada tautan eksternal di halaman", () => {
    const lingkup = [...terlacak].filter((f) => f.startsWith("labs/t3-cache/") || f.startsWith("labs/api-t3/"));
    expect(lingkup.length).toBeGreaterThan(30);
    expect(lingkup.filter((f) => /\.dart$|pubspec\.yaml$/.test(f))).toEqual([]);
    expect(lingkup.filter((f) => /caddy|nginx|traefik/i.test(f))).toEqual([]);
    expect(lingkup.filter((f) => f.startsWith("labs/t3-cache/") && /caddy|proxy/i.test(baca(f)) && !f.endsWith("README.md"))).toEqual([]);
    harus("Lab `t3-cache` tidak punya app Flutter");
    harus("Tidak ada proxy: lab memanggil A atau B langsung, supaya jelas siapa yang menjawab.");
    expect(badan).not.toMatch(/https?:\/\//);
    expect(mdx).not.toMatch(/https?:\/\//);
  });
  test("kebijakan proxy bawaan random: dari halaman 3.15, bukan klaim baru; kalimat dilabeli penalaran", () => {
    expect(hal315).toContain("yang bawaannya `random`");
    harus("Di depan keduanya, proxy memilih instance per request dengan kebijakan bawaan `random` ([[t3-dua-instance]]). Satu HP pun bisa menerima dua harga bergantian (penalaran; tidak direkam).");
  });
});

describe("Snippet: berkas, rentang, dan judul sama dengan yang diturunkan dari isi rekaman dan kode", () => {
  test("delapan Snippet urut: rentang baris sama dengan rentang yang dihitung dari isi sumber; judul memuat berkas dan nomor baris; tanpa baris kepala rekaman", () => {
    const semua = [...mdx.matchAll(/<Snippet\s+([^>]*?)\/>/g)].map((m) => m[1]!);
    expect(semua).toHaveLength(SNIPPET_DIHARAPKAN.length);
    semua.forEach((a, i) => {
      const [file, rentang, jenis] = SNIPPET_DIHARAPKAN[i]!;
      expect(a.match(/file="([^"]+)"/)![1], a).toBe(file);
      expect(a.match(/lines="([^"]+)"/)![1], a).toBe(rentang);
      const [x, y] = rentang.split(":");
      expect(a.match(/title="([^"]+)"/)![1], a).toMatch(new RegExp(`^${jenis}: ${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} baris ${x} sampai ${y}[ ,]`));
      expect(a.includes('lang="go"'), a).toBe(file.endsWith(".go"));
      const isi = baca(file).split("\n").slice(Number(x) - 1, Number(y)).join("\n");
      expect(isi, `${file} ${rentang}`).not.toMatch(/keputusan \d+|R\d-\d{2,3}\b|\bPR \d+|\(lab t3-cache, keputusan/);
      if (file.endsWith("memori.txt")) expect(Number(x), "tanpa baris kepala").toBeGreaterThan(7);
    });
    expect(RENTANG).toEqual({ memoriA: "8:15", memoriB: "17:28", memoriC: "30:43", memoriD: "45:50", memoriSemua: "8:50", struktur: "30:35", hapusKota: "77:82", kunciProduk: "87:101" });
    expect(memori.slice(0, 7).some((b) => /keputusan 968/.test(b))).toBe(true);
  });
});

describe("diagram Rantai t3-m23-dua-harga.json", () => {
  test("judul paling banyak 47 karakter (layar pertama HP), sumber rekaman, tiga baris; teks simpul diturunkan dari rekaman", () => {
    expect(rantai.judul.length).toBeLessThanOrEqual(47);
    expect(rantai.id).toBe("t3-m23-dua-harga");
    expect(rantai.judul).toBe("Satu promo, dua instance, dua harga");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-cache · memori.txt bagian B, C, dan D" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Promo lewat instance A", "bagian B"], ["Pesanan Citra", "bagian C"], ["Entri B habis", "bagian D"]]);
    const [b1, b2, b3] = rantai.baris as [typeof rantai.baris[number], typeof rantai.baris[number], typeof rantai.baris[number]];
    expect(b1.simpul.map((s) => s.teks)).toEqual(["HR membuat promo lewat A", "A membuang entrinya", `Budi lewat A: ${rp(bacB[0]!.harga_efektif)}`, `Citra lewat B: ${rp(bacB[1]!.harga_efektif)}`]);
    expect(b1.simpul[1]!.sub).toBe(`kunci dihapus: A ${statB[0]!.hapus}, instance B nol`);
    expect(statB[1]!.hapus).toBe(0);
    expect(b1.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "good", "warn"]);
    expect(b2.simpul.map((s) => s.teks)).toEqual(["Citra memesan lewat B", `Ditagih ${rp(pesanan.nominal)}`, "Katalog B masih lama"]);
    expect(b2.simpul[0]!.sub).toBe(`layarnya ${rp(bacC[0]!.harga_efektif)}`);
    expect(b2.simpul[2]!.sub).toBe(`${rp(bacC[0]!.harga_efektif)} dan stok ${bacC[0]!.stok}; database: stok ${dbC.stok}`);
    expect(b2.simpul.map((s) => s.nada)).toEqual(["biasa", "good", "warn"]);
    expect(b3.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      [`Detik ke-${ttlDetik - 1}`, `${rp(bacD[0]!.harga_efektif)}, stok ${bacD[0]!.stok}`, "warn"],
      [`Detik ke-${ttlDetik}`, `${rp(bacD[1]!.harga_efektif)}, stok ${bacD[1]!.stok}, versi ${bacD[1]!.versi}`, "good"],
    ]);
    expect(rantai.catatan).toBe(`Cache di memori tiap instance hanya dibuang di instance yang menerima promo, dan entri yang tidak dibuang bertahan sampai TTL ${ttlDetik} detik habis.`);
    // Satuan "B" dan angka di sub memicu ID internal pada alat tampil (B147): semua sub memakai kata.
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bB \d/);
  });
});

describe("skenario alur t3-m23.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const semua = (): Langkah[] => skenario.langkah.concat(skenario.varian.langkah);
  test("valid menurut alur-core; empat komponen dengan dua lapisan, dua perangkat; sumber memori.txt dan redis.txt; varian dari awal; sembilan langkah dan lima langkah varian", () => {
    const d = core.normalize(skenario);
    expect(core.validate(d, { exists: (p) => terlacak.has(p) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t3-cache/output/memori.txt", fileVarian: "labs/t3-cache/output/redis.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label, k.lapisan ?? null])).toEqual([
      ["a", "Instance A", ["cache memori"]], ["client", "Client", null], ["b", "Instance B", ["cache memori"]], ["db", "PostgreSQL", null],
    ]);
    expect(skenario.perangkat).toEqual([{ id: "budi", label: "HP Budi" }, { id: "citra", label: "HP Citra" }]);
    expect(skenario.langkah).toHaveLength(9);
    expect(skenario.varian.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("satu Redis untuk kedua instance");
    expect(core.steps(d, false)).toHaveLength(9);
    expect(core.steps(d, true)).toHaveLength(5);
  });
  test("catatan sumber menyebut bagian yang dibaca dari kode, jam layar, dan kode lab t3-cache tanpa app Flutter", () => {
    const c = skenario.sumber.catatan;
    expect(c).toContain("Tanpa proxy: lab memanggil instance A atau instance B langsung.");
    expect(c).toContain("Jalur utama: memori.txt bagian A sampai D.");
    expect(c).toContain("Ubah satu hal: redis.txt bagian C");
    expect(c).toContain("lab t3-cache tidak punya app Flutter");
    expect(c).toContain("Jam di layar HP adalah pilihan penulis, kecuali 11.30 dari naskah.");
    expect(c).toContain("dibaca dari kode labs/api-t3, bukan dari rekaman");
    expect(naskah).toContain("HR menyalakan promo pukul 11.30");
  });
  test("tebakan: empat pilihan, jawaban benar Rp25.000 dari rekaman B, bukan pilihan pertama atau terakhir dan bukan yang terpanjang; penjelasan memuat hitungan kunci dihapus", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.varian).toBe(false);
    expect(p.answer).toBeGreaterThan(0);
    expect(p.answer).toBeLessThan(3);
    const benar = p.options[p.answer]!;
    expect(benar).toContain(rp(bacB[1]!.harga_efektif));
    expect(benar).toBe("Rp25.000: B masih memegang entri lama, dan tidak ada yang membuangnya");
    expect(p.options.filter((o) => o.includes("Rp25.000"))).toHaveLength(1);
    expect(Math.max(...p.options.map((o) => o.length))).toBeGreaterThan(benar.length);
    expect(p.options.some((o, i) => i !== p.answer && o.length >= benar.length)).toBe(true);
    expect(p.q).toContain("HR membuat promo 10% lewat instance A");
    expect(p.explain).toBe(
      `${rp(bacB[1]!.harga_efektif)}. Instance A mencatat satu kunci dihapus dan instance B nol, dan Citra menerima harga lama dari entri B (memori.txt bagian B). Budi, yang membaca lewat A, menerima ${rp(bacB[0]!.harga_efektif)}.`,
    );
    expect(statB.map((x) => x.hapus)).toEqual([1, 0]);
    // Jawaban benar tidak boleh juga ada di jawaban tebakan blok Raka kira (pertanyaan lain: tagihan).
    expect(badan).not.toContain(benar);
  });
  test("kirim tiap langkah memuat nilai rekaman: harga, stok, versi, hitungan baca database, kunci dihapus, pesanan, dan database", () => {
    const L = skenario.langkah;
    const hasil = (b: Bacaan) => `→ 200 harga_efektif ${b.harga_efektif}, stok ${b.stok}, versi ${b.versi}`;
    expect(L[0]!.kirim).toBe(`GET /katalog?warung=418 (Budi, instance A)\n${hasil(bacA[0]!)} (miss)`);
    expect(L[1]!.kirim).toBe(
      `GET /katalog?warung=418 (Citra, instance B)\n${hasil(bacA[1]!)} (miss)\nsesudah tiap orang membaca sekali lagi (hit):\n` +
        statA.map((s) => `instance ${s.inst}: hit ${s.hit}, miss ${s.miss}, baca database ${s.db}`).join("\n"),
    );
    expect(L[2]!.kirim).toBe("POST /promo potongan 10%, mulai 1 menit lalu, sudah berlaku (HR Jakarta, instance A)\n→ 201");
    expect(L[3]!.kirim).toBe(`instance A: kunci dihapus ${statB[0]!.hapus}\ninstance B: kunci dihapus ${statB[1]!.hapus}`);
    expect(L[4]!.kirim).toBe(`GET /katalog?warung=418 (Budi, instance A)\n${hasil(bacB[0]!)}`);
    expect(L[5]!.kirim).toBe(`GET /katalog?warung=418 (Citra, instance B)\n${hasil(bacB[1]!)}\ndatabase: harga_efektif_db ${dbB.efektif}`);
    expect(L[6]!.kirim).toBe(
      `POST /pesanan produk ${dbC.produk}, 1 porsi (Citra, instance B)\n→ 201 harga_satuan ${pesanan.harga_satuan}, nominal ${pesanan.nominal}, potongan_persen ${pesanan.potongan_persen}, stok_sisa ${pesanan.stok_sisa}`,
    );
    expect(L[7]!.kirim).toBe(`GET /katalog?warung=418 (Citra, instance B)\n${hasil(bacC[0]!)} (hit)\ndatabase: harga_efektif_db ${dbC.efektif}, stok ${dbC.stok}, versi ${dbC.versi}`);
    expect(L[8]!.kirim).toBe(
      `jam cache B digeser lewat POST /lab/jam\ndetik ke-${ttlDetik - 1} → harga_efektif ${bacD[0]!.harga_efektif}, stok ${bacD[0]!.stok}, versi ${bacD[0]!.versi}\n` +
        `detik ke-${ttlDetik} → harga_efektif ${bacD[1]!.harga_efektif}, stok ${bacD[1]!.stok}, versi ${bacD[1]!.versi} (entri habis, dibaca dari database)`,
    );
    const V = skenario.varian.langkah;
    expect(V[0]!.kirim).toBe(`GET /katalog?warung=418 (Budi, instance A)\n${hasil(bacRC[0]!)}`);
    expect(V[1]!.kirim).toBe(`GET /katalog?warung=418 (Citra, instance B)\n${hasil(bacRC[1]!)}`);
    expect(V[2]!.kirim).toBe("POST /promo potongan 10%, mulai 1 menit lalu, sudah berlaku (HR Jakarta, instance A)\n→ 201\nredis EXISTS katalog:1:418: 0 (SCAN katalog:1:* lalu DEL)");
    expect(V[3]!.kirim).toBe(`GET /katalog?warung=418 (Citra, instance B)\n${hasil(bacRC[2]!)}`);
    expect(V[4]!.kirim).toBe(`GET /katalog?warung=418 (Budi, instance A)\n${hasil(bacRC[3]!)}`);
    expect(statRA[0]!.db + statRA[1]!.db).toBe(1);
    expect(V[1]!.jelas).toContain("Di bagian A rekaman yang sama, urutan ini menghasilkan satu baca database untuk dua instance.");
    expect(L.map((x) => x.nada ?? null)).toEqual([null, null, null, "warn", null, "warn", "good", "warn", "good"]);
    expect(skenario.varian.langkah.map((x) => x.nada ?? null)).toEqual([null, null, null, "good", "good"]);
    expect(L[3]!.lapisan).toBe("cache memori");
    expect(L[8]!.lapisan).toBe("cache memori");
    expect(L.map((x) => [x.dari, x.ke ?? null])).toEqual([["client", "a"], ["client", "b"], ["client", "a"], ["a", null], ["client", "a"], ["client", "b"], ["b", "db"], ["client", "b"], ["client", "b"]]);
    expect(semua()).toHaveLength(14);
  });
  test("layar HP: harga dan stok tiap langkah sama dengan nilai rekaman; jam 11.30 dari naskah, 11.29 sebelum promo; tebakan tersembunyi tidak ada di layar awal", () => {
    const baris = (l: Layar | undefined, kiri: string) => l?.isi?.find((i) => i.jenis === "baris" && i.kiri === kiri)?.kanan;
    const L = skenario.langkah;
    expect(baris(L[0]!.layar!.budi, "Nasi goreng")).toBe(rp(bacA[0]!.harga_efektif));
    expect(baris(L[1]!.layar!.citra, "Nasi goreng")).toBe(rp(bacA[1]!.harga_efektif));
    expect(baris(L[2]!.layar!.budi, "Nasi goreng")).toBe(rp(bacA[2]!.harga_efektif));
    expect(baris(L[2]!.layar!.citra, "Nasi goreng")).toBe(rp(bacA[3]!.harga_efektif));
    expect(baris(L[4]!.layar!.budi, "Nasi goreng")).toBe(rp(bacB[0]!.harga_efektif));
    expect(baris(L[5]!.layar!.citra, "Nasi goreng")).toBe(rp(bacB[1]!.harga_efektif));
    expect(baris(L[7]!.layar!.citra, "Nasi goreng")).toBe(rp(bacC[0]!.harga_efektif));
    expect(baris(L[7]!.layar!.citra, "Stok")).toBe(String(bacC[0]!.stok));
    expect(baris(L[8]!.layar!.citra, "Nasi goreng")).toBe(rp(bacD[1]!.harga_efektif));
    expect(baris(L[8]!.layar!.citra, "Stok")).toBe(String(bacD[1]!.stok));
    const toast = L[6]!.layar!.citra!.isi!.find((i) => i.jenis === "toast")!;
    expect(toast.teks).toBe(`Pesanan ${rp(pesanan.nominal)} berhasil`);
    expect(baris(L[6]!.layar!.citra, "Nasi goreng")).toBe(rp(bacC[0]!.harga_efektif));
    const V = skenario.varian.langkah;
    expect(baris(V[3]!.layar!.citra, "Nasi goreng")).toBe(rp(bacRC[2]!.harga_efektif));
    expect(baris(V[4]!.layar!.budi, "Nasi goreng")).toBe(rp(bacRC[3]!.harga_efektif));
    const waktu = new Set<string>();
    for (const x of semua()) for (const l of Object.values(x.layar ?? {})) waktu.add(l.waktu!);
    expect([...waktu].sort()).toEqual(["11.29", "11.30", "11.31", "11.34"]);
    expect(Object.values(skenario.layarAwal).every((l) => l.waktu === "11.29")).toBe(true);
    expect(JSON.stringify(skenario.layarAwal)).not.toContain("Rp");
  });
  test("teks widget: tidak ada ID riset, nomor keputusan, atau label rekaman internal; tidak menyebut hasil akhir di pengantar", () => {
    const semuaTeks = JSON.stringify([skenario, diagramMentah]);
    expect(semuaTeks).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d+|\bPR \d+/);
    expect(skenario.pengantar).not.toContain("Rp");
    expect(skenario.pengantar).toBe(
      "HR menyalakan promo lewat satu instance, dan dua HP di meja yang sama membaca katalog lewat instance yang berbeda. Tebak dulu harga yang Citra terima, lalu ikuti sampai entri di instance kedua habis. Sesudah langkah terakhir, centang 'Ubah satu hal'.",
    );
  });
});

describe("Cek diri, label sumber, bahasa, dan susunan teks", () => {
  test("empat pertanyaan Cek diri, empat jawaban; jawaban memuat nilai rekaman; satu details tebak dan empat details jawaban", () => {
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    expect([...cek.matchAll(/^\*\*(\d+)\.\*\* /gm)].map((x) => x[1])).toEqual(["1", "2", "3", "4"]);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details>/g)).toHaveLength(1);
    expect([...badan.matchAll(/<summary>(.+?)<\/summary>/g)].map((x) => x[1])).toEqual([
      "Tebak dulu: Citra melihat Rp25.000 di layarnya lalu memesan satu nasi goreng. Berapa yang ditagih?",
      "Jawaban", "Jawaban", "Jawaban", "Jawaban",
      "Rekaman bagian A sampai D (juga untuk pembaca tanpa JavaScript)",
    ].sort((a, b) => badan.indexOf(`<summary>${a}</summary>`) - badan.indexOf(`<summary>${b}</summary>`)));
    harus(`Cache ada di memori tiap proses. Promo membuang entri hanya di peta A (kunci dihapus: A satu, B nol), dan B memegang entrinya sampai TTL habis (\`memori.txt\` bagian B).`);
    harus(`${rp(pesanan.nominal)}. \`Pesan\` membaca harga dari database sesudah produk dikunci, bukan dari katalog (\`memori.txt\` bagian C; kode \`KunciProduk\`).`);
    harus(`Jawaban server sendiri berbeda untuk dua pembaca, ${rp(bacB[0]!.harga_efektif)} lawan ${rp(bacB[1]!.harga_efektif)}`);
    harus(`Paling lama sebesar TTL, ${ttlDetik} detik sejak entri diisi: detik ke-${ttlDetik - 1} masih ${rp(bacD[0]!.harga_efektif)} dan detik ke-${ttlDetik} ${rp(bacD[1]!.harga_efektif)} (\`memori.txt\` bagian D).`);
    harus(`Rp22.500. Di rekaman lab \`memori.txt\` bagian C, pesanan Citra ditagih ${rp(pesanan.nominal)}, harga dari database, walau katalog di instance B masih menjawab ${rp(bacC[0]!.harga_efektif)}.`);
  });
  test("label sumber: Ilustrasi dua kali, Asumsi dua kali, Tidak dijalankan tidak dipakai, penalaran dan dibaca dari kode tiga kali; arti label menaut A0", () => {
    expect(badan.match(/Ilustrasi/g)).toHaveLength(2);
    expect(badan.match(/Asumsi/g)).toHaveLength(2);
    expect(badan.match(/Tidak dijalankan/g)).toHaveLength(1);
    expect(badan.match(/penalaran/g)).toHaveLength(3);
    expect(badan.match(/dibaca dari kode/g)).toHaveLength(3);
    expect(badan.match(/Rekaman lab/g)).toHaveLength(7);
    expect(badan).not.toContain("[perlu verifikasi]");
    harus("*Angka cerita (Ilustrasi):*");
    harus("Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].");
    harus("Raka mengira app Flutter menyimpan harga lama di HP Citra.");
    harus("karena katalog dibaca terus (naskah, Ilustrasi)");
    expect(naskah).toContain("karena \"katalog dibaca terus\"");
    expect(naskah).toContain("Di minggu 2 Nadia menambah cache katalog di memori proses (TTL 300 detik, 5 menit)");
    expect(naskah).toContain("Bug Flutter menyimpan harga lama");
    expect(naskah).toContain("Orang yang mengantre di warung Ani berdebat soal harga (Ilustrasi)");
  });
  test("tidak ada ID riset, nomor keputusan, nomor PR, atau label rekaman internal di teks pembaca (halaman, widget, Snippet kode)", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(mdx).not.toMatch(/keputusan \d+|\bPR #?\d+|#\d{3}\b/);
    expect(badan).not.toMatch(/\b[A-G]\d\b(?<!A0)/);
    expect(badan.match(/\bA0\b/g)).toHaveLength(1);
    expect(badan).not.toMatch(/\bB \d|\d B\b/);
  });
  test("negasi dan kata pembatas dihitung: satu 'tidak' atau 'hanya' yang ditambah atau dibuang mengubah arti kalimat", () => {
    const hitung = (kata: string): number => (badan.match(new RegExp(`\\b${kata}\\b`, "gi")) ?? []).length;
    expect({ tidak: hitung("tidak"), bukan: hitung("bukan"), belum: hitung("belum"), hanya: hitung("hanya"), semua: hitung("semua"), setiap: hitung("setiap"), selalu: hitung("selalu"), tanpa: hitung("tanpa"), kecuali: hitung("kecuali"), sebagian: hitung("sebagian") })
      .toEqual({ tidak: 24, bukan: 3, belum: 1, hanya: 7, semua: 0, setiap: 1, selalu: 0, tanpa: 9, kecuali: 0, sebagian: 0 });
  });
  test("heading, tingkat heading, tag Blok, tanpa komentar HTML; audit bahasa 0 error dan 0 peringatan", () => {
    expect([...badan.matchAll(/^(#{2,6}) (.+)$/gm)].map((x) => `${x[1]!.length} ${x[2]}`)).toEqual(["3 Cek diri"]);
    expect(badan).not.toContain("<!--");
    expect(badan.match(/<Blok nama="[^"]+"( buka)?>/g)).toHaveLength(5);
    const keluar = execFileSync("python3", ["tools/audit_bahasa.py", "--check", HALAMAN], { cwd: akar, encoding: "utf8" });
    expect(keluar).toMatch(/0 error · 0 peringatan/);
    // Kalimat kunci mekanisme.
    harus("Katalog dibaca dari cache di memori tiap proses, dan promo hanya membuang entri di proses yang menerimanya. Proses lain menjawab harga lama sampai entrinya habis.");
    harus("Yang disimpan di memori satu proses berlipat saat prosesnya dua. Cache boleh stale untuk tampilan, tidak untuk uang.");
    expect(naskah).toContain("| Cache | Cache boleh stale untuk tampilan, tidak untuk uang | M23 |");
    expect(naskah).toContain("| State bersama | Yang disimpan di memori satu proses berlipat saat prosesnya dua | M22 |");
  });
});

describe("kunci teks: seluruh halaman dan seluruh data widget dikunci utuh lewat snapshot", () => {
  test("badan halaman dan data widget (Rantai dan skenario alur) milik 3.18", async () => {
    await expect(mdx).toMatchFileSnapshot("./__teks__/m23-dua-harga.mdx.txt");
    await expect(JSON.stringify([diagramMentah, JSON.parse(skenarioMentah)], null, 1)).toMatchFileSnapshot("./__teks__/m23-dua-harga-widget.json.txt");
  });
});
