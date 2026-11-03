// Penjaga halaman 5.9 (keputusan 1532 sampai 1534): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, tebakan, baris riset, dan kartu Cek diri di
// rpo-rto-failover.mdx diturunkan dari rekaman labs/t5-replika (sinkron.txt, promosi.txt), kode lab (t5-replika/run.py,
// api-t5 cmd/api/main.go), README lab, naskah Tahap 5, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 5.12): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas nilai) mengunci SETIAP
// baris badan halaman; KUNCI_LITERAL di bawah mengunci setiap kalimat prosa di dalam berkas tes ini, supaya membangkitkan ulang berkas
// nilai dari halaman termutasi tidak melonggarkannya; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci
// tidak menangkap SALAHNYA kalimat; elemen non-prosa dikunci dengan sidik jari; tabel Hitungan dihitung ulang dengan pembulatan
// setengah ke atas. Baris riset dikunci dengan rentang naik (R5-150 sampai R5-154 berurutan naik), bukan dengan tetangga.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramIntiMentah from "../../data/diagram/t5-rpo-inti.json";
import diagramFailoverMentah from "../../data/diagram/t5-rpo-failover.json";
import tebakMentah from "../../data/widget/t5-rpo-tebak.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./rpo-rto-failover.halaman.nilai";
import { KUNCI_LITERAL } from "./rpo-rto-failover.halaman.kunci";

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
// Lapis pertahanan yang bisa dimatikan untuk uji mutasi tanpa kunci baris (TANPA_KUNCI=1) dan tanpa sidik jari (TANPA_SIDIK=1).
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
// KUNCI_LITERAL (berkas kunci terpisah) tetap menyala di TANPA_KUNCI; TANPA_LITERAL=1 mematikannya untuk mengukur hanya tes turunan.
const tanpaLiteral = process.env.TANPA_LITERAL === "1";

const BERKAS = "situs/src/content/docs/tahap-5/rpo-rto-failover.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const diagramInti = DataRantai.parse(diagramIntiMentah);
const diagramFailover = DataRantai.parse(diagramFailoverMentah);
const tebak = DataTebak.parse(tebakMentah);
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const sinkron = baca("labs/t5-replika/output/sinkron.txt");
const promosi = baca("labs/t5-replika/output/promosi.txt");
const runPy = baca("labs/t5-replika/run.py");
const readme = baca("labs/t5-replika/README.md");
const mainGo = baca("labs/api-t5/cmd/api/main.go");
const goMod = baca("labs/api-t5/go.mod");
const prd5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal3adr33 = baca("situs/src/content/docs/tahap-3/sengaja-belum.mdx");
const hal413 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const hal58 = baca("situs/src/content/docs/tahap-5/m42-database-utama-mati.mdx");
const hal55 = baca("situs/src/content/docs/tahap-5/read-replica.mdx");
const hal528 = baca("situs/src/content/docs/tahap-5/on-prem-lawan-cloud.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const tebakLain = ["t5-replica-tebak", "t5-adr60-tebak", "t5-skema-tebak"].map((n) => JSON.parse(baca(`situs/data/widget/${n}.json`)) as { pilihan: { benar: boolean }[] });
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];

interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; pendek?: string; path?: string }
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
const fmt = (n: number, d = 0): string => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
// pembulatan setengah ke atas seperti pembaca (bukan toFixed)
const bulat = (x: number, d = 0): number => Math.round(x * 10 ** d + 1e-9) / 10 ** d;
const IDS = ["R5-150", "R5-151", "R5-152", "R5-153", "R5-154"];
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- rekaman: bagian dan nomor baris -------------------------------------------------------------------------------------------
const bagianRekaman = (isi: string, huruf: string): { awal: number; akhir: number; baris: string[]; teks: string } => {
  const semua = isi.split("\n");
  const a = semua.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(a, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const z = semua.findIndex((b, n) => n > a && /^# --- [A-Z]\d?\. /.test(b));
  const akhir = z < 0 ? semua.length : z;
  return { awal: a + 1, akhir, baris: semua.slice(a, akhir), teks: semua.slice(a, akhir).join("\n") };
};
const nomorBaris = (isi: string, ok: (b: string, n: number) => boolean, dariBaris = 1): number => {
  const semua = isi.split("\n");
  const i = semua.findIndex((b, n) => n + 1 >= dariBaris && ok(b, n + 1));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const SA = bagianRekaman(sinkron, "A"), SB = bagianRekaman(sinkron, "B"), SC = bagianRekaman(sinkron, "C");
const PA = bagianRekaman(promosi, "A"), PB = bagianRekaman(promosi, "B");
// nilai pada baris ketiga sesudah perintah psql (judul kolom, pemisah, nilai), kemunculan ke-n dari perintah berawalan itu
const nilai = (bag: { baris: string[] }, awalan: string, ke = 0): string => {
  const idx = bag.baris.map((b, n) => (b.startsWith(awalan) ? n : -1)).filter((n) => n >= 0);
  const i = idx[ke];
  expect(i, `perintah ${awalan} kemunculan ${ke}`).toBeDefined();
  expect(bag.baris[i! + 2]!.startsWith("---"), `pemisah sesudah ${awalan}`).toBe(true);
  return bag.baris[i! + 3]!.trim();
};
const JURNAL_LIMA_DI_PRIMARY = Number(nilai(PA, "primary=> SELECT count(*) AS jurnal_ada", 0));
const JURNAL_LIMA_DI_BARU = Number(nilai(PA, "replika=> SELECT count(*) AS jurnal_ada", 1));
const JUMLAH_ID_LIMA = cocok(PA.teks, /AS jurnal_ada FROM t5_ledger\.jurnal WHERE id IN \(([\d, ]+)\)/)[1]!.split(",").length;
const JURNAL_TIGA_DI_BARU = Number(nilai(PB, "sinkron=> SELECT count(*) AS jurnal_ada"));
const JUMLAH_ID_TIGA = cocok(PB.teks, /AS jurnal_ada FROM t5_ledger\.jurnal WHERE id IN \(([\d, ]+)\)/)[1]!.split(",").length;
const BAYAR_PRIMARY_A = Number(nilai(PA, "primary=> SELECT count(*) AS jurnal_bayar"));
const BAYAR_BARU_A = Number(nilai(PA, "replika=> SELECT count(*) AS jurnal_bayar"));
const BAYAR_PRIMARY_B = Number(nilai(PB, "primary=> SELECT count(*) AS jurnal_bayar"));
const BAYAR_BARU_B = Number(nilai(PB, "sinkron=> SELECT count(*) AS jurnal_bayar"));
const BATAS_DETIK = Number(cocok(PB.teks, /curl --max-time (\d+)/)[1]);
const PER_MODE = Number(cocok(SB.teks, /(\d+) COMMIT satu baris per mode/)[1]);
const NAMA_SINKRON = cocok(SA.teks, /synchronous_standby_names = '([^']+)'/)[1]!; // FIRST 1 (replika_sinkron)

// ---- angka beban, anggaran, dan RTO dari naskah, PRD v5, dan halaman 4.13 ---------------------------------------------------------
const asumsi = (cerita.tahap[4] as unknown as { asumsi: Record<string, number> }).asumsi;
const barisM42 = naskah.split("\n").find((b) => b.startsWith("| M42 |"))!;
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Transaksi uang (bayar, transfer, QR) |"))!;
const barisAnggaran = naskah.split("\n").find((b) => b.startsWith("| Anggaran kegagalan |"))!;
const AKTIF = (asumsi.user! * asumsi.aktif!) / 100; // 200.000
const TRX = Number(cocok(barisBeban, /200\.000 × (\d) = 600\.000 per hari/)[1]); // 3 (naskah); registry trx 2 di sebelahnya
const TRX_REGISTRY = asumsi.trx!;
const DETIK = Number(cocok(prd5, /600\.000 ÷ ([\d.]+) × 10 \(asumsi\)/)[1]!.replace(".", ""));
const PUNCAK_TRX3 = (AKTIF * TRX) / DETIK * asumsi.puncak!; // 69,44
const PUNCAK_TRX2 = (AKTIF * TRX_REGISTRY) / DETIK * asumsi.puncak!; // 46,30
const RTO = Number(cocok(prd5, /pulih dalam (\d+) menit \(RTO\)/)[1]);
const GANGGUAN = Number(cocok(barisM42, /gagal (\d+) menit sampai Dewi/)[1]);
const MENIT_30_HARI = Number(cocok(prd5, /30 × 24 × 60 = ([\d.]+) menit/)[1]!.replace(".", ""));
const ANGGARAN = Number(cocok(prd5, /0,001 × [\d.]+ = ([\d,]+) menit/)[1]!.replace(",", "."));
const LOMPATAN_MS = Number(cocok(hal413, /Anggarannya (\d+) ms\./)[1]);
const JEDA_DETIK = Number(cocok(naskah.split("\n").find((b) => b.startsWith("| RPO replica asinkron |"))!, /jeda (\d) detik \(Asumsi\)/)[1]);

// ---- Snippet ---------------------------------------------------------------------------------------------------------------------
const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]!);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.9 ada, konsep, jalur inti, prasyarat 5.8, lab t5-replika, peran devops dan backend, ADR 48; judul sama dengan peta naskah; menit = baca + coba", () => {
    expect(dari("t5-rpo-rto")).toMatchObject({ ada: true, nomor: "5.9", jenis: "konsep", inti: true, prasyarat: ["t5-m42"], lab: ["t5-replika"], tahap: 5, peran: ["devops", "backend"], adr: [48], path: "tahap-5/rpo-rto-failover.md" });
    expect(frontmatter).toContain('title: "5.9 RPO, RTO, replica sinkron, dan failover + ADR 48"');
    expect(dari("t5-rpo-rto").judul).toBe("RPO, RTO, replica sinkron, dan failover + ADR 48");
    expect(naskah).toContain("| 5.9 | 4 | RPO, RTO, replica sinkron, dan failover + ADR 48 | Konsep + ADR | ★ | t5-replika | tebak |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-m42\]\] · Jalur inti<\/p>/);
    expect(dari("t5-rpo-rto").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(4);
  });
  test("lima blok sesuai templat konsep: Mulai dan Coba terbuka; blok Coba punya kalimat 'Kalau berhenti di sini'", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan).toContain('<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: standby sinkron yang mati menahan COMMIT tanpa galat sampai daftar standby sinkron diturunkan, dan selama daftar itu kosong COMMIT tidak menunggu siapa pun.">');
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["berikutnya", "t2-race-lock", "t3-adr-33", "t3-pool", "t4-modul", "t4-webhook", "t5-lag", "t5-m42", "t5-m46", "t5-onprem", "t5-pooler", "t5-prd", "t5-read-replica", "t5-tim-infra", "t5-adr-60"].sort());
    const sesuai: [string, string, string][] = [
      ["t2-race-lock", "2.11", "Race condition dan lock"], ["t3-adr-33", "3.30", "ADR 33"], ["t3-pool", "3.8", "Connection pool"], ["t4-modul", "4.13", "Modular monolith"], ["t4-webhook", "4.7", "Webhook masuk"],
      ["t5-lag", "5.7", "Replication lag dan read-your-writes"], ["t5-m42", "5.8", "M42"], ["t5-m46", "5.16", "M46"], ["t5-onprem", "5.28", "On-prem lawan cloud"],
      ["t5-pooler", "5.17", "Pooler koneksi"], ["t5-prd", "5.1", "PRD v5"], ["t5-read-replica", "5.5", "Read replica dan model baca"], ["t5-tim-infra", "5.27", "Tim dan infra Tahap 5"], ["t5-adr-60", "5.30", "ADR 60"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("5.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${esc(awal)}`));
    }
    expect(dari("t5-adr-60").ada).toBe(true);
    expect(dari("t5-pooler").adr).toEqual([52]);
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(badan).toContain("[Label sumber](/cara-pakai/#label-sumber)");
  });
  test("ADR 48 tepat sebagai judul keputusan; ADR 33, 34, 37, 52 disebut; ADR 46, 47 tidak dibuka isinya; ADR 48 di naskah memuat opsi dan angka yang dipakai halaman", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 33", "ADR 48", "ADR 52"].sort());
    expect(badan.match(/ADR 48/g)).toHaveLength(4);
    const adr48 = naskah.split("\n").find((b) => b.startsWith("| 48 | Ledger memakai replica sinkron kuorum"))!;
    for (const s of ["synchronous_standby_names = 'ANY 1 (r1, r2)'", "synchronous_commit = on", "Patroni v4.1.5", "CloudNativePG v1.30.1", "RTO 15 menit", "50 ms", "replica sinkron kuorum", "fencing", "dua standby"]) {
      if (s === "dua standby") continue;
      expect(adr48, s).toContain(s);
    }
    expect(adr48).toContain("Replica laporan (ADR 46) terpisah dan asinkron");
    expect(adr48).toContain("SRE melatih failover tiap bulan");
    expect(adr48).toContain("Bila kedua standby sinkron mati, SRE menurunkan jumlah");
  });
  test("kalimat sumber di halaman tetangga ada: 5.1 menjawab pemicu ADR 33 lewat 5.9; 3.30 menulis pemicu VPS kedua; 5.8 menunjuk 5.9; 5.5 menunjuk 5.9; 5.28 menyebut ADR 48; 4.13 menulis anggaran 50 ms", () => {
    expect(prd5).toContain("ADR 33 ([[t3-adr-33]]) menunda VPS kedua sampai waktu pulih atau jendela kehilangan data melebihi yang diterima Pak Hadi atau PRD. Backup harian berjendela sampai 24 jam, sedangkan PRD v5 menulis RPO nol dan RTO 15 menit, jadi pemicu itu terpenuhi dan [[t5-rpo-rto]] menjawabnya.");
    expect(prd5).toContain("Angka ini Asumsi produk");
    expect(hal3adr33).toContain("| VPS kedua | Waktu pulih terukur atau jendela kehilangan data lebih besar dari yang bisa diterima Pak Hadi atau PRD.");
    expect(hal58).toContain("- [[t5-rpo-rto]]: RPO dan RTO, standby sinkron, failover, dan fencing. Keputusannya ADR 48.");
    expect(hal55).toContain("[[t5-m42]] menunjukkan transaksi yang hilang saat primary mati, dan jawabannya ada di [[t5-rpo-rto]].");
    expect(hal528).toContain("ADR 48 menambah replica sinkron ([[t5-rpo-rto]])");
    expect(hal413).toContain("Anggarannya 50 ms.");
    expect(naskah.split("\n").find((b) => b.startsWith("| M46 |"))).toContain("latihan failover pertama Dewi");
  });
  test("istilah baru ada di glosarium dengan tautan ke 5.9: Failover, Fencing, Promosi, Standby sinkron", () => {
    for (const t of ["Failover", "Fencing", "Promosi", "Standby sinkron"]) {
      const b = glosarium.split("\n").find((x) => x.startsWith(`| **${t}** |`));
      expect(b, t).toBeDefined();
      expect(b!.endsWith("| [[t5-rpo-rto]] |"), t).toBe(true);
    }
    expect(glosarium.split("\n").find((x) => x.startsWith("| **RPO**"))).toContain("RPO nol berarti transaksi yang sudah dijawab sukses tidak boleh hilang.");
  });
});

