// Penjaga halaman 4.10 (keputusan 1302 sampai 1304): angka, jam, hitungan, nomor halaman, tautan, label sumber, rentang Snippet,
// klaim "dibaca dari kode", klaim negatif berlingkup, diagram Rantai, skenario alur t4-m31.json, baris riset, dan kartu Cek diri di
// m31-verifikasi-tertahan.mdx diturunkan dari rekaman labs/t4-integrasi (lajur.txt, worker.txt, retry.txt) dan labs/api-t4
// (verifikasi.txt), kode lab api-t4 (worker/verifikasi.go, worker/worker.go, repo/outbox.go, migrasi 000022), README dan run.py
// t4-integrasi, naskah Tahap 4, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.6): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas
// nilai) mengunci SETIAP baris badan halaman, sehingga satu kata, satu "tidak", satu tingkat heading, atau satu atribut yang
// berubah menggagalkan tes; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap
// SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, id dan nilai diagram, skenario, baris riset) dikunci dengan
// sidik jari di berkas nilai; tabel Hitungan dihitung ulang dari rumusnya sendiri.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m31-vendor-mati.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, SIDIK } from "./m31-verifikasi-tertahan.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m31-verifikasi-tertahan.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m31.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const lajur = baca("labs/t4-integrasi/output/lajur.txt");
const workerTxt = baca("labs/t4-integrasi/output/worker.txt");
const retry = baca("labs/t4-integrasi/output/retry.txt");
const verifikasiTxt = baca("labs/api-t4/output/verifikasi.txt");
const readme = baca("labs/t4-integrasi/README.md");
const runInt = baca("labs/t4-integrasi/run.py");
const verifGo = baca("labs/api-t4/internal/worker/verifikasi.go");
const workerGo = baca("labs/api-t4/internal/worker/worker.go");
const migrasi = baca("labs/api-t4/migrasi/000022_verifikasi_qr.up.sql");
const hal313 = baca("situs/src/content/docs/tahap-3/at-least-once.mdx");
const hal38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
const hal43 = baca("situs/src/content/docs/tahap-4/fitur-topup-verifikasi.mdx");
const hal44 = baca("situs/src/content/docs/tahap-4/dua-arah-pihak-ketiga.mdx");
const hal42 = baca("situs/src/content/docs/tahap-4/fitur-ke-teknis.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Layar { judul?: string; sinyal?: number; nada?: string; isi?: { jenis: string; teks?: string }[] }
interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, Layar> }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
// angka Indonesia ("12.600", "0,0116") menjadi number
const angka = (s: string): number => Number(s.replace(/\.(?=\d{3}(?!\d))/g, "").replace(",", "."));
const IDS = ["R4-155", "R4-156", "R4-157", "R4-158", "R4-159"];

// ---- rekaman: bagian dan nomor baris Snippet --------------------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 0): number => {
    const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
    expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const akhirSebelum = (n: number): number => {
    let i = n - 1;
    while (baris[i - 1]!.trim() === "") i--;
    return i;
  };
  const teks = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
  return { baris, nomor, akhirSebelum, teks };
};
const L = bagian(lajur);
const lA = L.nomor((b) => b.startsWith("# --- A. ")), lB = L.nomor((b) => b.startsWith("# --- B. "));
const lMati = L.nomor((b) => b.startsWith("# vendor mati: 50 permintaan masuk"), lA);
const lPulih = L.nomor((b) => b.startsWith("# Vendor pulih. Pekerjaan yang sudah dead-letter"), lA);
const lAkhirA = L.akhirSebelum(lB);
const lBagA = L.teks(lA, lAkhirA);
const W = bagian(workerTxt);
const wA = W.nomor((b) => b.startsWith("# --- A. ")), wB = W.nomor((b) => b.startsWith("# --- B. ")), wC = W.nomor((b) => b.startsWith("# --- C. "));
const wUjungA = W.nomor((b) => b.startsWith("# t terukur: "), wA);
const wBagA = W.teks(wA, W.akhirSebelum(wB));
const wBagC = W.teks(wC, W.baris.length - 1);
const R = bagian(retry);
const rC = R.nomor((b) => b.startsWith("# --- C. ")), rD = R.nomor((b) => b.startsWith("# --- D. "));
const rUjungC = R.nomor((b) => b.startsWith("# sesudah pulih: 2 permintaan masuk"), rC);
const rBagC = R.teks(rC, R.akhirSebelum(rD));
const rBagD = R.teks(rD, R.baris.length - 1);

// ---- kode lab ---------------------------------------------------------------------------------------------------------
const KV = bagian(verifGo);
const kvAwal = KV.nomor((b) => b.startsWith("// tundaVerifikasi menunda dengan backoff"));
const kvAkhir = KV.nomor((b) => b === "}", kvAwal);
const kodeTunda = KV.teks(kvAwal, kvAkhir);
const KW = bagian(workerGo);
const kwBawaanAwal = KW.nomor((b) => b.startsWith("// Bawaan adalah konfigurasi"));
const kwBawaanAkhir = KW.nomor((b) => b === "}", kwBawaanAwal);
const kodeBawaan = KW.teks(kwBawaanAwal, kwBawaanAkhir);
const kwBackoffAwal = KW.nomor((b) => b.startsWith("// Backoff: tunggu sebelum percobaan berikutnya"));
const kwBackoffAkhir = KW.nomor((b) => b === "}", kwBackoffAwal);
const kodeBackoff = KW.teks(kwBackoffAwal, kwBackoffAkhir);
const kwTundaAwal = KW.nomor((b) => b.startsWith("func (w *Worker) tunda(ctx"));
const kodeTundaWorker = KW.teks(kwTundaAwal, KW.nomor((b) => b === "}", kwTundaAwal));
const kvKirimAwal = KV.nomor((b) => b.startsWith("func (w *Worker) kirimVerifikasi("));
const kodeKirim = KV.teks(kvKirimAwal, KV.nomor((b) => b === "}", kvKirimAwal));

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// konstanta worker dibaca dari kode, bukan ditulis tangan
const konstanta = (nama: string): number => {
  const m = cocok(kodeBawaan, new RegExp(`${nama}: *(\\d+)(?: \\* time\\.(Second|Millisecond))?`));
  const n = Number(m[1]);
  return m[2] === "Millisecond" ? n / 1000 : n;
};
const SERENTAK = konstanta("Serentak"), MAKS_PERCOBAAN = konstanta("MaksPercobaan"), DASAR = konstanta("DasarBackoff"), MAKS_BACKOFF = konstanta("MaksBackoff"), SELANG = konstanta("Selang");
const TIMEOUT = Number(cocok(hal38, /Setiap client yang memanggil layanan luar punya `Timeout` eksplisit (\d+) detik/)[1]);
// jeda sesudah percobaan ke-1..(maks-1): Backoff menggandakan dasar tiap percobaan, dibatasi maks; percobaan terakhir tidak menunggu
const JEDA = Array.from({ length: MAKS_PERCOBAAN - 1 }, (_, i) => Math.min(DASAR * 2 ** i, MAKS_BACKOFF));
const UMUR = MAKS_PERCOBAAN * TIMEOUT + JEDA.reduce((a, b) => a + b, 0);
// jam di Gejala dan Raka kira
const jam = (s: string): number => { const [j, m] = s.split(".").map(Number); return j! * 3600 + m! * 60; };
const JAM_MULAI = cocok(badan, /Sejak (\d\d\.\d\d) layar mereka/)[1]!;
const JAM_CEK = cocok(badan, /Pukul (\d\d\.\d\d) Ratih membuka/)[1]!;
const DETIK_GANGGUAN = jam(JAM_CEK) - jam(JAM_MULAI);
const PER_HARI = angka(cocok(naskah, /\| Verifikasi identitas \| pendaftar ÷ 86\.400 × puncak \| ([\d.]+) pendaftar per hari \(Asumsi\)/)[1]!);
const PUNCAK = Number(cocok(naskah, /faktor puncak (\d+)/)[1]);
const NOTIF = angka(cocok(naskah, /\| ([\d,]+) per detik puncak = 56% kapasitas/)[1]!);
const T_NOTIF = angka(cocok(naskah, /c = 4, t = (0,3) detik \(Asumsi Tahap 3\)/)[1]!);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.10 ada, masalah, jalur inti, prasyarat 3.13, lab t4-integrasi, peran devops dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m31")).toMatchObject({ ada: true, nomor: "4.10", jenis: "masalah", inti: true, prasyarat: ["t3-at-least-once"], lab: ["t4-integrasi"], tahap: 4, peran: ["devops", "backend"] });
    expect(dari("t3-at-least-once").nomor).toBe("3.13");
    expect(frontmatter).toContain('title: "4.10 M31: 146 pendaftar tertahan \\"Sedang diverifikasi\\""');
    expect(dari("t4-m31").judul).toBe('M31: 146 pendaftar tertahan "Sedang diverifikasi"');
    expect(naskah).toContain('| 4.10 | 4 | M31: 146 pendaftar tertahan "Sedang diverifikasi" | Masalah | ★ | t4-integrasi | alur |');
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-at-least-once\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m31").menit).toBe(Number(m[1]) + Number(m[2]));
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
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t3-at-least-once", "t3-pool", "t4-breaker", "t4-dua-arah", "t4-topup-verifikasi"]);
    const sesuai: [string, string, string][] = [
      ["t3-at-least-once", "3.13", "At-least-once"], ["t3-pool", "3.8", "Connection pool"], ["t4-breaker", "4.11", "Timeout, retry berkunci, circuit breaker"],
      ["t4-dua-arah", "4.4", "Dua arah ke pihak ketiga"], ["t4-topup-verifikasi", "4.3", "Fitur: top-up dari bank dan verifikasi identitas"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 4.10 ditepati: 4.3 (layanan verifikasi yang mati), 4.4 (jawaban M29 sampai M31), 4.2 (kabar dari luar muncul lagi di M31)", () => {
    expect(hal43).toContain("Layanan verifikasi yang mati sehari dibahas di [[t4-m31]].");
    expect(hal44).toContain("Jawabannya ada di [[t4-m29]], [[t4-m30]], dan [[t4-m31]].");
    expect(hal42).toContain("([[t4-m31]])");
    expect(dari("t4-m31").prasyarat).toEqual(["t3-at-least-once"]);
    expect(dari("t4-breaker").prasyarat).toEqual(["t4-m31"]);
    harus("- [[t4-breaker]]: timeout, retry berkunci, circuit breaker, dan lajur per vendor. Keputusannya ADR 36.");
    harus("- [[t4-dua-arah]]: pihak luar yang lambat atau mati tidak boleh menahan pembayaran antar akun, syarat ketiga di sana.");
    expect(naskah).toContain("Pihak luar yang lambat atau mati tidak menahan pembayaran antar akun");
  });
  test("halaman tidak membuka isi 4.11: ADR 36 hanya sekali (konsep), tanpa gobreaker, half-open, IsSuccessful, ambang, atau angka batas 60 detik breaker", () => {
    expect([...new Set(badan.match(/ADR \d+/g))].sort()).toEqual(["ADR 22", "ADR 25", "ADR 36"]);
    expect(badan.match(/ADR 36/g)).toHaveLength(1);
    expect(badan.match(/ADR 25/g)).toHaveLength(1);
    expect(badan.match(/ADR 22/g)).toHaveLength(1);
    expect(dari("t4-breaker").adr).toEqual([36]);
    expect(dari("t3-at-least-once").adr).toEqual([25]);
    expect(dari("t3-pool").adr).toEqual([22]);
    expect(badan).not.toMatch(/gobreaker|half-open|ReadyToTrip|IsSuccessful|IsExcluded|MaxRequests|59,999|60,001|circuit breaker, dan lajur per vendor\) /);
    expect(badan).not.toMatch(/\bclosed\b|\bopen\b|dijeda|dijeda/);
  });
});

