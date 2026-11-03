// Penjaga halaman 5.8 (keputusan 1528 sampai 1530): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, skenario alur t5-m42.json, baris riset, dan kartu Cek diri di
// m42-database-utama-mati.mdx diturunkan dari rekaman labs/t5-replika (promosi.txt, jeda.txt), kode lab (t5-replika/run.py,
// api-t5 handler_pembayaran.go, service/pembayaran.go, repo/tx.go), README lab, rekaman Tahap 4 (retry.txt, rekon.txt), naskah
// Tahap 5, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 5.12): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas nilai) mengunci SETIAP
// baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap SALAHNYA kalimat;
// elemen non-prosa (frontmatter, judul Snippet, diagram, skenario, baris riset) dikunci dengan sidik jari di berkas nilai; tabel
// Hitungan dihitung ulang dari rumusnya sendiri dengan pembulatan setengah ke atas.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-m42-promosi.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./m42-database-utama-mati.halaman.nilai";

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
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
// Lapis pertahanan yang bisa dimatikan untuk uji mutasi tanpa kunci baris (TANPA_KUNCI=1) dan tanpa sidik jari (TANPA_SIDIK=1).
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";

const BERKAS = "situs/src/content/docs/tahap-5/m42-database-utama-mati.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t5-m42.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const promosi = baca("labs/t5-replika/output/promosi.txt");
const jeda = baca("labs/t5-replika/output/jeda.txt");
const runPy = baca("labs/t5-replika/run.py");
const readme = baca("labs/t5-replika/README.md");
const handlerGo = baca("labs/api-t5/internal/handler/handler_pembayaran.go");
const layananGo = baca("labs/api-t5/internal/service/pembayaran.go");
const txGo = baca("labs/api-t5/internal/repo/tx.go");
const retry = baca("labs/t4-webhook/output/retry.txt");
const prd5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal47 = baca("situs/src/content/docs/tahap-4/webhook-masuk.mdx");
const hal49 = baca("situs/src/content/docs/tahap-4/rekonsiliasi-gateway.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian?: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};
const fmt = (n: number, d = 0): string => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
// pembulatan setengah ke atas seperti pembaca (bukan toFixed)
const bulat = (x: number, d = 0): number => Math.round(x * 10 ** d + 1e-9) / 10 ** d;
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
const kata = (n: number): string => KATA[n]!;
const Kata = (n: number): string => kata(n).charAt(0).toUpperCase() + kata(n).slice(1);
const IDS = ["R5-145", "R5-146", "R5-147", "R5-148", "R5-149"];

// ---- rekaman: bagian, nomor baris, dan nilai sesudah perintah --------------------------------------------------------
const bagianRekaman = (isi: string, huruf: string): { awal: number; akhir: number; baris: string[]; teks: string } => {
  const semua = isi.split("\n");
  const a = semua.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(a, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const z = semua.findIndex((b, n) => n > a && /^# --- [A-Z]\d?\. /.test(b));
  const akhir = z < 0 ? semua.length : z;
  return { awal: a + 1, akhir, baris: semua.slice(a, akhir), teks: semua.slice(a, akhir).join("\n") };
};
const A = bagianRekaman(promosi, "A"), B = bagianRekaman(promosi, "B");
// nilai pada baris ketiga sesudah perintah psql (judul kolom, pemisah, nilai), kemunculan ke-n dari perintah berawalan itu
const nilai = (bag: { baris: string[] }, awalan: string, ke = 0): string => {
  const idx = bag.baris.map((b, n) => (b.startsWith(awalan) ? n : -1)).filter((n) => n >= 0);
  const i = idx[ke];
  expect(i, `perintah ${awalan} kemunculan ${ke}`).toBeDefined();
  expect(bag.baris[i! + 2]!.startsWith("---"), `pemisah sesudah ${awalan}`).toBe(true);
  return bag.baris[i! + 3]!.trim();
};
// nomor baris (1-based di berkas) pertama di bagian yang memenuhi syarat
const nomorBaris = (isi: string, ok: (b: string, n: number) => boolean, dariBaris = 1): number => {
  const semua = isi.split("\n");
  const i = semua.findIndex((b, n) => n + 1 >= dariBaris && ok(b, n + 1));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};

const FUNGSI_PROMOSI = cocok(runPy, /def rekam_promosi\(\):\n([\s\S]+?)\n\n\n# ---------- konflik\.txt/)[1]!;
const angkaDaftar = (s: string): number[] => s.split(",").map((x) => Number(x.replace(/_/g, "").trim()));
const NOMINAL = angkaDaftar(cocok(FUNGSI_PROMOSI, /nominal = \(([\d_, ]+)\)/)[1]!);
const DASAR_A = angkaDaftar(cocok(FUNGSI_PROMOSI, /dasar = \[bayar_diam\(t_budi, 505, n\) for n in \(([\d_, ]+)\)\]/)[1]!);
const JUMLAH_LIMA = NOMINAL.reduce((a, b) => a + b, 0); // 150.000
const JURNAL_ADA_PRIMARY = Number(nilai(A, "primary=> SELECT count(*) AS jurnal_ada", 0));
const JURNAL_ADA_REPLIKA_SEBELUM = Number(nilai(A, "replika=> SELECT count(*) AS jurnal_ada", 0));
const JURNAL_ADA_REPLIKA_SESUDAH = Number(nilai(A, "replika=> SELECT count(*) AS jurnal_ada", 1));
const SALDO_PRIMARY = Number(nilai(A, "primary=> SELECT saldo_cache AS saldo_warung_505"));
const SALDO_BARU = Number(nilai(A, "replika=> SELECT saldo_cache AS saldo_warung_505"));
const BAYAR_PRIMARY_A = Number(nilai(A, "primary=> SELECT count(*) AS jurnal_bayar"));
const BAYAR_BARU_A = Number(nilai(A, "replika=> SELECT count(*) AS jurnal_bayar"));
const JUMLAH_ID_LIMA = cocok(A.teks, /AS jurnal_ada FROM t5_ledger\.jurnal WHERE id IN \(([\d, ]+)\)/)[1]!.split(",").length;
const JURNAL_ADA_SINKRON = Number(nilai(B, "sinkron=> SELECT count(*) AS jurnal_ada"));
const JUMLAH_ID_TIGA = cocok(B.teks, /AS jurnal_ada FROM t5_ledger\.jurnal WHERE id IN \(([\d, ]+)\)/)[1]!.split(",").length;
const BAYAR_PRIMARY_B = Number(nilai(B, "primary=> SELECT count(*) AS jurnal_bayar"));
const BAYAR_BARU_B = Number(nilai(B, "sinkron=> SELECT count(*) AS jurnal_bayar"));
const NOMINAL_KEEMPAT = Number(cocok(B.teks, /"nominal": (\d+)/)[1]);
const BATAS_DETIK = Number(cocok(B.teks, /curl --max-time (\d+)/)[1]);

// ---- hitungan: registry, naskah, PRD ---------------------------------------------------------------------------------
const asumsi = (cerita.tahap[4] as unknown as { asumsi: Record<string, number> }).asumsi;
const barisM42 = naskah.split("\n").find((b) => b.startsWith("| M42 |"))!;
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Transaksi uang (bayar, transfer, QR) |"))!;
const barisTopup = naskah.split("\n").find((b) => b.startsWith("| Top-up dari bank |"))!;
const barisRpo = naskah.split("\n").find((b) => b.startsWith("| RPO replica asinkron |"))!;
const AKTIF = (asumsi.user! * asumsi.aktif!) / 100; // 200.000
const TRX = Number(cocok(barisBeban, /200\.000 × (\d) = 600\.000 per hari/)[1]); // 3 (naskah); registry trx 2 di sebelahnya
const TRX_REGISTRY = asumsi.trx!;
const DETIK = Number(cocok(prd5, /600\.000 ÷ ([\d.]+) × 10 \(asumsi\)/)[1]!.replace(".", ""));
const TOPUP_PER_HARI = Number(cocok(barisTopup, /\| ([\d.]+) per hari \|/)[1]!.replace(".", ""));
const JEDA_DETIK = Number(cocok(barisRpo, /jeda (\d) detik \(Asumsi\)/)[1]);
const RTO = Number(cocok(prd5, /pulih dalam (\d+) menit \(RTO\)/)[1]);
const GANGGUAN = Number(cocok(barisM42, /gagal (\d+) menit sampai Dewi/)[1]);
const PUNCAK_TRX3 = (AKTIF * TRX) / DETIK * asumsi.puncak!; // 69,44
const PUNCAK_TRX2 = (AKTIF * TRX_REGISTRY) / DETIK * asumsi.puncak!; // 46,30
const PUNCAK_TOPUP = (TOPUP_PER_HARI / DETIK) * asumsi.puncak!; // 5,787

// ---- kode lab --------------------------------------------------------------------------------------------------------
const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]!);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]!);
const hGo = handlerGo.split("\n");
const hAwal = nomorBaris(handlerGo, (b) => b.startsWith("// POST /webhooks/pembayaran: kabar dari gateway"));
const hAkhir = nomorBaris(handlerGo, (b) => b.trim() === "tulisJSON(w, 200, h)", hAwal);
const tAwal = nomorBaris(txGo, (b) => b.startsWith("// DalamTx menjalankan fn dalam satu transaction"));
const tAkhir = nomorBaris(txGo, (b) => b === "}", tAwal);
// rekaman: bagian A lima pembayaran (dari komentar 'Primary terus menerima' sampai nilai nol di replika), saldo (dari query saldo primary
// sampai komentar selisih), primary lama (dari jurnal_bayar primary sampai komentar fencing), bagian B (dari curl sampai komentar tiga jurnal)
const sA1 = nomorBaris(promosi, (b) => b.startsWith("# Primary terus menerima pembayaran"));
const sA1Akhir = nomorBaris(promosi, (b, n) => n > sA1 + 5 && b.startsWith("replika=> SELECT count(*) AS jurnal_ada"), sA1) + 5 - 1 + 0;
const sA3 = nomorBaris(promosi, (b) => b.startsWith("primary=> SELECT saldo_cache AS saldo_warung_505"));
const sA3Akhir = nomorBaris(promosi, (b) => b.startsWith("# Selisih saldo Warung 505"), sA3);
const sA5 = nomorBaris(promosi, (b) => b.startsWith("primary=> SELECT count(*) AS jurnal_bayar"), A.awal);
const sA5Akhir = nomorBaris(promosi, (b) => b.startsWith("# Fencing (menghentikan primary lama"), sA5);
const sB = nomorBaris(promosi, (b) => b.startsWith("$ curl -i -X POST '/transfers'"), B.awal);
const sBAkhir = nomorBaris(promosi, (b) => b.startsWith("# Ketiga jurnal yang dijawab 201 sebelum pemutusan"), sB);

