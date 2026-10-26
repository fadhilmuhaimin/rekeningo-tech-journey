// Penjaga halaman 3.20 (keputusan 1076 sampai 1078): angka, jam, kunci, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim negatif berlingkup, diagram Rantai, skenario alur t3-m24.json, dan kartu Cek diri di m24-stok-kembali.mdx diturunkan
// dari rekaman labs/t3-offline (m24.txt, versi.txt, kunci24.txt), kode lab api-t3 (repo, service, handler, tes Go), README
// dan run.py lab, naskah Tahap 3, registry, baris riset R3-195 dan R3-196, dan halaman tetangga (2.13, 2.14, 3.1, 3.2, 3.4, 3.5),
// bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.17): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI mengunci SETIAP baris badan
// halaman, dan tes lain menurunkan nilai yang diklaim dari sumbernya karena kalimat terkunci tidak menangkap SALAHNYA kalimat.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m24-stok-kembali.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

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

const BERKAS = "situs/src/content/docs/tahap-3/m24-stok-kembali.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const SKENARIO = "situs/lama/widgets/data/skenario/t3-m24.json";
const skenarioMentah = baca(SKENARIO);
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const rekaman = baca("labs/t3-offline/output/m24.txt");
const versiTxt = baca("labs/t3-offline/output/versi.txt");
const kunci24 = baca("labs/t3-offline/output/kunci24.txt");
const runPy = baca("labs/t3-offline/run.py");
const readmeLab = baca("labs/t3-offline/README.md");
const KATALOG = "labs/api-t3/internal/repo/katalog.go";
const REPO_IDEM = "labs/api-t3/internal/repo/idempoten.go";
const SVC_IDEM = "labs/api-t3/internal/service/idempoten.go";
const katalogGo = baca(KATALOG);
const repoIdem = baca(REPO_IDEM);
const svcIdem = baca(SVC_IDEM);
const svcTest = baca("labs/api-t3/internal/service/idempoten_test.go");
const handlerGo = baca("labs/api-t3/internal/handler/handler.go");
const hal213 = baca("situs/src/content/docs/tahap-2/m10-dibayar-dua-kali.mdx");
const hal214 = baca("situs/src/content/docs/tahap-2/retry-idempotency.mdx");
const hal31 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal32 = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const hal34 = baca("situs/src/content/docs/tahap-3/dua-tempat-commit.mdx");
const hal35 = baca("situs/src/content/docs/tahap-3/skema-data.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Layar { judul?: string; waktu?: string; nada?: string; sinyal?: number; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
interface Langkah { dari: string; ke?: string; lapisan?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, Layar> }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string; lapisan?: string[] }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;

// ---- pembaca rekaman: bagian, nomor baris, nilai -----------------------------------------------------------------------
function rek(teks: string) {
  const b = teks.split("\n");
  const nomor = (ok: (x: string) => boolean, dariIdx = 0): number => {
    const i = b.findIndex((x, n) => n >= dariIdx && ok(x));
    expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const awal = (h: string) => nomor((x) => x.startsWith(`# --- ${h}. `));
  const akhirSebelum = (n: number): number => {
    let i = n - 1;
    while (b[i - 1]!.trim() === "") i--;
    return i;
  };
  const antara = (a: number, z: number) => b.slice(a - 1, z).join("\n");
  return { b, nomor, awal, akhirSebelum, antara };
}
const M = rek(rekaman);
const V = rek(versiTxt);
const A0 = M.awal("A"), B0 = M.awal("B"), C0 = M.awal("C"), D0 = M.awal("D");
const bagA = M.antara(A0, M.akhirSebelum(B0));
const bagB = M.antara(B0, M.akhirSebelum(C0));
const bagC = M.antara(C0, M.akhirSebelum(D0));
const bagD = M.antara(D0, M.b.length);
const VA0 = V.awal("A"), VB0 = V.awal("B"), VC0 = V.awal("C"), VD0 = V.awal("D");
const vBagA = V.antara(VA0, V.akhirSebelum(VB0));
const vBagB = V.antara(VB0, V.akhirSebelum(VC0));
const vBagC = V.antara(VC0, V.akhirSebelum(VD0));
const vBagD = V.antara(VD0, V.b.length);

interface Produk { id: number; harga: number; stok: number; versi: number }
const jawabanMentah = (teks: string, id: number): string[] => teks.split("\n").filter((l) => l.startsWith(`{"id":${id},`));
const jawaban = (teks: string, id: number): Produk[] => jawabanMentah(teks, id).map((l) => JSON.parse(l) as Produk);
const kunciPut = (teks: string, produk: number): string => cocok(teks, new RegExp(`-X PUT '/produk/${produk}/stok'[^\\n]*Idempotency-Key: "([0-9a-f-]+)"`))[1]!;
const badanPerintah = (teks: string, ciri: string): string => cocok(teks.split("\n").find((l) => l.includes(ciri))!, /-d '(.*)'$/)[1]!;
const barisTabel = (teks: string, nama: string): [number, number][] =>
  [...teks.matchAll(new RegExp(`^\\s*\\d+\\s+\\| ${nama}\\s+\\| (?:\\d+\\s+\\| )?(\\d+)\\s+\\| (\\d+)\\s*$`, "gm"))].map((m) => [Number(m[1]), Number(m[2])]);

const KUNCI_AYAM = kunciPut(bagA, 61);
const KUNCI_NASI = kunciPut(bagA, 1);
const AYAM_JUMAT_MENTAH = jawabanMentah(bagA, 61)[0]!;
const NASI_JUMAT_MENTAH = jawabanMentah(bagA, 1)[0]!;
const AYAM_SABTU_MENTAH = jawabanMentah(bagB, 61)[0]!;
const AYAM_SENIN_MENTAH = jawabanMentah(bagD, 61)[0]!;
const AYAM_JUMAT = jawaban(bagA, 61)[0]!, AYAM_SABTU = jawaban(bagB, 61)[0]!, AYAM_SENIN = jawaban(bagD, 61)[0]!;
const NASI_SABTU = jawaban(bagB, 1)[0]!;
const KATALOG_BUDI_MENTAH = cocok(bagD, /^Ayam geprek: (\{.*\})$/m)[1]!;
const KATALOG_BUDI = JSON.parse(KATALOG_BUDI_MENTAH) as Produk;

// ---- jam lab: hari dan jam dihitung dari lompatan jam, bukan ditulis tangan ------------------------------------------------
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const JUMAT = Date.UTC(2026, 9, 23, 16, 50);
const hariJam = (jam: number): string => {
  const d = new Date(JUMAT + jam * 3600_000);
  return `${HARI[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
const lompatan = [...rekaman.matchAll(/^# Jam lab: (\w+ \d\d\.\d\d) \((\d+) jam sesudah Jumat 16\.50\)\. Ilustrasi mekanisme: waktu diperankan, tidak ada yang menunggu \d+ jam$/gm)].map((m) => ({ label: m[1]!, jam: Number(m[2]) }));

// ---- kode lab: nomor baris diturunkan dari isi ----------------------------------------------------------------------------
const kodeBaris = (kode: string): string[] => kode.split("\n");
const nomorKode = (kode: string, ok: (b: string) => boolean, dariIdx = 0): number => {
  const i = kodeBaris(kode).findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris kode tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const potongKode = (kode: string, a: number, z: number): string => kodeBaris(kode).slice(a - 1, z).join("\n");
const ubah0 = nomorKode(katalogGo, (b) => b.startsWith("func (r Repo) UbahProduk("));
const ubahQ0 = nomorKode(katalogGo, (b) => b === "\terr = r.db.QueryRowContext(ctx, `", ubah0);
const ubahQ1 = nomorKode(katalogGo, (b) => b.includes("RETURNING id, harga, stok, versi`, id, akun, harga, stok, versi).Scan("), ubahQ0);
const timpa0 = nomorKode(repoIdem, (b) => b.startsWith("func (r Repo) TimpaStok("));
const timpaQ0 = nomorKode(repoIdem, (b) => b === "\terr := r.db.QueryRowContext(ctx, `", timpa0);
const timpaQ1 = nomorKode(repoIdem, (b) => b.includes("Scan(&h.ID, &h.Harga, &h.Stok, &h.Versi)"), timpaQ0);
const klaim0 = nomorKode(repoIdem, (b) => b.startsWith("func (r Repo) KlaimKunci("));
const klaimQ0 = nomorKode(repoIdem, (b) => b === "\th, err := r.db.ExecContext(ctx, `", klaim0);
const klaimQ1 = nomorKode(repoIdem, (b) => b.includes("WHERE kunci_idempotensi.kedaluwarsa <= $4`"), klaimQ0);
const umur = nomorKode(svcIdem, (b) => b === "const UmurKunci = 24 * time.Hour");
const svcKlaim0 = nomorKode(svcIdem, (b) => b.startsWith("func (s Service) KlaimKunci("));
const svcKlaim1 = nomorKode(svcIdem, (b) => b === "}", svcKlaim0);

// ---- rentang rekaman yang tampil di Snippet --------------------------------------------------------------------------------
const SA0 = M.nomor((b) => b.startsWith("=> SELECT id, nama, harga, stok, versi FROM produk WHERE id IN (61, 1)"), A0);
const SA1 = M.nomor((b) => b === AYAM_JUMAT_MENTAH, SA0);
const SB0 = M.nomor((b) => b.startsWith("# Jam lab: Sabtu 07.50"), B0);
const SB1 = M.nomor((b) => b === AYAM_SABTU_MENTAH, SB0);
const SC0 = M.nomor((b) => b.startsWith("# Jam lab: Sabtu 09.50"), C0);
const SC1 = M.nomor((b) => b === "(1 row)", SC0);
const SD0 = M.nomor((b) => b.startsWith("# Jam lab: Senin 06.50"), D0);
const SD1 = M.nomor((b) => b === AYAM_SENIN_MENTAH, SD0);
const SE0 = M.nomor((b) => b.startsWith("=> SELECT id, nama, stok, versi FROM produk WHERE id = 61"), SD1);
const SE1 = M.nomor((b) => b.startsWith("Ayam geprek: "), SE0);
const SV0 = V.nomor((b) => b.startsWith("$ curl -i -X POST '/sinkron'") && b.includes('"kunci": "ani-hp1-0302"'), VC0);
const SV1 = V.nomor((b) => b.startsWith('{"sekarang":{"id":361'), SV0);

const entri = (re: RegExp): RegExpMatchArray => cocok(badan, re);
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return {
      berkas: atribut("file") ?? [...t.matchAll(/"([^":]+):(\d+):(\d+)"/g)].map((x) => `${x[1]}:${x[2]}:${x[3]}`).join(" + "),
      lines: atribut("lines"),
      judul: atribut("title"),
    };
  });
