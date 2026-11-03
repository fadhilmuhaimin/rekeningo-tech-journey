// Penjaga halaman 5.11 (keputusan 1540 sampai 1542): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// negatif berlingkup, diagram Rantai, widget runsql t5-partisi, baris riset, tabel ADR 49, dan kartu Cek diri di
// partisi-snapshot.mdx diturunkan dari rekaman labs/t5-partisi (pruning.txt, lepas.txt, pasang.txt, snapshot.txt, testing.txt),
// migration labs/api-t5/migrasi/000024, README lab, naskah Tahap 5, registry, baris riset, dan halaman tetangga, bukan dari daftar
// yang ditulis sendiri. Aturan tes ini (pelajaran 3.4 sampai 5.10): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak
// menangkap SALAHNYA kalimat; elemen non-prosa (frontmatter, diagram, widget, snippet, baris riset) dikunci dengan sidik jari dan
// nilai daun; tabel Hitungan dihitung ulang dari rumusnya sendiri dengan pembulatan setengah ke atas; widget dijalankan di
// tests/widgets/runsql-t5-partisi.test.cjs.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-partisi-inti.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, RISET_TERKUNCI, SIDIK, WIDGET_DAUN } from "./partisi-snapshot.halaman.nilai";

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
  terlacak
    ? [...terlacak].filter((f) => f.startsWith(awalan))
    : (fs.readdirSync(path.join(akar, awalan), { recursive: true }) as string[]).map((f) => `${awalan}${f}`).filter((f) => fs.statSync(path.join(akar, f)).isFile());
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);

const BERKAS = "situs/src/content/docs/tahap-5/partisi-snapshot.mdx";
const IDS = ["R5-160", "R5-161", "R5-162", "R5-163", "R5-164"];
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const diagram = DataRantai.parse(diagramMentah);
const widgetMentah = baca("situs/lama/widgets/data/t5-partisi.json");
const widget = JSON.parse(widgetMentah) as Widget;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const pruning = baca("labs/t5-partisi/output/pruning.txt");
const snap = baca("labs/t5-partisi/output/snapshot.txt");
const lepas = baca("labs/t5-partisi/output/lepas.txt");
const pasang = baca("labs/t5-partisi/output/pasang.txt");
const readme = baca("labs/t5-partisi/README.md");
const migrasi24 = baca("labs/api-t5/migrasi/000024_posting_partisi.up.sql");
const m43 = baca("situs/src/content/docs/tahap-5/m43-pemeriksaan-saldo.mdx");
const skemaHal = baca("situs/src/content/docs/tahap-5/skema-data.mdx");
const prd5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");

interface Widget { id: string; title: string; setup: string; check: string; predict: { q: string; options: string[]; answer: number; explain: string }; panels: Record<string, { label: string; setup?: string; steps: { sql: string; note: string }[] }>; toggles: { label: string; pairs: string[][] }[] }
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
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
const angka = (s: string): number => Number(s.replace(/\.(?=\d{3}(?!\d))/g, "").replace(",", "."));
const fmt = (n: number, d = 0): string => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
// pembulatan setengah ke atas seperti pembaca (bukan toFixed)
const bulat = (x: number, d = 0): number => Math.round(x * 10 ** d + 1e-9) / 10 ** d;
const hitung = (teks: string, re: RegExp): number => (teks.match(re) ?? []).length;
const sel = (baris: string): string[] => baris.split("|").slice(1, -1).map((c) => c.trim());

