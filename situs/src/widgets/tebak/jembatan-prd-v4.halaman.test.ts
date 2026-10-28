// Penjaga halaman 3.32 (keputusan 1124 sampai 1126): angka, nomor ADR, nomor halaman, kalimat yang dikutip dari halaman Tahap 3,
// klaim negatif berlingkup, dan isi tebakan di jembatan-prd-v4.mdx dan t3-jembatan-tebak.json diturunkan dari registry
// cerita.json, naskah Tahap 1, 3, dan 4, rekaman labs/t3-outbox, kode labs/api-t3, dan halaman Tahap 1 sampai 3, bukan dari
// daftar yang ditulis sendiri. Halaman ini TANPA LAB: tiap angka berlabel Asumsi, Hitungan, atau Ilustrasi, dan satu-satunya
// rekaman yang dikutip adalah batas kapasitas worker (queue.txt bagian A) lewat halaman 3.29.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dan
// teks widget dikunci per baris lewat jembatan-prd-v4.halaman.nilai.ts, supaya satu kata yang berubah gagal. Kalimat terkunci
// tidak menangkap SALAHNYA kalimat, jadi tiap kalimat yang menyatakan isi halaman Tahap 3 dibaca ulang dari halaman itu.
// Halaman ini hanya pratinjau: ia tidak boleh membuka isi Tahap 4 (ADR 34 ke atas, M29 ke atas, rincian gateway).
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../../data/cerita.json";
import { cekTemplat, daftarBlok } from "../../lib/blok";
import { DataTebak } from "./skema";
import { nilai } from "./logika";
import { BARIS_MDX, BENTUK_MDX, NILAI_TEBAK } from "./jembatan-prd-v4.halaman.nilai";

