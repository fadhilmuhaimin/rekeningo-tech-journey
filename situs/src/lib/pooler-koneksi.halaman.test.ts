// Penjaga halaman 5.17 (keputusan 1564 sampai 1566): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, kalkulator, tebakan, baris riset, dan kartu Cek diri di
// pooler-koneksi.mdx diturunkan dari rekaman labs/api-t5 (pooler.txt), kode lab (cmd/pooler, cmd/api, internal/repo), konfigurasi
// PgBouncer lab, README lab, naskah Tahap 5, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 5.12): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (berkas nilai) mengunci SETIAP baris badan
// halaman; KUNCI_LITERAL (berkas kunci, dirawat dengan tangan) mengunci kalimat kunci walau berkas nilai dibangkitkan ulang dari halaman
// termutasi; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap SALAHNYA kalimat; elemen
// non-prosa dikunci dengan sidik jari; tabel Hitungan dihitung ulang dengan pembulatan setengah ke atas. Baris riset dikunci dengan
// rentang naik (R5-190 sampai R5-194 naik), bukan dengan tetangga.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-pooler-inti.json";
import kalkulatorMentah from "../../data/widget/t5-pooler-kalkulator.json";
import { DataRantai } from "./rantai";
import { DataKoneksi } from "../widgets/koneksi-pooler/skema";
import { hitung, kesimpulan, siapkan, titik } from "../widgets/koneksi-pooler/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./pooler-koneksi.halaman.nilai";
import { DATA_LITERAL, KUNCI_LITERAL, POLA_TOKEN, RISET_TOKEN } from "./pooler-koneksi.halaman.kunci";

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
// Lapis pertahanan yang bisa dimatikan untuk uji mutasi: tanpa kunci baris (TANPA_KUNCI=1), tanpa sidik jari (TANPA_SIDIK=1), tanpa kunci literal (TANPA_LITERAL=1).
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const tanpaLiteral = process.env.TANPA_LITERAL === "1";

const BERKAS = "situs/src/content/docs/tahap-5/pooler-koneksi.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const diagram = DataRantai.parse(diagramMentah);
const kalk = DataKoneksi.parse(kalkulatorMentah);
const skenarioHasil = siapkan(kalk).map(hitung);
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const pooler = baca("labs/api-t5/output/pooler.txt");
const ini = baca("labs/api-t5/pgbouncer/pgbouncer.ini");
const dockerfile = baca("labs/api-t5/pgbouncer/Dockerfile");
const runPy = baca("labs/api-t5/run.py");
const poolerGo = baca("labs/api-t5/cmd/pooler/main.go");
const mainGo = baca("labs/api-t5/cmd/api/main.go");
const kartuGo = baca("labs/api-t5/internal/repo/kartu.go");
const auditGo = baca("labs/api-t5/internal/repo/audit.go");
const outboxGo = baca("labs/api-t5/internal/repo/outbox.go");
const goMod = baca("labs/api-t5/go.mod");
const hal33 = baca("situs/src/content/docs/tahap-3/sengaja-belum.mdx");
const hal45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const hal513 = baca("situs/src/content/docs/tahap-5/modul-ke-service.mdx");
const hal59 = baca("situs/src/content/docs/tahap-5/rpo-rto-failover.mdx");
const hal530 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];

interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; path?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};
const bulat = (x: number, d = 0): number => Math.round(x * 10 ** d + 1e-9) / 10 ** d;
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const selTabel = (b: string): string[] => b.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((s) => s.trim());
const tabelSetelah = (jangkar: string): string[][] => {
  const i = badan.indexOf(jangkar);
  expect(i, `jangkar tabel: ${jangkar}`).toBeGreaterThanOrEqual(0);
  const baris = badan.slice(i).split("\n");
  const mulai = baris.findIndex((b) => b.startsWith("|"));
  const hasil: string[][] = [];
  for (let n = mulai; n < baris.length && baris[n]!.startsWith("|"); n++) if (!/^\|[-| ]+\|$/.test(baris[n]!)) hasil.push(selTabel(baris[n]!));
  return hasil;
};
const angkaId = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));

// ---- rekaman: bagian dan nomor baris -------------------------------------------------------------------------------------------
const semuaBaris = (isi: string): string[] => isi.replace(/\n+$/, "").split("\n");
const bagianRekaman = (isi: string, huruf: string): { awal: number; akhir: number; teks: string } => {
  const semua = semuaBaris(isi);
  const a = semua.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(a, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const z = semua.findIndex((b, n) => n > a && /^# --- [A-Z]\d?\. /.test(b));
  let akhir = z < 0 ? semua.length : z; // nomor baris 1-based dari baris terakhir sebelum bagian berikutnya
  while (semua[akhir - 1]!.trim() === "") akhir--;
  return { awal: a + 1, akhir, teks: semua.slice(a, akhir).join("\n") };
};
const PA = bagianRekaman(pooler, "A");
const PB = bagianRekaman(pooler, "B");
const nomorBaris = (isi: string, ok: (b: string) => boolean, dariBaris = 1): number => {
  const i = semuaBaris(isi).findIndex((b, n) => n + 1 >= dariBaris && ok(b));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};

// ---- Snippet di halaman -------------------------------------------------------------------------------------------------------
interface Sn { tag: string; file?: string; lines?: string; files?: string[]; region?: string; lang?: string; title?: string; code?: boolean }
const snippets: Sn[] = [...badan.matchAll(/<Snippet [^\n]*\/>|<Snippet lang="[a-z]+" code=\{`[\s\S]*?`\} \/>/g)].map((m) => {
  const tag = m[0];
  const a = (n: string) => tag.match(new RegExp(`${n}="([^"]*)"`))?.[1];
  const f = tag.match(/files=\{\[([^\]]*)\]\}/)?.[1]?.match(/"([^"]+)"/g)?.map((x) => x.slice(1, -1));
  return { tag, file: a("file"), lines: a("lines"), files: f, region: a("region"), lang: a("lang"), title: a("title"), code: tag.includes("code={`") };
});

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.17 ada, konsep, jalur inti, prasyarat 5.16, lab api-t5, peran devops dan backend, ADR 52; judul sama dengan peta naskah; menit baca masuk akal", () => {
    const h = dari("t5-pooler");
    expect(h).toMatchObject({ nomor: "5.17", ada: true, jenis: "konsep", inti: true, adr: [52], lab: ["api-t5"], peran: ["devops", "backend"], prasyarat: ["t5-m46"], path: "tahap-5/pooler-koneksi.md", tahap: 5 });
    expect(frontmatter).toContain(`title: "5.17 ${h.judul}"`);
    expect(naskah).toContain("| 5.17 | 4 | Pooler koneksi: PgBouncer + ADR 52 | Konsep + ADR | ★ | api-t5 | kalkulator |");
    expect(h.judul).toBe("Pooler koneksi: PgBouncer + ADR 52");
    expect(naskah).toContain("- **DevOps** 5.9, 5.12, 5.13, 5.16, 5.17, 5.22, 5.23, 5.27, 5.28.");
    const kata = badan.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    expect(h.menit!).toBeGreaterThanOrEqual(Math.round(kata / 300));
    expect(h.menit!).toBeLessThanOrEqual(Math.round(kata / 120));
    expect(badan).toContain("<p class=\"meta\">Baca 20 menit · coba 3 menit · Prasyarat: [[t5-m46]] · Jalur inti</p>");
  });
  test("lima blok sesuai templat konsep: Mulai dan Coba terbuka; blok Coba punya kalimat 'Kalau berhenti di sini'", () => {
    expect(cekTemplat("konsep", daftarBlok(badan))).toEqual([]);
    expect(daftarBlok(badan).map((b) => b.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(badan).toContain("<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu:");
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; tiap id ada di registry; nomor dan judul halaman yang disebut sesuai peta naskah", () => {
    const ditemukan: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]/g)) ditemukan[m[1]!] = (ditemukan[m[1]!] ?? 0) + 1;
    expect(Object.keys(ditemukan).sort()).toEqual(["berikutnya", "t2-idempotency", "t3-adr-33", "t3-klaim-baris", "t3-pool", "t4-adr-45", "t4-modul", "t5-m46", "t5-onprem", "t5-prd", "t5-service"]);
    if (!tanpaSidik) expect(ditemukan).toEqual(SIDIK.tautan);
    for (const id of Object.keys(ditemukan).filter((x) => x !== "berikutnya")) expect(() => dari(id), id).not.toThrow();
    const peta: [string, string][] = [["t5-m46", "5.16"], ["t4-adr-45", "4.29"], ["t3-pool", "3.8"], ["t3-adr-33", "3.30"], ["t3-klaim-baris", "3.11"], ["t5-service", "5.13"], ["t5-onprem", "5.28"], ["t5-prd", "5.1"], ["t4-modul", "4.13"]];
    for (const [id, no] of peta) expect(dari(id).nomor, id).toBe(no);
  });
  test("halaman tetangga memuat yang dijanjikan: 3.30 dan 4.29 menulis pemicu PgBouncer dan syarat fitur sesi; 5.13 satu schema satu role; 5.9 menunjuk 5.16 dan 5.17; 5.30 menulis 180, 257%, 27,8", () => {
    expect(hal33).toMatch(/Mode transaction tidak mendukung `SET`\/`RESET`, `LISTEN`, `PREPARE`, dan advisory lock tingkat sesi\. pgx menyiapkan dan menyimpan prepar/);
    expect(hal33).toContain("PgBouncer | instance × pool + worker + admin + cadangan mencapai 70 dari 100");
    expect(hal45).toContain("PgBouncer: koneksi mencapai 70 dari 100");
    expect(hal513).toContain("satu schema dengan satu role");
    expect(hal59).toContain("[[t5-m46]] menunjukkan, menurut naskah (Ilustrasi), latihan failover yang berhasil tetapi membuat semua pod menyambung ulang bersamaan dan menghabiskan koneksi. Jawabannya ADR 52 di [[t5-pooler]].");
    expect(hal530).toContain("| 4. PgBouncer | 70 koneksi dari 100 | 40 (57%) | 180 terpasang (257%), rata-rata terpakai 27,8: terpenuhi lewat potensi | [[t5-pooler]] |");
    expect(badan).toContain("[[t4-adr-45]] menunda PgBouncer sampai koneksi mencapai 70 dari 100.");
    expect(badan).toContain("180 ÷ 70 = 257% dari pemicu itu");
    expect(badan).toContain("Rata-rata yang terpakai hanya 27,8 koneksi, yaitu 1.388,9 request per detik × 20 ms dari [[t3-pool]]");
    expect(bulat(1388.9 * 0.02, 1)).toBe(27.8);
    expect(naskah).toContain("Rata-rata terpakai L = 1.388,9 × 0,02 = 27,8 (R5-37)");
  });
  test("kalimat Kenapa ini ada diturunkan dari masukan kalkulator dan baris pemicu di 5.30; nomor ADR yang tertulis di teks adalah 45, 50, dan 52", () => {
    const m = kalk.masukan;
    const pot = m.service * m.pod * m.poolPod;
    const ters = m.maxConnections - m.cadangan;
    expect(badan).toContain(`Ada ${m.service} × ${m.pod} × ${m.poolPod} = ${pot} koneksi, dan ${ters} tersedia untuk role biasa (${m.maxConnections} − ${m.cadangan}, Hitungan atas Asumsi naskah). Selisihnya ${pot} − ${ters} = ${pot - ters}.`);
    const pemicu = Number(hal530.match(/\| 4\. PgBouncer \| (\d+) koneksi dari 100/)![1]);
    expect(badan).toContain(`[[t4-adr-45]] menunda PgBouncer sampai koneksi mencapai ${pemicu} dari ${m.maxConnections}. Angka ${pot} adalah ${pot} ÷ ${pemicu} = ${Math.round((pot / pemicu) * 100)}% dari pemicu itu (Hitungan atas Asumsi).`);
    const adr = [...new Set([...badan.matchAll(/ADR (\d+)/g)].map((x) => Number(x[1])))].sort((x, y) => x - y);
    expect(adr).toEqual([45, 50, 52]);
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t5-service").adr).toEqual([50]);
    expect(dari("t5-pooler").adr).toEqual([52]);
  });
  test("naskah: baris M46 dan ADR 52 memuat 6 × 3 × 10 = 180, 97, 60 dari 97, 400, 100 dan 120 detik; masukan kalkulator sama", () => {
    const m46 = naskah.split("\n").find((b) => b.startsWith("| M46 |"))!;
    expect(m46).toContain("Koneksi potensial 6 × 3 × 10 = 180, tersedia 97 (100 dikurangi 3 cadangan), jadi 83 koneksi ditolak dengan kode 53300");
    const adr = naskah.split("\n").find((b) => b.startsWith("| 52 |"))!;
    expect(adr).toContain("dua instance di belakang satu Service");
    expect(adr).toContain("Koneksi ke PostgreSQL dibatasi 60 dari 97 tersedia (Asumsi)");
    expect(adr).toContain("misalnya 400 (Asumsi)");
    expect(adr).toContain("`max_client_conn` PgBouncer (bawaan 100");
    expect(adr).toContain("`query_wait_timeout` (bawaan 120 detik");
    expect(adr).toContain("`MaxConnLifetimeJitter` diisi (Asumsi: 5 menit)");
    const m = kalk.masukan;
    expect([m.service, m.pod, m.poolPod, m.service * m.pod * m.poolPod]).toEqual([6, 3, 10, 180]);
    expect([m.maxConnections, m.cadangan, m.maxConnections - m.cadangan]).toEqual([100, 3, 97]);
    expect(m.instance * m.maxDbPerInstance).toBe(60);
    expect(m.maxClient).toBe(400);
    expect(m.role).toBe(m.service); // ADR 50: satu schema dan satu role per service
    expect(m.defaultPoolSize).toBe(Number(ini.match(/^default_pool_size = (\d+)/m)![1]));
  });
  test("istilah: baris glosarium PgBouncer tetap menaut ke 3.30 (penjaga 3.30 mengunci baris dan halaman istilahnya; 5.17 tidak mengubahnya) dan definisi pool pod dan pool server ada di halaman", () => {
    expect(glosarium).toMatch(/\| \*\*PgBouncer\*\* \|[^\n]*\| \[\[t3-adr-33\]\] \|/);
    expect(glosarium).not.toContain("[[t5-pooler]]");
    expect(badan).toContain("Pool pod adalah kumpulan koneksi di dalam satu pod, dan pool server adalah kumpulan koneksi server di PgBouncer untuk satu pasangan database dan user.");
  });
});