describe("naskah M31: gejala, yang dikira, dan yang sebenarnya", () => {
  const barisM31 = naskah.split("\n").find((b) => b.startsWith("| M31 |"))!;
  test("baris M31 di naskah: minggu 5, Sabtu 09.10 sampai 12.40, 146 pendaftar, Ratih, foto buram, 0,0116 × 12.600 = 146, 1,74 dan 4,0 dari 4", () => {
    expect(barisM31).toContain("| M31 | 5 | Sabtu 09.10 sampai 12.40.");
    expect(barisM31).toContain('Pendaftar baru melihat "Sedang diverifikasi" yang tidak berubah, lalu 146 pendaftar berstatus "Verifikasi gagal" padahal foto mereka jelas.');
    expect(barisM31).toContain("Ratih membuka daftar tinjauan dan melihat daftar panjang yang sama (Ilustrasi)");
    expect(barisM31).toContain("| Foto buram atau pendaftar salah mengambil foto |");
    expect(barisM31).toContain("Layanan verifikasi tiruan tidak menjawab selama 3 jam 30 menit (Ilustrasi)");
    expect(barisM31).toContain("Jumlahnya 0,0116 per detik × 12.600 detik = 146 pada laju rata-rata (Hitungan)");
    expect(barisM31).toContain("0,116 × 5 × 3 = 1,74 dari 4 worker terpakai untuk pekerjaan yang pasti gagal");
    expect(barisM31).toContain("4,0 dari 4 (Hitungan, Asumsi)");
    expect(barisM31).toContain("`lajur.txt` A: semua pekerjaan habis sebelum vendor pulih");
    harus("Minggu 5 Tahap 4, hari Sabtu.");
    expect(JAM_MULAI).toBe("09.10");
    expect(JAM_CEK).toBe("12.40");
  });
  test("jam dan lama: 09.10 sampai 12.40 adalah 3 jam 30 menit = 12.600 detik, sama dengan naskah dan dengan kalimat Raka", () => {
    expect(DETIK_GANGGUAN).toBe(12600);
    expect(DETIK_GANGGUAN).toBe(3.5 * 3600);
    harus("Dari 09.10 sampai 12.40 ada 12.600 detik, dan 0,0116 × 12.600 = 146 pendaftar.");
    harus("Yang bertahan 3 jam 30 menit adalah layanan yang mati, bukan layar pendaftar.");
    harus("*Angka cerita (Ilustrasi):* jam 09.10 dan 12.40, tulisan di layar, dan 146 pendaftar berasal dari naskah, bukan dari rekaman.");
    expect(naskah).toContain("Sabtu 09.10 sampai 12.40");
    expect(frontmatter).toContain("selama 3 jam 30 menit");
  });
  test("adegan Gejala tanpa kalimat definisi dan tanpa konsep; Raka memeriksa app: 202 diajukan ada di verifikasi.txt bagian B dan di 4.3", () => {
    const blokGejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf("</Blok>"));
    expect(blokGejala).not.toMatch(/ (adalah|yaitu|artinya|berarti|merupakan|disebut) /);
    expect(blokGejala).not.toMatch(/worker|outbox|dead-letter|timeout|slot|backoff|breaker|Hitungan/);
    expect(verifikasiTxt).toContain("HTTP 202");
    expect(verifikasiTxt).toContain('"status":"diajukan"');
    harus("Dua foto terkirim, dan server menjawab 202 dengan status `diajukan`, seperti di [[t4-topup-verifikasi]] (`verifikasi.txt` bagian B).");
    expect(hal43).toContain("Worker mengklaim baris outbox itu dan memanggil layanan verifikasi tiruan.");
  });
  test("Hitungan 146 di blok Raka kira: 1.000 ÷ 86.400 = 0,0116 (tanpa pembulatan 0,011574 dan 145,8), semua dari angka yang tertulis", () => {
    expect(PER_HARI).toBe(1000);
    const laju = PER_HARI / 86400;
    expect(laju.toFixed(4)).toBe("0.0116");
    expect(laju.toFixed(6)).toBe("0.011574");
    expect((laju * DETIK_GANGGUAN).toFixed(1)).toBe("145.8");
    expect(Math.round(0.0116 * DETIK_GANGGUAN)).toBe(146);
    expect(Math.round(laju * DETIK_GANGGUAN)).toBe(146);
    harus("Naskah memakai 1.000 pendaftar per hari (Asumsi), jadi 1.000 ÷ 86.400 = 0,0116 pendaftar per detik.");
    harus("Angka 0,0116 adalah pembulatan dari 0,011574, dan tanpa pembulatan hasilnya 145,8, yang juga menjadi 146.");
    harus("Itu Hitungan atas Asumsi: hasil rumus dari angka yang tertulis di halaman ini, berlabel sama dengan masukan terlemahnya.");
    expect(barisM31).toContain("Jumlahnya 0,0116 per detik × 12.600 detik = 146");
    expect(badan.match(/\b146\b/g)!.length).toBeGreaterThanOrEqual(8);
  });
  test("tebakan 'foto buram' ditolak dengan penalaran, bukan rekaman: foto buram menggagalkan sebagian, dan rekaman A menggagalkan 10 dari 10", () => {
    harus("Jumlah pendaftar yang masuk sama dengan jumlah yang gagal. Foto buram menggagalkan sebagian pendaftar, bukan semuanya.");
    expect(lBagA).toMatch(/ gagal +\| 10\n/);
    expect(lBagA).not.toMatch(/ lulus /);
    harus("Rekaman lab `lajur.txt` bagian A memerankannya dengan layanan tiruan yang mati: 10 dari 10 pengajuan gagal.");
  });
  test("lajur.txt bagian A: layanan mati (503), 10 pendaftar, kapasitas 1 dan lima percobaan tanpa backoff yang ditunggu, 10 mati, 10 gagal, 50 permintaan, 0 objek, diklaim 0, 10 akun belum", () => {
    expect(lBagA).toContain("mode mati (503 untuk semua permintaan)");
    expect(lBagA).toContain("# 10 pendaftar mengajukan verifikasi: 10 baris verifikasi dan 10 pekerjaan di outbox (lajur verifikasi)");
    expect(lBagA).toMatch(/ menunggu \| 0 +\| 10\n/);
    expect(lBagA).toContain("# worker: kapasitas 1, lima percobaan, tanpa backoff (waktu diperankan:");
    expect(lBagA).toMatch(/ mati +\| 5 +\| 10\n\(1 row\)/);
    expect(lBagA).toMatch(/ gagal +\| 10\n\(1 row\)/);
    expect(lBagA).toContain("# vendor mati: 50 permintaan masuk, 0 objek dibuat (kunci berbeda = objek berbeda)");
    expect(lBagA).toContain("worker: diklaim 0, terkirim 0, dilewati 0, ditunda 0, mati 0");
    expect(lBagA).toMatch(/ belum +\| 10\n/);
    expect(50).toBe(10 * MAKS_PERCOBAAN);
    expect(lBagA).not.toMatch(/-breaker/);
    expect(lBagA).not.toMatch(/-rentan/);
    harus("Sepuluh pekerjaan berstatus `mati` dengan 5 percobaan, dan sepuluh pengajuan berstatus `gagal`. Layanan menerima 50 permintaan (10 × 5) dan tidak membuat satu objek pun.");
    harus("Di rekaman bagian A, api-t4 berjalan tanpa breaker dan tanpa penjeda pekerjaan.");
  });
  test("run.py: bagian A memanggil ajukan(pendaftar(10)), worker satu kapasitas lima percobaan backoff 0, dan memeriksa (50, 0) lalu 10 akun belum", () => {
    const awal = runInt.indexOf("def rekam_lajur():");
    const a = runInt.slice(awal, runInt.indexOf('bagian("B. Dengan breaker per lajur'));
    expect(a).toContain('d.tiruan_mode(PORT_VERIFIKASI, "mati")');
    expect(a).toContain("ajukan(pendaftar(10))");
    expect(a).toContain('harap((v["permintaan"], v["objek"]), (50, 0)');
    expect(a).toContain('harap(satu("SELECT count(*) FROM akun WHERE id BETWEEN 40003 AND 40012 AND tingkat = \'belum\'"), 10');
    expect(a).not.toMatch(/"-breaker"/);
    expect(runInt).toMatch(/PEKERJA_SATU = \[[^\]]*"-serentak", "1", "-backoff", "0s", "-maks-percobaan", "5"/);
  });
  test("pekerjaan mati tidak diklaim lagi: tidak ada kode Go atau SQL (bukan tes) di labs/api-t4 yang membaca baris outbox mati; setiap UPDATE outbox hanya menyentuh status menunggu", () => {
    const semuaBerkas = terlacak ? [...terlacak] : (fs.readdirSync(path.join(akar, "labs/api-t4"), { recursive: true }) as string[]).map((f) => `labs/api-t4/${f}`);
    const berkas = semuaBerkas.filter((f) => f.startsWith("labs/api-t4/") && /\.(go|sql)$/.test(f) && !f.endsWith("_test.go"));
    expect(berkas.length).toBeGreaterThan(30);
    let jumlah = 0;
    for (const f of berkas) {
      const isi = baca(f);
      for (const m of isi.matchAll(/UPDATE\s+outbox\b[\s\S]*?(?:`|;)/g)) {
        jumlah++;
        // pernyataan lengkap: dari pemanggilan Context( terdekat sebelum UPDATE (klaim memakai WITH pilih ... WHERE status = 'menunggu')
        const mulai = Math.max(isi.lastIndexOf("Context(ctx,", m.index!), 0);
        const pernyataan = isi.slice(mulai, m.index! + m[0].length);
        expect(pernyataan, `${f}: ${m[0]}`).toMatch(/status\s*=\s*'menunggu'/);
        const ubah = m[0].match(/SET([\s\S]*?)(?:\bWHERE\b|\bFROM\b|`|;)/)![1]!;
        expect(ubah, `${f}: SET${ubah}`).not.toMatch(/status\s*=\s*'menunggu'/);
      }
      expect(isi, f).not.toMatch(/WHERE[^`;]*status\s*=\s*'mati'/);
    }
    expect(jumlah).toBe(5);
    harus("Di `labs/api-t4` tidak ada kode yang membaca pekerjaan `mati` lagi: setiap `UPDATE outbox` di kode Go dan SQL, selain tes, hanya menyentuh baris berstatus `menunggu` (Tidak dijalankan: dibaca dari kode).");
    expect(hal313).toContain("memutarnya ulang dengan satu `UPDATE` yang mengembalikan `status` ke `menunggu`");
    harus("Di Tahap 3 pekerjaan mati diputar ulang dengan `UPDATE` tangan ([[t3-at-least-once]]).");
  });
  test("cerita tidak menjawab, rekaman 503: timeout lima kali berakhir sama (retry.txt bagian D) dan lajur A memakai 503, bukan menggantung", () => {
    expect(rBagD).toMatch(/ mati +\| 5\n\(1 row\)/);
    expect(rBagD).toMatch(/ gagal\n\(1 row\)/);
    expect(rBagD).toContain("# mode setengah di setiap percobaan: objek dibuat di vendor, jawaban terpotong. Lima percobaan, backoff 1 ms:");
    expect(lBagA).toContain("503 untuk semua permintaan");
    expect(lBagA).not.toMatch(/menggantung/);
    expect(naskah).toContain("Layanan verifikasi tiruan tidak menjawab selama 3 jam 30 menit (Ilustrasi)");
    harus("Di cerita layanan tidak menjawab, jadi tiap percobaan menunggu sampai timeout. Rekaman memakai 503 supaya cepat. Akhirnya sama bila jawabannya terpotong lima kali: pekerjaan berstatus `mati` dan pengajuan `gagal` (`retry.txt` bagian D).");
  });
  test("pengajuan gagal boleh diajukan lagi: indeks unik sebagian hanya untuk diajukan dan tidak_pasti (migration 000022), gagal tidak termasuk", () => {
    expect(migrasi).toContain("CREATE UNIQUE INDEX verifikasi_satu_berjalan ON verifikasi (akun_id, subjek) WHERE status IN ('diajukan', 'tidak_pasti');");
    expect(migrasi).not.toMatch(/verifikasi_satu_berjalan[^;]*'gagal'/);
    harus("Pendaftar yang gagal boleh mengajukan lagi, karena indeks `verifikasi_satu_berjalan` hanya menghitung status `diajukan` dan `tidak_pasti` (Tidak dijalankan: dibaca dari SQL migration).");
  });
});

describe("rekaman lajur.txt, worker.txt, retry.txt: bagian dan rentang Snippet", () => {
  test("enam Snippet: tujuh rentang dari struktur rekaman dan kode, bukan angka tangan; judul memuat berkas dan bagian; bahasa go hanya untuk .go", () => {
    expect(tag).toHaveLength(6);
    expect(berkasSnippet).toEqual([
      "labs/api-t4/internal/worker/verifikasi.go", "labs/t4-integrasi/output/lajur.txt", "labs/t4-integrasi/output/lajur.txt",
      "labs/t4-integrasi/output/worker.txt", undefined, "labs/t4-integrasi/output/retry.txt",
    ]);
    expect(lines).toEqual([`${kvAwal}:${kvAkhir}`, `${lA + 1}:${lMati}`, `${lPulih}:${lAkhirA}`, `${wA}:${wUjungA}`, undefined, `${rC + 1}:${rUjungC}`]);
    expect(tag[4]).toContain(`files={["labs/api-t4/internal/worker/worker.go:${kwBawaanAwal}:${kwBawaanAkhir}", "labs/api-t4/internal/worker/worker.go:${kwBackoffAwal}:${kwBackoffAkhir}"]}`);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/internal/worker/verifikasi.go baris ${kvAwal} sampai ${kvAkhir} (tundaVerifikasi)`,
      "Rekaman lab: labs/t4-integrasi/output/lajur.txt, bagian A (layanan mati, sepuluh pendaftar)",
      "Rekaman lab: labs/t4-integrasi/output/lajur.txt, bagian A (layanan pulih, worker dijalankan lagi)",
      "Rekaman lab: labs/t4-integrasi/output/worker.txt, bagian A (empat slot, tiga detik)",
      "Kode lab: labs/api-t4/internal/worker/worker.go (konstanta bawaan dan fungsi Backoff)",
      "Rekaman lab: labs/t4-integrasi/output/retry.txt, bagian C (layanan gagal sekali, lalu pulih)",
    ]);
    for (const t of tag) {
      const f = t.match(/file="([^"]+)"/)?.[1] ?? "labs/api-t4/internal/worker/worker.go";
      const l = t.match(/lang="([^"]+)"/)?.[1];
      if (f.endsWith(".go")) expect(l, f).toBe("go");
      else expect(l, f).toBeUndefined();
    }
    expect(lA).toBe(5);
    expect(L.baris[lA]).toContain("mode mati");
    expect(L.baris[lMati - 1]).toContain("50 permintaan masuk");
    expect(L.baris[lAkhirA - 1]).toBe("(1 row)");
    expect(W.baris[wUjungA - 1]).toContain("t terukur: tiap percobaan yang menggantung ditahan antara 2,9 dan 3,6 detik");
    expect(R.baris[rUjungC - 1]).toContain("1 objek dibuat");
  });
  test("worker.txt bagian A: satu worker untuk semua lajur, 4 permintaan bersamaan (c), 2,9 sampai 3,6 detik (t), batas bawah 2,0 detik, kelas 0 sebelum kelas 1", () => {
    expect(wBagA).toContain("# --- A. Satu worker untuk semua lajur, tanpa breaker; vendor menggantung");
    expect(wBagA).toContain("$ ./api-t4 -peran worker -serentak 4 -backoff 1ms -selang 50ms");
    expect(wBagA).toContain("# 8 pekerjaan verifikasi (kelas 1) menunggu di outbox; vendor menggantung; batas waktu client 3 detik (bawaan ADR 22)");
    expect(wBagA).toContain("(notifikasi uang, kelas 0, urutan lebih depan)");
    expect(wBagA).toContain("menunggu paling sedikit 2,0 detik (batas bawah diperiksa; nilainya tidak direkam)");
    expect(wBagA).toContain("# Urutan menurut kelas hanya mengatur siapa diklaim lebih dulu; percobaan yang sudah berjalan menahan slotnya sampai timeout.");
    expect(wBagA).toContain("# c terukur: permintaan bersamaan paling banyak yang sampai di vendor = 4");
    expect(wBagA).toContain("antara 2,9 dan 3,6 detik sampai client menyerah (batas diperiksa; batas waktu client 3 detik)");
    expect(SERENTAK).toBe(4);
    expect(TIMEOUT).toBe(3);
    harus("Rekaman `worker.txt` bagian A mengukur dua hal. Paling banyak 4 permintaan bersamaan sampai di layanan. Tiap percobaan yang menggantung ditahan antara 2,9 dan 3,6 detik sampai client menyerah (batas waktu client 3 detik):");
    harus("Kelas pekerjaan di `outbox` hanya mengatur urutan klaim: pemberitahuan uang (kelas 0) diklaim sebelum verifikasi (kelas 1). Kelas tidak membebaskan slot yang sudah dipegang.");
    harus("Empat pemberitahuan uang lalu menunggu paling sedikit 2,0 detik (batas bawah yang diperiksa lab; nilainya tidak direkam).");
    expect(readme).toContain("2. **Kelas antrean tidak membebaskan slot.**");
  });
  test("worker.txt bagian C: hitungan lab 1,74 dan 1,74 + 2,26 = 4,0 dari 4 sama dengan halaman; hanya c dan t terukur", () => {
    expect(wBagC).toContain("verifikasi: 0,116 per detik x 5 percobaan x 3 detik = 1,74 slot worker dari 4");
    expect(wBagC).toContain("notifikasi uang: 7,52 per detik x 0,3 detik = 2,26 slot");
    expect(wBagC).toContain("bersama: 1,74 + 2,26 = 4,0 dari 4 slot");
    expect(wBagC).toContain("c = 4 dan t = 3 detik terukur di bagian A");
    expect(wBagC).toContain("adalah Asumsi naskah");
    expect(readme).toContain("Hitungan naskah 0,116 × 5 × 3 = 1,74 dan 1,74 + 2,26 = 4,0 dari 4 slot terulang (`worker.txt` bagian C). Hanya c = 4 dan batas waktu client 3 detik yang terukur; 0,116, 7,52, dan 0,3 detik adalah Asumsi naskah.");
  });
  test("retry.txt bagian C (varian): layanan menggantung, batas waktu client 300 ms, tidak_pasti dan menunggu 1, lalu lulus dengan 2 permintaan dan 1 objek; bagian D: lima timeout berakhir gagal", () => {
    expect(rBagC).toContain("# --- C. Timeout (vendor menggantung, batas waktu client 300 ms) menghasilkan tidak_pasti");
    expect(rBagC).toMatch(/ tidak_pasti\n\(1 row\)/);
    expect(rBagC).toMatch(/ menunggu \| 1\n\(1 row\)/);
    expect(rBagC).toContain("# Vendor pulih: pengajuan yang sama lulus.");
    expect(rBagC).toMatch(/ lulus\n\(1 row\)/);
    expect(rBagC).toContain("# sesudah pulih: 2 permintaan masuk, 1 objek dibuat (kunci berbeda = objek berbeda)");
    expect(runInt).toContain('batas = [*PERCOBAAN_SATU, "-verifikasi-timeout", "300ms", "-serentak", "1"]');
    expect(runInt).toContain('d.tiruan_mode(PORT_VERIFIKASI, "menggantung")');
    expect(rBagD).toContain("tidak_pasti' bertahan selama masih ada percobaan; percobaan kelima yang timeout menimpanya.");
    harus("Bila layanan hanya gagal sekali lalu pulih, pengajuan itu lulus dengan dua permintaan dan satu objek.");
    harus("Rekaman itu memakai layanan yang menggantung dan batas waktu client 300 ms, bukan 503.");
  });
});

