// Penjaga halaman 4.18 (keputusan 1334 sampai 1336): angka, nama, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim "dibaca dari kode", klaim negatif berlingkup, Hitungan, diagram Rantai, skenario alur t4-m35.json, halaman istilah CRC,
// baris riset, dan kartu Cek diri di m35-qr-bu-marni.mdx diturunkan dari rekaman labs/t4-qr (statis.txt, crc.txt), kode lab
// (labs/t4-qr/run.py dan labs/api-t4/internal/qrpayload), README lab, halaman tetangga, naskah Tahap 4, registry, dan baris
// riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.16): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak
// menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, diagram, skenario, kartu, baris riset) dikunci dengan
// sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m35-stiker-berganti.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m35-qr-bu-marni.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m35-qr-bu-marni.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m35.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const istilahMentah = baca("situs/data/halaman-istilah/crc.json");
const istilah = HalamanIstilah.parse(JSON.parse(istilahMentah)) as { istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: null; jebakan: string[]; terkait: string[]; sumber: { riset?: string; judul: string; url?: string; rekaman?: string; catatan: string }[] };
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const statis = baca("labs/t4-qr/output/statis.txt");
const crc = baca("labs/t4-qr/output/crc.txt");
const readme = baca("labs/t4-qr/README.md");
const runLab = baca("labs/t4-qr/run.py");
const payloadGo = baca("labs/api-t4/internal/qrpayload/qrpayload.go");
const payloadTesGo = baca("labs/api-t4/internal/qrpayload/qrpayload_test.go");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal42 = baca("situs/src/content/docs/tahap-4/fitur-ke-teknis.mdx");
const hal45 = baca("situs/src/content/docs/tahap-4/skema-data.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat?: { id: string; label: string }[];
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { bagian?: number; id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const KATA: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh", 8: "delapan" };
const kata = (n: number): string => KATA[n] ?? String(n);
const rib = (n: number): string => n.toLocaleString("id-ID");
const angka = (s: string): number => Number(s.replace(/\./g, ""));

// ---- rekaman: bagian dan nomor baris Snippet --------------------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 0): number => {
    const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const teks = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
  return { baris, nomor, teks };
};
const S = bagian(statis);
const sA = S.nomor((b) => b.startsWith("# --- A. ")), sB = S.nomor((b) => b.startsWith("# --- B. ")), sC = S.nomor((b) => b.startsWith("# --- C. ")), sD = S.nomor((b) => b.startsWith("# --- D. "));
const bagSA = S.teks(sA, sB - 1), bagSB = S.teks(sB, sC - 1), bagSC = S.teks(sC, sD - 1);
const sPindai = S.nomor((b) => b.startsWith("pemindai: payload"), sB);
const sPindaiAkhir = S.nomor((b) => b.startsWith('{"id":10201'), sPindai);
const sJurnal = S.nomor((b) => b.startsWith("=> SELECT j.jenis, a.nama, p.jumlah"), sB);
const sJurnalAkhir = S.nomor((b) => b === "(2 rows)", sJurnal);
const sPosting = S.nomor((b) => b.startsWith("=> SELECT count(*) AS posting_di_buku_bu_marni"), sB);
const sPostingAkhir = S.nomor((b) => b === "(1 row)", sPosting);
const sAkun = S.nomor((b) => b.startsWith("=> SELECT nama, jenis, tingkat, status FROM akun"), sB);
const sAkunAkhir = S.nomor((b) => b === "(7 rows)", sAkun);
const sGanti = S.nomor((b) => b.startsWith("pemindai: payload"), sC);
const sGantiAkhir = S.nomor((b) => b.startsWith("nama dan kota di payload sama dengan jawaban server: tidak"), sGanti);

const C = bagian(crc);
const cA = C.nomor((b) => b.startsWith("# --- A. ")), cB = C.nomor((b) => b.startsWith("# --- B. ")), cC = C.nomor((b) => b.startsWith("# --- C. ")), cD = C.nomor((b) => b.startsWith("# --- D. ")), cE = C.nomor((b) => b.startsWith("# --- E. "));
const bagCA = C.teks(cA, cB - 1), bagCB = C.teks(cB, cC - 1), bagCC = C.teks(cC, cD - 1), bagCD = C.teks(cD, cE - 1);
const cTabel = C.nomor((b) => b.startsWith("$ qrlab buat -jenis statis"), cB);
const cTabelAkhir = C.nomor((b) => b === "(9 rows)", cTabel);
const cSalah = C.nomor((b) => b.startsWith("karakter ke-115"), cC);
const cSalahAkhir = C.nomor((b) => b.startsWith("dua karakter bersebelahan bertukar tempat"), cSalah);
const cGanti = C.nomor((b) => b.startsWith("payload asli"), cD);
const cGantiAkhir = C.nomor((b) => b.startsWith("teks diganti lalu CRC dihitung ulang"), cGanti);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);
const langSnippet = tag.map((t) => t.match(/lang="([^"]+)"/)?.[1]);

// ---- nilai dari rekaman -----------------------------------------------------------------------------------------------
const SALDO_AWAL = angka(cocok(bagSA, /\n Budi\s+\| (\d+)\n/)[1]!);
const NAMA_MARNI = cocok(bagSA, /\n (Toko Sumber Rejeki)\s+\| 0\n/)[1]!;
const NAMA_ANDALAN = cocok(bagSA, /\n (Toko Andalan)\s+\| 0\n/)[1]!;
const NOMINAL = angka(cocok(bagSB, /-d '\{"nominal": (\d+)\}'/)[1]!);
const JAWAB = JSON.parse(cocok(bagSB, /\n(\{"id":10201[^\n]*\})\n/)[1]!) as { id: number; saldo: number; nominal: number; merchant: string };
const SALDO_AKHIR = JAWAB.saldo;
const POSTING_BUKU_MARNI = angka(cocok(bagSB, /posting_di_buku_bu_marni\n-+\n (\d+)\n/)[1]!);
const JUMLAH_POSTING = Number(cocok(bagSB, /jumlah_posting\n-+\n (-?\d+)\n/)[1]!);
const POSTING = [...bagSB.matchAll(/^ bayar \| (.+?)\s+\| (-?\d+)$/gm)].map((m) => [m[1]!, Number(m[2]!)] as [string, number]);
const KOLOM = (() => { const b = S.teks(sAkun, sAkunAkhir).split("\n"); const h = b.findIndex((x) => x.trim() === "column_name"); return b.slice(h + 2, b.length - 1).map((x) => x.trim()); })();
const barisAkun = [...S.teks(sAkun, sAkunAkhir).matchAll(/^ (Toko [^|]+?)\s+\| (\w+)\s+\| (\w+)\s+\| (\w+)$/gm)].map((m) => [m[1]!, m[2]!, m[3]!, m[4]!]);

const CRC_UJI = cocok(bagCA, /CRC\('123456789'\) Go (\w+), Python (\w+)/);
const SALAH = cocok(bagCC, /payload contoh statis milik tes \((\d+) karakter\): (\d+) dari (\d+) terdeteksi \((\d+) oleh CRC, (\d+) oleh tag 63 yang rusak\)/);
const PANJANG = Number(SALAH[1]), TERDETEKSI = Number(SALAH[2]), DICOBA = Number(SALAH[3]), OLEH_CRC = Number(SALAH[4]), OLEH_TAG = Number(SALAH[5]);
const TUKAR = cocok(bagCC, /bertukar tempat pada payload contoh yang sama: (\d+) dari (\d+) terdeteksi/);
const CRC_ASLI = cocok(bagCD, /payload asli\s+: [^\n]*6304(\w{4})\n/)[1]!;
const CRC_PALSU = cocok(bagCD, /payload dipalsukan: [^\n]*6304(\w{4})\n/)[1]!;
const HEX = cocok(bagCB, /\n 63\s+\| (\d+)\s+\| \w{4}\s+\| CRC-16 atas semua yang di depannya termasuk "6304"/)[1]!;
const BIT = Number(HEX) * 4;
const EMAS = cocok(payloadTesGo, /emasStatis = "([^"]+)"/)[1]!;
const ABJAD = cocok(payloadTesGo, /const abjad = "([^"]+)"/)[1]!;
const DI_LUAR_ABJAD = [...EMAS].filter((c) => !ABJAD.includes(c)).length;
const PENGGANTIAN = [...EMAS].reduce((s, c) => s + ABJAD.length - (ABJAD.includes(c) ? 1 : 0), 0);
const PASANG_BEDA = [...EMAS].filter((c, k) => k + 1 < EMAS.length && c !== EMAS[k + 1]).length;
const RUANG = 2 ** BIT;