// ---- registry, meta, susunan blok, dan tautan ---------------------------------------------------------------------------
describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.8 ada, masalah, jalur inti, prasyarat 4.9 lalu 5.7 (urutan ini menjaga baris meta tidak membungkus berbeda saat font tukar), lab t5-replika, peran backend; judul sama dengan peta naskah; menit = baca + coba", () => {
    expect(dari("t5-m42")).toMatchObject({ ada: true, nomor: "5.8", jenis: "masalah", inti: true, prasyarat: ["t4-rekonsiliasi", "t5-lag"], lab: ["t5-replika"], tahap: 5, peran: ["backend"] });
    expect(dari("t5-lag").nomor).toBe("5.7");
    expect(dari("t4-rekonsiliasi").nomor).toBe("4.9");
    expect(frontmatter).toContain('title: "5.8 M42: Database utama mati, dua top-up hilang"');
    expect(dari("t5-m42").judul).toBe("M42: Database utama mati, dua top-up hilang");
    expect(naskah).toContain("| 5.8 | 4 | M42: Database utama mati, dua top-up hilang | Masalah | ★ | t5-replika | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-rekonsiliasi\]\], \[\[t5-lag\]\] · Jalur inti<\/p>/);
    expect(dari("t5-m42").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t2-ledger", "t4-rekonsiliasi", "t4-webhook", "t5-lag", "t5-prd", "t5-read-replica", "t5-rpo-rto"]);
    const sesuai: [string, string, string][] = [
      ["t2-ledger", "2.7", "Ledger double-entry"], ["t4-rekonsiliasi", "4.9", "Rekonsiliasi dengan gateway"], ["t4-webhook", "4.7", "Webhook masuk"],
      ["t5-lag", "5.7", "Replication lag dan read-your-writes"], ["t5-prd", "5.1", "PRD v5"], ["t5-read-replica", "5.5", "Read replica dan model baca"],
      ["t5-rpo-rto", "5.9", "RPO, RTO, replica sinkron, dan failover"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("5.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("halaman tidak membuka isi 5.7 dan 5.9: ADR 34, 35, 47, dan 48 masing-masing satu kali; tanpa Patroni, CloudNativePG, kuorum, pg_rewind, token LSN", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 34", "ADR 35", "ADR 47", "ADR 48"]);
    for (const a of ["ADR 34", "ADR 35", "ADR 47", "ADR 48"]) expect(badan.match(new RegExp(a, "g")), a).toHaveLength(1);
    expect(badan).not.toMatch(/Patroni|CloudNativePG|kuorum|quorum|pg_rewind|X-Lsn|token LSN|token/i);
    expect(naskah).toContain("| 48 | Ledger memakai replica sinkron kuorum");
    expect(naskah).toContain("| 47 | ");
  });
  test("kalimat sumber di halaman tetangga ada: backup harian 24 jam dan RPO nol di PRD v5, 2xx satu kiriman dan balasan sesudah COMMIT di 4.7, definisi tidak_di_ledger di 4.9", () => {
    expect(prd5).toContain("Backup harian berjendela sampai 24 jam, sedangkan PRD v5 menulis RPO nol dan RTO 15 menit");
    expect(prd5).toContain("RPO adalah titik waktu terakhir yang harus bisa dipulihkan sesudah gangguan, jadi data terakhir yang boleh hilang. RTO adalah lama waktu paling lama sampai sistem pulih.");
    expect(prd5).toContain("Angka ini Asumsi produk");
    expect(hal47).toContain("Jawaban 2xx menghasilkan 1 kiriman");
    expect(hal47).toContain("**Balasan 2xx dikirim sesudah COMMIT.**");
    expect(hal49).toContain("| `tidak_di_ledger` | Order ada di laporan, tetapi Rekeningo tidak punya top-up untuk order itu atau top-up belum `dibayar` |");
    expect(retry).toMatch(/^ 200\s+\| 1\s+\| 0\s+\| diterima$/m);
    expect(retry).toContain("2xx tanpa ulangan");
  });
});

// ---- naskah M42: gejala, yang dikira, dan yang sebenarnya ---------------------------------------------------------------
describe("naskah M42: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M42 di naskah: minggu 4, Sabtu 02.10, 23 menit, Dewi, Senin pagi, Rp200.000 dan Rp75.000 (Ilustrasi), gateway tidak mengirim webhook, backup harian", () => {
    const sel = barisM42.split("|").map((x) => x.trim());
    expect(sel[2]).toBe("4");
    expect(sel[3]).toContain("Sabtu 02.10 mesin database utama restart karena pembaruan kernel yang tidak dijadwalkan");
    expect(sel[3]).toContain(`Pembayaran gagal ${GANGGUAN} menit sampai Dewi mempromosikan replica`);
    expect(sel[3]).toContain("Senin pagi rekonsiliasi Pak Hadi menemukan dua top-up, Rp200.000 dan Rp75.000, yang gateway tandai dibayar dan ledger tidak punya (Ilustrasi)");
    expect(sel[4]).toContain("Gateway tidak mengirim webhook. Raka: minta kirim ulang. Backup harian bisa memulihkan");
    expect(barisM42).toContain("Handler sudah membalas 2xx sesudah COMMIT (ADR 34)");
    expect(barisM42).toContain("Hanya rekonsiliasi yang menemukannya (`tidak_di_ledger`, ADR 35)");
  });
  test("Gejala: minggu, jam, lama gangguan, dan kedua jumlah rupiah sama dengan naskah; tanpa kalimat definisi", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf('<Blok nama="Yang Raka kira" buka>'));
    expect(gejala).toContain("Minggu 4. Sabtu pukul 02.10 mesin database utama restart karena pembaruan kernel yang tidak dijadwalkan.");
    expect(gejala).toContain(`Pembayaran gagal selama ${GANGGUAN} menit, sampai Dewi mempromosikan replica.`);
    expect(gejala).toContain("Senin pagi rekonsiliasi Pak Hadi menemukan dua top-up, Rp200.000 dan Rp75.000, yang gateway tandai dibayar dan ledger tidak punya.");
    expect(gejala).toContain(`hari, pukul 02.10, ${GANGGUAN} menit, dan kedua jumlah rupiah berasal dari naskah, bukan dari rekaman`);
    expect(gejala).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/i);
  });
  test("tebakan di blok Yang Raka kira: pertanyaannya tentang replica dan jawabannya di dalam details, tidak terbuka di paragraf sebelumnya", () => {
    const m = cocok(badan, /<details class="question">\n<summary>(.+)<\/summary>\n\n([\s\S]+?)\n<\/details>/);
    expect(m[1]).toBe("Tebak dulu: kedua top-up sudah dijawab 200 sesudah COMMIT di primary. Apakah keduanya pasti ada di replica yang dipromosikan?");
    expect(m[2]).toContain("Tidak pasti.");
    expect(m[2]).toContain("Yang belum terjamin adalah apakah replica sudah menyalinnya.");
    expect(m[2]).toContain("Blok berikutnya memuat dasarnya dan rekamannya.");
    expect(badan.indexOf('<Blok nama="Yang sebenarnya">')).toBeGreaterThan(badan.indexOf("Blok berikutnya memuat dasarnya dan rekamannya."));
    const sebelum = badan.slice(0, badan.indexOf('<details class="question">'));
    // jawabannya ("tidak pasti", replica belum tentu menyalin) tidak boleh sudah tertulis sebelum pertanyaan
    expect(sebelum).not.toContain("Tidak pasti.");
    expect(sebelum).not.toContain("belum terjamin");
    expect(sebelum).not.toMatch(/replica asinkron (bisa|boleh) tertinggal/);
    expect(badan.indexOf("Tidak pasti.")).toBeGreaterThan(badan.indexOf('<details class="question">'));
  });
  test("selisih lab dan naskah di README: pembayaran bukan top-up, primary tidak dimatikan, tanpa fencing, ANY 1 dan Patroni tidak dijalankan, synchronous_commit bawaan on", () => {
    expect(readme).toContain("Primary lama tetap menerima tulisan sesudah node baru dipromosikan; lab ini tidak punya fencing.");
    expect(readme).toContain("Patroni dan CloudNativePG **Tidak dijalankan**");
    expect(readme).toContain("`ANY 1` dari dua kandidat sinkron **Tidak dijalankan**");
    expect(readme).toContain("`synchronous_commit` bawaan `on`");
    expect(readme).toContain("Jumlahnya adalah yang dijawab sesudah pemutusan (5 di lab), bukan hasil kali jeda dan laju.");
    expect(readme).toContain("Hitungan naskah 69 transaksi per jeda 1 detik tetap Hitungan atas Asumsi.");
    expect(badan).toContain("Lab merekam pembayaran ke Warung 505, bukan top-up.");
    expect(badan).toContain("Lima adalah jumlah pembayaran yang dijawab sesudah koneksi putus, bukan hasil kali jeda dan laju.");
  });
});

