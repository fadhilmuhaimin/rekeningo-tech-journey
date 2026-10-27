// Penjaga halaman 3.29 (keputusan 1112 sampai 1114): angka, tautan, label sumber, klaim negatif berlingkup, diagram Rantai, teks
// widget kalkulator, kartu Cek diri, dan atribusi di estimasi.mdx diturunkan dari registry (cerita.json tahap[2] dan tahap[3]),
// naskah Tahap 3 dan 4 (plan/CERITA-TAHAP-3.md, plan/CERITA-TAHAP-4.md), halaman tetangga (1.38, 2.30, 3.8, 3.26), rekaman
// labs/t3-outbox/output/queue.txt, dan baris RISET, bukan dari daftar yang ditulis sendiri. Halaman ini tanpa lab: setiap angka
// berlabel Asumsi, kecuali satu rujukan ke rekaman Tahap 3 yang dihitung ulang dari queue.txt.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci per
// baris lewat estimasi-t3.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat terkunci tidak
// menangkap SALAHNYA kalimat, jadi klaim yang bisa dihitung (pengali, pemakaian, L = λ × W, ambang pool) dihitung ulang di bawah.
// Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-estimasi-inti.json";
import widgetMentah from "../../data/widget/t3-estimasi-kalkulator.json";
import { DaftarAsumsi, DataKalkulator } from "../widgets/kalkulator/skema";
import { duaAngka, hitung, siapkan } from "../widgets/kalkulator/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./estimasi-t3.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-3/estimasi.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const riset3 = baca("plan/RISET-TAHAP-3.md");
const riset2 = baca("plan/RISET-TAHAP-2.md");
const antrean = baca("plan/ANTREAN.md");
const hal138 = baca("situs/src/content/docs/tahap-1/kerangka-estimasi.mdx");
const hal230 = baca("situs/src/content/docs/tahap-2/estimasi.mdx");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const hal29 = baca("situs/src/content/docs/tahap-2/skema-data.mdx");
const hal38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
const hal326 = baca("situs/src/content/docs/tahap-3/m27-hari-promo.mdx");
const queue = baca("labs/t3-outbox/output/queue.txt");
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
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const dibaca = (s: string): number => Number(s.replace(",", "."));

// ---- masukan dari registry dan naskah --------------------------------------------------------------------------------------
const registry = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));
const a3 = registry[2]!;
const a4 = registry[3]!;
const mentah = (i: number) => cerita.tahap[i]!.asumsi as unknown as Record<string, number | string>;
const m3 = mentah(2);
const m4 = mentah(3);
const h2 = hitung(registry[1]!);
const h3 = hitung(a3);
const h4 = hitung(a4);
const DETIK = 86_400;
const TRX = Number(m4.trx);
const MAKAN_SIANG = cocok(naskah3, /jendela makan siang \((\d+)% dalam (\d+) menit\)/);
const FRAKSI_SIANG = Number(MAKAN_SIANG[1]) / 100;
const DETIK_SIANG = Number(MAKAN_SIANG[2]) * 60;
const naskahTopup = cocok(naskah4, /\| Top-up dari bank \|[^|]*\| ([\d,]+) top-up per user aktif per hari \(Asumsi\), ([\d.]+) per hari \|/);
const TOPUP_PER_AKTIF = dibaca(naskahTopup[1]!);
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
const PARTISI_POSTING = 440_000_000;

const lam = (perHari: number) => (perHari / DETIK) * a4.puncak; // λ puncak per detik untuk satu kelas
const trx3Hari = h3.dau * TRX;
const trx4Hari = h4.dau * TRX;
const topupHari = h4.dau * TOPUP_PER_AKTIF;
const kartuHari = h4.dau * FRAKSI_KARTU;
const unggahHari = Number(m4.upload);
const lamTrx3 = (trx3Hari / DETIK) * a3.puncak;
const lamTrx4 = lam(trx4Hari);
const lamTop = lam(topupHari);
const lamVer = lam(PENDAFTAR);
const lamKartu = lam(kartuHari);
const lamUnggah = lam(unggahHari);
const notif4 = lam(trx4Hari + topupHari);
const sianga3 = (trx3Hari * FRAKSI_SIANG) / DETIK_SIANG;
const siang4 = ((trx4Hari + topupHari) * FRAKSI_SIANG) / DETIK_SIANG;
const pakai3 = lamTrx3 / KAP;
const pakai4 = notif4 / KAP;
const L3 = h3.puncak * W_DB;
const L4 = h4.puncak * W_DB;
const BATAS_L = INST * (POOL - 1);
const posting3 = h3.dau * TRX * POSTING_PER_TRX * 365;
const posting4 = h4.dau * TRX * POSTING_PER_TRX * 365;
const gbLedger4 = (posting4 * 250) / 1e9;
const gbD1 = (h4.dau * TRX * 365 * Number(m4.baris)) / 1e9;
const gbLab4 = (posting4 * 137) / 1e9;
const gbFile = (unggahHari * Number(m4.fileKB) * 365) / 1e6;
// λ seperti tertulis di halaman (0,579 dan 0,116): hasil turunan dihitung dari angka yang tertulis, supaya pembaca bisa mengulangnya.
const lamTopTulis = dibaca(koma(lamTop, 3));
const lamVerTulis = dibaca(koma(lamVer, 3));
const notif4Tulis = dibaca(koma(notif4, 2));

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai dan widget sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kalkulator"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t3-estimasi-inti.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(JSON.parse(baca("situs/data/widget/t3-estimasi-kalkulator.json")))).toEqual(NILAI_JSON.kalkulator);
  });
});