const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.20 ada, masalah, bukan jalur inti, prasyarat 2.14, lab t3-offline, peran mobile dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t3-m24")).toMatchObject({ ada: true, nomor: "3.20", jenis: "masalah", prasyarat: ["t2-idempotency"], lab: ["t3-offline"], tahap: 3, peran: ["mobile", "backend"] });
    expect(dari("t3-m24").inti).toBeUndefined();
    expect(dari("t2-idempotency").nomor).toBe("2.14");
    expect(frontmatter).toContain('title: "3.20 M24: Stok yang kembali ke angka lama"');
    expect(dari("t3-m24").judul).toBe("M24: Stok yang kembali ke angka lama");
    expect(naskah).toContain("| 3.20 | 4 | M24: Stok yang kembali ke angka lama | Masalah |  | t3-offline | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t2-idempotency\]\]<\/p>/);
    expect(dari("t3-m24").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan peta naskah dan registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t2-idempotency", "t2-m10", "t3-dua-tempat", "t3-m22", "t3-offline", "t3-prd", "t3-skema"]);
    const sesuai: [string, string, string][] = [
      ["t2-m10", "2.13", "M10: Nasi goreng dibayar dua kali"], ["t2-idempotency", "2.14", "Retry dan idempotency key"], ["t3-dua-tempat", "3.4", "Dua tempat"],
      ["t3-m22", "3.16", "M22"], ["t3-offline", "3.21", "Offline-first dan sinkron"], ["t3-prd", "3.1", "PRD v3"], ["t3-skema", "3.5", "Skema data"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("3.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t3-offline").adr).toEqual([29]);
    expect(dari("t3-offline").ada, "3.21 belum ditulis: tautannya tampil (segera) sampai halaman itu merge").toBeDefined();
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 3.20 ditepati: 3.4 (pola dua tempat kembali di queue HP), 3.5 (umur key dan operasi_sinkron), 2.14 (kapan ADR 14 salah), 3.2, 3.1 (P1 offline)", () => {
    expect(hal34).toContain("queue offline di HP ([[t3-m24]])");
    expect(hal34).toContain("Halaman itu yang merekamnya.");
    expect(hal34).toContain("([[t3-m22]])");
    expect(hal35).toContain("| (tidak ada) | `operasi_sinkron` (kunci, perangkat, produk, jenis, nilai, versi_dasar, status) | Operasi dari queue offline dikenali sampai 14 hari | [[t3-m24\\|M24]] |");
    expect(hal35).toContain("Offline tidak memperpanjangnya; versi baris yang menjaga (ADR 29) | [[t3-m24\\|M24]] |");
    expect(hal35).toContain("`kunci_idempotensi` berumur 24 jam");
    expect(hal214).toContain("**Kapan keputusan ini salah.** Saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama. Contohnya queue offline");
    expect(hal32).toContain("queue offline di HP ([[t3-m24]])");
    expect(hal31).toContain("| P1 | Mode offline di app warung | Ubah stok dan harga tanpa sinyal, tersinkron saat sinyal kembali; pembayaran tidak pernah offline |");
    expect(hal213).toMatch(/sinyal[^.]{0,60}putus/);
    harus("- [[t2-idempotency]]: ADR 14 menulis kapan keputusannya salah, yaitu saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama. M24 adalah kejadiannya.");
    harus("- [[t3-dua-tempat]]: queue di HP adalah perantara yang berisi keputusan Jumat, sedangkan PostgreSQL berisi keadaan Senin. Pola yang sama muncul di [[t3-m22]].");
    harus("- [[t3-skema]]: tabel `operasi_sinkron` dan umur key 24 jam sudah tercatat di skema Tahap 3, dengan M24 sebagai alasannya.");
    harus("- [[t3-prd]]: mode offline untuk stok dan harga adalah P1 di PRD v3, dan pembayaran tidak pernah offline.");
  });
  test("halaman tidak membuka isi 3.21: ADR 29 dan optimistic lock hanya di Konsep yang lahir; tanpa CRDT, last-write-wins, atau queue pembayaran", () => {
    expect(hitung(badan, "ADR 29")).toBe(1);
    expect(hitung(badan, "optimistic lock")).toBe(1);
    expect(badan.indexOf("ADR 29")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(badan.indexOf("optimistic lock")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(badan).not.toMatch(/CRDT|last[- ]write|queue pembayaran|7 hari|tujuh hari/i);
    expect(hitung(badan, "ADR 14")).toBe(1);
  });
});

describe("naskah M24 dan jam: gejala, angka cerita, dan hitungan hari", () => {
  const barisM24 = naskah.split("\n").find((b) => b.startsWith("| M24 |"))!;
  test("baris M24 di naskah memuat Senin 07.05, 30 porsi, ucapan Ani, 62 jam Asumsi, 17 jam dikenali dan 62 jam tidak, dan dugaan Raka", () => {
    expect(barisM24).toContain('Senin 07.05 app Budi menunjukkan ayam geprek "habis", padahal Ani mengisi 30 porsi lewat dasbor hari Sabtu.');
    expect(barisM24).toContain('Ani: "Jumat sore saya catat habis, itu sudah lewat dua hari."');
    expect(barisM24).toContain("Dasbor atau jam HP yang salah");
    expect(barisM24).toContain("62 jam, Asumsi; lab memerankan 16.50 sampai 06.50, juga 62 jam");
    expect(barisM24).toContain("ulangan 17 jam dikenali dan 62 jam tidak; angka 24 jam persis dijaga tes Go, bukan rekaman");
    expect(barisM24).toContain("ADR 29: offline hanya stok dan harga");
    expect(naskah).toMatch(/\| M24 \| 7 \|/);
    harus("Minggu 7 Tahap 3. Senin pukul 07.05 Budi membuka app untuk memesan ayam geprek di warung Ani. Menu itu tertulis \"habis\".");
    harus('Ani: "Jumat sore saya catat habis, itu sudah lewat dua hari."');
    harus("Ani mengisi 30 porsi ayam geprek lewat dasbor hari Sabtu.");
  });
  test("jam lab: tiap lompatan di rekaman (15, 17, 62 jam) sesuai hari dan jam yang ditulis, dihitung dari Jumat 16.50 2026-10-23", () => {
    expect(hariJam(0)).toBe("Jumat 16.50");
    expect(lompatan).toEqual([{ label: "Sabtu 07.50", jam: 15 }, { label: "Sabtu 09.50", jam: 17 }, { label: "Senin 06.50", jam: 62 }]);
    for (const l of lompatan) expect(hariJam(l.jam), `${l.jam} jam`).toBe(l.label);
    expect(hariJam(24)).toBe("Sabtu 16.50");
    expect(svcTest).toContain("t0 := time.Date(2026, 10, 23, 16, 50, 0, 0, time.UTC) // Jumat 16.50");
    expect(runPy).toContain("def ke_jam(jam_sejak_jumat, label):");
    expect(runPy).toContain('ke_jam(15, "Sabtu 07.50")');
    expect(runPy).toContain('ke_jam(17, "Sabtu 09.50")');
    expect(runPy).toContain('ke_jam(62, "Senin 06.50")');
  });
  test("62 jam: Jumat 17.00 sampai Senin 07.00 dan Jumat 16.50 sampai Senin 06.50 sama-sama 62 jam; Asumsi naskah dan README lab", () => {
    expect((Date.UTC(2026, 9, 26, 7, 0) - Date.UTC(2026, 9, 23, 17, 0)) / 3600_000).toBe(62);
    expect((Date.UTC(2026, 9, 26, 6, 50) - JUMAT) / 3600_000).toBe(62);
    expect(readmeLab).toContain("Akhir pekan warung berlangsung 62 jam, dari Jumat 17.00 sampai Senin 07.00 (Asumsi naskah).");
    harus("*Angka cerita (Ilustrasi):* Senin 07.05, \"dua hari\", dan 30 porsi berasal dari naskah. Lama offline 62 jam, dari Jumat 16.50 sampai Senin 06.50, adalah Asumsi naskah: warung tutup Jumat 17.00 sampai Senin 07.00.");
    harus("Jam di layar HP pada widget mengikuti jam lab, bukan 07.05.");
    // semua jam di halaman: jam lab, 07.05 naskah, warung tutup 17.00 dan buka 07.00, dan 17.11 (versi PostgreSQL di rekaman)
    expect([...new Set(badan.match(/\b\d{2}\.\d{2}\b/g)!)].sort()).toEqual(["06.50", "07.00", "07.05", "07.50", "09.50", "16.50", "17.00", "17.11"]);
    expect(M.b[1]).toContain("PostgreSQL 17.11");
  });
  test("pembanding 17 jam bukan bagian cerita: HP baru tersambung hari Senin menurut naskah", () => {
    expect(barisM24).toContain("HP Ani lalu offline sampai Senin 07.00");
    harus("Pembanding ini bukan bagian cerita: di cerita, HP Ani baru tersambung hari Senin.");
    expect(M.b.find((b) => b.startsWith("# --- C. "))).toContain("HP sempat dapat sinyal dan mengirim ulang operasi nasi");
  });
});

describe("rekaman m24.txt dan versi.txt: nilai dan rentang Snippet", () => {
  test("bagian A: PUT ayam dan nasi dengan key sendiri, isi hanya stok 0, dijawab 200 stok 0 versi 2", () => {
    expect(KUNCI_AYAM).not.toBe(KUNCI_NASI);
    expect(runPy).toContain(`K_AYAM = "${KUNCI_AYAM}"`);
    expect(runPy).toContain(`K_NASI = "${KUNCI_NASI}"`);
    expect(bagA).toContain("HTTP/1.1 200 OK");
    expect(AYAM_JUMAT).toEqual({ id: 61, harga: 28000, stok: 0, versi: 2 });
    expect(jawaban(bagA, 1)[0]).toEqual({ id: 1, harga: 25000, stok: 0, versi: 2 });
    expect(barisTabel(bagA, "Ayam geprek")).toEqual([[30, 1]]);
    expect(barisTabel(bagA, "Nasi goreng")).toEqual([[50, 1]]);
    harus("Jumat 16.50 operasi \"stok = 0\" sampai ke server dan diterapkan: stok 0, versi 2.");
  });
  test("bagian B: dasbor diperankan PATCH dengan versi 2 dan menghasilkan stok 30 versi 3 (ayam) dan 50 versi 3 (nasi)", () => {
    expect(bagB).toContain("-X PATCH '/produk/61'");
    expect(badanPerintah(bagB, "-X PATCH '/produk/61'")).toBe('{"stok": 30, "versi": 2}');
    expect(AYAM_SABTU).toEqual({ id: 61, harga: 28000, stok: 30, versi: 3 });
    expect(NASI_SABTU).toEqual({ id: 1, harga: 25000, stok: 50, versi: 3 });
    expect(AYAM_SABTU.versi).toBe(AYAM_JUMAT.versi + 1);
    harus("Sabtu 07.50 Ani mengisi 30 porsi, dan versinya naik ke 3.");
  });
  test("bagian C: ulangan nasi 17 jam dengan key yang sama dijawab persis seperti Jumat (stok 0, versi 2), database tetap stok 50 versi 3", () => {
    expect(kunciPut(bagC, 1)).toBe(KUNCI_NASI);
    expect(jawabanMentah(bagC, 1)).toEqual([NASI_JUMAT_MENTAH]);
    expect(jawaban(bagC, 1)[0]).toEqual({ id: 1, harga: 25000, stok: 0, versi: 2 });
    expect(barisTabel(bagC, "Nasi goreng")).toEqual([[NASI_SABTU.stok, NASI_SABTU.versi]]);
    expect(NASI_SABTU.stok).toBe(50);
    expect(lompatan[1]).toEqual({ label: "Sabtu 09.50", jam: 17 });
    harus("Stok nasi goreng tetap 50. Di rekaman `m24.txt` bagian C, key masih dikenali. Server menjawab dengan jawaban Jumat, yaitu stok 0 dan versi 2, dan database tetap menyimpan stok 50, versi 3.");
    harus("lab mengirim ulang \"stok = 0\" untuk nasi goreng dengan key yang sama. Ani sudah mengisi nasi goreng 50 porsi lewat dasbor. Berapa stok nasi goreng sesudahnya?");
  });
  test("bagian D: key ayam yang sama 62 jam kemudian diterapkan sebagai baru: stok 30 versi 3 menjadi stok 0 versi 4, jawaban berbeda dari Jumat, katalog Budi stok 0", () => {
    expect(kunciPut(bagD, 61)).toBe(KUNCI_AYAM);
    expect(barisTabel(bagD, "Ayam geprek")).toEqual([[AYAM_SABTU.stok, AYAM_SABTU.versi], [0, 4]]);
    expect(AYAM_SENIN).toEqual({ id: 61, harga: 28000, stok: 0, versi: 4 });
    expect(AYAM_SENIN_MENTAH).not.toBe(AYAM_JUMAT_MENTAH);
    expect(AYAM_SENIN.versi).toBe(AYAM_SABTU.versi + 1);
    expect(KATALOG_BUDI).toEqual(AYAM_SENIN);
    expect(bagD).toContain("curl -i 'GET /katalog?warung=418'");
    expect(lompatan[2]).toEqual({ label: "Senin 06.50", jam: 62 });
    harus("Server menjawab 200 dan versi naik ke 4. Katalog lalu memberi Budi stok 0 untuk ayam geprek.");
    harus("Stok ayam geprek kembali ke 0 karena operasi Jumat dikirim ulang sesudah key-nya kedaluwarsa.");
  });
  test("isi permintaan PUT di seluruh rekaman m24.txt hanya {\"stok\": 0}, dengan header hanya Authorization dan Idempotency-Key (tanpa jam HP dan tanpa versi)", () => {
    const put = M.b.filter((b) => b.includes("-X PUT "));
    expect(put).toHaveLength(4); // ayam dan nasi Jumat, nasi Sabtu, ayam Senin
    for (const p of put) {
      expect(p).toMatch(/-d '\{"stok": 0\}'$/);
      expect([...p.matchAll(/-H '([^:']+):/g)].map((m) => m[1])).toEqual(["Authorization", "Idempotency-Key"]);
      expect(p).not.toMatch(/versi|dibuat_di_hp|jam/);
    }
    harus("isi permintaan di bagian A dan D hanya `{\"stok\": 0}`, tanpa jam HP dan tanpa versi.");
  });
  test("pengiriman ulang diperankan: skrip menerima jawaban Jumat dan menyimpannya, kepala rekaman menyebut HP diperankan curl dan server mode rentan", () => {
    expect(runPy).toContain("asli_ayam = isi");
    expect(runPy).toContain('catat("# HP tidak menerima jawaban di atas (sinyal putus); HP mengingat operasi dan key-nya, lalu offline")');
    expect(M.b[1]).toContain("PostgreSQL 17.11");
    expect(M.b[3]).toBe("# server: ./api-t3 -lab -jam-lab -rentan stok-timpa");
    expect(readmeLab).toContain("HP diperankan oleh curl");
    expect(runPy).toContain('curl("POST", "/lab/jam", {"ms": ms}');
    harus("*Kondisi rekaman:* PostgreSQL 17.11 dan server Go `api-t3` dengan mode rentan `stok-timpa`. HP diperankan `curl`, dan jam service dimajukan lewat `POST /lab/jam` (Ilustrasi mekanisme).");
    harus("Jawaban yang hilang juga diperankan: lab menerima jawaban Jumat, lalu mengirim operasi yang sama lagi seolah-olah HP tidak pernah menerimanya.");
  });
  test("versi.txt bagian C: soto dikenali kuncinya (ulang true, stok 30 versi 3); bakso kunci baru versi dasar 1 dijawab 409 konflik dengan stok 30 versi 2 dan tidak berubah", () => {
    const soto = cocok(vBagC, /"kunci": "ani-hp1-0301"[^\n]*\n[^\n]*\n[^\n]*\n\n(\{.*\})/)[1]!;
    expect(JSON.parse(soto)).toEqual({ sekarang: { id: 181, harga: 22000, stok: 30, versi: 3 }, status: "diterapkan", ulang: true });
    const bakso = cocok(vBagC, /"kunci": "ani-hp1-0302"[^\n]*\nHTTP\/1\.1 (\d+) Conflict\n[^\n]*\n\n(\{.*\})/);
    expect(bakso[1]).toBe("409");
    expect(JSON.parse(bakso[2]!)).toEqual({ sekarang: { id: 361, harga: 18000, stok: 30, versi: 2 }, status: "konflik", ulang: false });
    expect(vBagC).toMatch(/"produk_id": 361, "jenis": "stok", "nilai": 0, "versi_dasar": 1/);
    expect(barisTabel(vBagC, "Bakso")).toEqual([[30, 2]]);
    expect(vBagC).toMatch(/ani-hp1-0302 \| stok  \| 0     \| 1           \| konflik    \| f/);
    expect(vBagB).toContain("PATCH /produk/361, versi 1 menjadi 2");
    harus("Operasi bakso belum pernah sampai dan tiba pertama kali hari Senin dengan versi dasar 1, padahal versi sekarang 2:");
    harus("Server menjawab 409 dengan keadaan sekarang dan tidak mengubah apa pun. Operasi soto sudah sampai hari Jumat, jadi kuncinya dikenali dan stok 30 dari Sabtu utuh (`versi.txt` bagian C).");
    expect(vBagA).toContain('"kunci": "ani-hp1-0301"');
    expect(JSON.parse(cocok(vBagA, /\n\n(\{"sekarang".*\})/)[1]!)).toEqual({ sekarang: { id: 181, harga: 22000, stok: 0, versi: 2 }, status: "diterapkan", ulang: false });
    expect(vBagD).toContain('"kunci": "ani-hp1-0303"');
    expect(vBagD).toContain('"versi_dasar": 2');
  });
  test("kunci sinkron disimpan 14 hari menurut naskah dan README lab (batas direkam di sinkron14.txt, dibahas 3.21); halaman hanya menyebut angkanya", () => {
    expect(naskah).toContain("key sinkron 14 hari di `operasi_sinkron`");
    expect(readmeLab).toContain("Kunci berumur 62 jam masih dikenali dan job `-bersih` tidak menyentuhnya.");
    expect(readmeLab).toContain("Sesudah 15 hari job `-bersih` membuang kuncinya");
    harus("Versi benar punya dua perubahan sekaligus. Soto menunjukkan yang pertama: kunci sinkron, yang disimpan 14 hari, mengenali ulangannya. Bakso menunjukkan yang kedua: kuncinya tidak dikenal, dan syarat versi menolaknya. Batas 14 hari dan keputusannya ada di [[t3-offline]].");
  });
  test("pembayaran memakai middleware key yang sama; kunci24.txt bagian E mengirim ulang tiga permintaan lama 62 jam kemudian dan ketiganya dikerjakan lagi", () => {
    const E0 = rek(kunci24).awal("E");
    const bagE = rek(kunci24).antara(E0, kunci24.split("\n").length);
    expect(bagE).toContain("HP kembali online dan mengirim ulang tiga permintaan lama dengan key yang sama");
    expect([...bagE.matchAll(/Idempotency-Key: "/g)]).toHaveLength(1); // satu dicetak, dua jawaban tidak dicetak ulang
    expect(bagE).toContain("# Kiriman dan pesanan dengan key lama juga dikerjakan lagi");
    expect(bagE).toMatch(/10006\s+\| bayar[^\n]*\n\s*10007\s+\| transfer[^\n]*\n\s*10008\s+\| bayar/);
    expect(bagE).toContain("Sebab itu pembayaran tidak pernah offline (ADR 29)");
    for (const rute of ['"POST /transfers"', '"POST /kiriman"', '"POST /pesanan"']) expect(handlerGo).toMatch(new RegExp(`HandleFunc\\(${rute}, s\\.wajibLogin\\(s\\.idempoten\\(`));
    harus("**Pembayaran memakai key yang sama.** `POST /transfers`, `/kiriman`, dan `/pesanan` di `api-t3` dibungkus middleware key yang sama (dibaca dari kode, Tidak dijalankan di halaman ini). Rekaman `kunci24.txt` bagian E mengirim ulang tiga permintaan lama 62 jam kemudian, dan ketiganya dikerjakan lagi. Itu alasan pembayaran tidak pernah offline, dan [[t3-offline]] membahasnya.");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, dan judulnya menyebut berkas, nomor baris, dan bagian yang sama", () => {
    const M24 = "labs/t3-offline/output/m24.txt", V24 = "labs/t3-offline/output/versi.txt";
    const rekJudul = (f: string, a: number, z: number, ket: string) => `Rekaman lab: ${f} baris ${a} sampai ${z} (${ket})`;
    const kode = (f: string, a: number, z: number, ket: string) => `Kode lab: ${f} baris ${a} sampai ${z} (${ket})`;
    expect(tagSnippet()).toEqual([
      { berkas: M24, lines: `${SA0}:${SA1}`, judul: rekJudul(M24, SA0, SA1, "bagian A, ayam geprek habis dari HP Ani") },
      { berkas: M24, lines: `${SB0}:${SB1}`, judul: rekJudul(M24, SB0, SB1, "bagian B, dasbor mengisi 30 porsi") },
      { berkas: KATALOG, lines: `${ubahQ0}:${ubahQ1}`, judul: kode(KATALOG, ubahQ0, ubahQ1, "stok berubah hanya bila versi sama") },
      { berkas: REPO_IDEM, lines: `${timpaQ0}:${timpaQ1}`, judul: kode(REPO_IDEM, timpaQ0, timpaQ1, "stok diganti tanpa syarat versi") },
      { berkas: `${SVC_IDEM}:${umur}:${umur} + ${SVC_IDEM}:${svcKlaim0}:${svcKlaim1}`, lines: undefined, judul: `Kode lab: ${SVC_IDEM} baris ${umur} dan ${svcKlaim0} sampai ${svcKlaim1} (umur key dan klaim)` },
      { berkas: M24, lines: `${SC0}:${SC1}`, judul: rekJudul(M24, SC0, SC1, "bagian C, ulangan 17 jam") },
      { berkas: REPO_IDEM, lines: `${klaimQ0}:${klaimQ1}`, judul: kode(REPO_IDEM, klaimQ0, klaimQ1, "key yang kedaluwarsa diklaim ulang") },
      { berkas: M24, lines: `${SD0}:${SD1}`, judul: rekJudul(M24, SD0, SD1, "bagian D, pengiriman ulang 62 jam") },
      { berkas: M24, lines: `${SE0}:${SE1}`, judul: rekJudul(M24, SE0, SE1, "bagian D, isi database dan katalog sesudahnya") },
      { berkas: V24, lines: `${SV0}:${SV1}`, judul: rekJudul(V24, SV0, SV1, "bagian C, operasi lama ditolak 409") },
    ]);
    // urutan bagian di rekaman sama dengan urutan Snippet
    expect(SA1).toBeLessThan(SB0); expect(SB1).toBeLessThan(SC0); expect(SC1).toBeLessThan(SD0); expect(SD1).toBeLessThan(SE0);
    // baris tulisan tangan sesudah rentang tidak ikut tampil: hanya baris jam lab (dibuat ke_jam) yang berawalan '#'
    expect(M.b[SA1]).toBe("# HP tidak menerima jawaban di atas (sinyal putus); HP mengingat operasi dan key-nya, lalu offline");
    expect(M.b[SC1]!.startsWith("# Key masih dikenali")).toBe(true);
    expect(M.b[SD1]!.startsWith("# 62 jam > 24 jam")).toBe(true);
    expect(SE0).toBeGreaterThan(SD1 + 1);
    expect(M.b[SE1 - 1]).toBe(`Ayam geprek: ${KATALOG_BUDI_MENTAH}`);
    expect(M.b[SE1]!.startsWith("# Budi melihat")).toBe(true);
    expect(V.b[SV0 - 2]).toBe("# ulang = true: kunci dikenali (kunci hidup 14 hari, bukan 24 jam); 'stok = 0' TIDAK diterapkan lagi, stok 30 dari Sabtu utuh");
    expect(V.b[SV1]!.startsWith("# 409 membawa")).toBe(true);
    // bagian kepala rekaman (baris 1 sampai 6, memuat nomor keputusan) tidak ikut
    expect(Math.min(SA0, SB0, SC0, SD0, SE0, SV0)).toBeGreaterThan(6);
  });
  test("baris rekaman yang tampil hanya berawalan # bila itu catatan jam lab bentukan skrip; satu catatan pada baris katalog; tanpa ID, nomor keputusan, atau PR", () => {
    const tampil = [M.antara(SA0, SA1), M.antara(SB0, SB1), M.antara(SC0, SC1), M.antara(SD0, SD1), M.antara(SE0, SE1), V.antara(SV0, SV1)];
    for (const t of tampil) {
      expect(t).not.toMatch(POLA_ID_INTERNAL);
      expect(t).not.toMatch(/\b[A-G]\d\b/);
      for (const b of t.split("\n").filter((x) => x.startsWith("#"))) expect(b, b).toMatch(/^# Jam lab: \w+ \d\d\.\d\d \(\d+ jam sesudah Jumat 16\.50\)\. Ilustrasi mekanisme: waktu diperankan, tidak ada yang menunggu \d+ jam$/);
    }
    expect(tampil.map((t) => t.split("\n").filter((x) => / # /.test(x)))).toEqual([[], [], [], [], ["$ curl -i 'GET /katalog?warung=418' -H 'Authorization: Bearer <token sesi Budi>'   # Senin 06.50, app Budi"], []]);
    expect(runPy).toContain('"# Jam lab: ');
    expect(runPy).toContain("Ilustrasi mekanisme: waktu diperankan");
    for (const [kode, a, z] of [[katalogGo, ubahQ0, ubahQ1], [repoIdem, timpaQ0, timpaQ1], [repoIdem, klaimQ0, klaimQ1], [svcIdem, umur, umur], [svcIdem, svcKlaim0, svcKlaim1]] as [string, number, number][]) {
      const k = potongKode(kode, a, z);
      expect(k, `${a}:${z}`).not.toMatch(POLA_ID_INTERNAL);
      expect(k, `${a}:${z}`).not.toMatch(/^\s*\/\//m); // komentar kode (ADR 29, M24, nomor keputusan) tidak ikut tampil
      expect(k).not.toMatch(/ADR \d+/);
    }
  });
});

describe("kode lab: umur key, klaim ulang, endpoint stok tanpa versi, dan rute", () => {
  test("UmurKunci 24 jam dari service, dipakai sebagai kini + UmurKunci; key kedaluwarsa diklaim ulang lewat satu INSERT ... ON CONFLICT ... WHERE kedaluwarsa <= kini", () => {
    expect(svcIdem).toContain("const UmurKunci = 24 * time.Hour");
    expect(potongKode(svcIdem, svcKlaim0, svcKlaim1)).toContain("kini.Add(UmurKunci)");
    const q = potongKode(repoIdem, klaimQ0, klaimQ1);
    expect(q).toContain("INSERT INTO kunci_idempotensi");
    expect(q).toContain("ON CONFLICT (kunci) DO UPDATE");
    expect(q).toContain("WHERE kunci_idempotensi.kedaluwarsa <= $4");
    expect(q).toContain("status = 'diproses'");
    harus("Server mencatat key saat pertama kali dipakai, dengan masa berlaku 24 jam. Key Jumat 16.50 berlaku sampai Sabtu 16.50 (hitungan dari kode ini):");
    harus("Key itu sudah lewat sejak Sabtu 16.50, jadi server mengklaimnya sebagai key baru lewat satu perintah `INSERT … ON CONFLICT … WHERE kedaluwarsa <= kini`:");
    expect(hariJam(24)).toBe("Sabtu 16.50");
    expect(JUMAT + 62 * 3600_000).toBeGreaterThan(JUMAT + 24 * 3600_000);
    expect(JUMAT + 17 * 3600_000).toBeLessThan(JUMAT + 24 * 3600_000);
  });
  test("tes Go TestKunciKedaluwarsaSesudah24Jam: 23 jam 59 menit 59 detik KlaimUlang, tepat 24 jam KlaimBaru (angka tertulis, bukan UmurKunci); rekaman hanya mengapit 17 dan 62 jam", () => {
    const t = svcTest.slice(svcTest.indexOf("func TestKunciKedaluwarsaSesudah24Jam("));
    const badanTes = t.slice(0, t.indexOf("\n}\n"));
    const tanpaKomentar = badanTes.replace(/\/\/.*$/gm, "");
    expect(badanTes).toContain("jam = t0.Add(24*time.Hour - time.Second)");
    expect(badanTes).toMatch(/KlaimKunci\(ctx, k, budi, "h"\); p != repo\.KlaimUlang/);
    expect(badanTes).toContain("jam = t0.Add(24 * time.Hour)");
    expect(badanTes).toMatch(/p != repo\.KlaimBaru \|\| isi != nil/);
    expect(tanpaKomentar).not.toContain("UmurKunci");
    expect(lompatan.map((l) => l.jam)).toEqual([15, 17, 62]);
    expect(readmeLab).toContain("Angka 24 jam persis dijaga tes Go, bukan rekaman.");
    harus("Tes Go `TestKunciKedaluwarsaSesudah24Jam` memeriksa batas persisnya: 23 jam 59 menit 59 detik masih dikenali, tepat 24 jam dianggap baru (dibaca dari kode tes, Tidak dijalankan). Rekaman hanya mengapit batas itu: 17 jam dikenali, 62 jam tidak.");
  });
  test("TimpaStok mengganti stok tanpa syarat versi (WHERE hanya id dan akun_id); UbahProduk (PATCH) bersyarat versi", () => {
    const timpa = potongKode(repoIdem, timpaQ0, timpaQ1);
    expect(timpa).toContain("UPDATE produk SET stok = $3, versi = versi + 1, diubah = now()");
    expect(timpa).toContain("WHERE id = $1 AND akun_id = $2 RETURNING id, harga, stok, versi");
    expect(timpa).not.toMatch(/AND versi\b|versi = \$/);
    const ubah = potongKode(katalogGo, ubahQ0, ubahQ1);
    expect(ubah).toContain("WHERE id = $1 AND akun_id = $2 AND versi = $5");
    harus("Kedua jalur berbeda. `PATCH` mengubah stok hanya bila versinya masih sama dengan yang dilihat pengirim.");
    harus("Sesudah itu `TimpaStok` mengganti stok tanpa melihat stok sekarang.");
  });
  test("klaim negatif berlingkup: PUT /produk/{id}/stok didaftarkan sekali di seluruh berkas .go bukan tes labs/api-t3, hanya di dalam blok mode rentan, dan dibungkus middleware key; PATCH tidak dibungkus", () => {
    const semua = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(semua.length).toBeGreaterThan(20);
    let daftar = 0;
    for (const f of semua) daftar += hitung(baca(f), 'HandleFunc("PUT /produk/{id}/stok"');
    expect(daftar).toBe(1);
    const rute = nomorKode(handlerGo, (b) => b.includes('HandleFunc("PUT /produk/{id}/stok"'));
    const blok0 = nomorKode(handlerGo, (b) => b.trim() === "if s.rentan == service.RentanStokTimpa { // M24: endpoint stok sebelum ADR 29");
    const blok1 = nomorKode(handlerGo, (b) => b === "\t}", blok0);
    expect(rute).toBeGreaterThan(blok0);
    expect(rute).toBeLessThan(blok1);
    expect(handlerGo).toContain('mux.HandleFunc("PUT /produk/{id}/stok", s.wajibLogin(s.idempoten(s.timpaStok)))');
    expect(handlerGo).toContain('mux.HandleFunc("PATCH /produk/{id}", s.wajibLogin(s.ubahProduk))');
    expect(baca("labs/api-t3/internal/service/idempoten.go")).toContain('const RentanStokTimpa = "stok-timpa"');
    expect(readmeLab).toContain("Tanpa flag `-jam-lab` tidak ada `POST /lab/jam`, dan tanpa `-rentan stok-timpa` tidak ada `PUT /produk/{id}/stok`. Keduanya dijawab 404 (dicoba pada server tanpa flag).");
    harus("`PUT /produk/{id}/stok`, endpoint yang hanya ada di mode rentan, dan `{\"stok\": 0}` adalah seluruh isi permintaannya:");
    harus("Rekaman memerankan dasbor lewat `PATCH /produk/{id}`, yang membawa versi:");
  });
});

describe("sumber luar: panduan offline-first Flutter dan draft Idempotency-Key, baris riset R3-195 dan R3-196", () => {
  test("tautan eksternal hanya dua, keduanya ada di baris riset dengan tanggal akses yang sama dengan halaman", () => {
    const luar = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(luar).toEqual([
      "https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-08.txt",
      "https://docs.flutter.dev/app-architecture/design-patterns/offline-first",
    ]);
    const r195 = barisRiset("R3-195"), r196 = barisRiset("R3-196");
    expect(r195).toContain("docs.flutter.dev/app-architecture/design-patterns/offline-first");
    expect(r196).toContain("ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-08.txt");
    for (const r of [r195, r196]) expect(r).toContain("dibuka 2026-10-27");
    expect(hitung(badan, "dibuka 2026-10-27")).toBe(2);
    expect(new Date("2026-10-27").getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  });
  test("R3-195: kata conflict, version, overwrite, stale, outdated, newer, dan timestamp tidak ada; contoh sinkron memakai putUserProfile dan synchronized; kalimat halaman sama dengan baris", () => {
    const r = barisRiset("R3-195");
    expect(r).toContain("banner halaman menyebut Flutter 3.47.8");
    expect(r).toContain("kata conflict, version, overwrite, stale, outdated, newer, dan timestamp tidak ada di teks halaman");
    expect(r).toContain('contoh sinkron memanggil `putUserProfile` ("performs PUT network request to update a UserProfile") lalu menyimpan `synchronized: true`');
    expect(r).toContain("tanpa nomor versi dokumen");
    expect(r).toContain("klaim negatif atas satu halaman");
    harus("**Untuk app Flutter.** [Panduan offline-first di docs.flutter.dev](https://docs.flutter.dev/app-architecture/design-patterns/offline-first) (dibuka 2026-10-27, tanpa nomor versi dokumen, Tidak dijalankan) menandai data lokal dengan flag `synchronized` dan mengirimnya dengan satu `PUT`. Teks panduan itu tidak memuat kata conflict, version, atau timestamp. Panduan itu tidak membahas konflik, jadi cara menolak data lama perlu ada di request dan response API (penalaran).");
    expect(barisRiset("R3-17")).toContain("konflik tidak dibahas");
  });
  test("R3-196: draft -08 bagian 2.3, tanpa kata hour, day, minute, week, duration, atau lifetime; kedaluwarsa 25 April 2027; angka 24 jam pilihan Rekeningo", () => {
    const r = barisRiset("R3-196");
    expect(r).toContain("(22 Oktober 2026, kedaluwarsa 25 April 2027, Standards Track, dibuka 2026-10-27 dengan curl)");
    expect(r).toContain('bagian 2.3 "Idempotency Key Validity and Expiry"');
    expect(r).toContain("resource MAY mewajibkan key berbasis waktu agar bisa membuangnya saat kedaluwarsa, dan SHOULD menetapkan serta menerbitkan kebijakan kedaluwarsa itu di dokumentasinya");
    expect(r).toContain("teks draft tidak memuat kata hour, day, minute, week, duration, atau lifetime");
    expect(r).toContain("angka 24 jam adalah pilihan Rekeningo (ADR 14), bukan spesifikasi");
    expect(barisRiset("R3-90")).toContain("draft-ietf-httpapi-idempotency-key-header-08 (22 Oktober 2026, kedaluwarsa 2027-04-25");
    harus("Angka 24 jam adalah pilihan Rekeningo ([[t2-idempotency]]), bukan aturan spesifikasi. Draft IETF untuk header `Idempotency-Key` tidak menetapkan umur key. Resource boleh memakai key berbasis waktu, tulis draft itu, dan sebaiknya menerbitkan kebijakan kedaluwarsanya ([draft-08 bagian 2.3](https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-08.txt), kedaluwarsa 25 April 2027, dibuka 2026-10-27, Tidak dijalankan).");
    expect(new Date("2027-04-25").getTime()).toBeGreaterThan(new Date("2026-10-27").getTime());
  });
  test("baris riset R3-195 dan R3-196 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(sidik(barisRiset("R3-195"))).toBe(SIDIK_R195);
    expect(sidik(barisRiset("R3-196"))).toBe(SIDIK_R196);
    const id = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R3-(\d+) \|/)![1]));
    expect(new Set(id).size, "ID riset ganda").toBe(id.length);
    expect([...id].sort((a, b) => a - b)).toEqual(id);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca (halaman, diagram, skenario, kartu)", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string }[]).filter((k) => k.halaman === "t3-m24");
    for (const t of [badan, frontmatter, JSON.stringify(diagramMentah), skenarioMentah, JSON.stringify(kartu)]) {
      expect(t).not.toMatch(POLA_ID_INTERNAL);
      expect(t.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d\b/);
      expect(t).not.toMatch(/\d B\b|\bB\d+\b/);
    }
    expect(badan.match(/\[\[([A-G]\d)\]\]/g)).toEqual(["[[A0]]"]); // satu-satunya ID halaman bergaya A0: arti label
  });
  test("label sumber: arti ditaut ke A0 di Gejala; Ilustrasi, Asumsi, dan Tidak dijalankan dipakai tepat; Rekaman lab hanya untuk berkas rekaman", () => {
    harus("Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    expect(hitung(badan, "[[A0]]")).toBe(1);
    expect(hitung(badan, "Tidak dijalankan")).toBe(6); // arti label, tes Go, draft, Flutter, jalur uang, dan satu lagi di Cek diri 1
    expect(hitung(badan, "(Ilustrasi")).toBe(2); // Angka cerita dan Kondisi rekaman
    expect(hitung(badan, "Asumsi")).toBe(2); // arti label dan 62 jam
    expect(hitung(badan, "(penalaran")).toBe(2); // jawaban tebakan dan Flutter
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
    expect(hitung(badan, "dibaca dari kode")).toBe(4); // tes Go, jalur uang, Cek diri 1 (kode tes), Cek diri 2 (TimpaStok)
    for (const s of badan.matchAll(/Rekaman lab: ([^ ]+)/g)) expect(s[1]).toMatch(/^labs\/t3-offline\/output\/(m24|versi)\.txt,?$/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("tiga baris: endpoint stok tanpa versi (Jumat, Sabtu, Senin), pembanding 17 jam, operasi bersyarat versi (bakso)", () => {
    const bakso = JSON.parse(cocok(vBagC, /"kunci": "ani-hp1-0302"[^\n]*\nHTTP\/1\.1 409 Conflict\n[^\n]*\n\n(\{.*\})/)[1]!) as { sekarang: Produk };
    const nasi = NASI_SABTU;
    const harapan = {
      id: "t3-m24-stok-kembali",
      judul: "Stok ayam geprek: Jumat, Sabtu, Senin",
      sumber: { jenis: "rekaman", teks: "Rekaman lab t3-offline · m24.txt bagian A sampai D dan versi.txt bagian C" },
      baris: [
        {
          label: "Endpoint stok tanpa versi, ayam geprek", sub: "bagian A, B, D",
          simpul: [
            { teks: `${hariJam(0)}: stok ${AYAM_JUMAT.stok}`, sub: `versi ${AYAM_JUMAT.versi}, jawaban hilang`, nada: "biasa", kode: false },
            { teks: `${hariJam(15)}: dasbor mengisi ${AYAM_SABTU.stok}`, sub: `versi ${AYAM_SABTU.versi}`, nada: "biasa", kode: false },
            { teks: `${hariJam(62)}: kirim ulang, key sama`, sub: `${lompatan[2]!.jam} jam sesudah Jumat`, nada: "biasa", kode: false },
            { teks: `Stok ${AYAM_SENIN.stok} lagi`, sub: `200, versi ${AYAM_SENIN.versi}, tanpa galat`, nada: "warn", kode: false },
          ],
        },
        {
          label: "Pembanding 17 jam, nasi goreng", sub: "bagian C",
          simpul: [
            { teks: `${hariJam(17)}: kirim ulang, key sama`, sub: `${lompatan[1]!.jam} jam sesudah Jumat`, nada: "biasa", kode: false },
            { teks: "Key dikenali", sub: `jawaban Jumat: stok ${jawaban(bagC, 1)[0]!.stok}, versi ${jawaban(bagC, 1)[0]!.versi}`, nada: "biasa", kode: false },
            { teks: "Database tidak berubah", sub: `stok ${nasi.stok}, versi ${nasi.versi}`, nada: "good", kode: false },
          ],
        },
        {
          label: "Operasi bersyarat versi, Bakso", sub: "versi.txt bagian C",
          simpul: [
            { teks: `${hariJam(62)}: operasi lama tiba`, sub: "versi dasar 1", nada: "biasa", kode: false },
            { teks: `Versi sekarang ${bakso.sekarang.versi}`, sub: `stok ${bakso.sekarang.stok} dari Sabtu`, nada: "biasa", kode: false },
            { teks: "409 membawa keadaan sekarang", sub: "tidak ada yang berubah", nada: "good", kode: false },
          ],
        },
      ],
      catatan: "Di api-t3, key mengenali ulangan selama 24 jam. Operasi bersyarat versi menolak data lama.",
    };
    expect(diagram).toEqual(harapan);
    expect(vBagC).toMatch(/"produk_id": 361, "jenis": "stok", "nilai": 0, "versi_dasar": 1/);
    expect(diagram.baris[0]!.simpul[0]!.teks).toBe("Jumat 16.50: stok 0");
  });
  test("diagram dikunci dengan sidik jari (setiap nilai string) dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK_DIAGRAM);
    const sebenarnya = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(sebenarnya).toContain("<Rantai data={stokKembali} />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan).toContain('import stokKembali from "../../../../data/diagram/t3-m24-stok-kembali.json";');
  });
});

describe("widget alur t3-m24: skenario valid, nilai dari rekaman, tebakan, dan tanpa JavaScript", () => {
  const langkah = skenario.langkah;
  const varian = skenario.varian.langkah;
  const waktuSkenario = [...skenarioMentah.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]!);
  const potongSinkron = (b: string): string => b.replace(', "dibuat_di_hp": "<waktu>"', "");
  const sinkronV = (teks: string, kunci: string): string => potongSinkron(cocok(teks, new RegExp(`-d '(\\{"kunci": "${kunci}"[^\\n]*)'`))[1]!);
  const jawabV = (teks: string, kunci: string): string => cocok(teks, new RegExp(`"kunci": "${kunci}"[^\\n]*\\nHTTP/1\\.1 (\\d+) [^\\n]*\\n[^\\n]*\\n\\n(\\{.*\\})`))[2]!;
  test("skenario lolos alur-core (komponen, lapisan, predict, sumber), 6 langkah utama dan 4 varian, file rekaman ada dan sama dengan rekaman yang dikutip halaman", () => {
    const d = core.normalize(JSON.parse(skenarioMentah));
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(core.steps(d, false)).toHaveLength(6);
    expect(core.steps(d, true)).toHaveLength(4);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t3-offline/output/m24.txt", fileVarian: "labs/t3-offline/output/versi.txt" });
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["client", "dasbor", "api", "app"]);
    expect(skenario.komponen[2]!.lapisan).toEqual(["middleware key", "handler stok"]);
    expect(skenario.sumber.catatan).toContain("Langkah 5 meringkas dari kode lab (internal/repo/idempoten.go) satu klaim key dan satu UPDATE, dan Sabtu 16.50 adalah hitungan Jumat 16.50 ditambah 24 jam; ketiganya bukan baris rekaman.");
    expect(skenario.sumber.catatan).toContain("PostgreSQL 17.11");
    expect(skenario.sumber.catatan).toContain("Layar HP digambar dari isi rekaman: lab tidak punya app Flutter");
    expect(skenario.sumber.catatan).toContain("bukan 07.05 di naskah");
  });
  test("kirim jalur utama: key, isi, dan jawaban diturunkan dari m24.txt; hari dan jam dari lompatan jam", () => {
    const put = `PUT /produk/61/stok\nIdempotency-Key: "${KUNCI_AYAM}"\n{"stok": 0}`;
    expect(langkah.map((l) => l.kirim)).toEqual([
      put,
      `→ 200 ${AYAM_JUMAT_MENTAH}\njawaban ini tidak sampai ke HP (diperankan)`,
      `PATCH /produk/61\n${badanPerintah(bagB, "-X PATCH '/produk/61'")}\n→ 200 ${AYAM_SABTU_MENTAH}`,
      put,
      `key berlaku sampai ${hariJam(24)}, diklaim ulang\nUPDATE produk SET stok = 0, versi = versi + 1 (tanpa syarat versi)\n→ 200 ${AYAM_SENIN_MENTAH}`,
      `GET /katalog?warung=418\n→ Ayam geprek: ${KATALOG_BUDI_MENTAH}`,
    ]);
    expect(langkah.map((l) => l.judul.split(":")[0])).toEqual([`${hariJam(0)}`, "Server menerapkan, jawabannya hilang", hariJam(15), hariJam(62), "Key sudah lewat 24 jam", "Senin"]);
    expect(langkah.map((l) => [l.dari, l.ke ?? null, l.lapisan ?? null])).toEqual([
      ["client", "api", "handler stok"], ["api", "client", "handler stok"], ["dasbor", "api", null], ["client", "api", "middleware key"], ["api", null, "handler stok"], ["app", "api", null],
    ]);
    expect(langkah.map((l) => l.nada ?? null)).toEqual([null, "warn", null, null, "warn", "warn"]);
    expect(langkah[1]!.jelas).toContain(`stok ${AYAM_JUMAT.stok}, versi ${AYAM_JUMAT.versi}`);
    expect(langkah[2]!.jelas).toContain(`Stok ${AYAM_SABTU.stok}, versi ${AYAM_SABTU.versi}`);
    expect(langkah[3]!.jelas).toContain(`${lompatan[2]!.jam} jam sesudah ${hariJam(0)}`);
    expect(langkah[3]!.jelas).toContain(`Stok di database sekarang ${AYAM_SABTU.stok}, versi ${AYAM_SABTU.versi}.`);
  });
  test("kirim varian: POST /sinkron soto dan bakso diturunkan dari versi.txt (tanpa field dibuat_di_hp), kunci, produk, dan jawabannya", () => {
    const kSoto = "ani-hp1-0301", kBakso = "ani-hp1-0302";
    const bodiSoto = sinkronV(vBagA, kSoto);
    expect(JSON.parse(bodiSoto)).toMatchObject({ kunci: kSoto, perangkat_id: 10061, produk_id: 181, jenis: "stok", nilai: 0, versi_dasar: 1 });
    const jBakso = JSON.parse(sinkronV(vBagC, kBakso)) as { produk_id: number; nilai: number; versi_dasar: number };
    expect(varian.map((l) => l.kirim)).toEqual([
      `POST /sinkron\n${bodiSoto}\n→ 200 ${jawabV(vBagA, kSoto)}`,
      `PATCH /produk/181\n${badanPerintah(vBagB, "-X PATCH '/produk/181'")}\n→ 200 ${jawabanMentah(vBagB, 181)[0]!}`,
      `POST /sinkron (kunci ${kSoto}, versi dasar ${JSON.parse(bodiSoto).versi_dasar})\n→ 200 ${jawabV(vBagC, kSoto)}`,
      `POST /sinkron (kunci ${kBakso}, produk ${jBakso.produk_id}, stok ${jBakso.nilai}, versi dasar ${jBakso.versi_dasar})\n→ 409 ${jawabV(vBagC, kBakso)}`,
    ]);
    expect(varian.map((l) => l.judul)).toEqual([
      `${hariJam(0)}: HP Ani mengirim 'soto habis' lewat POST /sinkron`,
      `${hariJam(15)}: Ani mengisi soto 30 porsi lewat dasbor`,
      `${hariJam(62)}: HP Ani mengirim ulang soto dengan kunci yang sama`,
      `${hariJam(62)}: operasi bakso yang belum pernah sampai tiba`,
    ]);
    expect(varian.map((l) => l.nada ?? null)).toEqual([null, null, "good", "good"]);
    expect(vBagA).toContain('"jenis": "stok"');
    expect(JSON.parse(jawabV(vBagC, kSoto)).ulang).toBe(true);
    expect(JSON.parse(jawabV(vBagC, kBakso)).status).toBe("konflik");
  });
  test("jam di layar HP hanya 16.50 dan 06.50 (jam lab), sama dengan hari dan jam di judul langkah; tidak ada 07.05 di widget", () => {
    expect(new Set(waktuSkenario)).toEqual(new Set(["16.50", "06.50"]));
    expect(waktuSkenario).not.toContain("07.05");
    for (const l of [...langkah, ...varian]) {
      const jam = l.judul.match(/^\w+ (\d\d\.\d\d):/)?.[1];
      for (const lay of Object.values(l.layar ?? {})) if (jam) expect(lay.waktu, l.judul).toBe(jam);
    }
    expect(Object.values(skenario.layarAwal).map((l) => l.waktu)).toEqual(["16.50", "16.50"]);
    expect(Object.values(langkah[5]!.layar!)[0]!.waktu).toBe("06.50");
    expect(skenario.layarAwal.ani!.isi![0]).toEqual({ jenis: "baris", kiri: "Ayam geprek", kanan: `${barisTabel(bagA, "Ayam geprek")[0]![0]} porsi` });
    expect(skenario.layarAwal.budi!.isi![0]).toEqual({ jenis: "baris", kiri: "Ayam geprek", kanan: "Rp28.000" });
    expect(AYAM_JUMAT.harga).toBe(28000);
  });
  test("tebakan: jawaban benar di pilihan kedua, bukan yang terpanjang atau terpendek, nilai tebakan dan penjelasan sama dengan rekaman bagian D; soal tidak menyebut umur key", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(1);
    expect(p.varian).toBe(false);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(panjang[p.answer]).toBeGreaterThan(Math.min(...panjang));
    expect(p.q).toContain(`${lompatan[2]!.jam} jam sesudahnya`);
    expect(p.q).toContain(`Stok ayam geprek di database sekarang ${AYAM_SABTU.stok} (versi ${AYAM_SABTU.versi}).`);
    expect(p.q).not.toMatch(/24|kedaluwarsa|versi dasar/);
    expect(p.options[p.answer]).toBe(`Server menerapkan 'stok = 0' lagi dan menjawab 200: stok menjadi ${AYAM_SENIN.stok}, versi ${AYAM_SENIN.versi}`);
    expect(p.options[0]).toContain(`(stok ${AYAM_JUMAT.stok}, versi ${AYAM_JUMAT.versi}), dan stok di database tetap ${AYAM_SABTU.stok}`);
    expect(p.options[2]).toContain("409");
    expect(p.options[3]).toContain("terlalu tua");
    expect(p.explain).toBe(`Server menjawab 200 dan stok menjadi ${AYAM_SENIN.stok}, versi ${AYAM_SENIN.versi} (m24.txt bagian D). Key sudah lewat masa 24 jam, jadi permintaan ini dianggap baru, dan endpoint stok tidak membandingkan apa pun dengan stok sekarang.`);
    // posisi jawaban benar divariasikan: tebakan alur Tahap 3 lain memakai posisi 2, 1, 0, 2, 3
    const lain = ["t3-batas-redis", "t3-m18", "t3-m20", "t3-m21", "t3-notifikasi"].map((s) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${s}.json`)) as Skenario).predict.answer);
    expect(lain).toEqual([2, 1, 0, 2, 3]);
  });
  test("dipasang sekali di blok Coba sendiri, dengan SkripLama alur dan noscript yang menyebut hasil dari rekaman", () => {
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba sendiri">'), badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, "<WidgetLama ")).toBe(1);
    expect(coba).toContain('<WidgetLama nama="alur" src="data/skenario/t3-m24.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(hitung(badan, "<noscript>")).toBe(1);
    expect(coba).toContain("<noscript>");
    expect(coba).toContain(`pengiriman ulang hari Senin dijawab 200, stok ayam geprek menjadi ${AYAM_SENIN.stok} dengan versi ${AYAM_SENIN.versi}, dan katalog memberi Budi stok ${KATALOG_BUDI.stok}.`);
    expect(coba).toContain("soto dikenali kuncinya dan stok tetap 30, sedangkan bakso ditolak 409 dengan keadaan sekarang.");
    expect(coba).toContain("**Ubah satu hal: operasi bersyarat versi lewat POST /sinkron**");
    expect(coba).toContain(`Rekamannya \`versi.txt\`, dengan produk soto dan bakso.`);
    expect(skenario.varian.label).toBe("operasi bersyarat versi lewat POST /sinkron");
  });
  test("teks widget dikunci dengan sidik jari (setiap nilai string)", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK_SKENARIO);
  });
});

describe("kartu Cek diri: empat kartu, sama dengan kartu.json", () => {
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const soal = [...cek.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-m24");
    expect(kartu.map((k) => k.id)).toEqual(["t3-m24-1", "t3-m24-2", "t3-m24-3", "t3-m24-4"]);
    soal.forEach((m, i) => {
      expect(kartu[i]!.tanya).toBe(m[2]);
      expect(kartu[i]!.jawab).toBe(m[3]);
      expect(kartu[i]!.judul).toBe("3.20 M24: Stok yang kembali ke angka lama");
      expect(kartu[i]!.url).toBe("tahap-3/m24-stok-kembali/");
    });
  });
  test("kartu 1 sampai 4 menyebut fakta yang sama dengan bagian C, D, A, versi.txt, dan kode", () => {
    const k = (n: number) => badan.slice(badan.indexOf(`**${n}.**`), badan.indexOf(`**${n + 1}.**`) > 0 ? badan.indexOf(`**${n + 1}.**`) : undefined);
    expect(k(1)).toContain(`HP mengirim ulang "stok = 0" ${lompatan[1]!.jam} jam sesudah Jumat dan ${lompatan[2]!.jam} jam sesudah Jumat, keduanya dengan key yang sama.`);
    expect(k(1)).toContain(`Pada ${lompatan[1]!.jam} jam key dikenali, server menjawab seperti Jumat, dan stok database tetap ${NASI_SABTU.stok} (\`m24.txt\` bagian C). Pada ${lompatan[2]!.jam} jam key sudah lewat`);
    expect(k(1)).toContain("angka 24 jam persis dijaga tes Go (dibaca dari kode tes, Tidak dijalankan)");
    expect(k(2)).toContain("Endpoint `PUT /produk/{id}/stok` hanya menerima `{\"stok\": 0}`.");
    expect(k(2)).toContain("`TimpaStok` menjalankan `UPDATE` tanpa syarat versi (dibaca dari kode lab).");
    expect(k(3)).toContain("Isi permintaan hanya `{\"stok\": 0}` (`m24.txt` bagian A dan D). Tidak ada jam HP dan tidak ada versi");
    expect(k(4)).toContain("Server menjawab 409 dengan keadaan sekarang (stok 30, versi 2), dan tidak ada yang berubah (`versi.txt` bagian C).");
    expect(k(4)).toContain("Pilihannya operasi baru dengan kunci baru dan versi dasar 2 (bagian D); layar pilihan di HP adalah Ilustrasi.");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor; satu tebakan details", () => {
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      const m = b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([[3, "Cek diri"]]);
    expect(badan.match(/^\d+\. /gm)).toBeNull();
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(entri(/<details class="question">\n<summary>Tebak dulu: [^\n]+<\/summary>/)).toBeTruthy();
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<details/g)).toHaveLength(5);
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (memuat Minggu 7, 62 jam, 24 jam, dan stok = 0)", () => {
    expect(frontmatter.trim().split("\n")).toEqual(FRONTMATTER);
    expect(FRONTMATTER[1]).toContain("Minggu 7.");
    expect(FRONTMATTER[1]).toContain(`${lompatan[2]!.jam} jam`);
    expect(FRONTMATTER[1]).toContain("24 jam");
    expect(FRONTMATTER[1]).toContain('"stok = 0"');
  });
});

