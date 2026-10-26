// Penjaga halaman 3.15 (keputusan 1056 sampai 1058): angka, ID `[[...]]`, nomor ADR, label sumber, versi dokumentasi, klaim "tidak ada",
// rentang Snippet, tab stack, diagram Rantai, widget Tebak dan banding, tabel ADR per sel, dan setiap kalimat di dua-instance.mdx diturunkan dari
// registry (cerita.json), naskah Tahap 3 (bagian 3, 4, peta), rekaman labs/t3-instance (proxy, panic, bergulir, batas), kode lab (run.py, Caddyfile,
// docker-compose.yml, README) dan labs/api-t3 (cmd/api/main.go), baris RISET R3-170 sampai R3-174 (dan R3-13, R3-71, R3-136, R3-137), halaman
// istilah health-check, dan halaman tetangga (3.8, 2.31). Nilai diturunkan di tes ini, bukan dari daftar yang ditulis ulang. Kalimat penulis dan
// seluruh teks data dikunci utuh lewat file snapshot di __teks__: mengubah satu kata menggagalkan tes, dan itu tanda untuk meninjau klaimnya
// terhadap sumber. Penjaga angka tidak menangkap kalimat yang SALAH, jadi klaim yang mekanismenya mudah keliru (bergulir tanpa Shutdown,
// health check bergantung database, 503 bukan fail open) dijaga tes khusus di bawah.
// Tes hanya membaca file yang dilacak git (bukan hasil build atau binari lokal, pelajaran 3.2).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataTebak } from "../widgets/tebak/skema";

const akar = path.resolve(__dirname, "../../..");
const terlacak = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: akar, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean),
);
const baca = (rel: string): string => {
  if (!terlacak.has(rel)) throw new Error(`${rel} tidak dilacak git: tes tidak boleh membaca hasil build atau file lokal`);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-3/dua-instance.mdx";
const mdx = baca(HALAMAN);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const proposal = baca("plan/PROPOSAL.md");
const proxyTeks = baca("labs/t3-instance/output/proxy.txt");
const bergulirTeks = baca("labs/t3-instance/output/bergulir.txt");
const panicTeks = baca("labs/t3-instance/output/panic.txt");
const batasTeks = baca("labs/t3-instance/output/batas.txt");
const proxy = proxyTeks.split("\n");
const bergulir = bergulirTeks.split("\n");
const panic = panicTeks.split("\n");
const batas = batasTeks.split("\n");
const runPy = baca("labs/t3-instance/run.py");
const readmeLab = baca("labs/t3-instance/README.md");
const compose = baca("labs/t3-instance/docker-compose.yml");
const caddyAktifRetry = baca("labs/t3-instance/caddy/aktif-retry.Caddyfile");
const caddyBawaan = baca("labs/t3-instance/caddy/bawaan.Caddyfile");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kolam = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
const sengajaBelumT2 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const fiturTeknis = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const diagramMentah = JSON.parse(baca("situs/data/diagram/t3-dua-instance-inti.json")) as unknown;
const rantai = DataRantai.parse(diagramMentah);
const tebakMentah = JSON.parse(baca("situs/data/widget/t3-dua-instance-tebak.json")) as unknown;
const tebak = DataTebak.parse(tebakMentah);
const bandingTeks = baca("situs/lama/widgets/data/t3-dua-instance-banding.json");
interface Banding { judul: string; opsi: { id: string; nama: string; baris: { id: string; label: string; sub?: string }[][] }[]; fitur: { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }[] }
const banding = JSON.parse(bandingTeks) as Banding;
const istilahTeks = baca("situs/data/halaman-istilah/health-check.json");
const istilah = HalamanIstilah.parse(JSON.parse(istilahTeks));

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
/** Nomor baris (mulai 1) pertama yang cocok, dari indeks `dariIdx` (0-based). */
const nomor = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && cocok(b));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const bagian = (baris: string[], huruf: string): string[] => {
  const i = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(i, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const j = baris.findIndex((b, n) => n > i && b.startsWith("# --- "));
  return baris.slice(i, j < 0 ? undefined : j);
};
const ambil = (baris: string[], pola: RegExp): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).filter((x): x is RegExpMatchArray => x !== null);
  expect(m, `pola ${pola} harus cocok tepat satu kali`).toHaveLength(1);
  return m[0]!;
};
const fmt = (x: number, d = 0): string => {
  const [bulat, pecah] = x.toFixed(d).split(".");
  const ribuan = bulat!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return pecah ? `${ribuan},${pecah}` : ribuan;
};

// ---- rekaman proxy.txt: semua angka halaman diturunkan dari sini -----------------------------------------------------------------
const pA = bagian(proxy, "A");
const pC = bagian(proxy, "C");
const pD = bagian(proxy, "D");
const pE = bagian(proxy, "E");
const pF = bagian(proxy, "F");
const pG = bagian(proxy, "G");
const jumlahA = ambil(pA, /^jumlah: 200: (\d+) · 200 per instance: a (\d+), b (\d+)$/).slice(1).map(Number) as [number, number, number];
const jumlahC = ambil(pC, /^jumlah: 200: (\d+) · 502: (\d+)$/).slice(1).map(Number) as [number, number];
const urutanC = ambil(pC, /^urutan \(status:instance\): (.+)$/)[1]!.split(" ");
const getD = ambil(pD, /^20 GET \/healthz: 200: (\d+) · 200 per instance: a (\d+)$/).slice(1).map(Number) as [number, number];
const postD = ambil(pD, /^6 POST \/logout tanpa token: 401: (\d+) dari instance a (\d+)$/).slice(1).map(Number) as [number, number];
const jumlahE = ambil(pE, /^ {2}jumlah: 200: (\d+) · 502: (\d+)$/).slice(1).map(Number) as [number, number];
const jumlahF = ambil(pF, /^ {2}jumlah: 200: (\d+) · 200 per instance: a (\d+)$/).slice(1).map(Number) as [number, number];
const keluarG = ambil(pG, /^b mati dan sudah dikeluarkan \(tanpa retry\): 20 request: 200: (\d+) · 200 per instance: a (\d+)$/).slice(1).map(Number) as [number, number];
const kembaliG = ambil(pG, /^b hidup lagi dan lolos health check: 20 request: 200: (\d+) · 200 per instance: a (\d+), b (\d+)$/).slice(1).map(Number) as [number, number, number];
const pB = bagian(proxy, "B");
const bgA = bagian(bergulir, "A");
const bgB = bagian(bergulir, "B");
const bgC = bagian(bergulir, "C");
const bgD = bagian(bergulir, "D");
const pnD = bagian(panic, "D");
const pnE = bagian(panic, "E");
const btA = bagian(batas, "A");
const btB = bagian(batas, "B");
const tigaPuluh = 30;
const puncak = (cerita.tahap[2]!.asumsi.user * (cerita.tahap[2]!.asumsi.aktif / 100) * cerita.tahap[2]!.asumsi.req) / 86400 * cerita.tahap[2]!.asumsi.puncak;
const lambdaBayar = (cerita.tahap[2]!.asumsi.user * (cerita.tahap[2]!.asumsi.aktif / 100) * cerita.tahap[2]!.asumsi.trx) / 86400 * cerita.tahap[2]!.asumsi.puncak;
const gagalCelah = (puncak * tigaPuluh) / 2;

// ---- Snippet: rentang baris diturunkan dari isi rekaman dan kode, bukan ditulis ulang ---------------------------------------------
const rentang = (baris: string[], awal: (b: string) => boolean, akhir: (b: string) => boolean): string => {
  const a = nomor(baris, awal);
  return `${a}:${nomor(baris, akhir, a - 1)}`;
};
const mulaiBagian = (h: string) => (b: string) => b.startsWith(`# --- ${h}. `);
const RENTANG = {
  proxyA: rentang(proxy, mulaiBagian("A"), (b) => b.startsWith("jumlah: 200: 20 ·")),
  proxyC: rentang(proxy, mulaiBagian("C"), (b) => b.startsWith("jumlah: 200: 10 · 502: 10")),
  proxyD: rentang(proxy, mulaiBagian("D"), (b) => b.startsWith("(401 dari instance a: POST juga")),
  proxyE: rentang(proxy, mulaiBagian("E"), (b) => b === "  jumlah: 200: 5 · 502: 5"),
  proxyF: rentang(proxy, mulaiBagian("F"), (b) => b.startsWith("  jumlah: 200: 10 · 200 per instance: a 10")),
  proxyG: rentang(proxy, mulaiBagian("G"), (b) => b.startsWith("b hidup lagi dan lolos health check:")),
  bergulirA: rentang(bergulir, mulaiBagian("A"), (b) => b.startsWith("  log: api-t3 berhenti")),
  bergulirB: rentang(bergulir, mulaiBagian("B"), (b) => b.startsWith("  log berhenti rapi ada: TIDAK")),
  bergulirC: rentang(bergulir, mulaiBagian("C"), (b) => b.startsWith("  instance yang menjawab: a, a2, b, b2")),
  bergulirD: rentang(bergulir, mulaiBagian("D"), (b) => b.startsWith("  ada 502: ya · status yang muncul: [200, 502]")),
  panicD: rentang(panic, mulaiBagian("D"), (b) => b.startsWith("10 request sesudahnya lewat proxy: 503: 10")),
  healthz: rentang(mainGo.split("\n"), (b) => b.includes("// Health check untuk proxy (ADR 26)"), (b) => b === "\t})"),
  shutdown: rentang(mainGo.split("\n"), (b) => b.includes("// Graceful shutdown (ADR 26)"), (b) => b === '\tlog.Print("api-t3 berhenti")'),
  caddy: `${nomor(caddyAktifRetry.split("\n"), (b) => b === "{")}:${caddyAktifRetry.replace(/\n+$/, "").split("\n").length}`,
};
const SNIPPET_DIHARAPKAN: [string, string][] = [
  ["labs/t3-instance/output/proxy.txt", RENTANG.proxyA],
  ["labs/t3-instance/output/proxy.txt", RENTANG.proxyC],
  ["labs/t3-instance/output/proxy.txt", RENTANG.proxyD],
  ["labs/t3-instance/output/proxy.txt", RENTANG.proxyE],
  ["labs/t3-instance/output/proxy.txt", RENTANG.proxyF],
  ["labs/t3-instance/output/proxy.txt", RENTANG.proxyG],
  ["labs/api-t3/cmd/api/main.go", RENTANG.healthz],
  ["labs/t3-instance/output/panic.txt", RENTANG.panicD],
  ["labs/api-t3/cmd/api/main.go", RENTANG.shutdown],
  ["labs/t3-instance/output/bergulir.txt", RENTANG.bergulirA],
  ["labs/t3-instance/output/bergulir.txt", RENTANG.bergulirB],
  ["labs/t3-instance/output/bergulir.txt", RENTANG.bergulirC],
  ["labs/t3-instance/output/bergulir.txt", RENTANG.bergulirD],
  ["labs/t3-instance/caddy/aktif-retry.Caddyfile", RENTANG.caddy],
];

