// Penjaga halaman 5.25 (keputusan 1596 sampai 1598): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim "tidak", "hanya", dan "satu dari empat",
// urutan pemeriksaan gerbang, tabel ADR 56, data widget pilah, diagram Rantai t5-waf-inti.json, kartu Cek diri, dan baris riset di pintu-mitra-waf.mdx.
// Nilai diturunkan dari rekaman labs/t5-waf/output/waf.txt, kuota.txt, tandatangan.txt, testing.txt (kepala dan bagian), kode gerbang (gerbang.go, kuota.go,
// tanda.go, waf.go, main.go, gerbang_tinjau_test.go, tanda_test.go), kode api-t5 (handler_pos.go, handler_idempoten.go, repo/idempoten.go), kode api-t4
// (pembayaran.go), payload.json, crs/waf.conf, README lab, naskah Tahap 5 (tabel ADR 56), registry, halaman tetangga (1.20, 3.17, 4.7, 5.1, 5.24, 5.30),
// dan baris riset R5-230 sampai R5-234, bukan dari daftar yang ditulis sendiri.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// pintu-mitra-waf.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/pintu-mitra-waf.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini merekam delapan payload serangan umum, 37 payload sah, kuota per mitra pada jam
// bucket beku, urutan kunci, kuota, dan tanda tangan, cakupan merchant, dan Idempotency-Key wajib. Replay di dalam jendela hanya Tes Go; QR kedua dari
// key yang diganti dibaca dari kode; laju sungguhan, timeout, TLS di tepi, Redis mati dan galat WAF di jalur penuh, dan serangan volumetrik tidak direkam.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-waf-inti.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, RISET_TERKUNCI, SIDIK } from "./pintu-mitra-waf.halaman.nilai";
import { BADAN_STATIS } from "./pintu-mitra-waf.halaman.badan";

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
const HALAMAN = "situs/src/content/docs/tahap-5/pintu-mitra-waf.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const PILAH_BERKAS = "situs/lama/widgets/data/t5-pintu-pilah.json";
const pilah = JSON.parse(baca(PILAH_BERKAS)) as { judul: string; kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[]; penutup: string };
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const wafRek = baca("labs/t5-waf/output/waf.txt");
const wafBaris = wafRek.split("\n");
const kuotaRek = baca("labs/t5-waf/output/kuota.txt");
const kuotaBaris = kuotaRek.split("\n");
const tandaRek = baca("labs/t5-waf/output/tandatangan.txt");
const tandaBaris = tandaRek.split("\n");
const testingRek = baca("labs/t5-waf/output/testing.txt");
const gerbangGo = baca("labs/t5-waf/gerbang/gerbang.go");
const gerbangBaris = gerbangGo.split("\n");
const kuotaGo = baca("labs/t5-waf/gerbang/kuota.go");
const tandaGo = baca("labs/t5-waf/gerbang/tanda.go");
const tandaBarisGo = tandaGo.split("\n");
const wafGo = baca("labs/t5-waf/gerbang/waf.go");
const mainGo = baca("labs/t5-waf/gerbang/main.go");
const tinjauTest = baca("labs/t5-waf/gerbang/gerbang_tinjau_test.go");
const tinjauBaris = tinjauTest.split("\n");
const tandaTest = baca("labs/t5-waf/gerbang/tanda_test.go");
const gerbangMod = baca("labs/t5-waf/gerbang/go.mod");
const wafConf = baca("labs/t5-waf/crs/waf.conf");
const payload = JSON.parse(baca("labs/t5-waf/payload.json")) as { serangan: { kelas: string; nama: string; metode: string; jalur: string }[] };
const readmeLab = baca("labs/t5-waf/README.md");
const posGo = baca("labs/api-t5/internal/handler/handler_pos.go");
const posBaris = posGo.split("\n");
const idempotenRepo = baca("labs/api-t5/internal/repo/idempoten.go");
const idempotenHandler = baca("labs/api-t5/internal/handler/handler_idempoten.go");
const t4Bayar = baca("labs/api-t4/internal/modul/pembayaran/pembayaran.go");
const t4BayarBaris = t4Bayar.split("\n");
const hal120 = baca("situs/src/content/docs/tahap-1/sql-injection.mdx");
const hal129 = baca("situs/src/content/docs/tahap-1/idor-token-app.mdx");
const hal317 = baca("situs/src/content/docs/tahap-3/rate-limit-redis.mdx");
const hal47 = baca("situs/src/content/docs/tahap-4/webhook-masuk.mdx");
const hal51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal524 = baca("situs/src/content/docs/tahap-5/m50-satu-pos.mdx");
const hal530 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const istilahWaf = JSON.parse(baca("situs/data/halaman-istilah/waf.json")) as IstilahJson;
const istilahNonce = JSON.parse(baca("situs/data/halaman-istilah/nonce.json")) as IstilahJson;
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const glosJson = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; d: string; b: string; s: string; h?: string }[];
interface IstilahJson { istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: unknown; jebakan: string[]; terkait: string[]; sumber: { riset?: string; judul: string; url?: string; rekaman?: string; catatan: string }[] }
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";

interface H { id: string; judul: string; adr?: number[]; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
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
const ribu = (x: number, d = 0): string => {
  const [a, b] = bulat(x, d).toFixed(d).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : "");
};
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;
const barisKe = (baris: string[], pola: RegExp): number => {
  const i = baris.findIndex((b) => pola.test(b));
  if (i < 0) throw new Error(`baris tidak ditemukan: ${pola}`);
  return i + 1; // nomor baris 1-based
};

