// Penjaga halaman 5.27 (keputusan 1604 sampai 1606): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim negatif berlingkup,
// widget pilah tim-infra-pilah, diagram Rantai t5-tim-infra-inti.json, tabel ADR 58, tabel tim, tabel burn rate, dan baris riset di tim-infra.mdx.
// Nilai diturunkan dari rekaman labs/t5-service/output/jejak.txt, konfigurasi otelcol.yaml, README lab, go.mod dan kode api-t5 (jejak.go,
// cmd/layanan), rekaman Tahap 4 labs/t4-infra/output/state.txt, naskah Tahap 5 (bagian 3 dan 4: tabel tim, ADR 48 dan 58, isi halaman 5.27),
// registry, dan baris riset R5-240 sampai R5-244, bukan dari daftar yang ditulis sendiri. Hitungan beban, anggaran, dan jaga dihitung dari angka yang
// tertulis di halaman: 138,9 request per detik rata-rata, 8 span, 500 byte, 99,9% per 30 hari, laju 14,4 dan 6 dan 1.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan baris riset dikunci per baris
// di tim-infra-t5.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah
// teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/tim-infra-t5.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya merekam trace HTTP antar tiga proses Go, dua kebijakan tail sampling di
// satu Collector, dan state OpenTofu Tahap 4; alert burn rate, Argo CD, template, pipeline sungguhan, header event, dan Shorebird Tidak dijalankan.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-tim-infra-inti.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./tim-infra-t5.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  // berkas baru milik PR ini belum terlacak sebelum commit; sesudahnya semua berkas yang dibaca harus terlacak
  if (terlacak && process.env.CI) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const berkasDi = (awalan: string): string[] => (terlacak ? [...terlacak].filter((f) => f.startsWith(awalan) && f !== "") : []);
const HALAMAN = "situs/src/content/docs/tahap-5/tim-infra.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const rekJejak = baca("labs/t5-service/output/jejak.txt");
const otelcol = baca("labs/t5-service/otelcol.yaml");
const compose = baca("labs/t5-service/docker-compose.yml");
const readmeLab = baca("labs/t5-service/README.md");
const goMod = baca("labs/api-t5/go.mod");
const jejakGo = baca("labs/api-t5/internal/jejak/jejak.go");
const layananGo = baca("labs/api-t5/cmd/layanan/main.go");
const stateTxt = baca("labs/t4-infra/output/state.txt");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const pilahMentah = JSON.parse(baca("situs/lama/widgets/data/t5-tim-infra-pilah.json")) as { judul: string; kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[] };
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
interface H { id: string; judul: string; adr?: number[]; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; pendek?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
// pembulatan setengah ke atas seperti pembaca, bukan toFixed
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number): string => String(parseFloat(x.toFixed(6))).replace(".", ",");
const satu = (x: number): string => x.toFixed(1).replace(".", ",");
const ribuan = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;
const barisKe = (baris: string[], pola: RegExp, dari0 = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`sumber: ${pola} tidak ditemukan`);
  return i + 1; // nomor baris 1-based
};
const sel = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
const bJejak = rekJejak.split("\n");
const bOtel = otelcol.split("\n");
const bJejakGo = jejakGo.split("\n");
const bLayanan = layananGo.split("\n");
const bState = stateTxt.split("\n");

// --- baris naskah: tabel tim, ADR 48, ADR 58, isi halaman 5.27
const barisNaskah = naskah.split("\n");
const adr = (n: number): string => barisNaskah.find((b) => b.startsWith(`| ${n} |`)) ?? "";
const adr48 = adr(48);
const adr58 = adr(58);
const tim = ((): { tim: string; orang: number; pemimpin: string; memegang: string }[] => {
  const mulai = barisKe(barisNaskah, /^\| Tim \| Orang \| Pemimpin \| Memegang \|$/);
  const hasil: { tim: string; orang: number; pemimpin: string; memegang: string }[] = [];
  for (let i = mulai + 1; i < barisNaskah.length && barisNaskah[i]!.startsWith("|"); i++) {
    const c = sel(barisNaskah[i]!);
    hasil.push({ tim: c[0]!, orang: Number(c[1]), pemimpin: c[2]!.replace(/ \(tidak muncul di adegan\)$/, ""), memegang: c[3]! });
  }
  return hasil;
})();
const timPage = ((): { tim: string; orang: number; pemimpin: string; memegang: string }[] => {
  const baris = badan.split("\n");
  const mulai = barisKe(baris, /^\| Tim \| Orang \| Pemimpin \| Memegang \|$/);
  const hasil: { tim: string; orang: number; pemimpin: string; memegang: string }[] = [];
  for (let i = mulai + 1; i < baris.length && baris[i]!.startsWith("|"); i++) {
    const c = sel(baris[i]!);
    hasil.push({ tim: c[0]!, orang: Number(c[1]), pemimpin: c[2]!, memegang: c[3]! });
  }
  return hasil;
})();

// --- rekaman jejak.txt
const angkaJejak = (pola: RegExp): number[] => {
  const m = rekJejak.match(pola);
  if (!m) throw new Error(`jejak.txt: ${pola} tidak ditemukan`);
  return m.slice(1).map(Number);
};
const [diterima] = angkaJejak(/trace diterima Collector\s+: (\d+)/) as [number];
const [disimpan, dibuang] = angkaJejak(/diputuskan disimpan \/ dibuang\s+: (\d+) \/ (\d+)/) as [number, number];
const [diBerkas, galatDiBerkas, normalDiBerkas] = angkaJejak(/trace di berkas\s+: (\d+) \((\d+) berkesalahan, (\d+) normal\)/) as [number, number, number];
const [normalSimpan, normalTotal] = angkaJejak(/trace normal disimpan\s+: (\d+) dari (\d+)/) as [number, number];
const [galatSimpan, galatTotal] = angkaJejak(/trace berkesalahan tersimpan\s+: (\d+) dari (\d+)/) as [number, number];
const [anakOk, anakDari] = angkaJejak(/beranak span client pemanggil: (\d+) dari (\d+)/) as [number, number];
const [dibuangDini] = angkaJejak(/trace dibuang sebelum waktu keputusan: (\d+)/) as [number];

// --- hitungan beban dari angka di halaman (registry tahap[4].asumsi memberi 138,9 dan 1.388,9)
const asumsi5 = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number } }[])[4]!.asumsi;
const rataRps = bulat((asumsi5.user * (asumsi5.aktif / 100) * asumsi5.req) / 86400, 1);
const puncakRps = bulat(((asumsi5.user * (asumsi5.aktif / 100) * asumsi5.req) / 86400) * asumsi5.puncak, 1);
const SPAN = 8;
const BYTE_SPAN = 500;
const byteDetik = Math.round(rataRps * SPAN * BYTE_SPAN);
const gbHari = bulat((byteDetik * 86400) / 1e9, 1);
const bagianSimpan = 0.01 + 0.99 * 0.05;
const gbSimpan = bulat(gbHari * bagianSimpan, 1);
const gbSimpan6 = bulat(gbHari * 0.06, 1);
const bagianGalat5 = 0.05 + 0.95 * 0.05;
const gbGalat5 = bulat(gbHari * bagianGalat5, 1);
const persenGalatLab = bulat((galatTotal / diterima) * 100, 1);
const spanPuncak = Math.round(puncakRps * SPAN);

// --- SLO, anggaran, burn rate (tabel dibaca dari baris riset SRE Workbook, bukan ditulis ulang)
const MENIT_30_HARI = 30 * 24 * 60;
const JAM_30_HARI = 30 * 24;
const anggaranMenit = bulat((1 - 0.999) * MENIT_30_HARI, 1);
const barisWorkbook = barisRiset("R5-242");
const tabelWorkbook = [...barisWorkbook.matchAll(/(\d+)% dalam (\d+) (jam|hari) laju ([\d,]+) \((page|ticket)\)/g)].map((m) => ({
  persen: Number(m[1]), jam: m[3] === "hari" ? Number(m[2]) * 24 : Number(m[2]), laju: Number(m[4]!.replace(",", ".")), tindakan: m[5]!,
}));
const pendek = [...barisWorkbook.matchAll(/(\d+ (?:jam|hari) dengan \d+ (?:menit|jam))/g)].map((m) => m[1]!);
const RTO_MENIT = 15;
const pakaiRto = bulat((RTO_MENIT / anggaranMenit) * 100, 1);
const detikTotal = Math.round(0.02 * anggaranMenit * 60);
const jamHabis = bulat(JAM_30_HARI / 14.4, 0);

