// Penjaga halaman 3.26 (keputusan 1100 sampai 1102): angka, bagian rekaman, rentang Snippet, kode lab, tautan, label sumber,
// klaim negatif berlingkup, diagram Rantai, widget antrean, glosarium, dan kartu Cek diri di m27-hari-promo.mdx diturunkan
// dari rekaman labs/t3-outbox (queue.txt) dan labs/api-t3 (rentan.txt), kode lab (outbox.go, worker.go, main.go, push palsu,
// run.py), README lab, naskah Tahap 3, registry, mesin widget outbox, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci
// per baris lewat m27-hari-promo.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat
// terkunci tidak menangkap SALAHNYA kalimat, jadi mekanisme yang diklaim (urutan klaim, putaran worker, label rekaman) dibaca
// dari kode yang memerankannya. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m27-hari-promo.json";
import { bacaAcuan } from "../widgets/outbox-worker/rekaman";
import { konstanta, jalankan } from "../widgets/outbox-worker/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { bersihkanRujukanInternal } from "./rujukan-internal";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./m27-hari-promo.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-3/m27-hari-promo.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim() && !/^<Snippet (file|files)=/.test(b));
const lab = "labs/t3-outbox";
const queue = baca(`${lab}/output/queue.txt`);
const runPy = baca(`${lab}/run.py`);
const readmeLab = baca(`${lab}/README.md`);
const rentan = baca("labs/api-t3/output/rentan.txt");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const pushGo = baca("labs/api-t3/internal/push/push.go");
const pushPalsu = baca("labs/api-t3/cmd/pushpalsu/main.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const glosJson = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; d: string; b: string; n: string; u: string }[];
const istilahMd = baca("situs/data/istilah.md");
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const hal33 = baca("situs/src/content/docs/tahap-3/fitur-notifikasi.mdx");
const hal37 = baca("situs/src/content/docs/tahap-3/observability.mdx");
const hal39 = baca("situs/src/content/docs/tahap-3/outbox-worker.mdx");
const hal310 = baca("situs/src/content/docs/tahap-3/m19-tidak-diberi-tahu.mdx");
const hal313 = baca("situs/src/content/docs/tahap-3/at-least-once.mdx");
const hal31 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const diagram = DataRantai.parse(diagramMentah);
const dataWidget = JSON.parse(baca("situs/data/widget/t3-outbox-worker.json")) as { skenario: { antrean: { tebak: { pertanyaan: string }; knob: { id: string; opsi: Record<string, string> }[]; peristiwa: Record<string, string> } } };

interface H { id: string; judul: string; path?: string; topik?: string; label?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const ribu = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));

// ---- pembaca teks berbaris: nomor baris mulai dari 1, seperti Snippet -------------------------------------------------------
function baris(teks: string) {
  const b = teks.replace(/\n+$/, "").split("\n");
  const nomor = (ok: (x: string) => boolean, dariNomor = 1): number => {
    const i = b.findIndex((x, n) => n + 1 >= dariNomor && ok(x));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1;
  };
  const antara = (a: number, z: number) => b.slice(a - 1, z).join("\n");
  return { b, nomor, antara };
}
const Q = baris(queue);
const R = baris(rentan);
const O = baris(outboxGo);
const W = baris(workerGo);

const awalQ = (h: string) => Q.nomor((x) => x.startsWith(`# --- ${h}. `));
const bagianQ = (h: string): string[] => {
  const a = awalQ(h);
  const z = Q.b.findIndex((x, i) => i + 1 > a && x.startsWith("# --- "));
  return Q.b.slice(a - 1, z < 0 ? undefined : z);
};
const fnQ = runPy.slice(runPy.indexOf("def rekam_queue"), runPy.indexOf("# ---------- listen.txt (g)"));
const bagRun = (h: string): string => {
  const a = fnQ.indexOf(`bagian("${h}. `);
  expect(a, `bagian ${h} di run.py`).toBeGreaterThanOrEqual(0);
  const z = fnQ.indexOf('bagian("', a + 1);
  return fnQ.slice(a, z < 0 ? undefined : z);
};

// ---- nilai dari rekaman dan kode -------------------------------------------------------------------------------------
const A = bagianQ("A");
const cA = cocok(A.join("\n"), /# c = (\d+) pengirim serentak \(bawaan\), t = ([\d,]+) detik \(layanan push tiruan\), (\d+) baris uang/);
const C_PENGIRIM = Number(cA[1]);
const T_PUSH = angka(cA[2]!);
const BARIS_A = Number(cA[3]);
const kapA = cocok(A.join("\n"), /kapasitas diukur: antara (\d+) dan ([\d,]+) per detik \(batas atas c ÷ t = (\d+) ÷ ([\d,]+) = ([\d,]+)\)/);
const KAP = C_PENGIRIM / T_PUSH;
const bagB = bagianQ("B");
const nPromo = Number(cocok(bagB.join("\n"), /jumlah pemberitahuan promo yang ditulis: (\d+)/)[1]);
const nomorB = cocok(bagB.join("\n"), /# Nomor outbox: ([\d.]+) promo lebih dulu \(1 sampai (\d+)\), tiga top-up \((\d+) sampai (\d+)\), satu pembayaran uang \((\d+)\)/);
const bagC = bagianQ("C");
const cC = cocok(bagC.join("\n"), /terkirim dalam 30 detik: antara ([\d,]+)% dan ([\d,]+)% dari ([\d.]+) \(naskah: (\d+) = (\d+)%, dari ([\d,]+) × 30\)/);
const JENDELA = 30;
const rentangC = cocok(bagRun("C"), /harap\((\d+) <= n <= (\d+), True/);
const bagD = bagianQ("D");
const urutanD = cocok(bagD.join("\n"), /urutan di layanan push: (tiruan-\d+) -> (tiruan-\d+) -> (tiruan-\d+) -> (tiruan-\d+) -> \(promo, kelas 2\)/);
const bagE = bagianQ("E");
const bagF = bagianQ("F");
const lajuF = cocok(bagF.join("\n"), /laju promo terukur dalam (\d+) detik: antara (\d+) dan ([\d,]+) per detik \(batas (\d+)\)/);
const LAJU = Number(lajuF[4]);
const PUNCAK = Number(cocok(naskah, /\| Pembayaran dan transfer per detik \|[^|]*\|[^|]*\| 0,087 rata-rata dan ([\d,]+) puncak/)[1]!.replace(",", ".")) || 0;

const acuan = bacaAcuan({
  transaksi: baca(`${lab}/output/transaksi.txt`), kursor: baca(`${lab}/output/kursor.txt`), ganda: baca(`${lab}/output/ganda.txt`),
  retry: baca(`${lab}/output/retry.txt`), queue,
});
const K = konstanta(acuan);
const mesin = (kelas: "tanpa" | "dengan", laju: "bebas" | "5", c: number) => jalankan("antrean", { kelas, laju, c: String(c) }, K).angka as Record<string, number>;

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined; lang: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return { berkas: atribut("file") ?? "", lines: atribut("lines"), judul: atribut("title"), lang: atribut("lang") };
  });

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (/^<Snippet (file|files)=/.test(b) ? "S" : b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t3-m27-hari-promo.json")))).toEqual(NILAI_JSON.rantai);
  });
});

