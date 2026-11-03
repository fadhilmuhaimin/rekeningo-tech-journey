// Penjaga halaman 5.14 (keputusan 1552 sampai 1554): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim "tidak" dan "hanya",
// urutan tebakan, diagram Rantai t5-m45-kapasitas-uang.json, skenario alur t5-m45.json, kartu Cek diri, dan baris riset di m45-pengumuman-satu-juta.mdx.
// Nilai diturunkan dari naskah Tahap 5 (baris M45 dan tabel beban), halaman PRD v5 (5.1) dan PRD v3 (3.1), rekaman labs/t5-fanout/output/
// antrean.txt, pengirim.txt, dan aliran.txt, kode api-t5 (outbox.go, pushkuota/main.go, breaker.go, lajur.go, main.go), registry, dan baris riset
// R5-175 sampai R5-179, bukan dari daftar yang ditulis sendiri. Hitungan dibulatkan setengah ke atas seperti pembaca, bukan dengan toFixed.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// m45-pengumuman-satu-juta.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang
// sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m45-pengumuman-satu-juta.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya merekam urutan klaim berkelas, c dan t pada tiruan, satu baris outbox per
// penerima (166 byte), dan kuota bersama antara pengumuman dan uang; queue uang 90 menit, pengumuman ke 1.000.000 HP, jumlah 429, dan breaker di
// lajur push tidak direkam, dan angka cerita adalah Ilustrasi.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m45-kapasitas-uang.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m45-pengumuman-satu-juta.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-5/m45-pengumuman-satu-juta.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenarioBerkas = "situs/lama/widgets/data/skenario/t5-m45.json";
const skenario = JSON.parse(baca(skenarioBerkas)) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const prdV5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const prdV3 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const m27 = baca("situs/src/content/docs/tahap-3/m27-hari-promo.mdx");
const timInfra3 = baca("situs/src/content/docs/tahap-3/tim-infra.mdx");
const recAntrean = baca("labs/t5-fanout/output/antrean.txt");
const recAntreanBaris = recAntrean.split("\n");
const recPengirim = baca("labs/t5-fanout/output/pengirim.txt");
const recPengirimBaris = recPengirim.split("\n");
const recAliran = baca("labs/t5-fanout/output/aliran.txt");
const recAliranBaris = recAliran.split("\n");
const outboxGo = baca("labs/api-t5/internal/repo/outbox.go");
const outboxGoBaris = outboxGo.split("\n");
const pushkuotaGo = baca("labs/api-t5/cmd/pushkuota/main.go");
const breakerGo = baca("labs/api-t5/cmd/api/breaker.go");
const breakerGoBaris = breakerGo.split("\n");
const lajurGo = baca("labs/api-t5/internal/lajur/lajur.go");
const mainGo = baca("labs/api-t5/cmd/api/main.go");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
  jalurTebakan: (d: Skenario) => string;
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; adr?: number[]; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
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
const pecahBaris = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
// pembulatan setengah ke atas seperti pembaca, bukan toFixed
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number, d = 1): string => bulat(x, d).toFixed(d).replace(".", ",");
const ribu = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const angkaKoma = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;
const KATA_BILANGAN: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam" };
const kata = (n: number): string => {
  const k = KATA_BILANGAN[n];
  if (!k) throw new Error(`kata bilangan untuk ${n} belum ada`);
  return k;
};
const huruf1 = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

// --- nilai yang diturunkan dari naskah, PRD v5, dan rekaman pengirim.txt
const barisBeban = cari(/\| Notifikasi uang dan worker \|[^\n]+/, naskah, "baris beban notifikasi")[0];
const msNaskah = cari(/Makan siang: ([\d.]+) × ([\d,]+) ÷ ([\d.]+) = ([\d,]+) = (\d+)% \(trx 2: ([\d,]+) = (\d+)%\)/, barisBeban, "makan siang naskah");
const barisQueue = cari(/\| Queue bila tetap 4 pengirim \|[^\n]+/, naskah, "baris queue naskah")[0];
const umurNaskah = cari(/2\.400 × \(1 − ([\d,]+) ÷ ([\d,]+)\) = ([\d.]+) detik = ([\d,]+) menit/, barisQueue, "umur tertua naskah");
const kapNaskah = cari(/c = (\d), t = ([\d,]+) detik, kapasitas ([\d,]+) per detik/, barisBeban, "kapasitas naskah");
const harian3 = angkaKoma(msNaskah[1]!); // 650.000 = 600.000 transaksi uang + 50.000 top-up
const bagianSiang = angkaKoma(msNaskah[2]!); // 0,8
const detikSiang = angkaKoma(msNaskah[3]!); // 5.400
const pengirimC = Number(kapNaskah[1]); // c = 4
const lamaT = angkaKoma(kapNaskah[2]!); // t = 0,3
const KAP = bulat(pengirimC / lamaT, 2); // 13,33
const trx2Naskah = cari(/\| Transaksi uang \(bayar, transfer, QR\) \|[^\n]+= ([\d.]+) per hari \(trx 2: ([\d.]+)\)[^\n]+/, naskah, "baris trx naskah");
const topupNaskah = angkaKoma(cari(/\| Top-up dari bank \|[^\n]*?\| ([\d.]+) per hari \|/, naskah, "baris top-up naskah")[1]!);
const harian2 = angkaKoma(trx2Naskah[2]!) + topupNaskah; // trx 2: 400.000 transaksi uang + 50.000 top-up
interface Makan { lam: number; lamT: string; pakai: number; tumbuh: number; umur: (t: number) => { detik: number; menit: number }; isi: number }
const makan = (harian: number): Makan => {
  const lam = bulat((harian * bagianSiang) / detikSiang, 1);
  return {
    lam, lamT: koma(lam, 1), pakai: bulat((lam / KAP) * 100, 0), tumbuh: bulat(lam - KAP, 0),
    umur: (t: number) => { const d = bulat(t * (1 - KAP / lam), 0); return { detik: d, menit: bulat(d / 60, 1) }; },
    isi: Math.round(((lam - KAP) * detikSiang) / 1000) * 1000,
  };
};
const M3 = makan(harian3);
const M2 = makan(harian2);

