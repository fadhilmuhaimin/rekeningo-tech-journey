// Penjaga halaman 5.21 (keputusan 1580 sampai 1582): angka, hitungan, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak"
// dan "hanya", tab Di stack lain, tabel ADR 54, diagram Rantai t5-batch-inti.json, tebakan t5-batch-tebak.json, widget banding
// t5-batch-banding.json, kartu Cek diri, istilah glosarium, dan baris riset di batch-tahan-crash.mdx. Nilai diturunkan dari rekaman
// labs/t5-cicilan/output (crash.txt, serentak.txt, langkah.txt, kompensasi.txt, laju.txt), kode labs/api-t5 (t5.go, repo/t5.go, tx.go,
// migrasi) dan labs/t5-cicilan/dbos/main.go, README dan run.py lab, naskah Tahap 5 (baris ADR 54, M48, beban Cicilan), halaman tetangga
// (5.20, 5.30, 5.3), registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka
// diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di batch-tahan-crash.halaman.nilai.ts. Lapis 2
// bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah:
// PERBARUI_KUNCI=1 vitest run src/lib/batch-tahan-crash.halaman.test.ts. Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Baris
// riset tetangga tidak dikunci: hanya R5-210 sampai R5-214 yang diperiksa, dengan urutan naik. Rekaman +25 jam untuk versi benar tidak ada
// (Tidak dijalankan); versi benar tidak membaca jam, dibaca dari kode.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-batch-inti.json";
import tebakMentah from "../../data/widget/t5-batch-tebak.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./batch-tahan-crash.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  // berkas baru milik PR ini belum terlacak sebelum commit; sesudahnya semua berkas yang dibaca harus terlacak
  if (terlacak && process.env.CI) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-5/batch-tahan-crash.mdx";
const TANGGAL = "2026-11-03";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const crash = baca("labs/t5-cicilan/output/crash.txt").split("\n");
const serentakTeks = baca("labs/t5-cicilan/output/serentak.txt");
const serentak = serentakTeks.split("\n");
const langkahTeks = baca("labs/t5-cicilan/output/langkah.txt");
const langkah = langkahTeks.split("\n");
const kompTeks = baca("labs/t5-cicilan/output/kompensasi.txt");
const komp = kompTeks.split("\n");
const lajuTeks = baca("labs/t5-cicilan/output/laju.txt");
const laju = lajuTeks.split("\n");
const readmeLab = baca("labs/t5-cicilan/README.md");
const runLab = baca("labs/t5-cicilan/run.py");
const dbosKode = baca("labs/t5-cicilan/dbos/main.go").split("\n");
const kodeT5 = baca("labs/api-t5/internal/service/t5.go").split("\n");
const kodeRepo = baca("labs/api-t5/internal/repo/t5.go").split("\n");
const kodeTx = baca("labs/api-t5/internal/repo/tx.go");
const kodeIdem = baca("labs/api-t5/internal/repo/idempoten.go");
const migrasi25 = baca("labs/api-t5/migrasi/000025_tabel_tahap5.up.sql");
const migrasi26 = baca("labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql").split("\n");
const sengajaBelum = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const m48Mdx = baca("situs/src/content/docs/tahap-5/m48-angsuran-dua-kali.mdx");
const prdV5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const glosariumMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const bandingMentah = JSON.parse(baca("situs/lama/widgets/data/t5-batch-banding.json")) as Banding;
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const banding = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/banding.js")) as { cekData: (d: Banding) => string[] };

interface Simpul { id: string; label: string; sub?: string }
interface Banding {
  judul: string;
  opsi: { id: string; nama: string; baris: Simpul[][]; judulBaris: string[] }[];
  fitur: { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }[];
}
interface H { id: string; judul: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string; adr?: number[]; pendek?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const pecahBaris = (b: string): string[] => b.replace(/\\\|/g, "¦").split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const angkaId = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${angkaId(n)}`;
const jumlah = (teks: string, k: string): number => teks.split(k).length - 1;
const harus = (kalimat: string): void => {
  expect(jumlah(badan, kalimat), `kalimat harus tepat satu kali: ${kalimat}`).toBe(1);
};
const garis = (baris: string[], pola: RegExp | string, dari0 = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari0 && (typeof pola === "string" ? b === pola : pola.test(b)));
  if (i < 0) throw new Error(`berkas: ${String(pola)} tidak ditemukan sesudah baris ${dari0}`);
  return i + 1; // 1-based
};
const di = (baris: string[], n: number): string => baris[n - 1]!;
const sel = (b: string): string[] => b.split("|").map((x) => x.trim());
/** Paragraf (baris) badan yang memuat potongan, tepat satu. */
const paragrafDengan = (potong: string): string => {
  const p = badan.split("\n").filter((b) => b.includes(potong));
  expect(p.length, `paragraf dengan: ${potong}`).toBe(1);
  return p[0]!;
};

// --- rekaman crash.txt: bagian A (versi pertama), B (versi benar), C (referensi ganda)
const nA = garis(crash, /^# --- A\./);
const nB = garis(crash, /^# --- B\./);
const nC = garis(crash, /^# --- C\./);
const kepalaBudi = cari(/^# Budi \(akun 419\) bersaldo Rp([\d.]+); jadwal 1: tiga angsuran Rp([\d.]+) ke Warung Ani/, di(crash, garis(crash, /^# Budi \(akun 419\) bersaldo/)), "kepala Budi");
const saldoAwal = angka(kepalaBudi[1]!);
const perAngsuran = angka(kepalaBudi[2]!);
const kepalaCitra = cari(/^# Citra \(akun (\d+)\), jadwal (\d+): tiga angsuran Rp([\d.]+) ke Warung Ani/, di(crash, garis(crash, /^# Citra \(akun/, nB)), "kepala Citra");
const jadwalCitra = Number(kepalaCitra[2]);
const saldoCitra = saldoAwal - perAngsuran;
const saldoBudiAkhir = saldoAwal - 2 * perAngsuran;
const nMatiB = garis(crash, /^\$ api-t5 -cicilan-sampai <tanggal> -lab-cicilan-henti 1$/, nB);
const nUlangB = garis(crash, /^# job diulang kapan saja; jam tidak berperan/, nB);
const nHasilB = garis(crash, /^hasil: dibaca 1, jurnal baru 0, jurnal sudah ada 1, dicatat 1$/, nB);
const nKetigaB = garis(crash, /^# job dijalankan sekali lagi: dibaca 0, jurnal baru 0$/, nB);
const nErrorC = garis(crash, /^ERROR: duplicate key value violates unique constraint "jurnal_referensi_key"$/, nC);

// --- rekaman serentak.txt
const sA = garis(serentak, /^# --- A\./);
const sB = garis(serentak, /^# --- B\./);
const sC = garis(serentak, /^# --- C\./);
const sBMulai = garis(serentak, /^# pemilik menahan lock buku kedua akun; dua job dimulai dan dibiarkan menunggu di lock$/, sB);
const sBSaldo = garis(serentak, /^# saldo akun 10007 dari jumlah posting: Rp0$/, sB);

// --- rekaman langkah.txt: delapan baris tabel A, tabel kode B, tabel sistem DBOS
const lTabelA = garis(langkah, /^ cara +\| titik mati/);
const lAkhirA = garis(langkah, "(8 rows)", lTabelA);
const lTabelKode = garis(langkah, /^ cara +\| baris alur dan penanda/);
const lAkhirKode = garis(langkah, "(3 rows)", lTabelKode);
const barisA = langkah.slice(lTabelA + 1, lAkhirA - 1).map(sel); // lewati garis pemisah
const barisKode = langkah.slice(lTabelKode + 1, lAkhirKode - 1).map(sel);
const lTabelSistem = garis(langkah, /^ tabel +\| baris$/);
const lAkhirSistem = garis(langkah, "(15 rows)", lTabelSistem);
const sistem = Object.fromEntries(langkah.slice(lTabelSistem + 1, lAkhirSistem - 1).map(sel).map((r) => [r[0]!, Number(r[1])])) as Record<string, number>;

// --- rekaman kompensasi.txt dan laju.txt
const kSaldoSebelum = garis(komp, /^# saldo Budi Rp150\.000, saldo Warung Ani Rp100\.000$/);
const kSaldoSesudah = garis(komp, /^# saldo Budi Rp250\.000, saldo Warung Ani Rp0$/);
const kUjung = garis(komp, /^# job biasa sesudah kompensasi: dibaca 0/);
const lj = laju;
const ljJob = garis(lj, /^\$ api-t5 -cicilan-sampai <tanggal>$/);
const ljHitung = garis(lj, /^# --- B\. Hitungan atas Asumsi naskah/);

// --- naskah: baris ADR 54, baris beban Cicilan, baris M48
const barisAdr54 = naskah.split("\n").find((b) => b.startsWith("| 54 | Ledger menerima")) ?? "";
const kolomAdr54 = pecahBaris(barisAdr54);
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Cicilan | jadwal × bagian jatuh tempo ÷ hari |")) ?? "";
const kolomBeban = pecahBaris(barisBeban);
const jadwalAktif = angka(cari(/^([\d.]+) jadwal aktif \(10% user, Asumsi\); (\d+)% jatuh tempo di tiga hari gajian$/, kolomBeban[2]!, "jadwal aktif")[1]!);
const persenTempo = Number(cari(/^([\d.]+) jadwal aktif \(10% user, Asumsi\); (\d+)% jatuh tempo di tiga hari gajian$/, kolomBeban[2]!, "persen")[2]);
const puncakNaskah = angka(cari(/^([\d.]+) angsuran per hari puncak dan 3\.333 rata-rata \(100\.000 ÷ 30\)\. Pada (\d+) per detik: (\d+) detik = ([\d,]+) menit$/, kolomBeban[3]!, "puncak")[1]!);
const lajuNaskah = Number(cari(/Pada (\d+) per detik: (\d+) detik = ([\d,]+) menit$/, kolomBeban[3]!, "laju")[1]);
const detikTepat = puncakNaskah / lajuNaskah; // 666,65
const detikBulat = Math.round(detikTepat);
const menitBulat = detikBulat / 60;
const batasJam = 3600 * lajuNaskah; // 72.000
const kaliBatas = batasJam / puncakNaskah; // 5,4
const barisDbosAngsuran = 1_200_000; // naskah: 100.000 jadwal × 12 angsuran per tahun (Asumsi)

// =====================================================================================================================
describe("rekaman crash.txt: versi benar, referensi ganda, dan versi pertama", () => {
  test("kepala rekaman: PostgreSQL 17.11, go1.27.3, pgx v5.11.0; jam ledger diperankan; Budi Rp250.000 dengan tiga angsuran Rp100.000", () => {
    expect(di(crash, 2)).toBe("# PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) · go1.27.3 · pgx v5.11.0 · schema tahap5_cicilan · server Go di 127.0.0.1:18310");
    expect(saldoAwal).toBe(250_000);
    expect(perAngsuran).toBe(100_000);
    harus("*Dijalankan: lab t5-cicilan atas api-t5, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0 (rekaman `crash.txt` dan `serentak.txt`).*");
  });
  test("bagian B: dimatikan sesudah jurnal (satu jurnal dengan referensi, menunggu), diulang tanpa memutar jam: jurnal sudah ada 1, dicatat; putaran ketiga dibaca 0", () => {
    expect(di(crash, nMatiB + 1)).toBe("# job pertama: keluar dengan sinyal 9 (SIGKILL), tanpa keluaran");
    const status = di(crash, nMatiB + 6);
    expect(sel(status)).toEqual(["1", "menunggu", "1"]);
    expect(di(crash, nMatiB + 7)).toBe("(1 row)");
    expect(di(crash, nUlangB + 1)).toBe("$ api-t5 -cicilan-sampai <tanggal>");
    expect(di(crash, nUlangB + 1)).not.toContain("-lab-sekarang");
    expect(sel(di(crash, nHasilB + 6))).toEqual(["1", "dicatat", "t", "1"]);
    expect(di(crash, nHasilB + 8)).toContain(`saldo Citra dari jumlah posting: ${rp(saldoCitra)} (awal ${rp(saldoAwal)}; satu angsuran ${rp(perAngsuran)} ditagih satu kali)`);
    expect(nKetigaB).toBe(nHasilB + 9);
    expect(jadwalCitra).toBe(2);
    expect(di(crash, nMatiB - 1 - 0)).toContain("Citra (akun");
  });
  test("bagian C: referensi yang sama ditolak oleh constraint jurnal_referensi_key; perintahnya di run.py memakai referensi jadwal Citra ke-1", () => {
    expect(nErrorC).toBe(nC + 1);
    expect(runLab).toContain(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', 'ulangan', {CITRA}, 'angsuran:{jadwal_b}:1')`);
    expect(runLab).toContain(`harap(e.diag.constraint_name, "jurnal_referensi_key"`);
    expect(runLab).toContain("jadwal_b = buat_jadwal(CITRA, ANI, 100_000, 3, mulai)");
    harus(`Bagian C \`crash.txt\` mencoba INSERT langsung ke \`jurnal\` dengan referensi \`angsuran:${jadwalCitra}:1\`, tanpa lewat kode itu.`);
  });
  test("bagian A: +25 jam dua jurnal dan saldo Budi turun dari saldo awal dikurangi dua angsuran", () => {
    const a25 = garis(crash, /^# saldo Budi dari jumlah posting: Rp([\d.]+)/, nA);
    expect(di(crash, a25)).toContain(`Rp${angkaId(saldoBudiAkhir)} (awal ${rp(saldoAwal)}; satu angsuran ${rp(perAngsuran)} ditagih dua kali)`);
    expect(saldoBudiAkhir).toBe(50_000);
    const a23 = garis(crash, /^hasil: dibaca 1, jurnal baru 0, dilewati 1, dicatat 0$/, nA);
    const a25hasil = garis(crash, /^hasil: dibaca 1, jurnal baru 1, dilewati 0, dicatat 1$/, a23);
    expect(sel(di(crash, a25hasil + 5))).toEqual(["1", "dicatat", "2"]);
    expect(a25).toBeLessThan(nB);
  });
});

describe("rekaman serentak.txt: dua job, versi benar dan versi pertama", () => {
  test("bagian A: dua job atas 24 angsuran, 24 jurnal baru, 24 referensi berbeda, tiap karyawan berkurang Rp40.000; tumpang tindih tidak dipaksa", () => {
    const hasil = di(serentak, garis(serentak, /^jurnal baru dari kedua job: /, sA));
    expect(hasil).toBe("jurnal baru dari kedua job: 24; angsuran dicatat dari kedua job: 24");
    expect(sel(di(serentak, garis(serentak, /^ angsuran \| dicatat/, sA) + 2))).toEqual(["24", "24", "24", "24"]);
    expect(di(serentak, garis(serentak, /^ berkurang$/, sA) + 2)).toBe(" 40000");
    expect(serentak.some((b) => b.includes("tumpang tindihnya tidak dipaksa (bagian B memaksanya)"))).toBe(true);
    harus("Bagian A menjalankan dua job atas 24 angsuran dari enam jadwal: 24 jurnal baru, 24 referensi berbeda, dan tiap karyawan berkurang Rp40.000. Tumpang tindih kedua job di bagian A tidak dipaksa.");
  });
  test("bagian B: saldo cukup untuk satu angsuran; kunci buku ditahan, dua job menunggu; jurnal baru 1, jurnal sudah ada 1, gagal 0; angsuran ke-1 dicatat; satu jurnal; saldo Rp0", () => {
    expect(di(serentak, sB + 1)).toBe("# akun 10007 bersaldo Rp250.000; jadwal 7: dua angsuran sebesar saldo itu, hanya yang ke-1 jatuh tempo");
    expect(di(serentak, sBMulai + 1)).toBe("koneksi job yang menunggu lock: 2");
    expect(di(serentak, sBMulai + 3)).toBe("jurnal baru 1, jurnal sudah ada 1, gagal 0");
    expect(sel(di(serentak, sBMulai + 7))).toEqual(["1", "dicatat", "t"]);
    expect(sel(di(serentak, sBMulai + 8))).toEqual(["2", "menunggu", "f"]);
    expect(sel(di(serentak, sBMulai + 13))).toEqual(["1"]);
    expect(serentak.some((b) => b.includes("referensi = 'angsuran:7:1'"))).toBe(true);
    expect(sBSaldo).toBe(sBMulai + 15);
    expect(sBMulai).toBeLessThan(sC);
  });
  test("bagian C: versi pertama dua job serentak: satu job menunggu, satu selesai; jurnal baru 1, dilewati 1, dicatat 1", () => {
    expect(di(serentak, sC + 2)).toBe("koneksi job yang menunggu lock: 1; job yang sudah selesai: 1");
    expect(di(serentak, sC + 3)).toBe("jurnal baru dari kedua job 1, dilewati 1, dicatat 1");
    harus("Versi pertama berbeda. Di bagian C satu job mengklaim Idempotency-Key, dan job lain melewati angsuran itu: jurnal baru 1, dilewati 1, dicatat 1.");
  });
});

