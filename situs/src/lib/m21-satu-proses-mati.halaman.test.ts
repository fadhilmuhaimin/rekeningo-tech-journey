// Penjaga halaman 3.14 (keputusan 1052 sampai 1054): angka, ID, nomor halaman, versi sumber, tautan, label sumber, rentang
// Snippet, klaim "kode dibaca, tidak dijalankan", klaim negatif berlingkup, diagram Rantai, skenario alur t3-m21.json, dan kartu
// Cek diri di m21-satu-proses-mati.mdx diturunkan dari rekaman labs/t3-instance (panic.txt, bergulir.txt), kode lab api-t3
// (latar.go, handler_t3.go, main.go, testing.txt), run.py lab, README lab, naskah Tahap 3, registry, baris riset R3-165 dan
// R3-166, dan halaman tetangga (1.30, 1.31, 1.36, 2.29, 2.31, 2.33, 3.1), bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.11): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI mengunci SETIAP baris badan
// halaman (paragraf, butir, judul, summary, tag Blok, Snippet, Rantai, WidgetLama) sehingga satu kata, satu "tidak", satu
// tingkat heading, atau satu atribut yang berubah menggagalkan tes, dan tes lain menurunkan nilai yang diklaim dari sumbernya
// karena kalimat terkunci tidak menangkap SALAHNYA kalimat.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m21-satu-proses-mati.json";
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