// --- rekaman: bagian per huruf
const bagian = (baris: string[], huruf: string): string[] => {
  const i = baris.findIndex((b) => new RegExp(`^# --- ${huruf}\\.`).test(b));
  if (i < 0) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  const j = baris.findIndex((b, k) => k > i && /^# --- [A-Z]\./.test(b));
  return baris.slice(i, j < 0 ? baris.length : j);
};
const wA = bagian(wafBaris, "A");
const wB = bagian(wafBaris, "B");
const wC = bagian(wafBaris, "C");
const wD = bagian(wafBaris, "D");
const kA = bagian(kuotaBaris, "A");
const kB = bagian(kuotaBaris, "B");
const kC = bagian(kuotaBaris, "C");
const tA = bagian(tandaBaris, "A");
const tB = bagian(tandaBaris, "B");
const tC = bagian(tandaBaris, "C");
const tD = bagian(tandaBaris, "D");
const tF = bagian(tandaBaris, "F");

// waf.txt
const blokirA = cari(/^diblokir 403: (\d+) dari (\d+)$/m, wA.join("\n"), "ringkasan A");
const BLOKIR = { ok: Number(blokirA[1]), dari: Number(blokirA[2]) };
const ringkasB = cari(/^diuji: (\d+), diblokir WAF: (\d+), diteruskan ke api-t5: (\d+)/m, wB.join("\n"), "ringkasan B");
const SAH = { uji: Number(ringkasB[1]), diblokir: Number(ringkasB[2]), diteruskan: Number(ringkasB[3]) };
const pB = wB.filter((b) => /^P\d+ /.test(b));
const SAH_REF = pB.filter((b) => /^P\d+ referensi \d+ +POST -> 201$/.test(b)).length;
const SAH_TANPA = pB.filter((b) => /^P\d+ tanpa referensi +POST -> 201$/.test(b)).length;
const SAH_GET = pB.filter((b) => /^P\d+ status QR.* +GET /.test(b)).length;
const C101 = cari(/^\$ referensi (\d+) karakter \(tanpa aturan CRS yang cocok\)\n  -> (\d{3}) validasi$/m, wC.join("\n"), "bagian C waf");
const KARAKTER = Number(C101[1]);
const KODE_VALIDASI = C101[2]!;
const dStatus = cari(/^status tanpa blokir: \{201: (\d+), 404: (\d+)\}; tidak ada 403\./m, wD.join("\n"), "bagian D waf");
const KELAS = { sqli: payload.serangan.filter((s) => s.kelas === "sqli").length, xss: payload.serangan.filter((s) => s.kelas === "xss").length, traversal: payload.serangan.filter((s) => s.kelas === "traversal").length };
const dTanpaBlokir = wD.filter((b) => /^S\d\d /.test(b)).length;

// kuota.txt
const mitraBaris = (blok: string[], nama: string): { n: number; ok: number; tolak: number }[] =>
  blok.flatMap((b) => {
    const m = b.match(new RegExp(`^mitra ${nama}: (\\d+) permintaan -> 200: (\\d+), 429: (\\d+)`));
    return m ? [{ n: Number(m[1]), ok: Number(m[2]), tolak: Number(m[3]) }] : [];
  });
const [A, A60, A130] = mitraBaris(kA, "A") as [{ n: number; ok: number; tolak: number }, { n: number; ok: number; tolak: number }, { n: number; ok: number; tolak: number }];
const [B] = mitraBaris(kA, "B") as [{ n: number; ok: number; tolak: number }];
const [A25] = mitraBaris(kB, "A") as [{ n: number; ok: number; tolak: number }];
const [B1] = mitraBaris(kB, "B") as [{ n: number; ok: number; tolak: number }];
const kuota = Number(cari(/kuota (\d+) per detik \(kolom mitra_pos\.kuota_per_detik\)/, kA.join("\n"), "kuota")[1]);
const berjalan = Number(cari(/Permintaan berjalan: batas (\d+) per mitra/, kB.join("\n"), "batas berjalan")[1]);
const isiUlang = cari(/^# Isi ulang menurut jam: (\d+) ms berarti (\d+) token; (\d+) permintaan A -> (\d+) lolos$/m, kA.join("\n"), "isi ulang");
const tahan = cari(/hulu ditahan (\d+),(\d) detik/, kB.join("\n"), "hulu ditahan");
const retryAfter = Number(cari(/\[Retry-After: (\d+)\]/, kA.join("\n"), "Retry-After")[1]);
const semuaC = cari(/^semua permintaan: 200 = (\d+), 429 = (\d+) \(satu bucket (\d+) untuk (\d+) permintaan\)$/m, kC.join("\n"), "bagian C kuota");
const KC = { ok: Number(semuaC[1]), tolak: Number(semuaC[2]), bucket: Number(semuaC[3]), total: Number(semuaC[4]) };
const alasanBerjalan = cari(/alasan: \{'(terlalu-banyak-berjalan)': (\d+)\}/, kB.join("\n"), "alasan berjalan");

// tandatangan.txt
const cmd = (blok: string[], awalan: string): string => {
  const i = blok.findIndex((b) => b.startsWith(`$ ${awalan}`));
  if (i < 0) throw new Error(`rekaman: perintah "${awalan}" tidak ada`);
  return blok[i + 1]!.trim();
};
const mKey = cari(/-> pertama (\d+), kedua (\d+); id QR sama: (ya|tidak); baris qr milik merchant (\d+): (\d+)/, tA.join("\n"), "key sama");
const mTanpa = cari(/\$ dua POST yang sama tanpa Idempotency-Key -> (\d+), (\d+); baris qr milik merchant (\d+): (\d+)/, tA.join("\n"), "tanpa key");
const t401Count = (blok: string[]): number => blok.filter((b) => /^ {2}-> 401 /.test(b)).length;
const nomorBarisQrB = Number(cari(/^baris qr milik merchant B sesudah semua percobaan A: (\d+)/m, tC.join("\n"), "baris qr B")[1]);
const tC404 = tC.slice(0, tC.findIndex((b) => b.startsWith("# Mode rentan pos-tanpa-cakupan"))).filter((b) => /^ {2}-> 404 /.test(b)).length;
const tD429 = cari(/\$ kunci tebakan ke-6\n {2}-> 429 terlalu-banyak-percobaan-kunci {2}\[Retry-After: (\d+)\]/, tD.join("\n"), "tebakan 6");
const tD11 = cari(/-> 201: (\d+), lalu 429 rate-limit-akun \(batas (\d+) QR per menit per akun di api-t5/, tD.join("\n"), "11 POST");
const tebakan401 = tD.filter((b) => /^ {2}-> 401 kunci-tidak-sah$/.test(b)).length;
const tFkol = cari(/-> id: (\w+), nama: (\w+), kunci_hash: (\w+), status: (\w+), kuota_per_detik: (\w+), dibuat: (\w+)$/m, tF.join("\n"), "kolom hak");
const tFkolomYa = tFkol.slice(1, 7).filter((x) => x === "ya").length;
const tFdml = cari(/-> INSERT: (\w+), UPDATE: (\w+), DELETE: (\w+)$/m, tF.join("\n"), "hak DML");
const tFlain = [...cari(/^ {2}-> (t5_merchant\.qr: .*)$/m, tF.join("\n"), "tabel lain")[1]!.matchAll(/([a-z_0-9.]+): (\w+)/g)].map((m) => m[2]!);
const versi = {
  pg: cari(/PostgreSQL (\d+\.\d+)/, kuotaBaris[1]!, "PostgreSQL")[1]!,
  go: cari(/go(\d+\.\d+\.\d+)/, kuotaBaris[1]!, "go")[1]!,
  redis: cari(/Redis (\d+\.\d+\.\d+)/, kuotaBaris[1]!, "Redis")[1]!,
  coraza: cari(/Coraza (v\d+\.\d+\.\d+)/, kuotaBaris[1]!, "Coraza")[1]!,
  crs: cari(/OWASP CRS (v\d+\.\d+\.\d+)/, kuotaBaris[1]!, "CRS")[1]!,
};

// --- kode gerbang
const fungsiAkhir = (baris: string[], mulai: number, tutup: string): number => {
  for (let i = mulai; i < baris.length; i++) if (baris[i] === tutup) return i + 1;
  throw new Error("akhir blok tidak ditemukan");
};
const RENTANG = {
  wafAkhir: { awal: barisKe(wafBaris, /^\$ S07 naik direktori di query$/), akhir: barisKe(wafBaris, /^diblokir 403: \d+ dari \d+$/) },
  wafSah: { awal: barisKe(wafBaris, /^diuji: \d+, diblokir WAF: /), akhir: barisKe(wafBaris, /^Lingkup: /) },
  kuotaA: { awal: barisKe(kuotaBaris, /^mitra A: \d+ permintaan -> /), akhir: barisKe(kuotaBaris, /^mitra B: \d+ permintaan -> /) },
  tanda: { awal: barisKe(tandaBarisGo, /^func TandaTangan\(/), akhir: fungsiAkhir(tandaBarisGo, barisKe(tandaBarisGo, /^func TandaTangan\(/), "}") },
  waktu: { awal: barisKe(tandaBaris, /^\$ GET status QR, timestamp 240 detik lalu/), akhir: barisKe(tandaBaris, /^\$ GET status QR, timestamp 360 detik ke depan/) + 1 },
  putar: { awal: barisKe(tinjauBaris, /^func TestGerbangPutarUlangDalamJendelaDiterima\(/), akhir: fungsiAkhir(tinjauBaris, barisKe(tinjauBaris, /^func TestGerbangPutarUlangDalamJendelaDiterima\(/), "}") },
  cakupanKode: { awal: barisKe(posBaris, /^\t\tmerchant, ok := idDariPath\(r\)$/), akhir: fungsiAkhir(posBaris, barisKe(posBaris, /^\t\tif s\.rentan != service\.RentanPosTanpaCakupan \{$/), "\t\t}") },
  cakupanRek: { awal: barisKe(tandaBaris, /^\$ A membaca QR sendiri$/), akhir: barisKe(tandaBaris, /^\$ A mengirim kepala X-Mitra-Id milik B/) + 1 },
  keyWajib: { awal: barisKe(tandaBaris, /^\$ POST tanpa Idempotency-Key$/), akhir: barisKe(tandaBaris, /^ {2}-> 422 idempotency-key-dipakai-ulang$/) },
  kuotaGerbang: { awal: barisKe(gerbangBaris, /^\t\tput, err := g\.Batas\.Masuk\(ctx, kuncikuota, mitra\.KuotaPerDetik\)$|^\tput, err := g\.Batas\.Masuk\(ctx, kuncikuota, mitra\.KuotaPerDetik\)$/), akhir: 0 },
};
RENTANG.kuotaGerbang.akhir = fungsiAkhir(gerbangBaris, barisKe(gerbangBaris, /^\tif !put\.Boleh \{$/), "\t}");
const tag = (k: keyof typeof RENTANG): string => `${RENTANG[k].awal}:${RENTANG[k].akhir}`;
interface TagSnippet { file: string; lines: string; lang: string; title: string }
const tagSnippet: TagSnippet[] = [...badan.matchAll(/<Snippet file="([^"]+)" lines="([^"]+)"(?: lang="([^"]+)")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, lines: m[2]!, lang: m[3] ?? "text", title: m[4]! }));
const URUTAN_SNIPPET: { kunci: keyof typeof RENTANG; berkas: string; lang: string }[] = [
  { kunci: "wafAkhir", berkas: "labs/t5-waf/output/waf.txt", lang: "text" },
  { kunci: "wafSah", berkas: "labs/t5-waf/output/waf.txt", lang: "text" },
  { kunci: "kuotaA", berkas: "labs/t5-waf/output/kuota.txt", lang: "text" },
  { kunci: "tanda", berkas: "labs/t5-waf/gerbang/tanda.go", lang: "go" },
  { kunci: "waktu", berkas: "labs/t5-waf/output/tandatangan.txt", lang: "text" },
  { kunci: "putar", berkas: "labs/t5-waf/gerbang/gerbang_tinjau_test.go", lang: "go" },
  { kunci: "cakupanKode", berkas: "labs/api-t5/internal/handler/handler_pos.go", lang: "go" },
  { kunci: "cakupanRek", berkas: "labs/t5-waf/output/tandatangan.txt", lang: "text" },
  { kunci: "keyWajib", berkas: "labs/t5-waf/output/tandatangan.txt", lang: "text" },
  { kunci: "kuotaGerbang", berkas: "labs/t5-waf/gerbang/gerbang.go", lang: "go" },
];

// --- registry dan naskah
const asumsi5 = registry.tahap[4]!.asumsi as unknown as { user: number; aktif: number; req: number; puncak: number };
const puncakRps = (((asumsi5.user * asumsi5.aktif) / 100) * asumsi5.req) / 86400 * asumsi5.puncak;
const puncakTulis = ribu(puncakRps, 1);
const MITRA = 50; // ±50 penyedia POS (Asumsi PRD v5)
const KUOTA = kuota;
const TOTAL_KUOTA = MITRA * KUOTA;
const KALI = koma(TOTAL_KUOTA / angka(puncakTulis), 1);
const TOLERANSI = Number(cari(/toleransi := flag\.Duration\("toleransi", (\d+)\*time\.Minute/, mainGo, "toleransi")[1]) * 60;
const NAPAS = Number(cari(/Napas: (\d+) \* time\.Second/, kuotaGo, "Napas")[1]);
const GAGAL_MAKS = Number(cari(/flag\.Int64\("gagal-maks", (\d+),/, mainGo, "gagal-maks")[1]);
const JENDELA_GAGAL = Number(cari(/JendelaGl: (\d+) \* time\.Second/, kuotaGo, "JendelaGl")[1]);
const BERJALAN_KODE = Number(cari(/flag\.Int\("berjalan", (\d+),/, mainGo, "berjalan")[1]);
const MAKS_BODY = Number(cari(/flag\.Int64\("maks-body", (\d+),/, mainGo, "maks-body")[1]);
const KIB = MAKS_BODY / 1024;
const NONCE_DETIK = 2 * TOLERANSI;
const NONCE_PER_MITRA = KUOTA * NONCE_DETIK;
const NONCE_SEMUA = MITRA * NONCE_PER_MITRA;
const DETIK_BERJALAN = koma(berjalan / KUOTA, 1);
const barisADR56 = naskah.split("\n").find((b) => b.startsWith("| 56 |")) ?? "";
const kolomADR56 = pecahBaris(barisADR56);
const ADR56 = String(dari("t5-waf").adr![0]);
const ADR27 = cari(/ADR (\d+)/, dari("t3-rate-limit-redis").judul, "ADR 27")[1]!;
const ADR34 = cari(/ADR (\d+)/, dari("t4-webhook").judul, "ADR 34")[1]!;
const ADR4 = "4";
const ADR41 = cari(/ADR (\d+)/, dari("t4-ssrf").judul, "ADR 41")[1]!;

describe("rekaman waf.txt, kuota.txt, tandatangan.txt, dan testing.txt: diturunkan dari berkas", () => {
  test("waf.txt bagian A dan B: 8 dari 8 payload serangan diblokir 403, 37 payload sah lolos, 34 hanya mengubah referensi, 1 tanpa referensi, 2 GET", () => {
    expect(BLOKIR).toEqual({ ok: 8, dari: 8 });
    expect(payload.serangan).toHaveLength(BLOKIR.dari);
    expect(KELAS).toEqual({ sqli: 3, xss: 3, traversal: 2 });
    expect(wA.filter((b) => /^ {2}-> 403 diblokir-waf /.test(b))).toHaveLength(BLOKIR.ok);
    expect(wA.join("\n")).toContain("Tiap payload dikirim dengan kunci API dan tanda tangan yang SAH");
    expect(SAH).toEqual({ uji: 37, diblokir: 0, diteruskan: 37 });
    expect([SAH_REF, SAH_TANPA, SAH_GET]).toEqual([34, 1, 2]);
    expect(SAH_REF + SAH_TANPA + SAH_GET).toBe(SAH.uji);
    expect(pB).toHaveLength(SAH.uji);
    expect(wB.join("\n")).toContain("Ini bukan ukuran false positive untuk payload POS mana pun di luar daftar itu.");
    expect(readmeLab).toContain("34 dari 37 hanya mengubah teks `referensi` (satu field, JSON)");
  });
  test("waf.txt bagian C dan D: referensi 101 karakter lolos WAF dan dijawab 400 api-t5, mode waf-deteksi tidak memblokir satu pun dan tidak ada 403", () => {
    expect(KARAKTER).toBe(101);
    expect(KODE_VALIDASI).toBe("400");
    expect(readmeLab).toContain("referensi 101 karakter lolos WAF dan ditolak api-t5 (400)");
    expect(posGo).toContain("utf8.RuneCountInString(*in.Referensi) > 100");
    expect(dTanpaBlokir).toBe(BLOKIR.dari);
    expect([Number(dStatus[1]), Number(dStatus[2])]).toEqual([4, 4]);
    expect(Number(dStatus[1]) + Number(dStatus[2])).toBe(dTanpaBlokir);
    expect(wD.join("\n")).toContain("status tanpa blokir: {201: 4, 404: 4}; tidak ada 403.");
    expect(wafGo).toContain('mesin != "On" && mesin != "DetectionOnly"');
    expect(wafGo.replace(/\n\/\/ /g, " ")).toContain("juga pada mesin DetectionOnly: dari sana terbaca apa yang AKAN diblokir bila mesinnya On");
  });
  test("kuota.txt bagian A: A 600 permintaan 100 lolos 500 429, B 20 dari 20, isi ulang 500 ms = 50 token, kapasitas tidak terlampaui, Retry-After 1, jam beku", () => {
    expect([A.n, A.ok, A.tolak]).toEqual([600, 100, 500]);
    expect([B.n, B.ok, B.tolak]).toEqual([20, 20, 0]);
    expect(kuota).toBe(100);
    expect(A.ok).toBe(kuota);
    expect([A60.n, A60.ok, A60.tolak]).toEqual([60, 50, 10]);
    expect([Number(isiUlang[1]), Number(isiUlang[2]), Number(isiUlang[3]), Number(isiUlang[4])]).toEqual([500, 50, 60, 50]);
    expect(Number(isiUlang[2])).toBe((Number(isiUlang[1]) / 1000) * kuota);
    expect([A130.n, A130.ok, A130.tolak]).toEqual([130, 100, 30]);
    expect(kA.join("\n")).toContain("# Sesudah 10 detik bucket tidak melebihi kapasitas: 130 permintaan A -> 100 lolos");
    expect(retryAfter).toBe(1);
    expect(kA.join("\n")).toContain(`Jam bucket dibekukan: ${A.n} permintaan di bawah dihitung dalam SATU detik. Laju sungguhan mesin ini tidak diukur.`);
  });
  test("kuota.txt bagian B dan C: 25 permintaan bersamaan 20 lolos 5 429 terlalu-banyak-berjalan, B 1 permintaan 200, hulu ditahan 1,5 detik; satu bucket 100 untuk 620: 520 429", () => {
    expect([A25.n, A25.ok, A25.tolak]).toEqual([25, 20, 5]);
    expect(A25.ok).toBe(berjalan);
    expect(Number(alasanBerjalan[2])).toBe(A25.tolak);
    expect(berjalan).toBe(20);
    expect([B1.n, B1.ok, B1.tolak]).toEqual([1, 1, 0]);
    expect([tahan[1], tahan[2]]).toEqual(["1", "5"]);
    expect(KC).toEqual({ ok: 100, tolak: 520, bucket: 100, total: 620 });
    expect(KC.total).toBe(A.n + B.n);
    expect(kuotaRek).toContain("Serangan volumetrik lapisan 3 dan 4 (banjir paket, SYN flood): Tidak dijalankan. Lab ini hanya menguji pertahanan lapisan 7 di gerbang.");
  });
  test("tandatangan.txt bagian A: tanpa key 400, key sama dua kali satu QR, isi lain 422, mode rentan dua QR", () => {
    expect(cmd(tA, "POST tanpa Idempotency-Key")).toBe("-> 400 idempotency-key-wajib");
    expect([mKey[1], mKey[2], mKey[3], mKey[5]]).toEqual(["201", "201", "ya", "1"]);
    expect(cmd(tA, "key yang sama dengan isi lain")).toBe("-> 422 idempotency-key-dipakai-ulang");
    expect([mTanpa[1], mTanpa[2], mTanpa[4]]).toEqual(["201", "201", "2"]);
    expect(tA.join("\n")).toContain("# Mode rentan tanpa-idempoten-wajib (Idempotency-Key opsional seperti Tahap 4): kasir yang mengulang membuat dua QR");
  });
  test("tandatangan.txt bagian B: toleransi 5 menit, 240 detik lolos, 360 detik dua arah 401, rahasia salah, isi diubah, kunci tak dikenal dan mitra dibekukan 401", () => {
    expect(tB.join("\n")).toContain("(toleransi 5 menit, Asumsi: sama dengan ADR 34)");
    expect(TOLERANSI).toBe(300);
    expect(cmd(tB, "GET status QR, timestamp 240 detik lalu, ditandatangani ulang")).toBe("-> 404 tidak-ditemukan");
    expect(cmd(tB, "GET status QR, timestamp 360 detik lalu, ditandatangani ulang")).toBe("-> 401 waktu-di-luar-toleransi");
    expect(cmd(tB, "GET status QR, timestamp 360 detik ke depan")).toBe("-> 401 waktu-di-luar-toleransi");
    expect(cmd(tB, "permintaan sah yang direkam 360 detik lalu dan diputar ulang apa adanya")).toBe("-> 401 waktu-di-luar-toleransi");
    expect(cmd(tB, "GET status QR, rahasia penandatangan salah")).toBe("-> 401 tanda-tangan-salah");
    expect(cmd(tB, "POST yang nominalnya diubah sesudah ditandatangani (25.000 jadi 99.000)")).toBe("-> 401 tanda-tangan-salah");
    expect(cmd(tB, "kunci API yang tidak dikenal")).toBe("-> 401 kunci-tidak-sah");
    expect(cmd(tB, "kunci mitra A sesudah mitra_pos.status = dibekukan")).toBe("-> 401 kunci-tidak-sah");
    expect(t401Count(tB)).toBe(8);
  });
  test("tandatangan.txt bagian C dan D: cakupan 404 lima kali, baris qr B tetap 1, mode rentan 200, bukan-dari-gerbang 401; lima kunci salah lalu 429, 10 QR per menit per akun", () => {
    expect(tC404).toBe(5);
    expect(nomorBarisQrB).toBe(1);
    expect(cmd(tC, "langsung ke api-t5 tanpa lewat gerbang (tanpa rahasia gerbang)")).toBe("-> 401 bukan-dari-gerbang");
    expect(cmd(tC, "A mengirim kepala X-Mitra-Id milik B dan rahasia gerbang (kepala identitas dibuang gerbang)")).toBe("-> 404 tidak-ditemukan");
    const rentan = tC.slice(tC.findIndex((b) => b.startsWith("# Mode rentan pos-tanpa-cakupan")));
    expect(cmd(rentan, "A membaca QR milik B lewat alamat merchant B")).toBe("-> 200");
    expect(rentan.join("\n")).toContain('"nominal":30000');
    expect(tebakan401).toBe(GAGAL_MAKS);
    expect(Number(tD429[1])).toBe(JENDELA_GAGAL);
    expect(cmd(tD, "kunci mitra A yang sah dari alamat yang sama (tidak ikut terhalang)")).toBe("-> 404 tidak-ditemukan");
    expect([Number(tD11[1]), Number(tD11[2])]).toEqual([10, 10]);
  });
  test("tandatangan.txt bagian F: role gerbang hanya SELECT atas lima dari enam kolom mitra_pos, tanpa INSERT UPDATE DELETE, tanpa SELECT atas enam tabel lain", () => {
    expect(tFkol.slice(1, 7)).toEqual(["ya", "ya", "ya", "ya", "ya", "tidak"]);
    expect(tFkolomYa).toBe(5);
    expect(tFkol.slice(1, 7)).toHaveLength(6);
    expect(tFdml.slice(1, 4)).toEqual(["tidak", "tidak", "tidak"]);
    expect(tFlain).toHaveLength(6);
    expect(tFlain.every((x) => x === "tidak")).toBe(true);
    expect(tF.join("\n")).toContain("api-t5 memakai role t5_app.");
  });
  test("testing.txt: tes Go yang dikutip halaman semuanya PASS", () => {
    for (const t of [
      "TestGerbangPutarUlangDalamJendelaDiterima", "TestGerbangKuotaSebelumTandaTangan", "TestPembatasSlotBocorSembuhHanyaSesudahSepi", "TestGerbangWAFGagalTertutup",
      "TestCorazaWrapHandlerBawaanGalatMenjawab200Kosong", "TestPeriksaTandaTimestampJauhDiDepan", "TestGerbangRedisMati", "TestPeriksaTandaMemakaiHmacEqual", "TestGerbangRuteDanBatasBody",
    ]) expect(testingRek, t).toContain(`--- PASS: ${t}\n`);
    expect(hitungKali(testingRek, "--- FAIL")).toBe(1); // satu-satunya FAIL adalah bagian C: tes sengaja gagal tanpa Redis
    expect(testingRek).toContain("TES_REDIS_WAJIB=1 tetapi TEST_REDIS_ADDR kosong");
  });
  test("kepala rekaman: versi PostgreSQL, Go, Redis, Coraza, dan CRS sama dengan halaman, go.mod, dan README", () => {
    expect(versi).toEqual({ pg: "17.11", go: "1.27.3", redis: "8.10.2", coraza: "v3.8.1", crs: "v4.30.0" });
    expect(gerbangMod).toContain(`github.com/corazawaf/coraza/v3 ${versi.coraza}`);
    expect(readmeLab).toContain(`OWASP CRS | ${versi.crs}`);
    expect(wafConf).toContain("blocking_paranoia_level=1");
    expect(wafConf).toContain("inbound_anomaly_score_threshold=5");
    expect(wafConf).toContain('status:400,msg:\'Failed to parse request body.\'');
  });
});

describe("kode gerbang, api-t5, dan api-t4: urutan pemeriksaan, status, batas, dan satu dari empat jawaban 401", () => {
  test("urutan di ServeHTTP: body, WAF, rute, pencarian kunci, kunciGagal, kuota, tanda tangan, Idempotency-Key, lalu diteruskan", () => {
    const u = [
      "io.ReadAll(http.MaxBytesReader(w, r.Body, g.MaksBody))", "g.WAF.Periksa(r, isi)", "strings.HasPrefix(r.URL.Path, AwalanPOS)", "g.cari(ctx, kunci)", "g.kunciGagal(ctx, w, ip)",
      "g.Batas.Masuk(ctx, kuncikuota, mitra.KuotaPerDetik)", "PeriksaTanda(rahasia, g.Sekarang()", 'metodeUbah(r.Method) && !g.Rentan[RentanTanpaWajibKey]', "g.proxy.ServeHTTP(w, r)",
    ].map((x) => gerbangGo.indexOf(x));
    expect(u.every((x) => x > 0)).toBe(true);
    expect([...u].sort((a, b) => a - b)).toEqual(u);
    expect(gerbangGo).toContain("Kuota ada SEBELUM tanda tangan: mitra yang membanjiri gerbang dibatasi\n// sebelum gerbang menghitung HMAC untuk tiap permintaannya");
    expect(testingRek).toContain("--- PASS: TestGerbangKuotaSebelumTandaTangan");
    // pencarian kunci ke PostgreSQL ada di cari(), yang kembali lebih awal hanya untuk kunci kosong; kunciGagal baru membaca penghitung Redis
    expect(gerbangGo).toContain('if strings.TrimSpace(kunci) == "" {\n\t\treturn Mitra{}, false, nil\n\t}\n\treturn g.Toko.CariKunci(ctx, SidikKunci(kunci))');
    expect(mainGo).toContain("SELECT id, nama, status, kuota_per_detik FROM mitra_pos WHERE kunci_hash = $1");
    expect(gerbangGo.indexOf("n, err := g.Batas.SudahGagal(ctx, ip)")).toBeGreaterThan(gerbangGo.indexOf("func (g *Gerbang) kunciGagal("));
  });
  test("status penolakan di tabel pemeriksaan: 413, 403 atau 400 JSON rusak, 404, 401 dan 429 kunci, 429 kuota, 401 tanda tangan, 400 Idempotency-Key, 404 cakupan", () => {
    expect(gerbangGo).toContain('tolak(w, 413, "body-terlalu-besar"');
    expect(gerbangGo).toContain('tolak(w, k.Status, "diblokir-waf"');
    expect(wafGo).toContain("k.Status = http.StatusForbidden");
    expect(wafConf).toContain("status:400");
    expect(gerbangGo).toContain('tolak(w, 503, "waf-gagal"');
    expect(gerbangGo).toContain('tolak(w, 404, "tidak-ditemukan", "Alamat tidak dikenal")');
    expect(gerbangGo).toContain('tolak(w, 401, "kunci-tidak-sah"');
    expect(gerbangGo).toContain('tolak(w, 429, "terlalu-banyak-percobaan-kunci"');
    expect(gerbangGo).toContain("tolak(w, 429, put.Alasan,");
    expect(gerbangGo).toContain('tolak(w, 401, "waktu-di-luar-toleransi"');
    expect(gerbangGo).toContain('tolak(w, 400, "idempotency-key-wajib"');
    expect(gerbangGo).toContain('AwalanPOS            = "/pos/v1/"');
    expect(kuotaGo).toContain('AlasanLaju     = "kuota-terlampaui"');
    expect(kuotaGo).toContain('AlasanBerjalan = "terlalu-banyak-berjalan"');
    expect(posGo).toContain('tidakDitemukan(w, "Merchant")');
    expect(metodeUbahKode()).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
    function metodeUbahKode(): string[] {
      const m = cari(/func metodeUbah\(m string\) bool \{\n\treturn (.+)\n\}/, gerbangGo, "metodeUbah")[1]!;
      return [...m.matchAll(/http\.Method(\w+)/g)].map((x) => x[1]!.toUpperCase());
    }
  });
  test("batas di kode: 64 KiB, 20 berjalan, 5 kegagalan per 60 detik, toleransi 5 menit, masa berlaku penghitung 10 detik, kapasitas bucket sama dengan laju, timeout 3 detik", () => {
    expect([MAKS_BODY, KIB]).toEqual([65536, 64]);
    expect(BERJALAN_KODE).toBe(berjalan);
    expect([GAGAL_MAKS, JENDELA_GAGAL, TOLERANSI, NAPAS]).toEqual([5, 60, 300, 10]);
    expect(kuotaGo).toContain("skripBucket.Run(ctx, p.rdb, []string{p.Awalan + \"bucket:\" + kunci}, ms, perDetik, perDetik)");
    expect(mainGo).toContain("ReadHeaderTimeout: 3 * time.Second, ReadTimeout: 3 * time.Second");
    expect(gerbangGo).toContain("ResponseHeaderTimeout: 3 * time.Second");
    expect(readmeLab).toContain("Timeout 3 detik tidak direkam.");
    expect(readmeLab).toContain("timeout tidak direkam sebagai perilaku (Tidak dijalankan)");
  });
  test("satu dari empat tempat yang menjawab 401 memasang WWW-Authenticate, yaitu kunci-tidak-sah; tiga lainnya tidak (RFC 9110 11.6.1)", () => {
    const tempat401 = gerbangBaris.flatMap((b, i) => (/tolak\(w, 401,/.test(b) ? [i] : []));
    expect(tempat401).toHaveLength(4);
    const dengan = tempat401.filter((i) => /WWW-Authenticate/.test(gerbangBaris[i - 1]!));
    expect(dengan).toHaveLength(1);
    expect(gerbangBaris[dengan[0]!]).toContain('"kunci-tidak-sah"');
    expect(hitungKali(gerbangGo, "WWW-Authenticate")).toBe(1);
    expect(tempat401.map((i) => gerbangBaris[i]!.match(/"(tanda-tangan-salah|waktu-di-luar-toleransi|kunci-tidak-sah)"/)![1])).toEqual(["tanda-tangan-salah", "waktu-di-luar-toleransi", "tanda-tangan-salah", "kunci-tidak-sah"]);
    const r232 = barisRiset("R5-232");
    expect(r232).toContain("A server generating a 401 (Unauthorized) response MUST send a WWW- Authenticate header field containing at least one challenge.".replace("WWW- ", "WWW-"));
    expect(r232).toContain("bagian 11.6.1");
  });
  test("tanda.go: HMAC atas timestamp, method, alamat, dan byte mentah; hmac.Equal; penjaga jenuh Sub; tanda tangan tidak memuat header atau nonce", () => {
    expect(tandaGo).toContain('fmt.Fprintf(m, "%d.%s.%s.", ts, method, uri)');
    expect(tandaGo).toContain("m.Write(body)");
    expect(tandaGo).toContain("hmac.Equal(hitung, diterima)");
    expect(tandaGo).toContain("selisih := sekarang.Sub(time.Unix(ts, 0))");
    expect(tandaGo).toContain("if selisih == math.MinInt64 { // Sub jenuh di -292 tahun untuk timestamp yang lebih jauh di depan, dan -MinInt64 meluap ke dirinya sendiri");
    expect(tandaGo).not.toMatch(/nonce/i);
    expect(tandaGo).not.toMatch(/Header/);
    expect(tandaTest).toContain("for _, ts := range []int64{1 << 40, 1 << 62, 253402300800, math.MaxInt64, math.MinInt64, sekarangTes.Unix() + 300*365*24*3600} {");
    expect(6).toBe(tandaTest.match(/for _, ts := range \[\]int64\{([^}]+)\}/)![1]!.split(",").length);
    expect(readmeLab).toContain("Header tidak tercakup, termasuk `Idempotency-Key`, `Content-Type`, dan `Host`. Tidak ada nonce atau catatan permintaan yang sudah dipakai");
    expect(readmeLab).toContain("TLS di tepi Tidak dijalankan di lab ini.");
    expect(readmeLab).toContain("**Tanda tangan memuat method dan alamat.**");
  });
  test("api-t4 pembayaran.go baris 132 sampai 138: pola Sub tanpa penjaga jenuh, dan tidak diubah", () => {
    const potongan = t4BayarBaris.slice(131, 138);
    expect(potongan).toEqual([
      "\tselisih := s.kini().Sub(time.Unix(ts, 0))",
      "\tif selisih < 0 {",
      "\t\tselisih = -selisih",
      "\t}",
      "\tif selisih > ToleransiWebhook {",
      "\t\treturn ErrTandaTangan",
      "\t}",
    ]);
    expect(t4Bayar).not.toContain("math.MinInt64");
    expect(t4Bayar).toContain("func (s *Service) PeriksaTandaTangan(");
  });
  test("tes putar ulang: tiga POST sama diterima, key yang diganti sampai ke hulu; Idempotency-Key api-t5 diklaim lewat ON CONFLICT (kunci)", () => {
    const fungsi = tinjauBaris.slice(RENTANG.putar.awal - 1, RENTANG.putar.akhir).join("\n");
    expect(hitungKali(fungsi, "l.kirim(")).toBe(3);
    expect(hitungKali(fungsi, 'l.harus(')).toBe(3);
    expect(fungsi).toContain("l.harus(l.kirim(kunciA, rahasiaA, \"POST\", uriQR, isi), 200, \"\") // putar ulang persis sama");
    expect(fungsi).toContain('r.Header.Set("Idempotency-Key", `"11111111-1111-4111-8111-111111111111"`) // kepala yang tidak ditandatangani, diganti');
    expect(fungsi).toContain('h.Get("Idempotency-Key") != `"11111111-1111-4111-8111-111111111111"`');
    expect(idempotenRepo).toContain("ON CONFLICT (kunci) DO UPDATE");
    expect(idempotenHandler).toContain("s.svc.KlaimKunci(r.Context(), kunci, akun, sidikJari(r.Method, r.URL.Path, isi))");
    expect(posGo).toContain('mux.HandleFunc("POST /pos/v1/merchant/{id}/qr", s.wajibMitra(s.idempoten(s.posBuatQR)))');
  });
  test("cakupan: api-t5 membandingkan mitra dari gerbang dengan merchant di alamat; gerbang membuang kepala identitas client dan memasang yang ia buat", () => {
    expect(posGo).toContain("milik, err := s.svc.MerchantMilikMitra(r.Context(), merchant, mitra)");
    expect(posGo).toContain("if s.rentan != service.RentanPosTanpaCakupan {");
    expect(baca("labs/api-t5/internal/service/pos.go")).toContain("akun.mitra_pos_id sama dengan mitra");
    expect(baca("labs/api-t5/internal/repo/pos.go")).toContain("SELECT mitra_pos_id, jenis FROM akun WHERE id = $1");
    expect(gerbangGo).toContain("for _, h := range []string{HeaderMitra, HeaderRahasiaGerbang, HeaderKunci, HeaderTanda, HeaderWaktu} {\n\t\tr.Header.Del(h)\n\t}");
    expect(gerbangGo).toContain("r.Header.Set(HeaderMitra, strconv.FormatInt(mitra.ID, 10))");
    expect(gerbangGo).toContain("r.Header.Set(HeaderRahasiaGerbang, g.RahasiaHulu)");
    expect(gerbangGo).toContain('HeaderMitra         = "X-Mitra-Id"'.replace("HeaderMitra         ", "HeaderMitra          "));
    expect(gerbangGo).toContain('HeaderRahasiaGerbang = "X-Gerbang-Rahasia"');
    expect(readmeLab).toContain("Cakupan dicek di api-t5, bukan di gerbang");
    expect(readmeLab).toContain("Merchant milik mitra lain, merchant yang tidak ada, dan akun yang bukan merchant dijawab 404 yang sama (pola ADR 7)");
  });
  test("WAF: middleware sendiri menjawab 503 dan tidak meniru WrapHandler bawaan Coraza; kode Coraza dibaca ke baris 139 sampai 141 di riset", () => {
    expect(gerbangGo).toContain('tolak(w, 503, "waf-gagal", "Pemeriksaan permintaan tidak bisa dijalankan")');
    expect(gerbangGo).toContain("// gagal tertutup: WAF yang tidak bisa memeriksa tidak boleh meloloskan");
    expect(wafGo).toContain("client menerima 200 kosong dan mengira permintaannya\n// berhasil. Gerbang ini sengaja tidak meniru itu.");
    expect(testingRek).toContain("--- PASS: TestGerbangWAFGagalTertutup");
    const r = barisRiset("R5-230");
    expect(r).toContain("baris 139 sampai 141: `if it, err := processRequest(tx, r); err != nil {`");
    expect(r).toContain('Msg("Failed to process request")');
    expect(r).toContain("`return`");
    expect(readmeLab).toContain("(`WrapHandler` di `http/middleware.go`, baris 139 sampai 141)");
    expect(readmeLab).toContain("client menerima 200 kosong");
  });
});

describe("hitungan, naskah ADR 56, registry, dan halaman tetangga", () => {
  test("hitungan kuota: 50 × 100 = 5.000, 5.000 ÷ 1.388,9 = 3,6; 20 ÷ 100 = 0,2; 2 × 300 = 600; 100 × 600 = 60.000; 50 × 60.000 = 3.000.000; 34 + 1 + 2 = 37", () => {
    expect(puncakTulis).toBe("1.388,9");
    expect(TOTAL_KUOTA).toBe(5000);
    expect(KALI).toBe("3,6");
    expect(TOTAL_KUOTA / angka(puncakTulis)).toBeGreaterThan(3.5999);
    expect(TOTAL_KUOTA / angka(puncakTulis)).toBeLessThan(3.6);
    expect(DETIK_BERJALAN).toBe("0,2");
    expect([NONCE_DETIK, NONCE_PER_MITRA, NONCE_SEMUA]).toEqual([600, 60000, 3000000]);
    expect(SAH_REF + SAH_TANPA + SAH_GET).toBe(37);
    expect(naskah).toContain(`jumlah kuota melebihi kapasitas terukur: 50 mitra × 100 per detik = 5.000 per detik, 3,6 kali puncak 1.388,9`.replace("jumlah", "Jumlah"));
    expect(barisRiset("R5-234")).toContain("50 × 100 = 5.000; 5.000 ÷ 1.388,9 = 3,59997 = 3,6; 20 ÷ 100 = 0,2; 2 × 300 = 600; 100 × 600 = 60.000; 50 × 60.000 = 3.000.000; 34 + 1 + 2 = 37");
  });
  test("naskah ADR 56: keputusan, opsi yang ditimbang, dan kapan salah dibaca dari baris tabel; peta halaman dan peran", () => {
    expect(kolomADR56).toHaveLength(5);
    expect(kolomADR56[1]).toContain("WAF Coraza v3.8.1 dengan OWASP CRS v4.30.0 mode blokir");
    expect(kolomADR56[1]).toContain("token bucket di Redis, ADR 27; 100 per detik dan 20 berjalan per mitra, Asumsi");
    expect(kolomADR56[1]).toContain("kunci API per mitra (`mitra_pos.kunci_hash`) ditambah HMAC-SHA256 atas byte mentah bertimestamp (pola ADR 34)");
    expect(kolomADR56[1]).toContain("Idempotency-Key wajib untuk POST yang membuat QR atau mengubah keadaan (tolak 400 tanpa key)");
    expect(kolomADR56[1]).toContain("Serangan volumetrik di lapisan 3 dan 4 dilimpahkan ke penyedia jaringan: Ilustrasi");
    for (const o of ["WAF saja (ditolak", "blokir IP mitra (ditolak: NAT", "kuota bersama (ditolak: M50", "mTLS untuk mitra (disebut", "plugin Caddy untuk Coraza (stable, \"needs a maintainer\""]) expect(kolomADR56[2], o).toContain(o);
    expect(kolomADR56[3]).toContain("50 mitra × 100 per detik = 5.000 per detik, 3,6 kali puncak 1.388,9");
    expect(kolomADR56[3]).toContain("Coraza kehilangan pemelihara");
    expect(naskah).toContain("| 5.25 | 4 | Keamanan 11: Pintu untuk pihak luar, kuota, WAF + ADR 56 | Keamanan + ADR | ★ | t5-waf | pilah |");
    expect(naskah).toContain("- **Security** 5.18, 5.19, 5.24, 5.25, 5.26.");
  });
  test("registry: halaman 5.25 jenis konsep, ada, prasyarat t5-m50, lab t5-waf, ADR 56, menit = baca + coba, judul dan peran dari naskah; tetangga dan tujuan tautan", () => {
    const h = dari("t5-waf");
    expect(h.nomor).toBe("5.25");
    expect(h.jenis).toBe("konsep");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.prasyarat).toEqual(["t5-m50"]);
    expect(h.lab).toEqual(["t5-waf"]);
    expect(h.adr).toEqual([56]);
    expect(h.peran).toEqual(["security", "backend"]);
    expect(h.path).toBe("tahap-5/pintu-mitra-waf.md");
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t5-m50]]");
    expect(frontmatter).toContain(`title: "5.25 ${h.judul}"`);
    expect(dari("t5-m50").nomor).toBe("5.24");
    expect(dari("t5-m50").ada).toBe(true);
    expect(dari("t1-sql-injection").nomor).toBe("1.20");
    expect(dari("t3-rate-limit-redis").nomor).toBe("3.17");
    expect(dari("t4-webhook").nomor).toBe("4.7");
    expect(dari("t4-ssrf").nomor).toBe("4.21");
    expect(dari("t1-idor").nomor).toBe("1.29");
    expect(dari("t5-prd").nomor).toBe("5.1");
    expect(dari("t5-rollout").nomor).toBe("5.23");
    expect(dari("t5-mtls").nomor).toBe("5.19");
    expect(dari("t5-adr-60").nomor).toBe("5.30");
    expect(dari("t2-idempotency").nomor).toBe("2.14");
    expect([ADR27, ADR34, ADR41, ADR56, ADR4]).toEqual(["27", "34", "41", "56", "4"]);
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "berikutnya" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ "t5-prd": 5, "t2-idempotency": 1, berikutnya: 1, "t5-m50": 4, "t1-sql-injection": 2, "t5-rollout": 1, "t3-rate-limit-redis": 2, "t4-webhook": 2, "t1-idor": 1, "t4-ssrf": 1, "t5-mtls": 2, "t5-adr-60": 1 });
  });
  test("ADR 4 di halaman 1.20: WAF di depan API ditunda ke Tahap 5 dengan alasan 0,14 request per detik, satu gedung, penguji internal; satu dari tiga butir; aturan ADR 4 tetap", () => {
    expect(hal120).toContain("| WAF di depan API | Puncak 0,14 request per detik, satu gedung, penguji internal | Tahap 5 |");
    const sengaja = hal120.slice(hal120.indexOf("### Sengaja belum dilakukan"), hal120.indexOf('<Blok nama="Kunci">'));
    expect(sengaja.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| Yang ditunda") && !b.startsWith("|---"))).toHaveLength(3);
    expect(hal120).toContain("### ADR 4: parameter query, allowlist, linter, dan field minimal");
    expect(badan).toContain('ADR 4 ([[t1-sql-injection]]) menaruh WAF di depan API di bagian "Sengaja belum dilakukan". Alasannya puncak 0,14 request per detik, satu gedung, dan penguji internal, dan Tahap 5 ditulis sebagai tempat muncul lagi. Itu satu dari tiga butir yang ditunda ADR 4.');
    expect(hal129).toContain("### ADR 7: pemilik ditanya di service, RLS sebagai pagar kedua, 404 bukan 403");
  });
  test("halaman tetangga: 4.7 (event_id menahan kiriman ganda, bukan tanda tangan), 3.17 (jendela tetap), 5.1 (±50 penyedia, kunci, kuota, key wajib), 5.30 (HMAC bertimestamp, HTTP Message Signatures), 5.24", () => {
    expect(hal47).toContain("Gaya 1 menolak kiriman 6 menit tetapi menerima kiriman 60 detik. Jadi yang menahan kiriman yang diputar ulang di dalam toleransi bukan tanda tangan, melainkan `event_id`.");
    expect(hal47).toContain("Tanda tangan HMAC-SHA256 atas timestamp, satu titik, dan byte mentah diperiksa");
    expect(hal317).toContain("Hitungan login per alamat dan per akun hidup di Redis");
    expect(baca("situs/src/content/docs/tahap-3/rate-limit-redis.mdx")).toMatch(/jendela tetap/i);
    expect(hal51).toContain("Mitra POS (Tomi dan ±50 penyedia, Asumsi)");
    expect(hal51).toContain("Kunci per mitra, kuota per mitra, dan Idempotency-Key wajib untuk perintah yang menggerakkan uang");
    expect(hal530).toContain("| 7. SLSA dan HTTP Message Signatures | Pihak luar atau auditor meminta bukti pembuatan image | Tidak diminta | Tidak diminta; mitra POS memakai HMAC bertimestamp seperti ADR 34 |".replace("seperti ADR 34", "seperti ADR 34").replace("Tidak diminta; mitra", "Tidak diminta. Mitra"));
    expect(hal524).toContain("dibahas di [[t5-waf]]");
    expect(hal524).toContain("Pembelaannya, yaitu kuota per mitra, tanda tangan bertimestamp, WAF");
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R5-230 sampai R5-234", () => {
  const ids = ["R5-230", "R5-231", "R5-232", "R5-233", "R5-234"];
  const baris = ids.map(barisRiset);
  test("lima baris berurutan di RISET-TAHAP-5, lima kolom, tanpa ID ganda, dengan tetangga di rentang", () => {
    const semua = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    for (const id of ids) expect(semua.filter((x) => x === id), id).toHaveLength(1);
    const i = semua.indexOf("R5-230");
    expect(semua.slice(i, i + 5)).toEqual(ids);
    // tetangga dikunci dengan rentang, bukan dengan ID tertentu: PR halaman lain menyisipkan baris riset di antaranya
    expect(Number(semua[i - 1]!.slice(3))).toBeGreaterThanOrEqual(225);
    expect(Number(semua[i - 1]!.slice(3))).toBeLessThan(230);
    expect(Number(semua[i + 5]!.slice(3))).toBeGreaterThan(234);
    for (const b of baris) { expect(b).not.toBe(""); expect(pecahBaris(b)).toHaveLength(5); }
  });
  test("tiap tautan luar di halaman ada di baris riset dengan tanggal buka 2026-11-04; himpunan dan jumlah tautan terkunci", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const lanjut = tautan.slice(tautan.length - 12);
    expect(lanjut).toEqual([
      "https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/", "https://coreruleset.org/docs/2-how-crs-works/2-2-paranoia_levels/", "https://github.com/corazawaf/coraza#readme",
      "https://www.rfc-editor.org/rfc/rfc9110#section-11.6.1", "https://www.rfc-editor.org/rfc/rfc9421#section-7.2.2", "https://www.rfc-editor.org/rfc/rfc3022", "https://pkg.go.dev/time#Time.Sub",
      "https://github.com/express-rate-limit/express-rate-limit/blob/v8.7.3/readme.md", "https://laravel.com/docs/13.x/routing#rate-limiting", "https://www.django-rest-framework.org/api-guide/throttling/",
      "https://docs.serverpod.dev/concepts/endpoints-and-apis/endpoint-middleware", "https://supabase.com/docs/guides/functions/examples/rate-limiting",
    ]);
    const utama = tautan.slice(0, tautan.length - 12);
    expect(utama).toEqual([
      "https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/", "https://coreruleset.org/docs/2-how-crs-works/2-2-paranoia_levels/", "https://github.com/corazawaf/coraza/blob/v3.8.1/http/middleware.go",
      "https://www.rfc-editor.org/rfc/rfc9110#section-11.6.1", "https://pkg.go.dev/time#Time.Sub", "https://www.rfc-editor.org/rfc/rfc9421#section-7.2.2",
      "https://github.com/express-rate-limit/express-rate-limit/blob/v8.7.3/readme.md", "https://laravel.com/docs/13.x/routing#rate-limiting", "https://www.django-rest-framework.org/api-guide/throttling/",
      "https://docs.serverpod.dev/concepts/endpoints-and-apis/endpoint-middleware", "https://supabase.com/docs/guides/functions/examples/rate-limiting", "https://www.rfc-editor.org/rfc/rfc3022", "https://github.com/corazawaf/coraza#readme",
    ]);
    const sumber: Record<string, [string, string]> = {
      "https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/": ["R5-231", "anomaly scoring"],
      "https://coreruleset.org/docs/2-how-crs-works/2-2-paranoia_levels/": ["R5-231", "Paranoia level 1 (PL 1)"],
      "https://github.com/corazawaf/coraza/blob/v3.8.1/http/middleware.go": ["R5-230", "baris 139 sampai 141"],
      "https://github.com/corazawaf/coraza#readme": ["R5-230", "needs a maintainer"],
      "https://www.rfc-editor.org/rfc/rfc9110#section-11.6.1": ["R5-232", "RFC 9110"],
      "https://www.rfc-editor.org/rfc/rfc9421#section-7.2.2": ["R5-232", "RFC 9421"],
      "https://www.rfc-editor.org/rfc/rfc3022": ["R5-227", "rfc-editor.org/rfc/rfc3022"],
      "https://pkg.go.dev/time#Time.Sub": ["R5-232", "go doc time.Time.Sub"],
      "https://github.com/express-rate-limit/express-rate-limit/blob/v8.7.3/readme.md": ["R5-233", "express-rate-limit 8.7.3"],
      "https://laravel.com/docs/13.x/routing#rate-limiting": ["R5-233", "v13.40.0"],
      "https://www.django-rest-framework.org/api-guide/throttling/": ["R5-233", "3.18.3"],
      "https://docs.serverpod.dev/concepts/endpoints-and-apis/endpoint-middleware": ["R5-233", "endpoints-and-apis/endpoint-middleware"],
      "https://supabase.com/docs/guides/functions/examples/rate-limiting": ["R5-233", "Rate Limiting Edge Functions"],
    };
    for (const u of new Set(tautan.filter((x) => x.startsWith("http")))) expect(barisRiset(sumber[u]![0]), `${u} di ${sumber[u]![0]}`).toContain(sumber[u]![1]);
    // tiap tautan di badan (di luar Bacaan lanjut) diikuti kalimat dengan tanggal buka, di paragraf atau butir yang sama
    for (const par of badan.slice(0, badan.indexOf("### Bacaan lanjut")).split("\n").filter((x) => /\]\(https?:\/\//.test(x))) {
      for (const m of par.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) expect(par.slice(m.index!), m[1]).toContain("dibuka 2026-11-04");
    }
    expect(hitungKali(badan, "dibuka 2026-11-04")).toBe(utama.length);
    expect(hitungKali(badan, "2026-11-04")).toBe(utama.length + 2); // dua kalimat tanpa tautan: "dicek ke dokumentasi pada" dan "Pada 2026-11-04 README"
    const teksTautan: Record<string, string> = {};
    for (const m of badan.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) { expect(teksTautan[m[1]!] ?? m[2]!, m[1]).toBe(m[2]); teksTautan[m[1]!] = m[2]!; }
    expect(JSON.stringify(rantaiMentah) + JSON.stringify(pilah)).not.toMatch(/https?:\/\//);
    for (const b of baris.slice(0, 4)) expect(b, "tanggal buka").toContain("2026-11-04");
    expect(baris[4]).toContain("dibaca di main 2026-11-04");
  });
  test("R5-230: kutipan README Coraza (plugin Caddy butuh pemelihara, inti aktif), rilis, komit; halaman memakai label itu untuk plugin dan ekstensi WASM Traefik, bukan inti", () => {
    const r = barisRiset("R5-230");
    expect(r).toContain("stable, needs a maintainer");
    expect(r).toContain("experimental, needs a maintainer");
    expect(r).toContain("Project Status: Active – The project has reached a stable, usable state and is being actively developed.");
    expect(r).toContain("v3.8.1 terbit 2026-10-02T13:52:08Z");
    expect(r).toContain("komit terbaru di cabang main 2026-10-29T10:40:12Z");
    expect(badan).toContain('README Coraza menulis plugin itu "stable, needs a maintainer", sedangkan inti Coraza ditulis aktif dikembangkan');
    expect(badan).toContain("Pada 2026-11-04 README menulis label itu untuk plugin Caddy dan ekstensi WASM Traefik, sedangkan inti Coraza punya rilis v3.8.1 tanggal 2026-10-02 dan komit sampai 2026-10-29. Risikonya ke depan, dan belum terjadi.");
    expect(badan).toContain("Gerbang lab memakai Coraza sebagai library Go di prosesnya sendiri, dan plugin Caddy Tidak dijalankan.");
  });
  test("R5-231: kutipan CRS dan rilis v4.30.0; halaman memakai pelunak 'sebagian besar' dan 'hampir tidak pernah', dan tidak menulis alarm palsu nol", () => {
    const r = barisRiset("R5-231");
    expect(r).toContain('"If the anomaly score is greater than or equal to the inbound anomaly score threshold then the transaction is denied."');
    expect(r).toContain('"Most detected inbound threats carry an anomaly score of 5 (by default)"');
    expect(r).toContain('"Paranoia level 1 (PL 1) provides a set of rules that hardly ever trigger a false alarm (ideally never, but it can happen, depending on the local setup)."');
    expect(r).toContain("v4.30.0, terbit 2026-10-02T21:19:43Z");
    expect(r).toContain("tanda tangan tidak diperiksa [perlu verifikasi]");
    expect(badan).toContain("Menurut dokumentasi CRS, sebagian besar ancaman masuk yang terdeteksi bernilai 5 secara bawaan");
    expect(badan).toContain("level 1 memuat aturan yang hampir tidak pernah memicu alarm palsu. Alarm palsu masih mungkin tergantung susunan lokal");
    expect(badan).not.toMatch(/alarm palsu (nol|tidak ada)/i);
    expect(badan).not.toMatch(/tanpa alarm palsu/i);
  });
  test("R5-232: RFC 9110 11.6.1 (MUST), RFC 9421 7.2.2 (nonce, penutupan bagian pesan, timestamp), Go time.Time.Sub; halaman tidak mengaku RFC mewajibkan nonce", () => {
    const r = barisRiset("R5-232");
    expect(r).toContain("STD 97, Standards Track, Juni 2022");
    expect(r).toContain("RFC 9421 (Standards Track, Februari 2024)");
    expect(r).toContain('"to allow the verifier to detect replay of the signature itself if a nonce value is repeated"');
    expect(r).toContain('"If the result exceeds the maximum (or minimum) value that can be stored in a Duration, the maximum (or minimum) duration will be returned."');
    expect(r).toContain("go1.27.1 lokal");
    expect(badan).toContain("RFC 9110 bagian 11.6.1 menulis bahwa server yang menjawab 401 harus mengirim `WWW-Authenticate` dengan sedikitnya satu challenge");
    expect(badan).toContain("RFC 9421 bagian 7.2.2 menulis beberapa penangkal replay. Penanda tangan menutup bagian pesan yang cukup untuk membedakannya dari pesan lain. Parameter `nonce` memberi nilai unik per pesan, supaya verifier bisa mendeteksi tanda tangan yang diulang bila nilai itu muncul lagi. Timestamp dan waktu kedaluwarsa membatasi guna tanda tangan yang tertangkap, dan pintu ini sudah memakai timestamp");
    expect(badan).toContain("Keduanya tindak lanjut yang tidak dikerjakan di lab (Penalaran dari RFC).");
    expect(badan).not.toMatch(/RFC 9421[^.]*(wajib|harus)/);
  });
  test("R5-233: dokumentasi lima stack; tab memakai pelunak dan lingkup sumber, dan Serverpod dan Supabase menulis yang tidak dibahas", () => {
    const r = barisRiset("R5-233");
    for (const x of [
      'opsi `keyGenerator` "Identify users (defaults to IP address)"', "express-rate-limit 8.7.3", "`Limit::perMinute(60)->by($request->user()?->id ?: $request->ip())`", "v13.40.0",
      "Django REST framework 3.18.3", "\"all clients behind a unique NAT'd gateway will be treated as a single client\"", "\"should not be considered a security measure or protection against brute forcing or denial-of-service attacks\"",
      "Serverpod 4.1.0", "226 alamat, tanpa alamat dengan kata limit, throttle, firewall, atau waf", "\"This example allows each client IP a fixed number of requests per time window\"", "Production quota patterns need eviction, and state shared across servers such as a database counter.", "nol sebutan WAF atau firewall", "\"We can even rate limit based on the user ID from Supabase Auth!\"",
    ]) expect(r, x).toContain(x);
    const potongan = halaman.split(/<Fragment slot="t\d">/).slice(1);
    expect(potongan).toHaveLength(6);
    expect(potongan[0]).toContain("*Dijalankan: lab t5-waf, go1.27.3, Redis 8.10.2");
    for (const p of potongan.slice(1)) expect(p).toContain("*Tidak dijalankan.");
    expect(potongan[1]).toContain("README menulis bahwa `keyGenerator` mengenali user dan bawaannya alamat IP");
    expect(potongan[2]).toContain("Contoh dokumentasi memakai id user dan jatuh ke alamat IP bila user belum masuk, dan batasnya per menit, bukan per detik.");
    expect(potongan[3]).toContain("Dokumentasi menulis bahwa semua client di belakang satu gateway NAT, yaitu satu alamat jaringan yang dipakai banyak perangkat ([[t5-m50]]), dianggap satu client bila `NUM_PROXIES` diatur.");
    expect(potongan[3]).toContain("tidak boleh dianggap pengaman terhadap brute force atau serangan denial-of-service");
    expect(potongan[4]).toContain("halaman itu memuat contoh middleware pembatas laju yang memakai alamat IP client sebagai kunci, menghitung dalam jendela waktu tetap, dan menjawab 429.");
    expect(potongan[4]).toContain("penghitung contohnya ada di memori satu server, dan produksi butuh state yang dipakai bersama antar server.");
    expect(potongan[4]).toContain("Tujuh halaman dokumentasi yang dibuka tidak menyebut WAF, dan halaman lain tidak dibuka.");
    expect(potongan[4]).not.toContain("[perlu verifikasi]");
    expect(potongan[5]).toContain("Halaman yang dibaca tidak membahas WAF atau kuota per kunci API. Kode contohnya ada di GitHub dan tidak dibuka.");
    expect(hitungKali(halaman, "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-04.")).toBe(1);
    const tab = halaman.match(/<TabSet id="stack" labels=\{(\[[^\]]+\])\}>/)!;
    expect(JSON.parse(tab[1]!)).toEqual(["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]);
    expect([...halaman.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1])).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    expect(r).toContain("kode di tab selain Go adalah Ilustrasi");
  });
  test("R5-234: sumber internal dan hitungan atas angka sendiri", () => {
    const r = barisRiset("R5-234");
    for (const x of [
      "`labs/t5-waf/output/waf.txt` bagian A (8 dari 8 diblokir 403)", "B (37 diuji, 0 diblokir WAF)", "`kuota.txt` bagian A sampai C", "`tandatangan.txt` bagian A sampai F",
      "`TestGerbangPutarUlangDalamJendelaDiterima`", "`TestGerbangKuotaSebelumTandaTangan`", "`TestPembatasSlotBocorSembuhHanyaSesudahSepi`", "`TestGerbangWAFGagalTertutup`",
      "`TestCorazaWrapHandlerBawaanGalatMenjawab200Kosong`", "`TestPeriksaTandaTimestampJauhDiDepan`", "`labs/api-t4/internal/modul/pembayaran/pembayaran.go` baris 132 sampai 138",
      "`internal/repo/idempoten.go`", "halaman 1.20 (ADR 4: \"WAF di depan API\" ditunda ke Tahap 5)", "naskah Tahap 5 tabel ADR 56",
    ]) expect(r, x).toContain(x);
    expect(r).toContain("dibaca di main 2026-11-04");
  });
});

describe("template konsep, tabel, definisi di pemakaian pertama, urutan, dan teks widget dan diagram", () => {
  test("template konsep: lima blok dalam urutan, dua pertama terbuka; satu tebak details.question; empat Cek diri; noscript; TabSet; widget pilah; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect(badan).toContain('<Blok nama="Mulai" buka>');
    expect(badan).toContain('<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: tiap pemeriksaan di pintu menjawab satu pertanyaan, dan Idempotency-Key tidak tertanda, jadi ia menyatukan pengulangan kasir tetapi tidak menahan permintaan yang diputar ulang dengan key lain.">');
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(4);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect((badan.match(/<TabSet /g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["pilah"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="pilah" src="data/t5-pintu-pilah.json" />');
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t5-waf-inti.json";');
    expect(halaman.match(/^#{1,6} .*$/gm)).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", `### ADR ${ADR56}: satu gerbang di tepi dengan WAF, kuota dan tanda tangan per mitra, dan cakupan kunci`,
      "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    expect(badan.indexOf("### Di stack lain")).toBeGreaterThan(badan.indexOf("### Cara kerjanya"));
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; empat tabel dengan jumlah baris dan kolom terkunci", () => {
    const barisB = badan.split("\n");
    const tabel: { kolom: number; baris: number }[] = [];
    for (let i = 0; i < barisB.length; i++) {
      if (barisB[i]!.startsWith("|") && !(barisB[i - 1] ?? "").startsWith("|")) {
        const n = pecahBaris(barisB[i]!).length;
        let j = i;
        for (; barisB[j]?.startsWith("|"); j++) expect(pecahBaris(barisB[j]!).length, `tabel ${tabel.length + 1} baris ${j + 1}`).toBe(n);
        tabel.push({ kolom: n, baris: j - i });
      }
    }
    expect(tabel).toEqual([{ kolom: 3, baris: 10 }, { kolom: 5, baris: 7 }, { kolom: 4, baris: 7 }, { kolom: 3, baris: 10 }]);
    expect(badan).toContain("| Urutan | Pemeriksaan | Menolak dengan |\n|---|---|---|\n");
    expect(badan).toContain(`| 1 | Batas ukuran body ${KIB} KiB (Asumsi) | 413 |`);
    expect(badan).toContain("| 2 | WAF: Coraza dengan CRS, mode blokir | 403, atau 400 untuk JSON rusak |");
    expect(badan).toContain(`| 4 | Kunci API: hash SHA-256 dicari di \`mitra_pos\`, statusnya harus aktif | 401, atau 429 sesudah ${GAGAL_MAKS} kegagalan per alamat dalam ${JENDELA_GAGAL} detik (Asumsi) |`);
    expect(badan).toContain(`| 5 | Kuota per mitra: ${berjalan} permintaan berjalan, lalu bucket ${kuota} per detik (Asumsi) | 429 dengan \`Retry-After\` |`);
    expect(badan).toContain("| 7 | Idempotency-Key untuk POST, PUT, PATCH, dan DELETE | 400 |");
  });
  test("urutan baris tabel pemeriksaan sama dengan urutan di kode: nomor 1 sampai 8 berurutan, dan indeks kode naik", () => {
    const baris = badan.split("\n").filter((b) => /^\| [1-8] \| /.test(b));
    expect(baris.map((b) => pecahBaris(b)[0])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const kunciKode = ["MaksBytesReader", "WAF.Periksa", "AwalanPOS", "g.cari(", "g.Batas.Masuk(", "PeriksaTanda(", "Idempotency-Key"];
    const idx = ["http.MaxBytesReader", "g.WAF.Periksa", "strings.HasPrefix(r.URL.Path, AwalanPOS)", "g.cari(ctx, kunci)", "g.Batas.Masuk(", "PeriksaTanda(rahasia", '"Idempotency-Key"'].map((x) => gerbangGo.indexOf(x));
    expect(kunciKode).toHaveLength(7);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });
  test("definisi di pemakaian pertama: mitra POS, WAF, CRS, nonce, Idempotency-Key, Tes Go, Retry-After, Gateway API, paranoia level, replay, gagal tertutup, label turunan", () => {
    const pos = (s: string): number => { const i = badan.indexOf(s); expect(i, s).toBeGreaterThanOrEqual(0); return i; };
    expect(badan.indexOf("mitra POS")).toBe(pos("mitra POS, penyedia kasir elektronik pihak ketiga ([[t5-prd]])"));
    expect(badan.indexOf("WAF")).toBe(pos("WAF (web application firewall) adalah penyaring isi permintaan HTTP di depan API"));
    expect(badan.indexOf("CRS")).toBe(pos("OWASP CRS (Core Rule Set), kumpulan aturan yang memberi skor pada tiap kecocokan") + "OWASP ".length);
    expect(badan.search(/nonce/i)).toBe(pos("Nonce adalah nilai sekali pakai"));
    expect(badan.indexOf("Idempotency-Key")).toBe(pos("Idempotency-Key adalah kepala permintaan yang membuat pengulangan POST menghasilkan satu hasil"));
    expect(badan.indexOf("Tes Go")).toBe(pos("Tes Go adalah tes otomatis di folder gerbang atau di `api-t5`"));
    expect(badan.indexOf("Retry-After")).toBe(pos("`Retry-After` adalah kepala jawaban yang memberi client waktu tunggu sebelum mencoba lagi.") + 1);
    expect(pos("Gateway API, antarmuka Kubernetes untuk router")).toBeLessThan(pos("Tidak dijalankan di lab ini. Tabel ini"));
    expect(badan.indexOf("Paranoia level")).toBe(pos("Paranoia level adalah seberapa agresif CRS."));
    expect(badan.indexOf("paranoia level")).toBeGreaterThan(badan.indexOf("Paranoia level adalah seberapa agresif CRS."));
    expect(badan.indexOf("Replay adalah")).toBeLessThan(badan.indexOf("bukan penahan replay"));
    expect(badan.indexOf("Gagal tertutup berarti")).toBeLessThan(badan.indexOf("TestGerbangWAFGagalTertutup` membuktikannya"));
    expect(badan.indexOf("Penalaran")).toBe(pos("**Penalaran:** kesimpulan dari kode atau angka di halaman") + "**".length);
    expect(badan.indexOf("Hitungan")).toBe(pos("**Hitungan:** angka yang dihitung dari angka lain di halaman ini") + "**".length);
    expect(badan.indexOf("Dibaca dari kode")).toBe(pos("**Dibaca dari kode:** kode sumber dibaca tanpa dijalankan") + "**".length);
    expect(badan.indexOf("dibaca dari kode")).toBeGreaterThan(pos("**Dibaca dari kode:**"));
    expect(badan.indexOf("(Penalaran")).toBeGreaterThan(pos("**Penalaran:**"));
    expect(hal51).toContain("WAF, yaitu penyaring permintaan HTTP di depan API");
    expect(badan).not.toMatch(/\bpelanggan\b/);
    expect(badan).not.toMatch(/\brahasia\b/);
    expect(badan).not.toMatch(/\blayanan\b/);
    expect(badan).not.toMatch(/\breplica\b/i);
    expect(JSON.stringify(pilah)).not.toMatch(/\brahasia\b/);
    expect(hitungKali(badan, "Penalaran")).toBe(17);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, pilah, dan kartu; 'bagian C' dipakai, bukan label rekaman", () => {
    const semua = [halaman.replace("[[berikutnya]]", ""), JSON.stringify(rantaiMentah), JSON.stringify(pilah), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-waf"))].join("\n");
    expect(semua).not.toMatch(/\bR\d-\d+\b/);
    expect(semua).not.toMatch(/\bkeputusan\s+#?\d{2,4}\b/i);
    expect(semua).not.toMatch(/\bPR\s*#?\d{2,4}\b|\(#\d{3,4}\)/);
    expect(semua).not.toMatch(/(?<![\w./#-])[A-G]\d+(?:\.\d+)?(?![\w])/);
    expect(semua).not.toMatch(/\bD1\b|\bD2\b|\bC2\b|\bA1\b/);
  });
  test("label: tak satu angka lab berlabel Ilustrasi; Hitungan atas Asumsi untuk kuota; jumlah 'Rekaman lab' dan 'Tes Go' sama dengan yang ditulis", () => {
    for (const b of badan.split("\n")) {
      if (/Ilustrasi/.test(b) && !b.startsWith("<Snippet")) expect(b, "Ilustrasi hanya untuk kode tab dan serangan volumetrik").toMatch(/Kode di (tab|bawah)|Banjir paket|^Rekaman lab, Asumsi, Ilustrasi/);
    }
    expect(hitungKali(badan, "Rekaman lab")).toBe(11);
    expect(badan).toContain("Itu Hitungan atas Asumsi: 20 ÷ 100 = 0,2 detik.");
    expect(badan).toContain("50 mitra × 100 per detik = 5.000 per detik, yaitu 3,6 kali puncak 1.388,9 (Hitungan atas Asumsi: 5.000 ÷ 1.388,9 = 3,59997).");
    expect(badan).toContain("100 × 600 = 60.000 nonce per mitra, dan 50 × 60.000 = 3.000.000 untuk ±50 mitra (Hitungan atas Asumsi).");
  });
});

describe("Snippet: rentang diturunkan dari isi berkas, judul sesuai bagian rekaman, tanpa ID dan komentar internal", () => {
  test("sepuluh Snippet berberkas dengan rentang yang diturunkan; tiga kode di tab selain Go ditulis langsung", () => {
    expect(tagSnippet).toHaveLength(URUTAN_SNIPPET.length);
    URUTAN_SNIPPET.forEach((u, i) => {
      const s = tagSnippet[i]!;
      expect(s.file).toBe(u.berkas);
      expect(s.lines, s.title).toBe(tag(u.kunci));
      expect(s.lang).toBe(u.lang);
    });
    expect(hitungKali(badan, "<Snippet lang=")).toBe(3);
    for (const s of tagSnippet) expect(s.title).not.toMatch(/\b[A-G]\d\b/);
    expect(tagSnippet.map((s) => s.title)).toEqual([
      "Rekaman lab: labs/t5-waf/output/waf.txt, bagian A (dua dari delapan payload dan jumlahnya)",
      "Rekaman lab: labs/t5-waf/output/waf.txt, bagian B (ringkasan payload sah)",
      "Rekaman lab: labs/t5-waf/output/kuota.txt, bagian A (jam bucket dibekukan)",
      "Kode lab: labs/t5-waf/gerbang/tanda.go, fungsi TandaTangan",
      "Rekaman lab: labs/t5-waf/output/tandatangan.txt, bagian B (toleransi 5 menit)",
      "Tes Go: labs/t5-waf/gerbang/gerbang_tinjau_test.go, putar ulang dalam jendela",
      "Kode lab: labs/api-t5/internal/handler/handler_pos.go, cakupan merchant",
      "Rekaman lab: labs/t5-waf/output/tandatangan.txt, bagian C (cakupan)",
      "Rekaman lab: labs/t5-waf/output/tandatangan.txt, bagian A (Idempotency-Key wajib)",
      "Kode lab: labs/t5-waf/gerbang/gerbang.go, kuota per mitra di ServeHTTP",
    ]);
    // huruf bagian di judul Snippet rekaman sama dengan penanda bagian di berkas, dihitung dari baris pertama yang ditampilkan
    for (const sn of tagSnippet.filter((x) => x.file.endsWith(".txt"))) {
      const baris = baca(sn.file).split("\n");
      const awal = Number(sn.lines.split(":")[0]);
      const huruf = [...baris.slice(0, awal)].reverse().find((b) => /^# --- [A-Z]\./.test(b))!.match(/^# --- ([A-Z])/)![1];
      expect(sn.title, sn.file).toContain(`bagian ${huruf} (`);
      // baris pertama yang ditampilkan bukan kepala rekaman dan bukan penanda bagian
      expect(baris[awal - 1]!.startsWith("#"), `${sn.file}:${awal}`).toBe(false);
    }
  });
  test("isi Snippet: dua payload dan jumlahnya, ringkasan 37, A dan B kuota, TandaTangan, tiga permintaan putar ulang, cakupan, key wajib, dan kuota; tanpa komentar internal", () => {
    const ambil = (berkas: string, k: keyof typeof RENTANG): string[] => baca(berkas).split("\n").slice(RENTANG[k].awal - 1, RENTANG[k].akhir);
    expect(ambil("labs/t5-waf/output/waf.txt", "wafAkhir").filter((b) => b !== "")).toEqual([
      "$ S07 naik direktori di query", "  -> 403 diblokir-waf  [aturan CRS: 930100,930110,930120,932160,949110]", "$ S08 naik direktori di jalur", "  -> 403 diblokir-waf  [aturan CRS: 930100,930110,949110]", "diblokir 403: 8 dari 8",
    ]);
    expect(ambil("labs/t5-waf/output/waf.txt", "wafSah")).toHaveLength(2);
    expect(ambil("labs/t5-waf/output/kuota.txt", "kuotaA")).toEqual(["mitra A: 600 permintaan -> 200: 100, 429: 500", "mitra B: 20 permintaan -> 200: 20, 429: 0"]);
    expect(ambil("labs/t5-waf/gerbang/tanda.go", "tanda")).toHaveLength(6);
    expect(ambil("labs/t5-waf/output/tandatangan.txt", "waktu")).toHaveLength(6);
    expect(ambil("labs/t5-waf/output/tandatangan.txt", "cakupanRek")).toHaveLength(13);
    expect(ambil("labs/t5-waf/output/tandatangan.txt", "keyWajib")).toHaveLength(6);
    expect(ambil("labs/api-t5/internal/handler/handler_pos.go", "cakupanKode")[0]).toBe("\t\tmerchant, ok := idDariPath(r)");
    expect(ambil("labs/t5-waf/gerbang/gerbang.go", "kuotaGerbang")[0]).toContain("put, err := g.Batas.Masuk(ctx, kuncikuota, mitra.KuotaPerDetik)");
    for (const k of ["tanda", "putar", "cakupanKode", "kuotaGerbang"] as const) {
      const berkas = URUTAN_SNIPPET.find((u) => u.kunci === k)!.berkas;
      expect(ambil(berkas, k).join("\n"), k).not.toMatch(/R\d-\d+|keputusan \d|PR \d+|tinjauan/);
    }
  });
});

describe("halaman istilah WAF dan Nonce dan baris glosarium: angka dari rekaman, sumber dengan baris riset, tanggal akses, dan tetangga alfabet", () => {
  test("waf.json: cerita memakai angka rekaman, mekanisme memuat pelunak CRS, sumber punya riset, url sama dengan halaman, dan tanggal akses sama dengan baris riset", () => {
    expect(istilahWaf.istilah).toBe("WAF (web application firewall)");
    expect(istilahWaf.cerita).toEqual([{ rujukan: "t5-waf", teks: `Gerbang di depan api-t5 memeriksa delapan payload serangan uji dengan Coraza dan CRS, dan semuanya dijawab 403 walau kunci dan tanda tangannya sah. Dari ${SAH.uji} payload POS yang sah, ${SAH_REF} hanya mengubah satu field, jadi angka itu bukan ukuran alarm palsu (\`waf.txt\` bagian A dan B).` }]);
    expect(BLOKIR.dari).toBe(8);
    expect(istilahWaf.mekanisme).toHaveLength(4);
    expect(istilahWaf.mekanisme[0]).toBe("Permintaan masuk ke gerbang, dan WAF membaca method, alamat, header, dan body.");
    expect(istilahWaf.mekanisme[2]).toBe("Bila skor mencapai ambang masuk, WAF menjawab 403 dan permintaan tidak sampai ke API.");
    expect(istilahWaf.mekanisme[1]).toBe("Tiap aturan CRS yang cocok menambah skor. Menurut dokumentasi CRS, sebagian besar ancaman masuk yang terdeteksi bernilai 5 secara bawaan.");
    expect(istilahWaf.mekanisme[3]).toBe("Mesin DetectionOnly mencatat aturan yang cocok tanpa memblokir, jadi terbaca apa yang akan diblokir bila mesinnya menyala.");
    expect(istilahWaf.jebakan[0]).toBe(`Mengira WAF memvalidasi isi. Kolom referensi berisi ${KARAKTER} karakter tanpa pola serangan lolos WAF dan ditolak API dengan ${KODE_VALIDASI} (\`waf.txt\` bagian C).`);
    expect(istilahWaf.jebakan[1]).toBe(`Menyimpulkan tingkat alarm palsu dari satu daftar payload sah. Dari ${SAH.uji} payload di rekaman, ${SAH_REF} hanya mengubah satu field.`);
    expect(istilahWaf.sumber.map((x) => [x.riset ?? "", x.url ?? x.rekaman])).toEqual([["R5-231", "https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/"], ["R5-230", "https://github.com/corazawaf/coraza#readme"], ["", "labs/t5-waf/output/waf.txt"]]);
    for (const x of istilahWaf.sumber.filter((y) => y.url)) {
      expect(x.judul).toContain("dibuka 2026-11-04");
      expect(barisRiset(x.riset!)).toContain("dibuka 2026-11-04");
      expect(badan).toContain(`](${x.url})`);
    }
    expect(istilahWaf.sumber[0]!.catatan).toBe("Skor dijumlahkan dan dibandingkan dengan ambang masuk; sebagian besar ancaman masuk yang terdeteksi bernilai 5 secara bawaan. Halaman paranoia level menulis level 1 hampir tidak pernah memicu alarm palsu, dan alarm palsu masih mungkin tergantung susunan lokal.");
    expect(istilahWaf.sumber[1]!.catatan).toBe("Coraza adalah WAF yang ditulis dalam Go dan dipakai lab sebagai library di proses gerbang. README menandai plugin Caddy dan ekstensi WASM Traefik sebagai butuh pemelihara.");
    expect(istilahWaf.sumber[2]!.catatan).toBe(`Delapan dari delapan payload serangan dijawab 403, ${SAH.uji} payload sah lolos, referensi ${KARAKTER} karakter dijawab ${KODE_VALIDASI} oleh api-t5, dan mode waf-deteksi tidak memblokir satu pun.`);
    expect(fs.existsSync(path.join(akar, istilahWaf.sumber[2]!.rekaman!))).toBe(true);
    expect(istilahWaf.sehari_hari).toBe("WAF adalah penyaring di depan API yang memeriksa isi permintaan HTTP dengan aturan serangan, lalu menolak permintaan yang cocok. Aturannya bisa berupa kumpulan seperti OWASP CRS.");
    expect(istilahWaf.sumber.map((x) => x.judul)).toEqual(["OWASP CRS: Anomaly Scoring dan Paranoia Levels (dibuka 2026-11-04)", "Coraza: README (dibuka 2026-11-04)", "Rekaman lab t5-waf: waf.txt bagian A sampai D"]);
    expect(istilahWaf.stack).toBeNull();
    expect(istilahWaf.terkait).toEqual(["Rate limit", "API gateway"]);
  });
  test("nonce.json: cerita memakai toleransi dari kode, sumber RFC 9421 bagian 7.2.2 dan tes Go, tanggal akses sama dengan baris riset", () => {
    expect(istilahNonce.istilah).toBe("Nonce");
    expect(istilahNonce.cerita).toEqual([{ rujukan: "t5-waf", teks: `Gerbang mitra POS menandatangani timestamp, method, alamat, dan byte body, tanpa nonce. Tes Go mencatat permintaan sah yang diputar ulang di dalam jendela ${TOLERANSI / 60} menit diterima lagi (\`testing.txt\` bagian A).` }]);
    expect(istilahNonce.mekanisme).toHaveLength(4);
    expect(istilahNonce.sehari_hari).toBe("Nonce adalah nilai sekali pakai yang ikut dihitung dalam tanda tangan sebuah pesan. Penerima mencatatnya, supaya pesan yang sama tidak diterima dua kali.");
    expect(istilahNonce.mekanisme.slice(0, 3)).toEqual(["Penanda tangan menambahkan nilai unik ke tiap pesan sebelum menghitung tanda tangan.", "Penerima memeriksa tanda tangan, lalu memeriksa apakah nilai itu sudah pernah dilihat dalam jendela waktu.", "Nilai yang sama untuk kedua kalinya berarti pesan diputar ulang, dan pesan itu ditolak."]);
    expect(istilahNonce.mekanisme[3]).toBe("Penerima menyimpan nilai selama dua kali toleransi timestamp, karena timestamp boleh di depan atau di belakang jam penerima.");
    expect(istilahNonce.jebakan).toHaveLength(2);
    expect(istilahNonce.jebakan[0]).toBe("Mengira timestamp saja menahan pengulangan. Di dalam jendela toleransi, pesan yang sama diterima lagi.");
    expect(istilahNonce.jebakan[1]).toBe("Mengira Idempotency-Key sama dengan nonce. Key yang tidak ikut ditandatangani bisa diganti oleh pihak yang memutar ulang pesan.");
    expect(istilahNonce.sumber[0]).toEqual({ riset: "R5-232", judul: "RFC 9421: HTTP Message Signatures, bagian 7.2.2 (dibuka 2026-11-04)", url: "https://www.rfc-editor.org/rfc/rfc9421#section-7.2.2", catatan: "Parameter nonce memberi nilai unik per pesan supaya verifier bisa mendeteksi tanda tangan yang diulang. Penanda tangan juga bisa memberi timestamp pembuatan dan waktu kedaluwarsa." });
    expect(barisRiset("R5-232")).toContain("RFC 9421 (Standards Track, Februari 2024) bagian 7.2.2");
    expect(badan).toContain(`](${istilahNonce.sumber[0]!.url})`);
    expect(istilahNonce.sumber[1]).toEqual({ judul: "Tes Go lab t5-waf: testing.txt bagian A", rekaman: "labs/t5-waf/output/testing.txt", catatan: "TestGerbangPutarUlangDalamJendelaDiterima: POST yang sama diterima tiga kali, dan Idempotency-Key yang diganti sampai ke hulu." });
    expect(testingRek).toContain(`--- PASS: ${istilahNonce.sumber[1]!.catatan.split(":")[0]}`);
    expect(istilahNonce.terkait).toEqual(["HMAC (hash-based message authentication code)", "Idempotency key"]);
    expect(istilahNonce.stack).toBeNull();
  });
  test("glosarium: baris WAF dan Nonce menunjuk [[t5-waf]], urutan alfabet terjaga, nama terkait ada di glosarium.json, dan baris glosarium.json cocok", () => {
    const baris = glosarium.split("\n");
    const idx = (awal: string): number => { const i = baris.findIndex((b) => b.startsWith(awal)); expect(i, awal).toBeGreaterThan(0); return i; };
    expect(baris[idx("| **Nonce** |")]).toBe("| **Nonce** | Nilai sekali pakai yang ikut dihitung dalam tanda tangan sebuah pesan, supaya penerima bisa menolak pesan yang sama bila nilainya muncul dua kali. | [[t5-waf]] |");
    expect(baris[idx("| **WAF** (web application firewall) |")]).toBe("| **WAF** (web application firewall) | Penyaring di depan API yang memeriksa isi permintaan HTTP dengan aturan seperti OWASP CRS, lalu menolak permintaan yang cocok dengan pola serangan. | [[t5-waf]] |");
    expect(idx("| **NetworkPolicy** |")).toBeLessThan(idx("| **Nonce** |"));
    expect(idx("| **Nonce** |")).toBeLessThan(idx("| **Nonrepeatable read** |"));
    expect(idx("| **Umur notifikasi tertua** |")).toBeLessThan(idx("| **WAF** (web application firewall) |"));
    expect(idx("| **WAF** (web application firewall) |")).toBeLessThan(idx("| **WAL** (Write-Ahead Log) |"));
    const nama = glosJson.map((x) => x.t);
    for (const n of [...istilahWaf.terkait, ...istilahNonce.terkait]) expect(nama, n).toContain(n);
    for (const [t, slug] of [["Nonce", "nonce"], ["WAF (web application firewall)", "waf"]] as const) {
      const b = glosJson.find((x) => x.t === t)!;
      expect(b.b).toBe("t5-waf");
      expect(b.h).toBe(`/istilah/${slug}/`);
    }
    expect(badan).not.toMatch(/\/istilah\//);
  });
});

describe("widget pilah, diagram Rantai, dan kartu Cek diri", () => {
  test("pilah: tujuh kelompok, sepuluh kejadian, tiap jawaban menunjuk kelompok yang ada, posisi jawaban bervariasi, kejadian kelima adalah putar ulang dengan key lain", () => {
    expect(pilah.judul).toBe("Siapa yang menangani kejadian ini di pintu mitra POS?");
    expect(pilah.kelompok).toEqual(["WAF", "Kunci API", "Kuota per mitra", "Tanda tangan HMAC", "Idempotency-Key", "Validasi dan cakupan di api-t5", "Belum ada di lab"]);
    expect(pilah.item).toHaveLength(10);
    for (const it of pilah.item) { expect(it.jawab).toBeGreaterThanOrEqual(0); expect(it.jawab).toBeLessThan(pilah.kelompok.length); expect(it.kenapa.length).toBeGreaterThan(20); }
    expect(pilah.item.map((i) => i.jawab)).toEqual([2, 0, 5, 4, 6, 3, 1, 6, 5, 3]);
    expect(new Set(pilah.item.map((i) => i.jawab)).size).toBe(pilah.kelompok.length);
    expect(pilah.item[4]!.teks).toBe("Permintaan sah diputar ulang di dalam jendela 5 menit dengan Idempotency-Key lain. Siapa yang menahannya?");
    expect(pilah.kelompok[pilah.item[4]!.jawab]).toBe("Belum ada di lab");
    expect(badan).toContain("Kejadian kelima tidak lagi lolos, karena key yang diganti mengubah tanda tangan (Penalaran dari RFC 9421, tidak dijalankan di lab).");
    expect(badan).toContain(`Pilah sepuluh kejadian di pintu mitra POS ke pemeriksaan yang menanganinya`);
    expect(pilah.item).toHaveLength(Number(cari(/Pilah (\w+) kejadian/, badan, "jumlah kejadian")[1] === "sepuluh" ? 10 : 0));
  });
  test("pilah: angka di teks dan alasan sama dengan rekaman dan kode", () => {
    const [kuotaIt, wafIt, cakupanIt, keyIt, putarIt, nominalIt, kunciIt, bocorIt, refIt, lamaIt] = pilah.item as [typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0], typeof pilah.item[0]];
    expect(kuotaIt.teks).toBe(`Mitra A mengirim permintaan ke-${kuota + 1} dalam satu detik, dan mitra B hanya mengirim ${B.n}.`);
    expect(kuotaIt.kenapa).toBe(`Bucket dihitung per mitra, dengan jam bucket dibekukan: A mendapat ${A.ok} jawaban 200 dan ${A.tolak} jawaban 429 dari ${A.n} permintaan, sedangkan B ${B.ok} dari ${B.n} tetap 200 (kuota.txt bagian A).`);
    expect(wafIt.kenapa).toBe("WAF membaca isi permintaan dan menjawab 403 dengan aturan CRS yang cocok. Kunci dan tanda tangan sah, jadi bukan autentikasi yang menghentikannya (waf.txt bagian A).");
    expect(cakupanIt.teks).toBe("Kunci API mitra A membaca QR milik merchant mitra B lewat alamat merchant B.");
    expect(keyIt.teks).toBe("Kasir mengirim POST yang sama dua kali dengan Idempotency-Key yang sama.");
    expect(kunciIt.teks).toBe("Kunci API yang tidak dikenal, atau kunci milik mitra yang sudah dibekukan.");
    expect(cakupanIt.kenapa).toBe("Gerbang tidak membandingkan merchant dengan mitra. Handler di api-t5 membandingkannya lewat akun.mitra_pos_id dan menjawab 404, sama dengan merchant yang tidak ada (tandatangan.txt bagian C, handler_pos.go).");
    expect(keyIt.kenapa).toBe(`Kedua jawabannya ${mKey[1]} dengan id QR yang sama, dan baris qr milik merchant hanya satu (tandatangan.txt bagian A). Key ini menyatukan pengulangan kasir.`);
    expect(putarIt.kenapa).toBe("Tanda tangan tidak memuat Idempotency-Key dan tidak ada nonce, jadi tes Go gerbang mencatat permintaan itu diterima dan key baru sampai ke hulu. Apakah api-t5 membuat QR kedua dibaca dari kode, tidak dijalankan.");
    expect(nominalIt.teks).toBe("POST yang nominalnya diubah dari 25.000 menjadi 99.000 sesudah ditandatangani.");
    expect(nominalIt.kenapa).toBe("HMAC dihitung atas byte mentah body, jadi isi yang berubah menghasilkan tanda yang tidak cocok dan dijawab 401 (tandatangan.txt bagian B).");
    expect(kunciIt.kenapa).toBe(`Gerbang mencari hash kunci di mitra_pos. Dua kasus itu dijawab 401 yang sama, dan sesudah ${GAGAL_MAKS} kegagalan dari satu alamat jawabannya 429 (tandatangan.txt bagian B dan D).`);
    expect(bocorIt.teks).toBe("Kunci API mitra A bocor tanpa secret penandatangannya. Siapa yang menjaga kuota kasir A yang sah dari 100 permintaan palsu?");
    expect(bocorIt.kenapa).toBe("Tanda tangan menolak tiap permintaan palsu dengan 401, tetapi kuota dihitung lebih dulu, jadi kasir A yang sah mendapat 429. Itu hasil tes Go (testing.txt bagian A), bukan rekaman kuota.txt.");
    expect(refIt.teks).toBe(`Kolom referensi berisi ${KARAKTER} karakter biasa, tanpa pola serangan.`);
    expect(refIt.kenapa).toBe(`Tidak ada aturan CRS yang cocok, jadi WAF meloloskannya. Server api-t5 menolaknya dengan ${KODE_VALIDASI} karena batasnya ${KARAKTER - 1} karakter (waf.txt bagian C). WAF bukan validasi.`);
    expect(lamaIt.teks).toBe(`Permintaan sah direkam ${TOLERANSI + 60} detik lalu, lalu diputar ulang apa adanya.`);
    expect(lamaIt.kenapa).toBe(`Timestamp ikut dihitung dalam tanda tangan, dan toleransinya ${TOLERANSI / 60} menit. Permintaan yang lebih tua dari itu dijawab 401 waktu-di-luar-toleransi (tandatangan.txt bagian B).`);
    expect(pilah.penutup).toBe("Tiap pemeriksaan menjawab satu pertanyaan. Idempotency-Key menyatukan pengulangan kasir, tetapi ia tidak tertanda, jadi key yang diganti membuat permintaan yang diputar ulang lolos sebagai permintaan baru (dibaca dari kode).");
    expect(wafIt.teks).toBe("Query berisi tautologi SQL, dikirim dengan kunci dan tanda tangan yang sah.");
    expect(bocorIt.teks).toContain(`${SAH.uji - SAH.uji + 100} permintaan palsu`);
    expect(pengulanganTes()).toBe(kuota);
    function pengulanganTes(): number {
      const f = tinjauTest.slice(tinjauTest.indexOf("func TestGerbangKuotaSebelumTandaTangan("), tinjauTest.indexOf("\nfunc ", tinjauTest.indexOf("func TestGerbangKuotaSebelumTandaTangan(") + 1));
      return Number(cari(/for i := 0; i < (\d+); i\+\+ \{/, f, "pengulangan tes")[1]);
    }
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber rekaman, angka dari rekaman, catatan menyebut tes Go dan hulu tiruan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-waf-inti");
    expect(d.sumber.jenis).toBe("rekaman");
    expect(d.sumber.teks).toBe("Baris pertama rekaman lab waf.txt bagian A; baris kedua tes Go, testing.txt bagian A");
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    expect(d.baris.map((b) => [b.label, b.sub])).toEqual([["Tertutup", "rekaman lab"], ["Belum tertutup", "tes Go"]]);
    expect(d.baris[0]!.simpul.map((s) => [s.teks, s.sub ?? "", s.nada])).toEqual([
      ["Payload serangan", `${payload.serangan.length} string uji generik`, "biasa"],
      ["WAF memeriksa", "Coraza dan CRS", "biasa"],
      [`${BLOKIR.ok === 403 ? 0 : 403}, ${BLOKIR.ok} dari ${BLOKIR.dari}`, "walau kunci dan tanda tangan sah", "biasa"],
    ]);
    expect(d.baris[1]!.simpul.map((s) => [s.teks, s.sub ?? "", s.nada])).toEqual([
      ["Permintaan sah", "sudah ditandatangani", "biasa"],
      ["Diputar ulang", `di dalam jendela ${TOLERANSI / 60} menit`, "biasa"],
      ["Diterima lagi", "tanpa nonce, key tak tertanda", "warn"],
    ]);
    expect(d.judul).toBe("WAF menolak serangan umum, tetapi permintaan yang diputar ulang diterima lagi");
    expect(d.catatan).toBe("Baris pertama adalah rekaman lab dengan delapan payload di payload.json. Baris kedua adalah tes Go dengan hulu tiruan: gerbang meneruskan permintaan yang diputar ulang, dan Idempotency-Key yang diganti sampai ke hulu. Kotak oranye adalah celah yang masih terbuka.");
    expect(d.baris.flatMap((b) => b.simpul.map((s) => s.teks)).join(" ").length).toBeLessThanOrEqual(150);
    expect(badan).toContain("Pintu mitra menolak serangan umum, dan satu celah masih terbuka.");
  });
  test("kartu Cek diri: empat kartu t5-waf, tanya sama dengan soal di halaman, jawaban halaman termuat dan diturunkan dari rekaman dan hitungan", () => {
    const kartu = kartuSemua.filter((x) => x.halaman === "t5-waf");
    expect(kartu.map((x) => x.id)).toEqual(["t5-waf-1", "t5-waf-2", "t5-waf-3", "t5-waf-4"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(soal).toHaveLength(4);
    expect(jawaban).toHaveLength(4);
    kartu.forEach((k, i) => {
      expect(k.judul).toBe("5.25 Keamanan 11: Pintu untuk pihak luar, kuota, WAF + ADR 56");
      expect(k.url).toBe("tahap-5/pintu-mitra-waf/");
      expect(k.tanya).toBe(soal[i]);
      expect(k.jawab).toBe(jawaban[i]);
    });
    expect(kartuSemua.filter((x) => x.id.startsWith("t5-waf-"))).toHaveLength(4);
    expect(jawaban[0]).toBe(`WAF menolak ${BLOKIR.ok} dari ${BLOKIR.dari} payload dengan 403 (\`waf.txt\` bagian A). Dari ${SAH.uji} payload sah yang lolos, ${SAH_REF} hanya mengubah teks \`referensi\`, jadi angka itu bukan ukuran alarm palsu untuk payload POS lain (bagian B).`);
    expect(jawaban[1]).toBe("Jawabannya 404, dan cakupan diperiksa di `api-t5` lewat `akun.mitra_pos_id`, bukan di gerbang. Di mode `pos-tanpa-cakupan` pembacaan yang sama dijawab 200 dengan data QR milik B (`tandatangan.txt` bagian C).");
    expect(jawaban[2]).toBe("Gerbang menerimanya, dan key lain itu sampai ke hulu (Tes Go, `testing.txt` bagian A). Tanda tangan tidak memuat Idempotency-Key dan tidak ada nonce, jadi key yang diganti tidak membatalkan tanda tangan. Bahwa `api-t5` lalu membuat QR kedua dibaca dari kode dan tidak dijalankan.");
    expect(soal[3]).toBe(`Hitung: kuota ${KUOTA} per detik untuk ${MITRA} mitra, dibanding puncak API ${puncakTulis} permintaan per detik. Apa artinya?`);
    expect(jawaban[3]).toBe(`${MITRA} × ${KUOTA} = ${ribu(TOTAL_KUOTA)} per detik, dan ${ribu(TOTAL_KUOTA)} ÷ ${puncakTulis} = ${KALI} kali puncak (Hitungan atas Asumsi). Kapasitas satu server belum diukur, jadi jumlah kuota yang boleh diberikan belum diketahui.`);
    expect(soal[0]).toBe(`Payload serangan umum datang dengan kunci dan tanda tangan yang sah. Siapa yang menolaknya, dan apa yang tidak diukur oleh ${SAH.uji} payload sah?`);
  });
});

// --- lapis 1b: kalimat berangka diturunkan dari rekaman, kode, registry, dan hitungan; tiap kalimat harus ada tepat sekali di badan
const KALIMAT_ANGKA: string[] = [
  `Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) \`waf.txt\` bagian A, WAF menolak ${BLOKIR.ok} dari ${BLOKIR.dari} payload uji dengan ${403}, walau kunci dan tanda tangannya sah. Bagian B meloloskan ${SAH.uji} dari ${SAH.uji} payload POS yang sah. Di \`kuota.txt\` bagian A jam bucket dibekukan, dan mitra A mendapat ${A.ok} jawaban 200 dan ${A.tolak} jawaban 429 dari ${A.n} permintaan. Mitra B tetap ${B.ok} dari ${B.n}.`,
  `Tes Go gerbang mencatat bahwa permintaan sah yang diputar ulang di dalam jendela ${TOLERANSI / 60} menit diterima lagi (\`testing.txt\` bagian A).`,
  `Pilah sepuluh kejadian di pintu mitra POS ke pemeriksaan yang menanganinya, lalu periksa jawabanmu.`,
  `Pihak luarnya kini ±${MITRA} penyedia POS (Asumsi, [[t5-prd]]), dan puncak seluruh API ${puncakTulis} permintaan per detik (Asumsi beban Tahap 5, [[t5-prd]]).`,
  `Lab memakai CRS ${versi.crs} di Coraza ${versi.coraza} dengan ambang masuk 5, jadi satu temuan berskor 5 sudah memblokir.`,
  `Sebaliknya, ${SAH.uji} payload POS yang sah lolos tanpa blokir. Dari ${SAH.uji} itu, ${SAH_REF} hanya mengubah teks \`referensi\`. Satu lagi POST tanpa \`referensi\`, dan dua GET status QR (${SAH_REF} + ${SAH_TANPA} + ${SAH_GET} = ${SAH_REF + SAH_TANPA + SAH_GET}, Hitungan atas bagian B):`,
  `Angka ${SAH.uji} bukan ukuran alarm palsu untuk payload POS di luar daftar itu.`,
  `**WAF bukan validasi.** Kolom \`referensi\` berisi ${KARAKTER} karakter tanpa pola serangan lolos WAF, dan \`api-t5\` menjawab ${KODE_VALIDASI} (\`waf.txt\` bagian C).`,
  `Aturan yang sama cocok dan tercatat, tetapi 0 dari ${BLOKIR.dari} payload diblokir dan jawabannya ${201} atau ${404} (\`waf.txt\` bagian D).`,
  `**Kuota dihitung per mitra di Redis.** Ada dua batas. Pertama, paling banyak ${berjalan} permintaan berjalan per mitra. Kedua, token bucket ${kuota} token per detik dengan kapasitas satu detik (Asumsi).`,
  `Jam bucket dibekukan di lab, jadi ${A.n} permintaan mitra A dihitung dalam satu detik tanpa mengukur laju sungguhan:`,
  `Isi ulang ${isiUlang[1]} milidetik menambah ${isiUlang[2]} token: ${A60.n} permintaan A menghasilkan ${A60.ok} jawaban 200. Sesudah 10 detik bucket tidak melebihi ${kuota}: ${A130.n} permintaan A menghasilkan ${A130.ok} jawaban 200 (bagian A). Di bagian B hulu ditahan ${tahan[1]},${tahan[2]} detik. Dari ${A25.n} permintaan A bersamaan, ${A25.ok} lolos dan ${A25.tolak} dijawab 429 \`${alasanBerjalan[1]}\`, sedangkan satu permintaan B tetap 200.`,
  `Bila satu permintaan berjalan lebih dari ${DETIK_BERJALAN} detik, ${berjalan} permintaan berjalan menahan mitra itu di bawah ${kuota} per detik. Itu Hitungan atas Asumsi: ${berjalan} ÷ ${kuota} = ${DETIK_BERJALAN} detik.`,
  `Tes Go \`TestGerbangKuotaSebelumTandaTangan\` mengirim ${kuota} permintaan dengan secret salah, dan semuanya dijawab 401. Sesudah itu permintaan berikutnya dijawab 429, juga permintaan kasir A yang sah, sedangkan mitra B tetap 200.`,
  `Penghitung itu baru sembuh sesudah mitra sepi selama masa berlakunya, ${NAPAS} detik di kode (Tes Go \`TestPembatasSlotBocorSembuhHanyaSesudahSepi\` memakai 600 milidetik).`,
  `Role \`t5_gerbang\` hanya punya SELECT atas lima dari enam kolom \`mitra_pos\`. Role itu tanpa INSERT, UPDATE, atau DELETE atas tabel itu, dan tanpa SELECT atas enam tabel service lain yang diperiksa (\`tandatangan.txt\` bagian F).`,
  `Toleransi timestamp ${TOLERANSI / 60} menit adalah Asumsi, sama dengan ADR ${ADR34}. Permintaan ${TOLERANSI - 60} detik lalu lolos pemeriksaan gerbang dan dijawab 404 oleh \`api-t5\`, karena QR contoh tidak ada. Permintaan ${TOLERANSI + 60} detik lalu dan ${TOLERANSI + 60} detik ke depan dijawab 401:`,
  `Isi yang diubah dari 25.000 menjadi 99.000 dijawab 401 \`tanda-tangan-salah\`. Kunci yang tidak dikenal atau milik mitra yang dibekukan dijawab 401 \`kunci-tidak-sah\` (bagian B).`,
  `Di kode gerbang satu dari empat tempat yang menjawab 401 memasangnya, yaitu \`kunci-tidak-sah\`. Jawaban \`tanda-tangan-salah\` dan \`waktu-di-luar-toleransi\` tidak (dibaca dari kode). Ini tindak lanjut, dan tidak diubah di lab.`,
  `Jadi timestamp lebih dari 292 tahun di depan lolos pemeriksaan toleransi (komentar di \`tanda.go\`; perilaku sebelum perbaikan tidak direkam).`,
  `Tes Go \`TestPeriksaTandaTimestampJauhDiDepan\` menolak enam timestamp berbeda yang bertanda tangan sah.`,
  `Pola yang sama ada di \`labs/api-t4/internal/modul/pembayaran/pembayaran.go\` baris 132 sampai 138, tanpa penjaga itu, dan tidak diubah (dibaca dari kode).`,
  `Ketiganya diterima (200 dari hulu tiruan), dan key lain itu sampai ke hulu. Pengulangan kasir yang jujur tetap menghasilkan satu QR, karena key yang sama menghasilkan id QR yang sama (\`tandatangan.txt\` bagian A).`,
  `Di sana tanda tangan menerima kiriman 60 detik lalu, dan \`event_id\` unik yang menahan kiriman ganda, bukan tanda tangan.`,
  `Mencatat nonce menyimpan tiap nilai selama dua kali toleransi, yaitu 2 × ${TOLERANSI} = ${NONCE_DETIK} detik. Alasannya timestamp boleh ${TOLERANSI} detik di depan atau di belakang. Pada ${KUOTA} per detik itu ${KUOTA} × ${NONCE_DETIK} = ${ribu(NONCE_PER_MITRA)} nonce per mitra, dan ${MITRA} × ${ribu(NONCE_PER_MITRA)} = ${ribu(NONCE_SEMUA)} untuk ±${MITRA} mitra (Hitungan atas Asumsi).`,
  `Di rekaman bagian C ada lima percobaan yang dijawab 404, dan baris \`qr\` milik merchant B tetap ${nomorBarisQrB}, yang dibuat B sendiri.`,
  `Mode rentan \`tanpa-idempoten-wajib\` mengembalikan perilaku Tahap 4: dua POST tanpa key membuat dua baris \`qr\` ([[t5-m50]]).`,
  `mTLS untuk mitra hanya disebut. [[t5-mtls]] membahas mTLS antar service, dan sertifikat client untuk ±${MITRA} mitra belum diminta (Asumsi).`,
  `Banjir paket dan SYN flood di lapisan 3 dan 4 diserahkan ke penyedia jaringan (Ilustrasi).`,
  `- Timeout 3 detik di gerbang: ada di kode, tetapi tidak direkam sebagai perilaku (Tidak dijalankan).`,
  `- Alarm palsu di luar ${SAH.uji} payload sah dan paranoia level di atas 1.`,
  `**Kenapa D dan G, bukan yang lain.**`,
  `**Keputusan: opsi D untuk menjaga pintu dan opsi G untuk identitas mitra.** Delapan aturan:`,
  `Mitra ±${MITRA} (Asumsi) dan puncak API ${puncakTulis} permintaan per detik (Asumsi).`,
  `3. Kuota per mitra adalah ${kuota} per detik dan ${berjalan} permintaan berjalan (Asumsi), dengan token bucket di Redis. Redis datang dari ADR ${ADR27} ([[t3-rate-limit-redis]]), yang menghitung percobaan login dengan jendela tetap, jadi algoritmanya lain. Redis yang tidak terjangkau dijawab 503.`,
  `4. Batas ukuran body ${KIB} KiB (Asumsi, dijawab 413) dan timeout 3 detik di kode. Timeout itu tidak direkam.`,
  `5. Kunci API per mitra tersimpan sebagai hash di \`mitra_pos.kunci_hash\`. HMAC-SHA256 menandatangani timestamp, method, alamat, dan byte mentah body dengan toleransi ${TOLERANSI / 60} menit (Asumsi). Secret penandatangan ada di penyimpanan secret, bukan di database.`,
  `8. Enumerasi tetap dibatasi: sesudah ${GAGAL_MAKS} kunci salah dari satu alamat dalam ${JENDELA_GAGAL} detik (Asumsi), kunci salah berikutnya dijawab 429, dan \`api-t5\` membatasi ${tD11[2]} QR per menit per akun (\`tandatangan.txt\` bagian D). Webhook keluar memakai aturan ADR ${ADR41} dan HMAC dari Rekeningo, dan Tidak dijalankan di lab.`,
  `- **A ditolak** karena WAF menilai isi, bukan jumlah. Pengulangan kasir yang sah tidak memuat pola serangan, jadi ${SAH.uji} dari ${SAH.uji} payload sah di rekaman lolos tanpa blokir (Penalaran dari \`waf.txt\` bagian B).`,
  `- **C ditolak** karena M50: ${KC.tolak} dari ${KC.total} permintaan mendapat 429 dan mitra B ikut (\`kuota.txt\` bagian C).`,
  `- **F ditunda** karena mTLS untuk ±${MITRA} mitra belum diminta (Asumsi), dan ia Tidak dijalankan di lab.`,
  `- Saat jumlah kuota melebihi kapasitas terukur. ${MITRA} mitra × ${kuota} per detik = ${ribu(TOTAL_KUOTA)} per detik, yaitu ${KALI} kali puncak ${puncakTulis} (Hitungan atas Asumsi: ${ribu(TOTAL_KUOTA)} ÷ ${puncakTulis} = ${koma(TOTAL_KUOTA / angka(puncakTulis), 5)}). Kapasitas satu server belum diukur, jadi kuota diturunkan sampai ukuran dasar load test ada.`,
  `- Saat ${berjalan} permintaan berjalan lebih dulu tercapai daripada ${kuota} per detik, yaitu bila satu permintaan memakan lebih dari ${DETIK_BERJALAN} detik (Hitungan atas Asumsi).`,
  `- Saat WAF menolak permintaan POS yang sah. Paranoia level 1 hampir tidak pernah memicu alarm palsu menurut dokumentasi CRS, dan ${SAH.uji} payload sah bukan ukuran alarm palsu.`,
  `- Saat Coraza kehilangan pemelihara. Pada 2026-11-04 README menulis label itu untuk plugin Caddy dan ekstensi WASM Traefik, sedangkan inti Coraza punya rilis ${versi.coraza} tanggal 2026-10-02 dan komit sampai 2026-10-29. Risikonya ke depan, dan belum terjadi.`,
  `| Paranoia level di atas 1 dan pengukuran alarm palsu | Hanya ${SAH.uji} payload sah yang diuji | Belum dijadwalkan |`,
  `| mTLS untuk mitra | Belum diminta oleh ±${MITRA} mitra (Asumsi) | Belum dijadwalkan |`,
  `**1.** Payload serangan umum datang dengan kunci dan tanda tangan yang sah. Siapa yang menolaknya, dan apa yang tidak diukur oleh ${SAH.uji} payload sah?`,
  `**4.** Hitung: kuota ${kuota} per detik untuk ${MITRA} mitra, dibanding puncak API ${puncakTulis} permintaan per detik. Apa artinya?`,
].filter((x) => x !== "");

// lapis 1b: seluruh baris badan. Kalimat berangka di atas diganti penanda §n§ (nilainya diturunkan dari sumber); sisanya dibandingkan dengan salinan di
// pintu-mitra-waf.halaman.badan.ts, yang TIDAK bisa dimatikan (TANPA_KUNCI hanya mematikan lapis 2). Dibuat ulang bersama berkas nilai oleh PERBARUI_KUNCI=1.
const maskir = (teks: string): string[] => {
  let t = teks;
  KALIMAT_ANGKA.forEach((k, i) => { t = t.split(k).join(`§${i}§`); });
  return t.split("\n").filter((b) => b.trim() !== "");
};
const badanMasker = maskir(badan);
if (process.env.PERBARUI_KUNCI === "1") {
  fs.writeFileSync(path.join(__dirname, "pintu-mitra-waf.halaman.badan.ts"), `// Dihasilkan oleh PERBARUI_KUNCI=1 (lihat pintu-mitra-waf.halaman.test.ts). Kalimat berangka diganti penanda §n§ dan diturunkan dari sumber di tes.\nexport const BADAN_STATIS: string[] = ${JSON.stringify(badanMasker, null, 1)};\n`);
}

describe("seluruh baris badan: kalimat berangka diturunkan dari sumber, sisanya sama dengan salinan statis (lapis 1b, tanpa bergantung pada kunci lapis 2)", () => {
  test("baris tak kosong sama persis dengan salinan statis, dalam urutan yang sama, dan tiap penanda kalimat berangka muncul tepat sekali", () => {
    expect(badanMasker).toEqual(BADAN_STATIS);
    const semua = badanMasker.join("\n");
    KALIMAT_ANGKA.forEach((k, i) => expect(hitungKali(semua, `§${i}§`), `penanda ${i}: ${k.slice(0, 40)}`).toBe(1));
  });
});

describe("kalimat berangka: tiap kalimat yang diturunkan ada tepat sekali di badan halaman (lapis 1b, tanpa bergantung pada kunci lapis 2)", () => {
  KALIMAT_ANGKA.forEach((k, i) => {
    test(`kalimat ${i + 1}: ${k.slice(0, 60)}`, () => {
      expect(hitungKali(badan, k), k).toBe(1);
    });
  });
});

// --- baris riset yang dibaca ke sumber primer pada 2026-11-04: kutipan, versi, tanggal, dan alamat tidak boleh berubah tanpa membuka sumbernya lagi
describe("baris riset R5-230 sampai R5-234: isi persis (kutipan, versi, tanggal, alamat), tanpa bergantung pada kunci lapis 2", () => {
  for (const id of Object.keys(RISET_TERKUNCI)) {
    test(`${id}: sama dengan baris yang dibaca ke sumber`, () => {
      expect(barisRiset(id)).toBe(RISET_TERKUNCI[id]);
    });
  }
  test("lima baris terkunci", () => {
    expect(Object.keys(RISET_TERKUNCI)).toEqual(["R5-230", "R5-231", "R5-232", "R5-233", "R5-234"]);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "wajib", "menolak", "ditolak", "berjalan", "dibaca", "diukur", "direkam", "dijalankan", "berhasil", "naik", "turun", "tepat", "lolos", "ikut", "sendiri", "bersama", "sah", "salah", "diterima", "diputar ulang", "tertanda", "ditandatangani", "sebelum tanda tangan", "per mitra", "sebagian besar", "hampir"];
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
const kartuT5waf = kartuSemua.filter((x) => x.halaman === "t5-waf");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-11-04/g) ?? []).length,
    dibacaDariKode: (halaman.match(/[Dd]ibaca dari kode/g) ?? []).length, tesGo: (halaman.match(/Tes Go/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), pilah: sidikKata(nilaiString(pilah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-230", "R5-231", "R5-232", "R5-233", "R5-234"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), pilah: h16(JSON.stringify(pilah)), kartu: h16(JSON.stringify(kartuT5waf)), istilahWaf: h16(JSON.stringify(istilahWaf)), istilahNonce: h16(JSON.stringify(istilahNonce)), glosarium: h16(glosarium.split("\n").filter((b) => /^\| \*\*(Nonce|WAF)\*\*/.test(b)).join("\n")), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), pilah: tekstual(pilah), kartu: tekstual(kartuT5waf), istilahWaf: tekstual(istilahWaf), istilahNonce: tekstual(istilahNonce) },
  riset: Object.fromEntries(["R5-230", "R5-231", "R5-232", "R5-233", "R5-234"].map((id) => [id, barisRiset(id)])),
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat pintu-mitra-waf.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n` +
    `export const RISET_TERKUNCI: Record<string, string> = ${JSON.stringify(sekarang.riset, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "pintu-mitra-waf.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, pilah, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, pilah, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.perluVerifikasi).toBe(2);
    expect(sidikSekarang.label.dibuka).toBe(13);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan pilah", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.pilah).toEqual(SIDIK.pilah);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});

describe("struktur baris kosong, panjang kalimat, dan frontmatter", () => {
  test("frontmatter: judul dan deskripsi memuat fakta halaman", () => {
    expect(frontmatter).toBe(
      'title: "5.25 Keamanan 11: Pintu untuk pihak luar, kuota, WAF + ADR 56"\n' +
        "description: Rekeningo menaruh satu gerbang di depan API untuk mitra POS, dengan WAF, kunci dan tanda tangan per mitra, kuota per mitra, dan Idempotency-Key wajib. ADR 56 menimbang cara lain dan menulis kapan pilihan ini salah, termasuk celah replay yang direkam lab.\n",
    );
  });
  test("struktur baris kosong: tiap paragraf prosa berdiri sendiri, dan tabel, Snippet, Rantai, widget, dan daftar didahului dan diikuti baris kosong; paling banyak empat kalimat", () => {
    const b = badan.split("\n");
    const prosaB = (x: string): boolean => x.trim() !== "" && !/^(\||- |<|###|\d+\. |\s)/.test(x) && !x.startsWith("*Tidak dijalankan") && !x.startsWith("*Dijalankan") && !/^(\w+\)|\w+\(|const |import |class |def |return |RateLimiter|\}\)|\]\))/.test(x);
    let dalamTag = false;
    for (let i = 0; i < b.length; i++) {
      const x = b[i]!;
      if (/^<Snippet/.test(x) && !x.endsWith("/>")) dalamTag = true;
      if (dalamTag) { if (x.endsWith("/>")) dalamTag = false; continue; }
      const sebelum = i > 0 ? b[i - 1]! : "";
      const sesudah = i < b.length - 1 ? b[i + 1]! : "";
      if (/^(<Snippet|<Rantai|<WidgetLama)/.test(x)) {
        expect(sebelum, `baris ${i + 1} (${x.slice(0, 20)}) didahului baris kosong`).toBe("");
        expect(sesudah, `baris ${i + 1} (${x.slice(0, 20)}) diikuti baris kosong`).toBe("");
      }
      if (x.startsWith("|") && !sebelum.startsWith("|")) expect(sebelum, `tabel di baris ${i + 1} didahului baris kosong`).toBe("");
      if (x.startsWith("|") && !sesudah.startsWith("|")) expect(sesudah, `tabel di baris ${i + 1} diikuti baris kosong`).toBe("");
      if (x.startsWith("- ") && !sebelum.startsWith("- ")) expect(sebelum, `daftar di baris ${i + 1} didahului baris kosong`).toBe("");
    }
    for (const x of b.filter((l) => prosaB(l) && !l.startsWith("**Yang tidak direkam"))) expect(x.split(SPLIT).length, x.slice(0, 50)).toBeLessThanOrEqual(5);
  });
  test("tiap kalimat prosa halaman paling banyak 35 kata, dan judul halaman hanya muncul di frontmatter dan kartu", () => {
    for (const x of badan.split("\n").filter((l) => l.trim() !== "" && !/^(\||<|###|- |\d+\. |\s|\*Tidak|\*Dijalankan|\w+\(|const |\}\))/.test(l))) {
      for (const k of x.replace(/^\*\*[^*]+\*\* /, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").split(SPLIT)) expect(k.trim().split(/\s+/).length, k.slice(0, 60)).toBeLessThanOrEqual(35);
    }
    expect(hitungKali(badan, "5.25 Keamanan 11")).toBe(0);
  });
});

// --- penutup celah yang ditemukan tinjauan independen (keputusan 1599): kalimat naratif yang sebelumnya hanya dijaga kunci kalimat dan salinan statis.
// Tiap tes mengikat satu kalimat halaman ke sumbernya (kode, tes Go, rekaman, README, payload.json), jadi kalimat yang berubah dan kunci yang dibuat
// ulang tetap gagal di sini. Yang tetap hanya dijaga kunci: kalimat Penalaran ("200 kosong membuatnya mengira QR sudah dibuat") dan kalimat cerita.
describe("kalimat naratif terikat ke kode, tes Go, dan rekaman, tanpa bergantung pada kunci (tinjauan 1599)", () => {
  const gerbangTes = baca("labs/t5-waf/gerbang/gerbang_test.go");
  const servicePos = baca("labs/api-t5/internal/service/pos.go");
  const satu = (kalimat: string): void => {
    expect(hitungKali(badan, kalimat), kalimat).toBe(1);
  };
  const kata = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
  test("jumlah payload per kelas di kalimat halaman sama dengan payload.json", () => {
    const n = (k: string): number => payload.serangan.filter((x) => x.kelas === k).length;
    const semua = payload.serangan.length;
    const besar = kata[semua]![0]!.toUpperCase() + kata[semua]!.slice(1);
    satu(`${besar} payload di \`payload.json\` terdiri dari ${kata[n("sqli")]} SQL injection, ${kata[n("xss")]} XSS, dan ${kata[n("traversal")]} naik direktori (dibaca dari kode).`);
    expect(n("sqli") + n("xss") + n("traversal")).toBe(semua);
  });
  test("metode yang wajib Idempotency-Key di kalimat halaman sama dengan metodeUbah di gerbang.go dan tes Go gerbang", () => {
    const fn = cari(/func metodeUbah\(m string\) bool \{\n\treturn ([^\n]+)\n\}/, gerbangGo, "metodeUbah")[1]!;
    expect([...fn.matchAll(/http\.Method(\w+)/g)].map((x) => x[1]!.toUpperCase())).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
    expect(gerbangTes).toContain('for _, m := range []string{"POST", "PUT", "PATCH", "DELETE"} {');
    const daftar = "POST, PUT, PATCH, dan DELETE";
    satu(`Gerbang menolak ${daftar} tanpa Idempotency-Key dengan 400.`);
    satu(`7. Idempotency-Key wajib untuk ${daftar}, dan permintaan tanpa key dijawab 400.`);
    satu(`| 7 | Idempotency-Key untuk ${daftar} | 400 |`);
  });
  test("galat WAF dan Redis yang tidak terjangkau dijawab 503 tanpa memanggil hulu; WrapHandler bawaan menjawab 200 kosong", () => {
    expect(gerbangGo).toContain('tolak(w, 503, "waf-gagal", "Pemeriksaan permintaan tidak bisa dijalankan")');
    expect(gerbangGo).toContain('tolak(w, 503, "kuota-tidak-tersedia", "Kuota tidak bisa diperiksa")');
    expect(gerbangTes).toMatch(/func TestGerbangWAFGagalTertutup[^]*?503, "waf-gagal"[^]*?n != 0[^]*?padahal WAF gagal/);
    expect(gerbangTes).toMatch(/func TestGerbangRedisMati[^]*?503, "kuota-tidak-tersedia"[^]*?n != 0[^]*?padahal Redis mati/);
    expect(tinjauTest).toContain("if dipanggil || rec.Code != 200 || rec.Body.Len() != 0 {");
    expect(tinjauTest).toContain("yang dicatat: tidak dipanggil, 200, kosong");
    satu("Galat WAF dijawab 503.");
    satu("Redis yang tidak terjangkau dijawab 503.");
    satu("Redis yang tidak terjangkau dijawab 503 `kuota-tidak-tersedia`, dibuktikan Tes Go `TestGerbangRedisMati`.");
    satu("Gerbang lab menulis middleware sendiri yang menjawab 503 `waf-gagal`.");
    satu("Di kedua perilaku `api-t5` tidak dipanggil.");
    satu("Ia tidak memanggil handler berikutnya dan tidak menulis jawaban, jadi client menerima 200 kosong");
  });
  test("kunci API bocor tanpa secret tetap menghabiskan kuota mitra: tes Go, README, dan kalimat halaman", () => {
    const fn = cari(/func TestGerbangKuotaSebelumTandaTangan[^]*?\n\}\n/, tinjauTest, "tes kuota sebelum tanda tangan")[0];
    expect(fn).toContain("for i := 0; i < 100; i++ {");
    expect(fn).toContain('kunciA, "rahasia-lain", "GET", uriQR+"/x", ""), 401, "tanda-tangan-salah")');
    expect(fn).toContain('kunciA, "rahasia-lain", "GET", uriQR+"/x", ""), 429, "kuota-terlampaui")');
    expect(fn).toContain('kunciA, rahasiaA, "GET", uriQR+"/x", ""), 429, "kuota-terlampaui") // kasir A yang sah ikut terkena');
    expect(fn).toContain('kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "")');
    expect(readmeLab).toContain("kunci API yang bocor tanpa rahasia penandatangannya masih bisa menghabiskan kuota mitra pemiliknya");
    satu("Akibatnya kunci API yang bocor tanpa secret penandatangannya tetap bisa menghabiskan kuota mitra pemiliknya.");
    satu("Tes Go `TestGerbangKuotaSebelumTandaTangan` mengirim 100 permintaan dengan secret salah, dan semuanya dijawab 401. Sesudah itu permintaan berikutnya dijawab 429, juga permintaan kasir A yang sah, sedangkan mitra B tetap 200.");
  });
  test("pencarian kunci: kunci kosong tidak menyentuh database, kunci tidak kosong menyentuhnya sebelum kunciGagal", () => {
    expect(gerbangGo).toContain('func (g *Gerbang) cari(ctx context.Context, kunci string) (Mitra, bool, error) {\n\tif strings.TrimSpace(kunci) == "" {\n\t\treturn Mitra{}, false, nil\n\t}\n\treturn g.Toko.CariKunci(ctx, SidikKunci(kunci))\n}');
    expect(mainGo).toContain("SELECT id, nama, status, kuota_per_detik FROM mitra_pos WHERE kunci_hash = $1");
    expect(gerbangGo.indexOf("g.cari(ctx, kunci)")).toBeGreaterThan(0);
    expect(gerbangGo.indexOf("g.cari(ctx, kunci)")).toBeLessThan(gerbangGo.indexOf("g.kunciGagal(ctx, w, ip)"));
    satu("Jadi tiap permintaan yang lolos WAF dan rute, dengan kunci tidak kosong, menyentuh database, juga yang akhirnya dijawab 429.");
  });
  test("secret penandatangan tidak ada di database: berkas rahasia untuk gerbang, dan query hanya membaca kolom mitra_pos tanpa rahasia", () => {
    expect(mainGo).toContain('flag.String("rahasia-berkas"');
    expect(mainGo).not.toMatch(/SELECT[^`]*rahasia/i);
    expect(gerbangGo).toMatch(/Rahasia\s+map\[int64\]string \/\/ rahasia tanda tangan per mitra, dari penyimpanan rahasia \(bukan dari database\)/);
    expect(readmeLab).toContain("Rahasia penandatangan per mitra datang dari penyimpanan rahasia tiruan (file JSON di folder sementara), bukan dari database");
    satu("Secret penandatangan tiap mitra berbeda dari kunci API dan tidak ada di database. Lab membacanya dari file JSON sementara sebagai penyimpanan secret tiruan.");
  });
  test("key baru menjadi permintaan baru: KlaimKunci mengklaim lewat INSERT ... ON CONFLICT (kunci), dan hanya key yang sama diperlakukan ulang", () => {
    expect(idempotenRepo).toContain("ON CONFLICT (kunci) DO UPDATE");
    expect(idempotenRepo).toContain("if n, _ := h.RowsAffected(); n == 1 {\n\t\treturn KlaimBaru, nil, nil");
    expect(idempotenRepo).toContain("case status == \"selesai\":\n\t\treturn KlaimUlang, respons, nil");
    satu("Klaim key di `api-t5` adalah `INSERT ... ON CONFLICT (kunci)`, jadi key baru menjadi permintaan baru (dibaca dari kode `KlaimKunci`).");
  });
  test("merchant milik mitra lain, yang tidak ada, dan akun yang bukan merchant dijawab 404 yang sama di api-t5", () => {
    const wajib = posGo.slice(posGo.indexOf("func (s Server) wajibMitra"), posGo.indexOf("// POST /pos/v1/merchant"));
    expect(hitungKali(wajib, 'tidakDitemukan(w, "Merchant")')).toBe(2);
    expect(wajib).toContain("s.svc.MerchantMilikMitra(r.Context(), merchant, mitra)");
    expect(servicePos).toContain('return jenis == "merchant" && m.Valid && m.Int64 == mitra, nil');
    expect(servicePos).toContain("if errors.Is(err, repo.ErrTidakAda) {\n\t\treturn false, nil");
    satu("Merchant milik mitra lain, merchant yang tidak ada, dan akun yang bukan merchant dijawab 404 yang sama (pola ADR 7, [[t1-idor]]).");
  });
  test("gerbang tidak memeriksa cakupan merchant dan membuang kepala identitas dari client", () => {
    expect(gerbangGo + kuotaGo + wafGo + mainGo + tandaGo).not.toMatch(/merchant|mitra_pos_id|MerchantMilik/i);
    expect(gerbangGo).toMatch(/HeaderMitra\s+= "X-Mitra-Id"/);
    expect(gerbangGo).toMatch(/HeaderRahasiaGerbang\s+= "X-Gerbang-Rahasia"/);
    expect(gerbangGo).toContain("for _, h := range []string{HeaderMitra, HeaderRahasiaGerbang, HeaderKunci, HeaderTanda, HeaderWaktu} {\n\t\tr.Header.Del(h)\n\t}");
    expect(gerbangGo).toContain("r.Header.Set(HeaderMitra, strconv.FormatInt(mitra.ID, 10))\n\tr.Header.Set(HeaderRahasiaGerbang, g.RahasiaHulu)");
    satu("Gerbang tidak memeriksanya. Handler di `api-t5`");
    satu("Gerbang membuang kepala `X-Mitra-Id` dan `X-Gerbang-Rahasia` dari client, lalu memasang yang ia buat sendiri (dibaca dari kode).");
  });
  test("Idempotency-Key menjaga pengulangan kasir, bukan replay: README, tes Go, dan kalimat halaman", () => {
    expect(readmeLab).toContain("`Idempotency-Key` menjaga pengulangan kasir yang jujur: key yang sama menghasilkan QR yang sama");
    expect(testingRek).toContain("--- PASS: TestGerbangPutarUlangDalamJendelaDiterima");
    satu("Idempotency-Key melindungi pengulangan kasir, bukan permintaan yang diputar ulang pihak lain.");
  });
  test("opsi ADR: A, B, C, E ditolak, F ditunda, D dan G dipilih", () => {
    const keputusan = [...badan.matchAll(/^- \*\*([A-G]) (ditolak|ditunda)\*\*/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(keputusan).toEqual(["A ditolak", "B ditolak", "C ditolak", "E ditolak", "F ditunda"]);
    satu("**Keputusan: opsi D untuk menjaga pintu dan opsi G untuk identitas mitra.** Delapan aturan:");
  });
  test("pre-mortem butir 2 dan pembatas: TLS di tepi, key tertanda, dan nonce tidak ada di rekaman; pembatas tanpa library", () => {
    expect(testingRek).not.toMatch(/nonce|tertanda/i);
    expect(readmeLab).toContain("TLS di tepi Tidak dijalankan di lab ini.");
    satu("Ketiganya Tidak dijalankan di lab.");
    expect(gerbangMod).not.toMatch(/limiter|ratelimit|rate-limit|golang\.org\/x\/time/i);
    expect(kuotaGo).toContain("var skripBucket = redis.NewScript(");
    satu("Pembatas ini ditulis sendiri dan tidak memakai library rate limit.");
  });
  test("kalimat sumber di halaman cocok dengan baris riset: kategori RFC, versi Go, tanggal paket, dan label stack", () => {
    const r227 = barisRiset("R5-227"), r232 = barisRiset("R5-232"), r233 = barisRiset("R5-233");
    satu("[RFC 9421](https://www.rfc-editor.org/rfc/rfc9421#section-7.2.2), Standards Track, dibuka 2026-11-04");
    expect(r232).toContain("RFC 9421 (Standards Track, Februari 2024)");
    satu("[RFC 3022](https://www.rfc-editor.org/rfc/rfc3022), Informational, dibuka 2026-11-04");
    expect(r227).toContain("RFC 3022 (rfc-editor.org/rfc/rfc3022, Januari 2001, Informational,");
    satu("go1.27.1 lokal sedangkan lab memakai go1.27.3");
    expect(r232).toContain("toolchain go1.27.1 lokal");
    expect(gerbangMod).toMatch(/^go 1\.27\.3$/m);
    satu("8.7.3 (npm, diubah 2026-11-02), dibuka 2026-11-04");
    expect(r233).toContain("express-rate-limit 8.7.3 (npm, diubah 2026-11-02T18:37:21Z)");
    satu("[Laravel 13.x: Routing](https://laravel.com/docs/13.x/routing#rate-limiting)");
    expect(r233).toContain("Laravel 13.x (`laravel/framework` v13.40.0 di Packagist");
    satu("halaman itu menaruh penghitung di Redis lewat Upstash");
    expect(r233).toContain("hitungan di Redis lewat Upstash");
    satu("Serverpod 4.1.0 di pub.dev, terbit 2026-10-31)");
    expect(r233).toContain("Serverpod 4.1.0 (pub.dev, terbit 2026-10-31T16:19:50Z;");
  });
  test("klaim baru tinjauan: dari header hanya timestamp ikut ditandatangani, arti HMAC sama dengan 4.7, dan pre-mortem tiga penyebab dalam enam bulan", () => {
    expect(gerbangGo).toMatch(/PeriksaTanda\(rahasia, g\.Sekarang\(\), g\.Toleransi, r\.Header\.Get\(HeaderWaktu\), r\.Header\.Get\(HeaderTanda\),\s+r\.Method, r\.URL\.RequestURI\(\), isi\)/);
    expect(tandaGo).toContain("func TandaTangan(rahasia string, ts int64, method, uri string, body []byte) string {");
    satu("Tanda tangan gerbang tidak memuat nonce, dan dari header hanya nilai timestamp (`X-Waktu`) yang ikut dihitung. `Idempotency-Key`, `Content-Type`, dan `Host` tidak ikut (README lab dan fungsi `TandaTangan`, dibaca dari kode).");
    expect(hal47).toContain("HMAC adalah nilai kriptografi dari data dan rahasia bersama, jadi hanya pihak yang tahu rahasia yang bisa membuatnya");
    expect(glosJson.find((g) => g.t.startsWith("HMAC"))!.d).toContain("Nilai yang dihitung dari isi pesan dan rahasia bersama");
    satu("HMAC, yang dipakai di widget, adalah nilai yang dihitung dari isi pesan dan secret bersama, jadi hanya pemegang secret yang bisa membuatnya ([[t4-webhook]]).");
    satu("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    const pm = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pm.matchAll(/^(\d)\. /gm)].map((x) => x[1])).toEqual(["1", "2", "3"]);
  });
  test("kepala empat rekaman sama pada baris versi, README memuat versi Coraza, mode kuota-bersama memakai satu kunci, dan 3.17 menulis jendela tetap", () => {
    const kepala = [wafBaris, kuotaBaris, tandaBaris, testingRek.split("\n")].map((b) => b[1]);
    expect(new Set(kepala).size).toBe(1);
    expect(readmeLab).toContain(`| Coraza | ${versi.coraza} (Apache-2.0) |`);
    expect(gerbangGo).toContain('if g.Rentan[RentanKuotaBersama] {\n\t\tkuncikuota = "bersama"\n\t}');
    expect(hal317).toContain("**Jendela tetap menggantikan token bucket.**");
    satu("yang menghitung percobaan login dengan jendela tetap, jadi algoritmanya lain.");
  });
});
