// Penjaga halaman 4.12: angka, jam, kode galat, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// "dibaca dari kode", klaim negatif berlingkup, Hitungan jam, diagram Rantai, skenario alur t4-m32.json, baris riset, dan
// kartu Cek diri di m32-rilis-kamis.mdx diturunkan dari rekaman labs/t4-modul (batas.txt), kode lab api-t4 (notifikasi.go,
// notifikasi_test.go, satu_test.go, service dan repo), halaman ADR 17, naskah Tahap 4, registry, baris riset, dan halaman
// tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.8): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di
// berkas nilai) mengunci SETIAP baris badan halaman, sehingga satu kata, satu "tidak", satu tingkat heading, atau satu
// atribut yang berubah menggagalkan tes; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci
// tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, id dan nilai diagram, skenario, kartu,
// baris riset) dikunci dengan sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m32-rename-tes-hijau.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m32-rilis-kamis.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m32-rilis-kamis.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m32.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const batas = baca("labs/t4-modul/output/batas.txt");
const readmeModul = baca("labs/t4-modul/README.md");
const notifGo = baca("labs/api-t4/internal/modul/pembayaran/notifikasi.go");
const notifTes = baca("labs/api-t4/internal/modul/pembayaran/notifikasi_test.go");
const satuTes = baca("labs/api-t4/internal/modul/satu_test.go");
const layananGo = baca("labs/api-t4/internal/service/pembayaran.go");
const adr17 = baca("situs/src/content/docs/tahap-2/skema-tanpa-downtime.mdx");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const halSkema = baca("situs/src/content/docs/tahap-4/skema-data.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Layar { judul?: string; waktu?: string; sinyal?: number; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
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
interface H { id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const menitDari = (j: string): number => Number(j.slice(0, 2)) * 60 + Number(j.slice(3));

// ---- rekaman dan kode: bagian dan nomor baris Snippet -----------------------------------------------------------------
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
const T = bagian(batas);
const tA = T.nomor((b) => b.startsWith("# --- A. ")), tB = T.nomor((b) => b.startsWith("# --- B. ")), tC = T.nomor((b) => b.startsWith("# CODEOWNERS dan review wajib: Tidak dijalankan"));
const bagA = T.teks(tA, tB - 1), bagB = T.teks(tB, tC - 1);
// A: tiga langkah CI dari "$ go build" sampai "# exit status 0" sesudah baris "ok"
const aBuild = T.nomor((b) => b === "$ go build ./...", tA);
const aOk = T.nomor((b) => b === "ok    lab/apit4/internal/modul/pembayaran", aBuild);
const aAkhirCI = aOk + 1;
// A: tiga baris keluaran pemeriksaan terhadap skema nyata
const aPerintah = T.nomor((b) => b.startsWith("$ T4M_SCHEMA_SATU=tahap4_modul go test"), tA);
const aSebelum = aPerintah + 1, aMigrasi = aPerintah + 2, aSesudah = aPerintah + 3;
// B: M32 lagi, dengan batas: tiga baris pertama, lalu dua baris sesudah rename oleh pemilik schema akun
const bM32 = T.nomor((b) => b === "# M32 lagi, sekarang dengan batas:", tB);
const bPerintah = T.nomor((b) => b.startsWith("$ go test -tags t4modul"), bM32);
const bTolak1 = bPerintah + 1, bTolak3 = bPerintah + 3;
const bRename = T.nomor((b) => b.startsWith("sesudah ALTER TABLE akun RENAME COLUMN nama TO nama_tampil oleh pemilik schema akun"), bPerintah);
const NK = bagian(notifGo);
const kFungsi = NK.nomor((b) => b.startsWith("func TeksTopupLangsung("));
const kAkhir = NK.nomor((b) => b === "}", kFungsi);
const NT = bagian(notifTes);
const dQuery = NT.nomor((b) => b.startsWith("func (stmtTiruan) Query("));
const dNext = NT.nomor((b) => b.startsWith("func (b *barisTiruan) Next("));
const dAkhir = NT.nomor((b) => b === "}", dNext);
const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);

// ---- naskah: baris M32 dan jam cerita -------------------------------------------------------------------------------
const barisM32 = naskah.split("\n").find((b) => b.startsWith("| M32 |"))!;
const JAM_RILIS = cocok(barisM32, /Kamis (\d\d\.\d\d) tim Merchant merilis/)[1]!;
const JAM_GALAT = cocok(barisM32, /(\d\d\.\d\d) tombol "Terima top-up" memunculkan kesalahan/)[1]!;
const NOMINAL = cocok(barisM32, /notifikasi "Rp(\d{3}\.\d{3}) masuk"/)[1]!;
const JAM_ROLLBACK = cocok(barisM32, /Rollback selesai (\d\d\.\d\d) \(Ilustrasi\)/)[1]!;
const SELISIH = menitDari(JAM_ROLLBACK) - menitDari(JAM_GALAT);
// ---- rekaman A dan B: nilai yang dikutip halaman ----------------------------------------------------------------------
const kepala = cocok(batas, /# PostgreSQL (\d+\.\d+) \([^)]*\) · (go[\d.]+) · pgx (v[\d.]+) · schema (\w+) \(satu schema\)/);
const PG = kepala[1]!, GO = kepala[2]!, PGX = kepala[3]!, SKEMA_SATU = kepala[4]!;
const ROLE_SATU = cocok(batas, /satu role aplikasi \((\w+)\) untuk semua modul/)[1]!;
const sebelumTeks = cocok(T.baris[aSebelum - 1]!, /pembayaran\.TeksTopupLangsung -> "([^"]+)"$/)[1]!;
const migrasi = cocok(T.baris[aMigrasi - 1]!, /^migration tim Merchant: (ALTER TABLE akun RENAME COLUMN nama TO nama_tampil)$/)[1]!;
const sesudah = cocok(T.baris[aSesudah - 1]!, /-> (column "nama" does not exist) \((\w{5})\)$/);
const PESAN_A = sesudah[1]!, KODE_A = sesudah[2]!;
const tolak1 = cocok(T.baris[bTolak1 - 1]!, /\(SELECT nama FROM akun\): (relation "akun" does not exist) \((\w{5})\)$/);
const tolak2 = cocok(T.baris[bTolak1]!, /: (permission denied for schema t4m_akun) \((\w{5})\)$/);
const KODE_B1 = tolak1[2]!, KODE_B2 = tolak2[2]!, PESAN_B1 = tolak1[1]!, PESAN_B2 = tolak2[1]!;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.12 ada, masalah, jalur inti, prasyarat ADR 17, lab t4-modul, peran backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m32")).toMatchObject({ ada: true, nomor: "4.12", jenis: "masalah", inti: true, prasyarat: ["t2-skema-tanpa-downtime"], lab: ["t4-modul"], tahap: 4, peran: ["backend"] });
    expect(dari("t4-modul").nomor).toBe("4.13");
    expect(frontmatter).toContain('title: "4.12 M32: Rilis Kamis memecahkan top-up"');
    expect(frontmatter).toContain("description: Minggu 6. Rilis tim Merchant mengganti nama satu kolom, dan top-up gagal padahal kode tim Pembayaran tidak berubah dan tesnya lolos.");
    expect(dari("t4-m32").judul).toBe("M32: Rilis Kamis memecahkan top-up");
    expect(naskah).toContain("| 4.12 | 4 | M32: Rilis Kamis memecahkan top-up | Masalah | ★ | t4-modul | alur |");
    expect(barisM32).toMatch(/^\| M32 \| 6 \|/);
    expect(dari("t4-m32").label).toBe("Masalah 32 · minggu 6");
    harus("Minggu 6 Tahap 4.");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t2-skema-tanpa-downtime\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m32").menit).toBe(Number(m[1]) + Number(m[2]));
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
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry, peta naskah, dan prasyarat", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "B4.1", "t2-skema-tanpa-downtime", "t4-modul", "t4-prd", "t4-tim-infra"]);
    const sesuai: [string, string, string][] = [
      ["t2-skema-tanpa-downtime", "2.22", "Ubah skema tanpa downtime"], ["t4-prd", "4.1", "PRD v4"],
      ["t4-modul", "4.13", "Modular monolith"], ["t4-tim-infra", "4.26", "Tim dan infra Tahap 4"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("B4.1").nomor).toBe("1.25");
    expect(dari("B4.1").judul).toBe("Migration: skema sebagai kode");
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t2-skema-tanpa-downtime").adr).toEqual([17]);
    expect(dari("t4-modul").adr).toEqual([37]);
    expect(dari("t4-tim-infra").adr).toEqual([44]);
    harus("Keputusannya ADR 37.");
    harus("Keputusannya ADR 44.");
  });
  test("janji halaman lain ke 4.12 ditepati: 4.1 (pertanyaan kedua) dan 4.5 (alasan modul dipisah); pertanyaan kedua dikutip persis", () => {
    expect(hal41).toContain("[[t4-m32]] untuk yang kedua");
    const q = cocok(hal41, /^2\. (Kalau tiga tim mengubah tabel yang sama, siapa yang tahu sebelum rilis)\?$/m)[1]!;
    harus(`Pertanyaan kedua di PRD v4 berbunyi: ${q[0]!.toLowerCase()}${q.slice(1).replace("sebelum rilis", "sebelum rilis")} ([[t4-prd]])?`.replace("Kalau", "kalau"));
    expect(halSkema).toContain("Alasan modul dipisah dibahas di [[t4-m32]] dan [[t4-modul]].");
  });
  test("halaman tidak membuka isi 4.13: ADR 37, CODEOWNERS, dan ADR 44 hanya sebagai tautan di Konsep yang lahir; tanpa aturan internal compiler", () => {
    expect(badan.match(/ADR 37/g)).toHaveLength(1);
    expect(badan.match(/ADR 44/g)).toHaveLength(1);
    expect(badan.match(/CODEOWNERS/g)).toHaveLength(1);
    const lahir = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(lahir).toContain("ADR 37");
    expect(lahir).toContain("CODEOWNERS");
    expect(badan).not.toMatch(/use of internal package|MADR|branch protection|role t4m_monolit|21 foreign key|22 tabel/);
  });
});