describe("rekaman pooler.txt dan kode lab: bagian, angka, dan rentang Snippet", () => {
  test("pooler.txt bagian A: 12 × 10 = 120 koneksi diminta, max_connections 100 dan 3 cadangan, galat 53300, role t5_app paling banyak 97, tidak semua client penuh", () => {
    const [klien, pool] = runPy.match(/^    KLIEN, POOL = (\d+), (\d+)$/m)!.slice(1).map(Number) as [number, number];
    expect([klien, pool, klien * pool]).toEqual([12, 10, 120]);
    expect(PA.teks).toContain(`# --- A. Tanpa pooler: ${klien} client × pool ${pool} = ${klien * pool} koneksi diminta, melewati max_connections`);
    expect(PA.teks).toContain("=> SHOW max_connections        -- 100");
    expect(PA.teks).toContain("-- 3; tersedia untuk role biasa: 100 - 3 = 97");
    expect(PA.teks).toContain("koneksi diminta: 120");
    expect(PA.teks).toContain("koneksi berhasil lebih sedikit dari diminta: ya");
    expect(PA.teks).toContain("kode galat: 53300   # 53300 = too_many_connections");
    expect(PA.teks).toContain("koneksi role t5_app di PostgreSQL paling banyak <= 97 (disampel tiap 100 ms): ya");
    expect(PA.teks).toContain("client yang mendapat seluruh 10 koneksinya: kurang dari 12: ya");
    expect(badan).toContain("12 client dengan pool 10 meminta 120 koneksi");
    expect(badan).toContain("sebagian ditolak dengan kode 53300, yaitu `too_many_connections` (bagian A)");
    expect(badan).toContain("Role `t5_app` tidak melewati 97 koneksi di PostgreSQL pada sampel tiap 100 ms. Tidak semua dari 12 client mendapat kesepuluh koneksinya.");
    // tidak direkam sebagai nilai: jumlah koneksi yang berhasil di bagian A bergantung koneksi lain, jadi halaman tidak menulisnya
    expect(PA.teks).toContain("nilai mentah bergantung koneksi lain; diperiksa terhadap batas");
    expect(badan).not.toMatch(/berhasil: \d+ dari 120|ditolak: \d+ dari 120/);
  });
  test("pooler.txt bagian B: PgBouncer 1.26.1, 120 berhasil, 2.400 query, 12 dari 12, paling banyak 20; nilai 0 Tidak dijalankan", () => {
    expect(PB.teks).toContain("# --- B. PgBouncer 1.26.1, mode transaction, default_pool_size 20: client yang sama, tanpa galat 53300");
    expect(PB.teks).toContain("$ pgbouncer --version   -- PgBouncer 1.26.1");
    expect(PB.teks).toContain("koneksi diminta: 120, berhasil: 120, galat: tidak ada");
    expect(PB.teks).toContain("query selesai: 2400 (= 12 client × 10 koneksi × 20 putaran)");
    expect(PB.teks).toContain("client yang mendapat seluruh 10 koneksinya: 12 dari 12");
    expect(PB.teks).toContain("koneksi role t5_app di PostgreSQL paling banyak <= 20 (default_pool_size; disampel tiap 100 ms): ya");
    expect(PB.teks).toContain("120 koneksi client dilayani oleh paling banyak 20 koneksi ke PostgreSQL, jauh di bawah 97.");
    expect(PB.teks).toContain("pool_mode = transaction, default_pool_size = 20, max_client_conn = 1000, max_prepared_statements = 100");
    expect(PB.teks).toContain("Dengan nilai 0 perilakunya tidak dijalankan di lab ini: Tidak dijalankan.");
    expect(badan).toContain("PgBouncer di mode transaction melayani 120 koneksi client dengan paling banyak 20 koneksi ke PostgreSQL.");
    expect(badan).toContain("Lewat PgBouncer, 120 koneksi berhasil dan paling banyak 20 sampai ke PostgreSQL (bagian B).");
    expect(badan).toContain("2.400 query selesai");
    expect(badan).toContain("Bagian B rekaman berjalan dengan nilai 100. Nilai 0 Tidak dijalankan.");
    // B adalah bagian terakhir dan memuat batas yang diperiksa, bukan nilai mesin: tidak ada p95 atau milidetik di rekaman
    expect(pooler).not.toMatch(/p95|\d+ ms\b(?!\))/);
    expect(badan).toContain("Lama tunggu, p95, dan client yang sedang di dalam transaction panjang bersamaan tidak direkam (Tidak dijalankan).");
  });
  test("kode lab: satu container PgBouncer, versi diperiksa, image dari paket 1.26.1-1.pgdg13+1, pgxpool dengan MaxConns 10 dan SELECT 1 dua puluh kali dengan jeda 50 ms", () => {
    expect(dockerfile).toContain("pgbouncer=1.26.1-1.pgdg13+1");
    expect(dockerfile).toContain("apt.postgresql.org");
    expect(runPy).toContain('IMAGE_PGB = "api-t5-pgbouncer:1.26.1"');
    expect(runPy).toContain('harap(versi.startswith("PgBouncer 1.26.1"), True, "versi PgBouncer")');
    expect(runPy.match(/mulai_pgbouncer\(/g)).toHaveLength(2); // definisi dan satu pemanggilan: satu container
    expect(runPy).toContain('harap(puncak <= 20, True, "koneksi server dibatasi pool PgBouncer")');
    expect(runPy).toContain('userlist.txt").write_text(\'"lab" "lab"\\n"t5_app" "t5_app"\\n\')');
    expect(poolerGo).toContain('putaran := flag.Int("putaran", 20,');
    expect(poolerGo).toContain('pool := flag.Int("pool", 10,');
    expect(poolerGo).toContain("cfg.MaxConns, cfg.MinConns = int32(*pool), 0");
    expect(poolerGo).toContain('c.QueryRow(ctx, "SELECT 1")');
    expect(poolerGo).toContain("time.Sleep(50 * time.Millisecond)");
    expect(poolerGo).toContain('"github.com/jackc/pgx/v5/pgxpool"');
    expect(badan).toContain("Image `api-t5-pgbouncer:1.26.1` dibangun dari paket `1.26.1-1.pgdg13+1` di apt.postgresql.org, dan bagian B memeriksa `pgbouncer --version`.");
    expect(badan).toContain("Kode `cmd/pooler/main.go` membuka 12 pool pod. Tiap koneksi menjalankan `SELECT 1` dua puluh kali dengan jeda 50 ms di antaranya:");
    expect(goMod).toMatch(/^go 1\.27\.3$/m);
    expect(goMod).toContain("github.com/jackc/pgx/v5 v5.11.0");
  });
  test("rentang Snippet diturunkan dari isi berkas, bukan dari angka tulisan tangan; sembilan Snippet, urutan dan lang dikunci", () => {
    expect(snippets).toHaveLength(9);
    const urutan = snippets.map((s) => s.file ?? s.files?.join(" + ") ?? "kode ilustrasi");
    expect(urutan).toEqual([
      "labs/api-t5/output/pooler.txt",
      "labs/api-t5/output/pooler.txt",
      "labs/api-t5/pgbouncer/pgbouncer.ini",
      "labs/api-t5/cmd/pooler/main.go",
      "labs/api-t5/internal/repo/kartu.go:141:146 + labs/api-t5/internal/repo/audit.go:39:42",
      "labs/api-t5/cmd/api/main.go",
      "kode ilustrasi",
      "kode ilustrasi",
      "kode ilustrasi",
    ]);
    expect(snippets[0]!.lines).toBe(`${PA.awal}:${PA.akhir}`);
    expect(snippets[1]!.lines).toBe(`${PB.awal}:${PB.akhir}`);
    const iniAwal = nomorBaris(ini, (b) => b.startsWith("pool_mode = transaction"));
    const iniAkhir = nomorBaris(ini, (b) => b.startsWith("max_prepared_statements = 100"));
    expect(snippets[2]!.lines).toBe(`${iniAwal}:${iniAkhir}`);
    const putAwal = nomorBaris(poolerGo, (b) => b.includes("for k := 0; k < *putaran; k++ {"));
    const indent = semuaBaris(poolerGo)[putAwal - 1]!.match(/^\t*/)![0];
    const putAkhir = nomorBaris(poolerGo, (b) => b === `${indent}}`, putAwal + 1);
    expect(snippets[3]!.lines).toBe(`${putAwal}:${putAkhir}`);
    const kAwal = nomorBaris(kartuGo, (b) => b.startsWith("// BatasWaktuKunci memasang lock_timeout"));
    const kFungsi = nomorBaris(kartuGo, (b) => b.startsWith("func (t Tx) BatasWaktuKunci("));
    const kAkhir = nomorBaris(kartuGo, (b) => b === "}", kFungsi);
    const aAwal = nomorBaris(auditGo, (b) => b.startsWith("func (t Tx) TulisAudit("));
    const aKunci = nomorBaris(auditGo, (b) => b.includes("pg_advisory_xact_lock($1)"), aAwal);
    const aAkhir = nomorBaris(auditGo, (b) => b === "\t}", aKunci);
    expect(snippets[4]!.files).toEqual([`labs/api-t5/internal/repo/kartu.go:${kAwal}:${kAkhir}`, `labs/api-t5/internal/repo/audit.go:${aAwal}:${aAkhir}`]);
    expect(mainGo.match(/\/\/ --8<-- \[start:buka-db\]/g)).toHaveLength(1);
    expect(mainGo.match(/\/\/ --8<-- \[end:buka-db\]/g)).toHaveLength(1);
    expect(snippets[5]!.region).toBe("buka-db");
    expect(snippets.map((s) => s.lang)).toEqual([undefined, undefined, undefined, "go", "go", "go", "js", "php", "python"]);
    expect(snippets[3]!.title).toBe("Kode lab: labs/api-t5/cmd/pooler/main.go baris 77 sampai 94 (query pendek dengan jeda)");
    expect(snippets[3]!.title).toContain(`baris ${putAwal} sampai ${putAkhir}`);
    expect(snippets[0]!.title).toBe("Rekaman lab: labs/api-t5/output/pooler.txt, bagian A (tanpa pooler)");
    expect(snippets[1]!.title).toBe("Rekaman lab: labs/api-t5/output/pooler.txt, bagian B (PgBouncer)");
    if (!tanpaSidik) expect(snippets.map((s) => sidik(s.tag))).toEqual(SIDIK.snippet);
  });
  test("kode lab yang dikutip halaman: set_config tingkat transaction di kartu.go, pg_advisory_xact_lock di audit.go, outbox satu pernyataan dengan FOR UPDATE SKIP LOCKED, stdlib.OpenDB tanpa mode eksekusi", () => {
    expect(kartuGo).toContain("`SELECT set_config('lock_timeout', $1, true)`");
    expect(auditGo).toContain("`SELECT pg_advisory_xact_lock($1)`");
    expect(auditGo).toContain("func (t Tx) TulisAudit(");
    const klaim = outboxGo.slice(outboxGo.indexOf("func (r Repo) KlaimOutboxTujuan("), outboxGo.indexOf("// --8<-- [end:klaim]"));
    expect(klaim).toContain("WITH pilih AS (");
    expect(klaim).toContain("FOR UPDATE SKIP LOCKED)");
    expect(klaim).toContain("UPDATE outbox o SET klaim_sampai");
    expect(klaim.match(/QueryContext\(/g)).toHaveLength(1); // satu pernyataan, bukan beberapa langkah
    expect(klaim).not.toContain("BeginTx");
    expect(mainGo).toContain("db := stdlib.OpenDB(*cfg)");
    expect(mainGo).toContain("db.SetMaxOpenConns(pool)");
    const bukaDb = mainGo.slice(mainGo.indexOf("func bukaDB("), mainGo.indexOf("// --8<-- [end:buka-db]"));
    expect(bukaDb).not.toContain("DefaultQueryExecMode");
    expect(badan).toContain("Server `api-t5` membuka pool lewat `stdlib.OpenDB` dan tidak mengubah mode eksekusi bawaan (dibaca dari kode `bukaDB`).");
  });
  test("klaim negatif berlingkup labs/api-t5 (cmd dan internal, file Go selain tes): tidak ada QueryExecMode, pgxpool hanya di cmd/pooler, jitter hanya di internal/worker dan internal/stream", () => {
    const berkas = [...(terlacak ?? [])].filter((f) => /^labs\/api-t5\/(cmd|internal)\/.+\.go$/.test(f) && !f.endsWith("_test.go"));
    expect(berkas.length).toBeGreaterThan(20);
    const memuat = (re: RegExp) => berkas.filter((f) => re.test(fs.readFileSync(path.join(akar, f), "utf8"))).sort();
    expect(memuat(/QueryExecMode/)).toEqual([]);
    expect(memuat(/pgx\/v5\/pgxpool/)).toEqual(["labs/api-t5/cmd/pooler/main.go"]);
    expect(memuat(/jitter/i)).toEqual(["labs/api-t5/internal/stream/kirim.go", "labs/api-t5/internal/worker/verifikasi.go", "labs/api-t5/internal/worker/worker.go"]);
    // kalimat halaman memuat tes: seluruh berkas Go (termasuk tes) yang memuat kata jitter ada di dua folder itu, dan tak satu pun di cmd
    const semuaGo = [...(terlacak ?? [])].filter((f) => /^labs\/api-t5\/.+\.go$/.test(f));
    const denganJitter = semuaGo.filter((f) => /jitter/i.test(fs.readFileSync(path.join(akar, f), "utf8"))).sort();
    expect(denganJitter).toEqual(["labs/api-t5/internal/stream/kirim.go", "labs/api-t5/internal/stream/kirim_test.go", "labs/api-t5/internal/worker/verifikasi.go", "labs/api-t5/internal/worker/worker.go", "labs/api-t5/internal/worker/worker_test.go"]);
    expect(denganJitter.filter((f) => f.startsWith("labs/api-t5/cmd/"))).toEqual([]);
    expect(memuat(/MaxConnLifetime/)).toEqual([]);
    expect(memuat(/stdlib\.OpenDB/)).toEqual(["labs/api-t5/cmd/api/main.go", "labs/api-t5/cmd/ledger/main.go", "labs/api-t5/cmd/stream/main.go"]);
    expect(badan).toContain("Backoff dengan jitter ([[t2-idempotency]]) ada di kode lab untuk pengiriman ke penyedia push dan verifikasi, yaitu di `internal/worker` dan `internal/stream`. Di file Go `labs/api-t5`, kata jitter hanya muncul di dua folder itu, termasuk tes keduanya, dan tidak muncul di `cmd`.");
  });
});

describe("pengaturan PgBouncer dan batas: tabel bawaan, rekaman lab, dan desain ADR 52", () => {
  const r190 = () => barisRiset("R5-190");
  const bawaan = (kunci: string): string => {
    const m = r190().match(new RegExp("`" + kunci + "`[^`]*?Default: ([0-9.]+(?: \\(unlimited\\))?)"));
    expect(m, `bawaan ${kunci} di baris riset`).not.toBeNull();
    return m![1]!;
  };
  test("lima baris tabel: bawaan dari dokumentasi (baris riset), lab dari pgbouncer.ini, desain dari kalkulator", () => {
    const tabel = tabelSetelah("**Lima pengaturan membatasi lima hal berbeda.**");
    expect(tabel[0]).toEqual(["Pengaturan", "Yang dibatasi", "Bawaan", "Rekaman lab", "Desain ADR 52 (Asumsi)"]);
    const lab = (k: string): string | null => ini.match(new RegExp(`^${k} = (\\S+)`, "m"))?.[1] ?? null;
    const m = kalk.masukan;
    const harap = [
      ["`max_client_conn`", "Koneksi client yang diizinkan", bawaan("max_client_conn"), lab("max_client_conn")!, `${m.maxClient} per instance`],
      ["`default_pool_size`", "Koneksi server per pasangan user dan database", bawaan("default_pool_size"), lab("default_pool_size")!, `${m.defaultPoolSize} per role (bawaan)`],
      ["`max_db_connections`", "Koneksi server per database, semua user", "0 (tanpa batas)", "Tidak diisi", `${m.maxDbPerInstance} per instance, ${m.instance * m.maxDbPerInstance} bersama`],
      ["`query_wait_timeout`", "Detik client menunggu server sebelum diputus", String(Math.round(Number(bawaan("query_wait_timeout")))), "Tidak diisi", `${Math.round(Number(bawaan("query_wait_timeout")))} (bawaan)`],
      ["`max_prepared_statements`", "Prepared statement yang dilacak", bawaan("max_prepared_statements"), lab("max_prepared_statements")!, "Lebih dari 0"],
    ];
    expect(tabel.slice(1)).toEqual(harap);
    expect(bawaan("max_db_connections")).toBe("0 (unlimited)");
    expect(lab("max_db_connections")).toBeNull(); // lab tidak mengisi
    expect(lab("query_wait_timeout")).toBeNull();
    expect(badan).toContain("**Lima pengaturan membatasi lima hal berbeda.** Tabel berikut membedakan nilai rekaman lab dari rancangan ADR 52.");
    expect(tabel.slice(1)).toHaveLength(5);
  });
  test("klaim dokumentasi: per pasangan database dan user, satu core per instance, tabel fitur Never dan Yes, tiga perbaikan keamanan 1.26.1 tanggal 2026-10-14", () => {
    const r = r190();
    expect(r).toContain('"The maximum number of server connections to allow per user/database pair."');
    expect(r).toContain('"A new pool entry is made for each couple of (database, user)."');
    expect(r).toContain('"Do not allow more than this many server connections per database (regardless of user)."');
    expect(r).toContain("(PgBouncer is single-threaded and uses one CPU core per instance.)");
    expect(r).toContain("\"Maximum number of client connections allowed.\" Default: 100");
    expect(r).toContain("2026-10-14 - PgBouncer 1.26.1");
    expect(r).toContain("2025-01-10 - PgBouncer 1.24.0");
    expect(r).toContain("2023-10-16 - PgBouncer 1.21.0");
    expect(r).toContain("PgBouncer 1.20.0 through 1.26.0 spin forever on a CPU core, and thus stop serving all clients");
    for (const f of ["SET/RESET", "LISTEN", "session-level advisory locks", "PREPARE / DEALLOCATE"]) expect(r, f).toContain(f);
    expect(r).toContain("tabel tidak menyebut `SET LOCAL`, `set_config`, maupun advisory lock tingkat transaction");
    const tabel = tabelSetelah("Tabel di dokumentasi memuat:");
    expect(tabel).toEqual([
      ["Fitur PostgreSQL", "Di mode transaction (tabel dokumentasi)"],
      ["`SET` dan `RESET`", "`Never`"],
      ["`LISTEN`", "`Never`"],
      ["Advisory lock tingkat sesi", "`Never`"],
      ["`PREPARE` dan `DEALLOCATE` tingkat SQL", "`Never`"],
      ["Prepared statement tingkat protokol", "`Yes`, bila `max_prepared_statements` bukan nol"],
    ]);
    expect(badan).toContain("Catatan rilis 1.26.1 (2026-10-14) memuat tiga perbaikan keamanan atas versi sampai 1.26.0.");
    expect(badan).toContain("PgBouncer 1.21.0 (2023-10-16) menambah dukungan prepared statement tingkat protokol");
    expect(badan).toContain("Sejak 1.24.0 (2025-01-10) bawaannya 200, dan lab menulis 100");
  });
  test("kalkulator: 2 × min(30, 6 × 20) = 60 dengan batas database, 2 × 6 × 20 = 240 tanpa; 60 dari 97 tersedia adalah 61,9%", () => {
    expect(skenarioHasil[0]!.serverMaks).toBe(60);
    expect(skenarioHasil[5]!.serverMaks).toBe(240);
    expect(bulat((60 / 97) * 100, 1)).toBe(61.9);
    expect(badan).toContain("Enam role dan dua instance membuka sampai 2 × 6 × 20 = 240 koneksi server bila `max_db_connections` kosong, lebih dari 97 tersedia.");
    expect(badan).toContain("Tiap instance PgBouncer menghitungnya sendiri, jadi 60 koneksi server bersama dibagi dua instance: 30 per instance (penalaran, Tidak dijalankan).");
  });
});

describe("hitungan: tabel Hitungan dihitung ulang dari angka yang tertulis di halaman", () => {
  const rumus = (s: string): number => {
    const t = s.replace(/\s+/g, " ").split(" ");
    let nilai = angkaId(t[0]!);
    for (let i = 1; i < t.length; i += 2) {
      const b = angkaId(t[i + 1]!);
      nilai = t[i] === "×" ? nilai * b : t[i] === "÷" ? nilai / b : t[i] === "−" ? nilai - b : NaN;
    }
    return nilai;
  };
  test("13 baris: rumus dan hasil sama dengan hitungan ulang (setengah ke atas); masukan rumus berasal dari masukan kalkulator atau baris sebelumnya", () => {
    const tabel = tabelSetelah("**Hitungan koneksi.**");
    expect(tabel[0]).toEqual(["Besaran", "Rumus", "Hasil"]);
    const baris = tabel.slice(1);
    expect(baris).toHaveLength(13);
    const m = kalk.masukan;
    const sah = new Set<number>([m.service, m.pod, m.poolPod, m.maxConnections, m.cadangan, m.instance, m.maxDbPerInstance, m.maxClient, m.role, m.defaultPoolSize, 70, 27.8, 5, 8]);
    for (const [nama, f, hasil] of baris) {
      const persen = hasil!.endsWith("%");
      const teksHasil = hasil!.replace("%", "");
      const des = teksHasil.includes(",") ? teksHasil.split(",")[1]!.length : 0;
      const v = rumus(f!) * (persen ? 100 : 1);
      expect(bulat(v, des), nama).toBe(angkaId(teksHasil));
      for (const tok of f!.split(/\s+/).filter((x) => /\d/.test(x))) expect(sah.has(angkaId(tok)), `${nama}: ${tok} bukan masukan`).toBe(true);
      sah.add(angkaId(teksHasil));
    }
    const nama = baris.map((b) => b[0]);
    expect(nama).toEqual([
      "Koneksi yang diminta pod", "Koneksi tersedia", "Ditolak tanpa pooler", "Dari pemicu 70 koneksi", "Pool server ADR 52", "Pool server terhadap tersedia", "Client terhadap `max_client_conn`",
      `${kalk.skenario[1]!.ubah!.pod} pod tiap service`, `${kalk.skenario[2]!.ubah!.pod} pod tiap service`, `Pool pod ${kalk.skenario[3]!.ubah!.poolPod}, ${m.pod} pod`, `Pool pod ${kalk.skenario[4]!.ubah!.poolPod}, ${kalk.skenario[4]!.ubah!.pod} pod`,
      "Pool server tanpa `max_db_connections`", "Rata-rata terpakai terhadap satu instance",
    ]);
    expect(hal530).toContain("| 4. PgBouncer | 70 koneksi dari 100 |");
    expect(baris.map((b) => b[2])).toEqual(["180", "97", "83", "257%", "60", "61,9%", "45%", "300", "480", "90", "150", "240", "92,7%"]);
    expect(baris.map((b) => b[1])).toEqual(["6 × 3 × 10", "100 − 3", "180 − 97", "180 ÷ 70", "2 × 30", "60 ÷ 97", "180 ÷ 400", "6 × 5 × 10", "6 × 8 × 10", "6 × 3 × 5", "6 × 5 × 5", "2 × 6 × 20", "27,8 ÷ 30"]);
    expect(badan).toContain("Tiap hasil di tabel adalah Hitungan atas Asumsi.");
    expect(skenarioHasil.map((h) => h.potensi)).toEqual([180, 300, 480, 90, 150, 180]);
  });
  test("angka yang sama di kalkulator, Putuskan, Pre-mortem, Ubah satu hal, dan Cek diri: 83, 203, 480, 53, 90, 150, 92,7%, 75%", () => {
    expect(badan).toContain("Dengan 3 pod, 6 × 3 × 5 = 90 koneksi muat di 97 tanpa pooler. Dengan 5 pod jumlahnya 150, dan paling sedikit 53 koneksi ditolak.");
    expect(skenarioHasil[3]!.potensi).toBe(90);
    expect(skenarioHasil[4]!.potensi).toBe(150);
    expect(skenarioHasil[4]!.ditolakTanpa).toBe(53);
    expect(badan).toContain("Pool server tinggal 30, dan rata-rata terpakai 27,8 ÷ 30 = 92,7% (Hitungan atas Asumsi)");
    expect(badan).toContain("8 pod tiap service memberi 480 client lawan 400 per instance (Hitungan atas Asumsi). Pembanding naskah: 180 lawan 400.");
    expect(badan).toContain("6 × 5 × 10 = 300 koneksi. Tanpa pooler, 300 − 97 = 203 koneksi ditolak. 300 client muat di 400 per instance (75%), tetapi 8 pod tiap service memberi 480 dan melewati batas itu (Hitungan atas Asumsi).");
    expect(bulat((300 / 400) * 100)).toBe(75);
    expect(badan).toContain("Dengan pool 5, tiga pod memakai 90 koneksi dan lima pod memakai 150.");
  });
});

describe("kalkulator, tebakan, dan noscript: nilai diturunkan dari logika dan data", () => {
  test("data valid; masukan, enam skenario, dan awal sesuai halaman; sidik data dikunci", () => {
    expect(kalk.skenario).toHaveLength(6);
    expect(kalk.sumber.jenis).toBe("asumsi");
    expect(kalk.label.sumber).toBe("Hitungan atas Asumsi");
    if (!tanpaSidik) expect(sidik(JSON.stringify(JSON.parse(baca("situs/data/widget/t5-pooler-kalkulator.json")))), "kalkulator berubah").toBe(SIDIK.kalkulator);
    expect(kalk.sumber.teks).toContain("Aturan batas dari dokumentasi PgBouncer, tidak dijalankan: lab memakai satu role dan satu instance.");
    expect(badan).toContain("<KoneksiPooler client:visible data={dataKalkulator} />");
    expect(badan).toContain("import dataKalkulator from \"../../../../data/widget/t5-pooler-kalkulator.json\";");
  });
  test("tebakan: 240 koneksi di posisi ketiga; jawaban dihitung dari skenario enam role; tidak terjawab di prosa sebelum widget", () => {
    const benar = kalk.tebak.pilihan[kalk.tebak.jawaban]!;
    expect(kalk.tebak.jawaban).toBe(2);
    expect(benar).toBe(`${skenarioHasil[kalk.tebak.skenario]!.serverMaks} koneksi`);
    expect(kalk.tebak.pilihan.filter((_, i) => i !== kalk.tebak.jawaban).map((p) => Number(p.match(/^\d+/)![0]))).toEqual([20, 60, 97]);
    expect(kalk.tebak.q).toBe("ADR 52 memasang dua instance PgBouncer dengan default_pool_size 20, dan tiap service menyambung dengan role sendiri, jadi ada enam role. Bila max_db_connections tidak diisi, berapa koneksi paling banyak yang boleh dibuka kedua instance ke PostgreSQL?");
    const sebelum = badan.slice(0, badan.indexOf("<KoneksiPooler")).replace(/aman="[^"]*"/, ""); // atribut aman dirender sesudah widget
    expect(sebelum).not.toMatch(/240/);
    expect(sebelum).not.toMatch(/pasangan (user|database)|per role|per pasangan/);
    expect(sebelum).not.toMatch(/2 × 6 × 20/);
    // "satu pool server" dan "bawaan 20" memang ada sebelum tebakan; jawabannya (per pasangan, enam role) belum
    expect(sebelum).toContain("Pengaturan `default_pool_size` membatasi koneksi ke PostgreSQL yang dibuka satu pool server, dan bawaannya 20.");
    expect(sebelum).toContain("Pengaturan `max_db_connections` adalah batas lain untuk koneksi ke PostgreSQL, dan bawaannya tanpa batas.");
    // kalimat "aman" membuka jawaban SESUDAH widget
    const aman = badan.match(/<Blok nama="Coba" buka aman="([^"]*)">/)![1]!;
    expect(aman).toContain(`sampai ${skenarioHasil[5]!.serverMaks} koneksi ke PostgreSQL bila max_db_connections kosong`);
    expect(aman).toContain(`${kalk.masukan.maxDbPerInstance} per instance, ${kalk.masukan.instance * kalk.masukan.maxDbPerInstance} bersama`);
    expect(badan.indexOf("<KoneksiPooler")).toBeGreaterThan(badan.indexOf("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini."));
  });
  test("noscript: jawaban tebakan dan enam baris skenario sama dengan hitungan logika", () => {
    const ns = badan.slice(badan.indexOf("<noscript>"), badan.indexOf("</noscript>"));
    expect(ns).toContain(`Jawaban yang tepat untuk tebakan: ${skenarioHasil[5]!.serverMaks} koneksi, yaitu 2 instance × 6 role × 20.`);
    const baris = [...ns.matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g)].map((m) => m.slice(1, 7));
    expect(baris).toHaveLength(6);
    baris.forEach((b, i) => {
      const h = skenarioHasil[i]!;
      expect(b, `skenario ${i}`).toEqual([kalk.skenario[i]!.label, String(h.potensi), String(h.potensi), String(h.keServer), String(h.ditolakDengan), String(h.klienLebih)]);
    });
    expect(ns).toContain("<thead><tr><th>Skenario</th><th>Diminta pod</th><th>Ke PostgreSQL tanpa pooler</th><th>Ke PostgreSQL dengan PgBouncer</th><th>Ditolak 53300 dengan PgBouncer</th><th>Client di atas batas</th></tr></thead>");
    expect(ns).toContain("Tanpa JavaScript widget tidak berjalan.");
    expect(kesimpulan(kalk.label.kesimpulan, skenarioHasil[0]!)).toContain("paling sedikit 83 dari 180 koneksi ditolak 53300");
    expect(titik(skenarioHasil[5]!.ditolakDengan)).toBe("83");
  });
  test("Ubah satu hal memakai dua skenario di data: Pool tiap pod 5 dengan 3 pod lalu 5 pod", () => {
    expect(badan).toContain("**Ubah satu hal:** pilih Pool tiap pod 5, 3 pod, lalu Pool tiap pod 5, 5 pod.");
    expect(kalk.skenario[3]!.label).toBe("Pool tiap pod 5, 3 pod");
    expect(kalk.skenario[4]!.label).toBe("Pool tiap pod 5, 5 pod");
  });
});

