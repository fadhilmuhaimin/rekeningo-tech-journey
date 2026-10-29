// Penjaga halaman 4.14 (keputusan 1318 sampai 1320): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, skenario alur t4-m33.json, halaman istilah, baris riset, dan kartu
// Cek diri di m33-uji-pulih.mdx diturunkan dari rekaman labs/t4-storage (ukuran.txt, unggah.txt), kode lab api-t4 (objek/bytea.go,
// service/verifikasi.go), README lab, naskah Tahap 4, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.10): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman, sehingga satu kata, satu "tidak", satu tingkat heading, atau satu atribut yang
// berubah menggagalkan tes; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap
// SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, id dan nilai diagram, skenario, istilah, baris riset) dikunci dengan
// sidik jari di berkas nilai; tabel Hitungan dihitung ulang dari rumusnya sendiri.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m33-file-di-bytea.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, SIDIK } from "./m33-uji-pulih.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m33-uji-pulih.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m33.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const istilahMentah = baca("situs/data/halaman-istilah/backup-dan-uji-pulih.json");
const istilah = HalamanIstilah.parse(JSON.parse(istilahMentah));
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const ukuran = baca("labs/t4-storage/output/ukuran.txt");
const unggah = baca("labs/t4-storage/output/unggah.txt");
const readme = baca("labs/t4-storage/README.md");
const runLab = baca("labs/t4-storage/run.py");
const byteaGo = baca("labs/api-t4/internal/objek/bytea.go");
const verifikasiGo = baca("labs/api-t4/internal/service/verifikasi.go");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal43 = baca("situs/src/content/docs/tahap-4/fitur-topup-verifikasi.mdx");
const hal45 = baca("situs/src/content/docs/tahap-4/skema-data.mdx");
const hal327 = baca("situs/src/content/docs/tahap-3/tim-infra.mdx");
const hal330 = baca("situs/src/content/docs/tahap-3/sengaja-belum.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: unknown }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; catatan: string; fileVarian?: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat?: { id: string; label: string }[];
  layarAwal?: unknown;
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
// angka Indonesia ("12.600", "0,0116") menjadi number, dan sebaliknya
const angka = (s: string): number => Number(s.replace(/\.(?=\d{3}(?!\d))/g, "").replace(",", "."));
const fmt = (n: number, d = 0): string => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
const IDS = ["R4-175", "R4-176", "R4-177", "R4-178", "R4-179"];

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
const U = bagian(ukuran);
const uA = U.nomor((b) => b.startsWith("# --- A. ")), uB = U.nomor((b) => b.startsWith("# --- B. ")), uC = U.nomor((b) => b.startsWith("# --- C. ")), uD = U.nomor((b) => b.startsWith("# --- D. "));
const uAAwal = U.nomor((b) => b.startsWith("=> SELECT count(*) AS baris, sum(octet_length(isi))"), uA);
const uAAkhir = U.nomor((b) => b.startsWith("# Dump teks biasa (pg_dump -Fp) atas tabel berkas_bytea saja"), uA);
const uBAwal = U.nomor((b) => b.startsWith("$ psql lab_pulih"), uB);
const uBAkhir = U.nomor((b) => b.startsWith("# Waktu dump dan pulih tidak direkam"), uB);
const uCAwal = U.nomor((b) => b.startsWith("# Di penyimpanan objek: 16 objek, 8.000.000 byte"), uC);
const uCAkhir = U.nomor((b) => b.startsWith("8 pengajuan (8.000.000 byte file di penyimpanan)"), uC);
const bagA = U.teks(uA, U.akhirSebelum(uB)), bagB = U.teks(uB, U.akhirSebelum(uC)), bagC = U.teks(uC, U.akhirSebelum(uD)), bagD = U.teks(uD, U.baris.length - 1);
const UC = bagian(unggah);
const ucC = UC.nomor((b) => b.startsWith("# --- C. "));

// ---- kode lab ---------------------------------------------------------------------------------------------------------
const KB = bagian(byteaGo);
const kbAwal = KB.nomor((b) => b.startsWith("func (b Bytea) Simpan("));
const kbAkhir = KB.nomor((b) => b === "}", kbAwal);
const kodeSimpan = KB.teks(kbAwal, kbAkhir);
const KV = bagian(verifikasiGo);
const kvAwal = KV.nomor((b) => b.startsWith("func (s Service) AjukanVerifikasi("));
const kodeAjukan = KV.teks(kvAwal, KV.nomor((b) => b === "}", kvAwal));

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// ---- angka: registry, naskah, rekaman ---------------------------------------------------------------------------------
const asumsi = (cerita.tahap[3] as unknown as { asumsi: Record<string, number> }).asumsi;
const barisM33 = naskah.split("\n").find((b) => b.startsWith("| M33 |"))!;
const MENIT_LAMA = angka(cocok(barisM33, /tiga minggu lalu (\d+) menit/)[1]!);
const JAM_BARU = cocok(barisM33, /selesai dalam (\d+) jam (\d+) menit/);
const HARI = Number(cocok(barisM33, /sesudah (\d+) hari/)[1]);
const BYTE_POSTING = Number(cocok(barisM33, /43,8 juta ÷ 365 × 28 × (\d+) B/)[1]);
const TRANSAKSI_HARI = (asumsi.user * asumsi.aktif) / 100 * asumsi.trx; // 60.000
const POSTING_TAHUN = TRANSAKSI_HARI * 2 * 365; // 43.800.000
const KB_HARI = asumsi.upload! * asumsi.fileKB!; // 1.000.000 KB
const GB_HARI = (KB_HARI * 1000) / 1e9;
const FILE_HARI = HARI * GB_HARI;
const POSTING_HARI = POSTING_TAHUN / 365;
const POSTING_BYTE = POSTING_HARI * HARI * BYTE_POSTING;
const POSTING_GB = POSTING_BYTE / 1e9;
const RASIO = angka(cocok(bagA, /rasio dump\/file = (\d,\d)/)[1]!);
const RASIO_TEKS = angka(cocok(bagA, /rasio dump\/file = (\d,\d) \(bytea ditulis sebagai heksadesimal/)[1]!);
const MIB = 1048576;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.14 ada, masalah, jalur inti, prasyarat 4.3 dan 3.27, lab t4-storage, peran security dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m33")).toMatchObject({ ada: true, nomor: "4.14", jenis: "masalah", inti: true, prasyarat: ["t4-topup-verifikasi", "t3-tim-infra"], lab: ["t4-storage"], tahap: 4, peran: ["security", "backend"] });
    expect(dari("t4-topup-verifikasi").nomor).toBe("4.3");
    expect(dari("t3-tim-infra").nomor).toBe("3.27");
    expect(frontmatter).toContain('title: "4.14 M33: Uji pulih mingguan makin lama"');
    expect(dari("t4-m33").judul).toBe("M33: Uji pulih mingguan makin lama");
    expect(naskah).toContain("| 4.14 | 4 | M33: Uji pulih mingguan makin lama | Masalah | ★ | t4-storage | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-topup-verifikasi\]\], \[\[t3-tim-infra\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m33").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "t3-adr-33", "t3-tim-infra", "t4-prd", "t4-skema", "t4-storage", "t4-topup-verifikasi"]);
    const sesuai: [string, string, string][] = [
      ["t3-tim-infra", "3.27", "Tim dan infra Tahap 3"], ["t3-adr-33", "3.30", "ADR 33"], ["t4-prd", "4.1", "PRD v4"], ["t4-skema", "4.5", "Skema data"],
      ["t4-storage", "4.15", "Keamanan 7"], ["t4-topup-verifikasi", "4.3", "Fitur: top-up dari bank dan verifikasi identitas"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 4.14 ditepati: 4.3 dan 4.5 menaut ke t4-m33, 4.15 bergantung padanya, 3.27 memuat aturan uji pulih, 3.30 dan 4.1 memuat pertanyaan waktu pulih", () => {
    expect(hal43).toContain("[[t4-m33]] dan [[t4-storage]]: file identitas di penyimpanan objek.");
    expect(hal45).toContain("Alasannya dibahas di [[t4-m33]].");
    expect(dari("t4-storage").prasyarat).toEqual(["t4-m33"]);
    expect(hal327).toContain("Backup `pg_dump` harian diuji pulih tiap minggu di staging (Asumsi).");
    expect(hal330).toContain("Backup harian membuat jendela kehilangan sampai 24 jam, padahal setiap rupiah harus tertelusur, dan PRD v3 tidak menulis batas waktu pulih atau jendela kehilangan data.");
    expect(hal41).toContain("PRD v3 tidak menulis batas itu, dan PRD v4 juga tidak.");
    expect(hal41).toContain("Backup `pg_dump` harian berjendela sampai 24 jam, dan sehari memuat rata-rata ±65.000 transaksi uang dan top-up: 60.000 + 5.000 (Hitungan atas Asumsi).");
    harus("- [[t4-storage]]: object storage, presigned URL, dan retensi file identitas. Keputusannya ADR 38.");
    harus("- [[t3-tim-infra]]: backup `pg_dump` harian dan uji pulih mingguan di staging (ADR 32).");
    harus("- [[t3-adr-33]]: pemicu VPS kedua, yaitu waktu pulih dan jendela kehilangan data.");
  });
  test("halaman tidak membuka isi 4.15: ADR 38 dan ADR 32 sekali tiap nomor, tanpa umur URL, retensi 30 hari, SigV4, atau checksum server", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 32", "ADR 38"]);
    expect(badan.match(/ADR 38/g)).toHaveLength(1);
    expect(badan.match(/ADR 32/g)).toHaveLength(1);
    expect(dari("t4-storage").adr).toEqual([38]);
    expect(dari("t3-tim-infra").adr).toEqual([32]);
    expect(badan).not.toMatch(/X-Amz|SigV4|presigned PUT|bearer|menimpa|kedaluwarsa|30 hari|5 menit|content-length|berkas-rusak/i);
    expect(badan.match(/presigned/gi)).toHaveLength(1);
  });
});

