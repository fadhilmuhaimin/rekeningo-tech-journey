// Penjaga halaman 4.24: angka, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim "dibaca dari kode",
// klaim negatif berlingkup, Hitungan, diagram Rantai, skenario alur t4-m38.json, baris riset, dan kartu Cek diri di
// m38-siapa-membuka.mdx diturunkan dari rekaman labs/t4-audit (rantai.txt, role.txt, peran.sql, README, Makefile), kode
// labs/api-t4 (t4_audit.go, bo.go, audit.go, audit_biasa.go, migrasi), compose labs/b3-race, naskah Tahap 4, registry, dan
// baris riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.21): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di
// berkas nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat
// terkunci tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, diagram, skenario, kartu, baris
// riset) dikunci dengan sidik jari dan nilai terkunci di berkas nilai; paragraf prosa dibandingkan utuh di tes tanpa kunci baris.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m38-siapa-membuka.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m38-siapa-membuka.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m38-siapa-membuka.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m38.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const rantaiTxt = baca("labs/t4-audit/output/rantai.txt");
const roleTxt = baca("labs/t4-audit/output/role.txt");
const persetujuanTxt = baca("labs/t4-audit/output/persetujuan.txt");
const peranSql = baca("labs/t4-audit/peran.sql");
const readmeAudit = baca("labs/t4-audit/README.md");
const makeAudit = baca("labs/t4-audit/Makefile");
const composeRace = baca("labs/b3-race/docker-compose.yml");
const auditGo = baca("labs/api-t4/internal/service/t4_audit.go");
const aturanGo = baca("labs/api-t4/internal/service/t4_aturan.go");
const boGo = baca("labs/api-t4/internal/service/bo.go");
const repoAuditGo = baca("labs/api-t4/internal/repo/audit.go");
const repoBiasaGo = baca("labs/api-t4/internal/repo/audit_biasa.go");
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
  perangkat?: { id: string; label: string }[];
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { bagian?: number; id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; masalah?: string }
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
const KATA: Record<number, string> = { 0: "nol", 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh", 8: "delapan" };
const kata = (n: number): string => KATA[n] ?? String(n);
const Kata = (n: number): string => kata(n)[0]!.toUpperCase() + kata(n).slice(1);
const rapat = (t: string): string => t.replace(/\s+/g, " ").trim();

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
const R = bagian(rantaiTxt);
const L = bagian(roleTxt);
const P = bagian(peranSql);
const G = bagian(auditGo);
const BO = bagian(boGo);

// rantai.txt: bagian A, B, C
const rA = R.nomor((b) => b.startsWith("# --- A. "));
const rB = R.nomor((b) => b.startsWith("# --- B. "));
const rC = R.nomor((b) => b.startsWith("# --- C. "));
const textA = R.teks(rA, rB - 1);
const textB = R.teks(rB, rC - 1);
const rAksi = R.nomor((b) => b.startsWith("# Enam aksi sudah terjadi: "), rA);
const rJawab = R.nomor((b) => b.startsWith("# Jawaban untuk Dina, yang akunnya disentuh enam aksi"), rAksi);
const AKSI_A = cocok(R.baris[rAksi - 1]!, /^# Enam aksi sudah terjadi: (.+)\.$/)[1]!.split(", ");
const BARIS_AUDIT_A = Number(cocok(textA, /baris_audit\n-+\n (\d+)/)[1]);
const jawabA = [...textA.matchAll(/=> SELECT id, aksi, objek FROM audit_log WHERE objek = 'akun:(\d+)'[^\n]*\n[^\n]*\n[^\n]*\n\((\d+) rows?\)/g)].map((m) => [m[1]!, Number(m[2])] as [string, number]);
const tabelBaris = (teks: string): { id: number; pelaku: number; aksi: string; objek: string; penyetuju: string }[] =>
  [...teks.matchAll(/^ (\d+)\s+\| (\d+)\s+\| (\w+)\s+\| (\S+)\s+\|\s*(\d*)\s*$/gm)].map((m) => ({ id: Number(m[1]), pelaku: Number(m[2]), aksi: m[3]!, objek: m[4]!, penyetuju: m[5]! }));
const rUpdate = R.nomor((b) => b === "=> [api_t4] UPDATE audit_biasa SET pelaku_id = 421 WHERE aksi = 'buka_berkas'", rB);
const rBolong = R.nomor((b) => b.startsWith(" baris | nomor_terbesar | nomor_bolong"), rB);
const rTabel1 = R.teks(rB, rUpdate);
const rTabel2 = R.teks(rUpdate, rC - 1);
const SEBELUM = tabelBaris(rTabel1);
const SESUDAH = tabelBaris(rTabel2);
const bolong = cocok(R.baris[rBolong + 1]!, /^ (\d+)\s+\| (\d+)\s+\| (\d+)\s*$/);
const BARIS_B = Number(bolong[1]), TERBESAR_B = Number(bolong[2]), BOLONG_B = Number(bolong[3]);
const teksC = R.teks(rC, R.baris.length);
const verifC = [...teksC.matchAll(/^verifikasi rantai: (.+)$/gm)].map((m) => m[1]!);
// role.txt
const lA = L.nomor((b) => b.startsWith("# --- A. "));
const lB = L.nomor((b) => b.startsWith("# --- B. "));
const lC = L.nomor((b) => b.startsWith("# --- C. "));
const lD = L.nomor((b) => b.startsWith("# --- D. "));
const lSuperAkhir = L.nomor((b) => b === "(5 rows)", lA);
const lMulai = L.nomor((b) => b.startsWith("# Engineer yang membaca tabel verifikasi sebagai pemilik schema (role lab)"), lC);
const lAkhir = L.nomor((b) => b === "# Baris audit sebelum dan sesudah membaca: sama.", lMulai);
const superuser = [...L.teks(lA, lB - 1).matchAll(/^ (\w+)\s+\| ([tf])$/gm)].map((m) => [m[1]!, m[2]!] as [string, string]);
// peran.sql, t4_audit.go, bo.go
const pGrant = P.nomor((b) => b === "GRANT SELECT, INSERT, UPDATE, DELETE ON {s}.audit_biasa TO api_t4;");
const gAwal = G.nomor((b) => b.startsWith("func (s Service) Audit("));
const gAkhir = G.nomor((b) => b === "}", gAwal);
const boAwal = BO.nomor((b) => b.startsWith("func (s Service) LihatVerifikasiBO("));
const boAkhir = BO.nomor((b) => b === "}", boAwal);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);
const langSnippet = tag.map((t) => t.match(/lang="([^"]+)"/)?.[1]);

// naskah M38
const barisM38 = naskah.split("\n").find((b) => b.startsWith("| M38 |"))!;
const barisAdr43 = naskah.split("\n").find((b) => b.startsWith("| 43 |"))!;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.24 ada, masalah, jalur inti, prasyarat 4.13 dan 4.15, lab t4-audit, peran security dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m38")).toMatchObject({ ada: true, nomor: "4.24", jenis: "masalah", bagian: 4, inti: true, prasyarat: ["t4-modul", "t4-storage"], lab: ["t4-audit"], tahap: 4, peran: ["security", "backend"] });
    expect(dari("t4-audit").nomor).toBe("4.25");
    expect(dari("t4-modul").nomor).toBe("4.13");
    expect(dari("t4-storage").nomor).toBe("4.15");
    expect(frontmatter).toContain('title: "4.24 M38: Siapa yang membuka data Budi?"');
    expect(frontmatter).toContain('description: "Minggu 11. Rekeningo tidak bisa menjawab siapa yang membuka data identitas Budi dalam 30 hari terakhir: catatan tidak ada, bisa diubah, atau tidak mencakup pembacaan langsung."');
    expect(dari("t4-m38").judul).toBe("M38: Siapa yang membuka data Budi?");
    expect(dari("t4-m38").masalah).toBe("Tidak ada yang bisa menjawab siapa yang membuka data identitas Budi dalam 30 hari terakhir");
    expect(naskah).toContain("| 4.24 | 4 | M38: Siapa yang membuka data Budi? | Masalah | ★ | t4-audit | alur |");
    expect(barisM38).toMatch(/^\| M38 \| 11 \|/);
    expect(dari("t4-m38").label).toBe("Masalah 38 · minggu 11");
    harus("Minggu 11 Tahap 4.");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-modul\]\], \[\[t4-storage\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m38").menit).toBe(Number(m[1]) + Number(m[2]));
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
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah; ADR 43 hanya satu kali", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t4-audit", "t4-modul", "t4-storage"]);
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t4-audit").adr).toEqual([43]);
    expect(dari("t4-audit").judul.startsWith("Keamanan 9: Back office, audit log berantai")).toBe(true);
    expect(naskah).toMatch(/\| 4\.25 \| \d+ \| Keamanan 9: Back office, audit log berantai/);
    expect(dari("t4-modul").judul.startsWith("Modular monolith")).toBe(true);
    expect(dari("t4-storage").judul.startsWith("Keamanan 7: File identitas")).toBe(true);
    harus("- [[t4-audit]]: back office dengan peran, catatan yang bisa diperiksa, dan agen baca-saja. Keputusannya ADR 43.");
    harus("Cara memeriksa rantai dan batasnya dibahas di [[t4-audit]].");
    expect(badan.match(/ADR \d+/g)).toEqual(["ADR 43"]);
  });
  test("janji ke 4.25 ditepati menurut naskah: ADR 43 memuat audit_log berantai, baris palsu lolos, dan agen baca-saja; halaman tidak membuka isinya", () => {
    expect(barisAdr43).toContain("`audit_log` append-only dengan hash berantai");
    expect(barisAdr43).toContain("baris palsu di ujung dengan hash benar lolos");
    expect(barisAdr43).toContain("Agen AI di back office hanya baca lewat MCP server");
    expect(naskah).toContain("| Audit log berantai | \"Tidak ada catatan\" sama nilainya dengan \"tidak tahu\" | M38 |");
    expect(badan).not.toMatch(/jangkar|MCP|HMAC|persetujuan dua orang|dua orang|pgaudit|go-sdk|append-only/i);
    expect(badan.match(/baris palsu/g)).toHaveLength(1);
  });
});