// ---- rekaman promosi.txt, jeda.txt, run.py -----------------------------------------------------------------------------
describe("rekaman promosi.txt dan run.py: bagian, angka, dan rentang Snippet", () => {
  test("enam Snippet: berkas, rentang, dan judul diturunkan dari struktur rekaman dan kode, bukan angka tangan", () => {
    expect(berkasSnippet).toEqual([
      "labs/api-t5/internal/handler/handler_pembayaran.go", "labs/api-t5/internal/repo/tx.go",
      "labs/t5-replika/output/promosi.txt", "labs/t5-replika/output/promosi.txt", "labs/t5-replika/output/promosi.txt", "labs/t5-replika/output/promosi.txt",
    ]);
    expect(lines).toEqual([`${hAwal}:${hAkhir}`, `${tAwal}:${tAkhir}`, `${sA1}:${sA1Akhir}`, `${sA3}:${sA3Akhir}`, `${sA5}:${sA5Akhir}`, `${sB}:${sBAkhir}`]);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t5/internal/handler/handler_pembayaran.go baris ${hAwal} sampai ${hAkhir} (awal webhookPembayaran)`,
      `Kode lab: labs/api-t5/internal/repo/tx.go baris ${tAwal} sampai ${tAkhir} (DalamTx)`,
      "Rekaman lab: labs/t5-replika/output/promosi.txt, bagian A (lima pembayaran sesudah koneksi putus)",
      "Rekaman lab: labs/t5-replika/output/promosi.txt, bagian A (saldo Warung 505)",
      "Rekaman lab: labs/t5-replika/output/promosi.txt, bagian A (primary lama masih menerima tulisan)",
      "Rekaman lab: labs/t5-replika/output/promosi.txt, bagian B (standby sinkron)",
    ]);
    expect(tag[0]).toContain('lang="go"');
    expect(tag[1]).toContain('lang="go"');
    for (const t of tag.slice(2)) expect(t).not.toContain("lang=");
    // rentang rekaman berada di bagian yang disebut judulnya
    for (const [a, b] of [[sA1, sA1Akhir], [sA3, sA3Akhir], [sA5, sA5Akhir]]) {
      expect(a).toBeGreaterThan(A.awal);
      expect(b).toBeLessThan(B.awal);
    }
    expect(sB).toBeGreaterThan(B.awal);
    expect(sBAkhir).toBeLessThanOrEqual(B.akhir);
    expect(sA1Akhir - sA1 + 1).toBe(12);
  });
  test("bagian A: tiga pembayaran dasar, lima pembayaran sesudah putus (Rp10.000 sampai Rp50.000), primary 5 dan replica 0 sebelum dan sesudah promosi, pg_is_in_recovery f", () => {
    expect(DASAR_A).toEqual([1000, 2000, 3000]);
    expect(NOMINAL).toEqual([10000, 20000, 30000, 40000, 50000]);
    expect(JUMLAH_ID_LIMA).toBe(NOMINAL.length);
    expect([JURNAL_ADA_PRIMARY, JURNAL_ADA_REPLIKA_SEBELUM, JURNAL_ADA_REPLIKA_SESUDAH]).toEqual([NOMINAL.length, 0, 0]);
    expect(A.teks).toContain("$ POST /transfers lima kali ke Warung 505 (Rp10.000 sampai Rp50.000), semua 201");
    expect(nilai(A, "replika=> SELECT count(*) AS penerima_wal")).toBe("0");
    expect(nilai(A, "replika=> SELECT pg_is_in_recovery() AS standby")).toBe("f");
    expect(nilai(A, "replika=> SELECT pg_promote(wait => true)")).toBe("t");
    expect(A.teks).toContain("ALTER ROLE replikator_laporan NOLOGIN");
    expect(A.teks).toContain("Lima jurnal yang dijawab 201 ada di primary lama dan tidak ada di node baru: lima pembayaran hilang dari sudut pandang node baru.");
  });
  test("bagian A: invarian ledger 0 dan 0 di kedua node; saldo Warung 505 primary dan node baru; selisih = jumlah lima pembayaran; jurnal bayar 9 lawan 3 (3 dasar + 5 + 1)", () => {
    const inv = A.baris.map((b, n) => (b.startsWith(" buku_selisih | jumlah_semua_posting") ? A.baris[n + 2]!.replace(/\s+/g, " ").trim() : null)).filter(Boolean);
    expect(inv).toEqual(["0 | 0", "0 | 0"]);
    expect(SALDO_BARU).toBe(DASAR_A.reduce((a, b) => a + b, 0));
    expect(SALDO_PRIMARY - SALDO_BARU).toBe(JUMLAH_LIMA);
    expect(SALDO_PRIMARY).toBe(156000);
    expect(BAYAR_PRIMARY_A).toBe(DASAR_A.length + NOMINAL.length + 1);
    expect(BAYAR_BARU_A).toBe(DASAR_A.length);
    expect(A.teks).toContain("Selisih saldo Warung 505 antara primary lama dan node baru: Rp150.000, sama dengan jumlah lima pembayaran yang hilang.");
    expect(A.teks).toContain("Fencing (menghentikan primary lama sebelum node baru menerima tulisan) tidak ada di lab ini: tidak ada yang menghentikan primary lama.");
    expect(runPy).toContain('harap([hitung_bayar("primary") - hitung_bayar("replika")], [6], "primary lama dan node baru berpisah")');
  });
  test("bagian B: FIRST 1, tiga jurnal 201 ada di node baru, pembayaran keempat Rp4.000 tanpa jawaban dalam 3 detik, WARNING dan DETAIL dari log, jurnal bayar 4 lawan 3", () => {
    expect(B.teks).toContain("ALTER SYSTEM SET synchronous_standby_names = 'FIRST 1 (replika_sinkron)'");
    expect(runPy).toContain('SINKRON_SATU = "FIRST 1 (replika_sinkron)"');
    expect(JUMLAH_ID_TIGA).toBe(3);
    expect(JURNAL_ADA_SINKRON).toBe(JUMLAH_ID_TIGA);
    expect(NOMINAL_KEEMPAT).toBe(4000);
    expect(BATAS_DETIK).toBe(3);
    expect(B.teks).toContain("(tidak ada jawaban)");
    expect(B.teks).toContain("WARNING:  canceling wait for synchronous replication due to user request");
    expect(B.teks).toContain("DETAIL:  The transaction has already committed locally, but might not have been replicated to the standby.");
    expect([BAYAR_PRIMARY_B, BAYAR_BARU_B]).toEqual([JUMLAH_ID_TIGA + 1, JUMLAH_ID_TIGA]);
    expect(B.teks).toContain("client tidak pernah menerima 201 untuknya.");
    expect(B.teks).toContain("COMMIT berhenti di SyncRep.");
  });
  test("kode run.py: primary tidak dimatikan di bagian A, atur_sinkron hanya di bagian B, tidak ada top-up, webhook, atau rekonsiliasi di folder lab t5-replika", () => {
    const fungsi = FUNGSI_PROMOSI;
    const sebelumB = fungsi.slice(0, fungsi.indexOf('bagian("B. '));
    expect(sebelumB).not.toMatch(/atur_sinkron|kompose\("(stop|kill|restart)"|d\.stop\(/);
    expect(fungsi.match(/atur_sinkron\(/g)).toHaveLength(1);
    expect(fungsi.slice(fungsi.indexOf('bagian("B. '))).toContain("atur_sinkron(SINKRON_SATU)");
    expect(fungsi).toContain('tanya("replika", "SELECT pg_promote(wait => true)")');
    expect(fungsi).toContain('tanya("sinkron", "SELECT pg_promote(wait => true)")');
    expect(fungsi).toContain('putus("replikator_laporan", "replika_laporan")');
    expect(fungsi).not.toMatch(/topup|top-up|webhook|rekon/i);
    // klaim negatif berlingkup labs/t5-replika (semua berkas terlacak): tidak ada top-up, webhook, atau rekonsiliasi
    const berkasLab = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/t5-replika/"));
    expect(berkasLab.length).toBeGreaterThan(6);
    const cocokTopup = berkasLab.filter((f) => /top-?up|webhook|rekonsiliasi|tidak_di_ledger/i.test(fs.readFileSync(path.join(akar, f), "utf8")));
    // satu-satunya penyebut: riwayat seed (jenis topup, Tunjangan makan) yang dibaca baca.txt, bukan top-up yang dijalankan lab
    expect(cocokTopup).toEqual(["labs/t5-replika/output/baca.txt"]);
    const seed = baca("labs/t5-replika/output/baca.txt").split("\n").filter((b) => /top-?up|webhook|rekonsiliasi|tidak_di_ledger/i.test(b));
    expect(seed.length).toBeGreaterThan(0);
    for (const b of seed) expect(b).toMatch(/"jenis":"topup","arah":"masuk","lawan":"Tunjangan makan","jumlah":250000/);
    expect(badan).toContain("Lab `t5-replika` tidak menjalankan top-up atau rekonsiliasi atas node baru (Tidak dijalankan)");
  });
  test("jeda.txt bagian A: 100 pembayaran per detik, replay_lag tertinggi di bawah 1 detik sebagai batas (nilai tidak direkam)", () => {
    const ja = bagianRekaman(jeda, "A");
    expect(ja.teks).toContain("$ ./beban -rps 100 -detik 10 -pengguna 200 -hanya-bayar");
    expect(ja.teks).toContain("replay_lag tertinggi di kedua standby di bawah 1 detik (batas lab; nilai tidak direkam): ya");
    expect(badan).toContain("Lab merekam batas jeda pada 100 pembayaran per detik: `replay_lag` tertinggi di bawah 1 detik di kedua standby (`jeda.txt` bagian A, nilai tidak direkam).");
  });
});

// ---- kode lab: webhook membalas 200 sesudah COMMIT -------------------------------------------------------------------------
describe("kode lab: balasan 200 webhook dan 201 pembayaran sesudah transaction selesai", () => {
  test("webhookPembayaran menulis 200 hanya di case err == nil sesudah TerimaWebhook; TerimaWebhook memanggil webhookAman", () => {
    const f = cocok(handlerGo, /func \(s Server\) webhookPembayaran\(([\s\S]+?)\n}\n/)[0];
    expect(f.indexOf("s.svc.TerimaWebhook(")).toBeLessThan(f.indexOf("tulisJSON(w, 200, h)"));
    expect(f).toMatch(/case err == nil:\n\t\ttulisJSON\(w, 200, h\)/);
    expect(f.match(/tulisJSON\(w, 200, h\)/g)).toHaveLength(1);
    expect(hGo.slice(hAwal - 1, hAkhir).join("\n")).toContain("Balasan 2xx hanya sesudah COMMIT");
    expect(layananGo).toContain("return s.webhookAman(ctx, k)");
  });
  test("webhookAman mengembalikan hasil sesudah DalamTx selesai; galat DalamTx dikembalikan sebagai galat (ROLLBACK)", () => {
    const f = cocok(layananGo, /func \(s Service\) webhookAman\([\s\S]+?\n}\n/)[0];
    const i = f.indexOf("err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {");
    const j = f.indexOf("if err != nil {\n\t\treturn HasilWebhook{}, err // ROLLBACK");
    const k = f.lastIndexOf("return h, nil");
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(k).toBeGreaterThan(j);
  });
  test("DalamTx: tx.Commit adalah pernyataan terakhir fungsi dan hasilnya dikembalikan", () => {
    const f = txGo.split("\n").slice(tAwal - 1, tAkhir).join("\n");
    expect(f.trimEnd().endsWith("return tx.Commit()\n}")).toBe(true);
    expect(f).toContain("COMMIT kalau fn mengembalikan nil, ROLLBACK kalau tidak");
    expect(txGo.split("\n")[tAwal - 1]).toBe("// DalamTx menjalankan fn dalam satu transaction: COMMIT kalau fn mengembalikan nil, ROLLBACK kalau tidak.");
  });
});

// ---- hitungan -----------------------------------------------------------------------------------------------------------
describe("hitungan: tabel Hitungan dihitung ulang dari angka yang tertulis di halaman", () => {
  const tabel = cocok(badan, /\| Besaran \| Rumus \| Hasil \|\n\| --- \| --- \| --- \|\n([\s\S]+?)\n\n/)[1]!.split("\n").map((b) => b.split("|").slice(1, -1).map((x) => x.trim()));
  test("masukan: 200.000 aktif, 3 lawan registry 2, 86.400 detik, puncak 10, 50.000 top-up per hari, jeda 1 detik, RTO 15, gangguan 23 menit", () => {
    expect([AKTIF, TRX, TRX_REGISTRY, DETIK, asumsi.puncak, TOPUP_PER_HARI, JEDA_DETIK, RTO, GANGGUAN]).toEqual([200000, 3, 2, 86400, 10, 50000, 1, 15, 23]);
    expect(badan).toContain("- 200.000 user aktif, dan 3 transaksi uang per user aktif per hari (registry menulis 2).");
    expect(badan).toContain("- 86.400 detik per hari dan faktor puncak 10.");
    expect(badan).toContain("- 50.000 top-up dari bank per hari.");
  });
  test("tujuh baris: rumus tertulis dan hasil dihitung ulang dengan pembulatan setengah ke atas", () => {
    const f = (n: number) => fmt(n, 0);
    expect(tabel).toHaveLength(7);
    expect(tabel[0]).toEqual(["Transaksi uang per detik di puncak", `${f(AKTIF)} × ${TRX} ÷ ${f(DETIK)} × ${asumsi.puncak}`, fmt(bulat(PUNCAK_TRX3, 1), 1)]);
    expect(tabel[1]).toEqual(["Dengan 2 transaksi per user aktif", `${f(AKTIF)} × ${TRX_REGISTRY} ÷ ${f(DETIK)} × ${asumsi.puncak}`, fmt(bulat(PUNCAK_TRX2, 1), 1)]);
    expect(tabel[2]).toEqual(["Top-up dari bank per detik di puncak", `${f(TOPUP_PER_HARI)} ÷ ${f(DETIK)} × ${asumsi.puncak}`, fmt(bulat(PUNCAK_TOPUP, 2), 2)]);
    expect(tabel[3]).toEqual(["Transaksi uang dalam jeda 1 detik", `${JEDA_DETIK} × ${fmt(bulat(PUNCAK_TRX3, 1), 1)}`, f(bulat(JEDA_DETIK * bulat(PUNCAK_TRX3, 1)))]);
    expect(tabel[4]).toEqual(["Dengan 2 transaksi per user aktif", `${JEDA_DETIK} × ${fmt(bulat(PUNCAK_TRX2, 1), 1)}`, f(bulat(JEDA_DETIK * bulat(PUNCAK_TRX2, 1)))]);
    expect(tabel[5]).toEqual(["Top-up dalam jeda 1 detik", `${JEDA_DETIK} × ${fmt(bulat(PUNCAK_TOPUP, 2), 2)}`, f(bulat(JEDA_DETIK * bulat(PUNCAK_TOPUP, 2)))]);
    expect(tabel[6]).toEqual(["Gangguan di cerita melewati RTO", `${GANGGUAN} − ${RTO}`, `${GANGGUAN - RTO} menit`]);
    // hasil terkunci literal supaya pembulatan toFixed (69,44 → 69,4 sama, 5,787 → 5,79) tidak menggantikan setengah ke atas
    expect(tabel.map((r) => r[2])).toEqual(["69,4", "46,3", "5,79", "69", "46", "6", "8 menit"]);
  });
  test("naskah: 69 dan 46 sama dengan baris RPO replica asinkron; top-up 5,79 sama dengan naskah dan PRD; 69 adalah transaksi uang (bayar, transfer, QR)", () => {
    expect(barisRpo).toContain("69 transaksi bisa hilang saat failover (trx 2: 46)");
    expect(barisTopup).toContain("5,79 puncak");
    expect(prd5).toContain("| Top-up dari bank per detik di puncak | 5,79 |");
    expect(prd5).toContain("| Transaksi uang per hari (bayar, transfer, QR) | 600.000 |");
    expect(barisBeban).toContain("| Transaksi uang (bayar, transfer, QR) |");
    // nilai puncak yang halaman ini hitung ulang sama dengan yang naskah tulis (rata-rata trx 2 = puncak ÷ faktor puncak)
    expect(barisBeban).toContain(`${fmt(bulat(PUNCAK_TRX3, 1), 1)} puncak (trx ${TRX_REGISTRY}: ${fmt(bulat(PUNCAK_TRX2 / asumsi.puncak!, 2), 2)} dan ${fmt(bulat(PUNCAK_TRX2, 1), 1)})`);
    expect(barisBeban).toContain(`${fmt(bulat(PUNCAK_TRX3 / asumsi.puncak!, 2), 2)} rata-rata dan`);
    expect(badan).toContain("Angka 69 adalah transaksi uang: bayar, transfer, dan QR. Top-up dari bank dihitung terpisah, dan jeda yang sama hanya memuat sekitar 6 top-up.");
    expect(badan).toContain("Pukul 02.10 lajunya jauh lebih kecil dari puncak, sehingga cerita hanya menemukan dua (Ilustrasi).");
  });
  test("label hasil rumus mengikuti masukan terlemahnya: Asumsi atau Ilustrasi, bukan Rekaman lab; label Hitungan didefinisikan di pemakaian pertama", () => {
    expect(badan).toContain("Jeda 1 detik dan RTO 15 menit adalah Asumsi, dan 23 menit adalah Ilustrasi, jadi tiap hasil di tabel adalah Hitungan atas Asumsi atau Ilustrasi.");
    expect(badan).toContain("15 menit adalah Asumsi produk di PRD v5.");
    expect(badan.match(/Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini/g)).toHaveLength(1);
    expect(badan.indexOf("Hitungan adalah hasil rumus")).toBeLessThan(badan.indexOf("Hitungan atas"));
    // selisih Rp150.000 dihitung dari rekaman, jadi berlabel Rekaman lab, bukan Asumsi
    expect(badan).toContain(`Selisihnya Rp150.000, sama dengan ${NOMINAL.map((n) => fmt(n)).join(" + ")}.`);
    expect(badan).toContain("dan labelnya mengikuti masukan terlemahnya, di sini Rekaman lab.");
  });
});

// ---- sumber luar: baris riset, tanggal akses, tautan, dan kutipan ---------------------------------------------------------
describe("sumber luar: baris riset, tanggal akses, tautan, dan kutipan", () => {
  test("lima baris riset ada, bernomor berurutan R5-145 sampai R5-149, tanpa ganda; tanggal akses sama dengan tanggal di halaman", () => {
    const nomor = [...riset.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => m[1]!);
    for (const id of IDS) expect(nomor.filter((x) => x === id), id).toHaveLength(1);
    const i = nomor.indexOf("R5-145");
    expect(nomor.slice(i, i + 5)).toEqual(IDS);
    const tanggal = [...badan.matchAll(/dibuka (2026-\d\d-\d\d)/g)].map((m) => m[1]!);
    expect(tanggal).toHaveLength(3);
    for (const t of tanggal) expect(t).toBe("2026-11-03");
    for (const id of IDS.slice(0, 3)) expect(barisRiset(id), id).toContain("dibuka 2026-11-03");
    for (const id of IDS.slice(0, 3)) expect(barisRiset(id).match(/dibuka 2026-\d\d-\d\d/g), id).toHaveLength(1);
    expect(barisRiset("R5-149")).toContain("dibaca 2026-11-03");
  });
  test("empat tautan eksternal: URL sama dengan baris riset; teks tautan deskriptif; tidak ada ID riset atau nomor keputusan di halaman, diagram, skenario, dan kartu", () => {
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!]);
    expect(tautan).toEqual([
      ["PostgreSQL 17: konfigurasi WAL", "https://www.postgresql.org/docs/17/runtime-config-wal.html"],
      ["PostgreSQL 17: failover", "https://www.postgresql.org/docs/17/warm-standby-failover.html"],
      ["PostgreSQL 17: replikasi sinkron", "https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION"],
    ]);
    const rujuk: Record<string, string> = { "R5-146": "postgresql.org/docs/17/runtime-config-wal.html", "R5-145": "postgresql.org/docs/17/warm-standby-failover.html", "R5-147": "postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION" };
    // URL utuh: tidak boleh diikuti huruf, angka, atau tanda yang memperpanjangnya (anchor salah ketik tetap memuat URL yang benar sebagai awalan)
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const [id, url] of Object.entries(rujuk)) expect(barisRiset(id), id).toMatch(new RegExp(esc(url) + "(?![\\w#/.-])"));
    expect(badan.match(/\]\(https:/g)).toHaveLength(3);
    const semuaTeks = [badan, JSON.stringify(diagramMentah), skenarioMentah, JSON.stringify(kartuSemua.filter((k) => k.halaman === "t5-m42")), frontmatter].join("\n");
    expect(semuaTeks).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(semuaTeks).not.toMatch(/keputusan \d{3,4}|PR #?\d{3}|#\d{3}\b/);
  });
  test("R5-145: tiga kalimat dokumentasi failover utuh di baris riset (tanpa pelunak yang dibuang); halaman menulis 'bisa' dan 'berujung', tidak lebih kuat", () => {
    const b = barisRiset("R5-145");
    expect(b).toContain("PostgreSQL does not provide the system software required to identify a failure on the primary and notify the standby database server.");
    expect(b).toContain("To trigger failover of a log-shipping standby server, run pg_ctl promote or call pg_promote().");
    expect(b).toContain("you must have a mechanism for informing the old primary that it is no longer the primary.");
    expect(b).toContain("which is necessary to avoid situations where both systems think they are the primary, which will lead to confusion and ultimately data loss.");
    expect(badan).toContain("kedua server bisa sama-sama merasa primary, dan itu berujung pada kebingungan dan kehilangan data");
    expect(badan).toContain("PostgreSQL tidak menyediakan perangkat lunak yang mengenali kegagalan primary dan memberi tahu standby.");
    expect(badan).toContain("dipicu dengan `pg_ctl promote` atau `pg_promote()`");
  });
  test("R5-146: synchronous_commit — kosong berarti hanya on dan off bermakna, local tanpa replikasi, off tanpa menunggu, on menunggu flush di standby; halaman memakai tiga di antaranya", () => {
    const b = barisRiset("R5-146");
    expect(b).toContain("If synchronous_standby_names is empty, the only meaningful settings are on and off; remote_apply, remote_write and local all provide the same local synchronization level as on.");
    expect(b).toContain("The local behavior of all non-off modes is to wait for local flush of WAL to disk.");
    expect(b).toContain("The setting local causes commits to wait for local flush to disk, but not for replication.");
    expect(b).toContain("When set to on, commits wait until replies from the current synchronous standby(s) indicate they have received the commit record of the transaction and flushed it to durable storage.");
    expect(badan).toContain("Bila `synchronous_standby_names` kosong, semua nilai `synchronous_commit` selain `off` hanya menunggu penyimpanan lokal");
    expect(badan).toContain("menulis bahwa commit menunggu standby bila `synchronous_standby_names` terisi dan `synchronous_commit` bernilai `on`, `remote_write`, atau `remote_apply`. Nilai `local` tidak menunggu replikasi, dan `off` tidak menunggu apa pun (sumber yang sama).");
  });
  test("R5-147: replikasi sinkron — restart saat commit menunggu, sebagian transaksi tidak tampak di standby, jaminannya konfirmasi; halaman menulis lingkup restart dan menyebut jurnal keempat lewat pembatalan", () => {
    const b = barisRiset("R5-147");
    expect(b).toContain("If primary restarts while commits are waiting for acknowledgment, those waiting transactions will be marked fully committed once the primary database recovers.");
    expect(b).toContain("Some transactions may not show as committed on the standby, even though they show as committed on the primary.");
    expect(b).toContain("The guarantee we offer is that the application will not receive explicit acknowledgment of the successful commit of a transaction until the WAL data is known to be safely received by all the synchronous standbys.");
    expect(badan).toContain("Untuk primary yang restart selagi commit menunggu, dokumentasi menulis bahwa sebagian transaksi bisa tampak ter-commit di primary tetapi tidak di standby.");
    expect(badan).toContain("Jurnal keempat di lab sampai ke keadaan itu lewat pembatalan penantian, bukan restart.");
  });
  test("R5-148 dan R5-149: angka di baris riset sama dengan rekaman dan hitungan ulang", () => {
    const b = barisRiset("R5-148");
    for (const s of ["jurnal 10204 sampai 10208 ada 5 di primary dan 0 di replica", "saldo Warung 505 156000 di primary dan 6000 di node baru", "jurnal bayar 9 di primary lama dan 3 di node baru", "jurnal 10201 sampai 10203 ada 3", "jurnal bayar 4 di primary lama dan 3 di node baru", "pembayaran Rp4.000 tanpa jawaban sampai batas 3 detik"]) expect(b, s).toContain(s);
    const h = barisRiset("R5-149");
    expect(h).toContain(`${fmt(AKTIF)} × ${TRX} ÷ ${fmt(DETIK)} × ${asumsi.puncak} = 69,44 (ditulis 69,4)`);
    expect(h).toContain("200.000 × 2 ÷ 86.400 × 10 = 46,30 (46,3)");
    expect(h).toContain("50.000 ÷ 86.400 × 10 = 5,787 (5,79)");
    expect(h).toContain("1 × 5,79 = 5,79 (ditulis 6)");
    expect(h).toContain(`${GANGGUAN} − ${RTO} = ${GANGGUAN - RTO}`);
    expect(h).toContain(`${NOMINAL.map((n) => fmt(n)).join(" + ")} = ${fmt(JUMLAH_LIMA)} = ${fmt(SALDO_PRIMARY)} − ${fmt(SALDO_BARU)}`);
    expect(bulat(PUNCAK_TRX3, 2)).toBe(69.44);
    expect(bulat(PUNCAK_TRX2, 2)).toBe(46.3);
    expect(bulat(PUNCAK_TOPUP, 3)).toBe(5.787);
  });
  test("baris riset sumber luar: kolom 'Berubah sejak' menulis Tidak berubah dengan tanggal cek yang sama dengan tanggal akses di kolom sumber", () => {
    for (const id of ["R5-145", "R5-146", "R5-147"]) {
      const sel = barisRiset(id).split("|").map((x) => x.trim());
      const akses = cocok(sel[3]!, /dibuka (\d{4}-\d{2}-\d{2})/)[1]!;
      expect(sel[sel.length - 2]!.startsWith(`Tidak berubah, dicek ${akses}`), `${id}: ${sel[sel.length - 2]}`).toBe(true);
    }
  });
});

// ---- diagram Rantai ---------------------------------------------------------------------------------------------------------
describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: replica asinkron (5 pembayaran, 0 di node baru, saldo, 0 buku selisih) dan standby sinkron (3 dari 3, pembayaran keempat tanpa 201)", () => {
    expect(diagram.baris).toHaveLength(2);
    const [a, s] = diagram.baris;
    expect(a!.label).toBe("Replica asinkron");
    expect(s!.label).toBe("Standby sinkron");
    expect(a!.simpul.map((x) => x.teks)).toEqual([
      `${NOMINAL.length} pembayaran dijawab 201, ${JURNAL_ADA_REPLIKA_SESUDAH} ada di node baru`, "ledger node baru tetap seimbang",
    ]);
    expect(a!.simpul[0]!.sub).toBe(`saldo Warung 505: Rp${fmt(SALDO_PRIMARY)} lawan Rp${fmt(SALDO_BARU)}`);
    expect(a!.simpul[1]!.sub).toBe("0 buku selisih");
    expect(s!.simpul.map((x) => x.teks)).toEqual([`${JUMLAH_ID_TIGA} pembayaran dijawab 201, ${JURNAL_ADA_SINKRON} ada di node baru`, "pembayaran keempat tidak dijawab 201"]);
    expect(s!.simpul[0]!.sub).toBe("tiga jurnal dari tiga");
    expect(s!.simpul[1]!.sub).toBe("ada di primary lama, tidak di node baru");
    expect(a!.simpul.map((x) => x.nada)).toEqual(["warn", "good"]);
    expect(s!.simpul.map((x) => x.nada)).toEqual(["good", "good"]);
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t5-replika · promosi.txt bagian A dan B" });
    expect(diagram.catatan).toBe("Lab merekam pembayaran ke Warung 505 dengan satu standby sinkron. Primary tidak dimatikan: koneksi WAL diputus lalu replica dipromosikan.");
    expect(diagram.judul).toBe("Replica asinkron kehilangan lima pembayaran; standby sinkron menahan jawabannya");
    expect(diagram.id).toBe("t5-m42-promosi");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai ringkas di blok Yang sebenarnya, tepat satu kali, sebelum kalimat Kondisi rekaman", () => {
    expect(badan.match(/<Rantai data=\{promosi\} ringkas \/>/g)).toHaveLength(1);
    const blok = daftarBlok(badan).find((x) => x.nama === "Yang sebenarnya")!;
    expect(blok).toBeDefined();
    const dalam = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(dalam.indexOf("<Rantai")).toBeLessThan(dalam.indexOf("*Kondisi rekaman:*"));
    expect(dalam.split("\n").filter((b) => b.trim() !== "")[1]).toBe("Replica asinkron belum menerima commit terakhir saat dipromosikan, jadi pembayaran yang sudah dijawab 201 tidak ada di node baru.");
  });
});

// ---- skenario alur ------------------------------------------------------------------------------------------------------------
describe("skenario alur t5-m42.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const rekaman = promosi.split("\n");
  test("valid menurut alur-core dengan rekaman yang ada; empat komponen; enam langkah dan lima langkah varian; sumber menunjuk promosi.txt", () => {
    const err = core.validate(core.normalize(skenario), { exists: (p) => fs.existsSync(path.join(akar, p)) });
    expect(err).toEqual([]);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["app", "primary", "replika", "sinkron"]);
    expect(skenario.langkah).toHaveLength(6);
    expect(skenario.varian.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("standby sinkron");
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t5-replika/output/promosi.txt", fileVarian: "labs/t5-replika/output/promosi.txt" });
    expect(skenario.sumber.catatan).toContain("Primary tidak dimatikan: koneksi WAL replica diputus di sisi primary, lalu replica dipromosikan dengan pg_promote().");
    expect(skenario.sumber.catatan).toContain("Lab merekam pembayaran ke Warung 505, bukan top-up. Jam, hari, dan rupiah di cerita adalah Ilustrasi.");
    expect(skenario.sumber.catatan).toContain("Deteksi kegagalan, fencing, dan primary yang restart tidak dijalankan.");
  });
  test("tebakan: empat pilihan, jawaban benar (nol) di posisi kedua, bukan yang terpanjang atau terpendek; penjelasan dari rekaman bagian A; posisi berbeda dari 5.4, 5.10, 5.12", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(1);
    expect(p.varian).toBe(false);
    expect(p.options[1]).toContain("Nol:");
    const panjang = p.options.map((o) => o.length);
    expect(panjang[1]).toBeLessThan(Math.max(...panjang));
    expect(panjang[1]).toBeGreaterThan(Math.min(...panjang));
    expect(p.q).toContain(`untuk ${kata(NOMINAL.length)} pembayaran`);
    expect(p.options[0]).toContain(`Semua ${kata(NOMINAL.length)}`);
    expect(p.explain).toContain(`kelima jurnal ada di primary (${JURNAL_ADA_PRIMARY}) dan nol di replica, juga sesudah pg_promote()`);
    for (const f of ["t5-m40", "t5-m43", "t5-m44"]) {
      const lain = JSON.parse(baca(`situs/lama/widgets/data/skenario/${f}.json`)) as Skenario;
      expect(lain.predict.answer, f).not.toBe(p.answer);
    }
  });
  test("tiap kirim adalah baris berurutan dari bagian rekaman yang benar (jalur utama bagian A, varian bagian B), tanpa baris rekaan", () => {
    const urut = (kirim: string, bag: { awal: number; akhir: number }) => {
      let pos = bag.awal - 1;
      for (const b of kirim.split("\n")) {
        const i = rekaman.findIndex((x, n) => n >= pos && n < bag.akhir && x === b);
        expect(i, `baris tidak ada di bagian: ${b}`).toBeGreaterThanOrEqual(0);
        pos = i + 1;
      }
    };
    for (const l of skenario.langkah) urut(l.kirim, A);
    for (const l of skenario.varian.langkah) urut(l.kirim, B);
    // tiap langkah memuat sedikitnya satu baris perintah atau komentar rekaman, dan tidak lebih dari 8 baris (tinggi detail di 375 px)
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) {
      expect(l.kirim.split("\n").length).toBeGreaterThanOrEqual(3);
      expect(l.kirim.split("\n").length).toBeLessThanOrEqual(8);
    }
  });
  test("arah, nada, dan penjelasan tiap langkah mengikuti rekaman; jalur varian tidak membuka jawaban tebakan jalur utama", () => {
    const l = skenario.langkah, v = skenario.varian.langkah;
    expect(l.map((x) => [x.dari, x.ke ?? null, x.nada ?? null])).toEqual([["primary", "replika", null], ["app", "primary", "warn"], ["replika", null, null], ["replika", null, "warn"], ["replika", "primary", "warn"], ["app", "primary", "warn"]]);
    expect(v.map((x) => [x.dari, x.ke ?? null, x.nada ?? null])).toEqual([["primary", "sinkron", null], ["app", "primary", "good"], ["primary", null, null], ["sinkron", null, "good"], ["sinkron", "primary", "good"]]);
    expect(l[0]!.jelas).toContain("Primary tidak dimatikan, dan penerima WAL di replica tinggal nol.");
    expect(l[1]!.jelas).toContain("Rp10.000 sampai Rp50.000");
    expect(l[1]!.jelas).toContain(`Kelima jurnalnya ada di primary dan nol di replica`);
    expect(l[2]!.jelas).toContain("pg_is_in_recovery bernilai f");
    expect(l[2]!.jelas).toContain("tidak ada yang mendeteksi kegagalan primary");
    expect(l[3]!.jelas).toContain("Nol dari lima jurnal ada di node baru.");
    expect(l[4]!.jelas).toContain(`Rp${fmt(SALDO_PRIMARY)} di primary lama dan Rp${fmt(SALDO_BARU)} di node baru`);
    expect(l[4]!.jelas).toContain(`Rp${fmt(JUMLAH_LIMA)}`);
    expect(l[5]!.jelas).toContain(`${BAYAR_PRIMARY_A} jurnal bayar di primary lama, ${BAYAR_BARU_A} di node baru`);
    expect(l[5]!.jelas).toContain("Lab tidak punya fencing.");
    expect(v[0]!.jelas).toContain("FIRST 1 (replika_sinkron)");
    expect(v[1]!.jelas).toContain(`Rp${fmt(NOMINAL_KEEMPAT)}`);
    expect(v[1]!.jelas).toContain(`batas ${BATAS_DETIK} detik`);
    expect(v[2]!.jelas).toContain("sudah ter-commit di primary lama dan mungkin belum direplikasi ke standby");
    expect(v[3]!.jelas).toContain("Ketiga jurnal");
    expect(v[4]!.jelas).toContain(`${BAYAR_PRIMARY_B} jurnal bayar dan node baru ${BAYAR_BARU_B}`);
    for (const x of v) expect(x.kirim + x.jelas + x.judul).not.toMatch(/\blima\b|10204|156000|150\.000|Nol dari/);
    expect(skenario.judul).toBe("Replica asinkron yang dipromosikan tidak punya lima pembayaran; standby sinkron menahan jawabannya");
  });
  test("tanpa JavaScript: noscript memuat hasil jalur utama dan varian dengan angka yang sama dengan rekaman; tombol tanpa fungsi tidak ditampilkan", () => {
    const m = cocok(badan, /<noscript>\n([\s\S]+?)<\/noscript>/);
    expect(m[1]).toContain("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia.");
    expect(m[1]).toContain(`dari ${kata(NOMINAL.length)} pembayaran yang dijawab 201 sesudah koneksi WAL putus, nol ada di node baru, dan saldo Warung 505 berbeda Rp${fmt(JUMLAH_LIMA)}.`);
    expect(m[1]).toContain(`Dengan standby sinkron, ${kata(JUMLAH_ID_TIGA)} jurnal yang dijawab 201 ada di node baru. Pembayaran keempat tidak dijawab 201 dan hanya ada di primary lama.`);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<button/g)).toBeNull();
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m42.json" />');
    expect(badan).toContain("Sesudah langkah terakhir, centang **Ubah satu hal: standby sinkron**.");
    expect(badan).toContain("Lab tidak punya app Flutter dan tidak merekam layar.");
  });
  test("klaim negatif 'Lab tidak punya app Flutter' berlingkup labs/t5-replika dan labs/api-t5: tak ada berkas Dart atau pubspec", () => {
    const berkas = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/t5-replika/") || f.startsWith("labs/api-t5/"));
    expect(berkas.length).toBeGreaterThan(50);
    expect(berkas.filter((f) => /\.dart$|pubspec\.yaml$/.test(f))).toEqual([]);
  });
});

// ---- sidik jari: lapis terakhir, dimatikan pada putaran mutasi tanpa sidik ---------------------------------------------------
describe("sidik jari elemen non-prosa (menandai bahwa sesuatu berubah, bukan bahwa ia benar)", () => {
  (tanpaSidik ? test.skip : test)("frontmatter, diagram, skenario, lima baris riset, dan isi enam Snippet sama dengan nilai yang dikunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(sidik(skenarioMentah)).toBe(SIDIK.skenario);
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
    const isi = tag.map((t, i) => {
      const [a, b] = lines[i]!.split(":").map(Number);
      return sidik(baca(berkasSnippet[i]!).split("\n").slice(a! - 1, b).join("\n"));
    });
    expect(isi).toEqual(SIDIK.snippet);
  });
});

// ---- kartu Cek diri -------------------------------------------------------------------------------------------------------------
describe("kartu Cek diri: tiga kartu, sama dengan kartu.json", () => {
  const kartu = kartuSemua.filter((k) => k.halaman === "t5-m42");
  const soal = [...badan.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("tiga soal bernomor 1, 2, 3 dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dengan jawabannya, id, judul, dan url", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3"]);
    expect(kartu).toHaveLength(3);
    kartu.forEach((k, i) => {
      expect(k.id).toBe(`t5-m42-${i + 1}`);
      expect(k.judul).toBe("5.8 M42: Database utama mati, dua top-up hilang");
      expect(k.url).toBe("tahap-5/m42-database-utama-mati/");
      expect(k.tanya).toBe(soal[i]!.tanya);
      expect(k.jawab.replace(/\s+/g, " ")).toBe(soal[i]!.jawab.replace(/\s+/g, " "));
    });
  });
  test("jawaban kartu menurunkan klaimnya: 200 sesudah COMMIT dan satu kiriman 2xx; lima lawan 69 dan 46; tiga jurnal ada, jurnal keempat 4 lawan 3", () => {
    expect(soal[0]!.tanya).toBe("Raka meminta gateway mengirim ulang kedua top-up. Kenapa gateway tidak mengirim ulang sendiri?");
    expect(soal[0]!.jawab).toContain("Handler webhook menjawab 200 sesudah COMMIT (kode lab, Tidak dijalankan), dan gateway tiruan di Tahap 4 mengirim satu kali untuk jawaban 2xx (`retry.txt` bagian A).");
    expect(soal[0]!.jawab).toContain("Kehilangannya terjadi sesudah jawaban itu, jadi tidak ada galat yang memicu ulangan.");
    expect(soal[1]!.tanya).toBe(`Lab merekam ${kata(NOMINAL.length)} pembayaran yang tidak ada di node baru, sedangkan naskah menghitung ${fmt(bulat(JEDA_DETIK * bulat(PUNCAK_TRX3, 1)))}. Apakah lab membuktikan ${fmt(bulat(JEDA_DETIK * bulat(PUNCAK_TRX3, 1)))}?`);
    expect(soal[1]!.jawab).toContain(`Tidak. ${Kata(NOMINAL.length)} adalah pembayaran yang dijawab sesudah koneksi putus. ${fmt(bulat(JEDA_DETIK * bulat(PUNCAK_TRX3, 1)))} adalah ${JEDA_DETIK} detik × ${fmt(bulat(PUNCAK_TRX3, 1), 1)} transaksi uang per detik, Hitungan atas Asumsi, dan dengan ${TRX_REGISTRY} transaksi per user aktif hasilnya ${fmt(bulat(JEDA_DETIK * bulat(PUNCAK_TRX2, 1)))}.`);
    expect(soal[2]!.tanya).toBe("Dengan standby sinkron, apakah semua commit di primary lama ada di node baru?");
    expect(soal[2]!.jawab).toContain(`Tidak. ${Kata(JUMLAH_ID_TIGA)} jurnal yang dijawab 201 ada di node baru. Jurnal keempat ter-commit lokal di primary lama (${BAYAR_PRIMARY_B} lawan ${BAYAR_BARU_B}) dan client tidak menerima 201 untuknya (\`promosi.txt\` bagian B).`);
  });
});

