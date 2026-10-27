// Penjaga halaman 3.24 (keputusan 1092 sampai 1094): angka, versi, saldo, nomor karyawan, kode lab, nomor halaman, tautan, label sumber,
// rentang Snippet, klaim negatif berlingkup, diagram Rantai, skenario alur t3-m26.json, dan kartu Cek diri di m26-transfer-bukan-budi.mdx
// diturunkan dari rekaman labs/t3-mitm/output/m26.txt, kode lab (client Dart, proxy Go, skrip bagian_m26.py), kode api-t3 (sesi, seed,
// umur sesi), naskah Tahap 3, registry, baris riset R3-215 dan R3-216, dan halaman tetangga (1.27, 3.1, 3.3), bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.21): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI mengunci SETIAP baris badan halaman, dan
// tes lain menurunkan nilai yang diklaim dari sumbernya karena kalimat terkunci tidak menangkap SALAHNYA kalimat.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m26-transfer-bukan-budi.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

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

const BERKAS = "situs/src/content/docs/tahap-3/m26-transfer-bukan-budi.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const SKENARIO = "situs/lama/widgets/data/skenario/t3-m26.json";
const skenarioMentah = baca(SKENARIO);
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const REK = "labs/t3-mitm/output/m26.txt";
const rekaman = baca(REK);
const readmeLab = baca("labs/t3-mitm/README.md");
const bagianM26 = baca("labs/t3-mitm/bagian_m26.py");
const umumPy = baca("labs/t3-mitm/umum.py");
const CLIENT = "labs/t3-mitm/dart/bin/client.dart";
const clientDart = baca(CLIENT);
const mitmGo = baca("labs/t3-mitm/go/cmd/mitm/main.go");
const seedGo = baca("labs/api-t3/cmd/api/seed.go");
const repoGo = baca("labs/api-t3/internal/repo/repo.go");
const sesiGo = baca("labs/api-t3/internal/service/sesi.go");
const handlerGo = baca("labs/api-t3/internal/handler/handler.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const dasarT3 = baca("labs/api-t3/dasar_t3.py");
const hal31 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal33 = baca("situs/src/content/docs/tahap-3/fitur-notifikasi.mdx");
const hal127 = baca("situs/src/content/docs/tahap-1/authentication.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
  layarAt: (d: Skenario, list: Langkah[], i: number, perangkatId: string) => Layar | null;
};

interface Layar { judul?: string; waktu?: string; nada?: string; sinyal?: number; saldo?: number; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
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
interface H { id: string; judul: string; label?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const rupiah = (n: number): string => `Rp${n.toLocaleString("id-ID")}`;

// ---- pembaca rekaman: bagian, nomor baris, nilai -----------------------------------------------------------------------
function rek(teks: string) {
  const b = teks.split("\n");
  const nomor = (ok: (x: string) => boolean, dariIdx = 0): number => {
    const i = b.findIndex((x, n) => n >= dariIdx && ok(x));
    expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const awal = (h: string) => nomor((x) => x.startsWith(`# --- ${h}. `));
  const akhirSebelum = (n: number): number => {
    let i = n - 1;
    while (b[i - 1]!.trim() === "") i--;
    return i;
  };
  const antara = (a: number, z: number) => b.slice(a - 1, z).join("\n");
  return { b, nomor, awal, akhirSebelum, antara };
}
const M = rek(rekaman);
const A0 = M.awal("A"), B0 = M.awal("B"), C0 = M.awal("C"), D0 = M.awal("D"), E0 = M.awal("E");
const bagA = M.antara(A0, M.akhirSebelum(B0));
const bagB = M.antara(B0, M.akhirSebelum(C0));
const bagC = M.antara(C0, M.akhirSebelum(D0));
const bagD = M.antara(D0, M.akhirSebelum(E0));
const AKHIR_REKAMAN = ((): number => {
  let i = M.b.length;
  while (M.b[i - 1]!.trim() === "") i--;
  return i;
})();
const bagE = M.antara(E0, AKHIR_REKAMAN);

const SALDO_AWAL = Number(cocok(umumPy, /^SALDO_AWAL = (\d+)/m)[1]);
const NOMINAL_UBAH = Number(cocok(bagianM26, /^UBAH = \((\d+), "(K\d+)"\)/m)[1]);
const NOMOR_DIMAS = cocok(bagianM26, /^UBAH = \((\d+), "(K\d+)"\)/m)[2]!;
const KIRIMAN_BODY = cocok(bagianM26, /^BODY = '(\{.*\})'$/m)[1]!;
const NOMINAL_APP = (JSON.parse(KIRIMAN_BODY) as { nominal: number }).nominal;
const NOMOR_CITRA = (JSON.parse(KIRIMAN_BODY) as { ke_nomor_karyawan: string }).ke_nomor_karyawan;
const SALDO_AKHIR = SALDO_AWAL - NOMINAL_UBAH;
const BATAS_HARIAN = Number(cocok(seedGo, /batas_harian\)\s*\n\s*SELECT id, jenis, CASE WHEN jenis = 'warung' THEN \d+ END, CASE WHEN jenis = 'karyawan' THEN (\d+) END/)[1]);

const kodeBaris = (kode: string): string[] => kode.split("\n");
const nomorKode = (kode: string, ok: (b: string) => boolean, dariIdx = 0): number => {
  const i = kodeBaris(kode).findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris kode tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const potongKode = (kode: string, a: number, z: number): string => kodeBaris(kode).slice(a - 1, z).join("\n");

// rentang Snippet: diturunkan dari jangkar di rekaman dan kode, bukan angka tulisan tangan
const CMD_VALIDASI = "$ client --mode=validasi --percaya=ca-publik --url=https://localhost:18190/akun/419";
const SB0 = M.nomor((b) => b.startsWith(CMD_VALIDASI), B0);
const SB1 = M.nomor((b) => b.startsWith("# Database: tidak ada transfer"), SB0);
const SC10 = M.nomor((b) => b.startsWith(CMD_VALIDASI), C0);
const SC11 = SC10 + 1;
const SC20 = M.nomor((b) => b.startsWith("$ client --mode=terima-semua") && b.includes("localhost:18192/kiriman"), C0);
const SC21 = M.nomor((b) => b === "(2 rows)", SC20);
const SD0 = M.nomor((b) => b.startsWith("$ client --mode=validasi --percaya=ca-publik+ca-dimas"), D0);
const SD1 = M.nomor((b) => b === "# Authorization yang dibaca proxy sama dengan token sesi Budi: ya", SD0);
const SE0 = M.nomor((b) => b.startsWith("$ client --mode=terima-semua") && b.includes("localhost:18192/akun/419"), E0);
const SE1 = M.nomor((b) => b === "# Authorization yang dibaca proxy sama dengan token sesi Budi: ya", SE0);
const SF0 = M.nomor((b) => b.startsWith("$ curl -i -X POST '/kiriman'"), SE1);
const SF1 = M.nomor((b) => b === "(2 rows)", SF0);
const SG0 = M.nomor((b) => b.startsWith("$ curl -i -X GET '/akun/419/riwayat?batas=1'"), SF1);
const SG1 = M.nomor((b) => b.startsWith('{"berikutnya":'), SG0);
const K0 = nomorKode(clientDart, (b) => b.trim() === "case 'terima-semua':");
const K1 = K0 + 5;

const entri = (re: RegExp): RegExpMatchArray => cocok(badan, re);
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return { berkas: atribut("file") ?? "", lines: atribut("lines"), judul: atribut("title") };
  });
const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
const tampil = (): string[] => [M.antara(SB0, SB1), M.antara(SC10, SC11), M.antara(SE0, SE1), M.antara(SF0, SF1), M.antara(SG0, SG1), M.antara(SC20, SC21), M.antara(SD0, SD1)];

/** Isi JSON hasil client lab pada baris `$ client ...` berikutnya sesudah baris perintah. */
const hasilClient = (bagian: string, ciri: string): Record<string, unknown> => {
  const b = bagian.split("\n");
  const i = b.findIndex((x) => x.startsWith("$ client ") && x.includes(ciri));
  expect(i, `perintah client dengan ${ciri}`).toBeGreaterThanOrEqual(0);
  return JSON.parse(b[i + 1]!) as Record<string, unknown>;
};

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.24 ada, masalah, jalur inti, prasyarat 3.23, lab t3-mitm, peran mobile, security, backend; judul sama dengan peta naskah", () => {
    expect(dari("t3-m26")).toMatchObject({ ada: true, nomor: "3.24", jenis: "masalah", inti: true, prasyarat: ["t3-xss-csrf"], lab: ["t3-mitm"], tahap: 3, peran: ["mobile", "security", "backend"] });
    const minggu = cocok(naskah, /\| M26 \| (\d+) \|/)[1]!;
    expect(dari("t3-m26").label).toBe(`Masalah 26 · minggu ${minggu}`);
    harus(`Minggu ${minggu} Tahap 3.`);
    expect(frontmatter).toContain('title: "3.24 M26: Transfer yang tidak dibuat Budi"');
    expect(dari("t3-m26").judul).toBe("M26: Transfer yang tidak dibuat Budi");
    expect(naskah).toContain("| 3.24 | 4 | M26: Transfer yang tidak dibuat Budi | Masalah | ★ | t3-mitm | alur |");
    expect(dari("t3-xss-csrf").nomor).toBe("3.23");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-xss-csrf\]\] · Jalur inti<\/p>/);
    expect(dari("t3-m26").menit).toBe(Number(m[1]) + Number(m[2]));
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
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan peta naskah dan registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "B5.1", "t3-notifikasi", "t3-prd", "t3-tls-pinning", "t3-xss-csrf"]);
    const sesuai: [string, string, string][] = [
      ["B5.1", "1.27", "Authentication"], ["t3-notifikasi", "3.3", "Fitur: notifikasi push dan promo HR"], ["t3-prd", "3.1", "PRD v3"],
      ["t3-tls-pinning", "3.25", "Keamanan 6: TLS, HSTS, pinning + ADR 31"], ["t3-xss-csrf", "3.23", "Keamanan 5: XSS, CSRF, cookie sesi, passkey + ADR 30"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("3.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t3-tls-pinning")).toMatchObject({ prasyarat: ["t3-m26"], adr: [31], lab: ["t3-mitm"] });
    expect(dari("t3-tls-pinning").ada, "3.25 belum ditulis: tautannya tampil (segera) sampai halaman itu merge").toBeDefined();
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 3.24 ditepati: 3.3 (app 3.1 dipakai di M26) dan 3.1 (risiko Wi-Fi tenant mitra); halaman ini menepati janji ke 3.25", () => {
    expect(hal33).toContain("app 3.0 membawa notifikasi, dan app 3.1 adalah rilis yang dipakai di [[t3-m26]]");
    expect(hal33).toContain("Asumsi");
    expect(hal31).toContain("4. App dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo.");
    harus("- [[t3-prd]]: Sinta menulis risikonya di PRD v3, yaitu app dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo. M26 adalah kejadiannya.");
    harus("Flag itu tidak dicabut dari build rilis app 3.1. Bagian cerita itu Ilustrasi: lab tidak punya build Flutter, dan nomor versi 3.1 adalah Asumsi ([[t3-notifikasi]]).");
    expect(hal127).toContain("Budi mengirim password sekali, saat login. Server membalas token acak yang berlaku 8 jam");
    harus("Raka mengira password Budi bocor. Dalam pikirannya, akun Budi hanya bisa dipakai orang yang tahu passwordnya, karena token baru ada sesudah login ([[B5.1]]).");
    const m25 = naskah.split("\n").find((b) => b.startsWith("| M25 |"))!;
    expect(m25).toContain("jadi skripnya berjalan dengan sesi Ani");
    expect(m25).toContain("Dimas menaruh");
    harus("- [[t3-xss-csrf]]: di M25 skrip Dimas berjalan dengan sesi Ani, dan di M26 hotspot Dimas membaca sesi Budi. Di kedua kasus server melihat sesi yang sah.");
    const adr31 = naskah.split("\n").find((b) => b.startsWith("| 31 |"))!;
    for (const k of ["Validasi sertifikat selalu aktif", "HSTS di dasbor", "pin SPKI dengan satu cadangan", "token 15 menit"]) expect(adr31, k).toContain(k);
    harus("- [[t3-tls-pinning]]: validasi sertifikat yang selalu aktif, HSTS, pin dengan cadangan, dan token yang lebih pendek. Keputusannya ADR 31.");
  });
  test("halaman tidak membuka isi 3.25: ADR 31, HSTS, dan pin hanya di Konsep yang lahir; tanpa SPKI, refresh token, atau dio; [[t3-tls-pinning]] tiga kali", () => {
    const konsep = badan.indexOf('<Blok nama="Konsep yang lahir">');
    expect(hitung(badan, "ADR 31")).toBe(1);
    expect(badan.indexOf("ADR 31")).toBeGreaterThan(konsep);
    expect(hitung(badan, "HSTS")).toBe(1);
    expect(badan.indexOf("HSTS")).toBeGreaterThan(konsep);
    expect(badan).not.toMatch(/SPKI|refresh token|\bdio\b|certificate pinning|hash sertifikat|200 hari|15 menit|X-Forwarded/i);
    expect(badan.match(/\bpin\b/g)).toHaveLength(1); // "pin dengan cadangan" di Konsep yang lahir
    expect(badan.indexOf("pin dengan cadangan")).toBeGreaterThan(konsep);
    expect(hitung(badan, "[[t3-tls-pinning]]")).toBe(3);
  });
});