describe("registry, meta, blok, widget, dan tautan", () => {
  test("3.15 ada, konsep, jalur inti, ADR 26, prasyarat 3.14, lab t3-instance, peran devops; menit sama dengan baris meta", () => {
    expect(dari("t3-dua-instance")).toMatchObject({ ada: true, nomor: "3.15", jenis: "konsep", inti: true, adr: [26], prasyarat: ["t3-m21"], lab: ["t3-instance"], peran: ["devops", "backend"], tahap: 3 });
    expect(dari("t3-dua-instance").judul).toBe("Dua instance di belakang proxy + ADR 26");
    expect(mdx).toContain(`title: "3.15 ${dari("t3-dua-instance").judul}"`);
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe("ADR 26 menjalankan dua instance di satu VPS di belakang proxy dengan health check aktif dan retry. Dua instance menahan satu kematian proses, bukan kematian VPS.");
    expect(naskah).toContain("| 3.15 | 4 | Dua instance di belakang proxy + ADR 26 | Konsep + ADR | ★ | t3-instance | banding |");
    expect(dari("t3-m21").nomor).toBe("3.14");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m21\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t3-dua-instance").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(glosarium).toContain("| **Health check** | Pemeriksaan berkala yang dilakukan proxy atau orkestrator ke tiap instance untuk memutuskan apakah instance itu boleh menerima request. | [[t3-dua-instance]] |");
    expect(glosarium).toContain("| **Graceful shutdown** | Mematikan proses dengan rapi: berhenti menerima koneksi baru, lalu menunggu request yang sedang jalan selesai sebelum keluar. | [[t3-dua-instance]] |");
    expect(istilah.cerita!.map((c) => c.rujukan)).toEqual(["t3-dua-instance"]);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const bacaMenit = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - bacaMenit), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep; dua pertama terbuka; Tebak dan banding di blok Coba, urut, dengan noscript nyata di luar komentar", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba"'), badan.indexOf('<Blok nama="Paham">'));
    expect(coba.match(/<Tebak client:visible data=\{dataTebak\} \/>/g)).toHaveLength(1);
    expect(coba.match(/<WidgetLama nama="banding" src="data\/t3-dua-instance-banding\.json" \/>/g)).toHaveLength(1);
    expect(coba.indexOf("<Tebak")).toBeLessThan(coba.indexOf("<WidgetLama"));
    expect(coba.match(/<noscript>\n<p>[^<]+<\/p>\n<\/noscript>/g)).toHaveLength(2);
    expect(coba).toContain("**Ubah satu hal:**");
    expect(coba).toContain("[Label sumber](/cara-pakai/#label-sumber)");
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/^#{2,3} Label sumber/m);
    expect(badan.match(/<SkripLama daftar=\{\["cerita","banding"\]\} \/>/g)).toHaveLength(1);
    expect(badan).toContain('import dataTebak from "../../../../data/widget/t3-dua-instance-tebak.json";');
    expect(badan).toContain('import intiDiagram from "../../../../data/diagram/t3-dua-instance-inti.json";');
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    // Peta naskah: widget halaman ini banding, dan baris pertama Inti sebelum diagram.
    expect(badan.indexOf("## Inti")).toBeLessThan(badan.indexOf("<Rantai"));
  });
  test("tautan [[id]]: himpunan yang diharapkan; nomor dan judul sama dengan peta naskah; janji halaman tetangga ditepati", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
    expect(id).toEqual(["t2-adr-21", "t2-idempotency", "t2-skema-tanpa-downtime", "t3-adr-33", "t3-jembatan", "t3-m18", "t3-m21", "t3-m22", "t3-m23", "t3-pool", "t3-prd", "t3-rate-limit-redis", "t3-tim-infra"]);
    const peta = [...naskah.matchAll(/^\| (3\.\d+) \| [^|]+ \| ([^|]+) \| [^|]+ \|/gm)].map((m) => [m[1]!, m[2]!.trim()] as const);
    for (const idh of id.filter((x) => x.startsWith("t3-"))) {
      const h = dari(idh);
      const p = peta.find((x) => x[0] === h.nomor);
      expect(p, `peta naskah ${h.nomor} untuk ${idh}`).toBeDefined();
      expect(p![1]).toBe(h.judul);
    }
    expect(dari("t2-adr-21")).toMatchObject({ nomor: "2.31", adr: [21] });
    expect(dari("t2-idempotency")).toMatchObject({ nomor: "2.14", adr: [14] });
    expect(dari("t2-skema-tanpa-downtime")).toMatchObject({ nomor: "2.22", adr: [17] });
    expect(dari("t3-pool")).toMatchObject({ nomor: "3.8", adr: [22] });
    expect(dari("t3-m18").nomor).toBe("3.6");
    expect(dari("t3-m22").nomor).toBe("3.16");
    expect(dari("t3-m23").nomor).toBe("3.18");
    expect(dari("t3-rate-limit-redis")).toMatchObject({ nomor: "3.17", adr: [27] });
    expect(dari("t3-tim-infra")).toMatchObject({ nomor: "3.27", adr: [32] });
    expect(dari("t3-jembatan").nomor).toBe("3.32");
    expect(dari("t3-adr-33").adr).toEqual([33]);
    expect(dari("t3-prd").nomor).toBe("3.1");
    // Janji halaman lain: 3.8 menaut halaman ini untuk 110 koneksi dan health check yang memakai database; 2.31 untuk pemicu server kedua; 3.2 untuk reverse proxy.
    expect(kolam).toContain("Dengan dua instance ([[t3-dua-instance]]), 2 × 50 + 4 + 3 + 3 = 110 koneksi melebihi `max_connections` bawaan 100");
    expect(kolam).toContain("health check yang memakai koneksi database ([[t3-dua-instance]])");
    expect(sengajaBelumT2).toMatch(/\| Server kedua \| [^|]*PRD meminta deploy tanpa jeda[^|]*\|[^\n]*\[\[t3-dua-instance\]\] \|/);
    expect(fiturTeknis).toContain("[[t3-dua-instance\\|Reverse proxy]]");
    harus("Pemicu server kedua di [[t2-adr-21]] sudah terpenuhi, karena PRD v3 meminta deploy tanpa jeda.");
  });
  test("widget: tebak punya tepat satu pilihan benar, bukan pilihan pertama atau terakhir; banding lolos cekData lama dan tiap opsi punya catatan tiap kejadian", () => {
    expect(tebak.pilihan.filter((p) => p.benar)).toHaveLength(1);
    const idx = tebak.pilihan.findIndex((p) => p.benar);
    expect(idx).toBeGreaterThan(0);
    expect(idx).toBeLessThan(tebak.pilihan.length - 1);
    expect(tebak.sumber).toEqual({ jenis: "rekaman", teks: "labs/t3-instance/output/proxy.txt bagian C" });
    expect(tebak.label.sumber).toBe("Rekaman lab · proxy.txt");
    expect(tebak.pertanyaan).toBe(`Berapa dari ${jumlahC[0] + jumlahC[1]} request itu yang gagal?`);
    expect(tebak.pilihan[idx]!.teks).toBe(`${jumlahC[1]}, yaitu setiap request kedua.`);
    expect(tebak.pilihan[idx]!.alasan).toContain(`berulang ${jumlahC[1]} kali`);
    const fn = new Function("module", "window", baca("situs/lama/widgets/banding.js")) as (m: { exports: { cekData?: (d: Banding) => string[] } }, w: undefined) => void;
    const mod: { exports: { cekData?: (d: Banding) => string[] } } = { exports: {} };
    fn(mod, undefined);
    expect(mod.exports.cekData!(banding)).toEqual([]);
    expect(banding.opsi.map((o) => o.id)).toEqual(["polos", "adr26"]);
    expect(banding.fitur.map((f) => f.label)).toEqual(["Satu instance mati", "Deploy bergulir", "Kedua instance mati", "VPS mati"]);
    for (const f of banding.fitur) {
      for (const o of banding.opsi) expect(f.catatan[o.id]!.length).toBeGreaterThan(10);
    }
    const [f1, f2, f3, f4] = banding.fitur as [Banding["fitur"][number], Banding["fitur"][number], Banding["fitur"][number], Banding["fitur"][number]];
    expect(f1.catatan.polos).toContain(`${jumlahC[1]} dari ${jumlahC[0] + jumlahC[1]} request gagal dengan 502`);
    expect(f1.catatan.polos).toContain("(proxy.txt bagian C)");
    expect(f1.catatan.adr26).toContain(`${jumlahF[0]} request langsung sesudah b mati, semuanya 200 dari instance a`);
    expect(f1.catatan.adr26).toContain("(proxy.txt bagian F)");
    expect(f2.catatan.polos).toContain("502 di antara jawaban 200");
    expect(f2.catatan.polos).toContain("0,5 detik");
    expect(f2.catatan.polos).toContain("(bergulir.txt bagian D)");
    expect(f2.catatan.adr26).toContain("(bergulir.txt bagian C)");
    expect(f3.catatan.adr26).toContain("10 dari 10 request dijawab 503 (panic.txt bagian D)");
    expect(f3.catatan.polos).toContain("Tidak direkam");
    expect(f4.catatan.polos).toContain("Tidak dijalankan");
    expect(f4.catatan.adr26).toContain("Tidak dijalankan");
    expect(f4.catatan.adr26).toContain("satu VPS tetap titik gagal tunggal");
    expect(f3.nada).toEqual({ adr26: "warn" });
    expect(f1.nada).toEqual({ polos: "warn" });
  });
});