// ---- struktur halaman ------------------------------------------------------------------------------------------------------------
describe("struktur halaman: tingkat heading, nomor daftar, jumlah elemen, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; daftar bernomor tidak ada; tepat tiga butir daftar tak bernomor di blok Yang sebenarnya dan empat di Konsep yang lahir", () => {
    const h = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(h).toEqual(["### Cek diri"]);
    expect(badan.slice(badan.indexOf("### Cek diri"))).toContain("</Blok>");
    expect(badan.split("\n").filter((b) => /^\d+\. /.test(b))).toEqual([]);
    expect(badan.split("\n").filter((b) => /^- /.test(b))).toHaveLength(7);
  });
  (tanpaKunci ? test.skip : test)("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const baris = badan.split("\n").filter((b) => b.trim() !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description memuat minggu 4, primary restart, replica asinkron, node baru, standby sinkron; sidik frontmatter", () => {
    expect(frontmatter).toContain("description: Minggu 4. Primary restart, replica asinkron dipromosikan, dan pembayaran yang sudah dijawab 201 tidak ada di replica itu. Standby sinkron menahan jawaban sampai ia menyimpan commit.");
  });
  test("jumlah elemen: lima Blok, satu Rantai, enam Snippet, satu WidgetLama, satu SkripLama, satu noscript, satu tabel, satu details tebakan, tiga Cek diri, enam impor", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(6);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<SkripLama /g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/^\| --- /gm)).toHaveLength(1);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/^import /gm)).toHaveLength(6);
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
  });
  test("istilah diberi arti di pemakaian pertama di luar adegan: webhook, replica asinkron, promosi dan node baru, fencing, standby sinkron, Hitungan, RPO, RTO; urutannya benar", () => {
    const pos = (k: string) => badan.indexOf(k);
    const urut = [
      "Webhook adalah kabar dari gateway ke Rekeningo bahwa top-up sudah dibayar",
      "Ia menerima WAL dari primary tanpa membuat COMMIT menunggunya",
      "Promosi mengubah standby menjadi server yang menerima tulisan, dan rekaman lab menyebut replica yang sudah dipromosikan node baru.",
      "Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini",
      "Fencing adalah langkah menghentikan primary lama sebelum node baru menerima tulisan.",
      "Standby sinkron adalah standby yang ditunggu primary sebelum menjawab.",
      "RTO adalah lama paling lama sampai sistem pulih",
      "RPO adalah data terakhir yang boleh hilang, dan RPO nol berarti transaksi yang sudah dijawab sukses tidak boleh hilang",
    ].map(pos);
    expect(urut.every((x) => x > 0)).toBe(true);
    // istilah dipakai sesudah artinya: node baru, fencing, dan standby sinkron tidak muncul lebih dulu di prosa (kode, tautan, dan rekaman tidak dihitung)
    expect(badan.slice(0, urut[2]).match(/node baru/g) ?? []).toHaveLength(0);
    expect(frontmatter).not.toContain("node baru");
    expect(badan.slice(0, urut[4]).match(/[Ff]encing/g) ?? []).toHaveLength(0);
    expect(badan.slice(0, urut[5]).match(/[Ss]tandby sinkron/g) ?? []).toHaveLength(1); // hanya judul tebal paragraf yang mendefinisikannya
    expect(badan.slice(0, urut[5]).match(/[Ss]tandby sinkron/g)![0]).toBe("Standby sinkron");
    expect(badan.slice(0, urut[0]).match(/[Ww]ebhook/g)).toHaveLength(1); // dugaan Raka di paragraf sebelum definisinya
  });
  test("satu kata per konsep: replika hanya di nama kode dan rekaman, 'pembeli', 'pelanggan', 'layanan' tidak muncul, 'service' bukan 'layanan', 'secret' tidak dipakai", () => {
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/`[^`]*`/g, "");
    expect(prosa).not.toMatch(/\breplika\b|pelanggan|pembeli|layanan|\bsecret\b|\brahasia\b/i);
    expect(prosa.match(/\bschema\b/g)!.length).toBeGreaterThanOrEqual(2);
    expect(prosa).not.toMatch(/promosi replica asinkron/i);
  });
});

// Kalimat yang lolos mutasi 'sisip tidak' tanpa kunci baris: dikunci literal di sini, bukan di berkas nilai, supaya membangkitkan
// ulang berkas nilai dari halaman termutasi tidak melonggarkannya.
const KUNCI_LITERAL: string[] = [
  "*Angka cerita (Ilustrasi):* hari, pukul 02.10, 23 menit, dan kedua jumlah rupiah berasal dari naskah, bukan dari rekaman. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].",
  "Raka menduga gateway tidak mengirim webhook untuk kedua top-up itu, dan ia mengusulkan meminta gateway mengirim ulang. Dugaan lain di tim: backup harian bisa memulihkan datanya.",
  "Dewi mempromosikan replica. Promosi mengubah standby menjadi server yang menerima tulisan, dan rekaman lab menyebut replica yang sudah dipromosikan node baru.",
  "Webhook adalah kabar dari gateway ke Rekeningo bahwa top-up sudah dibayar ([[t4-webhook]]). Handler-nya membalas 200 hanya sesudah transaction berakhir dengan COMMIT (ADR 34). Kode lab membaca urutan itu:",
  "`DalamTx` mengembalikan hasil sesudah `tx.Commit()` selesai. `webhookPembayaran` menulis 200 hanya bila `TerimaWebhook` tidak mengembalikan galat (Tidak dijalankan: dibaca dari kode). Bila kedua top-up sudah ter-commit di primary, gateway sudah menerima 200 untuk keduanya.",
  "Backup harian berjendela sampai 24 jam, sedangkan PRD v5 menulis RPO nol, yaitu tidak ada transaksi yang sudah dijawab sukses boleh hilang ([[t5-prd]]). Memulihkan dari backup mengembalikan data ke jam pengambilannya, jadi transaksi sesudah jam itu hilang juga.",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, server Go `api-t5`, schema `t5_ledger` dan lima schema service lain. Tiga node berjalan di container lokal: primary, replica asinkron, dan satu standby lagi yang diatur sinkron di bagian B. Lab merekam pembayaran ke Warung 505, bukan top-up. Kejadian Sabtu 02.10 tidak direkam, jadi jam dan rupiah di cerita tetap Ilustrasi.",
  "**Lab memerankan kegagalan primary tanpa mematikannya.** Koneksi WAL replica diputus di sisi primary (`ALTER ROLE ... NOLOGIN`, lalu `pg_terminate_backend`). Primary tetap hidup dan menerima pembayaran, lalu replica dipromosikan.",
  "**Replica asinkron bisa tertinggal.** Ia menerima WAL dari primary tanpa membuat COMMIT menunggunya ([[t5-read-replica]]). Bila `synchronous_standby_names` kosong, semua nilai `synchronous_commit` selain `off` hanya menunggu penyimpanan lokal ([PostgreSQL 17: konfigurasi WAL](https://www.postgresql.org/docs/17/runtime-config-wal.html), dibuka 2026-11-03, Tidak dijalankan). Di bagian A lab nilainya kosong.",
  "Kelima jurnal ada di primary dan nol di replica. Sesudah `pg_promote()`, `pg_is_in_recovery` bernilai `f`, dan node baru masih nol dari kelima jurnal itu (`promosi.txt` bagian A). Lima adalah jumlah pembayaran yang dijawab sesudah koneksi putus, bukan hasil kali jeda dan laju.",
  "**Node baru lebih tua, bukan rusak.** Invarian ledger memeriksa dua hal: tidak ada buku yang `saldo_cache`-nya berbeda dari jumlah postingnya, dan jumlah semua posting nol ([[t2-ledger]]). Keduanya bernilai 0 di primary lama dan di node baru. Pemeriksaan itu lolos di node baru, jadi ia tidak bisa menemukan pembayaran yang tidak pernah sampai.",
  "**Primary lama masih menerima tulisan.** Fencing adalah langkah menghentikan primary lama sebelum node baru menerima tulisan. Fencing tidak ada di lab ini.",
  "Satu pembayaran lagi dijawab 201 sesudah node baru dipromosikan: primary lama punya 9 jurnal bayar dan node baru 3. Dokumentasi PostgreSQL menulis bahwa primary lama harus diberi tahu ia bukan primary lagi. Tanpa itu, kedua server bisa sama-sama merasa primary, dan itu berujung pada kebingungan dan kehilangan data ([PostgreSQL 17: failover](https://www.postgresql.org/docs/17/warm-standby-failover.html), dibuka 2026-11-03, Tidak dijalankan).",
  "**PostgreSQL tidak mendeteksi kegagalan primary.** Dokumentasi menulis bahwa PostgreSQL tidak menyediakan perangkat lunak yang mengenali kegagalan primary dan memberi tahu standby. Promosi dipicu dengan `pg_ctl promote` atau `pg_promote()`, dan banyak perangkat yang mengenali kegagalan itu ada di luar PostgreSQL (sumber yang sama, Tidak dijalankan). Di lab hanya `run.py` yang memanggil `pg_promote()`, dan perangkat yang mendeteksi dan mempromosikan otomatis tidak dijalankan.",
  "**Standby sinkron menahan jawaban sampai standby menyimpan commit.** Standby sinkron adalah standby yang ditunggu primary sebelum menjawab. Dengan `synchronous_standby_names` berisi `FIRST 1 (replika_sinkron)`, COMMIT menunggu satu standby sinkron mengonfirmasi commit-nya. Tiga pembayaran dijawab 201 selagi standby sinkron terhubung, lalu koneksinya diputus.",
  "Pembayaran keempat tidak dijawab dalam 3 detik, karena COMMIT berhenti di `SyncRep`, nilai `wait_event` di `pg_stat_activity` yang lab baca untuk mengenali COMMIT yang menunggu standby sinkron. Client pergi, penantian dibatalkan, dan primary lama mencatat bahwa transaksinya sudah ter-commit lokal dan mungkin belum direplikasi. Standby sinkron yang dipromosikan punya ketiga jurnal yang dijawab 201. Primary lama punya empat jurnal bayar dan node baru tiga: jurnal keempat tidak pernah dijawab 201 ke client.",
  "**Jaminan itu punya syarat.** Dokumentasi PostgreSQL 17 menulis bahwa commit menunggu standby bila `synchronous_standby_names` terisi dan `synchronous_commit` bernilai `on`, `remote_write`, atau `remote_apply`. Nilai `local` tidak menunggu replikasi, dan `off` tidak menunggu apa pun (sumber yang sama). Lab memakai nilai bawaan `on` dan satu kandidat sinkron. `ANY 1` dari dua kandidat tidak dijalankan.",
  "Untuk primary yang restart selagi commit menunggu, dokumentasi menulis bahwa sebagian transaksi bisa tampak ter-commit di primary tetapi tidak di standby. Jaminannya tetap: aplikasi tidak menerima konfirmasi commit sebelum WAL diterima semua standby sinkron ([PostgreSQL 17: replikasi sinkron](https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION), dibuka 2026-11-03, Tidak dijalankan). Jurnal keempat di lab sampai ke keadaan itu lewat pembatalan penantian, bukan restart.",
  "**Berapa pembayaran yang hilang di skala naskah.** Lab menghitung lima karena hanya lima pembayaran dijawab sesudah koneksi putus. Naskah menghitung jumlah itu dari jeda replica 1 detik (Asumsi) dan laju puncak. Masukan lajunya dari PRD v5 ([[t5-prd]]):",
  "**Rekonsiliasi harian menemukan selisihnya.** Rekonsiliasi membandingkan laporan gateway dengan ledger ([[t4-rekonsiliasi]], ADR 35). Order yang ada di laporan tetapi tidak punya top-up `dibayar` di Rekeningo tercatat sebagai insiden `tidak_di_ledger` (rekaman Tahap 4: `labs/t4-webhook/output/rekon.txt`). Lab `t5-replika` tidak menjalankan top-up atau rekonsiliasi atas node baru (Tidak dijalankan), jadi dua top-up di cerita adalah bacaan dari halaman itu.",
  "**Replica asinkron tidak menjamin RPO nol.** RPO adalah data terakhir yang boleh hilang, dan RPO nol berarti transaksi yang sudah dijawab sukses tidak boleh hilang ([[t5-prd]]). Di lab, replica asinkron kehilangan lima dari lima pembayaran sesudah koneksi putus. Standby sinkron menjaga tiga dari tiga jurnal yang dijawab 201, dengan syarat di atas.",
  "Widget ini mengikuti rekaman `promosi.txt` bagian A: koneksi WAL putus, lima pembayaran dijawab 201, replica dipromosikan, dan saldo Warung 505 dibandingkan. Tebak dulu, lalu tekan Berikutnya atau panah kanan.",
  "Sesudah langkah terakhir, centang **Ubah satu hal: standby sinkron**. Pembayaran keempat tidak dijawab, dan tiga jurnal yang dijawab 201 ada di node baru (`promosi.txt` bagian B). Lab tidak punya app Flutter dan tidak merekam layar.",
  "Lab tidak punya app Flutter dan tidak merekam layar.",
  "Primary tetap hidup dan menerima pembayaran, lalu replica dipromosikan.",
  "Kejadian Sabtu 02.10 tidak direkam, jadi jam dan rupiah di cerita tetap Ilustrasi.",
  "Lab tidak menguji apakah jurnal yang tidak ada di node baru masih terbaca dari disk primary yang restart.",
  "Primary yang restart di cerita tidak direkam.",
  "Di lab hanya `run.py` yang memanggil `pg_promote()`, dan perangkat yang mendeteksi dan mempromosikan otomatis tidak dijalankan.",
  "Fencing tidak ada di lab ini.",
  "Memulihkan dari backup mengembalikan data ke jam pengambilannya, jadi transaksi sesudah jam itu hilang juga.",
  "Gateway tiruan di Tahap 4 mengirim satu kali untuk jawaban 2xx",
  "Kiriman yang dijawab sukses tidak meninggalkan galat di sisi pengirimnya, jadi tidak ada ulangan yang menutup kehilangan ini.",
  "Meminta kirim ulang butuh daftar order yang hilang, dan daftar itu datang dari rekonsiliasi, bukan dari kabar gateway.",
  "Bila kedua top-up sudah ter-commit di primary, gateway sudah menerima 200 untuk keduanya.",
  "Pemeriksaan itu lolos di node baru, jadi ia tidak bisa menemukan pembayaran yang tidak pernah sampai.",
  "Jurnal keempat di lab sampai ke keadaan itu lewat pembatalan penantian, bukan restart.",
  "Itu jeda replay di container lokal. Bagian lab ini tidak mengukur berapa WAL yang belum diterima standby saat primary mati.",
  "Replica asinkron boleh tertinggal, jadi jawaban 201 belum berarti commit-nya ada di node yang dipromosikan.",
  "Di lab, replica asinkron kehilangan lima dari lima pembayaran sesudah koneksi putus.",
  "Standby sinkron menjaga tiga dari tiga jurnal yang dijawab 201, dengan syarat di atas.",
  "Dugaan lain di tim: backup harian bisa memulihkan datanya.",
  "Jawaban 200 terkirim sesudah data tertulis di primary. Yang belum terjamin adalah apakah replica sudah menyalinnya.",
  "| Besaran | Rumus | Hasil |",
  '<SkripLama daftar={["hp","alur-core","alur"]} />',
];
describe("tanpa kunci baris: kalimat bermakna dikunci literal dan diturunkan dari sumber", () => {
  test("kalimat literal ada tepat satu kali di badan (kecuali potongan yang sengaja berulang)", () => {
    for (const k of KUNCI_LITERAL) expect(badan.split(k).length - 1, k).toBeGreaterThanOrEqual(1);
    for (const k of KUNCI_LITERAL.filter((x) => x.length > 40)) expect(badan.split(k).length - 1, k).toBe(1);
  });
  test("impor diagram dan data widget di MDX menunjuk berkas yang dibaca penjaga ini (bukan diagram halaman lain)", () => {
    expect(badan).toContain('import promosi from "../../../../data/diagram/t5-m42-promosi.json";');
    expect(badan.match(/^import promosi from /gm)).toHaveLength(1);
    expect(badan.match(/<Rantai data=\{promosi\} ringkas \/>/g)).toHaveLength(1);
    expect(badan.match(/<WidgetLama nama="alur" src="data\/skenario\/t5-m42\.json" \/>/g)).toHaveLength(1);
    expect(diagramMentah.id).toBe("t5-m42-promosi");
  });
  test("angka di prosa sama dengan rekaman dan hitungan: lima, tiga, Rp156.000, Rp6.000, Rp150.000, 9 lawan 3, 4 lawan 3, 23 menit", () => {
    expect(badan).toContain(`Saldo Warung 505 adalah Rp${fmt(SALDO_PRIMARY)} di primary lama dan Rp${fmt(SALDO_BARU)} di node baru.`);
    expect(badan).toContain(`primary lama punya ${BAYAR_PRIMARY_A} jurnal bayar dan node baru ${BAYAR_BARU_A}`);
    expect(badan).toContain(`Primary lama punya ${kata(BAYAR_PRIMARY_B)} jurnal bayar dan node baru ${kata(BAYAR_BARU_B)}: jurnal keempat tidak pernah dijawab 201 ke client.`);
    expect(badan).toContain(`Standby sinkron yang dipromosikan punya ketiga jurnal yang dijawab 201.`);
    expect(badan).toContain(`Pembayaran keempat tidak dijawab dalam ${BATAS_DETIK} detik, karena COMMIT berhenti di \`SyncRep\`, nilai \`wait_event\` di \`pg_stat_activity\` yang lab baca`);
    expect(badan).toContain(`Kelima jurnal ada di primary dan nol di replica.`);
    expect(badan).toContain("Keduanya bernilai 0 di primary lama dan di node baru.");
    expect(badan).toContain(`Pembayaran gagal selama ${GANGGUAN} menit`);
    expect(badan).toContain(`Dengan \`synchronous_standby_names\` berisi \`FIRST 1 (replika_sinkron)\``);
    expect(badan).toContain(`Tiga pembayaran dijawab 201 selagi standby sinkron terhubung`);
    expect(Kata(JUMLAH_ID_TIGA)).toBe("Tiga");
    expect(badan).toContain("`ANY 1` dari dua kandidat tidak dijalankan.");
  });
  test("label sumber: Tidak dijalankan menempel pada tiga sumber dokumentasi dan bacaan kode; Hitungan hanya atas Asumsi atau Ilustrasi; tidak ada [perlu verifikasi]", () => {
    const tdj = [...badan.matchAll(/Tidak dijalankan/g)].length;
    expect(tdj).toBe(8); // satu di kalimat arti label (blok Gejala) dan tujuh sumber: dua bacaan kode (paragraf DalamTx dan jawaban Cek diri 1), tiga dokumentasi, satu (sumber yang sama), satu lab

    for (const m of badan.matchAll(/\(Hitungan[^)]*\)/g)) expect(m[0]).toMatch(/^\(Hitungan atas Asumsi\)$/);
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
    expect(badan.match(/Ilustrasi/g)!.length).toBeGreaterThanOrEqual(5);
    expect(badan.match(/Rekaman lab/g)).toHaveLength(6); // arti label, empat judul Snippet rekaman, dan label selisih Hitungan
    for (const m of badan.matchAll(/\(([^()]*dibuka 2026-11-03[^()]*)\)/g)) expect(m[1]).toMatch(/, dibuka 2026-11-03, Tidak dijalankan$/);
  });
  test("kata universal dan negatif di prosa dicari kasus tandingannya: hitungan 'hanya', 'tidak ada', 'tidak pernah', 'semua', 'setiap', 'selalu', 'tiap' dikunci", () => {
    const hitung = (re: RegExp) => (badan.match(re) ?? []).length;
    expect({
      hanya: hitung(/\bhanya\b/gi), tidakAda: hitung(/tidak ada/gi), tidakPernah: hitung(/tidak pernah|belum pernah/gi), semua: hitung(/\bsemua\b/gi),
      setiap: hitung(/\bsetiap\b/gi), selalu: hitung(/\bselalu\b/gi), tiap: hitung(/\btiap\b/gi),
    }).toEqual(tanpaSidik ? expect.anything() : SIDIK.kata);
    expect(hitung(/\bselalu\b|\bsetiap\b/gi)).toBe(0);
    if (!tanpaSidik) expect([...badan.matchAll(/semua ([a-z`]+)/gi)].map((m) => m[0])).toEqual(SIDIK.semuaFrasa);
    // setiap 'tidak pernah' ada di kalimat yang rekaman atau kodenya menopang: jurnal keempat tidak pernah dijawab 201 (bagian B), pembayaran yang tidak pernah sampai (node baru)
    expect([...badan.matchAll(/[^.]*tidak pernah[^.]*\./gi)].map((m) => m[0].trim())).toEqual([
      "Pemeriksaan itu lolos di node baru, jadi ia tidak bisa menemukan pembayaran yang tidak pernah sampai.",
      "Primary lama punya empat jurnal bayar dan node baru tiga: jurnal keempat tidak pernah dijawab 201 ke client.",
    ]);
  });
  test("bagian rekaman yang disebut: huruf diturunkan dari kepala bagian yang memuat faktanya, bukan dari tulisan halaman", () => {
    const huruf = (kunci: string): string => {
      const semua = promosi.split("\n");
      const i = semua.findIndex((b) => b.includes(kunci));
      expect(i, kunci).toBeGreaterThanOrEqual(0);
      for (let n = i; n >= 0; n--) {
        const m = semua[n]!.match(/^# --- ([A-Z]\d?)\. /);
        if (m) return m[1]!;
      }
      throw new Error(kunci);
    };
    expect(huruf("pg_promote(wait => true)")).toBe("A");
    expect(huruf("saldo_warung_505")).toBe("A");
    expect(huruf("FIRST 1 (replika_sinkron)")).toBe("B");
    expect(huruf("canceling wait for synchronous replication")).toBe("B");
    for (const [kalimat, h] of [
      ["(`promosi.txt` bagian A)", "A"], ["(`promosi.txt` bagian B)", "B"],
    ] as [string, string][]) expect(badan, kalimat).toContain(kalimat);
    expect(badan.match(/`promosi\.txt` bagian ([AB])/g)).toEqual(["`promosi.txt` bagian A", "`promosi.txt` bagian A", "`promosi.txt` bagian B", "`promosi.txt` bagian B"]);
    expect(badan).toContain("(`jeda.txt` bagian A, nilai tidak direkam)");
    expect(bagianRekaman(jeda, "A").teks).toContain("replay_lag tertinggi");
    expect(badan).toContain("(`retry.txt` bagian A, di [[t4-webhook]])");
    expect(retry.split("\n").findIndex((b) => b.startsWith("# --- A. "))).toBeLessThan(retry.split("\n").findIndex((b) => /^ 200\s+\| 1/.test(b)));
  });
  test("tautan di prosa: tiap [[id]] menempel pada kalimat yang menjelaskan isinya (tautan ditukar tertangkap)", () => {
    const pasang: [string, string][] = [
      ["Webhook adalah kabar dari gateway ke Rekeningo bahwa top-up sudah dibayar ([[t4-webhook]])", "t4-webhook"],
      ["Ia menerima WAL dari primary tanpa membuat COMMIT menunggunya ([[t5-read-replica]])", "t5-read-replica"],
      ["jumlah semua posting nol ([[t2-ledger]])", "t2-ledger"],
      ["Rekonsiliasi membandingkan laporan gateway dengan ledger ([[t4-rekonsiliasi]], ADR 35)", "t4-rekonsiliasi"],
      ["yaitu tidak ada transaksi yang sudah dijawab sukses boleh hilang ([[t5-prd]])", "t5-prd"],
      ["Masukan lajunya dari PRD v5 ([[t5-prd]]):", "t5-prd"],
      ["tidak boleh hilang ([[t5-prd]])", "t5-prd"],
      ["- [[t5-rpo-rto]]: RPO dan RTO, standby sinkron, failover, dan fencing. Keputusannya ADR 48.", "t5-rpo-rto"],
      ["- [[t5-lag]]: jeda replica dan cara membaca sesudah menulis. Keputusannya ADR 47.", "t5-lag"],
      ["- [[t4-rekonsiliasi]]: selisih dengan laporan gateway menjadi insiden bernomor.", "t4-rekonsiliasi"],
      ["- [[t4-webhook]]: kabar dari gateway dibalas 2xx hanya sesudah COMMIT.", "t4-webhook"],
      ["Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].", "A0"],
    ];
    for (const [k, id] of pasang) {
      expect(badan, k).toContain(k);
      expect(k).toContain(`[[${id}]]`);
    }
    expect([...badan.matchAll(/\[\[/g)]).toHaveLength(15);
  });
});

// ---- tanpa kunci baris dan sidik: identifier, nama akun, kondisi rekaman, teks skenario, dan nomor bagian dokumentasi -------------
describe("tanpa kunci baris: nama kode, akun, versi, teks skenario dan Rantai, dan nomor bagian dokumentasi diturunkan dari sumber", () => {
  test("setiap identifier berkode di prosa ada di kode lab, rekaman, atau README (identifier yang diubah sedikit tertangkap)", () => {
    const sumber = [handlerGo, layananGo, txGo, promosi, runPy, readme, jeda, retry, ["R5-145", "R5-146", "R5-147", "R5-148"].map(barisRiset).join("\n")].join("\n");
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "");
    const kode = [...new Set([...prosa.matchAll(/`([^`]+)`/g)].map((m) => m[1]!))];
    expect(kode.length).toBeGreaterThan(20);
    for (const k of kode) {
      for (const bagian of k.split(/\s*\.\.\.\s*|, | lalu /)) {
        const inti = bagian.replace(/\(\)$/, "").replace(/^`|`$/g, "");
        if (/^\d|^[A-Z]+ \d|\d+ \(|^promosi\.txt$|^jeda\.txt$|^retry\.txt$|^run\.py$|^\(|^api-t5$|^FIRST 1 \(replika_sinkron\)$/.test(inti)) continue;
        if (/^labs\/.+\.[a-z]+$/.test(inti)) {
          expect(terlacak?.has(inti), `berkas tidak terlacak: ${inti}`).toBe(true);
          continue;
        }
        expect(sumber, `identifier tidak ada di sumber: ${inti}`).toContain(inti);
      }
    }
    expect(sumber).toContain("ALTER ROLE replikator_laporan NOLOGIN");
    expect(sumber).toContain("SELECT pg_terminate_backend(pid)");
    expect(sumber).toContain("SELECT pg_promote(wait => true)");
    expect(badan).toContain("`ALTER ROLE ... NOLOGIN`, lalu `pg_terminate_backend`");
    expect(badan).toContain("dipicu dengan `pg_ctl promote` atau `pg_promote()`");
  });
  test("nomor akun warung di prosa, noscript, dan skenario sama dengan akun di rekaman (505)", () => {
    const akun = cocok(promosi, /akun_id = (\d+)/)[1]!;
    for (const t of [badan, skenarioMentah, JSON.stringify(diagramMentah)]) for (const m of t.matchAll(/Warung (\d+)/g)) expect(m[1]).toBe(akun);
    expect(badan.match(/Warung 505/g)!.length).toBeGreaterThanOrEqual(5);
  });
  test("kondisi rekaman sama dengan kepala promosi.txt: PostgreSQL 17.11, go1.27.3, schema t5_ledger dan lima schema service lain, tiga node", () => {
    const kepala = promosi.split("\n")[1]!;
    const pg = cocok(kepala, /PostgreSQL (\d+\.\d+) /)[1]!;
    const go = cocok(kepala, /· (go\d+\.\d+\.\d+) ·/)[1]!;
    const schema = cocok(kepala, /schema ([a-z0-9_, ]+) ·/)[1]!.split(", ");
    expect(schema).toHaveLength(6);
    expect(schema[0]).toBe("t5_ledger");
    expect(badan).toContain(`*Kondisi rekaman:* PostgreSQL ${pg}, ${go}, server Go \`api-t5\`, schema \`${schema[0]}\` dan ${kata(schema.length - 1)} schema service lain.`);
    expect(skenario.sumber.catatan).toContain(`PostgreSQL ${pg}`);
    expect(kepala).toContain("primary, replika asinkron, dan standby sinkron di container lokal");
    expect(badan).toContain("Tiga node berjalan di container lokal: primary, replica asinkron, dan satu standby lagi yang diatur sinkron di bagian B.");
  });
  test("Rantai: label dan sub baris diturunkan dari rekaman dan kode (FIRST 1, koneksi putus, dipromosikan)", () => {
    expect(diagram.baris.map((b) => [b.label, b.sub])).toEqual([
      ["Replica asinkron", "koneksi WAL putus, lalu dipromosikan"],
      ["Standby sinkron", `${cocok(runPy, /SINKRON_SATU = "(FIRST \d)/)[1]}, lalu dipromosikan`],
    ]);
    expect(diagram.baris[0]!.sub).toContain("dipromosikan");
    expect(A.teks).toContain("koneksi WAL ke replika_laporan diputus");
    expect(B.teks).toContain("Lalu koneksi WAL ke replika_sinkron diputus");
  });
  test("skenario: pengantar, label komponen, catatan sumber, pertanyaan, pilihan, penjelasan, dan tiap judul dan penjelasan langkah dikunci literal", () => {
    expect(skenario.pengantar).toBe("Koneksi WAL replica ke primary putus, tetapi primary terus menerima pembayaran. Tebak dulu apa yang ada di node baru sesudah promosi, lalu ikuti rekamannya. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    expect(skenario.komponen.map((k) => k.label)).toEqual(["App Budi (api-t5)", "Primary lama", "Replica asinkron", "Standby sinkron"]);
    expect(skenario.sumber.catatan).toBe("Server Go api-t5 dan PostgreSQL 17.11 dari database bersih (make -C labs/t5-replika run): jalur utama promosi.txt bagian A, Ubah satu hal bagian B. Primary tidak dimatikan: koneksi WAL replica diputus di sisi primary, lalu replica dipromosikan dengan pg_promote(). Lab merekam pembayaran ke Warung 505, bukan top-up. Jam, hari, dan rupiah di cerita adalah Ilustrasi. Deteksi kegagalan, fencing, dan primary yang restart tidak dijalankan. Lab tidak punya app Flutter dan tidak merekam layar.");
    expect(skenario.predict.q).toBe("Koneksi WAL replica asinkron ke primary putus, tetapi primary tetap menjawab 201 untuk lima pembayaran. Replica lalu dipromosikan. Berapa dari lima pembayaran itu ada di node baru?");
    expect(skenario.predict.options).toEqual(["Semua lima: primary menjawab 201 sesudah COMMIT, jadi replica sudah menyalinnya", "Nol: koneksi WAL sudah putus, jadi node baru tidak menerima kelima pembayaran itu", "Sebagian: replica menyalin WAL yang sempat terkirim sebelum primary menjawab", "Tidak bisa diketahui: jumlahnya bergantung pada jeda replay saat promosi dilakukan"]);
    expect(skenario.predict.explain).toBe("Rekaman promosi.txt bagian A: kelima jurnal ada di primary (5) dan nol di replica, juga sesudah pg_promote(). Replica hanya punya yang diterimanya sebelum koneksi putus.");
    expect(skenario.langkah.map((l) => l.judul)).toEqual(["Koneksi WAL replica diputus di sisi primary", "Primary menjawab 201 untuk lima pembayaran lagi", "Replica dipromosikan", "Node baru tidak punya lima pembayaran itu, tetapi seimbang", "Saldo Warung 505 berbeda Rp150.000", "Primary lama masih menerima pembayaran"]);
    expect(skenario.langkah.map((l) => l.jelas)).toEqual(["Tiga pembayaran sudah dijawab 201 dan kedua standby menyusul. Lab memutus koneksi WAL replica di sisi primary. Primary tidak dimatikan, dan penerima WAL di replica tinggal nol.", "Lima pembayaran, Rp10.000 sampai Rp50.000, dijawab 201. Kelima jurnalnya ada di primary dan nol di replica, karena koneksi WAL sudah putus.", "pg_promote() mengubah replica menjadi server yang menerima tulisan: pg_is_in_recovery bernilai f. Di lab hanya run.py yang memanggilnya, dan tidak ada yang mendeteksi kegagalan primary.", "Nol dari lima jurnal ada di node baru. Ledgernya tidak rusak: tidak ada buku yang saldo_cache-nya berbeda dari jumlah postingnya. Node baru lebih tua, bukan salah.", "Saldo Warung 505 Rp156.000 di primary lama dan Rp6.000 di node baru. Selisihnya Rp150.000, sama dengan jumlah lima pembayaran yang dijawab 201.", "Satu pembayaran lagi dijawab 201 oleh primary lama sesudah node baru dipromosikan: 9 jurnal bayar di primary lama, 3 di node baru. Lab tidak punya fencing."]);
    expect(skenario.varian.langkah.map((l) => l.judul)).toEqual(["Primary menunggu satu standby sinkron sebelum COMMIT selesai", "Pembayaran keempat tidak dijawab", "Penantian dibatalkan sesudah client pergi", "Standby sinkron dipromosikan: tiga jurnal ada", "Primary lama punya satu jurnal yang tidak dijawab"]);
    expect(skenario.varian.langkah.map((l) => l.jelas)).toEqual(["synchronous_standby_names diisi FIRST 1 (replika_sinkron). Tiga pembayaran dijawab 201 sementara standby sinkron menerima WAL, lalu koneksi WAL ke standby sinkron diputus.", "COMMIT pembayaran Rp4.000 berhenti di SyncRep karena tidak ada standby yang mengonfirmasinya. Client tidak menerima jawaban sampai batas 3 detik.", "PostgreSQL mencatat peringatan: transaksinya sudah ter-commit di primary lama dan mungkin belum direplikasi ke standby. Tidak ada 201 untuknya.", "Ketiga jurnal yang dijawab 201 sebelum koneksi diputus ada di node baru.", "Primary lama memuat 4 jurnal bayar dan node baru 3. Jurnal keempat tidak pernah dijawab 201 ke client."]);
  });
  test("nomor bagian dokumentasi di baris riset sama dengan yang dikutip: 26.3 Failover, 19.5.1 Settings, 26.2.8 Synchronous Replication; laju 100 per detik di R5-148", () => {
    expect(barisRiset("R5-145")).toContain("PostgreSQL 17 bagian 26.3 Failover (postgresql.org/docs/17/warm-standby-failover.html");
    expect(barisRiset("R5-146")).toContain("PostgreSQL 17 bagian 19.5.1 Settings (postgresql.org/docs/17/runtime-config-wal.html");
    expect(barisRiset("R5-147")).toContain("PostgreSQL 17 bagian 26.2.8 Synchronous Replication (postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION");
    const laju = cocok(jeda, /-rps (\d+) -detik/)[1]!;
    expect(barisRiset("R5-148")).toContain(`\`jeda.txt\` bagian A (${laju} pembayaran per detik: replay_lag tertinggi di bawah 1 detik sebagai batas)`);
    expect(badan).toContain(`pada ${laju} pembayaran per detik`);
  });
});
