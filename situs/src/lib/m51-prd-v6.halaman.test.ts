// Penjaga halaman 5.29 (keputusan 1612 sampai 1614): angka, label sumber, rentang Snippet, klaim negatif berlingkup, tautan,
// diagram Rantai, widget kalkulator, kartu Cek diri, dan baris riset di m51-prd-v6.mdx diturunkan dari registry (asumsi Tahap 5),
// naskah Tahap 5 (bagian 3, baris M51, peta halaman), rekaman labs/api-t5 (beban.txt bagian A), kode lab (cmd/beban, run.py),
// README lab, halaman tetangga (5.1, 5.9, 5.13, 5.30, 4.28), PROPOSAL, dan mesin widget kalkulator, bukan dari daftar yang ditulis
// sendiri. Halaman ini TANPA LAB SENDIRI: setiap angka berlabel Asumsi, Hitungan, Ilustrasi, Penalaran, atau Tidak dijalankan,
// dan rekaman hanya memberi batas di satu laptop. Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan
// dengan halaman, dan kalimat klaim ditulis di sini dengan angka hasil hitungan; (2) kata-kata halaman dikunci per baris lewat
// m51-prd-v6.halaman.nilai.ts. Kalimat terkunci tidak menangkap SALAHNYA kalimat, jadi klaim yang diucapkan (campuran beban,
// batas p95, koneksi, replica, pgbench, lingkup lab) dibaca dari berkas yang memerankannya. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-m51-batas.json";
import { DataKalkulator, DaftarAsumsi } from "../widgets/kalkulator/skema";
import { duaAngka, hitung as hitungBeban, jarak as jarakKal, siapkan } from "../widgets/kalkulator/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { bersihkanRujukanInternal } from "./rujukan-internal";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./m51-prd-v6.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-5/m51-prd-v6.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim() && !/^<Snippet (file|files)=/.test(b));
const beban = baca("labs/api-t5/output/beban.txt");
const naskah = baca("plan/CERITA-TAHAP-5.md");
const proposal = baca("plan/PROPOSAL.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const risetT4 = baca("plan/RISET-TAHAP-4.md");
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const runPy = baca("labs/api-t5/run.py");
const bebanGo = baca("labs/api-t5/cmd/beban/main.go");
const readmeT5 = baca("labs/api-t5/README.md");
const readmeReplika = baca("labs/t5-replika/README.md");
const readmeGabung = baca("labs/t5-gabung/README.md");
const latensi = baca("labs/t5-gabung/output/latensi.txt");
const hal51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal59 = baca("situs/src/content/docs/tahap-5/rpo-rto-failover.mdx");
const hal513 = baca("situs/src/content/docs/tahap-5/modul-ke-service.mdx");
const hal530 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const hal428 = baca("situs/src/content/docs/tahap-4/estimasi.mdx");
const diagram = DataRantai.parse(diagramMentah);
const kalkMentah = JSON.parse(baca("situs/data/widget/t5-m51-kalkulator.json")) as unknown;
const kalk = DataKalkulator.parse(kalkMentah);

interface H { id: string; judul: string; path?: string; topik?: string; label?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; masalah?: string; bagian?: number }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const sekali = (kalimat: string) => expect(hitung(badan, kalimat), `harus tepat satu kali: ${kalimat}`).toBe(1);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
function hitung(teks: string, sub: string): number {
  return teks.split(sub).length - 1;
}
// Pembulatan setengah ke atas seperti pembaca (bukan toFixed), lalu titik ribuan dan koma desimal.
const bulat = (n: number, d: number): number => {
  const f = 10 ** d;
  return Math.round(n * f + 1e-7) / f;
};
const angka = (n: number, d: number): string => {
  const [b, p] = bulat(n, d).toFixed(d).split(".");
  return b!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (p ? "," + p : "");
};
const baris = (teks: string) => {
  const b = teks.replace(/\n+$/, "").split("\n");
  const nomor = (ok: (x: string) => boolean, dariNomor = 1): number => {
    const i = b.findIndex((x, n) => n + 1 >= dariNomor && ok(x));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1;
  };
  return { b, nomor, antara: (a: number, z: number) => b.slice(a - 1, z).join("\n") };
};
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const barisNaskah = (awal: string): string => naskah.split("\n").find((b) => b.startsWith(awal)) ?? "";

// ---- nilai dari registry, naskah, dan rumus ------------------------------------------------------------------------------
type Reg = { user: number; aktif: number; req: number; puncak: number; trx: number };
const DETIK = 86400;
const reg5 = cerita.tahap[4]!.asumsi as Reg;
const M51 = barisNaskah("| M51 |");
const USER6 = Number(cocok(M51, /PRD v6: (\d+) juta user/)[1]) * 1e6;
const TRX_DASAR = Number(cocok(naskah, /\| Transaksi uang \(bayar, transfer, QR\) \| aktif × trx ÷ 86\.400 × puncak \| 200\.000 × (\d+) = /)[1]);
const TOPUP = Number(cocok(naskah, /\| Top-up dari bank \| aktif × ([\d,]+) ÷ 86\.400 × puncak/)[1]!.replace(",", "."));
const TRX_REG = reg5.trx;
const T5 = hitungBeban({ user: reg5.user, aktif: reg5.aktif, req: reg5.req, puncak: reg5.puncak });
const T6 = hitungBeban({ user: USER6, aktif: reg5.aktif, req: reg5.req, puncak: reg5.puncak });
const trxDetik = (h: { dau: number }, trx: number) => ((h.dau * trx) / DETIK) * reg5.puncak;
const notifDetik = (h: { dau: number }, trx: number) => ((h.dau * (trx + TOPUP)) / DETIK) * reg5.puncak;
const posting = (h: { dau: number }, trx: number) => h.dau * trx * 2 * 365;
const aktif10 = hitungBeban({ user: USER6, aktif: 10, req: reg5.req, puncak: reg5.puncak });
const satuJam = hitungBeban({ user: USER6, aktif: reg5.aktif, req: reg5.req, puncak: 24 });
const SATUAN = { detik: "detik", ms: "ms" };

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined; lang: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return { berkas: atribut("file") ?? "", lines: atribut("lines"), judul: atribut("title"), lang: atribut("lang") };
  });

// ---- rekaman api-t5 beban.txt bagian A ---------------------------------------------------------------------------------
const B = baris(beban);
const awalA = B.nomor((x) => x.startsWith("# --- A. "));
const awalSnip = B.nomor((x) => x.startsWith("$ ./beban -rps"));
const akhirSnip = B.nomor((x) => x.startsWith("permintaan yang pernah menunggu koneksi dari pool"));
const bagA = B.antara(awalA, akhirSnip);
const [, RPS_TXT, LAMA_TXT, PENGGUNA_TXT] = cocok(bagA, /\$ \.\/beban -rps ([\d.]+) -detik (\d+) -pengguna (\d+)/);
const RPS = Number(RPS_TXT);
const LAMA = Number(LAMA_TXT);
const PENGGUNA = Number(PENGGUNA_TXT);
const TOTAL = Math.floor(RPS * LAMA);
const [, BACA_TXT, BAYAR_TXT] = cocok(bagA, /status: 200 x(\d+), 201 x(\d+)\s+# 200 = baca, 201 = bayar/);
const BACA = Number(BACA_TXT);
const BAYAR = Number(BAYAR_TXT);
const BATAS_P95 = Number(cocok(bagA, /p95 di bawah (\d+) ms \(batas lab, Asumsi; nilai ukur tidak direkam\): ya/)[1]);
const KONEKSI_MAKS = Number(cocok(bagA, /paling banyak <= (\d+) \(pool 10 ditambah/)[1]);

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (/^<Snippet (file|files)=/.test(b) ? "S" : b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai dan kalkulator sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kalkulator"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t5-m51-batas.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(kalkMentah)).toEqual(NILAI_JSON.kalkulator);
  });
});

describe("registry, naskah, blok, dan tautan", () => {
  const r = dari("t5-m51");
  test("entri registry dan baris peta naskah cocok; lab api-t5 tanpa lab sendiri; satu halaman bernomor 5.29", () => {
    expect(r).toMatchObject({ ada: true, nomor: "5.29", jenis: "masalah", inti: true, prasyarat: ["t5-onprem", "t4-estimasi"], tahap: 5, peran: ["backend"], topik: "Desain sistem", bagian: 4, lab: ["api-t5"] });
    expect(r.path).toBe("tahap-5/m51-prd-v6.md");
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(r.path!, ".md"));
    expect(naskah).toContain("| 5.29 | 4 | M51: Uji coba nasional lolos, PRD v6 datang, dan estimasi Tahap 5 → 6 | Masalah + Konsep | ★ | api-t5 | kalkulator |");
    const minggu = cocok(M51, /\| M51 \| (\d+) \|/)[1]!;
    expect(r.label).toBe(`Masalah 51 · minggu ${minggu}`);
    harus(`Minggu ${minggu} Tahap 5. Uji coba nasional berjalan dengan ${angka(reg5.user, 0)} user terdaftar.`);
    expect(r.judul).toBe("M51: Uji coba nasional lolos, PRD v6 datang, dan estimasi Tahap 5 → 6");
    expect(frontmatter).toContain('title: "5.29 M51: Uji coba nasional lolos, PRD v6 datang, dan estimasi Tahap 5 → 6"');
    expect(hal.filter((h) => h.nomor === "5.29").map((h) => h.id)).toEqual(["t5-m51"]);
    expect(dari("t5-onprem")).toMatchObject({ nomor: "5.28", adr: [59] });
    expect(dari("t5-adr-60")).toMatchObject({ nomor: "5.30", adr: [60], prasyarat: ["t5-m51"] });
    expect(dari("t5-rekap").nomor).toBe("5.31");
    expect(dari("t5-jembatan").nomor).toBe("5.32");
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-onprem\]\], \[\[t4-estimasi\]\] · Jalur inti<\/p>/);
    expect(r.menit).toBe(Number(m[1]) + Number(m[2]));
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
    expect(Number(m[1]), "satu halaman dua topik: lebih dari 15 menit baca dipecah dengan keputusan pemilik").toBeLessThanOrEqual(15);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan, nomor, judul, dan jumlah pemakaian diturunkan dari registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t4-estimasi", "t4-modul", "t4-rekonsiliasi", "t5-adr-60", "t5-jembatan", "t5-mtls", "t5-onprem", "t5-prd", "t5-rpo-rto", "t5-service"]);
    const sesuai: [string, string, string][] = [
      ["t4-estimasi", "4.28", "Estimasi Tahap 4"], ["t4-modul", "4.13", "Modular monolith"], ["t4-rekonsiliasi", "4.9", "Rekonsiliasi"],
      ["t5-adr-60", "5.30", "ADR 60"], ["t5-jembatan", "5.32", "Jembatan"], ["t5-mtls", "5.19", "Keamanan 10"], ["t5-onprem", "5.28", "On-prem lawan cloud"],
      ["t5-prd", "5.1", "PRD v5"], ["t5-rpo-rto", "5.9", "RPO, RTO"], ["t5-service", "5.13", "Dari modul ke service"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
    }
    for (const [, nomor, awalJudul] of sesuai.filter(([i]) => i.startsWith("t5-"))) {
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+ \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    for (const [idh, n] of [["t5-adr-60", 3], ["t5-service", 3], ["t5-rpo-rto", 3], ["t5-prd", 4], ["t4-estimasi", 3], ["t5-jembatan", 2], ["t4-modul", 1], ["t4-rekonsiliasi", 1], ["t5-mtls", 1], ["t5-onprem", 1], ["A0", 1]] as [string, number][]) {
      expect(hitung(badan, `[[${idh}]]`), idh).toBe(n);
    }
  });
  test("janji halaman lain ditepati: 5.30 menulis 694,4 dan 69,44 dari halaman ini, 5.13 menulis target uji coba, 5.32 memuat pratinjau, 4.28 menulis rumus", () => {
    expect(hal530).toContain("Minggu 16, uji coba nasional lolos, lalu Sinta datang dengan PRD v6 ([[t5-m51]]).");
    expect(hal530).toContain("Beban PRD v6 adalah 10 kali beban Tahap 5: 69,4 × 10 = 694 per detik, atau 694,4 dari nilai tepat 69,44 ([[t5-m51]]).");
    expect(hal530).toContain("Alasannya user naik dari 1 juta ke 10 juta, dan masukan lain dianggap sama (Asumsi).");
    expect(hal513).toContain("Target uji coba nasional: Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut (Asumsi, [[t5-m51]]).");
    expect(dari("t5-jembatan").judul).toBe("Jembatan: pratinjau PRD v6");
    expect(dari("t5-jembatan").masalah).toContain("pecah lebih dulu");
    expect(naskah).toContain("Pembaca diminta menebak: dari ADR Tahap 5, mana yang pecah lebih dulu?");
    harus("Pratinjaunya ada di [[t5-jembatan]].");
    harus("- [[t5-jembatan]]: pratinjau PRD v6, dengan tebakan keputusan Tahap 5 mana yang pecah lebih dulu.");
    expect(dari("t4-estimasi").judul).toBe("Estimasi Tahap 4 → 5");
    expect(hal428).toContain("| Puncak request per detik | 138,9 | 1.388,9 | 200.000 × 60 ÷ 86.400 × 10 |");
    expect(dari("t4-rekonsiliasi").judul).toContain("Rekonsiliasi dengan gateway");
    expect(naskah).toContain("Halaman 5.29 menghitung beban Tahap 6 sebagai Hitungan atas Asumsi dan tidak memilih komponen.");
    expect(naskah).toContain("| Estimasi | Masalah Tahap 5 adalah salinan yang tertinggal dan pekerjaan yang diulang, bukan kapasitas; kapasitas satu primary belum terukur | M51 |");
    harus("Masalah Tahap 5 adalah salinan yang tertinggal dan pekerjaan yang diulang, bukan jumlah request per detik. Kapasitas satu primary belum terukur.");
  });
  test("halaman tidak membuka isi Tahap 6 atau halaman 5.31 dan 5.32: tidak ada Tahap 6 selain judul estimasi; ADR yang disebut hanya 37, 46 sampai 59, dan 60", () => {
    expect(new Set([...badan.matchAll(/Tahap \d+(?: → \d+)?/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 5", "Tahap 6", "Tahap 4 → 5", "Tahap 5 → 6"]));
    expect(hitung(badan, "Tahap 5 → 6")).toBe(1);
    expect(hitung(badan, "Tahap 4 → 5")).toBe(1);
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["37", "46", "48", "53", "60"]));
    harus("ADR 46 sampai 59 sudah mengubah komponennya");
    expect(dari("t5-service").adr).toEqual([50]);
    expect(dari("t5-rpo-rto").adr).toEqual([48]);
    expect(dari("t5-mtls").adr).toEqual([53]);
    expect(dari("t5-adr-60").adr).toEqual([60]);
    expect(dari("t4-modul").adr).toEqual([37]);
  });
});

