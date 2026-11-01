// Penjaga halaman 5.12 (keputusan 1544 sampai 1546): angka, hitungan, ID, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak",
// diagram Rantai t5-m44-lima-tim-satu-rilis.json, skenario alur t5-m44.json, kartu Cek diri, dan baris riset di m44-rilis-menunggu-lima-tim.mdx.
// Nilai diturunkan dari naskah Tahap 5 (baris M44, ADR 50, tabel tim), rekaman labs/api-t5/output/skema.txt, README api-t5, halaman ADR 12, 37, 44,
// dan 45, halaman 5.1, registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa
// terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di m44-rilis-menunggu-lima-tim.halaman.nilai.ts. Lapis 2 bisa dimatikan
// (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah:
// PERBARUI_KUNCI=1 vitest run src/lib/m44-rilis-menunggu-lima-tim.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya punya satu rekaman (skema.txt bagian E dan F, batas data); pipeline per
// service, rilis sendiri, waktu pipeline, merge queue, dan putusnya transaction tidak direkam, jadi tak satu pun angka waktu berlabel Rekaman lab.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m44-lima-tim-satu-rilis.json";
import registry from "../../data/cerita.json";
import glosarium from "../../data/glosarium.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m44-rilis-menunggu-lima-tim.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-5/m44-rilis-menunggu-lima-tim.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenarioBerkas = "situs/lama/widgets/data/skenario/t5-m44.json";
const skenario = JSON.parse(baca(skenarioBerkas)) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const skema = baca("labs/api-t5/output/skema.txt");
const skemaBaris = skema.split("\n");
const readmeT5 = baca("labs/api-t5/README.md");
const adr37 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const adr44 = baca("situs/src/content/docs/tahap-4/tim-infra.mdx");
const adr45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const adr12 = baca("situs/src/content/docs/tahap-1/sengaja-belum.mdx");
const hal412 = baca("situs/src/content/docs/tahap-4/m32-rilis-kamis.mdx");
const hal51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const istilah = JSON.parse(baca("situs/data/halaman-istilah/merge-queue.json")) as { istilah: string; cerita: { rujukan: string; teks: string }[]; sumber: { riset: string; url: string }[]; terkait: string[] };
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
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
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
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
const KATA_BILANGAN: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 11: "sebelas", 18: "delapan belas" };
const kata = (n: number): string => {
  const k = KATA_BILANGAN[n];
  if (!k) throw new Error(`kata bilangan untuk ${n} belum ada`);
  return k;
};
const huruf1 = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

// --- sumber angka: naskah, halaman ADR, rekaman
const barisM44 = naskah.split("\n").find((b) => b.startsWith("| M44 |")) ?? "";
const kolomM44 = pecahBaris(barisM44);
const gejalaM44 = kolomM44[2]!;
const dikiraM44 = kolomM44[3]!;
const sebenarnyaM44 = kolomM44[4]!;
const adrM44 = kolomM44[6]!;
const mingguM44 = Number(kolomM44[1]);
const pipeMenit = Number(cari(/Pipeline (\d+) menit dan merge queue (\d+) jam/, gejalaM44, "pipeline")[1]);
const queueJam = Number(cari(/Pipeline (\d+) menit dan merge queue (\d+) jam/, gejalaM44, "queue")[2]);
const jamMulai = cari(/Kamis (\d+\.\d+) lima tim/, gejalaM44, "jam")[1]!;
const ambang = Number(cari(/pipeline lebih dari (\d+) menit/, adr44, "ambang ADR 44")[1]);
const selisihMenit = pipeMenit - ambang;
const orangTotal = Number(cari(/Totalnya 4 × 6 \+ 2 × 2 = (\d+) orang/, naskah, "total tim")[1]);
const daftarService = cari(/enam service \(([^)]+)\)/, adrM44, "daftar service")[1]!.split(", ");
const nService = daftarService.length;
const timProduk = cari(/lima tim produk \(([^)]+)\)/, hal51, "tim produk 5.1")[1]!.split(", ");
const tabelTim = naskah.slice(naskah.indexOf("| Tim | Orang | Pemimpin | Memegang |"), naskah.indexOf("Totalnya 4 × 6"));
const orangTim = (nama: string): number => Number(cari(new RegExp(`^\\| ${nama} \\| (\\d+) \\|`, "m"), tabelTim, `tim ${nama}`)[1]);
const orangProduk = timProduk.reduce((a, n) => a + orangTim(n), 0);
const perService = orangTotal / nService;
const perServiceProduk = orangProduk / nService;
const dev4 = Number(cari(/Dari (\d+) developer dan 6,94/, adr37, "developer ADR 37")[1]);
const orang4 = Number(cari(/(\d+) orang dalam tiga tim/, adr45, "orang Tahap 4")[1]);
const per4 = cari(/(\d+) ÷ (\d+) = (\d,\d) orang per service/, adr45, "13 ÷ 6");
const ambangOrang = Number(cari(/Satu service dipegang kurang dari (\d+) orang/, naskah.split("\n").find((b) => b.startsWith("| 50 |")) ?? "", "ambang ADR 50")[1]);
const ambangTim = ["", "satu", "dua", "tiga", "empat", "lima"].indexOf(cari(/Kubernetes: (\w+) tim atau lebih perlu merilis/, adr45, "ambang tim")[1]!);

