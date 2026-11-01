// Penjaga halaman 5.10 (keputusan 1536 sampai 1538): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, skenario alur t5-m43.json, baris riset, dan kartu Cek diri di
// m43-pemeriksaan-saldo.mdx diturunkan dari rekaman labs/t5-partisi (snapshot.txt, lepas.txt, pruning.txt, testing.txt), kode lab api-t5
// (repo/ledger.go, repo/snapshot.go, repo/riwayat.go, service/snapshot_test.go), README lab, naskah Tahap 5, registry, baris riset, dan
// halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 4.31): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas nilai) mengunci SETIAP
// baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap SALAHNYA kalimat;
// elemen non-prosa (frontmatter, judul Snippet, diagram, skenario, baris riset) dikunci dengan sidik jari di berkas nilai; tabel
// Hitungan dihitung ulang dari rumusnya sendiri dengan pembulatan setengah ke atas.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-m43-baca-posting.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./m43-pemeriksaan-saldo.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-5/m43-pemeriksaan-saldo.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t5-m43.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const snap = baca("labs/t5-partisi/output/snapshot.txt");
const lepas = baca("labs/t5-partisi/output/lepas.txt");
const pruning = baca("labs/t5-partisi/output/pruning.txt");
const testing = baca("labs/t5-partisi/output/testing.txt");
const readme = baca("labs/t5-partisi/README.md");
const ledgerGo = baca("labs/api-t5/internal/repo/ledger.go");
const snapshotGo = baca("labs/api-t5/internal/repo/snapshot.go");
const riwayatGo = baca("labs/api-t5/internal/repo/riwayat.go");
const snapshotTes = baca("labs/api-t5/internal/service/snapshot_test.go");
const migrasi24 = baca("labs/api-t5/migrasi/000024_posting_partisi.up.sql");
const prd5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal26 = baca("situs/src/content/docs/tahap-2/saldo-bukan-kolom.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian?: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[] }
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
const IDS = ["R5-155", "R5-156", "R5-157", "R5-158", "R5-159"];

// ---- rekaman: bagian dan nomor baris ---------------------------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 0): number => {
    const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // 1-based seperti Snippet
  };
  const teks = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
  return { baris, nomor, teks };
};
const bagianRekaman = (isi: string, huruf: string): { awal: number; teks: string } => {
  const baris = isi.split("\n");
  const a = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(a, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const z = baris.findIndex((b, n) => n > a && /^# --- [A-Z]\d?\. /.test(b));
  return { awal: a + 1, teks: baris.slice(a, z < 0 ? baris.length : z).join("\n") };
};
const S = bagian(snap), L = bagian(lepas);
const sA = bagianRekaman(snap, "A"), sB = bagianRekaman(snap, "B"), sC = bagianRekaman(snap, "C"), sD = bagianRekaman(snap, "D");
const lB = bagianRekaman(lepas, "B"), lC = bagianRekaman(lepas, "C"), lD = bagianRekaman(lepas, "D"), lE = bagianRekaman(lepas, "E"), lF = bagianRekaman(lepas, "F");

// ---- kode lab --------------------------------------------------------------------------------------------------------
const G = bagian(ledgerGo);
const gAwal = G.nomor((b) => b.startsWith("func (r Repo) CekCache("));
const gAkhir = G.nomor((b) => b === "}", gAwal);
const SG = bagian(snapshotGo);
const sgFungsi = SG.nomor((b) => b.startsWith("func (r Repo) CekCacheSnapshot("));
const sgAwal = SG.nomor((b) => b.includes("rows, err := r.db.QueryContext(ctx, `"), sgFungsi);
const sgAkhir = SG.nomor((b) => b.includes("`, tanggal.String, ke)"), sgAwal);
const kodeCek = G.teks(gAwal, gAkhir);
const kodeSnapQuery = SG.teks(sgAwal, sgAkhir);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]!);

// ---- angka: registry, naskah, rekaman --------------------------------------------------------------------------------
const asumsi = (cerita.tahap[4] as unknown as { asumsi: Record<string, number> }).asumsi;
const barisM43 = naskah.split("\n").find((b) => b.startsWith("| M43 |"))!;
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Data posting |"))!;
const barisPemeriksaan = naskah.split("\n").find((b) => b.startsWith("| Pemeriksaan saldo malam |"))!;
const AKTIF = (asumsi.user! * asumsi.aktif!) / 100; // 200.000
const TRX = Number(cocok(barisBeban, /200\.000 × (\d) × 2 × 365 = 438 juta/)[1]); // 3 (naskah); registry trx 2 di sebelahnya
const BYTE = Number(cocok(barisBeban, /(\d+) B per posting/)[1]); // 250
const POSTING_TAHUN = AKTIF * TRX * 2 * 365;
const POSTING_TAHUN_2 = AKTIF * asumsi.trx! * 2 * 365;
const GB_TAHUN = (POSTING_TAHUN * BYTE) / 1e9;
const GB_TAHUN_2 = (POSTING_TAHUN_2 * BYTE) / 1e9;
const BATAS_GB = Number(cocok(barisM43, /batas satu tabel (\d+) TB/)[1]) * 1000; // 32 TB, 1 TB = 1.000 GB (naskah: 32.000 ÷ 109,5)
const POSTING_PER_BULAN_LAB = angka(cocok(pruning, /bulan berjalan, (\d+\.\d+) posting per bulan/)[1]!);
const BARIS_PRUNING_A = bagianRekaman(pruning, "A").teks.split("\n").filter((b) => /^ posting_(bulan|lalu)_\d\d\s+\| \d+$/.test(b));
const TOTAL_LAB = POSTING_PER_BULAN_LAB * BARIS_PRUNING_A.length;
const BUKU_LAB = Number(cocok(sA.teks, /cek cache: (\d+) buku diperiksa, 0 tidak cocok/)[1]);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.10 ada, masalah, jalur inti, prasyarat 2.7 lalu 5.3 (urutan ini menjaga baris meta tidak membungkus berbeda saat font tukar), lab t5-partisi, peran backend; judul sama dengan peta naskah; menit = baca + coba", () => {
    expect(dari("t5-m43")).toMatchObject({ ada: true, nomor: "5.10", jenis: "masalah", inti: true, prasyarat: ["t2-ledger", "t5-skema"], lab: ["t5-partisi"], tahap: 5, peran: ["backend"] });
    expect(dari("t5-skema").nomor).toBe("5.3");
    expect(dari("t2-ledger").nomor).toBe("2.7");
    expect(frontmatter).toContain('title: "5.10 M43: Pemeriksaan saldo harian selesai pukul 14.20"');
    expect(dari("t5-m43").judul).toBe("M43: Pemeriksaan saldo harian selesai pukul 14.20");
    expect(naskah).toContain("| 5.10 | 4 | M43: Pemeriksaan saldo harian selesai pukul 14.20 | Masalah | ★ | t5-partisi | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t2-ledger\]\], \[\[t5-skema\]\] · Jalur inti<\/p>/);
    expect(dari("t5-m43").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "t2-ledger", "t2-saldo-bukan-kolom", "t5-kms", "t5-partisi", "t5-prd", "t5-skema"]);
    const sesuai: [string, string, string][] = [
      ["t2-ledger", "2.7", "Ledger double-entry"], ["t2-saldo-bukan-kolom", "2.6", "Kenapa saldo bukan kolom"], ["t5-kms", "5.26", "Keamanan 12"],
      ["t5-partisi", "5.11", "Partisi tabel ledger dan snapshot saldo + ADR 49"], ["t5-prd", "5.1", "PRD v5"], ["t5-skema", "5.3", "Skema data"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("5.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("halaman tidak membuka isi 5.11 dan 5.26: ADR 49 dan ADR 57 masing-masing satu kali, tanpa pg_partman, SoftHSM, OpenBao, atau envelope", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 49", "ADR 57"]);
    expect(badan.match(/ADR 49/g)).toHaveLength(1);
    expect(badan.match(/ADR 57/g)).toHaveLength(1);
    expect(badan).not.toMatch(/pg_partman|SoftHSM|OpenBao|envelope|KEK|DETACH CONCURRENTLY|PRIMARY KEY|partisi DEFAULT|pruning/i);
  });
  test("aturan Pak Hadi dikutip dari PRD v5 dan jawaban Tahap 2 dari halaman 2.6: kalimatnya ada di halaman itu", () => {
    expect(prd5).toContain("Angka yang saya tanda tangani harus dibaca dari catatan yang sama dengan yang menggerakkan uang.");
    expect(hal26).toContain("Job malam membandingkan keduanya.");
    expect(hal26).toContain("kode yang salah menambah Rp5.000 ke cache tanpa posting, dan job malam menemukannya");
    expect(naskah).toContain("| Keuangan (Pak Hadi) | Laporan resmi dan tutup buku harian dari catatan yang sama dengan ledger |");
  });
});