// ---- rekaman: bagian dan nomor baris -------------------------------------------------------------------------------------
const bagianRekaman = (isi: string, huruf: string): { awal: number; teks: string; baris: string[] } => {
  const baris = isi.split("\n");
  const a = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(a, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const z = baris.findIndex((b, n) => n > a && /^# --- [A-Z]\d?\. /.test(b));
  const potong = baris.slice(a, z < 0 ? baris.length : z);
  return { awal: a + 1, teks: potong.join("\n"), baris: potong };
};
// nomor baris 1-based dari baris pertama yang memenuhi syarat pada/sesudah baris `dari`
const nomor = (isi: string, ok: (b: string) => boolean, dari = 1): number => {
  const baris = isi.split("\n");
  const i = baris.findIndex((b, n) => n >= dari - 1 && ok(b));
  expect(i, "baris penanda tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const teksBaris = (isi: string, a: number, b: number): string => isi.split("\n").slice(a - 1, b).join("\n");
const pA = bagianRekaman(pruning, "A"), pB = bagianRekaman(pruning, "B"), pC = bagianRekaman(pruning, "C");
const lA = bagianRekaman(lepas, "A"), lB = bagianRekaman(lepas, "B"), lC = bagianRekaman(lepas, "C"), lD = bagianRekaman(lepas, "D"), lE = bagianRekaman(lepas, "E"), lG = bagianRekaman(lepas, "G");
const aA = bagianRekaman(pasang, "A"), aB = bagianRekaman(pasang, "B"), aC = bagianRekaman(pasang, "C"), aD = bagianRekaman(pasang, "D");

// ---- Snippet di halaman --------------------------------------------------------------------------------------------------
const tag = [...badan.matchAll(/<Snippet (file="[^>]*?)\/>/g)].map((m) => m[1]!);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);
const kodeInline = [...badan.matchAll(/<Snippet lang="([^"]+)" code=\{`([\s\S]*?)`\} \/>/g)].map((m) => ({ lang: m[1]!, kode: m[2]! }));

// ---- angka: registry, naskah, halaman tetangga ---------------------------------------------------------------------------
const asumsi = (cerita.tahap[4] as unknown as { asumsi: Record<string, number> }).asumsi;
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Data posting |"))!;
const barisAdr49 = naskah.split("\n").find((b) => b.startsWith("| 49 |"))!;
const barisM43 = naskah.split("\n").find((b) => b.startsWith("| M43 |"))!;
const AKTIF = (asumsi.user! * asumsi.aktif!) / 100; // 200.000
const TRX = Number(cocok(barisBeban, /200\.000 × (\d) × 2 × 365 = 438 juta/)[1]); // 3 (naskah); registry trx 2 di sebelahnya
const TRX_REG = asumsi.trx!; // 2
const BYTE = Number(cocok(barisBeban, /(\d+) B per posting/)[1]); // 250
const POSTING_TAHUN = AKTIF * TRX * 2 * 365;
const POSTING_TAHUN_2 = AKTIF * TRX_REG * 2 * 365;
const POSTING_BULAN = POSTING_TAHUN / 12;
const POSTING_BULAN_2 = POSTING_TAHUN_2 / 12;
const JURNAL_TAHUN = AKTIF * TRX * 365;
const JURNAL_TAHUN_2 = AKTIF * TRX_REG * 365;
const GB_BULAN = (POSTING_BULAN * BYTE) / 1e9;
const GB_BULAN_2 = (POSTING_BULAN_2 * BYTE) / 1e9;
const PER_BULAN_LAB = angka(cocok(pA.teks, /posting_lalu_01\s+\| (\d+)/)[1]!); // 150.000
const BARIS_PARTISI_A = pA.baris.filter((b) => /^ posting_(bulan|lalu)_\d\d\s+\| \d+$/.test(b));

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.11 ada, konsep, jalur inti, prasyarat 5.10, lab t5-partisi, peran backend, ADR 49; judul sama dengan peta naskah; menit = baca + coba", () => {
    expect(dari("t5-partisi")).toMatchObject({ ada: true, nomor: "5.11", jenis: "konsep", inti: true, prasyarat: ["t5-m43"], lab: ["t5-partisi"], tahap: 5, peran: ["backend"], adr: [49] });
    expect(dari("t5-m43").nomor).toBe("5.10");
    expect(frontmatter).toContain('title: "5.11 Partisi tabel ledger dan snapshot saldo + ADR 49"');
    expect(dari("t5-partisi").judul).toBe("Partisi tabel ledger dan snapshot saldo + ADR 49");
    expect(naskah).toContain("| 5.11 | 4 | Partisi tabel ledger dan snapshot saldo + ADR 49 | Konsep + ADR | ★ | t5-partisi | runsql |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-m43\]\] · Jalur inti<\/p>/);
    expect(dari("t5-partisi").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(2.5);
  });
  test("lima blok sesuai templat konsep: Mulai dan Coba terbuka, Coba punya ringkasan aman", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan).toMatch(/<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: [^"]+">/);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["berikutnya", "t2-adr-ledger", "t5-adr-60", "t5-kms", "t5-m43", "t5-prd", "t5-skema"]);
    const sesuai: [string, string, string][] = [
      ["t2-adr-ledger", "2.8", "ADR 6"], ["t5-adr-60", "5.30", "ADR 60"], ["t5-kms", "5.26", "Keamanan 12"], ["t5-m43", "5.10", "M43"], ["t5-prd", "5.1", "PRD v5"], ["t5-skema", "5.3", "Skema data"],
    ];
    for (const [idh, nomorH, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomorH);
      expect(dari(idh).judul.includes(awal), `${idh} di registry`).toBe(true);
      if (nomorH.startsWith("5.")) expect(naskah, `${nomorH} di peta`).toMatch(new RegExp(`\\| ${nomorH.replace(".", "\\.")} \\| \\d+b? \\| [^|]*${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(cara).toContain("Label sumber");
    expect(badan).toContain("[Label sumber](/cara-pakai/#label-sumber)");
  });
  test("janji halaman tetangga ditepati: 5.10 dan 5.3 menunjuk halaman ini untuk arsip dan partisi bulan berikutnya, dan halaman ini hanya merujuk isi 5.10", () => {
    expect(m43).toContain("Data lama tetap ada di arsip (`lepas.txt` bagian E), dan caranya dibahas di [[t5-partisi]].");
    expect(skemaHal).toContain("Pembuatan partisi bulan berikutnya dibahas di [[t5-partisi]].");
    expect(skemaHal).toContain("Pembuatan partisi otomatis oleh ekstensi seperti pg_partman");
    expect(prd5).toContain("[[t5-partisi]] mengerjakannya.");
    expect(badan.match(/ADR \d+/g)!.map((x) => x).filter((x, i, a) => a.indexOf(x) === i).sort()).toEqual(["ADR 49", "ADR 57", "ADR 6"]);
    expect(badan.match(/ADR 57/g)).toHaveLength(2); // satu di bagian arsip dan satu di aturan 6; isi ADR 57 tidak dibuka
    expect(badan).not.toMatch(/OpenBao|SoftHSM|envelope|\bKEK\b|\bAES\b|data key/);
  });
  test("tebakan Coba: jawabannya tidak tertulis di blok Mulai, dan Inti tidak menyebut 120.000 atau 10.000", () => {
    const sebelum = badan.slice(0, badan.indexOf('<Blok nama="Coba"'));
    expect(sebelum.includes(widget.predict.options[widget.predict.answer]!)).toBe(false);
    expect(sebelum).not.toMatch(/120\.000|10\.000/);
    expect(widget.predict.options[widget.predict.answer]).toBe("120.000 di Before dan 10.000 di After");
    expect(widget.predict.answer).toBe(1);
  });
});

describe("rekaman pruning.txt: 14 partisi, pruning, PRIMARY KEY, dan id ganda", () => {
  test("bagian A: 12 partisi berisi 150.000 posting, dua partisi kosong; halaman menulis 14, 12, dan 150.000", () => {
    expect(BARIS_PARTISI_A).toHaveLength(12);
    for (const b of BARIS_PARTISI_A) expect(angka(b.split("|")[1]!.trim())).toBe(PER_BULAN_LAB);
    expect(PER_BULAN_LAB).toBe(150000);
    expect(pA.teks).toContain("# 14 partisi di katalog: 12 berisi 150.000 posting masing-masing, dan dua (bulan depan dan sesudahnya) kosong.");
    expect(badan).toContain("Rekaman bagian A memuat 14 partisi `posting` di lab: 12 berisi 150.000 posting, dan dua kosong untuk bulan depan dan sesudahnya. Angka 150.000 adalah pilihan lab, bukan beban produksi.");
    expect(readme).toContain("150.000 posting per bulan");
  });
  test("bagian B: satu bulan membaca 1 dari 14 (posting_lalu_04); tanpa dibuat 12 Parallel Seq Scan; id saja 12 Index Scan dan 2 Seq Scan", () => {
    expect(pB.teks).toContain("Parallel Seq Scan on posting_lalu_04 posting");
    expect(pB.teks).toContain("# Dibaca: 1 dari 14 partisi (posting_lalu_04).");
    const rencanaSatuBulan = pB.teks.slice(0, pB.teks.indexOf("WHERE jumlah > 13000"));
    expect(hitung(rencanaSatuBulan, /Seq Scan on posting_/g)).toBe(1);
    const tanpaDibuat = pB.teks.slice(pB.teks.indexOf("WHERE jumlah > 13000"), pB.teks.indexOf("WHERE id = 424242"));
    expect(hitung(tanpaDibuat, /Parallel Seq Scan on posting_/g)).toBe(12);
    expect(tanpaDibuat).toContain("# Dibaca: 14 dari 14 partisi: 12 partisi berisi dengan Parallel Seq Scan di bawah Parallel Append, dan dua partisi kosong");
    expect(tanpaDibuat).toContain("Simpul dua partisi kosong tidak ditampilkan di atas");
    const idSaja = pB.teks.slice(pB.teks.indexOf("WHERE id = 424242"));
    expect(hitung(idSaja, /Index Scan using posting_\w+_pkey on/g)).toBe(12);
    expect(hitung(idSaja, /->  Seq Scan on posting_bulan_0[12] /g)).toBe(2);
    expect(idSaja).toContain("# Mencari satu baris dengan id saja membaca 14 dari 14 partisi: index primary key di 12 partisi berisi dan Seq Scan di 2 partisi kosong.");
    expect(idSaja).toContain("# id tidak memuat kolom kunci partisi, jadi batas partisi tidak bisa menyisihkan satu pun.");
    expect(pB.teks).not.toMatch(/8 MB.*(menyalakan|syarat)|ambang 8 MB/i); // klaim Parallel Append 8 MB sudah dibuang dari rekaman
    expect(badan).not.toMatch(/8 MB|Parallel Append|min_parallel/i);
    expect(badan).toContain("Pada query satu bulan, 13 partisi lain dipangkas:");
    expect(14 - 1).toBe(13);
  });
  test("bagian C: UNIQUE dan PRIMARY KEY tanpa dibuat ditolak 0A000; PRIMARY KEY (id, dibuat); id yang sama muncul tiga kali", () => {
    expect(hitung(pC.teks, /ERROR:  unique constraint on partitioned table must include all partitioning columns\n   -- SQLSTATE 0A000/g)).toBe(2);
    expect(pC.teks).toContain(" PRIMARY KEY (id, dibuat)");
    expect(pC.teks).toMatch(/baris_dengan_id_itu\n-+\n 3\n/);
    expect(pC.teks).toContain("INSERT 0 2");
    expect(pC.teks).toContain("=> ROLLBACK");
    expect(pC.teks).toContain("# Akibatnya id tidak unik menurut database: dua baris dengan id yang sama dan dibuat berbeda diterima. Keunikan id hanya datang dari sequence.");
    expect(badan).toContain("Satu transaction yang dibatalkan menyisipkan dua baris dengan `id` yang sudah ada, dan `id` itu muncul tiga kali:");
    expect(badan).toContain("PostgreSQL menolak UNIQUE dan PRIMARY KEY yang tidak memuat semua kolom kunci partisi, dengan SQLSTATE 0A000.");
    expect(skemaHal).toContain("Yang menjaga keunikan di lab adalah sequence `posting_id_seq`.");
    expect(migrasi24).toContain("PRIMARY KEY (id, dibuat)");
    expect(migrasi24).toContain("id        bigint      NOT NULL DEFAULT nextval('posting_id_seq')");
  });
});

describe("rekaman lepas.txt dan pasang.txt: DETACH, arsip, ATTACH, trigger, dan bulan depan", () => {
  test("lepas B dan C: DELETE 23001; role aplikasi 42501 untuk DETACH dan DROP; DETACH CONCURRENTLY 25001 dan 55000; 140.000 dari 168.000; CHECK dan tiga trigger hilang", () => {
    expect(lB.teks).toContain("SQLSTATE 23001");
    expect(hitung(lB.teks, /SQLSTATE 42501/g)).toBe(2);
    expect(lB.teks).toContain("ERROR:  must be owner of table posting\n");
    expect(lB.teks).toContain("# Trigger append-only tidak menyala untuk DROP atau DETACH: yang menahannya di sini hak.");
    expect(lC.teks).toContain("ERROR:  ALTER TABLE ... DETACH CONCURRENTLY cannot run inside a transaction block\n   -- SQLSTATE 25001");
    expect(lC.teks).toContain("ERROR:  cannot detach partitions concurrently when a default partition exists\n   -- SQLSTATE 55000");
    expect(lC.teks).toContain("# Posting yang terlihat lewat tabel induk: 140.000 dari 168.000;");
    expect(lC.teks).toContain("posting_lalu_05_dibuat_check");
    expect(lC.teks).toContain("# DETACH CONCURRENTLY menambah CHECK yang setara batas partisi pada tabel yang dilepas");
    expect(lC.teks).toContain("# Tabel yang dilepas kehilangan tiga trigger ledger baris demi baris (jurnal_seimbang, posting_tidak_diubah, saldo_karyawan_tidak_negatif)");
    expect(lC.teks).toContain("# UPDATE atas tabel yang sudah dilepas berhasil untuk pemiliknya");
    expect(hitung(lC.teks, /SQLSTATE 42501/g)).toBe(2);
    expect(lC.teks).toContain("# Role aplikasi (api_t5) ditolak karena hak (42501), bukan karena trigger");
    expect(168000 - 140000).toBe(28000);
    expect(hitung(lA.teks, /posting_(bulan|lalu)_\d\d\s+\| 28000/g)).toBe(6);
    expect(badan).toContain("bahwa `DETACH CONCURRENTLY` menambahkan CHECK yang menduplikasi batas partisi");
  });
  test("lepas D dan E: 200.000 baris, batas dua kali, tanpa nilai waktu; arsip 28.000 baris, EXCEPT ALL 0, SHA-256 sama", () => {
    expect(lD.teks).toContain("DELETE 200000");
    expect(lD.teks).toContain("200000 baris di partisi yang dibuang");
    expect(lD.teks).toContain("Batas yang diperiksa: waktu terkecil DELETE dari tiga percobaan lebih dari dua kali waktu terkecil DETACH + DROP.");
    expect(lD.teks).toContain("# Nilai waktunya tidak direkam.");
    expect(lD.teks).toContain("tabel uji tanpa trigger ledger");
    expect(lE.teks).toContain("# File arsip: 28.000 baris; tabel pulih memuat baris yang sama (EXCEPT ALL kedua arah: 0 baris), dan ekspor ulang tabel pulih punya SHA-256 yang sama dengan file.");
    expect(lE.teks).toContain("File arsip belum dienkripsi: enkripsi dan baris arsip_partisi adalah pekerjaan lab t5-kms");
    expect(readme).toContain("**Arsip belum dienkripsi.** File CSV ada di `$TMP/t5-partisi-arsip-<LAB_DB_PORT>/`.");
    expect(readme).toContain("`kunci_data_terbungkus` dan `versi_kek` wajib terisi");
  });
  test("lepas A: lima snapshot ditulis sebelum partisi dilepas, 0 baris berbeda; lepas G: jurnal pembalik 201 lalu 409 posting-diarsipkan, tanpa galat database dan 0 jurnal tertinggal", () => {
    expect(hitung(lA.teks, /snapshot <tanggal>: 10288 buku ditulis/g)).toBe(5);
    expect(lA.teks).toContain("# Snapshot dibandingkan dengan hitungan langsung atas tabel posting: 0 baris berbeda.");
    expect(lA.teks).toContain("Snapshot ditulis dulu: partisi hanya boleh dilepas");
    expect(lG.teks).toContain("HTTP 201");
    expect(lG.teks).toContain("HTTP 409");
    expect(lG.teks).toContain('"type":"/problems/posting-diarsipkan"');
    expect(lG.teks).toContain("menjawab 409 sebelum\n# transaction dibuka, tanpa galat database di log server, dan tidak ada jurnal pembalik yang tertinggal (0 baris).");
    expect(badan).toContain("menjawab 409 `posting-diarsipkan` sebelum transaction dibuka:");
    expect(badan).toContain("Lima snapshot ditulis sebelum satu partisi dilepas, dan dicocokkan dengan hitungan langsung atas tabel posting: 0 baris berbeda (`lepas.txt` bagian A).");
  });
  test("klaim negatif berlingkup: tidak ada event trigger di migration api-t2 sampai api-t5 (yang membangun schema lab); DETACH hanya dijaga hak pemilik di rekaman", () => {
    const sql = ["api-t2", "api-t3", "api-t4", "api-t5"].flatMap((l) => berkasDi(`labs/${l}/migrasi/`).filter((f) => f.endsWith(".up.sql")));
    expect(sql.length).toBeGreaterThan(15);
    for (const f of sql) expect(baca(f), f).not.toMatch(/EVENT TRIGGER|ddl_command_start|sql_drop/i);
    expect(baca("labs/api-t5/dasar_t5.py")).toContain('MIGRASI_T5 = sorted((HERE / "migrasi").glob("*.up.sql"))');
    expect(lB.teks).toContain("# Trigger append-only tidak menyala untuk DROP atau DETACH: yang menahannya di sini hak.");
    expect(badan).toContain("Di lab tidak ada event trigger yang menolak DETACH, dan migration `api-t2` sampai `api-t5` tidak memuatnya. DETACH hanya dijaga hak pemilik tabel (`lepas.txt` bagian B).");
  });
  test("pasang A dan C: percobaan 0 ditolak 42804; percobaan 1 memindai dan memvalidasi foreign key; hanya CHECK literal membebaskan pemindaian; tabel asal tanpa pemindaian dan tanpa validasi", () => {
    const potong = (teks: string, dariK: string, sampai: string): string => teks.slice(teks.indexOf(dariK), teks.indexOf(sampai, teks.indexOf(dariK) + 1));
    const p0 = potong(pasang, "# Percobaan 0:", "# Percobaan 1:");
    const p1 = potong(pasang, "# Percobaan 1:", "# --- B.");
    const p2 = potong(aC.teks, "# Percobaan 2:", "# Percobaan 2b:");
    const p2b = potong(aC.teks, "# Percobaan 2b:", "# Dari bentuk yang dicoba");
    const p3 = aC.teks.slice(aC.teks.indexOf("# Percobaan 3:"));
    expect(p0).toContain('ERROR:  child table is missing constraint "posting_jumlah_check1"\n   -- SQLSTATE 42804');
    expect(p1).toContain('DEBUG:  verifying table "posting_pulih"');
    expect(hitung(p1, /^DEBUG:  validating foreign key constraint/gm)).toBe(2);
    expect(p2).toContain('partition constraint for table "posting_pulih2" is implied by existing constraints');
    expect(p2).not.toContain("verifying table");
    expect(hitung(p2, /^DEBUG:  validating foreign key constraint/gm)).toBe(2);
    // tiga bentuk 2b: ekspresi, NOT VALID, batas atas longgar: semuanya memindai dan memvalidasi foreign key
    const bentuk = p2b.split(/\n(?=# (?:batas|batas literal|batas atas))/).filter((x) => x.startsWith("# batas"));
    expect(bentuk).toHaveLength(3);
    expect(bentuk[0]).toContain("CHECK (dibuat >= '<waktu>'::timestamptz + interval '0 day'");
    expect(bentuk[1]).toContain("NOT VALID");
    expect(bentuk[2]).toContain("interval '1 day')");
    for (const b of bentuk) {
      expect(b).toContain("verifying table");
      expect(hitung(b, /^DEBUG:  validating foreign key constraint/gm)).toBe(2);
      expect(b).not.toContain("is implied by existing constraints");
    }
    expect(aC.teks).toContain("# Dari bentuk yang dicoba, hanya CHECK literal yang sama dengan batas partisi (percobaan 2) membebaskan ATTACH dari pemindaian.");
    expect(p3).toContain('partition constraint for table "posting_lalu_05" is implied by existing constraints');
    expect(p3).not.toMatch(/^DEBUG:  validating foreign key/m);
    expect(aA.teks).toContain("SQLSTATE 42804");
    expect(p3).toContain("# Tidak ada pemindaian dan tidak ada validasi foreign key.");
    // tujuh baris tabel di halaman: bentuk tabel, pemindaian batas, validasi foreign key
    expect(badan).toContain("| Tanpa CHECK bawaan `jumlah <> 0` | ditolak: 42804 | tidak sampai ke sini |");
    expect(badan).toContain("| Dengan CHECK bawaan, tanpa CHECK batas | memindai | divalidasi |");
    expect(badan).toContain("| CHECK batas literal sama dengan `FOR VALUES` | tidak memindai | divalidasi |");
    expect(badan).toContain("| CHECK batas berupa ekspresi | memindai | divalidasi |");
    expect(badan).toContain("| CHECK batas literal yang `NOT VALID` | memindai | divalidasi |");
    expect(badan).toContain("| CHECK batas atas lebih longgar | memindai | divalidasi |");
    expect(badan).toContain("| Tabel asal dari `DETACH CONCURRENTLY` | tidak memindai | tidak divalidasi |");
  });
  test("pasang B dan D: tiga trigger baris ikut ATTACH, penjaga TRUNCATE tidak; TRUNCATE berhasil lalu ditolak sesudah dipasang; mutan trigger mati UPDATE 28000; bulan ke-3 23514", () => {
    expect(aB.teks).toMatch(/ jurnal_seimbang\n posting_tidak_diubah\n saldo_karyawan_tidak_negatif\n\(3 rows\)/);
    expect(aB.teks).not.toContain("posting_tidak_dikosongkan\n(");
    expect(aB.teks).toContain("TRUNCATE TABLE\n=> SELECT count(*) AS posting_pulih FROM posting_pulih\n posting_pulih\n---------------\n 0\n");
    expect(aB.teks).toContain("ERROR:  TRUNCATE pada posting_pulih ditolak: baris posting_pulih tidak pernah diubah atau dihapus\n   -- SQLSTATE 23001");
    expect(aB.teks).toContain("=> ALTER TABLE posting_pulih DISABLE TRIGGER posting_tidak_diubah\nALTER TABLE\n=> UPDATE posting_pulih SET jumlah = jumlah\nUPDATE 28000\n=> ROLLBACK");
    expect(aB.teks).toMatch(/UPDATE posting_pulih SET jumlah = jumlah \+ 1\nERROR:  UPDATE pada posting_pulih ditolak/);
    expect(aD.teks).toContain('ERROR:  no partition of relation "posting" found for row\n   -- SQLSTATE 23514');
    expect(aD.teks).toContain("make_interval(months => -3)");
    expect(aD.teks).toContain("SELECT buat_partisi_posting('posting_bulan_03'");
    expect(aD.teks).toContain("INSERT 0 1");
    expect(aD.teks).toContain("# Jam diperankan dengan kolom dibuat yang eksplisit di bulan ke-3 sesudah bulan berjalan: tabel punya partisi sampai bulan ke-2.");
    expect(migrasi24).toContain("FOR i IN 0..2 LOOP");
    expect(migrasi24).toContain("posting_sebelum PARTITION OF posting FOR VALUES FROM (MINVALUE)");
    expect(migrasi24).not.toMatch(/DEFAULT\s+\w*\s*PARTITION OF|PARTITION OF posting DEFAULT/i);
  });
  test("kode migration: buat_partisi_posting menolak awal bukan bulan dan memasang penjaga TRUNCATE; lab tidak punya penjadwal bulanan", () => {
    const fungsi = teksBaris(migrasi24, nomor(migrasi24, (b) => b.startsWith("CREATE FUNCTION buat_partisi_posting(")), nomor(migrasi24, (b) => b === "END $$;", nomor(migrasi24, (b) => b.startsWith("CREATE FUNCTION buat_partisi_posting("))));
    expect(fungsi).toContain("IF p_awal <> date_trunc('month', p_awal)::date THEN");
    expect(fungsi).toContain("RAISE EXCEPTION 'partisi dimulai di awal bulan, bukan %'");
    expect(fungsi).toContain("CREATE TABLE %I PARTITION OF posting FOR VALUES FROM (%L) TO (%L)");
    expect(fungsi).toContain("CREATE TRIGGER posting_tidak_dikosongkan BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah()");
    expect(migrasi24).toContain("-- Trigger TRUNCATE tingkat statement tidak ikut ke partisi: dipasang di tiap partisi oleh buat_partisi_posting.");
    // klaim negatif berlingkup labs/api-t5 dan labs/t5-partisi: tak ada penjadwal (cron, ticker) yang memanggil buat_partisi_posting
    const pemanggil = [...berkasDi("labs/api-t5/"), ...berkasDi("labs/t5-partisi/")].filter((f) => /\.(go|py|sh|sql|yml|yaml)$/.test(f) && baca(f).includes("buat_partisi_posting")).sort();
    for (const f of pemanggil) expect(baca(f), f).not.toMatch(/time\.NewTicker|cron|pg_cron|schedule\./i);
    expect(pemanggil.some((f) => f.endsWith("migrasi/000024_posting_partisi.up.sql"))).toBe(true);
    expect(readme).toContain("## Tidak dijalankan atau belum ada");
    expect(readme).toContain("pg_partman v5.5.0, `DETACH ... FINALIZE`, partisi `jurnal`");
    expect(readme).toContain("Lab ini tidak mengklaim kapasitas tulis satu primary: partisi tidak menambahnya.");
    expect(readme).toContain("Di sistem berisi data, baris lama harus dipindahkan per bulan. Itu tidak direkam di sini.");
    expect(readme).toContain("membuat `posting_lalu_01` sampai `posting_lalu_11`");
  });
});

describe("Hitungan atas Asumsi, label sumber, dan klaim dari dokumentasi", () => {
  test("masukan: 200.000 aktif, 3 transaksi (naskah) dan 2 (registry), 250 byte; 438 juta per tahun; 69,4 dan 46,3 dari PRD", () => {
    expect(AKTIF).toBe(200000);
    expect(TRX).toBe(3);
    expect(TRX_REG).toBe(2);
    expect(BYTE).toBe(250);
    expect(POSTING_TAHUN).toBe(438_000_000);
    expect(POSTING_TAHUN_2).toBe(292_000_000);
    expect(prd5).toContain("| Transaksi uang per detik di puncak | 69,4 | 600.000 ÷ 86.400 × 10 (asumsi) | 46,3 |");
    expect(badan).toContain("Puncak transaksi uang 69,4 per detik dan 438 juta posting per tahun memakai tiga transaksi per user aktif per hari ([[t5-prd]]). Dengan dua transaksi hasilnya 46,3 dan 292 juta.");
    expect(barisAdr49).toContain("Pembanding: 36,5 juta posting dan 9,1 GB per bulan");
    expect(barisAdr49).toContain("219 juta baris per tahun, Hitungan: 600.000 × 365");
  });
  test("tabel Hitungan: tiap sel dihitung ulang dari rumusnya, pembulatan setengah ke atas", () => {
    const baris = badan.split("\n").filter((b) => /^\| (Posting per bulan|Ukuran posting per bulan|Jurnal per tahun) \|/.test(b)).map(sel);
    expect(baris).toHaveLength(3);
    const juta = (n: number): string => `${fmt(bulat(n / 1e6, 1), 1)} juta`.replace(",0 juta", " juta");
    expect(baris[0]).toEqual(["Posting per bulan", "438 juta ÷ 12", juta(POSTING_BULAN), juta(POSTING_BULAN_2)]);
    expect(baris[1]).toEqual(["Ukuran posting per bulan", `${juta(POSTING_BULAN)} × ${BYTE} byte`, `${fmt(bulat(GB_BULAN, 1), 1)} GB`, `${fmt(bulat(GB_BULAN_2, 1), 1)} GB`]);
    expect(baris[2]).toEqual(["Jurnal per tahun", `${fmt(AKTIF)} × ${TRX} × 365`, `${fmt(JURNAL_TAHUN / 1e6)} juta`, `${fmt(JURNAL_TAHUN_2 / 1e6)} juta`]);
    expect([POSTING_BULAN, GB_BULAN, JURNAL_TAHUN]).toEqual([36_500_000, 9.125, 219_000_000]);
    expect([bulat(POSTING_BULAN_2 / 1e6, 1), bulat(GB_BULAN_2, 1), JURNAL_TAHUN_2]).toEqual([24.3, 6.1, 146_000_000]);
    expect(badan).toContain("| Besaran | Rumus | Hasil | Dengan 2 transaksi |");
    expect(badan).toContain("Lab memakai 150.000 posting per bulan supaya satu bulan dari 12 sama dengan 8,3% ([[t5-m43]]).");
    expect(bulat((PER_BULAN_LAB / (12 * PER_BULAN_LAB)) * 100, 1)).toBe(8.3);
    expect(m43).toContain("Lab memilih 150.000 posting per bulan supaya satu bulan dari 12 sama dengan 8,3% di naskah.");
  });
  test("ukuran bukan alasan: 109,5 GB per tahun lawan 32 TB = 292 tahun, sama dengan 5.10; ADR 49 dan peta naskah", () => {
    const gbTahun = (POSTING_TAHUN * BYTE) / 1e9;
    expect(gbTahun).toBe(109.5);
    expect(bulat(32000 / gbTahun)).toBe(292);
    expect(badan).toContain("Posting setahun 109,5 GB lawan batas 32 TB per relasi, yaitu 292 tahun (Hitungan atas Asumsi, diturunkan di [[t5-m43]]).");
    expect(m43).toContain("| Tahun sampai batas relasi | 32.000 GB ÷ 109,5 GB | 292 tahun |");
    expect(barisM43).toContain("batas satu tabel 32 TB, 292 tahun data");
  });
  test("label turunan didefinisikan sebelum dipakai: Hitungan, Penalaran, Tidak dijalankan, Asumsi, Simulasi; Ilustrasi lewat tautan Label sumber", () => {
    const pos = (re: RegExp): number => cocok(badan, re).index!;
    expect(pos(/Hitungan adalah hasil rumus dari angka yang tertulis di halaman/)).toBeLessThan(pos(/Hitungan atas Asumsi/));
    expect(pos(/Penalaran adalah kesimpulan dari definisi atau angka di halaman, bukan hasil ukuran\./)).toBeLessThan(pos(/\(penalaran/));
    expect(pos(/Tidak dijalankan berarti dicek ke dokumentasi atau kode tanpa dijalankan\./)).toBeLessThan(pos(/\(Tidak dijalankan[:)]/));
    expect(pos(/Angka beban halaman ini Asumsi, yaitu angka pilihan penulis tanpa rekaman\./)).toBeLessThan(pos(/\(Asumsi\)|Asumsi\)/));
    expect(badan.indexOf("Simulasi")).toBe(pos(/\*\*Simulasi\*\* di halaman ini berarti SQL dijalankan oleh SQLite/) + 2);
    expect(pos(/\[Label sumber\]\(\/cara-pakai\/#label-sumber\)/)).toBeLessThan(pos(/\(Ilustrasi\)/));
    expect(cara).toMatch(/Rekaman lab/);
  });
  test("klaim dari dokumentasi: kutipan dan bagian ada di baris riset, tanggal akses sama, versi pg_partman dan Serverpod sama", () => {
    const r160 = barisRiset("R5-160"), r161 = barisRiset("R5-161"), r162 = barisRiset("R5-162"), r163 = barisRiset("R5-163"), r164 = barisRiset("R5-164");
    // setiap tautan dokumentasi bertanggal di halaman mencatat 2026-11-03, sama dengan baris riset
    const dibuka = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(dibuka.length).toBeGreaterThanOrEqual(10);
    expect(new Set(dibuka)).toEqual(new Set(["2026-11-03"]));
    for (const r of [r160, r161, r162, r163]) expect(r).toContain("2026-11-03");
    // bagian PostgreSQL yang disebut halaman
    for (const b of ["5.12.4", "5.12.2.3", "5.12.2.2", "5.12.1", "5.12.6"]) {
      expect(badan, b).toContain(`PostgreSQL 17, ${b}]`);
    }
    expect(r160).toContain("Bagian 5.12.4:");
    expect(r160).toContain("Bagian 5.12.2.3:");
    expect(r160).toContain("Bagian 5.12.2.2:");
    expect(r160).toContain("Bagian 5.12.6:");
    expect(riset).toContain("PostgreSQL 17 bagian 5.12.1 Overview");
    expect(r160).toContain("the planner will examine the definition of each partition and prove that the partition need not be scanned because it could not contain any rows meeting the query's WHERE clause");
    expect(r160).toContain("Each partition will hold the rows for which the hash value of the partition key divided by the specified modulus will produce the specified remainder");
    expect(r160).toContain("Too many partitions can mean longer query planning times and higher memory consumption");
    expect(r160).toContain("hanya butuh SHARE UPDATE EXCLUSIVE di tabel induk, sedangkan bentuk pertama butuh ACCESS EXCLUSIVE");
    expect(r161).toContain("It is possible to avoid this scan by adding a valid CHECK constraint to the table that allows only rows satisfying the desired partition constraint");
    expect(r161).toContain("A CHECK constraint that duplicates the partition constraint is added to the partition. CONCURRENTLY cannot be run in a transaction block and is not allowed if the partitioned table contains a default partition.");
    expect(r161).toContain("Any triggers that were created as clones of those in the target table are removed");
    expect(r161).toContain("For each user-defined row-level trigger that exists in the target table, a corresponding one is created in the attached table");
    expect(r161).toContain('must have all the NOT NULL and CHECK constraints of the target table');
    // pg_partman: versi dan tanggal rilis sama di halaman dan baris riset
    expect(badan).toContain("rilis v5.5.0 terbit 2026-07-22, dibuka 2026-11-03");
    expect(r162).toContain("tag v5.5.0");
    expect(r162).toContain("published_at 2026-07-22T14:46:50Z");
    expect(readme).toContain("| pg_partman | v5.5.0 |");
    // stack lain: tiap versi dan kata kunci di tab ada di baris R5-163
    expect(badan).toContain("Serverpod 4.1.0, dibuka 2026-11-03");
    expect(r163).toContain("Serverpod 4.1.0");
    expect(badan).toContain("pembaruan 25 Jun 2026, dibuka 2026-11-03");
    expect(r163).toContain("pembaruan 25 Jun 2026");
    expect(badan).toContain("Django 5.2: Composite primary keys");
    expect(r163).toContain("Django 5.2");
    expect(r163).toContain("Laravel 13.x Migrations (laravel.com/docs/13.x/migrations): 0 kemunculan");
    expect(r163).toContain("kata partition, tanpa membedakan huruf besar, muncul sekali, sebagai `partitionBy` di daftar navigasi Query Builder");
    expect(r163).toContain("\"Django doesn't support migrating to, or from, a composite primary key after the table is created\"");
    expect(r163).toContain("\"ForeignKey currently cannot reference models with composite primary keys\"");
    expect(r163).toContain("\"Migrations are plain SQL, so you can edit a generated migration.sql\"");
    expect(r163).toContain("primary key (order_date, id)");
    expect(r163).toContain("Native partitioning was introduced in Postgres 10 and is generally thought to have better performance.");
    expect(r163).toContain("Migrations, Raw access, dan Tables memuat 0 kata partition");
    expect(r164).toContain("438.000.000 ÷ 12 = 36.500.000");
  });
  test("tab Stack lain: enam tab berurutan, hanya Go dijalankan; tiga kode ilustrasi berlabel; kata penuh tidak dipakai tanpa lingkup", () => {
    expect(badan).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...badan.matchAll(/<Fragment slot="t(\d)">/g)].map((m) => m[1])).toEqual(["0", "1", "2", "3", "4", "5"]);
    const tab = badan.slice(badan.indexOf("<TabSet"), badan.indexOf("</TabSet>")).split(/<Fragment slot="t\d">/).slice(1);
    expect(tab[0]).toContain("*Dijalankan: lab api-t5 dan t5-partisi, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0 (rekaman `pruning.txt`, `lepas.txt`, `pasang.txt`).*");
    for (const t of tab.slice(1)) expect(t).toContain("*Tidak dijalankan.");
    for (const t of tab.slice(1, 4)) expect(t).toContain("Kode di bawah adalah Ilustrasi.");
    expect(tab[4]).toContain("Kode Dart tidak ditulis di tab ini.");
    expect(tab[5]).not.toContain("Snippet");
    expect(kodeInline.map((k) => k.lang)).toEqual(["js", "php", "python"]);
    expect(kodeInline[0]!.kode).toContain("PRIMARY KEY (id, dibuat)");
    expect(kodeInline[1]!.kode).toContain("PARTITION BY RANGE (dibuat)");
    expect(kodeInline[2]!.kode).toContain('models.CompositePrimaryKey("id", "dibuat")');
    expect(readme).toContain("| PostgreSQL | 17.11 (`postgres:17`");
    expect(readme).toContain("| Go | 1.27.3 |");
    expect(readme).toContain("| pgx | v5.11.0 (MIT) |");
    for (const r of [pruning, lepas, pasang]) {
      expect(r).toContain("PostgreSQL 17.11");
      expect(r).toContain("go1.27.3");
      expect(r).toContain("pgx v5.11.0");
    }
    // kata sapaan dan istilah satu kata per konsep: halaman memakai "partisi" (bukan partition) di prosa, dan "replica" tidak dibahas di sini
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/`[^`]*`/g, "").replace(/\[[^\]]*\]\([^)]*\)/g, "");
    expect(hitung(prosa.replace(/Kata partition|kata partition|partition constraint/g, ""), /\bpartition\b/gi)).toBeLessThanOrEqual(3);
    expect(prosa).not.toMatch(/\b(secret|pembayar|pelanggan|Anda|kita)\b/i);
  });
});

describe("diagram Rantai, widget, ADR 49, dan kartu Cek diri", () => {
  test("Rantai ringkas: dua baris, empat simpul, angka dari rekaman; teks simpul pendek dan tanpa ID internal", () => {
    expect(diagram.baris).toHaveLength(2);
    expect(diagram.baris.map((b) => b.simpul.length)).toEqual([2, 2]);
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    const semua = diagram.baris.flatMap((b) => b.simpul.map((s) => s.teks));
    expect(semua).toEqual(["Query menyebut dibuat", "1 dari 14 partisi dibaca", "DELETE atas posting ditolak", "DETACH melepas 28.000 posting"]);
    expect(diagram.baris[0]!.simpul[1]!.sub).toBe("posting_lalu_04");
    expect(diagram.baris[1]!.simpul[0]!.sub).toBe("SQLSTATE 23001");
    expect(pB.teks).toContain("# Dibaca: 1 dari 14 partisi (posting_lalu_04).");
    expect(lB.teks).toContain("SQLSTATE 23001");
    expect(168000 - 140000).toBe(28000);
    expect(diagram.sumber.teks).toBe("Rekaman lab t5-partisi · pruning.txt bagian B dan lepas.txt bagian B dan C");
    expect(diagram.catatan).toContain("12 bulan × 150.000 posting di 14 partisi, dan 28.000 posting per bulan di rekaman lepas.");
    expect(diagram.catatan).toContain("438 juta (Asumsi)");
    expect(diagram.sumber.jenis).toBe("rekaman");
    expect(diagram.id).toBe("t5-partisi-inti");
    for (const s of semua) expect(s.length).toBeLessThanOrEqual(32);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+/);
  });
  test("widget t5-partisi: data buatan 12 × 10.000, Before satu tabel, After dua belas tabel; angka halaman sama dengan JSON", () => {
    const total = Number(cocok(widget.setup, /x < (\d+)\)/)[1]);
    const perBulan = Number(cocok(widget.setup, /% (\d+)\) \* 200/)[1]);
    expect(total).toBe(120000);
    expect(perBulan).toBe(10000);
    expect(total / perBulan).toBe(12);
    expect(badan).toContain(`Datanya 12 bulan × ${fmt(perBulan)} = ${fmt(total)} baris buatan (Ilustrasi).`);
    expect(badan).toContain(`Panel Before menulis \`SCAN posting\`, dan tabel yang dipindai berisi ${fmt(total)} baris. Panel After menulis \`SCAN posting_04\`, dan tabel yang dipindai berisi ${fmt(perBulan)} baris.`);
    expect(badan).toContain(`Kedua panel menyisakan ${fmt(total - perBulan)} baris.`);
    expect(badan).toContain(`\`DELETE\` di Before melaporkan ${perBulan} baris berubah`);
    const after = widget.panels.after!.setup!;
    expect(hitung(after, /CREATE TABLE posting_\d\d /g)).toBe(12);
    expect(hitung(after, /x < (\d+)\)/g)).toBe(12);
    expect(widget.panels.before!.steps.map((s) => s.sql.split(" ")[0])).toEqual(["EXPLAIN", "SELECT", "DELETE", "SELECT"]);
    expect(widget.panels.after!.steps.map((s) => s.sql.split(" ")[0])).toEqual(["EXPLAIN", "SELECT", "DROP", "SELECT"]);
    expect(widget.toggles).toHaveLength(1);
    expect(widget.toggles[0]!.label).toBe("query bulan April tidak menyebut tabel bulan");
    expect(badan).toContain("<WidgetLama nama=\"runsql\" src=\"data/t5-partisi.json\" />");
    expect(badan).toContain('<SkripLama daftar={["runsql-core","runsql"]} />');
    expect(badan).toContain("centang kotak di atas kedua panel, lalu tekan Jalankan ulang");
    expect(widget.title).toBe("Posting 12 bulan, 10.000 baris per bulan (SQLite, Simulasi)");
    expect(widgetMentah).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+/);
    expect(badan).toContain("Widget ini menjalankan SQLite sungguhan di browser, bukan PostgreSQL.");
  });
  test("ADR 49: opsi A sampai E, tabel enam kolom konsisten, delapan aturan, tiga pre-mortem, enam butir Kapan salah, lima butir Sengaja belum; sama dengan naskah", () => {
    const adr = badan.slice(badan.indexOf("### ADR 49"), badan.indexOf("### Sengaja belum dilakukan"));
    const tabel = adr.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel).toHaveLength(7); // header, pemisah, lima baris
    for (const b of tabel) expect(sel(b), b).toHaveLength(6);
    expect(sel(tabel[0]!)).toEqual(["", "A. Satu tabel dan index", "B. Sharding", "C. Database ledger khusus", "D. Partisi hash", "E. Partisi per bulan"]);
    expect(tabel.slice(2).map((b) => sel(b)[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    // lima opsi naskah: satu tabel dan index, sharding, database ledger khusus (TigerBeetle), partisi hash, ditambah partisi per bulan
    for (const k of ["Tetap satu tabel dan index", "sharding per wilayah atau per buku", "database ledger khusus (TigerBeetle", "partisi hash"]) expect(barisAdr49, k).toContain(k);
    expect(adr.match(/^\d+\. /gm)!.length).toBe(8 + 3);
    expect(cocok(adr, /\*\*Keputusan: opsi E\.\*\* Delapan aturan:/)).not.toBeNull();
    expect(cocok(adr, /\*\*Pre-mortem\.\*\* Bayangkan keputusan ini gagal 6 bulan lagi\. Tiga penyebab yang paling mungkin:/)).not.toBeNull();
    const salah = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Yang akan merevisinya.**"));
    expect(hitung(salah, /^- /gm)).toBe(6);
    expect(adr).toContain("**Belum diputuskan.** Tiga hal ini pertanyaan terbuka, bukan aturan.");
    for (const a of ["A ditolak", "B ditolak untuk sekarang", "C ditolak", "D ditolak"]) expect(adr, a).toContain(`**${a}**`);
    const sengaja = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf('<Blok nama="Kunci">')).split("\n").filter((b) => b.startsWith("|"));
    expect(sengaja).toHaveLength(7);
    for (const b of sengaja) expect(sel(b), b).toHaveLength(3);
    // naskah: partisi lebih dari 13 bulan (Asumsi), tanpa partisi default, PRIMARY KEY (id, dibuat), 69,4, 219 juta, 36,5 juta dan 9,1 GB
    expect(barisAdr49).toContain("Partisi lebih dari 13 bulan (Asumsi) dilepas di luar blok transaction");
    expect(barisAdr49).toContain("tanpa partisi default supaya `DETACH PARTITION ... CONCURRENTLY` boleh dipakai");
    expect(barisAdr49).toContain("Satu primary tidak menampung 69,4 transaksi uang per detik untuk tulis: partisi tidak menambah kapasitas tulis");
    expect(barisAdr49).toContain("jendela koreksi (belum ada di PRD v5) harus lebih pendek dari 13 bulan");
    expect(adr).toContain("Partisi yang lebih tua dari 13 bulan (Asumsi) dilepas dengan `DETACH ... CONCURRENTLY` di luar blok transaction");
    expect(adr).toContain("Saat satu primary tidak menampung tulis 69,4 transaksi uang per detik (46,3 dengan dua transaksi; Hitungan atas Asumsi).");
    expect(adr).toContain("Tabel `jurnal` 219 juta baris per tahun (146 juta dengan dua transaksi; Hitungan atas Asumsi)");
    expect(adr).toContain("Satu bulan di skala naskah 36,5 juta posting dan 9,1 GB (Hitungan atas Asumsi)");
    expect(adr).toContain("Pemeriksaan tanpa snapshot menandai 10.061 dari 10.288 buku");
    expect(m43).toContain("10.061 dari 10.288 buku");
    expect(lepas).toContain("cek cache: 10288 buku diperiksa, 10061 tidak cocok");
    expect(dari("t5-adr-60").ada).toBe(true);
    expect(adr).not.toMatch(/\[\[t5-m4[4-9]\]\]/);
  });
  test("Cek diri: empat soal dengan jawaban yang menunjuk bagian rekaman; empat jawaban memakai kode status rekaman", () => {
    const kunci = badan.slice(badan.indexOf('<Blok nama="Kunci">'));
    expect(hitung(kunci, /^\*\*\d\.\*\* /gm)).toBe(4);
    expect(hitung(kunci, /<details class="success">/g)).toBe(4);
    for (const kode of ["0A000", "25001", "55000", "42501"]) expect(kunci, kode).toContain(kode);
    expect(pC.teks).toContain("SQLSTATE 0A000");
    expect(lC.teks).toContain("SQLSTATE 25001");
    expect(lC.teks).toContain("SQLSTATE 55000");
    expect(lC.teks).toContain("SQLSTATE 42501");
    expect(kunci).toContain("(`pruning.txt` bagian C)");
    expect(kunci).toContain("(`lepas.txt` bagian C)");
    expect(kunci).toContain("(`pasang.txt` bagian A dan C)");
    expect(kunci).toContain("Tidak. Partisi memangkas bacaan dan memudahkan retensi, tetapi tidak menambah kapasitas tulis, dan lab tidak mengklaimnya (README lab).");
    expect(hitung(kunci, /^- \[ \] /gm)).toBe(7);
    expect(kunci).toContain("### Saat me-review kode AI, cek ini");
    expect(kunci).toContain("### Bacaan lanjut");
    expect(hitung(kunci.slice(kunci.indexOf("### Bacaan lanjut")), /^- \[/gm)).toBe(8);
  });
  test("hasil tanpa JavaScript: noscript memuat angka widget; ID riset, nomor keputusan, dan PR tidak tampil", () => {
    const ns = cocok(badan, /<noscript>\n<p>([\s\S]*?)<\/p>\n<\/noscript>/)[1]!;
    expect(ns).toBe("Tanpa JavaScript widget tidak berjalan. Hasilnya: query bulan April memindai tabel berisi 120.000 baris di Before dan tabel berisi 10.000 baris di After. Sesudah Januari dibuang, kedua panel menyisakan 110.000 baris. Bila query April tidak menyebut tabel bulan, panel After memindai 12 tabel berisi 120.000 baris.");
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/keputusan \d{3,4}|PR #?\d{3}|tinjauan PR/i);
    for (const t of tag) expect(t).not.toMatch(/R\d-\d+/);
    for (const k of [pA, pB, pC, lA, lB, lC, lE, lG, aA, aB, aC, aD]) expect(k.teks).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+/);
  });
});