describe("kode lab dan hitungan: konstanta worker, umur satu pekerjaan, slot", () => {
  test("tundaVerifikasi: percobaan habis membuat baris mati dan pengajuan gagal; jawaban galat dan timeout sama-sama berakhir di tundaVerifikasi (Snippet 93:102)", () => {
    expect(kodeTunda).toContain("hasil := w.tunda(ctx, n)");
    expect(kodeTunda).toContain('if hasil == "mati" && verifikasiID != 0 {');
    expect(kodeTunda).toContain('w.repo.TandaiVerifikasi(ctx, verifikasiID, "gagal", w.kini())');
    expect(kodeKirim).toMatch(/case errors\.Is\(err, verifikasi\.ErrTidakPasti\):[\s\S]*?return w\.tundaVerifikasi\(ctx, n, v\.ID\)/);
    expect(kodeKirim).toMatch(/default:\s*log\.Printf\([^\n]*\)\s*return w\.tundaVerifikasi\(ctx, n, v\.ID\)/);
    expect(kodeTundaWorker).toContain("mati := n.Percobaan >= w.cfg.MaksPercobaan");
    expect(kodeTundaWorker).toContain("Backoff(n.Percobaan, w.cfg.DasarBackoff, w.cfg.MaksBackoff, w.acak())");
    harus("Tanpa penjaga lain, jawaban galat dari layanan menaikkan hitungan percobaan pekerjaan itu, baik 503 maupun timeout.");
    expect(rBagD).toContain("# mode setengah di setiap percobaan");
    harus("Percobaan kelima yang gagal memindahkan pekerjaan ke dead-letter dan menandai pengajuan `gagal`:");
  });
  test("konstanta worker dibaca dari Bawaan(): empat serentak, lima percobaan, dasar 2 detik, batas 60 detik, selang 0,2 detik; Backoff menggandakan dan membatasi, jitter penuh", () => {
    expect([SERENTAK, MAKS_PERCOBAAN, DASAR, MAKS_BACKOFF, SELANG]).toEqual([4, 5, 2, 60, 0.2]);
    expect(kodeBackoff).toContain("batas *= 2");
    expect(kodeBackoff).toContain("batas = min(batas, maks)");
    expect(kodeBackoff).toContain("return time.Duration(acak * float64(batas))");
    expect(kodeBackoff).toContain("(full jitter)");
    expect(JEDA).toEqual([2, 4, 8, 16]);
    harus("Jeda sesudah percobaan ke-1 sampai ke-4 paling lama 2, 4, 8, dan 16 detik, dan batas 60 detik tidak tercapai. Percobaan kelima tidak menunggu lagi.");
    expect(Math.max(...JEDA)).toBeLessThan(MAKS_BACKOFF);
    harus("Konstanta worker di lab menjawabnya: lima percobaan, backoff dasar 2 detik yang dua kali lipat tiap percobaan, dan batas 60 detik.");
    expect(readme).toContain("Backoff produksi** (2 detik sampai 60 detik dengan jitter)");
  });
  test("umur satu pekerjaan: 5 × 3 + 2 + 4 + 8 + 16 = 45 detik dari konstanta dan timeout (ADR 22), dan 12.600 ÷ 45 = 280", () => {
    expect(UMUR).toBe(45);
    expect(DETIK_GANGGUAN / UMUR).toBe(280);
    harus("Gangguan 12.600 detik adalah 12.600 ÷ 45 = 280 kali umur satu pekerjaan (Hitungan).");
    expect(hal38).toContain("### ADR 22: panggilan keluar di luar transaction, timeout 3 detik, pool tetap 10");
    harus("| Umur satu pekerjaan | 5 × 3 + 2 + 4 + 8 + 16 | paling lama 45 detik |");
    expect(hal313).toContain("Layanan push yang mati lebih lama dari 45 detik memasukkan baris yang masuk di awal gangguan ke dead-letter.");
  });
  test("tabel Hitungan dihitung ulang: tiap rumus dievaluasi dari angka yang tertulis, hasilnya sama dengan sel Hasil (dibulatkan seperti ditulis)", () => {
    const sel = [...badan.matchAll(/^\| ([^|\n]+) \| ([^|\n]+) \| ([^|\n]+) \|$/gm)].map((m) => [m[1]!.trim(), m[2]!.trim(), m[3]!.trim()] as const).filter((r) => r[0] !== "Besaran" && !/^-+$/.test(r[0]));
    expect(sel.map((r) => r[0])).toEqual([
      "Laju rata-rata", "Pendaftar dalam 12.600 detik", "Umur satu pekerjaan", "Slot terpakai, laju rata-rata", "Laju puncak",
      "Slot terpakai, puncak", "Slot pemberitahuan uang, puncak", "Keduanya bersama",
    ]);
    const nilai = (rumus: string): number => {
      const e = rumus.replace(/\d{1,3}(?:\.\d{3})+/g, (m) => m.replace(/\./g, "")).replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/");
      expect(e, rumus).toMatch(/^[\d.\s*/+()-]+$/);
      return Function(`"use strict"; return (${e})`)() as number;
    };
    for (const [nama, rumus, hasil] of sel) {
      const m = cocok(hasil, /(\d[\d.]*(?:,\d+)?)/);
      const tertulis = angka(m[1]!);
      const desimal = (m[1]!.split(",")[1] ?? "").length;
      expect(Math.abs(nilai(rumus) - tertulis), `${nama}: ${rumus} = ${nilai(rumus)}, tertulis ${hasil}`).toBeLessThanOrEqual(0.5 * 10 ** -desimal + 1e-9);
    }
    const [r1, r2, r3, r4, r5, r6, r7, r8] = sel;
    expect(r1![1]).toBe(`${PER_HARI.toLocaleString("id-ID")} ÷ 86.400`);
    expect(r2![1]).toBe(`0,0116 × ${DETIK_GANGGUAN.toLocaleString("id-ID")}`);
    expect(r3![1]).toBe(`${MAKS_PERCOBAAN} × ${TIMEOUT} + ${JEDA.join(" + ")}`);
    expect(r4![1]).toBe(`0,0116 × ${MAKS_PERCOBAAN} × ${TIMEOUT}`);
    expect(r5![1]).toBe(`0,0116 × ${PUNCAK}`);
    expect(r6![1]).toBe(`0,116 × ${MAKS_PERCOBAAN} × ${TIMEOUT}`);
    expect(r7![1]).toBe("7,52 × 0,3");
    expect(r8![1]).toBe("1,74 + 2,26");
    for (const r of [r4, r6, r7, r8]) expect(r![2]).toContain(`dari ${SERENTAK}`);
    expect(r8![2]).toBe("4,00 dari 4");
    harus("Hasil 4,00 adalah 3,99 tanpa pembulatan.");
    // 3,99 tanpa pembulatan: 1,736 + 2,257
    const tanpa = (PER_HARI / 86400) * PUNCAK * MAKS_PERCOBAAN * TIMEOUT + ((60000 + 5000) / 86400) * PUNCAK * T_NOTIF;
    expect(tanpa.toFixed(2)).toBe("3.99");
    expect(NOTIF).toBe(7.52);
    expect(T_NOTIF).toBe(0.3);
    expect(((60000 + 5000) / 86400 * PUNCAK).toFixed(2)).toBe("7.52");
    expect(PUNCAK).toBe(10);
  });
  test("label tabel dan klaim 'semua baris Hitungan atas Asumsi': rekaman hanya mengukur 4 slot dan timeout 3 detik; masukan lain Asumsi (naskah dan konstanta lab)", () => {
    harus("Semua baris tabel adalah Hitungan atas Asumsi. Rekaman mengukur dua masukannya, yaitu 4 slot dan timeout 3 detik. Hasil 4,00 adalah 3,99 tanpa pembulatan.");
    harus("Masukan lain adalah Asumsi: 1.000 pendaftar per hari, faktor puncak 10, dan konstanta worker di lab. Dua lagi dari pemberitahuan uang: 7,52 per detik pada puncak, dan 0,3 detik tiap pengiriman.");
    expect(workerGo).toContain("Asumsi lab, belum di naskah: klaim 5 detik");
    expect(wBagC).toContain("# 0,116 verifikasi per detik (naskah: 1.000 pendaftar per hari x puncak 10), 7,52 notifikasi uang per detik, dan 0,3 detik per notifikasi adalah Asumsi naskah;");
    harus("Premisnya: tiap percobaan menunggu sampai timeout.");
    expect(naskah).toContain("0,116 × 15 = 1,74 dari 4 worker");
  });
  test("laju rata-rata 0,174 slot dan 'dalam kurang dari satu menit': 45 detik kurang dari 60; penalaran slot habis berlabel Tidak dijalankan, penalaran", () => {
    expect(0.0116 * MAKS_PERCOBAAN * TIMEOUT).toBeCloseTo(0.174, 3);
    expect(UMUR).toBeLessThan(60);
    harus('Jadi layar "Sedang diverifikasi" berganti menjadi "Verifikasi gagal" dalam kurang dari satu menit bila slot bebas. Bila slot habis, layar itu bertahan lebih lama (Tidak dijalankan, penalaran: kesimpulan dari hitungan di atas, tanpa rekaman sendiri).');
    harus("Pada laju rata-rata worker hampir tidak terasa, 0,174 dari 4 slot. Yang terasa di laju itu adalah 146 pendaftar yang gagal.");
    expect(wBagC).toContain("tidak ada sisa kapasitas untuk menguras antrean yang sudah menumpuk");
  });
});