describe("registry, naskah, blok, dan tautan", () => {
  const reg = dari("t3-estimasi");
  test("entri registry dan baris peta naskah cocok", () => {
    expect(reg).toMatchObject({ ada: true, nomor: "3.29", jenis: "konsep", inti: true, prasyarat: ["t3-m28"], tahap: 3, peran: ["backend"], topik: "Desain sistem" });
    expect(reg.path).toBe("tahap-3/estimasi.md");
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(reg.path!, ".md"));
    expect(reg.lab).toBeUndefined();
    expect(naskah3).toContain("| 3.29 | 4 | Estimasi Tahap 3 → 4 | Konsep | ★ | – | kalkulator |");
    expect(reg.judul).toBe("Estimasi Tahap 3 → 4");
    expect(frontmatter).toContain('title: "3.29 Estimasi Tahap 3 → 4"');
    expect(hal.filter((h) => h.nomor === "3.29").map((h) => h.id)).toEqual(["t3-estimasi"]);
    expect(dari("t3-adr-33")).toMatchObject({ nomor: "3.30", prasyarat: ["t3-estimasi"], adr: [33] });
    expect(dari("t3-m28")).toMatchObject({ nomor: "3.28", jenis: "masalah" });
  });
  test("description memuat puncak Tahap 3 dan 4 dan pengali yang sama dengan isi", () => {
    const desc = cocok(frontmatter, /^description: (.+)$/m)[1]!;
    expect(desc).toContain(`Puncak naik ${Math.round(h4.puncak / h3.puncak)} kali, dari ${koma(h3.puncak, 1)} ke ${koma(h4.puncak, 1)} request per detik.`);
    expect(desc).toContain("semua Asumsi");
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m28\]\] · Jalur inti<\/p>/);
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
    const kepekaan = hitung({ ...a4, puncak: DETIK / 3600 });
    harus(`puncak Tahap 4 naik ${Math.round(h4.puncak / h3.puncak)} kali, bukan ${a4.user / a3.user} kali, dan walau semua request sehari masuk di satu jam, puncaknya ±${duaAngka(kepekaan.puncak)} request per detik (Asumsi).`);
  });
  test("tautan [[id]]: himpunan sama; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["D1", "berikutnya", "t2-adr-21", "t2-estimasi", "t2-skema", "t3-adr-33", "t3-m18", "t3-m27", "t3-m28", "t3-pool"]);
    const sesuai: [string, string, string][] = [
      ["D1", "1.38", "Kerangka berpikir dan estimasi"], ["t2-adr-21", "2.31", "ADR 21"], ["t2-estimasi", "2.30", "Estimasi Tahap 2"], ["t2-skema", "2.9", "Skema data"],
      ["t3-adr-33", "3.30", "ADR 33"], ["t3-m18", "3.6", "M18"], ["t3-m27", "3.26", "M27"], ["t3-m28", "3.28", "M28"], ["t3-pool", "3.8", "Connection pool"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      if (dari(idh).tahap === 3) {
        expect(naskah3, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      }
    }
    expect(dari("t3-m28").ada, "3.28 belum merge: tautannya tampil (segera) sampai halaman itu masuk").toBeDefined();
    expect(dari("t3-adr-33").ada).toBeDefined();
    expect(cara).toContain("Label sumber");
    expect(hitungKali(badan, "[Label sumber](/cara-pakai/#label-sumber)")).toBe(1);
    expect(hitungKali(badan, "[Rekaman lab](/cara-pakai/#label-sumber)")).toBe(1);
  });
  test("janji halaman lain ke 3.29 ditepati: 3.8 menunjuk ke sini untuk ukuran pool dari L terukur, dan 3.30 untuk pooler", () => {
    expect(hal38).toContain(`| Mengubah ukuran pool dari L terukur | L seluruh request ${koma(L3, 2)} koneksi (Asumsi), jauh dari ${POOL - 1}; angkanya belum diukur di server sungguhan | [[t3-estimasi]] |`);
    expect(hal38).toContain("| Pooler terpisah seperti PgBouncer |");
    expect(hal38).toContain(`${INST} × ${POOL} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} koneksi`);
    expect(hal38).toContain(`bila L melebihi ${POOL} − 1 = ${POOL - 1}`);
    harus(`| Mengubah ukuran pool | L semua request ${koma(L4, 2)} dari batas ${BATAS_L}, dan W ${W_DB * 1000} ms belum diukur | [[t3-adr-33]] |`);
    harus(`| Pooler seperti PgBouncer | Koneksi ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} | [[t3-adr-33]] |`);
    expect(antrean).toContain("### 3.30 · ADR 33: Sengaja belum dilakukan");
  });
  test("halaman tidak membuka isi Tahap 4: tanpa nomor ADR 34 ke atas, M29 ke atas, dan mekanisme Tahap 4", () => {
    expect(badan).not.toMatch(/ADR (3[4-9]|4\d)\b|\bM(29|3\d)\b|webhook|SSRF|presigned|circuit breaker|bytea|object storage|audit log/i);
    expect(hitungKali(badan, "ADR 22")).toBe(1);
    expect(hitungKali(badan, "ADR 21")).toBe(1);
    expect(hitungKali(badan, "ADR 25")).toBe(0);
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/\bR[2-4]-\d+\b/);
  });
});

