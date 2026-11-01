// Penjaga halaman 5.4 (keputusan 1512 sampai 1514): angka, nama, ID, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim "dibaca dari kode", klaim negatif berlingkup, Hitungan, diagram Rantai, skenario alur t5-m40.json, baris riset, dan kartu
// Cek diri di m40-pembayaran-melambat.mdx diturunkan dari rekaman labs/api-t5 (laporan.txt), kode lab (repo/t5.go, service/t5.go,
// handler.go, cache, cmd/beban, run.py), README lab, halaman tetangga, naskah Tahap 5, registry, dan baris riset, bukan dari daftar
// yang ditulis sendiri. Aturan tes ini (pelajaran 3.4 sampai 4.31): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak
// menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, diagram, skenario, snippet, baris riset) dikunci dengan sidik jari.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-m40-laporan-primary.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m40-pembayaran-melambat.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-5/m40-pembayaran-melambat.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t5-m40.json")) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const laporan = baca("labs/api-t5/output/laporan.txt");
const readme = baca("labs/api-t5/README.md");
const repoT5 = baca("labs/api-t5/internal/repo/t5.go");
const svcT5 = baca("labs/api-t5/internal/service/t5.go");
const repoGo = baca("labs/api-t5/internal/repo/repo.go");
const handlerGo = baca("labs/api-t5/internal/handler/handler.go");
const handlerT5 = baca("labs/api-t5/internal/handler/handler_t5.go");
const cacheGo = baca("labs/api-t5/internal/cache/cache.go");
const redisGo = baca("labs/api-t5/internal/cache/redis.go");
const bebanGo = baca("labs/api-t5/cmd/beban/main.go");
const runPy = baca("labs/api-t5/run.py");
const sesiGo = baca("labs/api-t5/internal/service/sesi.go");
const prd = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const estimasi4 = baca("situs/src/content/docs/tahap-4/estimasi.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { bagian?: number; id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; path?: string; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const L = bagian(laporan);
const lA = L.nomor((b) => b.startsWith("# --- A. ")), lB = L.nomor((b) => b.startsWith("# --- B. ")), lC = L.nomor((b) => b.startsWith("# --- C. "));
const bagA = L.teks(lA, lB - 1), bagB = L.teks(lB, lC - 1), bagC = L.teks(lC, L.baris.length);
const GET404 = L.nomor((b) => b === "$ curl -i -X GET '/merchant/505/laporan/hari-ini' -H 'Authorization: Bearer <token sesi Warung 505>'", lA);
const A404 = L.nomor((b) => b === "404 page not found", GET404);
const POST1 = L.nomor((b) => b.startsWith("$ curl -i -X POST '/transfers'"), A404);
const JSONLAP = L.nomor((b) => b.startsWith('{"merchant":505,'), POST1);
const B0 = L.nomor((b) => b.endsWith("# tanpa laporan"), lB);
const BAKHIR = L.nomor((b) => b.startsWith("# jadi 666,7 per detik, CPU 167%"), B0);
const C0 = L.nomor((b) => b.startsWith("# server: ./api-t5 -lab -rentan laporan-primary -laporan-cache redis"), lC);
const CAKHIR = L.nomor((b) => b === "hit rate kontrol: 9 dari 18 = 50%", C0);

const kepala = cocok(L.baris[1]!, /^# PostgreSQL (\d+\.\d+) \([^)]*\) · (go[\d.]+) · pgx (v[\d.]+) · schema /);
const POST = [...bagA.matchAll(/-d '\{"ke": (\d+), "nominal": (\d+)\}'/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
const LAP = JSON.parse(cocok(bagA, /^(\{"merchant":.*\})$/m)[1]!) as { merchant: number; jumlah_transaksi: number; total: number; dibaca_dari: string };
const B_TANPA = cocok(bagB, /\$ \.\/beban -rps ([\d.]+) -detik (\d+) -pengguna (\d+) -hanya-bayar   # tanpa laporan\npembayaran selesai: (\d+) dari (\d+), semua 201\n/);
const B_DENGAN = cocok(bagB, /\$ \.\/beban -rps ([\d.]+) -detik (\d+) -pengguna (\d+) -hanya-bayar -laporan-rps ([\d.]+)   # dengan laporan\npembayaran selesai: (\d+) dari (\d+), semua 201; laporan selesai: (\d+) dari (\d+), semua 200\n/);
const BATAS = Number(cocok(bagB, /p95 pembayaran tanpa laporan di bawah (\d+) ms \(batas lab, Asumsi;/)[1]);
const BATAS2 = Number(cocok(bagB, /p95 pembayaran dengan laporan di bawah (\d+) ms \(batas lab, Asumsi;/)[1]);
const SATU_MS = Number(cocok(bagA, /waktu eksekusi query laporan satu warung di database di bawah (\d+) ms \(EXPLAIN ANALYZE;/)[1]);
const WARUNG_LAB = Number(cocok(bagB, /Di lab polling berasal dari (\d+) warung,/)[1]);
const C_A = cocok(bagC, /mode redis, ttl (\d+) detik, hit (\d+), miss (\d+), baca database (\d+)\nhit rate: (\d+) dari (\d+) = 0%/);
const C_JARAK = cocok(bagC, /dua putaran berjarak ([\d,]+) detik \(TTL (\d+) detik\)/);
const C_K = cocok(bagC, /-> hit (\d+), miss (\d+), baca database (\d+)\nhit rate kontrol: (\d+) dari (\d+) = (\d+)%/);
const JARAK = angka(C_JARAK[1]!), TTL = Number(C_JARAK[2]);
const RPS_BAYAR = Number(B_DENGAN[1]), DETIK = Number(B_DENGAN[2]), PENGGUNA = Number(B_DENGAN[3]), RPS_LAPORAN = Number(B_DENGAN[4]);
const BAYAR_N = Number(B_DENGAN[5]), LAPORAN_N = Number(B_DENGAN[7]);
const TOTAL = POST[0]![1] + POST[1]![1];

// ---- naskah, registry, dan halaman tetangga ----------------------------------------------------------------------------
const barisM40 = naskah.split("\n").find((b) => b.startsWith("| M40 |"))!;
const barisPolling = naskah.split("\n").find((b) => b.startsWith("| Polling laporan |"))!;
const barisBaca = naskah.split("\n").find((b) => b.startsWith("| Baca selain uang |"))!;
const barisTrx = naskah.split("\n").find((b) => b.startsWith("| Transaksi uang (bayar, transfer, QR) |"))!;
const barisReq = naskah.split("\n").find((b) => b.startsWith("| Request per detik |"))!;
const pol = cocok(barisPolling, /200\.000 × (\d+)% = ([\d.]+) online; polling (\d+) detik; query (\d+) ms; (\d+) vCPU \(Asumsi\)/);
const PERSEN_ONLINE = Number(pol[1]), ONLINE = angka(pol[2]!), INTERVAL = Number(pol[3]), W_MS = Number(pol[4]), VCPU = Number(pol[5]);
const W = W_MS / 1000;
const trx = cocok(barisTrx, /6,94 rata-rata dan ([\d,]+) puncak \(trx 2: [\d,]+ dan ([\d,]+)\)/);
const TRX3 = angka(trx[1]!), TRX2 = angka(trx[2]!);
const REQ = angka(cocok(barisReq, /138,9 rata-rata dan ([\d.,]+) puncak/)[1]!);
const PEMICU = Number(cocok(barisBaca, /dari pemicu read replica ADR 45 \((\d+) koneksi\)/)[1]);
const LAP_S = bulat(ONLINE / INTERVAL, 1); // 666,7: turunan memakai bentuk yang tertulis
const PRD_TERTINGGAL = Number(cocok(prd, /Data yang dilayani laporan tertinggal paling lama (\d+) detik dari pembayaran yang tercatat di ledger \(Asumsi produk\)/)[1]);
const PRD_LAYAR = cocok(prd, /Layar memperbarui tiap (\d+) detik, jadi penjualan baru terlihat paling lambat (\d+) detik sesudah tercatat \(Hitungan atas Asumsi produk: \d+ \+ \d+\)/);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// ---- kode lab -----------------------------------------------------------------------------------------------------------
const K = (isi: string) => bagian(isi);
const R5 = K(repoT5), S5 = K(svcT5);
const rFungsi = R5.nomor((b) => b.startsWith("func (r Repo) LaporanHariIni("));
const rAkhir = R5.nomor((b) => b === "}", rFungsi);
const sFungsi = S5.nomor((b) => b.startsWith("func (s Service) LaporanHariIni("));
const sAwal = S5.nomor((b) => b === "\tawal := awalHariWIB(s.kini())", sFungsi);
const sAkhir = S5.nomor((b) => b === "\treturn l, json.Unmarshal(b, &l.LaporanHari)", sAwal);
const sFungsiAkhir = S5.nomor((b) => b === "}", sAkhir);
const sPrimary = S5.nomor((b) => b.includes('l.DibacaDari = merchant, tanggal, "primary"'), sAwal);
const badanRepo = R5.teks(rFungsi, rAkhir);
const badanSvc = S5.teks(sFungsi, sFungsiAkhir);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.4 ada, masalah, jalur inti, prasyarat 5.3 dan 3.8, lab api-t5, peran backend; judul sama dengan peta naskah", () => {
    expect(dari("t5-m40")).toMatchObject({ ada: true, nomor: "5.4", jenis: "masalah", bagian: 4, inti: true, prasyarat: ["t5-skema", "t3-pool"], lab: ["api-t5"], tahap: 5, peran: ["backend"] });
    expect(dari("t5-skema").nomor).toBe("5.3");
    expect(dari("t3-pool").nomor).toBe("3.8");
    expect(frontmatter).toContain('title: "5.4 M40: Pembayaran melambat saat merchant membuka laporan"');
    expect(dari("t5-m40").judul).toBe("M40: Pembayaran melambat saat merchant membuka laporan");
    expect(naskah).toContain("| 5.4 | 4 | M40: Pembayaran melambat saat merchant membuka laporan | Masalah | ★ | api-t5 | alur |");
    expect(barisM40).toMatch(/^\| M40 \| 2 \|/);
    expect(dari("t5-m40").label).toBe("Masalah 40 · minggu 2");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-skema\]\], \[\[t3-pool\]\] · Jalur inti<\/p>/);
    expect(dari("t5-m40").menit).toBe(Number(m[1]) + Number(m[2]));
    expect(dari("t5-m40").path).toBe("tahap-5/m40-pembayaran-melambat.md");
    expect(BERKAS).toBe(`situs/src/content/docs/${dari("t5-m40").path!.replace(/\.md$/, ".mdx")}`);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka; satu Rantai ringkas; impor dan jumlah komponen tetap", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
    expect(badan.match(/<Rantai data=\{laporanPrimary\} ringkas \/>/g)).toHaveLength(1);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(6);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect([...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro", "laporanPrimary ../../../../data/diagram/t5-m40-laporan-primary.json",
    ]);
    harus('<SkripLama daftar={["hp","alur-core","alur"]} />');
    harus('<WidgetLama nama="alur" src="data/skenario/t5-m40.json" />');
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t3-cache", "t3-pool", "t4-adr-45", "t4-estimasi", "t5-prd", "t5-read-replica", "t5-skema"]);
    const sesuai: [string, string, string][] = [
      ["t5-prd", "5.1", "PRD v5"], ["t5-skema", "5.3", "Skema data"], ["t5-read-replica", "5.5", "Read replica dan model baca untuk laporan + ADR 46"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t5-read-replica").adr).toEqual([46]);
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t4-estimasi").ada).toBe(true);
    expect(dari("t3-cache").ada).toBe(true);
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    harus("- [[t5-read-replica]]: salinan database yang melayani bacaan, dan model baca untuk laporan. Keputusannya ADR 46.");
    harus("- [[t3-cache]]: cache-aside, hit, miss, dan TTL, termasuk batas cache untuk angka yang menggerakkan uang.");
    harus("- [[t3-pool]]: laju kali lama, yang dipakai untuk menghitung permintaan berjalan serentak.");
  });
  test("janji halaman lain ke 5.4 ditepati: 5.1 menjawab pertanyaan pertama di sini dan menutup dengan 'masalah pertama'; ADR 45 menulis pemicu laporan", () => {
    expect(prd).toContain("Jawabannya dimulai di [[t5-m40]] untuk pertanyaan pertama");
    expect(prd).toContain("1. Kalau laporan dan pembayaran membaca database yang sama, siapa yang melambat?");
    expect(prd).toContain("Masalah pertama dari semua ini datang di [[t5-m40]].");
    expect(prd).toMatch(/^\| 45 \(\[\[t4-adr-45\]\]\) \| Satu dari tiga pemicu read replica adalah laporan merchant real-time yang diminta PRD v5 \| Laporan merchant real-time \| \[\[t5-m40\]\] dan \[\[t5-read-replica\]\] \|$/m);
    expect(hal45).toContain("Read replica: query baca yang sudah memakai index menahan 5 koneksi");
    const wEstimasi = estimasi4.match(/Koneksi tertahan oleh semua request \(W \d+ ms\)/g) ?? [];
    expect(wEstimasi.length).toBeGreaterThan(0);
    for (const x of wEstimasi) expect(x, "tiap kemunculan W di estimasi Tahap 4").toBe(`Koneksi tertahan oleh semua request (W ${W_MS} ms)`);
  });
  test("halaman tidak membuka isi 5.5: ADR 46 hanya sebagai nama keputusan; tanpa statement_timeout, hot_standby_feedback, LSN, CDC, Debezium, ringkasan harian yang diisi job", () => {
    expect(badan.match(/ADR \d+/g)).toEqual(["ADR 46"]);
    expect(badan).not.toMatch(/statement_timeout|hot_standby_feedback|max_standby|LSN|Debezium|CDC|read-your-writes|replication lag/i);
    expect(badan).not.toMatch(/ADR 45/);
  });
  test("tabel GFM: tiga kolom di header, pemisah, dan tiap baris; ID internal tidak tampil (ID riset, nomor keputusan, nomor PR, label rekaman C2)", () => {
    const tabel = badan.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel).toHaveLength(9);
    for (const b of tabel) expect(b.split("|").length - 2, b).toBe(3);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/keputusan \d{2,4}|#\d{3}\b|PR \d{3}\b/i);
    expect(badan).not.toMatch(/(?<!\[\[)\b[A-G]\d\b(?!\.\d)/);
    expect(badan).not.toMatch(/\d B\b/);
    expect(badan).not.toMatch(/\b(Anda|kita|pengguna|pemakai|klien|berkas|murah|mahal)\b/);
  });
});

describe("naskah M40: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M40 di naskah: minggu 2, Kamis 11.40, 6 detik, cache 30 detik di Redis, 666,7, 9,6, 167%, 26,4, 528%, Ilustrasi", () => {
    expect(barisM40).toContain("Kamis 11.40 Ani menunggu dua pembayaran yang belum muncul di layar kasirnya. Di app Budi tombol Bayar berputar 6 detik.");
    expect(barisM40).toContain("Pada jam yang sama Wulan baru merilis laporan real-time, dan merchant di banyak kota membukanya (Ilustrasi).");
    expect(barisM40).toContain("Server kurang kuat. Nadia mengusulkan cache laporan 30 detik di Redis, seperti katalog di ADR 28");
    expect(barisM40).toContain("Laporan dan pembayaran memakai primary yang sama.");
    expect(barisM40).toContain("20.000 merchant online yang memanggil tiap 30 detik membuat 666,7 query per detik, 9,6 kali transaksi uang puncak, dan CPU 167% pada query 20 ms di 8 vCPU (Hitungan atas Asumsi;");
    expect(barisM40).toContain("L baca seluruh request 26,4 koneksi, 528% dari pemicu read replica ADR 45.");
    expect(barisM40).toContain("satu perangkat per merchant memanggil sekali per 30 detik, sama dengan umur isi cache, sehingga hampir tidak ada panggilan yang menemukan isinya (penalaran; lab menguji)");
  });
  test("Gejala: hari, jam, 6 detik, dua pembayaran, Wulan, 30 detik, semuanya Ilustrasi menurut naskah; tanpa kalimat definisi", () => {
    harus("Minggu 2 Tahap 5. Kamis pukul 11.40 Ani menunggu dua pembayaran yang belum muncul di layar kasirnya. Di app Budi, tombol Bayar berputar 6 detik.");
    harus("Pada jam yang sama merchant di banyak kota membuka laporan penjualan yang baru dirilis Wulan.");
    harus(`Laporan itu menunjukkan penjualan hari ini dan diperbarui tiap ${PRD_LAYAR[1]} detik ([[t5-prd]]).`);
    expect(INTERVAL).toBe(Number(PRD_LAYAR[1]));
    harus("*Angka cerita (Ilustrasi):* hari, jam, dua pembayaran Ani, dan 6 detik berasal dari naskah, bukan dari rekaman.");
    const gejala = badan.split('<Blok nama="Yang Raka kira"')[0]!;
    expect(gejala).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
  });
  test("Yang Raka kira: server kurang kuat, cache 30 detik seperti ADR 28 (halaman t3-cache), hit, miss, TTL, polling; tebakan primary", () => {
    harus("Dugaan pertama tim: server kurang kuat.");
    harus(`Nadia mengusulkan jalan yang tidak butuh mesin baru: cache laporan ${TTL} detik di Redis, seperti cache katalog di [[t3-cache]].`);
    harus(`Jawaban tersimpan itu berumur ${TTL} detik (TTL, masa berlaku entri cache). App tiap merchant memakai polling: ia menanyakan laporan ke server tiap ${INTERVAL} detik.`);
    expect(dari("t3-cache").judul).toMatch(/ADR 28/);
    expect(TTL).toBe(30);
    expect(barisM40).toContain(`cache laporan ${TTL} detik di Redis`);
    harus("<summary>Tebak dulu: laporan hanya membaca dan tidak mengubah apa pun, tetapi pembayaran ikut melambat. Apa yang laporan dan pembayaran pakai bersama?</summary>");
    harus("Primary, yaitu database yang menerima semua tulisan.");
  });
});

describe("rekaman laporan.txt: angka dan kalimat bagian A, B, dan C", () => {
  test("kepala rekaman: versi PostgreSQL, Go, dan pgx sama dengan kalimat Kondisi rekaman dan baris riset", () => {
    harus(`*Kondisi rekaman:* PostgreSQL ${kepala[1]}, ${kepala[2]}, dan pgx ${kepala[3]}, dari database bersih, dengan server \`api-t5\` satu proses dan satu PostgreSQL.`);
    expect(barisRiset("R5-125")).toContain(`PostgreSQL ${kepala[1]}, ${kepala[2]}, pgx ${kepala[3]}`);
    expect(laporan).toContain("# Rekaman dari database bersih: make -C labs/api-t5 run.");
    expect(readme).toContain("Rekaman dari database bersih, diulang tiga kali");
    expect(readme).toContain("`api-t5` tidak jalan bersamaan dengan lab Tahap 5 lain");
  });
  test("bagian A: rute 404 tanpa mode, dua pembayaran, laporan 2 transaksi total sama dengan jumlahnya, dibaca_dari primary", () => {
    expect(bagA).toMatch(/\$ curl -i -X GET '\/merchant\/505\/laporan\/hari-ini' -H 'Authorization: Bearer <token sesi Warung 505>'\nHTTP\/1\.1 404 Not Found\n/);
    expect(bagA.indexOf("404 page not found")).toBeLessThan(bagA.indexOf("# server: ./api-t5 -lab -rentan laporan-primary"));
    expect(POST).toHaveLength(2);
    expect(POST[0]![0]).toBe(LAP.merchant);
    expect(POST[1]![0]).toBe(LAP.merchant);
    expect(LAP).toMatchObject({ jumlah_transaksi: 2, total: TOTAL, dibaca_dari: "primary", merchant: 505 });
    expect(bagA).toContain("# server: ./api-t5 -lab (tanpa mode rentan); push tiruan: ./pushpalsu");
    for (const siapa of ["Warung 506", "Budi"]) expect(bagA, siapa).toMatch(new RegExp(`GET '/merchant/${LAP.merchant}/laporan/hari-ini' -H 'Authorization: Bearer <token sesi ${siapa}>'\\nHTTP/1\\.1 404 Not Found\\nContent-Type: application/problem\\+json\\n\\n\\{"type":"/problems/tidak-ditemukan","title":"Merchant tidak ditemukan","status":404\\}`));
    harus("Tanpa mode itu rutenya dijawab 404:");
    harus(`**Laporan menjumlah posting dari primary, tiap panggilan.** Budi membayar Warung ${LAP.merchant} dua kali, ${rp(POST[0]![1])} dan ${rp(POST[1]![1])}.`);
    harus(`Laporan warung itu lalu menjawab dua transaksi dengan total ${rp(LAP.total)} (Rekaman lab, bagian A).`);
    harus(`Penjumlahan ${rib(POST[0]![1])} + ${rib(POST[1]![1])} = ${rib(TOTAL)} adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman.`);
    expect(bagA).toMatch(/\$ curl -i -X GET '\/merchant\/505\/laporan\/hari-ini' -H 'Authorization: Bearer <token sesi Warung 506>'\nHTTP\/1\.1 404 Not Found/);
  });
  test("bagian A: waktu eksekusi satu query laporan di bawah batas 1 ms (batas, bukan nilai), sama dengan kalimat halaman dan baris riset", () => {
    expect(SATU_MS).toBe(1);
    expect(bagA).toMatch(/\(EXPLAIN ANALYZE; batas lab, nilai ukur tidak direkam\): ya/);
    harus(`Query laporan berjalan di bawah ${SATU_MS} ms. Hanya batasnya yang direkam (Rekaman lab, bagian A).`);
    expect(runPy).toContain("harap(eksekusi < 1, True,");
    expect(barisRiset("R5-125")).toContain("waktu eksekusi query laporan di bawah 1 ms sebagai batas");
    harus(`Rekaman membatasi satu query laporan di bawah ${SATU_MS} ms pada data kecil.`);
    expect(runPy).toContain("EXPLAIN (ANALYZE, FORMAT JSON)");
  });
  test("bagian B: pembayaran dan polling; hitungan permintaan dari laju kali detik; p95 hanya batas; selisih p95 tidak direkam", () => {
    expect(B_TANPA.slice(1, 4)).toEqual([B_DENGAN[1], B_DENGAN[2], B_DENGAN[3]]);
    expect([Number(B_TANPA[4]), Number(B_TANPA[5])]).toEqual([BAYAR_N, BAYAR_N]);
    expect([Number(B_DENGAN[5]), Number(B_DENGAN[6])]).toEqual([BAYAR_N, BAYAR_N]);
    expect(BAYAR_N).toBe(RPS_BAYAR * DETIK);
    expect(LAPORAN_N).toBe(Math.floor(RPS_LAPORAN * DETIK));
    expect(Number(B_DENGAN[8])).toBe(LAPORAN_N);
    expect(RPS_LAPORAN).toBe(LAP_S);
    expect(BATAS).toBe(BATAS2);
    expect(bagB).toContain("# Selisih p95 pembayaran antara kedua putaran bergantung mesin dan beban lain di laptop: tidak direkam dan tidak dijadikan syarat.");
    expect(bagB).toContain(`# ${koma(LAP_S, 1)} per detik = ${rib(ONLINE)} merchant online ÷ ${INTERVAL} detik (naskah bagian 3, Asumsi). Di lab polling berasal dari ${WARUNG_LAB} warung,`);
    expect(bagB).toContain(`# bukan ${rib(ONLINE)} merchant, dan data hari ini kecil: lab memeriksa batas, bukan menirukan produksi.`);
    expect(bagB).toContain("jadwal tidak tertinggal lebih dari 100 ms di kedua putaran (generator tidak jadi penghambat): ya");
    expect(bagB).toContain("# jadi 666,7 per detik, CPU 167%, dan query 20 ms di naskah tetap hitungan atas Asumsi (query 20 ms, 8 vCPU), bukan rekaman.");
    expect(bagB).toContain("# --- B. Pembayaran dengan dan tanpa polling laporan: p95 pembayaran sebagai batas, bukan nilai tunggal ---");
    const p95 = [...bagB.matchAll(/p95[^\n]*?(\d+) ms/g)].map((m) => Number(m[1]));
    expect(p95).toEqual([BATAS, BATAS2]);
    harus(`**Polling ${koma(RPS_LAPORAN, 1)} per detik selesai tanpa galat, dan perlambatannya tidak terekam.** Lab menjalankan pembayaran ${RPS_BAYAR} per detik selama ${DETIK} detik, dua kali.`);
    harus(`Putaran pertama tanpa laporan, putaran kedua dengan laporan ${koma(RPS_LAPORAN, 1)} per detik dari ${WARUNG_LAB} warung.`);
    harus(`dari ${PENGGUNA} user tiruan (Tidak dijalankan: dibaca dari \`cmd/beban\`).`);
    harus(`Kedua putaran selesai tanpa galat: ${rib(BAYAR_N)} dari ${rib(BAYAR_N)} pembayaran 201, dan ${rib(LAPORAN_N)} dari ${rib(LAPORAN_N)} laporan 200.`);
    harus(`Nilai p95 pembayaran ada di bawah batas lab ${rib(BATAS)} ms di kedua putaran (Asumsi).`);
    harus("Selisih p95 di antara kedua putaran tidak direkam dan tidak menjadi syarat, karena bergantung pada mesin dan beban lain di laptop.");
    harus(`Batas ${rib(BATAS)} ms hanya memeriksa bahwa kedua putaran tidak macet.`);
    harus("Jadi rekaman tidak menunjukkan pembayaran yang melambat.");
    expect(runPy).toContain("DETIK, BAYAR_RPS, LAPORAN_RPS = 10, 100.0, 666.7");
    expect(runPy).toContain("batas = 2000");
  });
  test("bagian B: polling lab berasal dari 9 warung (rekaman, run.py, README) dan 666,7 ÷ 9 = 74,1 per warung", () => {
    expect(WARUNG_LAB).toBe(9);
    expect(runPy).toContain("warung = list(range(505, 514))");
    expect(readme).toContain("Polling laporan 666,7 per detik dari 9 warung dengan data satu hari");
    harus(`Pertama, laporan menjumlah data satu hari dari ${WARUNG_LAB} warung.`);
    harus(`Kedua, polling lab berasal dari ${WARUNG_LAB} warung, yaitu ${koma(RPS_LAPORAN, 1)} ÷ ${WARUNG_LAB} = ${koma(RPS_LAPORAN / WARUNG_LAB, 1)} per warung per detik (Hitungan).`);
    expect(koma(RPS_LAPORAN / WARUNG_LAB, 1)).toBe("74,1");
    harus(`Di produksi, ${rib(ONLINE)} merchant masing-masing bertanya sekali tiap ${INTERVAL} detik.`);
    expect(bebanGo).toContain("w := i % len(warung)");
    expect(bebanGo).toContain('flag.Bool("hanya-bayar", false,');
    expect(bebanGo).toContain(`{"ke":%d,"nominal":1000}`);
    harus("Pembayarannya `POST /transfers` Rp1.000");
  });
  test("bagian C: cache Redis TTL 30 detik, 9 warung, jarak 30,5 detik: hit 0, miss 18, baca database 18; kontrol 9, 9, 9; hit dihitung dari pencacah", () => {
    expect(Number(C_A[1])).toBe(TTL);
    expect([Number(C_A[2]), Number(C_A[3]), Number(C_A[4])]).toEqual([0, 2 * WARUNG_LAB, 2 * WARUNG_LAB]);
    expect([Number(C_A[5]), Number(C_A[6])]).toEqual([0, 2 * WARUNG_LAB]);
    expect([Number(C_K[1]), Number(C_K[2]), Number(C_K[3]), Number(C_K[4]), Number(C_K[5]), Number(C_K[6])]).toEqual([WARUNG_LAB, WARUNG_LAB, WARUNG_LAB, WARUNG_LAB, 2 * WARUNG_LAB, 50]);
    expect(JARAK).toBeGreaterThan(TTL);
    expect([...bagC.matchAll(/berjarak ([\d,]+) detik/g)].map((m) => m[1])).toEqual([C_JARAK[1]]);
    expect(runPy).toContain("time.sleep(30.5)");
    expect((runPy.match(/time\.sleep\(/g) ?? []).length).toBeGreaterThan(0);
    expect(runPy).toContain('"-laporan-ttl", "30s"');
    expect(bagC).toContain("Jumlah hit dihitung dari pencacah server, bukan dari waktu.");
    expect(bagC).toContain(`# --- C. Cache laporan ${TTL} detik di Redis: satu client per merchant yang memanggil tiap ${INTERVAL} detik hampir tidak pernah mendapat hit ---`);
    expect(bagC).toContain(`# Cache baru menolong bila ada panggilan kedua dalam ${TTL} detik untuk merchant yang sama. Polling satu perangkat per merchant tiap\n# ${INTERVAL} detik tidak punya panggilan kedua itu.`);
    harus(`dalam dua putaran berjarak ${C_JARAK[1]} detik.`);
    harus(`Lab menyalakan cache Redis dengan TTL ${TTL} detik dan memanggil laporan ${WARUNG_LAB} warung, satu client per warung,`);
    harus(`Hasilnya ${C_A[2]} hit, ${C_A[3]} miss, dan ${C_A[4]} pembacaan database.`);
    harus(`Kontrol dengan dua client per warung dalam satu jendela TTL menghasilkan ${C_K[1]} hit dari ${C_K[5]}, jadi cache bekerja.`);
    harus("Jumlah hit dibaca dari pencacah server, bukan dari waktu.");
    harus(`Jarak ${C_JARAK[1]} detik lebih panjang dari TTL ${TTL} detik, jadi 0 hit memang diharapkan.`);
    harus(`Jarak ${TTL} detik atau lebih pendek tidak direkam.`);
  });
  test("klaim negatif berlingkup: rute hanya dengan mode; tidak ada hitungan perintah SQL di output lab; tidak ada kode yang mengisi ringkasan_merchant_harian; replica milik lab lain", () => {
    expect(handlerT5).toMatch(/if s\.rentan == service\.RentanLaporanPrimary \{[^\n]*\n\t\tmux\.HandleFunc\("GET \/merchant\/\{id\}\/laporan\/hari-ini"/);
    expect((handlerT5.match(/laporan\/hari-ini/g) ?? []).length).toBe(2);
    const keluaran = berkasDi("labs/api-t5/output/");
    expect(keluaran.length).toBeGreaterThanOrEqual(6);
    for (const f of keluaran) expect(baca(f), f).not.toMatch(/pg_stat_statements|jumlah perintah SQL|perintah SQL per permintaan/i);
    harus("sedangkan rekaman tidak menghitung perintah SQL (Tidak dijalankan).");
    const kode = berkasDi("labs/api-t5/").filter((f) => /\.(go|py|sql)$/.test(f));
    expect(kode.length).toBeGreaterThan(50);
    for (const f of kode) expect(baca(f), f).not.toMatch(/(INSERT\s+INTO|UPDATE|DELETE\s+FROM|COPY)\s+(\{s\}\.|\w+\.)?ringkasan_merchant_harian/i);
    expect(readme).toContain("`ringkasan_merchant_harian` ada sebagai tabel, belum ada yang mengisinya");
    expect(readme).toContain("Replica dan jeda baca milik `t5-replika`");
    harus("- Replica tidak dipakai di lab `api-t5`, dan tidak ada kode di folder itu yang mengisi tabel `ringkasan_merchant_harian`.");
    expect(badanRepo).not.toMatch(/ringkasan|replica|cache|redis/i);
    harus("Di dalam fungsi itu tidak ada ringkasan, replica, atau cache (Tidak dijalankan: dibaca dari kode):");
  });
});

describe("kode lab: query laporan, tiga perintah SQL, dibaca_dari, dan cache", () => {
  test("rentang Snippet: tiap lines sama dengan batas fungsi atau bagian rekaman yang diturunkan dari berkasnya; judul memuat nomor baris", () => {
    expect(berkasSnippet).toEqual([
      "labs/api-t5/output/laporan.txt", "labs/api-t5/output/laporan.txt", "labs/api-t5/internal/repo/t5.go", "labs/api-t5/internal/service/t5.go",
      "labs/api-t5/output/laporan.txt", "labs/api-t5/output/laporan.txt",
    ]);
    expect(lines).toEqual([`${GET404}:${A404}`, `${POST1}:${JSONLAP}`, `${rFungsi}:${rAkhir}`, `${sAwal}:${sAkhir}`, `${B0}:${BAKHIR}`, `${C0}:${CAKHIR}`]);
    expect(lines).toEqual(["7:12", "14:30", "27:35", "69:88", "48:57", "60:66"]);
    expect(judulSnippet[2]).toContain(`baris ${rFungsi} sampai ${rAkhir}`);
    expect(judulSnippet[3]).toContain(`baris ${sAwal} sampai ${sAkhir}`);
    for (const j of judulSnippet.slice(0, 2).concat(judulSnippet.slice(4))) expect(j).toMatch(/^Rekaman lab: labs\/api-t5\/output\/laporan\.txt, bagian [ABC] \(/);
    expect(judulSnippet[0]).toContain("bagian A");
    expect(judulSnippet[1]).toContain("bagian A");
    expect(judulSnippet[4]).toContain("bagian B");
    expect(judulSnippet[5]).toContain("bagian C");
    expect(tag.map((t) => t.match(/lang="([^"]+)"/)?.[1])).toEqual([undefined, undefined, "go", "go", undefined, undefined]);
    // Snippet tidak menampilkan komentar lab internal, ID riset, nomor keputusan, atau nomor PR.
    for (let i = 0; i < tag.length; i++) {
      const [a, b] = lines[i]!.split(":").map(Number) as [number, number];
      const isi = baca(berkasSnippet[i]!).split("\n").slice(a - 1, b).join("\n");
      expect(isi, `snippet ${i}`).not.toMatch(/\bR\d-\d+\b|keputusan \d+|PR #?\d+|mutasi tinjauan/i);
      expect(sidik(isi), `sidik snippet ${i}`).toBe(SIDIK.snippet[i]);
    }
  });
  test("query laporan: satu SELECT atas buku dan posting dengan batas dibuat; repo memakai db yang sama dengan transaction pembayaran", () => {
    expect(badanRepo).toContain("FROM buku b JOIN posting p ON p.buku_id = b.id");
    expect(badanRepo).toContain("p.dibuat >= $2 AND p.dibuat < $3");
    expect(badanRepo.match(/QueryRowContext/g)).toHaveLength(1);
    expect(badanRepo.match(/r\.db\./g)).toHaveLength(1);
    expect(baca("labs/api-t5/internal/repo/tx.go")).toContain("r.db.BeginTx(");
    harus("Fungsi `LaporanHariIni` di lapisan repo menjalankan satu query atas `posting` dan `buku`.");
    harus("lewat pool koneksi yang sama (Tidak dijalankan: dibaca dari kode lab)");
    expect(readme).toContain("Laporan merchant dari primary** hanya ada dengan `-rentan laporan-primary` (M40): tanpa mode itu rutenya tidak terdaftar.");
  });
  test("tiga perintah SQL per permintaan GET dengan token Bearer: SesiAktif (wajibLogin), Akun, dan LaporanHariIni; cache hanya membungkus yang ketiga", () => {
    expect(handlerT5).toContain('mux.HandleFunc("GET /merchant/{id}/laporan/hari-ini", s.wajibLogin(s.laporanHariIni))');
    expect(handlerGo).toContain("sesi, err := s.svc.Periksa(r.Context(), token)");
    expect(sesiGo).toContain("x, err := s.repo.SesiAktif(ctx, hashToken(token), s.kini())");
    const sesiFungsi = cocok(repoGo, /func \(r Repo\) SesiAktif\([\s\S]*?\n\}\n/)[0];
    expect(sesiFungsi.match(/QueryRowContext/g)).toHaveLength(1);
    expect(sesiFungsi).toContain("FROM sesi s JOIN akun a ON a.id = s.akun_id\n\t\tWHERE s.token_hash = $1 AND s.kedaluwarsa > $2 AND NOT a.wajib_ganti_password");
    const akunFungsi = cocok(repoGo, /func \(r Repo\) Akun\([\s\S]*?\n\}\n/)[0];
    expect(akunFungsi.match(/QueryRowContext/g)).toHaveLength(1);
    expect(akunFungsi).toContain("FROM akun a LEFT JOIN buku b");
    expect(badanSvc.match(/s\.repo\.\w+\(/g)).toEqual(["s.repo.Akun(", "s.repo.LaporanHariIni("]);
    expect(badanSvc.indexOf("s.repo.Akun(")).toBeLessThan(badanSvc.indexOf("muat := func"));
    expect(badanSvc.match(/s\.kl\.Baca\(/g)).toHaveLength(1);
    const muat = cocok(badanSvc, /muat := func\(ctx context\.Context\) \(\[\]byte, error\) \{[\s\S]*?\n\t\}\n/)[0];
    expect(muat).toContain("s.repo.LaporanHariIni(");
    expect(muat).not.toContain("s.repo.Akun(");
    expect(handlerGo).toContain("jenis == \"web\" && metodeUbah(r.Method) && !csrfSah(r, sesi)");
    harus("Satu permintaan laporan yang sah, yaitu GET dengan token Bearer, menjalankan tiga perintah SQL di lab. `SesiAktif` memeriksa sesi, `Akun` membaca akun merchant, dan `LaporanHariIni` menjumlah posting.");
    harus("Ketiganya dibaca dari `handler.go`, `repo.go`, dan `service/t5.go`, sedangkan rekaman tidak menghitung perintah SQL (Tidak dijalankan). Cache, bila dipasang, hanya membungkus yang ketiga:");
    harus("Hit juga hanya melewati `LaporanHariIni`. Pemeriksaan sesi dan `Akun` tetap membaca database di tiap panggilan (Tidak dijalankan: dibaca dari kode).");
    harus('Pencacah "baca database" tidak menghitung dua perintah itu.');
    expect(cacheGo).toContain("k.DBBaca.Add(1)\n\tb, merr := muat(ctx)");
  });
  test("dibaca_dari: teks tetap primary setelah cabang cache dan non-cache, jadi juga untuk jawaban dari cache; baris 87 di service dan di baris riset", () => {
    expect(S5.baris[sPrimary - 1]).toBe('\tl.Merchant, l.Tanggal, l.DibacaDari = merchant, tanggal, "primary"');
    expect(sPrimary).toBeGreaterThan(S5.nomor((b) => b === "\t\tb, err = muat(ctx)", sAwal));
    expect(sPrimary).toBe(87);
    expect(sPrimary).toBeGreaterThanOrEqual(sAwal);
    expect(sPrimary).toBeLessThanOrEqual(sAkhir);
    harus("Field `dibaca_dari` ditulis kode sebagai teks `primary`, juga untuk jawaban dari cache. Field itu menyatakan maksud kode, bukan hasil ukuran (Tidak dijalankan: dibaca dari kode).");
    const r125 = barisRiset("R5-125");
    expect(r125).toContain(`\`LaporanHariIni\` baris ${rFungsi} sampai ${rAkhir}`);
    expect(r125).toContain(`\`LaporanHariIni\` baris ${sFungsi} sampai ${sFungsiAkhir}`);
    expect(r125).toContain(`\`DibacaDari\` teks tetap "primary" baris ${sPrimary}`);
  });
  test("cache: hit tidak menyimpan ulang (Simpan hanya sesudah miss dan muat); Redis membaca dengan GET dan menyimpan dengan SET berumur TTL; TTL laporan 30 detik", () => {
    const baca_ = cocok(cacheGo, /func \(k \*Katalog\) Baca\([\s\S]*?\n\}\n/)[0];
    expect(baca_.match(/\.Simpan\(/g)).toHaveLength(1);
    const caseAda = cocok(baca_, /case ada:\n([\s\S]*?)default:/)[1]!;
    expect(caseAda).toContain("k.Hit.Add(1)");
    expect(caseAda).toContain("return b, nil");
    expect(caseAda).not.toContain("Simpan");
    expect(baca_.indexOf("Simpan(")).toBeGreaterThan(baca_.indexOf("muat(ctx)"));
    expect(baca_).toContain("k.P.Simpan(ctx, kunci, b, k.TTL)");
    expect(redisGo).toContain("r.rdb.Get(ctx, kunci).Bytes()");
    expect(redisGo).toContain("r.rdb.Set(ctx, kunci, nilai, ttl).Err()");
    expect(redisGo).not.toMatch(/GetEx|Expire\(|Persist/);
    expect(svcT5).toMatch(/TTLLaporan = 30 \* time\.Second/);
    harus("Kode lab membaca kunci dengan `GET`, dan menyimpannya dengan `SET` berumur TTL hanya saat miss.");
    harus("`GET` membaca tanpa menimpa isinya, jadi hit tidak memperpanjang umur isi.");
    harus("Cache 30 detik membuat laporan bisa setua 30 detik, karena hit mengembalikan isi yang disimpan saat miss (Tidak dijalankan: dibaca dari kode).");
  });
  test("Redis dan PostgreSQL: kutipan dokumentasi di baris riset, tanggal akses sama dengan halaman, versi disebut", () => {
    const r128 = barisRiset("R5-128"), r129 = barisRiset("R5-129");
    expect(r128).toContain("'After the timeout has expired, the key will automatically be deleted.'");
    expect(r128).toContain("'The timeout will only be cleared by commands that delete or overwrite the contents of the key, including DEL, SET, GETSET and all the *STORE commands.'");
    expect(r128).toContain("redis.io/docs/latest/commands/expire/");
    expect(r129).toContain("'The ANALYZE option causes the statement to be actually executed, not only planned. Then actual run time statistics are added to the display'");
    expect(r129).toContain("PostgreSQL 17.11, EXPLAIN (postgresql.org/docs/17/sql-explain.html");
    const tglHalaman = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(tglHalaman).toEqual(["2026-11-02", "2026-11-02"]);
    expect(r128).toContain("dibuka 2026-11-02");
    expect(r129).toContain("dibuka 2026-11-02");
    harus("([PostgreSQL 17.11, EXPLAIN](https://www.postgresql.org/docs/17/sql-explain.html), dibuka 2026-11-02, Tidak dijalankan)");
    harus("Dokumentasi Redis menulis bahwa timeout hanya dihapus perintah yang menghapus atau menimpa isi kunci.");
    harus("Halaman sumbernya, [Redis, EXPIRE](https://redis.io/docs/latest/commands/expire/), berversi latest tanpa nomor dan dibuka 2026-11-02 (Tidak dijalankan).");
    harus("`EXPLAIN ANALYZE` menjalankan statement dan menambahkan statistik waktu nyata");
    expect(readme).toContain("PostgreSQL | 17.11");
  });
});

describe("hitungan beban produksi: diturunkan dari angka naskah dan angka yang tertulis di halaman (pembulatan setengah ke atas)", () => {
  test("masukan naskah: 10% online, interval 30, W 20 ms, 8 vCPU, 69,4 dan 46,3, 1.388,9, pemicu 5 koneksi; sama dengan 5.1 dan tabel halaman", () => {
    expect([PERSEN_ONLINE, INTERVAL, W_MS, VCPU]).toEqual([10, 30, 20, 8]);
    expect([TRX3, TRX2, REQ, PEMICU]).toEqual([69.4, 46.3, 1388.9, 5]);
    expect(ONLINE).toBe(20000);
    expect(prd).toContain("| Transaksi uang per detik di puncak | 69,4 |");
    expect(prd).toContain("| Puncak request per detik | 1.388,9 |");
    expect(prd).toContain("46,3 |");
    expect(PRD_TERTINGGAL).toBe(5);
    expect(PRD_LAYAR.slice(1, 3).map(Number)).toEqual([30, 35]);
    harus(`Isinya ${rib(200000)} merchant ([[t5-prd]]), ${PERSEN_ONLINE}% online, polling tiap ${INTERVAL} detik, dan ${VCPU} vCPU.`);
    harus(`Satu permintaan memegang koneksi ${W_MS} ms, angka yang sama dengan [[t4-estimasi]].`);
    harus(`Transaksi uang puncak ${koma(TRX3, 1)} per detik memakai tiga transaksi per user aktif per hari. Dengan dua transaksi angkanya ${koma(TRX2, 1)}.`);
    harus("vCPU adalah satu inti CPU virtual.");
  });
  test("tabel Hitungan: tiap sel diturunkan; tiga kolom; baris urut", () => {
    const merchant = 200000 * (PERSEN_ONLINE / 100);
    const rows: [string, string, string][] = [
      ["Merchant online", `${rib(200000)} × ${PERSEN_ONLINE}%`, rib(merchant)],
      ["Laporan per detik", `${rib(merchant)} ÷ ${INTERVAL}`, koma(LAP_S, 1)],
      ["Dibanding transaksi uang puncak", `${koma(LAP_S, 1)} ÷ ${koma(TRX3, 1)}`, `${koma(LAP_S / TRX3, 1)} kali`],
      ["Laporan berjalan serentak", `${koma(LAP_S, 1)} × ${koma(W, 2)}`, koma(LAP_S * W, 1)],
      ["Kebutuhan CPU", `${koma(LAP_S, 1)} × ${koma(W, 2)} ÷ ${VCPU}`, `${koma((LAP_S * W * 100) / VCPU, 0)}%`],
      ["Kebutuhan CPU bila 1 ms", `${koma(LAP_S, 1)} × ${koma(0.001, 3)} ÷ ${VCPU}`, `${koma((LAP_S * 0.001 * 100) / VCPU, 1)}%`],
      ["Kebutuhan CPU di 16 vCPU", `${koma(LAP_S, 1)} × ${koma(W, 2)} ÷ 16`, `${koma((LAP_S * W * 100) / 16, 0)}%`],
    ];
    const tabel = badan.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel[0]).toBe("| Besaran | Hitungan | Hasil |");
    expect(tabel[1]).toBe("|---|---|---|");
    expect(tabel.slice(2)).toEqual(rows.map((r) => `| ${r.join(" | ")} |`));
    expect(rows.map((r) => r[2])).toEqual(["20.000", "666,7", "9,6 kali", "13,3", "167%", "8,3%", "83%"]);
  });
  test("kalimat sesudah tabel: dua transaksi, L baca, titik impas 12 ms, 16 vCPU; label Hitungan atas Asumsi dan penalaran", () => {
    harus(`Dengan dua transaksi per user aktif, perbandingan itu menjadi ${koma(LAP_S, 1)} ÷ ${koma(TRX2, 1)} = ${koma(LAP_S / TRX2, 1)} kali.`);
    const lBaca = bulat((REQ - TRX3) * W, 1), lBaca2 = bulat((REQ - TRX2) * W, 1);
    expect([lBaca, lBaca2]).toEqual([26.4, 26.9]);
    expect(Math.round((lBaca / PEMICU) * 100)).toBe(528);
    expect(barisBaca).toContain(`L = ${koma(lBaca, 1)} koneksi, atau ${Math.round((lBaca / PEMICU) * 100)}% dari pemicu read replica ADR 45`);
    expect(barisBaca).toContain(`| (request − transaksi uang) × W | (${koma(REQ, 1)} − ${koma(TRX3, 1)}) × ${koma(W, 2)} |`);
    harus(`(${rib(REQ)} − ${koma(TRX3, 1)}) × ${koma(W, 2)} = ${koma(lBaca, 1)} koneksi, ${Math.round((lBaca / PEMICU) * 100)}% dari pemicu read replica di [[t4-adr-45]] yang ${PEMICU} koneksi.`.replace(rib(REQ), koma(REQ, 1)));
    harus(`Dengan dua transaksi hasilnya ${koma(lBaca2, 1)} koneksi (Hitungan atas Asumsi).`);
    const impas = VCPU / LAP_S;
    expect(koma(impas, 4)).toBe("0,0120");
    expect(Math.round(impas * 1000)).toBe(12);
    harus(`Laporan sendirian memakai seluruh ${VCPU} vCPU bila satu permintaan memakai ${VCPU} ÷ ${koma(LAP_S, 1)} = ${koma(impas, 4)} detik CPU, yaitu ${Math.round(impas * 1000)} ms.`);
    harus(`Di atas ${Math.round(impas * 1000)} ms, laporan meminta lebih dari yang dimiliki mesin, dan pembayaran berebut CPU dengan laporan (penalaran; rekaman tidak mengukurnya).`);
    harus(`Angka ${koma((LAP_S * W * 100) / VCPU, 0)}% memakai ${W_MS} ms sebagai waktu CPU.`);
    harus(`jadi untuk ${W_MS} ms itu ${koma((LAP_S * W * 100) / VCPU, 0)}% adalah batas atas (penalaran).`);
    harus(`Menambah CPU memindahkan batas itu: 16 vCPU memberi ${koma((LAP_S * W * 100) / 16, 0)}%.`);
    harus(`Tetapi ${koma(LAP_S, 1)} naik sebanding dengan merchant online (online ÷ ${INTERVAL})`);
    harus("**Di produksi, bebannya Hitungan atas Asumsi.**");
    expect(barisPolling).toContain("666,7 per detik, atau 9,6 kali transaksi uang puncak (666,7 ÷ 69,4). L = 666,7 × 0,02 = 13,3 query berjalan. CPU 666,7 × 0,02 ÷ 8 = 167%");
  });
  test("cache: jarak 29 detik dua kali = 58 lawan TTL 30; 30 + 30 = 60 lawan 30 + 5 = 35 dari PRD v5", () => {
    expect(29 + 29).toBe(58);
    expect(58).toBeGreaterThan(TTL);
    harus(`Bila jarak satu perangkat 29 detik, panggilan kedua mendapat hit. Panggilan ketiga tidak, karena hit tidak memperpanjang umur isi: ia datang 29 + 29 = 58 detik sesudah isi dibuat, jauh di atas ${TTL} (Hitungan).`);
    harus(`PRD v5 menulis data laporan tertinggal paling lama ${PRD_TERTINGGAL} detik dan penjualan baru terlihat paling lambat ${PRD_LAYAR[2]} detik, yaitu ${INTERVAL} + ${PRD_TERTINGGAL} ([[t5-prd]]; Asumsi produk).`);
    harus(`Dengan cache, penjualan baru bisa terlihat ${TTL} + ${INTERVAL} = ${TTL + INTERVAL} detik sesudah tercatat (Hitungan atas Asumsi produk).`);
    expect(TTL + INTERVAL).toBeGreaterThan(Number(PRD_LAYAR[2]));
    expect(INTERVAL + PRD_TERTINGGAL).toBe(Number(PRD_LAYAR[2]));
    harus(`Untuk jarak di antara ${TTL / 2} dan ${TTL} detik, paling banyak satu dari dua panggilan berurutan mendapat hit (penalaran, tidak direkam).`);
    expect(badan).not.toContain("Hasil terbaik");
  });
});

describe("diagram Rantai ringkas dan skenario alur: nilai diturunkan dari rekaman dan hitungan", () => {
  test("Rantai: dua baris tiga simpul; angka dari rekaman dan hitungan; jenis asumsi; simpul akhir terbaca tanpa sub", () => {
    expect(diagram.baris).toHaveLength(2);
    expect(diagram.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    expect(diagram.sumber.jenis).toBe("asumsi");
    const [a, b] = diagram.baris;
    expect(a!.simpul.map((s) => s.teks)).toEqual(["Laporan dibaca dari primary", `${rib(LAPORAN_N)} laporan selesai`, `${rib(BAYAR_N)} pembayaran tetap 201`]);
    expect(a!.simpul[1]!.sub).toBe(`${koma(RPS_LAPORAN, 1)} per detik selama ${DETIK} detik, semua 200`);
    expect(a!.simpul[2]!.sub).toBe("selisih p95 tidak direkam");
    expect(b!.simpul.map((s) => s.teks)).toEqual([`${koma(LAP_S, 1)} laporan per detik`, `${koma(LAP_S * W, 1)} laporan berjalan`, `${koma((LAP_S * W * 100) / VCPU, 0)}% CPU bila ${W_MS} ms`]);
    expect(b!.simpul.map((s) => s.sub)).toEqual([`${rib(ONLINE)} ÷ ${INTERVAL}`, `${koma(LAP_S, 1)} × ${koma(W, 2)}`, `${koma(LAP_S, 1)} × ${koma(W, 2)} ÷ ${VCPU}, Hitungan atas Asumsi`]);
    expect(b!.sub).toBe(`Asumsi: ${rib(ONLINE)} merchant online, ${W_MS} ms, ${VCPU} vCPU`);
    expect(b!.simpul[2]!.nada).toBe("warn");
    expect(a!.simpul.every((s) => s.nada === "biasa")).toBe(true);
    expect(diagram.sumber.teks).toBe("Baris atas: rekaman lab api-t5, laporan.txt bagian A dan B. Baris bawah: Hitungan atas Asumsi");
    expect(a!.sub).toBe("laporan.txt bagian A dan B");
    expect(a!.label + b!.label).toBe("DirekamDihitung");
    expect(JSON.stringify(diagramMentah)).not.toMatch(/R\d-\d+/);
  });
  test("skenario: valid menurut alur-core; tiap baris kirim adalah baris rekaman; jalur utama lima langkah, varian mengganti langkah terakhir", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p) => terlacak?.has(p) ?? true })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/api-t5/output/laporan.txt", fileVarian: "labs/api-t5/output/laporan.txt" });
    const baris = new Set(L.baris);
    const ringkasan = [
      `# ./beban: pembayaran ${RPS_BAYAR} per detik selama ${DETIK} detik dari ${PENGGUNA} user, tanpa laporan`,
      `# ./beban: pembayaran yang sama, ditambah laporan ${koma(RPS_LAPORAN, 1)} per detik dari ${WARUNG_LAB} warung`,
    ];
    const dipakai: string[] = [];
    for (const s of [...skenario.langkah, ...skenario.varian.langkah]) for (const b of s.kirim.split("\n")) {
      if (baris.has(b)) continue;
      dipakai.push(b); // baris yang bukan baris rekaman harus ringkasan berpagar yang diturunkan dari rekaman
    }
    expect(dipakai).toEqual(ringkasan);
    expect(bagB).toMatch(/-pengguna (\d+) -hanya-bayar/);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(skenario.langkah.length - 1);
    expect(skenario.varian.langkah).toHaveLength(1);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["kln", "srv", "dbm", "rds"]);
    expect(skenario.langkah.map((s) => s.nada)).toEqual([undefined, undefined, undefined, undefined, "warn"]);
    expect(skenario.varian.langkah[0]!.nada).toBe("good");
    for (const s of [...skenario.langkah, ...skenario.varian.langkah]) { expect(skenario.komponen.map((k) => k.id)).toContain(s.dari); }
    expect(skenario.sumber.catatan).toContain("Polling berasal dari 9 warung dengan data satu hari, bukan dari 20.000 merchant.");
  });
  test("tebakan: jawaban benar di pilihan ketiga (bukan pertama atau keempat); pertanyaan dan penjelasan memuat angka rekaman; jalur utama; pengantar menyuruh menebak", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(2);
    expect(p.varian).toBe(false);
    expect(p.options[p.answer]).toBe(`0 dari ${2 * WARUNG_LAB}: panggilan kedua datang sesudah isi cache kedaluwarsa`);
    expect(p.q).toBe(`Cache laporan di Redis berumur ${TTL} detik. Sembilan warung masing-masing punya satu client yang memanggil laporan dua kali, berjarak ${C_JARAK[1]} detik. Berapa dari ${2 * WARUNG_LAB} panggilan yang menemukan isinya di cache (hit)?`);
    expect(p.explain).toBe(`Jaraknya ${C_JARAK[1]} detik, lebih panjang dari umur isi cache ${TTL} detik, jadi kedua putaran miss: hit ${C_A[2]}, miss ${C_A[3]}, baca database ${C_A[4]}. Jumlah hit dibaca dari pencacah server, bukan dari waktu. Rekaman laporan.txt bagian C.`);
    expect(p.options[0]).toBe(`${C_K[1]} dari ${2 * WARUNG_LAB}: panggilan kedua tiap warung memakai isi dari panggilan pertama`);
    expect(skenario.pengantar).toBe("Laporan Warung 505 dibaca dari primary, lalu lab memutar polling dan cache 30 detik. Tebak dulu berapa dari 18 panggilan yang mendapat hit di cache, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    harus(`Tebak dulu berapa dari ${2 * WARUNG_LAB} panggilan yang menemukan isinya di cache, lalu tekan Berikutnya atau panah kanan.`);
    harus(`Sesudah langkah terakhir, centang **Ubah satu hal: ${skenario.varian.label}**. Hasilnya ${C_K[1]} hit dari ${C_K[5]}.`);
  });
  test("noscript dan kalimat penutup Coba sendiri diturunkan dari rekaman", () => {
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(noscript).toContain(`laporan Warung ${LAP.merchant} dijawab dari primary dengan dua transaksi dan total ${rp(LAP.total)}.`);
    expect(noscript).toContain(`Polling ${koma(RPS_LAPORAN, 1)} per detik dari ${WARUNG_LAB} warung selesai tanpa galat, dan selisih p95 pembayaran tidak direkam.`);
    expect(noscript).toContain(`menghasilkan ${C_A[2]} hit dari ${2 * WARUNG_LAB}.`);
    expect(noscript).toContain(`hasilnya ${C_K[1]} hit dari ${C_K[5]}.`);
    expect(noscript).toContain(`jarak ${C_JARAK[1]} detik`);
    harus("Cache menolong bila ada panggilan kedua dalam 30 detik untuk merchant yang sama, dan polling satu perangkat per merchant tidak punya panggilan itu.");
  });
});

describe("baris riset 5.4: lima baris, urut ID, dan nilai dari rekaman", () => {
  test("R5-125 sampai R5-129 ada, urut naik di tabel, tanpa ID ganda, berdampingan; nilai Hitungan sama dengan halaman", () => {
    const id = riset.split("\n").map((b) => b.match(/^\| R5-(\d+) \|/)?.[1]).filter((x): x is string => !!x).map(Number);
    expect(id.length).toBeGreaterThan(20);
    expect(new Set(id).size).toBe(id.length);
    const tabelKonsep = id.slice(0, id.indexOf(129) + 1);
    expect(tabelKonsep.every((n, i) => i === 0 || n > tabelKonsep[i - 1]!), "baris riset di tabel konsep urut ID naik").toBe(true);
    expect(id.slice(id.indexOf(125), id.indexOf(125) + 5)).toEqual([125, 126, 127, 128, 129]);
    const r126 = barisRiset("R5-126");
    expect(r126).toContain(`${rib(200000)} × ${PERSEN_ONLINE}% = ${rib(ONLINE)}`);
    expect(r126).toContain(`${rib(ONLINE)} ÷ ${INTERVAL} = 666,67 (ditulis ${koma(LAP_S, 1)})`);
    expect(r126).toContain(`${koma(LAP_S, 1)} ÷ ${koma(TRX3, 1)} = 9,61 (9,6) dan ${koma(LAP_S, 1)} ÷ ${koma(TRX2, 1)} = 14,40 (14,4)`);
    expect(r126).toContain(`${koma(LAP_S, 1)} × ${koma(W, 2)} = 13,33 (13,3)`);
    expect(r126).toContain(`${koma(LAP_S, 1)} × ${koma(W, 2)} ÷ ${VCPU} = 1,667 (167%)`);
    expect(r126).toContain(`${VCPU} ÷ ${koma(LAP_S, 1)} = 0,0120 detik (12 ms)`);
    expect(r126).toContain(`${koma(LAP_S, 1)} × ${koma(0.001, 3)} ÷ ${VCPU} = 8,3%`);
    expect(r126).toContain(`${koma(LAP_S, 1)} × ${koma(W, 2)} ÷ 16 = 83%`);
    expect(r126).toContain("(1.388,9 − 69,4) × 0,02 = 26,39 (26,4) dan ÷ 5 = 528%");
    expect(r126).toContain("(1.388,9 − 46,3) × 0,02 = 26,85 (26,9)");
    expect(r126).toContain(`${koma(LAP_S, 1)} ÷ ${WARUNG_LAB} = ${koma(LAP_S / WARUNG_LAB, 1)}`);
    expect(r126).toContain("29 + 29 = 58 lawan TTL 30; 30 + 30 = 60 lawan 30 + 5 = 35");
    const r127 = barisRiset("R5-127");
    expect(r127).toContain(`jarak ${C_JARAK[1]} detik, lebih panjang dari TTL ${TTL} detik`);
    expect(r127).toContain("Naskah R5-36 menulis laporan harian satu merchant ringan (2 sampai 3 transaksi per hari)");
    expect(barisRiset("R5-125")).toContain(`hit ${C_A[2]}, miss ${C_A[3]}, baca database ${C_A[4]}`);
    expect(barisRiset("R5-125")).toContain(`hit ${C_K[1]}, miss ${C_K[2]}, baca database ${C_K[3]}`);
    expect(barisRiset("R5-125")).toContain(`${LAPORAN_N} dari ${LAPORAN_N} semua 200`);
    expect(barisRiset("R5-125")).toContain(`1000 dari 1000 semua 201`);
    const r36 = riset.split("\n").find((x) => x.startsWith("| R5-36 Merchant per akun |"));
    expect(r36, "baris R5-36 di tabel Angka tahap ini").toBeDefined();
    expect(r36).toContain("laporan harian ringan");
    expect(barisPolling).toContain("200.000 × 10% = 20.000 online");
    expect(barisPolling).toContain("(R5-34)");
    expect(riset).toContain("| R5-34 Polling laporan | merchant online ÷ interval | Asumsi: 200.000 merchant (\"ratusan ribu\"), 10% online, polling 30 detik, query 20 ms, 8 vCPU |");
  });
});

describe("tinjauan sendiri: kalimat, bullet, judul Snippet, dan frontmatter yang tadinya hanya dijaga kunci baris diturunkan dari sumber", () => {
  const MINGGU = cocok(barisM40, /^\| M40 \| (\d+) \|/)[1]!;
  const DETIK_CERITA = Number(cocok(barisM40, /berputar (\d+) detik/)[1]);
  test("frontmatter: judul dan description diturunkan dari registry, minggu naskah, dan interval PRD", () => {
    expect(frontmatter).toBe(
      `title: "5.4 ${dari("t5-m40").judul}"\n` +
        `description: Minggu ${MINGGU}. Merchant membuka laporan real-time tiap ${INTERVAL} detik, pembayaran di warung ikut menunggu, dan laporan membaca primary yang sama dengan pembayaran. Rekaman membuktikan jalurnya, hitungan memperkirakan bebannya.\n`,
    );
    expect(dari("t5-m40").label).toBe(`Masalah 40 · minggu ${MINGGU}`);
    harus(`Minggu ${MINGGU} Tahap 5. Kamis pukul 11.40 Ani menunggu`);
    expect(barisM40).toContain("Kamis 11.40 Ani menunggu");
  });
  test("judul Snippet lengkap: berkas, bagian rekaman, nomor baris kode, dan keterangan", () => {
    expect(judulSnippet).toEqual([
      "Rekaman lab: labs/api-t5/output/laporan.txt, bagian A (tanpa mode rentan rute laporan tidak ada)",
      `Rekaman lab: labs/api-t5/output/laporan.txt, bagian A (dua pembayaran Budi dan laporan Warung ${LAP.merchant})`,
      `Kode lab: labs/api-t5/internal/repo/t5.go baris ${rFungsi} sampai ${rAkhir} (query laporan atas posting)`,
      `Kode lab: labs/api-t5/internal/service/t5.go baris ${sAwal} sampai ${sAkhir} (cache membungkus satu query, dibaca_dari teks tetap)`,
      "Rekaman lab: labs/api-t5/output/laporan.txt, bagian B (pembayaran dengan dan tanpa polling laporan)",
      `Rekaman lab: labs/api-t5/output/laporan.txt, bagian C (cache ${TTL} detik dan kontrol dua client)`,
    ]);
    expect(L.baris[lA - 1]).toMatch(/^# --- A\. /);
    expect(L.baris[lB - 1]).toMatch(/^# --- B\. /);
    expect(L.baris[lC - 1]).toMatch(/^# --- C\. /);
  });
  test("bagian A rekaman yang tampil di Snippet: blok 404 tanpa mode, dua pembayaran 201 dengan saldo turun sebesar nominal, dan laporan 200", () => {
    expect(L.teks(GET404, A404)).toBe(
      "$ curl -i -X GET '/merchant/505/laporan/hari-ini' -H 'Authorization: Bearer <token sesi Warung 505>'\nHTTP/1.1 404 Not Found\nContent-Type: text/plain; charset=utf-8\nX-Content-Type-Options: nosniff\n\n404 page not found",
    );
    const bayar = [...bagA.matchAll(/-d '\{"ke": (\d+), "nominal": (\d+)\}'\nHTTP\/1\.1 201 Created\nContent-Type: application\/json\nLocation: \/transfers\/(\d+)\n\n\{"id":(\d+),"saldo":(\d+)\}/g)];
    expect(bayar).toHaveLength(2);
    expect(bayar.map((m) => [Number(m[1]), Number(m[2])])).toEqual(POST);
    for (const m of bayar) expect(m[3]).toBe(m[4]);
    expect(Number(bayar[1]![3])).toBe(Number(bayar[0]![3]) + 1);
    expect(Number(bayar[0]![5]) - POST[1]![1]).toBe(Number(bayar[1]![5]));
    expect(bagA).toContain(`$ curl -i -X GET '/merchant/${LAP.merchant}/laporan/hari-ini' -H 'Authorization: Bearer <token sesi Warung ${LAP.merchant}>'\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{"merchant":${LAP.merchant},`);
    expect(bagB).toContain(`# Yang diperiksa: kedua putaran selesai tanpa galat, p95 di bawah batas, dan jadwal tidak tertinggal. Data lab kecil (satu hari, ${WARUNG_LAB} warung),`);
  });
  test("cabang cache di service: dengan cache Baca membungkus muat, tanpa cache muat dipanggil langsung; query laporan lengkap", () => {
    expect(badanSvc).toMatch(/if s\.kl != nil \{\n\t\tb, err = s\.kl\.Baca\(ctx, fmt\.Sprintf\("laporan:%d:%s", merchant, tanggal\), muat\)\n\t\} else \{\n\t\tb, err = muat\(ctx\)\n\t\}/);
    expect(badanRepo).toContain("WHERE b.akun_id = $1 AND b.jenis IN ('warung', 'merchant') AND p.jumlah > 0\n\t\t  AND p.dibuat >= $2 AND p.dibuat < $3");
  });
  test("kalimat prosa Gejala, Yang Raka kira, dan Yang sebenarnya yang memuat angka, label, atau nama", () => {
    harus(`Rekaman lab tidak menghasilkan tombol Bayar yang berputar ${DETIK_CERITA} detik, dan alasannya ada di blok Yang sebenarnya.`);
    harus(`dua pembayaran Ani, dan ${DETIK_CERITA} detik berasal dari naskah, bukan dari rekaman.`);
    harus("Cache menyimpan jawaban sementara. Panggilan yang menemukan jawaban tersimpan disebut hit dan tidak membaca database. Panggilan yang tidak menemukannya disebut miss dan membaca database.");
    harus("Usul cache Nadia diuji di blok Coba sendiri, dengan tebakan sendiri.");
    harus("Laporan menjumlah posting di primary yang sama dengan pembayaran, jadi tiap polling menambah kerja database yang menulis uang.");
    harus("Laporan menjumlah baris di tabel `posting`. Tabel itu juga menerima baris baru tiap pembayaran, lewat pool koneksi yang sama");
    harus("Mode itu adalah kode lab yang ditulis untuk M40, bukan salinan kode yang pernah berjalan di cerita.");
    harus("Masukannya berasal dari tabel beban naskah Tahap 5, dan semuanya Asumsi.");
    harus(`Seluruh perlambatan di cerita bergantung pada ${W_MS} ms yang tidak diukur.`);
    harus(`Lama memegang koneksi juga mencakup menunggu disk atau lock, jadi untuk ${W_MS} ms itu ${koma((LAP_S * W * 100) / VCPU, 0)}% adalah batas atas (penalaran).`);
    harus(`**Cache ${TTL} detik punya dua masalah yang terpisah.** Yang pertama soal hit.`);
    harus("**Masalah kedua tidak bergantung pada hit.**");
    harus("Cara lain melayani laporan ditimbang di [[t5-read-replica]].");
    harus("dan bebannya tetap di mesin yang menulis uang.");
    harus("Hit juga hanya melewati `LaporanHariIni`.");
  });
  test("bullet Yang tidak direkam: tiap bullet diturunkan dari angka rekaman, hitungan, dan naskah", () => {
    harus(`- Pembayaran yang melambat: selisih p95 dengan dan tanpa laporan tidak direkam. Yang terekam hanya p95 di bawah ${rib(BATAS)} ms di kedua putaran.`);
    harus(`- ${rib(ONLINE)} merchant online, ${W_MS} ms, dan ${VCPU} vCPU adalah Asumsi. Lab memakai ${WARUNG_LAB} warung, data satu hari, dan satu laptop.`);
    harus(`- Jarak polling ${TTL} detik atau lebih pendek ke cache tidak direkam.`);
    harus("- Naskah menulis satu perangkat per merchant, padahal laporan tampil di app Merchant dan di dasbor web. Jumlah layar per merchant adalah Asumsi.");
    expect(naskah).toContain("Layar laporan di app Merchant dan dasbor web, diperbarui tiap 30 detik");
    harus(`- Tombol Bayar ${DETIK_CERITA} detik, hari, jam, dan dua pembayaran Ani hanya ada di cerita (Ilustrasi).`);
    harus("Kapasitas satu primary belum diukur: `make beban` memberi batas di laptop ([[t5-prd]]).");
    // Mode dibaca dari kode: nama yang ditulis halaman sama dengan konstanta service dan flag di README.
    const mode = cocok(svcT5, /RentanLaporanPrimary = "([\w-]+)"/)[1]!;
    expect(mode).toBe("laporan-primary");
    harus(`Laporan hanya ada bila server dijalankan dengan mode \`-rentan ${mode}\`.`);
    expect(readme).toContain(`\`${mode}\``);
    // Struktur: heading Cek diri tepat tingkat 3 dan satu-satunya heading; noscript menunjuk blok yang memang lebih dulu.
    expect(badan.match(/^#+ .*$/gm)).toEqual(["### Cek diri"]);
    const blokSebenarnya = badan.split('<Blok nama="Yang sebenarnya">')[1]!.split("</Blok>")[0]!;
    expect(blokSebenarnya.match(/<Snippet /g)).toHaveLength(6);
    expect(badan.indexOf('<Blok nama="Yang sebenarnya">')).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
    harus("Rekamannya ada di cuplikan pada blok sebelumnya.");
    expect(prd).toContain("Kapasitas satu server belum pernah diukur.");
    expect(badan.match(/^- /gm)!.length).toBe(10); // enam bullet Yang tidak direkam dan empat bullet Konsep yang lahir
  });
  test("noscript cache, penutup Konsep yang lahir, dan nomor soal Cek diri", () => {
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(noscript).toContain(`Cache ${TTL} detik dengan satu client per warung dan jarak ${C_JARAK[1]} detik menghasilkan ${C_A[2]} hit dari ${2 * WARUNG_LAB}. Dengan dua client per warung dalam satu jendela, hasilnya ${C_K[1]} hit dari ${C_K[5]}.`);
    harus("- [[t5-skema]]: tabel yang lahir di Tahap 5, termasuk `ringkasan_merchant_harian` untuk laporan periode.");
    expect(naskah).toContain("`ringkasan_merchant_harian` (`merchant_akun_id`, `tanggal`, `jumlah_transaksi`, `total`, `diperbarui_pada`; PK `(merchant_akun_id, tanggal)`)");
    harus("Laporan yang dibaca dari primary menambah kerja mesin yang menulis uang. Rekaman membuktikan jalurnya, dan hitungan memperkirakan bebannya.");
    harus("Jawaban atas pertanyaan Wulan, siapa yang melambat bila laporan dan pembayaran membaca database yang sama, bergantung pada angka yang belum diukur.");
    expect(prd).toContain("1. Kalau laporan dan pembayaran membaca database yang sama, siapa yang melambat?");
    const cek = badan.split("### Cek diri")[1]!;
    expect([...cek.matchAll(/\*\*(\d)\.\*\* /g)].map((m) => m[1])).toEqual(["1", "2", "3"]);
  });
});

describe("tinjauan peninjau 5.4: hit rate dihitung, tiga perintah SQL hanya membaca, batas lab dari run.py, teks skenario dan id diagram diturunkan, tanpa kalimat ganda", () => {
  // Isi dibuat saat miss dan berumur TTL; hit tidak memperpanjangnya (cache.go Baca). Satu client memanggil tiap `d` detik.
  const hitRate = (d: number, n = 2000): number => {
    let isi: number | null = null;
    let hit = 0;
    for (let k = 0; k < n; k++) {
      const waktu = k * d;
      if (isi !== null && waktu - isi < TTL - 1e-9) hit++;
      else isi = waktu;
    }
    return hit / n;
  };
  test("hit rate satu client per merchant: tepat satu dari dua di antara TTL/2 dan TTL, lebih banyak di bawah TTL/2, nol pada jarak rekaman", () => {
    expect(hitRate(JARAK)).toBe(0);
    expect(hitRate(TTL)).toBe(0);
    expect(hitRate(29)).toBeCloseTo(0.5, 2);
    expect(hitRate(TTL / 2 + 1)).toBeCloseTo(0.5, 2);
    expect(hitRate(TTL / 2 - 1)).toBeGreaterThan(0.6);
    expect(hitRate(5)).toBeGreaterThan(0.8);
    expect(Number.isInteger(TTL / 2)).toBe(true);
    // Lingkup di halaman, kartu, dan baris riset sama dengan batas yang dihitung; kata "terbaik" tanpa lingkup tidak boleh kembali.
    const lingkup = `di antara ${TTL / 2} dan ${TTL} detik`;
    expect(badan.split(lingkup).length - 1).toBe(2);
    const cek = badan.split("### Cek diri")[1]!;
    expect(cek).toContain(`${lingkup}, paling banyak satu dari dua panggilan berurutan mendapat hit (penalaran).`);
    expect(barisRiset("R5-127")).toContain(`jadi untuk jarak ${lingkup} paling banyak satu hit dari dua panggilan berurutan satu perangkat (penalaran;`);
    expect(riset.match(/jarak 14 detik atau lebih pendek lebih dari satu dari dua/g)).toHaveLength(1);
    expect(`${badan}\n${barisRiset("R5-127")}`).not.toMatch(/hasil terbaik|paling baik satu hit/i);
  });
  test("label turunan Hitungan dan penalaran diberi satu kalimat arti di pemakaian pertamanya di badan halaman", () => {
    const hitungan = "adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman.";
    expect(badan.split(hitungan).length - 1).toBe(1);
    expect(badan.indexOf("Hitungan"), "pemakaian pertama Hitungan ada di kalimat definisinya").toBe(badan.indexOf(hitungan) + "adalah ".length);
    const penalaran = "(penalaran, yaitu kesimpulan dari kode dan angka di halaman, bukan hasil ukuran)";
    expect(badan.split(penalaran).length - 1).toBe(1);
    expect(badan.indexOf("penalaran"), "pemakaian pertama penalaran ada di kalimat definisinya").toBe(badan.indexOf(penalaran) + 1);
  });
  test("tiga perintah SQL: SesiAktif, Akun, dan LaporanHariIni hanya membaca; wajibLogin dan Periksa memanggil satu pemeriksaan sesi", () => {
    const sesi = cocok(repoGo, /func \(r Repo\) SesiAktif\([\s\S]*?\n\}\n/)[0];
    const akun = cocok(repoGo, /func \(r Repo\) Akun\([\s\S]*?\n\}\n/)[0];
    for (const [nama, f] of [["SesiAktif", sesi], ["Akun", akun], ["LaporanHariIni", badanRepo]] as const) {
      expect(f, `${nama} tidak boleh mengubah data`).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b|ExecContext|\.Exec\(|BeginTx|FOR UPDATE/i);
      expect(f.match(/QueryRowContext/g), `${nama}: satu perintah`).toHaveLength(1);
    }
    const wajib = cocok(handlerGo, /func \(s Server\) wajibLogin\([\s\S]*?\n\}\n/)[0];
    expect(wajib.match(/s\.svc\.\w+\(/g)).toEqual(["s.svc.Periksa("]);
    const periksa = cocok(sesiGo, /func \(s Service\) Periksa\([\s\S]*?\n\}\n/)[0];
    expect(periksa.match(/s\.repo\.\w+\(/g)).toEqual(["s.repo.SesiAktif("]);
    harus("laporan hanya membaca dan tidak mengubah apa pun");
  });
  test("run.py menjalankan rekaman dengan batas p95, laju, dan jeda yang sama dengan angka rekaman dan halaman", () => {
    expect(runPy).toContain(`    batas = ${BATAS}\n`);
    expect(BATAS2).toBe(BATAS);
    expect(runPy).toContain(`DETIK, BAYAR_RPS, LAPORAN_RPS = ${DETIK}, ${RPS_BAYAR.toFixed(1)}, ${RPS_LAPORAN.toFixed(1)}`);
    expect(runPy).toContain(`time.sleep(${JARAK.toFixed(1)})`);
    expect(runPy).toContain(`"-laporan-ttl", "${TTL}s"]`);
  });
  test("skenario dan diagram: selisih jarak dan TTL, label komponen Redis, huruf bagian varian, id diagram sama dengan berkas yang diimpor", () => {
    expect(skenario.langkah[4]!.jelas).toContain(`sekitar ${koma(JARAK - TTL, 1)} detik sesudah isi cache kedaluwarsa`);
    expect(skenario.komponen.find((k) => k.id === "rds")!.label).toBe(`Redis: cache laporan ${TTL} detik`);
    const hurufC = cocok(L.baris[lC - 1]!, /^# --- ([A-Z])\. /)[1]!;
    expect(hurufC).toBe("C");
    expect(skenario.sumber.catatan).toContain(`Ubah satu hal: bagian ${hurufC} (kontrol dengan dua client per warung)`);
    const impor = cocok(badan, /import laporanPrimary from "[^"]*\/([\w-]+)\.json";/)[1]!;
    expect(diagramMentah.id).toBe(impor);
    expect(impor).toBe("t5-m40-laporan-primary");
    expect(skenario.predict.q).toContain(`berjarak ${C_JARAK[1]} detik`);
  });
  test("tidak ada kalimat prosa yang muncul dua kali di badan halaman", () => {
    const prosa = badan.split("\n").map((b) => b.trim()).filter((b) => b && !b.startsWith("|") && !b.startsWith("<") && !b.startsWith("import "));
    const kalimat = prosa.flatMap((b) => b.split(/(?<=[.!?])\s+(?=[A-Z*`(])/)).map((s) => s.trim()).filter((s) => s.length > 25);
    expect(kalimat.length).toBeGreaterThan(60);
    expect(kalimat.filter((s, i) => kalimat.indexOf(s) !== i)).toEqual([]);
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "Raka", "Budi", "Ani", "Wulan", "Nadia", "pertama", "kedua", "bukan", "tanpa", "kecuali", "semua", "juga", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "penalaran", "primary", "replica", "cache", "hit", "miss", "TTL", "p95", "CPU", "vCPU", "query", "pembayaran", "laporan", "polling", "database", "lebih", "paling", "bisa", "direkam", "tidak direkam", "dibaca dari kode", "200", "201", "404", "ms", "detik", "merchant", "warung", "perangkat", "lab", "produksi", "naskah", "cerita", "batas atas", "perintah SQL", "GET", "SET", "Bearer", "di atas", "di bawah", "sebanding", "memperpanjang", "kedaluwarsa", "setua", "sesudah tercatat", "paling banyak", "di antara", "berurutan", "yaitu", "bukan hasil ukuran"];
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
  test("tiga kartu t5-m40-1 sampai 3 sama dengan tiga pertanyaan Cek diri di halaman, urut", () => {
    const cek = badan.split("### Cek diri")[1]!;
    const tanya = [...cek.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n/g)].map((m) => m[2]!);
    const jawab = [...cek.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(tanya).toHaveLength(3);
    expect(jawab).toHaveLength(3);
    const k = kartuSemua.filter((x) => x.halaman === "t5-m40");
    expect(k.map((x) => x.id)).toEqual(["t5-m40-1", "t5-m40-2", "t5-m40-3"]);
    expect(k.map((x) => x.tanya)).toEqual(tanya);
    expect(k.map((x) => x.jawab)).toEqual(jawab);
    for (const x of k) expect(x).toMatchObject({ judul: "5.4 M40: Pembayaran melambat saat merchant membuka laporan", url: "tahap-5/m40-pembayaran-melambat/" });
    expect(jawab[1]).toContain(`${rib(BAYAR_N)} dari ${rib(BAYAR_N)} pembayaran 201 dan ${rib(LAPORAN_N)} dari ${rib(LAPORAN_N)} laporan 200`);
    expect(jawab[1]).toContain(`Batas ${rib(BATAS)} ms hanya memeriksa bahwa kedua putaran tidak macet`);
    expect(jawab[2]).toContain(`Rekaman memakai jarak ${C_JARAK[1]} detik, lebih panjang dari TTL ${TTL} detik.`);
    expect(jawab[2]).toContain(`${TTL} + ${INTERVAL} = ${TTL + INTERVAL} detik sesudah tercatat, lebih lambat dari ${PRD_LAYAR[2]} detik di PRD v5.`);
    expect(jawab[0]).toContain("Rekaman bagian A menunjukkan rute laporan hanya ada bersama mode `laporan-primary`.");
  });
});

describe("nilai terkunci terpisah dari kalimat: baris riset, daun diagram dan skenario, sidik, dan profil kata penentu per baris", () => {
  test("lima baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(["R5-125", "R5-126", "R5-127", "R5-128", "R5-129"].map(barisRiset)).toEqual(RISET_TERKUNCI);
    expect(RISET_TERKUNCI).toHaveLength(5);
  });
  test("tiap nilai diagram dan skenario (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(SKENARIO_DAUN);
  });
  test("sidik frontmatter, baris riset, diagram, dan skenario terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(["R5-125", "R5-126", "R5-127", "R5-128", "R5-129"].map((i) => sidik(barisRiset(i)))).toEqual(SIDIK.riset);
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
    expect(SIDIK.snippet).toHaveLength(6);
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