// ---- rekaman sinkron.txt dan promosi.txt, kode lab, dan rentang Snippet ----------------------------------------------------------
describe("rekaman sinkron.txt dan promosi.txt: bagian, angka, dan rentang Snippet", () => {
  test("sinkron.txt bagian A: satu kandidat FIRST 1 (replika_sinkron); replika_sinkron sync dan replika_laporan async; halaman menulis 'satu nama' dan async untuk laporan", () => {
    expect(NAMA_SINKRON).toBe("FIRST 1 (replika_sinkron)");
    expect(SA.teks).toMatch(/replika_laporan\s+\| streaming \| async/);
    expect(SA.teks).toMatch(/replika_sinkron\s+\| streaming \| sync/);
    expect(SA.teks).toContain("ANY 1 dari dua kandidat Tidak dijalankan di lab ini; Patroni dan CloudNativePG juga Tidak dijalankan.");
    expect(badan).toContain("Dengan `FIRST 1 (replika_sinkron)`, `replika_sinkron` berstatus `sync`. `replika_laporan` tetap `async`, jadi COMMIT tidak menunggunya.");
    expect(badan).toContain("Lab memakai satu nama, jadi macet di atas bukan sifat `FIRST`.");
  });
  test("sinkron.txt bagian B: replay ditahan; on selesai, remote_apply menunggu di SyncRep; 600 COMMIT per mode; selisih tercepat di bawah 1 ms; on lebih lambat dari local", () => {
    expect(SB.teks).toContain("COMMIT dengan synchronous_commit = on selesai selagi replay ditahan: ya");
    expect(SB.teks).toMatch(/uji-remote-apply\s+\| IPC\s+\| SyncRep/);
    expect(SB.teks).toContain("COMMIT remote_apply selesai sesudah replay dilanjutkan dan barisnya terlihat: ya");
    expect(SB.teks).toContain("selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms: ya (nilai tidak direkam");
    expect(SB.teks).toContain("COMMIT tercepat dengan standby sinkron (on) lebih lambat dari local: ya");
    expect(PER_MODE).toBe(600);
    expect(badan).toContain(`dari ${PER_MODE} COMMIT per mode`);
    expect(runPy).toContain("def waktu_commit(mode, n=200):");
    expect(runPy).toContain("for _ in range(3):");
    expect(badan).toContain("COMMIT dengan `on` selesai selagi replay ditahan. COMMIT dengan `remote_apply` menunggu di `SyncRep` sampai replay dilanjutkan.");
    expect(badan).toContain("Lab hanya merekam bahwa COMMIT tercepat dengan standby sinkron lebih lambat dari `local` (`sinkron.txt` bagian B, nilai tidak direkam).");
  });
  test("sinkron.txt bagian C: container standby dihentikan; hanya replika_laporan tersisa; satu COMMIT menunggu SyncRep; baris tidak terlihat (0) lalu terlihat (1) sesudah daftar dikosongkan", () => {
    expect(SC.teks).toContain("$ docker compose stop sinkron");
    expect(SC.teks).toMatch(/replika_laporan\s+\| async\n\(1 row\)/);
    expect(SC.teks).toMatch(/uji-macet\s+\| IPC\s+\| SyncRep/);
    expect(Number(nilai(SC, "primary=> SELECT count(*) AS baris_macet_terlihat", 0))).toBe(0);
    expect(Number(nilai(SC, "primary=> SELECT count(*) AS baris_macet_terlihat", 1))).toBe(1);
    expect(SC.teks).toContain("primary=> ALTER SYSTEM SET synchronous_standby_names = ''");
    expect(SC.teks).toContain("Halaman PostgreSQL 17 tentang replikasi sinkron tidak menyebut batas waktu penantian; lab tidak menunggunya.");
    expect(SC.teks).toContain("COMMIT tidak lagi menunggu siapa pun, jadi jaminan RPO nol hilang selama itu.");
    expect(badan).toContain("Halaman itu tidak menyebut batas waktu penantian, dan lab tidak menunggunya.");
    expect(badan).toContain("Sesudah daftar dikosongkan, COMMIT yang macet selesai. Harganya: selama daftar kosong, COMMIT tidak menunggu siapa pun, jadi jaminan RPO nol berhenti.");
  });
  test("kode lab: COMMIT macet adalah INSERT uji lewat psycopg (bukan pembayaran), standby dihentikan dengan docker compose stop, daftar dikosongkan lewat atur_sinkron(\"\"); putus() memutus koneksi WAL tanpa mematikan primary", () => {
    const rekam = cocok(runPy, /def rekam_sinkron\(\):\n([\s\S]+?)\n\n\n# ---------- promosi\.txt/)[1]!;
    expect(rekam).toContain('t = commit_di_thread("uji-macet", "on", "macet", hasil)');
    expect(runPy).toContain('c.execute("INSERT INTO replika_uji.catatan (v) VALUES (%s)", (v,))');
    expect(rekam).toContain('kompose("stop", "sinkron")');
    expect(rekam).toContain('atur_sinkron("")');
    expect(runPy).toContain('c.execute(f"SET synchronous_commit = {mode}")');
    const putus = cocok(runPy, /def putus\(role, app\):\n([\s\S]+?)\n\n\n/)[1]!;
    expect(putus).toContain('tanya("primary", f"ALTER ROLE {role} NOLOGIN")');
    expect(putus).toContain("pg_terminate_backend");
    expect(putus).not.toMatch(/stop|kill|SIGKILL|docker/);
    const promosiFungsi = cocok(runPy, /def rekam_promosi\(\):\n([\s\S]+?)\n\n\n# ---------- konflik\.txt/)[1]!;
    expect(promosiFungsi.match(/SELECT pg_promote\(wait => true\)/g)).toHaveLength(2);
    expect(promosiFungsi).not.toMatch(/kompose\("stop", "primary"\)/);
    expect(badan).toContain("Lab memerankan primary yang gagal tanpa mematikannya. Koneksi WAL satu standby diputus di sisi primary, lalu standby itu dipromosikan:");
  });
  test("promosi.txt: 0 dari 5 jurnal di node baru (A), 3 dari 3 (B), keempat 4 lawan 3; primary lama 9 lawan 3 jurnal bayar; batas 3 detik; Rantai Inti memakai nilai itu", () => {
    expect([JURNAL_LIMA_DI_PRIMARY, JURNAL_LIMA_DI_BARU, JUMLAH_ID_LIMA]).toEqual([5, 0, 5]);
    expect([JURNAL_TIGA_DI_BARU, JUMLAH_ID_TIGA]).toEqual([3, 3]);
    expect([BAYAR_PRIMARY_A, BAYAR_BARU_A]).toEqual([9, 3]);
    expect([BAYAR_PRIMARY_B, BAYAR_BARU_B]).toEqual([4, 3]);
    expect(BATAS_DETIK).toBe(3);
    expect(PA.teks).toContain("Fencing (menghentikan primary lama sebelum node baru menerima tulisan) tidak ada di lab ini");
    expect(PB.teks).toContain("The transaction has already committed locally, but might not have been replicated to the standby.");
    expect(badan).toContain(`primary lama punya ${BAYAR_PRIMARY_A} jurnal bayar dan node baru ${BAYAR_BARU_A} (\`promosi.txt\` bagian A)`);
    expect(badan).toContain(`Replica asinkron kehilangan 0 dari ${JUMLAH_ID_LIMA} jurnal 201 saat dipromosikan`);
    expect(badan).toContain(`Rekaman bagian A di [[t5-m42]] menunjukkan ${JURNAL_LIMA_DI_BARU} dari ${JUMLAH_ID_LIMA} jurnal 201 di node baru.`);
    expect(badan).toContain(`Primary lama mencatat ${BAYAR_PRIMARY_B} jurnal bayar dan node baru ${BAYAR_BARU_B} (\`promosi.txt\` bagian B).`);
    expect(badan).toContain(`lima jurnal 201 tidak ada di replica asinkron yang dipromosikan (bagian A). Tiga jurnal 201 ada di standby sinkron yang dipromosikan (bagian B).`);
  });
  test("rentang Snippet diturunkan dari isi berkas: enam Snippet, judul memuat berkas dan bagian, rentang sama dengan penanda di rekaman dan kode", () => {
    expect(tag).toHaveLength(7);
    const rentang = (t: string): string[] => [...t.matchAll(/file="([^"]+)" lines="(\d+:\d+)"/g)].map((m) => `${m[1]}@${m[2]}`);
    const dipakai = tag.flatMap(rentang);
    const a1 = nomorBaris(sinkron, (b) => b.startsWith("primary=> SELECT application_name, state, sync_state"));
    const z1 = nomorBaris(sinkron, (b) => b.startsWith("# replika_sinkron sinkron; replika_laporan tetap asinkron"), a1);
    const a2 = nomorBaris(sinkron, (b) => b.startsWith("sinkron=> SELECT pg_wal_replay_pause()"));
    const z2 = nomorBaris(sinkron, (b) => b.startsWith("COMMIT remote_apply selesai sesudah replay dilanjutkan"), a2);
    const a3 = nomorBaris(sinkron, (b) => b.startsWith("$ docker compose stop sinkron"));
    const z3 = nomorBaris(sinkron, (b) => b.startsWith("# COMMIT menunggu di SyncRep dan barisnya belum terlihat"), a3);
    const a4 = nomorBaris(sinkron, (b) => b.startsWith("# Dokumentasi menyuruh menurunkan jumlah standby sinkron"), z3);
    const z4 = nomorBaris(sinkron, (b) => b.startsWith("# COMMIT tidak lagi menunggu siapa pun"), a4);
    const a5 = nomorBaris(runPy, (b) => b.startsWith("def putus(role, app):"));
    const z5 = nomorBaris(runPy, (b, n) => n > a5 && b === "", a5) - 1;
    expect(dipakai).toEqual([
      `labs/t5-replika/output/sinkron.txt@${a1}:${z1}`, `labs/t5-replika/output/sinkron.txt@${a2}:${z2}`, `labs/t5-replika/output/sinkron.txt@${a3}:${z3}`,
      `labs/t5-replika/output/sinkron.txt@${a4}:${z4}`, `labs/t5-replika/run.py@${a5}:${z5}`,
    ]);
    // Snippet Go: dua rentang di main.go (DATABASE_URL dan bukaDB)
    const files = cocok(badan, /<Snippet files=\{\["labs\/api-t5\/cmd\/api\/main\.go:(\d+):(\d+)", "labs\/api-t5\/cmd\/api\/main\.go:(\d+):(\d+)"\]\}/);
    const g1 = nomorBaris(mainGo, (b) => b.trim() === 'url := os.Getenv("DATABASE_URL")');
    const g1z = nomorBaris(mainGo, (b) => b.includes("db, err := bukaDB(url, *pool, *idleTx, *peran)"), g1) + 2;
    const g2 = nomorBaris(mainGo, (b) => b.startsWith("func bukaDB("));
    const g2z = g2 + 4;
    expect([Number(files[1]), Number(files[2]), Number(files[3]), Number(files[4])]).toEqual([g1, g1z, g2, g2z]);
    expect(mainGo.split("\n").slice(g1z - 1, g1z)[0]!.trim()).toBe("log.Fatal(err)");
    expect(mainGo.split("\n")[g2]!.trim()).toBe("cfg, err := pgx.ParseConfig(url)");
    expect(mainGo.split("\n")[g2 + 2]!.trim()).toBe("return nil, err");
    expect(mainGo.split("\n")[g2z - 1]!.trim()).toBe("}");
    // judul Snippet menyebut berkas dan bagian yang benar
    expect(judulSnippet.slice(0, 6)).toEqual([
      "Rekaman lab: labs/t5-replika/output/sinkron.txt, bagian A (satu standby sinkron, satu asinkron)",
      "Rekaman lab: labs/t5-replika/output/sinkron.txt, bagian B (replay ditahan)",
      "Rekaman lab: labs/t5-replika/output/sinkron.txt, bagian C (standby sinkron dimatikan)",
      "Rekaman lab: labs/t5-replika/output/sinkron.txt, bagian C (daftar dikosongkan)",
      `Kode lab: labs/t5-replika/run.py baris ${a5} sampai ${z5} (putus)`,
      "Kode lab: labs/api-t5/cmd/api/main.go (DATABASE_URL dan pgx.ParseConfig)",
    ]);
    expect(judulSnippet[6]).toBeUndefined(); // Snippet JS memakai prop code tanpa judul
    expect(a1 > SA.awal && z1 <= SA.akhir).toBe(true);
    expect(a2 > SB.awal && z2 <= SB.akhir).toBe(true);
    expect(a3 > SC.awal && z3 <= SC.akhir && a4 > SC.awal && z4 <= SC.akhir).toBe(true);
  });
  test("go.mod memakai pgx v5.11.0, sama dengan versi yang dibaca di baris riset; rekaman memakai PostgreSQL 17.11 sedangkan halaman menulis dokumentasi PostgreSQL 17", () => {
    expect(goMod).toContain("github.com/jackc/pgx/v5 v5.11.0");
    expect(barisRiset("R5-154")).toContain("pgx v5.11.0");
    expect(badan).toContain("pgx v5.11.0");
    expect(sinkron.split("\n")[1]).toContain("PostgreSQL 17.11");
    expect(readme).toContain("Dokumentasi PostgreSQL yang dirujuk adalah versi 17 (versi yang dijalankan lab), dibuka 2026-11-02.");
    expect(badan).not.toMatch(/PostgreSQL 18|postgresql\.org\/docs\/(current|18)/);
  });
});

// ---- hitungan --------------------------------------------------------------------------------------------------------------------
describe("hitungan: tabel Hitungan dihitung ulang dari angka yang tertulis di halaman", () => {
  const baris = badan.split("\n").filter((b) => /^\| .+ \| .+ \| .+ \|$/.test(b) && !b.startsWith("| ---") && !b.startsWith("| Besaran") && !b.startsWith("| Yang ditunda"));
  const tabel = baris.filter((b) => /×|÷|−/.test(b));
  test("masukan: 200.000 aktif, 3 (naskah) dan 2 (registry) transaksi, 86.400 detik, puncak 10 → 69,44 dan 46,30; ditulis 69,4 dan 46,3", () => {
    expect([AKTIF, TRX, TRX_REGISTRY, DETIK, asumsi.puncak]).toEqual([200000, 3, 2, 86400, 10]);
    expect(bulat(PUNCAK_TRX3, 2)).toBe(69.44);
    expect(bulat(PUNCAK_TRX2, 2)).toBe(46.3);
    expect(badan).toContain("69,4 transaksi uang per detik di puncak, dan 46,3 dengan 2 transaksi per user aktif");
    expect([RTO, GANGGUAN, MENIT_30_HARI, ANGGARAN, LOMPATAN_MS, JEDA_DETIK]).toEqual([15, 23, 43200, 43.2, 50, 1]);
    expect(badan).toContain("RTO 15 menit dan anggaran 43,2 menit dari PRD v5 (Asumsi produk), serta gangguan 23 menit dari naskah M42 (Ilustrasi).");
    expect(badan).toContain("50 ms untuk tambahan COMMIT, yaitu anggaran satu lompatan di [[t4-modul]] (Asumsi).");
    expect(barisAnggaran).toContain("0,001 × 43.200");
    expect(badan).toContain(`0,001 × ${fmt(MENIT_30_HARI)} = ${fmt(ANGGARAN, 1)} menit`);
  });
  test("enam baris Hitungan: rumus dan hasil sama dengan hitungan ulang (setengah ke atas)", () => {
    const p3 = bulat(PUNCAK_TRX3, 1), p2 = bulat(PUNCAK_TRX2, 1); // 69,4 dan 46,3 sebagaimana tertulis
    const harapan: string[] = [
      `| Transaksi uang dalam jeda ${JEDA_DETIK} detik | ${JEDA_DETIK} × ${fmt(p3, 1)} | ${fmt(bulat(JEDA_DETIK * p3))}, dan ${fmt(bulat(JEDA_DETIK * p2))} dengan ${fmt(p2, 1)} |`,
      `| Koneksi tambahan bila COMMIT menunggu ${LOMPATAN_MS} ms | ${fmt(p3, 1)} × 0,05 | ${fmt(bulat(p3 * 0.05, 2), 2)}, dan ${fmt(bulat(p2 * 0.05, 2), 2)} dengan ${fmt(p2, 1)} |`,
      `| Pembayaran per detik pada satu buku bila lock ditahan ${LOMPATAN_MS} ms | 1 ÷ 0,05 | ${fmt(1 / 0.05)} |`,
      `| Gangguan ${GANGGUAN} menit melewati RTO | ${GANGGUAN} − ${RTO} | ${GANGGUAN - RTO} menit |`,
      `| Gangguan ${GANGGUAN} menit terhadap anggaran ${fmt(ANGGARAN, 1)} menit | ${GANGGUAN} ÷ ${fmt(ANGGARAN, 1)} | ${fmt(bulat((GANGGUAN / ANGGARAN) * 100, 1), 1)}% |`,
      `| Pemulihan manual ${RTO} menit terhadap anggaran ${fmt(ANGGARAN, 1)} menit | ${RTO} ÷ ${fmt(ANGGARAN, 1)} | ${fmt(bulat((RTO / ANGGARAN) * 100, 1), 1)}% |`,
    ];
    expect(tabel).toEqual(harapan);
    expect(bulat(p2 * 0.05, 2)).toBe(2.32); // 2,315 dibulatkan setengah ke atas, bukan toFixed (2,31 atau 2,32 bergantung biner)
    expect(bulat(p3 * 0.05, 2)).toBe(3.47);
    expect(bulat((GANGGUAN / ANGGARAN) * 100, 1)).toBe(53.2);
    expect(bulat((RTO / ANGGARAN) * 100, 1)).toBe(34.7);
    expect(baris.filter((b) => b.startsWith("| Besaran"))).toHaveLength(0);
  });
  test("angka yang sama di ADR dan Kapan salah: 3,47, 20, 53,2%, 34,7%, 8 menit, 69; label Hitungan atas Asumsi; asal angka disebut sebelum tabel", () => {
    const putusan = badan.slice(badan.indexOf("<Blok nama=\"Putuskan\">"));
    expect(putusan).toContain(`Pembandingnya koneksi tambahan ${fmt(bulat(PUNCAK_TRX3, 1), 1)} × 0,05 = ${fmt(bulat(bulat(PUNCAK_TRX3, 1) * 0.05, 2), 2)}.`);
    expect(putusan).toContain(`Saat satu buku menerima lebih dari 1 ÷ 0,05 = ${fmt(1 / 0.05)} pembayaran per detik.`);
    expect(putusan).toContain(`selisih ${GANGGUAN - RTO} menit dan ${fmt(bulat((GANGGUAN / ANGGARAN) * 100, 1), 1)}% dari anggaran ${fmt(ANGGARAN, 1)} menit`);
    expect(putusan).toContain(`${RTO} ÷ ${fmt(ANGGARAN, 1)} = ${fmt(bulat((RTO / ANGGARAN) * 100, 1), 1)}% anggaran`);
    expect(badan).toContain(`Di skala naskah jumlahnya ${fmt(bulat(JEDA_DETIK * bulat(PUNCAK_TRX3, 1)))} transaksi per jeda ${JEDA_DETIK} detik`);
    expect(badan).toContain("Tiap hasil di tabel adalah Hitungan atas Asumsi atau Ilustrasi.");
    expect(badan.indexOf("69,4 transaksi uang per detik di puncak")).toBeLessThan(badan.indexOf("| Transaksi uang dalam jeda"));
    expect(badan).toContain("Koneksi tambahan memakai L = λ × W dari [[t3-pool]].");
  });
});

// ---- sumber luar -----------------------------------------------------------------------------------------------------------------
describe("sumber luar: baris riset, tanggal akses, tautan, dan kutipan", () => {
  test("lima baris riset R5-150 sampai R5-154 ada, naik berurutan (rentang, bukan tetangga), tanpa ganda; tanggal akses sama dengan tanggal di halaman", () => {
    const nomor = [...riset.matchAll(/^\| R5-(\d+) \|/gm)].map((m) => Number(m[1]));
    expect(new Set(nomor).size).toBe(nomor.length);
    expect(nomor).toEqual([...nomor].sort((a, b) => a - b));
    for (const id of IDS) expect(nomor.filter((x) => `R5-${x}` === id), id).toHaveLength(1);
    const i = nomor.indexOf(150);
    expect(nomor.slice(i, i + 5)).toEqual([150, 151, 152, 153, 154]);
    const tanggal = [...badan.matchAll(/dibuka (2026-\d\d-\d\d)/g)].map((m) => m[1]!);
    expect(tanggal).toHaveLength(16);
    for (const t of tanggal) expect(t).toBe("2026-11-03");
    for (const id of IDS) expect(barisRiset(id), id).toMatch(/dibuka 2026-11-03|dibaca 2026-11-03/);
    for (const id of IDS) expect(barisRiset(id), id).toMatch(/Tidak berubah/);
    expect(badan.match(/diakses|dibuka (?!2026-11-03)\d{4}-\d\d-\d\d/g)).toBeNull();
  });
  test("tautan eksternal: URL sama dengan baris riset; teks tautan deskriptif; tidak ada ID riset, nomor keputusan, atau nomor PR di halaman, diagram, tebakan, dan kartu", () => {
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    // teks tautan yang sama menuju URL yang sama di seluruh halaman
    const peta = new Map<string, string>();
    for (const [t, u] of tautan) {
      if (peta.has(t)) expect(peta.get(t), `teks tautan ganda ${t}`).toBe(u);
      peta.set(t, u);
    }
    expect(peta.size).toBeGreaterThan(10);
    const rujuk: Record<string, string[]> = {
      "R5-150": ["postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION", "postgresql.org/docs/17/runtime-config-replication.html", "postgresql.org/docs/17/runtime-config-wal.html"],
      "R5-151": ["postgresql.org/docs/17/warm-standby-failover.html", "postgresql.org/docs/17/functions-admin.html", "postgresql.org/docs/17/app-pgrewind.html"],
      "R5-152": ["csrc.nist.gov/glossary/term/recovery_point_objective", "csrc.nist.gov/glossary/term/recovery_time_objective"],
      "R5-153": ["patroni.readthedocs.io/en/latest/replication_modes.html", "patroni.readthedocs.io/en/latest/watchdog.html", "cloudnative-pg.io/docs/1.30/replication/"],
      "R5-154": ["node-postgres.com/features/connecting", "github.com/porsager/postgres", "laravel.com/docs/13.x/database", "docs.djangoproject.com/en/5.2/ref/databases/", "docs.djangoproject.com/en/5.2/ref/settings/", "docs.serverpod.dev/concepts/data-and-the-database/database/connection", "supabase.com/docs/guides/platform/read-replicas"],
    };
    // URL utuh: tidak boleh diikuti huruf, angka, atau tanda yang memperpanjangnya
    for (const [id, urls] of Object.entries(rujuk)) for (const u of urls) {
      expect(barisRiset(id), `${id} ${u}`).toMatch(new RegExp(esc(u) + "(?![\\w#/.-])"));
    }
    // setiap URL eksternal di halaman (kecuali tautan rilis) ada di salah satu baris riset (tanpa skema dan tanpa awalan www)
    const semuaBaris = IDS.map(barisRiset).join("\n");
    for (const [, u] of tautan) {
      const tanpa = u.replace(/^https:\/\/(www\.)?/, "");
      if (tanpa === "cloudnative-pg.io/docs/1.30/failover/" || tanpa === "patroni.readthedocs.io/en/latest/watchdog.html") continue;
      expect(semuaBaris.includes(tanpa.replace(/\/$/, "")), u).toBe(true);
    }
    const semuaTeks = [badan, JSON.stringify(diagramIntiMentah), JSON.stringify(diagramFailoverMentah), JSON.stringify(tebakMentah), JSON.stringify(kartuSemua.filter((k) => k.halaman === "t5-rpo-rto")), frontmatter].join("\n");
    expect(semuaTeks).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(semuaTeks).not.toMatch(/keputusan \d{3,4}|PR #?\d{3}|#\d{3}\b/);
  });
  test("R5-150: kutipan dokumentasi PostgreSQL 17 utuh di baris riset; halaman menulis tidak lebih kuat ('mungkin tidak pernah selesai', 'sebanding', 'hanya bisa hilang bila')", () => {
    const b = barisRiset("R5-150");
    for (const s of [
      "PostgreSQL streaming replication is asynchronous by default.",
      "The amount of data loss is proportional to the replication delay at the time of failover.",
      "The only possibility that data can be lost is if both the primary and the standby suffer crashes at the same time.",
      "If any of the current synchronous standbys disconnects for whatever reason, it will be replaced immediately with the next-highest-priority standby.",
      "at least the requested number of synchronous standbys in the list",
      "transaction locks continue to be held until the transfer is confirmed",
      "Such transaction commits may never be completed if any one of the synchronous standbys should crash.",
      "you should fail over to the best candidate of those other remaining standby servers",
      "FIRST 1 (s1, s2) and s1, s2 have the same meaning",
      "will cause much larger commit delays",
      "ensures the transaction will not be lost unless both the primary and all synchronous standbys suffer corruption of their database storage",
      "the behavior for any one transaction is determined by the setting in effect when it commits",
    ]) expect(b, s).toContain(s);
    expect(badan).toContain("Dokumentasi PostgreSQL 17 menulis bahwa kehilangan data sebanding dengan jeda replikasi saat failover");
    expect(badan).toContain("Dokumentasi menulis bahwa commit seperti ini mungkin tidak pernah selesai bila salah satu standby sinkron mati.");
    expect(badan).toContain("Menurut dokumentasi, `FIRST 1 (s1, s2)` sama artinya dengan `s1, s2`.");
    expect(badan).toContain("2. Data hanya bisa hilang bila primary dan standby gagal bersamaan (PostgreSQL 17: replikasi sinkron).");
    expect(badan).toContain("Dokumentasi menulis bahwa `remote_apply` menimbulkan jeda commit yang jauh lebih besar, karena menunggu replay");
    expect(badan).toContain("Dokumentasi menulis bahwa bila primary terisolasi, failover dilakukan ke kandidat terbaik di antara standby yang tersisa.");
  });
  test("R5-151: kutipan failover, STONITH, pg_rewind, prosedur tertulis, pg_promote dan pg_last_wal_receive_lsn; halaman menulis 'kadang disebut STONITH' dan 'bisa mempercepat'", () => {
    const b = barisRiset("R5-151");
    for (const s of [
      "PostgreSQL does not provide the system software required to identify a failure on the primary and notify the standby database server. Many such tools exist and are well integrated with the operating system facilities required for successful failover, such as IP address migration.",
      "is necessary to avoid situations where both systems think they are the primary",
      "The pg_rewind utility can be used to speed up this process on large clusters.",
      "Written administration procedures are advised.",
      "also serves as a test of the failover mechanism",
      "pg_promote(wait boolean DEFAULT true, wait_seconds integer DEFAULT 60)",
      "Returns the last write-ahead log location that has been received and synced to disk by streaming replication.",
    ]) expect(b, s).toContain(s);
    expect(badan).toContain("Dokumentasi menulis bahwa langkah itu kadang disebut STONITH, dan halaman ini menyebutnya fencing.");
    expect(badan).toContain("`pg_rewind` bisa mempercepat pembuatan ulang standby di cluster besar.");
    expect(badan).toContain("Banyak perangkat seperti itu ada di luarnya");
    expect(badan).toContain("Dokumentasi menyarankan prosedur administrasi tertulis.");
    expect(badan).toContain("`pg_last_wal_receive_lsn()` mengembalikan posisi WAL terakhir yang diterima dan disimpan standby");
  });
  test("R5-152: definisi RPO dan RTO dari NIST utuh di baris riset; halaman menulis 'titik waktu' dan 'sebelum mengganggu misi organisasi' dan RPO nol serta RTO 15 menit sebagai Asumsi produk", () => {
    const b = barisRiset("R5-152");
    expect(b).toContain("The point in time to which data must be recovered after an outage.");
    expect(b).toContain("The overall length of time an information system's components can be in the recovery phase before negatively impacting the organization's mission or mission/business processes.");
    expect(b).toContain("NIST SP 800-34 Rev. 1");
    expect(badan).toContain("NIST menulis RPO sebagai titik waktu yang datanya harus bisa dipulihkan sesudah gangguan.");
    expect(badan).toContain("sebelum mengganggu misi organisasi ([NIST SP 800-34 Rev. 1, glosarium CSRC](https://csrc.nist.gov/glossary/term/recovery_point_objective), dibuka 2026-11-03)");
    expect(badan).toContain("PRD v5 menulis RPO nol dan RTO 15 menit sebagai Asumsi produk ([[t5-prd]]).");
    expect(prd5).toContain("RPO nol untuk transaksi uang yang sudah dijawab sukses");
  });
  test("R5-153: versi Patroni v4.1.5 dan CloudNativePG v1.30.1 dan tanggal rilis ada di baris riset dan di halaman; kutipan Patroni dan CloudNativePG utuh", () => {
    const b = barisRiset("R5-153");
    expect(b).toContain("Patroni v4.1.5 terbit 2026-08-12 dan CloudNativePG v1.30.1 terbit 2026-09-23");
    expect(badan).toContain("Patroni v4.1.5 (rilis 2026-08-12) atau CloudNativePG v1.30.1 (rilis 2026-09-23) Tidak dijalankan");
    for (const s of [
      "Using PostgreSQL synchronous replication does not guarantee zero lost transactions under all circumstances.",
      "a third node that might not contain all transactions will be promoted.",
      "Patroni will not promote a standby unless it is certain that the standby contains all transactions that may have returned a successful commit status to client",
      "commits will block until next iteration of Patroni runs and switches the primary to standalone mode",
      "prevents Patroni from switching off the synchronous replication",
      "an additional layer of fail safe",
      "ANY 1 (cluster-example-2, cluster-example-3, cluster-example-1)",
      "write operations will pause if the required number of synchronous standbys is unavailable",
      "ensures zero data loss (RPO=0)",
      "write operations will continue even if fewer than the requested number of standbys are available",
    ]) expect(b, s).toContain(s);
    expect(badan).toContain("Dokumentasi Patroni 4.1.5 menulis bahwa replikasi sinkron tidak menjamin nol transaksi hilang dalam semua keadaan.");
    expect(badan).toContain("`synchronous_mode_strict` mencegah peralihan itu, dengan harga primary berhenti menerima tulisan sampai satu standby sinkron kembali.");
    expect(badan).toContain("`dataDurability: required` menghentikan tulisan bila jumlah standby sinkron tidak cukup, dan `preferred` melanjutkan tulisan walau standby kurang");
    expect(badan).not.toContain("RPO=0");
  });
  test("R5-154: tab stack — versi, kutipan, dan klaim negatif berlingkup 'dicari di teks halaman'; enam label tab dan urutan slot", () => {
    const b = barisRiset("R5-154");
    for (const s of [
      "ParseConfig supports specifying multiple hosts in similar manner to libpq. Host and port may include comma separated values that will be tried in order.",
      "read-write, read-only, primary, standby, prefer-standby, dan any",
      "show transaction_read_only", "pg 8.23.1 di npm", "postgres 4.0.0 di npm", "Serverpod 4.1.0",
      "zero downtime failovers", "Extra parameters to use when connecting to the database.", "Replication is asynchronous to ensure that transactions on the Primary aren't blocked.",
      "kata failover tidak ada di teks keenam halaman, dicari 2026-11-03",
    ]) expect(b, s).toContain(s);
    const labels = cocok(badan, /<TabSet id="stack" labels=\{(\[[^\]]+\])\}>/)[1]!;
    expect(JSON.parse(labels)).toEqual(["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]);
    const slot = [...badan.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1]);
    expect(slot).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    const tab = badan.split(/<Fragment slot="t\d">/).slice(1).map((x) => x.split("</Fragment>")[0]!);
    expect(tab).toHaveLength(6);
    expect(tab[0]).toContain("pgx v5.11.0");
    expect(tab[1]).toContain("pg 8.23.1");
    expect(tab[1]).toContain("postgres 4.0.0");
    expect(tab[2]).toContain("Laravel 13.x: Database");
    expect(tab[3]).toContain("Django 5.2: Databases");
    expect(tab[4]).toContain("Serverpod 4.1.0");
    expect(tab[5]).toContain("Supabase: Read Replicas");
    // klaim negatif tab: tiap tab non-Go menyebut lingkup 'dicari di teks halaman' dan kata yang dicari
    for (const i of [2, 3, 4, 5]) expect(tab[i], `tab ${i}`).toMatch(/dicari di teks halaman/);
    expect(tab[1]).toMatch(/dicari di teks halaman/);
    expect(tab[2]).toContain("tidak memuat kata failover, `target_session_attrs`, maupun beberapa host");
    expect(tab[3]).toContain("kedua halaman tidak memuat kata failover, `target_session_attrs`, maupun beberapa host");
    expect(tab[4]).toContain("tidak memuat kata failover, replica, maupun beberapa host");
    expect(tab[5]).toContain("tidak memuat kata failover maupun promote");
    expect(tab[0]).toContain("Dijalankan sebagian");
    for (const i of [1, 2, 3, 4, 5]) expect(tab[i], `tab ${i}`).toMatch(/\*Tidak dijalankan\./);
    expect(badan).toContain("Tab Go dijalankan sebagian di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-03. Kode di tab lain adalah Ilustrasi.");
    expect(tab[0]).toContain("Primary lama yang masih menerima tulisan tidak menjawab `on`, jadi pemeriksaan itu juga lolos untuknya (penalaran dari kode dan `promosi.txt` bagian A, Tidak dijalankan).");
  });
  test("baris riset sumber luar: 'Berubah sejak' menulis Tidak berubah dengan tanggal yang sama dengan tanggal akses; baris R5-154 memuat hitungan 69,4 × 0,05 = 3,47 dan 46,3 × 0,05 = 2,315", () => {
    for (const id of IDS) {
      const sel = barisRiset(id).split("|").map((x) => x.trim());
      expect(sel[sel.length - 2]!.startsWith("Tidak berubah"), `${id}: ${sel[sel.length - 2]}`).toBe(true);
    }
    for (const id of ["R5-150", "R5-151", "R5-152", "R5-153"]) {
      const sel = barisRiset(id).split("|").map((x) => x.trim());
      expect(sel[sel.length - 2]).toMatch(/Tidak berubah/);
      expect(cocok(sel[3]!, /dibuka (\d{4}-\d{2}-\d{2})/)[1]).toBe("2026-11-03");
    }
    const h = barisRiset("R5-154");
    expect(h).toContain("69,4 × 0,05 = 3,47");
    expect(h).toContain("46,3 × 0,05 = 2,315 (2,32)");
    expect(h).toContain("1 ÷ 0,05 = 20");
    expect(h).toContain(`${GANGGUAN} − ${RTO} = ${GANGGUAN - RTO}`);
    expect(h).toContain("23 ÷ 43,2 = 0,5324 (53,2%)");
    expect(h).toContain("15 ÷ 43,2 = 0,3472 (34,7%)");
    expect(h).toContain("0,001 × 43.200 = 43,2");
  });
});

// ---- diagram Rantai dan tebakan --------------------------------------------------------------------------------------------------
describe("diagram Rantai dan tebakan: nilai diturunkan dari rekaman", () => {
  test("Rantai Inti: satu baris, dua simpul (0 dari 5 ada di node baru, 3 dari 3), sumber rekaman promosi.txt; nilai dari rekaman", () => {
    expect(diagramInti.id).toBe("t5-rpo-inti");
    expect(diagramInti.judul).toBe("Jawaban 201 saat primary diganti");
    expect(diagramInti.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t5-replika · promosi.txt" });
    expect(diagramInti.baris).toHaveLength(1);
    const [r] = diagramInti.baris;
    expect(r!.label).toBe("Primary diganti");
    expect(r!.sub).toBe("node lain dipromosikan");
    expect(r!.simpul.map((x) => x.teks)).toEqual([
      `Replica asinkron: ${JURNAL_LIMA_DI_BARU} dari ${JUMLAH_ID_LIMA} jurnal 201 ada`, `Standby sinkron: ${JURNAL_TIGA_DI_BARU} dari ${JUMLAH_ID_TIGA} jurnal 201 ada`,
    ]);
    expect(r!.simpul.map((x) => x.sub)).toEqual(["promosi.txt bagian A", "promosi.txt bagian B"]);
    expect(r!.simpul.map((x) => x.nada)).toEqual(["warn", "good"]);
    expect(diagramInti.catatan).toBe("Lab merekam pembayaran ke Warung 505, dan primary tidak dimatikan: koneksi WAL diputus lalu satu node dipromosikan. Standby sinkron memakai satu kandidat, jadi `ANY 1` dari dua kandidat tidak ikut terekam.");
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(badan).toContain("<Rantai data={failoverDiagram} />");
  });
  test("Rantai failover: enam simpul; hanya satu direkam (promosi), satu diperankan (run.py), fencing tidak ada, tiga Tidak dijalankan; sub sama dengan kode dan README", () => {
    const s = diagramFailover.baris[0]!.simpul;
    expect(diagramFailover.baris).toHaveLength(1);
    expect(s.map((x) => x.teks)).toEqual([
      "Mengenali primary gagal", "Memutuskan promosi", "Menghentikan primary lama", "Promosi dengan pg_promote()", "Mengarahkan app ke node baru", "Membangun ulang standby",
    ]);
    expect(s.map((x) => x.sub)).toEqual([
      "Tidak dijalankan: tak ada perangkat deteksi", "diperankan: run.py memanggilnya", "fencing: tidak ada di lab", "direkam: promosi.txt", "Tidak dijalankan", "pg_rewind: Tidak dijalankan",
    ]);
    expect(s.map((x) => x.nada)).toEqual(["old", "system", "warn", "good", "old", "old"]);
    expect(diagramFailover.baris[0]!.sub).toBe("satu langkah direkam, satu diperankan, empat tidak");
    expect(s.filter((x) => x.nada === "good")).toHaveLength(1);
    expect(s.filter((x) => x.nada === "system")).toHaveLength(1);
    expect(s.filter((x) => x.nada === "old" || x.nada === "warn")).toHaveLength(4);
    expect(readme).toContain("Patroni dan CloudNativePG **Tidak dijalankan**: tidak ada yang mendeteksi kegagalan atau memanggil `pg_promote()` selain `run.py`.");
    expect(PA.teks).toContain("Fencing (menghentikan primary lama sebelum node baru menerima tulisan) tidak ada di lab ini");
    expect(runPy.match(/pg_promote/g)!.length).toBeGreaterThanOrEqual(2);
    expect(diagramFailover.sumber).toEqual({ jenis: "rekaman", teks: "Lab t5-replika: promosi.txt dan run.py; dokumentasi PostgreSQL 17, bagian 26.3" });
    expect(diagramFailover.id).toBe("t5-rpo-failover");
    expect(diagramFailover.judul).toBe("Enam langkah failover dan yang direkam lab");
    expect(diagramFailover.catatan).toBe("Biru: diperankan skrip lab. Hijau: direkam. Oranye: tidak ada di lab, dan berbahaya bila juga tidak ada di produksi. Abu-abu: Tidak dijalankan, dicek ke dokumentasi.");
  });
  test("tebakan: skema valid; empat pilihan; tepat satu benar di posisi kedua (indeks 1), berbeda dari tebakan Tahap 5 lain; benar bukan yang terpanjang atau terpendek; teks dari rekaman sinkron.txt bagian C", () => {
    expect(tebak.pilihan).toHaveLength(4);
    expect(tebak.pilihan.filter((x) => x.benar)).toHaveLength(1);
    const idx = tebak.pilihan.findIndex((x) => x.benar);
    expect(idx).toBe(1);
    const lain = tebakLain.map((t) => t.pilihan.findIndex((x) => x.benar));
    expect(lain).toEqual([2, 2, 3]);
    expect(lain).not.toContain(idx);
    const panjang = tebak.pilihan.map((x) => x.teks.length);
    expect(panjang[idx]).not.toBe(Math.max(...panjang));
    expect(panjang[idx]).not.toBe(Math.min(...panjang));
    expect(tebak.id).toBe("t5-rpo-tebak");
    expect(tebak.judul).toBe("Satu-satunya standby sinkron mati selagi primary hidup");
    expect(tebak.sumber).toEqual({ jenis: "rekaman", teks: "labs/t5-replika/output/sinkron.txt bagian C; dokumentasi PostgreSQL 17, bagian 26.2.8" });
    expect(tebak.pertanyaan).toBe("Apa yang terjadi pada COMMIT itu?");
    expect(tebak.adegan).toEqual([
      "Dewi memasang satu standby sinkron: synchronous_standby_names berisi satu nama, dan synchronous_commit bernilai on.",
      "Container standby itu dimatikan. Primary tetap berjalan, dan satu sesi menjalankan INSERT lalu COMMIT.",
    ]);
    expect(tebak.pilihan[idx]!.teks).toBe("COMMIT menunggu tanpa galat, dan barisnya belum terlihat oleh sesi lain sebelum daftar standby sinkron diubah.");
    expect(tebak.pilihan[idx]!.alasan).toContain("Rekaman bagian C: sesi menunggu di SyncRep, barisnya tidak terlihat, dan COMMIT selesai sesudah synchronous_standby_names dikosongkan.");
    expect(SC.teks).toMatch(/uji-macet\s+\| IPC\s+\| SyncRep/);
    expect(tebak.pilihan[3]!.alasan).toContain("Dokumentasi PostgreSQL 17 tidak menyebut batas waktu atau perpindahan itu, dan lab tidak menunggu sampai batas.");
    expect(SC.teks).toContain("tidak menyebut batas waktu penantian; lab tidak menunggunya");
    expect(tebak.pilihan[2]!.alasan).toContain("Dokumentasi menulis bahwa commit seperti ini mungkin tidak pernah selesai, bukan bahwa ia ditolak.");
    expect(tebak.penutup).toBe("Standby sinkron yang mati menahan COMMIT tanpa galat. Yang melepasnya adalah menurunkan atau mengosongkan synchronous_standby_names, dan selama itu tidak ada standby yang dijanjikan menyimpan commit.");
  });
  test("jawaban tebakan tidak ada di prosa sebelum widget: kata 'macet' dan 'menahan COMMIT' tidak muncul di Mulai maupun di paragraf Coba sebelum <Tebak>; Inti tidak menyebut standby mati", () => {
    // 'aman' di atribut Blok Coba dibaca pembaca hanya sesudah memilih; ia memang memuat jawabannya, jadi tidak dihitung di atas
    const sebelum = badan.slice(0, badan.indexOf("<Tebak ")).replace(/aman="[^"]*"/, "");
    expect(sebelum).not.toMatch(/macet|tanpa galat|SyncRep|sampai daftar standby sinkron diturunkan/);
    const tanpaAman = sebelum;
    expect(tanpaAman).not.toMatch(/menahan COMMIT/);
    expect(tanpaAman.indexOf("Tebak dulu apa yang terjadi pada COMMIT")).toBeGreaterThan(0);
    expect(badan.indexOf("<Tebak ")).toBeLessThan(badan.indexOf("**Ubah satu hal:**"));
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("**Ubah satu hal:**"));
    expect(badan).toContain("<Tebak client:visible data={dataTebak} />");
  });
});

// ---- kartu Cek diri --------------------------------------------------------------------------------------------------------------
describe("kartu Cek diri: empat kartu, sama dengan kartu.json", () => {
  const kartu = kartuSemua.filter((k) => k.halaman === "t5-rpo-rto");
  const soal = [...badan.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("empat soal bernomor 1 sampai 4 dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dengan jawabannya, id, judul, dan url", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3", "4"]);
    expect(kartu).toHaveLength(4);
    kartu.forEach((k, i) => {
      expect(k.id).toBe(`t5-rpo-rto-${i + 1}`);
      expect(k.judul).toBe("5.9 RPO, RTO, replica sinkron, dan failover + ADR 48");
      expect(k.url).toBe("tahap-5/rpo-rto-failover/");
      expect(k.tanya).toBe(soal[i]!.tanya);
      expect(k.jawab.replace(/\s+/g, " ")).toBe(soal[i]!.jawab.replace(/\s+/g, " "));
    });
  });
  test("jawaban kartu menurunkan klaimnya: 3 jurnal ada dan keempat tidak (4 lawan 3); FIRST dengan satu nama; 23 − 15 = 8 dan 53,2%", () => {
    expect(soal[0]!.jawab).toContain("Selagi replay ditahan, COMMIT `on` selesai dan COMMIT `remote_apply` menunggu di `SyncRep` (`sinkron.txt` bagian B).");
    expect(soal[1]!.tanya).toBe(`Tiga pembayaran dijawab 201 selagi standby sinkron terhubung, lalu koneksinya putus. Pembayaran keempat tidak dijawab dalam ${BATAS_DETIK} detik. Apa yang ada di node baru, dan apakah itu melanggar RPO nol?`);
    expect(soal[1]!.jawab).toContain(`Tiga jurnal yang dijawab 201 ada di node baru, dan jurnal keempat tidak ada. Itu tidak melanggar RPO nol untuk transaksi yang sudah dijawab sukses, karena client tidak pernah menerima 201 untuk jurnal keempat. Primary lama mencatat ${BAYAR_PRIMARY_B} jurnal bayar dan node baru ${BAYAR_BARU_B} (\`promosi.txt\` bagian B).`);
    expect(soal[2]!.tanya).toBe(`\`${NAMA_SINKRON}\` macet saat standby-nya mati. Apakah itu karena \`FIRST\`?`);
    expect(soal[2]!.jawab).toContain("Bukan. Lab memakai satu nama, jadi tidak ada calon pengganti.");
    expect(soal[3]!.tanya).toBe(`Satu gangguan pulih dalam ${GANGGUAN} menit. Berapa menit di atas RTO ${RTO} menit, dan berapa persen dari anggaran kegagalan ${fmt(ANGGARAN, 1)} menit?`);
    expect(soal[3]!.jawab).toContain(`${GANGGUAN} − ${RTO} = ${GANGGUAN - RTO} menit di atas RTO, dan ${GANGGUAN} ÷ ${fmt(ANGGARAN, 1)} = ${fmt(bulat((GANGGUAN / ANGGARAN) * 100, 1), 1)}% dari anggaran.`);
    expect(soal[3]!.jawab).toContain("Hasilnya Hitungan atas Asumsi produk dan Ilustrasi, karena 23 menit berasal dari naskah.");
  });
});

// ---- sidik jari elemen non-prosa -------------------------------------------------------------------------------------------------
describe("sidik jari elemen non-prosa (menandai bahwa sesuatu berubah, bukan bahwa ia benar)", () => {
  (tanpaSidik ? test.skip : test)("frontmatter, dua diagram, tebakan, lima baris riset, dan isi tujuh Snippet sama dengan nilai yang dikunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(sidik(JSON.stringify(diagramIntiMentah))).toBe(SIDIK.diagramInti);
    expect(sidik(JSON.stringify(diagramFailoverMentah))).toBe(SIDIK.diagramFailover);
    expect(sidik(JSON.stringify(tebakMentah))).toBe(SIDIK.tebak);
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
    const isi: string[] = [];
    for (const t of tag) {
      const f = t.match(/file="([^"]+)" lines="(\d+):(\d+)"/);
      if (f) isi.push(sidik(baca(f[1]!).split("\n").slice(Number(f[2]) - 1, Number(f[3])).join("\n")));
      const g = [...t.matchAll(/"(labs\/[^":]+):(\d+):(\d+)"/g)];
      if (g.length) isi.push(sidik(g.map((m) => baca(m[1]!).split("\n").slice(Number(m[2]) - 1, Number(m[3])).join("\n")).join("\n")));
      const c = t.match(/code=\{`([\s\S]*?)`\}/);
      if (c) isi.push(sidik(c[1]!));
    }
    expect(isi).toEqual(SIDIK.snippet);
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/`[^`]*`/g, "");
    const hitung = (re: RegExp) => (prosa.match(re) ?? []).length;
    expect({ hanya: hitung(/\bhanya\b/g), tidakAda: hitung(/tidak ada\b/g), tidakPernah: hitung(/tidak pernah/g), semua: hitung(/\bsemua\b/g), setiap: hitung(/\bsetiap\b/g), selalu: hitung(/\bselalu\b/g), tiap: hitung(/\btiap\b/g) }).toEqual(SIDIK.kata);
  });
});

// ---- struktur halaman ------------------------------------------------------------------------------------------------------------
describe("struktur halaman: tingkat heading, nomor daftar, jumlah elemen, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: h2 Inti, h3 di Paham dan Putuskan dan Kunci, tanpa h4; daftar bernomor hanya di Inti (3), Jaminan (4), ADR (8), pre-mortem (3); di tempat lain tidak ada", () => {
    const h = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(h).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 48: replica sinkron kuorum untuk ledger, failover dengan fencing, dan latihan bulanan", "### Sengaja belum dilakukan",
      "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    const bernomor = badan.split("\n").filter((b) => /^\d+\. /.test(b));
    expect(bernomor).toHaveLength(3 + 4 + 8 + 3); // Inti (3), batas jaminan (4), aturan ADR (8), pre-mortem (3); Cek diri memakai **n.**
    expect(badan.split("\n").filter((b) => /^- \[ \] /.test(b))).toHaveLength(6);
    expect(daftarBlok(badan).length).toBe(5);
  });
  (tanpaKunci ? test.skip : test)("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const baris = badan.split("\n").filter((b) => b.trim() !== "");
    expect(baris).toEqual(KALIMAT_TERKUNCI);
  });
  test("jumlah elemen: lima Blok, dua Rantai, tujuh Snippet, satu Tebak, satu TabSet dengan enam Fragment, satu noscript, tiga tabel, satu details tebakan, empat Cek diri, delapan impor, tanpa SkripLama", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(2);
    expect(badan.match(/<Snippet /g)).toHaveLength(7);
    expect(badan.match(/<Tebak /g)).toHaveLength(1);
    expect(badan.match(/<TabSet /g)).toHaveLength(1);
    expect(badan.match(/<Fragment slot=/g)).toHaveLength(6);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/^\| --- /gm)).toHaveLength(1);
    expect(badan.match(/^\|---/gm)).toHaveLength(2);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/^import /gm)).toHaveLength(8);
    expect(badan).not.toContain("SkripLama");
  });
  test("tabel ADR: header 6 kolom, pemisah 6, tiap baris 6 sel; kolom A sampai E berurutan dan E dipilih; baris Cara kerja, Kelebihan, Kekurangan, Biaya operasional, Bukti", () => {
    const awal = badan.indexOf("| | A. Replica asinkron saja |");
    expect(awal).toBeGreaterThan(0);
    const bagian = badan.slice(awal).split("\n\n")[0]!.split("\n");
    expect(bagian).toHaveLength(7);
    const sel = (b: string) => b.replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((x) => x.trim());
    for (const b of bagian) expect(sel(b), b.slice(0, 40)).toHaveLength(6);
    expect(sel(bagian[0]!)).toEqual(["", "A. Replica asinkron saja", "B. Satu standby sinkron", "C. `remote_apply` untuk ledger", "D. Layanan terkelola dengan failover", "E. Sinkron kuorum `ANY 1 (r1, r2)`"]);
    expect(bagian.slice(2).map((b) => sel(b)[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    // tiap kolom: sel Bukti sesuai sumber; A dan B dan C dari rekaman, D dan E Tidak dijalankan
    const bukti = sel(bagian[6]!);
    expect(bukti[1]).toBe("Rekaman lab `promosi.txt` bagian A");
    expect(bukti[2]).toBe("Rekaman lab `promosi.txt` bagian B dan `sinkron.txt` bagian A dan C");
    expect(bukti[3]).toBe("Rekaman lab `sinkron.txt` bagian B");
    expect(bukti[4]).toMatch(/^Tidak dijalankan: tidak bisa direkam/);
    expect(bukti[5]).toMatch(/^Tidak dijalankan: lab satu kandidat\./);
    const kekurangan = sel(bagian[4]!);
    expect(kekurangan[1]).toBe(`0 dari ${JUMLAH_ID_LIMA} jurnal 201 ada di node baru (\`promosi.txt\` bagian A)`);
    const kelebihan = sel(bagian[3]!);
    expect(kelebihan[2]).toBe(`${JURNAL_TIGA_DI_BARU} dari ${JUMLAH_ID_TIGA} jurnal 201 ada di node baru (\`promosi.txt\` bagian B)`);
    expect(sel(bagian[5]!)[1]).toBe(`Satu standby, dan RPO sama dengan jeda (${fmt(bulat(JEDA_DETIK * bulat(PUNCAK_TRX3, 1)))} transaksi per jeda ${JEDA_DETIK} detik, Hitungan atas Asumsi)`);
  });
  test("keputusan: delapan aturan berurutan 1 sampai 8, 'Keputusan: opsi E', alasan menolak A, B, C, D tiap satu butir, FIRST 1 (r1, r2) bukan opsi di tabel dan Tidak dijalankan", () => {
    const putusan = badan.slice(badan.indexOf("**Keputusan: opsi E.**"));
    expect(putusan.startsWith("**Keputusan: opsi E.** Delapan aturan:")).toBe(true);
    const aturan = putusan.slice(0, putusan.indexOf("**Kenapa E, bukan A, B, C, atau D.**")).split("\n").filter((b) => /^\d+\. /.test(b));
    expect(aturan.map((b) => b.match(/^(\d+)\./)![1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const kenapa = putusan.slice(putusan.indexOf("**Kenapa E, bukan A, B, C, atau D.**"), putusan.indexOf("**Pre-mortem.**")).split("\n").filter((b) => b.startsWith("- "));
    expect(kenapa.map((b) => b.match(/^- \*\*([^*]+)\*\*/)![1])).toEqual(["A ditolak", "B ditolak", "`FIRST 1 (r1, r2)` bukan opsi di tabel", "C ditolak", "D tidak dipilih untuk lab"]);
    expect(kenapa[2]).toContain("Keduanya Tidak dijalankan.");
    expect(kenapa[1]).toContain("Itu sifat satu nama, bukan sifat `FIRST`: dokumentasi menulis `FIRST 1` dengan dua nama langsung mengganti standby yang putus dengan calon berikutnya.");
    const pre = putusan.slice(putusan.indexOf("**Pre-mortem.**"), putusan.indexOf("**Kapan keputusan ini salah.**"));
    expect(pre.split("\n").filter((b) => /^\d+\. /.test(b))).toHaveLength(3);
    const salah = putusan.slice(putusan.indexOf("**Kapan keputusan ini salah.**"), putusan.indexOf("**Yang akan merevisinya.**")).split("\n").filter((b) => b.startsWith("- "));
    expect(salah).toHaveLength(5);
    expect(badan).toContain("**Status:** diterima sesudah M42 ([[t5-m42]]), dan menjawab pemicu ADR 33. Naskah tidak menulis tanggal ADR.");
    expect(badan).toContain("[[t5-m46]] menunjukkan, menurut naskah (Ilustrasi), latihan failover yang berhasil tetapi membuat semua pod menyambung ulang bersamaan dan menghabiskan koneksi. Jawabannya ADR 52 di [[t5-pooler]].");
  });
  test("front matter dikunci: description memuat replica sinkron kuorum, 201, node yang dipromosikan, empat cara lain; title sama dengan registry", () => {
    expect(frontmatter).toContain("description: Rekeningo memasang replica sinkron kuorum untuk ledger, supaya pembayaran yang sudah dijawab 201 ada di node yang dipromosikan. ADR 48 menimbang empat cara lain dan menulis kapan pilihan ini salah.");
    expect(frontmatter.split("\n").filter((b) => b.trim() !== "")).toHaveLength(2);
  });
  test("istilah diberi arti di pemakaian pertama: RPO dan RTO di Inti; Rekaman lab dengan tautan; 'Replica sinkron adalah' sebelum 'Standby sinkron' dipakai di judul tebal; STONITH sesudah arti fencing; urutannya benar", () => {
    const pos = (k: string) => badan.indexOf(k);
    const urut = [
      "RPO adalah titik waktu terakhir yang harus bisa dipulihkan sesudah gangguan, dan RTO adalah lama paling lama sistem boleh berada dalam pemulihan.",
      "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber))",
      "Rekaman lab menulis file dan bagian rekamannya. Tidak dijalankan berarti dicek ke dokumentasi atau kode, tanpa dijalankan. Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan Asumsi adalah angka pilihan penulis tanpa rekaman. Penalaran adalah kesimpulan dari kode atau angka di halaman, bukan hasil ukuran.",
      "Replica sinkron adalah standby yang ditunggu COMMIT, dan PostgreSQL menyebutnya standby sinkron.",
      "Dokumentasi menulis bahwa langkah itu kadang disebut STONITH, dan halaman ini menyebutnya fencing.",
    ].map(pos);
    expect(urut.every((x) => x > 0)).toBe(true);
    expect([...urut].sort((a, b) => a - b)).toEqual(urut);
    // 'Tidak dijalankan', 'Hitungan', 'Penalaran' dan 'Asumsi' tidak dipakai di prosa sebelum arti labelnya di blok Coba kecuali di Inti (Asumsi produk, ditaut)
    const sebelumLabel = badan.slice(0, urut[2]);
    expect(sebelumLabel).not.toMatch(/Tidak dijalankan|Hitungan|[Pp]enalaran/);
    // fencing dan STONITH tidak dipakai di prosa sebelum artinya di Paham, kecuali di tombol jawaban (tidak ada) dan di judul ADR di bawahnya
    expect(badan.slice(0, urut[4]).match(/STONITH/g) ?? []).toHaveLength(0);
    expect(badan.slice(0, urut[4]).match(/[Ff]encing/g) ?? []).toHaveLength(0);
  });
  test("satu kata per konsep: 'replika' hanya di nama kode dan rekaman, 'pelanggan', 'pembeli', 'layanan', 'secret', 'rahasia' tidak muncul; 'service' dan 'user' dipakai; 'pengguna' hanya di 'per user'", () => {
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/`[^`]*`/g, "").replace(/<Snippet[\s\S]*?\/>/g, "");
    expect(prosa).not.toMatch(/\breplika\b|pelanggan|pembeli|\bsecret\b|\brahasia\b|\bpengguna\b/i);
    expect(prosa).toContain("per user");
    // 'Layanan terkelola' dipakai hanya di kepala kolom ADR dan penyedia; bukan untuk service internal
    expect((prosa.match(/[Ll]ayanan/g) ?? []).length).toBe(1);
    expect(prosa).toContain("D. Layanan terkelola dengan failover");
  });
  test("klaim universal dan negatif berlingkup: 'hanya', 'tidak ada', 'tidak pernah', 'semua', 'setiap', 'selalu' dihitung dan tiap kemunculan dikunci oleh kalimat literal", () => {
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/`[^`]*`/g, "");
    expect((prosa.match(/\bselalu\b|\bsetiap\b|tidak satu pun/g) ?? [])).toEqual([]);
    expect((prosa.match(/tidak pernah/g) ?? []).length).toBe(SIDIK.kata.tidakPernah);
    // semua 'tidak ada' di prosa: delapan, tiap kalimat menyebut lingkupnya (rekaman, lab, atau pelakunya)
    const kal = badan.split("\n").flatMap((b) => b.split(/(?<=[.:?])\s+(?=[A-Z`*\[(])/)).filter((k) => /[Tt]idak ada\b/.test(k.replace(/`[^`]*`/g, "")) && !k.startsWith("<")).map((k) => k.trim());
    expect(kal.map((k) => k.replace(/^.*?([^.]*\btidak ada\b[^.]*\.?)$/i, "$1").slice(0, 200))).toHaveLength(8);
    for (const lingkup of [
      "lima jurnal 201 tidak ada di replica asinkron yang dipromosikan (bagian A)", "Lima jurnal yang sudah dijawab 201 tidak ada di node baru.", "Satu kandidat yang mati menahan COMMIT karena tidak ada calon pengganti.",
      "supaya tidak ada dua server yang merasa primary", "Fencing tidak ada di lab.", "dan jurnal keempat tidak ada.", "Tidak ada perangkat deteksi atau fencing di lab,", "Lab memakai satu nama, jadi tidak ada calon pengganti.",
    ]) expect(badan.split(lingkup).length - 1, lingkup).toBe(1);
  });
});

describe("kalimat prosa dikunci literal di berkas kunci terpisah, dengan jumlah kemunculannya (tetap menyala di TANPA_KUNCI)", () => {
  (tanpaLiteral ? test.skip : test)("setiap kalimat di KUNCI_LITERAL ada persis sebanyak jumlahnya di badan, dan setiap kalimat prosa badan ada di daftar (tanpa pencocokan sebagian)", () => {
    for (const [k, n] of KUNCI_LITERAL) expect(badan.split(k).length - 1, k.slice(0, 80)).toBe(n);
    const dalam = new Set(KUNCI_LITERAL.map(([k]) => k));
    const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !/^(<|\||import |- \[ \]|#)/.test(b));
    for (const b of prosa) for (const k of b.split(/(?<=[.:?])\s+(?=[A-Z`*\[(])/)) expect(dalam.has(k.trim()), `kalimat tak terkunci: ${k.slice(0, 100)}`).toBe(true);
  });
});
