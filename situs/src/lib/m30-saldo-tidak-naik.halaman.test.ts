// Penjaga halaman 4.8 (keputusan 1294 sampai 1296): angka, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, Hitungan jam, diagram Rantai, skenario alur t4-m30.json, baris riset, dan
// kartu Cek diri di m30-saldo-tidak-naik.mdx diturunkan dari rekaman labs/t4-webhook (retry.txt), kode lab api-t4
// (pembayaran.go, handler_pembayaran.go, cmd/tiruan/jadwal.go, dasar_t4.py), run.py lab t4-webhook, naskah Tahap 4,
// registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.6): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di
// berkas nilai) mengunci SETIAP baris badan halaman, sehingga satu kata, satu "tidak", satu tingkat heading, atau satu
// atribut yang berubah menggagalkan tes; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci
// tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, id dan nilai diagram, skenario, kartu,
// baris riset) dikunci dengan sidik jari di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m30-rahasia-berganti.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./m30-saldo-tidak-naik.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m30-saldo-tidak-naik.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m30.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const retry = baca("labs/t4-webhook/output/retry.txt");
const runWebhook = baca("labs/t4-webhook/run.py");
const dasarT4 = baca("labs/api-t4/dasar_t4.py");
const pembayaranGo = baca("labs/api-t4/internal/service/pembayaran.go");
const handlerGo = baca("labs/api-t4/internal/handler/handler_pembayaran.go");
const jadwalGo = baca("labs/api-t4/cmd/tiruan/jadwal.go");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal43 = baca("situs/src/content/docs/tahap-4/fitur-topup-verifikasi.mdx");
const hal44 = baca("situs/src/content/docs/tahap-4/dua-arah-pihak-ketiga.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Layar { judul?: string; waktu?: string; saldo?: number; nada?: string; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, Layar> }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;
const jam = (menit: number): string => `${String(Math.floor(menit / 60) % 24).padStart(2, "0")}.${String(menit % 60).padStart(2, "0")}`;
const koma = (x: number, n: number): string => x.toFixed(n).replace(".", ",");

// ---- rekaman dan kode: bagian dan nomor baris Snippet -----------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 0): number => {
    const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const akhirSebelum = (n: number): number => {
    let i = n - 1;
    while (baris[i - 1]!.trim() === "") i--;
    return i;
  };
  const teks = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
  return { baris, nomor, akhirSebelum, teks };
};
const T = bagian(retry);
const tA = T.nomor((b) => b.startsWith("# --- A. ")), tB = T.nomor((b) => b.startsWith("# --- B. ")), tC = T.nomor((b) => b.startsWith("# --- C. ")), tD = T.nomor((b) => b.startsWith("# --- D. "));
const tAkhirA = T.akhirSebelum(tB), tAkhirB = T.akhirSebelum(tC), tAkhirC = T.akhirSebelum(tD);
const bagA = T.teks(tA, tAkhirA), bagB = T.teks(tB, tAkhirB), bagC = T.teks(tC, tAkhirC);
const tTabelAkhirA = T.nomor((b) => b === "(7 rows)", tA);
const K = bagian(pembayaranGo);
const kPeriksa = K.nomor((b) => b.startsWith("func (s Service) PeriksaTandaTangan("));
const kCocok = K.nomor((b) => b === "\tcocok := false", kPeriksa);
const kJikaTidakCocok = K.nomor((b) => b === "\tif !cocok {", kCocok);
const kAkhirCocok = kJikaTidakCocok + 2;
const kTerima = K.nomor((b) => b.startsWith("func (s Service) TerimaWebhook("));
const H2 = bagian(handlerGo);
const hKasus = H2.nomor((b) => b === "\tcase errors.Is(err, service.ErrTandaTangan):");
const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// ---- naskah: baris M30 dan jam cerita -------------------------------------------------------------------------------
const barisM30 = naskah.split("\n").find((b) => b.startsWith("| M30 |"))!;
const JAM_CITRA = cocok(barisM30, /Minggu (\d\d\.\d\d) Citra menulis ke CS/)[1]!;
const JAM_ROTASI = cocok(barisM30, /Sabtu (\d\d\.\d\d) gateway tiruan merotasi secret webhook/)[1]!;
const JAM_SAMA = cocok(barisM30, /Bayu menyamakannya Minggu (\d\d\.\d\d)\./)[1]!;
const NOMINAL = Number(cocok(barisM30, /Rp(\d+\.\d+) sudah keluar dari rekeningnya/)[1]!.replace(".", "")) ;
const TUJUH = cocok(barisM30, /berisi (\w+) top-up yang tidak punya jurnal/)[1]!;
const menitDari = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
// menit sejak rotasi: Sabtu 18.00 ke Minggu 09.10
const SEJAK_ROTASI = 24 * 60 - menitDari(JAM_ROTASI) + menitDari(JAM_SAMA);
const MENIT_KIRIMAN = [...bagB.matchAll(/^ (\d) +\| (\d+) +\| (\d+)$/gm)].map((m) => ({ ke: Number(m[1]), menit: Number(m[2]), kode: Number(m[3]) }));
const JADWAL_TERPANJANG = Math.max(...MENIT_KIRIMAN.map((k) => k.menit));
const BATAS = menitDari(JAM_SAMA) - JADWAL_TERPANJANG;
const RENTANG = SEJAK_ROTASI - JADWAL_TERPANJANG;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.8 ada, masalah, jalur inti, prasyarat 4.7, lab t4-webhook, peran mobile dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m30")).toMatchObject({ ada: true, nomor: "4.8", jenis: "masalah", inti: true, prasyarat: ["t4-webhook"], lab: ["t4-webhook"], tahap: 4, peran: ["mobile", "backend"] });
    expect(dari("t4-webhook").nomor).toBe("4.7");
    expect(frontmatter).toContain('title: "4.8 M30: Saldo Citra tidak naik, padahal bank sudah memotong"');
    expect(dari("t4-m30").judul).toBe("M30: Saldo Citra tidak naik, padahal bank sudah memotong");
    expect(naskah).toContain("| 4.8 | 4 | M30: Saldo Citra tidak naik, padahal bank sudah memotong | Masalah | ★ | t4-webhook | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-webhook\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m30").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "t3-at-least-once", "t4-infra-secret", "t4-rekonsiliasi", "t4-webhook"]);
    const sesuai: [string, string, string][] = [
      ["t3-at-least-once", "3.13", "At-least-once"], ["t4-webhook", "4.7", "Webhook masuk"],
      ["t4-rekonsiliasi", "4.9", "Rekonsiliasi dengan gateway"], ["t4-infra-secret", "4.17", "Secret manager"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t4-rekonsiliasi").prasyarat).toEqual(["t4-m30", "t2-job-rekonsiliasi"]);
    expect(dari("t4-infra-secret").adr).toEqual([39]);
  });
  test("janji halaman lain ke 4.8 ditepati: 4.1 (pertanyaan pertama), 4.3 (kabar hilang dan job cek status), 4.4 (jawabannya di M30)", () => {
    expect(hal41).toContain("Jawabannya dimulai di [[t4-m29]] dan [[t4-m30]] untuk pertanyaan pertama");
    expect(hal41).toContain("1. Kalau gateway mengirim kabar dua kali, terlambat, atau tidak mengirim sama sekali, siapa yang tahu?");
    harus("Pertanyaan PRD v4, siapa yang tahu bila kabar tidak datang, di sini dijawab dengan buruk: Citra lewat pesan, dan Pak Hadi lewat laporan hari Senin.");
    expect(hal43).toContain("kabar yang tidak datang di [[t4-m30]]");
    expect(hal43).toContain("| Kabar hilang, dan job cek status juga belum jalan? | Widget memakai umur job 0 detik | [[t4-m30]] |");
    expect(hal44).toContain("Jawabannya ada di [[t4-m29]], [[t4-m30]], dan [[t4-m31]].");
    harus("Di cerita, minggu 4 belum punya job yang menanyakan status top-up ke gateway, dan belum ada yang mencocokkan laporan gateway dengan ledger.");
  });
  test("halaman tidak membuka isi 4.9: hanya ADR 35 dan hanya sekali (konsep yang lahir); tanpa batas 30 menit, insiden_rekon, 0,4%, atau aturan koreksi", () => {
    expect([...new Set(badan.match(/ADR \d+/g))]).toEqual(["ADR 35"]);
    expect(badan.match(/ADR 35/g)).toHaveLength(1);
    expect(badan).not.toMatch(/insiden_rekon|RekonHarian|0,4%|\b30 menit\b|jurnal pembalik|ON CONFLICT|SKIP LOCKED|Idempotency-Key|HMAC/);
    harus("- [[t4-rekonsiliasi]]: jalan kedua untuk kabar uang, dan selisih antara bank dan ledger yang menjadi insiden bernomor. Keputusannya ADR 35.");
    expect(dari("t4-rekonsiliasi").adr).toEqual([35]);
  });
});