describe("sumber luar: baris riset, tanggal akses, tautan, versi, dan kutipan", () => {
  test("lima baris riset R5-190 sampai R5-194 ada, naik berurutan, tanpa ganda; tanggal akses 2026-11-04", () => {
    const baris = riset.split("\n");
    const ids = ["R5-190", "R5-191", "R5-192", "R5-193", "R5-194"];
    const indeks = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    expect(indeks.every((i) => i >= 0)).toBe(true);
    expect(indeks).toEqual([...indeks].sort((a, b) => a - b));
    for (const id of ids) expect(baris.filter((b) => b.startsWith(`| ${id} |`)), id).toHaveLength(1);
    for (const id of ids) expect(barisRiset(id), id).toMatch(/(dibuka|dibaca|dijalankan) 2026-11-04/i);
    expect(barisRiset("R5-190")).toMatch(/Tidak berubah dari R5-06 dan R5-105/);
    if (!tanpaSidik) expect(ids.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
    expect(badan.match(/dibuka 2026-11-04/g)!.length).toBeGreaterThanOrEqual(12);
    expect(badan).not.toMatch(/2026-1[01]-(0[0-3]|[12]\d|30|31)(?!\))/); // tak ada tanggal akses lain selain 2026-11-04 (tanggal rilis 2026-10-14 dikecualikan di bawah)
  });
  test("tautan eksternal: tiap URL ada di baris riset yang memuatnya; teks tautan deskriptif; tanpa ID riset, nomor keputusan, atau nomor PR di halaman", () => {
    const peta: Record<string, [string, string]> = {
      "pgbouncer.org/features.html": ["R5-190", "pgbouncer.org/features.html"], "pgbouncer.org/config.html": ["R5-190", "pgbouncer.org/config.html"],
      "pgbouncer.org/usage.html": ["R5-190", "pgbouncer.org/usage.html"], "pgbouncer.org/changelog.html": ["R5-190", "pgbouncer.org/changelog.html"],
      "github.com/jackc/pgx/blob/v5.11.0/conn.go": ["R5-191", "`conn.go`"], "github.com/jackc/pgx/blob/v5.11.0/pgxpool/pool.go": ["R5-191", "`pgxpool/pool.go`"],
      "github.com/jackc/pgx/issues/1687": ["R5-191", "github.com/jackc/pgx/issues/1687"], "github.com/golang/go/blob/go1.27.3/src/database/sql/sql.go": ["R5-191", "src/database/sql/sql.go"],
      "postgresql.org/docs/17/runtime-config-connection.html": ["R5-192", "postgresql.org/docs/17/runtime-config-connection.html"],
      "postgresql.org/docs/17/runtime-config-resource.html": ["R5-192", "postgresql.org/docs/17/runtime-config-resource.html"],
      "postgresql.org/docs/17/errcodes-appendix.html": ["R5-192", "postgresql.org/docs/17/errcodes-appendix.html"],
      "github.com/porsager/postgres": ["R5-193", "github.com/porsager/postgres"], "node-postgres.com/apis/pool": ["R5-193", "node-postgres.com/apis/pool"],
      "laravel.com/docs/13.x/database": ["R5-193", "laravel.com/docs/13.x/database"], "docs.djangoproject.com/en/5.2/ref/databases/": ["R5-193", "docs.djangoproject.com/en/5.2/ref/databases/"],
      "docs.serverpod.dev/concepts/data-and-the-database/database/connection": ["R5-193", "docs.serverpod.dev/concepts/data-and-the-database/database/connection"],
      "supabase.com/docs/guides/database/connecting-to-postgres": ["R5-193", "supabase.com/docs/guides/database/connecting-to-postgres"],
      "supabase.com/docs/guides/database/connection-management": ["R5-193", "supabase.com/docs/guides/database/connection-management"],
    };
    const url = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(new Set(url.map((u) => u.replace(/^https:\/\/(www\.)?/, "")))).toEqual(new Set(Object.keys(peta)));
    for (const [u, [id, potongan]] of Object.entries(peta)) expect(barisRiset(id), `${id}: ${u}`).toContain(potongan);
    for (const m of badan.matchAll(/\[([^\]]+)\]\(https:\/\/[^)]+\)/g)) expect(m[1]!.length, m[1]).toBeGreaterThan(8);
    expect(badan).not.toMatch(/R\d-\d+|keputusan \d{3,}|PR #?\d{3}|#\d{3}\b/);
    const bacaan = badan.slice(badan.indexOf("### Bacaan lanjut"));
    expect(bacaan.match(/^- \[/gm)).toHaveLength(18);
  });
  test("R5-190: kutipan dokumentasi PgBouncer di baris riset sama dengan yang dikutip halaman, dan halaman menulis tidak lebih kuat", () => {
    const r = barisRiset("R5-190");
    for (const q of ['"Maximum number of client connections allowed."', "Default: 120.0", '"A new pool entry is made for each couple of (database, user)."', "Client connections that have sent queries but have not yet got a server connection."]) expect(r, q).toContain(q);
    expect(badan).toContain('Dokumentasi menulis `max_client_conn` sebagai "Maximum number of client connections allowed", dengan bawaan 100.');
    expect(badan).toContain("Bila menunggu melewati `query_wait_timeout`, client diputus, dan nilai 0 membuat client menunggu tanpa ujung");
    expect(r).toContain("If this is disabled, clients will be queued indefinitely.");
    expect(badan).toContain("Dokumentasi menulis bahwa PgBouncer single-threaded dan memakai satu core CPU per instance.");
    expect(badan).toContain("bila `ignore_startup_parameters` tidak kosong.");
    expect(r).toContain("hanya bila `ignore_startup_parameters` tidak kosong");
    expect(badan).toContain("`PREPARE`, `EXECUTE`, dan `DEALLOCATE` tingkat SQL diteruskan langsung ke PostgreSQL tanpa pelacakan, kecuali `DEALLOCATE ALL` dan `DISCARD ALL`");
    expect(r).toContain("PREPARE, EXECUTE and DEALLOCATE are forwarded straight to Postgres");
  });
  test("R5-191: pgx v5.11.0 (MaxConns, jitter 0, mode bawaan, DescribeExec), database/sql Go 1.27.3 tanpa jitter, dan isu pgx#1687 dengan versi, tanggal, dan jawaban pemilik", () => {
    const r = barisRiset("R5-191");
    for (const q of ["The default is the greater of 4 or runtime.NumCPU().", "(default 0)", "This helps prevent all connections from being closed at the exact same time, starving the pool.", "This is the default.", "may be incompatible with proxies such as PgBouncer", "This may cause problems with connection poolers that switch the underlying connection between round trips.", "The default is 0 (unlimited).", "dibuka 2023-07-14", "pgx v5.4.1", "Please try pgx v5.4.2. It resolved some issues with connections not being correctly cleaned up."]) expect(r, q).toContain(q);
    expect(r).toContain("berkas itu tidak memuat kata jitter");
    expect(badan).toContain("Di pgx v5.11.0, bawaan `pgxpool.Config.MaxConns` adalah yang lebih besar antara 4 dan `runtime.NumCPU()`. Jitter bawaannya 0.");
    expect(badan).toContain("Isu pgx#1687 melaporkan pool menumpuk bersama `query_wait_timeout`. Pelapor memakai pgx v5.4.1, dan isu itu terbuka sejak 2023-07-14. Pemilik pgx menjawab agar pelapor mencoba v5.4.2, yang menurutnya memperbaiki sebagian masalah koneksi yang tidak dibersihkan dengan benar. Apakah masalah itu ada di v5.11.0 belum diperiksa [perlu verifikasi].");
    expect(badan).toContain("File `sql.go` di Go 1.27.3 tidak memuat kata jitter (dicari di teks file)");
    expect(badan).toContain("Pengaturan `MaxConnLifetimeJitter` hanya ada di `pgxpool`.");
    expect(r).toContain("This helps prevent all connections from being closed at the exact same time, starving the pool.");
    expect(badan).toContain("Komentar kodenya menulis bahwa jitter mencegah semua koneksi ditutup di detik yang sama, sampai pool kehabisan koneksi");
    expect(badan).toContain("Kode sumber pgx v5.11.0 menulis `QueryExecModeCacheStatement` sebagai mode bawaan: pgx menyiapkan dan menyimpan prepared statement.");
    // atribusi: kalimat "bisa tidak cocok dengan proxy seperti PgBouncer" ada di komentar field DefaultQueryExecMode (bukan di komentar konstanta QueryExecModeCacheStatement)
    expect(badan).toContain("Komentar `DefaultQueryExecMode` menulis bahwa ini bisa tidak cocok dengan proxy seperti PgBouncer");
    expect(barisRiset("R5-191")).toContain("`DefaultQueryExecMode`: \"By default pgx uses the extended protocol and automatically prepares and caches prepared statements. This may be incompatible with proxies such as PgBouncer");
    expect(badan).toContain("Mode `QueryExecModeDescribeExec` bisa bermasalah dengan pooler yang berganti koneksi di antara dua round trip.");
  });
  test("R5-192: PostgreSQL 17 max_connections bawaan 100, cadangan 3 dan 0, alokasi sumber daya, standby, work_mem, dan 53300", () => {
    const r = barisRiset("R5-192");
    for (const q of ["The default is typically 100 connections", "Increasing its value leads to higher allocation of those resources, including shared memory.", "you must set this parameter to the same or higher value than on the primary server.", "The default value is three connections.", "The default value is zero connections.", "several running sessions could be doing such operations concurrently", "`53300` = `too_many_connections`"]) expect(r, q).toContain(q);
    expect(badan).toContain("Dokumentasi PostgreSQL 17 menulis bahwa kenaikannya menambah alokasi sumber daya, termasuk shared memory. Dokumentasi itu juga menulis bahwa banyak sesi bisa memakai `work_mem` bersamaan.");
    expect(badan).toContain("PostgreSQL mengalokasikan sumber daya menurut nilainya, termasuk shared memory, dan standby harus bernilai sama atau lebih tinggi (dokumentasi PostgreSQL 17)");
  });
  test("R5-193: enam tab stack — versi, kutipan, klaim negatif berlingkup 'dicari di teks halaman'; enam label tab dan urutan slot", () => {
    const r = barisRiset("R5-193");
    for (const q of ["Django 5.2", "closing the database connection at the end of each request", "New in Django 5.1", "is ignored with psycopg2", "requires disabling server-side cursors for that connection.", "v13.40.0", "Laravel automatically enables emulated prepares for the pooled connection.", "By default this is set to 10", "pg 8.23.1", "postgres 4.0.0", "By default `max` is 10", "Serverpod 4.1.0", "a maximum of 10 connections to the database", "The shared pooler doesn't support prepared statements in transaction mode.", "Unlike the shared pooler, it supports prepared statements on PgBouncer 1.21 and later.", "This pool size applies per database user (role), not as a single total for the whole project.", "past 40% of the Database Max Connections. Otherwise, you can commit 80% to the pool."]) expect(r, q).toContain(q);
    expect(r).toContain("halaman itu tidak memuat kata PgBouncer");
    expect(r).toContain("halaman itu tidak memuat kata PgBouncer atau pooler");
    expect(badan).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...badan.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1])).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    expect(badan).toContain("Tab Go dijalankan sebagian di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-04. Kode di tab lain adalah Ilustrasi.");
    expect(badan).toContain("`max` bawaan pool node-postgres adalah 10, dan halaman itu tidak memuat kata PgBouncer (dicari di teks halaman).");
    expect(badan).toContain("Halaman itu tidak membahas `max_prepared_statements` maupun ukuran pool (dicari di teks halaman).");
    expect(badan).toContain("Halaman itu tidak memuat kata PgBouncer maupun pooler (dicari di teks halaman).");
    expect(badan).toContain("Serverpod memakai pool dengan paling banyak 10 koneksi ke database secara bawaan, diubah lewat `maxConnectionCount`. Nilai 0 atau negatif berarti tanpa batas.");
    expect(badan).toContain("`CONN_MAX_AGE` bawaannya 0, yaitu koneksi ditutup di akhir tiap request.");
    expect(badan).toContain("Pooler bersama (Supavisor) di mode transaction tidak mendukung prepared statement. Pooler khusus memakai PgBouncer dan mendukungnya sejak PgBouncer 1.21.");
    expect(badan).toContain("Halaman itu juga menyebut 40% dari koneksi maksimum database bila PostgREST dipakai berat, selain itu 80%. Angka itu aturan umum Supabase, bukan aturan PostgreSQL.");
    expect(badan).toContain("Koneksi pooled memakai emulated prepares");
  });
  test("R5-194: rekaman dan kode lab yang dibaca ada di baris riset; baris riset memuat hitungan yang sama dengan halaman", () => {
    const r = barisRiset("R5-194");
    for (const q of ["`labs/api-t5/output/pooler.txt` bagian A", "`labs/api-t5/cmd/pooler/main.go`", "`labs/api-t5/pgbouncer/pgbouncer.ini`", "`labs/api-t5/cmd/api/main.go` fungsi `bukaDB`", "`internal/repo/outbox.go` fungsi `KlaimOutboxTujuan`", "`internal/repo/kartu.go` fungsi `BatasWaktuKunci`", "`internal/repo/audit.go` fungsi `TulisAudit`", "27,8 ÷ 30 = 92,7%", "2 × 6 × 20 = 240", "60 ÷ 97 = 61,9%", "180 ÷ 70 = 2,571 (257%)", "300 − 97 = 203", "6 × 5 × 5 = 150"]) expect(r, q).toContain(q);
    expect(barisRiset("R5-190")).toContain("tanpa nomor versi sendiri");
  });
});