describe("naskah M32: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M32 di naskah: Kamis, tim Merchant, Terima top-up, notifikasi Rp200.000, rollback, jawaban Pembayaran, akun.nama jadi akun.nama_tampil, yang dikira", () => {
    expect(barisM32).toContain('tombol "Terima top-up" memunculkan kesalahan');
    expect(barisM32).toContain("Tim Pembayaran: \"Kami tidak mengubah apa pun.\"");
    expect(barisM32).toContain("| Rilis tim Pembayaran yang rusak; Nadia memeriksa commit timnya sendiri |");
    expect(barisM32).toContain("Tim Merchant mengganti nama kolom `akun.nama` menjadi `akun.nama_tampil` lewat migration.");
    expect(barisM32).toContain("Modul pembayaran membaca `akun.nama` dengan SQL langsung untuk teks notifikasi");
    expect(barisM32).toContain("Tes tiap tim lolos karena tes pembayaran memakai data tiruan, bukan skema tim lain.");
    expect(barisM32).toContain("Folder migration dipakai bersama tanpa pemilik, dan yang meninjau perubahan itu anggota tim Merchant sendiri.");
    expect(barisM32).toContain("ADR 17 (expand lalu contract) sudah ada, tetapi tidak ada mesin yang memaksanya lintas tim");
    expect([JAM_RILIS, JAM_GALAT, JAM_ROLLBACK, NOMINAL]).toEqual(["15.20", "15.22", "15.58", "200.000"]);
  });
  test("kalimat Gejala: jam dan nominal dari baris naskah, bukan ditulis tangan; Hitungan selisih jam; Ilustrasi dari cerita", () => {
    harus(`Kamis pukul ${JAM_RILIS} tim Merchant merilis versi baru. Pukul ${JAM_GALAT} tombol "Terima top-up" memunculkan kesalahan, dan notifikasi "Rp${NOMINAL} masuk" tidak muncul di HP penerima.`);
    harus(`Rollback rilis itu selesai pukul ${JAM_ROLLBACK}.`);
    expect(SELISIH).toBe(36);
    harus(`Dari kesalahan pertama sampai rollback selesai berlalu ${JAM_ROLLBACK} − ${JAM_GALAT} = ${SELISIH} menit (Hitungan: angka yang dihitung dari angka lain di halaman).`);
    harus("hari, jam, dan nominal berasal dari cerita, bukan dari rekaman.");
    harus('Jawabannya satu kalimat: "Kami tidak mengubah apa pun."');
  });
  test("adegan Gejala tanpa kalimat definisi dan tanpa konsep; yang dikira sebelum yang sebenarnya; dugaan Raka dari pembagian tim di 4.1", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf('<Blok nama="Yang Raka kira" buka>'));
    const adegan = gejala.split("\n").filter((b) => b.startsWith("Minggu 6") || b.startsWith("Rollback rilis")).join(" ");
    expect(adegan).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    expect(adegan).not.toMatch(/migration|schema|SQL|kolom|modul|skema/);
    expect(badan.indexOf('<Blok nama="Yang Raka kira" buka>')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(hal41).toContain("| Merchant: 4 orang, dipimpin Wulan | merchant luar, QR, katalog, dan dasbor web |");
    expect(hal41).toContain("| Pembayaran: 5 orang, dipimpin Nadia | gateway, top-up, rekonsiliasi, dan kartu |");
    harus("Rilis Kamis datang dari tim Merchant, yang memegang merchant luar, QR, katalog, dan dasbor web ([[t4-prd]]). Top-up bukan bagian mereka.");
    harus("Karena itu dugaan pertama Raka jatuh ke tim yang memegang top-up: rilis tim Pembayaran yang rusak.");
    harus("Nadia membaca daftar commit timnya sendiri. Hasilnya sama dengan jawaban timnya: tidak ada perubahan di kode top-up (Ilustrasi).");
  });
  test("tebakan di blok Yang Raka kira: jawabannya tersembunyi di details dan sesuai rekaman (kode galat 42703 dan pesannya)", () => {
    const k = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(k[1]).toBe("Tebak dulu: kode top-up tidak berubah dan tesnya hijau, tetapi top-up gagal sesudah rilis tim lain. Apa yang bisa berubah di bawah kode yang sama?");
    expect(k[2]).toContain("Skema database. Tim Merchant mengganti nama satu kolom di tabel `akun`, dan kode top-up masih membaca nama lamanya.");
    expect(k[2]).toContain(`Database menjawab \`${PESAN_A}\`, dengan kode SQLSTATE ${KODE_A} (Rekaman lab, bagian A).`);
    expect(KODE_A).toBe("42703");
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    // jawaban benar ada di bagian A dan bagian A tidak memuat jawaban untuk pilihan lain
    expect(bagA).toContain(PESAN_A);
  });
  test("Raka memeriksa tes: tiga langkah CI hijau dan top-up tetap gagal; CI dari rekaman bagian A", () => {
    harus("Raka lalu memeriksa tes tim Pembayaran. Tiga langkah CI-nya hijau: `go build`, `go vet`, dan `go test` (Rekaman lab, bagian A di blok berikutnya).");
    harus("Kode top-up tidak berubah, tesnya hijau, dan top-up tetap gagal.");
    const ci = T.teks(aBuild, aAkhirCI);
    expect(ci.match(/^\$ go /gm)!.map((b) => b.trim())).toEqual(["$ go", "$ go", "$ go"]);
    expect([...ci.matchAll(/^\$ (go \w+)/gm)].map((m) => m[1])).toEqual(["go build", "go vet", "go test"]);
    expect(ci.match(/^# exit status 0$/gm)).toHaveLength(3);
    expect(ci).toContain("--- PASS: TestTeksTopupLangsungDenganDataTiruanLolos");
    expect(ci).not.toMatch(/FAIL|exit status [1-9]/);
  });
});