describe("naskah M38: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M38 di naskah: minggu 11, Budi, 30 hari, Pak Hadi, layanan verifikasi, Ratih, akun bersama, dua mode, Dina bukan Budi", () => {
    expect(barisM38).toContain("Budi menerima pesan dari orang tak dikenal yang menyebut nama lengkap dan nomor identitasnya. Pak Hadi bertanya: siapa yang membuka data Budi dalam 30 hari terakhir? Tidak ada yang bisa menjawab (Ilustrasi).");
    expect(barisM38).toContain('| Layanan verifikasi yang bocor; Ratih: "Kami hanya melihat data bila perlu" |');
    expect(barisM38).toContain("Back office versi pertama memakai satu akun bersama untuk tim risk");
    expect(barisM38).toContain("Lab memerankannya dengan dua mode: tanpa audit tidak mencatat apa pun, dan log biasa mencatat semua aksi (termasuk membuka file) tanpa hash; \"sebagian\" tidak direkam");
    expect(barisM38).toContain("Pemilik data di rekaman adalah Dina (akun 40001), bukan Budi.");
    expect(barisM38).toContain("Engineer membaca tabel `verifikasi` lewat role pemilik schema, yang melewati semua pembatasan dan tidak meninggalkan catatan.");
    expect(barisM38).toContain("Sumber pesan ke Budi tidak pernah dibuktikan.");
    expect(barisM38).toContain('jawaban "tidak ada" sama nilainya dengan "tidak tahu"');
    expect(naskah).toContain("| **Ratih** | Analis risiko, memimpin tim risk (3 orang)");
    expect(naskah).toContain("**Pak Hadi** menambah satu syarat");
  });
  test("kalimat Gejala: minggu, tokoh, 30 hari dari naskah; Ilustrasi menyebut semua unsur cerita; tanpa kalimat definisi, konsep, nomor identitas, atau regulasi", () => {
    harus("Minggu 11 Tahap 4. Budi menerima pesan dari nomor yang tidak ia kenal. Pengirimnya menulis nama lengkap Budi dan nomor identitasnya.");
    harus("Ia bertanya satu hal kepada Raka: siapa yang membuka data identitas Budi dalam 30 hari terakhir?");
    harus("*Angka cerita (Ilustrasi):* pesan ke Budi, waktu 30 hari, dugaan Raka, dan jawaban Ratih berasal dari cerita, bukan dari rekaman. Rekaman memuat pertanyaan Pak Hadi yang sama, tetapi tentang Dina.");
    const gejala = cocok(badan, /<Blok nama="Gejala" buka>([\s\S]*?)<\/Blok>/)[1]!;
    expect(gejala.replace(/\*Angka cerita[\s\S]*$/, "")).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut|audit|role|hash|superuser|back office)\b/i);
    expect(badan).not.toMatch(/\b\d{12,}\b|UU PDP|undang-undang|izin|regulasi|kepatuhan/i);
    expect(`${rantaiTxt}${roleTxt}`).not.toMatch(/pesan ke Budi|30 hari|nomor identitasnya/);
    expect(R.baris[rA - 1]).toBe("# --- A. Versi pertama: aksi berjalan, tidak ada catatan. Pak Hadi bertanya siapa yang membuka data Dina (akun 40001) ---");
  });
  test("yang dikira sebelum yang sebenarnya; dugaan layanan verifikasi dan jawaban Ratih dari naskah; tebakan tersembunyi di details", () => {
    expect(badan.indexOf('<Blok nama="Yang Raka kira"')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    harus('Ratih, analis risiko di tim risk, menjawab: "Kami hanya melihat data bila perlu."');
    harus("Raka menduga data Budi bocor dari layanan verifikasi, yaitu pihak luar yang memeriksa kartu identitas pendaftar.");
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(d[1]).toBe("Tebak dulu: anggap layanan verifikasi tidak bocor. Apa yang bisa Raka baca di Rekeningo untuk tahu siapa dari dalam yang membuka data Budi?");
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(d[2]).toBe(`Tidak ada yang bisa menjawabnya. Di lab, back office versi pertama menjalankan ${kata(AKSI_A.length)} aksi atas satu akun dan tabel catatan tetap kosong (dibaca di blok berikutnya, Rekaman lab).`);
  });
});