describe("naskah M30: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M30 di naskah: minggu 4, Rp500.000, Minggu 09.40, tujuh top-up, rotasi Sabtu 18.00, disamakan Minggu 09.10, gateway lambat dan tunggu sehari", () => {
    expect(barisM30).toMatch(/^\| M30 \| 4 \| Sabtu malam sampai Minggu pagi\./);
    expect(NOMINAL).toBe(500000);
    expect(JAM_CITRA).toBe("09.40");
    expect(JAM_ROTASI).toBe("18.00");
    expect(JAM_SAMA).toBe("09.10");
    expect(TUJUH).toBe("tujuh");
    expect(barisM30).toContain("Gateway lambat; Raka: tunggu sehari");
    expect(barisM30).toContain("saldo di app belum naik dan status top-up \"menunggu\" sejak Sabtu malam");
    expect(barisM30).toContain("Senin pagi laporan settlement gateway berisi tujuh top-up yang tidak punya jurnal (Ilustrasi)");
    expect(barisM30).toContain("Service pembayaran masih memeriksa dengan secret lama");
  });
  test("kalimat Gejala: angka dan jam dari baris naskah dan rekaman, bukan ditulis tangan; jumlah tujuh dan Ilustrasi dari naskah", () => {
    harus(`Sabtu malam Citra mengisi saldo ${rp(NOMINAL)} dari rekening banknya lewat app. Rekeningnya terpotong ${rp(NOMINAL)}, dan app menampilkan top-up itu berstatus "menunggu".`);
    harus(`Minggu pukul ${JAM_CITRA} Citra menulis ke layanan pelanggan.`);
    harus(`Laporan itu memuat ${TUJUH} top-up yang sudah dibayar di bank.`);
    harus("Statusnya masih \"menunggu\" sejak Sabtu malam, dan layanan pelanggan meneruskan pesannya ke Raka.");
    harus(`*Angka cerita (Ilustrasi):* hari, jam, dan jumlah ${TUJUH} top-up berasal dari naskah, bukan dari rekaman. Nominal ${rp(NOMINAL)} sama dengan top-up Citra di rekaman (Rekaman lab).`);
    harus("Arti Ilustrasi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].");
    expect(runWebhook).toContain(`ct = buat_topup(citra, ${String(NOMINAL).replace(/(\d)(?=(\d{3})$)/, "$1_")})`);
    expect(bagB).toContain(`# Uang ${rp(NOMINAL)} sudah di bank, status top-up menunggu, tidak ada event dan tidak ada jurnal.`);
  });
  test("adegan Gejala tanpa kalimat definisi dan tanpa konsep; yang dikira sebelum yang sebenarnya; tiga dugaan Raka", () => {
    const blokGejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf("</Blok>"));
    expect(blokGejala).not.toMatch(/ (adalah|yaitu|artinya|berarti|merupakan|disebut) /);
    expect(blokGejala).not.toMatch(/secret|webhook|401|rotasi|tanda tangan/);
    expect(badan.indexOf("Yang Raka kira")).toBeLessThan(badan.indexOf("Yang sebenarnya"));
    harus("Dugaan pertama Raka datang dari sisi yang ia pegang: layar status di app tidak menyegarkan diri.");
    harus("Dugaan kedua: top-up Citra hilang.");
    harus("Dugaan ketiga: gateway sedang lambat. Raka memutuskan menunggu sehari.");
    expect(badan.indexOf("Dugaan pertama")).toBeLessThan(badan.indexOf("Dugaan kedua"));
    expect(badan.indexOf("Dugaan kedua")).toBeLessThan(badan.indexOf("Dugaan ketiga"));
  });
  test("tebakan di blok Yang Raka kira: jawabannya tersembunyi di details dan sesuai rekaman (enam kiriman 401, webhook_event 0)", () => {
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n<\/details>/);
    expect(d[1]).toBe("Tebak dulu: gateway sudah mengirim kabar \"dibayar\" untuk top-up Citra, tetapi database tidak memuat satu pun event. Kenapa tidak ada event?");
    expect(d[2]).toContain("ditolak sebelum satu pun baris event ditulis. Penolakannya 401");
    expect(d[2]).toContain(`${MENIT_KIRIMAN.length === 6 ? "enam" : "?"} kiriman dijawab 401, dan tabel \`webhook_event\` tetap kosong`);
    expect(MENIT_KIRIMAN.map((k) => k.kode)).toEqual([401, 401, 401, 401, 401, 401]);
    expect(bagB).toMatch(/webhook_event\n-+\n 0\n/);
    expect(badan.indexOf("<details class=\"question\">")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang Raka kira" buka>'));
    expect(badan.indexOf("<details class=\"question\">")).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
  });
  test("dugaan pertama dan kedua dibantah rekaman: status menunggu, jurnal_id kosong, satu baris top-up, nol event", () => {
    expect(bagB).toContain("=> SELECT status, jurnal_id FROM topup_bank");
    expect(bagB).toMatch(/ status +\| jurnal_id\n-+\+-+\n menunggu \|\n\(1 row\)/);
    harus("Hasilnya sama dengan layar: `menunggu`, tanpa jurnal, dan tanpa satu pun event dari gateway (Rekaman lab, bagian B di blok berikutnya).");
    harus("Barisnya ada dan berstatus `menunggu`, jadi top-up tidak hilang.");
  });
});