describe("rekaman batas.txt: bagian A dan B, nilai yang dikutip, dan rentang Snippet", () => {
  test("A: satu schema dan satu role aplikasi; sebelum rename teks terbentuk; migration satu perintah; sesudah rename 42703", () => {
    expect([PG, GO, PGX, SKEMA_SATU, ROLE_SATU]).toEqual(["17.11", "go1.27.1", "v5.11.0", "tahap4_modul", "api_t4"]);
    harus(`*Kondisi rekaman:* PostgreSQL ${PG}, ${GO}, dan pgx ${PGX}, dari database bersih.`);
    harus(`Semua modul memakai satu schema, yaitu ruang nama untuk tabel di dalam satu database (\`${SKEMA_SATU}\`).`);
    harus(`Mereka juga memakai satu role, yaitu identitas login database yang punya hak sendiri (\`${ROLE_SATU}\`). Dengan role itu SQL langsung ke tabel \`akun\` berhasil sebelum rename.`);
    expect(sebelumTeks).toBe("Top-up Rp200000 masuk ke Budi");
    expect(sebelumTeks).toContain(`Rp${NOMINAL.replace(".", "")} `);
    harus(`Isinya satu perintah, \`${migrasi}\` (Rekaman lab, bagian A; migration di cerita memakai perintah yang sama, Ilustrasi).`);
    expect(naskah).toContain("Tim Merchant mengganti nama kolom `akun.nama` menjadi `akun.nama_tampil`");
    expect([PESAN_A, KODE_A]).toEqual(['column "nama" does not exist', "42703"]);
    expect(bagA.match(/ALTER TABLE/g)).toHaveLength(1);
    expect(bagA.match(/column "nama" does not exist/g)).toHaveLength(1);
    expect(bagA).toContain("T4M_SCHEMA_SATU=tahap4_modul");
  });
  test("A: hanya satu panggilan sesudah rename dan tanpa jurnal, POST, atau saldo (klaim berlingkup bagian A: jalur top-up penuh tidak dijalankan)", () => {
    const sesudahRename = T.teks(aMigrasi, tB - 1);
    expect(sesudahRename.match(/pembayaran\./g)).toHaveLength(1);
    expect(bagA).not.toMatch(/jurnal|POST |saldo|INSERT|UPDATE/i);
    harus("Rekaman tidak menjalankan jalur top-up penuh sesudah rename. Apakah jurnal top-up sudah tertulis saat kesalahan muncul, rekaman tidak menjawabnya.");
    const fungsi = NK.baris.slice(kFungsi - 1, kAkhir).join("\n");
    expect(fungsi).not.toMatch(/INSERT|UPDATE|DELETE|jurnal/i);
    expect(fungsi).toContain("`SELECT nama FROM akun WHERE id = $1`");
  });
  test("B: modul dipisah, kode yang sama ditolak 42P01 dan 42501, kontrol berhasil, rename oleh pemilik schema akun tidak mematahkan pembayaran", () => {
    expect([PESAN_B1, KODE_B1, PESAN_B2, KODE_B2]).toEqual(['relation "akun" does not exist', "42P01", "permission denied for schema t4m_akun", "42501"]);
    expect(T.baris[bPerintah + 2]).toBe("kontrol: role t4m_akun menjalankan SQL yang sama pada baris yang sama: berhasil");
    expect(T.baris[bRename - 1]).toContain("oleh pemilik schema akun dan kode modul akun ikut diubah");
    expect(T.baris[bRename]).toBe('  modul akun membaca nama_tampil: berhasil; pembayaran.TeksTopup lewat kontrak akun: "Top-up Rp200000 masuk ke Budi"');
    expect(bagB).toContain("--- PASS: TestRenameKolomNamaTidakMematahkanModulLain");
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain(`\`pembayaran.TeksTopupLangsung\` dijawab \`${PESAN_A}\` (${KODE_A}).`);
    expect(ns).toContain(`dijawab \`${PESAN_B1}\` (${KODE_B1}) atau \`${PESAN_B2}\` (${KODE_B2}).`);
    expect(ns).toContain("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia.");
    expect(ns).toContain("Rekaman bagian B ada di lipatan di bawah.");
    harus("Kode pembayaran yang sama gagal sejak sebelum rename. Pemilik schema akun lalu menjalankan rename dan mengubah kode modul akun. Modul pembayaran tetap bekerja karena mengambil nama lewat modul akun, bukan lewat tabelnya (Rekaman lab, bagian B).");
    harus("Kode lama di `labs/api-t4/internal/repo` tidak ikut dipindah, dan rekaman tidak menjalankannya sesudah rename.");
    expect(readmeModul).toContain("Kode ledger lama (`internal/repo`, `internal/service`) tetap di tempatnya");
    expect(badan).not.toContain("tidak mematahkan modul lain");
    harus("Di lab hanya modul pembayaran, yang berjalan sebagai service sendiri, memakai role modulnya sendiri. Modul lain di proses monolith berbagi satu role.");
    expect(readmeModul).toContain("proses monolith memakai satu role, `t4m_monolit`, yang mewarisi lima role modul");
    expect(readmeModul).toContain("Role `t4m_pembayaran` dipakai sungguhan oleh proses terpisah.");
    expect(readmeModul).toContain("kode itu tidak bisa jalan sama sekali sebelum rename");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, bukan ditulis tangan; berkas dan judul sesuai; urutan di halaman", () => {
    expect(tag).toHaveLength(6);
    expect(lines).toEqual([`${kFungsi}:${kAkhir}`, `${dQuery}:${dAkhir}`, `${aBuild}:${aAkhirCI}`, `${aSebelum}:${aSesudah}`, `${bTolak1}:${bTolak3}`, `${bRename}:${bRename + 1}`]);
    expect(berkasSnippet).toEqual([
      "labs/api-t4/internal/modul/pembayaran/notifikasi.go", "labs/api-t4/internal/modul/pembayaran/notifikasi_test.go",
      "labs/t4-modul/output/batas.txt", "labs/t4-modul/output/batas.txt", "labs/t4-modul/output/batas.txt", "labs/t4-modul/output/batas.txt",
    ]);
    expect(judulSnippet).toEqual([
      `Kode lab: labs/api-t4/internal/modul/pembayaran/notifikasi.go baris ${kFungsi} sampai ${kAkhir} (SQL langsung ke tabel akun)`,
      `Kode lab: labs/api-t4/internal/modul/pembayaran/notifikasi_test.go baris ${dQuery} sampai ${dAkhir} (driver tiruan membalas satu baris)`,
      "Rekaman lab: labs/t4-modul/output/batas.txt, bagian A (tiga langkah CI tim Pembayaran lolos)",
      "Rekaman lab: labs/t4-modul/output/batas.txt, bagian A (rename lolos di CI, gagal di database)",
      "Rekaman lab: labs/t4-modul/output/batas.txt, bagian B (modul dipisah: kode yang sama ditolak)",
      "Rekaman lab: labs/t4-modul/output/batas.txt, bagian B (rename oleh pemilik schema akun tidak mematahkan pembayaran)",
    ]);
    // tiga baris A ada di bagian A, tiga baris B di bagian B
    expect(aSesudah).toBeLessThan(tB);
    expect(bTolak1).toBeGreaterThan(tB);
    expect(bRename + 1).toBeLessThan(tC);
    expect(NK.baris[kFungsi - 1]).toBe("func TeksTopupLangsung(ctx context.Context, q Penanya, akunID, jumlah int64) (string, error) {");
    expect(NT.baris[dQuery - 1]).toBe("func (stmtTiruan) Query(args []driver.Value) (driver.Rows, error) { return &barisTiruan{}, nil }");
    expect(NT.baris[dAkhir - 2]).toBe("\treturn nil");
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, atau rujukan naskah internal", () => {
    const tampil = [T.teks(aBuild, aAkhirCI), T.teks(aSebelum, aSesudah), T.teks(bTolak1, bTolak3), T.teks(bRename, bRename + 1), NK.teks(kFungsi, kAkhir), NT.teks(dQuery, dAkhir)].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b|\bC\d\b|\bE\d\b/);
  });
});