describe("naskah M43: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M43 di naskah: minggu 5, 08.00, 14.20, target 06.00, p95 naik (Ilustrasi), disk dan CPU kurang, Nadia mengusulkan database khusus ledger", () => {
    expect(barisM43).toContain("| M43 | 5 |");
    expect(barisM43).toContain("Pak Hadi membuka laporan tutup buku harian pukul 08.00 dan belum ada.");
    expect(barisM43).toContain("selesai pukul 14.20, padahal target Pak Hadi pukul 06.00.");
    expect(barisM43).toContain("Sepanjang siang p95 pembayaran ikut naik (Ilustrasi).");
    expect(barisM43).toContain("| Disk dan CPU kurang. Nadia mengusulkan ledger pindah ke database khusus ledger |");
    for (const k of ["Minggu 5 Tahap 5.", "Pukul 08.00 Pak Hadi membuka laporan tutup buku harian", "padahal target Pak Hadi pukul 06.00.", "Sepanjang siang p95 pembayaran ikut naik.", "Raka menduga disk dan CPU database kurang. Nadia mengusulkan ledger pindah ke database khusus ledger."]) {
      expect(badan, k).toContain(k);
    }
    expect(badan).toContain("*Angka cerita (Ilustrasi):* pukul 08.00, 14.20, dan 06.00 serta kenaikan p95 berasal dari naskah, bukan dari rekaman.");
  });
  test("baris M43 di naskah: 438 juta (109,5 GB) setelah satu tahun, 1.314 juta setelah tiga, 32 TB, 292 tahun, index riwayat, posting tidak boleh dihapus", () => {
    expect(barisM43).toContain("438 juta baris (109,5 GB) setelah satu tahun dan 1.314 juta setelah tiga (Hitungan atas Asumsi).");
    expect(barisM43).toContain("Index riwayat `(buku_id, dibuat, id)` mempercepat satu akun, bukan pemeriksaan semua akun.");
    expect(barisM43).toContain("batas satu tabel 32 TB, 292 tahun data");
    expect(barisM43).toContain("Posting tidak boleh dihapus (aturan ledger)");
    expect(barisM43).toContain("mencocokkan `buku.saldo_cache` dengan jumlah posting tiap buku");
    expect(barisPemeriksaan).toContain("438 juta setelah 1 tahun dan 1.314 juta setelah 3 tahun.");
    expect(barisPemeriksaan).toContain("paling banyak 36,5 juta, atau 8,3% dari 438 juta di tahun pertama");
    expect(badan).toContain("438 juta baris setelah satu tahun (Asumsi).");
    expect(badan).toContain("| Posting dalam tiga tahun | 3 × 438 juta | 1.314 juta |");
  });
  test("tebakan: jawabannya ada di dalam details dan memuat jumlah baris rekaman, bukan snapshot (jawaban widget tidak bocor)", () => {
    const m = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]+?)<\/details>/);
    expect(m[1]).toBe("Tebak dulu: pemeriksaan itu menjumlah posting tiap buku. Berapa posting yang ia baca tiap malam?");
    expect(m[2]).toContain(`${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting di tabel`);
    expect(m[2]).toContain(`${fmt(POSTING_TAHUN / 1e6)} juta baris setelah satu tahun`);
    expect(m[2].replace("snapshot.txt", "")).not.toMatch(/snapshot|8,3|150\.000/i);
    const sebelum = badan.slice(0, badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(sebelum.includes(skenario.predict.options[skenario.predict.answer]!), "jawaban tebakan widget tertulis di blok sebelum Coba").toBe(false);
  });
  test("selisih lab dan naskah di README: 8,3% dipilih supaya satu bulan dari 12 sama dengan naskah; 36,5 juta tidak dijalankan; VACUUM hanya dijalankan skrip tanpa rekaman", () => {
    expect(readme).toContain("Angka itu dipilih supaya satu bulan dari 12 sama dengan 8,3% di naskah.");
    expect(readme).toContain("Posting per bulan di lab (150.000) lebih kecil dari 36,5 juta di naskah.");
    expect(readme).toContain("skala produksi (36,5 juta posting per bulan)");
    expect(badan).toContain("Lab memilih 150.000 posting per bulan supaya satu bulan dari 12 sama dengan 8,3% di naskah. Angka 8,3% karena itu bukan temuan lab.");
    // klaim negatif berlingkup: tak satu rekaman t5-partisi memuat VACUUM (folder output), dan skrip lab hanya menjalankan VACUUM (ANALYZE)
    for (const f of ["snapshot.txt", "lepas.txt", "pruning.txt", "pasang.txt", "testing.txt"]) expect(baca(`labs/t5-partisi/output/${f}`), f).not.toMatch(/vacuum/i);
    for (const f of ["dasar.py", "lepas.py", "skala.py", "run.py", "alat.py"]) {
      const pakai = [...baca(`labs/t5-partisi/${f}`).matchAll(/VACUUM[^"\n]*/g)].map((m) => m[0]);
      for (const p of pakai) expect(p, `${f} menjalankan VACUUM selain ANALYZE`).toMatch(/^VACUUM \(ANALYZE\)|^VACUUM \(ANALYZE\) |^VACUUM`/);
    }
    expect(badan).toContain("Rekaman lab tidak memuat `VACUUM`: skrip hanya menjalankan `VACUUM (ANALYZE)` sesudah memuat data.");
  });
});

describe("rekaman snapshot.txt, lepas.txt, dan pruning.txt: bagian, angka, dan rentang Snippet", () => {
  test("lima Snippet: berkas, rentang, dan judul diturunkan dari struktur rekaman dan kode, bukan angka tangan", () => {
    expect(tag).toHaveLength(5);
    expect(berkasSnippet).toEqual([
      "labs/api-t5/internal/repo/ledger.go", "labs/t5-partisi/output/snapshot.txt", "labs/api-t5/internal/repo/snapshot.go",
      "labs/t5-partisi/output/snapshot.txt", "labs/t5-partisi/output/lepas.txt",
    ]);
    const a1 = S.nomor((b) => b === "$ ./api-t5 -cek-cache", sA.awal);
    const a2 = S.nomor((b) => b.startsWith("# Baris posting dibaca: 1.800.000 dari 1.800.000"), a1);
    const c1 = S.nomor((b) => b === "$ ./api-t5 -cek-cache -dari-snapshot", sC.awal);
    const c2 = S.nomor((b) => b.startsWith("# Baris posting dibaca: 450.000"), c1);
    const f1 = L.nomor((b) => b === "$ ./api-t5 -cek-cache", lF.awal);
    const f2 = L.nomor((b) => b === "# exit status 0", L.nomor((b) => b === "$ ./api-t5 -cek-cache -dari-snapshot", lF.awal));
    expect(lines).toEqual([`${gAwal}:${gAkhir}`, `${a1}:${a2}`, `${sgAwal}:${sgAkhir}`, `${c1}:${c2}`, `${f1}:${f2}`]);
    expect(judulSnippet[0]).toBe(`Kode lab: labs/api-t5/internal/repo/ledger.go baris ${gAwal} sampai ${gAkhir} (CekCache)`);
    expect(judulSnippet[1]).toBe("Rekaman lab: labs/t5-partisi/output/snapshot.txt, bagian A (tanpa snapshot)");
    expect(judulSnippet[2]).toBe(`Kode lab: labs/api-t5/internal/repo/snapshot.go baris ${sgAwal} sampai ${sgAkhir} (query CekCacheSnapshot)`);
    expect(judulSnippet[3]).toBe("Rekaman lab: labs/t5-partisi/output/snapshot.txt, bagian C (dari snapshot terakhir dan dari snapshot tiga bulan lalu)");
    expect(judulSnippet[4]).toBe("Rekaman lab: labs/t5-partisi/output/lepas.txt, bagian F (sesudah satu bulan dilepas)");
    for (const t of tag) expect(t.includes("lang=") === /\.go"/.test(t.match(/file="[^"]+"/)![0]), t).toBe(true);
    // tampilan Snippet tidak membawa komentar lab internal, nomor keputusan, atau ID riset
    for (const k of [kodeCek, kodeSnapQuery, S.teks(a1, a2), S.teks(c1, c2), L.teks(f1, f2)]) expect(k).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+|tinjauan/i);
  });
  test("bagian A: 10.288 buku, 0 tidak cocok, 1.800.000 dari 1.800.000 baris dibaca; lab memuat 12 partisi berisi masing-masing 150.000 posting", () => {
    expect(BARIS_PRUNING_A).toHaveLength(12);
    for (const b of BARIS_PRUNING_A) expect(angka(b.split("|")[1]!.trim())).toBe(POSTING_PER_BULAN_LAB);
    expect(POSTING_PER_BULAN_LAB).toBe(150000);
    expect(TOTAL_LAB).toBe(1_800_000);
    expect(BUKU_LAB).toBe(10288);
    expect(sA.teks).toContain(`# Baris posting dibaca: ${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting di tabel.`);
    expect(sA.teks).toContain("# exit status 0");
    expect(readme).toContain("Tanpa snapshot: 1.800.000 baris dari 1.800.000.");
    expect(badan).toContain("Lab memuat 10.288 buku dan 12 bulan × 150.000 posting, yaitu 1.800.000 posting");
  });
  test("bagian B: sebelas job snapshot membaca 150.000 baris masing-masing; 113.168 baris snapshot = 11 × 10.288 dan 0 berbeda dari hitungan langsung; ulang menulis 0; bulan berjalan exit 2", () => {
    const job = sB.teks.split("\n").filter((b) => /^\$ \.\/api-t5 -buat-snapshot <tanggal 1 bulan ke-\d+ sebelum bulan berjalan>$/.test(b));
    expect(job).toHaveLength(11);
    expect(sB.teks.match(/snapshot <tanggal>: 10288 buku ditulis/g)).toHaveLength(11);
    expect(sB.teks).toContain("# 150.000, 150.000, 150.000, 150.000, 150.000, 150.000, 150.000, 150.000, 150.000, 150.000, 150.000 baris");
    expect(sB.teks).toMatch(new RegExp(`${11 * BUKU_LAB} \\| 11\\s+\\| ${BUKU_LAB}`));
    expect(11 * BUKU_LAB).toBe(113168);
    expect(sB.teks).toContain("0 baris berbeda dari 113.168");
    expect(sB.teks).toContain("snapshot <tanggal>: 0 buku ditulis");
    expect(sB.teks).toMatch(/-buat-snapshot: bulan belum selesai\n# exit status 2/);
    expect(badan).toContain("Tiap job snapshot membaca persis satu bulan, 150.000 baris di lab (`snapshot.txt` bagian B). Bulan berjalan tetap dibaca pemeriksaan tiap malam, sedangkan bulan yang sudah ditutup dibaca sekali oleh job snapshot-nya.");
    expect(badan).toContain("Bila satu bulan terlewat, snapshot sesudahnya menghitung ulang dari semua posting sampai akhir bulan itu. Itu dibaca dari kode `labs/api-t5/internal/service/snapshot_test.go` (Tidak dijalankan); tesnya lulus di `testing.txt` bagian A.");
    expect(snapshotTes).toContain("// Bulan yang terlewat memutus rantai: snapshot Maret tanpa snapshot Februari tidak boleh memakai Januari sebagai pendahulu");
    expect(snapshotTes).toContain("Ia menghitung ulang dari semua posting sampai akhir Maret, lalu April melanjutkan dari Maret.");
    expect(testing).toContain("--- PASS: TestBuatSnapshotBulanTerlewatMenghitungUlangDariAwal");
    expect(badan).toContain("Tabel snapshot yang terisi, 113.168 baris, sama dengan hitungan langsung atas posting: 0 baris berbeda.");
    expect(badan).toContain("Job aman diulang: dijalankan lagi, ia menulis 0 buku. Bulan berjalan ditolak dengan exit status 2.");
  });
  test("bagian C: dari snapshot terakhir 150.000 dari 1.800.000 (8,3%), dari snapshot tiga bulan lalu 450.000, hasil 0 tidak cocok", () => {
    expect(sC.teks).toContain(`# Baris posting dibaca: ${fmt(POSTING_PER_BULAN_LAB)} dari ${fmt(TOTAL_LAB)}, yaitu ${fmt(bulat((POSTING_PER_BULAN_LAB / TOTAL_LAB) * 100, 1), 1)}% (satu bulan dari 12).`);
    expect(sC.teks).toContain(`# Baris posting dibaca: ${fmt(3 * POSTING_PER_BULAN_LAB)}, yaitu tiga bulan`);
    expect(sC.teks.match(/10288 buku diperiksa, 0 tidak cocok/g)).toHaveLength(2);
    expect(badan).toContain("Dari snapshot terakhir, pemeriksaan membaca 150.000 dari 1.800.000 posting, yaitu 8,3%. Dari snapshot tiga bulan lalu ia membaca 450.000 posting, tiga bulan × 150.000.");
  });
  test("bagian D: satu selisih nyata 5000 pada buku 8; pemeriksaan penuh dan dari snapshot menandai buku, cache, hitungan, dan selisih yang sama", () => {
    const m = [...sD.teks.matchAll(/buku (\d+) \(([^)]+)\): saldo_cache (\d+), (?:jumlah posting|snapshot \+ posting sesudahnya) (\d+), selisih (\d+)/g)];
    expect(m).toHaveLength(2);
    expect(m[0]!.slice(1)).toEqual(m[1]!.slice(1));
    expect(Number(m[0]![3]) - Number(m[0]![4])).toBe(5000);
    expect(m[0]![5]).toBe("5000");
    expect(sD.teks).toContain("1 tidak cocok");
    expect(sD.teks).toContain("# Kedua pemeriksaan menandai satu buku yang sama dengan saldo_cache, hitungan, dan selisih yang sama (5000).");
    expect(badan).toContain("kedua pemeriksaan menandai buku yang sama dengan cache, hitungan, dan selisih 5.000 yang sama (`snapshot.txt` bagian D)");
    expect(hal26).toContain("Rp5.000");
  });
  test("lepas.txt: DELETE ditolak 23001 (B), DETACH CONCURRENTLY 140.000 dari 168.000 (C), 200.000 baris dan batas dua kali (D), arsip dan pulih (E), 10.061 dari 10.288 lawan 0 (F)", () => {
    expect(lB.teks).toContain("DELETE pada posting_lalu_05 ditolak: baris posting_lalu_05 tidak pernah diubah atau dihapus");
    expect(lB.teks).toContain("SQLSTATE 23001");
    expect(lC.teks).toContain("# Posting yang terlihat lewat tabel induk: 140.000 dari 168.000;");
    expect(lD.teks).toContain("DELETE 200000");
    expect(lD.teks).toContain("200000 baris di partisi yang dibuang");
    expect(lD.teks).toContain("Batas yang diperiksa: waktu terkecil DELETE dari tiga percobaan lebih dari dua kali waktu terkecil DETACH + DROP.");
    expect(lD.teks).toContain("# Nilai waktunya tidak direkam.");
    expect(lD.teks).toContain("tabel uji tanpa trigger ledger");
    expect(lE.teks).toContain("EXCEPT ALL kedua arah: 0 baris");
    expect(lF.teks).toContain("cek cache: 10288 buku diperiksa, 10061 tidak cocok");
    expect(lF.teks).toContain("cek cache dari snapshot <tanggal>: 10288 buku diperiksa, 0 tidak cocok");
    expect(lF.teks).toContain("# 10.061 buku ditandai: persis buku yang jumlah posting-nya di partisi yang dilepas bukan 0");
    expect(lepas).toContain("28.000 posting per bulan");
    expect(lepas.match(/UPDATE buku SET saldo_cache/g)).toBeNull(); // bagian F tidak mengubah saldo_cache
    expect(badan).toContain("Waktu terkecil `DELETE` atas 200.000 baris dari tiga percobaan lebih dari dua kali waktu terkecil `DETACH` + `DROP`, dan nilai waktunya tidak direkam (`lepas.txt` bagian D).");
    expect(badan).toContain("Ia juga menandai 10.061 dari 10.288 buku begitu data lama keluar dari tabel, padahal bagian itu tidak mengubah `saldo_cache`.");
  });
  test("kondisi rekaman: versi dari kepala rekaman dan README, schema tahap5_partisi", () => {
    for (const r of [snap, lepas, pruning, testing]) {
      expect(r).toContain("PostgreSQL 17.11");
      expect(r).toContain("go1.27.3");
    }
    expect(snap).toContain("schema tahap5_partisi");
    expect(readme).toContain("| PostgreSQL | 17.11 (`postgres:17`");
    expect(badan).toContain("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, server Go `api-t5`, schema `tahap5_partisi`.");
    expect(testing).toContain("TestCekCacheSnapshotSamaDenganCekCachePenuh");
  });
});

describe("kode lab: CekCache menjumlah semua posting, snapshot_saldo hanya di snapshot.go, komentar riwayat", () => {
  test("CekCache menjumlah posting tiap buku tanpa batas waktu; CekCacheSnapshot membatasi posting dengan dibuat >= batas bulan snapshot", () => {
    expect(kodeCek).toContain("coalesce(sum(p.jumlah), 0)");
    expect(kodeCek).toContain("LEFT JOIN posting p ON p.buku_id = b.id");
    expect(kodeCek).not.toMatch(/dibuat|snapshot|WHERE/i);
    expect(kodeSnapQuery).toContain("coalesce(s.saldo, 0) + coalesce(sum(p.jumlah), 0)");
    expect(kodeSnapQuery).toContain("LEFT JOIN snapshot_saldo s ON s.buku_id = b.id AND s.periode = $1::date");
    expect(kodeSnapQuery).toContain("LEFT JOIN posting p ON p.buku_id = b.id AND p.dibuat >= $2::timestamptz");
    expect(kodeSnapQuery).toContain("`, tanggal.String, ke)");
    expect(snapshotGo).toContain("_, ke := BatasBulan(dipakai)");
    // baris utuh, bukan potongan: syarat tambahan di query tidak lolos
    expect(kodeSnapQuery.split("\n").map((b) => b.trim())).toEqual([
      "rows, err := r.db.QueryContext(ctx, `",
      "SELECT b.id, b.jenis, coalesce(a.nama, ''), b.saldo_cache, coalesce(s.saldo, 0) + coalesce(sum(p.jumlah), 0)",
      "FROM buku b LEFT JOIN akun a ON a.id = b.akun_id",
      "LEFT JOIN snapshot_saldo s ON s.buku_id = b.id AND s.periode = $1::date",
      "LEFT JOIN posting p ON p.buku_id = b.id AND p.dibuat >= $2::timestamptz",
      "GROUP BY b.id, a.nama, s.saldo",
      "ORDER BY b.id`, tanggal.String, ke)",
    ]);
    expect(kodeCek.split("\n").map((b) => b.trim()).slice(0, 8)).toEqual([
      "func (r Repo) CekCache(ctx context.Context) (diperiksa int, beda []SelisihCache, err error) {",
      "rows, err := r.db.QueryContext(ctx, `",
      "SELECT b.id, b.jenis, coalesce(a.nama, ''), b.saldo_cache, coalesce(sum(p.jumlah), 0)",
      "FROM buku b LEFT JOIN akun a ON a.id = b.akun_id LEFT JOIN posting p ON p.buku_id = b.id",
      "GROUP BY b.id, a.nama",
      "ORDER BY b.id`)",
      "if err != nil {",
      "return 0, nil, err",
    ]);
  });
  test("index posting_riwayat (buku_id, dibuat, id) melayani riwayat satu akun: ada di migrasi dan di komentar riwayat.go", () => {
    expect(migrasi24).toContain("CREATE INDEX posting_riwayat ON posting (buku_id, dibuat, id);");
    expect(riwayatGo).toContain("Riwayat: posting satu akun, terbaru dulu");
    expect(riwayatGo).toContain("Index posting_riwayat (buku_id, dibuat, id) melayani keduanya.");
    expect(badan).toContain("Index `posting_riwayat` pada `(buku_id, dibuat, id)` melayani riwayat satu akun, terbaru dulu (Tidak dijalankan: dibaca dari komentar `labs/api-t5/internal/repo/riwayat.go`).");
    // klaim negatif berlingkup: EXPLAIN query pemeriksaan tidak ada di rekaman t5-partisi dan api-t5
    const rekaman = [..."snapshot lepas pruning pasang testing".split(" ").map((f) => baca(`labs/t5-partisi/output/${f}.txt`)), ...["beban", "kontrak", "laporan", "pooler", "skema", "testing"].map((f) => baca(`labs/api-t5/output/${f}.txt`))];
    for (const r of rekaman) for (const b of r.split("\n").filter((x) => /EXPLAIN/.test(x))) expect(b, "EXPLAIN atas query pemeriksaan").not.toMatch(/saldo_cache|GROUP BY b\.id|buku b/);
    expect(badan).toContain("EXPLAIN pemeriksaan itu tidak direkam.");
  });
  test("klaim negatif berlingkup: di labs/api-t5/internal dan labs/api-t5/cmd hanya repo/snapshot.go dan tesnya menyebut snapshot_saldo", () => {
    const pakai = [...(terlacak ?? new Set<string>())].filter((f) => /^labs\/api-t5\/(internal|cmd)\/.*\.go$/.test(f) && baca(f).includes("snapshot_saldo")).sort();
    expect(pakai).toEqual(["labs/api-t5/internal/repo/snapshot.go", "labs/api-t5/internal/service/snapshot_test.go"]);
    expect(badan).toContain("Di `labs/api-t5/internal` dan `labs/api-t5/cmd`, hanya `repo/snapshot.go` dan tesnya yang menyebut tabel itu. Jalur bayar tidak membacanya (Tidak dijalankan: dibaca dari kode).");
    expect(BATAS_GB).toBe(32000);
  });
  test("posting terlambat: tes Go memerankannya (pemeriksaan penuh diam, dari snapshot menandai) dan lulus di testing.txt", () => {
    expect(snapshotTes).toContain("// dan menandai posting yang ditulis terlambat di bulan yang sudah di-snapshot (yang tidak terlihat oleh pemeriksaan penuh).");
    expect(snapshotTes).toContain('t.Fatal("pemeriksaan penuh menandai buku B padahal cache dan posting konsisten")');
    expect(snapshotTes).toContain("posting terlambat: selisih buku B dari snapshot");
    expect(testing).toContain("--- PASS: TestCekCacheSnapshotSamaDenganCekCachePenuh");
    expect(badan).toContain("Di tes Go lab, pemeriksaan penuh diam karena cache dan posting konsisten, sedangkan pemeriksaan dari snapshot menandai buku itu.");
    expect(badan).toContain("`labs/api-t5/internal/service/snapshot_test.go` (Tidak dijalankan); tesnya lulus di `testing.txt` bagian A.");
  });
});

describe("hitungan: tabel Hitungan, tabel lab lawan naskah, dan hasil trx 2 dihitung ulang", () => {
  const baris = (kunci: string): string[] => {
    const b = badan.split("\n").find((x) => x.startsWith(`| ${kunci} |`));
    expect(b, kunci).toBeDefined();
    return b!.split("|").slice(1, -1).map((s) => s.trim());
  };
  test("tabel Hitungan: tiap baris dihitung dari registry (user, aktif), naskah (3 transaksi, 2 posting, 250 byte, 32 TB) dan baris sebelumnya, dibulatkan setengah ke atas", () => {
    expect(AKTIF).toBe(200000);
    expect(TRX).toBe(3);
    expect(BYTE).toBe(250);
    expect(asumsi.trx).toBe(2);
    expect(baris("Posting per tahun")).toEqual(["Posting per tahun", "200.000 × 3 × 2 × 365", `${fmt(POSTING_TAHUN / 1e6)} juta`]);
    expect(baris("Ukuran per tahun")).toEqual(["Ukuran per tahun", "438 juta × 250 byte", `${fmt(GB_TAHUN, 1)} GB`]);
    expect(baris("Posting dalam tiga tahun")).toEqual(["Posting dalam tiga tahun", "3 × 438 juta", `${fmt((3 * POSTING_TAHUN) / 1e6)} juta`]);
    expect(baris("Tahun sampai batas relasi")).toEqual(["Tahun sampai batas relasi", "32.000 GB ÷ 109,5 GB", `${fmt(bulat(BATAS_GB / GB_TAHUN))} tahun`]);
    expect(baris("Posting per bulan")).toEqual(["Posting per bulan", "438 juta ÷ 12", `${fmt(bulat(POSTING_TAHUN / 12 / 1e6, 1), 1)} juta`]);
    const bulanJuta = bulat(POSTING_TAHUN / 12 / 1e6, 1);
    expect(baris("Satu bulan dari semua posting, setelah satu tahun")).toEqual(["Satu bulan dari semua posting, setelah satu tahun", "36,5 ÷ 438", `${fmt(bulat((bulanJuta / (POSTING_TAHUN / 1e6)) * 100, 1), 1)}%`]);
    expect(baris("Satu bulan dari semua posting, setelah tiga tahun")).toEqual(["Satu bulan dari semua posting, setelah tiga tahun", "36,5 ÷ 1.314", `${fmt(bulat((bulanJuta / ((3 * POSTING_TAHUN) / 1e6)) * 100, 1), 1)}%`]);
    expect(GB_TAHUN).toBe(109.5);
    expect(BATAS_GB / GB_TAHUN).toBeGreaterThan(292);
    expect(BATAS_GB / GB_TAHUN).toBeLessThan(292.5);
  });
  test("trx 2: 292 juta posting, 73,0 GB, satu bulan tetap 8,3%; rasio satu dari dua belas tidak bergantung pada jumlah transaksi", () => {
    expect(POSTING_TAHUN_2).toBe(292_000_000);
    expect(fmt(GB_TAHUN_2, 1)).toBe("73,0");
    expect(bulat((POSTING_TAHUN_2 / 12 / POSTING_TAHUN_2) * 100, 1)).toBe(8.3);
    expect(bulat((POSTING_TAHUN / 12 / POSTING_TAHUN) * 100, 1)).toBe(8.3);
    expect(badan).toContain("Dengan 2 transaksi per user aktif per hari, tahun pertama menghasilkan 292 juta posting dan 73,0 GB. Satu bulan tetap 8,3% dari semuanya (Hitungan atas Asumsi).");
    expect(barisBeban).toContain("Trx 2: 292 juta dan 73,0 GB.");
  });
  test("tabel lab lawan naskah: kolom lab dari rekaman (150.000, 1.800.000, 8,3%), kolom naskah dari tabel Hitungan; 8,3% sama karena satu dari dua belas", () => {
    expect(baris("Posting per bulan").length).toBe(3);
    const semuaBaris = badan.split("\n");
    const tabelLab = semuaBaris.slice(semuaBaris.indexOf("| Besaran | Lab (Rekaman lab) | Naskah (Hitungan atas Asumsi) |") + 2).filter((b) => /^\|/.test(b)).slice(0, 5);
    const sel = tabelLab.map((b) => b.split("|").slice(1, -1).map((s) => s.trim()));
    expect(sel).toEqual([
      ["Posting per bulan", fmt(POSTING_PER_BULAN_LAB), `${fmt(bulat(POSTING_TAHUN / 12 / 1e6, 1), 1)} juta`],
      ["Posting setelah 12 bulan", fmt(TOTAL_LAB), `${fmt(POSTING_TAHUN / 1e6)} juta`],
      ["Dibaca tanpa snapshot", fmt(TOTAL_LAB), `${fmt(POSTING_TAHUN / 1e6)} juta`],
      ["Dibaca dari snapshot terakhir", fmt(POSTING_PER_BULAN_LAB), `${fmt(bulat(POSTING_TAHUN / 12 / 1e6, 1), 1)} juta`],
      ["Bagian yang dibaca", "8,3%", "8,3%"],
    ]);
    expect(bulat((POSTING_PER_BULAN_LAB / TOTAL_LAB) * 100, 1)).toBe(8.3);
    expect(badan).toContain("| Besaran | Lab (Rekaman lab) | Naskah (Hitungan atas Asumsi) |");
  });
  test("asal angka masukan: 200.000 = 20% dari 1.000.000 (PRD v5), 3 transaksi, 2 posting, 250 byte Asumsi naskah; definisi Hitungan di pemakaian pertama", () => {
    expect(asumsi.user).toBe(1_000_000);
    expect(asumsi.aktif).toBe(20);
    expect(prd5).toContain("1.000.000");
    expect(badan).toContain("200.000 user aktif adalah 20% dari 1.000.000 user terdaftar ([[t5-prd]]).");
    expect(badan).toContain("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, berlabel sama dengan masukan terlemahnya, di sini Asumsi.");
    const pertama = badan.search(/\bHitungan\b/);
    expect(badan.slice(pertama, pertama + 80)).toContain("Hitungan adalah hasil rumus");
    // label turunan "Hitungan atas Rekaman lab" tidak dipakai: hasil rumus atas rekaman tidak ada di halaman ini
    expect(badan).not.toMatch(/Hitungan atas Rekaman/);
  });
});

describe("sumber luar: baris riset, tanggal akses, tautan, dan kutipan", () => {
  const tanggal = "2026-11-02";
  test("lima baris riset ada, bernomor berurutan R5-155 sampai R5-159, tanpa ganda; tanggal akses sama dengan tanggal di halaman", () => {
    const semua = [...riset.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(semua).size).toBe(semua.length);
    const i = semua.indexOf("R5-155");
    expect(semua.slice(i, i + 5)).toEqual(IDS);
    for (const id of IDS) expect(barisRiset(id), id).toContain(tanggal);
    expect([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1])).toEqual([tanggal, tanggal, tanggal]);
  });
  test("tiga tautan eksternal: URL sama dengan baris riset; teks tautan deskriptif; tidak ada ID riset atau nomor keputusan di halaman, diagram, skenario, dan kartu", () => {
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https:[^)]+)\)/g)].map((m) => [m[1]!, m[2]!]);
    expect(tautan.map((t) => t[1])).toEqual([
      "https://www.postgresql.org/docs/17/monitoring-stats.html", "https://www.postgresql.org/docs/17/limits.html",
      "https://www.postgresql.org/docs/17/ddl-partitioning.html",
    ]);
    expect(tautan.map((t) => t[0])).toEqual(["PostgreSQL 17: statistik kumulatif", "PostgreSQL 17: batas", "PostgreSQL 17: partisi tabel"]);
    expect(barisRiset("R5-157")).toContain("postgresql.org/docs/17/monitoring-stats.html");
    expect(barisRiset("R5-156")).toContain("postgresql.org/docs/17/limits.html");
    expect(barisRiset("R5-155")).toContain("postgresql.org/docs/17/ddl-partitioning.html");
    expect(barisRiset("R5-158")).toContain("postgresql.org/docs/17/routine-vacuuming.html");
    const semuaTeks = [badan, frontmatter, JSON.stringify(diagramMentah), skenarioMentah, kartuSemua.filter((k) => k.halaman === "t5-m43").map((k) => k.tanya + k.jawab).join("\n")].join("\n");
    expect(semuaTeks).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(semuaTeks).not.toMatch(/keputusan \d{3,4}|PR #?\d{3}|tinjauan PR/i);
  });
  test("R5-155 (partisi 17): kalimat yang menopang halaman ada di baris riset, tanpa pelunak yang dibuang; R5-158 tidak dipakai sebagai sebab", () => {
    const r155 = barisRiset("R5-155");
    expect(r155).toContain("Dropping an individual partition using DROP TABLE, or doing ALTER TABLE DETACH PARTITION, is far faster than a bulk operation.");
    expect(r155).toContain("These commands also entirely avoid the VACUUM overhead caused by a bulk DELETE.");
    expect(r155).toContain("These benefits will normally be worthwhile only when a table would otherwise be very large.");
    expect(r155).toContain("a rule of thumb is that the size of the table should exceed the physical memory of the database server.");
    expect(badan).toContain("Manfaat partisi biasanya sepadan hanya bila tabel sangat besar. Aturan praktisnya: ukuran tabel melebihi memori fisik server");
    expect(badan).toContain("Memori server tidak ada di Asumsi halaman ini, jadi perbandingan itu tidak dihitung.");
    // memori fisik server tidak ada di registry tahap 5 (klaim negatif berlingkup: asumsi tahap 5)
    expect(Object.keys(asumsi).join(" ")).not.toMatch(/mem|ram/i);
    const r158 = barisRiset("R5-158");
    expect(r158).toContain("VACUUM uses the visibility map to determine which pages of a table must be scanned.");
    expect(badan).not.toMatch(/VACUUM (yang )?(makin|semakin) panjang/);
    expect(badan).toContain("Halaman ini karena itu tidak menyebutnya sebagai penyebab pukul 14.20.");
  });
  test("R5-156 (batas relasi 17): 32 TB dengan BLCKSZ 8192; halaman tidak menulis 'tabel berpartisi' sebagai bagian batas; 1 TB = 1.000 GB ditulis", () => {
    const r156 = barisRiset("R5-156");
    expect(r156).toContain('baris "relation size" bernilai 32 TB "with the default BLCKSZ of 8192 bytes"');
    expect(r156).toContain("tidak memuat catatan tentang ukuran tabel berpartisi; kata partisi muncul di sana hanya pada baris partition keys (32) dan pada catatan batas nilai out-of-line (partisi sebagai jalan keluar)");
    expect(badan).toContain("Batas ukuran relasi PostgreSQL adalah 32 TB dengan `BLCKSZ` bawaan 8192 byte");
    expect(badan).toContain("Tabel memakai 1 TB = 1.000 GB, jadi batasnya 32.000 GB.");
  });
  test("R5-157 (statistik): dua kolom dan definisinya sama dengan baris riset; README lab menyebut cara baca (sesudah proses job keluar)", () => {
    const r157 = barisRiset("R5-157");
    expect(r157).toContain('seq_tup_read "Number of live rows fetched by sequential scans"');
    expect(r157).toContain('idx_tup_fetch "Number of live rows fetched by index scans"');
    expect(readme).toContain("selisih `seq_tup_read` + `idx_tup_fetch` atas partisi posting, dibaca sesudah proses job keluar");
    expect(snap).toContain("selisih seq_tup_read + idx_tup_fetch");
    expect(badan).toContain("Baris yang dibaca adalah jumlah `seq_tup_read` dan `idx_tup_fetch` di `pg_stat_user_tables` atas semua partisi `posting`, dihitung sebagai selisih sebelum dan sesudah job. Statistik dibaca sesudah proses job keluar.");
  });
  test("R5-159: tiap hasil hitungan di baris riset sama dengan hitungan ulang; angka lain di baris riset hanya turunan", () => {
    const r159 = barisRiset("R5-159");
    for (const k of ["= 438.000.000", "= 109,5 GB", "= 1.314 juta", "= 292,2", "= 36,5 juta", "= 8,33%", "= 2,78%", "= 292 juta", "= 73,0 GB", "= 1.800.000", "= 113.168"]) expect(r159, k).toContain(k);
    expect(32000 / GB_TAHUN).toBeCloseTo(292.2, 1);
    expect((36.5 / 1314) * 100).toBeCloseTo(2.78, 2);
    for (const id of ["R5-155", "R5-156", "R5-157", "R5-158", "R5-159"]) expect(sidik(barisRiset(id))).toBe(SIDIK.riset[IDS.indexOf(id)]);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: tanpa snapshot (1.800.000 dari 1.800.000, 0 tidak cocok) dan dari snapshot terakhir (150.000 dari 1.800.000, 8,3%, hasil sama)", () => {
    const [a, b] = diagram.baris;
    expect(diagram.baris).toHaveLength(2);
    expect(a!.simpul.map((s) => s.teks)).toEqual([`${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting dibaca`, "0 buku tidak cocok"]);
    expect(a!.simpul[0]!.sub).toBe(`12 bulan × ${fmt(POSTING_PER_BULAN_LAB)}`);
    expect(a!.simpul[1]!.sub).toBe(`${fmt(BUKU_LAB)} buku diperiksa`);
    expect(b!.simpul.map((s) => s.teks)).toEqual([`${fmt(POSTING_PER_BULAN_LAB)} dari ${fmt(TOTAL_LAB)} posting dibaca`, "0 buku tidak cocok"]);
    expect(b!.simpul[0]!.sub).toBe(`${fmt(bulat((POSTING_PER_BULAN_LAB / TOTAL_LAB) * 100, 1), 1)}%: satu bulan dari 12`);
    expect(b!.simpul[1]!.sub).toBe("hasil sama");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t5-partisi · snapshot.txt bagian A dan C" });
    expect(diagram.catatan).toContain(`${fmt(BUKU_LAB)} buku dan ${fmt(POSTING_PER_BULAN_LAB)} posting per bulan`);
    expect(diagram.catatan).toContain(`${fmt(POSTING_TAHUN / 1e6)} juta (Asumsi)`);
    expect(sA.teks).toContain("0 tidak cocok");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai ringkas di blok Yang sebenarnya, tepat satu kali", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(badan.match(/<Rantai data=\{bacaPosting\} ringkas \/>/g)).toHaveLength(1);
    expect(badan).toContain('import bacaPosting from "../../../../data/diagram/t5-m43-baca-posting.json";');
    const sebenarnya = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(sebenarnya).toContain("<Rantai data={bacaPosting} ringkas />");
    // Inti: kalimat, Rantai, lalu paragraf Kondisi rekaman
    expect(sebenarnya.split("\n").filter(Boolean).slice(0, 3)).toEqual([
      '<Blok nama="Yang sebenarnya">',
      "Pemeriksaan harian menjumlah semua posting sejak awal, jadi pekerjaannya tumbuh bersama umur data: 438 juta baris setelah satu tahun (Asumsi).",
      "<Rantai data={bacaPosting} ringkas />",
    ]);
  });
});