describe("rekaman rantai.txt dan role.txt: nilai yang dikutip, Hitungan, dan klaim berlingkup", () => {
  test("bagian A: enam aksi, nol baris catatan, jawaban untuk Dina (40001) dan Eko (40002) sama-sama nol", () => {
    expect(AKSI_A).toEqual(["Ratih melihat akun", "melihat pengajuan", "membuka kartu identitas", "membekukan", "membuka", "mengubah batas"]);
    expect(BARIS_AUDIT_A).toBe(0);
    expect(jawabA).toEqual([["40001", 0], ["40002", 0]]);
    expect(R.baris[rJawab - 1]).toBe("# Jawaban untuk Dina, yang akunnya disentuh enam aksi, dan untuk Eko, yang tidak pernah disentuh, sama: nol baris. 'Tidak ada catatan' sama nilainya dengan 'tidak tahu'.");
    expect(rJawab).toBe(rAksi + 15);
    expect(R.baris[0]).toBe("# Lab t4-audit · log biasa lawan log berantai: mengubah, menambah, dan menghapus baris audit");
    expect(R.baris[1]).toBe("# PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) · go1.27.1 · pgx v5.11.0 · schema tahap4_audit · server Go di 127.0.0.1:18280");
    expect(R.baris[3]).toBe("# server: ./api-t4 -lab -rentan bo-tanpa-audit (back office versi pertama: semua aksi berjalan, tidak ada catatan)");
    harus(`Ratih menjalankan ${kata(AKSI_A.length)} aksi atas data Dina (akun 40001): melihat akun, melihat pengajuan, membuka kartu identitas, membekukan, membuka blokir, dan mengubah batas harian.`);
    harus(`Di mode ini tabel \`audit_log\` berisi ${kata(BARIS_AUDIT_A)} baris. Eko (akun 40002) tidak pernah dilihat siapa pun, dan jawaban untuknya juga ${kata(jawabA[1]![1])} baris:`);
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan database lab yang dibuat bersih untuk tiap bagian.");
    expect(readmeAudit).toContain("Setiap bagian membuat ulang schema, tiga role");
    expect(persetujuanTxt).toContain("Ratih adalah akun 420, Tim Risk Dua 421, Dina 40001, Eko 40002, Budi 419 (karyawan)");
    harus("lab memakai akun terpisah untuk tiap staf, yaitu Ratih (akun 420) dan Tim Risk Dua (akun 421).");
  });
  test("bagian B: enam baris log biasa, pelaku 420, penyetuju 421 di dua baris; UPDATE mengganti pelaku baris 3; DELETE menghapus bekukan; lima baris, nomor bolong 1 (Hitungan 6 − 5)", () => {
    expect(SEBELUM.map((r) => r.aksi)).toEqual(["lihat_akun", "lihat_verifikasi", "buka_berkas", "bekukan", "buka_blokir", "ubah_batas"]);
    expect(SEBELUM.every((r) => r.pelaku === 420)).toBe(true);
    expect(SEBELUM.filter((r) => r.penyetuju === "421").map((r) => r.aksi)).toEqual(["buka_blokir", "ubah_batas"]);
    expect(SEBELUM.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(SESUDAH.map((r) => r.id)).toEqual([1, 2, 3, 5, 6]);
    expect(SESUDAH.map((r) => r.aksi)).not.toContain("bekukan");
    expect(SESUDAH.find((r) => r.id === 3)).toMatchObject({ aksi: "buka_berkas", pelaku: 421 });
    expect(SEBELUM.find((r) => r.id === 3)).toMatchObject({ aksi: "buka_berkas", pelaku: 420 });
    expect(R.baris[rUpdate]).toBe("UPDATE 1");
    expect(R.baris[rUpdate + 2]).toBe("DELETE 1");
    expect(R.baris[rUpdate + 1]).toBe("=> [api_t4] DELETE FROM audit_biasa WHERE aksi = 'bekukan'");
    expect([BARIS_B, TERBESAR_B, BOLONG_B]).toEqual([5, 6, 1]);
    expect(BOLONG_B).toBe(TERBESAR_B - BARIS_B);
    expect(SEBELUM).toHaveLength(6);
    expect(R.baris[rB - 1]).toBe("# --- B. Log biasa: aksi tercatat, tetapi siapa pun yang bisa menulis tabelnya bisa mengubah catatan tanpa jejak ---");
    expect(R.baris.slice(rBolong + 3).join("\n")).toContain("verifikasi rantai di mode ini: 0 baris, utuh: ya");
    harus(`Sesudah satu UPDATE dan satu DELETE, tabel berisi ${kata(BARIS_B)} baris. Kartu identitas Dina kini tercatat dibuka oleh akun 421, dan pembekuan hilang. Nomor yang bolong adalah Hitungan, yaitu angka dari angka lain di rekaman: nomor terbesar ${TERBESAR_B} − ${BARIS_B} baris = ${BOLONG_B}, dan rekaman mencetak ${BOLONG_B} juga.`);
    harus(`enam aksi yang sama masuk ke tabel \`audit_biasa\``);
    expect(R.baris[rUpdate - 2]).toBe("# Yang menulis ulang di sini adalah role aplikasi api_t4 (hak SELECT, INSERT, UPDATE, DELETE atas audit_biasa, setelan versi pertama).");
    expect(R.teks(rUpdate, rBolong + 3)).toContain("UPDATE tidak meninggalkan petunjuk apa pun");
  });
  test("bagian C: log berantai: ubah baris 3 terdeteksi di baris 3, baris ke-7 palsu lolos, hapus baris 2 terdeteksi di baris 3", () => {
    expect(verifC).toEqual(["6 baris, utuh: ya", "6 baris, utuh: tidak, rusak di baris 3", "6 baris, utuh: ya", "7 baris, utuh: ya", "6 baris, utuh: tidak, rusak di baris 3"]);
    expect(teksC).toContain("=> [t4a_pemilik] UPDATE audit_log SET pelaku_id = 421 WHERE id = 3\nUPDATE 1");
    expect(teksC).toContain("=> [t4a_pemilik] INSERT INTO audit_log (...) VALUES (... 'buka_berkas', 'verifikasi:1/swafoto', ..., <hash_sebelumnya>, <hash hitungan skrip>)\nINSERT 0 1");
    expect(teksC).toContain("=> [t4a_pemilik] DELETE FROM audit_log WHERE id = 2\nDELETE 1");
    expect(teksC).toContain("# Rantai tidak membuktikan siapa yang menulis baris: tanpa kunci rahasia, siapa pun yang bisa menulis dan tahu rumusnya bisa menambah baris yang lolos.");
    expect(teksC).toContain("# Pemilik tabel menambah baris ke-7 dengan hash yang ia hitung sendiri dari rumus yang sama (skrip lab, bukan app):");
    harus("Pemilik tabel yang mengubah satu baris atau menghapus satu baris terdeteksi, tetapi baris palsu di ujung dengan hash yang benar lolos (Rekaman lab, `rantai.txt` bagian C).");
    expect(readmeAudit).toContain("Penulis yang menghitung ulang hash dari baris yang ia ubah sampai ujung membuat verifikasi lolos");
  });
  test("role.txt: lab superuser (rolsuper t) dan api_t4 bukan; baca verifikasi sebagai role lab = 1 pengajuan; jumlah baris audit sama; pemilik schema disebut di rekaman", () => {
    expect(superuser).toEqual([["api_t4", "f"], ["lab", "t"], ["t4a_agen", "f"], ["t4a_pemilik", "f"], ["t4a_verifikator", "f"]]);
    expect(L.baris[lMulai - 1]).toBe("# Engineer yang membaca tabel verifikasi sebagai pemilik schema (role lab) tidak meninggalkan baris audit:");
    expect(L.baris[lMulai]).toBe("=> [lab] SELECT count(*) AS pengajuan_dibaca FROM verifikasi");
    expect(L.teks(lMulai + 1, lAkhir)).toMatch(/pengajuan_dibaca\n-+\n 1\n\(1 row\)/);
    expect(lAkhir).toBe(lMulai + 6);
    expect(roleTxt).toContain(" audit_log | t4a_pemilik");
    expect(lMulai).toBeGreaterThan(lC);
    expect(lMulai).toBeLessThan(lD);
    expect(lB).toBeGreaterThan(lA);
    harus("Engineer yang membuka database langsung memakai role `lab`. Superuser adalah role yang melewati semua pemeriksaan hak kecuali hak untuk login ([PostgreSQL 17, Role Attributes](https://www.postgresql.org/docs/17/role-attributes.html), dibuka 2026-10-30, Tidak dijalankan). Di lab itu `lab` adalah pemilik schema dan sekaligus superuser (`role.txt` bagian A dan C).");
    harus("Rekaman membaca tabel `verifikasi`, yaitu tabel pengajuan verifikasi identitas, dan menghitung baris `audit_log` sebelum dan sesudahnya:");
    // jalankan skrip: hitungan baris audit dibandingkan sebelum dan sesudah (harap n2 == n1)
    const runPy = baca("labs/t4-audit/run.py");
    expect(runPy).toContain('harap(n2, n1, "membaca verifikasi sebagai pemilik schema tidak menulis audit")');
  });
  test("peran.sql: api_t4 memegang SELECT, INSERT, UPDATE, DELETE atas audit_biasa; komentar menyebut versi pertama dan mode bo-log-biasa; bukan temuan lab", () => {
    expect(P.baris[pGrant - 1]).toBe("GRANT SELECT, INSERT, UPDATE, DELETE ON {s}.audit_biasa TO api_t4;");
    expect(P.baris[pGrant - 2]).toBe("-- Versi pertama (M38): log biasa dengan hak penuh untuk role aplikasi. Hanya dipakai mode bo-log-biasa.");
    expect(readmeAudit).toContain("dan hak penuh `api_t4` atas `audit_biasa` (setelan versi pertama)");
    expect(readmeAudit).toContain("**Skrip berperan sebagai penyerang dengan hak tulis.**");
    harus("Role adalah identitas di database yang memegang hak atas tabel. Yang menulis ulang di rekaman adalah role aplikasi `api_t4`, karena versi pertama memberinya hak mengubah dan menghapus tabel itu. Hak itu setelan lab untuk versi pertama, bukan temuan. Dua perintah di bawah dikirim skrip lab, bukan terjadi karena kesalahan sistem:");
  });
});

describe("kode lab: mode, Audit, LihatVerifikasiBO, migrasi, dan klaim negatif berlingkup", () => {
  test("mode rentan: bo-tanpa-audit dan bo-log-biasa; Audit keluar tanpa menulis di mode pertama dan menulis ke tabel biasa di mode kedua", () => {
    expect(aturanGo).toContain('RentanTanpaAudit      = "bo-tanpa-audit"');
    expect(auditGo).toContain('const RentanLogBiasa = "bo-log-biasa"');
    expect(G.teks(gAwal, gAkhir)).toBe([
      "func (s Service) Audit(ctx context.Context, tx repo.Tx, pelaku int64, peran, aksi, objek, alasan string, penyetuju *int64) error {",
      "\tif s.rentan == RentanTanpaAudit {",
      "\t\treturn nil",
      "\t}",
      "\tif s.rentan == RentanLogBiasa {",
      "\t\t_, err := tx.TulisAuditBiasa(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)",
      "\t\treturn err",
      "\t}",
      "\t_, err := tx.TulisAudit(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)",
      "\treturn err",
      "}",
    ].join("\n"));
    expect([gAwal, gAkhir]).toEqual([16, 26]);
    harus("Lab memerankan versi pertama dengan flag `-rentan`, yaitu server yang sama dengan perilaku versi pertama. Pada mode `bo-tanpa-audit`, fungsi `Audit` keluar tanpa menulis apa pun (Tidak dijalankan: dibaca dari kode). Cabang kedua, `bo-log-biasa`, dibahas di bawah:");
    expect(R.baris[3]).toContain("-rentan bo-tanpa-audit");
    expect(rantaiTxt).toContain("# server: ./api-t4 -lab -rentan bo-log-biasa (aksi yang sama dicatat di tabel biasa tanpa hash; role aplikasi punya hak tulis penuh atas tabel itu)");
  });
  test("audit_biasa: tabel hanya di lab (bukan migrasi), tanpa kolom hash; migrasi tanpa trigger yang menulis audit_log; INSERT audit_log hanya di repo/audit.go", () => {
    expect(repoBiasaGo).toContain("Tabelnya dibuat lab\n// t4-audit dan tes (audit_biasa.sql), bukan migration.");
    // seluruh migrasi yang dipakai lab api-t4 (dasar_t4.py: MIGRASI_T2, MIGRASI_T3, MIGRASI_T4, dan b4-migration/baru/000005)
    const dasar = baca("labs/api-t4/dasar_t4.py");
    expect(dasar).toContain('MIGRASI_T2 = sorted((T2 / "migrasi").glob("*.up.sql"))');
    expect(dasar).toContain('MIGRASI_T3 = sorted((T3 / "migrasi").glob("*.up.sql"))');
    expect(dasar).toContain('MIGRASI_T4 = sorted((HERE / "migrasi").glob("*.up.sql"))');
    expect(dasar).toContain('(LABS / "b4-migration/baru/000005_batas_saldo_warung.up.sql")');
    const migrasi = [...(terlacak ?? new Set<string>())].filter((f) => /^labs\/api-t[234]\/migrasi\/[^/]+\.up\.sql$/.test(f) || f === "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql");
    expect(migrasi.length).toBeGreaterThanOrEqual(15);
    for (const f of migrasi) expect(baca(f), f).not.toContain("audit_biasa");
    for (const f of migrasi) {
      const t = baca(f);
      expect(/CREATE (OR REPLACE )?TRIGGER|RETURNS trigger/i.test(t) && /audit_log/.test(t), `trigger yang menulis audit_log di ${f}`).toBe(false);
    }
    expect(baca("labs/api-t4/migrasi/000023_kartu_audit.up.sql")).toContain("CREATE TABLE audit_log (");
    const ddl = baca("labs/api-t4/internal/repo/audit_biasa.sql");
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS audit_biasa (");
    expect(ddl.split("\n").filter((b) => !b.startsWith("--")).join("\n")).not.toMatch(/hash/);
    const sisipAudit = (terlacak ? [...terlacak] : []).filter((f) => f.startsWith("labs/api-t4/") && f.endsWith(".go") && !f.endsWith("_test.go") && /INSERT INTO audit_log/.test(fs.readFileSync(path.join(akar, f), "utf8")));
    expect(sisipAudit).toEqual(["labs/api-t4/internal/repo/audit.go"]);
    expect(repoAuditGo).toContain("INSERT INTO audit_log (waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id, hash_sebelumnya, hash)");
    harus("enam aksi yang sama masuk ke tabel `audit_biasa`, yang hanya ada di lab untuk mode ini. Tabel itu tidak punya pemeriksaan apakah sebuah baris pernah diubah.");
    harus("Migrasi database lab tidak memuat trigger yang menulis `audit_log`.");
    harus("Tabel `audit_biasa` tidak punya deteksi itu.");
  });
  test("LihatVerifikasiBO membaca pengajuan dan memanggil Audit dalam transaction yang sama; hanya tujuh panggilan Audit di bo.go; VerifikasiAuditBO tidak memanggil Audit (jadi klaim berbunyi fungsi aksi, bukan tiap fungsi)", () => {
    const fungsi = BO.teks(boAwal, boAkhir);
    expect(fungsi).toContain("err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {");
    expect(fungsi).toContain("v, err = tx.Verifikasi(ctx, id)");
    expect(fungsi).toContain('return s.Audit(ctx, tx, pelaku, "risk", "lihat_verifikasi", fmt.Sprintf("verifikasi:%d", id), "", nil)');
    expect(fungsi.indexOf("tx.Verifikasi(")).toBeLessThan(fungsi.indexOf("s.Audit("));
    expect([boAwal, boAkhir]).toEqual([147, 163]);
    expect(boGo.match(/s\.Audit\(ctx, tx, pelaku, "risk", /g)).toHaveLength(7);
    const vab = BO.teks(BO.nomor((b) => b.startsWith("func (s Service) VerifikasiAuditBO(")), BO.baris.length);
    expect(vab).not.toContain("s.Audit(");
    for (const a of ["lihat_akun", "lihat_verifikasi", "buka_berkas", "ubah_batas"]) expect(boGo, a).toContain(`"${a}"`);
    harus("Catatan ditulis oleh kode aplikasi, di dalam fungsi aksi back office. Migrasi database lab tidak memuat trigger yang menulis `audit_log`. Fungsi `LihatVerifikasiBO` membaca pengajuan, lalu memanggil `Audit` dalam transaction yang sama (Tidak dijalankan: dibaca dari kode):");
    harus("Query yang dikirim langsung ke database tidak melewati fungsi itu, jadi tidak ada panggilan `Audit`.");
  });
  test("log server PostgreSQL: database lab dari labs/b3-race dengan log_statement=all; t4-audit memakai compose itu; rekaman tidak membaca log server", () => {
    expect(composeRace).toContain('"-c", "log_statement=all"');
    expect(makeAudit).toContain("$(MAKE) -C ../b3-race up");
    expect(`${rantaiTxt}${roleTxt}`).not.toMatch(/log_statement|pgaudit|log server/);
    harus("- Log server PostgreSQL tidak dibaca rekaman ini. Bawaan `log_statement` adalah `none` ([PostgreSQL 17, Error Reporting and Logging](https://www.postgresql.org/docs/17/runtime-config-logging.html), dibuka 2026-10-30, Tidak dijalankan), tetapi database lab dijalankan dengan `log_statement=all` (`labs/b3-race`). Apakah pembacaan engineer muncul di log server itu tidak diperiksa.");
    expect(readmeAudit).toContain("ekstensi audit seperti pgaudit: Tidak dijalankan");
  });
  test("yang tidak direkam: akun bersama dan log sebagian hanya cerita; lab memakai dua mode dan akun staf masing-masing; sumber pesan tidak dibuktikan", () => {
    expect(readmeAudit).toContain("\"sebagian aksi tercatat\" tidak direkam");
    expect(readmeAudit).toContain("Lab memakai akun petugas masing-masing");
    expect(readmeAudit).toContain("**Pemilik data** di rekaman adalah Dina (akun publik 40001)");
    harus("- Pesan ke Budi, waktu 30 hari, dan pertanyaan Pak Hadi hanya ada di cerita (Ilustrasi).");
    harus("- Sumber pesan ke Budi tidak pernah dibuktikan. Lab tidak punya layanan verifikasi sungguhan (Tidak dijalankan), jadi dugaan Raka tidak bisa dibenarkan atau dibantah. Yang terbukti hanya satu hal: Rekeningo tidak bisa menjawab pertanyaan Pak Hadi.");
    harus("- Satu akun bersama dan log yang mencatat sebagian aksi hanya ada di cerita. Lab memakai dua mode: tanpa catatan, dan log biasa yang mencatat semua aksi, termasuk membuka file.");
    expect(readmeAudit).toContain("Semua pihak ketiga tidak ada");
  });
  test("rentang Snippet: berkas, rentang baris, bahasa, dan judul diturunkan dari kode dan rekaman, bukan angka tangan", () => {
    const harap: [string, string, string | undefined, string][] = [
      ["labs/api-t4/internal/service/t4_audit.go", `${gAwal}:${gAkhir}`, "go", "Kode lab"],
      ["labs/t4-audit/output/rantai.txt", `${rAksi}:${rJawab}`, undefined, "Rekaman lab"],
      ["labs/t4-audit/peran.sql", `${pGrant}:${pGrant}`, "sql", "Kode lab"],
      ["labs/t4-audit/output/rantai.txt", `${rUpdate}:${rBolong + 3}`, undefined, "Rekaman lab"],
      ["labs/t4-audit/output/role.txt", `${lMulai}:${lAkhir}`, undefined, "Rekaman lab"],
      ["labs/api-t4/internal/service/bo.go", `${boAwal}:${boAkhir}`, "go", "Kode lab"],
      ["labs/t4-audit/output/rantai.txt", `${rAksi}:${rJawab}`, undefined, "Rekaman lab"],
    ];
    expect(tag).toHaveLength(harap.length);
    harap.forEach(([berkas, rentang, bahasa, jenis], i) => {
      expect(berkasSnippet[i], `Snippet ${i + 1}`).toBe(berkas);
      expect(lines[i], `Snippet ${i + 1}`).toBe(rentang);
      expect(langSnippet[i], `Snippet ${i + 1}`).toBe(bahasa);
      const [a, b] = rentang.split(":").map(Number) as [number, number];
      expect(judulSnippet[i]!.startsWith(a === b ? `${jenis}: ${berkas} baris ${a} (` : `${jenis}: ${berkas} baris ${a} sampai ${b} (`), `judul Snippet ${i + 1}`).toBe(true);
    });
    expect(R.baris[rUpdate - 1]).toBe("=> [api_t4] UPDATE audit_biasa SET pelaku_id = 421 WHERE aksi = 'buka_berkas'");
    expect(R.baris[rBolong]).toMatch(/^-+/);
    expect(R.baris[rBolong + 2]).toBe("(1 row)");
    // tinjauan: keterangan dalam kurung di judul tiap Snippet adalah klaim
    expect(judulSnippet.map((j) => j!.match(/\(([^)]+)\)$/)![1])).toEqual([
      "mode tanpa catatan dan mode log biasa",
      "enam aksi, nol baris catatan, jawaban Dina dan Eko sama",
      "hak role aplikasi atas tabel log biasa",
      "satu baris diubah, satu dihapus, nomor bolong 1",
      "baca tabel verifikasi sebagai role lab, catatan tidak bertambah",
      "pembacaan dan catatan dalam satu transaction",
      "bagian A: nol baris untuk Dina dan Eko",
    ]);
    // yang tampil di Snippet: tanpa komentar internal (nomor keputusan, PR, ID riset, nama tes)
    const tampil = [G.teks(gAwal, gAkhir), R.teks(rAksi, rJawab), P.teks(pGrant, pGrant), R.teks(rUpdate, rBolong + 3), L.teks(lMulai, lAkhir), BO.teks(boAwal, boAkhir)];
    for (const t of tampil) expect(t).not.toMatch(/keputusan \d|PR #|\bR\d-\d+\b|Test[A-Z]\w+|\bM38\b/);
    expect(BO.baris[boAwal - 2]).toBe("// LihatVerifikasiBO membaca metadata satu pengajuan (tanpa file) dan mencatatnya.");
    expect(BO.baris[boAwal - 2]).not.toMatch(/^\s*$/); // komentar di atas fungsi tidak ikut tampil: rentang mulai di func
    expect(BO.baris[boAwal - 1]!.startsWith("func ")).toBe(true);
  });
});

describe("baris riset R4-225 sampai R4-229, label turunan, dan rujukan luar", () => {
  test("lima baris riset: ID urut tanpa ganda, tanggal akses 2026-10-30, URL, kutipan, rentang baris sama dengan Snippet, tujuh kolom", () => {
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    const nomor = ids.map((s) => Number(s.slice(3)));
    const iAwal = ids.indexOf("R4-225");
    expect(ids.slice(iAwal, iAwal + 5)).toEqual(["R4-225", "R4-226", "R4-227", "R4-228", "R4-229"]);
    expect(nomor[iAwal - 1]!).toBeLessThan(225);
    expect(nomor[iAwal + 5]!).toBeGreaterThan(229);
    for (const id of ids.slice(iAwal, iAwal + 5)) expect(barisRiset(id).split("|").length, id).toBe(7);
    for (const id of ["R4-226", "R4-227", "R4-228", "R4-229"]) expect(barisRiset(id), id).toContain("dibuka 2026-10-30");
    const r25 = barisRiset("R4-225");
    expect(r25).toContain(`\`labs/t4-audit/output/rantai.txt\` baris ${rAksi} sampai ${rJawab}`);
    expect(r25).toContain(`baris ${rUpdate} sampai ${rBolong + 3} (bagian B`);
    expect(r25).toContain(`baris ${rC + 1} sampai ${R.baris.length - (R.baris[R.baris.length - 1] === "" ? 1 : 0)} (bagian C`);
    expect(r25).toContain(`\`role.txt\` baris ${lMulai} sampai ${lAkhir}`);
    expect(r25).toContain(`baris ${lA + 1} sampai ${lSuperAkhir} (bagian A: \`lab\` rolsuper t); baris ${lMulai} menyebut \`lab\` sebagai pemilik schema`);
    expect(r25).toContain(`\`labs/t4-audit/peran.sql\` baris ${pGrant}`);
    expect(r25).toContain(`\`labs/api-t4/internal/service/t4_audit.go\` baris ${gAwal} sampai ${gAkhir}`);
    expect(r25).toContain(`\`internal/service/bo.go\` baris ${boAwal} sampai ${boAkhir}`);
    expect(r25).toContain("(dibaca untuk halaman 4.24, tanpa menjalankan ulang)");
    expect(barisRiset("R4-226")).toContain("cwe.mitre.org/data/definitions/778.html");
    expect(barisRiset("R4-226")).toContain('"When a security-critical event occurs, the product either does not record the event or omits important details about the event when logging it."');
    expect(barisRiset("R4-226")).toContain("There will be no trail for forensic analysis");
    expect(barisRiset("R4-227")).toContain("cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html");
    expect(barisRiset("R4-227")).toContain('"Build in tamper detection so you know if a record has been modified or deleted"');
    expect(barisRiset("R4-228")).toContain("postgresql.org/docs/17/role-attributes.html");
    expect(barisRiset("R4-228")).toContain('"A database superuser bypasses all permission checks, except the right to log in."');
    expect(barisRiset("R4-229")).toContain("postgresql.org/docs/17/runtime-config-logging.html");
    expect(barisRiset("R4-229")).toContain('"The default is `none`."');
    expect(barisRiset("R4-229")).toContain("`log_statement=all` (`labs/b3-race/docker-compose.yml`)");
    for (const id of ["R4-225", "R4-226", "R4-227", "R4-228", "R4-229"]) expect(barisRiset(id).match(/\b4\.24\b/g)!.length, id).toBeGreaterThanOrEqual(1);
  });
  test("tautan luar di halaman: CWE-778, OWASP Logging, PostgreSQL 17 Role Attributes dan Error Reporting; tiap URL ada di baris riset dan memakai tanggal akses yang sama", () => {
    const url = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(url).toEqual([
      "https://cwe.mitre.org/data/definitions/778.html",
      "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
      "https://www.postgresql.org/docs/17/role-attributes.html",
      "https://www.postgresql.org/docs/17/runtime-config-logging.html",
    ]);
    const ids = ["R4-226", "R4-227", "R4-228", "R4-229"];
    url.forEach((u, i) => expect(barisRiset(ids[i]!), u).toContain(u.replace("https://", "").replace("www.", "")));
    expect(badan.match(/dibuka 2026-10-30/g)).toHaveLength(4);
    harus("Daftar jenis kelemahan perangkat lunak CWE (Common Weakness Enumeration) menamai keadaan ini Insufficient Logging. Kejadian penting keamanan tidak dicatat, jadi tidak ada catatan untuk analisis forensik ([CWE-778](https://cwe.mitre.org/data/definitions/778.html), dibuka 2026-10-30, Tidak dijalankan).");
    harus("Log biasa lebih baik daripada tidak ada catatan, tetapi isinya tidak bisa diperiksa. OWASP menyarankan catatan dilengkapi deteksi perubahan, supaya ketahuan bila sebuah baris diubah atau dihapus ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), dibuka 2026-10-30, Tidak dijalankan). Tabel `audit_biasa` tidak punya deteksi itu.");
  });
  test("label turunan Hitungan didefinisikan di pemakaian pertama; tidak ada Simulasi; tidak ada ID riset, nomor keputusan, atau nomor PR di halaman", () => {
    expect(badan.match(/Hitungan/g)).toHaveLength(1);
    expect(badan.match(/Nomor yang bolong adalah Hitungan, yaitu angka dari angka lain di rekaman/g)).toHaveLength(1);
    expect(badan).not.toMatch(/Simulasi/);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|\bPR #?\d+|#\d{3}\b/);
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    for (const k of ["Ilustrasi", "Asumsi", "Tidak dijalankan", "[perlu verifikasi]", "Rekaman lab"]) expect(cara, k).toContain(k);
    expect(badan.match(/Asumsi/g)).toHaveLength(1); // hanya di kalimat yang menyebut arti label (ke /cara-pakai/)
    // istilah diberi arti di pemakaian pertama di luar adegan: kemunculan pertama istilah ada di dalam atau sesudah kalimat artinya
    const ARTI: [RegExp, string][] = [
      [/audit log/i, "Audit log adalah tabel yang menyimpan siapa melakukan aksi apa pada objek apa, dan kapan."],
      [/back office/i, "Staf tim risk membuka data pendaftar lewat back office, yaitu aplikasi internal tempat staf melihat akun, membaca pengajuan verifikasi, membekukan akun, dan mengubah batas harian."],
      [/\brole\b/i, "Role adalah identitas di database yang memegang hak atas tabel."],
      [/superuser/i, "Superuser adalah role yang melewati semua pemeriksaan hak kecuali hak untuk login"],
      [/\bhash\b/i, "Hash adalah sidik tetap yang dihitung dari isi satu baris."],
    ];
    for (const [re, arti] of ARTI) {
      harus(arti);
      const awal = badan.indexOf(arti);
      const pertama = badan.search(re);
      expect(badan.match(new RegExp(arti.slice(0, 12), "g")), arti).toHaveLength(1);
      expect(pertama, String(re)).toBeGreaterThanOrEqual(awal - 40);
      expect(pertama, String(re)).toBeLessThanOrEqual(awal + arti.length);
    }
    const gejalaDanDugaan = badan.slice(0, badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(gejalaDanDugaan).not.toMatch(/audit log|hash|superuser|role\b/i);
    expect(naskah).toContain("`audit_log` (waktu, pelaku, peran, aksi, objek, alasan, penyetuju boleh kosong, hash_sebelumnya, hash)");
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("tiga baris: tanpa catatan, log biasa, baca tabel langsung; sub dihitung dari rekaman", () => {
    expect(diagram.id).toBe("t4-m38-siapa-membuka");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-audit · rantai.txt dan role.txt" });
    expect(diagram.baris).toHaveLength(3);
    const [a, b, c] = diagram.baris;
    expect(a!.label).toBe("Tanpa catatan");
    expect(a!.sub).toBe("rantai.txt bagian A");
    expect(a!.simpul.map((s) => s.teks)).toEqual([`Dina: ${AKSI_A.length} aksi`, `Catatan: ${BARIS_AUDIT_A} baris`, "Eko: 0 aksi"]);
    expect(a!.simpul.map((s) => s.sub)).toEqual(["disentuh", "untuk Dina", `${jawabA[1]![1]} baris juga`]);
    expect(a!.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "biasa"]);
    expect(jawabA[0]![1]).toBe(BARIS_AUDIT_A);
    expect(textA).toContain("# Eko (akun 40002) tidak pernah dilihat siapa pun. Jawaban untuk Eko:");
    expect(b!.label).toBe("Log biasa");
    expect(b!.sub).toBe("rantai.txt bagian B");
    expect(b!.simpul.map((s) => s.teks)).toEqual([`${SEBELUM.length} baris`, "Satu diubah, satu dihapus", `${SESUDAH.length} baris`]);
    expect(b!.simpul.map((s) => s.sub)).toEqual(["tercatat", "role aplikasi", `pelaku baris ${SESUDAH.find((r) => r.pelaku === 421)!.id} berganti`]);
    expect(b!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(c!.label).toBe("Baca tabel langsung");
    expect(c!.sub).toBe("role.txt bagian C");
    expect(c!.simpul.map((s) => s.teks)).toEqual(["Role lab", "Baca verifikasi", "Catatan: tetap"]);
    expect(c!.simpul.map((s) => s.sub)).toEqual(["pemilik schema", "1 pengajuan", "tidak bertambah"]);
    expect(c!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(L.teks(lMulai + 1, lAkhir)).toContain("pengajuan_dibaca");
    expect(diagram.catatan).toBe("Pemilik data di rekaman adalah Dina (akun 40001), bukan Budi. Kotak oranye adalah akibat yang direkam.");
    expect(diagram.judul).toBe("Yang direkam: tiga cara pertanyaan Pak Hadi tidak terjawab");
  });
  test("diagram dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
  });
  test("diagram tampil dengan Rantai biasa di blok Yang sebenarnya", () => {
    harus("<Rantai data={siapaMembuka} />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(mdx).toContain('import siapaMembuka from "../../../../data/diagram/t4-m38-siapa-membuka.json";');
    const blok = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(blok).toContain("<Rantai data={siapaMembuka} />");
  });
});

describe("skenario alur t4-m38.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; empat komponen tanpa perangkat; lima langkah dan tiga langkah varian dari awal", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-audit/output/rantai.txt", fileVarian: "labs/t4-audit/output/rantai.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["ptg", "Staf risk (Ratih)"], ["bo", "Back office"], ["cat", "Catatan aksi"], ["eng", "Engineer (role lab)"]]);
    expect(skenario.perangkat ?? []).toEqual([]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("catatan berantai hash menggantikan log biasa");
    harus("**Ubah satu hal: catatan berantai hash menggantikan log biasa**");
    harus("Widget ini mengikuti rekaman `rantai.txt` bagian A dan B dan `role.txt` bagian C, dengan satu varian dari `rantai.txt` bagian C.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m38.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(readmeAudit).toContain("make -C labs/t4-audit run");
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-audit run");
    expect(skenario.sumber.catatan).toContain("PostgreSQL 17.11, go1.27.1");
    expect(skenario.sumber.catatan).toContain("Pemilik data di rekaman adalah Dina (akun 40001), bukan Budi.");
    expect(skenario.sumber.catatan).toContain("Ratih (akun 420) dan Tim Risk Dua (akun 421)");
  });
  test("tebakan: empat pilihan, jawaban benar (nol baris untuk keduanya) sama dengan rekaman, bukan yang terpanjang, posisi (indeks 2) berbeda dari tebakan 4.18, 4.19, 4.20, dan 4.22", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.varian).toBe(false);
    expect(p.answer).toBe(2);
    expect(p.options[p.answer]).toBe(`Nol baris untuk Dina dan nol baris untuk Eko, jadi dua jawaban itu sama`);
    expect(jawabA.every(([, n]) => n === 0)).toBe(true);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    const lainBerkas = (terlacak ? [...terlacak] : []).filter((f) => /^situs\/lama\/widgets\/data\/skenario\/t4-[^/]+\.json$/.test(f) && !f.endsWith("t4-m38.json"));
    expect(lainBerkas.length).toBeGreaterThanOrEqual(10);
    const lain = lainBerkas.map((f) => (JSON.parse(baca(f)) as Skenario).predict.answer);
    expect(lain.filter((x) => x === p.answer).length).toBeLessThanOrEqual(lain.length / 2);
    for (const n of ["t4-m35", "t4-m36"]) expect((JSON.parse(baca(`situs/lama/widgets/data/skenario/${n}.json`)) as Skenario).predict.answer).not.toBe(p.answer);
    // pilihan lain bertentangan dengan rekaman: enam baris atau tiga baris atau dua baris untuk Dina; semuanya 0
    expect(p.options[0]).toBe("Enam baris untuk Dina dan nol untuk Eko, sama seperti bila semua aksi tercatat");
    expect(p.options[1]).toBe("Tiga baris untuk Dina, yaitu tiga aksi yang mengubah data, dan nol untuk Eko");
    expect(p.options[3]).toBe("Dua baris untuk Dina, yaitu dua aksi membaca, dan nol untuk Eko");
    expect(SEBELUM.filter((r) => ["bekukan", "buka_blokir", "ubah_batas"].includes(r.aksi))).toHaveLength(3);
    expect(SEBELUM.filter((r) => ["lihat_akun", "lihat_verifikasi"].includes(r.aksi))).toHaveLength(2);
    expect(p.q).toBe(`Ratih menjalankan ${kata(AKSI_A.length)} aksi atas akun Dina. Akun Eko tidak pernah dibuka siapa pun. Back office versi pertama tidak menulis catatan. Berapa baris yang ditemukan Pak Hadi untuk Dina dan untuk Eko?`);
    expect(p.explain).toBe(`Mode bo-tanpa-audit tidak menulis catatan, jadi tabel audit_log kosong. Rekaman rantai.txt bagian A: ${kata(AKSI_A.length)} aksi atas Dina menghasilkan ${kata(jawabA[0]![1])} baris, dan Eko yang tidak pernah disentuh juga ${kata(jawabA[1]![1])} baris.`);
  });
  test("baris perintah dan keluaran di kirim diturunkan dari rekaman, per langkah", () => {
    const [l1, l2, l3, l4, l5] = skenario.langkah;
    expect(l1!.kirim).toBe(`${R.baris[rAksi - 1]}\nSELECT count(*) AS baris_audit FROM audit_log: ${BARIS_AUDIT_A}`);
    expect(l2!.kirim).toBe(`Dina (akun ${jawabA[0]![0]}), disentuh ${kata(AKSI_A.length)} aksi: ${jawabA[0]![1]} baris\nEko (akun ${jawabA[1]![0]}), tidak pernah disentuh: ${jawabA[1]![1]} baris\n# 'Tidak ada catatan' sama nilainya dengan 'tidak tahu'.`);
    expect(R.baris[rJawab - 1]).toContain("'Tidak ada catatan' sama nilainya dengan 'tidak tahu'.");
    expect(l3!.kirim).toBe(`audit_biasa: ${SEBELUM.length} baris (${SEBELUM.map((r) => r.aksi).join(", ")})\npelaku ${SEBELUM[0]!.pelaku} di keenam baris; penyetuju ${SEBELUM[4]!.penyetuju} di ${SEBELUM[4]!.aksi} dan ${SEBELUM[5]!.aksi}`);
    expect(l4!.kirim).toBe(`${R.baris[rUpdate - 1]!.replace(/^=> /, "")}: ${R.baris[rUpdate]}\n${R.baris[rUpdate + 1]!.replace(/^=> /, "")}: ${R.baris[rUpdate + 2]}\nbaris ${BARIS_B}, nomor terbesar ${TERBESAR_B}, nomor bolong ${BOLONG_B}`);
    expect(l5!.kirim).toBe(`${L.baris[lMulai]!.replace(/^=> /, "")}: 1\n${L.baris[lAkhir - 1]}`);
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.kirim).toBe(`${cocok(teksC, /=> (\[t4a_pemilik\] UPDATE audit_log SET pelaku_id = 421 WHERE id = 3)\nUPDATE 1/)[1]}: UPDATE 1\nverifikasi rantai: ${verifC[1]}`);
    expect(v2!.kirim).toBe(`${cocok(teksC, /=> (\[t4a_pemilik\] INSERT INTO audit_log \(\.\.\.\) VALUES \(\.\.\. 'buka_berkas', 'verifikasi:1\/swafoto', \.\.\., <hash_sebelumnya>, <hash hitungan skrip>\))\nINSERT 0 1/)[1]}: INSERT 0 1\nverifikasi rantai: ${verifC[3]}`);
    expect(v3!.kirim).toBe(`${cocok(teksC, /=> (\[t4a_pemilik\] DELETE FROM audit_log WHERE id = 2)\nDELETE 1/)[1]}: DELETE 1\nverifikasi rantai: ${verifC[4]}`);
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["ptg", "bo"], ["cat", ""], ["bo", "cat"], ["bo", "cat"], ["eng", ""]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["bo", "cat"], ["bo", "cat"], ["bo", "cat"]]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["warn", "warn", "good", "warn", "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "")).toEqual(["good", "warn", "good"]);
  });
  test("teks langkah (judul dan jelas) dari angka rekaman; tanpa klaim di luar rekaman", () => {
    const [l1, l2, l3, l4, l5] = skenario.langkah;
    expect(l1!.judul).toBe(`${Kata(AKSI_A.length)} aksi atas data Dina berjalan, catatan tidak bertambah`);
    expect(l1!.jelas).toBe("Versi pertama menjalankan semua aksi dan tidak menulis apa pun. Tabel audit_log tetap kosong.");
    expect(l2!.judul).toBe(`Dina dan Eko dijawab sama: ${kata(BARIS_AUDIT_A)} baris`);
    expect(l2!.jelas).toBe(`Nol baris untuk Dina tidak berarti tidak ada yang membuka datanya. Eko memang tidak pernah dibuka, dan jawabannya juga nol baris. Tabel kosong tidak membedakan keduanya.`);
    expect(l3!.judul).toBe(`Log biasa: ${kata(SEBELUM.length)} aksi yang sama tercatat`);
    expect(l3!.jelas).toBe("Mode bo-log-biasa menulis aksi yang sama ke tabel biasa tanpa hash. Pertanyaan Pak Hadi kini punya jawaban, selama isi tabel itu tidak berubah.");
    expect(l4!.judul).toBe("Role aplikasi mengubah satu baris dan menghapus satu baris");
    expect(l4!.jelas).toBe(`Kartu identitas Dina kini tercatat dibuka oleh akun ${SESUDAH.find((r) => r.id === 3)!.pelaku}, dan pembekuan tidak pernah terjadi. Nomor yang bolong menunjukkan satu penghapusan. Ubahan pelaku tidak meninggalkan petunjuk apa pun.`);
    expect(l5!.judul).toBe("Engineer membaca tabel verifikasi lewat role lab: catatan tidak bertambah");
    expect(l5!.jelas).toBe("Role lab adalah pemilik schema dan superuser di lab ini. Pembacaan langsung ke database tidak menambah satu baris pun di tabel catatan.");
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.judul).toBe(`Pemilik tabel mengubah baris 3: terdeteksi di baris 3`);
    expect(v1!.jelas).toBe("Tiap baris menyimpan hash, yaitu sidik tetap dari isi baris dan hash baris sebelumnya. Ubahan satu baris membuat verifikasi menunjuk baris itu. Pelakunya di sini pemilik tabel, bukan role aplikasi.");
    expect(v2!.judul).toBe("Pemilik tabel menambah baris ke-7 dengan hash hitungannya sendiri: lolos");
    expect(v2!.jelas).toBe("Rantai tanpa kunci rahasia bukan tanda tangan. Siapa pun yang bisa menulis dan tahu rumusnya bisa menambah baris palsu yang lolos. Hash baris palsu itu dihitung skrip lab.");
    expect(v3!.judul).toBe("Pemilik tabel menghapus baris 2: terdeteksi di baris 3");
    expect(v3!.jelas).toBe("Penghapusan di tengah terdeteksi di baris sesudah yang hilang, karena baris itu tidak lagi menyambung ke hash baris sebelumnya.");
    expect(skenario.pengantar).toBe("Back office versi pertama diuji dengan enam aksi atas akun Dina. Tebak dulu apa yang bisa dibaca Pak Hadi sesudahnya, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    // role.txt B: role aplikasi tidak diberi UPDATE dan DELETE atas audit_log (pembeda pelaku di varian)
    expect(roleTxt).toContain("=> [api_t4] UPDATE audit_log SET alasan = 'diubah' WHERE id = 2\nERROR:  permission denied for table audit_log (SQLSTATE 42501)");
    expect(roleTxt).toContain("=> [api_t4] DELETE FROM audit_log WHERE id = 6\nERROR:  permission denied for table audit_log (SQLSTATE 42501)");
  });
  test("skenario dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman dengan angka dari rekaman", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m38");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m38-1", "t4-m38-2", "t4-m38-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m38-siapa-membuka/" && k.judul === "4.24 M38: Siapa yang membuka data Budi?")).toBe(true);
    expect(kartu[0]!.tanya).toBe(`Ratih menjalankan ${kata(AKSI_A.length)} aksi atas data Dina, dan Eko tidak pernah dibuka. Kenapa tabel catatan menjawab nol baris untuk keduanya?`);
    expect(kartu[1]!.jawab).toBe(`Tabel menjadi ${kata(BARIS_B)} baris. Pelaku di baris 3 berganti dari ${SEBELUM.find((r) => r.id === 3)!.pelaku} ke ${SESUDAH.find((r) => r.id === 3)!.pelaku}, dan baris pembekuan hilang. Satu-satunya petunjuk adalah nomor bolong ${BOLONG_B}, dan UPDATE tidak meninggalkan petunjuk (\`rantai.txt\` bagian B).`);
    expect(kartu[2]!.jawab).toContain("dibaca dari kode, Tidak dijalankan");
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const butir = [...cek.matchAll(/\*\*(\d+)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(butir.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(kartu.map((k) => k.tanya)).toEqual(butir.map((m) => m[2]));
    expect(kartu.map((k) => k.jawab)).toEqual(butir.map((m) => m[3]));
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: satu tautan; penutup tanpa klaim baru; akhir halaman memuat SkripLama; noscript memakai angka rekaman", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]]+)\]\]/gm)].map((m) => m[1])).toEqual(["t4-audit"]);
    harus("Di M38 pertanyaan Pak Hadi gagal dijawab karena tiga hal: catatan tidak ada, catatan bisa diubah tanpa petunjuk, dan pembacaan langsung ke database tidak tercatat.");
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(noscript).toContain(`jawaban untuk Dina dan untuk Eko sama-sama ${kata(BARIS_AUDIT_A)} baris`);
    expect(noscript).toContain("membaca tabel verifikasi lewat role lab tidak menambah baris catatan.");
    expect(noscript).toContain("Rekaman bagian A ada di lipatan di bawah.");
    expect(badan.match(/<details>\n<summary>Rekaman bagian A \(juga untuk pembaca tanpa JavaScript\)<\/summary>/g)).toHaveLength(1);
    expect(badan.match(/<details[ >]/g)).toHaveLength(1 + 1 + 3);
  });
});

// ---- tinjauan: paragraf penuh dibandingkan utuh, tanpa kunci baris ----------------------------------------------------
// Mutan "tidak", hapus kalimat terakhir, tukar dua kalimat, dan bilangan di paragraf narasi lolos saat kunci baris dimatikan.
// Tiap paragraf di bawah dibandingkan utuh, supaya perubahan satu kata di dalamnya tertangkap oleh tes yang tidak memakai
// KALIMAT_TERKUNCI. Paragraf yang memuat bilangan dari rekaman diturunkan dari rekaman di tes lain di atas.
describe("tinjauan: paragraf penuh dibandingkan utuh, tanpa kunci baris", () => {
  test("semua paragraf prosa halaman", () => {
    harus("Minggu 11 Tahap 4. Budi menerima pesan dari nomor yang tidak ia kenal. Pengirimnya menulis nama lengkap Budi dan nomor identitasnya.");
    harus("Pak Hadi mendengar tentang pesan itu. Ia bertanya satu hal kepada Raka: siapa yang membuka data identitas Budi dalam 30 hari terakhir?");
    harus("Tidak ada yang bisa menjawab.");
    harus("*Angka cerita (Ilustrasi):* pesan ke Budi, waktu 30 hari, dugaan Raka, dan jawaban Ratih berasal dari cerita, bukan dari rekaman. Rekaman memuat pertanyaan Pak Hadi yang sama, tetapi tentang Dina. Arti Ilustrasi, Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].");
    harus("Raka menduga data Budi bocor dari layanan verifikasi, yaitu pihak luar yang memeriksa kartu identitas pendaftar. Dugaan itu masuk akal, karena layanan itu menerima data identitas dari Rekeningo.");
    harus("Staf tim risk membuka data pendaftar lewat back office, yaitu aplikasi internal tempat staf melihat akun, membaca pengajuan verifikasi, membekukan akun, dan mengubah batas harian.");
    harus("Ratih, analis risiko di tim risk, menjawab: \"Kami hanya melihat data bila perlu.\" Jawaban itu terdengar masuk akal. Tim risk memang punya alasan untuk membuka data.");
    harus("Dua jawaban itu sama-sama belum diperiksa. Dugaan tentang pihak luar bisa diperiksa dengan meminta catatan dari mereka. Dugaan tentang pihak dalam hanya bisa diperiksa dari catatan Rekeningo sendiri.");
    harus("Tidak ada yang bisa menjawabnya. Di lab, back office versi pertama menjalankan enam aksi atas satu akun dan tabel catatan tetap kosong (dibaca di blok berikutnya, Rekaman lab).");
    harus("Pertanyaan Pak Hadi tidak bisa dijawab dari data Rekeningo sendiri, apa pun yang terjadi di layanan verifikasi. Ada empat sebab. Tiga terekam di lab, dan satu hanya ada di cerita.");
    harus("**Satu akun bersama.** Di cerita, tim risk memakai satu akun bersama di back office. Catatan dari akun itu paling jauh menjawab \"akun risk\", bukan \"siapa\".");
    harus("Keadaan ini tidak direkam (Ilustrasi): lab memakai akun terpisah untuk tiap staf, yaitu Ratih (akun 420) dan Tim Risk Dua (akun 421).");
    harus("**Tanpa catatan.** Lab memerankan versi pertama dengan flag `-rentan`, yaitu server yang sama dengan perilaku versi pertama. Pada mode `bo-tanpa-audit`, fungsi `Audit` keluar tanpa menulis apa pun (Tidak dijalankan: dibaca dari kode). Cabang kedua, `bo-log-biasa`, dibahas di bawah:");
    harus("Ratih menjalankan enam aksi atas data Dina (akun 40001): melihat akun, melihat pengajuan, membuka kartu identitas, membekukan, membuka blokir, dan mengubah batas harian. Audit log adalah tabel yang menyimpan siapa melakukan aksi apa pada objek apa, dan kapan. Di mode ini tabel `audit_log` berisi nol baris. Eko (akun 40002) tidak pernah dilihat siapa pun, dan jawaban untuknya juga nol baris:");
    harus("Dua jawaban yang sama itulah masalahnya. Nol baris untuk Dina tidak berarti tidak ada yang membuka datanya. Jawaban \"tidak ada\" di sini sama nilainya dengan \"tidak tahu\".");
    harus("Daftar jenis kelemahan perangkat lunak CWE (Common Weakness Enumeration) menamai keadaan ini Insufficient Logging. Kejadian penting keamanan tidak dicatat, jadi tidak ada catatan untuk analisis forensik ([CWE-778](https://cwe.mitre.org/data/definitions/778.html), dibuka 2026-10-30, Tidak dijalankan).");
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.1, dan database lab yang dibuat bersih untuk tiap bagian. Pemilik data di rekaman adalah Dina, akun lab fiktif, bukan Budi.");
    harus("**Log biasa tercatat, tetapi bisa diubah.** Misalkan versi berikutnya mencatat aksi di tabel biasa. Itu mode `bo-log-biasa`: enam aksi yang sama masuk ke tabel `audit_biasa`, yang hanya ada di lab untuk mode ini. Tabel itu tidak punya pemeriksaan apakah sebuah baris pernah diubah.");
    harus("Role adalah identitas di database yang memegang hak atas tabel. Yang menulis ulang di rekaman adalah role aplikasi `api_t4`, karena versi pertama memberinya hak mengubah dan menghapus tabel itu. Hak itu setelan lab untuk versi pertama, bukan temuan. Dua perintah di bawah dikirim skrip lab, bukan terjadi karena kesalahan sistem:");
    harus("Sesudah satu UPDATE dan satu DELETE, tabel berisi lima baris. Kartu identitas Dina kini tercatat dibuka oleh akun 421, dan pembekuan hilang. Nomor yang bolong adalah Hitungan, yaitu angka dari angka lain di rekaman: nomor terbesar 6 − 5 baris = 1, dan rekaman mencetak 1 juga. UPDATE tidak meninggalkan petunjuk apa pun:");
    harus("Log biasa lebih baik daripada tidak ada catatan, tetapi isinya tidak bisa diperiksa. OWASP menyarankan catatan dilengkapi deteksi perubahan, supaya ketahuan bila sebuah baris diubah atau dihapus ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), dibuka 2026-10-30, Tidak dijalankan). Tabel `audit_biasa` tidak punya deteksi itu.");
    harus("**Pembacaan langsung tidak lewat aplikasi.** Engineer yang membuka database langsung memakai role `lab`. Superuser adalah role yang melewati semua pemeriksaan hak kecuali hak untuk login ([PostgreSQL 17, Role Attributes](https://www.postgresql.org/docs/17/role-attributes.html), dibuka 2026-10-30, Tidak dijalankan). Di lab itu `lab` adalah pemilik schema dan sekaligus superuser (`role.txt` bagian A dan C).");
    harus("Rekaman membaca tabel `verifikasi`, yaitu tabel pengajuan verifikasi identitas, dan menghitung baris `audit_log` sebelum dan sesudahnya:");
    harus("Catatan ditulis oleh kode aplikasi, di dalam fungsi aksi back office. Migrasi database lab tidak memuat trigger yang menulis `audit_log`. Fungsi `LihatVerifikasiBO` membaca pengajuan, lalu memanggil `Audit` dalam transaction yang sama (Tidak dijalankan: dibaca dari kode):");
    harus("Query yang dikirim langsung ke database tidak melewati fungsi itu, jadi tidak ada panggilan `Audit`.");
    harus("**Yang tidak direkam.**");
    harus("- Pesan ke Budi, waktu 30 hari, dan pertanyaan Pak Hadi hanya ada di cerita (Ilustrasi).");
    harus("- Sumber pesan ke Budi tidak pernah dibuktikan. Lab tidak punya layanan verifikasi sungguhan (Tidak dijalankan), jadi dugaan Raka tidak bisa dibenarkan atau dibantah. Yang terbukti hanya satu hal: Rekeningo tidak bisa menjawab pertanyaan Pak Hadi.");
    harus("- Satu akun bersama dan log yang mencatat sebagian aksi hanya ada di cerita. Lab memakai dua mode: tanpa catatan, dan log biasa yang mencatat semua aksi, termasuk membuka file.");
    harus("- Log server PostgreSQL tidak dibaca rekaman ini. Bawaan `log_statement` adalah `none` ([PostgreSQL 17, Error Reporting and Logging](https://www.postgresql.org/docs/17/runtime-config-logging.html), dibuka 2026-10-30, Tidak dijalankan), tetapi database lab dijalankan dengan `log_statement=all` (`labs/b3-race`). Apakah pembacaan engineer muncul di log server itu tidak diperiksa.");
    harus("Widget ini mengikuti rekaman `rantai.txt` bagian A dan B dan `role.txt` bagian C, dengan satu varian dari `rantai.txt` bagian C. Tebak dulu apa yang ditemukan Pak Hadi, lalu tekan Berikutnya atau panah kanan.");
    harus("Hash adalah sidik tetap yang dihitung dari isi satu baris. Sesudah langkah terakhir, centang **Ubah satu hal: catatan berantai hash menggantikan log biasa**. Di varian ini tiap baris menyimpan hash yang dihitung dari isinya dan dari hash baris sebelumnya. Pemilik tabel yang mengubah satu baris atau menghapus satu baris terdeteksi, tetapi baris palsu di ujung dengan hash yang benar lolos (Rekaman lab, `rantai.txt` bagian C).");
    harus("Batasnya: rekaman ini memakai satu skenario, bukan semua cara menulis ulang catatan. Cara memeriksa rantai dan batasnya dibahas di [[t4-audit]].");
    harus("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: tanpa catatan, jawaban untuk Dina dan untuk Eko sama-sama nol baris, dan membaca tabel verifikasi lewat role lab tidak menambah baris catatan.");
    harus("Rekaman bagian A ada di lipatan di bawah.");
    harus("- [[t4-audit]]: back office dengan peran, catatan yang bisa diperiksa, dan agen baca-saja. Keputusannya ADR 43.");
    harus("Di M38 pertanyaan Pak Hadi gagal dijawab karena tiga hal: catatan tidak ada, catatan bisa diubah tanpa petunjuk, dan pembacaan langsung ke database tidak tercatat.");
    harus("### Cek diri");
    harus("**1.** Ratih menjalankan enam aksi atas data Dina, dan Eko tidak pernah dibuka. Kenapa tabel catatan menjawab nol baris untuk keduanya?");
    harus("Mode `bo-tanpa-audit` tidak menulis catatan. Nol baris tidak membedakan akun yang dibuka enam kali dari akun yang tidak pernah dibuka. Karena itu \"tidak ada\" sama nilainya dengan \"tidak tahu\" (`rantai.txt` bagian A).");
    harus("**2.** Log biasa mencatat enam aksi. Apa yang terjadi bila role aplikasi mengubah satu baris dan menghapus satu baris, dan petunjuk apa yang tersisa?");
    harus("Tabel menjadi lima baris. Pelaku di baris 3 berganti dari 420 ke 421, dan baris pembekuan hilang. Satu-satunya petunjuk adalah nomor bolong 1, dan UPDATE tidak meninggalkan petunjuk (`rantai.txt` bagian B).");
    harus("**3.** Engineer membaca tabel `verifikasi` lewat role `lab`. Kenapa jumlah baris `audit_log` tidak berubah?");
    harus("Catatan ditulis oleh kode aplikasi di dalam fungsi aksi back office, dan query langsung ke database tidak melewati fungsi itu. Jumlah baris sebelum dan sesudah membaca sama (`role.txt` bagian C; dibaca dari kode, Tidak dijalankan).");
  });
  test("tebakan di details dan struktur: heading Cek diri tingkat 3, tebal di awal baris, Rantai tampil biasa", () => {
    expect(badan).toMatch(/^### Cek diri$/m);
    expect(badan.match(/^#+ /gm)).toEqual(["### "]);
    expect(badan).not.toContain("<Rantai data={siapaMembuka} ringkas />");
    expect(badan.match(/^\*\*[^*\n]+\*\*/gm)!.map((s) => s.replace(/\*/g, ""))).toEqual(["Satu akun bersama.", "Tanpa catatan.", "Log biasa tercatat, tetapi bisa diubah.", "Pembacaan langsung tidak lewat aplikasi.", "Yang tidak direkam.", "1.", "2.", "3."]);
  });
  test("skenario: judul langkah, judul skenario, dan catatan sumber utuh; kutipan baris riset utuh", () => {
    expect(skenario.judul).toBe("Siapa yang membuka data Dina: tanpa catatan, log biasa, dan baca tabel langsung");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Enam aksi atas data Dina berjalan, catatan tidak bertambah",
      "Dina dan Eko dijawab sama: nol baris",
      "Log biasa: enam aksi yang sama tercatat",
      "Role aplikasi mengubah satu baris dan menghapus satu baris",
      "Engineer membaca tabel verifikasi lewat role lab: catatan tidak bertambah",
    ]);
    expect(skenario.sumber.catatan).toBe("Lab t4-audit, PostgreSQL 17.11, go1.27.1 (make -C labs/t4-audit run). Jalur utama: rantai.txt bagian A (tanpa catatan) dan bagian B (log biasa), lalu role.txt bagian C (baca tabel verifikasi sebagai role lab). Ubah satu hal: rantai.txt bagian C (log berantai). Pemilik data di rekaman adalah Dina (akun 40001), bukan Budi. Stafnya Ratih (akun 420) dan Tim Risk Dua (akun 421), masing-masing dengan akun sendiri. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log.");
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "Raka", "Ratih", "Pak Hadi", "Budi", "Dina", "Eko", "pertama", "kedua", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "naik", "turun", "lolos", "ditolak", "nol", "0", "1", "3", "5", "6", "7", "30", "40001", "40002", "420", "421", "ADR 43", "OWASP", "CWE", "role", "superuser", "audit log", "bo-tanpa-audit", "bo-log-biasa", "hash", "catatan", "lab"];
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
  test("lima baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(["R4-225", "R4-226", "R4-227", "R4-228", "R4-229"].map(barisRiset)).toEqual(RISET_TERKUNCI);
    expect(["R4-225", "R4-226", "R4-227", "R4-228", "R4-229"].map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
  });
  test("tiap nilai diagram dan skenario (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(SKENARIO_DAUN);
  });
  test("sidik frontmatter terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("profil kata penentu tiap baris badan (polaritas, urutan waktu, bilangan, tokoh, label sumber) sama dengan nilai terkunci", () => {
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