describe("naskah M26: gejala, dugaan Raka, dan aturan uji", () => {
  const barisM26 = naskah.split("\n").find((b) => b.startsWith("| M26 |"))!;
  test("baris M26 memuat kantin tenant mitra, kota kelima, Rp150.000, uji lapangan Pak Hadi, dugaan password bocor, hotspot Dimas, flag app 3.1, dan hasil lab", () => {
    expect(barisM26).toContain("Budi sedang makan di kantin tenant mitra di kota kelima.");
    expect(barisM26).toContain('melihat saldonya turun Rp150.000, dengan satu "Transfer ke Dimas" di riwayat yang tidak ia buat.');
    expect(barisM26).toContain("(Uji lapangan atas permintaan Pak Hadi, dengan akun uji.)");
    expect(barisM26).toContain("Password Budi bocor");
    expect(barisM26).toContain("Dimas memasang hotspot tiruan bernama sama dengan Wi-Fi kantin.");
    expect(barisM26).toContain('App 3.1 memuat flag "terima sertifikat apa pun" dari staging: Bayu meminta, Raka memasang, tidak dicabut dari build rilis.');
    expect(barisM26).toContain("Proxy tiruan membaca header Authorization dan memakainya.");
    expect(barisM26).toContain(`proxy mengubah transfer ${rupiah(NOMINAL_APP)} ke Citra menjadi ${rupiah(NOMINAL_UBAH)} ke Dimas`);
    expect(barisM26).toContain(`saldo Budi turun dari ${rupiah(SALDO_AWAL)} ke ${rupiah(SALDO_AKHIR)}`);
    expect(barisM26).toContain("validasi sertifikat yang aktif menahan CA tak dikenal tetapi tidak menahan CA yang sudah ada di daftar akar");
    harus("Minggu 9 Tahap 3. Pak Hadi meminta uji lapangan di kantin tenant mitra di kota kelima, dengan akun uji. Budi memakai akun uji itu dan sedang makan di sana.");
    harus('Saldonya turun Rp150.000, dan di riwayat ada satu "Transfer ke Dimas" yang tidak ia buat.');
    harus("Dimas bercerita bahwa ia memasang hotspot bernama sama dengan Wi-Fi kantin.");
  });
  test("angka rupiah di halaman hanya yang ada di rekaman dan skrip lab: nominal app, nominal diubah, saldo awal, dan saldo akhir", () => {
    const rp = [...new Set(badan.match(/Rp\d{1,3}(?:\.\d{3})*/g)!)].sort();
    expect(rp).toEqual([rupiah(NOMINAL_APP), rupiah(NOMINAL_UBAH), rupiah(SALDO_AWAL), rupiah(SALDO_AKHIR)].sort());
    expect(SALDO_AWAL).toBe(250000);
    expect(NOMINAL_UBAH).toBe(150000);
    expect(NOMINAL_APP).toBe(10000);
    expect(SALDO_AKHIR).toBe(100000);
    expect(bagA).toContain(`# Saldo Budi sebelum: ${rupiah(SALDO_AWAL)}`);
    expect(bagA).toContain(`# Saldo Budi sesudah: ${rupiah(SALDO_AKHIR)}.`);
    harus(`Rp150.000 dan saldo Budi dari ${rupiah(SALDO_AWAL)} ke ${rupiah(SALDO_AKHIR)} sama dengan rekaman lab di blok "Yang sebenarnya".`);
    harus(`Nominal diubah, server menjawab 201, dan saldo Budi turun dari ${rupiah(SALDO_AWAL)} ke ${rupiah(SALDO_AKHIR)}.`);
  });
  test("jam di halaman: hanya 12.15 (Ilustrasi, naskah tanpa jam) dan 17.11 (versi PostgreSQL); semua versi sama dengan kepala rekaman", () => {
    expect([...new Set(badan.match(/\b\d{2}\.\d{2}\b/g)!)].sort()).toEqual(["12.15", "17.11"]);
    expect(naskah.split("\n").find((b) => b.startsWith("| M26 |"))).not.toMatch(/\b\d{2}\.\d{2}\b/);
    harus("Jam 12.15 di layar HP pada widget adalah Ilustrasi, karena naskah tidak menyebut jam.");
    expect(M.b[1]).toContain("PostgreSQL 17.11");
    expect(M.b[3]).toContain("Dart 3.11.4 (dart:io)");
    harus("PostgreSQL 17.11, server Go `api-t3` di belakang server tepi TLS, dan client Dart 3.11.4 (`dart:io`) sebagai app Budi.");
    expect(readmeLab).toContain("Client adalah Dart CLI di macOS");
  });
});