describe("naskah M51 dan gejala: lingkup PRD v6, dugaan, dan target yang bukan rekaman", () => {
  test("blok Gejala: adegan empat paragraf tanpa kalimat definisi; tiga catatan diawali tanda bintang atau Arti label (pemindai W3 di tools/eval_tahap.py)", () => {
    const gejala = badan.split('<Blok nama="Gejala" buka>')[1]!.split("</Blok>")[0]!;
    const paragraf = gejala.trim().split("\n\n").map((x) => x.trim()).filter(Boolean);
    const catatan = paragraf.filter((x) => /^(\*|Arti label)/.test(x));
    const adegan = paragraf.filter((x) => !/^(\*|Arti label)/.test(x));
    expect(adegan).toHaveLength(4);
    expect(catatan).toHaveLength(3);
    expect(catatan[0]!.startsWith("*Angka cerita (Ilustrasi):*")).toBe(true);
    expect(catatan[1]!.startsWith("*Catatan:* Isi PRD v6 juga dari naskah (Ilustrasi)")).toBe(true);
    expect(catatan[2]!.startsWith("Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].")).toBe(true);
    expect(baca("tools/eval_tahap.py")).toContain('DEFINISI = re.compile(r"\\b(adalah|yaitu|disebut|artinya|berarti|maksudnya|merupakan)\\b")');
    expect(adegan.join(" ")).not.toMatch(/\b(adalah|yaitu|disebut|artinya|berarti|maksudnya|merupakan)\b/);
  });
  test("baris M51: minggu 16, gejala berlabel target dan Ilustrasi, dugaan, hasil Hitungan atas Asumsi, tiga hal belum diuji, ADR 60", () => {
    expect(M51).toContain("| 16 | Uji coba nasional lolos: 1.000.000 user terdaftar, dan rekonsiliasi harian selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut (target, Asumsi).");
    expect(M51).toContain("(Ilustrasi). | Perlu multi-region dan service mesh sekarang |");
    expect(M51).toContain(`Dikali 10 dari Tahap 5: puncak ${angka(T6.puncak, 1)} request per detik, ${angka(trxDetik(T6, TRX_DASAR), 1)} transaksi uang per detik, ${angka(notifDetik(T6, TRX_DASAR), 1)} notifikasi uang per detik, dan \`posting\` ${angka(posting(T6, TRX_DASAR) / 1e9, 2)} miliar per tahun (Hitungan atas Asumsi).`);
    expect(M51).toContain("Kapasitas satu primary untuk 69,4 transaksi uang per detik belum pernah diukur, jadi 694,4 lebih belum bisa dinilai. Tiga hal belum pernah diuji: skor risiko yang butuh data banyak dalam 50 ms, data di dua wilayah, dan 28 orang menjadi lebih dari 50");
    expect(M51).toContain("| Estimasi Tahap 5 → 6; **Tim 5** retrospektif |");
    expect(naskah).toContain("- M51: PRD v6, bukan fitur v5.");
    harus("Hitungan di halaman ini berarti hasil rumus yang ditulis di sebelahnya, dan labelnya mengikuti masukan terlemahnya.");
    expect(cara).toContain("Label sumber");
  });
  test("empat butir PRD v6 di gejala: urutan dari baris M51; target 14 hari dan Rp0 berlabel Asumsi dan Ilustrasi; PT fiktif; tanpa klaim izin atau regulasi", () => {
    const butir = cocok(M51, /Sinta datang dengan PRD v6: ([^(]+)\(Ilustrasi\)/)[1]!.trim().split(", ");
    expect(butir).toEqual(["10 juta user", "multi-region", "skor risiko real-time", "platform untuk lebih dari 50 developer"]);
    harus(`Lalu Sinta membagikan PRD v6. Isinya ${butir.slice(0, 3).join(", ")}, dan ${butir[3]}.`);
    harus("minggu 16, 1.000.000 user terdaftar, 14 hari berturut-turut, dan selisih Rp0 atau insiden tertutup dalam satu hari kerja berasal dari naskah. Naskah menulisnya sebagai target (Asumsi)");
    expect(reg5.user).toBe(1000000);
    expect(cocok(M51, /selama (\d+) hari berturut-turut/)[1]).toBe("14");
    harus("hari ke-14 berturut-turut");
    harus("PT Rekeningo adalah perusahaan fiktif, dan halaman ini tidak menyebut izin atau regulasi apa pun.");
    expect(badan).not.toMatch(/uang elektronik|\bizin\b(?! atau regulasi apa pun)|OJK|Bank Indonesia|lisensi/i);
    harus("Isi PRD v6 juga dari naskah (Ilustrasi), dan PRD v6 belum ada di repo.");
    harus('"Apa yang harus diganti sebelum PRD v6 dikerjakan?" tanya Sinta.');
    harus("Pertanyaan Sinta ditambahkan halaman ini.");
  });
  test("tokoh: naskah tidak menyebut siapa mengusulkan apa di baris M51; sifat Nadia dan Bayu dari naskah; halaman menulis skenario berlabel Ilustrasi", () => {
    expect(M51).not.toMatch(/Raka|Nadia|Bayu/);
    expect(naskah).toContain("- **Nadia** memimpin tim Pembayaran dan masih cenderung mengusulkan solusi yang terlalu berat, kali ini event streaming untuk semua hal.");
    expect(naskah).toContain("- **Bayu** memimpin tim Platform dan masih menganggap bawaan komponen aman, kali ini bawaan Kubernetes dan pooler.");
    harus("*Skenario (Ilustrasi):* siapa mengusulkan apa ditulis halaman ini. Naskah hanya menulis dugaannya, yaitu perlu multi-region dan service mesh sekarang.");
    harus("Bayu mengusulkan service mesh sekarang, yaitu lapisan proxy yang mengurus keamanan dan lalu lintas antar service.");
    harus("Nadia mengusulkan multi-region sekarang, yaitu menjalankan sistem di lebih dari satu region, wilayah pusat data.");
    harus("Tim membaca daftar PRD v6 dan mengira sistem sekarang tidak akan menampungnya, karena 10 juta user terdengar seperti skala yang menuntut komponen baru.");
    expect(hal530).toContain("Dugaan pertama adalah memasang multi-region dan service mesh sekarang, karena 10 juta user terdengar seperti skala yang menuntutnya.");
  });
  test("tebak dulu: jawabannya tidak ada di teks sebelum details, dan memakai batas yang sama dengan README lab", () => {
    const sebelum = badan.slice(0, badan.indexOf('<details class="question">'));
    expect(sebelum).not.toMatch(/belum (pernah )?(diukur|terukur|mengukur|punya pengukuran|ada pengukuran)|tidak mengukur|bukan kapasitas/);
    expect(sebelum).not.toContain("694,4");
    expect(sebelum).not.toContain("13.888,9");
    const jawab = badan.slice(badan.indexOf('<details class="question">'), badan.indexOf("</details>"));
    expect(jawab).toContain("<summary>Tebak dulu: beban PRD v6 adalah 10 kali beban Tahap 5, dan semua permintaan di rekaman itu selesai tanpa error. Apakah rekaman itu bisa dipakai untuk menilai beban PRD v6?</summary>");
    expect(jawab).toContain(`Belum. Rekaman hanya menunjukkan bahwa satu proses di satu laptop menyelesaikan campuran lab pada ${angka(RPS, 1)} request per detik, bukan ${angka(T6.puncak, 1)}.`);
    expect(jawab).toContain(`Ia tidak mengukur kapasitas satu primary, yaitu database yang menerima semua tulis, jadi ${angka(trxDetik(T6, TRX_DASAR), 1)} transaksi uang per detik di PRD v6 tidak punya angka pembanding.`);
    expect(jawab).toContain("Blok berikutnya memisahkan yang dihitung, yang direkam, dan yang belum diuji.");
    expect(readmeT5).toContain("Ini bukan kapasitas produksi dan bukan kapasitas satu primary.");
    expect(hitung(badan, '<details class="question">')).toBe(1);
    expect(badan.indexOf("kapasitas satu primary")).toBeGreaterThan(badan.indexOf("<summary>Tebak dulu:"));
  });
});

describe("angka beban Tahap 6: dari registry Tahap 5, naskah, dan rumus; semuanya Hitungan atas Asumsi", () => {
  test("registry Tahap 5: 1.000.000 user, 20% aktif, 60 request, faktor 10, trx 2; naskah memakai 3 sebagai dasar; hasil Tahap 5 sama dengan naskah dan 5.1", () => {
    expect([reg5.user, reg5.aktif, reg5.req, reg5.puncak, reg5.trx]).toEqual([1000000, 20, 60, 10, 2]);
    expect(TRX_DASAR).toBe(3);
    expect(TOPUP).toBe(0.25);
    expect(USER6).toBe(10_000_000);
    expect(USER6 / reg5.user).toBe(10);
    expect([T5.dau, T5.reqHari]).toEqual([200000, 12000000]);
    expect([T6.dau, T6.reqHari]).toEqual([2000000, 120000000]);
    expect(angka(T5.puncak, 1)).toBe("1.388,9");
    expect(T6.puncak / T5.puncak).toBeCloseTo(10, 10);
    expect(naskah).toContain("| Request per detik | aktif × request ÷ 86.400 × puncak | 200.000 × 60 = 12 juta per hari | 138,9 rata-rata dan 1.388,9 puncak");
    expect(naskah).toContain(`6,94 rata-rata dan ${angka(trxDetik(T5, TRX_DASAR), 1)} puncak (trx 2: 4,63 dan ${angka(trxDetik(T5, TRX_REG), 1)})`);
    expect(naskah).toContain(`${angka(notifDetik(T5, TRX_DASAR), 1)} per detik puncak = 564% kapasitas`);
    expect(naskah).toContain(`(trx 2: ${angka(notifDetik(T5, TRX_REG), 1)} = 391%)`);
    expect(naskah).toContain(`${angka(posting(T5, TRX_DASAR) / 1e6, 0)} juta`);
    expect(naskah).toContain(`Trx 2: ${angka(posting(T5, TRX_REG) / 1e6, 0)} juta`);
    expect(hal51).toContain(`| Puncak request per detik | ${angka(T5.puncak, 1)} |`);
    expect(hal51).toContain(`| Transaksi uang per detik di puncak | ${angka(trxDetik(T5, TRX_DASAR), 1)} | 600.000 ÷ 86.400 × 10 (asumsi) | ${angka(trxDetik(T5, TRX_REG), 1)} |`);
    expect(hal51).toContain(`| Posting per tahun | ${angka(posting(T5, TRX_DASAR) / 1e6, 0)} juta | 200.000 × 3 transaksi × 2 posting × 365 (asumsi) | ${angka(posting(T5, TRX_REG) / 1e6, 0)} juta |`);
    expect(hal51).toContain(`| Notifikasi uang di puncak | ${angka(notifDetik(T5, TRX_DASAR), 1)} per detik |`);
    expect(hal51).toContain(`dengan 2 transaksi ${angka(notifDetik(T5, TRX_REG), 1)}`);
  });
  test("tabel besaran: tiap sel dihitung dari registry dan rumus; judul kolom dan formula sama dengan hitungan; tiap baris tepat sekali", () => {
    const f = `${angka(USER6, 0)}`;
    const baris6 = [
      "| Besaran di puncak | Tahap 5 | Tahap 6 | Cara hitung Tahap 6 |",
      `| User aktif per hari | ${angka(T5.dau, 0)} | ${angka(T6.dau, 0)} | ${f} × ${reg5.aktif}% |`,
      `| Request per detik | ${angka(T5.puncak, 1)} | ${angka(T6.puncak, 1)} | ${angka(T6.dau, 0)} × ${reg5.req} ÷ ${angka(DETIK, 0)} × ${reg5.puncak} |`,
      `| Transaksi uang per detik | ${angka(trxDetik(T5, TRX_DASAR), 1)} (${angka(trxDetik(T5, TRX_REG), 1)}) | ${angka(trxDetik(T6, TRX_DASAR), 1)} (${angka(trxDetik(T6, TRX_REG), 1)}) | ${angka(T6.dau, 0)} × ${TRX_DASAR} (${TRX_REG}) ÷ ${angka(DETIK, 0)} × ${reg5.puncak} |`,
      `| Notifikasi uang per detik | ${angka(notifDetik(T5, TRX_DASAR), 1)} (${angka(notifDetik(T5, TRX_REG), 1)}) | ${angka(notifDetik(T6, TRX_DASAR), 1)} (${angka(notifDetik(T6, TRX_REG), 1)}) | (${angka(T6.dau, 0)} × ${TRX_DASAR} (${TRX_REG}) + ${angka(T6.dau, 0)} × ${angka(TOPUP, 2)}) ÷ ${angka(DETIK, 0)} × ${reg5.puncak} |`,
      `| Posting per tahun | ${angka(posting(T5, TRX_DASAR) / 1e6, 0)} juta (${angka(posting(T5, TRX_REG) / 1e6, 0)} juta) | ${angka(posting(T6, TRX_DASAR) / 1e9, 2)} miliar (${angka(posting(T6, TRX_REG) / 1e9, 2)} miliar) | ${angka(T6.dau, 0)} × ${TRX_DASAR} (${TRX_REG}) × 2 × 365 |`,
    ];
    for (const b of baris6) sekali(b + "\n");
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(2);
    expect(angka(trxDetik(T6, TRX_DASAR), 1)).toBe("694,4");
    expect(angka(trxDetik(T6, TRX_REG), 1)).toBe("463,0");
    expect(angka(notifDetik(T6, TRX_DASAR), 1)).toBe("752,3");
    expect(angka(notifDetik(T6, TRX_REG), 1)).toBe("520,8");
    expect(angka(posting(T6, TRX_DASAR) / 1e9, 2)).toBe("4,38");
    expect(angka(posting(T6, TRX_REG) / 1e9, 2)).toBe("2,92");
    expect(posting(T5, TRX_DASAR)).toBe(438_000_000);
  });
  test("masukan dan asal angka: Asumsi dari registry; 10.000.000 dari pratinjau PRD v6 (Ilustrasi); dua transaksi angka registry; tabel Tahap 5 di 5.1", () => {
    harus(`Tabel ini mengalikan masukan Tahap 5 dengan 10, karena user naik dari ${angka(reg5.user, 0)} ke ${angka(USER6, 0)} dan masukan lain dianggap tetap.`);
    harus(`Persen aktif ${reg5.aktif}%, ${reg5.req} request per user aktif, dan faktor puncak ${reg5.puncak} (laju jam paling ramai dibanding rata-rata harian) tidak berubah. Angka Tahap 5 berasal dari tabel beban di [[t5-prd]].`);
    harus(`Angka ${angka(USER6, 0)} user berasal dari pratinjau PRD v6 (Ilustrasi), jadi seluruh tabel adalah Hitungan atas Asumsi. Dasar hitungannya ${TRX_DASAR} transaksi uang per user aktif per hari, dan angka dalam kurung memakai ${TRX_REG} transaksi, angka registry Tahap 5 ([[t5-prd]]).`);
    expect(cerita.proyeksi[0]!.user).toBe("10 juta user, 3 negara");
    expect(proposal).toContain("| 6 (proyeksi) | 1jt–10jt | 50+ (10+ tim, platform sebagai produk) |");
    expect(hal51).toContain("Dasar hitungannya 3 transaksi uang per user aktif per hari, seperti Tahap 2 sampai 4.");
  });
  test("pembulatan: 75,2 × 10 = 752 dan 752,3 dari 75,2315; 69,4 × 10 = 694 dan 694,4 dari 69,4444; 46,3 × 10 = 463 dan 463,0 dari 46,2963; bukan toFixed", () => {
    const n5 = notifDetik(T5, TRX_DASAR);
    const u5 = trxDetik(T5, TRX_DASAR);
    const d5 = trxDetik(T5, TRX_REG);
    harus(`Tiap nilai Tahap 6 adalah ${USER6 / reg5.user} kali nilai Tahap 5 yang tertulis, dengan selisih pembulatan. Angka ${angka(n5, 1)} × 10 = ${Math.round(Number(angka(n5, 1).replace(",", ".")) * 10)}, sedangkan dari nilai tepat ${angka(n5, 4)} hasilnya ${angka(notifDetik(T6, TRX_DASAR), 1)}.`);
    harus(`Begitu juga ${angka(u5, 1)} × 10 = ${Math.round(Number(angka(u5, 1).replace(",", ".")) * 10)} menjadi ${angka(trxDetik(T6, TRX_DASAR), 1)} dari ${angka(u5, 4)}, dan ${angka(d5, 1)} × 10 = ${Math.round(Number(angka(d5, 1).replace(",", ".")) * 10)} menjadi ${angka(trxDetik(T6, TRX_REG), 1)} dari ${angka(d5, 4)}.`);
    expect(angka(trxDetik(T6, TRX_REG), 1)).toBe("463,0");
    expect((trxDetik(T6, TRX_REG)).toFixed(1)).toBe("463.0");
    expect(angka(n5, 4)).toBe("75,2315");
    expect(angka(u5, 4)).toBe("69,4444");
    expect(angka(d5, 4)).toBe("46,2963");
    harus(`Angka ${angka(u5, 1)} sudah dibulatkan dari ${angka(u5, 4)}. Dikali 10 hasilnya ${angka(u5 * 10, 3)}, yang ditulis ${angka(trxDetik(T6, TRX_DASAR), 1)} dengan satu desimal.`);
    expect(hal530).toContain("694,4 dari nilai tepat 69,44");
  });
  test("notifikasi uang dan posting: top-up 0,25 per user aktif per hari; dua posting per transaksi; tidak membandingkan dengan batas komponen karena ADR 46 sampai 59", () => {
    harus(`Notifikasi uang adalah transaksi uang ditambah top-up dari bank, ${angka(TOPUP, 2)} per user aktif per hari. Tiap transaksi menulis dua posting, satu di tiap sisi jurnal. Tabel ini tidak membandingkan hasilnya dengan batas komponen Tahap 5. ADR 46 sampai 59 sudah mengubah komponennya, dan perbandingan itu butuh kapasitas satu primary yang belum ada.`);
    expect(readmeT5).toContain("Lab ini tidak menguji kapasitas produksi dan tidak mengklaimnya.");
    expect(naskah).toContain("Kedua, tidak ada hitungan di tabel ini yang menunjukkan primary tidak sanggup 69,4 transaksi uang per detik. Itu belum diukur");
    expect(dari("t5-m40").adr ?? dari("t5-read-replica").adr).toEqual([46]);
    expect(dari("t5-onprem").adr).toEqual([59]);
    expect(hal51).toContain("| Notifikasi uang di puncak | 75,2 per detik | (600.000 + 50.000) ÷ 86.400 × 10; dengan 2 transaksi 52,1 |");
  });
  test("skenario di bawah widget: Tahap 6 13.888,9 (10 kali), aktif 10% 6.944,4 (5 kali), satu jam 33.333,3; pembulatan dua angka penting dari mesin widget", () => {
    harus(`Widget membulatkan ke dua angka penting, jadi puncak ${angka(T5.puncak, 1)} tampil ${duaAngka(T5.puncak)}, ${angka(T6.puncak, 1)} tampil ${duaAngka(T6.puncak)}, dan ${angka(satuJam.puncak, 1)} tampil ${duaAngka(satuJam.puncak)}.`);
    harus(`Pilih **Tahap 6**: user naik ke ${angka(USER6, 0)} dan puncak naik ke ${angka(T6.puncak, 1)}, ${T6.puncak / T5.puncak} kali Tahap 5. Pilih **Aktif 10%** sesudah menebak: widget menulis hasilnya dan alasannya.`);
    harus(`Pilih **Satu jam**: semua request sehari masuk dalam satu jam. Faktor puncaknya ${DETIK / 3600}, dan ${angka(T6.reqHari, 0)} ÷ ${angka(3600, 0)} = ${angka(satuJam.puncak, 1)} request per detik (Hitungan).`);
    expect(aktif10.puncak / T5.puncak).toBeCloseTo(5, 10);
    expect(satuJam.puncak).toBeCloseTo(T6.reqHari / 3600, 10);
    expect([duaAngka(T5.puncak), duaAngka(T6.puncak), duaAngka(aktif10.puncak), duaAngka(satuJam.puncak)]).toEqual(["1.400", "14.000", "6.900", "33.000"]);
    harus("Kalkulator hanya menghitung request per detik. Ia tidak bisa menilai apakah satu primary sanggup.");
  });
});

describe("rekaman api-t5 beban.txt bagian A: batas di satu laptop, bukan kapasitas produksi", () => {
  test("bagian A: jadwal tetap 1.388,9 selama 15 detik = 20.833 permintaan, semua selesai, status 200 dan 201, batas p95, jadwal, koneksi, pool", () => {
    expect(bagA).toContain(`$ ./beban -rps ${RPS} -detik ${LAMA} -pengguna ${PENGGUNA}   # keluaran mesin diperiksa terhadap batas; nilai mentah bergantung mesin dan tidak direkam`);
    expect(RPS).toBe(1388.9);
    expect(angka(RPS, 1)).toBe(angka(T5.puncak, 1));
    expect(TOTAL).toBe(20833);
    expect(bagA).toContain(`permintaan dijadwalkan: ${TOTAL} (= ⌊${RPS} × ${LAMA}⌋)`);
    expect(bagA).toContain(`permintaan selesai: ${TOTAL} dari ${TOTAL}`);
    expect(BACA + BAYAR).toBe(TOTAL);
    expect([BACA, BAYAR]).toEqual([18718, 2115]);
    expect(BATAS_P95).toBe(5000);
    expect(bagA).toContain("jadwal tidak tertinggal lebih dari 100 ms (generator tidak jadi penghambat): ya");
    expect(bagA).toContain("pool setelah beban: maks 10, terbuka paling banyak 10");
    expect(bagA).toContain("permintaan yang pernah menunggu koneksi dari pool (database/sql WaitCount; nilai tidak direkam): lebih dari 0: ya");
    expect(KONEKSI_MAKS).toBe(15);
    expect(PENGGUNA).toBe(200);
    expect(bagA).toContain("koneksi database dari api-t5 (pg_stat_activity, disampel tiap 100 ms): paling banyak <= 15 (pool 10 ditambah koneksi yang baru dibuka atau baru ditutup client dan belum hilang di server; nilai ukur tidak direkam)");
    expect(bebanGo).toContain("time.After(100 * time.Millisecond)");
    expect(beban.split("\n").slice(0, 8).join("\n")).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    expect(beban.split("\n")[1]).toContain("PostgreSQL 17.11");
    expect(beban.split("\n")[1]).toContain("go1.27.3");
    expect(beban.split("\n")[1]).toContain("server Go di 127.0.0.1:");
    harus(`Lab \`api-t5\` menjalankan beban Tahap 5, bukan Tahap 6: ${angka(RPS, 1)} request per detik selama ${LAMA} detik, atau ⌊${angka(RPS, 1)} × ${LAMA}⌋ = ${angka(TOTAL, 0)} permintaan.`);
    harus(`Permintaan ke-i berangkat pada detik i ÷ ${angka(RPS, 1)} tanpa menunggu jawaban sebelumnya.`);
    harus("Server Go dan generator berjalan di satu laptop, dengan satu proses `api-t5` (Go 1.27.3), pool 10 koneksi, dan PostgreSQL 17.11.");
    harus(`Semua ${angka(TOTAL, 0)} selesai tanpa error: ${angka(BACA, 0)} baca (200) dan ${angka(BAYAR, 0)} pembayaran (201). Nilai p95 yang terukur tidak direkam. Rekaman hanya menulis bahwa p95 di bawah ${angka(BATAS_P95, 0)} ms, batas lab (Asumsi). README lab menulis p95 antar run berkisar dari beberapa milidetik sampai sekitar satu detik.`);
    expect(readmeT5).toContain("p95 antar run berkisar dari beberapa ms sampai sekitar satu detik");
    expect(readmeT5).toContain("Rekaman dari database bersih, diulang tiga kali");
    harus("Lab menjadwalkan 1.388,9 request per detik selama 15 detik ke satu proses API di satu laptop.");
  });
  test("tiga hal di rekaman yang bukan bukti kapasitas: koneksi ≤ 15, WaitCount lebih dari 0, jadwal 100 ms; dibaca dari kode run.py", () => {
    const fungsi = runPy.slice(runPy.indexOf("def rekam_beban():"), runPy.indexOf("# ---------- testing.txt"));
    expect(fungsi.length).toBeGreaterThan(500);
    expect(fungsi).toContain(`batas_p95 = ${BATAS_P95}`);
    expect(fungsi).toContain("m['lag_maks_ms'] < 100");
    expect(fungsi).toContain(`m["koneksi_maks"] <= ${KONEKSI_MAKS}`);
    expect(fungsi).toContain('harap(pool["menunggu"] > 0, True,');
    expect(fungsi).toContain("LAMA, RPS = 15, 1388.9");
    expect(fungsi).toContain("mulai_api_t5(");
    expect(fungsi).toContain("m = muat_beban(RPS, LAMA)");
    expect(runPy).toContain('"-rps", str(rps), "-detik", str(detik), "-pengguna", "200"]');
    // tanpa replica: bagian beban dan penyiapannya tidak menyebut replica, standby, atau URL replica
    const penyiapan = [fungsi, runPy.slice(runPy.indexOf("def siapkan_layanan():"), runPy.indexOf("def pemilik(")), runPy.slice(runPy.indexOf("def mulai_api_t5("), runPy.indexOf("def muat_beban("))].join("\n");
    expect(penyiapan).not.toMatch(/replika|replica|standby|REPLIKA/i);
    harus("Tiga hal di rekaman tidak membuktikan kapasitas. Koneksi paling banyak ≤ 15 adalah pool 10 ditambah koneksi yang baru dibuka atau baru ditutup. Ada permintaan yang pernah menunggu koneksi, dan itu hanya berarti pool satu proses pernah penuh. Jadwal yang tidak tertinggal lebih dari 100 ms hanya menunjukkan bahwa generator mengirim tepat waktu.");
    harus(`Databasenya bersih dan tanpa replica (dibaca dari \`run.py\`, Tidak dijalankan), generator memakai ${PENGGUNA} user lab, dan p95 boleh sampai ${angka(BATAS_P95, 0)} ms.`);
    expect(bebanGo).toContain("// memeriksanya terhadap batas dan tidak merekamnya sebagai nilai tunggal. Ini BUKAN uji kapasitas produksi.");
  });
  test("campuran beban dari cmd/beban: 50% saldo, 25% riwayat, 15% katalog, 10% pembayaran; kedatangan tetap tanpa menunggu jawaban; benih tetap", () => {
    expect(bebanGo).toContain("jenis := rng.IntN(100)");
    expect(bebanGo).toContain("case jenis < 50:");
    expect(bebanGo).toContain("case jenis < 75:");
    expect(bebanGo).toContain("case jenis < 90:");
    expect(bebanGo).toMatch(/default:\s+req, _ = http\.NewRequest\("POST", \*url\+"\/transfers",/);
    expect(bebanGo).toContain("mrand.New(mrand.NewPCG(1, 2))");
    expect(bebanGo).toContain("time.Sleep(time.Until(jadwal))");
    const putaran = bebanGo.slice(bebanGo.indexOf("for i := 0; i < total; i++ {"), bebanGo.indexOf("wg.Wait()"));
    expect(putaran.indexOf("time.Sleep(time.Until(jadwal))")).toBeLessThan(putaran.indexOf("go func() {"));
    expect(putaran.indexOf("klien.Do(req)")).toBeGreaterThan(putaran.indexOf("go func() {"));
    expect(readmeT5).toContain("Pada 1.388,9 per detik semua permintaan selesai (200 atau 201) dan jadwal tidak tertinggal.");
  });
  test("pembayaran di rekaman: 2.115 ÷ 20.833 = 10,2% lawan 69,4 ÷ 1.388,9 = 5,0%; 2.115 ÷ 15 = 141 per detik, sekitar dua kali 69,4", () => {
    const bagian = (BAYAR / TOTAL) * 100;
    const naskahBagian = (trxDetik(T5, TRX_DASAR) / T5.puncak) * 100;
    expect(angka(bagian, 1)).toBe("10,2");
    expect(angka((num(angka(trxDetik(T5, TRX_DASAR), 1)) / num(angka(RPS, 1))) * 100, 1)).toBe("5,0");
    expect(bagian / naskahBagian).toBeGreaterThan(2);
    harus(`Campuran lab membayar dua kali lebih sering daripada hitungan Tahap 5: ${angka(BAYAR, 0)} ÷ ${angka(TOTAL, 0)} = ${angka(bagian, 1)}% request, sedangkan ${angka(trxDetik(T5, TRX_DASAR), 1)} ÷ ${angka(RPS, 1)} = ${angka(naskahBagian, 1)}% (Hitungan).`);
    const perDetik = BAYAR / LAMA;
    expect(perDetik).toBe(141);
    expect(angka(perDetik / num(angka(trxDetik(T5, TRX_DASAR), 1)), 2)).toBe("2,03");
    harus(`Pembayaran di rekaman datang ${angka(BAYAR, 0)} ÷ ${LAMA} = ${perDetik} per detik, sekitar dua kali ${angka(trxDetik(T5, TRX_DASAR), 1)} (Hitungan dari rekaman). Angka itu bukan ${angka(trxDetik(T6, TRX_DASAR), 1)}.`);
    harus(`Angka ${perDetik} menunjukkan apa yang selesai di satu laptop pada satu rekaman, bukan kapasitas satu primary.`);
    // rekaman api-t5 lain tidak memakai pembayaran di atas 141 per detik: laporan.txt bagian B memakai 100 per detik
    expect(runPy).toContain("DETIK, BAYAR_RPS, LAPORAN_RPS = 10, 100.0, 666.7");
  });
  test("Snippet: satu potongan rekaman; nomor baris dihitung dari jangkar di rekaman; judul memuat nomor yang sama; tanpa ID internal", () => {
    expect(tagSnippet()).toEqual([
      { berkas: "labs/api-t5/output/beban.txt", lines: `${awalSnip}:${akhirSnip}`, lang: undefined, judul: `Rekaman lab: labs/api-t5/output/beban.txt baris ${awalSnip} sampai ${akhirSnip} (bagian A, beban berjadwal)` },
    ]);
    expect(awalSnip).toBe(9);
    expect(akhirSnip).toBe(17);
    expect(mdx.split("\n").filter((x) => x.startsWith("<Snippet"))).toEqual([
      `<Snippet file="labs/api-t5/output/beban.txt" lines="${awalSnip}:${akhirSnip}" title="Rekaman lab: labs/api-t5/output/beban.txt baris ${awalSnip} sampai ${akhirSnip} (bagian A, beban berjadwal)" />`,
    ]);
    const isi = bersihkanRujukanInternal(B.antara(awalSnip, akhirSnip));
    expect(isi).not.toMatch(POLA_ID_INTERNAL);
    expect(isi).not.toMatch(/KONSISTENSI|tinjauan|peninjau/i);
    expect(B.b[awalSnip - 2]).toBe("# --- A. 15 detik pada 1388.9 permintaan per detik: campuran baca saldo, riwayat, katalog, dan pembayaran ---");
    expect(B.b[akhirSnip]).toBe("# Pada 1.388,9 per detik pool 10 antre tetapi tidak gagal: p95 di bawah batas, semua status 200 atau 201, dan jadwal tidak tertinggal.");
  });
});

describe("klaim negatif dan lingkup, dijaga pemindaian berkas terlacak", () => {
  const berkas = (awalan: string, ekstensi: RegExp) => (terlacak ? [...terlacak] : []).filter((f) => f.startsWith(awalan) && ekstensi.test(f));
  test('"belum mengukur kapasitas satu primary" dan "Tidak dijalankan di repo ini" untuk pgbench: tak satu berkas di labs/ dan tools/ menyebut pgbench', () => {
    const semua = [...berkas("labs/", /\.(go|sql|py|md|yaml|yml|txt|sh|toml|mod)$/), ...berkas("tools/", /\.(py|sh|mjs|md)$/), ...berkas("situs/tools/", /\.(mjs|sh)$/)];
    expect(semua.length).toBeGreaterThan(200);
    const kena = semua.filter((f) => /pgbench/i.test(baca(f)));
    expect(kena, "berkas yang menyebut pgbench").toEqual([]);
    expect(/pgbench/.test("pgbench -c 10")).toBe(true);
    harus("Keduanya Tidak dijalankan di repo ini.");
    expect(readmeT5).toContain("Lab ini tidak menguji kapasitas produksi dan tidak mengklaimnya.");
    expect(hal530).toContain("Load test kapasitas tulis satu primary di server sungguhan. `make beban` di lab hanya memberi batas di laptop");
  });
  test("lab t5-replika dan t5-gabung hanya berjalan di satu mesin: README menulis jeda antar wilayah dan jaringan antar host Tidak dijalankan; 5.9 menulis sinkron lintas wilayah belum diukur", () => {
    expect(readmeReplika).toContain("Jeda antar-wilayah, jaringan antar host, dan penyimpanan terkelola **Tidak dijalankan**.");
    expect(readmeReplika).toContain("Semua node adalah container lokal");
    expect(readmeGabung).toContain("Jaringan antar host (semua panggilan di loopback; jeda antar host adalah jeda buatan)");
    expect(hal59).toContain("| Sinkron lintas wilayah | Jeda antar wilayah tidak diukur | [[t5-adr-60]] |");
    harus("Tidak terjawab: lab `t5-replika` dan `t5-gabung` hanya berjalan di satu mesin.");
    harus("| Data di dua wilayah | Replica sinkron hanya dijalankan di satu mesin (lab `t5-replika`), dan jeda antar wilayah Tidak dijalankan | [[t5-rpo-rto]] |");
    expect(dari("t5-rpo-rto").nomor).toBe("5.9");
  });
  test("skor risiko dalam 50 ms: lab t5-gabung memperagakan alur delapan aturan poin dengan anggaran 50 ms; jeda 10 ms memberi batas bawah 60 ms; 50 ms lompatan ADR 37 lain", () => {
    expect(naskah).toContain("Dua versi alur skor risiko (data akun, perangkat, dan riwayat dalam anggaran 50 ms)");
    expect(naskah).toContain("Skor risiko bukan fitur PRD v5 dan hanya dipakai sebagai peraga");
    expect(M51).toContain("skor risiko yang butuh data banyak dalam 50 ms");
    expect(latensi).toContain("jeda 10 ms: batas bawah 60 ms, transaksi tiga proses di atas 50 ms: 500 dari 500");
    expect(latensi).toContain("# --- B. Anggaran 50 ms ---");
    expect(hal513).toContain("Alurnya membaca data akun, data perangkat, dan riwayat transaksi, lalu menghitung skor risiko dengan delapan aturan poin. Skor itu peraga, bukan fitur PRD v5 dan bukan model risiko.");
    expect(hal513).toContain("Pada jeda 10 ms batas bawahnya 6 × 10 = 60 ms, jadi 500 dari 500 transaksi tiga proses melewati 50 ms.");
    expect(hal513).toContain("Itu bukan anggaran lompatan di ADR 37, yaitu batas tambahan p95 satu panggilan HTTP ke ledger. Angkanya sama, artinya lain.");
    harus("| Skor risiko real-time dalam 50 ms (Asumsi naskah) | Lab `t5-gabung` memperagakan alur skor delapan aturan poin. Satu transaksi di tiga proses melewati enam panggilan, dan dengan jeda buatan 10 ms per panggilan batas bawahnya 6 × 10 = 60 ms. Jaringan antar host tidak diukur | [[t5-service]] |");
    harus("Skor itu peraga, bukan model risiko dan bukan fitur PRD v5. Angka 50 ms di baris pertama sama dengan batas uji 50 ms di lab `t5-gabung`, yaitu batas total satu transaksi alur skor (Asumsi naskah). Anggaran lompatan 50 ms di ADR 37 lain: tambahan p95 satu panggilan HTTP ke ledger. Angkanya sama, artinya berbeda ([[t5-service]]).");
  });
  test("28 orang menjadi lebih dari 50: tim 28 dari 5.1 dan naskah; ±50 developer tanpa sumber primer; 50 ÷ 28 = 1,8; halaman tidak memakai ±50 sebagai pembanding", () => {
    expect(hal51).toContain("28 orang dalam delapan tim");
    expect(naskah).toContain("Naskah ini memakai satu bacaan: 28 orang dalam delapan tim.");
    expect(naskah).toContain("Heuristik ±50 developer tidak dipakai sebagai pemicu.");
    expect(naskah).toContain("Angka itu tidak punya sumber primer [perlu verifikasi]");
    expect(proposal).toContain("Angka ini heuristik, bukan hasil penelitian terkontrol");
    expect(risetT4).toContain("Ambang ±50 developer untuk microservices: R4-173 tidak menemukan sumber primer");
    expect(angka(50 / 28, 1)).toBe("1,8");
    harus("| 28 orang menjadi lebih dari 50 | 28 orang dalam delapan tim (Asumsi cerita). Ambang ±50 developer untuk microservices tidak punya sumber primer [perlu verifikasi], dan halaman ini tidak memakainya | [[t5-prd]] dan [[t4-modul]] |");
    harus(`Baris ketiga membandingkan orang dengan user. User naik ${USER6 / reg5.user} kali, sedangkan tim naik paling sedikit 50 ÷ 28 = ${angka(50 / 28, 1)} kali (Hitungan atas Asumsi). Angka lebih dari 50 berasal dari PRD v6 (Ilustrasi).`);
    expect(hitung(badan, "±50")).toBe(1);
    expect(hitung(badan, "[perlu verifikasi]")).toBe(1);
  });
  test("dua dugaan: service mesh belum terpenuhi (satu tujuan kritis, ledger) dan multi-region menunggu PRD v6, dibaca dari baris 5.30", () => {
    expect(hal530).toContain("| 1. Service mesh penuh | Lebih dari satu tujuan kritis butuh identitas yang sama | Daftar tujuan panggilan antar service dan identitas tiap panggilan | Satu tujuan kritis, yaitu ledger, dipanggil tiga service ([[t5-mtls]]) | Belum terpenuhi |");
    expect(hal530).toContain("| 2. Multi-region | Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya |");
    expect(hal530).toContain("Pratinjau PRD v6 memintanya (Ilustrasi) dan belum menjadi PRD yang dikerjakan | Menunggu PRD v6 |");
    expect(hal530).toContain("M42 adalah satu mesin yang mati 23 menit (Ilustrasi).");
    expect(hal59).toContain("Lab tidak mengukur RTO, dan 23 menit adalah Ilustrasi");
    harus("**Dua dugaan, dan yang menjawabnya.** Bayu mengusulkan service mesh. Ledger dipanggil dari tiga service, dan ADR 53 menjawab TLS timbal balik di kode Go ([[t5-mtls]]). [[t5-adr-60]] menulis service mesh penuh baru perlu bila lebih dari satu tujuan kritis butuh identitas yang sama, dan tujuan kritisnya satu, yaitu ledger.");
    harus("Nadia mengusulkan multi-region. [[t5-adr-60]] menulis multi-region salah saat satu region mati lebih lama dari RTO 15 menit, atau saat PRD v6 memintanya. Pratinjau PRD v6 memintanya (Ilustrasi), dan PRD yang disetujui belum ada.");
    harus("M42 adalah satu mesin yang mati 23 menit (Ilustrasi). ADR 48 menimbang kejadian itu di dalam satu region, dan lab tidak mengukur RTO ([[t5-rpo-rto]]). Multi-region menjawab pertanyaan lain: apa yang terjadi bila satu region hilang.");
  });
  test("aturan estimasi: aturan 1, 2, dan 6 dari 4.28; dua aturan tambahan; pengali 10 salah bila perilaku per user berubah (Penalaran)", () => {
    expect(hal428).toContain("1. Hitung ulang dari registry tahap itu dan tulis rumus serta masukannya.");
    expect(hal428).toContain("2. Pisahkan kelas pekerjaan.");
    expect(hal428).toContain("6. Catat apa yang tidak dijawab estimasi.");
    expect(hal428).toContain("Aturan ini salah bila perilaku per user berubah");
    harus("**Aturan estimasi yang dipakai.** Aturan di [[t4-estimasi]] berlaku: hitung ulang dari masukan yang tertulis, pisahkan kelas pekerjaan, dan catat yang tidak terjawab. Dua aturan lain ikut dari halaman ini.");
    harus("- Hasil yang batasnya belum terukur ditulis belum bisa dinilai, bukan aman atau tidak aman.\n- Angka dari rekaman satu laptop dipakai sebagai batas yang diperiksa, bukan dikali 10.");
    harus(`Pengali 10 salah bila perilaku per user berubah. Skor risiko yang dihitung tiap pembayaran menambah kerja per transaksi (Penalaran). Pembayaran bisa memuat lebih banyak pekerjaan daripada Tahap 5, walau jumlahnya tetap ${angka(trxDetik(T6, TRX_DASAR), 1)} per detik.`);
    harus("**Estimasi ini berhenti di tiga pertanyaan dan tidak memilih komponen.**");
    harus("*Berapa jeda antar wilayah, dan berapa dari 50 ms skor risiko yang ia habiskan?*");
    harus("*Bagaimana tim yang lebih besar mengubah satu codebase?* Tidak ada rumus di halaman ini yang memuat koordinasi.");
    harus("*Berapa transaksi uang per detik yang sanggup ditulis satu primary di server sungguhan?* Tidak terjawab.");
    harus("Beban PRD v6 adalah 10 kali Tahap 5 menurut hitungan, tetapi repo ini belum mengukur kapasitas satu primary, jadi 10 kali itu belum bisa dinilai.");
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari angka halaman dan rekaman", () => {
  test("dua baris; sumber berlabel asumsi (label terlemah) dengan rujukan beban.txt bagian A; simpul memakai puncak, uang, rekaman laptop, dan tiga hal PRD v6", () => {
    expect(diagram.baris.length).toBe(2);
    expect(diagram.sumber.jenis).toBe("asumsi");
    expect(diagram.sumber.teks).toBe("Hitungan atas Asumsi naskah dan registry; rekaman lab api-t5, beban.txt bagian A, hanya untuk batas di satu laptop");
    const [a, b] = diagram.baris as [(typeof diagram.baris)[number], (typeof diagram.baris)[number]];
    expect(a.simpul.map((s) => s.teks)).toEqual([`Puncak ${angka(T6.puncak, 1)} per detik`, `Uang ${angka(trxDetik(T6, TRX_DASAR), 1)} per detik`, "Laptop: semua selesai"]);
    expect(a.simpul.map((s) => s.sub)).toEqual([`${T6.puncak / T5.puncak} kali Tahap 5, Hitungan`, `${USER6 / reg5.user} kali ${angka(trxDetik(T5, TRX_DASAR), 1)}, Hitungan`, `${angka(RPS, 1)} per detik, ${LAMA} detik`]);
    expect([a.label, a.sub]).toEqual(["Dihitung dan direkam", "Tahap 5 dan 6"]);
    expect(a.simpul.map((s) => s.nada)).toEqual(["system", "system", "good"]);
    expect(b.simpul.map((s) => s.teks)).toEqual(["Skor risiko 50 ms", "Data di dua wilayah", "Lebih dari 50 orang"]);
    expect(b.simpul.map((s) => s.sub)).toEqual(["antar host", "jeda antar wilayah", "dari 28"]);
    expect(b.simpul.map((s) => s.nada)).toEqual(["warn", "warn", "warn"]);
    expect([b.label, b.sub]).toEqual(["Belum pernah diuji", "diminta PRD v6"]);
    expect(diagram.catatan).toBe("Puncak dan transaksi uang Tahap 6 adalah Hitungan atas Asumsi. Semua selesai di laptop adalah batas lab dari rekaman, bukan kapasitas produksi, dan kapasitas satu primary belum terukur.");
    expect(diagram.judul).toBe("Yang dihitung dan direkam di Tahap 5, dan yang diminta PRD v6");
    expect(JSON.stringify(diagram)).not.toMatch(POLA_ID_INTERNAL);
    expect(JSON.stringify(diagram)).not.toMatch(/\d\s?B\b/);
    expect(hitung(badan, "<Rantai data={batas} ringkas />")).toBe(1);
    expect(hitung(mdx, 'import batas from "../../../../data/diagram/t5-m51-batas.json";')).toBe(1);
    expect(badan.indexOf("<Rantai data={batas} ringkas />")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai data={batas} ringkas />")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
    // hasil-dulu: satu kalimat pendek sebelum Rantai, tanpa definisi; paragraf sesudahnya dimulai dari angka
    const inti = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf("<Rantai data={batas} ringkas />")).split("\n").filter((x) => x.trim() && !x.startsWith("<"));
    expect(inti).toEqual(["Beban PRD v6 adalah 10 kali Tahap 5 menurut hitungan, tetapi repo ini belum mengukur kapasitas satu primary, jadi 10 kali itu belum bisa dinilai."]);
    expect(inti[0]!.length).toBeLessThanOrEqual(175);
    const sesudah = badan.slice(badan.indexOf("<Rantai data={batas} ringkas />") + "<Rantai data={batas} ringkas />".length).split("\n").filter((x) => x.trim());
    expect(sesudah[0]).toMatch(/^\*\*Angka Tahap 6 dihitung dari angka Tahap 5\.\*\*/);
  });
});

describe("widget kalkulator: konfigurasi dihitung mesin yang sama dengan widget, dan teks widget selaras dengan halaman", () => {
  const asumsi = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));
  const skenario = siapkan(kalk, asumsi);
  test("satu Kalkulator dengan asumsi dari registry; empat skenario Tahap 5: dasar, Tahap 6 (user 10 juta), aktif 10%, satu jam", () => {
    expect(hitung(badan, "<Kalkulator client:visible data={dataKalkulator} asumsi={cerita.tahap.map((t) => t.asumsi)} />")).toBe(1);
    expect(hitung(mdx, 'import Kalkulator from "../../../widgets/kalkulator/Kalkulator.tsx";')).toBe(1);
    expect(hitung(mdx, 'import dataKalkulator from "../../../../data/widget/t5-m51-kalkulator.json";')).toBe(1);
    expect(hitung(mdx, 'import cerita from "../../../../data/cerita.json";')).toBe(1);
    expect(kalk.skenario).toEqual([
      { label: "Tahap 5", tahap: 5 },
      { label: "Tahap 6", tahap: 5, ubah: { user: USER6 } },
      { label: "Aktif 10%", tahap: 5, ubah: { user: USER6, aktif: 10 } },
      { label: "Satu jam", tahap: 5, ubah: { user: USER6, puncak: DETIK / 3600 } },
    ]);
    expect(kalk.awal).toBe(0);
    expect(skenario[0]).toEqual(asumsi[4]);
    expect(skenario[1]!.user).toBe(USER6);
    expect(skenario[2]!.aktif).toBe(10);
    expect(skenario[3]!.puncak).toBe(24);
    expect(kalk.sumber).toEqual({ jenis: "asumsi", teks: "Asumsi naskah dari cerita.json, dengan 10.000.000 user dari pratinjau PRD v6 (Ilustrasi), bukan pengukuran." });
    expect(kalk.label.sumber).toBe("Asumsi");
    expect(kalk.label.kesimpulan).toBe("Di jam paling ramai, satu request datang kira-kira tiap {jarak}.");
    expect(kalk.judul).toBe("Beban di jam paling ramai, Tahap 5 dan Tahap 6");
    harus(`Angka ${angka(T6.puncak, 1)} adalah Asumsi, dan lab tidak mengukur kapasitas produksi.`);
    harus("lalu ubah satu hal: ganti skenario dan lihat baris mana yang berubah.");
    const butirPuncak = kalk.skenario.map((s, i) => `${s.label} ${angka(hitungBeban(siapkan(kalk, asumsi)[i]!).puncak, 1)}`);
    const noscriptPuncak = `${butirPuncak.slice(0, -1).join(", ")}, dan ${butirPuncak[butirPuncak.length - 1]}`;
    harus(`<noscript>\nTanpa JavaScript tebakan dan pilihan skenario tidak berjalan. Jawaban tebakan adalah ${kalk.tebak.pilihan[kalk.tebak.jawaban]}. Puncak request per detik: ${noscriptPuncak} (Hitungan atas Asumsi).\n</noscript>`);
    harus("Tebak dulu akibatnya bila persentase user aktif turun separuh");
  });
  test("tebakan: 10 × 0,5 = 5 kali, jawaban di pilihan pertama (posisi lain dari kalkulator tetangga yang memakai satu sampai tiga), bukan pilihan terpanjang", () => {
    const rasio = aktif10.puncak / T5.puncak;
    expect(rasio).toBeCloseTo(5, 10);
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]).toBe(`${bulat(rasio, 6)} kali`);
    expect(kalk.tebak.pilihan.indexOf(`${USER6 / reg5.user} kali`), "distraktor: user naik 10 kali").toBeGreaterThanOrEqual(0);
    expect(kalk.tebak.pilihan.indexOf(`${bulat(rasio * 2 * 2, 6)} kali`), "distraktor: 20 kali").toBeGreaterThanOrEqual(0);
    expect(kalk.tebak.jawaban).toBe(0);
    expect(kalk.tebak.skenario).toBe(2);
    expect(kalk.skenario[kalk.tebak.skenario]!.label).toBe("Aktif 10%");
    const lain = ["t1-m8-kalkulator", "t1-estimasi-kalkulator", "t2-estimasi-kalkulator", "t3-estimasi-kalkulator", "t3-m28-kalkulator", "t4-m39-kalkulator", "t4-estimasi-kalkulator"].map((n) => DataKalkulator.parse(JSON.parse(baca(`situs/data/widget/${n}.json`))).tebak.jawaban);
    expect(lain.filter((j) => j === 0).length, "pilihan pertama jarang benar di kalkulator tetangga").toBeLessThanOrEqual(1);
    const terpanjang = Math.max(...kalk.tebak.pilihan.map((p) => p.length));
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]!.length).toBeLessThan(terpanjang);
    expect(kalk.tebak.q).toBe(`PRD v6 menaikkan user dari ${angka(reg5.user, 0)} ke ${angka(USER6, 0)}. Bila persentase aktif turun dari ${reg5.aktif}% ke 10%, berapa kali lipat puncak request per detik dibanding Tahap 5?`);
    expect(kalk.tebak.alasan).toBe(`User naik ${USER6 / reg5.user} kali dan persentase aktif turun separuh, jadi puncak naik ${USER6 / reg5.user} × 0,5 = ${bulat(rasio, 6)} kali, dari ${angka(T5.puncak, 1)} ke ${angka(aktif10.puncak, 1)} request per detik. Request per user dan faktor puncak tetap, jadi bukan ${USER6 / reg5.user} kali.`);
    expect(kalk.label.lanjut).toBe(`Sekarang pilih skenario “${kalk.skenario[kalk.tebak.skenario]!.label}” di atas tabel.`);
  });
  test("tabel widget: nilai awal 1.000.000, 200.000, 12.000.000, 1.400 dan jarak 0,72 ms sama dengan hitungan; semua skenario punya puncak yang diturunkan", () => {
    const h = skenario.map((a) => hitungBeban(a));
    expect(h.map((x) => duaAngka(x.puncak))).toEqual(["1.400", "14.000", "6.900", "33.000"]);
    expect(h.map((x) => jarakKal(x.jarak, SATUAN))).toEqual(["0,72 ms", "0,072 ms", "0,14 ms", "0,030 ms"]);
    expect(h[0]!.reqHari).toBe(T5.reqHari);
    expect(h[0]!.dau).toBe(T5.dau);
    expect(h[1]!.reqHari).toBe(T6.reqHari);
    expect(h[0]!.user).toBe(reg5.user);
    expect(h[3]!.puncak).toBeCloseTo(T6.reqHari / 3600, 10);
  });
});