// --- rekaman antrean.txt
const barisKe = (baris: string[], pola: RegExp, dari0 = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan`);
  return i;
};
const iA = barisKe(recAntreanBaris, /^# --- A\./);
const iB = barisKe(recAntreanBaris, /^# --- B\./);
const iRentanA = barisKe(recAntreanBaris, /^-- mode rentan urut-waktu \(M27\)/);
const iBenarA = barisKe(recAntreanBaris, /^-- versi benar: satu putaran worker mengklaim menurut kelas/);
const iAkhirA = barisKe(recAntreanBaris, /^\(3 rows\)$/, iBenarA);
const iBenarB = barisKe(recAntreanBaris, /^-- versi benar: tiap consumer dibatasi/);
const iUmurBenarB = barisKe(recAntreanBaris, /^-- umur notifikasi uang tertua yang masih menunggu/, iBenarB);
const iRentanB = barisKe(recAntreanBaris, /^-- mode rentan: tiap consumer tanpa batas laju/);
const iUmurRentanB = barisKe(recAntreanBaris, /^-- umur notifikasi uang tertua melebihi/, iRentanB);
const tabelKelas = (dari0: number): Record<string, number> => {
  const hasil: Record<string, number> = {};
  for (const b of recAntreanBaris.slice(dari0, dari0 + 8)) {
    const m = b.match(/^ (\d)\s+\| (menunggu|terkirim)\s+\| (\d+)$/);
    if (m) hasil[`${m[1]} ${m[2]}`] = Number(m[3]);
  }
  return hasil;
};
const A_RENTAN = tabelKelas(iRentanA + 3);
const A_BENAR = tabelKelas(iBenarA + 3);
const nilaiBaris = (pola: RegExp, dari0: number): string => cari(pola, recAntreanBaris.slice(dari0).join("\n"), String(pola))[1]!;
const B = {
  diterima: Number(nilaiBaris(/^-- pengumuman diterima: (\d+)$/m, iBenarB)),
  p429: Number(nilaiBaris(/^-- pengumuman dijawab 429: (\d+)$/m, iBenarB)),
  u429: Number(nilaiBaris(/^-- notifikasi uang dijawab 429: (\d+)$/m, iBenarB)),
  laju: Number(cari(/dibatasi (\d+) pesan per detik \((\d) x (\d+) = (\d+) per detik, di bawah kuota ([\d.]+)\), (\d) pengirim/, recAntreanBaris[iBenarB]!, "baris versi benar B")[1]),
  konsumen: Number(cari(/\((\d) x (\d+) = (\d+) per detik/, recAntreanBaris[iBenarB]!, "tiga consumer")[1]),
  total: Number(cari(/\((\d) x (\d+) = (\d+) per detik/, recAntreanBaris[iBenarB]!, "total")[3]),
  kuota: angkaKoma(cari(/di bawah kuota ([\d.]+)\)/, recAntreanBaris[iBenarB]!, "kuota")[1]!),
  pengirimBenar: Number(cari(/, (\d) pengirim$/, recAntreanBaris[iBenarB]!, "pengirim benar")[1]),
  serentak: Number(cari(/\((\d+) pengirim serentak melawan kuota ([\d.]+) per detik\)/, recAntreanBaris[iRentanB]!, "serentak rentan")[1]),
  pengirimRentan: Number(cari(/, (\d+) pengirim \(/, recAntreanBaris[iRentanB]!, "pengirim rentan")[1]),
  batasUmur: Number(cari(/tidak pernah melebihi (\d+) detik \(batas lab\): ya$/, recAntreanBaris[iUmurBenarB]!, "batas umur")[1]),
  perangkat: angkaKoma(cari(/^-- ([\d.]+) perangkat aktif, tiga consumer/, recAntreanBaris[iB + 1]!, "perangkat B")[1]!),
};

// --- rekaman pengirim.txt dan aliran.txt
const iPengA = barisKe(recPengirimBaris, /^# --- A\./);
const iPengB = barisKe(recPengirimBaris, /^# --- B\./);
const pengA = recPengirimBaris.slice(iPengA, iPengB).join("\n");
const L = cari(/^L = lambda x t = ([\d,]+) x ([\d,]+) = ([\d,]+) -> (\d+) pengirim serentak/m, pengA, "L")!;
const P8 = cari(/^(\d+) proses x (\d+) = (\d+) pengirim -> kapasitas \d+ \/ [\d,]+ = ([\d,]+) per detik, terpakai [\d,]+ \/ [\d,]+ = ([\d,]+)%$/m, pengA, "8 proses")!;
const P11 = cari(/^(11) proses x (\d+) = (\d+) pengirim -> kapasitas \d+ \/ [\d,]+ = ([\d,]+) per detik, terpakai [\d,]+ \/ [\d,]+ = ([\d,]+)%$/m, pengA, "11 proses")!;
const BREAKER66 = cari(/^breaker per proses: (\d+) kegagalan x (\d+) proses = (\d+) kegagalan/m, pengA, "breaker 66")!;
const iAliranB = barisKe(recAliranBaris, /^# --- B\. Pembanding/);
const byteBaris = Number(cari(/bertambah (\d+) byte per baris, tanpa index/, recAliran, "byte per baris")[1]);
const byte300 = Number(cari(/naskah memakai (\d+) byte per baris \(Asumsi\)/, recAliran, "300 byte")[1]);
const penerima = 1_000_000;
const MB166 = Math.round((byteBaris * penerima) / 1e6);
const MB300 = Math.round((byte300 * penerima) / 1e6);

// rentang baris Snippet: diturunkan dari isi berkas, bukan angka tulisan tangan
const rentang = (baris: string[], awal: number, akhir: number): string => `${awal + 1}:${akhir + 1}`;
const iKodeUrut = barisKe(outboxGoBaris, /^\turut := "id"$/);
const iKodeAkhir = barisKe(outboxGoBaris, /^\t\t  FOR UPDATE SKIP LOCKED\)$/, iKodeUrut);
const iBreakerAwal = barisKe(breakerGoBaris, /^\/\/ breakerLajur:/);
const iBreakerAkhir = barisKe(breakerGoBaris, /^}$/, iBreakerAwal);
const SNIPPET_DITURUNKAN = [
  { file: "labs/t5-fanout/output/antrean.txt", lines: rentang(recAntreanBaris, iRentanA, iAkhirA) },
  { file: "labs/api-t5/internal/repo/outbox.go", lines: rentang(outboxGoBaris, iKodeUrut, iKodeAkhir) },
  { file: "labs/t5-fanout/output/pengirim.txt", lines: rentang(recPengirimBaris, iPengB, barisKe(recPengirimBaris, /^L = lambda x t terukur/, iPengB)) },
  { file: "labs/t5-fanout/output/aliran.txt", lines: rentang(recAliranBaris, iAliranB, barisKe(recAliranBaris, /^-- Hitungan: 166 byte/, iAliranB)) },
  { file: "labs/t5-fanout/output/antrean.txt", lines: rentang(recAntreanBaris, iB, iUmurBenarB) },
  { file: "labs/api-t5/cmd/pushkuota/main.go", region: "jendela" },
  { file: "labs/api-t5/cmd/api/breaker.go", lines: rentang(breakerGoBaris, iBreakerAwal, iBreakerAkhir) },
  { file: "labs/t5-fanout/output/antrean.txt", lines: rentang(recAntreanBaris, iRentanB, iUmurRentanB) },
];
const SNIP_RENTAN = rentang(recAntreanBaris, iRentanB, iUmurRentanB);

describe("hitungan makan siang: diturunkan dari naskah, PRD v5, dan rekaman, dibulatkan setengah ke atas", () => {
  test("naskah memuat 650.000 × 0,8 ÷ 5.400 = 96,3 = 722% dan trx 2: 66,7 = 500%; hitungan ulang sama; 650.000 = 600.000 + 50.000 seperti PRD v5", () => {
    expect([harian3, bagianSiang, detikSiang]).toEqual([650000, 0.8, 5400]);
    expect(M3.lamT).toBe(msNaskah[4]);
    expect(String(M3.pakai)).toBe(msNaskah[5]);
    expect(M2.lamT).toBe(msNaskah[6]);
    expect(String(M2.pakai)).toBe(msNaskah[7]);
    expect(KAP).toBe(13.33);
    expect(koma(KAP, 2)).toBe(kapNaskah[3]);
    expect(prdV5).toContain("| Kapasitas worker notifikasi | 13,33 per detik |");
    expect(prdV5).toContain("(600.000 + 50.000) ÷ 86.400 × 10");
    expect(harian3).toBe(angkaKoma(trx2Naskah[1]!) + topupNaskah);
    expect([harian3, harian2, topupNaskah]).toEqual([650000, 450000, 50000]);
    expect((registry.tahap as unknown as { asumsi?: { trx?: number } }[])[4]!.asumsi!.trx).toBe(2);
  });
  test("umur uang tertua 12.10: naskah 2.068 detik = 34,5 menit; hitungan ulang sama, dan 12.20 memberi 43,1 menit", () => {
    const u = M3.umur(2400);
    expect(ribu(u.detik)).toBe(umurNaskah[3]);
    expect(koma(u.menit, 1)).toBe(umurNaskah[4]);
    expect(koma(M3.umur(3000).menit, 1)).toBe("43,1");
    expect(ribu(M3.umur(3000).detik)).toBe("2.585");
    expect(koma(M2.umur(2400).menit, 1)).toBe("32,0");
    expect(ribu(M2.umur(3000).detik)).toBe("2.400");
    expect(M3.tumbuh).toBe(83);
    expect(M2.tumbuh).toBe(53);
    expect(barisQueue).toContain("±448.000 baris");
    expect(M3.isi).toBe(448000);
    expect(M2.isi).toBe(288000);
    expect(prdV5).toContain("75,2 per detik");
    expect(prdV5).toContain("564%");
  });
  test("tabel halaman: tiap sel sama dengan hitungan ulang, dan kolom 3 transaksi memakai nilai naskah", () => {
    const sel = Object.fromEntries(badan.split("\n").filter((b) => b.startsWith("|")).slice(2).map((b) => [pecahBaris(b)[0]!, pecahBaris(b)]));
    const fm = (m: Makan, t: number): string => `${ribu(m.umur(t).detik)} detik (${koma(m.umur(t).menit, 1)} menit)`;
    expect(sel["λ, uang datang per detik"]).toEqual(["λ, uang datang per detik", "(transaksi + top-up) × 0,8 ÷ 5.400", M3.lamT, M2.lamT]);
    expect(sel["Kapasitas worker per detik"]).toEqual(["Kapasitas worker per detik", `c ÷ t = ${pengirimC} ÷ ${koma(lamaT, 1)}`, koma(KAP, 2), koma(KAP, 2)]);
    expect(sel["Pemakaian worker"]).toEqual(["Pemakaian worker", `λ ÷ ${koma(KAP, 2)}`, `${M3.pakai}%`, `${M2.pakai}%`]);
    expect(sel["Queue uang tumbuh per detik"]).toEqual(["Queue uang tumbuh per detik", `λ − ${koma(KAP, 2)}`, String(M3.tumbuh), String(M2.tumbuh)]);
    expect(sel["Umur uang tertua pukul 12.10"]).toEqual(["Umur uang tertua pukul 12.10", `2.400 × (1 − ${koma(KAP, 2)} ÷ λ)`, fm(M3, 2400), fm(M2, 2400)]);
    expect(sel["Umur uang tertua pukul 12.20"]).toEqual(["Umur uang tertua pukul 12.20", `3.000 × (1 − ${koma(KAP, 2)} ÷ λ)`, fm(M3, 3000), fm(M2, 3000)]);
    expect(sel["Isi queue uang pukul 13.00"]).toEqual(["Isi queue uang pukul 13.00", `(λ − ${koma(KAP, 2)}) × 5.400`, `±${ribu(M3.isi)} baris`, `±${ribu(M2.isi)} baris`]);
    expect(Object.keys(sel)).toHaveLength(7);
  });
  test("kalimat Inti, tebak, dan paragraf asal angka: angka dari hitungan, dengan satu sumber untuk 650.000 dan 5.400", () => {
    expect(badan).toContain(`Notifikasi uang makan siang datang ${M3.lamT} per detik, dan worker mengirim ${koma(KAP, 2)} per detik. Queue uang tumbuh ${M3.tumbuh} per detik, dengan atau tanpa pengumuman (Hitungan atas Asumsi).`);
    expect(badan).toContain(`Naik, dari ${koma(M3.umur(2400).menit, 1)} menit ke ${koma(M3.umur(3000).menit, 1)} menit`);
    expect(badan).toContain(`Notifikasi uang datang ${M3.lamT} per detik, sedangkan worker mengirim ${koma(KAP, 2)} per detik. Selisihnya, ${M3.tumbuh} baris per detik`);
    expect(badan).toContain(`Notifikasi uang yang paling lama menunggu sudah berumur ${koma(M3.umur(2400).menit, 1)} menit.`);
    expect(badan).toContain("80% notifikasi sehari terjadi dalam 90 menit, yaitu 5.400 detik (Asumsi naskah)");
    expect(90 * 60).toBe(detikSiang);
    expect(badan).toContain("Notifikasi uang sehari adalah 600.000 transaksi uang ditambah 50.000 top-up bank, seperti di [[t5-prd]].");
    expect(badan).toContain("Naskah memakai 3 transaksi uang per user aktif per hari, dan registry memuat 2, jadi kolom kedua ditulis di sebelahnya.");
    expect(badan).toContain(`Tabel beban [[t5-prd]] memakai puncak 75,2 per detik, yaitu 564% kapasitas. Jendela makan siang lebih padat, jadi λ naik ke ${M3.lamT}.`);
    expect(badan).toContain(`Kapasitas ${koma(KAP, 2)} per detik datang dari c = ${pengirimC} pengirim serentak dan t = ${koma(lamaT, 1)} detik per pengiriman, dua Asumsi dari [[t3-estimasi]].`);
    expect(hitungKali(badan, "[[t3-estimasi]]")).toBe(1);
  });
  test("pengirim serentak: L = λ × t = 28,89 (29), delapan dan sebelas proses; semua dari pengirim.txt bagian A dan dihitung ulang", () => {
    expect(L[1]).toBe(M3.lamT);
    expect(L[2]).toBe(koma(lamaT, 1));
    const l = bulat(M3.lam * lamaT, 2);
    expect(koma(l, 2)).toBe(L[3]);
    expect(String(Math.ceil(l))).toBe(L[4]);
    for (const [P, proses] of [[P8, 8], [P11, 11]] as const) {
      expect(Number(P[1])).toBe(proses);
      const pengirim = proses * pengirimC;
      expect(Number(P[3])).toBe(pengirim);
      expect(koma(bulat(pengirim / lamaT, 1), 1)).toBe(P[4]);
      expect(koma(bulat((((harian3 * bagianSiang) / detikSiang) / (pengirim / lamaT)) * 100, 1), 1)).toBe(P[5]);
    }
    const proses = (n: number, kapasitas: string, pakai: string): string => `${huruf1(n === 8 ? "delapan" : "sebelas")} proses × ${pengirimC} pengirim = ${n * pengirimC} pengirim, dengan kapasitas ${kapasitas} per detik dan pemakaian ${pakai}%`;
    expect(badan).toContain(`Pengirim serentak yang dibutuhkan adalah L = λ × t = ${L[1]} × ${L[2]} = ${L[3]}, dibulatkan ke ${L[4]}.`);
    expect(badan).toContain(proses(8, P8[4]!, P8[5]!));
    expect(badan).toContain(`Pemakaian dihitung dari nilai tepat, bukan dari angka yang sudah dibulatkan. Dari ${M3.lamT} ÷ ${P11[4]} hasilnya ${koma(bulat((M3.lam / angkaKoma(P11[4]!)) * 100, 1), 1)}%.`);
    expect(koma(bulat((M3.lam / angkaKoma(P11[4]!)) * 100, 1), 1)).not.toBe(P11[5]);
    expect(badan).toContain(`Sebelas proses = ${P11[3]} pengirim, dengan kapasitas ${P11[4]} per detik dan pemakaian ${P11[5]}%`);
    expect(badan).toContain(`(Hitungan atas Asumsi; \`pengirim.txt\` bagian A mengulang hitungannya)`);
  });
  test("pengumuman 1.000.000 HP di 4 pengirim: 75.000 detik, 20,8 jam, sama dengan PRD v5; 166 byte per baris = 166 MB, naskah 300 byte = 300 MB", () => {
    const detik = (penerima * lamaT) / pengirimC;
    expect(detik).toBe(75000);
    expect(koma(detik / 3600, 1)).toBe("20,8");
    expect(prdV5).toContain("| Pengumuman ke 1.000.000 HP, 4 pengirim | 75.000 detik, atau 20,8 jam |");
    expect(badan).toContain("butuh 1.000.000 × 0,3 ÷ 4 = 75.000 detik di 4 pengirim. Itu 20,8 jam (Hitungan atas Asumsi, sama dengan [[t5-prd]]).");
    expect([byteBaris, byte300, MB166, MB300]).toEqual([166, 300, 166, 300]);
    expect(recAliran).toContain(`-- Hitungan: ${byteBaris} byte x 1.000.000 penerima = ${MB166} MB di tumpukan tabel; naskah memakai ${byte300} byte per baris (Asumsi): ${MB300} MB`);
    expect(badan).toContain(`Naskah memakai ${byte300} byte per baris, jadi ±${MB300} MB (Asumsi). Lab mengukur ${byteBaris} byte per baris di tumpukan tabel, tanpa index, jadi ±${MB166} MB (Hitungan atas rekaman)`);
    expect(barisQueueNaskah()).toContain("1.000.000 × 300 B");
  });
  test("breaker per proses: 6 kegagalan × 11 proses = 66, dari pengirim.txt dan kode lajur.go (lebih dari 5 gagal berturut-turut)", () => {
    expect(Number(BREAKER66[1]) * Number(BREAKER66[2])).toBe(Number(BREAKER66[3]));
    expect(BREAKER66[2]).toBe(P11[1]);
    expect(Number(BREAKER66[3])).toBe(66);
    expect(lajurGo).toContain("Breaker membuka sesudah lebih dari 5 gagal berturut-turut (ReadyToTrip bawaan)");
    expect(5 + 1).toBe(Number(BREAKER66[1]));
    expect(badan).toContain(`Breaker membuka sesudah gagal berturut-turut keenam. Dengan ${P11[1]} proses, semua breaker baru terbuka sesudah paling sedikit ${BREAKER66[1]} × ${BREAKER66[2]} = ${BREAKER66[3]} kegagalan (Hitungan atas kode).`);
  });
});
function barisQueueNaskah(): string {
  return naskah.split("\n").find((b) => b.startsWith("| M45 | 7 |")) ?? "";
}