describe("rekaman m26.txt: nilai dan rentang Snippet", () => {
  test("bagian B: client yang memeriksa sertifikat terhubung ke tepi (200) dan ditolak saat handshake lewat hotspot; hotspot melihat handshake dan 0 request; 0 transfer", () => {
    const kontrol = hasilClient(bagB, "localhost:18190/akun/419");
    expect([kontrol.hasil, kontrol.status]).toEqual(["terhubung", 200]);
    const lewat = hasilClient(bagB, "localhost:18192/kiriman");
    expect(lewat).toEqual({ hasil: "ditolak", jenis: "handshake", alasan: "application verification failure" });
    expect(bagB).toContain("--percaya=ca-publik --url=https://localhost:18192/kiriman --metode=POST");
    expect(bagB).toContain("# proxy Dimas melihat: handshake ya, request terbaca 0");
    expect(bagB).toContain("# Database: tidak ada transfer (0 baris di jurnal.jenis = 'transfer')");
    harus("Nol. Di rekaman `m26.txt` bagian B, validasi menolak sertifikat hotspot saat handshake. Hotspot melihat handshake dan 0 request, dan database tidak memuat transfer.");
    harus("Kontrol memakai client yang hanya percaya CA Lab Publik, yang memerankan CA yang dipercaya sistem. Langsung ke server tepi, client terhubung dan menerima jawaban 200. Lewat hotspot, handshake ditolak:");
    expect(bagianM26).toContain('harap(len(rq), 0, "proxy tidak membaca request apa pun")');
    expect(bagianM26).toContain('harap(U.sql(U.TRANSFER, tampil=False), [], "tidak ada transfer di database")');
    expect(bagianM26).toContain('harap((h.get("hasil"), h.get("jenis")), ("ditolak", "handshake"), "validasi menolak sertifikat tiruan")');
  });
  test("bagian C: staging (CA Staging) ditolak validasi; flag membuat staging jalan (callback 1 kali); build rilis dengan flag lewat hotspot terhubung (201, callback 1 kali, 1 request)", () => {
    const staging = hasilClient(bagC, "localhost:18190/akun/419");
    expect(staging).toMatchObject({ hasil: "ditolak", jenis: "handshake" });
    const flagStaging = bagC.split("\n").find((b) => b.startsWith("$ client --mode=terima-semua") && b.includes("localhost:18190/akun/419"))!;
    expect(flagStaging).toBeDefined();
    const jawabFlag = JSON.parse(bagC.split("\n")[bagC.split("\n").indexOf(flagStaging) + 1]!) as { hasil: string; status: number; callback_dipanggil: number };
    expect([jawabFlag.hasil, jawabFlag.status, jawabFlag.callback_dipanggil]).toEqual(["terhubung", 200, 1]);
    const hotspot = hasilClient(bagC, "localhost:18192/kiriman");
    expect([hotspot.hasil, hotspot.status, hotspot.callback_dipanggil]).toEqual(["terhubung", 201, 1]);
    expect(bagC).toContain("# proxy Dimas melihat: handshake ya, request terbaca 1");
    expect(bagC).toContain("# Authorization yang dibaca proxy sama dengan token sesi Budi: ya");
    expect(bagC).toContain(`# body dari app:      {"ke_nomor_karyawan":"${NOMOR_CITRA}","nominal":${NOMINAL_APP},"catatan":"patungan"}`);
    expect(bagC).toContain(`# body diteruskan:    {"catatan":"patungan","ke_nomor_karyawan":"${NOMOR_DIMAS}","nominal":${NOMINAL_UBAH}}`);
    expect(bagC).toContain("# C1. Kenapa flag ada: server staging memakai sertifikat dari CA buatan sendiri (CA Staging), yang tidak ada di daftar akar app.");
    harus("Server staging memakai sertifikat dari CA buatan sendiri, yang tidak ada di daftar akar app, jadi validasi menolaknya:");
    harus("Client yang membawa flag menerima sertifikat tiruan. Callback dipanggil 1 kali, dan hotspot membaca header Authorization yang sama dengan token Budi:");
  });
  test("bagian C dan E: tabel database memuat satu jurnal dengan dua posting yang berjumlah nol (Budi minus nominal, Dimas plus nominal), dan jawaban kiriman 201 menyebut saldo dan sisa batas", () => {
    for (const bag of [bagC, bagE]) {
      const baris = [...bag.matchAll(/^ (\d+)\s+\| (K\d+)\s+\| (-?\d+)$/gm)].map((m) => [m[1], m[2], Number(m[3])] as [string, string, number]);
      expect(baris).toEqual([["10001", "K00419", -NOMINAL_UBAH], ["10001", NOMOR_DIMAS, NOMINAL_UBAH]]);
      expect(baris.reduce((s, b) => s + b[2], 0)).toBe(0);
      const jawab = cocok(bag, /\{"id":10001,"saldo":(\d+),"sisa_batas_harian":(\d+)\}/);
      expect(Number(jawab[1])).toBe(SALDO_AKHIR);
      expect(Number(jawab[2]) + NOMINAL_UBAH).toBe(BATAS_HARIAN);
    }
    expect(seedGo).toMatch(/\(419, 'karyawan', 'Budi', 'budi@lestari\.example', \$1, 'K00419', 1\)/);
    expect(seedGo).toContain(`(417, 'karyawan', 'Dimas', 'dimas@lestari.example', $1, '${NOMOR_DIMAS}', 1)`);
    expect(seedGo).toContain(`(504, 'karyawan', 'Citra', 'citra@lestari.example', $1, '${NOMOR_CITRA}', 1)`);
  });
  test("bagian D: validasi aktif dengan CA Dimas di daftar akar terhubung (201), hotspot membaca 1 request dan nominal diubah; cara CA sampai di sana Tidak dijalankan", () => {
    const d = hasilClient(bagD, "--percaya=ca-publik+ca-dimas");
    expect([d.hasil, d.status]).toEqual(["terhubung", 201]);
    expect(d).not.toHaveProperty("callback_dipanggil");
    expect(bagD).toContain("# proxy Dimas melihat: handshake ya, request terbaca 1");
    expect(bagD).toContain("# body diteruskan:    ");
    expect(bagD).toContain("Bagaimana CA itu sampai di sana (profil dipasang di HP, CA yang salah menerbitkan): Tidak dijalankan.");
    expect(readmeLab).toContain("Bagaimana CA Dimas bisa sampai di daftar akar (profil dipasang di HP, CA yang salah menerbitkan): Tidak dijalankan.");
    harus("Bagaimana sebuah CA bisa masuk daftar akar (profil yang dipasang di HP, atau CA yang salah menerbitkan) Tidak dijalankan di lab. Cara menahannya ada di [[t3-tls-pinning]].");
    harus("Validasi lolos, hotspot membaca token, dan nominal diubah.");
  });
  test("bagian E: app dengan flag membuka saldo lewat hotspot (200, saldo awal, callback 1 kali, 1 request GET); Dimas memakai token (201) langsung ke server; riwayat Budi memuat satu kiriman keluar ke Dimas", () => {
    const g = hasilClient(bagE, "localhost:18192/akun/419");
    expect([g.hasil, g.status, g.callback_dipanggil]).toEqual(["terhubung", 200, 1]);
    expect((g.isi as { saldo: number; nama: string }).saldo).toBe(SALDO_AWAL);
    expect((g.isi as { nama: string }).nama).toBe("Budi");
    expect(bagE).toContain("# proxy membaca: GET /akun/419 Authorization: Bearer <token sesi Budi>");
    expect(bagE).toContain("# proxy Dimas melihat: handshake ya, request terbaca 1");
    expect(bagE).toContain("# Dimas memakai token itu sendiri, dari laptopnya, langsung ke server: transfer Rp150.000 ke dirinya.");
    const kirim = cocok(bagE, /^\$ curl -i -X POST '\/kiriman' -H 'Authorization: Bearer <token sesi Budi>' -d '(\{.*\})'$/m)[1]!;
    expect(JSON.parse(kirim)).toEqual({ ke_nomor_karyawan: NOMOR_DIMAS, nominal: NOMINAL_UBAH, catatan: "uji lapangan" });
    expect(bagE).toMatch(/\$ curl -i -X POST '\/kiriman'[^\n]*\nHTTP\/1\.1 201 Created\n/);
    const riwayat = JSON.parse(cocok(bagE, /^(\{"berikutnya":.*\})$/m)[1]!) as { riwayat: { jenis: string; arah: string; lawan: string; jumlah: number; nominal: number }[] };
    expect(riwayat.riwayat).toHaveLength(1);
    expect(riwayat.riwayat[0]).toMatchObject({ jenis: "transfer", arah: "keluar", lawan: "Dimas", jumlah: NOMINAL_UBAH, nominal: NOMINAL_UBAH });
    // klaim negatif berlingkup: bagian E dan seluruh m26.txt tidak memuat login; login lewat hotspot tidak direkam di bagian_m26.py
    expect(bagE).not.toMatch(/login/i);
    expect(rekaman).not.toMatch(/\/login/);
    expect(bagianM26).not.toMatch(/login/i);
    expect(umumPy).toContain('"""Schema dan data baru, server api-t3. Mengembalikan token sesi Budi (login langsung ke server, di jaringan aman)."""');
    expect(bagianM26).toContain('rekam = U.baru_berkas("e.jsonl")');
    harus("Bagian E tidak memuat permintaan login. Dimas hanya mengirim token. Password ikut terbaca bila Budi login lewat hotspot itu, karena hotspot membaca body request (penalaran; lab tidak merekam login lewat hotspot).");
    harus("Token Budi dibuat dengan login langsung ke server.");
    expect(mitmGo).toContain('cat := map[string]any{"jenis": "request", "metode": r.Method, "path": r.URL.Path, "authorization": r.Header.Get("Authorization"), "body": string(body)}');
  });
  test("laptop Dimas dan riwayat Budi di bagian E: curl langsung ke api-t3 (port bawaan d.curl), tanpa server tepi TLS dan tanpa hotspot; halaman menyebutnya", () => {
    const dimas = bagianM26.split("\n").find((b) => b.includes("d.curl(\"POST\", \"/kiriman\", '{\"ke_nomor_karyawan\":\"K00417\""))!;
    const riw = bagianM26.split("\n").find((b) => b.includes("d.curl(\"GET\", \"/akun/419/riwayat?batas=1\""))!;
    expect(dimas).toBeDefined();
    expect(riw).toBeDefined();
    expect(dimas).not.toMatch(/port=/);
    expect(riw).not.toMatch(/port=/);
    expect(dasarT3).toMatch(/def curl\(method, path, body=None, token=None, jenis="application\/json", tampil=True, tampil_body=None, port=PORT,/);
    expect(dasarT3).toContain('cmd = ["curl", "-s", "-i", "-X", method, f"http://127.0.0.1:{port}{path}"]');
    expect(umumPy).toContain("PORT_MITM_PLACEHOLDER".replace("PORT_MITM_PLACEHOLDER", 'DASAR = {"tepi": 18190, "tepi_http": 18191, "mitm": 18192, "mitm_polos": 18193}'));
    harus("Rekaman memerankan laptopnya dengan curl langsung ke `api-t3`, tanpa server tepi.");
    harus("Rekaman mengambil riwayat itu dengan token Budi langsung dari server, bukan dari app.");
  });
  test("bagian A: tanpa TLS, hotspot meneruskan HTTP biasa: kiriman 201, nominal diubah, saldo Budi dari saldo awal ke saldo akhir", () => {
    expect(bagA).toContain("lewat HTTP biasa (port 18193: proxy hotspot Dimas, bukan server)");
    expect(bagA).toMatch(/\$ curl -i -X POST '\/kiriman'[^\n]*\nHTTP\/1\.1 201 Created\n/);
    expect(bagA).toContain("# proxy Dimas melihat: handshake tidak, request terbaca 1");
    expect(bagA).toContain(`# body diteruskan:    {"catatan":"patungan","ke_nomor_karyawan":"${NOMOR_DIMAS}","nominal":${NOMINAL_UBAH}}`);
    harus("**Tanpa TLS tidak ada yang perlu dilewati.** Bagian A merekam hotspot yang meneruskan HTTP biasa.");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, dan judulnya menyebut berkas, nomor baris, dan bagian yang sama", () => {
    const rekJudul = (a: number, z: number, ket: string) => `Rekaman lab: ${REK} baris ${a} sampai ${z} (${ket})`;
    expect(tagSnippet()).toEqual([
      { berkas: REK, lines: `${SB0}:${SB1}`, judul: rekJudul(SB0, SB1, "bagian B, validasi aktif menolak hotspot") },
      { berkas: REK, lines: `${SC10}:${SC11}`, judul: rekJudul(SC10, SC11, "bagian C, staging ditolak validasi") },
      { berkas: CLIENT, lines: `${K0}:${K1}`, judul: `Kode lab: ${CLIENT} baris ${K0} sampai ${K1} (flag: callback selalu true)` },
      { berkas: REK, lines: `${SE0}:${SE1}`, judul: rekJudul(SE0, SE1, "bagian E, app dengan flag membuka saldo lewat hotspot") },
      { berkas: REK, lines: `${SF0}:${SF1}`, judul: rekJudul(SF0, SF1, "bagian E, Dimas memakai token dan isi database") },
      { berkas: REK, lines: `${SG0}:${SG1}`, judul: rekJudul(SG0, SG1, "bagian E, riwayat Budi") },
      { berkas: REK, lines: `${SC20}:${SC21}`, judul: rekJudul(SC20, SC21, "bagian C, hotspot mengubah transfer dan isi database") },
      { berkas: REK, lines: `${SD0}:${SD1}`, judul: rekJudul(SD0, SD1, "bagian D, CA Dimas ada di daftar akar") },
    ]);
    expect(badan).toContain('<Snippet file="labs/t3-mitm/dart/bin/client.dart" lines="109:114" lang="dart"'.replace("109:114", `${K0}:${K1}`));
    // urutan di rekaman: B < C1 < C2 < D < E, dan di dalam E: GET < Dimas < riwayat
    expect(SB1).toBeLessThan(SC10); expect(SC11).toBeLessThan(SC20); expect(SC21).toBeLessThan(SD0); expect(SD1).toBeLessThan(SE0);
    expect(SE1).toBeLessThan(SF0); expect(SF1).toBeLessThan(SG0);
    // kepala rekaman (baris 1 sampai 4, memuat nomor keputusan di baris 3) tidak ikut tampil
    expect(Math.min(SB0, SC10, SC20, SD0, SE0, SF0, SG0)).toBeGreaterThan(6);
    expect(M.b[2]).toMatch(/keputusan \d+/);
  });
  test("kode client: terima-semua memasang badCertificateCallback yang selalu true (lima baris sesudah case); validasi tidak memasangnya; daftar akar hanya CA yang disebut", () => {
    const kode = potongKode(clientDart, K0, K1);
    expect(kode.split("\n").map((b) => b.trim())).toEqual([
      "case 'terima-semua':", "klien = HttpClient(context: ctx)", "..badCertificateCallback = (cert, host, port) {", "dipanggil++;", "return true;", "};",
    ]);
    expect(kode).not.toMatch(/^\s*\/\//m);
    const validasi = clientDart.slice(clientDart.indexOf("case 'validasi':"), clientDart.indexOf("case 'terima-semua':"));
    expect(validasi.trim()).toBe("case 'validasi':\n          klien = HttpClient(context: ctx);");
    expect(clientDart).toContain("final c = SecurityContext(withTrustedRoots: false);");
    expect(clientDart).toContain('//   terima-semua      badCertificateCallback selalu true: flag "terima sertifikat apa pun" dari build staging (M26)');
    harus("Lab memerankan flag dengan `badCertificateCallback`, fungsi yang Dart panggil saat sertifikat tidak bisa diautentikasi. Fungsi itu selalu mengembalikan `true`:");
  });
  test("proxy lab: mengubah hanya POST /kiriman, hanya bila diberi aturan, dan hanya mendengar dan meneruskan ke loopback; aturan ubah dipakai m26 (nominal dan nomor Dimas)", () => {
    expect(mitmGo).toContain('if r.Method == "POST" && r.URL.Path == "/kiriman" {');
    expect(mitmGo).toContain('flag.Int64("ubah-nominal", 0, "ganti nominal POST /kiriman")');
    expect(mitmGo).toContain("if nominal == 0 && ke == \"\" {");
    expect(mitmGo).toContain("for _, a := range []string{*alamat, *hulu} {");
    expect(mitmGo).toContain("pagar.Loopback(a)");
    expect(bagianM26).toContain("U.mulai_mitm(rekam, tls=False, ubah=UBAH)");
    expect(umumPy).toContain('cmd += ["-ubah-nominal", str(ubah[0]), "-ubah-ke", ubah[1]]');
    expect(readmeLab).toContain("Proxy dan server tepi hanya mau mendengar dan meneruskan ke loopback");
    harus("Semuanya berjalan di satu mesin, dan proxy serta server tepi hanya mendengar di alamat loopback.");
    harus("Proxy diberi aturan mengubah transfer: itu aturan lab, bukan sifat setiap proxy.");
    harus("Hotspot yang sama bisa mengubah transfer yang sedang lewat. Di bagian C, hotspot lab diberi aturan: transfer Rp10.000 ke Citra diganti menjadi Rp150.000 ke Dimas.");
  });
  test("baris rekaman yang tampil dikunci utuh dengan sidik jari (tujuh rentang): rekaman direkam ulang dari database bersih, jadi ubah sidiknya hanya sesudah membaca perbedaannya", () => {
    expect(tampil().map(sidik)).toEqual(SIDIK_REKAMAN_TAMPIL);
  });
  test("baris rekaman yang tampil hanya berawalan # bila itu catatan hasil pengamatan proxy atau catatan yang dijaga assertion lab; tanpa ID, nomor keputusan, atau PR", () => {
    const sah = [
      /^# proxy Dimas melihat: handshake (ya|tidak), request terbaca \d+$/,
      /^# proxy membaca: (GET|POST) \/\S+ Authorization: Bearer <token sesi Budi>$/,
      /^# body dari app: {6}\{.*\}$/,
      /^# body diteruskan: {4}\{.*\}$/,
      /^# Authorization yang dibaca proxy sama dengan token sesi Budi: ya$/,
    ];
    const tulisanTangan = [
      "# Sama, tetapi lewat hotspot Dimas: proxy memalsukan sertifikat dengan CA Dimas, yang tidak ada di daftar akar app.",
      "# Database: tidak ada transfer (0 baris di jurnal.jenis = 'transfer').",
      "# Yang tercatat di database server:",
    ];
    const semua = tampil().join("\n").split("\n").filter((b) => b.startsWith("#"));
    for (const b of semua) expect(sah.some((r) => r.test(b)) || tulisanTangan.includes(b), b).toBe(true);
    expect(semua.filter((b) => tulisanTangan.includes(b))).toEqual(tulisanTangan);
    // tiap catatan tulisan tangan dijaga assertion di skrip lab
    expect(bagianM26).toContain('catat("# Sama, tetapi lewat hotspot Dimas: proxy memalsukan sertifikat dengan CA Dimas, yang tidak ada di daftar akar app.")');
    expect(bagianM26).toContain('catat("# Database: tidak ada transfer (0 baris di jurnal.jenis = \'transfer\').")');
    expect(bagianM26).toContain('catat("# Yang tercatat di database server:")');
    expect(bagianM26).toContain("U.lihat_mitm(rekam, token)");
    expect(umumPy).toContain('harap(all(x["authorization"] == f"Bearer {token}" for x in rq), True, "Authorization yang dibaca proxy sama dengan token Budi")');
    for (const t of tampil()) {
      expect(t).not.toMatch(POLA_ID_INTERNAL);
      expect(t).not.toMatch(/\b[A-G]\d\b/);
    }
    expect(potongKode(clientDart, K0, K1)).not.toMatch(POLA_ID_INTERNAL);
  });
});

describe("kode api-t3: sesi, umur sesi, dan pemeriksaan token", () => {
  test("repo.Sesi hanya berisi akun, jenis, dan hash CSRF; SesiAktif memakai hash token, kedaluwarsa, dan status akun; tanpa alamat atau perangkat (klaim negatif berlingkup repo.go)", () => {
    const struktur = cocok(repoGo, /type Sesi struct \{\n([\s\S]*?)\n\}/)[1]!;
    expect([...struktur.matchAll(/^\t(\w+)\s+\w+/gm)].map((m) => m[1])).toEqual(["AkunID", "Jenis", "CsrfHash"]);
    const aktif = repoGo.slice(repoGo.indexOf("func (r Repo) SesiAktif("), repoGo.indexOf("func (r Repo) HapusSesi("));
    expect(aktif).toContain("SELECT s.akun_id, s.jenis, s.csrf_hash FROM sesi s JOIN akun a ON a.id = s.akun_id");
    expect(aktif).toContain("WHERE s.token_hash = $1 AND s.kedaluwarsa > $2 AND NOT a.wajib_ganti_password`, tokenHash, kini)");
    expect(struktur + aktif).not.toMatch(/RemoteAddr|alamat|perangkat|user.?agent|\bip\b/i);
    expect(repoGo.match(/type Sesi struct/g)).toHaveLength(1);
  });
  test("Periksa menerima hanya token (service), dan handler hanya meneruskan token; hash token yang dicari; umur sesi bawaan 8 jam", () => {
    expect(sesiGo).toContain("func (s Service) Periksa(ctx context.Context, token string) (repo.Sesi, error) {");
    expect(sesiGo).toContain("x, err := s.repo.SesiAktif(ctx, hashToken(token), s.kini())");
    expect(sesiGo).toContain("// Periksa mengembalikan sesi pemilik token (akun, jenis app atau web, hash CSRF), atau ErrSesiTidakSah.");
    expect(handlerGo).toContain("sesi, err := s.svc.Periksa(r.Context(), token)");
    expect(mainGo).toContain('umurSesi := flag.Duration("umur-sesi", 8*time.Hour, "masa berlaku sesi (asumsi: satu hari kerja)")');
    const jam = Number(cocok(mainGo, /flag\.Duration\("umur-sesi", (\d+)\*time\.Hour/)[1]);
    expect(hal127).toContain(`token acak yang berlaku ${jam} jam`);
    harus(`Sesi api-t3 berlaku ${jam} jam secara bawaan, sama dengan yang ditulis [[B5.1]]. Logout dan ganti password menghapus barisnya lebih awal (dibaca dari kode lab, Tidak dijalankan di bagian ini).`);
    // sesi berakhir lebih awal: logout menghapus satu baris, ganti password menghapus semua sesi akun (klaim "sampai sesinya habis" salah)
    const gantiPw = repoGo.slice(repoGo.indexOf("func (r Repo) GantiPassword("), repoGo.indexOf("// --8<-- [start:sesi]"));
    expect(gantiPw).toContain("`DELETE FROM sesi WHERE akun_id = $1`");
    expect(repoGo).toContain("`DELETE FROM sesi WHERE token_hash = $1`");
    expect(sesiGo).toContain("return s.repo.HapusSesi(ctx, hashToken(token))");
    expect(handlerGo).toContain("s.svc.Logout(r.Context(), token)");
    expect(hal127).toContain("Logout menghapus barisnya, dan token yang sama langsung ditolak");
    harus("**Token berguna sampai sesinya berakhir.**");
    expect(badan).not.toMatch(/sampai sesinya habis/);
    harus("Pemeriksaan token di api-t3 hanya menerima token, mencari hash-nya di tabel sesi yang belum kedaluwarsa, dan mengembalikan akun, jenis sesi, dan hash CSRF.");
    harus("Objek sesi itu tidak memuat alamat atau perangkat pengirim. Karena itu pemeriksaan tidak membedakan laptop Dimas dari HP Budi (dibaca dari kode lab, Tidak dijalankan di halaman ini).");
  });
});

describe("sumber luar: dokumentasi Dart dan OWASP MASWE-0027, baris riset R3-215 dan R3-216", () => {
  const r215 = barisRiset("R3-215");
  const r216 = barisRiset("R3-216");
  test("tautan eksternal hanya dua, keduanya ada di baris riset dengan tanggal akses yang sama dengan halaman", () => {
    const url = [...badan.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]!);
    expect(url).toEqual(["https://api.dart.dev/stable/dart-io/HttpClient/badCertificateCallback.html", "https://mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/"]);
    expect(r215).toContain("api.dart.dev/stable/dart-io/HttpClient/badCertificateCallback.html");
    expect(r216).toContain("mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/");
    const tanggal = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(tanggal).toEqual(["2026-10-27", "2026-10-27"]);
    for (const r of [r215, r216]) expect(r).toContain(`dibuka ${tanggal[0]} dengan curl`);
    expect(hitung(badan, "Tidak dijalankan).")).toBeGreaterThanOrEqual(2);
  });
  test("R3-215: halaman Dart 3.13.7; null menolak, true menerima, false menolak; halaman menulis tiga hal itu apa adanya", () => {
    const versi = cocok(r215, /halaman API Dart (\d+\.\d+\.\d+)/)[1]!;
    harus(`[dokumentasi API Dart ${versi}](https://api.dart.dev/stable/dart-io/HttpClient/badCertificateCallback.html)`);
    expect(r215).toContain("cannot be authenticated by any of our trusted root certificates");
    expect(r215).toContain("bila nilainya null, sertifikat buruk ditolak");
    expect(r215).toContain("bila callback mengembalikan true, koneksi aman diterima");
    harus("Menurut dokumentasi Dart, callback itu menentukan nasib sertifikat yang tidak bisa diautentikasi oleh akar tepercaya mana pun. Bila callback mengembalikan `true`, koneksi aman diterima. Bila callback tidak diisi (`null`), sertifikat ditolak");
    expect(r215).toContain("Lab `t3-mitm` client.dart mode `terima-semua` memasang callback yang selalu true");
    expect(r215).toContain("Dart 3.11.4, halaman dokumentasi Dart 3.13.7");
    expect(M.b[3]).toContain("Dart 3.11.4");
  });
  test("R3-216: MASWE-0027 (MASVS-NETWORK-1, CWE-295): mematikan validasi untuk pengembangan lalu ke produksi, dampak token sesi dan peniruan user; halaman tidak menyalin kalimat Inggris", () => {
    for (const k of ["Insecure Certificate Validation", "MASVS-NETWORK-1", "CWE-295", "Disabling Certificate Validation", "tanpa nomor versi"]) expect(r216, k).toContain(k);
    expect(r216).toContain("mempermudah pengembangan atau menelusuri masalah koneksi, lalu mengirim konfigurasi itu ke produksi");
    expect(r216).toContain("penangkapan kredensial atau token sesi di jaringan yang berakibat peniruan user");
    harus("OWASP mencatat kelemahan ini sebagai MASWE-0027, validasi sertifikat yang tidak aman. Salah satu cara masuknya persis seperti di sini: validasi dimatikan untuk mempermudah pengembangan, lalu konfigurasi itu terbawa ke produksi. Dampak yang ditulis OWASP termasuk token sesi yang terbaca di jaringan. Orang lain lalu bisa meniru user");
    expect(badan).not.toMatch(/Disabling|Insecure Certificate|session tokens|simplify development/);
    expect(r216).toContain("tidak menyebut Flutter atau Dart");
    harus("**Untuk app mobile**, OWASP mencatat");
    expect(badan).not.toContain("Untuk app Flutter");
    harus("tanpa nomor versi, Tidak dijalankan)");
  });
  test("baris riset R3-215 dan R3-216 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya; ID urut tanpa ganda", () => {
    expect(sidik(r215)).toBe(SIDIK_R215);
    expect(sidik(r216)).toBe(SIDIK_R216);
    const id = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R3-(\d+) \|/)![1]));
    const utama = id.slice(0, id.indexOf(216) + 1);
    expect(new Set(utama).size).toBe(utama.length);
    expect(utama).toEqual([...utama].sort((a, b) => a - b));
    expect(riset.split("\n").filter((b) => b.startsWith("| R3-215 |"))).toHaveLength(1);
    expect(riset.split("\n").filter((b) => b.startsWith("| R3-216 |"))).toHaveLength(1);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca (halaman, diagram, skenario, kartu)", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string }[]).filter((k) => k.halaman === "t3-m26");
    for (const t of [badan, frontmatter, JSON.stringify(diagramMentah), skenarioMentah, JSON.stringify(kartu)]) {
      expect(t).not.toMatch(POLA_ID_INTERNAL);
      expect(t.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d\b/);
      expect(t.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\d B\b|\bB\d+\b/);
    }
    expect(badan.match(/\[\[([A-G]\d)\]\]/g)).toEqual(["[[A0]]"]); // satu-satunya ID halaman bergaya A0: arti label
  });
  test("label sumber: arti ditaut ke A0 di Gejala; Ilustrasi, Asumsi, dan Tidak dijalankan dipakai tepat; Rekaman lab hanya untuk berkas rekaman m26.txt", () => {
    harus("Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    expect(hitung(badan, "[[A0]]")).toBe(1);
    expect(hitung(badan, "Tidak dijalankan")).toBe(HITUNG_TIDAK_DIJALANKAN);
    expect(hitung(badan, "(Ilustrasi")).toBe(2); // Angka cerita dan Kondisi rekaman (Ilustrasi mekanisme)
    expect(hitung(badan, "Asumsi")).toBe(2); // arti label dan nomor versi app 3.1
    expect(hitung(badan, "(penalaran")).toBe(1);
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
    expect(hitung(badan, "dibaca dari kode lab")).toBe(3); // pemeriksaan token, umur sesi, dan Cek diri 4
    for (const s of badan.matchAll(/Rekaman lab: ([^ ]+)/g)) expect(s[1]).toBe(REK);
    for (const s of badan.matchAll(/Kode lab: ([^ ]+)/g)) expect(s[1]).toBe(CLIENT);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("tiga baris: app dengan flag lewat hotspot (E), app yang memeriksa sertifikat (B), memeriksa tetapi CA Dimas dipercaya (D)", () => {
    const e = hasilClient(bagE, "localhost:18192/akun/419");
    const b = hasilClient(bagB, "localhost:18192/kiriman");
    const harapan = {
      id: "t3-m26-transfer-bukan-budi",
      judul: `Transfer ${rupiah(NOMINAL_UBAH)} yang bukan dari Budi`,
      sumber: { jenis: "rekaman", teks: "Rekaman lab t3-mitm · m26.txt bagian B, D, dan E; hotspot, laptop Dimas, dan build rilis diperankan" },
      baris: [
        {
          label: "App dengan flag, lewat hotspot", sub: "bagian E",
          simpul: [
            { teks: "Flag: terima sertifikat apa pun", sub: `callback dipanggil ${e.callback_dipanggil} kali`, nada: "biasa", kode: false },
            { teks: "Hotspot membaca token Budi", sub: "sama dengan token sesi", nada: "biasa", kode: false },
            { teks: "Token dipakai dari laptop Dimas", sub: "tanpa password", nada: "biasa", kode: false },
            { teks: `Transfer ${rupiah(NOMINAL_UBAH)} tercatat`, sub: "201, dua posting seimbang", nada: "warn", kode: false },
          ],
        },
        {
          label: "App yang memeriksa sertifikat", sub: "bagian B",
          simpul: [
            { teks: "Hanya CA Lab Publik dipercaya", sub: "CA Dimas tidak ada", nada: "biasa", kode: false },
            { teks: "Handshake ditolak", sub: String(b.alasan), nada: "biasa", kode: false },
            { teks: `Hotspot membaca ${cocok(bagB, /request terbaca (\d+)/)[1]} request`, nada: "biasa", kode: false },
            { teks: "Database tanpa transfer", sub: `${cocok(bagB, /\((\d+) baris di jurnal/)[1]} baris`, nada: "good", kode: false },
          ],
        },
        {
          label: "Memeriksa, tetapi CA Dimas dipercaya", sub: "bagian D",
          simpul: [
            { teks: "CA Dimas ada di daftar akar", sub: "cara masuknya Tidak dijalankan", nada: "biasa", kode: false },
            { teks: "Validasi lolos", sub: "tanpa flag", nada: "biasa", kode: false },
            { teks: `Hotspot membaca ${cocok(bagD, /request terbaca (\d+)/)[1]} request`, sub: "nominal diubah", nada: "biasa", kode: false },
            { teks: `Transfer ${rupiah(NOMINAL_UBAH)} tercatat`, sub: String(hasilClient(bagD, "ca-dimas").status), nada: "warn", kode: false },
          ],
        },
      ],
      catatan: "Flag membuat app menerima sertifikat apa pun. Validasi yang aktif menahan CA yang tidak dikenal, tetapi tidak menahan CA yang sudah ada di daftar akar.",
    };
    expect(diagram).toEqual(harapan);
    expect(bagD).toContain(`# body diteruskan:    {"catatan":"patungan","ke_nomor_karyawan":"${NOMOR_DIMAS}","nominal":${NOMINAL_UBAH}}`);
    expect(bagE).toContain("# Authorization yang dibaca proxy sama dengan token sesi Budi: ya");
  });
  test("diagram dikunci dengan sidik jari (setiap nilai string) dan tampil dengan Rantai biasa di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK_DIAGRAM);
    const sebenarnya = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(sebenarnya).toContain("<Rantai data={transferBukanBudi} />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan).toContain('import transferBukanBudi from "../../../../data/diagram/t3-m26-transfer-bukan-budi.json";');
  });
});

describe("widget alur t3-m26: skenario valid, nilai dari rekaman, tebakan, dan tanpa JavaScript", () => {
  const langkah = skenario.langkah;
  const varian = skenario.varian.langkah;
  const isiE = (id: string): string => JSON.stringify(hasilClient(bagE, id).isi);
  const jsonKirim = JSON.parse(cocok(bagE, /^\$ curl -i -X POST '\/kiriman'[^\n]*-d '(\{.*\})'$/m)[1]!) as object;
  const jawabKirim = cocok(bagE, /HTTP\/1\.1 201 Created\nContent-Type: application\/json\nLocation: \/transfers\/10001\n\n(\{.*\})/)[1]!;
  const riwayat = cocok(bagE, /^(\{"berikutnya":.*\})$/m)[1]!;
  test("skenario lolos alur-core (komponen, predict, sumber), 6 langkah utama dan 4 varian mulai dari awal, file rekaman ada dan sama dengan rekaman yang dikutip halaman", () => {
    const d = core.normalize(JSON.parse(skenarioMentah));
    expect(core.validate(d, { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(langkah).toHaveLength(6);
    expect(varian).toHaveLength(4);
    expect(skenario.varian.mulai).toBe(0);
    expect(core.steps(d, true)).toHaveLength(4);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: REK, fileVarian: REK });
    expect(skenario.sumber.catatan).toContain("Jalur utama: m26.txt bagian E. Ubah satu hal: m26.txt bagian B.");
    expect(skenario.sumber.catatan).toContain("PostgreSQL 17.11");
    expect(skenario.sumber.catatan).toContain("Dart 3.11.4");
    expect(skenario.sumber.catatan).toContain("Teks di layar HP adalah pilihan penulis: lab tidak punya app Flutter. Jam 12.15 di layar adalah Ilustrasi: naskah tidak menyebut jam.");
    expect(skenario.komponen.map((k) => k.id)).toEqual(["client", "hotspot", "api", "dimas"]);
    expect(skenario.perangkat).toEqual([{ id: "budi", label: "HP Budi" }]);
    for (const l of [...langkah, ...varian]) {
      expect(skenario.komponen.map((k) => k.id)).toContain(l.dari);
      if (l.ke) expect(skenario.komponen.map((k) => k.id)).toContain(l.ke);
    }
  });
  test("kirim jalur utama diturunkan dari rekaman E: token, isi, jawaban 200 saldo awal, transfer Dimas, jawaban 201, dan riwayat", () => {
    expect(langkah.map((l) => [l.dari, l.ke])).toEqual([["client", "hotspot"], ["client", "hotspot"], ["hotspot", "api"], ["dimas", "api"], ["api", "dimas"], ["client", "api"]]);
    expect(langkah[0]!.kirim).toBe("TLS handshake\nsertifikat server: ditandatangani CA Dimas");
    expect(langkah[1]!.kirim).toBe("GET /akun/419\nAuthorization: Bearer <token sesi Budi>");
    expect(bagE).toContain("# proxy membaca: GET /akun/419 Authorization: Bearer <token sesi Budi>");
    expect(langkah[2]!.kirim).toBe(`GET /akun/419\n→ 200 ${isiE("localhost:18192/akun/419")}`);
    expect(langkah[3]!.kirim).toBe(`POST /kiriman\nAuthorization: Bearer <token sesi Budi>\n${JSON.stringify(jsonKirim)}`);
    expect(langkah[4]!.kirim).toBe(`201 Created\n${jawabKirim}`);
    expect(langkah[5]!.kirim).toBe(`GET /akun/419/riwayat?batas=1\n→ 200 ${riwayat}`);
    expect(langkah[1]!.jelas).toContain("Hotspot membaca header Authorization: isinya sama dengan token sesi Budi (bagian E).");
    expect(langkah[0]!.jelas).toContain("callback dipanggil 1 kali (bagian E).");
    expect(langkah[3]!.jelas).toContain(`${NOMOR_DIMAS} adalah nomor karyawan Dimas.`);
    expect(langkah[4]!.jelas).toContain(`Budi −${(NOMINAL_UBAH).toLocaleString("id-ID")} dan Dimas +${(NOMINAL_UBAH).toLocaleString("id-ID")}, berjumlah nol (bagian E).`);
    expect(langkah[5]!.jelas).toContain("Rekaman mengambil riwayat langsung dari server, bukan lewat hotspot.");
    expect(langkah[2]!.jelas).toContain(`App menerima 200 dengan saldo ${rupiah(SALDO_AWAL)}`);
  });
  test("kirim varian diturunkan dari rekaman B: handshake ditolak, hotspot melihat handshake dan 0 request, 0 transfer", () => {
    expect(varian.map((l) => [l.dari, l.ke])).toEqual([["client", "hotspot"], ["client", undefined], ["hotspot", undefined], ["api", undefined]]);
    expect(varian[1]!.kirim).toBe(cocok(bagB, /^(\{"hasil":"ditolak","jenis":"handshake","alasan":"application verification failure"\})$/m)[1]);
    expect(varian[2]!.kirim).toBe("handshake: ya\nrequest terbaca: 0");
    expect(bagB).toContain("# proxy Dimas melihat: handshake ya, request terbaca 0");
    expect(varian[3]!.kirim).toBe("jurnal dengan jenis 'transfer'\n→ 0 baris");
    expect(bagB).toContain("(0 baris di jurnal.jenis = 'transfer')");
    expect(varian[0]!.jelas).toContain("App hanya percaya CA Lab Publik, yang memerankan CA yang dipercaya sistem.");
    expect(varian[1]!.jelas).toContain("App tidak mengirim request apa pun, jadi header Authorization tidak sampai ke hotspot.");
    expect(skenario.varian.label).toBe("app memeriksa sertifikat (tanpa flag)");
  });
  test("jam di bilah status HP selalu 12.15 (Ilustrasi) dan saldo di layar hanya saldo awal atau saldo akhir; layar akhir menunjukkan kiriman ke Dimas", () => {
    const waktu = [...skenarioMentah.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]);
    expect(waktu.length).toBeGreaterThanOrEqual(7); // layar awal, tiga langkah utama, dan dua langkah varian
    expect(new Set(waktu)).toEqual(new Set(["12.15"]));
    const saldo = [...skenarioMentah.matchAll(/"saldo": ?(\d+)/g)].map((m) => Number(m[1]));
    expect(new Set(saldo)).toEqual(new Set([SALDO_AWAL, SALDO_AKHIR]));
    const d = core.normalize(JSON.parse(skenarioMentah));
    const utama = core.steps(d, false);
    const akhir = core.layarAt(d, utama, utama.length - 1, "budi")!;
    expect(akhir.saldo).toBe(SALDO_AKHIR);
    expect(akhir.isi).toEqual([{ jenis: "baris", kiri: "Transfer ke Dimas", kanan: `−${rupiah(NOMINAL_UBAH)}`, nada: "warn" }]);
    expect(core.layarAt(d, utama, 3, "budi")!.saldo).toBe(SALDO_AWAL);
    expect(core.layarAt(d, utama, 4, "budi")!.saldo).toBe(SALDO_AWAL);
    const v = core.steps(d, true);
    expect(core.layarAt(d, v, 3, "budi")!.saldo).toBe(SALDO_AWAL);
    expect(core.layarAt(d, v, 1, "budi")!.isi).toEqual([{ jenis: "toast", teks: "Koneksi ditolak", nada: "warn" }]);
  });
  test("tebakan: jawaban benar di pilihan keempat (posisi tidak dipakai lebih dari sekali oleh tebakan alur Tahap 3 lain), bukan yang terpanjang atau terpendek; nilai dari rekaman E dan B", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(3);
    expect(p.varian).toBe(false);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(panjang[p.answer]).toBeGreaterThan(Math.min(...panjang));
    const status = cocok(bagE, /^\$ curl -i -X POST '\/kiriman'[^\n]*\nHTTP\/1\.1 (\d+) Created/m)[1];
    expect(p.options[p.answer]).toBe(`${status}: transfer dikerjakan, seperti request dari Budi`);
    expect(p.q).toBe(`Hotspot Dimas membaca header Authorization dari app Budi. Dari laptopnya, Dimas lalu mengirim POST /kiriman ${rupiah(NOMINAL_UBAH)} ke nomor karyawannya sendiri dengan token itu, tanpa password. Apa jawaban server?`);
    expect(p.options.slice(0, 3).map((o) => o.slice(0, 3))).toEqual(["401", "403", "429"]);
    expect(p.explain).toBe(`Server menjawab ${status} (m26.txt bagian E). Token itu sah, saldo cukup, dan batas harian tidak terlampaui. Di api-t3 token tidak terikat ke alamat atau perangkat: objeknya sesinya hanya berisi akun, jenis, dan hash CSRF (dibaca dari kode lab). Di jalur Ubah satu hal app memeriksa sertifikat, dan Dimas tidak mendapat token apa pun: hotspot membaca 0 request (bagian B).`.replace("objeknya sesinya", "objek sesinya"));
    const lain = fs.readdirSync(path.join(akar, "situs/lama/widgets/data/skenario")).filter((f) => /^t3-/.test(f) && f !== "t3-m26.json")
      .map((f) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${f}`)) as Skenario).predict?.answer).filter((x) => x !== undefined);
    expect(lain.filter((x) => x === p.answer).length).toBeLessThanOrEqual(1);
  });
  test("dipasang sekali di blok Coba sendiri, dengan SkripLama alur dan noscript yang menyebut hasil dari rekaman", () => {
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba sendiri">'), badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, "<WidgetLama ")).toBe(1);
    expect(coba).toContain('<WidgetLama nama="alur" src="data/skenario/t3-m26.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(hitung(badan, "<noscript>")).toBe(1);
    expect(coba).toContain("<noscript>");
    expect(coba).toContain(`transfer Dimas ${rupiah(NOMINAL_UBAH)} dijawab ${cocok(bagE, /HTTP\/1\.1 (\d+) Created/)[1]}.`);
    expect(coba).toContain("Pada app yang memeriksa sertifikat dan tidak mempercayai CA Dimas, handshake ditolak, hotspot membaca 0 request, dan database tidak memuat transfer.");
    expect(coba).toContain("**Ubah satu hal: app memeriksa sertifikat (tanpa flag)**. Rekamannya bagian B.");
  });
  test("teks widget dikunci dengan sidik jari (setiap nilai string)", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK_SKENARIO);
  });
});

describe("kartu Cek diri: empat kartu, sama dengan kartu.json", () => {
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const soal = [...cek.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-m26");
    expect(kartu.map((k) => k.id)).toEqual(["t3-m26-1", "t3-m26-2", "t3-m26-3", "t3-m26-4"]);
    soal.forEach((m, i) => {
      expect(kartu[i]!.tanya).toBe(m[2]);
      expect(kartu[i]!.jawab).toBe(m[3]);
      expect(kartu[i]!.judul).toBe("3.24 M26: Transfer yang tidak dibuat Budi");
      expect(kartu[i]!.url).toBe("tahap-3/m26-transfer-bukan-budi/");
    });
  });
  test("kartu 1 sampai 4 menyebut fakta yang sama dengan bagian B, C, D, E, dan kode", () => {
    const k = (n: number) => badan.slice(badan.indexOf(`**${n}.**`), badan.indexOf(`**${n + 1}.**`) > 0 ? badan.indexOf(`**${n + 1}.**`) : undefined);
    const rB = cocok(bagB, /request terbaca (\d+)/)[1];
    const rC = cocok(bagC, /request terbaca (\d+)/)[1];
    expect(k(1)).toContain(`Client yang memeriksa sertifikat: ${rB} request, karena CA Dimas tidak ada di daftar akarnya dan handshake ditolak (\`m26.txt\` bagian B). Client yang membawa flag: ${rC} request, karena callback dipanggil ${hasilClient(bagC, "localhost:18192/kiriman").callback_dipanggil} kali dan menerima sertifikat tiruan, jadi hotspot membaca request lengkap beserta header Authorization (bagian C).`);
    expect(k(2)).toContain(`Dimas mengirim transfer dengan token itu langsung ke server, dan server menjawab ${cocok(bagE, /HTTP\/1\.1 (\d+) Created/)[1]} (\`m26.txt\` bagian E). Bagian E tidak memuat password atau login.`);
    expect(k(3)).toContain(`Di bagian D validasi lolos dan hasilnya sama dengan flag: hotspot membaca ${cocok(bagD, /request terbaca (\d+)/)[1]} request dan nominalnya diubah.`);
    expect(k(3)).toContain("Cara CA itu sampai di daftar akar Tidak dijalankan di lab. Halaman Keamanan 6 membahas cara menahannya.");
    expect(k(4)).toContain("Token itu sah, saldo cukup, dan batas harian tidak terlampaui (`m26.txt` bagian E). Pemeriksaan token di api-t3 hanya memakai token, tanpa alamat atau perangkat pengirim (dibaca dari kode lab, Tidak dijalankan di halaman ini).");
    expect(bagE).not.toMatch(/password|login/i);
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor; satu tebakan details", () => {
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      const m = b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([[3, "Cek diri"]]);
    expect(badan.match(/^\d+\. /gm)).toBeNull();
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(entri(/<details class="question">\n<summary>Tebak dulu: [^\n]+<\/summary>/)).toBeTruthy();
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<details/g)).toHaveLength(5);
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (memuat Minggu 9, akun uji, Rp150.000, dan sertifikat apa pun)", () => {
    expect(frontmatter.trim().split("\n")).toEqual(FRONTMATTER);
    expect(FRONTMATTER[1]).toContain("Minggu 9.");
    expect(FRONTMATTER[1]).toContain("akun uji Budi turun Rp150.000");
    expect(FRONTMATTER[1]).toContain("menerima sertifikat apa pun");
    expect(FRONTMATTER[1]).toContain("Dimas memakainya dari laptopnya");
  });
});