// --- skema.txt
const nomorBaris = (pola: RegExp, dari0 = 0): number => {
  const i = skemaBaris.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`skema.txt: ${pola} tidak ditemukan`);
  return i + 1;
};
const bFkAwal = nomorBaris(/^# foreign key lintas schema service SEBELUM dihapus/);
const bFkAkhir = nomorBaris(/^# Tahap 4 menghitung \d+ foreign key lintas modul/, bFkAwal);
const fk = skemaBaris.slice(bFkAwal, bFkAkhir - 1).map((b) => b.match(/^\s+(\w+)\.(\w+) -> (\w+)\.(\w+)$/)).filter((m): m is RegExpMatchArray => m !== null).map((m) => ({ dari: m[1]!, tabel: m[2]!, ke: m[3]!, tujuan: m[4]! }));
const fkKe = (s: string): number => fk.filter((f) => f.ke === s).length;
const fkTertulis = Number(cari(/SEBELUM dihapus, dibaca dari katalog PostgreSQL: (\d+)/, skema, "jumlah fk")[1]);
const bFkNol = nomorBaris(/^ fk_lintas_schema$/);
const fkSesudah = Number(skemaBaris[bFkNol + 1]!.trim());
const bFkDalam = nomorBaris(/^ fk_di_dalam_schema$/);
const fkDalam = Number(skemaBaris[bFkDalam + 1]!.trim());
const fk21 = Number(cari(/Tahap 4 menghitung (\d+) foreign key lintas modul/, skema, "21")[1]);
const bTabel = nomorBaris(/^ schema +\| tabel \| daftar/);
const tabelPerSchema: Record<string, number> = {};
for (const b of skemaBaris.slice(bTabel + 1, bTabel + 7)) { const m = b.match(/^ t5_(\w+) +\| (\d+) +\|/); if (m) tabelPerSchema[m[1]!] = Number(m[2]); }
const urutanTabel = daftarService.map((s) => tabelPerSchema[s]!);
const jumlahTabel = Number(cari(/^ (\d+)$/m, skemaBaris.slice(10, 15).join("\n"), "jumlah tabel")[1]);
const bagianDi = (n: number): string => {
  for (let i = n - 1; i >= 0; i--) { const m = skemaBaris[i]!.match(/^# --- ([A-G])\./); if (m) return m[1]!; }
  throw new Error(`skema.txt: bagian untuk baris ${n} tidak ditemukan`);
};
const versi = {
  pg: cari(/PostgreSQL (\d+\.\d+)/, skemaBaris[1]!, "PostgreSQL")[1]!,
  go: cari(/go(\d+\.\d+\.\d+)/, skemaBaris[1]!, "go")[1]!,
  pgx: cari(/pgx (v\d+\.\d+\.\d+)/, skemaBaris[1]!, "pgx")[1]!,
};

describe("angka cerita dan hitungan: diturunkan dari naskah, halaman ADR, dan registry", () => {
  test("gejala: minggu, jam, 14 menit, 6 jam, dan lima tim dari baris M44 naskah; semuanya berlabel Ilustrasi", () => {
    expect(mingguM44).toBe(6);
    expect(badan).toContain(`Minggu ${mingguM44} Tahap 5. Kamis pukul ${jamMulai} lima tim produk`);
    expect(badan).toContain(`Satu pipeline berjalan ${pipeMenit} menit, dan waktu tunggu di merge queue mencapai ${queueJam} jam.`);
    expect(badan).toContain(`hari, jam, ${pipeMenit} menit, dan ${queueJam} jam berasal dari naskah, bukan dari rekaman`);
    expect(badan).toContain("*Angka cerita (Ilustrasi):*");
    expect(gejalaM44).toContain("(Ilustrasi)");
    expect(gejalaM44).toContain("sampai Jumat");
    expect(badan).toContain("menunggu sampai Jumat");
    expect(timProduk).toHaveLength(5);
    expect(badan).toContain("lima tim produk");
  });
  test("dugaan: runner CI dan jadwal bergilir, lalu tiap modul jadi service, sama dengan kolom 'Yang dikira' naskah", () => {
    expect(dikiraM44).toContain("Tambah runner CI dan jadwal rilis bergilir");
    expect(dikiraM44).toContain("Nadia: tiap modul jadi service saat ini juga");
    expect(badan).toContain("tambah runner CI, yaitu mesin yang menjalankan pemeriksaan, dan atur jadwal rilis bergilir");
    expect(badan).toContain("Nadia mengusulkan arah lain, yaitu tiap modul jadi service saat ini juga.");
  });
  test("ambang pipeline dari ADR 44 dan selisihnya: 14 − 10 = 4, dalam teks, tabel, rantai, dan skenario", () => {
    expect(ambang).toBe(10);
    expect(selisihMenit).toBe(4);
    expect(badan).toContain(`${pipeMenit} menit melewati ambang ${ambang} menit sebanyak ${pipeMenit} − ${ambang} = ${selisihMenit} menit`);
    const tabel = tabelDari(badan, "| Syarat tertulis |");
    const barisPipeline = tabel.find((r) => r[0]!.startsWith("ADR 44"))!;
    expect(barisPipeline[0]).toBe(`ADR 44: satu PR menunggu pipeline lebih dari ${ambang} menit`);
    expect(barisPipeline[2]).toBe(`${pipeMenit} menit, ${selisihMenit} menit di atas ambang (Hitungan)`);
    const sub = DataRantai.parse(rantaiMentah).baris.flatMap((b) => b.simpul.map((s) => s.sub ?? ""));
    expect(sub).toContain(`ambang ADR 44: ${ambang} menit`);
    expect(sub).toContain(`${pipeMenit} menit, ${selisihMenit} menit di atas ambang`);
    expect(skenario.langkah[1]!.kirim).toContain(`pipeline: ${pipeMenit} menit per pemeriksaan (Ilustrasi)`);
    expect(skenario.langkah[1]!.kirim).toContain(`ambang ADR 44: ${ambang} menit (Asumsi naskah)`);
    expect(skenario.langkah[1]!.jelas).toContain(`${pipeMenit} menit melewati ambang ADR 44 sebanyak ${selisihMenit} menit (Hitungan)`);
    expect(skenario.langkah[3]!.kirim).toContain(`waktu tunggu ${queueJam} jam (Ilustrasi)`);
    expect(adr44).toContain(`Saat satu PR menunggu pipeline lebih dari ${ambang} menit (Asumsi naskah). Tim mulai melewatinya.`);
  });
  test("orang per service: 28 ÷ 6 = 4,7; 13 ÷ 6 = 2,2 dari ADR 45; 5 × 4 = 20 dan 20 ÷ 6 = 3,3; ambang ADR 50 tiga orang", () => {
    expect(orangTotal).toBe(28);
    expect(nService).toBe(6);
    expect(orangProduk).toBe(5 * 4);
    expect(sebenarnyaM44).toContain(`${orangTotal} ÷ ${nService} = ${koma(perService)} orang per service`);
    expect(badan).toContain(`${orangTotal} orang dibagi enam service menjadi ${orangTotal} ÷ ${nService} = ${koma(perService)} orang per service.`);
    expect(per4[1]).toBe(String(orang4));
    expect(orang4).toBe(dev4);
    expect(koma(orang4 / nService)).toBe(per4[3]);
    expect(badan).toContain(`Di ADR 45 Tahap 4 hasilnya ${orang4} ÷ ${nService} = ${koma(orang4 / nService)}`);
    expect(badan).toContain(`Lima tim produk berjumlah 5 × 4 = ${orangProduk} orang, jadi ${orangProduk} ÷ ${nService} = ${koma(perServiceProduk)} orang per service (Hitungan atas Asumsi).`);
    expect(badan).toContain(`ADR 50 memakai ambang ${kata(ambangOrang)} orang per service sebagai syarat salah ([[t5-service]])`);
    expect(ambangOrang).toBe(3);
    expect(perServiceProduk).toBeGreaterThan(ambangOrang);
    expect(badan).toContain("Angka 4,7 menghitung semua 28 orang, termasuk tim Platform, SRE, dan Security.");
    const timFungsi = ["Platform", "SRE", "Security"];
    expect(orangProduk + timFungsi.reduce((a, n) => a + orangTim(n), 0)).toBe(orangTotal);
  });
  test("lima tim produk tepat di ambang lima: ADR 45 butir 2 memuat 'lima tim atau lebih', dan 5 ≥ 5", () => {
    expect(ambangTim).toBe(5);
    expect(timProduk.length).toBeGreaterThanOrEqual(ambangTim);
    expect(timProduk.length).not.toBeGreaterThan(ambangTim);
    expect(badan).toContain(`${timProduk.length} tim produk, tepat di ambang ${ambangTim} (Hitungan atas Asumsi)`);
    expect(badan).toContain("lima tim produk tepat di ambang lima (Hitungan atas Asumsi)");
  });
});

describe("tiga ADR dibaca ulang: kalimat dan tabel diturunkan dari halaman ADR dan naskah", () => {
  test("kalimat ADR 37, 44, 45, dan 12 yang dikutip ada di halaman sumbernya", () => {
    expect(adr37).toContain("Saat satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal.");
    expect(badan).toContain("ADR 37 menulis keputusan modular monolith salah saat satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal ([[t4-modul]])");
    expect(badan).toContain("ADR 44 menulis keputusannya salah saat satu PR menunggu pipeline lebih dari 10 menit, karena tim mulai melewatinya ([[t4-tim-infra]])");
    expect(adr45).toContain("Dua tim atau lebih tidak bisa merilis tanpa saling menunggu");
    expect(adr45).toContain("lima tim atau lebih perlu merilis tanpa menunggu tim lain");
    expect(adr45).toContain("Atau satu modul menahan 5 koneksi atau lebih pada puncak. Atau developer lebih dari ±50");
    expect(badan).toContain("Butir 1 punya dua syarat lain, yaitu koneksi dan jumlah developer. Halaman ini hanya memakai syarat tim.");
    expect(adr45).toContain("Jurnal dan baris pendampingnya tidak lagi satu transaction bila modulnya pindah ke database lain. ADR 37 menerima itu untuk satu jalur, dengan Idempotency-Key dan rekonsiliasi, dan tiap jalur tambahan membutuhkan keduanya.");
    expect(badan).toContain("ADR 45 menulis hal yang sama untuk jurnal dan baris pendampingnya bila modulnya pindah ke database lain. ADR 37 menerima itu untuk satu jalur, dengan Idempotency-Key dan rekonsiliasi, dan tiap jalur tambahan membutuhkan keduanya ([[t4-adr-45]]).");
    expect(adr12).toContain("Pembayaran yang menyentuh dua service tidak lagi bisa dibungkus satu transaction");
    expect(badan).toContain("ADR 12 menulis bahwa pembayaran yang menyentuh dua service tidak lagi bisa dibungkus satu transaction ([[t1-adr-12]])");
  });
  test("tabel Tiga ADR: empat baris, tiga kolom, nilai Tahap 4 dari halaman ADR dan naskah, nilai M44 dari baris M44 naskah", () => {
    const t = tabelDari(badan, "| Syarat tertulis |");
    expect(t.map((r) => r.length)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(t[0]).toEqual(["Syarat tertulis", "Tahap 4", "M44"]);
    expect(t.slice(2).map((r) => r[0]!.split(":")[0])).toEqual(["ADR 37", "ADR 44", "ADR 45 butir 1", "ADR 45 butir 2"]);
    expect(t[2]![1]).toBe(`Belum terlihat dari ${dev4} developer (Asumsi)`);
    expect(adr37).toContain(`Dari ${dev4} developer dan 6,94 transaksi uang per detik, itu belum terlihat (Asumsi).`);
    expect(t[3]![1]).toBe("Waktu CI tidak diukur lab");
    expect(adr44).toContain("Lab tidak mengukur waktu CI.");
    const barisKomp1 = naskah.split("\n").find((b) => b.startsWith("| 1. Semua modul jadi service |")) ?? "";
    const barisKomp2 = naskah.split("\n").find((b) => b.startsWith("| 2. Kubernetes |")) ?? "";
    const k1 = pecahBaris(barisKomp1);
    const k2 = pecahBaris(barisKomp2);
    expect(k1[1]).toBe("Dua tim atau lebih tidak bisa merilis tanpa saling menunggu");
    expect(k1[2]).toBe("3 tim");
    expect(k1[3]).toContain("5 tim produk dan 3 tim fungsi: terpenuhi");
    expect(k2[1]).toBe("Lima tim atau lebih perlu merilis tanpa menunggu tim lain");
    expect(k2[2]).toBe("3 tim");
    expect(k2[3]).toBe("5 tim produk: terpenuhi");
    expect(t[4]![0]).toBe(`ADR 45 butir 1: ${k1[1]!.replace(/^./, (c) => c.toLowerCase())}`);
    expect(t[5]![0]).toBe(`ADR 45 butir 2: ${k2[1]!.replace(/^./, (c) => c.toLowerCase())}`);
    expect(t[4]![1]).toBe(k1[2]);
    expect(t[5]![1]).toBe(k2[2]);
    expect(t[4]![2]).toBe("5 tim produk menunggu satu merge queue (Hitungan atas Asumsi)");
    expect(t[5]![2]).toBe("5 tim produk, tepat di ambang 5 (Hitungan atas Asumsi)");
    expect(t[2]![2]).toBe("Perbaikan kecil Akun menunggu sampai Jumat (Ilustrasi)");
    expect(sebenarnyaM44).toContain("Pemicu ADR 45 butir 1 dan 2 terpenuhi");
    expect(badan).toContain("Terpenuhi berarti keadaan M44 sama dengan pemicu yang ditulis, bukan bahwa komponennya terbukti perlu.");
    const naskahArti = naskah.indexOf("\"Terpenuhi\" berarti halaman Tahap 5 menulis keadaan yang sama dengan pemicunya, bukan bahwa komponennya terbukti perlu");
    expect(naskahArti).toBeGreaterThan(0);
  });
  test("ADR 45 butir 2 memuat Kubernetes; pemicu butir 1 punya tiga syarat dalam satu sel", () => {
    expect(adr45).toMatch(/\| 2\. Kubernetes, service mesh, Kafka \| Kubernetes: lima tim atau lebih perlu merilis tanpa menunggu tim lain/);
    expect(adr45).toMatch(/\| 1\. Semua modul jadi service \| Dua tim atau lebih tidak bisa merilis tanpa saling menunggu\. Atau satu modul menahan 5 koneksi atau lebih pada puncak\. Atau developer lebih dari ±50/);
    expect(badan).toContain("Pilihannya dan harganya dibahas di [[t5-service]].");
  });
  test("janji lintas halaman: ADR 50 memuat ambang tiga orang di naskah, ADR 58 lahir dari M44, dan peta menaruh keduanya di 5.13 dan 5.27", () => {
    const baris50 = naskah.split("\n").find((b) => b.startsWith("| 50 |")) ?? "";
    expect(baris50).toContain("Satu service dipegang kurang dari 3 orang (Asumsi; pembanding 4,7)");
    expect(naskah).toContain("ADR 58 (halaman 5.27, bukan halaman masalah): lahir dari M44, M46, dan M49.");
    expect(dari("t5-service").nomor).toBe("5.13");
    expect(dari("t5-tim-infra").nomor).toBe("5.27");
    expect(dari("t5-tim-infra").judul).toContain("platform, GitOps, OpenTelemetry, SLO");
    expect(badan).toContain("[[t5-tim-infra]]: platform, GitOps, OpenTelemetry, dan SLO. Keputusannya ADR 58.");
    expect(badan).toContain("[[t5-service]]: dari modul ke service, Kubernetes, dan kapan menggabungkan kembali. Keputusannya ADR 50.");
    expect(dari("t5-service").judul).toContain("Dari modul ke service, Kubernetes, kapan menggabungkan kembali + ADR 50");
  });
});

describe("rekaman skema.txt: foreign key, tabel per schema, hak, versi, dan rentang Snippet diturunkan dari berkasnya", () => {
  test("daftar foreign key: 18 baris, sama dengan angka di kepala daftar, 11 ke akun, 6 ke ledger, 1 ke notifikasi", () => {
    expect(fk.length).toBe(fkTertulis);
    expect(fkTertulis).toBe(18);
    expect(fkKe("akun")).toBe(11);
    expect(fkKe("ledger")).toBe(6);
    expect(fkKe("notifikasi")).toBe(1);
    expect(fkKe("akun") + fkKe("ledger") + fkKe("notifikasi")).toBe(fk.length);
    expect(new Set(fk.map((f) => `${f.dari}.${f.tabel}->${f.ke}.${f.tujuan}`)).size).toBe(fk.length - 1);
    expect(badan).toContain(`Sebelum pembagian ada ${fkTertulis} foreign key yang menyeberang schema:`);
    expect(badan).toContain(`Dari ${fkTertulis} foreign key itu, ${fkKe("akun")} menunjuk ke schema akun, ${fkKe("ledger")} ke schema ledger, dan ${fkKe("notifikasi")} ke schema notifikasi (Hitungan atas daftar rekaman).`);
    expect(badan).toContain("Schema akun dipegang tim Akun, yaitu tim yang perbaikannya menunggu di M44 ([[t5-prd]]).");
    expect(hal51).toContain("| Akun: 4 orang, dipimpin Raka | app, akun, identitas |");
  });
  test("sesudah pembagian 0 lintas schema dan 19 di dalam schema; skenario dan noscript memakai angka yang sama", () => {
    expect(fkSesudah).toBe(0);
    expect(fkDalam).toBe(19);
    expect(badan).toContain(`menjawab ${fkSesudah} untuk yang menyeberang schema dan ${fkDalam} untuk yang tetap di dalam satu schema`);
    expect(skenario.varian.langkah[2]!.kirim).toBe(`foreign key lintas schema: ${fkTertulis} sebelum, ${fkSesudah} sesudah\n${jumlahTabel} tabel di enam schema: ${urutanTabel.join(", ")}`);
    expect(badan).toContain(`foreign key lintas schema turun dari ${fkTertulis} ke ${fkSesudah} (\`skema.txt\` bagian E)`);
    expect(skenario.varian.langkah[2]!.jelas).toContain(`${huruf1(kata(fkKe("akun")))} dari ${kata(fkTertulis)} foreign key menunjuk schema akun`);
    expect(badan).toContain(`${fkTertulis} foreign key yang menyeberang schema: ${fkTertulis} sebelum pembagian dan ${fkSesudah} sesudahnya`);
  });
  test("30 tabel di enam schema: 9, 5, 6, 6, 2, 2 dalam urutan naskah, dan jumlahnya 30", () => {
    expect(urutanTabel).toEqual([9, 5, 6, 6, 2, 2]);
    expect(urutanTabel.reduce((a, b) => a + b, 0)).toBe(jumlahTabel);
    expect(jumlahTabel).toBe(30);
    expect(daftarService).toEqual(["ledger", "akun", "pembayaran", "merchant", "notifikasi", "cicilan"]);
    expect(badan).toContain(`Lab \`api-t5\` memecah ${jumlahTabel} tabel ke enam schema`);
    expect(badan).toContain(`Lab \`api-t5\` memecah ${jumlahTabel} tabel ke enam schema, yaitu ruang nama tabel di satu database.`);
    expect(badan).toContain(`**3.** Lab \`api-t5\` memecah ${jumlahTabel} tabel ke enam schema.`);
  });
  test("hak role: hanya ledger punya hak lintas schema, tiga kolom akun, nama ditolak 42501, satu proses t5_app mewarisi enam role", () => {
    const b1 = nomorBaris(/^t5_ledger: SELECT id, tingkat, status FROM t5_akun\.akun/);
    expect(skemaBaris[b1 - 1]).toContain("berhasil: kontrak kolom lintas service");
    expect(skemaBaris[b1]).toBe("t5_ledger: SELECT nama FROM t5_akun.akun LIMIT 1");
    expect(skemaBaris[b1 + 1]).toBe("  ERROR:  permission denied for table akun   -- SQLSTATE 42501");
    expect(skema).toContain("# Katalog: hak tiap role service atas tabel dan schema service lain: hanya t5_ledger yang punya, yaitu USAGE schema akun dan SELECT atas\n# kolom id, tingkat, dan status tabel akun (kontrak kolom); role lain tidak punya hak apa pun di schema service lain: ya");
    expect(skema).toContain("t5_app (mewarisi enam role)");
    expect(skema).toContain("# server: ./api-t5 -lab sebagai role t5_app (search_path = enam schema)");
    expect(readmeT5).toContain("**Satu proses, enam service sebagai paket dan schema.**");
    expect(badan).toContain("Katalog PostgreSQL di rekaman yang sama menunjukkan bahwa dari keenam role, hanya ledger yang punya hak atas schema service lain.");
    expect(badan).toContain("Lab tidak menjalankannya, karena satu proses `t5_app` mewarisi keenam role.");
    expect(badan).toContain("Satu proses `api-t5` berjalan sebagai role `t5_app`, yang mewarisi keenam role service.");
    expect(skenario.varian.langkah[3]!.kirim).toBe("t5_ledger: SELECT id, tingkat, status FROM t5_akun.akun -> berhasil\nt5_ledger: SELECT nama FROM t5_akun.akun -> permission denied for table akun (42501)");
    expect(skenario.varian.langkah[3]!.jelas).toContain("Dari keenam role service, hanya ledger yang punya hak atas schema service lain, yaitu schema akun, dan hanya atas tiga kolom.");
    expect(badan).toContain("Ledger boleh membaca tiga kolom tabel `akun`, dan kolom lain dijawab ditolak:");
  });
  test("kondisi rekaman: PostgreSQL, Go, dan pgx dari kepala skema.txt; 21 foreign key Tahap 4 berasal dari pembagian enam modul", () => {
    expect(badan).toContain(`*Kondisi rekaman:* PostgreSQL ${versi.pg}, go${versi.go}, dan pgx ${versi.pgx}, dari database bersih.`);
    expect(skemaBaris[2]).toBe("# Rekaman dari database bersih: make -C labs/api-t5 run.");
    expect(fk21).toBe(21);
    expect(badan).toContain(`Tahap 4 menghitung ${fk21} foreign key lintas modul untuk enam modul.`);
    expect(skenario.sumber.catatan).toContain(`PostgreSQL ${versi.pg}, dari database bersih`);
  });
  test("tiga Snippet: file, rentang baris, isi pertama dan terakhir, dan huruf bagian di judul sama dengan penanda bagian di rekaman", () => {
    const sn = [...badan.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"(?: lang="\w+")? title="([^"]+)" \/>/g)];
    expect(sn.map((m) => m[1])).toEqual(["labs/api-t5/output/skema.txt", "labs/api-t5/output/skema.txt", "labs/api-t5/output/skema.txt"]);
    const rentang = sn.map((m) => [Number(m[2]), Number(m[3])] as const);
    expect(rentang).toEqual([[bFkAwal, bFkAkhir], [bFkAkhir + 1, bFkDalam + 3], [skemaBaris.findIndex((b) => b.startsWith("t5_ledger: SELECT id, tingkat, status")) + 1, skemaBaris.findIndex((b) => b.startsWith("t5_ledger: SELECT id, tingkat, status")) + 3]]);
    for (const [a, b] of rentang) expect(b).toBeLessThanOrEqual(skemaBaris.length);
    expect(skemaBaris[rentang[0]![0] - 1]).toMatch(/^# foreign key lintas schema service SEBELUM dihapus/);
    expect(skemaBaris[rentang[0]![1] - 1]).toMatch(/^# Tahap 4 menghitung 21 foreign key/);
    expect(skemaBaris[rentang[1]![0] - 1]).toMatch(/^\$ psql -f layanan\.sql {3}# langkah 2: DROP CONSTRAINT/);
    expect(skemaBaris[rentang[1]![1] - 1]).toBe("(1 row)");
    expect(skemaBaris[rentang[1]![1] - 2]).toBe(` ${fkDalam}`);
    expect(skemaBaris[rentang[2]![0] - 1]).toMatch(/^t5_ledger: SELECT id, tingkat, status FROM t5_akun\.akun/);
    expect(skemaBaris[rentang[2]![1] - 1]).toContain("SQLSTATE 42501");
    sn.forEach((m, i) => {
      const bagian = bagianDi(rentang[i]![0]);
      expect(m[4]).toContain(`bagian ${bagian}`);
      expect(m[4]).toContain("labs/api-t5/output/skema.txt");
    });
    expect(sn.map((m) => bagianDi(Number(m[2])))).toEqual(["E", "E", "F"]);
    expect(rentang[0]![1] - rentang[0]![0] + 1).toBe(fk.length + 2);
  });
  test("klaim negatif berlingkup: tak ada SQLSTATE 23503 atau baris tanpa induk di rekaman api-t5, dan lab tidak mengukur waktu CI", () => {
    const dir = path.join(akar, "labs/api-t5/output");
    const berkas = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
    expect(berkas.sort()).toEqual(["beban.txt", "kontrak.txt", "laporan.txt", "pooler.txt", "skema.txt", "testing.txt"]);
    for (const f of berkas) {
      const isi = fs.readFileSync(path.join(dir, f), "utf8");
      expect(isi, f).not.toMatch(/23503|foreign_key_violation|violates foreign key/);
    }
    expect(badan).toContain("Lab tidak mencoba memasukkan baris seperti itu.");
    expect(badan).toContain("Lab tidak mengukur waktu CI, seperti yang ditulis ADR 44 ([[t4-tim-infra]]).");
    expect(adr44).toContain("Lab tidak mengukur waktu CI.");
    expect(badan).toContain("Rekaman memecah data, bukan proses. `api-t5` adalah satu proses dengan satu role");
  });
  test("pergantian nama kolom di Tahap 4 mematahkan top-up karena satu role, dan varian rekaman 4.12 memisahkan role", () => {
    expect(hal412).toContain("Semua modul memakai satu schema");
    expect(hal412).toContain("Mereka juga memakai satu role");
    expect(badan).toContain("Di Tahap 4 pergantian nama kolom mematahkan top-up karena semua modul memakai satu role ([[t4-m32]]).");
    expect(dari("t4-m32").nomor).toBe("4.12");
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R5-165 sampai R5-169", () => {
  const URL_QUEUE = "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue";
  const URL_CI = "https://martinfowler.com/articles/continuousIntegration.html";
  const URL_FK = "https://www.postgresql.org/docs/17/ddl-constraints.html";
  test("tiap tautan luar ada di salah satu baris riset, dengan tanggal buka 2026-11-02 sesudahnya, dan jumlahnya terkunci", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(tautan.length).toBe(5);
    expect(tautan.filter((u) => u === URL_QUEUE).length).toBe(3);
    expect(tautan.filter((u) => u === URL_CI).length).toBe(1);
    expect(tautan.filter((u) => u === URL_FK).length).toBe(1);
    const gabung = ["R5-165", "R5-166", "R5-167"].map(barisRiset).join("\n");
    for (const u of new Set(tautan)) expect(gabung, u).toContain(u.replace("https://", "").replace("www.", ""));
    expect((badan.match(/dibuka 2026-11-02/g) ?? []).length).toBe(tautan.length);
    expect((badan.match(/2026-1\d-\d\d/g) ?? []).length).toBe(tautan.length);
    for (const r of ["R5-165", "R5-166", "R5-167"]) expect(barisRiset(r)).toContain("dibuka 2026-11-02");
  });
  test("baris R5-165: tiga kutipan Inggris, dan kalimat halaman tidak lebih kuat dari dokumentasi (tak menulis runner tidak membantu)", () => {
    const r = barisRiset("R5-165");
    expect(r).toContain("A merge queue helps increase velocity by automating pull request merges into a busy branch");
    expect(r).toContain("the changes in the pull request are grouped into a merge_group with the latest version of the base_branch as well as changes from pull requests ahead of it in the queue.");
    expect(r).toContain("GitHub will merge all these changes into the base_branch once the checks required by the branch protections of base_branch pass.");
    expect(r).toContain("Build concurrency: The maximum number of merge_group webhooks to dispatch (between 1 and 100), throttling the total amount of concurrent CI builds. This affects the velocity of merges that a merge queue can complete.");
    expect(r).toContain("Dokumentasi tidak menulis bahwa runner tambahan tidak mempercepat antrean");
    expect(badan).toContain("merge queue mengelompokkan perubahan satu pull request dengan versi terbaru branch dasar. Kelompok itu juga memuat perubahan pull request di depannya");
    expect(badan).toContain("Dokumentasi GitHub menulis bahwa build concurrency memengaruhi laju merge");
    expect(badan).toContain("Runner tambahan membantu sebagian.");
    expect(badan).toContain("Dugaan pertama tidak salah, tetapi tidak menjawab siapa menunggu siapa.");
    expect(badan).not.toMatch(/runner (tidak|takkan) (membantu|mempercepat)/i);
    expect(skenario.langkah[2]!.jelas).toContain("Runner tambahan memendekkan satu pemeriksaan, tetapi urutan di queue tetap sama (Penalaran).");
  });
  test("baris R5-166 dan R5-167: kutipan, tanggal terbit Fowler, versi PostgreSQL, dan satu arti foreign key", () => {
    const f = barisRiset("R5-166");
    expect(f).toContain("For most projects, however, the XP guideline of a ten minute build is perfectly within reason.");
    expect(f).toContain("18 Januari 2024");
    expect(badan).toContain("\"perfectly within reason\" bagi sebagian besar proyek ([Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html), 18 Januari 2024, dibuka 2026-11-02, Tidak dijalankan).");
    expect(badan).toContain("Itu pedoman, bukan batas, jadi ambang ADR 44 tetap Asumsi naskah.");
    const p = barisRiset("R5-167");
    expect(p).toContain("A foreign key constraint specifies that the values in a column (or a group of columns) must match the values appearing in some row of another table.");
    expect(p).toContain("We say this maintains the referential integrity between two related tables.");
    expect(p).toContain("Dokumentasi PostgreSQL 17.11");
    expect(badan).toContain("Foreign key mewajibkan nilai di satu kolom cocok dengan nilai di satu baris tabel lain. Definisi ini dari [dokumentasi PostgreSQL 17.11]");
    expect(badan).toContain(`Itu Penalaran dari definisi di atas.`);
  });
  test("baris R5-168 dan R5-169: hitungan dan sumber internal tercatat; lima baris berurutan, lima kolom, tanpa ID ganda", () => {
    const ids = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    expect(new Set(ids).size).toBe(ids.length);
    const pos = ["R5-165", "R5-166", "R5-167", "R5-168", "R5-169"].map((i) => ids.indexOf(i));
    expect(pos).toEqual([pos[0]!, pos[0]! + 1, pos[0]! + 2, pos[0]! + 3, pos[0]! + 4]);
    expect(ids[pos[0]! - 1]).toBe("R5-114");
    expect(ids[pos[4]! + 1]).toBe("R5-245");
    for (const i of ["R5-165", "R5-166", "R5-167", "R5-168", "R5-169"]) expect(pecahBaris(barisRiset(i)).length).toBe(5);
    const h = barisRiset("R5-168");
    expect(h).toContain(`${pipeMenit} − ${ambang} = ${selisihMenit}`);
    expect(h).toContain(`${orangTotal} ÷ ${nService} = 4,667 (ditulis ${koma(perService)})`);
    expect(h).toContain(`${orang4} ÷ ${nService} = 2,167 (ditulis ${koma(orang4 / nService)})`);
    expect(h).toContain(`${orangProduk} ÷ ${nService} = 3,333 (ditulis ${koma(perServiceProduk)})`);
    expect(h).toContain("11 ke schema akun (dari ledger 4, merchant 4, notifikasi 1, pembayaran 2) + 6 ke schema ledger + 1 ke schema notifikasi");
    const dariAkun = (s: string): number => fk.filter((f2) => f2.dari === s && f2.ke === "akun").length;
    expect([dariAkun("ledger"), dariAkun("merchant"), dariAkun("notifikasi"), dariAkun("pembayaran")]).toEqual([4, 4, 1, 2]);
    expect(h).toContain("9 + 5 + 6 + 6 + 2 + 2 = 30 tabel");
    const g = barisRiset("R5-169");
    for (const s of ["tahap-4/modular-monolith.mdx", "tahap-4/tim-infra.mdx", "tahap-4/sengaja-belum.mdx", "tahap-1/sengaja-belum.mdx", "labs/api-t5/output/skema.txt", "labs/api-t5/README.md"]) expect(g, s).toContain(s);
  });
});

describe("ID registry, tautan, template blok, widget, kartu, dan istilah", () => {
  test("registry: halaman 5.12 jenis masalah, ada, prasyarat t4-modul dan t4-tim-infra, lab api-t5, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m44");
    expect(h.nomor).toBe("5.12");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.prasyarat).toEqual(["t4-modul", "t4-tim-infra"]);
    expect(h.lab).toEqual(["api-t5"]);
    expect(h.peran).toEqual(["devops", "backend"]);
    expect(h.path).toBe("tahap-5/m44-rilis-menunggu-lima-tim.md");
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t4-modul]], [[t4-tim-infra]]");
    expect(frontmatter).toContain(`title: "5.12 ${h.judul}"`);
    expect(naskah).toContain(`| 5.12 | 4 | ${h.judul} | Masalah | ★ | api-t5 | alur |`);
    expect(naskah).toContain("- **DevOps** 5.9, 5.12, 5.13");
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ A0: 1, "t4-modul": 3, "t4-tim-infra": 3, "t4-adr-45": 2, "t5-prd": 2, "t5-service": 4, "t4-m32": 1, "t1-adr-12": 2, "t5-tim-infra": 1 });
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m44.json" />');
    expect(badan).toContain('<Rantai data={limaTim} ringkas />');
    expect(badan).toContain("*Kondisi:* angka waktu dan lima tim berasal dari cerita (Ilustrasi).");
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; tepat satu tabel di halaman", () => {
    const baris = badan.split("\n");
    let tabelKe = 0;
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        tabelKe++;
        const n = pecahBaris(baris[i]!).length;
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `tabel ${tabelKe} baris ${j + 1}`).toBe(n);
      }
    }
    expect(tabelKe).toBe(1);
  });
  test("skenario alur: valid menurut alur-core, tanpa perangkat, lima komponen, lima langkah dan lima langkah varian, jenis Ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen.map((k) => k.id)).toEqual(["akun", "antre", "pipe", "rilis", "db"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(1);
    expect(core.steps(skenario, true)).toHaveLength(6);
    expect(skenario.sumber.catatan).toContain("Jalur utama adalah Ilustrasi");
    expect(skenario.sumber.catatan).toContain("skema.txt bagian E dan F");
    expect(badan).toContain("centang **Ubah satu hal: " + skenario.varian.label + "**");
    expect(skenario.varian.label).toBe("modul dipecah menjadi service dengan schema dan role sendiri");
    const labelPipe = skenario.langkah.map((l) => l.kirim).join("\n");
    expect(labelPipe).not.toMatch(/Rekaman lab/);
  });
  test("tebakan skenario: empat pilihan, tepat satu benar di posisi keempat dan bukan pilihan terpanjang; penjelasan memuat Penalaran dan Ilustrasi", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(3);
    const panjang = p.options.map((o) => o.length);
    expect(panjang.indexOf(Math.max(...panjang))).not.toBe(p.answer);
    expect(p.options[p.answer]).toBe("Perbaikan Akun tetap menunggu perubahan tim lain, karena rilisnya satu");
    expect(p.varian).toBe(false);
    expect(p.explain).toContain("(Penalaran)");
    expect(p.explain).toContain("Angka waktu di cerita adalah Ilustrasi.");
    expect(p.q).toContain("Tim Akun menambah runner CI sampai semua pemeriksaan berjalan serentak.");
    expect(skenario.langkah[4]!.nada).toBe("warn");
    expect(skenario.varian.langkah[4]!.nada).toBe("warn");
    expect(skenario.langkah[4]!.jelas).toContain("(Penalaran atas Asumsi)");
    expect(skenario.varian.langkah.filter((l) => l.kirim.includes("(rekaman)") || l.judul.includes("(rekaman)")).length).toBe(2);
    expect(skenario.varian.langkah[2]!.judul).toBe("Data dipecah per schema (rekaman)");
    expect(skenario.varian.langkah[3]!.judul).toBe("Role service lain dibatasi (rekaman)");
    expect(skenario.varian.langkah[4]!.kirim).toContain("Tidak dijalankan di lab");
    expect(skenario.varian.langkah[0]!.kirim).toContain("Ilustrasi: rancangan ADR 50, tidak dijalankan di lab");
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber Ilustrasi, ADR 37, 44, dan 45 sama dengan tabel, sub memuat angka dari cerita", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.sumber.jenis).toBe("ilustrasi");
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    const adrDiagram = d.baris[1]!.simpul.map((s) => Number(s.teks.match(/ADR (\d+)/)![1]));
    expect(adrDiagram).toEqual([37, 44, 45]);
    const adrTabel = tabelDari(badan, "| Syarat tertulis |").slice(2).map((r) => Number(r[0]!.match(/ADR (\d+)/)![1]));
    expect([...new Set(adrTabel)]).toEqual(adrDiagram);
    expect(d.baris[0]!.simpul.map((s) => s.teks)).toEqual([`${timProduk.length} tim, 1 merge queue`, `Pipeline ${pipeMenit} menit`, `Tunggu ${queueJam} jam`]);
    expect(d.baris[1]!.simpul[1]!.teks).toBe(`ADR 44: lebih dari ${ambang} menit`);
    expect(d.baris[1]!.simpul[2]!.sub).toBe(`ambang 2 tim dan ${ambangTim} tim`);
    expect(d.sumber.teks).toBe("Ilustrasi (naskah M44) dan Asumsi ambang ADR 37, 44, dan 45");
    expect(d.baris.flatMap((b) => b.simpul).every((s) => s.nada === "biasa" || s.nada === "warn")).toBe(true);
    expect(d.baris.flatMap((b) => b.simpul).filter((s) => s.nada === "warn")).toHaveLength(5);
  });
  test("kartu Cek diri: tiga kartu t5-m44, tanya sama dengan soal di halaman, jawaban halaman termuat (5.13 untuk [[t5-service]])", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-m44");
    expect(k.map((x) => x.id)).toEqual(["t5-m44-1", "t5-m44-2", "t5-m44-3"]);
    const soal = [...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!);
    const jawab = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(soal).toHaveLength(3);
    expect(jawab).toHaveLength(3);
    k.forEach((x, i) => {
      expect(x.tanya).toBe(soal[i]);
      // sinkron_cerita.py menulis [[id]] di kartu sebagai nomor dan judul halaman; potongan di sekitarnya harus sama, dan nomornya benar
      const potongan = jawab[i]!.split(/\[\[[^\]]+\]\]/);
      let dari0 = 0;
      for (const p of potongan) { const j = x.jawab.indexOf(p, dari0); expect(j, `potongan jawaban: ${p}`).toBeGreaterThanOrEqual(0); dari0 = j + p.length; }
      for (const m of jawab[i]!.matchAll(/\[\[([^\]]+)\]\]/g)) expect(x.jawab).toContain(`${dari(m[1]!).nomor} `);
      expect(x.judul).toBe(`5.12 ${dari("t5-m44").judul}`);
      expect(x.url).toBe(dari("t5-m44").path!.replace(/\.md$/, "/"));
    });
  });
  test("istilah baru: Merge queue ada di glosarium dan punya halaman istilah dengan sumber R5-165 yang sama dengan baris riset", () => {
    expect(glosMdx).toContain("| **Merge queue** | Queue di GitHub yang menggabungkan pull request ke branch yang ramai sesudah pemeriksaannya lolos, dengan memeriksa tiap perubahan bersama perubahan di depannya. | [[t5-m44]] |");
    expect((glosarium as { t: string }[]).some((g) => g.t === "Merge queue")).toBe(true);
    expect(istilah.istilah).toBe("Merge queue");
    expect(istilah.sumber).toHaveLength(1);
    expect(istilah.sumber[0]!.riset).toBe("R5-165");
    expect(barisRiset("R5-165")).toContain(istilah.sumber[0]!.url.replace("https://", ""));
    expect(istilah.cerita.map((c) => c.rujukan)).toEqual(["t5-m44"]);
    expect(istilah.cerita[0]!.teks).toContain(`Pipeline ${pipeMenit} menit dan waktu tunggu ${queueJam} jam`);
    const semuaIstilah = (glosarium as { t: string }[]).map((g) => g.t);
    for (const t of istilah.terkait) expect(semuaIstilah, t).toContain(t);
  });
  test("definisi di pemakaian pertama: merge queue dan pipeline di Gejala, Penalaran dan Hitungan sebelum dipakai, satu kata per konsep", () => {
    const gejala = badan.slice(0, badan.indexOf('<Blok nama="Yang Raka kira"'));
    expect(gejala).toContain("Pipeline adalah rangkaian pemeriksaan otomatis atas satu perubahan, misalnya build dan tes.");
    expect(gejala).toContain("Merge queue di GitHub menggabungkan pull request ke branch utama sesudah pemeriksaannya lolos");
    expect(badan.indexOf("Itu Penalaran, yaitu kesimpulan dari dokumentasi dan angka di halaman ini tanpa dijalankan.") + "Itu ".length).toBe(badan.indexOf("Penalaran"));
    const iDef = badan.indexOf("Hitungan adalah angka yang dihitung dari angka lain di halaman ini, dan labelnya ikut masukan yang paling lemah.");
    expect(iDef).toBeGreaterThan(0);
    expect(iDef).toBeLessThan(badan.indexOf("(Hitungan"));
    expect(badan.indexOf("[[A0]]")).toBeLessThan(badan.indexOf("(Asumsi"));
    expect(badan.indexOf("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].")).toBeGreaterThan(0);
    for (const k of ["layanan", "replika", "rahasia", "antrean", "antrian", "pelanggan"]) expect(`${badan}\n${JSON.stringify(skenario)}\n${JSON.stringify(rantaiMentah)}`.toLowerCase(), k).not.toContain(k);
    expect(badan.match(/\bservice\b/g)!.length).toBeGreaterThan(10);
    expect(badan.match(/\bBuild concurrency adalah jumlah build CI yang boleh berjalan bersamaan\./g)).toHaveLength(1);
    expect(badan.indexOf("Build concurrency adalah")).toBeGreaterThan(badan.indexOf("build concurrency memengaruhi laju merge"));
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, kartu, dan halaman istilah", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m44")), JSON.stringify({ ...istilah, sumber: istilah.sumber.map((s) => ({ ...s, riset: "" })) })].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
  });
  test("label: tak satu angka waktu berlabel Rekaman lab; 'Rekaman lab' hanya untuk skema.txt dan batas data", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(barisRekaman.length).toBe(5);
    for (const b of barisRekaman) expect(b.includes("skema.txt") || b.includes("Arti Ilustrasi, Rekaman lab") || b.includes("Dua langkah berikutnya menunjukkan batas data") || b.includes("Jalur utama adalah Ilustrasi")).toBe(true);
    expect(badan).not.toMatch(/\d+ (menit|jam)[^.\n]*\(Rekaman lab\)/);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terpenuhi", "terbukti", "membantu", "mempercepat", "menunggu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "ambang", "syarat", "pemicu"];
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
const kartuT5m44 = kartuSemua.filter((x) => x.halaman === "t5-m44");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-02/g) ?? []).length, tanggal: (halaman.match(/2026-11-02/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: angka(),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-165", "R5-166", "R5-167", "R5-168", "R5-169"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m44)), istilah: h16(JSON.stringify(istilah)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
function angka(): string { return prosa.flatMap((b) => angkaDari(b)).join(" "); }
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m44), istilah: tekstual(istilah) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m44-rilis-menunggu-lima-tim.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m44-rilis-menunggu-lima-tim.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, kartu, dan halaman istilah terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, kartu, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(5);
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