describe("sumber luar: baris riset, tanggal akses, tautan, dan kutipan", () => {
  test("lima baris riset ada, urut ID tanpa ganda; tanggal akses sama dengan tanggal di halaman", () => {
    const semua = riset.split("\n").filter((b) => b.startsWith("| R4-")).map((b) => b.split(" |")[0]!.replace("| ", ""));
    expect(new Set(semua).size).toBe(semua.length);
    const nomor = (s: string) => Number(s.slice(3));
    expect(semua.map(nomor)).toEqual([...semua.map(nomor)].sort((a, b) => a - b));
    for (const id of IDS) expect(semua).toContain(id);
    const tgl = [...new Set([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]!))];
    expect(tgl).toEqual(["2026-10-29"]);
    for (const id of ["R4-155", "R4-156", "R4-157"]) expect(barisRiset(id), id).toContain(`dibuka ${tgl[0]}`);
    expect(new Date(tgl[0]!).getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  });
  test("tiga tautan eksternal sama dengan URL di baris riset; tiap tautan berteks deskriptif", () => {
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    expect(tautan).toEqual([
      ["Amazon SQS: dead-letter queues", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html"],
      ["PostgreSQL 17, bagian 11.8", "https://www.postgresql.org/docs/17/indexes-partial.html"],
      ["Retry pattern, Azure Architecture Center", "https://learn.microsoft.com/en-us/azure/architecture/patterns/retry"],
    ]);
    expect(barisRiset("R4-155")).toContain("docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html");
    expect(barisRiset("R4-156")).toContain("postgresql.org/docs/17/indexes-partial.html");
    expect(barisRiset("R4-157")).toContain("learn.microsoft.com/en-us/azure/architecture/patterns/retry");
    expect(badan.match(/https?:\/\//g)).toHaveLength(3);
  });
  test("R4-155 (SQS): kutipan yang menopang kalimat halaman; kalimat halaman tidak lebih kuat dari sumber", () => {
    const a = barisRiset("R4-155");
    expect(a).toContain("Move messages out of the dead-letter queue using dead-letter queue redrive");
    expect(a).toContain("isolate unconsumed messages to determine why processing did not succeed");
    expect(a).toContain("Halaman tidak menyebut vendor yang mati");
    harus("Dokumentasi Amazon SQS menyebut dead-letter queue redrive untuk memindahkan pesan keluar dari dead-letter queue (");
    expect(badan).not.toMatch(/SQS (memastikan|menjamin|selalu)/);
  });
  test("R4-156 (PostgreSQL 17 bagian 11.8): indeks unik sebagian menegakkan keunikan hanya di baris yang memenuhi predikat", () => {
    const b = barisRiset("R4-156");
    expect(b).toContain("This enforces uniqueness among the rows that satisfy the index predicate, without constraining those that do not.");
    expect(b).toContain("000022_verifikasi_qr.up.sql");
    harus("Indeks unik sebagian menegakkan keunikan hanya di baris yang memenuhi predikatnya (");
  });
  test("R4-157 (Azure Retry pattern): retry untuk gangguan sementara; tidak berguna bila gangguan kemungkinan lama; tanggal ms.date", () => {
    const c = barisRiset("R4-157");
    expect(c).toContain("ms.date 2024-07-18");
    expect(c).toContain("When a fault is likely to be long lasting");
    expect(c).toContain("The application might be wasting time and resources trying to repeat a request that's likely to fail.");
    expect(c).toContain("typically self-correcting");
    harus("Pola retry ditujukan bagi gangguan sementara. Dokumentasi pola itu menulis bahwa retry tidak berguna bila gangguan kemungkinan lama.");
    harus("diperbarui 2024-07-18, dibuka 2026-10-29, Tidak dijalankan)");
    expect(badan).not.toMatch(/menjamin|pasti berguna/);
  });
  test("R4-158 (Hitungan) dan R4-159 (selisih lab dan naskah): angka di baris riset sama dengan hitungan halaman dan README lab", () => {
    const d = barisRiset("R4-158"), e = barisRiset("R4-159");
    for (const s of ["146,16", "145,83", "86,2 detik", "45 detik", "0,174", "1,74", "2,26", "4,00", "3,99", "280", "7,523"]) expect(d, s).toContain(s);
    expect(d).toContain("Serentak 4, MaksPercobaan 5, DasarBackoff 2 detik, MaksBackoff 60 detik, Selang 200 ms");
    expect(1 / 0.0116).toBeCloseTo(86.2, 1);
    expect(e).toContain("PostgreSQL 17.11, go1.27.1");
    expect(e).toContain('Naskah M31 menulis "Sedang diverifikasi yang tidak berubah", padahal batas atas umur pekerjaan 45 detik');
    expect(lajur).toContain("PostgreSQL 17.11");
    expect(lajur).toContain("go1.27.1");
    expect(readme).toContain("1. **Ambang breaker lebih tinggi daripada batas percobaan.**");
    expect(readme).toContain("3. **`tidak_pasti` tidak bertahan sampai dead-letter.**");
  });
  test("baris riset dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil (halaman, diagram, skenario, kartu); tanpa emoji; satuan byte tidak disingkat B", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m31");
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/\d+ ?B\b/);
  });
  test("label sumber: arti empat label ditaut ke A0 di Gejala; Hitungan dan penalaran didefinisikan di pemakaian pertama; label turunan berdampingan dengan label sumber; jumlah label", () => {
    harus("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].");
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Itu Hitungan atas Asumsi: hasil rumus dari angka yang tertulis di halaman ini") + "Itu ".length);
    expect(badan.indexOf("penalaran")).toBe(badan.indexOf("(Tidak dijalankan, penalaran: ") + "(Tidak dijalankan, ".length);
    expect(badan.match(/penalaran/g)).toHaveLength(1);
    for (const m of badan.matchAll(/\(Tidak dijalankan: dibaca dari [^)]*\)/g)) expect(m[0]).toMatch(/^\(Tidak dijalankan: dibaca dari (kode|SQL migration)\)$/);
    expect(badan.match(/\(Tidak dijalankan: dibaca dari (?:kode|SQL migration)\)/g)).toHaveLength(2);
    expect(badan).not.toMatch(/\(dibaca dari|\(penalaran/);
    expect(badan.match(/Hitungan/g)!.length).toBe(badan.match(/Hitungan atas Asumsi|\(Hitungan\)|Itu Hitungan|Hitungan di tabel/g)!.length + 0);
    expect(badan.match(/\(Hitungan\)/g)).toHaveLength(1);
    expect(badan.match(/Hitungan atas Asumsi/g)).toHaveLength(4);
    expect(badan.match(/Tidak dijalankan/g)).toHaveLength(7);
    expect(badan.match(/Asumsi/g)!.length).toBeGreaterThanOrEqual(8);
    expect(badan.match(/\(Ilustrasi\)/g)).toHaveLength(1);
    expect(badan.match(/\*Angka cerita \(Ilustrasi\):\*/g)).toHaveLength(1);
    expect(badan.match(/Rekaman lab/g)!.length).toBeGreaterThanOrEqual(5);
    expect(badan).not.toMatch(/Rekaman lab[^.]*Hitungan|Hitungan[^.]*Rekaman lab\)/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: layanan mati dari awal (10 pekerjaan, 50 permintaan, 10 dead-letter, diklaim 0) dan layanan gagal sekali lalu pulih (timeout, pulih, lulus satu objek)", () => {
    expect(diagram.id).toBe("t4-m31-vendor-mati");
    expect(diagram.judul).toBe("Layanan verifikasi mati: pekerjaan habis sebelum layanan pulih");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-integrasi · lajur.txt bagian A dan retry.txt bagian C" });
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([
      ["Layanan mati dari awal", "10 pendaftar, lima percobaan tiap pekerjaan", 4],
      ["Layanan gagal sekali, lalu pulih", "satu pendaftar, batas waktu 300 ms", 3],
    ]);
    const [a, b] = diagram.baris;
    expect(a!.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      ["10 pekerjaan menunggu", "percobaan 0", "biasa"], ["50 permintaan, 0 objek", "layanan menjawab 503", "warn"],
      ["10 dead-letter, 10 gagal", "percobaan 5 tiap pekerjaan", "warn"], ["Layanan pulih, diklaim 0", "10 akun tetap belum", "warn"],
    ]);
    expect(b!.simpul.map((s) => [s.teks, s.sub, s.nada])).toEqual([
      ["Percobaan 1 timeout", "pengajuan tidak_pasti", "biasa"], ["Layanan pulih", "pekerjaan menunggu, percobaan 1", "biasa"], ["Lulus, satu objek", "2 permintaan masuk", "good"],
    ]);
    expect(lBagA).toMatch(/ menunggu \| 0 +\| 10\n/);
    expect(lBagA).toContain("50 permintaan masuk, 0 objek dibuat");
    expect(lBagA).toContain("diklaim 0");
    expect(lBagA).toMatch(/ belum +\| 10\n/);
    expect(rBagC).toContain("2 permintaan masuk, 1 objek dibuat");
    expect(rBagC).toContain("batas waktu client 300 ms");
    expect(diagram.catatan).toBe("Dua run terpisah. Baris kedua memakai layanan yang menggantung, bukan menjawab 503, dan pulih sesudah percobaan pertama.");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai biasa di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(badan).toContain("<Rantai data={vendorMati} />");
    expect(badan).toContain('import vendorMati from "../../../../data/diagram/t4-m31-vendor-mati.json";');
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.indexOf("<Rantai")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
  });
});

describe("skenario alur t4-m31.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  const lajurUtuh = lajur, retryUtuh = retry;
  test("valid menurut alur-core dengan rekaman yang ada; empat komponen, satu perangkat; sumber lajur.txt dan retry.txt; delapan langkah dan lima langkah varian", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-integrasi/output/lajur.txt", fileVarian: "labs/t4-integrasi/output/retry.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["api", "api-t4"], ["db", "PostgreSQL"], ["worker", "Worker"], ["vendor", "Layanan verifikasi (tiruan)"]]);
    expect(skenario.perangkat).toEqual([{ id: "pendaftar", label: "HP pendaftar" }]);
    expect(skenario.langkah).toHaveLength(8);
    expect(skenario.varian.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("layanan gagal sekali, lalu pulih sebelum percobaan habis");
    harus("**Ubah satu hal: layanan gagal sekali, lalu pulih sebelum percobaan habis**");
    harus("Widget ini mengikuti rekaman `lajur.txt` bagian A: sepuluh pendaftar, layanan verifikasi tiruan yang mati, dan satu worker dengan lima percobaan.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m31.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-integrasi run BAGIAN=lajur");
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-integrasi run BAGIAN=retry");
    expect(readme).toContain("make -C labs/t4-integrasi run BAGIAN=lajur        # satu bagian: lajur retry worker breaker testing");
    expect(skenario.sumber.catatan).toContain("Tulisan di layar HP adalah Ilustrasi dari naskah: lab tidak punya app Flutter dan tidak merekam layar.");
  });
  test("tebakan: empat pilihan, jawaban benar (nol, semua habis percobaan) tidak di posisi pertama atau keempat dan tidak yang terpanjang; stem tidak membantah pilihan; penjelasan dari rekaman", () => {
    const o = skenario.predict.options;
    expect(o).toHaveLength(4);
    expect(skenario.predict.answer).toBe(1);
    expect(skenario.predict.varian).toBe(false);
    expect(o[skenario.predict.answer]).toBe("Nol: semua pekerjaan sudah habis lima percobaan sebelum layanan pulih");
    expect([0, 3]).not.toContain(skenario.predict.answer);
    const panjang = o.map((x) => x.length);
    expect(Math.max(...panjang)).not.toBe(panjang[skenario.predict.answer]);
    expect(Math.min(...panjang)).not.toBe(panjang[skenario.predict.answer]);
    expect(o.filter((_, i) => i !== skenario.predict.answer)).toEqual([
      "Sepuluh: pekerjaan menunggu sampai layanan pulih, lalu semuanya diproses",
      "Lima: separuh pekerjaan habis percobaan, separuh sisanya masih menunggu",
      "Satu: hanya pekerjaan terakhir yang masih punya percobaan",
    ]);
    expect(skenario.predict.q).toBe("Layanan verifikasi mati dan sepuluh pendaftar sudah mengajukan. Satu worker mengerjakan pekerjaannya satu per satu, dengan batas lima percobaan dan tanpa menunggu jeda. Layanan baru pulih sesudah itu, lalu worker dijalankan lagi. Berapa pendaftar yang lulus?");
    expect(skenario.predict.explain).toBe("Rekaman lajur.txt bagian A: 10 pekerjaan berstatus mati dengan 5 percobaan, 10 pengajuan berstatus gagal, dan layanan menerima 50 permintaan tanpa membuat objek. Sesudah layanan pulih, worker mengklaim 0 pekerjaan dan 10 akun tetap belum terverifikasi.");
    expect(lBagA).not.toMatch(/ lulus /);
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
  });
  test("baris perintah dan keluaran di kirim yang bukan ringkasan (tanda panah) ada utuh di lajur.txt (jalur utama) atau retry.txt (varian)", () => {
    for (const l of skenario.langkah) for (const b of l.kirim.split("\n")) if (!b.startsWith("→")) expect(lajurUtuh.includes(b), `kirim tidak ada di lajur.txt: ${b}`).toBe(true);
    for (const l of skenario.varian.langkah) for (const b of l.kirim.split("\n")) if (!b.startsWith("→")) expect(retryUtuh.includes(b), `kirim tidak ada di retry.txt: ${b}`).toBe(true);
    // baris rekaman yang dikutip berasal dari bagian yang benar: jalur utama dari bagian A, varian dari bagian C
    for (const l of skenario.langkah) for (const b of l.kirim.split("\n")) if (!b.startsWith("→")) expect(lBagA.includes(b), `bukan bagian A: ${b}`).toBe(true);
    for (const l of skenario.varian.langkah) for (const b of l.kirim.split("\n")) if (!b.startsWith("→")) expect(rBagC.includes(b), `bukan bagian C: ${b}`).toBe(true);
  });
  test("baris ringkasan tanda panah sesuai rekaman: lima percobaan, 503, sepuluh pengajuan gagal, layanan pulih, percobaan berikutnya berkunci sama", () => {
    const panah = [...skenario.langkah, ...skenario.varian.langkah].flatMap((l) => l.kirim.split("\n").filter((b) => b.startsWith("→")));
    expect(panah).toEqual([
      "→ worker: kapasitas 1, lima percobaan, jeda antar percobaan tidak ditunggu",
      "→ tiap pekerjaan: percobaan 1 sampai 5, dijawab 503",
      "→ verifikasi: gagal, 10 pengajuan",
      "→ layanan menjawab normal lagi",
      "→ percobaan berikutnya memakai Idempotency-Key yang sama, dan dijawab sukses",
    ]);
    expect(lBagA).toContain("# worker: kapasitas 1, lima percobaan, tanpa backoff");
    expect(lBagA).toContain("mode mati (503 untuk semua permintaan)");
    expect(lBagA).toMatch(/ gagal +\| 10\n/);
    expect(retry).toContain("# --- A. Retry dengan Idempotency-Key = id pengajuan");
    expect(retry).toContain("retry berkunci: 2 permintaan masuk, 1 objek dibuat");
  });
  test("layar HP pendaftar: awal 'Kirim foto…', 'Sedang diverifikasi' sesudah mengajukan, 'Verifikasi gagal' (warn) sesudah dead-letter dan di akhir; varian lulus; tulisan layar dari naskah (Ilustrasi)", () => {
    const teks = (l: Langkah) => l.layar?.pendaftar?.isi?.map((x) => x.teks);
    expect(skenario.layarAwal.pendaftar!.isi!.map((x) => x.teks)).toEqual(["Kirim foto kartu identitas dan swafoto", "Kirim"]);
    expect(skenario.langkah.map(teks)).toEqual([undefined, ["Sedang diverifikasi"], undefined, undefined, ["Verifikasi gagal"], undefined, undefined, ["Verifikasi gagal"]]);
    expect(skenario.langkah.map((l) => l.layar?.pendaftar?.nada)).toEqual([undefined, undefined, undefined, undefined, "warn", undefined, undefined, "warn"]);
    expect(skenario.varian.langkah.map(teks)).toEqual([undefined, undefined, undefined, undefined, ["Identitas terverifikasi"]]);
    expect(naskah).toContain('"Sedang diverifikasi"');
    expect(naskah).toContain('"Verifikasi gagal"');
    const sinyal = [...skenarioMentah.matchAll(/"sinyal": ?(\d+)/g)].map((m) => m[1]);
    expect(new Set(sinyal)).toEqual(new Set(["3"]));
    // jam di layar HP adalah pilihan penulis (Ilustrasi): layar awal, 'Sedang diverifikasi', 'Verifikasi gagal' kurang dari satu menit
    // kemudian (umur satu pekerjaan paling lama 45 detik), layar sesudah layanan pulih, dan layar akhir varian
    const waktu = [...skenarioMentah.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]!);
    expect(waktu).toEqual(["09.12", "09.12", "09.13", "12.45", "09.12"]);
    expect(jam(waktu[2]!) - jam(waktu[1]!)).toBeLessThanOrEqual(60);
    expect(UMUR).toBeLessThan(60);
    expect(jam(waktu[0]!)).toBeGreaterThanOrEqual(jam(JAM_MULAI));
    expect(jam(waktu[3]!)).toBeGreaterThan(jam(JAM_CEK));
    expect(skenario.sumber.catatan).toContain("Jam di layar HP adalah pilihan penulis.");
  });
  test("arah, nada, dan judul tiap langkah mengikuti isi kirim; jelas tidak bertentangan dengan rekaman", () => {
    const arah = (l: Langkah): string => `${l.dari}>${l.ke ?? ""}`;
    expect(skenario.langkah.map(arah)).toEqual(["vendor>", "api>db", "worker>vendor", "vendor>", "worker>db", "vendor>", "worker>db", "db>"]);
    expect(skenario.varian.langkah.map(arah)).toEqual(["worker>vendor", "worker>db", "vendor>", "worker>vendor", "worker>db"]);
    expect(skenario.langkah.map((l) => l.nada)).toEqual(["warn", undefined, undefined, "warn", "warn", undefined, "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual([undefined, "warn", undefined, undefined, "good"]);
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Layanan verifikasi tiruan mati", "Sepuluh pendaftar mengajukan verifikasi", "Worker memanggil layanan, dan layanan menjawab 503",
      "Layanan menerima 50 permintaan dan tidak membuat objek", "Tiap pekerjaan habis lima percobaan dan masuk dead-letter", "Layanan pulih",
      "Worker berjalan lagi dan tidak mengklaim apa pun", "Sepuluh akun tetap belum terverifikasi",
    ]);
    expect(skenario.varian.langkah.map((l) => l.judul)).toEqual([
      "Layanan menggantung, client menyerah sesudah 300 ms", "Pengajuan tidak_pasti, pekerjaan menunggu", "Layanan pulih",
      "Worker mencoba lagi dengan kunci yang sama", "Pengajuan lulus, satu objek",
    ]);
    expect(skenario.langkah[0]!.jelas).toContain("Semua permintaan ke layanan dijawab 503.");
    expect(lBagA).toContain("503 untuk semua permintaan");
    expect(skenario.langkah[6]!.jelas).toBe("Baris berstatus mati tidak diklaim lagi: worker mengklaim 0 pekerjaan.");
    expect(skenario.varian.langkah[1]!.jelas).toContain("empat percobaan tersisa");
    expect(MAKS_PERCOBAAN - 1).toBe(4);
    expect(skenario.varian.langkah[0]!.jelas).toContain("batas bawaan server 3 detik");
    expect(TIMEOUT).toBe(3);
  });
  test("jalur varian tidak membuka jawaban jalur utama: tidak menyebut dead-letter, mati, atau gagal sebagai hasil, dan jalur utama tidak menyebut lulus", () => {
    const v = JSON.stringify(skenario.varian.langkah);
    expect(v).not.toMatch(/dead-letter|\bmati\b|gagal sekali|Verifikasi gagal/);
    expect(JSON.stringify(skenario.langkah)).not.toMatch(/\blulus\b/);
  });
  test("skenario dikunci dengan sidik jari (setiap nilai string)", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
  test("tanpa JavaScript: noscript memuat hasil jalur utama dan varian dengan angka yang sama dengan rekaman; rekaman varian di lipatan", () => {
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain("sepuluh pekerjaan berstatus mati dengan 5 percobaan, dan sepuluh pengajuan berstatus gagal.");
    expect(ns).toContain("Layanan menerima 50 permintaan tanpa membuat objek, dan sesudah layanan pulih worker mengklaim 0 pekerjaan.");
    expect(ns).toContain("Bila layanan hanya gagal sekali lalu pulih, pengajuan itu lulus dengan dua permintaan dan satu objek.");
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("<WidgetLama"));
    expect(badan).toContain("<summary>Rekaman bagian C retry.txt (varian, juga untuk pembaca tanpa JavaScript)</summary>");
    expect(badan.match(/<details>\n<summary>Rekaman bagian C/g)).toHaveLength(1);
  });
});