// ---- nilai terkunci (dihasilkan dari berkas saat ini; ubah hanya sesudah membaca perbedaannya) -------------------------------
const HITUNG_TIDAK_DIJALANKAN = 9;
const SIDIK_REKAMAN_TAMPIL: string[] = ["77ed1f18c23e0b12","1b2fa48066c363f9","04d4d221161e4e1a","a52660f75101ee21","d6b4cfb6683378e7","0d44e6e002f471fb","4f02763220fa7a6e"];
const SIDIK_R215 = "697f9ff4cc73cf63";
const SIDIK_R216 = "f9cd24df9e2d9264";
const SIDIK_DIAGRAM = "0133fc18787f2129";
const SIDIK_SKENARIO = "46f16aadd86b3668";
const FRONTMATTER: string[] = [
  "title: \"3.24 M26: Transfer yang tidak dibuat Budi\"",
  "description: Minggu 9. Di kantin tenant mitra, saldo akun uji Budi turun Rp150.000 karena satu transfer ke Dimas yang tidak ia buat. App Budi menerima sertifikat apa pun, jadi hotspot Dimas membaca token Budi dan Dimas memakainya dari laptopnya.",
];
const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import transferBukanBudi from \"../../../../data/diagram/t3-m26-transfer-bukan-budi.json\";",
  "<p class=\"meta\">Baca 8 menit · coba 3 menit · Prasyarat: [[t3-xss-csrf]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 9 Tahap 3. Pak Hadi meminta uji lapangan di kantin tenant mitra di kota kelima, dengan akun uji. Budi memakai akun uji itu dan sedang makan di sana.",
  "Ia membuka app. Saldonya turun Rp150.000, dan di riwayat ada satu \"Transfer ke Dimas\" yang tidak ia buat.",
  "Budi memberi tahu Raka. Dimas bercerita bahwa ia memasang hotspot bernama sama dengan Wi-Fi kantin.",
  "*Angka cerita (Ilustrasi):* minggu 9, kota kelima, kantin tenant mitra, akun uji, dan permintaan Pak Hadi berasal dari naskah. Rp150.000 dan saldo Budi dari Rp250.000 ke Rp100.000 sama dengan rekaman lab di blok \"Yang sebenarnya\". Jam 12.15 di layar HP pada widget adalah Ilustrasi, karena naskah tidak menyebut jam. Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka mengira password Budi bocor. Dalam pikirannya, akun Budi hanya bisa dipakai orang yang tahu passwordnya, karena token baru ada sesudah login ([[B5.1]]).",
  "Ia juga mengira app Budi memeriksa sertifikat server. Saat app membuka koneksi HTTPS, server mengirim sertifikat, dan app memeriksanya pada tahap awal yang disebut handshake. Sertifikat itu ditandatangani certificate authority (CA), dan app hanya menerima CA yang ada di daftar akarnya (root store). Hotspot Dimas memakai sertifikat tiruan yang ditandatangani CA buatan Dimas, yang tidak ada di daftar itu.",
  "Kalau app memeriksa sertifikat, hotspot tidak bisa membaca apa pun, dan password bocor menjadi satu-satunya penjelasan. Lab menjalankan dugaan itu dengan app yang benar-benar memeriksa sertifikat, lewat hotspot yang sama.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: app yang memeriksa sertifikat mengirim satu transfer lewat hotspot Dimas. Berapa request yang terbaca hotspot?</summary>",
  "Nol. Di rekaman `m26.txt` bagian B, validasi menolak sertifikat hotspot saat handshake. Hotspot melihat handshake dan 0 request, dan database tidak memuat transfer.",
  "Dugaan Raka benar untuk app yang memeriksa sertifikat dan tidak mempercayai CA Dimas. Yang belum ia periksa adalah apakah app Budi memang begitu.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "App Budi menerima sertifikat apa pun. Hotspot Dimas membaca token Budi, dan Dimas memakainya untuk transfer Rp150.000 ke dirinya.",
  "<Rantai data={transferBukanBudi} />",
  "*Kondisi rekaman:* PostgreSQL 17.11, server Go `api-t3` di belakang server tepi TLS, dan client Dart 3.11.4 (`dart:io`) sebagai app Budi. Hotspot Dimas adalah proxy tiruan Go, yaitu program perantara yang meneruskan request ke server asli (Ilustrasi mekanisme). Token Budi dibuat dengan login langsung ke server.",
  "Semuanya berjalan di satu mesin, dan proxy serta server tepi hanya mendengar di alamat loopback. Hotspot diperankan dengan mengarahkan client ke port proxy dengan nama host yang sama, jadi routing Wi-Fi dan DNS Tidak dijalankan. Proxy diberi aturan mengubah transfer: itu aturan lab, bukan sifat setiap proxy.",
  "**App yang memeriksa sertifikat menolak hotspot.** Kontrol memakai client yang hanya percaya CA Lab Publik, yang memerankan CA yang dipercaya sistem. Langsung ke server tepi, client terhubung dan menerima jawaban 200. Lewat hotspot, handshake ditolak:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"33:39\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 33 sampai 39 (bagian B, validasi aktif menolak hotspot)\" />",
  "**Staging membutuhkan flag, dan flag ikut ke rilis.** Server staging memakai sertifikat dari CA buatan sendiri, yang tidak ada di daftar akar app, jadi validasi menolaknya:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"43:44\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 43 sampai 44 (bagian C, staging ditolak validasi)\" />",
  "Supaya staging bisa dipakai, Bayu meminta flag yang menerima sertifikat apa pun, dan Raka memasangnya. Flag itu tidak dicabut dari build rilis app 3.1. Bagian cerita itu Ilustrasi: lab tidak punya build Flutter, dan nomor versi 3.1 adalah Asumsi ([[t3-notifikasi]]).",
  "Lab memerankan flag dengan `badCertificateCallback`, fungsi yang Dart panggil saat sertifikat tidak bisa diautentikasi. Fungsi itu selalu mengembalikan `true`:",
  "<Snippet file=\"labs/t3-mitm/dart/bin/client.dart\" lines=\"109:114\" lang=\"dart\" title=\"Kode lab: labs/t3-mitm/dart/bin/client.dart baris 109 sampai 114 (flag: callback selalu true)\" />",
  "Menurut dokumentasi Dart, callback itu menentukan nasib sertifikat yang tidak bisa diautentikasi oleh akar tepercaya mana pun. Bila callback mengembalikan `true`, koneksi aman diterima. Bila callback tidak diisi (`null`), sertifikat ditolak ([dokumentasi API Dart 3.13.7](https://api.dart.dev/stable/dart-io/HttpClient/badCertificateCallback.html), dibuka 2026-10-27, Tidak dijalankan).",
  "**Dengan flag, hotspot membaca token.** Client yang membawa flag menerima sertifikat tiruan. Callback dipanggil 1 kali, dan hotspot membaca header Authorization yang sama dengan token Budi:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"87:91\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 87 sampai 91 (bagian E, app dengan flag membuka saldo lewat hotspot)\" />",
  "**Dimas memakai token itu.** Tanpa app Budi dan tanpa password, Dimas mengirim transfer dengan token yang terbaca. Rekaman memerankan laptopnya dengan curl langsung ke `api-t3`, tanpa server tepi. Server menjawab 201 dan mencatat satu jurnal dengan dua posting yang berjumlah nol:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"93:106\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 93 sampai 106 (bagian E, Dimas memakai token dan isi database)\" />",
  "Budi lalu membuka riwayatnya dan melihat satu kiriman keluar ke Dimas. Rekaman mengambil riwayat itu dengan token Budi langsung dari server, bukan dari app. Gejala itu cocok dengan bagian E, karena Budi tidak mengirim transfer apa pun:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"108:112\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 108 sampai 112 (bagian E, riwayat Budi)\" />",
  "**Hotspot juga bisa mengubah transfer Budi.** Hotspot yang sama bisa mengubah transfer yang sedang lewat. Di bagian C, hotspot lab diberi aturan: transfer Rp10.000 ke Citra diganti menjadi Rp150.000 ke Dimas. Request yang sampai ke server memuat nominal dan tujuan yang sudah diubah:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"49:64\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 49 sampai 64 (bagian C, hotspot mengubah transfer dan isi database)\" />",
  "**Pemeriksaan token tidak membedakan Dimas dari Budi.** Pada kedua jalur server menjawab 201. Pemeriksaan token di api-t3 hanya menerima token, mencari hash-nya di tabel sesi yang belum kedaluwarsa, dan mengembalikan akun, jenis sesi, dan hash CSRF.",
  "Objek sesi itu tidak memuat alamat atau perangkat pengirim. Karena itu pemeriksaan tidak membedakan laptop Dimas dari HP Budi (dibaca dari kode lab, Tidak dijalankan di halaman ini).",
  "**Dimas tidak memerlukan password.** Bagian E tidak memuat permintaan login. Dimas hanya mengirim token. Password ikut terbaca bila Budi login lewat hotspot itu, karena hotspot membaca body request (penalaran; lab tidak merekam login lewat hotspot).",
  "**Token berguna sampai sesinya berakhir.** Sesi api-t3 berlaku 8 jam secara bawaan, sama dengan yang ditulis [[B5.1]]. Logout dan ganti password menghapus barisnya lebih awal (dibaca dari kode lab, Tidak dijalankan di bagian ini).",
  "Berapa lama token sebaiknya berlaku dibahas di [[t3-tls-pinning]].",
  "**Validasi yang aktif belum cukup.** Menghapus flag perlu, tetapi bukan seluruh jawabannya. Di bagian D validasi tetap aktif, tetapi CA Dimas ada di daftar akar app:",
  "<Snippet file=\"labs/t3-mitm/output/m26.txt\" lines=\"68:74\" title=\"Rekaman lab: labs/t3-mitm/output/m26.txt baris 68 sampai 74 (bagian D, CA Dimas ada di daftar akar)\" />",
  "Validasi lolos, hotspot membaca token, dan nominal diubah. Bagaimana sebuah CA bisa masuk daftar akar (profil yang dipasang di HP, atau CA yang salah menerbitkan) Tidak dijalankan di lab. Cara menahannya ada di [[t3-tls-pinning]].",
  "**Tanpa TLS tidak ada yang perlu dilewati.** Bagian A merekam hotspot yang meneruskan HTTP biasa. Nominal diubah, server menjawab 201, dan saldo Budi turun dari Rp250.000 ke Rp100.000.",
  "**Yang tidak dijalankan.** Lab tidak menjalankan jaringan Wi-Fi nyata dan routing hotspot. Lab tidak menjalankan perangkat Android atau iOS, karena client lab adalah Dart di terminal macOS. HTTPS publik dengan CA yang dipercaya sistem dan app Flutter dengan flag di build rilis juga tidak dijalankan.",
  "**Untuk app mobile**, OWASP mencatat kelemahan ini sebagai MASWE-0027, validasi sertifikat yang tidak aman. Salah satu cara masuknya persis seperti di sini: validasi dimatikan untuk mempermudah pengembangan, lalu konfigurasi itu terbawa ke produksi. Dampak yang ditulis OWASP termasuk token sesi yang terbaca di jaringan. Orang lain lalu bisa meniru user ([halaman MASWE-0027](https://mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/), dibuka 2026-10-27, tanpa nomor versi, Tidak dijalankan).",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman bagian E dari hotspot sampai riwayat Budi. Tebak dulu apa jawaban server atas transfer Dimas, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t3-m26.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: app memeriksa sertifikat (tanpa flag)**. Rekamannya bagian B. Layar HP di widget digambar dari isi rekaman: lab tidak punya app Flutter.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: app dengan flag menerima sertifikat hotspot, hotspot membaca token Budi, dan transfer Dimas Rp150.000 dijawab 201.",
  "Pada app yang memeriksa sertifikat dan tidak mempercayai CA Dimas, handshake ditolak, hotspot membaca 0 request, dan database tidak memuat transfer. Rekaman lengkapnya ada di blok \"Yang sebenarnya\".",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-tls-pinning]]: validasi sertifikat yang selalu aktif, HSTS, pin dengan cadangan, dan token yang lebih pendek. Keputusannya ADR 31.",
  "- [[t3-prd]]: Sinta menulis risikonya di PRD v3, yaitu app dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo. M26 adalah kejadiannya.",
  "- [[B5.1]]: password dikirim sekali, lalu setiap request membawa token. Token yang terbaca bisa dipakai tanpa password sampai sesinya berakhir.",
  "- [[t3-xss-csrf]]: di M25 skrip Dimas berjalan dengan sesi Ani, dan di M26 hotspot Dimas membaca sesi Budi. Di kedua kasus server melihat sesi yang sah.",
  "Validasi sertifikat memastikan app berbicara dengan server yang benar. Token memberi tahu server siapa pengirimnya. Flag mematikan yang pertama, jadi pihak di tengah ikut membaca yang kedua.",
  "### Cek diri",
  "**1.** Dua client mengirim transfer lewat hotspot Dimas, satu memeriksa sertifikat dan satu membawa flag. Berapa request yang terbaca hotspot di masing-masing, dan kenapa?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Client yang memeriksa sertifikat: 0 request, karena CA Dimas tidak ada di daftar akarnya dan handshake ditolak (`m26.txt` bagian B). Client yang membawa flag: 1 request, karena callback dipanggil 1 kali dan menerima sertifikat tiruan, jadi hotspot membaca request lengkap beserta header Authorization (bagian C).",
  "</details>",
  "**2.** Dimas tidak tahu password Budi. Bagaimana transfer Rp150.000 bisa tercatat?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Hotspot membaca header Authorization yang sama dengan token sesi Budi. Dimas mengirim transfer dengan token itu langsung ke server, dan server menjawab 201 (`m26.txt` bagian E). Bagian E tidak memuat password atau login.",
  "</details>",
  "**3.** Flag sudah dihapus dan validasi sertifikat aktif. Kapan hotspot Dimas masih bisa membaca token Budi?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Bila CA Dimas ada di daftar akar app. Di bagian D validasi lolos dan hasilnya sama dengan flag: hotspot membaca 1 request dan nominalnya diubah. Cara CA itu sampai di daftar akar Tidak dijalankan di lab. Halaman Keamanan 6 membahas cara menahannya.",
  "</details>",
  "**4.** Server menjawab 201 untuk transfer Dimas. Kenapa tidak ada yang ditolak?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Token itu sah, saldo cukup, dan batas harian tidak terlampaui (`m26.txt` bagian E). Pemeriksaan token di api-t3 hanya memakai token, tanpa alamat atau perangkat pengirim (dibaca dari kode lab, Tidak dijalankan di halaman ini).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
