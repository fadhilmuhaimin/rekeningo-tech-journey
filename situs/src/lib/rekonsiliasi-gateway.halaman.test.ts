// Penjaga halaman 4.9 (keputusan 1298 sampai 1300): angka, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, widget runsql, kartu Cek diri, halaman istilah, dan baris
// riset di rekonsiliasi-gateway.mdx diturunkan dari rekaman labs/t4-webhook (rekon.txt, urutan.txt, tandatangan.txt, retry.txt),
// labs/t4-modul (proses-mati.txt), labs/t4-infra (rotasi.txt), kode lab api-t4 (pembayaran.go, repo/pembayaran.go,
// koreksi_rekon.go, migrasi), run.py, naskah Tahap 4, registry, baris riset, dan halaman tetangga.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.6): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci
// tidak menangkap SALAHNYA kalimat. Elemen non-prosa (diagram, widget, halaman istilah, baris riset) dikunci dengan sidik jari.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-rekonsiliasi-inti.json";
import istilahMentah from "../../data/halaman-istilah/rekonsiliasi.json";
import { DataRantai } from "./rantai";
import { HalamanIstilah } from "./istilah";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./rekonsiliasi-gateway.halaman.nilai";
import { ANGKA, DIAGRAM, ISTILAH, LABEL, NEGASI, RISET, TABEL, TAUTAN, WIDGET } from "./rekonsiliasi-gateway.halaman.kata";

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
const nilaiString = (o: unknown): string[] =>
  typeof o === "string" ? [o] : Array.isArray(o) ? o.flatMap(nilaiString) : o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => [k, ...nilaiString(v)]) : [String(o)];

const BERKAS = "situs/src/content/docs/tahap-4/rekonsiliasi-gateway.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const rekon = baca("labs/t4-webhook/output/rekon.txt");
const urutan = baca("labs/t4-webhook/output/urutan.txt");
const tandaTangan = baca("labs/t4-webhook/output/tandatangan.txt");
const retry = baca("labs/t4-webhook/output/retry.txt");
const prosesMati = baca("labs/t4-modul/output/proses-mati.txt");
const rotasi = baca("labs/t4-infra/output/rotasi.txt");
const skemaTxt = baca("labs/api-t4/output/skema.txt");
const runWebhook = baca("labs/t4-webhook/run.py");
const runApi = baca("labs/api-t4/run.py");
const pembayaranGo = baca("labs/api-t4/internal/service/pembayaran.go");
const repoGo = baca("labs/api-t4/internal/repo/pembayaran.go");
const koreksiGo = baca("labs/api-t4/internal/service/koreksi_rekon.go");
const koreksiRepoGo = baca("labs/api-t4/internal/repo/koreksi_rekon.go");
const aturanGo = baca("labs/api-t4/internal/service/t4_aturan.go");
const mainGo = baca("labs/api-t4/cmd/api/main.go");
const migrasi = baca("labs/api-t4/migrasi/000021_topup_bank.up.sql");
const widgetMentah = baca("situs/lama/widgets/data/t4-rekonsiliasi.json");
const widget = JSON.parse(widgetMentah) as Widget;
const diagram = DataRantai.parse(diagramMentah);
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal43 = baca("situs/src/content/docs/tahap-4/fitur-topup-verifikasi.mdx");
const hal44 = baca("situs/src/content/docs/tahap-4/dua-arah-pihak-ketiga.mdx");
const hal46 = baca("situs/src/content/docs/tahap-4/m29-topup-dua-kali.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const glosJson = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; s: string; u: string | null }[];
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];

interface Widget {
  id: string; title: string; setup: string; check: string;
  predict: { q: string; options: string[]; answer: number; explain: string };
  panels: Record<"before" | "after", { label: string; steps: { actor: string; sql: string; note: string }[] }>;
  toggles: { label: string; pairs: [string, string][] }[];
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
const plus = (n: number): string => `${n < 0 ? "−" : "+"}${titik(Math.abs(n))}`; // tanda minus halaman: U+2212
const angka = (s: string): number => Number(s.replace(/_/g, ""));
const kata = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan"];

// ---- rekaman: bagian dan nomor baris Snippet ---------------------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 1): number => {
    const i = baris.findIndex((b, n) => n >= dariIdx - 1 && ok(b));
    expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const akhirSebelum = (n: number): number => {
    let i = n - 1;
    while (baris[i - 1]!.trim() === "") i--;
    return i;
  };
  const terakhir = (): number => akhirSebelum(baris.length);
  const teks = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
  return { baris, nomor, akhirSebelum, terakhir, teks };
};
const RK = bagian(rekon);
const rA = RK.nomor((b) => b.startsWith("# --- A. ")), rB = RK.nomor((b) => b.startsWith("# --- B. ")), rC = RK.nomor((b) => b.startsWith("# --- C. "));
const rAwalA = RK.nomor((b) => b.startsWith("$ ./api-t4 -cek-topup"), rA), rAkhirA = RK.akhirSebelum(rB);
const rRekonB = RK.nomor((b) => b.startsWith("$ ./api-t4 -rekon <tanggal>"), rB);
const rSaldoSebelum = RK.nomor((b) => b === "# Saldo sebelum koreksi:", rB);
const rKoreksi = RK.nomor((b) => b === "$ ./api-t4 -koreksi-rekon", rB);
const rSaldoSesudah = RK.nomor((b) => b === "# Saldo sesudah koreksi:", rB);
const rInvarian = RK.nomor((b) => b.startsWith("jurnal yang jumlah posting-nya bukan nol"), rSaldoSesudah);
const rUlang = RK.nomor((b) => b === "$ ./api-t4 -koreksi-rekon   # dijalankan lagi", rB);
const rRekonC = RK.nomor((b) => b.startsWith("$ ./api-t4 -rekon <tanggal>"), rC);
const rDuaJob = RK.nomor((b) => b.startsWith("dua job bersamaan"), rC);
const rAkhirC = RK.terakhir();
const bagB = RK.teks(rB, rC - 1), bagC = RK.teks(rC, rAkhirC), bagA = RK.teks(rA, rAkhirA);
const UR = bagian(urutan);
const uF3 = UR.nomor((b) => b.startsWith("# --- F3. "));
const uAwalF3 = UR.nomor((b) => b.startsWith("settlement sesudah expire"), uF3);
const uAkhirF3 = UR.nomor((b) => b.startsWith("# Kedua insiden tetap terbuka"), uF3);
const TT = bagian(tandaTangan);
const tC = TT.nomor((b) => b.startsWith("# --- C. "));
const tAwal = TT.nomor((b) => b.startsWith("1. gateway menandatangani dengan rahasia baru"), tC);
const tAkhir = TT.nomor((b) => b === "(2 rows)", tAwal);
const PM = bagian(prosesMati);
const pC = PM.nomor((b) => b.startsWith("# --- C. "));
const pAwal1 = PM.nomor((b) => b.startsWith("# kedua top-up masih menunggu"), pC);
const pAkhir1 = PM.nomor((b) => b.startsWith("# sisi 23 jam: key hidup"), pC);
const pAwal2 = PM.nomor((b) => b.startsWith("# Rekonsiliasi harian api-t4 (RekonHarian"), pC);
const pAkhir2 = PM.terakhir();
const RO = bagian(rotasi);
const oD = RO.nomor((b) => b.startsWith("# --- D. "));
const oAwal = RO.nomor((b) => b.startsWith("# Gateway langsung menandatangani dengan v3"), oD);
const oAkhir = RO.nomor((b) => b.startsWith("# Selama service belum membaca"), oD);