describe("kartu Cek diri: empat kartu sama dengan kartu.json dan fakta yang sama dengan hitungan, rekaman, dan naskah", () => {
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3", "4"]);
    expect(hitung(badan, '<details class="success">')).toBe(4);
    const k = kartu.filter((x) => x.halaman === "t5-m51");
    expect(k.map((x) => x.id)).toEqual(["t5-m51-1", "t5-m51-2", "t5-m51-3", "t5-m51-4"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("5.29 M51: Uji coba nasional lolos, PRD v6 datang, dan estimasi Tahap 5 → 6");
      expect(x.url).toBe("tahap-5/m51-prd-v6/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab);
    });
  });
  test("jawaban memuat fakta yang sama dengan hitungan dan rekaman: 1.388,9 ke 13.888,9, 20.833 selesai, 69,4 × 10, tiga hal PRD v6", () => {
    expect(soal[0]!.tanya).toBe(`Puncak Tahap 5 adalah ${angka(T5.puncak, 1)} request per detik. Berapa puncak Tahap 6, dan kenapa hanya perlu satu pengali?`);
    expect(soal[0]!.jawab).toContain(`${angka(T6.puncak, 1)} request per detik: user naik ${USER6 / reg5.user} kali, sedangkan persen aktif, request per user, dan faktor puncak dianggap tetap (Hitungan atas Asumsi). Angka ${angka(USER6, 0)} user berasal dari pratinjau PRD v6 (Ilustrasi).`);
    expect(soal[1]!.tanya).toBe(`Rekaman beban menulis semua ${angka(TOTAL, 0)} permintaan selesai. Apa yang dibuktikan, dan kenapa bukan kapasitas satu primary?`);
    expect(soal[1]!.jawab).toContain(`Satu proses di satu laptop menyelesaikan campuran lab pada ${angka(RPS, 1)} request per detik, dengan p95 di bawah batas lab ${angka(BATAS_P95, 0)} ms.`);
    expect(soal[1]!.jawab).toContain(`Databasenya bersih dan tanpa replica, ada permintaan yang pernah menunggu koneksi di pool 10, dan pembayaran datang ${BAYAR / LAMA} per detik, bukan ${angka(trxDetik(T6, TRX_DASAR), 1)} (\`beban.txt\` bagian A).`);
    expect(soal[2]!.tanya).toBe(`Kenapa ${angka(trxDetik(T5, TRX_DASAR), 1)} × 10 = ${Math.round(Number(angka(trxDetik(T5, TRX_DASAR), 1).replace(",", ".")) * 10)} ditulis ${angka(trxDetik(T6, TRX_DASAR), 1)} di tabel Tahap 6?`);
    expect(soal[2]!.jawab).toBe(`Angka ${angka(trxDetik(T5, TRX_DASAR), 1)} sudah dibulatkan dari ${angka(trxDetik(T5, TRX_DASAR), 4)}. Dikali 10 hasilnya ${angka(trxDetik(T5, TRX_DASAR) * 10, 3)}, yang ditulis ${angka(trxDetik(T6, TRX_DASAR), 1)} dengan satu desimal. Selisihnya hanya pembulatan.`);
    expect(soal[3]!.tanya).toBe("Sebutkan tiga hal yang diminta PRD v6 dan belum pernah diuji di Tahap 5.");
    expect(soal[3]!.jawab).toBe("Skor risiko real-time dalam 50 ms antar host, data di dua wilayah, dan 28 orang menjadi lebih dari 50. Lab Tahap 5 berjalan di satu mesin, dan jeda antar wilayah Tidak dijalankan.");
    expect(M51).toContain("Tiga hal belum pernah diuji: skor risiko yang butuh data banyak dalam 50 ms, data di dua wilayah, dan 28 orang menjadi lebih dari 50");
  });
});

