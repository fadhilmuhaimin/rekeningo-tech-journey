// Penjaga halaman 5.5 (keputusan 1516 sampai 1518): angka, nama, ID, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim "dibaca dari kode", klaim negatif berlingkup, Hitungan, diagram Rantai, widget tebak dan banding, baris riset, dan kartu
// Cek diri di read-replica.mdx diturunkan dari rekaman labs/t5-replika (replika.txt, jeda.txt, konflik.txt, baca.txt) dan
// labs/api-t5 (laporan.txt, bayar.go, kirim.go, main.go, replika.go, migrasi), README dan run.py lab, halaman tetangga, naskah
// Tahap 5, registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Aturan tes ini (pelajaran 3.4 sampai 5.4): hanya
// membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan
// nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter,
// diagram, widget, snippet, baris riset) dikunci dengan sidik jari dan nilai daun.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-replica-inti.json";
import tebakMentah from "../../data/widget/t5-replica-tebak.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok, cekTemplat } from "./blok";
import { BANDING_DAUN, DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, TEBAK_DAUN } from "./read-replica.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-5/read-replica.mdx";
const IDS_RISET = ["R5-130", "R5-131", "R5-132", "R5-133", "R5-134"];
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const banding = JSON.parse(baca("situs/lama/widgets/data/t5-replica-banding.json")) as Banding;
const diagram = DataRantai.parse(diagramMentah);
const tebak = DataTebak.parse(tebakMentah);
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const replika = baca("labs/t5-replika/output/replika.txt");
const jeda = baca("labs/t5-replika/output/jeda.txt");
const konflik = baca("labs/t5-replika/output/konflik.txt");
const bacaTxt = baca("labs/t5-replika/output/baca.txt");
const laporan = baca("labs/api-t5/output/laporan.txt");
const readme = baca("labs/t5-replika/README.md");
const runPy = baca("labs/t5-replika/run.py");
const initPrimary = baca("labs/t5-replika/init-primary.sh");
const compose = baca("labs/t5-replika/docker-compose.yml");
const bayarGo = baca("labs/api-t5/internal/service/bayar.go");
const kirimGo = baca("labs/api-t5/internal/service/kirim.go");
const mainGo = baca("labs/api-t5/cmd/api/main.go");
const replikaGo = baca("labs/api-t5/internal/service/replika.go");
const migrasi25 = baca("labs/api-t5/migrasi/000025_tabel_tahap5.up.sql");
const prd = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const m40 = baca("situs/src/content/docs/tahap-5/m40-pembayaran-melambat.mdx");
const skemaHal = baca("situs/src/content/docs/tahap-5/skema-data.mdx");
const adr60 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const hal45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const bandingCjs = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/banding.js")) as { cekData: (d: unknown) => string[] };

interface Opsi { id: string; nama: string; baris: { id: string; label: string; sub?: string }[][]; judulBaris: string[] }
interface Fitur { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }
interface Banding { judul: string; opsi: Opsi[]; fitur: Fitur[] }
interface H { bagian?: number | string; id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; path?: string; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; pendek?: string }
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
const rp = (n: number): string => `Rp${rib(n)}`;
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
// Pembulatan setengah ke atas seperti pembaca (bukan toFixed): 0,5 selalu naik.
const bulat = (x: number, n: number): number => Math.round(Number((x * 10 ** n).toPrecision(12))) / 10 ** n;
const koma = (x: number, n: number): string => bulat(x, n).toLocaleString("id-ID", { minimumFractionDigits: n, maximumFractionDigits: n });
const hitung = (teks: string, potong: string): number => teks.split(potong).length - 1;

// ---- rekaman: bagian dan nomor baris Snippet --------------------------------------------------------------------------
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
const RP = bagian(replika), JD = bagian(jeda), KF = bagian(konflik), BC = bagian(bacaTxt), LP = bagian(laporan);
const bag = (b: ReturnType<typeof bagian>, huruf: string, berikut?: string): [number, number] => {
  const a = b.nomor((x) => x.startsWith(`# --- ${huruf}. `));
  const z = berikut ? b.nomor((x) => x.startsWith(`# --- ${berikut}. `)) - 1 : b.baris.length;
  return [a, z];
};
const [rA0, rA1] = bag(RP, "A", "B"), [rB0, rB1] = bag(RP, "B");
const [jA0, jA1] = bag(JD, "A", "B"), [jB0, jB1] = bag(JD, "B");
const [kA0, kA1] = bag(KF, "A", "B"), [kB0, kB1] = bag(KF, "B", "C"), [kC0, kC1] = bag(KF, "C", "D"), [kD0, kD1] = bag(KF, "D");
const [cA0, cA1] = bag(BC, "A", "B");
const [lA0, lA1] = bag(LP, "A", "B"), [lB0, lB1] = bag(LP, "B", "C"), [lC0, lC1] = bag(LP, "C");
const bagRA = RP.teks(rA0, rA1), bagRB = RP.teks(rB0, rB1), bagJA = JD.teks(jA0, jA1), bagJB = JD.teks(jB0, jB1);
const bagKA = KF.teks(kA0, kA1), bagKB = KF.teks(kB0, kB1), bagKC = KF.teks(kC0, kC1), bagKD = KF.teks(kD0, kD1);
const bagCA = BC.teks(cA0, cA1), bagLA = LP.teks(lA0, lA1), bagLB = LP.teks(lB0, lB1), bagLC = LP.teks(lC0, lC1);