describe("struktur: judul bagian dan sel kunci tabel ADR", () => {
  test("daftar judul bagian dan tingkatnya: satu Inti, lima judul Paham dan Putuskan, tiga judul Kunci", () => {
    const judul = [...badan.matchAll(/^(#{2,6}) (.+)$/gm)].map((m) => `${m[1]!.length} ${m[2]}`);
    expect(judul).toEqual([
      "2 Inti", "3 Kenapa ini ada", "3 Cara kerjanya", "3 Di stack lain", "3 ADR 49: `posting` dipartisi per bulan, bulan lama dilepas dan diarsipkan",
      "3 Sengaja belum dilakukan", "3 Cek diri", "3 Saat me-review kode AI, cek ini", "3 Bacaan lanjut",
    ]);
    expect(badan.match(/^\*\*[^*\n]+\*\*/gm)!.length).toBeGreaterThanOrEqual(20);
  });
  test("sel kunci tabel ADR: tiap opsi memuat kata dari sumbernya (rekaman, dokumentasi, atau label penalaran)", () => {
    const adr = badan.slice(badan.indexOf("### ADR 49"), badan.indexOf("### Sengaja belum dilakukan"));
    const t = adr.split("\n").filter((b) => b.startsWith("|")).map(sel);
    const kolom = (baris: string): string[] => t.find((r) => r[0] === baris)!.slice(1);
    const [a, b, c, d, e] = kolom("Cara kerja");
    expect(a).toContain("tetap satu tabel");
    expect(b).toContain("beberapa instance");
    expect(c).toContain("TigerBeetle");
    expect(d).toContain("hash `buku_id`");
    expect(e).toContain("per bulan menurut `dibuat`");
    const kurang = kolom("Kekurangan");
    expect(kurang[0]).toContain("Ledger menolak DELETE");
    expect(kurang[1]).toContain("(penalaran)");
    expect(kurang[3]).toContain("Tiap partisi berisi semua bulan");
    expect(kurang[4]).toContain("PRIMARY KEY memuat `dibuat`");
    const bukti = kolom("Bukti");
    expect(bukti[0]).toBe("Rekaman lab `snapshot.txt` bagian A dan `lepas.txt` bagian B");
    expect(bukti[1]).toBe("Tidak dijalankan: dibahas di [[t5-adr-60]]");
    expect(bukti[2]).toBe("Tidak dijalankan: TigerBeetle hanya disebut");
    expect(bukti[3]).toBe("Tidak dijalankan: definisi di dokumentasi PostgreSQL 17");
    expect(bukti[4]).toBe("Rekaman lab `pruning.txt`, `lepas.txt`, `pasang.txt`, `snapshot.txt`");
    expect(kolom("Biaya operasional")[0]).toBe("Pemeriksaan membaca 1.800.000 dari 1.800.000 posting di lab");
    expect(readme).toContain("Tanpa snapshot: 1.800.000 baris dari 1.800.000.");
    expect(snap).toContain("# Baris posting dibaca: 1.800.000 dari 1.800.000 posting di tabel.");
    for (const f of ["pruning.txt", "lepas.txt", "pasang.txt", "snapshot.txt"]) expect(readme).toContain(`output/${f}`);
  });
});

describe("rentang Snippet diturunkan dari struktur rekaman dan kode", () => {
  test("enam belas Snippet berkas: berkas, rentang, dan judul sama dengan penanda di sumber; tiga kode inline", () => {
    expect(tag).toHaveLength(16);
    const P = "labs/t5-partisi/output/pruning.txt", L = "labs/t5-partisi/output/lepas.txt", A = "labs/t5-partisi/output/pasang.txt", M = "labs/api-t5/migrasi/000024_posting_partisi.up.sql";
    const bagianDari = (isi: string, huruf: string): number => bagianRekaman(isi, huruf).awal;
    const r = (isi: string, awalOk: (b: string) => boolean, akhirOk: (b: string) => boolean, dari = 1, plus = 0): string => {
      const a = nomor(isi, awalOk, dari);
      return `${a}:${nomor(isi, akhirOk, a) + plus}`;
    };
    const mulaiFungsi = nomor(migrasi24, (b) => b.startsWith("CREATE FUNCTION buat_partisi_posting("));
    const akhirFungsi = nomor(migrasi24, (b) => b === "END $$;", mulaiFungsi);
    const mulaiTabel = nomor(migrasi24, (b) => b === "CREATE TABLE posting (");
    const akhirTabel = nomor(migrasi24, (b) => b === ") PARTITION BY RANGE (dibuat);", mulaiTabel);
    const trunc = nomor(pasang, (b) => b.startsWith("ERROR:  TRUNCATE pada posting_pulih ditolak"), bagianDari(pasang, "B"));
    const harap: [string, string, string][] = [
      [P, r(pruning, (b) => b.startsWith("=> SELECT tableoid::regclass AS partisi"), (b) => b.startsWith("# 14 partisi di katalog:"), bagianDari(pruning, "A")), "Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian A (partisi dan jumlah posting)"],
      [M, `${mulaiFungsi}:${akhirFungsi}`, `Kode lab: labs/api-t5/migrasi/000024_posting_partisi.up.sql baris ${mulaiFungsi} sampai ${akhirFungsi} (buat_partisi_posting)`],
      [P, r(pruning, (b) => b.startsWith("=> EXPLAIN (COSTS OFF) SELECT sum(jumlah) FROM posting WHERE dibuat >="), (b) => b.startsWith("# Dibaca: 1 dari 14 partisi"), bagianDari(pruning, "B")), "Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian B (query satu bulan)"],
      [P, r(pruning, (b) => b.startsWith("# Mencari satu baris dengan id saja"), (b) => b.startsWith("# id tidak memuat kolom kunci partisi")), "Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian B (pencarian id)"],
      [P, r(pruning, (b) => b.startsWith("=> CREATE TABLE coba_partisi"), (b) => b === "(1 row)", bagianDari(pruning, "C"), 0), "Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian C (PRIMARY KEY dan UNIQUE)"],
      [P, r(pruning, (b) => b.startsWith("=> INSERT INTO posting (id, jurnal_id"), (b) => b === "(1 row)", bagianDari(pruning, "C")), "Rekaman lab: labs/t5-partisi/output/pruning.txt, bagian C (id ganda diterima)"],
      [A, `${nomor(pasang, (b) => b.startsWith("# Tiga trigger baris dikloning"), bagianDari(pasang, "B"))}:${trunc + 1}`, "Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian B (penjaga TRUNCATE di partisi hasil ATTACH)"],
      [A, `${nomor(pasang, (b) => b.startsWith("=> INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES ((SELECT min(id) FROM jurnal)"), bagianDari(pasang, "D"))}:${nomor(pasang, (b) => b.startsWith("   -- SQLSTATE 23514"), bagianDari(pasang, "D"))}`, "Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian D (bulan tanpa partisi)"],
      [L, r(lepas, (b) => b.startsWith("=> DELETE FROM posting_lalu_05 WHERE jumlah > 0"), (b) => b.startsWith("# Trigger append-only tidak menyala untuk DROP atau DETACH"), bagianDari(lepas, "B")), "Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian B (DELETE, DETACH, dan DROP)"],
      [L, r(lepas, (b) => b === "=> ALTER TABLE posting DETACH PARTITION posting_lalu_05 CONCURRENTLY", (b) => b.startsWith("# Posting yang terlihat lewat tabel induk: 140.000 dari 168.000"), bagianDari(lepas, "C")), "Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian C (DETACH CONCURRENTLY dan batasnya)"],
      [L, r(lepas, (b) => b.startsWith("=> SELECT conname, pg_get_constraintdef(oid) AS definisi"), (b) => b.startsWith("# yang tadinya ikut dari tabel induk. Hanya penjaga TRUNCATE"), bagianDari(lepas, "C")), "Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian C (CHECK dan trigger sesudah DETACH)"],
      [L, r(lepas, (b) => b === "=> CREATE TABLE posting_pulih (LIKE posting INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)" || b === "=> CREATE TABLE posting_pulih (LIKE posting INCLUDING DEFAULTS INCLUDING INDEXES)", (b) => b.startsWith("# File ada di $TMP/t5-partisi-arsip"), bagianDari(lepas, "E")), "Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian E (arsip dan pemulihan)"],
      [A, r(pasang, (b) => b.startsWith("# Percobaan 0:"), (b) => b.startsWith("# PostgreSQL memindai tabel ('verifying table')"), bagianDari(pasang, "A")), "Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian A (ATTACH tanpa dan dengan CHECK bawaan)"],
      [A, r(pasang, (b) => b.startsWith("=> CREATE TABLE posting_pulih2"), (b) => b.startsWith("# Batas partisi tidak dipindai lagi"), bagianDari(pasang, "C")), "Rekaman lab: labs/t5-partisi/output/pasang.txt, bagian C (CHECK literal sama dengan batas partisi)"],
      [L, r(lepas, (b) => b.startsWith("# jurnal bulan yang masih terpasang:"), (b) => b.startsWith("# transaction dibuka, tanpa galat database di log server"), bagianDari(lepas, "G")), "Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian G (jurnal pembalik atas bulan terpasang dan bulan dilepas)"],
      [M, `${mulaiTabel}:${akhirTabel}`, "labs/api-t5/migrasi/000024_posting_partisi.up.sql"],
    ];
    expect(berkasSnippet).toEqual(harap.map((h) => h[0]));
    expect(lines).toEqual(harap.map((h) => h[1]));
    expect(judulSnippet).toEqual(harap.map((h) => h[2]));
    // tampilan Snippet tidak membawa komentar lab internal, nomor keputusan, atau ID riset
    harap.forEach(([f, rg]) => {
      const [a, b] = rg.split(":").map(Number);
      expect(teksBaris(baca(f), a!, b!), `${f} ${rg}`).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+|tinjauan|mutan/i);
    });
    // tiga rentang berlabel kode memuat bagian yang diklaim halaman
    expect(teksBaris(migrasi24, mulaiFungsi, akhirFungsi)).toContain("posting_tidak_dikosongkan");
    expect(teksBaris(migrasi24, mulaiTabel, akhirTabel)).toContain("PRIMARY KEY (id, dibuat)");
    expect(kodeInline).toHaveLength(3);
  });
});

// ---- penjaga tambahan peninjau (keputusan 1543): turunan dari sumber, aktif juga pada putaran TANPA_KUNCI=1 ----------------
// Sebab: mutasi peninjau (639 mutan baru) menemukan celah turunan yang hanya tertutup kunci kalimat: URL tautan eksternal tidak
// diturunkan dari mana pun (21 dari 21 lolos tanpa kunci), huruf dan nama berkas rekaman di kutipan "(`berkas` bagian X)" tidak
// dicocokkan dengan isi bagian itu (14 lolos), paragraf ganda lolos karena `toContain` puas dengan satu kemunculan, angka prosa
// tidak dicek terhadap sumber (±half lolos), dan satu baris rekaman snapshot.txt (8,3%) tidak dibaca. Kalimat naratif bebas
// (kata "tidak", kata penuh, kata bilangan, urutan paragraf) tetap hanya terjaga kunci kalimat: itu batas penjaga ini.
describe("penjaga tambahan peninjau: tautan, kutipan bagian, paragraf ganda, angka prosa", () => {
  const lF = bagianRekaman(lepas, "F"), sA = bagianRekaman(snap, "A");
  test("tautan eksternal: tiap alamat di halaman tercatat di baris riset 160 sampai 163 (diturunkan dari riset, bukan dari daftar halaman)", () => {
    const korpus = [160, 161, 162, 163].map((n) => barisRiset(`R5-${n}`)).join("\n");
    const url = [...badan.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]!);
    expect(url.length).toBe(21);
    for (const u of url) expect(korpus, `alamat ${u} tidak ada di baris riset`).toContain(u.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, ""));
    expect(new Set(url).size).toBe(8);
    // tiap alamat bertanggal akses 2026-11-03 di halaman memuat tanggal itu di teks tautannya
    for (const m of badan.matchAll(/\[PostgreSQL 17, ([^\]]+)\]\((https:[^)]+)\), dibuka (\d{4}-\d{2}-\d{2})/g)) expect(m[3]).toBe("2026-11-03");
  });
  test("kutipan bagian rekaman: tiap kalimat yang menyebut (`berkas` bagian X) memuat bukti yang benar-benar ada di bagian itu", () => {
    const tabel: [string, [string, string | RegExp][]][] = [
      ["`pruning.txt` bagian B, `posting` punya 14 partisi dan query satu bulan hanya membaca `posting_lalu_04`", [[pB.teks, "# Dibaca: 1 dari 14 partisi (posting_lalu_04)."]]],
      ["ditolak dengan SQLSTATE 23001 (`lepas.txt` bagian B).", [[lB.teks, "SQLSTATE 23001"]]],
      ["membaca 14 dari 14 partisi (`pruning.txt` bagian B).", [[pB.teks, "# Dibaca: 14 dari 14 partisi: 12 partisi berisi"]]],
      ["UPDATE yang sama ditolak lagi (`pasang.txt` bagian B).", [[aB.teks, "UPDATE 28000"], [aB.teks, "UPDATE pada posting_pulih ditolak"]]],
      ["0 baris berbeda (`lepas.txt` bagian A).", [[lA.teks, "# Snapshot dibandingkan dengan hitungan langsung atas tabel posting: 0 baris berbeda."]]],
      ["DETACH hanya dijaga hak pemilik tabel (`lepas.txt` bagian B).", [[lB.teks, "yang menahannya di sini hak"]]],
      ["menandai 0 (`lepas.txt` bagian F", [[lF.teks, "cek cache: 10288 buku diperiksa, 10061 tidak cocok"], [lF.teks, "10288 buku diperiksa, 0 tidak cocok"]]],
      ["nilai waktunya tidak direkam (`lepas.txt` bagian D).", [[lD.teks, "# Nilai waktunya tidak direkam."]]],
      ["Semua baris tabel itu dari `pasang.txt` bagian A dan C.", [[aA.teks, "SQLSTATE 42804"], [aA.teks, 'verifying table "posting_pulih"'], [aC.teks, "is implied by existing constraints"], [aC.teks, 'verifying table "posting_pulih5"']]],
      ["Rekaman lab `snapshot.txt` bagian A dan `lepas.txt` bagian B |", [[sA.teks, "# Baris posting dibaca: 1.800.000 dari 1.800.000 posting di tabel."], [lB.teks, "SQLSTATE 23001"]]],
      ["ditolak dengan 23514 (`pasang.txt` bagian D).", [[aD.teks, "SQLSTATE 23514"], [aD.teks, 'no partition of relation "posting" found for row']]],
      ["muncul tiga kali di rekaman (`pruning.txt` bagian C).", [[pC.teks, /baris_dengan_id_itu\n-+\n 3\n/], [pC.teks, "SQLSTATE 0A000"]]],
      ["Role aplikasi ditolak 42501 karena hak (`lepas.txt` bagian C).", [[lC.teks, "# Role aplikasi (api_t5) ditolak karena hak (42501)"], [lC.teks, "SQLSTATE 25001"], [lC.teks, "SQLSTATE 55000"]]],
      ["tetap memindai (`pasang.txt` bagian A dan C).", [[aA.teks, 'DEBUG:  verifying table "posting_pulih"'], [aC.teks, "NOT VALID"], [aC.teks, "interval '1 day')"], [aC.teks, 'verifying table "posting_pulih3"']]],
    ];
    for (const [kalimat, bukti] of tabel) {
      expect(hitung(badan, new RegExp(kalimat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), `kutipan harus muncul sekali: ${kalimat}`).toBe(1);
      for (const [bagian, frasa] of bukti) {
        if (typeof frasa === "string") expect(bagian, `bukti tidak ada di bagian itu: ${frasa}`).toContain(frasa);
        else expect(bagian, `bukti tidak ada di bagian itu: ${frasa}`).toMatch(frasa);
      }
    }
    // tiap kutipan "(`berkas` bagian X" di prosa atau tabel (bukan judul Snippet) sudah terdaftar di tabel di atas
    const prosaTanpaSnippet = badan.split("\n").filter((b) => !b.includes("<Snippet")).join("\n");
    const kutipan = [...prosaTanpaSnippet.matchAll(/`(?:pruning|lepas|pasang|snapshot)\.txt` bagian [A-G]/g)];
    expect(kutipan.length).toBe(15);
    for (const k of kutipan) expect(tabel.some(([kal]) => kal.includes(k[0])), `kutipan belum punya bukti: ${k[0]}`).toBe(true);
  });
  test("snapshot.txt memuat 150.000 dari 1.800.000 dan 8,3%, sama dengan kalimat halaman dan hitungan dari 12 bulan", () => {
    expect(snap).toContain("# Baris posting dibaca: 150.000 dari 1.800.000, yaitu 8,3% (satu bulan dari 12).");
    expect(badan).toContain("150.000 dari 1.800.000 posting di lab, yaitu 8,3%");
    expect(bulat((150000 / (12 * 150000)) * 100, 1)).toBe(8.3);
    expect(snap).toContain("# Baris posting dibaca: 1.800.000 dari 1.800.000 posting di tabel.");
  });
  test("tanpa paragraf, butir, atau sel prosa ganda di badan halaman (toContain puas dengan satu kemunculan)", () => {
    const panjang = badan.split("\n").map((b) => b.trim()).filter((b) => b.length > 60 && !b.startsWith("<") && !b.startsWith("```") && !b.startsWith("|---"));
    const ganda = panjang.filter((b, i) => panjang.indexOf(b) !== i);
    expect(ganda).toEqual([]);
  });
  test("angka di prosa dan tabel: tiap angka tercatat di sumber yang dibaca halaman (rekaman, README, migration, halaman tetangga, naskah, riset, widget)", () => {
    const sumber = [pruning, lepas, pasang, snap, readme, migrasi24, m43, skemaHal, prd5, widgetMentah, barisBeban, barisAdr49, barisM43, [160, 161, 162, 163, 164].map((n) => barisRiset(`R5-${n}`)).join("\n")].join("\n");
    const norm = (s: string): string => (/^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s.replace(",", "."));
    const ada = new Set([...sumber.matchAll(/(?<![\w_])\d[\d.,]*\d(?![\w_])|(?<![\w_.,])\d(?![\w_.,])/g)].flatMap((m) => {
      const n = Number(norm(m[0]));
      // bentuk "juta" di halaman: 146.000.000 di riset ditulis 146 juta di halaman
      const juta = n >= 1e6 ? [String(Math.round(n / 1e5) / 10), String(Math.round(n / 1e6))] : [];
      return [m[0], norm(m[0]), ...juta];
    }));
    // angka hitungan atau bilangan penomoran yang tidak ada di sumber: asalnya ditulis di halaman atau naskah (daftar pendek, tiap butir beralasan)
    const izin = new Set([
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", // bilangan kecil: penomoran butir, "bulan ke-3", "tiga trigger"
    ]);
    const prosa = badan.split("\n").filter((b) => !b.includes("<Snippet") && !b.startsWith("import") && !b.startsWith('<p class="meta">') && !b.startsWith("<Blok") && !b.startsWith("|---") && !b.startsWith("<TabSet"))
      .map((b) => b.replace(/\]\([^)]*\)/g, "]").replace(/\[\[[^\]]*\]\]/g, "").replace(/\d{4}-\d{2}-\d{2}/g, "").replace(/\b\d+\.\d+(\.\d+)*\b(?=[\],])/g, ""));
    const tak: string[] = [];
    for (const b of prosa) for (const m of b.matchAll(/(?<![\w_])\d[\d.,]*\d(?![\w_])|(?<![\w_.,])\d(?![\w_.,])/g)) {
      const a = m[0].replace(/[.,]$/, "");
      if (izin.has(a)) continue;
      if (!ada.has(a) && !ada.has(norm(a))) tak.push(`${a} di: ${b.slice(0, 70)}`);
    }
    expect(tak).toEqual([]);
  });
});

