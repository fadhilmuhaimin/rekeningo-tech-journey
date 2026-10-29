// Penjaga halaman 4.6 (keputusan 1286 sampai 1288): angka, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, skenario alur t4-m29.json, baris riset, dan kartu Cek diri di
// m29-topup-dua-kali.mdx diturunkan dari rekaman labs/t4-webhook (ganda.txt, ganda-serentak.txt, retry.txt) dan labs/api-t4
// (rentan.txt, skema.txt), kode lab api-t4 (pembayaran.go, repo/pembayaran.go, cmd/tiruan/main.go) dan run.py kedua lab,
// naskah Tahap 4, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.3): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di
// berkas nilai) mengunci SETIAP baris badan halaman, sehingga satu kata, satu "tidak", satu tingkat heading, atau satu atribut
// yang berubah menggagalkan tes; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak
// menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, id dan nilai diagram, skenario, kartu, baris
// riset) dikunci dengan sidik jari di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m29-satu-bayar-dua-jurnal.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./m29-topup-dua-kali.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m29-topup-dua-kali.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m29.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const ganda = baca("labs/t4-webhook/output/ganda.txt");
const serentak = baca("labs/t4-webhook/output/ganda-serentak.txt");
const retry = baca("labs/t4-webhook/output/retry.txt");
const rentan = baca("labs/api-t4/output/rentan.txt");
const skemaTxt = baca("labs/api-t4/output/skema.txt");
const runWebhook = baca("labs/t4-webhook/run.py");
const runApi = baca("labs/api-t4/run.py");
const readmeWebhook = baca("labs/t4-webhook/README.md");
const pembayaranGo = baca("labs/api-t4/internal/service/pembayaran.go");
const repoGo = baca("labs/api-t4/internal/repo/pembayaran.go");
const tiruanGo = baca("labs/api-t4/cmd/tiruan/main.go");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal42 = baca("situs/src/content/docs/tahap-4/fitur-ke-teknis.mdx");
const hal27 = baca("situs/src/content/docs/tahap-2/ledger.mdx");
const hal213 = baca("situs/src/content/docs/tahap-2/m10-dibayar-dua-kali.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Layar { judul?: string; waktu?: string; saldo?: number; saldoLabel?: string; nada?: string; isi?: { jenis: string; teks?: string }[] }
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

// ---- rekaman: bagian dan nomor baris Snippet --------------------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 0): number => {
    const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
    expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
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
const G = bagian(ganda);
const gA = G.nomor((b) => b.startsWith("# --- A. ")), gB = G.nomor((b) => b.startsWith("# --- B. "));
const gAkhirA = G.akhirSebelum(gB), gAkhir = G.baris.length - 1; // berkas berakhir dengan baris kosong
const bagA = G.teks(gA, gAkhirA), bagB = G.teks(gB, gAkhir);
const R = bagian(rentan);
const rAwalBagianA = R.nomor((b) => b.startsWith("# --- A. M29"));
const rBagianB = R.nomor((b) => b.startsWith("# --- B. "));
const rBagA = R.teks(rAwalBagianA, R.akhirSebelum(rBagianB));
const rEvent = R.nomor((b) => b.startsWith("=> SELECT count(*) AS event_tercatat"), rAwalBagianA);
const rUjungSaldo = R.nomor((b) => b.startsWith("# Dua jurnal untuk satu pembayaran"), rEvent);
const rStatus = R.nomor((b) => b === "=> SELECT status FROM topup_bank WHERE id = 1", rUjungSaldo);
const rUjungPalsu = R.nomor((b) => b.startsWith("# POST dari siapa pun diterima"), rStatus);
const S = bagian(serentak);
const sA = S.nomor((b) => b.startsWith("# --- A. ")), sB = S.nomor((b) => b.startsWith("# --- B. "));
const sUjungA = S.nomor((b) => b.startsWith("# Celah itu ada di antara membaca status dan menulis jurnal."), sA);
const sBagA = S.teks(sA, S.akhirSebelum(sB));

// ---- kode lab ---------------------------------------------------------------------------------------------------------
const K = bagian(pembayaranGo);
const kV1 = K.nomor((b) => b.startsWith("func (s Service) webhookV1("));
const kKreditV1 = K.nomor((b) => b.startsWith("func (s Service) kreditV1("), kV1);
const kAkhirKredit = K.nomor((b) => b === "}", kKreditV1);
const fungsi = (awal: number): string => {
  const akhir = K.nomor((b) => b === "}", awal);
  return K.teks(awal, akhir);
};
const kodeV1 = fungsi(kV1), kodeKreditV1 = fungsi(kKreditV1);
const kCekTulis = K.nomor((b) => b.startsWith("func (s Service) webhookCekTulis("));
const kodeCekTulis = fungsi(kCekTulis);
const kTerima = K.nomor((b) => b.startsWith("func (s Service) TerimaWebhook("));
const kodeTerima = fungsi(kTerima);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.6 ada, masalah, jalur inti, prasyarat 4.5, lab t4-webhook, peran backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m29")).toMatchObject({ ada: true, nomor: "4.6", jenis: "masalah", inti: true, prasyarat: ["t4-skema"], lab: ["t4-webhook"], tahap: 4, peran: ["backend"] });
    expect(dari("t4-skema").nomor).toBe("4.5");
    expect(frontmatter).toContain('title: "4.6 M29: Top-up Budi masuk dua kali"');
    expect(dari("t4-m29").judul).toBe("M29: Top-up Budi masuk dua kali");
    expect(naskah).toContain("| 4.6 | 4 | M29: Top-up Budi masuk dua kali | Masalah | ★ | t4-webhook | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-skema\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m29").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "t2-ledger", "t2-m10", "t3-at-least-once", "t4-dua-arah", "t4-m30", "t4-rekonsiliasi", "t4-skema", "t4-webhook"]);
    const sesuai: [string, string, string][] = [
      ["t2-m10", "2.13", "M10: Nasi goreng dibayar dua kali"], ["t2-ledger", "2.7", "Ledger double-entry"], ["t3-at-least-once", "3.13", "At-least-once"],
      ["t4-dua-arah", "4.4", "Dua arah ke pihak ketiga"], ["t4-skema", "4.5", "Skema data"], ["t4-webhook", "4.7", "Webhook masuk"],
      ["t4-m30", "4.8", "M30: Saldo Citra tidak naik"], ["t4-rekonsiliasi", "4.9", "Rekonsiliasi dengan gateway"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 4.6 ditepati: 4.1 (masalah pertama dan pertanyaan pertama) dan 4.2 (kejadiannya di 4.6)", () => {
    expect(hal41).toContain("Masalah pertama dari semua ini datang di [[t4-m29]].");
    expect(hal41).toContain("Jawabannya dimulai di [[t4-m29]] dan [[t4-m30]] untuk pertanyaan pertama");
    expect(hal42).toContain("dan kejadiannya, top-up Budi yang masuk dua kali, di [[t4-m29]].");
    harus("Raka teringat [[t2-m10]]: satu pembayaran tercatat dua kali karena app mengirim request yang sama dua kali.");
    expect(hal213).toContain("Di sana ada dua pembayaran Rp25.000 ke warung yang sama");
  });
  test("halaman tidak membuka isi 4.7: hanya ADR 34 dan hanya tiga kali (versi handler, rumusan, konsep); tanpa HMAC, toleransi, ON CONFLICT, atau ADR lain", () => {
    expect([...new Set(badan.match(/ADR \d+/g))]).toEqual(["ADR 34"]);
    expect(badan.match(/ADR 34/g)).toHaveLength(3);
    expect(badan).not.toMatch(/HMAC|ON CONFLICT|toleransi|SKIP LOCKED|byte mentah|Idempotency-Key/);
    expect(dari("t4-webhook").adr).toEqual([34]);
    harus("dan keputusannya (ADR 34) ada di [[t4-webhook]].");
  });
});

