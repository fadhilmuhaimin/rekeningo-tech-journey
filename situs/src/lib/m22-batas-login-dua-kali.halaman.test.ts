// Penjaga halaman 3.16 (keputusan 1060 sampai 1062): angka, ID, nomor halaman, nomor ADR, versi sumber, tanggal akses, tautan,
// label sumber, rentang Snippet, klaim negatif, diagram Rantai, teks widget BatasInstance, dan kartu Cek diri di
// m22-batas-login-dua-kali.mdx diturunkan dari rekaman labs/t3-instance/output/batas.txt, run.py dan README lab, kode api-t3
// (pembatas.go, handler.go, sesi.go), konfigurasi Caddy lab, naskah Tahap 3, registry, baris riset R3-175 dan R3-176, dan halaman
// tetangga (2.28, 3.1, 3.4, 3.2), bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.13): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI mengunci SETIAP baris badan
// halaman, dan tes lain menurunkan nilai yang diklaim dari sumbernya karena kalimat terkunci tidak menangkap SALAHNYA kalimat.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m22-batas-dua-jatah.json";
import widgetMentah from "../../data/widget/t3-m22-batas.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { bacaBatas, bacaBatasAlamat } from "../widgets/batas-instance/logika";

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

const BERKAS = "situs/src/content/docs/tahap-3/m22-batas-login-dua-kali.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const rekaman = baca("labs/t3-instance/output/batas.txt");
const runPy = baca("labs/t3-instance/run.py");
const readmeLab = baca("labs/t3-instance/README.md");
const bergilir = baca("labs/t3-instance/caddy/bergilir.Caddyfile");
const bawaan = baca("labs/t3-instance/caddy/bawaan.Caddyfile");
const compose = baca("labs/t3-instance/docker-compose.yml");
const pembatasGo = baca("labs/api-t3/internal/service/pembatas.go");
const handlerGo = baca("labs/api-t3/internal/handler/handler.go");
const sesiGo = baca("labs/api-t3/internal/service/sesi.go");
const wrapper = baca("situs/src/components/BatasInstance.astro");
const hal28 = baca("situs/src/content/docs/tahap-2/brute-force.mdx");
const hal31 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal32 = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const hal34 = baca("situs/src/content/docs/tahap-3/dua-tempat-commit.mdx");
const c4 = baca("labs/c4-ratelimit/output/login/ratelimit.txt");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");