describe("registry dan naskah: masukan dan hasil yang dipakai halaman", () => {
  test("masukan registry Tahap 3 dan 4, dan kunci yang ada hanya untuk unggahan", () => {
    expect([a3.user, a3.aktif, a3.req, a3.puncak]).toEqual([10000, 25, 60, 10]);
    expect([a4.user, a4.aktif, a4.req, a4.puncak]).toEqual([100000, 20, 60, 10]);
    expect([m3.trx, m4.trx, m3.baris, m4.baris]).toEqual([3, 3, 300, 300]);
    expect([m4.upload, m4.fileKB]).toEqual([2000, 500]);
    expect(Object.keys(m4).sort()).toEqual(["aktif", "baris", "fileKB", "puncak", "req", "tim", "trx", "upload", "user"]);
    expect(m3.upload).toBeUndefined();
  });
  test("masukan naskah: top-up, pendaftar, unggahan, kartu, worker, percobaan, koneksi", () => {
    expect([TOPUP_PER_AKTIF, topupHari]).toEqual([0.25, 5000]);
    expect([PENDAFTAR, FILE_PER_PENDAFTAR, PENDAFTAR * FILE_PER_PENDAFTAR]).toEqual([1000, 2, unggahHari]);
    expect([FRAKSI_KARTU, kartuHari]).toEqual([0.05, 1000]);
    expect([C, T_PUSH, KAP]).toEqual([4, 0.3, 4 / 0.3]);
    expect([PERCOBAAN, TIMEOUT]).toEqual([5, 3]);
    expect([INST, POOL, INST_BAYAR, POOL_BAYAR, WORKER_DB, ADMIN, CADANGAN]).toEqual([2, 10, 2, 5, 4, 3, 3]);
    expect([FRAKSI_SIANG, DETIK_SIANG]).toEqual([0.8, 5400]);
    expect(W_DB).toBe(0.02);
    expect(naskah3).toContain("Kapasitas satu server tetap belum diukur.");
  });
  test("pengali: puncak naik 8 kali = 10 × (20 ÷ 25) × (60 ÷ 60), dan 7,98 hanya dari angka yang dibulatkan", () => {
    expect(h4.puncak / h3.puncak).toBeCloseTo(8, 10);
    expect(10 * (a4.aktif / a3.aktif) * (a4.req / a3.req)).toBeCloseTo(8, 10);
    expect(a4.user / a3.user).toBe(10);
    expect(koma(138.9 / 17.4, 2)).toBe("7,98");
    expect(koma(h3.puncak, 1)).toBe("17,4");
    expect(koma(h4.puncak, 1)).toBe("138,9");
    expect(naskah4).toContain("138,9 puncak (Tahap 3: 17,4; naik 7,98 kali, dibulatkan 8 kali)");
    expect(trx4Hari / trx3Hari).toBeCloseTo(8, 10);
    expect(trx4Hari / h4.reqHari).toBeCloseTo(0.05, 10);
    expect(koma(lamTrx4 / lamTrx3, 1)).toBe("8,0");
  });
  test("kepekaan: aktif 25% memberi tepat 10 kali Tahap 3, satu jam memberi faktor 24 dan 2,4 kali Tahap 4", () => {
    const aktif25 = hitung({ ...a4, aktif: 25 });
    expect(aktif25.puncak / h3.puncak).toBeCloseTo(10, 10);
    expect(duaAngka(aktif25.puncak)).toBe("170");
    const jam = hitung({ ...a4, puncak: DETIK / 3600 });
    expect(DETIK / 3600).toBe(24);
    expect(duaAngka(jam.puncak)).toBe("330");
    expect(jam.puncak / h4.puncak).toBeCloseTo(2.4, 10);
    expect(duaAngka(h3.puncak)).toBe("17");
    expect(duaAngka(h4.puncak)).toBe("140");
  });
  test("naskah Tahap 4 memuat hasil yang sama dengan hitungan di sini", () => {
    expect(naskah4).toContain(`${koma(h4.puncak / 10, 1)} rata-rata dan ${koma(h4.puncak, 1)} puncak`);
    expect(naskah4).toContain(`${koma(lamTrx4 / 10, 3)} rata-rata dan ${koma(lamTrx4, 2)} puncak (Tahap 3: ${koma(lamTrx3, 3)}; naik 8,0 kali)`);
    expect(naskah4).toContain(`${koma(lamTop / 10, 3)} rata-rata dan ${koma(lamTop, 3)} puncak`);
    expect(naskah4).toContain(`${koma(notif4, 2)} per detik puncak = ${Math.round(pakai4 * 100)}% kapasitas (Tahap 3: ${koma(lamTrx3, 3)} ÷ ${koma(KAP, 1)} = ${koma(pakai3 * 100, 1)}%)`);
    expect(naskah4).toContain(`makan siang: ${ribu(trx4Hari + topupHari)} × ${koma(FRAKSI_SIANG, 1)} ÷ ${ribu(DETIK_SIANG)} = ${koma(siang4, 2)} per detik = ${Math.round((siang4 / KAP) * 100)}%`);
    expect(naskah4).toContain(`±${ribu((100_000 * T_PUSH) / C)} detik, ${(100_000 * T_PUSH) / C / 60} menit`);
    expect(naskah4).toContain(`${koma(lamVer, 3)} per detik puncak. Bila vendor mati`);
    expect(naskah4).toContain(`${koma(lamVer, 3)} × ${PERCOBAAN * TIMEOUT} = ${koma(lamVer * PERCOBAAN * TIMEOUT, 2)} dari ${C} worker, dan ${koma(lamVer * PERCOBAAN * TIMEOUT, 2)} + ${koma(notif4 * T_PUSH, 2)}`);
    expect(naskah4).toContain(`${koma(lamUnggah, 3)} per detik puncak = ${Math.round(lamUnggah * Number(m4.fileKB))} KB per detik; ${koma((unggahHari * Number(m4.fileKB)) / 1e6, 0)} GB per hari`);
    expect(naskah4).toContain(`${koma(lamKartu, 3)} per detik puncak`);
    expect(naskah4).toContain(`${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI} (Tahap 3: ${INST * POOL + WORKER_DB + ADMIN + CADANGAN}`);
    expect(naskah4).toContain(`L = ${koma(lamTopTulis * 0.3, 2)} / ${koma(lamTopTulis * 2, 2)} / ${koma(lamTopTulis * 3, 2)} / 8,68 / ${koma(lamTopTulis * 30, 1)}`);
    expect(naskah4).toContain(`penuh dalam ±${koma(INST_BAYAR * POOL_BAYAR / lamTopTulis, 1)} detik (10 ÷ 0,579)`);
    expect(naskah4).toContain(`T > 9 ÷ 0,579 = ±${koma(9 / lamTopTulis, 1)} detik`);
    expect(naskah4).toContain("4,0 dari 4 worker");
    // selisih yang diketahui: λ tepat 0,5787 memberi 15,55 (15,6); naskah dan halaman memakai 0,579 yang tertulis, jadi 15,5
    expect(koma(9 / lamTop, 1)).toBe("15,6");
    expect(koma(9 / lamTopTulis, 1)).toBe("15,5");
    expect(koma(10 / lamTop, 1)).toBe(koma(10 / lamTopTulis, 1));
  });
  test("tiga tempat sinkron: 1.38, 2.30, dan registry memuat puncak dan ukuran data yang sama", () => {
    expect(hal138).toContain(`| Puncak request per detik (Tahap 4) | ±${duaAngka(h4.puncak)} | ${ribu(a4.user)} × ${a4.aktif}% × ${a4.req} ÷ ${ribu(DETIK)} × ${a4.puncak} |`);
    expect(hal138).toContain(`| Puncak request per detik (Tahap 3) | ±${duaAngka(h3.puncak)} | ${ribu(a3.user)} × ${a3.aktif}% × ${a3.req} ÷ ${ribu(DETIK)} × ${a3.puncak} |`);
    expect(hal138).toContain(`| Data transaksi per tahun (Tahap 3) | ±${duaAngka((h3.dau * TRX * 365 * Number(m3.baris)) / 1e6)} MB |`);
    expect(hal230).toContain(`jadi puncak naik dari ±${duaAngka(h2.puncak)} ke ±${duaAngka(h3.puncak)} request per detik`);
    expect(hal230).toContain(`±${duaAngka((h3.dau * TRX * 365 * Number(m3.baris)) / 1e6)} MB`);
    expect(hal230).toContain(`±${duaAngka((posting3 * 250) / 1e9)} GB`);
    expect(hal230).toContain(`| Semua request (Tahap 3) | ${ribu(h3.reqHari)} | ${koma(h3.puncak, 1)} |`);
    expect(hal230).toContain(`| Tahap 3, semua request (W: Asumsi) | ${koma(h3.puncak, 1)} | ${W_DB * 1000} ms | ${duaAngka(h3.puncak * W_DB)} |`);
    expect(naskah3).toContain(`0,087 rata-rata dan ${koma(lamTrx3, 3)} puncak`);
    expect(naskah3).toContain(`${koma(KAP, 1)} per detik`);
    expect(naskah3).toContain(`${ribu((10_000 * T_PUSH) / C)} detik`);
    expect(naskah3).toContain(`jendela makan siang (80% dalam 90 menit): ${koma(sianga3, 2)}`);
  });
  test("pertumbuhan database: 5,475 juta posting dan ±1,4 GB di Tahap 3, 43,8 juta dan ±11 GB di Tahap 4, partisi di ±440 juta", () => {
    expect(posting3).toBe(5_475_000);
    expect(posting4).toBe(43_800_000);
    expect(posting4 / posting3).toBeCloseTo(8, 10);
    expect(naskah4).toContain(`\`posting\` ±44 juta (${ribu(h4.dau)} × ${TRX} × ${POSTING_PER_TRX} × 365 = ${koma(posting4 / 1e6, 1)} juta) | ±11 GB (${koma(gbLedger4, 2)} GB)`);
    expect(hal29).toContain("±440 juta");
    expect(hal230).toContain(`dijadwalkan saat ±${PARTISI_POSTING / 1e6} juta posting per tahun di Tahap 5`);
    expect(hal29).toContain("±137 byte per posting");
    expect(koma(gbLedger4, 2)).toBe("10,95");
    expect(koma(gbD1, 2)).toBe("6,57");
    expect(koma(gbLab4, 1)).toBe("6,0");
    expect(koma(gbLedger4 / gbLab4, 1)).toBe("1,8");
    expect(duaAngka(gbD1)).toBe("6,6");
    expect(duaAngka(gbLedger4)).toBe("11");
    expect(gbD1 / ((h3.dau * TRX * 365 * Number(m3.baris)) / 1e9)).toBeCloseTo(8, 10);
    expect(gbLedger4 / ((posting3 * 250) / 1e9)).toBeCloseTo(8, 10);
    expect(naskah4).toContain(`${gbFile} GB per tahun`);
    expect(naskah4).toContain(`(${gbFile} ÷ ${koma(gbLedger4, 2)})`);
    expect(Math.round(gbFile / gbLedger4)).toBe(33);
    expect(Math.round(gbFile / gbD1)).toBe(56);
  });
  test("rekaman: kapasitas worker diukur antara 12 dan 13,33 per detik pada push tiruan 300 ms (queue.txt bagian A), dan 3.26 menulis hal yang sama", () => {
    const cA = cocok(queue, /# c = (\d+) pengirim serentak \(bawaan\), t = ([\d,]+) detik \(layanan push tiruan\)/);
    expect([Number(cA[1]), dibaca(cA[2]!)]).toEqual([C, T_PUSH]);
    const kap = cocok(queue, /kapasitas diukur: antara (\d+) dan ([\d,]+) per detik \(batas atas c ÷ t = (\d+) ÷ ([\d,]+) = ([\d,]+)\)/);
    expect(dibaca(kap[2]!)).toBeCloseTo(KAP, 2);
    expect(kap[5]).toBe(koma(KAP, 2));
    expect(`antara ${kap[1]} dan ${kap[2]} per detik`).toBe("antara 12 dan 13,33 per detik");
    harus(`mengukurnya antara ${kap[1]} dan ${kap[2]} per detik pada layanan push tiruan yang menjawab sesudah ${T_PUSH * 1000} ms ([[t3-m27]])`);
    expect(hal326).toContain(`antara ${kap[1]} dan ${kap[2]} per detik`);
    expect(hal326).toContain(`${C} ÷ ${koma(T_PUSH, 1)} = ${koma(KAP, 2)}`);
    expect(hal326).toContain(`${ribu((10_000 * T_PUSH) / C)} detik`);
  });
});

describe("halaman estimasi.mdx: tiap angka turunan", () => {
  test("Inti dan Cek 3 pertanyaan", () => {
    harus(`user naik ${a4.user / a3.user} kali, tetapi puncak request hanya naik ${Math.round(h4.puncak / h3.puncak)} kali. Puncaknya ${koma(h3.puncak, 1)} menjadi ${koma(h4.puncak, 1)} per detik (Asumsi naskah;`);
    harus(`dari ${koma(pakai3 * 100, 1)}% ke ${Math.round(pakai4 * 100)}% terpakai, dan file, yang mencapai ${gbFile} GB per tahun.`);
    harus(`Pemakaian worker naik dari ${koma(pakai3 * 100, 1)}% ke ${Math.round(pakai4 * 100)}%, lebih dari ${Math.round(h4.puncak / h3.puncak)} kali.`);
    harus(`Gateway bank dipanggil hanya ${koma(lamTopTulis, 3)} kali per detik. Kapan angka sekecil itu tetap menahan lebih dari ${POOL} koneksi?`);
    expect(pakai4 / pakai3).toBeGreaterThan(8);
  });
  test("Coba: skenario Aktif 25% dan Satu jam", () => {
    harus(`Widget membulatkan hasil ke dua angka penting, jadi Tahap 3 tampil ${duaAngka(h3.puncak)} dan Tahap 4 tampil ${duaAngka(h4.puncak)}. Tabel di blok Paham memakai ${koma(h3.puncak, 1)} dan ${koma(h4.puncak, 1)}.`);
    const aktif25 = hitung({ ...a4, aktif: 25 });
    const jam = hitung({ ...a4, puncak: DETIK / 3600 });
    harus(`puncak naik ke ±${duaAngka(aktif25.puncak)}, tepat ${aktif25.puncak / h3.puncak} kali Tahap 3. Selisih ${aktif25.puncak / h3.puncak} lawan ${Math.round(h4.puncak / h3.puncak)} datang dari satu pengali, yaitu ${koma(a4.aktif / 25, 1)} (${a4.aktif} ÷ 25)`);
    harus(`faktor puncaknya ${DETIK / 3600}, dan puncak naik ke ±${duaAngka(jam.puncak)}, atau ${koma(jam.puncak / h4.puncak, 1)} kali dari Tahap 4 biasa`);
  });
  test("Paham 1 dan 2: tabel hitung ulang, pengali, dan pembulatan", () => {
    harus(`| User terdaftar | ${ribu(a3.user)} | ${ribu(a4.user)} | PRD v4 |`);
    harus(`| User aktif harian | ${ribu(h3.dau)} | ${ribu(h4.dau)} | ${ribu(a4.user)} × ${a4.aktif}% |`);
    harus(`| Request per hari | ${ribu(h3.reqHari)} | ${ribu(h4.reqHari)} | ${ribu(h4.dau)} × ${a4.req} request |`);
    harus(`| Puncak request per detik | ${koma(h3.puncak, 1)} | ${koma(h4.puncak, 1)} | ${ribu(h4.reqHari)} ÷ ${ribu(DETIK)} × ${a4.puncak} |`);
    harus(`Puncak naik ${Math.round(h4.puncak / h3.puncak)} kali, bukan ${a4.user / a3.user} kali, walau jumlah user naik ${a4.user / a3.user} kali.`);
    harus(`Persentase aktif turun dari ${a3.aktif}% ke ${a4.aktif}% (× ${a4.aktif} ÷ ${a3.aktif}), dan request per user aktif tetap ${a4.req} (× ${a4.req} ÷ ${a3.req}).`);
    harus(`Hasilnya ${a4.user / a3.user} × (${a4.aktif} ÷ ${a3.aktif}) × (${a4.req} ÷ ${a3.req}) = ${Math.round(h4.puncak / h3.puncak)}.`);
    harus(`Dari angka yang dibulatkan, ${koma(h4.puncak, 1)} ÷ ${koma(h3.puncak, 1)} = ${koma(dibaca(koma(h4.puncak, 1)) / dibaca(koma(h3.puncak, 1)), 2)}.`);
    harus("Rumusnya dari [[D1]], masukannya `tahap[2].asumsi` dan `tahap[3].asumsi` di `cerita.json`.");
    expect(cerita.tahap[2]!.asumsi.user).toBe(10000);
    expect(cerita.tahap[3]!.asumsi.user).toBe(100000);
  });
  test("Paham 3: tabel kelas pekerjaan", () => {
    harus(`| Semua request | ${ribu(h4.reqHari)} | ${koma(h4.puncak, 1)} | tabel di atas |`);
    harus(`| Transaksi uang: bayar, transfer, QR | ${ribu(trx4Hari)} | ${koma(lamTrx4, 2)} | ${ribu(h4.dau)} × ${TRX} transaksi; ${trx4Hari / h4.reqHari * 100}% dari semua request |`);
    harus(`| Top-up dari bank | ${ribu(topupHari)} | ${koma(lamTop, 3)} | ${ribu(h4.dau)} × ${koma(TOPUP_PER_AKTIF, 2)} top-up |`);
    harus(`| Verifikasi identitas | ${ribu(PENDAFTAR)} | ${koma(lamVer, 3)} | ${ribu(PENDAFTAR)} pendaftar |`);
    harus(`| Otorisasi kartu virtual | ${ribu(kartuHari)} | ${koma(lamKartu, 3)} | ${FRAKSI_KARTU * 100}% × ${ribu(h4.dau)} × 1 |`);
    harus(`| Unggahan file | ${ribu(unggahHari)} | ${koma(lamUnggah, 3)} | ${ribu(PENDAFTAR)} pendaftar × ${FILE_PER_PENDAFTAR} file |`);
    harus(`Transaksi uang naik ${koma(lamTrx4 / lamTrx3, 1)} kali (${koma(lamTrx3, 3)} ke ${koma(lamTrx4, 2)}), sama dengan semua request, karena tiga transaksi per user aktif per hari tetap.`);
    harus("Empat kelas lain baru di PRD v4.");
    harus("Dari empat kelas baru, registry hanya memuat unggahan per hari dan ukuran file; angka kelas lain adalah Asumsi naskah.");
    expect(TRX).toBe(3);
    expect(hitungKali(badan, "tiga transaksi per user aktif per hari")).toBe(1);
  });
  test("Paham 4: pemakaian terhadap batas, tabel Tahap 3 dan Tahap 4", () => {
    harus(`Kapasitas worker adalah c ÷ t: c = ${C} pengirim serentak dan t = ${koma(T_PUSH, 1)} detik per pengiriman (Asumsi), jadi ${C} ÷ ${koma(T_PUSH, 1)} = ${koma(KAP, 2)} per detik.`);
    harus(`| Notifikasi uang per detik, puncak | ${koma(lamTrx3, 3)} | ${koma(notif4, 2)} | ${koma(KAP, 2)} per detik |`);
    harus(`| Pemakaian worker, puncak | ${koma(pakai3 * 100, 1)}% | ${Math.round(pakai4 * 100)}% | 100% |`);
    harus(`| Pemakaian worker, makan siang | ${koma((sianga3 / KAP) * 100, 1)}% | ${Math.round((siang4 / KAP) * 100)}% | 100% |`);
    harus(`| Koneksi database | ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} | ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} | ${MAX_KONEKSI} |`);
    harus(`| Koneksi tertahan oleh semua request (W ${W_DB * 1000} ms) | ${koma(L3, 2)} | ${koma(L4, 2)} | ${BATAS_L} |`);
    harus(`| Posting per tahun | ${koma(posting3 / 1e6, 3)} juta | ${koma(posting4 / 1e6, 1)} juta | ±${PARTISI_POSTING / 1e6} juta |`);
    harus(`Notifikasi uang naik ${koma(notif4Tulis / dibaca(koma(lamTrx3, 3)), 1)} kali (${koma(notif4, 2)} ÷ ${koma(lamTrx3, 3)}), lebih cepat dari request, karena top-up dari bank ikut ditambahkan: ${koma(lamTrx4, 2)} + ${koma(lamTop, 3)} = ${koma(notif4, 2)} per detik.`);
    harus(`Pemakaian ${Math.round(pakai4 * 100)}% adalah ${koma(notif4, 2)} ÷ ${koma(KAP, 2)}.`);
    harus(`Makan siang diasumsikan memuat ${FRAKSI_SIANG * 100}% transaksi sehari dalam ${DETIK_SIANG / 60} menit, yaitu ${ribu(DETIK_SIANG)} detik.`);
    harus(`Tahap 4: ${ribu(trx4Hari + topupHari)} × ${koma(FRAKSI_SIANG, 1)} ÷ ${ribu(DETIK_SIANG)} = ${koma(siang4, 2)} per detik, atau ${Math.round((siang4 / KAP) * 100)}%. Tahap 3: ${ribu(trx3Hari)} × ${koma(FRAKSI_SIANG, 1)} ÷ ${ribu(DETIK_SIANG)} = ${koma(sianga3, 2)} per detik, atau ${koma((sianga3 / KAP) * 100, 1)}%.`);
    harus(`Koneksi: ${INST} × ${POOL} + ${INST_BAYAR} × ${POOL_BAYAR} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = ${INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN} dari ${MAX_KONEKSI}.`);
    harus(`Tahap 3 memakai ${INST} × ${POOL} + ${WORKER_DB} + ${ADMIN} + ${CADANGAN} = ${INST * POOL + WORKER_DB + ADMIN + CADANGAN} ([[t3-pool]])`);
    harus(`worker ${WORKER_DB}, admin ${ADMIN}, dan cadangan superuser ${CADANGAN} mengikuti [[t3-pool]]`);
    harus(`L = λ × W = ${koma(h4.puncak, 1)} × ${koma(W_DB, 2)} = ${koma(L4, 2)}, dengan W ${W_DB * 1000} ms (Asumsi, belum diukur).`);
    harus(`Batasnya ${INST} pool × (${POOL} − 1) = ${BATAS_L}, dari aturan di [[t3-pool]].`);
    harus(`L baru menyentuh ${BATAS_L} bila W rata-rata ${BATAS_L} ÷ ${koma(h4.puncak, 1)} = ${Math.round((BATAS_L / h4.puncak) * 1000)} ms, atau ${koma(BATAS_L / h4.puncak / W_DB, 1)} kali W yang diasumsikan.`);
    harus(`Tahap 4 memakai ${koma(posting4 / 1e6, 1)} ÷ ${PARTISI_POSTING / 1e6} = ${Math.round((posting4 / PARTISI_POSTING) * 100)}% dari batas itu.`);
    harus(`100.000 × ${koma(T_PUSH, 1)} ÷ ${C} = ${ribu((100_000 * T_PUSH) / C)} detik, atau ${(100_000 * T_PUSH) / C / 60} menit (Asumsi); di Tahap 3 angkanya ${ribu((10_000 * T_PUSH) / C)} detik untuk 10.000 HP.`);
    harus(`Koneksi tertahan oleh semua request adalah L`);
    harus("Partisi `posting` dijadwalkan saat ±440 juta posting per tahun di Tahap 5 ([[t2-skema]]).");
  });
  test("klaim 'tidak satu komponen pun melewati batasnya karena jumlah request': pemakaian oleh λ saja di bawah batas, dan yang mencapai batas hanya W panjang", () => {
    harus("Di tabel halaman ini, tidak satu komponen pun melewati batasnya hanya karena jumlah request.");
    expect(pakai4).toBeLessThan(1);
    expect(siang4 / KAP).toBeLessThan(1);
    expect(INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN).toBeLessThan(MAX_KONEKSI);
    expect(L4).toBeLessThan(BATAS_L);
    expect(posting4).toBeLessThan(PARTISI_POSTING);
    // yang mencapai atau melewati batas: gateway menggantung 30 detik (L di atas pool) dan vendor mati (worker habis)
    expect(lamTopTulis * 30).toBeGreaterThan(INST_BAYAR * POOL_BAYAR);
    expect(lamTopTulis * TIMEOUT).toBeLessThan(INST_BAYAR * POOL_BAYAR);
    expect(lamTopTulis * 0.3).toBeLessThan(INST_BAYAR * POOL_BAYAR);
    expect(lamVer * PERCOBAAN * TIMEOUT + notif4 * T_PUSH).toBeCloseTo(C, 1);
    expect(lamVer * PERCOBAAN * TIMEOUT).toBeLessThan(C);
    expect(notif4 * T_PUSH).toBeLessThan(C);
    // setiap baris tabel L = λ × W dihitung dari λ yang tertulis
    expect(lamUnggah * Number(m4.fileKB)).toBeLessThan(200);
  });
  test("Paham 5: tabel λ × W, pool pembayaran, ambang client, dan worker verifikasi", () => {
    harus(`| Gateway di dalam request, menjawab normal | ${koma(lamTopTulis, 3)} | ${koma(T_PUSH, 1)} detik | ${koma(lamTopTulis * T_PUSH, 2)} koneksi |`);
    harus(`| Gateway di dalam request, timeout ${TIMEOUT} detik | ${koma(lamTopTulis, 3)} | ${TIMEOUT} detik | ${koma(lamTopTulis * TIMEOUT, 2)} koneksi |`);
    harus(`| Gateway di dalam request, menggantung 30 detik | ${koma(lamTopTulis, 3)} | 30 detik | ${koma(lamTopTulis * 30, 1)} koneksi |`);
    harus(`| Verifikasi saat vendor mati: ${PERCOBAAN} percobaan × ${TIMEOUT} detik | ${koma(lamVerTulis, 3)} | ${PERCOBAAN * TIMEOUT} detik | ${koma(lamVerTulis * PERCOBAAN * TIMEOUT, 2)} worker |`);
    harus(`| Notifikasi uang di worker yang sama | ${koma(notif4Tulis, 2)} | ${koma(T_PUSH, 1)} detik | ${koma(notif4Tulis * T_PUSH, 2)} worker |`);
    harus(`Pool pembayaran ${INST_BAYAR * POOL_BAYAR} (${INST_BAYAR} instance × ${POOL_BAYAR}, Asumsi) penuh pada ${INST_BAYAR * POOL_BAYAR} ÷ ${koma(lamTopTulis, 3)} = ${koma((INST_BAYAR * POOL_BAYAR) / lamTopTulis, 1)} detik bila gateway tidak pernah menjawab dan client terus menunggu.`);
    harus(`pool hanya penuh bila T > ${INST_BAYAR * POOL_BAYAR - 1} ÷ ${koma(lamTopTulis, 3)} = ${koma((INST_BAYAR * POOL_BAYAR - 1) / lamTopTulis, 1)} detik.`);
    harus(`Hasilnya ${koma(lamVerTulis * PERCOBAAN * TIMEOUT, 2)} + ${koma(notif4Tulis * T_PUSH, 2)} = ${koma(lamVerTulis * PERCOBAAN * TIMEOUT + notif4Tulis * T_PUSH, 1)} dari ${C} worker.`);
    harus(`Hanya ${koma(lamVerTulis, 3)} pendaftar per detik, tetapi lamanya ${PERCOBAAN * TIMEOUT} detik per pekerjaan menghabiskan worker.`);
    harus(`jadi 0,3, 3, 15, dan 30 detik adalah Asumsi`);
    expect(0.3).toBe(T_PUSH);
  });
  test("Paham 6: ukuran data dan file", () => {
    harus(`Posting per tahun di Tahap 4 adalah ${ribu(h4.dau)} × ${TRX} × ${POSTING_PER_TRX} × 365 = ${koma(posting4 / 1e6, 1)} juta.`);
    harus(`| Rumus data per tahun [[D1]] | ${ribu(h4.dau)} user aktif × ${TRX} transaksi × 365 × ${m4.baris} byte, satu baris per transaksi | ±${duaAngka(gbD1)} GB | Asumsi |`);
    harus(`| Rumus ledger [[t2-skema]] | ${koma(posting4 / 1e6, 1)} juta posting × 250 byte | ±${duaAngka(gbLedger4)} GB | Asumsi |`);
    harus(`| Ekstrapolasi rekaman lab | ${koma(posting4 / 1e6, 1)} juta posting × 137 byte per posting (batas bawah) | ±${koma(gbLab4, 1)} GB | Asumsi dari Rekaman lab |`);
    harus(`Ketiganya paling jauh berbeda ${koma(gbLedger4 / gbLab4, 1)} kali, jadi masih satu orde besaran.`);
    harus(`Tiap rumus naik ${koma(gbD1 / ((h3.dau * TRX * 365 * Number(m3.baris)) / 1e9), 1)} kali dari Tahap 3: rumus [[D1]] dari ±${duaAngka((h3.dau * TRX * 365 * Number(m3.baris)) / 1e6)} MB ke ±${duaAngka(gbD1)} GB, dan rumus ledger dari ±${duaAngka((posting3 * 250) / 1e9)} GB ke ±${duaAngka(gbLedger4)} GB.`);
    harus(`Unggahan ${ribu(unggahHari)} per hari × ${m4.fileKB} KB = ${(unggahHari * Number(m4.fileKB)) / 1e6} GB per hari, atau ${gbFile} GB per tahun (Asumsi, dari \`upload\` dan \`fileKB\` di registry).`);
    harus(`Itu ${Math.round(gbFile / gbLedger4)} kali posting ledger (${gbFile} ÷ ${koma(gbLedger4, 2)}) dan ${Math.round(gbFile / gbD1)} kali rumus [[D1]] (${gbFile} ÷ ${koma(gbD1, 2)}).`);
    harus(`Lajunya kecil, ${koma(lamUnggah, 3)} unggahan per detik atau ${Math.round(lamUnggah * Number(m4.fileKB))} KB per detik di puncak.`);
    expect(hal230).toContain("137 byte per posting (batas bawah)");
  });
  test("Paham 7: yang tidak dijawab estimasi, dengan ADR 21, tim 10 sampai 15 dari naskah, dan klaim SRE", () => {
    harus("ADR 21 ([[t2-adr-21]]) menjadwalkan satu load test, dan load test itu Tidak dijalankan di repo ini, jadi");
    expect(hal231).toContain("satu load test mengukur kapasitas api-t2");
    expect(hal38).toContain("load test ADR 21 Tidak dijalankan");
    expect(hitungKali(badan, "Tidak dijalankan")).toBe(1);
    harus(`${koma(h4.puncak, 1)} tidak dibandingkan dengan kapasitas apa pun.`);
    harus("Tim naik dari 4 menjadi 10 sampai 15 orang dalam tiga tim (Asumsi naskah).");
    expect(naskah3).toContain("Tim naik dari 4 menjadi 10 sampai 15 orang dalam tiga tim.");
    expect(m3.tim).toBe("4 developer");
  });
  test("Putuskan dan Kunci: angka di tabel trade-off, aturan, jawaban, dan daftar periksa", () => {
    harus(`${koma(h4.puncak, 1)} request per detik terlihat aman, padahal koneksi tertahan bisa ${koma(lamTopTulis * 30, 1)} bila gateway menggantung 30 detik`);
    harus(`pengumuman ke ${ribu(100_000)} HP sekaligus ([[t3-m27]])`);
    harus(`Hasil kalinya ${a4.user / a3.user} × (${a4.aktif} ÷ ${a3.aktif}) × (${a4.req} ÷ ${a3.req}) = ${Math.round(h4.puncak / h3.puncak)}, jadi puncak naik dari ${koma(h3.puncak, 1)} ke ${koma(h4.puncak, 1)} request per detik.`);
    harus(`Notifikasi uang naik ${koma(notif4Tulis / dibaca(koma(lamTrx3, 3)), 1)} kali, bukan ${Math.round(h4.puncak / h3.puncak)} kali, karena top-up dari bank ikut ditambahkan: ${koma(lamTrx4, 2)} + ${koma(lamTop, 3)} = ${koma(notif4, 2)} per detik. Dibagi kapasitas ${koma(KAP, 2)} per detik, hasilnya ${Math.round(pakai4 * 100)}%. Tahap 3 menghitung bayar dan transfer saja: ${koma(lamTrx3, 3)} ÷ ${koma(KAP, 2)} = ${koma(pakai3 * 100, 1)}%.`);
    harus(`Pool penuh pada ${INST_BAYAR * POOL_BAYAR} ÷ ${koma(lamTopTulis, 3)} = ${koma((INST_BAYAR * POOL_BAYAR) / lamTopTulis, 1)} detik bila gateway tidak pernah menjawab dan client terus menunggu. Dengan W 30 detik, L = ${koma(lamTopTulis, 3)} × 30 = ${koma(lamTopTulis * 30, 1)} koneksi.`);
    harus(`dengan timeout ${TIMEOUT} detik, L hanya ${koma(lamTopTulis * TIMEOUT, 2)}.`);
    harus(`Bukan. Lajunya hanya ${koma(lamUnggah, 3)} unggahan per detik di puncak, atau ${Math.round(lamUnggah * Number(m4.fileKB))} KB per detik. Yang berubah adalah ukuran: ${gbFile} ÷ ${koma(gbLedger4, 2)} = ${Math.round(gbFile / gbLedger4)} kali posting.`);
    harus(`File hasil verifikasi identitas mencapai ${gbFile} GB per tahun, sedangkan posting ${koma(gbLedger4, 2)} GB.`);
    harus(`Gateway bank dipanggil ${koma(lamTopTulis, 3)} kali per detik, dan koneksi dipegang sampai ia menjawab. Berapa detik gateway menggantung sampai pool ${INST_BAYAR * POOL_BAYAR} penuh`);
  });
  test("klaim 'tidak ada' berlingkup: kata rekaman, ukur, dan Rekaman lab hanya di kalimat yang boleh memakainya", () => {
    const hitungRegex = (re: RegExp): number => (badan.match(re) ?? []).length;
    expect(hitungRegex(/rekaman/gi)).toBe(6);
    expect(hitungKali(badan, "Rekaman lab")).toBe(3);
    for (const konteks of [
      "[Rekaman lab](/cara-pakai/#label-sumber) t3-outbox mengukurnya",
      "| Ekstrapolasi rekaman lab |",
      "| Asumsi dari Rekaman lab |",
      "Angka itu diganti rekaman sesudah integrasinya dibangun.",
      "Tulis semuanya sebagai Asumsi sampai ada rekaman.",
      "label Asumsi atau Rekaman lab untuk setiap angka.",
    ]) expect(badan, konteks).toContain(konteks);
    expect(hitungRegex(/mengukur|terukur|diukur|pengukuran/gi)).toBe(5);
    for (const konteks of [
      "mengukurnya antara 12 dan 13,33",
      "dengan W 20 ms (Asumsi, belum diukur)",
      "belum pernah diukur di server sungguhan",
      "Semua angka di tabel ini adalah Asumsi naskah, bukan pengukuran.",
      "load test itu Tidak dijalankan di repo ini",
    ]) expect(badan, konteks).toContain(konteks);
    // tanpa lab: tidak ada Snippet dan tidak ada rujukan ke labs/
    expect(badan).not.toMatch(/<Snippet|labs\//);
    expect(dari("t3-estimasi").lab).toBeUndefined();
  });
  test("atribusi: klaim SRE, Little, dan PostgreSQL cocok dengan baris RISET yang dibuka ke sumbernya", () => {
    const baris = (teks: string, id: string) => teks.split("\n").find((b) => b.startsWith(`| ${id} |`))!;
    harus('Panduan SRE Google menulis bahwa memodelkan kapasitas sebagai "queries per second" sering menjadi metrik yang buruk, karena biaya tiap query berbeda dan berubah.');
    const sre = baris(riset3, "R3-240");
    expect(sre).toContain("sre.google/sre-book/handling-overload/");
    expect(sre).toContain("teks HTML dibuka 2026-10-27 dengan curl");
    expect(sre).toContain('"The Pitfalls of Queries per Second"');
    const sel = sre.split("|").map((x) => x.trim());
    expect(sel[3], "kolom sumber").toContain('memodelkan kapasitas sebagai "queries per second" sering menjadi metrik yang buruk, karena biaya tiap query berbeda dan berubah, dan bahwa kapasitas lebih baik diukur langsung dalam sumber daya seperti core CPU dan memori');
    expect(sel[4], "kolom yang dipakai halaman").toContain('memodelkan kapasitas sebagai "queries per second" sering menjadi metrik yang buruk, karena biaya tiap query berbeda dan berubah');
    expect(sre).toContain("R2-208 (dibuka 2026-10-25)");
    expect(baris(riset2, "R2-208")).toContain("QPS ukuran kapasitas yang lemah");
    expect([...riset3.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => m[1]).filter((x) => x === "R3-240")).toHaveLength(1);
    const semua = [...riset3.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(semua).size, "ID riset ganda").toBe(semua.length);
    harus("- [Little 1961, Operations Research 9(3): A Proof for the Queuing Formula L = λW](https://doi.org/10.1287/opre.9.3.383)");
    expect(baris(riset2, "R2-35")).toContain("10.1287/opre.9.3.383");
    expect(baris(riset2, "R2-205")).toContain("Operations Research 9(3):383–387, 1961");
    harus('- [Google SRE book: Handling Overload](https://sre.google/sre-book/handling-overload/), bagian "The Pitfalls of Queries per Second"');
    harus("- [PostgreSQL 18: Connection Settings](https://www.postgresql.org/docs/18/runtime-config-connection.html)");
    expect(baris(riset2, "R2-207")).toContain("runtime-config-connection");
    expect(baris(riset2, "R2-207")).toContain("PostgreSQL 18.6");
    expect(baris(riset3, "R3-07")).toContain("superuser_reserved_connections 3");
  });
  test("tidak ada ID internal, dan teks bahasa Inggris istilah konsisten", () => {
    for (const teks of [badan, JSON.stringify(diagramMentah), JSON.stringify(widgetMentah)]) {
      expect(teks).not.toMatch(POLA_ID_INTERNAL);
      expect(teks).not.toMatch(/\bR\d-\d+\b/);
    }
  });
});

describe("kartu Cek diri di kartu.json sama dengan teks halaman", () => {
  const k = kartu.filter((x) => x.halaman === "t3-estimasi");
  test("empat kartu dengan judul, url, tanya, dan jawab dari halaman", () => {
    expect(k.map((x) => x.id)).toEqual(["t3-estimasi-1", "t3-estimasi-2", "t3-estimasi-3", "t3-estimasi-4"]);
    for (const x of k) {
      expect(x.judul).toBe("3.29 Estimasi Tahap 3 → 4");
      expect(x.url).toBe("tahap-3/estimasi/");
      expect(badan, `tanya ${x.id}`).toContain(x.tanya);
      expect(badan, `jawab ${x.id}`).toContain(x.jawab);
    }
    const nomor = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].filter((m) => k.some((x) => x.tanya === m[2]));
    expect(nomor.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
  });
  test("tiap jawaban memuat angka yang dihitung ulang dari registry dan naskah", () => {
    expect(k[0]!.jawab).toContain(`${koma(h3.puncak, 1)} ke ${koma(h4.puncak, 1)} request per detik`);
    expect(k[1]!.jawab).toContain(`${koma(notif4, 2)} per detik`);
    expect(k[2]!.jawab).toContain(`${koma((INST_BAYAR * POOL_BAYAR) / lamTopTulis, 1)} detik`);
    expect(k[3]!.jawab).toContain(`${Math.round(gbFile / gbLedger4)} kali posting`);
  });
});

describe("diagram Rantai t3-estimasi-inti.json", () => {
  test("simpul baris 1: puncak Tahap 3 dan 4, dan kenaikannya", () => {
    const [s3, s4] = diagram.baris[0]!.simpul;
    expect(s3!.teks).toBe(`Tahap 3: ${koma(h3.puncak, 1)}`);
    expect(s4!.teks).toBe(`Tahap 4: ${koma(h4.puncak, 1)}`);
    expect(s4!.sub).toBe(`naik ${Math.round(h4.puncak / h3.puncak)} kali`);
  });
  test("simpul baris 2: koneksi, worker, file, dan pembandingnya", () => {
    const [kon, wor, fil] = diagram.baris[1]!.simpul;
    const k4 = INST * POOL + INST_BAYAR * POOL_BAYAR + WORKER_DB + ADMIN + CADANGAN;
    const k3 = INST * POOL + WORKER_DB + ADMIN + CADANGAN;
    expect(kon!.teks).toBe(`Koneksi: ${k4} dari ${MAX_KONEKSI}`);
    expect(kon!.sub).toBe(`Tahap 3: ${k3} dari ${MAX_KONEKSI}`);
    expect(wor!.teks).toBe(`Worker: ${Math.round(pakai4 * 100)}% terpakai`);
    expect(wor!.sub).toBe(`Tahap 3: ${koma(pakai3 * 100, 1)}%`);
    expect(fil!.teks).toBe(`File: ${gbFile} GB per tahun`);
    expect(fil!.sub).toBe(`posting: ${koma(gbLedger4, 2)} GB`);
    expect(diagram.baris.flatMap((b) => b.simpul).map((s) => s.teks).join(" ")).not.toMatch(/\bB\d/);
    expect(diagram.judul.length).toBeLessThanOrEqual(47);
  });
  test("sumber diagram jujur: Asumsi, dan nada simpul masalah hanya di file", () => {
    expect(diagram.sumber.jenis).toBe("asumsi");
    expect(diagram.sumber.teks).toBe("Asumsi naskah, bukan pengukuran");
    expect(diagram.baris[1]!.simpul.map((s) => s.nada)).toEqual(["good", "system", "warn"]);
  });
});

describe("widget kalkulator t3-estimasi-kalkulator.json", () => {
  const daftar = siapkan(data, registry);
  test("empat skenario: Tahap 3, Tahap 4, Aktif 25%, Satu jam", () => {
    expect(data.skenario.map((s) => s.label)).toEqual(["Tahap 3", "Tahap 4", "Aktif 25%", "Satu jam"]);
    expect(daftar[0]).toEqual(a3);
    expect(daftar[1]).toEqual(a4);
    expect(daftar[2]).toEqual({ ...a4, aktif: 25 });
    expect(daftar[3]).toEqual({ ...a4, puncak: DETIK / 3600 });
    expect(data.awal).toBe(0);
  });
  test("tebakan: jawabannya 8 kali, dibuka skenario Tahap 4, dengan alasan dari pengali", () => {
    const t = data.tebak;
    expect(t.pilihan[t.jawaban]).toBe(`${Math.round(h4.puncak / h3.puncak)} kali`);
    expect(data.skenario[t.skenario]!.tahap).toBe(4);
    expect(data.skenario[t.skenario]!.ubah).toBeUndefined();
    expect(t.q).toBe(`Tahap 4 punya ${ribu(a4.user)} user, sepuluh kali Tahap 3. Berapa kali lipat puncak request per detiknya?`);
    expect(t.alasan).toBe(`User naik ${a4.user / a3.user} kali, user aktif turun dari ${a3.aktif}% ke ${a4.aktif}% (${koma(a4.aktif / a3.aktif, 1)} kali), dan request per user tetap ${a4.req} (${a4.req / a3.req} kali). Hasil kalinya ${Math.round(h4.puncak / h3.puncak)}, jadi puncak naik dari ${koma(h3.puncak, 1)} ke ${koma(h4.puncak, 1)} request per detik.`);
  });
  test("posisi dan bentuk pilihan: jawaban bukan yang pertama, bukan yang terpanjang, dan semua pilihan berbentuk angka + kali", () => {
    const t = data.tebak;
    expect(t.jawaban).toBeGreaterThan(0);
    expect(t.jawaban).toBeLessThan(t.pilihan.length - 1);
    const panjang = t.pilihan.map((p) => p.length);
    expect(panjang[t.jawaban]).toBeLessThan(Math.max(...panjang));
    for (const p of t.pilihan) expect(p).toMatch(/^[\d,]+ kali$/);
    expect(new Set(t.pilihan).size).toBe(t.pilihan.length);
    // jawaban tidak sama posisinya dengan tebakan kalkulator Tahap 1 dan 2
    for (const f of ["t1-estimasi-kalkulator", "t1-m8-kalkulator", "t2-estimasi-kalkulator"]) {
      const lain = JSON.parse(baca(`situs/data/widget/${f}.json`)) as { tebak: { jawaban: number } };
      expect(lain.tebak.jawaban, f).not.toBe(t.jawaban);
    }
  });
  test("label widget dan sumber: Asumsi, kesimpulan memuat jarak antar request", () => {
    expect(data.sumber.jenis).toBe("asumsi");
    expect(data.sumber.teks).toBe("Asumsi naskah dari cerita.json, bukan pengukuran.");
    expect(data.label.sumber).toBe("Asumsi");
    expect(data.label.kesimpulan).toContain("{jarak}");
    expect(data.label.lanjut).toBe("Sekarang pilih “Tahap 4” di atas tabel.");
    expect(data.judul).toBe("Puncak beban Tahap 3 dan Tahap 4");
    expect(data.id).toBe("t3-estimasi-kalkulator");
    harus("<Kalkulator client:visible data={dataKalkulator} asumsi={cerita.tahap.map((t) => t.asumsi)} />");
    harus('import dataKalkulator from "../../../../data/widget/t3-estimasi-kalkulator.json";');
    harus('import intiDiagram from "../../../../data/diagram/t3-estimasi-inti.json";');
  });
});