describe("skenario alur t5-m43.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const rekamanUtama = snap.split("\n"), rekamanVarian = lepas.split("\n");
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen; lima langkah dan tiga langkah varian; sumber menunjuk dua berkas rekaman", () => {
    const err = core.validate(core.normalize(skenario), { exists: (p) => fs.existsSync(path.join(akar, p)) });
    expect(err).toEqual([]);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["job", "db", "snap"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t5-partisi/output/snapshot.txt", fileVarian: "labs/t5-partisi/output/lepas.txt" });
    expect(skenario.sumber.catatan).toContain("Lab memilih 150.000 posting per bulan supaya satu bulan dari 12 sama dengan 8,3% di naskah, jadi 8,3% bukan temuan.");
    expect(skenario.sumber.catatan).toContain("Jumlah baris dibaca dari pg_stat_user_tables, bukan dari waktu; waktu tidak direkam.");
  });
  test("tebakan: empat pilihan, jawaban benar (satu bulan, 150.000) di posisi ketiga, bukan yang terpanjang atau terpendek; penjelasan dari rekaman bagian C", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(2);
    expect(p.varian).toBe(false);
    expect(p.options[2]).toContain("Satu bulan, 150.000");
    const panjang = p.options.map((o) => o.length);
    expect(panjang[2]).toBeLessThan(Math.max(...panjang));
    expect(panjang[2]).toBeGreaterThan(Math.min(...panjang));
    expect(p.q).toContain(`${fmt(TOTAL_LAB)} posting dalam 12 partisi bulanan`);
    expect(p.explain).toContain(`${fmt(POSTING_PER_BULAN_LAB)} dari ${fmt(TOTAL_LAB)} posting, yaitu 8,3%, satu bulan dari 12`);
    expect(p.options[0]).toContain(fmt(TOTAL_LAB));
    expect(p.options[1]).toContain(fmt(TOTAL_LAB / 2));
  });
  test("baris perintah dan keluaran di kirim ada utuh di rekaman: jalur utama dari snapshot.txt, varian dari lepas.txt, dan tiap langkah dari bagian yang benar", () => {
    const utuh = (kirim: string, rekaman: string[]) => {
      const k = kirim.split("\n");
      const i = rekaman.findIndex((b, n) => b === k[0] && k.every((x, j) => rekaman[n + j] === x));
      expect(i, `kirim tidak utuh di rekaman: ${k[0]}`).toBeGreaterThanOrEqual(0);
      return i + 1;
    };
    const kirimUtama = skenario.langkah.map((l) => l.kirim);
    // langkah 2 memuat dua potong terpisah (perintah dan keluaran bulan pertama, lalu ringkasan 150.000)
    const [k1, k2, k3, k4, k5] = kirimUtama as [string, string, string, string, string];
    expect(utuh(k1, rekamanUtama)).toBe(sA.awal + 3);
    const [p2a, p2b] = [k2.split("\n").slice(0, 2).join("\n"), k2.split("\n").slice(2).join("\n")];
    expect(utuh(p2a, rekamanUtama)).toBeGreaterThan(sB.awal);
    expect(utuh(p2b, rekamanUtama)).toBeGreaterThan(utuh(p2a, rekamanUtama));
    expect(utuh(k3, rekamanUtama)).toBeGreaterThan(sB.awal);
    expect(utuh(k4, rekamanUtama)).toBe(sC.awal + 1);
    expect(utuh(k5, rekamanUtama)).toBeGreaterThan(sD.awal);
    const [v1, v2, v3] = skenario.varian.langkah.map((l) => l.kirim) as [string, string, string];
    expect(utuh(v1, rekamanVarian)).toBeGreaterThan(lC.awal);
    expect(utuh(v2, rekamanVarian)).toBe(lF.awal + 1);
    expect(utuh(v3, rekamanVarian)).toBeGreaterThan(lF.awal);
    expect(v1).toContain("ALTER TABLE posting DETACH PARTITION posting_lalu_05 CONCURRENTLY");
    expect(v1).toContain("# Posting yang terlihat lewat tabel induk: 140.000 dari 168.000;");
    expect(v2).toContain("10061 tidak cocok");
    expect(v3).toContain("0 tidak cocok");
    expect(k1).toContain(`${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting di tabel`);
    expect(k4).toContain(`${fmt(POSTING_PER_BULAN_LAB)} dari ${fmt(TOTAL_LAB)}, yaitu 8,3%`);
  });
  test("arah, nada, dan penjelasan tiap langkah mengikuti rekaman; jalur varian tidak membuka jawaban tebakan jalur utama", () => {
    const l = skenario.langkah, v = skenario.varian.langkah;
    expect(l.map((x) => [x.dari, x.ke ?? null, x.nada ?? null])).toEqual([["job", "db", "warn"], ["job", "snap", null], ["snap", null, null], ["job", "snap", "good"], ["job", null, "good"]]);
    expect(v.map((x) => [x.dari, x.ke ?? null, x.nada ?? null])).toEqual([["job", "db", null], ["job", "db", "warn"], ["job", "snap", "good"]]);
    expect(l[0]!.jelas).toContain(`${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting`);
    expect(l[1]!.jelas).toContain(`Sebelas job snapshot`);
    expect(l[1]!.jelas).toContain(`${fmt(POSTING_PER_BULAN_LAB)} baris`);
    expect(l[2]!.jelas).toContain(`${fmt(11 * BUKU_LAB)} baris untuk 11 bulan dan ${fmt(BUKU_LAB)} buku`);
    expect(l[3]!.jelas).toContain(`${fmt(POSTING_PER_BULAN_LAB)} dari ${fmt(TOTAL_LAB)} posting, yaitu 8,3%`);
    expect(l[4]!.jelas).toContain("selisih yang sama");
    expect(v[0]!.jelas).toContain("28.000 posting per bulan");
    expect(v[0]!.jelas).toContain("140.000 dari 168.000");
    expect(v[1]!.jelas).toContain("10.061 dari 10.288 buku");
    expect(v[2]!.jelas).toContain("0 dari 10.288 buku");
    for (const x of v) expect(x.kirim + x.jelas + x.judul).not.toContain(fmt(POSTING_PER_BULAN_LAB));
    expect(skenario.judul).toBe("Pemeriksaan harian membaca semua posting; dari snapshot ia membaca satu bulan");
  });
  test("skenario dikunci dengan sidik jari (setiap nilai string)", () => {
    expect(sidik(skenarioMentah)).toBe(SIDIK.skenario);
  });
  test("tanpa JavaScript: noscript memuat hasil jalur utama dan varian dengan angka yang sama dengan rekaman; tombol tanpa fungsi tidak ditampilkan", () => {
    const m = cocok(badan, /<noscript>\n([\s\S]+?)<\/noscript>/);
    expect(m[1]).toContain("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia.");
    expect(m[1]).toContain(`pemeriksaan tanpa snapshot membaca ${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting, dan pemeriksaan dari snapshot terakhir membaca ${fmt(POSTING_PER_BULAN_LAB)}, yaitu 8,3%`);
    expect(m[1]).toContain("pemeriksaan tanpa snapshot menandai 10.061 dari 10.288 buku, dan pemeriksaan dari snapshot menandai 0.");
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<button/g)).toBeNull();
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m43.json" />');
    expect(badan).toContain("Sesudah langkah terakhir, centang **Ubah satu hal: satu bulan dilepas dari tabel posting**.");
    expect(skenario.varian.label).toBe("satu bulan dilepas dari tabel posting");
  });
});