const BERKAS = "situs/src/content/docs/tahap-3/m21-satu-proses-mati.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t3-m21.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const panic = baca("labs/t3-instance/output/panic.txt");
const bergulir = baca("labs/t3-instance/output/bergulir.txt");
const runPy = baca("labs/t3-instance/run.py");
const readmeLab = baca("labs/t3-instance/README.md");
const latarGo = baca("labs/api-t3/internal/service/latar.go");
const handlerT3 = baca("labs/api-t3/internal/handler/handler_t3.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const testingTxt = baca("labs/api-t3/output/testing.txt");
const m6 = baca("labs/api-t1/output/m6.txt");
const compose1 = baca("labs/api-t1/deploy/compose.yaml");
const hal131 = baca("situs/src/content/docs/tahap-1/deployment-rollback.mdx");
const hal136 = baca("situs/src/content/docs/tahap-1/tim-infra.mdx");
const hal229 = baca("situs/src/content/docs/tahap-2/m17-prd-v3.mdx");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const hal233 = baca("situs/src/content/docs/tahap-2/jembatan-prd-v3.mdx");
const hal31 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Layar { judul?: string; waktu?: string; nada?: string; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
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
interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[] }
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

// ---- rekaman panic.txt: bagian A sampai E, dan nomor baris Snippet --------------------------------------------------------
const baris = panic.split("\n");
const nomorBaris = (ok: (b: string) => boolean, dariIdx = 0, sumber: string[] = baris): number => {
  const i = sumber.findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1; // nomor baris mulai dari 1, seperti Snippet
};
const awalBagian = (h: string, sumber: string[] = baris) => nomorBaris((b) => b.startsWith(`# --- ${h}. `), 0, sumber);
const akhirSebelum = (n: number, sumber: string[] = baris): number => {
  let i = n - 1; // nomor baris sebelum baris n
  while (sumber[i - 1]!.trim() === "") i--;
  return i;
};
const terakhirIsi = (sumber: string[]): number => {
  let i = sumber.length;
  while (sumber[i - 1]!.trim() === "") i--;
  return i;
};
const A0 = awalBagian("A"), B0 = awalBagian("B"), C0 = awalBagian("C"), D0 = awalBagian("D"), E0 = awalBagian("E");
const teksBagian = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
const bagA = teksBagian(A0, akhirSebelum(B0));
const bagB = teksBagian(B0, akhirSebelum(C0));
const bagC = teksBagian(C0, akhirSebelum(D0));
const bagD = teksBagian(D0, akhirSebelum(E0));
const bagE = teksBagian(E0, terakhirIsi(baris));
const barisG = bergulir.split("\n");
const G_A0 = awalBagian("A", barisG), G_C0 = awalBagian("C", barisG);

// ---- kode lab -----------------------------------------------------------------------------------------------------------
const kodeLatar = latarGo.split("\n");
const nomorKode = (ok: (b: string) => boolean, sumber: string[] = kodeLatar): number => {
  const i = sumber.findIndex(ok);
  expect(i, "baris kode tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const ekspor0 = nomorKode((b) => b.startsWith("func (s Service) LaporanEkspor("));
const eksporAkhir = nomorKode((b) => b.trim() === "return baris, nil") + 1;
const tersibuk0 = nomorKode((b) => b.startsWith("func ringkasanTersibuk("));
const latar0 = nomorKode((b) => b.startsWith("// Latar menjalankan pekerjaan"));
const latarAkhir = ((): number => {
  const penanda = nomorKode((b) => b.trim() === "// --8<-- [end:latar]");
  let i = penanda - 1;
  while (kodeLatar[i - 1]!.trim() !== "}") i--;
  return i;
})();

const entri = (re: RegExp): RegExpMatchArray => cocok(badan, re);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.14 ada, masalah, jalur inti, prasyarat 3.13, lab t3-instance, peran devops dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t3-m21")).toMatchObject({ ada: true, nomor: "3.14", jenis: "masalah", inti: true, prasyarat: ["t3-at-least-once"], lab: ["t3-instance"], tahap: 3, peran: ["devops", "backend"] });
    expect(dari("t3-at-least-once").nomor).toBe("3.13");
    expect(frontmatter).toContain('title: "3.14 M21: Satu proses mati, semua mati"');
    expect(dari("t3-m21").judul).toBe("M21: Satu proses mati, semua mati");
    expect(naskah).toContain("| 3.14 | 4 | M21: Satu proses mati, semua mati | Masalah | ★ | t3-instance | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-at-least-once\]\] · Jalur inti<\/p>/);
    expect(dari("t3-m21").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "C3", "t1-m6", "t2-adr-21", "t2-jembatan", "t2-m17", "t3-at-least-once", "t3-dua-instance", "t3-m18", "t3-m22", "t3-prd"]);
    const sesuai: [string, string, string][] = [
      ["t1-m6", "1.30", "Deploy hari Senin"], ["C3", "1.31", "Deployment dan rollback"], ["t2-m17", "2.29", "M17"], ["t2-adr-21", "2.31", "ADR 21"],
      ["t2-jembatan", "2.33", "Jembatan"], ["t3-prd", "3.1", "PRD v3"], ["t3-m18", "3.6", "M18"], ["t3-at-least-once", "3.13", "At-least-once"],
      ["t3-dua-instance", "3.15", "Dua instance"], ["t3-m22", "3.16", "M22"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("3.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 3.14 ditepati: 3.1 menjanjikan akibat pemicu ADR 21, 3.15 bergantung pada 3.14, 2.31 menaut 3.15", () => {
    expect(hal31).toContain("Apa yang terjadi sesudah pemicu itu tercatat ada di [[t3-m21]].");
    harus("[[t2-jembatan]] dan [[t3-prd]] sudah mencatat pemicu itu. Di cerita, tidak ada pekerjaan yang dijadwalkan untuknya sampai Rabu itu (Ilustrasi).");
    expect(dari("t3-dua-instance").prasyarat).toEqual(["t3-m21"]);
    expect(hal231).toMatch(/Server kedua \| Puncak yang diperkirakan[^\n]*\[\[t3-dua-instance\]\]/);
    // m28-prd-v4.mdx menaut 3.14 sebagai satu baris tabel sepuluh masalah Tahap 3; isi baris itu dijaga m28-prd-v4.halaman.test.ts (keputusan 1110)
    // rekap.mdx (3.31) menaut 3.14 sebagai kejadian kalimat 6; isi kalimat itu dijaga rekap-t3.halaman.test.ts (keputusan 1122)
    const menaut = ["dua-instance.mdx", "m28-prd-v4.mdx", "prd-v3.mdx", "rekap.mdx"];
    const sebenarnya = fs.readdirSync(path.join(akar, "situs/src/content/docs/tahap-3")).filter((f) => f.endsWith(".mdx") && f !== "m21-satu-proses-mati.mdx" && baca(`situs/src/content/docs/tahap-3/${f}`).includes("[[t3-m21"));
    expect(sebenarnya.sort()).toEqual(menaut);
  });
  test("halaman tidak membuka isi 3.15: ADR 26 disebut sekali, tanpa pengaturan proxy atau angka proxy.txt", () => {
    expect(badan.match(/ADR 26/g)).toHaveLength(1);
    expect(badan).not.toMatch(/lb_retries|lb_policy|health_uri|round_robin|health_interval|SKIP LOCKED|ADR 27|X-Forwarded/i);
    expect(badan).not.toMatch(/10 dari 20|5 dari 10/);
    harus("Cara proxy tahu instance mana yang hidup, dan apa yang terjadi bila ia tidak tahu, ada di [[t3-dua-instance]]. Satu VPS yang menjalankan keduanya tetap titik gagal tunggal.");
    expect(readmeLab).toContain("Semuanya satu mesin: VPS kedua baru muncul di Tahap 4, jadi satu VPS tetap titik gagal tunggal.");
  });
});

describe("naskah M21: gejala, yang dikira, pemicu ADR 21, dan klaim negatif tentang naskah", () => {
  const barisM21 = naskah.split("\n").find((b) => b.startsWith("| M21 |"))!;
  test("baris M21 memuat Rabu 12.05, sembilan menit, 40 detik, Sinta, VPS lebih besar, proses keluar karena panic, dan ADR 26", () => {
    expect(barisM21).toContain("Rabu 12.05 Rekeningo tidak bisa dibuka ±9 menit sampai Bayu memulai ulang prosesnya. Kamis malam, deploy mematikan app ±40 detik (Ilustrasi). Sinta: \"Satu proses mati, semua mati.\"");
    expect(barisM21).toContain("Server kurang kuat; Raka mengusulkan VPS yang lebih besar");
    expect(barisM21).toContain("goroutine latar milik ekspor laporan");
    expect(barisM21).toContain("kode keluar 2, sedangkan panic di goroutine handler dipulihkan `net/http` dan proses hidup");
    expect(barisM21).toContain("tidak ada pekerjaan yang dijadwalkan untuk pemicu itu sampai Rabu itu: pemicu yang tercatat tetapi terlambat dikerjakan");
    expect(barisM21).toContain("ADR 26 menjalankan pemicu ADR 21 yang terlambat dikerjakan: dua instance di satu VPS");
    expect(barisM21).toMatch(/\| M21 \| 5 \|/);
    harus("Minggu 5 Tahap 3. Rabu pukul 12.05 Rekeningo tidak bisa dibuka.");
    harus("Layar yang menunggu itu bertahan sekitar sembilan menit. Bayu memulai ulang proses API, dan semuanya berjalan lagi.");
    harus("Kamis malam deploy mematikan app sekitar 40 detik. Sinta merangkumnya: \"Satu proses mati, semua mati.\"");
  });
  test("catatan Angka cerita: tiga angka berasal dari naskah (Ilustrasi); jam 12.05 sama dengan semua layar HP di widget dan naskah", () => {
    harus("*Angka cerita (Ilustrasi):* Rabu 12.05, sembilan menit, dan 40 detik berasal dari naskah, tanpa rekaman yang mengulangnya.");
    const jam = cocok(badan, /Jam (\d\d\.\d\d) di layar HP pada widget adalah jam di naskah\./)[1]!;
    expect(barisM21).toContain(`Rabu ${jam}`);
    const waktu = [...skenarioMentah.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]);
    expect(waktu).toHaveLength(2); // layarAwal dan layar Budi di langkah terakhir
    expect(new Set(waktu)).toEqual(new Set([jam]));
    expect(skenario.sumber.catatan).toContain(`Jam ${jam} di layar HP adalah jam di naskah.`);
    expect((badan.match(/\b\d\d\.\d\d\b/g) ?? []).filter((x) => x !== "17.11")).toEqual([jam, jam, jam]); // gejala, catatan Angka cerita, dan catatan jam; 17.11 adalah versi PostgreSQL di rekaman
    expect(panic + bergulir).toContain("PostgreSQL 17.11");
  });
  test("klaim negatif tentang naskah: baris M21 tidak menyebut siapa menekan Ekspor; klaim positifnya: naskah menulis tidak ada yang memulainya lagi, tanpa Compose atau pengawas", () => {
    harus("Naskah tidak menyebut siapa yang menekan Ekspor, jadi rekaman di bawah memakai Warung Sari, warung di data lab yang belum punya pembayaran.");
    expect(barisM21).not.toMatch(/Sari|menekan|tombol Ekspor/);
    // Pertentangan dengan Tahap 1: halaman menulis apa yang naskah katakan (kalimat itu diturunkan dari baris naskah), bukan bahwa naskah diam.
    const frasa = cocok(barisM21, /dan (tidak ada yang memulainya lagi)\./)[1]!;
    harus(`Naskah M21 menulis bahwa ${frasa}, dan itu belum cocok dengan Compose di Tahap 1. Halaman ini tidak menyelesaikannya, jadi sembilan menit tetap berlabel Ilustrasi.`);
    expect(badan).not.toMatch(/Naskah M21 tidak menjelaskan/);
    expect(barisM21).not.toMatch(/restart|Compose|pengawas|systemd|unless-stopped/i);
    expect(compose1).toMatch(/^\s+restart: unless-stopped$/m); // sumber pertentangan: Tahap 1 memakai restart otomatis
    expect(runPy).toContain("Warung Sari (belum ada pembayaran)");
  });
  test("catatan Raka: m17 (2.29) menulis VPS lebih besar dulu, lalu server kedua; Warung Sari ada di Tahap 2", () => {
    expect(hal229).toContain("Di catatannya ia menulis dua rencana: VPS yang lebih besar, lalu server kedua.");
    expect(hal231).toContain("Minggu 8, Sinta membawa PRD v3");
    harus("Ia membuka catatannya dari minggu 8 Tahap 2: VPS yang lebih besar dulu, baru server kedua ([[t2-m17]]).");
    expect(baca("situs/src/content/docs/tahap-2/ledger.mdx")).toContain("Warung Sari");
  });
  test("pemicu ADR 21: dua pemicu server kedua di 2.31 dan baris PRD v3 yang memenuhinya di 2.33 dan 3.1", () => {
    const tabel = cocok(hal231, /\| Server kedua \| Puncak yang diperkirakan mencapai separuh kapasitas satu server hasil load test, atau PRD meminta deploy tanpa jeda \|/);
    expect(tabel).toBeTruthy();
    harus("ADR 21 menulis dua pemicu: puncak mencapai separuh kapasitas satu server, atau PRD meminta deploy tanpa jeda ([[t2-adr-21]]).");
    expect(hal233).toContain('PRD v3 memenuhi satu pemicunya: baris "Tidak berhenti saat deploy" meminta deploy tanpa jeda ([[t2-adr-21]]).');
    expect(hal31).toContain('PRD v3 memenuhi satu pemicunya: baris "Tidak berhenti saat deploy" meminta deploy tanpa jeda.');
    harus('PRD v3 memintanya lewat baris "Tidak berhenti saat deploy" ([[t3-prd]]).');
    expect(naskah).toContain("Pemicu server kedua di ADR 21 (PRD meminta deploy tanpa jeda) sudah dipenuhi PRD v3 sejak dibagikan dan halaman 2.33 mencatatnya");
  });
});

describe("rekaman panic.txt: bagian A sampai E dan rentang Snippet", () => {
  test("bagian A: versi benar; panic di handler memutus koneksi, panic di latar dijawab 202, proses hidup, log pelindung", () => {
    expect(bagA).toContain("GET /lab/panik?di=handler → tidak ada jawaban (net/http memutus koneksi request itu)");
    expect(bagA).toContain("GET /lab/panik?di=latar → 202 (panic terjadi 100 ms sesudah jawaban)");
    expect(bagA).toContain("log: latar uji panik: uji panic di goroutine latar (proses tetap hidup)");
    expect(bagA.match(/GET \/healthz sesudahnya → 200/g)).toHaveLength(2);
    expect(panic.split("\n")[0]).toContain("M21: panic di goroutine latar mematikan seluruh proses; dua instance menahan satu kematian");
  });
  test("bagian B: mode rentan ekspor-panic; handler tertangkap dan /healthz 200, latar mematikan proses dengan kode 2 dan /healthz tidak menjawab", () => {
    expect(bagB).toContain("GET /lab/panik?di=handler → tidak ada jawaban; GET /healthz sesudahnya → 200");
    expect(bagB).toContain("GET /lab/panik?di=latar → 202");
    expect(bagB).toContain("proses berhenti sendiri: kode keluar 2");
    expect(bagB).toContain("log: panic: uji panic di goroutine latar");
    expect(bagB).toContain("GET /healthz → tidak ada jawaban");
    harus("Di rekaman lab `panic.txt` bagian B, panic di handler memutus satu koneksi dan `/healthz` sesudahnya menjawab 200. Panic di goroutine latar mengakhiri proses dengan kode keluar 2, dan `/healthz` tidak menjawab.");
  });
  test("bagian C: Ani 418 satu pembayaran, log biasa; Sari 502 CSV 200 hanya judul kolom; panic index out of range; kode 2; tiga detik tidak ada jawaban", () => {
    expect(bagC).toContain("Warung Ani (ada 1 pembayaran hari ini) GET /warung/418/laporan.csv → 200, isi: tanggal,transaksi,total + 1 baris");
    expect(bagC).toContain("log: ekspor warung 418: 1 hari, tersibuk <tanggal> dengan 1 transaksi");
    expect(bagC).toContain("Warung Sari (belum ada pembayaran) GET /warung/502/laporan.csv → 200, isi: tanggal,transaksi,total (hanya judul kolom)");
    expect(bagC).toContain("proses berhenti sendiri: kode keluar 2");
    expect(bagC).toContain("log: panic: runtime error: index out of range [0] with length 0");
    expect(bagC).toContain("log: goroutine <n> [running]:");
    expect(bagC).toContain("3 detik kemudian GET /healthz → tidak ada jawaban: tidak ada yang memulainya lagi");
    expect(bagC).not.toContain("ekspor warung 502");
    harus("Warung Ani punya satu pembayaran hari ini, jadi log-nya biasa. Hanya laporan Warung Sari yang kosong:");
  });
  test("bagian D: dua instance mode rentan, a mati kode 2, 20 request 200 dari b, b mati kode 2, 10 request 503", () => {
    expect(bagD).toContain("Sari menekan Ekspor: laporan kosong sampai di instance a; a berhenti sendiri (kode keluar 2)");
    expect(bagD).toContain("20 request sesudahnya lewat proxy: 200: 20 · 200 per instance: b 20");
    expect(bagD).toContain("Sari menekan Ekspor lagi: sampai di instance b; b berhenti sendiri (kode keluar 2)");
    expect(bagD).toContain("10 request sesudahnya lewat proxy: 503: 10 (503: tidak ada instance yang sehat)");
    expect(bagD).toContain("keduanya mode rentan");
    harus("Ekspor kosong mematikan instance a, dan 20 request berikutnya dijawab b. Ekspor yang sama mematikan b, dan proxy menjawab 503.");
    expect(readmeLab).toContain("Dua instance menahan satu kematian, bukan satu bug yang bisa dipicu berulang.");
    harus("Dua instance menahan satu kematian, bukan satu bug yang bisa dipicu berulang.");
  });
  test("bagian E: versi benar lewat proxy; CSV 200 judul kolom, log laporan kosong, 20 request 200 a 10 b 10", () => {
    expect(bagE).toContain("Warung Sari GET /warung/502/laporan.csv lewat proxy → 200, isi: tanggal,transaksi,total");
    expect(bagE).toContain("log: ekspor warung 502: laporan kosong");
    expect(bagE).toContain("20 request sesudahnya: 200: 20 · 200 per instance: a 10, b 10");
    expect(diagram.baris[2]!.simpul.map((s) => s.sub)).toEqual(["laporan kosong", "200, judul kolom; log: laporan kosong", "20 request: 200, a 10, b 10"]);
  });
  test("kondisi rekaman: A, B, C satu instance langsung (PORT_A); D dan E lewat proxy aktif-retry; D dua instance rentan, E versi benar", () => {
    const rekam = runPy.slice(runPy.indexOf("def rekam_panic"), runPy.indexOf("# ---------- bergulir.txt"));
    const bagianRun = (h: string) => rekam.slice(rekam.indexOf(`bagian("${h}. `), rekam.indexOf(`bagian("${String.fromCharCode(h.charCodeAt(0) + 1)}. `) > 0 ? rekam.indexOf(`bagian("${String.fromCharCode(h.charCodeAt(0) + 1)}. `) : undefined);
    for (const h of ["A", "B", "C"]) expect(bagianRun(h), h).not.toContain("PORT_PROXY");
    for (const h of ["D", "E"]) expect(bagianRun(h), h).toContain('proxy_mulai("aktif-retry", "1s")');
    expect(bagianRun("A")).not.toContain("-rentan");
    expect(bagianRun("B")).toContain('ulang_instans(args_a=["-rentan", "ekspor-panic"])');
    expect(bagianRun("C")).toContain('ulang_instans(args_a=["-rentan", "ekspor-panic"])');
    expect(bagianRun("D")).toContain('ulang_instans(args_a=["-rentan", "ekspor-panic"], args_b=["-rentan", "ekspor-panic"])');
    expect(bagianRun("E")).not.toContain("-rentan");
    expect(rekam).toContain("harap(kode, 2,");
    harus("*Kondisi rekaman:* PostgreSQL 17.11 dan server Go `api-t3`. Bagian A, B, dan C memanggil satu instance langsung. Bagian D dan E memakai proxy Caddy 2.11.7 di depan dua instance.");
    expect(panic.split("\n")[1]).toContain("PostgreSQL 17.11");
    expect(panic.split("\n")[1]).toContain("Caddy 2.11.7");
  });
  test("permintaan Ekspor: A sampai C langsung ke instance (PORT_A), D dan E lewat PORT_PROXY (bukan hanya proxy dinyalakan); D dua kali Ekspor", () => {
    const rekam = runPy.slice(runPy.indexOf("def rekam_panic"), runPy.indexOf("# ---------- bergulir.txt"));
    const bagianRun = (h: string) => rekam.slice(rekam.indexOf(`bagian("${h}. `), rekam.indexOf(`bagian("${String.fromCharCode(h.charCodeAt(0) + 1)}. `) > 0 ? rekam.indexOf(`bagian("${String.fromCharCode(h.charCodeAt(0) + 1)}. `) : undefined);
    expect(bagianRun("C").match(/csv_warung\(\d+, \w+, PORT_PROXY\)/g)).toBeNull();
    expect(bagianRun("C").match(/csv_warung\(\d+, \w+, PORT_A\)/g)).toHaveLength(2);
    expect(bagianRun("D").match(/csv_warung\(502, sari, PORT_PROXY\)/g)).toHaveLength(2);
    expect(bagianRun("D").match(/csv_warung\(\d+, \w+, PORT_A\)/g)).toBeNull();
    expect(bagianRun("E").match(/csv_warung\(502, sari, PORT_PROXY\)/g)).toHaveLength(1);
    expect(bagianRun("E").match(/csv_warung\(\d+, \w+, PORT_A\)/g)).toBeNull();
    expect(bagianRun("D")).toContain("lewat_proxy(20)");
    expect(bagianRun("E")).toContain("lewat_proxy(20)");
  });
  test("catatan D: b hidup sesudah Ekspor pertama (rekaman), komentar kode menulis panic yang mendahului jawaban diulang proxy ke instance lain, dan Caddy mengulang GET", () => {
    expect(bagD).toContain("20 request sesudahnya lewat proxy: 200: 20 · 200 per instance: b 20");
    expect(latarGo).toContain("tanpa jeda, panic bisa mendahului respons dan proxy mengulang GET yang sama ke instance lain.");
    expect(bergulir).toMatch(/Caddy hanya mengulang\s+GET untuk kegagalan sesudah koneksi tersambung/);
    harus("Di bagian D, b tetap hidup sesudah Ekspor pertama, jadi permintaan itu tidak diulang ke b (penalaran dari rekaman).");
    harus("Komentar di kode menulis bahwa bila panic mendahului jawaban, proxy mengulang GET yang sama ke instance lain (dibaca dari komentar, Tidak dijalankan).");
    harus("Instance itu menjalankan kode yang sama, jadi satu Ekspor bisa mematikan keduanya (penalaran).");
  });
  test("A dan B memakai pemicu yang sama (/lab/panik?di=latar) dan hanya mode server yang berbeda", () => {
    const rekam = runPy.slice(runPy.indexOf("def rekam_panic"));
    const pemicu = (h: string) => [...rekam.slice(rekam.indexOf(`bagian("${h}. `), rekam.indexOf(`bagian("${String.fromCharCode(h.charCodeAt(0) + 1)}. `)).matchAll(/minta\("GET", "(\/lab\/panik\?di=\w+)"/g)].map((m) => m[1]);
    expect(pemicu("A")).toEqual(["/lab/panik?di=handler", "/lab/panik?di=latar"]);
    expect(pemicu("B")).toEqual(pemicu("A"));
    harus("Keduanya memanggil `/lab/panik?di=latar`. Bagian A berjalan tanpa mode rentan, dan prosesnya tetap hidup:");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, bukan ditulis tangan", () => {
    const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
    const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1] ?? "-");
    const berkas = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
    expect(berkas).toEqual([
      "labs/api-t3/internal/service/latar.go", "labs/api-t3/internal/service/latar.go", "labs/t3-instance/output/panic.txt", "labs/t3-instance/output/panic.txt",
      "labs/t3-instance/output/panic.txt", "labs/api-t3/internal/service/latar.go", "labs/t3-instance/output/bergulir.txt", "labs/t3-instance/output/panic.txt",
      "labs/t3-instance/output/panic.txt",
    ]);
    expect(lines).toEqual([
      `${ekspor0}:${eksporAkhir}`, `${tersibuk0}:${tersibuk0 + 1}`, `${C0}:${akhirSebelum(D0)}`, `${B0}:${akhirSebelum(C0)}`, `${A0}:${akhirSebelum(B0)}`,
      `${latar0}:${latarAkhir}`, `${G_A0}:${akhirSebelum(G_C0, barisG)}`, `${D0}:${akhirSebelum(E0)}`, `${A0}:${terakhirIsi(baris)}`,
    ]);
    // lipatan terakhir: dari baris A sampai baris terakhir yang berisi; tiga baris kepala tidak tampil karena baris ketiganya memuat nomor keputusan lab.
    expect(baris.slice(0, 3).join("\n")).toMatch(/keputusan \d{3}/);
    expect(barisG.slice(0, 3).join("\n")).toMatch(/keputusan \d{3}/);
    expect(A0).toBe(5);
    expect(baris[terakhirIsi(baris) - 1]).toContain("Tidak dijalankan: pengawas proses yang memulai ulang instance sesudah panic");
    expect(kodeLatar[ekspor0 - 1]).toContain("LaporanEkspor");
    expect(kodeLatar[eksporAkhir - 1]).toBe("}");
    expect(kodeLatar[tersibuk0]).toContain("tersibuk := baris[0]");
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, nama tes lab, atau penanda region", () => {
    for (const t of [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!)) {
      const file = t.match(/file="([^"]+)"/)![1]!;
      let src = baca(file);
      const r = t.match(/lines="([^"]+)"/)?.[1];
      if (r) {
        const [a, b] = r.split(":").map(Number);
        src = src.split("\n").slice(a! - 1, b).join("\n");
      }
      expect(src.length, t).toBeGreaterThan(0);
      expect(src, t).not.toMatch(/\bR\d-\d{2,3}\b|\bPR #?\d{3}\b|\bkeputusan \d{3}\b|\bTest[A-Z][A-Za-z]+|--8<--/);
      expect(t, t).not.toMatch(/region=/);
    }
  });
  test("judul Snippet menyebut berkas, nomor baris, dan bagian yang sama dengan rentangnya", () => {
    const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
    const judul = tag.map((t) => t.match(/title="([^"]+)"/)![1]);
    expect(judul).toEqual([
      `Kode lab: labs/api-t3/internal/service/latar.go baris ${ekspor0} sampai ${eksporAkhir} (ringkasan audit dicatat di latar)`,
      `Kode lab: labs/api-t3/internal/service/latar.go baris ${tersibuk0} sampai ${tersibuk0 + 1} (baris pertama laporan)`,
      "Rekaman lab: labs/t3-instance/output/panic.txt, bagian C (laporan kosong mematikan instance)",
      "Rekaman lab: labs/t3-instance/output/panic.txt, bagian B (handler dipulihkan, goroutine latar tidak)",
      "Rekaman lab: labs/t3-instance/output/panic.txt, bagian A (versi benar, proses tetap hidup)",
      `Kode lab: labs/api-t3/internal/service/latar.go baris ${latar0} sampai ${latarAkhir} (pelindung recover di goroutine latar)`,
      "Rekaman lab: labs/t3-instance/output/bergulir.txt, bagian A dan B (satu instance dihentikan)",
      "Rekaman lab: labs/t3-instance/output/panic.txt, bagian D (dua instance, dua kali Ekspor kosong)",
      "Rekaman lab: labs/t3-instance/output/panic.txt, bagian A sampai E (tanpa baris kepala)",
    ]);
  });
});

describe("kode lab: latar, ekspor, ringkasan, jeda, endpoint uji, dan mode rentan", () => {
  test("Latar memasang recover kecuali mode ekspor-panic; goroutine dibuka di dalam Latar; versi benar mencatat dan membiarkan proses hidup", () => {
    const f = kodeLatar.slice(latar0 - 1, latarAkhir).join("\n");
    expect(f).toContain("func (s Service) Latar(nama string, f func()) {");
    expect(f).toContain("go func() {");
    expect(f).toContain("if s.rentan != RentanEksporPanic {");
    expect(f).toContain("defer func() {");
    expect(f).toContain("if r := recover(); r != nil {");
    expect(f).toContain('log.Printf("latar %s panik: %v (proses tetap hidup)\\n%s", nama, r, debug.Stack())');
    expect(f.indexOf("recover()")).toBeLessThan(f.indexOf("\t\tf()"));
    expect(latarGo).toContain('const RentanEksporPanic = "ekspor-panic"');
    expect(latarGo).toContain("dokumentasi http.Handler menulis bahwa server memulihkan panic dari ServeHTTP, tetapi tidak\n// menyebut goroutine yang dibuka handler."); // kalimat itu ada di Handler, bukan di Server; komentar ini tampil di Snippet
    expect(latarGo).not.toContain("dokumentasi http.Server menulis");
    harus("Selisihnya satu cabang di fungsi `Latar`. Versi benar memasang `recover` di dalam goroutine latar, dan mode rentan membuangnya:");
  });
  test("LaporanEkspor membuka Latar sebelum mengembalikan baris; ringkasan rentan memakai baris[0]; ringkasan benar menangani kosong; JedaAudit 50 ms", () => {
    const f = kodeLatar.slice(ekspor0 - 1, eksporAkhir).join("\n");
    expect(f.indexOf('s.Latar("ekspor"')).toBeGreaterThan(0);
    expect(f.indexOf('s.Latar("ekspor"')).toBeLessThan(f.indexOf("return baris, nil"));
    expect(f).toContain("time.Sleep(JedaAudit)");
    expect(f).toContain("ringkas = ringkasanEksporRentan");
    expect(latarGo).toContain("func ringkasanEksporRentan(warung int64, baris []repo.BarisLaporan) string {\n\treturn ringkasanTersibuk(warung, baris)\n}");
    expect(kodeLatar[tersibuk0]).toBe('\ttersibuk := baris[0] // panic "index out of range [0] with length 0" bila baris kosong');
    expect(latarGo).toContain('if len(baris) == 0 {\n\t\treturn fmt.Sprintf("ekspor warung %d: laporan kosong", warung)\n\t}');
    const ms = cocok(latarGo, /const JedaAudit = (\d+) \* time\.Millisecond/)[1];
    harus(`Jeda \`JedaAudit\` ${ms} ms adalah tiruan waktu tulis catatan audit.`);
    harus(`jeda ${ms} ms di kode menjaga urutan itu (dibaca dari komentar, Tidak dijalankan)`);
    expect(latarGo).toContain("tanpa jeda, panic bisa mendahului respons dan proxy mengulang GET yang sama ke instance lain.");
    harus("Komentar di kode menulis bahwa tanpa jeda itu panic bisa mendahului jawaban (dibaca dari komentar, Tidak dijalankan).");
    expect(skenario.langkah[1]!.jelas).toContain(`menunggu ${ms} ms, tiruan waktu tulis catatan audit di kode lab`);
  });
  test("handler laporanCSV memanggil LaporanEkspor dahulu, lalu menulis baris judul CSV; endpoint /lab/panik memakai Latar untuk di=latar dan panic langsung untuk di=handler", () => {
    const h = handlerT3.slice(handlerT3.indexOf("func (s Server) laporanCSV"));
    expect(h.indexOf("s.svc.LaporanEkspor(")).toBeGreaterThan(0);
    const tulisJudul = [...h.matchAll(/\.Write\(\[\]string\{"tanggal", "transaksi", "total"\}\)/g)];
    expect(tulisJudul, "penulisan baris judul CSV").toHaveLength(1); // satu penulisan, apa pun nama variabel penulisnya
    expect(h.indexOf("s.svc.LaporanEkspor(")).toBeLessThan(tulisJudul[0]!.index!);
    expect(baca("labs/api-t3/internal/handler/handler.go")).toContain('mux.HandleFunc("GET /warung/{id}/laporan.csv", s.wajibLogin(s.laporanCSV))');
    expect(mainGo).toContain('panic("uji panic di goroutine handler")');
    expect(mainGo).toContain('svc.Latar("uji", func() {');
    expect(mainGo).toContain('panic("uji panic di goroutine latar")');
    expect(mainGo).toContain("time.Sleep(100 * time.Millisecond) // jawaban 202 sampai ke client sebelum proses mati");
    expect(mainGo).toContain("case service.RentanEksporPanic:\n\t\tsvc = svc.DenganMode(*rentan)");
    harus("Handler `laporanCSV` memanggil `LaporanEkspor`.");
  });
  test("tes Go di lab api-t3 untuk kedua perubahan lulus terpisah di testing.txt", () => {
    const latarTes = baca("labs/api-t3/internal/service/latar_test.go");
    for (const t of ["TestLatarMenangkapPanic", "TestLatarRentanMematikanProses", "TestRingkasanEksporLaporanKosong", "TestRingkasanEksporRentanPanikDiLaporanKosong"]) {
      expect(testingTxt, t).toContain(`--- PASS: ${t}`);
      expect(latarTes, `${t} ada di kode tes`).toContain(`func ${t}(`); // rekaman PASS tanpa tesnya di kode bukan bukti
    }
    harus("Tes Go di lab `api-t3` menguji keduanya terpisah (`testing.txt`). Panic di `Latar` versi benar ditangkap dan pekerjaan sesudahnya tetap jalan, sedangkan ringkasan versi pertama panic pada laporan kosong.");
    harus("Rekaman tidak menjalankan ekspor kosong dengan salah satu perubahan saja.");
  });
  test("klaim negatif berlingkup: tidak ada pengawas proses di lab t3-instance, dan setiap penyebutan restart di folder itu berlabel Tidak dijalankan", () => {
    const berkasLab = [...(terlacak ?? new Set<string>())].filter((f) => f.startsWith("labs/t3-instance/"));
    expect(berkasLab.length).toBeGreaterThan(5);
    const menyebut: string[] = [];
    for (const f of berkasLab) {
      for (const [n, b] of baca(f).split("\n").entries()) {
        if (/restart|pengawas|supervis/i.test(b)) menyebut.push(`${f}:${n + 1}:${/Tidak dijalankan/.test(b)}`);
      }
    }
    expect(menyebut.length).toBeGreaterThan(0);
    expect(menyebut.filter((x) => x.endsWith(":false"))).toEqual([]);
    expect(runPy).toContain("d.mulai(d.BIN, port_instans(nama)");
    expect(readmeLab).toContain("- **Pengawas proses.** Yang memulai ulang instance sesudah panic (systemd `Restart=`, restart policy Docker). Caddy tidak memulai proses. Tidak dijalankan.");
    harus("Lab menjalankan instance sebagai proses biasa tanpa pengawas, jadi sesudah kode keluar 2 tidak ada yang menyalakannya (Rekaman lab). Restart policy Docker dan `Restart=` di systemd tidak dijalankan di lab (Tidak dijalankan).");
  });
  test("Compose Tahap 1: restart: unless-stopped di compose.yaml, 1.31 dan 1.36 menyebut restart otomatis; dokumentasi Docker dikutip di baris riset", () => {
    expect(compose1).toMatch(/^\s+restart: unless-stopped$/m);
    expect(hal131).toContain("`restart: unless-stopped` menyalakan ulang container apa pun exit code-nya");
    expect(hal136).toContain("Satu service `api`, tag wajib diisi, restart otomatis");
    expect(barisRiset("R3-166")).toContain("unless-stopped: The policy restarts the container irrespective of the exit code but stops restarting when the service is stopped or removed");
    harus("Compose di Tahap 1 memakai `restart: unless-stopped`, yang menyalakan container lagi apa pun exit code-nya ([[C3]], [dokumentasi Compose](https://docs.docker.com/reference/compose-file/services/#restart), tanpa nomor versi, dibuka 2026-10-26, Tidak dijalankan).");
    harus("Pengawas hanya mempersingkat matinya. Selama proses naik, semua request tetap gagal, dan Ekspor kosong berikutnya mematikannya lagi (penalaran).");
  });
  test("deploy: bergulir.txt A dan B satu instance langsung (Shutdown lawan tanpa-shutdown); 3 dari 8 putaran prober Tahap 1; 40 detik Ilustrasi", () => {
    const a = barisG.slice(G_A0 - 1, G_C0 - 1).join("\n");
    expect(a).toContain("koneksi baru ke instance ditolak selagi request lambat masih jalan: ya");
    expect(a).toContain("kode keluar proses: 0");
    expect(a).toContain("kode keluar proses: -15 (dihentikan sinyal 15)");
    expect(a).toContain("request lambat → tidak ada jawaban");
    const rekam = runPy.slice(runPy.indexOf("def rekam_bergulir"), runPy.indexOf('bagian("C. Deploy bergulir'));
    expect(rekam).not.toContain("PORT_PROXY");
    expect(rekam).toContain('ulang_instans(args_a=["-rentan", "tanpa-shutdown"])');
    harus("`Shutdown` adalah cara server Go berhenti pelan-pelan. Dengan itu, request yang berjalan selesai dan koneksi baru ditolak selagi menunggu. Tanpa itu, request yang berjalan putus.");
    harus("menghentikan satu instance dengan SIGTERM, sinyal yang meminta proses berhenti, saat satu request lambat berjalan:");
    expect(readmeLab).toContain("Dengan `Shutdown`, request lambat yang sedang jalan selesai, koneksi baru ditolak, dan proses keluar dengan kode 0.");
    expect(barisRiset("R3-72")).toContain("Shutdown: main tidak boleh keluar sebelum Shutdown kembali");
    // Tahap 1, m6.txt bagian C: baris putaran dengan kedua HP tanpa jawaban lawan jumlah putaran.
    const bagC1 = m6.slice(m6.indexOf("# --- C. Deploy: prober"), m6.indexOf("# --- D. "));
    const putaran = bagC1.split("\n").filter((b) => /^\d+\s+app /.test(b));
    expect(putaran).toHaveLength(8);
    expect(putaran.filter((b) => (b.match(/tidak ada jawaban/g) ?? []).length === 2)).toHaveLength(3);
    harus("Deploy manual di Tahap 1 membuat 3 dari 8 putaran prober tanpa jawaban ([[t1-m6]]).");
    expect(hal231).toContain("Deploy manual Tahap 1 membuat 3 dari 8 putaran prober, satu per detik, tanpa jawaban (`m6.txt` bagian C, lab api-t1)");
    harus("Lab tidak mengukur jeda deploy satu proses, jadi 40 detik di naskah berlabel Ilustrasi.");
    expect(bergulir).not.toMatch(/\b40 detik\b/);
  });
});

describe("sumber luar: dokumentasi Go dan Docker, dan baris riset R3-165 dan R3-166", () => {
  test("empat tautan eksternal, tanggal akses, dan versi sama dengan baris riset", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(tautan).toEqual([
      "https://pkg.go.dev/net/http#Serve", "https://pkg.go.dev/net/http#Handler", "https://go.dev/ref/spec#Handling_panics",
      "https://docs.docker.com/reference/compose-file/services/#restart",
    ]);
    const r = barisRiset("R3-165");
    expect(r).toContain("go.dev/ref/spec#Handling_panics, Language version go1.27, 26 Mei 2026, dibuka 2026-10-26");
    expect(r).toContain("pkg.go.dev/net/http#Handler (go1.27.3, dibuka 2026-10-26)");
    expect(r).toContain("pkg.go.dev/net/http#Serve (go1.27.3, dibuka 2026-10-26)");
    expect(r).toContain('"the program is terminated and the error condition is reported"');
    expect(r).toContain('"If ServeHTTP panics, the server (the caller of ServeHTTP) assumes that the effect of the panic was isolated to the active request. It recovers the panic, logs a stack trace to the server error log"');
    expect(r).toContain("kalimat itu tidak menyebut goroutine yang dibuka handler");
    expect(r).toContain("spesifikasi tidak menyebut kode keluar");
    expect(r).toContain("panic naik lewat fungsi yang ditangguhkan sampai fungsi paling atas goroutine yang berjalan");
    harus("Panic adalah galat yang menghentikan fungsi dan naik ke fungsi pemanggilnya satu per satu. Fungsi bisa menangkapnya dengan `recover`.");
    expect(barisRiset("R3-166")).toContain("tanpa nomor versi, dibuka 2026-10-26");
    harus("([Handler](https://pkg.go.dev/net/http#Handler), go1.27.3, dibuka 2026-10-26, Tidak dijalankan)");
    harus("([Handling panics](https://go.dev/ref/spec#Handling_panics), versi bahasa go1.27, dibuka 2026-10-26, Tidak dijalankan)");
    harus("([Serve](https://pkg.go.dev/net/http#Serve), go1.27.3, dibuka 2026-10-26, Tidak dijalankan)");
    harus("Server membuat satu goroutine untuk tiap koneksi, dan goroutine itu memanggil handler");
    harus("Kalimat di dokumentasi itu hanya membahas panic dari `ServeHTTP` dan tidak menyebut goroutine yang dibuka handler.");
    expect(new Date("2026-10-26").getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  });
  test("baris riset R3-165 dan R3-166 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(sidik(barisRiset("R3-165"))).toBe(SIDIK_RISET_165);
    expect(sidik(barisRiset("R3-166"))).toBe(SIDIK_RISET_166);
  });
  test("ID riset tidak tampil ke pembaca (halaman, diagram, skenario, kartu); nomor keputusan dan PR juga tidak", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b/);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string }[]).filter((k) => k.halaman === "t3-m21");
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b/);
    for (const t of [badan, JSON.stringify(diagramMentah), skenarioMentah, JSON.stringify(kartu)]) expect(t).not.toMatch(/\bkeputusan \d{3}\b|\bPR #?\d{3}\b/);
  });
  test("label sumber: arti ditaut ke A0 di Gejala; Tidak dijalankan untuk dokumentasi dan komentar kode; Ilustrasi untuk cerita; penalaran bertanda", () => {
    harus("Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].");
    expect(badan.match(/Tidak dijalankan\)/g)).toHaveLength(8);
    expect(badan.match(/\(Ilustrasi\)/g)).toHaveLength(2);
    expect(badan.match(/\(penalaran[^)]*\)/g)).toHaveLength(7);
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("tiga baris: C (satu instance), D (dua instance), E (versi benar); setiap angka dan status ada di bagian rekamannya", () => {
    expect(diagram.id).toBe("t3-m21-satu-proses-mati");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-instance · panic.txt bagian C, D, dan E" });
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([
      ["Satu instance, tanpa pelindung", "bagian C", 4], ["Dua instance, health check dan retry", "bagian D", 4], ["Versi benar", "bagian E", 3],
    ]);
    expect(diagram.baris[0]!.simpul.map((s) => [s.teks, s.sub])).toEqual([
      ["Sari menekan Ekspor", "warung tanpa pembayaran, laporan kosong"], ["CSV terkirim", "200, hanya judul kolom"],
      ["Goroutine latar panik", "index out of range [0] with length 0"], ["Proses keluar", "kode 2, /healthz tidak menjawab"],
    ]);
    expect(bagC).toContain("(belum ada pembayaran) GET /warung/502/laporan.csv → 200, isi: tanggal,transaksi,total (hanya judul kolom)");
    expect(bagC).toContain("index out of range [0] with length 0");
    expect(bagC).toContain("kode keluar 2");
    expect(bagC).toContain("GET /healthz → tidak ada jawaban");
    expect(diagram.baris[1]!.simpul.map((s) => [s.teks, s.sub])).toEqual([
      ["Ekspor kosong mematikan a", "kode keluar 2"], ["20 request sesudahnya", "200: 20, semuanya dari b"],
      ["Ekspor kosong mematikan b", "kode keluar 2"], ["10 request sesudahnya", "503: 10, tidak ada instance yang sehat"],
    ]);
    expect(bagD.match(/kode keluar 2/g)).toHaveLength(2);
    expect(bagD).toContain("200: 20 · 200 per instance: b 20");
    expect(bagD).toContain("503: 10 (503: tidak ada instance yang sehat)");
    expect(diagram.catatan).toBe("Di versi rentan, panic di goroutine latar tidak dipulihkan siapa pun, jadi satu laporan kosong mengakhiri seluruh proses.");
  });
  test("diagram dikunci dengan sidik jari (setiap nilai string), tampil dengan Rantai biasa di blok Yang sebenarnya, dan nada sesuai", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK_DIAGRAM);
    expect(badan).toContain("<Rantai data={satuProses} />");
    expect(badan).toContain('import satuProses from "../../../../data/diagram/t3-m21-satu-proses-mati.json";');
    const nada = diagram.baris.flatMap((b) => b.simpul.map((s) => [s.teks, s.nada]));
    expect(nada.filter(([, n]) => n === "warn").map(([t]) => t)).toEqual(["Goroutine latar panik", "Proses keluar", "Ekspor kosong mematikan b", "10 request sesudahnya"]);
    expect(nada.filter(([, n]) => n === "good").map(([t]) => t)).toEqual(["20 request sesudahnya", "Kedua instance hidup"]);
  });
});