describe("naskah M33: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M33 di naskah: minggu 7, 12 menit dan 3 jam 40 menit, disk staging penuh Sabtu, kutipan Bayu, dugaan disk terlalu kecil, bytea 'ikut transaction dan ikut backup'", () => {
    expect(barisM33).toContain("| M33 | 7 |");
    expect(barisM33).toContain("Uji pulih mingguan di staging (ADR 32) selesai dalam 3 jam 40 menit; tiga minggu lalu 12 menit. Sabtu disk staging penuh dan pemulihan berhenti di tengah (Ilustrasi).");
    expect(barisM33).toContain('Bayu: "Backup yang belum pernah dipulihkan belum dihitung."');
    expect(barisM33).toContain("| Disk staging terlalu kecil; tambah disk |");
    expect(barisM33).toContain('karena "ikut transaction dan ikut backup" (pilihan minggu 3)');
    expect(MENIT_LAMA).toBe(12);
    expect(JAM_BARU.slice(1, 3)).toEqual(["3", "40"]);
    harus("Minggu 7 Tahap 4. Tiap minggu Bayu memulihkan backup produksi ke staging, seperti keputusan di [[t3-tim-infra]].");
    harus(`Tiga minggu lalu pemulihan itu selesai dalam ${MENIT_LAMA} menit. Minggu ini selesai dalam ${JAM_BARU[1]} jam ${JAM_BARU[2]} menit.`);
    harus('Hari Sabtu disk staging penuh, dan pemulihan berhenti di tengah. Bayu menulis di kanal tim: "Backup yang belum pernah dipulihkan belum dihitung."');
    harus(`*Angka cerita (Ilustrasi):* ${MENIT_LAMA} menit, ${JAM_BARU[1]} jam ${JAM_BARU[2]} menit, dan disk penuh berasal dari naskah, bukan dari rekaman.`);
    harus(`Uji yang sama berjalan ${MENIT_LAMA} menit tiga minggu lalu dan ${JAM_BARU[1]} jam ${JAM_BARU[2]} menit sekarang.`);
    harus("Raka memilih `bytea` di minggu 3 karena file \"ikut transaction dan ikut backup\".");
    expect(badan).not.toMatch(/(Rekaman lab)[^.\n]{0,40}(12 menit|3 jam 40 menit)|(12 menit|3 jam 40 menit)[^.\n]{0,40}\(Rekaman lab\)/);
  });
  test("tebakan: jawabannya ada di dalam details dan memuat rasio rekaman, bukan hitungan 28 GB (Hitungan belum diberi arti di blok itu)", () => {
    const t = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(t[1]).toBe("Tebak dulu: jumlah transaksi tumbuh pelan, tetapi uji pulih makin lama. Apa yang membesar di dalam backup?");
    expect(t[2]).toContain(`dump, yaitu file backup yang ditulis \`pg_dump\`, membesar sebanding dengan ukuran file, sekitar ${fmt(RASIO, 1)} kali.`);
    expect(t[2]).not.toMatch(/28 GB|97,1|33,3|Hitungan atas/);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.indexOf("<details class=\"question\">")).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
  });
  test("selisih lab dan naskah di README: 12 menit, 3 jam 40 menit, dan disk penuh tidak muncul di rekaman; 97% dihitung; 'ikut transaction' tidak dibuktikan dan tidak dibantah", () => {
    expect(readme).toContain('6. **Angka M33 yang tidak direproduksi lab.** "3 jam 40 menit", "12 menit", dan disk staging penuh di naskah berlabel Ilustrasi dan tidak muncul di rekaman; lab merekam ukuran (rasio dump/file), bukan waktu.');
    expect(readme).toContain("jadi sifat \"ikut transaction\" tidak dibuktikan dan tidak dibantah oleh lab ini.");
    expect(ukuran).not.toMatch(/3 jam 40|220 menit|disk penuh|disk staging/);
    expect(ukuran).not.toMatch(/\d+ menit/);
  });
});

describe("rekaman ukuran.txt: bagian A sampai D, rentang Snippet, dan klaim negatif berlingkup", () => {
  test("empat Snippet: rentang dari struktur rekaman dan kode, bukan angka tangan; judul memuat berkas dan bagian; bahasa go hanya untuk .go", () => {
    expect(tag).toHaveLength(4);
    expect(berkasSnippet).toEqual(["labs/api-t4/internal/objek/bytea.go", "labs/t4-storage/output/ukuran.txt", "labs/t4-storage/output/ukuran.txt", "labs/t4-storage/output/ukuran.txt"]);
    expect(lines).toEqual([`${kbAwal}:${kbAkhir}`, `${uAAwal}:${uAAkhir}`, `${uBAwal}:${uBAkhir}`, `${uCAwal}:${uCAkhir}`]);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/internal/objek/bytea.go baris ${kbAwal} sampai ${kbAkhir} (Simpan)`,
      "Rekaman lab: labs/t4-storage/output/ukuran.txt, bagian A (file di kolom bytea)",
      "Rekaman lab: labs/t4-storage/output/ukuran.txt, bagian B (pulih ke database lain)",
      "Rekaman lab: labs/t4-storage/output/ukuran.txt, bagian C (file di penyimpanan objek)",
    ]);
    expect(tag[0]).toContain('lang="go"');
    for (const t of tag.slice(1)) expect(t).not.toContain("lang=");
    expect(uA).toBe(7);
    expect(U.baris[uAAkhir - 1]).toContain("rasio dump/file = 2,0");
    expect(U.baris[uBAkhir - 1]).toContain("120 detik");
    expect(U.baris[uCAkhir - 1]).toContain("rasio dump/file di bawah 0,01: ya");
    // Snippet tidak menampilkan komentar lab internal: tanpa nomor keputusan, ID riset, nama tes, atau kepala rekaman
    for (const [a, b] of [[uAAwal, uAAkhir], [uBAwal, uBAkhir], [uCAwal, uCAkhir]] as const) expect(U.teks(a, b)).not.toMatch(/keputusan|R\d-\d|Test[A-Z]|^# Lab t4-storage/m);
    expect(kodeSimpan).not.toMatch(/\/\/|M33/);
  });
  test("bagian A: 16 baris, 8.000.000 byte, rasio 1,1 pada 2, 4, dan 8 pengajuan (batas 0,99 sampai 1,25), dump teks 2,0 (batas 1,95 sampai 2,10); mode rentan berkas-bytea", () => {
    expect(bagA).toMatch(/ 16 +\| 8000000\n/);
    expect(bagA).toContain("# server: ./api-t4 -lab -rentan berkas-bytea (penyimpanan objek = tabel berkas_bytea)");
    for (const n of [2, 4, 8]) expect(bagA).toContain(`${n} pengajuan (${fmt(n * 2 * 500000)} byte file): rasio dump/file = 1,1`);
    expect(RASIO).toBe(1.1);
    expect(RASIO_TEKS).toBe(2);
    expect(runLab).toContain("harap(0.99 <= rasio <= 1.25, True,");
    expect(runLab).toContain("harap(1.95 <= rasio_teks <= 2.10, True,");
    expect(bagA).toContain("pg_dump menulis bytea sebagai teks heksadesimal lalu memampatkannya; byte acak tidak bisa dimampatkan lebih jauh, dan JPEG nyata sudah terkompresi.");
    expect(runLab).toContain('dump_ukuran("-Fc", "-n", SCH)');
    expect(runLab).toContain('dump_ukuran("-Fp", "-t", f"{SCH}.berkas_bytea")');
    harus("Delapan pengajuan menyimpan 16 file, 8.000.000 byte.");
    harus(`Rasionya tetap ${fmt(RASIO, 1)} pada 2, 4, dan 8 pengajuan.`);
    harus(`Dump teks biasa (\`pg_dump -Fp\`) atas tabel itu ${fmt(RASIO_TEKS, 1)} kali ukuran file.`);
    harus("Dump format custom (`pg_dump -Fc`) terkompresi secara bawaan (");
    harus("tetapi byte acak tidak bisa dimampatkan lebih jauh.");
  });
  test("klaim 'foto JPEG nyata ... rasio tidak diukur' berlingkup: README lab menulisnya, dan tidak ada rekaman t4-storage atau skrip yang memakai foto nyata", () => {
    expect(readme).toContain("Rasio dump/file untuk foto nyata tidak diukur.");
    expect(runLab).not.toMatch(/\.jpe?g|\.png|imread|\bPIL\b|Image\.open/);
    expect(runLab).toContain("File gambar karangan (Ilustrasi): tanda tangan PNG sah, lalu byte acak berbenih tetap");
    harus("Foto JPEG nyata sudah terkompresi, jadi rasionya mungkin mirip. Itu penalaran: rasio foto nyata tidak diukur.");
    harus("Tiap pengajuan membawa dua file 500.000 byte, berisi tanda tangan PNG lalu byte acak (Ilustrasi), jadi rasio untuk foto nyata tidak diukur.");
    expect(ukuran).toContain("Isi file karangan (Ilustrasi): tanda tangan PNG, lalu byte acak berbenih tetap.");
  });
  test("bagian B: pulih 16 baris 8.000.000 byte, md5 tiap baris sama, waktu tidak direkam (batas 120 detik untuk 8 MB); klaim waktu tidak direkam berlingkup ukuran.txt dan skrip", () => {
    expect(bagB).toContain("16|8000000   # 16 baris, 8.000.000 byte: sama dengan sebelum dump");
    expect(bagB).toContain("isi tiap baris sesudah pulih sama dengan sebelum dump (md5 per baris, diurutkan; bukan hanya jumlah baris dan byte): ya");
    expect(bagB).toContain("Hanya batasnya yang diperiksa: dump dan pulih 8 MB selesai dalam 120 detik. Waktu untuk puluhan GB tidak diukur (Tidak dijalankan).");
    expect(runLab).toContain("timeout=120)");
    const fungsiUkuran = runLab.slice(runLab.indexOf("def rekam_ukuran():"), runLab.indexOf("# ---------- presign ----------"));
    expect(fungsiUkuran.length).toBeGreaterThan(3000);
    expect(fungsiUkuran).not.toMatch(/time\.|perf_counter|monotonic|datetime/);
    expect(readme).toContain("- **Waktu dump dan pulih untuk puluhan GB** dan \"disk penuh\": Tidak dijalankan; hanya ukuran 8 MB dan batas 120 detik yang diperiksa.");
    harus("Waktu dump dan pulih bergantung mesin, jadi lab hanya memeriksa batas 120 detik untuk 8 MB.");
    harus("Karena itu 12 menit dan 3 jam 40 menit tetap Ilustrasi.");
  });
  test("bagian C: 16 objek, 8.000.000 byte di penyimpanan; kunci paling pendek 48 dan checksum 64 karakter; rasio di bawah 0,01 pada tiga ukuran; pencadangan penyimpanan Tidak dijalankan", () => {
    expect(bagC).toContain("# penyimpanan objek: SeaweedFS 4.51 di container, endpoint S3 lokal, bucket privat 'berkas'");
    expect(bagC).toContain("# Di penyimpanan objek: 16 objek, 8.000.000 byte; di database: baris verifikasi dengan kunci dan checksum saja.");
    expect(bagC).toMatch(/ 8 +\| 48 +\| 64\n/);
    expect(runLab).toContain("min(length(berkas_kartu_kunci)) AS panjang_kunci, min(length(checksum_kartu)) AS panjang_checksum");
    for (const n of [2, 4, 8]) expect(bagC).toContain(`${n} pengajuan (${fmt(n * 2 * 500000)} byte file di penyimpanan): rasio dump/file di bawah 0,01: ya`);
    expect(bagC).toContain("# Dump tidak membawa file. File punya salinan sendiri yang harus dicadangkan terpisah: pencadangan SeaweedFS Tidak dijalankan di lab ini.");
    expect(readme).toContain("- **Pencadangan dan replikasi SeaweedFS**, pemulihan penyimpanan objek, dan bukti bahwa file yang dihapus job juga hilang dari salinan cadangan: Tidak dijalankan.");
    expect(runLab).not.toMatch(/weed (filer\.)?backup|volume\.copy|snapshot/i);
    expect(skenario.varian.langkah[1]!.jelas).toContain("paling pendek 48 karakter dan checksum paling pendek 64 karakter");
    harus("Lab memakai SeaweedFS 4.51, dan database hanya menyimpan kunci objek dan checksum tiap file:");
    harus("Dump tidak membawa file, jadi file perlu cadangan sendiri, dan pencadangan penyimpanan objek Tidak dijalankan di lab.");
  });
  test("kondisi rekaman: versi PostgreSQL, Go, dan SeaweedFS dari kepala rekaman dan README", () => {
    expect(ukuran).toContain("# PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) · go1.27.1 · pgx v5.11.0 · schema tahap4_storage");
    expect(readme).toContain("SeaweedFS | 4.51 (Apache-2.0)");
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, server Go `api-t4`, dan SeaweedFS 4.51 untuk baris kedua. Dua run dari database bersih.");
    expect(ukuran).toContain("# Rekaman dari database bersih: make -C labs/t4-storage run.");
  });
});