describe("kartu Cek diri: tiga kartu, sama dengan kartu.json", () => {
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya; id, judul, url", () => {
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(3);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(3);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m31");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m31-1", "t4-m31-2", "t4-m31-3"]);
    expect(kartu.every((k) => k.judul === '4.10 M31: 146 pendaftar tertahan "Sedang diverifikasi"' && k.url === "tahap-4/m31-verifikasi-tertahan/")).toBe(true);
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    expect(kartu.map((k) => k.jawab)).toEqual(jawaban);
    expect(kartu[0]!.jawab).toContain("(`lajur.txt` bagian A)");
    expect(kartu[1]!.jawab).toContain("(`lajur.txt` bagian A)");
    expect(kartu[2]!.jawab).toContain("(Hitungan atas Asumsi)");
  });
  test("jawaban kartu menurunkan klaimnya: 146 dari 12.600, 10 dari 10, diklaim 0 dengan 10 akun belum, 1,74 dari 4 slot", () => {
    expect(lBagA).toMatch(/ gagal +\| 10\n/);
    expect(lBagA).toContain("worker: diklaim 0");
    expect(lBagA).toMatch(/ belum +\| 10\n/);
    expect(0.116 * 5 * 3).toBeCloseTo(1.74, 10);
    harus("Pada laju rata-rata, 0,0116 × 12.600 = 146 pendaftar masuk dalam 3 jam 30 menit, sebanyak yang gagal (Hitungan atas Asumsi).");
    harus("Pada puncak, 1,74 dari 4 slot worker dipegang pekerjaan verifikasi yang pasti gagal: 0,116 pendaftar per detik, 5 percobaan, 3 detik tiap percobaan.");
    harus("Premisnya tiap percobaan menunggu sampai timeout, dan 0,116 adalah Asumsi (Hitungan atas Asumsi).");
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
  test("front matter dikunci: title dan description (memuat 3 jam 30 menit, 146, dan lima percobaan)", () => {
    expect(frontmatter.trim().split("\n")).toEqual([
      'title: "4.10 M31: 146 pendaftar tertahan \\"Sedang diverifikasi\\""',
      "description: Minggu 5. Layanan verifikasi mati selama 3 jam 30 menit, dan 146 pendaftar berstatus Verifikasi gagal padahal fotonya jelas. Tiap pekerjaan habis lima percobaan dan masuk dead-letter, dan tidak ada yang mengantrekannya lagi.",
    ]);
    expect(dari("t4-m31").judul).toContain("146");
  });
  test("jumlah elemen: lima Blok, satu Rantai, enam Snippet, satu WidgetLama, satu noscript, satu tabel, tiga Cek diri, tujuh impor", () => {
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(5);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(6);
    expect(badan.match(/<WidgetLama /g)).toHaveLength(1);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/^\| --- \| --- \| --- \|$/gm)).toHaveLength(1);
    expect(badan.match(/^import /gm)).toHaveLength(6);
  });
  test("istilah diberi arti di pemakaian pertama di luar adegan: worker, dead-letter, slot, timeout, backoff, Hitungan, penalaran", () => {
    const pos = (s: string) => badan.indexOf(s);
    expect(pos("worker")).toBeGreaterThan(pos('<Blok nama="Yang Raka kira"'));
    expect(pos("Arti worker dan dead-letter ada di blok berikutnya.")).toBeGreaterThan(pos("worker mencobanya"));
    expect(pos("Worker adalah proses yang mengerjakan pekerjaan outbox di luar request")).toBeGreaterThan(pos('<Blok nama="Yang sebenarnya">'));
    expect(pos("Dead-letter adalah status `mati`: pekerjaan tidak diklaim lagi dan menunggu dibaca manusia.")).toBeGreaterThan(pos("Worker adalah proses"));
    expect(pos("Timeout adalah batas waktu client: client menyerah bila layanan tidak menjawab dalam 3 detik")).toBeGreaterThan(pos("baik 503 maupun timeout"));
    expect(pos("tiap pekerjaan yang berjalan memegang satu slot sampai selesai")).toBeLessThan(pos("slot sampai timeout.") + 100);
    expect(badan.indexOf("slot")).toBe(badan.indexOf("**Worker punya empat slot, dan percobaan yang tidak dijawab memegang satu slot sampai timeout.**") + "**Worker punya empat ".length);
    expect(pos("lima percobaan dengan jeda yang makin lama (backoff)")).toBeGreaterThan(0);
    expect(badan.indexOf("backoff")).toBe(badan.indexOf("(backoff)") + 1);
  });
});

