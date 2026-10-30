// Penjaga halaman 4.26 (keputusan 1366 sampai 1368): angka, nama, ID, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim negatif berlingkup, Hitungan, diagram Rantai, widget pilah, tabel ADR 44, dan baris riset di tim-infra.mdx diturunkan
// dari rekaman labs/t4-pipeline dan labs/api-t4 (kontrak.txt, klien.txt, sast.txt, sbom.txt, tanda-tangan.txt, testing.txt),
// kode lab (gerbang.py, tes_gerbang.py, kontrak_test.go), README lab, halaman tetangga, naskah Tahap 4, registry, dan baris
// riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.22): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci
// tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, diagram, widget, blok kode, baris riset)
// dikunci dengan sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import intiMentah from "../../data/diagram/t4-tim-infra-inti.json";
import pipelineMentah from "../../data/diagram/t4-tim-infra-pipeline.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK } from "./tim-infra-t4.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/tim-infra.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const pilahMentah = baca("situs/lama/widgets/data/t4-tim-infra-pilah.json");
const pilah = JSON.parse(pilahMentah) as { judul: string; kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[]; penutup: string };
const inti = DataRantai.parse(intiMentah);
const pipeline = DataRantai.parse(pipelineMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const kontrakApi = baca("labs/api-t4/output/kontrak.txt");
const testingApi = baca("labs/api-t4/output/testing.txt");
const kontrakTesGo = baca("labs/api-t4/internal/handler/kontrak_test.go");
const kontrak = baca("labs/t4-pipeline/output/kontrak.txt");
const klien = baca("labs/t4-pipeline/output/klien.txt");
const sast = baca("labs/t4-pipeline/output/sast.txt");
const sbom = baca("labs/t4-pipeline/output/sbom.txt");
const tanda = baca("labs/t4-pipeline/output/tanda-tangan.txt");
const readme = baca("labs/t4-pipeline/README.md");
const gerbang = baca("labs/t4-pipeline/gerbang.py");
const tesGerbang = baca("labs/t4-pipeline/tes_gerbang.py");
const staging = baca("labs/t4-infra/output/staging.txt");
const breaker = baca("labs/t4-integrasi/output/breaker.txt");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const hal412 = baca("situs/src/content/docs/tahap-4/m32-rilis-kamis.mdx");
const hal413 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const hal416 = baca("situs/src/content/docs/tahap-4/m34-verifikasi-ditolak.mdx");
const hal417 = baca("situs/src/content/docs/tahap-4/secret-iac-alamat-keluar.mdx");
const hal421 = baca("situs/src/content/docs/tahap-4/ssrf.mdx");
const hal140 = baca("situs/src/content/docs/tahap-1/sengaja-belum.mdx");
const hal327 = baca("situs/src/content/docs/tahap-3/tim-infra.mdx");

interface H { bagian?: number; label?: string; id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; path?: string; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
/** Sel tabel Markdown pertama sesudah penanda, tanpa baris pemisah. */
const tabelSetelah = (penanda: string): string[][] => {
  const i = badan.indexOf(penanda);
  expect(i, `penanda tabel tidak ada: ${penanda}`).toBeGreaterThanOrEqual(0);
  const baris = badan.slice(i).split("\n");
  const mulai = baris.findIndex((b) => b.startsWith("|"));
  const hasil: string[][] = [];
  for (let k = mulai; k < baris.length && baris[k]!.startsWith("|"); k++) hasil.push(baris[k]!.split("|").slice(1, -1).map((c) => c.trim()));
  return hasil.filter((r) => !/^[-: ]+$/.test(r[0]!));
};

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// ---- rekaman: nomor baris Snippet --------------------------------------------------------------------------------------
const G = bagian(gerbang), T = bagian(tesGerbang), KA = bagian(kontrakApi), KP = bagian(kontrak), SA = bagian(sast), SB = bagian(sbom), TT = bagian(tanda), KL = bagian(klien);
const gA = G.nomor((b) => b.startsWith("ATURAN_LANGKAH = ["));
const gB = G.nomor((b) => b === "    return sorted(langkah)", gA);
const tA = T.nomor((b) => b.includes("def test_kode_bersama_di_luar_modul_belum_dipetakan"));
const tB = T.nomor((b) => b.includes('g.langkah_untuk(["labs/api-t4/internal/service/bayar.go"'), tA);
const kaA = KA.nomor((b) => b.startsWith("$ oasdiff breaking ../api-t3/openapi.yaml"));
const kaB = KA.nomor((b) => b.startsWith("\t\tThe server may now return"), kaA);
const kpBA = KP.nomor((b) => b === "$ oasdiff breaking sebelum.yaml field-opsional-hapus.yaml --fail-on WARN");
const kpBB = KP.nomor((b) => b === "(exit code 0)", KP.nomor((b) => b.includes("removed the optional property `nomor_karyawan`"), kpBA));
const kpWA = KP.nomor((b) => b.startsWith("# Varian wajib:"));
const kpWB = KP.nomor((b) => b.startsWith("operasi, bawaan"), kpWA);
const kpEA = KP.nomor((b) => b.startsWith("# Varian explode"));
const kpEB = KP.nomor((b) => b.startsWith("operasi, bawaan"), kpEA);
const saBA = SA.nomor((b) => b.startsWith("# --- B."));
const saBB = SA.nomor((b) => b.startsWith("gerbang gosec: GAGAL (pemindaian tidak lengkap"), saBA);
const saEA = SA.nomor((b) => b.startsWith("# --- E."));
const saEB = SA.nomor((b) => b.startsWith("gerbang govulncheck atas api-t4: GAGAL"), saEA);
const sbBA = SB.nomor((b) => b.startsWith("$ syft dir:. -o cyclonedx-json   # folder kosong"));
const sbBB = SB.nomor((b) => b.startsWith("gerbang SBOM dan grype: GAGAL (SBOM tidak memuat"), sbBA);
const ttC = TT.nomor((b) => b.startsWith("# --- C."));
const ttCA = TT.nomor((b) => b.startsWith("$ cosign verify") && b.includes("api-t4-ci:2.0"), ttC);
const ttCB = TT.nomor((b) => b.startsWith("gerbang image (dibangun <digest C>): GAGAL (digest di referensi"), ttCA);
const klA = KL.nomor((b) => b.startsWith("# --- C."));
const klB = KL.nomor((b) => b.startsWith("static AkunJenisEnum? fromJson"), klA);

// ---- nilai dari rekaman ------------------------------------------------------------------------------------------------
const ENUM_BARU = [...kontrakApi.matchAll(/added the new `(\w+)` enum value to the `jenis` response property/g)].map((m) => m[1]!);
const API_RINGKAS = cocok(kontrakApi, /\n(\d+) changes: (\d+) error, (\d+) warning, (\d+) info/);
const bagKA = KP.teks(KP.nomor((b) => b.startsWith("# Ringkasan gerbang kontrak")), KP.nomor((b) => b.startsWith("# --- B.")) - 1);
const VARIAN = [...bagKA.matchAll(/^(\S+)\s+(GAGAL|LULUS)\s+\((\d+) temuan ERR\)$/gm)].map((m) => [m[1]!, m[2]!, Number(m[3])] as [string, string, number]);
const KLIEN_BERKAS = Number(cocok(klien, /Client hasilnya: (\d+) berkas di package api_client/)[1]);
const bagKB = KL.teks(KL.nomor((b) => b.startsWith("# --- B.")), klA - 1);
const bagKC = KL.teks(klA, KL.baris.length);
const KLIEN_B_BERKAS = [...bagKB.matchAll(/^berbeda: /gm)].length;
const KLIEN_B_HILANG = bagKB.split("\n").filter((b) => b.startsWith("-") && !b.startsWith("---")).length;
const KLIEN_C_BERKAS = [...bagKC.matchAll(/^berbeda: /gm)].length;
const KLIEN_C_TAMBAH = bagKC.split("\n").filter((b) => b.startsWith("+") && !b.startsWith("+++")).length;
const PANGGIL = [...sast.slice(sast.indexOf("# --- E.")).matchAll(/^  (GO-\d{4}-\d+) stdlib /gm)].map((m) => m[1]!);
const sbomC = sbom.slice(sbom.indexOf("# --- C."));
const TEMUAN = [...sbomC.matchAll(/^  (\S+)\s+(Critical|High|Medium|Unknown)\s+(stdlib|golang\.org\/x\/crypto) /gm)].map((m) => [m[1]!, m[2]!, m[3]!] as [string, string, string]);
const per = (n: string) => TEMUAN.filter((t) => t[1] === n).length;
const STDLIB = TEMUAN.filter((t) => t[2] === "stdlib").map((t) => t[0]);
const TIDAK_DIPANGGIL = STDLIB.filter((i) => !PANGGIL.includes(i));
const MODUL_GOMOD = [...sbomC.matchAll(/^  go\.mod \S+ \S+: ada di SBOM$/gm)].length;
const SBOM_MODUL = cocok(sbomC, /CycloneDX 1\.7; (\d+) modul Go dari biner \(stdlib termasuk\), (\d+) paket Debian dari image dasar/);
const TINGGI = Number(cocok(sbomC, /ambang High\): GAGAL \((\d+) temuan High atau lebih\)/)[1]);
const KRITIS = Number(cocok(sbomC, /ambang Critical: GAGAL \((\d+) temuan Critical atau lebih\)/)[1]);
const tahap = (a: string, b: string): string => TT.teks(TT.nomor((x) => x.startsWith(a)), TT.nomor((x) => x.startsWith(b)) - 1);
const ttA = tahap("# --- A.", "# --- B."), ttB = tahap("# --- B.", "# --- C."), ttC2 = tahap("# --- C.", "# --- D."), ttD = TT.teks(TT.nomor((x) => x.startsWith("# --- D.")), TT.baris.length);
const OK_A = [...testingApi.slice(testingApi.indexOf("# --- A."), testingApi.indexOf("# --- B.")).matchAll(/^ok\s/gm)].length;
const OK_B = [...testingApi.slice(testingApi.indexOf("# --- B."), testingApi.indexOf("# --- C.")).matchAll(/^ok\s/gm)].length;
const sorotan = (teks: string, re: RegExp) => [...teks.matchAll(re)].map((m) => m[1]!);

// ---- naskah ------------------------------------------------------------------------------------------------------------
const barisAdr44 = naskah.split("\n").find((b) => b.startsWith("| 44 |"))!;
const barisM32 = naskah.split("\n").find((b) => b.startsWith("| M32 |"))!;
const barisM34 = naskah.split("\n").find((b) => b.startsWith("| M34 |"))!;
const NASKAH_TIM = [...naskah.matchAll(/\*\*Tim (Pembayaran|Merchant|Platform)\*\* \((\d+) orang, dipimpin (\w+)\)/g)].map((m) => [m[1]!, Number(m[2]), m[3]!] as [string, number, string]);
const TIM = Object.fromEntries(NASKAH_TIM.map(([n, o]) => [n, o])) as Record<string, number>;
const DEVELOPER = NASKAH_TIM.reduce((a, [, o]) => a + o, 0);
const AKTIF = 20000;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.26 ada, tim-infra, jalur inti, ADR 44, prasyarat 4.13 dan 3.27, lab api-t4 dan t4-pipeline, tiga peran; judul sama dengan peta naskah", () => {
    expect(dari("t4-tim-infra")).toMatchObject({ ada: true, nomor: "4.26", jenis: "tim-infra", bagian: 4, inti: true, prasyarat: ["t4-modul", "t3-tim-infra"], lab: ["api-t4", "t4-pipeline"], tahap: 4, peran: ["mobile", "devops", "backend"], adr: [44] });
    expect(dari("t4-modul").nomor).toBe("4.13");
    expect(dari("t3-tim-infra").nomor).toBe("3.27");
    expect(frontmatter).toContain(`title: "4.26 ${dari("t4-tim-infra").judul}"`);
    expect(dari("t4-tim-infra").judul).toBe("Tim dan infra Tahap 4: pipeline per modul, supply chain, rilis bertahap + ADR 44");
    expect(naskah).toContain("| 4.26 | 4 | Tim dan infra Tahap 4: pipeline per modul, supply chain, rilis bertahap + ADR 44 | Tim dan infra | ★ | api-t4, t4-pipeline | pilah |");
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-modul\]\], \[\[t3-tim-infra\]\] · Jalur inti<\/p>/);
    expect(dari("t4-tim-infra").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat tim-infra: dua pertama terbuka; dua Rantai, satu pilah, sepuluh Snippet, satu blok kode; impor tetap", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("tim-infra", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan.match(/<Rantai /g)).toHaveLength(2);
    expect(badan.match(/<Rantai data=\{intiDiagram\} ringkas \/>/g)).toHaveLength(1);
    expect(badan.match(/<Rantai data=\{pipelineDiagram\} \/>/g)).toHaveLength(1);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(10);
    expect(badan.match(/^```/gm)).toHaveLength(2);
    expect([...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro",
      "intiDiagram ../../../../data/diagram/t4-tim-infra-inti.json", "pipelineDiagram ../../../../data/diagram/t4-tim-infra-pipeline.json",
      "pilah ../../../../lama/widgets/data/t4-tim-infra-pilah.json",
    ]);
    harus('<WidgetLama nama="pilah" src="data/t4-tim-infra-pilah.json" />');
    harus('<SkripLama daftar={["pilah"]} />');
    harus("<noscript>");
    harus("{pilah.item.map((it) => (");
    harus("<li><strong>{pilah.kelompok[it.jawab]}.</strong> {it.teks} {it.kenapa}</li>");
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["E1", "berikutnya", "t1-adr-12", "t1-secret", "t2-skema-tanpa-downtime", "t3-tim-infra", "t4-adr-45", "t4-breaker", "t4-infra-secret", "t4-m32", "t4-m34", "t4-modul", "t4-prd", "t4-rekonsiliasi", "t4-ssrf"]);
    const sesuai: [string, string, string][] = [
      ["E1", "1.33", "App versi lama"], ["t1-adr-12", "1.40", "Sengaja belum dilakukan"], ["t1-secret", "1.35", "Secret di repo dan di server"],
      ["t2-skema-tanpa-downtime", "2.22", "Ubah skema tanpa downtime"], ["t3-tim-infra", "3.27", "Tim dan infra Tahap 3"], ["t4-adr-45", "4.29", "ADR 45"],
      ["t4-breaker", "4.11", "Timeout, retry"], ["t4-infra-secret", "4.17", "Secret manager, IaC"], ["t4-m32", "4.12", "M32"], ["t4-m34", "4.16", "M34"],
      ["t4-modul", "4.13", "Modular monolith"], ["t4-prd", "4.1", "PRD v4"], ["t4-rekonsiliasi", "4.9", "Rekonsiliasi dengan gateway"], ["t4-ssrf", "4.21", "Keamanan 8"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (idh.startsWith("t4-")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    harus("([Label sumber](/cara-pakai/#label-sumber))");
    expect(cara).toContain("Label sumber");
    for (const h of ["t4-adr-45", "t4-breaker", "t4-infra-secret", "t4-m32", "t4-m34", "t4-modul", "t4-prd", "t4-rekonsiliasi", "t4-ssrf", "t1-adr-12", "t1-secret", "E1", "t2-skema-tanpa-downtime", "t3-tim-infra"]) {
      if (h !== "t4-adr-45") expect(dari(h).ada, h).toBe(true);
    }
  });
  test("janji halaman lain ke 4.26 ditepati: 4.1, 4.12, 4.13, 4.16, 4.17, dan 4.21 menyebut t4-tim-infra; ADR 12 menjadwalkan tes kontrak di Tahap 4", () => {
    expect(hal41).toContain("sedangkan tes contract dikerjakan [[t4-tim-infra]]");
    expect(hal412).toContain("- [[t4-tim-infra]]: pipeline per modul dan pemeriksaan sebelum rilis. Keputusannya ADR 44.");
    expect(hal413).toContain("[[t4-tim-infra]] menambah pipeline per modul dan tes contract");
    expect(hal413).toContain("| Pemeriksa ADR wajib dan review CODEOWNERS di CI | Fitur GitHub, Tidak dijalankan. Plan pemilik [perlu verifikasi] | [[t4-tim-infra]] |");
    expect(hal416).toContain("- [[t4-tim-infra]]: pemindaian kunci produksi di pipeline. Keputusannya ADR 44.");
    expect(hal417).toContain("Menjalankannya atas seluruh konfigurasi staging dan state IaC adalah pekerjaan pipeline di [[t4-tim-infra]].");
    expect(hal417).toContain("| Pemindai atas seluruh konfigurasi, state IaC, dan riwayat git | Rekaman hanya dua file contoh | [[t4-tim-infra]] |");
    expect(hal421).toContain("[[t4-tim-infra]] memasang govulncheck dan grype di pipeline tiap merge per modul (ADR 44).");
    expect(hal140).toContain("| Tes yang mencocokkan response dengan kontrak OpenAPI di CI | Rekaman lab masih dibaca manusia ([[B1.4]]) | Tahap 4 |");
    harus("ADR 12 menunda satu hal sampai Tahap 4: tes yang mencocokkan kontrak OpenAPI di CI ([[t1-adr-12]]).");
    harus("Halaman [[t4-m34]], [[t4-infra-secret]], dan [[t4-ssrf]] menjanjikan pemindai kunci produksi dan pindai kerentanan di pipeline halaman ini.");
    expect(staging).toContain("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik staging.env penerbit.env");
    expect(staging.slice(staging.indexOf("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik staging.env penerbit.env"))).toMatch(/staging\.env:2: kunci produksi \(awalan\)\npenerbit\.env:1: kunci produksi \(sidik\)\n# exit status 1/);
    harus("Gitleaks dari ADR 11 ([[t1-secret]]) tetap menjaga riwayat git.");
  });
  test("ADR yang disebut: hanya 10, 11, 12, dan 44; halaman tidak membuka isi 4.27 sampai 4.31", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 10", "ADR 11", "ADR 12", "ADR 44"]);
    expect(badan).not.toMatch(/PRD v5|read replica|Kubernetes|service mesh|Kafka/);
  });
});

describe("naskah: ADR 44, tim, beban, dan isi halaman Tim dan infra", () => {
  test("baris ADR 44 di naskah memuat pemeriksaan, tiga opsi, dan batas yang ditulis halaman", () => {
    for (const k of ["lint dan tes modul", "tes contract OpenAPI dengan oasdiff `breaking`", "SAST (gosec, govulncheck)", "SBOM CycloneDX dengan syft dan pindai grype", "image ditandatangani cosign per digest", "Deploy produksi blue/green dengan dua instance", "Rilis app bertahap", "Security review Laras lolos sebelum dibuka ke publik", "Tes contract OpenAPI di CI adalah baris \"Tahap 4\" di tabel \"Yang juga sengaja belum\" ADR 12, jadi ADR ini merevisinya", "Pipeline Tahap 3 saja; semua pemeriksaan di setiap PR untuk seluruh repo (lambat, tim cenderung menghindarinya, Asumsi); per modul (dipilih)", "oasdiff belum memeriksa parameter tingkat path dan style atau explode", "Tanda tangan di tag tidak berarti: tanda tangani digest", "Bila pipeline lebih dari 10 menit per PR (Asumsi), tim mulai melewatinya", "Pemetaan file ke langkah hanya menjalankan pipeline untuk `internal/modul/<nama>/`; untuk kode bersama di luarnya ADR ini perlu menulis aturan \"jalankan semua\""]) {
      expect(barisAdr44, k).toContain(k);
    }
    harus("Menurut dokumentasi GitHub, workflow yang dilewati");
    harus("Merevisi ADR 12 pada baris tes contract OpenAPI di CI.");
    harus("| | A. Pipeline Tahap 3 saja | B. Semua pemeriksaan di setiap PR untuk seluruh repo | C. Per modul |");
    harus("Lambat, dan tim cenderung menghindarinya (Asumsi naskah)");
    harus("Saat satu PR menunggu pipeline lebih dari 10 menit (Asumsi naskah).");
  });
  test("tim: tiga tim bernama dengan 5, 4, dan 4 orang, total 13; Raka memegang paket inti app; 12 minggu; M32 dan M34", () => {
    expect(NASKAH_TIM).toEqual([["Pembayaran", 5, "Nadia"], ["Merchant", 4, "Wulan"], ["Platform", 4, "Bayu"]]);
    expect(DEVELOPER).toBe(13);
    expect(naskah).toContain("Tim tumbuh dari 4 menjadi 13 orang dalam tiga tim selama 12 minggu (Asumsi cerita)");
    expect(naskah).toContain("Raka memegang paket inti app di dalamnya");
    harus(`Tahap 4 dikerjakan ${DEVELOPER} developer dalam tiga tim selama 12 minggu (Asumsi cerita): Pembayaran ${TIM.Pembayaran} orang, Merchant ${TIM.Merchant}, dan Platform ${TIM.Platform}. Jumlahnya ${TIM.Pembayaran} + ${TIM.Merchant} + ${TIM.Platform} = ${DEVELOPER}.`);
    harus("| Pemeriksaan merge untuk gateway, top-up, rekonsiliasi, dan kartu | Tim Pembayaran, dipimpin Nadia | [[t4-modul]] |");
    harus("| Pemeriksaan merge untuk merchant luar, QR, katalog, dan dasbor | Tim Merchant, dipimpin Wulan | [[t4-modul]] |");
    harus("| Akun, identitas, outbox, infrastruktur, dan keamanan | Tim Platform, dipimpin Bayu | [[t4-modul]] |");
    harus("| Paket inti app | Raka, di dalam tim Platform | naskah Tahap 4 |");
    expect(naskah).toContain("memegang gateway, top-up, rekonsiliasi, dan kartu");
    expect(naskah).toContain("memegang merchant luar, QR, katalog, dan dasbor web");
    expect(naskah).toContain("memegang akun, identitas, outbox, infrastruktur, dan keamanan");
    expect(barisM32).toMatch(/^\| M32 \| 6 \|/);
    expect(barisM34).toMatch(/^\| M34 \| 8 \|/);
    expect(barisM32).toContain("tes pembayaran memakai data tiruan, bukan skema tim lain");
    expect(barisM34).toContain("staging memakai kunci API gateway produksi (Ilustrasi");
    expect(naskah).toContain("Menandai hampir semua temuan sebagai kritis");
    harus("Naskah menulis bahwa Laras cenderung menandai hampir semua temuan sebagai kritis.");
    harus("Di [[t4-m32]], rilis tim Merchant memecahkan top-up karena tes tiap tim memakai data tiruan.");
    harus("Di [[t4-m34]], pindahan hosting membawa kunci gateway produksi ke staging (Ilustrasi).");
  });
  test("isi halaman Tim dan infra di naskah: rotasi mingguan per tim, lima gejala, security review, rilis bertahap, Testcontainers dan k6 Tidak dijalankan", () => {
    for (const k of [
      "Backend: merge per modul menjalankan pemeriksaan ADR 44.", "Testcontainers dan k6 Tidak dijalankan seperti di Tahap 3",
      "pola ala gitignore, dan pola terakhir yang cocok menang", "repositori privat butuh plan berbayar (R4-04, [perlu verifikasi: plan pemilik])",
      "`api_client` dibuat ulang dari OpenAPI dan diff-nya diperiksa. Paket app dibagi per tim (pub workspaces atau melos).", "di Android hanya untuk update, di iOS 7 hari dari 1% sampai 100% (R4-22)",
      "temuan tanpa bukti ditulis \"dugaan\" dan tidak memblok rilis", "rotasi mingguan per tim untuk modulnya. Alert hanya untuk gejala yang dirasakan user.",
      "umur notifikasi uang tertua per kelas, error rate, p95, selisih rekonsiliasi harian, dan breaker yang terbuka lebih dari 10 menit (Asumsi)",
      "integrasi, data dan kunci, infrastruktur, operasional",
    ]) expect(naskah, k).toContain(k);
    harus("Naskah menulis lima gejala: umur notifikasi uang tertua per kelas, error rate, p95, selisih rekonsiliasi harian, dan breaker yang terbuka lebih dari 10 menit.");
    harus("Threat model di naskah punya empat lapisan: integrasi, data dan kunci, infrastruktur, dan operasional.");
    harus("Testcontainers dan k6 Tidak dijalankan. api-t4 memakai Docker Compose seperti Tahap 3, dan `make beban` memakai generator Go sendiri.");
    expect(baca("labs/api-t4/README.md")).toContain("Testcontainers dan k6 Tidak dijalankan (Compose, seperti Tahap 3); `make beban` memakai generator Go sendiri.");
    expect(hal327).toContain("30 detik");
    harus("Hanya ambang 30 detik untuk umur notifikasi uang punya dasar di PRD v3 ([[t3-tim-infra]]).");
  });
});

describe("rekaman kontrak: api-t4 dan t4-pipeline", () => {
  test("api-t4 kontrak.txt: tiga error enum respons jenis di GET /akun/{id}, exit code 1; versi oasdiff tidak tertulis, hanya digest image", () => {
    expect(ENUM_BARU).toEqual(["merchant", "pemakai", "risk"]);
    expect([API_RINGKAS[1], API_RINGKAS[2], API_RINGKAS[3], API_RINGKAS[4]]).toEqual(["3", "3", "0", "0"]);
    expect(kontrakApi.trimEnd().endsWith("(exit code 1)")).toBe(true);
    expect(kontrakApi).toContain("in API GET /akun/{id}");
    expect(kontrakApi).toContain("declare it with x-extensible-enum");
    expect(baca("labs/api-t4/kontrak.sh")).toContain('OASDIFF="tufin/oasdiff@sha256:');
    expect(baca("labs/api-t4/kontrak.sh")).not.toMatch(/oasdiff:v?\d|oasdiff@v?\d|oasdiff version/);
    harus(`Ia melapor tiga error: nilai \`${ENUM_BARU[0]}\`, \`${ENUM_BARU[1]}\`, dan \`${ENUM_BARU[2]}\` ditambah ke enum \`jenis\` di respons \`GET /akun/{id}\`. Gerbang berakhir dengan exit code 1.`);
    harus("Rekaman `kontrak.txt` di api-t4 memakai image oasdiff yang dikunci dengan digest, dan versinya tidak tertulis di skrip.");
    harus("Pesan oasdiff menyebut jalan keluarnya: nilai yang memang akan bertambah dideklarasikan dengan `x-extensible-enum`.");
    expect(inti.baris[0]!.simpul.map((s) => s.teks)).toEqual(["enum ditambah", `oasdiff: ${API_RINGKAS[2]} error`, "gerbang gagal"]);
    expect(inti.baris[0]!.simpul[0]!.sub).toBe(`jenis: ${ENUM_BARU.join(", ")}`);
  });
  test("t4-pipeline kontrak.txt A: enam varian, tiga gagal dan tiga lulus; tabel di halaman sama baris demi baris; field opsional INFO di bagian B", () => {
    expect(VARIAN).toEqual([
      ["enum-respons-tambah", "GAGAL", 1], ["enum-request-hapus", "GAGAL", 1], ["field-wajib-hapus", "GAGAL", 1],
      ["enum-request-tambah", "LULUS", 0], ["enum-respons-hapus", "LULUS", 0], ["field-opsional-hapus", "LULUS", 0],
    ]);
    const label: Record<string, string> = {
      "enum-respons-tambah": "Nilai enum ditambah di respons", "enum-request-hapus": "Nilai enum dikurangi di request", "field-wajib-hapus": "Field wajib dihapus dari respons",
      "enum-request-tambah": "Nilai enum ditambah di request", "enum-respons-hapus": "Nilai enum dikurangi di respons", "field-opsional-hapus": "Field opsional dihapus dari respons",
    };
    const bagB = KP.teks(KP.nomor((b) => b.startsWith("# --- B.")), KP.nomor((b) => b.startsWith("# --- C.")) - 1);
    expect(bagB).toContain("info\t[response-optional-property-removed] at field-opsional-hapus.yaml");
    const tabel = tabelSetelah("Lab t4-pipeline mengulang pola itu");
    expect(tabel[0]).toEqual(["Perubahan atas kontrak", "Hasil `breaking`"]);
    expect(tabel.slice(1)).toEqual(VARIAN.map(([n, h]) => [label[n]!, h === "GAGAL" ? "gagal (ERR)" : n === "field-opsional-hapus" ? "lulus (INFO)" : "lulus"]));
    expect(bagB).toContain("# `breaking` hanya memuat ERR dan WARN; field opsional yang dihapus berstatus INFO.");
    expect(bagB).toContain("response-optional-property-removed err\n$ oasdiff breaking sebelum.yaml field-opsional-hapus.yaml --severity-levels tingkat.txt --fail-on ERR\n1 changes: 1 error, 0 warning, 0 info");
    harus("File `--severity-levels` yang berisi satu baris, `response-optional-property-removed err`, menaikkannya menjadi error (bagian B).");
    harus("`breaking` hanya memuat ERR dan WARN, sedangkan field opsional yang dihapus berstatus INFO.");
  });
  test("t4-pipeline kontrak.txt C: parameter tingkat path lolos tanpa --flatten-params; explode tidak tertangkap di tingkat mana pun; kontrak api-t4 tidak memakai keduanya", () => {
    const bagC = KP.teks(KP.nomor((b) => b.startsWith("# --- C.")), KP.baris.length);
    const wajib = KP.teks(kpWA, kpWB);
    expect(wajib).toMatch(/path, bawaan\s+LULUS[^\n]*\npath, --flatten-params\s+GAGAL[^\n]*request-parameter-became-required[^\n]*\noperasi, bawaan\s+GAGAL/);
    expect(KP.teks(kpEA, kpEB)).toMatch(/path, bawaan\s+LULUS[^\n]*\npath, --flatten-params\s+LULUS[^\n]*\noperasi, bawaan\s+LULUS/);
    expect(bagC).toContain("Perubahan style dan explode tidak\n# tertangkap di kedua tingkat, juga dengan --flatten-params.");
    expect(readme).toContain("Kontrak api-t4 tidak memakai parameter tingkat path maupun `explode`");
    const kontrakYaml = baca("labs/api-t4/openapi.yaml");
    expect(kontrakYaml).not.toMatch(/explode:/);
    expect(readme).toContain("Isu #1163 dan #1164 terbukti di oasdiff v1.34.1");
    harus("Isu oasdiff #1163 dan #1164 masih terbuka pada 2026-10-30 (GitHub API). Kontrak api-t4 sendiri tidak memakai parameter tingkat path maupun `explode`.");
    expect(barisRiset("R4-237")).toContain("oasdiff isu #1163 open (diperbarui 2026-10-16) dan #1164 open (diperbarui 2026-08-16); rilis terbaru v1.35.0 (2026-10-28T16:31:43Z)");
    expect(barisRiset("R4-237")).toContain("GitHub API 2026-10-30");
  });
  test("klien.txt: 258 file, kontrak sama identik; field wajib dihapus mengubah 3 file dan 12 baris hilang; enum ditambah 1 file dan 2 baris; kode memakai !", () => {
    expect([KLIEN_BERKAS, KLIEN_B_BERKAS, KLIEN_B_HILANG, KLIEN_C_BERKAS, KLIEN_C_TAMBAH]).toEqual([258, 3, 12, 1, 2]);
    expect(klien).toContain("(tidak ada perbedaan: dua generasi identik, jadi setiap beda di bagian lain berasal dari kontrak)");
    expect(klien).toContain("jenis: AkunJenisEnum.fromJson(json[r'jenis'])!,");
    expect(klien).toContain("Jalannya di Dart Tidak dijalankan.");
    expect(readme).toContain("12 baris hilang dari `akun.dart`");
    harus(`Di \`klien.txt\`, openapi-generator menghasilkan ${KLIEN_BERKAS} file, dan kontrak yang sama menghasilkan client yang identik.`);
    harus(`Menghapus satu field wajib mengubah tiga file, dan ${KLIEN_B_HILANG} baris hilang dari \`akun.dart\`. Menambah satu nilai enum mengubah satu file dengan dua baris tambahan.`);
    harus("Nilai yang tidak dikenal menjadi null, jadi client lama yang menerima `badan` berhenti dengan galat null check. Itu dibaca dari kode hasil generasi, dan Dart Tidak dijalankan.");
    expect(klien).toContain("decode tanpa argumen allowNull memakai bawaan true: nilai tak dikenal menjadi null, bukan galat.");
    expect(klien).toContain("client lama yang menerima `badan` berhenti dengan galat null check");
  });
});