describe("struktur halaman: tingkat heading, daftar, label, istilah, dan tanpa ID internal", () => {
  test("heading: h3 Cek diri dan h3 Bacaan lanjut di blok terakhir; satu tebakan details question; daftar bernomor hanya tiga butir pertanyaan; enam butir [[; dua tabel; satu Snippet; satu Kalkulator; tanpa noscript", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri", "### Bacaan lanjut"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(badan.indexOf("### Bacaan lanjut")).toBeGreaterThan(badan.indexOf("### Cek diri"));
    expect(hitung(badan, '<details class="question">')).toBe(1);
    expect(hitung(badan, "<details>")).toBe(0);
    expect([...badan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(hitung(badan, "\n- [[")).toBe(6);
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(2);
    expect(hitung(badan, "<Snippet ")).toBe(1);
    expect(hitung(badan, "<Kalkulator ")).toBe(1);
    expect(hitung(badan, "<noscript")).toBe(1);
    expect(badan.indexOf("<noscript")).toBeGreaterThan(badan.indexOf("<Kalkulator "));
    expect(badan.indexOf("</noscript>")).toBeLessThan(badan.indexOf("</Blok>", badan.indexOf("<noscript")));
  });
  test("bentuk paragraf: jumlah potongan yang dipisah baris kosong, per blok dan seluruh badan (tanpa bergantung pada nilai terkunci)", () => {
    expect(badan.split(/\n\s*\n/).length).toBe(77);
    const perBlok = badan.split(/<Blok nama="[^"]+"(?: buka)?>/).slice(1).map((s) => s.split("</Blok>")[0]!.trim().split(/\n\s*\n/).length);
    expect(perBlok).toEqual([7, 6, 26, 5, 21]);
  });
  test("butir Konsep yang lahir dan bacaan lanjut: tautan eksternal sama dengan baris riset; tiap butir menunjuk halaman yang memuat topiknya", () => {
    harus("- [[t5-adr-60]]: ADR 60, \"Sengaja belum dilakukan\". Service mesh penuh, multi-region, database terpisah per service, sharding, dan butir lain sengaja belum dipasang, masing-masing dengan pemicunya.");
    harus("- [[t4-estimasi]]: rumus puncak yang sama untuk Tahap 4 → 5. Halaman ini memakainya sekali lagi untuk Tahap 5 → 6.");
    harus("- [[t5-service]]: lab `t5-gabung` dan batas uji 50 ms antar host, yang belum diukur.");
    harus("- [[t5-rpo-rto]]: replica sinkron dan RTO 15 menit di satu region.");
    harus("- [[t5-prd]]: tabel beban Tahap 5 dan tim 28 orang, tempat angka masukan halaman ini berasal.");
    const tautan = [...badan.matchAll(/^- \[([^\]]+)\]\((https:[^)]+)\)/gm)].map((m) => [m[1], m[2]]);
    expect(tautan).toEqual([
      ["PostgreSQL 17: Synchronous Replication", "https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION"],
      ["PostgreSQL 17: pgbench", "https://www.postgresql.org/docs/17/pgbench.html"],
      ["Google SRE book: Handling Overload", "https://sre.google/sre-book/handling-overload/"],
    ]);
    harus('- [Google SRE book: Handling Overload](https://sre.google/sre-book/handling-overload/), bagian "The Pitfalls of Queries per Second"');
    for (const [, url] of tautan) expect(riset, String(url)).toContain(String(url).split("#")[0]!.replace("https://", "").replace("www.", ""));
  });
  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa kata yang dilarang gaya-bahasa, tanpa Anda atau kita; label dihitung dan didefinisikan di pemakaian pertama", () => {
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(frontmatter).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/!(?!\[)/);
    expect(badan).not.toMatch(/\b(Anda|kita|pengguna|mudah|cukup|tinggal)\b/i);
    expect(badan).not.toMatch(/\bR\d-\d+\b/);
    expect(hitung(badan, "Rekaman lab:")).toBe(1);
    expect(hitung(badan, "Kode lab:")).toBe(0);
    expect(hitung(badan, "(Ilustrasi)")).toBeGreaterThanOrEqual(8);
    expect(hitung(badan, "Hitungan atas Asumsi")).toBe(4);
    expect(hitung(badan, "Hitungan di halaman ini berarti")).toBe(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Hitungan di halaman ini berarti"));
    expect(badan.indexOf("Penalaran"), "Penalaran didefinisikan di pemakaian pertama").toBe(badan.indexOf("(Penalaran, yaitu kesimpulan dari dokumentasi tanpa dijalankan)") + 1);
    expect(hitung(badan, "Penalaran")).toBe(2);
    expect(badan.search(/\bp95\b/)).toBe(badan.indexOf("Hasilnya dilaporkan sebagai status dan p95") + "Hasilnya dilaporkan sebagai status dan ".length);
    harus("Hasilnya dilaporkan sebagai status dan p95, yaitu waktu jawab yang dilewati 5% request paling lambat.");
    expect(badan.indexOf("Hasilnya dilaporkan sebagai status dan p95")).toBeLessThan(badan.indexOf("<summary>Tebak dulu:"));
  });
  test("istilah diberi arti di pemakaian pertama: primary, multi-region, service mesh, region, p95, Hitungan; satu simbol satu besaran (50 ms punya tiga arti yang ditulis)", () => {
    const pertama = (kata: string) => badan.search(new RegExp(`\\b${kata}\\b`));
    expect(pertama("primary")).toBe(badan.indexOf("kapasitas satu primary, yaitu database yang menerima semua tulis") + "kapasitas satu ".length);
    expect(pertama("service mesh")).toBeGreaterThan(badan.indexOf("Bayu mengusulkan service mesh sekarang, yaitu lapisan proxy"));
    expect(pertama("multi-region")).toBe(badan.indexOf("multi-region, skor risiko real-time"));
    const definisiMulti = badan.indexOf("Nadia mengusulkan multi-region sekarang, yaitu menjalankan sistem di lebih dari satu region, wilayah pusat data.");
    expect(definisiMulti).toBeGreaterThan(pertama("multi-region"));
    expect(definisiMulti - pertama("multi-region"), "arti multi-region ada di blok berikutnya, sebelum dipakai dalam argumen").toBeLessThan(1200);
    expect(pertama("service mesh")).toBe(badan.indexOf("Bayu mengusulkan service mesh sekarang, yaitu lapisan proxy") + "Bayu mengusulkan ".length);
    expect(hitung(badan, "50 ms")).toBe(7);
    expect(badan.indexOf("dengan jeda buatan 10 ms per panggilan"), "kalimat jeda buatan ada").toBeGreaterThan(0);
    expect(badan.search(/\bRTO\b/)).toBeGreaterThan(badan.indexOf("dengan jeda buatan 10 ms per panggilan"));
  });
  test("front matter dikunci: title dan description memuat minggu 16, uji coba nasional, 10 kali, dan tiga hal PRD v6", () => {
    expect(frontmatter).toBe(
      'title: "5.29 M51: Uji coba nasional lolos, PRD v6 datang, dan estimasi Tahap 5 → 6"\ndescription: Minggu 16. Uji coba nasional lolos, lalu Sinta datang dengan PRD v6. Beban naik 10 kali menurut hitungan atas Asumsi, tetapi kapasitas satu primary belum pernah diukur dan tiga hal yang diminta PRD v6 belum pernah diuji.\n',
    );
  });
});