// ---- naskah ------------------------------------------------------------------------------------------------------------
const barisM35 = naskah.split("\n").find((b) => b.startsWith("| M35 |"))!;
const NOMINAL_CERITA = [...cocok(barisM35, /membayar (Rp[\d.]+), (Rp[\d.]+), dan (Rp[\d.]+), dan tidak ada yang masuk laporannya/).slice(1, 4)].map((x) => angka(x.replace("Rp", "")));
const TOTAL_CERITA = NOMINAL_CERITA.reduce((a, b) => a + b, 0);
const HARI = cocok(barisM35, /\| M35 \| 8 \| (Rabu)\. Bu Marni mengeluh/)[1]!;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.18 ada, masalah, jalur inti, prasyarat 4.3, lab t4-qr, peran mobile, security, dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m35")).toMatchObject({ ada: true, nomor: "4.18", jenis: "masalah", bagian: 4, inti: true, prasyarat: ["t4-topup-verifikasi"], lab: ["t4-qr"], tahap: 4, peran: ["mobile", "security", "backend"] });
    expect(dari("t4-topup-verifikasi").nomor).toBe("4.3");
    expect(frontmatter).toContain('title: "4.18 M35: QR di kasir Bu Marni"');
    expect(frontmatter).toContain("description: Minggu 8. Tiga pelanggan Bu Marni membayar dengan QR, dan uangnya tidak masuk laporan tokonya, karena stiker di kasirnya diganti stiker merchant lain yang sah.");
    expect(dari("t4-m35").judul).toBe("M35: QR di kasir Bu Marni");
    expect(naskah).toContain("| 4.18 | 4 | M35: QR di kasir Bu Marni | Masalah | ★ | t4-qr | alur |");
    expect(barisM35).toMatch(/^\| M35 \| 8 \|/);
    expect(dari("t4-m35").label).toBe("Masalah 35 · minggu 8");
    harus("Minggu 8 Tahap 4, hari Rabu.");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-topup-verifikasi\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m35").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka; satu Rantai ringkas; impor dan jumlah komponen tetap", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(8);
    expect([...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro", "stikerBerganti ../../../../data/diagram/t4-m35-stiker-berganti.json",
    ]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t4-fitur-teknis", "t4-prd", "t4-qr", "t4-skema", "t4-topup-verifikasi"]);
    const sesuai: [string, string, string][] = [
      ["t4-prd", "4.1", "PRD v4"], ["t4-fitur-teknis", "4.2", "Dari fitur ke pekerjaan teknis v4"], ["t4-topup-verifikasi", "4.3", "Fitur: top-up dari bank dan verifikasi identitas"],
      ["t4-skema", "4.5", "Skema data"], ["t4-qr", "4.19", "QR pembayaran: statis, dinamis, konfirmasi"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t4-qr").adr).toEqual([40]);
    harus("Keputusannya ADR 40.");
  });
  test("janji halaman lain ke 4.18 ditepati: 4.2 menaut ke 4.19 untuk QR merchant luar, 4.5 menaut ke t4-m35 untuk tabel qr, 4.1 menulis risiko QR yang bisa diganti", () => {
    expect(hal42).toContain("| QR merchant luar | [[t4-qr\\|QR dan layar konfirmasi]], [[t4-ssrf\\|SSRF]] |");
    expect(hal45).toContain("| [[t4-m35\\|M35]] |");
    expect(hal45).toMatch(/\| \(tidak ada\) \| `qr` \(akun, jenis: statis atau dinamis, nominal, berlaku_sampai, status, jurnal_id\) .*\[\[t4-m35\\\|M35\]\] \|/);
    expect(hal41).toContain("Pembayaran yang tidak masuk laporan; QR yang bisa diganti orang");
    expect(hal41).toContain("Memasang satu stiker QR sejak hari pertama dan tidak memeriksanya lagi");
    harus('- [[t4-prd]]: PRD v4 menulis risiko "QR yang bisa diganti orang" untuk merchant luar.');
    harus("- [[t4-skema]]: tabel `qr` dan aturan yang dijaga database.");
    harus("- [[t4-fitur-teknis]]: QR merchant luar sebagai fitur dan pekerjaan teknisnya.");
    harus("- [[t4-qr]]: QR statis lawan dinamis, layar konfirmasi dengan nama merchant terverifikasi, dan pelaporan QR palsu. Keputusannya ADR 40.");
    harus("Yang bisa diperiksa pembeli adalah nama merchant yang dijawab server, dan itu dibahas di [[t4-qr]].");
  });
  test("halaman tidak membuka isi 4.19: ADR 40 sekali; tanpa batas Rp200.000, masa berlaku QR dinamis, pembekuan, atau bobot pelapor", () => {
    expect(badan.match(/ADR 40/g)).toHaveLength(1);
    expect([...new Set(badan.match(/ADR \d+/g))]).toEqual(["ADR 40"]);
    expect(badan).not.toMatch(/200\.000|200\.001|5 menit|kedaluwarsa|dibekukan|membekukan|pembekuan|bobot pelapor|Retry-After|409|410|422/);
    expect(badan.match(/dinamis/g)).toHaveLength(2);
    expect(badan.match(/laporan QR palsu|pelaporan QR palsu/g)).toHaveLength(1);
  });
});

describe("naskah M35: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M35 di naskah: minggu 8, Rabu, tiga nominal, laporan Bu Marni, dugaan app salah mencatat, layar 'Bayar?' dengan nama berhuruf kecil", () => {
    expect(barisM35).toContain("Bu Marni mengeluh: tiga pelanggan bilang sudah membayar Rp35.000, Rp48.000, dan Rp22.000, dan tidak ada yang masuk laporannya.");
    expect(barisM35).toContain("Stiker QR di kasir Bu Marni bukan lagi stikernya (Ilustrasi).");
    expect(barisM35).toContain("| App Rekeningo salah mencatat |");
    expect(barisM35).toContain("Pihak yang mencoba menempelkan stiker QR statis miliknya di atas stiker Bu Marni.");
    expect(barisM35).toContain("Miliknya merchant sah yang terverifikasi dengan identitasnya sendiri, jadi pembayaran valid: jurnal seimbang, merchant aktif, saldo cukup.");
    expect(barisM35).toContain('Layar konfirmasi versi pertama hanya bertanya "Bayar?" dengan nama merchant berhuruf kecil, dan Budi tidak membandingkannya dengan papan toko.');
    expect(NOMINAL_CERITA).toEqual([35000, 48000, 22000]);
    expect(HARI).toBe("Rabu");
  });
  test("selisih naskah dan rekaman ditulis jujur: naskah menyebut Toko Sumber Rejeki di app Budi, rekaman menyebut Toko Andalan; halaman memakai nama rekaman", () => {
    expect(barisM35).toContain('Di app Budi tercatat "Berhasil: Toko Sumber Rejeki, Rp35.000".');
    expect(NAMA_MARNI).toBe("Toko Sumber Rejeki");
    expect(JAWAB.merchant).toBe("Toko Andalan");
    expect(NAMA_ANDALAN).toBe("Toko Andalan");
    harus(`Di sana tercatat "Berhasil: ${JAWAB.merchant}, Rp${rib(NOMINAL)}".`);
    expect(badan).not.toContain(`Berhasil: ${NAMA_MARNI}`);
    harus(`Nama ${JAWAB.merchant} dipakai rekaman lab untuk merchant pemilik stiker itu.`);
    expect(barisRiset("R4-199")).toContain("Naskah M35 menulis app Budi mencatat 'Berhasil: Toko Sumber Rejeki'");
  });
  test("kalimat Gejala: nominal dan hari dari baris naskah, jumlah dari penjumlahan (Hitungan atas Ilustrasi), Ilustrasi, tanpa kalimat definisi", () => {
    const [a, b, c] = NOMINAL_CERITA as [number, number, number];
    harus(`Minggu 8 Tahap 4, hari ${HARI}.`);
    harus(`Tiga pelanggannya bilang sudah membayar dengan QR: Rp${rib(a)}, Rp${rib(b)}, dan Rp${rib(c)}. Tidak ada yang masuk ke laporan tokonya.`);
    expect(TOTAL_CERITA).toBe(105000);
    harus(`Ketiga pembayaran itu berjumlah Rp${rib(TOTAL_CERITA)} (Rp${rib(a)} + Rp${rib(b)} + Rp${rib(c)}).`);
    harus(`Rp${rib(TOTAL_CERITA)} adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman, dan masukannya Ilustrasi.`);
    expect(badan.match(/Hitungan, yaitu angka yang dihitung dari angka lain di halaman/g)).toHaveLength(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf(`Rp${rib(TOTAL_CERITA)} adalah Hitungan`) + `Rp${rib(TOTAL_CERITA)} adalah `.length);
    harus("*Angka cerita (Ilustrasi):* hari Rabu, tiga nominal, dan stiker yang berganti berasal dari naskah, bukan dari rekaman.");
    // Rp48.000 dan Rp22.000 tidak ada di rekaman lab; Rp35.000 dipilih skrip lab
    expect(statis + crc).not.toMatch(/48\.?000|22\.?000|105\.?000/);
    expect(runLab).toContain('{"nominal": 35_000}');
    const gejala = cocok(badan, /<Blok nama="Gejala" buka>([\s\S]*?)<\/Blok>/)[1]!;
    expect(gejala.replace(/\*Angka cerita[\s\S]*$/, "")).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut|CRC|payload|tag|statis|dinamis)\b/i);
  });
  test("yang dikira sebelum yang sebenarnya; dugaan Raka dari naskah; tiga pemeriksaan sama dengan yang direkam", () => {
    expect(badan.indexOf('<Blok nama="Yang Raka kira"')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    harus("Ia menduga app salah mencatat tujuan pembayaran.");
    harus("Bila app salah mencatat, jurnal pembayaran Budi tidak seimbang, merchant penerimanya tidak aktif, atau saldo Budi berkurang tanpa ada yang menerima. Rekaman di blok berikutnya memeriksa ketiganya.");
    expect(JUMLAH_POSTING).toBe(0);
    expect(barisAkun.every((r) => r[1] === "merchant" && r[2] === "terverifikasi" && r[3] === "aktif")).toBe(true);
    expect(SALDO_AKHIR).toBe(SALDO_AWAL - NOMINAL);
  });
  test("tebakan di blok Yang Raka kira: jawabannya tersembunyi di details dan sama dengan rekaman (tabel qr tanpa lokasi, permintaan bayar tanpa pengenal stiker)", () => {
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(d[1]).toBe("Tebak dulu: pembayaran Budi lolos pemeriksaan jurnal, merchant, dan saldo. Data apa yang tidak dimiliki server?");
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(d[2]).toContain("Letak stiker. Tabel `qr` tidak punya kolom lokasi atau pengenal stiker, dan permintaan bayar hanya membawa sesi pembeli, id QR, dan nominal (Rekaman lab, `statis.txt` bagian B).");
    expect(d[2]).not.toMatch(/CRC|65\.536|8\.562/);
    expect(bagSB).toContain("# Yang diterima server untuk membayar hanya sesi pembeli, id QR, dan nominal; tabel qr (kolom di atas) tidak punya lokasi atau pengenal stiker.");
    expect(badan.indexOf('<details class="question">')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
  });
});