describe("kartu Cek diri: tiga kartu, sama dengan kartu.json", () => {
  const soal = [...badan.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.trim() }));
  test("tiga soal bernomor 1, 2, 3 dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dengan jawabannya, id, judul, dan url", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3"]);
    const kartu = kartuSemua.filter((k) => k.halaman === "t5-m43");
    expect(kartu.map((k) => k.id)).toEqual(["t5-m43-1", "t5-m43-2", "t5-m43-3"]);
    kartu.forEach((k, i) => {
      expect(k.tanya).toBe(soal[i]!.tanya);
      expect(k.jawab).toBe(soal[i]!.jawab);
      expect(k.judul).toBe("5.10 M43: Pemeriksaan saldo harian selesai pukul 14.20");
      expect(k.url).toBe("tahap-5/m43-pemeriksaan-saldo/");
    });
  });
  test("jawaban kartu menurunkan klaimnya: 1.800.000 dari 1.800.000 dan 438 juta; 8,3% dipilih lab; 10.061 dari 10.288, 0 dengan snapshot, dan SQLSTATE 23001", () => {
    expect(soal[0]!.jawab).toContain(`${fmt(TOTAL_LAB)} dari ${fmt(TOTAL_LAB)} posting (\`snapshot.txt\` bagian A)`);
    expect(soal[0]!.jawab).toContain(`${fmt(POSTING_TAHUN / 1e6)} juta baris setelah satu tahun (Hitungan atas Asumsi)`);
    expect(soal[1]!.jawab).toContain(`Lab memilih ${fmt(POSTING_PER_BULAN_LAB)} posting per bulan supaya satu bulan dari 12 sama dengan 8,3%.`);
    expect(soal[1]!.jawab).toContain("36,5 juta posting per bulan adalah Hitungan atas Asumsi dan tidak dijalankan.");
    expect(soal[2]!.jawab).toContain("10.061 dari 10.288 buku");
    expect(soal[2]!.jawab).toContain("Pemeriksaan dari snapshot menandai 0 (`lepas.txt` bagian F).");
    expect(soal[2]!.jawab).toContain("SQLSTATE 23001 (`lepas.txt` bagian B)");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, jumlah elemen, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor selain soal Cek diri", () => {
    const h = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(h).toEqual(["### Cek diri"]);
    expect(badan.slice(badan.indexOf("### Cek diri"))).toContain("</Blok>");
    expect(badan.split("\n").filter((b) => /^\d+\. /.test(b))).toEqual([]);
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const baris = badan.split("\n").filter((b) => b.trim() !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description memuat minggu 5, 14.20, 08.00 dan posting; sidik frontmatter", () => {
    expect(frontmatter).toContain("description: Minggu 5. Pemeriksaan harian membaca semua posting sejak awal, jadi laporan tutup buku belum ada pukul 08.00 dan p95 pembayaran naik sepanjang siang. Snapshot saldo membuatnya membaca satu bulan.");
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("jumlah elemen: lima Blok, satu Rantai, lima Snippet, satu WidgetLama, satu SkripLama, satu noscript, dua tabel, satu details tebakan, tiga Cek diri, lima impor", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(5);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<SkripLama /g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/^\| --- /gm)).toHaveLength(2);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/^import /gm)).toHaveLength(6);
  });
  test("istilah diberi arti di pemakaian pertama di luar adegan: pemeriksaan harian, posting, partisi, snapshot saldo, Hitungan; urutannya benar", () => {
    const pos = (k: string) => badan.indexOf(k);
    const urut = [
      "Pemeriksaan harian adalah job malam yang membandingkan `saldo_cache` tiap buku, yaitu tempat uang satu pihak dicatat di ledger, dengan jumlah posting-nya.",
      "Posting adalah satu baris catatan uang di ledger.",
      "Partisi adalah bagian tabel `posting` yang dipisah menurut `dibuat`, satu per bulan",
      "Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini",
      "Snapshot saldo adalah saldo akhir tiap bulan per buku, disimpan di tabel `snapshot_saldo` supaya saldo itu tidak dijumlah ulang.",
    ].map(pos);
    expect(urut.every((x) => x > 0)).toBe(true);
    expect([...urut]).toEqual([...urut].sort((a, b) => a - b));
    // Gejala tanpa kalimat definisi (kata penanda adalah, yaitu, artinya, berarti, merupakan, disebut)
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf('<Blok nama="Yang Raka kira" buka>'));
    expect(gejala).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/i);
  });
  test("satu kata per konsep: replica tidak dipakai, 'pembeli' dan 'pelanggan' tidak muncul, 'service' bukan 'layanan', 'pemeriksaan harian' bukan 'pemeriksaan malam' di prosa", () => {
    expect(badan).not.toMatch(/\breplica\b|pelanggan|pembeli|layanan/i);
    expect(badan).not.toMatch(/pemeriksaan malam/i);
    expect(badan.match(/pemeriksaan harian/gi)!.length).toBeGreaterThanOrEqual(4);
  });
});