describe("rekaman langkah.txt: delapan baris, jumlah baris kode, dan tabel sistem DBOS dihitung dari berkasnya", () => {
  test("tabel A: delapan baris, dua titik mati; hanya DBOS RunAsStep tanpa referensi yang menulis dua jurnal di titik pertama", () => {
    expect(barisA).toHaveLength(8);
    const hasil = barisA.map((r) => ({ cara: r[0]!, titik: r[1]!, sesudah: r[2]!, status: r[3]!, akhir: Number(r[5]), berkurang: Number(r[6]), final: r[7]! }));
    const dua = hasil.filter((h) => h.akhir !== 1);
    expect(dua).toHaveLength(1);
    expect(dua[0]).toMatchObject({ cara: "DBOS RunAsStep, tanpa referensi", titik: "dalam langkah jurnal, sesudah commit ledger", akhir: 2, berkurang: 2 * perAngsuran });
    for (const h of hasil) {
      expect(h.final).toBe("dicatat");
      if (h !== dua[0]) expect(h.berkurang).toBe(perAngsuran);
    }
    const tabel = hasil.filter((h) => h.cara === "tabel langkah");
    expect(tabel.map((h) => [h.titik, h.sesudah, h.status])).toEqual([
      ["dalam langkah jurnal, sesudah commit ledger", "1", "menunggu"],
      ["sesudah langkah jurnal tercatat, sebelum penanda", "1", "terjurnal"],
    ]);
    const dbosTrx = hasil.filter((h) => h.cara === "DBOS RunAsTransaction");
    expect(dbosTrx.map((h) => [h.sesudah, h.akhir])).toEqual([["0", 1], ["1", 1]]);
    expect(hasil.filter((h) => h.cara === "DBOS RunAsStep, referensi unik").map((h) => h.akhir)).toEqual([1, 1]);
    expect(hasil.filter((h) => h.cara === "DBOS RunAsStep, tanpa referensi").map((h) => h.akhir)).toEqual([2, 1]);
  });
  test("tabel B: baris alur dan penanda lawan inisialisasi; jumlahnya dihitung, bukan ditulis", () => {
    expect(barisKode).toHaveLength(3);
    const kode = Object.fromEntries(barisKode.map((r) => [r[0]!, { alur: Number(r[1]), awal: Number(r[2]), total: Number(r[3]) }]));
    for (const k of Object.values(kode)) expect(k.alur + k.awal).toBe(k.total);
    expect(kode["tabel langkah"]).toEqual({ alur: 56, awal: 0, total: 56 });
    expect(kode["DBOS RunAsStep"]).toEqual({ alur: 59, awal: 12, total: 71 });
    expect(kode["DBOS RunAsTransaction"]).toEqual({ alur: 54, awal: 15, total: 69 });
  });
  test("tabel sistem DBOS: 15 tabel, enam workflow, lima baris sistem per angsuran, dua baris transaction_completion", () => {
    expect(Object.keys(sistem)).toHaveLength(15);
    const ws = sistem["workflow_status"]!;
    expect(ws).toBe(6);
    const perAngsuranDbos = (ws + sistem["workflow_input"]! + sistem["workflow_output"]! + sistem["operation_outputs"]!) / ws;
    expect(perAngsuranDbos).toBe(5);
    expect(sistem["transaction_completion"]).toBe(2);
    expect(`${ws} + ${sistem["workflow_input"]} + ${sistem["workflow_output"]} + ${sistem["operation_outputs"]}`).toBe("6 + 6 + 6 + 12");
    expect(barisDbosAngsuran * perAngsuranDbos).toBe(6_000_000);
    expect(langkahTeks).toContain("1,2 juta angsuran per tahun (naskah, Asumsi) x 5 baris = 6 juta baris per tahun");
    expect(langkahTeks).toContain("pengaturan retensi DBOS tidak dibaca di lab ini: Tidak dijalankan");
    expect(langkahTeks).toContain("github.com/dbos-inc/dbos-transact-golang v1.8.0 (terbit 2026-10-28), lisensi di file LICENSE modul: MIT License");
  });
  test("kalimat halaman tentang tabel langkah dan DBOS memakai angka dari tabel di atas", () => {
    harus("Hanya satu baris yang menagih dua kali: `RunAsStep` tanpa referensi, mati di dalam langkah jurnal. Langkah baru dicatat sesudah fungsinya kembali, jadi pemulihan menjalankannya lagi, dan godoc menyebut jaminan langkah itu setidaknya sekali. Di rekaman ini `RunAsStep` tidak menggantikan penulis ledger yang idempoten. `RunAsTransaction` menulis jurnal dan catatan selesainya dalam satu transaction, jadi mati sebelum commit tidak meninggalkan jurnal.");
    harus("Kode alur dan penanda hampir sama: 56 baris lawan 59 dan 54. Dengan inisialisasi DBOS jumlahnya 56 lawan 71 dan 69. Cabang saldo kurang ikut terhitung walau tidak dijalankan di rekaman.");
    harus(`Yang disimpan juga berbeda: tabel langkah buatan tidak menambah tabel atau baris. DBOS menyimpan 5 baris sistem per angsuran, dihitung dari 30 baris untuk 6 workflow (6 + 6 + 6 + 12) ÷ 6 = 5. Dengan 1,2 juta angsuran per tahun (Asumsi: 100.000 jadwal × 12 angsuran, [[t5-skema]]), itu 6 juta baris per tahun bila tidak dibersihkan (Hitungan atas Asumsi). Lab tidak membaca pengaturan retensi tabel DBOS (Tidak dijalankan).`);
    expect(readmeLab).toContain("Cabang saldo kurang (`tandaiGagal` dan dua `if saldoKurang` di DBOS, cabang `ErrSaldoKurang` di tabel langkah) ikut terhitung tetapi tidak dijalankan di rekaman `langkah.txt`");
    expect(readmeLab).toContain("Jumlahnya 56 lawan 71 dan 69");
    expect(readmeLab).toContain("(`workflow_status`, `workflow_input`, `workflow_output`, dan dua baris `operation_outputs`) dalam 15 tabel");
    expect(jumlah(badan, "Tiga cara menulis langkah jurnal dan dua titik mati memberi delapan baris bersama tabel langkah buatan:")).toBe(1);
    expect(barisA.length).toBe(3 * 2 + 2);
  });
});

describe("rekaman kompensasi.txt dan laju.txt", () => {
  test("kompensasi: karyawan dilarang, admin membuat jurnal pembalik, angsuran gagal, saldo kembali, kompensasi kedua ditolak, job tidak menagih angsuran gagal", () => {
    expect(komp).toContain("exit 2: kompensasi angsuran 1:1: dilarang");
    expect(komp.some((b) => /^kompensasi angsuran 1:1: jurnal pembalik \d+, angsuran gagal$/.test(b))).toBe(true);
    expect(komp).toContain("exit 2: kompensasi angsuran 1:1: angsuran: hanya angsuran berstatus terjurnal yang dikompensasi");
    expect(komp).toContain("# job biasa sesudah kompensasi: dibaca 0 (angsuran gagal tidak ditagih lagi)");
    expect(komp).toContain("# Lab ini tidak punya langkah akhir yang bisa gagal; yang direkam adalah mekanisme kompensasinya. Keadaan 'terjurnal' dipasang langsung di database.");
    expect(sel(di(komp, kSaldoSebelum + 8))).toEqual(["1", "gagal", "f"]);
    expect(kSaldoSebelum).toBe(15);
    expect(kSaldoSesudah).toBe(36);
    expect(kUjung).toBe(39);
    // saldo kembali: Rp150.000 + Rp100.000 = Rp250.000, dan Warung Ani Rp100.000 - Rp100.000 = Rp0
    expect(150_000 + perAngsuran).toBe(250_000);
    expect(100_000 - perAngsuran).toBe(0);
    harus("Sesudahnya saldo Budi kembali ke Rp250.000 dan saldo Warung Ani ke Rp0. Kompensasi kedua ditolak, dan job biasa tidak menagih angsuran `gagal` lagi:");
  });
  test("laju: 2.000 angsuran satu job, semua dicatat, 2.000 referensi berbeda; laju memenuhi batas 20 per detik (nilai tidak direkam); hitungan 13.333 ÷ 20", () => {
    expect(di(lj, ljJob + 1)).toBe("hasil: dibaca 2000, jurnal baru 2000, dicatat 2000, gagal 0");
    expect(di(lj, ljJob + 2)).toBe("laju terukur memenuhi batas 20 angsuran per detik (Asumsi naskah): ya");
    expect(lj.some((b) => b.startsWith("# Laju terukur di atas hanya batas bawah di laptop lab"))).toBe(true);
    expect(di(lj, ljHitung + 1)).toContain("13.333 angsuran per hari puncak (100.000 jadwal x 40% jatuh tempo di tiga hari gajian ÷ 3, naskah bagian 3) ÷ 20 per detik = 666,65 detik, dibulatkan 667 detik = 11,1 menit");
  });
});