describe("rekaman antrean.txt dan kode: bagian A (kelas), bagian B (kuota bersama), pushkuota, outbox, dan breaker", () => {
  test("bagian A: urut-waktu mengirim empat promo dan empat uang menunggu; urut kelas mengirim empat uang dan 2.996 promo menunggu; kalimat halaman sama", () => {
    expect(A_RENTAN).toEqual({ "0 menunggu": 4, "2 menunggu": 2996, "2 terkirim": 4 });
    expect(A_BENAR).toEqual({ "0 terkirim": 4, "2 menunggu": 2996, "2 terkirim": 4 });
    expect(recAntreanBaris[iA + 1]).toContain("3.000 baris outbox promo (kelas 2");
    expect(recAntrean).toContain("4 pembayaran Rp5.000 ke warung 418 (kelas 0");
    expect(badan).toContain(`Bagian A rekaman \`antrean.txt\` menaruh 3.000 baris promo (kelas 2), lalu ${kata(4)} pembayaran Rp5.000 (kelas 0).`);
    expect(badan).toContain(`satu putaran worker mengirim ${kata(A_RENTAN["2 terkirim"]!)} promo dan ${kata(A_RENTAN["0 menunggu"]!)} uang tetap menunggu.`);
    expect(badan).toContain(`putaran berikutnya mengirim ${kata(A_BENAR["0 terkirim"]!)} uang, dan ${ribu(A_BENAR["2 menunggu"]!)} promo tetap menunggu.`);
    expect(badan).toContain("Dengan mode rentan urut-waktu dari M27,");
    expect(m27).toContain("`-rentan urut-waktu`");
    expect(m27).toContain("Worker mengklaim menurut nomor.");
    expect(timInfra3).toContain("### ADR 32: kelas queue");
    expect(badan).toContain("Di [[t3-m27]], 10.000 promo membuat notifikasi uang menunggu, karena worker mengklaim baris menurut nomor. ADR 32 menutupnya dengan kelas queue: worker mengklaim baris kelas uang lebih dulu ([[t3-tim-infra]]).");
  });
  test("bagian B versi benar: 4.000 pengumuman, 0 jawaban 429 untuk pengumuman dan uang, 3 × 200 = 600 di bawah kuota 1.000, batas umur 2 detik", () => {
    expect([B.diterima, B.p429, B.u429, B.laju, B.konsumen, B.total, B.kuota, B.batasUmur, B.pengirimBenar]).toEqual([4000, 0, 0, 200, 3, 600, 1000, 2, 4]);
    expect(B.perangkat).toBe(4000);
    expect(B.konsumen * B.laju).toBe(B.total);
    expect(B.total).toBeLessThan(B.kuota);
    expect(badan).toContain(`Pada versi benar, tiap consumer dibatasi ${B.laju} pesan per detik, dan ${B.konsumen} × ${B.laju} = ${B.total} per detik masih di bawah kuota ${ribu(B.kuota)}. Pengumuman ${ribu(B.diterima)} pesan diterima, tidak ada 429 untuk pengumuman maupun uang, dan umur uang tertua tidak melewati ${B.batasUmur} detik (batas lab, Asumsi).`);
    expect(recAntreanBaris[iUmurBenarB]).toContain(": ya");
    expect(badan).toContain(`rekaman \`antrean.txt\` memakai ${ribu(B.kuota)} pesan per detik, sepersepuluh dari 10.000 (Asumsi lab, bukan angka penyedia).`);
    expect(B.kuota / 10000).toBe(0.1);
    expect(pushkuotaGo).toContain('flag.Int("kuota", 10000,');
  });
  test("bagian B mode rentan: 32 pengirim per consumer = 96 serentak lawan kuota 1.000; pengumuman 429 lebih dari 0, uang 429 paling sedikit satu, umur melebihi 2 detik; jumlah 429 tidak ditulis", () => {
    expect(B.pengirimRentan * B.konsumen).toBe(B.serentak);
    expect(B.serentak).toBe(96);
    expect(recAntreanBaris.slice(iRentanB, iUmurRentanB + 1).join("\n")).toContain("-- pengumuman dijawab 429: lebih dari 0: ya");
    expect(recAntreanBaris.slice(iRentanB, iUmurRentanB + 1).join("\n")).toContain("-- notifikasi uang dijawab 429 paling sedikit satu kali: ya");
    expect(recAntreanBaris[iUmurRentanB]).toBe(`-- umur notifikasi uang tertua melebihi ${B.batasUmur} detik (batas lab): ya`);
    expect(recAntreanBaris[iRentanB]).toContain("tanpa batas laju dan tanpa backoff");
    expect(skenario.predict.q).toContain(`dengan ${B.serentak} pengirim serentak melawan kuota ${ribu(B.kuota)} per detik`);
    expect(badan).toContain("Jumlah 429 tidak direkam, karena bergantung pada waktu:");
    expect(badan).toContain("Kelas queue mengatur urutan klaim di outbox, dan tidak melindungi uang dari kuota yang dihabiskan pengumuman.");
    expect(badan).not.toMatch(/\b\d+ jawaban 429\b/);
  });
  test("kode outbox.go: urutan kelas, id dipilih satu baris; ORDER BY, LIMIT, dan FOR UPDATE SKIP LOCKED; fungsi KlaimOutboxTujuan", () => {
    expect(outboxGo).toContain('urut := "id"');
    expect(outboxGo).toContain('urut = "kelas, id"');
    expect(outboxGo).toContain("ORDER BY `+urut+`");
    expect(outboxGoBaris[iKodeUrut + 1]).toBe("\tif urutKelas {");
    expect(outboxGo).toContain("func (r Repo) KlaimOutboxTujuan(");
    expect(mainGo).toContain('UrutKelas: *rentan != "urut-waktu"');
    expect(badan).toContain("Dengan kelas, `ORDER BY` memakai `kelas, id`, dan tanpa kelas hanya `id`:");
  });
  test("kode pushkuota: satu panggilan Coba per pesan, sesudah token mati- disaring, tanpa kelas di syaratnya; region jendela ada", () => {
    expect(hitungKali(pushkuotaGo, "l.jendela.Coba(time.Now())")).toBe(1);
    const iMati = pushkuotaGo.indexOf('strings.HasPrefix(in.Token, "mati-")');
    const iCoba = pushkuotaGo.indexOf("l.jendela.Coba(time.Now())");
    expect(iMati).toBeGreaterThan(0);
    expect(iCoba).toBeGreaterThan(iMati);
    const barisCoba = pushkuotaGo.split("\n").find((b) => b.includes("l.jendela.Coba(time.Now())"))!;
    expect(barisCoba).not.toContain("kelas");
    expect(pushkuotaGo).toContain("// --8<-- [start:jendela]");
    expect(pushkuotaGo).toContain("// --8<-- [end:jendela]");
    expect(pushkuotaGo).toContain("h := l.hitung[kelas]");
    expect(badan).toContain("Penyedia tiruan memanggil `Coba` satu kali per pesan, untuk pengumuman dan uang sama saja. Kelas pesan hanya dipakai untuk menghitung (dibaca dari kode):");
  });
  test("kode breaker: peta breaker dibuat per proses dan hanya untuk lajur verifikasi; push tanpa breaker; main memanggilnya sekali; ReadyToTrip tidak diisi", () => {
    expect(breakerGo).toContain("lajur.Baru(repo.TujuanVerifikasi,");
    expect(hitungKali(breakerGo, "lajur.Baru(")).toBe(1);
    expect(breakerGo).not.toContain("TujuanPush");
    expect(breakerGo).toContain("lajur push memanggil layanan push milik platform sendiri");
    expect(breakerGoBaris[iBreakerAwal + 3]).toBe("\tif !aktif {");
    expect(hitungKali(mainGo, "breakerLajur(*breaker")).toBe(1);
    expect(mainGo).toContain("worker: breaker per vendor di lajur verifikasi (ADR 36)");
    expect(lajurGo).toContain("ReadyToTrip dan MaxRequests sengaja tidak diisi");
    expect(lajurGo).not.toMatch(/ReadyToTrip:/);
    expect(lajurGo).toContain("sony/gobreaker/v2");
    expect(badan).toContain("Breaker itu dibuat dengan `lajur.Baru` di dalam proses worker, jadi tiap proses punya hitungan gagalnya sendiri dan dua proses tidak berbagi hitungan:");
    expect(badan).toContain("Lab menyambungkan breaker hanya ke lajur verifikasi lewat bendera `-breaker`, bukan ke lajur push. Jadi kalimat ini pembacaan kode (Tidak dijalankan), bukan rekaman.");
  });
  test("delapan Snippet: berkas dan rentang baris diturunkan dari isi berkas, dan jumlah tiap berkas terkunci", () => {
    const daftar = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => {
      const a = Object.fromEntries([...m[1]!.matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1]!, x[2]!]));
      return a;
    });
    expect(daftar).toHaveLength(SNIPPET_DITURUNKAN.length);
    daftar.forEach((a, i) => {
      const s = SNIPPET_DITURUNKAN[i]!;
      expect(a.file, `Snippet ${i + 1}`).toBe(s.file);
      expect(terlacak === null || terlacak.has(s.file) || !process.env.CI).toBe(true);
      if ("lines" in s) {
        expect(a.lines, `rentang Snippet ${i + 1}`).toBe(s.lines);
        expect(a.region).toBeUndefined();
      } else {
        expect(a.region).toBe(s.region);
        expect(a.lang).toBe("go");
      }
      expect(a.title, `judul Snippet ${i + 1}`).toMatch(/^(Rekaman lab|Kode lab): labs\//);
      expect(a.title).not.toMatch(/R\d-\d|keputusan \d|PR #\d/);
    });
    const perBerkas: Record<string, number> = {};
    for (const a of daftar) perBerkas[a.file!] = (perBerkas[a.file!] ?? 0) + 1;
    expect(perBerkas).toEqual({
      "labs/t5-fanout/output/antrean.txt": 3, "labs/api-t5/internal/repo/outbox.go": 1, "labs/t5-fanout/output/pengirim.txt": 1, "labs/t5-fanout/output/aliran.txt": 1,
      "labs/api-t5/cmd/pushkuota/main.go": 1, "labs/api-t5/cmd/api/breaker.go": 1,
    });
    expect(daftar.map((a) => a.title)).toEqual([
      "Rekaman lab: labs/t5-fanout/output/antrean.txt, bagian A (urut nomor lawan urut kelas)",
      "Kode lab: labs/api-t5/internal/repo/outbox.go baris 95 sampai 106 (urutan klaim dan ORDER BY)",
      "Rekaman lab: labs/t5-fanout/output/pengirim.txt, bagian B (c dan t terukur)",
      "Rekaman lab: labs/t5-fanout/output/aliran.txt, bagian B (satu baris outbox per penerima)",
      "Rekaman lab: labs/t5-fanout/output/antrean.txt, bagian B, versi benar (pengumuman dan uang memakai satu kuota)",
      "Kode lab: labs/api-t5/cmd/pushkuota/main.go, fungsi Coba (satu jendela kuota)",
      "Kode lab: labs/api-t5/cmd/api/breaker.go, fungsi breakerLajur (satu peta breaker per proses)",
      "Rekaman lab: labs/t5-fanout/output/antrean.txt, bagian B, mode rentan (tanpa batas laju dan tanpa backoff)",
    ]);
    // judul yang menyebut nomor baris sama dengan rentang yang diturunkan
    expect(daftar[1]!.title).toContain(`baris ${iKodeUrut + 1} sampai ${iKodeAkhir + 1}`);
    // kode lab yang tampil tanpa komentar berisi ID riset atau nomor keputusan
    for (const [berkas, mulai, akhir] of [[outboxGoBaris, iKodeUrut, iKodeAkhir], [breakerGoBaris, iBreakerAwal, iBreakerAkhir]] as const) {
      expect(berkas.slice(mulai, akhir + 1).join("\n")).not.toMatch(/R\d-\d+|keputusan \d|PR \d+|mutasi/);
    }
    const wilayah = pushkuotaGo.slice(pushkuotaGo.indexOf("[start:jendela]"), pushkuotaGo.indexOf("[end:jendela]"));
    expect(wilayah).not.toMatch(/R\d-\d+|keputusan \d|PR \d+|mutasi/);
  });
  test("lingkup: lab tidak mengirim ke 1.000.000 HP dan tidak mengisi queue uang 90 menit; README menulis Tidak dijalankan untuk replication factor 3 dan jalur galat", () => {
    const readme = baca("labs/t5-fanout/README.md");
    expect(readme).toContain("Pengumuman ke 1.000.000 perangkat diskalakan lalu dihitung, bukan dijalankan");
    expect(readme).toContain("Replication factor 3 dan tiga broker");
    expect(readme).toContain("Jalur galat consumer tidak diperankan");
    expect(readme).toContain("satu broker Kafka");
    expect(recAliran).toContain("6 rekaman di Kafka (satu per rentang, satu per partisi)");
    expect(badan).toContain("Lab tidak mengisi queue uang selama 90 menit dan tidak mengirim pengumuman ke 1.000.000 HP. Ia hanya mengukur c = 4 dan t pada tiruan 300 ms.");
    expect(badan).toContain("Lab menulis satu pengumuman sebagai satu baris outbox, tetapi enam rekaman Kafka, satu per rentang perangkat (`aliran.txt`, bagian A).");
    expect(badan).toContain("replication factor 3 Tidak dijalankan");
    expect(recPengirim).toContain("penyedia dengan latensi 300 ms");
    expect(recPengirim).toContain("kapasitas terukur (pesan per detik) antara 10 dan 13,4 (c / t naskah = 13,33): ya");
  });
});

