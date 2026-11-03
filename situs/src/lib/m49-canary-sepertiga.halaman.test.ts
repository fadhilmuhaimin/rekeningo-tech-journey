// Penjaga halaman 5.22 (keputusan 1584 sampai 1586): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim "tidak" dan "hanya",
// urutan tebakan, diagram Rantai t5-m49-canary-pod.json, skenario alur t5-m49.json, kartu Cek diri, dan baris riset di m49-canary-sepertiga.mdx.
// Nilai diturunkan dari rekaman labs/t5-rollout/output/tanpa-router.txt (bagian A) dan sakelar.txt (bagian D), kepala rekaman, kode api-t5
// (kartu.go, main.go, sakelar.go), rekaman Tahap 4 kill-switch.txt, naskah Tahap 5 (baris M49), halaman 4.23, registry, dan baris riset
// R5-215 sampai R5-219, bukan dari daftar yang ditulis sendiri. Hitungan pasangan pod memakai salinan logika fungsi
// approximateWeightedCanaryStableReplicaCounts (Argo Rollouts v1.10.1, dibaca dari kode, R5-217) di bawah, dan hasilnya dibandingkan dengan rekaman.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// m49-canary-sepertiga.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah
// teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m49-canary-sepertiga.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya merekam bagian pod, batas bagian permintaan, dan tiga pod dengan flag
// di memori; bagian user, hitungan permintaan tepat, p95, analisis, dan bobot Gateway API tidak dipakai di sini, dan angka cerita adalah Ilustrasi.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m49-canary-pod.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m49-canary-sepertiga.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-5/m49-canary-sepertiga.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenarioBerkas = "situs/lama/widgets/data/skenario/t5-m49.json";
const skenario = JSON.parse(baca(skenarioBerkas)) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const rekA = baca("labs/t5-rollout/output/tanpa-router.txt");
const rekABaris = rekA.split("\n");
const rekD = baca("labs/t5-rollout/output/sakelar.txt");
const rekDBaris = rekD.split("\n");
const rekT4 = baca("labs/t4-kartu/output/kill-switch.txt");
const kartuGo = baca("labs/api-t5/internal/service/kartu.go");
const kartuGoBaris = kartuGo.split("\n");
const mainGo = baca("labs/api-t5/cmd/api/main.go");
const sakelarGo = baca("labs/api-t5/internal/service/sakelar.go");
const runPy = baca("labs/t5-rollout/run.py");
const hal423 = baca("situs/src/content/docs/tahap-4/kartu-virtual.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
  jalurTebakan: (d: Skenario) => string;
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};