describe("kode lab: referensi unik, urutan kunci, status per langkah, kompensasi, dan DBOS", () => {
  const idx = (baris: string[], awal: string, dari0 = 0): number => {
    const i = baris.findIndex((b, k) => k >= dari0 && b.startsWith(awal));
    if (i < 0) throw new Error(`kode: ${awal} tidak ditemukan`);
    return i + 1;
  };
  const adaDiRentang = (baris: string[], a: number, b: number, potong: string): boolean => baris.slice(a - 1, b).join("\n").includes(potong);

  test("CatatJurnalReferensi: INSERT ... ON CONFLICT (referensi) DO NOTHING RETURNING id, lalu SELECT jurnal yang sudah ada bila tidak ada baris", () => {
    const n = idx(kodeRepo, "func (t Tx) CatatJurnalReferensi(");
    const blok = kodeRepo.slice(n - 1, n + 10).join("\n");
    expect(blok).toContain("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ($1, $2, $3, $4)");
    expect(blok).toContain("ON CONFLICT (referensi) DO NOTHING RETURNING id");
    expect(blok).toContain("errors.Is(err, sql.ErrNoRows)");
    expect(blok).toContain("SELECT id FROM jurnal WHERE referensi = $1");
    expect(kodeRepo[n + 9]).toBe("\t}");
    expect(kodeRepo[n + 8]).toBe("\t\treturn 0, false, err");
    expect(kodeRepo.join("\n")).toContain("tidak menulis apa pun bila referensi sudah ada");
    // lokal: ON CONFLICT menyebut conflict_target
    expect(kodeRepo.join("\n")).not.toContain("ON CONFLICT DO NOTHING");
  });
  test("migrasi: referensi text UNIQUE dan CHECK bentuk angsuran atau tabungan; PRIMARY KEY (jadwal_id, ke); status dan CHECK jurnal_id sesuai status; tanpa kolom waktu", () => {
    expect(migrasi26).toContain("ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;");
    expect(migrasi26.join("\n")).toContain("ADD CONSTRAINT referensi_bentuk CHECK (referensi IS NULL OR referensi ~ '^(angsuran|tabungan):[0-9]+:[0-9]+$');");
    expect(migrasi25).toContain("PRIMARY KEY (jadwal_id, ke),");
    expect(migrasi25).toContain("CHECK (status IN ('menunggu', 'terjurnal', 'dicatat', 'gagal'))");
    expect(migrasi25).toContain("CONSTRAINT angsuran_jurnal_sesuai_status CHECK ((status IN ('terjurnal', 'dicatat')) = (jurnal_id IS NOT NULL))");
    const kolomReferensi = migrasi26.filter((b) => /referensi/.test(b) && /ADD COLUMN/.test(b));
    expect(kolomReferensi).toHaveLength(1);
    expect(kolomReferensi[0]).not.toMatch(/time|date|kedaluwarsa/i);
  });
  test("jurnalAngsuran: buku dikunci lebih dulu, referensi dibaca sesudahnya; referensi bentuk jenis:jadwal:ke dengan awalan tabungan atau angsuran", () => {
    const n = idx(kodeT5, "func (s Service) jurnalAngsuran(");
    const nKunci = idx(kodeT5, "\tbuku, err := tx.KunciBukuAkun(ctx, akun...)", n);
    const nRef = idx(kodeT5, "\tif referensi != nil {", nKunci);
    expect(nKunci).toBeLessThan(nRef);
    expect(kodeT5[nRef]).toContain("tx.JurnalReferensi(ctx, *referensi)");
    expect(kodeT5[nRef + 3]).toBe("\t}");
    expect(kodeT5[nRef + 2]).toBe("\t\t}");
    expect(kodeT5.slice(nKunci, nRef - 1).join("\n")).toContain("Referensi dibaca sesudah buku dikunci");
    expect(kodeT5.slice(nKunci, nRef - 1).join("\n")).toContain("menyebutnya kurang");
    expect(kodeT5.join("\n")).toContain('return fmt.Sprintf("%s:%d:%d", jenisJurnalAngsuran(a), a.JadwalID, a.Ke)');
    expect(kodeT5.join("\n")).toContain('if a.Jenis == "tabungan" {\n\t\treturn "tabungan"\n\t}\n\treturn "angsuran"');
    harus("Cicilan memakai awalan `angsuran`, dan tabungan memakai `tabungan` (dibaca dari kode lab `referensiAngsuran`). Rekaman memakai cicilan saja.");
    expect(readmeLab).toContain("Tes `TestCicilanDuaJobSerentakPeriksaReferensiSesudahKunciBuku` merah di kode lama (jurnal baru 1, jurnal sudah ada 0, gagal 1) dan hijau sesudah perbaikan.");
    expect(readmeLab).toContain("Bila referensi dibaca sebelum kunci, ia melihat \"tidak ada jurnal\", lalu `saldo kurang`, lalu menandai angsuran yang sudah dibayar sebagai `gagal`.");
  });
  test("tagihBenar: status menunggu, terjurnal, dicatat, dan gagal; tidak membaca jam; TandaiAngsuran memajukan hanya dari status asal; tanpa klaim_sampai dan tanpa pembatas laju", () => {
    const n = idx(kodeT5, "func (s Service) tagihBenar(");
    const nAkhir = idx(kodeT5, "// --8<-- [end:langkah-tabel]", n);
    const fungsi = kodeT5.slice(n - 1, nAkhir - 2).join("\n");
    expect(kodeT5[nAkhir - 3]).toBe("}");
    expect(fungsi).toContain('[]string{"menunggu"}, "gagal", nil)');
    expect(fungsi).toContain('[]string{"menunggu"}, "terjurnal", &jurnal)');
    expect(fungsi).toContain('[]string{"terjurnal"}, "dicatat", nil)');
    expect(fungsi).toContain("s.jurnalAngsuran(ctx, tx, a, &ref)");
    expect(fungsi).not.toMatch(/\bkini\b|time\.|Now\(|Sleep|-lab-sekarang/);
    expect(fungsi).not.toMatch(/klaim_sampai|KlaimKunci|kunci_idempotensi/);
    expect(fungsi).toContain("s.repo.DalamTx(ctx, func(tx repo.Tx) (e error) {");
    const nTandai = idx(kodeRepo, "func (r Repo) TandaiAngsuran(");
    expect(kodeRepo.slice(nTandai - 1, nTandai + 5).join("\n")).toContain("WHERE jadwal_id = $1 AND ke = $2 AND status = ANY($3)");
    // job lab: tanpa klaim_sampai atau pembatas laju di JalankanCicilan
    const nJob = idx(kodeT5, "func (s Service) JalankanCicilan(");
    const nJobAkhir = idx(kodeT5, "// --8<-- [end:job-cicilan]", nJob);
    const job = kodeT5.slice(nJob - 1, nJobAkhir).join("\n");
    expect(job).not.toMatch(/klaim_sampai|Sleep|rate\.|Limiter|time\.Tick/);
    expect(job).toContain("s.repo.AngsuranJatuhTempo(ctx, sampai, o.Jadwal)");
    const nDaftar = idx(kodeRepo, "func (r Repo) AngsuranJatuhTempo(");
    expect(kodeRepo.slice(nDaftar - 1, nDaftar + 10).join("\n")).toContain("ORDER BY a.jadwal_id, a.ke");
    expect(kodeRepo.slice(nDaftar - 1, nDaftar + 10).join("\n")).not.toMatch(/FOR UPDATE|SKIP LOCKED|klaim_sampai/);
    expect(readmeLab).toContain("Job di api-t5 tidak memakai `klaim_sampai`: ia membaca daftar lalu mengunci buku per angsuran.");
    expect(readmeLab).toContain("Job api-t5 tidak punya pembatas laju.");
    expect(readmeLab).toContain("mengerjakan daftar yang sama dua kali");
    // dua transaction lokal: jurnal di DalamTx, penanda di luarnya
    expect(fungsi).toContain("s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke");
    expect(kodeTx).toContain("r.db.BeginTx(ctx, nil)");
    expect(kodeTx).not.toMatch(/Isolation|Serializable|RepeatableRead/);
  });
  test("tagihRentan (versi pertama): Idempotency-Key cicilan:<jadwal>:<ke> dengan umur 24 jam dari jam job; bukan KlaimBaru berarti dilewati", () => {
    const n = idx(kodeT5, "func (s Service) tagihRentan(");
    const f = kodeT5.slice(n - 1, n + 8).join("\n");
    expect(f).toContain('kunci := fmt.Sprintf("cicilan:%d:%d", a.JadwalID, a.Ke)');
    expect(f).toContain('s.repo.KlaimKunci(ctx, kunci, a.AkunID, "angsuran", kini, kini.Add(24*time.Hour))');
    expect(f).toContain("kini := s.kini()");
    expect(kodeIdem).toContain("kunci_idempotensi.kedaluwarsa <= $4");
    expect(readmeLab).toContain("Hanya versi pertama (`cicilan-satu-job`) membaca jam, lewat `-lab-sekarang`: Idempotency-Key bernilai 24 jam dari jam itu. Versi benar tidak membaca jam.");
    expect(readmeLab).toContain("Versi benar di lab hanya memakai `jurnal.referensi` dan tidak menyentuh `kunci_idempotensi`.");
  });
  test("KompensasiAngsuran: hanya admin, alasan minimal 20 karakter, jurnal pembalik lalu angsuran gagal dalam satu transaction; hanya angsuran terjurnal", () => {
    const n = idx(kodeT5, "func (s Service) KompensasiAngsuran(");
    const nAkhir = idx(kodeT5, "// --8<-- [end:kompensasi]", n);
    const f = kodeT5.slice(n - 1, nAkhir).join("\n");
    expect(f).toContain('if admin.Jenis != "admin" {\n\t\treturn 0, ErrDilarang');
    expect(f).toContain("if len(alasan) < 20 {");
    expect(f).toContain("s.repo.DalamTx(ctx, func(tx repo.Tx) error {");
    expect(f).toContain('if status != "terjurnal" || jurnal == nil {');
    expect(f).toContain('tx.CatatJurnal(ctx, "pembalik", alasan, peminta, jurnal, cermin)');
    expect(f).toContain("return tx.AngsuranGagalSesudahBalik(ctx, jadwal, ke)");
    expect(readmeLab).toContain("Hanya admin, alasan minimal 20 karakter, dan jurnal yang sudah dibalik tidak dibalik lagi.");
    expect(readmeLab).toContain("Lab ini tidak punya langkah akhir yang bisa gagal permanen: keadaan `terjurnal` dipasang langsung di database dan yang direkam adalah mekanisme kompensasinya.");
    expect(readmeLab).toContain("Kompensasi atas merchant yang sudah dibekukan sesudah menerima tidak dijalankan.");
  });
  test("program DBOS: RunAsStep dan RunAsTransaction, ID workflow angsuran:<jadwal>:<ke>, dua titik mati; tiga varian", () => {
    const n = dbosKode.findIndex((b) => b.startsWith("func tagihStep(")) + 1;
    const nAkhir = dbosKode.findIndex((b) => b.includes("--8<-- [end:dbos-alur-step]")) + 1;
    const f = dbosKode.slice(n - 1, nAkhir).join("\n");
    expect(f).toContain("dbos.RunAsStep(ctx, func(c context.Context) (int64, error) {");
    expect(f).toContain('mati("dalam-langkah")');
    expect(f).toContain('mati("antar-langkah")');
    expect(f).toContain('s.varian == "step-referensi"');
    expect(dbosKode.join("\n")).toContain("dbos.RunAsTransaction(ctx, s.ds, func(c context.Context, tx dbos.Tx) (int64, error) {");
    expect(dbosKode.join("\n")).toContain('func (a Angsuran) id() string { return fmt.Sprintf("angsuran:%d:%d", a.Jadwal, a.Ke) }');
    expect(dbosKode.join("\n")).toContain("dbos.WithWorkflowID(a.id())");
    expect(readmeLab).toContain("| DBOS Go | `github.com/dbos-inc/dbos-transact-golang` v1.8.0 | `proxy.golang.org` (`go list -m -json`, dicek 2026-11-02): terbit 2026-10-28.");
    expect(readmeLab).toContain("File `LICENSE` modul: MIT License.");
    expect(readmeLab).toContain("Temporal v1.32.1 hanya disebut di naskah; dokumentasinya tidak dibuka dan tidak dijalankan.");
    expect(readmeLab).toContain("Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini");
  });
  test("tujuh Snippet kode dan rekaman: file, rentang diturunkan dari isi berkas (bukan angka tulisan tangan), dan judul", () => {
    const sn = [...badan.matchAll(/<Snippet (?:file="([^"]+)"|files=\{\[([^\]]+)\]\})(?: lines="(\d+):(\d+)")?(?: lang="(\w+)")?(?: title="([^"]*)")? \/>/g)];
    expect(sn.map((m) => m[1] ?? m[2]!.replace(/"/g, "").split(", ").join("+"))).toEqual([
      "labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql:8:8+labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql:12:12",
      "labs/api-t5/internal/repo/t5.go",
      "labs/t5-cicilan/output/crash.txt",
      "labs/t5-cicilan/output/crash.txt",
      "labs/t5-cicilan/output/crash.txt",
      "labs/api-t5/internal/service/t5.go",
      "labs/t5-cicilan/output/serentak.txt",
      "labs/api-t5/internal/service/t5.go",
      "labs/t5-cicilan/output/laju.txt:19:21+labs/t5-cicilan/output/laju.txt:41:43",
      "labs/api-t5/internal/service/t5.go",
      "labs/t5-cicilan/output/kompensasi.txt",
      "labs/t5-cicilan/output/kompensasi.txt",
      "labs/t5-cicilan/output/langkah.txt",
      "labs/t5-cicilan/dbos/main.go",
      "labs/t5-cicilan/output/langkah.txt",
      "labs/api-t5/internal/repo/t5.go",
    ]);
    const rentang = sn.map((m) => (m[3] ? ([Number(m[3]), Number(m[4])] as const) : null));
    // migrasi: baris 8 dan 12 diturunkan dari isi berkas
    expect(sn[0]![2]).toBe(`"labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql:${garis(migrasi26, "ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;")}:${garis(migrasi26, "ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;")}", "labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql:${idx(migrasi26, "ALTER TABLE jurnal ADD CONSTRAINT referensi_bentuk")}:${idx(migrasi26, "ALTER TABLE jurnal ADD CONSTRAINT referensi_bentuk")}"`);
    // kode
    const nCatat = idx(kodeRepo, "func (t Tx) CatatJurnalReferensi(");
    expect(rentang[1]).toEqual([nCatat, nCatat + 10]);
    const nKunci = idx(kodeT5, "\tbuku, err := tx.KunciBukuAkun(ctx, akun...)");
    const nRef = idx(kodeT5, "\tif referensi != nil {", nKunci);
    expect(rentang[5]).toEqual([nKunci, nRef + 4]);
    const nBenar = idx(kodeT5, "func (s Service) tagihBenar(");
    const nAkhirBenar = idx(kodeT5, "// --8<-- [end:langkah-tabel]", nBenar);
    expect(rentang[7]).toEqual([nBenar, nAkhirBenar - 2]);
    const nPembalik = idx(kodeT5, "\t\tif balik, err = tx.CatatJurnal(ctx, \"pembalik\"");
    const nGagal = idx(kodeT5, "\t\treturn tx.AngsuranGagalSesudahBalik(ctx, jadwal, ke)", nPembalik);
    expect(rentang[9]).toEqual([nPembalik, nGagal]);
    const nStep = dbosKode.findIndex((b) => b.startsWith("func tagihStep(")) + 1;
    const nStepAkhir = dbosKode.findIndex((b) => b.includes("--8<-- [end:dbos-alur-step]")) + 1;
    expect(rentang[13]).toEqual([nStep, nStepAkhir - 2]);
    expect(dbosKode[nStepAkhir - 3]).toBe("}");
    expect(rentang[15]).toEqual([nCatat + 1, nCatat + 3]);
    expect(kodeRepo[nCatat + 1]).toContain("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi)");
    expect(kodeRepo[nCatat + 2]).toContain("ON CONFLICT (referensi) DO NOTHING RETURNING id");
    // rekaman crash.txt
    expect(rentang[2]).toEqual([nC, nErrorC]);
    expect(rentang[3]).toEqual([nMatiB, nMatiB + 7]);
    expect(rentang[4]).toEqual([nUlangB, nKetigaB]);
    // serentak.txt bagian B
    expect(rentang[6]).toEqual([sBMulai, sBSaldo]);
    // kompensasi.txt
    expect(rentang[10]).toEqual([kSaldoSebelum, garis(komp, "(1 row)", kSaldoSebelum)]);
    expect(rentang[11]).toEqual([kSaldoSesudah, kUjung]);
    // langkah.txt
    expect(rentang[12]).toEqual([lTabelA, lAkhirA]);
    expect(rentang[14]).toEqual([lTabelKode, lAkhirKode]);
    // judul
    const jd = sn.map((m) => m[6]);
    expect(jd[1]).toBe(`Kode lab: labs/api-t5/internal/repo/t5.go baris ${rentang[1]![0]} sampai ${rentang[1]![1]} (INSERT dengan ON CONFLICT, lalu SELECT jurnal yang sudah ada)`);
    expect(jd[2]).toBe("Rekaman lab: labs/t5-cicilan/output/crash.txt, bagian C (referensi yang sama ditolak database)");
    expect(jd[3]).toBe("Rekaman lab: labs/t5-cicilan/output/crash.txt, bagian B (job dimatikan sesudah jurnal, versi benar)");
    expect(jd[4]).toBe("Rekaman lab: labs/t5-cicilan/output/crash.txt, bagian B (job diulang: jurnal sudah ada 1, angsuran dicatat)");
    expect(jd[5]).toBe(`Kode lab: labs/api-t5/internal/service/t5.go baris ${rentang[5]![0]} sampai ${rentang[5]![1]} (kunci buku, lalu baca referensi)`);
    expect(jd[6]).toBe("Rekaman lab: labs/t5-cicilan/output/serentak.txt, bagian B (dua job berebut buku, saldo cukup untuk satu angsuran)");
    expect(jd[7]).toBe(`Kode lab: labs/api-t5/internal/service/t5.go baris ${rentang[7]![0]} sampai ${rentang[7]![1]} (tagihBenar: jurnal dengan referensi, lalu status terjurnal dan dicatat)`);
    expect(jd[8]).toBe("Rekaman lab: labs/t5-cicilan/output/laju.txt, bagian A dan B (2.000 angsuran satu job, dan hitungan 13.333 per 20 per detik)");
    expect(jd[9]).toBe(`Kode lab: labs/api-t5/internal/service/t5.go baris ${rentang[9]![0]} sampai ${rentang[9]![1]} (jurnal pembalik, lalu angsuran gagal)`);
    expect(jd[10]).toBe("Rekaman lab: labs/t5-cicilan/output/kompensasi.txt, bagian A (karyawan ditolak, admin membuat jurnal pembalik)");
    expect(jd[11]).toBe("Rekaman lab: labs/t5-cicilan/output/kompensasi.txt, bagian A (saldo kembali, kompensasi kedua ditolak)");
    expect(jd[12]).toBe("Rekaman lab: labs/t5-cicilan/output/langkah.txt, bagian A (tabel langkah buatan lawan DBOS, dua titik mati)");
    expect(jd[13]).toBe(`Kode lab: labs/t5-cicilan/dbos/main.go baris ${rentang[13]![0]} sampai ${rentang[13]![1]} (tagihStep: langkah jurnal dan langkah penanda)`);
    expect(jd[14]).toBe("Rekaman lab: labs/t5-cicilan/output/langkah.txt, bagian B (baris kode alur, penanda, dan inisialisasi)");
    expect(jd[0]).toBe("Kode lab: labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql baris 8 dan 12 (kolom referensi unik dan CHECK bentuknya)");
    expect(jd[15]).toBe("labs/api-t5/internal/repo/t5.go");
    expect(sn.map((m) => m[5] ?? "")).toEqual(["sql", "go", "", "", "", "go", "", "go", "", "go", "", "", "", "go", "", "go"]);
    // bagian rekaman di judul sesuai bagian di berkas
    const bagianCrash = (n: number): string => { let h = ""; crash.forEach((b, i) => { if (i + 1 <= n) { const m = b.match(/^# --- ([A-Z])\./); if (m) h = m[1]!; } }); return h; };
    expect(bagianCrash(nC)).toBe("C");
    expect(bagianCrash(nMatiB)).toBe("B");
    expect(bagianCrash(nKetigaB)).toBe("B");
    expect(adaDiRentang(kodeT5, nPembalik, nGagal, "AngsuranGagalSesudahBalik")).toBe(true);
    // tidak ada dua Snippet dengan berkas dan rentang sama: id baris Snippet (hash berkas dan rentang) tidak boleh ganda
    const kunciSnippet = sn.map((m) => `${m[1] ?? m[2]}|${m[3] ?? ""}:${m[4] ?? ""}`);
    expect(new Set(kunciSnippet).size).toBe(kunciSnippet.length);
  });
});

describe("angka dan hitungan di prosa: diturunkan dari naskah, rekaman, dan kode", () => {
  test("Hitungan 13.333 ÷ 20 = 666,65, dibulatkan 667 detik = 11,1 menit; asal 13.333 dari naskah; satu kalimat pembulatan", () => {
    expect(jadwalAktif).toBe(100_000);
    expect(persenTempo).toBe(40);
    expect(puncakNaskah).toBe(13_333);
    expect(lajuNaskah).toBe(20);
    expect(detikTepat.toFixed(2)).toBe("666.65");
    expect(detikBulat).toBe(667);
    expect(menitBulat.toFixed(1)).toBe("11.1");
    harus(`Puncak ${angkaId(puncakNaskah)} angsuran per hari berasal dari naskah (${angkaId(jadwalAktif)} jadwal × ${persenTempo}% ÷ 3, Asumsi, dihitung di [[t5-m48]]). Pada ${lajuNaskah} per detik, batch butuh ${angkaId(puncakNaskah)} ÷ ${lajuNaskah} = 666,65 detik, dibulatkan ${detikBulat} detik, atau 11,1 menit (Hitungan atas Asumsi). Rekaman \`laju.txt\` mencatat satu job menyelesaikan 2.000 angsuran, dan laju terukur memenuhi batas ${lajuNaskah} per detik di laptop. Nilainya tidak direkam, dan ia bukan kapasitas produksi:`);
    expect(m48Mdx).toContain("100.000 × 40% ÷ 3 = 13.333,3, dibulatkan ke 13.333 angsuran");
    expect(m48Mdx).toContain("13.333 ÷ 20 = 666,65 detik, dibulatkan 667 detik atau 11,1 menit (Hitungan atas Asumsi)");
  });
  test("batas satu jam: 3.600 × 20 = 72.000 angsuran, dan 72.000 ÷ 13.333 = 5,4 kali puncak; naskah menulis 'melewati 1 jam (Asumsi)'", () => {
    expect(batasJam).toBe(72_000);
    expect(kaliBatas.toFixed(1)).toBe("5.4");
    expect(kolomAdr54[3]).toContain("Job melewati 1 jam (Asumsi) pada puncak 13.333 angsuran: 667 detik pada 20 per detik");
    harus(`- Saat job melewati 1 jam (Asumsi) pada ${lajuNaskah} per detik. Batasnya 3.600 × ${lajuNaskah} = ${angkaId(batasJam)} angsuran per hari puncak, atau ${angkaId(batasJam)} ÷ ${angkaId(puncakNaskah)} = 5,4 kali puncak Asumsi sekarang (Hitungan atas Asumsi). Pembandingnya ${detikBulat} detik pada ${angkaId(puncakNaskah)} angsuran. Pilihannya menaikkan laju atau memecah klaim.`);
  });
  test("saldo Citra, saldo Budi, kompensasi, dan versi DBOS dalam prosa memakai angka rekaman", () => {
    harus(`Saldo Citra ${rp(saldoCitra)} sama dengan ${angkaId(saldoAwal)} − ${angkaId(perAngsuran)} (Hitungan). Rekaman tidak memutar jam +25 jam untuk versi benar (Tidak dijalankan). Kode versi benar tidak membaca jam: di job cicilan, \`-lab-sekarang\` hanya dipakai versi pertama (README lab), dan \`CatatJurnalReferensi\` tidak punya syarat waktu.`);
    expect(badan).toContain(`saldo Budi turun dari ${rp(saldoAwal)} ke ${rp(saldoBudiAkhir)}`);
    expect(badan).toContain(`saldo Budi menjadi ${rp(saldoBudiAkhir)}`);
    expect(badan).toContain("DBOS Go adalah pustaka workflow yang mencatat langkahnya di PostgreSQL (versi 1.8.0, terbit 2026-10-28; lisensi MIT menurut README lab).");
  });
  test("dua titik mati tabel langkah dalam prosa cocok dengan baris tabel A; dua job serentak dan klaim per baris dibedakan dari rekaman", () => {
    const tl = barisA.filter((r) => r[0] === "tabel langkah");
    expect(tl[0]![3]).toBe("menunggu");
    expect(tl[1]![3]).toBe("terjurnal");
    harus("- Sesudah jurnal di-commit dan sebelum status `terjurnal`: jurnal sesudah mati 1, status `menunggu`. Proses kedua menemukan jurnal lewat referensi, dan jurnal akhir 1.");
    harus("- Sesudah status `terjurnal` dan sebelum `dicatat`: jurnal sesudah mati 1, status `terjurnal`. Proses kedua melanjutkan ke `dicatat`, dan jurnal akhir 1.");
    expect(naskah).toContain("Job mengklaim per baris (ADR 24) pada 20 per detik (Asumsi) dan boleh dijalankan ulang kapan saja");
    harus("**Desain dan lab berbeda di laju dan klaim.** Naskah ADR 54 menulis job mengklaim per baris (ADR 24) pada 20 per detik, dan angka itu Asumsi desain ([[t3-klaim-baris]]). Job di lab tidak memakai `klaim_sampai` dan tidak membatasi laju, tetapi membaca daftar lalu mengunci buku per angsuran (README lab). Jadi dua job serentak mengerjakan daftar yang sama dua kali, dan keduanya aman karena referensi unik dan kunci buku.");
  });
  test("kalimat 'tiap angsuran yang berhasil ditagih melewati tiga status' berlingkup: cabang gagal dan dilewati tidak ikut", () => {
    harus("Tabel `angsuran` punya PRIMARY KEY `(jadwal_id, ke)` dan status `menunggu`, `terjurnal`, `dicatat`, atau `gagal`. CHECK `angsuran_jurnal_sesuai_status` menuntut `jurnal_id` terisi tepat ketika status `terjurnal` atau `dicatat` (migrasi lab). Tiap angsuran yang berhasil ditagih melewati tiga status: `menunggu`, `terjurnal` sesudah jurnal ada di ledger, dan `dicatat` sesudah selesai. `tagihBenar` memajukannya:");
    expect(badan).not.toMatch(/Tiap angsuran melewati/);
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, versi, dan baris riset R5-210 sampai R5-214", () => {
  const URL_LUAR: [string, string][] = [
    ["https://www.postgresql.org/docs/17/sql-insert.html", "R5-212"],
    ["https://www.postgresql.org/docs/17/transaction-iso.html", "R5-212"],
    ["https://microservices.io/patterns/data/saga.html", "R5-212"],
    ["https://pkg.go.dev/github.com/dbos-inc/dbos-transact-golang@v1.8.0/dbos", "R5-212"],
    ["https://docs.bullmq.io/guide/jobs/job-ids", "R5-210"],
    ["https://laravel.com/docs/13.x/queues", "R5-210"],
    ["https://docs.djangoproject.com/en/5.2/ref/models/querysets/", "R5-211"],
    ["https://docs.serverpod.dev/concepts/scheduling/future-calls", "R5-211"],
    ["https://supabase.com/docs/guides/queues", "R5-211"],
  ];
  test("sembilan tautan luar: tiap tautan di baris riset dengan tanggal buka, tautan di halaman berulang di Bacaan lanjut, dan tanggal dibuka 2026-11-03 di tiap kemunculan", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const unik = [...new Set(tautan)].sort();
    expect(unik).toEqual(URL_LUAR.map(([u]) => u).sort());
    for (const [u, id] of URL_LUAR) {
      const r = barisRiset(id);
      expect(r, `${id} memuat ${u}`).toContain(u.replace(/^https:\/\//, "").replace(/^www\./, ""));
      expect(r).toContain(`dibuka ${TANGGAL}`);
      expect(jumlah(badan, `](${u})`)).toBeGreaterThanOrEqual(2); // di prosa atau tab, dan di Bacaan lanjut
    }
    const bacaan = badan.slice(badan.indexOf("### Bacaan lanjut"));
    expect(bacaan.split("\n").filter((b) => b.startsWith("- [")).length).toBe(9);
    expect(jumlah(badan, `dibuka ${TANGGAL}`)).toBe(9);
    expect(jumlah(badan, "2026-11-03")).toBe(10);
    expect(jumlah(badan, "hanya dicek ke dokumentasi pada 2026-11-03")).toBe(1);
    expect(badan.match(/dibuka \d{4}-\d\d-\d\d/g)!.every((t) => t === `dibuka ${TANGGAL}`)).toBe(true);
    expect(badan.match(/\b\d{4}-\d\d-\d\d\b/g)!.filter((t) => t !== TANGGAL)).toEqual(["2026-10-28"]);
  });
  test("tab Di stack lain: enam tab dengan label dan slot terkunci; Go dijalankan, lima lainnya Tidak dijalankan dengan tautan yang sesuai nama stack", () => {
    expect(badan).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    const slot = [...badan.matchAll(/<Fragment slot="t(\d)">\n\n([\s\S]*?)\n<\/Fragment>/g)].map((m) => [Number(m[1]), m[2]!] as const);
    expect(slot.map((s) => s[0])).toEqual([0, 1, 2, 3, 4, 5]);
    const harap: [string, RegExp][] = [
      ["*Dijalankan: lab t5-cicilan", /labs\/api-t5\/internal\/repo\/t5\.go/],
      ["*Tidak dijalankan. Dicek ke dokumentasi [BullMQ: Job Ids]", /docs\.bullmq\.io/],
      ["*Tidak dijalankan. Dicek ke [Laravel 13.x: Queues]", /laravel\.com\/docs\/13\.x\/queues/],
      ["*Tidak dijalankan. Dicek ke [Django 5.2: QuerySet API]", /docs\.djangoproject\.com\/en\/5\.2\//],
      ["*Tidak dijalankan. Dicek ke [Serverpod: future calls]", /docs\.serverpod\.dev/],
      ["*Tidak dijalankan. Dicek ke [Supabase: Queues]", /supabase\.com\/docs\/guides\/queues/],
    ];
    harap.forEach(([awal, pola], i) => {
      expect(slot[i]![1].startsWith(awal), `tab ${i}`).toBe(true);
      expect(slot[i]![1]).toMatch(pola);
      expect(slot[i]![1]).toContain("**Yang berbeda di stack ini:**");
    });
    expect(slot[1]![1]).toContain("paket bullmq 6.5.4 di npm");
    expect(slot[4]![1]).toContain("Serverpod 4.1.0");
    for (const i of [1, 2, 3]) expect(slot[i]![1]).toContain("Kode di bawah adalah Ilustrasi.*");
    expect(slot[4]![1]).toContain("Kode Dart tidak ditulis di tab ini.*");
    expect(slot[5]![1]).toContain("halaman ikhtisar tanpa nomor versi, dibuka 2026-11-03.*");
    expect(jumlah(badan, "Tidak dijalankan. Dicek ke")).toBe(5);
    expect(jumlah(badan, "<Fragment slot=")).toBe(6);
    expect(jumlah(badan, "(penalaran)")).toBeGreaterThanOrEqual(6);
  });
  test("R5-210 dan R5-211: kutipan di baris riset memuat kalimat sumber yang dipakai halaman; versi dan pelunak tidak lebih kuat di halaman", () => {
    const r210 = barisRiset("R5-210");
    const r211 = barisRiset("R5-211");
    expect(r210).toContain('"Since ids must be unique, if you add a job with an existing id then that job will just be ignored and not added to the queue at all."');
    expect(r210).toContain("removeOnComplete / removeOnFailed) will not be considered as duplicates, meaning that you can add the same job id many times over as long as the previous job has already been removed from the queue.");
    expect(r210).toContain("bullmq 6.5.4 di npm, terbit 2026-11-02, MIT");
    expect(r210).toContain('"the job will not be dispatched if another instance of the job is already on the queue and has not finished processing"');
    expect(r210).toContain('"This lock is released when the job completes processing or fails all of its retry attempts."');
    expect(r210).toContain('"you may want to specify a timeout beyond which the job no longer stays unique"');
    expect(r211).toContain("setting the ignore_conflicts parameter to True tells the database to ignore failure to insert any rows that fail constraints such as duplicate unique values");
    expect(r211).toContain("Enabling the ignore_conflicts parameter disables setting the primary key on each model instance (if the database normally supports it).");
    expect(r211).toContain('"Scheduled calls are stored in the serverpod_future_call database table."');
    expect(r211).toContain("Calls that share an identifier run independently. The identifier only groups them so you can cancel them together");
    expect(r211).toContain("Serverpod 4.1.0");
    expect(r211).toContain('"A Message is delivered exactly once to a consumer within a customizable visibility window."');
    expect(r211).toContain("teks halaman (1.552 karakter) tidak memuat kata retry, redeliver, timeout, duplicate, idempot, atau unique");
    // halaman: pelunak dan lingkup
    harus("**Yang berbeda di stack ini:** halaman itu menulis bahwa Queues dibangun di atas ekstensi pgmq. Pesan dikirim tepat satu kali ke consumer dalam jendela visibilitas yang bisa diatur. Halaman ikhtisar itu tidak membahas pesan yang tidak selesai diproses sesudah jendela habis. Penahan angsuran ganda tetap harus ada di tabel bisnis (penalaran).");
    expect(badan).toContain("Sesudah selesai, penahan untuk angsuran yang sudah dibayar harus ada di tempat lain (penalaran).");
    expect(badan).toContain("**Yang berbeda di stack ini:** dokumentasi menulis bahwa job dengan id yang sudah ada diabaikan.");
    expect(badan).toContain("Penahannya berlaku selama job lama masih ada di queue.");
    expect(badan).toContain("Identifier hanya mengelompokkan panggilan supaya bisa dibatalkan bersama, dan panggilan yang berbagi identifier berjalan sendiri-sendiri.");
    expect(badan).toContain("Dokumentasi juga menulis bahwa pengaturan itu menonaktifkan pengisian primary key di tiap instance model.");
    expect(badan).not.toContain("removeOnFail`");
  });
  test("R5-212: kutipan DBOS, saga, INSERT, dan Read Committed di baris riset; versi 1.8.0 dan tanggal terbit; tidak ditulis exactly-once untuk RunAsStep", () => {
    const r = barisRiset("R5-212");
    for (const k of [
      "versi terbaru v1.8.0, terbit 2026-10-28T01:25:24Z",
      "The workflow will be automatically recovered if the process crashes or is interrupted.",
      "Workflow IDs are idempotency keys.",
      "Steps provide at-least-once execution guarantees and automatic retry capabilities.",
      "If a step has already been executed (e.g., during workflow recovery), its recorded result is returned instead of re-executing the function.",
      "DBOS atomically records a durability row, so the step runs exactly once even across crashes and recovery.",
      "A saga is a reliably coordinated sequence of local transactions.",
      "if a local transaction fails because it violates a business rule, the changes made by the completed steps are undone by compensating transactions",
      "ON CONFLICT DO NOTHING simply avoids inserting a row as its alternative action",
      "Only rows that were successfully inserted or updated will be returned.",
      "For ON CONFLICT DO NOTHING, it is optional to specify a conflict_target; when omitted, conflicts with all usable constraints (and unique indexes) are handled.",
      "Read Committed is the default isolation level in PostgreSQL",
      "In effect, a SELECT query sees a snapshot of the database as of the instant the query begins to run.",
      "the would-be updater will wait for the first updating transaction to commit or roll back (if it is still in progress)",
    ]) expect(r, k).toContain(k);
    expect(r).toContain("naskah menulis \"orkestrasi lewat event\" sedangkan microservices.io menamai koordinasi lewat event itu choreography, jadi halaman menulis koreografi");
    expect(badan).toContain("Koreografi lewat event");
    expect(badan).not.toMatch(/Orkestrasi lewat event/);
    expect(badan).not.toMatch(/exactly-once|tepat satu kali untuk `RunAsStep`/);
    expect(badan).toContain("Langkah `RunAsStep` berjalan setidaknya sekali, dan langkah yang sudah dijalankan tidak dijalankan lagi saat pemulihan.");
    expect(badan).toContain("Saga adalah rangkaian transaction lokal yang dikoordinasikan. Bila satu langkah gagal karena melanggar aturan bisnis, perubahan dari langkah yang sudah selesai dibatalkan dengan transaction kompensasi");
    expect(badan).toContain("Dokumentasi PostgreSQL 17.11 menulis bahwa RETURNING hanya mengembalikan baris yang berhasil ditulis");
    expect(badan).toContain("Dokumentasi yang sama menulis bahwa `DO NOTHING` tanpa `conflict_target` menangani konflik dengan semua constraint dan indeks unik yang dapat dipakai.");
    expect(badan).toContain("Di Read Committed, tiap SELECT melihat database sebagaimana saat SELECT itu mulai berjalan.");
    expect(badan).toContain("Transaction yang menunggu baris terkunci menunggu transaction pertama commit atau rollback");
  });
  test("R5-213 dan R5-214: sumber internal dan hitungan tercatat; lima baris berurutan, lima kolom, tanpa ID ganda, urutan naik", () => {
    const ids = ["R5-210", "R5-211", "R5-212", "R5-213", "R5-214"];
    const baris = riset5.split("\n");
    const pos = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    expect(pos.every((p) => p >= 0)).toBe(true);
    for (let i = 1; i < pos.length; i++) expect(pos[i]).toBe(pos[i - 1]! + 1);
    const semuaId = baris.filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R5-(\d+)/)![1]));
    expect(new Set(semuaId).size).toBe(semuaId.length);
    expect(semuaId.slice(semuaId.indexOf(210), semuaId.indexOf(214) + 1)).toEqual([210, 211, 212, 213, 214]);
    expect(semuaId.indexOf(209)).toBe(semuaId.indexOf(210) - 1);
    for (const id of ids) {
      expect(pecahBaris(barisRiset(id)), id).toHaveLength(5);
      expect(barisRiset(id)).not.toMatch(/\|\s*\|\s*\|/);
    }
    const r213 = barisRiset("R5-213");
    for (const k of ["crash.txt", "serentak.txt", "langkah.txt", "kompensasi.txt", "laju.txt", "README.md", "t5.go", "tx.go", "dbos/main.go", "000025_tabel_tahap5.up.sql", "000026_nilai_baru_tahap5.up.sql", "sengaja-belum.mdx"]) expect(r213, k).toContain(k);
    expect(r213).toContain(`bagian B (baris ${nB} sampai ${nKetigaB}:`);
    expect(r213).toContain(`B (baris ${sB} sampai ${sBSaldo}:`);
    expect(r213).toContain(`\`kompensasi.txt\` (baris ${kSaldoSebelum} sampai ${kUjung})`);
    expect(r213).toContain(`\`laju.txt\` (baris ${ljJob} sampai ${ljJob + 2} dan ${ljHitung} sampai ${ljHitung + 2})`);
    expect(r213).toContain(`(baris ${nC} sampai ${nErrorC}: \`jurnal_referensi_key\`)`);
    expect(r213).toContain(`(baris ${lTabelA} sampai ${lAkhirA}, delapan baris)`);
    expect(r213).toContain(`(baris ${lTabelKode} sampai ${lAkhirKode}: 56, 71, dan 69 baris;`);
    expect(r213).toContain(`dari baris ${lTabelSistem - 1} sampai ${lTabelSistem + 18}`);
    const r214 = barisRiset("R5-214");
    for (const k of ["250.000 − 100.000 = 150.000", "13.333 ÷ 20 = 666,65, dibulatkan 667 detik, dan 667 ÷ 60 = 11,1 menit", "3.600 × 20 = 72.000 angsuran, dan 72.000 ÷ 13.333 = 5,4", "(6 + 6 + 6 + 12) ÷ 6 = 5 baris sistem per angsuran", "1,2 juta × 5 = 6 juta baris per tahun", "56 + 0 = 56, 59 + 12 = 71, dan 54 + 15 = 69 baris"]) expect(r214, k).toContain(k);
    expect(r214).toContain(`dibaca ${TANGGAL}`);
    expect(barisRiset("R5-213")).toContain(`Dibaca ${TANGGAL} di main`);
  });
});

describe("ADR 54: tabel opsi, enam aturan, pre-mortem, kapan salah, dan sengaja belum diturunkan dari naskah dan halaman tetangga", () => {
  test("naskah: ADR 54 memuat referensi unik, tabel angsuran, klaim per baris 20 per detik, kompensasi jurnal pembalik, DBOS v1.8.0, dan opsi yang ditolak", () => {
    const k = kolomAdr54;
    expect(k).toHaveLength(5);
    expect(k[0]).toBe("54");
    for (const x of ["`referensi` unik di `jurnal`", "`angsuran:<jadwal_id>:<ke>`", "`INSERT ... ON CONFLICT`", "Berbeda dari Idempotency-Key, referensi tidak kedaluwarsa", "PK `(jadwal_id, ke)` adalah kunci bisnis", "`menunggu`, `terjurnal` (jurnal sudah ada di ledger)", "`dicatat` (angsuran selesai dan notifikasi diminta)", "Job mengklaim per baris (ADR 24) pada 20 per detik (Asumsi)", "jurnal pembalik (saga; ADR 6)", "DBOS Go v1.8.0"]) expect(k[1], x).toContain(x);
    for (const x of ["Cron dan job idempoten saja (ADR 19; ditolak: M48, key 24 jam)", "DBOS Go v1.8.0 (workflow dengan checkpoint di PostgreSQL, MIT; dibandingkan; benar bila jenis alur panjang bertambah)", "Temporal v1.32.1 (server workflow terpisah; disebut; dokumentasinya belum dibuka, R5-10)", "orkestrasi lewat event tanpa tabel langkah (sulit ditelusuri sampai angsuran terakhir)"]) expect(k[2], x).toContain(x);
    for (const x of ["tiga atau lebih (Asumsi)", "Jadwal diubah di tengah dan identitas angsuran ke-n bergeser", "Kompensasi tidak bisa berupa jurnal pembalik", "Job melewati 1 jam (Asumsi)"]) expect(k[3], x).toContain(x);
    expect(k[4]).toContain("R5-10");
    expect(naskah).toContain("| 8. Durable execution | Alur lebih dari satu hari yang harus lanjut dari tengah | Tidak ada | Cicilan berjalan berbulan-bulan: terpenuhi | M48, ADR 54 |");
    expect(naskah).toContain("| 5.21 | 4 | Batch harian tahan crash, saga + ADR 54 | Konsep + ADR | ★ | t5-cicilan | banding |");
  });
  test("halaman: tabel opsi empat kolom pilihan dan lima kolom sel, enam aturan bernomor, lima butir 'kenapa D', tiga penyebab pre-mortem, empat butir kapan salah, enam baris sengaja belum", () => {
    const bagian = badan.slice(badan.indexOf("### ADR 54:"), badan.indexOf("### Sengaja belum dilakukan"));
    const tabel = bagian.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel).toHaveLength(7); // header, pemisah, lima baris
    for (const b of tabel) expect(pecahBaris(b), b).toHaveLength(5);
    expect(pecahBaris(tabel[0]!)).toEqual(["", "A. Cron dan job idempoten saja", "B. Koreografi lewat event", "C. DBOS Go v1.8.0", "D. Referensi unik dan tabel langkah"]);
    expect(tabel.slice(2).map((b) => pecahBaris(b)[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    const aturan = bagian.split("\n").filter((b) => /^\d+\. /.test(b));
    expect(aturan).toHaveLength(6 + 3);
    expect(aturan.map((b) => b.match(/^\d+/)![0]).join("")).toBe("123456123");
    expect(jumlah(bagian, "**Keputusan: opsi D.** Enam aturan:")).toBe(1);
    expect(bagian.split("\n").filter((b) => b.startsWith("- **")).map((b) => b.match(/^- \*\*([^*]+)\*\*/)![1])).toEqual(["A ditolak", "B ditolak untuk sekarang", "C tidak dipilih, dan bukan karena salah.", "Temporal"]);
    const kapan = bagian.slice(bagian.indexOf("**Kapan keputusan ini salah.**"), bagian.indexOf("**Yang akan merevisinya.**")).split("\n").filter((b) => b.startsWith("- "));
    expect(kapan).toHaveLength(4);
    const sb = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf("</Blok>", badan.indexOf("### Sengaja belum dilakukan")));
    const barisSb = sb.split("\n").filter((b) => b.startsWith("|"));
    expect(barisSb).toHaveLength(2 + 6);
    for (const b of barisSb) expect(pecahBaris(b)).toHaveLength(3);
    expect(pecahBaris(barisSb[0]!)).toEqual(["Yang ditunda", "Kenapa ditunda", "Muncul lagi di"]);
    expect(barisSb.slice(2).map((b) => pecahBaris(b)[0])).toEqual(["Notifikasi angsuran", "Langkah akhir yang gagal permanen sungguhan", "Klaim per baris dan pembatas laju 20 per detik di job", "Kompensasi atas merchant yang sudah dibekukan", "Retensi tabel DBOS dan gerbang pemindai atas modulnya", "Temporal"]);
    expect(barisSb.slice(2).map((b) => pecahBaris(b)[2])).toEqual(["Belum dijadwalkan", "Belum dijadwalkan", "Belum dijadwalkan", "Belum dijadwalkan", "Belum dijadwalkan", "[[t5-adr-60]]"]);
  });
  test("sel tabel ADR: bukti per opsi menunjuk rekaman yang memuatnya; Kekurangan A, C memuat angka rekaman; sel tidak bertukar antar kolom", () => {
    const bagian = badan.slice(badan.indexOf("### ADR 54:"), badan.indexOf("**Keputusan: opsi D.**"));
    const baris = Object.fromEntries(bagian.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| |") && !b.startsWith("|---")).map((b) => { const p = pecahBaris(b); return [p[0]!, p.slice(1)]; })) as Record<string, string[]>;
    expect(baris["Bukti"]).toEqual([
      "Rekaman lab `crash.txt` bagian A dan `serentak.txt` bagian C",
      "Tidak dijalankan: penalaran dari naskah",
      "Rekaman lab `langkah.txt`",
      "Rekaman lab `crash.txt` bagian B dan C, `serentak.txt`, `kompensasi.txt`",
    ]);
    expect(baris["Kekurangan"]![0]).toContain(`saldo Budi menjadi ${rp(saldoBudiAkhir)} (\`crash.txt\` bagian A)`);
    expect(baris["Kekurangan"]![2]).toContain("`RunAsStep` tanpa referensi menulis 2 jurnal bila proses mati di dalam langkah jurnal (`langkah.txt` bagian A); 71 dan 69 baris dengan inisialisasi lawan 56");
    expect(baris["Kelebihan"]![3]).toContain("56 baris alur dan penanda di lab");
    expect(baris["Biaya operasional"]![2]).toContain("15 tabel sistem di schema sendiri, 5 baris sistem per angsuran");
    expect(baris["Biaya operasional"]![1]).toContain("[[t5-fanout]]");
    expect(baris["Cara kerja"]![0]).toContain("[[t2-job-rekonsiliasi]]");
    expect(baris["Cara kerja"]![3]).toContain("`jurnal.referensi` unik menahan jurnal kedua, dan `angsuran.status` mencatat langkah: menunggu, terjurnal, dicatat");
    expect(baris["Cara kerja"]![2]).toContain("Satu workflow per angsuran, dan DBOS mencatat tiap langkah di tabel sistemnya di PostgreSQL");
    expect(Object.keys(baris)).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    for (const kolom of Object.values(baris)) expect(kolom).toHaveLength(4);
  });
  test("ADR 45 komponen 8, ADR 60 butir 9, dan PRD v5 menjanjikan halaman ini: janji ditepati dengan kalimat yang sama", () => {
    expect(sengajaBelum).toContain("| 8. Durable execution | Alur lebih dari satu hari yang harus lanjut dari tengah | Tidak ada | Cicilan berjalan berbulan-bulan: terpenuhi | [[t5-batch]] |");
    expect(sengajaBelum).toContain("| 9. TigerBeetle dan Temporal | Ledger di PostgreSQL tidak menampung tulis, atau jenis alur panjang lebih dari tiga | Load test baris 4, dan daftar jenis alur panjang | Tulis belum terukur. Jenis alur panjang ada satu: cicilan dan tabungan memakai satu mesin status ([[t5-batch]]) | Belum terukur |");
    expect(prdV5).toContain("Batch cicilan yang tertunda lebih dari 24 jam bisa melewati batas yang sama (penalaran), dan [[t5-batch]] menjawabnya.");
    harus("**Yang akan merevisinya.** [[t5-adr-60]] menulis Temporal dan TigerBeetle sebagai sengaja belum, dengan pemicu jenis alur panjang lebih dari tiga atau ledger yang tidak menampung tulis. Bila pemicu itu terjadi, ADR 54 ditinjau ulang.");
    harus("Komponen 8 di ADR 45 menunda durable execution dengan pemicu alur lebih dari satu hari yang harus lanjut dari tengah ([[t4-adr-45]]). Durable execution adalah cara menjalankan alur panjang dengan mencatat tiap langkah yang selesai, supaya proses lain bisa melanjutkannya sesudah proses mati. Cicilan berjalan berbulan-bulan, jadi naskah menulis pemicu itu terpenuhi.");
    expect(m48Mdx).toContain("Cara kerja referensi dibahas di [[t5-batch]].");
    expect(badan).toContain("Di Tahap 5 jenis alur panjang hanya satu: cicilan dan tabungan memakai satu mesin status ([[t5-adr-60]]).");
  });
});

describe("kalimat berulang di badan halaman", () => {
  test("tidak ada kalimat (empat kata atau lebih) yang muncul dua kali: toContain dan harus() puas dengan satu kemunculan", () => {
    const kalimat = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 4 && k !== "Kode di bawah adalah Ilustrasi.*");
    expect(kalimat.length).toBeGreaterThan(150);
    const hitung = new Map<string, number>();
    for (const k of kalimat) hitung.set(k, (hitung.get(k) ?? 0) + 1);
    expect([...hitung].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
    const klausa = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?:])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 5 && k !== "Kode di bawah adalah Ilustrasi.*");
    const hitungKlausa = new Map<string, number>();
    for (const k of klausa) hitungKlausa.set(k, (hitungKlausa.get(k) ?? 0) + 1);
    expect([...hitungKlausa].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });
});

describe("registry, tautan, template blok, widget, kartu, istilah, dan label", () => {
  test("registry: halaman 5.21 jenis konsep, ada, ADR 54, prasyarat t5-m48, lab t5-cicilan, menit = baca + coba, judul, peran, dan path dari naskah", () => {
    const h = dari("t5-batch");
    expect(h.nomor).toBe("5.21");
    expect(h.jenis).toBe("konsep");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.adr).toEqual([54]);
    expect(h.prasyarat).toEqual(["t5-m48"]);
    expect(h.lab).toEqual(["t5-cicilan"]);
    expect(h.peran).toEqual(["backend"]);
    expect(h.path).toBe("tahap-5/batch-tahan-crash.md");
    expect(h.pendek).toBe("Batch harian tahan crash");
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t5-m48]]");
    expect(frontmatter).toContain(`title: "5.21 ${h.judul}"`);
    expect(naskah).toContain(`| 5.21 | 4 | ${h.judul} | Konsep + ADR | ★ | t5-cicilan | banding |`);
    expect(frontmatter).toContain("description: Rekeningo menahan jurnal angsuran kedua dengan referensi unik yang tidak kedaluwarsa, dan memajukan tiap angsuran lewat status per langkah. ADR 54 menimbang tiga cara lain, termasuk DBOS Go, dan menulis kapan pilihan ini salah.");
    expect(dari("t5-m48").nomor).toBe("5.20");
    expect(dari("t5-m49").nomor).toBe("5.22");
  });
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci, dan nomor halaman tujuan", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "berikutnya" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ "t5-m48": 5, berikutnya: 1, "t2-idempotency": 1, "t4-adr-45": 2, "t5-skema": 2, "t3-klaim-baris": 2, "t2-adr-ledger": 1, "t5-prd": 1, "t2-job-rekonsiliasi": 1, "t5-fanout": 1, "t5-adr-60": 3 });
    expect(dari("t4-adr-45").nomor).toBe("4.29");
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t2-idempotency").adr).toEqual([14]);
    expect(dari("t3-klaim-baris").adr).toEqual([24]);
    expect(dari("t2-adr-ledger").nomor).toBe("2.8");
    expect(dari("t5-adr-60").nomor).toBe("5.30");
    expect(dari("t5-prd").nomor).toBe("5.1");
    expect(dari("t5-skema").nomor).toBe("5.3");
    expect(dari("t5-fanout").nomor).toBe("5.15");
    expect(dari("t2-job-rekonsiliasi").adr).toEqual([19]);
  });
  test("template konsep: lima blok dalam urutan, dua pertama terbuka; Cek diri empat soal; satu Tebak; satu banding; satu Rantai; noscript; SkripLama di akhir; Tebak dan banding mengikuti urutan", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(4);
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(jumlah(badan, "<Rantai ")).toBe(1);
    expect(jumlah(badan, "<Tebak ")).toBe(1);
    expect(jumlah(badan, "<WidgetLama")).toBe(1);
    expect(jumlah(badan, "<TabSet ")).toBe(1);
    expect(jumlah(badan, "<Snippet ")).toBe(19);
    expect(jumlah(badan, "<Snippet lang=")).toBe(3);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["cerita","banding"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="banding" src="data/t5-batch-banding.json" />');
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(badan).toContain("<Tebak client:visible data={dataTebak} />");
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t5-batch-inti.json";');
    expect(halaman).toContain('import dataTebak from "../../../../data/widget/t5-batch-tebak.json";');
    // Tebak sesudah Inti dan Cek 3 pertanyaan; banding sesudah Tebak; jawaban Tebak tidak tertulis di blok Mulai
    expect(badan.indexOf("<Tebak ")).toBeLessThan(badan.indexOf("<WidgetLama"));
    const mulai = badan.slice(badan.indexOf('<Blok nama="Mulai"'), badan.indexOf('<Blok nama="Coba"'));
    for (const kunci of ["jurnal sudah ada", "job yang kalah", "menemukannya lewat referensi", "gagal 0", "Rp0", "angsuran:7:1", "berebut kunci buku membaca referensi"]) expect(mulai, kunci).not.toContain(kunci);
    expect(mulai).toContain("Dua job cicilan sudah membaca daftar yang sama dan berebut kunci buku. Saldo cukup untuk satu angsuran. Apa hasil gabungannya?");
    // aman: kalimat Coba hanya memuat hal yang ditunjukkan widget
    harus('<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: job yang kalah berebut kunci buku membaca referensi sesudah kunci itu didapat dan tidak menulis jurnal kedua, dan DBOS RunAsStep tanpa referensi menulis dua jurnal bila proses mati di dalam langkah jurnal.">');
  });
  test("heading: h2 Inti, empat h3 Paham dan Putuskan dan Kunci; tidak ada h4 atau h5", () => {
    const h = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(h).toEqual(["## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 54: referensi unik, tabel langkah, dan kompensasi lewat jurnal pembalik", "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
  });
  test("satu kata per konsep: angsuran, referensi, job; tanpa pembeli, pelanggan, layanan, secret, rahasia, replica; tanpa Anda atau kita", () => {
    for (const k of ["pembeli", "pelanggan", "layanan", "secret", "rahasia", "replica"]) expect(badan.toLowerCase(), k).not.toContain(k);
    expect(badan).not.toMatch(/\bAnda\b/);
    expect(badan).not.toMatch(/\bkita\b/i);
    const tanpaKode = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[^>]*>/g, "");
    expect((tanpaKode.match(/\bangsuran\b/gi) ?? []).length).toBeGreaterThan(50);
    expect(tanpaKode).not.toMatch(/\bcicilan ke-\d|\bpembayaran cicilan\b/i);
    expect(badan).not.toMatch(/\bkunci idempotensi\b|\bidempotensi key\b/i);
  });
  test("label: 'Rekaman lab' hanya untuk berkas rekaman t5-cicilan dan definisi; waktu +25 jam untuk versi benar berlabel Tidak dijalankan; Hitungan dan Asumsi didefinisikan di Coba sebelum Paham", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    for (const b of barisRekaman) expect(/crash\.txt|serentak\.txt|langkah\.txt|kompensasi\.txt|laju\.txt|Rekaman lab: labs\/|Label sumber|bila berasal dari Rekaman lab/.test(b), b).toBe(true);
    expect(badan).not.toMatch(/\+25 jam[^.\n]*\(Rekaman lab\)/);
    harus("Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `crash.txt` bagian B, versi benar dimatikan sesudah jurnal ditulis.");
    harus("Catatan di widget menyebut file rekaman dan bagiannya bila berasal dari Rekaman lab.");
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba"'), badan.indexOf('<Blok nama="Paham"'));
    expect(coba).toContain("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan Asumsi adalah angka pilihan penulis tanpa rekaman. Penalaran adalah kesimpulan dari kode atau angka di halaman, bukan hasil ukuran.");
    expect(coba).toContain("Tidak dijalankan berarti dicek ke kode atau dokumentasi tanpa menjalankannya.");
    expect(badan.indexOf("(Hitungan")).toBeGreaterThan(badan.indexOf("Hitungan adalah hasil rumus"));
    expect(badan.indexOf("(penalaran")).toBeGreaterThan(badan.indexOf("Penalaran adalah kesimpulan"));
    expect(badan).not.toMatch(/\(Rekaman lab\)[^.\n]*Tidak dijalankan/);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, tebakan, banding, dan kartu", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah), JSON.stringify(bandingMentah), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-batch"))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
  });
  test("klaim universal dan negatif berlingkup: tak ada 'selalu', 'setiap', 'tidak pernah', 'tak satu pun'; 'semua' dan 'hanya' hanya di kalimat yang terkunci", () => {
    const kalimat = badan.replace(/<noscript>[\s\S]*?<\/noscript>/, "").split("\n").filter((x) => x.trim() !== "" && !x.startsWith("<Snippet")).flatMap((x) => x.split(/(?<=[.!?])\s+/));
    for (const k of [/\bselalu\b/, /\bsetiap\b/, /\btidak pernah\b/, /\btak satu pun\b/, /\btidak satu pun\b/, /\bhanya di\b/]) expect(kalimat.filter((s) => k.test(s.toLowerCase())), String(k)).toEqual([]);
    const prosaTanpaTabel = kalimat.filter((s) => !s.includes("| "));
    const semua = prosaTanpaTabel.filter((s) => /\bsemua\b/i.test(s)).map((s) => s.trim().replace(/\s+/g, " "));
    expect(semua).toEqual(SEMUA_TERKUNCI);
    const hanya = prosaTanpaTabel.filter((s) => /\bhanya\b/i.test(s)).map((s) => s.trim().replace(/\s+/g, " "));
    expect(hanya).toEqual(HANYA_TERKUNCI);
  });
  test("tebakan: skema valid, empat pilihan, satu benar di posisi keempat (bukan pertama), bukan pilihan terpanjang; nilai cocok dengan serentak.txt bagian B dan README", () => {
    const t = DataTebak.parse(tebakMentah);
    expect(t.id).toBe("t5-batch-tebak");
    expect(t.pilihan).toHaveLength(4);
    expect(t.pilihan.findIndex((p) => p.benar)).toBe(3);
    const panjang = t.pilihan.map((p) => p.teks.length);
    expect(panjang[3]).not.toBe(Math.max(...panjang));
    expect(t.sumber).toMatchObject({ jenis: "rekaman" });
    expect(t.sumber.teks).toBe("labs/t5-cicilan/output/serentak.txt bagian B, README lab dan tes Go");
    expect(t.adegan.join(" ")).toContain(`Rp${angkaId(250_000)}`);
    expect(t.adegan.join(" ")).toContain("Hanya angsuran ke-1 yang jatuh tempo.");
    expect(t.pertanyaan).toBe("Apa hasil gabungan kedua job untuk angsuran ke-1?");
    expect(t.pilihan[3]!.teks).toBe("Satu jurnal: satu job menulisnya, job lain menemukannya lewat referensi, dan angsuran ke-1 dicatat.");
    expect(t.pilihan[3]!.alasan).toBe("Rekaman bagian B: jurnal baru 1, jurnal sudah ada 1, gagal 0. Angsuran ke-1 berstatus dicatat dan terikat ke jurnalnya, jurnal dengan referensi angsuran:7:1 berjumlah satu, dan saldo karyawan Rp0.");
    expect(di(serentak, sBMulai + 3)).toBe("jurnal baru 1, jurnal sudah ada 1, gagal 0");
    expect(t.pilihan[1]!.alasan).toContain("jurnal baru 1, jurnal sudah ada 0, gagal 1 (README lab, tes Go)");
    expect(readmeLab).toContain("(jurnal baru 1, jurnal sudah ada 0, gagal 1)");
    expect(t.pilihan[2]!.alasan).toContain("serentak.txt bagian C, dilewati 1");
    expect(t.pilihan[0]!.alasan).toContain("referensi angsuran:7:1");
    expect(di(serentak, sC + 3)).toContain("dilewati 1");
    expect(t.penutup).toBe("Job yang kalah berebut kunci buku membaca referensi sesudah kunci itu didapat, jadi ia melihat jurnal pemenang dan tidak menulis jurnal kedua.");
    // jawaban Tebak tidak ada di Inti atau Cek 3 pertanyaan: Cek diri memakai kata kunci yang sama hanya di blok Kunci
    expect(badan.indexOf("jurnal sudah ada 1, gagal 0")).toBeGreaterThan(badan.indexOf("<Tebak "));
  });
  test("Rantai Inti: ringkas, dua baris, sumber rekaman crash.txt bagian B dan C, simpul dan sub dari nilai turunan; kalimat Inti pendek", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-batch-inti");
    expect(d.judul).toBe("Batch yang diulang menemukan jurnal yang sudah ada");
    expect(d.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab: crash.txt bagian B dan C" });
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => [b.label, b.sub])).toEqual([["Diulang", "bagian B"], ["Referensi sama", "bagian C"]]);
    expect(d.baris[0]!.simpul.map((s) => s.teks)).toEqual(["Mati sesudah jurnal", "Diulang", "Dicatat, 1 jurnal"]);
    expect(d.baris[0]!.simpul.map((s) => s.sub)).toEqual(["1 jurnal, angsuran menunggu", "jam tidak diperankan", `saldo Citra ${rp(saldoCitra)}`]);
    expect(d.baris[0]!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "good"]);
    expect(d.baris[1]!.simpul.map((s) => s.teks)).toEqual(["INSERT kedua", "Ditolak database"]);
    expect(d.baris[1]!.simpul[1]!.sub).toBe("jurnal_referensi_key");
    expect(d.baris[1]!.simpul[1]!.nada).toBe("system");
    expect(d.catatan).toBe("Hijau: hasil yang benar. Biru: aturan database. Di bagian B jam ledger tidak diperankan, karena versi benar tidak membaca jam (dibaca dari kode lab).");
    const inti = cari(/## Inti\n\n(.+)\n/, badan, "kalimat Inti")[1]!;
    expect(inti).toBe("Referensi unik di jurnal menahan jurnal kedua tanpa batas umur, dan status per langkah membuat job lanjut dari tengah.");
    expect(inti.length).toBeLessThan(150);
    expect(di(crash, nHasilB + 1)).toContain("terikat_jurnal");
    const intiSampai = badan.slice(badan.indexOf("## Inti"), badan.indexOf('<details class="question">'));
    const paragraf = intiSampai.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<") && !b.startsWith("#"));
    expect(paragraf).toHaveLength(3); // kalimat, dua paragraf
    for (const b of paragraf.slice(1)) expect(b.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
  });
  test("widget banding: valid menurut banding.js, empat fitur, simpul disorot ada, nilai cocok dengan langkah.txt", () => {
    expect(banding.cekData(bandingMentah)).toEqual([]);
    expect(bandingMentah.opsi.map((o) => o.id)).toEqual(["tabel", "dbos"]);
    expect(bandingMentah.opsi.map((o) => o.nama)).toEqual(["A · Tabel langkah buatan (pilihan ADR 54)", "B · DBOS Go v1.8.0 (dibandingkan)"]);
    expect(bandingMentah.fitur.map((f) => f.label)).toEqual(["Mati sesudah jurnal ditulis", "Mati sesudah langkah jurnal tercatat", "Kode yang ditulis", "Yang disimpan per angsuran"]);
    const [f1, f2, f3, f4] = bandingMentah.fitur as [Banding["fitur"][number], Banding["fitur"][number], Banding["fitur"][number], Banding["fitur"][number]];
    const hasil = barisA.map((r) => ({ cara: r[0]!, titik: r[1]!, akhir: Number(r[5]), berkurang: Number(r[6]) }));
    const akhir = (cara: string, titik: RegExp): number => hasil.find((h) => h.cara === cara && titik.test(h.titik))!.akhir;
    expect(akhir("tabel langkah", /^dalam langkah jurnal/)).toBe(1);
    expect(akhir("DBOS RunAsStep, tanpa referensi", /^dalam langkah jurnal/)).toBe(2);
    expect(f1.catatan.tabel).toContain("jurnal akhir 1, saldo berkurang Rp100.000, status dicatat (langkah.txt bagian A)");
    expect(f1.catatan.dbos).toContain("RunAsStep tanpa referensi: jurnal akhir 2 dan saldo berkurang Rp200.000");
    expect(f1.catatan.dbos).toContain("RunAsStep dengan referensi unik: jurnal akhir 1. RunAsTransaction mati sebelum commit, jadi belum ada jurnal, dan jurnal akhirnya 1 (langkah.txt bagian A)");
    expect(f1.nada).toEqual({ dbos: "warn" });
    expect(hasil.filter((h) => /sesudah langkah jurnal tercatat/.test(h.titik)).every((h) => h.akhir === 1 && h.berkurang === perAngsuran)).toBe(true);
    expect(f2.catatan.tabel).toContain("Status angsuran sudah terjurnal. Proses kedua melanjutkan ke dicatat: jurnal akhir 1, saldo berkurang Rp100.000");
    expect(f2.catatan.dbos).toContain("jurnal akhir 1 di ketiga cara DBOS");
    expect(f2.nada).toBeUndefined();
    expect(f3.catatan.tabel).toContain("56 baris untuk alur dan penanda, tanpa inisialisasi");
    expect(f3.catatan.dbos).toContain("RunAsStep 59 baris dan RunAsTransaction 54, ditambah inisialisasi 12 dan 15 baris: jumlahnya 71 dan 69");
    expect(f4.catatan.dbos).toContain("5 baris sistem per angsuran di 15 tabel, ditambah satu baris transaction_completion per langkah RunAsTransaction. Dengan 1,2 juta angsuran per tahun (Asumsi), 6 juta baris per tahun (Hitungan; retensi tidak dibaca).");
    expect(f4.catatan.tabel).toContain("Tidak ada tabel atau baris tambahan");
    const sub = (o: number, id: string): string => bandingMentah.opsi[o]!.baris.flat().find((s) => s.id === id)!.sub!;
    expect(sub(0, "kode")).toBe("56 baris");
    expect(sub(1, "kode")).toBe("59 atau 54 baris, plus inisialisasi");
    expect(sub(1, "status")).toBe("15 tabel, schema sendiri");
    expect(sub(1, "simpan")).toBe("5 per angsuran");
    expect(sub(0, "status")).toBe("menunggu, terjurnal, dicatat");
    expect(bandingMentah.fitur.map((f) => f.sorot)).toEqual([
      { tabel: ["job", "ledger", "status"], dbos: ["job", "ledger", "status"] },
      { tabel: ["job", "status"], dbos: ["job", "status"] },
      { tabel: ["kode"], dbos: ["kode"] },
      { tabel: ["simpan", "status"], dbos: ["simpan", "status"] },
    ]);
    expect(bandingMentah.judul).toBe("Satu alur angsuran: tabel langkah buatan sendiri atau DBOS Go");
    harus("**Ubah satu hal:** pindah dari Mati sesudah jurnal ditulis ke Mati sesudah langkah jurnal tercatat. Di DBOS, jurnal akhir turun dari 2 ke 1 pada RunAsStep tanpa referensi, karena langkah jurnal sudah tercatat. Di tabel langkah buatan jurnal akhir tetap 1 di kedua kejadian.");
  });
  test("kartu Cek diri: empat kartu t5-batch, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-batch");
    expect(k.map((x) => x.id)).toEqual(["t5-batch-1", "t5-batch-2", "t5-batch-3", "t5-batch-4"]);
    expect(new Set(k.map((x) => x.url))).toEqual(new Set(["tahap-5/batch-tahan-crash/"]));
    expect(new Set(k.map((x) => x.judul))).toEqual(new Set(["5.21 Batch harian tahan crash, saga + ADR 54"]));
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(k.map((x) => x.jawab)).toEqual(jawaban);
    expect(jawaban[0]).toContain("`crash.txt` bagian B mengulang job tanpa memutar jam, dan +25 jam untuk versi benar Tidak dijalankan.");
    expect(jawaban[1]).toContain("(`serentak.txt` bagian B)");
    expect(jawaban[2]).toContain(`saldo berkurang ${rp(2 * perAngsuran)} (\`langkah.txt\` bagian A)`);
    expect(jawaban[3]).toContain(`Saldo Budi kembali ke ${rp(250_000)} dan saldo Warung Ani ke Rp0 (\`kompensasi.txt\` bagian A)`);
    expect(jawaban[3]).toContain("keadaan `terjurnal` dipasang dengan UPDATE");
  });
  test("istilah glosarium: Batch, Durable execution, Job idempoten, dan Kunci bisnis; definisi dan halaman terkunci; job idempoten menunjuk halaman yang mendefinisikannya", () => {
    const baris = (t: string): string => glosariumMdx.split("\n").find((b) => b.startsWith(`| **${t}** |`)) ?? "";
    expect(baris("Batch")).toBe("| **Batch** | Satu putaran job yang mengerjakan banyak data sekaligus, mis. semua angsuran yang jatuh tempo hari itu. | [[t5-batch]] |");
    expect(baris("Durable execution")).toBe("| **Durable execution** | Cara menjalankan alur panjang dengan mencatat tiap langkah yang selesai, supaya alur dilanjutkan dari titik berhenti sesudah proses mati. | [[t5-batch]] |");
    expect(baris("Job idempoten")).toBe("| **Job idempoten** | Job yang menghasilkan keadaan akhir yang sama, dijalankan sekali atau berkali-kali dengan input yang sama. | [[t2-job-rekonsiliasi]] |");
    expect(baris("Kunci bisnis")).toBe("| **Kunci bisnis** | Nilai unik yang dibentuk dari fakta bisnis, mis. jadwal dan nomor angsuran, dan dijaga constraint database tanpa batas umur. | [[t5-batch]] |");
    expect(baca("situs/src/content/docs/tahap-2/job-rekonsiliasi.mdx")).toContain("Job yang **idempoten** menghasilkan keadaan akhir yang sama, dijalankan sekali atau berkali-kali dengan input yang sama");
    const nama = glosariumMdx.split("\n").filter((b) => b.startsWith("| **")).map((b) => b.split("|")[1]!.trim().replace(/\*\*/g, ""));
    expect(nama.indexOf("Batch")).toBe(nama.indexOf("Backup dan uji pulih") + 1);
    expect(nama.indexOf("Durable execution")).toBe(nama.indexOf("Double-entry") + 1);
    expect(nama.indexOf("Job idempoten")).toBe(nama.indexOf("Job terjadwal") - 1);
    expect(nama.indexOf("Kunci bisnis")).toBe(nama.indexOf("Kunci akun") + 1);
    expect(jumlah(badan, "Durable execution adalah cara menjalankan alur panjang")).toBe(1);
    expect(jumlah(badan, "Angsuran adalah satu pembayaran dari satu jadwal cicilan, dan batch adalah satu putaran job yang menagih angsuran jatuh tempo ([[t5-m48]]).")).toBe(1);
  });
});