// --- baris riset yang dibaca ke sumber pada 2026-11-04 dan 2026-11-03: kutipan, versi, tanggal, dan alamat tidak boleh berubah tanpa membuka sumbernya lagi
const IDS = ["R5-175", "R5-176", "R5-177", "R5-178", "R5-179"];
describe("sumber luar dan baris riset R5-175 sampai R5-179", () => {
  test("lima baris berurutan di RISET-TAHAP-5, lima kolom, tanpa ID ganda, sesudah R5-174 dengan tetangga di rentang", () => {
    const semua = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    for (const id of IDS) expect(semua.filter((x) => x === id), id).toHaveLength(1);
    const i = semua.indexOf("R5-175");
    expect(semua.slice(i, i + 5)).toEqual(IDS);
    // tetangga dikunci dengan rentang, bukan dengan ID tertentu: PR halaman lain menyisipkan baris riset di antaranya
    expect(Number(semua[i - 1]!.slice(3))).toBeGreaterThanOrEqual(170);
    expect(Number(semua[i - 1]!.slice(3))).toBeLessThan(175);
    expect(Number(semua[i + 5]!.slice(3))).toBeGreaterThan(179);
    for (const id of IDS) expect(pecahBaris(barisRiset(id)), id).toHaveLength(5);
  });
  test("tautan luar: satu, ke dokumentasi kuota penyedia push, dibuka 2026-11-04, ada di baris riset; tidak ada tautan di rantai dan skenario", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(tautan).toEqual(["https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas"]);
    expect(barisRiset("R5-175")).toContain("firebase.google.com/docs/cloud-messaging/throttling-and-quotas, dibuka 2026-11-04");
    expect(hitungKali(badan, "dibuka 2026-11-04")).toBe(1);
    expect(hitungKali(badan, "2026-11-")).toBe(1);
    expect(JSON.stringify(skenario) + JSON.stringify(rantaiMentah)).not.toMatch(/https?:\/\//);
    expect(badan).toContain("[Firebase Cloud Messaging: Throttling and Quotas](https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas), dibuka 2026-11-04, Tidak dijalankan)");
  });
  test("R5-175: tiga kutipan Inggris; kalimat halaman memakai 600 ribu per menit, 429 RESOURCE_EXHAUSTED, dan menit berikutnya tanpa laju per detik", () => {
    const r = barisRiset("R5-175");
    expect(r).toContain("The default quota of 600k messages per minute");
    expect(r).toContain('the system serves HTTP status code 429 RESOURCE_EXHAUSTED ("QUOTA_EXCEEDED") until the quota is refilled in the following minute.');
    expect(r).toContain("Quotas are per-minute, but these minutes are not aligned to the clock.");
    expect(r).toContain("Halaman tidak menyebut laju per detik");
    expect(badan).toContain("Dokumentasi satu penyedia push menulis kuota bawaan 600 ribu pesan per menit. Di atas kuota, jawabannya 429 RESOURCE_EXHAUSTED sampai kuota terisi lagi di menit berikutnya (");
    expect(badan).toContain("Penyedia tiruan di lab menerjemahkannya menjadi jendela satu detik,");
    expect(barisRiset("R5-288")).toContain("Pengamatan lab, bukan kutipan");
  });
  test("R5-176, R5-177, R5-178: isi persis (kode dan rekaman yang dibaca), dan R5-179 memuat tiap hitungan halaman", () => {
    expect(barisRiset("R5-176")).toContain('`urut := "id"`, lalu `urut = "kelas, id"` bila `urutKelas`');
    expect(barisRiset("R5-176")).toContain("`l.jendela.Coba(time.Now())` satu kali per pesan");
    expect(barisRiset("R5-177")).toContain("membuat `lajur.Baru` untuk tujuan verifikasi saja");
    expect(barisRiset("R5-177")).toContain("`ReadyToTrip` bawaan (lebih dari 5 gagal berturut-turut)");
    expect(barisRiset("R5-178")).toContain("tidak memuat jumlah 429 atau umur uang tertua sebagai nilai");
    const r = barisRiset("R5-179");
    for (const s of [`= ${koma((harian3 * bagianSiang) / detikSiang, 3)} (ditulis ${M3.lamT})`, `${M3.pakai}%`, `${M2.pakai}%`, "(34,5 menit)", "(43,1 menit)", "(32,0 menit)", "(40,0 menit)", "(±448.000)", "(±288.000)", "(20,8 jam)", "6 × 11 = 66"]) expect(r, s).toContain(s);
    for (const id of IDS) expect(barisRiset(id)).toMatch(/[Dd]ibaca 2026-11-04|dibuka 2026-11-04/);
    for (const id of IDS) expect(badan).not.toContain(id);
  });
});