describe("rekaman proxy.txt, panic.txt, bergulir.txt, batas.txt: angka halaman diturunkan dari rekaman", () => {
  test("A sampai G: dua instance bergantian, setiap request kedua gagal, retry, health check saja, health check dan retry, selang 1 detik", () => {
    expect(jumlahA).toEqual([20, 10, 10]);
    expect(urutanC).toHaveLength(20);
    urutanC.forEach((t, i) => expect(t).toBe(i % 2 === 0 ? "200:a" : "502"));
    expect(jumlahC).toEqual([10, 10]);
    expect(getD).toEqual([20, 20]);
    expect(postD).toEqual([6, 6]);
    expect(jumlahE).toEqual([5, 5]);
    expect(jumlahF).toEqual([10, 10]);
    expect(keluarG).toEqual([20, 20]);
    expect(kembaliG).toEqual([20, 10, 10]);
    expect(pB.join("\n")).toContain("ada jawaban 200: ya · ada 502: ya · hanya 200 dan 502: ya");
    expect(pB.join("\n")).toContain("jumlah 502 berbeda tiap run (kebijakan random), jadi angkanya tidak dicatat.");
    expect(pB.join("\n")).toContain("60 request ke proxy");
    harus(`Dengan kedua instance hidup, ${jumlahA[0]} request terbagi ${jumlahA[1]} ke a dan ${jumlahA[2]} ke b:`);
    harus("Dengan kebijakan bawaan `random`, 60 request menghasilkan campuran 200 dan 502, dan jumlah 502 berbeda tiap run, jadi tidak dicatat.");
    harus(`Di rekaman, ${getD[0]} GET dijawab semuanya oleh a, dan ${postD[0]} POST tanpa token menjawab 401 dari a:`);
    harus(`jadi ${jumlahE[1]} dari ${jumlahE[0] + jumlahE[1]} request langsung sesudahnya gagal, dan retry menutupnya:`);
    harus("Dengan selang 1 detik, b dikeluarkan dan masuk lagi sesudah lolos pemeriksaan:");
    // rantai Inti: bagian C dan F
    expect(rantai.baris[0]!.simpul[1]!.teks).toBe(`${jumlahC[1]} dari ${jumlahC[0] + jumlahC[1]} request gagal`);
    expect(rantai.baris[1]!.simpul[1]!.teks).toBe(`0 dari ${jumlahF[0]} request gagal`);
    expect(rantai.baris[0]!.simpul[1]!.nada).toBe("warn");
    expect(rantai.baris[1]!.simpul[1]!.nada).toBe("good");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-instance, proxy.txt bagian C dan F" });
    expect(rantai.baris[1]!.sub).toBe("selang 30 detik, bagian F");
    // Cek diri 2 dan 3 (Inti) memakai angka bagian E dan C
    harus(`Kenapa ${jumlahE[1]} dari ${jumlahE[0] + jumlahE[1]} request tetap gagal sesudah instance mati?`);
    harus(`Dari ${jumlahC[0] + jumlahC[1]} request, berapa yang gagal?`);
    harus(`Di \`proxy.txt\` bagian C, ${jumlahC[1]} dari ${jumlahC[0] + jumlahC[1]} request gagal dengan 502.`);
  });
  test("selang di kode lab: E dan F memakai 30 detik, G, bergulir C dan panic D memakai 1 detik; health check tanpa retry hanya di E dan G", () => {
    const fn = (nama: string): string => {
      const i = runPy.indexOf(`def ${nama}(`);
      expect(i, nama).toBeGreaterThanOrEqual(0);
      const j = runPy.indexOf("\ndef ", i + 5);
      return runPy.slice(i, j < 0 ? undefined : j);
    };
    const kode = fn("rekam_proxy");
    expect(kode).toContain('proxy_mulai("aktif", "30s")');
    expect(kode).toContain('proxy_mulai("aktif-retry", "30s")');
    expect(kode).toContain('proxy_mulai("aktif", "1s")');
    expect(kode).toContain('proxy_mulai("retry")');
    expect(kode).toContain('proxy_mulai("bawaan")');
    expect(fn("rekam_bergulir")).toContain('proxy_mulai("aktif-retry", "1s")');
    expect(fn("rekam_bergulir")).toContain('proxy_mulai("bergilir")');
    expect(fn("rekam_panic")).toContain('proxy_mulai("aktif-retry", "1s")');
    expect([...fn("rekam_panic").matchAll(/proxy_mulai\("([^"]+)"/g)].map((m) => m[1])).toEqual(["aktif-retry", "aktif-retry"]);
    harus("Selang 1 detik adalah pilihan penulis (Asumsi), bukan hasil ukur.");
    expect(compose).toContain('HEALTH_INTERVAL: "${HEALTH_INTERVAL:-30s}"');
    expect(compose).toContain("image: caddy:2.11.7-alpine");
    // Jeda naik 0,5 detik adalah pilihan lab (sleep), bukan hasil ukur
    expect(fn("deploy_satu")).toContain("time.sleep(jeda_naik)");
    expect(fn("rekam_bergulir")).toContain("deploy_satu(lambda nama: None, jeda_naik=0.5)");
    expect(bgD.join("\n")).toContain("pengganti perlu 0,5 detik untuk naik");
    harus("dengan jeda naik 0,5 detik yang dipilih lab dan bukan hasil ukur");
  });
  test("bergulir: Shutdown rapi (200, kode 0), tanpa Shutdown (tanpa jawaban, sinyal 15), C semua 200, D ada 502; kombinasi tanpa Shutdown di belakang proxy tidak direkam", () => {
    const j = bgA.join("\n");
    expect(j).toContain("request lambat → 200 {\"selesai\":true}");
    expect(j).toContain("kode keluar proses: 0");
    expect(j).toContain("koneksi baru ke instance ditolak selagi request lambat masih jalan: ya");
    const k = bgB.join("\n");
    expect(k).toContain("request lambat → tidak ada jawaban");
    expect(k).toContain("kode keluar proses: -15 (dihentikan sinyal 15)");
    expect(k).toContain("log berhenti rapi ada: TIDAK");
    const c = bgC.join("\n");
    expect(c).toContain("semua jawaban GET /healthz 200: ya");
    expect(c).toContain("semua request lambat 200: ya");
    expect(c).toContain("instance yang menjawab: a, a2, b, b2");
    expect(bgD.join("\n")).toContain("ada 502: ya · status yang muncul: [200, 502]");
    expect(bgD.join("\n")).toContain("(Shutdown tetap rapi)");
    harus("Dengan health check dan retry, semua jawaban 200. Tanpa keduanya, ada 502 selama pengganti naik,");
    // negatif berlingkup: tanpa-shutdown dipakai satu kali di run.py, hanya di bagian B, dan bagian B tidak memulai proxy
    expect(runPy.match(/"-rentan", "tanpa-shutdown"/g)).toHaveLength(1);
    const awalB = runPy.indexOf('bagian("B. Mode rentan tanpa-shutdown');
    const awalC = runPy.indexOf('bagian("C. Deploy bergulir');
    expect(awalB).toBeGreaterThan(0);
    expect(awalC).toBeGreaterThan(awalB);
    expect(runPy.slice(awalB, awalC)).not.toContain("proxy_mulai");
    harus("Kombinasi tanpa `Shutdown` di belakang proxy dengan retry tidak direkam, jadi halaman ini tidak mengklaim bahwa retry menutupnya.");
    expect(bergulirTeks).toContain("Tidak dijalankan: POST yang sudah diterima kernel instance lama tetapi belum dibaca saat listener ditutup.");
    expect(proxyTeks).not.toMatch(/POST.*terputus/);
    harus("POST yang sudah diterima instance lalu terputus di tengah tidak direkam, jadi Tidak dijalankan.");
    harus("Retry hanya mengulang GET yang terputus sesudah tersambung.");
    // Temuan lab: versi pertama keluar dari main begitu ListenAndServe kembali (README lab), dan main sekarang menunggu
    expect(readmeLab).toContain("versi pertama keluar dari `main` begitu `ListenAndServe` kembali");
    harus("Versi pertama lab keluar dari `main` begitu `ListenAndServe` kembali, dan itu memutus request yang sedang jalan.");
  });
  test("panic D: satu kematian tertahan, dua tidak, 503 bukan 502; E: versi benar tidak mematikan instance; semua rekaman D memakai proxy aktif-retry", () => {
    const d = pnD.join("\n");
    expect(d).toContain("20 request sesudahnya lewat proxy: 200: 20 · 200 per instance: b 20");
    expect(d).toContain("10 request sesudahnya lewat proxy: 503: 10 (503: tidak ada instance yang sehat)");
    expect(d).toContain("Sari menekan Ekspor lagi: sampai di instance b; b berhenti sendiri (kode keluar 2)");
    expect(pnE.join("\n")).toContain("20 request sesudahnya: 200: 20 · 200 per instance: a 10, b 10");
    expect(panicTeks).toContain("Tidak dijalankan: pengawas proses yang memulai ulang instance sesudah panic (systemd Restart=, restart policy Docker).");
    harus("tombol Ekspor yang ditekan dua kali mematikan kedua instance dan proxy menjawab 503.");
    harus("Sesudah pemeriksaan menandai keduanya, proxy menjawab 503, bukan 502, jadi ia tidak mengirim request ke instance yang sudah ditandai:");
    harus("Dokumentasi Caddy yang dibuka tidak menyebut kode 503 itu.");
    harus("Tombol Ekspor sampai ke a lebih dulu karena lab mengatur putaran, bukan karena pilihan proxy.");
    expect(runPy).toMatch(/sinkron_putaran\(\)\s+# request berikutnya ke a/);
    expect(banding.fitur[2]!.catatan.adr26).toContain("(panic.txt bagian D)");
    harus("Di rekaman, laporan kosong mematikan a, tombol Ekspor ditekan lagi mematikan b, dan proxy menjawab 503 (`panic.txt` bagian D).");
    harus("Pencegahannya panic di goroutine latar dipulihkan (versi benar di bagian A dan E)");
    expect(bagian(panic, "A").join("\n")).toContain("log: latar uji panik: uji panic di goroutine latar (proses tetap hidup)");
  });
  test("batas login: per IP 10 pada satu instance dan 20 dengan round_robin (batas.txt A dan B)", () => {
    expect(ambil(btA, /^24 percobaan → 401: (\d+) · 429: (\d+) /).slice(1).map(Number)).toEqual([20, 4]);
    expect(ambil(btB, /^24 percobaan langsung ke instance a → 401: (\d+) · 429: (\d+)$/).slice(1).map(Number)).toEqual([10, 14]);
    harus("Batas login per IP 10 pada satu instance menjadi 20 dengan round_robin (`batas.txt` bagian A dan B).");
  });
});

describe("kode: /healthz, Shutdown, pool, Caddyfile, dan klaim negatif berlingkup", () => {
  test("/healthz menjawab 200 hanya bila PingContext selesai dalam 1 detik; 503 bila tidak; Shutdown 10 detik dan main menunggu", () => {
    const baris = mainGo.split("\n");
    const hz = baris.slice(Number(RENTANG.healthz.split(":")[0]) - 1, Number(RENTANG.healthz.split(":")[1])).join("\n");
    expect(hz).toContain('rute.HandleFunc("GET /healthz"');
    expect(hz).toContain("context.WithTimeout(req.Context(), time.Second)");
    expect(hz).toContain("db.PingContext(ctx)");
    expect(hz).toContain("http.StatusServiceUnavailable");
    expect(hz).toContain("200 hanya bila database menjawab dalam 1 detik");
    const sd = baris.slice(Number(RENTANG.shutdown.split(":")[0]) - 1, Number(RENTANG.shutdown.split(":")[1])).join("\n");
    expect(sd).toContain("context.WithTimeout(context.Background(), 10*time.Second)");
    expect(sd).toContain("srv.Shutdown(ctx)");
    expect(sd).toContain("signal.Notify(henti2, syscall.SIGTERM, syscall.SIGINT)");
    expect(sd).toContain("if *rentan != rentanTanpaShutdown {");
    expect(sd).toContain("<-shutdownSelesai");
    harus("`api-t3` memasangnya dengan batas 10 detik:");
    harus("menjawab 200 hanya bila database menjawab dalam 1 detik:");
    harus("`PingContext` menunggu koneksi sampai 1 detik lalu `/healthz` menjawab 503");
    harus("Dibaca dari kode, belum direkam:");
    // Go 1.27.3: Shutdown dan ListenAndServe, sumber di RISET
    expect(riset).toContain("Go 1.27.3");
    expect(riset).toContain("Make sure the program doesn't exit and waits instead for Shutdown to return");
    harus("[Go 1.27.3: net/http, kode `server.go`](https://github.com/golang/go/blob/go1.27.3/src/net/http/server.go)");
  });
  test("pool: flag -pool bawaan 10; hitungan koneksi 2 × 10 + 4 + 3 + 3 = 30 dari 100 dan 2 × 50 + 4 + 3 + 3 = 110; naskah dan halaman 3.8 sama", () => {
    expect(mainGo).toMatch(/pool := flag\.Int\("pool", 10, /);
    const [instans, pool, worker, admin, cadangan, maks] = [2, 10, 4, 3, 3, 100];
    expect(instans * pool + worker + admin + cadangan).toBe(30);
    expect(instans * 50 + worker + admin + cadangan).toBe(110);
    expect(110).toBeGreaterThan(maks);
    expect(naskah).toContain("| Koneksi database | instance × pool + worker + admin + reserved | 2 × 10 + 4 + 3 + 3 | 30 dari 100 (R3-35) |");
    expect(kolam).toContain("Worker memakai 4 koneksi dan koneksi admin 3, keduanya Asumsi naskah. Jadi dua instance memakai 2 × 10 + 4 + 3 + 3 = 30 dari 100 koneksi.");
    harus("Worker memakai 4 koneksi dan koneksi admin 3, keduanya Asumsi naskah. Hitungannya instance × pool + worker + admin + cadangan.");
    harus(`Untuk dua instance dengan pool 10, hasilnya ${instans} × ${pool} + ${worker} + ${admin} + ${cadangan} = ${instans * pool + worker + admin + cadangan} dari ${maks} koneksi.`);
    harus(`menghasilkan ${instans} × 50 + ${worker} + ${admin} + ${cadangan} = ${instans * 50 + worker + admin + cadangan} koneksi, di atas ${maks}.`);
    harus("`api-t3` memakai 10 koneksi per proses lewat flag `-pool`.");
    harus("di [[t3-m18]], menghasilkan");
    expect(riset).toContain("max_connections \"The default is typically 100 connections\"");
    const lam = lambdaBayar;
    expect(fmt(lam, 3)).toBe("0,868");
    harus(`dari ±${fmt(10 / lam, 1)} detik ke ±${fmt(50 / lam, 1)} detik di [[t3-m18]]`);
    expect(kolam).toContain(`${fmt(10 / lam, 1)} detik`);
    expect(kolam).toContain(`${fmt(50 / lam, 1)} detik`);
    expect(naskah).toContain("Pool 50 hanya menunda ke 50 ÷ 0,868 = ±57,6 detik");
  });
  test("hitungan celah: puncak 17,36 request per detik × 30 detik = 520,8, separuhnya ±260", () => {
    expect(fmt(puncak, 2)).toBe("17,36");
    expect(fmt(puncak * 30, 1)).toBe("520,8");
    expect(Math.round(gagalCelah)).toBe(260);
    harus(`Pada puncak ${fmt(puncak, 2)} request per detik, selang ${tigaPuluh} detik berarti paling banyak ${fmt(puncak, 2)} × ${tigaPuluh} = ${fmt(puncak * tigaPuluh, 1)} request. Separuhnya, ±${Math.round(gagalCelah)}, jatuh ke instance yang mati.`);
    harus("Itu Hitungan atas Asumsi: beban merata, pembagian separuh, dan b mati tepat sesudah pemeriksaan terakhir.");
    harus("Beban puncak 17,36 request per detik tidak menuntut server kedua");
    expect(naskah).toContain("Kapasitas satu server tetap belum diukur.");
    harus("kapasitas satu server belum diukur, dan load test Tidak dijalankan.");
    expect(baca("situs/src/content/docs/tahap-3/m18-app-membeku.mdx")).toContain("17,36 per detik");
  });
  test("Caddyfile: aktif-retry memuat enam baris, empat di antaranya keputusan ADR, dan nilai yang ditulis halaman; bawaan hanya satu baris reverse_proxy tanpa health check dan retry", () => {
    const blok = caddyAktifRetry.split("\n").filter((b) => /^\t\t[a-z_]+ /.test(b)).map((b) => b.trim());
    expect(blok).toEqual(["lb_policy round_robin", "lb_retries 2", "health_uri /healthz", "health_interval {$HEALTH_INTERVAL}", "health_timeout 1s", "health_status 200"]);
    // Keputusan ADR memakai empat opsi; lb_policy hanya supaya rekaman bisa diulang dan health_status 200 adalah bawaan Caddy (tinjauan, keputusan 1059).
    const keputusan = blok.filter((b) => !b.startsWith("lb_policy") && !b.startsWith("health_status")).map((b) => b.split(" ")[0]!);
    expect([...keputusan].sort()).toEqual(["health_interval", "health_timeout", "health_uri", "lb_retries"]);
    harus("Empat opsi tambahan di Caddyfile (`health_uri`, `health_interval`, `health_timeout`, `lb_retries`), endpoint `/healthz`, dan alert untuk instance yang dikeluarkan");
    harus("tambahkan `health_uri /healthz`, `health_interval`, `health_timeout`, dan `lb_retries 2`, seperti di bagian F.");
    harus("dan memakai `lb_retries 2`.");
    harus("Proxy memanggil `GET /healthz` tiap 1 detik dengan timeout 1 detik");
    const aktif = caddyBawaan.split("\n").filter((b) => b.trim() !== "" && !b.trim().startsWith("#"));
    expect(aktif.filter((b) => b.includes("reverse_proxy"))).toHaveLength(1);
    expect(caddyBawaan).not.toMatch(/health_|lb_|fail_duration/);
    expect(aktif.find((b) => b.includes("reverse_proxy"))).toContain("{$UPSTREAM_A} {$UPSTREAM_B}");
    harus("Caddyfile bawaan hanya berisi satu baris `reverse_proxy`, jadi tidak ada yang memeriksa instance.");
    harus("Pemeriksaan pasif juga mati, karena `fail_duration` bernilai 0 secara bawaan.");
    // lb_policy di lab: round_retry satu-satunya perubahan dari bawaan
    expect(baca("labs/t3-instance/caddy/bergilir.Caddyfile")).toContain("lb_policy round_robin");
    expect(readmeLab).toContain("satu-satunya perubahan dari bawaan");
    harus("Lab memakai `round_robin`, satu-satunya perubahan dari bawaan, supaya jumlah gagalnya tetap dan rekaman bisa diulang.");
  });
  test("klaim negatif berlingkup: lab t3-instance tidak punya pengawas proses, Kubernetes, atau restart policy; opsi B, D, E Tidak dijalankan", () => {
    const berkasLab = [...terlacak].filter((f) => f.startsWith("labs/t3-instance/") && !f.endsWith(".txt"));
    expect(berkasLab.length).toBeGreaterThan(5);
    for (const f of berkasLab) {
      const t = baca(f);
      expect(t, f).not.toMatch(/kubectl|minikube|kind create|\.service\b/i);
    }
    expect(compose).not.toMatch(/^\s+restart:/m);
    expect(berkasLab.some((f) => f.endsWith(".service"))).toBe(false);
    expect(readmeLab).toContain("**Pengawas proses.** Yang memulai ulang instance sesudah panic (systemd `Restart=`, restart policy Docker). Caddy tidak memulai proses. Tidak dijalankan.");
    harus("Caddy tidak memulai proses, dan di lab tidak ada pengawas proses.");
    harus("Opsi B, D, dan E Tidak dijalankan di lab.");
    expect(readmeLab).toContain("Semuanya satu mesin: VPS kedua baru muncul di Tahap 4, jadi satu VPS tetap titik gagal tunggal.");
    harus("Satu VPS tetap titik gagal tunggal.");
    harus("Satu VPS tetap titik gagal tunggal. Ini diterima sengaja");
  });
});

describe("ADR 26: tabel opsi, lima aturan, pre-mortem tiga penyebab, kapan salah, kasus industri, sengaja belum", () => {
  const tabel = badan.slice(badan.indexOf("| | A. Dua instance, proxy bawaan"), badan.indexOf("Opsi B, D, dan E Tidak dijalankan"));
  const baris = tabel.split("\n").filter((l) => l.startsWith("|")).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  test("tabel: header lima opsi, lima baris berlabel, enam sel per baris; kolom C memuat angka rekaman", () => {
    expect(baris).toHaveLength(7);
    expect(baris[0]).toEqual(["", "A. Dua instance, proxy bawaan", "B. Satu instance dengan restart otomatis", "C. Dua instance, health check aktif dan retry", "D. Dua VPS dengan load balancer", "E. Kubernetes"]);
    expect(baris[1]!.every((c) => /^-+$/.test(c))).toBe(true);
    expect(baris.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    for (const r of baris.slice(2)) expect(r).toHaveLength(6);
    const kolom = (n: number) => baris.slice(2).map((r) => r[n]!);
    expect(kolom(3)[1]).toContain(`${jumlahF[1] - jumlahF[0]} dari ${jumlahF[0]} request gagal`);
    expect(kolom(1)[2]).toContain(`${jumlahC[1]} dari ${jumlahC[0] + jumlahC[1]} request gagal`);
    expect(kolom(3)[3]).toContain("Empat opsi tambahan di Caddyfile");
    expect(kolom(3)[4]).toContain("`proxy.txt` D sampai G");
    expect(kolom(1)[4]).toContain("`proxy.txt` B dan C, `bergulir.txt` D");
    expect(kolom(2)[4]).toContain("Tidak dijalankan");
    expect(kolom(4)[4]).toContain("[[t3-adr-33]]");
    expect(kolom(5)[4]).toContain("[[t3-adr-33]]");
    expect(baris.slice(2).every((r) => r.slice(1).every((c) => c.length > 10))).toBe(true);
  });
  test("lima aturan keputusan, lima alasan 'Kenapa C', tiga penyebab pre-mortem, tiga baris sengaja belum; nomor ADR dan label sumber", () => {
    const aturan = [...badan.matchAll(/^(\d)\. (Dua instance `api-t3`|Proxy memanggil|`\/healthz` menjawab|SIGTERM menjalankan|Instance × pool)/gm)].map((m) => m[1]);
    expect(aturan).toEqual(["1", "2", "3", "4", "5"]);
    harus("**Keputusan: opsi C.** Lima aturan, dan tiap aturan punya tugas sendiri:");
    harus("### ADR 26: dua instance di satu VPS, health check aktif, dan retry");
    expect([...badan.matchAll(/^\*\*Kenapa C, bukan ([A-E])\.\*\*/gm)].map((m) => m[1])).toEqual(["A", "B", "D", "E"]);
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    const pm = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pm.matchAll(/^(\d)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    const salah = badan.slice(badan.indexOf("**Kapan keputusan ini salah.**"), badan.indexOf("**Yang akan merevisinya.**"));
    expect(salah).toContain("Pertama, bila VPS mati:");
    expect(salah).toContain("Kedua, bila kematian berulang dari satu bug:");
    expect(salah).toContain("Ketiga, bila instance × pool mendekati `max_connections`:");
    const sb = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf('<Blok nama="Kunci">'));
    expect(sb.split("\n").filter((l) => l.startsWith("|"))).toHaveLength(5);
    harus("**Status:** diterima di minggu 5 Tahap 3, sesudah M21.");
    expect(naskah).toMatch(/\| M21 \| 5 \|/);
    expect(naskah).toContain("| 26 | Dua instance di satu VPS (menjalankan pemicu server kedua ADR 21: PRD meminta deploy tanpa jeda); proxy dengan health check aktif dan retry; graceful shutdown; deploy bergulir.");
    expect(naskah).toContain("Bila VPS mati: kedua instance ikut mati, dijawab Tahap 4. Dua instance menahan satu kematian, bukan satu bug yang bisa dipicu berulang");
    expect(naskah).toContain("Dua instance dengan proxy bawaan (instance mati tetap dipilih acak: tanpa health check aktif dan tanpa retry, R3-13); satu instance dengan restart otomatis; dua VPS dengan load balancer; Kubernetes");
    // PROPOSAL menaruh Kubernetes di Tahap 5 (k3s di VPS), bukan di Tahap 4 (cloud managed dan IaC): tinjauan 3.15, keputusan 1059.
    expect(proposal).toMatch(/^\| 5 \| Kubernetes \(dimulai dari k3s di VPS/m);
    expect(proposal.split("\n").filter((l) => /^\| 4 \| /.test(l) && /kubernetes|k8s|k3s/i.test(l))).toEqual([]);
    expect(riset).toContain("PROPOSAL menaruhnya di Tahap 5 | R3-13 |");
    harus("PROPOSAL menaruhnya di Tahap 5.");
    expect(badan).not.toMatch(/Tahap 4 sampai 5/);
    harus("tim empat orang");
    expect(naskah).toContain("Empat engineer, tiga peran");
    expect(cerita.tahap[2]!.asumsi.tim).toBe("4 developer");
  });
  test("kasus industri Kamal Proxy dan kutipan Amazon Builders' Library: nilai bawaan dari sumber yang dicatat di RISET, batas ditulis", () => {
    expect(riset).toContain("DefaultDeployTimeout 30 detik, DefaultDrainTimeout 30 detik, DefaultHealthCheckInterval 1 detik");
    expect(riset).toContain("By default, Kamal Proxy will test the health of each service by sending a GET request to /up, once per second. A 200 response is considered healthy");
    expect(riset).toContain("Kamal 2.12.0 dirilis 2026-06-18");
    harus("Ia menguji tiap instance dengan `GET /up` sekali per detik dan menganggap 200 sehat.");
    harus("Batas deploy dan batas pengurasan bawaannya masing-masing 30 detik di kode sumber");
    harus("Kamal 2.12.0 dirilis 2026-06-18.");
    harus("README tidak memuat angka ketersediaan, tidak menyebut berapa kontainer aplikasi per host, dan tidak membahas proses yang mati di tengah hari.");
    expect(riset).toContain("Published Dec 5, 2019");
    harus("terbit 2019-12-05");
    expect(riset).toContain("when all servers fail health checks at the same time, the load balancer fails open, allowing traffic to all servers");
    expect(riset).toContain("a dependency can cause a cascading failure throughout a system");
    expect(riset).toContain("health check tidak memeriksa database");
    harus("2024-12-31");
  });
});

describe("sumber dan versi: baris RISET, halaman istilah, tab stack, tabel proxy lain", () => {
  const barisRiset = (id: string): string => {
    const m = riset.split("\n").filter((l) => l.startsWith(`| ${id} |`));
    expect(m, id).toHaveLength(1);
    return m[0]!;
  };
  test("R3-170 sampai R3-174: tepat sekali, urut naik, tanggal akses 2026-10-26, versi sama dengan halaman", () => {
    const semuaId = [...riset.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(semuaId).size).toBe(semuaId.length);
    const angka = semuaId.map((x) => Number(x.slice(3)));
    expect(angka.slice(angka.indexOf(170))).toEqual([170, 171, 172, 173, 174]);
    for (const id of ["R3-170", "R3-171", "R3-172", "R3-173", "R3-174"]) expect(barisRiset(id)).toMatch(/2026-10-26/);
    expect(barisRiset("R3-170")).toContain("v2.11.7 rilis terbaru, 2026-10-03");
    expect(barisRiset("R3-170")).toContain("health_interval bawaan 30s; health_timeout bawaan 5s");
    expect(barisRiset("R3-171")).toContain("stable 1.30.6");
    expect(barisRiset("R3-171")).toContain("v3.7.16, 2026-10-20");
    expect(barisRiset("R3-172")).toContain("systemd 262");
    expect(barisRiset("R3-172")).toContain("DefaultStartLimitIntervalSec 10s dan DefaultStartLimitBurst 5");
    expect(barisRiset("R3-174")).toContain("Node.js v26.12.1");
    expect(barisRiset("R3-174")).toContain("laravel/framework 13.38.0");
    expect(barisRiset("R3-174")).toContain("serverpod 4.0.4");
    harus("nginx 1.30.6 stable");
    harus("Traefik v3.7");
    harus("systemd 262");
    harus("[Node.js v26.12.1: cluster]");
    harus("[Serverpod: Health checks](https://docs.serverpod.dev/concepts/operations/health-checks) (dokumentasi bertanda 4.0.0; Serverpod 4.0.4)");
    harus("[Caddy 2.11.7: reverse_proxy]");
    harus("Kamal 2.12.0");
    expect(istilah.sumber!.map((s) => ("riset" in s ? s.riset : null))).toEqual(["R3-170", "R3-170", "R3-173", "R3-173", "R3-174"]);
    for (const s of istilah.sumber!) expect(riset).toContain(`${s.riset} `);
  });
  test("tab stack: enam tab, label Go dijalankan dan lima lain Tidak dijalankan dengan tanggal 2026-10-26; slot t0 sampai t5 urut", () => {
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...badan.matchAll(/<Fragment slot="t(\d)">/g)].map((m) => m[1])).toEqual(["0", "1", "2", "3", "4", "5"]);
    const tab = badan.slice(badan.indexOf("<TabSet"), badan.indexOf("</TabSet>"));
    const potong = tab.split(/<Fragment slot="t\d">/).slice(1);
    expect(potong).toHaveLength(6);
    expect(potong[0]).toContain("*Dijalankan: lab t3-instance, Caddy 2.11.7, PostgreSQL 17.11");
    for (const p of potong.slice(1)) {
      expect(p).toContain("*Tidak dijalankan.");
      expect(p).toContain("dibuka 2026-10-26");
      expect(p).toContain("**Yang berbeda di stack ini:**");
    }
    expect(proxy.join("\n")).toContain("PostgreSQL 17.11");
    expect(proxy.join("\n")).toContain("Caddy 2.11.7");
    expect(potong[1]).toContain("Halaman itu tidak memuat kata health.");
    expect(potong[3]).toContain("`graceful_timeout`, bawaan 30 detik");
    expect(potong[4]).toContain("Dokumentasi menulis bahwa liveness sengaja permisif.");
    expect(potong[5]).toContain("`pg_isready` tiap 5 detik");
    expect(potong[0]).toContain("pengawas proses Tidak dijalankan");
  });
  test("tabel Proxy dan pengawas lain: empat baris, nilai bawaan sama dengan RISET; semuanya Tidak dijalankan", () => {
    const t = badan.slice(badan.indexOf("| Alat | Kegagalan dan retry"), badan.indexOf("Sumbernya [nginx upstream]"));
    const r = t.split("\n").filter((l) => l.startsWith("|")).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
    expect(r.map((x) => x[0])).toEqual(["Alat", "---", "nginx 1.30.6 stable", "Traefik v3.7", "Docker", "systemd 262"]);
    for (const x of r) expect(x).toHaveLength(3);
    expect(r[2]![1]).toContain("`max_fails` 1 dan `fail_timeout` 10 detik");
    expect(r[3]![1]).toContain("`interval` 30 detik dan `timeout` 5 detik");
    expect(r[5]![2]).toContain("`RestartSec=` bawaan 100 ms, dan batas start bawaan 5 kali dalam 10 detik");
    expect(r[4]![2]).toContain("sedikitnya 10 detik");
    harus("Semuanya Tidak dijalankan di lab ini.");
    const sumber = badan.slice(badan.indexOf("Sumbernya [nginx upstream]"), badan.indexOf("Caddy tidak memulai proses"));
    expect([...sumber.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1])).toEqual([
      "https://nginx.org/en/docs/http/ngx_http_upstream_module.html",
      "https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_next_upstream",
      "https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html",
      "https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/",
      "https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/retry/",
      "https://docs.docker.com/engine/containers/start-containers-automatically/",
      "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html",
      "https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html",
    ]);
    expect(sumber).toContain("semuanya dibuka 2026-10-26");
  });
  test("halaman istilah health-check: stack enam, label Rekaman lab hanya Go, rujukan ada di registry, istilah terkait ada di glosarium", () => {
    expect(istilah.istilah).toBe("Health check");
    const s = istilah.stack as Record<string, { label: string }>;
    expect(Object.keys(s)).toEqual(["go", "node", "laravel", "django", "serverpod", "supabase"]);
    expect(Object.entries(s).filter(([, v]) => v.label === "Rekaman lab").map(([k]) => k)).toEqual(["go"]);
    for (const t of istilah.terkait!) expect(glosarium, t).toContain(`| **${t}**`);
    expect(istilahTeks).toContain("5 dari 10 request sesudah instance b mati tetap gagal");
    expect(`${jumlahE[1]} dari ${jumlahE[0] + jumlahE[1]}`).toBe("5 dari 10");
    expect(istilah.cerita![0]!.teks).toContain("Dengan retry, semuanya dijawab 200.");
  });
  test("tidak ada ID riset, nomor keputusan, atau label rekaman internal di teks pembaca (halaman, widget, istilah kecuali field riset, Snippet)", () => {
    const pola = /\bR\d-\d{2,3}\b|keputusan \d+|\bPR \d+|#\d{3}\b|\b[A-G]\d{1,2}\b/;
    const teksIstilah = JSON.stringify({ ...JSON.parse(istilahTeks), sumber: JSON.parse(istilahTeks).sumber.map((x: Record<string, unknown>) => ({ ...x, riset: undefined })) });
    for (const t of [badan, JSON.stringify(diagramMentah), JSON.stringify(tebakMentah), bandingTeks, teksIstilah]) expect(t).not.toMatch(pola);
    const kode = mdx.match(/<Snippet[^>]*\/>/g) ?? [];
    expect(kode.length).toBeGreaterThan(10);
    for (const [berkas, r] of SNIPPET_DIHARAPKAN) {
      const [a, b] = r.split(":").map(Number) as [number, number];
      const isi = baca(berkas).split("\n").slice(a - 1, b).join("\n");
      expect(isi, `${berkas}:${r}`).not.toMatch(/keputusan \d+|\bR\d-\d{2,3}\b/);
    }
    expect(badan).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(badan).not.toMatch(/\bAnda\b|\bkita\b/i);
    expect(badan).not.toMatch(/\d B\b|\bB\d/);
  });
  test("Snippet: rentang baris dan file sama dengan yang diturunkan dari isi rekaman dan kode, urut seperti di halaman", () => {
    const ditemukan: [string, string][] = [];
    for (const m of mdx.matchAll(/<Snippet\s+([^>]*?)\/>/g)) {
      const a = m[1]!;
      const file = a.match(/file="([^"]+)"/);
      const lines = a.match(/lines="([^"]+)"/);
      const files = a.match(/files=\{\[([^\]]+)\]\}/);
      if (file && lines) ditemukan.push([file[1]!, lines[1]!]);
      else if (files) {
        for (const f of [...files[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!)) {
          const mm = f.match(/^(.*?):(\d+):(\d+)$/)!;
          ditemukan.push([mm[1]!, `${mm[2]}:${mm[3]}`]);
        }
      }
    }
    // Rekaman yang digabung dari dua rentang dipecah di atas; gabungkan kembali dengan urutan rentang untuk dibandingkan.
    const teksDiharapkan = SNIPPET_DIHARAPKAN.map(([f, r]) => `${f} ${r}`).sort();
    const teksDitemukan = ditemukan.map(([f, r]) => `${f} ${r}`).sort();
    // Satu Snippet halaman memakai E dan F sekaligus, dan satu memakai A dan B bergulir, jadi urutan dan himpunan sama setelah dipecah.
    expect(teksDitemukan).toEqual(teksDiharapkan);
    harus('title="Rekaman lab: labs/t3-instance/output/proxy.txt"');
    harus('<Snippet file="labs/api-t3/cmd/api/main.go" lines="173:184" lang="go" title="labs/api-t3/cmd/api/main.go" />');
    harus('<Snippet file="labs/api-t3/cmd/api/main.go" lines="216:243" lang="go" title="labs/api-t3/cmd/api/main.go" />');
    expect(RENTANG.healthz).toBe("173:184");
    expect(RENTANG.shutdown).toBe("216:243");
    expect(RENTANG.caddy).toBe("3:16");
  });
});

describe("tinjauan 3.15 (keputusan 1059): lingkup klaim, label widget, dan peringatan bahasa", () => {
  const fungsiRun = (nama: string): string => {
    const i = runPy.indexOf(`def ${nama}(`);
    expect(i, nama).toBeGreaterThanOrEqual(0);
    const j = runPy.indexOf("\ndef ", i + 5);
    return runPy.slice(i, j < 0 ? undefined : j);
  };
  test("fail open berlingkup: sebagian load balancer AWS, bukan semua, dan bukan Caddy", () => {
    harus("Tulisan itu juga menyebut pengamannya: sebagian load balancer, mis. AWS Network Load Balancer, membuka lalu lintas ke semua server bila tidak ada yang lolos pemeriksaan (fail open).");
    expect(badan).not.toMatch(/Load balancer yang melihat semua server gagal/);
    expect(istilahTeks).toContain("sebagian load balancer, mis. AWS Network Load Balancer, membuka lalu lintas ke semua server bila tidak ada yang lolos pemeriksaan (fail open).");
    expect(istilahTeks).not.toMatch(/load balancer yang melihat semua server gagal/i);
    const r173 = riset.split("\n").find((l) => l.startsWith("| R3-173 |"))!;
    expect(r173).toContain("Some load balancers can act as a smart central authority");
    expect(r173).toContain("AWS Network Load Balancer, Application Load Balancer, Route 53");
    // Caddy tidak fail open: bila semua instance ditandai gagal, jawabannya 503 dan bukan 502 dari instance yang dicoba.
    expect(pnD.join("\n")).toContain("503: tidak ada instance yang sehat");
    expect(pnD.join("\n")).not.toContain("502");
  });
  test("deploy bergulir: yang diukur hanya GET (/healthz dan /lab/lambat); klaim 'tanpa jawaban selain 200' berlingkup GET", () => {
    const beban = fungsiRun("beban");
    expect(beban).toContain('minta("GET", "/healthz", PORT_PROXY');
    expect(beban).toContain('minta("GET", "/lab/lambat?ms=300", PORT_PROXY');
    expect(beban).not.toMatch(/POST|PUT|PATCH|DELETE/);
    expect(fungsiRun("rekam_bergulir")).not.toContain('"POST"');
    expect(badan.match(/pada GET yang diukur/g)).toHaveLength(2);
    harus("tanpa satu pun jawaban selain 200 pada GET yang diukur, tetapi menjawab 503 saat kedua instance mati.");
    expect(badan).not.toMatch(/Deploy bergulir tanpa jawaban selain 200 \|/);
  });
  test("widget banding memakai huruf opsi yang sama dengan tabel ADR; simpul instance tidak menulis keadaan yang berubah antar kejadian", () => {
    expect(banding.opsi.map((o) => o.nama)).toEqual(["A · Proxy tanpa pengaman (round_robin)", "C · ADR 26: health check aktif dan retry"]);
    const kepala = badan.split("\n").find((l) => l.startsWith("| | A. Dua instance, proxy bawaan"))!.split("|").slice(1, -1).map((c) => c.trim());
    expect(kepala[1]).toMatch(/^A\. /);
    expect(kepala[3]).toMatch(/^C\. /);
    expect(banding.opsi.map((o) => o.nama[0])).toEqual([kepala[1]![0], kepala[3]![0]]);
    harus("Opsi C melewati penggantian a dan b");
    expect(badan).not.toMatch(/Opsi B melewati/);
    // Simpul dipakai di empat kejadian: "hidup" atau "mati" tetap di simpul salah di tiga kejadian (kedua instance mati, VPS mati, deploy bergulir).
    const instance = banding.opsi.flatMap((o) => o.baris.flat()).filter((n) => /^Instance [ab]$/.test(n.label));
    expect(instance).toHaveLength(4);
    for (const n of instance) expect(n.sub, n.id).toBe("proses api-t3");
    expect(bandingTeks).not.toMatch(/"sub": "(hidup|mati)"/);
    harus("Rekaman lab mendukung tiga kejadian pertama, kecuali sisi tanpa pengaman pada Kedua instance mati, yang tidak direkam.");
    expect(banding.fitur[2]!.catatan.polos).toContain("Tidak direkam");
  });
  test("systemd on-failure: sinyal bersih dikecualikan seperti di dokumentasi, dan baris riset memuatnya", () => {
    harus("dihentikan sinyal selain SIGHUP, SIGINT, SIGTERM, dan SIGPIPE, atau kena timeout.");
    expect(riset.split("\n").find((l) => l.startsWith("| R3-172 |"))!).toContain("dihentikan sinyal selain SIGHUP, SIGINT, SIGTERM, dan SIGPIPE (keluar bersih)");
  });
  test("audit bahasa: 0 error dan 0 peringatan (paragraf paling banyak 4 kalimat, kalimat paling banyak 25 kata)", () => {
    const keluar = execFileSync("python3", ["tools/audit_bahasa.py", "--check", HALAMAN], { cwd: akar, encoding: "utf8" });
    expect(keluar).toMatch(/0 error · 0 peringatan/);
  });
  test("janji ke halaman yang belum ada: 3.27 menerima alert request menunggu koneksi dari naskah; alert instance dikeluarkan belum ada di naskah 3.27 (catatan ke pengatur)", () => {
    harus("Alert untuk request yang menunggu koneksi ([[t3-tim-infra]])");
    expect(naskah).toContain("request yang menunggu koneksi");
    harus("Alert untuk instance yang dikeluarkan ada di [[t3-tim-infra]].");
    expect(naskah.slice(naskah.indexOf("Isi halaman 3.27"))).not.toMatch(/instance yang dikeluarkan/);
  });
});

describe("penjaga tambahan tinjauan 3.15 (keputusan 1059): kunci yang tidak bergantung pada snapshot", () => {
  const risetBaris = (id: string): string => riset.split("\n").find((l) => l.startsWith(`| ${id} |`))!;
  test("bawaan Caddy diturunkan dari baris riset dan compose, bukan ditulis ulang", () => {
    const r170 = risetBaris("R3-170");
    const sel = r170.match(/health_interval bawaan (\d+)s; health_timeout bawaan (\d+)s/);
    expect(sel, "R3-170 memuat selang dan timeout bawaan").not.toBeNull();
    harus(`Bawaan selangnya ${sel![1]} detik dan timeout-nya ${sel![2]} detik.`);
    expect(compose).toContain(`HEALTH_INTERVAL: "\${HEALTH_INTERVAL:-${sel![1]}s}"`);
    const pol = r170.match(/lb_policy bawaan `(\w+)`/);
    expect(pol, "R3-170 memuat kebijakan bawaan").not.toBeNull();
    harus(`yang bawaannya \`${pol![1]}\``);
    expect(caddyBawaan).toContain("kebijakan random");
    harus("Instance yang gagal dikeluarkan dari pilihan sampai pemeriksaan berikutnya lolos.");
    harus("menganggapnya sehat bila status 200.");
    expect(r170).toContain("health_status bawaan 200");
  });
  test("hitungan koneksi dan slot superuser diturunkan dari baris naskah dan rekaman, bukan dari konstanta di tes", () => {
    const m = naskah.match(/\| Koneksi database \| instance × pool \+ worker \+ admin \+ reserved \| (\d+) × (\d+) \+ (\d+) \+ (\d+) \+ (\d+) \|/);
    expect(m, "baris naskah koneksi database").not.toBeNull();
    const [, inst, pool, worker, admin, reserved] = m!.map(Number) as [number, number, number, number, number, number];
    harus(`menyisihkan ${reserved} slot untuk superuser`);
    harus(`Worker memakai ${worker} koneksi dan koneksi admin ${admin}`);
    harus(`Untuk dua instance dengan pool ${pool}, hasilnya ${inst} × ${pool} + ${worker} + ${admin} + ${reserved}`);
    expect(inst).toBe(2);
    const sinyal = ambil(bgB, /\(dihentikan sinyal (\d+)\)/)[1];
    harus(`karena sinyal ${sinyal} (\`bergulir.txt\` bagian B)`);
    expect(ambil(bgB, /^ {2}kode keluar proses: (-?\d+)/)[1]).toBe(`-${sinyal}`);
  });
  test("negasi dan kata pembatas dihitung: satu 'tidak' atau 'bukan' yang ditambah atau dibuang mengubah arti kalimat", () => {
    const hitung = (kata: string): number => (badan.match(new RegExp(`\\b${kata}\\b`, "gi")) ?? []).length;
    expect({ tidak: hitung("tidak"), bukan: hitung("bukan"), belum: hitung("belum"), hanya: hitung("hanya"), semua: hitung("semua"), setiap: hitung("setiap"), selalu: hitung("selalu"), tanpa: hitung("tanpa"), kecuali: hitung("kecuali"), sebagian: hitung("sebagian") })
      .toEqual({ tidak: 82, bukan: 18, belum: 7, hanya: 13, semua: 8, setiap: 6, selalu: 2, tanpa: 26, kecuali: 4, sebagian: 2 });
  });
  test("heading, summary, dan jumlah pertanyaan Cek 3; tidak ada komentar HTML yang menyembunyikan noscript", () => {
    expect([...badan.matchAll(/^(#{2,6}) (.+)$/gm)].map((x) => `${x[1]!.length} ${x[2]}`)).toEqual([
      "2 Inti", "3 Kenapa ini ada", "3 Cara kerjanya", "3 Di stack lain", "3 ADR 26: dua instance di satu VPS, health check aktif, dan retry", "3 Sengaja belum dilakukan", "3 Cek diri", "3 Saat me-review kode AI, cek ini", "3 Bacaan lanjut",
    ]);
    expect([...badan.matchAll(/<summary>(.+?)<\/summary>/g)].map((x) => x[1])).toEqual(["Sudah tahu? Cek 3 pertanyaan", "Jawaban", "Jawaban", "Jawaban", "Jawaban"]);
    const cek = badan.slice(badan.indexOf('<details class="question">'), badan.indexOf("</details>"));
    const jumlahTanya = (cek.match(/^\d+\. /gm) ?? []).length;
    expect(`Cek ${jumlahTanya} pertanyaan`).toBe(badan.match(/Cek (\d+) pertanyaan/)![0]);
    expect(badan).not.toContain("<!--");
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(2);
    expect((badan.match(/<\/noscript>/g) ?? []).length).toBe(2);
  });
  test("judul Snippet dan tanggal akses: judul sama dengan berkas (rekaman diawali 'Rekaman lab: '), semua tanggal 'dibuka' sama dengan tanggal akses riset", () => {
    for (const m of mdx.matchAll(/<Snippet\s+([^>]*?)\/>/g)) {
      const a = m[1]!;
      const file = a.match(/file="([^"]+)"/)?.[1] ?? a.match(/files=\{\["([^":]+)/)![1]!;
      const judul = a.match(/title="([^"]+)"/)![1]!;
      expect(judul, a).toBe(file.includes("/output/") ? `Rekaman lab: ${file}` : file);
    }
    const tanggal = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((x) => x[1]);
    expect(tanggal).toHaveLength(13);
    expect([...new Set(tanggal)]).toEqual(["2026-10-26"]);
    for (const id of ["R3-170", "R3-171", "R3-172", "R3-173", "R3-174"]) expect(risetBaris(id)).toMatch(/(dibuka|dibaca mentah) 2026-10-26/);
    expect(risetBaris("R3-173")).toContain("Published Dec 5, 2019");
    harus("terbit 2019-12-05, dibuka 2026-10-26");
    harus("2024-12-31, dibuka 2026-10-26");
  });
  test("judul Rantai Inti paling banyak 47 karakter: lebih panjang menjadi dua baris di 375 px dan layar pertama HP tinggal 12 px (layar.mjs hanya menandai 'tipis', tidak gagal)", () => {
    expect(rantai.judul.length).toBeLessThanOrEqual(47);
    expect(rantai.judul).toBe("Satu instance mati, tanpa dan dengan pengaman");
  });
  test("tautan [[id]] per kalimat: jumlah pemakaian tiap id, kalimat janji ke 3.16, 3.18, dan 3.27", () => {
    const hitung: Record<string, number> = {};
    for (const x of badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) hitung[x[1]!] = (hitung[x[1]!] ?? 0) + 1;
    expect(hitung).toEqual({ berikutnya: 1, "t2-adr-21": 2, "t2-idempotency": 1, "t2-skema-tanpa-downtime": 1, "t3-adr-33": 7, "t3-jembatan": 1, "t3-m18": 3, "t3-m21": 4, "t3-m22": 2, "t3-m23": 2, "t3-pool": 1, "t3-rate-limit-redis": 1, "t3-tim-infra": 3, "t3-prd": 1 });
    harus("dan dibahas di [[t3-m22]] dan [[t3-m23]].");
    harus("ADR 27 memindahkan batas login ke Redis ([[t3-rate-limit-redis]])");
    harus("jadi pool tidak dinaikkan untuk menambal masalah lain ([[t3-pool]])");
    harus("Pool 50 per instance, yang diusulkan Raka di [[t3-m18]]");
    harus("Satu VPS tetap titik gagal tunggal. Ini diterima sengaja dan dijawab di [[t3-jembatan]] dan [[t3-adr-33]].");
  });
  test("URL di halaman: daftar tertutup (33 tautan, urutan tetap), tiap host ada di RISET kecuali dua yang disebutkan", () => {
    const urls = [...badan.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((x) => x[1]!);
    expect(urls).toEqual([
      "https://caddyserver.com/docs/caddyfile/directives/reverse_proxy",
      "https://blog.val.town/blog/post-mortem-exhausted-host-connection-pool/",
      "https://builder.aws.com/content/3Ev53O39izHCtWLzp4XU6t8PC1O/implementing-health-checks",
      "https://nginx.org/en/docs/http/ngx_http_upstream_module.html",
      "https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_next_upstream",
      "https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html",
      "https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/",
      "https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/retry/",
      "https://docs.docker.com/engine/containers/start-containers-automatically/",
      "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html",
      "https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html",
      "https://github.com/golang/go/blob/go1.27.3/src/net/http/server.go",
      "https://www.postgresql.org/docs/17/runtime-config-connection.html",
      "https://nodejs.org/docs/latest/api/cluster.html",
      "https://laravel.com/docs/13.x/deployment",
      "https://gunicorn.org/design/",
      "https://gunicorn.org/signals/",
      "https://gunicorn.org/reference/settings/",
      "https://docs.djangoproject.com/en/6.1/howto/deployment/",
      "https://docs.serverpod.dev/concepts/operations/health-checks",
      "https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml",
      "https://github.com/basecamp/kamal-proxy",
      "https://github.com/basecamp/kamal-proxy/blob/main/internal/server/service.go",
      "https://caddyserver.com/docs/caddyfile/directives/reverse_proxy",
      "https://pkg.go.dev/net/http#Server.Shutdown",
      "https://www.postgresql.org/docs/17/runtime-config-connection.html",
      "https://github.com/basecamp/kamal-proxy",
      "https://kamal-deploy.org/",
      "https://builder.aws.com/content/3Ev53O39izHCtWLzp4XU6t8PC1O/implementing-health-checks",
      "https://nginx.org/en/docs/http/ngx_http_upstream_module.html",
      "https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/retry/",
      "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html",
      "https://docs.docker.com/engine/containers/start-containers-automatically/",
    ]);
    const tanpaRiset = new Set(["kamal-deploy.org"]);
    for (const u of urls) {
      const host = new URL(u).hostname.replace(/^www\./, "");
      if (tanpaRiset.has(host)) continue;
      expect(riset, host).toContain(host);
    }
  });
  test("tabel ADR per sel: frasa kunci tiap kolom dan baris; bukti B, D, E Tidak dijalankan; Sengaja belum per sel", () => {
    const tabelAdr = badan.slice(badan.indexOf("| | A. Dua instance, proxy bawaan"), badan.indexOf("Opsi B, D, dan E Tidak dijalankan")).split("\n").filter((l) => l.startsWith("|")).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
    const kunci: Record<string, string[]> = {
      "Cara kerja": ["Caddy hanya `reverse_proxy` ke a dan b", "Satu proses. Pengawas proses", "Proxy memanggil `/healthz` tiap selang", "Dua mesin dengan satu instance per mesin", "Orkestrator menjalankan, memeriksa"],
      Kelebihan: ["Tanpa konfigurasi tambahan", "rate limit dan cache di memori tetap benar", "Satu kematian tertahan: 0 dari 10 request gagal", "Menahan kematian satu mesin", "Health check, rolling update, dan restart sudah ada"],
      Kekurangan: ["Instance mati tetap dipilih: 10 dari 20 request gagal", "tidak ada instance yang menjawab (penalaran)", "Satu VPS mati berarti kedua instance mati", "Biaya mesin kedua", "Biaya operasional besar untuk tim empat orang"],
      "Biaya operasional": ["Satu baris `reverse_proxy`", "Satu unit pengawas proses", "Empat opsi tambahan di Caddyfile", "Dua mesin, jaringan, dan deploy ke dua tempat", "Cluster, manifest, dan upgrade cluster"],
      Bukti: ["Rekaman `proxy.txt` B dan C, `bergulir.txt` D", "Tidak dijalankan: dokumentasi Docker dan systemd", "Rekaman `proxy.txt` D sampai G, `bergulir.txt` A sampai C, `panic.txt` D", "Tidak dijalankan: [[t3-adr-33]]", "Tidak dijalankan: [[t3-adr-33]]"],
    };
    for (const r of tabelAdr.slice(2)) {
      const frasa = kunci[r[0]!];
      expect(frasa, r[0]).toBeDefined();
      frasa!.forEach((f, i) => expect(r[i + 1], `${r[0]} kolom ${i + 1}`).toContain(f));
    }
    const sb = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf('<Blok nama="Kunci">')).split("\n").filter((l) => l.startsWith("|")).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
    expect(sb.slice(2).map((r) => r[0])).toEqual(["VPS kedua dan load balancer", "Kubernetes dan canary", "Health check liveness dan readiness terpisah"]);
    expect(sb.slice(2).map((r) => r[2])).toEqual(["[[t3-adr-33]]", "[[t3-adr-33]]", "Belum dijadwalkan di naskah"]);
    expect(sb[2]![1]).toContain("17,36 request per detik tidak menuntut kapasitas");
    expect(sb[3]![1]).toContain("empat engineer");
    expect(sb[4]![1]).toContain("database yang lambat mengeluarkan kedua instance");
    expect(naskah).toContain("| 33 | Sengaja belum: microservices, Kubernetes dan canary, read replica, PgBouncer, CDC, VPS kedua,");
    expect(naskah).not.toMatch(/liveness|readiness/i);
  });
  test("widget banding: simpul yang tersorot per kejadian dikunci; kejadian 'Kedua instance mati' menyorot kedua instance, 'Satu instance mati' menyorot retry", () => {
    expect(banding.fitur.map((f) => f.sorot)).toEqual([
      { polos: ["a-proxy", "a-ib"], adr26: ["b-proxy", "b-retry", "b-ia"] },
      { polos: ["a-proxy", "a-ia"], adr26: ["b-proxy", "b-cek", "b-ia"] },
      { polos: ["a-proxy", "a-ia", "a-ib"], adr26: ["b-proxy", "b-cek", "b-ia", "b-ib"] },
      { polos: ["a-proxy", "a-ia", "a-ib"], adr26: ["b-proxy", "b-ia", "b-ib"] },
    ]);
    expect(banding.fitur.map((f) => f.nada)).toEqual([{ polos: "warn" }, { polos: "warn" }, { adr26: "warn" }, { polos: "warn", adr26: "warn" }]);
  });
  test("halaman istilah: url sumber dikunci dan host-nya ada di riset; tab Go memuat nomor versi lab", () => {
    expect(istilah.sumber!.map((x) => ("url" in x ? x.url : null))).toEqual([
      "https://caddyserver.com/docs/caddyfile/directives/reverse_proxy",
      null,
      "https://builder.aws.com/content/3Ev53O39izHCtWLzp4XU6t8PC1O/implementing-health-checks",
      "https://blog.val.town/blog/post-mortem-exhausted-host-connection-pool/",
      "https://docs.serverpod.dev/concepts/operations/health-checks",
    ]);
    for (const x of istilah.sumber!) if ("url" in x) expect(riset).toContain(new URL(x.url as string).hostname);
    expect((istilah.stack as Record<string, { versi?: string }>).go!.versi).toBe("Caddy 2.11.7, PostgreSQL 17.11, go.mod Go 1.27.1");
    expect(mainGo.length).toBeGreaterThan(0);
    expect(baca("labs/api-t3/go.mod")).toMatch(/^go 1\.27\.1$/m);
  });
});

describe("kunci teks: seluruh halaman dan seluruh data widget dikunci utuh lewat snapshot", () => {
  test("badan halaman, data widget, halaman istilah, dan baris RISET milik 3.15", async () => {
    await expect(mdx).toMatchFileSnapshot("./__teks__/dua-instance.mdx.txt");
    await expect(JSON.stringify([diagramMentah, tebakMentah, banding], null, 1)).toMatchFileSnapshot("./__teks__/dua-instance-widget.json.txt");
    await expect(istilahTeks).toMatchFileSnapshot("./__teks__/dua-instance-istilah.json.txt");
    const barisBaru = riset.split("\n").filter((l) => /^\| R3-17[0-4] \|/.test(l)).join("\n");
    await expect(barisBaru).toMatchFileSnapshot("./__teks__/dua-instance-riset.txt");
  });
});