// Kalimat yang lolos mutasi 'sisip tidak' tanpa kunci baris (putaran 2 uji mutasi): dikunci literal di sini, bukan di berkas nilai,
// supaya membangkitkan ulang berkas nilai dari halaman termutasi tidak melonggarkannya.
const KUNCI_LITERAL: string[] = [
  "Yang bisa dihitung adalah pekerjaan yang membaca seluruh tabel tiap malam.",
  "Yang direkam adalah bahwa job membaca persis satu bulan.",
  "Lab tidak punya app Flutter dan tidak merekam layar.",
  "| Besaran | Rumus | Hasil |",
  "| Besaran | Lab (Rekaman lab) | Naskah (Hitungan atas Asumsi) |",
  '<SkripLama daftar={["hp","alur-core","alur"]} />',
  "Bulan berjalan di lab sudah berisi 150.000 posting, jadi satu bulan penuh adalah batas atas: di awal bulan job membaca lebih sedikit.",
  "Snapshot adalah salinan yang punya umur: ia benar untuk bulan yang sudah ditutup, selama tidak ada posting baru dengan `dibuat` di bulan itu.",
  "Job snapshot menulisnya dari posting dan snapshot bulan sebelumnya.",
  "Pemeriksaan yang membaca seluruh sejarah bukan hanya membaca banyak baris.",
  "Partisi adalah bagian tabel `posting` yang dipisah menurut `dibuat`, satu per bulan ([[t5-partisi]]). Baris yang dibaca adalah jumlah",
  "Hendra memeriksa. Pemeriksaan harian yang ia tulis baru selesai pukul 14.20, padahal target Pak Hadi pukul 06.00.",
  "Dugaan itu menjelaskan kenapa pekerjaannya lambat, tetapi tidak menjawab apa yang dikerjakan pekerjaan itu. Database khusus ledger tetap menjalankan query yang sama atas posting yang sama. Mesin yang lebih besar menunda masalahnya, tetapi tidak membuat pemeriksaan membaca lebih sedikit baris.",
  "Semua posting sejak awal. Rekaman lab `snapshot.txt` bagian A: 1.800.000 dari 1.800.000 posting di tabel.",
  "Di skala naskah, 438 juta baris setelah satu tahun (Asumsi). Hitungannya ada di blok berikutnya.",
  "**Pemeriksaan membaca tiap posting satu kali per malam.** Query-nya menjumlah `jumlah` dari semua posting tiap buku, lalu membandingkannya dengan `saldo_cache`:",
  "Rekaman dari database bersih memberi jumlah baris yang dibaca:",
  "**Index riwayat tidak menolong.** Index `posting_riwayat` pada `(buku_id, dibuat, id)` melayani riwayat satu akun, terbaru dulu (Tidak dijalankan: dibaca dari komentar `labs/api-t5/internal/repo/riwayat.go`). Pemeriksaan menjumlah `jumlah` dari semua buku, jadi tiap baris posting tetap masuk hitungan. Index mengubah cara baris ditemukan, bukan berapa baris yang dijumlah.",
  "**Ukuran bukan batasnya.** Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, berlabel sama dengan masukan terlemahnya, di sini Asumsi.",
  "Dokumentasi PostgreSQL menulis hal yang lebih halus. Manfaat partisi biasanya sepadan hanya bila tabel sangat besar. Aturan praktisnya: ukuran tabel melebihi memori fisik server ([PostgreSQL 17: partisi tabel](https://www.postgresql.org/docs/17/ddl-partitioning.html), dibuka 2026-11-02, Tidak dijalankan).",
  "**Snapshot memotong bacaan menjadi satu bulan.** Snapshot saldo adalah saldo akhir tiap bulan per buku, disimpan di tabel `snapshot_saldo` supaya saldo itu tidak dijumlah ulang. Pemeriksaan dari snapshot membandingkan `saldo_cache` dengan saldo snapshot terakhir ditambah posting sesudahnya:",
  "**Snapshot menggeser pekerjaan, bukan menghilangkannya.** Tiap job snapshot membaca persis satu bulan, 150.000 baris di lab (`snapshot.txt` bagian B). Bulan berjalan tetap dibaca pemeriksaan tiap malam, sedangkan bulan yang sudah ditutup dibaca sekali oleh job snapshot-nya.",
  "**Hasilnya sama untuk selisih yang nyata.** Bila kode menulis `saldo_cache` tanpa posting, kedua pemeriksaan menandai buku yang sama dengan cache, hitungan, dan selisih 5.000 yang sama (`snapshot.txt` bagian D).",
  "Hasil sama itu punya syarat. Posting yang ditulis terlambat dengan `dibuat` di bulan yang sudah di-snapshot tidak ikut dalam snapshot. Di tes Go lab, pemeriksaan penuh diam karena cache dan posting konsisten, sedangkan pemeriksaan dari snapshot menandai buku itu. Itu dibaca dari kode `labs/api-t5/internal/service/snapshot_test.go` (Tidak dijalankan); tesnya lulus di `testing.txt` bagian A.",
  "**Snapshot hanya memeriksa.** Pak Hadi menulis aturannya di PRD v5 ([[t5-prd]]). Angka yang ia tanda tangani dibaca dari catatan yang sama dengan yang menggerakkan uang. `snapshot_saldo` ada di database yang sama dengan `posting`. Job snapshot menulisnya dari posting dan snapshot bulan sebelumnya.",
  "**Posting tidak boleh dihapus, jadi data lama tidak dibuang dengan DELETE.** Ledger menolak `DELETE` atas posting dengan SQLSTATE 23001 (`lepas.txt` bagian B). Membuang satu bulan dari database utama berarti melepasnya sebagai tabel sendiri, bukan menghapus baris.",
  "Dokumentasi PostgreSQL menulis bahwa `DROP TABLE` atau `DETACH PARTITION` atas satu partisi jauh lebih cepat daripada operasi massal. Keduanya juga menghindari overhead `VACUUM` dari `DELETE` massal (sumber yang sama, Tidak dijalankan). Rekaman lab tidak memuat `VACUUM`: skrip hanya menjalankan `VACUUM (ANALYZE)` sesudah memuat data. Halaman ini karena itu tidak menyebutnya sebagai penyebab pukul 14.20.",
  "Lab memeriksa batasnya pada tabel uji tanpa trigger ledger. Waktu terkecil `DELETE` atas 200.000 baris dari tiga percobaan lebih dari dua kali waktu terkecil `DETACH` + `DROP`, dan nilai waktunya tidak direkam (`lepas.txt` bagian D).",
  "Satu akibat lain terekam di run lab yang terpisah, dengan 28.000 posting per bulan, setelah satu bulan dilepas:",
  "Pemeriksaan yang membaca seluruh sejarah bukan hanya membaca banyak baris. Ia juga menandai 10.061 dari 10.288 buku begitu data lama keluar dari tabel, padahal bagian itu tidak mengubah `saldo_cache`. Pemeriksaan dari snapshot menandai 0. Data lama tetap ada di arsip (`lepas.txt` bagian E), dan caranya dibahas di [[t5-partisi]].",
  "Widget ini mengikuti rekaman `snapshot.txt`: pemeriksaan tanpa snapshot, sebelas job snapshot, lalu pemeriksaan dari snapshot terakhir. Tebak dulu, lalu tekan Berikutnya atau panah kanan.",
  "Sesudah satu bulan dilepas dari tabel, pemeriksaan tanpa snapshot menandai 10.061 dari 10.288 buku, dan pemeriksaan dari snapshot menandai 0. Rekaman ada di cuplikan pada blok sebelumnya.",
  "Pekerjaan malam membaca bagian yang berubah sejak snapshot terakhir, bukan seluruh sejarah posting.",
];