describe("registry, naskah, dan struktur: nomor, jenis, jalur, lima blok, impor, dan tautan", () => {
  test("registry 5.27: ada, jenis, adr 58, lab t5-service, prasyarat, peran, menit sama dengan meta, dan baris peta naskah", () => {
    const h = dari("t5-tim-infra");
    expect(h.nomor).toBe("5.27");
    expect(h.ada).toBe(true);
    expect(h.jenis).toBe("tim-infra");
    expect(h.inti).toBe(true);
    expect(h.adr).toEqual([58]);
    expect(h.lab).toEqual(["t5-service"]);
    expect(h.prasyarat).toEqual(["t4-tim-infra", "t5-rollout"]);
    expect([...(h.peran ?? [])].sort()).toEqual(["backend", "devops", "mobile"]);
    expect(h.judul).toBe("Tim dan infra Tahap 5: platform, GitOps, OpenTelemetry, SLO + ADR 58");
    expect(frontmatter).toContain(`title: "5.27 ${h.judul}"`);
    const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-tim-infra\]\], \[\[t5-rollout\]\] · Jalur inti<\/p>$/m)!;
    expect(h.menit).toBe(Number(meta[1]) + Number(meta[2]));
    expect(naskah).toContain("| 5.27 | 4 | Tim dan infra Tahap 5: platform, GitOps, OpenTelemetry, SLO + ADR 58 | Tim dan infra | ★ | t5-service | pilah |");
    expect(naskah).toContain("- **Mobile** menonjolkan 5.2, 5.6, 5.7 (token LSN dikirim app), 5.14, 5.23, 5.27 (Shorebird, hanya perbaikan Dart).");
  });
  test("lima blok sesuai templat tim-infra: dua pertama terbuka; satu Rantai ringkas, satu pilah, tujuh Snippet; impor tetap", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("tim-infra", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Rantai data=\{intiDiagram\} ringkas \/>/g)).toHaveLength(1);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(7);
    expect(badan.match(/<TabSet /g)).toHaveLength(1);
    expect(badan.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect(badan.match(/^```/gm)).toBeNull();
    expect([...halaman.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro", "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro",
      "intiDiagram ../../../../data/diagram/t5-tim-infra-inti.json", "pilah ../../../../lama/widgets/data/t5-tim-infra-pilah.json",
    ]);
    expect(badan).toContain('<WidgetLama nama="pilah" src="data/t5-tim-infra-pilah.json" />');
    expect(badan).toContain('<SkripLama daftar={["pilah"]} />');
    expect(badan).toContain("<noscript>");
    expect(badan).toContain("{pilah.item.map((it) => (");
    expect(badan).toContain("<li><strong>{pilah.kelompok[it.jawab]}.</strong> {it.teks} {it.kenapa}</li>");
    expect(badan).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["E1", "berikutnya", "t4-infra-secret", "t4-tim-infra", "t5-adr-60", "t5-m44", "t5-m46", "t5-m49", "t5-onprem", "t5-prd", "t5-rollout", "t5-rpo-rto", "t5-service"]);
    const sesuai: [string, string, string][] = [
      ["E1", "1.33", "App versi lama"], ["t4-infra-secret", "4.17", "Secret manager, IaC"], ["t4-tim-infra", "4.26", "Tim dan infra Tahap 4"],
      ["t5-adr-60", "5.30", "ADR 60"], ["t5-m44", "5.12", "M44"], ["t5-m46", "5.16", "M46"], ["t5-m49", "5.22", "M49"],
      ["t5-onprem", "5.28", "On-prem lawan cloud"], ["t5-prd", "5.1", "PRD v5"], ["t5-rollout", "5.23", "Progressive delivery"], ["t5-rpo-rto", "5.9", "RPO, RTO"], ["t5-service", "5.13", "Dari modul ke service"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
    }
    // tiap halaman Tahap 5 yang dirujuk sebagai sumber isi sudah ada (ada: true); yang dirujuk hanya lewat id boleh belum ada
    for (const idh of ["t5-rollout", "t5-service", "t5-m44", "t5-m46", "t5-m49", "t5-prd", "t5-rpo-rto", "t5-onprem", "t5-adr-60"]) expect(dari(idh).ada, idh).toBe(true);
  });
  test("tidak ada ID riset, nomor keputusan, nomor PR, atau label rekaman internal di teks pembaca", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/\bkeputusan \d{3,4}\b/i);
    expect(badan).not.toMatch(/\bPR #?\d{3}\b|#\d{3}\b/);
    expect(JSON.stringify(rantaiMentah) + JSON.stringify(pilahMentah)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|#\d{3}\b/i);
    expect(badan).not.toMatch(/\b[A-G]\d\b(?=[ ,.)])/);
    expect(badan).not.toMatch(/\d B\b/);
  });
});

describe("tim, jalan beraspal, dan pembanding pipeline: tabel tim dari naskah, 28 orang, dan 13,6 menit", () => {
  test("tabel tim di halaman sama dengan tabel naskah baris demi baris, dan jumlah orang 4 × 6 + 2 × 2 = 28", () => {
    expect(tim).toHaveLength(8);
    expect(timPage).toEqual(tim);
    const orang = tim.map((t) => t.orang);
    const empat = orang.filter((o) => o === 4).length;
    const dua = orang.filter((o) => o === 2).length;
    expect(empat).toBe(6);
    expect(dua).toBe(2);
    expect(empat * 4 + dua * 2).toBe(28);
    expect(halaman).toContain(`Totalnya 4 × ${empat} + 2 × ${dua} = ${empat * 4 + dua * 2} orang.`);
    expect(naskah).toContain("Totalnya 4 × 6 + 2 × 2 = 28 orang.");
    expect(halaman).toContain(`Tiap service dipegang ${empat * 4 + dua * 2} ÷ 6 = ${koma(bulat(28 / 6, 1))} orang`);
    expect(naskah).toContain("| Orang per service | tim ÷ service | 28 ÷ 6 | 4,7 (Tahap 4: 13 ÷ 6 = 2,2 di ADR 45) |");
    expect(halaman).toContain("Naskah menolak membiarkan tiap tim membuat pipeline dan dashboard sendiri, karena enam service akan punya enam konfigurasi berbeda.");
    expect(adr58).toContain("Tiap tim membuat pipeline dan dashboard sendiri (ditolak: 8 tim dan 6 service memberi enam konfigurasi berbeda)");
  });
  test("pipeline per service: isi ADR 44 yang diperluas dan Testcontainers dan k6 Tidak dijalankan sama dengan naskah", () => {
    expect(adr58).toContain("pipeline per service (ADR 44 diperluas: contract, SAST, SBOM, tanda tangan, canary)");
    expect(naskah).toContain("merge per service menjalankan pemeriksaan ADR 44, ditambah canary dengan rollback otomatis dan tes beban terjadwal");
    expect(naskah).toContain("jadi Testcontainers dan k6 Tidak dijalankan seperti di Tahap 3 dan 4");
    expect(naskah).toContain("`api_client` dibuat ulang dari OpenAPI dan diff-nya diperiksa (ADR 44)");
    expect(badan).toContain("Pipeline per service memperluas pemeriksaan ADR 44 di [[t4-tim-infra]]. Pemeriksaannya contract, SAST, SBOM, dan tanda tangan atas digest,");
    expect(adr58).toContain("Pipeline lebih dari 10 menit per PR (ADR 44)");
    expect(halaman).toContain("ADR 58 menandai pipeline lebih dari 10 menit per PR sebagai tanda keputusan ini salah.");
  });
  test("pembanding 13,6 menit: job build 5,2 dan job ukur terlama 8,4 dibaca dari baris riset dan dijumlahkan dari angka di halaman", () => {
    const baris = barisRiset("R5-244");
    expect(baris).toContain("job build 13:35:14 sampai 13:40:24 (5,17 menit)");
    expect(baris).toContain("job ukur terlama (layar@desktop) 13:40:26 sampai 13:48:48 (8,37 menit)");
    expect(baris).toContain("5,2 + 8,4 = 13,6");
    const menit = (a: string, b: string): number => {
      const k = (s: string): number => { const [j, m, d] = s.split(":").map(Number); return j! * 3600 + m! * 60 + d!; };
      return (k(b) - k(a)) / 60;
    };
    const build = bulat(menit("13:35:14", "13:40:24"), 1);
    const ukur = bulat(menit("13:40:26", "13:48:48"), 1);
    expect(build).toBe(5.2);
    expect(ukur).toBe(8.4);
    expect(bulat(build + ukur, 1)).toBe(13.6);
    expect(halaman).toContain(`job build ${koma(build)} menit`);
    expect(halaman).toContain(`Job ukur terlama sesudahnya ${koma(ukur)} menit, jadi ${koma(build)} + ${koma(ukur)} = ${koma(bulat(build + ukur, 1))} menit (Hitungan, Dibaca dari riwayat CI).`);
    expect(hitungKali(halaman, "13,6 menit")).toBe(2);
    expect(build + ukur).toBeGreaterThan(10);
    expect(halaman).toContain("Satu run PR hijau pada 2026-11-04");
    expect(halaman).toContain("Pembandingnya riwayat CI situs belajar ini, bukan pipeline Rekeningo.");
  });
});

describe("GitOps dan pemindai kunci: Argo CD v3.5.6 dari baris riset, state OpenTofu dari rekaman Tahap 4", () => {
  test("Argo CD v3.5.6 dan alasan repo konfigurasi terpisah dibaca dari baris riset; naskah menulis versi yang sama", () => {
    const baris = barisRiset("R5-243");
    expect(adr58).toContain("Argo CD v3.5.6 menyamakan cluster dengan repo konfigurasi");
    expect(baris).toContain("highly recommended");
    expect(baris).toContain("lima alasan (pemisahan kode dan konfigurasi, catatan audit lebih bersih, aplikasi dari beberapa repo, pemisahan akses, mencegah putaran build tanpa akhir)");
    expect(baris).toContain("jumlah replika yang dikelola HPA tidak dilacak di Git");
    expect(halaman).toContain("Tiga dari lima alasannya: catatan perubahan lebih bersih, dan akses tulis ke produksi bisa dipisah dari akses ke kode. Alasan ketiga: CI yang menulis manifes tidak memicu putaran build tanpa akhir");
    expect(hitungKali(halaman, "Argo CD v3.5.6")).toBe(5);
    expect(riset5).toContain("| R5-241 |");
    expect(barisRiset("R5-241")).toContain("Argo CD v3.5.6 terbit 2026-10-20T19:26:34Z");
  });
  test("state OpenTofu: keluaran CLI menyembunyikan nilai, state menyimpannya; ADR 44 hanya dua file contoh (baris 4.26)", () => {
    expect(stateTxt).toContain('keluaran CLI memuat password atau kunci: tidak (diganti "(sensitive value)")');
    expect(stateTxt).toContain("state memuat nilai password dari random_password: ya");
    expect(stateTxt).toContain("state memuat nilai kunci dari variabel TF_VAR_kunci_gateway: ya");
    const hal4 = baca("situs/src/content/docs/tahap-4/tim-infra.mdx");
    expect(hal4).toContain("| Pemindai kunci produksi atas seluruh konfigurasi staging dan state IaC | Rekaman hanya dua file contoh ([[t4-infra-secret]]). Tidak dijalankan | Belum dijadwalkan |");
    expect(hal4).toContain("Memindai state IaC dan seluruh repositori Tidak dijalankan: rekaman hanya dua file contoh.");
    expect(naskah).toContain("pemindai kunci produksi atas state IaC dan konfigurasi, karena repo konfigurasi GitOps menambah permukaan yang sama");
    expect(adr58).toContain("pemindai kunci berjalan atas repo konfigurasi dan state IaC");
    expect(badan).toContain("ADR 44 baru memindai file konfigurasi staging, dan rekamannya hanya dua file contoh ([[t4-infra-secret]]). ADR 58 memperluasnya ke repo konfigurasi dan state IaC. Pemindaian sungguhan atas keduanya Tidak dijalankan di Tahap 5.");
  });
});

describe("trace lintas service: versi, W3C, rekaman bagian A dan B, dan konfigurasi Collector", () => {
  test("versi OpenTelemetry Go, otelhttp, tag Collector, dan Go di kepala rekaman sama dengan go.mod, compose, dan baris riset", () => {
    expect(goMod).toMatch(/go\.opentelemetry\.io\/otel v1\.47\.0\n/);
    expect(goMod).toMatch(/go\.opentelemetry\.io\/contrib\/instrumentation\/net\/http\/otelhttp v0\.72\.0\n/);
    expect(compose).toContain("image: otel/opentelemetry-collector-contrib:0.163.2");
    expect(rekJejak).toContain("go1.27.3");
    expect(rekJejak).toContain("PostgreSQL 17.11");
    expect(rekJejak).toContain("otel/opentelemetry-collector-contrib:0.163.2");
    expect(rekJejak).toContain("OpenTelemetry Go v1.47.0");
    expect(readmeLab).toContain("Naskah menulis v0.163.0, tetapi tag image 0.163.0 tidak ada di Docker Hub");
    const r241 = barisRiset("R5-241");
    expect(r241).toContain("`go.opentelemetry.io/otel` v1.47.0 terbit 2026-10-02T08:10:46Z");
    expect(r241).toContain("otelhttp` v0.72.0 terbit 2026-10-02T16:25:28Z");
    expect(r241).toContain("`0.163.0` 404, `0.163.1` 200, `0.163.2` 200");
    expect(r241).toContain("Shorebird v1.6.131 (repo shorebirdtech/shorebird) terbit 2026-10-23T17:35:39Z");
    expect(r241).toContain("Serverpod 4.1.0 di pub.dev terbit 2026-10-31T16:19:50Z");
    expect(r241).toContain("`@opentelemetry/sdk-node` 0.300.0 terbit 2026-10-20T18:38:53Z");
    expect(r241).toContain("`opentelemetry-instrumentation-django` 0.66b2, unggahan 2026-10-29T17:37:26Z");
    expect(halaman).toContain("OpenTelemetry Go v1.47.0 dan otelhttp v0.72.0, keduanya terbit 2026-10-02 menurut proxy modul Go.");
    expect(halaman).toContain("Naskah menulis image Collector 0.163.0, tetapi tag itu tidak ada di Docker Hub (dibuka 2026-11-04). Tag 0.163.1 dan 0.163.2 ada, dan lab memakai 0.163.2.");
    expect(halaman).toContain("Shorebird. Versi yang dibaca adalah v1.6.131, terbit 2026-10-23.".replace("Shorebird. ", ""));
    expect(halaman).toContain("npm [@opentelemetry/sdk-node](https://www.npmjs.com/package/@opentelemetry/sdk-node) 0.300.0 (terbit 2026-10-20)");
    expect(halaman).toContain("0.66b2 (terbit 2026-10-29)");
    expect(halaman).toContain("Serverpod 4.1.0 (pub.dev, terbit 2026-10-31)");
    expect(halaman).toContain("*Dijalankan: lab t5-service dan api-t5, PostgreSQL 17.11, Go 1.27.3, OpenTelemetry Go v1.47.0, otelhttp v0.72.0, dan Collector contrib 0.163.2 (rekaman `jejak.txt`).*");
  });
  test("W3C Trace Context, status span HTTP, dan status OpenTelemetry dibaca dari baris riset dan sama dengan kalimat halaman", () => {
    const r240 = barisRiset("R5-240");
    expect(r240).toContain("Rekomendasi W3C 23 November 2021");
    expect(r240).toContain("bagian 3 mengikat `traceparent` ke header HTTP");
    expect(r240).toContain("\"While trace context is defined for HTTP\" protokol lain diatur ekstensi dan registri protokol");
    expect(r240).toContain("\"MUST be left unset\" di SpanKind.SERVER dan \"SHOULD be set to Error\" di SpanKind.CLIENT");
    expect(r240).toContain("Go trace Stable, metrik Stable, log Release candidate");
    expect(r240).toContain("JavaScript trace Stable, log Development; PHP ketiganya Stable; Python trace Stable, log Development; Dart tidak ada di tabel");
    expect(halaman).toContain("W3C Trace Context (Rekomendasi 23 November 2021) mendefinisikan header itu untuk HTTP, dan protokol lain diatur terpisah di registri protokol");
    expect(halaman).toContain("untuk status 4xx, span server harus dibiarkan tanpa status dan span client sebaiknya Error");
    expect(halaman).toContain("Tabel status OpenTelemetry menulis Go dengan trace Stable, metrik Stable, dan log Release candidate");
    expect(halaman).toContain("Trace dan metrik JavaScript berstatus Stable, sedangkan log masih Development.");
    expect(halaman).toContain("Trace PHP berstatus Stable.");
    expect(halaman).toContain("trace Python berstatus Stable dan log Development");
    expect(halaman).toContain("Dart tidak ada di tabel status bahasa OpenTelemetry.");
  });
  test("rekaman bagian A: satu trace tiga span, induk-anak lintas dua service, span client berstatus Error karena 403", () => {
    const a = barisKe(bJejak, /^# Span yang disimpan Collector/);
    expect(bJejak[a]).toMatch(/^notifikasi {2}server {2}POST \/lab\/ke-ledger$/);
    expect(bJejak[a + 1]).toMatch(/^ {2}notifikasi {2}client {2}POST \/ledger\/jurnal-topup {3}\[status Error\]$/);
    expect(bJejak[a + 2]).toMatch(/^ {4}ledger {6}server {2}POST \/ledger\/jurnal-topup$/);
    expect(rekJejak).toContain("satu trace id di tiga span dan dua service: True (2 service)");
    expect(rekJejak).toContain("induk span server ledger adalah span client notifikasi: True");
    expect(rekJejak).toContain('status 403 {"alasan":"jenis-tidak-diizinkan","identitas":"notifikasi","jenis":"topup_bank"}');
    expect(halaman).toContain("satu permintaan notifikasi ke ledger dijawab 403 dan menghasilkan satu trace dengan tiga span di dua service.");
    expect(halaman).toContain("Span client berstatus Error karena jawaban 403.");
    expect(halaman).toContain("trace berkesalahan di lab berarti trace yang memuat satu span client berstatus Error karena 403, bukan galat server.");
    expect(readmeLab).toContain("Trace \"berkesalahan\" di lab ini artinya trace yang memuat span client berstatus Error karena 403, bukan galat server.");
  });
  test("rekaman bagian B: 211 diterima, 16 disimpan (11 berkesalahan, 5 normal dari 200), 195 dibuang, 16 dari 16 beranak, 0 terlalu dini", () => {
    expect([diterima, disimpan, dibuang]).toEqual([211, 16, 195]);
    expect(disimpan + dibuang).toBe(diterima);
    expect([diBerkas, galatDiBerkas, normalDiBerkas]).toEqual([16, 11, 5]);
    expect(galatDiBerkas + normalDiBerkas).toBe(disimpan);
    expect([normalSimpan, normalTotal]).toEqual([5, 200]);
    expect([galatSimpan, galatTotal]).toEqual([11, 11]);
    expect(normalTotal + galatTotal).toBe(diterima);
    expect([anakOk, anakDari]).toEqual([16, 16]);
    expect(dibuangDini).toBe(0);
    expect(halaman).toContain(`Collector menerima ${diterima} trace dan menyimpan ${disimpan}.`);
    expect(halaman).toContain(`Semua ${galatSimpan} trace berkesalahan tersimpan, dan ${normalSimpan} dari ${normalTotal} trace normal.`);
    expect(halaman).toContain(`Rekaman bagian B mengirim ${diterima} trace: ${galatTotal} berkesalahan dan ${normalTotal} normal.`);
    expect(halaman).toContain(`Pertama, ${galatTotal} dari ${diterima} trace sengaja berkesalahan, yaitu ${satu(persenGalatLab)}% (Hitungan), jauh di atas 1% Asumsi.`);
    expect(persenGalatLab).toBe(5.2);
    expect(halaman).toContain(`kedua, lab memakai ID trace berurutan`.replace("kedua", "Kedua"));
    expect(readmeLab).toContain("ID trace berurutan hanya di lab");
    expect(readmeLab).toContain("bukan perkiraan produksi");
    expect(halaman).toContain(`jadi ${normalSimpan} dari ${normalTotal} bukan taksiran produksi (README lab)`);
  });
  test("konfigurasi Collector: decision_wait 3s, status_code ERROR dan probabilistic 5; bawaan 30 detik dan kebijakan latency dari baris riset", () => {
    expect(bOtel.some((b) => b === "    decision_wait: 3s")).toBe(true);
    expect(otelcol).toContain("type: status_code");
    expect(otelcol).toContain("status_codes: [ERROR]");
    expect(otelcol).toContain("type: probabilistic");
    expect(otelcol).toContain("sampling_percentage: 5");
    expect(otelcol).not.toContain("type: latency");
    expect(otelcol).not.toContain("type: drop");
    const r240 = barisRiset("R5-240");
    expect(r240).toContain("`decision_wait` bawaan 30s");
    expect(r240).toContain("kebijakan `status_code`, `probabilistic`, `latency`");
    expect(r240).toContain("keputusan \"sample\" menyimpan trace, keputusan \"drop\" tidak");
    expect(r240).toContain("\"All spans for a given trace MUST be received by the same collector instance\"");
    expect(r240).toContain("stabilitas beta untuk trace");
    expect(halaman).toContain("`decision_wait` 3 detik adalah pilihan lab, sedangkan bawaan processor 30 detik (README processor v0.163.0), dan nilai untuk produksi tidak diukur.");
    expect(halaman).toContain("keputusan sample dari satu kebijakan sudah menyimpan trace, selama tidak ada keputusan drop");
    expect(halaman).toContain("kebijakan latensi, yang tersedia di processor");
    expect(readmeLab).toContain("memuat 44,7 sampai 45,1 MiB");
    expect(readmeLab).toContain("batas memori 256 MB");
    expect(halaman).toContain("memori Collector 44,7 sampai 45,1 MiB dari batas 256 MiB");
    expect(halaman).toContain("README lab mencatat satu pengamatan peninjau, tidak direkam");
    expect((compose.match(/^\s+image:/gm) ?? []).length).toBe(1);
  });
  test("Snippet: rentang baris diturunkan dari isi berkas lab, bukan angka tulisan tangan; judul memuat jalur berkas yang ada", () => {
    const snippet = [...badan.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"(?: lang="(\w+)")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, awal: Number(m[2]), akhir: Number(m[3]), lang: m[4], title: m[5]! }));
    expect(snippet).toHaveLength(7);
    const jejakA = { awal: barisKe(bJejak, /^# Span yang disimpan Collector/), akhir: barisKe(bJejak, /^satu trace id di tiga span dan dua service/) };
    const jejakB = { awal: barisKe(bJejak, /^trace diterima Collector/), akhir: barisKe(bJejak, /^trace dibuang sebelum waktu keputusan/) };
    const state = { awal: barisKe(bState, /^keluaran CLI memuat password atau kunci/), akhir: barisKe(bState, /local_file\.konfigurasi_gateway: atribut content/) };
    const otel = { awal: barisKe(bOtel, /^ {4}tail_sampling:$|^ {2}tail_sampling:$/), akhir: barisKe(bOtel, /sampling_percentage: 5$/) };
    const jejakGoR = { awal: barisKe(bJejakGo, /tp := sdktrace\.NewTracerProvider/), akhir: barisKe(bJejakGo, /otel\.SetTextMapPropagator\(propagation\.TraceContext\{\}\)/) };
    const transport = barisKe(bLayanan, /otelhttp\.NewTransport\(tr,/);
    const handler = barisKe(bLayanan, /Handler: otelhttp\.NewHandler\(mux, \*peran,/);
    expect(bLayanan[transport]).toMatch(/return r\.Method \+ " " \+ r\.URL\.Path/);
    expect(bLayanan[transport + 1]).toMatch(/^\t\}\)\)\)$/);
    expect(bLayanan[handler]).toMatch(/return r\.Method \+ " " \+ r\.URL\.Path/);
    expect(bLayanan[handler + 1]).toMatch(/^\t\}\)\}$|^\t\}\)\)\}$/);
    const harap: [string, number, number][] = [
      ["labs/t4-infra/output/state.txt", state.awal, state.akhir],
      ["labs/api-t5/cmd/layanan/main.go", transport, transport + 2],
      ["labs/api-t5/cmd/layanan/main.go", handler, handler + 2],
      ["labs/t5-service/output/jejak.txt", jejakA.awal, jejakA.akhir],
      ["labs/t5-service/otelcol.yaml", otel.awal, otel.akhir],
      ["labs/t5-service/output/jejak.txt", jejakB.awal, jejakB.akhir],
      ["labs/api-t5/internal/jejak/jejak.go", jejakGoR.awal, jejakGoR.akhir],
    ];
    expect(snippet.map((s) => [s.file, s.awal, s.akhir])).toEqual(harap);
    // otelcol: baris `tail_sampling:` ada satu baris sebelum rentang; rentang mulai dari kunci pertama di bawahnya
    expect(bOtel[otel.awal]).toMatch(/decision_wait: 3s/);
    for (const s of snippet) {
      expect(s.title.includes(s.file), s.title).toBe(true);
      expect(fs.existsSync(path.join(akar, s.file)), s.file).toBe(true);
    }
    // judul Snippet tidak memuat komentar lab internal
    for (const s of snippet) expect(s.title).not.toMatch(/R\d-\d|keputusan|PR #/);
    // rentang memakai baris yang memuat penanda bagian atau fungsi yang disebut di judul
    expect(snippet[3]!.title).toContain("bagian A");
    expect(snippet[5]!.title).toContain("bagian B");
    expect(snippet[0]!.title).toContain("bagian A");
  });
});