describe("registry, naskah, blok, dan tautan", () => {
  const reg = dari("t3-m27");
  test("entri registry dan baris peta naskah cocok", () => {
    expect(reg).toMatchObject({ ada: true, nomor: "3.26", jenis: "masalah", inti: true, prasyarat: ["t3-at-least-once"], lab: ["t3-outbox"], tahap: 3, peran: ["devops", "backend"], topik: "Skala dan kinerja" });
    expect(reg.path).toBe("tahap-3/m27-hari-promo.md");
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(reg.path!, ".md"));
    expect(naskah).toContain("| 3.26 | 4 | M27: Hari promo, notifikasi uang terlambat | Masalah | ★ | t3-outbox | W3-outbox |");
    const minggu = cocok(naskah, /\| M27 \| (\d+) \|/)[1]!;
    expect(reg.label).toBe(`Masalah 27 · minggu ${minggu}`);
    harus(`Minggu ${minggu} Tahap 3.`);
    expect(reg.judul).toBe("M27: Hari promo, notifikasi uang terlambat");
    expect(frontmatter).toContain('title: "3.26 M27: Hari promo, notifikasi uang terlambat"');
    expect(hal.filter((h) => h.nomor === "3.26").map((h) => h.id)).toEqual(["t3-m27"]);
    expect(dari("t3-tim-infra")).toMatchObject({ nomor: "3.27", prasyarat: ["t3-m27"], adr: [32] });
    expect(dari("t3-at-least-once").nomor).toBe("3.13");
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-at-least-once\]\] · Jalur inti<\/p>/);
    expect(reg.menit).toBe(Number(m[1]) + Number(m[2]));
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan sama; nomor dan judul sama dengan peta naskah dan registry; halaman yang belum jadi tampil (segera)", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t3-at-least-once", "t3-m18", "t3-notifikasi", "t3-observability", "t3-outbox", "t3-pool", "t3-prd", "t3-tim-infra"]);
    const sesuai: [string, string, string][] = [
      ["t3-at-least-once", "3.13", "At-least-once"], ["t3-m18", "3.6", "M18"], ["t3-notifikasi", "3.3", "Fitur: notifikasi push dan promo HR"],
      ["t3-observability", "3.7", "Observability"], ["t3-outbox", "3.9", "Outbox transaksional"], ["t3-pool", "3.8", "Connection pool"],
      ["t3-prd", "3.1", "PRD v3"], ["t3-tim-infra", "3.27", "Tim dan infra Tahap 3"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t3-tim-infra").ada, "3.27 belum ditulis: tautannya tampil (segera) sampai halaman itu merge").toBeDefined();
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(hitung(badan, "[[t3-tim-infra]]")).toBe(3);
  });
  test("janji halaman lain ke 3.26 ditepati: 3.3 (kenapa kelas penting), 3.7 (umur tertua sebagai metric), 3.9 (alert per kelas uang, kelas ditunda), 3.10 (alert umur tertua), 3.13 (ADR 32), PRD v3", () => {
    expect(hal33).toContain("Kenapa kelas penting dibuka di [[t3-m27]].");
    expect(hal33).toContain("Setiap baris punya kelas: 0 untuk bayar dan transfer, 1 untuk top-up, 2 untuk promo.");
    expect(hal37).toContain("| Umur pemberitahuan tertua sebagai metric | Dibutuhkan saat promo menahan notifikasi uang | [[t3-m27]] |");
    expect(hal39).toContain("Pencegahannya alert umur tertua per kelas uang, ditulis di ADR 32.");
    expect(hal39).toContain("ADR 23 ditulis tanpanya | [[t3-m27]] |");
    expect(hal39).toContain("ADR 32 menambah kelas queue dan alert per kelas ([[t3-m27]])");
    expect(hal310).toContain("Alert dari angka itu dibahas di [[t3-m27]]");
    expect(hal310).toContain("- [[t3-m27]]: alert umur notifikasi tertua, jawaban untuk siapa yang tahu.");
    expect(hal313).toContain("ADR 32 memuat alert umur tertua per kelas ([[t3-m27]], [[t3-tim-infra]])");
    expect(hal31).toContain("Top-up massal tiap Senin boleh menyusul beberapa menit, karena 10.000 notifikasi sekaligus ([[t3-m27]])");
    harus("- [[t3-outbox]]: kelas queue melengkapi outbox. ADR 23 ditulis tanpa kelas, dan ADR 32 merevisinya di [[t3-tim-infra]].");
    harus("- [[t3-observability]]: umur notifikasi tertua adalah sinyal yang dirasakan user, mirip latency di empat golden signals (penalaran).");
  });
  test("halaman tidak membuka isi 3.27: ADR 32 hanya disebut sebagai penunjuk; tanpa alert baris mati, replay otomatis, staging, atau on-call sebagai keputusan", () => {
    expect(hitung(badan, "ADR 32")).toBe(3);
    expect(badan.indexOf("ADR 32")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan).not.toMatch(/alert baris mati|alert jumlah baris|replay|dead-letter|dilewati|staging/i);
    expect(hitung(badan, "on-call")).toBe(1);
    expect(naskah).toContain("ADR 32 (merevisi ADR 23): kolom `kelas`, bayar dan transfer lebih dulu, top-up massal dan promo sesudahnya; promo paling banyak 5 per detik; alert umur tertua; staging; on-call");
    expect(naskah).toContain("| Queue dan alert | Queue punya umur, dan yang tertua yang paling penting | M27 |");
  });
});