describe("tanpa kunci baris: angka, nama, dan klaim di prosa diturunkan dari sumber", () => {
  test("angka di prosa sama dengan rekaman dan hitungan: 10.288, 150.000, 1.800.000, 113.168, 10.061, 292 tahun", () => {
    for (const [n, sisa] of [[11 * BUKU_LAB, " baris"], [TOTAL_LAB, " posting"], [POSTING_PER_BULAN_LAB, " posting"], [POSTING_PER_BULAN_LAB, " baris"], [BUKU_LAB, " buku"]] as [number, string][]) {
      expect(badan, `${fmt(n)}${sisa}`).toContain(`${fmt(n)}${sisa}`);
    }
    expect(badan).toContain(`${fmt(10061)} dari ${fmt(BUKU_LAB)} buku`);
    expect(badan).toContain(`${fmt(bulat(BATAS_GB / GB_TAHUN))} tahun`);
    expect(badan.match(/\b292\b/g)!.length).toBeGreaterThanOrEqual(2);
    expect(badan).toContain(`Lab memuat ${fmt(BUKU_LAB)} buku dan 12 bulan × ${fmt(POSTING_PER_BULAN_LAB)} posting, yaitu ${fmt(TOTAL_LAB)} posting`);
  });
  test("label sumber: Hitungan hanya atas Asumsi, tidak ada Rekaman lab di dekat hasil rumus naskah, dan 'Tidak dijalankan' menempel pada sumber luar dan bacaan kode", () => {
    for (const m of badan.matchAll(/\(Hitungan[^)]*\)/g)) expect(m[0]).toBe("(Hitungan atas Asumsi)");
    for (const m of badan.matchAll(/\(Tidak dijalankan[^)]*\)|, Tidak dijalankan\)/g)) expect(m[0]).toMatch(/Tidak dijalankan/);
    const tdj = [...badan.matchAll(/Tidak dijalankan/g)].length;
    expect(tdj).toBeGreaterThanOrEqual(7);
    expect(badan.match(/\(Ilustrasi\)|Ilustrasi/g)!.length).toBeGreaterThanOrEqual(3);
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
  });
  test("kata universal dan negatif di prosa dicari kasus tandingannya: setiap kemunculan 'hanya', 'tidak ada', 'tidak pernah', 'semua', 'tiap', dan 'selalu' dihitung", () => {
    const hitung = (re: RegExp) => (badan.match(re) ?? []).length;
    expect({
      hanya: hitung(/\bhanya\b/gi), tidakAda: hitung(/tidak ada/gi), tidakPernah: hitung(/tidak pernah|belum pernah/gi), semua: hitung(/\bsemua\b/gi),
      setiap: hitung(/\bsetiap\b/gi), selalu: hitung(/\bselalu\b/gi), tiap: hitung(/\btiap\b/gi),
    }).toEqual(SIDIK.kata);
    // 'selalu', 'setiap', dan 'tidak pernah' tidak dipakai: tak ada kasus tandingan yang perlu dicari
    expect(hitung(/\bselalu\b|\bsetiap\b|tidak pernah/gi)).toBe(0);
    // setiap frasa 'semua X' dikunci: tiap kasus berlingkup dengan rekaman bagian A (semua partisi posting, semua posting, semua buku)
    expect([...badan.matchAll(/semua ([a-z`]+)/gi)].map((m) => m[0])).toEqual(SIDIK.semuaFrasa);
  });
});

// ---- tanpa kunci baris: kalimat bermakna diturunkan dari sumbernya (celah putaran 2 uji mutasi) ---------------------------
const hurufBagian = (isi: string, kunci: string): string => {
  const baris = isi.split("\n");
  const i = baris.findIndex((b) => b.includes(kunci));
  expect(i, `kunci rekaman tidak ada: ${kunci}`).toBeGreaterThanOrEqual(0);
  for (let n = i; n >= 0; n--) {
    const m = baris[n]!.match(/^# --- ([A-Z]\d?)\. /);
    if (m) return m[1]!;
  }
  throw new Error(`tak ada bagian untuk ${kunci}`);
};

describe("tanpa kunci baris: jam, angka, bagian rekaman, tautan, dan label di prosa diturunkan dari sumber", () => {
  const JAM_BUKA = cocok(barisM43, /laporan tutup buku harian pukul (\d\d\.\d\d) dan belum ada/)[1]!;
  const JAM_SELESAI = cocok(barisM43, /selesai pukul (\d\d\.\d\d), padahal/)[1]!;
  const JAM_TARGET = cocok(barisM43, /target Pak Hadi pukul (\d\d\.\d\d)/)[1]!;
  const RP_T2 = cocok(hal26, /kode yang salah menambah (Rp[\d.]+) ke cache/)[1]!;
  const SQLSTATE = cocok(lB.teks, /SQLSTATE (\d+)/)[1]!;
  const POSTING_LEPAS = cocok(lepas, /dengan ([\d.]+) posting per bulan/)[1]!;
  const BARU_NOL = cocok(lF.teks, /dari snapshot <tanggal>: \d+ buku diperiksa, (\d+) tidak cocok/)[1]!;
  const TANDAI = fmt(Number(cocok(lF.teks, /cek cache: \d+ buku diperiksa, (\d+) tidak cocok/)[1]));
  const BUKU_LEPAS = fmt(Number(cocok(lF.teks, /cek cache: (\d+) buku diperiksa, \d+ tidak cocok/)[1]));
  test("jam cerita sama dengan naskah di tiap tempat: Gejala, catatan Ilustrasi, dan kalimat kondisi rekaman", () => {
    expect([JAM_BUKA, JAM_SELESAI, JAM_TARGET]).toEqual(["08.00", "14.20", "06.00"]);
    expect(badan).toContain(`Pukul ${JAM_BUKA} Pak Hadi membuka laporan tutup buku harian, dan laporan itu belum ada.`);
    expect(badan).toContain(`Pemeriksaan harian yang ia tulis baru selesai pukul ${JAM_SELESAI}, padahal target Pak Hadi pukul ${JAM_TARGET}.`);
    expect(badan).toContain(`pukul ${JAM_BUKA}, ${JAM_SELESAI}, dan ${JAM_TARGET} serta kenaikan p95 berasal dari naskah`);
    expect(badan).toContain(`jadi pukul ${JAM_SELESAI} dan pukul ${JAM_TARGET} tetap Ilustrasi.`);
    expect(badan).toContain(`penyebab pukul ${JAM_SELESAI}.`);
    expect(frontmatter).toContain(`pukul ${JAM_BUKA}`);
    expect(frontmatter).toContain(`selesai pukul ${JAM_SELESAI}`.replace(/.*/, 'title: "5.10 M43: Pemeriksaan saldo harian selesai pukul 14.20"'));
  });
  test("selisih Tahap 2, asal angka, dan angka di prosa: Rp5.000, 438 juta, 250 byte, 292 tahun, 28.000, 10.061 dari 10.288, 0 ditandai", () => {
    expect(RP_T2).toBe("Rp5.000");
    expect(badan).toContain(`Di Tahap 2 job ini menemukan selisih ${RP_T2} antara cache dan posting ([[t2-saldo-bukan-kolom]]).`);
    expect(badan).toContain(`yaitu ${fmt(TOTAL_LAB)} posting, jauh di bawah ${fmt(POSTING_TAHUN / 1e6)} juta di naskah.`);
    expect(badan).toContain(`dan ${BYTE} byte per posting termasuk index adalah Asumsi naskah. Dasar rumusnya ada di [[t5-skema]].`);
    expect(naskah).toContain("*Posting per tahun = transaksi per hari × 2 × 365*");
    expect(badan).toContain(`Tiga transaksi uang per user aktif per hari, dua posting per transaksi, dan ${BYTE} byte per posting`);
    expect(badan).toContain(`Ukuran saja bukan masalahnya: ${fmt(bulat(BATAS_GB / GB_TAHUN))} tahun data.`);
    expect(badan).toContain(`dengan SQLSTATE ${SQLSTATE} (\`lepas.txt\` bagian ${hurufBagian(lepas, "DELETE pada posting_lalu_05 ditolak")}).`);
    expect(badan).toContain(`run lab yang terpisah, dengan ${POSTING_LEPAS} posting per bulan, setelah satu bulan dilepas:`);
    expect(badan).toContain(`menandai ${TANDAI} dari ${BUKU_LEPAS} buku begitu data lama keluar dari tabel`);
    expect(badan).toContain(`Pemeriksaan dari snapshot menandai ${BARU_NOL}. Data lama tetap ada di arsip`);
    expect(badan).toContain(`Pemeriksaan tanpa snapshot menandai ${TANDAI} dari ${BUKU_LEPAS} buku, dan pemeriksaan dari snapshot menandai ${BARU_NOL} (\`lepas.txt\` bagian ${hurufBagian(lepas, "cek cache: 10288 buku diperiksa, 10061")}).`);
    expect(badan).toContain(`Keduanya menandai ${sA.teks.match(/(\d+) tidak cocok/)![1]} buku tidak cocok.`);
    expect(BARU_NOL).toBe("0");
    expect(TANDAI).toBe("10.061");
    expect(badan).toContain(`serta pertumbuhan \`posting\` ±${fmt(GB_TAHUN, 1)} GB per tahun.`);
  });
  test("bagian rekaman yang disebut: huruf diturunkan dari kepala bagian yang memuat faktanya, bukan dari tulisan halaman", () => {
    // tiap rujukan "`berkas.txt` bagian X" dipasangkan dengan fakta yang disebut sebelum rujukan itu (kata terdekat), lalu hurufnya dibaca dari rekaman
    const aturan: [string, string, string][] = [
      ["Semua posting sejak awal. Rekaman lab", "snapshot", hurufBagian(snap, "# Baris posting dibaca: 1.800.000 dari 1.800.000")],
      ["1.800.000 dari 1.800.000 posting", "snapshot", hurufBagian(snap, "# Baris posting dibaca: 1.800.000 dari 1.800.000")],
      ["Tiap job snapshot membaca persis satu bulan", "snapshot", hurufBagian(snap, "# 150.000, 150.000")],
      ["selisih 5.000 yang sama", "snapshot", hurufBagian(snap, "# Kedua pemeriksaan menandai satu buku yang sama")],
      ["SQLSTATE", "lepas", hurufBagian(lepas, "DELETE pada posting_lalu_05 ditolak")],
      ["waktu terkecil", "lepas", hurufBagian(lepas, "Batas yang diperiksa: waktu terkecil DELETE")],
      ["begitu data lama keluar dari tabel", "lepas", hurufBagian(lepas, "cek cache: 10288 buku diperiksa, 10061")],
      ["Data lama tetap ada di arsip", "lepas", hurufBagian(lepas, "EXCEPT ALL kedua arah")],
      ["menandai 10.061 dari 10.288 buku, dan pemeriksaan dari snapshot menandai 0", "lepas", hurufBagian(lepas, "cek cache: 10288 buku diperiksa, 10061")],
      ["Pemeriksaan dari snapshot menandai 0 (", "lepas", hurufBagian(lepas, "cek cache dari snapshot <tanggal>: 10288 buku diperiksa, 0 tidak cocok")],
      ["Ledger menolak `DELETE` atas posting dengan SQLSTATE 23001", "lepas", hurufBagian(lepas, "DELETE pada posting_lalu_05 ditolak")],
      ["tesnya lulus di", "testing", hurufBagian(testing, "--- PASS: TestCekCacheSnapshotSamaDenganCekCachePenuh")],
      ["Lab membaca 1.800.000 dari 1.800.000 posting", "snapshot", hurufBagian(snap, "# Baris posting dibaca: 1.800.000 dari 1.800.000")],
    ];
    const rujuk = [...badan.matchAll(/`(snapshot|lepas|testing)\.txt` bagian ([A-Z])/g)];
    expect(rujuk.length).toBeGreaterThanOrEqual(10);
    for (const r of rujuk) {
      const konteks = badan.slice(Math.max(0, r.index! - 240), r.index! + r[0].length);
      const cocokAturan = aturan.filter(([kata]) => konteks.includes(kata)).sort((a, b) => konteks.lastIndexOf(b[0]) - konteks.lastIndexOf(a[0]))[0];
      expect(cocokAturan, `tak ada aturan untuk rujukan: ${konteks.slice(-120)}`).toBeDefined();
      expect([r[1], r[2]], konteks.slice(-120)).toEqual([cocokAturan![1], cocokAturan![2]]);
    }
    expect(hurufBagian(testing, "--- PASS: TestCekCacheSnapshotSamaDenganCekCachePenuh")).toBe("A");
    expect(badan).toContain("`testing.txt` bagian A");
  });
  test("tautan di prosa: tiap [[id]] menempel pada kalimat yang menjelaskan isinya (tautan ditukar tertangkap)", () => {
    for (const k of [
      "tabel `posting` yang dipisah menurut `dibuat`, satu per bulan ([[t5-partisi]]).",
      "Pak Hadi menulis aturannya di PRD v5 ([[t5-prd]]).",
      "dan caranya dibahas di [[t5-partisi]].",
      "- [[t5-partisi]]: partisi tabel `posting` per bulan, snapshot saldo, dan arsip bulan lama. Keputusannya ADR 49.",
      "- [[t5-skema]]: tabel `snapshot_saldo` dan `arsip_partisi`, serta pertumbuhan `posting` ±109,5 GB per tahun.",
      "- [[t2-saldo-bukan-kolom]]: saldo adalah jumlah posting, dan `saldo_cache` hanya salinan yang diperiksa.",
      "- [[t5-kms]]: arsip partisi yang dienkripsi sebelum keluar dari database utama. Keputusannya ADR 57.",
      "200.000 user aktif adalah 20% dari 1.000.000 user terdaftar ([[t5-prd]]).",
    ]) expect(badan, k).toContain(k);
    expect(hal26).toContain("jumlah posting");
  });
  test("label di prosa: arti label di blok Gejala, Rekaman lab di tebakan, dan tiga sumber luar berlabel Tidak dijalankan", () => {
    expect(badan).toContain("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
    for (const l of ["Ilustrasi", "Rekaman lab", "Asumsi", "Tidak dijalankan"]) expect(cara, l).toContain(l);
    expect(badan).toContain("Semua posting sejak awal. Rekaman lab `snapshot.txt` bagian A: ");
    expect(badan.match(/dibuka 2026-11-02, Tidak dijalankan\)/g)).toHaveLength(3);
    expect(badan).toContain("(sumber yang sama, Tidak dijalankan).");
    expect(badan.match(/\(Tidak dijalankan: dibaca dari/g)).toHaveLength(2);
    expect(badan).toContain("(Tidak dijalankan); tesnya lulus di `testing.txt` bagian A.");
    expect(badan.match(/Tidak dijalankan/g)).toHaveLength(1 + 3 + 1 + 2 + 2);
  });
  test("kata universal dan nama berkas di prosa: 'semua' hanya di kalimat yang rekaman atau kodenya menopang; nama berkas rekaman sesuai isi", () => {
    expect(badan).toContain("Query-nya menjumlah `jumlah` dari semua posting tiap buku, lalu membandingkannya dengan `saldo_cache`:");
    expect(kodeCek).toContain("coalesce(sum(p.jumlah), 0)");
    expect(badan).toContain("Pemeriksaan menjumlah `jumlah` dari semua buku, jadi tiap baris posting tetap masuk hitungan. Index mengubah cara baris ditemukan, bukan berapa baris yang dijumlah.");
    expect(badan).toContain("Widget ini mengikuti rekaman `snapshot.txt`: pemeriksaan tanpa snapshot, sebelas job snapshot, lalu pemeriksaan dari snapshot terakhir.");
    expect(badan).toContain("Rekaman lab `snapshot.txt` bagian A:");
    expect(badan).toContain("`DELETE` atas posting dengan SQLSTATE");
    expect(badan).toContain("Ledger menolak `DELETE` atas posting");
    expect(badan).toContain("`DROP TABLE` atau `DETACH PARTITION` atas satu partisi jauh lebih cepat daripada operasi massal.");
    expect(badan).toContain("overhead `VACUUM` dari `DELETE` massal");
    expect(badan).toContain("hanya `repo/snapshot.go` dan tesnya yang menyebut tabel itu");
    // setiap kalimat dengan kata penentu di KUNCI_LITERAL ada di halaman
    for (const k of KUNCI_LITERAL) expect(badan, k.slice(0, 60)).toContain(k);
  });
});

describe("tanpa kunci baris: teks diagram, skenario, dan baris riset diturunkan dari sumber", () => {
  const T = fmt(TOTAL_LAB), P = fmt(POSTING_PER_BULAN_LAB), BK = fmt(BUKU_LAB);
  const POSTING_LEPAS_N = cocok(lepas, /dengan ([\d.]+) posting per bulan/)[1]!;
  const BUKU_LEPAS_N = fmt(Number(cocok(lF.teks, /cek cache: (\d+) buku diperiksa, \d+ tidak cocok/)[1]));
  test("skenario: judul, pengantar, label komponen, pertanyaan, pilihan, penjelasan, dan tiap judul dan penjelasan langkah", () => {
    expect(skenario.judul).toBe("Pemeriksaan harian membaca semua posting; dari snapshot ia membaca satu bulan");
    expect(skenario.pengantar).toBe("Lab memuat 12 bulan posting. Tebak dulu, lalu ikuti pemeriksaan tanpa snapshot, snapshot akhir bulan, dan pemeriksaan dari snapshot. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    expect(skenario.komponen).toEqual([{ id: "job", label: "Job pemeriksaan (api-t5)" }, { id: "db", label: "Tabel posting" }, { id: "snap", label: "Tabel snapshot_saldo" }]);
    expect(skenario.predict.q).toBe(`Lab menyimpan ${T} posting dalam 12 partisi bulanan. Snapshot saldo sudah ada sampai bulan lalu. Berapa posting yang dibaca pemeriksaan harian yang memakai snapshot terakhir?`);
    expect(skenario.predict.options).toEqual([
      `Semua ${T}, karena tiap buku tetap dijumlah dari posting pertamanya`,
      `Sekitar ${fmt(TOTAL_LAB / 2)}, karena snapshot hanya membuang separuh posting tertua`,
      `Satu bulan, ${P}, karena hanya posting sesudah snapshot yang terbaca`,
      "Hampir nol, karena snapshot sudah memuat saldo semua buku sampai hari ini",
    ]);
    expect(skenario.predict.explain).toBe(`Rekaman snapshot.txt bagian ${hurufBagian(snap, "# Baris posting dibaca: 450.000")}: ${P} dari ${T} posting, yaitu 8,3%, satu bulan dari 12. Pemeriksaan membaca snapshot terakhir dan posting sesudahnya, jadi yang dibaca adalah posting bulan berjalan.`);
    expect(skenario.sumber.catatan).toBe(`Server Go api-t5 dan PostgreSQL 17.11 dari database bersih (make -C labs/t5-partisi run). Jalur utama: snapshot.txt bagian A, B, C, dan D, dengan ${BK} buku dan 12 bulan × ${P} posting. Ubah satu hal: lepas.txt bagian C dan F, run terpisah dengan ${POSTING_LEPAS_N} posting per bulan. Lab memilih ${P} posting per bulan supaya satu bulan dari 12 sama dengan 8,3% di naskah, jadi 8,3% bukan temuan. Jumlah baris dibaca dari pg_stat_user_tables, bukan dari waktu; waktu tidak direkam. Lab tidak punya app Flutter dan tidak merekam layar.`);
    expect(skenario.langkah.map((l) => [l.judul, l.jelas])).toEqual([
      ["Tanpa snapshot, pemeriksaan membaca semua posting", `Job menjumlah posting tiap buku dan membandingkannya dengan saldo_cache. Ia membaca ${T} dari ${T} posting, dan semua buku cocok.`],
      ["Tiap job snapshot menulis saldo akhir satu bulan", `Sebelas job snapshot berjalan dari bulan paling lama sampai bulan lalu. Tiap job membaca persis posting bulannya, ${P} baris.`],
      ["Snapshot sama dengan hitungan langsung atas posting", `Tabel snapshot_saldo berisi ${fmt(11 * BUKU_LAB)} baris untuk 11 bulan dan ${BK} buku. Tiap snapshot dibandingkan dengan hitungan langsung atas posting, dan 0 baris berbeda.`],
      ["Dari snapshot terakhir, pemeriksaan membaca satu bulan", `Pemeriksaan membaca ${P} dari ${T} posting, yaitu 8,3%, dan semua buku tetap cocok. Pekerjaannya hanya posting bulan berjalan.`],
      ["Satu selisih nyata terlihat oleh kedua pemeriksaan", "Cache buku 8 dinaikkan 5.000 tanpa posting. Pemeriksaan penuh dan pemeriksaan dari snapshot menandai buku yang sama dengan cache, hitungan, dan selisih yang sama."],
    ]);
    expect(skenario.varian.langkah.map((l) => [l.judul, l.jelas])).toEqual([
      ["Satu partisi bulan dilepas dari tabel posting", `Run lab yang terpisah memuat ${POSTING_LEPAS_N} posting per bulan. Perintah DETACH melepas satu bulan, sehingga tabel posting hanya memperlihatkan 140.000 dari 168.000 posting.`],
      ["Tanpa snapshot, hampir semua buku ditandai tidak cocok", `Pemeriksaan tanpa snapshot menandai 10.061 dari ${BUKU_LEPAS_N} buku, karena posting lama buku itu tidak ada lagi di tabel. Cache buku itu sendiri benar.`],
      ["Dari snapshot, 0 buku ditandai", `Pemeriksaan dari snapshot memakai saldo akhir bulan yang sudah tersimpan, jadi 0 dari ${BUKU_LEPAS_N} buku ditandai.`],
    ]);
    expect(skenario.pengantar).not.toContain("Sesudah langkah terakhir, centang 'Ubah satu hal'.x");
  });
  test("diagram: id, judul, label baris, sub, catatan, dan nada tiap simpul", () => {
    expect(diagram.id).toBe("t5-m43-baca-posting");
    expect(diagram.judul).toBe("Pemeriksaan harian membaca semua posting; dari snapshot ia membaca satu bulan");
    expect(diagram.baris.map((b) => [b.label, b.sub])).toEqual([["Tanpa snapshot", "semua posting"], ["Dari snapshot terakhir", "posting sesudahnya"]]);
    expect(diagram.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["warn", "good"], ["good", "good"]]);
    expect(diagram.catatan).toBe(`Angka dari rekaman lab skala kecil: ${BK} buku dan ${P} posting per bulan. Pada skala naskah posting setahun ${fmt(POSTING_TAHUN / 1e6)} juta (Asumsi). Waktu pemeriksaan tidak direkam.`);
  });
  test("baris riset: sumber dan tanggal diturunkan dari halaman, kutipan bahasa Inggris utuh, dan kolom terakhir", () => {
    const sumber: [string, string][] = [
      ["R5-155", "PostgreSQL 17 bagian 5.12.1 Overview (postgresql.org/docs/17/ddl-partitioning.html, dibuka 2026-11-02)"],
      ["R5-156", "PostgreSQL 17 Appendix K, PostgreSQL Limits (postgresql.org/docs/17/limits.html, dibuka 2026-11-02)"],
      ["R5-157", "PostgreSQL 17 bagian The Cumulative Statistics System (postgresql.org/docs/17/monitoring-stats.html, dibuka 2026-11-02)"],
      ["R5-158", "PostgreSQL 17 bagian Routine Vacuuming (postgresql.org/docs/17/routine-vacuuming.html, dibuka 2026-11-02)"],
    ];
    for (const [id, s] of sumber) {
      expect(barisRiset(id), id).toContain(s);
      expect(barisRiset(id).endsWith("|")).toBe(true);
      expect(barisRiset(id).split("|").slice(-2)[0]!.trim(), id).toMatch(/^Tidak berubah/);
    }
    expect(barisRiset("R5-158")).toContain("Normally, it will skip pages that don't have any dead row versions even if those pages might still have row versions with old XID values.");
    expect(barisRiset("R5-158")).toContain("aggressive vacuum membekukan juga halaman all-visible tetapi belum all-frozen");
    expect(barisRiset("R5-157")).toContain('pg_stat_user_tables "Same as pg_stat_all_tables, except that only user tables are shown."');
    expect(barisRiset("R5-155")).toContain("Bulk loads and deletes can be accomplished by adding or removing partitions");
    const r159 = barisRiset("R5-159");
    expect(r159).toContain(`${fmt(bulat((36.5 / 438) * 100, 2), 2)}% (ditulis 8,3%)`);
    expect(r159).toContain(`${fmt(bulat((36.5 / 1314) * 100, 2), 2)}% (ditulis 2,8%)`);
    expect(r159).toContain(`= ${fmt(BATAS_GB / GB_TAHUN, 1)} (ditulis 292 tahun)`);
    expect(r159).toContain(`${fmt(11 * BUKU_LAB)}`);
    expect(r159).toContain("Dihitung dengan skrip sendiri, dibaca 2026-11-02");
    expect(r159.split("|").slice(-2)[0]!.trim()).toBe("Tidak berubah");
    expect(barisRiset("R5-156")).toContain("Tidak berubah sejak R5-04 (yang membaca PostgreSQL 18), dicek 2026-11-02");
    expect(barisRiset("R5-158")).toContain("Naskah M43 menulis \"VACUUM yang makin panjang\"");
  });
});

// Tinjauan independen 5.10 (keputusan 1539): lima kalimat yang sebelumnya melampaui sumbernya, dijaga dari sumbernya.
describe("tinjauan 1539: kalimat yang dikoreksi diturunkan dari kode dan rekaman lab", () => {
  const dasarPy = baca("labs/t5-partisi/dasar.py");
  const ledgerPage = baca("situs/src/content/docs/tahap-2/ledger.mdx");
  const kodeLab = (terlacak ? [...terlacak] : execSync("git ls-files", { cwd: akar }).toString().split("\n"))
    .filter((f) => f.startsWith("labs/api-t5/") && /\.(go|sql|py)$/.test(f) && !f.endsWith("_test.go"));
  test("baris dibaca = JUMLAH seq_tup_read + idx_tup_fetch, dihitung sebagai selisih sebelum dan sesudah (bukan selisih kedua kolom)", () => {
    expect(dasarPy).toContain("return {r[0]: r[1] + r[2] for r in c.execute(");
    expect(dasarPy).toContain("return sum(sesudah.get(k, 0) - sebelum.get(k, 0) for k in sesudah)");
    expect(badan).toContain("Baris yang dibaca adalah jumlah `seq_tup_read` dan `idx_tup_fetch`");
    expect(badan).not.toMatch(/selisih `seq_tup_read` dan `idx_tup_fetch`/);
  });
  test("partisi didefinisikan sebelum pemakaian pertamanya di prosa (kode dan tautan tidak dihitung)", () => {
    const bersih = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[^>]*\/>/g, "").replace(/\[\[[^\]]+\]\]/g, "");
    const pertama = bersih.search(/\bpartisi\b/i);
    expect(pertama).toBeGreaterThan(0);
    expect(bersih.slice(pertama).startsWith("Partisi adalah bagian tabel")).toBe(true);
  });
  test("buku diberi arti di pemakaian pertama dan artinya sama dengan halaman ledger prasyarat", () => {
    expect(ledgerPage).toContain("berisi tempat uang dicatat");
    const pertama = badan.search(/tiap buku/);
    expect(badan.slice(pertama).startsWith("tiap buku, yaitu tempat uang satu pihak dicatat di ledger, dengan jumlah posting-nya.")).toBe(true);
    expect(badan.slice(0, pertama)).not.toMatch(/tiap buku|semua buku|\d buku/);
  });
  test("bulan berjalan di lab penuh 150.000 posting, jadi 8,3% adalah batas atas", () => {
    const m = cocok(pruning, /posting_bulan_00 \| (\d+)/)[1]!;
    expect(Number(m)).toBe(POSTING_PER_BULAN_LAB);
    expect(badan).toContain(`Bulan berjalan di lab sudah berisi ${fmt(Number(m))} posting, jadi satu bulan penuh adalah batas atas: di awal bulan job membaca lebih sedikit.`);
    expect(snapshotGo).toContain("p.dibuat >= $2::timestamptz");
  });
  test("snapshot ditulis dari posting dan snapshot bulan sebelumnya; satu-satunya INSERT di kode lab; tidak ada UPDATE atau DELETE", () => {
    expect(snapshotGo).toContain("SELECT buku_id, saldo, jumlah_posting FROM snapshot_saldo WHERE periode = ($1::date - interval '1 month')::date");
    expect(snapshotGo).toContain("SELECT buku_id, sum(jumlah) AS saldo, count(*) AS n FROM posting");
    const isi = kodeLab.map((f) => baca(f)).join("\n");
    expect((isi.match(/INSERT INTO snapshot_saldo/g) ?? []).length).toBe(1);
    expect(isi).not.toMatch(/UPDATE\s+(\S+\.)?snapshot_saldo|DELETE\s+FROM\s+(\S+\.)?snapshot_saldo|TRUNCATE\s+(\S+\.)?snapshot_saldo/i);
    expect(badan).toContain("Job snapshot menulisnya dari posting dan snapshot bulan sebelumnya.");
    expect(badan).not.toContain("hanya ditulis dari posting");
  });
  test("snapshot benar untuk bulan tertutup hanya selama tidak ada posting terlambat: README dan tes Go menyatakannya", () => {
    expect(readme).toContain("Posting yang ditulis terlambat dengan `dibuat` di bulan yang sudah di-snapshot tidak ikut terhitung dan terlihat sebagai selisih.");
    expect(snapshotTes).toContain("posting terlambat: selisih buku B dari snapshot");
    expect(badan).toContain("ia benar untuk bulan yang sudah ditutup, selama tidak ada posting baru dengan `dibuat` di bulan itu.");
    expect(badan).not.toMatch(/ia benar untuk bulan yang sudah ditutup\.(?!\s*$)/m);
  });
  test("'lambat' tidak ditulis sebagai hasil rekaman: waktu pemeriksaan tidak direkam, dan 10.061 buku ditandai bukan soal waktu", () => {
    expect(lepas).not.toMatch(/lambat/);
    expect(snap).not.toMatch(/lambat/);
    expect(badan).not.toContain("bukan hanya lambat");
    expect(badan).toContain("Waktu bergantung mesin dan tidak direkam");
  });
  test("run lepas.txt adalah bagian lab yang sama (t5-partisi), bukan lab lain", () => {
    expect(readme).toContain("| `output/lepas.txt` | `lepas` |");
    expect(skenario.langkah.length + skenario.varian.langkah.length).toBe(8);
    expect(badan).not.toMatch(/lab terpisah/i);
    expect(skenarioMentah).not.toMatch(/Lab terpisah/);
  });
});

// Celah yang lolos mutasi putaran 2 (tanpa kunci baris) pada tinjauan 5.10 (keputusan 1539).
describe("tinjauan 1539, putaran 2: celah yang lolos mutasi tanpa kunci baris ditutup dari sumbernya", () => {
  const potong = (isi: string, awal: (b: string) => boolean, sebelum: (b: string) => boolean): string => {
    const bs = isi.split("\n");
    const a = bs.findIndex(awal);
    expect(a, "awal potongan rekaman").toBeGreaterThanOrEqual(0);
    const z = bs.findIndex((b, i) => i > a && sebelum(b));
    expect(z, "akhir potongan rekaman").toBeGreaterThan(a);
    return bs.slice(a, z).join("\n").trimEnd();
  };
  test("minggu di registry, badan, dan frontmatter sama dengan kolom Minggu M43 di naskah", () => {
    const minggu = cocok(naskah, /^\| M43 \| (\d+) \|/m)[1]!;
    expect((dari("t5-m43") as unknown as { label: string }).label).toBe(`Masalah 43 · minggu ${minggu}`);
    expect(badan).toContain(`Minggu ${minggu} Tahap 5. Pukul 08.00`);
    expect(frontmatter).toContain(`description: Minggu ${minggu}.`);
  });
  test("run lepas: tiap partisi berisi sama banyak posting, 140.000 dari 168.000 turun dari jumlahnya, arsip berisi satu partisi", () => {
    const tiap = Number(cocok(lepas, /dengan ([\d.]+) posting per bulan/)[1]!.replace(/\./g, ""));
    const isi = [...bagianRekaman(lepas, "A").teks.matchAll(/^ posting_(?:bulan|lalu)_\d+\s*\| (\d+)$/gm)].map((m) => Number(m[1]));
    expect(isi.length).toBe(6);
    expect(new Set(isi)).toEqual(new Set([tiap]));
    const jumlah = isi.reduce((a, b) => a + b, 0);
    expect(lepas).toContain(`${fmt(jumlah - tiap)} dari ${fmt(jumlah)}`);
    expect(lE.teks).toContain(`File arsip: ${fmt(tiap)} baris`);
    expect(skenario.varian.langkah[0]!.kirim).toContain(`${fmt(jumlah - tiap)} dari ${fmt(jumlah)}`);
  });
  test("Snippet: lang go hanya untuk berkas .go, rekaman teks tanpa lang", () => {
    const semua = [...badan.matchAll(/<Snippet [^>]*\/>/g)].map((m) => m[0]);
    expect(semua.length).toBe(5);
    for (const sn of semua) {
      const f = sn.match(/file="([^"]+)"/)![1]!;
      expect(sn.match(/lang="([^"]+)"/)?.[1], f).toBe(f.endsWith(".go") ? "go" : undefined);
    }
  });
  test("pemuat widget alur memuat semua skrip yang dimuat halaman Tahap 4 lain yang memakai WidgetLama alur", () => {
    const daftar = (t: string): string[] => JSON.parse(cocok(t, /<SkripLama daftar=\{(\[[^\]]*\])\} \/>/)[1]!);
    const tetangga = [...(terlacak ?? [])].filter((f) => f.startsWith("situs/src/content/docs/tahap-4/") && f.endsWith(".mdx"))
      .map((f) => baca(f)).filter((t) => t.includes('<WidgetLama nama="alur"') && /<SkripLama daftar=\{\[[^\]]*\]\} \/>/.test(t));
    expect(tetangga.length).toBeGreaterThan(3);
    const irisan = tetangga.map(daftar).reduce((a, b) => a.filter((x) => b.includes(x)));
    expect(irisan).toEqual(expect.arrayContaining(["hp", "alur-core", "alur"]));
    for (const x of irisan) expect(daftar(badan)).toContain(x);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m43.json" />');
  });
  test("skenario: tiap kirim sama dengan potongan rekaman yang ditunjuk strukturnya (bukan hanya barisnya ada)", () => {
    const blank = (b: string) => b === "";
    const kirim = [...skenario.langkah.map((l) => l.kirim), ...skenario.varian.langkah.map((l) => l.kirim)];
    const bs = snap.split("\n");
    const a2 = bs.findIndex((b) => b.startsWith("$ ./api-t5 -buat-snapshot <tanggal 1 bulan ke-11"));
    const harap = [
      potong(snap, (b) => b === "$ ./api-t5 -cek-cache", blank),
      bs.slice(a2, a2 + 2).join("\n") + "\n" + potong(snap, (b) => b.startsWith("# Tiap job membaca persis"), (b) => b.startsWith("=> SELECT count(*) AS baris")),
      potong(snap, (b) => b.startsWith("=> SELECT count(*) AS baris"), (b) => b.startsWith("$ ./api-t5 -buat-snapshot <bulan paling lama>")),
      potong(snap, (b) => b === "$ ./api-t5 -cek-cache -dari-snapshot", (b) => b.startsWith("# Snapshot yang lebih tua")),
      potong(snap, (b) => b.startsWith("(api_t5) => UPDATE buku SET saldo_cache = saldo_cache + 5000"), (b) => b.startsWith("(api_t5) => UPDATE buku SET saldo_cache = saldo_cache - 5000")),
      potong(lepas, (b) => b.startsWith("# Tanpa partisi DEFAULT dan di luar blok transaction"), (b) => b.startsWith("=> SELECT conname")),
      potong(lepas, (b) => b === "$ ./api-t5 -cek-cache", (b) => b === "$ ./api-t5 -cek-cache -dari-snapshot"),
      potong(lepas, (b) => b === "$ ./api-t5 -cek-cache -dari-snapshot", blank),
    ];
    expect(kirim.length).toBe(harap.length);
    kirim.forEach((k, i) => expect(k, `kirim ${i}`).toBe(harap[i]));
  });
  test("baris riset: nomor halaman di kolom Konsep dan Yang dipakai halaman sama dengan registry; frasa kutipan yang dipakai halaman ada", () => {
    const nomor = dari("t5-m43").nomor!;
    const awal = new RegExp(`^${nomor.replace(".", "\\.")}[: ]`);
    for (const id of ["R5-155", "R5-156", "R5-157", "R5-158", "R5-159"]) {
      const k = barisRiset(id).split("|").map((x) => x.trim());
      expect(k[2], id).toContain(id === "R5-159" ? `halaman ${nomor} (` : `(${nomor}`);
      expect(k[4], id).toMatch(awal);
    }
    expect(barisRiset("R5-156")).toContain("1 TB = 1.000 GB");
    expect(barisRiset("R5-157")).toContain('"just before going idle"');
  });
  test("klaim negatif 'Lab tidak punya app Flutter' berlingkup labs/t5-partisi dan labs/api-t5: tak ada berkas Dart atau pubspec", () => {
    const berkas = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/t5-partisi/") || f.startsWith("labs/api-t5/"));
    expect(berkas.length).toBeGreaterThan(20);
    expect(berkas.filter((f) => /\.dart$|(^|\/)pubspec\.ya?ml$/.test(f))).toEqual([]);
    expect(badan).toContain("Lab tidak punya app Flutter dan tidak merekam layar.");
  });
});