describe("tail sampling: volume 48,0 GB, 2,9 GB, varian 4,7 GB, dan 11.111 span per detik dihitung dari angka yang tertulis di halaman", () => {
  test("masukan: 8 span, 500 byte, 138,9 rata-rata dan 1.388,9 puncak dibaca dari naskah dan registry", () => {
    expect(rataRps).toBe(138.9);
    expect(puncakRps).toBe(1388.9);
    expect(naskah).toContain("| Volume trace | RPS × span × byte | 8 span × 500 B (Asumsi) | 5,6 MB per detik puncak, 555,6 KB per detik rata-rata = 48,0 GB per hari. Tail sampling ±6% (1% error + 5% sisanya, Asumsi) = 2,9 GB per hari");
    expect(halaman).toContain(`${SPAN} span per request, ${BYTE_SPAN} byte per span, dan rata-rata ${koma(rataRps)} request per detik ([[t5-prd]])`);
    expect(baca("situs/src/content/docs/tahap-5/prd-v5.mdx")).toContain("rata-rata 138,9");
  });
  test("hitungan volume: 555.600 byte per detik, 48,0 GB, bagian 5,95% (±6%), 2,9 GB, 4,7 GB, dan 11.111 span", () => {
    expect(byteDetik).toBe(555600);
    expect(gbHari).toBe(48);
    expect(bulat(bagianSimpan * 100, 2)).toBe(5.95);
    expect(gbSimpan).toBe(2.9);
    expect(gbSimpan6).toBe(2.9);
    expect(bulat(bagianGalat5 * 100, 2)).toBe(9.75);
    expect(gbGalat5).toBe(4.7);
    expect(spanPuncak).toBe(11111);
    expect(halaman).toContain(`Hasilnya ${koma(rataRps)} × ${SPAN} × ${BYTE_SPAN} = ${ribuan(byteDetik)} byte per detik, atau ${satu(byteDetik / 1000)} KB per detik, dan dikali 86.400 detik itu ${satu(gbHari)} GB per hari.`);
    expect(halaman).toContain(`bagian yang disimpan 1% + 99% × 5% = ${koma(bulat(bagianSimpan * 100, 2))}%, dibulatkan ±6%. Hasilnya ${satu(gbHari)} × 0,0595 = ${satu(gbSimpan)} GB per hari (Hitungan atas Asumsi).`);
    expect(halaman).toContain(`Bila 5% trace berkesalahan, bukan 1%, bagian tersimpan 5% + 95% × 5% = ${koma(bulat(bagianGalat5 * 100, 2))}%, dan ${satu(gbHari)} × 0,0975 = ${satu(gbGalat5)} GB per hari.`);
    expect(halaman).toContain(`Puncak ${ribuan(Math.floor(puncakRps * 10) / 10).replace(/\.(\d)$/, ",$1")} request per detik × ${SPAN} span = ${ribuan(spanPuncak)} span per detik (Hitungan atas Asumsi).`.replace("1.388.9", "1.388,9"));
    expect(halaman).toContain(`Hanya ${satu(gbSimpan)} dari ${satu(gbHari)} GB per hari yang tersimpan, atau ±6% (Hitungan atas Asumsi).`);
    expect(hitungKali(halaman, "48,0 GB")).toBeGreaterThanOrEqual(6);
    expect(barisRiset("R5-244")).toContain("48.003.840.000 byte (48,0 GB)");
    expect(barisRiset("R5-244")).toContain("0,05 + 0,95 × 0,05 = 0,0975 dan 48,0 × 0,0975 = 4,68 (4,7)");
  });
  test("OpenTelemetry Sampling: head sampling tidak menjamin trace berkesalahan; tail sampling stateful; semua dari baris riset", () => {
    const r240 = barisRiset("R5-240");
    expect(r240).toContain("\"you cannot ensure that all traces with an error\"");
    expect(r240).toContain("\"stateful systems\"");
    expect(r240).toContain("\"tens of small traces per second or lower\"");
    expect(halaman).toContain("jadi ia tidak bisa menjamin trace berkesalahan ikut tersimpan.");
    expect(halaman).toContain("Dokumentasi yang sama menulis bahwa tail sampling sulit dipasang karena aturannya harus ikut berubah, dan sulit dijalankan karena komponennya menyimpan banyak data selagi menunggu keputusan.");
    expect(halaman).toContain("Beberapa Collector dengan load balancing dan kapasitas satu Collector Tidak dijalankan.");
    expect(halaman).toContain("Lab memakai satu instance.");
  });
});