describe("rekaman retry.txt: bagian A, B, dan C dan rentang Snippet", () => {
  test("A: jeda 2, 10, 30, 90, 210 menit sejak percobaan sebelumnya, total 342 menit; 401 enam kiriman pada menit 0, 2, 12, 42, 132, 342", () => {
    const jeda = cocok(bagA, /jeda antar percobaan \(sejak percobaan sebelumnya\): ([\d, ]+) menit \(total (\d+) menit\)/);
    const daftar = jeda[1]!.split(",").map((x) => Number(x.trim()));
    expect(daftar).toEqual([2, 10, 30, 90, 210]);
    expect(daftar.reduce((a, b) => a + b, 0)).toBe(Number(jeda[2]));
    expect(Number(jeda[2])).toBe(JADWAL_TERPANJANG);
    expect(bagA).toMatch(/ 401 +\| 6 +\| 0, 2, 12, 42, 132, 342 +\| jadwal habis/);
    expect(bagA).toMatch(/ 400 +\| 3 +\| 0, 2, 12 +\| jadwal habis/);
    harus(`Jeda antar percobaan ${daftar.slice(0, -1).join(", ")}, dan ${daftar[daftar.length - 1]} menit sejak percobaan sebelumnya.`);
    harus(`Kiriman jatuh pada menit ${MENIT_KIRIMAN.slice(0, -1).map((k) => k.menit).join(", ")}, dan ${JADWAL_TERPANJANG}.`);
    harus(`Totalnya ${JADWAL_TERPANJANG} menit, atau ${JADWAL_TERPANJANG} ÷ 60 = ${koma(JADWAL_TERPANJANG / 60, 1)} jam (Hitungan: angka yang dihitung dari angka lain di halaman).`);
    expect(JADWAL_TERPANJANG / 60).toBeCloseTo(5.7, 10);
  });
  test("B: enam kiriman, semua 401, menit 0, 2, 12, 42, 132, 342; jadwal habis; nol event; top-up menunggu tanpa jurnal; Rp500.000", () => {
    expect(MENIT_KIRIMAN).toEqual([
      { ke: 1, menit: 0, kode: 401 }, { ke: 2, menit: 2, kode: 401 }, { ke: 3, menit: 12, kode: 401 },
      { ke: 4, menit: 42, kode: 401 }, { ke: 5, menit: 132, kode: 401 }, { ke: 6, menit: 342, kode: 401 },
    ]);
    expect(bagB).toContain("gateway berhenti: jadwal habis (342 menit sesudah kiriman pertama, ±5,7 jam)");
    expect(bagB).toContain("# Gateway merotasi rahasia dan langsung menandatangani dengan yang baru; menit 0 = kiriman pertama dengan rahasia baru (waktu maya).");
    expect(bagB).toContain("(6 rows)");
    const versiPg = cocok(retry, /^# PostgreSQL (\d+\.\d+) \(Debian [^)]+\) · go\d+\.\d+\.\d+ · pgx v\d+\.\d+\.\d+ · schema tahap4_webhook/m)[1]!;
    harus(`*Kondisi rekaman:* PostgreSQL ${versiPg}, server Go \`api-t4\`, dan gateway tiruan lokal.`);
    harus("Gateway tiruan mengirim kiriman pertama dan lima ulangan untuk top-up Citra Rp500.000. Semuanya dijawab 401.");
    harus("Sesudah kiriman keenam gateway berhenti, dan database tidak memuat event maupun jurnal:");
    const ulangLainnya = Number(cocok(jadwalGo, /func jumlahUlang\(kode int\) int \{[\s\S]*?\n\treturn (\d+)\n}/)[1]);
    expect(MENIT_KIRIMAN.length).toBe(1 + ulangLainnya); // kiriman pertama + lima ulangan (jumlahUlang untuk kode lain)
  });
  test("C: kiriman 1 dan 2 dijawab 401, server dinyalakan ulang dengan rahasia baru dan lama, kiriman 3 pada menit 12 dijawab 200 diproses, top-up Eko Rp200.000 dibayar dengan jurnal", () => {
    expect(bagC).toContain("kiriman 1 dan 2: 401, 401 (sesuai perintah lab)");
    expect(bagC).toContain("# menit 2 sampai 12: rahasia di api-t4 disamakan, server dinyalakan ulang dengan <baru>,<lama>");
    expect(bagC).toMatch(/ 3 +\| 12 +\| 200 diproses/);
    expect(bagC).toMatch(/ dibayar \| t\n/);
    expect(runWebhook).toContain("et = buat_topup(eko, 200_000)");
    expect(runWebhook).toContain('url_jam=f"http://127.0.0.1:{PORT}/lab/jam", sampai=2)');
    expect(runWebhook).toContain('url_jam=f"http://127.0.0.1:{PORT}/lab/jam", dari=3)');
    expect(runWebhook).toContain('ganti_api(["-jam-lab", "-rahasia-webhook", f"{RAHASIA2},{RAHASIA1}"]');
    harus("Bagian C memakai top-up Eko Rp200.000 dengan alur yang sama: kiriman ke-3 pada menit 12 diterima, dan jurnalnya satu.");
    harus("**Penyebabnya secret, bukan waktu atau isi.** Di bagian C hanya satu hal yang berbeda sebelum kiriman ke-3: secret di api-t4 disamakan. Isi kiriman dan jam maya yang dipasang sebelum tiap kiriman sama (dibaca dari `run.py`). Kiriman 1 dan 2 dijawab 401, dan kiriman 3 pada menit 12 dijawab 200 diproses.");
  });
  test("run.py: tiap kiriman bagian B dan C memasang jam maya (url_jam) sebelum dikirim; hanya secret yang berubah di antara kiriman 2 dan 3", () => {
    const run = bagian(runWebhook);
    const iB = run.nomor((b) => b.includes('bagian("B. M30:'));
    const iC = run.nomor((b) => b.includes('bagian("C. Disamakan'));
    const iD = run.nomor((b) => b.includes('bagian("D. Pembanding'));
    const kodeB = run.teks(iB, iC - 1), kodeC = run.teks(iC, iD - 1);
    expect(kodeB).toContain('h = mainkan_jadwal(ct["order_id"], "evt-m30-1", url_jam=');
    expect(kodeC.match(/url_jam=/g)).toHaveLength(2);
    expect(kodeC.match(/mainkan_jadwal\(et\["order_id"\], "evt-m30-2"/g)).toHaveLength(2);
    expect(kodeC.match(/ganti_api\(/g)).toHaveLength(1);
    expect(kodeC).not.toMatch(/gw\("\/lab\/rahasia"/); // gateway tidak merotasi lagi di bagian C; hanya api-t4 yang diganti
    expect(kodeB).toMatch(/gw\("\/lab\/rahasia", \{"rahasia": RAHASIA2\}\)/);
  });
  test("klaim negatif berlingkup: skrip bagian B (retry.txt) tidak menjalankan job apa pun sesudah jadwal habis; hanya bagian lain memanggil -cek-topup dan -rekon", () => {
    const run = bagian(runWebhook);
    const iB = run.nomor((b) => b.includes('bagian("B. M30:'));
    const iC = run.nomor((b) => b.includes('bagian("C. Disamakan'));
    const kodeB = run.teks(iB, iC - 1);
    expect(kodeB).not.toMatch(/\bjob\(|catat_job|cek-topup|"-rekon"|koreksi|diperiksa_cek/);
    harus("Skrip rekaman bagian B tidak menjalankan job apa pun sesudah jadwal habis (Tidak dijalankan: dibaca dari `run.py`).");
    // lingkup: lab t4-webhook, rekaman retry.txt; job itu ada di rekon.txt (bukan retry.txt)
    const iRekon = run.nomor((b) => b.startsWith("def rekam_rekon():"));
    const iTesting = run.nomor((b) => b.startsWith("# ---------- testing.txt"));
    const kodeRekon = run.teks(iRekon, iTesting - 1);
    expect(kodeRekon).toMatch(/diperiksa_cek\(/);
    expect(kodeRekon).toMatch(/catat_job\(["'`][^"'`]*-rekon/);
    expect(retry).not.toMatch(/-cek-topup|-rekon/);
    expect(T.teks(tB, tAkhirB)).toContain("cek status dan rekonsiliasi (rekon.txt) yang menemukannya");
    harus("Catatan penutup rekaman itu menunjuk ke job yang lahir sesudah M30: cek status dan rekonsiliasi yang menemukan uangnya.");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, bukan ditulis tangan; berkas dan judul sesuai", () => {
    expect(tag).toHaveLength(5);
    expect(berkasSnippet).toEqual([
      "labs/api-t4/internal/service/pembayaran.go", "labs/api-t4/internal/handler/handler_pembayaran.go",
      "labs/t4-webhook/output/retry.txt", "labs/t4-webhook/output/retry.txt", "labs/t4-webhook/output/retry.txt",
    ]);
    expect(lines).toEqual([`${kCocok}:${kAkhirCocok}`, `${hKasus}:${hKasus + 1}`, `${tB}:${tAkhirB}`, `${tA}:${tTabelAkhirA}`, `${tC}:${tAkhirC}`]);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/internal/service/pembayaran.go baris ${kCocok} sampai ${kAkhirCocok} (tanda tangan dicocokkan dengan daftar secret)`,
      `Kode lab: labs/api-t4/internal/handler/handler_pembayaran.go baris ${hKasus} sampai ${hKasus + 1} (gagal tanda tangan jadi 401)`,
      "Rekaman lab: labs/t4-webhook/output/retry.txt, bagian B (enam kiriman 401, jadwal habis)",
      "Rekaman lab: labs/t4-webhook/output/retry.txt, bagian A (jumlah kiriman per kode status)",
      "Rekaman lab: labs/t4-webhook/output/retry.txt, bagian C (secret disamakan, uang tercatat satu kali)",
    ]);
    // isi rentang: batas persis
    expect(T.baris[tB - 1]).toMatch(/^# --- B\. M30: /);
    expect(T.baris[tAkhirB - 1]).toMatch(/^# Uang Rp500\.000 sudah di bank/);
    expect(T.baris[tA - 1]).toMatch(/^# --- A\. /);
    expect(T.baris[tTabelAkhirA - 1]).toBe("(7 rows)");
    expect(T.baris[tC - 1]).toMatch(/^# --- C\. /);
    expect(T.baris[tAkhirC - 1]).toBe("(1 row)");
    expect(K.baris[kCocok - 1]).toBe("\tcocok := false");
    expect(K.baris[kAkhirCocok - 1]).toBe("\t}");
    expect(K.baris[kAkhirCocok]).toBe("\treturn nil");
    expect(H2.baris[hKasus]).toContain("Status: 401");
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, nama tes, atau rujukan naskah internal", () => {
    const tampil = [T.teks(tB, tAkhirB), T.teks(tA, tTabelAkhirA), T.teks(tC, tAkhirC), K.teks(kCocok, kAkhirCocok), H2.teks(hKasus, hKasus + 1)].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b|\bTest[A-Z]\w+|tinjauan|naskah/);
  });
});

describe("kode lab: tanda tangan lebih dulu, 401, daftar secret, dan tiruan gateway", () => {
  test("PeriksaTandaTangan: mencoba semua secret di daftar, tanpa berhenti di yang pertama; tidak ada yang cocok mengembalikan ErrTandaTangan", () => {
    const kode = K.teks(kCocok, kAkhirCocok);
    expect(kode).toContain("for _, r := range s.t4.RahasiaWebhook {");
    expect(kode).toContain("if hmac.Equal(hitung, diterima) {");
    expect(kode).toContain("cocok = true");
    expect(kode).not.toMatch(/\bbreak\b|\breturn nil\b/);
    expect(kode.split("\n").slice(-3)).toEqual(["\tif !cocok {", "\t\treturn ErrTandaTangan", "\t}"]);
  });
  test("TerimaWebhook: tanda tangan diperiksa sebelum JSON diurai pada semua mode kecuali handler versi pertama; kegagalannya langsung dikembalikan", () => {
    const awal = K.teks(kTerima, kTerima + 12);
    const iPeriksa = awal.indexOf("s.PeriksaTandaTangan(timestamp, tanda, body)");
    const iUrai = awal.indexOf("json.Unmarshal(body, &k)");
    expect(iPeriksa).toBeGreaterThan(0);
    expect(iUrai).toBeGreaterThan(iPeriksa);
    expect(awal).toContain("if s.rentan != RentanWebhookV1 {");
    expect(awal).toMatch(/PeriksaTandaTangan\(timestamp, tanda, body\); err != nil \{\n\t\t\treturn HasilWebhook\{\}, err\n\t\t\}/);
    harus("Di rekaman bagian B service memeriksa tanda tangan lebih dulu, sebelum JSON diurai.");
  });
  test("handler: ErrTandaTangan dijawab 401, tanpa menulis apa pun; satu-satunya jalan ke 401 di fungsi webhook", () => {
    const kasus = H2.teks(hKasus, hKasus + 1);
    expect(kasus).toBe('\tcase errors.Is(err, service.ErrTandaTangan):\n\t\ttulisProblem(w, Problem{Type: "/problems/tanda-tangan", Title: "Tanda tangan webhook tidak sah", Status: 401})');
    const iAwal = H2.nomor((b) => b.startsWith("func (s Server) webhookPembayaran("));
    const iAkhir = H2.nomor((b) => b === "}", iAwal);
    const fungsi = H2.teks(iAwal, iAkhir);
    expect(fungsi.match(/Status: 401/g)).toHaveLength(1);
    expect(fungsi).not.toMatch(/s\.svc\.(Catat|Tulis|Kredit)/);
    harus("Handler mengubah kegagalan itu menjadi 401 (dibaca dari kode):");
  });
  test("di rekaman bagian B daftar secret api-t4 berisi satu secret: args_t4 memasang satu -rahasia-webhook dan bagian B hanya menambah -jam-lab", () => {
    expect(dasarT4).toContain('"-rahasia-webhook", RAHASIA_WEBHOOK,');
    expect(dasarT4.match(/"-rahasia-webhook"/g)).toHaveLength(1);
    expect(runWebhook).toContain('d.mulai_api(["-jam-lab"], db=DB,');
    expect(runWebhook).toContain('RAHASIA1, RAHASIA2 = d.RAHASIA_WEBHOOK, "rahasia-gateway-lab-2"');
    harus("Daftar secret yang diterima berisi satu secret, yaitu yang lama.");
  });
  test("gateway tiruan: rotasi mengganti satu secret langsung tanpa masa tumpang tindih; kiriman ditandatangani dengan secret itu dan waktu maya; jadwal 2, 10, 30, 90, 210 menit", () => {
    expect(jadwalGo).toContain("// rotasi: POST /lab/rahasia. Gateway merotasi rahasia penanda tangan dan langsung memakainya (M30): tidak ada masa");
    expect(jadwalGo).toContain("tumpang tindih di sisi gateway tiruan.");
    expect(jadwalGo).toContain("g.rahasia = in.Rahasia");
    expect(jadwalGo).not.toMatch(/rahasiaLama|rahasiaSebelumnya|rahasiaBaru/);
    const jeda = [...cocok(jadwalGo, /var jedaUlang = \[\]time\.Duration\{([^}]+)\}/)[1]!.matchAll(/(\d+) \* time\.Minute/g)].map((m) => Number(m[1]));
    expect(jeda).toEqual([2, 10, 30, 90, 210]);
    expect(jeda.reduce((a, b) => a + b, 0)).toBe(JADWAL_TERPANJANG);
    expect(jadwalGo).toContain("tandatangani(p.Rahasia, ts, asli)");
    expect(jadwalGo).toContain("maya := time.Unix(p.Mulai, 0).Add(offsetKiriman(ke))");
    expect(jadwalGo).toContain("tiruan ini tidak menggeser (supaya");
    harus("Langsung memakai secret baru, tanpa masa tumpang tindih (`retry.txt` bagian B)");
    harus("Lima ulangan dengan jeda yang sama, tanpa geseran (`retry.txt` bagian A)");
    expect(bagA).toContain("# Tiruan tidak menggeser tiap percobaan secara acak (dokumentasi gateway itu menggeser)");
  });
  test("jumlahUlang tiruan: 2xx tanpa ulangan, 400 dan 404 dua, 500 satu, 503 empat, lainnya lima; 401 jatuh ke lainnya (Asumsi untuk tiruan)", () => {
    const f = cocok(jadwalGo, /func jumlahUlang\(kode int\) int \{([\s\S]*?)\n}\n/)[1]!;
    expect(f).toMatch(/case kode >= 200 && kode < 300:\n\t\treturn 0/);
    expect(f).toMatch(/case kode == 400 \|\| kode == 404:\n\t\treturn 2/);
    expect(f).toMatch(/case kode == 500:\n\t\treturn 1/);
    expect(f).toMatch(/case kode == 503:\n\t\treturn 4/);
    expect(f).toMatch(/\n\treturn 5\n?$/);
    expect(f).not.toMatch(/401/);
    harus("Tanpa ulangan untuk 2xx, satu kali untuk 500, empat kali untuk 503, dua kali untuk 400 dan 404, dan lima kali untuk kegagalan lain. Pengalihan 301, 302, dan 303 tidak diulang, dan tiruan tidak memerankannya (Tidak dijalankan).");
    expect(barisRiset("R4-146")).toContain('"301/302/303" ("No retries")');
    expect(baca("labs/t4-webhook/README.md")).toContain("pengalihan 3xx (dokumentasi gateway itu: 301, 302, 303 tanpa ulangan; 307 dan 308 diikuti)");
    expect(retry).not.toMatch(/ 30[123] +\|/); // tiruan tidak memerankan pengalihan: tidak ada baris 301, 302, atau 303 di bagian A
    harus("Kode 401 tidak disebut sendiri di dokumentasi itu. Ia jatuh ke baris kegagalan lain, dan itu pembacaan, bukan kutipan. Tiruan memakai pembacaan itu (Asumsi), dan tabel bagian A merekam jumlah kirimannya per kode:");
    expect(bagA).toContain("# Penolakan 401 masuk 'lainnya': lima ulangan, enam kiriman, 342 menit.");
  });
});

describe("Hitungan jam: penyamaan secret lawan jadwal terpanjang", () => {
  test("910 menit dari rotasi ke penyamaan, 342 menit jadwal, batas 03.28, rentang 568 menit; semuanya dihitung dari jam naskah dan menit rekaman", () => {
    expect(SEJAK_ROTASI).toBe(910);
    expect(JADWAL_TERPANJANG).toBe(342);
    expect(BATAS).toBe(208);
    expect(jam(BATAS)).toBe("03.28");
    expect(RENTANG).toBe(568);
    expect(`${Math.floor(RENTANG / 60)} jam ${RENTANG % 60} menit`).toBe("9 jam 28 menit");
    expect(`${Math.floor(SEJAK_ROTASI / 60)} jam ${SEJAK_ROTASI % 60} menit`).toBe("15 jam 10 menit");
    harus(`Bayu menyamakan secret Minggu ${JAM_SAMA} (Ilustrasi), atau ${SEJAK_ROTASI} menit sesudah rotasi pukul ${JAM_ROTASI}. Jadwal terpanjang gateway ${JADWAL_TERPANJANG} menit.`);
    harus(`Kiriman pertama sebelum ${JAM_SAMA} − ${JADWAL_TERPANJANG} menit = ${jam(BATAS)} memakai keenam percobaannya sebelum ${JAM_SAMA}.`);
    harus(`Rentang itu dimulai dari rotasi: Sabtu ${JAM_ROTASI} sampai Minggu ${jam(BATAS)}, atau ${SEJAK_ROTASI} − ${JADWAL_TERPANJANG} = ${RENTANG} menit.`);
    expect(menitDari(JAM_ROTASI) + RENTANG - 24 * 60).toBe(BATAS); // 18.00 + 568 menit = 03.28 hari berikutnya
    expect(naskah).toContain("±03.30 (09.10 − 5,7 jam; Hitungan)");
  });
  test("tepi: kiriman pertama tepat sebelum batas kehabisan semua percobaan sebelum penyamaan; tepat sesudah batas masih punya percobaan sesudahnya", () => {
    const menit = MENIT_KIRIMAN.map((k) => k.menit);
    const sebelum = BATAS - 1, sesudah = BATAS + 1;
    expect(menit.every((m) => sebelum + m < menitDari(JAM_SAMA))).toBe(true);
    expect(menit.some((m) => sesudah + m >= menitDari(JAM_SAMA))).toBe(true);
    expect(menit.every((m) => menitDari(JAM_ROTASI) - 24 * 60 + RENTANG - 1 + m < menitDari(JAM_SAMA))).toBe(true);
    harus("Semuanya dijawab 401, dan gateway tidak mengirim lagi.");
    harus("Karena itu keputusan Raka, menunggu sehari, tidak menolong Citra. Gateway sudah berhenti mengirim sebelum Raka mulai menunggu.");
    expect(menitDari(JAM_CITRA)).toBeGreaterThan(menitDari(JAM_SAMA)); // Citra menulis sesudah penyamaan: jadwal top-up Citra sudah habis
    harus("Top-up Citra, Sabtu malam, ada di rentang itu. Kiriman pertama sesudah 03.28 masih punya percobaan sesudah 09.10, jadi tercatat, hanya terlambat.");
    expect(menitDari(JAM_ROTASI)).toBeLessThan(18 * 60 + 1);
    expect(RENTANG).toBeGreaterThan(0);
  });
  test("batas 03.28 dibatasi sumbernya: tiruan tanpa geseran, gateway kedua menggeser acak; jumlah tujuh top-up tidak diturunkan dari rentang", () => {
    harus("Batas 03.28 berlaku untuk tiruan. Gateway kedua menggeser tiap percobaan secara acak, jadi batasnya di sana bergeser sedikit.");
    harus(`Jumlah top-up di rentang itu bergantung pada berapa orang mengisi saldo; naskah menyebut ${TUJUH} top-up tanpa jurnal pada hari Senin (Ilustrasi).`);
    expect(barisRiset("R4-146")).toContain("Midtrans put a random time shift for each attempt based on above interval");
  });
  test("kegagalan butuh dua sifat sekaligus: tanpa masa tumpang tindih (rekaman) dan jadwal lebih pendek daripada penyamaan (342 lawan 910)", () => {
    expect(JADWAL_TERPANJANG).toBeLessThan(SEJAK_ROTASI);
    harus("Kegagalan seperti M30 butuh dua sifat sekaligus: rotasi tanpa masa tumpang tindih, dan jadwal ulang yang lebih pendek daripada waktu penyamaan secret. Gabungan itu bukan perilaku yang tertulis di salah satu dari kedua dokumentasi.");
    harus("Masa tumpang tindih adalah jangka waktu ketika secret lama dan secret baru sama-sama berlaku.");
  });
});

describe("sumber luar: baris riset, tanggal akses, dan kutipan", () => {
  const IDS = ["R4-145", "R4-146"];
  test("dua baris riset ada, urut ID tanpa ganda, tanggal akses sama dengan tanggal di halaman, lima kolom", () => {
    const semua = riset.split("\n").filter((b) => b.startsWith("| R4-")).map((b) => b.split(" |")[0]!.replace("| ", ""));
    expect(new Set(semua).size).toBe(semua.length);
    const nomor = (s: string) => Number(s.slice(3));
    expect(semua.map(nomor)).toEqual([...semua.map(nomor)].sort((a, b) => a - b));
    const tgl = [...new Set([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2}), Tidak dijalankan/g)].map((m) => m[1]!))];
    expect(tgl).toEqual(["2026-10-29"]);
    expect(badan.match(/dibuka 2026-10-29, Tidak dijalankan/g)).toHaveLength(2);
    for (const id of IDS) {
      expect(barisRiset(id), id).toContain("dibuka 2026-10-29");
      expect(barisRiset(id), id).toContain("(dicek ulang 2026-10-29)");
      expect(barisRiset(id).split(" | ").length, id).toBe(5);
    }
    expect(new Date(tgl[0]!).getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  });
  test("R4-145 (gateway pertama): 24 jam, satu tanda tangan per secret, tiga hari; halaman menulisnya tanpa merek dan menautkan sumbernya", () => {
    const a = barisRiset("R4-145");
    expect(a).toContain("docs.stripe.com/webhooks");
    expect(a).toContain("delay its expiration for up to 24 hours");
    expect(a).toContain("multiple secrets are active for the endpoint");
    expect(a).toContain("Stripe generates one signature per secret until expiration");
    expect(a).toContain("for up to three days with an exponential back off in live mode");
    harus("Gateway pertama: diulang sampai tiga hari dalam mode live.");
    harus("Gateway pertama: secret lama bisa tetap aktif sampai 24 jam, dengan satu tanda tangan per secret.");
    harus("([dokumentasi webhook gateway pembayaran lain](https://docs.stripe.com/webhooks), dibuka 2026-10-29, Tidak dijalankan)");
    expect(barisRiset("R4-126")).toContain("ulangan sampai tiga hari di live mode");
  });
  test("R4-146 (gateway kedua): baris Other lima kali, 401 dan rotasi tidak disebut, jitter, anjuran status; halaman menulisnya sebagai pembacaan", () => {
    const b = barisRiset("R4-146");
    expect(b).toContain("docs.midtrans.com/docs/https-notification-webhooks");
    expect(b).toContain("\"Other\" (\"Retry five times\")");
    expect(b).toContain("\"Midtrans retry at most 5 times\"");
    expect(b).toContain("the first retry time might be 33s (up to 2m) after previous attempt");
    expect(b).toContain("\"you should use the GET Status API\"");
    expect(b).toContain("halaman tidak menyebut kode 401 atau 403 sendiri dan tidak menyebut rotasi atau penggantian server key");
    expect(b).toContain("seluruh halaman terbaca (100.000 karakter pertama dan sisa 6.898 karakter)");
    expect(barisRiset("R4-136")).toContain("kegagalan lain lima kali");
    harus("([dokumentasi notifikasi HTTP sebuah gateway pembayaran](https://docs.midtrans.com/docs/https-notification-webhooks), dibuka 2026-10-29, Tidak dijalankan)");
    harus("Gateway kedua: paling banyak lima kali, jeda 2, 10, 30, 90, dan 210 menit, digeser acak");
    harus("Gateway kedua: tidak disebut di dokumentasi yang dibuka");
    harus("Dokumentasi gateway kedua sendiri menyarankan menanyakan status transaksi lewat API-nya bila notifikasi terlambat (dokumentasi yang sama, Tidak dijalankan).");
  });
  test("baris riset dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("tanpa merek di prosa (tautan sumber boleh memuat nama domain); ID riset, nomor keputusan, dan nomor PR tidak tampil (halaman, diagram, skenario, kartu)", () => {
    const tanpaTautan = badan.replace(/\]\(https?:\/\/[^)]+\)/g, "]");
    expect(tanpaTautan).not.toMatch(/Stripe|Midtrans|Xendit|https?:\/\//);
    expect([...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1])).toEqual(["https://docs.midtrans.com/docs/https-notification-webhooks", "https://docs.stripe.com/webhooks"]);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|Stripe|Midtrans/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b|Stripe|Midtrans/);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m30");
    expect(kartu).toHaveLength(3);
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|Stripe|Midtrans/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/\d+ ?B\b/); // satuan byte ditulis lengkap
  });
  test("label sumber: arti tiga label ditaut ke A0 di Gejala; Hitungan didefinisikan di pemakaian pertama; jumlah label sama dengan yang diharapkan", () => {
    harus("Arti Ilustrasi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].");
    harus("(Hitungan: angka yang dihitung dari angka lain di halaman)");
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("(Hitungan: ") + 1);
    expect(badan.match(/\(Hitungan: /g)).toHaveLength(1);
    expect(badan.match(/\bHitungan\b/g)).toHaveLength(2); // definisi di pemakaian pertama dan jawaban kartu kedua
    expect(badan).not.toMatch(/penalaran|\(Simulasi|\[perlu verifikasi\]/);
    expect(badan.match(/\(Ilustrasi\)/g)).toHaveLength(4); // Angka cerita, Sabtu 18.00, Minggu 09.10, tujuh top-up
    expect(badan.match(/Ilustrasi\)/g)).toHaveLength(5); // empat di atas dan jawaban kartu kedua (jam cerita berlabel Ilustrasi)
    expect(badan.match(/\(Rekaman lab\)/g)).toHaveLength(1);
    expect(badan.match(/\(Rekaman lab,/g)).toHaveLength(1);
    expect(badan.match(/\(Asumsi\)/g)).toHaveLength(1);
    expect(badan.match(/Tidak dijalankan\)/g)).toHaveLength(5); // dua tautan sumber, tiruan tanpa 3xx, satu anjuran status, satu jawaban kartu ketiga
    expect(badan.match(/\(dibaca dari kode\)/g)).toHaveLength(1);
    expect(badan.match(/\(Tidak dijalankan: dibaca dari `run\.py`\)/g)).toHaveLength(1);
    expect(badan.match(/\(dibaca dari `run\.py`\)/g)).toHaveLength(1);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: secret diganti (enam 401, jadwal habis, nol event dan jurnal) dan disamakan di menit 2 sampai 12 (200 diproses, satu jurnal)", () => {
    expect(diagram.id).toBe("t4-m30-rahasia-berganti");
    expect(diagram.judul).toBe("Secret berganti, kiriman ditolak");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-webhook · retry.txt bagian B dan C" });
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([
      ["Secret diganti, api-t4 belum", "jadwal 2, 10, 30, 90, 210 menit", 3],
      ["Disamakan di menit 2 sampai 12", "api-t4 dinyalakan ulang", 3],
    ]);
    const jeda = cocok(bagA, /jeda antar percobaan \(sejak percobaan sebelumnya\): ([\d, ]+) menit/)[1]!.split(",").map((x) => x.trim()).join(", ");
    expect(diagram.baris[0]!.sub).toBe(`jadwal ${jeda} menit`);
    expect(diagram.baris[0]!.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      ["Tanda tangan secret baru", "api-t4 memegang yang lama", "biasa"],
      ["Enam kiriman, enam 401", `menit ${MENIT_KIRIMAN[0]!.menit} sampai ${JADWAL_TERPANJANG}`, "warn"],
      ["Jadwal habis", "nol event, nol jurnal", "warn"],
    ]);
    expect(diagram.baris[1]!.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      ["Kiriman 1 dan 2: 401", "secret belum sama", "biasa"],
      ["Secret disamakan", "baru dan lama diterima", "biasa"],
      ["Kiriman 3: 200 diproses", "top-up dibayar, satu jurnal", "good"],
    ]);
    expect(bagC).toContain("menit 2 sampai 12");
    expect(bagC).toContain("200 diproses");
    expect(diagram.catatan).toBe("Baris pertama memakai top-up Citra Rp500.000 dan baris kedua top-up Eko Rp200.000, dengan alur yang sama. Kotak oranye adalah akibat yang direkam.");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(badan).toContain("<Rantai data={rahasiaBerganti} />");
    expect(badan).toContain('import rahasiaBerganti from "../../../../data/diagram/t4-m30-rahasia-berganti.json";');
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.indexOf("<Rantai")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
  });
});

describe("skenario alur t4-m30.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  const semuaLangkah = skenario.langkah.concat(skenario.varian.langkah);
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen, satu perangkat; sumber retry.txt; tujuh langkah dan lima langkah varian", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-webhook/output/retry.txt", fileVarian: "labs/t4-webhook/output/retry.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["gw", "Gateway (tiruan)"], ["api", "api-t4"], ["db", "PostgreSQL"]]);
    expect(skenario.perangkat).toEqual([{ id: "hp", label: "HP pemilik top-up" }]);
    expect(skenario.langkah).toHaveLength(7);
    expect(skenario.varian.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("secret di api-t4 disamakan sebelum jadwal habis");
    harus("**Ubah satu hal: secret di api-t4 disamakan sebelum jadwal habis**");
    harus("Widget ini mengikuti rekaman `retry.txt` bagian B: enam kiriman untuk top-up Citra, sampai HP Citra.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m30.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
  });
  test("tebakan: empat pilihan, jawaban benar (401, gateway berhenti, tanpa event dan jurnal) sama dengan rekaman, tiga pilihan lain bertentangan, posisi tidak ditulis dan bukan pilihan pertama atau keempat", () => {
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.answer).toBe(2);
    expect(skenario.predict.varian).toBe(false);
    expect(skenario.predict.options[skenario.predict.answer]).toBe("401, lalu gateway berhenti; top-up tetap menunggu tanpa event dan tanpa jurnal");
    expect(skenario.predict.options.filter((_, i) => i !== 2)).toEqual([
      "401, lalu gateway terus mengulang sampai secret disamakan",
      "200 diproses: api-t4 menerima kiriman terakhir",
      "500: api-t4 gagal mengurai kiriman",
    ]);
    expect(MENIT_KIRIMAN[5]).toEqual({ ke: 6, menit: 342, kode: 401 });
    expect(bagB).toContain("gateway berhenti: jadwal habis");
    expect(skenario.predict.q).toContain(`Gateway mengirim kiriman ke-6 pada menit ${JADWAL_TERPANJANG}.`);
    expect(skenario.predict.explain).toContain("Rekaman retry.txt bagian B: enam kiriman 401, webhook_event 0 baris, dan top-up menunggu tanpa jurnal.");
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
  });
  test("baris perintah dan keluaran di kirim yang bukan ringkasan (tanda panah) ada utuh di retry.txt", () => {
    for (const l of semuaLangkah) {
      for (const b of l.kirim.split("\n")) {
        if (b.startsWith("→")) continue;
        expect(retry.includes(b), `kirim tidak ada di rekaman: ${b}`).toBe(true);
      }
    }
  });
  test("baris ringkasan tanda panah sesuai rekaman: kiriman 1 pada menit 0, kiriman 2 sampai 6 pada menit 2, 12, 42, 132, 342, kiriman 3 pada menit 12", () => {
    const panah = semuaLangkah.flatMap((l) => l.kirim.split("\n").filter((b) => b.startsWith("→")));
    expect(panah).toEqual([
      "→ kiriman 1, menit 0: tanda tangan dengan secret baru",
      "→ kiriman 2 sampai 6 pada menit 2, 12, 42, 132, dan 342",
      "→ kiriman 3, menit 12: tanda tangan dengan secret baru",
    ]);
    expect(MENIT_KIRIMAN.slice(1).map((k) => k.menit)).toEqual([2, 12, 42, 132, 342]);
    expect(MENIT_KIRIMAN[0]!.menit).toBe(0);
    expect(bagC.match(/ 3 +\| 12 +\| 200 diproses/)).not.toBeNull();
    // baris tabel utama langkah 5: kiriman 2 sampai 6 dengan menit dan kode persis dari rekaman bagian B
    const langkah5 = skenario.langkah[4]!.kirim.split("\n");
    expect(langkah5).toEqual(MENIT_KIRIMAN.slice(1).map((k) => ` ${k.ke}       | ${String(k.menit).padEnd(27)} | ${k.kode}`));
  });
  test("layar HP: tanpa saldo (rekaman tidak mencetaknya); status menunggu pada jalur utama dan dibayar pada varian; jam 09.40 dari jam cerita; nominal dari rekaman", () => {
    const layar = (l: Langkah) => l.layar?.hp;
    expect(skenario.layarAwal.hp!.saldo).toBeUndefined();
    expect(skenario.langkah.map(layar).filter(Boolean)).toHaveLength(1);
    expect(skenario.varian.langkah.map(layar).filter(Boolean)).toHaveLength(1);
    const akhirUtama = layar(skenario.langkah[6]!)!;
    const akhirVarian = layar(skenario.varian.langkah[4]!)!;
    expect(akhirUtama.isi).toEqual([{ jenis: "teks", teks: `Top-up Citra ${rp(NOMINAL)}` }, { jenis: "baris", kiri: "Status", kanan: "menunggu", nada: "warn" }]);
    expect(akhirVarian.isi).toEqual([{ jenis: "teks", teks: "Top-up Eko Rp200.000" }, { jenis: "baris", kiri: "Status", kanan: "dibayar", nada: "good" }]);
    expect(skenario.layarAwal.hp!.isi).toEqual([{ jenis: "teks", teks: `Top-up Citra ${rp(NOMINAL)}` }, { jenis: "baris", kiri: "Status", kanan: "menunggu" }]);
    expect(bagB).toMatch(/ menunggu \|\n/);
    expect(bagC).toMatch(/ dibayar \| t\n/);
    expect(runWebhook).toContain("buat_topup(eko, 200_000)");
    const waktu = [...skenarioMentah.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]);
    expect(waktu).toHaveLength(3);
    expect(new Set(waktu)).toEqual(new Set([JAM_CITRA]));
    expect(skenario.sumber.catatan).toContain("Jam 09.40 di layar HP mengikuti jam cerita (Ilustrasi) dan adalah pilihan penulis.");
    expect(skenario.sumber.catatan).toContain("rekaman tidak mencetak saldo, jadi layar tidak menampilkan saldo");
  });
  test("skenario dikunci dengan sidik jari; catatan sumber menyebut perintah rekam ulang, bagian B dan C, waktu diperankan, dan top-up lain pada varian", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-webhook run BAGIAN=retry");
    expect(baca("labs/t4-webhook/README.md")).toContain("make -C labs/t4-webhook run BAGIAN=retry     # satu bagian: ganda tandatangan retry urutan rekon testing");
    expect(skenario.sumber.catatan).toContain("Jalur utama: bagian B, top-up Citra Rp500.000");
    expect(skenario.sumber.catatan).toContain("bagian C, top-up Eko Rp200.000 dengan alur yang sama");
    expect(skenario.sumber.catatan).toContain("itu top-up lain, bukan top-up Citra");
    expect(skenario.sumber.catatan).toContain("Waktu diperankan: gateway tiruan memainkan jadwal atas perintah skrip lab dan menandatangani tiap kiriman dengan waktu maya, jadi tidak ada yang menunggu 342 menit.");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Gateway merotasi secret dan memakai yang baru", "Kiriman 1 (menit 0)", "api-t4 menjawab 401", "Gateway mengulang: kiriman 2 sampai 6",
      "Kelima ulangan juga dijawab 401", "Jadwal habis, gateway berhenti", "Tidak ada event, tidak ada jurnal",
    ]);
    expect(skenario.langkah.map((l) => l.nada)).toEqual([undefined, undefined, "warn", undefined, "warn", "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual(["warn", undefined, undefined, "good", "good"]);
  });
  test("angka di teks skenario (di luar sumber dan label komponen): urutan dan nilai diturunkan dari rekaman, naskah, dan run.py", () => {
    const angka = (s: string): string[] => s.replace(/Rp(?=\d)/g, "").match(/(?<![A-Za-z0-9.-])\d+(?:[.,]\d+)*(?![A-Za-z])/g) ?? [];
    const daun = (o: unknown, jalur = ""): [string, string][] => {
      if (typeof o === "string") return [[jalur, o]];
      if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
      if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
      return [];
    };
    const daunTeks = daun(skenario).filter(([j]) => !j.startsWith(".sumber") && !j.startsWith(".komponen")).map(([j, v]) => [j, v] as [string, string]);
    const tokens = daunTeks.flatMap(([, v]) => angka(v));
    const N = titik(NOMINAL), N_EKO = titik(Number(cocok(runWebhook, /buat_topup\(eko, ([\d_]+)\)/)[1]!.replace(/_/g, "")));
    const M = MENIT_KIRIMAN.map((k) => String(k.menit));
    const jedaHitung = cocok(bagA, /jeda antar percobaan \(sejak percobaan sebelumnya\): ([\d, ]+) menit/)[1]!.split(",").map((x) => x.trim());
    const JAM = JAM_CITRA;
    // setiap angka dikelompokkan per sumber: nominal, menit kiriman, jeda, jam layar, nomor kiriman, 342 dan 5,7 dari baris berhenti
    expect(new Set(tokens.filter((t) => /^\d+(\.\d{3})+$/.test(t)))).toEqual(new Set([N, N_EKO]));
    for (const t of tokens.filter((x) => !/^\d+(\.\d{3})+$/.test(x) && x !== JAM)) {
      const dibolehkan = new Set(["1", "2", "3", "4", "5", "6", "0", ...M, ...jedaHitung, "342", "5,7", "200", "401", "500", "12"]);
      expect(dibolehkan.has(t), `angka tak terduga di skenario: ${t}`).toBe(true);
    }
    expect(tokens.filter((t) => t === JAM)).toHaveLength(3);
    expect(skenario.langkah[5]!.kirim).toBe(`gateway berhenti: jadwal habis (${JADWAL_TERPANJANG} menit sesudah kiriman pertama, ±${koma(JADWAL_TERPANJANG / 60, 1)} jam)`);
    expect(skenario.langkah[3]!.jelas).toContain(`dengan jeda ${jedaHitung.slice(0, -1).join(", ")}, dan ${jedaHitung[jedaHitung.length - 1]} menit sejak percobaan sebelumnya`);
  });
  test("tanpa JavaScript: noscript memuat hasil tebakan dan varian dengan angka yang sama dengan rekaman; rekaman C di lipatan", () => {
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain(`api-t4 menjawab 401 untuk keenam kiriman (menit ${MENIT_KIRIMAN.slice(0, -1).map((k) => k.menit).join(", ")}, dan ${JADWAL_TERPANJANG}), tabel webhook_event kosong, dan top-up Citra tetap menunggu tanpa jurnal.`);
    expect(ns).toContain("kiriman ke-3 pada menit 12 dijawab 200 diproses, dan top-up berstatus dibayar dengan satu jurnal.");
    expect(ns).toContain("Rekaman bagian C ada di lipatan di bawah.");
    const lipat = cocok(badan, /<details>\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n<\/details>/);
    expect(lipat[1]).toBe("Rekaman bagian C (juga untuk pembaca tanpa JavaScript)");
    expect(lipat[2]).toContain(`lines="${tC}:${tAkhirC}"`);
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman, Hitungan, dan dokumentasi dengan label sumber", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m30");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m30-1", "t4-m30-2", "t4-m30-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m30-saldo-tidak-naik/" && k.judul === "4.8 M30: Saldo Citra tidak naik, padahal bank sudah memotong")).toBe(true);
    expect(kartu[0]!.jawab).toContain("`retry.txt` bagian B: enam kiriman 401, `webhook_event` 0 baris");
    expect(kartu[1]!.jawab).toContain(`Kiriman pertama sebelum ${JAM_SAMA} − ${JADWAL_TERPANJANG} menit = ${jam(BATAS)} sudah memakai semua percobaannya sebelum ${JAM_SAMA}.`);
    expect(kartu[1]!.jawab).toContain("dengan jam cerita berlabel Ilustrasi");
    expect(kartu[2]!.jawab).toContain("Masa tumpang tindih sampai 24 jam dan pengulangan sampai tiga hari ada di dokumentasi gateway pertama (Tidak dijalankan).");
    expect(kartu[2]!.jawab).toContain("Jadwal lima kali dengan jeda 2, 10, 30, 90, dan 210 menit ada di dokumentasi gateway kedua, yang tidak menyebut rotasi.");
    expect(kartu.map((k) => k.tanya)).toEqual([
      "Gateway mengirim enam kiriman untuk top-up Citra, dan database tidak memuat satu pun event. Kenapa tidak ada event?",
      `Bayu menyamakan secret Minggu ${JAM_SAMA}. Kenapa top-up Citra dari Sabtu malam tetap tidak naik?`,
      "Kenapa halaman ini tidak menulis jadwal ulang dan masa tumpang tindih secret sebagai perilaku satu gateway?",
    ]);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: empat tautan, penutup tanpa klaim baru; akhir halaman memuat SkripLama", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]]+)\]\]/gm)].map((m) => m[1])).toEqual(["t4-rekonsiliasi", "t4-webhook", "t4-infra-secret", "t3-at-least-once"]);
    harus("Gateway hanya mengulang selama jadwalnya, dan ia tidak tahu kenapa Rekeningo menolak. Jalan kedua untuk kabar uang harus sudah ada sebelum jadwal itu habis.");
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
  });
});

describe("kalimat terkunci: setiap baris badan halaman sama dengan nilai yang dibangkitkan", () => {
  test("baris badan, tidak kosong, sama dengan KALIMAT_TERKUNCI (urutan dan isi)", () => {
    const baris = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
});
