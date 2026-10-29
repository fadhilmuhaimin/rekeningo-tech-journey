// Penjaga halaman 4.16: angka, jam, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim "dibaca dari kode",
// klaim negatif berlingkup, Hitungan, diagram Rantai, skenario alur t4-m34.json, baris riset, dan kartu Cek diri di
// m34-verifikasi-ditolak.mdx diturunkan dari rekaman labs/t4-infra (alamat.txt, state.txt, staging.txt), rekaman Tahap 3
// (labs/t3-mitm pin.txt), kode lab api-t4 (tiruan, verifikasi, lajur), halaman 4.11 dan 3.25, naskah Tahap 4, registry, dan
// baris riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.12): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di
// berkas nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat
// terkunci tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, diagram, skenario, kartu, baris
// riset) dikunci dengan sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m34-alamat-berubah.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m34-verifikasi-ditolak.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m34-verifikasi-ditolak.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m34.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const alamat = baca("labs/t4-infra/output/alamat.txt");
const stateTxt = baca("labs/t4-infra/output/state.txt");
const stagingTxt = baca("labs/t4-infra/output/staging.txt");
const pinTxt = baca("labs/t3-mitm/output/pin.txt");
const readmeInfra = baca("labs/t4-infra/README.md");
const tiruanGo = baca("labs/api-t4/cmd/tiruan/main.go");
const alamatGo = baca("labs/api-t4/cmd/tiruan/alamat.go");
const verifGo = baca("labs/api-t4/internal/verifikasi/verifikasi.go");
const lajurGo = baca("labs/api-t4/internal/lajur/lajur.go");
const breakerGo = baca("labs/api-t4/cmd/api/breaker.go");
const hal411 = baca("situs/src/content/docs/tahap-4/timeout-retry-breaker.mdx");
const hal325 = baca("situs/src/content/docs/tahap-3/tls-pinning.mdx");
const hal413 = baca("situs/src/content/docs/tahap-3/at-least-once.mdx");
const hal410 = baca("situs/src/content/docs/tahap-4/m31-verifikasi-tertahan.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const istilahMentah = baca("situs/data/halaman-istilah/alamat-keluar.json");
const istilah = JSON.parse(istilahMentah) as { istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: null; jebakan: string[]; terkait: string[]; sumber: { riset?: string; judul: string; url?: string; rekaman?: string; catatan: string }[] };
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
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
interface H { id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const Kata = (n: number): string => kata(n)[0]!.toUpperCase() + kata(n).slice(1);
const rib = (n: number): string => n.toLocaleString("id-ID");
const ringkas = (b: string): string => b.replace(/^#\s+/, "");

// ---- rekaman dan kode: bagian dan nomor baris Snippet -----------------------------------------------------------------
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
const T = bagian(alamat);
const tA = T.nomor((b) => b.startsWith("# --- A. ")), tB = T.nomor((b) => b.startsWith("# --- B. ")), tC = T.nomor((b) => b.startsWith("# --- C. "));
const tAkhir = T.baris.length - (T.baris[T.baris.length - 1] === "" ? 1 : 0);
const bagA = T.teks(tA, tB - 1), bagB = T.teks(tB, tC - 1), bagC = T.teks(tC, tAkhir);
// A: sebelum pindahan, host baru, sesudah pindahan
const aSebelum = T.nomor((b) => b === "# sebelum pindahan", tA);
const aBeda = T.nomor((b) => b.startsWith("# alamat host baru berbeda dari alamat host lama: ya"), tA);
const aTiap = T.nomor((b) => b.startsWith("# Tiap pekerjaan memakai lima percobaan"), tA);
const aSesudahMulai = aBeda + 2; // perintah pertama sesudah "host lama dimatikan"
// B: bagian sesudah pindahan lewat proxy
const bSesudah = T.nomor((b) => b === "# sesudah pindahan", tB);
const bBatas = T.nomor((b) => b.startsWith("# Batasnya: proxy keluar"), tB);
// C: aturan ADR 36 dan bawaan pustaka
const cAdr = T.nomor((b) => b === "# breaker ADR 36 dan jawaban 403", tC);
const cAdrAkhir = T.nomor((b) => b.startsWith("$ docker run -d --name vendor"), cAdr) - 1;
const cBawaanMulai = cAdrAkhir + 1; // perintah vendor kedua: pengaturan bawaan pustaka
const cTerbuka = T.nomor((b) => b === "# breaker terbuka sesudah enam penolakan beruntun", cBawaanMulai);
const cOperator = T.nomor((b) => b.startsWith("# Operator mendaftarkan alamat host baru di vendor."), cTerbuka);
const cDidaftar = T.nomor((b) => b === "# sesudah alamat didaftarkan", cOperator);
const cAdrBagian = T.teks(tC, cAdr + 6);
const cBawaanA = T.teks(cBawaanMulai, cOperator - 1);
const cBawaanB = T.teks(cOperator, tAkhir);

const angka = (teks: string, re: RegExp, grup = 1): number => Number(cocok(teks, re)[grup]!.replace(/\./g, ""));
const bagianSebelum = T.teks(aSebelum, aSebelum + 4);
const LULUS_A = angka(bagA, /lulus\s+\| terverifikasi\s+\| (\d+)/);
const GAGAL_A = angka(T.teks(aSesudahMulai, aTiap - 1), /gagal\s+\| belum\s+\| (\d+)/);
const PEKERJAAN_A = angka(T.teks(aSesudahMulai, aTiap - 1), /mati\s+\| 5\s+\| (\d+)/);
const PERCOBAAN = angka(T.teks(aSesudahMulai, aTiap - 1), /mati\s+\| (\d+)\s+\| \d+/);
const TOLAK_A = angka(T.teks(aSesudahMulai, aTiap - 1), /ditolak 403, per alamat sumber: \{'host baru': (\d+)\}/);
const LAMA_A = angka(bagianSebelum, /diterima, per alamat sumber yang dilihat vendor: \{'host lama': (\d+)\}/);
const TERIMA_B = angka(T.teks(bSesudah, bBatas), /diterima, per alamat sumber yang dilihat vendor: \{'proxy keluar': (\d+)\}/);
const bLama = T.nomor((b) => b.startsWith("# host lama lewat proxy"), tB);
const bBeda = T.nomor((b) => b.startsWith("# tiga alamat berbeda satu sama lain"), tB);
const LULUS_B = angka(T.teks(bBeda, bSesudah), /lulus\s+\| terverifikasi\s+\| (\d+)/);
const LULUS_B_SEBELUM = angka(T.teks(tB, bLama), /lulus\s+\| terverifikasi\s+\| (\d+)/);
const PEKERJAAN_C = angka(cAdrBagian, /mati\s+\| 5\s+\| (\d+)/);
const TOLAK_C = angka(cAdrBagian, /ditolak 403, per alamat sumber: \{'host baru': (\d+)\}/);
const GAGAL_C = angka(cAdrBagian, /gagal\s+\| belum\s+\| (\d+)/);
const TOLAK_BAWAAN = angka(cBawaanA, /ditolak 403, per alamat sumber: \{'host baru': (\d+)\}/);
const DIAJUKAN_BAWAAN = angka(cBawaanA, /diajukan\s+\| belum\s+\| (\d+)/);
const GAGAL_BAWAAN = angka(cBawaanA, /gagal\s+\| belum\s+\| (\d+)/);
const MENUNGGU_BAWAAN = [...cBawaanA.matchAll(/menunggu\s+\| \d+\s+\| (\d+)/g)].reduce((s, m) => s + Number(m[1]), 0);
const MATI_BAWAAN = angka(cBawaanA, /mati\s+\| 5\s+\| (\d+)/);
const LULUS_AKHIR = angka(cBawaanB, /lulus\s+\| terverifikasi\s+\| (\d+)/);
const GAGAL_AKHIR = angka(cBawaanB, /gagal\s+\| belum\s+\| (\d+)/);
const TIMEOUT_BREAKER = cocok(cAdrBagian, /-breaker-timeout (\d+)s/)[1]!;
const logBreaker = cocok(cBawaanB, /^log breaker: (.*)$/m)[1]!;

const NK_TIRUAN = bagian(tiruanGo);
const kTiruan = NK_TIRUAN.nomor((b) => b.startsWith("\tif !v.alamat.Periksa(sumber(r)) {"));
const kTiruanAkhir = NK_TIRUAN.nomor((b) => b === "\t}", kTiruan);
const NK_VERIF = bagian(verifGo);
const kVerif = NK_VERIF.nomor((b) => b === "\tif resp.StatusCode >= 400 {");
const NK_LAJUR = bagian(lajurGo);
const kLajur = NK_LAJUR.nomor((b) => b === "\tif !o.Bawaan && o.SalahPermintaan != nil {");

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);
const langSnippet = tag.map((t) => t.match(/lang="([^"]+)"/)?.[1]);

// ---- naskah: baris M34, beban, dan peta halaman -----------------------------------------------------------------------
const barisM34 = naskah.split("\n").find((b) => b.startsWith("| M34 |"))!;
const HARI = cocok(barisM34, /\| (Senin) (\d\d\.\d\d), hari pertama sesudah cutover akhir pekan/)[1]!;
const JAM = cocok(barisM34, /Senin (\d\d\.\d\d), hari pertama/)[1]!;
const PER_JAM = cocok(barisM34, /±(\d+) pendaftar per jam mencoba lagi \(Hitungan: 1\.000 ÷ 24\)/)[1]!;
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Verifikasi identitas | pendaftar ÷ 86.400 × puncak |"))!;
const PENDAFTAR = angka(barisBeban, /\| (1\.000) pendaftar per hari \(Asumsi\) \|/);
const JAM_SEHARI = Number(cocok(barisM34, /1\.000 ÷ (24)\)/)[1]);
const LAJU = PENDAFTAR / JAM_SEHARI;
const LAJU_TEKS = LAJU.toFixed(2).replace(".", ",");

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.16 ada, masalah, jalur inti, prasyarat ADR 36 dan 1.35, lab t4-infra, peran devops dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m34")).toMatchObject({ ada: true, nomor: "4.16", jenis: "masalah", inti: true, prasyarat: ["t4-breaker", "t1-secret"], lab: ["t4-infra"], tahap: 4, peran: ["devops", "backend"] });
    expect(dari("t4-infra-secret").nomor).toBe("4.17");
    expect(frontmatter).toContain('title: "4.16 M34: Semua verifikasi ditolak sesudah pindah hosting"');
    expect(frontmatter).toContain("description: Minggu 8. Sesudah Rekeningo pindah ke infrastruktur PT, setiap pendaftar baru gagal diverifikasi, karena vendor menolak alamat keluar yang baru dan breaker tidak menolong.");
    expect(dari("t4-m34").judul).toBe("M34: Semua verifikasi ditolak sesudah pindah hosting");
    expect(naskah).toContain("| 4.16 | 4 | M34: Semua verifikasi ditolak sesudah pindah hosting | Masalah | ★ | t4-infra | alur |");
    expect(barisM34).toMatch(/^\| M34 \| 8 \|/);
    expect(dari("t4-m34").label).toBe("Masalah 34 · minggu 8");
    harus("Minggu 8 Tahap 4.");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-breaker\]\], \[\[t1-secret\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m34").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "t1-secret", "t3-at-least-once", "t3-tls-pinning", "t4-breaker", "t4-infra-secret", "t4-m31", "t4-tim-infra"]);
    const sesuai: [string, string, string][] = [
      ["t1-secret", "1.35", "Secret di repo"], ["t3-at-least-once", "3.13", "At-least-once"], ["t3-tls-pinning", "3.25", "Keamanan 6: TLS"],
      ["t4-m31", "4.10", "M31: 146 pendaftar"], ["t4-breaker", "4.11", "Timeout, retry berkunci"],
      ["t4-infra-secret", "4.17", "Secret manager, IaC, alamat keluar tetap"], ["t4-tim-infra", "4.26", "Tim dan infra Tahap 4"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t4-breaker").adr).toEqual([36]);
    expect(dari("t4-infra-secret").adr).toEqual([39]);
    expect(dari("t4-tim-infra").adr).toEqual([44]);
    expect(dari("t3-tls-pinning").adr).toEqual([31]);
    expect(dari("t3-at-least-once").adr).toEqual([25]);
    harus("Keputusannya ADR 39.");
    harus("Keputusannya ADR 44.");
  });
  test("janji halaman lain ke 4.16 ditepati: 4.11 (403 tidak membuka breaker; penilaian 401, 403, 408, 429 belum diputuskan) dan 3.25 (pin ditinjau sebelum pindah)", () => {
    expect(hal411).toContain("[[t4-m34]] membahas satu jawaban 403 yang tidak membuka breaker.");
    expect(hal411).toContain("[[t4-m34]] menunjukkan satu jawaban 403 yang tidak membuka breaker, dan memaksa penilaian 401 dan 403 ditinjau ulang.");
    expect(hal411).toContain("| Hasil netral (`IsExcluded`) untuk 401, 403, 408, 429 | Penilaian jawaban ini belum diputuskan | [[t4-m34]] |");
    expect(hal411).toContain("Apakah 401, 403, 408, dan 429 dihitung netral belum diputuskan.");
    expect(hal411).toContain("Jawaban 4xx dihitung sukses supaya permintaan yang salah tidak membukanya.");
    expect(hal411).toContain("Breaker membuka sesudah gagal berturut-turut ke-6, terbuka 60 detik");
    expect(hal325).toContain("Pindah hosting di Tahap 4 ([[t4-m34]]) adalah rotasi berikutnya yang kamu tahu akan datang. ADR ini ditinjau ulang sebelum pindah.");
    harus("**Tiga hal lain dari pindahan yang sama.**");
    harus("**Penilaian 401 dan 403 belum diputuskan.** ADR 36 menulis bahwa apakah 401, 403, 408, dan 429 dihitung netral belum diputuskan ([[t4-breaker]]).");
    harus("**Pin ADR 31 harus ditinjau sebelum pindah.**");
    harus("Breaker tidak pernah terbuka");
    expect(hal413).toContain("ADR 25: at-least-once dengan batas lima percobaan");
    expect(hal410).toContain("lima percobaan");
    harus("Lima percobaan adalah batas ADR 25 ([[t3-at-least-once]])");
  });
  test("halaman tidak membuka isi 4.17: ADR 39, OpenBao, rotasi, dan NAT hanya disebut, tanpa keputusan atau aturan ADR 39", () => {
    expect(badan.match(/ADR 39/g)).toHaveLength(1);
    expect(badan.match(/OpenBao/g)).toHaveLength(1);
    expect(badan).not.toMatch(/OpenTofu v1\.13\.2.*Terraform|Terraform|\bVault v2\b|BSL|rotasi tanpa deploy|masa tumpang tindih|secret dibaca saat runtime|mode dev/);
    expect(badan.match(/NAT/g)).toHaveLength(1);
    expect(badan.match(/ADR 44/g)).toHaveLength(1);
  });
});