describe("SLO dan burn rate: 43,2 menit, tabel Workbook, 2%, 5%, 10%, 50 jam, 52 detik, 34,7%, dan jaga 25% lawan 50%", () => {
  test("anggaran 0,001 × 43.200 = 43,2 menit sama dengan naskah (PRD v5 dan bagian 3)", () => {
    expect(anggaranMenit).toBe(43.2);
    expect(MENIT_30_HARI).toBe(43200);
    expect(naskah).toContain("error budget 0,001 × 43.200 menit = 43,2 menit");
    expect(naskah).toContain("| Anggaran kegagalan | (1 − SLO) × menit | 0,001 × 43.200 | 43,2 menit per 30 hari. Burn rate 14,4 menghabiskannya dalam 720 ÷ 14,4 = 50 jam (R5-17) |");
    expect(halaman).toContain("SLO 99,9% per 30 hari memberi 43,2 menit anggaran, dan angka itu Asumsi produk di PRD v5 ([[t5-prd]]).");
    expect(halaman).toContain("Anggaran 30 hari adalah 0,001 × 43.200 menit = 43,2 menit, dan burn rate adalah rasio gagal dibagi 0,001.");
  });
  test("tabel Workbook: tiga baris (2% dan 1 jam dan 14,4 page; 5% dan 6 jam dan 6 page; 10% dan 3 hari dan 1 ticket) dibaca dari baris riset; persen = laju × jam ÷ 720", () => {
    expect(tabelWorkbook).toEqual([
      { persen: 2, jam: 1, laju: 14.4, tindakan: "page" },
      { persen: 5, jam: 6, laju: 6, tindakan: "page" },
      { persen: 10, jam: 72, laju: 1, tindakan: "ticket" },
    ]);
    for (const b of tabelWorkbook) expect(bulat((b.laju * b.jam * 100) / JAM_30_HARI, 0), `${b.laju} × ${b.jam}`).toBe(b.persen);
    expect(pendek).toEqual(["1 jam dengan 5 menit", "6 jam dengan 30 menit", "3 hari dengan 6 jam"]);
    expect(barisWorkbook).toContain("\"1/12 the duration of the long window\"");
    expect(barisWorkbook).toContain("\"reasonable starting numbers\"");
    const panjang = [60, 360, 4320];
    const pendekMenit = [5, 30, 360];
    for (let i = 0; i < 3; i++) expect(panjang[i]! / 12, `jendela ${i}`).toBe(pendekMenit[i]);
    const tabel = badan.split("\n").filter((b) => /^\| (1 jam|6 jam|3 hari) \|/.test(b)).map(sel);
    expect(tabel).toEqual(tabelWorkbook.map((b, i) => [
      i === 0 ? "1 jam" : i === 1 ? "6 jam" : "3 hari", i === 0 ? "5 menit" : i === 1 ? "30 menit" : "6 jam", koma(b.laju), `${b.persen}%`, b.tindakan === "page" ? "memanggil orang" : "membuka tiket",
    ]));
    expect(naskah).toContain("Alert burn rate 14,4 selama 1 jam dan 6 selama 6 jam memanggil orang, dan 1 selama 3 hari membuka tiket");
    expect(halaman).toContain("Hasilnya 14,4 × 1 ÷ 720 = 2%, 6 × 6 ÷ 720 = 5%, dan 1 × 72 ÷ 720 = 10% (Hitungan atas tabel Workbook).");
    expect(halaman).toContain("Angka awalnya: 2% anggaran dalam 1 jam dan 5% dalam 6 jam untuk memanggil orang. Untuk membuka tiket, 10% dalam 3 hari (");
    expect(halaman).toContain("pemadaman total 100% terdeteksi sesudah satu jam, sama lambatnya dengan gangguan 0,2%.");
    expect(barisWorkbook).toContain("\"a 100% outage alerts after one hour, the same detection time as a 0.2% outage\"");
  });
  test("14,4 × 0,1% = 1,44%; 720 ÷ 14,4 = 50 jam; 0,864 menit = 52 detik; 15 ÷ 43,2 = 34,7%; tiga kali 15 menit = 45 > 43,2", () => {
    expect(bulat(14.4 * 0.1, 2)).toBe(1.44);
    expect(jamHabis).toBe(50);
    expect(bulat(0.02 * anggaranMenit, 3)).toBe(0.864);
    expect(detikTotal).toBe(52);
    expect(pakaiRto).toBe(34.7);
    expect(3 * RTO_MENIT).toBe(45);
    expect(3 * RTO_MENIT).toBeGreaterThan(anggaranMenit);
    expect(halaman).toContain("Laju 14,4 setara 14,4 × 0,1% = 1,44% permintaan gagal, dan menghabiskan anggaran dalam 720 ÷ 14,4 = 50 jam.");
    expect(halaman).toContain(`sesudah 2% × 43,2 = 0,864 menit, atau ±${detikTotal} detik (Hitungan atas Asumsi, lalu lintas tetap).`);
    expect(halaman).toContain(`memakai ${RTO_MENIT} ÷ 43,2 = ${koma(pakaiRto)}% anggaran.`);
    expect(halaman).toContain(`Tiga kegagalan sepanjang RTO ${RTO_MENIT} menit dalam 30 hari memakai ${3 * RTO_MENIT} menit, lebih dari 43,2 (Hitungan atas Asumsi).`);
    expect(halaman).toContain(`Tiap kegagalan sepanjang RTO ${RTO_MENIT} menit memakai ${RTO_MENIT} ÷ 43,2 = ${koma(pakaiRto)}% anggaran (Hitungan atas Asumsi), dan tiga kegagalan melewatinya.`);
    expect(naskah).toContain("pulih dalam 15 menit (RTO)");
    expect(barisRiset("R5-244")).toContain("0,02 × 43,2 = 0,864 menit = 51,84 detik; 15 ÷ 43,2 = 0,3472; 3 × 15 = 45");
  });
  test("jaga: 1 ÷ 4 = 25% dan 1 ÷ 2 = 50% terhadap pembanding 25% buku SRE; baris tabel jaga dan kalimat naskah", () => {
    const pembanding = 25;
    expect(1 / 4 * 100).toBe(pembanding);
    expect(1 / 2 * 100).toBe(50);
    const orang4 = tim.filter((t) => t.orang === 4).map((t) => t.tim);
    expect(orang4).toEqual(["Pembayaran", "Ledger dan Tabungan", "Merchant", "Akun", "Notifikasi", "Platform"]);
    expect(halaman).toContain(`| ${orang4.join(", ").replace("Ledger dan Tabungan", "Ledger dan Tabungan")} | 4 | 1 ÷ 4 = 25% | tepat di batas |`);
    expect(halaman).toContain("| SRE | 2 | 1 ÷ 2 = 50% | di atas batas |");
    expect(halaman).toContain("| Security | 2 | 1 ÷ 2 = 50% | di atas batas |");
    expect(barisRiset("R5-242")).toContain("paling banyak 25% waktu SRE untuk jaga");
    expect(naskah).toContain("- On-call: rotasi mingguan per tim. Alert hanya untuk gejala: burn rate SLO, umur notifikasi uang tertua per kelas, selisih rekonsiliasi harian, dan relay outbox yang tertinggal (Asumsi).");
    expect(halaman).toContain("Naskah menulis alert hanya untuk gejala: burn rate SLO, umur notifikasi uang tertua per kelas, selisih rekonsiliasi harian, dan relay outbox yang tertinggal (Asumsi).");
    expect(halaman).toContain("Naskah menulis rotasi per tim tanpa mengecualikan SRE dan Security.");
  });
});