// ---- tinjauan (keputusan 1304): penutup mutan yang lolos di putaran TANPA kunci baris dan sidik ----------------------------
// Putaran tanpa kunci meloloskan 49 mutan: angka di Gejala (146), kalimat penghubung yang tidak berangka (sisipan "tidak"),
// kondisi rekaman, nomor soal Cek diri, dan butir Konsep yang lahir. Tiap tes di bawah menurunkan kalimatnya dari rekaman,
// kode, naskah, atau registry, bukan dari daftar baris.
describe("tinjauan 1304: kalimat yang lolos tanpa kunci baris", () => {
  const kata: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 10: "sepuluh" };
  const barisNaskah = naskah.split("\n").find((b) => b.startsWith("| M31 |"))!;
  const N146 = Number(cocok(barisNaskah, /lalu (\d+) pendaftar berstatus/)[1]);
  const PG = cocok(lajur, /PostgreSQL (\d+\.\d+) \(/)[1]!, GO = cocok(lajur, /go(\d+\.\d+\.\d+) ·/)[1]!;
  const BANYAK = Number(cocok(lajur, /# (\d+) pendaftar mengajukan verifikasi/)[1]);
  const koma = (n: number) => n.toFixed(2).replace(".", ",");
  test("Gejala: 146 dari naskah, jam dari naskah, dan kalimat cerita sama dengan naskah (foto kartu identitas dan swafoto ke layanan verifikasi, Ratih, daftar tinjauan)", () => {
    expect(N146).toBe(146);
    harus(`Pukul ${JAM_CEK} Ratih membuka daftar tinjauan tim risk. Daftarnya panjang dan isinya sama: ${N146} pendaftar berstatus "Verifikasi gagal". Ia bertanya ke Raka kenapa semuanya gagal.`);
    harus(`Sejak ${JAM_MULAI} layar mereka menulis "Sedang diverifikasi". Sesudahnya layar yang sama berganti menjadi "Verifikasi gagal", padahal foto mereka jelas.`);
    harus("Rekeningo sudah terbuka untuk publik, dan pendaftar baru memotret kartu identitas dan swafoto lewat app.");
    expect(naskah).toContain("foto kartu identitas dan swafoto dikirim ke layanan verifikasi");
    expect(barisNaskah).toContain("Ratih membuka daftar tinjauan");
    expect(barisNaskah).toContain(`Sabtu ${JAM_MULAI} sampai ${JAM_CEK}`);
    expect(naskah).toContain("Direksi Grup Lestari mendirikan **PT Rekeningo** (fiktif) supaya orang di luar Lestari bisa memakai Rekeningo.");
  });
  test("Yang Raka kira: tebakan Ratih sama dengan kolom 'Yang dikira' naskah, Raka menghitung, dan kalimat Tebak dulu memakai lima percobaan dari konstanta", () => {
    harus("Ratih menduga fotonya buram, atau pendaftar salah memotret kartunya. Raka memeriksa app lebih dulu.");
    expect(barisNaskah).toContain("| Foto buram atau pendaftar salah mengambil foto |");
    harus("Lalu Raka menghitung. Naskah memakai 1.000 pendaftar per hari (Asumsi)");
    harus("Layanan verifikasi tidak menjawab. Tiap pengajuan masuk ke `outbox` sebagai satu pekerjaan, dan worker mencobanya sampai " + `${kata[MAKS_PERCOBAAN]} kali. Sesudah percobaan kelima pekerjaan itu masuk dead-letter, dan pengajuannya ditandai \`gagal\`. Pendaftar yang tidak bersalah ikut gagal.`);
    harus("<summary>Tebak dulu: foto semua pendaftar jelas, tetapi 146 dari 146 gagal. Apa yang terjadi pada tiap pengajuan di server?</summary>");
    expect(MAKS_PERCOBAAN).toBe(5);
  });
  test("Yang sebenarnya: inti, kondisi rekaman (versi dari kepala rekaman), jalur pengajuan, aturan percobaan, dan angka rekaman 503, 50, 0, 10 tertulis dengan nilai dari rekaman", () => {
    harus(`Layanan verifikasi mati dan tiap pekerjaan menghabiskan ${kata[MAKS_PERCOBAAN]} percobaannya. Sesudah layanan pulih, tidak ada yang mengantrekan pekerjaan itu lagi.`);
    harus(`*Kondisi rekaman:* PostgreSQL ${PG}, go${GO}, server Go \`api-t4\`, satu worker, dan layanan verifikasi tiruan lokal dalam mode mati. Data awal sama di kedua baris, dan keduanya run terpisah.`);
    expect(retry).toContain(`PostgreSQL ${PG}`);
    expect(retry).toContain(`go${GO}`);
    expect(lBagA).toContain("kapasitas 1");
    harus("Pengajuan menulis satu baris `verifikasi` dan satu pekerjaan di `outbox` dengan tujuan `verifikasi`.");
    expect(lBagA).toContain(`${BANYAK} baris verifikasi dan ${BANYAK} pekerjaan di outbox`);
    harus(`Aturan percobaannya sama dengan pemberitahuan di [[t3-at-least-once]]: ${kata[MAKS_PERCOBAAN]} percobaan dengan jeda yang makin lama (backoff), lalu dead-letter.`);
    harus(`Layanan tiruan yang mati menjawab ${cocok(lBagA, /\((\d+) untuk semua permintaan\)/)[1]} untuk semua permintaan. Sepuluh pendaftar mengajukan verifikasi, dan satu worker mengerjakan pekerjaannya satu per satu tanpa menunggu jeda:`);
    expect(BANYAK).toBe(10);
    harus(`Sepuluh pekerjaan berstatus \`mati\` dengan ${MAKS_PERCOBAAN} percobaan, dan sepuluh pengajuan berstatus \`gagal\`. Layanan menerima ${BANYAK * MAKS_PERCOBAAN} permintaan (${BANYAK} × ${MAKS_PERCOBAAN}) dan tidak membuat satu objek pun. Pendaftar tidak melakukan kesalahan apa pun, tetapi menanggung semua percobaan yang habis.`);
    harus(`Layanan lalu pulih dan worker dijalankan lagi. Ia mengklaim ${cocok(lBagA, /worker: diklaim (\d+),/)[1]} pekerjaan, dan kesepuluh akun tetap \`belum\` terverifikasi:`);
    harus(`Satu worker mengerjakan paling banyak ${SERENTAK} pekerjaan sekaligus, dan tiap pekerjaan yang berjalan memegang satu slot sampai selesai.`);
  });
  test("pemakaian worker dan jalur yang tidak ada: kalimat penutup blok memakai 1,74 dari tabel, slot bebas habis, dan bagian A tanpa breaker dan tanpa lajur dijeda", () => {
    const puncak = koma(0.0116 * PUNCAK * MAKS_PERCOBAAN * TIMEOUT);
    expect(puncak).toBe("1,74");
    harus(`Pada puncak, pekerjaan yang pasti gagal memegang ${puncak} slot. Bersama pemberitahuan uang, tidak ada slot bebas untuk menghabiskan pekerjaan yang sudah menumpuk.`);
    harus("Di rekaman bagian A, api-t4 berjalan tanpa breaker dan tanpa penjeda pekerjaan. Tidak ada yang menghentikan percobaan saat layanan jelas mati, dan tidak ada yang mengantrekan ulang sesudah layanan pulih. Pekerjaan yang tidak bersalah menanggung keduanya, dan jawabannya ada di [[t4-breaker]].");
    expect(lBagA).not.toMatch(/-breaker|dijeda|half-open/);
    expect(lBagA).toContain("# --- A. Tanpa lajur dan tanpa breaker (ADR 25 apa adanya)");
    expect(wBagC).toContain("tidak ada sisa kapasitas untuk menguras antrean");
  });
  test("Coba sendiri dan noscript: kalimat varian dan hasil jalur utama memakai angka rekaman", () => {
    harus("Pendaftar itu lulus pada percobaan berikutnya, dengan satu objek di layanan (`retry.txt` bagian C).");
    expect(rBagC).toContain("1 objek dibuat");
    harus("Tulisan di layar HP adalah Ilustrasi dari naskah: lab tidak punya app Flutter.");
    harus("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia.");
    harus(`Hasilnya: sepuluh pekerjaan berstatus mati dengan ${MAKS_PERCOBAAN} percobaan, dan sepuluh pengajuan berstatus gagal. Layanan menerima ${BANYAK * MAKS_PERCOBAAN} permintaan tanpa membuat objek, dan sesudah layanan pulih worker mengklaim ${cocok(lBagA, /worker: diklaim (\d+),/)[1]} pekerjaan.`);
    harus("Rekaman lengkapnya ada di lipatan di bawah.");
  });
  test("Konsep yang lahir dan Cek diri: ADR dan batas waktu dari registry dan halaman 3.8, soal bernomor 1 sampai 3, pertanyaan memakai 146 dan 0,116 × 5 × 3", () => {
    harus(`- [[t3-at-least-once]]: ${kata[MAKS_PERCOBAAN]} percobaan lalu dead-letter (ADR ${dari("t3-at-least-once").adr![0]}), aturan yang di sini menghabiskan pekerjaan yang tidak bersalah.`);
    harus(`- [[t3-pool]]: batas waktu ${TIMEOUT} detik untuk tiap panggilan keluar (ADR ${dari("t3-pool").adr![0]}).`);
    harus("- [[t4-topup-verifikasi]]: jalur pengajuan sampai tingkat akun naik, saat layanan sehat.");
    harus("Pihak luar yang mati bukan kesalahan pendaftar, dan percobaan mereka tidak boleh ikut habis.");
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((x) => Number(x[1]))).toEqual([1, 2, 3]);
    harus(`**1.** Fotonya jelas, tetapi ${N146} pendaftar gagal. Kenapa angka ${N146} menunjuk ke sebab selain foto?`);
    harus("**2.** Layanan sudah pulih. Kenapa sepuluh pendaftar tidak lulus dengan sendirinya?");
    harus(`**3.** Rumus 0,116 × ${MAKS_PERCOBAAN} × ${TIMEOUT} menghasilkan 1,74. Apa arti 1,74, dan premis apa yang dipakainya?`);
    expect(0.116 * MAKS_PERCOBAAN * TIMEOUT).toBeCloseTo(1.74, 10);
  });
});