describe("naskah M34: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M34 di naskah: Senin, tim, 403, Laras, vendor mati lagi, alamat keluar berubah, dua hari kerja, dua temuan lain, pin ADR 31", () => {
    expect(barisM34).toContain("Semua pendaftar baru melihat \"Verifikasi gagal\"");
    expect(barisM34).toContain("Log vendor menolak dengan 403. Laras: \"Ini bukan pemadaman.\" (Ilustrasi)");
    expect(barisM34).toContain("| Vendor mati lagi; M31 terulang |");
    expect(barisM34).toContain("pendaftaran alamat butuh dua hari kerja (Asumsi)");
    expect(barisM34).toContain("nilai secret ikut tertulis di state IaC");
    expect(barisM34).toContain("staging memakai kunci API gateway produksi (Ilustrasi;");
    expect(barisM34).toContain("pin ADR 31 harus ditinjau ulang sebelum pindah (halaman 3.25;");
    expect(barisM34).toContain("provider Vault atau OpenBao Tidak dijalankan [perlu verifikasi]");
  });
  test("kalimat Gejala: hari dan jam dari baris naskah, laju per jam dari 1.000 ÷ 24 (Hitungan atas Asumsi), kutipan Laras, Ilustrasi", () => {
    expect(HARI).toBe("Senin");
    harus(`${HARI} pukul ${JAM} menjadi hari kerja pertama sesudah Rekeningo dipindah ke infrastruktur PT pada akhir pekan.`);
    expect(PER_JAM).toBe(String(Math.round(LAJU)));
    harus(`rata-rata ±${PER_JAM} orang per jam.`);
    harus(`Laju ±${PER_JAM} per jam berasal dari ${rib(PENDAFTAR)} pendaftar per hari ÷ ${JAM_SEHARI} jam = ${LAJU_TEKS}.`);
    expect(LAJU_TEKS).toBe("41,67");
    harus(`${rib(PENDAFTAR)} per hari termasuk Asumsi.`);
    harus("Laras, dari tim security, berkata: \"Ini bukan pemadaman.\"");
    harus("*Angka cerita (Ilustrasi):* hari, jam, dan kutipan Laras berasal dari cerita, bukan dari rekaman.");
    expect(badan.match(/Itu Hitungan, yaitu angka yang dihitung dari angka lain di halaman/g)).toHaveLength(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Itu Hitungan, yaitu") + "Itu ".length);
  });
  test("adegan Gejala tanpa kalimat definisi dan tanpa konsep; yang dikira sebelum yang sebenarnya; dugaan Raka dari naskah dan M31", () => {
    const gejala = cocok(badan, /<Blok nama="Gejala" buka>([\s\S]*?)<\/Blok>/)[1]!;
    expect(gejala.replace(/\*Angka cerita[\s\S]*$/, "")).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut|allowlist|alamat keluar|breaker)\b/i);
    expect(badan.indexOf('<Blok nama="Yang Raka kira"')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    harus("Raka menduga vendor mati lagi dan M31 terulang.");
    expect(dari("t4-m31").label).toBe("Masalah 31 · minggu 5");
    harus("di minggu 5 ([[t4-m31]]): \"Verifikasi gagal\"");
    expect(naskah).toMatch(/\| M31 \| 5 \| Sabtu 09\.10[^|]*"Verifikasi gagal"/);
    harus("Pada M31 layanan verifikasi tidak menjawab, dan tiap pekerjaan menghabiskan lima percobaan.");
    expect(hal410).toContain("lima percobaan");
    expect(naskah).toContain("Layanan verifikasi tiruan tidak menjawab selama 3 jam 30 menit (Ilustrasi)");
    harus("Sesudah M31, ADR 36 menambah breaker per vendor ([[t4-breaker]]).");
    expect(hal411).toContain("**Status:** diterima sesudah M31");
  });
  test("tebakan di blok Yang Raka kira: jawabannya tersembunyi di details; RFC 9110 bagian 15.5.4 dan tanggal akses sama dengan baris riset", () => {
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(d[1]).toBe("Tebak dulu: vendor menjawab setiap permintaan dengan 403, bukan 503 dan bukan timeout. Apa yang ditolaknya?");
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(d[2]).toContain("RFC 9110 bagian 15.5.4 menulis bahwa 403 berarti server memahami permintaan dan menolak memenuhinya");
    expect(d[2]).toContain("[RFC 9110, 403 Forbidden](https://www.rfc-editor.org/rfc/rfc9110.html#name-403-forbidden), dibuka 2026-10-30, Tidak dijalankan");
    const r = barisRiset("R4-185");
    expect(r).toContain("rfc-editor.org/rfc/rfc9110, bagian 15.5 dan 15.5.4, dibuka 2026-10-30");
    expect(r).toContain("The 403 (Forbidden) status code indicates that the server understood the request but refuses to fulfill it.");
    expect(r).toContain("The 4xx (Client Error) class of status code indicates that the client seems to have erred.");
    expect(readmeInfra).toContain("Vendor tiruan menolak permintaan dari alamat yang tidak terdaftar dengan 403");
  });
});