// ---- kode lab ----------------------------------------------------------------------------------------------------------
const K = bagian(pembayaranGo);
const fungsi = (B: ReturnType<typeof bagian>, awal: string): { awal: number; akhir: number; teks: string } => {
  const a = B.nomor((b) => b.startsWith(awal));
  const z = B.nomor((b) => b === "}", a);
  return { awal: a, akhir: z, teks: B.teks(a, z) };
};
const fCek = fungsi(K, "func (s Service) CekTopup(");
const fRekon = fungsi(K, "func (s Service) RekonHarian(");
const fKreditV1 = fungsi(K, "func (s Service) kreditV1(");
const fTerapkan = fungsi(K, "func (s Service) terapkanStatus(");
const fKreditTopup = fungsi(K, "func (s Service) kreditTopup(");
const RP = bagian(repoGo);
const fLedger = fungsi(RP, "func (r Repo) LedgerTopupTanggal(");
const fCatat = fungsi(RP, "func (r Repo) CatatInsiden(");
const KO = bagian(koreksiGo);
const fJumlahBeda = fungsi(KO, "func (s Service) koreksiJumlahBeda(");
const fTdGateway = fungsi(KO, "func (s Service) koreksiTidakDiGateway(");
const fTdLedger = fungsi(KO, "func (s Service) koreksiTidakDiLedger(");
const MG = bagian(migrasi);
const mAwal = MG.nomor((b) => b.startsWith("CREATE TABLE insiden_rekon ("));
const mAkhir = MG.nomor((b) => b === ");", mAwal);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1] ?? t.match(/region="([^"]+)"/)?.[1] ?? t.match(/files=\{(\[[^\]]+\])\}/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1] ?? "(files)");
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// ---- angka rekaman -----------------------------------------------------------------------------------------------------
const insiden = (() => {
  const mulai = RK.baris.findIndex((l, i) => i >= rRekonB - 1 && l.startsWith(" jenis "));
  const out: { jenis: string; selisih: number; status: string; jurnal: string }[] = [];
  for (let i = mulai + 2; RK.baris[i]!.startsWith(" "); i++) {
    const k = RK.baris[i]!.split("|").map((x) => x.trim());
    out.push({ jenis: k[0]!, selisih: Number(k[1]), status: k[2]!, jurnal: k[3]! });
  }
  return out;
})();
const insidenSesudah = (() => {
  const mulai = RK.baris.findIndex((l, i) => i >= rKoreksi - 1 && l.startsWith(" jenis "));
  const out: { jenis: string; selisih: number; status: string; jurnal: string }[] = [];
  for (let i = mulai + 2; RK.baris[i]!.startsWith(" "); i++) {
    const k = RK.baris[i]!.split("|").map((x) => x.trim());
    out.push({ jenis: k[0]!, selisih: Number(k[1]), status: k[2]!, jurnal: k[3]! });
  }
  return out;
})();
const saldo = (dari: number) => {
  const mulai = RK.baris.findIndex((l, i) => i >= dari - 1 && l.startsWith(" nama "));
  const out: Record<string, number> = {};
  for (let i = mulai + 2; RK.baris[i]!.startsWith(" "); i++) {
    const k = RK.baris[i]!.split("|").map((x) => x.trim());
    out[k[0]!] = Number(k[1]);
  }
  return out;
};
const saldoAwal = saldo(rSaldoSebelum), saldoAkhir = saldo(rSaldoSesudah);
const bagianRunB = runWebhook.slice(runWebhook.indexOf('bagian("B. Rekonsiliasi harian'), runWebhook.indexOf('bagian("C. Dua job bersamaan'));
const bagianRunA = runWebhook.slice(runWebhook.indexOf('bagian("A. Job cek status'), runWebhook.indexOf('bagian("B. Rekonsiliasi harian'));
const jumlahTopup = (nama: string) => angka(bagianRunB.match(new RegExp(`${nama} = buat_topup\\(\\w+, ([\\d_]+)\\)`))![1]!);
const hasilKoreksi = cocok(RK.teks(rKoreksi, rKoreksi + 1), /koreksi rekon: diperiksa (\d+), dikoreksi lewat jurnal (\d+), selesai tanpa jurnal baru (\d+), tetap terbuka (\d+), galat (\d+)/);
const [periksa, koreksiJurnal, tanpaJurnal, terbuka] = [1, 2, 3, 4].map((i) => Number(hasilKoreksi[i]));

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.9 ada, konsep dan ADR 35, jalur inti, prasyarat 4.8 dan 2.26, lab t4-webhook, peran backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-rekonsiliasi")).toMatchObject({ ada: true, nomor: "4.9", jenis: "konsep", inti: true, prasyarat: ["t4-m30", "t2-job-rekonsiliasi"], lab: ["t4-webhook"], tahap: 4, peran: ["backend"], adr: [35] });
    expect(frontmatter).toContain('title: "4.9 Rekonsiliasi dengan gateway + ADR 35"');
    expect(dari("t4-rekonsiliasi").judul).toBe("Rekonsiliasi dengan gateway + ADR 35");
    expect(naskah).toContain("| 4.9 | 4 | Rekonsiliasi dengan gateway + ADR 35 | Konsep + ADR | ★ | t4-webhook | runsql |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-m30\]\], \[\[t2-job-rekonsiliasi\]\] · Jalur inti<\/p>/);
    expect(dari("t4-rekonsiliasi").menit).toBe(Number(m[1]) + Number(m[2]));
    expect(dari("t4-m30").nomor).toBe("4.8");
    expect(dari("t2-job-rekonsiliasi").nomor).toBe("2.26");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["t2-job-rekonsiliasi", "t3-pool", "t4-dua-arah", "t4-infra-secret", "t4-m29", "t4-m30", "t4-prd", "t4-topup-verifikasi", "berikutnya"].sort());
    const sesuai: [string, string, string][] = [
      ["t2-job-rekonsiliasi", "2.26", "Job terjadwal yang idempoten dan rekonsiliasi"], ["t3-pool", "3.8", "Connection pool"], ["t4-dua-arah", "4.4", "Dua arah ke pihak ketiga"],
      ["t4-infra-secret", "4.17", "Secret manager"], ["t4-m29", "4.6", "M29: Top-up Budi masuk dua kali"], ["t4-m30", "4.8", "M30: Saldo Citra tidak naik"],
      ["t4-prd", "4.1", "PRD v4"], ["t4-topup-verifikasi", "4.3", "Fitur: top-up dari bank"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 4.9 ditepati: 4.4 (mencocokkan catatan dengan laporan gateway), 4.3 (cek status dan rekonsiliasi), 4.6 (jawaban Pak Hadi dilengkapi)", () => {
    expect(hal44).toContain("| Mencocokkan catatan sendiri dengan laporan gateway | Jawaban untuk pertanyaan Pak Hadi | [[t4-rekonsiliasi]] |");
    expect(hal43).toContain("[[t4-m30]] dan [[t4-rekonsiliasi]]: kabar yang tidak pernah datang, job cek status, dan rekonsiliasi harian.");
    expect(hal46).toContain("Jawabannya dimulai di [[t4-webhook]] dan dilengkapi [[t4-rekonsiliasi]].");
    expect(hal43).toContain("Top-up yang kabarnya tidak pernah datang baru ditanyakan ke gateway sesudah menunggu lebih dari 30 menit (Asumsi lab, `topup.txt` bagian H).");
    harus("Itu aturan Pak Hadi: setiap rupiah dari luar harus cocok dengan catatan pengirimnya, dan selisih adalah insiden, bukan angka yang dikoreksi dengan tangan.");
    expect(hal41).toContain("Setiap rupiah dari luar harus cocok dengan catatan pihak yang mengirimnya. Kalau tidak cocok, namanya insiden, bukan angka yang saya koreksi.");
    expect(hal41).toContain("setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja");
  });
  test("halaman tidak menulis ulang isi 4.7 dan 4.8: hanya ADR 35 (dan ADR 34 tidak disebut); tanpa HMAC, SKIP LOCKED, atau ADR lain", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 35"]);
    expect(badan).not.toMatch(/HMAC|SKIP LOCKED|byte mentah|ADR 34/);
    expect(dari("t4-rekonsiliasi").adr).toEqual([35]);
  });
});

describe("naskah ADR 35 dan batas halaman", () => {
  const barisAdr = naskah.split("\n").find((b) => b.startsWith("| 35 | Dua lapis."))!;
  test("baris ADR 35 di naskah: 30 menit, tiga jenis selisih, dua alternatif, 20 baris, 5.000 top-up, tanpa UPDATE pada posting atau saldo_cache", () => {
    expect(barisAdr).toBeDefined();
    for (const k of ["lebih dari 30 menit (Asumsi)", "Idempotency-Key = `order_id`", "tidak_di_ledger, tidak_di_gateway, jumlah_beda", "`insiden_rekon` bernomor", "Tidak ada koreksi dengan UPDATE pada posting atau `buku.saldo_cache`",
      "lebih dari 20 baris (Asumsi; pembanding 5.000 top-up per hari", "Percaya webhook saja (M30); polling semua top-up tiap menit", "koreksi tangan oleh Keuangan (aturan Pak Hadi melarangnya)",
      "Selisih negatif atau pembalikan yang membuat saldo negatif tetap terbuka bagi tim risk dan Keuangan", "dua secret diterima sampai rotasi selesai", "settlement yang datang lagi sesudah kredit dibalik dijawab `ganda`"])
      expect(barisAdr, k).toContain(k);
  });
  test("hitungan kapan salah: 20.000 aktif × 0,25 = 5.000 top-up per hari (naskah), 20 ÷ 5.000 = 0,4%, 1% = 50; dan dituliskan di halaman", () => {
    expect(naskah).toContain("| Top-up dari bank | aktif × 0,25 ÷ 86.400 × puncak | 0,25 top-up per user aktif per hari (Asumsi), 5.000 per hari |");
    expect(naskah).toContain("| Request per detik | aktif × request ÷ 86.400 × puncak | 20.000 × 60 = 1,2 juta per hari");
    const harian = 20000 * 0.25;
    expect(harian).toBe(5000);
    expect((20 / harian) * 100).toBeCloseTo(0.4, 10);
    expect(harian * 0.01).toBe(50);
    harus("Dengan 5.000 top-up per hari (20.000 user aktif × 0,25, Asumsi), 20 ÷ 5.000 = 0,4% (Hitungan).");
    harus("Dari 5.000 top-up per hari, 1% adalah 50 top-up (Hitungan dari Asumsi).");
  });
  test("target PRD v4: 99% dalam 5 menit sejak kabar, 0 ganda, insiden ditutup dalam satu hari kerja; 4.3 menulis janji 5 menit dihitung sejak kabar dikirim", () => {
    expect(hal41).toContain("99% top-up tercatat dalam kurang dari 5 menit sejak gateway mengirim kabar.");
    expect(hal41).toContain("0 top-up tercatat dua kali; setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja.");
    expect(hal43).toContain("Janji 5 menit dihitung sejak kabar dikirim.");
    harus("PRD v4 menargetkan 99% top-up tercatat dalam kurang dari 5 menit sejak gateway mengirim kabar, dan 0 top-up tercatat dua kali. Keduanya target, bukan hasil lab ([[t4-topup-verifikasi]]).");
    harus("PRD yang sama menulis bahwa setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja ([[t4-prd]]).");
  });
});