describe("naskah M29: gejala, yang dikira, dan yang sebenarnya", () => {
  const barisM29 = naskah.split("\n").find((b) => b.startsWith("| M29 |"))!;
  test("baris M29 di naskah: minggu 3, Rp200.000, Rp50.000 ke Rp450.000, Rp250.000 ke Rp650.000, tebakan bug gateway dan hapus tangan", () => {
    expect(barisM29).toContain("| M29 | 3 |");
    expect(barisM29).toContain("Budi mengisi Rp200.000 dari rekening banknya. Saldo di app naik dari Rp50.000 ke Rp450.000.");
    expect(barisM29).toContain("satu pembayaran di laporan gateway dan dua jurnal top-up di ledger (Ilustrasi; rekaman lab memakai saldo awal Rp250.000 dari data awal Tahap 3, jadi Rp250.000 ke Rp650.000)");
    expect(barisM29).toContain("Gateway mengirim dua kali karena bug; Raka mengusulkan menghapus jurnal kedua dengan tangan");
    expect(barisM29).toContain("Gateway menjamin at-least-once dan mengulang kiriman yang tidak dijawab 2xx dengan jeda menit, bukan \"dua kali dalam satu detik\"");
    expect(barisM29).toContain("kabar `menunggu` yang datang sesudah `dibayar` memundurkan status");
    expect(barisM29).toContain("alasan desain yang tidak diukur");
    expect(barisM29).toContain("memutusnya lebih awal membatalkan konteks permintaan dan bisa mem-rollback transaction");
    harus("Minggu 3 Tahap 4.");
  });
  test("kalimat Pak Hadi sama dengan naskah (PRD v4), dan kalimat 'dibayar berikutnya dikredit lagi' dikutip persis dari naskah", () => {
    const kutip = cocok(badan, /"(Setiap rupiah dari luar harus cocok dengan catatan pihak yang mengirimnya\. Kalau tidak cocok, namanya insiden, bukan angka yang saya koreksi\.)"/)[1]!;
    expect(naskah).toContain(`*"${kutip}"*`);
    expect(naskah).toContain("Rusak: status mundur ke `menunggu`, lalu kiriman `dibayar` berikutnya dikredit lagi");
    harus('Kalimat naskah "kiriman `dibayar` berikutnya dikredit lagi" terbaca dari kode, bukan dari rekaman.');
    expect(naskah).toContain('Dua hal tidak terekam. Kalimat "kiriman `dibayar` berikutnya dikredit lagi" hanya benar menurut kode `webhookV1`');
  });
  test("kalimat Gejala dan catatan Angka cerita: angka dari baris naskah dan rekaman, bukan ditulis tangan", () => {
    const m = cocok(barisM29, /Budi mengisi (Rp[\d.]+) dari rekening banknya\. Saldo di app naik dari (Rp[\d.]+) ke (Rp[\d.]+)\./);
    harus(`Budi mengisi saldo ${m[1]} dari rekening banknya lewat app. Saldo di app naik dari ${m[2]} ke ${m[3]}.`);
    harus(`Laporan gateway memuat satu pembayaran ${m[1]} dari Budi. Ledger memuat dua jurnal top-up untuk pembayaran itu.`);
    harus(`*Angka cerita (Ilustrasi):* saldo ${m[2]} ke ${m[3]} dan laporan pencocokan Pak Hadi berasal dari naskah, bukan dari rekaman.`);
    harus(`Kenaikannya sama, ${rp(650000 - 250000)} (Hitungan dari angka Rekaman lab dan Ilustrasi di atas:`);
    const naik = cocok(rBagA, /saldo Budi naik (Rp[\d.]+) untuk (Rp[\d.]+) yang dibayar\./);
    expect(naik[1]).toBe(rp(650000 - 250000));
    expect(naik[2]).toBe(m[1]);
    harus(`Saldo Budi naik ${naik[1]} untuk ${naik[2]} yang dibayar.`);
    harus("Paginya Pak Hadi mencocokkan laporan gateway dengan jurnal di ledger, seperti tiap hari.");
    harus("Gateway tidak menerima jawaban 2xx. Kemungkinan terbesar: handler sudah menyimpan jurnal dari kiriman pertama, tetapi balasan 200 tidak sampai.");
    harus("Gateway tidak rusak. Ia mengirim ulang kabar yang gagal terkirim, dan handler pertama menambah saldo dari tiap kiriman yang datang.");
    harus("Jawaban 4xx, 5xx, atau timeout dicatat sebagai kiriman yang belum berhasil, dan gateway kedua tidak mengulang pengalihan 301, 302, dan 303.");
    harus("Di lab `api-t4`, role aplikasi ditolak");
    expect(skemaTxt).toContain("Role app (api_t4)");
    harus("dua kiriman `evt-1` ke handler pertama, sampai HP Budi.");
    harus(`pola yang sama dilihat dari sisi pengirim, di Tahap ${dari("t3-at-least-once").tahap}.`);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((x) => Number(x[1]))).toEqual([1, 2, 3]);
  });
  test("pertanyaan Pak Hadi di minggu 2 dari naskah bagian 3, dan jawabannya 'dimulai di' 4.7 dan 4.9", () => {
    expect(naskah).toContain("Pak Hadi bertanya bagaimana ia tahu satu pembayaran di bank sama dengan satu jurnal di ledger.");
    harus("Di minggu 2 Pak Hadi bertanya bagaimana ia tahu satu pembayaran di bank sama dengan satu jurnal di ledger.");
    expect(dari("t4-rekonsiliasi").nomor).toBe("4.9");
  });
  test("Hitungan di Gejala diulang dari angka di teks: 650.000 − 250.000 dan 450.000 − 50.000 sama dengan 400.000 = 2 × 200.000", () => {
    const m = cocok(badan, /\(Hitungan dari angka Rekaman lab dan Ilustrasi di atas: ([\d.]+) − ([\d.]+) dan ([\d.]+) − ([\d.]+)\)/);
    const [a, b, c, d] = m.slice(1).map((x) => Number(x.replace(/\./g, "")));
    expect([a! - b!, c! - d!]).toEqual([400000, 400000]);
    expect(a).toBe(650000);
    expect(b).toBe(250000);
    expect(c).toBe(450000);
    expect(d).toBe(50000);
    expect(2 * 200000).toBe(400000);
    harus(`saldo Budi ${rp(b!)}, dan ${rp(a!)} sesudah dua jurnal (Rekaman lab)`);
    harus(`naik dari ${rp(d!)} ke ${rp(c!)}`);
  });
  test("saldo awal Budi Rp250.000 dari data awal (skema.txt bagian C) dan Rp650.000 dicetak rentan.txt bagian A; kenaikan Rp400.000 dari dua jurnal Rp200.000", () => {
    expect(skemaTxt).toMatch(/ 419 +\| Budi +\| karyawan \| terverifikasi \| 250000/);
    expect(rBagA).toContain('"nama":"Budi","saldo":650000');
    expect(rBagA).toContain("# Dua jurnal untuk satu pembayaran: saldo Budi naik Rp400.000 untuk Rp200.000 yang dibayar.");
    expect(runApi).toContain('harap(satu("SELECT saldo_cache FROM buku WHERE akun_id = 419"), 650_000, "saldo ganda")');
    expect(runApi).toContain("buat_topup(budi, 200_000, tampil=False)");
    expect(bagA).toContain("# Satu pembayaran Rp200.000, dua jurnal: saldo Budi naik Rp400.000.");
    expect(650000 - 250000).toBe(2 * 200000);
  });
  test("Lab tidak menjalankan rekonsiliasi atas handler pertama: klaim negatif berlingkup pada dua run.py dan rekaman handler pertama", () => {
    const awalG = runWebhook.indexOf("def rekam_ganda():");
    const akhirG = runWebhook.indexOf("def rekam_ganda_serentak");
    const kodeG = runWebhook.slice(awalG, akhirG);
    const awalR = runApi.indexOf("def rekam_rentan():");
    const akhirR = runApi.indexOf('tulis("rentan.txt"');
    const kodeR = runApi.slice(awalR, akhirR);
    for (const k of [kodeG, kodeR]) {
      expect(k.length).toBeGreaterThan(500);
      expect(k).not.toMatch(/rekon|-koreksi|-cek-status/i);
    }
    expect(bagA).not.toMatch(/rekon/i);
    expect(rBagA).not.toMatch(/rekon/i);
    // mode webhook-v1 hanya dijalankan di dua bagian itu (run.py kedua lab); lab lain memakai mode lain
    expect(runWebhook.match(/"webhook-v1"/g)).toHaveLength(1);
    expect(runApi.match(/"webhook-v1"/g)).toHaveLength(1);
    harus("Lab tidak menjalankan rekonsiliasi ([[t4-rekonsiliasi]]) atas handler pertama (Tidak dijalankan).");
  });
  test("satu order untuk Budi: buat_topup dipanggil sekali di bagian A, dan lab memeriksa dua jurnal untuk order itu (tidak tercetak)", () => {
    const awal = runWebhook.indexOf("def rekam_ganda():");
    const a = runWebhook.slice(awal, runWebhook.indexOf("d.stop(PORT)", awal));
    expect((a.match(/buat_topup\(/g) ?? []).length).toBe(1);
    expect(a).toContain('harap(jurnal_topup(t["order_id"]), 2, "dua jurnal top-up untuk satu pembayaran")');
    expect(runWebhook).toContain("SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = 'Top-up bank {order_id}'");
    harus("Ia memeriksa tabel `topup_bank`. Budi punya satu order, jadi app hanya membuat satu top-up.");
  });
  test("koreksi ledger: jurnal pembalik (2.7) dan role aplikasi ditolak DELETE pada jurnal (skema.txt bagian D, SQLSTATE 42501)", () => {
    expect(hal27).toContain("Salah bayar diperbaiki dengan jurnal baru yang mencerminkan jurnal asal");
    expect(hal27).toContain("Trigger `BEFORE UPDATE OR DELETE` dan `BEFORE TRUNCATE` menolak perubahan seketika");
    const d = skemaTxt.slice(skemaTxt.indexOf("# --- D. "), skemaTxt.indexOf("# --- E. "));
    expect(d).toContain("# --- D. Role app (api_t4) bukan pemilik tabel");
    expect(d).toMatch(/api_t4=> DELETE FROM jurnal WHERE id = 1;\nERROR:  permission denied for table jurnal\n +-- SQLSTATE 42501/);
    harus("role aplikasi ditolak dengan `permission denied` saat mencoba `DELETE` pada `jurnal` (`skema.txt` bagian D)");
  });
});