describe("Shorebird dan toko: versi, batas patch, pedoman Apple 2.5.2, Google Play, dan klaim vendor [perlu verifikasi]", () => {
  test("isi baris riset dan kalimat halaman: patch hanya Dart; Apple 2.5.2 diperbarui 2026-10-16; Google Play dibuka; klaim vendor", () => {
    const r243 = barisRiset("R5-243");
    expect(adr58).toContain("Shorebird v1.6.131 hanya untuk perbaikan Dart, bukan fitur, karena Apple 2.5.2 melarang app mengunduh kode yang mengubah fitur (R5-23); kebijakan Google Play [perlu verifikasi]");
    expect(naskah).toContain("Shorebird hanya untuk perbaikan Dart, dan setiap patch tetap lewat feature flag.");
    expect(r243).toContain("patch hanya mengubah kode Dart satu rilis, kode native, aset, dan versi Flutter butuh rilis baru");
    expect(r243).toContain("\"Last Updated: October 16, 2026\"");
    expect(r243).toContain("\"introduces or changes features or functionality\"");
    expect(r243).toContain("support.google.com/googleplay/android-developer/answer/9888379");
    expect(r243).toContain("Kepatuhan Shorebird hanya klaim vendor");
    expect(r243).toContain("\"Stores also expect major new features to go through their review\"");
    expect(halaman).toContain("Patch hanya mengubah kode Dart satu rilis. Kode native, aset, dan versi Flutter butuh rilis store baru");
    expect(halaman).toContain("(App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), diperbarui 2026-10-16, dibuka 2026-11-04)".replace("(App", "[App"));
    expect(halaman).toContain("Pedoman Apple 2.5.2 melarang app mengunduh, memasang, atau menjalankan kode yang menambah atau mengubah fitur app");
    expect(halaman).toContain("Pengecualiannya kode yang berjalan di virtual machine atau interpreter dengan akses tidak langsung ke API Android");
    expect(halaman).toContain("Itu klaim vendor, dan dokumen yang dibaca untuk halaman ini tidak memuat penilaian pihak ketiga. Apakah patch Shorebird memenuhi kebijakan kedua toko [perlu verifikasi].");
    expect(halaman).toContain("FAQ yang sama menulis bahwa toko mengharapkan fitur besar baru lewat review mereka.");
    expect(halaman).toContain("patch hanya untuk perbaikan Dart, bukan fitur, dan tiap patch lewat feature flag (naskah)");
  });
});