describe("rekaman statis.txt: bagian A, B, dan C, nilai yang dikutip, dan klaim negatif berlingkup", () => {
  test("A: dua merchant sah menerbitkan QR statis; saldo awal Budi dan kedua merchant dari SELECT; payload dibangun dari jawaban server", () => {
    expect(SALDO_AWAL).toBe(250000);
    expect(bagSA).toMatch(/Toko Sumber Rejeki\s+\| 0/);
    expect(bagSA).toMatch(/Toko Andalan\s+\| 0/);
    expect(bagSA.match(/-d '\{"jenis": "statis"\}'/g)).toHaveLength(2);
    expect(bagSA.match(/HTTP\/1\.1 201 Created/g)).toHaveLength(2);
    expect(bagSA).toContain("$ qrlab buat -jenis statis -id <qr statis Bu Marni> -nama 'Toko Sumber Rejeki' -kota Jakarta");
    expect(bagSA).toContain("$ qrlab buat -jenis statis -id <qr statis Toko Andalan> -nama 'Toko Andalan' -kota Surabaya");
    harus("Lab menerbitkan dua QR statis, satu untuk Bu Marni dan satu untuk Toko Andalan, lalu membangun payload keduanya dari jawaban server.");
  });
  test("B: pindai dan bayar; nama di payload sama dengan jawaban server; 201; saldo turun sebesar nominal; penerima Toko Andalan", () => {
    expect(bagSB).toContain("pemindai: CRC cocok; jenis statis; id <qr statis Toko Andalan>; nama di payload 'Toko Andalan'; kota di payload 'Surabaya'");
    expect(bagSB).toContain("server: GET /qr/{id} -> 200; nama 'Toko Andalan'; kota 'Surabaya'; terverifikasi ya");
    expect(bagSB).toContain("nama dan kota di payload sama dengan jawaban server: ya");
    expect(bagSB).toContain("HTTP/1.1 201 Created");
    expect(JAWAB).toEqual({ id: 10201, saldo: 215000, nominal: 35000, merchant: "Toko Andalan" });
    expect(NOMINAL).toBe(35000);
    harus("Budi memindai payload Toko Andalan, seolah stikernya tertempel di kasir Bu Marni, dan membayar Rp35.000:");
    harus("Pemindai membaca nama Toko Andalan di payload, dan server menjawab nama yang sama.");
    harus(`Pembayaran diterima dengan 201, dan saldo Budi menjadi Rp${rib(SALDO_AKHIR)}, yaitu Rp${rib(SALDO_AWAL)} dikurangi Rp${rib(NOMINAL)} (Hitungan; saldo awal dari \`statis.txt\` bagian A).`);
    expect(SALDO_AKHIR).toBe(215000);
  });
  test("B: jurnal dua posting berjumlah nol; buku Bu Marni nol posting; kedua merchant aktif dan terverifikasi; tabel qr tujuh kolom tanpa lokasi", () => {
    expect(POSTING).toEqual([["Budi", -NOMINAL], ["Toko Andalan", NOMINAL]]);
    expect(POSTING.reduce((s, p) => s + p[1], 0)).toBe(0);
    expect(JUMLAH_POSTING).toBe(0);
    expect(POSTING_BUKU_MARNI).toBe(0);
    expect(barisAkun).toEqual([["Toko Sumber Rejeki", "merchant", "terverifikasi", "aktif"], ["Toko Andalan", "merchant", "terverifikasi", "aktif"]]);
    expect(KOLOM).toEqual(["id", "akun_id", "jenis", "nominal", "berlaku_sampai", "status", "jurnal_id"]);
    expect(KOLOM.filter((k) => /lokasi|stiker|geo|koordinat|alamat/i.test(k))).toEqual([]);
    harus(`Pertama, jurnal seimbang: Rp${rib(NOMINAL)} keluar dari Budi dan Rp${rib(NOMINAL)} masuk ke Toko Andalan, jadi jumlahnya nol.`);
    harus(`Tidak ada satu posting pun dari pembayaran itu di bukunya:`);
    harus(`Tabel \`qr\` hanya menyimpan ${kata(KOLOM.length)} kolom, dan tidak ada yang berisi lokasi atau pengenal stiker:`);
    harus("Ketiga, kedua merchant aktif dan terverifikasi.");
    harus("Tiga pemeriksaan Raka lolos.");
    expect(bagSB).toContain("# Jurnal seimbang, merchant penerima aktif dan terverifikasi, saldo cukup: pembayaran sah menurut semua aturan yang dimiliki server.");
    expect(bagSB).toContain("# Tidak ada data yang menunjukkan di mana stiker itu tertempel, jadi tidak ada aturan yang bisa menolaknya.");
    harus("Rekaman menutup bagian itu dengan satu kesimpulan: pembayaran sah menurut semua aturan yang dimiliki server.");
    harus("Yang diterima server untuk membayar hanya sesi pembeli, id QR, dan nominal, jadi tidak ada aturan di server lab yang bisa menolaknya (`statis.txt` bagian B).");
  });
  test("C: payload Bu Marni dengan id QR Toko Andalan: CRC cocok, nama di payload Toko Sumber Rejeki, server menjawab Toko Andalan; sama: tidak", () => {
    expect(bagSC).toContain("$ qrlab ganti -id <qr statis Toko Andalan> <payload Bu Marni>");
    expect(bagSC).toContain("pemindai: CRC cocok; jenis statis; id <qr statis Toko Andalan>; nama di payload 'Toko Sumber Rejeki'; kota di payload 'Jakarta'");
    expect(bagSC).toContain("server: GET /qr/{id} -> 200; nama 'Toko Andalan'; kota 'Surabaya'; terverifikasi ya");
    expect(bagSC).toContain("nama dan kota di payload sama dengan jawaban server: tidak");
    harus("Payload Bu Marni yang id QR-nya diganti ke id Toko Andalan, dengan CRC dihitung ulang, lolos pemindai dan membawa nama Toko Sumber Rejeki. Server menjawab nama Toko Andalan:");
    harus("Nama dan kota di payload ditulis oleh siapa pun yang memegang payload.");
    expect(bagSC).toContain("nama di payload ditulis oleh siapa pun yang memegang payload");
    expect(bagSC).toContain("Nama dan kota yang bisa");
  });
  test("klaim negatif berlingkup: tabel qr tanpa lokasi (kolom dari katalog schema), lab tanpa app dan tanpa gambar QR (folder labs/t4-qr), naskah tanpa asal nama di layar", () => {
    const berkasLab = [...(terlacak ?? new Set<string>())].filter((f) => f.startsWith("labs/t4-qr/"));
    expect(berkasLab.length).toBeGreaterThan(5);
    expect(berkasLab.filter((f) => /\.(png|jpe?g|svg|gif|webp|dart)$|pubspec\.yaml$/i.test(f))).toEqual([]);
    expect(readme).toContain("Tidak ada app di lab ini.");
    expect(readme).toContain("tidak ada pemindai kamera, tidak ada gambar QR; payload adalah teks");
    expect(runLab).not.toMatch(/^\s*(import|from) (PIL|cv2|qrcode|pyzbar|zxing)/m);
    harus("Lab tidak punya app dan tidak punya gambar QR, karena payload adalah teks.");
    expect(readme).toContain("**App dan layar konfirmasi**: tidak ada; perilaku pembeli, tampilan huruf, dan tes keterbacaan tidak terukur.");
    const layar = cocok(barisM35, /(Layar konfirmasi versi pertama[^.]*\.)/)[1]!;
    expect(layar).not.toMatch(/payload|server|tabel akun|diambil|berasal|terverifikasi/);
    expect(naskah.match(/Layar konfirmasi versi pertama/g)).toHaveLength(1);
    harus("Naskah Tahap 4 tidak menulis dari mana layar pertama mengambil nama itu.");
    expect(readme).toContain("Tidak ada layar di lab; yang terbukti hanya bahwa nama di payload tidak sama dengan nama yang dijawab server bila payload dipalsukan.");
    harus("- App Flutter, layar konfirmasi, papan toko, dan perilaku pembeli tidak ada di lab (Asumsi).");
    harus("Lab tidak punya app dan tidak punya layar itu, jadi apakah pembeli membaca nama itu tidak terukur (Asumsi).");
    expect(statis).toContain("# Server mengembalikan nama dan kota yang diverifikasi di GET /qr/{id}; apakah pembeli membaca dan membandingkannya dengan papan toko tidak terukur di lab (Asumsi).");
  });
  test("yang tidak direkam: Rabu, Rp48.000, Rp22.000, stiker fisik, dan penempel stiker tidak ada di rekaman; Rp35.000 dipilih skrip lab; penempel diperankan merchant sah milik lab", () => {
    harus("- Hari Rabu, nominal Rp48.000 dan Rp22.000, stiker fisik, dan laporan Bu Marni hanya ada di cerita (Ilustrasi). Lab memakai Rp35.000 sebagai nominal pembayaran.");
    expect(statis + crc).not.toMatch(/Rabu|laporan Bu Marni/);
    expect(bagSB).toContain("# Skenario (Ilustrasi): stiker Toko Andalan tertempel di kasir Bu Marni. Lab hanya memerankan pemindaian payload Toko Andalan dan pembayarannya; letak stiker tidak ada di sistem.");
    harus("- Siapa yang menempelkan stiker tidak pernah dibuktikan. Lab memerankan pihak itu dengan merchant sah milik lab.");
    harus("- Gambar QR dan kamera Tidak dijalankan: payload di lab adalah teks.");
    harus("- Skema pembayaran nasional dan regulasi tidak dipakai, dan halaman ini tidak mengklaim kepatuhan atau izin apa pun.");
    expect(readme).toContain("**Skema pembayaran nasional dan merek**: tidak dipakai");
    expect(badan).not.toMatch(/QRIS|GPN|Bank Indonesia|\bOJK\b|ISO 20022|PCI/);
    harus("Pihak yang mencoba, orang yang tidak dikenal, menempelkan stiker QR statis miliknya di atas stiker Bu Marni.");
    expect(badan).not.toMatch(/Dimas/);
  });
});

