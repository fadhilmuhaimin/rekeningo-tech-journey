// Penjaga halaman 5.26 (keputusan 1600 sampai 1602): angka, hitungan, nomor halaman, tautan, label sumber, rentang Snippet, klaim
// negatif berlingkup, diagram Rantai, skenario alur t5-kms, baris riset, tabel ADR 57, kartu Cek diri, dan halaman istilah di
// arsip-envelope-encryption.mdx diturunkan dari rekaman labs/t5-kms (arsip.txt, rotasi.txt, testing.txt), kode envelope, bao, dan
// README lab, hak api-t5, naskah Tahap 5, registry, baris riset, dan halaman tetangga, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 5.24): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di berkas nilai) mengunci SETIAP
// baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak menangkap SALAHNYA
// kalimat; elemen non-prosa (frontmatter, diagram, skenario, snippet, baris riset) dikunci dengan sidik jari dan nilai daun; tabel
// Hitungan dihitung ulang dari rumusnya sendiri dengan pembulatan setengah ke atas.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-kms-inti.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, GLOSARIUM, KALIMAT_TERKUNCI, KATA_POLA, PIN, RISET_TERKUNCI, SIDIK, WIDGET_DAUN } from "./arsip-envelope-encryption.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-5/arsip-envelope-encryption.mdx";
const IDS = ["R5-235", "R5-236", "R5-237", "R5-238", "R5-239"];
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const diagram = DataRantai.parse(diagramMentah);
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t5-kms.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const arsip = baca("labs/t5-kms/output/arsip.txt");
const rotasi = baca("labs/t5-kms/output/rotasi.txt");
const testing = baca("labs/t5-kms/output/testing.txt");
const readme = baca("labs/t5-kms/README.md");
const envelopeGo = baca("labs/t5-kms/envelope/envelope.go");
const baoGo = baca("labs/t5-kms/bao/bao.go");
const runPy = baca("labs/t5-kms/run.py");
const dasarT5 = baca("labs/api-t5/dasar_t5.py");
const partisiHal = baca("situs/src/content/docs/tahap-5/partisi-snapshot.mdx");
const skemaHal = baca("situs/src/content/docs/tahap-5/skema-data.mdx");
const m43 = baca("situs/src/content/docs/tahap-5/m43-pemeriksaan-saldo.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuJson = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const glosarium = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; d: string; s: string; h?: string | null }[];

interface Skenario { versi: number; judul: string; sumber: { jenis: string; file: string; fileVarian: string; catatan: string }; pengantar: string; komponen: { id: string; label: string }[]; predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string }; langkah: Langkah[]; varian: { label: string; mulai: number; langkah: Langkah[] } }
interface Langkah { dari: string; ke: string; judul: string; kirim: string; jelas: string; nada?: string }
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
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
const fmt = (n: number, d = 0): string => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
// pembulatan setengah ke atas seperti pembaca (bukan toFixed)
const bulat = (x: number, d = 0): number => Math.round(x * 10 ** d + 1e-9) / 10 ** d;
const hitung = (teks: string, re: RegExp): number => (teks.match(re) ?? []).length;
const sel = (baris: string): string[] => baris.split("|").slice(1, -1).map((c) => c.trim());

