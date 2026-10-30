// Penjaga halaman 4.28 (keputusan 1374 sampai 1376): angka, tautan, label sumber, klaim negatif berlingkup, diagram Rantai, teks
// widget kalkulator, kartu Cek diri, dan baris RISET diturunkan dari registry (cerita.json tahap[2], tahap[3], tahap[4]), naskah
// Tahap 3 dan 4 (plan/CERITA-TAHAP-3.md, plan/CERITA-TAHAP-4.md), halaman tetangga (1.38, 2.30, 3.8, 3.29, 4.13), rekaman
// labs/api-t4/output/beban.txt, labs/t4-webhook/output/retry.txt, kode labs/api-t4/cmd/beban/main.go dan labs/api-t4/run.py, bukan
// dari daftar yang ditulis sendiri. Halaman ini tanpa lab sendiri: setiap angka berlabel Asumsi atau Hitungan, kecuali rujukan ke
// rekaman beban api-t4 yang dihitung ulang dari beban.txt dan dibaca ke kodenya.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci per
// baris lewat estimasi-t4.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat terkunci tidak
// menangkap SALAHNYA kalimat, jadi klaim yang bisa dihitung (pengali, pemakaian, L = λ × W, ambang pool) dihitung ulang di bawah.
// Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-estimasi-inti.json";
import widgetMentah from "../../data/widget/t4-estimasi-kalkulator.json";
import { DaftarAsumsi, DataKalkulator } from "../widgets/kalkulator/skema";
import { duaAngka, hitung, siapkan } from "../widgets/kalkulator/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX, NILAI_JSON } from "./estimasi-t4.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
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

const BERKAS = "situs/src/content/docs/tahap-4/estimasi.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const riset4 = baca("plan/RISET-TAHAP-4.md");
const riset3 = baca("plan/RISET-TAHAP-3.md");
const riset2 = baca("plan/RISET-TAHAP-2.md");
const hal138 = baca("situs/src/content/docs/tahap-1/kerangka-estimasi.mdx");
const hal230 = baca("situs/src/content/docs/tahap-2/estimasi.mdx");
const hal29 = baca("situs/src/content/docs/tahap-2/skema-data.mdx");
const hal329 = baca("situs/src/content/docs/tahap-3/estimasi.mdx");
const hal38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
const hal413 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const beban = baca("labs/api-t4/output/beban.txt");
const retry = baca("labs/t4-webhook/output/retry.txt");
const kodeBeban = baca("labs/api-t4/cmd/beban/main.go");
const runApi = baca("labs/api-t4/run.py");
const readmeApi = baca("labs/api-t4/README.md");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const diagram = DataRantai.parse(diagramMentah);
const data = DataKalkulator.parse(widgetMentah);

interface H { id: string; judul: string; path?: string; topik?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; peran?: string[]; adr?: number[]; lab?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;
const ribu = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// pembulatan setengah ke atas, seperti pembaca membulatkan di tangan (toFixed membulatkan 8,684999 ke 8,68)
const bulat = (n: number, d: number): number => Math.round(n * 10 ** d + 1e-9) / 10 ** d;
const koma = (n: number, d: number): string => bulat(n, d).toFixed(d).replace(".", ",");
const kali = (n: number, d: number): string => koma(n, d).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const dibaca = (s: string): number => Number(s.replace(",", "."));

// ---- masukan dari registry dan naskah --------------------------------------------------------------------------------------
const registry = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));
const a3 = registry[2]!;
const a4 = registry[3]!;
const a5 = registry[4]!;
const mentah = (i: number) => cerita.tahap[i]!.asumsi as unknown as Record<string, number | string>;
const m3 = mentah(2);
const m4 = mentah(3);
const m5 = mentah(4);
const h3 = hitung(a3);
const h4 = hitung(a4);
const h5 = hitung(a5);
const DETIK = 86_400;
const TRX = Number(m4.trx);
const TRX5 = Number(m5.trx);
const MAKAN_SIANG = cocok(naskah3, /jendela makan siang \((\d+)% dalam (\d+) menit\)/);
const FRAKSI_SIANG = Number(MAKAN_SIANG[1]) / 100;
const DETIK_SIANG = Number(MAKAN_SIANG[2]) * 60;
const naskahTopup = cocok(naskah4, /\| Top-up dari bank \|[^|]*\| ([\d,]+) top-up per user aktif per hari \(Asumsi\), ([\d.]+) per hari \|/);
const TOPUP_PER_AKTIF = dibaca(naskahTopup[1]!);
const naskahKiriman = cocok(naskah4, /Kiriman webhook paling banyak (\d+) per kejadian \(jadwal tiruan\)/);
const KIRIMAN = Number(naskahKiriman[1]);
const naskahVer = cocok(naskah4, /\| Verifikasi identitas \|[^|]*\| ([\d.]+) pendaftar per hari \(Asumsi\) \|/);
const PENDAFTAR = angka(naskahVer[1]!);
const naskahUnggah = cocok(naskah4, /\| Unggahan file \|[^|]*\| ([\d.]+) per hari \((\d[\d.]*) pendaftar × (\d+) file\) × (\d+) KB \|/);
const FILE_PER_PENDAFTAR = Number(naskahUnggah[3]);
const naskahKartu = cocok(naskah4, /\| Otorisasi kartu \|[^|]*\| ([\d.]+) per hari \((\d+)% dari ([\d.]+) aktif × (\d+); Asumsi\) \|/);
const FRAKSI_KARTU = Number(naskahKartu[2]) / 100;
const naskahWorker = cocok(naskah4, /\| c = (\d+), t = ([\d,]+) detik \(Asumsi Tahap 3\)/);
const C = Number(naskahWorker[1]);
const T_PUSH = dibaca(naskahWorker[2]!);
const KAP = C / T_PUSH;
const naskahVerCoba = cocok(naskah4, /tiap pekerjaan memakai (\d+) percobaan × (\d+) detik \(ADR 25\)/);
const PERCOBAAN = Number(naskahVerCoba[1]);
const TIMEOUT = Number(naskahVerCoba[2]);
const naskahKoneksi = cocok(naskah4, /\| Koneksi database \|[^|]*\| (\d+) × (\d+) \+ (\d+) × (\d+) \+ (\d+) \+ (\d+) \+ (\d+) \|/);
const [, INST, POOL, INST_BAYAR, POOL_BAYAR, WORKER_DB, ADMIN, CADANGAN] = naskahKoneksi.map(Number) as number[];
const MAX_KONEKSI = 100;
const W_DB = dibaca(cocok(naskah3, /W (\d+) ms \(Asumsi; lab t3-pool/)[1]!) / 1000;
const POSTING_PER_TRX = 2;
const BYTE_POSTING = 250;
const PARTISI_POSTING = 440_000_000;
const TIM = cocok(naskah4, /\| Ukuran tim \|[^|]*\| (\d+) \+ (\d+) \+ (\d+) \|/);
const TIM_ORANG = [Number(TIM[1]), Number(TIM[2]), Number(TIM[3])];

const lam = (perHari: number) => (perHari / DETIK) * a4.puncak; // λ puncak per detik untuk satu kelas Tahap 4
const trx3Hari = h3.dau * TRX;
const trx4Hari = h4.dau * TRX;
const topupHari = h4.dau * TOPUP_PER_AKTIF;
const kartuHari = h4.dau * FRAKSI_KARTU;
const unggahHari = Number(m4.upload);
const lamTrx3 = (trx3Hari / DETIK) * a3.puncak;
const lamTrx4 = lam(trx4Hari);
const lamTop = lam(topupHari); // 0,5787 tepat
const lamVer = lam(PENDAFTAR);
const lamKartu = lam(kartuHari);
const lamUnggah = lam(unggahHari);
const notif4 = lam(trx4Hari + topupHari);
const siang3 = (trx3Hari * FRAKSI_SIANG) / DETIK_SIANG;
const siang4 = ((trx4Hari + topupHari) * FRAKSI_SIANG) / DETIK_SIANG;
const pakai3 = lamTrx3 / KAP;
const pakai4 = notif4 / KAP;
const L3 = h3.puncak * W_DB;
const L4 = h4.puncak * W_DB;
const BATAS_L = INST * (POOL - 1);
const posting3 = h3.dau * TRX * POSTING_PER_TRX * 365;
const posting4 = h4.dau * TRX * POSTING_PER_TRX * 365;
const gbLedger3 = (posting3 * BYTE_POSTING) / 1e9;
const gbLedger4 = (posting4 * BYTE_POSTING) / 1e9;
const gbD1 = (h4.dau * TRX * 365 * Number(m4.baris)) / 1e9;
const gbFile = (unggahHari * Number(m4.fileKB) * 365) / 1e6;
// λ seperti tertulis di halaman (0,579 dan 0,116): hasil turunan dihitung dari angka yang tertulis, supaya pembaca bisa mengulangnya.
const lamTopTulis = dibaca(koma(lamTop, 3));
const lamVerTulis = dibaca(koma(lamVer, 3));
const notif4Tulis = dibaca(koma(notif4, 2));
const kapTulis = dibaca(koma(KAP, 2));
// Tahap 5: masukan dari registry (a5, m5); perilaku per user dari Tahap 4 (TRX, TOPUP_PER_AKTIF)
const notif5 = (h5.dau * (TRX + TOPUP_PER_AKTIF)) / DETIK * a5.puncak;
const notif5Dua = (h5.dau * (TRX5 + TOPUP_PER_AKTIF)) / DETIK * a5.puncak;
const notif5Tulis = dibaca(koma(notif5, 1));
const pakai5 = notif5 / KAP;
const L5 = h5.puncak * W_DB;
const gbFile5 = (Number(m5.upload) * Number(m5.fileKB) * 365) / 1e6;
const detikUmum5 = (a5.user * T_PUSH) / C;

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d+\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("lima baris RISET R4-245 sampai R4-249 sama dengan nilai terkunci", () => {
    expect(riset4.split("\n").filter((b) => /^\| R4-24[5-9] \|/.test(b))).toEqual(BARIS_RISET);
  });
  test("nilai string JSON Rantai dan widget sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kalkulator"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t4-estimasi-inti.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(JSON.parse(baca("situs/data/widget/t4-estimasi-kalkulator.json")))).toEqual(NILAI_JSON.kalkulator);
  });
});

describe("registry, naskah, blok, dan tautan", () => {
  const reg = dari("t4-estimasi");
  test("entri registry dan baris peta naskah cocok", () => {
    expect(reg).toMatchObject({ ada: true, nomor: "4.28", jenis: "konsep", inti: true, prasyarat: ["t4-m39"], tahap: 4, peran: ["backend"], topik: "Desain sistem" });
    expect(reg.path).toBe("tahap-4/estimasi.md");
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(reg.path!, ".md"));
    expect(reg.lab).toBeUndefined();
    expect(naskah4).toContain("| 4.28 | 4 | Estimasi Tahap 4 → 5 | Konsep | ★ | – | kalkulator |");
    expect(reg.judul).toBe("Estimasi Tahap 4 → 5");
    expect(frontmatter).toContain('title: "4.28 Estimasi Tahap 4 → 5"');
    expect(hal.filter((h) => h.nomor === "4.28").map((h) => h.id)).toEqual(["t4-estimasi"]);
    expect(dari("t4-adr-45")).toMatchObject({ nomor: "4.29", prasyarat: ["t4-estimasi"], adr: [45] });
    expect(dari("t4-m39")).toMatchObject({ nomor: "4.27", jenis: "masalah" });
    expect(dari("t4-modul")).toMatchObject({ nomor: "4.13" });
  });
  test("description memuat puncak Tahap 4 dan 5 dan label sama dengan isi", () => {
    const desc = cocok(frontmatter, /^description: (.+)$/m)[1]!;
    expect(desc).toContain(`Puncaknya ${koma(h4.puncak, 1)} request per detik; dikali ${a5.user / a4.user} untuk Tahap 5 menjadi ${kali(h5.puncak, 1)}, dan worker notifikasi melewati kapasitasnya.`);
    expect(desc).toContain("berlabel Asumsi atau Hitungan");
    expect(pakai4 * 10).toBeGreaterThan(1);
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-m39\]\] · Jalur inti<\/p>/);
    expect(reg.menit).toBe(Number(m[1]) + Number(m[2]));
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; blok Coba punya ringkasan 'aman' dengan angka dari hitungan", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    const jam5 = hitung({ ...a5, puncak: DETIK / 3600 });
    harus(`puncak naik ${a5.user / a4.user} kali, bukan ${Math.round(h4.puncak / h3.puncak)} kali, dan walau semua request sehari masuk di satu jam, puncak Tahap 5 ±${duaAngka(jam5.puncak)} request per detik (Asumsi).`);
  });
  test("tautan [[id]]: himpunan sama; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["D1", "berikutnya", "t2-estimasi", "t2-skema", "t3-estimasi", "t3-m18", "t3-m27", "t3-pool", "t4-adr-45", "t4-m39", "t4-modul"]);
    const sesuai: [string, string, string][] = [
      ["D1", "1.38", "Kerangka berpikir dan estimasi"], ["t2-estimasi", "2.30", "Estimasi Tahap 2"], ["t2-skema", "2.9", "Skema data"],
      ["t3-estimasi", "3.29", "Estimasi Tahap 3"], ["t3-m18", "3.6", "M18"], ["t3-m27", "3.26", "M27"], ["t3-pool", "3.8", "Connection pool"],
      ["t4-adr-45", "4.29", "ADR 45"], ["t4-m39", "4.27", "M39"], ["t4-modul", "4.13", "Modular monolith"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      if (dari(idh).tahap === 4) {
        expect(naskah4, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      }
    }
    expect(dari("t4-m39").ada, "4.27 belum merge: tautannya tampil (segera) sampai halaman itu masuk").toBeDefined();
    expect(dari("t4-adr-45").ada).toBeDefined();
    expect(cara).toContain("Label sumber");
    expect(hitungKali(badan, "[Label sumber](/cara-pakai/#label-sumber)")).toBe(1);
    expect(hitungKali(badan, "[Rekaman lab](/cara-pakai/#label-sumber)")).toBe(1);
  });
  test("janji halaman lain: 4.29 meminta 4.28 sebagai prasyarat; 3.29 dan 3.8 memuat angka yang dipakai di sini", () => {
    expect(hal329).toContain(`| Puncak request per detik | ${koma(h3.puncak, 1)} | ${koma(h4.puncak, 1)} |`);
    expect(hal329).toContain(`| Koneksi database | ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} | ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} | ${MAX_KONEKSI} |`);
    expect(hal329).toContain(`| Posting per tahun | ${koma(posting3 / 1e6, 3)} juta | ${koma(posting4 / 1e6, 1)} juta | ±${PARTISI_POSTING / 1e6} juta |`);
    expect(hal329).toContain(`rumus ledger dari ±${duaAngka(gbLedger3)} GB ke ±${duaAngka(gbLedger4)} GB.`);
    expect(hal38).toContain(`${INST} × ${POOL} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} koneksi`);
    expect(hal38).toContain("Pool n koneksi penuh bila pembayaran ke-n tiba selagi n − 1 pembayaran sebelumnya masih memegang koneksi.");
    expect(hal38).toContain("pool penuh bila L melebihi n − 1");
  });
  test("halaman tidak membuka isi Tahap 5 dan tidak memutuskan arsitektur: tanpa ADR 46 ke atas, tanpa isi ADR 45, tanpa label Simulasi", () => {
    expect(badan).not.toMatch(/ADR (4[6-9]|[5-9]\d)\b/);
    expect(hitungKali(badan, "ADR 45")).toBe(0);
    expect(hitungKali(badan, "ADR 22")).toBe(1);
    expect(badan).not.toMatch(/Simulasi|Kubernetes|service mesh|Kafka|read replica|BFF/i);
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/\bR[2-4]-\d+\b/);
  });
});