describe("rekaman crc.txt: parameter, tabel tag, salah baca, penggantian, dan Hitungan", () => {
  test("A: dua implementasi memberi nilai uji yang sama (29B1 untuk 123456789); katalog CRC memuat parameter dan nilai uji yang sama", () => {
    expect(CRC_UJI.slice(1, 3)).toEqual(["29B1", "29B1"]);
    expect(bagCA.match(/CRC\('[^']*'\) Go (\w+), Python (\w+)/g)!.every((b) => { const m = b.match(/Go (\w+), Python (\w+)/)!; return m[1] === m[2]; })).toBe(true);
    harus("Lab menghasilkan nilai yang sama dengan dua implementasi, yaitu Go dan `binascii.crc_hqx` dari Python (Rekaman lab, `crc.txt` bagian A).");
    harus("Rumus CRC punya parameter, dan lab memakai CRC-16/IBM-3740: polinomial 0x1021 dan nilai awal 0xFFFF.");
    harus("nilai uji 0x29B1 untuk teks `123456789`");
    expect(readme).toContain("CRC-16/IBM-3740, alias CRC-16/CCITT-FALSE: polinomial 0x1021, nilai awal 0xFFFF, tanpa pembalikan bit, tanpa XOR akhir, nilai uji 0x29B1");
    expect(payloadGo).toContain("0x1021");
    expect(payloadGo).toContain("0xFFFF");
    expect(runLab).toContain("crc_hqx");
  });
  test("B: tag 01 bernilai 11 untuk statis dan 12 untuk dinamis dan tag 63 berpanjang 4 dari tabel rekaman; CRC mencakup 6304", () => {
    expect(bagCB).toMatch(/\n 01\s+\| 02\s+\| 11\s+\| 11 statis, 12 dinamis/);
    expect(bagCB).toMatch(/\n 01\s+\| 02\s+\| 12\s+\| 11 statis, 12 dinamis/);
    expect(HEX).toBe("04");
    expect(bagCB).toContain('CRC-16 atas semua yang di depannya termasuk "6304"');
    harus("Tag 01 bernilai 11 untuk QR statis dan 12 untuk QR dinamis, yang dibuat baru untuk tiap pembayaran.");
    harus("CRC dihitung dari semua teks di depannya, termasuk `6304`, yaitu tag dan panjang CRC itu sendiri.");
    expect(baca("labs/t4-qr/README.md")).toContain("tag 01 bernilai `11` (statis) atau `12` (dinamis); tag 63 berpanjang 04, CRC atas semua data object termasuk `6304` tanpa nilainya");
    expect(barisRiset("R4-331")).toContain("`11` bila QR yang sama dipakai untuk lebih dari satu transaksi (statis) dan `12` bila QR baru ditampilkan untuk tiap transaksi (dinamis)");
    // pemindai menolak bila CRC berbeda: Urai mengembalikan ErrCRC
    expect(payloadGo).toContain('ErrCRC = errors.New("CRC tidak cocok")');
    expect(payloadGo).toContain("return i, ErrCRC");
    harus("Pemindai menghitung CRC lagi dari teks yang ia baca dan menolak payload bila hasilnya berbeda.");
  });
  test("C: 8.562 dari 8.562 penggantian satu karakter pada payload 138 karakter, 8.314 oleh CRC dan 248 oleh tag 63; 104 dari 104 pertukaran; lingkup satu payload", () => {
    expect([PANJANG, TERDETEKSI, DICOBA, OLEH_CRC, OLEH_TAG]).toEqual([138, 8562, 8562, 8314, 248]);
    expect(OLEH_CRC + OLEH_TAG).toBe(TERDETEKSI);
    expect(TUKAR.slice(1, 3)).toEqual(["104", "104"]);
    expect(bagCC).toContain("(hasil untuk payload ini, bukan jaminan umum)");
    expect(bagCC.match(/galat crc: CRC tidak cocok/g)).toHaveLength(3);
    expect(bagCC).toContain("karakter ke-115 (di nama merchant) diganti");
    expect(bagCC).toContain("karakter ke-51 (di id QR) diganti");
    expect(bagCC).toContain("karakter ke-96 (di nominal) diganti");
    harus(`Lab lalu mengganti tiap karakter satu payload contoh milik tes Go, sepanjang ${PANJANG} karakter, dengan karakter lain dari ${ABJAD.length} pilihan: angka, huruf, dan spasi. Hasilnya ${rib(TERDETEKSI)} dari ${rib(DICOBA)} terdeteksi: ${rib(OLEH_CRC)} oleh CRC dan ${OLEH_TAG} oleh tag 63 yang rusak, dan ${rib(OLEH_CRC)} + ${OLEH_TAG} = ${rib(TERDETEKSI)} (Hitungan).`);
    // hitungan 138 x 62 + 6 dari kode tes Go: payload, abjad 63 karakter, enam karakter di luar abjad, dan pasangan berbeda
    expect(EMAS).toHaveLength(PANJANG);
    expect(ABJAD).toHaveLength(63);
    expect(DI_LUAR_ABJAD).toBe(6);
    expect([...EMAS].filter((c) => !ABJAD.includes(c)).every((c) => c === "." || c === "-")).toBe(true);
    expect(PENGGANTIAN).toBe(TERDETEKSI);
    expect(PANJANG * (ABJAD.length - 1) + DI_LUAR_ABJAD).toBe(TERDETEKSI);
    expect(payloadTesGo).toContain("if byte(c) == p[k] {");
    expect(payloadTesGo).toContain("if p[k] == p[k+1] {");
    expect(PASANG_BEDA).toBe(Number(TUKAR[1]));
    expect(EMAS).toContain("Bandung");
    expect(EMAS).not.toContain("Jakarta");
    expect(C.baris[cTabel]).not.toBe(EMAS);
    expect(C.baris[cTabel]).toContain("Jakarta");
    harus(`Jumlah ${rib(TERDETEKSI)} sama dengan ${PANJANG} × ${ABJAD.length - 1} + ${DI_LUAR_ABJAD}. Tiap posisi diganti dengan ${ABJAD.length - 1} karakter lain, kecuali ${kata(DI_LUAR_ABJAD)} posisi berisi titik atau strip yang diganti dengan ${ABJAD.length} karakter (Hitungan, dibaca dari kode tes \`TestPayloadSalahBacaSatuKarakterTerdeteksiSemua\`). Payload itu bukan payload di cuplikan di atas: kotanya Bandung, bukan Jakarta.`);
    harus(`Pertukaran dua karakter bersebelahan yang berbeda juga terdeteksi, ${TUKAR[1]} dari ${TUKAR[2]}. Itu hasil untuk satu payload dan dua jenis kesalahan, bukan jaminan untuk payload lain atau kesalahan lain.`);
    expect(payloadTesGo).toContain("func TestPayloadSalahBacaSatuKarakterTerdeteksiSemua(");
    harus("Satu karakter yang berubah membuat CRC tidak cocok, di tiga posisi yang dicoba lab:");
    expect(readme).toContain("Sifat umum CRC-16 terhadap jenis kesalahan lain tidak dibuktikan di sini.");
  });
  test("D: id diganti dan CRC dihitung ulang lolos (B29D menjadi 4D5E); tanpa CRC baru ditolak; sama dengan crc_hqx; Hitungan 4 x 4 = 16 bit dan 2^16 = 65.536", () => {
    expect([CRC_ASLI, CRC_PALSU]).toEqual(["B29D", "4D5E"]);
    expect(bagCD).toContain(`selisih: id QR berubah; CRC berubah dari ${CRC_ASLI} menjadi ${CRC_PALSU}`);
    expect(bagCD).toContain("teks diganti tanpa menghitung CRC baru: galat crc: CRC tidak cocok");
    expect(bagCD).toContain("teks diganti lalu CRC dihitung ulang dengan binascii.crc_hqx (tanpa alat lab): lolos, hasilnya sama persis dengan keluaran qrlab ganti");
    expect(bagCD).toContain("# CRC tidak memakai kunci rahasia, jadi mendeteksi salah baca, bukan penggantian. Keaslian QR tidak bisa dibuktikan dari payload.");
    expect(BIT).toBe(16);
    expect(RUANG).toBe(65536);
    harus(`Di lab, id QR diganti dan CRC berubah dari \`${CRC_ASLI}\` menjadi \`${CRC_PALSU}\`, dan pemindai menerimanya:`);
    harus("Bila teks diganti tanpa CRC baru, pemindai menolaknya. Hasil `qrlab ganti` sama persis dengan hasil `binascii.crc_hqx` yang dijalankan tanpa alat lab.");
    harus(`CRC punya empat karakter heksadesimal, yaitu 4 × 4 = ${BIT} bit, dan 2^${BIT} = ${rib(RUANG)} nilai yang mungkin (Hitungan).`);
    expect(Number(HEX)).toBe(4);
    harus(`Pelaku tidak menebak salah satu dari ${rib(RUANG)} nilai itu, karena satu perhitungan memberinya nilai yang benar.`);
    harus("CRC dihitung tanpa key rahasia: rumusnya terbuka, jadi siapa pun yang memegang payload bisa menghitungnya lagi.");
  });
  test("sumber luar: katalog CRC dan Wikipedia dengan URL dan tanggal akses sama dengan halaman dan riset; EMVCo: versi, tanggal, dan PDF belum terbaca [perlu verifikasi]", () => {
    const k = barisRiset("R4-196");
    expect(k).toContain("reveng.sourceforge.io/crc-catalogue/16.htm, dibuka 2026-10-30");
    expect(k).toContain("'Last updated 11 December 2024'");
    expect(k).toContain('`width=16 poly=0x1021 init=0xffff refin=false refout=false xorout=0x0000 check=0x29b1 residue=0x0000`');
    expect(k).toContain("Version v1.1, Published 27 Nov 2020, Public Access");
    expect(k).toContain("[perlu verifikasi di PDF EMVCo]");
    harus("[Katalog CRC](https://reveng.sourceforge.io/crc-catalogue/16.htm)");
    harus("halaman terakhir diperbarui 11 Desember 2024, dibuka 2026-10-30, Tidak dijalankan");
    harus("Halaman EMVCo mendaftarkan spesifikasi QR merchant-presented sebagai versi 1.1 (27 November 2020; dibuka 2026-10-30), tetapi PDF-nya belum terbaca. Parameter CRC menurut spesifikasi itu [perlu verifikasi di PDF EMVCo].");
    const w = barisRiset("R4-197");
    expect(w).toContain("en.wikipedia.org/wiki/Cyclic_redundancy_check, dibuka 2026-10-30");
    expect(w).toContain("they are not suitable for protecting against intentional alteration of data");
    harus("([Wikipedia: Cyclic redundancy check](https://en.wikipedia.org/wiki/Cyclic_redundancy_check), dibuka 2026-10-30, sumber sekunder, Tidak dijalankan)");
    harus("Wikipedia menulis hal serupa tentang CRC pada umumnya. CRC tidak cocok untuk melindungi dari perubahan yang disengaja. Penyerang bisa mengubah pesan dan menghitung ulang CRC (");
    expect(readme).toContain("**PDF EMVCo**: parameter CRC, daftar tag wajib, dan batas panjang nama dan kota belum dibaca dari spesifikasi asli");
    harus("Lab memakai format bergaya EMV: tag 00, 01, dan 63 serta cara menghitung CRC berasal dari sumber yang bisa dibuka, dan selebihnya pilihan lab (Asumsi).");
    expect(readme).toContain('Format payload "bergaya EMV", bukan implementasi EMVCo penuh');
  });
});

describe("kode lab: pemindai dan pemalsu adalah skrip lab; rentang Snippet diturunkan dari rekaman", () => {
  test("pemindai = qrlab urai lalu GET /qr/{id}; pemalsu = qrlab ganti; Budi membayar 35_000 ke stiker Toko Andalan; kondisi rekaman dari kepala rekaman", () => {
    expect(runLab).toContain('rc, out = qrlab("urai", payload)');
    expect(runLab).toContain('s, k = konfirmasi(token, isi["id"])');
    expect(runLab).toContain('s, isi = curl("GET", f"/qr/{qid}", token=token, tampil=tampil)');
    expect(runLab).toContain('rc, px = qrlab("ganti", "-id", qa, pm)');
    expect(runLab).toContain('curl("POST", f"/qr/{qa}/bayar", {"nominal": 35_000}, budi)');
    expect(runLab).toContain("Pemindai lab (tiruan app, bukan app)");
    const kepala = cocok(S.baris[1]!, /^# PostgreSQL (\d+\.\d+) \([^)]*\) · (go[\d.]+) · pgx (v[\d.]+) · schema (\w+) · server Go di ([\d.:]+)$/);
    expect(C.baris[1]).toContain(`PostgreSQL ${kepala[1]} (`);
    expect(kepala[4]).toBe("tahap4_qr");
    harus(`*Kondisi rekaman:* PostgreSQL ${kepala[1]}, ${kepala[2]}, dan pgx ${kepala[3]}, dari database bersih, dengan server \`api-t4\` satu proses.`);
    expect(statis).toContain("# server: ./api-t4 -lab (satu proses; server hanya menerima id QR, tidak membaca payload)");
    harus("Pemindai adalah skrip yang membaca payload lalu meminta `GET /qr/{id}`, dan pemalsu adalah perintah `qrlab ganti`. Keduanya skrip lab, bukan app dan bukan penyerang.");
    harus("Letak stiker tidak ada di sistem, jadi penempelan stiker adalah Ilustrasi.");
    expect(readme).toContain("Keduanya skrip lab, bukan app dan bukan penyerang.");
  });
  test("delapan Snippet: rentang dari struktur rekaman, bukan angka tangan; berkas, judul, dan bahasa sesuai; urutan di halaman", () => {
    expect(tag).toHaveLength(8);
    expect(lines).toEqual([
      `${sPindai}:${sPindaiAkhir}`, `${sJurnal}:${sJurnalAkhir}`, `${sPosting}:${sPostingAkhir}`, `${sAkun}:${sAkunAkhir}`,
      `${cTabel}:${cTabelAkhir}`, `${cSalah}:${cSalahAkhir}`, `${cGanti}:${cGantiAkhir}`, `${sGanti}:${sGantiAkhir}`,
    ]);
    expect(berkasSnippet).toEqual([
      "labs/t4-qr/output/statis.txt", "labs/t4-qr/output/statis.txt", "labs/t4-qr/output/statis.txt", "labs/t4-qr/output/statis.txt",
      "labs/t4-qr/output/crc.txt", "labs/t4-qr/output/crc.txt", "labs/t4-qr/output/crc.txt", "labs/t4-qr/output/statis.txt",
    ]);
    expect(langSnippet).toEqual([undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
    expect(judulSnippet).toEqual([
      "Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (pindai dan bayar)",
      "Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (jurnal pembayaran)",
      "Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (posting di buku Bu Marni)",
      "Rekaman lab: labs/t4-qr/output/statis.txt, bagian B (merchant dan kolom tabel qr)",
      "Rekaman lab: labs/t4-qr/output/crc.txt, bagian B (payload QR statis dan tag-nya)",
      "Rekaman lab: labs/t4-qr/output/crc.txt, bagian C (salah baca)",
      "Rekaman lab: labs/t4-qr/output/crc.txt, bagian D (penggantian dengan CRC dihitung ulang)",
      "Rekaman lab: labs/t4-qr/output/statis.txt, bagian C (nama di payload lawan nama dari server)",
    ]);
    // urutan: bagian B statis, lalu crc B, C, D, lalu statis C
    expect(sPindai).toBeGreaterThan(sB);
    expect(sAkunAkhir).toBeLessThan(sC);
    expect(sGanti).toBeGreaterThan(sC);
    expect(sGantiAkhir).toBeLessThan(sD);
    expect(sPindai).toBeLessThan(sJurnal);
    expect(sJurnal).toBeLessThan(sPosting);
    expect(sPosting).toBeLessThan(sAkun);
    expect(cTabel).toBeGreaterThan(cB);
    expect(cSalah).toBeGreaterThan(cC);
    expect(cGanti).toBeGreaterThan(cD);
    expect(C.baris[cTabel]).toMatch(/^00020101021126/);
    expect(S.baris[sPindai - 1]).toMatch(/^pemindai: payload /);
    expect(S.baris[sGantiAkhir - 1]).toBe("nama dan kota di payload sama dengan jawaban server: tidak");
  });
  test("rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, atau rujukan naskah internal", () => {
    const tampil = [
      S.teks(sPindai, sPindaiAkhir), S.teks(sJurnal, sJurnalAkhir), S.teks(sPosting, sPostingAkhir), S.teks(sAkun, sAkunAkhir),
      C.teks(cTabel, cTabelAkhir), C.teks(cSalah, cSalahAkhir), C.teks(cGanti, cGantiAkhir), S.teks(sGanti, sGantiAkhir),
    ].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b|\b[A-G]\d\b|\bnaskah\b|tinjauan|temuan/i);
  });
});

describe("halaman istilah CRC: baris glosarium, rujukan, sumber, dan angka dari rekaman", () => {
  test("nama sama dengan baris glosarium; kalimat pertama sama dengan definisi di halaman; baris menaut ke 4.18; urutan abjad", () => {
    expect(istilah.istilah).toBe("CRC (cyclic redundancy check)");
    const baris = glosarium.split("\n").filter((b) => b.startsWith("| **CRC** (cyclic redundancy check) |"));
    expect(baris).toHaveLength(1);
    expect(baris[0]).toBe("| **CRC** (cyclic redundancy check) | Angka pendek yang dihitung dari isi data untuk mendeteksi salah baca atau salah kirim; rumusnya terbuka dan tanpa key, jadi bukan bukti keaslian. | [[t4-m35]] |");
    expect(sidik(baris[0]!)).toBe(SIDIK.glosarium);
    expect(glosarium.indexOf("| **CRC** (")).toBeGreaterThan(glosarium.indexOf("| **Container** |"));
    expect(glosarium.indexOf("| **CRC** (")).toBeLessThan(glosarium.indexOf("| **CRDT** ("));
    expect(istilah.sehari_hari).toBe("CRC adalah angka pendek yang dihitung dari seluruh isi sebuah data, untuk mendeteksi salah baca atau salah kirim. Penerima menghitungnya lagi dan menolak data bila angkanya berbeda.");
    harus("Angka pemeriksa di stiker itu bernama CRC: empat karakter di ujung payload, yaitu teks di dalam QR, yang dihitung dari semua teks di depannya.");
    expect(badan.match(/bernama CRC/g)).toHaveLength(1);
    expect(badan.indexOf("bernama CRC")).toBeLessThan(badan.indexOf("CRC dihitung dari semua teks"));
    expect(istilah.stack).toBeNull();
    expect(istilah.terkait).toEqual(["HMAC (hash-based message authentication code)"]);
    expect(glosarium).toContain("| **HMAC** (hash-based message authentication code) |");
  });
  test("cerita, mekanisme, dan jebakan: angka dari rekaman crc.txt, label sumber, dan rujukan ke 4.18", () => {
    expect(istilah.cerita).toEqual([{ rujukan: "t4-m35", teks: "Stiker QR milik merchant lain tertempel di kasir Bu Marni, dan pembayaran Budi lolos. CRC di stiker itu cocok, karena CRC menangkap salah baca dan bukan penggantian (cerita, Ilustrasi)." }]);
    expect(istilah.mekanisme).toEqual([
      "Payload QR memuat CRC di tag 63: empat karakter heksadesimal yang dihitung dari semua teks di depannya, termasuk 6304 (`crc.txt` bagian B).",
      "Rumus CRC punya parameter. Lab memakai CRC-16/IBM-3740: polinomial 0x1021 dan nilai awal 0xFFFF. Go dan Python menghasilkan nilai yang sama (`crc.txt` bagian A).",
      `Satu karakter yang berubah membuat CRC tidak cocok. Pada satu payload contoh, ${rib(TERDETEKSI)} dari ${rib(DICOBA)} penggantian satu karakter dan ${TUKAR[1]} dari ${TUKAR[2]} pertukaran dua karakter bersebelahan terdeteksi (\`crc.txt\` bagian C).`,
      "CRC tidak memakai key rahasia. Isi yang diganti lalu diberi CRC yang dihitung ulang lolos, dan hasilnya sama dengan `binascii.crc_hqx` dari Python (`crc.txt` bagian D).",
    ]);
    expect(istilah.jebakan).toEqual([
      "Mengira CRC yang cocok berarti payload itu asli. CRC hanya menunjukkan bahwa teksnya utuh, bukan siapa yang menulisnya.",
      "Mengira 8.562 dari 8.562 berlaku untuk semua payload dan semua jenis kesalahan. Angka itu untuk satu payload contoh dan dua jenis kesalahan (`crc.txt` bagian C).",
    ]);
    expect(rib(TERDETEKSI)).toBe("8.562");
    expect(dari("t4-m35").ada).toBe(true);
  });
  test("sumber: tiga entri; katalog dan Wikipedia dengan URL dan tanggal akses sama dengan halaman dan riset; rekaman crc.txt; berkas dikunci sidik", () => {
    expect(istilah.sumber.map((s) => s.riset)).toEqual(["R4-196", "R4-197", "R4-195"]);
    const [kat, wiki, rek] = istilah.sumber;
    expect(kat!.url).toBe("https://reveng.sourceforge.io/crc-catalogue/16.htm");
    expect(kat!.judul).toBe("Katalog CRC: CRC-16/IBM-3740 (dibuka 2026-10-30)");
    expect(badan).toContain(`(${kat!.url})`);
    expect(wiki!.url).toBe("https://en.wikipedia.org/wiki/Cyclic_redundancy_check");
    expect(wiki!.judul).toBe("Wikipedia: Cyclic redundancy check (dibuka 2026-10-30)");
    expect(badan).toContain(`(${wiki!.url}), dibuka 2026-10-30`);
    expect(rek!.rekaman).toBe("labs/t4-qr/output/crc.txt");
    expect(kat!.catatan).toBe("Parameter polinomial 0x1021, nilai awal 0xFFFF, nilai uji 0x29B1 untuk 123456789. Katalog menjelaskan parameter CRC itu, bukan isi spesifikasi EMVCo.");
    expect(wiki!.catatan).toBe("Sumber sekunder: CRC dirancang untuk kesalahan tak sengaja dan tidak cocok untuk melindungi dari perubahan yang disengaja.");
    expect(rek!.catatan).toBe("Payload bergaya EMV dengan CRC di tag 63. Pemindai dan pemalsu adalah skrip lab, bukan app dan bukan penyerang.");
    expect(sidik(istilahMentah)).toBe(SIDIK.istilah);
    expect(istilahMentah).not.toMatch(/\bR\d-\d{2,3}\b(?!")/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: stiker sah milik merchant lain (statis.txt bagian B) dan isi stiker diubah (crc.txt bagian D); teks dan sub dihitung dari rekaman", () => {
    expect(diagram.id).toBe("t4-m35-stiker-berganti");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-qr · statis.txt bagian B dan crc.txt bagian D" });
    expect(diagram.baris).toHaveLength(2);
    const [a, d] = diagram.baris;
    expect(a!.label).toBe("Stiker sah milik merchant lain");
    expect(a!.sub).toBe("statis.txt bagian B");
    expect(a!.simpul.map((s) => s.teks)).toEqual(["Budi memindai stiker", "Server: QR sah", `Rp${rib(NOMINAL)} ke ${JAWAB.merchant}`]);
    expect(a!.simpul.map((s) => s.sub)).toEqual(["nama cocok dengan server", "merchant aktif, saldo cukup", "jurnal seimbang, buku Bu Marni kosong"]);
    expect(a!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(d!.label).toBe("Isi stiker diubah");
    expect(d!.sub).toBe("crc.txt bagian D");
    expect(d!.simpul.map((s) => s.teks)).toEqual(["Id QR diganti", "Angka pemeriksa dihitung ulang", "Pemindai menerima"]);
    expect(d!.simpul.map((s) => s.sub)).toEqual(["teks lain tetap", "rumus terbuka, tanpa key", "CRC cocok"]);
    expect(d!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(bagSB).toContain("nama dan kota di payload sama dengan jawaban server: ya");
    expect(POSTING_BUKU_MARNI).toBe(0);
    expect(bagCD).toContain("selisih: id QR berubah");
    expect(bagCD).toContain("# CRC tidak memakai kunci rahasia");
    expect(diagram.catatan).toBe("Penempelan stiker adalah Ilustrasi; lab hanya memerankan pemindai dan pemalsu. Kotak oranye adalah akibat yang direkam.");
  });
  test("diagram dikunci dengan sidik jari; Rantai ringkas tepat sesudah kalimat Inti di blok Yang sebenarnya; kalimat Inti dan simpul pendek", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    harus("<Rantai data={stikerBerganti} ringkas />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(mdx).toContain('import stikerBerganti from "../../../../data/diagram/t4-m35-stiker-berganti.json";');
    const blok = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    const inti = blok.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(inti[1]).toBe("Pembayaran Budi sah menurut server, karena yang berganti adalah stikernya, dan server tidak menyimpan di mana stiker itu tertempel.");
    expect(inti[1]!.length).toBeLessThanOrEqual(150);
    expect(inti[2]).toBe("<Rantai data={stikerBerganti} ringkas />");
    for (const b of diagram.baris) for (const s of b.simpul) {
      expect(s.teks.length, s.teks).toBeLessThanOrEqual(32);
      expect((s.sub ?? "").length, s.sub).toBeLessThanOrEqual(40);
    }
  });
});

describe("skenario alur t4-m35.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen; sumber statis.txt dan crc.txt; enam langkah dan tiga langkah varian dari awal", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-qr/output/statis.txt", fileVarian: "labs/t4-qr/output/crc.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["stk", "Stiker dan pemindai"], ["srv", "Server api-t4"], ["dbm", "Database: jurnal dan tabel qr"]]);
    expect(skenario.perangkat ?? []).toEqual([]);
    expect(skenario.langkah).toHaveLength(6);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("stiker salah terbaca satu karakter, bukan diganti");
    harus("**Ubah satu hal: stiker salah terbaca satu karakter, bukan diganti**");
    harus("Widget ini mengikuti rekaman `statis.txt` bagian A, B, dan C, dengan satu varian dari `crc.txt` bagian C dan D.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m35.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-qr run");
    expect(readme).toContain("make -C labs/t4-qr run ");
    expect(runLab).toContain("def rekam_statis");
    expect(runLab).toContain("def rekam_crc");
    expect(skenario.sumber.catatan).toContain(`Lab t4-qr, PostgreSQL ${cocok(statis, /# PostgreSQL (\d+\.\d+) /)[1]}, dari database bersih`);
    expect(skenario.sumber.catatan).toContain("stiker yang tertempel di kasir adalah Ilustrasi");
  });
  test("tebakan: empat pilihan, jawaban benar (201 ke Toko Andalan) sama dengan rekaman, tiga pilihan lain bertentangan, benar bukan yang terpanjang, posisi belum dipakai tebakan Tahap 2 sampai 4", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(0);
    expect(p.varian).toBe(false);
    expect(p.options[p.answer]).toBe(`${201}: Rp${rib(NOMINAL)} masuk ke ${JAWAB.merchant}, dan jurnalnya seimbang`);
    expect(p.options.filter((_, i) => i !== 0)).toEqual([
      "Ditolak: server tahu stiker itu tidak berada di kasir Bu Marni",
      "201, tetapi saldo Budi belum berkurang sampai merchant mengonfirmasi",
      "Ditolak: nama di payload tidak sama dengan nama di tabel akun",
    ]);
    const panjang = p.options.map((o) => o.length);
    expect(Math.max(...panjang)).not.toBe(panjang[p.answer]);
    const lain = ["t4-m29", "t4-m30", "t4-m31", "t4-m32", "t4-m33", "t4-topup", "t4-verifikasi"].map((n) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${n}.json`)) as Skenario).predict.answer);
    expect(lain).not.toContain(p.answer);
    // pilihan lain bertentangan dengan rekaman: tidak ada penolakan di bagian B, saldo Budi turun, nama di payload sama dengan nama di server
    expect(bagSB).not.toMatch(/\b(403|404|409|422)\b/);
    expect(bagSB).toContain("HTTP/1.1 201 Created");
    expect(bagSB).toContain("nama dan kota di payload sama dengan jawaban server: ya");
    expect(JAWAB.saldo).toBeLessThan(SALDO_AWAL);
    expect(p.q).toBe("Budi memindai stiker yang tertempel di kasir Bu Marni dan membayar Rp35.000. Stiker itu milik Toko Andalan, merchant sah yang terverifikasi. Apa yang dijawab server?");
    expect(p.explain).toBe(`Server hanya menerima sesi Budi, id QR, dan nominal. Stiker itu QR sah, jadi pembayaran diterima: saldo Budi turun dari Rp${rib(SALDO_AWAL)} ke Rp${rib(SALDO_AKHIR)}, dan Toko Andalan menerima Rp${rib(NOMINAL)}. Rekaman statis.txt bagian B.`);
  });
  test("baris perintah dan keluaran di kirim ada di rekaman sumbernya, per baris (baris diawali pagar dipotong dari rekaman yang sama)", () => {
    const ada = (rekaman: string, kirim: string) => {
      const baris = rekaman.split("\n");
      for (const b of kirim.split("\n")) expect(baris.some((r) => r === b || (b.startsWith("#") && r.startsWith(b))), `tidak ada di rekaman: ${b}`).toBe(true);
    };
    for (const l of skenario.langkah) ada(statis, l.kirim);
    for (const l of skenario.varian.langkah) ada(crc, l.kirim);
    const [l1, l2, l3, l4, l5, l6] = skenario.langkah;
    expect(l1!.kirim).toContain(`Budi               | ${SALDO_AWAL}`);
    expect(l3!.kirim).toContain(`{"id":${JAWAB.id},"saldo":${SALDO_AKHIR},"nominal":${NOMINAL},"merchant":"${JAWAB.merchant}"}`);
    expect(l4!.kirim).toContain(` bayar | Budi         | -${NOMINAL}`);
    expect(l4!.kirim).toContain(` bayar | Toko Andalan | ${NOMINAL}`);
    expect(l5!.kirim.split("\n").slice(0, 7).map((b) => b.trim())).toEqual(KOLOM);
    expect(l6!.kirim).toContain("nama dan kota di payload sama dengan jawaban server: tidak");
    expect(l2!.kirim).toContain("nama dan kota di payload sama dengan jawaban server: ya");
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.kirim.match(/galat crc: CRC tidak cocok/g)).toHaveLength(3);
    expect(v2!.kirim).toContain(`${rib(TERDETEKSI).replace(".", "")} dari ${DICOBA} terdeteksi (${OLEH_CRC} oleh CRC, ${OLEH_TAG} oleh tag 63 yang rusak)`);
    expect(v2!.kirim).toContain(`${TUKAR[1]} dari ${TUKAR[2]} terdeteksi (hasil untuk payload ini, bukan jaminan umum)`);
    expect(v3!.kirim).toContain(`CRC berubah dari ${CRC_ASLI} menjadi ${CRC_PALSU}`);
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["stk", "srv"], ["stk", ""], ["stk", "srv"], ["srv", "dbm"], ["dbm", ""], ["stk", "srv"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["stk", ""], ["stk", ""], ["stk", "srv"]]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["", "", "warn", "warn", "", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "")).toEqual(["", "", "warn"]);
  });
  test("teks langkah (judul dan jelas) dari angka rekaman; langkah varian terakhir tidak membuka jawaban tebakan jalur utama", () => {
    const [l1, l2, l3, l4, l5, l6] = skenario.langkah;
    expect(l1!.jelas).toBe(`Bu Marni dan Toko Andalan menerbitkan QR statis masing-masing, dan payload tiap stiker dibangun dari jawaban server. Saldo Budi Rp${rib(SALDO_AWAL)}, saldo kedua merchant Rp0.`);
    expect(l2!.jelas).toBe("Stiker itu tidak dipalsukan: nama di payload sama dengan nama yang dijawab server. Letak stiker tidak ada di sistem, jadi penempelannya hanya Ilustrasi.");
    expect(l3!.jelas).toBe(`Pembayaran diterima. Saldo Budi menjadi Rp${rib(SALDO_AKHIR)}, dan jawabannya menyebut Toko Andalan sebagai merchant penerima.`);
    expect(l4!.jelas).toBe(`Dua posting berjumlah nol, dan Bu Marni tidak punya satu posting pun dari pembayaran itu. Pemeriksaan yang Raka rencanakan semuanya lolos.`);
    expect(l5!.jelas).toBe(`Tabel qr punya ${kata(KOLOM.length)} kolom, dan tidak ada yang berisi lokasi atau pengenal stiker. Yang diterima server untuk membayar hanya sesi pembeli, id QR, dan nominal.`);
    expect(l6!.jelas).toBe("Payload yang dipalsukan membawa nama Bu Marni, padahal id QR-nya milik Toko Andalan, dan CRC-nya dihitung ulang. Pemindai lab menerimanya. Nama yang dijawab server tetap Toko Andalan.");
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.jelas).toBe("Pemindai lab menolak payload yang satu karakternya berubah, di nama, di id QR, dan di nominal.");
    expect(v2!.jelas).toBe("Hasil ini berlaku untuk satu payload contoh dan dua jenis kesalahan. Sifat CRC terhadap kesalahan lain tidak dibuktikan lab.");
    expect(v3!.jelas).toBe("Tanpa CRC baru, payload ditolak. Dengan CRC yang dihitung ulang tanpa key apa pun, payload yang berubah lolos. CRC menangkap salah baca, bukan penggantian.");
    expect(v3!.judul).not.toMatch(/201|Toko Andalan|seimbang/);
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Dua merchant menerbitkan QR statis", "Budi memindai stiker yang tertempel di kasir Bu Marni", "Budi membayar Rp35.000, server menjawab 201",
      "Jurnal seimbang, buku Bu Marni tidak tersentuh", "Server tidak menyimpan letak stiker", "Payload Bu Marni dengan id Toko Andalan lolos CRC, nama berbeda dari server",
    ]);
    expect(l3!.judul).toBe(`Budi membayar Rp${rib(NOMINAL)}, server menjawab 201`);
  });
  test("skenario dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman dengan angka dari rekaman", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m35");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m35-1", "t4-m35-2", "t4-m35-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m35-qr-bu-marni/" && k.judul === "4.18 M35: QR di kasir Bu Marni")).toBe(true);
    expect(kartu[0]!.jawab).toContain(`dari \`${CRC_ASLI}\` menjadi \`${CRC_PALSU}\` (\`crc.txt\` bagian D)`);
    expect(kartu[1]!.jawab).toContain("Jurnal seimbang, merchant aktif dan terverifikasi, dan saldo cukup (`statis.txt` bagian B).");
    expect(kartu[2]!.tanya).toBe(`Lab merekam ${rib(TERDETEKSI)} dari ${rib(DICOBA)} salah baca terdeteksi. Apakah itu berarti CRC menangkap semua salah baca?`);
    expect(kartu[2]!.jawab).toContain(`satu payload contoh ${PANJANG} karakter dan dua jenis kesalahan`);
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const butir = [...cek.matchAll(/\*\*(\d+)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(butir.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(kartu.map((k) => k.tanya)).toEqual(butir.map((m) => m[2]));
    expect(kartu.map((k) => k.jawab)).toEqual(butir.map((m) => m[3]));
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: empat tautan; penutup tanpa klaim baru; akhir halaman memuat SkripLama", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]|]+)/gm)].map((m) => m[1])).toEqual(["t4-qr", "t4-prd", "t4-skema", "t4-fitur-teknis"]);
    harus("Stiker bisa diganti dan CRC tidak menahannya.");
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
  });
});

// ---- tinjauan: celah yang hanya terlihat tanpa kunci baris --------------------------------------------------------------
describe("tinjauan: nilai yang diturunkan dari sumber, bukan dari kunci baris", () => {
  test("nomor masalah dan minggu dari label registry; tidak ada token M<angka> di badan; judul tebal dan daftar bernomor tetap; satu heading", () => {
    const m35 = cocok(dari("t4-m35").label!, /^Masalah (\d+) · minggu (\d+)$/);
    harus(`Minggu ${m35[2]} Tahap 4, hari ${HARI}.`);
    expect(naskah).toContain(`| M${m35[1]} | ${m35[2]} | ${HARI}.`);
    expect(frontmatter).toContain(`title: "4.18 M${m35[1]}: QR di kasir Bu Marni"`);
    expect(frontmatter).toContain(`description: Minggu ${m35[2]}.`);
    expect([...badan.matchAll(/\bM(\d+)\b/g)].map((m) => m[1])).toEqual([]);
    expect([...badan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual([]);
    expect(badan.match(/^\*\*(\d+)\.\*\* /gm)!.map((s) => s.replace(/\D/g, ""))).toEqual(["1", "2", "3"]);
    expect([...badan.matchAll(/^\*\*([^*\n]+)\*\*/gm)].map((m) => m[1]).filter((x) => !/^\d+\.$/.test(x!))).toEqual([
      "Server menilai pembayaran itu sah.", "Isi QR dan CRC.", "CRC menangkap salah baca.", "CRC tidak menangkap penggantian.", 'Layar konfirmasi versi pertama hanya bertanya "Bayar?".', "Yang tidak direkam.",
    ]);
    expect(badan.match(/^#{1,6} /gm)).toEqual(["### "]);
  });
  test("tiga pemeriksaan Raka: urutan jurnal, buku Bu Marni, dan merchant sama dengan urutan SELECT di rekaman; angka dan nama di noscript dari rekaman", () => {
    expect(sJurnal).toBeLessThan(sPosting);
    expect(sPosting).toBeLessThan(sAkun);
    harus("Tiga pemeriksaan Raka lolos. Pertama, jurnal seimbang:");
    harus("Kedua, buku Bu Marni tidak tersentuh.");
    harus("Ketiga, kedua merchant aktif dan terverifikasi.");
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(noscript).toContain(`pembayaran Rp${rib(NOMINAL)} diterima dengan 201 ke ${JAWAB.merchant}, jurnal seimbang, dan buku Bu Marni tanpa posting.`);
    expect(noscript).toContain(`sedangkan salah baca satu karakter ditolak: ${rib(TERDETEKSI)} dari ${rib(DICOBA)} pada payload contoh.`);
    expect(noscript).toContain("Rekamannya ada di cuplikan pada blok sebelumnya.");
    harus("CRC menolak payload yang salah baca, tetapi payload yang diganti dengan CRC dihitung ulang lolos. Lab tidak punya app Flutter dan tidak merekam layar.");
  });
  test("label sumber: Rekaman lab, Hitungan, Ilustrasi, Asumsi, Tidak dijalankan, dan [perlu verifikasi] dipakai berdampingan dengan arti; tidak ada klaim kepatuhan", () => {
    for (const l of ["Rekaman lab", "Hitungan", "Ilustrasi", "Asumsi", "Tidak dijalankan", "[perlu verifikasi di PDF EMVCo]"]) expect(badan, l).toContain(l);
    expect(badan.match(/\[perlu verifikasi/g)).toHaveLength(1);
    expect(badan.match(/patuh/gi)).toHaveLength(1);
    expect(badan).toContain("tidak mengklaim kepatuhan atau izin apa pun");
    expect(badan).not.toMatch(/berizin|bersertifikat|sesuai standar EMV|memenuhi standar/i);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|PR #?\d{3}/);
    expect(badan).not.toMatch(/Rekaman lab[^.\n]{0,60}(Rp48\.000|Rp22\.000|Rp105\.000|Rabu)/);
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "empat", "tujuh", "Raka", "Budi", "Marni", "Rabu", "pertama", "kedua", "ketiga", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "naik", "turun", "lolos", "ditolak", "menolak", "diterima", "sah", "palsu", "dipalsukan", "201", "CRC", "payload", "tag", "stiker", "merchant", "Toko Andalan", "Toko Sumber Rejeki", "statis", "dinamis", "server", "lab", "key", "rahasia", "Bayar", "nama", "kota", "ADR 40", "EMVCo", "Wikipedia", "8.562", "8.314", "248", "104", "138", "65.536", "16", "Rp35.000", "Rp48.000", "Rp22.000", "Rp105.000", "Rp215.000", "Rp250.000", "B29D", "4D5E", "0x1021", "0xFFFF", "0x29B1"];
const profil = (teks: string): string =>
  PENENTU.map((k) => {
    const n = (teks.match(new RegExp(`(?<![\\p{L}-])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}-])`, "gu")) ?? []).length;
    return n ? `${k}:${n}` : "";
  }).filter(Boolean).join(" ");
const daun = (o: unknown, jalur = ""): [string, string | number | boolean][] => {
  if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") return [[jalur, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
  return [];
};

describe("nilai terkunci terpisah dari kalimat: baris riset, daun diagram dan skenario, dan profil kata penentu per baris", () => {
  test("lima baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(["R4-195", "R4-196", "R4-197", "R4-198", "R4-199"].map(barisRiset)).toEqual(RISET_TERKUNCI);
  });
  test("tiap nilai diagram dan skenario (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(SKENARIO_DAUN);
  });
  test("sidik frontmatter terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("profil kata penentu tiap baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber) sama dengan nilai terkunci", () => {
    const baris = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(baris.map(profil)).toEqual(PROFIL_BARIS);
  });
});

describe("kalimat terkunci: setiap baris badan halaman sama dengan nilai yang dibangkitkan", () => {
  test("baris badan, tidak kosong, sama dengan KALIMAT_TERKUNCI (urutan dan isi)", () => {
    const baris = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
});