describe("tanggal, versi, port, dan tabel Sengaja belum: token diturunkan dari baris riset, konfigurasi, dan hitungan", () => {
  const risetSemua = () => ["R5-190", "R5-191", "R5-192", "R5-193", "R5-194"].map(barisRiset).join("\n");
  test("tanggal: tiap paragraf bertautan di luar Bacaan lanjut memuat 2026-11-04; tanggal lain hanya tanggal rilis PgBouncer dan tanggal isu pgx dari baris riset", () => {
    const luar = badan.slice(0, badan.indexOf("### Bacaan lanjut"));
    for (const b of luar.split("\n")) if (/\]\(https:\/\//.test(b)) expect(b, b.slice(0, 70)).toContain("2026-11-04");
    const r = risetSemua();
    const sah = new Set<string>(["2026-11-04"]);
    for (const m of r.matchAll(/(\d{4}-\d{2}-\d{2}) - PgBouncer (1\.\d+\.\d+)/g)) sah.add(m[1]!);
    sah.add(barisRiset("R5-191").match(/dibuka (\d{4}-\d{2}-\d{2}), status terbuka/)![1]!);
    // rilis terbaru Laravel di Packagist: versi dan tanggalnya dibaca dari baris riset R5-193, dan halaman menulis keduanya persis
    const lv = barisRiset("R5-193").match(/rilis terbaru (v\d+\.\d+\.\d+), (\d{4}-\d{2}-\d{2})T/)!;
    expect([lv[1], lv[2]]).toEqual(["v13.40.0", "2026-11-03"]);
    expect(badan).toContain(`(rilis terbaru di Packagist ${lv[1]}, ${lv[2]})`);
    sah.add(lv[2]!);
    const ditemukan = [...badan.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
    for (const t of ditemukan) expect(sah.has(t), t).toBe(true);
    expect([...sah].sort()).toEqual(["2023-07-14", "2023-10-16", "2025-01-10", "2026-10-14", "2026-11-03", "2026-11-04"]);
    // tiap tanggal rilis yang ditulis halaman dipasangkan dengan versinya persis seperti di baris riset
    for (const [tgl, v] of [["2026-10-14", "1.26.1"], ["2025-01-10", "1.24.0"], ["2023-10-16", "1.21.0"]] as const) {
      expect(barisRiset("R5-190"), `${tgl} ${v}`).toContain(`${tgl} - PgBouncer ${v}`);
      expect(badan).toContain(`${v} (${tgl})`);
    }
    expect(badan).toContain("terbuka sejak 2023-07-14");
  });
  test("versi: tiap token versi di prosa (di luar URL dan angka ribuan) muncul di salah satu baris riset R5-190 sampai R5-194", () => {
    const r = risetSemua();
    const prosa = badan.replace(/\]\([^)]*\)/g, "]").replace(/<Snippet [^\n]*\/>/g, "");
    const token = [...prosa.matchAll(/v?\d+\.\d+(?:\.\d+)?(?![\d,])/g)].map((m) => m[0].replace(/^v/, "")).filter((t) => !/^\d{1,3}\.\d{3}$/.test(t));
    expect(new Set(token).size).toBeGreaterThan(12);
    for (const t of token) expect(r, `versi ${t}`).toContain(t);
  });
  test("port contoh Node.js sama dengan listen_port di pgbouncer.ini; ukuran pool contoh sama dengan bawaan Postgres.js di baris riset", () => {
    const port = ini.match(/^listen_port = (\d+)/m)![1];
    expect(badan).toContain(`postgres("postgres://pgbouncer.example:${port}/rekeningo", {`);
    expect(barisRiset("R5-193")).toContain("By default `max` is 10");
    expect(badan).toContain("  max: 10,");
  });
  test("tabel Sengaja belum: enam baris; angka diturunkan dari ini, kalkulator, dan hitungan", () => {
    const sb = tabelSetelah("### Sengaja belum dilakukan").slice(1);
    const labPrep = ini.match(/^max_prepared_statements = (\d+)/m)![1];
    const pct = String(bulat((27.8 / kalk.masukan.maxDbPerInstance) * 100, 1)).replace(".", ",");
    expect(sb).toEqual([
      ["Dua instance PgBouncer di belakang satu Service", "Lab menjalankan satu container", "Belum dijadwalkan"],
      ["`max_prepared_statements` bernilai 0", `Rekaman memakai ${labPrep}, dan nilai 0 tidak dijalankan`, "Belum dijadwalkan"],
      ["Satu instance PgBouncer dimatikan saat beban", `Lab tidak mematikannya, dan ${pct}% adalah Hitungan atas Asumsi`, "Belum dijadwalkan"],
      ["Lompatan tambahan p95 lewat PgBouncer", "Lab berjalan di satu mesin dan tidak mengukurnya", "Belum dijadwalkan"],
      ["Pooler bawaan database terkelola", "Penyedia belum dipilih", "[[t5-onprem]]"],
      ["Pemindai fitur sesi di kode service", "Belum ada di lab", "Belum dijadwalkan"],
    ]);
    expect(labPrep).toBe("100");
  });
  (tanpaLiteral ? test.skip : test)("kunci literal baris riset dan data JSON: versi, tanggal, URL, kutipan, dan hitungan tiap baris sama; kalkulator dan diagram sama dengan salinan beku", () => {
    for (const id of ["R5-190", "R5-191", "R5-192", "R5-193", "R5-194"]) expect(barisRiset(id).match(POLA_TOKEN) ?? [], id).toEqual(RISET_TOKEN[id]);
    expect(JSON.parse(baca("situs/data/widget/t5-pooler-kalkulator.json"))).toEqual(DATA_LITERAL.kalkulator);
    expect(JSON.parse(baca("situs/data/diagram/t5-pooler-inti.json"))).toEqual(DATA_LITERAL.diagram);
  });
});