const SIDIK_R195 = "fe5c748e39eeb37e";
const SIDIK_R196 = "f045c5ed538479b1";
const SIDIK_DIAGRAM = "64efc893632c220d";
const SIDIK_SKENARIO = "03036d99bf54f36c";
const FRONTMATTER: string[] = [
  "title: \"3.20 M24: Stok yang kembali ke angka lama\"",
  "description: Minggu 7. Senin pagi app Budi menunjukkan ayam geprek habis, padahal Ani mengisi 30 porsi hari Sabtu. Operasi \"stok = 0\" dari Jumat dikirim ulang 62 jam kemudian, key-nya sudah lewat 24 jam, dan endpoint stok menimpa tanpa memeriksa versi.",
];
const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import stokKembali from \"../../../../data/diagram/t3-m24-stok-kembali.json\";",
  "<p class=\"meta\">Baca 7 menit · coba 3 menit · Prasyarat: [[t2-idempotency]]</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 7 Tahap 3. Senin pukul 07.05 Budi membuka app untuk memesan ayam geprek di warung Ani. Menu itu tertulis \"habis\".",
  "Ani mengisi 30 porsi ayam geprek lewat dasbor hari Sabtu. Ia tidak mengerti kenapa menu itu habis lagi.",
  "Ani: \"Jumat sore saya catat habis, itu sudah lewat dua hari.\"",
  "Ani menghubungi Raka.",
  "*Angka cerita (Ilustrasi):* Senin 07.05, \"dua hari\", dan 30 porsi berasal dari naskah. Lama offline 62 jam, dari Jumat 16.50 sampai Senin 06.50, adalah Asumsi naskah: warung tutup Jumat 17.00 sampai Senin 07.00. Rekaman di blok \"Yang sebenarnya\" memerankan waktu itu dengan jam service yang dimajukan, jadi tidak ada yang menunggu 62 jam.",
  "Jam di layar HP pada widget mengikuti jam lab, bukan 07.05. Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka punya dua dugaan, seperti di naskah: dasbor yang salah, atau jam HP Ani yang salah. Ia mulai dari pertanyaan siapa yang terakhir mengubah stok ayam geprek.",
  "Pola ini ia kenal dari [[t2-m10]]. Bila sinyal putus sebelum jawaban sampai, app tidak tahu operasinya berhasil. App menyimpannya di queue lokal, yaitu daftar operasi yang belum pasti sampai, lalu mengirimnya lagi saat sinyal kembali.",
  "Pengiriman ulang itu aman karena key. App memakai key yang sama, dan server mengenali ulangannya selama 24 jam ([[t2-idempotency]]). Ulangan yang dikenali tidak mengubah apa pun untuk kedua kalinya.",
  "Lab menjalankan langkah itu juga untuk nasi goreng, produk lain di warung Ani yang melewati Jumat dan Sabtu yang sama. Pembanding ini bukan bagian cerita: di cerita, HP Ani baru tersambung hari Senin.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: Sabtu 09.50, 17 jam sesudah Jumat, lab mengirim ulang \"stok = 0\" untuk nasi goreng dengan key yang sama. Ani sudah mengisi nasi goreng 50 porsi lewat dasbor. Berapa stok nasi goreng sesudahnya?</summary>",
  "Stok nasi goreng tetap 50. Di rekaman `m24.txt` bagian C, key masih dikenali. Server menjawab dengan jawaban Jumat, yaitu stok 0 dan versi 2, dan database tetap menyimpan stok 50, versi 3.",
  "Jawaban itu melaporkan keadaan Jumat, bukan keadaan sekarang. App yang menggambar layar dari jawaban itu akan menampilkan 0 padahal stok 50. Karena itu app perlu mengambil keadaan terbaru sesudah ulangan (penalaran; app tidak ada di lab).",
  "Pengiriman ulang yang sama 62 jam sesudah Jumat berakhir lain. Itu isi blok berikutnya.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Stok ayam geprek kembali ke 0 karena operasi Jumat dikirim ulang sesudah key-nya kedaluwarsa. Server menganggapnya keputusan baru dan menimpa stok 30 dari Sabtu.",
  "<Rantai data={stokKembali} />",
  "*Kondisi rekaman:* PostgreSQL 17.11 dan server Go `api-t3` dengan mode rentan `stok-timpa`. HP diperankan `curl`, dan jam service dimajukan lewat `POST /lab/jam` (Ilustrasi mekanisme). Jawaban yang hilang juga diperankan: lab menerima jawaban Jumat, lalu mengirim operasi yang sama lagi seolah-olah HP tidak pernah menerimanya.",
  "**Jumat dan Sabtu: dua jalur ke baris yang sama.** Jumat 16.50 operasi \"stok = 0\" sampai ke server dan diterapkan: stok 0, versi 2.",
  "<Snippet file=\"labs/t3-offline/output/m24.txt\" lines=\"9:19\" title=\"Rekaman lab: labs/t3-offline/output/m24.txt baris 9 sampai 19 (bagian A, ayam geprek habis dari HP Ani)\" />",
  "Sabtu 07.50 Ani mengisi 30 porsi, dan versinya naik ke 3. Rekaman memerankan dasbor lewat `PATCH /produk/{id}`, yang membawa versi:",
  "<Snippet file=\"labs/t3-offline/output/m24.txt\" lines=\"29:34\" title=\"Rekaman lab: labs/t3-offline/output/m24.txt baris 29 sampai 34 (bagian B, dasbor mengisi 30 porsi)\" />",
  "Kedua jalur berbeda. `PATCH` mengubah stok hanya bila versinya masih sama dengan yang dilihat pengirim. Lab memerankan HP Ani lewat `PUT /produk/{id}/stok`, endpoint yang hanya ada di mode rentan, dan `{\"stok\": 0}` adalah seluruh isi permintaannya:",
  "<Snippet file=\"labs/api-t3/internal/repo/katalog.go\" lines=\"126:129\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/repo/katalog.go baris 126 sampai 129 (stok berubah hanya bila versi sama)\" />",
  "<Snippet file=\"labs/api-t3/internal/repo/idempoten.go\" lines=\"83:86\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/repo/idempoten.go baris 83 sampai 86 (stok diganti tanpa syarat versi)\" />",
  "**Key hanya berlaku 24 jam.** Server mencatat key saat pertama kali dipakai, dengan masa berlaku 24 jam. Key Jumat 16.50 berlaku sampai Sabtu 16.50 (hitungan dari kode ini):",
  "<Snippet files={[\"labs/api-t3/internal/service/idempoten.go:14:14\", \"labs/api-t3/internal/service/idempoten.go:22:25\"]} lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/idempoten.go baris 14 dan 22 sampai 25 (umur key dan klaim)\" />",
  "Pembanding Sabtu 09.50 jatuh di dalam masa itu, jadi key dikenali dan stok tidak berubah:",
  "<Snippet file=\"labs/t3-offline/output/m24.txt\" lines=\"42:52\" title=\"Rekaman lab: labs/t3-offline/output/m24.txt baris 42 sampai 52 (bagian C, ulangan 17 jam)\" />",
  "Tes Go `TestKunciKedaluwarsaSesudah24Jam` memeriksa batas persisnya: 23 jam 59 menit 59 detik masih dikenali, tepat 24 jam dianggap baru (dibaca dari kode tes, Tidak dijalankan). Rekaman hanya mengapit batas itu: 17 jam dikenali, 62 jam tidak.",
  "Angka 24 jam adalah pilihan Rekeningo ([[t2-idempotency]]), bukan aturan spesifikasi. Draft IETF untuk header `Idempotency-Key` tidak menetapkan umur key. Resource boleh memakai key berbasis waktu, tulis draft itu, dan sebaiknya menerbitkan kebijakan kedaluwarsanya ([draft-08 bagian 2.3](https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-08.txt), kedaluwarsa 25 April 2027, dibuka 2026-10-27, Tidak dijalankan).",
  "**Senin 06.50: key sudah lewat, dan tidak ada yang membandingkan.** HP Ani mengirim ulang \"stok = 0\" dengan key Jumat, 62 jam sesudahnya. Key itu sudah lewat sejak Sabtu 16.50, jadi server mengklaimnya sebagai key baru lewat satu perintah `INSERT … ON CONFLICT … WHERE kedaluwarsa <= kini`:",
  "<Snippet file=\"labs/api-t3/internal/repo/idempoten.go\" lines=\"27:33\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/repo/idempoten.go baris 27 sampai 33 (key yang kedaluwarsa diklaim ulang)\" />",
  "Sesudah itu `TimpaStok` mengganti stok tanpa melihat stok sekarang. Rekaman Senin menunjukkan hasilnya:",
  "<Snippet file=\"labs/t3-offline/output/m24.txt\" lines=\"56:66\" title=\"Rekaman lab: labs/t3-offline/output/m24.txt baris 56 sampai 66 (bagian D, pengiriman ulang 62 jam)\" />",
  "Server menjawab 200 dan versi naik ke 4. Katalog lalu memberi Budi stok 0 untuk ayam geprek. App Budi menampilkan \"habis\"; tampilan app tidak direkam, hanya jawaban katalognya:",
  "<Snippet file=\"labs/t3-offline/output/m24.txt\" lines=\"68:74\" title=\"Rekaman lab: labs/t3-offline/output/m24.txt baris 68 sampai 74 (bagian D, isi database dan katalog sesudahnya)\" />",
  "**Yang menang adalah permintaan yang tiba terakhir.** Keputusan Ani yang terakhir adalah 30 porsi pada Sabtu. Permintaan yang tiba terakhir adalah \"habis\" dari Jumat. `TimpaStok` memilih yang tiba terakhir, bukan yang diputuskan terakhir.",
  "**Kenapa dua dugaan Raka tidak cocok.** Dasbor tidak salah: `PATCH` Sabtu diterima dengan versi 2 dan menghasilkan versi 3 (bagian B). Jam HP juga bukan sebabnya, karena isi permintaan di bagian A dan D hanya `{\"stok\": 0}`, tanpa jam HP dan tanpa versi.",
  "**Versi bersyarat menolak hal yang sama.** Lab merekam urutan yang sama lewat `POST /sinkron`, yang membawa versi dasar, yaitu versi baris yang dilihat HP saat Ani mengubahnya. Operasi bakso belum pernah sampai dan tiba pertama kali hari Senin dengan versi dasar 1, padahal versi sekarang 2:",
  "<Snippet file=\"labs/t3-offline/output/versi.txt\" lines=\"49:53\" title=\"Rekaman lab: labs/t3-offline/output/versi.txt baris 49 sampai 53 (bagian C, operasi lama ditolak 409)\" />",
  "Server menjawab 409 dengan keadaan sekarang dan tidak mengubah apa pun. Operasi soto sudah sampai hari Jumat, jadi kuncinya dikenali dan stok 30 dari Sabtu utuh (`versi.txt` bagian C).",
  "Versi benar punya dua perubahan sekaligus. Soto menunjukkan yang pertama: kunci sinkron, yang disimpan 14 hari, mengenali ulangannya. Bakso menunjukkan yang kedua: kuncinya tidak dikenal, dan syarat versi menolaknya. Batas 14 hari dan keputusannya ada di [[t3-offline]].",
  "**Untuk app Flutter.** [Panduan offline-first di docs.flutter.dev](https://docs.flutter.dev/app-architecture/design-patterns/offline-first) (dibuka 2026-10-27, tanpa nomor versi dokumen, Tidak dijalankan) menandai data lokal dengan flag `synchronized` dan mengirimnya dengan satu `PUT`. Teks panduan itu tidak memuat kata conflict, version, atau timestamp. Panduan itu tidak membahas konflik, jadi cara menolak data lama perlu ada di request dan response API (penalaran).",
  "**Pembayaran memakai key yang sama.** `POST /transfers`, `/kiriman`, dan `/pesanan` di `api-t3` dibungkus middleware key yang sama (dibaca dari kode, Tidak dijalankan di halaman ini). Rekaman `kunci24.txt` bagian E mengirim ulang tiga permintaan lama 62 jam kemudian, dan ketiganya dikerjakan lagi. Itu alasan pembayaran tidak pernah offline, dan [[t3-offline]] membahasnya.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `m24.txt` dari operasi Jumat sampai HP Budi. Tebak dulu apa jawaban server pada pengiriman ulang hari Senin, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t3-m24.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: operasi bersyarat versi lewat POST /sinkron**. Rekamannya `versi.txt`, dengan produk soto dan bakso. Layar HP di widget digambar dari isi rekaman: lab tidak punya app Flutter.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: pengiriman ulang hari Senin dijawab 200, stok ayam geprek menjadi 0 dengan versi 4, dan katalog memberi Budi stok 0.",
  "Pada operasi bersyarat versi, soto dikenali kuncinya dan stok tetap 30, sedangkan bakso ditolak 409 dengan keadaan sekarang. Rekaman lengkapnya ada di blok \"Yang sebenarnya\".",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-offline]]: offline-first dan queue sinkron, operasi bersyarat versi (optimistic lock), dan umur key lawan umur queue. Keputusannya ADR 29.",
  "- [[t2-idempotency]]: ADR 14 menulis kapan keputusannya salah, yaitu saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama. M24 adalah kejadiannya.",
  "- [[t3-dua-tempat]]: queue di HP adalah perantara yang berisi keputusan Jumat, sedangkan PostgreSQL berisi keadaan Senin. Pola yang sama muncul di [[t3-m22]].",
  "- [[t3-skema]]: tabel `operasi_sinkron` dan umur key 24 jam sudah tercatat di skema Tahap 3, dengan M24 sebagai alasannya.",
  "- [[t3-prd]]: mode offline untuk stok dan harga adalah P1 di PRD v3, dan pembayaran tidak pernah offline.",
  "Key menjawab apakah permintaan ini pernah datang. Versi baris menjawab apakah keadaan sudah berubah sejak operasi dibuat.",
  "### Cek diri",
  "**1.** HP mengirim ulang \"stok = 0\" 17 jam sesudah Jumat dan 62 jam sesudah Jumat, keduanya dengan key yang sama. Kenapa hasilnya berbeda?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Key berlaku 24 jam sejak dipakai pertama kali. Pada 17 jam key dikenali, server menjawab seperti Jumat, dan stok database tetap 50 (`m24.txt` bagian C). Pada 62 jam key sudah lewat, jadi permintaan dianggap baru dan stok tertimpa (bagian D). Rekaman hanya mengapit batas itu; angka 24 jam persis dijaga tes Go (dibaca dari kode tes, Tidak dijalankan).",
  "</details>",
  "**2.** Server menjawab 200 pada pengiriman ulang hari Senin. Kenapa tidak ada galat yang memberi tahu siapa pun?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Endpoint `PUT /produk/{id}/stok` hanya menerima `{\"stok\": 0}`. Ia tidak membandingkan apa pun dengan stok sekarang, jadi tidak ada yang bisa gagal: `TimpaStok` menjalankan `UPDATE` tanpa syarat versi (dibaca dari kode lab).",
  "</details>",
  "**3.** Raka menduga jam HP Ani salah. Apa di rekaman yang menunjukkan dugaan itu tidak cocok?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Isi permintaan hanya `{\"stok\": 0}` (`m24.txt` bagian A dan D). Tidak ada jam HP dan tidak ada versi, jadi jam HP yang salah tidak bisa memengaruhi hasilnya.",
  "</details>",
  "**4.** Operasi bakso lewat `POST /sinkron` membawa versi dasar 1, padahal versi sekarang 2. Apa jawaban server dan apa yang berubah di database?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Server menjawab 409 dengan keadaan sekarang (stok 30, versi 2), dan tidak ada yang berubah (`versi.txt` bagian C). Ani lalu memilih. Pilihannya operasi baru dengan kunci baru dan versi dasar 2 (bagian D); layar pilihan di HP adalah Ilustrasi.",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