describe("naskah M27 dan gejala: jam, dugaan Raka, dan angka cerita berlabel Ilustrasi", () => {
  const barisM27 = naskah.split("\n").find((b) => b.startsWith("| M27 |"))!;
  const jam = cocok(barisM27, /Jumat (\d+\.\d+) HR mengirim promo ke semua ([\d.]+) HP\. Sampai (\d+\.\d+) notifikasi pembayaran Ani belum datang; orang menumpuk di warung; Ani mengabari Sinta pukul (\d+\.\d+) \(Ilustrasi\)/);
  test("baris M27 memuat jam, dugaan layanan push lambat, satu queue urut waktu, kapasitas, dan tidak ada alert", () => {
    expect(barisM27).toContain("| Layanan push lambat |");
    expect(barisM27).toContain("Satu queue urut waktu: 10.000 baris promo berada di depan notifikasi uang.");
    expect(barisM27).toContain("Rekaman lab t3-outbox: kapasitas 12 sampai 13,33 per detik, notifikasi uang di belakang 10.000 promo menunggu lebih dari 30 detik tanpa kelas dan terkirim pertama dengan kelas");
    expect(barisM27).toContain("Tidak ada alert untuk umur notifikasi tertua");
    expect(barisM27).toContain("Top-up massal tiap Senin memakai queue yang sama dan punya akibat yang sama.");
    harus(`Jumat pukul ${jam[1]!.replace(".", ".")} HR mengumumkan promo makan siang ke ${jam[2]} HP karyawan.`);
    harus(`Sampai pukul ${jam[3]} notifikasi itu belum datang.`);
    harus(`pukul ${jam[4]} Ani mengabari Sinta.`);
    harus(`*Angka cerita (Ilustrasi):* pukul ${jam[1]}, ${jam[3]}, dan ${jam[4]}, jumlah ${jam[2]} HP, dan orang yang menumpuk berasal dari naskah, tanpa rekaman yang mengulang jam-jamnya.`);
    harus("Raka mengira layanan push lambat.");
  });
  test("jam cerita: 11.30 ditambah 750 detik adalah 11.42 lewat 30 detik, sebelum 11.44", () => {
    const [j, m] = jam[1]!.split(".").map(Number) as [number, number];
    const habis = (nPromo * T_PUSH) / C_PENGIRIM;
    expect(habis).toBe(750);
    const t = j * 3600 + m * 60 + habis;
    const tampil = `${Math.floor(t / 3600)}.${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}`;
    expect(tampil).toBe(jam[3]);
    expect(t % 60).toBe(30);
    harus(`sekitar ${tampil} lewat ${t % 60} detik (Hitungan atas Ilustrasi), cocok dengan "sampai ${jam[3]} belum datang"`);
    expect(Number(jam[4]!.split(".")[1])).toBeGreaterThan(Number(jam[3]!.split(".")[1]));
  });
  test("Budi membayar Rp25.000 ke Warung Ani (akun 418) di bagian B; pilihan penulis berlabel", () => {
    const nominal = Number(cocok(bagRun("B"), /bayar\(budi, nominal=(\d+), catatan=/)[1]);
    harus(`Budi membayar nasi goreng Rp${ribu(nominal)}.`);
    harus(`Budi dan Rp${ribu(nominal)} adalah pilihan penulis, mengikuti rekaman.`);
    expect(runPy).toMatch(/def bayar\(token, ke=418,/);
    expect(baca("labs/api-t3/cmd/api/seed.go")).toContain("(418, 'warung', 'Warung Ani'");
    harus("Lab mengulang mekanismenya dengan jam lab, dan hanya 30 detik yang dijalankan.");
    expect(cara).toContain("**Ilustrasi**");
  });
});

describe("rekaman queue.txt dan kode penggerak: bagian A sampai F", () => {
  test("bagian A: c = 4, t = 0,3 (layanan push tiruan yang menjawab sesudah 300 ms), 80 baris uang, kapasitas 13,33 (batas atas) dan terukur antara 12 dan 13,33", () => {
    expect([C_PENGIRIM, T_PUSH, BARIS_A]).toEqual([4, 0.3, 80]);
    expect(Number(kapA[3])).toBe(C_PENGIRIM);
    expect(angka(kapA[4]!)).toBe(T_PUSH);
    expect(kapA[5]).toBe(koma(KAP, 2));
    expect(koma(KAP, 2)).toBe("13,33");
    expect(kapA[2]).toBe(koma(KAP, 2));
    const a = bagRun("A");
    expect(a).toContain('d.push_mode("lambat", ms=300)');
    expect(a).toContain('h = worker(["-serentak", "4"])');
    expect(a).toContain("harap(12.0 <= laju <= 13.4, True");
    expect(a).toContain("for n in range(80):");
    expect(A.join("\n")).toContain("worker: diklaim 80, terkirim 80, dilewati 0, ditunda 0, mati 0");
    expect(Number(kapA[1])).toBe(12);
    expect(pushPalsu).toContain("lambat   200 sesudah `ms` milidetik");
    harus("Layanan push tiruan menjawab tiap pengiriman sesudah 300 ms di bagian C dan E rekaman, dan worker di keduanya punya 4 pengirim serentak.");
    harus(`Layanan push menjawab sesudah t = ${koma(T_PUSH, 1)} detik, jadi satu putaran memakan ${koma(T_PUSH, 1)} detik dan kapasitasnya ${C_PENGIRIM} ÷ ${koma(T_PUSH, 1)} = ${koma(KAP, 2)} baris per detik.`);
    harus(`Bagian A mengukur ${BARIS_A} baris uang, dan hasilnya antara ${kapA[1]} dan ${kapA[2]} per detik:`);
    harus(`Satu putaran worker mengambil sampai c = ${C_PENGIRIM} baris`);
  });
  test("push 300 ms di bagian C dan E (yang dibandingkan), bagian D memakai push yang langsung menjawab; worker C dan E tanpa -serentak memakai bawaan 4", () => {
    for (const h of ["C", "E"]) expect(bagRun(h), h).toContain('d.push_mode("lambat", ms=300)');
    expect(bagRun("D")).toContain('d.push_mode("jawab")');
    expect(bagRun("D")).not.toContain("lambat");
    expect(bagRun("C")).toContain('mulai_worker("urut-waktu", ["-rentan", "urut-waktu"])');
    expect(bagRun("E")).toContain('mulai_worker("kelas", [])');
    expect(bagRun("C")).not.toContain("-serentak");
    expect(bagRun("E")).not.toContain("-serentak");
    expect(workerGo).toMatch(/return Konfigurasi\{Serentak: 4,/);
    expect(mainGo).toContain('serentak := flag.Int("serentak", worker.Bawaan().Serentak,');
    expect(bagC.join("\n")).toContain("$ ./api-t3 -peran worker -rentan urut-waktu");
    expect(bagE.join("\n")).toContain("# Worker dengan kelas berjalan terus; 1,5 detik kemudian Budi membayar warung Ani");
  });
  test("bagian B: enam HR menulis promo ke 10.000 karyawan (jumlah kota dari run.py dan rekaman), lalu satu top-up CSV tiga akun, lalu satu pembayaran; isi queue dan nomor", () => {
    const b = bagRun("B");
    expect(nPromo).toBe(10000);
    expect(cocok(runPy, /^    kota = \[([^\]]*)\]/m)[1]!.split(",").length).toBe(6);
    expect(b).toContain('harap(jumlah, 10000, "promo ke 10.000 karyawan")');
    expect(b).toContain('"umumkan": True');
    expect(b.indexOf('"/promo"')).toBeLessThan(b.indexOf('"/topup'));
    expect(b.indexOf('"/topup')).toBeLessThan(b.indexOf("bayar(budi, nominal="));
    expect(cocok(b, /csv = "nomor_karyawan,nominal\\n((?:K\d+,\d+\\n){3})"/)[1]).toBeTruthy();
    expect(b).toContain("[(0, 1), (1, 3), (2, 10000)]");
    const kota = bagB.filter((x) => /^ \w+\s+\| \d+$/.test(x)).map((x) => Number(x.split("|")[1]));
    expect(kota.length).toBe(6);
    expect(kota.reduce((a, c) => a + c, 0)).toBe(nPromo);
    expect(bagB.join("\n")).toContain(" 0     | bayar | menunggu | 1\n 1     | topup | menunggu | 3\n 2     | promo | menunggu | 10000");
    expect(nomorB.slice(2).map(Number)).toEqual([nPromo, 10001, 10003, 10004]);
    harus("Promo mendapat nomor 1 sampai 10000, top-up 10001 sampai 10003, dan pembayaran uang 10004.");
    harus("Bagian B memanggil `POST /promo` sekali per HR, enam kali. Sesudahnya lab menulis satu top-up CSV untuk tiga akun dan satu pembayaran Budi ke Warung Ani:");
    harus("Penggerak lab, `run.py`, menulis promo lebih dulu, lalu top-up, lalu pembayaran. Urutan itu pilihan lab untuk memerankan promo yang masuk lebih dulu.");
    expect(outboxGo).toMatch(/KelasUang  = 0 \/\/ bayar dan transfer\n\tKelasTopup = 1 \/\/ top-up massal\n\tKelasPromo = 2 \/\/ pengumuman promo/);
    expect(hal33).toContain("Jakarta punya 1.000 karyawan");
  });
  test("bagian C: 30 detik, 3,4% sampai 4,2% dari batas 340 dan 420, 400 = 4% dari c ÷ t, uang dan top-up masih menunggu, 9.580 promo di depan", () => {
    const c = bagRun("C");
    expect(c).toContain("time.sleep(30)");
    expect(c).toContain('d.stop("urut-waktu")');
    expect([Number(rentangC[1]), Number(rentangC[2])]).toEqual([340, 420]);
    expect(cC[1]).toBe(koma((340 / nPromo) * 100, 1));
    expect(cC[2]).toBe(koma((420 / nPromo) * 100, 1));
    expect(Number(cC[4])).toBe(Math.round(KAP * JENDELA));
    expect(Number(cC[5])).toBe((Math.round(KAP * JENDELA) / nPromo) * 100);
    expect(cC[6]).toBe(koma(KAP, 2));
    expect(c).toContain('[(0, "menunggu", True), (1, "menunggu", True)]');
    expect(c).toContain('harap(sisa >= 10000 - 420, True, "sisa promo")');
    expect(bagC.join("\n")).toContain(`promo yang masih di depannya: paling sedikit ${ribu(nPromo - 420)} (10.000 dikurangi batas atas 4,2%); seluruh 10.000 promo butuh 10.000 ÷ 13,33 = 750 detik (12,5 menit), dihitung`);
    expect(bagC.join("\n")).toContain("umur notifikasi uang yang menunggu: paling sedikit 30 detik (selama worker berjalan ia belum disentuh: promo lebih dulu)");
    harus(`10.000 × ${koma(T_PUSH, 1)} ÷ ${C_PENGIRIM} = ${(nPromo * T_PUSH) / C_PENGIRIM} detik, yaitu ${koma((nPromo * T_PUSH) / C_PENGIRIM / 60, 1)} menit (Hitungan; 12,5 menit tidak dijalankan).`);
    harus(`merekam ${cC[1]}% sampai ${cC[2]}% promo terkirim. Hitungannya ${koma(KAP, 2)} × ${JENDELA} = ${cC[4]}, yaitu ${cC[5]}%:`);
    harus(`Selama lebih dari ${cC[4]} promo masih di depannya, satu notifikasi uang menunggu lebih dari ${JENDELA} detik, batas janji PRD v3 untuk bayar dan transfer ([[t3-prd]]).`);
    expect(hal31).toContain("Janji 95% dalam 30 detik berlaku untuk bayar dan transfer saja. Top-up massal dan promo tidak masuk janji itu.");
    harus("PRD v3 menaruh promo di luar janji 30 detik ([[t3-prd]]), jadi promo boleh lebih lambat.");
    harus(`Pada detik ke-${JENDELA} lab menghentikan worker.`);
    harus(`paling sedikit ${ribu(nPromo - 420)} promo ada di depannya: 10.000 dikurangi batas atas ${cC[2]}%.`);
    harus("Angka 30 detik adalah saat lab berhenti.");
    const lambat = naskah.split("\n").find((b) => b.startsWith("| Promo atau top-up massal ke 10.000 HP |"))!;
    expect(lambat).toContain("±750 detik, 12,5 menit; dalam 30 detik hanya 400 yang terkirim (4%)");
  });
  test("bagian D: pembayaran uang bernomor 10004 keluar pertama; urutan token dari rekaman; satu baris tiap panggilan, lima panggilan, push langsung menjawab", () => {
    const d = bagRun("D");
    expect(d).toContain("for k in range(1, 6):");
    expect(d).toContain('worker(["-serentak", "1", "-satu-putaran"], tampil=False)');
    expect(urutanD.slice(1)).toEqual(["tiruan-418", "tiruan-10001", "tiruan-10002", "tiruan-10003"]);
    expect(bagD.join("\n")).toContain("# Pembayaran uang (kelas 0, nomor 10004) dikirim pertama walau 10.000 promo punya nomor lebih kecil");
    expect(d).toContain('harap(token[:4], ["tiruan-418", "tiruan-10001", "tiruan-10002", "tiruan-10003"], "uang, lalu top-up")');
    expect(d).toContain('harap(kelas5, 2, "kelima: promo")');
    harus("Bagian D mengambil satu baris tiap panggilan worker, supaya urutan klaimnya terlihat. Pembayaran uang bernomor 10004 keluar pertama, sebelum tiga top-up dan sebelum promo bernomor lebih kecil:");
    expect(baca("labs/api-t3/cmd/api/seed.go")).toContain("'tiruan-' || id");
  });
  test("api-t3 rentan.txt bagian D: tiga top-up lalu satu transfer; dengan kelas transfer pertama, tanpa kelas terakhir", () => {
    const a = R.nomor((x) => x.startsWith("# --- D. M27 "));
    const dengan = R.nomor((x) => x.includes("Worker dengan kelas (bawaan)"), a);
    const tanpa = R.nomor((x) => x.includes("Worker tanpa kelas, mode rentan urut-waktu"), a);
    expect(R.b[dengan + 2]).toBe("urutan di layanan push: tiruan-417 -> tiruan-10011 -> tiruan-10012 -> tiruan-10013");
    expect(R.b[tanpa + 3]).toBe("urutan di layanan push: tiruan-10021 -> tiruan-10022 -> tiruan-10023 -> tiruan-417");
    expect(R.b[tanpa + 4]).toBe("# Tanpa kelas, pembayaran uang menunggu di belakang semua top-up; dengan kelas, di depan (ADR 32, M27)");
    harus("Lab `api-t3` merekam kontrasnya pada queue kecil, yaitu tiga top-up lalu satu transfer. Tanpa kelas transfer uang keluar terakhir, dan dengan kelas pertama:");
  });
  test("bagian E: pembayaran 1,5 detik sesudah worker dijalankan (pilihan lab), terkirim kurang dari 1,5 detik, dua putaran 0,6 detik, dua umur dari query now() - min(dibuat)", () => {
    const e = bagRun("E");
    expect(e).toContain("time.sleep(1.5)");
    expect(e).toContain('harap(tunda < 1.5, True, f"notifikasi uang tertunda');
    const hit = bagE.join("\n");
    expect(hit).toContain("terkirim dalam kurang dari 1,5 detik (dihitung: paling lama dua putaran, 2 × 0,3 detik; yang diperiksa: kurang dari 1,5 detik)");
    expect(2 * T_PUSH).toBeCloseTo(0.6, 10);
    expect(hit).toContain("umur tertua semua kelas: lebih dari 30 detik (promo menumpuk): alert umur tertua dari semua kelas akan berbunyi");
    expect(hit).toContain("umur tertua kelas uang: 0 (tidak ada yang menunggu)");
    expect(e).toContain("SELECT extract(epoch FROM now() - min(dibuat)) FROM outbox WHERE status = 'menunggu'");
    expect(e).toContain("SELECT coalesce(extract(epoch FROM now() - min(dibuat)), 0) FROM outbox WHERE status = 'menunggu' AND kelas = 0");
    expect(e).toContain("harap((float(umur_semua) > 30, float(umur_uang) == 0), (True, True)");
    harus("Menurut rekaman, penggerak lab membayar 1,5 detik sesudah worker dijalankan, jadi waktu itu pilihan lab, bukan hasil sistem. Notifikasi uangnya terkirim dalam kurang dari 1,5 detik.");
    harus("Hitungannya paling lama dua putaran: satu putaran yang sedang berjalan, lalu satu putaran untuk mengirimnya, 2 × 0,3 = 0,6 detik. Lab memeriksa batas 1,5 detik, bukan 0,6. Yang direkam satu notifikasi, bukan 95%.");
    expect(bagE[0]).toBe("# --- E. Promo membanjiri antrean: notifikasi uang yang tiba di tengah banjir menunggu paling lama satu putaran ---");
    expect(Q.b.filter((x) => x.includes("dua putaran")).length).toBe(1);
    expect(bagE.filter((x) => x.includes("paling lama dua putaran")).length).toBe(1);
    harus("Judul bagian E di rekaman menulis satu putaran, sedangkan baris hitungannya menulis dua putaran. Halaman ini memakai dua putaran, karena putaran yang sedang berjalan harus selesai lebih dulu.");
    harus("Query di rekaman ditulis `max(umur)` sebagai ringkasan. `run.py` memakai `now() - min(dibuat)`, dan nol berarti tidak ada baris kelas uang yang menunggu.");
    expect(hit).toContain("=> SELECT max(umur) FROM outbox WHERE status = 'menunggu'   # semua kelas");
    expect(hit).toContain("=> SELECT max(umur) FROM outbox WHERE status = 'menunggu' AND kelas = 0   # hanya uang");
  });
  test("bagian F: sisa promo dijadwalkan 5 per detik lewat coba_lagi (UPDATE dari lab), terukur 4 sampai 5,6 dalam 8 detik, uang pada detik ke-3 kurang dari 1,5 detik; hitungan 2.000 detik, sisa kapasitas, kali puncak", () => {
    const f = bagRun("F");
    expect(f).toContain("coba_lagi = now() + (p.n / 5.0) * interval '1 second'");
    expect(f).toContain("time.sleep(3.0)");
    expect(f).toContain("time.sleep(max(0.0, 8.0 - (time.monotonic() - t0)))");
    expect(f).toContain("harap(4.0 <= laju <= 5.6, True");
    expect(f).toContain('harap(tunda < 1.5, True, f"notifikasi uang tertunda {tunda:.2f} detik")');
    expect([Number(lajuF[1]), Number(lajuF[2]), lajuF[3], LAJU]).toEqual([8, 4, "5,6", 5]);
    const detik = nPromo / LAJU;
    const sisa = KAP - LAJU;
    expect(detik).toBe(2000);
    expect(bagF.join("\n")).toContain(`# 10.000 promo pada 5 per detik butuh 2.000 detik (33 menit), dihitung; sisa kapasitas 13,33 − 5 = ${koma(sisa, 2)} per detik, ${koma(sisa / 0.868, 1)} kali puncak 0,87 (Asumsi naskah)`);
    expect(koma(detik / 60, 0)).toBe("33");
    expect(bagF.join("\n")).toContain("notifikasi uang yang tiba pada detik ke-3: terkirim dalam kurang dari 1,5 detik");
    expect(naskah).toContain("0,868 puncak (dibulatkan 0,87)");
    harus(`Bagian F menjadwalkan sisa promo ${LAJU} baris per detik lewat kolom \`coba_lagi\`, dan terukur ${lajuF[2]} sampai ${lajuF[3]} per detik dalam ${lajuF[1]} detik.`);
    harus(`Harganya waktu: 10.000 ÷ ${LAJU} = ${ribu(detik)} detik, ±${koma(detik / 60, 0)} menit. Sisa kapasitas 13,33 − ${LAJU} = ${koma(sisa, 2)} per detik, yaitu ${koma(sisa / 0.868, 1)} kali puncak 0,868 (Hitungan).`);
    harus("Notifikasi uang yang tiba pada detik ke-3 terkirim dalam kurang dari 1,5 detik:");
  });
  test("laju 5 per detik belum ada di kode api-t3: UmumkanPromo tidak mengisi coba_lagi dan kolom bernilai bawaan now(); README lab mencatatnya", () => {
    const fn = outboxGo.slice(outboxGo.indexOf("func (t Tx) UmumkanPromo"), outboxGo.indexOf("// --8<-- [start:klaim]"));
    expect(fn).toContain("INSERT INTO outbox (akun_id, kelas, jenis, payload)");
    expect(fn).not.toContain("coba_lagi");
    expect(migrasi).toMatch(/coba_lagi\s+timestamptz NOT NULL DEFAULT now\(\),/);
    expect(readmeLab).toContain("4. Laju promo 5 per detik (ADR 32) belum ada di kode api-t3.");
    harus("`UmumkanPromo` di `api-t3` tidak mengisi `coba_lagi`, jadi nilainya bawaan kolom, `now()`, dan laju 5 per detik belum ada di kode.");
    harus("Penjadwalan itu ditulis lab sebagai `UPDATE`.");
  });
  test("top-up massal: tiga top-up direkam, 10.000 top-up tidak dijalankan (README lab)", () => {
    expect(readmeLab).toContain("- Top-up CSV 10.000 akun (kelas 1): yang direkam tiga akun lewat CSV dan banjir 10.000 promo (kelas 2); hitungannya sama karena antreannya sama.");
    harus("Lab merekam tiga top-up lewat CSV, dan 10.000 top-up Tidak dijalankan. Hitungannya sama karena antreannya sama (README lab).");
  });
});

describe("kode lab: urutan klaim, putaran worker, batas push, dan umur tertua", () => {
  test("KlaimOutbox: urutan id tanpa kelas dan kelas, id dengan kelas; flag urut-waktu mematikan UrutKelas; bawaan UrutKelas menyala", () => {
    expect(outboxGo).toContain('\turut := "id"\n\tif urutKelas {\n\t\turut = "kelas, id"\n\t}');
    expect(outboxGo).toContain("ORDER BY `+urut+`");
    expect(outboxGo).toContain("FOR UPDATE SKIP LOCKED)");
    expect(mainGo).toContain('UrutKelas: *rentan != "urut-waktu"');
    expect(workerGo).toContain("UrutKelas: true}");
    expect(workerGo).toContain("w.repo.KlaimOutbox(ctx, w.cfg.Serentak, w.cfg.Klaim, w.cfg.UrutKelas)");
    harus("Fungsi klaim memilih baris dengan `ORDER BY`. Tanpa kelas urutannya `id`, dan dengan kelas `kelas, id`:");
    harus("Flag `-rentan urut-waktu` membuat `UrutKelas` bernilai salah di `main.go`, jadi bagian C memakai urutan `id`. Naskah menyebut urutan itu urut waktu, dan kodenya memakai nomor `id`.");
    harus("Worker menurut nomor adalah mode rentan `-rentan urut-waktu`: kolom `kelas` ada dan terisi, tetapi klaim tidak memakainya.");
    expect(queue).toContain("$ ./api-t3 -peran worker -rentan urut-waktu");
  });
  test("Putaran: klaim sampai c baris, kirim serentak (goroutine per baris), tunggu semuanya (wg.Wait) sebelum klaim berikutnya; batas push 3 detik per panggilan", () => {
    const fn = workerGo.slice(workerGo.indexOf("func (w *Worker) Putaran(ctx context.Context) (Ringkasan, error) {"), workerGo.indexOf("// --8<-- [start:kirim-satu]"));
    expect(fn.length).toBeGreaterThan(500);
    expect(fn.indexOf("KlaimOutbox(")).toBeLessThan(fn.indexOf("go func()"));
    expect(fn.indexOf("go func()")).toBeLessThan(fn.indexOf("wg.Wait()"));
    expect(fn).toContain("hasil[i] = w.kirimSatu(ctx, n)");
    expect(pushGo).toContain("const BatasBawaan = 3 * time.Second");
    expect(mainGo).toContain('"batas waktu satu panggilan push (ADR 22); 0 = tanpa batas"');
    harus("Satu putaran worker mengambil sampai c = 4 baris, mengirimnya serentak, dan menunggu keempatnya selesai sebelum mengklaim lagi:");
    harus("Putaran menunggu keempat pengiriman selesai, jadi satu pengiriman promo yang menggantung menahan putaran itu sampai batas waktu push, 3 detik per panggilan. Uang yang tiba sesudahnya menunggu putaran berikutnya (dibaca dari kode, Tidak dijalankan).");
    harus("Kelas tidak memisahkan kapasitas.");
  });
  test("umur tertua: RingkasOutbox menghitung min(dibuat) dari baris menunggu tanpa memilah kelas, lewat GET /lab/outbox sebagai tertua_detik; klaim negatif berlingkup: lab tidak punya alert, hanya angka umur", () => {
    const fn = outboxGo.slice(outboxGo.indexOf("func (r Repo) RingkasOutbox"), outboxGo.indexOf("// BersihkanOutbox"));
    expect(fn).toContain("SELECT coalesce(extract(epoch FROM now() - min(dibuat)), 0) FROM outbox WHERE status = 'menunggu'");
    expect(fn).not.toMatch(/kelas/);
    expect(mainGo).toContain('rute.HandleFunc("GET /lab/outbox"');
    expect(mainGo).toContain('"tertua_detik": int(tertua)');
    expect(readmeLab).toContain("- OpenTelemetry dan alert sungguhan: `t3-pool`.");
    harus("`RingkasOutbox` mengembalikan umur baris `menunggu` tertua dari semua kelas lewat `GET /lab/outbox`.");
    harus("Alert sungguhan Tidak dijalankan di lab ini.");
    harus("Tidak ada alert untuk umur notifikasi tertua, yaitu berapa lama baris `menunggu` tertua sudah menunggu.");
    // lingkup: semua berkas sumber terlacak di labs/api-t3 dan labs/t3-outbox selain output/ (go, py, sql, md, yml, Makefile)
    const berkas = [...(terlacak ?? [])].filter((f) => /^labs\/(api-t3|t3-outbox)\//.test(f) && !f.includes("/output/") && /\.(go|py|sql|md|ya?ml)$|Makefile$/.test(f));
    expect(berkas.length).toBeGreaterThan(20);
    const temuan = berkas.flatMap((f) =>
      fs.readFileSync(path.join(akar, f), "utf8").split("\n").filter((l) => /alert/i.test(l) && !/onerror=alert\(1\)/.test(l)).map((l) => ({ f, l: l.trim() })),
    );
    const harapan: [string, string][] = [
      ["labs/api-t3/internal/repo/outbox.go", "// Umur tertua adalah sinyal alert yang dirasakan user"],
      ["labs/t3-outbox/README.md", "3. `GET /lab/outbox` di api-t3 melaporkan umur tertua dari semua kelas."],
      ["labs/t3-outbox/README.md", "- OpenTelemetry dan alert sungguhan: `t3-pool`."],
      ["labs/t3-outbox/run.py", 'catat("umur tertua semua kelas: lebih dari 30 detik (promo menumpuk): alert umur tertua dari semua kelas akan berbunyi")'],
      ["labs/t3-outbox/run.py", 'catat("# Alert umur tertua yang dihitung dari semua kelas berbunyi walau uang tepat waktu: alert uang dihitung per kelas'],
    ];
    expect(temuan.map((x) => x.f).sort()).toEqual(harapan.map((x) => x[0]).sort());
    for (const [f, awal] of harapan) expect(temuan.some((x) => x.f === f && x.l.startsWith(awal)), `${f}: ${awal}`).toBe(true);
  });
});

describe("rentang Snippet: berkas, baris, bahasa, dan judul diturunkan dari sumber", () => {
  test("sepuluh Snippet berurutan; nomor baris dihitung dari jangkar, bukan ditulis tangan", () => {
    const rq = (a: number, z: number, ket: string) => ({ berkas: "labs/t3-outbox/output/queue.txt", lines: `${a}:${z}`, lang: undefined, judul: `Rekaman lab: labs/t3-outbox/output/queue.txt baris ${a} sampai ${z} (${ket})` });
    const awalB = Q.nomor((x) => x.startsWith("=> SELECT kelas, jenis, status, count(*)"));
    const akhirB = Q.nomor((x) => x.startsWith("# Nomor outbox:"));
    const awalA = awalQ("A");
    const akhirA = Q.nomor((x) => x.startsWith("kapasitas diukur:"), awalA);
    const awalC = awalQ("C");
    const akhirC = Q.nomor((x) => x.startsWith("promo yang masih di depannya:"), awalC);
    const awalD = awalQ("D");
    const akhirD = Q.nomor((x) => x.startsWith("# Pembayaran uang (kelas 0"), awalD);
    const awalE = Q.nomor((x) => x.startsWith("=> SELECT max(umur) FROM outbox WHERE status = 'menunggu'   # semua kelas"));
    const akhirE = Q.nomor((x) => x.startsWith("# Alert umur tertua yang dihitung dari semua kelas berbunyi"), awalE);
    const awalF = awalQ("F");
    const akhirF = Q.nomor((x) => x.startsWith("# 10.000 promo pada 5 per detik"), awalF);
    const awalKlaim = O.nomor((x) => x === '\turut := "id"');
    const akhirKlaim = O.nomor((x) => x === "\t\tn, lama.Seconds())");
    const awalPutaran = W.nomor((x) => x === "\thasil := make([]string, len(baris))");
    const akhirPutaran = W.nomor((x) => x === "\twg.Wait()");
    const awalR = R.nomor((x) => x.includes("Worker dengan kelas (bawaan)"), R.nomor((x) => x.startsWith("# --- D. M27 ")));
    const akhirR = R.nomor((x) => x.startsWith("# Tanpa kelas, pembayaran uang menunggu di belakang semua top-up"));
    const awalSemua = Q.nomor((x) => x === "$ ./api-t3 -lab");
    const akhirSemua = Q.b.length;
    expect(tagSnippet()).toEqual([
      rq(awalB, akhirB, "bagian B, isi queue"),
      { berkas: "labs/api-t3/internal/repo/outbox.go", lines: `${awalKlaim}:${akhirKlaim}`, lang: "go", judul: `Kode lab: labs/api-t3/internal/repo/outbox.go baris ${awalKlaim} sampai ${akhirKlaim} (urutan klaim)` },
      { berkas: "labs/api-t3/internal/worker/worker.go", lines: `${awalPutaran}:${akhirPutaran}`, lang: "go", judul: `Kode lab: labs/api-t3/internal/worker/worker.go baris ${awalPutaran} sampai ${akhirPutaran} (satu putaran)` },
      rq(awalA, akhirA, "bagian A, kapasitas"),
      rq(awalC, akhirC, "bagian C, tanpa kelas"),
      rq(awalD, akhirD, "bagian D, dengan kelas"),
      { berkas: "labs/api-t3/output/rentan.txt", lines: `${awalR}:${akhirR}`, lang: undefined, judul: `Rekaman lab: labs/api-t3/output/rentan.txt baris ${awalR} sampai ${akhirR} (bagian D, tanpa kelas lawan dengan kelas)` },
      rq(awalE, akhirE, "bagian E, umur tertua"),
      rq(awalF, akhirF, "bagian F, laju promo"),
      { berkas: "labs/t3-outbox/output/queue.txt", lines: `${awalSemua}:${akhirSemua}`, lang: undefined, judul: "Rekaman lab: labs/t3-outbox/output/queue.txt, bagian A sampai F (tanpa baris kepala)" },
    ]);
    expect(awalSemua).toBe(4);
    expect(Q.b.slice(0, 3).join("\n")).toContain("# Lab t3-outbox");
  });
  test("teks yang tampil di Snippet tidak membawa nomor keputusan, ID riset, atau nomor PR; baris kepala rekaman (yang memuat nomor keputusan) tidak ikut", () => {
    for (const t of tagSnippet()) {
      const [a, z] = t.lines!.split(":").map(Number) as [number, number];
      const teks = t.berkas.endsWith("outbox.go") ? O.antara(a, z) : t.berkas.endsWith("worker.go") ? W.antara(a, z) : t.berkas.endsWith("rentan.txt") ? R.antara(a, z) : Q.antara(a, z);
      expect(bersihkanRujukanInternal(teks), t.judul).not.toMatch(POLA_ID_INTERNAL);
    }
    expect(Q.b[2]).toMatch(/keputusan \d+/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman dan kode", () => {
  test("dua baris; sumber rekaman dengan catatan lama tunggu 750 detik dihitung; nilai dari queue.txt B, C, D dan run.py", () => {
    expect(diagram.baris.length).toBe(2);
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-outbox, queue.txt bagian B, C, dan D; lama tunggu penuh 750 detik dihitung dan tidak dijalankan" });
    const [r1, r2] = diagram.baris as [(typeof diagram.baris)[0], (typeof diagram.baris)[0]];
    expect(r1.simpul[0]).toMatchObject({ teks: `${ribu(nPromo)} promo ditulis`, sub: `nomor 1 sampai ${nomorB[2]}` });
    expect(r1.simpul[1]!.sub).toBe(`nomor ${nomorB[5]}, di belakang promo`);
    expect(r1.simpul[2]!.sub).toBe(`${cC[1]}% sampai ${cC[2]}% promo terkirim`);
    expect(r1.simpul[3]).toMatchObject({ sub: `${ribu(nPromo - 420)} promo atau lebih di depannya`, nada: "warn" });
    expect(r2.simpul[0]!.sub).toBe(`kelas 0, nomor ${nomorB[5]}`);
    expect(r2.simpul[1]).toMatchObject({ teks: "ORDER BY kelas, id", kode: true });
    expect(r2.simpul[2]).toMatchObject({ teks: "Uang terkirim pertama", nada: "good" });
    expect(r1.simpul.length + r2.simpul.length).toBe(7);
    expect(diagram.catatan).toBe("Kotak oranye adalah akibat yang direkam. Bagian C berhenti pada detik ke-30, jadi lama tunggu sampai terkirim tidak terekam.");
    expect(r1.sub).toBe("bagian B dan C di queue.txt");
    expect(r2.sub).toBe("bagian D dan E di queue.txt");
    expect(JSON.stringify(diagram)).not.toMatch(POLA_ID_INTERNAL);
    expect(r1.simpul.every((s) => !/\bB\d/.test(s.teks))).toBe(true);
  });
});

describe("widget antrean: konfigurasi yang dibahas halaman dihitung mesin yang sama dengan widget", () => {
  test("satu widget OutboxWorker dengan skenario antrean; konstanta mesin sama dengan rekaman dan naskah", () => {
    expect(hitung(badan, "<OutboxWorker skenario={[\"antrean\"]} />")).toBe(1);
    expect(hitung(badan, "<OutboxWorker")).toBe(1);
    expect(K).toMatchObject({ c: C_PENGIRIM, t: T_PUSH, nPromo, laju: LAJU, putaran: T_PUSH });
    expect(naskah).toContain("| 3.26 | 4 | M27: Hari promo, notifikasi uang terlambat | Masalah | ★ | t3-outbox | W3-outbox |");
  });
  test("angka paragraf Coba sendiri: 4 pengirim tanpa kelas, dengan kelas, 20 pengirim, dan target 95%", () => {
    const awal = mesin("tanpa", "bebas", 4);
    expect([awal.persen30, awal.habis, awal.tunggu]).toEqual([4, 750, 750]);
    const dengan = mesin("dengan", "bebas", 4);
    expect(dengan.tunggu).toBeCloseTo(0.6, 10);
    expect(dengan.habis).toBe(750);
    const dua = mesin("tanpa", "bebas", 20);
    expect(koma(dua.kapasitas!, 1)).toBe("66,7");
    expect(dua.tunggu).toBe(150);
    expect(dua.tunggu! / JENDELA).toBe(5);
    expect(awal.butuh95).toBe(95);
    expect((0.95 * nPromo) / JENDELA).toBeCloseTo(316.6667, 3);
    expect(Math.round(((0.95 * nPromo) / JENDELA) / KAP)).toBe(24);
    expect(((0.95 * nPromo) / JENDELA) * T_PUSH).toBeCloseTo(95, 10);
    harus(`Tanpa kelas dengan ${C_PENGIRIM} pengirim, ${awal.persen30}% promo terkirim dalam ${JENDELA} detik dan notifikasi uang menunggu ${awal.tunggu} detik (Hitungan; bagian C merekam ${JENDELA} detik pertama).`);
    harus(`Pilih Dengan kelas, dan notifikasi uang menunggu ${koma(dengan.tunggu!, 1)} detik (Hitungan; bagian E merekam kurang dari 1,5 detik). Promo tetap habis dalam ${dengan.habis} detik.`);
    harus(`Naikkan pengirim ke 20 tanpa kelas, dan kapasitas jadi ${koma(dua.kapasitas!, 1)} per detik. Notifikasi uang tetap menunggu ${dua.tunggu} detik, lima kali ${JENDELA} detik (Hitungan).`);
    harus("Untuk 95% promo dalam 30 detik, 9.500 ÷ 30 = ±317 per detik, ±24 kali kapasitas awal. Itu butuh (9.500 ÷ 30) × 0,3 = 95 pengirim serentak (Hitungan, tidak dijalankan).");
    expect(mesin("tanpa", "5", 4).tunggu).toBeCloseTo(0.6, 10);
    expect(bagC.join("\n")).toContain("±317 per detik, sekitar 24 kali kapasitas ini: dihitung (Asumsi), tidak dijalankan");
  });
  test("kapasitas lawan puncak: 13,33 ÷ 0,868 = 15,4, ±15 kali (sama dengan 3.3 dan naskah); λ 0,868 dari naskah, bukan 0,87 dibulatkan", () => {
    expect(PUNCAK).toBeCloseTo(0.868, 3);
    expect(koma(KAP / 0.868, 1)).toBe("15,4");
    expect(Math.round(KAP / 0.868)).toBe(15);
    expect(hal33).toContain("| Kapasitas lawan puncak | 13,33 ÷ 0,868 | ±15 kali (Asumsi) |");
    expect(naskah).toContain("13,3 per detik, 15 kali puncak");
    harus("Puncak pembayaran 0,868 per detik (Asumsi) membuat 13,33 ÷ 0,868 = 15,4, jadi kapasitas ±15 kali puncak (Hitungan, sama dengan [[t3-notifikasi]]).");
    expect(hitung(badan, "0,87 ")).toBe(0);
  });
});

describe("label sumber: Rekaman lab, Hitungan, Asumsi, Ilustrasi, Tidak dijalankan dipakai sesuai sumbernya", () => {
  test("Hitungan didefinisikan sekali dan memakai label masukan terlemahnya; c dan t berlabel Asumsi dan 12,5 menit tidak dijalankan", () => {
    harus("Kata Hitungan di halaman ini berarti hasil rumus yang ditulis di sebelahnya. Hitungan memakai label masukan terlemahnya, jadi c dan t yang Asumsi membuat 13,33 berlabel Asumsi.");
    expect(hitung(badan, "Kata Hitungan")).toBe(1);
    expect(naskah).toContain("c = 4, t = 0,3 detik (Asumsi)");
    expect(hal33).toContain("13,33 per detik; terukur antara 12 dan 13,33 (Rekaman lab `queue.txt` bagian A; c dan t Asumsi)");
    expect(hal33).toContain("750 detik, 12,5 menit (Asumsi; tidak dijalankan 12,5 menit)");
  });
  test("Ilustrasi hanya untuk jam dan orang cerita; hitungan jam atas Ilustrasi; kalimat 'Rekaman lab' tidak dipakai untuk lama tunggu 750 detik", () => {
    expect(hitung(badan, "(Ilustrasi)")).toBe(1);
    expect(hitung(badan, "Ilustrasi")).toBe(3);
    expect(badan).not.toMatch(/750 detik[^.]*Rekaman lab/);
    expect(badan).not.toMatch(/Rekaman lab[^.]*750 detik/);
    expect(diagram.sumber.teks).toContain("lama tunggu penuh 750 detik dihitung dan tidak dijalankan");
  });
  test("Tidak dijalankan dipakai untuk 12,5 menit, kode putaran, alert sungguhan, top-up 10.000, dan hitungan 95 pengirim", () => {
    expect(hitung(badan, "Tidak dijalankan")).toBe(4);
    expect(hitung(badan, "tidak dijalankan")).toBe(3);
    expect(hitung(badan, "(Hitungan; 12,5 menit tidak dijalankan)")).toBe(1);
    expect(hitung(badan, "(Hitungan, tidak dijalankan)")).toBe(1);
    expect(hitung(badan, "(penalaran, tidak dijalankan)")).toBe(1);
    expect(hitung(badan, "(dibaca dari kode, Tidak dijalankan)")).toBe(1);
    expect(hitung(badan, "dan 10.000 top-up Tidak dijalankan.")).toBe(1);
    expect(hitung(badan, "Alert sungguhan Tidak dijalankan di lab ini.")).toBe(1);
  });
});

describe("glosarium: tiga istilah baru menunjuk 3.26, definisi paling banyak 25 kata, dan turunan sinkron", () => {
  const istilah = ["Kapasitas worker", "Kelas queue", "Umur notifikasi tertua"];
  test("baris glosarium.mdx, glosarium.json, dan istilah.md; definisi cocok dengan halaman", () => {
    for (const t of istilah) {
      const baris = glosMdx.split("\n").find((b) => b.startsWith(`| **${t}** |`));
      expect(baris, t).toBeDefined();
      const kol = baris!.split("|").map((s) => s.trim());
      expect(kol[3]).toBe("[[t3-m27]]");
      expect(kol[2]!.split(/\s+/).length, t).toBeLessThanOrEqual(25);
      const g = glosJson.find((x) => x.t === t);
      expect(g, t).toBeDefined();
      expect(g).toMatchObject({ d: kol[2], b: "t3-m27", u: "/tahap-3/m27-hari-promo/" });
      expect(g!.n, `${t}: label nomor dari registry`).toBe(`${dari("t3-m27").nomor} M${dari("t3-m27").label!.match(/^Masalah (\d+) /)![1]}`);
      expect(istilahMd).toContain(`*[${t}]: ${kol[2]}`);
    }
    expect(glosMdx).toContain("| **Kapasitas worker** | Jumlah baris yang bisa dikirim worker per detik: c pengirim serentak dibagi t detik per pengiriman. | [[t3-m27]] |");
    expect(glosMdx).toContain("| **Kelas queue** | Kolom di baris queue yang menentukan urutan klaim: kelas lebih kecil diklaim lebih dulu, lalu nomor lebih kecil. | [[t3-m27]] |");
    expect(glosMdx).toContain("| **Umur notifikasi tertua** | Berapa detik baris tertua yang masih menunggu di queue sudah menunggu; nol bila tidak ada yang menunggu. | [[t3-m27]] |");
    expect(glosMdx).toMatch(/\| \*\*JWT\*\* [^\n]*\n\| \*\*Kapasitas worker\*\* [^\n]*\n\| \*\*Kelas queue\*\* [^\n]*\n\| \*\*Kredit\*\* /);
    expect(glosMdx).toMatch(/\| \*\*Tutup buku\*\* [^\n]*\n\| \*\*Umur notifikasi tertua\*\* [^\n]*\n\| \*\*WAL\*\* /);
  });
  test("istilah yang dipakai halaman ada di glosarium: queue, fan-out, worker; kelas, kapasitas, dan umur tertua sesuai kode (kolom kelas, ORDER BY, min(dibuat))", () => {
    for (const t of ["Fan-out", "Queue", "Worker"]) expect(glosMdx).toContain(`| **${t}** |`);
    expect(glosMdx.split("\n").find((b) => b.startsWith("| **Kelas queue**"))).toContain("urutan klaim");
    expect(outboxGo).toContain("urut = \"kelas, id\"");
    expect(hitung(badan, "fan-out")).toBe(1);
  });
});

describe("kartu Cek diri: empat kartu sama dengan kartu.json dan fakta yang sama dengan rekaman dan mesin widget", () => {
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3", "4"]);
    expect(hitung(badan, '<details class="success">')).toBe(4);
    const k = kartu.filter((x) => x.halaman === "t3-m27");
    expect(k.map((x) => x.id)).toEqual(["t3-m27-1", "t3-m27-2", "t3-m27-3", "t3-m27-4"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("3.26 M27: Hari promo, notifikasi uang terlambat");
      expect(x.url).toBe("tahap-3/m27-hari-promo/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab);
    });
  });
  test("jawaban memuat fakta yang sama dengan rekaman dan mesin: 13,33 dan 750 detik dan 4%, 3,4% sampai 4,2%, 66,7 dan 150 detik, umur kelas uang 0", () => {
    const dua = mesin("tanpa", "bebas", 20);
    expect(soal[1]!.jawab).toContain(`Kapasitasnya ${C_PENGIRIM} ÷ ${koma(T_PUSH, 1)} = ${koma(KAP, 2)} per detik, jadi 10.000 promo habis dalam 750 detik, yaitu 12,5 menit. Dalam ${JENDELA} detik terkirim ${koma(KAP, 2)} × ${JENDELA} = ${cC[4]}, yaitu ${cC[5]}% (Hitungan; c dan t Asumsi). Bagian C merekam ${cC[1]}% sampai ${cC[2]}%.`);
    expect(soal[3]!.jawab).toContain(`Kapasitas jadi 20 ÷ ${koma(T_PUSH, 1)} = ${koma(dua.kapasitas!, 1)} per detik, dan 10.000 promo habis dalam ${dua.habis} detik, lima kali ${JENDELA} detik (Hitungan).`);
    expect(soal[0]!.jawab).toContain("di bagian E terkirim dalam kurang dari 1,5 detik");
    expect(soal[2]!.jawab).toContain("umur tertua semua kelas lebih dari 30 detik, sedangkan umur tertua kelas uang 0 (`queue.txt` bagian E)");
    expect(bagE.join("\n")).toContain("umur tertua kelas uang: 0");
  });
});

describe("struktur halaman: tingkat heading, daftar, label, dan tanpa ID internal", () => {
  test("hanya satu heading (h3 Cek diri, di blok terakhir); satu tebakan details question; tanpa daftar bernomor; lima butir daftar di Konsep yang lahir", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, '<details class="question">')).toBe(1);
    expect(badan).not.toMatch(/^\d+\. /m);
    expect(hitung(badan, "\n- [[")).toBe(5);
    expect(hitung(badan, "<details>\n<summary>Rekaman bagian A sampai F (juga untuk pembaca tanpa JavaScript)</summary>")).toBe(1);
    expect(hitung(badan, "**Ubah satu hal")).toBe(0);
    harus("Lalu ubah satu hal: kelas, laju promo, atau jumlah pengirim.");
    harus("Tebak dulu berapa persen dari 10.000 promo terkirim dalam 30 detik.");
  });
  test("jawaban tebakan: worker menurut kelas, dari bagian E; push dan pengirim sama; posisi jawaban tidak berpola (pilihan dua worker, jawaban kedua)", () => {
    harus("Yang menurut kelas. Di `queue.txt` bagian E, notifikasi uang yang tiba di tengah promo terkirim dalam kurang dari 1,5 detik. Worker yang menurut nomor, di bagian C, belum menyentuhnya sesudah 30 detik.");
    harus("Push dan jumlah pengirim sama di kedua percobaan, dan keduanya masih memuat promo yang menunggu. Dugaan layanan push lambat tidak menjelaskan bedanya.");
    const q = cocok(badan, /<summary>Tebak dulu: ([^<]+)<\/summary>/)[1]!;
    expect(q.indexOf("yang mengklaim menurut nomor")).toBeLessThan(q.indexOf("yang menurut kelas lebih dulu"));
  });
  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa kata yang dilarang gaya-bahasa, tanpa Anda atau kita", () => {
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(JSON.stringify(diagram)).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/!(?!\[)/);
    expect(badan).not.toMatch(/\b(Anda|kita|pengguna|mudah|cukup|tinggal)\b/i);
    expect(frontmatter).not.toMatch(POLA_ID_INTERNAL);
  });
  test("front matter dikunci: title dan description memuat Minggu 9, 11.30, 11.42, dan satu queue", () => {
    expect(frontmatter).toBe(
      'title: "3.26 M27: Hari promo, notifikasi uang terlambat"\ndescription: Minggu 9. HR mengumumkan promo pukul 11.30, dan sampai 11.42 notifikasi pembayaran Ani belum datang. Promo dan notifikasi uang memakai satu queue yang diklaim menurut nomor, jadi 10.000 promo berada di depan notifikasi uang.\n',
    );
  });
});