describe("kode lab dan hitungan: Simpan di luar transaction, 1 MiB, tabel Hitungan", () => {
  test("Simpan menulis satu INSERT lewat b.DB (bukan tx); AjukanVerifikasi memanggil Simpan sebelum catatPengajuan (tempat DalamTx), dan tidak memanggil DalamTx sendiri", () => {
    expect(kodeSimpan).toContain("INSERT INTO berkas_bytea (kunci, isi) VALUES ($1, $2)");
    expect(kodeSimpan).toContain("b.DB.ExecContext(ctx,");
    expect(kodeSimpan).not.toMatch(/Begin|DalamTx|tx\./);
    const i = kodeAjukan.indexOf("s.t4.Objek.Simpan(ctx, kunciKartu, kartu)");
    const j = kodeAjukan.indexOf("s.catatPengajuan(");
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(kodeAjukan).not.toContain("DalamTx");
    expect(verifikasiGo).toMatch(/func \(s Service\) catatPengajuan\([^\n]*\{\n\tvar id int64\n\terr := s\.repo\.DalamTx\(/);
    expect(byteaGo).toContain("klaim \"ikut transaction\" tidak dibuktikan oleh tipe ini");
    harus("`AjukanVerifikasi` memanggil `Simpan` sebelum transaction pengajuan dibuka, dan `Simpan` menulis tiap file dengan satu pernyataan `INSERT` sendiri (Tidak dijalankan: dibaca dari kode):");
  });
  test("tabel Hitungan: tiap baris dihitung dari registry (upload, fileKB), naskah (28 hari, 250 byte, 60.000 transaksi) dan rasio rekaman", () => {
    expect(asumsi.upload).toBe(2000);
    expect(asumsi.fileKB).toBe(500);
    expect(TRANSAKSI_HARI).toBe(60000);
    expect(POSTING_TAHUN).toBe(43800000);
    expect(HARI).toBe(28);
    expect(BYTE_POSTING).toBe(250);
    const baris = [...badan.matchAll(/^\| ([^|\n]+) \| ([^|\n]+) \| ([^|\n]+) \|$/gm)].map((m) => [m[1]!, m[2]!, m[3]!]).filter((r) => r[0] !== "Besaran" && !r[0]!.startsWith("---"));
    const dump = HARI * GB_HARI * RASIO;
    expect(baris).toEqual([
      ["File per hari", `${fmt(asumsi.upload!)} × ${asumsi.fileKB} KB`, `${fmt(GB_HARI)} GB`],
      ["File 28 hari", `${HARI} × ${fmt(GB_HARI)} GB`, `${fmt(FILE_HARI)} GB`],
      ["Posting per hari", `${fmt(POSTING_TAHUN)} ÷ 365`, fmt(POSTING_HARI)],
      ["Posting 28 hari", `${fmt(POSTING_HARI)} × ${HARI} × ${BYTE_POSTING} byte`, `${fmt(POSTING_GB, 2)} GB`],
      ["File lawan posting", `${FILE_HARI} ÷ ${fmt(POSTING_GB, 2)}`, `${fmt(FILE_HARI / POSTING_GB, 1)} kali`],
      ["Bagian file", `${FILE_HARI} ÷ (${FILE_HARI} + ${fmt(POSTING_GB, 2)})`, `${fmt((FILE_HARI / (FILE_HARI + POSTING_GB)) * 100, 1)}%`],
      ["Dump dari file", `${HARI} × ${fmt(RASIO, 1)}`, `${fmt(dump, 1)} GB`],
    ]);
    // rekaman bagian D mencetak hasil yang sama
    expect(bagD).toContain(`file per hari   = 2.000 x 500 KB               = ${fmt(GB_HARI, 2)} GB`);
    expect(bagD).toContain(`file 28 hari    = 28 x ${fmt(GB_HARI, 2)} GB               = ${fmt(FILE_HARI, 2)} GB`);
    expect(bagD).toContain(`posting 28 hari = 43,8 juta / 365 x 28 x 250 B = ${fmt(POSTING_GB, 2)} GB`);
    expect(bagD).toContain(`bagian file di bytea = ${fmt(FILE_HARI, 2)} / (${fmt(FILE_HARI, 2)} + ${fmt(POSTING_GB, 2)}) = ${fmt((FILE_HARI / (FILE_HARI + POSTING_GB)) * 100, 1)}%`);
    expect(bagD).toContain("# Label: Hitungan dari Asumsi naskah (laju unggahan, ukuran file, jumlah posting); bukan hasil lab.");
    expect(POSTING_GB).toBeCloseTo(0.84, 10);
    expect(FILE_HARI / POSTING_GB).toBeCloseTo(33.333, 3);
    expect(dump).toBeCloseTo(30.8, 10);
    expect(barisM33).toContain("±28 GB file lawan ±0,84 GB posting (43,8 juta ÷ 365 × 28 × 250 B; Hitungan, Asumsi)");
    expect(barisM33).toContain("(28 ÷ 28,84 = 97,1%; Hitungan dari Asumsi)");
    harus(`Satuan: ${fmt(asumsi.upload!)} × ${asumsi.fileKB} KB = ${fmt(KB_HARI)} KB = ${fmt(GB_HARI)} GB, dan ${fmt(POSTING_HARI)} × ${HARI} × ${BYTE_POSTING} byte = ${fmt(POSTING_BYTE)} byte = ${fmt(POSTING_GB, 2)} GB.`);
    harus("Bagian file adalah file dibagi jumlah file dan posting. Tabel lain, mis. `outbox` dan `audit_log`, tidak ikut, jadi 97,1% adalah batas atas.");
  });
  test("33,3 kali sama dengan 33 kali di 4.5 (365 ÷ 10,95); 28 hari dan setahun berbanding sama", () => {
    expect(365 / 10.95).toBeCloseTo(FILE_HARI / POSTING_GB, 3);
    expect(hal45).toContain("Itu 33 kali posting ledger (365 ÷ 10,95)");
    harus("Perbandingan setahun di [[t4-skema]], 365 ÷ 10,95, dibulatkan menjadi 33 kali. Perbandingan 28 hari sama, karena file dan posting tumbuh per hari.");
    harus("Registry memakai 2.000 unggahan per hari dan 500 KB per file (Asumsi; 1 KB = 1.000 byte).");
    harus("Foto mulai disimpan di minggu 3, dan naskah memakai 28 hari pada laju penuh (Asumsi).");
    harus("berjumlah 43.800.000 per tahun dan berukuran 250 byte (Asumsi, dari [[t4-skema]]).");
    expect(hal45).toContain("43.800.000 posting, dan 43.800.000 × 250 byte = 10.950.000.000 byte");
    // satu bentuk per angka: '1.000 pendaftar × 2 file' bukan dari registry, jadi halaman ini tidak menyebutnya
    expect(badan).not.toMatch(/1\.000 pendaftar/);
  });
  test("batas 1 MiB di lab: kartu tepat 1 MiB lolos, 1 MiB + 1 byte ditolak 422; 2.000 × 1.048.576 byte = 2,10 GB per hari, sedikit di atas dua kali 1 GB", () => {
    const c = UC.teks(ucC, UC.baris.length - 1);
    expect(c).toContain(`kartu tepat 1 MiB (${fmt(MIB)} byte): HTTP 202`);
    expect(c).toContain("ajukan dengan kartu 1 MiB + 1 byte: HTTP 422");
    expect(c).toContain('"pesan":"paling besar 1 MiB"');
    const gb = (asumsi.upload! * MIB) / 1e9;
    expect(fmt(gb, 2)).toBe("2,10");
    expect(gb / GB_HARI).toBeGreaterThan(2);
    expect(gb / GB_HARI).toBeLessThan(2.2);
    harus(`Server lab menolak file kartu di atas 1 MiB, yaitu ${fmt(MIB)} byte (\`unggah.txt\` bagian C).`);
    harus(`file per hari 2.000 × ${fmt(MIB)} byte = ${fmt(gb, 2)} GB. Itu sedikit di atas dua kali hitungan di atas (Hitungan atas Asumsi).`);
  });
  test("jendela backup harian: 24 jam, 60.000 + 5.000 = 65.000 per hari; PRD v4 tidak menulis batas waktu pulih (bagian 1 naskah, di luar butir ADR 33)", () => {
    const prd = naskah.slice(naskah.indexOf("## 1. PRD v4"), naskah.indexOf("## 2. Dari fitur ke pekerjaan teknis")).split("\n").filter((b) => !b.startsWith("- **ADR 33.**")).join("\n");
    expect(prd.length).toBeGreaterThan(1000);
    expect(prd).not.toMatch(/RPO|RTO|waktu pulih|batas pulih|jendela kehilangan/);
    expect(naskah).toContain("PRD v3 dan PRD v4 tidak menulis batas itu. Backup `pg_dump` harian berjendela sampai 24 jam: ±7.500 transaksi uang di Tahap 3 dan ±65.000 per hari di Tahap 4 (60.000 + 5.000; Hitungan atas Asumsi).");
    expect(TRANSAKSI_HARI + asumsi.upload! / 2 * 5 - 0).toBeGreaterThan(0);
    expect(60000 + 5000).toBe(65000);
    harus("Backup `pg_dump` harian berjendela sampai 24 jam: bila server hilang sebelum backup berikutnya, kejadian sejak backup terakhir ikut hilang.");
    harus("Sehari memuat rata-rata ±65.000 transaksi uang dan top-up, yaitu 60.000 + 5.000 (Hitungan atas Asumsi).");
    harus("**Batas waktu pulih belum ada di PRD.**");
    harus("Berapa lama pulih dianggap wajar tidak ada di PRD v4 ([[t4-prd]]), dan PRD v3 juga tidak menulisnya.");
    harus("Pemicu VPS kedua di [[t3-adr-33]] bergantung pada angka itu, jadi ia tetap pertanyaan terbuka.");
  });
});

describe("sumber luar: baris riset, tanggal akses, tautan, dan kutipan", () => {
  test("lima baris riset ada, urut ID tanpa ganda; tanggal akses sama dengan tanggal di halaman", () => {
    const semua = riset.split("\n").filter((b) => b.startsWith("| R4-")).map((b) => b.split(" |")[0]!.replace("| ", ""));
    expect(new Set(semua).size).toBe(semua.length);
    const nomor = (s: string) => Number(s.slice(3));
    expect(semua.map(nomor)).toEqual([...semua.map(nomor)].sort((a, b) => a - b));
    for (const id of IDS) expect(semua).toContain(id);
    const tgl = [...new Set([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]!))];
    expect(tgl).toEqual(["2026-10-29"]);
    for (const id of ["R4-175", "R4-176", "R4-177"]) expect(barisRiset(id), id).toContain(`dibuka ${tgl[0]}`);
    expect(barisRiset("R4-175")).toContain(`datatype-binary.html, dibuka ${tgl[0]})`);
    expect(barisRiset("R4-176")).toContain(`app-pgdump.html, dibuka ${tgl[0]}; navigasi halaman menulis 17.11)`);
    expect(barisRiset("R4-177")).toContain(`wiki.postgresql.org/wiki/BinaryFilesInDB, "last edited on 5 May 2021", dibuka ${tgl[0]}`);
    expect(new Date(tgl[0]!).getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
    expect(sidikRiset()).toEqual(SIDIK.riset);
  });
  test("tiga tautan eksternal sama dengan URL di baris riset; tiap tautan berteks deskriptif; diedit 2021-05-05 sama dengan 5 May 2021", () => {
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    expect(tautan).toEqual([
      ["wiki PostgreSQL: BinaryFilesInDB", "https://wiki.postgresql.org/wiki/BinaryFilesInDB"],
      ["PostgreSQL 17: pg_dump", "https://www.postgresql.org/docs/17/app-pgdump.html"],
      ["PostgreSQL 17, bagian 8.4", "https://www.postgresql.org/docs/17/datatype-binary.html"],
    ]);
    expect(barisRiset("R4-177")).toContain("wiki.postgresql.org/wiki/BinaryFilesInDB");
    expect(barisRiset("R4-176")).toContain("postgresql.org/docs/17/app-pgdump.html");
    expect(barisRiset("R4-175")).toContain("postgresql.org/docs/17/datatype-binary.html");
    expect(badan.match(/https?:\/\//g)).toHaveLength(3);
    harus("diedit 2021-05-05, dibuka 2026-10-29, Tidak dijalankan)");
  });
  test("R4-177 (wiki): kutipan yang menopang kalimat halaman; kelebihan dan kekurangan tidak dibalik; tidak ada angka dari wiki", () => {
    const b = barisRiset("R4-177");
    expect(b).toContain('"Pluses overall"');
    expect(b).toContain('"ACID"');
    expect(b).toContain('"Backups are easier there is no need to track external files"');
    expect(b).toContain('"Minuses overall"');
    expect(b).toContain('"Backups can take significantly longer"');
    expect(b).toContain("tanpa angka dan tanpa metode");
    harus("Wiki PostgreSQL mencantumkan ACID dan backup yang lebih mudah sebagai kelebihan menyimpan file di database. Kekurangannya: \"Backups can take significantly longer\" (");
    expect(badan.match(/Backups can take significantly longer/g)).toHaveLength(1);
    expect(badan).not.toMatch(/wiki[^.\n]{0,60}(menjamin|membuktikan|mengukur)/i);
  });
  test("R4-176 (pg_dump 17): format custom terkompresi bawaan; R4-175 (8.4.1): hex dua digit per byte, dan dokumentasi pg_dump tidak membahas bytea", () => {
    const a = barisRiset("R4-176");
    expect(a).toContain('"is also compressed by default"');
    expect(a).toContain("the default is to compress using gzip at a moderate level");
    expect(a).toContain("Halaman tidak membahas `bytea`");
    const c = barisRiset("R4-175");
    expect(c).toContain("encodes binary data as 2 hexadecimal digits per byte");
    expect(c).toContain("the default is hex");
    expect(c).toContain("tidak membahas `bytea`");
    harus("Dokumentasi PostgreSQL menulis bahwa format hex menyimpan 2 digit heksadesimal per byte `bytea` (");
    expect(badan).not.toMatch(/pg_dump[^.\n]{0,40}(mengatur|memakai) `?bytea_output/);
  });
  test("R4-178 dan R4-179: rekaman, kode, dan hitungan tercatat; turunan hitungan memuat angka yang sama dengan halaman", () => {
    const r = barisRiset("R4-178");
    for (const k of ["`labs/t4-storage/output/ukuran.txt` bagian A", "`unggah.txt` bagian C", "`labs/api-t4/internal/objek/bytea.go`", "`AjukanVerifikasi` memanggil `Simpan` sebelum `DalamTx`", "SeaweedFS 4.51"]) expect(r).toContain(k);
    const h = barisRiset("R4-179");
    for (const k of ["28 × 1 = 28 GB", "120.000 × 28 × 250 = 840.000.000 byte = 0,84 GB", "28 ÷ 0,84 = 33,33", "28 ÷ 28,84 = 97,09%", "28 × 1,1 = 30,8 GB", "2.000 × 1.048.576 = 2.097.152.000 byte = 2,10 GB per hari", "60.000 + 5.000 = 65.000"]) expect(h).toContain(k);
    expect(220 / 12).toBeCloseTo(18.33, 2);
    expect(h).toContain("220 ÷ 12 = 18,3 kali");
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: file di bytea (16 file, dump 1,1 kali, pulih sama) dan file di penyimpanan objek (16 objek, dump di bawah 0,01 kali)", () => {
    expect(diagram.id).toBe("t4-m33-file-di-bytea");
    expect(diagram.judul).toBe("File di kolom bytea membesarkan dump; file di penyimpanan objek tidak");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-storage · ukuran.txt bagian A, B, dan C" });
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([["File di kolom bytea", "8 pengajuan, 16 file", 3], ["File di penyimpanan objek", "8 pengajuan, 16 file", 2]]);
    const [a, b] = diagram.baris;
    expect(a!.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      ["16 file, 8.000.000 byte", "di tabel berkas_bytea", "biasa"], [`Dump ${fmt(RASIO, 1)} kali ukuran file`, "format custom, terkompresi", "warn"], ["Pulih: isi sama", "md5 tiap baris cocok", "good"],
    ]);
    expect(b!.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      ["16 objek, 8.000.000 byte", "di luar database", "biasa"], ["Dump di bawah 0,01 kali ukuran file", "database memegang kunci dan checksum", "good"],
    ]);
    expect(bagA).toMatch(/ 16 +\| 8000000\n/);
    expect(bagB).toContain("isi tiap baris sesudah pulih sama dengan sebelum dump (md5 per baris");
    expect(bagC).toContain("Di penyimpanan objek: 16 objek, 8.000.000 byte");
    expect(bagC).toContain("rasio dump/file di bawah 0,01: ya");
    expect(diagram.catatan).toBe("Dua run dari database bersih. Isi file karangan 500.000 byte (Ilustrasi), dan waktu dump dan pulih tidak direkam.");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai ringkas di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(badan).toContain("<Rantai data={fileDiBytea} ringkas />");
    expect(badan).toContain('import fileDiBytea from "../../../../data/diagram/t4-m33-file-di-bytea.json";');
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.indexOf("<Rantai")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
    // Inti: kalimat sebelum Rantai, paling banyak ±150 karakter, dan simpul terbaca tanpa sub
    const inti = cocok(badan, /<Blok nama="Yang sebenarnya">\n\n([^\n]+)\n\n<Rantai/)[1]!;
    expect(inti.length).toBeLessThanOrEqual(150);
    for (const baris of diagram.baris) for (const s of baris.simpul) expect(s.teks.length).toBeLessThanOrEqual(36);
  });
});

describe("skenario alur t4-m33.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; lima komponen, tanpa perangkat; lima langkah dan empat langkah varian", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-storage/output/ukuran.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["api", "api-t4"], ["db", "PostgreSQL"], ["dump", "pg_dump"], ["pulih", "Database pulih"], ["objek", "Penyimpanan objek (SeaweedFS)"]]);
    expect(skenario.perangkat).toBeUndefined();
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(4);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("file di penyimpanan objek, bukan di kolom bytea");
    harus("**Ubah satu hal: file di penyimpanan objek, bukan di kolom bytea**");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m33.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-storage run BAGIAN=ukuran");
    expect(readme).toContain("make -C labs/t4-storage run BAGIAN=presign   # satu bagian: ukuran presign unggah unduh retensi testing");
    expect(skenario.sumber.catatan).toContain("Waktu dump dan pulih tidak direkam. Lab tidak punya app Flutter dan tidak merekam layar.");
    expect(skenario.sumber.catatan).toContain("Isi file karangan (Ilustrasi)");
    expect(skenario.sumber.catatan).toContain("Delapan pengajuan, dua file 500.000 byte tiap pengajuan.");
  });
  test("tebakan: empat pilihan, jawaban benar (sedikit di atas satu kali) di posisi kedua, bukan yang terpanjang atau terpendek; distraktor dua kali dan nol dan setengah; penjelasan dari rekaman", () => {
    const o = skenario.predict.options;
    expect(o).toHaveLength(4);
    expect(skenario.predict.answer).toBe(1);
    expect(skenario.predict.varian).toBe(false);
    expect([0, 3]).not.toContain(skenario.predict.answer);
    expect(o[skenario.predict.answer]).toBe("Sedikit di atas satu kali: dump membawa semua byte file hampir tanpa kompresi");
    const panjang = o.map((x) => x.length);
    expect(Math.max(...panjang)).not.toBe(panjang[skenario.predict.answer]);
    expect(Math.min(...panjang)).not.toBe(panjang[skenario.predict.answer]);
    expect(o.filter((_, i) => i !== skenario.predict.answer)).toEqual([
      "Hampir nol: dump hanya menyimpan struktur tabel dan beberapa baris kecil",
      "Sekitar setengah: kompresi bawaan mengecilkan file hampir separuhnya, seperti file teks",
      "Sekitar dua kali: tiap byte file ditulis sebagai dua karakter di dalam dump",
    ]);
    expect(skenario.predict.q).toBe("Delapan pengajuan menyimpan 16 file, 8.000.000 byte, di kolom bytea. Lab mengukur dump terkompresi (pg_dump -Fc) sebelum pengajuan pertama dan sesudah 2, 4, dan 8 pengajuan. Berapa kali ukuran file yang ditambahkan ke dump?");
    expect(skenario.predict.explain).toBe("Rekaman ukuran.txt bagian A: rasio dump terhadap file 1,1 pada 2, 4, dan 8 pengajuan. pg_dump menulis bytea sebagai teks heksadesimal lalu memampatkannya, dan byte acak tidak bisa dimampatkan lebih jauh. Dump teks biasa atas tabel itu 2,0 kali ukuran file.");
    expect(skenario.predict.explain).toContain(`rasio dump terhadap file ${fmt(RASIO, 1)}`);
    expect(skenario.predict.explain).toContain(`${fmt(RASIO_TEKS, 1)} kali ukuran file`);
    expect(skenario.predict.q).not.toMatch(/1,1|2,0|di atas satu/);
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
  });
  test("baris perintah dan keluaran di kirim ada utuh di ukuran.txt: jalur utama dari bagian A, B, atau D; varian dari bagian C", () => {
    const utama: [number, string][] = skenario.langkah.map((l, i) => [i, l.kirim]);
    const bagianUtama = [bagA, bagA, bagA, bagB, bagD];
    for (const [i, k] of utama) for (const b of k.split("\n")) expect(bagianUtama[i]!.includes(b), `langkah ${i + 1} bukan dari bagiannya: ${b}`).toBe(true);
    for (const l of skenario.varian.langkah) for (const b of l.kirim.split("\n")) {
      expect(ukuran.includes(b), `kirim varian tidak ada di ukuran.txt: ${b}`).toBe(true);
      expect(bagC.includes(b), `bukan bagian C: ${b}`).toBe(true);
    }
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) expect(l.kirim.split("\n").filter((b) => b.startsWith("→"))).toEqual([]);
    expect(skenario.langkah[0]!.kirim).toBe(U.teks(uA + 1, uA + 6));
  });
  test("arah, nada, judul, dan penjelasan tiap langkah mengikuti rekaman; jalur varian tidak membuka jawaban jalur utama", () => {
    const arah = (l: Langkah): string => `${l.dari}>${l.ke ?? ""}`;
    expect(skenario.langkah.map(arah)).toEqual(["api>db", "db>dump", "dump>", "dump>pulih", "dump>"]);
    expect(skenario.varian.langkah.map(arah)).toEqual(["api>objek", "api>db", "db>dump", "dump>"]);
    expect(skenario.langkah.map((l) => l.nada)).toEqual([undefined, "warn", "warn", undefined, "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual([undefined, undefined, "good", "warn"]);
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Delapan pengajuan menyimpan 16 file di kolom bytea", `Dump terkompresi membesar ${fmt(RASIO, 1)} kali ukuran file`, `Dump teks biasa ${fmt(RASIO_TEKS, 1)} kali ukuran file`,
      "Dump dipulihkan ke database lain, isinya sama", "Dalam 28 hari file 97,1% dari file dan posting",
    ]);
    expect(skenario.varian.langkah.map((l) => l.judul)).toEqual([
      "File dikirim ke penyimpanan objek", "Database hanya memegang kunci dan checksum", "Dump hampir tidak membesar", "Dump tidak membawa file",
    ]);
    expect(skenario.langkah[3]!.jelas).toContain("hanya batas 120 detik untuk 8 MB yang diperiksa");
    expect(skenario.langkah[4]!.jelas).toBe("Bagian D rekaman mencetak hitungan dari Asumsi naskah, bukan hasil lab: 1 GB file per hari, 28 GB dalam 28 hari, 0,84 GB posting, dan file 97,1% dari file dan posting bersama.");
    expect(bagD).toContain("bagian file di bytea = 28,00 / (28,00 + 0,84) = 97,1%");
    const v = JSON.stringify(skenario.varian.langkah);
    expect(v).not.toMatch(/1,1|2,0 kali|Tebakanmu|benar|salah/);
    expect(JSON.stringify(skenario.langkah)).not.toMatch(/di bawah 0,01|penyimpanan objek yang berjalan/);
  });
  test("skenario dikunci dengan sidik jari (setiap nilai string)", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
  test("tanpa JavaScript: noscript memuat hasil jalur utama dan varian dengan angka yang sama dengan rekaman; tombol tanpa fungsi tidak ditampilkan", () => {
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain(`dump terkompresi ${fmt(RASIO, 1)} kali ukuran file pada 2, 4, dan 8 pengajuan, dan dump teks ${fmt(RASIO_TEKS, 1)} kali.`);
    expect(ns).toContain("Pemulihan ke database lain mengembalikan 16 baris dan 8.000.000 byte yang sama.");
    expect(ns).toContain("Bila file ada di penyimpanan objek, dump di bawah 0,01 kali ukuran file. Rekaman bagian C ada di cuplikan pada blok sebelumnya.");
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("<WidgetLama"));
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<button/g)).toBeNull();
  });
});

describe("halaman istilah dan glosarium: Backup dan uji pulih", () => {
  test("file valid menurut skema, dikunci sidik jari, dan baris glosarium menaut ke t4-m33", () => {
    expect(istilah.istilah).toBe("Backup dan uji pulih");
    expect(sidik(JSON.stringify(JSON.parse(istilahMentah)))).toBe(SIDIK.istilah);
    expect(glosMdx).toContain("| **Backup dan uji pulih** | Salinan isi database dalam satu file, dan pemulihannya ke database lain untuk membuktikan salinan itu bisa dipakai. | [[t4-m33]] |");
    expect(glosMdx).toMatch(/\| \*\*Backoff\*\* [^\n]*\n\| \*\*Backup dan uji pulih\*\* [^\n]*\n\| \*\*BFF\*\* /);
    expect(istilah.terkait).toEqual(["Staging", "Object storage"]);
    for (const t of istilah.terkait!) expect(glosMdx).toContain(`| **${t}** |`);
    expect(istilah.cerita!.map((c) => c.rujukan)).toEqual(["t3-tim-infra", "t4-m33"]);
    for (const c of istilah.cerita!) expect(hal.some((h) => h.id === c.rujukan && h.ada), c.rujukan).toBe(true);
  });
  test("sumber istilah: ID riset ada, URL sama dengan baris riset, rekaman ada; teks istilah memuat angka yang sama dengan halaman", () => {
    for (const s of istilah.sumber!) {
      expect(IDS).toContain(s.riset);
      if ("url" in s) expect(barisRiset(s.riset!)).toContain(s.url.replace("https://", "").replace(/^www\./, ""));
      else expect(fs.existsSync(path.join(akar, s.rekaman))).toBe(true);
    }
    expect(istilah.sumber!.map((s) => s.riset)).toEqual(["R4-176", "R4-178"]);
    expect(istilah.cerita![1]!.teks).toContain(`dump ${fmt(RASIO, 1)} kali ukuran file`);
    expect(istilah.mekanisme!.join(" ")).toContain("batas 120 detik untuk 8 MB");
    expect(istilah.jebakan![1]).toContain("file 97,1% dari file dan posting");
    expect(JSON.stringify(istilah)).not.toMatch(/R\d-\d{2,3}[^"]*"[^"]*$|keputusan \d/);
  });
});

describe("kartu Cek diri: tiga kartu, sama dengan kartu.json", () => {
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya; id, judul, url", () => {
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(3);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(3);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m33");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m33-1", "t4-m33-2", "t4-m33-3"]);
    expect(kartu.every((k) => k.judul === "4.14 M33: Uji pulih mingguan makin lama" && k.url === "tahap-4/m33-uji-pulih/")).toBe(true);
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    expect(kartu.map((k) => k.jawab)).toEqual(jawaban);
  });
  test("jawaban kartu menurunkan klaimnya: 28 GB lawan 0,84 GB dan 97,1%, rasio 1,1, byte acak dan heksadesimal, cadangan file tidak dijalankan", () => {
    harus(`Dalam 28 hari ada ${fmt(FILE_HARI)} GB file lawan ${fmt(POSTING_GB, 2)} GB posting, jadi file ${fmt((FILE_HARI / (FILE_HARI + POSTING_GB)) * 100, 1)}% dari file dan posting (Hitungan atas Asumsi).`);
    harus(`Rekaman memberi rasio dump terhadap file ${fmt(RASIO, 1)} (\`ukuran.txt\` bagian A).`);
    harus(`**2.** Dump \`-Fc\` terkompresi, tetapi rasionya terhadap file ${fmt(RASIO, 1)}, bukan di bawah 1.`);
    harus("Isi file di lab adalah byte acak, yang tidak bisa dimampatkan, dan `bytea` ditulis sebagai heksadesimal (`ukuran.txt` bagian A).");
    harus("Pencadangan penyimpanan objek Tidak dijalankan di lab (`ukuran.txt` bagian C).");
    expect(bagC).toContain("pencadangan SeaweedFS Tidak dijalankan di lab ini");
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
  test("front matter dikunci: title dan description (memuat 12 menit, 3 jam 40 menit, dan bytea)", () => {
    expect(frontmatter.trim().split("\n")).toEqual([
      'title: "4.14 M33: Uji pulih mingguan makin lama"',
      "description: Minggu 7. Uji pulih mingguan di staging naik dari 12 menit ke 3 jam 40 menit. Foto kartu identitas dan swafoto disimpan di kolom bytea, jadi tiap backup dan tiap pemulihan ikut mengangkut file.",
    ]);
  });
  test("jumlah elemen: lima Blok, satu Rantai, empat Snippet, satu WidgetLama, satu noscript, satu tabel, satu details tebakan, tiga Cek diri, enam impor", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(4);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/^\| --- \| --- \| --- \|$/gm)).toHaveLength(1);
    expect(badan.match(/^import /gm)).toHaveLength(6);
    expect(badan.match(/<details/g)).toHaveLength(4);
  });
  test("istilah diberi arti di pemakaian pertama di luar adegan: backup, uji pulih, bytea, dump, restore, posting, Hitungan, object storage; urutannya benar", () => {
    const pos = (s: string) => badan.indexOf(s);
    const raka = pos('<Blok nama="Yang Raka kira"'), nyata = pos('<Blok nama="Yang sebenarnya">');
    expect(pos("Uji pulih mengambil backup, yaitu salinan isi database dalam satu file, lalu memulihkannya ke database lain untuk membuktikan salinan itu bisa dipakai.")).toBeGreaterThan(raka);
    expect(pos("`bytea`, tipe PostgreSQL untuk byte mentah")).toBeGreaterThan(raka);
    expect(pos("dump, yaitu file backup yang ditulis `pg_dump`")).toBeGreaterThan(raka);
    expect(pos("Dump adalah keluaran `pg_dump`: isi database yang ditulis ke satu file. Restore menulis isi dump itu kembali ke database lain dengan `pg_restore`.")).toBeGreaterThan(nyata);
    expect(pos("Posting, yaitu baris catatan uang di ledger")).toBeGreaterThan(pos("**Dalam 28 hari"));
    expect(pos("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, berlabel sama dengan masukan terlemahnya, di sini Asumsi.")).toBeLessThan(pos("| Besaran |"));
    expect(pos("Object storage adalah layanan yang menyimpan file per objek dan melayaninya lewat HTTP.")).toBeLessThan(pos("labs/t4-storage/output/ukuran.txt\" lines=\"" + `${uCAwal}`));
    // kata 'Hitungan' pertama di luar adegan dan di luar tebakan diberi arti sebelum tabel; 'restore' hanya sesudah artinya
    expect(badan.indexOf("Hitungan")).toBeGreaterThan(raka);
    expect(badan.indexOf("restore")).toBeGreaterThan(nyata);
    expect(badan.indexOf("Restore")).toBeGreaterThan(nyata);
    expect(glosMdx).toContain("| **Object storage** | Layanan penyimpanan file besar per objek, diakses lewat HTTP, mis. layanan kompatibel S3. |");
  });
});

// ---- penutup mutan yang lolos tanpa kunci baris: kalimat diturunkan dari rekaman, kode, naskah, dan registry ----------------
describe("tanpa kunci baris: angka, nama, dan versi yang dipakai kalimat diturunkan dari sumber", () => {
  test("angka cerita dan hitungan di prosa sama dengan sumbernya", () => {
    harus(`Minggu 7 Tahap 4.`);
    expect(Number(cocok(barisM33, /^\| M33 \| (\d+) \|/)[1])).toBe(7);
    expect(Number(cocok(badan, /^Minggu (\d+) Tahap 4\./m)[1])).toBe(7);
    expect(Number(cocok(badan, /Raka memilih `bytea` di minggu (\d+) karena/)[1])).toBe(3);
    expect(barisM33).toContain("(pilihan minggu 3)");
    expect(Number(cocok(badan, /Foto mulai disimpan di minggu (\d+),/)[1])).toBe(3);
    expect(Number(cocok(badan, /naskah memakai (\d+) hari pada laju penuh/)[1])).toBe(HARI);
    expect(Number(cocok(badan, /Registry memakai ([\d.]+) unggahan per hari dan (\d+) KB per file/)[2])).toBe(asumsi.fileKB);
    expect(angka(cocok(badan, /Registry memakai ([\d.]+) unggahan per hari/)[1]!)).toBe(asumsi.upload);
    expect(angka(cocok(badan, /berjumlah ([\d.]+) per tahun dan berukuran (\d+) byte/)[1]!)).toBe(POSTING_TAHUN);
    expect(Number(cocok(badan, /berjumlah ([\d.]+) per tahun dan berukuran (\d+) byte/)[2])).toBe(BYTE_POSTING);
    expect(Number(cocok(badan, /Delapan pengajuan menyimpan (\d+) file, ([\d.]+) byte\./)[1])).toBe(16);
    expect(angka(cocok(badan, /Delapan pengajuan menyimpan (\d+) file, ([\d.]+) byte\./)[2]!)).toBe(8 * 2 * 500000);
    expect(angka(cocok(badan, /Tiap pengajuan membawa dua file ([\d.]+) byte/)[1]!)).toBe(500000);
    expect(angka(cocok(badan, /batas (\d+) detik untuk (\d+) MB/)[1]!)).toBe(120);
    expect(Number(cocok(badan, /batas (\d+) detik untuk (\d+) MB/)[2])).toBe(8);
    expect(Number(cocok(badan, /berjendela sampai (\d+) jam/)[1])).toBe(24);
    expect(cocok(badan, /SeaweedFS ([\d.]+) untuk baris kedua/)[1]).toBe(cocok(readme, /SeaweedFS \| ([\d.]+) \(Apache-2\.0\)/)[1]);
    expect(cocok(badan, /PostgreSQL ([\d.]+), go([\d.]+),/).slice(1, 3)).toEqual(cocok(ukuran, /PostgreSQL ([\d.]+) \(Debian[^·]*· go([\d.]+) ·/).slice(1, 3));
  });
  test("nama berkas dan bagian rekaman yang disebut ada: ukuran.txt bagian A sampai D, unggah.txt bagian C", () => {
    const disebut = [...badan.matchAll(/`(ukuran|unggah)\.txt` bagian ([A-D])/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(new Set(disebut)).toEqual(new Set(["ukuran:A", "ukuran:C", "unggah:C"]));
    expect(ukuran).toContain("# --- A. ");
    expect(ukuran).toContain("# --- C. ");
    expect(unggah).toContain("# --- C. Ukuran diperiksa sesudah unggah");
    expect([...badan.matchAll(/Bagian D `ukuran\.txt`/g)]).toHaveLength(1);
    expect(ukuran).toContain("# --- D. Hitungan 28 hari");
    expect([...badan.matchAll(/Rekaman lab `ukuran\.txt` bagian A/g)]).toHaveLength(1);
  });
  test("label sumber: Hitungan hanya atas Asumsi (atau Ilustrasi), tidak ada Rekaman lab di dekat hasil rumus, dan 'Tidak dijalankan' menempel pada sumber luar dan bacaan kode", () => {
    expect(badan).not.toMatch(/Hitungan atas Rekaman/);
    for (const m of badan.matchAll(/\(Hitungan[^)]*\)/g)) expect(m[0], m[0]).toMatch(/^\(Hitungan atas Asumsi\)$/);
    for (const m of badan.matchAll(/\]\(https?:\/\/[^)]+\)/g)) expect(m[0], m[0]).toMatch(/dibuka 2026-10-29, Tidak dijalankan\)|\)$/);
    for (const m of badan.matchAll(/, dibuka 2026-10-29[^)]*\)/g)) expect(m[0]).toContain("Tidak dijalankan");
    expect(badan.match(/Tidak dijalankan: dibaca dari kode/g)).toHaveLength(1);
    const ilustrasi = badan.split("\n").flatMap((b) => b.split(/(?<=[.!?])\s+(?=[A-Z*"(`])/)).filter((k) => k.includes("(Ilustrasi)"));
    expect(ilustrasi).toHaveLength(4);
    expect(ilustrasi[0]).toMatch(/^\*Angka cerita \(Ilustrasi\):\* /);
    expect(ilustrasi[1]).toContain("berisi tanda tangan PNG lalu byte acak (Ilustrasi)");
    expect(ilustrasi[2]).toContain("yang hanya diukur sampai 8 MB pada file karangan (Ilustrasi)");
    expect(ilustrasi[3]).toContain("rasio foto nyata tidak diukur (Ilustrasi)");
  });
  test("kata universal dan negatif di prosa dicari kasus tandingannya: 'tiap', 'semua', 'tidak ada' berlingkup", () => {
    // 'semua' dan 'tiap' dipakai pada: tiap minggu (jadwal ADR 32), tiap backup dan tiap uji pulih (kalimat Inti), semua byte file (rekaman A), semua file sebesar batas (pengandaian)
    const kalimat = badan.split("\n").flatMap((b) => b.split(/(?<=[.!?])\s+(?=[A-Z*"(`])/));
    const universal = kalimat.filter((k) => /\b(semua|setiap|selalu|tidak satu pun|seluruh)\b/i.test(k)).map((k) => k.trim());
    expect(universal).toEqual([
      "Semua baris adalah Hitungan atas Asumsi.",
      "Bila semua file sebesar batas itu, file per hari 2.000 × 1.048.576 byte = 2,10 GB.",
    ]);
    // 'tidak ada' hanya sebagai jawaban atas PRD, dan 'tidak' untuk ukuran/waktu/pencadangan berlingkup lab t4-storage
    expect(badan.match(/\btidak ada\b/g)).toHaveLength(1);
    harus("Berapa lama pulih dianggap wajar tidak ada di PRD v4");
    const negatif = badan.split("\n").flatMap((b) => b.split(/(?<=[.!?])\s+(?=[A-Z*"(`])/)).filter((k) => /tidak (diukur|direkam|terukur)/.test(k));
    expect(negatif).toHaveLength(4);
    expect(negatif.filter((k) => k.includes("foto nyata"))).toHaveLength(3);
    expect(negatif.filter((k) => k.includes("waktunya tidak terukur"))).toHaveLength(1);
    expect(runLab).not.toMatch(/waktu_dump|lama_dump|detik_dump/);
  });
});

describe("baris riset: angka dan versi diturunkan dari rekaman, registry, naskah, dan hitungan (tanpa sidik)", () => {
  const r178 = (): string => barisRiset("R4-178");
  const r179 = (): string => barisRiset("R4-179");
  test("R4-178: rasio, jumlah, batas, versi, dan bagian rekaman sama dengan ukuran.txt, unggah.txt, README, dan kepala rekaman", () => {
    const r = r178();
    expect(r).toContain(`rasio dump terhadap file ${fmt(RASIO, 1)} pada 2, 4, dan 8 pengajuan; dump teks ${fmt(RASIO_TEKS, 1)}`);
    expect(r).toContain("pulih ke database lain: 16 baris, 8.000.000 byte, md5 tiap baris sama; waktu tidak direkam, batas 120 detik untuk 8 MB");
    expect(r).toContain("rasio di bawah 0,01; kunci paling pendek 48 dan checksum 64 karakter");
    expect(r).toContain("`unggah.txt` bagian C (1 MiB diterima, 1 MiB + 1 byte ditolak 422)");
    expect(r).toContain("(hitungan 28 hari)");
    const versi = cocok(ukuran, /# PostgreSQL ([\d.]+) \(Debian[^·]*· go([\d.]+) ·/);
    expect(r).toContain(`PostgreSQL ${versi[1]}, go${versi[2]}, SeaweedFS ${cocok(readme, /SeaweedFS \| ([\d.]+) \(Apache-2\.0\)/)[1]}`);
    expect(bagB).toContain("dalam 120 detik");
    expect(bagC).toMatch(/ 8 +\| 48 +\| 64\n/);
    expect(cocok(UC.teks(ucC, UC.baris.length - 1), /HTTP (\d+)\nbadan: [^\n]*"status":(\d+)/).slice(1, 3)).toEqual(["422", "422"]);
    expect(r).toContain("bagian \"Selisih dengan naskah\" butir 6 dan 7");
    expect(readme).toContain("6. **Angka M33 yang tidak direproduksi lab.**");
    expect(readme).toContain("7. **\"Ikut transaction\".**");
  });
  test("R4-179: setiap hasil hitungan dihitung ulang dari registry, naskah, dan rasio rekaman, dan sama dengan baris riset", () => {
    const h = r179();
    const gb2 = fmt(POSTING_GB, 2), pbyte = fmt(POSTING_BYTE);
    expect(h).toContain(`(upload ${fmt(asumsi.upload!)} per hari, fileKB ${asumsi.fileKB})`.replace(/\./g, "."));
    expect(h).toContain(`${fmt(POSTING_TAHUN)} posting per tahun = ${fmt(TRANSAKSI_HARI)} × 2 × 365`);
    expect(h).toContain(`${BYTE_POSTING} byte per posting; ${HARI} hari pada laju penuh; ${fmt(TRANSAKSI_HARI)} transaksi uang + 5.000 top-up per hari`);
    expect(h).toContain(`file per hari ${fmt(asumsi.upload!)} × ${asumsi.fileKB} KB = ${fmt(KB_HARI)} KB = ${fmt(GB_HARI)} GB`);
    expect(h).toContain(`${HARI} × ${fmt(GB_HARI)} = ${fmt(FILE_HARI)} GB`);
    expect(h).toContain(`posting per hari ${fmt(POSTING_TAHUN)} ÷ 365 = ${fmt(POSTING_HARI)}`);
    expect(h).toContain(`${fmt(POSTING_HARI)} × ${HARI} × ${BYTE_POSTING} = ${pbyte} byte = ${gb2} GB`);
    expect(h).toContain(`${FILE_HARI} ÷ ${gb2} = ${fmt(FILE_HARI / POSTING_GB, 2)}`);
    expect(h).toContain(`${FILE_HARI} ÷ ${fmt(FILE_HARI + POSTING_GB, 2)} = ${fmt((FILE_HARI / (FILE_HARI + POSTING_GB)) * 100, 2)}%`);
    expect(h).toContain(`${HARI} × ${fmt(RASIO, 1)} = ${fmt(HARI * GB_HARI * RASIO, 1)} GB`);
    expect(h).toContain(`${fmt(asumsi.upload!)} × ${fmt(MIB)} = ${fmt(asumsi.upload! * MIB)} byte = ${fmt((asumsi.upload! * MIB) / 1e9, 2)} GB per hari`);
    expect(h).toContain(`${fmt((asumsi.upload! * MIB) / 1e9 / GB_HARI, 2)} kali`);
    expect(h).toContain(`60.000 + 5.000 = ${fmt(60000 + 5000)}`);
    expect(h).toContain(`220 ÷ 12 = ${fmt(220 / MENIT_LAMA, 1)} kali`);
    expect(h).toContain(`file dalam tiga minggu naik ±${fmt(FILE_HARI / (FILE_HARI - 21 * GB_HARI), 0)} kali bila ${fmt(FILE_HARI)} GB sekarang dan ±${fmt(FILE_HARI - 21 * GB_HARI)} GB tiga minggu lalu`);
    expect(220).toBe(3 * 60 + 40);
    expect(JAM_BARU[1]).toBe("3");
  });
  test("R4-175, R4-176, R4-177: tanggal akses, versi, bagian dokumen, dan tahun wiki sama dengan halaman dan tidak lebih kuat dari sumber", () => {
    expect(barisRiset("R4-175")).toContain("PostgreSQL 17, bagian 8.4.1 bytea Hex Format");
    expect(barisRiset("R4-175")).toContain("rasio 2,0, batas diperiksa 1,95 sampai 2,10");
    expect(runLab).toContain("harap(1.95 <= rasio_teks <= 2.10, True,");
    expect(barisRiset("R4-176")).toContain("PostgreSQL 17 docs, pg_dump");
    expect(barisRiset("R4-176")).toContain(`navigasi halaman menulis ${cocok(ukuran, /# PostgreSQL ([\d.]+) \(Debian/)[1]}`);
    expect(barisRiset("R4-177")).toContain("PostgreSQL wiki, \"BinaryFilesInDB\"");
    expect(barisRiset("R4-177")).toContain("sumber tingkat 3 sampai 4");
    expect(barisRiset("R4-175")).toContain("Berubah".slice(0, 0) + "Tidak berubah |");
    for (const id of IDS) expect(barisRiset(id).split(" | ")).toHaveLength(5);
    expect(IDS.map((id) => Number(id.slice(3)))).toEqual([175, 176, 177, 178, 179]);
  });
});

describe("tanpa kunci baris: kalimat tambahan, jawaban skenario, dan isi istilah diturunkan dari sumber", () => {
  const bagianFile = (FILE_HARI / (FILE_HARI + POSTING_GB)) * 100;
  test("judul bagian Hitungan, kalimat batas rata-rata, kalimat Coba sendiri, dan butir Konsep yang lahir memuat angka dari hitungan dan halaman tetangga", () => {
    harus(`**Dalam ${HARI} hari, file ${fmt(bagianFile, 1)}% dari file dan posting.**`);
    harus(`Rata-rata ${asumsi.fileKB} KB adalah Asumsi.`);
    harus("Dump hampir tidak membesar, tetapi file perlu cadangan sendiri (`ukuran.txt` bagian C). Lab tidak punya app Flutter dan tidak merekam layar.");
    const t = cocok(hal45, /Itu 33 kali posting ledger \((\d+) ÷ ([\d,]+)\)/);
    harus(`- [[t4-skema]]: file ${t[1]} GB per tahun lawan posting ${t[2]} GB, sekitar ${Math.round(Number(t[1]) / angka(t[2]!))} kali.`);
    expect(angka(t[1]!) / angka(t[2]!)).toBeCloseTo(FILE_HARI / POSTING_GB, 3);
    expect(asumsi.upload! * asumsi.fileKB! * 365).toBe(365000000);
    harus("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
    for (const label of ["Rekaman lab", "Ilustrasi", "Asumsi", "Tidak dijalankan"]) expect(cara, label).toContain(label);
    harus("Dump yang kecil tidak berarti file lepas dari tanggung jawab backup.");
    harus("File bukan data transaksi: database menyimpan kunci dan checksum, dan file hidup di tempat lain.");
    expect(naskah).toContain("File bukan data transaksi: database menyimpan kunci, bukan isi");
  });
  test("penjelasan langkah skenario memuat rasio dan jumlah dari rekaman, dan judul skenario sama", () => {
    expect(skenario.judul).toBe("File identitas di kolom bytea: dump makin besar, dan pemulihan ikut");
    expect(skenario.langkah[0]!.jelas).toBe("Tiap pengajuan membawa dua file 500.000 byte. Delapan pengajuan menyimpan 16 baris dan 8.000.000 byte di satu tabel, di database yang sama dengan data transaksi.");
    expect(skenario.langkah[1]!.jelas).toBe(`Lab menghitung selisih ukuran dump terhadap dump sebelum pengajuan pertama, dibagi byte isi file. Rasionya tetap ${fmt(RASIO, 1)} pada 2, 4, dan 8 pengajuan: dump membesar sebanding dengan file.`);
    expect(skenario.langkah[2]!.jelas).toBe("bytea ditulis sebagai heksadesimal, dua karakter per byte. Format custom memampatkan teks itu, tetapi byte acak tidak bisa dimampatkan lebih jauh.");
    expect(skenario.langkah[3]!.jelas).toBe("Sesudah pulih ada 16 baris dan 8.000.000 byte, dan isi tiap baris sama dengan sebelum dump. Waktu tidak direkam karena bergantung mesin; hanya batas 120 detik untuk 8 MB yang diperiksa.");
    expect(skenario.varian.langkah[0]!.jelas).toBe("Delapan pengajuan yang sama menaruh 16 file, 8.000.000 byte, di penyimpanan objek yang berjalan di container lab.");
    expect(skenario.varian.langkah[1]!.jelas).toBe("Baris verifikasi menyimpan kunci objek paling pendek 48 karakter dan checksum paling pendek 64 karakter, bukan isi file.");
    expect(skenario.varian.langkah[2]!.jelas).toBe("Rasio dump terhadap file di bawah 0,01 pada 2, 4, dan 8 pengajuan.");
    expect(skenario.varian.langkah[3]!.jelas).toBe("File punya salinan sendiri yang harus dicadangkan terpisah. Pencadangan penyimpanan objek tidak dijalankan di lab ini.");
    expect(skenario.pengantar).toBe("Delapan pengajuan verifikasi sudah menyimpan foto kartu identitas dan swafoto. Tebak dulu, lalu ikuti dump dan pemulihannya. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    for (const n of [2, 4, 8]) expect(skenario.langkah[1]!.kirim).toContain(`${n} pengajuan (${fmt(n * 2 * 500000)} byte file): rasio dump/file = 1,1`);
    for (const n of [2, 4, 8]) expect(skenario.varian.langkah[2]!.kirim).toContain(`${n} pengajuan (${fmt(n * 2 * 500000)} byte file di penyimpanan): rasio dump/file di bawah 0,01: ya`);
  });
  test("halaman istilah: setiap kalimat bagian cerita, mekanisme, jebakan, dan catatan sumber sama dengan yang diturunkan dari rekaman dan hitungan", () => {
    expect(istilah.sehari_hari).toBe("Backup adalah salinan isi database dalam satu file. Uji pulih memulihkan salinan itu ke database lain, sungguhan, untuk membuktikan ia bisa dipakai.");
    expect(istilah.cerita).toEqual([
      { rujukan: "t3-tim-infra", teks: "Backup pg_dump harian diuji pulih tiap minggu di staging (Asumsi). Pemulihan itu menjadi satu-satunya tempat waktu pulih terlihat." },
      { rujukan: "t4-m33", teks: `Uji pulih mingguan naik dari ${MENIT_LAMA} menit ke ${JAM_BARU[1]} jam ${JAM_BARU[2]} menit (Ilustrasi), karena foto kartu identitas di kolom bytea ikut tiap dump. Rekaman lab mengukur ukurannya: dump ${fmt(RASIO, 1)} kali ukuran file.` },
    ]);
    expect(istilah.mekanisme).toEqual([
      "Backup di Rekeningo adalah dump, yaitu keluaran pg_dump: isi database yang ditulis ke satu file.",
      "Uji pulih menulis isi dump itu kembali ke database lain dengan pg_restore, lalu hasilnya dibandingkan dengan sumbernya.",
      "Di lab t4-storage, hasil pulih sama dengan sumbernya: jumlah baris, jumlah byte, dan md5 tiap baris.",
      "Lamanya bergantung ukuran dump dan mesin. Lab hanya memeriksa batas 120 detik untuk 8 MB, jadi waktu untuk puluhan GB Tidak dijalankan.",
    ]);
    expect(istilah.jebakan).toEqual([
      "Menganggap backup yang berhasil ditulis pasti bisa dipulihkan. Backup yang belum pernah dipulihkan belum terbukti bisa dipakai.",
      `Menambah disk saat uji pulih makin lama. Di halaman 4.14, disk hanya menampung hasil pulih, sedangkan dalam ${HARI} hari file ${fmt(bagianFile, 1)}% dari file dan posting (Hitungan atas Asumsi).`,
    ]);
    expect(istilah.stack).toBeNull();
    expect(istilah.sumber![0]).toEqual({ riset: "R4-176", judul: "PostgreSQL 17: pg_dump", url: "https://www.postgresql.org/docs/17/app-pgdump.html", catatan: "Format custom terkompresi secara bawaan, dan bawaan kompresi data tabel adalah gzip pada tingkat sedang. Dibuka 2026-10-29." });
    expect(istilah.sumber![1]).toEqual({ riset: "R4-178", judul: "Rekaman lab t4-storage: dump dan pulih", rekaman: "labs/t4-storage/output/ukuran.txt", catatan: "Bagian B: tabel yang berisi file di kolom bytea dipulihkan ke database lain, 16 baris dan 8.000.000 byte, md5 tiap baris sama. Waktu tidak direkam." });
    expect(bagB).toContain("16|8000000");
    expect(barisRiset("R4-176")).toContain("dibuka 2026-10-29");
  });
});

function sidikRiset(): string[] {
  return IDS.map((id) => sidik(barisRiset(id)));
}
