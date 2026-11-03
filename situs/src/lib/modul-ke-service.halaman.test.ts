// Penjaga halaman 5.13 (keputusan 1548 sampai 1550): angka, hitungan, ID, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak", diagram
// Rantai t5-service-inti.json, widget Tebak t5-service-tebak.json, data banding t5-service-banding.json, kartu Cek diri, tiga halaman istilah, dan baris
// riset R5-170 sampai R5-174 di modul-ke-service.mdx. Nilai diturunkan dari rekaman labs/t5-gabung/output (panggilan, latensi, mati) dan labs/t5-rollout/output/hpa.txt,
// kode lab (layanan.go, broker.go, klien.go, skor.go, run.py), README kedua lab, naskah Tahap 5 (ADR 50, M44, M51, tabel beban, tabel tim), PROPOSAL, halaman
// ADR 12, 37, dan 45, halaman 5.1 dan 5.12, registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka
// diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di modul-ke-service.halaman.nilai.ts. Lapis 2 bisa dimatikan
// (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah:
// PERBARUI_KUNCI=1 vitest run src/lib/modul-ke-service.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Batas rekaman halaman ini: semua panggilan lab berjalan di loopback satu mesin, jeda 0, 2, 4, 10 ms adalah
// Asumsi, rantai tiga proses dengan queue adalah satu-satunya bentuk pemecahan yang direkam, dan HPA hanya direkam menurut CPU atas satu Deployment (bukan Rollout).
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-service-inti.json";
import tebakMentah from "../../data/widget/t5-service-tebak.json";
import registry from "../../data/cerita.json";
import glosarium from "../../data/glosarium.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./modul-ke-service.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-5/modul-ke-service.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const bandingBerkas = "situs/lama/widgets/data/t5-service-banding.json";
const banding = JSON.parse(baca(bandingBerkas)) as Banding;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const proposal = baca("plan/PROPOSAL.md");
const panggilan = baca("labs/t5-gabung/output/panggilan.txt");
const latensi = baca("labs/t5-gabung/output/latensi.txt");
const mati = baca("labs/t5-gabung/output/mati.txt");
const hpa = baca("labs/t5-rollout/output/hpa.txt");
const readmeGabung = baca("labs/t5-gabung/README.md");
const readmeRollout = baca("labs/t5-rollout/README.md");
const runPy = baca("labs/t5-gabung/run.py");
const layananGo = baca("labs/t5-gabung/layanan/layanan.go");
const brokerGo = baca("labs/t5-gabung/antrean/broker.go");
const klienGo = baca("labs/t5-gabung/antrean/klien.go");
const skorGo = baca("labs/t5-gabung/skor/skor.go");
const adr37 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const adr45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const adr12 = baca("situs/src/content/docs/tahap-1/sengaja-belum.mdx");
const hal51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal512 = baca("situs/src/content/docs/tahap-5/m44-rilis-menunggu-lima-tim.mdx");
const skema = baca("labs/api-t5/output/skema.txt");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const ISTILAH = ["kubernetes", "hpa", "gateway-api"];
const TIDAK_DIJALANKAN = 20;
interface Istilah { istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: unknown; jebakan: string[]; terkait: string[]; sumber: { riset: string; judul: string; url: string; catatan: string }[] }
const istilahBerkas: Record<string, Istilah> = Object.fromEntries(ISTILAH.map((s) => [s, JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`)) as Istilah]));
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const cjs = createRequire(import.meta.url);
const bandingCjs = cjs(path.join(akar, "situs/lama/widgets/banding.js")) as { cekData: (d: unknown) => string[] };

interface Banding { judul: string; opsi: { id: string; nama: string; baris: { id: string; label: string; sub?: string }[][]; judulBaris: string[] }[]; fitur: { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }[] }
interface H { id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string; adr?: number[] }
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
const tabelDari = (teks: string, awalan: string): string[][] => {
  const semua = teks.slice(teks.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(pecahBaris(b)); }
  return keluar;
};
// pembulatan setengah ke atas seperti pembaca, bukan toFixed (4.28: 0,579 × 15)
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number, d = 1): string => bulat(x, d).toFixed(d).replace(".", ",");
const angkaId = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const ribuan = (n: number): string => n.toLocaleString("de-DE");
const KATA_BILANGAN: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 8: "delapan", 12: "dua belas" };
const kata = (n: number): string => {
  const k = KATA_BILANGAN[n];
  if (!k) throw new Error(`kata bilangan untuk ${n} belum ada`);
  return k;
};
const huruf1 = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

// --- sumber angka: naskah, halaman ADR, registry
const barisAdr = (n: number): string => naskah.split("\n").find((b) => b.startsWith(`| ${n} |`)) ?? "";
const adr50 = barisAdr(50);
const adr50Kolom = pecahBaris(adr50);
const daftarService = [...cari(/Enam service: ((?:`\w+`(?:, )?)+)/, adr50, "daftar service")[1]!.matchAll(/`(\w+)`/g)].map((m) => m[1]!);
const nService = daftarService.length;
const instanceService = ["", "satu", "dua", "tiga"].indexOf(cari(/dengan pipeline sendiri, (\w+) instance/, adr50, "instance")[1]!);
const ambangOrang = Number(cari(/Satu service dipegang kurang dari (\d+) orang/, adr50, "ambang orang")[1]);
const versiK3s = cari(/\(k3s di lab, ([\d.]+)\)/, adr50, "versi k3s di ADR 50")[1]!;
const dua12 = cari(/\(misalnya (\d+); (\d+) ÷ (\d+) = (\d,\d+) orang per service/, adr50, "dua belas service");
const nBanyak = Number(dua12[1]);
const orangTotal = Number(cari(/Totalnya 4 × 6 \+ 2 × 2 = (\d+) orang/, naskah, "total tim")[1]);
const tabelTim = naskah.slice(naskah.indexOf("| Tim | Orang | Pemimpin | Memegang |"), naskah.indexOf("Totalnya 4 × 6"));
const timProduk = cari(/lima tim produk \(([^)]+)\)/, hal51, "tim produk 5.1")[1]!.split(", ");
const orangTim = (nama: string): number => Number(cari(new RegExp(`^\\| ${nama} \\| (\\d+) \\|`, "m"), tabelTim, `tim ${nama}`)[1]);
const orangProduk = timProduk.reduce((a, n) => a + orangTim(n), 0);
const perService = orangTotal / nService;
const perServiceProduk = orangProduk / nService;
const perBanyak = orangTotal / nBanyak;
const barisUang = naskah.split("\n").find((b) => b.startsWith("| Transaksi uang (bayar, transfer, QR)")) ?? "";
const uang = cari(/([\d,]+) rata-rata dan ([\d,]+) puncak \(trx 2: ([\d,]+) dan ([\d,]+)\)/, barisUang, "transaksi uang");
const puncak3 = angkaId(uang[2]!);
const puncak2 = angkaId(uang[4]!);
const anggaranLompatan = Number(cari(/p95 satu lompatan HTTP melewati (\d+) ms/, adr37, "anggaran lompatan ADR 37")[1]);
const detikLompatan = anggaranLompatan / 1000;
const serentak3 = puncak3 * detikLompatan;
const serentak2 = puncak2 * detikLompatan;
const barisM51 = naskah.split("\n").find((b) => b.startsWith("| M51 |")) ?? "";
const hariBerturut = Number(cari(/selama (\d+) hari berturut-turut \(target, Asumsi\)/, barisM51, "hari berturut-turut M51")[1]);
const barisM44 = naskah.split("\n").find((b) => b.startsWith("| M44 |")) ?? "";
const queueJam = Number(cari(/merge queue (\d+) jam/, barisM44, "merge queue M44")[1]);
const timPlatform = orangTim("Platform");
const timSre = orangTim("SRE");
const kontrolHpa = cari(/Kontrolnya berjalan tiap (\d+) detik secara bawaan/, badan, "interval HPA di halaman")[1]!;
const ambangPlatform = adr50Kolom[3]!;

// --- rekaman panggilan.txt (lab t5-gabung)
const barisP = panggilan.split("\n");
const nomorBaris = (b: string[], pola: RegExp, dari0 = 0): number => {
  const i = b.findIndex((x, k) => k >= dari0 && pola.test(x));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan`);
  return i + 1;
};
const bagianDi = (b: string[], n: number): string => {
  for (let i = n - 1; i >= 0; i--) { const m = b[i]!.match(/^# --- ([A-G])\./); if (m) return m[1]!; }
  throw new Error(`rekaman: bagian untuk baris ${n} tidak ditemukan`);
};
const panggilanPer = [...panggilan.matchAll(/panggilan per transaksi \(dibawa pesan\): (\d+) pada (\d+) dari (\d+) transaksi/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
const pSatu = panggilanPer[0]![0]!;
const pTiga = panggilanPer[1]![0]!;
const nTransaksi = panggilanPer[1]![2]!;
const tabelProses = [...panggilan.matchAll(/^(masuk|perangkat|riwayat)\s+(\d+)\s+(\d+)$/gm)].map((m) => [m[1]!, Number(m[2]), Number(m[3])] as const);
const jumlahP = cari(/^jumlah\s+(\d+)\s+(\d+)\s+=> (\d+) = (\d+) x (\d+)$/m, panggilan, "jumlah penghitung client");
const brokerP = cari(/publikasi (\d+), ambil berisi (\d+), pesan tertinggal (\d+)/, panggilan, "penghitung broker");
const keputusan = cari(/Keputusan: setuju (\d+), tinjau (\d+), tolak (\d+)/, panggilan, "keputusan skor");
const samaP = cari(/kode alasan sama di kedua versi: (\d+) dari (\d+)/, panggilan, "hasil sama");
const byteKirim = Number(cari(/dikirim ke broker (\d+) byte/, panggilan, "byte kirim")[1]);
const byteTransaksi = cari(/per transaksi: ([\d,]+) byte dikirim dan ([\d,]+) byte diterima \((\d+) panggilan\)/, panggilan, "byte per transaksi");
const hurufB = bagianDi(barisP, nomorBaris(barisP, /^\$ gabung beban -url <masuk>/));
const hurufC = bagianDi(barisP, nomorBaris(barisP, /^# 400 transaksi: id, skor, keputusan/));
const hurufD = bagianDi(barisP, nomorBaris(barisP, /^tiga proses: dikirim ke broker/));
const awalB = nomorBaris(barisP, /^# --- B\./);
const akhirB = nomorBaris(barisP, /^# Tiga penghitung sama/);
const awalD = nomorBaris(barisP, /^# --- D\./);
const akhirD = nomorBaris(barisP, /^# Byte client tiap proses dijumlahkan/);
const aturanSkor = [...skorGo.matchAll(/\btambah\(\d+, "([\w-]+)"\)/g)].map((m) => m[1]!);

// --- rekaman latensi.txt, mati.txt, hpa.txt, dan konstanta run.py
const barisL = latensi.split("\n");
const hopMs = cari(/^HOP_MS = \(([\d, ]+)\)/m, runPy, "HOP_MS")[1]!.split(",").map((x) => Number(x));
const hopPer = Number(cari(/^HOP_PER_TRANSAKSI = (\d+)/m, runPy, "HOP_PER_TRANSAKSI")[1]);
const anggaranMs = Number(cari(/^ANGGARAN_MS = (\d+)/m, runPy, "ANGGARAN_MS")[1]);
const batasMasuk = Number(cari(/^BATAS_MASUK = ([\d.]+)/m, runPy, "BATAS_MASUK")[1]);
const [nLat, putaran] = cari(/^N_LATENSI, PUTARAN, PEMANASAN = (\d+), (\d+), (\d+)/m, runPy, "N_LATENSI dan PUTARAN").slice(1, 3).map(Number) as [number, number];
const barisTabelLat = barisL.map((b) => b.match(/^\s+(\d+)\s+(\d+) ms\s+ya\s+ya \(batas (\d+)\)$/)).filter((m): m is RegExpMatchArray => m !== null).map((m) => ({ jeda: Number(m[1]), bawah: Number(m[2]), rasio: Number(m[3]) }));
const jedaTebak = Number(cari(/jeda (\d+) ms: batas bawah (\d+) ms, transaksi tiga proses di atas (\d+) ms: (\d+) dari (\d+)/, latensi, "jeda yang melewati")[1]);
const lewat = cari(/jeda (\d+) ms: batas bawah (\d+) ms, transaksi tiga proses di atas (\d+) ms: (\d+) dari (\d+)/, latensi, "jeda yang melewati");
const perPanggilan = cari(/(\d+) ms dibagi (\d+) panggilan = (\d+,\d+) ms per panggilan/, latensi, "ms per panggilan");
const hurufLatB = bagianDi(barisL, nomorBaris(barisL, /^jeda 10 ms: batas bawah/));
const awalLatB = nomorBaris(barisL, /^# --- B\./);
const akhirLatB = nomorBaris(barisL, /^jeda 10 ms: batas bawah/);
const barisM = mati.split("\n");
const m504 = cari(/transaksi T\d+ ke tiga proses: (\d+) sesudah menunggu paling sedikit (\d+) detik/, mati, "504 saat riwayat mati");
const pesanTertinggal = Number(cari(/pesan yang menunggu di queue \(topik riwayat\): (\d+)/, mati, "pesan tertinggal")[1]);
const satuProses = cari(/transaksi T\d+ ke satu proses: (\d+), (\d+) panggilan/, mati, "satu proses saat riwayat mati");
const tanpaPenunggu = Number(cari(/hasil tanpa penunggu bertambah (\d+)/, mati, "hasil tanpa penunggu")[1]);
const hurufMatiB = bagianDi(barisM, nomorBaris(barisM, /^transaksi T\d+ ke tiga proses: 504/));
const hurufMatiC = bagianDi(barisM, nomorBaris(barisM, /^pesan T\d+ yang tertinggal diproses/));
const awalMatiB = nomorBaris(barisM, /^# --- B\./);
const akhirMati = nomorBaris(barisM, /^hasilnya sampai ke proses masuk/);
const barisH = hpa.split("\n");
const hpaAwal = cari(/HPA kartu-hpa awal: replika (\d+) \(min (\d+), maks (\d+)\), target CPU (\d+)%/, hpa, "HPA awal");
const hurufHpa = bagianDi(barisH, nomorBaris(barisH, /^HPA kartu-hpa awal/));
const awalHpa = nomorBaris(barisH, /^# --- E\./);
const akhirHpa = nomorBaris(barisH, /^Peristiwa SuccessfulRescale/);

// --- versi lab t5-rollout dan kode lab t5-gabung
const versiRollout = (komponen: string): string => cari(new RegExp(`^\\| ${komponen} \\| ([^|]+) \\|`, "m"), readmeRollout, `versi ${komponen}`)[1]!.trim();
const k3sVersi = cari(/(v\d+\.\d+\.\d+\+k3s\d+)/, versiRollout("k3s"), "versi k3s lab")[1]!;
const k3dVersi = cari(/(v\d+\.\d+\.\d+)/, versiRollout("k3d"), "versi k3d lab")[1]!;
const traefikVersi = cari(/Traefik ([\d.]+)/, readmeRollout, "versi Traefik")[1]!;
const gatewayVersi = cari(/CRD Gateway API (v[\d.]+)/, readmeRollout, "versi Gateway API")[1]!;
const goVersi = cari(/go(\d+\.\d+\.\d+)/, barisP[1]!, "versi Go di rekaman")[1]!;
const rentang = (teks: string, awal: RegExp, akhir: RegExp): string => {
  const b = teks.split("\n");
  const i = b.findIndex((x) => awal.test(x));
  if (i < 0) throw new Error(`rentang: ${awal} tidak ditemukan`);
  const j = b.findIndex((x, k) => k > i && akhir.test(x));
  if (j < 0) throw new Error(`rentang: ${akhir} tidak ditemukan`);
  return `${i + 1}:${j + 1}`;
};
const rentangKirimTerima = rentang(layananGo, /^\/\/ kirim menambah hitungan/, /^}$/).split(":");
const iTerima = layananGo.split("\n").findIndex((x) => /^func terima\(/.test(x));
const rentangKT = `${rentangKirimTerima[0]}:${layananGo.split("\n").findIndex((x, k) => k > iTerima && x === "}") + 1}`;
const iSelect = layananGo.split("\n").findIndex((x) => x === "\t\tselect {");
const rentangSelect = `${iSelect + 1}:${layananGo.split("\n").findIndex((x, k) => k > iSelect && x === "\t\t}") + 1}`;

describe("angka cerita dan hitungan: diturunkan dari naskah, halaman ADR, rekaman, dan registry", () => {
  test("service dan tim: enam service dari naskah, tiga instance, ambang tiga orang, dan tiga hitungan orang per service dari angka yang tertulis", () => {
    expect(daftarService).toEqual(["ledger", "akun", "pembayaran", "merchant", "notifikasi", "cicilan"]);
    expect(nService).toBe(6);
    expect(instanceService).toBe(3);
    expect(ambangOrang).toBe(3);
    expect(nBanyak).toBe(12);
    expect(orangTotal).toBe(28);
    expect(orangProduk).toBe(20);
    expect(koma(perService)).toBe("4,7");
    expect(koma(perServiceProduk)).toBe("3,3");
    expect(koma(perBanyak)).toBe("2,3");
    expect(dua12[4]).toBe("2,3");
    expect(dua12[2]).toBe(String(orangTotal));
    expect(badan).toContain(`${orangTotal} ÷ ${nService} = ${koma(perService)} orang per service untuk semua tim, dan ${orangProduk} ÷ ${nService} = ${koma(perServiceProduk)} untuk lima tim produk.`);
    expect(badan).toContain(`Bila ada ${kata(nBanyak)} service, ${orangTotal} ÷ ${nBanyak} = ${koma(perBanyak)} (Hitungan atas Asumsi tim ${orangTotal} orang, [[t5-prd]]).`);
    expect(badan).toContain(`${orangTotal} ÷ ${nBanyak} = ${koma(perBanyak)} orang per service, di bawah ambang ${ambangOrang} (Hitungan atas Asumsi)`);
    expect(badan).toContain(`${nBanyak} pipeline dan ${nBanyak} × ${instanceService} = ${nBanyak * instanceService} instance (Hitungan atas Asumsi)`);
    expect(badan).toContain(`${nService} × ${instanceService} = ${nService * instanceService} proses dijadwalkan, dipulihkan, dan diskalakan dengan skrip (Penalaran)`);
    expect(badan).toContain(`karena ${orangTotal} ÷ ${nBanyak} = ${koma(perBanyak)} orang per service lebih kecil dari ambang ${ambangOrang} (Hitungan atas Asumsi).`);
    expect(badan).toContain(`karena ${nService * instanceService} proses harus dijadwalkan dan dipulihkan dengan skrip.`);
    expect(badan).toContain(`${koma(perService)} untuk semua tim dan ${koma(perServiceProduk)} untuk lima tim produk (Hitungan atas Asumsi)`);
    expect(badan).toContain(`| Satu service dipegang kurang dari ${ambangOrang} orang (Asumsi) | Orang per service |`);
    expect(badan).toContain(`Platform ${timPlatform} dan SRE ${timSre} (Asumsi naskah, [[t5-tim-infra]])`);
    expect(hal512).toContain(`${orangTotal} ÷ ${nService} = ${koma(perService)} orang per service`);
    expect(hal512).toContain(`${orangProduk} ÷ ${nService} = ${koma(perServiceProduk)} orang per service (Hitungan atas Asumsi)`);
    expect(ambangPlatform).toContain(`Satu service dipegang kurang dari ${ambangOrang} orang (Asumsi; pembanding 4,7)`);
  });
  test("lompatan ke ledger: 69,4 dan 46,3 dari tabel beban naskah, 0,05 detik dari ADR 37, hasil 3,5 dan 2,3 dibulatkan setengah ke atas", () => {
    expect(puncak3).toBe(69.4);
    expect(puncak2).toBe(46.3);
    expect(anggaranLompatan).toBe(50);
    expect(detikLompatan).toBe(0.05);
    expect(serentak3).toBeCloseTo(3.47, 10);
    expect(koma(serentak3)).toBe("3,5");
    expect(serentak2).toBeCloseTo(2.315, 10);
    expect(koma(serentak2)).toBe("2,3");
    expect(badan).toContain(`Di puncak ${koma(puncak3)} transaksi uang per detik (Asumsi, dasar 3 transaksi per user aktif per hari, [[t5-prd]]) × ${String(detikLompatan).replace(".", ",")} detik = ${koma(serentak3)} panggilan serentak, dengan satu panggilan ke ledger per transaksi uang. Dengan 2 transaksi per user aktif per hari: ${koma(puncak2)} × ${String(detikLompatan).replace(".", ",")} = ${koma(serentak2)} (Hitungan atas Asumsi)`);
    expect(badan).toContain(`melewati ${anggaranLompatan} ms antar host (anggaran lompatan ADR 37)`);
    expect(adr37).toContain("Satu lompatan HTTP menambah waktu. Anggarannya 50 ms.");
    expect(hal51 + baca("situs/src/content/docs/tahap-5/on-prem-lawan-cloud.mdx")).toContain("69,4 per detik dengan 3 transaksi per user aktif per hari, atau 46,3 bila 2");
    expect(barisUang).toContain("(trx 2:");
  });
  test("target rekonsiliasi dari M51: 14 hari berturut-turut, Rp0 atau insiden tertutup dalam satu hari kerja, berlabel Asumsi", () => {
    expect(hariBerturut).toBe(14);
    expect(badan).toContain(`Target uji coba nasional: Rp0 atau insiden tertutup dalam satu hari kerja selama ${hariBerturut} hari berturut-turut (Asumsi, [[t5-m51]]).`);
    expect(queueJam).toBe(6);
    expect(badan).toContain(`Pembanding: merge queue ${queueJam} jam di cerita (Ilustrasi).`);
  });
  test("panggilan per transaksi: 0 dan 6 dari 400 transaksi, tiga penghitung sama, hitungan 3 × 400, 1.200 + 1.200 = 2.400 = 6 × 400", () => {
    expect([pSatu, pTiga, nTransaksi]).toEqual([0, 6, 400]);
    expect(panggilanPer.map((x) => x[1])).toEqual([400, 400]);
    expect(panggilanPer.map((x) => x[2])).toEqual([400, 400]);
    expect(tabelProses.map((x) => x[0])).toEqual(["masuk", "perangkat", "riwayat"]);
    for (const [, kirim, ambil] of tabelProses) expect([kirim, ambil]).toEqual([nTransaksi, nTransaksi]);
    expect(tabelProses).toHaveLength(3);
    const kirimJumlah = tabelProses.length * nTransaksi;
    expect([Number(jumlahP[1]), Number(jumlahP[2])]).toEqual([kirimJumlah, kirimJumlah]);
    expect([Number(jumlahP[3]), Number(jumlahP[4]), Number(jumlahP[5])]).toEqual([2 * kirimJumlah, pTiga, nTransaksi]);
    expect(pTiga * nTransaksi).toBe(2 * kirimJumlah);
    expect([Number(brokerP[1]), Number(brokerP[2]), Number(brokerP[3])]).toEqual([kirimJumlah, kirimJumlah, 0]);
    expect(hopPer).toBe(pTiga);
    expect(badan).toContain(`Tiap proses mencatat ${nTransaksi} kirim dan ${nTransaksi} ambil. Tiga proses memberi 3 × ${nTransaksi} = ${ribuan(kirimJumlah)} kirim dan ${ribuan(kirimJumlah)} ambil. Jumlahnya ${ribuan(kirimJumlah)} + ${ribuan(kirimJumlah)} = ${ribuan(2 * kirimJumlah)} = ${pTiga} × ${nTransaksi} panggilan (Hitungan dari rekaman).`);
    expect(badan).toContain(`Broker mencatat ${ribuan(Number(brokerP[1]))} publikasi dan ${ribuan(Number(brokerP[2]))} ambil yang berisi pesan, dan tidak ada pesan tertinggal.`);
    expect(badan).toContain(`satu alur skor risiko berjalan dua cara untuk ${nTransaksi} transaksi. Satu proses melakukan ${pSatu} panggilan antar proses per transaksi, dan tiga proses dengan queue melakukan ${pTiga}.`);
    expect(badan).toContain(`Skor, keputusan, dan kode alasannya sama di ${samaP[1]} dari ${samaP[2]} transaksi.`);
    expect([Number(samaP[1]), Number(samaP[2])]).toEqual([nTransaksi, nTransaksi]);
    expect(badan).toContain(`Satu transaksi melewati ${kata(pTiga)} panggilan: masuk kirim, perangkat ambil, perangkat kirim, riwayat ambil, riwayat kirim, masuk ambil hasil.`);
    expect(layananGo).toContain("masuk kirim, perangkat ambil, perangkat kirim, riwayat ambil, riwayat kirim, masuk ambil hasil");
    expect(badan).toContain(`${keputusan[1]} setuju, ${keputusan[2]} tinjau, dan ${keputusan[3]} tolak.`);
    expect(Number(keputusan[1]) + Number(keputusan[2]) + Number(keputusan[3])).toBe(nTransaksi);
  });
  test("kode penghitung: hitungan bertambah hanya di kirim dan terima, delapan aturan skor, satu proses tanpa kirim atau terima, dua jeda di broker", () => {
    expect((layananGo.match(/\bp\.Panggilan\+\+/g) ?? []).length).toBe(2);
    expect((layananGo.match(/\bkirim\(r\.Context\(\)|\bkirim\(ctx|\bkirim\(c\b/g) ?? []).length).toBeGreaterThan(0);
    const satu = layananGo.slice(layananGo.indexOf("type Satu struct"), layananGo.indexOf("// ---------- versi tiga proses"));
    expect(satu).not.toMatch(/\bkirim\(|\bterima\(/);
    expect(satu).toContain("hitungan panggilan tetap 0");
    expect(aturanSkor).toHaveLength(8);
    expect(badan).toContain(`menghitung skor risiko dengan ${kata(aturanSkor.length)} aturan poin`);
    expect((brokerGo.match(/\bb\.jeda\(\)/g) ?? []).length).toBe(2);
    expect(brokerGo).toContain("pesan butuh satu waktu tempuh untuk sampai ke broker");
    expect(brokerGo).toContain("pesan butuh satu waktu tempuh untuk sampai ke penerima");
    expect(badan).toContain("Broker menjeda tiap panggilan yang membawa pesan sebesar jeda buatan");
    expect(readmeGabung).toContain("Bentuk lain (satu pemanggil yang memanggil tiga service sekaligus tanpa queue) **Tidak dijalankan**");
    expect(badan).toContain("Bentuk lain, misalnya satu pemanggil yang memanggil tiga service tanpa queue, Tidak dijalankan.");
    expect(readmeGabung).toContain("Satu tahap tambahan menambah satu kirim dan satu ambil per transaksi (Hitungan, tidak direkam)");
    expect(badan).toContain("tiap tahap memanggil `kirim` sekali dan `terima` sekali, jadi tahap tambahan menambah dua panggilan per transaksi (Penalaran).");
    expect(badan).toContain(`tiap tahap tambahan menambah 2 panggilan per transaksi di rantai lab (Penalaran).`);
  });
  test("byte isi pesan: 248.056 byte untuk 400 transaksi dan 620,14 byte per transaksi tiap arah, dihitung ulang", () => {
    expect(byteKirim).toBe(248056);
    expect(byteTransaksi[1]).toBe("620,14");
    expect(byteTransaksi[2]).toBe("620,14");
    expect(Number(byteTransaksi[3])).toBe(pTiga);
    expect(bulat(byteKirim / nTransaksi, 2)).toBe(620.14);
    expect(badan).toContain(`Tiga proses mengirim ${ribuan(byteKirim)} byte untuk ${nTransaksi} transaksi, yaitu ${byteTransaksi[1]} byte per transaksi tiap arah (bagian ${hurufD}).`);
    expect(badan).toContain(`isi pesan lab hanya ${byteTransaksi[1]} byte per transaksi tiap arah`);
    expect(badan.split(`${byteTransaksi[1]} byte`).length - 1).toBe(4);
    expect(barisP[awalD - 1]).toContain("Byte isi pesan");
  });
  test("latensi: jeda 0, 2, 4, 10 ms dari run.py, batas bawah 6 × jeda dari rekaman, 50 ÷ 6 = 8,33, 500 dari 500 = putaran × transaksi", () => {
    expect(hopMs).toEqual([0, 2, 4, 10]);
    expect(barisTabelLat.map((x) => x.jeda)).toEqual(hopMs);
    for (const x of barisTabelLat) expect(x.bawah).toBe(hopPer * x.jeda);
    expect(barisTabelLat.map((x) => x.bawah)).toEqual([0, 12, 24, 60]);
    expect(anggaranMs).toBe(50);
    expect(bulat(anggaranMs / hopPer, 2)).toBe(8.33);
    expect(perPanggilan[3]).toBe("8,33");
    expect([Number(perPanggilan[1]), Number(perPanggilan[2])]).toEqual([anggaranMs, hopPer]);
    expect([nLat, putaran]).toEqual([100, 5]);
    expect(Number(lewat[4])).toBe(nLat * putaran);
    expect(Number(lewat[5])).toBe(nLat * putaran);
    expect(jedaTebak).toBe(10);
    expect(Number(lewat[2])).toBe(hopPer * jedaTebak);
    expect(Number(lewat[3])).toBe(anggaranMs);
    expect(Number(lewat[2])).toBeGreaterThan(anggaranMs);
    const tabel = tabelDari(badan, "| Jeda per panggilan |");
    expect(tabel[0]).toEqual(["Jeda per panggilan", "Batas bawah satu transaksi (6 × jeda)", "Di atas batas uji 50 ms?"]);
    expect(tabel.slice(2)).toEqual(barisTabelLat.map((x) => [`${x.jeda} ms`, `${x.bawah} ms`, x.bawah > anggaranMs ? "ya" : "tidak"]));
    expect(tabel.slice(2).map((r) => r[2])).toEqual(["tidak", "tidak", "tidak", "ya"]);
    expect(badan).toContain(`Pada jeda ${jedaTebak} ms batas bawahnya ${hopPer} × ${jedaTebak} = ${hopPer * jedaTebak} ms, jadi ${lewat[4]} dari ${lewat[5]} transaksi tiga proses melewati ${anggaranMs} ms. Lab menjalankan ${putaran} putaran × ${nLat} transaksi.`);
    expect(badan).toContain(`Batas uji habis pada ${anggaranMs} ÷ ${hopPer} = ${perPanggilan[3]} ms per panggilan (Hitungan atas Asumsi lab).`);
    expect(badan).toContain("Itu batas dari penjumlahan jeda, bukan p95 hasil profil.");
    expect(badan).toContain(`(Asumsi lab: ${hopMs.slice(0, -1).join(", ")}, dan ${hopMs.at(-1)} ms)`);
    for (const x of barisTabelLat) expect(x.rasio).toBe(x.jeda === 0 ? 2 : 10);
    expect(badan).toContain(`paling kecil ${barisTabelLat[0]!.rasio} pada jeda ${barisTabelLat[0]!.jeda} ms dan ${barisTabelLat[1]!.rasio} pada jeda lain`);
    expect(readmeGabung).toContain("time.Sleep");
    expect(readmeGabung).toContain("Jeda per panggilan adalah jeda buatan (Asumsi)");
  });
  test("batas lab dalam kalimat: tidak memprofil, bukan 'hanya dari enam panggilan HTTP', bukan 'tidak ada penyebab lain'", () => {
    expect(latensi).toContain("lab tidak memprofil bagian terbesarnya");
    expect(badan).toContain("dan lab tidak memprofil bagian terbesarnya.");
    expect(badan).not.toMatch(/hanya (dari|karena) enam panggilan/i);
    expect(badan).not.toMatch(/tidak ada penyebab lain/i);
    expect(badan).toContain("Nilainya tidak direkam karena bergantung mesin.");
    expect(badan).toContain("Lab tidak mengukur jaringan antar host. Semua panggilan berjalan di loopback satu mesin.");
    expect(readmeGabung).toContain("Jaringan antar host (semua panggilan di loopback; jeda antar host adalah jeda buatan)");
    expect(badan).toContain("Batas uji 50 ms di lab adalah batas total satu transaksi alur skor (Asumsi lab), dan rekaman menyebutnya anggaran 50 ms.");
    expect(latensi).toContain("# --- B. Anggaran 50 ms ---");
    expect(readmeGabung).toContain("Anggaran 50 ms di lab ini adalah anggaran satu alur skor");
    expect(badan).toContain("Itu bukan anggaran lompatan di ADR 37, yaitu batas tambahan p95 satu panggilan HTTP ke ledger. Angkanya sama, artinya lain.");
  });
  test("proses riwayat mati: 504 sesudah paling sedikit 2 detik, satu pesan tertinggal, satu proses 200, hasil tanpa penunggu bertambah 1, SIGTERM saat menganggur", () => {
    expect([Number(m504[1]), Number(m504[2])]).toEqual([504, batasMasuk]);
    expect(batasMasuk).toBe(2);
    expect(pesanTertinggal).toBe(1);
    expect([Number(satuProses[1]), Number(satuProses[2])]).toEqual([200, 0]);
    expect(tanpaPenunggu).toBe(1);
    expect(layananGo).toContain("http.StatusGatewayTimeout");
    expect(layananGo).toContain("case <-time.After(m.BatasTunggu):");
    expect(readmeGabung).toContain("SIGTERM saat proses itu menganggur");
    expect(badan).toContain(`Tiga proses menjawab ${m504[1]} sesudah menunggu paling sedikit ${m504[2]} detik, yaitu batas tunggu proses masuk, dan ${kata(pesanTertinggal)} pesan tertinggal di queue. Satu proses tetap menjawab ${satuProses[1]}.`);
    expect(badan).toContain(`Di bagian ${hurufMatiB} \`mati.txt\`, proses riwayat dihentikan dengan SIGTERM saat menganggur, sementara masuk, perangkat, dan broker tetap hidup.`);
    expect(badan).toContain("Sesudah riwayat hidup lagi, pesan yang tertinggal diproses dan hasilnya sampai ke proses masuk tanpa penunggu, karena permintaannya sudah dijawab 504.");
    expect(badan).toContain("Skor di lab tidak punya efek samping.");
    expect(skorGo).not.toMatch(/\btime\.|\brand\./);
    expect(mati).toContain("broker yang mati membuangnya, dan kasus itu Tidak dijalankan");
    expect(badan).toContain(`Di lab, proses masuk menjawab ${m504[1]} sesudah ${m504[2]} detik bila hasil tidak datang (\`mati.txt\` bagian ${hurufMatiB}).`);
    expect([hurufMatiB, hurufMatiC]).toEqual(["B", "C"]);
  });
  test("HPA: awal 1 pod, minimum 1, maksimum 4, target CPU 50%; rumus ceil(1 × 100 ÷ 50) = 2 dari dokumentasi", () => {
    expect(hpaAwal.slice(1, 5).map(Number)).toEqual([1, 1, 4, 50]);
    const [awal, , maks, target] = hpaAwal.slice(1, 5).map(Number) as [number, number, number, number];
    const cpuContoh = 100;
    const diinginkan = Math.ceil(awal * (cpuContoh / target));
    expect(diinginkan).toBe(2);
    expect(diinginkan).toBeLessThanOrEqual(maks);
    expect(badan).toContain(`Contoh Ilustrasi: ${awal} pod, CPU rata-rata ${cpuContoh}% dari requests, target ${target}%, jadi ceil(${awal} × ${cpuContoh} ÷ ${target}) = ${diinginkan} pod (Hitungan).`);
    expect(badan).toContain(`Jumlah pod naik di atas ${awal} dan tidak melewati maksimal ${maks}.`);
    expect(hpa).toContain("HPA sesudah beban: replika bertambah dari 1: ya; tidak melebihi maxReplicas (4): ya");
    expect(hpa).toContain("jumlah tepat bergantung beban mesin, tidak direkam");
    expect(hpa).toContain("Argo CD v3.5.6 Tidak dijalankan: bentrok HPA dan Argo CD soal spec.replicas tetap [perlu verifikasi]");
    expect(readmeRollout).toContain("HPA di sini menargetkan Deployment, bukan Rollout; HPA atas Rollout belum dicoba");
    expect(badan).toContain("HPA di lab menargetkan Deployment, bukan Rollout, dan Argo CD Tidak dijalankan. Bentrok HPA dan Argo CD soal jumlah pod tetap [perlu verifikasi].");
    expect(kontrolHpa).toBe("15");
    expect(barisRiset("R5-172")).toContain("the default interval is 15 seconds");
    expect(barisRiset("R5-172")).toContain("0.1 by default");
    expect(badan).toContain("dan selisih di dalam toleransi 0,1 dilewati");
    expect(hurufHpa).toBe("E");
  });
  test("versi: k3s v1.37.1+k3s1 di k3d v5.9.0, Kubernetes 1.37.1 di ADR 50 sama dengan versi k3s lab, Traefik 3.7.13, Gateway API v1.6.1, Go 1.27.3", () => {
    expect(k3sVersi).toBe("v1.37.1+k3s1");
    expect(k3sVersi.startsWith(`v${versiK3s}+`)).toBe(true);
    expect(k3dVersi).toBe("v5.9.0");
    expect(traefikVersi).toBe("3.7.13");
    expect(gatewayVersi).toBe("v1.6.1");
    expect(goVersi).toBe("1.27.3");
    expect(badan).toContain(`Lab \`t5-rollout\` memakai k3s ${k3sVersi} di dalam k3d ${k3dVersi}, jadi cluster berjalan di Docker satu mesin (README lab).`);
    expect(badan).toContain(`Lab memakai Gateway Traefik ${traefikVersi} dengan Gateway API ${gatewayVersi} (README lab t5-rollout).`);
    expect(badan).toContain(`Kubernetes menjalankan service: k3s di lab, versi ${versiK3s}.`);
    expect(badan).toContain(`(\`go doc net/http.Client\`, Go ${goVersi})`);
    expect(badan).toContain(`(\`go doc time.Sleep\`, Go ${goVersi})`);
  });
});

describe("Yang tidak direkam: tiap butir diturunkan dari README dan kode lab, sebagai batas lab", () => {
  test("enam butir: loopback, beban serentak, broker tiruan, proses mati, pemindai ADR 44, dan Kubernetes", () => {
    const kapasitas = Number(cari(/const KapasitasTopik = (\d+)/, brokerGo, "KapasitasTopik")[1]);
    expect(kapasitas).toBe(1024);
    expect(brokerGo).toContain("http.StatusServiceUnavailable");
    const batasPesanMiB = 2 ** Number(cari(/io\.LimitReader\(r\.Body, 1<<(\d+)\)/, brokerGo, "batas isi pesan")[1]) / 2 ** 20;
    expect(batasPesanMiB).toBe(1);
    expect(badan).not.toMatch(/ukuran pesan tidak dibatasi/);
    expect(readmeGabung).toContain("penuh dijawab 503; jumlah topik tidak dibatasi dan isi satu pesan sampai 1 MiB, jadi memori broker tidak berbatas");
    expect(readmeGabung).toContain("beban serentak (penggerak mengirim satu transaksi pada satu waktu, jadi p95 di sini adalah latensi satu transaksi tanpa queue di depan pemrosesnya)");
    expect(readmeGabung).toContain("Pesan hidup di memori broker. Pesan yang sudah diambil lalu penerimanya mati sebelum selesai hilang.");
    expect(readmeGabung).toContain("Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini");
    expect(readmeRollout).toContain("Gerbang ADR 44 (govulncheck, grype) atas image: Tidak dijalankan di lab ini");
    expect(readmeRollout).toContain("Argo CD v3.5.6 dan Flux **Tidak dijalankan**");
    expect(readmeRollout).toContain("hanya diuji di host arm64");
    expect(readmeRollout).toContain("Router selain Traefik, dan Ingress NGINX");
    const blok = badan.slice(badan.indexOf("**Yang tidak direkam.**"), badan.indexOf("### Di stack lain"));
    expect(blok.split("\n").filter((b) => b.startsWith("- "))).toEqual([
      "- Jaringan antar host: semua panggilan lab berjalan di loopback satu mesin, jadi p95 satu lompatan HTTP antar host ke ledger Tidak dijalankan.",
      "- Beban serentak: penggerak mengirim satu transaksi pada satu waktu, jadi p95 di lab adalah latensi satu transaksi tanpa queue di depan prosesnya.",
      `- Broker tiruan: pesan hanya di memori, dan broker yang mati membuangnya. Satu topik menampung ${ribuan(kapasitas)} pesan dan penuh dijawab 503. Jumlah topik tidak dibatasi dan satu pesan dibaca sampai ${batasPesanMiB} MiB, jadi memori broker tidak berbatas (batas lab).`,
      "- Proses mati: hanya proses riwayat yang dihentikan, dengan SIGTERM saat menganggur. Broker produk dengan konfirmasi dan penyimpanan Tidak dijalankan.",
      "- Pemindai ADR 44 (govulncheck dan grype) Tidak dijalankan atas kedua lab, jadi halaman ini tidak menulis lab lolos pemindaian.",
      "- Kubernetes: Argo CD, HPA atas Rollout, dan router selain Traefik Tidak dijalankan, dan lab hanya diuji di host arm64.",
    ]);
    expect(badan.replace("tidak menulis lab lolos pemindaian", "")).not.toMatch(/lolos pemindaian|lolos (govulncheck|grype|gosec)/);
    expect((badan.match(/lolos pemindaian/g) ?? []).length).toBe(1);
    expect(badan.indexOf("**Yang tidak direkam.**")).toBeLessThan(badan.indexOf("### Di stack lain"));
    expect(badan.indexOf("**Yang tidak direkam.**")).toBeGreaterThan(badan.indexOf("**Gateway API menggantikan Ingress API, bukan Ingress NGINX.**"));
  });
});

describe("rekaman dan kode lab: rentang Snippet dan huruf bagian diturunkan dari berkasnya", () => {
  const snippet = [...badan.matchAll(/<Snippet (?:file="([^"]+)" lines="(\d+:\d+)"|files=\{\["([^"]+)"\]\})(?: lang="(\w+)")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1] ?? m[3]!.replace(/:\d+:\d+$/, ""), lines: m[2] ?? m[3]!.match(/(\d+:\d+)$/)![1]!, lang: m[4], title: m[5]! }));
  test("daftar Snippet berlabel Rekaman lab atau kode lab, dan rentang dari fungsi dan penanda bagian", () => {
    expect(snippet.map((s) => [s.file, s.lines])).toEqual([
      ["labs/t5-gabung/layanan/layanan.go", rentangKT],
      ["labs/t5-gabung/output/panggilan.txt", `${awalB}:${akhirB}`],
      ["labs/t5-gabung/output/panggilan.txt", `${awalD}:${akhirD}`],
      ["labs/t5-gabung/output/latensi.txt", `${awalLatB}:${akhirLatB}`],
      ["labs/t5-gabung/output/mati.txt", `${awalMatiB}:${akhirMati}`],
      ["labs/t5-rollout/output/hpa.txt", `${awalHpa}:${akhirHpa}`],
      ["labs/t5-gabung/layanan/layanan.go", rentangSelect],
    ]);
    expect(rentangKT).toBe("65:87");
    expect(snippet.map((s) => s.title)).toEqual([
      "Kode lab: labs/t5-gabung/layanan/layanan.go (kirim dan terima menambah hitungan panggilan)",
      `Rekaman lab: labs/t5-gabung/output/panggilan.txt, bagian ${hurufB} (panggilan per transaksi dan tiga penghitung)`,
      `Rekaman lab: labs/t5-gabung/output/panggilan.txt, bagian ${hurufD} (byte isi pesan)`,
      `Rekaman lab: labs/t5-gabung/output/latensi.txt, bagian ${hurufLatB} (jeda 10 ms melewati batas uji)`,
      `Rekaman lab: labs/t5-gabung/output/mati.txt, bagian ${hurufMatiB} dan ${hurufMatiC} (proses riwayat mati lalu hidup lagi)`,
      `Rekaman lab: labs/t5-rollout/output/hpa.txt, bagian ${hurufHpa} (HPA menambah pod menurut CPU)`,
      "labs/t5-gabung/layanan/layanan.go",
    ]);
    expect(snippet.filter((s) => s.lang).map((s) => s.lang)).toEqual(["go", "go"]);
    expect([hurufB, hurufC, hurufD, hurufLatB]).toEqual(["B", "C", "D", "B"]);
    // tiap rentang memuat baris penanda bagian yang disebut judulnya
    expect(barisP[awalB - 1]).toMatch(/^# --- B\./);
    expect(barisL[awalLatB - 1]).toMatch(/^# --- B\./);
    expect(barisM[awalMatiB - 1]).toMatch(/^# --- B\./);
    expect(barisM.slice(awalMatiB - 1, akhirMati).some((b) => /^# --- C\./.test(b))).toBe(true);
    expect(barisH[awalHpa - 1]).toMatch(/^# --- E\./);
    // rentang hanya memuat teks rekaman, tanpa ID riset, nomor keputusan, atau nomor PR
    for (const [b, a, z] of [[barisP, awalB, akhirB], [barisP, awalD, akhirD], [barisL, awalLatB, akhirLatB], [barisM, awalMatiB, akhirMati], [barisH, awalHpa, akhirHpa]] as [string[], number, number][]) {
      const isi = b.slice(a - 1, z).join("\n");
      expect(isi).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|PR #?\d{3}/i);
    }
  });
  test("kode di Snippet: kirim dan terima di layanan.go (dua tempat hitungan), select dengan time.After dan 504 untuk tab Go", () => {
    const b = layananGo.split("\n");
    const [a1, z1] = rentangKT.split(":").map(Number) as [number, number];
    const kt = b.slice(a1 - 1, z1).join("\n");
    expect(kt).toMatch(/^\/\/ kirim menambah hitungan/);
    expect(kt).toContain("func kirim(");
    expect(kt).toContain("func terima(");
    expect((kt.match(/p\.Panggilan\+\+/g) ?? []).length).toBe(2);
    const [a2, z2] = rentangSelect.split(":").map(Number) as [number, number];
    const sel = b.slice(a2 - 1, z2).join("\n");
    expect(sel).toContain("case <-time.After(m.BatasTunggu):");
    expect(sel).toContain("http.StatusGatewayTimeout");
    expect(sel.trimEnd().endsWith("}")).toBe(true);
    expect(klienGo).not.toMatch(/\bTimeout:/);
    expect(badan).toContain("Client queue di lab tidak mengisinya. Batas ada di proses `masuk`, yang menunggu hasil dengan `time.After` dan menjawab 504 sesudah 2 detik.");
    expect(badan).toContain("`http.Client` punya field `Timeout` yang bernilai nol bila tidak diisi, dan nol berarti tanpa batas waktu");
  });
});

describe("kasus industri, Kubernetes, Gateway API, dan stack lain: tautan, tanggal buka, kutipan, dan baris riset R5-170 sampai R5-174", () => {
  const URL = {
    komponen: "https://kubernetes.io/docs/concepts/overview/components/",
    pods: "https://kubernetes.io/docs/concepts/workloads/pods/",
    node: "https://nodejs.org/api/globals.html",
    k3s: "https://docs.k3s.io/",
    hpa: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/",
    gateway: "https://kubernetes.io/docs/concepts/services-networking/gateway/",
    ingress: "https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/",
    arsip: "https://web.archive.org/web/20230504223922/https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static",
    laravel: "https://laravel.com/docs/13.x/http-client",
    requests: "https://requests.readthedocs.io/en/latest/user/advanced/",
    dart: "https://api.dart.dev/stable/latest/dart-io/HttpClient/connectionTimeout.html",
    supabase: "https://supabase.com/docs/guides/functions/limits",
  };
  const risetUntuk = (u: string): string => (u === URL.arsip ? "R5-171" : u === URL.gateway || u === URL.ingress ? "R5-170" : [URL.komponen, URL.pods, URL.k3s, URL.hpa].includes(u) ? "R5-172" : "R5-173");
  test("tiap tautan luar tercatat di baris riset yang benar, dengan tanggal buka 2026-11-03, dan jumlah per tautan terkunci", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const hitung: Record<string, number> = {};
    for (const u of tautan) hitung[u] = (hitung[u] ?? 0) + 1;
    expect(Object.keys(hitung).sort()).toEqual(Object.values(URL).sort());
    expect(hitung).toEqual({ [URL.komponen]: 2, [URL.pods]: 2, [URL.node]: 2, [URL.k3s]: 2, [URL.hpa]: 2, [URL.gateway]: 2, [URL.ingress]: 2, [URL.arsip]: 2, [URL.mdn]: 2, [URL.laravel]: 2, [URL.requests]: 2, [URL.dart]: 2, [URL.supabase]: 2 });
    for (const u of Object.values(URL)) {
      const kunci = u === URL.arsip ? "web.archive.org/web/20230504223922/https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90" : u.replace("https://", "");
      expect(barisRiset(risetUntuk(u)), u).toContain(kunci.replace(/\/$/, ""));
    }
    const tanggal = badan.match(/2026-\d\d-\d\d/g) ?? [];
    expect(new Set(tanggal)).toEqual(new Set(["2026-11-03"]));
    expect(tanggal.length).toBe(15);
    for (const r of ["R5-170", "R5-171", "R5-172", "R5-173"]) expect(barisRiset(r)).toContain("dibuka 2026-11-03");
    expect(barisRiset("R5-174")).toContain("dibaca 2026-11-03");
    const bacaan = badan.slice(badan.indexOf("### Bacaan lanjut"));
    expect([...bacaan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]).sort()).toEqual(Object.values(URL).sort());
  });
  test("Ingress NGINX: pengumuman 11 November 2025, pemeliharaan dihentikan Maret 2026, kalimat sumber tercatat, dan status archived dari API GitHub", () => {
    const r = barisRiset("R5-170");
    expect(r).toContain("Tuesday, November 11, 2025");
    expect(r).toContain("Best-effort maintenance will continue until March 2026. Afterward, there will be no further releases, no bugfixes, and no updates to resolve any security vulnerabilities that may be discovered.");
    expect(r).toContain("In March 2026, Ingress NGINX maintenance will be halted, and the project will be retired.");
    expect(r).toContain("Gateway API is the successor to the Ingress API. However, it does not include the Ingress kind. As a result, a one-time conversion from your existing Ingress resources to Gateway API resources is necessary.");
    expect(r).toContain("`archived` true");
    expect(r).toContain("Ingress NGINX Controller for Kubernetes");
    expect(badan).toContain("Pengumuman pada 11 November 2025 menulis bahwa pemeliharaannya dihentikan pada Maret 2026, tanpa rilis, perbaikan bug, atau pembaruan keamanan sesudahnya");
    expect(badan).toContain("Pengumuman itu datang dari SIG Network dan Security Response Committee.");
    expect(badan).toContain("API GitHub menulis pada 2026-11-03 bahwa repositorinya berstatus archived.");
    expect(badan).not.toMatch(/tanggal yang sama/);
    expect(badan).toContain("Ingress NGINX adalah satu controller untuk Ingress API.");
    expect(badan).toContain("Gateway API adalah keluarga jenis API untuk routing lalu lintas di Kubernetes, penerus Ingress API, dan tidak memuat jenis Ingress.");
    expect(badan).toContain("**Gateway API menggantikan Ingress API, bukan Ingress NGINX.**");
    expect(badan).not.toMatch(/Gateway API menggantikan Ingress NGINX/);
    expect(badan).not.toMatch(/dihentikan sejak Maret 2026/);
  });
  test("Prime Video: tanggal, penulis, 5%, 90%, kasus per kasus, satu proses, detector, S3, dan batas dari baris riset R5-171", () => {
    const r = barisRiset("R5-171");
    expect(r).toContain("Marcin Kolny");
    expect(r).toContain("Mar 22, 2023");
    expect(r).toContain("web.archive.org/web/20230504223922/");
    expect(r).toContain("caused us to hit a hard scaling limit at around 5% of the expected load");
    expect(r).toContain("The two most expensive operations in terms of cost were the orchestration workflow and when data passed between distributed components.");
    expect(r).toContain("we moved all components into a single process to keep the data transfer within the process memory");
    expect(r).toContain("Moving our service to a monolith reduced our infrastructure cost by over 90%.");
    expect(r).toContain("whether to use them over monolith has to be made on a case-by-case basis");
    expect(r).toContain("in our new approach the number of detectors only scale vertically because they all run within the same instance");
    expect(r).toContain("we cloned the service multiple times, parametrizing each copy with a different subset of detectors");
    expect(r).toContain("the high number of Tier-1 calls to the S3 bucket was expensive");
    expect(r).toContain("satu service pemantau milik satu tim");
    expect(badan).toContain("Marcin Kolny menulis pada 22 Maret 2023 tentang alat inspeksi kualitas audio dan video milik tim Video Quality Analysis di Prime Video.");
    expect(badan).toContain("mencapai batas skala keras pada sekitar 5% beban yang diharapkan.");
    expect(badan).toContain("biaya infrastruktur turun lebih dari 90%.");
    expect(badan).toContain("Mereka menulis bahwa memilih microservices atau serverless lawan monolith harus kasus per kasus");
    expect(badan).toContain("Batasnya: satu service pemantau milik satu tim, bukan seluruh Prime Video, dan penulisnya karyawan perusahaan yang menulis tentang sistemnya sendiri.");
    expect(badan).toContain("banyaknya panggilan S3 untuk frame antar komponen menaikkan biaya (kasus industri)");
    expect(badan).toContain("Lab tidak memperagakan kasus komponen yang bertukar data besar, dan skor risiko hanya padanan Ilustrasi.");
    expect(readmeGabung).toContain("skor risiko hanya padanan dengan label Ilustrasi");
    expect((badan.match(/Prime Video/g) ?? []).length).toBe(7);
    expect(badan).not.toMatch(/seluruh perusahaan (kembali|pindah)/i);
  });
  test("Kubernetes dan HPA: kalimat dari baris R5-172, tanpa klaim HPA atas Rollout", () => {
    const r = barisRiset("R5-172");
    expect(r).toContain("A Kubernetes cluster consists of a control plane and one or more worker nodes.");
    expect(r).toContain("Looks for Pods not yet bound to a node, and assigns each Pod to a suitable node.");
    expect(r).toContain("K3s is a fully compliant Kubernetes distribution with the following enhancements: Distributed as a single binary or minimal container image.");
    expect(r).toContain("desiredReplicas = ceil[currentReplicas × (currentMetricValue / desiredMetricValue)]");
    expect(r).toContain("The control plane skips any scaling action if the ratio is sufficiently close to 1.0 (within a configurable tolerance, 0.1 by default).");
    expect(r).toContain("A Pod (as in a pod of whales or pea pod) is a group of one or more containers, with shared storage and network resources");
    expect(badan).toContain("Sebuah cluster Kubernetes terdiri dari control plane dan satu atau lebih worker node. Pod adalah satu atau lebih container yang berbagi penyimpanan dan jaringan");
    expect(badan).toContain("Komponen kube-scheduler memasangkan pod yang belum punya node dengan node yang cocok");
    expect(badan).toContain("k3s adalah distribusi Kubernetes yang menurut dokumentasinya sepenuhnya sesuai, dikemas sebagai satu binary atau image container minimal");
    expect(badan).toContain("pod yang diinginkan = ceil[pod sekarang × (nilai metrik sekarang ÷ nilai target)]");
    expect(badan).toContain("Metrik umur notifikasi untuk worker dibahas di [[t5-fanout]], dan tidak direkam di halaman ini.");
    expect(badan).not.toMatch(/HPA atas Rollout (berjalan|terbukti|aman)/);
  });
  test("tab Di stack lain: enam tab dengan label dan slot yang benar, hanya Go dijalankan, lima lainnya Tidak dijalankan dengan sumber di baris R5-173", () => {
    const tab = badan.slice(badan.indexOf("<TabSet"), badan.indexOf("</TabSet>"));
    expect(tab).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    const slot = [...tab.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1]);
    expect(slot).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    const potong = tab.split(/<Fragment slot="t\d">/).slice(1);
    expect(potong[0]).toContain("*Dijalankan: lab t5-gabung, Go 1.27.3 (rekaman `mati.txt`).*");
    expect(potong[1]).toContain("MDN: AbortSignal.timeout()");
    expect(potong[2]).toContain("Laravel 13.x: HTTP Client");
    expect(potong[3]).toContain("requests: Advanced Usage");
    expect(potong[3]).toContain("Dokumentasi Django tidak dibaca untuk panggilan keluar [perlu verifikasi].");
    expect(potong[4]).toContain("Dart 3.13.7");
    expect(potong[4]).toContain("Cara Serverpod mengatur panggilan keluar tidak dibaca [perlu verifikasi].");
    expect(potong[5]).toContain("Supabase: Edge Functions limits");
    for (const i of [1, 2, 3, 4, 5]) expect(potong[i]).toContain("*Tidak dijalankan. Dicek ke");
    const r = barisRiset("R5-173");
    expect(r).toContain("A Timeout of zero means no timeout.");
    expect(r).toContain("The signal aborts with a TimeoutError DOMException on timeout. The timeout is based on active rather than elapsed time");
    expect(r).toContain("By default, the HTTP client will timeout after 30 seconds");
    expect(r).toContain("The default is 10 seconds");
    expect(r).toContain("Illuminate\\Http\\Client\\ConnectionException");
    expect(r).toContain("By default, requests do not time out unless a timeout value is set explicitly. Without a timeout, your code may hang for minutes or more.");
    expect(r).toContain("When this is null, the OS default timeout is used. The default is null.");
    expect(r).toContain("The timeout applies only to connections initiated after the timeout is set.");
    expect(r).toContain("Request idle timeout: 150s");
    expect(r).toContain("504 Gateway Timeout will be returned");
    expect(r).toContain("Dokumentasi Django dan Serverpod untuk panggilan keluar tidak dibuka [perlu verifikasi]");
    expect(r).toContain("Returns a new AbortSignal which will be aborted in delay milliseconds.");
    expect(r).toContain("Added in: v17.3.0, v16.14.0");
    expect(r).toContain("bagian itu tidak menyebut waktu aktif (active time)");
    expect(potong[1]).toContain("Node.js: globals");
    expect(potong[1]).toContain("`AbortSignal.timeout(ms)` menghasilkan sinyal yang dibatalkan sesudah `ms` milidetik, dan dokumentasi Node.js mencatatnya sejak v17.3.0.");
    expect(potong[1]).toContain("MDN menulis bahwa sinyal itu dibatalkan dengan `TimeoutError`, dan di browser waktunya dihitung dari waktu aktif, bukan waktu berlalu. Halaman globals Node.js tidak menulis soal waktu aktif.");
    expect(potong[1]).toContain("Contoh di MDN memakai `fetch`, dan MDN tidak membahas batas waktu bawaannya.");
    expect(potong[2]).toContain("client menunggu paling lama 30 detik secara bawaan, dan `connectTimeout` bawaannya 10 detik. Bila batasnya lewat, Laravel melempar `ConnectionException`.");
    expect(potong[3]).toContain("secara bawaan permintaan tidak berhenti sendiri kecuali nilai timeout diberikan. Tanpa nilai itu, kode bisa menggantung beberapa menit atau lebih.");
    expect(potong[4]).toContain("`connectionTimeout` bawaannya `null`, yang berarti batas bawaan sistem operasi, dan nilainya hanya berlaku untuk koneksi yang dimulai sesudah nilai itu dipasang.");
    expect(potong[5]).toContain("Request idle timeout 150 detik, dengan jawaban 504 bila fungsi belum menjawab. Halaman itu tidak membahas batas waktu panggilan keluar dari fungsi ke service lain.");
  });
  test("kode Snippet inline di tab lain: tiga kode Ilustrasi persis, batas 3 detik atau 3.000 ms sama di tiga tab", () => {
    const kode = [...badan.matchAll(/<Snippet lang="(\w+)" code=\{`([\s\S]*?)`\} \/>/g)].map((m) => [m[1], m[2]]);
    expect(kode).toEqual([
      ["js", "const jawab = await fetch(urlLedger, {\n  signal: AbortSignal.timeout(3000),\n});"],
      ["php", "$jawab = Http::timeout(3)->get($urlLedger);"],
      ["python", "jawab = requests.get(url_ledger, timeout=3)"],
    ]);
    expect(badan).toContain("*Tidak dijalankan. Dicek ke [MDN: AbortSignal.timeout()]");
    expect(badan.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(3);
  });
  test("baris riset R5-170 sampai R5-174: lima baris berurutan, lima kolom, tanpa ID ganda, urutan naik (tetangga dijaga lewat rentang)", () => {
    const ids = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    expect(new Set(ids).size).toBe(ids.length);
    const pos = ["R5-170", "R5-171", "R5-172", "R5-173", "R5-174"].map((i) => ids.indexOf(i));
    expect(pos).toEqual([pos[0]!, pos[0]! + 1, pos[0]! + 2, pos[0]! + 3, pos[0]! + 4]);
    const nomorId = ids.map((x) => Number(x.slice(3)));
    expect(nomorId).toEqual([...nomorId].sort((a, b) => a - b));
    expect(nomorId[pos[0]! - 1]!).toBeLessThan(170);
    expect(nomorId[pos[4]! + 1]!).toBeGreaterThan(174);
    for (const i of ["R5-170", "R5-171", "R5-172", "R5-173", "R5-174"]) expect(pecahBaris(barisRiset(i)).length).toBe(5);
    const h = barisRiset("R5-174");
    expect(h).toContain(`${orangTotal} ÷ ${nService} = 4,667 (ditulis ${koma(perService)})`);
    expect(h).toContain(`${orangProduk} ÷ ${nService} = 3,333 (${koma(perServiceProduk)})`);
    expect(h).toContain(`${orangTotal} ÷ ${nBanyak} = 2,333 (${koma(perBanyak)})`);
    expect(h).toContain(`${nBanyak} × ${instanceService} = ${nBanyak * instanceService}; ${nService} × ${instanceService} = ${nService * instanceService}`);
    expect(h).toContain(`${koma(puncak3)} × 0,05 = 3,47 (${koma(serentak3)}); ${koma(puncak2)} × 0,05 = 2,315 (${koma(serentak2)})`);
    expect(h).toContain(`3 × ${nTransaksi} = ${ribuan(3 * nTransaksi)}; ${ribuan(3 * nTransaksi)} + ${ribuan(3 * nTransaksi)} = ${ribuan(6 * nTransaksi)} = ${pTiga} × ${nTransaksi}`);
    expect(h).toContain("6 × 0 = 0, 6 × 2 = 12, 6 × 4 = 24, 6 × 10 = 60");
    expect(h).toContain(`${anggaranMs} ÷ ${hopPer} = 8,33; ${putaran} × ${nLat} = ${putaran * nLat}; ${ribuan(byteKirim)} ÷ ${nTransaksi} = 620,14; ${keputusan[1]} + ${keputusan[2]} + ${keputusan[3]} = ${nTransaksi}; ceil(1 × 100 ÷ 50) = 2.`);
    for (const s of ["labs/t5-gabung/output/panggilan.txt", "latensi.txt", "mati.txt", "labs/t5-rollout/output/hpa.txt", "tahap-4/modular-monolith.mdx", "tahap-4/sengaja-belum.mdx", "tahap-1/sengaja-belum.mdx", "tahap-5/m44-rilis-menunggu-lima-tim.mdx", "naskah Tahap 5 (M44, ADR 50, M51)"]) expect(h, s).toContain(s);
  });
});

describe("ID registry, tautan, template blok, widget, kartu, dan istilah", () => {
  test("registry: halaman 5.13 jenis konsep, ada, prasyarat t5-m44, lab t5-gabung dan t5-rollout, ADR 50, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-service");
    expect(h.nomor).toBe("5.13");
    expect(h.jenis).toBe("konsep");
    expect(h.ada).toBe(true);
    expect(h.prasyarat).toEqual(["t5-m44"]);
    expect(h.lab).toEqual(["t5-gabung", "t5-rollout"]);
    expect(h.adr).toEqual([50]);
    expect(h.peran).toEqual(["devops", "backend"]);
    expect(h.path).toBe("tahap-5/modul-ke-service.md");
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t5-m44]]");
    expect(frontmatter).toContain(`title: "5.13 ${h.judul}"`);
    expect(naskah).toContain(`| 5.13 | 4 | ${h.judul} | Konsep + ADR | ★ | t5-gabung, t5-rollout | banding |`);
    expect(naskah).toContain("- **DevOps** 5.9, 5.12, 5.13");
    expect(hal.filter((x) => x.adr?.includes(50)).map((x) => x.id)).toEqual(["t5-service"]);
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "berikutnya" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({
      "t4-modul": 6, "t5-m44": 7, "berikutnya": 1, "t4-tim-infra": 1, "t4-adr-45": 2, "t1-adr-12": 3, "t5-prd": 4, "t5-read-replica": 1, "t5-partisi": 1,
      "t5-fanout": 3, "t5-rollout": 4, "t5-adr-60": 6, "t5-tim-infra": 4, "t5-m47": 2, "t5-mtls": 2, "t5-m51": 1, "t5-onprem": 1,
    });
    expect(dari("t5-adr-60").nomor).toBe("5.30");
    expect(dari("t5-fanout").nomor).toBe("5.15");
    expect(dari("t5-rollout").nomor).toBe("5.23");
    expect(dari("t5-mtls").nomor).toBe("5.19");
    expect(dari("t5-m47").nomor).toBe("5.18");
    expect(dari("t5-tim-infra").nomor).toBe("5.27");
    expect(dari("t5-onprem").nomor).toBe("5.28");
    expect(dari("t5-m51").nomor).toBe("5.29");
    expect(dari("t5-read-replica").nomor).toBe("5.5");
    expect(dari("t5-partisi").nomor).toBe("5.11");
  });
  test("janji lintas halaman: halaman 5.12, 5.1, 5.28, dan 5.30 menunjuk ke t5-service, dan halaman ini menunjuk balik ke yang berjanji", () => {
    expect(hal512).toContain("ADR 50 memakai ambang tiga orang per service sebagai syarat salah ([[t5-service]])");
    expect(hal512).toContain("Anggaran 50 ms dibahas di [[t5-service]]");
    expect(hal512).toContain("Pilihannya dan harganya dibahas di [[t5-service]]");
    expect(hal51).toContain("[[t5-m44]] dan [[t5-service]]");
    expect(baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx")).toContain("| 2. Kubernetes | Lima tim atau lebih perlu merilis tanpa menunggu tim lain | 3 tim | 5 tim produk: terpenuhi | [[t5-service]] |");
    expect(baca("situs/src/content/docs/tahap-5/on-prem-lawan-cloud.mdx")).toContain("Kubernetes (ADR 50, [[t5-service]])");
    expect(badan).not.toContain("Anggaran 50 ms");
    expect(badan).toContain(`ambang ${ambangOrang}`);
    expect(badan).toContain("p95 antar host belum diukur");
    expect(adr12).toContain("Tahap 5, mulai dari k3s di lab");
    expect(badan).toContain("ADR 12 menjadwalkan Kubernetes di Tahap 5, mulai dari k3s di lab ([[t1-adr-12]]).");
    expect(proposal).toContain("| 7 | Pecah service dengan DB sendiri | T5: tim dan beban berbeda | Saat biaya koordinasi melebihi manfaat (kasus Amazon) |");
    expect(proposal).toContain("API hanya dua fungsi: `Posting(entries []Entry)` dan `Saldo(akun)`");
    expect(badan).toContain("PROPOSAL menulis pemicunya sebagai tim dan beban yang berbeda, dengan batas saat biaya koordinasi melebihi manfaat.");
    expect(badan).toContain("PROPOSAL menulis antarmuka modul ledger hanya dua fungsi, `Posting` dan `Saldo`");
    expect(naskah).toContain("Kubernetes (k3s di lab, 1.37.1) menjalankan service, HPA memakai umur queue dan CPU, dan Gateway API menggantikan Ingress NGINX yang dihentikan sejak Maret 2026");
  });
  test("template konsep: lima blok dalam urutan, dua pertama terbuka; Cek diri lima soal; satu tebak details.question; noscript; SkripLama di akhir; empat tabel", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("12345");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(5);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["cerita","banding"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="banding" src="data/t5-service-banding.json" />');
    expect(badan).toContain("<Tebak client:visible data={dataTebak} />");
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    const baris = badan.split("\n");
    let tabelKe = 0;
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        tabelKe++;
        const n = pecahBaris(baris[i]!).length;
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `tabel ${tabelKe} baris ${j + 1}`).toBe(n);
      }
    }
    expect(tabelKe).toBe(4);
    const h3 = [...badan.matchAll(/^(#{2,5}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(h3).toEqual(["## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 50: enam service di Kubernetes, uang tetap di ledger", "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
  });
  test("tabel ADR 50: lima opsi A sampai E, lima baris isi, dan tabel Kapan keputusan ini salah punya lima baris dengan pemicu naskah", () => {
    const opsi = tabelDari(badan, "| | A. Modular monolith");
    expect(opsi[0]).toEqual(["", "A. Modular monolith, rilis terjadwal", "B. Dua belas service", "C. Enam service, database per service", "D. Enam service tanpa Kubernetes", "E. Enam service di Kubernetes, schema dan role per service"]);
    expect(opsi.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    for (const r of opsi.slice(2)) expect(r).toHaveLength(6);
    const salah = tabelDari(badan, "| Salah saat |");
    expect(salah[0]).toEqual(["Salah saat", "Yang diperiksa", "Angka sekarang", "Dibaca dari"]);
    expect(salah.slice(2)).toHaveLength(5);
    // lima pemicu naskah: waktu tunggu rilis, p95 50 ms antar host, data besar, selisih rekonsiliasi, kurang dari 3 orang
    const naskahSalah = adr50Kolom[3]!;
    expect(naskahSalah).toContain("Waktu tunggu rilis satu tim tidak turun");
    expect(naskahSalah).toContain("p95 lompatan HTTP ke ledger melewati 50 ms antar host");
    expect(naskahSalah).toContain("Komponen yang bertukar data besar dan sering rugi bila dipisah");
    expect(naskahSalah).toContain("Selisih lintas service tidak tertutup rekonsiliasi dalam satu hari kerja");
    expect(naskahSalah).toContain("Satu service dipegang kurang dari 3 orang");
    expect(salah.slice(2).map((r) => r[0])).toEqual([
      "Waktu tunggu rilis satu tim tidak turun sesudah pemecahan",
      "p95 satu lompatan HTTP ke ledger melewati 50 ms antar host (anggaran lompatan ADR 37)",
      "Komponen yang bertukar data besar dan sering rugi bila dipisah",
      "Selisih lintas service tidak tertutup rekonsiliasi dalam satu hari kerja",
      `Satu service dipegang kurang dari ${ambangOrang} orang (Asumsi)`,
    ]);
    const opsiNaskah = adr50Kolom[2]!;
    expect(opsiNaskah).toContain("Tetap modular monolith dengan rilis terjadwal, trunk-based, dan feature flag");
    expect(opsiNaskah).toContain("semua modul dan sub-modul jadi service");
    expect(opsiNaskah).toContain("database per service (ADR 60)");
    expect(badan).toContain("8. Pemecahan dinilai per pasangan service, bukan sekaligus.");
    expect([...badan.matchAll(/^(\d)\. /gm)].map((m) => m[1]).join("")).toBe("12312345678123");
  });
  test("urutan: jawaban Tebak tidak tertulis di atas widget, dan definisi label ada di blok Coba sebelum pemakaian pertama di blok Paham", () => {
    const sebelumTebak = badan.slice(0, badan.indexOf("<Tebak")).split("\n").filter((b) => !b.startsWith("<Blok")).join("\n");
    expect(sebelumTebak).not.toContain(`${lewat[4]} dari ${lewat[5]}`);
    expect(sebelumTebak).not.toContain(`${lewat[2]} ms`);
    expect(sebelumTebak).not.toMatch(/6 × 10/);
    expect(sebelumTebak).not.toContain("batas bawah");
    expect(sebelumTebak).not.toContain("penjumlahan jeda");
    expect(badan.slice(0, badan.indexOf('<Blok nama="Paham">'))).toContain("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini.");
    expect(badan.indexOf("Hitungan adalah")).toBeLessThan(badan.indexOf("(Hitungan"));
    expect(badan.indexOf("Penalaran adalah")).toBeLessThan(badan.indexOf("(Penalaran"));
    expect(badan.indexOf("Asumsi adalah")).toBeLessThan(badan.indexOf("(Asumsi"));
    expect(badan.indexOf("Rekaman lab ([Label sumber](/cara-pakai/#label-sumber))")).toBeLessThan(badan.indexOf("Rekaman lab", badan.indexOf("Rekaman lab") + 12));
    // tak ada ajakan di Inti yang menjawab pertanyaan Tebak: Inti tidak memuat jeda, batas uji, dan 500
    const inti = badan.slice(badan.indexOf("## Inti"), badan.indexOf("<details"));
    expect(inti).not.toMatch(/jeda|batas uji|\b500\b|\b60 ms\b/);
    expect(inti).toContain("Enam service membuat tiap tim merilis sendiri, tetapi satu alur menjadi enam panggilan jaringan.");
    expect(inti.split("\n").find((x) => x.startsWith("Enam service membuat"))!.length).toBeLessThanOrEqual(110);
  });
  test("widget Tebak: skema Zod, pilihan benar di posisi pertama dan bukan yang terpanjang, angka sama dengan rekaman, kalimat dari latensi.txt dan broker.go", () => {
    const t = DataTebak.parse(tebakMentah);
    expect(t.id).toBe("t5-service-tebak");
    expect(t.sumber.jenis).toBe("rekaman");
    expect(t.pilihan).toHaveLength(4);
    expect(t.pilihan.findIndex((p) => p.benar)).toBe(0);
    const panjang = t.pilihan.map((p) => p.teks.length);
    expect(panjang.indexOf(Math.max(...panjang))).not.toBe(0);
    expect(t.adegan[0]).toContain(`Satu transaksi melewati ${pTiga} panggilan berurutan, dan tiap panggilan diberi jeda buatan ${jedaTebak} ms.`);
    expect(t.adegan[1]).toBe(`Batas uji untuk satu transaksi adalah ${anggaranMs} ms. Lab menjalankan ${lewat[5]} transaksi tiga proses dan menghitung berapa yang melewati batas itu.`);
    expect(t.pertanyaan).toBe(`Berapa dari ${lewat[5]} transaksi itu yang melewati ${anggaranMs} ms?`);
    expect(t.pilihan[0]!.teks).toBe(`Semuanya, ${lewat[4]} dari ${lewat[5]}, karena enam jeda berurutan saja sudah ${lewat[2]} ms.`);
    expect(t.pilihan[0]!.alasan).toContain(`${hopPer} × ${jedaTebak} = ${hopPer * jedaTebak} ms, di atas ${anggaranMs} ms, jadi ${lewat[4]} dari ${lewat[5]} transaksi melewati batas.`);
    expect(t.pilihan[2]!.teks).toContain(`Sekitar ${(nLat * putaran) / 20} dari ${nLat * putaran}, yaitu 5% transaksi paling lambat`);
    expect(t.pilihan[2]!.alasan).toContain(`Batas bawah ${hopPer * jedaTebak} ms berlaku untuk tiap transaksi`);
    expect(t.pilihan[3]!.teks).toBe(`Separuhnya, karena hanya tiga dari enam panggilan yang dijeda.`);
    expect(t.pilihan[3]!.alasan).toBe("Broker menjeda panggilan kirim dan panggilan ambil dengan jeda yang sama. Keenam panggilan membawa jeda 10 ms.");
    expect(brokerGo.split("\n").filter((x) => /b\.jeda\(\)\s+\/\//.test(x))).toHaveLength(2);
    expect(t.pilihan[1]!.alasan).toContain("time.Sleep tidak pernah kembali sebelum durasinya lewat");
    expect(t.penutup).toContain(`batas bawah ${hopPer * jedaTebak} ms per transaksi, di atas batas uji ${anggaranMs} ms`);
    expect(t.label.sumber).toBe("Rekaman lab · latensi.txt");
    expect(JSON.stringify(t)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).toContain("Tebak dulu berapa transaksi yang melewati batas uji pada jeda 10 ms.");
  });
  test("data banding: valid menurut banding.js, dua opsi, enam fitur, simpul bersama, nada warn hanya di tempat yang berubah, angka dari rekaman", () => {
    expect(bandingCjs.cekData(banding)).toEqual([]);
    expect(banding.judul).toBe("Modular monolith lawan enam service: yang berubah dan yang tidak");
    expect(banding.opsi.map((o) => [o.id, o.nama])).toEqual([["mono", "A · Modular monolith (ADR 37)"], ["svc", "B · Enam service (ADR 50)"]]);
    expect(banding.fitur.map((f) => f.label)).toEqual(["Tim Akun merilis perbaikan", "Alur skor risiko", "Satu proses mati", "Batas data", "Uang bergerak", "Jumlah pod"]);
    const id = (o: string): string[] => banding.opsi.find((x) => x.id === o)!.baris.flat().map((s) => s.id);
    expect(id("mono")).toEqual(["tim", "rilis", "proses", "hop", "data", "ledger"]);
    expect(id("svc")).toEqual(["tim", "rilis", "proses", "hop", "k8s", "data", "ledger"]);
    expect(banding.opsi.map((o) => o.baris.map((b) => b.length))).toEqual([[2, 2, 2], [2, 3, 2]]);
    const f = (l: string) => banding.fitur.find((x) => x.label === l)!;
    expect(f("Tim Akun merilis perbaikan").catatan.mono).toContain(`tunggu ${queueJam} jam, dirilis Jumat (Ilustrasi, cerita M44)`);
    expect(f("Alur skor risiko").catatan.mono).toContain(`${pSatu} panggilan antar proses per transaksi (panggilan.txt bagian ${hurufB})`);
    expect(f("Alur skor risiko").catatan.svc).toContain(`${pTiga} panggilan antar proses per transaksi, dan skor sama di ${samaP[1]} dari ${samaP[2]} transaksi (panggilan.txt bagian ${hurufB} dan ${hurufC})`);
    expect(f("Alur skor risiko").catatan.svc).toContain("Lab memakai tiga proses dan satu broker, bukan enam service.");
    expect(f("Satu proses mati").catatan.mono).toContain(`satu proses tetap menjawab ${satuProses[1]}`);
    expect(f("Satu proses mati").catatan.svc).toContain(`tiga proses menjawab ${m504[1]} sesudah batas tunggu ${m504[2]} detik, dan ${kata(pesanTertinggal)} pesan tertinggal di queue sampai proses itu hidup lagi (mati.txt bagian ${hurufMatiB} dan ${hurufMatiC})`);
    const fkSebelum = Number(cari(/SEBELUM dihapus, dibaca dari katalog PostgreSQL: (\d+)/, skema, "fk sebelum")[1]);
    const barisSkema = skema.split("\n");
    const fkSesudah = Number(barisSkema[barisSkema.findIndex((b) => /^ fk_lintas_schema$/.test(b)) + 2]!.trim());
    const hurufFk = bagianDi(barisSkema, barisSkema.findIndex((b) => /^ fk_lintas_schema$/.test(b)) + 1);
    expect([fkSebelum, fkSesudah, hurufFk]).toEqual([18, 0, "E"]);
    expect(f("Batas data").catatan.svc).toContain(`Foreign key lintas schema turun dari ${fkSebelum} ke ${fkSesudah} di lab api-t5, yang memecah data tetapi tidak memecah proses (skema.txt bagian ${hurufFk}).`);
    expect(f("Batas data").catatan.mono).toBe("Schema dan role per modul sudah ada sejak ADR 37, walau proses monolith memakai satu role.");
    expect(f("Jumlah pod").catatan.svc).toContain(`jumlah pod naik di atas ${hpaAwal[1]} dan tidak melewati maksimal ${hpaAwal[3]} (hpa.txt bagian ${hurufHpa}). Jumlah tepat tidak direkam.`);
    expect(f("Uang bergerak").catatan.svc).toContain("(ADR 12 dan ADR 37; Tidak dijalankan)");
    expect(f("Uang bergerak").catatan.mono).toContain("(ADR 12; Tidak dijalankan di lab Tahap 5)");
    const warn = banding.fitur.map((x) => [x.label, x.nada ?? {}] as const).filter(([, n]) => Object.keys(n).length > 0);
    expect(warn).toEqual([["Tim Akun merilis perbaikan", { mono: "warn" }], ["Alur skor risiko", { svc: "warn" }], ["Satu proses mati", { svc: "warn" }], ["Uang bergerak", { svc: "warn" }]]);
    expect(JSON.stringify(banding)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}/);
    expect(badan).toContain("**Ubah satu hal:** pindah dari Tim Akun merilis perbaikan ke Batas data.");
    expect(banding.fitur[0]!.label).toBe("Tim Akun merilis perbaikan");
    expect(banding.fitur[3]!.label).toBe("Batas data");
  });
  test("noscript sama dengan kalimat yang dibangun dari nilai turunan", () => {
    const ns = cari(/<noscript>\n([\s\S]*?)<\/noscript>/, badan, "noscript")[1]!;
    expect(ns).toBe(
      `<p>Tanpa JavaScript tombol tebakan tidak berfungsi dan widget perbandingan tidak tampil. Jawaban yang tepat: ${lewat[4]} dari ${lewat[5]} transaksi melewati ${anggaranMs} ms, karena enam jeda ${jedaTebak} ms berurutan memberi batas bawah ${lewat[2]} ms (latensi.txt bagian ${hurufLatB}).</p>\n` +
        `<p>Di kedua susunan ledger tetap satu-satunya tempat uang bergerak, dan schema serta role sama. Susunan B melakukan ${pTiga} panggilan antar proses per transaksi, lawan ${pSatu} di susunan A (panggilan.txt bagian ${hurufB}).</p>\n`,
    );
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber rekaman, label dan teks simpul persis dengan angka dari rekaman dan naskah", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-service-inti");
    expect(d.judul).toBe("Harga satu pemecahan");
    expect(d.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab (harga)" });
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => [b.label, b.sub])).toEqual([["Pilihan ADR 50", "dari M44"], ["Harga", `lab t5-gabung, ${nTransaksi} transaksi`]]);
    expect(d.baris.map((b) => b.simpul.map((s) => [s.teks, s.sub, s.nada]))).toEqual([
      [[`${timProduk.length} tim, 1 rilis`, "pemicunya jadwal rilis", "warn"], [`${nService} service`, "di Kubernetes, pipeline per service", "system"], ["Ledger tetap", "uang bergerak di satu tempat", "good"]],
      [[`${pSatu} panggilan`, "satu proses, per transaksi", "good"], [`${pTiga} panggilan`, "tiga proses + queue: 3 kirim dan 3 ambil", "warn"], ["Skor sama", `${samaP[1]} dari ${samaP[2]} transaksi`, "good"]],
    ]);
    expect(d.catatan).toBe("Biru: pilihan ADR 50. Oranye: pemicu dan harga. Hijau: dasar pembanding dan yang tidak berubah.");
    expect(JSON.stringify(rantaiMentah)).not.toMatch(/naskah/i);
    expect(d.baris[0]!.simpul[0]!.teks.length).toBeLessThanOrEqual(16);
    expect(d.baris.flatMap((b) => b.simpul).every((s) => s.teks.length <= 16)).toBe(true);
  });
  test("kartu Cek diri: lima kartu t5-service, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-service");
    expect(k.map((x) => x.id)).toEqual(["t5-service-1", "t5-service-2", "t5-service-3", "t5-service-4", "t5-service-5"]);
    const soal = [...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!);
    const jawab = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(soal).toHaveLength(5);
    expect(jawab).toHaveLength(5);
    k.forEach((x, i) => {
      expect(x.tanya).toBe(soal[i]);
      const potongan = jawab[i]!.split(/\[\[[^\]]+\]\]/);
      let dari0 = 0;
      for (const p of potongan) { const j = x.jawab.indexOf(p, dari0); expect(j, `potongan jawaban: ${p}`).toBeGreaterThanOrEqual(0); dari0 = j + p.length; }
      expect(x.judul).toBe(`5.13 ${dari("t5-service").judul}`);
      expect(x.url).toBe(dari("t5-service").path!.replace(/\.md$/, "/"));
    });
    expect(jawab[0]).toContain(`Tiap proses mencatat ${nTransaksi} kirim dan ${nTransaksi} ambil, jadi 3 × ${nTransaksi} = ${ribuan(3 * nTransaksi)} kirim dan ${ribuan(3 * nTransaksi)} ambil, atau ${ribuan(6 * nTransaksi)} = ${pTiga} × ${nTransaksi}.`);
    expect(jawab[1]).toContain(`Batas bawah tiap transaksi ${hopPer} × ${jedaTebak} = ${hopPer * jedaTebak} ms, di atas ${anggaranMs} ms`);
    expect(jawab[2]).toContain(`Tiga proses menjawab ${m504[1]} sesudah menunggu paling sedikit ${m504[2]} detik, dan satu pesan tertinggal di queue sampai riwayat hidup lagi. Satu proses tetap menjawab ${satuProses[1]}.`);
    expect(jawab[3]).toContain(`Lab t5-gabung hanya mengirim ${byteTransaksi[1]} byte per transaksi tiap arah`);
    expect(jawab[4]).toContain("ceil(1 × 100 ÷ 50) = 2 pod");
  });
  test("istilah baru: Kubernetes, HPA, dan Gateway API ada di glosarium, punya halaman istilah, dan sumber R5-170 dan R5-172 sama dengan baris riset", () => {
    const semua = (glosarium as { t: string; b: string; h: string | null }[]);
    for (const [t, slug] of [["Kubernetes", "kubernetes"], ["HPA (Horizontal Pod Autoscaler)", "hpa"], ["Gateway API", "gateway-api"]] as const) {
      const g = semua.find((x) => x.t === t);
      expect(g, t).toBeTruthy();
      expect(g!.b).toBe("t5-service");
      expect(g!.h).toBe(`/istilah/${slug}/`);
      expect(istilahBerkas[slug]!.istilah).toBe(t);
      expect(istilahBerkas[slug]!.cerita.map((c) => c.rujukan)).toEqual(["t5-service"]);
      expect(istilahBerkas[slug]!.stack).toBeNull();
      for (const s of istilahBerkas[slug]!.sumber) {
        expect(["R5-170", "R5-172"]).toContain(s.riset);
        expect(barisRiset(s.riset)).toContain(s.url.replace("https://", "").replace(/\/$/, ""));
        expect(s.judul).toContain("dibuka 2026-11-03");
      }
      const semuaIstilah = semua.map((x) => x.t);
      for (const r of istilahBerkas[slug]!.terkait) expect(semuaIstilah, r).toContain(r);
    }
    expect(glosMdx).toContain("| **Gateway API** | Keluarga jenis API Kubernetes untuk mengatur routing lalu lintas ke service, penerus Ingress API. | [[t5-service]] |");
    expect(glosMdx).toContain("| **HPA** (Horizontal Pod Autoscaler) | Pengendali Kubernetes yang menambah atau mengurangi jumlah pod mengikuti metrik, misalnya CPU. | [[t5-service]] |");
    expect(glosMdx).toContain("| **Kubernetes** | Sistem yang menjadwalkan pod, yaitu grup container, ke banyak mesin dalam satu cluster. | [[t5-service]] |");
    expect(istilahBerkas.kubernetes!.cerita[0]!.teks).toContain(`k3s ${k3sVersi} di dalam k3d ${k3dVersi}`);
    expect(istilahBerkas["gateway-api"]!.cerita[0]!.teks).toContain(`Gateway Traefik ${traefikVersi} dengan Gateway API ${gatewayVersi}`);
    expect(istilahBerkas.hpa!.mekanisme[3]).toContain("ceil(1 × 100 ÷ 50) = 2 pod");
    expect(istilahBerkas.hpa!.mekanisme[1]).toBe(`Kontrolnya berjalan tiap ${kontrolHpa} detik secara bawaan.`);
    expect(istilahBerkas["gateway-api"]!.jebakan[0]).toContain("Ingress NGINX adalah controller untuk Ingress API, sedangkan Gateway API adalah penerus Ingress API itu sendiri.");
  });
  test("satu kata per konsep dan batas kata: tanpa layanan, replika, rahasia, pelanggan, antrean; service lebih dari 20 kali; pod bukan replika", () => {
    const tampil = `${badan.replaceAll("labs/t5-gabung/layanan/layanan.go", "")}\n${JSON.stringify(tebakMentah)}\n${JSON.stringify(rantaiMentah)}\n${JSON.stringify(banding)}\n${JSON.stringify(istilahBerkas)}`.toLowerCase();
    for (const k of ["layanan", "replika", "rahasia", "antrean", "antrian", "pelanggan", "pembeli"]) expect(tampil, k).not.toContain(k);
    expect(badan.match(/\bservice\b/g)!.length).toBeGreaterThan(20);
    expect(badan.match(/\bpod\b/g)!.length).toBeGreaterThan(10);
    expect(badan).not.toMatch(/\breplica\b.*\bpod\b/);
    expect(badan).toContain("Alurnya membaca data akun, data perangkat, dan riwayat transaksi");
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, tebak, banding, kartu, dan halaman istilah", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah), JSON.stringify(banding), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-service")), JSON.stringify(Object.values(istilahBerkas).map((i) => ({ ...i, sumber: i.sumber.map((s) => ({ ...s, riset: "" })) })))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
    expect(tampil).not.toMatch(/\bB\d{3}\b|\bC\d{3}\b/);
  });
  test("label: 'Rekaman lab' hanya untuk rekaman dan README lab; tak satu hitungan waktu CI atau jam berlabel Rekaman lab; Tidak dijalankan untuk p95 antar host", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect((badan.match(/Rekaman lab/g) ?? []).length).toBe(9);
    expect(barisRekaman.filter((b) => b.startsWith("<Snippet") && b.includes('title="Rekaman lab: labs/'))).toHaveLength(5);
    expect(barisRekaman.filter((b) => b.includes("Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `panggilan.txt`"))).toHaveLength(1);
    expect(barisRekaman.filter((b) => b.includes("bila berasal dari Rekaman lab."))).toHaveLength(1);
    expect(barisRekaman.filter((b) => b.includes("| Rekaman lab `t5-gabung` dan `t5-rollout`, dan hitungan di halaman ini |"))).toHaveLength(1);
    expect(barisRekaman.filter((b) => b.includes("6 panggilan (Rekaman lab). Prime Video"))).toHaveLength(1);
    expect(badan).not.toMatch(/\d+ (menit|jam)[^.\n]*\(Rekaman lab\)/);
    expect(badan).toContain("Belum diukur antar host (Tidak dijalankan).");
    expect(badan).toContain("Pengukuran itu belum dikerjakan (Tidak dijalankan).");
    expect((badan.match(/Tidak dijalankan/g) ?? []).length).toBe(TIDAK_DIJALANKAN);
    expect((badan.match(/\[perlu verifikasi\]/g) ?? []).length).toBe(4);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "naik", "turun", "di atas", "di bawah", "tepat", "ambang", "syarat", "pemicu", "batas", "bawah", "ditolak", "dijalankan", "direkam", "diukur", "ledger", "akun", "proses", "service", "pod", "queue", "broker", "kirim", "ambil", "jeda", "panggilan", "transaksi", "instance", "pipeline", "tim", "rilis", "orang", "host", "cluster"];
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
const kartuIni = kartuSemua.filter((x) => x.halaman === "t5-service");
function angka(): string { return prosa.flatMap((b) => angkaDari(b)).join(" "); }
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-03/g) ?? []).length, tanggal: (halaman.match(/2026-\d\d-\d\d/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), tebak: sidikKata(nilaiString(tebakMentah).join("\n"), KATA), banding: sidikKata(nilaiString(banding).join("\n"), KATA),
  struktur: struktur.join(" "), angka: angka(),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-170", "R5-171", "R5-172", "R5-173", "R5-174"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), banding: h16(JSON.stringify(banding)), kartu: h16(JSON.stringify(kartuIni)), istilah: h16(JSON.stringify(istilahBerkas)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah), banding: tekstual(banding), kartu: tekstual(kartuIni), istilah: tekstual(istilahBerkas) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat modul-ke-service.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "modul-ke-service.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, tebak, banding, kartu, dan halaman istilah terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, tebak, banding, kartu, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, tebak, dan banding", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.tebak).toEqual(SIDIK.tebak);
    expect(sidikSekarang.banding).toEqual(SIDIK.banding);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});

describe("celah mutasi tanpa kunci yang ditutup peninjau (keputusan 1551): kalimat naratif diturunkan dari sumbernya", () => {
  test("Prime Video: orkestrator, penulis, detector, dan skala vertikal dari baris R5-171", () => {
    const r = barisRiset("R5-171");
    expect(r).toContain("orchestrated by AWS Step Functions");
    expect(badan).toContain("diorkestrasi AWS Step Functions");
    expect(badan).not.toMatch(/diorkestrasi AWS Lambda/);
    expect(r).toContain("Marcin Kolny (Senior SDE, Prime Video)");
    expect(r).toContain("Defect detectors execute algorithms that analyze frames and audio buffers in real-time looking for defects");
    expect(badan).toContain("Detector adalah algoritma yang mencari cacat pada frame dan audio. Sesudah pemindahan, penambahan detector hanya bisa diskalakan vertikal");
    expect(r).toContain("the number of detectors only scale vertically");
    expect(badan).toContain("hanya bisa diskalakan vertikal di dalam satu instance");
    expect(badan).not.toMatch(/diskalakan horizontal/);
  });
  test("foreign key lintas schema: sebelum dan sesudah dibaca dari skema.txt, bukan dari angka Tahap 4", () => {
    const sebelum = Number(cari(/SEBELUM dihapus, dibaca dari katalog PostgreSQL: (\d+)/, skema, "fk sebelum")[1]);
    const sesudah = Number(cari(/fk_lintas_schema\n-+\n (\d+)\n/, skema, "fk sesudah")[1]);
    expect(badan).toContain(`menghitung ${sebelum} foreign key lintas schema sebelum dihapus dan ${sesudah} sesudahnya`);
    expect(sebelum).not.toBe(21);
  });
  test("syarat ADR 37, ADR 44, dan butir 1 dan 2 ADR 45: nomor dari baris M44 naskah dan judul halaman ADR", () => {
    const n37 = Number(cari(/ADR (\d+) menulis keputusannya salah/, barisM44, "ADR modular monolith")[1]);
    const n44 = Number(cari(/ADR (\d+) menulis pipeline lebih dari/, barisM44, "ADR pipeline")[1]);
    const butir = cari(/ADR (\d+) butir (\d+) dan (\d+) terpenuhi/, barisM44, "butir ADR 45");
    const cocok = [...badan.matchAll(/Syarat (?:di )?ADR (\d+), ADR (\d+), (?:serta|dan) butir (\d+) dan (\d+) ADR (\d+) terpenuhi/g)].map((m) => m.slice(1).map(Number));
    expect(cocok).toHaveLength(2);
    for (const c of cocok) expect(c).toEqual([n37, n44, Number(butir[2]), Number(butir[3]), Number(butir[1])]);
    expect(badan).toContain(`mengerjakan butir ${butir[2]} dan ${butir[3]} ADR ${butir[1]} ([[t4-adr-45]])`);
    expect(dari("t4-modul").judul).toContain(`ADR ${n37}`);
    expect(dari("t4-tim-infra").judul).toContain(`ADR ${n44}`);
    expect(dari("t4-adr-45").judul).toContain(`ADR ${butir[1]}`);
  });
  test("ADR 50: HTTP dan OpenAPI bukan gRPC, ledger satu-satunya tempat uang bergerak, dan opsi terpilih sama dengan keputusan naskah", () => {
    expect(barisM44).toContain("HTTP dan OpenAPI, bukan gRPC");
    expect(adr50).toContain("pindah ke HTTP dan OpenAPI");
    expect(badan).toContain("Panggilan antar service memakai HTTP dan OpenAPI, bukan gRPC.");
    expect(badan).not.toMatch(/memakai gRPC, bukan HTTP/);
    expect(adr50).toContain("Ledger tetap satu-satunya tempat uang bergerak");
    expect(badan).not.toMatch(/Ledger bukan satu-satunya|ledger bukan satu-satunya/);
    expect((badan.match(/Ledger tetap satu-satunya tempat uang bergerak\./g) ?? []).length).toBe(2);
    const pilih = cari(/\*\*Keputusan: opsi ([A-E])\.\*\*/, badan, "opsi terpilih")[1]!;
    const kolom = pecahBaris(badan.split("\n").find((b) => b.startsWith("| | A. "))!);
    const header = kolom.find((c) => c.startsWith(`${pilih}.`))!;
    expect(header).toContain("Kubernetes");
    expect(header).toContain("schema dan role per service");
    expect(header).not.toContain("tanpa Kubernetes");
    expect(adr50Kolom[1]).toContain("Kubernetes");
    expect(adr50Kolom[1]).toContain("schema dan role per service");
    expect(badan.match(/\*\*Keputusan: opsi/g)).toHaveLength(1);
  });
  test("pemicu rilis: M44 menulis jadwal rilis, bukan ukuran, dan halaman tidak membaliknya menjadi beban", () => {
    expect(barisM44).toContain("Pemicunya jadwal rilis, bukan ukuran");
    expect(badan).toContain("Pemicunya jadwal rilis, bukan beban.");
    expect(badan).not.toMatch(/Pemicunya beban/);
    expect(badan).toContain("Bebannya bukan alasan memecah");
  });
  test("tab Go dijalankan, lima tab lain tidak, dan ringkasan pembuka menyebut jumlah pertanyaan yang sama dengan daftarnya", () => {
    expect(badan).toContain("Tab Go dijalankan di lab. Tab lain tidak dijalankan");
    expect(badan).not.toMatch(/Tab Go tidak dijalankan/);
    expect(badan.match(/\*Dijalankan:/g)).toHaveLength(1);
    const buka = badan.slice(badan.indexOf('<details class="question">'), badan.indexOf("</details>"));
    const nPertanyaan = (buka.match(/^\d+\. /gm) ?? []).length;
    expect(buka).toContain(`<summary>Sudah tahu? Cek ${nPertanyaan} pertanyaan</summary>`);
    expect(nPertanyaan).toBe(3);
  });
  test("frontmatter description dan ringkasan aman blok Coba memakai panggilan dan batas bawah dari rekaman", () => {
    expect(frontmatter).toContain(`${pTiga} panggilan jaringan per transaksi alih-alih ${pSatu}`);
    const aman = cari(/<Blok nama="Coba" buka aman="([^"]+)">/, badan, "aman Coba")[1]!;
    expect(aman).toContain(`memecah proses menambah ${pTiga} panggilan per transaksi di lab dan batas bawah ${lewat[2]} ms pada jeda ${lewat[1]} ms`);
  });
  test("halaman istilah: ambang HPA dari baris R5-172, Maret 2026 dari R5-170, dan k3s sesuai penuh dari R5-172", () => {
    const r172 = barisRiset("R5-172");
    const tol = cari(/tolerance, (\d\.\d) by default/, r172, "toleransi HPA")[1]!.replace(".", ",");
    const detik = cari(/the default interval is (\d+) seconds/, r172, "interval HPA")[1]!;
    const hpa = istilahBerkas["hpa"]!;
    expect(hpa.mekanisme.join("\n")).toContain(`dalam toleransi ${tol} secara bawaan`);
    expect(hpa.mekanisme.join("\n")).toContain(`tiap ${detik} detik secara bawaan`);
    expect(hpa.jebakan.join("\n")).toContain(`interval bawaan ${detik} detik`);
    expect(barisRiset("R5-170")).toContain("until March 2026");
    expect(JSON.stringify(istilahBerkas["gateway-api"])).toContain("dihentikan pada Maret 2026");
    expect(JSON.stringify(istilahBerkas["gateway-api"])).not.toMatch(/(Januari|Februari|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) 2026/);
    expect(r172).toContain("K3s is a fully compliant Kubernetes distribution");
    expect(JSON.stringify(istilahBerkas["kubernetes"])).toContain("sepenuhnya sesuai");
    expect(JSON.stringify(istilahBerkas["kubernetes"])).not.toMatch(/sebagian sesuai/);
  });
  test("baris riset R5-170 sampai R5-173: semua tanggal buka sama, dan nama penulis dan jabatan tidak diganti", () => {
    for (const id of ["R5-170", "R5-171", "R5-172", "R5-173"]) {
      const tgl = [...barisRiset(id).matchAll(/dibuka (\d{4}-\d\d-\d\d)/g)].map((m) => m[1]);
      expect(tgl.length, id).toBeGreaterThan(0);
      expect(new Set(tgl), id).toEqual(new Set(["2026-11-03"]));
    }
    expect([...barisRiset("R5-173").matchAll(/dibuka 2026-11-03/g)]).toHaveLength(6);
    expect(barisRiset("R5-170")).toContain("Tabitha Sable (Kubernetes SRC)");
  });
});