describe("rekaman rekon.txt: bagian A (cek status), B (rekonsiliasi dan koreksi), C (ulang dan dua job)", () => {
  test("A: umur 0 dan 29 menit tidak ditanyakan, 31 menit ditanyakan dan dikredit; Citra Rp500.000; status dibayar dengan jurnal", () => {
    const diperiksa = [...bagA.matchAll(/cek top-up: diperiksa (\d+), dikredit (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(diperiksa).toEqual([[0, 0], [0, 0], [1, 1]]);
    expect(bagA).toContain("interval '29 minutes'");
    expect(bagA).toContain("interval '31 minutes'");
    expect(bagA).toContain("# bawaan -cek-umur 30m");
    expect(bagA).toMatch(/dibayar \| t/);
    expect(bagianRunA).toContain("ct = buat_topup(citra, 500_000)");
    expect(bagianRunA).toContain('harap(satu("SELECT status FROM topup_bank WHERE id = 1"), "dibayar", "cek status mengkredit")');
    expect(aturanGo).toContain("UmurCekStatus = 30 * time.Minute");
    harus("Rekaman bagian A memakai top-up Citra Rp500.000 yang webhook-nya tidak pernah datang. Job tidak menanyakan top-up berumur 0 dan 29 menit, dan menanyakan yang berumur 31 menit:");
    harus("Umur top-up diputar mundur lewat `UPDATE` kolom `dibuat` oleh pemilik schema, dan itu hanya di lab. Batas 30 menit terjaga dari dua sisi.");
    expect(bagA).toContain("# Lab saja: umur top-up diputar mundur 29 menit lewat UPDATE kolom `dibuat` oleh pemilik schema");
  });
  test("B: lima insiden terbuka (dua tidak_di_ledger 15.000 dan 60.000, satu jumlah_beda 5.000, dua tidak_di_gateway -40.000 dan -30.000), diturunkan dari run.py", () => {
    expect(insiden.map((i) => `${i.jenis} ${i.selisih}`).sort()).toEqual(["jumlah_beda 5000", "tidak_di_gateway -30000", "tidak_di_gateway -40000", "tidak_di_ledger 15000", "tidak_di_ledger 60000"]);
    expect(insiden.every((i) => i.status === "terbuka")).toBe(true);
    expect(RK.baris[rRekonB]).toContain("5 baris di laporan gateway; insiden baru: tidak_di_ledger 2, tidak_di_gateway 2, jumlah_beda 1");
    // run.py: nilai tiap order
    expect(jumlahTopup("t1")).toBe(15000);
    expect(jumlahTopup("t2b")).toBe(60000);
    expect(jumlahTopup("t3")).toBe(20000);
    expect(angka(cocok(bagianRunB, /gateway_bayar\(t3\["order_id"\], jumlah=([\d_]+)\)/)[1]!)).toBe(25000);
    expect(jumlahTopup("t4")).toBe(40000);
    expect(jumlahTopup("t5")).toBe(30000);
    const dariRun = [{ jenis: "tidak_di_ledger", selisih: jumlahTopup("t1") }, { jenis: "tidak_di_ledger", selisih: jumlahTopup("t2b") }, { jenis: "jumlah_beda", selisih: 25000 - jumlahTopup("t3") },
      { jenis: "tidak_di_gateway", selisih: -jumlahTopup("t4") }, { jenis: "tidak_di_gateway", selisih: -jumlahTopup("t5") }];
    expect(dariRun.map((i) => `${i.jenis} ${i.selisih}`).sort()).toEqual(insiden.map((i) => `${i.jenis} ${i.selisih}`).sort());
    // tabel jenis di halaman
    for (const [jenis, sel] of [["tidak_di_ledger", `${plus(15000)} dan ${plus(60000)}`], ["jumlah_beda", plus(5000)], ["tidak_di_gateway", `${plus(-40000)} dan ${plus(-30000)}`]] as const) {
      const baris = badan.split("\n").find((b) => b.startsWith(`| \`${jenis}\` | `) && b.endsWith(`| ${sel} |`));
      expect(baris, jenis).toBeDefined();
    }
    expect(plus(-40000).startsWith("−")).toBe(true);
  });
  test("selisih = gateway dikurangi ledger (migrasi), dan tiga cabang RekonHarian menghitungnya: jumlah laporan, laporan dikurangi jurnal, minus jumlah jurnal", () => {
    expect(migrasi).toContain("-- rupiah, gateway dikurangi ledger");
    expect(fRekon.teks).toContain('catat(b.OrderID, tid, "tidak_di_ledger", b.Jumlah, &h.TidakDiLedger)');
    expect(fRekon.teks).toContain('catat(b.OrderID, tid, "jumlah_beda", b.Jumlah-l.Jurnal, &h.JumlahBeda)');
    expect(fRekon.teks).toContain('catat(order, &tid, "tidak_di_gateway", -l.Jurnal, &h.TidakDiGateway)');
    expect(fRekon.teks).toContain("case !ada || !l.Dibayar:");
    expect(fRekon.teks).toContain("case l.Jurnal != b.Jumlah:");
    expect(fRekon.teks).toContain("if di[order] || !l.Dibayar {");
    harus("Keduanya dicocokkan per `order_id`, dan selisihnya dihitung sebagai jumlah gateway dikurangi jumlah ledger.");
    harus("| `tidak_di_ledger` | Order ada di laporan, tetapi Rekeningo tidak punya top-up untuk order itu atau top-up belum `dibayar` | jumlah di laporan |");
    harus("| `jumlah_beda` | Order ada di keduanya, tetapi jumlah jurnal tidak sama dengan laporan | laporan dikurangi jurnal |");
    harus("| `tidak_di_gateway` | Top-up `dibayar` dengan jurnal pada tanggal itu, tetapi laporan tanggal itu tidak memuatnya | jumlah jurnal, bertanda minus |");
  });
  test("lima dari tujuh order bermasalah: tujuh = satu top-up bagian A dan enam di bagian B; laporan gateway lima baris; semua insiden terbuka sebelum koreksi", () => {
    const semua = (bagianRunA.match(/buat_topup\(/g) ?? []).length + (bagianRunB.match(/buat_topup\(/g) ?? []).length;
    expect(semua).toBe(7);
    expect(insiden).toHaveLength(5);
    harus("Rekaman bagian B memuat lima order yang bermasalah dari tujuh order di hari itu. Hasilnya lima insiden, semuanya `terbuka`, dan belum ada koreksi:");
  });
  test("koreksi: diperiksa 5, tiga lewat jurnal, satu tanpa jurnal, satu terbuka; jurnal per insiden sesuai tabel; saldo Budi 310.000 ke 330.000, Eko 530.000 ke 500.000, Citra dan Dina tetap", () => {
    expect([periksa, koreksiJurnal, tanpaJurnal, terbuka]).toEqual([5, 3, 1, 1]);
    expect(insidenSesudah.map((i) => `${i.jenis} ${i.selisih} ${i.status} ${i.jurnal || "-"}`).sort()).toEqual([
      "jumlah_beda 5000 selesai topup_bank", "tidak_di_gateway -30000 selesai pembalik", "tidak_di_gateway -40000 selesai -", "tidak_di_ledger 15000 selesai topup_bank", "tidak_di_ledger 60000 terbuka -",
    ]);
    expect(saldoAkhir.Budi! - saldoAwal.Budi!).toBe(15000 + 5000);
    expect(saldoAwal.Budi).toBe(310000);
    expect(saldoAkhir.Budi).toBe(330000);
    expect(saldoAkhir.Eko! - saldoAwal.Eko!).toBe(-30000);
    expect(saldoAkhir.Citra).toBe(saldoAwal.Citra);
    expect(saldoAkhir.Dina).toBe(saldoAwal.Dina);
    expect(bagB).toContain("sidik MD5 sama sesudah koreksi: ya; posting baru: 6 (tiga jurnal, dua posting masing-masing)");
    expect(bagB).toContain("jurnal yang jumlah posting-nya bukan nol: 0; buku yang saldo_cache-nya beda dari jumlah posting: 0");
    expect(6).toBe(koreksiJurnal * 2);
    harus("Dari lima insiden, tiga ditutup lewat jurnal, satu ditutup tanpa jurnal, dan satu tetap terbuka.");
    harus(`Saldo Budi naik ${rp(20000)}, dari ${titik(saldoAwal.Budi!)} ke ${titik(saldoAkhir.Budi!)}: jurnal top-up ${rp(15000)} dan jurnal koreksi ${rp(5000)}. Saldo Eko turun ${rp(30000)} lewat jurnal pembalik.`);
    harus("Saldo Citra dan Dina tidak berubah. Posting yang sudah ada tidak berubah (sidik MD5 sama), dan enam posting baru berasal dari tiga jurnal baru.");
    harus("Insiden +60.000 tetap terbuka karena akun Dina melewati batas tingkatnya. Insiden −40.000 ditutup tanpa jurnal karena gateway menjawab settlement dengan jumlah yang sama.");
    expect(bagB).toContain("t2b tetap terbuka: akun melewati batas tingkat, perlu keputusan tim risk.");
    expect(bagB).toContain("t4 ditutup tanpa jurnal: gateway menjawab settlement dengan jumlah yang sama, hanya tanggalnya lain.");
    expect(bagianRunB).toContain('gateway_bayar(t4["order_id"], tanggal="2020-01-01")');
    expect(bagianRunB).toContain('"Dina kedua diparkir"');
  });
  test("koreksi dijalankan lagi: diperiksa 1, tanpa jurnal baru, satu terbuka; bagian C: laporan 8 baris (5 + tiga top-up baru), tiga insiden baru, dua job bersamaan mengoreksi 3", () => {
    expect(RK.teks(rUlang, rUlang + 1)).toContain("koreksi rekon: diperiksa 1, dikoreksi lewat jurnal 0, selesai tanpa jurnal baru 0, tetap terbuka 1, galat 0");
    expect(RK.baris[rRekonC]).toContain("rekon <tanggal>: 8 baris di laporan gateway; insiden baru: tidak_di_ledger 3, tidak_di_gateway 0, jumlah_beda 0");
    const baru = (runWebhook.slice(runWebhook.indexOf('bagian("C. Dua job bersamaan'), runWebhook.indexOf("tulis(\"rekon.txt\"")).match(/for jumlah in \(([^)]+)\)/)![1]!.split(",").map((x) => x.trim()).filter(Boolean));
    expect(baru).toHaveLength(3);
    expect(5 + baru.length).toBe(8);
    expect(RK.baris[rDuaJob - 1]).toContain("jumlah insiden yang dikoreksi oleh keduanya bersama = 3");
    expect(RK.baris[rDuaJob - 1]).toContain("pembagian antar job bergantung pada waktu dan tidak direkam");
    expect(bagianRunB).toContain('catat_job("-rekon <tanggal>", "-rekon", hari_ini())');
    expect(runWebhook.slice(runWebhook.indexOf('bagian("C. Dua job bersamaan'))).toContain('catat_job("-rekon <tanggal>", "-rekon", hari_ini())');
    expect(runWebhook).toContain("def hari_ini():");
    harus("Laporan kini memuat delapan baris, dan hanya tiga insiden baru yang tercatat:");
    harus("Dua job koreksi yang dijalankan bersamaan atas tiga insiden baru mengoreksi tiga insiden bersama-sama. Pembagian antar job bergantung pada waktu, jadi rekaman tidak mencatatnya:");
  });
  test("urutan.txt F: settlement sesudah expire diparkir; dua insiden tidak_di_ledger 50.000 (kedaluwarsa) dan 60.000 (batas tingkat) tetap terbuka sesudah koreksi", () => {
    const f = UR.teks(uAwalF3, uAkhirF3);
    expect(f).toContain("settlement sesudah expire: 200 diparkir");
    expect(f).toContain("koreksi rekon: diperiksa 2, dikoreksi lewat jurnal 0, selesai tanpa jurnal baru 0, tetap terbuka 2, galat 0");
    const pertama = [...f.matchAll(/^ tidak_di_ledger \| (\d+) +\| terbuka$/gm)].map((m) => Number(m[1])).sort((a, b) => b - a);
    expect(pertama).toEqual([60000, 50000]);
    expect(f).toContain("tidak_di_ledger | 50000   | terbuka | t");
    expect(f).toContain("tidak_di_ledger | 60000   | terbuka | t");
    expect(f).toContain("yang satu melewati batas tingkat, yang lain top-up kedaluwarsa");
    expect(f).toContain("PRD v4 belum menjawab pengembalian dana");
    harus(`satu melewati batas tingkat, satu top-up sudah \`kedaluwarsa\` (${rp(pertama[0]!)} dan ${rp(pertama[1]!)}). PRD v4 belum punya jalur pengembalian dana:`);
  });
  test("proses-mati.txt C: key 23 jam satu jurnal, 25 jam dua jurnal; rekonsiliasi membaca 150.000 dari 300.000 yang dikredit, sama dengan gateway 150.000", () => {
    const c = PM.teks(pC, pAkhir2);
    expect(c).toContain("# sisi 23 jam: key hidup, ledger menjawab 200 dengan jurnal yang sama, satu jurnal. Sisi 25 jam: key habis, jurnal kedua, saldo naik dua kali.");
    expect(c).toMatch(/ 1 +\| 1 +\| dibayar/);
    expect(c).toMatch(/ 2 +\| 1 +\| dibayar/);
    expect(c).toMatch(/ 150000 +\| 300000 +\| 150000/);
    expect(c).toContain("SQL yang sama, Tidak dijalankan sebagai job");
    expect(c).toContain("jam ledger digeser 25 jam");
    expect(300000).toBe(2 * 150000);
    harus("Key ledger hidup 24 jam. Bila proses pembayaran mati sesudah ledger menjurnal dan kiriman ulang datang 25 jam kemudian, ledger menjurnal lagi.");
    harus("Kolom pertama query terakhir di rekaman memakai subquery yang sama dengan `LedgerTopupTanggal`. Lab tidak menjalankannya sebagai job:");
    expect(c).toContain("coalesce((SELECT sum(p.jumlah) FROM t4m_ledger.posting p WHERE p.jurnal_id = t.jurnal_id AND p.jumlah > 0), 0) AS dibaca_rekonsiliasi");
    expect(fLedger.teks).toContain("coalesce((SELECT sum(p.jumlah) FROM posting p WHERE p.jurnal_id = t.jurnal_id AND p.jumlah > 0), 0)");
    expect(baca("labs/api-t4/internal/service/t4_aturan.go")).toBeDefined();
  });
  test("retry.txt: enam kiriman 401 (342 menit) lalu jadwal habis, top-up menunggu tanpa jurnal; Rp500.000 sudah di bank", () => {
    const b = retry.slice(retry.indexOf("# --- B. "), retry.indexOf("# --- C. "));
    expect((b.match(/\| 401$/gm) ?? [])).toHaveLength(6);
    expect(b).toContain("gateway berhenti: jadwal habis (342 menit sesudah kiriman pertama, ±5,7 jam)");
    expect(b).toContain("# Uang Rp500.000 sudah di bank, status top-up menunggu, tidak ada event dan tidak ada jurnal.");
    harus("Di [[t4-m30]], gateway mengirim kabar enam kali dan semuanya ditolak 401. Jadwal ulangannya habis, Rp500.000 sudah di bank, dan top-up Citra tetap `menunggu` tanpa jurnal");
    harus("Gateway tiruan di lab berhenti mengirim sesudah kiriman ke-6, 342 menit sesudah kiriman pertama (`retry.txt` bagian A dan B).");
    expect(retry).toContain("jeda antar percobaan (sejak percobaan sebelumnya): 2, 10, 30, 90, 210 menit (total 342 menit)");
    expect(2 + 10 + 30 + 90 + 210).toBe(342);
    const kodeRetry = runWebhook.slice(runWebhook.indexOf("def rekam_retry():"), runWebhook.indexOf("# ---------- urutan.txt"));
    expect(kodeRetry).toContain("ct = buat_topup(citra, 500_000)");
    expect(retry).toContain("Rp500.000");
  });
  test("tandatangan.txt C dan rotasi.txt D: masa tumpang tindih menerima dua rahasia, rahasia lama ditolak sesudahnya; urutan terbalik ditolak; OpenBao v2.7.2, jeda baca 50 ms dan 30 detik", () => {
    const t = TT.teks(tAwal, tAkhir);
    expect(t).toContain("1. gateway menandatangani dengan rahasia baru, api-t4 hanya tahu yang lama: 401");
    expect(t).toContain("2. masa tumpang tindih, kiriman bertanda rahasia baru: 200 diproses");
    expect(t).toContain("3. masa tumpang tindih, kiriman yang masih bertanda rahasia lama: 200 diproses");
    expect(t).toContain("4. sesudah rotasi selesai, kiriman bertanda rahasia lama: 401");
    expect(t).toContain("-rahasia-webhook <baru>,<lama> (yang pertama dipakai, yang kedua masa tumpang tindih)");
    expect(t).not.toContain("evt-r3   | diproses");
    expect(tandaTangan).toContain("# Dokumentasi satu gateway nyata menahan rahasia lama aktif sampai 24 jam di sisi gateway dan menandatangani dengan keduanya; gateway tiruan tidak (rotasi langsung). Yang diuji di sini adalah sisi Rekeningo");
    const d = RO.teks(oAwal, oAkhir + 1);
    expect(d).toContain("kabar dari gateway: ditolak");
    expect(d).toContain("Urutan yang aman: tulis ke OpenBao dulu, tunggu service membacanya (paling lama satu jeda baca; di lab 50 ms, bawaan service 30 detik, Asumsi), baru gateway beralih.");
    expect(d).toContain("lab tidak merekam nilainya");
    expect(rotasi).toContain("OpenBao v2.7.2 mode dev");
    harus("Lab memakai OpenBao v2.7.2 dalam mode dev. Jeda baca 50 milidetik di lab dan 30 detik di service adalah pilihan lab (Asumsi). Lamanya jendela 401 tidak diukur.");
    harus("Gateway tiruan merotasi langsung tanpa masa tumpang tindih, jadi yang diuji adalah sisi Rekeningo (`tandatangan.txt` bagian C).");
  });
  test("skema.txt D: role aplikasi ditolak DELETE pada jurnal (opsi C ADR 35); posting tidak bisa di-UPDATE", () => {
    const d = skemaTxt.slice(skemaTxt.indexOf("# --- D. "), skemaTxt.indexOf("# --- E. "));
    expect(d).toContain("api_t4=> DELETE FROM jurnal WHERE id = 1;\nERROR:  permission denied for table jurnal");
    expect(d).toContain("api_t4=> UPDATE posting SET jumlah = 1 WHERE id = 1;\nERROR:  permission denied for table posting");
    harus("Role aplikasi di lab ditolak saat `DELETE` pada `jurnal` (`skema.txt` bagian D, api-t4)");
  });
});

describe("kode lab: cek status, rekonsiliasi, pencatatan insiden, koreksi, dan klaim negatif berlingkup", () => {
  test("CekTopup: hanya menunggu atau tidak_pasti; gateway ditanya SEBELUM DalamTx; hasil lewat terapkanStatus; order tidak dikenal menjadi gagal", () => {
    const f = fCek.teks;
    expect(f.indexOf("s.t4.Gateway.Status(ctx, tp.OrderID)")).toBeGreaterThan(0);
    expect(f.indexOf("s.t4.Gateway.Status(")).toBeLessThan(f.indexOf("s.repo.DalamTx("));
    expect(f).toContain('if tp.Status != "menunggu" && tp.Status != "tidak_pasti" {');
    expect(f).toContain("s.terapkanStatus(ctx, tx, terkunci, target, o.Jumlah)");
    expect(f).toContain('errors.Is(err, gateway.ErrTidakAda)');
    expect(f).toContain('"menunggu", "tidak_pasti"}, "gagal")');
    expect(pembayaranGo).toContain("daftar, err := s.repo.TopupBelumSelesai(ctx, s.kini().Add(-umur))");
    expect(repoGo).toContain("WHERE status IN ('menunggu', 'tidak_pasti') AND dibuat < $1 ORDER BY id");
    expect(mainGo).toContain('"cek-topup"');
    expect(mainGo).toContain('"rekon"');
    expect(mainGo).toContain('"koreksi-rekon"');
    expect(mainGo).toContain("service.UmurCekStatus");
  });
  test("terapkanStatus: target sama dengan status sekarang dijawab ganda, jumlah beda ditolak, kredit lewat kreditTopup dengan Idempotency-Key order_id 24 jam; kreditTopup memakai keterangan top-up biasa", () => {
    expect(fTerapkan.teks).toContain('case target == cur:\n\t\treturn "ganda", tp.JurnalID, nil');
    expect(fTerapkan.teks).toContain('case jumlahGateway != tp.Jumlah:\n\t\treturn "ditolak", nil, nil');
    expect(fTerapkan.teks).toContain("return s.kreditTopup(ctx, tx, tp)");
    expect(fKreditTopup.teks).toContain("tx.KunciLedger(ctx, tp.OrderID, tp.AkunID, hashPermintaan(tp.OrderID, tp.Jumlah), kini, kini.Add(24*time.Hour))");
    expect(fKreditTopup.teks).toContain('"Top-up bank "+tp.OrderID');
    expect(fKreditTopup.teks).not.toMatch(/insiden/);
  });
  test("RekonHarian: hanya membaca laporan gateway dan ledger lalu mencatat insiden; tanpa fungsi yang menulis jurnal, status, atau transaction (klaim negatif berlingkup fungsi)", () => {
    expect(fRekon.teks).toContain("s.t4.Gateway.Settlement(ctx, tanggal)");
    expect(fRekon.teks).toContain("s.repo.LedgerTopupTanggal(ctx, tanggal, orders)");
    expect((fRekon.teks.match(/s\.repo\.CatatInsiden\(/g) ?? [])).toHaveLength(1);
    expect(fRekon.teks).not.toMatch(/CatatJurnal|kreditTopup|kreditV1|terapkanStatus|UbahStatus|DalamTx|KunciLedger/);
    expect(fRekon.awal).toBe(fRekon.awal); // rentang Snippet diperiksa di tes Snippet
    harus("Kodenya membaca laporan, memasangkannya dengan ledger, lalu mencatat insiden. Ia tidak memanggil fungsi yang menulis jurnal:");
  });
  test("LedgerTopupTanggal: top-up yang jurnalnya ditulis pada tanggal itu (zona Asia/Jakarta) atau order yang disebut laporan; jumlah dari posting positif jurnal yang dipegang topup_bank", () => {
    expect(fLedger.teks).toContain("WHERE t.order_id = ANY($2)");
    expect(fLedger.teks).toContain("(j.dibuat AT TIME ZONE 'Asia/Jakarta')::date = $1::date");
    expect(fLedger.teks).toContain("t.status = 'dibayar'");
    expect(fLedger.teks).toContain("LEFT JOIN jurnal j ON j.id = t.jurnal_id");
    harus("Sisi ledger memuat top-up yang jurnalnya ditulis pada tanggal itu, ditambah order yang disebut laporan.");
    harus("Sisi ledger dibaca dari jurnal yang dipegang `topup_bank.jurnal_id`.");
  });
  test("insiden unik dan aman diulang: UNIQUE (tanggal, order_id, jenis) dan ON CONFLICT DO NOTHING; jenis dibatasi tiga; insiden bernomor (id bigserial)", () => {
    expect(migrasi).toContain("UNIQUE (tanggal, order_id, jenis)");
    expect(migrasi).toContain("CHECK (jenis IN ('tidak_di_ledger', 'tidak_di_gateway', 'jumlah_beda'))");
    expect(migrasi).toContain("id        bigserial   PRIMARY KEY");
    expect(fCatat.teks).toContain("ON CONFLICT (tanggal, order_id, jenis) DO NOTHING");
    harus("Tabel `insiden_rekon` punya `UNIQUE (tanggal, order_id, jenis)`, dan pencatatannya memakai `ON CONFLICT DO NOTHING`.");
    harus("Selisih yang ditemukan menjadi **insiden**: satu baris di tabel `insiden_rekon` dengan nomornya sendiri.");
  });
  test("handler pertama: kreditV1 tidak mengikat jurnal ke top-up (tanpa UbahTopupDibayar), status dibayar tanpa syarat; lab tidak menjalankan rekonsiliasi atas handler pertama (klaim negatif berlingkup run.py)", () => {
    expect(fKreditV1.teks).not.toMatch(/UbahTopupDibayar|KunciLedger/);
    expect(fKreditV1.teks).toContain('tx.UbahStatusTanpaSyarat(ctx, tp.OrderID, "dibayar")');
    expect(pembayaranGo).toContain("jurnal_id topup_bank tidak diisi");
    const awalG = runWebhook.indexOf("def rekam_ganda():");
    const akhirG = runWebhook.indexOf("def rekam_ganda_serentak");
    const awalR = runApi.indexOf("def rekam_rentan():");
    const akhirR = runApi.indexOf('tulis("rentan.txt"');
    for (const k of [runWebhook.slice(awalG, akhirG), runApi.slice(awalR, akhirR)]) {
      expect(k.length).toBeGreaterThan(500);
      expect(k).not.toMatch(/rekon|-koreksi|-cek-status/i);
    }
    expect(runWebhook.match(/"webhook-v1"/g)).toHaveLength(1);
    expect(runApi.match(/"webhook-v1"/g)).toHaveLength(1);
    expect(200000).toBe(200000 - 0); // jumlah order Budi M29 dikurangi jumlah jurnal terikat (0)
    expect(hal46).toContain("Rp200.000");
    harus("**Handler pertama tidak mengisi `jurnal_id`.** `kreditV1` menjurnal tanpa mengikat jurnalnya ke top-up.");
    harus("Ia mencatat `jumlah_beda` +Rp200.000, bukan \"dua jurnal\" (Tidak dijalankan: dibaca dari kode `kreditV1` dan `LedgerTopupTanggal`; lab tidak menjalankan rekonsiliasi atas handler pertama).");
  });
  test("aturan koreksi per jenis (tabel halaman) dibaca dari kode: tidak_di_ledger, jumlah_beda (selisih <= 0 ditahan), tidak_di_gateway (tanpa jurnal bila jumlah sama, pembalik bila saldo cukup)", () => {
    expect(fTdLedger.teks).toContain('case "menunggu", "tidak_pasti":');
    expect(fTdLedger.teks).toContain('s.terapkanStatus(ctx, tx, tp, "dibayar", in.Selisih)');
    expect(fTdLedger.teks).toContain("if in.TopupID == nil {");
    expect(fKreditTopup.teks).toContain('status == "dibekukan" || b.Saldo+tp.Jumlah > BatasSaldoTingkat(tingkat)');
    expect(fJumlahBeda.teks).toContain("in.Selisih <= 0");
    expect(fJumlahBeda.teks).toContain('status == "dibekukan" || b.Saldo+in.Selisih > BatasSaldoTingkat(tingkat)');
    expect(fJumlahBeda.teks).toContain('"Koreksi selisih rekonsiliasi %s (insiden %d)"');
    expect(fTdGateway.teks).toContain("g.order.Jumlah == masuk");
    expect(fTdGateway.teks).toContain("return insidenTanpaJurnal, nil, nil // settlement di tanggal lain");
    expect(fTdGateway.teks).toContain("buku[tp.AkunID].Saldo < masuk");
    expect(fTdGateway.teks).toContain('"pembalik", fmt.Sprintf("Order %s tidak settlement di gateway (insiden %d)"');
    expect(fTdGateway.teks).toContain("g.err != nil && !errors.Is(g.err, gateway.ErrTidakAda)");
    expect(fTdGateway.teks).not.toMatch(/UbahStatus|UbahTopup/); // status top-up tetap dibayar sesudah jurnal pembalik
    expect(fTdGateway.teks).toContain("Jumlah: -p.Jumlah"); // jurnal pembalik = cermin jurnal asal
    harus("| `tidak_di_ledger` | Top-up `menunggu` atau `tidak_pasti`, jumlah sama dengan laporan, akun tidak dibekukan dan tidak melewati batas tingkat. Hasilnya jurnal top-up | Akun melewati batas tingkat, top-up `kedaluwarsa` atau `gagal`, order tidak dikenal |");
    harus("| `jumlah_beda` | Laporan lebih besar dari jurnal. Hasilnya jurnal top-up kedua sebesar selisih | Selisih nol atau negatif, akun dibekukan, batas tingkat terlewati |");
    harus("Gateway tidak menjawab, jumlah settlement berbeda, saldo tidak cukup untuk jurnal pembalik |");
    harus("Keterangan jurnal koreksi `jumlah_beda` dan jurnal pembalik memuat nomor insidennya. Jurnal top-up dari `tidak_di_ledger` memakai keterangan top-up biasa");
    harus("Kode koreksi `tidak_di_gateway` tidak mengubah status top-up, dan rekonsiliasi menjumlahkan posting positif jurnal asal tanpa jurnal pembaliknya.");
  });
  test("satu transaction per insiden, baris insiden dikunci FOR UPDATE, yang bukan terbuka dilewati; TutupInsiden hanya dipanggil job koreksi di labs/api-t4/cmd dan internal (klaim negatif berlingkup)", () => {
    const awal = koreksiGo.indexOf("// --8<-- [start:koreksi-satu]"), akhir = koreksiGo.indexOf("// --8<-- [end:koreksi-satu]");
    const region = koreksiGo.slice(awal, akhir);
    expect(region).toContain("s.repo.DalamTx(");
    expect(region).toContain("tx.KunciInsiden(ctx, id)");
    expect(region).toContain('if in.Status != "terbuka" {');
    const kunci = koreksiRepoGo.slice(koreksiRepoGo.indexOf("func (t Tx) KunciInsiden"));
    expect(kunci.slice(0, kunci.indexOf("\n}\n"))).toContain("FOR UPDATE");
    const semuaGo = [...(terlacak ?? [])].filter((f) => /^labs\/api-t4\/(cmd|internal)\/.*\.go$/.test(f) && !f.endsWith("_test.go"));
    expect(semuaGo.length).toBeGreaterThan(10);
    const pemanggil = semuaGo.filter((f) => /\.TutupInsiden\(/.test(fs.readFileSync(path.join(akar, f), "utf8")));
    expect(pemanggil).toEqual(["labs/api-t4/internal/service/koreksi_rekon.go"]);
    harus("Satu hal lagi: di `labs/api-t4/cmd` dan `labs/api-t4/internal`, `TutupInsiden` hanya dipanggil oleh job koreksi (Tidak dijalankan: dibaca dari kode). Insiden yang menunggu keputusan manusia belum punya jalur penutupan di lab.");
    harus("Tiap insiden punya satu transaction, dan barisnya dikunci `FOR UPDATE` lebih dulu.");
  });
});

describe("rentang Snippet diturunkan dari rekaman dan kode, judul, dan isi yang tampil", () => {
  test("berkas, rentang baris, dan judul tiap Snippet sama dengan batas fungsi atau bagian rekaman", () => {
    expect(berkasSnippet).toEqual([
      "labs/api-t4/internal/service/pembayaran.go", "labs/t4-webhook/output/rekon.txt", "labs/api-t4/internal/service/pembayaran.go", "labs/api-t4/internal/repo/pembayaran.go",
      "labs/api-t4/migrasi/000021_topup_bank.up.sql", "labs/t4-webhook/output/rekon.txt", "labs/t4-webhook/output/rekon.txt", "labs/api-t4/internal/service/koreksi_rekon.go",
      "labs/t4-webhook/output/rekon.txt", "labs/t4-webhook/output/rekon.txt", "labs/t4-webhook/output/rekon.txt", "labs/t4-webhook/output/rekon.txt", "labs/t4-webhook/output/urutan.txt",
      "(files)", "labs/t4-webhook/output/tandatangan.txt", "labs/t4-infra/output/rotasi.txt",
    ]);
    expect(lines).toEqual([
      `${fCek.awal}:${fCek.akhir}`, `${rAwalA}:${rAkhirA}`, `${fRekon.awal}:${fRekon.akhir}`, `${fLedger.awal}:${fLedger.akhir}`, `${mAwal}:${mAkhir}`,
      `${rRekonB}:${rSaldoSebelum - 1}`, `${rRekonC}:${rRekonC + 1}`, "koreksi-satu", `${rKoreksi}:${rSaldoSesudah - 1}`, `${rSaldoSesudah}:${rInvarian}`, `${rUlang}:${rUlang + 1}`,
      `${rDuaJob}:${rAkhirC}`, `${uAwalF3}:${uAkhirF3}`,
      `["labs/t4-modul/output/proses-mati.txt:${pAwal1}:${pAkhir1}", "labs/t4-modul/output/proses-mati.txt:${pAwal2}:${pAkhir2}"]`, `${tAwal}:${tAkhir}`, `${oAwal}:${oAkhir}`,
    ]);
    expect(fCek.akhir - fCek.awal).toBeGreaterThan(30);
    expect(mAkhir - mAwal).toBe(11);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/internal/service/pembayaran.go baris ${fCek.awal} sampai ${fCek.akhir} (CekTopup)`,
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian A (cek status)",
      `Kode lab: labs/api-t4/internal/service/pembayaran.go baris ${fRekon.awal} sampai ${fRekon.akhir} (RekonHarian)`,
      `Kode lab: labs/api-t4/internal/repo/pembayaran.go baris ${fLedger.awal} sampai ${fLedger.akhir} (LedgerTopupTanggal)`,
      "Kode lab: labs/api-t4/migrasi/000021_topup_bank.up.sql (insiden_rekon)",
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian B (rekonsiliasi harian)",
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian C (rekonsiliasi kedua)",
      "Kode lab: labs/api-t4/internal/service/koreksi_rekon.go (koreksiSatu)",
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian B (koreksi)",
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian B (saldo dan invarian)",
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian B (koreksi dijalankan lagi)",
      "Rekaman lab: labs/t4-webhook/output/rekon.txt, bagian C (dua job bersamaan)",
      "Rekaman lab: labs/t4-webhook/output/urutan.txt, bagian F (settlement sesudah expire)",
      "Rekaman lab: labs/t4-modul/output/proses-mati.txt, bagian C (key 23 jam dan 25 jam)",
      "Rekaman lab: labs/t4-webhook/output/tandatangan.txt, bagian C (rotasi)",
      "Rekaman lab: labs/t4-infra/output/rotasi.txt, bagian D (urutan terbalik)",
    ]);
    // baris pertama tiap rentang rekaman bukan baris kepala dan bukan kosong; baris terakhir tidak kosong
    for (const [B, a, z] of [[RK, rAwalA, rAkhirA], [RK, rRekonB, rSaldoSebelum - 1], [UR, uAwalF3, uAkhirF3], [TT, tAwal, tAkhir], [RO, oAwal, oAkhir], [PM, pAwal1, pAkhir1], [PM, pAwal2, pAkhir2]] as const) {
      expect(a).toBeGreaterThan(5);
      expect(B.baris[a - 1]!.trim()).not.toBe("");
      expect(B.baris[z - 1]!.trim()).not.toBe("");
    }
    expect(KO.baris[KO.nomor((b) => b.includes("--8<-- [start:koreksi-satu]"))]).toContain("func (s Service) koreksiSatu(");
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, nama tes, atau rujukan naskah internal; bahasa mengikuti jenis berkas", () => {
    for (const t of tag) {
      const file = t.match(/file="([^"]+)"/)?.[1];
      const r = t.match(/lines="([^"]+)"/)?.[1];
      const daftar: string[] = [];
      if (file) {
        let src = baca(file);
        if (r) {
          const [a, b] = r.split(":").map(Number);
          src = src.split("\n").slice(a! - 1, b).join("\n");
        } else {
          const reg = t.match(/region="([^"]+)"/)![1]!;
          src = src.slice(src.indexOf(`--8<-- [start:${reg}]`), src.indexOf(`--8<-- [end:${reg}]`));
        }
        daftar.push(src);
      } else {
        for (const e of t.match(/"([^"]+:\d+:\d+)"/g)!) {
          const [f, a, b] = e.replace(/"/g, "").split(":");
          daftar.push(baca(f!).split("\n").slice(Number(a) - 1, Number(b)).join("\n"));
        }
      }
      for (const src of daftar) {
        expect(src.length, t).toBeGreaterThan(0);
        expect(src, t).not.toMatch(/\bR\d-\d{2,3}\b|\bPR #?\d{3}\b|\bkeputusan \d{3}\b|\bTest[A-Z][A-Za-z]+|minggu 2 naskah|mutasi tinjauan/);
      }
      if (file?.endsWith(".go")) expect(t).toContain('lang="go"');
      if (file?.endsWith(".sql")) expect(t).toContain('lang="sql"');
      if (file?.endsWith(".txt")) expect(t).not.toContain("lang=");
    }
    // rekaman yang tampil memakai satu kata kepala rekaman tampil: baris kepala (versi alat) tidak ikut
    expect(RK.baris.slice(0, 3).join("\n")).toMatch(/PostgreSQL 17\.11/);
    expect(rAwalA).toBeGreaterThan(3);
  });
});

describe("sumber luar: baris riset, tanggal akses, kutipan, dan label sumber", () => {
  test("lima baris riset ada, urut ID tanpa ganda, tanggal akses 2026-10-29 sama dengan halaman, dan sidik jari", () => {
    const ids = riset.split("\n").filter((b) => /^\| R4-\d+ /.test(b)).map((b) => b.split(" | ")[0]!.replace("| ", ""));
    expect(new Set(ids).size).toBe(ids.length);
    const awal = ids.indexOf("R4-150");
    expect(ids.slice(awal, awal + 5)).toEqual(["R4-150", "R4-151", "R4-152", "R4-153", "R4-154"]);
    expect(ids[awal - 1]).toBe("R4-138");
    for (const i of ["R4-150", "R4-151", "R4-152"]) expect(barisRiset(i), i).toContain("dibuka 2026-10-29");
    expect(badan.match(/dibuka 2026-10-29/g)).toHaveLength(6);
    expect(["R4-150", "R4-151", "R4-152", "R4-153", "R4-154"].map((i) => sidik(barisRiset(i)))).toEqual(SIDIK.riset);
  });
  test("R4-150: Stripe payout reconciliation (per setoran, bukan per pembayaran); R4-151: Midtrans GET Status API; R4-152: PostgreSQL 17 ON CONFLICT DO NOTHING", () => {
    expect(barisRiset("R4-150")).toContain("docs.stripe.com/reports/payout-reconciliation");
    expect(barisRiset("R4-150")).toContain("helps you match the payouts you receive in your bank account with the batches of payments and other transactions that they relate to");
    expect(barisRiset("R4-151")).toContain("docs.midtrans.com/docs/https-notification-webhooks");
    expect(barisRiset("R4-151")).toContain("you should use the GET Status API to check for current status of the transaction");
    expect(barisRiset("R4-152")).toContain("postgresql.org/docs/17/sql-insert.html");
    expect(barisRiset("R4-152")).toContain("ON CONFLICT DO NOTHING simply avoids inserting a row as its alternative action");
    harus("Gateway pertama menyediakan laporan yang mencocokkan setoran di rekening bank dengan kumpulan transaksi yang diselesaikannya (dokumentasi laporan sebuah gateway pembayaran, dibuka 2026-10-29, Tidak dijalankan). Laporan itu mencocokkan per setoran, sedangkan laporan gateway tiruan di lab memuat satu baris per order (Asumsi).");
    harus("Gateway kedua menulis bahwa notifikasi yang terlambat diperiksa dengan GET Status API (dokumentasi notifikasi sebuah gateway pembayaran lain, dibuka 2026-10-29, Tidak dijalankan).");
    // penamaan sama dengan 4.6: gateway pertama = sumber R4-135 (tiga hari, laporan R4-150), gateway kedua = sumber R4-136 (lima kali, GET status R4-151)
    expect(hal46).toContain("Gateway pertama mengirim ulang sampai tiga hari di mode live. Gateway kedua mengirim ulang paling banyak lima kali");
    expect(barisRiset("R4-135")).toContain("docs.stripe.com/webhooks");
    expect(barisRiset("R4-136")).toContain("docs.midtrans.com");
    expect(barisRiset("R4-150")).toContain("docs.stripe.com");
    expect(barisRiset("R4-151")).toContain("docs.midtrans.com");
    harus("Menurut dokumentasi PostgreSQL 17, perintah itu hanya menghindari penyisipan baris sebagai aksi alternatifnya ([PostgreSQL 17: INSERT](https://www.postgresql.org/docs/17/sql-insert.html), dibuka 2026-10-29).");
    // laporan tiruan memuat satu baris per order: Settlement mengembalikan OrderID dan Jumlah per baris
    expect(fRekon.teks).toContain("orders[i] = b.OrderID");
  });
  test("tautan eksternal hanya tiga (PostgreSQL inline, Midtrans dan Stripe di Bacaan lanjut); tanpa merek di prosa halaman; ID riset, nomor keputusan, dan nomor PR tidak tampil", () => {
    const url = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(url).toEqual([
      "https://www.postgresql.org/docs/17/sql-insert.html", "https://docs.midtrans.com/docs/https-notification-webhooks", "https://docs.stripe.com/reports/payout-reconciliation", "https://www.postgresql.org/docs/17/sql-insert.html",
    ]);
    const tanpaUrl = badan.replace(/\]\(https?:\/\/[^)]+\)/g, "]");
    expect(tanpaUrl).not.toMatch(/Stripe|Midtrans|Xendit/);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(diagramMentah) + widgetMentah).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(kartuSemua.filter((k) => k.halaman === "t4-rekonsiliasi"))).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/\d+ ?B\b/); // satuan byte ditulis lengkap
  });
  test("label sumber: arti lima label ditaut sekali di Mulai (sebelum Asumsi dan Tidak dijalankan); Simulasi dan Hitungan didefinisikan di pemakaian pertama; label turunan berdampingan dengan label sumber", () => {
    const tautan = badan.indexOf("[Label sumber](/cara-pakai/#label-sumber)");
    expect(tautan).toBeGreaterThan(0);
    expect(badan.match(/\[Label sumber\]/g)).toHaveLength(1);
    expect(tautan).toBeLessThan(badan.indexOf("Asumsi"));
    expect(tautan).toBeLessThan(badan.indexOf("Tidak dijalankan"));
    expect(tautan).toBeLessThan(badan.indexOf("Hitungan"));
    expect(tautan).toBeLessThan(badan.indexOf("Simulasi"));
    expect(badan.indexOf("Simulasi")).toBe(badan.indexOf("**Simulasi** di halaman ini berarti") + 2);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("**Hitungan** berarti") + 2);
    expect(badan.indexOf("**Simulasi**")).toBeLessThan(badan.indexOf('<WidgetLama nama="runsql"'));
    harus("**Simulasi** di halaman ini berarti SQL dijalankan di browser kamu oleh SQLite (sql.js 1.14.2), bukan oleh PostgreSQL dan bukan oleh kode Go lab. Datanya disalin dari skrip lab, dan hasilnya diperiksa tes terhadap rekaman. Hasil simulasi tidak pernah berlabel Rekaman lab.");
    harus("**Hitungan** berarti angka yang bisa kamu ulang dari angka lain di halaman ini.");
    for (const m of badan.matchAll(/\(dibaca dari kode[^)]*\)/g)) expect(m[0], "label turunan tanpa label sumber").toContain("Tidak dijalankan");
    expect(badan).not.toMatch(/\(penalaran/);
    const dibacaDariKode = badan.match(/\(Tidak dijalankan: dibaca dari kode[^)]*\)/g) ?? [];
    expect(dibacaDariKode).toHaveLength(6);
    expect(cara).toContain("Label sumber");
  });
  test("simulasi widget tidak memakai kata Rekaman untuk hasilnya: kartu dan jawaban menulis (Simulasi, sama dengan rekon.txt bagian B)", () => {
    harus("(Simulasi, sama dengan `rekon.txt` bagian B)");
    expect(widget.predict.explain).not.toMatch(/rekaman|Rekaman/);
    expect(widgetMentah).not.toMatch(/Rekaman lab/);
  });
});

describe("diagram Rantai, widget runsql, dan noscript: nilai diturunkan dari rekaman", () => {
  test("diagram: dua baris tiga simpul; 31 menit (rekaman A), Rp500.000 (run.py), 5 selisih, 4 ditutup (3 + 1), 1 terbuka (hasil koreksi)", () => {
    expect(diagram.baris).toHaveLength(2);
    expect(diagram.baris.every((b) => b.simpul.length === 3)).toBe(true);
    const [cek, rekonB] = diagram.baris;
    expect(cek!.simpul.map((s) => s.teks)).toEqual(["menunggu 31 menit", "gateway ditanya", "dibayar, 1 jurnal"]);
    expect(cek!.simpul[0]!.sub).toBe("lewat batas 30 menit");
    expect(cek!.simpul[2]!.sub).toBe("Rp500.000 tercatat");
    expect(bagA).toContain("interval '31 minutes'");
    expect(bagianRunA).toContain("buat_topup(citra, 500_000)");
    expect(rekonB!.simpul.map((s) => s.teks)).toEqual([`${insiden.length} selisih`, `${koreksiJurnal + tanpaJurnal} ditutup`, `${terbuka} terbuka`]);
    expect(rekonB!.simpul[1]!.sub).toBe(`${koreksiJurnal} lewat jurnal baru, ${tanpaJurnal} tanpa jurnal`);
    expect(rekonB!.simpul[0]!.nada).toBe("biasa");
    expect(rekonB!.simpul[1]!.nada).toBe("good");
    expect(rekonB!.simpul[2]!.nada).toBe("warn");
    expect(diagram.sumber.jenis).toBe("rekaman");
    expect(sidik(nilaiString(diagramMentah).join("\n"))).toBe(SIDIK.diagram);
    harus("<Rantai data={intiDiagram} ringkas />");
  });
  test("widget: SQL dan data dikunci sidik; opsi tebakan: jawaban benar bukan pilihan pertama atau terakhir; teks tebakan memuat 660.000, 650.000, 10.000", () => {
    expect(sidik(nilaiString(widget).join("\n"))).toBe(SIDIK.widget);
    expect(widget.predict.answer).toBe(2);
    expect(widget.predict.options[2]).toBe("5 insiden: tiga selisih positif dan dua negatif");
    expect(widget.predict.options).toHaveLength(4);
    expect(widget.predict.q).toContain("Total laporan gateway Rp660.000 dan total jurnal Rp650.000 hanya berbeda Rp10.000.");
    expect(660000 - 650000).toBe(10000);
    expect(widget.panels.before.steps).toHaveLength(1);
    expect(widget.panels.after.steps).toHaveLength(3);
    expect(widget.toggles).toHaveLength(1);
    expect(widget.toggles[0]!.pairs).toEqual([["('budi-3', 'lain', 40000)", "('budi-3', 'rekon', 40000)"]]);
    expect(widget.panels.after.steps.map((s) => s.sql.match(/'(tidak_di_ledger|jumlah_beda|tidak_di_gateway)'/)![1])).toEqual(["tidak_di_ledger", "jumlah_beda", "tidak_di_gateway"]);
    harus('<WidgetLama nama="runsql" src="data/t4-rekonsiliasi.json" />');
    harus('<SkripLama daftar={["runsql-core","runsql"]} />');
    const jumlah = [15000, 60000, 5000, -40000, -30000].reduce((a, b) => a + b, 0);
    expect(jumlah).toBe(10000);
    harus("Kelimanya berjumlah 15.000 + 60.000 + 5.000 − 40.000 − 30.000 = 10.000, sama dengan selisih total (Hitungan dari angka di widget).");
  });
  test("noscript: hasil widget tanpa JavaScript sama dengan widget (total, selisih, lima insiden)", () => {
    const ns = cocok(badan, /<noscript>\n<p>([\s\S]*?)<\/p>\n<\/noscript>/)[1]!;
    expect(ns).toContain("Hasilnya: total laporan gateway Rp660.000 dan total jurnal Rp650.000, selisih total Rp10.000.");
    expect(ns).toContain("tidak_di_ledger budi-1 +15.000 dan dina-2 +60.000, jumlah_beda budi-2 +5.000, tidak_di_gateway budi-3 −40.000 dan eko-1 −30.000.");
    expect(insiden.map((i) => i.selisih).sort((a, b) => a - b)).toEqual([-40000, -30000, 5000, 15000, 60000]);
  });
});

describe("kartu Cek diri, halaman istilah, dan glosarium", () => {
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal dan jawaban yang sama; id dan judul kartu", () => {
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(4);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(4);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-rekonsiliasi");
    expect(kartu.map((k) => k.id)).toEqual(["t4-rekonsiliasi-1", "t4-rekonsiliasi-2", "t4-rekonsiliasi-3", "t4-rekonsiliasi-4"]);
    expect(kartu.every((k) => k.judul === "4.9 Rekonsiliasi dengan gateway + ADR 35" && k.url === "tahap-4/rekonsiliasi-gateway/")).toBe(true);
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(kartu.map((k) => k.jawab)).toEqual(jawaban);
  });
  test("jawaban kartu: selisih saling meniadakan (jumlah = selisih total), tutup tanpa jurnal karena gateway menjawab jumlah sama, +60.000 terbuka karena batas tingkat Dina, tidak ganda karena UNIQUE dan 8 baris dengan 3 baru", () => {
    expect(insiden.reduce((a, i) => a + i.selisih, 0)).toBe(660000 - 650000);
    expect(insidenSesudah.find((i) => i.selisih === -40000)).toMatchObject({ status: "selesai", jurnal: "" });
    expect(insidenSesudah.find((i) => i.selisih === 60000)).toMatchObject({ status: "terbuka" });
    expect(bagC).toContain("8 baris di laporan gateway; insiden baru: tidak_di_ledger 3");
    harus("Kelima selisih saling meniadakan: +15.000, +60.000, +5.000, −40.000, dan −30.000 berjumlah +10.000, sama dengan selisih total (Simulasi, sama dengan `rekon.txt` bagian B).");
    harus("Akun Dina akan melewati batas tingkatnya bila dikredit, dan job tidak memaksa kredit ke akun seperti itu.");
    expect(runWebhook).toMatch(/t2a = buat_topup\(dina, 60_000\)/);
    expect(saldoAwal.Dina).toBe(960000);
    expect(saldoAwal.Dina! + 60000).toBeLessThanOrEqual(1_000_000 + 60000);
    expect(urutan).toContain("batas Rp1.000.000 untuk tingkat belum");
  });
  test("halaman istilah Rekonsiliasi: skema Zod lolos, sumber riset ada di RISET, baris glosarium menaut ke 4.9, slug ada di glosarium.json, sidik jari", () => {
    const h = HalamanIstilah.parse(istilahMentah);
    expect(h.istilah).toBe("Rekonsiliasi");
    expect(h.sumber!.map((s) => s.riset)).toEqual(["R4-150", "R4-151", "R4-153"]);
    for (const s of h.sumber!) expect(barisRiset(s.riset!)).toBeDefined();
    expect((h.sumber![0] as { url: string }).url).toBe("https://docs.stripe.com/reports/payout-reconciliation");
    expect((h.sumber![1] as { url: string }).url).toBe("https://docs.midtrans.com/docs/https-notification-webhooks");
    expect("rekaman" in h.sumber![2]! ? h.sumber![2]!.rekaman : "").toBe("labs/t4-webhook/output/rekon.txt");
    expect(h.cerita!.map((c) => c.rujukan)).toEqual(["t2-job-rekonsiliasi", "t4-rekonsiliasi"]);
    expect(h.cerita![1]!.teks).toContain("Lima dari tujuh order tidak cocok");
    expect(h.jebakan![0]).toContain("selisih total Rp10.000 menutupi lima selisih per order");
    expect(h.jebakan![1]).toContain("-Rp40.000");
    expect(glosarium).toContain("| **Rekonsiliasi** | Mencocokkan catatan sendiri dengan catatan pihak lain, order demi order, lalu mencatat selisihnya sebagai insiden bernomor, bukan mengoreksinya dengan tangan. | [[t4-rekonsiliasi]] |");
    expect(glosJson.find((g) => g.t === "Rekonsiliasi")).toMatchObject({ s: "istilah-rekonsiliasi" });
    expect(sidik(nilaiString(istilahMentah).join("\n"))).toBe(SIDIK.istilah);
    expect(JSON.stringify(h.cerita) + JSON.stringify(h.jebakan) + JSON.stringify(h.mekanisme) + h.sehari_hari).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: h2 Inti, lalu h3 per bagian; nomor daftar 1 sampai 3, 1 sampai 3, 1 sampai 5", () => {
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      const m = b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([
      [2, "Inti"], [3, "Kenapa jalan kedua dibutuhkan"], [3, "Cek status: bertanya ke satu order"], [3, "Rekonsiliasi harian: tiga jenis selisih"],
      [3, "Koreksi lewat jurnal normal: satu insiden, satu transaction"], [3, "Yang tidak terlihat rekonsiliasi, dan yang tidak bisa ditutup"], [3, "Rotasi rahasia dengan masa tumpang tindih"],
      [3, "ADR 35: dua lapis, insiden bernomor, dan koreksi lewat jurnal normal"], [3, "Sengaja belum dilakukan"], [3, "Cek diri"], [3, "Saat me-review kode AI, cek ini"], [3, "Bacaan lanjut"],
    ]);
    expect([...badan.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 5]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan.indexOf("ADR 35: dua lapis")).toBeGreaterThan(badan.indexOf('<Blok nama="Putuskan">'));
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (memuat cek status, rekonsiliasi harian, insiden bernomor)", () => {
    expect(frontmatter.trim().split("\n")).toEqual([
      'title: "4.9 Rekonsiliasi dengan gateway + ADR 35"',
      "description: Webhook bukan satu-satunya jalan kabar. Cek status menanyakan top-up yang menunggu, rekonsiliasi harian mencocokkan laporan gateway dengan jurnal per order, dan selisih menjadi insiden bernomor yang dikoreksi lewat jurnal normal.",
    ]);
  });
  test("jumlah elemen: lima Blok, satu Rantai, enam belas Snippet, satu WidgetLama, satu SkripLama, satu noscript, satu details question, empat Cek diri, enam impor", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(16);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<SkripLama /g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/^import /gm)).toHaveLength(6);
    expect(badan.match(/^- \[ \] /gm)).toHaveLength(6);
  });
  test("tabel ADR: empat opsi A sampai D dengan D dipilih; lima keputusan; tiga penyebab pre-mortem; lima butir kapan salah; tabel sengaja belum tiga baris", () => {
    const opsi = badan.split("\n").filter((b) => /^\| [A-D]\. /.test(b));
    expect(opsi.map((b) => b.split(" | ")[0]!.slice(2))).toEqual(["A. Percaya webhook saja", "B. Polling semua top-up tiap menit", "C. Koreksi tangan oleh Keuangan", "D. Dua lapis dengan insiden bernomor (dipilih)"]);
    for (const b of opsi) expect(b.split(" | ")).toHaveLength(5);
    const kapan = badan.slice(badan.indexOf("**Kapan keputusan ini salah.**"), badan.indexOf("**Yang akan merevisinya.**"));
    expect(kapan.match(/^- /gm)).toHaveLength(5);
    const sengaja = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf('<Blok nama="Kunci">'));
    expect(sengaja.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| Yang ditunda") && !b.startsWith("|---"))).toHaveLength(3);
    harus("**Empat opsi.**");
    harus("**Pre-mortem: tiga cara keputusan ini gagal dalam enam bulan.**");
    expect(barisRiset("R4-154")).toContain("20 ÷ 5.000 = 0,4%; 1% × 5.000 = 50 top-up per hari");
  });
});

// ---- kunci kata di luar berkas nilai: tidak ikut dibangkitkan ulang, jadi menangkap kalimat yang berubah makna walau kunci baris dibangkitkan ulang ----
describe("kunci kata: negasi, angka, label sumber, dan tautan (berkas kata.ts, ditulis sekali)", () => {
  const bersih = badan.split("\n").filter((b) => !/^(import |<Snippet |<WidgetLama |<SkripLama |<Rantai )/.test(b.trim())).join("\n");
  test("kalimat yang memuat tidak, bukan, belum, atau tanpa sama dengan daftar: satu kata negasi disisipkan atau dihapus menggagalkan tes", () => {
    const kalimat = bersih.split("\n").flatMap((b) => b.split(/(?<=[.:;?!])\s+/)).map((s) => s.trim()).filter(Boolean);
    expect(kalimat.filter((s) => /\b(tidak|bukan|belum|tanpa)\b/i.test(s))).toEqual(NEGASI);
    // tiap klaim negatif berlingkup dijaga tes sumbernya di atas (RekonHarian tanpa fungsi penulis jurnal, TutupInsiden satu pemanggil, lab tanpa rekonsiliasi atas handler pertama)
    expect(NEGASI.length).toBeGreaterThan(20);
  });
  test("deret angka di badan (di luar Snippet) sama dengan daftar; tiap angka diturunkan dari rekaman, naskah, atau hitungan di tes lain", () => {
    expect([...bersih.matchAll(/\d[\d.,]*\d|\d/g)].map((m) => m[0])).toEqual(ANGKA);
  });
  test("deret label sumber (Rekaman lab, Tidak dijalankan, Asumsi, Hitungan, Simulasi, Ilustrasi) sama dengan daftar", () => {
    expect([...bersih.matchAll(/Rekaman lab|Tidak dijalankan|Asumsi|Hitungan|Simulasi|Ilustrasi|\[perlu verifikasi\]/g)].map((m) => m[0])).toEqual(LABEL);
    expect(LABEL).not.toContain("Ilustrasi"); // halaman tanpa Ilustrasi: semua angka dari rekaman, hitungan, atau asumsi berlabel
  });
  test("deret tautan [[id]] sama dengan daftar", () => {
    expect([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]).join(" ")).toBe(TAUTAN);
  });
});

describe("kunci kata (lanjutan): tabel, baris riset, diagram, widget, dan halaman istilah", () => {
  test("semua baris tabel di badan sama dengan daftar, urutan baris dan sel: menukar sel atau baris menggagalkan tes", () => {
    expect(badan.split("\n").map((b) => b.trim()).filter((b) => b.startsWith("|"))).toEqual(TABEL);
    expect(TABEL.filter((b) => !b.startsWith("|---"))).toHaveLength(2 + 3 + 3 + 5 + 4);
  });
  test("lima baris riset 4.9 sama dengan daftar (kutipan, tanggal akses, dan hitungan)", () => {
    expect(["R4-150", "R4-151", "R4-152", "R4-153", "R4-154"].map(barisRiset)).toEqual(RISET);
  });
  test("diagram Rantai, widget runsql, dan halaman istilah sama dengan salinan di berkas kata.ts (semua nilai string dan angka)", () => {
    expect(diagramMentah).toEqual(DIAGRAM);
    expect(widget).toEqual(WIDGET);
    expect(istilahMentah).toEqual(ISTILAH);
  });
});