const akar = path.resolve(__dirname, "../../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  if (terlacak) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const T1 = (f: string) => baca(`situs/src/content/docs/tahap-1/${f}`);
const T2 = (f: string) => baca(`situs/src/content/docs/tahap-2/${f}`);
const T3 = (f: string) => baca(`situs/src/content/docs/tahap-3/${f}`);

const BERKAS = "situs/src/content/docs/tahap-3/jembatan-prd-v4.mdx";
const BERKAS_JSON = "situs/data/widget/t3-jembatan-tebak.json";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const jsonMentah = baca(BERKAS_JSON);
const data = DataTebak.parse(JSON.parse(jsonMentah));
const naskah1 = baca("plan/CERITA-TAHAP-1.md");
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const bagian = (naskah: string, awal: string): string => {
  const i = naskah.indexOf(awal);
  expect(i, `naskah tidak memuat bagian: ${awal}`).toBeGreaterThanOrEqual(0);
  return naskah.slice(i).split("\n## ")[0]!;
};
const prd3 = bagian(naskah3, "## 1. PRD v3 · Rekeningo untuk enam kota");
const jembatan3 = bagian(naskah3, "## 6. Jembatan ke Tahap 4");
const prd4 = bagian(naskah4, "## 1. PRD v4 · Rekeningo dibuka ke publik");

const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const cara = baca("situs/src/content/docs/cara-pakai.mdx");

interface H { id: string; judul: string; path?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; masalah?: string; pendek?: string; topik?: string; lab?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const halamanAdr = (n: number): H => {
  const h = hal.filter((x) => x.tahap === 3 && x.adr?.includes(n));
  expect(h.length, `ADR ${n} harus punya tepat satu halaman Tahap 3`).toBe(1);
  return h[0]!;
};
const isi = (h: H): string => T3(path.basename(h.path!, ".md") + ".mdx");

const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const ada = (teks: string, kalimat: string, nama = "sumber") => expect(teks, `${nama} tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const angka = (s: string): number => Number(s.replace(",", "."));
const KATA: Record<number, string> = { 1: "Satu", 2: "Dua", 3: "Tiga", 4: "Empat", 5: "Lima", 6: "Enam", 10: "Sepuluh" };
const kata = (n: number): string => KATA[n]!.toLowerCase();
const Kata = (n: number): string => KATA[n]!;

// Teks widget: semua nilai string, untuk dicari angkanya.
const teksWidget = [data.adegan.join(" "), data.pertanyaan, data.penutup, data.sumber.teks, data.label.sumber, ...data.pilihan.flatMap((p) => [p.teks, p.alasan])].join("\n");
const dalamWidget = (kalimat: string) => expect(teksWidget, `widget tidak memuat: ${kalimat}`).toContain(kalimat);

// ---- nilai dari registry, rumus, dan halaman tetangga --------------------------------------------------------------------
type Asumsi = { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string };
const a3 = cerita.tahap[2]!.asumsi as unknown as Asumsi;
const a4 = cerita.tahap[3]!.asumsi as unknown as Asumsi;
const puncak = (a: Asumsi): number => (((a.user * a.aktif) / 100) * a.req) / 86400 * a.puncak;
const p3 = puncak(a3);
const p4 = puncak(a4);
const naik = Math.round(p4 / p3);
const dau = (a: Asumsi): number => (a.user * a.aktif) / 100;
const lambdaBayar3 = ((dau(a3) * a3.trx) / 86400) * a3.puncak;
const estimasi = T3("estimasi.mdx");
const topupPerAktif = angka(cocok(estimasi, /20\.000 × (0,\d+) top-up/)[1]!);
const notif4 = (((dau(a4) * a4.trx + dau(a4) * topupPerAktif) / 86400) * a4.puncak);
const m27 = T3("m27-hari-promo.mdx");
const c = Number(cocok(m27, /c = (\d+) baris/)[1]);
const t = angka(cocok(m27, /t = (0,\d+) detik/)[1]!);
const kapasitas = c / t;
const makanSiang = (dau(a4) * a4.trx + dau(a4) * topupPerAktif) * 0.8 / 5400;
const WPOOL = angka(cocok(estimasi, /138,9 × (0,02) = 2,78/)[1]!);
const lPool = p4 * WPOOL;
const cache = T3("cache-invalidation.mdx");
const katalog = angka(cocok(cache, /katalog (\d+,\d+) baca per detik/)[1]!);
const wCache = angka(cocok(cache, /W = (\d+) ms/)[1]!) / 1000;
const pemicuCache = Number(cocok(cache, /mencapai (\d+) koneksi/)[1]);
const lCache4 = katalog * naik * wCache;
const queue = baca("labs/t3-outbox/output/queue.txt");
const ukur = cocok(queue, /kapasitas diukur: antara (\d+) dan (\d+,\d+) per detik/);

// ---- Lapis 2 ---------------------------------------------------------------------------------------------------------------
describe("kata-kata halaman dan widget terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    expect(mdx.split("\n").map((b) => (b.trim() ? "#" : "-")).join("")).toBe(BENTUK_MDX);
  });
  test("nilai string JSON tebak sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(ratakan(JSON.parse(jsonMentah))).toEqual(NILAI_TEBAK);
  });
});

// ---- Registry, naskah, blok, dan tautan -------------------------------------------------------------------------------------
describe("registry, naskah, blok, dan tautan", () => {
  const r = dari("t3-jembatan");
  test("entri registry dan baris peta naskah cocok; halaman tanpa lab", () => {
    expect(r).toMatchObject({ ada: true, nomor: "3.32", jenis: "prd", inti: true, prasyarat: ["t3-rekap"], tahap: 3, topik: "Gambaran besar", pendek: "Pratinjau PRD v4" });
    expect(r.path).toBe("tahap-3/jembatan-prd-v4.md");
    expect(r.lab).toBeUndefined();
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(r.path!, ".md"));
    expect(naskah3).toContain("| 3.32 | 6 | Jembatan: pratinjau PRD v4 | PRD | ★ | – | tebak |");
    expect(r.judul).toBe("Jembatan: pratinjau PRD v4");
    expect(frontmatter).toContain('title: "3.32 Jembatan: pratinjau PRD v4"');
    expect(hal.filter((h) => h.nomor === "3.32").map((h) => h.id)).toEqual(["t3-jembatan"]);
    expect(dari("t3-rekap")).toMatchObject({ nomor: "3.31" });
    expect(dari("t3-m28")).toMatchObject({ nomor: "3.28", ada: true });
    expect(naskah3).toContain("| 3.31 | 5 | Yang dibawa keluar dari Tahap 3 | Konsep | ★ | – | kartu |");
  });
  test("front matter dikunci: title dan description memuat Minggu 10, PT Rekeningo, enam fitur, Pak Hadi, dan tebakan", () => {
    const minggu = cocok(naskah4, /minggu ke-(\d+) Tahap 3/)[1]!;
    expect(frontmatter).toBe(
      `title: "3.32 Jembatan: pratinjau PRD v4"\ndescription: Minggu ${minggu}. Sinta membagikan PRD v4 untuk PT Rekeningo yang dibuka ke publik, dengan ${kata(6)} fitur dan syarat baru Pak Hadi. Dari ADR Tahap 3, tebak mana yang pecah lebih dulu.\n`,
    );
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-rekap\]\] · Jalur inti<\/p>/);
    expect(r.menit).toBe(Number(m[1]) + Number(m[2]));
    const teksBaca = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (teksBaca.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
    expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(10);
  });
  test("lima blok; templat PRD terpenuhi; hanya blok pertama terbuka; tautan tebak dikunci", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Pratinjau PRD v4", "Ruang lingkup", "Pertanyaan terbuka", "Menuju Tahap 4", "Kunci"]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Pratinjau PRD v4"]);
    expect(badan).toContain('export const tautanTebak = ["t3-m28", "t3-estimasi", "t4-prd"]');
    // Mutasi tinjauan: baris .map akhir dihapus lolos build dan tes, lalu tautan hasil tebakan tampil tanpa label dan href.
    expect(badan).toContain('export const hs = muat().halaman;\nexport const tautanTebak = ["t3-m28", "t3-estimasi", "t4-prd"]\n  .map((id) => hs.find((h) => h.id === id && h.ada))\n  .filter(Boolean)\n  .map((h) => ({ label: label(h), href: urlHalaman(h) }));');
    expect(badan).toContain('import dataTebak from "../../../../data/widget/t3-jembatan-tebak.json";');
    expect(hitung(badan, "<Tebak client:visible data={dataTebak} tautan={tautanTebak} />")).toBe(1);
  });
  test("tautan [[id]]: himpunan, jumlah pemakaian, nomor, dan judul diturunkan dari registry dan peta naskah", () => {
    const id = [...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!);
    const hitungId: Record<string, number> = {};
    for (const x of id) hitungId[x] = (hitungId[x] ?? 0) + 1;
    expect(hitungId).toEqual({
      A0: 1, "t2-skema-tanpa-downtime": 1, "t3-at-least-once": 2, "t3-cache": 1, "t3-adr-33": 1, "t3-dua-instance": 1, "t3-estimasi": 2, "t3-m28": 5, "t3-offline": 1, "t3-outbox": 1,
      "t3-pool": 1, "t3-prd": 5, "t3-rate-limit-redis": 1, "t3-rekap": 1, "t3-tim-infra": 2, "t3-tls-pinning": 1, "t3-xss-csrf": 3, "t4-prd": 1,
    });
    for (const x of Object.keys(hitungId)) expect(hal.some((h) => h.id === x), `[[${x}]] tidak ada di registry`).toBe(true);
    const sesuai: [string, string, string][] = [
      ["t2-skema-tanpa-downtime", "2.22", "Ubah skema tanpa downtime"], ["t3-prd", "3.1", "PRD v3"], ["t3-pool", "3.8", "Connection pool"], ["t3-outbox", "3.9", "Outbox transaksional"],
      ["t3-adr-33", "3.30", "ADR 33"], ["t3-at-least-once", "3.13", "At-least-once"], ["t3-dua-instance", "3.15", "Dua instance"], ["t3-rate-limit-redis", "3.17", "Rate limit lintas instance"],
      ["t3-cache", "3.19", "Cache dan invalidation"], ["t3-offline", "3.21", "Offline-first"], ["t3-xss-csrf", "3.23", "Keamanan 5"], ["t3-tls-pinning", "3.25", "Keamanan 6"],
      ["t3-tim-infra", "3.27", "Tim dan infra Tahap 3"], ["t3-m28", "3.28", "M28"], ["t3-estimasi", "3.29", "Estimasi Tahap 3"], ["t3-rekap", "3.31", "Yang dibawa keluar"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      if (idh.startsWith("t3-")) expect(naskah3, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    // t4-prd belum ada: tautan tampil lewat mekanisme "segera" registry.
    expect(dari("t4-prd")).toMatchObject({ nomor: "4.1", jenis: "prd", tahap: 4, path: "tahap-4/prd-v4.md" });
    expect(bagian(naskah4, "## Peta halaman Tahap 4")).toContain("| 4.1 | 1 | PRD v4: Rekeningo dibuka ke publik | PRD | ★ | – | – |");
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke halaman ini ditepati: 3.28 (PRD v4 selengkapnya, tebakan), 3.15 (VPS dijawab di sini), 3.27 dan 3.29 (tim 10 sampai 15)", () => {
    const m28 = T3("m28-prd-v4.mdx");
    ada(m28, "Isi PRD v4 selengkapnya ada di [[t3-jembatan]].", "3.28");
    ada(m28, "[[t3-jembatan]] meminta kamu menebak mana yang pecah lebih dulu.", "3.28");
    expect(dari("t3-jembatan").masalah).toContain("mana yang pecah lebih dulu");
    ada(naskah3, "Pembaca diminta menebak: dari ADR Tahap 3, mana yang pecah lebih dulu?", "naskah 3");
    expect(data.pertanyaan).toBe("Dari ADR Tahap 3, mana yang pecah lebih dulu?");
    const adr26 = isi(halamanAdr(26));
    ada(adr26, "Satu VPS tetap titik gagal tunggal. Ini diterima sengaja dan dijawab di [[t3-jembatan]] dan [[t3-adr-33]].", "3.15");
    expect(data.pilihan.find((p) => p.benar)!.teks).toContain("ADR 26");
    harus("- ADR 26: satu VPS tetap titik gagal tunggal, dan itu diterima sengaja ([[t3-dua-instance]]).");
    const [a, z] = cocok(jembatan3, /Tim naik dari (\d+) menjadi (\d+ sampai \d+) orang dalam tiga tim/).slice(1) as [string, string];
    expect(a).toBe(String(Number(a3.tim.match(/\d+/)![0])));
    ada(isi(halamanAdr(32)), `Tim naik dari empat menjadi ${z} orang dalam tiga tim (naskah Tahap 3, jembatan)`, "3.27");
    ada(estimasi, `Tim naik dari ${a} menjadi ${z} orang dalam tiga tim (Asumsi naskah)`, "3.29");
  });
  test("halaman tidak menautkan halaman Tahap 4 selain 4.1, dan tidak memuat isi Tahap 4 (ADR 34 ke atas, M29 ke atas, rincian gateway)", () => {
    const semua = badan + "\n" + teksWidget;
    expect(semua).not.toMatch(/\[\[t4-(?!prd\]\])/);
    expect(semua).not.toMatch(/ADR (3[4-9]|4\d)\b|\bM(29|3\d)\b|circuit breaker|object storage|presigned|SSRF|OpenTofu|Serverpod|rekonsiliasi|audit log|\bCRC\b|modular monolith|secret manager|kill switch/i);
    expect(hitung(badan, "[[t4-prd]]")).toBe(1);
    expect(dari("t4-prd").ada).toBe(false);
  });
});

// ---- Kepala dokumen dan tabel PRD v3 ke PRD v4 -------------------------------------------------------------------------------
describe("kepala dokumen dan tabel PRD v3 ke PRD v4", () => {
  const rekap3 = cerita.tahap[2]!.rekap;
  const rekap4 = cerita.tahap[3]!.rekap;
  const minggu4 = cocok(naskah4, /selama (\d+) minggu \(Asumsi cerita\)/)[1]!;
  const minggu3 = cocok(naskah3, /Tim jadi empat orang dalam (\d+) minggu \(Asumsi cerita\)/)[1]!;
  const rentang = cocok(jembatan3, /dari (\d+) menjadi (\d+) sampai (\d+) orang dalam tiga tim/);
  const tim3 = Number(a3.tim.match(/\d+/)![0]);
  test("penulis dan syarat baru sama dengan naskah Tahap 1 dan halaman 1.42", () => {
    expect(naskah1).toContain("**Sinta** adalah product manager di unit Inisiatif Digital");
    expect(naskah1).toContain("| **Pak Hadi** | Kepala Divisi Keuangan. |");
    expect(T1("jembatan-prd-v2.mdx")).toContain("<dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd>");
    harus("<dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd>");
    harus("<dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd>");
    ada(naskah4, "**Sinta** menulis PRD v4.", "naskah 4");
    harus("dokumen keempat yang Sinta tulis untuk Rekeningo");
    expect(T2("jembatan-prd-v3.mdx")).toContain("dokumen ketiga yang Sinta tulis untuk Rekeningo");
  });
  test("lingkup dan tim v4: 100.000 user dari registry, merchant di luar Lestari dari naskah, 10 sampai 15 engineer dalam tiga tim, 12 minggu", () => {
    expect(a4.user).toBe(100000);
    expect(rekap4).toContain(`${minggu4} minggu`);
    expect(rekap4).toContain(`±${titik(a4.user)} user`);
    expect(rekap3).toContain(`${minggu3} minggu`);
    expect(a4.tim).toBe(`${cocok(prd4, /(\d+) engineer dalam tiga tim/)[1]} developer, ${Number(cocok(a4.tim, /(\d+) tim$/)[1])} tim`);
    expect(Number(cocok(a4.tim, /(\d+) tim$/)[1])).toBe(3);
    expect(rekap4).toContain("merchant di luar Lestari");
    ada(prd4, "QR untuk merchant di luar Lestari", "naskah 4");
    ada(naskah4, "supaya orang di luar Lestari bisa memakai Rekeningo", "naskah 4");
    harus(`<dd>PT Rekeningo (fiktif): ${titik(a4.user)} user terdaftar, merchant di luar Lestari</dd>`);
    harus(`<dd>${rentang[2]} sampai ${rentang[3]} engineer dalam tiga tim, ${minggu4} minggu</dd>`);
    ada(naskah4, "**PT Rekeningo** (fiktif)", "naskah 4");
    harus("Direksi Grup Lestari lalu mendirikan PT Rekeningo, perusahaan fiktif, supaya orang di luar Lestari bisa memakai Rekeningo.");
    ada(naskah4, "Direksi Grup Lestari mendirikan **PT Rekeningo** (fiktif) supaya orang di luar Lestari bisa memakai Rekeningo", "naskah 4");
  });
  test("pembuka: minggu 10, tutup buku bulan ketiga kurang dari sehari, selisih Rp0, sama dengan naskah dan 3.28", () => {
    const minggu = cocok(naskah4, /minggu ke-(\d+) Tahap 3/)[1]!;
    const rp = cocok(naskah4, /dengan selisih (Rp\d+)/)[1]!;
    expect(rp).toBe("Rp0");
    ada(naskah4, `Tutup buku bulan ketiga selesai kurang dari sehari dengan selisih ${rp}`, "naskah 4");
    ada(T3("m28-prd-v4.mdx"), `Minggu ${minggu} Tahap 3. Tutup buku bulan ketiga untuk uji coba enam kota selesai dalam kurang dari sehari, dan selisihnya ${rp}.`, "3.28");
    harus(`Minggu ${minggu} Tahap 3. Tutup buku bulan ketiga selesai dalam kurang dari sehari dengan selisih ${rp} ([[t3-m28]]).`);
    expect([...badan.matchAll(/Rp\d+(?:\.\d{3})*/g)].map((m) => m[0])).toEqual([rp]);
  });
  test("tabel lima baris: tiap sel v3 dan v4 dari registry, naskah, dan halaman tetangga", () => {
    const baris = (nama: string) => {
      const row = badan.split("\n").find((b) => b.startsWith(`| ${nama} |`));
      expect(row, `baris "${nama}" tidak ada`).toBeDefined();
      return row!.split("|").map((x) => x.trim()).slice(1, -1);
    };
    harus("PRD v4 mengubah lima hal dari PRD v3:");
    expect(badan.split("\n").filter((b) => /^\| (Lingkup|User|Uang masuk|Beban puncak \(Asumsi\)|Tim) \|/.test(b))).toHaveLength(5);
    // Lingkup
    expect(rekap3).toContain(`±${titik(a3.user)} karyawan, ±60 warung`);
    expect(baris("Lingkup")).toEqual(["Lingkup", `Enam kota: ±${titik(a3.user)} karyawan, ±60 warung`, `Publik: ${titik(a4.user)} user terdaftar (Asumsi), merchant di luar Lestari`]);
    // User
    ada(prd3, "**Bukan lingkup v3.**", "naskah 3");
    expect(cocok(prd3, /\*\*Bukan lingkup v3\.\*\* ([^\n]+)/)[1]).toContain("user di luar Lestari");
    ada(T3("prd-v3.mdx"), "**Bukan lingkup v3:** pembayaran offline, integrasi bank, user di luar Lestari, kartu virtual", "3.1");
    ada(prd4, "(2) Siapa pun dengan rekening bank mengisi saldo dan membayar di merchant luar.", "naskah 4");
    expect(baris("User")).toEqual(["User", "Karyawan Grup Lestari; user di luar Lestari bukan lingkup", "Siapa pun dengan rekening bank"]);
    ada(prd3, "10.000 karyawan", "naskah 3");
    // Uang masuk
    ada(prd3, "Top-up massal tiap Senin boleh menyusul beberapa menit", "naskah 3");
    ada(T3("prd-v3.mdx"), "Top-up massal tiap Senin boleh menyusul beberapa menit", "3.1");
    ada(T1("fitur-ke-teknis.mdx"), "| Top-up oleh admin |", "1.2");
    ada(prd4, "| P0 | Top-up dari rekening bank lewat gateway |", "naskah 4");
    expect(baris("Uang masuk")).toEqual(["Uang masuk", "Top-up oleh admin, dan top-up massal tiap Senin", "Top-up dari rekening bank lewat gateway pembayaran"]);
    // Beban puncak
    expect([koma(p3, 1), koma(p4, 1)]).toEqual(["17,4", "138,9"]);
    expect(p4 / p3).toBeCloseTo(naik, 9);
    ada(estimasi, `| Puncak request per detik | ${koma(p3, 1)} | ${koma(p4, 1)} | 1.200.000 ÷ 86.400 × 10 |`, "3.29");
    ada(estimasi, `Puncaknya ${koma(p3, 1)} menjadi ${koma(p4, 1)} per detik`, "3.29");
    ada(estimasi, `puncak request hanya naik ${naik} kali`, "3.29");
    expect(baris("Beban puncak (Asumsi)")).toEqual(["Beban puncak (Asumsi)", `±${koma(p3, 1)} request per detik`, `±${koma(p4, 1)} request per detik, naik ${naik} kali ([[t3-estimasi]])`]);
    // Tim
    expect(tim3).toBe(Number(rentang[1]));
    expect(a3.tim).toBe("4 developer");
    expect(baris("Tim")).toEqual(["Tim", `${tim3} engineer, ${minggu3} minggu (Asumsi cerita)`, `${rentang[2]} sampai ${rentang[3]} engineer dalam tiga tim, ${minggu4} minggu (Asumsi cerita)`]);
    ada(prd4, "13 engineer dalam tiga tim", "naskah 4");
    expect(Number(rentang[2])).toBeLessThanOrEqual(13);
    expect(Number(rentang[3])).toBeGreaterThanOrEqual(13);
  });
  test("syarat Pak Hadi: kutipan sama dengan naskah 4; label Asumsi, Ilustrasi, dan Tidak dijalankan menaut ke A0", () => {
    const kutip = cocok(prd4, /\*"(Setiap rupiah dari luar[^"]+)"\*/)[1]!;
    expect(kutip).toBe("Setiap rupiah dari luar harus cocok dengan catatan pihak yang mengirimnya. Kalau tidak cocok, namanya insiden, bukan angka yang saya koreksi.");
    harus(`Pak Hadi memperluas syaratnya: "${kutip}"`);
    ada(prd4, "Aturan Pak Hadi dipertahankan dan diperluas:", "naskah 4");
    harus("Angka di dokumen ini adalah angka cerita (Ilustrasi), kecuali yang ditulis Asumsi. Arti label Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    expect(cara).toMatch(/Asumsi/);
    expect(cara).toMatch(/Ilustrasi/);
    expect(cara).toMatch(/Tidak dijalankan/);
  });
  test("ADR 22 sampai 33: dua belas ADR Tahap 3, masing-masing satu halaman di registry; tim empat orang", () => {
    const adr = hal.filter((h) => h.tahap === 3 && h.adr).flatMap((h) => h.adr!).sort((x, y) => x - y);
    expect(adr).toEqual(Array.from({ length: 12 }, (_, i) => 22 + i));
    harus(`Selama Tahap 3, tim ${kata(tim3)} orang menulis ADR ${adr[0]} sampai ${adr[adr.length - 1]}. Sebagian dari keputusan itu akan pecah lebih dulu daripada yang lain. Pecah berarti keputusan itu tidak lagi memadai.`);
    ada(naskah4, "Tim tumbuh dari 4 menjadi 13 orang", "naskah 4");
    expect(T3("m28-prd-v4.mdx")).toContain("Timnya empat orang (Asumsi cerita) di satu codebase Go");
    dalamWidget(`tim ${kata(tim3)} orang tulis di Tahap 3: ADR ${adr[0]} sampai ${adr[adr.length - 1]}.`);
  });
});

// ---- Ruang lingkup ---------------------------------------------------------------------------------------------------------
describe("ruang lingkup: enam fitur dari naskah 4, tiga P2 v3, dan kolom keadaan Tahap 3 dari halaman yang ditaut", () => {
  const baris4 = prd4.split("\n").map((b) => b.match(/^\| (P[0-2]) \| (.+?) \| (.+?) \|$/)).filter((m): m is RegExpMatchArray => m !== null);
  const fitur = baris4.filter((m) => m[1] !== "P2").map((m) => ({ p: m[1]!, nama: m[2]! }));
  const p2v3 = cocok(prd3, /\| P2 \| (.+?) \| Ditunda ke v4 \|/)[1]!;
  const prd3Halaman = T3("prd-v3.mdx");
  const barisFitur = (nama: string) => {
    const row = badan.split("\n").find((b) => b.startsWith(`| ${nama}`));
    expect(row, `baris "${nama}" tidak ada di tabel ruang lingkup`).toBeDefined();
    return row!.split("|").map((x) => x.trim()).slice(1, -1);
  };
  test("enam fitur, empat P0 dan dua P1, urutan dan nama sama dengan naskah 4 dan enam butir naskah 3", () => {
    expect(fitur).toHaveLength(6);
    expect(fitur.filter((f) => f.p === "P0")).toHaveLength(4);
    expect(fitur.filter((f) => f.p === "P1")).toHaveLength(2);
    harus(`${Kata(fitur.length)} fitur diminta di PRD v4: ${kata(4)} P0 dan ${kata(2)} P1.`);
    const butir3 = [...jembatan3.matchAll(/^- (.+)\.$/gm)].map((m) => m[1]!).slice(0, 6);
    expect(butir3).toEqual(["PT Rekeningo berdiri sendiri", "Top-up dari rekening bank lewat gateway", "Verifikasi identitas", "QR untuk merchant di luar Lestari", "Kartu virtual", "Back office untuk tim risk"]);
    expect(butir3).toEqual(fitur.map((f) => f.nama));
    const tabel = badan.split("\n").filter((b) => /^\| (PT Rekeningo|Top-up dari|Verifikasi|QR untuk|Kartu virtual|Back office)/.test(b));
    expect(tabel).toHaveLength(6);
    tabel.forEach((row, i) => {
      const sel = row.split("|").map((x) => x.trim()).slice(1, -1);
      expect(sel[0]!.startsWith(fitur[i]!.nama), sel[0]).toBe(true);
      expect(sel[1]).toBe(fitur[i]!.p);
    });
    harus("| Fitur | Prioritas | Keadaannya di Tahap 3 |");
  });
  test("tiga fitur yang ditunda ke v4 di PRD v3 (P2) dan kolom keadaan dari halaman 3.1", () => {
    const item = p2v3.split(", ");
    expect(item).toEqual(["Top-up dari rekening bank", "kartu virtual", "verifikasi identitas"]);
    ada(prd3Halaman, "| P2 | Top-up dari rekening bank, kartu virtual, verifikasi identitas | Ditunda ke v4 |", "3.1");
    harus(`${Kata(item.length)} di antaranya sudah muncul di PRD v3 sebagai P2 yang ditunda ke v4.`);
    const tunda = fitur.filter((f) => item.some((x) => f.nama.toLowerCase().startsWith(x.toLowerCase())));
    expect(tunda.map((f) => f.nama)).toEqual(["Top-up dari rekening bank lewat gateway", "Verifikasi identitas", "Kartu virtual"]);
    for (const f of tunda) expect(barisFitur(f.nama)[2]).toContain("PRD v3 prioritas P2, ditunda ke v4");
    expect(badan.split("\n").filter((b) => b.includes("PRD v3 prioritas P2, ditunda ke v4")).length).toBe(item.length);
    expect(barisFitur("Top-up dari rekening bank")[2]).toBe("PRD v3 prioritas P2, ditunda ke v4. Integrasi bank bukan lingkup v3 ([[t3-prd]])");
    expect(barisFitur("Verifikasi identitas")[2]).toBe("PRD v3 prioritas P2, ditunda ke v4 ([[t3-prd]])");
    expect(barisFitur("Kartu virtual")[2]).toBe("PRD v3 prioritas P2, ditunda ke v4, dan tercatat bukan lingkup v3 ([[t3-prd]])");
    ada(prd3Halaman, "**Bukan lingkup v3:** pembayaran offline, integrasi bank, user di luar Lestari, kartu virtual", "3.1");
  });
  test("klaim negatif berlingkup: QR dan back office tidak ada di PRD v3 (naskah bagian 1 dan halaman 3.1)", () => {
    for (const [nama, teks] of [["naskah 3 bagian 1", prd3], ["halaman 3.1", prd3Halaman]] as const) {
      expect(teks, `${nama} memuat QR`).not.toMatch(/\bQR\b/);
      expect(teks, `${nama} memuat back office`).not.toMatch(/back office/i);
    }
    expect(barisFitur("QR untuk merchant di luar Lestari")[2]).toBe("Tidak ada di PRD v3, yang menulis user di luar Lestari sebagai bukan lingkup ([[t3-prd]])");
    expect(barisFitur("Back office untuk tim risk")[2]).toBe("Tidak ada di PRD v3. ADR 30 mencatat bahwa back office tim risk akan menampilkan data user luar ([[t3-xss-csrf]])");
    ada(isi(halamanAdr(30)), "Tahap 4 menambah back office tim risk yang menampilkan data user luar", "3.23");
  });
  test("PT berdiri sendiri: satu VPS produksi dengan dua instance API, worker, dan Redis, seperti tabel 3.28", () => {
    const m28 = T3("m28-prd-v4.mdx");
    ada(m28, "| Satu VPS sebagai titik gagal tunggal | Dua instance API, worker, dan Redis di satu VPS: bila VPS mati, semuanya mati | [[t3-dua-instance]] |", "3.28");
    ada(m28, "semua komponen produksi ada di satu VPS", "3.28");
    expect(barisFitur("PT Rekeningo berdiri sendiri")[2]).toBe("Satu VPS produksi menjalankan dua instance API, worker, dan Redis ([[t3-m28]])");
    ada(prd4, "| P0 | PT Rekeningo berdiri sendiri |", "naskah 4");
  });
  test("P2 ke v5 dan bukan lingkup v4: kalimat dari naskah 4, dengan klaim izin dan regulasi hanya sebagai butir bukan lingkup", () => {
    const p2 = baris4.find((m) => m[1] === "P2")!;
    expect(p2[2]).toBe("Ditunda ke v5");
    const butir = p2[3]!.split(", ");
    expect(butir).toEqual(["Laporan merchant real-time", "notifikasi massal skala besar", "cicilan dan tabungan", "API publik untuk POS"]);
    harus(`Hal lain ditunda ke v5 (P2): ${butir[0]!.toLowerCase()}, ${butir[1]}, ${butir[2]}, dan ${butir[3]}.`);
    const bukan = cocok(prd4, /\*\*Bukan lingkup v4\.\*\* ([^\n]+)/)[1]!;
    expect(bukan).toBe("Pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, multi-mata uang, dan klaim izin atau kepatuhan regulasi apa pun.");
    harus("Bukan lingkup v4: pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, dan kartu fisik. Multi-mata uang dan klaim izin atau kepatuhan regulasi apa pun juga bukan lingkup.");
    const tanpaKalimat = badan.replace("klaim izin atau kepatuhan regulasi apa pun", "");
    expect(tanpaKalimat + teksWidget).not.toMatch(/izin|regulasi|OJK|Bank Indonesia|lisensi|berlisensi|berizin|uang elektronik/i);
    ada(naskah4, "Naskah ini juga tidak.", "naskah 4");
    harus("Rincian tiap fitur ada di PRD v4 lengkap, di awal Tahap 4.");
  });
});

// ---- Pertanyaan terbuka ----------------------------------------------------------------------------------------------------
describe("pertanyaan terbuka: tiga pertanyaan naskah 4, tiap klaim ada di halaman Tahap 1 sampai 3 yang ditaut", () => {
  const tanya = [...prd4.split("**Pertanyaan terbuka di PRD.**")[1]!.split("\n\n")[1]!.matchAll(/^- (.+)$/gm)].map((m) => m[1]!);
  test("tiga pertanyaan sama dengan naskah 4, dibuka sebagai Tebak dulu", () => {
    expect(tanya).toEqual([
      "Kalau gateway mengirim kabar dua kali, terlambat, atau tidak mengirim sama sekali, siapa yang tahu?",
      "Kalau tiga tim mengubah tabel yang sama, siapa yang tahu sebelum rilis?",
      "Kalau satu orang di dalam membaca data identitas, bagaimana ketahuan?",
    ]);
    for (const q of tanya) harus(`<summary>Tebak dulu: ${q.charAt(0).toLowerCase()}${q.slice(1)}</summary>`);
    harus("PRD v4 punya tiga pertanyaan yang belum dijawab. Tebak dulu jawabannya, lalu buka apa yang sudah tercatat di Tahap 3 dan apa yang belum.");
    ada(prd4, "Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 4.", "naskah 4");
    expect(hitung(badan, '<details class="question">')).toBe(tanya.length);
  });
  test("pertanyaan 1: at-least-once dan penerima idempoten (3.13), satu-satunya panggilan HTTP keluar adalah ke layanan push (3.28)", () => {
    const alo = isi(halamanAdr(25));
    ada(alo, "Saat penerimanya menggerakkan uang, misalnya webhook dari gateway di Tahap 4. Penyaring \"yang sudah tampil\" tidak cukup, dan penerima wajib idempoten dengan key", "3.13");
    ada(alo, "notifikasi yang terlambat, hilang, atau muncul dua kali", "3.13");
    harus("Tahap 3 mencatat syaratnya, bukan jawabannya. Pengiriman at-least-once bisa datang dua kali, dan penyaring di app tidak cukup bila penerimanya menggerakkan uang. Penerima wajib idempoten dengan key ([[t3-at-least-once]]).");
    ada(T3("m28-prd-v4.mdx"), "Satu-satunya panggilan HTTP keluar dari `api-t3` adalah ke layanan push tiruan", "3.28");
    harus("Yang belum ada: pihak ketiga yang menggerakkan uang. Satu-satunya panggilan HTTP keluar dari api-t3 adalah ke layanan push tiruan ([[t3-m28]]).");
  });
  test("pertanyaan 1, klaim negatif berlingkup: klien HTTP keluar api-t3 hanya di internal/push/push.go, ke POST /v1/pesan", () => {
    const pola = /\bhttp\.(Client|NewRequest|NewRequestWithContext|Post|Get|Head|DefaultClient)\b|\bnet\.Dial|\btls\.Dial|\bgrpc\.Dial/;
    expect(pola.test("req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, body)")).toBe(true);
    const goNon = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(goNon.length).toBeGreaterThan(20);
    expect(goNon.filter((f) => pola.test(fs.readFileSync(path.join(akar, f), "utf8")))).toEqual(["labs/api-t3/internal/push/push.go"]);
    expect(baca("labs/api-t3/internal/push/push.go")).toContain('http.MethodPost, k.url+"/v1/pesan"');
  });
  test("pertanyaan 2: tiga rilis (2.22), aturan 4 ADR 32 (3.27), tim empat orang di satu codebase Go (3.28)", () => {
    const skema = T2("skema-tanpa-downtime.mdx");
    ada(skema, "Perubahan besar dipecah jadi tiga rilis", "2.22");
    harus(`Tahap 2 menulis aturannya: perubahan skema besar dipecah jadi ${kata(3)} rilis ([[t2-skema-tanpa-downtime]]).`);
    const adr32 = isi(halamanAdr(32));
    ada(adr32, "4. Merge ke `main` menjalankan tes dengan PostgreSQL dan Redis sungguhan, dengan `TES_DB_WAJIB` dan `TES_REDIS_WAJIB` menyala, lalu migration dry-run dan k6 smoke 30 detik.", "3.27");
    harus("ADR 32 menetapkan bahwa tiap merge ke main menjalankan tes dengan PostgreSQL dan Redis sungguhan, lalu migration dry-run ([[t3-tim-infra]]).");
    harus("Tiga tim di satu codebase belum pernah diuji di Tahap 3. Tahap 3 dikerjakan satu tim empat orang di satu codebase Go (Asumsi cerita), bukan tiga tim yang memegang tabel yang sama.");
    ada(T3("m28-prd-v4.mdx"), "Timnya empat orang (Asumsi cerita) di satu codebase Go", "3.28");
    ada(T3("m28-prd-v4.mdx"), "| Tiga tim di satu codebase | Empat orang (Asumsi cerita) dan satu codebase Go | [[t3-tim-infra]] |", "3.28");
    ada(T3("m28-prd-v4.mdx"), "**Tiga hal yang belum pernah diuji.**", "3.28");
    expect(halamanAdr(32).id).toBe("t3-tim-infra");
  });
  test("pertanyaan 3: verifikasi identitas ditunda ke v4 (3.1), ADR 30 menulis back office tim risk dan aturan 1 dan 2 (3.23)", () => {
    const xss = isi(halamanAdr(30));
    ada(xss, "Tahap 4 menambah back office tim risk yang menampilkan data user luar", "3.23");
    ada(xss, "1. Teks dari database atau user ditulis ke halaman lewat `textContent` atau escape template", "3.23");
    ada(xss, "2. Halaman dasbor mengirim CSP dengan nonce yang baru di tiap respons", "3.23");
    ada(xss, "jadi aturan 1 dan 2 berlaku di sana", "3.23");
    harus("Pertanyaan ini belum punya jawaban di Tahap 3, karena data identitas belum ada: verifikasi identitas ditunda ke v4 ([[t3-prd]]). ADR 30 mencatat bahwa back office tim risk akan menampilkan data user luar. Aturan 1 dan 2 di ADR itu berlaku di sana ([[t3-xss-csrf]]).");
  });
});

// ---- Menuju Tahap 4 --------------------------------------------------------------------------------------------------------
describe("Menuju Tahap 4: empat ADR dari naskah 4, lima ADR lain dipindai dari halaman, dan dua hal yang belum selesai", () => {
  const lima = [...prd4.split("Lima ADR sebelumnya menulis Tahap 4 sebagai batasnya")[1]!.split("PRD v4 memenuhi kelimanya")[0]!.matchAll(/^- ADR (\d+)/gm)].map((m) => Number(m[1]));
  const jawab = lima.filter((n) => n >= 22);
  const adrT3 = hal.filter((h) => h.tahap === 3 && h.adr && h.ada && h.adr[0]! >= 22 && h.adr[0]! <= 32);
  const sebut = adrT3.filter((h) => /Tahap 4/.test(isi(h).split(/^---\n/m).slice(2).join("---\n"))).map((h) => h.adr![0]!).sort((x, y) => x - y);
  const lain = sebut.filter((n) => !jawab.includes(n));
  test("naskah 4 menulis lima ADR sebelumnya: 12 dari Tahap 1, dan empat dari Tahap 3 yang menjadi jawaban", () => {
    expect(lima).toEqual([12, 22, 25, 26, 32]);
    expect(jawab).toEqual([22, 25, 26, 32]);
    expect(halamanAdr(22).id).toBe("t3-pool");
    harus(`Tahap 4 dimulai dari PRD v4 lengkap dan ${kata(jawab.length)} ADR yang pecah lebih dulu: ADR ${jawab[0]}, ADR ${jawab[1]}, ADR ${jawab[2]}, dan ADR ${jawab[3]}.`);
    ada(jembatan3, "Satu VPS yang menyimpan semuanya adalah titik gagal tunggal yang sengaja diterima di ADR 26.", "naskah 3");
    ada(jembatan3, "webhook masuk yang menggerakkan uang tidak boleh diproses dua kali", "naskah 3");
    ada(jembatan3, "Tiga tim yang mengerjakan gateway, kartu, dan dasbor akan bentrok di satu codebase dan satu skema.", "naskah 3");
    expect(badan, "halaman memakai 'gateway, kartu, dan dasbor' sebagai nama tiga tim, padahal tim Tahap 4 Pembayaran, Merchant, Platform").not.toContain("gateway, kartu, dan dasbor");
    ada(naskah4, "**Tim Pembayaran** (5 orang, dipimpin Nadia)", "naskah 4");
  });
  test("jawaban tidak memakai kapasitas: Hitungan dari 3.29 untuk puncak, pool, dan batas pool", () => {
    harus(`Hitungan di [[t3-estimasi]] memberi puncak ±${koma(p4, 1)} request per detik untuk PRD v4 (Asumsi), jadi yang pecah lebih dulu adalah syarat di dalam ADR, bukan kapasitas.`);
    ada(estimasi, `| Koneksi tertahan oleh semua request (W 20 ms) | 0,35 | ${koma(lPool, 2)} | 18 |`, "3.29");
    ada(estimasi, `Koneksi tertahan oleh semua request adalah L = λ × W = ${koma(p4, 1)} × ${koma(WPOOL, 2)} = ${koma(lPool, 2)}, dengan W 20 ms (Asumsi, belum diukur). Batasnya 2 pool × (10 − 1) = 18`, "3.29");
  });
  test("definisi 'pecah lebih dulu': dua syarat, dan label Asumsi", () => {
    harus('Di halaman ini "pecah lebih dulu" berarti dua hal. Pertama, halaman ADR itu sendiri menulis keadaannya sebagai syarat salah atau hal yang datang di Tahap 4. Kedua, keadaan itu termasuk tiga hal yang belum pernah diuji di [[t3-m28]]. Itu penalaran dari halaman Tahap 3 (Asumsi), bukan urutan kejadian yang direkam.');
    const m28 = T3("m28-prd-v4.mdx");
    ada(m28, "**Tiga hal yang belum pernah diuji.**", "3.28");
    ada(m28, "Pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, dan satu VPS sebagai titik gagal tunggal.", "3.28");
    ada(m28, "| Pihak ketiga yang menggerakkan uang | Satu-satunya panggilan HTTP keluar dari `api-t3` adalah ke layanan push tiruan, yang hanya menerima pemberitahuan. PostgreSQL dan Redis adalah komponen sendiri | [[t3-pool]] |", "3.28");
    ada(m28, "| Tiga tim di satu codebase | Empat orang (Asumsi cerita) dan satu codebase Go | [[t3-tim-infra]] |", "3.28");
  });
  test("empat keadaan: tiap bullet menaut ke halaman ADR yang benar dan mengutip kalimat halaman itu", () => {
    harus("Empat keadaan itu ditulis di halaman ADR-nya:");
    harus(`- ADR 22: bila panggilan luar harus atomik dengan uang, misalnya otorisasi kartu ([[${halamanAdr(22).id}]]).`);
    harus(`- ADR 25: saat penerimanya menggerakkan uang, misalnya webhook dari gateway ([[${halamanAdr(25).id}]]).`);
    harus(`- ADR 26: satu VPS tetap titik gagal tunggal, dan itu diterima sengaja ([[${halamanAdr(26).id}]]).`);
    harus(`- ADR 32: tim naik dari empat ke 10 sampai 15 orang dalam tiga tim, jadi rotasi dan alert dibagi lagi per tim ([[${halamanAdr(32).id}]]).`);
    ada(isi(halamanAdr(22)), "Pertama, bila panggilan luar harus atomik dengan uang, mis. otorisasi kartu di Tahap 4.", "3.8");
    ada(isi(halamanAdr(25)), "Saat penerimanya menggerakkan uang, misalnya webhook dari gateway di Tahap 4.", "3.13");
    ada(isi(halamanAdr(26)), "Satu VPS tetap titik gagal tunggal. Ini diterima sengaja", "3.15");
    ada(isi(halamanAdr(26)), "VPS kedua dijawab di Tahap 4", "3.15");
    ada(isi(halamanAdr(32)), "Tim naik dari empat menjadi 10 sampai 15 orang dalam tiga tim (naskah Tahap 3, jembatan), jadi rotasi dan alert dibagi lagi per tim.", "3.27");
  });
  test("ADR 33 menulis pemicu VPS kedua: jendela kehilangan data lebih besar dari yang bisa diterima Pak Hadi atau PRD; PRD v3 tidak menulis batas itu", () => {
    const adr33 = isi(halamanAdr(33));
    expect(dari("t3-adr-33").ada).toBe(true);
    ada(adr33, "| VPS kedua | Waktu pulih terukur atau jendela kehilangan data lebih besar dari yang bisa diterima Pak Hadi atau PRD. PRD v3 tidak menulis batas itu |", "3.30");
    ada(adr33, "[[t3-jembatan]] meminta kamu menebak keputusan Tahap 3 mana yang pecah lebih dulu. Tahap 4 membaca daftar ini terhadap PRD v4", "3.30");
    harus("ADR 33 menulis pemicu VPS kedua: waktu pulih atau jendela kehilangan data yang lebih besar dari yang bisa diterima Pak Hadi atau PRD ([[t3-adr-33]]). PRD v3 tidak menulis batas itu.");
    expect(badan.indexOf("[[t3-adr-33]]")).toBeGreaterThan(badan.indexOf("- ADR 32: tim naik"));
    expect(badan.indexOf("[[t3-adr-33]]")).toBeLessThan(badan.indexOf("Lima ADR lain"));
  });
  test("lima ADR lain: himpunan dipindai dari semua halaman ADR 22 sampai 32 yang menyebut Tahap 4, lalu dikurangi empat jawaban", () => {
    expect(sebut).toEqual([22, 23, 25, 26, 27, 28, 30, 31, 32]);
    expect(badan).not.toContain("Tahap 4 membacanya");
    expect(lain).toEqual([23, 27, 28, 30, 31]);
    expect(adrT3.map((h) => h.adr![0]!).filter((n) => !sebut.includes(n))).toEqual([24, 29]);
    harus(`${Kata(lain.length)} ADR lain juga menyebut Tahap 4 di halamannya. Halaman ini hanya mencatat kalimatnya:`);
    harus(`- ADR 23 menulis syarat yang sama dengan ADR 25: penerima sistem lain yang menggerakkan uang ([[${halamanAdr(23).id}]]). Halaman ini menghitung syarat itu sekali, lewat ADR 25, jadi ADR 23 tidak menambah daftar di atas.`);
    // ADR 23 memenuhi dua syarat "pecah lebih dulu" juga: kapan-salahnya sama dengan ADR 25 (penerima yang menggerakkan uang, webhook Tahap 4, wajib idempoten).
    for (const n of [23, 25]) ada(isi(halamanAdr(n)), "wajib idempoten dengan key ([[t2-idempotency]])", `ADR ${n}`);
    harus(`- ADR 27: pendaftaran publik membuka endpoint daftar, verifikasi, dan top-up yang belum punya rate limit ([[${halamanAdr(27).id}]]).`);
    harus(`- ADR 28: puncak naik ±${naik} kali, jadi L katalog dihitung ulang ([[${halamanAdr(28).id}]]).`);
    harus(`- ADR 30: back office tim risk menampilkan data user luar ([[${halamanAdr(30).id}]]).`);
    harus(`- ADR 31: pindah hosting mengganti server tepi dan mungkin kunci TLS-nya, jadi ADR ini ditinjau ulang sebelum pindah ([[${halamanAdr(31).id}]]).`);
    ada(isi(halamanAdr(23)), "Saat penerimanya sistem lain yang menggerakkan uang, misalnya webhook di Tahap 4. Penerima wajib idempoten dengan key", "3.9");
    ada(isi(halamanAdr(27)), "Tahap 4 membuka pendaftaran ke publik, dan endpoint daftar, verifikasi, dan top-up belum punya rate limit", "3.17");
    ada(isi(halamanAdr(28)), `Tahap 4 menaikkan puncak request ±${naik} kali (naskah Tahap 4, Asumsi), jadi L katalog dihitung ulang dengan rumus yang sama.`, "3.19");
    ada(isi(halamanAdr(30)), "Tahap 4 menambah back office tim risk yang menampilkan data user luar", "3.23");
    ada(isi(halamanAdr(31)), "mengganti server tepi dan mungkin kunci TLS-nya", "3.25");
    ada(isi(halamanAdr(31)), "ADR ini ditinjau ulang sebelum pindah.", "3.25");
  });
  test("dua hal yang belum selesai: load test aturan 5 ADR 21 Tidak dijalankan (3.28), Idempotency-Key opsional dan M10 (3.21)", () => {
    harus("Dua hal dari Tahap 3 belum selesai dan ikut masuk ke PRD v4:");
    ada(T3("m28-prd-v4.mdx"), "Load test dari aturan 5 ADR 21 Tidak dijalankan, jadi kapasitas satu server tetap belum diukur.", "3.28");
    ada(T2("sengaja-belum.mdx"), "5. Sebelum fitur PRD v3 pertama yang menambah λ atau W ditulis, satu load test mengukur kapasitas api-t2 yang sekarang.", "2.31");
    harus("- Kapasitas satu server belum diukur. Load test dari aturan 5 ADR 21 Tidak dijalankan ([[t3-m28]]).");
    ada(isi(halamanAdr(29)), "Umur Idempotency-Key di bayar, transfer, dan pesanan tetap 24 jam dan tetap opsional (ADR 14). App 1.0 dan 1.1 tanpa key tetap rentan M10", "3.21");
    harus("- Idempotency-Key tetap opsional di bayar, transfer, dan pesanan. App 1.0 dan 1.1 tanpa key tetap rentan M10 ([[t3-offline]]).");
    ada(naskah4, "Idempotency-Key opsional di bayar, transfer, dan pesanan. App 1.0 dan 1.1 tanpa key tetap rentan terhadap M10.", "naskah 4");
    ada(naskah4, "Load test kapasitas (ADR 21 aturan 5) Tidak dijalankan di Tahap 3", "naskah 4");
  });
  test("klaim negatif: tanpa perkakas load test di delapan lab Tahap 3 (k6, wrk, locust, vegeta, hey, Apache Bench), kecuali baris ADR 32 yang menyebut k6 smoke sebagai aturan", () => {
    const delapan = ["api-t3", "t3-pool", "t3-outbox", "t3-instance", "t3-cache", "t3-offline", "t3-dasbor", "t3-mitm"];
    const berkasLab = [...(terlacak ?? [])].filter((f) => delapan.some((l) => f.startsWith(`labs/${l}/`)) && /\.(go|py|md|sql|txt|ya?ml|mod|dart|sh|js|ts|html|json)$|Makefile$|Caddyfile$|Dockerfile$/.test(f));
    expect(berkasLab.length).toBeGreaterThan(150);
    const pola = /\bk6\b|\bwrk\b|\blocust\b|\bvegeta\b|\bhey\b|\bApache ?Bench\b|\bab -[nc]\b/i;
    for (const contoh of ["k6 run beban.js", "wrk -t2 -c10 http://x", "locust -f x.py", "echo GET | vegeta attack", "hey -n 100 http://x", "Apache Bench", "ab -n 100 -c 10 http://x"]) expect(pola.test(contoh), contoh).toBe(true);
    const temuan = berkasLab.flatMap((f) => fs.readFileSync(path.join(akar, f), "utf8").split("\n").filter((l) => pola.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(temuan).toEqual([]);
    ada(T3("m28-prd-v4.mdx"), "(dipindai: k6, wrk, locust, vegeta, hey, Apache Bench)", "3.28");
  });
  test("penutup: tahap selesai, PRD v4 lengkap lewat registry", () => {
    harus("Tahap 3 selesai di sini. PRD v4 lengkap ada di [[t4-prd]].");
    expect(dari("t4-prd").judul).toBe("PRD v4: Rekeningo dibuka ke publik");
    expect(badan).not.toContain("cerita Tahap 4");
  });
});

// ---- Widget tebak ------------------------------------------------------------------------------------------------------------
describe("widget tebak: tepat satu jawaban, posisi dan panjang tidak membocorkan, angka dari 3.29, 3.19, dan rekaman queue.txt bagian A", () => {
  const j = data.pilihan.findIndex((p) => p.benar);
  const jawab = [22, 25, 26, 32];
  test("struktur: tiga pilihan, jawaban benar kedua, tidak yang terpanjang atau terpendek, semua diawali ADR", () => {
    expect(data.pilihan).toHaveLength(3);
    expect(data.pilihan.filter((p) => p.benar)).toHaveLength(1);
    expect(j).toBe(1);
    const panjang = data.pilihan.map((p) => p.teks.length);
    expect(panjang[j]!).toBeLessThan(Math.max(...panjang));
    expect(panjang[j]!).toBeGreaterThan(Math.min(...panjang));
    for (const p of data.pilihan) expect(p.teks.startsWith("ADR "), p.teks).toBe(true);
    expect(data.pilihan[j]!.teks.startsWith(`ADR ${jawab[0]}, ADR ${jawab[1]}, ADR ${jawab[2]}, dan ADR ${jawab[3]}:`)).toBe(true);
    for (let i = 0; i < data.pilihan.length; i++) {
      expect(nilai(data, i).benar).toBe(i === j);
      if (i !== j) expect(nilai(data, i).alasan[1]).toBe(data.pilihan[j]!.alasan);
    }
    expect(new Set(data.pilihan.map((p) => p.alasan)).size).toBe(3);
    expect(data.sumber.jenis).toBe("asumsi");
    expect(data.label.sumber).toBe("Asumsi · penalaran dari halaman ADR Tahap 3");
    expect(data.id).toBe(`${dari("t3-jembatan").id}-tebak`);
    expect(data.sumber.teks).toBe(`Penalaran dari halaman ADR Tahap ${cerita.tahap[2]!.no} dan hitungan Asumsi di halaman ${dari("t3-estimasi").nomor}; hanya kapasitas worker yang berasal dari rekaman labs/t3-outbox/output/queue.txt bagian A; tidak ada lab untuk PRD v4`);
  });
  test("jawaban benar: ADR yang sama dengan naskah 4 dan dengan bullet halaman; tiga hal 3.28; 138,9 × 0,02 = 2,78 dari batas 18", () => {
    expect(jawab).toEqual([22, 25, 26, 32]);
    harus(`Jawaban yang tepat: ADR ${jawab[0]}, ADR ${jawab[1]}, ADR ${jawab[2]}, dan ADR ${jawab[3]}. Alasannya ada di blok Menuju Tahap 4.`);
    // Mutasi tinjauan: noscript yang diubah jadi div atau diberi hidden, dan atribut kepala dokumen, lolos tanpa kunci baris.
    harus(`<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: ADR ${jawab[0]}, ADR ${jawab[1]}, ADR ${jawab[2]}, dan ADR ${jawab[3]}. Alasannya ada di blok Menuju Tahap 4.</p>\n</noscript>`);
    harus('<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v4">');
    const a = data.pilihan[j]!.alasan;
    ada(a, "Halaman 3.28 mencatat tiga hal yang diminta PRD v4 dan belum pernah diuji: pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, dan satu VPS sebagai titik gagal tunggal.");
    ada(a, "ADR 22 salah bila panggilan luar harus atomik dengan uang, misalnya otorisasi kartu. ADR 25 salah saat penerimanya menggerakkan uang, misalnya webhook dari gateway. ADR 26 menerima satu VPS sebagai titik gagal tunggal. ADR 32 mencatat bahwa rotasi dan alert dibagi lagi per tim.");
    ada(a, `L semua request ${koma(p4, 1)} × ${koma(WPOOL, 2)} = ${koma(lPool, 2)} koneksi dari batas 18 (Hitungan; W Asumsi, halaman 3.29).`);
    ada(a, 'Penentuan "lebih dulu" adalah penalaran dari halaman ADR (Asumsi).');
    expect(dari("t3-m28").nomor).toBe("3.28");
    expect(dari("t3-estimasi").nomor).toBe("3.29");
    expect(dari("t3-cache").nomor).toBe("3.19");
    expect(data.pilihan[j]!.teks).toBe("ADR 22, ADR 25, ADR 26, dan ADR 32: uang yang digerakkan pihak ketiga, satu VPS untuk semuanya, dan tiga tim.");
  });
  test("adegan: puncak 138,9 naik 8 kali dari 17,4, dan tim empat orang menulis ADR 22 sampai 33", () => {
    expect(data.adegan).toEqual([
      "Sinta membagikan PRD v4. Raka membuka ADR yang tim empat orang tulis di Tahap 3: ADR 22 sampai 33.",
      `Puncak PRD v4 ±${koma(p4, 1)} request per detik (Asumsi), naik ${naik} kali dari ±${koma(p3, 1)} di Tahap 3.`,
    ]);
    expect(data.judul).toBe("ADR Tahap 3 yang pecah lebih dulu");
  });
  test("pilihan worker (ADR 24): 8,7 kali dari 0,868 ke 7,52, kapasitas 13,33, rekaman 12 sampai 13,33, pemakaian 6,5%, 56%, 72%", () => {
    const hal24 = halamanAdr(24);
    ada(isi(hal24), `Kapasitasnya c ÷ t = ${c} ÷ ${koma(t, 1)} = 13,3 baris per detik`, "3.11");
    expect(koma(kapasitas, 2)).toBe("13,33");
    expect(`${ukur[1]} dan ${ukur[2]}`).toBe(`12 dan ${koma(kapasitas, 2)}`);
    expect(koma(lambdaBayar3, 3)).toBe("0,868");
    expect(koma(notif4, 2)).toBe("7,52");
    expect(koma(notif4 / lambdaBayar3, 1)).toBe("8,7");
    ada(estimasi, `Notifikasi uang naik ${koma(notif4 / lambdaBayar3, 1)} kali (${koma(notif4, 2)} ÷ ${koma(lambdaBayar3, 3)})`, "3.29");
    ada(estimasi, `| Notifikasi uang per detik, puncak | ${koma(lambdaBayar3, 3)} | ${koma(notif4, 2)} | ${koma(kapasitas, 2)} per detik |`, "3.29");
    const pakai = (x: number) => `${Math.round((x / kapasitas) * 100)}%`;
    ada(estimasi, `| Pemakaian worker, puncak | ${koma((lambdaBayar3 / kapasitas) * 100, 1)}% | ${pakai(notif4)} | 100% |`, "3.29");
    ada(estimasi, `| Pemakaian worker, makan siang | 8,3% | ${pakai(makanSiang)} | 100% |`, "3.29");
    ada(estimasi, `${titik(dau(a4) * a4.trx + dau(a4) * topupPerAktif)} × 0,8 ÷ 5.400 = ${koma(makanSiang, 2)} per detik, atau ${pakai(makanSiang)}`, "3.29");
    const p = data.pilihan[0]!;
    expect(p.benar).toBe(false);
    expect(p.teks).toBe(`ADR 24: satu worker outbox tidak muat, karena notifikasi uang naik ${koma(notif4 / lambdaBayar3, 1)} kali, dari ${koma(lambdaBayar3, 3)} ke ${koma(notif4, 2)} per detik.`);
    expect(p.alasan).toBe(
      `Satu worker mengirim ${koma(kapasitas, 2)} per detik (c ÷ t = ${c} ÷ ${koma(t, 1)}, Asumsi), dan rekaman lab mengukurnya antara ${ukur[1]} dan ${koma(kapasitas, 2)} (queue.txt bagian A). Pemakaiannya naik dari ${koma((lambdaBayar3 / kapasitas) * 100, 1)}% ke ${pakai(notif4)} pada puncak dan ${pakai(makanSiang)} saat makan siang (Hitungan, Asumsi; halaman 3.29). Naik jauh, tetapi masih di bawah 100%. Batas PostgreSQL sebagai queue belum diukur (Tidak dijalankan).`,
    );
    ada(isi(halamanAdr(23)), "Batas database lab ini belum diukur: 13,33 per detik adalah c ÷ t, bukan batas PostgreSQL (Tidak dijalankan).", "3.9");
    expect(queue).toContain("# --- A. Kapasitas worker: c pengirim dikali 1 ÷ t");
    expect(hitung(teksWidget, "rekaman")).toBeGreaterThanOrEqual(1);
  });
  test("pilihan cache (ADR 28): 5,21 baca per detik, W 5 ms, L 0,026, dikali 8 jadi 0,21, 24 kali di bawah pemicu 5 koneksi", () => {
    expect(koma(katalog, 2)).toBe("5,21");
    expect(koma(katalog * wCache, 3)).toBe("0,026");
    expect(koma(lCache4, 2)).toBe("0,21");
    expect(Math.round(pemicuCache / lCache4)).toBe(24);
    ada(cache, `L = λ × W = ${koma(katalog, 2)} × ${koma(wCache, 3)} = ${koma(katalog * wCache, 3)} koneksi dari pool 10`, "3.19");
    ada(cache, "Beban tidak memaksa cache", "3.19");
    ada(cache, "memilih cache dengan alasan yang bukan beban", "3.19");
    ada(cache, `ADR 21 menunda cache sampai L kelas query itu mencapai ${pemicuCache} koneksi`, "3.19");
    const p = data.pilihan[2]!;
    expect(p.benar).toBe(false);
    expect(p.teks).toBe(`ADR 28: cache katalog tidak cukup lagi, karena puncak request naik ${naik} kali dan katalog dibaca ${naik} kali lebih sering.`);
    expect(p.alasan).toBe(
      `Di Tahap 3 katalog dibaca ${koma(katalog, 2)} kali per detik dengan W ${wCache * 1000} ms, jadi L = ${koma(katalog, 2)} × ${koma(wCache, 3)} = ${koma(katalog * wCache, 3)} koneksi (Asumsi; halaman 3.19). Dikali ${naik}, L = ${koma(lCache4, 2)} koneksi, sekitar ${Math.round(pemicuCache / lCache4)} kali di bawah pemicu cache ${pemicuCache} koneksi di ADR 21 (Hitungan, semua masukan Asumsi). Beban tidak memaksa cache bahkan di Tahap 3: ADR 28 memilih cache dengan alasan yang bukan beban.`,
    );
  });
  test("penutup widget: tiga keadaan bukan beban, tanpa lab, Tahap 4 dimulai dari PRD v4 lengkap", () => {
    expect(data.penutup).toBe(
      'Pihak ketiga yang menggerakkan uang, satu VPS, dan tiga tim adalah keadaan, bukan beban. Tidak ada lab untuk PRD v4, jadi urutan "lebih dulu" belum diuji. Tahap 4 dimulai dari PRD v4 lengkap dan keempat ADR ini.',
    );
    expect(data.label).toEqual({ sumber: "Asumsi · penalaran dari halaman ADR Tahap 3", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" });
  });
});

// ---- Kartu Cek diri -----------------------------------------------------------------------------------------------------------
describe("kartu Cek diri: tiga kartu sama dengan kartu.json, fakta sama dengan hitungan dan halaman", () => {
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3"]);
    expect(hitung(badan, '<details class="success">')).toBe(3);
    const k = kartu.filter((x) => x.halaman === "t3-jembatan");
    expect(k.map((x) => x.id)).toEqual(["t3-jembatan-1", "t3-jembatan-2", "t3-jembatan-3"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("3.32 Jembatan: pratinjau PRD v4");
      expect(x.url).toBe("tahap-3/jembatan-prd-v4/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab);
    });
  });
  test("jawaban memuat fakta yang sama dengan hitungan: 8 kali, 138,9, 2,78 dari batas 18, 56% dari 13,33, empat ADR", () => {
    expect(soal[0]!.tanya).toBe(`Puncak request naik ${naik} kali di PRD v4. Kenapa kenaikan itu tidak membuat pool atau worker pecah lebih dulu?`);
    expect(soal[0]!.jawab).toBe(
      `Puncak ±${koma(p4, 1)} request per detik adalah Asumsi. L semua request ${koma(p4, 1)} × ${koma(WPOOL, 2)} = ${koma(lPool, 2)} koneksi dari batas 18. Pemakaian worker ${Math.round((notif4 / kapasitas) * 100)}% dari ${koma(kapasitas, 2)} per detik (Hitungan; W dan jumlah pengirim Asumsi). Keduanya masih di bawah batas, jadi yang pecah lebih dulu adalah syarat yang ditulis ADR sendiri.`,
    );
    expect(soal[1]!.tanya).toBe("Sebutkan keadaan yang ditulis ADR 22, ADR 25, ADR 26, dan ADR 32 sendiri.");
    expect(soal[1]!.jawab).toBe(
      "ADR 22: panggilan luar yang harus atomik dengan uang. ADR 25: penerima yang menggerakkan uang. ADR 26: satu VPS sebagai titik gagal tunggal. ADR 32: tim yang naik ke tiga tim, sehingga rotasi dan alert dibagi lagi.",
    );
    expect(soal[2]!.tanya).toBe('Kenapa "pecah lebih dulu" di halaman ini berlabel Asumsi, bukan Rekaman lab?');
    expect(soal[2]!.jawab).toBe(
      `Tidak ada lab yang menjalankan PRD v4. Penentuannya penalaran dari kalimat halaman ADR dan dari tiga hal yang belum pernah diuji di halaman ${dari("t3-m28").nomor}. Urutan kejadian yang sebenarnya baru terlihat saat Tahap 4 dibangun.`,
    );
  });
});

// ---- Struktur dan dunia angka tertutup ---------------------------------------------------------------------------------------
describe("struktur halaman dan dunia angka tertutup", () => {
  const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
  test("hanya satu heading (h3 Cek diri, di blok terakhir); dua tabel; tiga tebakan question; tiga success; satu noscript; tanpa daftar bernomor", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(2);
    expect(hitung(badan, '<details class="question">')).toBe(3);
    expect(hitung(badan, "<details>")).toBe(0);
    expect(hitung(badan, "<noscript>")).toBe(1);
    expect(badan).not.toMatch(/^\d+\. /m);
    expect(badan.split("\n").filter((b) => /^- /.test(b))).toHaveLength(4 + 5 + 2);
    expect(hitung(badan, "<Blok ")).toBe(5);
  });
  test("tanpa ID internal, emoji, tanda seru, kata yang dilarang gaya-bahasa; tanpa kata rekaman untuk angka yang bukan dari rekaman", () => {
    for (const teks of [badan, frontmatter, teksWidget]) {
      expect(teks).not.toMatch(POLA_ID_INTERNAL);
      expect(teks).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(teks).not.toMatch(/!(?!\[)/);
      expect(teks).not.toMatch(/\b(Anda|kita|pengguna|mudah|tinggal)\b|(?<!tidak )\bcukup\b/i);
      expect(teks).not.toMatch(/terukur|ter-ukur|terbukti/i);
    }
    expect(hitung(badan, "Rekaman lab")).toBe(1);
    expect(badan).toContain('berlabel Asumsi, bukan Rekaman lab?');
    expect(hitung(teksWidget, "Rekaman lab")).toBe(0);
    expect((teksWidget.match(/rekaman lab\b/g) ?? []).length).toBe(1);
  });
  test("angka berkoma dan berpemisah ribuan, persen, ADR, dan Tahap: himpunan token sama dengan yang dihitung dari sumber", () => {
    const boleh = new Set([koma(p4, 1), koma(p3, 1), koma(lPool, 2), koma(WPOOL, 2), koma(kapasitas, 2)]);
    const token = [...badan.matchAll(/\d+,\d+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))], "token berkoma di halaman yang tidak dihitung dari sumber").toEqual([]);
    for (const b of boleh) expect(token, `nilai yang dihitung tidak dipakai halaman: ${b}`).toContain(b);
    const ribu = new Set([titik(a3.user), titik(a4.user)]);
    expect([...new Set([...badan.matchAll(/\d{1,3}(?:\.\d{3})+/g)].map((m) => m[0]))].sort()).toEqual([...ribu].sort());
    expect([...new Set([...badan.matchAll(/\d+%/g)].map((m) => m[0]))]).toEqual([`${Math.round((notif4 / kapasitas) * 100)}%`]);
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["21", "22", "23", "25", "26", "27", "28", "30", "31", "32", "33"]));
    expect(new Set([...badan.matchAll(/Tahap \d+(?: → \d+)?/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 2", "Tahap 3", "Tahap 4"]));
    const tokenW = [...teksWidget.matchAll(/\d+,\d+/g)].map((m) => m[0]);
    const bolehW = new Set([koma(p4, 1), koma(p3, 1), koma(lPool, 2), koma(WPOOL, 2), koma(kapasitas, 2), koma(lambdaBayar3, 3), koma(notif4, 2), koma(notif4 / lambdaBayar3, 1), koma((lambdaBayar3 / kapasitas) * 100, 1), koma(katalog, 2), koma(wCache, 3), koma(katalog * wCache, 3), koma(lCache4, 2), koma(t, 1), String(ukur[2]), "0,005"]);
    expect([...new Set(tokenW.filter((x) => !bolehW.has(x)))], "token berkoma di widget yang tidak dihitung dari sumber").toEqual([]);
    expect(new Set([...teksWidget.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["21", "22", "24", "25", "26", "28", "32"]));
  });
});

// ---- Token versi PRD dan nomor Tahap: urutan per baris diturunkan dari registry (mutasi "PRD v4" menjadi "PRD v5" lolos tanpa ini) ----
describe("token versi PRD dan nomor Tahap: urutan di tiap baris sama dengan yang diturunkan dari registry", () => {
  const N2 = cerita.tahap[1]!.no;
  const N3 = cerita.tahap[2]!.no;
  const N4 = cerita.tahap[3]!.no;
  const N5 = cerita.tahap[4]!.no;
  const T = (n: number) => `Tahap ${n}`;
  const P = (n: number) => `PRD v${n}`;
  const V = (n: number) => `v${n}`;
  const ORD: Record<number, string> = { 2: "kedua", 3: "ketiga", 4: "keempat" };
  const tok = (l: string): string[] => [...l.matchAll(/Tahap \d+|PRD v\d+|\bv\d+\b/g)].map((m) => m[0]);
  test("nomor tahap di registry berurutan 2, 3, 4, 5", () => {
    expect([N2, N3, N4, N5]).toEqual([2, 3, 4, 5]);
    expect(N4).toBe(N3 + 1);
  });
  test("kalimat pembuka sama dengan pola 2.33 dengan nomor tahap berikutnya", () => {
    harus(`Ini pratinjau ${P(N4)}, dokumen ${ORD[N4]} yang Sinta tulis untuk Rekeningo. Halaman ini hanya menampilkan apa yang diminta; membangunnya adalah isi ${T(N4)}.`);
    ada(T2("jembatan-prd-v3.mdx"), `Ini pratinjau ${P(N3)}, dokumen ${ORD[N3]} yang Sinta tulis untuk Rekeningo. Halaman ini hanya menampilkan apa yang diminta; membangunnya adalah isi ${T(N3)}.`, "2.33");
    ada(T2("jembatan-prd-v3.mdx"), `Tahap ${N3 - 1} selesai di sini. PRD v${N3} lengkap ada di [[t3-prd]].`, "2.33");
    harus(`${T(N3)} selesai di sini. ${P(N4)} lengkap ada di [[t4-prd]].`);
  });
  test("urutan token tiap baris: PRD v, v, dan Tahap", () => {
    const hasil = badan.split("\n").map(tok).filter((t) => t.length > 0);
    expect(hasil).toEqual([
      [P(N4), T(N4)], // pembuka
      [P(N4)], // aria-label kepala
      [P(N4)], // nama blok pertama
      [T(N3)], // Minggu 10 Tahap 3
      [P(N4), P(N3)], // PRD v4 mengubah lima hal dari PRD v3
      [P(N3), P(N4)], // judul kolom tabel
      [T(N3)], // Selama Tahap 3
      [T(N4)], // noscript
      [P(N4), P(N3), V(N4)], // Enam fitur
      [T(N3)], // judul kolom keadaan
      [P(N3), V(N4), V(N3)], // top-up
      [P(N3), V(N4)], // verifikasi
      [P(N3)], // QR
      [P(N3), V(N4), V(N3)], // kartu
      [P(N3)], // back office
      [V(N5)], // ditunda ke v5
      [V(N4)], // bukan lingkup v4
      [P(N4), T(N4)], // rincian
      [P(N4), T(N3)], // tiga pertanyaan
      [T(N3)], // pertanyaan 1
      [T(N2)], // pertanyaan 2
      [T(N3), T(N3)], // pertanyaan 2, belum pernah diuji
      [T(N3), V(N4)], // pertanyaan 3
      [T(N4)], // nama blok Menuju
      [T(N4), P(N4), P(N4)], // empat ADR
      [T(N4), T(N3)], // definisi
      [P(N3)], // ADR 33: PRD v3 tidak menulis batas itu
      [T(N4)], // lima ADR lain
      [T(N3), P(N4)], // dua hal
      [P(N4)], // kartu 1
      [P(N4), T(N4)], // kartu 3
      [T(N3), P(N4)], // penutup
    ]);
  });
  test("front matter dan baris meta: token versi dan tahap", () => {
    expect(tok(frontmatter)).toEqual([P(N4), P(N4), T(N3)]);
    expect(frontmatter).toContain(`Minggu ${cocok(naskah4, /minggu ke-(\d+) Tahap 3/)[1]}. Sinta membagikan ${P(N4)} untuk PT Rekeningo`);
    expect(frontmatter).toContain(`Dari ADR ${T(N3)}, tebak mana yang pecah lebih dulu.`);
  });
});