describe("rekaman alamat.txt: bagian A, B, dan C, nilai yang dikutip, dan rentang Snippet", () => {
  test("A: host lama terdaftar dan tiga lulus; host baru berbeda; 3 pekerjaan x 5 percobaan = 15 penolakan 403; tiga pengajuan gagal", () => {
    expect(LULUS_A).toBe(LAMA_A);
    expect(PEKERJAAN_A).toBe(GAGAL_A);
    expect(PERCOBAAN).toBe(5);
    expect(TOLAK_A).toBe(PEKERJAAN_A * PERCOBAAN);
    expect(bagianSebelum).toContain("#   daftar alamat di vendor: host lama");
    expect(bagianSebelum).toContain("#   ditolak 403, per alamat sumber: (tidak ada)");
    expect(T.baris[aBeda - 1]).toBe("# alamat host baru berbeda dari alamat host lama: ya");
    expect(T.teks(aSesudahMulai, aTiap - 1)).toContain("#   daftar alamat di vendor: host lama");
    expect(T.baris[aTiap - 1]).toContain("(3 pekerjaan x 5 percobaan = 15 penolakan)");
    harus(`${Kata(PEKERJAAN_A)} pekerjaan dikali ${kata(PERCOBAAN)} percobaan menghasilkan ${TOLAK_A} penolakan.`);
    harus(`Host lama terdaftar, dan ${kata(LULUS_A)} pendaftar lulus:`);
    harus(`${Kata(GAGAL_A)} pendaftar baru mengajukan verifikasi:`);
    harus("Vendor tidak mati: ia menjawab, dan sebelum pindahan ia meluluskan " + `${kata(LAMA_A)} pendaftar dari host lama.`);
    harus("Tidak ada yang mendaftarkan alamat host baru.");
  });
  test("A: klaim berlingkup bagian A: hanya satu alamat sumber ditolak ('host baru'), tidak ada penolakan dari 'host lama'", () => {
    const sesudah = T.teks(aSesudahMulai, aTiap - 1);
    expect(sesudah.match(/ditolak 403, per alamat sumber: \{[^}]*\}/g)).toEqual([`ditolak 403, per alamat sumber: {'host baru': ${TOLAK_A}}`]);
  });
  test("B: proxy keluar: yang didaftarkan alamat proxy; tiga alamat berbeda; enam permintaan diterima dari satu alamat tanpa penolakan", () => {
    expect(LULUS_B_SEBELUM).toBe(3);
    expect(LULUS_B).toBe(3);
    expect(TERIMA_B).toBe(LULUS_B_SEBELUM + LULUS_B);
    expect(bagB).toContain("# tiga alamat berbeda satu sama lain (host lama, host baru, proxy): ya");
    expect(T.teks(bSesudah, bBatas)).toContain("#   ditolak 403, per alamat sumber: (tidak ada)");
    expect(T.teks(bSesudah, bBatas)).toContain("#   daftar alamat di vendor: proxy keluar");
    expect(bagB).toContain("-e HTTP_PROXY=http://proxy:3128");
    harus(`${kata(TERIMA_B)} permintaan diterima dari satu alamat, tanpa penolakan (Rekaman lab, bagian B).`);
    expect(T.baris[bBatas - 1]).toContain("titik gagal tunggal baru");
    harus("proxy keluar menjadi titik gagal tunggal baru, dan lab tidak merekam matinya proxy.");
    expect(readmeInfra).toContain("Proxy keluar adalah titik gagal tunggal baru; matinya proxy tidak direkam.");
  });
  test("C, aturan ADR 36: delapan pekerjaan, 8 x 5 = 40 penolakan, delapan gagal, tanpa perpindahan status; Timeout breaker 3 detik", () => {
    expect(PEKERJAAN_C).toBe(GAGAL_C);
    expect(TOLAK_C).toBe(PEKERJAAN_C * PERCOBAAN);
    expect(cAdrBagian).toContain("# Breaker tidak pernah terbuka: 403 adalah jawaban 4xx, dihitung sukses.");
    expect(cAdrBagian).not.toMatch(/log breaker/);
    expect(TIMEOUT_BREAKER).toBe("3");
    expect(cAdrBagian).toContain("Pengaturan breaker: ADR 36 (4xx = sukses)");
    harus(`untuk ${kata(PEKERJAAN_C)} pekerjaan, dengan breaker ADR 36 dan Timeout ${TIMEOUT_BREAKER} detik (ADR 36 memakai 60 detik).`);
    harus(`Breaker tidak pernah terbuka: ${PEKERJAAN_C} × ${PERCOBAAN} = ${TOLAK_C} penolakan, dan ${kata(GAGAL_C)} pengajuan berstatus \`gagal\`:`);
    expect(hal411).toContain("terbuka 60 detik");
  });
  test("C, bawaan pustaka: terbuka sesudah enam penolakan; tujuh menunggu, satu mati; sesudah alamat didaftarkan tujuh lulus, satu gagal; log breaker tiga perpindahan", () => {
    expect(TOLAK_BAWAAN).toBe(6);
    expect(DIAJUKAN_BAWAAN).toBe(MENUNGGU_BAWAAN);
    expect(GAGAL_BAWAAN).toBe(MATI_BAWAAN);
    expect(DIAJUKAN_BAWAAN + GAGAL_BAWAAN).toBe(PEKERJAAN_C);
    expect(LULUS_AKHIR).toBe(DIAJUKAN_BAWAAN);
    expect(GAGAL_AKHIR).toBe(GAGAL_BAWAAN);
    expect(logBreaker).toBe("breaker verifikasi: closed -> open, breaker verifikasi: open -> half-open, breaker verifikasi: half-open -> closed");
    expect(cBawaanA).toContain("# Satu pekerjaan sudah memakai lima percobaannya sebelum breaker terbuka (ambang breaker 6 lebih tinggi daripada batas percobaan 5)");
    expect(cBawaanA).toContain("Pengaturan breaker: bawaan pustaka (4xx = gagal)");
    expect(cBawaanB).toContain("# Pendaftar yang pekerjaannya sudah mati tetap gagal; tidak ada yang mengantrekannya ulang");
    harus(`Breaker terbuka sesudah ${kata(TOLAK_BAWAAN)} penolakan beruntun. ${Kata(MENUNGGU_BAWAAN)} pekerjaan menunggu, dan ${kata(MATI_BAWAAN)} pekerjaan sudah mati:`);
    harus(`1. Breaker bawaan membuat ${kata(MENUNGGU_BAWAAN)} pekerjaan menunggu, bukan mati. Aturan ADR 36 membuat ${kata(PEKERJAAN_C)} pekerjaan mati.`);
    harus(`${kata(LULUS_AKHIR)} dari ${kata(PEKERJAAN_C)} lulus sesudah alamat didaftarkan`);
    harus("Ambang breaker 6 lebih tinggi daripada batas lima percobaan, jadi pekerjaan pertama habis sebelum breaker terbuka.");
    harus("tidak ada yang mengantrekannya ulang, seperti di M31.");
    expect(hal410).toMatch(/tidak ada yang mengantre/);
    expect(naskah).toContain("tujuh dari delapan pekerjaan lulus");
    expect(naskah).toContain("ambang 6 lebih tinggi daripada batas percobaan 5");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, bukan ditulis tangan; berkas, bahasa, dan judul sesuai; urutan di halaman", () => {
    expect(tag).toHaveLength(10);
    expect(lines).toEqual([
      `${kTiruan}:${kTiruanAkhir}`, `${aSebelum}:${aSebelum + 4}`, `${aBeda}:${aBeda + 1}`, `${aSesudahMulai}:${aTiap - 1}`,
      `${cAdr}:${cAdr + 6}`, `${kVerif}:${kVerif + 2}`, `${kLajur}:${kLajur + 3}`, `${cTerbuka}:${cTerbuka + 4}`, `${cDidaftar}:${cDidaftar + 5}`, `${bSesudah}:${bBatas}`,
    ]);
    expect(berkasSnippet).toEqual([
      "labs/api-t4/cmd/tiruan/main.go", "labs/t4-infra/output/alamat.txt", "labs/t4-infra/output/alamat.txt", "labs/t4-infra/output/alamat.txt",
      "labs/t4-infra/output/alamat.txt", "labs/api-t4/internal/verifikasi/verifikasi.go", "labs/api-t4/internal/lajur/lajur.go",
      "labs/t4-infra/output/alamat.txt", "labs/t4-infra/output/alamat.txt", "labs/t4-infra/output/alamat.txt",
    ]);
    expect(langSnippet).toEqual(["go", undefined, undefined, undefined, undefined, "go", "go", undefined, undefined, undefined]);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/cmd/tiruan/main.go baris ${kTiruan} sampai ${kTiruanAkhir} (alamat tidak terdaftar dijawab 403)`,
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian A (sebelum pindahan)",
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian A (host baru, alamat berbeda)",
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian A (sesudah pindahan: 403 di tiap percobaan)",
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian C (aturan ADR 36: breaker tidak terbuka)",
      `Kode lab: labs/api-t4/internal/verifikasi/verifikasi.go baris ${kVerif} sampai ${kVerif + 2} (jawaban 4xx menjadi penolakan vendor)`,
      `Kode lab: labs/api-t4/internal/lajur/lajur.go baris ${kLajur} sampai ${kLajur + 3} (penolakan dihitung sukses)`,
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian C (bawaan pustaka: breaker terbuka)",
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian C (alamat didaftarkan, lajur pulih)",
      "Rekaman lab: labs/t4-infra/output/alamat.txt, bagian B (proxy keluar: alamat host baru tidak sampai ke vendor)",
    ]);
    // bagian: A di antara tA dan tB, B di antara tB dan tC, C sesudah tC
    expect(aSebelum).toBeGreaterThan(tA);
    expect(aTiap).toBeLessThan(tB);
    expect(bSesudah).toBeGreaterThan(tB);
    expect(bBatas).toBeLessThan(tC);
    expect(cAdr).toBeGreaterThan(tC);
    expect(cTerbuka).toBeGreaterThan(cAdr);
    expect(cDidaftar).toBeGreaterThan(cTerbuka);
    expect(T.baris[aSebelum + 3]).toMatch(/^#\s+permintaan yang diproses: \d+, objek dibuat: \d+$/);
    expect(T.baris[cAdr + 5]).toContain("Aturan ADR 36 benar untuk dokumen yang salah (422)");
    expect(T.baris[cTerbuka + 3]).toMatch(/^#\s+permintaan yang diproses: 0, objek dibuat: 0$/);
    expect(T.baris[cDidaftar]).toMatch(/^#\s+daftar alamat di vendor: host baru$/);
    expect(T.baris[cDidaftar + 4]).toMatch(/^log breaker: /);
    expect(kTiruan).toBeLessThan(NK_TIRUAN.nomor((b) => b.includes("io.ReadAll(io.LimitReader(r.Body"), kTiruan));
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, atau rujukan naskah internal", () => {
    const tampil = [
      NK_TIRUAN.teks(kTiruan, kTiruanAkhir), T.teks(aSebelum, aSebelum + 4), T.teks(aBeda, aBeda + 1), T.teks(aSesudahMulai, aTiap - 1),
      T.teks(cAdr, cAdr + 6), NK_VERIF.teks(kVerif, kVerif + 2), NK_LAJUR.teks(kLajur, kLajur + 3), T.teks(cTerbuka, cTerbuka + 4),
      T.teks(cDidaftar, cDidaftar + 5), T.teks(bSesudah, bBatas),
    ].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b|\b[A-G]\d\b|\bnaskah\b|tinjauan|temuan/i);
  });
});

describe("kode lab: alamat ujung koneksi, 4xx menjadi penolakan vendor, penolakan dihitung sukses, dan klaim negatif berlingkup", () => {
  test("tiruan: Periksa(sumber(r)) sebelum body dibaca dan menjawab 403; sumber memakai RemoteAddr dan kode tidak membaca header", () => {
    expect(NK_TIRUAN.baris[kTiruan]).toContain("http.StatusForbidden");
    expect(NK_TIRUAN.baris[kTiruan - 1]).toContain("tidak terdaftar");
    expect(alamatGo).toContain("host, _, err := net.SplitHostPort(r.RemoteAddr)");
    const kode = alamatGo.split("\n").filter((b) => !b.trim().startsWith("//")).join("\n");
    expect(kode).not.toMatch(/Header\.Get|X-Forwarded-For|X-Real-IP/);
    expect(alamatGo).toContain("alamat peer koneksi TCP (r.RemoteAddr), bukan header apa pun");
    harus("memeriksa alamat ujung koneksi TCP, bukan header. Ia menjawab 403 sebelum membaca isi permintaan (Tidak dijalankan: dibaca dari kode):");
  });
  test("verifikasi: jawaban 4xx menjadi ErrDitolakVendor (bukan 5xx); SalahPermintaan menandainya; lajur menghitungnya sukses kecuali Bawaan; breaker.go memasangnya", () => {
    expect(NK_VERIF.baris[kVerif]).toContain("ErrDitolakVendor");
    expect(NK_VERIF.baris[kVerif - 4]).toContain("resp.StatusCode >= 500");
    expect(NK_VERIF.baris[kVerif - 3]).toContain("ErrTidakTersedia");
    expect(verifGo).toContain("func SalahPermintaan(err error) bool { return errors.Is(err, ErrDitolakVendor) }");
    expect(NK_LAJUR.baris[kLajur]).toBe("\t\tsalah := o.SalahPermintaan");
    expect(NK_LAJUR.baris[kLajur + 1]).toBe("\t\tst.IsSuccessful = func(err error) bool { return err == nil || salah(err) }");
    expect(lajurGo).toContain("Bawaan          bool // true: IsSuccessful bawaan pustaka (semua error non-nil gagal)");
    expect(breakerGo).toContain("SalahPermintaan: verifikasi.SalahPermintaan");
    expect(lajurGo).toContain("Breaker membuka sesudah lebih dari 5 gagal berturut-turut (ReadyToTrip bawaan)");
    harus("ADR 36 menghitung jawaban 4xx sebagai sukses, supaya permintaan yang salah tidak membuka breaker ([[t4-breaker]]), dan 403 termasuk 4xx.");
    harus("Kode lab menandai setiap jawaban 4xx vendor sebagai penolakan, lalu breaker menghitung penolakan itu sukses (Tidak dijalankan: dibaca dari kode):");
    harus("Rekaman yang sama menjalankan pengaturan bawaan pustaka, yang menghitung 403 gagal.");
  });
  test("klaim negatif berlingkup: tidak ada rekaman pin di labs/t4-*/output; provider OpenTofu hanya random dan local; tidak ada provider Vault atau OpenBao", () => {
    const rekamanT4 = fs.readdirSync(path.join(akar, "labs")).filter((d) => d.startsWith("t4-") || d === "api-t4").flatMap((d) => {
      const o = path.join(akar, "labs", d, "output");
      return fs.existsSync(o) ? fs.readdirSync(o).filter((f) => f.endsWith(".txt")).map((f) => `labs/${d}/output/${f}`) : [];
    });
    expect(rekamanT4.length).toBeGreaterThan(20);
    for (const f of rekamanT4) expect(baca(f), f).not.toMatch(/spki|pin-tidak-cocok|--mode=pin/i);
    harus("(penalaran dari cerita, tidak dijalankan lab Tahap 4)");
    const tofu = path.join(akar, "labs/t4-infra/tofu");
    const sumber = fs.readdirSync(tofu).flatMap((d) => fs.readdirSync(path.join(tofu, d)).filter((f) => f.endsWith(".tf")).map((f) => baca(`labs/t4-infra/tofu/${d}/${f}`)));
    const provider = [...new Set(sumber.flatMap((s) => [...s.matchAll(/source\s*=\s*"([^"]+)"/g)].map((m) => m[1]!)))].sort();
    expect(provider).toEqual(["hashicorp/local", "hashicorp/random"]);
    harus("Data source milik provider Vault atau OpenBao Tidak dijalankan [perlu verifikasi].");
    expect(readmeInfra).toContain("Provider Docker atau cloud untuk OpenTofu**: Tidak dijalankan");
    expect(readmeInfra).toContain("**Hosting terkelola, NAT cloud, dan failover PostgreSQL terkelola**: Tidak dijalankan.");
    harus("Hosting terkelola, akun cloud PT, dan alamat IP publik nyata Tidak dijalankan. Alamat di rekaman adalah alamat container.");
    expect(readmeInfra).toContain("NAT dengan IP tetap");
  });
});

describe("state.txt, staging.txt, dan pin.txt Tahap 3: dua temuan lain dan pin ADR 31", () => {
  const sA = stateTxt.slice(stateTxt.indexOf("# --- A. "), stateTxt.indexOf("# --- B. "));
  const sB = stateTxt.slice(stateTxt.indexOf("# --- B. "), stateTxt.indexOf("# --- C. "));
  const sC = stateTxt.slice(stateTxt.indexOf("# --- C. "));
  test("state.txt: A password dan kunci masuk state walau CLI menulis (sensitive value); B konfigurasi alamat dan path tanpa nilai; C data source local memasukkan nilai", () => {
    expect(stateTxt).toContain("OpenTofu v1.13.2");
    expect(stateTxt).toContain("provider random 3.9.1 dan local 2.9.1");
    expect(sA).toContain("keluaran CLI memuat password atau kunci: tidak (diganti \"(sensitive value)\")");
    expect(sA).toContain("state memuat nilai password dari random_password: ya");
    expect(sA).toContain("state memuat nilai kunci dari variabel TF_VAR_kunci_gateway: ya");
    expect(sB).toContain("state memuat nilai rahasia webhook: tidak");
    expect(sB).toContain('{"path":"secret/data/pembayaran/webhook","secret_manager":"http://openbao:8200"}');
    expect(sC).toContain("state memuat nilai rahasia yang dibaca data source: ya");
    expect(sC).toContain("data.local_sensitive_file.rahasia");
    expect(sC).toContain("Di lab ini yang terbukti hanya provider local.");
    expect(sC).toContain("[perlu verifikasi: provider Vault atau OpenBao tidak dijalankan di lab ini]");
    harus("Lab merekam mekanismenya dengan OpenTofu v1.13.2.");
    harus("Password dari `random_password` dan kunci dari variabel masuk state, walau keluaran CLI menulis \"(sensitive value)\".");
    harus("Data source `local_sensitive_file` yang membaca file rahasia juga memasukkan isinya.");
    harus("Konfigurasi yang hanya menulis alamat dan path secret manager tidak memuat nilai (Rekaman lab, `state.txt` bagian A sampai C).");
  });
  test("R4-186: dokumentasi OpenTofu 1.13.x: state memuat semua atribut, state lokal JSON teks biasa; URL dan tanggal akses sama di halaman dan riset", () => {
    const r = barisRiset("R4-186");
    expect(r).toContain("opentofu.org/docs/language/state/sensitive-data/, dibuka 2026-10-30");
    expect(r).toContain("The state contains resource IDs and all resource attributes. For resources such as databases, this may contain initial passwords.");
    expect(r).toContain("When using local state, state is stored in plain-text JSON files.");
    harus("Dokumentasi OpenTofu menulis bahwa state memuat semua atribut sumber daya. State lokal berupa file JSON teks biasa ([OpenTofu: Sensitive Data in State](https://opentofu.org/docs/language/state/sensitive-data/), versi 1.13.x, dibuka 2026-10-30, Tidak dijalankan).");
    expect(readmeInfra).toContain("dokumentasi OpenTofu menganjurkan mempertimbangkan penandaan sensitif");
  });
  test("staging.txt B: pemindai menemukan dua kunci produksi di dua file contoh, tanpa mencetak nilai; kejadian di Rekeningo hanya cerita", () => {
    const b = stagingTxt.slice(stagingTxt.indexOf("# --- B. "));
    expect(b).toContain("(Ilustrasi: naskah menulis staging memakai kunci gateway produksi)");
    expect(b).toContain("staging.env:2: kunci produksi (awalan)");
    expect(b).toContain("penerbit.env:1: kunci produksi (sidik)");
    expect(b).toContain("# Keluaran memuat file, nomor baris, dan alasan; nilai kuncinya tidak dicetak.");
    expect(readmeInfra).toContain("**Kunci produksi di staging pada kenyataannya**: skenario naskah (Ilustrasi); lab merekam pemindainya, bukan kejadiannya.");
    harus("Lab tidak merekam kejadian ini. Lab hanya merekam pemindai atas dua file contoh, yang menemukan dua kunci produksi (Rekaman lab, `staging.txt` bagian B).");
    const pindai = b.slice(b.indexOf("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik staging.env penerbit.env"));
    expect(pindai.slice(0, pindai.indexOf("# exit status 1")).match(/^\w+\.env:\d+: kunci produksi/gm)).toHaveLength(2);
  });
  test("pin.txt Tahap 3 bagian C: app dengan pin A dan B ditolak saat server memakai kunci C; app dengan pin B dan C terhubung; ADR 31 pin SPKI dengan satu cadangan", () => {
    const c = pinTxt.slice(pinTxt.indexOf("# --- C. "), pinTxt.indexOf("# --- D. "));
    expect(c).toContain("--pin=spki_server-a,spki_server-b");
    expect(c).toContain("--pin=spki_server-b,spki_server-c");
    const rotasiKedua = c.slice(c.indexOf("# Rotasi kedua ke C"));
    expect(rotasiKedua).toContain('{"hasil":"ditolak","jenis":"pin-tidak-cocok"}');
    expect(rotasiKedua.indexOf('"ditolak"')).toBeLessThan(rotasiKedua.indexOf("spki_server-b,spki_server-c"));
    expect(rotasiKedua).toMatch(/--pin=spki_server-b,spki_server-c[^\n]*\n\{"hasil":"terhubung"/);
    expect(hal325).toContain("### ADR 31: validasi selalu aktif, pin SPKI dengan satu cadangan, HSTS di dasbor, token 15 menit");
    expect(hal325).toContain("Saat server pindah ke hosting lain tanpa rilis app yang lebih dulu memasang kunci barunya.");
    harus("Pindahan mengganti server tepi dan mungkin kunci TLS-nya (penalaran dari cerita, tidak dijalankan lab Tahap 4).");
    harus("App memakai pin SPKI, yaitu hash kunci publik server yang disimpan app, dengan satu cadangan ([[t3-tls-pinning]]).");
    harus("Di Tahap 3, app dengan pin A dan B menolak koneksi saat server memakai kunci C. App dengan pin B dan C terhubung (Rekaman lab, `labs/t3-mitm/output/pin.txt` bagian C).");
    harus("Di M34 penolakan datang dari vendor, bukan dari pin app.");
  });
  test("R4-187 dan baris riset: urut ID, tidak ganda, lima kolom, satu baris per ID; sidik terkunci terpisah", () => {
    const ids = ["R4-185", "R4-186", "R4-187"];
    const baris = riset.split("\n");
    const posisi = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    expect(posisi.every((p) => p >= 0)).toBe(true);
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
    for (const id of ids) {
      expect(baris.filter((b) => b.startsWith(`| ${id} |`))).toHaveLength(1);
      expect(barisRiset(id).split(" | ").length, id).toBeGreaterThanOrEqual(5);
    }
    const r = barisRiset("R4-187");
    expect(r).toContain("PostgreSQL 17.11, go1.27.1, pgx v5.11.0, OpenTofu v1.13.2");
    expect(r).toContain(`(aturan ADR 36: delapan pekerjaan, ${TOLAK_C} penolakan, delapan \`gagal\``);
    expect(r).toContain(`${TOLAK_A} penolakan 403 dari ${kata(PEKERJAAN_A)} pekerjaan`);
    expect(stateTxt.split("\n")[1]).toContain("PostgreSQL 17.11");
    expect(stateTxt.split("\n")[1]).toContain("go1.27.1 · pgx v5.11.0");
    ids.forEach((id, i) => expect(sidik(barisRiset(id)), id).toBe(SIDIK.riset[i]));
  });
  test("tanpa ID riset, nomor keputusan, nomor PR, emoji, atau satuan B di halaman, diagram, skenario, dan kartu", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m34");
    expect(kartu).toHaveLength(3);
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).toMatch(/^### Cek diri$/m);
    expect(badan).not.toMatch(/\d+ ?B\b/);
  });
  test("label sumber: arti Ilustrasi, Rekaman lab, Asumsi, Tidak dijalankan ditaut ke A0 di Gejala; Hitungan didefinisikan di pemakaian pertama; tautan sumber luar dengan tanggal akses", () => {
    harus("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
    expect(badan.match(/Itu Hitungan, yaitu/g)).toHaveLength(1);
    expect(badan.match(/, dibuka 2026-10-30, Tidak dijalankan\)/g)).toHaveLength(2);
    expect(badan.match(/, versi 1\.13\.x, dibuka 2026-10-30, Tidak dijalankan\)/g)).toHaveLength(1);
    expect(badan.match(/\]\(https:\/\//g)).toHaveLength(2);
    expect(badan).not.toMatch(/\(Simulasi|Ilustrasi mekanisme|\(dibaca dari/);
    expect(badan.match(/\(Tidak dijalankan: dibaca dari kode\)/g)).toHaveLength(2);
    expect(badan.match(/\[perlu verifikasi\]/g)).toHaveLength(1);
    expect(cara).toContain("Label sumber");
  });
});

describe("halaman istilah Alamat keluar: baris glosarium, rujukan, sumber, dan angka dari rekaman", () => {
  test("nama dan kalimat pertama sama dengan kalimat definisi di halaman; baris glosarium menaut ke 4.16; slug sama dengan nama berkas", () => {
    expect(istilah.istilah).toBe("Alamat keluar");
    const definisi = "Alamat keluar adalah alamat IP yang dilihat server tujuan saat service Rekeningo memanggilnya.";
    expect(istilah.sehari_hari.startsWith(definisi)).toBe(true);
    harus(definisi);
    const baris = glosarium.split("\n").filter((b) => b.startsWith("| **Alamat keluar** |"));
    expect(baris).toHaveLength(1);
    expect(baris[0]).toContain("| [[t4-m34]] |");
    expect(sidik(baris[0]!)).toBe(SIDIK.glosarium);
    expect(istilah.stack).toBeNull();
    expect(istilah.terkait).toEqual(["Proxy", "Circuit breaker"]);
    for (const n of istilah.terkait) expect(glosarium).toContain(`| **${n}** |`);
    expect(glosarium.indexOf("| **Alamat keluar** |")).toBeGreaterThan(glosarium.indexOf("| **ADR** ("));
    expect(glosarium.indexOf("| **Alamat keluar** |")).toBeLessThan(glosarium.indexOf("| **Alert** |"));
  });
  test("cerita dan mekanisme: angka dari rekaman alamat.txt, label sumber, dan rujukan ke 4.16", () => {
    expect(istilah.cerita).toEqual([{ rujukan: "t4-m34", teks: `${HARI} pukul ${JAM}, sesudah Rekeningo pindah ke infrastruktur PT, setiap pendaftar baru gagal diverifikasi. Vendor menjawab 403 karena alamat host baru belum didaftarkan (cerita, Ilustrasi).` }]);
    expect(istilah.mekanisme).toHaveLength(3);
    expect(istilah.mekanisme[0]).toContain("layanan verifikasi tiruan memeriksa alamat ujung koneksi TCP, bukan header (`alamat.txt` bagian A).");
    expect(alamatGo).toContain("alamat peer koneksi TCP (r.RemoteAddr), bukan header apa pun");
    expect(istilah.mekanisme[1]).toContain(`${Kata(PEKERJAAN_A)} pekerjaan menghabiskan ${TOLAK_A} penolakan 403, ${kata(GAGAL_A)} pengajuan berstatus gagal (\`alamat.txt\` bagian A).`);
    expect(istilah.mekanisme[2]).toContain("vendor melihat alamat proxy, bukan alamat host. Pindahan host tidak mengubah alamat itu (`alamat.txt` bagian B).");
    expect(TERIMA_B).toBe(6);
    expect(istilah.jebakan[1]).toContain("403 dihitung sukses dan breaker tidak pernah terbuka (`alamat.txt` bagian C).");
    expect(istilah.jebakan[2]).toContain("pendaftaran satu alamat butuh dua hari kerja (Asumsi)");
    expect(barisM34).toContain("pendaftaran alamat butuh dua hari kerja (Asumsi)");
  });
  test("sumber: dua entri; RFC 9110 dengan URL dan tanggal akses sama dengan halaman dan riset; rekaman alamat.txt; ID riset ada; berkas dikunci sidik", () => {
    expect(istilah.sumber.map((s) => s.riset)).toEqual(["R4-185", "R4-187"]);
    const [rfc, rek] = istilah.sumber;
    expect(rfc!.url).toBe("https://www.rfc-editor.org/rfc/rfc9110.html#name-403-forbidden");
    expect(rfc!.judul).toBe("RFC 9110, bagian 15.5.4: 403 Forbidden (dibuka 2026-10-30)");
    expect(badan).toContain(`(${rfc!.url}), dibuka 2026-10-30`);
    expect(barisRiset("R4-185")).toContain("dibuka 2026-10-30");
    expect(rfc!.catatan).toBe("403 berarti server memahami permintaan dan menolak memenuhinya.");
    expect(rek!.rekaman).toBe("labs/t4-infra/output/alamat.txt");
    expect(rek!.catatan).toBe("Alamat host adalah alamat container Docker di satu jaringan lab, bukan alamat akun cloud.");
    expect(sidik(istilahMentah)).toBe(SIDIK.istilah);
    expect(istilahMentah).not.toMatch(/\bR\d-\d{2,3}\b(?!")/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: sesudah pindahan (bagian A) dan yang dilakukan breaker (bagian C); sub dihitung dari angka rekaman", () => {
    expect(diagram.id).toBe("t4-m34-alamat-berubah");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-infra · alamat.txt bagian A dan C" });
    expect(diagram.baris).toHaveLength(2);
    const [a, c] = diagram.baris;
    expect(a!.label).toBe("Sesudah pindahan");
    expect(a!.sub).toBe("bagian A, tanpa breaker");
    expect(a!.simpul.map((s) => s.teks)).toEqual(["Host baru menyala", `${Kata(GAGAL_A)} pendaftar mengajukan`, "403 di tiap percobaan", `${Kata(GAGAL_A)} pengajuan gagal`]);
    expect(a!.simpul.map((s) => s.sub)).toEqual(["alamat beda dari host lama", `${kata(PEKERJAAN_A)} pekerjaan`, `${TOLAK_A} = ${PEKERJAAN_A} × ${PERCOBAAN}`, "vendor menjawab"]);
    expect(a!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn", "warn"]);
    expect(c!.label).toBe("Yang dilakukan breaker");
    expect(c!.sub).toBe(`bagian C, ${kata(PEKERJAAN_C)} pekerjaan`);
    expect(c!.simpul.map((s) => s.teks)).toEqual(["Aturan ADR 36", "Tidak pernah terbuka", "Aturan bawaan pustaka", `Terbuka sesudah ${kata(TOLAK_BAWAAN)} penolakan`, "Alamat didaftarkan"]);
    expect(c!.simpul.map((s) => s.sub)).toEqual([
      "403 dihitung sukses", `${TOLAK_C} penolakan, ${GAGAL_C} gagal`, "403 dihitung gagal", `${MENUNGGU_BAWAAN} menunggu, ${MATI_BAWAAN} gagal`, `${LULUS_AKHIR} lulus, ${GAGAL_AKHIR} gagal`,
    ]);
    expect(c!.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "biasa", "biasa", "good"]);
    expect(diagram.catatan).toBe("Alamat host di lab adalah alamat container Docker, bukan alamat akun cloud. Kotak oranye adalah akibat yang direkam.");
    expect(readmeInfra).toContain("alamat container proxy dalam satu jaringan Docker");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    harus("<Rantai data={alamatBerubah} />");
    expect(badan).not.toContain("<Rantai data={alamatBerubah} ringkas />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(mdx).toContain('import alamatBerubah from "../../../../data/diagram/t4-m34-alamat-berubah.json";');
    const blok = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(blok).toContain("<Rantai data={alamatBerubah} />");
  });
});

describe("skenario alur t4-m34.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; empat komponen; sumber alamat.txt; tujuh langkah dan empat langkah varian dari awal", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-infra/output/alamat.txt", fileVarian: "labs/t4-infra/output/alamat.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["host", "Host aplikasi"], ["brk", "Breaker lajur verifikasi"], ["vnd", "Layanan verifikasi (tiruan)"], ["prx", "Proxy keluar"]]);
    expect(skenario.perangkat ?? []).toEqual([]);
    expect(skenario.langkah).toHaveLength(7);
    expect(skenario.varian.langkah).toHaveLength(4);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("permintaan keluar lewat proxy keluar bertetap");
    harus("**Ubah satu hal: permintaan keluar lewat proxy keluar bertetap**");
    harus("Widget ini mengikuti rekaman `alamat.txt` bagian A dan C, dengan satu varian dari bagian B.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m34.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(readmeInfra).toContain("make -C labs/t4-infra run BAGIAN=alamat");
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-infra run BAGIAN=alamat");
    expect(baca("labs/t4-infra/run.py")).toContain('"alamat"');
    expect(T.baris[tA - 1]).toContain("Tanpa proxy: alamat sumber sama dengan alamat host.");
    expect(T.baris[tB - 1]).toContain("Dengan proxy keluar bertetap");
    expect(T.baris[tC - 1]).toContain("Pindahan tanpa proxy, dengan breaker per lajur (ADR 36)");
  });
  test("tebakan: empat pilihan, jawaban benar (403, alamat sumber) sama dengan rekaman, tiga pilihan lain bertentangan, benar bukan yang terpanjang, posisi berbeda dari tebakan lain", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(2);
    expect(p.varian).toBe(false);
    expect(p.options[p.answer]).toBe("403: layanan menjawab, tetapi menolak alamat sumber host baru");
    expect(p.options.filter((_, i) => i !== 2)).toEqual([
      "Timeout: layanan tidak menjawab sampai batas 3 detik",
      "503: layanan sedang mati, seperti M31",
      "200 dengan status ditolak: layanan menilai foto pendaftar buram",
    ]);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(Math.max(...panjang)).not.toBe(panjang[p.answer]);
    const lain = ["t4-m29", "t4-m30", "t4-m31", "t4-m32", "t4-topup", "t4-verifikasi"].map((n) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${n}.json`)) as Skenario).predict.answer);
    expect(lain.filter((x) => x === p.answer).length).toBeLessThanOrEqual(lain.length / 2);
    // pilihan lain bertentangan dengan rekaman: tidak ada 503, timeout, atau status ditolak di bagian A; hanya 403
    expect(bagA).not.toMatch(/\b503\b/);
    expect(bagA).not.toMatch(/timeout/i);
    expect(bagA).toMatch(/ditolak 403, per alamat sumber/);
    expect(bagA).not.toMatch(/\bditolak\s+\| /);
    expect(p.q).toBe("Host aplikasi pindah ke alamat baru. Layanan verifikasi hanya menerima alamat yang didaftarkan, dan alamat host baru belum didaftarkan. Apa jawaban layanan atas permintaan host baru?");
    expect(p.explain).toBe(`Layanan memeriksa alamat sumber koneksi, bukan isi permintaan dan bukan foto. Alamat host baru tidak ada di daftar, jadi tiap permintaan dijawab 403. Rekaman alamat.txt bagian A: ditolak 403 per alamat sumber {'host baru': ${TOLAK_A}}.`);
  });
  test("baris perintah dan keluaran di kirim diturunkan dari rekaman, per langkah; baris diawali pagar atau panah diringkas dari rekaman yang sama", () => {
    const [l1, l2, l3, l4, l5, l6, l7] = skenario.langkah;
    expect(l1!.kirim).toBe([...T.teks(aSebelum + 1, aSebelum + 3).split("\n").map(ringkas), `verifikasi: lulus ${LULUS_A}`].join("\n"));
    expect(l2!.kirim).toBe(`${T.baris[aBeda - 1]}\n${T.baris[aBeda]!.replace(/:$/, "")}`);
    expect(l3!.kirim).toBe(["daftar alamat di vendor: host lama", `diterima, per alamat sumber yang dilihat vendor: {'host lama': ${LAMA_A}}`, `ditolak 403, per alamat sumber: {'host baru': ${TOLAK_A}}`].join("\n"));
    expect(l4!.kirim).toBe(`verifikasi: gagal ${GAGAL_A} (tingkat belum)\noutbox verifikasi: mati ${PEKERJAAN_A} (${PERCOBAAN} percobaan)`);
    expect(l5!.kirim).toBe(`${kata(PEKERJAAN_C)} pekerjaan, 4xx dihitung sukses:\nditolak 403, per alamat sumber: {'host baru': ${TOLAK_C}}\nverifikasi: gagal ${GAGAL_C}; outbox: mati ${PEKERJAAN_C} (${PERCOBAAN} percobaan)\n# breaker tidak pernah terbuka`);
    expect(l6!.kirim).toBe(`${kata(PEKERJAAN_C)} pekerjaan, 4xx dihitung gagal:\nditolak 403, per alamat sumber: {'host baru': ${TOLAK_BAWAAN}}\nverifikasi: diajukan ${DIAJUKAN_BAWAAN}, gagal ${GAGAL_BAWAAN}; outbox: menunggu ${MENUNGGU_BAWAAN}, mati ${MATI_BAWAAN}\nlog breaker: closed -> open`);
    expect(l7!.kirim).toBe(`daftar alamat di vendor: host baru\nverifikasi: lulus ${LULUS_AKHIR}, gagal ${GAGAL_AKHIR}\nlog breaker: open -> half-open, half-open -> closed`);
    expect(logBreaker).toContain("closed -> open");
    expect(logBreaker).toContain("open -> half-open, breaker verifikasi: half-open -> closed");
    const [v1, v2, v3, v4] = skenario.varian.langkah;
    expect(v1!.kirim).toBe(["daftar alamat di vendor: proxy keluar", `diterima, per alamat sumber yang dilihat vendor: {'proxy keluar': ${LULUS_B_SEBELUM}}`, "ditolak 403, per alamat sumber: (tidak ada)", `verifikasi: lulus ${LULUS_B_SEBELUM}`].join("\n"));
    expect(v2!.kirim).toBe(T.baris[bBeda - 1]);
    expect(v3!.kirim).toBe([`verifikasi: lulus ${LULUS_B}`, `diterima, per alamat sumber yang dilihat vendor: {'proxy keluar': ${TERIMA_B}}`, "ditolak 403, per alamat sumber: (tidak ada)"].join("\n"));
    expect(v4!.kirim).toContain("# NAT dengan IP tetap di cloud: Tidak dijalankan");
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["host", "vnd"], ["host", ""], ["host", "vnd"], ["host", ""], ["brk", ""], ["brk", "vnd"], ["vnd", "host"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["host", "prx"], ["host", ""], ["prx", "vnd"], ["prx", ""]]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["", "", "warn", "warn", "warn", "", "good"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "")).toEqual(["", "", "good", ""]);
  });
  test("teks langkah (judul dan jelas) dari angka rekaman: lima percobaan, 15 penolakan, 40 percobaan, ambang 6, Timeout breaker 3 detik; tanpa klaim di luar rekaman", () => {
    const [, , l3, l4, l5, l6, l7] = skenario.langkah;
    expect(l3!.jelas).toBe(`${Kata(PEKERJAAN_A)} pekerjaan dikali ${kata(PERCOBAAN)} percobaan menghasilkan ${TOLAK_A} penolakan. Vendor menjawab setiap permintaan, jadi penyebabnya alamat sumber, bukan vendor yang mati.`);
    expect(l4!.jelas).toBe(`Worker mengulang jawaban 403 sampai batas lima percobaan (ADR 25). Status ketiga pengajuan menjadi gagal.`);
    expect(l5!.jelas).toBe(`403 adalah jawaban 4xx, dan aturan ADR 36 menghitungnya sukses. ${Kata(PEKERJAAN_C)} pekerjaan dikali ${kata(PERCOBAAN)} percobaan menghabiskan ${TOLAK_C} percobaan.`);
    expect(l6!.jelas).toBe(`${Kata(MENUNGGU_BAWAAN)} pekerjaan menunggu dan vendor tidak dihubungi lagi. Satu pekerjaan sudah mati, karena ambang breaker 6 lebih tinggi daripada batas lima percobaan.`);
    expect(l7!.jelas).toBe(`Sesudah Timeout breaker (${TIMEOUT_BREAKER} detik di lab) satu permintaan percobaan lulus, dan breaker menutup. ${Kata(LULUS_AKHIR)} dari ${kata(PEKERJAAN_C)} pekerjaan lulus. Pekerjaan yang sudah mati tetap gagal, karena tidak ada yang mengantrekannya ulang.`);
    expect(cBawaanA).toContain("tidak dihubungi lagi");
    expect(skenario.langkah[0]!.jelas).toBe(`Vendor menerima alamat host lama karena sudah didaftarkan. ${Kata(LULUS_A)} pekerjaan lulus dengan satu percobaan tiap pekerjaan.`);
    expect(skenario.langkah[1]!.jelas).toContain("Tidak ada yang mendaftarkan alamat host baru di vendor.");
    expect(skenario.sumber.catatan).toContain("Alamat host adalah alamat container Docker di satu jaringan lab, bukan alamat akun cloud.");
    expect(skenario.sumber.catatan).toContain(`Lab t4-infra, PostgreSQL ${cocok(alamat, /# PostgreSQL (\d+\.\d+) /)[1]}, dari database bersih`);
    expect(skenario.sumber.catatan).toContain("dua hari kerja di cerita adalah Asumsi");
    expect(barisM34).toContain("dua hari kerja (Asumsi)");
  });
  test("skenario dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman dengan angka dari rekaman", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m34");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m34-1", "t4-m34-2", "t4-m34-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m34-verifikasi-ditolak/" && k.judul === "4.16 M34: Semua verifikasi ditolak sesudah pindah hosting")).toBe(true);
    expect(kartu[0]!.jawab).toContain(`${Kata(PEKERJAAN_C)} pekerjaan menghabiskan ${PEKERJAAN_C} × ${PERCOBAAN} = ${TOLAK_C} penolakan dan ${kata(GAGAL_C)} pengajuan berstatus \`gagal\``);
    expect(kartu[1]!.jawab).toContain(`ia meluluskan ${kata(LAMA_A)} pendaftar dari host lama`);
    expect(kartu[2]!.jawab).toContain(`${Kata(MENUNGGU_BAWAAN)} pekerjaan menunggu, bukan mati, dan ${kata(LULUS_AKHIR)} dari ${kata(PEKERJAAN_C)} lulus sesudah alamat didaftarkan`);
    expect(kartu[2]!.jawab).toContain("ambang 6 lebih tinggi daripada batas lima percobaan");
    expect(kartu[2]!.tanya).toBe(`Breaker bawaan pustaka terbuka sesudah ${kata(TOLAK_BAWAAN)} penolakan. Apa yang ia ubah dan apa yang tidak?`);
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const butir = [...cek.matchAll(/\*\*(\d+)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(butir.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(kartu.map((k) => k.tanya)).toEqual(butir.map((m) => m[2]));
    expect(kartu.map((k) => k.jawab)).toEqual(butir.map((m) => m[3]));
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: empat tautan; penutup tanpa klaim baru; akhir halaman memuat SkripLama", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]]+)\]\]/gm)].map((m) => m[1])).toEqual(["t4-infra-secret", "t4-breaker", "t4-tim-infra", "t3-tls-pinning"]);
    harus("- [[t4-infra-secret]]: alamat keluar tetap, secret manager, dan IaC tanpa nilai secret di state. Keputusannya ADR 39.");
    harus("- [[t4-breaker]]: penilaian 401 dan 403 di breaker, yang belum diputuskan.");
    harus("- [[t4-tim-infra]]: pemindaian kunci produksi di pipeline. Keputusannya ADR 44.");
    harus("- [[t3-tls-pinning]]: pin ADR 31, yang dibaca ulang sebelum pindah.");
    harus("Di M34 breaker sudah ada dan tidak menyelesaikan masalah. Yang diperlukan sebelum pindah adalah alamat keluar yang tidak berubah atau sudah didaftarkan lebih dulu.");
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "Raka", "Nadia", "Laras", "Senin", "pertama", "kedua", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "naik", "turun", "gagal", "lulus", "ditolak", "403", "4xx", "sukses", "terbuka", "menunggu", "mati", "401", "408", "429", "ADR 31", "ADR 36", "ADR 25", "ADR 39", "ADR 44", "state", "secret", "proxy", "allowlist", "alamat", "host", "vendor", "breaker", "bawaan", "pindahan", "lab"];
const profil = (teks: string): string =>
  PENENTU.map((k) => {
    const n = (teks.match(new RegExp(`(?<![\\p{L}-])${k}(?![\\p{L}-])`, "gu")) ?? []).length;
    return n ? `${k}:${n}` : "";
  }).filter(Boolean).join(" ");
const daun = (o: unknown, jalur = ""): [string, string | number | boolean][] => {
  if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") return [[jalur, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
  return [];
};

describe("nilai terkunci terpisah dari kalimat: baris riset, daun diagram dan skenario, dan profil kata penentu per baris", () => {
  test("tiga baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(["R4-185", "R4-186", "R4-187"].map(barisRiset)).toEqual(RISET_TERKUNCI);
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