describe("skenario alur t3-m21.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  const semua = (): Langkah[] => skenario.langkah.concat(skenario.varian.langkah);
  test("valid menurut alur-core; tiga komponen dengan dua lapisan, satu perangkat; sumber rekaman panic.txt; varian dari awal", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t3-instance/output/panic.txt", fileVarian: "labs/t3-instance/output/panic.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label, k.lapisan ?? null])).toEqual([
      ["client", "Client", null], ["api", "Proses API (satu-satunya)", ["handler", "goroutine latar"]], ["app", "App", null],
    ]);
    expect(skenario.perangkat).toEqual([{ id: "budi", label: "HP Budi" }]);
    expect(skenario.langkah).toHaveLength(6);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("pelindung recover di goroutine latar");
    harus("**Ubah satu hal: pelindung recover di goroutine latar**");
    harus('<WidgetLama nama="alur" src="data/skenario/t3-m21.json" />');
  });
  test("tebakan: empat pilihan, jawaban benar sama dengan rekaman C, posisinya tidak ditulis di halaman dan bukan pilihan pertama atau keempat", () => {
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.answer).toBe(2);
    expect(skenario.predict.options[skenario.predict.answer]).toBe("Berhenti sesudah jawaban terkirim: panic di goroutine latar tidak dipulihkan siapa pun");
    expect(skenario.predict.varian).toBe(false);
    expect(bagC).toContain("proses berhenti sendiri: kode keluar 2");
    expect(skenario.predict.explain).toContain("kode keluar 2");
    expect(skenario.predict.explain).toContain("tiga detik kemudian /healthz tidak menjawab (panic.txt bagian C)");
    expect(bagC).toContain("3 detik kemudian GET /healthz → tidak ada jawaban");
    expect(skenario.predict.explain).toContain("status 200");
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
    expect(skenario.predict.options.slice(0, 2).concat(skenario.predict.options[3]!)).toEqual([
      "Tetap hidup: laporan kosong adalah keadaan biasa, dan jawabannya sudah terkirim",
      "Hanya request Sari yang gagal, request lain tetap dijawab",
      "Menjawab 500 pada request berikutnya, lalu pulih sendiri",
    ]);
  });
  test("baris perintah dan keluaran di kirim yang bukan ringkasan ada utuh di panic.txt atau kode lab; baris tanda panah ada di daftar ringkasan", () => {
    const dikecualikan = new Set<string>();
    const kode = latarGo;
    for (const l of semua()) {
      for (const b of l.kirim.split("\n")) {
        if (b.startsWith("→")) {
          expect(["→ 200, isi: tanggal,transaksi,total (hanya judul kolom)"], b).toContain(b);
          expect(panic, b).toContain(b.slice(2));
          continue;
        }
        if (dikecualikan.has(b)) continue;
        expect(panic.includes(b) || kode.includes(b), `kirim tidak ada di rekaman atau kode: ${b}`).toBe(true);
      }
    }
    expect(skenario.langkah[2]!.kirim).toBe(kodeLatar[tersibuk0]!.trim());
    expect(skenario.langkah.map((l) => l.kirim.split("\n").length)).toEqual([1, 1, 1, 2, 1, 1]);
  });
  test("label sumber widget: langkah 2 dan 3 memakai kode lab (latar.go), bukan rekaman; catatan chip menyebutnya", () => {
    const kode3 = skenario.langkah[2]!.kirim;
    expect(panic).not.toContain(kode3); // baris kode ini tidak ada di panic.txt
    expect(latarGo).toContain(kode3.split(" //")[0]!);
    expect(panic).not.toMatch(/50 ms/);
    expect(latarGo).toContain("const JedaAudit = 50 * time.Millisecond");
    expect(skenario.sumber.catatan).toContain("Langkah 3 menampilkan satu baris kode dari labs/api-t3/internal/service/latar.go, dan langkah 2 menyebut jeda 50 ms dari kode yang sama; keduanya tidak ada di rekaman.");
    expect(skenario.langkah[1]!.jelas).toContain("di kode lab");
    expect(skenario.langkah[2]!.jelas).toMatch(/^Kode ini/);
  });
  test("lapisan: handler untuk langkah yang dijawab handler, goroutine latar untuk panic dan ringkasan; proses berhenti tanpa lapisan", () => {
    expect(skenario.langkah.map((l) => l.lapisan ?? null)).toEqual(["handler", "handler", "goroutine latar", "goroutine latar", null, null]);
    expect(skenario.varian.langkah.map((l) => l.lapisan ?? null)).toEqual(["handler", "goroutine latar", "handler"]);
    expect(skenario.varian.langkah[0]!.kirim).toBe("GET /lab/panik?di=latar → 202 (panic terjadi 100 ms sesudah jawaban)");
    expect(bagA).toContain(skenario.varian.langkah[0]!.kirim);
    expect(bagA).toContain(`log: ${skenario.varian.langkah[1]!.kirim}`);
    expect(bagA).toContain(skenario.varian.langkah[2]!.kirim.replace("GET /healthz sesudahnya → 200", "GET /healthz sesudahnya → 200"));
    expect(skenario.sumber.catatan).toContain("Pemicunya endpoint uji lab /lab/panik, bukan Ekspor, dan bagian B memakai pemicu yang sama tanpa pelindung.");
    expect(skenario.langkah[3]!.jelas).toContain("net/http hanya memulihkan panic dari handler");
  });
  test("layar HP Budi: beranda awal, lalu tanpa jawaban di langkah terakhir; varian tidak mengubah layar; semua berjam sama", () => {
    const layar = (l: Langkah) => l.layar?.budi?.isi?.map((i) => `${i.jenis}|${i.teks}`);
    expect(skenario.langkah.map(layar)).toEqual([undefined, undefined, undefined, undefined, undefined, ["proses|Memuat saldo...", "teks|Tidak ada jawaban dari server"]]);
    expect(skenario.varian.langkah.map(layar)).toEqual([undefined, undefined, undefined]);
    expect(skenario.layarAwal.budi!.isi!.map((i) => `${i.jenis}|${i.teks}`)).toEqual(["teks|Saldo dan riwayat", "tombol|Lihat saldo"]);
    expect(skenario.langkah[5]!.layar!.budi!.nada).toBe("warn");
    expect(skenario.sumber.catatan).toContain("teks di layar adalah pilihan penulis");
    harus("Layar HP di widget digambar dari isi rekaman: lab tidak punya app Flutter.");
  });
  test("skenario dikunci dengan sidik jari (setiap nilai string); judul dan nada langkah; catatan sumber menyebut BAGIAN rekaman dan perintah lab yang ada di README", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK_SKENARIO);
    expect(skenario.sumber.catatan).toContain("make -C labs/t3-instance run BAGIAN=panic");
    expect(readmeLab).toContain("make -C labs/t3-instance run BAGIAN=batas     # satu bagian: proxy panic bergulir batas");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Sari menekan Ekspor di dasbor", "Handler menjawab 200", "Goroutine latar menyusun ringkasan audit", "Panic di goroutine latar", "Seluruh proses berhenti", "Budi membuka app",
    ]);
    expect(skenario.langkah.map((l) => l.nada)).toEqual([undefined, undefined, "warn", "warn", "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual([undefined, undefined, "good"]);
  });
  test("tanpa JavaScript: noscript memuat hasil tebakan dan varian dengan angka yang sama dengan rekaman; rekaman lengkap di lipatan", () => {
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain("Sari menerima CSV berstatus 200, lalu proses berhenti sendiri dengan kode keluar 2, dan tiga detik kemudian /healthz tidak menjawab.");
    expect(ns).toContain("Bila goroutine latar punya pelindung recover, panic yang sama dicatat dan /healthz tetap menjawab 200.");
    expect(badan).toContain(`<Snippet file="labs/t3-instance/output/panic.txt" lines="${A0}:${terakhirIsi(baris)}" title="Rekaman lab: labs/t3-instance/output/panic.txt, bagian A sampai E (tanpa baris kepala)" />`);
  });
});