// TANPA_KUNCI=1 melewati blok ini (kunci kalimat dan sidik) supaya uji mutasi bisa menilai tes turunan sendirian (putaran TANPA kunci).
describe.skipIf(process.env.TANPA_KUNCI === "1")("kunci: kalimat, sidik, kata penuh, dan baris riset", () => {
  test("setiap baris badan sama dengan KALIMAT_TERKUNCI, urut dan utuh", () => {
    const kalimat = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const beda = kalimat.findIndex((k, i) => k !== KALIMAT_TERKUNCI[i]);
    expect(beda === -1 ? "" : `baris ${beda + 1}: ${kalimat[beda]} ≠ ${KALIMAT_TERKUNCI[beda]}`).toBe("");
    expect(kalimat).toHaveLength(KALIMAT_TERKUNCI.length);
    expect(new Set(KALIMAT_TERKUNCI.filter((k) => k.length > 60 && !k.startsWith("<") && !k.startsWith("|") && !k.startsWith("```"))).size).toBe(KALIMAT_TERKUNCI.filter((k) => k.length > 60 && !k.startsWith("<") && !k.startsWith("|") && !k.startsWith("```")).length); // tak ada kalimat prosa ganda
  });
  test("sidik: frontmatter, lima baris riset, diagram, widget, tiap Snippet berkas dan kode inline", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(sidik(widgetMentah)).toBe(SIDIK.widget);
    const sn = tag.map((t, i) => {
      const [a, b] = lines[i]!.split(":").map(Number);
      return sidik(teksBaris(baca(berkasSnippet[i]!), a!, b!));
    });
    expect(sn).toEqual(SIDIK.snippet);
    expect(kodeInline.map((k) => sidik(k.kode))).toEqual(SIDIK.kode);
  });
  test("nilai daun diagram dan widget dan baris riset utuh sama dengan yang dikunci", () => {
    const daun = (o: unknown, j = ""): [string, string | number | boolean][] =>
      typeof o === "string" || typeof o === "number" || typeof o === "boolean" ? [[j, o]] : Array.isArray(o) ? o.flatMap((v, i) => daun(v, `${j}[${i}]`)) : o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => daun(v, `${j}.${k}`)) : [];
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(widget)).toEqual(WIDGET_DAUN);
    expect(IDS.map(barisRiset)).toEqual(RISET_TERKUNCI);
  });
  test("baris riset: lima ID berurutan 160 sampai 164, tanpa ID ganda di berkas, di antara R5-159 dan R5-165 (rentang, bukan tetangga langsung)", () => {
    const urut = riset.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R5-(\d+) \|/)![1]));
    expect(new Set(urut).size).toBe(urut.length);
    const i = urut.indexOf(160);
    expect(urut.slice(i, i + 5)).toEqual([160, 161, 162, 163, 164]);
    expect(urut.indexOf(159)).toBeLessThan(i);
    expect(urut.indexOf(165)).toBeGreaterThan(i + 4);
    for (const id of IDS) expect(barisRiset(id).split("|")).toHaveLength(7); // lima kolom
  });
  test("kata penuh dihitung: hanya, tidak ada, tidak pernah, semua, setiap, selalu, tiap sama dengan yang ditinjau", () => {
    const k = SIDIK.kata;
    expect(hitung(badan, /\bhanya\b/gi)).toBe(k.hanya);
    expect(hitung(badan, /\btidak ada\b/gi)).toBe(k.tidakAda);
    expect(hitung(badan, /\btidak pernah\b/gi)).toBe(k.tidakPernah);
    expect(hitung(badan, /\bsemua\b/gi)).toBe(k.semua);
    expect(hitung(badan, /\bsetiap\b/gi)).toBe(k.setiap);
    expect(hitung(badan, /\bselalu\b/gi)).toBe(k.selalu);
    expect(hitung(badan, /\btiap\b/gi)).toBe(k.tiap);
    // kalimat "tidak pernah dihapus dengan DELETE" dibatasi lingkupnya (aturan ledger), dan "tidak ada event trigger" berlingkup lab
    expect(badan).toContain("Posting tidak pernah dihapus dengan DELETE.");
    expect(badan).toContain("Di lab tidak ada event trigger");
    expect(badan).toContain("kata partition tidak muncul di halaman Migrations itu.");
  });
});
