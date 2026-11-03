// Penjaga halaman 5.23 (keputusan 1588 sampai 1590): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim "tidak" dan "hanya",
// urutan tebakan, diagram Rantai t5-rollout-inti.json, data Tebak t5-rollout-tebak.json, kartu Cek diri, dan baris riset di progressive-delivery.mdx.
// Nilai diturunkan dari rekaman labs/t5-rollout/output (gateway, analisis, sakelar, hpa, testing), manifes labs/t5-rollout/manifes, kode api-t5
// (sakelar.go, bo.go), rekaman Tahap 4 otorisasi.txt bagian D, naskah Tahap 5 (baris ADR 55 dan peta halaman), registry, dan baris riset R5-220
// sampai R5-224, bukan dari daftar yang ditulis sendiri. Hitungan beban dan langkah rilis dihitung dari 1,16 yang tertulis di halaman.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// progressive-delivery.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah
// teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/progressive-delivery.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya merekam bobot Gateway API di Traefik 3.7.13, satu analisis atas rasio tolak,
// tiga pod dengan sakelar dari tabel, dan HPA atas Deployment; Argo CD, langkah 1% dan 25%, p95, dan Rollout dengan sakelar tabel Tidak dijalankan.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-rollout-inti.json";
import tebakMentah from "../../data/widget/t5-rollout-tebak.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./progressive-delivery.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-5/progressive-delivery.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const rekB = baca("labs/t5-rollout/output/gateway.txt");
const rekC = baca("labs/t5-rollout/output/analisis.txt");
const rekD = baca("labs/t5-rollout/output/sakelar.txt");
const rekE = baca("labs/t5-rollout/output/hpa.txt");
const rekTes = baca("labs/t5-rollout/output/testing.txt");
const rekA = baca("labs/t5-rollout/output/tanpa-router.txt");
const rekT4 = baca("labs/t4-kartu/output/otorisasi.txt");
const manifesGateway = baca("labs/t5-rollout/manifes/kartu-gateway.yaml");
const manifesSakelar = baca("labs/t5-rollout/manifes/kartu-sakelar.yaml");
const manifesHpa = baca("labs/t5-rollout/manifes/kartu-hpa.yaml");
const manifesPlugin = baca("labs/t5-rollout/manifes/argo-rollouts-gateway.yaml");
const sakelarGo = baca("labs/api-t5/internal/service/sakelar.go");
const boGo = baca("labs/api-t5/internal/service/bo.go");
const runPy = baca("labs/t5-rollout/run.py");
const hal5 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const hal4 = baca("situs/src/content/docs/tahap-4/tim-infra.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
interface H { id: string; judul: string; adr?: number[]; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
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
const ribuan = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;
const barisKe = (baris: string[], pola: RegExp, dari0 = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`sumber: ${pola} tidak ditemukan`);
  return i + 1; // nomor baris 1-based
};
const bB = rekB.split("\n");
const bC = rekC.split("\n");
const bD = rekD.split("\n");
const bYml = manifesGateway.split("\n");
const bSakelarGo = sakelarGo.split("\n");

// --- rekaman gateway.txt bagian B
const jsonSesudah = (baris: string[], pola: RegExp): Record<string, number> => JSON.parse(baris[barisKe(baris, pola) - 1]!.replace(/^.*?(\{.*\})\s*$/, "$1")) as Record<string, number>;
const bobotAwal = jsonSesudah(bB, /bobot awal:/);
const bobotSekarang = jsonSesudah(bB, /bobot sekarang:/);
const podB = ((): { v1: number; v2: number } => {
  const m = bB[barisKe(bB, /^Pod v1: \d+, pod v2: \d+$/) - 1]!.match(/^Pod v1: (\d+), pod v2: (\d+)$/)!;
  return { v1: Number(m[1]), v2: Number(m[2]) };
})();
const batasB = ((): { bawah: number; atas: number } => {
  const m = bB[barisKe(bB, /^Bagian permintaan yang dijawab v2 terukur antara/) - 1]!.match(/antara ([\d.]+)% dan ([\d.]+)%/)!;
  return { bawah: Number(m[1]), atas: Number(m[2]) };
})();
const bagianPodB = bulat((podB.v2 / (podB.v1 + podB.v2)) * 100, 1);

// --- rekaman analisis.txt bagian C
const persenTolak = Number(rekC.match(/-lab-tolak-persen (\d+)/)![1]);
const ambangC = ((): { total: number; persen: number } => {
  const m = rekC.match(/rasio tolak >= (\d+)% dari paling sedikit (\d+) keputusan/)!;
  return { persen: Number(m[1]), total: Number(m[2]) };
})();
const bobotRollback = jsonSesudah(bC, /sesudah rollback:/);
const podRollback = ((): { v1: number; v3: number } => {
  const m = rekC.match(/Pod sesudah rollback: v1 (\d+), v3 (\d+)/)!;
  return { v1: Number(m[1]), v3: Number(m[2]) };
})();
const permintaanRollback = ((): { v1: number; v3: number; total: number } => {
  const m = rekC.match(/(\d+) permintaan sesudah rollback: v1 menjawab (\d+), v3 menjawab (\d+)/)!;
  return { total: Number(m[1]), v1: Number(m[2]), v3: Number(m[3]) };
})();

// --- rekaman sakelar.txt bagian D
const TTL = Number(runPy.match(/^TTL_SAKELAR = ([\d.]+)/m)![1]);
const TOLERANSI = Number(runPy.match(/^TOLERANSI = ([\d.]+)/m)![1]);
const tenggatPenerbit = Number(rekD.match(/kurang dari (\d+) detik \(tenggat penerbit/)![1]);

// --- sakelar.go
const ttlKode = Number(sakelarGo.match(/^const TTLSakelar = (\d+) \* time\.Second/m)![1]);
const batasBacaKode = Number(sakelarGo.match(/^const BatasBacaSakelar = time\.Second$/m) ? 1 : NaN);

// --- Snippet: rentang diturunkan dari isi berkas, bukan angka tulisan tangan
const akhirFungsi = (baris: string[], mulai: number): number => {
  for (let i = mulai; i < baris.length; i++) if (baris[i] === "}") return i + 1;
  throw new Error("akhir fungsi tidak ditemukan");
};
const RENTANG: Record<string, { berkas: string; awal: number; akhir: number }> = {
  strategi: { berkas: "labs/t5-rollout/manifes/kartu-gateway.yaml", awal: barisKe(bYml, /^ {2}strategy:$/), akhir: barisKe(bYml, /^ {8}- pause: \{\}$/) },
  analisisTemplate: { berkas: "labs/t5-rollout/manifes/kartu-gateway.yaml", awal: barisKe(bYml, /^kind: AnalysisTemplate$/) - 1, akhir: barisKe(bYml, /timeoutSeconds: 3$/) },
  gateway: { berkas: "labs/t5-rollout/output/gateway.txt", awal: barisKe(bB, /^Rollout kartu versi v1:/), akhir: barisKe(bB, /^AnalysisRun rasio-tolak:/) },
  analisis: { berkas: "labs/t5-rollout/output/analisis.txt", awal: barisKe(bC, /^Rollout kartu versi v1:/), akhir: bC.reduce((a, b, i) => (b !== "" ? i + 1 : a), 0) },
  konstanta: { berkas: "labs/api-t5/internal/service/sakelar.go", awal: barisKe(bSakelarGo, /^\/\/ TTLSakelar:/), akhir: barisKe(bSakelarGo, /^const BatasBacaSakelar/) },
  jendela: { berkas: "labs/t5-rollout/output/sakelar.txt", awal: barisKe(bD, /^otorisasi Rp1\.000 di pod 1 \(cache terisi\)/), akhir: barisKe(bD, /^otorisasi Rp1\.000 di pod 3 sesudah jendela cache/) },
  hakDicabut: { berkas: "labs/t5-rollout/output/sakelar.txt", awal: barisKe(bD, /^otorisasi Rp1\.000 di pod 1, sakelar tak terbaca/), akhir: barisKe(bD, /^Sesudah hak dikembalikan/) },
  ditahan: { berkas: "labs/t5-rollout/output/sakelar.txt", awal: barisKe(bD, /^otorisasi Rp1\.000 di pod 1, PostgreSQL berhenti/), akhir: barisKe(bD, /^Tiga otorisasi Rp1\.000 bersamaan/) },
  tolakSebelum: { berkas: "labs/api-t5/internal/service/sakelar.go", awal: barisKe(bSakelarGo, /^func \(s Service\) tolakSebelumDatabase/), akhir: akhirFungsi(bSakelarGo, barisKe(bSakelarGo, /^func \(s Service\) tolakSebelumDatabase/)) },
  aktif: { berkas: "labs/api-t5/internal/service/sakelar.go", awal: barisKe(bSakelarGo, /^\/\/ Aktif mengembalikan nilai sakelar/), akhir: barisKe(bSakelarGo, /^func \(k \*SakelarKartu\) Aktif\(/) },
};
interface TagSnippet { file: string; lines: string; lang: string; title: string }
const tagSnippet: TagSnippet[] = [...badan.matchAll(/<Snippet file="([^"]+)" lines="([^"]+)"(?: lang="([^"]+)")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, lines: m[2]!, lang: m[3] ?? "text", title: m[4]! }));
const URUTAN_SNIPPET = ["strategi", "gateway", "analisisTemplate", "analisis", "konstanta", "jendela", "tolakSebelum", "hakDicabut", "ditahan", "aktif"];

// --- hitungan beban dan langkah rilis, dari angka yang tertulis di halaman
const otorisasiPerHari = 10000;
const detikPerHari = 86400;
const faktorPuncak = 10;
const puncak = bulat((otorisasiPerHari / detikPerHari) * faktorPuncak, 2);
const LANGKAH = [1, 5, 25];
const hitungLangkah = (w: number): { perDetik: number; perJam: number; detikSampel: number; menit: number } => {
  const perDetik = parseFloat((puncak * (w / 100)).toFixed(6));
  return { perDetik, perJam: bulat(perDetik * 3600, 0), detikSampel: bulat(ambangC.total / perDetik, 0), menit: bulat(bulat(ambangC.total / perDetik, 0) / 60, 0) };
};
const rtoMenit = 15; // RTO PRD v5 (Asumsi produk), ditulis di halaman 5.9

describe("rekaman gateway.txt dan analisis.txt: diturunkan dari berkas rekaman dan manifes", () => {
  test("bagian B: bobot awal 100 dan 0, satu pod versi baru dari empat, bobot 95 dan 5, batas permintaan 1,5% sampai 8,5%", () => {
    expect(bobotAwal).toEqual({ "kartu-stable": 100, "kartu-canary": 0 });
    expect(bobotSekarang).toEqual({ "kartu-stable": 95, "kartu-canary": 5 });
    expect(podB).toEqual({ v1: 3, v2: 1 });
    expect(bagianPodB).toBe(25);
    expect(batasB).toEqual({ bawah: 1.5, atas: 8.5 });
    expect(rekB).toContain("Rollout kartu sesudah VERSI diganti ke v2: phase Paused, currentStepIndex 1");
    expect(halaman).toContain("bobot 95 dan 5 ke HTTPRoute, padahal pod versi baru hanya 1 dari 4");
    expect(halaman).toContain("Rekaman bagian B memulai dari bobot 100 dan 0.");
    expect(halaman).toContain("pod versi baru 1 dan pod versi lama 3, dan bobot menjadi 95 dan 5");
    expect(halaman).toContain(`Satu pod dari empat adalah ${bagianPodB.toFixed(1).replace(".", ",")}% (Hitungan atas rekaman)`);
    expect(halaman).toContain(`terukur antara ${koma(batasB.bawah)}% dan ${koma(batasB.atas)}%`);
  });
  test("bagian C: 31% adalah flag lab (Ilustrasi), analisis Failed oleh failureLimit 0, Rollout Degraded, bobot 100 dan 0, 100 dari 100 ke versi lama", () => {
    expect(persenTolak).toBe(31);
    expect(rekC).toContain("Angka 31% memerankan naskah M49 (Ilustrasi); kode versi baru yang salah tidak ada.");
    expect(rekC).toContain("AnalysisRun rasio-tolak: phase Failed");
    expect(hitungKali(rekC, "failed (1) > failureLimit (0)")).toBe(2); // pesan AnalysisRun dan pesan Rollout
    expect(rekC).toContain("Pengukuran yang gagal: 1 (failureLimit 0:");
    expect(rekC).toContain("Rollout kartu: phase Degraded, abort True");
    expect(bobotRollback).toEqual({ "kartu-stable": 100, "kartu-canary": 0 });
    expect(podRollback).toEqual({ v1: 3, v3: 0 });
    expect(permintaanRollback).toEqual({ total: 100, v1: 100, v3: 0 });
    expect(halaman).toContain(`Versi baru menolak ${persenTolak}% otorisasi (Ilustrasi)`);
    expect(halaman).toContain(`${permintaanRollback.v1} dari ${permintaanRollback.total} permintaan berikutnya dijawab versi lama`);
    expect(halaman).toContain(`Analisis Failed, Rollout menjadi Degraded, bobot kembali ke ${bobotRollback["kartu-stable"]} dan ${bobotRollback["kartu-canary"]}`);
  });
  test("manifes: tiga replika, dua langkah (setWeight 5, jeda tanpa batas), analisis latar mulai di indeks 1 dengan failureLimit 0 dan ambang dari rekaman", () => {
    expect(manifesGateway).toMatch(/^ {2}replicas: 3$/m);
    expect(manifesGateway.match(/- setWeight: \d+/g)).toEqual(["- setWeight: 5"]);
    expect(manifesGateway.match(/- pause: \{\}/g)).toHaveLength(1);
    expect(manifesGateway).toMatch(/^ {8}startingStep: 1$/m);
    expect(manifesGateway).toMatch(/^ {6}failureLimit: 0$/m);
    expect(manifesGateway).toMatch(/^ {6}interval: 5s$/m);
    expect(manifesGateway).toContain(`failureCondition: "result.total >= ${ambangC.total} && result.rasio_tolak >= ${(ambangC.persen / 100).toFixed(2)}"`);
    expect(manifesGateway).not.toMatch(/successCondition/);
    expect(manifesGateway).not.toMatch(/sakelar-tabel/);
    expect(manifesGateway).toContain("stableService: kartu-stable");
    expect(manifesGateway).toContain("canaryService: kartu-canary");
    expect(halaman).toContain("Rollout lab punya dua langkah: bobot 5, lalu jeda tanpa batas.");
    expect(halaman).toContain("Analisis latar dengan `startingStep: 1` mulai di langkah kedua, yaitu jeda, karena dokumentasi menghitung langkah dari 0:");
    expect(halaman).toContain(`Pengukuran gagal bila jumlah keputusan paling sedikit ${ambangC.total} dan rasio tolak paling sedikit ${ambangC.persen}% (Asumsi lab).`);
    expect(halaman).toContain("`failureLimit` 0 berarti satu pengukuran gagal sudah menggagalkan seluruh analisis:");
  });
  test("plugin dan router: Traefik 3.7.13, Gateway API v1.6.1, plugin v0.17.0 dari kepala rekaman dan manifes; hanya satu router yang dijalankan", () => {
    for (const r of [rekB, rekC, rekD, rekE]) {
      expect(r).toContain("Argo Rollouts v1.10.1");
      expect(r).toContain("plugin Gateway API v0.17.0");
      expect(r).toContain("Traefik 3.7.13");
      expect(r).toContain("Gateway API v1.6.1");
      expect(r).toContain("go1.27.3");
    }
    expect(manifesPlugin).toContain("releases/download/v0.17.0/");
    expect(halaman).toContain("Lab memakai Traefik 3.7.13, Gateway API v1.6.1, dan plugin v0.17.0, dan kombinasi itu berjalan");
    expect(halaman).toContain("Hanya Traefik 3.7.13 yang dijalankan");
    // klaim negatif berlingkup: hanya Traefik di folder lab t5-rollout (README, manifes, run.py)
    const semua = [baca("labs/t5-rollout/README.md"), manifesGateway, manifesPlugin, runPy].join("\n").toLowerCase();
    for (const router of ["istio", "nginx gateway fabric", "envoy gateway", "kong", "contour", "cilium", "haproxy"]) {
      const kena = semua.split("\n").filter((b) => b.includes(router) && !/tidak dijalankan|dijalankan:|ingress nginx|daftar|lain/.test(b));
      expect(kena, `router ${router} muncul di folder lab t5-rollout sebagai yang dijalankan`).toEqual([]);
    }
  });
  test("langkah 1% dan 25%, p95, dan selisih rekonsiliasi hanya ditulis Tidak dijalankan: lab t5-rollout tidak punya langkah itu", () => {
    expect(manifesGateway.match(/setWeight/g)).toHaveLength(1);
    expect(runPy).not.toMatch(/setWeight: (1|25)\b/);
    expect(rekC + rekB).not.toMatch(/p95|selisih rekonsiliasi/);
    expect(halaman).toContain("Lab hanya merekam langkah 5% dan jeda tanpa batas. Langkah 1% dan 25% dan promosi manual Tidak dijalankan.");
    expect(halaman).toContain("Lab hanya merekam rasio tolak, karena Prometheus tidak dipasang. Dua lainnya Tidak dijalankan.");
    expect(baca("labs/t5-rollout/README.md")).toContain("p95 dan selisih rekonsiliasi Tidak dijalankan; Prometheus tidak dipasang.");
  });
});

describe("rekaman sakelar.txt, hpa.txt, kode sakelar.go dan bo.go, dan rekaman Tahap 4: diturunkan dari berkas", () => {
  test("bagian D (sakelar dari tabel): TTL 5 detik dan toleransi 2 detik dari run.py dan kode, pod 1 menolak seketika, pod 2 dan 3 menyusul", () => {
    expect(TTL).toBe(5);
    expect(TOLERANSI).toBe(2);
    expect(ttlKode).toBe(TTL);
    expect(batasBacaKode).toBe(1);
    expect(rekD).toContain(`Pod 2 dan pod 3 menolak (alasan kill-switch) dalam ${TTL} detik ditambah ${TOLERANSI} detik toleransi pengukuran sesudah sakelar dimatikan: ya (batas diperiksa, lama sebenarnya tidak direkam)`);
    expect(rekD).toContain("otorisasi Rp1.000 di pod 1 segera sesudahnya: HTTP 200, tolak (kill-switch)");
    expect(rekD).toContain("otorisasi Rp1.000 di pod 2 segera sesudahnya: HTTP 200, setuju");
    expect(rekD).toContain("otorisasi Rp1.000 di pod 3 segera sesudahnya: HTTP 200, setuju");
    expect(rekD).toContain("Sesudah sakelar dinyalakan lewat pod 2 (bukan pod yang mematikannya) semua pod menyetujui lagi: ya");
    expect(halaman).toContain(`paling lama ${TTL} detik ditambah toleransi ukur`);
    expect(halaman).toContain("Waktu sampai pod 2 dan pod 3 menolak tidak direkam.");
    expect(halaman).toContain(`Lab hanya memeriksa batasnya: paling lama ${TTL} detik ditambah ${TOLERANSI} detik toleransi pengukuran.`);
  });
  test("bagian D (tak terbaca): tiga pod menjawab 200 tolak sakelar-tak-terbaca untuk hak SELECT dicabut dan untuk PostgreSQL ditahan, kurang dari tenggat 2 detik", () => {
    for (const pod of [1, 2, 3]) {
      expect(rekD).toContain(`otorisasi Rp1.000 di pod ${pod}, sakelar tak terbaca: HTTP 200, tolak (sakelar-tak-terbaca)`);
      expect(rekD).toContain(`otorisasi Rp1.000 di pod ${pod}, PostgreSQL berhenti: HTTP 200, tolak (sakelar-tak-terbaca)`);
    }
    expect(tenggatPenerbit).toBe(2);
    expect(rekD).toContain("Tiga otorisasi Rp1.000 bersamaan di pod 1, PostgreSQL berhenti: semua HTTP 200, tolak (sakelar-tak-terbaca), semuanya tiba kurang dari 2 detik: ya (batas diperiksa)");
    expect(rekD).toContain("koneksi tidak mati, tetapi tidak ada yang menjawab");
    expect(runPy).toMatch(/REVOKE SELECT ON sakelar/);
    expect(runPy).toMatch(/"docker", "pause"/);
    expect(halaman).toContain("Docker menahan kontainer PostgreSQL, jadi koneksi tidak putus tetapi tidak ada yang menjawab.");
    expect(halaman).toContain("kurang dari 2 detik");
  });
  test("bagian D (flag di memori): tiga pod di Deployment; pod Rollout di bagian B dan C tidak memakai sakelar tabel; tiga pod sakelar bukan Rollout", () => {
    expect(manifesSakelar).toMatch(/^kind: Deployment$/m);
    expect(manifesSakelar).not.toMatch(/^kind: Rollout$/m);
    expect(manifesSakelar).toMatch(/^ {2}replicas: 3$/m);
    expect(manifesSakelar).toContain('"-sakelar-ttl", "5s"');
    expect(manifesGateway).toMatch(/^kind: Rollout$/m);
    expect(halaman).toContain("Tiga pod di bagian D adalah Deployment, bukan Rollout, dan pod Rollout di bagian B dan C tidak membaca sakelar.");
    expect(halaman).toContain("Rollout yang membuat pod baru dengan sakelar tabel Tidak dijalankan.");
    expect(rekD).toContain("pod 1 sesudah dimulai ulang: HTTP 200, setuju");
  });
  test("kode sakelar.go: tiga keadaan, tolak eksplisit, cache TTL, gagal baca tidak memperpanjang nilai lama, baris tidak ada tidak dianggap menyala", () => {
    expect(sakelarGo).toContain('const NamaSakelarKartu = "kartu_aktif"');
    expect(sakelarGo).toContain("case !terbaca:\n\t\t\treturn tolak(\"sakelar-tak-terbaca\"), true");
    expect(sakelarGo).toContain("case !aktif:\n\t\t\treturn tolak(\"kill-switch\"), true");
    expect(sakelarGo).toMatch(/if err != nil \{\n\t\t\t\tk\.sampai = time\.Time\{\}/);
    expect(sakelarGo).toContain("context.WithTimeout(context.WithoutCancel(ctx), BatasBacaSakelar)");
    expect(baca("labs/api-t5/internal/repo/sakelar.go")).toContain("return false, ErrTidakAda");
    expect(sakelarGo).toContain("ttl 0 = membaca database di setiap pemanggilan");
    expect(halaman).toContain("TTL 0 membaca tabel di setiap otorisasi (kode `BaruSakelarKartu`)");
    expect(halaman).toContain("Pembacaan yang gagal tidak memperpanjang nilai lama.");
    expect(halaman).toContain("Tidak terbaca berarti galat baca, tenggat 1 detik, atau baris yang tidak ada.");
    expect(halaman).toContain("dengan jawaban 200 dan keputusan tolak, bukan galat. Pembacaan dibatasi 1 detik");
  });
  test("kode bo.go: hanya petugas risk, alasan wajib, sakelar dan audit di satu transaction, cache pod sendiri diperbarui sesudah COMMIT", () => {
    const fungsi = boGo.slice(boGo.indexOf("func (s Service) SetKartuAktifBO"));
    const tx = fungsi.slice(fungsi.indexOf("s.repo.DalamTx"));
    expect(fungsi.indexOf("s.petugasRisk(ctx, pelaku)")).toBeLessThan(fungsi.indexOf("periksaAlasan(alasan)"));
    expect(tx.indexOf("tx.SakelarSet(")).toBeGreaterThan(-1);
    expect(tx).toContain("tx.SakelarSet(ctx, NamaSakelarKartu, aktif, pelaku)");
    expect(tx.indexOf("tx.SakelarSet(")).toBeLessThan(tx.indexOf("s.Audit(ctx, tx,"));
    expect(tx.indexOf("s.Audit(ctx, tx,")).toBeLessThan(tx.indexOf("s.t4.SakelarKartu.Setel(aktif)"));
    expect(halaman).toContain("baris sakelar ditulis di transaction yang sama dengan baris audit (dibaca dari kode `SetKartuAktifBO`)");
    expect(halaman).toContain("karena pod yang menulis memperbarui cache-nya sendiri sesudah COMMIT (dibaca dari kode)");
    expect(halaman).toContain("Hanya peran risk yang mengubahnya, dengan alasan wajib, dan ditulis di transaction yang sama dengan audit (dibaca dari kode).");
  });
  test("rekaman Tahap 4: penerbit tiruan membaca semua balasan yang bukan 200 sebagai tidak ada jawaban dan menyetujui (bagian D)", () => {
    const bT = rekT4.split("\n");
    const mulai = barisKe(bT, /^# --- D\./);
    const kalimat = barisKe(bT, /^# Tiruan ini memperlakukan semua balasan yang bukan 200 sebagai tidak ada jawaban/);
    expect(kalimat).toBeGreaterThan(mulai);
    expect(bT[kalimat - 1]).toContain("memutuskan menurut setelan timeout (setuju)");
    expect(bT[kalimat - 1]).toContain("tanpa merinci status HTTP lain [perlu verifikasi]");
    expect(bT[kalimat - 2]).toBe("AUTH-1 Rp90.000: setuju (sumber: timeout)");
    expect(halaman).toContain("(`otorisasi.txt` bagian D, lab t4-kartu)");
    expect(halaman).toContain("Itu penyederhanaan tiruan, dan perilaku penerbit sungguhan atas status lain [perlu verifikasi].");
  });
  test("bagian E: HPA minimum 1 maksimum 4 target CPU 50% atas Deployment; jumlah replika tepat tidak direkam; Argo CD Tidak dijalankan", () => {
    expect(rekE).toContain("HPA kartu-hpa awal: replika 1 (min 1, maks 4), target CPU 50%");
    expect(rekE).toContain("tidak melebihi maxReplicas (4): ya");
    expect(rekE).toContain("jumlah tepat bergantung beban mesin, tidak direkam");
    expect(rekE).toContain("cpu resource utilization (percentage of request) above target");
    expect(manifesHpa).toMatch(/^ {2}minReplicas: 1$/m);
    expect(manifesHpa).toMatch(/^ {2}maxReplicas: 4$/m);
    expect(manifesHpa).toMatch(/kind: Deployment/);
    expect(manifesHpa).toMatch(/averageUtilization: 50/);
    expect(rekE).toContain("Argo CD v3.5.6 Tidak dijalankan");
    expect(rekE).toContain("[perlu verifikasi]");
    expect(halaman).toContain("Di rekaman bagian E, HPA menaikkan replika dari 1 di bawah beban CPU, dan tidak melebihi `maxReplicas` 4.");
    expect(halaman).toContain("Peristiwanya menulis alasan CPU di atas target 50%.");
    expect(halaman).toContain("HPA di lab menargetkan Deployment, bukan Rollout (`hpa.txt`).");
    expect(halaman).toContain("tidak dicoba dan tetap [perlu verifikasi]");
  });
  test("testing.txt: tes Go sakelar lolos (bagian A) dan tes kill switch lama (bagian B); halaman memakai testing.txt bagian A sebagai bukti opsi G", () => {
    expect(rekTes).toContain("--- PASS: TestSakelarKartuTakTerbacaTidakMengantre");
    expect(rekTes).toContain("--- PASS: TestSakelarKartuGagalBacaTidakMemperpanjangNilaiLama");
    expect(rekTes).toContain("--- PASS: TestSetKartuAktifBOBukanRiskTidakMengubahSakelar");
    expect(rekTes).toMatch(/^# --- B\. Tes kill switch yang sudah ada/m);
    expect(halaman).toContain("Rekaman lab `sakelar.txt` bagian D dan `testing.txt` bagian A");
  });
});

describe("hitungan beban dan langkah rilis dari 1,16 yang tertulis di halaman (Hitungan atas Asumsi)", () => {
  test("puncak otorisasi kartu: 10.000 ÷ 86.400 × 10 = 1,16 dan sumber Asumsi di naskah bagian 3 dan registry", () => {
    expect(puncak).toBe(1.16);
    expect(naskah).toContain("| Otorisasi kartu | otorisasi ÷ 86.400 × puncak | 10.000 per hari (5% dari 200.000 aktif × 1, Asumsi; Tahap 4: 1.000) | 0,116 rata-rata dan 1,16 puncak");
    expect((registry.tahap[4]!.asumsi as { puncak: number }).puncak).toBe(faktorPuncak);
    expect(halaman).toContain("Asumsi beban Tahap 5: 10.000 otorisasi kartu per hari, yaitu 5% dari 200.000 user aktif dengan satu otorisasi per hari.");
    expect(halaman).toContain(`Dengan faktor puncak ${faktorPuncak}, otorisasi per detik di puncak adalah ${ribuan(otorisasiPerHari)} ÷ ${ribuan(detikPerHari)} × ${faktorPuncak} = ${koma(puncak)} (Hitungan atas Asumsi).`);
    expect(hitungKali(halaman, "1,16")).toBeGreaterThanOrEqual(10);
  });
  test("tabel langkah: 1%, 5%, 25% per detik, per jam, dan waktu sampai 10 keputusan, dibulatkan setengah ke atas", () => {
    const baris = halaman.split("\n").filter((b) => /^\| (1|5|25)% \|/.test(b));
    expect(baris).toHaveLength(LANGKAH.length);
    LANGKAH.forEach((w, i) => {
      const h = hitungLangkah(w);
      const sel = baris[i]!.split("|").slice(1, -1).map((x) => x.trim());
      expect(sel[0]).toBe(`${w}%`);
      expect(sel[1]).toBe(koma(h.perDetik));
      expect(sel[2]).toBe(`±${ribuan(h.perJam)}`);
      const waktu = w === 25 ? `${h.detikSampel} detik` : `${ribuan(h.detikSampel)} detik (±${h.menit} menit)`;
      expect(sel[3]).toBe(waktu);
    });
    expect(hitungLangkah(1)).toEqual({ perDetik: 0.0116, perJam: 42, detikSampel: 862, menit: 14 });
    expect(hitungLangkah(5)).toEqual({ perDetik: 0.058, perJam: 209, detikSampel: 172, menit: 3 });
    expect(hitungLangkah(25)).toEqual({ perDetik: 0.29, perJam: 1044, detikSampel: 34, menit: 1 });
    expect(halaman).toContain(`Langkah 1% menerima ${koma(puncak)} × 0,01 = ${koma(hitungLangkah(1).perDetik)} otorisasi per detik, yaitu ±${hitungLangkah(1).perJam} per jam.`);
    expect(halaman).toContain(`memakai ambang ${ambangC.total} keputusan dari manifes lab`);
    expect(naskah).toContain("1,16 × 0,01 = 0,0116 otorisasi per detik, ±42 per jam");
  });
  test("5 detik × 1,16 = 5,8 otorisasi yang lolos, dan 900 detik × 1,16 = 1.044 otorisasi ditolak dalam RTO 15 menit; RTO dari halaman 5.9", () => {
    expect(bulat(TTL * puncak, 1)).toBe(5.8);
    expect(bulat(rtoMenit * 60 * puncak, 0)).toBe(1044);
    const lolos = koma(bulat(TTL * puncak, 1));
    expect(halaman).toContain(`Di puncak, ${TTL} detik × ${koma(puncak)} otorisasi per detik = ${lolos} otorisasi yang masih lolos sesudah sakelar dimatikan (Hitungan atas Asumsi).`);
    expect(halaman).toContain(`Itu ${koma(puncak)} × ${TTL} di puncak (Hitungan atas Asumsi).`);
    expect(halaman).toContain(`Di puncak ${TTL} × ${koma(puncak)} = ${lolos} otorisasi lolos (Hitungan atas Asumsi).`);
    expect(halaman).toContain(`Saat ${lolos} otorisasi yang lolos sesudah sakelar dimatikan terlalu banyak.`);
    expect(hitungKali(halaman, `= ${lolos} otorisasi`)).toBe(2);
    expect(halaman).toContain(`${rtoMenit * 60} detik × ${koma(puncak)} = ${ribuan(bulat(rtoMenit * 60 * puncak, 0))} otorisasi baru ditolak`);
    expect(halaman).toContain(`Dalam RTO ${rtoMenit} menit (Asumsi produk, [[t5-rpo-rto]])`);
    expect(baca("situs/src/content/docs/tahap-5/rpo-rto-failover.mdx")).toMatch(/RTO 15 menit/);
    expect(naskah).toContain("5 × 1,16 = 5,8 otorisasi lolos");
  });
  test("1% butuh 100 replika (1 ÷ 100) dan 5% butuh 20 replika (1 ÷ 20 = 5,0%, rekaman bagian A)", () => {
    expect(bulat((1 / 100) * 100, 0)).toBe(1);
    expect(bulat((1 / 20) * 100, 1)).toBe(5);
    expect(rekA).toContain("Pod v1: 19, pod v2: 1; replika yang diminta 20, pod yang menjawab 20.");
    expect(halaman).toContain("1% butuh 100 replika, karena langkah terkecil adalah 1 ÷ replika (Hitungan)");
    expect(halaman).toContain("5% butuh 20 replika, dan 1% butuh 100.");
    expect(halaman).toContain("menghasilkan 25,0% pod versi baru, atau 33,3% dengan `maxSurge: 0` (`tanpa-router.txt` bagian A)");
    expect(rekA).toContain("Bagian pod v2 dari semua pod yang menjawab = 25.0%");
    expect(rekA).toContain("Bagian pod v2 dari semua pod yang menjawab = 33.3%");
  });
  test("bawaan maxSurge 1 di README dan kepala tanpa-router.txt salah (bawaan 25%): halaman tidak mengutip kalimat itu dan Snippet tidak menampilkan baris kepala", () => {
    expect(halaman).not.toMatch(/bawaan 1\b|bawaan: 1\b|bawaan satu/);
    expect(halaman).not.toContain("tanpa-router.txt\" lines=");
    expect(tagSnippet.filter((s) => s.file.endsWith("tanpa-router.txt"))).toEqual([]);
    // klaim 'bobot 1 sampai 99 tidak menghasilkan nol pod' salah untuk maxSurge 0 pada bobot tinggi dan tidak ditulis
    expect(halaman).not.toMatch(/1 sampai 99/);
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R5-220 sampai R5-224", () => {
  const TAUTAN: Record<string, { id: string; potongan: string[] }> = {
    "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md": { id: "R5-220", potongan: ["docs/features/canary/index.md", "v1.10.1", "without delay"] },
    "https://github.com/kubernetes-sigs/gateway-api/blob/v1.6.1/apis/v1/shared_types.go": { id: "R5-220", potongan: ["apis/v1/shared_types.go", "v1.6.1", "the proportion of requests forwarded to the referenced backend"] },
    "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/traffic-management/plugins.md": { id: "R5-220", potongan: ["traffic-management/plugins.md", "Alpha Feature (Since 1.5.0)", "will not start if it can not download or find the plugin executable"] },
    "https://github.com/argoproj-labs/rollouts-plugin-trafficrouter-gatewayapi/blob/v0.17.0/docs/provider-status.md": { id: "R5-220", potongan: ["docs/provider-status.md", "v0.17.0", "Traefik 3.7.0", "Gateway API 1.5.1", "plugin 0.13.0", "should work out of the box"] },
    "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/analysis.md": { id: "R5-221", potongan: ["docs/features/analysis.md", "v1.10.1", "setting the canary weight back to zero", "Degraded"] },
    "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/utils/evaluate/evaluate.go": { id: "R5-221", potongan: ["utils/evaluate/evaluate.go", "Without a success condition, a measurement is considered a successful if the measurement's failure condition is not true"] },
    "https://github.com/argoproj/argo-cd/blob/v3.5.6/docs/user-guide/auto_sync.md": { id: "R5-222", potongan: ["docs/user-guide/auto_sync.md", "v3.5.6", "automatically sync an application when it detects differences", "By default, changes that are made to the live cluster will not trigger automated sync"] },
    "https://github.com/argoproj/argo-cd/blob/v3.5.6/docs/user-guide/best_practices.md": { id: "R5-222", potongan: ["docs/user-guide/best_practices.md", "do not include replicas in the manifests if you want replicas to be controlled by HPA"] },
    "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/hpa-support.md": { id: "R5-222", potongan: ["docs/features/hpa-support.md", "/scale", "spec.replicas"] },
    "https://www.npmjs.com/package/@openfeature/server-sdk": { id: "R5-223", potongan: ["@openfeature/server-sdk", "1.23.0", "2026-07-28"] },
    "https://www.npmjs.com/package/@openfeature/flagd-provider": { id: "R5-223", potongan: ["@openfeature/flagd-provider", "0.18.0", "2026-10-22"] },
    "https://github.com/open-feature/spec/releases": { id: "R5-223", potongan: ["v0.9.0", "2026-07-29", "Flag evaluation calls must always return the `default value` in the event of abnormal execution."] },
    "https://laravel.com/docs/13.x/pennant": { id: "R5-223", potongan: ["Laravel 13.x", "`database` adalah bawaan", "Pennant v1.26.0", "2026-08-13", "deactivateForEveryone"] },
    "https://github.com/django-waffle/django-waffle": { id: "R5-223", potongan: ["django-waffle 5.0.0", "Switches are simple booleans: they are on or off, for everyone, all the time.", "WAFFLE_READ_FROM_WRITE_DB", "Waffle tries to store objects in cache pretty aggressively"] },
    "https://docs.serverpod.dev/cloud/concepts/deployments": { id: "R5-223", potongan: ["docs.serverpod.dev/cloud/concepts/deployments", "Cloud switches traffic automatically to the latest successful deploy, keeping the previous one live if a build fails.", "226 alamat", "Serverpod 4.1.0", "2026-10-31"] },
    "https://supabase.com/docs/guides/deployment": { id: "R5-223", potongan: ["supabase.com/docs/guides/deployment", "Updated Oct 19, 2026", "paket Pro", "empat halaman referensi middleware featureflag"] },
  };
  const semuaUrl = [...new Set([...badan.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]!))];
  test("setiap tautan luar di halaman ada di daftar sumber, dan baris riset-nya memuat bagian yang dikutip", () => {
    for (const u of semuaUrl) expect(Object.keys(TAUTAN), `tautan luar tanpa baris riset: ${u}`).toContain(u);
    for (const [u, { id, potongan }] of Object.entries(TAUTAN)) {
      expect(semuaUrl, `tautan hilang dari halaman: ${u}`).toContain(u);
      const b = barisRiset(id);
      expect(b, `baris ${id} tidak ada`).not.toBe("");
      for (const p of potongan) expect(b, `${id} tidak memuat: ${p}`).toContain(p);
    }
  });
  test("tanggal buka: semua dibuka 2026-11-04, tidak ada tanggal buka lain di halaman, dan jumlah kemunculan terkunci", () => {
    expect(halaman.match(/dibuka 20\d\d-\d\d-\d\d/g)!.every((x) => x === "dibuka 2026-11-04")).toBe(true);
    expect(hitungKali(halaman, "dibuka 2026-11-04")).toBe(SIDIK.label.dibuka);
    expect(hitungKali(halaman, "2026-11-04")).toBe(SIDIK.label.tanggal);
    for (const id of ["R5-220", "R5-221", "R5-222", "R5-223"]) expect(barisRiset(id), id).toContain("2026-11-04");
  });
  test("baris riset R5-220 sampai R5-224: ada sekali, berurutan naik, di antara R5-219 dan R5-245, dan tak tampil di halaman, JSON, atau kartu", () => {
    const ids = [...riset5.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => m[1]!);
    for (const id of ["R5-220", "R5-221", "R5-222", "R5-223", "R5-224"]) expect(ids.filter((x) => x === id)).toHaveLength(1);
    const angka = ids.map((x) => Number(x.slice(3)));
    for (let i = 1; i < angka.length; i++) expect(angka[i]!, `urutan ID riset: ${ids[i - 1]} lalu ${ids[i]}`).toBeGreaterThan(angka[i - 1]!);
    const i219 = ids.indexOf("R5-219");
    expect(ids.slice(i219, i219 + 6)).toEqual(["R5-219", "R5-220", "R5-221", "R5-222", "R5-223", "R5-224"]);
    for (const teks of [halaman, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah), JSON.stringify(kartuSemua.filter((k) => k.halaman === "t5-rollout"))]) {
      expect(teks).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(teks).not.toMatch(/keputusan \d{3,4}|tinjauan PR|\bPR #?\d{3}\b/);
    }
  });
  test("kutipan OpenFeature, Argo CD, dan Argo Rollouts di baris riset sama dengan teks mentah yang dibaca: versi dan tanggal rilis tertulis", () => {
    const b223 = barisRiset("R5-223");
    expect(b223).toContain("v0.9.0, terbit 2026-07-29");
    expect(b223).toContain("tidak ada v1.0");
    expect(halaman).toContain("Spesifikasi masih v0.9.0, belum 1.0.");
    expect(barisRiset("R5-222")).toContain("terbit 2026-10-20");
    expect(barisRiset("R5-220")).toContain("terbit 2026-09-01");
    expect(riset5).toContain("| R5-259 | Definisi komponen lain dan versi spesifikasi (5.30) |");
    expect(hal5).toContain("Spesifikasi v0.9.0, belum 1.0. Flag aktif ada satu: sakelar `kartu_aktif` ([[t5-rollout]])");
  });
  test("tab stack: enam tab dengan label dan slot yang benar, dan Go dijalankan sedangkan lima lainnya Tidak dijalankan", () => {
    const tab = halaman.match(/<TabSet id="stack" labels=\{(\[[^\]]+\])\}>/)!;
    expect(JSON.parse(tab[1]!)).toEqual(["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]);
    const slot = [...halaman.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1]);
    expect(slot).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    const potongan = halaman.split(/<Fragment slot="t\d">/).slice(1);
    expect(potongan[0]).toContain("*Dijalankan: lab t5-rollout dan api-t5, PostgreSQL 17.11, Go 1.27.3, Argo Rollouts v1.10.1, plugin Gateway API v0.17.0, dan Traefik 3.7.13");
    expect(potongan[0]).toContain("labs/api-t5/internal/service/sakelar.go\" lines=\"51:55\"");
    for (const p of potongan.slice(1)) expect(p).toContain("*Tidak dijalankan.");
    expect(potongan[1]).toContain("@openfeature/server-sdk");
    expect(potongan[2]).toContain("Laravel 13.x: Pennant");
    expect(potongan[3]).toContain("django-waffle");
    expect(potongan[4]).toContain("Serverpod Cloud: Deployments");
    expect(potongan[5]).toContain("Supabase: Deployment & Branching");
    expect(potongan[1]).toContain('client.getBooleanValue("kartu_aktif", false)');
    expect(potongan[2]).toContain("Feature::deactivateForEveryone('kartu-aktif');");
    expect(potongan[3]).toContain('waffle.switch_is_active("kartu_aktif")');
    expect(hitungKali(halaman, "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-04.")).toBe(1);
  });
});

describe("registry, tautan, template blok, tabel, urutan tebakan, widget, dan kartu", () => {
  test("registry: t5-rollout ada, 5.23, konsep, ADR 55, lab t5-rollout, prasyarat t5-m49, peran sama dengan jalur per peran naskah, menit = baca + coba", () => {
    const h = dari("t5-rollout");
    expect(h.ada).toBe(true);
    expect(h.nomor).toBe("5.23");
    expect(h.jenis).toBe("konsep");
    expect(h.inti).toBe(true);
    expect(h.adr).toEqual([55]);
    expect(h.lab).toEqual(["t5-rollout"]);
    expect(h.prasyarat).toEqual(["t5-m49"]);
    expect(h.path).toBe("tahap-5/progressive-delivery.md");
    expect(h.judul).toBe("Progressive delivery, GitOps, kill switch + ADR 55");
    expect(frontmatter).toContain(`title: "5.23 ${h.judul}"`);
    const meta = halaman.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-m49\]\] · Jalur inti<\/p>/)!;
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    // jalur per peran dari naskah: mobile 5.23 dan devops 5.23
    const jalur = naskah.slice(naskah.indexOf("Jalur per peran:"));
    expect(jalur).toMatch(/\*\*Mobile\*\*[^\n]*5\.23/);
    expect(jalur).toMatch(/\*\*DevOps\*\*[^\n]*5\.23/);
    expect(jalur).not.toMatch(/\*\*Security\*\*[^\n]*5\.23/);
    expect([...h.peran!].sort()).toEqual(["backend", "devops", "mobile"]);
    expect(dari("t5-m49").ada).toBe(true);
    expect(naskah).toContain("| 5.23 | 4 | Progressive delivery, GitOps, kill switch + ADR 55 | Konsep + ADR | ★ | t5-rollout | tebak |");
  });
  test("tautan [[ID]]: semua ID ada di registry, dan janji lintas halaman ditepati (5.22 menunjuk ke sini, 5.1 dan 5.2 menunjuk ke sini)", () => {
    const ids = new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!));
    for (const id of ids) if (id !== "berikutnya") expect(hal.some((x) => x.id === id), `[[${id}]] tidak ada di registry`).toBe(true);
    expect([...ids].sort()).toEqual(["E1", "berikutnya", "t4-kartu", "t4-tim-infra", "t5-adr-60", "t5-m49", "t5-prd", "t5-rpo-rto", "t5-tim-infra"]);
    expect(baca("situs/src/content/docs/tahap-5/m49-canary-sepertiga.mdx")).toContain("[[t5-rollout]]: progressive delivery, canary dengan traffic router, GitOps, dan kill switch yang dibaca semua pod. Keputusannya ADR 55.");
    expect(hal5).toContain("| Tempat flag kill switch kartu di luar proses | Dikerjakan: satu sakelar `kartu_aktif` di tabel `sakelar`, dibaca semua pod | ADR 55, [[t5-rollout]] |");
    expect(hal5).toContain("| Rilis kartu bertahap 1%, 5%, 25%, 100% | Dikerjakan: canary lewat Argo Rollouts | ADR 55, [[t5-rollout]] |");
    expect(baca("situs/src/content/docs/tahap-5/fitur-ke-teknis.mdx")).toContain("[[t5-rollout\\|Progressive delivery, feature flag, dan GitOps]]");
    // butir 'Sengaja belum' 4.26 yang ditutup halaman ini
    expect(hal4).toContain("| Tempat flag kill switch kartu di luar proses |");
    expect(hal4).toContain("| Rilis kartu bertahap 1%, 5%, 25%, 100% |");
    expect(halaman).toContain("[[t4-tim-infra]] menundanya.");
    expect(halaman).not.toContain("t4-adr-45");
  });
  test("lima blok berurutan dengan dua pertama terbuka, template konsep, tabel ADR 5 dan 4 kolom, tabel Sengaja belum 3 kolom, tabel langkah 4 kolom", () => {
    const bloks = daftarBlok(halaman);
    expect(bloks.map((b) => b.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(bloks.map((b) => b.buka)).toEqual([true, true, false, false, false]);
    expect(cekTemplat("konsep", bloks)).toEqual([]);
    const tabel = badan.split("\n").filter((b) => b.startsWith("|"));
    const kolom = (b: string): number => b.split("|").length - 2;
    const kelompok: string[][] = [];
    badan.split("\n").forEach((b, i, semuaBaris) => {
      if (!b.startsWith("|")) return;
      if (i > 0 && semuaBaris[i - 1]!.startsWith("|")) kelompok[kelompok.length - 1]!.push(b);
      else kelompok.push([b]);
    });
    expect(tabel).toHaveLength(kelompok.flat().length);
    expect(kelompok.map((k) => [...new Set(k.map(kolom))])).toEqual([[4], [5], [4], [3]]);
    for (const k of kelompok) expect(k[1]).toMatch(/^\|(---\|)+$/);
    expect(kelompok.map((k) => k.length)).toEqual([5, 7, 7, 9]); // judul kolom, pemisah, dan butir
    expect(kelompok[1]![0]).toBe("| | A. Rasio replika saja | B. 20 replika tetap | C. Blue/green | D. Argo Rollouts dengan Gateway API |");
    expect(kelompok[2]![0]).toBe("| | E. Flag di memori (ADR 42) | F. OpenFeature dan flagd | G. Sakelar di tabel `sakelar` |");
    expect(halaman.match(/^#{1,6} .*$/gm)).toEqual(["## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 55: rilis lewat router, analisis yang membalik rilis, dan satu sakelar di tabel", "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
  });
  test("ADR 55: tujuh aturan, lima alasan 'Kenapa D dan G', tiga pre-mortem, enam kapan salah, tujuh baris Sengaja belum, dan dua opsi dipilih (D dan G)", () => {
    const adr = halaman.slice(halaman.indexOf("**Keputusan: opsi D untuk rilis dan opsi G untuk kill switch.**"));
    expect(adr).toContain("Tujuh aturan:");
    expect([...adr.matchAll(/^(\d)\. /gm)].map((m) => m[1]).slice(0, 7)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect([...adr.slice(adr.indexOf("**Kenapa D dan G")).matchAll(/^- \*\*([A-F]) (ditolak|ditunda)\*\*/gm)].map((m) => m[1]).join("")).toBe("ABCEF");
    const preMortem = adr.slice(adr.indexOf("**Pre-mortem.**"), adr.indexOf("**Kapan keputusan ini salah.**"));
    expect([...preMortem.matchAll(/^\d\. /gm)]).toHaveLength(3);
    const kapanSalah = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Yang akan merevisinya.**"));
    expect([...kapanSalah.matchAll(/^- /gm)]).toHaveLength(6);
    const sengaja = halaman.slice(halaman.indexOf("### Sengaja belum dilakukan"), halaman.indexOf('<Blok nama="Kunci">'));
    expect([...sengaja.matchAll(/^\| /gm)]).toHaveLength(8); // judul kolom dan tujuh butir
    expect(halaman).toContain("OpenFeature dan flagd tidak dipasang selama flag aktif hanya satu dan spesifikasi belum 1.0 ([[t5-adr-60]]).");
    expect(naskah).toContain("| 55 | Rilis lewat Argo Rollouts v1.10.1: canary 1%, 5%, 25%, 100% dengan bobot dari Gateway API lewat plugin");
    expect(naskah).toContain("OpenFeature dan flagd tidak dipasang (spesifikasi belum 1.0; ADR 60)");
  });
  test("Rantai Inti: skema Zod valid, dua baris, tiga simpul, nada, dan angka sama dengan rekaman", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-rollout-inti");
    expect(d.sumber.jenis).toBe("rekaman");
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    const teks = JSON.stringify(d);
    expect(teks).toContain("Bobot 95 dan 5");
    expect(teks).toContain("pod versi baru 1 dari 4");
    expect(teks).toContain("Menolak 31%");
    expect(teks).toContain("100 dari 100 ke versi lama");
    expect(d.baris[0]!.simpul[1]!.nada).toBe("warn");
    expect(d.baris[0]!.simpul[2]!.nada).toBe("good");
    expect(d.baris[1]!.simpul.map((s) => s.nada)).toEqual(["biasa", "good", "good"]);
    expect(rantaiMentah.sumber.teks).toBe("Rekaman lab t5-rollout · gateway.txt, analisis.txt, sakelar.txt");
    expect(d.baris[0]!.simpul[1]!.sub).toBe("versi baru, Ilustrasi dari flag lab");
    // simpul akhir terbaca benar tanpa sub (sub disembunyikan di HP)
    expect(d.baris.map((b) => b.simpul[b.simpul.length - 1]!.teks)).toEqual(["Rilis dibatalkan", "Semua menolak"]);
    expect(halaman).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t5-rollout-inti.json";');
    expect(halaman).toContain("Router memegang bobot canary, satu tabel memegang kill switch.");
  });
  test("Tebak: skema Zod valid, jawaban benar di posisi pertama (berbeda dari 5.3, 5.5, 5.9, 5.30), jawaban tidak tertulis sebelum widget, dan sesuai rekaman", () => {
    const d = DataTebak.parse(tebakMentah);
    expect(d.pilihan).toHaveLength(4);
    expect(d.pilihan.findIndex((p) => p.benar)).toBe(0);
    const posisi = ["t5-skema-tebak", "t5-replica-tebak", "t5-rpo-tebak", "t5-adr60-tebak"].map((n) => (JSON.parse(baca(`situs/data/widget/${n}.json`)) as { pilihan: { benar: boolean }[] }).pilihan.findIndex((p) => p.benar));
    expect(posisi).not.toContain(0);
    expect(d.sumber.jenis).toBe("rekaman");
    expect(d.adegan.join(" ")).toContain(`${TTL} detik`);
    expect(d.adegan.join(" ")).toContain(`paling lama ${tenggatPenerbit} detik`);
    expect(d.pilihan[0]!.teks).toBe(`HTTP 200 dengan keputusan tolak dan alasan sakelar-tak-terbaca, tiba kurang dari ${tenggatPenerbit} detik.`);
    expect(d.pilihan[1]!.teks).toContain("HTTP 503");
    expect(d.pilihan[3]!.alasan).toContain(`dibatasi ${batasBacaKode} detik, lebih pendek dari tenggat penerbit ${tenggatPenerbit} detik`);
    expect(d.pilihan[1]!.alasan).toContain("(otorisasi.txt bagian D, lab t4-kartu)");
    expect(halaman).toContain("<Tebak client:visible data={dataTebak} />");
    // atribut aman di baris Blok Coba tampil SESUDAH isi blok (Blok.astro), jadi baris itu tidak dihitung sebagai teks di atas widget
    const blokAstro = baca("situs/src/components/Blok.astro");
    expect(blokAstro.indexOf("<slot />")).toBeLessThan(blokAstro.indexOf("{aman &&"));
    const sebelum = halaman.slice(0, halaman.indexOf("Tebak dulu apa yang dijawab satu pod kartu saat sakelarnya tidak terbaca.")).split("\n").filter((l) => !l.startsWith('<Blok nama="Coba"')).join("\n");
    expect(sebelum.length).toBeGreaterThan(1000);
    expect(sebelum).not.toMatch(/sakelar-tak-terbaca|tak terbaca|tidak terbaca|tolak yang eksplisit|jawaban yang eksplisit/i);
    expect(sebelum).not.toMatch(/HTTP 503|HTTP 200|dijawab 200/);
    // jalur varian ('Ubah satu hal') menulis dua penyebab dan jawaban yang sama
    expect(halaman).toContain("**Ubah satu hal:** ganti penyebab sakelar tidak terbaca. Bagian D merekam dua penyebab, yaitu hak SELECT atas tabel dicabut dan kontainer PostgreSQL ditahan dengan `docker pause`. Jawaban kedua penyebab sama: 200, tolak, `sakelar-tak-terbaca`.");
  });
  test("Snippet: sepuluh Snippet berberkas, rentang baris diturunkan dari isi berkas, tanpa ID riset, nomor keputusan, atau rujukan internal, dan baris kepala rekaman tak tampil", () => {
    expect(tagSnippet).toHaveLength(URUTAN_SNIPPET.length);
    URUTAN_SNIPPET.forEach((kunci, i) => {
      const r = RENTANG[kunci]!;
      const s = tagSnippet[i]!;
      expect(s.file, kunci).toBe(r.berkas);
      expect(s.lines, kunci).toBe(`${r.awal}:${r.akhir}`);
      expect(s.title, kunci).toContain(r.berkas);
      const isi = baca(r.berkas).split("\n").slice(r.awal - 1, r.akhir).join("\n");
      expect(isi, kunci).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d|tinjauan|PR #?\d{3}|mutasi/);
      expect(isi, kunci).not.toMatch(/^# (PostgreSQL|Rekaman dari|Lab t5-rollout)/m);
    });
    expect(tagSnippet.map((s) => s.lang)).toEqual(["yaml", "text", "yaml", "text", "go", "text", "go", "text", "text", "go"]);
    expect(hitungKali(badan, "<Snippet lang=")).toBe(3);
    // judul Snippet menyebut bagian rekaman dengan kata, bukan label rekaman internal
    for (const s of tagSnippet) expect(s.title).not.toMatch(/\b[A-G]\d\b/);
    expect(rekB.split("\n")[RENTANG.gateway!.awal - 1]).toBe("Rollout kartu versi v1: phase Healthy, 3 pod siap");
  });
  test("struktur baris kosong dan panjang paragraf: tiap paragraf prosa berdiri sendiri, dan tabel, Snippet, Rantai, widget, dan daftar didahului dan diikuti baris kosong", () => {
    const b = badan.split("\n");
    const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
    const prosa = (x: string): boolean => x.trim() !== "" && !/^(\||- |<|###|##|\d+\. |- \[)/.test(x);
    let dalamTag = false; // kode di dalam atribut Snippet memanjang beberapa baris
    for (let i = 0; i < b.length; i++) {
      const x = b[i]!;
      const sebelum = i > 0 ? b[i - 1]! : "";
      const sesudah = i < b.length - 1 ? b[i + 1]! : "";
      const lanjutan = dalamTag;
      if (/^<Snippet/.test(x) && !x.endsWith("/>")) dalamTag = true;
      else if (dalamTag && x.endsWith("/>")) dalamTag = false;
      if (lanjutan) continue;
      if (prosa(x)) {
        expect(sebelum === "" || /^<(summary|noscript|p>)/.test(sebelum), `baris ${i + 1} didahului baris kosong: ${x.slice(0, 50)}`).toBe(true);
        expect(sesudah === "" || /^<\/noscript>/.test(sesudah), `baris ${i + 1} diikuti baris kosong: ${x.slice(0, 50)}`).toBe(true);
      }
      if (/^(<Snippet|<Rantai|<Tebak)/.test(x)) {
        expect(sebelum, `baris ${i + 1} (${x.slice(0, 20)}) didahului baris kosong`).toBe("");
        // tag Snippet dengan kode di dalam atribut bisa memanjang beberapa baris: tag selesai di baris yang berakhir "/>"
        let j = i;
        while (!b[j]!.endsWith("/>")) j++;
        expect(j < b.length - 1 ? b[j + 1]! : "", `baris ${j + 1} (akhir tag ${x.slice(0, 20)}) diikuti baris kosong`).toBe("");
      }
      if (x.startsWith("|") && !sebelum.startsWith("|")) expect(sebelum, `tabel di baris ${i + 1} didahului baris kosong`).toBe("");
      if (x.startsWith("|") && !sesudah.startsWith("|")) expect(sesudah, `tabel di baris ${i + 1} diikuti baris kosong`).toBe("");
    }
    for (const x of b.filter(prosa)) expect(x.split(SPLIT).length, x.slice(0, 50)).toBeLessThanOrEqual(4 + (x.startsWith("**") ? 1 : 0));
  });
  test("kartu Cek diri: empat kartu dari empat soal halaman, dengan tanya dan jawab sama dengan MDX", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t5-rollout");
    expect(kartu).toHaveLength(4);
    expect(kartu.map((k) => k.id)).toEqual(["t5-rollout-1", "t5-rollout-2", "t5-rollout-3", "t5-rollout-4"]);
    const soal = [...halaman.matchAll(/^\*\*(\d)\.\*\* (.*)$/gm)].map((m) => m[2]!);
    expect(soal).toHaveLength(4);
    kartu.forEach((k, i) => {
      expect(k.url).toBe("tahap-5/progressive-delivery/");
      expect(k.judul).toBe("5.23 Progressive delivery, GitOps, kill switch + ADR 55");
      expect(k.tanya.replace(/`/g, "")).toBe(soal[i]!.replace(/`/g, ""));
      expect(halaman.replace(/`/g, "")).toContain(k.jawab.replace(/`/g, ""));
    });
  });
});

// --- tinjauan mutasi tanpa kunci (keputusan 1588): versi, nomor ADR, sel tabel, dan kelas details diturunkan dari sumber atau diikat ke kata kuncinya
describe("celah mutasi tanpa kunci: nomor versi, nomor ADR, sel tabel per baris dan kolom, dan kelas details", () => {
  test("setiap nomor versi di halaman ada di kepala rekaman, manifes plugin, atau baris riset R5-220 sampai R5-224, dan himpunannya terkunci", () => {
    const kepala = [rekB, rekC, rekD, rekE].map((r) => r.split("\n").slice(0, 3).join("\n")).join("\n");
    const sumber = [kepala, manifesPlugin, ...["R5-220", "R5-221", "R5-222", "R5-223", "R5-224"].map(barisRiset)].join("\n");
    const dipakai = [...new Set(halaman.match(/\bv?\d+\.\d+\.\d+\b/g) ?? [])].sort();
    for (const v of dipakai) expect(sumber, `versi ${v} tidak ada di sumber`).toContain(v);
    expect(dipakai).toEqual(["0.13.0", "0.18.0", "0.3.0", "1.23.0", "1.27.3", "1.5.0", "1.5.1", "3.7.0", "3.7.13", "4.1.0", "5.0.0", "v0.17.0", "v0.9.0", "v1.10.1", "v1.6.1", "v3.5.6"]);
    expect(hitungKali(halaman, "13.x")).toBe(4);
    expect(barisRiset("R5-223")).toContain("Laravel 13.x");
    expect(kepala).toContain("PostgreSQL 17.11");
    expect(hitungKali(halaman, "PostgreSQL 17.11")).toBe(1);
    // satu tag per sumber: v1.10.1 dalam URL dokumentasi Argo Rollouts sama dengan versi di kepala rekaman
    for (const u of halaman.match(/argo-rollouts\/blob\/(v[\d.]+)\//g) ?? []) expect(u).toBe("argo-rollouts/blob/v1.10.1/");
    for (const u of halaman.match(/argo-cd\/blob\/(v[\d.]+)\//g) ?? []) expect(u).toBe("argo-cd/blob/v3.5.6/");
    expect(hitungKali(halaman, "v3.5.6")).toBe(10);
  });
  test("nomor ADR di halaman: hanya 55 (registry), 42 (4.23), 44 (4.26), 10 (1.33), dan 60 (5.30), dengan jumlah kemunculan terkunci", () => {
    const judul = (rel: string): number => Number(baca(rel).match(/^title: ".*ADR (\d+)/m)![1]);
    const sah = new Map<number, string>([
      [dari("t5-rollout").adr![0]!, "registry t5-rollout"],
      [judul("situs/src/content/docs/tahap-4/kartu-virtual.mdx"), "4.23"],
      [judul("situs/src/content/docs/tahap-4/tim-infra.mdx"), "4.26"],
      [judul("situs/src/content/docs/tahap-1/app-versi-lama.mdx"), "1.33"],
      [judul("situs/src/content/docs/tahap-5/sengaja-belum.mdx"), "5.30"],
    ]);
    const dipakai = [...halaman.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]));
    for (const n of dipakai) expect([...sah.keys()], `ADR ${n} tidak ada di sumber`).toContain(n);
    const hitung = Object.fromEntries([...sah.keys()].map((n) => [n, dipakai.filter((x) => x === n).length]));
    expect(hitung).toEqual({ 55: 6, 42: 4, 44: 1, 10: 1, 60: 0 });
    expect(halaman).toContain("ADR 42 ([[t4-kartu]]) butir 7 meminta");
    expect(halaman).toContain("(ADR 44)");
    expect(halaman).toContain("butir 4 ADR 10");
  });
  test("sel tabel ADR, langkah, dan Sengaja belum: tiap sel memuat kata kuncinya di baris dan kolom yang benar", () => {
    const sel = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
    const baris = badan.split("\n");
    const kelompok: string[][][] = [];
    baris.forEach((b, i) => {
      if (!b.startsWith("|") || /^\|(---\|)+$/.test(b)) return;
      if (i > 0 && (baris[i - 1]!.startsWith("|"))) kelompok[kelompok.length - 1]!.push(sel(b));
      else kelompok.push([sel(b)]);
    });
    const harap: string[][][] = [
      [["Langkah", "Otorisasi per detik di versi baru", "Per jam", "Waktu sampai"], ["1%"], ["5%"], ["25%"]],
      [
        ["", "A. Rasio replika saja", "B. 20 replika tetap", "C. Blue/green", "D. Argo Rollouts dengan Gateway API"],
        ["Cara kerja", "Rollout tanpa `trafficRouting`", "Replika tetap 20", "`previewService`", "Plugin menulis bobot ke HTTPRoute"],
        ["Kelebihan", "Tanpa router dan plugin", "Tanpa router, 5% terwujud", "diuji sebelum menerima lalu lintas biasa", "95 dan 5 dengan 3 replika"],
        ["Kekurangan", "25,0% atau 33,3%", "1% butuh 100 replika", "Tidak ada langkah 1%", "Plugin alpha"],
        ["Biaya operasional", "Paling kecil", "20 pod berjalan terus", "Pod versi baru berjalan penuh", "Controller, plugin dengan sha256"],
        ["Bukti", "`tanpa-router.txt` bagian A", "(20 replika)", "Tidak dijalankan: dokumentasi", "`gateway.txt` bagian B dan `analisis.txt` bagian C"],
      ],
      [
        ["", "E. Flag di memori (ADR 42)", "F. OpenFeature dan flagd", "G. Sakelar di tabel `sakelar`"],
        ["Cara kerja", "Penanda boolean di memori", "Penyedia flag dibaca lewat OpenFeature SDK", "Satu baris `kartu_aktif` di primary"],
        ["Kelebihan", "Tanpa pembacaan dan tanpa cache", "Satu API evaluasi flag", "Satu tempat untuk semua pod"],
        ["Kekurangan", "Tiap proses punya flag sendiri", "Spesifikasi belum 1.0", "Pod lain tertinggal sampai cache habis"],
        ["Biaya operasional", "Tidak ada", "Provider dan mesin evaluasi", "Satu tabel dan satu cache per pod"],
        ["Bukti", "(flag di memori)", "Tidak dijalankan: spesifikasi dan npm", "`testing.txt` bagian A"],
      ],
      [
        ["Yang ditunda", "Kenapa ditunda", "Muncul lagi di"],
        ["Argo CD v3.5.6", "Butuh repo Git", "[[t5-tim-infra]]"],
        ["Langkah 1% dan 25%", "Lab merekam langkah 5%", "Belum dijadwalkan"],
        ["Analisis p95", "Prometheus tidak dipasang", "[[t5-tim-infra]]"],
        ["Router selain Traefik", "Hanya Traefik 3.7.13", "Belum dijadwalkan"],
        ["HPA atas Rollout", "HPA di lab menargetkan Deployment", "Belum dijadwalkan"],
        ["Rollout yang membuat pod", "Pod Rollout di lab memakai flag memori", "Belum dijadwalkan"],
        ["OpenFeature dan flagd", "Spesifikasi v0.9.0", "[[t5-adr-60]]"],
      ],
    ];
    expect(kelompok.map((k) => k.length)).toEqual(harap.map((k) => k.length));
    harap.forEach((tab, ti) => tab.forEach((baris2, ri) => {
      const nyata = kelompok[ti]![ri]!;
      if (baris2.length === 1) {
        expect(nyata[0], `tabel ${ti} baris ${ri}`).toBe(baris2[0]);
        return;
      }
      expect(nyata.length, `tabel ${ti} baris ${ri}: jumlah sel`).toBe(baris2.length);
      baris2.forEach((kata2, ci) => {
        if (ci === 0 && (ti === 1 || ti === 2 || ri === 0)) expect(nyata[ci], `tabel ${ti} baris ${ri} kolom ${ci}`).toBe(kata2);
        else expect(nyata[ci], `tabel ${ti} baris ${ri} kolom ${ci}`).toContain(kata2);
      });
    }));
  });
  test("kelas details: satu pertanyaan (question) di Inti dan empat jawaban (success) di Cek diri, tidak tertukar", () => {
    const inti = halaman.slice(halaman.indexOf("<Blok nama=\"Mulai\""), halaman.indexOf("<Blok nama=\"Coba\""));
    expect(hitungKali(inti, '<details class="question">')).toBe(1);
    expect(hitungKali(inti, '<details class="success">')).toBe(0);
    const kunci = halaman.slice(halaman.indexOf("<Blok nama=\"Kunci\""));
    expect(hitungKali(kunci, '<details class="success">')).toBe(4);
    expect(hitungKali(kunci, '<details class="question">')).toBe(0);
    expect(hitungKali(halaman, "<details")).toBe(5);
  });
});

function huruf1(s: string): string { return s[0]!.toUpperCase() + s.slice(1); }
void huruf1;

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "wajib", "menolak", "menyetujui", "berjalan", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lolos", "gagal", "seketika", "paling lama", "paling sedikit"];
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
const kartuT5rollout = kartuSemua.filter((x) => x.halaman === "t5-rollout");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-11-04/g) ?? []).length,
    dibacaDariKode: (halaman.match(/[Dd]ibaca dari kode/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), tebak: sidikKata(nilaiString(tebakMentah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa2.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-220", "R5-221", "R5-222", "R5-223", "R5-224"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), kartu: h16(JSON.stringify(kartuT5rollout)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah), kartu: tekstual(kartuT5rollout) },
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat progressive-delivery.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "progressive-delivery.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, tebakan, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, tebakan, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.perluVerifikasi).toBe(SIDIK.label.perluVerifikasi);
    expect(sidikSekarang.label.rekamanLab).toBe(SIDIK.label.rekamanLab);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan tebakan", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.tebak).toEqual(SIDIK.tebak);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