describe("registry dan naskah: masukan dan hasil yang dipakai halaman", () => {
  test("masukan registry Tahap 3, 4, dan 5, dan kunci yang ada hanya untuk unggahan di Tahap 4 dan 5", () => {
    expect([a3.user, a3.aktif, a3.req, a3.puncak]).toEqual([10000, 25, 60, 10]);
    expect([a4.user, a4.aktif, a4.req, a4.puncak]).toEqual([100000, 20, 60, 10]);
    expect([a5.user, a5.aktif, a5.req, a5.puncak]).toEqual([1000000, 20, 60, 10]);
    expect([m3.trx, m4.trx, m5.trx, m3.baris, m4.baris, m5.baris]).toEqual([3, 3, 2, 300, 300, 300]);
    expect([m4.upload, m4.fileKB, m5.upload, m5.fileKB]).toEqual([2000, 500, 20000, 500]);
    expect(Object.keys(m4).sort()).toEqual(["aktif", "baris", "fileKB", "puncak", "req", "tim", "trx", "upload", "user"]);
    expect(Object.keys(m5).sort()).toEqual(["aktif", "baris", "fileKB", "puncak", "req", "tim", "trx", "upload", "user"]);
    expect(m3.upload).toBeUndefined();
    expect(m4.tim).toBe("13 developer, 3 tim");
  });
  test("masukan naskah: top-up, kiriman, pendaftar, unggahan, kartu, worker, percobaan, koneksi, tim", () => {
    expect([TOPUP_PER_AKTIF, topupHari]).toEqual([0.25, 5000]);
    expect(KIRIMAN).toBe(6);
    expect([PENDAFTAR, FILE_PER_PENDAFTAR, PENDAFTAR * FILE_PER_PENDAFTAR]).toEqual([1000, 2, unggahHari]);
    expect([FRAKSI_KARTU, kartuHari]).toEqual([0.05, 1000]);
    expect([C, T_PUSH, KAP]).toEqual([4, 0.3, 4 / 0.3]);
    expect([PERCOBAAN, TIMEOUT]).toEqual([5, 3]);
    expect([INST, POOL, INST_BAYAR, POOL_BAYAR, WORKER_DB, ADMIN, CADANGAN]).toEqual([2, 10, 2, 5, 4, 3, 3]);
    expect([FRAKSI_SIANG, DETIK_SIANG]).toEqual([0.8, 5400]);
    expect(W_DB).toBe(0.02);
    expect(TIM_ORANG).toEqual([5, 4, 4]);
    expect(naskah4).toContain("| 13 orang (Asumsi cerita; jembatan 3.32: 10 sampai 15)");
  });
  test("pengali: puncak naik 8 kali di Tahap 3 ke 4 dan 10 kali di Tahap 4 ke 5; 7,98 hanya dari angka yang dibulatkan", () => {
    expect(h4.puncak / h3.puncak).toBeCloseTo(8, 10);
    expect(10 * (a4.aktif / a3.aktif) * (a4.req / a3.req)).toBeCloseTo(8, 10);
    expect(h5.puncak / h4.puncak).toBeCloseTo(10, 10);
    expect((a5.user / a4.user) * (a5.aktif / a4.aktif) * (a5.req / a4.req)).toBe(10);
    expect(koma(138.9 / 17.4, 2)).toBe("7,98");
    expect(koma(h3.puncak, 1)).toBe("17,4");
    expect(koma(h4.puncak, 1)).toBe("138,9");
    expect(kali(h5.puncak, 1)).toBe("1.388,9");
    expect(naskah4).toContain("138,9 puncak (Tahap 3: 17,4; naik 7,98 kali, dibulatkan 8 kali)");
    expect(trx4Hari / h4.reqHari).toBeCloseTo(0.05, 10);
  });
  test("naskah Tahap 4 memuat hasil yang sama dengan hitungan di sini", () => {
    expect(naskah4).toContain(`${koma(h4.puncak / 10, 1)} rata-rata dan ${koma(h4.puncak, 1)} puncak`);
    expect(naskah4).toContain(`${koma(lamTrx4 / 10, 3)} rata-rata dan ${koma(lamTrx4, 2)} puncak (Tahap 3: ${koma(lamTrx3, 3)}; naik 8,0 kali)`);
    expect(naskah4).toContain(`jendela makan siang (80% dalam 90 menit): ${koma((trx4Hari * FRAKSI_SIANG) / DETIK_SIANG, 2)}`);
    expect(naskah4).toContain(`${koma(lamTop / 10, 3)} rata-rata dan ${koma(lamTop, 3)} puncak`);
    expect(naskah4).toContain(`batas atas ${koma(KIRIMAN * lamTopTulis, 2)} per detik bila semua kiriman gagal`);
    expect(naskah4).toContain(`${koma(notif4, 2)} per detik puncak = ${Math.round(pakai4 * 100)}% kapasitas (Tahap 3: ${koma(lamTrx3, 3)} ÷ ${koma(KAP, 1)} = ${koma(pakai3 * 100, 1)}%)`);
    expect(naskah4).toContain(`makan siang: ${ribu(trx4Hari + topupHari)} × ${koma(FRAKSI_SIANG, 1)} ÷ ${ribu(DETIK_SIANG)} = ${koma(siang4, 2)} per detik = ${Math.round((siang4 / KAP) * 100)}%`);
    expect(naskah4).toContain(`±${ribu((100_000 * T_PUSH) / C)} detik, ${(100_000 * T_PUSH) / C / 60} menit`);
    expect(naskah4).toContain(`${koma(lamVer, 3)} per detik puncak. Bila vendor mati`);
    expect(naskah4).toContain(`${koma(lamVer, 3)} × ${PERCOBAAN * TIMEOUT} = ${koma(lamVer * PERCOBAAN * TIMEOUT, 2)} dari ${C} worker, dan ${koma(lamVer * PERCOBAAN * TIMEOUT, 2)} + ${koma(notif4 * T_PUSH, 2)}`);
    expect(naskah4).toContain(`${koma(lamUnggah, 3)} per detik puncak = ${Math.round(lamUnggah * Number(m4.fileKB))} KB per detik; ${koma((unggahHari * Number(m4.fileKB)) / 1e6, 0)} GB per hari`);
    expect(naskah4).toContain(`${koma(lamKartu, 3)} per detik puncak`);
    expect(naskah4).toContain(`${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} (Tahap 3: ${INST * POOL + WORKER_DB + ADMIN + CADANGAN}`);
    expect(naskah4).toContain(`L = ${koma(lamTopTulis * 0.3, 2)} / ${koma(lamTopTulis * 2, 2)} / ${koma(lamTopTulis * 3, 2)} / 8,68 / ${koma(lamTopTulis * 30, 1)}`);
    expect(naskah4).toContain(`penuh dalam ±${koma((INST_BAYAR * POOL_BAYAR) / lamTopTulis, 1)} detik (10 ÷ 0,579)`);
    expect(naskah4).toContain(`T > 9 ÷ 0,579 = ±${koma(9 / lamTopTulis, 1)} detik`);
    expect(naskah4).toContain("4,0 dari 4 worker");
    expect(naskah4).toContain(`${koma(bulat(notif4Tulis / dibaca(koma(lamTrx3, 3)), 1), 1)} kali (7,52 ÷ 0,868)`);
  });
  test("selisih pembulatan yang ditulis halaman: λ tepat 0,5787 dan 0,579 yang tertulis", () => {
    expect(koma(lamTop, 4)).toBe("0,5787");
    expect(lamTopTulis).toBe(0.579);
    expect(lamTopTulis * 15).toBeCloseTo(8.685, 10);
    expect(koma(lamTop * 15, 2)).toBe("8,68");
    expect(koma(lamTopTulis * 15, 2)).toBe("8,69");
    expect(koma(9 / lamTopTulis, 1)).toBe("15,5");
    expect(koma(9 / lamTop, 1)).toBe("15,6");
    expect(koma(10 / lamTop, 1)).toBe(koma(10 / lamTopTulis, 1));
    expect(koma(4 / (lamTop / 2), 1)).toBe(koma(4 / (lamTopTulis / 2), 1));
    expect(koma(KAP, 3)).toBe("13,333");
    expect(koma((100_000 * 1) / KAP, 0)).toBe("7.500".replace(".", ""));
    expect(koma(100_000 / dibaca("13,3"), 0)).toBe("7519");
    expect(koma(notif4Tulis / kapTulis * 100, 1)).toBe("56,4");
    expect(Math.round((notif4Tulis / kapTulis) * 100)).toBe(56);
    // KONSISTENSI-4 menulis kedua penyesuaian itu di naskah
    expect(naskah4).toContain("λ top-up tepatnya 20.000 × 0,25 ÷ 86.400 × 10 = 0,5787 per detik");
    expect(naskah4).toContain("Ambang client menyerah ±15,5 detik (9 ÷ 0,579) berlaku untuk satu pool 10");
    expect(naskah4).toContain("Kapasitas worker 4 ÷ 0,3 = 13,333 per detik");
    expect(naskah4).toContain("100.000 ÷ 13,333 = 7.500 detik; dengan 13,3 hasilnya 7.519");
  });
  test("tiga tempat sinkron: 1.38, 2.30, 3.29, dan registry memuat puncak, data, dan ±1.400 yang sama", () => {
    expect(hal138).toContain(`| Puncak request per detik (Tahap 4) | ±${duaAngka(h4.puncak)} | ${ribu(a4.user)} × ${a4.aktif}% × ${a4.req} ÷ ${ribu(DETIK)} × ${a4.puncak} |`);
    expect(hal138).toContain(`| Puncak request per detik (Tahap 5) | ±${duaAngka(h5.puncak)} | ${ribu(a5.user)} × ${a5.aktif}% × ${a5.req} ÷ ${ribu(DETIK)} × ${a5.puncak} |`);
    expect(duaAngka(h5.puncak)).toBe("1.400");
    expect(hal138).toContain(`| Data transaksi per tahun (Tahap 5) | ±${duaAngka((h5.dau * TRX5 * 365 * Number(m5.baris)) / 1e9)} GB | ${ribu(h5.dau)} × ${TRX5} transaksi × 365 × ${m5.baris} byte |`);
    expect(hal329).toContain(`| Puncak request per detik | ${koma(h3.puncak, 1)} | ${koma(h4.puncak, 1)} |`);
    expect(hal230).toContain(`dijadwalkan saat ±${PARTISI_POSTING / 1e6} juta posting per tahun di Tahap 5`);
    expect(hal29).toContain("±440 juta");
  });
  test("pertumbuhan database: 5,475 juta posting di Tahap 3, 43,8 juta di Tahap 4, partisi di ±440 juta; Tahap 5 tidak menyamai bila 2 transaksi", () => {
    expect(posting3).toBe(5_475_000);
    expect(posting4).toBe(43_800_000);
    expect(posting4 / posting3).toBeCloseTo(8, 10);
    expect(naskah4).toContain(`\`posting\` ±44 juta (${ribu(h4.dau)} × ${TRX} × ${POSTING_PER_TRX} × 365 = ${koma(posting4 / 1e6, 1)} juta) | ±11 GB (${koma(gbLedger4, 2)} GB)`);
    expect(naskah4).toContain("| 5 | 1 juta | ±30, sebagian di service terpisah | `posting` ±440 juta | ±110 GB |");
    // Tahap 5 menurut naskah memakai 3 transaksi (438 juta ≈ 440 juta), registry memakai 2 (292 juta)
    expect(h5.dau * TRX * POSTING_PER_TRX * 365).toBe(438_000_000);
    expect(h5.dau * TRX5 * POSTING_PER_TRX * 365).toBe(292_000_000);
    expect(koma(gbLedger3, 2)).toBe("1,37");
    expect(koma(gbLedger3 * 8, 2)).toBe("10,95");
    expect(koma(gbLedger4, 2)).toBe("10,95");
    expect(koma(gbD1, 2)).toBe("6,57");
    expect(koma(gbLedger4 / gbD1, 1)).toBe("1,7");
    expect(naskah4).toContain(`${gbFile} GB per tahun`);
    expect(naskah4).toContain(`(${gbFile} ÷ ${koma(gbLedger4, 2)})`);
    expect(naskah4).toContain(`(${gbFile} ÷ ${koma(gbD1, 2)})`);
    expect(Math.round(gbFile / gbLedger4)).toBe(33);
    expect(Math.round(gbFile / gbD1)).toBe(56);
    expect(gbFile5).toBe(3650);
  });
});