describe("dunia angka tertutup: tiap token angka dan konteksnya dihitung dari sumber, supaya mutasi yang membangkitkan ulang kunci kata tetap gagal", () => {
  test("rupiah di halaman: hanya Rp0 (selisih target naskah)", () => {
    const semua = [...badan.matchAll(/Rp\d+(?:\.\d{3})*/g)].map((m) => m[0]);
    expect(new Set(semua)).toEqual(new Set(["Rp0"]));
    expect(semua.length).toBe(2);
    expect(M51).toContain("selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut");
  });
  test("angka berkoma: himpunan token di badan sama dengan himpunan yang dihitung dari registry, rekaman, dan rumus; tiap nilai dipakai", () => {
    const u5 = trxDetik(T5, TRX_DASAR);
    const d5 = trxDetik(T5, TRX_REG);
    const n5 = notifDetik(T5, TRX_DASAR);
    const boleh = new Set([
      angka(T5.puncak, 1), angka(T6.puncak, 1), angka(u5, 1), angka(trxDetik(T6, TRX_DASAR), 1), angka(d5, 1), angka(trxDetik(T6, TRX_REG), 1),
      angka(n5, 1), angka(notifDetik(T5, TRX_REG), 1), angka(notifDetik(T6, TRX_DASAR), 1), angka(notifDetik(T6, TRX_REG), 1), angka(TOPUP, 2),
      angka(posting(T6, TRX_DASAR) / 1e9, 2), angka(posting(T6, TRX_REG) / 1e9, 2), angka(n5, 4), angka(u5, 4), angka(d5, 4), angka(u5 * 10, 3),
      angka((BAYAR / TOTAL) * 100, 1), angka((u5 / T5.puncak) * 100, 1), angka(50 / 28, 1), angka(aktif10.puncak, 1), angka(satuJam.puncak, 1),
    ]);
    const token = [...badan.matchAll(/\d{1,3}(?:\.\d{3})*,\d+|\d+,\d+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))], "token berkoma di halaman yang tidak dihitung dari sumber").toEqual([]);
    for (const b of boleh) expect(token, `nilai yang dihitung tidak dipakai halaman: ${b}`).toContain(b);
    expect(hitung(badan, angka(T5.puncak, 1))).toBe(11);
    expect(hitung(badan, angka(T6.puncak, 1))).toBe(7);
    expect(hitung(badan, angka(trxDetik(T6, TRX_DASAR), 1))).toBe(9);
    expect(hitung(badan, angka(u5, 1))).toBe(8);
  });
  test("angka berpemisah ribuan: user, aktif, request per hari, detik sehari, jadwal, status rekaman, batas p95, dan hasil pembulatan widget", () => {
    const boleh = new Set([angka(reg5.user, 0), angka(USER6, 0), angka(T5.dau, 0), angka(T6.dau, 0), angka(DETIK, 0), angka(TOTAL, 0), angka(BACA, 0), angka(BAYAR, 0), angka(BATAS_P95, 0), angka(T6.reqHari, 0), angka(3600, 0),
      duaAngka(T5.puncak), duaAngka(T6.puncak), duaAngka(satuJam.puncak)]);
    const token = [...badan.matchAll(/(?<![\d,])\d{1,3}(?:\.\d{3})+(?!,\d)/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))]).toEqual([]);
    for (const b of boleh) expect(token, b).toContain(b);
    expect(angka(BATAS_P95, 0)).toBe("5.000");
  });
  test("bilangan bulat berkonteks: persen, menit, detik, ms, kali, ADR, M, dan hitungan dari sumber", () => {
    const himpunan = (re: RegExp) => new Set([...badan.matchAll(re)].map((m) => m[1]!));
    expect(himpunan(/(?<![\d,.])(\d+(?:,\d+)?)%/g)).toEqual(new Set([`${reg5.aktif}`, "5", "10", angka((BAYAR / TOTAL) * 100, 1), angka((trxDetik(T5, TRX_DASAR) / T5.puncak) * 100, 1)]));
    expect(himpunan(/(?<![\d,.])(\d+) menit/g)).toEqual(new Set(["10", "3", "15", "23"]));
    expect(himpunan(/(?<![\d,.])(\d+) ms/g)).toEqual(new Set(["100", "50", "10", "60"]));
    expect(himpunan(/(?<![\d,.])(\d+) detik/g)).toEqual(new Set([`${LAMA}`]));
    expect(himpunan(/(?<![\d,.])(\d+) kali/g)).toEqual(new Set(["10", "5"]));
    expect(himpunan(/hari ke-(\d+)/g)).toEqual(new Set(["14"]));
    expect(himpunan(/\bM(\d+)\b/g)).toEqual(new Set(["42"]));
    expect(himpunan(/ADR (\d+)/g)).toEqual(new Set(["37", "46", "48", "53", "60"]));
    expect(dari("t5-rpo-rto").adr).toEqual([48]);
    expect(hitung(badan, "RTO 15 menit")).toBe(2);
    expect(hitung(badan, "23 menit")).toBe(1);
    expect(hitung(badan, "50 ms")).toBe(7);
    expect(hitung(badan, "× 10")).toBeGreaterThanOrEqual(6);
  });
});