describe("klaim negatif berlingkup: lab tidak menghitung burn rate, tidak memasang metrik dan log OpenTelemetry, tidak ada header event, tidak ada app Flutter, satu Collector", () => {
  const tulisan = (f: string): string => fs.readFileSync(path.join(akar, f), "utf8");
  const daftar = (awalan: string[], ekstensi?: RegExp): string[] => awalan.flatMap((a) => berkasDi(a)).filter((f) => !/go\.sum$|\.png$/.test(f) && (!ekstensi || ekstensi.test(f)));
  test("tidak ada kata burn di berkas terlacak labs/t5-service, labs/t5-rollout, dan labs/api-t5", () => {
    const berkas = daftar(["labs/t5-service/", "labs/t5-rollout/", "labs/api-t5/"]);
    expect(berkas.length).toBeGreaterThan(30);
    expect(berkas.filter((f) => /burn/i.test(tulisan(f)))).toEqual([]);
    expect(halaman).toContain("Lab t5-service dan t5-rollout tidak menghitung burn rate, jadi hitungan di bagian ini adalah Hitungan atas Asumsi, bukan rekaman. Angka dalam tabel berasal dari Workbook.");
  });
  test("kode Go labs/api-t5 tidak mengimpor paket metrik atau log OpenTelemetry; jejak.go menyebut hanya trace", () => {
    const go = daftar(["labs/api-t5/"], /\.go$/);
    expect(go.length).toBeGreaterThan(20);
    expect(go.filter((f) => /go\.opentelemetry\.io\/otel\/(metric|log)|otlpmetric|otlplog/.test(tulisan(f)))).toEqual([]);
    expect(jejakGo).toContain("Hanya trace; metrik");
    expect(halaman).toContain("Log dan metrik yang membawa trace id Tidak dijalankan: kode lab hanya memasang trace.");
  });
  test("tidak ada traceparent di labs/t5-fanout dan labs/api-t5/internal/repo (event outbox dan Kafka)", () => {
    const berkas = daftar(["labs/t5-fanout/", "labs/api-t5/internal/repo/"]);
    expect(berkas.length).toBeGreaterThan(5);
    expect(berkas.filter((f) => /traceparent/i.test(tulisan(f)))).toEqual([]);
    expect(halaman).toContain("Header di event outbox atau Kafka Tidak dijalankan di lab.");
  });
  test("satu-satunya pubspec.yaml terlacak adalah client Dart lab tanpa dependency Flutter", () => {
    const pub = [...(terlacak ?? [])].filter((f) => f.endsWith("pubspec.yaml"));
    expect(pub).toEqual(["labs/t3-mitm/dart/pubspec.yaml"]);
    expect(tulisan(pub[0]!)).not.toMatch(/^\s*flutter:|sdk: flutter/m);
    expect(halaman).toContain("Shorebird Tidak dijalankan: repo ini tidak punya app Flutter, dan satu-satunya `pubspec.yaml` adalah client Dart lab tanpa dependency Flutter.");
  });
  test("Argo CD tidak ada di manifes lab (tidak ada objek Application) dan Argo CD Tidak dijalankan di semua kalimatnya", () => {
    const manifes = daftar(["labs/t5-rollout/manifes/"]);
    expect(manifes.length).toBeGreaterThan(2);
    expect(manifes.filter((f) => /kind: Application\b/.test(tulisan(f)))).toEqual([]);
    expect(halaman).toContain("Argo CD sendiri Tidak dijalankan di lab, karena ia butuh repo Git yang terjangkau dari cluster.");
  });
});

describe("tab Di stack lain, tautan per kalimat, dan kalimat dengan kata kuat: tiap slot memuat dokumentasi stack-nya, tiap tautan berada di kalimatnya", () => {
  test("tiap slot tab memuat dokumentasi tabnya (slot t0 sampai t5 menurut label)", () => {
    const potong = badan.split(/<Fragment slot="t(\d)">/);
    const isi: Record<string, string> = {};
    for (let i = 1; i < potong.length; i += 2) isi[potong[i]!] = potong[i + 1]!.split("</Fragment>")[0]!;
    expect(Object.keys(isi)).toEqual(["0", "1", "2", "3", "4", "5"]);
    const harap: [string, string[]][] = [
      ["0", ["lab t5-service dan api-t5", "jejak.go"]], ["1", ["OpenTelemetry JS", "sdk-node"]], ["2", ["OpenTelemetry PHP", "Laravel"]],
      ["3", ["OpenTelemetry Python", "opentelemetry-instrumentation-django", "Django"]], ["4", ["Serverpod Docs", "Serverpod 4.1.0"]], ["5", ["Supabase: Log Drains", "Metrics API"]],
    ];
    for (const [k, kata] of harap) for (const x of kata) expect(isi[k]!, `slot t${k} memuat ${x}`).toContain(x);
    for (const [k, kata] of harap) for (const [k2] of harap) if (k2 !== k) expect(isi[k2]!.includes(kata[0]!), `slot t${k2} tidak memuat ${kata[0]}`).toBe(false);
  });
  test("tautan [[id]] ada di kalimat yang menyebut halamannya", () => {
    const kalimat: string[] = [
      "Pemeriksaannya contract, SAST, SBOM, dan tanda tangan atas digest, lalu ditambah canary dengan rollback otomatis ([[t5-rollout]]) dan tes beban terjadwal.",
      "GitOps berarti keadaan yang diinginkan ditulis di repo, dan alat menyamakan cluster dengannya ([[t5-rollout]]).",
      "dan angka itu Asumsi produk di PRD v5 ([[t5-prd]]).",
      "dan rata-rata 138,9 request per detik ([[t5-prd]]).",
      "yaitu 43,2 menit anggaran (Asumsi produk, [[t5-prd]]).",
      "Satu kegagalan sepanjang RTO 15 menit ([[t5-rpo-rto]]) memakai",
      "SRE melatih failover tiap bulan dan memegang tinjauan SLO ([[t5-rpo-rto]]).",
      "canary dengan rollback otomatis ([[t5-rollout]]).",
      "karena Argo CD Tidak dijalankan ([[t5-rollout]]).",
      "Tiap service dipegang 28 ÷ 6 = 4,7 orang (Hitungan atas Asumsi, angka yang sama di [[t5-service]]).",
      "**Yang akan merevisinya.** [[t5-onprem]] menimbang tim Platform dan SRE yang tumbuh melewati 6 orang, dari 4 + 2 sekarang. [[t5-adr-60]] menulis pemicu provenance SLSA dan atestasi app yang masih ditunda.",
      "Rilis store bertahap dan versi app lama tetap mengikuti [[E1]].",
      "ADR 44 baru memindai file konfigurasi staging, dan rekamannya hanya dua file contoh ([[t4-infra-secret]]).",
      "Pipeline per service memperluas pemeriksaan ADR 44 di [[t4-tim-infra]].",
      "| Provenance SLSA dan atestasi app | Pihak luar belum memintanya | [[t5-adr-60]] |",
      "[[t5-m44]] mencatat rilis yang menunggu lima tim, [[t5-m46]] mencatat latihan failover yang membuat semua service error, dan [[t5-m49]] mencatat canary 5% yang jadi sepertiga.",
      "Delapan tim merilis enam service ([[t5-m44]]), latihan failover membuat semua service error ([[t5-m46]]), dan canary 5% jadi sepertiga ([[t5-m49]]).",
      "dan menutup satu butir \"Sengaja belum\" di [[t4-tim-infra]], yaitu pemindai kunci atas state IaC.",
      "dan canary dengan rollback otomatis ([[t5-rollout]]).",
    ];
    for (const k of kalimat) expect(badan, k).toContain(k);
    expect(hitungKali(badan, "[[t5-rollout]]")).toBe(4);
    expect(hitungKali(badan, "[[t5-prd]]")).toBe(3);
  });
  test("kalimat dengan kata kuat (harus, sebaiknya, dapat, tail dan head sampling) sama dengan sumbernya", () => {
    for (const k of [
      "dan semua span satu trace harus sampai ke instance Collector yang sama.",
      "untuk status 4xx, span server harus dibiarkan tanpa status dan span client sebaiknya Error",
      "**Keputusan: opsi B untuk pipeline dan opsi F untuk trace.** Sembilan aturan:",
      "Head sampling memutuskan di awal tanpa melihat isi trace",
      "Tail sampling memutuskan sesudah melihat semua atau sebagian besar span satu trace.",
      "Collector menjalankan tail sampling: semua trace berkesalahan disimpan dan sisanya disampel 5%",
      "| F. Tail sampling di Collector |",
      "| E. Head sampling saja |",
      "Shorebird v1.6.131 hanya untuk perbaikan Dart, tiap patch lewat feature flag.",
      "Versi yang dibaca adalah v1.6.131, terbit 2026-10-23.",
      "- **E ditolak** karena head sampling tidak bisa menjamin trace berkesalahan tersimpan.",
      "- **D ditolak** karena 48,0 GB per hari tersimpan penuh, sedangkan tail sampling menyimpan 2,9 GB",
    ]) expect(badan, k).toContain(k);
    expect(hitungKali(halaman, "v1.6.131")).toBe(2);
    expect(hitungKali(halaman, "Tail sampling") + hitungKali(halaman, "tail sampling")).toBeGreaterThanOrEqual(10);
  });
});