describe("kode lab: SQL langsung, driver tiruan, rename oleh pemilik, dan klaim negatif berlingkup", () => {
  test("TeksTopupLangsung membaca nama dengan SQL langsung ke tabel akun; kode top-up di service tidak punya query ke kolom nama", () => {
    expect(notifGo).toContain("// TeksTopupLangsung adalah kode modul pembayaran seperti pada M32 (satu schema, satu role, tanpa batas): nama");
    expect(layananGo).not.toMatch(/\b(a|akun)\.nama\b|SELECT nama|nama FROM|nama_tampil/);
    // BuatTopupBank membaca akun lewat repo.Akun, dan repo.Akun memilih a.nama: jalur top-up nyata tidak bebas dari kolom itu
    const topup = cocok(layananGo, /func \(s Service\) BuatTopupBank\([\s\S]*?\n}\n/)[0];
    expect(topup).toContain("a, err := s.repo.Akun(ctx, peminta)");
    const repoGo = baca("labs/api-t4/internal/repo/repo.go");
    expect(repoGo.slice(repoGo.indexOf("func (r Repo) Akun("), repoGo.indexOf("func (r Repo) AkunLewatEmail("))).toContain("SELECT a.id, a.jenis, a.nama,");
    harus("`labs/api-t4/internal/service/pembayaran.go` tidak punya SQL sendiri yang memilih kolom `nama`. Fungsi `BuatTopupBank` di file itu membaca akun lewat `repo.Akun`, yang memilih `nama` (Tidak dijalankan: dibaca dari kode). Rekaman tidak menjalankan jalur itu sesudah rename.");
    expect(readmeModul).toContain("Kode top-up api-t4 tidak membaca kolom itu; `TeksTopupLangsung` di `internal/modul/pembayaran` adalah kode lab yang ditulis seperti uraian naskah");
    harus("`TeksTopupLangsung` ditulis lab mengikuti cerita. Karena itu bagian ini Ilustrasi mekanisme: kodenya ditulis mengikuti cerita, sedangkan skema, role, dan pesan galat adalah PostgreSQL yang nyata. Hasilnya bukan rekaman kode produksi.");
    expect(batas).toContain("# Ilustrasi mekanisme: TeksTopupLangsung adalah kode lab yang ditulis seperti uraian M32 di naskah (kode top-up api-t4 tidak membaca akun.nama);");
  });
  test("driver tiruan: Prepare mengabaikan perintah, Query selalu membalas satu baris, Next mengisi Budi; komentar tes menyebut lolos sebelum dan sesudah rename", () => {
    expect(notifTes).toContain('func (connTiruan) Prepare(q string) (driver.Stmt, error) { return stmtTiruan{}, nil }');
    expect(notifTes).toContain("func (stmtTiruan) Query(args []driver.Value) (driver.Rows, error) { return &barisTiruan{}, nil }");
    expect(notifTes).toContain('dest[0] = "Budi"');
    expect(notifTes).toContain("// Tes modul pembayaran dengan data tiruan, seperti tes tiap tim pada M32: tidak ada skema tim lain di sini, jadi");
    expect(notifTes).toContain("// tes ini lolos sebelum dan sesudah kolom akun.nama diganti nama. Driver tiruan membalas satu baris untuk perintah");
    harus('Driver tiruan di tes itu membalas satu baris berisi "Budi" untuk perintah apa pun (Tidak dijalankan: dibaca dari kode):');
    harus("Tes pembayaran di cerita memakai data tiruan, yaitu pengganti database yang membalas data tetap tanpa membuka koneksi. Rekaman menjalankan satu tes bernama lewat `-run`, dan tes itu memakai data tiruan.");
    expect(bagA).toContain("$ go test -count=1 -run TestTeksTopupLangsungDenganDataTiruanLolos -v ./internal/modul/pembayaran");
    expect(badan).not.toContain("Tes modul pembayaran memakai data tiruan");
    harus("Perintah apa pun termasuk perintah yang menyebut kolom yang sudah tidak ada. Tes itu tidak menyentuh skema, jadi rename tidak mengubah hasilnya. Tiga langkah CI lolos tanpa koneksi database:");
    expect(bagA).toContain("# Ketiga langkah CI tidak membuka koneksi database: tes pembayaran memakai driver tiruan, jadi migration tim Merchant tidak mengubah hasilnya.");
    expect(notifTes).not.toMatch(/pgx|sql\.Open\("pgx"/);
  });
  test("satu_test.go: rename oleh role pemilik, kode aplikasi memakai role aplikasi yang sama sebelum dan sesudah, galat dicek 42703", () => {
    expect(satuTes).toContain('pemilik := bukaSatu(t, "lab")');
    expect(satuTes).toContain('app := bukaSatu(t, "api_t4") // role aplikasi yang sama untuk semua modul');
    expect(satuTes).toContain("pemilik.Exec(`ALTER TABLE akun RENAME COLUMN nama TO nama_tampil`)");
    expect(satuTes).toContain('if kode != "42703" {');
    expect(satuTes.match(/pembayaran\.TeksTopupLangsung\(context\.Background\(\), app, akunID, 200_000\)/g)).toHaveLength(2);
  });
  test("klaim berlingkup: di labs/api-t4/internal/repo lebih dari tiga tempat membaca a.nama (Akun, AkunBO, Katalog, CekCache, TutupBuku, satu query QR); halaman menyebut tiga sebagai contoh", () => {
    const dir = "labs/api-t4/internal/repo";
    const berkas = fs.readdirSync(path.join(akar, dir)).filter((f) => f.endsWith(".go") && !f.endsWith("_test.go"));
    const pembaca = new Set<string>();
    const file = new Set<string>();
    for (const f of berkas) {
      let fungsi = "";
      for (const b of baca(`${dir}/${f}`).split("\n")) {
        const m = b.match(/^func (?:\([^)]*\) )?(\w+)\(/);
        if (m) fungsi = m[1]!;
        if (/\ba\.nama\b/.test(b) && !b.trim().startsWith("//")) {
          file.add(f);
          if (fungsi) pembaca.add(fungsi);
        }
      }
    }
    expect([...pembaca].sort()).toEqual(["Akun", "AkunBO", "CekCache", "Katalog", "TutupBuku"]);
    expect([...file].sort()).toEqual(["bo.go", "katalog.go", "ledger.go", "qr.go", "repo.go", "tutupbuku.go"]);
    expect(pembaca.size).toBeGreaterThan(3);
    for (const contoh of ["Akun", "Katalog", "TutupBuku"]) expect(pembaca.has(contoh), contoh).toBe(true);
    harus("Query lain di `labs/api-t4/internal/repo` juga membaca `akun.nama`, misalnya `Akun`, `Katalog`, dan `TutupBuku` (Tidak dijalankan: dibaca dari kode). Rekaman tidak menjalankan satu pun dari query itu sesudah rename.");
    expect(barisRiset("R4-168")).toContain("`labs/api-t4/internal/repo` membaca `a.nama` di `Akun`, `AkunBO`, `Katalog`, `CekCache`, `TutupBuku`, dan satu query QR di `qr.go`");
  });
  test("klaim negatif berlingkup: folder labs/t4-modul tidak memuat rollback, folder migration, atau jam cerita; hanya cerita (Ilustrasi)", () => {
    const berkas = ["README.md", "run.py", "modul.sql", "Makefile", ...fs.readdirSync(path.join(akar, "labs/t4-modul/output")).map((f) => `output/${f}`)];
    for (const f of berkas) expect(baca(`labs/t4-modul/${f}`), f).not.toMatch(/rollback|folder migration|\b15\.(20|22|58)\b/i);
    harus("Rollback, jam rilis, folder migration, dan peninjau dari tim Merchant hanya ada di cerita (Ilustrasi).");
  });
});

describe("ADR 17, kolom sebagai kopling, dan dokumentasi: dibaca dari sumber", () => {
  test("ADR 17 aturan 1 dan lingkupnya (tabel akun) dikutip dari halaman 2.22; RENAME COLUMN menjalankan expand dan contract sekaligus ditulis sebagai pembacaan", () => {
    expect(adr17).toContain("1. Perubahan skema dipecah menjadi rilis: expand yang hanya menambah, migrate yang memindahkan, dan contract yang menghapus. Contract tidak pernah satu file dengan expand.");
    expect(adr17).toContain("Berlaku untuk setiap perubahan skema di tabel yang dipakai jalur uang: `akun`, `buku`, `jurnal`, dan `posting`.");
    harus("ADR 17 sudah ada ([[t2-skema-tanpa-downtime]]). Aturan 1 memecah perubahan menjadi expand, migrate, dan contract, dengan contract tidak pernah satu file dengan expand, dan berlaku untuk tabel `akun`.");
    harus("Satu `RENAME COLUMN` menambah nama baru dan menghapus nama lama dalam satu perintah, jadi tidak memenuhi aturan itu (Tidak dijalankan: dibaca dari ADR 17).");
    harus("Di cerita tidak ada mesin yang memeriksa aturan 1 lintas tim sebelum rilis (Ilustrasi).");
    harus("Aturan itu juga tidak menjawab siapa pembaca terakhir kolom lama. Modul pembayaran membacanya di file yang bukan milik tim Merchant.");
  });
  test("tiga tautan sumber luar: URL ada di baris riset, tanggal akses sama di halaman dan riset, tanpa merek di prosa", () => {
    const url = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(url).toEqual([
      "https://www.postgresql.org/docs/17/errcodes-appendix.html", "https://www.postgresql.org/docs/17/sql-altertable.html",
      "https://martinfowler.com/bliki/IntegrationDatabase.html",
    ]);
    const idRiset = ["R4-165", "R4-166", "R4-167"];
    url.forEach((u, i) => {
      const b = barisRiset(idRiset[i]!);
      expect(b, u).toContain(u.replace(/^https:\/\/(www\.)?/, ""));
      expect(b).toContain("dibuka 2026-10-29");
    });
    expect(badan.match(/dibuka 2026-10-29/g)).toHaveLength(3);
    expect(badan.match(/dibuka \d{4}-\d{2}-\d{2}/g)).toHaveLength(3);
    const tanpaTautan = badan.replace(/\]\(https?:\/\/[^)]+\)/g, "]");
    expect(tanpaTautan).not.toMatch(/Stripe|Midtrans|Xendit|https?:\/\//);
  });
  test("versi dokumentasi PostgreSQL di teks tautan sama dengan judul halaman di baris riset; M32 dan daftar tiga sebab konsisten", () => {
    const verDoc = cocok(barisRiset("R4-165"), /"PostgreSQL (\d+\.\d+) Documentation"|PostgreSQL (\d+\.\d+) Documentation, Appendix A/);
    const v165 = (verDoc[1] ?? verDoc[2])!;
    const v166 = cocok(barisRiset("R4-166"), /judul halaman "PostgreSQL (\d+\.\d+) Documentation"/)[1]!;
    expect(barisRiset("R4-166")).toContain(`PostgreSQL ${v166} Documentation, ALTER TABLE`);
    const v = [...badan.matchAll(/\[dokumentasi PostgreSQL (\d+\.\d+), ([^\]]+)\]/g)];
    expect(v.map((m) => m[2])).toEqual(["lampiran kode galat", "ALTER TABLE"]);
    expect(v.map((m) => m[1])).toEqual([v165, v166]);
    const m32 = cocok(dari("t4-m32").judul, /^(M\d+):/)[1]!;
    harus(`Di ${m32} tidak ada orang atau pemeriksaan di luar tim Merchant yang melihat migration itu sebelum rilis. Sebabnya tiga:`);
    harus(`Di ${m32} ADR 17 sudah tertulis dan tidak menghentikan migration itu.`);
    harus(`Di ${m32} yang berbagi database adalah modul dari tiga tim di satu aplikasi`);
    const daftar = badan.slice(badan.indexOf("Sebabnya tiga:"), badan.indexOf("Di cerita tidak ada mesin yang memeriksa"));
    expect([...daftar.matchAll(/^(\d+)\. /gm)].map((x) => x[1])).toEqual(["1", "2", "3"]);
  });
  test("R4-165: kode 42703, 42P01, dan 42501 menurut dokumentasi PostgreSQL 17; halaman menulis arti 42703 satu kalimat", () => {
    const b = barisRiset("R4-165");
    expect(b).toContain("`42703` `undefined_column`");
    expect(b).toContain("`42P01` `undefined_table`");
    expect(b).toContain("`42501` `insufficient_privilege`");
    expect(b).toContain("PostgreSQL 17.11 Documentation");
    expect(b).toContain("five-character error codes that follow the SQL standard's conventions for SQLSTATE codes");
    harus("SQLSTATE adalah kode lima karakter yang dipakai PostgreSQL untuk jenis galat. Kode 42703 berarti kolom tidak ada (");
    expect(b.includes(KODE_A) && b.includes(KODE_B1) && b.includes(KODE_B2)).toBe(true);
  });
  test("R4-166: RENAME mengganti nama kolom dan tidak mengubah data tersimpan; akibatnya pada query tidak ditulis dari dokumentasi", () => {
    const b = barisRiset("R4-166");
    expect(b).toContain("the name of an individual column in a table");
    expect(b).toContain("There is no effect on the stored data.");
    expect(b).toContain("tidak menyebut akibat rename pada query yang masih memakai nama lama");
    harus("Perintah itu mengganti nama kolom dan tidak mengubah data yang tersimpan (");
  });
  test("R4-167: kutipan 'point of coupling' milik Fowler dengan atribusi, dan satu kalimat batas analogi", () => {
    const b = barisRiset("R4-167");
    expect(b).toContain("25 Mei 2004");
    expect(b).toContain("the database becomes a point of coupling between the applications that access it");
    expect(b).toContain("halaman menulisnya sebagai analogi");
    harus("Martin Fowler menulis tentang beberapa aplikasi yang berbagi satu database. Menurutnya database itu menjadi \"point of coupling\" di antara aplikasi tersebut (");
    harus("[Integration Database](https://martinfowler.com/bliki/IntegrationDatabase.html), 25 Mei 2004, dibuka 2026-10-29, Tidak dijalankan).");
    harus("Di M32 yang berbagi database adalah modul dari tiga tim di satu aplikasi, jadi ini analogi, bukan kasus yang sama.");
  });
  test("R4-168 dan baris riset: urut ID, tidak ganda, lima kolom, satu baris per ID; sidik terkunci terpisah", () => {
    const ids = ["R4-165", "R4-166", "R4-167", "R4-168"];
    const baris = riset.split("\n");
    const posisi = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    expect(posisi.every((p) => p >= 0)).toBe(true);
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
    for (const id of ids) {
      expect(baris.filter((b) => b.startsWith(`| ${id} |`))).toHaveLength(1);
      expect(barisRiset(id).split(" | ").length, id).toBeGreaterThanOrEqual(5);
    }
    expect(barisRiset("R4-168")).toContain("go1.27.1");
    ids.forEach((id, i) => expect(sidik(barisRiset(id)), id).toBe(SIDIK.riset[i]));
  });
  test("tanpa ID riset, nomor keputusan, nomor PR, emoji, atau satuan B di halaman, diagram, skenario, dan kartu", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b|\bPR #?\d{3}\b/);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m32");
    expect(kartu).toHaveLength(3);
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).toMatch(/^### Cek diri$/m);
    expect(badan).not.toMatch(/\d+ ?B\b/);
  });
  test("label sumber: arti tiga label ditaut ke A0 di Gejala; Hitungan dan Ilustrasi mekanisme didefinisikan di pemakaian pertama; tanpa label di luar daftar", () => {
    harus("Arti Ilustrasi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].");
    expect(badan.match(/\(Hitungan: /g)).toHaveLength(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("(Hitungan: ") + 1);
    expect(badan.match(/Ilustrasi mekanisme/g)).toHaveLength(2); // definisi di pemakaian pertama dan jawaban kartu kedua
    expect(badan.indexOf("Ilustrasi mekanisme")).toBe(badan.indexOf("Karena itu bagian ini Ilustrasi mekanisme: kodenya") + "Karena itu bagian ini ".length);
    expect(badan).not.toMatch(/penalaran|\(Simulasi|\[perlu verifikasi\]|\(dibaca dari/);
    expect(badan.match(/\(Tidak dijalankan: dibaca dari ADR 17\)/g)).toHaveLength(2);
    expect(badan.match(/\(Tidak dijalankan: dibaca dari kode\)/g)).toHaveLength(4);
    expect(badan.match(/, dibuka 2026-10-29, Tidak dijalankan\)/g)).toHaveLength(3); // tiga tautan sumber luar
    expect(badan.match(/Tidak dijalankan\)/g)).toHaveLength(3); // label turunan selalu berpasangan: "Tidak dijalankan: dibaca dari ..."
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: tiga langkah CI (go build, go vet, go test) dan rename, SELECT nama FROM akun, 42703 dengan pesan dari bagian A", () => {
    expect(diagram.id).toBe("t4-m32-rename-tes-hijau");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-modul · batas.txt bagian A (Ilustrasi mekanisme)" });
    expect(diagram.baris).toHaveLength(2);
    const [ci, db] = diagram.baris;
    expect(ci!.label).toBe("Yang dilihat CI tim Pembayaran");
    expect(ci!.simpul.map((s) => s.teks)).toEqual([...T.teks(aBuild, aAkhirCI).matchAll(/^\$ (go \w+)/gm)].map((m) => m[1]));
    expect(ci!.simpul.map((s) => s.sub)).toEqual(["tanpa keluaran, exit 0", "tanpa keluaran, exit 0", "PASS, data tiruan"]);
    expect(ci!.simpul.every((s) => s.nada === "biasa")).toBe(true);
    expect(db!.simpul.map((s) => s.teks)).toEqual(["Rename kolom", "SELECT nama FROM akun", `Galat ${KODE_A}`]);
    expect(db!.simpul[0]!.sub).toBe("nama jadi nama_tampil");
    expect(migrasi).toContain("RENAME COLUMN nama TO nama_tampil");
    expect(db!.simpul[1]!.sub).toBe("kode Pembayaran, tidak berubah");
    expect(db!.simpul[2]!.sub).toBe(PESAN_A);
    expect(db!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(diagram.catatan).toBe("Kode yang dijalankan adalah TeksTopupLangsung, kode lab yang ditulis mengikuti cerita. Kotak oranye adalah akibat yang direkam.");
  });
  test("diagram dikunci dengan sidik jari dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    harus("<Rantai data={renameTesHijau} />");
    expect(badan).not.toContain("<Rantai data={renameTesHijau} ringkas />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(mdx).toContain('import renameTesHijau from "../../../../data/diagram/t4-m32-rename-tes-hijau.json";');
    const blok = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(blok).toContain("<Rantai data={renameTesHijau} />");
  });
});