describe("halaman estimasi.mdx: tiap angka turunan", () => {
  test("Inti, Rantai, dan Cek 3 pertanyaan", () => {
    harus(`Pada puncak ${koma(h4.puncak, 1)} request per detik, worker terpakai ${Math.round(pakai4 * 100)}%, dan ${Math.round((siang4 / KAP) * 100)}% saat makan siang (Asumsi naskah;`);
    harus(`Dikali ${a5.user / a4.user} untuk Tahap 5, dengan perilaku per user tetap, puncaknya ${kali(h5.puncak, 1)} dan pemakaian worker ${Math.round((notif5Tulis / kapTulis) * 100)}%.`);
    harus(`1. User naik ${a5.user / a4.user} kali dari Tahap 4 ke Tahap 5. Berapa kali puncak request naik, dan kenapa tidak ${Math.round(h4.puncak / h3.puncak)} kali seperti Tahap 3 ke Tahap 4?`);
    harus(`2. Worker terpakai ${Math.round(pakai4 * 100)}% di Tahap 4. Berapa persen bila hanya jumlah user yang naik ${a5.user / a4.user} kali dan kapasitasnya tetap?`);
    harus(`**2.** Worker terpakai ${Math.round(pakai4 * 100)}% di Tahap 4. Berapa persen bila hanya jumlah user yang naik ${a5.user / a4.user} kali dan kapasitasnya tetap?`);
    harus(`3. Rekaman beban menulis koneksi paling banyak ≤ ${POOL}. Apakah itu bukti bahwa pool tidak sesak?`);
    expect(Math.round(pakai5 * 100)).toBe(Math.round((notif5Tulis / kapTulis) * 100));
  });
  test("Coba: skenario Aktif 10% dan Satu jam", () => {
    harus(`jadi Tahap 4 tampil ${duaAngka(h4.puncak)} dan Tahap 5 tampil ${duaAngka(h5.puncak)}. Tabel di blok Paham memakai ${koma(h4.puncak, 1)} dan ${kali(h5.puncak, 1)}.`);
    const aktif10 = hitung({ ...a5, aktif: 10 });
    const jam = hitung({ ...a5, puncak: DETIK / 3600 });
    harus(`**Aktif 10%**: user aktif tinggal setengahnya, dan puncak turun ke ±${duaAngka(aktif10.puncak)}, tetap ${Math.round(aktif10.puncak / h4.puncak)} kali Tahap 4.`);
    harus(`faktor puncaknya ${DETIK / 3600}, dan puncak naik ke ±${duaAngka(jam.puncak)}, atau ${koma(jam.puncak / h5.puncak, 1)} kali dari Tahap 5 biasa`);
    expect(a5.aktif / 10).toBe(2);
    expect(aktif10.puncak / h4.puncak).toBeCloseTo(5, 10);
    expect(duaAngka(aktif10.puncak)).toBe("690");
    expect(duaAngka(jam.puncak)).toBe("3.300");
    expect(duaAngka(h4.puncak)).toBe("140");
  });
  test("Paham 1: tabel request dan pengali", () => {
    harus(`**1. Hitung ulang request dari masukan registry.** Rumusnya dari [[D1]], masukannya \`tahap[3].asumsi\` di \`cerita.json\`.`);
    expect(cerita.tahap[3]!.asumsi.user).toBe(100000);
    harus(`| User terdaftar | ${ribu(a4.user)} | PRD v4 |`);
    harus(`| User aktif harian | ${ribu(h4.dau)} | ${ribu(a4.user)} × ${a4.aktif}% |`);
    harus(`| Request per hari | ${ribu(h4.reqHari)} | ${ribu(h4.dau)} × ${a4.req} request |`);
    harus(`| Rata-rata request per detik | ${koma(h4.rata, 1)} | ${ribu(h4.reqHari)} ÷ ${ribu(DETIK)} |`);
    harus(`| Puncak request per detik | ${koma(h4.puncak, 1)} | ${ribu(h4.reqHari)} ÷ ${ribu(DETIK)} × ${a4.puncak} |`);
    harus(`Puncak Tahap 3 adalah ${koma(h3.puncak, 1)} ([[t3-estimasi]]). Dari angka yang dibulatkan, ${koma(h4.puncak, 1)} ÷ ${koma(h3.puncak, 1)} = ${koma(dibaca(koma(h4.puncak, 1)) / dibaca(koma(h3.puncak, 1)), 2)}, jadi puncak naik ${Math.round(h4.puncak / h3.puncak)} kali.`);
    harus(`Puncak per detik adalah rata-rata per detik dikali faktor puncak.`);
  });
  test("Paham 2: tabel kelas pekerjaan dan kalimat sesudahnya", () => {
    harus(`Semua kelas memakai faktor puncak ${a4.puncak} yang sama: per hari ÷ ${ribu(DETIK)} × ${a4.puncak}.`);
    harus(`| Semua request | ${ribu(h4.reqHari)} | ${koma(h4.puncak, 1)} | tabel di atas |`);
    harus(`| Transaksi uang: bayar, transfer, QR | ${ribu(trx4Hari)} | ${koma(lamTrx4, 2)} | ${ribu(h4.dau)} × ${TRX} transaksi |`);
    harus(`| Top-up dari bank | ${ribu(topupHari)} | ${koma(lamTop, 3)} | ${ribu(h4.dau)} × ${koma(TOPUP_PER_AKTIF, 2)} top-up |`);
    harus(`| Verifikasi identitas | ${ribu(PENDAFTAR)} | ${koma(lamVer, 3)} | ${ribu(PENDAFTAR)} pendaftar |`);
    harus(`| Otorisasi kartu virtual | ${ribu(kartuHari)} | ${koma(lamKartu, 3)} | ${FRAKSI_KARTU * 100}% × ${ribu(h4.dau)} × 1 |`);
    harus(`| Unggahan file | ${ribu(unggahHari)} | ${koma(lamUnggah, 3)} | ${ribu(PENDAFTAR)} pendaftar × ${FILE_PER_PENDAFTAR} file |`);
    harus(`Rata-rata sehari untuk transaksi uang adalah ${koma(lamTrx4 / a4.puncak, 3)} per detik dan untuk top-up ${koma(lamTop / a4.puncak, 3)}.`);
    harus(`Transaksi uang adalah ${Math.round((trx4Hari / h4.reqHari) * 100)}% dari semua request (${ribu(trx4Hari)} ÷ ${ribu(h4.reqHari)}).`);
    harus(`Jendela makan siang memuat ${FRAKSI_SIANG * 100}% transaksi sehari dalam ${DETIK_SIANG / 60} menit, yaitu ${ribu(DETIK_SIANG)} detik: ${ribu(trx4Hari)} × ${koma(FRAKSI_SIANG, 1)} ÷ ${ribu(DETIK_SIANG)} = ${koma((trx4Hari * FRAKSI_SIANG) / DETIK_SIANG, 2)} per detik.`);
    harus(`Gateway mengulang kiriman yang gagal sampai kiriman ke-${KIRIMAN}. Bila semua kiriman gagal, λ menjadi ${KIRIMAN} × ${koma(lamTopTulis, 3)} = ${koma(KIRIMAN * lamTopTulis, 2)} per detik (Hitungan atas jadwal tiruan, Asumsi).`);
    harus("Dari kelas baru di PRD v4, registry hanya memuat unggahan per hari dan ukuran file; angka kelas lain adalah Asumsi naskah.");
    harus("Tiap kelas punya λ sendiri, yaitu jumlah kedatangan per detik.");
    expect(TRX).toBe(3);
    expect(hitungKali(badan, "λ")).toBeGreaterThan(0);
    expect(badan.indexOf("λ")).toBe(badan.indexOf("Tiap kelas punya λ sendiri, yaitu jumlah kedatangan per detik.") + "Tiap kelas punya ".length);
  });
  test("Paham 3: kapasitas worker, pemakaian terhadap batas, koneksi, posting, dan pengumuman", () => {
    harus(`Worker punya kapasitas c ÷ t, dengan c = ${C} pengirim serentak dan t = ${koma(T_PUSH, 1)} detik per pengiriman. Jadi ${C} ÷ ${koma(T_PUSH, 1)} = ${koma(KAP, 2)} per detik (Asumsi dari Tahap 3).`);
    harus(`menguras ${cocok(runApi, /generate_series\(1, (\d+)\) AS i/)[1]} pesan promo dari outbox dengan satu worker dan push tiruan ${T_PUSH * 1000} ms.`);
    harus(`Laju terukurnya dalam ${cocok(beban, /laju terukur dalam (\d+)% dari ([\d,]+) per detik: ya/)[1]}% dari ${cocok(beban, /laju terukur dalam (\d+)% dari ([\d,]+) per detik: ya/)[2]} per detik; nilainya tidak direkam.`);
    harus(`| Notifikasi uang per detik, puncak | ${koma(lamTrx3, 3)} | ${koma(notif4, 2)} | ${koma(KAP, 2)} |`);
    harus(`| Pemakaian worker, puncak | ${koma(pakai3 * 100, 1)}% | ${Math.round(pakai4 * 100)}% | 100% |`);
    harus(`| Pemakaian worker, makan siang | ${koma((siang3 / KAP) * 100, 1)}% | ${Math.round((siang4 / KAP) * 100)}% | 100% |`);
    harus(`| Koneksi database | ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} | ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} | ${MAX_KONEKSI} |`);
    harus(`| Koneksi tertahan oleh semua request (W ${W_DB * 1000} ms) | ${koma(L3, 2)} | ${koma(L4, 2)} | ${BATAS_L} |`);
    harus(`| Posting per tahun | ${koma(posting3 / 1e6, 3)} juta | ${koma(posting4 / 1e6, 1)} juta | ±${PARTISI_POSTING / 1e6} juta |`);
    harus(`Notifikasi uang adalah transaksi uang ditambah top-up: ${koma(lamTrx4, 2)} + ${koma(lamTopTulis, 3)} = ${koma(notif4, 2)} per detik, naik ${koma(notif4Tulis / dibaca(koma(lamTrx3, 3)), 1)} kali dari ${koma(lamTrx3, 3)}.`);
    harus(`Pemakaian puncak ${koma(notif4, 2)} ÷ ${koma(KAP, 2)} = ${Math.round(pakai4 * 100)}%.`);
    harus(`Saat makan siang, (${ribu(trx4Hari)} + ${ribu(topupHari)}) × ${koma(FRAKSI_SIANG, 1)} ÷ ${ribu(DETIK_SIANG)} = ${koma(siang4, 2)} per detik, atau ${Math.round((siang4 / KAP) * 100)}%.`);
    const bawah = bulat(KAP * 0.85, 2);
    harus(`Bila laju sebenarnya ${cocok(beban, /laju terukur dalam (\d+)%/)[1]}% di bawah ${koma(KAP, 2)}, yaitu ${koma(bawah, 2)} per detik, pemakaiannya naik. Pada puncak ${koma(notif4, 2)} ÷ ${koma(bawah, 2)} = ${Math.round((notif4Tulis / bawah) * 100)}%, dan saat makan siang ${koma(siang4, 2)} ÷ ${koma(bawah, 2)} = ${Math.round((dibaca(koma(siang4, 2)) / bawah) * 100)}%.`);
    expect(bawah).toBe(11.33);
    expect(Math.round((notif4Tulis / bawah) * 100)).toBe(66);
    expect(Math.round((dibaca(koma(siang4, 2)) / bawah) * 100)).toBe(85);
    harus(`Koneksi database: ${INST} × ${POOL} + ${INST_BAYAR} × ${POOL_BAYAR} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI}.`);
    harus(`Suku ${INST} × ${POOL} adalah dua instance monolith dengan pool ${POOL} koneksi; ${INST_BAYAR} × ${POOL_BAYAR} adalah dua instance service pembayaran dengan pool ${POOL_BAYAR} (Asumsi desain).`);
    harus(`Suku ${WORKER_DB} adalah worker, ${ADMIN} koneksi admin, dan ${CADANGAN} cadangan superuser (\`superuser_reserved_connections\`).`);
    harus("Angka 100 adalah nilai `max_connections` bawaan yang biasa.");
    harus(`Tahap 3 memakai ${INST} × ${POOL} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} ([[t3-pool]]).`);
    harus(`Menjumlah tanpa cadangan superuser memberi ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN}, bukan ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN}.`);
    harus(`Di sini L = ${koma(h4.puncak, 1)} × ${koma(W_DB, 2)} = ${koma(L4, 2)}, dengan W ${W_DB * 1000} ms (Asumsi, belum diukur).`);
    harus(`Batasnya ${INST} × (${POOL} − 1) = ${BATAS_L}, karena pool n koneksi penuh bila L melebihi n − 1 ([[t3-pool]]).`);
    harus(`Tahap 4 memakai ${koma(posting4 / 1e6, 1)} ÷ ${PARTISI_POSTING / 1e6} = ${Math.round((posting4 / PARTISI_POSTING) * 100)}% dari batas itu.`);
    harus(`${ribu(100_000)} × ${koma(T_PUSH, 1)} ÷ ${C} = ${ribu((100_000 * T_PUSH) / C)} detik, atau ${(100_000 * T_PUSH) / C / 60} menit (Hitungan, Tidak dijalankan: lab tidak menulis ${ribu(100_000)} baris outbox).`);
    expect(beban).toContain(`hitungan: 100000 / (4 / 0,3) = ${(100_000 * T_PUSH) / C} detik`);
    expect(beban).toContain("lab tidak menulis 100.000 baris outbox");
    expect(L4).toBeLessThan(BATAS_L);
    expect(posting4).toBeLessThan(PARTISI_POSTING);
    expect(koma(L3, 2)).toBe("0,35");
    expect(koma(L4, 2)).toBe("2,78");
    expect(koma(L4 / L3, 1)).toBe("8,0");
    harus("Koneksi tertahan oleh semua request dihitung dengan L = λ × W. L adalah rata-rata koneksi yang terpakai bersamaan, dan W adalah lama satu request memegang koneksi.");
    expect(badan.indexOf("L = λ × W")).toBe(badan.indexOf("dihitung dengan L = λ × W. L adalah") + "dihitung dengan ".length);
  });
  test("klaim 'pemakaian terhadap batas': yang dihitung dari request biasa di bawah batas, dan yang mencapai batas hanya W panjang dan vendor mati", () => {
    expect(pakai4).toBeLessThan(1);
    expect(siang4 / KAP).toBeLessThan(1);
    expect(siang4 / (KAP * 0.85), "pemakaian makan siang di batas bawah rekaman").toBeLessThan(1);
    expect(INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN).toBeLessThan(MAX_KONEKSI);
    expect(lamTopTulis * 30).toBeGreaterThan(INST_BAYAR * POOL_BAYAR);
    expect(lamTopTulis * TIMEOUT).toBeLessThan(INST_BAYAR * POOL_BAYAR);
    expect(lamVer * PERCOBAAN * TIMEOUT + notif4 * T_PUSH).toBeCloseTo(C, 1);
  });
  test("Paham 4: tabel λ × W, pool pembayaran, ambang client, dan worker verifikasi", () => {
    harus(`| Gateway di dalam request, menjawab normal | ${koma(lamTopTulis, 3)} | ${koma(T_PUSH, 1)} detik | ${koma(lamTop * T_PUSH, 2)} koneksi |`);
    harus(`| Gateway di dalam request, menjawab lambat | ${koma(lamTopTulis, 3)} | 2 detik | ${koma(lamTopTulis * 2, 2)} koneksi |`);
    harus(`| Gateway di dalam request, timeout ${TIMEOUT} detik | ${koma(lamTopTulis, 3)} | ${TIMEOUT} detik | ${koma(lamTopTulis * TIMEOUT, 2)} koneksi |`);
    harus(`| Gateway di dalam request, menggantung 15 detik | ${koma(lamTopTulis, 3)} | 15 detik | ${koma(lamTop * 15, 2)} koneksi |`);
    harus(`| Gateway di dalam request, menggantung 30 detik | ${koma(lamTopTulis, 3)} | 30 detik | ${koma(lamTopTulis * 30, 1)} koneksi |`);
    harus(`| Verifikasi saat vendor mati: ${PERCOBAAN} percobaan × ${TIMEOUT} detik | ${koma(lamVerTulis, 3)} | ${PERCOBAAN * TIMEOUT} detik | ${koma(lamVerTulis * PERCOBAAN * TIMEOUT, 2)} worker |`);
    harus(`| Notifikasi uang di worker yang sama | ${koma(notif4Tulis, 2)} | ${koma(T_PUSH, 1)} detik | ${koma(notif4Tulis * T_PUSH, 2)} worker |`);
    harus(`Pool pembayaran ${INST_BAYAR * POOL_BAYAR} (${INST_BAYAR} instance × ${POOL_BAYAR}, Asumsi) penuh pada ${INST_BAYAR * POOL_BAYAR} ÷ ${koma(lamTopTulis, 3)} = ${koma((INST_BAYAR * POOL_BAYAR) / lamTopTulis, 1)} detik bila gateway tidak pernah menjawab dan client terus menunggu.`);
    const ambangPerPool = (POOL_BAYAR - 1) / (lamTopTulis / INST_BAYAR);
    const ambangSatuPool = (INST_BAYAR * POOL_BAYAR - 1) / lamTopTulis;
    harus(`Bila dua pool dihitung sebagai satu pool ${INST_BAYAR * POOL_BAYAR}, ia penuh hanya bila T > ${INST_BAYAR * POOL_BAYAR - 1} ÷ ${koma(lamTopTulis, 3)} = ${koma(ambangSatuPool, 1)} detik.`);
    harus(`Tiap instance menerima setengah kedatangan, yaitu ${koma(lamTopTulis, 3)} ÷ ${INST_BAYAR} per detik. Jadi pool ${POOL_BAYAR} penuh hanya bila T > ${POOL_BAYAR - 1} ÷ (${koma(lamTopTulis, 3)} ÷ ${INST_BAYAR}) = ${koma(ambangPerPool, 1)} detik.`);
    expect(INST_BAYAR).toBe(2);
    expect(koma(ambangPerPool, 1)).toBe("13,8");
    expect(koma(ambangSatuPool, 1)).toBe("15,5");
    expect(ambangPerPool).toBeLessThan(ambangSatuPool);
    harus(`Hasilnya ${koma(lamVerTulis * PERCOBAAN * TIMEOUT, 2)} + ${koma(notif4Tulis * T_PUSH, 2)} = ${koma(lamVerTulis * PERCOBAAN * TIMEOUT + notif4Tulis * T_PUSH, 1)} dari ${C} worker: ${koma(lamVerTulis, 3)} pendaftar per detik sudah menghabiskan worker, karena tiap pekerjaan memakai ${PERCOBAAN * TIMEOUT} detik.`);
    harus(`verifikasi memakai ${["nol", "satu", "dua", "tiga", "empat"][C]} worker yang sama dengan notifikasi (Asumsi desain)`);
    harus(`Lima baris pertama hanya benar bila tiap panggilan ke gateway memegang koneksi database dan tidak punya timeout.`);
    harus(`Dua baris terakhir mengandaikan`);
    harus(`Keduanya tiruan lokal, jadi 0,3, 2, 3, 15, dan 30 detik adalah Asumsi.`);
    harus(`Kedatangan dianggap berjadwal tetap dan terbagi sama rata.`);
    expect(0.3).toBe(T_PUSH);
    expect(lamTopTulis * 30).toBeGreaterThan(INST_BAYAR * POOL_BAYAR);
  });
  test("ambang client yang menyerah dari simulasi jadwal tetap: satu pool 10 pada 15,5 detik, dua pool 5 (kedatangan bergilir) pada 13,8 detik", () => {
    const penuh = (n: number, instance: number, lambda: number, T: number): boolean => {
      const dipegang: number[][] = Array.from({ length: instance }, () => []);
      for (let k = 0; k < 400; k++) {
        const t = k / lambda;
        const i = k % instance;
        dipegang[i] = dipegang[i]!.filter((selesai) => selesai > t);
        if (dipegang[i]!.length >= n - 1) return true;
        dipegang[i]!.push(t + T);
      }
      return false;
    };
    const cari = (n: number, instance: number): number => {
      let rendah = 0;
      let tinggi = 100;
      for (let i = 0; i < 60; i++) {
        const tengah = (rendah + tinggi) / 2;
        if (penuh(n, instance, lamTopTulis, tengah)) tinggi = tengah;
        else rendah = tengah;
      }
      return tinggi;
    };
    expect(koma(cari(INST_BAYAR * POOL_BAYAR, 1), 1)).toBe("15,5");
    expect(koma(cari(POOL_BAYAR, INST_BAYAR), 1)).toBe("13,8");
    expect(cari(INST_BAYAR * POOL_BAYAR, 1)).toBeCloseTo((INST_BAYAR * POOL_BAYAR - 1) / lamTopTulis, 6);
    expect(cari(POOL_BAYAR, INST_BAYAR)).toBeCloseTo((POOL_BAYAR - 1) / (lamTopTulis / INST_BAYAR), 6);
    expect(penuh(POOL_BAYAR, INST_BAYAR, lamTopTulis, 13.7)).toBe(false);
    expect(penuh(POOL_BAYAR, INST_BAYAR, lamTopTulis, 13.9)).toBe(true);
    expect(penuh(INST_BAYAR * POOL_BAYAR, 1, lamTopTulis, 15.4)).toBe(false);
    expect(penuh(INST_BAYAR * POOL_BAYAR, 1, lamTopTulis, 15.6)).toBe(true);
  });
  test("Paham 5: pembulatan, empat selisih", () => {
    harus(`**5. Pembulatan.** Angka di halaman ini memakai nilai yang tertulis, dengan empat selisih terhadap nilai tepat.`);
    harus(`Pertama, λ top-up tepatnya ${koma(lamTop, 4)}, jadi ${koma(lamTop, 4)} × 15 = ${koma(lamTop * 15, 2)} di tabel L, sedangkan ${koma(lamTopTulis, 3)} × 15 = ${koma(lamTopTulis * 15, 3)}.`);
    harus(`Kedua, 9 ÷ ${koma(lamTopTulis, 3)} = ${koma(9 / lamTopTulis, 1)}, sedangkan 9 ÷ ${koma(lamTop, 4)} = ${koma(9 / lamTop, 1)}.`);
    harus(`Ketiga, kapasitas worker tepatnya ${C} ÷ ${koma(T_PUSH, 1)} = ${koma(KAP, 3)}. Pengumuman 100.000 HP memakai nilai tepat, ${ribu((100_000 * T_PUSH) / C)} detik, sedangkan ${koma(dibaca("13,3"), 1)} memberi ${ribu(100_000 / dibaca("13,3"))}.`);
    harus(`Keempat, ${koma(notif4Tulis, 2)} ÷ ${koma(KAP, 2)} = ${koma((notif4Tulis / kapTulis) * 100, 1)}% ditulis ${Math.round(pakai4 * 100)}%.`);
    expect(koma(lamTopTulis * 15, 3)).toBe("8,685");
  });
  test("Paham 6: ukuran data dan file, tiga besaran", () => {
    harus(`Posting per tahun di Tahap 4 adalah ${ribu(h4.dau)} × ${TRX} × ${POSTING_PER_TRX} × 365 = ${koma(posting4 / 1e6, 1)} juta. Ada tiga besaran ukuran, semuanya Hitungan atas Asumsi.`);
    harus(`| Posting ledger | ${koma(posting4 / 1e6, 1)} juta posting × ${BYTE_POSTING} byte | ${koma(gbLedger4, 2)} GB |`);
    harus(`| Rumus data per tahun [[D1]] | ${ribu(h4.dau)} × ${TRX} transaksi × 365 × ${m4.baris} byte | ${koma(gbD1, 2)} GB |`);
    harus(`| File verifikasi identitas | ${ribu(unggahHari)} unggahan × ${m4.fileKB} KB × 365 | ${gbFile} GB |`);
    harus(`Dua besaran pertama paling jauh berbeda ${koma(gbLedger4, 2)} ÷ ${koma(gbD1, 2)} = ${koma(gbLedger4 / gbD1, 1)} kali, jadi satu orde besaran.`);
    harus(`Tahap 3 memberi ${koma(posting3 / 1e6, 3)} juta × ${BYTE_POSTING} byte = ${koma(gbLedger3, 2)} GB, dan ${koma(gbLedger3, 2)} × 8 = ${koma(gbLedger3 * 8, 2)} GB.`);
    harus(`[[t3-estimasi]] menulis ±${duaAngka(gbLedger3)} dan ±${duaAngka(gbLedger4)} GB untuk angka yang sama; selisihnya hanya pembulatan.`);
    harus(`${ribu(unggahHari)} × ${m4.fileKB} KB = ${(unggahHari * Number(m4.fileKB)) / 1e6} GB per hari, atau ${gbFile} GB per tahun. Itu ${Math.round(gbFile / gbLedger4)} kali posting ledger (${gbFile} ÷ ${koma(gbLedger4, 2)}) dan ${Math.round(gbFile / gbD1)} kali rumus [[D1]] (${gbFile} ÷ ${koma(gbD1, 2)}).`);
    harus(`Lajunya kecil, ${koma(lamUnggah, 3)} unggahan per detik atau ${Math.round(dibaca(koma(lamUnggah, 3)) * Number(m4.fileKB))} KB per detik di puncak.`);
    expect(gbLedger4 / gbLedger3).toBeCloseTo(8, 10);
    expect(Math.max(gbLedger4, gbD1) / Math.min(gbLedger4, gbD1)).toBeLessThan(10);
    expect(hal329).toContain(`${Math.round(gbFile / gbLedger4)} kali posting ledger (${gbFile} ÷ ${koma(gbLedger4, 2)})`);
  });
  test("Paham 7: satu langkah ke Tahap 5, tabel dan selisih transaksi", () => {
    harus(`Masukan Tahap 5 ada di registry: ${ribu(a5.user)} user, ${a5.aktif}% aktif, ${a5.req} request, faktor puncak ${a5.puncak}, dan ${ribu(Number(m5.upload))} unggahan per hari × ${m5.fileKB} KB.`);
    harus(`| User aktif harian | ${ribu(h4.dau)} | ${ribu(h5.dau)} | ${ribu(a5.user)} × ${a5.aktif}% |`);
    harus(`| Puncak request per detik | ${koma(h4.puncak, 1)} | ${kali(h5.puncak, 1)} | ${ribu(h5.dau)} × ${a5.req} ÷ ${ribu(DETIK)} × ${a5.puncak} |`);
    harus(`| Notifikasi uang per detik, puncak | ${koma(notif4, 2)} | ${koma(notif5, 1)} | ${ribu(h5.dau)} × (${TRX} + ${koma(TOPUP_PER_AKTIF, 2)}) ÷ ${ribu(DETIK)} × ${a5.puncak} |`);
    harus(`| Pemakaian worker, puncak | ${Math.round(pakai4 * 100)}% | ${Math.round((notif5Tulis / kapTulis) * 100)}% | ${koma(notif5, 1)} ÷ ${koma(KAP, 2)} |`);
    harus(`| Koneksi tertahan oleh semua request (W ${W_DB * 1000} ms) | ${koma(L4, 2)} | ${koma(L5, 1)} | ${kali(h5.puncak, 1)} × ${koma(W_DB, 2)} |`);
    harus(`| Unggahan file per tahun | ${gbFile} GB | ${kali(gbFile5, 0)} GB | ${ribu(Number(m5.upload))} × ${m5.fileKB} KB × 365 |`);
    harus(`Puncak ${kali(h5.puncak, 1)} cocok dengan ±${duaAngka(h5.puncak)} di [[D1]]. Worker memakai kapasitas yang sama, ${koma(KAP, 2)} per detik, dan koneksi memakai batas ${BATAS_L} yang sama. Hasilnya ${Math.round((notif5Tulis / kapTulis) * 100)}% dan ${koma(L5, 1)} lawan ${BATAS_L}.`);
    harus(`Pengumuman ke ${ribu(a5.user)} HP memakai ${ribu(a5.user)} × ${koma(T_PUSH, 1)} ÷ ${C} = ${ribu(detikUmum5)} detik, atau ${koma(detikUmum5 / 3600, 1)} jam (Hitungan, Tidak dijalankan).`);
    harus(`Registry Tahap 5 menulis ${TRX5} transaksi per user aktif per hari, bukan ${TRX} seperti Tahap 3 dan 4, dan [[D1]] memakainya untuk ±${duaAngka((h5.dau * TRX5 * 365 * Number(m5.baris)) / 1e9)} GB. Tabel ini memakai ${TRX} supaya perilaku per user tetap.`);
    harus(`Dengan ${TRX5} transaksi, notifikasi uang ${ribu(h5.dau)} × (${TRX5} + ${koma(TOPUP_PER_AKTIF, 2)}) ÷ ${ribu(DETIK)} × ${a5.puncak} = ${koma(notif5Dua, 1)} per detik atau ${Math.round((dibaca(koma(notif5Dua, 1)) / kapTulis) * 100)}%: tetap melewati 100%.`);
    expect(Math.round((notif5Tulis / kapTulis) * 100)).toBe(564);
    expect(Math.round(pakai5 * 100)).toBe(564);
    expect(Math.round((dibaca(koma(notif5Dua, 1)) / kapTulis) * 100)).toBe(391);
    expect(notif5Dua / KAP).toBeGreaterThan(1);
    expect(notif5 / notif4).toBeCloseTo(10, 10);
    expect(L5).toBeGreaterThan(BATAS_L);
    expect(koma(L5, 1)).toBe("27,8");
    expect(h5.dau).toBe(a5.user * (a5.aktif / 100));
    expect(koma(detikUmum5 / 3600, 1)).toBe("20,8");
    expect(ribu(detikUmum5)).toBe("75.000");
    expect(TRX5).toBeLessThan(TRX);
    expect(naskah4).toContain("Tim naik dari 13 menjadi 20 sampai 40 orang");
  });
  test("klaim negatif Paham 7: kelas PRD v5 tanpa λ dan W, dan tabel beban naskah tidak memuatnya", () => {
    harus("Laporan merchant real-time, cicilan, dan API publik belum punya λ atau W, jadi tidak dihitung.");
    const tabel = naskah4.slice(naskah4.indexOf("### Angka beban Tahap 4"), naskah4.indexOf("## 3b."));
    expect(tabel.length).toBeGreaterThan(2000);
    expect(tabel).not.toMatch(/laporan merchant|cicilan|API publik/i);
    expect(naskah4).toContain("- Laporan merchant real-time.");
    expect(naskah4).toContain("- Cicilan dan tabungan, dengan proses batch harian.");
    expect(naskah4).toContain("- API publik untuk POS pihak ketiga.");
    expect(Object.keys(m5).sort()).toEqual(["aktif", "baris", "fileKB", "puncak", "req", "tim", "trx", "upload", "user"]);
  });
  test("Paham 8: rekaman beban dibaca ke kodenya, dan klaim kapasitas berlingkup", () => {
    const dijadwalkan = Number(cocok(beban, /permintaan dijadwalkan: (\d+) \(= ⌊138\.9 × (\d+)⌋\)/)[1]);
    const lama = Number(cocok(beban, /permintaan dijadwalkan: (\d+) \(= ⌊138\.9 × (\d+)⌋\)/)[2]);
    const status = cocok(beban, /status: 200 x(\d+), 201 x(\d+)/);
    harus(`Rekaman beban api-t4 (\`beban.txt\` bagian A) memutar ${ribu(dijadwalkan)} permintaan dalam ${lama} detik pada ${koma(h4.puncak, 1)} per detik di laptop.`);
    expect(dijadwalkan).toBe(Math.floor(138.9 * lama));
    expect(koma(h4.puncak, 1)).toBe("138,9");
    harus("Jadwalnya kedatangan tetap: permintaan berangkat menurut jadwal tanpa menunggu jawaban sebelumnya.");
    expect(beban).toContain("Beban berjadwal kedatangan tetap (open loop: permintaan berangkat menurut jadwal, tidak menunggu jawaban sebelumnya)");
    expect(beban).toContain(`permintaan selesai: ${dijadwalkan} dari ${dijadwalkan}`);
    expect(beban).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    expect(beban).toContain("Bukan klaim kapasitas produksi.");
    harus(`Semuanya selesai, dan jadwal tidak tertinggal lebih dari ${cocok(beban, /jadwal tidak tertinggal lebih dari (\d+) ms[^:]*: ya/)[1]} ms.`);
    harus(`P95 di bawah ${cocok(beban, /p95 di bawah (\d+) ms \(batas lab, Asumsi; nilai ukur tidak direkam\): ya/)[1]} ms. P95 adalah waktu jawab yang dilewati 5% permintaan, batas itu Asumsi lab, dan nilai ukurnya tidak direkam.`);
    expect(cocok(runApi, /batas_p95 = (\d+)/)[1]).toBe("500");
    expect(runApi).toContain("harap(m[\"p95_ms\"] < batas_p95, True, \"p95\")");
    expect(runApi).toContain("harap(m[\"lag_maks_ms\"] < 100, True, \"generator tidak tertinggal\")");
    harus(`Koneksi paling banyak ≤ ${cocok(beban, /paling banyak <= (\d+) \(pool (\d+);/)[1]} adalah batas yang dipasang pool sendiri, jadi bukan bukti pool tidak sesak.`);
    expect(cocok(beban, /paling banyak <= (\d+) \(pool (\d+);/)[2]).toBe(String(POOL));
    expect(beban).toContain("batas ini dipasang pool sendiri, jadi bukan bukti pool tidak sesak");
    // campuran: kode generator memilih jenis dengan rng.IntN(100): <50 saldo, <75 riwayat, <90 katalog, selebihnya POST /transfers
    const batas = [...kodeBeban.matchAll(/case jenis < (\d+):/g)].map((m) => Number(m[1]));
    expect(batas).toEqual([50, 75, 90]);
    expect(kodeBeban).toMatch(/default:\s*\n\s*req, _ = http\.NewRequest\("POST", \*url\+"\/transfers"/);
    expect(kodeBeban).toContain("jenis := rng.IntN(100)");
    const pembayaran = 100 - batas[2]!;
    expect(pembayaran).toBe(10);
    expect(pembayaran / ((trx4Hari / h4.reqHari) * 100)).toBe(2);
    harus(`Campuran lab memakai ${pembayaran}% pembayaran (${status[2]} dari ${ribu(dijadwalkan)} jawaban berstatus 201), dua kali ${Math.round((trx4Hari / h4.reqHari) * 100)}% di tabel kelas.`);
    expect(Number(status[1]) + Number(status[2])).toBe(dijadwalkan);
    expect(beban).toContain("201 = bayar");
    expect(readmeApi).toContain("10% pembayaran (benih tetap");
    harus("Campuran itu memuat pembayaran dua kali lebih banyak daripada tabel kelas, tetapi tetap bukan kapasitas produksi.");
    // kapasitas worker: seratus pesan promo dari outbox, satu worker, push tiruan 300 ms
    expect(cocok(runApi, /generate_series\(1, (\d+)\) AS i/)[1]).toBe("100");
    expect(runApi).toMatch(/SELECT 10000 \+ i, 1, 'promo'/);
    expect(runApi).toContain('d.push_mode("lambat", ms=300)');
    expect(beban).toContain("terkirim: 100 dari 100");
    expect(beban).toContain("c = 4 pengirim serentak (bawaan), push tiruan 300 ms per pesan");
  });
  test("Paham 8: klaim kapasitas server berlingkup (hanya beban.txt memuat 138,9), SRE, dan tim", () => {
    harus("Load test kapasitas di server sungguhan Tidak dijalankan di repo ini");
    expect(readmeApi).toContain("Testcontainers dan k6 Tidak dijalankan");
    const keluaranLab = execSync("git ls-files labs", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n").filter((f) => /\/output\/[^/]+\.txt$/.test(f));
    expect(keluaranLab.length).toBeGreaterThan(100);
    expect(keluaranLab.filter((f) => fs.readFileSync(path.join(akar, f), "utf8").includes(koma(h4.puncak, 1)))).toEqual(["labs/api-t4/output/beban.txt"]);
    expect(keluaranLab.filter((f) => /k6|load test/i.test(fs.readFileSync(path.join(akar, f), "utf8")) && /kapasitas server/i.test(fs.readFileSync(path.join(akar, f), "utf8")))).toEqual([]);
    harus("Buku SRE Google menyebut \"queries per second\" sering menjadi ukuran kapasitas yang buruk, karena biaya tiap query berbeda dan bisa berubah.");
    harus(`Tim Tahap 4 berjumlah ${TIM_ORANG.reduce((a, b) => a + b, 0)} orang: ${TIM_ORANG.join(" + ")} (Asumsi naskah).`);
    harus("Tidak ada rumus di halaman ini yang memuat koordinasi, dan ambang ±50 developer di [[t4-modul]] hanya heuristik [perlu verifikasi].");
    expect(hitungKali(badan, "koordinasi")).toBe(1);
    expect(hal413).toContain("±50 developer");
    expect(hal413).toContain("[perlu verifikasi]");
    expect(naskah4).toContain("mendekati ambang ±50 developer di ADR 37");
  });
  test("Putuskan dan Kunci: angka di tabel trade-off, aturan, jawaban, dan daftar periksa", () => {
    harus(`| Hanya request per detik (rumus [[D1]]) | Satu hitungan, selesai dalam beberapa menit | ${kali(h5.puncak, 1)} request per detik tidak menunjukkan worker ${Math.round(pakai5 * 100)}% dan koneksi tertahan ${koma(L5, 1)} |`);
    harus("| Load test di server sungguhan | Memberi angka nyata untuk kode yang ada | Tidak dijalankan, dan kode Tahap 5 belum ada |");
    harus("Angka tahap lama tidak dikali sendiri, kecuali dikatakan terang seperti di langkah 7.");
    harus(`dan tulis semua suku batas itu, seperti ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} koneksi.`);
    harus("Keputusan atas angka ini ditulis di [[t4-adr-45]].");
    harus(`| Perlu pooler seperti PgBouncer? | Koneksi database ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} | [[t4-adr-45]] |`);
    harus(`| Perlu memecah modul jadi service? | Kapasitas satu server belum terukur, tim ${TIM_ORANG.reduce((a, b) => a + b, 0)} orang | [[t4-adr-45]] |`);
    harus(`| Perlu komponen lain untuk beban Tahap 5? | Worker ${Math.round(pakai5 * 100)}% dan koneksi tertahan ${koma(L5, 1)} lawan ${BATAS_L} | [[t4-adr-45]] |`);
    harus(`Dari Tahap 3 ke Tahap 4 persentase aktif turun dari ${a3.aktif}% ke ${a4.aktif}% (× ${koma(a4.aktif / a3.aktif, 1)}), jadi ${a4.user / a3.user} × ${koma(a4.aktif / a3.aktif, 1)} = ${Math.round(h4.puncak / h3.puncak)}. Dari Tahap 4 ke Tahap 5 persentase aktif dan request per user tetap, jadi puncak naik ${a5.user / a4.user} kali, dari ${koma(h4.puncak, 1)} ke ${kali(h5.puncak, 1)}.`);
    harus(`Notifikasi uang naik dari ${koma(notif4, 2)} ke ${koma(notif5, 1)} per detik. Dibagi kapasitas ${koma(KAP, 2)} per detik, hasilnya ${Math.round((notif5Tulis / kapTulis) * 100)}%.`);
    harus(`Di satu laptop dengan campuran lab, 95% permintaan selesai di bawah ${cocok(runApi, /batas_p95 = (\d+)/)[1]} ms dan generator tidak jadi penghambat.`);
    harus(`${INST} × ${POOL} untuk dua instance monolith, ${INST_BAYAR} × ${POOL_BAYAR} untuk dua instance service pembayaran, ${WORKER_DB} worker, ${ADMIN} koneksi admin, dan ${CADANGAN} cadangan superuser: ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN}. Angka ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN} melewatkan cadangan superuser.`);
    harus("- [Little 1961, Operations Research 9(3): A Proof for the Queuing Formula L = λW](https://doi.org/10.1287/opre.9.3.383)");
    harus('- [Google SRE book: Handling Overload](https://sre.google/sre-book/handling-overload/), bagian "The Pitfalls of Queries per Second"');
    harus("- [PostgreSQL 18: Connection Settings](https://www.postgresql.org/docs/18/runtime-config-connection.html)");
  });
  test("klaim 'tidak ada' berlingkup: kata rekaman, ukur, dan Tidak dijalankan hanya di kalimat yang boleh memakainya", () => {
    const hitungRegex = (re: RegExp): number => (badan.match(re) ?? []).length;
    expect(hitungKali(badan, "Tidak dijalankan")).toBe(4);
    for (const konteks of [
      "(Hitungan, Tidak dijalankan: lab tidak menulis",
      "(Hitungan, Tidak dijalankan).",
      "di server sungguhan Tidak dijalankan di repo ini",
      "| Tidak dijalankan, dan kode Tahap 5 belum ada |",
    ]) expect(badan, konteks).toContain(konteks);
    expect(hitungKali(badan, "Rekaman lab")).toBe(2);
    expect(badan).toContain("[Rekaman lab](/cara-pakai/#label-sumber) api-t4");
    expect(badan).toContain("Rekaman lab) untuk setiap angka.");
    expect(hitungRegex(/rekaman/gi)).toBe(8);
    for (const konteks of [
      "[Rekaman lab](/cara-pakai/#label-sumber) api-t4",
      "Rekaman beban api-t4 (`beban.txt` bagian A)",
      "Rekaman beban menulis koneksi paling banyak",
      "Rekaman beban menulis p95",
      "rekaman beban api-t4 hanya memeriksa batas",
      "Tulis semuanya sebagai Asumsi sampai ada rekaman.",
      "Rekaman beban yang batasnya dipasang sendiri",
      "nilainya tidak direkam",
      "nilai ukurnya tidak direkam",
      "belum direkam",
    ]) expect(badan, konteks).toContain(konteks);
    expect(hitungRegex(/mengukur|terukur|diukur|pengukuran|tidak terukur|belum terukur/gi)).toBe(7);
    for (const konteks of [
      "Semua angka di tabel ini Asumsi naskah, bukan pengukuran.",
      "Laju terukurnya dalam 15%",
      "(Asumsi, belum diukur)",
      "angka 40 tidak diukur",
      "Kapasitas satu server belum terukur.",
      "Kapasitas produksi tetap tidak terukur.",
      "| Kapasitas satu server belum terukur, tim 13 orang |",
    ]) expect(badan, konteks).toContain(konteks);
    // lingkup "lab api-t4 menjalankan satu server dengan pool 10": beban.txt dan README
    harus("Lab api-t4 menjalankan satu server dengan pool 10, jadi angka 40 tidak diukur: itu Hitungan atas Asumsi desain.");
    expect(beban).toContain("server: ./api-t4 -lab (pool 10)");
    expect(beban).toContain("pool setelah beban: maks 10");
    // tanpa lab sendiri: tidak ada Snippet dan tidak ada rujukan ke labs/
    expect(badan).not.toMatch(/<Snippet|labs\//);
    expect(dari("t4-estimasi").lab).toBeUndefined();
  });
  test("label Hitungan dan Asumsi didefinisikan di pemakaian pertama, dan simbol tidak punya dua arti", () => {
    const pertamaHitungan = badan.indexOf("Hitungan");
    expect(pertamaHitungan).toBe(badan.indexOf("Itu Hitungan: hasil rumus dari angka yang tertulis di halaman, dan tetap Asumsi karena masukannya Asumsi.") + "Itu ".length);
    const pertamaAsumsi = badan.indexOf("Asumsi");
    expect(pertamaAsumsi).toBe(badan.indexOf("(Asumsi naskah; arti label ada di [Label sumber](/cara-pakai/#label-sumber))") + 1);
    expect(hitungKali(badan, "Worker adalah proses yang mengirim notifikasi dari queue.")).toBe(1);
    expect(badan.indexOf("worker")).toBeGreaterThan(-1);
    expect(badan.indexOf("P95 adalah waktu jawab yang dilewati 5% permintaan")).toBeGreaterThan(badan.indexOf("P95 di bawah"));
    expect(badan.indexOf("P95")).toBe(badan.indexOf("P95 di bawah 500 ms."));
    expect(badan.indexOf("c ÷ t")).toBe(badan.indexOf("Worker punya kapasitas c ÷ t, dengan c = 4 pengirim serentak dan t = 0,3 detik per pengiriman.") + "Worker punya kapasitas ".length);
    harus("Client yang menyerah sesudah T detik melepas koneksinya.");
    expect(badan.indexOf("T detik")).toBe(badan.indexOf("Client yang menyerah sesudah T detik") + "Client yang menyerah sesudah ".length);
  });
  test("atribusi: klaim SRE, PostgreSQL, dan Little cocok dengan baris RISET", () => {
    const baris = (teks: string, id: string) => teks.split("\n").find((b) => b.startsWith(`| ${id} |`))!;
    const sre = baris(riset4, "R4-245");
    expect(sre).toContain("sre.google/sre-book/handling-overload/");
    expect(sre).toContain("dibuka 2026-10-30");
    expect(sre).toContain('bagian "Pitfalls of "Queries per Second""');
    expect(sre).toContain("often makes for a poor metric");
    expect(sre).toContain("mengukur kapasitas langsung dalam sumber daya yang tersedia");
    expect(sre).toContain("R3-240 dan R2-208");
    expect(baris(riset3, "R3-240")).toContain("sre.google/sre-book/handling-overload/");
    expect(baris(riset2, "R2-208")).toContain("QPS ukuran kapasitas yang lemah");
    const pg = baris(riset4, "R4-246");
    expect(pg).toContain("postgresql.org/docs/18/runtime-config-connection.html");
    expect(pg).toContain("PostgreSQL 18.6");
    expect(pg).toContain("typically 100 connections, but might be less if your kernel settings will not support it");
    expect(pg).toContain("`superuser_reserved_connections` bawaan tiga");
    expect(baris(riset2, "R2-207")).toContain("`superuser_reserved_connections` bawaan tiga");
    expect(baris(riset2, "R2-207")).toContain("PostgreSQL 18.6");
    expect(baris(riset3, "R3-07")).toContain("superuser_reserved_connections 3");
    expect(baris(riset2, "R2-205")).toContain("Operations Research 9(3):383–387, 1961");
    expect(baris(riset2, "R2-35")).toContain("10.1287/opre.9.3.383");
    harus("- [Little 1961, Operations Research 9(3): A Proof for the Queuing Formula L = λW](https://doi.org/10.1287/opre.9.3.383)");
  });
  test("baris RISET R4-245 sampai R4-249: ada, urut, tanpa ID ganda, memuat angka halaman, dan memakai 4.28", () => {
    const semua = [...riset4.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(semua).size, "ID riset ganda").toBe(semua.length);
    const nomor = semua.map((x) => Number(x.slice(3)));
    const jalan = nomor.slice(nomor.indexOf(200));
    expect(jalan).toEqual([...jalan].sort((a, b) => a - b));
    for (const id of ["R4-245", "R4-246", "R4-247", "R4-248", "R4-249"]) {
      const b = riset4.split("\n").find((x) => x.startsWith(`| ${id} |`))!;
      expect(b, id).toBeDefined();
      expect(b.split("|").length, `${id} lima kolom`).toBe(7);
      expect(b.split("|")[4]!, `${id} kolom dipakai halaman`).toContain("4.28");
    }
    const kolom = (id: string, k: number): string => riset4.split("\n").find((x) => x.startsWith(`| ${id} |`))!.split("|")[k]!.trim();
    expect(kolom("R4-245", 2)).toBe("Kapasitas bukan request per detik (Google SRE, Handling Overload; dibuka ulang 2026-10-30)");
    expect(kolom("R4-246", 2)).toBe("max_connections dan superuser_reserved_connections (dibuka ulang 2026-10-30)");
    expect(kolom("R4-247", 2)).toBe("Hitungan 4.28 atas angka yang tertulis di halaman (Hitungan, Asumsi)");
    expect(kolom("R4-248", 2)).toBe("Rekaman dan kode lab api-t4 untuk beban dan kapasitas worker (dibaca untuk halaman 4.28, tanpa menjalankan ulang)");
    expect(kolom("R4-249", 2)).toBe("Masukan Tahap 5 di registry dan selisih jumlah transaksi (dibaca untuk halaman 4.28)");
    expect(kolom("R4-245", 4)).toBe('4.28 (bagian "Yang tidak dijawab estimasi" butir 1 dan Bacaan lanjut)');
    expect(kolom("R4-246", 4)).toBe("4.28 (koneksi database 40 dari 100, suku cadangan superuser, dan Bacaan lanjut)");
    expect(kolom("R4-247", 4)).toBe("4.28 (semua tabel, Cek diri, kalkulator)");
    expect(kolom("R4-248", 4)).toBe('4.28 (butir 1 "Yang tidak dijawab estimasi", kapasitas worker, Cek diri 3)');
    expect(kolom("R4-249", 4)).toBe('4.28 (langkah "Satu langkah ke Tahap 5", butir 3 "Yang tidak dijawab estimasi")');
    expect(["R4-245", "R4-246", "R4-247", "R4-248", "R4-249"].map((id) => kolom(id, 5))).toEqual(["Tidak berubah", "Tidak berubah", "Baru", "Baru", "Baru"]);
    // tanggal akses: dua kali 2026-10-30 di tiap baris sumber luar (judul dan sumber), dan tidak ada tanggal lain
    for (const id of ["R4-245", "R4-246"]) {
      const baris = riset4.split("\n").find((x) => x.startsWith(`| ${id} |`))!;
      expect([...baris.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0])).toEqual(["2026-10-30", "2026-10-30"]);
    }
    expect([...kolom("R4-249", 3).matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0])).toEqual(["2026-10-29"]);
    expect(riset4.split("\n").find((x) => x.startsWith("| R4-247 |"))!.match(/\d{4}-\d{2}-\d{2}/)).toBeNull();
    const batasKode = [...kodeBeban.matchAll(/case jenis < (\d+):/g)].map((m) => Number(m[1]));
    expect(kolom("R4-246", 3)).toContain("Lab memakai PostgreSQL 17.11; R2-207 dan 3.8 memakai halaman yang sama untuk angka 100 dan 3");
    expect(kolom("R4-247", 3)).toContain("kata Hitungan hanya penjelas");
    expect(kolom("R4-249", 3)).toContain("halaman 4.28 memakai 3 dan menulis hasil dengan 2 di sebelahnya");
    const r248 = kolom("R4-248", 3);
    expect(r248).toContain(`${ribu(Number(cocok(beban, /permintaan dijadwalkan: (\d+)/)[1]))} permintaan terjadwal (⌊${koma(h4.puncak, 1)} × ${cocok(beban, /⌊138\.9 × (\d+)⌋/)[1]}⌋)`);
    expect(r248).toContain(`p95 di bawah ${cocok(runApi, /batas_p95 = (\d+)/)[1]} ms (batas lab, Asumsi; nilai tidak direkam)`);
    expect(r248).toContain("jadwal tidak tertinggal lebih dari 100 ms, koneksi paling banyak ≤ 10 (batas yang dipasang pool sendiri)");
    expect(r248).toContain(`100 pesan outbox dikuras satu worker dengan c = ${C} dan push tiruan ${T_PUSH * 1000} ms, laju terukur dalam 15% dari 13,3 per detik; pengumuman 100.000 HP dihitung dan Tidak dijalankan`);
    expect(r248).toContain(`kurang dari ${batasKode[0]} baca saldo, kurang dari ${batasKode[1]} riwayat, kurang dari ${batasKode[2]} katalog, selebihnya POST /transfers, jadi ${100 - batasKode[2]!}% pembayaran (benih tetap)`);
    expect(r248).toContain("menyisipkan 100 baris outbox berjenis promo");
    expect(r248).toContain(`Campuran ${100 - batasKode[2]!}% pembayaran dua kali ${Math.round((trx4Hari / h4.reqHari) * 100)}% transaksi uang di tabel kelas naskah`);
    const r249 = kolom("R4-249", 3);
    expect(r249).toContain(`Halaman 1.38 menulis ±${duaAngka(h5.puncak).replace(".", ".")} request per detik untuk Tahap 5 dan ±${duaAngka((h5.dau * TRX5 * 365 * Number(m5.baris)) / 1e9)} GB data transaksi dengan ${TRX5} transaksi`);
    expect(r249).toContain(`naskah Tahap 4 bagian 3b menulis \`posting\` ±${PARTISI_POSTING / 1e6} juta dan ±110 GB untuk Tahap 5`);
    expect(r249).toContain(`= ${ribu((h5.dau * TRX * POSTING_PER_TRX * 365) / 1e6)} juta × ${BYTE_POSTING} byte = ${koma((h5.dau * TRX * POSTING_PER_TRX * 365 * BYTE_POSTING) / 1e9, 1)} GB (${TRX} transaksi)`);
    expect(r249).toContain(`\`tahap[3].asumsi.trx\` ${TRX} sejak \`T4-siap\``);
    // aritmetika baris hitungan: tiap "a ○ b ... = c" dihitung ulang dan dibulatkan ke desimal hasil tertulis
    const angkaTulis = (t: string): number => (/,/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : /^\d{1,3}(\.\d{3})+$/.test(t) ? Number(t.replace(/\./g, "")) : Number(t));
    const baris247 = kolom("R4-247", 3);
    const unsur = String.raw`(?:\([^()=]*\)|\d+(?:[.,]\d+)*%?)`;
    const ungkap = new RegExp(String.raw`${unsur}(?: [×÷+−] ${unsur})+ = \d+(?:[.,]\d+)*%?`, "g");
    const ekspresi = [...baris247.matchAll(ungkap)].map((m) => m[0]);
    expect(ekspresi.length).toBeGreaterThanOrEqual(28);
    for (const e of ekspresi) {
      const [lhs, rhsMentah] = e.split(" = ") as [string, string];
      const persen = rhsMentah.endsWith("%");
      const rhs = persen ? rhsMentah.slice(0, -1) : rhsMentah;
      const js = lhs.replace(/\d+(?:[.,]\d+)*%?/g, (t) => String(t.endsWith("%") ? angkaTulis(t.slice(0, -1)) / 100 : angkaTulis(t))).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
      const nilai = (Function(`"use strict"; return (${js});`)() as number) * (persen ? 100 : 1);
      const desimal = (rhs.split(",")[1] ?? "").length;
      expect(koma(nilai, desimal), e).toBe(rhs.replace(/\.(?=\d{3}(\D|$))/g, "").replace(".", ""));
    }
    const h = riset4.split("\n").find((x) => x.startsWith("| R4-247 |"))!;
    for (const kunci of [
      `${koma(h4.puncak, 1)} ÷ ${koma(h3.puncak, 1)} = 7,98`,
      `${ribu(trx4Hari)} ÷ ${ribu(h4.reqHari)} = 5%`,
      `${KIRIMAN} × ${koma(lamTopTulis, 3)} = ${koma(KIRIMAN * lamTopTulis, 2)}`,
      `${koma(lamTrx4, 2)} + ${koma(lamTopTulis, 3)} = ${koma(notif4, 2)}`,
      `${koma(notif4, 2)} ÷ ${koma(KAP, 2)} = ${Math.round(pakai4 * 100)}%`,
      `${ribu(trx4Hari + topupHari)} × 0,8 ÷ ${ribu(DETIK_SIANG)} = ${koma(siang4, 2)}`,
      `${INST} × ${POOL} + ${INST_BAYAR} × ${POOL_BAYAR} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = 40`,
      `${koma(h4.puncak, 1)} × ${koma(W_DB, 2)} = ${koma(L4, 2)}`,
      `${koma(posting4 / 1e6, 1)} ÷ ${PARTISI_POSTING / 1e6} = 10%`,
      `${koma(gbLedger4, 2)} GB`,
      `${koma(gbD1, 2)} GB`,
      `${gbFile} GB`,
      `${kali(h5.puncak, 1)}`,
      `${koma(notif5, 1)} dan ${koma(notif5, 1)} ÷ ${koma(KAP, 2)} = ${Math.round((notif5Tulis / kapTulis) * 100)}%`,
      `dengan 2 transaksi: ${koma(notif5Dua, 1)} dan ${Math.round((dibaca(koma(notif5Dua, 1)) / kapTulis) * 100)}%`,
      `${koma(L5, 1)}`,
      `${kali(gbFile5, 0)} GB`,
      `${ribu(detikUmum5)} detik = ${koma(detikUmum5 / 3600, 1)} jam`,
    ]) expect(h, kunci).toContain(kunci);
    const rekaman = riset4.split("\n").find((x) => x.startsWith("| R4-248 |"))!;
    const dijadwalkan = Number(cocok(beban, /permintaan dijadwalkan: (\d+)/)[1]);
    const status = cocok(beban, /status: 200 x(\d+), 201 x(\d+)/);
    expect(rekaman).toContain(`${ribu(dijadwalkan)} permintaan terjadwal`);
    expect(rekaman).toContain(`status 200 x${status[1]} dan 201 x${status[2]}`);
    expect(rekaman).toContain("`rng.IntN(100)`");
    expect(rekaman).toContain("jadi 10% pembayaran");
    expect(rekaman).toContain(`${status[2]} dari ${ribu(dijadwalkan)} = ${koma((Number(status[2]) / dijadwalkan) * 100, 1)}%`);
    const reg5 = riset4.split("\n").find((x) => x.startsWith("| R4-249 |"))!;
    expect(reg5).toContain(`user ${ribu(a5.user)}, aktif ${a5.aktif}, req ${a5.req}, puncak ${a5.puncak}, trx ${TRX5}, baris ${m5.baris}, upload ${ribu(Number(m5.upload))}, fileKB ${m5.fileKB}`);
    expect(reg5).toContain(`${ribu(h5.dau)} × ${TRX} × ${POSTING_PER_TRX} × 365 = ${ribu(posting4 * 10 / 1e6)} juta`);
    expect(reg5).toContain("109,5 GB");
    expect(reg5).toContain("[perlu verifikasi]");
    expect(retry).toContain(`batas atas kiriman bila semua kiriman gagal dan diulang sampai kiriman ke-${KIRIMAN}: ${KIRIMAN} x ${koma(lamTopTulis, 3)} = ${koma(KIRIMAN * lamTopTulis, 2)} per detik`);
  });
  test("tidak ada ID internal, dan teks bahasa Inggris istilah konsisten", () => {
    for (const teks of [badan, JSON.stringify(diagramMentah), JSON.stringify(widgetMentah)]) {
      expect(teks).not.toMatch(POLA_ID_INTERNAL);
      expect(teks).not.toMatch(/\bR\d-\d+\b/);
    }
  });
});

describe("struktur halaman dan kalimat klaim (tanpa kunci baris)", () => {
  test("judul bagian dengan tingkatnya, langkah bernomor, judul tabel, dan nomor daftar", () => {
    expect([...badan.matchAll(/^(#{2,6}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Trade-off: kapan pakai apa", "### Aturan estimasi antar tahap di Rekeningo",
      "### Yang diputuskan di halaman lain", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    expect([...badan.matchAll(/^\*\*(\d)\. (.+?)\*\*/gm)].map((m) => `${m[1]}. ${m[2]}`)).toEqual([
      "1. Hitung ulang request dari masukan registry.", "2. Hitung per kelas pekerjaan.", "3. Bandingkan tiap hasil dengan batas komponennya.",
      "4. Pihak ketiga: yang dihitung adalah lamanya.", "5. Pembulatan.", "6. Ukuran data dan file dihitung sebagai ukuran.",
      "7. Satu langkah ke Tahap 5.", "8. Yang tidak dijawab estimasi.",
    ]);
    const baris = badan.split("\n");
    expect(baris.filter((b, i) => baris[i + 1]?.startsWith("|---"))).toEqual([
      "| Besaran | Nilai | Cara hitung (Asumsi) |",
      "| Kelas | Per hari | Puncak per detik | Masukan (Asumsi) |",
      "| Besaran | Tahap 3 | Tahap 4 | Batas |",
      "| Kasus (semua Asumsi) | λ per detik | W | L |",
      "| Besaran | Hitungan | Hasil per tahun |",
      "| Besaran | Tahap 4 | Tahap 5 | Cara hitung Tahap 5 |",
      "| Cara memperkirakan Tahap 5 | Kelebihan | Kekurangan |",
      "| Pertanyaan | Angka dari halaman ini | Keputusannya ditulis di |",
    ]);
    expect(baris.filter((b) => /^\|[-|]+\|$/.test(b))).toHaveLength(8);
    expect([...badan.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 5, 6]);
    harus("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
    expect(badan.match(/Tiga pertanyaan tetap terbuka/)).not.toBeNull();
    expect(hitungKali(badan, "<summary>Jawaban</summary>")).toBe(4);
    expect(frontmatter).toContain("description: Estimasi dari angka Tahap 4, berlabel Asumsi atau Hitungan.");
  });
  test("kalimat klaim yang memuat angka, nama tahap, atau label: Mulai, Coba, dan Paham 1 sampai 4", () => {
    harus("Estimasi menghitung tiap kelas pekerjaan sendiri, lalu membandingkan hasilnya dengan batas komponen yang dipakainya.");
    harus("Worker adalah proses yang mengirim notifikasi dari queue. Yang berbahaya dari pihak ketiga tetap lamanya, seperti di [[t3-m18]].");
    harus("Itu Hitungan: hasil rumus dari angka yang tertulis di halaman, dan tetap Asumsi karena masukannya Asumsi. Kapasitas satu server belum terukur.");
    harus(`<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: dari Tahap 4 ke Tahap 5 puncak naik ${a5.user / a4.user} kali, bukan ${Math.round(h4.puncak / h3.puncak)} kali,`);
    harus("Rumusnya sama dengan [[t3-estimasi]], sekarang untuk Tahap 4 dan Tahap 5. Tebak dulu berapa kali lipat puncaknya naik, lalu pilih Tahap 5 dan baca baris mana yang berubah.");
    harus(`PRD v5 ([[t4-m39]]) menaikkan user terdaftar ke ${ribu(a5.user)}, sepuluh kali Tahap 4.`);
    harus("[[t3-estimasi]] melakukannya untuk Tahap 3 ke 4 saat integrasi pihak ketiga belum ada. Sekarang tiap kelas Tahap 4 punya lab,");
    harus(`Selisihnya dari ${Math.round(h4.puncak / h3.puncak)} hanya pembulatan.`);
    harus("Semua angka di tabel ini Asumsi naskah, bukan pengukuran.");
    harus("Tabel di blok Paham memakai");
    harus("Jeda antar percobaan tidak memegang worker (Asumsi).");
    harus("L = λ × W memberi koneksi atau worker yang tertahan, dengan W sebagai Asumsi karena gateway dan vendor di lab adalah tiruan lokal.");
    harus("Top-up dari bank dan verifikasi identitas memanggil pihak ketiga.");
    harus(`Partisi \`posting\` dijadwalkan saat ±${PARTISI_POSTING / 1e6} juta posting per tahun di Tahap 5 ([[t2-skema]]).`);
    harus("Notifikasi uang yang menunggu di belakangnya terlambat, dan urutan queue ditulis di [[t3-m27]].");
    harus("Pengumuman ke semua HP memakai satu queue.");
    harus("Kapasitas bukan request per detik.");
    harus("api-t4 (`beban.txt` bagian B) menguras");
    expect(beban).toMatch(/# --- B\. Kapasitas worker/);
    expect(beban).toMatch(/# --- A\. 20 detik pada 138\.9 permintaan per detik/);
    harus("Itu batas pada satu mesin, bukan kapasitas produksi.");
    harus(`Widget membulatkan hasil ke dua angka penting, jadi Tahap 4 tampil ${duaAngka(h4.puncak)} dan Tahap 5 tampil ${duaAngka(h5.puncak)}.`);
    harus("Pilih **Aktif 10%**: user aktif tinggal setengahnya,");
    harus("Pilih **Satu jam**: semua request sehari masuk di satu jam,");
    harus("Sebelum ada komponen yang dipilih, estimasi mengubahnya menjadi angka per kelas pekerjaan.");
    harus("Top-up punya satu tambahan.");
    harus("L adalah rata-rata, jadi pada satu detik tertentu jumlahnya bisa lebih besar ([[t2-estimasi]]).");
  });
  test("kalimat klaim yang memuat angka, nama tahap, atau label: Paham 5 sampai 8", () => {
    harus("Tabel ini mengalikannya, dan mengandaikan perilaku per user tetap seperti Tahap 4.");
    harus("Tabel ini bukan desain Tahap 5; ia hanya menunjuk angka yang melewati batas bila yang berubah cuma jumlah user.");
    harus("Tiga pertanyaan tetap terbuka sesudah semua hitungan di atas.");
    harus("*Berapa request per detik yang sanggup dilayani satu server?* Tidak terjawab.");
    harus("*Berapa lama gateway dan vendor menjawab?*");
    harus("*Bagaimana tim yang lebih besar mengubah satu codebase?*");
    harus("Ada tiga besaran ukuran, semuanya Hitungan atas Asumsi.");
    harus("File memakai hitungan lain.");
    harus("Di mana file disimpan adalah keputusan tersendiri.");
    harus("| Per kelas pekerjaan, dikali masukan tahap itu, lalu dibanding batas | Menunjuk komponen yang melewati batas lebih dulu, dan kelas yang menunggu pihak ketiga | Perilaku per user dianggap tetap, dan kelas baru PRD v5 belum punya λ dan W |");
    harus("Aturan ini salah bila perilaku per user berubah, misalnya satu pembayaran memicu dua notifikasi. Ia juga salah bila beban datang bergelombang, seperti pengumuman ke semua HP sekaligus ([[t3-m27]]).");
    harus("Dugaan, belum direkam: ia salah bila W naik saat sistem sibuk, karena L ikut naik lebih jauh dari hitungan W yang tetap.");
    harus("Lajunya kecil,");
    harus("Yakin dengan ketiganya? Lompat ke [[berikutnya]].");
  });
  test("aturan estimasi dan daftar periksa review kode AI: tiap butir", () => {
    for (const b of [
      "1. Hitung ulang dari registry tahap itu dan tulis rumus serta masukannya.",
      "2. Pisahkan kelas pekerjaan. Kelas yang menahan koneksi, worker, atau disk dihitung dengan λ-nya sendiri.",
      "3. Bandingkan tiap hasil dengan batas komponennya,",
      "4. Hitung pihak ketiga dengan beberapa W: normal, batas timeout, dan tanpa timeout. Tulis semuanya sebagai Asumsi sampai ada rekaman.",
      "5. Hitung file sebagai ukuran, terpisah dari ukuran tabel.",
      "6. Catat apa yang tidak dijawab estimasi.",
      "- [ ] Estimasi menyebut rumus, masukan, dan label (Asumsi, Hitungan, atau Rekaman lab) untuk setiap angka.",
      "- [ ] Tahap berikutnya dihitung dari masukan registry tahap itu. Bila mengalikan hasil tahap lama, itu ditulis terang.",
      "- [ ] Setiap kelas pekerjaan punya λ sendiri, dan L = λ × W dihitung untuk kelas yang memegang koneksi atau worker.",
      "- [ ] Hitungan koneksi menulis semua suku: pool tiap instance, worker, admin, dan cadangan superuser.",
      "- [ ] Rekaman beban yang batasnya dipasang sendiri, seperti pool, tidak dipakai sebagai bukti kapasitas.",
      "- [ ] Ukuran file dihitung terpisah dari ukuran tabel.",
    ]) harus(b);
    expect([...badan.matchAll(/^- \[ \] /gm)]).toHaveLength(6);
  });
  test("teks Rantai dan widget yang tidak berangka: judul, sub, dan label", () => {
    expect(diagram.id).toBe("t4-estimasi-inti");
    expect(diagram.judul).toBe("Hitungan Tahap 4 ke Tahap 5");
    expect(diagram.baris[0]!.sub).toBe("dari angka tertulis");
    expect(diagram.baris[0]!.simpul[0]!.sub).toBe("per detik, puncak");
    expect(diagram.baris[1]!.simpul[2]!.sub).toBe("per tahun");
    expect(diagram.baris[1]!.simpul[2]!.nada).toBe("system");
    expect(data.label).toEqual({
      sumber: "Asumsi", tebakDulu: "Tebak dulu:", lanjut: "Sekarang pilih “Tahap 5” di atas tabel.", ubah: "Skenario", asumsi: "asumsi", detik: "detik", ms: "ms",
      baris: { user: "User terdaftar", dau: "User aktif per hari", reqHari: "Request per hari", rata: "Rata-rata, request per detik", puncak: "Puncak, request per detik" },
      kesimpulan: "Di jam paling ramai, satu request datang kira-kira tiap {jarak}.",
    });
  });
});

describe("kartu Cek diri di kartu.json sama dengan teks halaman", () => {
  const k = kartu.filter((x) => x.halaman === "t4-estimasi");
  test("empat kartu dengan judul, url, tanya, dan jawab dari halaman", () => {
    expect(k.map((x) => x.id)).toEqual(["t4-estimasi-1", "t4-estimasi-2", "t4-estimasi-3", "t4-estimasi-4"]);
    for (const x of k) {
      expect(x.judul).toBe("4.28 Estimasi Tahap 4 → 5");
      expect(x.url).toBe("tahap-4/estimasi/");
      expect(badan, `tanya ${x.id}`).toContain(x.tanya);
      expect(badan, `jawab ${x.id}`).toContain(x.jawab);
    }
    const nomor = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].filter((m) => k.some((x) => x.tanya === m[2]));
    expect(nomor.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
  });
  test("tiap jawaban memuat angka yang dihitung ulang dari registry dan naskah", () => {
    expect(k[0]!.jawab).toContain(`${koma(h4.puncak, 1)} ke ${kali(h5.puncak, 1)}`);
    expect(k[1]!.jawab).toContain(`${koma(notif4, 2)} ke ${koma(notif5, 1)} per detik`);
    expect(k[1]!.jawab).toContain(`${Math.round((notif5Tulis / kapTulis) * 100)}%`);
    expect(k[2]!.jawab).toContain(`${cocok(runApi, /batas_p95 = (\d+)/)[1]} ms`);
    expect(k[3]!.jawab).toContain(`${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN}`);
    expect(k[3]!.jawab).toContain(`Angka ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN} melewatkan cadangan superuser.`);
  });
});

describe("diagram Rantai t4-estimasi-inti.json", () => {
  test("baris 1: Tahap 4 dengan request, worker, dan file", () => {
    const [req, wor, fil] = diagram.baris[0]!.simpul;
    expect(diagram.baris[0]!.label).toBe("Tahap 4");
    expect(req!.teks).toBe(`Request: ${koma(h4.puncak, 1)}`);
    expect(wor!.teks).toBe(`Worker: ${Math.round(pakai4 * 100)}%`);
    expect(wor!.sub).toBe(`dari ${koma(KAP, 2)} per detik`);
    expect(fil!.teks).toBe(`File: ${gbFile} GB`);
    expect(fil!.sub).toBe("per tahun");
  });
  test("baris 2: dikali 10 dengan request, worker, dan file Tahap 5", () => {
    const [req, wor, fil] = diagram.baris[1]!.simpul;
    expect(diagram.baris[1]!.label).toBe(`Dikali ${a5.user / a4.user}`);
    expect(req!.teks).toBe(`Request: ${kali(h5.puncak, 1)}`);
    expect(req!.sub).toBe(`naik ${a5.user / a4.user} kali`);
    expect(wor!.teks).toBe(`Worker: ${Math.round((notif5Tulis / kapTulis) * 100)}%`);
    expect(wor!.sub).toBe("kapasitas tetap");
    expect(fil!.teks).toBe(`File: ${kali(gbFile5, 0)} GB`);
    expect(diagram.baris.flatMap((b) => b.simpul).map((s) => s.teks).join(" ")).not.toMatch(/\bB\d/);
    expect(diagram.judul.length).toBeLessThanOrEqual(47);
    expect(diagram.baris[1]!.sub).toBe("perilaku per user tetap");
  });
  test("sumber diagram jujur: Asumsi, dan nada simpul masalah hanya di worker Tahap 5", () => {
    expect(diagram.sumber.jenis).toBe("asumsi");
    expect(diagram.sumber.teks).toBe("Asumsi naskah dan registry, bukan pengukuran");
    expect(diagram.baris[0]!.simpul.map((s) => s.nada)).toEqual(["old", "good", "system"]);
    expect(diagram.baris[1]!.simpul.map((s) => s.nada)).toEqual(["system", "warn", "system"]);
    expect(pakai5).toBeGreaterThan(1);
    expect(pakai4).toBeLessThan(1);
  });
});

describe("widget kalkulator t4-estimasi-kalkulator.json", () => {
  const daftar = siapkan(data, registry);
  test("empat skenario: Tahap 4, Tahap 5, Aktif 10%, Satu jam", () => {
    expect(data.skenario.map((s) => s.label)).toEqual(["Tahap 4", "Tahap 5", "Aktif 10%", "Satu jam"]);
    expect(daftar[0]).toEqual(a4);
    expect(daftar[1]).toEqual(a5);
    expect(daftar[2]).toEqual({ ...a5, aktif: 10 });
    expect(daftar[3]).toEqual({ ...a5, puncak: DETIK / 3600 });
    expect(data.awal).toBe(0);
    // nilai bawaan widget sama dengan tabel halaman (rumus sama dengan hitung() yang dipakai tabel)
    expect(koma(hitung(daftar[0]!).puncak, 1)).toBe(koma(h4.puncak, 1));
    harus(`| Puncak request per detik | ${koma(hitung(daftar[0]!).puncak, 1)} | ${kali(hitung(daftar[1]!).puncak, 1)} |`);
    harus(`| User aktif harian | ${ribu(hitung(daftar[0]!).dau)} | ${ribu(hitung(daftar[1]!).dau)} |`);
  });
  test("tebakan: jawabannya 10 kali, dibuka skenario Tahap 5, dengan alasan dari pengali", () => {
    const t = data.tebak;
    expect(t.pilihan[t.jawaban]).toBe(`${Math.round(h5.puncak / h4.puncak)} kali`);
    expect(data.skenario[t.skenario]!.tahap).toBe(5);
    expect(data.skenario[t.skenario]!.ubah).toBeUndefined();
    expect(t.q).toBe(`Tahap 5 punya ${ribu(a5.user)} user, sepuluh kali Tahap 4. Berapa kali lipat puncak request per detiknya?`);
    expect(t.alasan).toBe(`User naik ${a5.user / a4.user} kali, user aktif tetap ${a4.aktif}% (${a5.aktif / a4.aktif} kali), dan request per user tetap ${a4.req} (${a5.req / a4.req} kali). Berbeda dari Tahap 3 ke Tahap 4, tidak ada pengali yang turun. Hasil kalinya ${Math.round(h5.puncak / h4.puncak)}, jadi puncak naik dari ${koma(h4.puncak, 1)} ke ${kali(h5.puncak, 1)} request per detik.`);
    expect(a5.user / a4.user).toBe(10);
  });
  test("posisi dan bentuk pilihan: jawaban bukan yang pertama, bukan yang terpanjang, posisinya beda dari semua kalkulator lain", () => {
    const t = data.tebak;
    expect(t.jawaban).toBeGreaterThan(0);
    const panjang = t.pilihan.map((p) => p.length);
    expect(panjang[t.jawaban]).toBeLessThan(Math.max(...panjang));
    for (const p of t.pilihan) expect(p).toMatch(/^[\d,]+ kali$/);
    expect(new Set(t.pilihan).size).toBe(t.pilihan.length);
    expect(t.pilihan).toContain(`${Math.round(h4.puncak / h3.puncak)} kali`);
    for (const f of ["t1-estimasi-kalkulator", "t1-m8-kalkulator", "t2-estimasi-kalkulator", "t3-estimasi-kalkulator", "t3-m28-kalkulator"]) {
      const lain = JSON.parse(baca(`situs/data/widget/${f}.json`)) as { tebak: { jawaban: number; pilihan: string[] } };
      if (lain.tebak.pilihan.length === t.pilihan.length) expect(lain.tebak.jawaban, f).not.toBe(t.jawaban);
    }
  });
  test("label widget dan sumber: Asumsi, kesimpulan memuat jarak antar request", () => {
    expect(data.sumber.jenis).toBe("asumsi");
    expect(data.sumber.teks).toBe("Asumsi naskah dari cerita.json, bukan pengukuran.");
    expect(data.label.sumber).toBe("Asumsi");
    expect(data.label.kesimpulan).toContain("{jarak}");
    expect(data.label.lanjut).toBe("Sekarang pilih “Tahap 5” di atas tabel.");
    expect(data.judul).toBe("Puncak beban Tahap 4 dan Tahap 5");
    expect(data.id).toBe("t4-estimasi-kalkulator");
    harus("<Kalkulator client:visible data={dataKalkulator} asumsi={cerita.tahap.map((t) => t.asumsi)} />");
    harus('import dataKalkulator from "../../../../data/widget/t4-estimasi-kalkulator.json";');
    harus('import intiDiagram from "../../../../data/diagram/t4-estimasi-inti.json";');
  });
});