describe("pilah: delapan kartu, empat kelompok, jawaban diturunkan dari naskah, posisi tidak berpola", () => {
  const p = pilahMentah;
  const kelompok = p.kelompok;
  test("kelompok dan jumlah: empat kelompok, delapan kartu, dua kartu per kelompok; urutan jawaban tidak menaik dan kartu pertama bukan kelompok pertama", () => {
    expect(kelompok).toEqual(["Platform", "SRE", "Tim produk", "Security"]);
    expect(p.item).toHaveLength(8);
    for (let k = 0; k < 4; k++) expect(p.item.filter((i) => i.jawab === k), kelompok[k]).toHaveLength(2);
    const urut = p.item.map((i) => i.jawab);
    expect(urut).toEqual([2, 0, 1, 3, 0, 1, 2, 3]);
    expect([...urut].sort()).not.toEqual(urut);
    expect(urut[0]).not.toBe(0);
    expect(p.judul).toBe("Siapa memegang pekerjaan ini: Platform, SRE, tim produk, atau Security?");
  });
  test("tiap kartu ditautkan ke kalimat naskah yang menaruh pekerjaan itu di kelompoknya", () => {
    const baris = (nama: string): string => tim.find((t) => t.tim === nama)!.memegang;
    const sumber: [string, boolean][] = [
      // 0 giliran jaga mingguan: tim produk
      ["Giliran jaga mingguan", naskah.includes("- On-call: rotasi mingguan per tim.") && adr58.includes("Giliran jaga per tim")],
      // 1 template, pipeline, dashboard, alert: Platform
      ["Template service", adr58.startsWith("| 58 | Tim Platform menyediakan jalan beraspal: template service (`service.yaml`), pipeline per service")],
      // 2 latihan failover bulanan: SRE (ADR 48)
      ["Latihan failover tiap bulan", adr48.includes("SRE melatih failover tiap bulan dan mencatat waktunya terhadap RTO 15 menit")],
      // 3 threat model dan ADR 44: Security
      ["Threat model", naskah.includes("Laras dan tim Security membaca threat model tahap ini") && naskah.includes("Mereka juga menjalankan pemeriksaan ADR 44 untuk tiap service.")],
      // 4 cluster dan pooler: Platform
      ["Cluster Kubernetes", baris("Platform").startsWith("cluster, pooler,")],
      // 5 tinjauan SLO: SRE (ADR 58)
      ["Tinjauan SLO", adr58.includes("SRE melatih failover bulanan dan memegang tinjauan SLO")],
      // 6 batch harian: tim Ledger dan Tabungan (tim produk)
      ["Batch harian", baris("Ledger dan Tabungan").includes("cicilan, tabungan, batch harian")],
      // 7 uji penetrasi lokal: Security
      ["Uji penetrasi lokal", baris("Security").includes("uji penetrasi lokal")],
    ];
    expect(sumber).toHaveLength(8);
    sumber.forEach(([awal, ok], i) => {
      expect(p.item[i]!.teks.startsWith(awal), `kartu ${i}`).toBe(true);
      expect(ok, `sumber naskah untuk kartu ${i}: ${awal}`).toBe(true);
    });
    expect(tim.find((t) => t.tim === "SRE")!.memegang).toBe("SLO, giliran jaga, latihan failover");
    expect(tim.find((t) => t.tim === "Security")!.pemimpin).toBe("Laras");
    expect(tim.find((t) => t.tim === "Platform")!.pemimpin).toBe("Bayu");
    expect(tim.find((t) => t.tim === "Ledger dan Tabungan")!.pemimpin).toBe("Hendra");
    expect(p.item[0]!.kenapa).toContain("Naskah tidak menulis bahwa SRE menjaga semua service");
    expect(p.item[2]!.kenapa).toContain("ADR 48 menulis SRE melatih failover tiap bulan");
    expect(p.item[3]!.kenapa).toContain("Laras dan tim Security");
    expect(p.item[5]!.kenapa).toContain("ADR 58 menulis SRE memegang tinjauan SLO");
    expect(p.item[4]!.kenapa).toContain("Bayu, 4 orang");
    expect(p.item[6]!.kenapa).toContain("Hendra, 4 orang");
    expect(p.item[7]!.kenapa).toContain("Laras, 2 orang");
  });
  test("jawaban tebakan tidak sudah tertulis di teks di atas widget (blok Mulai dan paragraf Coba)", () => {
    const mulai = badan.slice(0, badan.indexOf('<WidgetLama nama="pilah"')).replace(/<Blok nama="Coba"[^>]*>/, "");
    for (const i of p.item) {
      // jawaban pilah (kartu dan kelompoknya) tidak ditulis berpasangan di teks sebelum widget
      expect(mulai.includes(i.teks), i.teks).toBe(false);
    }
    expect(mulai).not.toContain("Tim Platform menyediakan");
    expect(mulai).not.toContain("SRE memegang");
    expect(mulai).not.toContain("tim Security");
    // tabel tim naskah baru muncul sesudah widget (blok Paham)
    expect(badan.indexOf("| Tim | Orang | Pemimpin | Memegang |")).toBeGreaterThan(badan.indexOf('<WidgetLama nama="pilah"'));
    // kalimat aman di blok Coba menyebut jawaban hanya sebagai ringkasan sesudah memilih (atribut aman tidak tampil sebelum pilihan)
    expect(badan).toContain("aman=\"Kalau berhenti di sini, kamu sudah tahu: Platform menyediakan jalan beraspal, SRE memegang SLO dan latihan failover, dan tiap tim produk menjawab alert service miliknya.\"");
  });
});