describe("kartu Cek diri: empat kartu, sama dengan kartu.json", () => {
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(4);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(4);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string; tanya: string; jawab: string; judul: string; url: string }[]).filter((k) => k.halaman === "t3-m21");
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
    expect(kartu).toHaveLength(4);
    expect(kartu.every((k) => k.judul === "3.14 M21: Satu proses mati, semua mati" && k.url === "tahap-3/m21-satu-proses-mati/")).toBe(true);
    expect(kartu[0]!.jawab).toContain("(`panic.txt` bagian B: kode keluar 2)");
    expect(kartu[1]!.jawab).toContain("(`panic.txt` bagian C)");
    expect(kartu[3]!.jawab).toContain("(`panic.txt` bagian D)");
  });
  test("jawaban tiap kartu di kartu.json sama persis dengan isi details Jawaban di halaman (bukan hanya soalnya)", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string; jawab: string }[]).filter((k) => k.halaman === "t3-m21");
    const jawabanHalaman = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawabanHalaman).toHaveLength(4);
    expect(kartu.map((k) => k.jawab)).toEqual(jawabanHalaman);
  });
  test("kartu 1 sampai 4 menyebut fakta rekaman yang sama dengan bagian B, C, dan D", () => {
    expect(bagB).toContain("kode keluar 2");
    expect(bagC).toContain("Warung Sari (belum ada pembayaran) GET /warung/502/laporan.csv → 200");
    expect(bagD).toContain("10 request sesudahnya lewat proxy: 503: 10");
    harus("Pesannya `index out of range [0] with length 0`, galat di kode yang mengambil baris pertama laporan kosong. Itu bukan kehabisan memori atau CPU, jadi mesin yang lebih besar mati dengan cara yang sama (penalaran).");
    harus("Kedua instance menjalankan kode yang sama, jadi laporan kosong yang sama mematikan instance kedua. Sesudah itu proxy menjawab 503 pada 10 dari 10 request (`panic.txt` bagian D).");
    harus("Handler selesai menjawab sebelum goroutine latar panik: CSV 200 sampai ke Sari lebih dulu (`panic.txt` bagian C). Di lab, jeda 50 ms di kode menjaga urutan itu (dibaca dari komentar, Tidak dijalankan). Kegagalan di latar tidak muncul di jawaban request yang memicunya.");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor", () => {
    let dalamKode = false;
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      if (b.trim().startsWith("```")) { dalamKode = !dalamKode; continue; }
      const m = !dalamKode && b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([[3, "Cek diri"]]);
    expect(badan.match(/^\d+\. /gm)).toBeNull();
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (description memuat 'Rabu 12.05' dan 'goroutine latar')", () => {
    expect(frontmatter.trim().split("\n")).toEqual([
      'title: "3.14 M21: Satu proses mati, semua mati"',
      "description: Minggu 5. Rabu 12.05 Rekeningo tidak bisa dibuka sampai Bayu memulai ulang prosesnya, dan Kamis malam deploy mematikannya lagi. Sebabnya panic di goroutine latar ekspor laporan, di satu-satunya proses API.",
    ]);
  });
});