interface H { id: string; judul: string; label?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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

// ---- rekaman batas.txt: bagian A sampai D, nomor baris Snippet ---------------------------------------------------------
const baris = rekaman.split("\n");
const nomor = (ok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const awalBagian = (h: string) => nomor((b) => b.startsWith(`# --- ${h}. `));
const akhirSebelum = (n: number): number => {
  let i = n - 1; // nomor baris sebelum baris n
  while (baris[i - 1]!.trim() === "") i--;
  return i;
};
const A0 = awalBagian("A"), B0 = awalBagian("B"), C0 = awalBagian("C"), D0 = awalBagian("D"), E0 = awalBagian("E");
const D1 = nomor((b) => b === "(1 row)", D0);
const teksBagian = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
const bagA = teksBagian(A0, akhirSebelum(B0));
const bagB = teksBagian(B0, akhirSebelum(C0));
const bagC = teksBagian(C0, akhirSebelum(D0));
const bagD = teksBagian(D0, akhirSebelum(E0));
const R = bacaBatas(rekaman);
const batasAlamat = bacaBatasAlamat(pembatasGo);

// ---- kode lab -----------------------------------------------------------------------------------------------------------
const nomorKode = (kode: string, ok: (b: string) => boolean, dariIdx = 0): number => {
  const i = kode.split("\n").findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris kode tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const penutup = (kode: string, awal: number, penanda: string): number => nomorKode(kode, (b) => b === penanda, awal);
const baruKode = (kode: string, dari: number, sampai: number) => kode.split("\n").slice(dari - 1, sampai).join("\n");
const strukPembatas0 = nomorKode(pembatasGo, (b) => b === "type Pembatas struct {");
const strukPembatas1 = penutup(pembatasGo, strukPembatas0, "}");
const ambangIP = nomorKode(pembatasGo, (b) => b.startsWith("\tAmbangLoginIP "));
const ambangAkun = nomorKode(pembatasGo, (b) => b.startsWith("\tAmbangLoginAkun "));
const kunci0 = nomorKode(sesiGo, (b) => b === "\tterkunci := false");
const kunci1 = penutup(sesiGo, kunci0, "\t})");
const clientIP0 = nomorKode(handlerGo, (b) => b === "func clientIP(r *http.Request) string {");
const clientIP1 = penutup(handlerGo, clientIP0, "}");
const izinkan0 = nomorKode(handlerGo, (b) => b.startsWith("func (s Server) izinkanIP("));
const izinkan1 = penutup(handlerGo, izinkan0, "}");
const login0 = nomorKode(handlerGo, (b) => b.startsWith("func (s Server) login("));
const login1 = penutup(handlerGo, login0, "\t}");

const entri = (re: RegExp): RegExpMatchArray => cocok(badan, re);
const tanpaKomentar = (kode: string): string => kode.split("\n").map((b) => b.replace(/\/\/.*$/, "")).join("\n");

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.16 ada, masalah, jalur inti, prasyarat 3.15, lab t3-instance, peran security dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t3-m22")).toMatchObject({ ada: true, nomor: "3.16", jenis: "masalah", inti: true, prasyarat: ["t3-dua-instance"], lab: ["t3-instance"], tahap: 3, peran: ["security", "backend"] });
    expect(frontmatter).toContain('title: "3.16 M22: Batas login jadi dua kali lipat"');
    expect(dari("t3-m22").judul).toBe("M22: Batas login jadi dua kali lipat");
    expect(naskah).toContain("| 3.16 | 4 | M22: Batas login jadi dua kali lipat | Masalah | ★ | t3-instance | ember |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-dua-instance\]\] · Jalur inti<\/p>/);
    expect(dari("t3-m22").menit).toBe(Number(m[1]) + Number(m[2]));
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
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor, judul, dan ADR sama dengan peta naskah dan registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t2-login-aman", "t2-m16", "t3-dua-instance", "t3-dua-tempat", "t3-rate-limit-redis"]);
    const sesuai: [string, string, string, number | null][] = [
      ["t2-login-aman", "2.28", "Keamanan 4: brute force, credential stuffing, hash password + ADR 20", 20],
      ["t2-m16", "2.27", "M16: Akun Ani terkunci", null],
      ["t3-dua-instance", "3.15", "Dua instance di belakang proxy + ADR 26", 26],
      ["t3-dua-tempat", "3.4", "Dua tempat yang tidak bisa commit bersama", null],
      ["t3-rate-limit-redis", "3.17", "Rate limit lintas instance dan Redis + ADR 27", 27],
    ];
    for (const [idh, nomorH, judul, adr] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomorH);
      expect(dari(idh).judul, idh).toBe(judul);
      expect(dari(idh).adr ?? null, idh).toEqual(adr === null ? null : [adr]);
      if (nomorH.startsWith("3.")) expect(naskah, `${nomorH} di peta`).toMatch(new RegExp(`\\| ${nomorH.replace(".", "\\.")} \\| \\d+ \\| ${judul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 3.16 ditepati: 3.1 (pertanyaan ketiga), 3.2 dan 3.4 (pola dua tempat), 2.28 (ADR 20 salah saat server kedua)", () => {
    expect(hal31).toContain("Jawabannya dimulai di [[t3-m18]] untuk pertanyaan pertama, [[t3-m19]] untuk yang kedua, dan [[t3-m22]] untuk yang ketiga.");
    expect(hal31).toContain("3. Kalau server jadi dua, apa yang tadinya disimpan di memori satu server?");
    expect(hal32).toContain("memori dua instance ([[t3-m22]])");
    expect(hal34).toContain("memori dua server ([[t3-m22]])");
    expect(hal28).toContain("- Saat server kedua dipasang. Bucket tidak dibagi (rekaman F) dan restart mengosongkannya (api-t2 bagian E), jadi batas efektif berlipat.");
    expect(hal28).toContain("Tahap 3 memindahkan hitungan batas ke Redis bersama saat server kedua datang");
    harus("Angka itu sama dengan yang ditulis ADR 20 di [[t2-login-aman]].");
    harus("ADR 20 sudah menulis batas di memori sebagai yang pecah saat server kedua datang");
  });
  test("halaman tidak membuka isi 3.15 dan 3.17: ADR 26 dan ADR 27 hanya disebut di Konsep yang lahir, Redis hanya sebagai tujuan tautan", () => {
    const sebelumKonsep = badan.slice(0, badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(sebelumKonsep).not.toMatch(/ADR 2[67]|Redis|SET NX|Lua/);
    expect(badan.match(/ADR 26/g)).toHaveLength(1);
    expect(badan.match(/ADR 27/g)).toHaveLength(1);
    expect(badan.match(/ADR 20/g)).toHaveLength(3);
    expect(badan.match(/Redis/g)).toHaveLength(2); // dua kali, di satu butir Konsep yang lahir
    harus("- [[t3-rate-limit-redis]]: hitungan bersama di Redis, alamat client di belakang proxy, dan apa yang terjadi bila Redis mati. Keputusannya ADR 27.");
    harus("- [[t3-dua-instance]]: dua instance di belakang proxy, yang membuat batas ini berlipat. Keputusannya ADR 26.");
    harus("- [[t2-login-aman]]: batas per alamat dan per akun di memori satu server. Keputusannya ADR 20.");
  });
  test("brute force dan credential stuffing tidak diulang: hanya ditaut ke 2.28", () => {
    expect(badan).not.toMatch(/argon2id|credential stuffing|brute force/i);
  });
});

describe("naskah M22: gejala, yang dikira, dan yang sebenarnya", () => {
  const baris22 = naskah.split("\n").find((b) => b.startsWith("| M22 |"))!;
  test("baris M22 di naskah memuat minggu 6, Dimas, Bayu, 24 percobaan, dua puluh lolos, batas 10, 10 sampai 20, 5 sampai 10, dan kunci akun di database", () => {
    expect(baris22).toBeDefined();
    for (const k of [
      "| M22 | 6 |", "Dimas menguji staging atas permintaan Bayu", "24 percobaan login dari satu IP ke akun uji yang berbeda dengan password bocor",
      "Dua puluh lolos ke pemeriksaan password sebelum ada yang ditolak 429, padahal batas per IP 10", "rekaman c4-ratelimit bagian F memberi 20 dari 24",
      "Penghitung gagal login salah di kode", "Proxy memilih instance acak, jadi batas efektif per IP antara 10 dan 20, per akun antara 5 dan 10",
      "per IP 10 pada satu instance dan 20 dengan round_robin, per akun 5 dan 10",
      "Kunci akun tidak ikut berlipat: `gagal_login` dan `terkunci_sampai` ada di database",
      "satu tebakan per akun tidak pernah menyentuh kunci akun (rekaman c4-ratelimit bagian C)", "Dengan N instance, batas bisa N kali lipat",
    ]) expect(baris22, k).toContain(k);
    harus("Minggu 6 Tahap 3. Bayu memasang instance API kedua di staging dan meminta Dimas dari tim TI mengujinya.");
    harus("Raka mengira penghitung gagal login salah di kode.");
    expect(frontmatter).toContain("Minggu 6.");
    expect(dari("t3-m22").label).toBe("Masalah 22 · minggu 6");
  });
  test("catatan Angka cerita: 24 dan 20 sama dengan rekaman, tetapi rekaman memakai password salah, dan hasil dengan password benar tidak direkam", () => {
    expect(R["dua-instance"]).toMatchObject({ percobaan: 24, sampai: 20 });
    harus("Angka 24 dan 20 sama dengan rekaman di blok \"Yang sebenarnya\", yang memakai password salah, jadi tiap percobaan yang sampai diperiksa passwordnya berakhir 401. Hasil dengan password yang benar tidak direkam.");
    harus(`Ia mengirim ${R["dua-instance"].percobaan} percobaan login dari satu alamat. Tiap percobaan ke akun uji yang berbeda, dengan password dari daftar kebocoran. Batas per alamat tertulis ${batasAlamat.kapasitas}, tetapi ${R["dua-instance"].sampai} dari ${R["dua-instance"].percobaan} percobaan sampai diperiksa passwordnya sebelum ada yang ditolak dengan 429.`);
    // klaim negatif berlingkup: di rekaman A sampai D tidak ada jawaban 200, dan semua pemanggilan tebak() di rekam_batas memakai password bawaan (SALAH)
    expect(runPy).toContain('SALAH = "tebakan-salah"');
    expect(runPy).toContain("def tebak(port, emails, password=SALAH):");
    const rekamBatas = runPy.slice(runPy.indexOf("def rekam_batas"), runPy.indexOf("# ---------- utama"));
    const panggilan = [...rekamBatas.matchAll(/\btebak\(([^)]*)\)/g)].map((m) => m[1]!);
    expect(panggilan.length).toBeGreaterThanOrEqual(8);
    for (const a of panggilan) expect(a, `tebak(${a})`).not.toMatch(/password/);
    expect(teksBagian(A0, akhirSebelum(E0))).not.toMatch(/\b200\b/);
  });
  test("tebakan Raka: satu instance meloloskan 10 dan menolak 14 (bagian B); jawaban di rekaman, bukan di judul details", () => {
    expect(R["satu-instance"]).toEqual({ percobaan: 24, sampai: 10, ditolak: 14, perInstance: "a 10" });
    expect(bagB).toContain("24 percobaan langsung ke instance a → 401: 10 · 429: 14");
    harus("Sepuluh. Di rekaman lab `batas.txt` bagian B, 10 percobaan menjawab 401 dan 14 ditolak 429. Penghitungnya benar.");
    expect(batasAlamat.kapasitas).toBe(10);
    harus("Ia membuka konstanta batas: 10 percobaan per alamat, terisi ulang 10 per menit, dan 5 percobaan per akun, terisi ulang 5 per menit.");
    expect(hal28).toContain(`Per alamat: ${batasAlamat.kapasitas} token sekaligus, isi ulang ${batasAlamat.perMenit} per menit. Per akun: 5 token sekaligus, isi ulang 5 per menit.`);
  });
  test("halaman 3.1 menulis hasil c4 bagian F yang sama; c4 bagian F dan C cocok dengan kalimat halaman", () => {
    expect(hal31).toContain("Dari 24 percobaan satu alamat yang bergantian ke keduanya, 20 lolos ke pemeriksaan password. Itu 10 per instance, bukan 10 total");
    expect(c4).toContain("24 percobaan satu IP, bergantian ke 2 instance → 401: 20 · 429: 4");
    expect(c4).toContain("akun yang terkunci oleh serangan ini: 0");
    harus("bagian F rekaman c4-ratelimit mengukurnya: 20 dari 24.");
    harus("Satu tebakan per akun tidak pernah menyentuh kunci akun, jadi penyemprotan banyak akun hanya dihentikan batas per alamat ([[t2-login-aman]], bagian C rekaman c4-ratelimit).");
  });
});

describe("EVAL3-F1 (W3): blok Gejala hanya berisi kejadian, dan pemeriksaan password didefinisikan satu kali di Yang sebenarnya", () => {
  // Penanda definisi dibaca dari tools/eval_tahap.py (perintah `gejala`), supaya tes ini ikut gagal bila alatnya dilemahkan.
  const evalPy = baca("tools/eval_tahap.py");
  // Alatnya peka huruf besar (kalimat berawal "Artinya ..." lolos); penjaga ini tidak, jadi lebih ketat dari alat.
  const reDef = new RegExp(cocok(evalPy, /^DEFINISI = re\.compile\(r"(.+)"\)$/m)[1]!, "i");
  const awalGejala = badan.indexOf('<Blok nama="Gejala" buka>');
  const gejala = badan.slice(awalGejala, badan.indexOf("</Blok>", awalGejala));
  const awalSebenarnya = badan.indexOf('<Blok nama="Yang sebenarnya">');
  const awalRantai = badan.indexOf("<Rantai data={batas} />");
  const DEFINISI = "Pemeriksaan password adalah langkah login yang membandingkan password yang dikirim dengan hash.";
  const paragraf = (t: string) => t.split("\n\n").map((p) => p.trim()).filter((p) => p !== "");
  const kalimat = (t: string) => paragraf(t).flatMap((p) => p.split(/(?<=[.!?])\s+/));

  test("penanda definisi dibaca dari tools/eval_tahap.py dan masih memuat semua kata penandanya", () => {
    for (const k of ["adalah", "yaitu", "disebut", "artinya", "berarti", "maksudnya", "merupakan"]) expect(reDef.source, k).toContain(k);
    expect(evalPy).toContain("if nama != \"Gejala\":");
  });
  test("Gejala: tiga paragraf adegan dan satu catatan Angka cerita; tidak ada kalimat berpenanda definisi, catatan ikut diperiksa", () => {
    const p = paragraf(gejala.replace('<Blok nama="Gejala" buka>', ""));
    expect(p).toHaveLength(4);
    expect(p.slice(0, 3).every((x) => !x.startsWith("*"))).toBe(true);
    expect(p[3]).toMatch(/^\*Angka cerita \(Ilustrasi\):\*/);
    expect(kalimat(gejala).filter((k) => reDef.test(k))).toEqual([]);
  });
  test("istilah pemeriksaan password: tidak dipakai di Gejala, di catatannya, atau di Tebak; pemakaian pertamanya adalah kalimat definisi di kalimat Inti Yang sebenarnya, sebelum Rantai", () => {
    expect(gejala).not.toMatch(/pemeriksaan password/i);
    expect(badan.slice(0, awalSebenarnya)).not.toMatch(/pemeriksaan password/i);
    expect(badan.match(/Pemeriksaan password adalah/g)).toHaveLength(1);
    const awalDefinisi = badan.indexOf(DEFINISI);
    expect(awalDefinisi, "kalimat definisi hilang").toBeGreaterThan(awalSebenarnya);
    expect(awalDefinisi).toBeLessThan(awalRantai);
    expect(badan.search(/pemeriksaan password/i)).toBe(awalDefinisi);
    expect(badan.slice(awalSebenarnya, awalRantai)).toContain(`Batas per alamat tidak salah hitung. Batas itu dihitung di memori tiap instance, dan dua instance punya dua penghitung yang tidak saling tahu. ${DEFINISI}\n`);
  });
  test("kata sehari-hari di adegan, catatan, dan Tebak ('diperiksa passwordnya'); jumlahnya dari rekaman: 20 dari 24, 401 20 dan 429 4", () => {
    const A = R["dua-instance"];
    expect(A).toMatchObject({ percobaan: 24, sampai: 20, ditolak: 4 });
    expect(A.sampai + A.ditolak).toBe(A.percobaan);
    expect(gejala).toContain(`${A.sampai} dari ${A.percobaan} percobaan sampai diperiksa passwordnya sebelum ada yang ditolak dengan 429.`);
    expect(gejala).toContain("jadi tiap percobaan yang sampai diperiksa passwordnya berakhir 401.");
    expect(badan).toContain("Berapa yang sampai diperiksa passwordnya?</summary>");
    expect(badan.match(/diperiksa passwordnya/g)).toHaveLength(3);
  });
  test("'sebelum ada yang ditolak' benar untuk rekaman A: percobaan dikirim berurutan (run.py), round_robin, 10 token per instance, jadi penolakan pertama jatuh sesudah 20 lolos", () => {
    const tebak = runPy.slice(runPy.indexOf("def tebak("), runPy.indexOf("def tampil_akun("));
    expect(tebak).toContain('hs = [minta("POST", "/login", port, {"email": e, "password": password}) for e in emails]');
    expect(tebak).not.toMatch(/Thread|concurrent|asyncio|Pool|submit\(/);
    expect(bergilir).toContain("lb_policy round_robin");
    const sisa: Record<string, number> = { a: batasAlamat.kapasitas, b: batasAlamat.kapasitas };
    const kirim = (x: string): number => {
      if (sisa[x]! > 0) {
        sisa[x] = sisa[x]! - 1;
        return 401;
      }
      return 429;
    };
    const hasil = Array.from({ length: R["dua-instance"].percobaan }, (_, i) => kirim(i % 2 === 0 ? "a" : "b"));
    expect(hasil.filter((h) => h === 401)).toHaveLength(R["dua-instance"].sampai);
    expect(hasil.filter((h) => h === 429)).toHaveLength(R["dua-instance"].ditolak);
    expect(hasil.indexOf(429)).toBe(R["dua-instance"].sampai);
    expect(hasil.slice(R["dua-instance"].sampai).every((h) => h === 429)).toBe(true);
  });
  test("definisi cocok dengan kode dan rekaman: langkah di periksaMasuk (dipanggil Login) yang membandingkan password dari request dengan hash akun, atau hash tiruan; rekaman A memakai istilah yang sama untuk 401", () => {
    const awal = sesiGo.indexOf("func (s Service) periksaMasuk(");
    const fn = sesiGo.slice(awal, sesiGo.indexOf("func (s Service) Login(", awal));
    expect(fn).toContain("func (s Service) periksaMasuk(ctx context.Context, email, password string) (repo.AkunMasuk, error) {");
    expect(fn).toContain("bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(password))");
    expect(fn).toContain("bcrypt.CompareHashAndPassword(hashPalsu, []byte(password))");
    const login = sesiGo.slice(sesiGo.indexOf("func (s Service) Login("), sesiGo.indexOf("func (s Service) LoginWeb("));
    expect(login).toContain("a, err := s.periksaMasuk(ctx, email, password)");
    expect(bagA).toContain("(401 sampai ke pemeriksaan password, 429 ditolak penahan per IP)");
    expect(runPy).toContain("(401 sampai ke pemeriksaan password, 429 ditolak penahan per IP)");
    // sesudah definisi, istilah itu dipakai apa adanya oleh Rantai, widget, dan Cek diri 3
    expect(badan.slice(awalRantai).match(/pemeriksaan password/g)).toHaveLength(1); // Cek diri 3
    expect(JSON.stringify(diagramMentah).match(/pemeriksaan password/g)).toHaveLength(2); // dua simpul Rantai
  });
});

describe("EVAL3-F1: kalimat tanpa penjaga turunan tidak lolos mutasi tanpa kunci baris (sisip 'tidak', angka +1, hapus baris)", () => {
  const S = R["satu-instance"], A = R["dua-instance"];
  test("tag lipat dan blok seimbang, jumlah dan kelasnya terkunci: satu details question, empat success, satu details polos; lima Blok", () => {
    expect(badan.match(/<details\b/g)).toHaveLength(6);
    expect(badan.match(/<\/details>/g)).toHaveLength(6);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<details>\n<summary>/g)).toHaveLength(1);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
  });
  test("adegan dan Raka: catatan Angka cerita, percobaan satu instance dan pertanyaan Tebak memakai jumlah dari rekaman bagian B", () => {
    harus("*Angka cerita (Ilustrasi):* staging, password dari daftar kebocoran, dan Dimas sebagai pencoba berasal dari naskah.");
    harus(`Angka ${A.percobaan} dan ${A.sampai} sama dengan rekaman di blok "Yang sebenarnya"`);
    harus(`Lalu ia menjalankan ${S.percobaan} percobaan yang sama langsung ke satu instance, tanpa proxy.`);
    harus(`<summary>Tebak dulu: ${S.percobaan} percobaan ke ${S.percobaan} akun berbeda dari satu alamat, langsung ke satu instance. Berapa yang sampai diperiksa passwordnya?</summary>`);
  });
  test("Yang sebenarnya: kalimat pembuka tiap paragraf bertanda tebal, kapasitas dari pembatas.go, pembagian dari rekaman A, rentang dari semua pembagian di bagian C", () => {
    harus(`**Satu bucket per key, di memori satu proses.** Setiap alamat punya bucket login berisi paling banyak ${batasAlamat.kapasitas} token, dan setiap request login mengambil satu token. Bucket itu hanya ada di peta milik proses yang menerimanya:`);
    harus("Batas login ditulis sebagai kapasitas dan laju isi ulang per detik:");
    expect(baruKode(pembatasGo, ambangIP, ambangIP)).toContain(`${batasAlamat.kapasitas}, ${batasAlamat.perMenit}.0 / 60`);
    harus(`**Dua instance, dua jatah.** Proxy bergantian, jadi tiap instance menerima ${A.percobaan / 2} dari ${A.percobaan} percobaan.`);
    const lolos = (k: number) => Math.min(k, batasAlamat.kapasitas) + Math.min(A.percobaan - k, batasAlamat.kapasitas);
    const semua = Array.from({ length: A.percobaan + 1 }, (_, k) => lolos(k));
    harus(`**Pilihan Caddy menentukan angkanya.** Kebijakan bawaan Caddy memilih instance secara acak, jadi hasilnya antara ${Math.min(...semua)} dan ${Math.max(...semua)}. Sepuluh bila`);
    harus(`**Isi ulang ikut berlipat.** Tiap instance mengisi ulang ${batasAlamat.perMenit} token per menit.`);
    const D = { dua: bagD.match(/→ 401: (\d+) · 429: (\d+)/) };
    expect(D.dua!.slice(1, 3)).toEqual(["10", "2"]);
    harus("**Yang tidak berlipat: kunci akun.** Dua belas tebakan ke satu akun lewat dua instance menjawab 401 sepuluh kali dan 429 dua kali. Bucket per akun juga di memori, 5 per instance.");
    harus("Yang longgar adalah penahan banjir per alamat. Satu tebakan per akun tidak pernah menyentuh kunci akun,");
    harus("Setiap `POST /login` mengambil satu token dari bucket alamat itu sebelum isi request dibaca, juga login yang passwordnya benar:");
  });
  test("Konsep yang lahir: butir keempat dan kelima dan kalimat penutup terkunci; tautannya ada di registry", () => {
    harus("- [[t2-m16]]: kunci akun di database, yang tidak ikut berlipat.");
    harus("- [[t3-dua-tempat]]: pola salinan di luar database yang kembali di memori dua instance.");
    harus("Yang disimpan di memori satu proses berlipat saat prosesnya dua.");
    expect(dari("t2-m16").nomor).toBe("2.27");
    expect(dari("t3-dua-tempat").nomor).toBe("3.4");
  });
});

describe("rekaman batas.txt: bagian A sampai D dan rentang Snippet", () => {
  test("bagian A: round_robin, 24 percobaan, 401 20 dan 429 4, per instance a 10 dan b 10, 429 a 2 dan b 2; tiap instance menerima 12", () => {
    expect(bagA).toContain("# --- A. Bucket di memori, dua instance, round_robin: 24 percobaan ke 24 akun berbeda dari satu alamat ---");
    expect(R["dua-instance"]).toEqual({ percobaan: 24, sampai: 20, ditolak: 4, perInstance: "a 10 · b 10" });
    expect(bagA).toContain("per instance: 401 a 10, b 10 · 429 a 2, b 2");
    const diterima = 10 + 2;
    expect(diterima * 2).toBe(R["dua-instance"].percobaan);
    harus(`Proxy bergantian, jadi tiap instance menerima ${diterima} dari ${R["dua-instance"].percobaan} percobaan.`);
    harus(`tiap instance mengizinkan ${batasAlamat.kapasitas} dan menolak ${diterima - batasAlamat.kapasitas}. Hasilnya ${R["dua-instance"].sampai} percobaan lolos dan ${R["dua-instance"].ditolak} ditolak:`);
    harus(`Satu instance dengan ${R["satu-instance"].percobaan} percobaan yang sama meloloskan ${R["satu-instance"].sampai} dan menolak ${R["satu-instance"].ditolak}:`);
  });
  test("bagian C: kebijakan random bawaan Caddy, antara 10 dan 20, angka pastinya tidak direkam; hitungan 20 bila tiap instance menerima paling sedikit 10 diuji dengan semua pembagian", () => {
    expect(bagC).toContain("kebijakan random bawaan Caddy: batas efektif antara 10 dan 20");
    expect(bagC).toContain("24 percobaan: yang sampai ke pemeriksaan password antara 10 dan 20: ya");
    expect(bagC).toContain("angka pastinya bergantung pada urutan acak, jadi tidak dicatat");
    const lolos = (k: number) => Math.min(k, 10) + Math.min(24 - k, 10);
    const semua = Array.from({ length: 25 }, (_, k) => lolos(k));
    expect(Math.min(...semua)).toBe(10);
    expect(Math.max(...semua)).toBe(20);
    const duaPuluh = semua.flatMap((v, k) => (v === 20 ? [k] : []));
    expect(duaPuluh).toEqual([10, 11, 12, 13, 14]); // 20 hanya bila tiap instance menerima paling sedikit 10 dari 24
    const sepuluh = semua.flatMap((v, k) => (v === 10 ? [k] : []));
    expect(sepuluh).toEqual([0, 24]); // 10 hanya bila semua jatuh ke satu instance
    harus("Sepuluh bila semua percobaan jatuh ke satu instance, dan 20 bila tiap instance menerima paling sedikit 10 percobaan (bagian C; angka pastinya tidak direkam).");
    expect(bawaan).toContain("kebijakan random");
    expect(bawaan).not.toContain("lb_policy");
    expect(bergilir).toContain("lb_policy round_robin");
    harus("Proxy memakai kebijakan `round_robin` (bawaan Caddy: `random`), supaya angkanya tetap.");
  });
  test("hitungan N × 10, isi ulang 30 menit (310 dan 620) dari konstanta kode, bukan ditulis tangan", () => {
    const isiUlang = batasAlamat.perMenit;
    const satu = batasAlamat.kapasitas + isiUlang * 30;
    expect(satu).toBe(310);
    expect(satu * 2).toBe(620);
    harus(`Tiap instance mengisi ulang ${isiUlang} token per menit.`);
    harus(`Dalam 30 menit satu instance mengizinkan paling banyak ${batasAlamat.kapasitas} + ${isiUlang} × 30 = ${satu} percobaan dari satu alamat. Dua instance mengizinkan ${satu * 2} (Hitungan dari konstanta di atas; tidak direkam).`);
    harus("Dengan N instance, batasnya sampai N × 10 (Hitungan; hanya dua instance yang direkam).");
    // isi ulang per detik di kode = per menit ÷ 60
    expect(pembatasGo).toContain("AmbangLoginIP   = [2]float64{10, 10.0 / 60}");
    expect(pembatasGo).toContain("AmbangLoginAkun = [2]float64{5, 5.0 / 60}");
    // "paling banyak" berlaku bila bucket penuh di awal: key baru mulai dari kapasitas
    expect(pembatasGo).toContain("b = &bucket{token: p.kapasitas, terakhir: kini}");
    expect(pembatasGo).toContain("b.token = math.Min(p.kapasitas, b.token+kini.Sub(b.terakhir).Seconds()*p.perDetik)");
    // naskah menulis 600 (2 × 10 × 30) tanpa 10 token awal: halaman menulis hitungan sendiri dan tidak menyebut 600
    expect(badan).not.toMatch(/\b600\b/);
  });
  test("bagian D: 12 tebakan ke satu akun lewat dua instance, 401 10 dan 429 2; gagal_login 5 dan terkunci; satu instance 401 5 dan 429 7", () => {
    expect(bagD).toContain("dua instance (round_robin), 12 tebakan ke satu akun dari satu alamat → 401: 10 · 429: 2");
    expect(bagD).toContain("tebakan 1-5 per instance lolos bucket, tebakan 11 dan 12 ditolak 429: 401 sepuluh kali, bukan lima");
    expect(bagD).toContain("database sesudahnya (kunci akun: gagal_login berhenti di 5, tebakan 6-10 bertemu akun terkunci):");
    const d = bagD.split("\n");
    const tabel = (dariBaris: number) => d.slice(dariBaris, dariBaris + 5).map((b) => b.replace(/ +/g, " "));
    const iSesudah = d.findIndex((b) => b.startsWith("database sesudahnya"));
    expect(tabel(iSesudah + 1)).toEqual(["=> SELECT gagal_login, terkunci_sampai IS NOT NULL AS terkunci FROM akun WHERE email = 'karyawan10101@lestari.example'", " gagal_login | terkunci", "-------------+----------", " 5 | t", "(1 row)"]);
    const iSatu = d.findIndex((b) => b.startsWith("satu instance, 12 tebakan ke satu akun"));
    expect(d[iSatu]).toBe("satu instance, 12 tebakan ke satu akun → 401: 5 · 429: 7");
    expect(tabel(iSatu + 1)).toEqual(["=> SELECT gagal_login, terkunci_sampai IS NOT NULL AS terkunci FROM akun WHERE email = 'karyawan10102@lestari.example'", " gagal_login | terkunci", "-------------+----------", " 5 | t", "(1 row)"]);
    harus("Dua belas tebakan ke satu akun lewat dua instance menjawab 401 sepuluh kali dan 429 dua kali. Bucket per akun juga di memori, 5 per instance.");
    harus("Rekaman mencatat hasil akhirnya: `gagal_login` 5 dan akun terkunci. Dua baris keterangan di rekaman itu (tebakan 1-5 per instance lolos bucket; tebakan 6-10 bertemu akun terkunci) ditulis oleh lab, bukan diukur per tebakan.");
    harus("Dari kode di bawah, tebakan 6 sampai 10 bertemu akun terkunci dan dijawab 401 yang sama dengan password salah. Jadi password dibandingkan dengan hash akun lima kali, bukan sepuluh. Lima tebakan sisanya dibandingkan dengan hash tiruan, supaya waktunya sama (penalaran dari kode).");
    // dua keterangan itu memang ada di rekaman sebagai teks tulisan tangan run.py (bukan hasil ukur per tebakan)
    expect(runPy).toContain("tebakan 1-5 per instance lolos bucket, tebakan 11 dan 12 ditolak 429");
    expect(runPy).toContain("tebakan 6-10 bertemu akun terkunci");
    expect(runPy).toContain("hs = tebak(PORT_PROXY, [akun] * 12)");
    expect(10 - 5).toBe(5); // tebakan 6 sampai 10
  });
  test("baris rekaman yang tampil di Snippet (baris 8 sampai 33: bagian A sampai D, dengan kepala dan keterangan tiap bagian) dikunci utuh dengan sidik jari", () => {
    // keterangan di kepala bagian dan kurung penjelas ikut tampil lewat Snippet tetapi tidak diurai angka-angkanya; ubah satu karakter,
    // baca lagi rekamannya, lalu perbarui sidiknya
    expect(baris[7]).toMatch(/^# --- A\. /);
    expect(baris[32]).toBe("(1 row)");
    expect(sidik(baris.slice(7, 33).join("\n"))).toBe(SIDIK_REKAMAN_TAMPIL);
  });
  test("kata bilangan di halaman cocok dengan angka rekaman dan kode (sepuluh, dua puluh, dua belas, lima, dua)", () => {
    const KATA: Record<string, number> = { dua: 2, lima: 5, sepuluh: 10, "dua belas": 12, "dua puluh": 20 };
    const d401 = Number(cocok(bagD, /dua instance \(round_robin\), 12 tebakan ke satu akun dari satu alamat → 401: (\d+) · 429: (\d+)/)[1]);
    const d429 = Number(cocok(bagD, /dua instance \(round_robin\), 12 tebakan ke satu akun dari satu alamat → 401: (\d+) · 429: (\d+)/)[2]);
    expect([d401, d429, d401 + d429]).toEqual([KATA.sepuluh, KATA.dua, KATA["dua belas"]]);
    harus(`Dimas memberi tahu Bayu: "Batasnya sepuluh, tetapi dua puluh yang lewat."`);
    expect([batasAlamat.kapasitas, R["dua-instance"].sampai]).toEqual([KATA.sepuluh, KATA["dua puluh"]]);
    harus("Dua belas tebakan ke satu akun lewat dua instance menjawab 401 sepuluh kali dan 429 dua kali.");
    expect(badan).toContain("**2.** Dua belas tebakan ke satu akun lewat dua instance menjawab 401 sepuluh kali.");
    expect(diagram.baris[2]!.simpul[0]!.sub).toBe("401 sepuluh kali, 429 dua kali");
    expect(badan).toContain("dua puluh bila tiap instance menerima paling sedikit 10");
    expect(Math.min(R["dua-instance"].sampai, 20)).toBe(KATA["dua puluh"]);
    // batas per akun dari kode: 5 sekaligus, isi ulang 5 per menit, dan 5 per instance di halaman
    const akun = cocok(pembatasGo, /AmbangLoginAkun = \[2\]float64\{(\d+), (\d+)\.0 \/ 60\}/);
    harus(`dan ${akun[1]} percobaan per akun, terisi ulang ${akun[2]} per menit.`);
    harus(`Bucket per akun juga di memori, ${akun[1]} per instance.`);
    expect(Number(akun[1]) * 2).toBe(d401); // dua instance × 5 = 10 tebakan yang lolos bucket per akun
    // jumlah instance di teks widget dan Rantai: dua
    expect(widgetMentah.pertanyaan).toContain("Proxy meneruskannya bergantian ke dua instance");
    expect(Object.keys(R["dua-instance"])).toContain("perInstance");
    expect(R["dua-instance"].perInstance.split(" · ")).toHaveLength(2);
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, dan judulnya menyebut berkas, nomor baris, dan bagian yang sama", () => {
    const tag = [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => m[1]!);
    const atribut = (t: string, nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    const aktual = tag.map((t) => ({
      berkas: atribut(t, "file") ?? [...t.matchAll(/"([^":]+):(\d+):(\d+)"/g)].map((m) => `${m[1]}:${m[2]}:${m[3]}`).join(" + "),
      lines: atribut(t, "lines"),
      judul: atribut(t, "title"),
    }));
    const P = "labs/api-t3/internal/service/pembatas.go", H = "labs/api-t3/internal/handler/handler.go", S = "labs/api-t3/internal/service/sesi.go", B = "labs/t3-instance/output/batas.txt";
    const kode = (f: string, a: number, b: number, ket: string) => `Kode lab: ${f} baris ${a} sampai ${b} (${ket})`;
    const rek = (a: string, ket: string) => `Rekaman lab: ${B}, bagian ${a} (${ket})`;
    expect(aktual).toEqual([
      { berkas: P, lines: `${strukPembatas0}:${strukPembatas1}`, judul: kode(P, strukPembatas0, strukPembatas1, "bucket di peta satu proses") },
      { berkas: P, lines: `${ambangIP}:${ambangAkun}`, judul: kode(P, ambangIP, ambangAkun, "batas login per alamat dan per akun") },
      { berkas: B, lines: `${A0}:${akhirSebelum(B0)}`, judul: rek("A", "dua instance, round_robin") },
      { berkas: B, lines: `${B0}:${akhirSebelum(C0)}`, judul: rek("B", "satu instance") },
      { berkas: B, lines: `${D0}:${D1}`, judul: rek("D", "satu akun, dua instance") },
      { berkas: S, lines: `${kunci0}:${kunci1}`, judul: kode(S, kunci0, kunci1, "hitungan gagal login dan kunci di database") },
      { berkas: H, lines: `${clientIP0}:${clientIP1}`, judul: kode(H, clientIP0, clientIP1, "alamat client dari alamat koneksi") },
      { berkas: `${H}:${izinkan0}:${izinkan1} + ${H}:${login0}:${login1}`, lines: undefined, judul: `Kode lab: ${H} baris ${izinkan0} sampai ${izinkan1} dan ${login0} sampai ${login1} (token diambil sebelum isi request dibaca)` },
      { berkas: B, lines: `${A0}:${akhirSebelum(E0)}`, judul: `Rekaman lab: ${B}, bagian A sampai D (tanpa baris kepala)` },
    ]);
    expect(ambangAkun).toBe(ambangIP + 1);
    expect(login1 - login0).toBe(3);
    // bagian rekaman yang dikutip: kepala (baris 1 sampai 3, memuat nomor keputusan) tidak ikut
    expect(A0).toBeGreaterThan(3);
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, atau nomor keputusan", () => {
    const rentang: [string, number, number][] = [
      [pembatasGo, strukPembatas0, strukPembatas1], [pembatasGo, ambangIP, ambangAkun], [sesiGo, kunci0, kunci1], [handlerGo, clientIP0, clientIP1],
      [handlerGo, izinkan0, izinkan1], [handlerGo, login0, login1],
    ];
    for (const [kode, a, b] of rentang) expect(baruKode(kode, a, b), `${a}:${b}`).not.toMatch(/keputusan \d+|\bR\d-\d+|PR #\d+|NASKAH|KONSISTENSI/);
    expect(teksBagian(A0, akhirSebelum(E0))).not.toMatch(/keputusan \d+|\bR\d-\d+|PR #\d+|NASKAH|KONSISTENSI/);
    // komentar kode dalam rentang yang dikutip kosong (komentar lab internal tidak tampil)
    for (const [kode, a, b] of rentang) expect(baruKode(kode, a, b), `${a}:${b}`).not.toMatch(/^\s*\/\//m);
  });
  test("kondisi rekaman: PostgreSQL 17.11, Caddy 2.11.7 di kontainer, dua proses di host, jam bucket dibekukan, password salah", () => {
    expect(baris[1]).toContain("PostgreSQL 17.11");
    expect(baris[1]).toContain("Caddy 2.11.7");
    expect(compose).toContain("image: caddy:2.11.7-alpine");
    expect(baris[1]).toContain("instance a di 127.0.0.1:18180, instance b di 127.0.0.1:18182, proxy di 127.0.0.1:18183");
    expect(baris[5]).toContain("Jam bucket di memori dibekukan supaya tidak terisi ulang di tengah rekaman.");
    expect(runPy).toContain('d.mulai(d.BIN, port_instans(nama), ["-lab", "-jam-lab", "-instance", nama, *args],');
    expect(readmeLab).toContain("Dua proses `api-t3` berjalan di host, di belakang proxy Caddy 2.11.7 di kontainer.");
    harus("*Kondisi rekaman:* PostgreSQL 17.11, dua proses `api-t3` (a dan b) di host, dan proxy Caddy 2.11.7 di kontainer.");
    harus("Jam bucket dibekukan supaya tidak terisi ulang di tengah rekaman, dan password yang dikirim salah.");
    // proxy lab hanya memakai round_robin: tanpa health check dan tanpa retry di konfigurasi bergilir
    expect(bergilir).not.toMatch(/health_uri|lb_retries|health_port/);
  });
});

describe("kode lab: bucket per proses, kunci akun di database, alamat client", () => {
  test("Pembatas: peta bucket di struct, key baru mulai penuh, tiap Server membuat pembatas login sendiri (tanpa -redis)", () => {
    expect(baruKode(pembatasGo, strukPembatas0, strukPembatas1)).toContain("bucket    map[string]*bucket");
    const handlerBaru = handlerGo.slice(handlerGo.indexOf("loginIP: service.PembatasBaru("), handlerGo.indexOf("loginIP: service.PembatasBaru(") + 120);
    expect(handlerBaru).toContain("service.PembatasBaru(service.AmbangLoginIP[0], service.AmbangLoginIP[1])");
    const main = baca("labs/api-t3/cmd/api/main.go");
    expect(main).toContain("var batasIP, batasAkun *service.PembatasBersama");
    expect(main).toContain("if batasIP != nil {");
  });
  test("per akun di memori dulu (429), lalu kunci di database; terkunci dijawab ErrLoginGagal, sama dengan password salah, yaitu 401", () => {
    expect(sesiGo).toContain("if ok, tunggu := s.loginAkun.Izinkan(strings.ToLower(email), kini); !ok {");
    const awal = sesiGo.indexOf("func (s Service) periksaMasuk(");
    const fn = sesiGo.slice(awal, sesiGo.indexOf("func (s Service) Login(", awal));
    expect(fn.indexOf("s.loginAkun.Izinkan")).toBeLessThan(fn.indexOf("tx.PercobaanLogin"));
    expect(fn.indexOf("tx.PercobaanLogin")).toBeLessThan(fn.indexOf("bcrypt.CompareHashAndPassword([]byte(a.PasswordHash)"));
    expect(fn).toMatch(/if terkunci \{\n\t\t_ = bcrypt\.CompareHashAndPassword\(hashPalsu, \[\]byte\(password\)\)\n\t\treturn a, ErrLoginGagal\n\t\}/);
    expect(fn).toContain("if sampai != nil && sampai.After(kini) {\n\t\t\tterkunci = true\n\t\t\treturn nil\n\t\t}");
    expect(sesiGo).toContain("ambangGagal      = 5");
    expect(handlerGo).toMatch(/case errors\.Is\(err, service\.ErrLoginGagal\):[^]*?Status: 401/);
    expect(handlerGo).toMatch(/case errors\.As\(err, &lambat\):\n\t\tterlaluSering\(w, lambat, "Terlalu banyak percobaan untuk akun ini"\)/);
  });
  test("login mengambil token IP sebelum isi request dibaca, untuk semua login (juga yang benar); alamat dari RemoteAddr, bukan header", () => {
    const fn = baruKode(handlerGo, login0, penutup(handlerGo, login0, "}"));
    expect(fn.indexOf("s.izinkanIP(w, r, s.loginIP")).toBeGreaterThan(0);
    expect(fn.indexOf("s.izinkanIP(w, r, s.loginIP")).toBeLessThan(fn.indexOf("json.NewDecoder"));
    expect(fn.indexOf("json.NewDecoder")).toBeLessThan(fn.indexOf("s.svc.Login("));
    expect(baruKode(handlerGo, izinkan0, izinkan1)).toContain("service.KunciAlamat(clientIP(r))");
    expect(baruKode(handlerGo, clientIP0, clientIP1)).toContain("net.SplitHostPort(r.RemoteAddr)");
    expect(baruKode(handlerGo, clientIP0, clientIP1)).not.toMatch(/Header/);
  });
  test("klaim negatif berlingkup: tidak ada kode di labs/api-t3 (semua berkas .go bukan tes) yang membaca X-Forwarded-For atau X-Real-IP di luar komentar", () => {
    const berkas = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(berkas.length).toBeGreaterThan(10);
    for (const f of berkas) expect(tanpaKomentar(baca(f)), f).not.toMatch(/Forwarded|X-Real-IP|RealIP/i);
    harus("tetapi `api-t3` tidak membaca header itu.");
  });
  test("lab tidak membedakan dua client lewat proxy di Docker Desktop (README) dan kepala rekaman menulis satu key per IP", () => {
    expect(readmeLab).toContain("lab tidak bisa membedakan dua client lewat proxy di Docker Desktop, jadi perilaku ini tidak direkam.");
    expect(readmeLab).toContain("Di belakang proxy, itu alamat proxy untuk semua client, jadi seluruh client berbagi satu key per IP. `X-Forwarded-For` dari proxy tepercaya belum dibaca.");
    expect(baris[3]).toContain("Satu client menebak password dari satu alamat.");
    expect(baris[4]).toContain("jadi seluruh client di belakang proxy berbagi satu key per IP; X-Forwarded-For belum dibaca");
    harus("Rekaman memakai satu client, jadi tidak membedakan client.");
    harus("Lab tidak membedakan dua client lewat proxy di Docker Desktop, jadi perilaku ini tidak direkam.");
    harus("**Satu key untuk semua client (dibaca dari kode, Tidak dijalankan).**");
    harus("Jadi semua karyawan yang masuk lewat satu proxy memakai satu key per alamat.");
    harus("Dari bucket yang penuh, sebelas login dari sebelas orang berbeda yang tiba hampir bersamaan di satu instance menghabiskan jatah 10. Yang ke-11 mendapat 429 walau passwordnya benar.");
    expect(batasAlamat.kapasitas + 1).toBe(11);
    // naskah ADR 27 menulis hal yang sama sebagai "kapan salah" (dari mekanismenya, tidak direkam)
    expect(naskah).toContain("Di belakang proxy tanpa `X-Forwarded-For` dari proxy tepercaya semua client berbagi satu key per IP (batas.txt, kepala rekaman), jadi satu penyerang bisa menolak login semua orang (dari mekanismenya, tidak direkam)");
  });
});

describe("sumber luar: dokumentasi Caddy, Go net/http, dan baris riset R3-175 dan R3-176", () => {
  test("tanggal akses, versi, dan kalimat yang dipakai halaman sama dengan baris riset; tidak ada tautan eksternal di halaman", () => {
    expect([...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)]).toHaveLength(0);
    const r176 = barisRiset("R3-176");
    expect(r176).toContain("pkg.go.dev/net/http@go1.27.1 (Published Sep 1, 2026; versi di go.mod dan `go version` host lab)");
    expect(r176).toContain("pkg.go.dev/net/http, Version go1.27.3 (Published Oct 20, 2026)");
    expect(r176).toContain("teks field sama di kedua versi");
    expect(r176).toContain("dibuka 2026-10-26");
    expect(r176).toContain('alamat "IP:port" sebelum memanggil handler');
    expect(r176).toContain("penalaran dari kata \"yang mengirim request\"");
    harus("Dokumentasi `net/http` Go 1.27.1, versi yang dipakai lab, menulis bahwa server mengisi `RemoteAddr` dengan alamat \"IP:port\" yang mengirim request (dibuka 2026-10-26; Go 1.27.3 menulis hal yang sama).");
    harus("koneksi ke `api-t3` datang dari proxy (penalaran), jadi alamat itu alamat proxy.");
    expect(baca("labs/api-t3/go.mod")).toMatch(/^go 1\.27\.1$/m); // versi lab yang disebut halaman; 1.27.3 dari baris riset versi dasar
    expect(barisRiset("R3-01")).toContain("Go 1.27.3");
    const r175 = barisRiset("R3-175");
    expect(r175).toContain("caddyserver.com/docs/caddyfile/directives/reverse_proxy");
    expect(r175).toContain("halaman tanpa nomor versi, dibuka 2026-10-26");
    expect(r175).toContain("ia menyetel atau menambah `X-Forwarded-For`");
    expect(r175).toContain("proxy secara bawaan mengabaikan nilai dari request masuk, untuk mencegah spoofing");
    expect(r175).toContain("`trusted_proxies`");
    harus("Caddy menyetel atau menambah `X-Forwarded-For` dan, secara bawaan, mengabaikan nilai yang datang dari client (dokumentasi Caddy tanpa nomor versi, dibuka 2026-10-26)");
    expect(new Date("2026-10-26").getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
    expect(barisRiset("R3-71")).toContain("X-Forwarded-For dari luar diabaikan kecuali `trusted_proxies`");
    expect(barisRiset("R3-71")).toContain("lb_policy bawaan random"); // dasar kalimat "kebijakan bawaan Caddy memilih instance secara acak"
  });
  test("baris riset R3-175 dan R3-176 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(sidik(barisRiset("R3-175"))).toBe(SIDIK_R175);
    expect(sidik(barisRiset("R3-176"))).toBe(SIDIK_R176);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca (halaman, diagram, widget, kartu)", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string }[]).filter((k) => k.halaman === "t3-m22");
    for (const t of [badan, frontmatter, JSON.stringify(diagramMentah), JSON.stringify(widgetMentah), JSON.stringify(kartu)]) {
      expect(t).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(t).not.toMatch(/keputusan \d+|PR #\d+|NASKAH-3|KONSISTENSI/);
    }
  });
  test("label sumber: arti ditaut ke A0 di Gejala; Hitungan dan Tidak dijalankan dipakai tepat; tanpa Asumsi", () => {
    harus("Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].");
    expect(badan.match(/\(Hitungan[^)]*\)/g)).toHaveLength(2);
    expect(badan.match(/Tidak dijalankan/g)).toHaveLength(2); // satu di Gejala (arti label), satu di judul tebal "dibaca dari kode"
    expect(badan.match(/\(penalaran\)/g)).toHaveLength(1);
    expect(badan.match(/\(penalaran dari kode\)/g)).toHaveLength(1);
    expect(badan).not.toMatch(/Asumsi|\[perlu verifikasi\]/);
    expect(badan.match(/\(Ilustrasi\)/g)).toHaveLength(1);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("tiga baris: satu instance (10 dan 14), dua instance (20 dan 4, a 10 b 10, a 2 b 2), satu akun (10 lolos, gagal_login 5, tebakan 6 sampai 10)", () => {
    const satu = R["satu-instance"], dua = R["dua-instance"];
    expect(diagram.baris.map((b) => b.label)).toEqual(["Satu instance", "Dua instance, bergantian", "Dua instance, satu akun"]);
    const teks = (i: number) => diagram.baris[i]!.simpul.map((s) => [s.teks, s.sub ?? null, s.nada]);
    expect(teks(0)).toEqual([
      [`${satu.percobaan} percobaan dari satu alamat`, "langsung ke instance a", "biasa"],
      [`${satu.sampai} sampai ke pemeriksaan password`, `jatah per alamat ${batasAlamat.kapasitas}`, "good"],
      [`${satu.ditolak} ditolak 429`, null, "biasa"],
    ]);
    expect(teks(1)).toEqual([
      [`${dua.percobaan} percobaan dari satu alamat`, `${dua.percobaan / 2} ke tiap instance`, "biasa"],
      [`${dua.sampai} sampai ke pemeriksaan password`, "a 10, b 10", "warn"],
      [`${dua.ditolak} ditolak 429`, "a 2, b 2", "biasa"],
    ]);
    expect(teks(2)).toEqual([
      ["10 lolos batas per akun di memori", "401 sepuluh kali, 429 dua kali", "warn"],
      ["gagal_login di database berhenti di 5", "kunci akun tidak berlipat", "good"],
      ["tebakan 6 sampai 10 bertemu akun terkunci", "dibaca dari kode: tetap dijawab 401", "biasa"],
    ]);
    expect(diagram.baris[0]!.sub).toBe(`${satu.percobaan} percobaan ke ${satu.percobaan} akun berbeda`);
    expect(diagram.baris[1]!.sub).toBe(`${dua.percobaan} percobaan ke ${dua.percobaan} akun berbeda`);
    expect(diagram.baris[2]!.sub).toBe("12 tebakan ke satu akun");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-instance · batas.txt bagian A, B, dan D; urutan tebakan di bagian D dibaca dari kode" });
    expect(diagram.id).toBe("t3-m22-batas-dua-jatah");
    expect(diagram.catatan).toBe("Batas per alamat dan per akun di memori berlipat menjadi dua jatah. Hitungan kunci akun di database tetap lima.");
  });
  test("diagram dikunci dengan sidik jari (setiap nilai string) dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK_DIAGRAM);
    const sebenarnya = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(sebenarnya).toContain("<Rantai data={batas} />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan).toContain('import batas from "../../../../data/diagram/t3-m22-batas-dua-jatah.json";');
  });
});

describe("widget BatasInstance: dipasang sekali di blok Coba, teks dikunci, dan wrapper memuat noscript", () => {
  test("satu <BatasInstance /> di blok Coba sendiri, dengan island PertahananLogin dan data dari rekaman dan kode", () => {
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba sendiri">'), badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(coba.match(/<BatasInstance \/>/g)).toHaveLength(1);
    expect(badan.match(/<BatasInstance/g)).toHaveLength(1);
    expect(wrapper).toContain('bacaBatas(baca("labs/t3-instance/output/batas.txt"))');
    expect(wrapper).toContain('bacaBatasAlamat(baca("labs/api-t3/internal/service/pembatas.go"))');
    expect(wrapper).toContain("<PertahananLoginIsland client:visible");
    const markup = wrapper.split(/^---\n/m).slice(2).join("---\n"); // di luar frontmatter: komentar di kepala tidak dihitung
    expect(markup).toMatch(/^<noscript>\n\s*<p>\{L\.tanpaJs\}<\/p>\n\s*<table>[^]*<\/table>\n<\/noscript>$/m);
    expect(markup).toContain("<PertahananLoginIsland client:visible");
    harus("Widget ini membaca rekaman bagian A dan B. Tebak dulu apa yang terjadi di dua instance, lalu ubah satu hal: jumlah instance.");
  });
  test("teks widget: sumber Rekaman lab bagian A dan B; pilihan dan kondisi; jawaban benar di pilihan keempat (bukan pertama, kedua, atau ketiga seperti widget Tahap 3 lain)", () => {
    expect(widgetMentah.sumber).toBe("Rekaman lab · t3-instance, bagian A dan B");
    expect(widgetMentah.ubahJudul).toBe("Ubah satu hal: jumlah instance");
    expect(widgetMentah.pilihan.map((p) => p.angka)).toEqual([10, 24, 12, 20]);
    expect(widgetMentah.pilihan.findIndex((p) => p.angka === R["dua-instance"].sampai)).toBe(3);
    expect(widgetMentah.kondisi["dua-instance"].catatan).toContain("Rekaman bagian A.");
    expect(widgetMentah.kondisi["satu-instance"].catatan).toBe("Rekaman bagian B. Percobaan dikirim langsung ke instance a, tanpa proxy.");
    expect(widgetMentah.kondisi["dua-instance"].catatan).toContain("antara 10 dan 20, dan angka pastinya tidak direkam (bagian C)");
    expect(widgetMentah.baris.terbuka).toBe("Yang sampai, per instance");
  });
  test("jawaban benar tidak terpanjang dan tidak terpendek di antara pilihan (panjang teks tidak membocorkan jawaban)", () => {
    const panjang = widgetMentah.pilihan.map((p) => p.teks.length);
    const benar = widgetMentah.pilihan.findIndex((p) => p.angka === R["dua-instance"].sampai);
    expect(panjang[benar]).toBeLessThan(Math.max(...panjang));
    expect(panjang[benar]).toBeGreaterThan(Math.min(...panjang));
  });
  test("wrapper menurunkan pilihan, jawaban benar, kondisi, dan tabel dari rekaman dan meneruskannya ke island", () => {
    expect(wrapper).toContain('const benar = indeksBenar(pilihan, R["dua-instance"].sampai);');
    expect(wrapper).toContain("const pilihan = L.pilihan.map((p) => ({ ...p, alasan: isi(p.alasan, utama) }));");
    expect(wrapper).toContain('const utama = nilai("dua-instance");');
    expect(wrapper).toContain("kesimpulan: isi(L.kondisi[kode].kesimpulan, nilai(kode)),");
    expect(wrapper).toContain("const tabel = Object.fromEntries(KONDISI.map((k) => [k, tabelBatas(R[k], batas)]))");
    expect(wrapper).toContain("pertanyaan: isi(L.pertanyaan, utama)");
    expect(wrapper).toContain("pilihan={pilihan.map((p) => ({ teks: p.teks, alasan: p.alasan }))} benar={benar} kondisi={kondisi} tabel={tabel} label={label} />");
  });
  test("widget dikunci dengan sidik jari (setiap nilai string)", () => {
    expect(sidik(JSON.stringify(widgetMentah))).toBe(SIDIK_WIDGET);
  });
  test("tanpa JavaScript: wrapper memuat tabel statis; kunci akun dan kebijakan acak ada di lipatan rekaman", () => {
    harus("<summary>Rekaman bagian A sampai D (juga untuk pembaca tanpa JavaScript)</summary>");
    harus("Kunci akun (bagian D) dan kebijakan acak Caddy (bagian C) tidak ada di widget. Keduanya ada di rekaman ini, juga untuk pembaca tanpa JavaScript:");
  });
});

describe("kartu Cek diri: empat kartu, sama dengan kartu.json", () => {
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const soal = [...cek.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-m22");
    expect(kartu.map((k) => k.id)).toEqual(["t3-m22-1", "t3-m22-2", "t3-m22-3", "t3-m22-4"]);
    soal.forEach((m, i) => {
      expect(kartu[i]!.tanya).toBe(m[2]);
      expect(kartu[i]!.jawab).toBe(m[3]);
      expect(kartu[i]!.judul).toBe("3.16 M22: Batas login jadi dua kali lipat");
      expect(kartu[i]!.url).toBe("tahap-3/m22-batas-login-dua-kali/");
    });
  });
  test("kartu 1 sampai 4 menyebut fakta rekaman yang sama dengan bagian A, D, C, dan kode", () => {
    const k = (n: number) => badan.slice(badan.indexOf(`**${n}.**`), badan.indexOf(`**${n + 1}.**`) > 0 ? badan.indexOf(`**${n + 1}.**`) : undefined);
    expect(k(1)).toContain("masing-masing menerima 12 percobaan, mengizinkan 10 dan menolak 2 (`batas.txt` bagian A). Batas di kode tetap 10 per instance.");
    expect(k(2)).toContain("Hitungan `gagal_login` ada di database dan berhenti di 5. Tebakan 6 sampai 10 bertemu akun terkunci dan dijawab 401 yang sama, sesudah dibandingkan dengan hash tiruan (dibaca dari kode; `batas.txt` bagian D mencatat hasil akhirnya).");
    expect(k(3)).toContain("Antara 10 dan 20. Sepuluh bila semua percobaan jatuh ke satu instance, dua puluh bila tiap instance menerima paling sedikit 10. Angka pastinya bergantung pada urutan acak dan tidak direkam (`batas.txt` bagian C).");
    expect(k(4)).toContain("Kode memakai alamat koneksi, dan di belakang proxy itu alamat proxy. Kode juga tidak membaca `X-Forwarded-For`. Ini dibaca dari kode dan tidak direkam, karena lab tidak membedakan dua client lewat proxy.");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor", () => {
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
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (description memuat 'minggu 6', '20 dari 24', 'dua jatah', dan 'tetap lima')", () => {
    expect(frontmatter.trim().split("\n")).toEqual(FRONTMATTER);
    expect(FRONTMATTER[1]).toContain("Minggu 6.");
    expect(FRONTMATTER[1]).toContain("20 dari 24");
    expect(FRONTMATTER[1]).toContain("dua jatah");
    expect(FRONTMATTER[1]).toContain("tetap lima");
    expect(FRONTMATTER[1]).toContain(`${batasAlamat.kapasitas}`);
  });
});

const SIDIK_R175 = "4277ac286584aed7";
const SIDIK_R176 = "9fa5f20bd1143c8c";
const SIDIK_DIAGRAM = "81e95ca515f69051";
const SIDIK_WIDGET = "56fd7236ca72377d";
const SIDIK_REKAMAN_TAMPIL = "f0ad4b05a688e3a3";
const FRONTMATTER: string[] = [
  "title: \"3.16 M22: Batas login jadi dua kali lipat\"",
  "description: Minggu 6. Sesudah instance kedua dipasang di staging, 20 dari 24 percobaan login dari satu alamat sampai ke pemeriksaan password, padahal batas per alamat 10. Batas itu dihitung di memori tiap instance, jadi dua instance memberi dua jatah. Kunci akun di database tetap lima.",
];
const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import BatasInstance from \"../../../components/BatasInstance.astro\";",
  "import batas from \"../../../../data/diagram/t3-m22-batas-dua-jatah.json\";",
  "<p class=\"meta\">Baca 6 menit · coba 3 menit · Prasyarat: [[t3-dua-instance]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 6 Tahap 3. Bayu memasang instance API kedua di staging dan meminta Dimas dari tim TI mengujinya. Dimas suka mencoba, dan ia mulai dari pintu login.",
  "Ia mengirim 24 percobaan login dari satu alamat. Tiap percobaan ke akun uji yang berbeda, dengan password dari daftar kebocoran. Batas per alamat tertulis 10, tetapi 20 dari 24 percobaan sampai diperiksa passwordnya sebelum ada yang ditolak dengan 429.",
  "Dimas memberi tahu Bayu: \"Batasnya sepuluh, tetapi dua puluh yang lewat.\" Bayu meneruskannya ke Raka.",
  "*Angka cerita (Ilustrasi):* staging, password dari daftar kebocoran, dan Dimas sebagai pencoba berasal dari naskah. Angka 24 dan 20 sama dengan rekaman di blok \"Yang sebenarnya\", yang memakai password salah, jadi tiap percobaan yang sampai diperiksa passwordnya berakhir 401. Hasil dengan password yang benar tidak direkam. Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka mengira penghitung gagal login salah di kode. Ia membuka konstanta batas: 10 percobaan per alamat, terisi ulang 10 per menit, dan 5 percobaan per akun, terisi ulang 5 per menit. Angka itu sama dengan yang ditulis ADR 20 di [[t2-login-aman]].",
  "Lalu ia menjalankan 24 percobaan yang sama langsung ke satu instance, tanpa proxy.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: 24 percobaan ke 24 akun berbeda dari satu alamat, langsung ke satu instance. Berapa yang sampai diperiksa passwordnya?</summary>",
  "Sepuluh. Di rekaman lab `batas.txt` bagian B, 10 percobaan menjawab 401 dan 14 ditolak 429. Penghitungnya benar. Yang berubah di staging adalah jumlah instance, bukan kodenya.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Batas per alamat tidak salah hitung. Batas itu dihitung di memori tiap instance, dan dua instance punya dua penghitung yang tidak saling tahu. Pemeriksaan password adalah langkah login yang membandingkan password yang dikirim dengan hash.",
  "<Rantai data={batas} />",
  "*Kondisi rekaman:* PostgreSQL 17.11, dua proses `api-t3` (a dan b) di host, dan proxy Caddy 2.11.7 di kontainer. Proxy memakai kebijakan `round_robin` (bawaan Caddy: `random`), supaya angkanya tetap. Jam bucket dibekukan supaya tidak terisi ulang di tengah rekaman, dan password yang dikirim salah.",
  "**Satu bucket per key, di memori satu proses.** Setiap alamat punya bucket login berisi paling banyak 10 token, dan setiap request login mengambil satu token. Bucket itu hanya ada di peta milik proses yang menerimanya:",
  "<Snippet file=\"labs/api-t3/internal/service/pembatas.go\" lines=\"16:21\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/pembatas.go baris 16 sampai 21 (bucket di peta satu proses)\" />",
  "Batas login ditulis sebagai kapasitas dan laju isi ulang per detik:",
  "<Snippet file=\"labs/api-t3/internal/service/pembatas.go\" lines=\"96:97\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/pembatas.go baris 96 sampai 97 (batas login per alamat dan per akun)\" />",
  "**Dua instance, dua jatah.** Proxy bergantian, jadi tiap instance menerima 12 dari 24 percobaan. Bucket per alamat di tiap instance mulai penuh, jadi tiap instance mengizinkan 10 dan menolak 2. Hasilnya 20 percobaan lolos dan 4 ditolak:",
  "<Snippet file=\"labs/t3-instance/output/batas.txt\" lines=\"8:10\" title=\"Rekaman lab: labs/t3-instance/output/batas.txt, bagian A (dua instance, round_robin)\" />",
  "Satu instance dengan 24 percobaan yang sama meloloskan 10 dan menolak 14:",
  "<Snippet file=\"labs/t3-instance/output/batas.txt\" lines=\"12:13\" title=\"Rekaman lab: labs/t3-instance/output/batas.txt, bagian B (satu instance)\" />",
  "**Pilihan Caddy menentukan angkanya.** Kebijakan bawaan Caddy memilih instance secara acak, jadi hasilnya antara 10 dan 20. Sepuluh bila semua percobaan jatuh ke satu instance, dan 20 bila tiap instance menerima paling sedikit 10 percobaan (bagian C; angka pastinya tidak direkam).",
  "Dengan N instance, batasnya sampai N × 10 (Hitungan; hanya dua instance yang direkam).",
  "**Isi ulang ikut berlipat.** Tiap instance mengisi ulang 10 token per menit. Dalam 30 menit satu instance mengizinkan paling banyak 10 + 10 × 30 = 310 percobaan dari satu alamat. Dua instance mengizinkan 620 (Hitungan dari konstanta di atas; tidak direkam).",
  "**Yang tidak berlipat: kunci akun.** Dua belas tebakan ke satu akun lewat dua instance menjawab 401 sepuluh kali dan 429 dua kali. Bucket per akun juga di memori, 5 per instance. Tetapi hitungan `gagal_login` ada di database, dan dua instance memakai database yang sama:",
  "<Snippet file=\"labs/t3-instance/output/batas.txt\" lines=\"19:27\" title=\"Rekaman lab: labs/t3-instance/output/batas.txt, bagian D (satu akun, dua instance)\" />",
  "Rekaman mencatat hasil akhirnya: `gagal_login` 5 dan akun terkunci. Dua baris keterangan di rekaman itu (tebakan 1-5 per instance lolos bucket; tebakan 6-10 bertemu akun terkunci) ditulis oleh lab, bukan diukur per tebakan.",
  "Dari kode di bawah, tebakan 6 sampai 10 bertemu akun terkunci dan dijawab 401 yang sama dengan password salah. Jadi password dibandingkan dengan hash akun lima kali, bukan sepuluh. Lima tebakan sisanya dibandingkan dengan hash tiruan, supaya waktunya sama (penalaran dari kode). Kodenya mencatat percobaan di database sebelum membandingkan password:",
  "<Snippet file=\"labs/api-t3/internal/service/sesi.go\" lines=\"108:124\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/sesi.go baris 108 sampai 124 (hitungan gagal login dan kunci di database)\" />",
  "Yang longgar adalah penahan banjir per alamat. Satu tebakan per akun tidak pernah menyentuh kunci akun, jadi penyemprotan banyak akun hanya dihentikan batas per alamat ([[t2-login-aman]], bagian C rekaman c4-ratelimit). ADR 20 sudah menulis batas di memori sebagai yang pecah saat server kedua datang, dan bagian F rekaman c4-ratelimit mengukurnya: 20 dari 24. Lab Tahap 3 mengulangnya dengan dua proses `api-t3` dan proxy sungguhan.",
  "**Satu key untuk semua client (dibaca dari kode, Tidak dijalankan).** Rekaman memakai satu client, jadi tidak membedakan client. Kode memakai alamat koneksi sebagai alamat client:",
  "<Snippet file=\"labs/api-t3/internal/handler/handler.go\" lines=\"153:159\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/handler/handler.go baris 153 sampai 159 (alamat client dari alamat koneksi)\" />",
  "Setiap `POST /login` mengambil satu token dari bucket alamat itu sebelum isi request dibaca, juga login yang passwordnya benar:",
  "<Snippet files={[\"labs/api-t3/internal/handler/handler.go:170:176\", \"labs/api-t3/internal/handler/handler.go:201:204\"]} lang=\"go\" title=\"Kode lab: labs/api-t3/internal/handler/handler.go baris 170 sampai 176 dan 201 sampai 204 (token diambil sebelum isi request dibaca)\" />",
  "Dokumentasi `net/http` Go 1.27.1, versi yang dipakai lab, menulis bahwa server mengisi `RemoteAddr` dengan alamat \"IP:port\" yang mengirim request (dibuka 2026-10-26; Go 1.27.3 menulis hal yang sama). Di belakang proxy, koneksi ke `api-t3` datang dari proxy (penalaran), jadi alamat itu alamat proxy. Caddy menyetel atau menambah `X-Forwarded-For` dan, secara bawaan, mengabaikan nilai yang datang dari client (dokumentasi Caddy tanpa nomor versi, dibuka 2026-10-26), tetapi `api-t3` tidak membaca header itu.",
  "Jadi semua karyawan yang masuk lewat satu proxy memakai satu key per alamat. Dari bucket yang penuh, sebelas login dari sebelas orang berbeda yang tiba hampir bersamaan di satu instance menghabiskan jatah 10. Yang ke-11 mendapat 429 walau passwordnya benar. Satu penyerang bisa menghabiskan jatah itu untuk semua orang.",
  "Lab tidak membedakan dua client lewat proxy di Docker Desktop, jadi perilaku ini tidak direkam. Cara menutupnya ada di [[t3-rate-limit-redis]].",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini membaca rekaman bagian A dan B. Tebak dulu apa yang terjadi di dua instance, lalu ubah satu hal: jumlah instance.",
  "<BatasInstance />",
  "Kunci akun (bagian D) dan kebijakan acak Caddy (bagian C) tidak ada di widget. Keduanya ada di rekaman ini, juga untuk pembaca tanpa JavaScript:",
  "<details>",
  "<summary>Rekaman bagian A sampai D (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t3-instance/output/batas.txt\" lines=\"8:33\" title=\"Rekaman lab: labs/t3-instance/output/batas.txt, bagian A sampai D (tanpa baris kepala)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-rate-limit-redis]]: hitungan bersama di Redis, alamat client di belakang proxy, dan apa yang terjadi bila Redis mati. Keputusannya ADR 27.",
  "- [[t3-dua-instance]]: dua instance di belakang proxy, yang membuat batas ini berlipat. Keputusannya ADR 26.",
  "- [[t2-login-aman]]: batas per alamat dan per akun di memori satu server. Keputusannya ADR 20.",
  "- [[t2-m16]]: kunci akun di database, yang tidak ikut berlipat.",
  "- [[t3-dua-tempat]]: pola salinan di luar database yang kembali di memori dua instance.",
  "Yang disimpan di memori satu proses berlipat saat prosesnya dua.",
  "### Cek diri",
  "**1.** Satu instance menolak percobaan ke-11 dari satu alamat. Kenapa dua instance di belakang proxy meloloskan 20 dari 24?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tiap instance menyimpan bucket per alamat di memorinya sendiri. Proxy bergantian, jadi masing-masing menerima 12 percobaan, mengizinkan 10 dan menolak 2 (`batas.txt` bagian A). Batas di kode tetap 10 per instance.",
  "</details>",
  "**2.** Dua belas tebakan ke satu akun lewat dua instance menjawab 401 sepuluh kali. Kenapa password hanya dibandingkan dengan hash akun lima kali?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Bucket per akun di memori memberi 5 tebakan per instance, jadi 10 lolos ke akun. Hitungan `gagal_login` ada di database dan berhenti di 5. Tebakan 6 sampai 10 bertemu akun terkunci dan dijawab 401 yang sama, sesudah dibandingkan dengan hash tiruan (dibaca dari kode; `batas.txt` bagian D mencatat hasil akhirnya).",
  "</details>",
  "**3.** Dengan kebijakan acak bawaan Caddy, berapa dari 24 percobaan yang bisa sampai ke pemeriksaan password?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Antara 10 dan 20. Sepuluh bila semua percobaan jatuh ke satu instance, dua puluh bila tiap instance menerima paling sedikit 10. Angka pastinya bergantung pada urutan acak dan tidak direkam (`batas.txt` bagian C).",
  "</details>",
  "**4.** Kenapa semua karyawan di belakang proxy berbagi satu key per alamat di `api-t3`?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Kode memakai alamat koneksi, dan di belakang proxy itu alamat proxy. Kode juga tidak membaca `X-Forwarded-For`. Ini dibaca dari kode dan tidak direkam, karena lab tidak membedakan dua client lewat proxy.",
  "</details>",
  "</Blok>",
];