const kepala = cocok(RP.baris[1]!, /^# PostgreSQL (\d+\.\d+) \([^)]*\) · (go[\d.]+) · pgx (v[\d.]+) · schema /);
// replika.txt A: jumlah baris ledger di tiga node
const HITUNG = [...bagRA.matchAll(/^ (\d+)\s+\| (\d+)\s+\| (\d+)\s*$/gm)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number]);
// replika.txt B: penolakan di standby, per pernyataan
const TOLAK = [...bagRB.matchAll(/^(replika|sinkron)=> (.+)\nERROR:  (.+)\nSQLSTATE (\w+)$/gm)].map((m) => ({ node: m[1]!, sql: m[2]!, galat: m[3]!, kode: m[4]! }));
// jeda.txt
const J_BAYAR = cocok(bagJA, /pembayaran selesai: (\d+) dari (\d+), semua 201/);
const J_RPS = cocok(bagJA, /\.\/beban -rps (\d+) -detik (\d+) -pengguna (\d+) -hanya-bayar/);
const J_SELISIH = Number(cocok(bagJB, /# Selisih jurnal bayar primary lawan replika yang ditahan: (\d+)/)[1]);
// konflik.txt
const SHOW = [...bagKA.matchAll(/^replika=> SHOW (\w+)\n[^\n]*\n-+\n ([^\n]+)\n/gm)].map((m) => [m[1]!, m[2]!] as [string, string]);
const K_C = cocok(bagKC, /ERROR:  canceling statement due to statement timeout\nSQLSTATE (\d+)\n# Berhenti sesudah paling sedikit (\d+) detik dan sebelum (\d+) detik;/);
const K_D = cocok(bagKD, /ERROR:  canceling statement due to conflict with recovery\nSQLSTATE (\d+)\n# Berhenti sesudah paling sedikit (\d+) detik \(max_standby_streaming_delay bawaan (\d+) detik\) dan sebelum (\d+) detik;/);
const CONFL = [...konflik.matchAll(/confl_snapshot\n-+\n (\d+)\n/g)].map((m) => Number(m[1]));
const K_B = cocok(bagKB, /# query 3 detik: .*: ya\n# Query selesai tanpa galat dan melihat (\d[\d.]*) baris/);
// baca.txt A
const B_SALDO = cocok(bagCA, /primary=> SELECT saldo_cache FROM t5_ledger\.buku WHERE akun_id = 419\n[^\n]*\n-+\n (\d+)\n[\s\S]*?replika=> SELECT saldo_cache FROM t5_ledger\.buku WHERE akun_id = 419\n[^\n]*\n-+\n (\d+)\n/);
const B_KIRIM = cocok(bagCA, /\$ curl -i -X POST '\/kiriman'[^\n]*-d '\{"ke_nomor_karyawan": "(\w+)", "nominal": (\d+)\}'\nHTTP\/1\.1 422 Unprocessable Entity\n[^\n]*\n\n\{"type":"\/problems\/(saldo-kurang)"/);
const B_BAYAR = cocok(bagCA, /-d '\{"ke": (\d+), "nominal": (\d+)\}'\nHTTP\/1\.1 201 Created[\s\S]*?\{"id":(\d+),"saldo":(\d+)\}/);
// laporan.txt (5.4): dasar cache dan data lab
const L_C = cocok(bagLC, /mode redis, ttl (\d+) detik, hit (\d+), miss (\d+), baca database (\d+)\nhit rate: (\d+) dari (\d+) = 0%/);
const L_K = cocok(bagLC, /-> hit (\d+), miss (\d+), baca database (\d+)\nhit rate kontrol: (\d+) dari (\d+) = (\d+)%/);
const L_JARAK = cocok(bagLC, /dua putaran berjarak ([\d,]+) detik \(TTL (\d+) detik\)/);
const L_MS = Number(cocok(bagLA, /waktu eksekusi query laporan satu warung di database di bawah (\d+) ms/)[1]);
const L_WARUNG = Number(cocok(bagLB, /Di lab polling berasal dari (\d+) warung,/)[1]);

// ---- naskah: ADR 46, beban, dan ADR 45 --------------------------------------------------------------------------------
const barisAdr46 = naskah.split("\n").find((b) => b.startsWith("| 46 | Satu read replica asinkron"))!;
const sel = (baris: string, n: number): string => baris.split(" | ")[n]!;
const naskahTabel = (kata: string): string => {
  const b = naskah.split("\n").find((x) => x.startsWith(`| ${kata} |`));
  expect(b, `baris tabel naskah ${kata}`).toBeDefined();
  return b!;
};
const RPS_PUNCAK = angka(cocok(naskahTabel("Request per detik"), /dan ([\d.]+,\d) puncak/)[1]!);
const TRX3 = angka(cocok(naskahTabel("Transaksi uang (bayar, transfer, QR)"), /6,94 rata-rata dan ([\d,]+) puncak \(trx 2: ([\d,]+) dan ([\d,]+)\)/)[1]!);
const TRX2 = angka(cocok(naskahTabel("Transaksi uang (bayar, transfer, QR)"), /6,94 rata-rata dan ([\d,]+) puncak \(trx 2: ([\d,]+) dan ([\d,]+)\)/)[3]!);
const LAPORAN_DETIK = Number(cocok(naskahTabel("Polling laporan"), /query (\d+) ms; 8 vCPU/)[1]);
const W = 0.02;
const AMBANG = 5;

// ---- tabel di halaman -------------------------------------------------------------------------------------------------
const snip = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].filter((m) => /file="/.test(m[1]!)).map((m) => {
  const f = m[1]!.match(/file="([^"]+)"/)![1]!;
  const [a, b] = m[1]!.match(/lines="([^"]+)"/)![1]!.split(":").map(Number) as [number, number];
  return { f, a, b, judul: m[1]!.match(/title="([^"]+)"/)![1]!, teks: baca(f).split("\n").slice(a - 1, b).join("\n") };
});

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.5 ada, konsep, jalur inti, prasyarat 5.4, lab t5-replika, peran backend, ADR 46; judul sama dengan peta naskah dan registry", () => {
    expect(dari("t5-read-replica")).toMatchObject({ ada: true, nomor: "5.5", jenis: "konsep", bagian: 4, inti: true, prasyarat: ["t5-m40"], lab: ["t5-replika"], tahap: 5, peran: ["backend"], adr: [46], pendek: "Read replica dan model baca" });
    expect(dari("t5-m40").nomor).toBe("5.4");
    expect(frontmatter).toContain('title: "5.5 Read replica dan model baca untuk laporan + ADR 46"');
    expect(dari("t5-read-replica").judul).toBe("Read replica dan model baca untuk laporan + ADR 46");
    expect(naskah).toContain("| 5.5 | 4 | Read replica dan model baca untuk laporan + ADR 46 | Konsep + ADR | ★ | t5-replika | banding |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-m40\]\] · Jalur inti<\/p>/);
    expect(dari("t5-read-replica").menit).toBe(Number(m[1]) + Number(m[2]));
    expect(dari("t5-read-replica").path).toBe("tahap-5/read-replica.md");
    expect(BERKAS).toBe(`situs/src/content/docs/${dari("t5-read-replica").path!.replace(/\.md$/, ".mdx")}`);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(2);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; satu Rantai ringkas; impor dan jumlah komponen tetap", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan.match(/<Rantai data=\{intiDiagram\} ringkas \/>/g)).toHaveLength(1);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<Tebak /g)).toHaveLength(1);
    expect(badan.match(/<TabSet /g)).toHaveLength(1);
    expect(badan.match(/<Snippet file=/g)).toHaveLength(11);
    expect(badan.match(/<Snippet lang=/g)).toHaveLength(3);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect([...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro", "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro",
      "Tebak ../../../widgets/tebak/Tebak.tsx", "intiDiagram ../../../../data/diagram/t5-replica-inti.json", "dataTebak ../../../../data/widget/t5-replica-tebak.json",
    ]);
    harus('<SkripLama daftar={["cerita","banding"]} />');
    harus('<WidgetLama nama="banding" src="data/t5-replica-banding.json" />');
    harus("<Tebak client:visible data={dataTebak} />");
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["t3-cache", "t3-pool", "t4-adr-45", "t5-adr-60", "t5-fanout", "t5-lag", "t5-m40", "t5-m41", "t5-m42", "t5-prd", "t5-rpo-rto", "t5-skema", "berikutnya"].sort());
    const sesuai: [string, string, string][] = [
      ["t5-prd", "5.1", "PRD v5"], ["t5-skema", "5.3", "Skema data"], ["t5-m40", "5.4", "M40"], ["t5-m41", "5.6", "M41"], ["t5-lag", "5.7", "Replication lag"],
      ["t5-m42", "5.8", "M42"], ["t5-rpo-rto", "5.9", "RPO, RTO"], ["t5-fanout", "5.15", "Fan-out"], ["t5-adr-60", "5.30", "ADR 60"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t3-cache").ada).toBe(true);
    expect(dari("t3-pool").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(badan).toContain("([Label sumber](/cara-pakai/#label-sumber))");
  });
  test("janji halaman lain ke 5.5 ditepati: 5.4 menunjuk halaman ini untuk cara lain melayani laporan; PRD v5 dan ADR 45 menulis ADR 46 dan aturan 2", () => {
    expect(m40).toContain("Cara lain melayani laporan ditimbang di [[t5-read-replica]].");
    expect(m40).toContain("- [[t5-read-replica]]: salinan database yang melayani bacaan, dan model baca untuk laporan. Keputusannya ADR 46.");
    expect(prd).toMatch(/^\| 45 \(\[\[t4-adr-45\]\]\) \| Satu dari tiga pemicu read replica adalah laporan merchant real-time yang diminta PRD v5 \| Laporan merchant real-time \| \[\[t5-m40\]\] dan \[\[t5-read-replica\]\] \|$/m);
    expect(hal45).toContain("2. Uang tidak dibaca dari salinan di luar primary. Saldo yang menentukan bayar dibaca dari `buku` di dalam transaction");
    expect(hal45).toContain("Read replica, bila nanti dipasang, hanya untuk laporan.");
    expect(hal45).toContain("Read replica: query baca yang sudah memakai index menahan 5 koneksi");
    expect(adr60).toMatch(/CDC dengan Debezium/);
    expect(naskah).toContain("| M41 | 3 |");
    expect(naskah).toMatch(/Sesudah ADR 46 tim Akun memindahkan bacaan riwayat dan saldo tampil ke replica/);
    expect(naskah).toMatch(/\| ADR 47: tiga kelas baca\./);
    expect(naskah).toMatch(/\| ADR 48: ledger memakai replica sinkron kuorum/);
  });
  test("halaman tidak membuka isi 5.7 dan 5.9: tanpa token LSN, read-your-writes, remote_apply, ANY 1, Patroni; ADR lain hanya sebagai nama", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 45", "ADR 46"]);
    expect(badan).not.toMatch(/X-Lsn|token LSN|read-your-writes|remote_apply|ANY 1|Patroni|CloudNativePG|synchronous_standby_names|pg_promote/i);
    expect(badan).not.toMatch(/ADR 4[7-9]|ADR 5\d/);
  });
  test("tabel GFM: jumlah kolom sama di header, pemisah, dan tiap baris (enam dan tiga); ID internal tidak tampil", () => {
    const tabel = badan.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel).toHaveLength(7 + 6);
    const adr = tabel.slice(0, 7), belum = tabel.slice(7);
    for (const b of adr) expect(b.split("|").length - 2, b).toBe(6);
    for (const b of belum) expect(b.split("|").length - 2, b).toBe(3);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/keputusan \d{2,4}|#\d{3}\b|PR \d{3}\b/i);
    expect(badan).not.toMatch(/(?<!\[\[)\b[A-G]\d\b(?!\.\d)/);
    expect(badan).not.toMatch(/\d B\b/);
    expect(badan).not.toMatch(/\b(Anda|kita|pengguna|pemakai|klien|berkas|murah|mahal)\b/);
  });
});

describe("rekaman replika.txt: topologi dan penolakan tulisan di standby", () => {
  test("kepala rekaman: PostgreSQL 17.11, go1.27.3, pgx v5.11.0 sama dengan tab Go, README lab, dan baris riset", () => {
    expect(kepala.slice(1)).toEqual(["17.11", "go1.27.3", "v5.11.0"]);
    for (const k of ["| PostgreSQL | 17.11 (", "| Go | 1.27.3 |", "| pgx | v5.11.0 ("]) expect(readme, k).toContain(k);
    harus("*Dijalankan: lab api-t5 dan t5-replika, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0 (rekaman `replika.txt`, `jeda.txt`, `konflik.txt`, `baca.txt`).*");
    expect(barisRiset("R5-130")).toContain("PostgreSQL 17.11, go1.27.3, pgx v5.11.0");
  });
  test("bagian A: dua standby streaming dan async, dua slot fisik; jurnal, posting, dan buku sama di tiga node", () => {
    expect([...bagRA.matchAll(/^ (replika_\w+)\s+\| (\w+)\s+\| (\w+)\s*$/gm)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)).toEqual(["replika_laporan streaming async", "replika_sinkron streaming async"]);
    expect([...bagRA.matchAll(/^ (slot_\w+)\s+\| (\w+)\s+\| (\w)\s*$/gm)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)).toEqual(["slot_laporan physical t", "slot_sinkron physical t"]);
    expect(HITUNG).toHaveLength(3);
    expect(new Set(HITUNG.map((h) => h.join(","))).size).toBe(1);
    const [j, p, bk] = HITUNG[0]!;
    harus(`Ketiga node memuat ${rib(j)} jurnal, ${rib(p)} posting, dan ${rib(bk)} buku di bagian A.`);
    expect(diagram.baris[0]!.simpul[0]).toMatchObject({ teks: "Isi sama di tiga node", sub: `${rib(j)} jurnal` });
    harus("Lab `t5-replika` menjalankan satu primary dan dua standby di container lokal.");
    harus("Primary menahan WAL untuk tiap standby lewat slot replikasi fisik, `slot_laporan` dan `slot_sinkron`:");
    expect(initPrimary).toContain("pg_create_physical_replication_slot('slot_laporan'), pg_create_physical_replication_slot('slot_sinkron')");
    expect(readme).toContain("| `replika` | `t5-replika-replika-1`");
    expect(readme).toMatch(/\| `sinkron` \|[^\n]*standby yang menjadi sinkron lewat `synchronous_standby_names`/);
  });
  test("bagian B: sembilan jenis pernyataan dijawab 25006, SET TRANSACTION READ WRITE 0A000; UPDATE ditolak di dua standby; data tidak berubah", () => {
    expect(TOLAK.map((t) => `${t.node} ${t.sql.split(" ").slice(0, 2).join(" ")} ${t.kode}`)).toEqual([
      "replika UPDATE t5_ledger.buku 25006", "sinkron UPDATE t5_ledger.buku 25006", "replika INSERT INTO 25006", "replika DELETE FROM 25006", "replika TRUNCATE t5_ledger.posting 25006",
      "replika CREATE TABLE 25006", "replika CREATE INDEX 25006", "replika ALTER TABLE 25006", "replika DROP TABLE 25006", "replika SELECT id 25006",
      "replika SET TRANSACTION 0A000", "replika PREPARE TRANSACTION 25006",
    ]);
    expect(TOLAK.find((t) => t.sql.startsWith("SELECT id"))!.sql).toContain("FOR UPDATE");
    harus("UPDATE, INSERT, DELETE, TRUNCATE, CREATE, ALTER, DROP, `SELECT ... FOR UPDATE`, dan `PREPARE TRANSACTION` dijawab 25006. `SET TRANSACTION READ WRITE` dijawab 0A000.");
    expect(cocok(bagRB, /# Sesudah semua penolakan, jumlah baris jurnal dan posting ditambah total saldo di tiga node sama dengan sebelumnya: ya/)).toBeTruthy();
    harus("Sesudah semua penolakan, jumlah jurnal, posting, dan total saldo di tiga node sama dengan sebelumnya.");
    expect(bagRB).toContain("# baca-saja standby, bukan milik trigger append-only ledger.");
    harus("Pesannya milik mode baca-saja standby, bukan milik trigger append-only ledger (README lab).");
    expect(readme).toContain("Pesannya milik mode baca-saja standby, bukan milik trigger append-only ledger.");
    expect(riset).toContain("SELECT FOR UPDATE, dan PREPARE TRANSACTION dijawab 25006; SET TRANSACTION READ WRITE dijawab 0A000");
  });
  test("rentang Snippet rekaman: tiap lines sama dengan bagian atau blok yang diturunkan dari berkasnya", () => {
    const nomorRP = (b: (x: string) => boolean, dariIdx = 0) => RP.nomor(b, dariIdx);
    expect(snip.map((s) => `${s.f.split("/").pop()} ${s.a}:${s.b}`)).toEqual([
      "replika.txt 22:33", "replika.txt 75:77", "replika.txt 102:111", "jeda.txt 5:12", "jeda.txt 43:55", "konflik.txt 12:27", "konflik.txt 51:54", "konflik.txt 68:78",
      "baca.txt 44:60", "bayar.go 58:65", "main.go 153:161",
    ]);
    const rQ = nomorRP((x) => x === "primary=> SELECT application_name, state, sync_state FROM pg_stat_replication ORDER BY application_name");
    expect(snip[0]).toMatchObject({ a: rQ, b: RP.nomor((x) => x === "(2 rows)", RP.nomor((x) => x.startsWith("primary=> SELECT slot_name")) ) });
    const rU = nomorRP((x) => x.startsWith("replika=> UPDATE t5_ledger.buku"), rB0);
    expect(snip[1]).toMatchObject({ a: rU, b: rU + 2 });
    const rF = nomorRP((x) => x.startsWith("replika=> SELECT id FROM t5_ledger.buku WHERE id = 10 FOR UPDATE"));
    expect(snip[2]).toMatchObject({ a: rF, b: RP.baris.length - 1 });
    expect(RP.baris[snip[2]!.b - 1]).toMatch(/^# Sesudah semua penolakan/);
    expect(snip[3]).toMatchObject({ a: jA0, b: JD.nomor((x) => x.startsWith("jeda byte WAL tertinggi"), jA0) });
    expect(JD.baris[snip[3]!.b - 1]).toMatch(/^jeda byte WAL tertinggi/);
    const jP = JD.nomor((x) => x.startsWith("$ POST /transfers sebanyak lima kali"), jB0);
    expect(snip[4]).toMatchObject({ a: jP, b: JD.nomor((x) => x.startsWith("# Selisih jurnal bayar primary lawan replika yang ditahan"), jP) });
    expect(snip[5]).toMatchObject({ a: KF.nomor((x) => x === "replika=> SHOW max_standby_streaming_delay"), b: KF.nomor((x) => x.startsWith("# Pengaturan bawaan: standby menunggu"), kA0) });
    expect(KF.baris[snip[5]!.b - 1]).toMatch(/^# Pengaturan bawaan: standby menunggu sampai 30 detik/);
    const kCe = KF.nomor((x) => x === "ERROR:  canceling statement due to statement timeout");
    expect(snip[6]).toMatchObject({ a: kCe - 1, b: kCe + 2 });
    expect(KF.baris[snip[6]!.a - 1]).toMatch(/^# statement_timeout 20 detik: WAL pembersihan/);
    const kDe = KF.nomor((x) => x === "ERROR:  canceling statement due to conflict with recovery");
    expect(snip[7]).toMatchObject({ a: kDe - 1, b: KF.nomor((x) => x.startsWith("# Pencacah konflik snapshot di katalog replika naik dari 0 ke 1"), kDe) });
    expect(KF.baris[snip[7]!.b - 1]).toMatch(/^# Pencacah konflik snapshot di katalog replika naik dari 0 ke 1 hanya pada skenario ini\./);
    const bS = BC.nomor((x) => x === "primary=> SELECT saldo_cache FROM t5_ledger.buku WHERE akun_id = 419", cA0);
    expect(snip[8]).toMatchObject({ a: bS, b: BC.nomor((x) => x.startsWith('{"type":"/problems/saldo-kurang"'), bS) });
    const gB = bayarGo.split("\n");
    expect(gB[snip[9]!.a - 1]).toBe("\terr = s.repo.DalamTx(ctx, func(tx repo.Tx) error {");
    expect(gB[snip[9]!.b - 1]).toBe("\t\t\treturn ErrSaldoKurang");
    expect(gB[snip[9]!.b - 2]).toBe("\t\tif dari.Saldo < jumlah { // dibaca sesudah lock: transaction lain dari buku ini menunggu");
    const gM = mainGo.split("\n");
    expect(gM[snip[10]!.a - 1]).toBe("\tvar replika *repo.Repo");
    expect(gM[snip[10]!.b - 1]).toBe("\t}");
    expect(gM[snip[10]!.b - 2]).toBe("\t\treplika = &rr");
    for (const s of snip) {
      expect(s.judul.startsWith("Rekaman lab: labs/") || s.judul.startsWith("Kode lab: labs/") || s.judul.startsWith("labs/")).toBe(true);
      expect(s.teks).not.toMatch(/R\d-\d{2,3}|keputusan \d{2,4}|PR \d{3}/i);
    }
  });
});

describe("rekaman jeda.txt dan konflik.txt: jeda sebagai batas, statement_timeout, dan konflik dengan replay", () => {
  test("jeda alami: 100 pembayaran per detik selama 10 detik, 1.000 dari 1.000 201; hanya batas 1 detik dan 16 MiB; nilai tidak direkam", () => {
    expect(J_RPS.slice(1).map(Number)).toEqual([100, 10, 200]);
    expect(J_BAYAR.slice(1).map(Number)).toEqual([J_RPS[1] ? Number(J_RPS[1]) * Number(J_RPS[2]) : 0, 1000]);
    expect(bagJA).toContain("replay_lag tertinggi di kedua standby di bawah 1 detik (batas lab; nilai tidak direkam): ya");
    expect(bagJA).toContain("jeda byte WAL tertinggi di kedua standby di bawah 16 MiB (batas lab; nilai tidak direkam): ya");
    harus("Lab menjalankan 100 pembayaran per detik selama 10 detik lewat `api-t5`. Semua 1.000 pembayaran 201, dan jeda replay tertinggi di kedua standby ada di bawah 1 detik. Nilai jedanya tidak direkam, hanya batasnya:");
    expect(bagJA).toContain("Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab");
    expect(readme).toContain("Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab dan tetap Ilustrasi");
    harus("Jeda ±2 detik di cerita [[t5-m41]] tidak terjadi dengan sendirinya di lab, jadi ia Ilustrasi.");
  });
  test("jeda buatan: pg_wal_replay_pause, selisih 5 jurnal bayar, WAL diterima tetapi belum diputar; standby sinkron tidak ditahan", () => {
    expect(bagJB).toContain("replika=> SELECT pg_wal_replay_pause()");
    expect(J_SELISIH).toBe(5);
    expect(bagJB).toContain("# Replika sudah menerima WAL sampai posisi tulis terakhir, tetapi belum memutar ulangnya: ya");
    harus(`Bagian B menahan replay dengan \`pg_wal_replay_pause()\` untuk memperagakan jeda. Replica sudah menerima WAL sampai posisi tulis terakhir tetapi belum memutarnya, dan selisihnya ${J_SELISIH} jurnal bayar:`);
    expect(bagJB).toContain("(di bagian ini ia asinkron: synchronous_standby_names kosong)");
  });
  test("konflik bagian A: bawaan 30s, off, 0; kalimat dokumentasi dan lab cocok", () => {
    expect(SHOW).toEqual([["max_standby_streaming_delay", "30s"], ["hot_standby_feedback", "off"], ["statement_timeout", "0"]]);
    harus("Dokumentasi menulis bahwa `max_standby_streaming_delay` bawaannya 30 detik");
    harus("Pengaturan di lab sama dengan itu:");
    harus("Dokumentasi menulis bawaannya off, dan pengaturan ini bisa menggembungkan tabel di primary pada beberapa beban");
    harus("Lab membiarkannya off dan tidak mengukur penggembungan (Tidak dijalankan).");
    expect(initPrimary + compose + runPy).not.toMatch(/max_slot_wal_keep_size\s*[=:]/);
    expect(compose + initPrimary).not.toMatch(/hot_standby_feedback\s*=\s*on/i);
  });
  test("konflik bagian B sampai D: query 3 detik selesai; timeout 57014 antara 20 dan 30 detik; tanpa timeout 40001 antara 30 dan 60 detik; confl_snapshot 0, 0, 1", () => {
    expect(K_B[1]).toBe("1.000");
    expect(K_C.slice(1).map(String)).toEqual(["57014", "20", "30"]);
    expect(K_D.slice(1).map(String)).toEqual(["40001", "30", "30", "60"]);
    expect(CONFL).toEqual([0, 0, 1]);
    harus("Query 3 detik selesai dan replay menunggunya (bagian B). Query 45 detik dengan `statement_timeout` 20 detik berhenti oleh timeout:");
    harus("Tanpa timeout, query yang sama dibatalkan oleh konflik, dan pencacah konflik di katalog replica naik dari 0 ke 1:");
    harus("Timeout tidak mencegah pembatalan. Ia menggantinya: 57014 sesudah paling sedikit 20 detik menggantikan 40001 sesudah paling sedikit 30 detik, dan replay tertahan lebih singkat.");
    harus("Query lab memakai `pg_sleep` untuk menjadi panjang, jadi ia tidak mewakili query laporan 20 ms");
    expect(runPy).toContain("SELECT count(*), pg_sleep({detik_query}) FROM replika_uji.k");
    expect(runPy).toContain('konflik("statement_timeout 20 detik", "20s", 45)');
    expect(runPy).toContain('konflik("tanpa statement_timeout", None, 45)');
    expect(bagKB).toContain("# query 3 detik: WAL pembersihan baris sudah diterima replika, tetapi belum diputar ulang selama query berjalan: ya");
    expect(bagKD).toContain("Lama itu diukur sejak query mulai. Dokumentasi menghitung 30 detik sejak WAL diterima standby");
    harus("Lama itu diukur sejak query mulai, sedangkan dokumentasi menghitung 30 detik sejak WAL diterima.");
  });
  test("Tebak: skema valid, empat pilihan, tepat satu benar di posisi ketiga (bukan pertama atau keempat); kode, detik, dan bagian cocok dengan rekaman", () => {
    expect(tebak.pilihan).toHaveLength(4);
    expect(tebak.pilihan.findIndex((p) => p.benar)).toBe(2);
    const benar = tebak.pilihan[2]!;
    expect(benar.teks).toContain(`timeout sesudah paling sedikit ${K_C[2]} detik, dengan kode ${K_C[1]}`);
    expect(benar.alasan).toContain(`berhenti sesudah paling sedikit ${K_C[2]} detik dan sebelum ${K_C[3]} detik, dengan ${K_C[1]}, dan pencacah konflik tetap ${CONFL[1]}`);
    expect(tebak.pilihan[1]!.teks).toContain(`sesudah paling sedikit ${K_D[2]} detik, dengan kode ${K_D[1]}`);
    expect(tebak.pilihan[0]!.alasan).toContain(`paling lama ${K_D[3]} detik menurut max_standby_streaming_delay bawaan`);
    expect(tebak.pilihan[3]!.alasan).toContain("hot_standby_feedback bernilai off di lab (konflik.txt bagian A)");
    expect(tebak.adegan.join(" ")).toContain("statement_timeout 20 detik");
    expect(tebak.adegan.join(" ")).toContain(`menghapus ${K_B[1]} baris`);
    expect(tebak.sumber).toMatchObject({ jenis: "rekaman" });
    expect(tebak.sumber.teks).toContain("labs/t5-replika/output/konflik.txt bagian A, C, dan D");
    expect(tebak.penutup).toContain(`57014 sesudah paling sedikit ${K_C[2]} detik, bukan ${K_D[1]} sesudah paling sedikit ${K_D[2]} detik`);
    expect(tebak.id).toBe("t5-replica-tebak");
    expect(tebak.label.sumber).toBe("Rekaman lab · konflik.txt");
  });
});

describe("rekaman baca.txt dan kode lab: uang dibaca dari primary", () => {
  test("bagian A: saldo primary lawan replica, jawaban bayar, kiriman 240.000 ditolak 422 saldo-kurang; angka halaman dan diagram sama", () => {
    expect(B_SALDO.slice(1).map(Number)).toEqual([215000, 250000]);
    expect(B_BAYAR.slice(1)).toEqual(["505", "35000", "10201", "215000"]);
    expect(B_KIRIM.slice(1)).toEqual(["K00504", "240000", "saldo-kurang"]);
    harus(`Budi membayar ${rp(35000)} ke Warung 505 sementara replay ditahan, dan jawaban bayar memuat saldo ${rp(215000)}. Replica masih menjawab ${rp(250000)}, sedangkan primary ${rp(215000)}. Kiriman ${rp(240000)} ditolak dengan 422 \`saldo-kurang\`:`);
    expect(diagram.baris[1]!.simpul.map((s) => s.teks)).toEqual([`Replica ${rp(250000)}`, `Primary ${rp(215000)}`, `Kiriman ${rp(240000)} ditolak: saldo kurang`]);
    expect(diagram.baris[1]!.simpul.at(-1)!.sub).toBe("422");
    expect(bagCA).toContain("# Uang tidak ikut keliru: saldo tampil Rp250.000, tetapi kiriman Rp240.000 ke rekan ditolak karena saldo di primary Rp215.000.");
    expect(bagCA).toContain("Replay di replika ditahan dengan sengaja (jeda buatan, bukan jeda alami)");
    harus("Replay yang ditahan adalah jeda buatan, bukan jeda alami.");
    expect(readme).toContain("Pembayaran tidak dipakai untuk bukti ini: satu pembayaran dibatasi Rp200.000, jadi Rp240.000 ditolak oleh batas itu tanpa membaca saldo.");
    expect(riset).toContain("MaksBayar 200000");
  });
  test("MaksBayar di kode lab adalah Rp200.000 dan kiriman 240.000 melewatinya; 240.000 lebih besar dari 200.000", () => {
    const kode = berkasDi("labs/api-t5/internal/service/").filter((f) => f.endsWith(".go") && !f.endsWith("_test.go")).map(baca).join("\n");
    const mb = Number(cocok(kode, /MaksBayar\s*=\s*([\d_]+)/)[1]!.replace(/_/g, ""));
    expect(mb).toBe(200000);
    expect(240000).toBeGreaterThan(mb);
    harus(`Satu pembayaran dibatasi ${rp(mb)}, jadi ${rp(240000)} ditolak oleh batas itu tanpa membaca saldo (README lab).`);
    expect(bayarGo).toContain('harus lebih dari 0 dan paling banyak 200000');
  });
  test("kode: Bayar mengunci dua buku di DalamTx lalu membandingkan saldo; Kirim memberi komentar yang sama; s.replika hanya di replika.go (lingkup internal dan cmd, bukan tes)", () => {
    const b = bayarGo.split("\n");
    expect(b.slice(57, 65).join("\n")).toBe([
      "\terr = s.repo.DalamTx(ctx, func(tx repo.Tx) error {",
      "\t\tbuku, err := tx.KunciBukuAkun(ctx, peminta, ke)",
      "\t\tif err != nil {",
      "\t\t\treturn err",
      "\t\t}",
      "\t\tdari, w := buku[peminta], buku[ke]",
      "\t\tif dari.Saldo < jumlah { // dibaca sesudah lock: transaction lain dari buku ini menunggu",
      "\t\t\treturn ErrSaldoKurang",
    ].join("\n"));
    expect(kirimGo).toContain("// Kedua buku dikunci di dalam transaction jurnal (ADR 13), lalu batas harian dan saldo dibaca sesudah lock.");
    harus("Di kode, `Bayar` mengunci buku pengirim dan penerima di dalam `DalamTx`, lalu membandingkan saldo. `Kirim` melakukan hal yang sama untuk batas harian dan saldo (komentar di `kirim.go`):");
    const dipakai = [...berkasDi("labs/api-t5/internal/"), ...berkasDi("labs/api-t5/cmd/")].filter((f) => f.endsWith(".go") && !f.endsWith("_test.go")).filter((f) => /\bs\.replika\b/.test(baca(f)));
    expect(dipakai).toEqual(["labs/api-t5/internal/service/replika.go"]);
    harus("Di `labs/api-t5/internal`, selain tes, hanya `internal/service/replika.go` yang memakai `s.replika`. `Bayar` dan `Kirim` memakai `s.repo`, yaitu primary (dibaca dari kode, Tidak dijalankan).");
    expect(replikaGo).toContain("Keputusan yang menentukan uang tidak lewat sini: Bayar, Kirim, dan semua pemeriksaan saldo memakai\n// s.repo, yaitu primary.");
    const kodeBK = bayarGo + kirimGo;
    expect(kodeBK).not.toMatch(/s\.replika/);
    expect(mainGo.split("\n").slice(151, 161).join("\n")).toContain('os.Getenv("REPLIKA_DATABASE_URL")');
    harus("DSN replica datang dari `REPLIKA_DATABASE_URL`, lalu `Service` memilih sendiri tempat membaca. Tanpa variabel itu semua bacaan dari primary.");
  });
  test("ringkasan_merchant_harian: tabel dan PRIMARY KEY dari migrasi; tidak ada kode di labs/api-t5 dan labs/t5-replika yang mengisinya; 5.3 menulis hal yang sama", () => {
    expect(migrasi25).toMatch(/CREATE TABLE ringkasan_merchant_harian \(\n\s+merchant_akun_id bigint\s+NOT NULL,\n\s+tanggal\s+date\s+NOT NULL,\n\s+jumlah_transaksi bigint\s+NOT NULL CHECK \(jumlah_transaksi >= 0\),\n\s+total\s+bigint\s+NOT NULL,\n\s+diperbarui_pada\s+timestamptz NOT NULL DEFAULT now\(\),\n\s+PRIMARY KEY \(merchant_akun_id, tanggal\)/);
    harus("dengan PRIMARY KEY `(merchant_akun_id, tanggal)` ([[t5-skema]])");
    const semua = [...berkasDi("labs/api-t5/"), ...berkasDi("labs/t5-replika/")].filter((f) => /\.(go|py|sql|sh)$/.test(f));
    const pengisi = semua.filter((f) => /(INSERT\s+INTO|UPDATE)\s+(\w+\.)?ringkasan_merchant_harian/i.test(baca(f)));
    expect(pengisi).toEqual([]);
    expect(semua.map((f) => baca(f)).join("\n")).not.toMatch(/ON CONFLICT[^\n]*merchant_akun_id[^\n]*tanggal/);
    expect(skemaHal).toContain("Di lab api-t5, `ringkasan_merchant_harian` ada sebagai tabel tetapi belum diisi siapa pun");
    expect(readme).toContain("Laporan merchant dari replica tidak dikerjakan lab ini.");
    harus("Tabel itu ada di lab, tetapi tidak ada kode di `labs/api-t5` yang mengisinya, dan lab `t5-replika` tidak membaca laporan dari replica. Bagian ini Tidak dijalankan: ia desain.");
    expect(bacaTxt + replika + jeda + konflik).not.toMatch(/laporan\/hari-ini/);
  });
});

describe("hitungan: diturunkan dari angka naskah dan angka yang tertulis di halaman (pembulatan setengah ke atas)", () => {
  test("masukan naskah: 1.388,9 request per detik, 69,4 dan 46,3 transaksi uang, 20 ms, 8 vCPU, pemicu 5 koneksi; sama dengan 5.4 dan ADR 45", () => {
    expect([RPS_PUNCAK, TRX3, TRX2]).toEqual([1388.9, 69.4, 46.3]);
    expect(naskahTabel("Polling laporan")).toContain("query 20 ms; 8 vCPU");
    expect(naskahTabel("Baca selain uang")).toContain("(1.388,9 − 69,4) × 0,02");
    expect(naskahTabel("Baca selain uang")).toContain("L = 26,4 koneksi, atau 528% dari pemicu read replica ADR 45 (5 koneksi)");
    expect(m40).toContain("(1.388,9 − 69,4) × 0,02 = 26,4 koneksi, 528% dari pemicu read replica di [[t4-adr-45]] yang 5 koneksi. Dengan dua transaksi hasilnya 26,9 koneksi");
    expect(hal45).toContain("Read replica: query baca yang sudah memakai index menahan 5 koneksi");
    expect(LAPORAN_DETIK).toBe(20);
  });
  test("L baca 26,4 koneksi = 528% dari 5; dengan dua transaksi 26,9 tanpa persentase; kalimat Kenapa ini ada dan ADR memakai bentuk yang sama", () => {
    const L = (RPS_PUNCAK - TRX3) * W, L2 = (RPS_PUNCAK - TRX2) * W;
    expect(koma(L, 1)).toBe("26,4");
    expect(Math.round((L / AMBANG) * 100)).toBe(528);
    expect(koma(L2, 1)).toBe("26,9");
    harus(`(${koma(RPS_PUNCAK, 1)} − ${koma(TRX3, 1)}) × ${koma(W, 2)} = ${koma(L, 1)} koneksi, yaitu ${Math.round((L / AMBANG) * 100)}% dari ${AMBANG} (Hitungan atas Asumsi; dengan dua transaksi per user aktif, ${koma(L2, 1)} koneksi).`);
    expect(badan).not.toMatch(/26,9[^\n]{0,15}%/);
    harus(`Pemicu ADR 45 terpenuhi: laporan diminta, dan L baca ${koma(L, 1)} koneksi lawan ambang ${AMBANG} (Hitungan atas Asumsi).`);
    expect(barisAdr46).toContain("pembanding 26,4 koneksi (Hitungan)");
    expect(barisAdr46).toContain("Jeda replica membuat laporan tertinggal lebih dari 5 detik");
    expect(naskah).toMatch(/L baca 26,4 \(528%\): terpenuhi/);
  });
  test("laju lab 100 per detik = 100 ÷ 69,4 = 1,4 kali puncak; dengan 46,3 puncaknya; 666,7 × 0,02 = 13,3; 20 detik ÷ 0,02 detik = 1.000", () => {
    const lab = Number(J_RPS[1]);
    expect(koma(lab / TRX3, 1)).toBe("1,4");
    harus(`Laju lab ${lab} per detik adalah ${lab} ÷ ${koma(TRX3, 1)} = ${koma(lab / TRX3, 1)} kali puncak transaksi uang Tahap 5 (Hitungan atas Asumsi). Dengan dua transaksi per user aktif puncaknya ${koma(TRX2, 1)}.`);
    const lap = 20000 / 30;
    expect(koma(lap, 1)).toBe("666,7");
    expect(koma(bulat(lap, 1) * W, 1)).toBe("13,3");
    harus(`${koma(bulat(lap, 1), 1)} laporan per detik dan ${koma(bulat(lap, 1) * W, 1)} laporan berjalan serentak (Hitungan atas Asumsi, diturunkan di halaman itu).`);
    expect(m40).toContain("| Laporan per detik | 20.000 ÷ 30 | 666,7 |");
    expect(m40).toContain("| Laporan berjalan serentak | 666,7 × 0,02 | 13,3 |");
    const timeout = Number(cocok(barisAdr46, /`statement_timeout` (\d+) detik \(Asumsi\)/)[1]);
    expect(timeout).toBe(20);
    expect(timeout / W).toBe(1000);
    harus(`Angka ${timeout} detik adalah Asumsi desain, dan ${timeout} detik ÷ ${koma(W, 2)} detik = ${rib(timeout / W)} kali lama normal satu laporan.`);
    expect(timeout).toBeLessThan(Number(K_D[3]));
    harus("Laporan sendiri 13,3 koneksi (666,7 × 0,02). Bila semua bacaan selain uang pindah, 26,4 koneksi (Hitungan atas Asumsi).");
  });
  test("transaksi per merchant: 600.000 ÷ 200.000 = 3 dan 400.000 ÷ 200.000 = 2; 5.4 dan naskah memakai merchant yang sama", () => {
    expect(naskahTabel("Transaksi per merchant")).toContain("600.000 ÷ 200.000");
    expect(naskahTabel("Transaksi per merchant")).toContain("3 per merchant per hari (trx 2: 2)");
    expect(600000 / 200000).toBe(3);
    expect(400000 / 200000).toBe(2);
    harus("Rata-rata satu merchant hanya 3 transaksi per hari (600.000 ÷ 200.000), atau 2 dengan dua transaksi per user aktif (Hitungan atas Asumsi).");
    expect(naskah).toContain("| 46 | Satu read replica asinkron untuk laporan merchant");
  });
  test("target PRD: data laporan tertinggal paling lama 5 detik, layar 30 detik; PRD v5 tidak menulis batas query laporan dibatalkan", () => {
    expect(prd).toMatch(/paling lama 5 detik/);
    expect(prd).not.toMatch(/dibatalkan|57014|40001/);
    harus("PRD v5 menulis data laporan tertinggal paling lama 5 detik ([[t5-prd]]; Asumsi produk).");
    harus("PRD v5 meminta laporan merchant real-time, dengan data tertinggal paling lama 5 detik ([[t5-prd]]; Asumsi produk).");
    harus("PRD v5 belum menulis batasnya.");
  });
});

describe("naskah ADR 46 dan keputusan di halaman: aturan, opsi, kapan salah", () => {
  test("baris ADR 46 di naskah: statement_timeout 20 detik, 30 detik, hot_standby_feedback, ringkasan, empat opsi, lima kapan salah; halaman membawa semuanya", () => {
    const keputusan = sel(barisAdr46, 1), opsi = sel(barisAdr46, 2), salah = sel(barisAdr46, 3);
    for (const k of ["Satu read replica asinkron untuk laporan merchant dan bacaan berat", "ADR 45, aturan 2", "ringkasan_merchant_harian", "`statement_timeout` 20 detik (Asumsi) di replica", "`max_standby_streaming_delay` (bawaan 30 detik)", "`hot_standby_feedback` tetap mati", "Replica menolak DML dan DDL"]) expect(keputusan, k).toContain(k);
    for (const k of ["Cache laporan di Redis", "index tambahan di primary", "mengganti polling dengan push", "database analitik terpisah lewat CDC"]) expect(opsi, k).toContain(k);
    for (const k of ["lebih dari 5 detik", "pembanding jeda 1 detik, Asumsi", "pembanding 26,4 koneksi (Hitungan)", "p95 laporan di atas 1 detik", "`hot_standby_feedback` dinyalakan", "Polling diganti push (ADR 51)"]) expect(salah, k).toContain(k);
    for (const k of ["| A. Cache laporan di Redis |", "| B. Index tambahan di primary |", "| C. Polling diganti push |", "| D. Database analitik lewat CDC |", "| E. Read replica asinkron |"]) harus(k);
    harus("**Keputusan: opsi E.** Enam aturan:");
    expect([...badan.matchAll(/^(\d)\. (Satu read replica asinkron|Semua yang memutuskan uang|Laporan hari ini menjumlah|Sesi laporan di replica|`hot_standby_feedback` tetap off|Jeda replica dibaca)/gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
    harus("4. Sesi laporan di replica memakai `statement_timeout` 20 detik (Asumsi), di bawah `max_standby_streaming_delay` bawaan 30 detik.");
    harus("6. Jeda replica dibaca di primary dari `replay_lag` di `pg_stat_replication`, seperti `jeda.txt` bagian A, dengan alert bila lebih dari 5 detik (Asumsi dari PRD v5).");
    harus("Bila p95 laporan di replica melewati 1 detik (Asumsi), tambah replica kedua.");
    expect(bagJA).toContain("Jeda replay diukur di primary dari pg_stat_replication tiap 20 ms");
  });
  test("opsi A: cache ditolak dengan angka 5.4 (0 dari 18, kontrol 9 dari 18, 60 lawan 35 detik); opsi B, C, D berlabel Tidak dijalankan atau penalaran", () => {
    expect(L_C.slice(1).map(Number)).toEqual([30, 0, 18, 18, 0, 18]);
    expect(L_K.slice(1).map(Number)).toEqual([9, 9, 9, 9, 18, 50]);
    expect(angka(L_JARAK[1]!)).toBe(30.5);
    harus(`| Kekurangan | ${L_C[3]} hit dari 18`.replace("| Kekurangan | 18 hit dari 18", "| Kekurangan | 0 hit dari 18"));
    harus(`0 hit dari ${L_C[6]} untuk satu client per warung berjarak ${L_JARAK[1]} detik (\`laporan.txt\` bagian C)`);
    harus(`Rekaman \`laporan.txt\` bagian C mencatat 0 hit dari ${L_C[6]}, dan kontrol dengan dua client per warung dalam satu jendela mencatat ${L_K[4]} hit dari ${L_K[5]}.`);
    expect(m40).toContain("Dengan cache, penjualan baru bisa terlihat 30 + 30 = 60 detik sesudah tercatat (Hitungan atas Asumsi produk).");
    harus("Hitungan 5.4 menulis penjualan baru bisa terlihat 60 detik sesudah tercatat, lebih lambat dari 35 detik di PRD v5 ([[t5-m40]]).");
    expect(30 + 30).toBe(60);
    expect(30 + 5).toBe(35);
    harus(`Rekaman hanya menunjukkan query laporan di bawah ${L_MS} ms pada data satu hari dan ${L_WARUNG} warung. Belum ada bukti bahwa query-nya yang lambat (Tidak dijalankan).`);
    harus("| Bukti | Rekaman lab `laporan.txt` bagian C | Tidak dijalankan: query laporan di bawah 1 ms pada data kecil (bagian A) | Tidak dijalankan: penalaran dari [[t5-fanout]] | Tidak dijalankan: dokumentasi PostgreSQL 17 | Rekaman lab `replika.txt`, `jeda.txt`, `konflik.txt`, `baca.txt` |");
    harus("Debezium hanya disebut dan tidak dijalankan.");
    expect(riset).toMatch(/Redis, index tambahan, push, dan CDC sebagai opsi: hanya Redis punya rekaman/);
  });
  test("pre-mortem: slot fisik lab dengan max_slot_wal_keep_size bawaan -1; disk penuh adalah penalaran; pencegahan batas WAL per slot", () => {
    const r132 = barisRiset("R5-132");
    expect(r132).toContain("If max_slot_wal_keep_size is -1 (the default), replication slots may retain an unlimited amount of WAL files");
    expect(r132).toContain("the standby using the slot may no longer be able to continue replication due to removal of required WAL files");
    harus("Dengan `max_slot_wal_keep_size` bawaan -1, dokumentasi menulis slot boleh menahan WAL tanpa batas. Disk primary penuh adalah kesimpulan dari itu (penalaran, Tidak dijalankan).");
    harus("Harganya: replica yang tertinggal melewati batas tidak bisa lanjut dan dibangun ulang.");
    expect([...badan.matchAll(/^\d\. (Merchant membaca laporan|Query laporan yang lama|Replica laporan mati lama)/gm)]).toHaveLength(3);
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    expect(barisRiset("R5-134")).toContain("disk primary penuh bila replica mati lama adalah kesimpulan dari dokumentasi, tidak direkam");
  });
  test("kapan salah dan yang akan merevisinya: M41 pada 5.6, ADR 47 pada 5.7, M42 pada 5.8, ADR 48 pada 5.9, sesuai naskah", () => {
    harus("Pembandingnya jeda alami di bawah 1 detik pada 100 pembayaran per detik di laptop (`jeda.txt` bagian A).");
    harus("[[t5-m41]] menunjukkan riwayat dan saldo tampil yang dipindah ke replica tanpa ADR, sehingga Budi melihat data lama. Hasilnya aturan baca sesudah tulis di [[t5-lag]]. [[t5-m42]] menunjukkan transaksi yang hilang saat primary mati, dan jawabannya ada di [[t5-rpo-rto]].");
    expect(naskah).toMatch(/\| M42 \| 4 \|[^\n]*Replica asinkron belum menerima rekaman commit terakhir saat primary mati/);
    expect(dari("t5-m41").prasyarat).toEqual(["t5-read-replica"]);
    expect(dari("t5-lag").prasyarat).toEqual(["t5-m41"]);
  });
  test("Sengaja belum dilakukan: empat baris; CDC muncul lagi di ADR 60 yang memang memuat CDC", () => {
    const i = badan.indexOf("### Sengaja belum dilakukan");
    const baris = badan.slice(i).split("\n").filter((b) => b.startsWith("|"));
    expect(baris).toHaveLength(6);
    expect(baris[0]).toBe("| Yang ditunda | Kenapa ditunda | Muncul lagi di |");
    expect(baris[2]).toBe("| Kode yang mengisi `ringkasan_merchant_harian` | Tabel ada di lab, tetapi tidak ada kode yang mengisinya | Belum dijadwalkan |");
    expect(baris[3]).toBe("| Laporan merchant yang dibaca dari replica di lab | Lab `t5-replika` menjalankan bacaan riwayat dan saldo tampil, bukan laporan | Belum dijadwalkan |");
    expect(baris[4]).toBe("| Replica kedua | Belum ada ukuran p95 laporan, dan ambang 1 detik adalah Asumsi | Belum dijadwalkan |");
    expect(baris[5]).toBe("| Database analitik lewat CDC | Debezium hanya disebut, dan slot menahan WAL | [[t5-adr-60]] |");
    expect(adr60).toMatch(/CDC dengan Debezium/);
    expect(readme).toContain("Bacaan yang dialihkan hanya riwayat dan saldo tampil");
  });
});

describe("diagram Rantai, widget banding, dan istilah: nilai diturunkan dari rekaman dan hitungan", () => {
  test("Rantai: dua baris; angka dari rekaman; jenis rekaman; simpul akhir tiap baris terbaca tanpa sub; kalimat Inti di bawah 175 karakter", () => {
    expect(diagram.id).toBe("t5-replica-inti");
    expect(diagram.sumber.jenis).toBe("rekaman");
    expect(diagram.sumber.teks).toBe("Rekaman lab: replika.txt dan baca.txt");
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([["Replica", "replika.txt bagian A dan B", 2], ["Uang", "baca.txt bagian A", 3]]);
    expect(diagram.baris[0]!.simpul[1]).toMatchObject({ teks: `UPDATE dan DDL ditolak: ${TOLAK[0]!.kode}`, nada: "system" });
    expect(diagram.baris[1]!.simpul[0]!.sub).toBe("saldo tampil, replay ditahan");
    expect(diagram.baris[1]!.simpul[1]!.sub).toBe("saldo yang menentukan");
    expect(diagram.catatan).toContain("Replay di replica ditahan dengan sengaja di baris bawah, jadi selisih Rp35.000 adalah jeda buatan, bukan jeda alami.");
    expect(B_BAYAR[2]).toBe("35000");
    const inti = cocok(badan, /## Inti\n\n([^\n]+)\n/)[1]!;
    expect(inti.length).toBeLessThan(175);
    expect(inti).toBe("Replica menolak tulisan, jadi laporan pindah ke sana dan uang tetap dibaca dari primary.");
  });
  test("banding: data valid menurut banding.js; id simpul ada; empat fitur; catatan memuat angka dan nama berkas rekaman; satu catatan Tidak dijalankan", () => {
    expect(bandingCjs.cekData(banding)).toEqual([]);
    expect(banding.opsi.map((o) => o.id)).toEqual(["satu", "pisah"]);
    expect(banding.fitur.map((f) => f.label)).toEqual(["Bayar atau kirim uang", "Laporan penjualan hari ini", "Query laporan 45 detik", "Cek batas harian kiriman"]);
    const pisah = (i: number) => banding.fitur[i]!.catatan.pisah!;
    expect(pisah(0)).toContain(`kiriman ${rp(240000)} ditolak walau saldo tampil di replica ${rp(250000)} (baca.txt bagian A, replay ditahan dengan sengaja)`);
    expect(pisah(1)).toContain(`${TOLAK[0]!.kode}`);
    expect(pisah(1)).toContain("di lab di bawah 1 detik pada 100 pembayaran per detik (jeda.txt bagian A)");
    expect(pisah(1)).toContain("Laporan dari replica belum dijalankan di lab: Tidak dijalankan.");
    expect(banding.fitur[1]!.catatan.satu).toContain("666,7 laporan per detik adalah Hitungan atas Asumsi");
    expect(pisah(2)).toContain(`${K_C[1]} sesudah paling sedikit ${K_C[2]} detik`);
    expect(pisah(2)).toContain(`${K_D[1]} sesudah paling sedikit ${K_D[2]} detik`);
    expect(banding.fitur[2]!.catatan.satu).toBe("Tidak direkam. Lab hanya menjalankan query 45 detik di replica (konflik.txt).");
    expect(banding.fitur[3]!.catatan.satu).toContain("batas harian dan saldo dibaca sesudah lock");
    expect(kirimGo).toContain("batas harian dan saldo dibaca sesudah lock");
    expect(banding.fitur[0]!.sorot.pisah).toEqual(["app", "api", "pri", "uang"]);
    expect(banding.fitur[1]!.sorot.pisah).toEqual(["app", "api", "rep", "lap"]);
    expect(banding.fitur[1]!.sorot.satu).toEqual(["app", "api", "pri", "lap"]);
    expect(banding.fitur[3]!.sorot.pisah).toEqual(["app", "api", "pri", "batas"]);
    expect(banding.opsi[1]!.baris[1]!.map((s) => s.sub)).toEqual(["tulisan dan uang", "asinkron, baca-saja"]);
    harus("Susunan B memindahkan tempat baca laporan dari primary ke replica. Bayar atau kirim uang dan Cek batas harian kiriman tetap di primary di kedua susunan.");
  });
  test("glosarium: Read replica menunjuk halaman ini, Standby baru; istilah di prosa punya satu kalimat arti di pemakaian pertama", () => {
    expect(glosarium).toContain("| **Read replica** | Salinan database yang hanya melayani baca dan selalu sedikit tertinggal dari database utama. | [[t5-read-replica]] |");
    expect(glosarium).toContain("| **Standby** | Server PostgreSQL yang menerima WAL dari primary dan memutarnya ulang. Standby yang menjawab query disebut hot standby. | [[t5-read-replica]] |");
    expect(glosarium).toContain("| **Primary** | Database utama yang menerima semua perintah tulis; replica menyalin perubahan dari primary. | [[t5-read-replica]] |");
    expect(glosarium).toContain("| **WAL** (Write-Ahead Log) | Log perubahan yang ditulis PostgreSQL sebelum data diubah. Replica menyalin perubahan dengan membaca WAL dari primary. | [[t5-read-replica]] |");
    for (const [kata, def] of [
      ["Hitungan", "Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini"],
      ["Asumsi", "Asumsi adalah angka pilihan penulis tanpa rekaman"],
      ["penalaran", "Penalaran adalah kesimpulan dari kode atau angka di halaman, bukan hasil ukuran"],
      ["Tidak dijalankan", "Tidak dijalankan berarti dicek ke kode atau dokumentasi tanpa menjalankannya"],
    ] as const) {
      expect(badan.indexOf(def), def).toBeGreaterThan(-1);
      expect(badan.search(new RegExp(`(?<![\\p{L}-])${kata}`, "iu")), `${kata} dipakai sebelum didefinisikan`).toBe(badan.indexOf(def));
    }
    harus("Primary adalah database yang menerima semua tulisan. Replica adalah salinan yang menerima rekaman perubahan dari primary dan memutarnya ulang, dan PostgreSQL menyebut server penerima itu standby.");
    harus("Query di standby memakai snapshot, yaitu foto isi database pada satu saat.");
    harus("Standby yang menjawab query disebut hot standby.");
    harus("L baca adalah jumlah bacaan yang berjalan serentak, yaitu laju dikali lama ([[t3-pool]]).");
  });
});

describe("dokumentasi dan stack lain: kutipan di baris riset, tanggal akses, versi, dan tautan sama dengan halaman", () => {
  test("tanggal akses: semua 'dibuka' di halaman 2026-11-03; baris riset 132 dan 133 mencatat tanggal yang sama; tautan dokumentasi sama dengan bacaan lanjut", () => {
    const dibuka = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(dibuka.length).toBe(9);
    expect(new Set(dibuka)).toEqual(new Set(["2026-11-03"]));
    expect(barisRiset("R5-132")).toContain("dibuka 2026-11-03");
    expect(barisRiset("R5-133")).toContain("dibuka 2026-11-03");
    expect(hitung(barisRiset("R5-133"), "dibuka 2026-11-03")).toBeGreaterThanOrEqual(5);
    harus("dan hanya dicek ke dokumentasi pada 2026-11-03.");
    const url = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    for (const u of [
      "https://www.postgresql.org/docs/17/hot-standby.html", "https://www.postgresql.org/docs/17/runtime-config-replication.html", "https://github.com/prisma/extension-read-replicas",
      "https://laravel.com/docs/13.x/database", "https://docs.djangoproject.com/en/5.2/topics/db/multi-db/", "https://supabase.com/docs/guides/platform/read-replicas",
      "https://docs.serverpod.dev/concepts/database/connection",
    ]) {
      expect(url, u).toContain(u);
      expect(url.filter((x) => x === u).length, u).toBeGreaterThanOrEqual(2);
    }
    expect(barisRiset("R5-133")).toContain("docs.serverpod.dev/concepts/database/connection tidak terbaca saat dibuka 2026-11-03");
  });
  test("kutipan dokumentasi PostgreSQL 17.11 di baris riset: transaction ID, daftar galat, konflik VACUUM, 30 detik, bukan batas query, feedback off, slot -1", () => {
    const r = barisRiset("R5-132");
    for (const k of [
      "Transactions started during hot standby will never be assigned a transaction ID and cannot write to the system write-ahead log.",
      "SELECT ... FOR SHARE \\| UPDATE, because row locks cannot be taken without updating the underlying data files",
      "Application of a vacuum cleanup record from WAL conflicts with standby transactions whose snapshots can still",
      "Once the delay specified by max_standby_archive_delay or max_standby_streaming_delay has been exceeded, conflicting queries will be canceled.",
      "a long-running query could cause other sessions on the standby server to not see recent changes on the primary, if it delays application of WAL records",
      "prevents VACUUM from removing recently-dead rows",
      "may result in undesirable table bloat",
      "The default is 30 seconds",
      "not the same as the maximum length of time a query can run before cancellation; rather it is the maximum total time allowed to apply WAL data once it has been received from the primary server",
      "can cause database bloat on the primary for some workloads",
      "The default value is off",
      "PostgreSQL 17.11 Documentation",
    ]) expect(r, k).toContain(k);
    harus("Dokumentasi PostgreSQL 17 menulis bahwa transaction di hot standby tidak pernah mendapat transaction ID dan tidak bisa menulis ke WAL.");
    harus("Nilainya adalah total waktu yang diizinkan untuk menerapkan WAL sesudah WAL diterima dari primary");
    harus("Dokumentasi juga menulis bahwa query yang lama bisa membuat sesi lain di standby tidak melihat perubahan terbaru bila ia menunda penerapan WAL.");
  });
  test("tab stack: Prisma 0.5.0 terbit 2025-12-02 butuh Prisma 7.0; Laravel sticky dan dua detik; Django 5.2 menulis tidak menyelesaikan replication lag; Supabase GET dan asinkron; Serverpod tidak terbaca", () => {
    const r = barisRiset("R5-133");
    for (const k of [
      "npm @prisma/extension-read-replicas 0.5.0, terbit 2025-12-02", "Requires Prisma 7.0+", "All non-transactional read queries will now be executed against the defined replicas. Write queries and transactions will be executed against the primary server.",
      "kata lag, stale, dan consistency tidak ada di README", "a database host will be randomly chosen for each request", "requests within two seconds of a write will use the write connection for reads on that connection",
      "Django 5.2", "it doesn't provide any solution for handling replication lag", "Replication is asynchronous to ensure that transactions on the Primary aren't blocked",
      "There is a delay between an update on the Primary and the time that a Read Replica receives the change", "Read Replicas only support GET requests from the REST API", "[perlu verifikasi]",
    ]) expect(r, k).toContain(k);
    harus("(npm 0.5.0, terbit 2025-12-02, butuh Prisma 7.0 ke atas)");
    harus("README menulis bahwa bacaan non-transaksional dijalankan di replica, sedangkan tulisan dan transaction dijalankan di primary. Method `$primary()` memaksa primary. README tidak membahas jeda replica.");
    harus("Opsi `sticky` hanya berlaku dalam satu request");
    harus("middleware `PreventStaleDatabaseReads`, yang memakai sesi dan 2 detik bawaan ([[t5-lag]])");
    harus("Dokumentasi menulis bahwa susunan itu tidak menyediakan penyelesaian untuk replication lag, jadi router contoh itu tidak menangani jeda.");
    harus("Load balancer membagi request antara primary dan replica, dan replica hanya menerima request REST API berjenis GET.");
    harus("tidak dibaca [perlu verifikasi]. Kode Dart tidak ditulis di tab ini.");
    harus("*Tidak dijalankan. Halaman [Serverpod: database connection](https://docs.serverpod.dev/concepts/database/connection) tidak terbaca saat dibuka 2026-11-03 [perlu verifikasi].*");
  });
});

describe("baris riset 5.5: lima baris, urut ID, tanpa ID ganda, dan nilai dari rekaman", () => {
  test("R5-130 sampai R5-134 ada, urut naik dan tanpa ID ganda di tabel; baris sebelum R5-130 dan sesudah R5-134 tidak dikunci ke tetangga tertentu", () => {
    const urut = [...riset.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(urut).size).toBe(urut.length);
    const angkaId = urut.map((i) => Number(i.slice(3)));
    expect([...angkaId].sort((a, b) => a - b)).toEqual(angkaId);
    const i0 = urut.indexOf("R5-130");
    expect(urut.slice(i0, i0 + 5)).toEqual(IDS_RISET);
    expect(angkaId[i0 - 1]!).toBeLessThan(130);
    expect(angkaId[i0 + 5]!).toBeGreaterThan(134);
  });
  test("R5-130: nilai rekaman di baris riset sama dengan rekaman dan kode", () => {
    const r = barisRiset("R5-130");
    const [j, p, bk] = HITUNG[0]!;
    expect(r).toContain(`jurnal ${j}, posting ${p}, buku ${bk} di tiga node`);
    expect(r).toContain("selisih jurnal bayar 5");
    expect(r).toContain("57014, paling sedikit 20 dan kurang dari 30 detik, confl_snapshot 0");
    expect(r).toContain("40001, paling sedikit 30 dan kurang dari 60 detik, confl_snapshot 1");
    expect(r).toContain(`saldo buku primary ${B_SALDO[1]}, replica ${B_SALDO[2]}, POST /kiriman Rp240.000 ke ${B_KIRIM[1]}: 422 saldo-kurang`);
    expect(r).toContain("bayar.go` baris 58 sampai 65");
    expect(r).toContain("`cmd/api/main.go` baris 153 sampai 161");
    expect(r).toContain("`slot_laporan` dan `slot_sinkron`");
  });
  test("R5-131: hitungan di baris riset sama dengan hitungan di tes ini", () => {
    const r = barisRiset("R5-131");
    expect(r).toContain(`100 ÷ 69,4 = ${(100 / TRX3).toFixed(2).replace(".", ",")} (1,4)`);
    expect(r).toContain(`(1.388,9 − 69,4) × 0,02 = ${((RPS_PUNCAK - TRX3) * W).toFixed(2).replace(".", ",")} (26,4)`);
    expect(r).toContain(`(1.388,9 − 46,3) × 0,02 = ${((RPS_PUNCAK - TRX2) * W).toFixed(2).replace(".", ",")} (26,9)`);
    expect(r).toContain("20 detik ÷ 0,02 detik = 1.000");
  });
});

describe("tinjauan sendiri: kalimat, bullet, judul Snippet, dan frontmatter diturunkan dari sumber", () => {
  test("frontmatter: judul dan description diturunkan dari registry dan angka ADR; empat opsi ditolak sesuai kolom tabel", () => {
    expect(frontmatter).toContain(`title: "${dari("t5-read-replica").nomor} ${dari("t5-read-replica").judul}"`);
    expect(frontmatter).toContain("description: Rekeningo memasang satu read replica asinkron untuk laporan merchant, sedangkan saldo yang menentukan bayar tetap dibaca dari primary. ADR 46 menimbang empat cara lain dan menulis kapan pilihan ini salah.");
    const kolom = badan.split("\n").find((b) => b.startsWith("| | A. "))!.split("|").slice(2, -1);
    expect(kolom).toHaveLength(5);
    expect(kolom.length - 1).toBe(4);
  });
  test("judul Snippet menyebut berkas, bagian, dan nomor baris kode; tanpa komentar lab internal di rentang yang tampil", () => {
    for (const s of snip) {
      const nama = s.f.split("/").pop()!;
      expect(s.judul, s.f).toContain(nama);
      if (s.f.endsWith(".go") && s.judul.startsWith("Kode lab")) expect(s.judul).toContain(`baris ${s.a} sampai ${s.b}`);
      if (s.f.endsWith(".txt")) expect(s.judul).toMatch(/bagian [A-D]/);
      expect(s.teks).not.toMatch(/mutasi tinjauan|keputusan \d|R5-\d|R\d-\d/);
    }
  });
  test("tidak ada kalimat prosa yang muncul dua kali di badan halaman", () => {
    const prosa = badan.split("\n").map((b) => b.trim()).filter((b) => b && !b.startsWith("|") && !b.startsWith("<") && !b.startsWith("import ") && !b.startsWith("*Tidak dijalankan"));
    const kalimat = prosa.flatMap((b) => b.split(/(?<=[.!?])\s+(?=[A-Z*`(])/)).map((s) => s.trim()).filter((s) => s.length > 25);
    expect(kalimat.length).toBeGreaterThan(60);
    expect(kalimat.filter((s, i) => kalimat.indexOf(s) !== i)).toEqual([]);
  });
  test("noscript: jawaban tebakan dan susunan A dan B sama dengan rekaman", () => {
    harus(`Jawaban yang tepat: query dihentikan oleh timeout sesudah paling sedikit ${K_C[2]} detik dengan kode ${K_C[1]}, sebelum konflik membatalkannya (konflik.txt bagian C). Tanpa timeout, konflik membatalkannya sesudah paling sedikit ${K_D[2]} detik dengan kode ${K_D[1]} (bagian D).`);
    harus("Di kedua susunan, Bayar atau kirim uang dan Cek batas harian kiriman dibaca dari primary. Di susunan B laporan hari ini dibaca dari replica.");
  });
});

describe("penutup celah mutasi: angka rekaman yang tidak tampil di Snippet tetapi mendasari klaim halaman", () => {
  test("konflik.txt: tiap bagian menghapus 1.000 baris yang dibaca query; judul bagian C dan D, lama query, dan kalimat penutup sama dengan run.py dan halaman", () => {
    const ins = [...konflik.matchAll(/^INSERT 0 (\d+)$/gm)].map((m) => Number(m[1]));
    const del = [...konflik.matchAll(/^DELETE (\d+)$/gm)].map((m) => Number(m[1]));
    expect(ins).toEqual([1000, 1000, 1000]);
    expect(del).toEqual([1000, 1000, 1000]);
    expect(runPy).toContain("INSERT INTO replika_uji.k SELECT generate_series(1, 1000)");
    expect(konflik).toContain("# --- C. statement_timeout = 20 detik, query 45 detik: berhenti oleh timeout, bukan oleh konflik ---");
    expect(konflik).toContain("# --- D. Tanpa statement_timeout, query 45 detik: konflik membatalkannya sesudah max_standby_streaming_delay ---");
    expect(konflik).toContain("# --- B. Query pendek (3 detik) selama konflik: standby menunggu, query selesai ---");
    expect(bagKD).toContain("# Dua cara berhenti, dua kode: 57014 dari timeout milik sesi pada 20 detik, 40001 dari konflik pada 30 detik. Timeout 20 detik tidak");
    expect(bagKD).toContain("# mencegah query lama dihentikan; ia menghentikannya lebih dulu, dan replay tertahan lebih singkat (kurang dari 30 detik, lebih singkat dari di bagian D).");
    expect(tebak.adegan.join(" ")).toContain(`menghapus ${rib(ins[0]!)} baris`);
    expect(tebak.pilihan[2]!.teks).toContain("timeout sesudah paling sedikit 20 detik");
    expect(tebak.judul).toBe("Query 45 detik di replica dengan statement_timeout 20 detik");
  });
  test("jeda.txt: jumlah jurnal bayar bagian A sama di tiga node (1.000) dan bagian B primary dan standby sinkron 1.005 lawan replica yang ditahan 1.000, selisih 5", () => {
    const a = [...bagJA.matchAll(/^ (\d+)$/gm)].map((m) => Number(m[1]));
    expect(a).toEqual([1000, 1000, 1000]);
    expect(a[0]).toBe(Number(J_BAYAR[2]));
    const b = [...bagJB.matchAll(/^(primary|replika|sinkron)=> SELECT count\(\*\) AS jurnal_bayar[^\n]*\n[^\n]*\n-+\n (\d+)\n/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(b).toEqual(["primary 1005", "replika 1000", "sinkron 1005", "replika 1005"]);
    expect(Number(b[0]!.split(" ")[1]) - Number(b[1]!.split(" ")[1])).toBe(J_SELISIH);
    expect(bagJB).toContain("$ POST /transfers sebanyak lima kali ke Warung 505 (Rp10.000, Rp11.000, Rp12.000, Rp13.000, Rp14.000), semua 201");
  });
  test("baca.txt bagian A: saldo tampil dari replica 250.000 dua kali sebelum replica menyusul dan 215.000 sesudahnya; kiriman dan run.py memakai angka yang sama", () => {
    const saldo = [...bagCA.matchAll(/X-Dibaca-Dari: replika\n\n\{"id":419,[^\n]*"saldo":(\d+),/g)].map((m) => Number(m[1]));
    expect(saldo).toEqual([250000, 250000, 215000]);
    expect(saldo[0]).toBe(B_SALDO[2] ? Number(B_SALDO[2]) : 0);
    expect(saldo[2]).toBe(Number(B_SALDO[1]));
    expect(runPy).toContain(`{"ke_nomor_karyawan": "${B_KIRIM[1]}", "nominal": ${B_KIRIM[2]}}`);
    expect(runPy).toContain("s, isi = bayar(t_budi, 505, 35000)");
  });
  test("Kirim di kode lab: saldo pengirim dibandingkan dengan nominal sesudah lock dan ErrSaldoKurang dikembalikan; PRD v5 menulis 5 detik di baris P0 dan di batasan", () => {
    const k = kirimGo.split("\n");
    const i = k.findIndex((b) => b === "\t\tif dari.Saldo < nominal {");
    expect(i).toBeGreaterThan(0);
    expect(k[i + 1]).toBe("\t\t\treturn ErrSaldoKurang");
    expect(kirimGo).toContain("// Kedua buku dikunci di dalam transaction jurnal (ADR 13)");
    expect(prd).toContain("Data yang dilayani laporan tertinggal paling lama 5 detik dari pembayaran yang tercatat di ledger (Asumsi produk).");
    expect(prd).toContain("- Data laporan merchant tertinggal paling lama 5 detik dari pembayaran yang tercatat");
  });
});

describe("penutup celah mutasi putaran kedua: struktur, tautan, judul Snippet, kalimat Inti, Coba, Kenapa ini ada, ADR, dan Cek diri diturunkan dari sumber", () => {
  const K1 = Number(cocok(runPy, /konflik\("statement_timeout 20 detik", "(\d+)s", (\d+)\)/)[1]);
  const DETIK_QUERY = Number(cocok(runPy, /konflik\("statement_timeout 20 detik", "(\d+)s", (\d+)\)/)[2]);
  const SALDO_REPLICA = Number(B_SALDO[2]), SALDO_PRIMARY = Number(B_SALDO[1]), NOMINAL = Number(B_KIRIM[2]);
  const MAKS = Number(cocok(bayarGo, /const MaksBayar = ([\d_]+)/)[1]!.replace(/_/g, ""));
  const slotWal = cocok(barisRiset("R5-132"), /max_slot_wal_keep_size is (-?\d+) \(the default\)/)[1]!;
  const cek = badan.split("### Cek diri")[1]!.split("### Saat me-review")[0]!;
  const jawab = [...cek.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
  const huruf = (isi: string, nomorBaris: number): string => {
    const b = isi.split("\n");
    for (let i = nomorBaris - 1; i >= 0; i--) { const m = b[i]!.match(/^# --- ([A-Z])\. /); if (m) return m[1]!; }
    return "";
  };
  test("heading, label dan slot tab, atribut lang, dan jumlah kemunculan tiap tautan [[id]]", () => {
    expect([...badan.matchAll(/^(#{2,5}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 46: satu read replica asinkron untuk laporan, uang tetap dari primary",
      "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...badan.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1])).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    expect([...badan.matchAll(/<Snippet file="([^"]+)" lines="[^"]+"( lang="\w+")? title/g)].map((m) => `${m[1]!.split(".").pop()} ${m[2] ?? ""}`.replace(/\s+/g, " ").trim())).toEqual(["txt", "txt", "txt", "txt", "txt", "txt", "txt", "txt", "txt", 'go lang="go"', 'go lang="go"']);
    expect([...badan.matchAll(/<Snippet lang="(\w+)" code=/g)].map((m) => m[1])).toEqual(["js", "php", "python"]);
    const n = (id: string) => hitung(badan, `[[${id}]]`);
    expect({ berikutnya: n("berikutnya"), "t3-cache": n("t3-cache"), "t3-pool": n("t3-pool"), "t4-adr-45": n("t4-adr-45"), "t5-adr-60": n("t5-adr-60"), "t5-fanout": n("t5-fanout"), "t5-lag": n("t5-lag"),
      "t5-m40": n("t5-m40"), "t5-m41": n("t5-m41"), "t5-m42": n("t5-m42"), "t5-prd": n("t5-prd"), "t5-rpo-rto": n("t5-rpo-rto"), "t5-skema": n("t5-skema") }).toEqual({
      berikutnya: 1, "t3-cache": 2, "t3-pool": 1, "t4-adr-45": 2, "t5-adr-60": 1, "t5-fanout": 4, "t5-lag": 2, "t5-m40": 5, "t5-m41": 3, "t5-m42": 1, "t5-prd": 3, "t5-rpo-rto": 2, "t5-skema": 1,
    });
  });
  test("tautan Markdown: label dan alamat sama dengan daftar yang diturunkan dari kepala rekaman, baris riset, dan registri; versi di label sama dengan versi di alamat", () => {
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!]);
    const pg = kepala[1]!, mayor = pg.split(".")[0]!;
    const H = `https://www.postgresql.org/docs/${mayor}/hot-standby.html`, R = `https://www.postgresql.org/docs/${mayor}/runtime-config-replication.html`;
    expect(tautan).toEqual([
      ["Label sumber", "/cara-pakai/#label-sumber"], [`PostgreSQL ${pg}, Hot Standby`, H], [`PostgreSQL ${pg}, Replication`, R], [`PostgreSQL ${pg}, Replication`, R],
      ["@prisma/extension-read-replicas", "https://github.com/prisma/extension-read-replicas"], ["Laravel 13.x: Database", "https://laravel.com/docs/13.x/database"],
      ["Django 5.2: Multiple databases", "https://docs.djangoproject.com/en/5.2/topics/db/multi-db/"], ["Serverpod: database connection", "https://docs.serverpod.dev/concepts/database/connection"],
      ["Supabase: Read Replicas", "https://supabase.com/docs/guides/platform/read-replicas"], [`PostgreSQL ${pg}, Replication`, R],
      [`PostgreSQL ${mayor}: Hot Standby`, H], [`PostgreSQL ${mayor}: Replication`, R], ["@prisma/extension-read-replicas", "https://github.com/prisma/extension-read-replicas"],
      ["Laravel 13.x: Database", "https://laravel.com/docs/13.x/database"], ["Django 5.2: Multiple databases", "https://docs.djangoproject.com/en/5.2/topics/db/multi-db/"],
      ["Supabase: Read Replicas", "https://supabase.com/docs/guides/platform/read-replicas"], ["Serverpod: database connection", "https://docs.serverpod.dev/concepts/database/connection"],
    ]);
    expect([...new Set([...badan.matchAll(/PostgreSQL (\d+(?:\.\d+)?)/g)].map((m) => m[1]))].sort()).toEqual([mayor, pg].sort());
    const r133 = barisRiset("R5-133");
    expect(r133).toContain("laravel.com/docs/13.x/database");
    expect(r133).toContain("docs.djangoproject.com/en/5.2/topics/db/multi-db/ (Django 5.2");
    expect(hitung(badan, "13.x")).toBe(4);
    expect(hitung(badan, "5.2")).toBe(4);
    harus("(npm 0.5.0, terbit 2025-12-02, butuh Prisma 7.0 ke atas)");
    for (const k of ["npm @prisma/extension-read-replicas 0.5.0, terbit 2025-12-02", "Requires Prisma 7.0+", "requests within two seconds of a write"]) expect(r133, k).toContain(k);
    harus("yang memakai sesi dan 2 detik bawaan");
    expect(daun(tebakMentah).length).toBeGreaterThan(10);
  });
  test("judul Snippet lengkap: berkas, huruf bagian dari rekaman, rentang baris kode, dan keterangan tetap", () => {
    const ket = ["dua standby asinkron dan dua slot", "UPDATE ditolak di replica", "FOR UPDATE, SET TRANSACTION, dan PREPARE TRANSACTION", "jeda alami di bawah beban", "jeda buatan, bukan jeda alami",
      "pengaturan bawaan replica", "timeout 20 detik", "tanpa timeout", "saldo di primary lawan replica, kiriman ditolak"];
    snip.forEach((s, i) => {
      if (s.f.endsWith(".txt")) expect(s.judul, s.f).toBe(`Rekaman lab: ${s.f}, bagian ${huruf(baca(s.f), s.a)} (${ket[i]})`);
    });
    expect(snip[9]!.judul).toBe(`Kode lab: labs/api-t5/internal/service/bayar.go baris ${snip[9]!.a} sampai ${snip[9]!.b} (saldo dibaca sesudah lock di primary)`);
    expect(snip[10]!.judul).toBe("labs/api-t5/cmd/api/main.go");
  });
  test("Inti: paragraf pembuka, dua paragraf rekaman, dan tiga pertanyaan memakai kode, saldo, dan nominal rekaman; Coba memakai detik rekaman", () => {
    harus(`Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) \`replika.txt\` bagian ${huruf(replika, RP.nomor((x) => x.startsWith("replika=> UPDATE t5_ledger.buku"), rB0))}, standby menolak UPDATE, DDL, \`SELECT ... FOR UPDATE\`, dan \`PREPARE TRANSACTION\` dengan kode ${TOLAK[0]!.kode}.`);
    harus(`Di \`baca.txt\` bagian ${huruf(bacaTxt, BC.nomor((x) => x.startsWith("primary=> SELECT saldo_cache")))} replay ditahan dengan sengaja, dan saldo tampil di replica ${rp(SALDO_REPLICA)} sedangkan saldo primary ${rp(SALDO_PRIMARY)}. Kiriman ${rp(NOMINAL)} ditolak.`);
    harus("Replica selalu sedikit tertinggal, jadi ADR 46 membagi bacaan: laporan dari replica, uang dari primary.");
    harus("Primary adalah database yang menerima semua tulisan.");
    expect([...badan.matchAll(/^(\d)\. (.+)$/gm)].slice(0, 3).map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "1 Pernyataan apa yang ditolak standby, dan dengan kode apa?",
      `2 Query ${DETIK_QUERY} detik di replica dengan \`statement_timeout\` ${tebak.adegan[0]!.match(/statement_timeout (\d+) detik/)![1]} detik: kapan ia berhenti, dengan kode apa, dan apa yang berubah tanpa timeout?`,
      `3 Saldo tampil di replica ${rp(SALDO_REPLICA)}, saldo primary ${rp(SALDO_PRIMARY)}. Kiriman ${rp(NOMINAL)} diterima atau ditolak, dan saldo yang menentukan itu dibaca dari mana?`,
    ]);
    harus("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
    expect(K1).toBe(20);
    harus(`Kalau berhenti di sini, kamu sudah tahu: statement_timeout ${K1} detik di replica menghentikan query lama lebih awal daripada konflik pada ${K_D[3]} detik, dan saldo, kiriman, serta batas harian tetap dibaca dari primary.`);
    harus(`Tebak dulu apa yang terjadi pada query ${DETIK_QUERY} detik di replica.`);
    harus(`Query ${K_B[0]!.match(/query (\d+) detik/)![1]} detik selesai dan replay menunggunya (bagian ${huruf(konflik, KF.nomor((x) => x.startsWith("# query 3 detik")))}).`);
    harus(`Rekaman hanya membuktikan batas di bawah ${cocok(bagJA, /replay_lag tertinggi di kedua standby di bawah (\d+) detik/)[1]} detik di laptop, bukan di produksi.`);
  });
  test("Kenapa ini ada dan ADR: pemicu, ambang, aturan 2, Status, dan sel tabel opsi memakai angka naskah, rekaman, dan registri", () => {
    harus(`menunda read replica dengan dua pemicu: laporan merchant real-time diminta, atau L baca mencapai ${AMBANG} koneksi.`);
    harus("PRD v5 memenuhi pemicu pertama ([[t5-prd]]).");
    harus(`Aturan ${hal45.match(/^(\d)\. Uang tidak dibaca dari salinan/m)![1]} di ADR itu sudah menulis batasnya: uang tidak dibaca dari salinan di luar primary, dan read replica hanya untuk laporan.`);
    harus(`**Status:** diterima sesudah M${dari("t5-m40").judul.match(/^M(\d+)/)![1]}, dan menjalankan aturan ${hal45.match(/^(\d)\. Uang tidak dibaca dari salinan/m)![1]} ADR ${dari("t4-adr-45").adr![0]} ([[t4-adr-45]]). Dibaca ulang di [[t5-m41]].`);
    harus(`Laporan di primary menambah kerja mesin yang menulis uang ([[t5-m40]]). Pemicu ADR ${dari("t4-adr-45").adr![0]} terpenuhi`);
    const sel = (b: string, n: number) => b.split(" | ")[n]!;
    const baris = (awal: string) => badan.split("\n").find((b) => b.startsWith(`| ${awal} |`))!;
    expect(sel(baris("Cara kerja"), 1)).toBe(`Jawaban laporan disimpan ${L_C[1]} detik di Redis ([[t3-cache]])`);
    expect(sel(baris("Cara kerja"), 3)).toBe("App menerima kabar saat ada penjualan, bukan bertanya tiap 30 detik");
    expect(naskahTabel("Polling laporan")).toContain("polling 30 detik");
    expect(sel(baris("Kekurangan"), 1)).toBe(`${L_C[2]} hit dari ${L_C[6]} untuk satu client per warung berjarak ${L_JARAK[1]} detik (\`laporan.txt\` bagian ${huruf(laporan, LP.nomor((x) => x.startsWith("# server: ./api-t5 -lab -rentan laporan-primary -laporan-cache redis")))})`);
    expect(sel(baris("Kekurangan"), 2)).toBe(`Mempercepat satu query, bukan mengurangi ${koma(bulat(20000 / 30, 1), 1)} query per detik (Hitungan atas Asumsi)`);
    expect(sel(baris("Biaya operasional"), 1)).toBe(`Redis sudah ada ([[t3-cache]]), isi bisa setua ${L_C[1]} detik`);
    expect(sel(baris("Bukti"), 2)).toBe(`Tidak dijalankan: query laporan di bawah ${L_MS} ms pada data kecil (bagian ${huruf(laporan, LP.nomor((x) => x.startsWith("waktu eksekusi query laporan satu warung")))})`);
    expect(sel(baris("Kekurangan"), 4)).toBe("Slot replikasi menahan WAL, dan bawaan `max_slot_wal_keep_size` tanpa batas");
    harus(`polling satu perangkat per merchant tiap ${L_C[1]} detik tidak punya panggilan kedua dalam umur isi cache.`);
    harus(`bawaan \`max_slot_wal_keep_size\` ${slotWal}, yaitu slot boleh menahan WAL tanpa batas`);
    harus(`Dengan \`max_slot_wal_keep_size\` bawaan ${slotWal}, dokumentasi menulis slot boleh menahan WAL tanpa batas.`);
    harus(`beban M${dari("t5-m40").judul.match(/^M(\d+)/)![1]} datang dari jumlah query.`);
  });
  test("pre-mortem, kapan salah, dan Cek diri: nomor aturan, detik, dan pencacah sama dengan rekaman; nomor soal berurut; jawaban lengkap diturunkan", () => {
    const aturan = [...badan.matchAll(/^(\d)\. (Satu read replica asinkron|Semua yang memutuskan uang|Laporan hari ini menjumlah|Sesi laporan di replica|`hot_standby_feedback` tetap off|Jeda replica dibaca)/gm)];
    expect(aturan).toHaveLength(6);
    harus("Pencegahannya aturan 6: jeda dipantau, dan tampilan laporan menyebut waktu datanya.");
    expect(badan).toContain("6. Jeda replica dibaca di primary dari `replay_lag`");
    harus(`dan timeout ${K1} detik di bawah ${K_D[3]} detik.`);
    harus(`Saat jeda replica melewati ${cocok(barisAdr46, /lebih dari (\d+) detik \(target PRD/)[1]} detik, target PRD v5 (Asumsi produk).`);
    harus(`yang naik dari ${CONFL[0]} ke ${CONFL[2]} di rekaman tanpa timeout.`);
    harus(`Pembandingnya jeda alami di bawah ${cocok(bagJA, /replay_lag tertinggi di kedua standby di bawah (\d+) detik/)[1]} detik pada ${J_RPS[1]} pembayaran per detik di laptop`);
    expect([...cek.matchAll(/\*\*(\d)\.\*\*/g)].map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    expect(jawab[1]).toBe(`Query berhenti sesudah paling sedikit ${K_C[2]} detik dan sebelum ${K_C[3]} detik, dengan ${K_C[1]}. Tanpa timeout, konflik dengan replay membatalkannya sesudah paling sedikit ${K_D[2]} detik, dengan ${K_D[1]}. Timeout tidak mencegah pembatalan: ia menghentikan query lebih awal, dan replay tertahan lebih singkat (\`konflik.txt\` bagian ${huruf(konflik, kC0)} dan ${huruf(konflik, kD0)}).`);
    expect(jawab[2]).toBe(`Ditolak dengan ${B_KIRIM[0]!.match(/HTTP\/1\.1 (\d+)/)![1]} \`${B_KIRIM[3]}\`, karena saldo yang menentukan dibaca dari primary di dalam transaction. Pembayaran tidak bisa dipakai: satu pembayaran dibatasi ${rp(MAKS)}, jadi ${rp(NOMINAL)} ditolak oleh batas itu tanpa membaca saldo (\`baca.txt\` bagian ${huruf(bacaTxt, BC.nomor((x) => x.startsWith("primary=> SELECT saldo_cache")))}, README lab).`);
    expect(jawab[3]).toBe(`Cache menyimpan jawaban sampai TTL ${L_C[1]} detik habis, jadi laporan bisa setua ${L_C[1]} detik. Rekaman mencatat ${L_C[2]} hit dari ${L_C[6]} untuk satu client per warung. Replica menjawab dari data yang tertinggal sebesar jeda replay, di lab di bawah ${cocok(bagJA, /replay_lag tertinggi di kedua standby di bawah (\d+) detik/)[1]} detik pada ${J_RPS[1]} pembayaran per detik. Jeda itu batas di laptop, bukan nilai produksi.`);
  });
  test("recording: kalimat ringkas di akhir bagian C dan D, pesan galat standby, batas Rp200.000 di komentar rekaman, dan run.py memakai angka yang sama", () => {
    expect(bagKC).toContain("replay baru menyusul sesudah query berhenti, dan itu kurang dari 30 detik sesudah VACUUM (nilai tidak direkam).");
    expect(bagKD).toContain("replay baru menyusul sesudah query dibatalkan, lebih lama dari di bagian C (nilai tidak direkam).");
    expect(TOLAK[0]!.galat).toBe("cannot execute UPDATE in a read-only transaction");
    expect(TOLAK.filter((t) => !t.sql.startsWith("SET") && !t.sql.startsWith("PREPARE")).every((t) => /in a read-only transaction$/.test(t.galat))).toBe(true);
    expect(TOLAK.find((t) => t.sql.startsWith("SET"))!.galat).toBe("cannot set transaction read-write mode during recovery");
    expect(TOLAK.find((t) => t.sql.startsWith("PREPARE"))!.galat).toBe("cannot execute PREPARE TRANSACTION during recovery");
    expect(bagCA).toContain(`satu pembayaran dibatasi ${rp(MAKS)} dan ${rp(NOMINAL)} ditolak oleh batas itu tanpa membaca saldo.`);
    expect(MAKS).toBe(200000);
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "empat", "lima", "enam", "Raka", "Budi", "Ani", "Wulan", "Nadia", "pertama", "kedua", "bukan", "tanpa", "kecuali", "semua", "juga", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "penalaran", "primary", "replica", "standby", "cache", "hit", "TTL", "p95", "query", "pembayaran", "laporan", "database", "lebih", "paling", "bisa", "direkam", "tidak direkam", "dibaca dari kode", "25006", "0A000", "57014", "40001", "422", "ms", "detik", "merchant", "warung", "lab", "naskah", "cerita", "di atas", "di bawah", "paling sedikit", "paling lama", "kurang", "melewati", "bawaan", "timeout", "konflik", "replay", "jeda", "yaitu", "bukan hasil ukuran", "ditolak", "ditahan", "WAL", "slot", "GET"];
const profil = (teks: string): string =>
  PENENTU.map((k) => {
    const n = (teks.match(new RegExp(`(?<![\\p{L}-])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}-])`, "gu")) ?? []).length;
    return n ? `${k}:${n}` : "";
  }).filter(Boolean).join(" ");
const daun = (o: unknown, jalur = ""): [string, string | number | boolean][] => {
  if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") return [[jalur, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
  return [];
};

describe("kartu Cek diri: tanya dan jawab sama dengan kartu di kartu.json", () => {
  test("empat kartu t5-read-replica-1 sampai 4 sama dengan empat pertanyaan Cek diri di halaman, urut", () => {
    const cek = badan.split("### Cek diri")[1]!.split("### Saat me-review")[0]!;
    const tanya = [...cek.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n/g)].map((m) => m[2]!);
    const jawab = [...cek.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(tanya).toHaveLength(4);
    expect(jawab).toHaveLength(4);
    const k = kartuSemua.filter((x) => x.halaman === "t5-read-replica");
    expect(k.map((x) => x.id)).toEqual(["t5-read-replica-1", "t5-read-replica-2", "t5-read-replica-3", "t5-read-replica-4"]);
    expect(k.map((x) => x.tanya)).toEqual(tanya);
    expect(k.map((x) => x.jawab)).toEqual(jawab);
    for (const x of k) expect(x).toMatchObject({ judul: "5.5 Read replica dan model baca untuk laporan + ADR 46", url: "tahap-5/read-replica/" });
    expect(jawab[0]).toContain("Untuk `SET TRANSACTION READ WRITE` jawabannya 0A000.");
    expect(jawab[1]).toContain(`Query berhenti sesudah paling sedikit ${K_C[2]} detik dan sebelum ${K_C[3]} detik, dengan ${K_C[1]}.`);
    expect(jawab[1]).toContain(`konflik dengan replay membatalkannya sesudah paling sedikit ${K_D[2]} detik, dengan ${K_D[1]}.`);
    expect(jawab[2]).toContain(`Ditolak dengan 422 \`saldo-kurang\``);
    expect(jawab[2]).toContain(`satu pembayaran dibatasi ${rp(200000)}, jadi ${rp(240000)} ditolak oleh batas itu tanpa membaca saldo`);
    expect(jawab[3]).toContain(`Rekaman mencatat 0 hit dari ${L_C[6]} untuk satu client per warung.`);
    expect(jawab[3]).toContain("di lab di bawah 1 detik pada 100 pembayaran per detik");
  });
});

describe("nilai terkunci terpisah dari kalimat: baris riset, daun diagram, tebak, dan banding, sidik, dan profil kata penentu per baris", () => {
  test("lima baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(IDS_RISET.map(barisRiset)).toEqual(RISET_TERKUNCI);
    expect(RISET_TERKUNCI).toHaveLength(5);
  });
  test("tiap nilai diagram, tebak, dan banding (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(tebakMentah)).toEqual(TEBAK_DAUN);
    expect(daun(banding)).toEqual(BANDING_DAUN);
  });
  test("sidik frontmatter, baris riset, diagram, tebak, banding, dan snippet terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(IDS_RISET.map((i) => sidik(barisRiset(i)))).toEqual(SIDIK.riset);
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(sidik(JSON.stringify(tebakMentah))).toBe(SIDIK.tebak);
    expect(sidik(JSON.stringify(banding))).toBe(SIDIK.banding);
    expect(snip.map((s) => sidik(s.teks))).toEqual(SIDIK.snippet);
  });
  test("profil kata penentu tiap baris badan (polaritas, urutan waktu, bilangan, kode status, label sumber) sama dengan nilai terkunci", () => {
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