describe("registry, tautan, template blok, tabel, urutan tebakan, widget, dan kartu", () => {
  test("registry: halaman 5.14 jenis masalah, ada, prasyarat t3-tim-infra dan t4-breaker, lab t5-fanout, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m45");
    expect(h.nomor).toBe("5.14");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.prasyarat).toEqual(["t3-tim-infra", "t4-breaker"]);
    expect(h.lab).toEqual(["t5-fanout"]);
    expect(h.peran).toEqual(["mobile", "backend"]);
    expect(h.path).toBe("tahap-5/m45-pengumuman-satu-juta.md");
    const minggu = cari(/\| M45 \| (\d+) \|/, naskah, "minggu M45")[1];
    expect(minggu).toBe("7");
    expect(h.label).toBe(`Masalah 45 · minggu ${minggu}`);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t3-tim-infra]], [[t4-breaker]]");
    expect(frontmatter).toContain(`title: "5.14 ${h.judul}"`);
    expect(naskah).toContain(`| 5.14 | 4 | ${h.judul} | Masalah | ★ | t5-fanout | alur |`);
    expect(naskah).toContain("- **Mobile** menonjolkan 5.2, 5.6, 5.7 (token LSN dikirim app), 5.14, 5.23, 5.27");
    expect(dari("t5-fanout").prasyarat).toEqual(["t5-m45"]);
    expect(dari("t5-fanout").nomor).toBe("5.15");
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ A0: 1, "t3-prd": 1, "t3-m27": 1, "t3-tim-infra": 2, "t5-prd": 3, "t3-estimasi": 1, "t4-breaker": 2, "t5-fanout": 2 });
    expect(dari("t3-prd").nomor).toBe("3.1");
    expect(dari("t5-prd").nomor).toBe("5.1");
    expect(dari("t3-estimasi").nomor).toBe("3.29");
  });
  test("janji PRD v3: bayar dan transfer 95% dalam kurang dari 30 detik, diukur sampai pesan diserahkan ke layanan push", () => {
    expect(prdV3).toContain("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    expect(prdV3).toContain("Pengukurannya berhenti saat pesan diserahkan ke layanan push");
    expect(badan).toContain("PRD v3 menjanjikan 95% notifikasi bayar dan transfer dalam kurang dari 30 detik ([[t3-prd]]).");
    expect(badan).toContain("Ukuran ini sama dengan janji 30 detik tadi, yang berhenti saat pesan diserahkan ke penyedia push.");
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect(badan).toContain('<Blok nama="Gejala" buka>');
    expect(badan).toContain('<Blok nama="Yang Raka kira" buka>');
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m45.json" />');
    expect(badan).toContain("<Rantai data={kapasitasUang} ringkas />");
    expect(halaman).toContain('import kapasitasUang from "../../../../data/diagram/t5-m45-kapasitas-uang.json";');
    expect(DataRantai.safeParse(rantaiMentah).success).toBe(true);
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; tepat satu tabel di halaman", () => {
    const baris = badan.split("\n");
    let tabelKe = 0;
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        tabelKe++;
        const n = pecahBaris(baris[i]!).length;
        expect(n).toBe(4);
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `tabel ${tabelKe} baris ${j + 1}`).toBe(n);
      }
    }
    expect(tabelKe).toBe(1);
  });
  test("urutan tebakan: jawaban Tebak (naik, 43,1) belum tertulis sebelum details.question, dan jawaban widget (uang ikut 429) belum tertulis sebelum widget", () => {
    const sebelumTebak = badan.slice(0, badan.indexOf('<details class="question">'));
    for (const x of [M3.lamT, koma(KAP, 2), `${M3.tumbuh} baris`, koma(M3.umur(3000).menit, 1), "kapasitas", "naik", "722"]) expect(sebelumTebak, `jawaban Tebak: ${x}`).not.toContain(x);
    const sebelumWidget = badan.slice(0, badan.indexOf("<WidgetLama"));
    for (const x of ["ikut dijawab 429", "lebih dari 0: ya", "paling sedikit satu kali", "melebihi 2 detik", "tanpa batas laju dan tanpa backoff, uang"]) expect(sebelumWidget, `jawaban widget: ${x}`).not.toContain(x);
    expect(sebelumWidget).not.toContain(recAntreanBaris[iUmurRentanB]!);
    expect(sebelumWidget).not.toContain("-- notifikasi uang dijawab 429 paling sedikit satu kali");
    expect(skenario.predict.varian).toBe(true);
    expect(core.jalurTebakan(skenario)).toBe("varian");
    expect(skenario.predict.options[skenario.predict.answer]).toBe("Uang ikut dijawab 429, dan umur uang tertua melewati 2 detik");
    expect(badan.indexOf(`lines="${SNIP_RENTAN}"`)).toBeGreaterThan(badan.indexOf("<WidgetLama"));
    expect(sebelumWidget).not.toContain(`lines="${SNIP_RENTAN}"`);
  });
  test("skenario alur: valid menurut alur-core, tanpa perangkat, empat komponen, enam langkah dan dua langkah varian mulai di 5, jenis Ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(Object.keys(skenario.layarAwal)).toEqual([]);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["pengumuman", "queue", "worker", "push"]);
    expect(skenario.langkah).toHaveLength(6);
    expect(skenario.varian.mulai).toBe(5);
    expect(skenario.varian.langkah).toHaveLength(2);
    expect(core.steps(core.normalize(skenario), true)).toHaveLength(7);
    expect(skenario.sumber.catatan).toContain("jumlah 429 dan umur uang tertua tidak direkam sebagai nilai");
  });
  test("skenario: baris kirim yang berawalan --, $, worker:, atau tabel kelas sama persis dengan baris rekaman antrean.txt; baris Hitungan dibangun dari nilai turunan", () => {
    const rekSemua = new Set(recAntreanBaris.map((b) => b.trimEnd()));
    const dariRekaman: [Langkah, string][] = [
      [skenario.langkah[1]!, "langkah 2"], [skenario.langkah[2]!, "langkah 3"], [skenario.langkah[5]!, "langkah 6"],
      [skenario.varian.langkah[0]!, "varian 1"], [skenario.varian.langkah[1]!, "varian 2"],
    ];
    for (const [l, nama] of dariRekaman) {
      for (const b of l.kirim.split("\n")) {
        if (b.startsWith("#")) continue;
        expect(rekSemua.has(b.trimEnd()), `${nama}: ${b}`).toBe(true);
      }
    }
    expect(skenario.langkah[1]!.kirim.split("\n")[0]).toBe("# 3.000 baris promo (kelas 2) menunggu, lalu 4 pembayaran (kelas 0) masuk");
    expect(skenario.langkah[3]!.kirim).toBe(
      `uang datang: (600.000 + 50.000) × 0,8 ÷ 5.400 = ${M3.lamT} per detik\nworker mengirim: ${pengirimC} ÷ ${koma(lamaT, 1)} = ${koma(KAP, 2)} per detik\nqueue uang tumbuh: ${M3.lamT} − ${koma(KAP, 2)} = ${M3.tumbuh} per detik (Hitungan atas Asumsi)`,
    );
    expect(skenario.langkah[4]!.kirim).toBe(
      `12.10 (2.400 detik): 2.400 × (1 − ${koma(KAP, 2)} ÷ ${M3.lamT}) = ${ribu(M3.umur(2400).detik)} detik = ${koma(M3.umur(2400).menit, 1)} menit\n12.20 (3.000 detik): 3.000 × (1 − ${koma(KAP, 2)} ÷ ${M3.lamT}) = ${ribu(M3.umur(3000).detik)} detik = ${koma(M3.umur(3000).menit, 1)} menit\n(Hitungan atas Asumsi)`,
    );
    expect(skenario.langkah[0]!.kirim).toBe("Kamis 11.30: pengumuman diskon makan siang ke 1.000.000 HP\ncara lama: satu baris outbox per penerima, kelas promo (Ilustrasi)");
    for (const l of core.steps(core.normalize(skenario), true)) expect(l.kirim.split("\n").length, l.judul).toBeLessThanOrEqual(7);
  });
  test("tebakan skenario: empat pilihan, tepat satu benar di posisi ketiga dan bukan pilihan terpanjang; penjelasan memuat rekaman dan 'jumlah 429 tidak direkam'", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(2);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).not.toBe(Math.max(...panjang));
    expect(p.q).toContain("tanpa batas laju dan tanpa backoff");
    expect(p.explain).toContain("Rekaman antrean.txt bagian B, mode rentan");
    expect(p.explain).toContain("Jumlah 429 tidak direkam, karena bergantung pada waktu.");
    expect(p.explain).toContain("umur uang tertua melewati 2 detik (batas lab, Asumsi)");
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber asumsi, angka dari hitungan, 'dengan atau tanpa pengumuman' berlingkup di halaman", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.baris).toHaveLength(2);
    for (const b of d.baris) expect(b.simpul).toHaveLength(3);
    expect(d.sumber.jenis).toBe("asumsi");
    const teks = nilaiString(d).join("\n");
    expect(teks).toContain(`Uang datang ${M3.lamT} per detik`);
    expect(teks).toContain(`Worker mengirim ${koma(KAP, 2)} per detik`);
    expect(teks).toContain(`Queue uang tumbuh ${M3.tumbuh} per detik`);
    expect(teks).toContain("1.000.000 baris pengumuman");
    expect(d.sumber.teks).toContain("650.000 notifikasi uang per hari, 80% dalam 90 menit");
    expect(d.catatan).toContain("lab tidak mengisi queue uang selama 90 menit");
    expect(d.baris[1]!.simpul[2]!.nada).toBe("warn");
    expect(d.baris[0]!.simpul[2]!.nada).toBe("old");
    const ringkas = d.baris.map((b) => b.simpul.map((s) => s.teks).join(" "));
    for (const r of ringkas) expect(r.length, r).toBeLessThanOrEqual(110);
  });
  test("kartu Cek diri: tiga kartu t5-m45, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const kartu = kartuSemua.filter((x) => x.halaman === "t5-m45");
    expect(kartu.map((k) => k.id)).toEqual(["t5-m45-1", "t5-m45-2", "t5-m45-3"]);
    const soal = [...badan.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([^\n]+)\n\n<\/details>/g)];
    expect(soal).toHaveLength(3);
    soal.forEach((m, i) => {
      expect(kartu[i]!.tanya).toBe(m[2]);
      expect(kartu[i]!.jawab).toBe(m[3]);
      expect(kartu[i]!.url).toBe("tahap-5/m45-pengumuman-satu-juta/");
      expect(kartu[i]!.judul).toBe("5.14 M45: Pengumuman ke satu juta HP, notifikasi uang terlambat");
    });
  });
  test("definisi di pemakaian pertama: Hitungan, dibaca dari kode, Tidak dijalankan, umur tertua, Kafka, consumer sebelum dipakai di blok sesudahnya", () => {
    const pertama = (s: string): number => badan.indexOf(s);
    expect(pertama("Hitungan adalah angka yang dihitung dari angka lain di halaman ini")).toBeGreaterThan(pertama("*Kondisi rekaman:*"));
    expect(badan).toContain("Dibaca dari kode berarti isi kode sumber dibaca tanpa dijalankan, jadi labelnya Tidak dijalankan.");
    expect(badan).toContain("Umur notifikasi uang tertua adalah umur baris uang yang belum terkirim dan paling lama menunggu di queue.");
    expect(pertama("Umur notifikasi uang tertua adalah umur baris uang")).toBeLessThan(pertama('<details class="question">'));
    expect(badan).toContain("yaitu platform event streaming, dan consumer, yaitu proses yang membaca rekamannya.");
    expect(pertama("Hitungan atas Asumsi: dihitung dari angka Asumsi di blok berikutnya")).toBeLessThan(pertama("Hitungan adalah angka yang dihitung"));
    // adegan Gejala tanpa kalimat definisi
    const gejala = badan.slice(0, badan.indexOf("</Blok>"));
    expect(gejala).not.toMatch(/\b(?:adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    expect(gejala).toContain("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, dan kartu; 'bagian B' dipakai, bukan penanda B1 atau C2", () => {
    const tampil = [badan, nilaiString(rantaiMentah).join("\n"), nilaiString(skenario).join("\n"), kartuSemua.filter((x) => x.halaman === "t5-m45").map((x) => x.tanya + x.jawab).join("\n")].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d+\b/);
    expect(tampil).not.toMatch(/keputusan \d{2,}/i);
    expect(tampil).not.toMatch(/\bPR #?\d+/);
    expect(tampil).not.toMatch(/\b(?:B1|B2|C1|C2|D1|E1)\b/);
    expect(tampil).not.toMatch(/\d+ B\b/);
  });
  test("label: 'Rekaman lab' hanya di judul Snippet dan di dua langkah skenario yang memang rekaman; angka cerita dan hitungan tidak berlabel rekaman", () => {
    for (const b of badan.split("\n")) if (b.includes("Rekaman lab")) expect(b.startsWith("<Snippet") || b.startsWith("*Angka cerita (Ilustrasi):*"), b).toBe(true);
    expect(hitungKali(badan, "Rekaman lab")).toBe(1 + 5);
    expect(hitungKali(badan, "Rekaman lab:")).toBe(5);
    expect(halaman.match(/\[perlu verifikasi\]/g)).toBeNull();
    for (const i of [0, 3, 4]) expect(skenario.langkah[i]!.kirim + skenario.langkah[i]!.jelas).not.toContain("Rekaman lab");
    expect(skenario.langkah[3]!.jelas).toContain("Lab mengukur c dan t pada tiruan, bukan 96,3 per detik.");
    expect(skenario.langkah[4]!.jelas).toContain("(Ilustrasi)");
  });
});

describe("penutup celah mutasi tanpa kunci: frontmatter, Gejala, noscript, butir Yang tidak direkam, Konsep yang lahir, dan teks diagram dan skenario", () => {
  test("frontmatter persis, dan deskripsi memuat tiga fakta halaman", () => {
    expect(frontmatter).toContain('title: "5.14 M45: Pengumuman ke satu juta HP, notifikasi uang terlambat"');
    expect(frontmatter).toContain(`Pengumuman diskon ke 1.000.000 HP berjalan saat makan siang, dan notifikasi uang menunggu ±${koma(M3.umur(2400).menit, 1)} menit.`);
    expect(frontmatter).toContain("Kelas queue sudah mendahulukan uang, jadi penyebabnya kapasitas worker, dan pengumuman yang dipercepat bisa menghabiskan kuota penyedia push.");
    expect(frontmatter).toContain("Minggu 7.");
  });
  test("adegan Gejala: hari, jam, 1.000.000 HP, Ani, Ratih, dan 34,5 menit sama dengan baris M45 naskah; dua catatan berawalan bintang", () => {
    const m45 = barisQueueNaskah();
    for (const s of ["Kamis 11.30", "1.000.000 HP", "Pukul 12.10 Ani masih menunggu notifikasi pembayaran", "34,5 menit", "Ratih menghentikan pengumuman"]) expect(m45, s).toContain(s);
    const gejala = badan.slice(0, badan.indexOf("</Blok>"));
    expect(gejala).toContain("Minggu 7 Tahap 5. Kamis pukul 11.30 tim Merchant mengirim pengumuman diskon makan siang ke 1.000.000 HP.");
    expect(gejala).toContain("Pukul 12.10 Ani masih menunggu notifikasi pembayaran dari pembeli.");
    expect(gejala).toContain("Ratih menghentikan pengumuman.");
    expect(gejala).not.toMatch(/tetap panjang|tetap naik|kapasitas/);
    expect((gejala.match(/^\*[^*]/gm) ?? []).length).toBe(1);
    expect(gejala).toContain("*Angka cerita (Ilustrasi):* Kamis, 11.30, 12.10, dan Ani yang menunggu berasal dari naskah, bukan dari rekaman.");
  });
  test("noscript sama dengan kalimat yang dibangun dari nilai turunan", () => {
    const ns = cari(/<noscript>\n([\s\S]*?)\n<\/noscript>/, badan, "noscript")[1]!;
    expect(ns).toContain(`kelas queue mengirim ${kata(A_BENAR["0 terkirim"]!)} uang lebih dulu dari ${ribu(A_BENAR["2 menunggu"]!)} promo (bagian A).`);
    expect(ns).toContain(`Uang datang ${M3.lamT} per detik dan worker mengirim ${koma(KAP, 2)} per detik, jadi queue uang tumbuh ${M3.tumbuh} per detik (Hitungan atas Asumsi).`);
    expect(ns).toContain("Dengan pengumuman dibatasi laju, uang tidak dijawab 429 (bagian B).");
    expect(ns).toContain("Bila consumer pengumuman tanpa batas laju dan tanpa backoff, uang ikut dijawab 429 paling sedikit satu kali. Umur uang tertua juga melewati 2 detik (bagian B).");
  });
  test("pembuka tebal di blok Yang sebenarnya, dan urutan paragraf: kelas queue, kapasitas, pengumuman, menambah kapasitas, Yang tidak direkam", () => {
    const tebal = [...badan.matchAll(/^\*\*([^*]+)\*\*/gm)].map((m) => m[1]).filter((x) => !/^\d\.$/.test(x!));
    expect(tebal).toEqual(["Kelas queue mendahulukan uang.", "Yang membatasi uang adalah kapasitas.", "Pengumuman satu baris per penerima.", "Menambah kapasitas membuka dua hal lain.", "Yang tidak direkam."]);
  });
  test("Konsep yang lahir: tiga tautan, kalimat penutup, dan ADR yang dirujuk (51, 32, 36) cocok dengan halaman tujuan", () => {
    expect(dari("t5-fanout").adr).toEqual([51]);
    expect(dari("t3-tim-infra").adr).toEqual([32]);
    expect(dari("t4-breaker").adr).toEqual([36]);
    const konsep = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(konsep).toContain("- [[t5-fanout]]: fan-out, yaitu satu kejadian untuk banyak penerima, dengan backpressure ke penyedia push, consumer group, dan event streaming. Keputusannya ADR 51.");
    expect(konsep).toContain("- [[t3-tim-infra]]: ADR 32, yang memilih kelas queue. Halaman ini membaca batasnya: kelas mengatur urutan klaim, bukan kapasitas worker dan bukan kuota penyedia push.");
    expect(konsep).toContain("- [[t4-breaker]]: ADR 36, yang menaruh breaker per vendor. Halaman ini membaca satu akibatnya: tiap proses worker punya breaker sendiri.");
    expect(konsep).toContain("Kelas queue mengatur urutan, bukan kapasitas. Kapasitas dihitung dari kedatangan λ, pengirim serentak c, dan lama kirim t.");
    expect(timInfra3).toContain("ADR 32");
  });
  test("teks diagram dan skenario: sumber, pengantar, catatan, dan nada langkah persis", () => {
    expect(skenario.pengantar).toBe("Tim Merchant mengirim pengumuman saat makan siang, dan notifikasi uang menunggu. Tebakannya tentang satu hal yang kamu ubah: centang 'Ubah satu hal' di bawah, dan jawabannya terbuka di akhir langkah varian.");
    expect(core.steps(core.normalize(skenario), false).map((l) => l.nada ?? "")).toEqual(["", "warn", "good", "warn", "warn", "good"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual(["warn", "warn"]);
    expect(skenario.varian.label).toBe("Consumer pengumuman tanpa batas laju dan tanpa backoff");
    expect(skenario.langkah.map((l) => `${l.dari}>${l.ke}`)).toEqual(["pengumuman>queue", "queue>worker", "queue>worker", "queue>worker", "pengumuman>queue", "pengumuman>push"]);
    expect(skenario.varian.langkah.map((l) => `${l.dari}>${l.ke}`)).toEqual(["pengumuman>push", "worker>push"]);
    expect(skenario.langkah[5]!.jelas).toContain("keduanya ke penyedia push tiruan dengan kuota 1.000 per detik (Rekaman lab).");
    expect(skenario.varian.langkah[1]!.jelas).toContain("Kelas queue mengatur urutan klaim di outbox, dan tidak melindungi uang dari kuota yang dihabiskan pengumuman (Rekaman lab).");
  });
  test("butir 'Yang tidak direkam': lima butir, kalimat persis, dan rujukan ke 5.15 lewat registry", () => {
    const blok = cari(/\*\*Yang tidak direkam\.\*\*\n\n((?:- [^\n]+\n?)+)/, badan, "Yang tidak direkam")[1]!;
    const butir = blok.trim().split("\n");
    expect(butir).toHaveLength(5);
    expect(butir[0]).toBe("- Kamis, 11.30, 12.10, Ani yang menunggu, dan keputusan Ratih berasal dari cerita (Ilustrasi).");
    expect(butir[1]).toContain(`- ${M3.lamT} per detik, ${M3.pakai}%, ${M3.tumbuh} per detik, ${koma(M3.umur(2400).menit, 1)} dan ${koma(M3.umur(3000).menit, 1)} menit, ±${ribu(M3.isi)} baris, dan 20,8 jam adalah Hitungan atas Asumsi.`);
    expect(butir[2]).toBe("- Bagian B memakai satu broker Kafka (replication factor 3 Tidak dijalankan), 4.000 perangkat, dan kuota 1.000 per detik. Jumlah 429 dan umur uang tertua tidak direkam sebagai nilai, hanya batasnya.");
    expect(butir[3]).toContain("Rancangan itu dan keputusannya dibahas di [[t5-fanout]].");
    expect(butir[4]).toBe("- Breaker di lajur push dan 66 kegagalan tidak dijalankan. Jalur galat consumer juga tidak diperankan.");
  });
});

// --- lapis 2: kunci per baris dan sidik
function sidikKata(teks: string, kata2: string[]): Record<string, number> {
  return Object.fromEntries(kata2.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
}
function nilaiString(x: unknown, keluar: string[] = []): string[] {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
}
function tekstual(x: unknown, keluar: string[] = []): string[] {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
}
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "paling sedikit", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "wajib", "menolak", "berjalan", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lebih dulu", "melebihi", "melewati", "mendahulukan", "kapasitas", "kuota"];
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
const kartuT5m45 = kartuSemua.filter((x) => x.halaman === "t5-m45");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    dibacaDariKode: (halaman.match(/[Dd]ibaca dari kode/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: IDS.map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m45)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m45) },
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m45-pengumuman-satu-juta.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m45-pengumuman-satu-juta.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(6);
    expect(sidikSekarang.label.perluVerifikasi).toBe(0);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