describe("penutup celah mutasi tanpa kunci baris: tabel ADR dan sengaja belum, kode Ilustrasi tab, nama tokoh, UNIQUE, dan admin", () => {
  const totalKode = Object.fromEntries(barisKode.map((r) => [r[0]!, { alur: Number(r[1]), total: Number(r[3]) }])) as Record<string, { alur: number; total: number }>;
  test("tabel opsi ADR 54: tiap sel (kecuali bukti) cocok dengan nilai turunan, kolom dan baris tidak bertukar", () => {
    const bagian = badan.slice(badan.indexOf("### ADR 54:"), badan.indexOf("**Keputusan: opsi D.**"));
    const baris = Object.fromEntries(bagian.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| |") && !b.startsWith("|---")).map((b) => { const p = pecahBaris(b); return [p[0]!, p.slice(1)]; })) as Record<string, string[]>;
    const kodeAwal = totalKode["tabel langkah"]!.total;
    expect(baris["Cara kerja"]).toEqual([
      "Job terjadwal menagih angsuran, dan Idempotency-Key 24 jam menjadi satu-satunya penahan ([[t2-job-rekonsiliasi]])",
      "Tiap langkah menerbitkan event yang memicu langkah berikutnya, tanpa tabel yang mencatat posisi angsuran",
      "Satu workflow per angsuran, dan DBOS mencatat tiap langkah di tabel sistemnya di PostgreSQL",
      "`jurnal.referensi` unik menahan jurnal kedua, dan `angsuran.status` mencatat langkah: menunggu, terjurnal, dicatat",
    ]);
    expect(baris["Kelebihan"]).toEqual([
      "Tidak ada tabel atau komponen baru",
      "Tidak ada job pusat yang memegang urutan (penalaran)",
      "Pencatatan dan pemulihan langkah ditulis sekali untuk semua alur (godoc v1.8.0)",
      `Tanpa dependency baru: satu kolom, satu tabel, dan ${kodeAwal} baris alur dan penanda di lab`,
    ]);
    expect(baris["Kekurangan"]).toEqual([
      `Sesudah 25 jam jurnal kedua ditulis, dan saldo Budi menjadi ${rp(saldoBudiAkhir)} (\`crash.txt\` bagian A)`,
      "Posisi angsuran tersebar di banyak event, dan naskah menulisnya sulit ditelusuri sampai angsuran terakhir",
      `\`RunAsStep\` tanpa referensi menulis 2 jurnal bila proses mati di dalam langkah jurnal (\`langkah.txt\` bagian A); ${totalKode["DBOS RunAsStep"]!.total} dan ${totalKode["DBOS RunAsTransaction"]!.total} baris dengan inisialisasi lawan ${kodeAwal}`,
      "Status dan pemulihan ditulis tangan untuk tiap jenis alur (penalaran)",
    ]);
    expect(baris["Biaya operasional"]).toEqual([
      "Nol tambahan, dengan harga tagihan ganda sesudah 24 jam",
      "Event streaming dan relay yang harus dipantau ([[t5-fanout]])",
      `Satu modul dan ${Object.keys(sistem).length} tabel sistem di schema sendiri, 5 baris sistem per angsuran`,
      "Angsuran yang tinggal `terjurnal` terlalu lama harus dipantau (desain, Tidak dijalankan)",
    ]);
    expect(totalKode["DBOS RunAsStep"]!.alur).toBe(59);
    expect(totalKode["DBOS RunAsTransaction"]!.alur).toBe(54);
    expect(kodeT5.join("\n")).toContain("24*time.Hour");
  });
  test("teks widget banding dan tebakan lengkap: simpul, judul baris, label, adegan, pilihan, dan alasan; angka dari rekaman", () => {
    const sub = (o: number): string[] => bandingMentah.opsi[o]!.baris.flat().map((x) => `${x.id}|${x.label}|${x.sub ?? ""}`);
    expect(sub(0)).toEqual(["job|Job cicilan|api-t5, satu proses", "ledger|Ledger|jurnal.referensi unik", "status|angsuran.status|menunggu, terjurnal, dicatat", `kode|Kode alur dan penanda|${totalKode["tabel langkah"]!.alur} baris`, "simpan|Tabel tambahan|tidak ada"]);
    expect(sub(1)).toEqual(["job|Workflow per angsuran|program Go terpisah", "ledger|Ledger|fungsi SQL milik lab", `status|Tabel sistem DBOS|${Object.keys(sistem).length} tabel, schema sendiri`, `kode|Kode alur dan penanda|${totalKode["DBOS RunAsStep"]!.alur} atau ${totalKode["DBOS RunAsTransaction"]!.alur} baris, plus inisialisasi`, "simpan|Baris sistem|5 per angsuran"]);
    for (const o of bandingMentah.opsi) expect(o.judulBaris).toEqual(["", "Tempat status langkah", "Yang ditulis dan disimpan"]);
    expect(bandingMentah.opsi.map((o) => o.baris.map((b) => b.length))).toEqual([[2, 1, 2], [2, 1, 2]]);
    expect(bandingMentah.fitur[0]!.catatan.tabel).toBe(`Ledger sudah menulis satu jurnal dan angsuran masih menunggu. Proses kedua menemukan jurnal lewat referensi: jurnal akhir 1, saldo berkurang ${rp(perAngsuran)}, status dicatat (langkah.txt bagian A).`);
    expect(bandingMentah.fitur[0]!.catatan.dbos).toBe(`RunAsStep tanpa referensi: jurnal akhir 2 dan saldo berkurang ${rp(2 * perAngsuran)}, karena langkah baru tercatat sesudah fungsinya kembali. RunAsStep dengan referensi unik: jurnal akhir 1. RunAsTransaction mati sebelum commit, jadi belum ada jurnal, dan jurnal akhirnya 1 (langkah.txt bagian A).`);
    expect(bandingMentah.fitur[1]!.catatan.tabel).toBe(`Status angsuran sudah terjurnal. Proses kedua melanjutkan ke dicatat: jurnal akhir 1, saldo berkurang ${rp(perAngsuran)} (langkah.txt bagian A).`);
    expect(bandingMentah.fitur[1]!.catatan.dbos).toBe(`Langkah jurnal sudah tercatat di tabel sistem, jadi tidak dijalankan lagi: jurnal akhir 1 di ketiga cara DBOS, saldo berkurang ${rp(perAngsuran)} (langkah.txt bagian A).`);
    expect(bandingMentah.fitur[2]!.catatan.tabel).toBe(`${totalKode["tabel langkah"]!.alur} baris untuk alur dan penanda, tanpa inisialisasi (langkah.txt bagian B, dihitung dari wilayah bertanda di kode).`);
    expect(bandingMentah.fitur[2]!.catatan.dbos).toBe(`RunAsStep ${totalKode["DBOS RunAsStep"]!.alur} baris dan RunAsTransaction ${totalKode["DBOS RunAsTransaction"]!.alur}, ditambah inisialisasi 12 dan 15 baris: jumlahnya ${totalKode["DBOS RunAsStep"]!.total} dan ${totalKode["DBOS RunAsTransaction"]!.total} (langkah.txt bagian B, dihitung dari wilayah bertanda).`);
    expect(bandingMentah.fitur[3]!.catatan.tabel).toBe("Tidak ada tabel atau baris tambahan: status ada di kolom angsuran.status dan referensi ada di jurnal (langkah.txt bagian B).");
    expect(bandingMentah.fitur[3]!.catatan.dbos).toBe(`5 baris sistem per angsuran di ${Object.keys(sistem).length} tabel, ditambah satu baris transaction_completion per langkah RunAsTransaction. Dengan 1,2 juta angsuran per tahun (Asumsi), 6 juta baris per tahun (Hitungan; retensi tidak dibaca).`);
    const t = tebakMentah;
    expect(t.judul).toBe("Dua job cicilan serentak, saldo cukup untuk satu angsuran");
    expect(t.adegan).toEqual([
      `Saldo satu karyawan ${rp(saldoAwal)}, dan jadwalnya punya dua angsuran sebesar saldo itu. Hanya angsuran ke-1 yang jatuh tempo.`,
      "Lab menahan kunci buku supaya dua job cicilan sudah membaca daftar yang sama sebelum salah satunya menulis. Lalu kunci dilepas.",
    ]);
    expect(t.pilihan.map((x) => x.benar)).toEqual([false, false, false, true]);
    expect(t.pilihan.map((x) => x.teks)).toEqual([
      "Dua jurnal untuk angsuran ke-1, dan database menolak yang kedua karena saldo karyawan menjadi negatif.",
      "Satu jurnal, dan job yang kalah menghitung angsuran itu gagal karena saldo sudah Rp0.",
      "Satu jurnal, dan satu job melewati angsuran itu karena Idempotency-Key masih hidup.",
      "Satu jurnal: satu job menulisnya, job lain menemukannya lewat referensi, dan angsuran ke-1 dicatat.",
    ]);
    expect(t.pilihan[0]!.alasan).toBe("Rekaman bagian B mencatat satu jurnal dengan referensi angsuran:7:1. Job yang kalah tidak menulis jurnal kedua, jadi tidak ada yang ditolak karena saldo.");
    expect(t.pilihan[1]!.alasan).toBe("Itu hasil kode lama yang membaca referensi sebelum mengunci buku: jurnal baru 1, jurnal sudah ada 0, gagal 1 (README lab, tes Go). Rekaman bagian B mencatat gagal 0, dan angsuran ke-1 berstatus dicatat.");
    expect(t.pilihan[2]!.alasan).toBe("Itu pola versi pertama (serentak.txt bagian C, dilewati 1). Versi benar tidak memakai key: job yang kalah menemukan jurnal lewat referensi, dan hitungannya jurnal sudah ada 1, bukan dilewati.");
    expect(t.label).toEqual({ sumber: "Rekaman lab · serentak.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" });
    expect(t.id).toBe("t5-batch-tebak");
  });
  test("tabel Sengaja belum dilakukan: tiap sel dan urutan baris; notifikasi angsuran tidak ada di outbox_jenis_check migrasi lab", () => {
    const sb = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf("</Blok>", badan.indexOf("### Sengaja belum dilakukan")));
    const baris = sb.split("\n").filter((b) => b.startsWith("|")).slice(2).map(pecahBaris);
    expect(baris).toEqual([
      ["Notifikasi angsuran", "Kolom `jenis` di `outbox` tidak punya nilai angsuran, jadi \"dua notifikasi\" di [[t5-m48]] tetap Ilustrasi", "Belum dijadwalkan"],
      ["Langkah akhir yang gagal permanen sungguhan", "Lab memasang keadaan `terjurnal` dengan UPDATE dan merekam kompensasinya", "Belum dijadwalkan"],
      ["Klaim per baris dan pembatas laju 20 per detik di job", "Job lab membaca daftar lalu mengunci buku per angsuran, tanpa `klaim_sampai` dan tanpa pembatas laju", "Belum dijadwalkan"],
      ["Kompensasi atas merchant yang sudah dibekukan", "Lab tidak menjalankannya (README lab)", "Belum dijadwalkan"],
      ["Retensi tabel DBOS dan gerbang pemindai atas modulnya", "Lab tidak membaca pengaturan retensi, dan govulncheck dan grype Tidak dijalankan atas modul itu", "Belum dijadwalkan"],
      ["Temporal", "Dokumentasinya tidak dibuka", "[[t5-adr-60]]"],
    ]);
    const cek = cari(/outbox_jenis_check CHECK \(jenis = ANY \(ARRAY\[([^\]]+)\]\)\)/, migrasi26.join("\n"), "outbox_jenis_check")[1]!;
    expect(cek).not.toContain("angsuran");
    expect(cek).toBe("'bayar', 'transfer', 'topup', 'promo', 'verifikasi', 'pengumuman'");
  });
  test("kode Ilustrasi tab Node.js, Laravel, dan Django: jadwal 7 ke-1 dari serentak.txt, referensi angsuran:<jadwal>:<ke>", () => {
    const jadwal = Number(cari(/jadwal (\d+): dua angsuran sebesar saldo itu/, di(serentak, sB + 1), "jadwal serentak")[1]);
    expect(jadwal).toBe(7);
    const kode = [...badan.matchAll(/<Snippet lang="(\w+)" code=\{`([\s\S]*?)`\} \/>/g)].map((m) => [m[1]!, m[2]!] as const);
    expect(kode.map((k) => k[0])).toEqual(["js", "php", "python"]);
    expect(kode[0]![1]).toBe(`await queue.add("tagih", { jadwal: ${jadwal}, ke: 1 }, {\n  jobId: "angsuran:${jadwal}:1",\n});`);
    expect(kode[1]![1]).toBe('class TagihAngsuran implements ShouldQueue, ShouldBeUnique\n{\n    public function uniqueId(): string\n    {\n        return "angsuran:{$this->jadwal}:{$this->ke}";\n    }\n}');
    expect(kode[2]![1]).toBe(`Jurnal.objects.bulk_create(\n    [Jurnal(referensi="angsuran:${jadwal}:1", jenis="angsuran")],\n    ignore_conflicts=True,\n)`);
  });
  test("UNIQUE dan admin: tiap kalimat memakai kata itu di tempat yang diturunkan dari migrasi dan kode; nama tokoh Citra dan Budi hanya di kalimat dengan saldonya", () => {
    expect(migrasi26).toContain("ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;");
    harus("Referensi adalah kolom di `jurnal` dengan constraint UNIQUE dan tanpa kolom kedaluwarsa.");
    const tab = [...badan.matchAll(/<Fragment slot="t0">\n\n([\s\S]*?)\n<\/Fragment>/g)][0]![1]!;
    expect(tab).toContain("**Yang berbeda di stack ini:** penahannya constraint UNIQUE di database, dan kodenya `INSERT ... ON CONFLICT (referensi) DO NOTHING` yang ditulis tangan.");
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban[0]).toContain("Referensi adalah kolom UNIQUE di `jurnal` tanpa kolom kedaluwarsa, dan kode versi benar tidak membaca jam.");
    expect(badan).toContain("- [ ] Pekerjaan berulang punya kunci bisnis UNIQUE di database, bukan hanya Idempotency-Key yang kedaluwarsa.");
    expect(jumlah(badan, "UNIQUE")).toBe(4);
    // admin: kode dan rekaman
    expect(kodeT5.join("\n")).toContain('if admin.Jenis != "admin" {');
    expect(komp).toContain("exit 2: kompensasi angsuran 1:1: dilarang");
    harus("Kode memeriksa peminta: hanya admin, dan alasan minimal 20 karakter. Rekaman `kompensasi.txt` menunjukkan karyawan ditolak, admin berhasil, dan saldo kembali:");
    // Citra: jadwal 2, saldo Rp150.000; Budi: saldo Rp50.000 dan Rp250.000 (versi pertama dan kompensasi)
    const barisCitra = badan.split("\n").filter((b) => /\bCitra\b/.test(b));
    expect(barisCitra).toHaveLength(2);
    expect(barisCitra[0]).toContain("Saldo Citra turun satu kali, dan putaran ketiga tidak mengerjakan apa pun:");
    expect(barisCitra[1]).toContain(`Saldo Citra ${rp(saldoCitra)} sama dengan`);
    expect(di(crash, nB + 1)).toContain("Citra");
    const barisBudi = badan.split("\n").filter((b) => /\bBudi\b/.test(b) && !b.startsWith("<Snippet"));
    for (const b of barisBudi) expect(/Rp50\.000|Rp250\.000/.test(b), b).toBe(true);
    expect(barisBudi).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 2: kunci kalimat dan sidik (dibangkitkan dari berkas saat ini oleh PERBARUI_KUNCI=1)
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "membantu", "menunggu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lama", "lebih", "dilewati", "habis", "kedaluwarsa", "referensi", "jurnal", "key", "sebaiknya", "kadang", "kalah", "gagal", "dicatat", "terjurnal", "setidaknya", "kapan saja", "kapan pun"];
const sidikKata = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const tekstual = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const angkaDari = (t: string): string[] => [...t.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]);
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
// Kalimat prosa (di luar tabel) yang memuat 'semua' dan 'hanya': tiap kalimat berlingkup dan dicek ke sumbernya (dokumentasi, kode, rekaman).
const SEMUA_TERKUNCI: string[] = [
  "Dokumentasi yang sama menulis bahwa `DO NOTHING` tanpa `conflict_target` menangani konflik dengan semua constraint dan indeks unik yang dapat dipakai.",
  "Dokumentasi menulis bahwa kunci dilepas saat job selesai atau semua percobaan ulangnya gagal, dan atribut `UniqueFor` menentukan batas waktu sesudahnya job tidak lagi unik.",
];
const HANYA_TERKUNCI: string[] = [
  "Versi benar memakai referensi itu, sedangkan versi pertama hanya memakai Idempotency-Key.",
  "Dokumentasi PostgreSQL 17.11 menulis bahwa RETURNING hanya mengembalikan baris yang berhasil ditulis ([PostgreSQL 17.11, INSERT](https://www.postgresql.org/docs/17/sql-insert.html), dibuka 2026-11-03).",
  "Kode ini menyebut `(referensi)`, jadi hanya konflik di kolom itu yang diabaikan.",
  "Database menolaknya dengan constraint `jurnal_referensi_key` (dari `run.py` dan README lab, karena rekaman hanya memuat hasilnya):",
  "Ia menemukan jurnal yang sudah ada dan hanya menandai angsurannya.",
  "Kode versi benar tidak membaca jam: di job cicilan, `-lab-sekarang` hanya dipakai versi pertama (README lab), dan `CatatJurnalReferensi` tidak punya syarat waktu.",
  "`TandaiAngsuran` memajukan status hanya dari status asal yang disebut.",
  "Kode memeriksa peminta: hanya admin, dan alasan minimal 20 karakter.",
  "Hanya satu baris yang menagih dua kali: `RunAsStep` tanpa referensi, mati di dalam langkah jurnal.",
  "Temporal hanya disebut di naskah.",
  "Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-03.",
  "Identifier hanya mengelompokkan panggilan supaya bisa dibatalkan bersama, dan panggilan yang berbagi identifier berjalan sendiri-sendiri.",
  "Hanya admin yang boleh, dengan alasan minimal 20 karakter.",
  "Di Tahap 5 jenis alur panjang hanya satu: cicilan dan tabungan memakai satu mesin status ([[t5-adr-60]]).",
  "- **Temporal** hanya disebut di naskah, dan dokumentasinya tidak dibuka.",
  "- [ ] Pekerjaan berulang punya kunci bisnis UNIQUE di database, bukan hanya Idempotency-Key yang kedaluwarsa.",
  "- [ ] Status angsuran dimajukan hanya dari status asal yang diharapkan.",
];
const kartuBatch = kartuSemua.filter((x) => x.halaman === "t5-batch");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/[Pp]enalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-03/g) ?? []).length, tanggal: (halaman.match(/2026-11-03/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), tebak: sidikKata(nilaiString(tebakMentah).join("\n"), KATA), banding: sidikKata(nilaiString(bandingMentah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  riset: ["R5-210", "R5-211", "R5-212", "R5-213", "R5-214"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), banding: h16(JSON.stringify(bandingMentah)), kartu: h16(JSON.stringify(kartuBatch)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah), banding: tekstual(bandingMentah), kartu: tekstual(kartuBatch) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat batch-tahan-crash.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "batch-tahan-crash.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, tebakan, banding, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, tebakan, banding, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, tebakan, dan banding", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.tebak).toEqual(SIDIK.tebak);
    expect(sidikSekarang.banding).toEqual(SIDIK.banding);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});