describe("rekaman ganda.txt, rentan.txt, ganda-serentak.txt: bagian dan rentang Snippet", () => {
  test("ganda.txt A: dua kiriman evt-1 berurutan tanpa tanda tangan, 200 diproses dua kali, jurnal 10201 dan 10202, satu pembayaran Rp200.000", () => {
    expect(bagA).toContain("\"event_id\":\"evt-1\"");
    expect(bagA).toContain("\"kali\":2,\"tanpa_tanda_tangan\":true");
    expect(bagA).toContain("# event yang sama, dua kali, berurutan");
    expect(bagA).toContain("hasil kiriman: 200 diproses, 200 diproses");
    expect(bagA).toMatch(/ 10201 +\| bank +\| -200000\n 10201 +\| karyawan \| 200000\n 10202 +\| bank +\| -200000\n 10202 +\| karyawan \| 200000\n\(4 rows\)/);
    expect(bagA).not.toMatch(/putus|diputus|ganda\b/);
    expect(runWebhook).toContain('h = kirim_webhook(event_id="evt-1", order_id=t["order_id"], kali=2, tanpa_tanda_tangan=True)');
    expect(runWebhook).toContain('harap(h, ["200 diproses", "200 diproses"], "versi pertama memproses dua kali")');
    expect(runWebhook).toContain('harap(satu("SELECT count(*) FROM webhook_event"), 0, "versi pertama tidak punya tabel event")');
    harus("Gateway tiruan mengirim `evt-1` dua kali, berurutan. Keduanya dijawab `200 diproses`, dan ledger memuat dua jurnal Rp200.000:");
  });
  test("ganda.txt B: handler versi ADR 34, koneksi diputus sesudah balasan mulai datang, kiriman 2 dijawab ganda, satu jurnal, evt-1 diproses", () => {
    expect(bagB).toContain("# server: ./api-t4 -lab (versi ADR 34: tanda tangan, tabel event, status hanya maju)");
    expect(bagB).toContain("kiriman 1 (koneksi diputus gateway begitu balasan mulai datang): koneksi diputus sesudah balasan mulai datang");
    expect(bagB).toContain("kiriman 2 (event yang sama): 200 ganda");
    expect(bagB).toMatch(/ evt-1 +\| settlement \| diproses \| t\n\(1 row\)/);
    expect(bagB).toContain("# Kiriman pertama sudah di-COMMIT sebelum balasan dikirim, jadi kiriman ulang menemukan event_id yang sama: nol baris, balas 200 tanpa jurnal.");
    expect(runWebhook).toContain('h1 = kirim_webhook(event_id="evt-1", order_id=t["order_id"], putus_balasan=True)');
    expect(runWebhook).toContain('harap(h2, ["200 ganda"], "kiriman ulang")');
    expect(runWebhook).toContain('harap(jurnal_topup(t["order_id"]), 1, "satu jurnal")');
  });
  test("klaim negatif berlingkup: rekaman handler pertama (ganda.txt A, rentan.txt A, bagian A skrip) tidak memutus balasan; hanya bagian B memakai putus_balasan", () => {
    const awal = runWebhook.indexOf("def rekam_ganda():");
    const kodeA = runWebhook.slice(awal, runWebhook.indexOf("d.stop(PORT)", awal));
    const kodeB = runWebhook.slice(runWebhook.indexOf("d.stop(PORT)", awal), runWebhook.indexOf("def rekam_ganda_serentak"));
    expect(kodeA).not.toContain("putus_balasan");
    expect(kodeB.match(/putus_balasan/g)).toHaveLength(1);
    expect((kodeA.match(/kirim_webhook\(/g) ?? []).length).toBe(1);
    expect((kodeB.match(/kirim_webhook\(/g) ?? []).length).toBe(2);
    expect(runApi.slice(runApi.indexOf("def rekam_rentan():")).split('tulis("rentan.txt"')[0]).not.toContain("putus_balasan");
    expect(rBagA).not.toMatch(/putus/);
    harus("Rekaman handler pertama tidak memutus balasan, jadi bagian B memakai handler versi ADR 34 ([[t4-webhook]]).");
    harus("Skrip lab membuat satu top-up Rp200.000 untuk Budi dan memerintahkan tiap kiriman, jadi gateway tiruan tidak mengulang sendiri.");
  });
  test("gateway tiruan: `kali` mengirim N kali atas perintah, dan putus_balasan menunggu byte pertama balasan (sesudah COMMIT) lalu menutup koneksi", () => {
    expect(tiruanGo).toContain("// kirimWebhook mengirim kabar ke Rekeningo sebanyak `kali` (berurutan, atau serentak bila `serentak`)");
    expect(tiruanGo).toContain("// kirimPutus: balasan hilang di jalan.");
    expect(tiruanGo).toContain("gateway menunggu sampai byte");
    expect(tiruanGo).toContain("pertama balasan tiba (tanda Rekeningo sudah selesai dan COMMIT), lalu menutup koneksi tanpa membaca isinya.");
    const kirim = tiruanGo.slice(tiruanGo.indexOf("func (g *gateway) kirimWebhook("), tiruanGo.indexOf("func (g *gateway) kirimPutus("));
    expect(kirim.length).toBeGreaterThan(1000);
    expect(kirim).not.toMatch(/time\.Sleep|time\.After|time\.Tick|jadwal/i); // jalur kirimWebhook tidak menjadwalkan ulangan sendiri
    expect(kirim).toContain("for i := 0; i < in.Kali; i++ {");
    expect(retry).toContain("waktu diperankan (waktu maya pada tanda tangan), bukan ditunggu");
  });
  test("rentan.txt A: webhook_event 0 baris, saldo 650000, status mundur ke menunggu, kabar tanpa tanda tangan Rp1.234.567 dikreditkan ke Budi", () => {
    expect(rBagA).toMatch(/event_tercatat\n-+\n 0\n\(1 row\)/);
    expect(rBagA).toContain("kiriman event yang sama dua kali, tanpa tanda tangan: 200 diproses, 200 diproses");
    expect(rBagA).toMatch(/=> SELECT status FROM topup_bank WHERE id = 1\n status\n-+\n menunggu\n\(1 row\)/);
    expect(rBagA).toContain("# Kabar pending sesudah dibayar: status mundur ke menunggu (tidak ada status bersyarat).");
    expect(rBagA).toContain('"event_id": "evt-palsu"');
    expect(rBagA).toContain('"jumlah": 1234567}');
    expect(rBagA).toContain("# POST dari siapa pun diterima, dan jumlah di isi kabar dipercaya: Rp1.234.567 dikreditkan ke Budi.");
    expect(runApi).toContain('harap(satu("SELECT saldo_cache FROM buku WHERE akun_id = 419"), 650_000 + 1_234_567, "jumlah dari isi kabar")');
    harus(`Kabar tanpa tanda tangan dengan jumlah ${rp(1234567)} diterima, dan jumlah itu dikreditkan ke Budi:`);
    harus("Tabel `webhook_event` tetap kosong, dan database tidak menolak jurnal kedua:");
  });
  test("ganda-serentak.txt A: webhook-cek-tulis dengan jeda 300 ms, dua kiriman bersamaan sama-sama diproses, dua jurnal; lebar celah tanpa jeda tidak diukur", () => {
    expect(serentak).toContain("-rentan webhook-cek-tulis -lab-jeda-cek-tulis 300ms");
    expect(sBagA).toContain("dua kiriman bersamaan, tanda tangan sah (diurutkan): 200 diproses, 200 diproses");
    expect(sBagA).toMatch(/jurnal_topup_bank\n-+\n 2\n\(1 row\)/);
    expect(sBagA).toContain("lebar celah tanpa jeda tidak diukur dan tidak menjadi klaim.");
    expect(runWebhook).toContain('"-lab-jeda-cek-tulis", "300ms"');
    expect(readmeWebhook).toContain("jeda lab 300 ms di antara cek dan tulis");
    expect(readmeWebhook).toMatch(/Toleransi waktu 5 menit, umur cek status 30 menit, jeda lab 300 ms[^\n]*Asumsi untuk tiruan/);
    harus("Jeda 300 ms di antara cek dan tulis adalah pilihan lab untuk melebarkan celah (Asumsi). Lebar celah tanpa jeda tidak diukur:");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, bukan ditulis tangan; berkas dan judul sesuai", () => {
    expect(berkasSnippet).toEqual([
      "labs/api-t4/internal/service/pembayaran.go", "labs/t4-webhook/output/ganda.txt", "labs/api-t4/output/rentan.txt", "labs/t4-webhook/output/ganda.txt",
      "labs/t4-webhook/output/ganda-serentak.txt", "labs/api-t4/output/rentan.txt", "labs/t4-webhook/output/ganda.txt",
    ]);
    expect(lines).toEqual([
      `${kV1}:${kAkhirKredit}`, `${gA}:${gAkhirA}`, `${rEvent}:${rUjungSaldo}`, `${gB}:${gAkhir}`, `${sA}:${sUjungA}`, `${rStatus}:${rUjungPalsu}`, `${gA}:${gAkhir}`,
    ]);
    expect(kKreditV1).toBeGreaterThan(kV1);
    expect(G.baris[gAkhir]).toBe("");
    expect(G.baris[gAkhir - 1]!.trim()).not.toBe("");
    // Snippet ketujuh (lipatan): ganda.txt dari baris bagian A sampai baris terakhir; tiga baris kepala tidak tampil
    // karena baris keduanya memuat versi alat, dan baris ketiganya memuat nama perintah rekam ulang lab.
    expect(G.baris.slice(0, 3).join("\n")).toMatch(/PostgreSQL 17\.11/);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/internal/service/pembayaran.go baris ${kV1} sampai ${kAkhirKredit} (handler pertama)`,
      "Rekaman lab: labs/t4-webhook/output/ganda.txt, bagian A (handler pertama, dua kiriman)",
      "Rekaman lab: labs/api-t4/output/rentan.txt, bagian A (tabel event kosong, saldo Budi)",
      "Rekaman lab: labs/t4-webhook/output/ganda.txt, bagian B (balasan hilang, satu jurnal)",
      "Rekaman lab: labs/t4-webhook/output/ganda-serentak.txt, bagian A (dua kiriman bersamaan)",
      "Rekaman lab: labs/api-t4/output/rentan.txt, bagian A (status mundur, kabar tanpa tanda tangan)",
      "Rekaman lab: labs/t4-webhook/output/ganda.txt, bagian A dan B (tanpa baris kepala)",
    ]);
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, nama tes, atau rujukan naskah internal", () => {
    for (const t of tag) {
      const file = t.match(/file="([^"]+)"/)![1]!;
      let src = baca(file);
      const r = t.match(/lines="([^"]+)"/)?.[1];
      if (r) {
        const [a, b] = r.split(":").map(Number);
        src = src.split("\n").slice(a! - 1, b).join("\n");
      }
      expect(src.length, t).toBeGreaterThan(0);
      expect(src, t).not.toMatch(/\bR\d-\d{2,3}\b|\bPR #?\d{3}\b|\bkeputusan \d{3}\b|\bTest[A-Z][A-Za-z]+|--8<--|minggu 2 naskah/);
      expect(t, t).not.toMatch(/region=/);
    }
  });
});

describe("kode lab: handler pertama, cek-lalu-tulis, kunci baris, dan penolakan tanda tangan", () => {
  test("webhookV1: baca baris top-up untuk diubah (FOR UPDATE), tanpa memeriksa status; jurnal dari jumlah di isi kabar; status diganti tanpa syarat", () => {
    expect(kodeV1).toContain("tp, err := tx.TopupBankUntukUbah(ctx, k.OrderID)");
    expect(repoGo).toContain("WHERE order_id = $1 FOR UPDATE`, orderID))");
    expect(repoGo).toContain("// TopupBankUntukUbah membaca baris top-up dengan baris dikunci (FOR UPDATE) di dalam transaction.");
    expect(kodeV1).not.toMatch(/tp\.Status|Status ==|webhook_event|EventID|Idempotency/);
    expect(kodeV1).toContain('if k.Status != "settlement" {');
    expect(kodeV1).toContain("return s.kreditV1(ctx, tx, tp, k.Jumlah, &h)");
    expect(kodeKreditV1).toContain("Jumlah: -jumlah}, {BukuID: buku[tp.AkunID].ID, Jumlah: jumlah}");
    expect(kodeKreditV1).toContain('return tx.UbahStatusTanpaSyarat(ctx, tp.OrderID, "dibayar")');
    expect(kodeKreditV1).not.toMatch(/jurnal_id|JurnalID|EventID|webhook_event/);
    expect(repoGo).toMatch(/UPDATE topup_bank SET status = \$2 WHERE order_id = \$1`, orderID, ke\)/);
    harus("membaca baris top-up dengan `FOR UPDATE`, lalu menulis jurnal sebesar `jumlah` di isi kiriman. Ia tidak memeriksa status top-up dan tanda tangan, dan tidak menyimpan `event_id`:");
    harus("`webhookV1` menjurnal tiap `settlement` tanpa memeriksa status.");
  });
  test("tanda tangan: mode webhook-v1 melewati PeriksaTandaTangan, mode lain memeriksanya; kode tidak memeriksa waktu kiriman di mode itu", () => {
    expect(kodeTerima).toContain("if s.rentan != RentanWebhookV1 {");
    expect(kodeTerima).toContain("s.PeriksaTandaTangan(timestamp, tanda, body)");
    expect(baca("labs/api-t4/internal/service/t4_aturan.go")).toMatch(/RentanWebhookV1 +=  ?"webhook-v1"/);
    harus("Handler juga tidak memeriksa tanda tangan atau waktu, jadi isi yang diubah dan kiriman lama yang diputar ulang ikut diterima (dibaca dari kode, Tidak dijalankan).");
  });
  test("webhookCekTulis: status dibaca lewat TopupBankLewatOrder di luar transaction tanpa FOR UPDATE; jawab ganda bila dibayar; jurnal di DalamTx sendiri sesudah jeda lab", () => {
    expect(kodeCekTulis).toContain("tp, err := s.repo.TopupBankLewatOrder(ctx, k.OrderID)");
    expect(kodeCekTulis).toContain('if tp.Status == "dibayar" {');
    expect(kodeCekTulis).toContain('return HasilWebhook{Hasil: "ganda"}, nil');
    expect(kodeCekTulis).toContain("err = s.repo.DalamTx(ctx, func(tx repo.Tx) error { return s.kreditV1(ctx, tx, tp, k.Jumlah, &h) })");
    expect(kodeCekTulis.indexOf("TopupBankLewatOrder")).toBeLessThan(kodeCekTulis.indexOf("s.t4.JedaCekTulis"));
    expect(kodeCekTulis.indexOf("s.t4.JedaCekTulis")).toBeLessThan(kodeCekTulis.indexOf("DalamTx"));
    const sqlBaca = cocok(repoGo, /func \(r Repo\) TopupBankLewatOrder[^\n]*\n[^\n]*`SELECT `\+kolomTopup\+` FROM topup_bank WHERE order_id = \$1`/)[0];
    expect(sqlBaca).not.toContain("FOR UPDATE");
    harus("handler membaca status di luar transaction dan tanpa mengunci baris, lalu menulis jurnal di transaction sendiri (dibaca dari kode, Tidak dijalankan).");
  });
  test("mode webhook-cek-tulis memanggil kreditV1 yang sama dengan handler pertama; mode rentan hanya dua (webhook-v1, webhook-cek-tulis) untuk M29", () => {
    expect(baca("labs/api-t4/internal/service/t4_aturan.go")).toMatch(/RentanWebhookCekTulis = "webhook-cek-tulis"/);
    expect(kodeTerima).toContain("case RentanWebhookV1:");
    expect(kodeTerima).toContain("case RentanWebhookCekTulis:");
    expect(readmeWebhook).toContain("Mode rentan yang dipakai adalah `webhook-v1` dan `webhook-cek-tulis` (api-t4)");
  });
});

describe("sumber luar: baris riset, tanggal akses, dan kutipan", () => {
  const IDS = ["R4-135", "R4-136", "R4-137", "R4-138"];
  test("empat baris riset ada, urut ID tanpa ganda, dan tanggal akses sama dengan tanggal di halaman", () => {
    const semua = riset.split("\n").filter((b) => b.startsWith("| R4-")).map((b) => b.split(" |")[0]!.replace("| ", ""));
    expect(new Set(semua).size).toBe(semua.length);
    const nomor = (s: string) => Number(s.slice(3));
    expect(semua.map(nomor)).toEqual([...semua.map(nomor)].sort((a, b) => a - b));
    const tgl = cocok(badan, /\(dibuka (\d{4}-\d{2}-\d{2}), Tidak dijalankan\)/)[1]!;
    expect(tgl).toBe("2026-10-29");
    for (const id of IDS) expect(barisRiset(id), id).toContain(`dibuka ${tgl}`);
    for (const id of ["R4-135", "R4-136"]) expect(barisRiset(id), id).toContain(`(dicek ulang ${tgl})`);
    expect(new Date(tgl).getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  });
  test("R4-135 dan R4-136: kutipan yang menopang kalimat halaman (duplikat, timeout, tiga hari, lima kali, jeda menit, tanpa merek di halaman)", () => {
    const a = barisRiset("R4-135"), b = barisRiset("R4-136");
    expect(a).toContain("docs.stripe.com/webhooks");
    expect(a).toContain("up to three days with an exponential back off in live mode");
    expect(a).toContain('"(Timed out) ERR"');
    expect(a).toContain("Webhook endpoints might occasionally receive the same event more than once");
    expect(b).toContain("docs.midtrans.com/docs/https-notification-webhooks");
    expect(b).toContain("Midtrans retry at most 5 times");
    expect(b).toContain("In extremely rare cases, we may send multiple notifications for the same transaction event");
    const jeda = cocok(b, /jeda pertama (\d+) menit, kedua (\d+) menit, ketiga (\d+) menit, keempat (\d+) menit, kelima (\d+) menit/).slice(1).map(Number);
    expect(jeda).toEqual([2, 10, 30, 90, 210]);
    const retryJeda = cocok(retry, /jeda antar percobaan \(sejak percobaan sebelumnya\): ([\d, ]+) menit/)[1]!.split(",").map((x) => Number(x.trim()));
    expect(retryJeda).toEqual(jeda);
    harus(`jeda ${jeda.slice(0, -1).join(", ")}, dan ${jeda[jeda.length - 1]} menit`);
    harus("Gateway pertama mengirim ulang sampai tiga hari di mode live.");
    harus("Gateway kedua mengirim ulang paling banyak lima kali, bergantung pada kode jawaban,");
    harus("kiriman ulang pertama datang 2 menit sesudah yang pertama, bukan dalam satu detik.");
    expect(jeda[0]).toBe(2);
    expect(b).toContain("500 sekali, 503 empat kali, 400 dan 404 dua kali, kegagalan lain lima kali, pengalihan 301, 302, dan 303 tanpa ulangan");
    expect(a).toContain("(Timed out) ERR"); // timeout dicatat sebagai kiriman belum berhasil (gateway pertama)
    harus("menulis dua hal.");
    expect(badan).not.toMatch(/tidak dijawab 2xx|selain 2xx/);
    expect(readmeWebhook).toContain("Jumlah ulangan per kode dan jeda dibaca persis");
    expect(badan).not.toMatch(/Stripe|Midtrans/);
  });
  test("R4-137 (PostgreSQL 17 bagian 13.2.1) dan R4-138 (RFC 9110 bagian 9.2.2): kutipan dan bagian sama dengan halaman", () => {
    const c = barisRiset("R4-137"), d = barisRiset("R4-138");
    expect(c).toContain("postgresql.org/docs/17/transaction-iso.html");
    expect(c).toContain("13.2.1");
    expect(c).toContain("sees only data committed before the query began");
    harus("(dokumentasi PostgreSQL 17, bagian 13.2.1, Tidak dijalankan)");
    expect(d).toContain("rfc-editor.org/rfc/rfc9110.txt");
    expect(d).toContain("9.2.2");
    expect(d).toContain("A client SHOULD NOT automatically retry a request with a non-idempotent method");
    expect(d).toContain("the request can be repeated automatically if a communication failure occurs before the client is able to read the server's response");
    harus("RFC 9110 bagian 9.2.2 menulis bahwa kegagalan komunikasi bisa terjadi sebelum client membaca jawaban server.");
    harus("Karena itu client sebaiknya tidak mengulang otomatis permintaan yang tidak idempoten (SHOULD NOT)");
    expect(ganda).toContain("PostgreSQL 17.11");
    harus("PostgreSQL 17.11, server Go `api-t4` dengan mode rentan `webhook-v1`, dan gateway tiruan lokal.");
  });
  test("baris riset dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
  });
  test("tanpa tautan eksternal di halaman; ID riset, nomor keputusan, dan nomor PR tidak tampil (halaman, diagram, skenario, kartu)", () => {
    expect(badan).not.toMatch(/https?:\/\//);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m29");
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/\d+ ?B\b/); // satuan byte ditulis lengkap
  });
  test("label sumber: arti tiga label ditaut ke A0 di Gejala; Hitungan dan Penalaran didefinisikan di pemakaian pertama; jumlah label sama dengan yang diharapkan", () => {
    harus("Arti Ilustrasi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].");
    // keputusan 1289: tanpa paragraf definisi di adegan Gejala (python3 tools/eval_tahap.py gejala 4); Hitungan diberi arti
    // sebaris di pemakaian pertama, penalaran di pemakaian pertama di blok Yang sebenarnya
    harus("(Hitungan dari angka Rekaman lab dan Ilustrasi di atas:");
    harus("(Tidak dijalankan, penalaran: kesimpulan dari kode atau rekaman lain, tanpa rekaman sendiri)");
    const blokGejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf("</Blok>"));
    expect(blokGejala).not.toMatch(/ (adalah|yaitu|artinya|berarti|merupakan|disebut) /);
    // keputusan 1289: label turunan (Hitungan, penalaran, dibaca dari kode) selalu berdampingan dengan satu dari lima label
    // di /cara-pakai/ (Tidak dijalankan, Rekaman lab, Ilustrasi)
    expect(badan.indexOf("(Tidak dijalankan, penalaran: ")).toBeLessThan(badan.indexOf("(Tidak dijalankan, penalaran)"));
    expect(badan.indexOf("penalaran")).toBe(badan.indexOf("(Tidak dijalankan, penalaran: ") + "(Tidak dijalankan, ".length);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("(Hitungan dari ") + 1);
    expect(badan.match(/\(Tidak dijalankan, penalaran\)/g)).toHaveLength(1);
    expect(badan).not.toMatch(/\(penalaran/);
    for (const m of badan.matchAll(/\(dibaca dari kode[^)]*\)/g)) expect(m[0], "label turunan tanpa label sumber").toContain("Tidak dijalankan");
    expect(badan.match(/penalaran dari bagian A, bagian B, dan dokumentasi gateway \(Tidak dijalankan\)\./g)).toHaveLength(1);
    expect(badan.match(/\(Tidak dijalankan\)/g)).toHaveLength(5);
    expect(badan.match(/Tidak dijalankan\)/g)).toHaveLength(10);
    expect(badan.match(/\(dibaca dari kode[^)]*\)/g)).toHaveLength(3);
    expect(badan.match(/\(Asumsi\)/g)).toHaveLength(1);
    expect(badan.match(/\(Rekaman lab\)/g)).toHaveLength(1);
    expect(badan.match(/\(Ilustrasi\)/g)).toHaveLength(1);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: handler pertama (jurnal pertama, kiriman lagi, jurnal kedua Rp200.000) dan handler dengan tabel event_id (COMMIT, event_id sama, ganda)", () => {
    expect(diagram.id).toBe("t4-m29-satu-bayar-dua-jurnal");
    expect(diagram.judul).toBe("Satu pembayaran, dua jurnal");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-webhook · ganda.txt bagian A dan B" });
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([
      ["Handler pertama", "tanpa tabel event, tanpa pemeriksaan status", 3],
      ["Handler dengan tabel event_id", "balasan 200 pertama hilang di jalan", 3],
    ]);
    const jumlah = Number(cocok(runWebhook, /buat_topup\(budi, ([\d_]+)\)/)[1]!.replace(/_/g, ""));
    expect(diagram.baris[0]!.simpul.map((s) => s.sub)).toEqual([`jurnal pertama ${rp(jumlah)}`, "tidak dikenali", "satu pembayaran, dua jurnal"]);
    expect(diagram.baris[0]!.simpul[2]!.teks).toBe(`Jurnal kedua ${rp(jumlah)}`);
    expect(diagram.baris[1]!.simpul.map((s) => s.sub)).toEqual(["balasan putus di jalan", "nol baris di tabel event", "satu jurnal"]);
    expect(bagA).toContain('"event_id":"evt-1"');
    expect(bagB).toContain("kiriman 2 (event yang sama): 200 ganda");
    expect(bagB).toContain("nol baris");
    expect(diagram.catatan).toBe("Di kedua baris Budi membayar sekali dan gateway tiruan mengirim dua kali. Yang berbeda: handler di baris kedua mencatat event_id, dan balasan pertamanya hilang di jalan.");
    expect(diagram.baris.flatMap((b) => b.simpul.map((s) => [s.teks, s.nada]))).toEqual([
      ["Kiriman evt-1", "biasa"], ["Kiriman evt-1 lagi", "warn"], [`Jurnal kedua ${rp(jumlah)}`, "warn"],
      ["Kiriman 1 di-COMMIT", "biasa"], ["Kiriman 2, event_id sama", "biasa"], ["Dijawab ganda", "good"],
    ]);
  });
  test("diagram dikunci dengan sidik jari (setiap nilai string) dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(badan).toContain("<Rantai data={satuBayar} />");
    expect(badan).toContain('import satuBayar from "../../../../data/diagram/t4-m29-satu-bayar-dua-jurnal.json";');
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.indexOf("<Rantai")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
  });
});

describe("skenario alur t4-m29.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  const semuaLangkah = skenario.langkah.concat(skenario.varian.langkah);
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen, satu perangkat; sumber ganda.txt; tujuh langkah dan lima langkah varian", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/api-t4/output/rentan.txt", fileVarian: "labs/t4-webhook/output/ganda.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["gw", "Gateway (tiruan)"], ["api", "api-t4"], ["db", "PostgreSQL"]]);
    expect(skenario.perangkat).toEqual([{ id: "budi", label: "HP Budi" }]);
    expect(skenario.langkah).toHaveLength(7);
    expect(skenario.varian.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("handler dengan tabel event_id, dan balasan 200 pertama hilang di jalan");
    harus("**Ubah satu hal: handler dengan tabel event_id, dan balasan 200 pertama hilang di jalan**");
    harus("Widget ini mengikuti rekaman `rentan.txt` bagian A dan `ganda.txt` bagian A:");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m29.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
  });
  test("tebakan: empat pilihan, jawaban benar sama dengan rekaman (200 diproses dan jurnal kedua), tiga pilihan lain bertentangan dengan rekaman, posisinya tidak ditulis di halaman", () => {
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.answer).toBe(3);
    expect(skenario.predict.varian).toBe(false);
    expect(skenario.predict.options[skenario.predict.answer]).toBe("200 diproses: jurnal kedua ditulis dengan jumlah yang sama");
    expect(bagA).toContain("hasil kiriman: 200 diproses, 200 diproses");
    expect(skenario.predict.options.slice(0, 3)).toEqual([
      "200 ganda: status top-up sudah dibayar, jadi tidak ada jurnal baru",
      "200 ganda: event_id evt-1 sudah pernah tercatat di tabel event",
      "Galat: database menolak jurnal kedua untuk order yang sama",
    ]);
    expect(skenario.predict.explain).toContain("Rekaman ganda.txt bagian A: 200 diproses dua kali dan dua jurnal untuk satu pembayaran.");
    expect(skenario.predict.explain).toContain("Tabel webhook_event tetap 0 baris (rentan.txt bagian A)");
    expect(skenario.predict.q).toContain("Handler membaca baris top-up dengan FOR UPDATE, tetapi tidak menyimpan event_id dan tidak memeriksa status top-up.");
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
  });
  test("baris perintah dan keluaran di kirim yang bukan ringkasan (tanda panah) ada utuh di ganda.txt atau rentan.txt", () => {
    for (const l of semuaLangkah) {
      for (const b of l.kirim.split("\n")) {
        if (b.startsWith("→")) continue;
        expect(ganda.includes(b) || rentan.includes(b), `kirim tidak ada di rekaman: ${b}`).toBe(true);
      }
    }
  });
  test("baris ringkasan tanda panah sesuai rekaman: jurnal 10201 dan 10202 (bank -200000, karyawan 200000), saldo 650000 dari data awal 250000", () => {
    const panah = semuaLangkah.flatMap((l) => l.kirim.split("\n").filter((b) => b.startsWith("→")));
    expect(panah).toEqual([
      "→ jurnal 10201: bank −Rp200.000, karyawan +Rp200.000",
      "→ kiriman 1: 200 diproses",
      "→ kiriman 2: event_id evt-1 yang sama, tanpa tanda tangan",
      "→ jurnal 10202: bank −Rp200.000, karyawan +Rp200.000",
      "→ saldo Budi: 650000 (data awal 250000)",
      "→ kiriman 1: evt-1, bertanda tangan",
      "→ webhook_event: evt-1, settlement, diproses; satu jurnal",
    ]);
    for (const j of [10201, 10202]) {
      expect(bagA).toMatch(new RegExp(` ${j} +\\| bank +\\| -200000`));
      expect(bagA).toMatch(new RegExp(` ${j} +\\| karyawan \\| 200000`));
    }
    expect(rBagA).toContain('"saldo":650000');
    expect(skemaTxt).toMatch(/ 419 +\| Budi +\| karyawan \| terverifikasi \| 250000/);
  });
  test("layar HP Budi: saldo awal 250000 (data awal), 650000 sesudah dua jurnal (rentan.txt); varian tanpa saldo karena bagian B tidak mencetaknya; tiap layar berjam sama (pilihan penulis)", () => {
    const saldo = (l: Langkah) => l.layar?.budi?.saldo;
    expect(skenario.layarAwal.budi!.saldo).toBe(250000);
    expect(skenario.langkah.map(saldo)).toEqual([undefined, undefined, undefined, undefined, undefined, undefined, 650000]);
    expect(skenario.varian.langkah.map(saldo)).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(bagB).not.toMatch(/\b450000\b|saldo/i);
    expect(650000).toBe(250000 + 2 * 200000);
    expect(rBagA).toContain('"saldo":650000');
    const waktu = [...skenarioMentah.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]);
    expect(waktu).toHaveLength(3); // layarAwal, layar akhir jalur utama, dan layar akhir varian
    expect(new Set(waktu)).toEqual(new Set(["12.05"]));
    expect(skenario.sumber.catatan).toContain("Jam 12.05 di layar HP adalah pilihan penulis.");
    expect(skenario.sumber.catatan).toContain("rekaman bagian B tidak mencetak saldo, jadi layar akhir varian tidak menampilkan saldo");
  });
  test("skenario dikunci dengan sidik jari (setiap nilai string); catatan sumber menyebut perintah rekam ulang, run terpisah, gateway tiruan atas perintah, dan layar digambar", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-webhook run BAGIAN=ganda");
    expect(readmeWebhook).toContain("make -C labs/t4-webhook run BAGIAN=retry     # satu bagian: ganda tandatangan retry urutan rekon testing");
    expect(skenario.sumber.catatan).toContain("Perintah dan jurnalnya sama dengan ganda.txt bagian A di labs/t4-webhook (make -C labs/t4-webhook run BAGIAN=ganda): run terpisah dengan data awal yang sama.");
    expect(skenario.sumber.catatan).toContain("Jalur utama: rentan.txt bagian A di labs/api-t4 (make -C labs/api-t4 run)");
    expect(skenario.sumber.catatan).toContain("Gateway tiruan mengirim tiap kiriman atas perintah skrip lab, bukan mengulang sendiri");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Gateway mengirim kabar evt-1: settlement", "Handler pertama menulis jurnal 10201", "Handler menjawab 200", "Gateway mengirim kabar yang sama lagi",
      "Handler pertama menulis jurnal kedua 10202", "Handler menjawab 200 lagi", "Saldo Budi naik Rp400.000",
    ]);
    expect(skenario.langkah.map((l) => l.nada)).toEqual([undefined, undefined, undefined, "warn", "warn", "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual([undefined, undefined, "warn", undefined, undefined]);
  });
  test("angka di teks skenario (di luar sumber dan label komponen): urutan dan nilai diturunkan dari rekaman, run.py, naskah, dan skema.txt", () => {
    const angka = (s: string): string[] => s.replace(/Rp(?=\d)/g, "").match(/(?<![A-Za-z0-9.-])\d+(?:\.\d+)*(?![A-Za-z])/g) ?? [];
    const daun = (o: unknown, jalur = ""): [string, string][] => {
      if (typeof o === "string") return [[jalur, o]];
      if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
      if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
      return [];
    };
    const tokens = daun(skenario).filter(([j]) => !j.startsWith(".sumber") && !j.startsWith(".komponen")).flatMap(([, v]) => angka(v));
    const NOM = titik(Number(cocok(runWebhook, /buat_topup\(budi, ([\d_]+)\)/)[1]!.replace(/_/g, "")));
    const H200 = cocok(bagA, /hasil kiriman: (\d+) diproses/)[1]!;
    const J = [...bagA.matchAll(/^ (\d+) +\| bank /gm)].map((x) => x[1]!);
    expect(J).toEqual(["10201", "10202"]);
    const ORDER = cocok(bagA, /<order (\d+)>/)[1]!;
    const KALI = cocok(bagA, /"kali":(\d+)/)[1]!;
    const AKUN = cocok(rentan, /GET '\/akun\/(\d+)'/)[1]!;
    const AKHIR = cocok(rentan, /"saldo":(\d+)/)[1]!;
    const AWAL = cocok(skemaTxt, / 419 +\| Budi +\| karyawan \| terverifikasi \| (\d+)/)[1]!;
    const NAIK = titik(Number(AKHIR) - Number(AWAL));
    const cerita = cocok(naskah.split("\n").find((b) => b.startsWith("| M29 |"))!, /naik dari (Rp[\d.]+) ke (Rp[\d.]+)\./);
    const N0 = cerita[1]!.slice(2), N1 = cerita[2]!.slice(2);
    const NOL = cocok(rBagA, /event_tercatat\n-+\n (\d+)\n/)[1]!;
    const ADR = String(dari("t4-webhook").adr![0]);
    const JAM = "12.05";
    expect(tokens).toEqual([
      NOM, JAM, NOM, H200, H200, H200, H200, NOL,
      ORDER, KALI, NOM, J[0], J[0], NOM, NOM, H200, "1", H200, "2",
      J[1], J[1], NOM, NOM, H200, H200, H200, H200,
      NAIK, AKUN, AKHIR, AWAL, titik(Number(AWAL)), titik(Number(AKHIR)), NOM, N0, N1, JAM, NOM,
      H200, "1", ADR, H200, "1", "2", H200, H200, JAM, NOM,
    ]);
    expect(N0).toBe("50.000");
    expect(N1).toBe("450.000");
  });
  test("tanpa JavaScript: noscript memuat hasil tebakan dan varian dengan angka yang sama dengan rekaman; rekaman A dan B di lipatan", () => {
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain("handler pertama menjawab 200 diproses untuk kedua kiriman evt-1, ledger memuat dua jurnal Rp200.000, dan saldo Budi naik Rp400.000.");
    expect(ns).toContain("Bila handler memakai tabel event_id dan balasan pertama hilang di jalan, kiriman kedua dijawab ganda dan jurnalnya satu.");
    expect(badan).toContain(`<Snippet file="labs/t4-webhook/output/ganda.txt" lines="${gA}:${gAkhir}" title="Rekaman lab: labs/t4-webhook/output/ganda.txt, bagian A dan B (tanpa baris kepala)" />`);
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("<WidgetLama"));
  });
});

describe("kartu Cek diri: tiga kartu, sama dengan kartu.json", () => {
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya; id dan judul kartu", () => {
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(3);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(3);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m29");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m29-1", "t4-m29-2", "t4-m29-3"]);
    expect(kartu.every((k) => k.judul === "4.6 M29: Top-up Budi masuk dua kali" && k.url === "tahap-4/m29-topup-dua-kali/")).toBe(true);
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    expect(kartu.map((k) => k.jawab)).toEqual(jawaban);
    expect(kartu[0]!.jawab).toContain("(`skema.txt` bagian D)");
    expect(kartu[1]!.jawab).toContain("(`ganda.txt` bagian B)");
    expect(kartu[2]!.jawab).toContain("(`ganda-serentak.txt` bagian A, dengan jeda lab 300 ms di antara cek dan tulis)");
  });
  test("kartu 2 dan 3 menyebut fakta rekaman yang sama dengan bagian B dan ganda-serentak A", () => {
    expect(bagB).toContain("kiriman 2 (event yang sama): 200 ganda");
    expect(sBagA).toContain("200 diproses, 200 diproses");
    harus("Pembacaan itu tidak mengunci baris.");
    harus("Kedua kiriman membaca status sebelum salah satu menulis, jadi keduanya melihat `menunggu`");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor", () => {
    let dalamKode = false;
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      if (b.trim().startsWith("```")) { dalamKode = !dalamKode; continue; }
      const m = !dalamKode && b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([[3, "Cek diri"]]);
    expect(badan.match(/^\d+\. /gm)).toBeNull();
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (description memuat Rp200.000, Rp400.000, dan satu pembayaran)", () => {
    expect(frontmatter.trim().split("\n")).toEqual([
      'title: "4.6 M29: Top-up Budi masuk dua kali"',
      'description: Minggu 3. Budi mengisi Rp200.000 dari rekening banknya, dan saldo di app naik Rp400.000. Gateway mengirim kabar dibayar yang sama dua kali, dan handler pertama menjurnal tiap kiriman.',
    ]);
    expect(frontmatter).toContain(rp(200000));
    expect(frontmatter).toContain(rp(650000 - 250000));
  });
  test("jumlah elemen: lima Blok, satu Rantai, tujuh Snippet, satu WidgetLama, satu noscript, tiga Cek diri", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(7);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/^import /gm)).toHaveLength(6);
  });
});