// ---- rekaman: bagian dan nomor baris -------------------------------------------------------------------------------------
const bagianRekaman = (isi: string, huruf: string): { awal: number; teks: string; baris: string[] } => {
  const baris = isi.split("\n");
  const a = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(a, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const z = baris.findIndex((b, n) => n > a && /^# --- [A-Z]\d?\. /.test(b));
  const potong = baris.slice(a, z < 0 ? baris.length : z);
  return { awal: a + 1, teks: potong.join("\n"), baris: potong };
};
// nomor baris 1-based dari baris pertama yang memenuhi syarat pada/sesudah baris `dari`
const nomor = (isi: string, ok: (b: string) => boolean, dariBaris = 1): number => {
  const baris = isi.split("\n");
  const i = baris.findIndex((b, n) => n >= dariBaris - 1 && ok(b));
  expect(i, "baris penanda tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const teksBaris = (isi: string, a: number, b: number): string => isi.split("\n").slice(a - 1, b).join("\n");
const aA = bagianRekaman(arsip, "A"), aB = bagianRekaman(arsip, "B"), aC = bagianRekaman(arsip, "C"), aD = bagianRekaman(arsip, "D"), aE = bagianRekaman(arsip, "E");
const rA = bagianRekaman(rotasi, "A"), rB = bagianRekaman(rotasi, "B"), rC = bagianRekaman(rotasi, "C"), rD = bagianRekaman(rotasi, "D"), rE = bagianRekaman(rotasi, "E"), rF = bagianRekaman(rotasi, "F"), rG = bagianRekaman(rotasi, "G");

// ---- Snippet di halaman --------------------------------------------------------------------------------------------------
const tag = [...badan.matchAll(/<Snippet (file="[^>]*?)\/>/g)].map((m) => m[1]!);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]!);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]!);
const kodeInline = [...badan.matchAll(/<Snippet lang="([^"]+)" code=\{`([\s\S]*?)`\} \/>/g)].map((m) => ({ lang: m[1]!, kode: m[2]! }));

// ---- angka: registry, naskah, halaman tetangga ---------------------------------------------------------------------------
const asumsi = (cerita.tahap[4] as unknown as { asumsi: Record<string, number> }).asumsi;
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Data posting |"))!;
const AKTIF = (asumsi.user! * asumsi.aktif!) / 100; // 200.000
const TRX = Number(cocok(barisBeban, /200\.000 × (\d) × 2 × 365 = 438 juta/)[1]); // 3 (naskah); registry trx 2 di sebelahnya
const TRX_REG = asumsi.trx!; // 2
const POSTING_TAHUN = AKTIF * TRX * 2 * 365;
const POSTING_TAHUN_2 = AKTIF * TRX_REG * 2 * 365;
const BATAS = 2 ** 32;
const FILE_PER_TAHUN = 12;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("5.26 ada, konsep, jalur inti, prasyarat 5.11, lab t5-kms, peran security dan backend, ADR 57; judul sama dengan peta naskah; menit = baca + coba", () => {
    expect(dari("t5-kms")).toMatchObject({ ada: true, nomor: "5.26", jenis: "konsep", inti: true, prasyarat: ["t5-partisi"], lab: ["t5-kms"], tahap: 5, peran: ["security", "backend"], adr: [57] });
    expect(dari("t5-partisi").nomor).toBe("5.11");
    expect(frontmatter).toContain('title: "5.26 Keamanan 12: Arsip dan cadangan, envelope encryption + ADR 57"');
    expect(dari("t5-kms").judul).toBe("Keamanan 12: Arsip dan cadangan, envelope encryption + ADR 57");
    expect(naskah).toContain("| 5.26 | 4 | Keamanan 12: Arsip dan cadangan, envelope encryption + ADR 57 | Keamanan + ADR | ★ | t5-kms | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-partisi\]\] · Jalur inti<\/p>/);
    expect(dari("t5-kms").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(2.5);
  });
  test("lima blok sesuai templat konsep: Mulai dan Coba terbuka, Coba punya ringkasan aman", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan).toMatch(/<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: [^"]+">/);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["berikutnya", "t4-audit", "t4-infra-secret", "t5-partisi", "t5-prd", "t5-skema"]);
    const sesuai: [string, string, string][] = [
      ["t4-audit", "4.25", "Keamanan 9"], ["t4-infra-secret", "4.17", "Secret manager"], ["t5-partisi", "5.11", "Partisi tabel"], ["t5-prd", "5.1", "PRD v5"], ["t5-skema", "5.3", "Skema data"],
    ];
    for (const [idh, nomorH, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomorH);
      expect(dari(idh).judul.includes(awal), `${idh} di registry`).toBe(true);
      if (nomorH.startsWith("5.")) expect(naskah, `${nomorH} di peta`).toMatch(new RegExp(`\\| ${nomorH.replace(".", "\\.")} \\| \\d+b? \\| [^|]*${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(cara).toContain("Label sumber");
    expect(badan).toContain("[Label sumber](/cara-pakai/#label-sumber)");
  });
  test("janji halaman tetangga ditepati: 5.11, 5.3, dan 5.10 menunjuk halaman ini untuk enkripsi arsip, dan halaman ini membahas apa yang dijanjikan", () => {
    expect(partisiHal).toContain("Enkripsi dan baris `arsip_partisi` dibahas di [[t5-kms]] (ADR 57).");
    expect(partisiHal).toContain("[[t5-kms]] menambah enkripsi arsip dan membuat pemulihan bergantung pada layanan kunci enkripsi (KMS).");
    expect(partisiHal).toContain("| Pemulihan arsip terenkripsi | Pemulihan di lab membaca CSV tanpa enkripsi | [[t5-kms]] |");
    expect(skemaHal).toContain("[[t5-kms\\|ADR 57]]");
    expect(m43).toContain("- [[t5-kms]]: arsip partisi yang dienkripsi sebelum keluar dari database utama. Keputusannya ADR 57.");
    // yang dijanjikan: enkripsi arsip, baris arsip_partisi, pemulihan bergantung pada KMS, pemulihan arsip terenkripsi dengan batasnya
    expect(badan).toContain("| Pemasangan kembali arsip terenkripsi dengan `ATTACH PARTITION` | Rekaman berhenti di dekripsi file | [[t5-partisi]] |");
    expect(badan).toContain("Pemulihan butuh OpenBao hidup, dan satu file jadi satu pesan di memori");
    expect(readme).toContain("pemulihan arsip terenkripsi ke tabel dan `ATTACH PARTITION` (rekaman `t5-partisi` berhenti di CSV tanpa enkripsi)");
    expect(badan.match(/ADR \d+/g)!.filter((x, i, a) => a.indexOf(x) === i).sort()).toEqual(["ADR 49", "ADR 57"]);
  });
  test("tebakan Coba: jawabannya tidak tertulis di blok Mulai atau di teks Coba di atas widget, dan jawaban benar bukan pilihan terpanjang", () => {
    const sebelum = badan.slice(0, badan.indexOf("<WidgetLama"));
    const o = skenario.predict.options;
    expect(skenario.predict.answer).toBe(3);
    expect(skenario.predict.varian).toBe(true);
    expect(o).toHaveLength(4);
    expect(o[3]).toBe("Ditolak 400, dan posting_lalu_01 tidak terbuka karena versi 1 sudah dihapus");
    expect(Math.max(...o.map((x) => x.length))).toBeGreaterThan(o[3]!.length);
    expect(Math.min(...o.map((x) => x.length))).toBeLessThan(o[3]!.length);
    expect(sebelum).not.toMatch(/dihapus dari OpenBao|too old|tidak bisa dibuka lagi|tidak terbuka lagi|min decryption version|permanen/);
    expect(sebelum).not.toContain(o[3]!);
    // judul dan pengantar widget tampil di atas tebakan: tanpa kata yang membuka jawabannya
    expect(skenario.judul + skenario.pengantar).not.toMatch(/dihapus|menghapus|trim menghapus|too old|permanen|400/);
    expect(skenario.judul).toBe("Kunci pembungkus arsip diputar, dan satu dari dua data key dibungkus ulang");
    // jawaban terbuka di akhir jalur yang ditanyakan (varian), bukan di jalur utama
    expect(skenario.langkah.map((l) => l.jelas + l.kirim).join(" ")).not.toContain("min decryption version should not be less");
    expect(skenario.varian.langkah.at(-1)!.kirim).toContain("too old");
    expect(skenario.predict.explain).toContain("rotasi.txt bagian E");
  });
});

describe("rekaman arsip.txt: KEK tertutup, satu data key per file, tanpa KMS tidak terbaca, satu bit berubah, checksum dan jangkar", () => {
  test("bagian A dan B: 28.000 baris tiap arsip; export 400; arsipkan; +28 byte; dua data key terbungkus vault:v1; file exists", () => {
    expect(aA.teks).toContain("# Tiap file CSV: 28.000 baris.");
    expect(aA.teks).toContain("HTTP 400");
    expect(aA.teks).toContain('{"errors": ["private key material is not exportable"]}');
    expect(aA.teks).toContain("# backup kek-arsip (operator): ditolak karena kunci tidak exportable.");
    expect(aA.teks).not.toMatch(/backup[^\n]*HTTP \d{3}/); // kode status backup tidak direkam
    expect(aB.teks).toContain("Ukuran berkas terenkripsi = ukuran file asal + 28 byte (nonce 12, tag 16)");
    expect(aB.teks).toContain("Dua file, dua data key terbungkus berbeda (12 data key per tahun bila satu per bulan).");
    expect(hitung(aB.teks, /\| vault:v1:\s+\| 1$/gm)).toBe(2);
    expect(aB.teks).toContain("kmsarsip: open <folder sementara>/objek/posting_lalu_02.enc: file exists");
    expect(aB.teks).toContain("# exit status 2");
    // ukuran: 1.282.072 byte terbuka (bagian C) + 28 = 1.282.100 byte berkas terenkripsi (bagian D)
    const terbuka = Number(cocok(aC.teks, /terbuka: (\d+) byte/)[1]);
    expect(fmt(terbuka + 28)).toBe(cocok(aD.teks, /Berkas terenkripsi ([\d.]+) byte/)[1]);
    expect(fmt(terbuka)).toBe("1.282.072");
    expect(badan).toContain("1.282.072");
    expect(badan).toContain("1.282.100");
    expect(badan).toContain("28.000 baris");
    expect(badan).toContain("nonce 12 byte, ciphertext, dan tag 16 byte");
    expect(envelopeGo).toContain("cipher.NewGCMWithRandomNonce(blok)");
    expect(envelopeGo).toContain("os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600");
    expect(envelopeGo).toContain('[]byte("rekeningo-arsip-v1:" + periode)');
  });
  test("bagian C: data key file lain gagal di GCM; token pengarsip dan token tidak dikenal 403; matriks enam sel 403 sama dengan tabel halaman", () => {
    expect(aC.teks).toContain("kmsarsip: autentikasi GCM gagal (cipher: message authentication failed)");
    expect(hitung(aC.teks, /kmsarsip: openbao menjawab 403/g)).toBe(2);
    expect(aC.teks).toContain("* permission denied");
    expect(aC.teks).toContain("token yang hanya boleh membuat data key (pengarsip), lalu dengan token yang tidak dikenal OpenBao");
    // matriks: dua operasi di luar hak per token; pengarsip membuka tampil di atas sebagai 403 (bukan sel di daftar)
    const m = Object.fromEntries([...aC.teks.matchAll(/^#   token ([a-z-]+): (.+)$/gm)].map((x) => [x[1]!, x[2]!.split(", ").map((s) => s.replace(" 403", ""))]));
    expect(m).toEqual({ pengarsip: ["rewrap"], pembuka: ["arsipkan", "rewrap"], "pembungkus-ulang": ["arsipkan", "buka"] });
    const tabel = badan.split("\n").filter((b) => /^\| (pengarsip|pembuka|pembungkus-ulang) \|/.test(b)).map(sel);
    expect(tabel).toEqual([
      ["pengarsip", "`datakey/plaintext`", "arsipkan", "buka, rewrap"],
      ["pembuka", "`decrypt`", "buka", "arsipkan, rewrap"],
      ["pembungkus-ulang", "`rewrap`", "rewrap", "arsipkan, buka"],
    ]);
    expect(runPy).toContain('"pengarsip": f\'path "transit/datakey/plaintext/{KEK}" {{ capabilities = ["update"] }}\'');
    expect(runPy).toContain('"pembuka": f\'path "transit/decrypt/{KEK}" {{ capabilities = ["update"] }}\'');
    expect(runPy).toContain('"pembungkus-ulang": f\'path "transit/rewrap/{KEK}" {{ capabilities = ["update"] }}\'');
    expect(tabel.flatMap((r) => r[3]!.split(", ")).length).toBe(6);
    expect(aC.teks).toContain("berkasnya dibuat dengan izin 0600");
    expect(aC.teks).toContain("SHA-256 hasil dekripsi sama dengan SHA-256 file asal");
    expect(aC.teks).toContain("isinya bukan UTF-8 yang sah");
  });
  test("bagian D: satu bit di lima posisi, terpotong, diperpanjang, periode lain: GCM gagal; satu byte di data key terbungkus: 400 dari OpenBao", () => {
    expect(hitung(aD.teks, /kmsarsip: autentikasi GCM gagal \(cipher: message authentication failed\)/g)).toBe(8); // lima posisi, terpotong, diperpanjang, periode lain
    expect(aD.teks).toContain("Satu bit diubah di tiap posisi");
    for (const p of ["byte pertama (nonce)", "byte ke-12 (awal ciphertext)", "byte tengah (ciphertext)", "byte ke-17 dari akhir (ciphertext terakhir)", "byte terakhir (tag)"]) expect(aD.teks, p).toContain(`# ${p}:`);
    expect(aD.teks).toContain("kmsarsip: openbao menjawab 400: cipher: message authentication failed");
    expect(aD.teks).toContain("(lima posisi file, satu posisi kunci)");
    expect(badan).toContain("Rekaman membalik satu bit di lima posisi file: byte pertama (nonce), awal ciphertext, tengah, ciphertext terakhir, dan byte terakhir (tag).");
    expect(runPy).toContain("b[posisi] ^= nilai");
    expect(runPy).toContain("def ubah_byte(sumber, tujuan, posisi, nilai=1)");
    // tes Go: tiap byte blob kecil dibalik satu bit
    expect(readme).toContain("Tes Go mengubah semua byte sebuah blob kecil");
    expect(baca("labs/t5-kms/envelope/envelope_test.go")).toContain("ubah[i] ^= 0x01");
    expect(hitung(testing, /^--- PASS/gm)).toBe(28);
    expect(badan).toContain("(`testing.txt`, 28 tes lulus)");
  });
  test("bagian E: tabel empat keadaan dihitung dari empat baris verifikasi pertama; 42501 untuk api_t5; hanya jangkar melihat pemalsuan bersama", () => {
    const v = [...aE.teks.matchAll(/^berkas-lawan-database=(\w+) berkas-lawan-jangkar=(\w+) database-lawan-jangkar=(\w+)$/gm)].map((m) => [m[1]!, m[2]!, m[3]!]);
    expect(v).toHaveLength(5); // sehat, berkas diubah, database dipalsukan, bersama, pulih
    const tabel = badan.split("\n").filter((b) => /^\| (Keadaan sehat|File di penyimpanan|Pemilik schema mengganti|File dan baris database) /.test(b)).map(sel);
    expect(tabel).toEqual([
      ["Keadaan sehat", ...v[0]!], ["File di penyimpanan diubah satu byte", ...v[1]!], ["Pemilik schema mengganti checksum di database", ...v[2]!], ["File dan baris database diubah bersama", ...v[3]!],
    ]);
    expect(v[4]).toEqual(v[0]);
    expect(aE.teks).toContain("ERROR:  permission denied for table arsip_partisi\n   -- SQLSTATE 42501");
    expect(aE.teks).toContain("# 3. Berkas dan baris database diubah bersama (penyerang yang menulis ulang keduanya). Hanya jangkar di luar database yang melihatnya:");
    expect(aE.teks).toContain("# Tidak dicakup: pihak yang bisa mengubah berkas jangkar, database, dan berkas arsip sekaligus.");
    expect(aE.teks).toContain("jangkar harian yang digabung dengan rantai audit_log: Tidak dijalankan.");
    expect(readme).toContain("Penggabungan ke satu jangkar harian dengan rantai `audit_log`: **Tidak dijalankan**.");
    expect(dasarT5).toContain('"GRANT SELECT, INSERT ON snapshot_saldo, arsip_partisi TO api_t5"');
    expect(dasarT5).not.toMatch(/GRANT[^"]*UPDATE[^"]*arsip_partisi/); // klaim negatif berlingkup: daftar hak labs/api-t5/dasar_t5.py
  });
});

describe("rekaman rotasi.txt: rotate, rewrap, versi minimum, trim, OpenBao tidak tersedia, dan jarak rotasi", () => {
  test("bagian B dan C: rotate membuat versi 2 dan versi 1 tetap terbuka; rewrap tanpa plaintext; UPDATE ditolak 42501 sampai GRANT dua kolom", () => {
    expect(rB.teks).toContain("versi terbaru 2, min_decryption_version 1, min_encryption_version 0, min_available_version 0, versi yang tampil di daftar kunci [1, 2]");
    expect(rB.teks).toContain("# Data key terbungkus versi 1 masih terbuka sesudah rotate:");
    expect(rC.teks).toContain('{"data_key_terbungkus": "<data key terbungkus posting_lalu_02 v2>", "versi_kek": 2}');
    expect(rC.teks).toContain("rewrap tidak pernah menjawab teks biasa");
    expect(rC.teks).toContain("ERROR:  permission denied for table arsip_partisi\n   -- SQLSTATE 42501");
    expect(rC.teks).toContain("GRANT UPDATE (kunci_data_terbungkus, versi_kek) ON arsip_partisi TO api_t5");
    expect(rC.teks).toContain("UPDATE 1");
    expect(rC.teks).toContain("# File arsip tidak disentuh (checksum sama)");
    expect(readme).toContain("Hak ini belum ada di `api-t5`; lab memberikannya di schema sendiri.");
  });
  test("bagian D dan E: versi minimum naik dan turun bisa dibalik; trim butuh min_encryption_version; setelah trim 400 dan arsip yang tertinggal tidak terbuka", () => {
    expect(hitung(rD.teks, /too old/g)).toBe(1);
    expect(rD.teks).toContain("# Kenaikan itu bisa dibalik, jadi bukan pencabutan: versi 1 masih tersimpan di OpenBao.");
    expect(rD.teks).toContain("versi yang tampil di daftar kunci [2]");
    expect(rE.teks).toContain('{"errors": ["minimum available version cannot be set when minimum encryption version is not set"]}');
    expect(rE.teks).toContain('{"errors": ["min decryption version should not be less then min available version"]}');
    expect(rE.teks).toContain("min_decryption_version 2, min_encryption_version 2, min_available_version 2, versi yang tampil di daftar kunci [2]");
    expect(hitung(rE.teks, /disallowed by policy \(too old\)/g)).toBe(1);
    expect(rE.teks).toMatch(/\n objek\/posting_lalu_01\.enc \| 1\n\(1 row\)/);
    expect(rE.teks).toContain("pencabutan sungguhan = rewrap semua, lalu trim.");
    expect(readme).toContain("Sesudah `trim`, `min_decryption_version` tidak bisa diturunkan lagi di bawah versi yang tersisa.");
    // tabel lima langkah: nomor bagian yang dikutip ada dan memuat bukti
    expect(badan).toContain("Versi terbaru jadi 2, data key versi 1 tetap terbuka (`rotasi.txt` bagian B)");
    expect(badan).toContain("Data key terbungkus versi 2, file tidak berubah (bagian C)");
    expect(badan).toContain("Versi 1 ditolak 400 (bagian D)");
    expect(badan).toContain("Versi 1 dihapus dari OpenBao (bagian E)");
    expect(badan).toContain("Satu baris tersisa di rekaman, jadi belum boleh lanjut (bagian E)");
  });
  test("bagian F: OpenBao dijeda 5 detik lalu terbuka lagi; restart mode dev menghapus mount transit dan arsip tidak terbuka (404)", () => {
    expect(rF.teks).toContain("sampai batas waktu klien (5 detik)");
    expect(rF.teks).toContain("Client.Timeout exceeded while awaiting headers");
    expect(rF.teks).toContain("# Container dilanjutkan: posting_lalu_02 terbuka lagi.");
    expect(rF.teks).toContain("# mount sesudah restart: ['cubbyhole/', 'identity/', 'secret/', 'sys/']");
    expect(rF.teks).toContain('no handler for route "transit/decrypt/kek-arsip"');
    expect(baoGo).toContain("Timeout: 5 * time.Second");
    expect(runPy).toContain('"-dev", "-dev-no-store-token"');
    expect(readme).toContain("OpenBao mode produksi (penyimpanan persisten, unseal, audit device)");
    expect(badan).toContain("Mode dev menyimpan semua di memori, jadi restart menghapus mount transit dan arsip yang dibungkus KEK itu tidak terbuka lagi (404)");
  });
  test("kode: Arsipkan meminta data key sebelum membuka tujuan; tidak menulis teks biasa data key; jangkar tanpa kunci file", () => {
    const arsipkan = envelopeGo.slice(envelopeGo.indexOf("func Arsipkan"), envelopeGo.indexOf("// Buka membaca"));
    expect(arsipkan.indexOf("p.BuatDataKey(ctx)")).toBeGreaterThan(-1);
    expect(arsipkan.indexOf("p.BuatDataKey(ctx)")).toBeLessThan(arsipkan.indexOf("os.OpenFile(tujuan"));
    expect(arsipkan).toContain("defer clear(dek)");
    expect(envelopeGo).not.toMatch(/WriteFile|Fprint|log\./); // klaim negatif berlingkup: envelope.go tidak menulis ke file lain atau log
    expect(badan).toContain("Kode `Arsipkan` meminta data key sebelum membuka file tujuan, jadi percobaan yang ditolak itu tetap memakai satu permintaan data key.");
    expect(baca("labs/t5-kms/jangkar/jangkar.go")).not.toMatch(/Flock|flock|Lock\(/);
  });
});

describe("Hitungan atas Asumsi, label sumber, dan klaim dari dokumentasi", () => {
  test("masukan: 200.000 aktif, 3 transaksi (naskah) dan 2 (registry); 438 dan 292 juta posting; 12 file per tahun; 36,5 juta dan 9,1 GB dari 5.11", () => {
    expect(AKTIF).toBe(200_000);
    expect(TRX).toBe(3);
    expect(TRX_REG).toBe(2);
    expect(POSTING_TAHUN).toBe(438_000_000);
    expect(POSTING_TAHUN_2).toBe(292_000_000);
    expect(badan).toContain("438 juta posting per tahun, yaitu 200.000 user aktif × 3 transaksi per user per hari × 2 posting per transaksi × 365 hari ([[t5-partisi]]). Dengan dua transaksi per user aktif per hari hasilnya 292 juta.");
    expect(partisiHal).toContain("| Posting per bulan | 438 juta ÷ 12 | 36,5 juta | 24,3 juta |");
    expect(partisiHal).toContain("| Ukuran posting per bulan | 36,5 juta × 250 byte | 9,1 GB | 6,1 GB |");
    expect(partisiHal).toContain("438 juta posting per tahun, yaitu 200.000 × 3 × 2 × 365");
    expect(fmt(bulat(POSTING_TAHUN / FILE_PER_TAHUN / 1e6, 1), 1)).toBe("36,5");
    expect(badan).toContain("Satu bulan arsip di skala naskah 36,5 juta posting dan 9,1 GB (Hitungan atas Asumsi, [[t5-partisi]]).");
    expect(aB.teks).toContain("(12 data key per tahun bila satu per bulan)");
  });
  test("tabel Hitungan: tiap sel dihitung ulang dari rumusnya, pembulatan setengah ke atas; sama dengan rotasi.txt bagian G dan Cek diri 4", () => {
    const t3 = BATAS / POSTING_TAHUN, t2 = BATAS / POSTING_TAHUN_2, tf = BATAS / FILE_PER_TAHUN;
    expect(fmt(BATAS)).toBe("4.294.967.296");
    const baris = badan.split("\n").filter((b) => /^\| (Batas satu versi KEK|Jarak rotasi, satu data key per (posting|file)) \|/.test(b)).map(sel);
    expect(baris).toEqual([
      ["Batas satu versi KEK", "2^32", `${fmt(BATAS)} enkripsi`, "sama"],
      ["Jarak rotasi, satu data key per posting", `${fmt(BATAS)} ÷ posting per tahun`, `${fmt(bulat(t3, 3), 3)} tahun (${fmt(bulat(t3, 1), 1)})`, `${fmt(bulat(t2, 3), 3)} tahun (${fmt(bulat(t2, 1), 1)})`],
      ["Jarak rotasi, satu data key per file", `${fmt(BATAS)} ÷ 12`, `${fmt(bulat(tf, 0))} tahun`, "sama"],
    ]);
    expect([fmt(bulat(t3, 1), 1), fmt(bulat(t2, 1), 1), fmt(bulat(tf))]).toEqual(["9,8", "14,7", "357.913.941"]);
    expect(rG.teks).toContain(`= ${fmt(bulat(t3, 1), 1)} tahun sampai satu versi KEK mencapai batas`);
    expect(rG.teks).toContain(`= ${fmt(bulat(t2, 1), 1)} tahun sampai satu versi KEK mencapai batas`);
    expect(rG.teks).toContain(`${fmt(BATAS)} ÷ 12 = ${fmt(bulat(tf))} tahun`);
    expect(rG.teks).toContain(`${fmt(POSTING_TAHUN)} posting per tahun`);
    expect(rG.teks).toContain(`${fmt(POSTING_TAHUN_2)} posting per tahun`);
    expect(badan).toContain(`${fmt(BATAS)} ÷ ${fmt(POSTING_TAHUN)} = ${fmt(bulat(t3, 3), 3)} tahun, dan ${fmt(bulat(t2, 3), 3)} tahun dengan 292 juta posting (Hitungan atas Asumsi).`);
    expect(badan).toContain(`Satu versi KEK mencapai 2^32 enkripsi dalam ${fmt(bulat(t3, 1), 1)} tahun (${fmt(bulat(t2, 1), 1)} dengan dua transaksi).`);
    expect(badan).toContain(`turun ke ${fmt(bulat(t3, 1), 1)} tahun (${fmt(bulat(t2, 1), 1)} dengan dua transaksi).`);
    expect(badan).toContain("dari 12 per tahun menjadi 438 juta".replace("dari 12 per tahun menjadi", "Jumlahnya naik dari 12 menjadi") + " per tahun");
    // 438 juta ÷ 12 per tahun: baris riset memuat hasil yang sama
    const r = barisRiset("R5-239");
    for (const s of ["4.294.967.296", "438.000.000", "292.000.000", "9,80586", "14,70879", "357.913.941,33", "1.282.100"]) expect(r, s).toContain(s);
    expect(BATAS / POSTING_TAHUN).toBeCloseTo(9.80586, 5);
    expect(BATAS / POSTING_TAHUN_2).toBeCloseTo(14.70879, 5);
  });
  test("jarak rotasi ditulis per versi kunci, bukan umur kunci; hitungan baru dimulai oleh rotate; syarat nonce acak dibaca dari kode OpenBao", () => {
    expect(badan).toContain("Batas 2^32 itu berlaku per versi kunci, dan `rotate` memulai hitungan baru.");
    expect(badan).toContain("Jadi angka di bawah adalah jarak rotasi terjauh per versi kunci, bukan umur kunci.");
    expect(badan).toContain("Itu jarak rotasi terjauh per versi kunci, bukan umur kunci, karena `rotate` memulai hitungan baru.");
    expect(badan).not.toMatch(/umur KEK/i);
    expect(readme).toContain("Batasnya berlaku per versi kunci: `rotate` memulai hitungan baru, jadi 9,8 tahun adalah jarak rotasi terjauh, bukan akhir hidup kunci.");
    const r = barisRiset("R5-235");
    expect(r).toContain("`KeyType_AES128_GCM96` dan `KeyType_AES256_GCM96` tanpa `opts.Convergent` memakai `cipher.NewGCMWithRandomNonce`");
    expect(r).toContain("mulai baris 2230; `cipher.NewGCMWithRandomNonce` dipanggil di baris 2258");
    expect(badan).toContain("Kode OpenBao v2.7.2 memakai `NewGCMWithRandomNonce` untuk kunci AES-GCM tanpa convergent encryption (`sdk/helper/keysutil/policy.go`, fungsi `SymmetricEncryptRaw`, dibuka 2026-11-04).");
  });
  test("label turunan didefinisikan sebelum dipakai: Asumsi, Hitungan, Penalaran, Tidak dijalankan; Ilustrasi lewat Label sumber; [perlu verifikasi] hanya dua baris (HSM dan Sengaja belum)", () => {
    const def = badan.indexOf("Angka beban halaman ini Asumsi, yaitu angka pilihan penulis tanpa rekaman.");
    expect(def).toBeGreaterThan(0);
    expect(badan).toContain("Hitungan adalah hasil rumus dari angka yang tertulis di halaman, dan ia berlabel sama dengan masukan terlemahnya.");
    expect(badan).toContain("Penalaran adalah kesimpulan dari kode atau dokumentasi, bukan hasil ukuran.");
    expect(badan).toContain("Tidak dijalankan berarti dicek ke dokumentasi atau kode tanpa dijalankan.");
    for (const kata of ["Hitungan atas", "(penalaran", "Tidak dijalankan", "Asumsi"]) {
      const pertama = badan.indexOf(kata);
      expect(pertama, kata).toBeGreaterThanOrEqual(def - 1);
    }
    expect(badan.indexOf("Dalam cerita, Laras bertanya")).toBeGreaterThan(0);
    const pv = badan.split("\n").filter((b) => b.includes("[perlu verifikasi]"));
    expect(pv).toHaveLength(2);
    for (const b of pv) expect(b, b).not.toMatch(/rotate|rewrap|trim|min_decryption_version|nonce acak|NewGCMWithRandomNonce|2\^32/); // yang sudah ditutup lewat dokumentasi dan kode OpenBao v2.7.2
    expect(pv.join("\n")).toMatch(/SoftHSM 2\.7\.0/);
    expect(pv.join("\n")).not.toMatch(/Serverpod|serverpod|NIST/); // keduanya sudah ditutup dengan sumber primer (serverpod_docs, halaman NIST Rev. 1)
    expect(readme).toContain("bahwa ia bekerja dengan SoftHSM 2.7.0 [perlu verifikasi]");
  });
  test("klaim dari dokumentasi: tiap tautan eksternal dan tanggal ada di baris riset, versi sama, kutipan pendek dikunci di riset", () => {
    const r = [235, 236, 237, 238, 239].map((n) => barisRiset(`R5-${n}`)).join("\n");
    const url = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const tanpaRiset = new Set(["https://github.com/openbao/openbao/blob/v2.7.2/website/content/docs/api/secret/transit.mdx", "https://github.com/openbao/openbao/blob/v2.7.2/website/content/docs/secrets/transit/index.mdx"]);
    for (const u of new Set(url)) {
      const kunci = u.replace(/^https:\/\/(github\.com\/|www\.)?/, "").replace(/\/blob\/[^/]+\//, "/").split("/").slice(0, 3).join("/");
      expect(tanpaRiset.has(u) || r.toLowerCase().includes(kunci.toLowerCase().split("/").slice(0, 2).join("/")) || /nvlpubs|laravel\.com|djangoproject|cryptography\.io|supabase|nodejs|serverpod/.test(u), u).toBe(true);
    }
    expect(r).toContain("v26.13.0");
    expect(r).toContain("laravel/docs cabang 13.x");
    expect(r).toContain("tag 5.2");
    expect(r).toContain("cryptography 50.0.2");
    expect(r).toContain("4.1.0");
    expect(r).toContain("2026-10-30T19:33:14Z");
    for (const k of ["Because this never returns plaintext", "untrusted users or scripts", "Once set, this cannot be disabled.", "Once trimmed, previous versions of the key cannot be recovered.", "in an emergency", "should"]) expect(barisRiset("R5-235"), k).toContain(k);
    for (const k of ["shall not exceed 2^32", "A given key MUST NOT be used to encrypt more than 2^32 messages", "8.3"]) expect(barisRiset("R5-236"), k).toContain(k);
    for (const k of ["NEVER REUSE A NONCE", "OverflowError", "SECRET_KEY_FALLBACKS", "APP_PREVIOUS_KEYS", "AES-256-CBC", "docs.serverpod.dev", "Authenticated Encryption"]) expect(barisRiset("R5-237"), k).toContain(k);
    expect(frontmatter + badan).not.toMatch(/\bdibuka 2026-(?!11-04)/); // semua pembukaan sumber pada 2026-11-04
    expect(hitung(badan, /dibuka 2026-11-04/g)).toBeGreaterThanOrEqual(10);
    for (const b of badan.split("\n").filter((x) => /\]\(https:\/\/(github\.com\/openbao|nvlpubs)/.test(x) && !x.startsWith("- ["))) expect(b, b).toContain("dibuka 2026-11-04");
  });
  test("tab Stack lain: enam tab berurutan, hanya Go dijalankan; tiga kode ilustrasi berlabel; kata dokumentasi stack ada di baris riset", () => {
    const ts = cocok(badan, /<TabSet id="stack" labels=\{\["Go", "Node\.js", "Laravel", "Django", "Dart \(Serverpod\)", "Supabase"\]\}>/);
    expect(ts).not.toBeNull();
    expect(hitung(badan, /<Fragment slot="t\d">/g)).toBe(6);
    for (let n = 0; n < 6; n++) expect(badan).toContain(`<Fragment slot="t${n}">`);
    const slot = (n: number): string => badan.slice(badan.indexOf(`<Fragment slot="t${n}">`), badan.indexOf("</Fragment>", badan.indexOf(`<Fragment slot="t${n}">`)));
    expect(slot(0)).toContain("*Dijalankan: lab t5-kms, Go 1.27.3 dan OpenBao v2.7.2");
    for (let n = 1; n < 6; n++) expect(slot(n), `slot t${n}`).toContain("*Tidak dijalankan.");
    for (let n = 1; n <= 3; n++) expect(slot(n), `slot t${n}`).toMatch(/[Kk]ode di bawah adalah Ilustrasi\.\*/);
    expect(slot(4)).toContain("kode Dart tidak ditulis di tab ini.");
    expect(kodeInline.map((k) => k.lang)).toEqual(["js", "php", "python"]);
    expect(readme).toContain("| Go | 1.27.3 |");
    expect(slot(1)).toContain("Halaman itu tidak memuat kata KMS atau envelope.");
    expect(slot(2)).toContain("Halaman itu tidak membahas data key per file, KMS, atau envelope.");
    expect(slot(3)).toContain("kata encrypt tidak muncul di sana");
    expect(slot(4)).toContain("kata encrypt, KMS, dan envelope tidak muncul di dokumen desain cloud storage maupun di dua halaman dokumentasi resmi itu");
    expect(slot(4)).toContain("[serverpod/serverpod_docs](https://github.com/serverpod/serverpod_docs)");
    expect(slot(4)).not.toContain("perlu verifikasi");
    expect(slot(5)).toContain("bukan file arsip");
    // klaim negatif tab Node, Laravel, Django, dan Serverpod dicek ke teks mentah yang dikutip riset (grep tanpa membedakan huruf besar)
    const r = barisRiset("R5-237");
    expect(r).toContain("`grep -i` untuk kms, envelope, key management, dan data key menghasilkan nol baris");
    expect(r).toContain("`grep -i` untuk kms, envelope, dan data key nol baris");
    expect(r).toContain("kata encrypt tidak muncul (`grep -i`)");
    expect(r).toContain("kunci akar 64 karakter heksadesimal, jadi kunci project lama dapat disalin ke project baru");
    expect(slot(5)).toContain("kunci akar project lama dapat diambil lewat Management API dan disalin ke project baru");
    expect(slot(4)).not.toMatch(/dirender dengan JavaScript/);
    expect(r).toContain("tidak memuat kata encrypt, kms, atau envelope (`grep -i`)");
  });
});

describe("diagram Rantai, skenario alur, ADR 57, dan kartu Cek diri", () => {
  test("Rantai ringkas: dua baris, empat simpul, angka dari rekaman; teks simpul pendek dan tanpa ID internal", () => {
    expect(diagram.baris).toHaveLength(2);
    expect(diagram.baris.map((b) => b.label)).toEqual(["Ditutup", "Diputar"]);
    expect(diagram.baris.map((b) => b.sub)).toEqual(["arsip.txt bagian C dan D", "rotasi.txt bagian B dan C"]);
    expect(diagram.baris.flatMap((b) => b.simpul.map((s) => s.teks))).toEqual(["Tanpa hak: 403", "Bit diubah: GCM gagal", "rotate: versi 2", "rewrap: file utuh"]);
    for (const b of diagram.baris) for (const s of b.simpul) expect(s.teks.length, s.teks).toBeLessThanOrEqual(22);
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t5-kms · arsip.txt dan rotasi.txt" });
    expect(aC.teks).toContain("openbao menjawab 403");
    expect(aD.teks).toContain("autentikasi GCM gagal");
    expect(rB.teks).toContain("versi terbaru 2");
    expect(rC.teks).toContain('"versi_kek": 2');
    expect(rC.teks).toContain("# File arsip tidak disentuh (checksum sama)");
    expect(diagram.catatan).toBe("Angka dari rekaman lab skala kecil: dua file arsip 28.000 baris, satu OpenBao v2.7.2 mode dev di satu mesin. Satu data key per file arsip.");
    expect(badan).toContain("File arsip dikunci dengan kunci yang tidak ikut tersimpan bersamanya, jadi file yang disalin tidak terbaca.");
    expect(badan.match(/^File arsip dikunci[^\n]*$/m)![0]!.length).toBeLessThanOrEqual(150);
  });
  test("skenario t5-kms: lima langkah utama, varian mulai di 2 dengan tiga langkah; tiap baris kirim ada di rotasi.txt; angka jelas sama dengan rekaman", () => {
    expect(skenario.versi).toBe(2);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t5-kms/output/rotasi.txt", fileVarian: "labs/t5-kms/output/rotasi.txt" });
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-kms.json" />'); // widget memuat skenario ini, bukan skenario halaman lain
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(skenario.komponen.map((k) => k.id)).toEqual(["op", "job", "bao"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.mulai).toBe(2);
    expect(skenario.varian.langkah).toHaveLength(3);
    const garis = new Set(rotasi.split("\n"));
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) {
      for (const b of l.kirim.split("\n")) {
        // "..." menggantikan satu argumen "-berkas <nama>.enc" (kata berkas ditolak audit bahasa di data widget); selebihnya sama dengan baris rekaman
        const [awal, akhir] = b.includes(" ... ") ? b.split(" ... ") : [b, ""];
        const ada = b.includes(" ... ") ? [...garis].some((g) => g.startsWith(`${awal} -berkas `) && g.endsWith(` ${akhir}`)) : garis.has(b);
        expect(ada, `kirim tidak ada di rotasi.txt: ${b}`).toBe(true);
      }
      expect(["op", "job"]).toContain(l.dari);
      expect(l.ke).toBe("bao");
    }
    // langkah utama = bagian B, C, D; varian = bagian E
    expect(skenario.langkah[0]!.kirim).toContain("/rotate");
    expect(skenario.langkah[1]!.kirim).toContain("kmsarsip rewrap");
    expect(skenario.langkah[2]!.kirim).toContain('"min_decryption_version": 2');
    expect(skenario.langkah[3]!.kirim).toContain("too old");
    expect(skenario.langkah[4]!.kirim).toContain('"min_decryption_version": 1');
    expect(skenario.langkah[4]!.kirim).toContain("terbuka: 1282072 byte");
    expect(skenario.langkah[3]!.jelas).toContain("1.282.072 byte");
    expect(JSON.stringify(skenario)).not.toMatch(/-berkas/); // audit bahasa menolak kata berkas di data widget
    expect(hitung(skenario.langkah.map((l) => l.kirim).join("\n") + skenario.varian.langkah.map((l) => l.kirim).join("\n"), / \.\.\. /g)).toBe(4);
    expect(skenario.varian.langkah[0]!.kirim).toContain("/trim");
    expect(skenario.varian.langkah[1]!.kirim).toContain("HTTP 400");
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual(["warn", "warn", "warn"]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["", "good", "", "warn", "good"]);
    expect(skenario.predict.q).toContain("menurunkan min_decryption_version ke 1 lagi. Apa yang terjadi?");
    // pertanyaan Tebak tampil sebelum langkah dibaca: tanpa rujukan ke nomor langkah
    expect(`${skenario.predict.q} ${skenario.predict.options.join(" ")}`).not.toMatch(/langkah \d/i);
    expect(skenario.predict.explain).toContain("400");
    // noscript memuat hasil kedua jalur
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)\n<\/noscript>/)[1]!;
    expect(ns).toContain("1.282.072 byte");
    expect(ns).toContain("menurunkan `min_decryption_version` ke 1 ditolak 400");
    expect(ns).toContain("Daftar kunci hanya memuat versi 2, dan posting_lalu_01 tetap ditolak (`rotasi.txt` bagian E).");
  });
  test("ADR 57: opsi A sampai E, tabel enam kolom konsisten, delapan aturan, tiga pre-mortem, enam butir Kapan salah, enam baris Sengaja belum; sama dengan naskah", () => {
    const adr = badan.slice(badan.indexOf("### ADR 57"), badan.indexOf("### Sengaja belum dilakukan"));
    const tabel = adr.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel).toHaveLength(7); // header, pemisah, lima baris
    for (const b of tabel) expect(sel(b), b).toHaveLength(6);
    expect(sel(tabel[0]!)).toEqual(["", "A. Enkripsi disk saja", "B. Satu data key per posting", "C. Satu data key per tabel", "D. Enkripsi oleh penyedia penyimpanan", "E. Satu data key per file arsip"]);
    expect(tabel.slice(2).map((b) => sel(b)[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    const naskahAdr = naskah.split("\n").find((b) => b.startsWith("| 57 |"))!;
    for (const k of ["Enkripsi disk saja", "data key per posting", "data key per tabel", "enkripsi oleh penyedia penyimpanan"]) expect(naskahAdr, k).toContain(k);
    expect(naskahAdr).toContain("Data key AES-256-GCM per file dengan nonce acak 96 bit");
    expect(adr.match(/^\d+\. /gm)!.length).toBe(8 + 3);
    expect(cocok(adr, /\*\*Keputusan: opsi E\.\*\* Delapan aturan:/)).not.toBeNull();
    expect(cocok(adr, /\*\*Pre-mortem\.\*\* Bayangkan keputusan ini gagal 6 bulan lagi\. Tiga penyebab yang paling mungkin:/)).not.toBeNull();
    const salah = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Belum diputuskan.**"));
    expect(hitung(salah, /^- /gm)).toBe(6);
    expect(adr).toContain("**Belum diputuskan.** Tiga hal ini pertanyaan terbuka, bukan aturan.");
    expect(adr).toContain("**Yang akan merevisinya.** Naskah Tahap 5 belum menugaskan ADR berikutnya untuk merevisi keputusan ini.");
    // klaim negatif berlingkup naskah: tidak ada ADR lain di naskah yang menyebut ADR 57 sebagai yang direvisi
    expect(naskah.split("\n").filter((b) => /^\| (5[89]|60) \|/.test(b) && /ADR 57/.test(b))).toEqual([]);
    for (const a of ["A ditolak", "B ditolak", "C ditolak", "D ditolak"]) expect(adr, a).toContain(`**${a}**`);
    // aturan 5 dan 6 diturunkan dari rekaman dan kode (tinjauan 5.26): trim butuh min_encryption_version, dan checksum di database
    // adalah SHA-256 atas FILE TERENKRIPSI, jadi pemeriksaannya mendahului dekripsi dan tidak membandingkan hasil dekripsi dengannya.
    expect(rE.teks).toContain("minimum available version cannot be set when minimum encryption version is not set");
    expect(adr).toContain("lalu naikkan `min_encryption_version` dan jalankan `trim`. `trim` ditolak 400 bila `min_encryption_version` belum diisi (`rotasi.txt` bagian E)");
    expect(readme).toContain("Checksum = SHA-256 atas file terenkripsi**, bukan atas CSV");
    expect(envelopeGo).toContain("Checksum: Checksum(blob)");
    expect(adr).toContain("6. Pemulihan lebih dulu membandingkan SHA-256 file terenkripsi dengan checksum di database dan jangkar, tanpa KMS. Sesudah itu ia membuka data key terbungkus lewat OpenBao dan mendekripsi file, dan tag GCM yang cocok menunjukkan isinya tidak berubah.");
    expect(adr).not.toMatch(/SHA-256 hasilnya/);
    // satu byte di data key terbungkus: galat GCM milik OpenBao (KEK aes256-gcm96), bukan GCM atas file
    expect(aA.teks).toContain('"type": "aes256-gcm96"');
    expect(aD.teks).toContain("openbao menjawab 400: cipher: message authentication failed");
    expect(badan).toContain("Pesannya sama dengan galat GCM karena KEK berjenis `aes256-gcm96`, jadi pemeriksaan keaslian yang gagal adalah milik OpenBao atas data key itu:");
    expect(badan).not.toMatch(/ditolak OpenBao, bukan GCM/);
    const bukti = sel(tabel.at(-1)!);
    expect(bukti.slice(1)).toEqual(["Tidak dijalankan: penalaran", "Hitungan, `rotasi.txt` bagian G", "Tidak dijalankan: penalaran", "Tidak dijalankan: kunci di tangan penyedia", "Rekaman lab `arsip.txt`, `rotasi.txt`, dan `testing.txt`"]);
    expect(adr).toContain("Satu varian aturan 5 ditolak oleh rekaman: `trim` sebelum semua arsip dibungkus ulang membuat posting_lalu_01 tidak terbuka lagi (`rotasi.txt` bagian E).");
    expect(adr).toContain("Delapan aturan:");
    expect(adr).toContain("Hak `UPDATE` atas `kunci_data_terbungkus` dan `versi_kek` untuk role aplikasi adalah usulan lab dan belum ada di daftar hak `api-t5`.");
    expect(adr).toContain("Saat pemulihan menunggu OpenBao lebih lama dari RTO 15 menit di [[t5-prd]] (Asumsi produk).");
    const sengaja = badan.slice(badan.indexOf("### Sengaja belum dilakukan"), badan.indexOf('<Blok nama="Kunci">')).split("\n").filter((b) => b.startsWith("|"));
    expect(sengaja).toHaveLength(8); // header, pemisah, enam baris
    for (const b of sengaja) expect(sel(b), b).toHaveLength(3);
    expect(sel(sengaja[0]!)).toEqual(["Yang ditunda", "Kenapa ditunda", "Muncul lagi di"]);
    expect(baca("situs/src/content/docs/tahap-5/prd-v5.mdx")).toContain("RTO 15 menit");
  });
  test("Cek diri: empat soal dengan jawaban yang menunjuk bagian rekaman; kartu ulang sama dengan halaman; checklist dan bacaan lanjut", () => {
    const kunci = badan.slice(badan.indexOf('<Blok nama="Kunci">'));
    expect(hitung(kunci, /^\*\*\d\.\*\* /gm)).toBe(4);
    expect(hitung(kunci, /<details class="success">/g)).toBe(4);
    for (const k of ["(`arsip.txt` bagian C)", "(`arsip.txt` bagian D)", "(`rotasi.txt` bagian D dan E)"]) expect(kunci, k).toContain(k);
    const soal = [...kunci.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => ({ tanya: m[2]!, jawab: m[3]! }));
    expect(soal).toHaveLength(4);
    const kartu = kartuJson.filter((k) => k.halaman === "t5-kms");
    expect(kartu.map((k) => k.id)).toEqual(["t5-kms-1", "t5-kms-2", "t5-kms-3", "t5-kms-4"]);
    kartu.forEach((k, i) => {
      expect(k.tanya).toBe(soal[i]!.tanya);
      expect(k.jawab).toBe(soal[i]!.jawab.replace(/\n\n/g, " "));
      expect(k.url).toBe("tahap-5/arsip-envelope-encryption/");
      expect(k.judul).toBe("5.26 Keamanan 12: Arsip dan cadangan, envelope encryption + ADR 57");
    });
    expect(hitung(kunci, /^- \[ \] /gm)).toBe(7);
    expect(kunci).toContain("### Saat me-review kode AI, cek ini");
    expect(kunci).toContain("### Bacaan lanjut");
    expect(hitung(kunci.slice(kunci.indexOf("### Bacaan lanjut")), /^- \[/gm)).toBe(8);
    expect(kunci).toContain("Satu data key per posting menghasilkan 438 juta data key per tahun.");
  });
  test("halaman istilah dan glosarium: enam baris menunjuk [[t5-kms]]; dua halaman istilah memakai ID riset yang ada dan istilah terkait yang ada; Nonce milik 5.25 tidak diubah", () => {
    const baris = glosarium.filter((g) => ["AES-GCM", "Data key", "Envelope encryption", "HSM (hardware security module)", "KEK (key encryption key)", "KMS (key management service)"].includes(g.t));
    expect(baris).toHaveLength(6);
    const gm = baca("situs/src/content/docs/alat/glosarium.mdx");
    expect(hitung(gm, /\| \[\[t5-kms\]\] \|/g)).toBe(6);
    // "Nonce" sudah didefinisikan halaman 5.25 (arti tanda tangan): halaman ini memberi arti nonce AES-GCM sendiri di prosa, tanpa baris atau halaman istilah baru
    expect(hitung(gm, /^\| \*\*Nonce\*\* \|/gm)).toBe(1);
    expect(gm).toMatch(/\| \*\*Nonce\*\* \|[^\n]*\[\[t5-waf\]\] \|/);
    for (const slug of ["envelope-encryption", "kms"]) {
      const d = JSON.parse(baca(`situs/data/halaman-istilah/${slug}.json`)) as { istilah: string; cerita: { rujukan: string }[]; terkait: string[]; sumber: { riset: string; rekaman?: string; url?: string }[] };
      expect(glosarium.some((g) => g.t === d.istilah && g.h === `/istilah/${slug}/`), slug).toBe(true);
      for (const t of d.terkait) expect(glosarium.some((g) => g.t === t), t).toBe(true);
      expect(d.cerita.map((c) => c.rujukan)).toEqual(["t5-kms"]);
      for (const s of d.sumber) {
        expect(IDS, s.riset).toContain(s.riset);
        if (s.rekaman) expect(terlacak ? terlacak.has(s.rekaman) : true, s.rekaman).toBe(true);
      }
    }
  });
  test("hasil tanpa JavaScript; ID riset, nomor keputusan, dan PR tidak tampil", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/keputusan \d{3,4}|PR #?\d{3}|tinjauan PR/i);
    for (const t of tag) expect(t).not.toMatch(/R\d-\d+/);
    for (const k of [aA, aB, aC, aD, aE, rB, rC, rD, rE, rF, rG]) expect(k.teks).not.toMatch(/R\d-\d+|keputusan \d+|PR \d+/);
    expect(JSON.stringify(skenario)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3}|PR #?\d{3}/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
});

describe("struktur: judul bagian", () => {
  test("daftar judul bagian dan tingkatnya: satu Inti, tiga judul Paham, ADR dan Sengaja belum di Putuskan, tiga judul Kunci", () => {
    const judul = [...badan.matchAll(/^(#{2,6}) (.+)$/gm)].map((m) => `${m[1]!.length} ${m[2]}`);
    expect(judul).toEqual([
      "2 Inti", "3 Kenapa ini ada", "3 Cara kerjanya", "3 Di stack lain", "3 ADR 57: satu data key per file arsip, dibungkus KEK di KMS",
      "3 Sengaja belum dilakukan", "3 Cek diri", "3 Saat me-review kode AI, cek ini", "3 Bacaan lanjut",
    ]);
    expect(badan.match(/^\*\*[^*\n]+\*\*/gm)!.length).toBeGreaterThanOrEqual(20);
  });
});

describe("rentang Snippet diturunkan dari struktur rekaman dan kode", () => {
  test("tiga belas Snippet berkas: berkas, rentang, dan judul sama dengan penanda di sumber; tiga kode inline", () => {
    const fungsi = (isi: string, awal: (b: string) => boolean): [number, number] => {
      const a = nomor(isi, awal);
      const z = nomor(isi, (b) => b === "}", a);
      return [a, z];
    };
    const kode = (rel: string): string => baca(rel);
    const [encA] = fungsi(envelopeGo, (b) => b.startsWith("func aead("));
    const [, encZ] = fungsi(envelopeGo, (b) => b.startsWith("func Enkripsi("));
    const [encKom] = [nomor(envelopeGo, (b) => b.startsWith("// Enkripsi mengembalikan"))];
    const [arsA, arsZ] = fungsi(envelopeGo, (b) => b.startsWith("func Arsipkan("));
    const [baoA, baoZ] = fungsi(baoGo, (b) => b.startsWith("func (k *Klien) BuatDataKey("));
    const baoKom = nomor(baoGo, (b) => b.startsWith("// BuatDataKey meminta"));
    expect(baoA - baoKom).toBe(1);
    expect(arsA - nomor(envelopeGo, (b) => b.startsWith("// Arsipkan mengenkripsi"))).toBe(0 + 1);
    const baris = (isi: string, dariPenanda: (b: string) => boolean, sampaiPenanda: (b: string) => boolean): string => {
      const a = nomor(isi, dariPenanda);
      return `${a}:${nomor(isi, sampaiPenanda, a)}`;
    };
    const harapan: [string, string, string][] = [
      ["labs/t5-kms/envelope/envelope.go", `${encA}:${encZ}`, `Kode lab: labs/t5-kms/envelope/envelope.go baris ${encA} sampai ${encZ} (aead dan Enkripsi)`],
      ["labs/t5-kms/bao/bao.go", `${baoKom}:${baoZ}`, `Kode lab: labs/t5-kms/bao/bao.go baris ${baoKom} sampai ${baoZ} (BuatDataKey)`],
      ["labs/t5-kms/output/arsip.txt", baris(arsip, (b) => b.startsWith("# Ukuran berkas terenkripsi"), (b) => b === "(2 rows)"), "Rekaman lab: labs/t5-kms/output/arsip.txt, bagian B (dua arsip, dua data key terbungkus)"],
      ["labs/t5-kms/envelope/envelope.go", `${arsA}:${arsZ}`, `Kode lab: labs/t5-kms/envelope/envelope.go baris ${arsA} sampai ${arsZ} (Arsipkan)`],
      ["labs/t5-kms/output/arsip.txt", baris(arsip, (b) => b.startsWith("# Tiap peran punya token sendiri"), (b) => b.startsWith("# backup kek-arsip")), "Rekaman lab: labs/t5-kms/output/arsip.txt, bagian A (export KEK ditolak)"],
      ["labs/t5-kms/output/arsip.txt", baris(arsip, (b) => b.startsWith("# Membuka dengan data key milik file lain"), (b) => b.startsWith("# Kedua kali galatnya")), "Rekaman lab: labs/t5-kms/output/arsip.txt, bagian C (data key file lain, token pengarsip, token tidak dikenal)"],
      ["labs/t5-kms/output/arsip.txt", baris(arsip, (b) => b.startsWith("# Tiap token hanya bisa satu dari tiga operasi"), (b) => b.startsWith("#   token pembungkus-ulang:")), "Rekaman lab: labs/t5-kms/output/arsip.txt, bagian C (enam sel di luar diagonal)"],
      ["labs/t5-kms/output/arsip.txt", baris(arsip, (b) => b.startsWith("# Satu byte di data key terbungkus"), (b) => b.startsWith("# Lingkup:")), "Rekaman lab: labs/t5-kms/output/arsip.txt, bagian D (data key terbungkus diubah)"],
      ["labs/t5-kms/output/arsip.txt", baris(arsip, (b) => b.startsWith("# 3. Berkas dan baris database diubah bersama"), (b) => b.startsWith("# jangkar harian yang digabung")), "Rekaman lab: labs/t5-kms/output/arsip.txt, bagian E (file dan database diubah bersama)"],
      ["labs/t5-kms/output/rotasi.txt", baris(rotasi, (b) => b.includes("/trim -H") && b.includes('"min_available_version": 2'), (b) => b.startsWith("# posting_lalu_01, yang tidak sempat")), "Rekaman lab: labs/t5-kms/output/rotasi.txt, bagian E (trim, menurunkan versi, dan membuka arsip)"],
      ["labs/t5-kms/output/rotasi.txt", baris(rotasi, (b) => b.startsWith("$ BAO_TOKEN=<token pembungkus-ulang> kmsarsip rewrap"), (b) => b === "UPDATE 1"), "Rekaman lab: labs/t5-kms/output/rotasi.txt, bagian C (rewrap dan hak UPDATE dua kolom)"],
      ["labs/t5-kms/output/rotasi.txt", baris(rotasi, (b) => b.startsWith("# Container OpenBao dijeda"), (b) => b.startsWith("# KEK ikut hilang")), "Rekaman lab: labs/t5-kms/output/rotasi.txt, bagian F (OpenBao dijeda lalu dimulai ulang)"],
      ["labs/t5-kms/envelope/envelope.go", `${encKom}:${encZ}`, "labs/t5-kms/envelope/envelope.go (Enkripsi)"],
    ];
    expect(tag).toHaveLength(13);
    expect(berkasSnippet.map((f, i) => [f, lines[i], judulSnippet[i]])).toEqual(harapan);
    for (const f of new Set(berkasSnippet)) expect(terlacak ? terlacak.has(f) : true, f).toBe(true);
    // rentang rekaman jatuh di dalam bagian yang dikutip judulnya
    const dalam = (isi: string, huruf: string, rentang: string): void => {
      const b = bagianRekaman(isi, huruf);
      const [a, z] = rentang.split(":").map(Number);
      expect(a, `${huruf} awal`).toBeGreaterThanOrEqual(b.awal);
      expect(z, `${huruf} akhir`).toBeLessThanOrEqual(b.awal + b.baris.length - 1);
    };
    dalam(arsip, "B", lines[2]!);
    dalam(arsip, "A", lines[4]!);
    dalam(arsip, "C", lines[5]!);
    dalam(arsip, "C", lines[6]!);
    dalam(arsip, "D", lines[7]!);
    dalam(arsip, "E", lines[8]!);
    dalam(rotasi, "E", lines[9]!);
    dalam(rotasi, "C", lines[10]!);
    dalam(rotasi, "F", lines[11]!);
    expect(kode("labs/t5-kms/envelope/envelope.go").split("\n")[encA - 1]).toBe("func aead(dek []byte) (cipher.AEAD, error) {");
    for (const j of judulSnippet) expect(j).not.toMatch(/keputusan|PR \d|R\d-\d/);
  });
});

describe("penjaga tambahan: tautan, paragraf ganda, angka prosa, kutipan bagian", () => {
  test("kutipan bagian rekaman: tiap kalimat yang menyebut (`berkas` bagian X) memuat bukti yang benar-benar ada di bagian itu", () => {
    const peta: Record<string, ReturnType<typeof bagianRekaman>> = { "arsip.txt:A": aA, "arsip.txt:B": aB, "arsip.txt:C": aC, "arsip.txt:D": aD, "arsip.txt:E": aE, "rotasi.txt:B": rB, "rotasi.txt:C": rC, "rotasi.txt:D": rD, "rotasi.txt:E": rE, "rotasi.txt:F": rF, "rotasi.txt:G": rG };
    const rujuk = [...badan.matchAll(/`(arsip|rotasi)\.txt` bagian ([A-G])(?: dan ([A-G]))?/g)];
    expect(rujuk.length).toBeGreaterThanOrEqual(12);
    for (const m of rujuk) for (const h of [m[2], m[3]].filter(Boolean)) expect(peta[`${m[1]}.txt:${h}`], `${m[0]}`).toBeDefined();
    const kalimat = (frag: string): string => badan.split("\n").find((b) => b.includes(frag))!;
    expect(kalimat("Hanya jangkar yang melihat pemalsuan ketiga")).toBeDefined();
    expect(aE.teks).toContain("Hanya jangkar di luar database yang melihatnya");
    expect(kalimat("jadi pemalsuan kedua butuh role dengan hak `UPDATE` atas kolom itu, seperti pemilik schema di rekaman (`arsip.txt` bagian E)")).toContain("42501");
    expect(kalimat("Rekaman bagian E")).toBeUndefined();
    expect(kalimat("Arsip hanya bertambah.")).toContain("`arsip.txt` bagian B");
    expect(kalimat("Semuanya dijawab `autentikasi GCM gagal`.")).toBeDefined();
  });
  test("tanpa paragraf, butir, atau sel prosa ganda di badan halaman (toContain puas dengan satu kemunculan)", () => {
    const panjang = badan.split("\n").map((b) => b.trim()).filter((b) => b.length > 60 && !b.startsWith("<") && !b.startsWith("|") && !b.startsWith("```"));
    expect(new Set(panjang).size).toBe(panjang.length);
    const sel2 = badan.split("\n").filter((b) => b.startsWith("|")).flatMap(sel).filter((c) => c.length > 40);
    expect(new Set(sel2).size).toBe(sel2.length);
  });
  test("angka di prosa: tiap angka bertanda baca ribuan atau desimal tercatat di rekaman, README, riset, halaman tetangga, atau hitungan", () => {
    const sumber = [arsip, rotasi, testing, readme, riset, partisiHal, m43, naskah, skenarioMentah].join("\n");
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/\]\([^)]*\)/g, "]").replace(/`[^`]*`/g, " ").replace(/dibuka 2026-\d\d-\d\d|terbit 2026-\d\d-\d\d|2026-\d\d-\d\d/g, " ");
    const angka = new Set([...prosa.matchAll(/\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\b|\b\d+,\d+\b/g)].map((m) => m[0]));
    expect(angka.size).toBeGreaterThan(8);
    for (const a of angka) {
      const polos = a.replace(/\./g, "").replace(",", ".");
      expect(sumber.includes(a) || sumber.includes(polos) || sumber.includes(a.replace(",", ".")), `angka ${a} tidak ada di sumber`).toBe(true);
    }
    expect(badan).not.toMatch(/\b9,8 tahun\b[^|\n]*umur/);
  });
});

// Pin kelas: tetap berjalan pada putaran TANPA_KUNCI=1. Menjaga hitungan kata kunci, label, kode status, huruf bagian, versi, angka,
// tanggal, baris tabel, dan semua nilai daun diagram, skenario, dan baris riset, supaya sisipan, penggantian, dan penukaran satu nilai tertangkap.
describe("pin kelas: kata kunci, angka, tanggal, baris tabel, dan nilai daun", () => {
  test("hitungan kata kunci, label, kode status, huruf bagian, dan versi sama dengan yang ditinjau", () => {
    const hasil = Object.fromEntries(KATA_POLA.map(([n, re, f]) => [n, hitung(badan, new RegExp(re, f))]));
    expect(hasil).toEqual(PIN.kata);
    expect(PIN.kata["Vault"]).toBe(3); // hanya tab Supabase menyebut Vault
    expect(PIN.kata["OpenBao"]).toBeGreaterThan(30);
  });
  test("angka di prosa dan tabel (kecuali Snippet dan tautan), tanggal, dan baris tabel sama dengan yang ditinjau", () => {
    const prosa = badan.replace(/<Snippet[^>]*\/>/g, "").replace(/\]\([^)]*\)/g, "]").replace(/<[^>]+>/g, " ");
    expect([...(prosa.match(/\b\d[\d.,]*\d\b|\b\d\b/g) ?? [])].sort()).toEqual(PIN.angka);
    expect([...(badan.match(/2026-\d\d-\d\d/g) ?? [])].sort()).toEqual(PIN.tanggal);
    expect(badan.split("\n").filter((b) => b.startsWith("|") && !/^\|[-| ]+\|$/.test(b)).map(sidik)).toEqual(PIN.tabel);
  });
  test("nilai daun diagram dan skenario dan baris riset utuh sama dengan yang ditinjau", () => {
    const daun = (o: unknown, j = ""): [string, string | number | boolean][] =>
      typeof o === "string" || typeof o === "number" || typeof o === "boolean" ? [[j, o]] : Array.isArray(o) ? o.flatMap((v, i) => daun(v, `${j}[${i}]`)) : o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => daun(v, `${j}.${k}`)) : [];
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(WIDGET_DAUN);
    expect(IDS.map(barisRiset)).toEqual(RISET_TERKUNCI);
  });
});

// Tinjauan 5.26 (keputusan 1603): mutan kalimat mekanisme dan atribusi lolos putaran tanpa kunci di seri pelaksana (42 dari 143). Tiap frasa
// kunci di bawah harus ada TEPAT SATU kali di halaman dan sumbernya (rekaman, kode, README, naskah, atau baris riset) memuat dasarnya, jadi
// mengubah frasa atau sumbernya menggagalkan tes ini juga pada putaran TANPA_KUNCI=1.
describe("frasa kunci mekanisme dan atribusi: ada tepat sekali, dan sumbernya memuat dasarnya", () => {
  const rujukRiset = (n: number): string => barisRiset(`R5-${n}`);
  const naskahAdr57 = naskah.split("\n").find((b) => b.startsWith("| 57 |"))!;
  const adr57 = badan.slice(badan.indexOf("### ADR 57"), badan.indexOf("### Sengaja belum dilakukan"));
  const kasus: [string, () => void][] = [
    ["Mode GCM menempelkan tag pemeriksa keaslian di akhir pesan.", () => expect(aD.teks).toContain("nonce di byte 0-11, ciphertext, tag di 16 byte terakhir")],
    ["di Go membuat nonce acak dan menaruhnya di depan ciphertext", () => expect(envelopeGo).toContain("nonce (12 byte) || ciphertext || tag (16 byte)")],
    ["jadi file terenkripsi berisi nonce 12 byte, ciphertext, dan tag 16 byte", () => expect(envelopeGo).toContain("nonce (12 byte) || ciphertext || tag (16 byte)")],
    ["lewat jalur `datakey/plaintext`. OpenBao dibahas", () => { expect(baoGo).toContain('"datakey/plaintext"'); expect(runPy).toContain("transit/datakey/plaintext/{KEK}"); }],
    ["dan memanggil `clear` atas slice-nya sesudah dipakai", () => { expect(hitung(envelopeGo, /defer clear\(dek\)/g)).toBe(2); }],
    ["operator pun ditolak saat meminta isi kunci", () => { expect(aA.teks).toContain("private key material is not exportable"); expect(aA.teks).toContain("<token operator>"); }],
    ["Tiga peran dan tiga jalur menghasilkan enam sel di luar diagonal, dan semuanya dijawab 403:", () => { expect(hitung(aC.teks, /\b(arsipkan|buka|rewrap) 403\b/g)).toBe(5); expect(aC.teks).toContain("kmsarsip: openbao menjawab 403: 1 error occurred"); }],
    ["File yang terpotong atau diperpanjang satu byte dan periode lain juga gagal.", () => { expect(hitung(aD.teks, /^kmsarsip: autentikasi GCM gagal/gm)).toBe(8); }],
    ["Tes Go membalik satu bit di tiap byte sebuah blob kecil", () => { const t = baca("labs/t5-kms/envelope/envelope_test.go"); expect(t).toContain("for i := range blob"); expect(t).toContain("ubah[i] ^= 0x01"); }],
    ["di file yang hanya bertambah dan berada di luar database", () => expect(readme).toContain("file JSONL di luar database yang hanya bertambah")],
    ["Dua belas file per tahun adalah satu file arsip per bulan.", () => expect(aB.teks).toContain("(12 data key per tahun bila satu per bulan)")],
    ["satu pembungkusan data key memakai satu nonce acak 96 bit di KEK", () => expect(rG.teks).toContain("satu pembungkusan data key memakai satu nonce acak 96 bit di KEK")],
    ["Itu berlaku pada konstruksi IV berbasis generator bilangan acak", () => expect(rujukRiset(236)).toContain("konstruksi IV berbasis RBG untuk IV sepanjang apa pun")],
    ["Perintah `rotate` membuat versi kunci baru", () => expect(rB.teks).toContain("rotate: versi baru dibuat")],
    ["Ikhtisar transit menulis bahwa dalam keadaan darurat", () => expect(rujukRiset(235)).toMatch(/secrets\/transit\/index\.mdx`: Working set management[^;]*in an emergency/)],
    ["NIST membuka panggilan komentar pra-draf kedua untuk revisi SP 800-38D", () => expect(rujukRiset(236)).toContain("(2nd Preliminary Draft)")],
    ["pada 1 Juni 2026, dan halamannya", () => expect(rujukRiset(236)).toContain("dipublikasikan 1 Juni 2026")],
    ["https://csrc.nist.gov/pubs/sp/800/38/d/r1/2prd", () => expect(rujukRiset(236)).toContain("csrc.nist.gov/pubs/sp/800/38/d/r1/2prd")],
    ["`createCipheriv` menerima IV dari pemanggil", () => expect(rujukRiset(237)).toContain("`crypto.createCipheriv(algorithm, key, iv)` menerima iv dari pemanggil")],
    ["`SECRET_KEY_FALLBACKS` dipakai untuk memutar kunci tanda tangan", () => expect(rujukRiset(237)).toContain("`SECRET_KEY_FALLBACKS` dapat dipakai untuk memutar kunci")],
    ["menimbulkan `OverflowError`", () => expect(rujukRiset(237)).toContain("data lebih dari 2^31 − 1 byte menimbulkan `OverflowError`")],
    ["dengan backend database, GCP, S3, dan Cloudflare R2", () => expect(rujukRiset(237)).toContain("backend database, GCP, S3, dan Cloudflare R2")],
    ["tiap project punya kunci akar sendiri", () => expect(rujukRiset(237)).toContain("tiap project punya kunci akar sendiri")],
    ["`miekg/pkcs11` v1.1.2 hanya dicek ada", () => expect(readme).toContain("`github.com/miekg/pkcs11` v1.1.2 | **Tidak dijalankan**")],
    ["dan teks biasanya hanya hidup di memori proses", () => { expect(envelopeGo).not.toMatch(/os\.WriteFile|log\.|fmt\.Print/); expect(baoGo).not.toMatch(/\bos\.|log\./); }],
    ["pengarsip untuk `datakey/plaintext`, pembuka untuk `decrypt`, dan pembungkus-ulang untuk `rewrap`", () => { for (const [p, j] of [["pengarsip", "datakey/plaintext"], ["pembuka", "decrypt"], ["pembungkus-ulang", "rewrap"]]) expect(runPy).toContain(`"${p}": f'path "transit/${j}/{KEK}" {{ capabilities = ["update"] }}'`); }],
    ["dan checksum SHA-256 atas file terenkripsi. Checksum yang sama", () => expect(readme).toContain("Checksum = SHA-256 atas file terenkripsi**")],
    ["- Saat KEK dan file arsip tersimpan di tempat yang sama.", () => expect(naskahAdr57).toContain("KEK dan file tersimpan di tempat yang sama")],
    ["- [ ] `trim` hanya dijalankan sesudah query `versi_kek` lama mengembalikan nol baris.", () => { expect(adr57).toContain("periksa bahwa tidak ada `versi_kek` lama"); expect(rE.teks).toContain("WHERE versi_kek < 2"); }],
    ['<details class="question">', () => expect(hitung(badan, /<details class="success">/g)).toBe(4)],
    ["<Rantai data={intiDiagram} ringkas />", () => expect(diagram.baris).toHaveLength(2)],
    ['<Snippet file="labs/t5-kms/bao/bao.go" lines="82:104" lang="go"', () => expect(baoGo.split("\n")[81]).toContain("// BuatDataKey")],
    ['<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: menaikkan min_decryption_version menolak arsip yang masih terbungkus versi lama tetapi bisa dibalik, dan data key terbungkus hanya bisa dibuka lagi bila OpenBao masih menyimpan versinya (rotasi.txt bagian D dan E).">', () => { expect(rD.teks).toContain("Kenaikan itu bisa dibalik"); expect(rE.teks).toContain("hilang"); }],
    ["**Status:** diterima sesudah ADR 49.", () => expect(naskah).toContain("| 49 |")],
    ["- **B ditolak** karena tiap posting butuh satu data key dan satu panggilan KMS.", () => expect(naskahAdr57).toContain("ditolak: satu panggilan KMS tiap baris")],
  ];
  for (const [frasa, bukti] of kasus) {
    test(`frasa kunci: ${frasa.slice(0, 70).replace(/\n/g, " ")}`, () => {
      const di = `${badan}\n${frontmatter}`;
      expect(di.split(frasa).length - 1, "kemunculan di halaman").toBe(1);
      bukti();
    });
  }
  test("frontmatter: judul dan description utuh", () => {
    expect(frontmatter).toContain("description: ADR 57 mengenkripsi tiap file arsip partisi dengan satu data key, dan data key itu dibungkus kunci di OpenBao. Harganya tiga. Pemulihan butuh OpenBao hidup, mencabut versi kunci lama punya urutan, dan checksum di database butuh jangkar di luarnya.");
  });
  test("rekaman: daftar kunci sesudah trim memuat versi 2 saja, dan restart mode dev dijawab 404", () => {
    expect(hitung(rE.teks, /versi yang tampil di daftar kunci \[2\]/g)).toBe(2);
    expect(rF.teks).toContain("openbao menjawab 404: no handler for route");
  });
  test("glosarium: enam baris 5.26 sama dengan yang ditinjau, dan arti Nonce mencakup tanda tangan dan nonce AES-GCM 96 bit", () => {
    const gm = baca("situs/src/content/docs/alat/glosarium.mdx").split("\n").filter((b) => /^\| \*\*(AES-GCM|Data key|Envelope encryption|HSM|KEK|KMS)\*\*/.test(b));
    expect(gm).toEqual(GLOSARIUM);
    const nonce = baca("situs/src/content/docs/alat/glosarium.mdx").split("\n").filter((b) => b.startsWith("| **Nonce** |"));
    expect(nonce).toHaveLength(1);
    expect(nonce[0]).toContain("Di tanda tangan pesan, penerima menolak pesan bila nilainya muncul dua kali.");
    expect(nonce[0]).toContain("Di AES-GCM, nonce acak 96 bit tidak boleh berulang untuk kunci yang sama.");
    expect(badan).toContain("Nonce adalah angka sekali pakai 96 bit yang tidak boleh berulang untuk kunci yang sama.");
  });
});

// TANPA_KUNCI=1 melewati blok ini (kunci kalimat dan sidik) supaya uji mutasi bisa menilai tes turunan sendirian (putaran TANPA kunci).
describe.skipIf(process.env.TANPA_KUNCI === "1")("kunci: kalimat, sidik, kata penuh, dan baris riset", () => {
  test("setiap baris badan sama dengan KALIMAT_TERKUNCI, urut dan utuh", () => {
    const kalimat = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const beda = kalimat.findIndex((k, i) => k !== KALIMAT_TERKUNCI[i]);
    expect(beda === -1 ? "" : `baris ${beda + 1}: ${kalimat[beda]} ≠ ${KALIMAT_TERKUNCI[beda]}`).toBe("");
    expect(kalimat).toHaveLength(KALIMAT_TERKUNCI.length);
  });
  test("sidik: frontmatter, lima baris riset, diagram, skenario, tiap Snippet berkas dan kode inline", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
    expect(IDS.map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(sidik(skenarioMentah)).toBe(SIDIK.widget);
    const sn = tag.map((_t, i) => {
      const [a, b] = lines[i]!.split(":").map(Number);
      return sidik(teksBaris(baca(berkasSnippet[i]!), a!, b!));
    });
    expect(sn).toEqual(SIDIK.snippet);
    expect(kodeInline.map((k) => sidik(k.kode))).toEqual(SIDIK.kode);
  });
  test("baris riset: lima ID berurutan 235 sampai 239, tanpa ID ganda di berkas, di antara R5-229 dan R5-245 (rentang, bukan tetangga langsung)", () => {
    const urut = riset.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R5-(\d+) \|/)![1]));
    expect(new Set(urut).size).toBe(urut.length);
    const i = urut.indexOf(235);
    expect(urut.slice(i, i + 5)).toEqual([235, 236, 237, 238, 239]);
    expect(urut.indexOf(229)).toBeLessThan(i);
    expect(urut.indexOf(245)).toBeGreaterThan(i + 4);
    for (const id of IDS) expect(barisRiset(id).split("|")).toHaveLength(7); // lima kolom
  });
  test("kata penuh dihitung: hanya, tidak ada, tidak pernah, semua, setiap, selalu, tiap sama dengan yang ditinjau", () => {
    const k = SIDIK.kata;
    expect(hitung(badan, /\bhanya\b/gi)).toBe(k.hanya);
    expect(hitung(badan, /\btidak ada\b/gi)).toBe(k.tidakAda);
    expect(hitung(badan, /\btidak pernah\b/gi)).toBe(k.tidakPernah);
    expect(hitung(badan, /\bsemua\b/gi)).toBe(k.semua);
    expect(hitung(badan, /\bsetiap\b/gi)).toBe(k.setiap);
    expect(hitung(badan, /\bselalu\b/gi)).toBe(k.selalu);
    expect(hitung(badan, /\btiap\b/gi)).toBe(k.tiap);
    // kalimat universal dibatasi lingkupnya
    expect(badan).toContain("Di rekaman, pembacaan kunci hanya menjawab waktu pembuatan tiap versi");
    expect(badan).toContain("Role aplikasi hanya punya `SELECT` dan `INSERT` atas `arsip_partisi` di daftar hak `api-t5`");
    expect(badan).toContain("Lingkupnya satu: file arsip ini dengan data key terbungkus yang tercatat.");
  });
});