describe("skenario alur t4-m32.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; empat komponen, satu perangkat; sumber batas.txt; lima langkah dan tiga langkah varian", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-modul/output/batas.txt", fileVarian: "labs/t4-modul/output/batas.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["mer", "Migration"], ["ci", "CI tim Pembayaran"], ["byr", "Modul pembayaran"], ["db", "PostgreSQL"]]);
    expect(skenario.perangkat).toEqual([{ id: "hp", label: "HP penerima top-up" }]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(1);
    expect(skenario.varian.label).toBe("modul pembayaran dan modul akun dipisah schema dan role");
    harus("**Ubah satu hal: modul pembayaran dan modul akun dipisah schema dan role**");
    harus("Widget ini mengikuti rekaman `batas.txt` bagian A, dengan satu varian dari bagian B.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m32.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(readmeModul).toContain("make -C labs/t4-modul run BAGIAN=ledger");
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-modul run BAGIAN=batas");
    expect(readmeModul).toMatch(/make -C labs\/t4-modul run BAGIAN=ledger\s+# satu bagian: batas ledger proses-mati latensi testing\n/);
    expect(baca("labs/t4-modul/run.py")).toContain('BAGIAN = {"batas": rekam_batas, "ledger": rekam_ledger,');
    // judul bagian A dan B di rekaman: A tanpa batas (satu schema, satu role), B dengan batas (enam schema)
    expect(T.baris[tA - 1]).toBe(`# --- A. M32 pada versi tanpa batas: satu schema (${SKEMA_SATU}), satu role aplikasi (${ROLE_SATU}) untuk semua modul ---`);
    expect(T.baris[tB - 1]).toBe("# --- B. Dengan batas: enam schema modul, satu role per modul, dan paket internal/ Go ---");
  });
  test("tebakan: empat pilihan, jawaban benar (42703, tes hijau) sama dengan rekaman, tiga pilihan lain bertentangan, benar bukan yang terpanjang, posisi berbeda dari tebakan Tahap 4 lain", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(1);
    expect(p.varian).toBe(false);
    expect(p.options[p.answer]).toBe(`Gagal dengan ${KODE_A}: kolom nama tidak ada, walau tes tim Pembayaran hijau`);
    expect(p.options.filter((_, i) => i !== 1)).toEqual([
      "Berhasil: PostgreSQL masih menerima nama lama sebagai alias",
      "Berhasil, tetapi nama penerima kosong karena kolom lama sudah tidak berisi",
      `Gagal dengan ${KODE_B1}: tabel akun tidak ditemukan di database`,
    ]);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    const lain = ["t4-m29", "t4-m30", "t4-topup", "t4-verifikasi"].map((n) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${n}.json`)) as Skenario).predict.answer);
    expect(lain).toEqual([3, 2, 2, 3]);
    expect(lain).not.toContain(p.answer);
    // pilihan lain bertentangan dengan rekaman: tanpa alias, bagian A memberi galat (bukan teks kosong), 42P01 hanya di bagian B
    expect(batas).not.toMatch(/alias/i);
    expect(T.baris[aSesudah - 1]).not.toContain("Top-up Rp");
    expect(bagA).not.toContain(KODE_B1);
    expect(bagB).toContain(KODE_B1);
    expect(p.q).toBe("Tim Merchant mengganti nama kolom akun.nama. Kode top-up tim Pembayaran tidak berubah, dan tesnya hijau. Apa yang terjadi saat top-up membaca nama penerima?");
    expect(p.explain).toBe(`Sesudah rename, SELECT nama FROM akun dijawab ${KODE_A}: kolom nama tidak ada. Hasilnya bukan nama lama dan bukan nama kosong. Tes tetap hijau karena memakai driver tiruan tanpa koneksi database. Rekaman batas.txt bagian A.`);
  });
  test("baris perintah dan keluaran di kirim ada utuh di batas.txt, per langkah; baris ringkasan tanda panah satu-satunya yang diturunkan", () => {
    const [l1, l2, l3, l4, l5] = skenario.langkah;
    expect(l1!.kirim).toBe(T.teks(aBuild, aAkhirCI));
    expect(l2!.kirim).toBe(T.baris[aSebelum - 1]);
    expect(l3!.kirim).toBe(T.baris[aMigrasi - 1]);
    expect(l5!.kirim).toBe(T.baris[aSesudah - 1]);
    expect(l4!.kirim).toBe("→ tes pembayaran memakai driver tiruan, tanpa koneksi ke PostgreSQL");
    expect(skenario.langkah.filter((l) => l.kirim.startsWith("→"))).toHaveLength(1);
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.kirim).toBe(T.teks(bTolak1, bTolak1 + 1));
    expect(v2!.kirim).toBe(T.baris[bPerintah + 2]);
    expect(v3!.kirim).toBe(T.teks(bRename, bRename + 1));
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["ci", ""], ["byr", "db"], ["mer", "db"], ["ci", ""], ["byr", "db"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["byr", "db"], ["db", ""], ["mer", "db"]]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["", "", "", "", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "")).toEqual(["warn", "", "good"]);
  });
  test("layar HP: jam dan tombol dari naskah; kesalahan hanya di langkah terakhir jalur utama; varian tanpa kesalahan; HP berlabel Ilustrasi", () => {
    const hp = (l: Layar | undefined) => l!;
    expect(hp(skenario.layarAwal.hp).waktu).toBe(JAM_RILIS);
    expect(hp(skenario.layarAwal.hp).isi).toEqual([{ jenis: "tombol", teks: `Terima top-up Rp${NOMINAL}` }]);
    expect(barisM32).toContain('tombol "Terima top-up"');
    const layarJalur = skenario.langkah.filter((l) => l.layar).map((l) => l.layar!.hp!);
    expect(layarJalur).toHaveLength(1);
    expect(layarJalur[0]!.waktu).toBe(JAM_GALAT);
    expect(layarJalur[0]!.isi).toEqual([{ jenis: "tombol", teks: `Terima top-up Rp${NOMINAL}` }, { jenis: "toast", teks: "Terjadi kesalahan", nada: "warn" }]);
    expect(skenario.langkah[4]!.layar).toBeDefined();
    const layarVarian = skenario.varian.langkah.filter((l) => l.layar).map((l) => l.layar!.hp!);
    expect(layarVarian).toHaveLength(1);
    expect(layarVarian[0]!.waktu).toBe(JAM_GALAT);
    expect(layarVarian[0]!.isi).toEqual([{ jenis: "tombol", teks: `Terima top-up Rp${NOMINAL}` }]);
    expect(skenario.varian.langkah[2]!.layar).toBeDefined();
    expect(skenario.sumber.catatan).toContain(`Layar HP digambar dari cerita (Ilustrasi): lab tidak punya app Flutter, dan jam ${JAM_GALAT} serta kesalahan di layar berasal dari cerita.`);
    harus("Layar HP digambar dari cerita (Ilustrasi): lab tidak punya app Flutter.");
  });
  test("catatan sumber: bagian A dan B, Ilustrasi mekanisme, rename pada varian oleh pemilik schema akun (bukan tim Merchant), baris tanda panah diringkas", () => {
    const c = skenario.sumber.catatan;
    expect(c).toContain(`Lab t4-modul, PostgreSQL ${PG}, dari database bersih`);
    expect(c).toContain("Jalur utama: bagian A, versi tanpa batas, dengan satu schema dan satu role aplikasi.");
    expect(c).toContain("jadi jalur utama adalah Ilustrasi mekanisme: skema, role, dan pesan galat adalah PostgreSQL yang nyata, tetapi kodenya bukan kode produksi.");
    expect(c).toContain("Ubah satu hal: bagian B, enam schema dan satu role per modul. Pada varian rename dilakukan oleh pemilik schema akun, bukan oleh tim Merchant.");
    expect(c).toContain("Baris diawali tanda panah diringkas dari rekaman yang sama, bukan baris log.");
    expect(T.baris[bRename - 1]).toContain("oleh pemilik schema akun");
    expect(bagB.match(/t4m_\w+/g)!.map((s) => s).filter((s) => ["t4m_ledger", "t4m_akun", "t4m_identitas", "t4m_merchant", "t4m_pembayaran", "t4m_platform"].includes(s))).toHaveLength(bagB.match(/t4m_(ledger|akun|identitas|merchant|pembayaran|platform)\b/g)!.length);
    expect(readmeModul).toContain("Enam schema dengan awalan `t4m_`");
  });
  test("skenario dikunci dengan sidik jari; teks langkah menyebut modul pembayaran dan Ilustrasi mekanisme sesuai kode", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
    expect(skenario.langkah[1]!.jelas).toContain("Fungsinya TeksTopupLangsung, kode lab yang ditulis mengikuti cerita (Ilustrasi mekanisme).");
    expect(skenario.langkah[3]!.jelas).toContain("(dibaca dari kode lab, tidak dijalankan sesudah rename)");
    expect(skenario.varian.langkah[0]!.jelas).toContain("Kodenya gagal sebelum rename apa pun.");
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman, kode, dan ADR 17 dengan label sumber", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m32");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m32-1", "t4-m32-2", "t4-m32-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m32-rilis-kamis/" && k.judul === "4.12 M32: Rilis Kamis memecahkan top-up")).toBe(true);
    expect(kartu[0]!.jawab).toContain(`Terhadap database, fungsi yang sama dijawab \`${PESAN_A}\` (\`batas.txt\` bagian A).`);
    expect(kartu[1]!.jawab).toContain("Kode top-up di `labs/api-t4` tidak memilih `nama` dengan SQL sendiri. Ia membaca kolom itu lewat `repo.Akun` (Tidak dijalankan: dibaca dari kode). Rekaman tidak menjalankan jalur itu.");
    expect(kartu[2]!.jawab).toContain("(Tidak dijalankan: dibaca dari ADR 17)");
    expect(kartu[2]!.jawab).toContain("Di cerita tidak ada pemeriksaan yang menjalankan aturan itu sebelum rilis (Ilustrasi).");
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const butir = [...cek.matchAll(/\*\*(\d+)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(butir.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(kartu.map((k) => k.tanya)).toEqual(butir.map((m) => m[2]));
    expect(kartu.map((k) => k.jawab)).toEqual(butir.map((m) => m[3]));
    expect(kartu.map((k) => k.tanya)).toEqual([
      "Tes tim Pembayaran hijau sebelum dan sesudah migration Merchant, tetapi top-up gagal. Kenapa tesnya tidak menangkapnya?",
      "Kenapa halaman ini menyebut `TeksTopupLangsung` Ilustrasi mekanisme, bukan rekaman kode top-up?",
      "Kenapa ADR 17 tidak menghentikan migration Merchant?",
    ]);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: tiga tautan dengan deskripsi dari registry; penutup tanpa klaim baru; akhir halaman memuat SkripLama", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]]+)\]\]/gm)].map((m) => m[1])).toEqual(["t4-modul", "t2-skema-tanpa-downtime", "t4-tim-infra"]);
    harus("- [[t4-modul]]: batas modul yang dijaga compiler dan database, CODEOWNERS, dan ADR wajib untuk perubahan lintas modul. Keputusannya ADR 37.");
    harus("- [[t2-skema-tanpa-downtime]]: expand, migrate, dan contract, aturan yang sudah ada sebelum M32.");
    harus("- [[t4-tim-infra]]: pipeline per modul dan pemeriksaan sebelum rilis. Keputusannya ADR 44.");
    harus("Di M32 ADR 17 sudah tertulis dan tidak menghentikan migration itu. Siapa yang tahu sebelum rilis harus dijawab oleh sesuatu yang berjalan sebelum rilis.");
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "empat", "lima", "enam", "Raka", "Nadia", "Budi", "Kamis", "pertama", "kedua", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "seorang", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Ilustrasi mekanisme", "Asumsi", "Hitungan", "naik", "turun", "gagal", "lolos", "hijau", "ditolak", "Merchant", "Pembayaran", "Platform", "42703", "42P01", "42501", "nama", "nama_tampil"];
const profil = (teks: string): string =>
  PENENTU.map((k) => {
    const n = (teks.match(new RegExp(`(?<![\\p{L}-])${k}(?![\\p{L}-])`, "gu")) ?? []).length;
    return n ? `${k}:${n}` : "";
  }).filter(Boolean).join(" ");
const daun = (o: unknown, jalur = ""): [string, string | number | boolean][] => {
  if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") return [[jalur, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => daun(v, `${jalur}.${k}`));
  return [];
};

describe("nilai terkunci terpisah dari kalimat: baris riset, daun diagram dan skenario, dan profil kata penentu per baris", () => {
  test("empat baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(["R4-165", "R4-166", "R4-167", "R4-168"].map(barisRiset)).toEqual(RISET_TERKUNCI);
  });
  test("tiap nilai diagram dan skenario (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(SKENARIO_DAUN);
  });
  test("sidik frontmatter terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("profil kata penentu tiap baris badan (polaritas, urutan waktu, bilangan, tokoh, kode galat, label sumber) sama dengan nilai terkunci", () => {
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

// ---- tinjauan peninjau: celah yang hanya terlihat tanpa kunci baris --------------------------------------------------------
// Mutan peninjau yang lolos saat kunci baris dan sidik dimatikan: tim yang salah disebut, label Ilustrasi hilang, janji antar blok,
// identifier terpotong, nilai diagram yang berbalik arti, dan definisi label yang berubah di /cara-pakai/. Tiap tes menurunkan
// nilainya dari naskah, PRD 4.1, rekaman, kode lab, atau halaman label, bukan dari teks halaman ini.
describe("tinjauan: nilai yang diturunkan dari sumber, bukan dari kunci baris", () => {
  const blok = (nama: string): string => cocok(badan, new RegExp(`<Blok nama="${nama}"[^>]*>([\\s\\S]*?)</Blok>`))[1]!;
  const himpunan = (teks: string, re: RegExp): string[] => [...new Set([...teks.matchAll(re)].map((m) => m[1]!))];
  const sebelumTag = (tag: string): string => {
    const i = badan.indexOf(tag);
    expect(i, `tag ${tag}`).toBeGreaterThanOrEqual(0);
    const potong = badan.slice(0, i).trimEnd();
    return potong.slice(potong.lastIndexOf("\n\n") + 2);
  };
  test("tim: yang merilis, yang meninjau, dan yang memegang top-up sama dengan naskah M32 dan tabel tim di 4.1", () => {
    const rename = cocok(barisM32, /Tim (\w+) mengganti nama kolom/)[1]!;
    const pemeriksa = cocok(barisM32, /anggota tim (\w+) sendiri/)[1]!;
    const topup = cocok(barisM32, /Tim (\w+): "Kami tidak mengubah apa pun\."/)[1]!;
    expect(pemeriksa).toBe(rename);
    expect(rename).not.toBe(topup);
    cocok(hal41, new RegExp(`\\| ${topup}: \\d+ orang, dipimpin \\w+ \\| gateway, top-up`));
    cocok(hal41, new RegExp(`\\| ${rename}: \\d+ orang, dipimpin \\w+ \\| merchant luar, QR`));
    expect(himpunan(badan, new RegExp(`Kamis pukul ${JAM_RILIS.replace(".", "\\.")} tim (\\w+) merilis`, "g"))).toEqual([rename]);
    expect(himpunan(badan, /Rilis Kamis datang dari tim (\w+)/g)).toEqual([rename]);
    expect(himpunan(badan, /tim (\w+) menjalankan satu migration/g)).toEqual([rename]);
    expect(himpunan(badan, /anggota tim (\w+) sendiri/g)).toEqual([pemeriksa]);
    expect(himpunan(badan, /di luar tim (\w+) yang melihat migration/g)).toEqual([rename]);
    expect(himpunan(badan, /Nadia bertanya ke tim (\w+)/g)).toEqual([topup]);
    expect(himpunan(badan, /milik tim (\w+), membaca/g)).toEqual([topup]);
    expect(himpunan(badan, /Raka lalu memeriksa tes tim (\w+)\./g)).toEqual([topup]);
    expect(himpunan(skenario.pengantar, /^Tim (\w+) mengganti nama satu kolom/g)).toEqual([rename]);
    expect(himpunan(skenario.predict.q, /^Tim (\w+) mengganti nama kolom/g)).toEqual([rename]);
    expect(himpunan(skenario.langkah[2]!.judul, /^Migration (\w+) mengganti/g)).toEqual([rename]);
    expect(himpunan(skenario.langkah[2]!.kirim, /migration tim (\w+):/g)).toEqual([rename]);
    expect(himpunan(skenario.komponen.map((k) => k.label).join("\n"), /CI tim (\w+)/g)).toEqual([topup]);
    expect(himpunan(skenario.langkah[0]!.judul, /CI tim (\w+) lolos/g)).toEqual([topup]);
    expect(himpunan(diagram.baris[0]!.label, /CI tim (\w+)/g)).toEqual([topup]);
    expect(badan).not.toMatch(/tidak seorang pun/);
    harus("Di M32 tidak ada orang atau pemeriksaan di luar tim Merchant yang melihat migration itu sebelum rilis. Sebabnya tiga:");
  });
  test("Gejala: satu label Ilustrasi (naskah memberi label itu pada jam rollback) dan satu Hitungan; sebab 2 berlabel Ilustrasi karena lab tidak memuatnya", () => {
    expect(barisM32.match(/\(Ilustrasi\)/g)).toHaveLength(1);
    const g = blok("Gejala");
    expect(g.match(/\(Ilustrasi\)/g)).toHaveLength(1);
    expect(g).toContain("*Angka cerita (Ilustrasi):*");
    expect(g.match(/\(Hitungan: /g)).toHaveLength(1);
    const sebab = cocok(badan, /^2\. (Folder migration dipakai bersama[^\n]*)$/m)[1]!;
    expect(sebab).toMatch(/\(Ilustrasi: dari cerita, tidak ada di lab\)\.$/);
    expect(barisM32).toContain("Folder migration dipakai bersama tanpa pemilik, dan yang meninjau perubahan itu anggota tim Merchant sendiri");
  });
  test("identifier berkutip di prosa ada di sumber yang dikutip: rekaman, kode lab, daftar berkas, ADR 17, naskah, README", () => {
    const daftar = ["labs/api-t4/internal/modul/pembayaran", "labs/api-t4/internal/repo", "labs/api-t4/internal/service", "labs/t4-modul", "labs/t4-modul/output"]
      .flatMap((d) => fs.readdirSync(path.join(akar, d)));
    const sumber = [batas, notifGo, notifTes, satuTes, layananGo, readmeModul, adr17, naskah, hal41, baca("labs/api-t4/internal/modul/pembayaran/pembayaran_test.go"),
      ...fs.readdirSync(path.join(akar, "labs/api-t4/internal/repo")).filter((f) => f.endsWith(".go")).map((f) => baca(`labs/api-t4/internal/repo/${f}`)), baca("labs/api-t4/internal/service/topup.go"), baca("labs/t4-modul/output/testing.txt"), daftar.join("\n")].join("\n");
    const kutip = himpunan(badan, /`([A-Za-z_][\w.]*)`/g).filter((x) => /[A-Z_]/.test(x) || x.includes("."));
    expect(kutip.length).toBeGreaterThan(8);
    for (const x of kutip) expect(sumber, `identifier "${x}" tidak ada di sumber`).toContain(x);
    expect(kutip).toContain("TeksTopupLangsung");
  });
  test("janji antar blok: 'ada di blok berikutnya' ditepati; noscript menunjuk lipatan bagian B; kalimat pembuka Snippet dan widget menyebut isinya", () => {
    expect(blok("Yang Raka kira")).toContain("Kenapa tesnya tetap hijau ada di blok berikutnya.");
    expect(blok("Yang sebenarnya")).toContain("**Kenapa tesnya tetap hijau.**");
    const coba = blok("Coba sendiri");
    expect(coba).toContain("Rekaman bagian B ada di lipatan di bawah.");
    expect(coba).toContain("<details>\n<summary>Rekaman bagian B (juga untuk pembaca tanpa JavaScript)</summary>");
    expect(coba.indexOf("<noscript>")).toBeLessThan(coba.indexOf("<summary>Rekaman bagian B"));
    expect(coba).toContain("[[t4-modul]]");
    const fungsi = cocok(NK.baris[kFungsi - 1]!, /^func (\w+)\(/)[1]!;
    expect(sebelumTag('<Snippet file="labs/api-t4/internal/modul/pembayaran/notifikasi.go"')).toContain(`\`${fungsi}\``);
    expect(notifTes).toContain('dest[0] = "Budi"');
    expect(sebelumTag('<Snippet file="labs/api-t4/internal/modul/pembayaran/notifikasi_test.go"')).toMatch(/Driver tiruan di tes itu membalas satu baris berisi "Budi"/);
    const pengantarWidget = sebelumTag('<WidgetLama nama="alur"');
    const alurJs = baca("situs/lama/widgets/alur.js");
    expect(alurJs).toContain("panah kiri/kanan");
    expect(alurJs).toContain("Berikutnya →");
    expect(pengantarWidget).toContain("Tebak dulu");
    expect(pengantarWidget).toContain("Berikutnya atau panah kanan");
  });
  test("kalimat yang mengutip sumber: judul 'Siapa yang tahu sebelum rilis?' dari PRD 4.1; 'sebelum dan sesudah migration' dari baris sebelum/sesudah rename di rekaman A", () => {
    const q = cocok(hal41, /^2\. Kalau tiga tim .*(siapa yang tahu sebelum rilis)\?$/m)[1]!;
    harus(`**${q[0]!.toUpperCase()}${q.slice(1)}?**`);
    expect(T.baris[aSebelum - 1]).toMatch(/^sebelum rename, /);
    expect(T.baris[aSesudah - 1]).toMatch(/^sesudah rename, /);
    harus("Rekaman menjalankan fungsi yang sama dua kali dengan role dan skema yang sama, sebelum dan sesudah migration:");
  });
  test("diagram Rantai: arti tiap simpul sejalan dengan rekaman A (tanpa koneksi, satu schema dan satu role, tes hijau tetapi top-up gagal)", () => {
    expect(bagA).toContain("tidak membuka koneksi database");
    expect(diagram.baris[0]!.sub).toBe("tanpa koneksi database");
    expect(batas).toMatch(/\(satu schema\)/);
    expect(batas).toMatch(/satu role aplikasi \(\w+\) untuk semua modul/);
    expect(diagram.baris[1]!.sub).toBe("satu schema, satu role");
    expect(bagA).toContain("PASS: TestTeksTopupLangsungDenganDataTiruanLolos");
    expect(bagA).toContain("does not exist");
    expect(diagramMentah.judul).toBe("Tes hijau, kolom berganti nama, top-up gagal");
    expect(diagram.baris[0]!.label).toBe("Yang dilihat CI tim Pembayaran");
    expect(diagram.baris[1]!.label).toBe("Yang terjadi di database");
  });
  test("/cara-pakai/ mendefinisikan tiga label yang dirujuk Gejala (A0), dan baris riset R4-168 menyebut rentang repo.go yang memuat SELECT a.nama", () => {
    for (const l of ["Rekaman lab", "Ilustrasi", "Tidak dijalankan"]) expect(cara, l).toMatch(new RegExp(`^- \\*\\*${l}\\*\\*: `, "m"));
    expect(cara).toContain("- **Ilustrasi**: contoh atau widget yang disusun dari konsep, bukan direkam dari sistem sungguhan.");
    expect(cara).toContain("- **Tidak dijalankan**: kode hanya dicek ke dokumentasi resmi, tidak dijalankan di lab.");
    const repoGo = bagian(baca("labs/api-t4/internal/repo/repo.go"));
    const mulai = repoGo.nomor((b) => b.startsWith("func (r Repo) Akun("));
    const pilih = repoGo.nomor((b) => b.includes("SELECT a.id, a.jenis, a.nama"), mulai);
    const r = cocok(barisRiset("R4-168"), /`repo\.go` baris (\d+) sampai (\d+)/);
    expect(Number(r[1])).toBe(mulai);
    expect(Number(r[2])).toBeGreaterThanOrEqual(pilih);
    expect(Number(r[2])).toBeLessThan(mulai + 14);
  });
  test("tes lain di paket pembayaran memakai PostgreSQL dan dilewati tanpa TEST_DATABASE_URL (bullet 'Yang tidak direkam')", () => {
    const pembTes = baca("labs/api-t4/internal/modul/pembayaran/pembayaran_test.go");
    const testing = baca("labs/t4-modul/output/testing.txt");
    expect(pembTes).toContain('t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")');
    expect(testing).toContain("# --- B. Tes API ledger (service dan HTTP) dan modul pembayaran dengan PostgreSQL sungguhan");
    expect(testing).toContain("# --- C. Tanpa TEST_DATABASE_URL: tes yang butuh database dilewati, tes tanpa itu tetap jalan");
    harus("- Sebagian tes lain di paket `internal/modul/pembayaran` memakai PostgreSQL dan dilewati bila `TEST_DATABASE_URL` kosong (Rekaman lab, `testing.txt` bagian B dan C). Rekaman tidak menjalankannya sesudah rename.");
    const baris = riset.split("\n").filter((b) => b.startsWith("| R4-169 |"));
    expect(baris).toHaveLength(1);
    expect(baris[0]).toContain("testing.txt");
    expect(baris[0]).toContain("`t.Skip` bila `TEST_DATABASE_URL` kosong");
  });
});