describe("rekaman SAST, SBOM, dan tanda tangan", () => {
  test("sast.txt A, A2, B: G701 hanya bila ada sumber input; -quiet gagal terbuka (keluaran kosong, exit code 0); tanpa -quiet gagal dengan galat pemindaian", () => {
    const bagA = SA.teks(SA.nomor((b) => b.startsWith("# --- A.")), SA.nomor((b) => b.startsWith("# --- A2.")) - 1);
    const bagA2 = SA.teks(SA.nomor((b) => b.startsWith("# --- A2.")), saBA - 1);
    const bagB = SA.teks(saBA, SA.nomor((b) => b.startsWith("# --- C.")) - 1);
    expect(bagA).toContain("G701 HIGH/HIGH CWE-89 temuan.go:16 SQL injection via taint analysis: (*database/sql.DB).Query");
    expect(bagA2).toContain("statistik: 2 berkas, 0 temuan; query yang sama dengan fmt.Sprintf tidak dilaporkan");
    expect(bagB).toMatch(/\$ gosec -fmt=json -quiet \.\/\.\.\.\n\(exit code 0\)\n# Exit code 0 dan keluaran kosong/);
    expect(bagB).toContain("gerbang gosec: GAGAL (pemindaian tidak lengkap (5 galat paket))");
    harus("Di `sast.txt` bagian A ia melapor G701, analisis taint, pada contoh yang disiapkan: `os.Args[1]` mengalir ke `db.Query`. Kasus tandingan di bagian yang sama memakai query itu dengan masukan konstanta, dan hasilnya nol temuan.");
    harus("Jadi G701 melapor aliran dari sumber input, bukan setiap `fmt.Sprintf` ke database.");
    harus("| gosec `-quiet` | kode tidak terkompilasi: keluaran kosong dan exit code 0 | `sast.txt` bagian B |");
    harus("| grype atas SBOM kosong | tidak ada yang dipindai, jadi nol temuan | `sbom.txt` bagian B |");
    harus("| govulncheck `-format json` | exit code selalu 0, berapa pun temuannya | dokumentasi alat, Tidak dijalankan di sini |");
    expect(barisRiset("R4-237")).toContain("exit code 0 untuk '-format json', '-format sarif', atau '-format openvex' 'regardless of the number of detected vulnerabilities'");
    expect(sast).toContain("GO-2022-1059 golang.org/x/text v0.3.7, diperbaiki di v0.3.8: temuan.bahasaPilihan memanggil language.ParseAcceptLanguage");
    expect(sast).toContain("GO-2026-5970 golang.org/x/text v0.3.7, diperbaiki di v0.39.0");
    expect(sbom).toContain("GHSA-69ch-w2m2-3vjp    High      golang.org/x/text v0.3.7, diperbaiki di 0.3.8");
    harus("Atas contoh, govulncheck memanggil satu kerentanan dan grype mencatat tiga advisory untuk `golang.org/x/text` v0.3.7. Dua advisory lain ada di modul itu tetapi tidak dipanggil (`sast.txt` bagian C, `sbom.txt` bagian A).");
  });
  test("sast.txt E dan sbom.txt C: 10 dipanggil, 15 temuan grype (2 Unknown, 2 Critical, 9 High, 2 Medium), 14 stdlib, 4 tidak dipanggil; 13 High ke atas; 12 modul go.mod; 13 modul Go dan 5 paket Debian", () => {
    expect(PANGGIL).toHaveLength(10);
    expect(TEMUAN).toHaveLength(15);
    expect([per("Unknown"), per("Critical"), per("High"), per("Medium")]).toEqual([2, 2, 9, 2]);
    expect(STDLIB).toHaveLength(14);
    expect(TEMUAN.filter((t) => t[2] !== "stdlib").map((t) => `${t[0]} ${t[2]} ${t[1]}`)).toEqual(["GO-2026-5932 golang.org/x/crypto Unknown"]);
    expect(TIDAK_DIPANGGIL.sort()).toEqual(["GO-2026-6599", "GO-2026-6600", "GO-2026-6604", "GO-2026-6609"]);
    expect(PANGGIL).toContain("GO-2026-6612");
    expect(PANGGIL).not.toContain("GO-2026-6604");
    expect(TEMUAN.filter((t) => t[1] === "Critical").map((t) => t[0]).sort()).toEqual(["GO-2026-6604", "GO-2026-6612"]);
    expect([TINGGI, KRITIS]).toEqual([13, 4]);
    expect(TINGGI).toBe(per("Unknown") + per("Critical") + per("High"));
    expect(MODUL_GOMOD).toBe(12);
    expect([Number(SBOM_MODUL[1]), Number(SBOM_MODUL[2])]).toEqual([13, 5]);
    expect(sast).toContain("stdlib v1.27.1, diperbaiki di v1.27.2");
    expect(sast).toContain("GO-2026-6809 stdlib v1.27.1, diperbaiki di v1.27.3");
    expect(sast.split("\n")[1]).toContain("go1.27.1");
    harus(`SBOM image memuat ${SBOM_MODUL[1]} modul Go, stdlib termasuk, dan lima paket Debian dari image dasar. Ke-${MODUL_GOMOD} modul dari \`go.mod\` ada semua di SBOM. grype menemukan ${TEMUAN.length} temuan: dua Critical, sembilan High, dua Medium, dan dua Unknown. Empat belas di antaranya berasal dari stdlib Go 1.27.1, dan satu dari \`golang.org/x/crypto\` v0.57.0 tanpa versi perbaikan.`);
    expect(sbom).toContain("golang.org/x/crypto v0.57.0, diperbaiki di -");
    harus(`Empat belas temuan stdlib dikurangi ${PANGGIL.length} yang dipanggil menyisakan empat yang ada tetapi tidak dipanggil (Hitungan atas dua daftar).`);
    expect(STDLIB.length - PANGGIL.length).toBe(4);
    harus(`govulncheck atas kode yang sama menemukan ${PANGGIL.length} kerentanan stdlib yang dipanggil:`);
    harus(`Ambang High menghasilkan ${TINGGI} temuan High atau lebih, dan govulncheck menemukan ${PANGGIL.length} yang dipanggil.`);
    harus("Perbaikannya tercantum di Go 1.27.2 dan 1.27.3.");
    harus("GO-2026-6612, HTTP/2 di `net/http`, ada di daftar yang dipanggil. GO-2026-6604 tidak.");
    expect(readme).toContain("GO-2026-6612 (CVE-2026-78663, HTTP/2 server di `net/http`; dipanggil kode api-t4 menurut govulncheck)");
    expect(readme).toContain("GO-2026-6604 (CVE-2026-56857; ringkasan advisory menyebut `os.Root.Mkdir` mengikuti junction di Windows; tidak dipanggil)");
    harus("GO-2026-6604 tidak. README lab mencatat ringkasan advisory-nya: `os.Root.Mkdir` mengikuti junction di Windows. grype menandainya Critical karena mencocokkan versi stdlib go1.27.1, sedangkan govulncheck tidak menemukan panggilan ke fungsi itu (`sbom.txt` bagian C, `sast.txt` bagian E).");
    expect(sbomC).toContain("GO-2026-6604           Critical  stdlib go1.27.1, diperbaiki di 1.26.9, 1.27.2");
    expect(baca("labs/api-t4/README.md")).toContain("go1.27.3");
    harus("Lab tidak menaikkan Go, karena itu mengubah api-t4 dan semua rekamannya.");
    expect(readme).toContain("Lab ini tidak menaikkan toolchain (itu mengubah api-t4 dan semua rekamannya)");
  });
  test("sbom.txt B: SBOM kosong lolos grype dengan nol temuan dan ditolak pemeriksaan isi; versi basis data grype dikunci dan tertulis di tiap hasil", () => {
    const bagB = SB.teks(sbBA, sbBB);
    expect(bagB).toContain("CycloneDX 1.7; pustaka: 0; temuan grype: 0");
    expect(bagB).toContain("grype saja (ambang High): LULUS, karena tidak ada yang dipindai");
    expect(bagB).toContain("gerbang SBOM dan grype: GAGAL (SBOM tidak memuat: golang.org/x/text v0.3.7)");
    expect([...sbom.matchAll(/basis data kerentanan: skema v6\.1\.10, dibangun 2026-10-28T06:23:30Z \(dikunci di alat\.json; tidak diperbarui otomatis\)/g)]).toHaveLength(3);
    harus("Pemindai yang menerima SBOM kosong menyisakan satu pemeriksaan yang bisa dijaga: apakah SBOM memuat semua modul dari `go.mod`:");
  });
  test("tanda-tangan.txt: bagian A sampai D; verify atas tag lulus tetapi atas digest D, bukan digest C hasil build; tabel di halaman sama dengan rekaman", () => {
    expect(ttA).toContain("Error: no signatures found\n(exit code 10)");
    expect(ttA).toContain("gerbang image (dibangun <digest A>): GAGAL (referensi bukan digest (tag bisa dipindah))");
    expect(ttB).toContain("$ cosign verify --key kunci-1/cosign.pub --insecure-ignore-tlog=true 127.0.0.1:18295/api-t4:1.0\nError: no signatures found\n(exit code 10)");
    expect(ttB).toContain("gerbang image (dibangun <digest A>): LULUS (tanda tangan sah atas digest yang dibangun)");
    expect(ttB).toContain("gerbang image (dibangun <digest B>): GAGAL (cosign verify gagal)");
    expect(ttB).toContain("The ability to refer to\n    images by tag will be removed in a future release.");
    expect(ttC2).toContain("Verification for 127.0.0.1:18295/api-t4-ci:2.0 --");
    expect(ttC2).toContain("tanda tangan memuat digest <digest D>");
    expect(ttC2).toContain("gerbang image (dibangun <digest C>): GAGAL (cosign verify gagal)");
    expect(ttC2).toContain("gerbang image (dibangun <digest C>): GAGAL (digest di referensi bukan digest yang dibangun CI)");
    expect(ttC2).toContain("# CI menandatangani `2.0` dan cosign menandatangani yang ditunjuk tag saat itu, yaitu D, bukan C.");
    expect(ttD).toContain("gerbang image (dibangun <digest E>): LULUS (tanda tangan sah atas digest yang dibangun)");
    expect(ttD).toMatch(/kunci-2\/cosign\.pub[^\n]*\nError: no matching attestations[^\n]*\n\(exit code 1\)\ngerbang image \(dibangun <digest E>\): GAGAL \(cosign verify gagal\)/);
    const tabel = tabelSetelah("Tabel ini merangkum empat bagian `tanda-tangan.txt`:");
    expect(tabel).toEqual([
      ["Bagian", "Kejadian", "`cosign verify`", "Gerbang digest"],
      ["A", "image tanpa tanda tangan", "`no signatures found`, exit code 10", "gagal"],
      ["B", "ditandatangani lewat tag, lalu tag dipindah", "atas tag gagal, atas digest A lulus", "digest A lulus, digest B gagal"],
      ["C", "tag dipindah sebelum ditandatangani", "atas tag lulus dan memuat digest D", "digest C gagal, digest D gagal"],
      ["D", "ditandatangani lewat digest E", "lulus, dan kunci publik lain ditolak", "lulus"],
    ]);
    expect(tanda).toContain("keyless, Fulcio, dan Rekor Tidak dijalankan");
    harus("Kunci cosign lab dibuat per run, dan keyless, Fulcio, serta Rekor Tidak dijalankan.");
    expect(readme).toContain("Verified OK atas `grype_0.121.0_checksums.txt`");
    expect(readme).toContain("Tidak ada: rilis hanya menerbitkan `checksums.txt`");
    expect(readme).toContain("| gosec | v2.30.0 (2026-10-23) |");
    expect(readme).toContain("Tidak dijalankan: bundle `.sigstore.json` bertanda kunci");
    harus("`make verifikasi-alat` memverifikasi checksum rilis syft, grype, dan cosign (Verified OK). oasdiff tidak menerbitkan tanda tangan, dan gosec Tidak dijalankan (README lab).");
    harus("Tanda tangannya sah, dan objek yang ditandatangani yang bisa keliru. Hanya perbandingan dengan digest hasil build yang menolak digest D.");
    expect(inti.baris[1]!.simpul.map((s) => s.teks)).toEqual(["tag dipindah dulu", "verify tag lulus", "digest D ditolak"]);
    expect(inti.baris[1]!.simpul[1]!.sub).toBe("memuat digest D");
    expect(inti.baris[1]!.simpul[2]!.sub).toBe("bukan hasil build CI");
  });
  test("testing.txt api-t4: go vet tanpa temuan; 17 paket lolos dengan dan tanpa database; TES_DB_WAJIB membuat go test keluar 1; satu tes mencocokkan rute dengan kontrak", () => {
    expect([OK_A, OK_B]).toEqual([17, 17]);
    expect(testingApi).toContain("$ go vet ./...\n(tanpa temuan)");
    expect(testingApi.trimEnd().endsWith("# exit status 1")).toBe(true);
    expect(testingApi).toContain("--- PASS: TestRuteHandlerSamaDenganOpenAPI");
    expect(testingApi).toContain("$ TES_DB_WAJIB=1 TES_REDIS_WAJIB=1 go test -count=1 ./...");
    harus(`Rekaman \`testing.txt\` api-t4 mengulangnya: ${OK_B} paket lolos tanpa database, dan dengan \`TES_DB_WAJIB=1\` dan \`TES_REDIS_WAJIB=1\` \`go test\` keluar dengan status 1.`);
    expect(kontrakTesGo).toContain("func TestRuteHandlerSamaDenganOpenAPI(t *testing.T)");
    expect(kontrakTesGo.match(/^func Test/gm)).toHaveLength(1);
    harus("`TestRuteHandlerSamaDenganOpenAPI` di `testing.txt`");
    expect(pilah.item[1]!.kenapa).toContain(`${OK_A} paket lolos dengan PostgreSQL sungguhan`);
    expect(hal327).toContain("TES_DB_WAJIB");
  });
});

describe("pemetaan per modul, celah kode bersama, dan versi alat", () => {
  test("gerbang.py: tabel pemetaan di halaman sama dengan ATURAN_LANGKAH dan RE_MODUL; kode bersama tidak dipetakan dan tes lab mencatatnya", () => {
    expect(gerbang).toContain('(re.compile(r"^labs/api-t4/openapi\\.yaml$"), ["kontrak", "klien"]),');
    expect(gerbang).toContain('(re.compile(r"^labs/api-t4/go\\.(mod|sum)$"), ["audit-dependensi", "sbom"]),');
    expect(gerbang).toContain('(re.compile(r"^labs/api-t4/(Dockerfile|cmd/api/.*)$"), ["image"]),');
    expect(gerbang).toContain('RE_MODUL = re.compile(r"^labs/api-t4/internal/modul/([a-z0-9_]+)/.*\\.go$")');
    expect(gerbang).toContain('langkah.update({f"tes-modul:{m.group(1)}", f"sast:{m.group(1)}"})');
    const tabel = tabelSetelah("Tabel ini membaca aturan di `gerbang.py`");
    expect(tabel).toEqual([
      ["File yang berubah", "Langkah yang jalan"],
      ["`internal/modul/<nama>/*.go`", "tes modul `<nama>` dan SAST modul `<nama>`"],
      ["`openapi.yaml`", "tes contract dan client dibuat ulang"],
      ["`go.mod` atau `go.sum`", "audit dependensi dan SBOM"],
      ["`Dockerfile` atau `cmd/api/*`", "build image"],
      ["`internal/service`, `internal/handler`, `internal/repo`, `migrasi`", "tidak ada"],
    ]);
    expect(tesGerbang).toContain('self.assertEqual(g.langkah_untuk(["labs/api-t4/internal/service/bayar.go", "labs/api-t4/migrasi/0001.sql"]), [])');
    expect(tesGerbang).toContain("def test_kode_bersama_di_luar_modul_belum_dipetakan(self):");
    expect(readme).toContain("File di luar aturan itu (misalnya `internal/service`, `internal/handler`, `internal/repo`, `migrasi`) tidak menjalankan langkah apa pun");
    expect(readme).toContain("(13 file di `labs/api-t4`, termasuk `internal/service/bo.go` dan `internal/repo/audit.go`) hanya memicu langkah `image` lewat `cmd/api/main.go`");
    harus("lab audit mengubah 13 file di `labs/api-t4`, termasuk `internal/service/bo.go` dan `internal/repo/audit.go`.");
    harus("karena satu dari 13 file, `cmd/api/main.go`, cocok dengan aturannya (Hitungan atas README lab).");
    harus("Tes dan SAST atas `internal/service`, `internal/repo`, dan `internal/jangkar` tidak terpicu.");
    expect(berkasDi("labs/api-t4/internal/jangkar/").length).toBeGreaterThan(0);
    expect(readme).toContain("Aturan \"jalankan semua\" untuk kode bersama");
  });
  test("klaim negatif berlingkup: isi response tidak dicocokkan dengan kontrak di tes handler api-t4; tidak ada app Flutter di labs; CI tidak dijalankan", () => {
    const tesHandler = berkasDi("labs/api-t4/internal/handler/").filter((f) => f.endsWith("_test.go"));
    expect(tesHandler.length).toBeGreaterThan(5);
    expect(tesHandler.filter((f) => baca(f).includes("openapi.yaml"))).toEqual(["labs/api-t4/internal/handler/kontrak_test.go"]);
    expect(kontrakTesGo).toContain("Penjaga kontrak: setiap rute yang didaftarkan handler ada di openapi.yaml dan sebaliknya.");
    const pubspec = berkasDi("labs/").filter((f) => f.endsWith("pubspec.yaml"));
    expect(pubspec.length).toBeGreaterThan(0);
    for (const f of pubspec) expect(baca(f), f).not.toMatch(/sdk:\s*flutter|^\s*flutter:|^workspace:/m);
    expect(berkasDi(".github/workflows/").filter((f) => /oasdiff|gosec|govulncheck|grype|cosign|syft/.test(baca(f)))).toEqual([]);
    expect(readme).toContain("**Workflow GitHub Actions per modul, branch protection, CODEOWNERS**: lab tidak menjalankan CI.");
    harus("Mencocokkan isi response server dengan kontrak tidak dikerjakan siapa pun di lab (Tidak dijalankan).");
    harus("Lab tidak punya app Flutter, jadi pilihan di antara keduanya Tidak dijalankan.");
    harus("CI sungguhan Tidak dijalankan.");
  });
  test("tabel alat dan versi sama dengan README lab; oasdiff v1.35.0 terbit 2026-10-28 dan 23 perbandingan identik tidak direkam", () => {
    const baris = tabelSetelah("govulncheck dipasang dari modul Go:");
    expect(baris[0]).toEqual(["Alat", "Versi di lab", "Dipakai untuk"]);
    const tabelReadme = readme.slice(readme.indexOf("## Versi dan asal alat"));
    const versiReadme = (alat: string): string => cocok(tabelReadme, new RegExp(`^\\| ${alat} \\| (v[\\d.]+)`, "m"))[1]!;
    const peta: [string, string, string][] = [
      ["oasdiff", "oasdiff", "tes contract"], ["openapi-generator", "openapi-generator", "client Dart dari kontrak"], ["gosec", "gosec", "SAST atas kode"],
      ["govulncheck", "govulncheck", "kerentanan yang dipanggil kode"], ["syft", "syft", "SBOM"], ["grype", "grype", "pindai SBOM"], ["cosign", "cosign", "tanda tangan image"],
    ];
    expect(baris.slice(1)).toEqual(peta.map(([n, r, u]) => [n, versiReadme(r), u]));
    expect(baris.slice(1).map((r) => r[1])).toEqual(["v1.34.1", "v7.26.0", "v2.30.0", "v1.9.0", "v1.55.0", "v0.121.0", "v3.1.4"]);
    expect(readme).toContain("oasdiff v1.35.0 terbit 2026-10-28T16:31Z");
    expect(readme).toContain("Peninjau menjalankan 23 perbandingan kontrak yang sama pada v1.35.0");
    expect(readme).toContain("Percobaan itu tidak direkam di lab");
    harus("[oasdiff](https://github.com/oasdiff/oasdiff) v1.35.0 terbit 2026-10-28, sesudah lab dibuat. Peninjau lab menjalankan 23 perbandingan kontrak yang sama pada versi itu dan hasilnya identik, tetapi percobaan itu tidak direkam.");
    harus("Lab mengunduh oasdiff, gosec, syft, grype, dan cosign dari rilis resmi proyeknya, lalu mencocokkan SHA-256 arsipnya dengan file checksum rilis. openapi-generator berjalan dari image yang dikunci dengan digest, dan govulncheck dipasang dari modul Go:");
    expect(readme).toContain("| openapi-generator | v7.26.0 (2026-10-06) | image `openapitools/openapi-generator-cli:v7.26.0` dikunci dengan digest indeks");
    expect(readme).toContain("`go install golang.org/x/vuln/cmd/govulncheck@v1.9.0` ke `.alat/bin`");
    expect(readme).toContain("lalu menghentikan lab bila SHA-256 arsip berbeda dari baris di file checksum rilis");
    expect(barisRiset("R4-237")).toContain("rilis terbaru v1.35.0 (2026-10-28T16:31:43Z)");
  });
  test("breaker gobreaker: terbuka 60 detik lalu satu permintaan di half-open (breaker.txt bagian A); 'terbuka lebih dari 10 menit' ditulis sebagai penafsiran", () => {
    expect(breaker).toContain("terbuka 60 detik, satu permintaan di half-open");
    harus("Breaker gobreaker di lab terbuka 60 detik, lalu mencoba satu permintaan ([[t4-breaker]]).");
    harus("Jadi \"terbuka lebih dari 10 menit\" dibaca sebagai terbuka berulang selama 10 menit (penafsiran penulis).");
  });
});

describe("Hitungan: angka yang dihitung dari angka yang tertulis di halaman", () => {
  test("beban 138,9 request per detik dan 6,94 transaksi uang per detik dari 20.000 user aktif; sama dengan naskah dan 4.13", () => {
    const rps = (AKTIF * 60) / 86400 * 10, tps = (AKTIF * 3) / 86400 * 10;
    expect(rps.toFixed(1).replace(".", ",")).toBe("138,9");
    expect(tps.toFixed(2).replace(".", ",")).toBe("6,94");
    expect(naskah).toContain("138,9");
    expect(naskah).toContain("6,94");
    expect(AKTIF).toBe(100000 * 0.2);
    harus("Puncaknya 138,9 request per detik (20.000 × 60 ÷ 86.400 × 10) dan 6,94 transaksi uang per detik (20.000 × 3 ÷ 86.400 × 10).");
    harus("Masukannya Asumsi: 100.000 user dengan 20% aktif (20.000 user aktif), 60 request dan 3 transaksi per user aktif per hari, faktor puncak 10.");
    expect(hal413).toContain("20.000 × 60 ÷ 86.400 × 10 = 138,9 request per detik dan 20.000 × 3 ÷ 86.400 × 10 = 6,94 transaksi uang per detik");
  });
  test("rilis iOS 7 hari: persen dari R4-238 dan jangkauan paling banyak 200, 400, 1.000, 2.000, 4.000, 10.000, 20.000; Play: update saja", () => {
    const r = barisRiset("R4-238");
    const persen = cocok(r, /7 hari ((?:\d+%(?:, )?)+)/)[1]!.split(", ").map((p) => Number(p.replace("%", "")));
    expect(persen).toEqual([1, 2, 5, 10, 20, 50, 100]);
    const jangkauan = persen.map((p) => (AKTIF * p) / 100);
    expect(jangkauan.map(rib)).toEqual(["200", "400", "1.000", "2.000", "4.000", "10.000", "20.000"]);
    harus(`jangkauan tiap hari di iOS paling banyak ${jangkauan.map(rib).slice(0, 6).join(", ")}, dan ${rib(jangkauan[6]!)} user.`);
    harus(`1%, 2%, 5%, 10%, 20%, 50%, 100%`);
    harus("Hari pertama iOS paling banyak 200 dari 20.000 user aktif, lawan 20.000 (Hitungan)");
    expect(r).toContain("'Staged rollouts can only be used for app updates, not when publishing an app for the first time'");
    expect(r).toContain("'chosen at random for each new release rollout'");
    expect(r).toContain("'affecting the same set of users'");
    expect(r).toContain("'will remain on that version'");
    expect(r).toContain("jeda sampai 30 hari tanpa batas jumlah jeda");
    expect(r).toContain("'can be manually downloaded from the App Store by anyone at any time'");
    expect(r).toContain("sampel acak dari 'users with automatic updates on eligible devices'");
    harus("| Berlaku untuk | update, bukan saat app pertama terbit | update, dengan sampel acak dari user yang memakai pembaruan otomatis |");
    harus("| Jadwal | persentase dipilih sendiri | 7 hari: 1%, 2%, 5%, 10%, 20%, 50%, 100% |");
    harus("| Dihentikan | halt dan resume memengaruhi kelompok yang sama | jeda sampai 30 hari, jumlah jeda tidak dibatasi |");
    harus("| Yang sudah menerima | tetap di versi itu | user bisa mengunduh sendiri kapan saja |");
    expect(barisRiset("R4-22")).toContain("hanya untuk update");
    expect(barisRiset("R4-22")).toContain("7 hari, 1%, 2%, 5%, 10%, 20%, 50%, 100%");
  });
  test("giliran jaga: 1 ÷ 5 = 20%, 1 ÷ 4 = 25%, 1 ÷ 3 = 33%; batas 25% dari buku SRE; tabel di halaman sama dengan hitungan", () => {
    const pct = (n: number) => `${Math.round(100 / n)}%`;
    expect([pct(TIM.Pembayaran!), pct(TIM.Merchant!), pct(TIM.Platform!), pct(3)]).toEqual(["20%", "25%", "25%", "33%"]);
    const tabel = tabelSetelah("jadi tabel ini menghitung pembagian minggu:").slice(1);
    expect(tabel).toEqual([
      ["Pembayaran", String(TIM.Pembayaran), `1 ÷ ${TIM.Pembayaran} = ${pct(TIM.Pembayaran!)}`, "di bawah batas"],
      ["Merchant", String(TIM.Merchant), `1 ÷ ${TIM.Merchant} = ${pct(TIM.Merchant!)}`, "tepat di batas"],
      ["Platform", String(TIM.Platform), `1 ÷ ${TIM.Platform} = ${pct(TIM.Platform!)}`, "tepat di batas"],
    ]);
    harus("Satu orang cuti dari tim berempat membuat rotasi 1 ÷ 3 = 33%, di atas batas (Hitungan atas Asumsi naskah).");
    harus("1 ÷ 4 = 25% sebelum, dan 1 ÷ 3 = 33% sesudah. Batas buku SRE adalah 25% waktu (Hitungan atas Asumsi naskah).");
    harus("Saat satu tim jaga turun menjadi tiga orang: 1 ÷ 3 = 33% minggu jaga lawan batas 25% (Hitungan atas Asumsi naskah).");
    expect(barisRiset("R4-238")).toContain("'no more than 25% can be spent on-call'");
    expect(barisRiset("R4-238")).toContain("'urgent, actionable, and actively or imminently user-visible'");
    expect(barisRiset("R4-239")).toContain("1/5 = 20%, 1/4 = 25%, 1/3 = 33%");
  });
  test("label Hitungan didefinisikan sekali di pemakaian pertama; Tidak dijalankan didefinisikan di blok Coba; arti lima label ada di cara pakai", () => {
    harus("Hasil rumus atas angka yang tertulis di halaman ini disebut Hitungan, dan labelnya mengikuti masukan terlemahnya.");
    expect(badan.match(/disebut Hitungan/g)).toHaveLength(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("disebut Hitungan") + "disebut ".length);
    harus("Tidak dijalankan berarti dicek ke dokumentasi atau kode tanpa menjalankannya.");
    expect(badan.match(/Tidak dijalankan berarti/g)).toHaveLength(1);
    expect(badan.indexOf("Tidak dijalankan berarti")).toBeGreaterThan(badan.indexOf('<Blok nama="Coba"'));
    expect(cara).toContain("Tidak dijalankan");
    expect(cara).toContain("Rekaman lab");
  });
});

describe("widget pilah dan diagram", () => {
  test("pilah: delapan kartu, empat di PR dan empat di rilis, posisi jawaban tidak berpola; tiap kartu menyebut bagian rekaman yang ada", () => {
    expect(pilah.kelompok).toEqual(["Di PR, sebelum merge", "Di rilis, sesudah merge"]);
    expect(pilah.item).toHaveLength(8);
    expect(pilah.item.map((i) => i.jawab)).toEqual([1, 0, 0, 1, 1, 0, 1, 0]);
    expect(pilah.item.filter((i) => i.jawab === 0)).toHaveLength(4);
    expect(pilah.item.map((i) => i.jawab).join("")).not.toMatch(/^(01)+0?$|^(10)+1?$/);
    const rujukan = [...pilahMentah.matchAll(/([\w-]+)\.txt(?: api-t4)? bagian ([A-E])\b/g)].map((m) => [m[1]!, m[2]!] as [string, string]);
    expect(rujukan).toEqual([["sast", "E"], ["sbom", "C"], ["testing", "A"], ["tanda-tangan", "D"], ["sbom", "C"], ["sast", "A"], ["tanda-tangan", "C"], ["staging", "B"]]);
    const isiRekaman: Record<string, string> = { sast, sbom, testing: testingApi, "tanda-tangan": tanda, staging };
    for (const [f, b] of rujukan) expect(isiRekaman[f], f).toContain(`# --- ${b}. `);
    expect(pilah.item[0]!.kenapa).toContain(`${PANGGIL.length} kerentanan stdlib yang dipanggil`);
    expect(pilah.item[0]!.kenapa).toContain(`${TEMUAN.length} temuan atas SBOM image`);
    expect(pilah.item[2]!.kenapa).toContain(`menghasilkan ${API_RINGKAS[2]} error dengan exit code 1`);
    expect(pilah.item[4]!.kenapa).toContain(`${MODUL_GOMOD} modul dari go.mod ada semua di SBOM`);
    expect(pilah.item[7]!.kenapa).toContain("dua kunci produksi di dua file contoh dan keluar dengan status 1");
    expect(pilah.item[6]!.kenapa).toContain("tag dipindah sebelum ditandatangani: verify atas tag dan atas digest D lulus");
    expect(pilah.item[5]!.kenapa).toContain("G701");
    expect(pilah.item[5]!.kenapa).toContain("nol temuan (kasus tandingan di bagian yang sama)");
    expect(pilah.item[3]!.kenapa).toContain("kunci publik lain ditolak");
    expect(pilah.penutup).toContain("Pembagian ini keputusan halaman ini (Ilustrasi)");
    harus("Delapan pemeriksaan di bawah ini punya rekaman lab, kecuali CI yang memanggilnya.");
    expect(pilah.item).toHaveLength(8);
    expect(daun(pilah)).toEqual(DIAGRAM_DAUN.pilah);
  });
  test("diagram inti dan pipeline: skema Zod, nilai terkunci daun demi daun, sumber rekaman dan ilustrasi, tanpa ID internal", () => {
    expect(daun(intiMentah)).toEqual(DIAGRAM_DAUN.inti);
    expect(daun(pipelineMentah)).toEqual(DIAGRAM_DAUN.pipeline);
    expect(inti.sumber.jenis).toBe("rekaman");
    expect(pipeline.sumber.jenis).toBe("ilustrasi");
    expect(inti.baris).toHaveLength(2);
    expect(inti.baris.every((b) => b.simpul.length === 3)).toBe(true);
    expect(pipeline.baris.map((b) => b.simpul.length)).toEqual([5, 5]);
    const tidakDijalankan = pipeline.baris.flatMap((b) => b.simpul).filter((s) => s.sub === "Tidak dijalankan").map((s) => s.teks);
    expect(tidakDijalankan).toEqual(["deploy blue/green", "rilis app bertahap"]);
    expect(pipeline.baris.flatMap((b) => b.simpul).filter((s) => s.sub === "Rekaman lab").length).toBe(7);
    expect(pipeline.baris[0]!.simpul.map((s) => s.teks)).toEqual(["go vet dan tes modul", "oasdiff breaking", "client Dart dibuat ulang", "gosec dan govulncheck", "pemindai kunci produksi"]);
    expect(pipeline.baris[1]!.simpul.map((s) => s.teks)).toEqual(["SBOM image dan grype", "cosign sign atas digest", "verifikasi digest", "deploy blue/green", "rilis app bertahap"]);
    expect(pilah.item.filter((i) => i.jawab === 1).length).toBe(4);
    expect(JSON.stringify([intiMentah, pipelineMentah, pilah])).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+|#\d{3}/);
  });
});

describe("ADR 44: tiga opsi, sembilan aturan, pre-mortem, kapan salah, sengaja belum", () => {
  test("opsi A, B, C dengan lima baris; keputusan lain tiga baris; sembilan aturan bernomor; satu pertanyaan terbuka; tiga penyebab pre-mortem; lima tanda kapan salah", () => {
    const opsi = tabelSetelah("Keputusan pipeline punya tiga opsi:");
    expect(opsi.map((r) => r[0])).toEqual(["", "Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(opsi.every((r) => r.length === 4)).toBe(true);
    const lain = tabelSetelah("Keputusan lain punya opsi sendiri:");
    expect(lain.map((r) => r[0])).toEqual(["Keputusan", "Tanda tangan image", "Gerbang pemindai", "Rilis app"]);
    expect(lain[1]).toEqual(["Tanda tangan image", "cosign atas digest", "Tanda tangan atas tag", "Tag bisa dipindah sebelum ditandatangani (`tanda-tangan.txt` bagian C)"]);
    expect(lain[2]![3]).toBe("Tiga pemindai lulus palsu (`sast.txt` bagian B, `sbom.txt` bagian B, dokumentasi govulncheck)");
    const aturan = [...badan.slice(badan.indexOf("**Keputusan: opsi C, dengan sembilan aturan.**"), badan.indexOf("**Belum diputuskan.**")).matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
    expect(aturan).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    harus("**Keputusan: opsi C, dengan sembilan aturan.**");
    harus("**Belum diputuskan.** Aturan untuk kode di luar `internal/modul/`.");
    expect(readme).toContain("ADR 44 perlu menulis apa yang berjalan untuk kode bersama");
    const pre = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pre.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))).toEqual([1, 2, 3]);
    const salah = badan.slice(badan.indexOf("**Kapan keputusan ini salah.**"), badan.indexOf("**Yang akan merevisinya.**"));
    expect([...salah.matchAll(/^- /gm)]).toHaveLength(5);
    harus("**Yang akan merevisinya.** Tahap 5 menaikkan tim dari 13 menjadi 20 sampai 40 orang dalam 5 sampai 7 tim (naskah Tahap 4, jembatan).");
    expect(naskah).toContain("Tim naik dari 13 menjadi 20 sampai 40 orang dalam 5 sampai 7 tim");
    const sengaja = tabelSetelah("### Sengaja belum dilakukan");
    expect(sengaja.map((r) => r[0])).toEqual(["Yang ditunda", "Keyless signing, Fulcio, dan Rekor", "Provenance SLSA dan atestasi app", "Workflow GitHub Actions per modul, branch protection, dan CODEOWNERS", "Mencocokkan isi response server dengan kontrak", "Aturan \"jalankan semua\" untuk kode bersama", "Menaikkan Go ke 1.27.3", "Client Dart yang dijalankan"]);
    expect(sengaja.every((r) => r.length === 3)).toBe(true);
    expect(sengaja[2]).toEqual(["Provenance SLSA dan atestasi app", "Hanya dijelaskan, Tidak dijalankan", "[[t4-adr-45]]"]);
  });
  test("aturan 1 sampai 9 memuat hanya yang direkam atau diberi label; sumber kasus industri dan pencegahan pre-mortem sama dengan R4-235 dan dokumentasi GitHub", () => {
    harus("2. Tes contract memakai `oasdiff breaking --flatten-params` dengan ambang ERR dan `--severity-levels` yang menaikkan `response-optional-property-removed`.");
    harus("5. Sesudah merge, CI membangun image, membuat SBOM CycloneDX dengan syft, dan memindainya dengan grype pada ambang High (pilihan lab).");
    harus("6. Image ditandatangani cosign atas digest dan diverifikasi dengan perbandingan digest hasil build sebelum deploy.");
    harus("7. Deploy blue/green dengan dua instance, migration expand lalu contract ([[t2-skema-tanpa-downtime]]), rilis app bertahap, dan feature flag untuk fitur uang. Semuanya Tidak dijalankan.");
    harus("9. Security review Laras lolos sebelum dibuka ke publik. Temuan dengan bukti memblok, dan dugaan tidak.");
    expect(barisAdr44).toContain("Deploy produksi blue/green dengan dua instance (R4-23) dan migration expand lalu contract (ADR 17)");
    expect(barisAdr44).toContain("feature flag (ADR 42)");
    const r = barisRiset("R4-235");
    expect(r).toContain("GHSA-mrrh-fwg8-r2c3 (diterbitkan 2025-03-15, dibuka 2026-10-30)");
    expect(r).toContain("impacting over 23,000 repositories");
    expect(r).toContain("'<= 45.0.7', diperbaiki di 46.0.1");
    expect(r).toContain("'Attackers retroactively modified multiple version tags to reference a malicious commit'");
    expect(r).toContain("Advisory tidak merekomendasikan penyematan SHA");
    expect(r).toContain("'a tag can be moved or deleted if a bad actor gains access to the repository storing the action'");
    expect(r).toContain("'Pin references to actions to a commit SHA in your workflow files'");
    harus("lebih dari 23.000 repositori terdampak");
    harus("([GHSA-mrrh-fwg8-r2c3](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3), diterbitkan 2025-03-15, dibuka 2026-10-30)");
    harus("Advisory itu sendiri tidak menyebut penyematan SHA.");
    harus("Penyerang mengubah beberapa tag versi secara surut supaya menunjuk commit berbahaya, dan versi 46.0.1 memperbaikinya");
    harus("([GitHub Docs: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use), dibuka 2026-10-30)");
    harus("Batasnya: ini dependensi workflow, bukan image kontainer, dan kasusnya tidak membuktikan bahwa tanda tangan digest menahannya.");
    const gh = barisRiset("R4-236");
    expect(gh).toContain("check-nya tetap 'Pending' dan memblok merge");
    expect(gh).toContain("job yang dilewati oleh kondisi melapor 'Success'");
    expect(gh).toContain("(dibuka 2026-10-30)");
    harus("([GitHub Docs: Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks), dibuka 2026-10-30)");
    const sb = barisRiset("R4-237");
    expect(sb).toContain("'An SBOM is a formal record containing the details and supply chain relationships of various components used in building software'");
    expect(sb).toContain("2021-07-12");
    expect(sb).toContain("'Exceptional for vulnerability detection when used with a scanner like Grype'");
    expect(sb).toContain("Kalimat 'SBOM tidak mencegah serangan' di prompt pengatur tidak ada di kedua sumber");
    harus("SBOM mendaftar. Yang menolak komponen rentan adalah pemindainya (penalaran dari definisi, bukan kutipan).");
    harus("([NTIA: Minimum Elements For an SBOM](https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom), 2021-07-12, dibuka 2026-10-30)");
    const pw = barisRiset("R4-238");
    expect(pw).toContain("dart.dev/tools/pub/workspaces: workspace sejak Dart 3.6.0, satu resolusi dan satu pubspec.lock");
    expect(pw).toContain("'In Dart this part is handled by pub workspaces, which Melos builds on top of'");
    harus("Pub workspaces mulai ada di Dart 3.6.0, dan seluruh paket memakai satu resolusi dengan satu `pubspec.lock`");
    expect(barisRiset("R4-239")).toContain("hanya `labs/api-t4/cmd/api/main.go` cocok dan hasilnya ['image'] (1 dari 13)");
  });
  test("pre-mortem dan kapan salah: tiap klaim berujung pada rekaman atau label; tiga pencegahan pre-mortem 3 berlabel Tidak dijalankan", () => {
    harus("Pencegahannya menyematkan action ke commit SHA penuh, mengunci SHA-256 alat (sudah di lab), dan CODEOWNERS atas file workflow. Tiga pencegahan itu Tidak dijalankan, kecuali checksum alat.");
    harus("PR yang hanya mengubah `internal/service` lolos tanpa tes dan SAST, seperti `langkah_untuk` yang mengembalikan daftar kosong di rekaman.");
    harus("Gerbang yang memercayai exit code lulus saat pemindaian gagal, dan basis data kerentanan yang baru membuat api-t4 gagal tanpa perubahan kode, seperti hari ini.");
    harus("Saat tim memakai parameter tingkat path atau `explode` di kontrak. `explode` tidak tertangkap oasdiff di kedua tingkat (`kontrak.txt` bagian C).");
    harus("Saat gerbang tanpa pemeriksaan isi dianggap cukup. grype atas SBOM kosong lulus (`sbom.txt` bagian B), dan SBOM yang lengkap pun hanya mendaftar komponen.");
    harus("Saat verifikasi memakai tag, bukan digest hasil build. Tanda tangan atas tag yang dipindah sebelum penandatanganan tetap sah (`tanda-tangan.txt` bagian C).");
    expect(readme).toContain("`alat.json`");
    expect(readme).toContain("versinya ditulis di tiap hasil grype di `sbom.txt` dan lab gagal bila berbeda");
    expect(hal327).not.toContain("tj-actions");
  });
});

describe("baris riset, tanggal akses, dan ID internal tidak tampil", () => {
  test("lima baris riset utuh sama dengan nilai terkunci; urut ID, tanpa ID ganda, lima kolom; tanggal akses 2026-10-30", () => {
    const ids = ["R4-235", "R4-236", "R4-237", "R4-238", "R4-239"];
    expect(ids.map(barisRiset)).toEqual(RISET_TERKUNCI);
    expect(ids.map((i) => sidik(barisRiset(i)))).toEqual(SIDIK.riset);
    const semua = riset.split("\n").filter((b) => /^\| R4-\d+ \|/.test(b)).map((b) => b.match(/^\| (R4-\d+) \|/)![1]!);
    expect(new Set(semua).size).toBe(semua.length);
    for (const i of ids) expect(barisRiset(i).split(" | ").length, i).toBe(5);
    expect(semua.indexOf("R4-235")).toBe(semua.indexOf("R4-219") + 1);
    expect(semua.slice(semua.indexOf("R4-235"), semua.indexOf("R4-235") + 5)).toEqual(ids);
    for (const i of ["R4-235", "R4-236", "R4-237", "R4-238"]) expect(barisRiset(i), i).toContain("2026-10-30");
  });
  test("ID riset, nomor keputusan, nomor PR, dan komentar lab internal tidak tampil di halaman, widget, dan diagram; label rekaman seperti C2 diganti kata", () => {
    for (const teks of [mdx, pilahMentah, JSON.stringify(intiMentah), JSON.stringify(pipelineMentah)]) {
      expect(teks).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(teks).not.toMatch(/keputusan \d{3,4}|\(keputusan|tinjauan PR|PR #?\d{3}|#\d{3}\b/);
      const label = [...teks.replace(/\[\[[^\]]+\]\]/g, "").matchAll(/(?<![\w./#-])[A-G]\d+(?:\.\d+)?(?![\w])/g)].map((m) => m[0]).filter((l) => !/^G\d{3}$/.test(l));
      expect(label, "label rekaman internal seperti C2 atau E1 tampil").toEqual([]);
    }
    expect(badan).not.toMatch(/\d B\b/);
    expect(badan).not.toMatch(/\bAnda\b|\bkita\b|\bpengguna\b/i);
    expect(badan).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(badan).not.toMatch(/BCA|BRI|Midtrans|Xendit|GoPay|Tokopedia/);
  });
  test("teks yang tampil di tiap Snippet dikunci dengan sidik, dan blok kode klien sama dengan baris rekaman; rentang Snippet diturunkan dari sumber", () => {
    const harap: [string, string][] = [
      ["labs/t4-pipeline/gerbang.py", `${gA}:${gB}`], ["labs/t4-pipeline/tes_gerbang.py", `${tA}:${tB}`], ["labs/api-t4/output/kontrak.txt", `${kaA}:${kaB}`],
      ["labs/t4-pipeline/output/kontrak.txt", `${kpBA}:${kpBB}`], ["labs/t4-pipeline/output/kontrak.txt", `${kpWA}:${kpWB}`], ["labs/t4-pipeline/output/kontrak.txt", `${kpEA}:${kpEB}`],
      ["labs/t4-pipeline/output/sast.txt", `${saBA}:${saBB}`], ["labs/t4-pipeline/output/sbom.txt", `${sbBA}:${sbBB}`], ["labs/t4-pipeline/output/sast.txt", `${saEA}:${saEB}`],
      ["labs/t4-pipeline/output/tanda-tangan.txt", `${ttCA}:${ttCB}`],
    ];
    expect(tag.map((_, i) => [berkasSnippet[i], lines[i]])).toEqual(harap);
    expect(harap.map((h) => h[1])).toEqual(["257:277", "414:417", "17:22", "66:75", "91:94", "106:109", "24:36", "27:31", "55:70", "76:93"]);
    const tampil = tag.map((_, i) => {
      const [a, b] = lines[i]!.split(":").map(Number) as [number, number];
      return sidik(baca(berkasSnippet[i]!).split("\n").slice(a - 1, b).join("\n"));
    });
    expect(tampil).toEqual(SIDIK.snippet);
    for (const j of judulSnippet) expect(j, "judul Snippet").toMatch(/^(Rekaman lab|Kode lab): /);
    expect(judulSnippet).toEqual([
      "Kode lab: labs/t4-pipeline/gerbang.py baris 257 sampai 277 (file yang berubah menentukan langkah)",
      "Kode lab: labs/t4-pipeline/tes_gerbang.py baris 414 sampai 417 (kode bersama belum dipetakan)",
      "Rekaman lab: labs/api-t4/output/kontrak.txt baris 17 sampai 22 (enum respons ditambah)",
      "Rekaman lab: labs/t4-pipeline/output/kontrak.txt baris 66 sampai 75 (bagian B, field opsional dihapus)",
      "Rekaman lab: labs/t4-pipeline/output/kontrak.txt baris 91 sampai 94 (bagian C, parameter jadi wajib)",
      "Rekaman lab: labs/t4-pipeline/output/kontrak.txt baris 106 sampai 109 (bagian C, perubahan explode)",
      "Rekaman lab: labs/t4-pipeline/output/sast.txt baris 24 sampai 36 (bagian B, pemindaian tidak lengkap)",
      "Rekaman lab: labs/t4-pipeline/output/sbom.txt baris 27 sampai 31 (bagian B, SBOM folder kosong)",
      "Rekaman lab: labs/t4-pipeline/output/sast.txt baris 55 sampai 70 (bagian E, audit atas api-t4)",
      "Rekaman lab: labs/t4-pipeline/output/tanda-tangan.txt baris 76 sampai 93 (bagian C, tag dipindah sebelum ditandatangani)",
    ]);
    const blok = [...badan.matchAll(/```text title="([^"]*)"\n([\s\S]*?)\n```/g)];
    expect(blok).toHaveLength(1);
    expect(blok[0]![2]).toBe(KL.teks(klA, klB));
    expect(blok[0]![1]).toBe(`Rekaman lab: output client Dart dari t4-pipeline, baris ${klA} sampai ${klB} (bagian C, enum ditambah)`);
    expect([klA, klB]).toEqual([33, 46]);
    expect(SIDIK.blokKode).toEqual([sidik(blok[0]![1] + "\n" + blok[0]![2])]);
    expect(gerbang.split("\n").slice(gA - 1, gB).join("\n")).not.toMatch(/keputusan|R\d-\d|PR \d/);
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const [a, b] = lines[i]!.split(":").map(Number) as [number, number];
      expect(baca(berkasSnippet[i]!).split("\n").slice(a - 1, b).join("\n"), `Snippet ${i}`).not.toMatch(/R\d-\d{2,3}|keputusan \d{3}|tinjauan PR \d+/);
    }
  });
});

describe("celah turunan yang ditemukan uji mutasi tanpa kunci: heading, tanggal akses, tautan luar, nama lab, tag, jumlah pertanyaan, label kalimat kunci", () => {
  test("heading: satu H2 Inti, lima belas H3 berurutan, judul ADR memuat nomor ADR dari registry; penanda tebal ADR berurutan", () => {
    const h = [...badan.matchAll(/^(#{2,6}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(h).toEqual([
      "## Inti", "### Siapa menjalankan setiap pekerjaan", "### Satu PR menjalankan apa", "### Kontrak: yang ditangkap dan yang lolos", "### Client Dart dibuat ulang dari kontrak",
      "### SAST dan audit dependensi: tiga pemindai yang bisa lulus palsu", "### SBOM, tanda tangan, dan hasil gerbang atas api-t4", "### Supply chain: nama yang bisa dipindah",
      "### Rilis bertahap di store", "### Security review dan temuan", "### On-call per modul dan alert gejala",
      `### ADR ${dari("t4-tim-infra").adr![0]}: pipeline per modul, tanda tangan atas digest, dan rilis bertahap`, "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    const tebal = [...badan.matchAll(/^\*\*([^*]+)\*\*/gm)].map((m) => m[1]);
    expect(tebal).toEqual([
      "Ubah satu hal:", "Kebutuhan.", "Status:", "Beda dengan naskah.", "Keputusan: opsi C, dengan sembilan aturan.", "Belum diputuskan.", "Kenapa C, bukan A atau B.",
      "Kasus industri: tj-actions/changed-files.", "Pre-mortem.", "Kapan keputusan ini salah.", "Yang akan merevisinya.", "1.", "2.", "3.", "4.", "5.",
    ]);
  });
  test("tanggal akses: setiap 'dibuka' di halaman sama dengan tanggal di baris riset; tanggal terbit dan versi bertanggal sama dengan sumbernya", () => {
    const dibuka = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(dibuka).toHaveLength(11);
    expect([...new Set(dibuka)]).toEqual(["2026-10-30"]);
    for (const i of ["R4-235", "R4-236", "R4-237", "R4-238"]) expect(barisRiset(i), i).toMatch(/dibuka (ulang )?2026-10-30/);
    expect(badan.match(/diterbitkan 2025-03-15/g)).toHaveLength(1);
    expect(barisRiset("R4-235")).toContain("diterbitkan 2025-03-15");
    expect(badan.match(/2021-07-12/g)).toHaveLength(1);
    expect(barisRiset("R4-237")).toContain("2021-07-12");
    expect(badan.match(/2026-10-28/g)).toHaveLength(1);
    expect(readme).toContain("oasdiff v1.35.0 terbit 2026-10-28T16:31Z");
    harus("masih terbuka pada 2026-10-30 (GitHub API)");
    expect(barisRiset("R4-237")).toContain("GitHub API 2026-10-30");
  });
  test("tautan luar: tiap URL di halaman ada di salah satu baris riset 235 sampai 239; tautan dalam hanya ke cara-pakai dan istilah yang ada", () => {
    const luar = [...new Set([...badan.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]!))];
    expect(luar).toHaveLength(13);
    const semuaRiset = ["R4-235", "R4-236", "R4-237", "R4-238", "R4-239"].map(barisRiset).join("\n");
    for (const u of luar) expect(semuaRiset, u).toContain(u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
    const dalam = [...new Set([...badan.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]!))].sort();
    expect(dalam).toEqual(["/cara-pakai/#label-sumber", "/istilah/branch-protection/", "/istilah/codeowners/", "/istilah/on-call/"]);
    for (const s of ["branch-protection", "codeowners", "on-call"]) expect(berkasDi("situs/data/halaman-istilah/").includes(`situs/data/halaman-istilah/${s}.json`), s).toBe(true);
  });
  test("nama lab, tag, dan jumlah pertanyaan: nama lab di prosa ada sebagai folder labs/; tag 2.0 dari rekaman; tiga pertanyaan Sudah tahu; angka di Cek diri dari rekaman", () => {
    const prosa = badan.replace(/^import .*$/gm, "").replace(/<WidgetLama[^>]*\/>/g, "").replace(/```[\s\S]*?```/g, "").replace(/\[\[[^\]]+\]\]/g, "").replace(/<Snippet[^>]*\/>/g, "").replace(/`[^`]*`/g, "").replace(/\]\([^)]*\)/g, "]");
    const nama = [...new Set(prosa.match(/\b(?:api-t\d|t\d-[a-z]+)\b/g))].sort();
    expect(nama).toEqual(["api-t3", "api-t4", "t4-pipeline"]);
    const folder = berkasDi("labs/").map((f) => f.split("/")[1]!);
    for (const n of nama) expect(folder, n).toContain(n);
    const tagC = cocok(ttC2, /\$ docker push 127\.0\.0\.1:18295\/api-t4-ci:(\S+)\s/)[1]!;
    expect(tagC).toBe("2.0");
    harus(`tag \`${tagC}\` dipindah ke image lain sebelum cosign`);
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    const butir = [...d[2]!.matchAll(/^(\d+)\. /gm)].length;
    expect(butir).toBe(3);
    expect(d[1]).toBe(`Sudah tahu? Cek ${butir} pertanyaan`);
    harus(`3. govulncheck atas api-t4 menemukan ${PANGGIL.length} kerentanan stdlib walau kodenya tidak diubah.`);
    harus(`**3.** grype menemukan ${STDLIB.length} temuan stdlib atas image api-t4, dan govulncheck menemukan ${PANGGIL.length} yang dipanggil.`);
    harus(`${STDLIB.length} − ${PANGGIL.length} = ${STDLIB.length - PANGGIL.length} (Hitungan atas dua daftar).`);
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(5);
    expect(badan.match(/<details class="success">/g)).toHaveLength(5);
  });
  test("kalimat kunci dengan label: tiap label sumber di kalimat yang membawa angka rekaman tetap Rekaman lab, Hitungan, Asumsi, atau Tidak dijalankan seperti sumbernya", () => {
    harus("Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `kontrak.txt` api-t4, oasdiff membandingkan kontrak api-t3 dan api-t4.");
    harus("Di `tanda-tangan.txt` bagian C, tag `2.0` dipindah ke image lain sebelum cosign, alat penanda tangan image, menandatanganinya.");
    harus("Tahap 4 dikerjakan 13 developer dalam tiga tim selama 12 minggu (Asumsi cerita)");
    harus("| Perawatan pipeline dan image | Tim Platform (Asumsi penulis) | ADR 44 |");
    harus("| Client dari OpenAPI dan rilis store | Raka (Asumsi penulis) | Blok Paham |");
    harus("| Security review sebelum dibuka ke publik | Laras, security engineer | ADR 44 |");
    harus("| CODEOWNERS dan ADR wajib untuk perubahan lintas modul | Ketiga tim | [[t4-modul]] |");
    harus("Jadi lebih aman memakai satu job yang selalu jalan dan memutuskan langkah mana yang perlu, bukan filter path di tiap workflow (penalaran penulis, Tidak dijalankan).");
    harus("Apa yang dilakukan client Dart terhadap deklarasi itu tidak diuji (Tidak dijalankan).");
    harus("Lab tidak menaikkan Go, karena itu mengubah api-t4 dan semua rekamannya. Itu tugas terpisah. Hasil ini Rekaman lab dengan Go 1.27.1, bukan kelemahan desain.");
    harus("Laras sendiri adalah tokoh cerita, jadi adegan penilaiannya Ilustrasi. Rekamannya adalah hasil alat di tabel itu.");
    harus("Dengan 20.000 user aktif (Asumsi naskah), jangkauan tiap hari di iOS paling banyak");
    harus("Itu Hitungan atas jadwal Apple, bila semua user memakai iOS dengan pembaruan otomatis.");
    expect(badan.match(/Rekaman lab/g)).toHaveLength(12);
    expect(sast.split("\n")[1]).toContain("gosec 2.30.0");
    harus("Cadangannya checklist PR manual.");
    harus("Branch protection dan CODEOWNERS per modul sudah dibahas di [[t4-modul]]. Keduanya fitur GitHub, dan plan repositori pemilik belum diketahui [perlu verifikasi: plan pemilik].");
    harus("SAST berarti static application security testing, pemeriksaan keamanan yang membaca kode tanpa menjalankannya.");
    harus("Required status check adalah check yang harus hijau sebelum PR boleh di-merge.");
    harus("Parameter tingkat path adalah parameter yang ditulis sekali di satu path dan berlaku untuk semua operasinya.");
    harus("Digest adalah sidik jari isi image, sedangkan tag hanya nama yang bisa dipindah.");
    harus("Supply chain adalah semua yang masuk ke software sebelum sampai ke produksi: dependensi, alat build, workflow, dan image.");
  });
});

describe("widget pilah dan diagram diturunkan penuh dari rekaman: judul, kartu, alasan, label, dan sub tiap simpul", () => {
  test("pilah: judul, kelompok, tiap teks, jawaban, dan alasan sama dengan templat yang angkanya diturunkan dari rekaman; penutup", () => {
    const HARAP: [string, number, string][] = [
      [`Pindai ulang kerentanan dengan basis data hari ini, padahal kode tidak berubah.`, 1, `Hasilnya bergantung pada basis data kerentanan, bukan hanya pada kode. Kode api-t4 tidak diubah, tetapi govulncheck menemukan ${PANGGIL.length} kerentanan stdlib yang dipanggil (sast.txt bagian E), dan grype ${TEMUAN.length} temuan atas SBOM image (sbom.txt bagian C).`],
      [`go vet dan tes Go untuk modul yang berubah.`, 0, `Pemetaan lab mengirim file modul ke tes modul dan SAST modul itu. Di testing.txt api-t4 bagian A, go vet tanpa temuan dan ${OK_A} paket lolos dengan PostgreSQL sungguhan. CI yang menjalankannya Tidak dijalankan.`],
      [`oasdiff breaking atas dua versi openapi.yaml.`, 0, `Alat ini hanya perlu dua versi kontrak, tanpa image. Di kontrak.txt api-t4, perubahan dari api-t3 ke api-t4 menambah tiga nilai enum jenis dan menghasilkan ${API_RINGKAS[2]} error dengan exit code 1.`],
      [`cosign sign atas digest yang dibangun CI.`, 1, `Digest baru ada sesudah image di-push. Di tanda-tangan.txt bagian D, tanda tangan atas digest lulus verify, dan kunci publik lain ditolak. Kunci cosign dibuat per run lab; keyless Tidak dijalankan.`],
      [`SBOM dari image: apakah memuat semua modul go.mod?`, 1, `SBOM image baru ada sesudah image dibangun. Di sbom.txt bagian C, ${MODUL_GOMOD} modul dari go.mod ada semua di SBOM. SBOM folder kosong lolos grype dengan nol temuan, jadi pemeriksaan isi inilah yang menolaknya (bagian B).`],
      [`gosec atas kode modul yang berubah.`, 0, `SAST membaca kode, jadi tidak butuh image. Di sast.txt bagian A gosec melapor G701 pada contoh yang disiapkan, tetapi hanya karena input mengalir ke query: dengan masukan konstanta, nol temuan (kasus tandingan di bagian yang sama).`],
      [`Perbandingan digest di referensi image dengan digest hasil build.`, 1, `Inilah pemeriksaan yang menolak image yang salah. Di tanda-tangan.txt bagian C, tag dipindah sebelum ditandatangani: verify atas tag dan atas digest D lulus, dan hanya perbandingan dengan digest C hasil build yang menggagalkannya.`],
      [`Pemindai kunci produksi atas file konfigurasi staging.`, 0, `Pemindai membaca file, bukan image. Di staging.txt bagian B ia menemukan dua kunci produksi di dua file contoh dan keluar dengan status 1. Pemindaian seluruh konfigurasi dan state IaC Tidak dijalankan.`],
    ];
    expect(pilah.judul).toBe("Jalan di PR, atau di rilis sesudah merge?");
    expect(pilah.item.map((i) => [i.teks, i.jawab, i.kenapa])).toEqual(HARAP);
    expect(pilah.penutup).toBe("Pemeriksaan yang cukup membaca file berjalan di PR. Pemeriksaan yang butuh image atau basis data kerentanan hari ini berjalan sesudah merge. Pembagian ini keputusan halaman ini (Ilustrasi): lab hanya merekam alatnya, bukan CI yang memanggilnya.");
    expect(Object.keys(pilah).sort()).toEqual(["item", "judul", "kelompok", "penutup"]);
  });
  test("diagram inti: dua baris tiga simpul; angka, nama enum, exit code, dan digest dari rekaman", () => {
    const exit = cocok(kontrakApi, /\(exit code (\d+)\)\s*$/)[1];
    const digestD = cocok(ttC2, /tanda tangan memuat digest <digest (\w)>\n\(exit code 0\)\ngerbang image \(dibangun <digest C>\): GAGAL \(referensi/)[1];
    expect(inti).toEqual({
      id: "t4-tim-infra-inti", judul: "Kontrak ditahan, tag yang dipindah ditolak", sumber: { jenis: "rekaman", teks: "Rekaman lab api-t4 dan t4-pipeline" },
      baris: [
        { label: "Di PR", sub: "kontrak api-t3 ke api-t4", simpul: [
          { teks: "enum ditambah", sub: `jenis: ${ENUM_BARU.join(", ")}`, nada: "biasa", kode: false },
          { teks: `oasdiff: ${API_RINGKAS[2]} error`, sub: "respons GET /akun/{id}", nada: "warn", kode: false },
          { teks: "gerbang gagal", sub: `exit code ${exit}`, nada: "good", kode: false },
        ] },
        { label: "Di rilis", sub: "tag dipindah sebelum ditandatangani", simpul: [
          { teks: "tag dipindah dulu", sub: "ke image lain", nada: "biasa", kode: false },
          { teks: "verify tag lulus", sub: `memuat digest ${digestD}`, nada: "warn", kode: false },
          { teks: `digest ${digestD} ditolak`, sub: "bukan hasil build CI", nada: "good", kode: false },
        ] },
      ],
      catatan: "Kedua baris adalah rekaman. Pipeline GitHub Actions yang memanggil alat itu Tidak dijalankan: lab menjalankan alat dan gerbangnya, bukan CI.",
    });
    expect(digestD).toBe("D");
  });
  test("diagram pipeline: sepuluh simpul; tujuh Rekaman lab dan dua Tidak dijalankan; nama alat sama dengan yang dipakai halaman; label dan sub tiap baris", () => {
    expect(pipeline.id).toBe("t4-tim-infra-pipeline");
    expect(pipeline.judul).toBe("Pipeline per modul: pemeriksaan di PR dan pemeriksaan sesudah merge");
    expect(pipeline.sumber.teks).toBe("Pembagian PR dan rilis adalah keputusan halaman ini. Tiap alat direkam lab t4-pipeline dan api-t4, kecuali kotak abu-abu");
    expect(pipeline.catatan).toBe("Kotak hijau punya rekaman lab, kotak abu-abu hanya dicek ke dokumentasi. Workflow yang menjalankan semuanya Tidak dijalankan.");
    expect(pipeline.baris.map((b) => [b.label, b.sub])).toEqual([["Di PR", "menurut file yang berubah"], ["Sesudah merge", "atas image yang dibangun CI"]]);
    const s = pipeline.baris.flatMap((b) => b.simpul);
    expect(s.map((n) => [n.teks, n.sub, n.nada])).toEqual([
      ["go vet dan tes modul", "Rekaman lab", "good"], ["oasdiff breaking", "Rekaman lab", "good"], ["client Dart dibuat ulang", "Rekaman lab", "good"],
      ["gosec dan govulncheck", "Rekaman lab", "good"], ["pemindai kunci produksi", "dua file contoh", "good"],
      ["SBOM image dan grype", "Rekaman lab", "good"], ["cosign sign atas digest", "Rekaman lab", "good"], ["verifikasi digest", "Rekaman lab", "good"],
      ["deploy blue/green", "Tidak dijalankan", "old"], ["rilis app bertahap", "Tidak dijalankan", "old"],
    ]);
    expect(testingApi).toContain("$ go vet ./...");
    expect(klien).toContain("openapi-generator-cli 7.26.0");
    expect(staging).toContain("$ pindairahasia");
  });
});

describe("kalimat bernomor di halaman diturunkan: versi alat, nomor masalah, bab buku SRE, id advisory, urutan tautan, hitungan R4-239", () => {
  const versi = (alat: string): string => cocok(readme.slice(readme.indexOf("## Versi dan asal alat")), new RegExp(`^\\| ${alat} \\| (v[\\d.]+)`, "m"))[1]!;
  test("urutan tautan [[id]] di seluruh halaman, satu per satu", () => {
    expect([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1])).toEqual([
      "t4-modul", "t3-tim-infra", "berikutnya", "t4-modul", "t4-modul", "t4-modul", "t4-modul", "t4-modul", "t1-adr-12", "E1", "E1", "t3-tim-infra", "t4-rekonsiliasi", "t4-breaker",
      "t3-tim-infra", "t4-m32", "t4-m34", "t4-prd", "t4-m34", "t4-infra-secret", "t4-ssrf", "t3-tim-infra", "t1-secret", "t2-skema-tanpa-downtime", "t4-modul", "t4-m32", "t4-adr-45", "t4-adr-45",
    ]);
  });
  test("versi cosign dan oasdiff di kalimat sama dengan README; nomor masalah di Status sama dengan registry; kejadian M32 dan M34", () => {
    harus(`Tanda tangan image adalah persoalan lain. cosign ${versi("cosign")} menerima tag dengan peringatan, lalu menandatangani digest yang ditunjuk tag saat itu.`);
    harus(`- Naskah menulis tanda tangani digest. cosign ${versi("cosign")} menerima tag dengan peringatan.`);
    harus(`- Naskah menulis oasdiff belum memeriksa parameter tingkat path dan \`explode\`. Itu benar untuk ${versi("oasdiff")}, tetapi \`--flatten-params\` menutup tingkat path.`);
    const nomorM = (id: string) => cocok(dari(id).label ?? "", /^Masalah (\d+) /)[1];
    harus(`**Status:** diterima sesudah M${nomorM("t4-m32")} dan M${nomorM("t4-m34")}.`);
    expect([nomorM("t4-m32"), nomorM("t4-m34")]).toEqual(["32", "34"]);
    expect(hal327).toContain("migration dry-run");
    expect(hal327).toContain("k6 smoke");
    expect(hal327).toContain("approve");
    harus("| Cara kerja | Tes dengan PostgreSQL dan Redis, migration dry-run, k6 smoke, staging, approve ([[t3-tim-infra]]) |");
    harus(`| Kekurangan | Tidak ada tes contract, SAST, SBOM, atau tanda tangan: tiga error kontrak dan ${PANGGIL.length} kerentanan dipanggil tidak terlihat |`);
    harus("| Bukti | Tidak dijalankan: dibaca dari pipeline Tahap 3. Yang terlewat: `kontrak.txt` api-t4, `sast.txt` bagian E |");
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    harus("Bedanya, di Tahap 4 backend punya tiga tim, dan satu rilis yang salah mengenai uang orang di luar Lestari.");
    harus(`Rekaman api-t4 menunjukkan perubahan nyata. Kontrak api-t3 ke api-t4 menambah tiga nilai ke enum \`jenis\`:`);
    expect(ENUM_BARU).toHaveLength(3);
  });
  test("tabel temuan security review dan baris Sengaja belum: nomor kerentanan dan id advisory dari rekaman", () => {
    const kritisTakDipanggil = TEMUAN.filter((t) => t[1] === "Critical" && TIDAK_DIPANGGIL.includes(t[0]));
    expect(kritisTakDipanggil.map((t) => t[0])).toEqual(["GO-2026-6604"]);
    harus(`| ${PANGGIL.length} kerentanan stdlib dipanggil kode api-t4 | \`sast.txt\` bagian E | memblok rilis sampai Go naik |`);
    harus(`| ${kritisTakDipanggil[0]![0]} Critical menurut grype, tetapi menurut ringkasan advisory di Windows dan tidak dipanggil | \`sbom.txt\` bagian C, \`sast.txt\` bagian E | dicatat, tidak memblok sendirian (penalaran penulis) |`);
    harus(`${STDLIB.length} − ${PANGGIL.length} = ${STDLIB.length - PANGGIL.length} (Hitungan atas dua daftar). ${kritisTakDipanggil[0]![0]} salah satunya:`);
    harus("| Staging memakai kunci gateway produksi (dugaan) | hanya pemindai atas dua file contoh, bukan kejadiannya | tidak memblok; jalankan pemindai atas konfigurasi staging yang sebenarnya |");
    for (const baris of [
      "| Keyless signing, Fulcio, dan Rekor | Lab memakai kunci sendiri. Keyless Tidak dijalankan | Belum dijadwalkan |",
      "| Provenance SLSA dan atestasi app | Hanya dijelaskan, Tidak dijalankan | [[t4-adr-45]] |",
      "| Workflow GitHub Actions per modul, branch protection, dan CODEOWNERS | Fitur GitHub, lab tidak menjalankan CI. Plan pemilik [perlu verifikasi] | Belum dijadwalkan |",
      "| Mencocokkan isi response server dengan kontrak | Lab hanya mencocokkan rute dengan kontrak | Belum dijadwalkan |",
      "| Aturan \"jalankan semua\" untuk kode bersama | Belum diputuskan | Bila PR kode bersama lolos tanpa tes |",
      "| Menaikkan Go ke 1.27.3 | Mengubah api-t4 dan semua rekamannya | Sebelum dibuka ke publik |",
      "| Client Dart yang dijalankan | Hanya kode hasil generasi yang dibaca | Belum dijadwalkan |",
    ]) harus(baris);
    expect(baca("labs/api-t4/README.md")).toContain("go1.27.3");
  });
  test("buku SRE: bab 6 dan bab 11 sama dengan alamat dan dengan baris riset; 25% dan lima gejala; Bacaan lanjut sama dengan kutipan di teks; govulncheck, NTIA, syft", () => {
    harus("Rotasi jaga mingguan berlaku per tim untuk modulnya. Buku SRE Google menulis bahwa tidak lebih dari 25% waktu seorang SRE dipakai untuk jaga ([SRE book, bab 11](https://sre.google/sre-book/being-on-call/), dibuka 2026-10-30).");
    harus("Alert hanya untuk gejala yang dirasakan user. Buku SRE menulis bahwa monitoring menjawab apa yang rusak dan kenapa. Tiap page harus mendesak, bisa ditindaklanjuti, dan terlihat user ([SRE book, bab 6](https://sre.google/sre-book/monitoring-distributed-systems/), dibuka 2026-10-30).");
    harus("- [Google SRE book, bab 6: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)");
    harus("- [Google SRE book, bab 11: Being On-Call](https://sre.google/sre-book/being-on-call/)");
    const r = barisRiset("R4-238");
    expect(r).toContain("SRE book bab 11 (sre.google/sre-book/being-on-call/)");
    expect(r).toContain("bab 6 (sre.google/sre-book/monitoring-distributed-systems/)");
    harus("Dokumentasi govulncheck menulis bahwa alat itu keluar dengan kode 0 untuk format JSON, SARIF, dan OpenVEX, berapa pun kerentanan yang ditemukan");
    harus("SBOM adalah catatan komponen yang dipakai membangun software (NTIA, 2021).");
    harus("README syft menulis bahwa alat itu menghasilkan SBOM, dan sangat baik untuk deteksi kerentanan bila dipasangkan dengan pemindai seperti grype");
    harus("- [GHSA-mrrh-fwg8-r2c3: tj-actions/changed-files](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)");
    for (const m of badan.slice(badan.indexOf("### Bacaan lanjut")).matchAll(/^- \[[^\]]+\]\((https[^)]+)\)/gm)) expect(badan.slice(0, badan.indexOf("### Bacaan lanjut")), m[1]).toContain(m[1]!);
    harus("aman=\"Kalau berhenti di sini, kamu sudah tahu: pemeriksaan yang cukup membaca file berjalan di PR, dan pemeriksaan yang butuh image atau basis data kerentanan hari ini berjalan sesudah merge.\"");
    expect(frontmatter).toContain("description: Tiga tim merilis ke uang publik lewat pipeline yang memeriksa tiap modul, tiap kontrak, dan tiap image. ADR 44 memilih pemeriksaan per modul dan tanda tangan atas digest, lalu menulis kapan pilihan itu salah.");
  });
  test("baris riset R4-239: tiap persamaan dihitung ulang, dan angka sama dengan rekaman, README, dan halaman", () => {
    const r = barisRiset("R4-239");
    const j = cocok(r, /(\d+) \+ (\d+) \+ (\d+) = (\d+)/);
    expect([Number(j[1]), Number(j[2]), Number(j[3])]).toEqual([TIM.Pembayaran, TIM.Merchant, TIM.Platform]);
    expect(Number(j[1]) + Number(j[2]) + Number(j[3])).toBe(Number(j[4]));
    const b = cocok(r, /(\d[\d.]*) x (\d+) \/ (\d[\d.]*) x (\d+) = ([\d,]+) dan (\d[\d.]*) x (\d+) \/ (\d[\d.]*) x (\d+) = ([\d,]+)/);
    const n = (s: string) => Number(s.replace(/\./g, ""));
    expect(((n(b[1]!) * n(b[2]!)) / n(b[3]!)) * n(b[4]!)).toBeCloseTo(Number(b[5]!.replace(",", ".")), 1);
    expect(((n(b[6]!) * n(b[7]!)) / n(b[8]!)) * n(b[9]!)).toBeCloseTo(Number(b[10]!.replace(",", ".")), 2);
    expect([n(b[1]!), n(b[6]!)]).toEqual([AKTIF, AKTIF]);
    const s = cocok(r, /(\d+) stdlib - (\d+) dipanggil = (\d+) tidak dipanggil/);
    expect([Number(s[1]), Number(s[2]), Number(s[3])]).toEqual([STDLIB.length, PANGGIL.length, TIDAK_DIPANGGIL.length]);
    const g = cocok(r, /grype (\d+) temuan = (\d+) Unknown \+ (\d+) Critical \+ (\d+) High \+ (\d+) Medium/);
    expect([Number(g[1]), Number(g[2]), Number(g[3]), Number(g[4]), Number(g[5])]).toEqual([TEMUAN.length, per("Unknown"), per("Critical"), per("High"), per("Medium")]);
    const w = cocok(r, /1\/(\d) = (\d+)%, 1\/(\d) = (\d+)%, 1\/(\d) = (\d+)%/);
    for (const [d, p] of [[w[1], w[2]], [w[3], w[4]], [w[5], w[6]]]) expect(Math.round(100 / Number(d))).toBe(Number(p));
    expect([Number(w[1]), Number(w[3]), Number(w[5])]).toEqual([TIM.Pembayaran, TIM.Merchant, 3]);
    const ri = cocok(r, /20\.000 x \(([^)]+)\) = ([\d., ]+) \(batas atas/);
    const pers = ri[1]!.split(", ").map((p) => Number(p.replace("%", "")));
    expect(pers.map((p) => rib((AKTIF * p) / 100))).toEqual(ri[2]!.split(", "));
    expect(r).toContain("(1 dari 13)");
    expect(readme).toContain("13 file di `labs/api-t4`");
    expect(r).toContain("Daftar 13 file PR lab audit");
    expect(r).toContain("gh pr view 416");
  });
});

describe("tabel ADR 44, tabel jaga, dan baris riset: sel demi sel dan silang rujukan", () => {
  test("tabel opsi A, B, C dan tabel keputusan lain sama sel demi sel; angka di sel dari rekaman", () => {
    expect(tabelSetelah("Keputusan pipeline punya tiga opsi:")).toEqual([
      [``, `A. Pipeline Tahap 3 saja`, `B. Semua pemeriksaan di setiap PR untuk seluruh repo`, `C. Per modul`],
      [`Cara kerja`, `Tes dengan PostgreSQL dan Redis, migration dry-run, k6 smoke, staging, approve ([[t3-tim-infra]])`, `Satu workflow menjalankan tes, SAST, SBOM, dan pindai atas seluruh repo di tiap PR`, `File yang berubah memilih langkah di PR, dan pemeriksaan atas image berjalan sesudah merge`],
      [`Kelebihan`, `Tidak ada pekerjaan baru`, `Tidak ada aturan pemetaan yang bisa salah, dan kode bersama ikut diperiksa`, `PR cepat, dan pemilik modul melihat hasil modulnya`],
      [`Kekurangan`, `Tidak ada tes contract, SAST, SBOM, atau tanda tangan: tiga error kontrak dan ${PANGGIL.length} kerentanan dipanggil tidak terlihat`, `Lambat, dan tim cenderung menghindarinya (Asumsi naskah)`, `Kode bersama belum terpetakan, dan filter path bisa menahan merge`],
      [`Biaya operasional`, `Nol`, `Waktu tunggu tiap PR, tidak diukur`, `Aturan pemetaan yang harus dites dan dirawat, ditambah satu job penentu`],
      [`Bukti`, `Tidak dijalankan: dibaca dari pipeline Tahap 3. Yang terlewat: \`kontrak.txt\` api-t4, \`sast.txt\` bagian E`, `Tidak dijalankan: waktu pipeline tidak diukur`, `Rekaman lab t4-pipeline dan \`tes_gerbang.py\``],
    ]);
    expect(tabelSetelah("Keputusan lain punya opsi sendiri:")).toEqual([
      [`Keputusan`, `Dipilih`, `Ditolak`, `Kenapa ditolak`],
      [`Tanda tangan image`, `cosign atas digest`, `Tanda tangan atas tag`, `Tag bisa dipindah sebelum ditandatangani (\`tanda-tangan.txt\` bagian C)`],
      [`Gerbang pemindai`, `Membaca keluaran terstruktur dan menolak pemindaian tidak lengkap`, `Memercayai exit code alat`, `Tiga pemindai lulus palsu (\`sast.txt\` bagian B, \`sbom.txt\` bagian B, dokumentasi govulncheck)`],
      [`Rilis app`, `Bertahap lewat store`, `Rilis ke semua user sekaligus`, `Hari pertama iOS paling banyak 200 dari 20.000 user aktif, lawan 20.000 (Hitungan)`],
    ]);
  });
  test("tabel jaga: judul kolom memuat batas 25% dari buku SRE; bullet 'aturan 4' menunjuk aturan pemindai kunci", () => {
    expect(tabelSetelah("jadi tabel ini menghitung pembagian minggu:")[0]).toEqual(["Tim", "Orang", "Minggu jaga per orang", `Terhadap batas ${cocok(barisRiset("R4-238"), /no more than (\d+)% can be spent on-call/)[1]}%`]);
    const aturan = [...badan.slice(badan.indexOf("**Keputusan: opsi C, dengan sembilan aturan.**"), badan.indexOf("**Belum diputuskan.**")).matchAll(/^(\d+)\. (.+)$/gm)];
    const nomorPemindai = aturan.find((m) => m[2]!.startsWith("Pemindai kunci produksi"))![1];
    harus(`jadi aturan ${nomorPemindai} menambahkannya.`);
    expect(nomorPemindai).toBe("4");
  });
  test("baris riset: kolom halaman memuat 4.26; rujukan silang ke R4-04 dan R4-318 ada barisnya; hitungan beban dari rumus (satu desimal); jumlah tanggal akses per baris", () => {
    for (const i of ["R4-235", "R4-236", "R4-237", "R4-238", "R4-239"]) expect(barisRiset(i).split(" | ")[3], i).toContain("4.26");
    expect(barisRiset("R4-236")).toContain("(R4-04, R4-318)");
    expect(barisRiset("R4-04")).toContain("CODEOWNERS");
    expect(barisRiset("R4-318")).toContain("CODEOWNERS");
    expect(barisRiset("R4-236")).toContain("mengembalikan 404 (2026-10-30)");
    const b = cocok(barisRiset("R4-239"), /(\d[\d.]*) x (\d+) \/ (\d[\d.]*) x (\d+) = ([\d,]+) dan (\d[\d.]*) x (\d+) \/ (\d[\d.]*) x (\d+) = ([\d,]+)/);
    const n = (s: string) => Number(s.replace(/\./g, ""));
    expect((((n(b[1]!) * n(b[2]!)) / n(b[3]!)) * n(b[4]!)).toFixed(1).replace(".", ",")).toBe(b[5]);
    expect((((n(b[6]!) * n(b[7]!)) / n(b[8]!)) * n(b[9]!)).toFixed(2).replace(".", ",")).toBe(b[10]);
    const tgl = (i: string) => (barisRiset(i).match(/2026-10-30/g) ?? []).length;
    expect(["R4-235", "R4-236", "R4-237", "R4-238", "R4-239"].map(tgl)).toEqual([2, 2, 5, 1, 1]);
    expect(barisRiset("R4-239")).toContain("(gh pr view 416, 2026-10-30)");
    expect(barisRiset("R4-239")).toContain("labs/api-t4/cmd/api/main.go");
    expect(barisRiset("R4-238")).toContain("Dart 3.6.0");
  });
});

const daun = (o: unknown, jalur = ""): [string, string | number | boolean][] => {
  if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") return [[jalur, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
  return [];
};
const PENENTU = [
  "tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "[perlu verifikasi]", "lulus", "gagal", "ditolak", "menolak", "memblok", "PR", "rilis", "digest", "tag", "SBOM", "SAST", "ERR", "INFO", "WARN", "exit code", "oasdiff", "gosec", "govulncheck", "grype", "cosign", "syft", "Critical", "High", "Medium", "Unknown", "dipanggil", "penalaran", "dugaan", "ADR 44", "ADR 12", "ADR 10", "ADR 11", "Raka", "Nadia", "Wulan", "Bayu", "Laras", "Pak Hadi", "13", "5", "4", "10", "12", "14", "15", "17", "20.000", "138,9", "6,94", "20%", "25%", "33%", "200", "258", "23.000", "1.000", "2.000", "4.000", "10.000", "30 detik", "60 detik", "7 hari", "30 hari", "bagian A", "bagian B", "bagian C", "bagian D", "bagian E", "lebih", "kurang", "paling", "bisa", "wajib", "boleh", "memicu", "tidak ada",
];
const profil = (teks: string): string =>
  PENENTU.map((k) => {
    const n = (teks.match(new RegExp(`(?<![\\p{L}-])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}-])`, "gu")) ?? []).length;
    return n ? `${k}:${n}` : "";
  }).filter(Boolean).join(" ");

describe("nilai terkunci terpisah dari kalimat: profil kata penentu per baris, dan kalimat terkunci", () => {
  test("profil kata penentu tiap baris badan (polaritas, urutan waktu, bilangan, tokoh, label sumber) sama dengan nilai terkunci", () => {
    const baris = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(baris.map(profil)).toEqual(PROFIL_BARIS);
  });
  test("baris badan, tidak kosong, sama dengan KALIMAT_TERKUNCI (urutan dan isi)", () => {
    const baris = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
  test("tidak ada prosa di luar daftar kunci: tiap baris badan yang bukan tabel, kode, atau komponen adalah kalimat terkunci", () => {
    const baris = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const prosa = baris.filter((b) => !/^(\||<|```|\{|\)\)|\[|import )/.test(b));
    for (const b of prosa) expect(KALIMAT_TERKUNCI, b.slice(0, 60)).toContain(b);
    expect(prosa.length).toBeGreaterThan(60);
  });
});