// ---- tinjauan (keputusan 1289): penutup mutan yang lolos di putaran TANPA kunci baris dan sidik --------------------------
// Putaran tanpa kunci (tes "setiap baris badan terkunci" dilewati dan sidik dihapus) meloloskan 17 mutan: COMMIT diganti
// ROLLBACK, status mundur ke `gagal`, label "diukur di lab" menggantikan "tidak diukur", label "rekaman" menggantikan
// "penalaran", bahasa Snippet, nama mode, kelas details, dari/ke langkah skenario, dan parafrasa RFC dan PostgreSQL.
// Tiap tes di bawah menurunkan klaimnya dari rekaman, kode, atau baris riset, bukan dari daftar baris.
describe("tinjauan 1289: klaim yang lolos tanpa kunci baris", () => {
  test("'sesudah COMMIT': rekaman bagian B dan kode tiruan menyebut COMMIT sebelum balasan; halaman memuat kalimat yang sama", () => {
    expect(bagB).toContain("Kiriman pertama sudah di-COMMIT sebelum balasan dikirim");
    expect(tiruanGo).toContain("tanda Rekeningo sudah selesai dan COMMIT");
    harus("Gateway tiruan menutup koneksi begitu balasan mulai datang, sesudah COMMIT.");
    expect(badan).not.toMatch(/sesudah ROLLBACK|sebelum COMMIT/);
  });
  test("label tidak lebih kuat dari sumber: alasan pemutusan tidak diukur (naskah), kiriman kedua di cerita adalah penalaran, jawaban Pak Hadi tanpa rekaman", () => {
    expect(naskah).toContain("alasan desain yang tidak diukur");
    harus("Alasan itu dari naskah dan tidak diukur.");
    harus("adalah penalaran dari bagian A, bagian B, dan dokumentasi gateway (Tidak dijalankan).");
    expect(badan).not.toMatch(/Alasan itu (diukur|direkam)|adalah rekaman dari bagian A|Hitungan, angka|\(penalaran[:,]/);
    // handler pertama: tidak ada bagian rekaman yang memutus balasan, jadi sebab di cerita memang tidak direkam
    expect(bagA + rBagA).not.toMatch(/putus|diputus/);
    harus("Handler pertama tidak punya jawabannya: tidak ada catatan yang menghubungkan satu kiriman dengan satu jurnal.");
    expect(pembayaranGo).toContain("jurnal_id topup_bank tidak diisi");
    expect(rBagA).toMatch(/event_tercatat\n-+\n 0\n/);
  });
  test("status mundur: kabar pending di run.py, pemetaan pending ke menunggu, cabang non-settlement tanpa syarat, dan status menunggu di rekaman", () => {
    expect(runApi).toContain('kirim_webhook(event_id="evt-101", order_id=t1["order_id"], status="pending", tanpa_tanda_tangan=True)');
    expect(pembayaranGo).toContain('"pending": "menunggu"');
    expect(kodeV1).toMatch(/if k\.Status != "settlement" \{[\s\S]*?UbahStatusTanpaSyarat\(ctx, k\.OrderID, statusGateway\[k\.Status\]\)/);
    expect(rBagA).toMatch(/SELECT status FROM topup_bank WHERE id = 1\n status\n-+\n menunggu\n/);
    harus("Kabar `pending` yang datang sesudah `dibayar` mengembalikan status ke `menunggu`, karena handler mengganti status tanpa syarat.");
  });
  test("bahasa Snippet mengikuti jenis berkas: .go memakai lang go, rekaman .txt tanpa lang", () => {
    expect(tag).toHaveLength(7);
    for (const t of tag) {
      const f = t.match(/file="([^"]+)"/)![1]!;
      const l = t.match(/lang="([^"]+)"/)?.[1];
      if (f.endsWith(".go")) expect(l, f).toBe("go");
      else expect(l, f).toBeUndefined();
    }
  });
  test("nama mode di prosa sama dengan mode yang dipakai rekaman: webhook-cek-tulis di ganda-serentak, webhook-v1 di ganda dan rentan", () => {
    expect(serentak).toContain("-rentan webhook-cek-tulis");
    expect(ganda).toContain("-rentan webhook-v1");
    expect(rentan).toContain("$ ./api-t4 -rentan webhook-v1 -lab");
    harus("Mode `webhook-cek-tulis` memerankannya: handler membaca status di luar transaction");
    harus("dengan mode rentan `webhook-v1`, dan gateway tiruan lokal.");
  });
  test("Tebak dulu di blok Yang Raka kira memakai details class question dengan ringkasan 'Tebak dulu:'; jalur Cek diri memakai class success", () => {
    expect(badan.match(/<details class="question">\n<summary>Tebak dulu: /g)).toHaveLength(1);
    expect(badan.match(/<details class="success">\n<summary>Jawaban<\/summary>/g)).toHaveLength(3);
    expect(badan.match(/<details>\n<summary>Rekaman bagian A dan B/g)).toHaveLength(1);
  });
  test("skenario: arah dari dan ke tiap langkah mengikuti isi kirim (jurnal api ke db, kiriman gateway ke api, balasan api ke gateway), dan jelas tidak bertentangan dengan kirim", () => {
    const arah = (l: Langkah): string => `${l.dari}>${l.ke ?? ""}`;
    expect(skenario.langkah.map(arah)).toEqual(["gw>api", "api>db", "api>gw", "gw>api", "api>db", "api>gw", "api>"]);
    expect(skenario.varian.langkah.map(arah)).toEqual(["gw>api", "api>db", "api>gw", "gw>api", "api>db"]);
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) {
      if (/^→ jurnal \d+|^→ webhook_event:/.test(l.kirim)) expect(arah(l), l.judul).toBe("api>db");
      if (/^→ kiriman \d: 200/.test(l.kirim) || /^hasil kiriman:/.test(l.kirim)) expect(arah(l), l.judul).toBe("api>gw");
      if (/200 (diproses|ganda)/.test(l.kirim)) expect(l.jelas, l.judul).not.toMatch(/ditolak|gagal|galat|salah/i);
    }
    expect(skenario.langkah[2]!.jelas).toContain("Kiriman pertama diterima.");
  });
  test("parafrasa sumber luar: RFC 9110 (SHOULD NOT, idempoten, belum pernah diterapkan) dan PostgreSQL 17 (Read Committed, hanya data yang sudah di-COMMIT)", () => {
    const rfc = barisRiset("R4-138"), pg = barisRiset("R4-137");
    expect(rfc).toContain("A client SHOULD NOT automatically retry a request with a non-idempotent method");
    expect(rfc).toContain("actually idempotent");
    expect(rfc).toContain("the original request was never applied");
    harus("kecuali ia tahu permintaan itu idempoten atau belum pernah diterapkan");
    expect(pg).toContain("Read Committed");
    expect(pg).toContain("sees only data committed before the query began");
    harus("Di isolation level bawaan, Read Committed, pembacaan biasa hanya melihat data yang sudah di-COMMIT sebelum perintahnya mulai");
    expect(labPakaiIsolasiBawaan).toBe(true);
    expect(badan).not.toMatch(/juga melihat data yang belum/);
  });
  test("kalimat mekanisme tanpa rekaman: jurnal kedua adalah jurnal top-up biasa (bukan pembalik), alasan pemutusan dari naskah, dan koreksi ledger lewat jurnal pembalik, bukan DELETE", () => {
    expect(kodeKreditV1).toContain('tx.CatatJurnal(ctx, "topup_bank"');
    expect(kodeKreditV1).not.toMatch(/membalik|pembalik/i);
    harus("Kiriman kedua menjadi jurnal kedua.");
    expect(naskah).toContain("memutusnya lebih awal membatalkan konteks permintaan dan bisa mem-rollback transaction");
    harus("Gateway tiruan menunggu byte pertama karena memutus lebih awal bisa membatalkan konteks permintaan dan mem-rollback transaction.");
    harus("Kesalahan di ledger dikoreksi dengan jurnal pembalik, bukan dengan `DELETE` ([[t2-ledger]]).");
  });
});