describe("penutup celah mutasi peninjau (keputusan 1583): klaim yang tidak punya turunan dari sumber", () => {
  const paragraf = (potong: string): string => paragrafDengan(potong);
  const kolomRiset = (id: string): string => barisRiset(id);
  const nLangkahA = garis(langkah, /^# --- A\./);
  test("huruf bagian rekaman di prosa dan noscript diturunkan dari judul bagian yang memuat faktanya", () => {
    // Inti: 'Bagian C menolak INSERT jurnal ...' harus bagian yang memuat ERROR duplicate key
    const hurufError = crash[nC - 1]!.match(/^# --- ([A-Z])\./)![1]!;
    expect(nErrorC).toBeGreaterThan(nC);
    harus(`Bagian ${hurufError} menolak INSERT jurnal dengan referensi yang sama.`);
    // bagian B serentak: dua job menunggu lock yang sama, saldo cukup untuk satu angsuran
    const hurufSerentakB = serentak[sB - 1]!.match(/^# --- ([A-Z])\./)![1]!;
    expect(serentak[sB - 1]).toContain("berebut buku");
    harus(`<p>Tanpa JavaScript tombol tebakan tidak berfungsi dan widget perbandingan tidak tampil. Jawaban yang tepat: satu job menulis jurnal angsuran ke-1, job lain menemukannya lewat referensi, dan angsuran dicatat (jurnal baru 1, jurnal sudah ada 1, gagal 0; serentak.txt bagian ${hurufSerentakB}).</p>`);
    // noscript: jumlah jurnal akhir RunAsStep tanpa referensi diturunkan dari baris langkah.txt
    const barisStep = langkah.find((b) => b.includes("DBOS RunAsStep, tanpa referensi") && b.includes("dalam langkah jurnal"))!;
    const akhirStep = sel(barisStep)[5]!;
    expect(akhirStep).toBe("2");
    harus(`DBOS RunAsStep tanpa referensi menghasilkan ${akhirStep} (langkah.txt bagian ${langkah[nLangkahA - 1]!.match(/^# --- ([A-Z])\./)![1]!})`);
  });
  test("bentuk Idempotency-Key versi pertama dan umurnya diturunkan dari kode tagihRentan, tanda suntikan dari run.py", () => {
    const rentan = kodeT5.join("\n");
    const bentuk = cari(/kunci := fmt\.Sprintf\("([a-z]+):%d:%d", a\.JadwalID, a\.Ke\)/, rentan, "kunci tagihRentan")[1]!;
    expect(bentuk).toBe("cicilan");
    harus(`dengan bentuk \`${bentuk}:<jadwal>:<ke>\``);
    const umur = cari(/kini\.Add\((\d+)\*time\.Hour\)/, rentan, "umur key")[1]!;
    harus(`Versi pertama memberinya umur ${umur} jam dari jam job`);
    // sinyal mematikan job: rekaman crash.txt bagian B
    const sinyal = cari(/job pertama: keluar dengan sinyal (\d+) \((SIG[A-Z]+)\)/, crash.join("\n"), "sinyal")!;
    harus(`dengan sinyal ${sinyal[1]} (${sinyal[2]}) ke prosesnya sendiri`);
    // penanda baris lab di kode dan run.py
    const penanda = cari(/"(\/\/ lab)" not in l/, runLab, "penanda suntikan lab di run.py")[1]!;
    harus(`Baris bertanda \`${penanda}\` dipasang lab untuk mematikan proses di titik tertentu.`);
    const bertanda = kodeT5.filter((b) => b.includes(penanda));
    expect(bertanda.length).toBeGreaterThan(0);
    expect(bertanda.some((b) => /berhenti/.test(b))).toBe(true);
  });
  test("urutan kunci buku sebelum baca referensi di jurnalAngsuran diturunkan dari kode, dan kalimat halaman, daftar periksa, dan perbaikan memakai urutan itu", () => {
    const n = garis(kodeT5, /^func \(s Service\) jurnalAngsuran\(/);
    const nKunci = garis(kodeT5, /^\tbuku, err := tx\.KunciBukuAkun\(ctx, akun\.\.\.\)$/, n);
    const nRef = garis(kodeT5, /^\tif referensi != nil \{$/, nKunci);
    expect(nKunci).toBeLessThan(nRef);
    harus("`jurnalAngsuran` mengunci buku akun dan merchant lebih dulu, baru membaca referensi:");
    expect(badan).toContain("- [ ] Referensi dibaca sesudah buku dikunci, bukan sebelumnya.");
    expect(jumlah(badan, "dan hijau sesudah urutan dibalik.")).toBe(1);
    expect(readmeLab).toContain("dan hijau sesudah perbaikan");
    expect(badan).not.toContain("hijau sebelum urutan");
  });
  test("pilihan ADR 54: tabel langkah dipakai dan DBOS dibandingkan, diturunkan dari naskah; aturan 3 satu jurnal; tiga penyebab pre-mortem; syarat tiga atau lebih", () => {
    expect(naskah).toContain("tabel langkah buatan sendiri dibandingkan dengan DBOS");
    expect(naskah).toContain("DBOS Go v1.8.0 (workflow dengan checkpoint di PostgreSQL, MIT; dibandingkan;");
    harus("6. Tabel langkah buatan dipakai, dan DBOS Go dibandingkan, bukan dipakai. Pembandingnya rekaman `langkah.txt`.");
    harus("3. Job boleh dijalankan ulang kapan saja. Dua job serentak menghasilkan satu jurnal, karena referensi dibaca sesudah kunci buku didapat.");
    const dari = badan.indexOf("**Pre-mortem.**");
    const sampai = badan.indexOf("**Kapan keputusan ini salah.**");
    const butir = badan.slice(dari, sampai).split("\n").filter((b) => /^\d+\. /.test(b)).length;
    expect(butir).toBe(3);
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    const syarat = cari(/Jenis alur panjang bertambah dari satu \([^)]*\) menjadi (\w+ atau lebih) \(Asumsi\)/, naskah, "syarat jenis alur")[1]!;
    expect(syarat).toBe("tiga atau lebih");
    harus(`- Saat jenis alur panjang bertambah dari satu menjadi ${syarat} (Asumsi dari naskah).`);
    expect(naskah).toContain("Cron dan job idempoten saja (ADR 19; ditolak: M48, key 24 jam)");
  });
  test("nomor ADR yang membatasi umur key diturunkan dari registry halaman 2.14", () => {
    const nomor = dari("t2-idempotency").adr![0]!;
    expect(dari("t2-idempotency").adr).toEqual([14]);
    harus(`ADR ${nomor} sudah menulis batas itu: keputusannya salah saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama ([[t2-idempotency]]).`);
  });
  test("klaim kode dan dokumentasi tanpa penjaga: BeginTx, transaction RunAsTransaction, penjaga status gagal, kutipan Django, dan asal 1,2 juta", () => {
    expect(kodeTx).toContain("r.db.BeginTx(ctx, nil)");
    harus("Lab membuka transaction tanpa opsi isolasi (`BeginTx(ctx, nil)`), jadi isolasinya bawaan PostgreSQL (dibaca dari kode lab, Tidak dijalankan).");
    expect(readmeLab).toContain("`RunAsTransaction`: jurnal dan catatan selesainya satu transaction di database aplikasi");
    harus("`RunAsTransaction` menulis catatan selesainya di transaction database aplikasi yang sama dengan langkahnya.");
    // job biasa tidak menagih angsuran gagal: daftar jatuh tempo hanya menunggu dan terjurnal
    expect(kodeRepo.join("\n")).toContain("WHERE a.status IN ('menunggu', 'terjurnal') AND a.jatuh_tempo <= $1::date");
    expect(komp.join("\n")).toContain("# job biasa sesudah kompensasi: dibaca 0 (angsuran gagal tidak ditagih lagi)");
    expect(badan).toContain("- [ ] Job tidak menagih angsuran berstatus `gagal`.");
    // kutipan Django ke baris riset, kalimat halaman memakai arti yang sama
    expect(kolomRiset("R5-211")).toContain("tells the database to ignore failure to insert any rows that fail constraints such as duplicate unique values");
    harus("**Yang berbeda di stack ini:** `ignore_conflicts=True` menyuruh database mengabaikan kegagalan insert untuk baris yang melanggar constraint, seperti nilai unik ganda. Dokumentasi juga menulis bahwa pengaturan itu menonaktifkan pengisian primary key di tiap instance model. Id jurnal yang sudah ada dibaca dengan query terpisah, seperti SELECT sesudah `DO NOTHING` di Go (penalaran).");
    // 1,2 juta: naskah menulis rumusnya
    const m = cari(/`angsuran` 100\.000 jadwal × 12 angsuran per tahun = ([\d,]+) juta baris/, naskah, "baris angsuran per tahun");
    harus(`Dengan ${m[1]} juta angsuran per tahun (Asumsi: 100.000 jadwal × 12 angsuran, [[t5-skema]])`);
    expect(prosa.join("\n")).toContain(`Dengan ${m[1]} juta angsuran per tahun`);
  });
  test("tiap tautan Bacaan lanjut punya alamat dan teks (tanda baca dinormalkan) yang sama dengan tautan di badan", () => {
    const daftar = badan.slice(badan.indexOf("### Bacaan lanjut"), badan.indexOf("</Blok>", badan.indexOf("### Bacaan lanjut")));
    const butir = [...daftar.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)$/gm)];
    expect(butir.length).toBe(9);
    const sebelum = badan.slice(0, badan.indexOf("### Bacaan lanjut"));
    const norm = (x: string): string => x.replace(/[:,]/g, "");
    for (const [, teks, url] of butir) {
      const inline = [...sebelum.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].filter((m) => m[2] === url).map((m) => norm(m[1]!));
      expect(inline.length, `alamat Bacaan lanjut tidak dipakai di badan: ${url}`).toBeGreaterThanOrEqual(1);
      expect(inline, `teks tautan Bacaan lanjut berbeda dari tautan di badan: ${teks}`).toContain(norm(teks!));
    }
  });
  test("baris riset yang dipakai: tanggal buka, lisensi, dan jumlah kutipan diturunkan dari README dan halaman", () => {
    expect((kolomRiset("R5-210").match(/dibuka 2026-11-03/g) ?? []).length).toBe(2);
    expect((kolomRiset("R5-211").match(/dibuka 2026-11-03/g) ?? []).length).toBe(3);
    expect((kolomRiset("R5-212").match(/dibuka 2026-11-03/g) ?? []).length).toBe(5);
    expect(readmeLab).toContain("File `LICENSE` modul: MIT License.");
    expect(kolomRiset("R5-212")).toContain("Lisensi MIT dibaca dari README lab (R5-295).");
    expect(paragraf("lisensi MIT menurut README lab")).toContain("lisensi MIT menurut README lab");
  });
});
