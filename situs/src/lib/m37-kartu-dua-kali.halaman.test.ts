// Penjaga halaman 4.22 (keputusan 1350 sampai 1352): angka, nama, ID, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim "dibaca dari kode", klaim negatif berlingkup, Hitungan, diagram Rantai, skenario alur t4-m37.json, baris riset, dan kartu
// Cek diri di m37-kartu-dua-kali.mdx diturunkan dari rekaman labs/t4-kartu (otorisasi.txt, penerbit.txt), kode lab
// (labs/api-t4: service/kartu.go, handler/handler_kartu.go, cmd/penerbit, migrasi api-t2 dan api-t4), README lab, halaman
// tetangga, naskah Tahap 4, registry, dan baris riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.18): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
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
import diagramMentah from "../../data/diagram/t4-m37-tanpa-dana-tertahan.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m37-kartu-dua-kali.halaman.nilai";

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
const berkasDi = (awalan: string): string[] =>
  terlacak ? [...terlacak].filter((f) => f.startsWith(awalan)) : (fs.readdirSync(path.join(akar, awalan), { recursive: true }) as string[]).map((f) => `${awalan}${f}`);
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);

const BERKAS = "situs/src/content/docs/tahap-4/m37-kartu-dua-kali.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m37.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const otorisasi = baca("labs/t4-kartu/output/otorisasi.txt");
const penerbit = baca("labs/t4-kartu/output/penerbit.txt");
const readme = baca("labs/t4-kartu/README.md");
const runLab = baca("labs/t4-kartu/run.py");
const kartuGo = baca("labs/api-t4/internal/service/kartu.go");
const handlerKartu = baca("labs/api-t4/internal/handler/handler_kartu.go");
const penerbitGo = baca("labs/api-t4/cmd/penerbit/main.go");
const migT2 = baca("labs/api-t2/migrasi/000010_ledger_tabel.up.sql");
const migT4 = baca("labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal42 = baca("situs/src/content/docs/tahap-4/fitur-ke-teknis.mdx");
const hal44 = baca("situs/src/content/docs/tahap-4/dua-arah-pihak-ketiga.mdx");
const hal45 = baca("situs/src/content/docs/tahap-4/skema-data.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
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
interface H { bagian?: number; id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; path?: string; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const rib = (n: number): string => n.toLocaleString("id-ID");
const angka = (s: string): number => Number(s.replace(/\./g, ""));
const rp = (n: number): string => `Rp${rib(n)}`;

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
const O = bagian(otorisasi);
const oA = O.nomor((b) => b.startsWith("# --- A. ")), oB = O.nomor((b) => b.startsWith("# --- B. ")), oC = O.nomor((b) => b.startsWith("# --- C. ")), oD = O.nomor((b) => b.startsWith("# --- D. "));
const bagOA = O.teks(oA, oB - 1), bagOB = O.teks(oB, oC - 1), bagOD = O.teks(oD, O.baris.length);
const oAuthA = O.nomor((b) => b.startsWith("AUTH-A Rp"), oA);
const oTabelAkhir = O.nomor((b) => b === "(2 rows)", oAuthA);
const oBuku = O.nomor((b) => b.startsWith("=> SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'dana_tertahan'"), oA);
const oHitung = O.nomor((b) => b.startsWith("=> SELECT count(*) AS disetujui"), oA);
const oHitungAkhir = O.nomor((b) => b === "(1 row)", oHitung);
const oClearing = O.nomor((b) => b.startsWith("clearing AUTH-A"), oB);
const oPenutup = O.nomor((b) => b.startsWith("# Disetujui kepada toko"), oB);

const P = bagian(penerbit);
const pA = P.nomor((b) => b.startsWith("# --- A. ")), pB = P.nomor((b) => b.startsWith("# --- B. ")), pC = P.nomor((b) => b.startsWith("# --- C. ")), pD = P.nomor((b) => b.startsWith("# --- D. "));
const bagPA = P.teks(pA, pB - 1), bagPB = P.teks(pB, pC - 1), bagPC = P.teks(pC, pD - 1);
const pPenutup = P.nomor((b) => b.startsWith("# Disetujui penerbit kepada toko"), pA);

const K = bagian(kartuGo);
const kFungsi = K.nomor((b) => b.startsWith("func (s Service) otorisasiTanpaHold("));
const kAwal = K.nomor((b) => b === '\tif kartu.Status != "aktif" || a.Status == "dibekukan" {', kFungsi);
const kAkhir = K.nomor((b) => b.startsWith('\treturn catat("ditahan", "")'), kAwal);
const kFungsiAkhir = K.nomor((b) => b === "}", kAkhir);
const badanFungsi = K.teks(kFungsi, kFungsiAkhir);
const kClearing = K.nomor((b) => b.startsWith("func (s Service) Clearing("));
const kClearingAkhir = K.nomor((b) => b === "}", kClearing);
const badanClearing = K.teks(kClearing, kClearingAkhir);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);
const langSnippet = tag.map((t) => t.match(/lang="([^"]+)"/)?.[1]);

// ---- nilai dari rekaman -----------------------------------------------------------------------------------------------
const SALDO = angka(cocok(otorisasi, /# Budi \(akun 40301\): saldo Rp([\d.]+), kartu virtual/)[1]!);
const NOMINAL = angka(cocok(bagOA, /AUTH-A Rp([\d.]+): setuju \(sumber: rekeningo\)\nAUTH-B Rp([\d.]+): setuju \(sumber: rekeningo\)/)[1]!);
const NOMINAL_B = angka(cocok(bagOA, /AUTH-B Rp([\d.]+): setuju/)[1]!);
const NOMINAL_C = angka(cocok(bagOA, /AUTH-C Rp([\d.]+): setuju \(sumber: rekeningo\)/)[1]!);
const TABEL = [...bagOA.matchAll(/^ (AUTH-\w)\s+\| (\w+)\s+\| (\d+)\s+\| (\w)$/gm)].map((m) => [m[1]!, m[2]!, Number(m[3]), m[4]!] as [string, string, number, string]);
const BUKU_A = Object.fromEntries([...bagOA.matchAll(/^ (dana_tertahan|pemakai)\s+\| (\d+)$/gm)].map((m) => [m[1]!, Number(m[2])])) as Record<string, number>;
const HITUNG = cocok(bagOA, /disetujui \| jumlah_disetujui\n-+\+-+\n (\d+)\s+\| (\d+)\n/);
const DISETUJUI = Number(HITUNG[1]), JUMLAH_DISETUJUI = Number(HITUNG[2]);
const CLEARING = [...bagOB.matchAll(/^clearing (AUTH-\w) Rp([\d.]+): HTTP (\d+)(?:, (\S+))?$/gm)].map((m) => [m[1]!, angka(m[2]!), Number(m[3]), m[4] ?? ""] as [string, number, number, string]);
const BUKU_B = Object.fromEntries([...bagOB.matchAll(/^ (pemakai|settlement_kartu)\s+\| (\d+)$/gm)].map((m) => [m[1]!, Number(m[2])])) as Record<string, number>;
const SALDO_SESUDAH = BUKU_B.pemakai!;
const DITERIMA_TOKO = angka(cocok(bagOB, /# Disetujui kepada toko Rp([\d.]+); saldo Budi Rp([\d.]+)\./)[1]!);
const D_AUTH1 = cocok(bagOD, /AUTH-1 Rp([\d.]+): setuju \(sumber: timeout\)/);

const P_SALDO = angka(cocok(penerbit, /# Joko \(akun 40309\): saldo Rp([\d.]+),/)[1]!);
const P_TOTAL = cocok(bagPA, /# Disetujui penerbit kepada toko: Rp([\d.]+) \(AUTH-P1 dan AUTH-P2\); saldo Joko awal Rp([\d.]+); yang punya penutup di ledger: Rp([\d.]+)\./);
const P_DISETUJUI = angka(P_TOTAL[1]!), P_PENUTUP = angka(P_TOTAL[3]!);
const P_NOMINAL = angka(cocok(bagPA, /AUTH-P1 Rp([\d.]+): setuju \(sumber: timeout\)/)[1]!);
const P_BUKU = Object.fromEntries([...bagPA.matchAll(/^ (pemakai|settlement_kartu)\s+\| (\d+)$/gm)].map((m) => [m[1]!, Number(m[2])])) as Record<string, number>;

// ---- naskah ------------------------------------------------------------------------------------------------------------
const barisM37 = naskah.split("\n").find((b) => b.startsWith("| M37 |"))!;
const NASKAH_SALDO = angka(cocok(barisM37, /saldonya (Rp[\d.]+)\./)[1]!.replace("Rp", ""));
const NASKAH_NOMINAL = angka(cocok(barisM37, /barang (Rp[\d.]+) di dua toko online/)[1]!.replace("Rp", ""));
const NASKAH_TOTAL = 2 * NASKAH_NOMINAL;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.22 ada, masalah, jalur inti, prasyarat 2.11, lab t4-kartu, peran mobile dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m37")).toMatchObject({ ada: true, nomor: "4.22", jenis: "masalah", bagian: 4, inti: true, prasyarat: ["t2-race-lock"], lab: ["t4-kartu"], tahap: 4, peran: ["mobile", "backend"] });
    expect(dari("t2-race-lock").nomor).toBe("2.11");
    expect(frontmatter).toContain('title: "4.22 M37: Kartu virtual disetujui dua kali dengan satu saldo"');
    expect(frontmatter).toContain("description: Minggu 10. Budi membeli barang Rp80.000 di dua toko online dengan kartu virtual berisi Rp100.000, dan keduanya disetujui, karena Rekeningo menjawab setuju tanpa menahan dana.");
    expect(dari("t4-m37").judul).toBe("M37: Kartu virtual disetujui dua kali dengan satu saldo");
    expect(naskah).toContain("| 4.22 | 4 | M37: Kartu virtual disetujui dua kali dengan satu saldo | Masalah | ★ | t4-kartu | alur |");
    expect(barisM37).toMatch(/^\| M37 \| 10 \|/);
    expect(dari("t4-m37").label).toBe("Masalah 37 · minggu 10");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t2-race-lock\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m37").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(badan.match(/<Snippet /g)).toHaveLength(5);
    expect([...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro", "tanpaDanaTertahan ../../../../data/diagram/t4-m37-tanpa-dana-tertahan.json",
    ]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t2-ledger", "t2-m9", "t2-race-lock", "t4-fitur-teknis", "t4-kartu", "t4-prd", "t4-skema"]);
    const sesuai: [string, string, string][] = [
      ["t4-prd", "4.1", "PRD v4"], ["t4-fitur-teknis", "4.2", "Dari fitur ke pekerjaan teknis v4"], ["t4-skema", "4.5", "Skema data"],
      ["t4-kartu", "4.23", "Kartu virtual: otorisasi, dana tertahan, kill switch"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t2-m9")).toMatchObject({ nomor: "2.10", ada: true });
    expect(dari("t2-ledger").ada).toBe(true);
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t4-kartu").adr).toEqual([42]);
    harus("Keputusannya ADR 42.");
  });
  test("janji halaman lain ke 4.22 ditepati: 4.1, 4.2, 4.4, dan 4.5 menyebut t4-m37; 4.1 menulis jawaban terlambat diputuskan penerbit", () => {
    expect(hal41).toContain("Revisi ADR 22 dijawab dua halaman: [[t4-breaker]] untuk panggilan keluar ke gateway dan vendor, dan [[t4-kartu]] untuk otorisasi kartu.");
    expect(hal41).toContain("Bila jawaban terlambat, penerbit memutuskan menurut setelannya, bukan menurut Rekeningo (Rekaman lab t4-kartu, `penerbit.txt` bagian A, dengan penerbit tiruan lokal).");
    expect(hal41).toMatch(/\| P1 \| Kartu virtual \| User terverifikasi menerbitkan kartu virtual/);
    expect(hal42).toContain("permintaan otorisasi dari penerbit kartu ([[t4-m37]])");
    expect(hal44).toContain("di penerbit kartu yang memanggil Rekeningo dengan tenggat 2 detik ([[t4-m37]])");
    expect(hal45).toMatch(/^\| \(tidak ada\) \| `kartu` \(.*\[\[t4-m37\\\|M37\]\] \|$/m);
    expect(hal45).toMatch(/^\| \(tidak ada\) \| `otorisasi_kartu` \(.*\[\[t4-m37\\\|M37\]\] \|$/m);
    harus("- [[t4-prd]]: PRD v4 menulis kartu virtual sebagai P1, dan jawaban yang terlambat diputuskan penerbit menurut setelannya.");
    harus("- [[t4-skema]]: tabel `kartu` dan `otorisasi_kartu`.");
    harus("- [[t4-fitur-teknis]]: kartu virtual sebagai fitur dan pekerjaan teknisnya.");
    harus("- [[t4-kartu]]: otorisasi yang menahan dana sebelum menjawab setuju, dan batas waktu jawabannya. Keputusannya ADR 42.");
    harus("- [[t2-m9]]: pola cek-lalu-tulis pada dua transfer.");
    harus("- [[t2-race-lock]]: lock yang membuat membaca dan menulis saldo tidak disela request lain.");
    harus("Cara menahan dana sebelum menjawab setuju ada di [[t4-kartu]].");
  });
  test("halaman tidak membuka isi 4.23: ADR 42 sekali; tanpa kill switch, kedaluwarsa, OpenFeature, rilis bertahap, ORDER BY id; lock_timeout hanya sebagai penjelasan setelan lab", () => {
    expect(badan.match(/ADR 42/g)).toHaveLength(1);
    expect([...new Set(badan.match(/ADR \d+/g))]).toEqual(["ADR 42"]);
    expect(badan).not.toMatch(/kill switch|kedaluwarsa|OpenFeature|flagd|rilis bertahap|ORDER BY id|FOR UPDATE|7 hari|yatim|batas harian/i);
    expect(badan.match(/lock_timeout/g)).toHaveLength(1);
    harus("`lock_timeout` adalah batas waktu PostgreSQL untuk menunggu satu lock.");
    expect(badan.indexOf("lock_timeout")).toBeGreaterThan(badan.indexOf("-kartu-lock-timeout 3s"));
    expect(badan.match(/hold/gi)!.length).toBeGreaterThan(0);
  });
});

describe("naskah M37: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M37 di naskah: minggu 10, saldo Rp100.000, dua pembelian Rp80.000 di dua toko online, clearing kedua ditolak esok harinya, Pak Hadi, Ilustrasi", () => {
    expect(barisM37).toContain("Budi menerbitkan kartu virtual; saldonya Rp100.000.");
    expect(barisM37).toContain("Ia membeli barang Rp80.000 di dua toko online dalam beberapa detik, dan keduanya disetujui.");
    expect(barisM37).toContain("Esok harinya clearing kedua ditolak ledger karena saldo tidak boleh negatif, dan Pak Hadi menemukan Rp80.000 yang sudah disetujui kepada toko tanpa saldo yang menutupinya (Ilustrasi).");
    expect(barisM37).toContain("| Bug di penerbit kartu |");
    expect(barisM37).toContain("Handler otorisasi versi pertama memeriksa saldo lalu menjawab setuju tanpa menahan dana: cek-lalu-tulis seperti M9.");
    expect(barisM37).toContain("Keserentakan bukan syaratnya: dua otorisasi berurutan juga disetujui keduanya, karena tidak ada yang mengubah saldo yang dibaca berikutnya");
    expect(barisM37).toContain("Penerbit memberi tenggat 2 detik (tiruan lab mengikuti dokumentasi satu penerbit); bila jawaban terlambat, penerbit memutuskan menurut aturan timeout yang dipasang, bukan menurut Rekeningo");
    expect([NASKAH_SALDO, NASKAH_NOMINAL, NASKAH_TOTAL]).toEqual([100000, 80000, 160000]);
  });
  test("kalimat Gejala: saldo dan nominal dari baris naskah, jumlah dari perkalian (Hitungan atas Ilustrasi), Ilustrasi, tanpa kalimat definisi dan tanpa istilah kartu", () => {
    harus("Minggu 10 Tahap 4.");
    harus(`Budi menerbitkan kartu virtual dari saldonya, ${rp(NASKAH_SALDO)}, untuk belanja online.`);
    harus(`Ia membeli barang ${rp(NASKAH_NOMINAL)} di satu toko online. Beberapa detik kemudian ia membeli barang lain ${rp(NASKAH_NOMINAL)} di toko online yang berbeda.`);
    harus("Kedua toko menjawab pembayaran berhasil.");
    harus("Esok harinya Pak Hadi membuka laporan harian.");
    expect(barisM37).toContain("Esok harinya");
    expect(barisM37).toContain("Pak Hadi menemukan");
    harus(`Penagihan toko pertama masuk, dan saldo Budi turun ke ${rp(NASKAH_SALDO - NASKAH_NOMINAL)}.`);
    harus("Penagihan toko kedua ditolak ledger, karena saldo tidak boleh negatif.");
    harus(`${rp(NASKAH_NOMINAL)} itu sudah disetujui Rekeningo kepada toko, dan tidak ada saldo yang menutupinya.`);
    harus(`${rp(NASKAH_TOTAL)} adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman (2 × ${rp(NASKAH_NOMINAL)}), dan masukannya Ilustrasi.`);
    expect(badan.match(/Hitungan, yaitu angka yang dihitung dari angka lain di halaman/g)).toHaveLength(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf(`${rp(NASKAH_TOTAL)} adalah Hitungan`) + `${rp(NASKAH_TOTAL)} adalah `.length);
    harus("*Angka cerita (Ilustrasi):* saldo Rp100.000, dua pembelian Rp80.000, dua toko online, dan Pak Hadi yang menemukan selisihnya berasal dari naskah, bukan dari rekaman. Rekaman lab memakai saldo dan nominal yang sama, tetapi tanpa toko, jam, dan laporan harian.");
    expect(SALDO).toBe(NASKAH_SALDO);
    expect(NOMINAL).toBe(NASKAH_NOMINAL);
    expect(otorisasi + penerbit).not.toMatch(/Pak Hadi|toko online|laporan harian|esok/i);
    const gejala = cocok(badan, /<Blok nama="Gejala" buka>([\s\S]*?)<\/Blok>/)[1]!;
    expect(gejala.replace(/\*Angka cerita[\s\S]*$/, "")).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut|otorisasi|clearing|hold|penerbit|cek-lalu-tulis)\b/i);
    expect(badan).not.toMatch(/Rekaman lab[^.\n]{0,60}(Rp160\.000 adalah|toko online|esok)/);
  });
  test("yang dikira sebelum yang sebenarnya; dugaan bug di penerbit dari naskah; otorisasi dan id_penerbit diberi arti di pemakaian pertama; tenggat 2 detik dari dokumentasi", () => {
    expect(badan.indexOf('<Blok nama="Yang Raka kira"')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    harus("Raka membaca laporan itu dan menghitung dua persetujuan untuk satu saldo. Ia menduga ada bug di penerbit kartu.");
    harus('Penerbit kartu adalah pihak yang menerbitkan nomor kartu virtual. Tiap kali Budi membeli sesuatu, penerbit meminta izin ke Rekeningo lewat otorisasi: "setujui pembelian Rp80.000 dari kartu ini?".');
    expect(badan.indexOf("otorisasi")).toBe(badan.indexOf("lewat otorisasi:") + "lewat ".length);
    harus("Tiap otorisasi membawa `id_penerbit`, nomor yang penerbit berikan untuk otorisasi itu.");
    expect(badan.indexOf("id_penerbit")).toBe(badan.indexOf("`id_penerbit`, nomor yang penerbit berikan") + 1);
    harus("([dokumentasi satu penerbit kartu](https://docs.stripe.com/issuing/controls/real-time-authorizations), dibuka 2026-10-30, Tidak dijalankan)");
    expect(barisRiset("R4-216")).toContain("docs.stripe.com/issuing/controls/real-time-authorizations (dibuka 2026-10-30;");
    expect(barisRiset("R4-216")).toContain("within 2 seconds, the `Authorization` is automatically approved or declined based on your timeout settings");
    expect(penerbitGo).toContain("tenggat");
    expect(runLab.slice(runLab.indexOf("def rekam_otorisasi():"), runLab.indexOf('bagian("A. Tanpa hold'))).toContain("aturan_penerbit(tenggat_ms=10_000)");
    expect(otorisasi).toContain("# Tenggat penerbit tiruan dinaikkan ke 10 detik di bagian ini: yang direkam di sini bukan batas waktu, tetapi apakah dana ditahan.");
    harus("Tenggat penerbit di bagian ini dinaikkan ke 10 detik, jadi waktu tidak ikut menentukan hasilnya:");
    harus("Di lab, penerbit adalah proses tiruan di komputer sendiri: tidak ada kartu, nomor, atau layanan nyata.");
    expect(readme).toContain("Penerbit kartu adalah proses tiruan lokal (`cmd/penerbit`): tidak ada kartu, nomor, kredensial, atau layanan nyata.");
  });
  test("tebakan di blok Yang Raka kira: jawabannya tersembunyi di details dan sama dengan rekaman (baris ditahan tanpa jurnal tahan, saldo Rp100.000)", () => {
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(d[1]).toBe("Tebak dulu: kedua persetujuan datang dari Rekeningo, bukan dari penerbit, dan id_penerbit keduanya berbeda. Apa yang tidak dilakukan Rekeningo sesudah menyetujui yang pertama?");
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(d[2]).toBe("Menahan dana. Baris otorisasi pertama berstatus `ditahan`, tetapi tanpa jurnal tahan, jadi saldo yang dibaca otorisasi kedua masih Rp100.000 (Rekaman lab, `otorisasi.txt` bagian A).");
    expect(d[2]).not.toMatch(/Rp240\.000|409|timeout/);
    expect(TABEL[0]).toEqual(["AUTH-A", "ditahan", 80000, "f"]);
    expect(BUKU_A.pemakai).toBe(SALDO);
    expect(badan.indexOf('<details class="question">')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
  });
});

describe("rekaman otorisasi.txt: bagian A, B, dan D; nilai yang dikutip", () => {
  test("A: dua otorisasi serentak, kedua setuju dengan sumber rekeningo dan id berbeda; tabel dua baris ditahan tanpa jurnal tahan; buku dana_tertahan 0 dan pemakai tetap", () => {
    expect(NOMINAL).toBe(NOMINAL_B);
    expect(NOMINAL_C).toBe(NOMINAL);
    expect(TABEL).toEqual([["AUTH-A", "ditahan", NOMINAL, "f"], ["AUTH-B", "ditahan", NOMINAL, "f"]]);
    expect(BUKU_A).toEqual({ dana_tertahan: 0, pemakai: SALDO });
    expect(NOMINAL * 2).toBeGreaterThan(SALDO);
    expect(NOMINAL).toBeLessThan(SALDO);
    expect(bagOA).toContain("# Kontrol: otorisasi ketiga datang sesudah dua yang pertama selesai, bukan bersamaan.");
    expect(bagOA).toContain("# Yang membuat ini gagal bukan keserentakan: tanpa hold, tidak ada yang mengubah saldo yang dibaca otorisasi berikutnya. Jeda 300 ms hanya melebarkan celah di antara cek dan tulis.");
    expect(O.baris[3]).toBe("# server: ./api-t4 -lab -rentan kartu-tanpa-hold -lab-jeda-cek-tulis 300ms (versi pertama handler otorisasi, M37); penerbit tiruan: ./penerbit");
    harus("Lab meminta dua otorisasi Rp80.000 sekaligus untuk kartu Budi.");
    harus("Catatan penerbit tiruan menulis sumber kedua keputusan: `rekeningo`.");
    harus("Kedua otorisasi punya id_penerbit berbeda, `AUTH-A` dan `AUTH-B`, dan masing-masing satu baris.");
    harus("Di rekaman ini penerbit tiruan hanya meneruskan jawaban Rekeningo, jadi dugaan Raka tidak didukung.");
    harus("Status `ditahan` di tabel hanyalah nama status: kolom `ada_jurnal_tahan` bernilai `f`, dan buku `dana_tertahan` berisi 0.");
    harus("Lab juga mengirim otorisasi ketiga sesudah dua yang pertama selesai, bukan bersamaan:");
  });
  test("A: kontrol berurutan tetap disetujui; tiga disetujui berjumlah Rp240.000; Hitungan 3 x Rp80.000; M9 butuh dua request tumpang tindih", () => {
    expect(DISETUJUI).toBe(3);
    expect(JUMLAH_DISETUJUI).toBe(240000);
    expect(NOMINAL * DISETUJUI).toBe(JUMLAH_DISETUJUI);
    harus(`Otorisasi ketiga tetap disetujui. Tiga persetujuan ${rp(NOMINAL)} berjumlah ${rp(JUMLAH_DISETUJUI)} untuk saldo ${rp(SALDO)} (3 × ${rp(NOMINAL)}, Hitungan).`);
    harus("Di [[t2-m9]], kegagalan butuh dua request yang tumpang tindih. Di sini menunggu pun tidak menolong, karena langkah tulis tidak mengubah saldo yang dibaca otorisasi berikutnya.");
    const m9 = baca("situs/src/content/docs/tahap-2/m9-saldo-minus.mdx");
    expect(m9).toContain("Keduanya membaca saldo sebelum salah satunya menulis.");
  });
  test("B: penagihan pertama 200, kedua dan ketiga 409 saldo-kurang; saldo Rp20.000 dan settlement Rp80.000; Rp240.000 disetujui, Rp160.000 tanpa penutup (Hitungan)", () => {
    expect(CLEARING).toEqual([["AUTH-A", NOMINAL, 200, ""], ["AUTH-B", NOMINAL, 409, "/problems/saldo-kurang"], ["AUTH-C", NOMINAL, 409, "/problems/saldo-kurang"]]);
    expect(BUKU_B).toEqual({ pemakai: SALDO - NOMINAL, settlement_kartu: NOMINAL });
    expect(DITERIMA_TOKO).toBe(JUMLAH_DISETUJUI);
    expect(bagOB).toContain("Hanya satu clearing yang punya penutup, dua yang lain ditolak ledger (409) dan tidak punya jurnal.");
    expect(SALDO_SESUDAH).toBeLessThan(NOMINAL);
    expect(bagOB).toContain("# Disetujui kepada toko Rp240.000;");
    harus("Ledger menjaga uang, tetapi terlambat. Persetujuan sudah sampai ke penerbit dan toko.");
    harus(`Penagihan pertama memindahkan ${rp(NOMINAL)} dari saldo ke buku \`settlement_kartu\`, jadi saldo Budi tinggal ${rp(SALDO_SESUDAH)} (Hitungan: ${rp(SALDO)} − ${rp(NOMINAL)}). Dua penagihan lain ditolak dengan 409, karena ${rp(SALDO_SESUDAH)} kurang dari ${rp(NOMINAL)}. Dari ${rp(JUMLAH_DISETUJUI)} yang disetujui, ${rp(JUMLAH_DISETUJUI - NOMINAL)} tidak punya saldo yang menutupinya (${rp(JUMLAH_DISETUJUI)} − ${rp(NOMINAL)}, Hitungan).`);
    expect(O.baris[oClearing + 1]).toBe("clearing AUTH-C Rp80.000: HTTP 409, /problems/saldo-kurang");
    harus("Penagihan dari toko lewat penerbit disebut clearing. Di cerita ia datang esok harinya, sedangkan lab memanggilnya segera sesudah otorisasi dan tidak mengukur jedanya. Lab menagih ketiga otorisasi satu per satu:");
    expect(runLab).toContain("for id_ in (\"AUTH-A\", \"AUTH-B\", \"AUTH-C\"):");
    expect(O.baris[2]).toContain("Rekaman dari database bersih");
  });
  test("D: balasan 409 dari Rekeningo dibaca penerbit tiruan sebagai timeout; kode penerbit tiruan memperlakukan balasan bukan 200 sebagai tidak ada jawaban", () => {
    expect(D_AUTH1[1]).toBe("90.000");
    expect(bagOD).toContain(`"jumlah":${angka(D_AUTH1[1]!)}}`);
    expect(bagOD).toContain("HTTP/1.1 409 Conflict");
    expect(bagOD).toContain('"status":409}');
    expect(bagOD).toContain('"id_penerbit":"AUTH-1"');
    expect(bagOD).toContain("Tiruan ini memperlakukan semua balasan yang bukan 200 sebagai tidak ada jawaban, lalu memutuskan menurut setelan timeout (setuju).");
    expect(bagOD).toContain("tanpa merinci status HTTP lain [perlu verifikasi]");
    expect(penerbitGo).toContain("status != http.StatusOK");
    expect(penerbitGo).toContain("Balasan yang bukan 200 atau yang tidak terbaca diperlakukan sama dengan tidak ada jawaban");
    expect(penerbitGo).toContain('Sumber: "timeout"');
    expect(penerbitGo).toContain('Sumber: "rekeningo"');
    expect(readme).toContain("tiruan memutuskan \"setuju\" bila jawaban Rekeningo terlambat atau bukan 200");
    harus("- Penerbit tiruan membaca setiap balasan selain 200 sebagai tidak ada jawaban, lalu memutuskan menurut setelan timeout. Di rekaman, satu balasan 409 dari Rekeningo menjadi persetujuan dengan sumber `timeout` (`otorisasi.txt` bagian D).");
    harus("Dokumentasi satu penerbit kartu memberi dua alasan kegagalan, `webhook_error` dan `webhook_timeout`, tetapi tidak merinci status HTTP selain 200. Apakah balasan 409 atau 500 dihitung sebagai kegagalan itu, belum bisa dicek ke sumber primer [perlu verifikasi].");
    expect(barisRiset("R4-216")).toContain("Status HTTP selain 200 tidak dirinci");
    expect(barisRiset("R4-216")).toContain("`webhook_error` bila versi API di header tidak valid atau respons tidak bisa diproses, `webhook_timeout` untuk semua kegagalan lain");
  });
});

describe("rekaman penerbit.txt: jawaban terlambat, penagihan tanpa jurnal, dan rekonsiliasi", () => {
  test("A: server dengan -kartu-lock-timeout 3s tanpa -rentan; buku dikunci lebih lama dari tenggat; AUTH-P1 setuju oleh timeout tanpa baris; AUTH-P2 setuju oleh Rekeningo; Rp160.000 lawan Rp100.000, penutup Rp80.000", () => {
    expect(P.baris[3]).toBe("# server: ./api-t4 -lab -kartu-lock-timeout 3s (setelan yang salah, supaya jawaban terlambat terjadi); penerbit tiruan: ./penerbit, tenggat 2 detik");
    expect(P.baris[3]).not.toContain("-rentan");
    expect(bagPA).toContain("# Buku Joko dikunci transaction lain lebih lama dari tenggat. Setelan penerbit: bila timeout, setuju.");
    expect(bagPA).toContain(`AUTH-P1 ${rp(P_NOMINAL)}: setuju (sumber: timeout)`);
    expect(bagPA).toContain(`AUTH-P2 ${rp(P_NOMINAL)}: setuju (sumber: rekeningo)`);
    expect(bagPA).toContain("clearing AUTH-P1 Rp80.000 (penagihan datang): HTTP 404, /problems/otorisasi-tidak-ditemukan");
    expect(bagPA).toContain("clearing AUTH-P2 Rp80.000: HTTP 200, status ditangkap");
    expect(bagPA).toContain("di Rekeningo tidak ada hold dan tidak ada baris. Saldo Joko tidak berkurang, jadi dana yang sama bisa dibelanjakan lagi");
    expect([P_SALDO, P_NOMINAL, P_DISETUJUI, P_PENUTUP, angka(P_TOTAL[2]!)]).toEqual([SALDO, NOMINAL, 2 * NOMINAL, NOMINAL, SALDO]);
    expect(P.baris[1]!.replace(/^# PostgreSQL (\d+\.\d+) .*$/, "$1")).toBe(O.baris[1]!.replace(/^# PostgreSQL (\d+\.\d+) .*$/, "$1"));
    expect(P_BUKU).toEqual({ pemakai: SALDO - NOMINAL, settlement_kartu: NOMINAL });
    expect(penerbitGo).toContain('flag.String("bila-timeout", "setuju"');
    harus(`Penerbit menyetujui \`AUTH-P1\` sendiri, dan Rekeningo tidak punya baris maupun hold untuk id itu. Saldo tidak berkurang, jadi \`AUTH-P2\` ${rp(P_NOMINAL)} disetujui lagi oleh Rekeningo. Penagihan \`AUTH-P1\` dijawab 404. Penerbit menyetujui ${rp(P_DISETUJUI)} untuk saldo ${rp(P_SALDO)}, dan hanya ${rp(P_PENUTUP)} yang punya penutup di ledger.`);
    harus("Lab membuat jawaban terlambat dengan sengaja. Satu buku dikunci transaction lain lebih lama dari tenggat. Server dijalankan dengan `-kartu-lock-timeout 3s`, setelan yang salah dan sengaja dipasang.");
    harus("Server di bagian ini bukan versi pertama, tanpa `-rentan`.");
    harus("Penerbit tiruan memakai setelan lab: setuju bila timeout.");
    harus("Bila jawaban Rekeningo terlambat dari 2 detik, penerbit memutuskan menurut setelan timeout miliknya, bukan menurut Rekeningo (dokumentasi satu penerbit kartu, Tidak dijalankan).");
    harus("Itu angka yang sama dengan cerita Budi, dari jalan yang berbeda.");
  });
  test("B dan C: penagihan atas otorisasi ditolak dijawab 409 tanpa jurnal dengan saldo tidak cukup; rekonsiliasi SQL menemukan AUTH-P1; job rekonsiliasi kartu belum ada", () => {
    expect(bagPB).toContain("AUTH-P3 Rp150.000: tolak (sumber: rekeningo, alasan: saldo-kurang)");
    expect(bagPB).toContain("# Yang diperankan lab: Rekeningo menolak AUTH-P3 (saldo kurang). Jaringan yang menyetujui dan menagihnya diperankan lab dengan mengirim clearing sendiri; penerbit tiruan tidak punya jaringan dan tidak memerankan keadaan ini.");
    expect(bagPB).toContain("Penagihan Rp150.000 itu tidak punya penutup di ledger");
    expect(angka(cocok(penerbit, /# Kiki \(akun 40310\): saldo Rp([\d.]+),/)[1]!)).toBe(SALDO);
    expect(bagPB).toContain("clearing AUTH-P3 Rp150.000 (diperankan lab): HTTP 409, /problems/otorisasi-status");
    expect(bagPB).toMatch(/ AUTH-P3\s+\| ditolak \| f\n\(1 row\)/);
    expect(bagPB).toMatch(/saldo_cache\n-+\n 100000\n\(1 row\)/);
    expect(angka(cocok(bagPB, /saldo_cache\n-+\n (\d+)\n/)[1]!)).toBe(SALDO);
    expect(angka(cocok(bagPB, /AUTH-P3 Rp([\d.]+): tolak/)[1]!)).toBeGreaterThan(SALDO);
    expect(bagPB).toContain("di sini saldo Kiki memang tidak cukup");
    expect(bagPB).toContain("Rekeningo tidak menjurnal penagihan atas otorisasi yang ditolaknya (409)");
    expect(bagPC).toMatch(/AUTH-P1\s+\| setuju\s+\| timeout\s+\| \(tidak ada baris\)\s+\| setuju di penerbit, tidak ditahan di Rekeningo/);
    expect(bagPC).toMatch(/AUTH-P2\s+\| setuju\s+\| rekeningo\s+\| ditangkap\s+\| cocok/);
    expect(bagPC).toMatch(/AUTH-P3\s+\| tolak\s+\| rekeningo\s+\| ditolak\s+\| cocok\n\(3 rows\)/);
    expect(bagPC).toContain("job rekonsiliasi kartu belum ada di api-t4");
    expect(readme).toContain("- Job rekonsiliasi kartu: tidak ada; perbandingan di `penerbit.txt` dijalankan lab.");
    expect(readme).toContain("7. Rekeningo tidak menjurnal penagihan atas otorisasi yang ditolaknya (409), walau saldo pemilik cukup.");
    // dari kode: status selain ditahan dan ditangkap dijawab ErrOtorisasiStatus sebelum jurnal; id yang tidak ada dijawab ErrOtorisasiTidakAda
    expect(badanClearing).toContain('if o.Status != "ditahan" && o.Status != "ditangkap" {\n\t\t\treturn ErrOtorisasiStatus');
    expect(badanClearing).toContain("return ErrOtorisasiTidakAda");
    harus("- Penagihan atas otorisasi yang tidak dikenal (404) atau yang ditolak Rekeningo (409) tidak dijurnal di lab. Rekaman `penerbit.txt` bagian B memakai saldo pemilik yang tidak cukup, dan penagihannya dikirim skrip lab. Apakah penagihan itu didebit, ditolak, atau menjadi insiden bernomor adalah keputusan produk yang belum final.");
    harus("- Rekonsiliasi kartu, yaitu mencocokkan catatan penerbit dengan tabel `otorisasi_kartu`, belum ada sebagai job di lab. Perbandingannya dijalankan dengan SQL di `penerbit.txt` bagian C, dan menemukan `AUTH-P1`: setuju di penerbit, tidak ditahan di Rekeningo.");
  });
});

describe("kode lab: handler versi pertama, Clearing, rute kartu, dan migrasi; klaim 'dibaca dari kode' dan negatif berlingkup", () => {
  test("otorisasiTanpaHold: saldo dari saldo_cache tanpa lock, jeda lab, status ditahan tanpa jurnal; tidak memanggil kunci buku, jurnal, atau buku sistem (lingkup: badan fungsi itu)", () => {
    expect(badanFungsi).toContain("a, err := s.repo.Akun(ctx, kartu.AkunID)");
    expect(badanFungsi).toContain('if a.Saldo < in.Jumlah { // saldo_cache tanpa lock: sudah bisa basi saat baris ditulis');
    expect(badanFungsi).toContain("if s.t4.JedaCekTulis > 0 {\n\t\ttime.Sleep(s.t4.JedaCekTulis)\n\t}");
    expect(badanFungsi).toContain('return catat("ditahan", "") // status ditahan tanpa jurnal: tidak ada dana yang benar-benar tertahan');
    expect(badanFungsi).toContain("_, err := tx.BuatOtorisasi(ctx, kartu.ID, in.IDPenerbit, in.Jumlah, status, nil, nil)");
    expect(badanFungsi).not.toMatch(/KunciBukuAkun|CatatJurnal|BukuSistem|KunciLedger|BatasWaktuKunci|FOR UPDATE/);
    expect(K.baris.slice(kFungsi - 8, kFungsi - 1).join("\n")).toContain("--8<-- [start:tanpa-hold]");
    expect(kartuGo).toContain("if s.rentan == RentanKartuTanpaHold {\n\t\treturn s.otorisasiTanpaHold(ctx, in)");
    expect(baca("labs/api-t4/internal/service/t4_aturan.go")).toContain('RentanKartuTanpaHold  = "kartu-tanpa-hold"');
    expect(runLab).toContain('mulai_api(["-rentan", "kartu-tanpa-hold", "-lab-jeda-cek-tulis", "300ms"]');
    harus("Handler membaca saldo pemilik kartu, memeriksa statusnya, lalu menulis satu baris `otorisasi_kartu` lewat fungsi `catat` dan menjawab setuju.");
    // arti hold di halaman: dana pindah dari saldo ke buku sistem dana_tertahan lewat satu jurnal (rekaman bagian C, versi yang menahan dana)
    expect(otorisasi).toMatch(/ kartu_tahan \| -80000\s+\| pemakai\n kartu_tahan \| 80000\s+\| dana_tertahan\n/);
    harus("Dana itu dicatat di buku sistem `dana_tertahan` lewat satu jurnal.");
    harus("[[t2-m9]] memuat pola yang sama pada dua transfer.");
    expect(baca("situs/src/content/docs/tahap-2/m9-saldo-minus.mdx")).toContain("Rp70.000 dari HP dan Rp50.000 dari tablet");
    harus("Pola ini bernama cek-lalu-tulis: kode membaca satu nilai, memutuskan dari nilai itu, lalu menulis hasilnya sebagai langkah terpisah. Di antara keduanya, nilai itu bisa sudah berubah.");
    harus("Jeda lab di cuplikan memperlebar celah di antara cek dan tulis, supaya hasilnya tidak bergantung pada waktu. Lebar celah tanpa jeda tidak diukur.");
    expect(baca("labs/api-t4/README.md")).toContain("Asumsi lab: celah alami hanya mikrodetik");
    harus("Jeda 300 ms di antara cek dan tulis hanya ada di lab. Lab tidak punya app, toko online, atau layanan kartu nyata.");
    harus("Server memakai mode `-rentan kartu-tanpa-hold`: kode lab yang ditulis seperti uraian naskah, bukan salinan kode yang pernah berjalan di cerita.");
  });
  test("Clearing: SQLSTATE 23514 dengan constraint saldo_karyawan_tidak_negatif dipetakan ke ErrSaldoKurang; trigger ditunda sampai COMMIT di api-t2; berlaku untuk buku pemakai sejak api-t4 (Tidak dijalankan)", () => {
    expect(badanClearing).toContain('if errors.As(err, &pg) && pg.Code == "23514" && pg.ConstraintName == "saldo_karyawan_tidak_negatif" {\n\t\treturn HasilOtorisasi{}, ErrSaldoKurang');
    expect(kartuGo).toContain("database menolak saat COMMIT (saldo_karyawan_tidak_negatif)");
    expect(migT2).toContain("CREATE CONSTRAINT TRIGGER saldo_karyawan_tidak_negatif AFTER INSERT ON posting\n  DEFERRABLE INITIALLY DEFERRED");
    expect(migT4).toContain("-- Invarian 3 (saldo tidak negatif) berlaku juga untuk buku pemakai dan merchant.");
    expect(migT4).toContain("IF (SELECT jenis FROM buku WHERE id = NEW.buku_id) NOT IN ('karyawan', 'pemakai', 'merchant') THEN");
    expect(migT4).toContain("CONSTRAINT = 'saldo_karyawan_tidak_negatif'");
    harus("Penolakan itu datang dari database. Aturan saldo tidak boleh negatif ([[t2-ledger]]) diperiksa saat COMMIT dan berlaku juga untuk buku jenis `pemakai`. Kode lab memetakan pelanggarannya ke 409 `saldo-kurang`.");
    harus("Rekamannya hanya menunjukkan 409, jadi sebabnya dibaca dari kode: fungsi `Clearing` di `labs/api-t4/internal/service/kartu.go`, migrasi `000010` di `labs/api-t2/migrasi`, dan migrasi `000020` di `labs/api-t4/migrasi` (Tidak dijalankan).");
    expect(otorisasi).not.toMatch(/23514|saldo_karyawan_tidak_negatif/);
    expect(barisRiset("R4-219")).toContain("`CREATE CONSTRAINT TRIGGER saldo_karyawan_tidak_negatif AFTER INSERT ON posting DEFERRABLE INITIALLY DEFERRED`");
  });
  test("rute kartu di handler_kartu.go: tujuh rute, tiga milik penerbit; hanya /penerbit/reversal yang membatalkan otorisasi; tidak ada rute lain di folder handler yang menyebut reversal atau batal otorisasi", () => {
    const rute = [...handlerKartu.matchAll(/mux\.HandleFunc\("([A-Z]+ [^"]+)", (s\.\w+)\(/g)].map((m) => [m[1]!, m[2]!] as [string, string]);
    expect(rute).toEqual([
      ["POST /kartu", "s.wajibLogin"], ["GET /kartu", "s.wajibLogin"], ["POST /kartu/{id}/bekukan", "s.wajibLogin"], ["POST /kartu/{id}/buka", "s.wajibLogin"],
      ["POST /penerbit/otorisasi", "s.dariPenerbit"], ["POST /penerbit/clearing", "s.dariPenerbit"], ["POST /penerbit/reversal", "s.dariPenerbit"],
    ]);
    const handlerSemua = berkasDi("labs/api-t4/internal/handler/").filter((f) => /^labs\/api-t4\/internal\/handler\/[^/]+\.go$/.test(f) && !f.endsWith("_test.go"));
    expect(handlerSemua.length).toBeGreaterThan(5);
    const ruteSemua = handlerSemua.flatMap((f) => [...baca(f).matchAll(/HandleFunc\("([A-Z]+ [^"]+)"/g)].map((m) => `${f.split("/").pop()} ${m[1]}`));
    expect(ruteSemua.filter((r) => /reversal|batal|cabut|tarik/i.test(r))).toEqual(["handler_kartu.go POST /penerbit/reversal"]);
    expect(ruteSemua.filter((r) => /otorisasi/i.test(r))).toEqual(["handler_kartu.go POST /penerbit/otorisasi"]);
    expect(badanFungsi).toContain('if kartu.Status != "aktif" || a.Status == "dibekukan" {\n\t\treturn catat("ditolak", "kartu-dibekukan")');
    harus("Rekeningo tidak punya rute untuk menarik persetujuan itu. Di `labs/api-t4/internal/handler/handler_kartu.go`, rute untuk pemilik kartu hanya menerbitkan, melihat, membekukan, dan membuka kartu, dan membekukan menolak otorisasi baru. Satu-satunya rute yang membatalkan otorisasi, `POST /penerbit/reversal`, dipanggil penerbit (Tidak dijalankan: dibaca dari file itu).");
    harus("Di lab, Rekeningo tidak punya rute untuk menarik persetujuan yang sudah dijawab, jadi mengecek saldo saja tidak cukup.");
  });
  test("klaim negatif berlingkup: lab tanpa app (folder labs/t4-kartu); tanpa klaim kepatuhan; tanpa merek di prosa; tidak ada ID internal", () => {
    const berkasLab = berkasDi("labs/t4-kartu/");
    expect(berkasLab.length).toBeGreaterThan(5);
    expect(berkasLab.filter((f) => /\.(dart|swift|kt)$|pubspec\.yaml$/i.test(f))).toEqual([]);
    harus("- App Flutter dan layar belanja tidak ada di lab.");
    harus("- Toko online, hari berikutnya, Pak Hadi, dan laporan harian hanya ada di cerita (Ilustrasi). Lab menagih segera sesudah otorisasi.");
    harus("- Perilaku penerbit nyata di luar dokumentasi yang dibuka Tidak dijalankan. Penerbit, kartu, dan nomor di lab adalah tiruan lokal.");
    harus("- Halaman ini tidak mengklaim izin atau kepatuhan regulasi apa pun.");
    expect(readme).toContain("tidak mengklaim izin atau kepatuhan apa pun");
    const prosa = badan.replace(/\]\(https?:[^)]+\)/g, "]");
    expect(prosa).not.toMatch(/Stripe|Midtrans|Visa|Mastercard|PCI|OJK|Bank Indonesia|QRIS|GPN/);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|PR #?\d{3}/);
    expect(badan).not.toMatch(/berizin|bersertifikat|memenuhi standar/i);
    expect(badan.match(/patuh/gi)).toHaveLength(1);
    expect([...badan.matchAll(/\bM(\d+)\b/g)].map((m) => m[1])).toEqual([]);
    expect(badan.match(/\[perlu verifikasi/g)).toHaveLength(1);
    // enam pemakaian: arti label di Gejala, dokumentasi tenggat dua kali, kode Clearing, rute reversal, dan perilaku penerbit nyata
    expect(badan.match(/Tidak dijalankan/g)).toHaveLength(6);
  });
});

describe("Snippet: rentang dari struktur rekaman dan kode, judul, dan sidik teks tampil", () => {
  test("lima Snippet: rentang dari struktur rekaman, bukan angka tangan; berkas, judul, dan bahasa sesuai; urutan di halaman", () => {
    expect(tag).toHaveLength(5);
    expect(lines).toEqual([`${oAuthA}:${oTabelAkhir}`, `${kAwal}:${kAkhir}`, `${oBuku}:${oHitungAkhir}`, `${oClearing}:${oPenutup}`, `${pA}:${pPenutup}`]);
    expect(lines).toEqual(["9:16", "344:353", "17:30", "33:49", "8:21"]);
    expect(berkasSnippet).toEqual([
      "labs/t4-kartu/output/otorisasi.txt", "labs/api-t4/internal/service/kartu.go", "labs/t4-kartu/output/otorisasi.txt", "labs/t4-kartu/output/otorisasi.txt", "labs/t4-kartu/output/penerbit.txt",
    ]);
    expect(langSnippet).toEqual([undefined, "go", undefined, undefined, undefined]);
    expect(judulSnippet).toEqual([
      "Rekaman lab: labs/t4-kartu/output/otorisasi.txt, bagian A (dua otorisasi dan tabel otorisasi_kartu)",
      "Kode lab: labs/api-t4/internal/service/kartu.go baris 344 sampai 353 (handler otorisasi versi pertama)",
      "Rekaman lab: labs/t4-kartu/output/otorisasi.txt, bagian A (buku, otorisasi ketiga, dan jumlah yang disetujui)",
      "Rekaman lab: labs/t4-kartu/output/otorisasi.txt, bagian B (penagihan dan saldo)",
      "Rekaman lab: labs/t4-kartu/output/penerbit.txt, bagian A (jawaban terlambat)",
    ]);
    expect(oAuthA).toBeGreaterThan(oA);
    expect(oTabelAkhir).toBeLessThan(oBuku);
    expect(oHitungAkhir).toBeLessThan(oB);
    expect(oClearing).toBeGreaterThan(oB);
    expect(oPenutup).toBeLessThan(oC);
    expect(pA).toBeLessThan(pPenutup);
    expect(pPenutup).toBeLessThan(pB);
    expect(O.baris[oAuthA - 1]).toBe("AUTH-A Rp80.000: setuju (sumber: rekeningo)");
    expect(O.baris[oPenutup - 1]).toMatch(/^# Disetujui kepada toko Rp240\.000; saldo Budi Rp100\.000\./);
    expect(K.baris[kAwal - 1]).toBe('\tif kartu.Status != "aktif" || a.Status == "dibekukan" {');
    expect(K.baris[kAkhir - 1]).toMatch(/^\treturn catat\("ditahan", ""\)/);
    expect(kAkhir - kAwal).toBe(9);
  });
  test("isi tiap Snippet sama dengan teks yang diharapkan, dengan angka dari konstanta yang diturunkan dari rekaman (bukan hanya sidik)", () => {
    const a = rib(NOMINAL), t = String(NOMINAL), saldo = String(SALDO);
    expect(O.teks(oAuthA, oTabelAkhir)).toBe([
      `AUTH-A Rp${a}: setuju (sumber: rekeningo)`, `AUTH-B Rp${a}: setuju (sumber: rekeningo)`,
      "=> SELECT id_penerbit, status, jumlah, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu ORDER BY id_penerbit",
      " id_penerbit | status  | jumlah | ada_jurnal_tahan", "-------------+---------+--------+------------------",
      ` AUTH-A      | ditahan | ${t}  | f`, ` AUTH-B      | ditahan | ${t}  | f`, "(2 rows)",
    ].join("\n"));
    expect(O.teks(oBuku, oHitungAkhir)).toBe([
      "=> SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis",
      " jenis         | saldo_cache", "---------------+-------------", " dana_tertahan | 0", ` pemakai       | ${saldo}`, "(2 rows)",
      "# Kontrol: otorisasi ketiga datang sesudah dua yang pertama selesai, bukan bersamaan.", `AUTH-C Rp${a}: setuju (sumber: rekeningo)`,
      "# Yang membuat ini gagal bukan keserentakan: tanpa hold, tidak ada yang mengubah saldo yang dibaca otorisasi berikutnya. Jeda 300 ms hanya melebarkan celah di antara cek dan tulis.",
      "=> SELECT count(*) AS disetujui, sum(jumlah) AS jumlah_disetujui FROM otorisasi_kartu WHERE status = 'ditahan'",
      " disetujui | jumlah_disetujui", "-----------+------------------", ` ${DISETUJUI}         | ${JUMLAH_DISETUJUI}`, "(1 row)",
    ].join("\n"));
    expect(O.teks(oClearing, oPenutup)).toBe([
      `clearing AUTH-A Rp${a}: HTTP 200`, `clearing AUTH-B Rp${a}: HTTP 409, /problems/saldo-kurang`, `clearing AUTH-C Rp${a}: HTTP 409, /problems/saldo-kurang`,
      "=> SELECT id_penerbit, status FROM otorisasi_kartu ORDER BY id_penerbit", " id_penerbit | status", "-------------+-----------",
      " AUTH-A      | ditangkap", " AUTH-B      | ditahan", " AUTH-C      | ditahan", "(3 rows)",
      "=> SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'settlement_kartu' ORDER BY b.jenis",
      " jenis            | saldo_cache", "------------------+-------------", ` pemakai          | ${SALDO_SESUDAH}`, ` settlement_kartu | ${BUKU_B.settlement_kartu}`, "(2 rows)",
      `# Disetujui kepada toko Rp${rib(JUMLAH_DISETUJUI)}; saldo Budi Rp${rib(SALDO)}. Hanya satu clearing yang punya penutup, dua yang lain ditolak ledger (409) dan tidak punya jurnal.`,
    ].join("\n"));
    expect(P.teks(pA, pPenutup)).toBe([
      "# --- A. Keadaan pertama (dokumentasi satu penerbit): jawaban terlambat diputuskan penerbit menurut setelannya, bukan menurut Rekeningo ---",
      "# Buku Joko dikunci transaction lain lebih lama dari tenggat. Setelan penerbit: bila timeout, setuju.",
      `AUTH-P1 Rp${a}: setuju (sumber: timeout)`,
      `# Penerbit sudah menyetujui Rp${a}; di Rekeningo tidak ada hold dan tidak ada baris. Saldo Joko tidak berkurang, jadi dana yang sama bisa dibelanjakan lagi:`,
      `AUTH-P2 Rp${a}: setuju (sumber: rekeningo)`,
      `clearing AUTH-P1 Rp${a} (penagihan datang): HTTP 404, /problems/otorisasi-tidak-ditemukan`, `clearing AUTH-P2 Rp${a}: HTTP 200, status ditangkap`,
      "=> SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40309 OR b.jenis = 'settlement_kartu' ORDER BY b.jenis",
      " jenis            | saldo_cache", "------------------+-------------", ` pemakai          | ${P_BUKU.pemakai}`, ` settlement_kartu | ${P_BUKU.settlement_kartu}`, "(2 rows)",
      `# Disetujui penerbit kepada toko: Rp${rib(P_DISETUJUI)} (AUTH-P1 dan AUTH-P2); saldo Joko awal Rp${rib(P_SALDO)}; yang punya penutup di ledger: Rp${rib(P_PENUTUP)}.`,
    ].join("\n"));
    expect(K.teks(kAwal, kAkhir)).toBe([
      '\tif kartu.Status != "aktif" || a.Status == "dibekukan" {', '\t\treturn catat("ditolak", "kartu-dibekukan")', "\t}",
      "\tif a.Saldo < in.Jumlah { // saldo_cache tanpa lock: sudah bisa basi saat baris ditulis", '\t\treturn catat("ditolak", "saldo-kurang")', "\t}",
      "\tif s.t4.JedaCekTulis > 0 {", "\t\ttime.Sleep(s.t4.JedaCekTulis)", "\t}",
      '\treturn catat("ditahan", "") // status ditahan tanpa jurnal: tidak ada dana yang benar-benar tertahan',
    ].join("\n"));
  });
  test("teks yang tampil di tiap Snippet dikunci dengan sidik: rekaman atau kode yang berubah menggagalkan tes dan memaksa halaman dibaca ulang", () => {
    const tampil = tag.map((t, i) => {
      const [a, b] = lines[i]!.split(":").map(Number) as [number, number];
      return sidik(baca(berkasSnippet[i]!).split("\n").slice(a - 1, b).join("\n"));
    });
    expect(tampil).toEqual(SIDIK.snippet);
  });
  test("rekaman dan kode yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, atau rujukan naskah internal", () => {
    const tampil = [O.teks(oAuthA, oTabelAkhir), K.teks(kAwal, kAkhir), O.teks(oBuku, oHitungAkhir), O.teks(oClearing, oPenutup), P.teks(pA, pPenutup)].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b|\b[A-G]\d\b|\bnaskah\b|tinjauan|temuan/i);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: tanpa menahan dana (otorisasi.txt bagian A dan B) dan jawaban lewat dari 2 detik (penerbit.txt bagian A); teks dan sub dihitung dari rekaman", () => {
    expect(diagram.id).toBe("t4-m37-tanpa-dana-tertahan");
    expect(diagram.judul).toBe("Tanpa menahan dana, dua otorisasi lolos; bila jawaban terlambat, penerbit memutuskan sendiri");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-kartu · otorisasi.txt bagian A dan B, penerbit.txt bagian A" });
    expect(diagram.baris).toHaveLength(2);
    const [a, t] = diagram.baris;
    expect(a!.label).toBe("Tanpa menahan dana");
    expect(a!.sub).toBe("otorisasi.txt bagian A dan B");
    expect(a!.simpul.map((s) => s.teks)).toEqual(["Otorisasi 1: setuju", "Otorisasi 2: setuju", "Penagihan 2: ditolak ledger"]);
    expect(a!.simpul.map((s) => s.sub)).toEqual([`saldo dibaca ${rp(SALDO)}`, `saldo masih ${rp(BUKU_A.pemakai!)}`, "saldo tidak boleh negatif"]);
    expect(a!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(t!.label).toBe("Jawaban lewat dari 2 detik");
    expect(t!.sub).toBe("penerbit.txt bagian A");
    expect(t!.simpul.map((s) => s.teks)).toEqual(["Jawaban Rekeningo terlambat", "Penerbit setuju sendiri", "Rekeningo tidak mencatat"]);
    expect(t!.simpul.map((s) => s.sub)).toEqual(["satu buku terkunci lebih dari 2 detik", "setelan lab: setuju bila timeout", "tanpa baris, dana tidak ditahan"]);
    expect(t!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(CLEARING[1]![2]).toBe(409);
    expect(bagPA).toContain("setuju (sumber: timeout)");
    expect(bagPA).toContain("tidak ada hold dan tidak ada baris");
    expect(penerbit.split("\n")[3]).toContain("tenggat 2 detik");
    expect(diagram.catatan).toBe("Toko online, jam, dan laporan harian adalah Ilustrasi. Kotak oranye adalah akibat yang direkam.");
  });
  test("diagram dikunci dengan sidik jari; Rantai ringkas tepat sesudah kalimat Inti di blok Yang sebenarnya; kalimat Inti dan simpul pendek", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    harus("<Rantai data={tanpaDanaTertahan} ringkas />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    const blok = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    const inti = blok.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(inti[1]).toBe(`Rekeningo menyetujui otorisasi sesudah membaca saldo, tetapi tanpa menahan dana, jadi otorisasi kedua masih membaca ${rp(SALDO)}.`);
    expect(inti[1]!.length).toBeLessThanOrEqual(150);
    expect(inti[2]).toBe("<Rantai data={tanpaDanaTertahan} ringkas />");
    for (const b of diagram.baris) for (const s of b.simpul) {
      expect(s.teks.length, s.teks).toBeLessThanOrEqual(32);
      expect((s.sub ?? "").length, s.sub).toBeLessThanOrEqual(40);
    }
  });
});

describe("skenario alur t4-m37.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen; sumber otorisasi.txt; empat langkah dan tiga langkah varian dari indeks 3", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-kartu/output/otorisasi.txt", fileVarian: "labs/t4-kartu/output/otorisasi.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["pnb", "Penerbit tiruan"], ["srv", "Server api-t4 (versi pertama)"], ["dbm", "Database: otorisasi_kartu dan buku"]]);
    expect(skenario.perangkat ?? []).toEqual([]);
    expect(skenario.langkah).toHaveLength(4);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(3);
    expect(skenario.varian.label).toBe("otorisasi ketiga datang sesudah dua yang pertama selesai");
    harus("**Ubah satu hal: otorisasi ketiga datang sesudah dua yang pertama selesai**");
    harus("Widget ini mengikuti rekaman `otorisasi.txt` bagian A dan B, dengan satu varian dari bagian A.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m37.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-kartu run");
    expect(readme).toContain("make -C labs/t4-kartu run                       # semua bagian, ±4 menit, menulis labs/t4-kartu/output/*.txt");
    expect(runLab).toContain("def rekam_otorisasi():");
    expect(skenario.sumber.catatan).toContain(`Lab t4-kartu, PostgreSQL ${cocok(otorisasi, /# PostgreSQL (\d+\.\d+) /)[1]}, dari database bersih`);
    expect(skenario.sumber.catatan).toContain("toko online, jam, dan laporan harian adalah Ilustrasi");
    harus("Hasilnya sama: tiga persetujuan Rp80.000 untuk saldo Rp100.000, jadi keserentakan bukan syaratnya. Lab tidak punya app dan tidak merekam layar.");
  });
  test("tebakan: empat pilihan, jawaban benar (setuju keduanya, saldo masih Rp100.000) sama dengan rekaman, pilihan lain bertentangan, benar bukan yang terpanjang, posisi beda dari dua tebakan Tahap 4 terakhir", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(3);
    expect(p.varian).toBe(false);
    expect(p.options[p.answer]).toBe(`Setuju untuk keduanya, dan saldo Budi masih ${rp(BUKU_A.pemakai!)} sesudahnya`);
    expect(p.options.filter((_, i) => i !== 3)).toEqual([
      "Setuju untuk yang pertama dan tolak untuk yang kedua, karena saldo hanya cukup satu kali",
      "Tolak keduanya, karena dua permintaan serentak ditolak sebagai pengaman",
      "Setuju untuk keduanya, dan saldo Budi menjadi −Rp60.000 sebelum penagihan",
    ]);
    const panjang = p.options.map((o) => o.length);
    expect(Math.max(...panjang)).not.toBe(panjang[p.answer]);
    const lain = ["t4-m34", "t4-m35"].map((n) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${n}.json`)) as Skenario).predict.answer);
    expect(lain).not.toContain(p.answer);
    // pilihan lain bertentangan dengan rekaman: kedua setuju, saldo masih sama, tidak ada penolakan di otorisasi serentak
    expect(bagOA).not.toMatch(/AUTH-[AB] Rp[\d.]+: tolak/);
    expect(BUKU_A.pemakai).toBe(SALDO);
    expect(SALDO - 2 * NOMINAL).toBe(-60000);
    expect(p.q).toBe(`Penerbit meminta dua otorisasi ${rp(NOMINAL)} sekaligus untuk kartu Budi, yang saldonya ${rp(SALDO)}. Versi pertama handler membaca saldo, lalu menjawab. Apa yang dijawab Rekeningo?`);
    expect(p.explain).toBe(`Handler versi pertama hanya membaca saldo dan tidak menahan dana. Kedua otorisasi membaca ${rp(SALDO)} dan keduanya disetujui, dan saldo Budi masih ${rp(BUKU_A.pemakai!)} sesudahnya. Rekaman otorisasi.txt bagian A.`);
  });
  test("baris perintah dan keluaran di kirim ada di rekaman sumbernya, per baris; rentang langkah sama dengan rentang rekaman", () => {
    const ada = (rekaman: string, kirim: string) => {
      const baris = rekaman.split("\n");
      for (const b of kirim.split("\n")) expect(baris.some((r) => r === b || (b.startsWith("#") && r.startsWith(b))), `tidak ada di rekaman: ${b}`).toBe(true);
    };
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) ada(otorisasi, l.kirim);
    const [l1, l2, l3, l4] = skenario.langkah;
    expect(l1!.kirim).toBe(`${O.baris[5]!.replace(/ \(token acak.*$/, "")}\n${O.baris[3]!.replace(/ \(versi pertama.*$/, "")}`);
    expect(l2!.kirim).toBe(O.teks(oAuthA, oAuthA + 1));
    expect(l3!.kirim).toBe(O.teks(oAuthA + 2, oTabelAkhir));
    expect(l4!.kirim).toBe(O.teks(oClearing, oClearing + 1));
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.kirim).toBe(O.teks(oAuthA + 14, oAuthA + 15));
    expect(v2!.kirim).toBe(O.teks(oHitung, oHitungAkhir));
    expect(v3!.kirim).toBe(O.teks(oClearing, oClearing + 2));
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["pnb", "srv"], ["pnb", "srv"], ["srv", "dbm"], ["pnb", "srv"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["pnb", "srv"], ["srv", "dbm"], ["pnb", "srv"]]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["", "warn", "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "")).toEqual(["warn", "warn", "warn"]);
  });
  test("teks langkah (judul dan jelas) dari angka rekaman; langkah varian terakhir tidak membuka jawaban tebakan jalur utama", () => {
    const [l1, l2, l3, l4] = skenario.langkah;
    expect(l1!.jelas).toBe(`Budi punya kartu virtual dan saldo ${rp(SALDO)}. Server memakai versi pertama handler otorisasi, dengan jeda 300 ms di antara cek dan tulis supaya celahnya terekam. Penerbit tiruan memberi tenggat 10 detik di bagian ini.`);
    expect(l2!.jelas).toBe("Catatan penerbit tiruan menulis sumber keputusan: rekeningo. Penerbit tidak memutuskan sendiri, dan kedua id_penerbit berbeda.");
    expect(l3!.jelas).toBe(`Kolom ada_jurnal_tahan bernilai f di kedua baris. Di rekaman yang sama, buku dana_tertahan berisi Rp${BUKU_A.dana_tertahan} dan saldo Budi tetap ${rp(BUKU_A.pemakai!)}.`);
    expect(l4!.jelas).toBe(`Penagihan AUTH-A menutup ${rp(NOMINAL)} dari saldo, dan saldo Budi tinggal ${rp(SALDO_SESUDAH)} (Hitungan: ${rp(SALDO)} − ${rp(NOMINAL)}). Penagihan AUTH-B ditolak ledger karena ${rp(SALDO_SESUDAH)} kurang dari ${rp(NOMINAL)}: persetujuan kedua sudah diberikan tanpa saldo yang menutupinya.`);
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.jelas).toBe("Tidak ada yang berjalan bersamaan, dan AUTH-C tetap disetujui. Tanpa dana tertahan, tidak ada yang mengubah saldo yang dibaca otorisasi berikutnya.");
    expect(v2!.jelas).toBe(`Tiga persetujuan masing-masing ${rp(NOMINAL)} berjumlah ${rp(JUMLAH_DISETUJUI)}, untuk saldo ${rp(SALDO)} (3 × ${rp(NOMINAL)}, Hitungan).`);
    expect(v3!.jelas).toBe(`Hanya penagihan pertama yang punya penutup. ${rp(JUMLAH_DISETUJUI - NOMINAL)} yang sudah disetujui tidak punya saldo yang menutupinya (${rp(JUMLAH_DISETUJUI)} − ${rp(NOMINAL)}, Hitungan).`);
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Penerbit meminta dua otorisasi Rp80.000 untuk Budi", "Rekeningo menjawab setuju untuk keduanya", "Dua baris berstatus ditahan, tanpa jurnal tahan",
      "Penagihan datang: yang pertama lolos, yang kedua ditolak",
    ]);
    expect(skenario.varian.langkah.map((l) => l.judul)).toEqual(["Otorisasi ketiga datang sesudah dua yang pertama selesai", "Tiga persetujuan berjumlah Rp240.000", "Penagihan kedua dan ketiga ditolak ledger"]);
    expect(skenario.pengantar).toContain(`${rp(NOMINAL)} untuk kartu Budi, yang saldonya ${rp(SALDO)}`);
  });
  test("skenario dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman dengan angka dari rekaman", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m37");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m37-1", "t4-m37-2", "t4-m37-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m37-kartu-dua-kali/" && k.judul === "4.22 M37: Kartu virtual disetujui dua kali dengan satu saldo")).toBe(true);
    expect(kartu[0]!.tanya).toBe(`Dua otorisasi ${rp(NOMINAL)} untuk saldo ${rp(SALDO)} sama-sama disetujui. Kenapa menunggu otorisasi pertama selesai tidak menolong?`);
    expect(kartu[0]!.jawab).toContain(`saldo yang dibaca otorisasi berikutnya tetap ${rp(SALDO)}`);
    expect(kartu[1]!.jawab).toContain(`${rp(JUMLAH_DISETUJUI)} disetujui untuk saldo ${rp(SALDO)}, dan dua penagihan ditolak dengan 409 (\`otorisasi.txt\` bagian B).`);
    expect(kartu[2]!.jawab).toContain("Rekeningo tidak punya baris dan tidak menahan dana, dan penagihannya dijawab 404 (`penerbit.txt` bagian A).");
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const butir = [...cek.matchAll(/\*\*(\d+)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(butir.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(kartu.map((k) => k.tanya)).toEqual(butir.map((m) => m[2]));
    expect(kartu.map((k) => k.jawab)).toEqual(butir.map((m) => m[3]));
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: enam tautan; akhir halaman memuat SkripLama", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]|]+)/gm)].map((m) => m[1])).toEqual(["t4-kartu", "t2-m9", "t2-race-lock", "t4-prd", "t4-skema", "t4-fitur-teknis"]);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
  });
});

describe("tinjauan: nilai yang diturunkan dari sumber, bukan dari kunci baris", () => {
  test("nomor masalah dan minggu dari label registry; judul tebal dan daftar bernomor tetap; satu heading", () => {
    const m37 = cocok(dari("t4-m37").label!, /^Masalah (\d+) · minggu (\d+)$/);
    harus(`Minggu ${m37[2]} Tahap 4.`);
    expect(naskah).toContain(`| M${m37[1]} | ${m37[2]} |`);
    expect(frontmatter).toContain(`title: "4.22 M${m37[1]}: Kartu virtual`);
    expect(frontmatter).toContain(`description: Minggu ${m37[2]}.`);
    expect([...badan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual([]);
    expect(badan.match(/^\*\*(\d+)\.\*\* /gm)!.map((s) => s.replace(/\D/g, ""))).toEqual(["1", "2", "3"]);
    expect([...badan.matchAll(/^\*\*([^*\n]+)\*\*/gm)].map((m) => m[1]).filter((x) => !/^\d+\.$/.test(x!))).toEqual([
      "Penerbit hanya meneruskan jawaban Rekeningo.", "Handler versi pertama membaca saldo lalu setuju.", "Tidak ada dana yang berpindah.",
      "Penagihan datang kemudian, dan ledger menolaknya.", "Tenggat 2 detik membuka jalan kedua ke gejala yang sama.", "Yang belum terjawab.", "Yang tidak direkam.",
    ]);
    expect(badan.match(/^#{1,6} /gm)).toEqual(["### "]);
  });
  test("istilah diberi arti di pemakaian pertama, di luar adegan: hold, clearing, cek-lalu-tulis, lock_timeout", () => {
    const tanpaKode = badan.replace(/`[^`\n]*`/g, "`x`");
    expect(tanpaKode.search(/\bhold\b/i)).toBe(tanpaKode.indexOf("Hold adalah dana di saldo yang dipisahkan sementara untuk satu otorisasi"));
    expect(tanpaKode.search(/\bclearing\b/i)).toBe(tanpaKode.indexOf("disebut clearing") + "disebut ".length);
    expect(badan.indexOf("cek-lalu-tulis")).toBe(badan.indexOf("Pola ini bernama cek-lalu-tulis") + "Pola ini bernama ".length);
    expect(badan.indexOf("lock_timeout")).toBe(badan.indexOf("`lock_timeout` adalah batas waktu") + 1);
    expect(badan.indexOf("Hold adalah")).toBeGreaterThan(badan.indexOf("Pola ini bernama cek-lalu-tulis"));
    for (const b of cocok(badan, /<Blok nama="Konsep yang lahir">([\s\S]*)$/)[1]!.split("\n")) expect(b).not.toMatch(/\b(adalah|yaitu|disebut)\b/);
  });
  test("label sumber: Rekaman lab, Hitungan, Ilustrasi, Asumsi hanya di kalimat arti label, Tidak dijalankan dan [perlu verifikasi] diberi arti; tidak ada klaim kepatuhan", () => {
    for (const l of ["Rekaman lab", "Hitungan", "Ilustrasi", "Tidak dijalankan", "[perlu verifikasi]"]) expect(badan, l).toContain(l);
    expect(badan.match(/Asumsi/g)).toHaveLength(1);
    harus("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
    expect(badan).not.toMatch(/Rekaman lab[^.\n]{0,60}(Rp160\.000|toko online|esok|Hitungan)/);
  });
  test("tanpa JavaScript: noscript memuat hasil dari rekaman; widget dan kotak Ubah satu hal dijelaskan", () => {
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(noscript).toContain(`dua otorisasi ${rp(NOMINAL)} serentak dijawab setuju oleh Rekeningo untuk saldo ${rp(SALDO)}, tanpa dana tertahan, dan penagihan kedua ditolak ledger dengan 409.`);
    expect(noscript).toContain(`tiga persetujuan berjumlah ${rp(JUMLAH_DISETUJUI)}. Rekamannya ada di cuplikan pada blok sebelumnya.`);
    expect(noscript).toContain("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia.");
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    harus("Tebak dulu apa yang dijawab Rekeningo atas dua otorisasi serentak, lalu tekan Berikutnya atau panah kanan.");
    expect(skenario.predict.q).toContain("Apa yang dijawab Rekeningo?");
  });
});

describe("baris riset 4.22: lima baris, urut ID, dan nilai dari rekaman", () => {
  test("R4-215 sampai R4-219 ada, urut, tanpa ID ganda; nilai Hitungan sama dengan rekaman dan halaman", () => {
    const id = riset.split("\n").map((b) => b.match(/^\| R4-(\d+) \|/)?.[1]).filter((x): x is string => !!x).map(Number);
    expect(id.length).toBeGreaterThan(150);
    expect(id.every((n, i) => i === 0 || n > id[i - 1]!), "baris riset urut ID naik dan tanpa ID ganda").toBe(true);
    expect(id.slice(id.indexOf(215), id.indexOf(215) + 5)).toEqual([215, 216, 217, 218, 219]);
    const r217 = barisRiset("R4-217");
    expect(r217).toContain(`2 x ${rp(NOMINAL)} = ${rp(NASKAH_TOTAL)}`);
    expect(r217).toContain(`${rp(SALDO)} - ${rp(NOMINAL)} = ${rp(SALDO_SESUDAH)} dan 3 x ${rp(NOMINAL)} = ${rp(JUMLAH_DISETUJUI)}`);
    expect(r217).toContain(`${rp(JUMLAH_DISETUJUI)} - ${rp(NOMINAL)} = ${rp(JUMLAH_DISETUJUI - NOMINAL)}`);
    const kepala = cocok(O.baris[1]!, /^# PostgreSQL (\d+\.\d+) \([^)]*\) · (go[\d.]+) · pgx (v[\d.]+) · schema (\w+) /);
    expect(barisRiset("R4-215")).toContain(`PostgreSQL ${kepala[1]}, ${kepala[2]}, pgx ${kepala[3]}`);
    expect(kepala[4]).toBe("tahap4_kartu");
    harus(`*Kondisi rekaman:* PostgreSQL ${kepala[1]}, ${kepala[2]}, dan pgx ${kepala[3]}, dari database bersih, dengan server \`api-t4\` satu proses dan penerbit tiruan.`);
    expect(barisRiset("R4-215")).toContain("`otorisasiTanpaHold` baris 307 sampai 354");
    expect(K.baris[kFungsi - 1]).toBe("func (s Service) otorisasiTanpaHold(ctx context.Context, in PermintaanOtorisasi) (Keputusan, error) {");
    expect(kFungsi).toBe(307);
    expect(kFungsiAkhir).toBe(354);
    expect(barisRiset("R4-215")).toContain("`Clearing` baris 373 sampai 442");
    expect([kClearing, kClearingAkhir]).toEqual([373, 442]);
  });
});

describe("tinjauan 1353: kalimat yang hanya dijaga kunci baris diturunkan dari rekaman, kode, registry, dan baris riset", () => {
  test("tenggat penerbit: angka di halaman sama dengan dokumentasi (baris riset), kepala penerbit.txt, bawaan penerbit tiruan, diagram, dan Cek diri; angka bagian A otorisasi.txt dari kepala rekamannya", () => {
    const dok = cocok(barisRiset("R4-216"), /within (\d+) seconds/)[1]!;
    const kepalaP = cocok(penerbit, /penerbit tiruan: \.\/penerbit, tenggat (\d+) detik/)[1]!;
    const bawaan = cocok(penerbitGo, /flag\.Duration\("tenggat", (\d+)\*time\.Second/)[1]!;
    expect([dok, kepalaP, bawaan]).toEqual(["2", "2", "2"]);
    harus(`penerbit menunggu paling lama ${dok} detik ([dokumentasi satu penerbit kartu]`);
    harus(`Bila jawaban Rekeningo terlambat dari ${dok} detik, penerbit memutuskan menurut setelan timeout miliknya`);
    harus(`**Tenggat ${dok} detik membuka jalan kedua ke gejala yang sama.**`);
    harus(`Jawaban Rekeningo lewat dari ${dok} detik karena satu buku terkunci.`);
    expect(JSON.stringify(diagramMentah)).toContain(`"label":"Jawaban lewat dari ${dok} detik"`);
    expect(JSON.stringify(diagramMentah)).toContain(`"sub":"satu buku terkunci lebih dari ${dok} detik"`);
    const naik = cocok(otorisasi, /Tenggat penerbit tiruan dinaikkan ke (\d+) detik di bagian ini/)[1]!;
    expect(Number(naik)).toBeGreaterThan(Number(dok));
    harus(`dinaikkan ke ${naik} detik, jadi waktu tidak ikut menentukan hasilnya`);
    expect(skenario.langkah[0]!.jelas).toContain(`tenggat ${naik} detik di bagian ini`);
    const lt = cocok(penerbit, /-kartu-lock-timeout (\d+)s/)[1]!;
    expect(Number(lt)).toBeGreaterThan(Number(dok));
    harus(`Server dijalankan dengan \`-kartu-lock-timeout ${lt}s\``);
  });
  test("registry: path halaman menunjuk berkas yang ada dan sama dengan BERKAS; pengantar widget menyuruh menebak sebelum mengikuti langkah", () => {
    const h = dari("t4-m37");
    expect(h.path).toBe("tahap-4/m37-kartu-dua-kali.md");
    expect(BERKAS).toBe(`situs/src/content/docs/${h.path!.replace(/\.md$/, ".mdx")}`);
    expect(baca(BERKAS).length).toBeGreaterThan(1000);
    expect(skenario.pengantar).toMatch(/^Penerbit kartu meminta dua otorisasi .+\. Tebak dulu apa yang dijawab Rekeningo, lalu ikuti langkahnya\. Sesudah langkah terakhir, centang 'Ubah satu hal'\.$/);
  });
  test("noscript: kalimat otorisasi ketiga diturunkan dari rekaman (urutan, hasil, jumlah)", () => {
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(bagOA).toContain("# Kontrol: otorisasi ketiga datang sesudah dua yang pertama selesai, bukan bersamaan.");
    expect(bagOA).toContain(`AUTH-C ${rp(NOMINAL_C)}: setuju (sumber: rekeningo)`);
    expect(DISETUJUI).toBe(3);
    expect(noscript).toContain(`Otorisasi ketiga yang datang sesudah dua yang pertama selesai juga disetujui, jadi tiga persetujuan berjumlah ${rp(JUMLAH_DISETUJUI)}.`);
  });
  test("janji ke halaman 4.23: tiga kalimat menaut ke halaman yang registry dan naskah beri judul otorisasi, dana tertahan, ADR 42", () => {
    const j1 = cocok(badan, /Apa yang membedakan server ini dari versi pertama, dan cara menutup kedua jalan, ada di \[\[([^\]]+)\]\]\./)[1]!;
    const j2 = cocok(badan, /Cara menahan dana sebelum menjawab setuju ada di \[\[([^\]]+)\]\]\./)[1]!;
    const j3 = cocok(badan, /- \[\[([^\]|]+)\]\]: otorisasi yang menahan dana sebelum menjawab setuju, dan batas waktu jawabannya\. Keputusannya ADR (\d+)\./);
    expect([j1, j2, j3[1]]).toEqual(["t4-kartu", "t4-kartu", "t4-kartu"]);
    const h = dari("t4-kartu");
    expect(h.nomor).toBe("4.23");
    expect(h.judul).toContain(`ADR ${j3[2]}`);
    expect(h.judul).toContain("otorisasi, dana tertahan");
    expect(h.prasyarat).toContain("t4-m37");
    expect(naskah).toContain(`| 4.23 | 4 | ${h.judul} |`);
  });
  test("catatan penerbit tiruan dan kalimat penjelas Yang Raka kira: sumber hanya rekeningo atau timeout; id sama dua kali satu baris; handler versi pertama tidak memanggil hold", () => {
    const sumber = [...new Set([...penerbitGo.matchAll(/Sumber: "(\w+)"|"sumber": "(\w+)"/g)].map((m) => m[1] ?? m[2]!))].sort();
    expect(sumber).toEqual(["rekeningo", "timeout"]);
    harus("Bila penerbit memutuskan sendiri karena jawaban Rekeningo tidak datang, catatannya menulis sumber `timeout`, bukan `rekeningo`.");
    expect(penerbitGo).toContain('mux.HandleFunc("GET /lab/keputusan"');
    harus("Dugaan Raka bisa diperiksa dari catatan keputusan penerbit.");
    harus("Bila penerbit mengirim permintaan yang sama dua kali, kedua permintaan membawa nomor yang sama.");
    expect(bagOD).toMatch(/AUTH-1 pertama Rp[\d.]+: setuju \(sumber: rekeningo\)\nAUTH-1 kedua \(berurutan\) Rp[\d.]+: setuju/);
    expect(bagOD).toMatch(/baris_otorisasi\n-+\n 1\n/);
    harus("Rekeningo menjawab setuju atau tolak, dan penerbit menunggu paling lama");
    expect(otorisasi).toMatch(/: setuju \(sumber: rekeningo\)/);
    expect(otorisasi).toMatch(/: tolak \(sumber: rekeningo, alasan: saldo-kurang\)/);
    harus("Handler ini tidak membuat hold.");
    expect(badanFungsi.split("\n").slice(1).join("\n")).not.toMatch(/\b\w*(Tahan|Jurnal|Ledger|Hold)\w*\(/);
  });
  test("baris riset: rentang baris migrasi, nama berkas, jumlah rekaman, tanggal akses, dan jeda lab diturunkan dari berkasnya", () => {
    const garis = (isi: string, awal: string, akhir: string): [number, number] => {
      const b = isi.split("\n");
      const a = b.findIndex((x) => x.startsWith(awal)) + 1;
      expect(a, `awal ${awal}`).toBeGreaterThan(0);
      const z = b.findIndex((x, n) => n >= a - 1 && x.includes(akhir)) + 1;
      expect(z, `akhir ${akhir}`).toBeGreaterThanOrEqual(a);
      return [a, z];
    };
    const r219 = barisRiset("R4-219");
    const [a1, z1] = garis(migT2, "CREATE CONSTRAINT TRIGGER saldo_karyawan_tidak_negatif", "WHEN (NEW.jumlah < 0) EXECUTE FUNCTION cek_saldo_karyawan();");
    expect(r219).toContain(`000010_ledger_tabel.up.sql\` baris ${a1} sampai ${z1}:`);
    const [a2, z2] = garis(migT4, "-- Invarian 3 (saldo tidak negatif)", "USING ERRCODE = 'check_violation', CONSTRAINT = 'saldo_karyawan_tidak_negatif'");
    expect(r219).toContain(`000020_akun_tingkat_buku_jenis.up.sql\` baris ${a2} sampai ${z2}:`);
    const berkas = r219.match(/labs\/[\w\-/.]+\.sql/g)!;
    expect(berkas).toHaveLength(2);
    for (const f of berkas) expect(baca(f).length).toBeGreaterThan(0);
    const r215 = barisRiset("R4-215");
    expect(r215).toContain(`saldo ${SALDO}`);
    expect(r215).toContain(`AUTH-A dan AUTH-B ${rp(NOMINAL)} serentak`);
    expect(r215).toContain(`${DISETUJUI} disetujui, jumlah ${JUMLAH_DISETUJUI}`);
    const r216 = barisRiset("R4-216");
    const tgl = cocok(badan, /\(\[dokumentasi satu penerbit kartu\]\([^)]+\), dibuka (\d{4}-\d{2}-\d{2}), Tidak dijalankan\)/)[1]!;
    expect([cocok(r216, /dibuka ulang (\d{4}-\d{2}-\d{2}),/)[1], cocok(r216, /real-time-authorizations \(dibuka (\d{4}-\d{2}-\d{2});/)[1]]).toEqual([tgl, tgl]);
    const jeda = cocok(otorisasi, /-lab-jeda-cek-tulis (\d+)ms/)[1]!;
    expect(barisRiset("R4-218")).toContain(`jeda lab ${jeda} ms`);
    expect(barisRiset("R4-218")).toContain("clearing kedua 'esok harinya'");
    expect(barisM37).toContain("Esok harinya clearing kedua");
    harus(`Jeda ${jeda} ms di antara cek dan tulis hanya ada di lab.`);
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "Raka", "Budi", "Hadi", "pertama", "kedua", "ketiga", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "setuju", "tolak", "ditolak", "disetujui", "menolak", "hold", "ditahan", "dana", "saldo", "otorisasi", "penagihan", "clearing", "penerbit", "Rekeningo", "ledger", "409", "404", "200", "Rp100.000", "Rp80.000", "Rp160.000", "Rp240.000", "Rp20.000", "AUTH-A", "AUTH-B", "AUTH-C", "AUTH-P1", "AUTH-P2", "timeout", "lock_timeout", "rekeningo", "terlambat", "tenggat", "2 detik", "10 detik", "300 ms", "[perlu verifikasi]", "kepatuhan", "lab", "tiruan", "kartu", "jurnal", "dana_tertahan", "settlement_kartu", "cek-lalu-tulis", "COMMIT", "reversal", "satu-satunya", "bisa", "bisa sudah berubah", "esok harinya", "berjam-jam", "serentak", "bersamaan", "berurutan", "ADR 42", "kondisi", "tersisa", "kurang", "cukup", "negatif", "pemakai", "database", "kode", "rekaman", "Kondisi rekaman", "dugaan", "bug", "dibaca dari kode", "dibaca dari file itu"];
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
    expect(["R4-215", "R4-216", "R4-217", "R4-218", "R4-219"].map(barisRiset)).toEqual(RISET_TERKUNCI);
    expect(RISET_TERKUNCI).toHaveLength(5);
  });
  test("tiap nilai diagram dan skenario (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(SKENARIO_DAUN);
  });
  test("sidik frontmatter terkunci; sidik tiap baris riset terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(["R4-215", "R4-216", "R4-217", "R4-218", "R4-219"].map((i) => sidik(barisRiset(i)))).toEqual(SIDIK.riset);
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