describe("riset: baris milik halaman ini ada tanpa ID ganda dan tidak tampil ke pembaca", () => {
  test("R5-250 sampai R5-254 ada tepat sekali, urut, di antara R5-249 dan R5-255, dan memuat sumber yang dipakai halaman", () => {
    const id = [...riset.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(id).size, "ID riset ganda").toBe(id.length);
    for (const n of [250, 251, 252, 253, 254]) expect(id.filter((x) => x === `R5-${n}`)).toHaveLength(1);
    const i249 = id.indexOf("R5-249");
    expect(id.slice(i249, i249 + 7)).toEqual(["R5-249", "R5-250", "R5-251", "R5-252", "R5-253", "R5-254", "R5-255"]);
    const dua = (n: number) => riset.split("\n").find((b) => b.startsWith(`| R5-${n} |`))!;
    expect(dua(250)).toContain("PostgreSQL 17.11 bagian 26.2.8 Synchronous Replication (postgresql.org/docs/17/warm-standby.html");
    expect(dua(250)).toContain("The minimum wait time is the round-trip time between primary and standby.");
    expect(dua(250)).toContain("necessarily increases the response time for the requesting transaction");
    expect(dua(250)).toContain("Dokumentasi tidak membahas standby di wilayah lain");
    expect(dua(251)).toContain("postgresql.org/docs/17/pgbench.html");
    expect(dua(251)).toContain("calculates the average transaction rate (transactions per second)");
    expect(dua(252)).toContain("sre.google/sre-book/handling-overload/");
    expect(dua(252)).toContain("often makes for a poor metric");
    expect(dua(252)).toContain("Pelunak \"often\" ikut ke kalimat halaman (sering)");
    expect(dua(253)).toContain("`labs/api-t5/output/beban.txt` bagian A");
    expect(dua(253)).toContain("`batas_p95 = 5000`");
    expect(dua(253)).toContain("2.115 ÷ 15 = 141 pembayaran per detik");
    expect(dua(254)).toContain("`plan/PROPOSAL.md` baris 318");
    expect(dua(254)).toContain("50 ÷ 28 = 1,8");
    expect(dua(254)).toContain("694,4 (2 transaksi: 463,0)");
    const tanggal: Record<number, number> = { 250: 2, 251: 2, 252: 3, 253: 2, 254: 2 };
    for (const n of [250, 251, 252, 253, 254]) {
      expect([...dua(n).matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]), `tanggal akses R5-${n}`).toEqual(Array(tanggal[n]).fill("2026-11-04"));
    }
    expect(dua(250)).toContain("(Penalaran, Tidak dijalankan: lab `t5-replika` hanya satu mesin dan jeda antar wilayah Tidak dijalankan)");
    expect(dua(251)).toContain("Tidak dijalankan di repo ini");
    expect(dua(253)).toContain("batas_p95");
    expect(hitung(badan, "dibuka 2026-11-04")).toBe(2);
    expect(badan).not.toMatch(/\bR5-\d+\b/);
    expect(proposal.split("\n")[317]).toContain("| 6 (proyeksi) | 1jt–10jt | 50+ (10+ tim, platform sebagai produk) |");
    // baris riset lama yang dipakai ulang: tidak ada tulisan baru, hanya pembaca ID lama di tes
    expect(riset).toContain("| R5-258 | Multi-region: strategi pemulihan bencana (5.30) |");
  });
});