const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const pecahBaris = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
// pembulatan setengah ke atas seperti pembaca, bukan toFixed
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number, d = 1): string => bulat(x, d).toFixed(d).replace(".", ",");
const KATA_BILANGAN: Record<number, string> = { 0: "nol", 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam" };
const kata = (n: number): string => {
  const k = KATA_BILANGAN[n];
  if (!k) throw new Error(`kata bilangan untuk ${n} belum ada`);
  return k;
};
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;

// --- salinan logika Argo Rollouts v1.10.1 (utils/replicaset/canary.go, dibaca dari kode: R5-217), untuk Hitungan atas kode
const ketemuSetengah = (bobot: number, maksBobot: number, total: number): boolean => {
  const x = total * (bobot / maksBobot);
  return x - Math.floor(x) === 0.5;
};
const selisihBobot = (bobot: number, maksBobot: number, canary: number, total: number): number => Math.abs((canary * maksBobot) / total - bobot);
interface Pilihan { canary: number; total: number; selisih: number }
const timbang = (spec: number, bobot: number, maksSurge: number, maksBobot = 100): { opsi: Pilihan[]; terbaik: { canary: number; stabil: number } } => {
  const atas = Math.ceil((spec * bobot) / maksBobot);
  const bawah = Math.floor((spec * bobot) / maksBobot);
  const seri = ketemuSetengah(bobot, maksBobot, spec);
  const nolBoleh = bobot === maksBobot || bobot === 0 || (spec === 1 && maksSurge === 0);
  const opsi: { canary: number; total: number }[] = [];
  if (atas < spec || nolBoleh) opsi.push({ canary: atas, total: spec });
  if (!seri && (bawah !== 0 || nolBoleh)) opsi.push({ canary: bawah, total: spec });
  if (maksSurge > 0) {
    opsi.push({ canary: atas, total: spec + 1 });
    const seriSurge = ketemuSetengah(bobot, maksBobot, spec + 1);
    if (!seriSurge && (bawah !== 0 || nolBoleh)) opsi.push({ canary: bawah, total: spec + 1 });
  }
  const dengan = opsi.map((o) => ({ ...o, selisih: selisihBobot(bobot, maksBobot, o.canary, o.total) }));
  let terbaik = dengan[0]!;
  for (const o of dengan.slice(1)) if (o.selisih < terbaik.selisih) terbaik = o;
  return { opsi: dengan, terbaik: { canary: terbaik.canary, stabil: terbaik.total - terbaik.canary } };
};

// --- rekaman tanpa-router.txt bagian A
const barisKe = (baris: string[], pola: RegExp, dari0 = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan`);
  return i;
};
interface Pengaturan { v1: number; v2: number; diminta: number; menjawab: number; persen: number; persenTertulis: string; bawah: number; atas: number; awal: number; akhir: number }
const bacaPengaturan = (judul: RegExp): Pengaturan => {
  const awal = barisKe(rekABaris, judul);
  const akhir = (() => { const i = rekABaris.findIndex((b, k) => k > awal && /^(## |# ---)/.test(b)); return i < 0 ? rekABaris.length : i; })();
  const blok = rekABaris.slice(awal, akhir).join("\n");
  const pod = cari(/Pod v1: (\d+), pod v2: (\d+); replika yang diminta (\d+), pod yang menjawab (\d+)\./, blok, "pod");
  const bagian = cari(/Bagian pod v2 dari semua pod yang menjawab = ([\d.]+)% \(diminta 5%\)\. Bagian permintaan yang dijawab v2 terukur antara ([\d.]+)% dan ([\d.]+)%: ya \(batas diperiksa; hitungan permintaan tepat bergantung penyeimbang beban dan tidak direkam\)\./, blok, "bagian");
  const baris = rekABaris.slice(awal, akhir);
  return {
    v1: Number(pod[1]), v2: Number(pod[2]), diminta: Number(pod[3]), menjawab: Number(pod[4]),
    persen: (100 * Number(pod[2])) / (Number(pod[1]) + Number(pod[2])), persenTertulis: bagian[1]!, bawah: Number(bagian[2]), atas: Number(bagian[3]),
    awal: awal + 1 + baris.findIndex((b) => b.startsWith("$ kubectl get rs")), akhir: awal + 1 + baris.findIndex((b) => b.startsWith("Bagian pod v2 dari semua pod")),
  };
};
const A3 = bacaPengaturan(/^## 3 replika$/);
const A20 = bacaPengaturan(/^## 20 replika$/);
const A3S0 = bacaPengaturan(/^## 3 replika, maxSurge 0 \(bukan bawaan\)$/);
const pk = (x: number): string => koma(x, 1);
const titik = (x: number): string => bulat(x, 1).toFixed(1);
const ringkasA = rekA.slice(rekA.indexOf("# --- Ringkas ---"));
const versiA = {
  argo: cari(/Argo Rollouts (v\d+\.\d+\.\d+)/, rekABaris[1]!, "Argo Rollouts")[1]!,
  k3s: cari(/k3s (v\d+\.\d+\.\d+\+k3s\d+)/, rekABaris[1]!, "k3s")[1]!,
  k3d: cari(/k3d (v\d+\.\d+\.\d+)/, rekABaris[1]!, "k3d")[1]!,
  traefik: cari(/Traefik (\d+\.\d+\.\d+)/, rekABaris[1]!, "Traefik")[1]!,
  go: cari(/go(\d+\.\d+\.\d+)/, rekABaris[1]!, "go")[1]!,
  pg: cari(/PostgreSQL (\d+\.\d+)/, rekABaris[1]!, "PostgreSQL")[1]!,
};

// --- rekaman sakelar.txt bagian D, hanya bagian pertama (flag di memori)
const dAwal = barisKe(rekDBaris, /^# --- D1\. Versi pertama: flag di memori, tiga pod \(tanpa -sakelar-tabel\) ---$/);
const dAkhir = barisKe(rekDBaris, /^# --- D2\./, dAwal);
const dBlok = rekDBaris.slice(dAwal + 1, dAkhir);
const dMulai = dAwal + 2; // nomor baris (1-based) komentar pertama sesudah judul bagian
const dSelesai = dAwal + 1 + dBlok.findIndex((b) => b.startsWith("# Pod yang dimulai ulang kembali menyetujui")) + 1;
const keputusanPod = (label: string): { pod: number; keputusan: string }[] =>
  dBlok.map((b) => b.match(new RegExp(`^otorisasi Rp1\\.000 di pod (\\d) ${label}: HTTP 200, (setuju|tolak \\(kill-switch\\))$`))).filter((m): m is RegExpMatchArray => m !== null).map((m) => ({ pod: Number(m[1]), keputusan: m[2]!.startsWith("setuju") ? "setuju" : "tolak" }));
const sebelum = keputusanPod("sebelum kill switch");
const sesudah = keputusanPod("sesudah kill switch dimatikan");
const podTolak = sesudah.filter((x) => x.keputusan === "tolak").map((x) => x.pod);
const podSetuju = sesudah.filter((x) => x.keputusan === "setuju").map((x) => x.pod);
const podUlang = dBlok.map((b) => b.match(/^otorisasi Rp1\.000 di pod (\d) sesudah dimulai ulang: HTTP 200, setuju$/)).filter((m): m is RegExpMatchArray => m !== null).map((m) => Number(m[1]));
const bagianDi = (baris: string[], n: number): string => {
  for (let i = n - 1; i >= 0; i--) { const m = baris[i]!.match(/^# --- ([A-G])\d?\./); if (m) return m[1]!; }
  throw new Error(`rekaman: bagian untuk baris ${n} tidak ditemukan`);
};

// --- kode lab
const nKartuGo = kartuGoBaris.findIndex((b) => b.startsWith("// KartuAktifSekarang:")) + 1;

// --- naskah, baris M49
const barisM49 = naskah.split("\n").find((b) => b.startsWith("| M49 |")) ?? "";
const kolomM49 = pecahBaris(barisM49);
const mingguM49 = Number(kolomM49[1]);

describe("rekaman tanpa-router.txt dan hitungan pasangan pod: diturunkan dari berkas rekaman dan salinan logika Argo Rollouts v1.10.1", () => {
  test("tiga pengaturan: 3 replika (1 baru, 3 lama), 20 replika (1 baru, 19 lama), 3 replika maxSurge 0 (1 baru, 2 lama); bagian pod tertulis sama dengan hitungan", () => {
    expect([A3.v2, A3.v1, A3.diminta, A3.menjawab]).toEqual([1, 3, 3, 4]);
    expect([A20.v2, A20.v1, A20.diminta, A20.menjawab]).toEqual([1, 19, 20, 20]);
    expect([A3S0.v2, A3S0.v1, A3S0.diminta, A3S0.menjawab]).toEqual([1, 2, 3, 3]);
    for (const a of [A3, A20, A3S0]) expect(a.persenTertulis).toBe(titik(a.persen));
    expect([titik(A3.persen), titik(A20.persen), titik(A3S0.persen)]).toEqual(["25.0", "5.0", "33.3"]);
    expect(ringkasA).toContain(`- 3 replika: 1 pod canary dan 3 pod stabil menjawab; bagian pod v2 ${titik(A3.persen)}%`);
    expect(ringkasA).toContain(`- 20 replika: 1 pod canary dan 19 pod stabil menjawab; bagian pod v2 ${titik(A20.persen)}%`);
    expect(ringkasA).toContain(`- 3 replika, maxSurge 0: 1 pod canary dan 2 pod stabil menjawab; bagian pod v2 ${titik(A3S0.persen)}%`);
  });
  test("salinan logika Argo Rollouts menghasilkan pasangan yang sama dengan rekaman, dan 5% dari tiga pod tidak dibulatkan ke nol", () => {
    expect(timbang(3, 5, 1).terbaik).toEqual({ canary: A3.v2, stabil: A3.v1 });
    expect(timbang(3, 5, 0).terbaik).toEqual({ canary: A3S0.v2, stabil: A3S0.v1 });
    expect(timbang(20, 5, 1).terbaik).toEqual({ canary: A20.v2, stabil: A20.v1 });
    expect(timbang(20, 5, 5).terbaik).toEqual({ canary: A20.v2, stabil: A20.v1 });
    expect(Math.floor((3 * 5) / 100)).toBe(0);
    expect(timbang(3, 5, 1).opsi.every((o) => o.canary >= 1)).toBe(true);
    expect(bulat((3 * 5) / 100, 2)).toBe(0.15);
    expect(badan).toContain(`${koma((3 * 5) / 100, 2)} pod`);
  });
  test("dua pasangan yang ditimbang untuk tiga replika: 1 dari 3 dan 1 dari 4, dengan selisih 28,3 dan 20,0 poin persentase", () => {
    const o = timbang(3, 5, 1).opsi;
    const unik = o.filter((x, i) => o.findIndex((y) => y.canary === x.canary && y.total === x.total) === i);
    expect(unik.map((x) => [x.canary, x.total])).toEqual([[1, 3], [1, 4]]);
    expect(timbang(3, 5, 0).opsi.map((x) => [x.canary, x.total])).toEqual([[1, 3]]);
    const [p1, p2] = unik as [Pilihan, Pilihan];
    expect(badan).toContain(
      `Controller lalu menimbang dua pasangan. Satu pod dari ${p1.total} pod adalah ${pk((100 * p1.canary) / p1.total)}%, selisih ${pk(p1.selisih)} poin persentase dari 5%. ` +
        `Satu pod dari ${p2.total} pod adalah ${pk((100 * p2.canary) / p2.total)}%, selisih ${pk(p2.selisih)} poin. Pasangan kedua lebih dekat ke 5%, jadi ${kata(p2.total)} pod berjalan (Hitungan atas kode).`,
    );
    expect(p2.selisih).toBeLessThan(p1.selisih);
    expect(p2.total).toBe(A3.menjawab);
    expect(badan).toContain("Dengan `maxSurge: 0` controller tidak boleh menambah pod, jadi hanya pasangan pertama yang tersisa.");
  });
  test("Tebak (Yang Raka kira): jawaban dibangun dari rekaman 3 replika dan maxSurge 0", () => {
    expect(badan).toContain(
      `Satu pod versi baru. Bila \`maxSurge\` tidak diubah, pod itu berjalan di samping ${kata(A3.v1)} pod versi lama: ${A3.v2} dari ${A3.menjawab} pod, atau ${pk(A3.persen)}%. ` +
        `Bila \`maxSurge\` diatur 0, total tetap ${kata(A3S0.menjawab)} pod dan bagiannya ${pk(A3S0.persen)}% (Rekaman lab, \`tanpa-router.txt\`, bagian ${bagianDi(rekABaris, A3.awal)}).`,
    );
    expect(bagianDi(rekABaris, A3.awal)).toBe("A");
    expect(bagianDi(rekABaris, A3S0.awal)).toBe("A");
    expect(badan).toContain(`Rollout meminta ${kata(A3.diminta)} replika, yaitu ${kata(A3.diminta)} pod, dengan \`setWeight: 5\``);
    expect(rekA).toContain("setWeight 5");
    expect(rekA).toContain("(diminta 5%)");
  });
  test("kalimat Inti, tabel, dan kalimat sepertiga: angka dari rekaman", () => {
    expect(badan).toContain(`Dengan ${kata(A3.diminta)} replika, satu pod versi baru sudah ${pk(A3.persen)}% atau ${pk(A3S0.persen)}% dari pod.`);
    const tabel = badan.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel).toEqual([
      "| Pengaturan Rollout | Pod versi baru | Pod versi lama | Bagian pod versi baru |",
      "|---|---|---|---|",
      `| \`maxSurge\` tidak diubah | ${A3.v2} | ${A3.v1} | ${pk(A3.persen)}% (Rekaman lab) |`,
      `| \`maxSurge: 0\` | ${A3S0.v2} | ${A3S0.v1} | ${pk(A3S0.persen)}% (Rekaman lab) |`,
    ]);
    expect(badan).toContain(`Rekaman memberi ${pk(A3S0.persen)}% hanya dengan \`maxSurge: 0\`.`);
    expect(badan).toContain(`rekaman memberi ${kata(A3.menjawab)} pod, jadi \`maxSurge\` yang tidak diubah mengizinkan satu pod tambahan untuk ${kata(A3.diminta)} replika.`);
    expect(kolomM49[0]).toBe("M49");
    expect(`${kolomM49[0]!.slice(1)} · minggu ${mingguM49}`).toBe("49 · minggu 11");
  });
  test("batas bagian permintaan: 200 permintaan, tiga batas dari rekaman, dan hitungan tepat tidak ditulis", () => {
    expect(rekA.match(/200 permintaan GET \/healthz lewat Gateway ke satu Service tanpa bobot: semuanya terjawab\./g)).toHaveLength(3);
    expect(badan).toContain("Lab mengirim 200 permintaan `GET /healthz` lewat Gateway ke satu Service tanpa bobot, dan semuanya terjawab.");
    expect(badan).toContain(
      `Bagian yang dijawab versi baru terukur antara ${pk(A3.bawah)}% dan ${pk(A3.atas)}% pada ${pk(A3.persen)}% pod, dan antara ${pk(A3S0.bawah)}% dan ${pk(A3S0.atas)}% pada ${pk(A3S0.persen)}% pod. ` +
        "Itu batas yang diperiksa lab. Hitungan tepat bergantung penyeimbang beban Traefik dan tidak direkam.",
    );
    expect([A3.bawah, A3.atas, A3S0.bawah, A3S0.atas, A20.bawah, A20.atas]).toEqual([17.5, 32.5, 23.5, 43.5, 1.5, 8.5]);
    expect(rekA).not.toMatch(/\b\d+ dari 200\b/);
    expect(badan).not.toMatch(/\b\d+ dari 200\b/);
    expect(badan).toContain("Bagian user tidak direkam, karena permintaan lab tidak membawa identitas user (Tidak dijalankan).");
    expect(runPy).toContain("GET /healthz");
    expect(runPy).not.toMatch(/Authorization.*healthz|healthz.*Authorization/);
  });
  test("kondisi rekaman: versi dari kepala tanpa-router.txt", () => {
    expect(badan).toContain(
      `*Kondisi rekaman:* Argo Rollouts ${versiA.argo} di k3s ${versiA.k3s} yang dijalankan k3d ${versiA.k3d}, dengan Traefik ${versiA.traefik} membagi permintaan ke satu Service. `,
    );
    expect(badan).toContain(`Tiap pod menjalankan satu proses \`api-t5\` (go${versiA.go}) dengan PostgreSQL ${versiA.pg}, dari database bersih, di host arm64.`);
    expect(badan).toContain(`Rilis memakai Argo Rollouts ${versiA.argo}, yaitu controller Kubernetes`);
    expect(rekABaris[2]).toContain("Rekaman dari database bersih");
    expect(baca("labs/t5-rollout/README.md")).toContain("hanya diuji di host arm64");
  });
  test("klaim negatif berlingkup: kata 'bawaan 1' tidak ada di halaman; angka bawaan maxSurge tidak ditulis; maxSurge hanya 0 atau tidak diubah", () => {
    expect(badan).not.toMatch(/bawaan[^.]{0,30}\b1\b(?!\d)(?! di halaman)/);
    expect(badan).toContain("Halaman ini tidak menulis angka bawaan:");
    expect(badan.match(/`maxSurge[^`]*`/g)!.every((x) => ["`maxSurge`", "`maxSurge: 0`"].includes(x))).toBe(true);
    expect(rekA).toContain("maxSurge tidak ditulis di manifes");
    expect(baca("labs/t5-rollout/manifes/kartu-tanpa-router.yaml")).not.toContain("trafficRouting:");
    expect(baca("labs/t5-rollout/manifes/kartu-tanpa-router.yaml")).toContain("- setWeight: 5");
  });
});

describe("rekaman sakelar.txt bagian D, kode flag, dan rekaman Tahap 4: diturunkan dari berkas", () => {
  test("tiga pod: sebelum kill switch semuanya setuju; sesudah dimatikan lewat pod 1 hanya pod 1 menolak; pod pengganti setuju", () => {
    expect(sebelum).toEqual([{ pod: 1, keputusan: "setuju" }, { pod: 2, keputusan: "setuju" }, { pod: 3, keputusan: "setuju" }]);
    expect(podTolak).toEqual([1]);
    expect(podSetuju).toEqual([2, 3]);
    expect(podUlang).toEqual([1]);
    expect(dBlok).toContain('POST /bo/flag/kartu {"aktif": false} di pod 1: HTTP 200, {"aktif":false}');
    expect(badan).toContain(
      `Lab mengirim permintaan mematikan ke pod ${podTolak[0]}. Hanya pod ${podTolak[0]} yang menolak, dan pod ${podSetuju[0]} dan pod ${podSetuju[1]} tetap menyetujui otorisasi baru. ` +
        `Pod ${podUlang[0]} dihapus dan diganti pod baru, yang menyetujui lagi tanpa ada yang menyalakannya.`,
    );
    expect(badan).toContain("Rekaman Tahap 5 menjalankan tiga pod dari satu image, dengan flag yang sama dan satu database:");
    expect(dBlok.join("\n")).toContain("Tiga pod otorisasi kartu dari satu image, satu database.");
  });
  test("lab D1 memakai flag memori: tanpa -sakelar-tabel, pod dihapus lalu diganti, dan permintaan matikan dikirim ke pod pertama", () => {
    expect(runPy).toContain('pods = deploy_tiga("kartu-memori", False)');
    expect(runPy).toContain('flag(pods[0], token, False)');
    expect(runPy).toContain('kc("delete", "pod", pods[0]');
    expect(rekDBaris[dAwal]).toContain("(tanpa -sakelar-tabel)");
    expect(sakelarGo).toContain("else if !s.KartuAktifSekarang()");
    expect(sakelarGo).toContain("kill switch tetap flag di memori satu proses (ADR 42)");
  });
  test("kode: KartuAktifSekarang membaca atomic.Bool; main membuat dan menyalakannya saat proses mulai; kartu.go lebih dulu dari ukuran Snippet", () => {
    expect(kartuGoBaris[nKartuGo]).toBe("func (s Service) KartuAktifSekarang() bool { return s.t4.KartuAktif == nil || s.t4.KartuAktif.Load() }");
    expect(kartuGoBaris[nKartuGo - 1]).toBe("// KartuAktifSekarang: false bila kill switch mematikan otorisasi baru.");
    expect(mainGo).toContain("KartuAktif: &atomic.Bool{}");
    expect(mainGo).toContain("dep.KartuAktif.Store(true)");
    expect(baca("labs/api-t5/internal/service/t4_dep.go")).toContain("KartuAktif *atomic.Bool");
    expect(badan).toContain("`KartuAktifSekarang` membaca satu `atomic.Bool` yang dibuat dan dinyalakan di `main` saat proses mulai, jadi tiap proses punya flagnya sendiri:");
  });
  test("rekaman Tahap 4: bagian B memuat satu proses, kembali aktif, dan dua instance Tidak dijalankan; 4.23 menulis flag di memori satu proses", () => {
    expect(rekT4).toContain("# --- B. Batas: flag hidup di memori satu proses, jadi proses yang dimulai ulang kembali aktif tanpa ada yang menyalakannya ---");
    expect(rekT4).toContain("Sesudah mulai ulang, kill switch yang dimatikan tadi kembali aktif.");
    expect(rekT4).toContain("dua instance Tidak dijalankan di lab ini");
    expect(hal423).toContain("penanda boolean di memori satu proses");
    expect(badan).toContain("Rekaman Tahap 4 hanya punya satu proses: sesudah mulai ulang, kill switch yang dimatikan kembali aktif, dan dua instance Tidak dijalankan (`kill-switch.txt`, bagian B).");
    expect(bagianDi(rekT4.split("\n"), rekT4.split("\n").findIndex((b) => b.startsWith("AUTH-K3")) + 1)).toBe("B");
    expect(badan).toContain("Kill switch kartu adalah flag di memori satu proses sejak ADR 42 ([[t4-kartu]]).");
    expect(dari("t4-kartu").adr).toEqual([42]);
  });
  test("tiga Snippet: file, rentang baris diturunkan dari isi berkas, dan judul memakai huruf bagian dari rekaman", () => {
    const sn = [...badan.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"(?: lang="go")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, a: Number(m[2]), b: Number(m[3]), judul: m[4]! }));
    expect(sn).toHaveLength(3);
    expect(sn[0]).toEqual({ file: "labs/t5-rollout/output/tanpa-router.txt", a: A3.awal, b: A3.akhir, judul: `Rekaman lab: labs/t5-rollout/output/tanpa-router.txt, bagian ${bagianDi(rekABaris, A3.awal)} (3 replika, maxSurge tidak diubah)` });
    expect(rekABaris[A3.awal - 1]).toBe("$ kubectl get rs  (versi, spec.replicas, siap)");
    expect(rekABaris[A3.akhir - 1]).toMatch(/^Bagian pod v2 dari semua pod yang menjawab = 25\.0%/);
    expect(sn[1]).toEqual({ file: "labs/t5-rollout/output/sakelar.txt", a: dMulai, b: dSelesai, judul: `Rekaman lab: labs/t5-rollout/output/sakelar.txt, bagian ${bagianDi(rekDBaris, dMulai)} (flag di memori, tiga pod)` });
    expect(rekDBaris[dMulai - 1]).toMatch(/^# Tiga pod otorisasi kartu/);
    expect(rekDBaris[dSelesai - 1]).toMatch(/^# Pod yang dimulai ulang kembali menyetujui/);
    expect(bagianDi(rekDBaris, dMulai)).toBe("D");
    expect(sn[2]).toEqual({ file: "labs/api-t5/internal/service/kartu.go", a: nKartuGo, b: nKartuGo + 1, judul: "Kode lab: labs/api-t5/internal/service/kartu.go, fungsi KartuAktifSekarang" });
    // Snippet rekaman tidak memuat baris judul bagian ("D1.") dan tidak memuat baris pengukuran Hitungan permintaan per versi
    expect(rekABaris.slice(A3.awal - 1, A3.akhir).join("\n")).not.toMatch(/# ---/);
    expect(rekDBaris.slice(dMulai - 1, dSelesai).join("\n")).not.toMatch(/# ---|Baris otorisasi_kartu/);
  });
  test("lingkup rekaman: hanya tiga pod dan satu database; dua instance Tahap 4 tidak diklaim; bagian user dan analisis tidak dipakai", () => {
    expect(badan).toContain("- Rekaman Tahap 4 tidak punya dua instance. Rekaman Tahap 5 punya tiga pod dengan flag yang sama, dan memakai kode `api-t5`, bukan kode Tahap 4.");
    expect(badan).toContain("- Bagian user, hitungan permintaan tepat per versi, dan jumlah pod di bawah beban nyata tidak direkam.");
    expect(badan).toContain("- Argo Rollouts selain v1.10.1, `maxSurge` selain bawaan dan 0, dan `maxUnavailable` Tidak dijalankan. Lab hanya diuji di host arm64.");
    expect(badan).not.toMatch(/p95|AnalysisRun|Gateway API|HTTPRoute|rasio tolak otomatis/);
    expect(hitungKali(badan, "sakelar.txt")).toBe(3);
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R5-215 sampai R5-219", () => {
  const ids = ["R5-215", "R5-216", "R5-217", "R5-218", "R5-219"];
  const baris = ids.map(barisRiset);
  test("lima baris berurutan di RISET-TAHAP-5, lima kolom, tanpa ID ganda, dan diselipkan sesudah R5-169 dengan tetangga di rentang", () => {
    const semua = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    for (const id of ids) expect(semua.filter((x) => x === id), id).toHaveLength(1);
    const i = semua.indexOf("R5-215");
    expect(semua.slice(i, i + 5)).toEqual(ids);
    // tetangga dikunci dengan rentang, bukan dengan ID tertentu: PR halaman lain menyisipkan baris riset di antaranya
    expect(Number(semua[i - 1]!.slice(3))).toBeGreaterThanOrEqual(169);
    expect(Number(semua[i - 1]!.slice(3))).toBeLessThan(215);
    expect(Number(semua[i + 5]!.slice(3))).toBeGreaterThan(219);
    const angkaId = semua.map((x) => Number(x.slice(3)));
    for (let k = 1; k < angkaId.length; k++) if (angkaId[k]! < angkaId[k - 1]!) expect(angkaId[k - 1]!, "hanya sesudah R5-314 urutan boleh turun").toBeGreaterThan(300);
    for (const b of baris) { expect(b).not.toBe(""); expect(pecahBaris(b)).toHaveLength(5); }
  });
  test("tiap tautan luar di halaman, rantai, dan skenario ada di baris riset dengan tanggal buka 2026-11-03; jumlah tautan dan kemunculan terkunci", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(tautan).toEqual([
      "https://kubernetes.io/docs/concepts/workloads/pods/",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/index.md",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md",
      "https://kubernetes.io/docs/concepts/services-networking/service/",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/utils/replicaset/canary.go",
    ]);
    const hapusSkema = (u: string): string => u.replace(/^https:\/\//, "");
    const tujuanRiset: Record<string, string> = {
      "https://kubernetes.io/docs/concepts/workloads/pods/": "R5-218",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/index.md": "R5-215",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md": "R5-215",
      "https://github.com/argoproj/argo-rollouts/blob/v1.10.1/utils/replicaset/canary.go": "R5-217",
      "https://kubernetes.io/docs/concepts/services-networking/service/": "R5-218",
    };
    for (const u of new Set(tautan)) expect(barisRiset(tujuanRiset[u]!), `${u} di ${tujuanRiset[u]}`).toContain(hapusSkema(u).replace(/^github\.com\/argoproj\/argo-rollouts\/blob\//, "github.com/argoproj/argo-rollouts/blob/"));
    expect(hitungKali(badan, "dibuka 2026-11-03")).toBe(6);
    expect(hitungKali(badan, "2026-11-03")).toBe(6);
    for (const b of baris.slice(0, 4)) expect(b, "tanggal buka").toContain("dibuka 2026-11-03");
    expect(baris[4], "tanggal baca hitungan").toContain("dibaca 2026-11-03");
    expect(JSON.stringify(skenario) + JSON.stringify(rantaiMentah)).not.toMatch(/https?:\/\//);
    // teks tautan yang sama menuju satu alamat
    const teksTautan: Record<string, string> = {};
    for (const m of badan.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) { expect(teksTautan[m[1]!] ?? m[2]!, m[1]).toBe(m[2]); teksTautan[m[1]!] = m[2]!; }
  });
  test("R5-215: tiga kutipan Inggris dari canary/index.md; kalimat halaman memakai 'berusaha mendekati' dan 'selisih terkecil' tanpa pelunak yang hilang", () => {
    const r = barisRiset("R5-215");
    expect(r).toContain("v1.10.1");
    expect(r).toContain("the Rollout makes a best effort attempt to achieve the percentage listed in the last `setWeight` step between the new and old version.");
    expect(r).toContain("finding the whole number with the smallest delta, rounding up the calculation if the deltas are equals");
    expect(r).toContain("If a user wants to have more fine-grained control of the percentages without a large number of Replicas, that user should use the traffic management functionality.");
    expect(badan).toContain("Dokumentasinya menulis bahwa controller hanya berusaha mendekati persentase `setWeight` antara versi baru dan lama. Ia memilih bilangan bulat pod dengan selisih terkecil (");
    expect(badan).toContain("*Dua label turunan:*");
    expect(skenario.varian.langkah[2]!.jelas).toContain("Dokumentasi Argo Rollouts menulis bahwa kontrol persentase yang lebih halus tanpa banyak replika memakai traffic management.");
  });
  test("R5-216: dua halaman dokumentasi bertentangan soal maxSurge bawaan, dan kode menulis \"25\"; halaman menulis ketiganya dan tidak menulis angka bawaan", () => {
    const r = barisRiset("R5-216");
    expect(r).toContain('Defaults to \\"25%\\".'.replace(/\\"/g, '"'));
    expect(r).toContain("By default, a value of 1 is used.");
    expect(r).toContain('`DefaultMaxSurge = "25"`');
    expect(r).toContain("bertentangan (25% lawan 1)");
    expect(badan).toContain('Dokumentasi menulis bawaan `maxSurge` 25% di halaman canary dan 1 di halaman spesifikasi, sedangkan kode v1.10.1 menulis `DefaultMaxSurge = "25"` (Tidak dijalankan, dibaca dari dokumentasi dan kode).');
    expect(baca("labs/t5-rollout/output/tanpa-router.txt")).toContain("bawaan v1.10.1: 1");
  });
  test("R5-217: kutipan komentar fungsi, aturan nol pod, dan pasangan total spec.replicas atau satu lebih", () => {
    const r = barisRiset("R5-217");
    expect(r).toContain("v1.10.1");
    expect(r).toContain("approximateWeightedCanaryStableReplicaCounts");
    expect(r).toContain("we will always return a minimum of 1 for stable and canary as to not return 0");
    expect(r).toContain("might sum to either spec.replicas or spec.replicas + 1 but will not exceed spec.replicas if maxSurge is 0");
    expect(r).toContain("Dibaca dari kode, bukan dokumentasi");
    expect(badan).toContain("Kode v1.10.1 tidak menghasilkan nol pod versi baru untuk bobot 1 sampai 99 (");
    expect(badan).toContain("Syaratnya dua replika atau lebih, jadi satu pod versi baru wajib ada.");
    expect(r).toContain("(baris 237)");
  });
  test("R5-218: dua kutipan Kubernetes dan alamat; R5-219: hitungan atas angka sendiri dan sumber internal", () => {
    const r = barisRiset("R5-218");
    expect(r).toContain("Pods are the smallest deployable units of computing that you can create and manage in Kubernetes.");
    expect(r).toContain("The set of Pods targeted by a Service is usually determined by a selector that you define.");
    expect(badan).toContain("Pod adalah unit terkecil yang dijalankan dan dikelola di Kubernetes (");
    expect(badan).toContain("Service adalah objek Kubernetes yang menyasar pod lewat selector label (");
    const h = barisRiset("R5-219");
    expect(h).toContain("1 ÷ 4 = 25,0%");
    expect(h).toContain("1 ÷ 3 = 33,3%");
    expect(h).toContain("25,0 − 5 = 20,0 poin");
    expect(h).toContain("33,3 − 5 = 28,3 poin");
    expect(h).toContain("5% × 3 = 0,15 pod");
    expect(h).toContain("1 ÷ 20 = 5,0%");
    expect(h).toContain("17,5% sampai 32,5%, 1,5% sampai 8,5%, 23,5% sampai 43,5%");
    expect(1 / 4 * 100).toBe(25);
    expect(pk(100 / 3)).toBe("33,3");
    expect(pk(100 / 3 - 5)).toBe("28,3");
    expect(pk(25 - 5)).toBe("20,0");
    expect(pk(100 / 20)).toBe("5,0");
  });
});

describe("registry, tautan, template blok, tabel, urutan tebakan, widget, dan kartu", () => {
  test("registry: halaman 5.22 jenis masalah, ada, prasyarat t4-kartu dan t5-service, lab t5-rollout, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m49");
    expect(h.nomor).toBe("5.22");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.prasyarat).toEqual(["t4-kartu", "t5-service"]);
    expect(h.lab).toEqual(["t5-rollout"]);
    expect(h.peran).toEqual(["devops", "backend"]);
    expect(h.path).toBe("tahap-5/m49-canary-sepertiga.md");
    expect(h.label).toBe(`Masalah ${kolomM49[0]!.slice(1)} · minggu ${mingguM49}`);
    expect(mingguM49).toBe(11);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t4-kartu]], [[t5-service]]");
    expect(frontmatter).toContain(`title: "5.22 ${h.judul}"`);
    expect(naskah).toContain(`| 5.22 | 4 | ${h.judul} | Masalah | ★ | t5-rollout | alur |`);
    expect(naskah).toContain("- **DevOps** 5.9, 5.12, 5.13, 5.16, 5.17, 5.22, 5.23, 5.27, 5.28.");
    expect(dari("t5-rollout").prasyarat).toEqual(["t5-m49"]);
    expect(dari("t5-rollout").nomor).toBe("5.23");
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ A0: 1, "t4-kartu": 3, "t5-service": 1, "t5-rollout": 2 });
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect(badan).toContain('<Blok nama="Gejala" buka>');
    expect(badan).toContain('<Blok nama="Yang Raka kira" buka>');
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m49.json" />');
    expect(badan).toContain("<Rantai data={canaryPod} ringkas />");
    expect(halaman).toContain('import canaryPod from "../../../../data/diagram/t5-m49-canary-pod.json";');
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; tepat satu tabel di halaman", () => {
    const baris = badan.split("\n");
    let tabelKe = 0;
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        tabelKe++;
        const n = pecahBaris(baris[i]!).length;
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `tabel ${tabelKe} baris ${j + 1}`).toBe(n);
      }
    }
    expect(tabelKe).toBe(1);
  });
  test("urutan tebakan: jawaban Tebak di Yang Raka kira belum tertulis sebelum details.question, dan jawaban widget (20 replika) belum tertulis sebelum widget", () => {
    const sebelumTebak = badan.slice(0, badan.indexOf('<details class="question">'));
    for (const angka of [pk(A3.persen), pk(A3S0.persen), "1 dari 4", "empat pod", "maxSurge"]) expect(sebelumTebak, `jawaban Tebak: ${angka}`).not.toContain(angka);
    const sebelumWidget = badan.slice(0, badan.indexOf("<WidgetLama"));
    for (const x of [`${A20.diminta} replika`, `${A20.v1} pod`, "1 ÷ 20", "20 pod"]) expect(sebelumWidget, `jawaban widget: ${x}`).not.toContain(x);
    expect(sebelumWidget, `jawaban widget: ${pk(A20.persen)}%`).not.toMatch(new RegExp(`(?<![\\d,])${pk(A20.persen)}%`));
    const sebelumBlokSebenarnya = badan.slice(0, badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(sebelumBlokSebenarnya).not.toContain("0,15 pod");
    expect(skenario.predict.varian).toBe(true);
    expect(core.jalurTebakan(skenario)).toBe("varian");
    expect(skenario.predict.q).toContain(`${A20.diminta} replika, bukan ${A3.diminta}`);
    expect(skenario.predict.options[skenario.predict.answer]).toBe(`${pk(A20.persen)}%: satu pod versi baru dari ${A20.menjawab} pod yang menjawab`);
  });
  test("skenario alur: valid menurut alur-core, tanpa perangkat, tiga komponen, enam langkah dan tiga langkah varian, jenis Ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["tim", "Tim Pembayaran"], ["argo", "Argo Rollouts"], ["pod", "Pod otorisasi kartu"]]);
    expect(skenario.langkah).toHaveLength(6);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(1);
    expect(core.steps(skenario, true)).toHaveLength(4);
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? null, l.judul])).toEqual([
      ["tim", "argo", "Tim Pembayaran merilis versi baru"],
      ["argo", "pod", "Argo Rollouts menjalankan satu pod versi baru"],
      ["pod", null, "Rasio ditolak naik"],
      ["tim", "pod", "Nadia menekan kill switch"],
      ["pod", null, "Satu pod berhenti menyetujui"],
      ["pod", null, "Pod yang dimulai ulang menyetujui lagi"],
    ]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? null, l.judul])).toEqual([
      ["argo", "pod", "Argo Rollouts menjalankan satu pod dari 20"],
      ["pod", null, "Permintaan mengikuti pod dalam batas"],
      ["argo", "pod", "Lebih halus dari 5,0% butuh lebih banyak replika"],
    ]);
    expect(badan).toContain("centang **Ubah satu hal: " + skenario.varian.label + "**");
    expect(skenario.varian.label).toBe(`Rollout memakai ${A20.diminta} replika, bukan ${A3.diminta}`);
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) { expect(l.kirim.length).toBeGreaterThan(0); expect(l.jelas.length).toBeGreaterThan(0); }
  });
  test("skenario: kalimat kirim dan jelas memakai angka dari rekaman dan hitungan", () => {
    const [, l2, l3, l4, l5, l6] = skenario.langkah as [Langkah, Langkah, Langkah, Langkah, Langkah, Langkah];
    expect(l2.kirim).toBe(`pod versi baru: ${A3.v2}\npod versi lama: ${A3.v1}\nbagian pod versi baru: ${pk(A3.persen)}% (Rekaman lab, maxSurge tidak diubah)`);
    expect(l2.jelas).toBe(`Lima persen dari tiga pod adalah 0,15 pod, jadi controller memilih satu pod versi baru. ${huruf1(kata(A3.menjawab))} pod menjawab (tanpa-router.txt, bagian A). Dengan maxSurge 0 hasilnya ${pk(A3S0.persen)}%.`);
    expect(l3.kirim).toBe("rasio otorisasi ditolak: 2% ke 31% (Ilustrasi)");
    expect(l4.kirim).toBe(`POST /bo/flag/kartu {"aktif": false} ke pod ${podTolak[0]} (Rekaman lab)`);
    expect(l5.kirim).toBe(`pod ${podTolak[0]}: tolak (kill-switch)\npod ${podSetuju[0]}: setuju\npod ${podSetuju[1]}: setuju (Rekaman lab)`);
    expect(l5.jelas).toBe(`Flag di memori hanya berlaku di proses pod ${podTolak[0]}. Pod ${podSetuju[0]} dan pod ${podSetuju[1]} punya flag sendiri, dan flag itu tetap menyala (sakelar.txt, bagian ${bagianDi(rekDBaris, dMulai)}).`);
    expect(l6.kirim).toBe(`pod ${podUlang[0]} pengganti: setuju (Rekaman lab)`);
    const [v1, v2, v3] = skenario.varian.langkah as [Langkah, Langkah, Langkah];
    expect(v1.kirim).toBe(`pod versi baru: ${A20.v2}\npod versi lama: ${A20.v1}\nbagian pod versi baru: ${pk(A20.persen)}% (Rekaman lab)`);
    expect(v1.jelas).toContain(`${A20.menjawab} pod menjawab (tanpa-router.txt, bagian A).`);
    expect(v2.kirim).toBe(`200 permintaan GET /healthz: bagian versi baru antara ${pk(A20.bawah)}% dan ${pk(A20.atas)}% (batas diperiksa; hitungan tepat tidak direkam; Rekaman lab)`);
    expect(v3.kirim).toBe(`bagian terkecil dengan satu pod: 1 ÷ ${A20.menjawab} = ${pk(100 / A20.menjawab)}% (Hitungan)\nlebih halus dari itu: lebih banyak replika, atau traffic router`);
    expect(pk(100 / A20.menjawab)).toBe(pk(A20.persen));
    expect(skenario.predict.explain).toBe(
      `Lima persen dari ${A20.menjawab} pod tepat satu pod, jadi pasangan satu pod dari ${A20.menjawab} pod tidak punya selisih dari 5% (Hitungan atas kode). Rekaman: ${A20.v2} pod versi baru dan ${A20.v1} pod versi lama, ${pk(A20.persen)}%. Dengan tiga replika tidak ada pasangan yang sedekat itu.`,
    );
    expect(timbang(20, 5, 1).opsi.find((o) => o.total === 20)!.selisih).toBe(0);
    expect(timbang(3, 5, 1).opsi.every((o) => o.selisih > 0)).toBe(true);
  });
  test("tebakan skenario: empat pilihan, tepat satu benar di posisi kedua dan bukan pilihan terpanjang; penjelasan memuat Hitungan dan Rekaman", () => {
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.answer).toBe(1);
    const panjang = skenario.predict.options.map((o) => o.length);
    expect(Math.max(...panjang)).not.toBe(panjang[skenario.predict.answer]);
    expect(skenario.predict.options).toEqual([
      "10,0%: controller membulatkan ke atas menjadi dua pod dari 20",
      "5,0%: satu pod versi baru dari 20 pod yang menjawab",
      "25,0%: satu pod ditambahkan di samping pod yang ada, seperti pada tiga replika",
      "0%: controller tidak membuat pod versi baru tanpa traffic router",
    ]);
    expect(skenario.predict.explain).toContain("(Hitungan atas kode)");
    expect(skenario.predict.explain).toContain("Rekaman:");
    expect(skenario.pengantar).toBe("Tim Pembayaran merilis versi baru dengan canary 5%, lalu menekan kill switch. Tebakannya tentang satu hal yang kamu ubah: centang 'Ubah satu hal' di bawah, dan jawabannya terbuka di akhir langkah varian.");
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber rekaman, angka dari rekaman, kata 'bukan' dan 'tidak' berlingkup", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-m49-canary-pod");
    expect(d.sumber.jenis).toBe("rekaman");
    expect(d.sumber.teks).toBe("Rekaman lab t5-rollout · tanpa-router.txt bagian A (3 replika, maxSurge tidak diubah) dan sakelar.txt bagian D (flag di memori, tiga pod)");
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    expect(d.baris.map((b) => [b.label, b.sub])).toEqual([["Canary 5%", "3 replika, tanpa traffic router"], ["Kill switch", "flag di memori, tiga pod"]]);
    expect(d.baris[0]!.simpul.map((s) => [s.teks, s.sub ?? "", s.nada])).toEqual([
      ["setWeight: 5", "tanpa bobot dari router", "biasa"],
      [`${A3.v2} pod baru, ${A3.v1} pod lama`, `${kata(A3.menjawab)} pod menjawab`, "biasa"],
      [`${pk(A3.persen)}% pod, bukan 5%`, `${pk(A3S0.persen)}% bila maxSurge 0`, "warn"],
    ]);
    expect(d.baris[1]!.simpul.map((s) => [s.teks, s.sub ?? "", s.nada])).toEqual([
      [`Dimatikan di pod ${podTolak[0]}`, "satu permintaan ke satu pod", "biasa"],
      [`Pod ${podTolak[0]} menolak`, "alasan kill-switch", "good"],
      [`Pod ${podSetuju[0]} dan ${podSetuju[1]} setuju`, "flag mereka tetap menyala", "warn"],
    ]);
    expect(d.catatan).toBe("Kotak oranye adalah hasil yang bukan niat tim Pembayaran. Bagian pod dihitung dari pod yang menjawab. Bagian user dan hitungan permintaan tepat tidak direkam.");
    expect(d.judul).toBe("Canary tanpa traffic router menghitung pod, dan kill switch di memori hanya mengubah satu pod");
    const ringkasan = d.baris.flatMap((b) => b.simpul.map((s) => s.teks)).join(" ");
    expect(ringkasan.length).toBeLessThanOrEqual(150);
  });
  test("kartu Cek diri: tiga kartu t5-m49, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const kartu = kartuSemua.filter((x) => x.halaman === "t5-m49");
    expect(kartu.map((x) => x.id)).toEqual(["t5-m49-1", "t5-m49-2", "t5-m49-3"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(soal).toHaveLength(3);
    expect(jawaban).toHaveLength(3);
    kartu.forEach((k, i) => {
      expect(k.judul).toBe("5.22 M49: Rilis kartu 5% ternyata sepertiga");
      expect(k.url).toBe("tahap-5/m49-canary-sepertiga/");
      expect(k.tanya).toBe(soal[i]);
      expect(k.jawab).toBe(jawaban[i]);
    });
    expect(kartuSemua.filter((x) => x.id.startsWith("t5-m49-"))).toHaveLength(3);
    // soal 1 menulis hasil 20 replika dari rekaman, soal 3 menulis apa yang tidak direkam
    expect(jawaban[0]).toBe(
      `Lima persen dari tiga pod adalah 0,15 pod, dan kode v1.10.1 menyisakan satu pod versi baru untuk bobot 1 sampai 99 (dibaca dari kode). Hasilnya ${pk(A3.persen)}% atau ${pk(A3S0.persen)}% menurut \`maxSurge\`. ` +
        `Dengan ${A20.diminta} replika rekaman memberi ${A20.v2} pod versi baru dan ${A20.v1} pod versi lama: ${pk(A20.persen)}% (\`tanpa-router.txt\`, bagian A).`,
    );
    expect(jawaban[1]).toBe(
      `Dua pod lain tetap menyetujui otorisasi baru, dan pod pengganti menyetujui lagi karena flag di memori hilang bersama prosesnya (\`sakelar.txt\`, bagian D). Flag dibuat dan dinyalakan di \`main\` tiap proses (Tidak dijalankan, dibaca dari kode).`,
    );
    expect(jawaban[2]).toBe(
      "Hari, jam, 2%, dan 31% adalah Ilustrasi. Lab mengukur bagian pod dan memeriksa batas bagian permintaan, tetapi tidak mengukur bagian user dan tidak mencatat hitungan permintaan tepat per versi (`tanpa-router.txt`, bagian A).",
    );
  });
  test("definisi di pemakaian pertama: canary, pod, kill switch, traffic router, Hitungan, dibaca dari kode, dan Penalaran sebelum dipakai", () => {
    const pos = (s: string): number => { const i = badan.indexOf(s); expect(i, s).toBeGreaterThanOrEqual(0); return i; };
    expect(pos("canary adalah rilis yang lebih dulu memberi versi baru ke sebagian kecil")).toBeLessThan(pos("Tim Pembayaran mengira dua hal"));
    expect(pos("Pod adalah unit terkecil")).toBeLessThan(pos("Rollout meminta tiga replika, yaitu tiga pod"));
    expect(pos("Kill switch adalah sakelar yang mematikan otorisasi kartu baru tanpa deploy")).toBeLessThan(pos("Kill switch kartu adalah flag di memori"));
    expect(pos("Itu ingress controller atau service mesh yang menggeser lalu lintas ke versi baru sedikit demi sedikit")).toBeLessThan(pos("tanpa traffic router. Berapa pod"));
    expect(pos("Hitungan adalah angka yang dihitung dari angka lain")).toBeLessThan(pos("(Hitungan atas kode)"));
    expect(pos("Dibaca dari kode berarti isi kode sumber dibaca tanpa dijalankan")).toBeLessThan(pos("dibaca dari kode)"));
    pos("Itu Penalaran, yaitu kesimpulan dari kode dan rekaman tanpa dijalankan.");
    expect(hitungKali(badan, "Penalaran")).toBe(1);
    expect(badan).not.toMatch(/\bpelanggan\b|\bpembeli\b/);
    expect(badan).not.toMatch(/\brahasia\b/);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, dan kartu; 'bagian D' dipakai, bukan penanda D1", () => {
    const semua = [halaman.replace("[[A0]]", ""), JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m49"))].join("\n");
    expect(semua).not.toMatch(/\bR\d-\d+\b/);
    expect(semua).not.toMatch(/\bkeputusan\s+#?\d{2,4}\b/i);
    expect(semua).not.toMatch(/\bPR\s*#?\d{2,4}\b|\(#\d{3,4}\)/);
    expect(semua).not.toMatch(/(?<![\w./#-])[A-G]\d+(?:\.\d+)?(?![\w])/);
    expect(semua).not.toMatch(/\bD1\b|\bD2\b|\bC2\b/);
  });
  test("label: tak satu angka cerita berlabel Rekaman lab; 'Rekaman lab' hanya untuk rekaman dan batas di tempat yang benar", () => {
    const ilustrasi = ["Selasa", "15.00", "15.04", "2%", "31%"];
    for (const baris of badan.split("\n")) {
      if (/Rekaman lab/.test(baris) && !baris.startsWith("<Snippet") && !baris.startsWith("*Angka cerita")) for (const x of ilustrasi) expect(baris, `'${x}' di baris Rekaman lab`).not.toContain(x);
    }
    // satu definisi, satu jawaban Tebak, dua baris tabel, dua judul Snippet rekaman
    expect(hitungKali(badan, "Rekaman lab")).toBe(1 + 1 + 2 + 2);
  });
});

describe("penutup celah mutasi tanpa kunci: frontmatter, Gejala, noscript, butir Yang tidak direkam, Konsep yang lahir, dan teks diagram dan skenario", () => {
  test("frontmatter persis, dan deskripsi memuat tiga fakta halaman", () => {
    expect(frontmatter).toBe(
      'title: "5.22 M49: Rilis kartu 5% ternyata sepertiga"\n' +
        'description: Minggu 11. Tim Pembayaran merilis otorisasi kartu dengan canary "5%". Tanpa traffic router, Argo Rollouts mengatur jumlah pod, dan kill switch di memori hanya mengubah pod yang menerima permintaannya.\n',
    );
  });
  test("adegan Gejala: hari, jam, rasio, dan tiga pod sama dengan baris M49 naskah; tanpa kalimat definisi; dua catatan berawalan bintang", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf("</Blok>"));
    const paragraf = gejala.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<"));
    expect(paragraf).toHaveLength(5);
    const cerita = kolomM49[2]!;
    expect(cerita).toContain("Selasa 15.00 tim Pembayaran merilis otorisasi kartu versi baru dengan canary \"5%\"");
    expect(cerita).toContain("Pukul 15.04 rasio otorisasi ditolak naik dari 2% ke 31%. Nadia menekan kill switch.");
    expect(cerita).toContain("Satu dari tiga pod berhenti menyetujui, dan dua pod lain tetap menyetujui. Sesudah pod itu dimulai ulang, ia menyetujui lagi");
    expect(paragraf[0]).toBe(`Minggu ${mingguM49} Tahap 5. Selasa pukul 15.00 tim Pembayaran merilis otorisasi kartu versi baru dengan canary "5%".`);
    expect(paragraf[1]).toBe('Pukul 15.04 rasio otorisasi yang ditolak naik dari 2% ke 31%. Nadia menekan kill switch.');
    expect(paragraf[2]).toBe("Satu dari tiga pod berhenti menyetujui, dan dua pod lain tetap menyetujui. Sesudah pod itu dimulai ulang, ia menyetujui lagi.");
    expect(paragraf[3]).toBe("*Angka cerita (Ilustrasi):* hari, jam, 2%, 31%, dan tiga pod berasal dari naskah, bukan dari rekaman. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
    expect(paragraf[4]!.startsWith("*Tiga istilah di cerita:*")).toBe(true);
    for (const p of paragraf.slice(0, 3)) expect(p).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    expect(kolomM49[3]).toBe("Canary 5% berarti 5% user terdampak, dan kill switch mematikan semuanya");
    expect(badan).toContain('Pertama, canary "5%" berarti lima dari seratus user mencoba versi baru. Kedua, kill switch mematikan otorisasi kartu di semua pod, jadi satu tekanan sudah cukup.');
  });
  test("noscript sama dengan kalimat yang dibangun dari nilai turunan", () => {
    const ns = cari(/<noscript>\n([\s\S]*?)<\/noscript>/, badan, "noscript")[1]!;
    expect(ns).toBe(
      "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. " +
        `Jalur utama: \`setWeight: 5\` dengan ${kata(A3.diminta)} replika menjalankan ${A3.v2} pod versi baru dan ${A3.v1} pod versi lama (${pk(A3.persen)}%). ` +
        `Rasio ditolak naik dari 2% ke 31% (Ilustrasi). Kill switch di pod ${podTolak[0]} membuat pod ${podTolak[0]} menolak, sementara pod ${podSetuju[0]} dan pod ${podSetuju[1]} menyetujui (bagian ${bagianDi(rekDBaris, dMulai)}).\n\n` +
        `Dengan ${A20.diminta} replika, rekaman memberi ${A20.v2} pod versi baru dan ${A20.v1} pod versi lama: ${pk(A20.persen)}% (bagian ${bagianDi(rekABaris, A20.awal)}).\n`,
    );
  });
  test("pembuka tebal di blok Yang sebenarnya dan Coba sendiri: daftar dan urutan", () => {
    expect([...badan.matchAll(/^\*\*([^*\d][^*]*)\*\*/gm)].map((x) => x[1])).toEqual([
      "Kenapa satu pod.", "Permintaan mengikuti pod, dalam batas.", "Kill switch di memori hanya mengubah satu proses.", "Yang tidak direkam.",
    ]);
    expect(badan).toContain("Widget ini mengikuti cerita M49. Jalur utama memuat dua langkah cerita (Ilustrasi) dan empat langkah rekaman, dan \"Ubah satu hal\" memakai rekaman `tanpa-router.txt` bagian A. Tebak dulu, lalu tekan Berikutnya atau panah kanan.");
    expect(badan).toContain(`Sesudah langkah terakhir, centang **Ubah satu hal: Rollout memakai ${A20.diminta} replika, bukan ${A3.diminta}**.`);
    expect(badan).toContain("Widget ini tidak punya layar HP, karena M49 terjadi di antara engineer, bukan di app.");
    expect(skenario.langkah.filter((l) => /Rekaman lab/.test(l.kirim)).length).toBe(4);
    expect(skenario.langkah.filter((l) => /Ilustrasi/.test(l.kirim)).length).toBe(2);
  });
  test("Konsep yang lahir: tiga tautan, kalimat penutup, dan ADR yang dirujuk (42 dan 55) cocok dengan halaman tujuan", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(blok).toContain("- [[t5-rollout]]: progressive delivery, canary dengan traffic router, GitOps, dan kill switch yang dibaca semua pod. Keputusannya ADR 55.");
    expect(blok).toContain("- [[t4-kartu]]: ADR 42, yang menaruh kill switch di memori satu proses dan dibaca ulang di halaman ini.");
    expect(blok).toContain("- [[t5-service]]: pod dan Kubernetes, yang memecah satu proses menjadi beberapa.");
    expect(blok).toContain("Canary tanpa traffic router menghitung pod, dan kill switch harus ada di tempat yang dibaca semua pod.");
    expect(dari("t5-rollout").adr).toEqual([55]);
    expect(dari("t4-kartu").adr).toEqual([42]);
    expect(naskah).toContain("| 55 | Rilis lewat Argo Rollouts v1.10.1");
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["42", "55"]));
  });
  test("teks diagram dan skenario: sumber, pengantar, catatan, dan nada langkah persis", () => {
    expect(skenario.judul).toBe("Rilis kartu 5%: tiga pod, satu kill switch");
    expect(skenario.sumber.catatan).toContain("Jalur utama memuat dua langkah cerita (Ilustrasi: Selasa 15.00, 2%, 31%, tiga pod) dan empat langkah rekaman lab t5-rollout");
    expect(skenario.sumber.catatan).toContain(`tanpa-router.txt bagian A: 3 replika, maxSurge tidak diubah; sakelar.txt bagian D: flag di memori, tiga pod`);
    expect(skenario.sumber.catatan).toContain("Bagian user tidak direkam.");
    expect(skenario.langkah.map((l) => l.nada ?? "-")).toEqual(["-", "-", "warn", "-", "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "-")).toEqual(["-", "-", "warn"]);
    expect(skenario.langkah[0]!.kirim).toBe("Selasa 15.00: Rollout 3 replika, setWeight: 5, tanpa traffic router (Ilustrasi)");
    expect(skenario.langkah[0]!.jelas).toBe("Rollout memakai Argo Rollouts v1.10.1 tanpa traffic router. Hari dan jam berasal dari cerita.");
    expect(skenario.langkah[2]!.jelas).toBe("Angka ini dari cerita. Lab tidak menjalankan versi kartu yang salah.");
    expect(skenario.langkah[3]!.jelas).toBe(`Kill switch ADR 42 adalah flag di memori satu proses. Lab mengirim permintaan itu ke pod ${podTolak[0]}.`);
    expect(skenario.langkah[5]!.jelas).toBe(`Pod ${podUlang[0]} dihapus dan diganti pod baru. Flag di memori hilang bersama prosesnya, dan tidak ada yang menyalakannya.`);
    expect(skenario.varian.langkah[0]!.jelas).toBe(`Lima persen dari ${A20.menjawab} pod tepat satu pod, jadi controller tidak menambah pod di samping ${A20.menjawab} pod itu. ${A20.menjawab} pod menjawab (tanpa-router.txt, bagian A).`);
    expect(skenario.varian.langkah[1]!.jelas).toBe("Batas ini dari lab. Hitungan tepat bergantung penyeimbang beban dan tidak direkam, dan bagian user tidak direkam.");
    expect(skenario.varian.langkah[2]!.jelas).toBe("Dokumentasi Argo Rollouts menulis bahwa kontrol persentase yang lebih halus tanpa banyak replika memakai traffic management. Traffic router dibahas di halaman berikutnya.");
    expect(dari("t5-rollout").nomor).toBe("5.23");
  });
  test("butir 'Yang tidak direkam': kalimat persis, dan rujukan ke 5.23 lewat registry", () => {
    expect(badan).toContain("- Selasa, 15.00, 15.04, 2%, 31%, tiga pod, dan Nadia berasal dari cerita (Ilustrasi). Lab tidak menjalankan versi kartu yang salah.");
    expect(badan).toContain("- Cara menghubungkan bobot ke traffic router dan memindahkan kill switch ke tempat yang dibaca semua pod dibahas di [[t5-rollout]].");
    expect(badan).toContain("Rollout yang membuat pod versi baru juga membuat proses baru, dan di proses itu flag menyala lagi. Itu Penalaran, yaitu kesimpulan dari kode dan rekaman tanpa dijalankan. Kill switch yang dimatikan sebelum rilis tidak terbawa ke pod itu.");
    // definisi label, tiga sumber Kubernetes dan Argo Rollouts, dua definisi turunan, kode canary, halaman spesifikasi, bagian user, Tahap 4, butir Yang tidak direkam, jawaban Cek diri 2
    expect(hitungKali(badan, "Tidak dijalankan")).toBe(13);
  });
});

// --- seluruh baris badan halaman, dengan angka dan nama turunan dari rekaman, kode, dan hitungan (bukan dari nilai.ts): menangkap mutasi kalimat tanpa kunci
const bobot = Number(cari(/\(diminta (\d+)%\)/, rekA, "bobot")[1]);
const JUMLAH_PERMINTAAN = Number(cari(/^(\d+) permintaan GET \/healthz lewat Gateway ke satu Service tanpa bobot: semuanya terjawab\.$/m, rekA, "jumlah permintaan")[1]);
const pas = ((): Pilihan[] => {
  const o = timbang(3, bobot, 1).opsi;
  return o.filter((x, i) => o.findIndex((z) => z.canary === x.canary && z.total === x.total) === i);
})();
const BADAN_DITURUNKAN: string[] = [
    "<Blok nama=\"Gejala\" buka>",
    `Minggu ${mingguM49} Tahap 5. Selasa pukul 15.00 tim Pembayaran merilis otorisasi kartu versi baru dengan canary "${bobot}%".`,
    "Pukul 15.04 rasio otorisasi yang ditolak naik dari 2% ke 31%. Nadia menekan kill switch.",
    "Satu dari tiga pod berhenti menyetujui, dan dua pod lain tetap menyetujui. Sesudah pod itu dimulai ulang, ia menyetujui lagi.",
    "*Angka cerita (Ilustrasi):* hari, jam, 2%, 31%, dan tiga pod berasal dari naskah, bukan dari rekaman. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].",
    "*Tiga istilah di cerita:* canary adalah rilis yang lebih dulu memberi versi baru ke sebagian kecil, sebelum semuanya mendapatkannya. Pod adalah unit terkecil yang dijalankan dan dikelola di Kubernetes ([Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/), dibuka 2026-11-03, Tidak dijalankan). Kill switch adalah sakelar yang mematikan otorisasi kartu baru tanpa deploy ([[t4-kartu]]).",
    "</Blok>",
    "<Blok nama=\"Yang Raka kira\" buka>",
    `Tim Pembayaran mengira dua hal. Pertama, canary "${bobot}%" berarti lima dari seratus user mencoba versi baru. Kedua, kill switch mematikan otorisasi kartu di semua pod, jadi satu tekanan sudah cukup.`,
    `Rilis memakai Argo Rollouts ${versiA.argo}, yaitu controller Kubernetes untuk rilis bertahap seperti canary ([Argo Rollouts v1.10.1: pengantar](https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/index.md), dibuka 2026-11-03, Tidak dijalankan). Kill switch kartu adalah flag di memori satu proses sejak ADR 42 ([[t4-kartu]]).`,
    `Argo Rollouts bisa memakai traffic router. Itu ingress controller atau service mesh yang menggeser lalu lintas ke versi baru sedikit demi sedikit (sumber yang sama). Rollout tim Pembayaran tidak memakainya, dan langkah pertamanya meminta \`setWeight: ${bobot}\`, yaitu ${bobot}% untuk versi baru.`,
    "<details class=\"question\">",
    "<summary>Tebak dulu: Rollout meminta tiga replika, yaitu tiga pod, dengan `setWeight: 5` dan tanpa traffic router. Berapa pod versi baru yang berjalan, dan berapa bagiannya dari semua pod yang menjawab?</summary>",
    `Satu pod versi baru. Bila \`maxSurge\` tidak diubah, pod itu berjalan di samping ${kata(A3.v1)} pod versi lama: ${A3.v2} dari ${A3.menjawab} pod, atau ${pk(A3.persen)}%. Bila \`maxSurge\` diatur 0, total tetap ${kata(A3S0.menjawab)} pod dan bagiannya ${pk(A3S0.persen)}% (Rekaman lab, \`tanpa-router.txt\`, bagian A).`,
    `\`maxSurge\` adalah jumlah pod tambahan yang boleh dibuat controller untuk mencapai rasio itu ([Argo Rollouts v1.10.1: Canary](https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md), dibuka 2026-11-03, Tidak dijalankan). Angka ${bobot} tidak muncul sebagai bagian pod mana pun. Blok berikutnya menjelaskan kenapa controller memilih satu pod.`,
    "</details>",
    "</Blok>",
    "<Blok nama=\"Yang sebenarnya\">",
    `Tanpa traffic router, \`setWeight: ${bobot}\` mengatur jumlah pod, bukan bagian user. Dengan ${kata(A3.diminta)} replika, satu pod versi baru sudah ${pk(A3.persen)}% atau ${pk(A3S0.persen)}% dari pod. Kill switch di memori hanya mengubah pod yang menerima permintaannya.`,
    "<Rantai data={canaryPod} ringkas />",
    `*Kondisi rekaman:* Argo Rollouts ${versiA.argo} di k3s ${versiA.k3s} yang dijalankan k3d ${versiA.k3d}, dengan Traefik ${versiA.traefik} membagi permintaan ke satu Service. Service adalah objek Kubernetes yang menyasar pod lewat selector label ([Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/), dibuka 2026-11-03, Tidak dijalankan). Tiap pod menjalankan satu proses \`api-t5\` (go${versiA.go}) dengan PostgreSQL ${versiA.pg}, dari database bersih, di host arm64.`,
    "*Dua label turunan:* Hitungan adalah angka yang dihitung dari angka lain di halaman ini, dan labelnya ikut masukan yang paling lemah. Dibaca dari kode berarti isi kode sumber dibaca tanpa dijalankan, jadi labelnya Tidak dijalankan.",
    `Kalau kamu pernah menyalakan fitur untuk ${bobot}% user lewat flag di app, angka itu dihitung dari user. Tanpa traffic router, Argo Rollouts menghitung pod. Dokumentasinya menulis bahwa controller hanya berusaha mendekati persentase \`setWeight\` antara versi baru dan lama. Ia memilih bilangan bulat pod dengan selisih terkecil ([Argo Rollouts v1.10.1: Canary](https://github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md), dibuka 2026-11-03, Tidak dijalankan).`,
    `**Kenapa satu pod.** ${huruf1(kata(bobot))} persen dari ${kata(A3.diminta)} pod adalah ${koma((A3.diminta * bobot) / 100, 2)} pod, dan pod tidak bisa pecahan.`,
    "Kode v1.10.1 tidak menghasilkan nol pod versi baru untuk bobot 1 sampai 99 ([utils/replicaset/canary.go](https://github.com/argoproj/argo-rollouts/blob/v1.10.1/utils/replicaset/canary.go), dibuka 2026-11-03, Tidak dijalankan, dibaca dari kode). Syaratnya dua replika atau lebih, jadi satu pod versi baru wajib ada.",
    `Controller lalu menimbang dua pasangan. Satu pod dari ${pas[0].total} pod adalah ${pk((100 * pas[0].canary) / pas[0].total)}%, selisih ${pk(pas[0].selisih)} poin persentase dari ${bobot}%. Satu pod dari ${pas[1].total} pod adalah ${pk((100 * pas[1].canary) / pas[1].total)}%, selisih ${pk(pas[1].selisih)} poin. Pasangan kedua lebih dekat ke ${bobot}%, jadi ${kata(pas[1].total)} pod berjalan (Hitungan atas kode).`,
    "<Snippet file=\"labs/t5-rollout/output/tanpa-router.txt\" lines=\"13:21\" title=\"Rekaman lab: labs/t5-rollout/output/tanpa-router.txt, bagian A (3 replika, maxSurge tidak diubah)\" />",
    `Dengan \`maxSurge: 0\` controller tidak boleh menambah pod, jadi hanya pasangan pertama yang tersisa. Tabel ini menaruh kedua pengaturan di samping rekamannya, dengan ${kata(A3.diminta)} replika dan \`setWeight: ${bobot}\`.`,
    "| Pengaturan Rollout | Pod versi baru | Pod versi lama | Bagian pod versi baru |",
    "|---|---|---|---|",
    "| `maxSurge` tidak diubah | 1 | 3 | 25,0% (Rekaman lab) |",
    "| `maxSurge: 0` | 1 | 2 | 33,3% (Rekaman lab) |",
    `Judul halaman memakai "sepertiga" dari naskah. Rekaman memberi ${pk(A3S0.persen)}% hanya dengan \`maxSurge: 0\`. Dokumentasi menulis bawaan \`maxSurge\` 25% di halaman canary dan 1 di halaman spesifikasi, sedangkan kode v1.10.1 menulis \`DefaultMaxSurge = "25"\` (Tidak dijalankan, dibaca dari dokumentasi dan kode). Halaman ini tidak menulis angka bawaan: rekaman memberi ${kata(A3.menjawab)} pod, jadi \`maxSurge\` yang tidak diubah mengizinkan satu pod tambahan untuk ${kata(A3.diminta)} replika.`,
    `**Permintaan mengikuti pod, dalam batas.** Lab mengirim ${JUMLAH_PERMINTAAN} permintaan \`GET /healthz\` lewat Gateway ke satu Service tanpa bobot, dan semuanya terjawab.`,
    `Bagian yang dijawab versi baru terukur antara ${pk(A3.bawah)}% dan ${pk(A3.atas)}% pada ${pk(A3.persen)}% pod, dan antara ${pk(A3S0.bawah)}% dan ${pk(A3S0.atas)}% pada ${pk(A3S0.persen)}% pod. Itu batas yang diperiksa lab. Hitungan tepat bergantung penyeimbang beban Traefik dan tidak direkam.`,
    "Bagian user tidak direkam, karena permintaan lab tidak membawa identitas user (Tidak dijalankan).",
    "**Kill switch di memori hanya mengubah satu proses.** Rekaman Tahap 4 hanya punya satu proses: sesudah mulai ulang, kill switch yang dimatikan kembali aktif, dan dua instance Tidak dijalankan (`kill-switch.txt`, bagian B). Rekaman Tahap 5 menjalankan tiga pod dari satu image, dengan flag yang sama dan satu database:",
    "<Snippet file=\"labs/t5-rollout/output/sakelar.txt\" lines=\"6:16\" title=\"Rekaman lab: labs/t5-rollout/output/sakelar.txt, bagian D (flag di memori, tiga pod)\" />",
    `Lab mengirim permintaan mematikan ke pod ${podTolak[0]}. Hanya pod ${podTolak[0]} yang menolak, dan pod ${podSetuju[0]} dan pod ${podSetuju[1]} tetap menyetujui otorisasi baru. Pod ${podUlang[0]} dihapus dan diganti pod baru, yang menyetujui lagi tanpa ada yang menyalakannya.`,
    "Sebabnya ada di kode lab. `KartuAktifSekarang` membaca satu `atomic.Bool` yang dibuat dan dinyalakan di `main` saat proses mulai, jadi tiap proses punya flagnya sendiri:",
    "<Snippet file=\"labs/api-t5/internal/service/kartu.go\" lines=\"53:54\" lang=\"go\" title=\"Kode lab: labs/api-t5/internal/service/kartu.go, fungsi KartuAktifSekarang\" />",
    "Rollout yang membuat pod versi baru juga membuat proses baru, dan di proses itu flag menyala lagi. Itu Penalaran, yaitu kesimpulan dari kode dan rekaman tanpa dijalankan. Kill switch yang dimatikan sebelum rilis tidak terbawa ke pod itu.",
    "**Yang tidak direkam.**",
    "- Selasa, 15.00, 15.04, 2%, 31%, tiga pod, dan Nadia berasal dari cerita (Ilustrasi). Lab tidak menjalankan versi kartu yang salah.",
    "- Bagian user, hitungan permintaan tepat per versi, dan jumlah pod di bawah beban nyata tidak direkam.",
    "- Argo Rollouts selain v1.10.1, `maxSurge` selain bawaan dan 0, dan `maxUnavailable` Tidak dijalankan. Lab hanya diuji di host arm64.",
    "- Rekaman Tahap 4 tidak punya dua instance. Rekaman Tahap 5 punya tiga pod dengan flag yang sama, dan memakai kode `api-t5`, bukan kode Tahap 4.",
    "- Cara menghubungkan bobot ke traffic router dan memindahkan kill switch ke tempat yang dibaca semua pod dibahas di [[t5-rollout]].",
    "</Blok>",
    "<Blok nama=\"Coba sendiri\">",
    "Widget ini mengikuti cerita M49. Jalur utama memuat dua langkah cerita (Ilustrasi) dan empat langkah rekaman, dan \"Ubah satu hal\" memakai rekaman `tanpa-router.txt` bagian A. Tebak dulu, lalu tekan Berikutnya atau panah kanan.",
    "<WidgetLama nama=\"alur\" src=\"data/skenario/t5-m49.json\" />",
    `Sesudah langkah terakhir, centang **Ubah satu hal: Rollout memakai ${A20.diminta} replika, bukan ${A3.diminta}**. Dua langkah berikutnya memuat rekaman bagian pod dan batas permintaan, dan langkah terakhir memuat bagian terkecil yang bisa dicapai satu pod (Hitungan).`,
    "Widget ini tidak punya layar HP, karena M49 terjadi di antara engineer, bukan di app.",
    "<noscript>",
    `Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: \`setWeight: 5\` dengan ${kata(A3.diminta)} replika menjalankan ${A3.v2} pod versi baru dan ${A3.v1} pod versi lama (${pk(A3.persen)}%). Rasio ditolak naik dari 2% ke 31% (Ilustrasi). Kill switch di pod ${podTolak[0]} membuat pod ${podTolak[0]} menolak, sementara pod ${podSetuju[0]} dan pod ${podSetuju[1]} menyetujui (bagian D).`,
    `Dengan ${A20.diminta} replika, rekaman memberi ${A20.v2} pod versi baru dan ${A20.v1} pod versi lama: ${pk(A20.persen)}% (bagian A).`,
    "</noscript>",
    "</Blok>",
    "<Blok nama=\"Konsep yang lahir\">",
    "- [[t5-rollout]]: progressive delivery, canary dengan traffic router, GitOps, dan kill switch yang dibaca semua pod. Keputusannya ADR 55.",
    "- [[t4-kartu]]: ADR 42, yang menaruh kill switch di memori satu proses dan dibaca ulang di halaman ini.",
    "- [[t5-service]]: pod dan Kubernetes, yang memecah satu proses menjadi beberapa.",
    "Canary tanpa traffic router menghitung pod, dan kill switch harus ada di tempat yang dibaca semua pod.",
    "### Cek diri",
    "**1.** Rollout dengan tiga replika dan `setWeight: 5` menjalankan satu pod versi baru. Kenapa bagiannya bukan 5%, dan berapa replika yang membuatnya 5,0%?",
    "<details class=\"success\">",
    "<summary>Jawaban</summary>",
    `${huruf1(kata(bobot))} persen dari ${kata(A3.diminta)} pod adalah ${koma((A3.diminta * bobot) / 100, 2)} pod, dan kode v1.10.1 menyisakan satu pod versi baru untuk bobot 1 sampai 99 (dibaca dari kode). Hasilnya ${pk(A3.persen)}% atau ${pk(A3S0.persen)}% menurut \`maxSurge\`. Dengan ${A20.diminta} replika rekaman memberi ${A20.v2} pod versi baru dan ${A20.v1} pod versi lama: ${pk(A20.persen)}% (\`tanpa-router.txt\`, bagian A).`,
    "</details>",
    "**2.** Nadia mematikan kill switch lewat satu pod. Apa yang direkam lab untuk dua pod lain dan untuk pod yang diganti?",
    "<details class=\"success\">",
    "<summary>Jawaban</summary>",
    "Dua pod lain tetap menyetujui otorisasi baru, dan pod pengganti menyetujui lagi karena flag di memori hilang bersama prosesnya (`sakelar.txt`, bagian D). Flag dibuat dan dinyalakan di `main` tiap proses (Tidak dijalankan, dibaca dari kode).",
    "</details>",
    "**3.** Angka mana di halaman ini yang bukan rekaman, dan apa yang lab tidak ukur dari canary?",
    "<details class=\"success\">",
    "<summary>Jawaban</summary>",
    "Hari, jam, 2%, dan 31% adalah Ilustrasi. Lab mengukur bagian pod dan memeriksa batas bagian permintaan, tetapi tidak mengukur bagian user dan tidak mencatat hitungan permintaan tepat per versi (`tanpa-router.txt`, bagian A).",
    "</details>",
    "</Blok>",
    "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];

describe("seluruh baris badan: setiap kalimat, judul, dan tabel sama dengan yang diturunkan dari rekaman, kode, dan hitungan", () => {
  test("daftar baris tak kosong sama persis, dalam urutan yang sama", () => {
    expect(badan.split("\n").filter((b) => b.trim() !== "")).toEqual(BADAN_DITURUNKAN);
  });
  test("tiap angka bobot 5 di halaman berasal dari rekaman: enam kemunculan setWeight, dan 0,15 pod muncul dua kali", () => {
    expect(hitungKali(badan, "`setWeight: " + bobot + "`")).toBe(6);
    expect(hitungKali(badan, `${koma((A3.diminta * bobot) / 100, 2)} pod`)).toBe(2);
    expect(hitungKali(badan, `canary "${bobot}%"`)).toBe(2);
  });
});

// --- baris riset yang dibaca ke sumber primer pada 2026-11-03: kutipan, versi, tanggal, dan alamat tidak boleh berubah tanpa membuka sumbernya lagi
const RISET_TERKUNCI: Record<string, string> = {
  "R5-215": "| R5-215 | Argo Rollouts: pengantar dan canary tanpa traffic management | `docs/index.md` pada tag v1.10.1 (github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/index.md, dibuka 2026-11-03): \"Argo Rollouts is a Kubernetes controller and set of CRDs which provide advanced deployment capabilities such as blue-green, canary, canary analysis, experimentation, and progressive delivery features to Kubernetes.\"; \"Argo Rollouts (optionally) integrates with ingress controllers and service meshes, leveraging their traffic shaping abilities to gradually shift traffic to the new version during an update.\" `docs/features/canary/index.md` pada tag v1.10.1 (github.com/argoproj/argo-rollouts/blob/v1.10.1/docs/features/canary/index.md, dibaca dengan `curl` dari raw.githubusercontent.com, dibuka 2026-11-03; salinan di argo-rollouts.readthedocs.io/en/stable tidak bernomor versi): \"If the canary Rollout does not use traffic management, the Rollout makes a best effort attempt to achieve the percentage listed in the last `setWeight` step between the new and old version.\"; \"finding the whole number with the smallest delta, rounding up the calculation if the deltas are equals\"; \"If a user wants to have more fine-grained control of the percentages without a large number of Replicas, that user should use the traffic management functionality.\" Halaman itu menulis persentase antara versi baru dan lama | 5.22 blok Yang Raka kira (controller Kubernetes, traffic router) dan Yang sebenarnya: tanpa traffic router `setWeight` mengatur jumlah pod, dengan selisih terkecil dan pembulatan ke atas bila selisihnya sama | Tidak berubah (sama dengan R5-16 dan R5-104) |",
  "R5-216": "| R5-216 | Argo Rollouts: `maxSurge` bawaan, dua halaman dokumentasi dan kode | `docs/features/canary/index.md` v1.10.1, bagian maxSurge, dibuka 2026-11-03: \"`maxSurge` controls basic-canary desired replica math when `trafficRouting` is not set\"; \"`maxSurge` defines the maximum number of replicas the rollout can create to move to the correct ratio set by the last `setWeight`\"; \"Defaults to \"25%\".\" `docs/features/specification.md` v1.10.1 (komentar contoh `maxSurge`): \"Absolute number is calculated from percentage by rounding up. By default, a value of 1 is used.\" `utils/defaults/defaults.go` v1.10.1: `DefaultMaxSurge = \"25\"` (string tanpa tanda persen), dipakai `GetMaxSurgeOrDefault` lewat `intstr.FromString(DefaultMaxSurge)`; cara nilai itu dibaca tidak ditelusuri. Dua halaman dokumentasi yang sama bertentangan (25% lawan 1), dan kode menulis \"25\". README `labs/t5-rollout` dan satu baris kepala `tanpa-router.txt` menulis bawaan 1 (dari halaman spesifikasi) | 5.22: halaman menulis ketiga sumber apa adanya dan tidak menulis angka bawaan; rekaman memberi empat pod untuk tiga replika, jadi `maxSurge` yang tidak diubah mengizinkan satu pod tambahan | Baru (selisih dua halaman dokumentasi dicatat di badan PR) |",
  "R5-217": "| R5-217 | Argo Rollouts: aturan satu pod canary dan pasangan pod yang dipilih | Kode `utils/replicaset/canary.go` pada tag v1.10.1 (github.com/argoproj/argo-rollouts/blob/v1.10.1/utils/replicaset/canary.go, dibaca dengan `curl`, dibuka 2026-11-03), fungsi `approximateWeightedCanaryStableReplicaCounts(specReplicas, desiredWeight, maxWeight, maxSurge int32)`. Komentar fungsi: \"The canary/stable replica counts might sum to either spec.replicas or spec.replicas + 1 but will not exceed spec.replicas if maxSurge is 0.\" dan \"If the canary weight is between 1-99, and spec.replicas is > 1, we will always return a minimum of 1 for stable and canary as to not return 0.\" Kodenya: `zeroAllowed` hanya benar bila bobot 0 atau maxWeight, atau bila ada satu replika dan `maxSurge` 0 (baris 237), jadi bobot 1 sampai 99 dengan dua replika atau lebih tidak menghasilkan nol pod canary; pasangan (canary, total) dihitung untuk total `specReplicas` dan, bila `maxSurge` lebih dari 0, `specReplicas + 1`; dipilih pasangan dengan selisih bobot terkecil. Dibaca dari kode, bukan dokumentasi | 5.22: tiga replika dan bobot 5 menimbang 1 dari 3 pod (33,3%, selisih 28,3 poin dari 5) dan 1 dari 4 pod (25,0%, selisih 20,0 poin); yang kedua dipilih (Hitungan atas kode; rekaman: empat pod) | Tidak berubah |",
  "R5-218": "| R5-218 | Kubernetes: pod dan Service memilih pod lewat selector | Dokumentasi Kubernetes, \"Pods\" (kubernetes.io/docs/concepts/workloads/pods/, dibuka 2026-11-03; sumber mentah `content/en/docs/concepts/workloads/pods/_index.md` di kubernetes/website): \"Pods are the smallest deployable units of computing that you can create and manage in Kubernetes.\"; \"Pods are generally not created directly and are created using workload resources.\" Dokumentasi \"Service\" (kubernetes.io/docs/concepts/services-networking/service/, dibuka 2026-11-03; sumber mentah `service.md`): \"The set of Pods targeted by a Service is usually determined by a selector that you define.\" Bagian yang dibaca tidak menulis algoritma pembagian permintaan antar pod; hitungan permintaan per versi di lab dicatat hanya sebagai batas | 5.22: kalimat arti pod di catatan istilah Gejala, dan satu Service di depan pod versi baru dan lama di Kondisi rekaman | Tidak berubah |",
  "R5-219": "| R5-219 | Hitungan atas angka yang tertulis di halaman 5.22 (Hitungan atas Rekaman lab dan Ilustrasi) dan sumber internal yang dikutip | Dihitung dengan skrip sendiri, dibaca 2026-11-03: 1 ÷ 4 = 25,0% dan 1 ÷ 3 = 33,3% (33,33); selisih dari 5%: 25,0 − 5 = 20,0 poin dan 33,3 − 5 = 28,3 poin (28,33); 5% × 3 = 0,15 pod; 1 ÷ 20 = 5,0%. Sumber internal dibaca di main: `labs/t5-rollout/output/tanpa-router.txt` bagian A (tiga pengaturan: 3 replika bawaan 1 pod baru dan 3 lama, 20 replika 1 dan 19, 3 replika `maxSurge: 0` 1 dan 2; batas permintaan 17,5% sampai 32,5%, 1,5% sampai 8,5%, 23,5% sampai 43,5%), `labs/t5-rollout/output/sakelar.txt` bagian D (tiga pod, flag di memori), `labs/t4-kartu/output/kill-switch.txt` bagian B (satu proses; dua instance Tidak dijalankan), `labs/api-t5/cmd/api/main.go` (`KartuAktif: &atomic.Bool{}` dan `Store(true)` di main) dan `internal/service/kartu.go` (`KartuAktifSekarang`) | Angka dan kalimat rekaman di halaman 5.22; masukan terlemah Ilustrasi atau Asumsi, jadi hasil Hitungan berlabel itu | Tidak berlaku (hitungan atas angka sendiri) |",
};

describe("baris riset R5-215 sampai R5-219: isi persis (kutipan, versi, tanggal, alamat), tanpa bergantung pada kunci lapis 2", () => {
  for (const id of Object.keys(RISET_TERKUNCI)) {
    test(`${id}: sama dengan baris yang dibaca ke sumber`, () => {
      expect(barisRiset(id)).toBe(RISET_TERKUNCI[id]);
    });
  }
});

function huruf1(s: string): string { return s[0]!.toUpperCase() + s.slice(1); }

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "wajib", "terbawa", "menolak", "menyetujui", "berjalan", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "pecahan", "dekat", "terkecil", "selisih"];
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
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const kartuT5m49 = kartuSemua.filter((x) => x.halaman === "t5-m49");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-03/g) ?? []).length, tanggal: (halaman.match(/2026-11-03/g) ?? []).length,
    dibacaDariKode: (halaman.match(/[Dd]ibaca dari (?:kode|dokumentasi dan kode)/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-215", "R5-216", "R5-217", "R5-218", "R5-219"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m49)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m49) },
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m49-canary-sepertiga.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m49-canary-sepertiga.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(6);
    expect(sidikSekarang.label.tidakDijalankan).toBe(13);
    expect(sidikSekarang.label.perluVerifikasi).toBe(0);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