describe("tinjauan 1289 (lanjutan): kalimat baru hasil perbaikan peninjau", () => {
  test("dua syarat dari naskah bagian 3 dan bukti rekaman: kiriman ganda dan bersamaan melanggar 'dicatat satu kali', kabar palsu melanggar 'dipercaya sesudah dicek'", () => {
    expect(naskah).toContain("1. Uang dari luar dicatat satu kali, walau kabarnya datang dua kali, terlambat, atau tidak berurutan");
    expect(naskah).toContain("2. Kabar dari luar dipercaya hanya sesudah dicek");
    expect(bagA).toContain("hasil kiriman: 200 diproses, 200 diproses");
    expect(sBagA).toContain("dua kiriman bersamaan, tanda tangan sah (diurutkan): 200 diproses, 200 diproses");
    expect(serentak).toContain("tanda tangan diperiksa"); // kiriman bersamaan lolos walau tanda tangan diperiksa: akarnya bukan 'kabar dipercaya tanpa cek'
    expect(rBagA).toContain('{"event_id": "evt-palsu", "order_id": "<order 4>", "status": "settlement", "jumlah": 1234567}');
    harus('Kiriman ganda dan kiriman bersamaan melanggar syarat "dicatat satu kali", karena tidak ada kunci yang menjaga pencatatan.');
    harus('Kabar palsu melanggar syarat "dipercaya sesudah dicek".');
    expect(badan).not.toMatch(/satu akar|akar yang sama/);
  });
  test("M30 di Konsep yang lahir: kabarnya tidak pernah menjadi jurnal (retry.txt bagian B, naskah M30), bukan 'tidak datang' (kiriman 401 datang dan ditolak)", () => {
    expect(retry).toContain("tidak ada event dan tidak ada jurnal");
    expect(retry).toMatch(/ 1 +\| 0 +\| 401/);
    expect(naskah.split("\n").find((b) => b.startsWith("| M30 |"))).toContain("tujuh top-up yang tidak punya jurnal");
    harus("- [[t4-m30]]: sisi lain kabar dari luar. Kabarnya tidak pernah menjadi jurnal.");
    expect(badan).not.toMatch(/tidak datang sama sekali/);
  });
  test("Tebak dulu: bagian B memerankan handler lain (versi ADR 34: tabel event), bukan handler pertama; bukan bagian B ganda-serentak", () => {
    expect(bagB).toContain("versi ADR 34: tanda tangan, tabel event, status hanya maju");
    expect(ganda).toContain("-rentan webhook-v1");
    harus("Rekaman lab `ganda.txt` bagian B memerankannya pada handler lain, yang memakai tabel event (bedanya ada di blok berikutnya).");
    harus("Kemungkinan terbesar: handler sudah menyimpan jurnal dari kiriman pertama, tetapi balasan 200 tidak sampai.");
    expect(badan).not.toMatch(/ganda-serentak\.txt` bagian B|pada handler yang sama/);
  });
  test("kiriman berikutnya setelah jurnal dihapus: tidak ada DELETE atau kiriman ulang di rekaman handler pertama; kreditV1 menjurnal tiap panggilan", () => {
    expect(bagA + rBagA).not.toMatch(/DELETE FROM jurnal/);
    expect(kodeKreditV1).toContain("CatatJurnal");
    harus("Itu kesimpulan dari kode handler pertama (Tidak dijalankan).");
    expect(badan).not.toMatch(/Itu hasil rekaman handler pertama/);
  });
  test("cek-lalu-tulis: kode menjawab ganda bila status sudah dibayar (kalimat 'perbaikan yang paling dekat')", () => {
    expect(kodeCekTulis).toMatch(/if tp\.Status == "dibayar" \{\s*return HasilWebhook\{Hasil: "ganda"\}, nil/);
    harus("Perbaikan yang paling dekat adalah membaca status top-up dan menjawab `ganda` bila sudah `dibayar`.");
  });
  test("layar HP skenario: sinyal sama di semua layar (pilihan penulis, seperti jam)", () => {
    const sinyal = [...skenarioMentah.matchAll(/"sinyal": ?(\d+)/g)].map((m) => m[1]);
    expect(sinyal).toHaveLength(3);
    expect(new Set(sinyal)).toEqual(new Set(["3"]));
  });
});

// Lab tidak mengatur isolation level: pembacaan status di webhookCekTulis memakai bawaan PostgreSQL (Read Committed).
const labPakaiIsolasiBawaan = (() => {
  const sumber = ["labs/api-t4/internal/service/pembayaran.go", "labs/api-t4/internal/repo/pembayaran.go"].map((f) => baca(f)).join("\n");
  return !/Isolation|ISOLATION|isolation level/.test(sumber.replace(/\/\/[^\n]*/g, "")) && /BeginTx\(ctx, nil\)|DalamTx/.test(sumber + baca("labs/api-t4/internal/modul/pembayaran/pembayaran.go"));
})();