describe("kalimat klaim kunci: ditulis di tes, bukan dibangkitkan dari halaman, supaya mutasi yang membangkitkan ulang kunci kata tetap gagal", () => {
  test("blok Yang Raka kira dan sebenarnya: kalimat berisi sebab, label, dan batas", () => {
    harus("Pak Hadi membuka laporan rekonsiliasi hari ke-14 berturut-turut ([[t4-rekonsiliasi]]). Tiap hari selisihnya Rp0, atau insiden yang muncul sudah tertutup dalam satu hari kerja.");
    harus("Satu rekaman beban Tahap 5 ada di repo. Lab menjadwalkan");
    harus("Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    harus(`**Rekaman: yang dibuktikan dan yang tidak.** Lab \`api-t5\` menjalankan beban Tahap 5, bukan Tahap 6`);
    harus("**Tiga hal yang belum pernah diuji.** Naskah menyebut ketiganya, dan tiap hal punya batas yang bisa dibaca di Tahap 5:");
    harus("| Hal baru di PRD v6 | Yang ada di Tahap 5 | Dibaca di |");
    harus("Untuk baris kedua, PostgreSQL 17 menulis bahwa tiap COMMIT sinkron menunggu konfirmasi dari standby (bagian 26.2.8, dibuka 2026-11-04, Tidak dijalankan). Waktu tunggu minimumnya adalah round-trip time antara primary dan standby. Bila standby sinkron berada di wilayah lain, tiap transaksi uang menanggung jeda itu (Penalaran, yaitu kesimpulan dari dokumentasi tanpa dijalankan). Nilainya belum diukur.");
    harus("Buku SRE Google menulis bahwa memodelkan kapasitas sebagai queries per second sering menjadi ukuran yang buruk. Alasannya, biaya tiap query berbeda dan bisa berubah. Sumbernya bagian \"The Pitfalls of Queries per Second\", dibuka 2026-11-04. Alat `pgbench` di PostgreSQL 17 menjalankan urutan perintah SQL yang sama berulang, dapat lewat beberapa sesi bersamaan, dan menghitung rata-rata transaksi per detik. Keduanya Tidak dijalankan di repo ini.");
    harus("Hasilnya dilaporkan sebagai status dan p95, yaitu waktu jawab yang dilewati 5% request paling lambat.");
    harus("Tabel ini mengalikan masukan Tahap 5 dengan 10");
    harus("Masalah Tahap 5 adalah salinan yang tertinggal");
  });
  test("data widget dan diagram: id, pilihan tebakan, dan label baris sama dengan kalkulator tetangga atau nilai yang dikunci", () => {
    expect(diagram.id).toBe("t5-m51-batas");
    expect(kalk.id).toBe("t5-m51-kalkulator");
    expect(kalk.tebak.pilihan).toEqual(["5 kali", "10 kali", "2 kali", "20 kali"]);
    const tetangga = DataKalkulator.parse(JSON.parse(baca("situs/data/widget/t4-estimasi-kalkulator.json")));
    expect(kalk.label).toEqual({ ...tetangga.label, lanjut: kalk.label.lanjut });
    expect(kalk.label.baris).toEqual({ user: "User terdaftar", dau: "User aktif per hari", reqHari: "Request per hari", rata: "Rata-rata, request per detik", puncak: "Puncak, request per detik" });
    expect([kalk.label.tebakDulu, kalk.label.ubah, kalk.label.asumsi, kalk.label.detik, kalk.label.ms]).toEqual(["Tebak dulu:", "Skenario", "asumsi", "detik", "ms"]);
  });
});

describe("tinjauan 5.29: jawaban tebakan belum tertulis, asal angka enam, nama batas uji sama dengan 5.13, pelunak pgbench", () => {
  const tanpaNoscript = badan.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  test("jawaban tebakan kalkulator (5 kali, 6.944,4, 6.900) hanya di noscript, bukan di prosa yang terlihat sebelum menebak", () => {
    expect(badan).toContain("Jawaban tebakan adalah 5 kali.");
    expect(tanpaNoscript).not.toMatch(/\b5 kali\b/);
    expect(tanpaNoscript).not.toContain(angka(aktif10.puncak, 1));
    expect(tanpaNoscript).not.toContain(duaAngka(aktif10.puncak));
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]).toBe("5 kali");
    expect(kalk.skenario[kalk.tebak.skenario]!.label).toBe("Aktif 10%");
  });
  test("jawaban tebakan blok Yang Raka kira ('Belum') tidak ada di prosa sebelum details.question", () => {
    const blok = badan.split('<Blok nama="Yang Raka kira" buka>')[1]!.split('<details class="question">')[0]!;
    expect(blok).not.toMatch(/\bBelum\b|\bsebagian\b/i);
    expect(blok).toContain("Satu rekaman beban Tahap 5 ada di repo.");
  });
  test("enam panggilan di baris skor risiko berasal dari 5.13 dan rekaman latensi; batas uji 50 ms memakai nama 5.13, bukan 'anggaran' untuk lab", () => {
    expect(hal513).toContain("Satu transaksi melewati enam panggilan: masuk kirim, perangkat ambil, perangkat kirim, riwayat ambil, riwayat kirim, masuk ambil hasil.");
    expect(hal513).toContain("Batas uji 50 ms di lab adalah batas total satu transaksi alur skor (Asumsi lab)");
    expect(readmeGabung).toContain("dibagi enam panggilan");
    expect(badan).toContain("Satu transaksi di tiga proses melewati enam panggilan, dan dengan jeda buatan 10 ms per panggilan batas bawahnya 6 × 10 = 60 ms.");
    expect(hitung(badan, "batas uji 50 ms")).toBe(2);
    expect(badan).not.toMatch(/anggaran alur skor|anggaran 50 ms/i);
    expect(hitung(badan, "Anggaran lompatan 50 ms di ADR 37")).toBe(1);
  });
  test("pgbench: pelunak 'possibly' di dokumentasi ikut ke halaman sebagai 'dapat lewat beberapa sesi'", () => {
    const r251 = riset.split("\n").find((b) => b.startsWith("| R5-251 |"))!;
    expect(r251).toContain("possibly in multiple concurrent database sessions");
    expect(badan).toContain("dapat lewat beberapa sesi bersamaan");
    expect(badan).not.toMatch(/berulang lewat beberapa sesi/);
  });
});