describe("diagram Rantai dan kartu Cek diri: nilai diturunkan dari rekaman", () => {
  test("Rantai Inti: satu baris, dua simpul (galat 53300 dan paling banyak 20 koneksi), label 12 client 120 koneksi; sumber rekaman pooler.txt; nilai dari rekaman", () => {
    expect(diagram.baris).toHaveLength(1);
    const b = diagram.baris[0]!;
    expect(b.simpul).toHaveLength(2);
    expect(b.label).toBe("12 client, 120 koneksi");
    expect(b.sub).toBe(`role t5_app, max_connections ${PA.teks.match(/SHOW max_connections\s+-- (\d+)/)![1]}`);
    expect(b.simpul[0]).toEqual({ teks: `Tanpa pooler: galat ${PA.teks.match(/kode galat: (\d+)/)![1]}`, sub: "pooler.txt bagian A", nada: "warn", kode: false });
    expect(b.simpul[1]).toEqual({ teks: `Lewat PgBouncer: paling banyak ${PB.teks.match(/paling banyak <= (\d+) \(default_pool_size/)![1]} koneksi ke PostgreSQL`, sub: "pooler.txt bagian B", nada: "good", kode: false });
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab api-t5 · pooler.txt" });
    expect(diagram.catatan).toBe("Satu proses PgBouncer 1.26.1 di mode transaction, dan tiap koneksi hanya menjalankan SELECT 1 dengan jeda di antaranya. Rekaman ini menunjukkan jumlah koneksi, bukan kapasitas di bawah beban.");
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    if (!tanpaSidik) expect(sidik(JSON.stringify(JSON.parse(baca("situs/data/diagram/t5-pooler-inti.json"))))).toBe(SIDIK.diagram);
  });
  test("empat soal Cek diri bernomor 1 sampai 4 dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dengan jawabannya", () => {
    const cek = badan.slice(badan.indexOf("### Cek diri"), badan.indexOf("### Saat me-review kode AI"));
    const soal = [...cek.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([^\n]+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    const kartu = kartuSemua.filter((k) => k.halaman === "t5-pooler");
    expect(kartu.map((k) => k.id)).toEqual(["t5-pooler-1", "t5-pooler-2", "t5-pooler-3", "t5-pooler-4"]);
    soal.forEach((m, i) => {
      expect(kartu[i]!.tanya).toBe(m[2]);
      expect(kartu[i]!.jawab).toBe(m[3]);
      expect(kartu[i]!.url).toBe("tahap-5/pooler-koneksi/");
      expect(kartu[i]!.judul).toBe("5.17 Pooler koneksi: PgBouncer + ADR 52");
    });
    expect(soal[0]![3]).toContain("2.400 query selesai");
    expect(soal[0]![3]).toContain("role `t5_app` tidak melewati 97 koneksi");
    expect(soal[2]![3]).toBe("2 × 6 × 20 = 240 koneksi, lebih dari 97 tersedia. Dengan 30 per instance, 2 × 30 = 60 koneksi (Hitungan atas Asumsi dan dokumentasi, Tidak dijalankan).");
    expect(soal[3]![3]).toContain("300 − 97 = 203");
    expect(soal[1]![3]).toContain("Lab tidak menjalankannya lewat PgBouncer, jadi keduanya dites sebelum cutover (Tidak dijalankan).");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, jumlah elemen, tabel ADR, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: h2 Inti, h3 di Paham dan Putuskan dan Kunci, tanpa h4; daftar bernomor: pertanyaan Mulai (3), aturan ADR (9), pre-mortem (3); kotak centang 6", () => {
    const h = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(h).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 52: PgBouncer mode transaction di depan primary, dengan pool server terbatas dan jitter",
      "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    expect(badan.split("\n").filter((b) => /^\d+\. /.test(b))).toHaveLength(3 + 9 + 3);
    expect(badan.split("\n").filter((b) => /^- \[ \] /.test(b))).toHaveLength(6);
    expect(daftarBlok(badan)).toHaveLength(5);
  });
  (tanpaKunci ? test.skip : test)("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const baris = badan.split("\n").filter((b) => b.trim() !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaLiteral ? test.skip : test)("kalimat kunci literal (berkas kunci dirawat dengan tangan): tiap entri muncul TEPAT SEKALI sebagai baris utuh", () => {
    const baris = badan.split("\n");
    expect(KUNCI_LITERAL.length).toBeGreaterThan(80);
    for (const k of KUNCI_LITERAL) expect(baris.filter((b) => b === k), k.slice(0, 70)).toHaveLength(1);
  });
  test("jumlah elemen: lima Blok, satu Rantai, sembilan Snippet, satu KoneksiPooler, satu TabSet dengan enam Fragment, satu noscript, satu details tebakan, empat Cek diri, tujuh impor", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(9);
    expect(badan.match(/<KoneksiPooler /g)).toHaveLength(1);
    expect(badan.match(/<TabSet /g)).toHaveLength(1);
    expect(badan.match(/<Fragment slot=/g)).toHaveLength(6);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/^import /gm)).toHaveLength(7);
    expect(badan).not.toContain("SkripLama");
    expect(badan).not.toContain("<Tebak");
  });
  test("tabel GFM: jumlah kolom sama di header, pemisah, dan tiap baris; lima tabel di MDX", () => {
    const baris = badan.split("\n");
    const mulaiTabel: number[] = [];
    baris.forEach((b, i) => { if (b.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|") && !(baris[i - 1] ?? "").startsWith("<")) mulaiTabel.push(i); });
    expect(mulaiTabel).toHaveLength(5);
    for (const i of mulaiTabel) {
      const lebar = selTabel(baris[i]!).length;
      expect(/^\|[-| ]+\|$/.test(baris[i + 1]!), `pemisah di baris ${i + 2}`).toBe(true);
      expect(selTabel(baris[i + 1]!)).toHaveLength(lebar);
      for (let n = i; baris[n]?.startsWith("|"); n++) expect(selTabel(baris[n]!), `baris ${n + 1}`).toHaveLength(lebar);
    }
  });
  test("tabel ADR: header 5 kolom, tiap baris 5 sel; kolom A sampai D berurutan dan D dipilih; baris Cara kerja, Kelebihan, Kekurangan, Biaya operasional, Bukti", () => {
    const tabel = tabelSetelah("**Status:** diterima sesudah M46");
    expect(tabel).toHaveLength(6);
    expect(tabel[0]).toEqual(["", "A. Naikkan `max_connections`", "B. Kecilkan pool tiap pod", "C. Pooler bawaan database terkelola", "D. PgBouncer mode transaction"]);
    expect(tabel.slice(1).map((b) => b[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    for (const b of tabel) expect(b).toHaveLength(5);
    const bukti = tabel[5]!;
    expect(bukti[1]).toBe("Tidak dijalankan: dokumentasi PostgreSQL 17");
    expect(bukti[2]).toBe("Hitungan atas Asumsi, dan Tidak dijalankan");
    expect(bukti[3]).toBe("Tidak dijalankan: penyedia belum dipilih ([[t5-onprem]])");
    expect(bukti[4]).toBe("Rekaman lab `pooler.txt` bagian A dan B, satu role dan satu instance");
    expect(tabel[2]![4]).toBe("120 client dilayani paling banyak 20 koneksi ke PostgreSQL (`pooler.txt` bagian B)");
    expect(tabel[2]![2]).toBe(`Tanpa komponen baru, dan ${skenarioHasil[3]!.potensi} koneksi muat di ${skenarioHasil[3]!.tersedia}`);
    expect(tabel[3]![2]).toBe("5 pod tiap service sudah 150 koneksi, lebih dari 97, jadi penambahan pod membatalkannya (Hitungan atas Asumsi)");
    expect(skenarioHasil[4]!.potensi).toBe(150);
  });
  test("keputusan: sembilan aturan berurutan 1 sampai 9, 'Keputusan: opsi D', alasan A, B, C tiap satu butir, tiga pre-mortem, lima kapan salah, tabel Sengaja belum 6 baris", () => {
    const putusan = badan.slice(badan.indexOf("**Keputusan: opsi D.**"));
    expect(putusan.startsWith("**Keputusan: opsi D.** Sembilan aturan:")).toBe(true);
    const aturan = putusan.slice(0, putusan.indexOf("**Kenapa D, bukan A, B, atau C.**")).split("\n").filter((b) => /^\d+\. /.test(b));
    expect(aturan.map((b) => b.match(/^(\d+)\./)![1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    const m = kalk.masukan;
    expect(aturan[1]).toContain(`dibatasi ${m.instance * m.maxDbPerInstance} dari ${m.maxConnections - m.cadangan} tersedia (Asumsi naskah)`);
    expect(aturan[1]).toContain(`\`max_db_connections\` ${m.maxDbPerInstance} per instance (Asumsi desain)`);
    expect(aturan[2]).toContain(`dinaikkan dari bawaan ${bawaanClient()} ke ${m.maxClient} per instance (Asumsi)`);
    expect(aturan[3]).toContain("`query_wait_timeout`, bawaan 120 detik");
    expect(aturan[6]).toContain("`MaxConnLifetimeJitter` 5 menit (Asumsi)");
    const kenapa = putusan.slice(putusan.indexOf("**Kenapa D, bukan A, B, atau C.**"), putusan.indexOf("**Pre-mortem.**")).split("\n").filter((b) => b.startsWith("- "));
    expect(kenapa.map((b) => b.match(/^- \*\*([^*]+)\*\*/)![1])).toEqual(["A ditolak", "B tidak cukup", "C tidak dipilih untuk lab"]);
    const pre = putusan.slice(putusan.indexOf("**Pre-mortem.**"), putusan.indexOf("**Kapan keputusan ini salah.**"));
    expect(pre.split("\n").filter((b) => /^\d+\. /.test(b))).toHaveLength(3);
    const salah = putusan.slice(putusan.indexOf("**Kapan keputusan ini salah.**"), putusan.indexOf("**Yang akan merevisinya.**")).split("\n").filter((b) => b.startsWith("- "));
    expect(salah).toHaveLength(5);
    const sb = tabelSetelah("### Sengaja belum dilakukan");
    expect(sb[0]).toEqual(["Yang ditunda", "Kenapa ditunda", "Muncul lagi di"]);
    expect(sb).toHaveLength(7);
    for (const b of sb) expect(b).toHaveLength(3);
    expect(sb.slice(1).map((b) => b[2])).toEqual(["Belum dijadwalkan", "Belum dijadwalkan", "Belum dijadwalkan", "Belum dijadwalkan", "[[t5-onprem]]", "Belum dijadwalkan"]);
    expect(badan).toContain("**Status:** diterima sesudah M46 ([[t5-m46]]). Naskah tidak menulis tanggal ADR.");
    function bawaanClient(): string { return barisRiset("R5-190").match(/`max_client_conn` "Maximum number of client connections allowed\." Default: (\d+)/)![1]!; }
  });
  test("front matter dikunci: description memuat PgBouncer, mode transaction, max_connections, tiga cara lain; title sama dengan registry", () => {
    expect(frontmatter).toContain("description: Rekeningo memasang PgBouncer di mode transaction, supaya koneksi pod tidak langsung memenuhi max_connections PostgreSQL. ADR 52 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
    expect(frontmatter.split("\n").filter((b) => b.trim() !== "")).toHaveLength(2);
    expect(frontmatter).not.toMatch(/240|per pasangan|53300/); // description tidak membuka jawaban tebakan
    if (!tanpaSidik) expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("istilah diberi arti di pemakaian pertama: pooler koneksi di Inti, pool pod dan pool server sebelum dipakai, label sumber dengan tautan di Inti", () => {
    const inti = badan.slice(0, badan.indexOf("<details class=\"question\">"));
    expect(inti).toContain("Pooler koneksi adalah program di antara aplikasi dan PostgreSQL.");
    expect(inti).toContain("Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `pooler.txt`");
    const urutan = ["Hitungan adalah hasil rumus", "Asumsi adalah angka pilihan penulis tanpa rekaman.", "Tidak dijalankan berarti dicek ke dokumentasi atau kode, tanpa dijalankan.", "Penalaran adalah kesimpulan dari kode atau angka di halaman"].map((x) => badan.indexOf(x));
    expect(urutan.every((i) => i > 0)).toBe(true);
    expect(urutan).toEqual([...urutan].sort((a, b) => a - b));
    for (const t of ["Hitungan atas Asumsi", "Tidak dijalankan", "Penalaran", "penalaran"]) expect(badan.indexOf(t), t).toBeGreaterThan(badan.indexOf("<Blok nama=\"Coba\"") - 1);
    expect(badan.indexOf("Pool pod adalah kumpulan koneksi di dalam satu pod, dan pool server adalah kumpulan koneksi server di PgBouncer")).toBeLessThan(badan.indexOf("Bagian A rekaman menjalankan 12 client dengan pool pod 10"));
  });
  test("satu kata per konsep: 'replika', 'rahasia', 'pelanggan', 'pembeli', 'layanan', 'Anda', 'kita' tidak muncul di prosa; 'client' dan 'service' dipakai", () => {
    const prosa = badan.replace(/`[^`]*`/g, "").replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
    for (const k of ["replika", "rahasia", "pelanggan", "pembeli", "layanan", "Anda", "kita"]) expect(prosa, k).not.toMatch(new RegExp(`\\b${k}\\b`, "i"));
    expect(prosa).toMatch(/\bclient\b/);
    expect(prosa).toMatch(/\bservice\b/);
    expect(badan).not.toMatch(/\bantrean\b/i); // istilah queue, bukan antrean (audit bahasa)
  });
  test("klaim universal dan negatif berlingkup: 'hanya', 'tidak ada', 'tidak pernah', 'semua', 'setiap', 'selalu', 'tiap' dihitung dan tiap kemunculan terkunci di baris yang dikunci", () => {
    const hitungKata = (re: RegExp) => (badan.match(re) ?? []).length;
    const kini = {
      hanya: hitungKata(/\bhanya\b/gi), tidakAda: hitungKata(/\btidak ada\b/gi), tidakPernah: hitungKata(/\btidak pernah\b/gi),
      semua: hitungKata(/\bsemua\b/gi), setiap: hitungKata(/\bsetiap\b/gi), selalu: hitungKata(/\bselalu\b/gi), tiap: hitungKata(/\btiap\b/gi),
    };
    if (!tanpaSidik) expect(kini).toEqual(SIDIK.kata);
    // tiap "tidak ada" ditemani lingkup di kalimat yang sama
    for (const b of badan.split("\n")) if (/\btidak ada\b/i.test(b) && !b.startsWith("|")) expect(b, b.slice(0, 80)).toMatch(/lab|kode|file Go|api-t5|PgBouncer|rekaman|dokumentasi|halaman/i);
    expect(kini.selalu).toBe(0);
    expect(kini.setiap).toBe(0);
  });
  test("token angka di badan: himpunan token dan jumlahnya dikunci (mutan satu digit mengubah token atau jumlahnya); token kunci diturunkan dari sumber", () => {
    const angka: Record<string, number> = {};
    for (const m of badan.matchAll(/\d[\d.,]*\d|\d/g)) angka[m[0]] = (angka[m[0]] ?? 0) + 1;
    const urut = Object.fromEntries(Object.entries(angka).sort(([a], [b]) => a.localeCompare(b)));
    if (!tanpaSidik) expect(urut).toEqual(SIDIK.angka);
    // token yang punya satu arti diturunkan dari sumber
    const arti: Record<string, number> = { "53300": Number(PA.teks.match(/kode galat: (\d+)/)![1]), "120": 12 * 10, "2.400": Number(PB.teks.match(/query selesai: (\d+)/)![1]) };
    arti["2.400"] = angkaId("2.400");
    for (const [tok, nilai] of Object.entries(arti)) {
      expect(badan, tok).toContain(tok);
      expect(angkaId(tok), tok).toBe(nilai);
    }
    expect(PB.teks).toContain("query selesai: 2400");
    expect(badan).not.toMatch(/\b2400\b/);
    expect(badan).not.toMatch(/\b53\.300\b/);
  });
});
