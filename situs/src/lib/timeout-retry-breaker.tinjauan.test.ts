// Penjaga tambahan peninjau halaman 4.11 (keputusan 1309). Menutup 14 dari 89 mutan tulisan tangan dan 8 dari 85 mutan otomatis yang lolos penjaga
// pelaksana tanpa kunci baris: alamat tautan dan teks tautannya, nama penyedia dokumentasi, tab yang dijalankan, kalimat mesin keadaan breaker,
// daftar periksa dan jawaban, kalimat opossum, kalimat pre-mortem 3, dan kata bilangan serta kata penghubung (dan, atau, lebih, kurang,
// berturut-turut, pertama, kedua). Nilai diturunkan dari baris riset, rekaman lab, dan halaman sendiri; hanya sidik kata di bagian akhir yang
// berupa kunci agregat. Bila teks sengaja diubah, perbarui SIDIK_KATA dari keluaran tes yang gagal sesudah membaca perbedaannya.
// Tidak ditangkap, dan ditulis jujur: pertukaran urutan dua butir Bacaan lanjut (setara: tidak mengubah arti), dan kalimat naratif yang
// berubah makna tanpa mengubah kata bilangan atau kata penghubung (kalimat itu hanya dijaga penjaga pelaksana lewat kunci baris).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const halaman = baca("situs/src/content/docs/tahap-4/timeout-retry-breaker.mdx");
const riset = baca("plan/RISET-TAHAP-4.md");
const breakerTxt = baca("labs/t4-integrasi/output/breaker.txt");
const retryTxt = baca("labs/t4-integrasi/output/retry.txt");
const istilah = JSON.parse(baca("situs/data/halaman-istilah/circuit-breaker.json")) as { sumber: { url?: string }[] };
const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const IDRISET = ["R4-160", "R4-161", "R4-162", "R4-163", "R4-164"];
const bagianTeks = (teks: string, huruf: string): string => {
  const i = teks.indexOf(`# --- ${huruf}. `);
  const j = teks.indexOf("# --- ", i + 10);
  return teks.slice(i, j < 0 ? undefined : j);
};
const tanpaSkema = (u: string): string => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const tautan = [...halaman.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map((m) => ({ teks: m[1]!, url: m[2]! }));

describe("tautan luar: alamat ada di baris riset, teks tautan menyebut sumbernya, dan Bacaan lanjut memuat tiap tautan", () => {
  const sumberRiset = IDRISET.map(baris).join("\n");
  // Kata yang harus ada di teks tautan menurut alamatnya (nama sumber, bukan alamat itu sendiri).
  const KATA_HOST: [string, string][] = [
    ["pkg.go.dev/net/http", "net/http"], ["pkg.go.dev/github.com/sony/gobreaker", "gobreaker"], ["learn.microsoft.com", "Azure"],
    ["docs.stripe.com", "Stripe"], ["twilio.com", "Segment"], ["developer.mozilla.org", "MDN"], ["github.com/nodeshift/opossum", "opossum"],
    ["laravel.com", "Laravel"], ["requests.readthedocs.io", "requests"], ["api.dart.dev", "connectionTimeout|Future\\.timeout"], ["supabase.com", "Supabase"],
  ];
  test("tiap alamat tautan ada di baris riset halaman ini", () => {
    expect(tautan.length).toBeGreaterThan(15);
    for (const t of tautan) expect(sumberRiset, `alamat ${t.url} tidak ada di baris riset`).toContain(tanpaSkema(t.url));
    for (const t of tautan.filter((x) => !x.url.includes("/cara-pakai"))) expect(KATA_HOST.some(([h]) => t.url.includes(h)), `host tidak dikenal: ${t.url}`).toBe(true);
  });
  test("teks tautan menyebut sumber menurut alamatnya", () => {
    for (const t of tautan) {
      const k = KATA_HOST.find(([h]) => t.url.includes(h));
      expect(k, t.url).toBeDefined();
      expect(t.teks, `teks tautan ${t.url}`).toMatch(new RegExp(k![1]));
    }
  });
  test("Bacaan lanjut memuat setiap tautan luar di prosa dan tidak lebih", () => {
    const lanjut = halaman.slice(halaman.indexOf("### Bacaan lanjut"));
    const dalam = [...lanjut.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const prosa = halaman.slice(0, halaman.indexOf("### Bacaan lanjut"));
    const luar = [...prosa.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const kunci = (u: string): string => KATA_HOST.find(([h]) => u.includes(h))![0];
    // tiap alamat Bacaan lanjut dipakai di prosa, dan tiap sumber di prosa (per host) punya satu butir; Dart dipakai dua alamat tetapi satu butir
    for (const u of dalam) expect(luar, `Bacaan lanjut memuat alamat yang tidak dipakai di prosa: ${u}`).toContain(u);
    expect(new Set(dalam.map(kunci))).toEqual(new Set(luar.map(kunci)));
    expect(new Set(dalam).size).toBe(dalam.length);
  });
  test("teks tautan di prosa sama dengan teks tautan yang sama di Bacaan lanjut", () => {
    const lanjut = halaman.slice(halaman.indexOf("### Bacaan lanjut"));
    const prosa = halaman.slice(0, halaman.indexOf("### Bacaan lanjut"));
    const dalam = new Map([...lanjut.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map((m) => [m[2]!, m[1]!]));
    let dibandingkan = 0;
    for (const m of prosa.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) {
      const teksLanjut = dalam.get(m[2]!);
      if (teksLanjut === undefined) continue;
      dibandingkan++;
      expect(teksLanjut, `teks tautan ${m[2]}`).toContain(m[1]!);
    }
    expect(dibandingkan).toBeGreaterThanOrEqual(10);
  });
  test("alamat sumber halaman istilah ada di baris riset", () => {
    for (const s of istilah.sumber.filter((x) => x.url)) expect(sumberRiset).toContain(tanpaSkema(s.url!));
  });
});

describe("penyedia dokumentasi dan tab yang dijalankan", () => {
  test("nama penyedia dikaitkan dengan judul dokumennya", () => {
    expect([...halaman.matchAll(/(\w+) Architecture Center/g)].map((m) => m[1])).toEqual(["Azure", "Azure"].slice(0, [...halaman.matchAll(/Architecture Center/g)].length));
    expect(halaman).not.toMatch(/\b(AWS|Google Cloud|Hystrix|Resilience4j|Polly)\b/);
    expect(baris("R4-163")).toContain("learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker");
  });
  test("hanya tab pertama dijalankan, dan namanya sama dengan label pertama", () => {
    const label = halaman.match(/labels=\{\[([^\]]+)\]\}/)![1]!.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    expect(label).toHaveLength(6);
    expect(halaman).toContain(`Tab ${label[0]} dijalankan di lab. Tab lain tidak dijalankan`);
    const buka = [...halaman.matchAll(/<Fragment slot="t(\d)">\n\n\*(\w+(?: dijalankan)?)/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(buka).toEqual(["0:Dijalankan", "1:Tidak dijalankan", "2:Tidak dijalankan", "3:Tidak dijalankan", "4:Tidak dijalankan", "5:Tidak dijalankan"]);
    expect(label[0]).toBe("Go");
  });
  test("nama bidang pustaka untuk lama terbuka adalah Timeout, dari dokumentasi dan kode lab", () => {
    expect(baris("R4-160")).toContain("If Timeout is less than or equal to 0, the timeout value of the CircuitBreaker is set to 60 seconds");
    expect(baca("labs/api-t4/internal/lajur/lajur.go")).toContain("Timeout: o.Timeout");
    expect(halaman).toContain("Pustaka menamai lama terbuka itu Timeout, berbeda dari timeout client 3 detik di atas.");
  });
  test("kalimat opossum mengikuti baris riset: persentase kegagalan, bukan hitungan berturut-turut", () => {
    expect(baris("R4-164")).toContain("persentase kegagalan dibandingkan errorThresholdPercentage");
    const t1 = halaman.slice(halaman.indexOf('<Fragment slot="t1">'), halaman.indexOf('<Fragment slot="t2">'));
    expect(t1).toContain("README-nya membandingkan persentase kegagalan dengan ambang");
    expect(t1).toContain("Jadi aturan gagal berturut-turut ke-6 milik gobreaker tidak ada di sana");
  });
});

describe("kalimat mesin keadaan dan pre-mortem diturunkan dari rekaman", () => {
  const A = bagianTeks(breakerTxt, "A");
  const B = bagianTeks(breakerTxt, "B");
  test("closed, open, half-open: keadaan dan arah perpindahan sama dengan breaker.txt", () => {
    expect(A).toMatch(/gagal berturut-turut ke-1: status closed/);
    expect(A).toContain("permintaan saat open: circuit breaker is open; vendor dipanggil: false");
    expect(A).toContain("permintaan pertama sukses: status closed");
    expect(B).toContain("permintaan percobaan di half-open gagal: status open");
    harus("Di closed, panggilan lewat dan kegagalan dihitung. Di open, panggilan ditolak seketika tanpa memanggil vendor.");
    harus("Di half-open, sejumlah terbatas permintaan lewat sebagai percobaan. Bila berhasil breaker menutup, dan bila gagal ia membuka lagi (Azure, di atas).");
  });
  test("pre-mortem 3: lima timeout menandai pengajuan gagal walau vendor menyimpan satu objek (retry.txt bagian D)", () => {
    const D = bagianTeks(retryTxt, "D");
    const lima = D.match(/^# setelah lima timeout: (\d+) permintaan masuk, (\d+) objek dibuat/m)!;
    expect(D).toMatch(/^ gagal$/m);
    expect(lima[2]).toBe("1");
    const kata = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam"][Number(lima[1])]!;
    harus(`Pengajuan yang timeout ${kata} kali ditandai \`gagal\` walau vendor menyimpan objeknya (\`retry.txt\` bagian D).`);
  });
  const harus = (k: string): void => expect(halaman, `halaman tidak memuat: ${k}`).toContain(k);
});

describe("Cek diri dan daftar periksa", () => {
  test("tiap soal punya satu jawaban berlabel Jawaban, dan daftar periksa tidak dicentang", () => {
    const soal = [...halaman.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]);
    expect(soal).toEqual(["1", "2", "3", "4"]);
    expect([...halaman.matchAll(/<details class="success">\n<summary>(.*)<\/summary>/g)].map((m) => m[1])).toEqual(["Jawaban", "Jawaban", "Jawaban", "Jawaban"]);
    expect([...halaman.matchAll(/^- \[( |x)\] /gm)].map((m) => m[1])).toEqual([" ", " ", " ", " ", " ", " "]);
  });
});

describe("sidik kata bilangan dan kata penghubung (kunci agregat)", () => {
  const SIDIK_KATA = "dan dan lima dan satu dan berturut-turut keenam dan dan dan dan sama kedua dan bukan keenam pertama lima dan satu atau satu dan sama dan bukan sama satu delapan dan bukan atau satu sama satu sama lima dan tiga ketiga atau kurang satu dan hanya dua dan dan bukan bukan tiga atau atau dan dan dan sama dan dan hanya sama sama dan sama dan dan satu dua satu pertama dan satu dan berturut-turut tiga dan dan lebih berturut-turut satu dan bukan dan hanya kedua enam berturut-turut dan satu lima satu satu dan hanya sama sekali dan hanya satu satu lima dan enam berturut-turut pertama kelima kedua satu dan dan sepuluh dan sama satu dan dan dan dan hanya dan dan empat paling dan kurang dan hanya dua dan dan sama dan lima dan keenam lebih satu lima pertama satu sepuluh dan paling hanya dan satu satu lima satu bukan dan paling lima dan lima berturut-turut dan satu satu dan dan dan hanya dan dan dan sama dan dan bukan berturut-turut dan dan dan atau ketiga dan atau lebih dan dan bukan dan dan hanya dan sama dan dan dan atau satu dan atau ketiga atau dan dan lima satu satu atau dan dan satu satu hanya dan kedua kedua dan satu satu dan lima kedua dan lebih lebih dua satu kurang dan enam satu dan dan dan sama satu berturut-turut dan satu dan satu bukan dan atau kelima dan berturut-turut dan satu dan bukan atau sama kedua dan hanya kurang atau dan bukan satu dan hanya satu dan dan lebih satu bukan dan satu satu dua satu dan satu tiga paling keenam lebih lima satu satu satu sepuluh atau hanya kedua lima dan dua satu dan hanya satu hanya dan enam dan dan satu dan hanya bukan lebih satu satu dua enam dan satu dan dan dan kedua dan dan satu dan satu lebih dan dan dan dan sama kedua sama dan dua satu dan bukan satu keenam satu lima pertama lebih satu enam berturut-turut dan dan enam lima satu dan sama bukan dan dan dan";
  test("urutan kata bilangan, dan, atau, lebih, kurang, berturut-turut, pertama, kedua di prosa", () => {
    const semua = halaman.slice(halaman.indexOf("<Blok")).split("\n");
    const prosa: string[] = [];
    let kode = false;
    for (const b of semua) {
      if (!kode && /<Snippet lang="[a-z]+" code=\{`/.test(b)) { kode = true; continue; }
      if (kode) { if (/`\} \/>$/.test(b)) kode = false; continue; }
      if (b.trim() !== "" && !b.startsWith("<Snippet") && !b.startsWith("import ")) prosa.push(b);
    }
    const teks = prosa.join("\n").replace(/\]\([^)]*\)/g, "]");
    const KATA = ["satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "keenam", "kelima", "kedua", "ketiga", "pertama", "dan", "atau", "lebih", "kurang", "berturut-turut", "bukan", "hanya", "paling", "sekali", "sama"];
    const urutan = [...teks.matchAll(new RegExp(`(?<![\\w-])(${KATA.join("|")})(?![\\w-])`, "gi"))].map((m) => m[1]!.toLowerCase());
    expect(urutan.join(" ")).toBe(SIDIK_KATA);
  });
});