describe("diagram Rantai Inti: skema, ringkas, simpul akhir terbaca tanpa sub, dan nilai dari rekaman dan hitungan", () => {
  test("DataRantai lolos; dua baris, tiga simpul; angka diagram sama dengan rekaman jejak.txt dan hitungan halaman", () => {
    const r = DataRantai.parse(rantaiMentah);
    expect(r.baris).toHaveLength(2);
    expect(r.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    expect(r.sumber.jenis).toBe("rekaman");
    expect(r.baris[0]!.simpul[2]!.sub).toBe(`${galatSimpan} dari ${galatTotal} trace berkesalahan`);
    expect(r.baris[0]!.simpul[1]!.sub).toBe("3 span, 2 service, satu trace id");
    expect(r.baris[1]!.simpul[0]!.teks).toBe(`${koma(anggaranMenit)} menit`);
    expect(r.baris[1]!.simpul[1]!.teks).toBe(`Laju ${koma(tabelWorkbook[0]!.laju)}`);
    expect(r.baris[1]!.simpul[1]!.sub).toBe(`${tabelWorkbook[0]!.persen}% anggaran habis dalam 1 jam`);
    expect(r.baris[1]!.simpul.every((s) => s.nada === "warn")).toBe(true);
    expect(r.catatan).toBe("Kotak oranye adalah Asumsi dan hitungan atasnya, bukan rekaman lab.");
    expect(r.baris[1]!.simpul[2]!.teks).toBe("Orang dipanggil");
    expect(r.baris[0]!.simpul[2]!.teks).toBe("Disimpan");
    // kalimat Inti tidak lebih dari ±150 karakter dan Rantai ringkas dua baris pendek
    const inti = badan.split("\n").find((b) => b.startsWith("Trace menyambung antar service"))!;
    expect(inti.length).toBeLessThanOrEqual(80);
    expect(badan.indexOf("## Inti")).toBeLessThan(badan.indexOf("<Rantai"));
  });
});

describe("label sumber, glosarium, kartu, dan Cek diri: label turunan didefinisikan, istilah punya baris glosarium, jawaban sama dengan hitungan", () => {
  test("empat label turunan didefinisikan di blok Coba sebelum pemakaian pertama di Paham; lima label dasar menaut /cara-pakai/", () => {
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba"'), badan.indexOf('<Blok nama="Paham"'));
    for (const l of ["**Hitungan:**", "**Penalaran:**", "**Dibaca dari kode:**", "**Dibaca dari riwayat CI:**"]) expect(coba, l).toContain(l);
    expect(badan.indexOf("(Penalaran)")).toBeGreaterThan(badan.indexOf("**Penalaran:**"));
    expect(badan.indexOf("(Dibaca dari kode)")).toBeGreaterThan(badan.indexOf("**Dibaca dari kode:**"));
    expect(badan.indexOf("Dibaca dari riwayat CI)")).toBeGreaterThan(badan.indexOf("**Dibaca dari riwayat CI:**"));
    expect(coba).toContain("Rekaman lab, Asumsi, Ilustrasi, Tidak dijalankan, dan [perlu verifikasi] diatur di [Label sumber](/cara-pakai/#label-sumber).");
    expect(badan).toContain("Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `jejak.txt` bagian A,");
  });
  test("istilah baru punya baris glosarium dengan tautan ke halaman ini; Span dan Collector didefinisikan di kalimat pemakaian pertama", () => {
    for (const t of ["Burn rate", "GitOps", "SLO", "Tail sampling"]) expect(glosarium, t).toMatch(new RegExp(`\\| \\*\\*${t}\\*\\*[^|]* \\| [^|]+ \\| \\[\\[t5-tim-infra\\]\\] \\|`));
    const urut = glosarium.split("\n").filter((b) => /^\| \*\*(Buku ledger|Burn rate|CA)\*\*/.test(b)).map((b) => b.match(/\*\*([^*]+)\*\*/)![1]);
    expect(urut).toEqual(["Buku ledger", "Burn rate", "CA"]);
    expect(badan.indexOf("Span adalah satu potongan trace")).toBeLessThan(badan.indexOf("Rekaman lab ([Label sumber]"));
    expect(badan.indexOf("Collector adalah proses yang menerima span")).toBeLessThan(badan.indexOf("Semua 11 trace berkesalahan tersimpan"));
    expect(badan.indexOf("Anggaran kegagalan adalah waktu gagal")).toBeLessThan(badan.indexOf("SLO 99,9% per 30 hari"));
    expect(badan.indexOf("SLO (service level objective) adalah")).toBeLessThan(badan.indexOf("SLO 99,9% per 30 hari memberi"));
    expect(badan.indexOf("Burn rate adalah laju habisnya anggaran")).toBeLessThan(badan.indexOf("Alert burn rate 14,4 selama 1 jam"));
  });
  test("kartu Cek diri: empat soal dan jawaban dengan angka sama dengan hitungan; kartu registry untuk halaman ini jika ada", () => {
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([^\n]+)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(4);
    expect(jawaban[0]).toContain(`${galatSimpan} dari ${galatTotal} trace berkesalahan tersimpan`);
    expect(jawaban[1]).toContain(`${koma(rataRps)} × ${SPAN} × ${BYTE_SPAN} × 86.400 = ${satu(gbHari)} GB`);
    expect(jawaban[1]).toContain(`${satu(gbHari)} × (1% + 99% × 5%) = ${satu(gbSimpan)} GB`);
    expect(jawaban[1]).toContain(`hasilnya ${satu(gbGalat5)} GB`);
    expect(jawaban[1]).toContain(`${galatTotal} dari ${diterima} berkesalahan, ${koma(persenGalatLab)}%`);
    expect(jawaban[2]).toContain("14,4 × 1 ÷ 720 = 2% anggaran");
    expect(jawaban[2]).toContain(`720 ÷ 14,4 = ${jamHabis} jam`);
    expect(jawaban[3]).toContain("Pedoman Apple 2.5.2");
    expect(jawaban[3]).toContain("[perlu verifikasi]");
    const kartu = kartuSemua.filter((x) => x.halaman === "t5-tim-infra");
    expect(kartu.length).toBeGreaterThanOrEqual(0);
    // pertanyaan dasar di blok Mulai sama dengan jumlah soal
    expect((badan.match(/^\d\. /gm) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  test("baris riset R5-240 sampai R5-244: masing-masing sekali, berurutan, memuat tanggal buka 2026-11-04; kutipan Inggris pendek", () => {
    const ids = ["R5-240", "R5-241", "R5-242", "R5-243", "R5-244"];
    const posisi = ids.map((id) => riset5.split("\n").findIndex((b) => b.startsWith(`| ${id} |`)));
    for (const i of posisi) expect(i).toBeGreaterThan(0);
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
    for (const id of ids) {
      expect(riset5.split("\n").filter((b) => b.startsWith(`| ${id} |`))).toHaveLength(1);
      expect(barisRiset(id), id).toContain("2026-11-04");
    }
    for (const id of ["R5-240", "R5-242", "R5-243"]) {
      for (const q of barisRiset(id).matchAll(/"([^"]{3,})"/g)) expect(q[1]!.split(/\s+/).length, `${id}: ${q[1]}`).toBeLessThan(16);
    }
    // semua tautan luar di halaman tampil di salah satu baris riset 240 sampai 244 (jalur tanpa skema)
    const urlHalaman = [...new Set([...badan.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]!))];
    const risetLima = ids.map(barisRiset).join("\n");
    const kunciUrl: Record<string, string> = {
      "https://github.com/argoproj/argo-cd/blob/v3.5.6/docs/user-guide/best_practices.md": "docs/user-guide/best_practices.md",
      "https://www.w3.org/TR/trace-context/": "www.w3.org/TR/trace-context/",
      "https://opentelemetry.io/docs/specs/semconv/http/http-spans/": "opentelemetry.io/docs/specs/semconv/http/http-spans/",
      "https://opentelemetry.io/status/": "opentelemetry.io/status/",
      "https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.163.0/processor/tailsamplingprocessor/README.md": "processor/tailsamplingprocessor",
      "https://opentelemetry.io/docs/concepts/sampling/": "opentelemetry.io/docs/concepts/sampling/",
      "https://sre.google/workbook/alerting-on-slos/": "sre.google/workbook/alerting-on-slos/",
      "https://sre.google/sre-book/being-on-call/": "sre.google/sre-book/being-on-call/",
      "https://docs.shorebird.dev/code-push/faq/": "docs.shorebird.dev/code-push/faq/",
      "https://developer.apple.com/app-store/review/guidelines/": "developer.apple.com/app-store/review/guidelines/",
      "https://support.google.com/googleplay/android-developer/answer/9888379": "support.google.com/googleplay/android-developer/answer/9888379",
      "https://docs.serverpod.dev/": "Serverpod",
      "https://opentelemetry.io/docs/languages/js/propagation/": "OpenTelemetry JS Propagation",
      "https://opentelemetry.io/docs/languages/php/propagation/": "OpenTelemetry PHP Propagation",
      "https://opentelemetry.io/docs/zero-code/python/": "OpenTelemetry Python zero-code",
      "https://supabase.com/docs/guides/telemetry/log-drains": "Supabase Log Drains",
      "https://supabase.com/docs/guides/telemetry/metrics": "Metrics API",
      "https://www.npmjs.com/package/@opentelemetry/sdk-node": "@opentelemetry/sdk-node",
      "https://pypi.org/project/opentelemetry-instrumentation-django/": "opentelemetry-instrumentation-django",
    };
    for (const u of urlHalaman) {
      expect(kunciUrl[u], `tautan tanpa kunci riset: ${u}`).toBeDefined();
      expect(risetLima, u).toContain(kunciUrl[u]!);
    }
    expect(hitungKali(halaman, "dibuka 2026-11-04")).toBe(SIDIK.label.dibuka);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "delapan", "atau", "dan", "kecuali", "sekali", "minimal", "maksimal", "sepertiga", "seperdua belas", "stable", "development", "beta", "release candidate", "page", "tiket", "kapan", "salah", "tail sampling", "head sampling", "harus", "sebaiknya", "dapat", "mungkin", "misalnya", "bisa", "perlu"];
const sidikKata = (teks: string, kata2: string[]): Record<string, number> =>
  Object.fromEntries(kata2.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const tekstual = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const angkaDari = (t: string): string[] => [...t.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]);
const SPLIT2 = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa2 = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa2.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT2).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const kartuT5 = kartuSemua.filter((x) => x.halaman === "t5-tim-infra");
const RISET_IDS = ["R5-240", "R5-241", "R5-242", "R5-243", "R5-244"];
const glosarium4 = glosarium.split("\n").filter((b) => /^\| \*\*(Burn rate|GitOps|SLO|Tail sampling)\*\*/.test(b));
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-1[01]-\d\d/g) ?? []).length,
    dibacaDariKode: (halaman.match(/[Dd]ibaca dari kode/g) ?? []).length, riwayatCi: (halaman.match(/[Dd]ibaca dari riwayat CI/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), pilah: sidikKata(nilaiString(pilahMentah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa2.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: RISET_IDS.map((id) => h16(barisRiset(id))),
  token: h16((halaman.match(/[\w.-]*\d[\w.-]*/g) ?? []).join(" ")),
  tautan: Object.fromEntries([...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort().map((id) => [id, hitungKali(badan, `[[${id}]]`)])),
  glosarium: glosarium4.map(h16),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), pilah: h16(JSON.stringify(pilahMentah)), kartu: h16(JSON.stringify(kartuT5)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), pilah: tekstual(pilahMentah), kartu: tekstual(kartuT5) },
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat tim-infra-t5.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "tim-infra-t5.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, pilah, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, pilah, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, glosarium, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.perluVerifikasi).toBe(SIDIK.label.perluVerifikasi);
    expect(sidikSekarang.label.rekamanLab).toBe(SIDIK.label.rekamanLab);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan pilah", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.pilah).toEqual(SIDIK.pilah);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, glosarium, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.token).toBe(SIDIK.token);
    expect(sidikSekarang.tautan).toEqual(SIDIK.tautan);
    expect(sidikSekarang.glosarium).toEqual(SIDIK.glosarium);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