const SIDIK_RISET_165 = "72bfc11c1b6a9561";
const SIDIK_RISET_166 = "deaaf77e6fcd710a";
const SIDIK_DIAGRAM = "492470702cdc2f1c";
const SIDIK_SKENARIO = "797e2320433b6812";
const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import satuProses from \"../../../../data/diagram/t3-m21-satu-proses-mati.json\";",
  "<p class=\"meta\">Baca 8 menit · coba 3 menit · Prasyarat: [[t3-at-least-once]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 5 Tahap 3. Rabu pukul 12.05 Rekeningo tidak bisa dibuka. Budi membuka app dan saldonya tidak mau muncul, sedangkan Ani tidak bisa membuka laporan di dasbor.",
  "Layar yang menunggu itu bertahan sekitar sembilan menit. Bayu memulai ulang proses API, dan semuanya berjalan lagi.",
  "Kamis malam deploy mematikan app sekitar 40 detik. Sinta merangkumnya: \"Satu proses mati, semua mati.\"",
  "*Angka cerita (Ilustrasi):* Rabu 12.05, sembilan menit, dan 40 detik berasal dari naskah, tanpa rekaman yang mengulangnya. Naskah tidak menyebut siapa yang menekan Ekspor, jadi rekaman di bawah memakai Warung Sari, warung di data lab yang belum punya pembayaran. Jam 12.05 di layar HP pada widget adalah jam di naskah. Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka melihat prosesnya sudah tidak ada dan menyimpulkan server kurang kuat. Ia membuka catatannya dari minggu 8 Tahap 2: VPS yang lebih besar dulu, baru server kedua ([[t2-m17]]). Rabu itu ia mengusulkan VPS yang lebih besar.",
  "Pemicu server kedua sebenarnya sudah ada sejak PRD v3 dibagikan. ADR 21 menulis dua pemicu: puncak mencapai separuh kapasitas satu server, atau PRD meminta deploy tanpa jeda ([[t2-adr-21]]). PRD v3 memintanya lewat baris \"Tidak berhenti saat deploy\" ([[t3-prd]]).",
  "[[t2-jembatan]] dan [[t3-prd]] sudah mencatat pemicu itu. Di cerita, tidak ada pekerjaan yang dijadwalkan untuknya sampai Rabu itu (Ilustrasi). Yang terlambat adalah pekerjaannya, bukan pencatatannya.",
  "Goroutine adalah alur kerja yang berjalan bersamaan di dalam satu proses Go. Server membuat satu goroutine untuk tiap koneksi, dan goroutine itu memanggil handler ([Serve](https://pkg.go.dev/net/http#Serve), go1.27.3, dibuka 2026-10-26, Tidak dijalankan). Handler bisa membuka goroutine lain dengan kata `go`.",
  "Panic adalah galat yang menghentikan fungsi dan naik ke fungsi pemanggilnya satu per satu. Fungsi bisa menangkapnya dengan `recover`.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: lab memicu panic dua kali di server yang sama, sekali di handler dan sekali di goroutine yang dibuka handler. Mana yang mematikan proses?</summary>",
  "Yang kedua. Di rekaman lab `panic.txt` bagian B, panic di handler memutus satu koneksi dan `/healthz` sesudahnya menjawab 200. Panic di goroutine latar mengakhiri proses dengan kode keluar 2, dan `/healthz` tidak menjawab.",
  "Kenapa hanya yang kedua mematikan proses dijelaskan di blok berikutnya.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Proses API keluar karena panic di goroutine latar milik ekspor laporan. Kodenya mengira laporan tidak pernah kosong, dan goroutine itu tidak punya pelindung. Di lab, tidak ada yang menyalakan prosesnya lagi.",
  "<Rantai data={satuProses} />",
  "*Kondisi rekaman:* PostgreSQL 17.11 dan server Go `api-t3`. Bagian A, B, dan C memanggil satu instance langsung. Bagian D dan E memakai proxy Caddy 2.11.7 di depan dua instance.",
  "**Pekerjaan latar dibuka sebelum jawaban terkirim.** Handler `laporanCSV` memanggil `LaporanEkspor`. Fungsi itu membuka goroutine latar untuk mencatat ringkasan audit, lalu mengembalikan barisnya, dan handler menulis CSV:",
  "<Snippet file=\"labs/api-t3/internal/service/latar.go\" lines=\"50:65\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/latar.go baris 50 sampai 65 (ringkasan audit dicatat di latar)\" />",
  "Jeda `JedaAudit` 50 ms adalah tiruan waktu tulis catatan audit. Komentar di kode menulis bahwa tanpa jeda itu panic bisa mendahului jawaban (dibaca dari komentar, Tidak dijalankan).",
  "**Kode ringkasannya mengira laporan tidak pernah kosong.** Versi pertama mengambil baris pertama laporan untuk mencari hari tersibuk:",
  "<Snippet file=\"labs/api-t3/internal/service/latar.go\" lines=\"81:82\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/latar.go baris 81 sampai 82 (baris pertama laporan)\" />",
  "Pada laporan kosong tidak ada baris pertama, dan Go menghentikan fungsi itu dengan panic `index out of range`. Warung Ani punya satu pembayaran hari ini, jadi log-nya biasa. Hanya laporan Warung Sari yang kosong:",
  "<Snippet file=\"labs/t3-instance/output/panic.txt\" lines=\"22:29\" title=\"Rekaman lab: labs/t3-instance/output/panic.txt, bagian C (laporan kosong mematikan instance)\" />",
  "Sari menerima CSV berstatus 200. Sesudahnya proses berhenti sendiri dengan kode keluar 2, dan tiga detik kemudian `/healthz` tidak menjawab.",
  "**Kenapa handler selamat dan goroutine latar tidak.** Bagian B memicu dua panic buatan di endpoint uji `/lab/panik`, satu di handler dan satu di goroutine latar:",
  "<Snippet file=\"labs/t3-instance/output/panic.txt\" lines=\"13:20\" title=\"Rekaman lab: labs/t3-instance/output/panic.txt, bagian B (handler dipulihkan, goroutine latar tidak)\" />",
  "Dokumentasi `net/http` menulis bahwa server memulihkan panic dari `ServeHTTP`, mencatat stack trace, dan menutup koneksi request itu ([Handler](https://pkg.go.dev/net/http#Handler), go1.27.3, dibuka 2026-10-26, Tidak dijalankan). Spesifikasi Go menulis bahwa panic yang tidak dipulihkan naik sampai fungsi paling atas goroutine itu. Sesudah itu program berhenti ([Handling panics](https://go.dev/ref/spec#Handling_panics), versi bahasa go1.27, dibuka 2026-10-26, Tidak dijalankan).",
  "Kalimat di dokumentasi itu hanya membahas panic dari `ServeHTTP` dan tidak menyebut goroutine yang dibuka handler. Yang menunjukkannya adalah rekaman bagian B: tidak ada yang memulihkan panic di goroutine latar, jadi proses berhenti.",
  "**Satu hal membedakan bagian A dan B.** Keduanya memanggil `/lab/panik?di=latar`. Bagian A berjalan tanpa mode rentan, dan prosesnya tetap hidup:",
  "<Snippet file=\"labs/t3-instance/output/panic.txt\" lines=\"5:11\" title=\"Rekaman lab: labs/t3-instance/output/panic.txt, bagian A (versi benar, proses tetap hidup)\" />",
  "Selisihnya satu cabang di fungsi `Latar`. Versi benar memasang `recover` di dalam goroutine latar, dan mode rentan membuangnya:",
  "<Snippet file=\"labs/api-t3/internal/service/latar.go\" lines=\"23:39\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/latar.go baris 23 sampai 39 (pelindung recover di goroutine latar)\" />",
  "**Versi benar punya dua perubahan, dan lab tidak memisahkannya untuk ekspor.** Ringkasan versi benar menangani laporan kosong, dan `Latar` memasang pelindung. Bagian E memakai keduanya sekaligus: CSV berstatus 200, log menulis \"laporan kosong\", dan kedua instance tetap hidup. Bagian A menguji pelindung saja, dengan panic buatan.",
  "Tes Go di lab `api-t3` menguji keduanya terpisah (`testing.txt`). Panic di `Latar` versi benar ditangkap dan pekerjaan sesudahnya tetap jalan, sedangkan ringkasan versi pertama panic pada laporan kosong. Rekaman tidak menjalankan ekspor kosong dengan salah satu perubahan saja. Ringkasan yang benar menghindari panic itu, dan pelindung menahan panic berikutnya dari kode lain (penalaran).",
  "**Kenapa VPS yang lebih besar tidak membantu.** Pesan panic di bagian C berbunyi `index out of range [0] with length 0`. Itu galat di kode, bukan kehabisan memori atau CPU. Mesin yang lebih besar menjalankan kode yang sama dan mati dengan cara yang sama (penalaran; lab tidak mengubah ukuran mesin).",
  "**Siapa yang menyalakannya lagi?** Lab menjalankan instance sebagai proses biasa tanpa pengawas, jadi sesudah kode keluar 2 tidak ada yang menyalakannya (Rekaman lab). Restart policy Docker dan `Restart=` di systemd tidak dijalankan di lab (Tidak dijalankan).",
  "Compose di Tahap 1 memakai `restart: unless-stopped`, yang menyalakan container lagi apa pun exit code-nya ([[C3]], [dokumentasi Compose](https://docs.docker.com/reference/compose-file/services/#restart), tanpa nomor versi, dibuka 2026-10-26, Tidak dijalankan). Naskah M21 menulis bahwa tidak ada yang memulainya lagi, dan itu belum cocok dengan Compose di Tahap 1. Halaman ini tidak menyelesaikannya, jadi sembilan menit tetap berlabel Ilustrasi.",
  "Pengawas hanya mempersingkat matinya. Selama proses naik, semua request tetap gagal, dan Ekspor kosong berikutnya mematikannya lagi (penalaran).",
  "**Deploy Kamis memakai proses yang sama.** Bagian A dan B di `bergulir.txt` menghentikan satu instance dengan SIGTERM, sinyal yang meminta proses berhenti, saat satu request lambat berjalan:",
  "<Snippet file=\"labs/t3-instance/output/bergulir.txt\" lines=\"5:16\" title=\"Rekaman lab: labs/t3-instance/output/bergulir.txt, bagian A dan B (satu instance dihentikan)\" />",
  "`Shutdown` adalah cara server Go berhenti pelan-pelan. Dengan itu, request yang berjalan selesai dan koneksi baru ditolak selagi menunggu. Tanpa itu, request yang berjalan putus. Di kedua cara, sesudah proses lama berhenti dan sebelum yang baru mendengar, tidak ada yang menjawab (penalaran dari satu proses).",
  "Lab tidak mengukur jeda deploy satu proses, jadi 40 detik di naskah berlabel Ilustrasi. Deploy manual di Tahap 1 membuat 3 dari 8 putaran prober tanpa jawaban ([[t1-m6]]).",
  "**Dua instance menahan satu kematian.** Bagian D menjalankan dua instance di belakang proxy dengan health check dan retry, keduanya dalam mode rentan:",
  "<Snippet file=\"labs/t3-instance/output/panic.txt\" lines=\"31:35\" title=\"Rekaman lab: labs/t3-instance/output/panic.txt, bagian D (dua instance, dua kali Ekspor kosong)\" />",
  "Ekspor kosong mematikan instance a, dan 20 request berikutnya dijawab b. Ekspor yang sama mematikan b, dan proxy menjawab 503. Dua instance menahan satu kematian, bukan satu bug yang bisa dipicu berulang.",
  "Di bagian D, b tetap hidup sesudah Ekspor pertama, jadi permintaan itu tidak diulang ke b (penalaran dari rekaman). Komentar di kode menulis bahwa bila panic mendahului jawaban, proxy mengulang GET yang sama ke instance lain (dibaca dari komentar, Tidak dijalankan). Instance itu menjalankan kode yang sama, jadi satu Ekspor bisa mematikan keduanya (penalaran).",
  "Cara proxy tahu instance mana yang hidup, dan apa yang terjadi bila ia tidak tahu, ada di [[t3-dua-instance]]. Satu VPS yang menjalankan keduanya tetap titik gagal tunggal.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `panic.txt` bagian C dari tombol Ekspor sampai HP Budi. Tebak dulu apa yang terjadi pada proses sesudah jawaban 200 terkirim, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t3-m21.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: pelindung recover di goroutine latar**. Pemicunya endpoint uji lab, bukan Ekspor (bagian A dan B). Layar HP di widget digambar dari isi rekaman: lab tidak punya app Flutter.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: Sari menerima CSV berstatus 200, lalu proses berhenti sendiri dengan kode keluar 2, dan tiga detik kemudian /healthz tidak menjawab.",
  "Bila goroutine latar punya pelindung recover, panic yang sama dicatat dan /healthz tetap menjawab 200. Rekaman lengkap ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman bagian A sampai E (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t3-instance/output/panic.txt\" lines=\"5:42\" title=\"Rekaman lab: labs/t3-instance/output/panic.txt, bagian A sampai E (tanpa baris kepala)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-dua-instance]]: dua instance di belakang proxy dengan health check aktif dan retry, `Shutdown` saat SIGTERM, dan deploy bergulir. Keputusannya ADR 26, yang menjalankan pemicu ADR 21.",
  "- [[t3-m22]]: instance kedua membawa masalah baru. Penahan batas login yang ada di memori tiap instance ikut berlipat.",
  "- [[t2-adr-21]]: ADR 21 meminta dibaca ulang setiap PRD baru. M21 menunjukkan harga pemicu yang tercatat tetapi tidak dijadwalkan.",
  "- [[t3-m18]]: sisi lain dari semua layar berhenti. Di M18 poolnya penuh, dan di M21 prosesnya hilang.",
  "Satu proses yang berhenti membawa semua yang dilayaninya, dan dua proses butuh proxy yang tahu mana yang hidup.",
  "### Cek diri",
  "**1.** Panic terjadi di handler, lalu di goroutine yang dibuka handler. Kenapa hanya yang kedua mematikan proses?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "`net/http` memulihkan panic dari `ServeHTTP`, jadi koneksi request itu putus dan proses hidup. Panic di goroutine yang dibuka handler naik sampai fungsi paling atas goroutine itu, lalu program berhenti (`panic.txt` bagian B: kode keluar 2).",
  "</details>",
  "**2.** Sari menerima CSV berstatus 200, tetapi proses API mati. Kenapa Sari tidak melihat galat?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Handler selesai menjawab sebelum goroutine latar panik: CSV 200 sampai ke Sari lebih dulu (`panic.txt` bagian C). Di lab, jeda 50 ms di kode menjaga urutan itu (dibaca dari komentar, Tidak dijalankan). Kegagalan di latar tidak muncul di jawaban request yang memicunya.",
  "</details>",
  "**3.** Seorang engineer mengusulkan VPS yang lebih besar. Apa di pesan panic yang menolak usul itu?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Pesannya `index out of range [0] with length 0`, galat di kode yang mengambil baris pertama laporan kosong. Itu bukan kehabisan memori atau CPU, jadi mesin yang lebih besar mati dengan cara yang sama (penalaran).",
  "</details>",
  "**4.** Dua instance di belakang proxy menahan Ekspor kosong yang pertama. Kenapa Ekspor kosong yang kedua tidak tertahan?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Kedua instance menjalankan kode yang sama, jadi laporan kosong yang sama mematikan instance kedua. Sesudah itu proxy menjawab 503 pada 10 dari 10 request (`panic.txt` bagian D).",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