// ---- tambahan tinjauan (keputusan 1103): mutan lapis turunan yang lolos di penjaga awal ---------------------------------------
describe("tinjauan: kelas, versi, huruf bagian, dan teks widget diturunkan dari sumbernya", () => {
  test("pemetaan kelas di halaman sama dengan konstanta KelasUang, KelasTopup, KelasPromo di outbox.go dan tabel bagian B", () => {
    const k = cocok(outboxGo, /KelasUang\s+= (\d) \/\/ bayar dan transfer\n\s*KelasTopup = (\d) \/\/ top-up massal\n\s*KelasPromo = (\d) \/\/ pengumuman promo/);
    harus(`kolom \`kelas\`: ${k[1]} untuk bayar dan transfer, ${k[2]} untuk top-up, ${k[3]} untuk promo ([[t3-notifikasi]])`);
    const tabel = bagB.filter((x) => /^ \d\s+\| (bayar|topup|promo)\s/.test(x)).map((x) => x.split("|").slice(0, 2).map((s) => s.trim()).join(":"));
    expect(tabel).toEqual([`${k[1]}:bayar`, `${k[2]}:topup`, `${k[3]}:promo`]);
  });
  test("versi PostgreSQL di halaman sama dengan kepala rekaman queue.txt", () => {
    const v = cocok(Q.b[1]!, /PostgreSQL ([\d.]+) \(Debian/)[1]!;
    harus(`PostgreSQL ${v}, server Go dan worker \`api-t3\`, dan layanan push tiruan lokal.`);
  });
  test("huruf bagian yang disebut prosa menunjuk bagian rekaman yang judulnya cocok", () => {
    const judul = (h: string) => Q.b.find((x) => x.startsWith(`# --- ${h}. `))!;
    const pasangan: [string, string, string][] = [
      ["A", "Bagian A mengukur 80 baris uang", "Kapasitas worker"],
      ["B", "Bagian B memanggil `POST /promo` sekali per HR", "Pengumuman promo"],
      ["C", "Bagian C menjalankan worker menurut nomor selama 30 detik", "M27 tanpa kelas (mode rentan urut-waktu)"],
      ["D", "Bagian D mengambil satu baris tiap panggilan worker", "Dengan kelas (bawaan)"],
      ["E", "Bagian E menjalankan worker dengan kelas selagi promo masih menunggu", "Promo membanjiri antrean"],
      ["F", "Bagian F menjadwalkan sisa promo 5 baris per detik", "Laju promo"],
    ];
    for (const [h, kalimat, kata] of pasangan) {
      harus(kalimat);
      expect(judul(h), `judul bagian ${h}`).toContain(kata);
    }
  });
  test("api-t3 rentan.txt bagian D: kedua worker mengklaim empat baris (tiga top-up dan satu transfer), semuanya terkirim", () => {
    const a = R.nomor((x) => x.startsWith("# --- D. M27 "));
    const dengan = R.nomor((x) => x.includes("Worker dengan kelas (bawaan)"), a);
    const tanpa = R.nomor((x) => x.includes("Worker tanpa kelas, mode rentan urut-waktu"), a);
    for (const i of [dengan, tanpa]) expect(R.b[i + 1], `baris ${i + 2}`).toBe("worker: diklaim 4, terkirim 4, dilewati 0, ditunda 0, mati 0");
    expect(R.b[dengan - 1]).toContain("tiga top-up (kelas 1), lalu satu transfer ke Dimas (kelas 0, nomor terbesar)");
    expect(R.b[tanpa - 1]).toContain("tiga top-up (kelas 1), lalu satu transfer ke Dimas (kelas 0, nomor terbesar)");
  });
  test("mesin widget: laju 5 per detik dengan kelas menghabiskan promo dalam 2.000 detik dan menyisakan 13,33 \u2212 5 = 8,33 per detik", () => {
    const f = mesin("dengan", "5", C_PENGIRIM);
    expect(f.habis).toBe(nPromo / LAJU);
    expect(koma(f.sisa!, 2)).toBe(koma(KAP - LAJU, 2));
    expect(koma(f.sisa!, 2)).toBe("8,33");
  });
  test("teks data widget skenario antrean selaras dengan halaman: queue diklaim menurut nomor (bukan menurut waktu), opsi Dengan kelas, pengirim 20, laju per detik", () => {
    const s = dataWidget.skenario.antrean;
    const kelas = s.knob.find((x) => x.id === "kelas")!;
    expect(kelas.opsi).toEqual({ tanpa: "Tanpa kelas, menurut nomor", dengan: "Dengan kelas" });
    harus("Pilih Dengan kelas, dan notifikasi uang menunggu");
    expect(Object.keys(s.knob.find((x) => x.id === "c")!.opsi)).toEqual(["1", "4", "8", "20"]);
    harus("Naikkan pengirim ke 20 tanpa kelas");
    expect(s.knob.find((x) => x.id === "laju")!.opsi).toEqual({ bebas: "Semua sekaligus", "5": "Dibatasi {n} per detik" });
    expect(s.tebak.pertanyaan).toContain("worker mengklaim queue menurut nomor, tanpa kelas");
    expect(s.peristiwa["uang-masuk"]).toBe("Notifikasi uang masuk queue yang diklaim menurut nomor: ia menunggu promo yang bernomor lebih kecil.");
    expect(JSON.stringify(s)).not.toMatch(/menurut waktu|urutan waktu|urut waktu/);
  });
});
