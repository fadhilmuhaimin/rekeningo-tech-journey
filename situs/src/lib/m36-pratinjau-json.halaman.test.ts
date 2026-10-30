// Penjaga halaman 4.20: angka, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim "dibaca dari kode",
// klaim negatif berlingkup, Hitungan, diagram Rantai, skenario alur t4-m36.json, baris riset, dan kartu Cek diri di
// m36-pratinjau-json.mdx diturunkan dari rekaman labs/t4-ssrf (alamat.txt, batas.txt), rekaman dan kode labs/api-t4
// (testing.txt, unduh.go, katalog_impor.go, handler_bo.go), naskah Tahap 4, registry, dan baris riset, bukan dari daftar yang
// ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.17): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (di
// berkas nilai) mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat
// terkunci tidak menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, judul Snippet, diagram, skenario, kartu, baris
// riset) dikunci dengan sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m36-pratinjau-json.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DIAGRAM_DAUN, KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK, SKENARIO_DAUN } from "./m36-pratinjau-json.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-4/m36-pratinjau-json.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t4-m36.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const alamatTxt = baca("labs/t4-ssrf/output/alamat.txt");
const batasTxt = baca("labs/t4-ssrf/output/batas.txt");
const readmeSsrf = baca("labs/t4-ssrf/README.md");
const testingApi = baca("labs/api-t4/output/testing.txt");
const fiturApi = baca("labs/api-t4/output/fitur.txt");
const rentanApi = baca("labs/api-t4/output/rentan.txt");
const unduhGo = baca("labs/api-t4/internal/unduh/unduh.go");
const katalogGo = baca("labs/api-t4/internal/service/katalog_impor.go");
const handlerGo = baca("labs/api-t4/internal/handler/handler_bo.go");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
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
interface H { bagian?: number; id: string; judul: string; label?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const KATA: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh", 8: "delapan" };
const kata = (n: number): string => KATA[n] ?? String(n);
const Kata = (n: number): string => kata(n)[0]!.toUpperCase() + kata(n).slice(1);
const rapat = (t: string): string => t.replace(/\s+/g, " ").trim();
// CIDR sendiri (IPv4 dan IPv6, IPv4-mapped dibuka): dipakai untuk menurunkan dari kode awalan mana yang menangkap alamat rekaman.
const keAngka = (alamat: string): { v: 4 | 6; n: bigint } => {
  const a = alamat.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, "$1");
  if (a.includes(".")) return { v: 4, n: a.split(".").reduce((x, o) => (x << 8n) + BigInt(o), 0n) };
  const [kiri, kanan] = a.split("::");
  const bagi = (t?: string): string[] => (t ? t.split(":") : []);
  const L = bagi(kiri), R = bagi(kanan);
  const nol = kanan === undefined ? [] : Array<string>(8 - L.length - R.length).fill("0");
  return { v: 6, n: [...L, ...nol, ...R].reduce((x, g) => (x << 16n) + BigInt(`0x${g}`), 0n) };
};
const masukCidr = (alamat: string, cidr: string): boolean => {
  const [awal, panjang] = cidr.split("/");
  const c = keAngka(awal!), x = keAngka(alamat);
  if (c.v !== x.v) return false;
  const geser = BigInt((c.v === 4 ? 32 : 128) - Number(panjang));
  return c.n >> geser === x.n >> geser;
};

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
const A = bagian(alamatTxt);
const B = bagian(batasTxt);
const TA = bagian(testingApi);
const U = bagian(unduhGo);
const K = bagian(katalogGo);

// alamat.txt bagian pertama: tabel 37 alamat (empat penanda dan keputusan fetcher aman)
const tabel = A.baris.map((b) => b.match(/^(\S+)\s+(ya|tidak)\s+(ya|tidak)\s+(ya|tidak)\s+(ya|tidak)\s+(tolak|lolos)\s+(.+)$/)).filter((m): m is RegExpMatchArray => m !== null);
const terlarang = tabel.filter((m) => m[6] === "tolak");
const kontrol = tabel.filter((m) => m[6] === "lolos");
const TERLARANG = terlarang.length;
const KONTROL = kontrol.length;
const PRIVAT = terlarang.filter((m) => m[2] === "ya");
const EMPAT = terlarang.filter((m) => [m[2], m[3], m[4], m[5]].includes("ya"));
const aSimpul = A.nomor((b) => b.startsWith("ditolak fetcher aman: "));
const aEmpat = A.nomor((b) => b.startsWith("dari 32 alamat terlarang yang sama, "), aSimpul);

// batas.txt: redirect, pesan galat, nama
const bRedirect = B.nomor((b) => b.startsWith("## redirect dimatikan"));
const bRedirectAkhir = B.nomor((b) => b.startsWith("--- PASS: TestSSRFBatasRedirectTidakDiikutiUntukSemuaKode"), bRedirect);
const redirect = B.baris.slice(bRedirect, bRedirectAkhir - 1).map((b) => b.match(/^redirect (\d{3}) ke server lain: ditolak \(tujuan tidak diizinkan\); server pertama disentuh: (\d+), server tujuan redirect disentuh: (\d+)$/)).filter((m): m is RegExpMatchArray => m !== null);
const KODE_REDIRECT = redirect.map((m) => Number(m[1]));
const bGalat = B.nomor((b) => b.startsWith("## pesan galat versi aman"));
const bGalatAwal = B.nomor((b) => b.startsWith("200 berisi JSON layanan dalam"), bGalat);
const bLiteral = B.nomor((b) => b.startsWith("penolakan karena alamat literal: "), bGalat);
const bGalatKode = B.nomor((b) => b.startsWith("pesan galat versi aman di kode: "), bGalat);
const galat = B.baris.slice(bGalatAwal - 1, bLiteral - 1).map((b) => b.match(/^(\d{3}) berisi JSON layanan dalam\s+pesan: "([^"]+)"$/)).filter((m): m is RegExpMatchArray => m !== null);
const bNama = B.nomor((b) => b.startsWith("## batas yang belum tertutup"));
const bTesAman = TA.nomor((b) => b === "--- PASS: TestRentanPesanGalatMembocorkanIsiLayananDalam");

// kode: fungsi Rentan sampai akhir berkas, dan penanda di dalamnya
const uRentan = U.nomor((b) => b.startsWith("func Rentan("));
const rentanTubuh = U.teks(uRentan, U.baris.length);
const uDeny = U.nomor((b) => b.startsWith('\tif strings.Contains(alamat, "localhost")'), uRentan);
const uKlien = U.nomor((b) => b.startsWith("\tresp, err := (&http.Client{}).Do(req)"), uRentan);
const uGalat = U.nomor((b) => b === '\tif resp.StatusCode != http.StatusOK || !strings.HasPrefix(tipe, "image/") {', uRentan);
const uGalatAkhir = U.nomor((b) => b === "\t}", U.nomor((b) => b.startsWith('\t\treturn Gambar{}, fmt.Errorf("bukan gambar (status %d): %s"'), uGalat)) ;
const kHasil = K.nomor((b) => b.startsWith("// HasilImpor: "));
const kHasilAkhir = K.nomor((b) => b === "}", kHasil);
const kPanggil = K.nomor((b) => b.startsWith("\t\t\tg, err := pengunduh(ctx, rentan, b.GambarURL)"));
const kPanggilAkhir = K.nomor((b) => b.startsWith("\t\t\thasil[i].Pratinjau = &g"), kPanggil);
const AWAL_GALAT = Number(cocok(unduhGo, /awalGalatRentan = (\d+)/)[1]);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1]);
const berkasSnippet = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
const judulSnippet = tag.map((t) => t.match(/title="([^"]+)"/)?.[1]);
const langSnippet = tag.map((t) => t.match(/lang="([^"]+)"/)?.[1]);

// naskah M36
const barisM36 = naskah.split("\n").find((b) => b.startsWith("| M36 |"))!;
const HARI = cocok(barisM36, /\| M36 \| 9 \| (Senin)\. Ratih meninjau merchant baru/)[1]!;
const TOKO = cocok(barisM36, /toko "([^"]+)" berisi teks JSON/)[1]!;
const KATA_LAYANAN = cocok(barisM36, /dengan kata `([^`]+)`, bukan gambar/)[1]!;

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.20 ada, masalah, jalur inti, prasyarat 4.15, lab t4-ssrf, peran security dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-m36")).toMatchObject({ ada: true, nomor: "4.20", jenis: "masalah", bagian: 4, inti: true, prasyarat: ["t4-storage"], lab: ["t4-ssrf"], tahap: 4, peran: ["security", "backend"] });
    expect(dari("t4-ssrf").nomor).toBe("4.21");
    expect(dari("t4-storage").nomor).toBe("4.15");
    expect(frontmatter).toContain('title: "4.20 M36: Pratinjau gambar yang berisi JSON"');
    expect(frontmatter).toContain("description: Minggu 9. Kolom pratinjau gambar sebuah toko berisi teks JSON dari layanan dalam, karena server mengunduh alamat yang diisi merchant dan mengembalikan sebagian jawabannya.");
    expect(dari("t4-m36").judul).toBe("M36: Pratinjau gambar yang berisi JSON");
    expect(naskah).toContain("| 4.20 | 4 | M36: Pratinjau gambar yang berisi JSON | Masalah | ★ | t4-ssrf | alur |");
    expect(barisM36).toMatch(/^\| M36 \| 9 \|/);
    expect(dari("t4-m36").label).toBe("Masalah 36 · minggu 9");
    harus("Minggu 9 Tahap 4.");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-storage\]\] · Jalur inti<\/p>/);
    expect(dari("t4-m36").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(id).toEqual(["A0", "t4-ssrf", "t4-storage"]);
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(dari("t4-ssrf").adr).toEqual([41]);
    expect(dari("t4-ssrf").judul.startsWith("Keamanan 8: SSRF")).toBe(true);
    expect(naskah).toMatch(/\| 4\.21 \| \d+ \| Keamanan 8: SSRF/);
    expect(dari("t4-storage").judul.startsWith("Keamanan 7: File identitas")).toBe(true);
    expect(naskah).toMatch(/\| 4\.15 \| \d+ \| Keamanan 7: File identitas/);
    harus("Konsep dan keputusannya ada di [[t4-ssrf]].");
    harus("Penyimpanan objek dibahas di [[t4-storage]].");
    harus("- [[t4-ssrf]]: SSRF, alamat tujuan yang diperiksa saat server menghubunginya, dan batas unduhan. Keputusannya ADR 41.");
    expect(badan.match(/ADR 41/g)).toHaveLength(1);
    expect(badan.match(/ADR \d+/g)).toEqual(["ADR 41"]);
  });
  test("janji ke 4.21 ditepati menurut naskah: ADR 41 memuat IsPrivate tidak cukup (29 dari 32) dan peta halaman menaruh keputusan di 4.21", () => {
    harus("Kenapa satu pemeriksaan tidak cukup dibahas di [[t4-ssrf]].");
    expect(naskah).toContain("`IP.IsPrivate` tidak boleh menjadi satu-satunya pemeriksaan (golang/go#79925)");
    expect(naskah).toContain(`di \`alamat.txt\` ${TERLARANG - PRIVAT.length} dari ${TERLARANG} alamat terlarang lolos bila \`IsPrivate\` satu-satunya pemeriksaan`);
    expect(naskah).toMatch(/\| 41 \| Satu fungsi unduh gambar: hanya https; resolusi DNS lalu pemeriksaan alamat tujuan/);
  });
  test("halaman tidak membuka isi 4.21: tidak ada ControlContext, DNS rebinding, 2 MiB, 3 detik, golang/go, IDNA, atau allowlist sebagai keputusan", () => {
    expect(badan).not.toMatch(/ControlContext|rebinding|MiB|golang\/go#|IDNA|allow-list sebagai|\bdial\b/);
    expect(badan).not.toMatch(/2\.097\.152|3 detik/);
    expect(badan.match(/allow-list/g)).toBeNull();
    // OWASP menyarankan allow-list, tetapi halaman ini hanya menulis bahwa deny-list pilihan terakhir.
    expect(badan.match(/deny-list/g)).toHaveLength(2);
  });
});

describe("naskah M36: gejala, yang dikira, dan yang sebenarnya", () => {
  test("baris M36 di naskah: Senin, Ratih, Toko Andalan, penyimpanan-internal, Laras, gambar rusak atau CSV salah, kolom galat", () => {
    expect(HARI).toBe("Senin");
    expect(TOKO).toBe("Toko Andalan");
    expect(KATA_LAYANAN).toBe("penyimpanan-internal");
    expect(barisM36).toContain("Laras menemukan hal yang sama dalam security review (Ilustrasi).");
    expect(barisM36).toContain("| Gambar rusak atau file CSV salah |");
    expect(barisM36).toContain("Di api-t4 isi respons versi rentan muncul di kolom `galat` baris impor, bukan di kolom `pratinjau`");
    expect(barisM36).toContain("tanpa rekaman tingkat endpoint");
    expect(barisM36).toContain("Pihak yang mencoba mengisi alamat di jaringan dalam (nama layanan penyimpanan objek di container).");
    expect(barisM36).toContain("(R4-14)");
  });
  test("kalimat Gejala: hari, nama toko, kata dari naskah; Ilustrasi; tanpa kalimat definisi dan tanpa konsep", () => {
    harus(`Minggu 9 Tahap 4. ${HARI} Ratih, analis risiko di tim risk, meninjau merchant baru. Ia membuka toko "${TOKO}" dan melihat kolom "pratinjau gambar".`);
    harus(`Isinya teks JSON dengan kata \`${KATA_LAYANAN}\`.`);
    harus("Laras, dari tim security, menemukan hal yang sama dalam security review.");
    harus(`*Angka cerita (Ilustrasi):* hari, nama toko, kata \`${KATA_LAYANAN}\`, dan temuan Laras berasal dari cerita, bukan dari rekaman.`);
    expect(naskah).toContain("| **Ratih** | Analis risiko, memimpin tim risk (3 orang)");
    expect(naskah).toContain("| Tim risk (Ratih) | Melihat akun dan verifikasi; menyetujui merchant;");
    expect(naskah).toMatch(/\| \*\*Laras\*\* \| [^|]*security/i);
    const gejala = cocok(badan, /<Blok nama="Gejala" buka>([\s\S]*?)<\/Blok>/)[1]!;
    expect(gejala.replace(/\*Angka cerita[\s\S]*$/, "")).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut|SSRF|redirect|alamat)\b/i);
    expect(KATA_LAYANAN).not.toMatch(/ /);
    expect(`${alamatTxt}${batasTxt}${testingApi}`).not.toContain(KATA_LAYANAN);
  });
  test("yang dikira sebelum yang sebenarnya; dugaan dari naskah; tebakan tersembunyi di details", () => {
    expect(badan.indexOf('<Blok nama="Yang Raka kira"')).toBeLessThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    harus("Dugaan pertama ada dua, dan keduanya menyalahkan file merchant: gambar produknya rusak, atau file CSV impornya salah isi.");
    harus("Merchant mengisi kolom `gambar_url` di file CSV sendiri, dan pratinjau dibuat dari kolom itu. Tetapi file CSV hanya memuat alamat, bukan isi gambar.");
    expect(barisM36).toContain("dari CSV dengan kolom `gambar_url`, dan server mengunduh URL itu untuk membuat thumbnail");
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(d[1]).toBe("Tebak dulu: file CSV hanya berisi alamat gambar. Dari mana teks JSON di kolom pratinjau itu datang?");
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(d[2]).toContain("Dari jawaban layanan yang beralamat di kolom itu.");
    expect(d[2]).toContain("(dibaca dari kode di blok berikutnya, Tidak dijalankan)");
  });
});

describe("kode lab: impor katalog, versi pertama (Rentan), klaim negatif berlingkup, dan rentang Snippet", () => {
  test("impor katalog: field gambar_url dan hasil dengan kolom pratinjau dan galat; hasil dikembalikan ke pemanggil; pratinjau hanya terisi bila unduhan berhasil", () => {
    expect(katalogGo).toContain("GambarURL string");
    expect(K.teks(kHasil, kHasilAkhir)).toContain('Pratinjau *unduh.Gambar `json:"pratinjau"`');
    expect(K.teks(kHasil, kHasilAkhir)).toContain('Galat     *string       `json:"galat"`');
    expect(K.teks(kPanggil, kPanggilAkhir)).toContain("hasil[i].Galat = &pesan");
    expect(K.teks(kPanggil, kPanggilAkhir)).toContain("pesan := err.Error()");
    const urutan = K.teks(kPanggil, kPanggilAkhir);
    expect(urutan.indexOf("return")).toBeLessThan(urutan.indexOf("hasil[i].Pratinjau = &g"));
    expect(katalogGo.match(/hasil\[i\]\.Pratinjau = /g)).toHaveLength(1);
    expect(katalogGo).toContain("return unduh.Rentan(ctx, alamat)");
    expect(handlerGo).toContain('tulisJSON(w, 200, map[string]any{"hasil": hasil})');
    expect(handlerGo).toMatch(/GambarURL string\s+`json:"gambar_url"`/);
    expect(handlerGo).toContain('"produk"');
    harus("Impor katalog menerima daftar produk, dan tiap produk punya field `gambar_url`. Di cerita daftar itu berasal dari file CSV, dan di kode lab daftar itu dikirim sebagai JSON.");
    harus("lalu mengembalikan hasil tiap baris: nama produk dan dua kolom hasil, `pratinjau` dan `galat` (Tidak dijalankan: dibaca dari kode):");
    harus("Pesan itu disimpan di kolom `galat`, bukan `pratinjau`, karena `pratinjau` hanya terisi bila unduhan berhasil:");
    harus("Jadi \"kolom pratinjau\" di cerita adalah Ilustrasi, dan di kode lab teks itu ada di kolom `galat`.");
  });
  test("butir 1: deny-list hanya dua teks; butir 2: tanpa pemeriksaan alamat hasil resolusi; butir 3: client bawaan; butir 4: 200 byte pertama isi jawaban", () => {
    expect(U.teks(uDeny, uDeny + 2)).toBe('\tif strings.Contains(alamat, "localhost") || strings.Contains(alamat, "127.0.0.1") {\n\t\treturn Gambar{}, errors.New("alamat tidak diizinkan")\n\t}');
    expect(rentanTubuh.match(/strings\.Contains\(alamat, /g)).toHaveLength(2);
    harus("1. Pemeriksaan alamat hanya mencocokkan teks: fungsi mencari dua teks, `localhost` dan `127.0.0.1`, di dalam URL.");
    // klaim negatif berlingkup (fungsi Rentan di unduh.go): tidak ada pemeriksaan alamat hasil resolusi, tidak ada aturan redirect, tidak ada resolver
    expect(rentanTubuh).not.toMatch(/netip|ControlContext|alamatDilarang|CheckRedirect|Resolver|LookupIP|net\.Dialer|DialContext|Transport/);
    harus("2. Alamat hasil resolusi tidak diperiksa.");
    expect(rentanTubuh).toContain("(&http.Client{}).Do(req) // klien bawaan: redirect diikuti, skema http dan https");
    harus("3. Redirect diikuti.");
    expect(AWAL_GALAT).toBe(200);
    expect(rentanTubuh).toContain("if len(awal) > awalGalatRentan {");
    expect(rentanTubuh).toContain('fmt.Errorf("bukan gambar (status %d): %s", resp.StatusCode, awal)');
    expect(rentanTubuh).toContain("resp.StatusCode != http.StatusOK || !strings.HasPrefix(tipe, \"image/\")");
    harus("4. Untuk jawaban yang bukan gambar atau berstatus bukan 200, pesan kesalahan memuat 200 byte pertama isinya. Pesan itu dikembalikan ke merchant.");
    harus("Versi pertama bernama `Rentan` di kode lab.");
    expect(unduhGo).toContain("// Rentan adalah versi pertama minggu 9 (mode unduh-rentan, M36)");
    expect(badan.match(/^\d+\. /gm)!.map((s) => s.replace(/\D/g, ""))).toEqual(["1", "2", "3", "4"]);
    harus("**Empat kelemahan versi pertama.**");
  });
  test("deny-list: OWASP, bentuk lolos bergantung resolver (naskah), dan halaman tidak mencatat bentuk yang lolos", () => {
    harus("Butir 1 adalah deny-list, yaitu daftar yang dilarang.");
    harus("OWASP menulis bahwa deny-list mudah dilewati dan hanya pilihan terakhir (Tidak dijalankan: dibaca dari sumber).");
    const r = barisRiset("R4-205");
    expect(r).toContain('"Deny-lists are bypass-prone. Prefer allow-lists."');
    expect(r).toContain("Deny-list (Last Resort)");
    expect(barisM36).toContain("Bentuk yang lolos bergantung resolver platform");
    expect(barisM36).toContain("jadi halaman tidak menulis bentuk tertentu sebagai pasti tanpa label platform");
    // brief: tanpa bentuk alamat siap pakai dan tanpa alamat metadata cloud sebagai tujuan
    expect(badan).not.toMatch(/2130706433|0x7f000001|\b127\.1\b|0177\.|LOCALHOST|169\.254\.169\.254|%252|@127/);
    harus("jadi halaman ini tidak mencatatnya.");
  });
  test("redirect: dokumentasi Go (kebijakan bawaan 10 request) dan OWASP (matikan redirect) sama dengan baris riset", () => {
    const r6 = barisRiset("R4-206");
    expect(r6).toContain("If CheckRedirect is nil, the Client uses its default policy, which is to stop after 10 consecutive requests.");
    expect(r6).toContain("pkg.go.dev/net/http#Client, go1.27.3, dibuka 2026-10-30");
    harus("Dokumentasi Go menulis bahwa tanpa `CheckRedirect` client berhenti sesudah 10 request beruntun ([net/http, Client](https://pkg.go.dev/net/http#Client), go1.27.3, dibuka 2026-10-30, Tidak dijalankan).");
    expect(barisRiset("R4-205")).toContain("Disable the support for the following of the redirection in your web client");
    harus("OWASP menyarankan redirect dimatikan di client.");
    harus("Pemeriksaan teks hanya melihat URL pertama, jadi alamat luar yang menjawab redirect ke alamat dalam tidak diperiksa lagi.");
    expect(rentanTubuh.match(/strings\.Contains\(alamat, /g)!.length).toBe(2); // satu pemeriksaan teks sebelum permintaan pertama
    expect(U.nomor((b) => b.includes("strings.Contains(alamat, ")) ).toBeLessThan(uKlien);
    harus("Client bawaan Go mengikuti redirect sampai 10 request beruntun (dokumentasi, Tidak dijalankan).");
  });
  test("SSRF: definisi dari OWASP Context dan contoh avatar; klaim pesan kesalahan memuat isi respons berasal dari kode, bukan OWASP", () => {
    const r = barisRiset("R4-205");
    expect(r).toContain('"SSRF is an attack vector that abuses an application to interact with the internal/external network or the machine itself."');
    expect(r).toContain("contoh user yang memasukkan URL gambar avatar untuk diunduh aplikasi");
    expect(r).toContain("Halaman itu tidak membahas pesan kesalahan atau isi respons yang ditampilkan ke user");
    expect(r).toContain("dibuka 2026-10-30");
    harus("OWASP memakai contoh serupa, yaitu user yang mengisi URL gambar avatarnya untuk diunduh aplikasi ([OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), dibuka 2026-10-30, Tidak dijalankan).");
    harus("Masalah seperti ini disebut SSRF (server-side request forgery): aplikasi dipakai untuk menghubungi alamat yang dipilih pihak luar.");
    expect(badan.match(/SSRF/g)).toHaveLength(3); // definisi, nama tautan OWASP, dan butir Konsep yang lahir
    expect(badan.indexOf("SSRF")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    harus("Di cerita, pihak yang mencoba adalah merchant luar yang mengisi `gambar_url` dengan nama layanan penyimpanan objek di jaringan dalam (Ilustrasi).");
    harus("Merchant luar tidak punya akses ke jaringan dalam, yaitu jaringan tempat service Rekeningo saling memanggil.");
  });
  test("tes unit api-t4: dua nama tes tercatat lulus di testing.txt (baris 491 dan 492), tanpa rekaman tingkat endpoint; lab ssrf tidak menjalankan versi pertama", () => {
    expect(TA.baris[bTesAman - 1]).toBe("--- PASS: TestRentanPesanGalatMembocorkanIsiLayananDalam");
    expect(TA.baris[bTesAman]).toBe("--- PASS: TestRentanMengikutiRedirectKeAlamatDalam");
    // butir 4 lebih dulu, butir 3 sesudahnya: sama dengan judul Snippet
    harus("(tes butir 4 dan butir 3, lulus)");
    harus("Dua tes unit `api-t4` menjaga butir 3 dan butir 4, dan keduanya tercatat lulus.");
    harus("Hanya nama tes dan hasilnya yang tercatat, tanpa rekaman tingkat endpoint (Rekaman lab api-t4, tidak dijalankan ulang di lab ini):");
    for (const r of [fiturApi, rentanApi]) for (const b of r.split("\n").filter((x) => x.includes("unduh-rentan"))) expect(b.startsWith("#"), b).toBe(true);
    expect(`${alamatTxt}${batasTxt}`).not.toMatch(/TestRentan|unduh-rentan|func Rentan/);
    expect(readmeSsrf).toContain("Rekaman tingkat endpoint untuk mode `unduh-rentan` tidak ada");
    expect(readmeSsrf).toContain("| (a) fetcher rentan menjangkau tujuan di jaringan container, pesan galat memuat sebagian isi respons | Tidak dijalankan di lab ini |");
    expect(readmeSsrf).toContain("| (b) redirect dari alamat luar ke alamat dalam lolos di versi rentan | Tidak dijalankan di lab ini |");
    harus("Menjalankan versi pertama terhadap layanan tiruan di jaringan container Tidak dijalankan di lab ini, karena lingkup lab dipersempit ke verifikasi sisi pembela.");
    harus("- Versi pertama terhadap layanan tiruan di jaringan container Tidak dijalankan. Yang ada hanya tes unit `api-t4`, tanpa rekaman tingkat endpoint.");
  });
  test("rentang Snippet: berkas, rentang baris, bahasa, dan judul diturunkan dari kode dan rekaman, bukan angka tangan", () => {
    const harap: [string, string, string | undefined, string][] = [
      ["labs/api-t4/internal/service/katalog_impor.go", `${kHasil}:${kHasilAkhir}`, "go", "Kode lab"],
      ["labs/api-t4/internal/unduh/unduh.go", `${uDeny}:${uDeny + 2}`, "go", "Kode lab"],
      ["labs/api-t4/internal/unduh/unduh.go", `${uKlien}:${uKlien}`, "go", "Kode lab"],
      ["labs/api-t4/internal/unduh/unduh.go", `${uGalat}:${uGalatAkhir}`, "go", "Kode lab"],
      ["labs/api-t4/internal/service/katalog_impor.go", `${kPanggil}:${kPanggilAkhir}`, "go", "Kode lab"],
      ["labs/api-t4/output/testing.txt", `${bTesAman}:${bTesAman + 1}`, undefined, "Rekaman lab"],
      ["labs/t4-ssrf/output/alamat.txt", `${aSimpul}:${aEmpat}`, undefined, "Rekaman lab"],
      ["labs/t4-ssrf/output/batas.txt", `${bRedirect + 1}:${bRedirectAkhir - 1}`, undefined, "Rekaman lab"],
      ["labs/t4-ssrf/output/batas.txt", `${bGalatAwal}:${bLiteral}`, undefined, "Rekaman lab"],
      ["labs/t4-ssrf/output/alamat.txt", `${aSimpul}:${aEmpat}`, undefined, "Rekaman lab"],
    ];
    expect(tag).toHaveLength(harap.length);
    harap.forEach(([berkas, rentang, bahasa, jenis], i) => {
      expect(berkasSnippet[i], `Snippet ${i + 1}`).toBe(berkas);
      expect(lines[i], `Snippet ${i + 1}`).toBe(rentang);
      expect(langSnippet[i], `Snippet ${i + 1}`).toBe(bahasa);
      const [a, b] = rentang.split(":").map(Number) as [number, number];
      expect(judulSnippet[i]!.startsWith(a === b ? `${jenis}: ${berkas} baris ${a} (` : `${jenis}: ${berkas} baris ${a} sampai ${b} (`), `judul Snippet ${i + 1}`).toBe(true);
    });
    // tinjauan: keterangan dalam kurung di judul tiap Snippet adalah klaim (tidak dijaga oleh awalan judul di atas)
    expect(judulSnippet.map((j) => j!.match(/\(([^)]+)\)$/)![1])).toEqual([
      "hasil tiap baris: pratinjau dan galat",
      "pemeriksaan hanya teks",
      "client bawaan: redirect diikuti",
      "isi respons ikut di pesan galat",
      "pesan galat disimpan di kolom galat",
      "tes butir 4 dan butir 3, lulus",
      "alamat terlarang dan yang lolos bila IsPrivate saja",
      "redirect tidak diikuti",
      "pesan galat tanpa isi respons",
      "varian: hanya IsPrivate",
    ]);
    // yang tampil di Snippet kode: tanpa komentar internal (nomor keputusan, PR, ID riset)
    for (const [n, a, b] of [[0, kHasil, kHasilAkhir], [1, uDeny, uDeny + 2], [3, uGalat, uGalatAkhir], [4, kPanggil, kPanggilAkhir]] as [number, number, number][]) {
      const teks = (n === 0 || n === 4 ? K : U).teks(a, b);
      expect(teks, `Snippet ${n + 1}`).not.toMatch(/keputusan \d|PR #|\bR\d-\d+\b|Test[A-Z]\w+/);
    }
  });
});

describe("rekaman alamat.txt dan batas.txt: nilai yang dikutip, Hitungan, dan klaim berlingkup", () => {
  test("alamat: 37 baris tabel, 32 terlarang ditolak, 5 kontrol lolos; ringkasan di rekaman sama dengan hitungan dari tabel", () => {
    expect(tabel).toHaveLength(37);
    expect(TERLARANG).toBe(32);
    expect(KONTROL).toBe(5);
    expect(terlarang.every((m) => m[6] === "tolak")).toBe(true);
    expect(A.baris[aSimpul - 1]).toBe(`ditolak fetcher aman: ${TERLARANG} dari ${TERLARANG} alamat terlarang; dari itu ${TERLARANG - PRIVAT.length} lolos bila IsPrivate satu-satunya pemeriksaan`);
    expect(A.baris[aEmpat - 1]).toBe(`dari ${TERLARANG} alamat terlarang yang sama, ${TERLARANG - EMPAT.length} lolos bila hanya empat penanda di tabel (IsPrivate, IsLoopback, IsLinkLocalUnicast, IsUnspecified) yang diperiksa`);
    expect(aEmpat).toBe(aSimpul + 1);
    expect(A.baris[aEmpat]).toBe("--- PASS: TestSSRFKelasAlamatIsPrivateTidakCukup");
    expect(alamatTxt.split("\n")[1]).toBe("# go1.27.1 · tanpa database · server uji hanya di 127.0.0.1 di dalam proses tes");
    harus(`Rekaman menguji ${TERLARANG} alamat contoh, dan versi aman menolak ${TERLARANG} dari ${TERLARANG}.`);
    harus("go1.27.1, tanpa database, dan server uji hanya di 127.0.0.1 di dalam proses tes. Alamat contoh di rekaman adalah angka karangan lab.");
    expect(readmeSsrf).toContain("Alamat contoh private dan link-local di `alamat.txt` adalah angka karangan lab");
  });
  test("Hitungan: tiga alamat ditandai IsPrivate (32 − 3 = 29) dan enam oleh salah satu dari empat penanda (32 − 6 = 26)", () => {
    expect(PRIVAT.map((m) => m[1])).toEqual(["10.0.0.1", "fd00::5", "::ffff:10.0.0.1"]);
    expect(PRIVAT).toHaveLength(3);
    expect(TERLARANG - PRIVAT.length).toBe(29);
    expect(EMPAT.map((m) => m[1])).toEqual(["127.0.0.1", "10.0.0.1", "169.254.77.7", "fd00::5", "0.0.0.0", "::ffff:10.0.0.1"]);
    expect(TERLARANG - EMPAT.length).toBe(26);
    harus(`Tiga di antaranya ditandai \`IsPrivate\`, yaitu satu dari empat penanda bawaan Go di tabel rekaman. Bila hanya penanda itu yang diperiksa, ${TERLARANG - PRIVAT.length} alamat lolos. Itu Hitungan, yaitu angka dari angka lain di rekaman: ${TERLARANG} − ${PRIVAT.length} = ${TERLARANG - PRIVAT.length}, dan rekaman mencetak ${TERLARANG - PRIVAT.length} juga:`);
    expect(A.baris[5]!.replace(/\s+/g, " ")).toBe("alamat IsPrivate IsLoopbk IsLinkLoc IsUnspecif aman keterangan");
    for (const k of ["loopback", "link-local", "CGNAT"]) {
      const baris = terlarang.filter((m) => m[7]!.startsWith(k));
      expect(baris.length, k).toBeGreaterThan(0);
      expect(baris.every((m) => m[2] === "tidak"), `${k} tidak ditandai IsPrivate`).toBe(true);
    }
    harus("Alamat terlarang adalah alamat yang tidak boleh menjadi tujuan unduhan, misalnya alamat mesin itu sendiri (loopback) dan alamat jaringan internal (private).");
    harus(`Bila \`IsPrivate\` satu-satunya pemeriksaan, ${TERLARANG - PRIVAT.length} lolos. Bila hanya empat penanda bawaan Go yang diperiksa, ${TERLARANG - EMPAT.length} lolos (Rekaman lab, \`alamat.txt\`).`);
    harus(`Pemeriksaan alamat versi aman menolak ${TERLARANG} dari ${TERLARANG} alamat terlarang di tabel rekaman.`);
  });
  test("redirect: tujuh kode, tiap kode server pertama 1 dan tujuan 0; kode yang tidak diuji 305 dan 306", () => {
    expect(KODE_REDIRECT).toEqual([300, 301, 302, 303, 304, 307, 308]);
    expect(redirect.every((m) => m[2] === "1" && m[3] === "0")).toBe(true);
    expect(bRedirect + 1).toBe(bRedirectAkhir - redirect.length);
    harus(`Di ${kata(KODE_REDIRECT.length)} kode redirect, server pertama tersentuh satu kali dan server tujuan redirect nol kali:`);
    expect(Math.min(...KODE_REDIRECT)).toBe(300);
    expect(Math.max(...KODE_REDIRECT)).toBe(308);
    const hilang = Array.from({ length: 9 }, (_, i) => 300 + i).filter((k) => !KODE_REDIRECT.includes(k));
    expect(hilang).toEqual([305, 306]);
    expect(skenario.langkah[1]!.jelas).toBe(`${Kata(KODE_REDIRECT.length)} kode redirect diuji, dari 300 sampai 308 tanpa ${hilang.join(" dan ")}. Di tiap kode server pertama tersentuh satu kali, dan server tujuan redirect tidak tersentuh sama sekali.`);
    harus(`Di ${kata(KODE_REDIRECT.length)} kode redirect`);
    harus("Versi aman menolak redirect, dan server tujuan redirect tersentuh nol kali di tujuh kode (`batas.txt`).");
  });
  test("pesan galat: 200 bukan gambar, 403 404 500 gambar tidak bisa diunduh, delapan penolakan satu pesan, server uji tersentuh 0, lima kalimat tetap dari kode", () => {
    expect(galat.map((m) => [m[1], m[2]])).toEqual([["200", "bukan gambar"], ["403", "gambar tidak bisa diunduh"], ["404", "gambar tidak bisa diunduh"], ["500", "gambar tidak bisa diunduh"]]);
    expect(B.baris[bLiteral - 1]).toBe("penolakan karena alamat literal: 8 alamat (loopback terbuka dan tertutup, private, link-local, CGNAT, ULA, 0.0.0.0): 1 pesan berbeda: map[tujuan tidak diizinkan:8]");
    expect(B.baris[bGalatKode - 1]).toBe("pesan galat versi aman di kode: 5 kalimat tetap (dibaca dari unduh.go, bukan diamati di tiap jalur); server uji disentuh oleh unduhan yang ditolak: 0");
    expect(unduhGo.match(/^\tErr\w+\s+= errors\.New\(/gm)).toHaveLength(5);
    expect(bLiteral).toBe(bGalatAwal + galat.length);
    expect(B.baris[bNama - 1]).toBe("## batas yang belum tertutup: nama yang ada dan nama yang tidak ada dijawab dengan pesan berbeda");
    expect(B.teks(bNama, bNama + 4)).toContain("pesan sama: false");
    harus("Delapan penolakan karena alamat literal memakai satu pesan yang sama:");
    harus("Isi JSON dari server uji tidak ikut ke pesan versi aman.");
    harus("- Pesan galat versi aman tidak memuat isi respons, tetapi membedakan nama yang ada dari nama yang tidak ada (`batas.txt`, bagian terakhir; belum diperbaiki di lab).");
    expect(readmeSsrf).toContain("Pesan galat membedakan nama yang ada dari yang tidak ada (belum diperbaiki)");
    // klaim "tidak memuat isi respons": tak satu pesan pun berisi kata dari isi uji
    expect(galat.every((m) => !/layanan|rahasia|kunci|json/i.test(m[2]!))).toBe(true);
  });
  test("yang tidak direkam: cloud dan metadata Tidak dijalankan (README); layar, toko, dan kata dari cerita Ilustrasi", () => {
    expect(readmeSsrf).toContain("| Alamat metadata instance cloud dan IMDSv2 | Tidak dijalankan |");
    expect(readmeSsrf).toContain("Perilaku di cloud sungguhan, layanan terkelola, atau jaringan dengan NAT64: Tidak dijalankan.");
    expect(batasTxt + alamatTxt).not.toMatch(/169\.254\.169\.254/);
    harus("- Perilaku di cloud sungguhan, layanan terkelola, dan alamat layanan metadata cloud Tidak dijalankan, dan alamat itu tidak ditulis sebagai tujuan.");
    harus(`- Layar Ratih, nama toko, kata \`${KATA_LAYANAN}\`, dan temuan Laras hanya ada di cerita (Ilustrasi).`);
    expect(readmeSsrf).toContain("Lab ini dipersempit dari blok tugas aslinya");
    // tinjauan: klaim "membedakan nama yang ada dari nama yang tidak ada" diturunkan dari dua pesan di batas.txt, bukan hanya dari baris "pesan sama"
    const namaAda = cocok(batasTxt.slice(B.baris.slice(0, bNama).join("\n").length), /nama yang diselesaikan ke alamat private:\s+"([^"]+)"/)[1]!;
    const namaTidakAda = cocok(batasTxt.slice(B.baris.slice(0, bNama).join("\n").length), /nama yang tidak ada:\s+"([^"]+)"/)[1]!;
    expect([namaAda, namaTidakAda]).toEqual(["tujuan tidak diizinkan", "tidak menjawab"]);
    expect(namaAda).not.toBe(namaTidakAda);
    expect(batasTxt).toContain("pesan sama: false");
    harus("- Pesan galat versi aman tidak memuat isi respons, tetapi membedakan nama yang ada dari nama yang tidak ada");
  });
});

describe("baris riset R4-205 sampai R4-207 dan label turunan", () => {
  test("tiga baris riset: ID urut, tanggal akses 2026-10-30, sumber OWASP, dokumentasi Go, rekaman dan kode; tidak ada ID ganda", () => {
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    const nomor = ids.map((s) => Number(s.slice(3)));
    const iAwal = ids.indexOf("R4-205");
    expect(ids.slice(iAwal, iAwal + 3)).toEqual(["R4-205", "R4-206", "R4-207"]);
    expect(nomor[iAwal - 1]!).toBeLessThan(205);
    expect(nomor[iAwal + 3]!).toBeGreaterThan(207);
    for (const id of ["R4-205", "R4-206"]) expect(barisRiset(id)).toContain("dibuka 2026-10-30");
    expect(barisRiset("R4-205")).toContain("cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html");
    expect(barisRiset("R4-207")).toContain("`labs/t4-ssrf/output/alamat.txt` baris 44 sampai 45");
    expect(barisRiset("R4-207")).toContain("`labs/api-t4/output/testing.txt` baris 491 sampai 492");
    expect(barisRiset("R4-207")).toContain(`fungsi \`Rentan\` baris ${uRentan} sampai ${U.baris.length - (U.baris[U.baris.length - 1] === "" ? 1 : 0)}`);
    for (const id of ["R4-205", "R4-206", "R4-207"]) expect(barisRiset(id).split("|").length).toBe(7);
    // tinjauan: tanggal akses, halaman pemakai, dan angka yang diulang dari tabel alamat.txt (tanpa kunci baris)
    expect(barisRiset("R4-205").match(/2026-10-30/g)).toHaveLength(2);
    expect(barisRiset("R4-205")).toContain("(dibaca 2026-10-30)");
    expect(barisRiset("R4-206").match(/2026-10-30/g)).toHaveLength(1);
    for (const id of ["R4-205", "R4-206"]) expect(barisRiset(id)).toContain("(dibuka untuk halaman 4.20)");
    expect(barisRiset("R4-207")).toContain("(dibaca untuk halaman 4.20, tanpa menjalankan ulang)");
    expect(barisRiset("R4-207")).toContain(`(${TERLARANG} dari ${TERLARANG} alamat terlarang ditolak; ${TERLARANG - PRIVAT.length} lolos bila \`IsPrivate\` satu-satunya pemeriksaan; ${TERLARANG - EMPAT.length} lolos bila hanya empat penanda; ${kata(KONTROL)} alamat kontrol lolos)`);
  });
  test("label turunan Hitungan didefinisikan di pemakaian pertama; tidak ada Simulasi; tidak ada ID riset, nomor keputusan, atau nomor PR di halaman", () => {
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Itu Hitungan, yaitu angka dari angka lain di rekaman") + "Itu ".length);
    expect(badan.match(/Itu Hitungan, yaitu angka dari angka lain/g)).toHaveLength(1);
    expect(badan).not.toMatch(/Simulasi/);
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|\bPR #?\d+|#\d{3}\b/);
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: versi aman menolak (alamat, redirect, jawaban bukan gambar) dan bila hanya IsPrivate diperiksa; sub dihitung dari rekaman", () => {
    expect(diagram.id).toBe("t4-m36-pratinjau-json");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-ssrf · alamat.txt dan batas.txt" });
    expect(diagram.baris).toHaveLength(2);
    const [a, p] = diagram.baris;
    expect(a!.label).toBe("Versi aman menolak");
    expect(a!.sub).toBe("alamat.txt dan batas.txt");
    expect(a!.simpul.map((s) => s.teks)).toEqual(["Alamat dalam", "Redirect", "Jawaban bukan gambar"]);
    expect(a!.simpul.map((s) => s.sub)).toEqual([`${TERLARANG} dari ${TERLARANG} ditolak`, `tujuan tersentuh ${redirect[0]![3]} kali`, `pesan: ${galat[0]![2]}`]);
    expect(a!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "good"]);
    expect(p!.label).toBe("Bila hanya IsPrivate diperiksa");
    expect(p!.sub).toBe("alamat.txt");
    expect(p!.simpul.map((s) => s.teks)).toEqual([`${TERLARANG} alamat terlarang`, `${TERLARANG - PRIVAT.length} lolos`, `${KONTROL} alamat kontrol`]);
    expect(p!.simpul.map((s) => s.sub)).toEqual([`${PRIVAT.length} ditandai private`, `${TERLARANG} − ${PRIVAT.length}`, "tetap lolos"]);
    expect(p!.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "biasa"]);
    expect(diagram.catatan).toBe("Alamat contoh adalah angka karangan lab, dan server uji hanya di 127.0.0.1 di dalam proses tes. Kotak oranye adalah akibat yang direkam.");
    expect(diagram.judul).toBe("Yang direkam dari sisi pembela: alamat dalam, redirect, dan pesan galat");
  });
  test("diagram dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
  });
  test("diagram tampil dengan Rantai biasa di blok Yang sebenarnya", () => {
    harus("<Rantai data={pratinjauJson} />");
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(mdx).toContain('import pratinjauJson from "../../../../data/diagram/t4-m36-pratinjau-json.json";');
    const blok = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf('<Blok nama="Coba sendiri">'));
    expect(blok).toContain("<Rantai data={pratinjauJson} />");
  });
});

describe("skenario alur t4-m36.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  const sub = (b: string, m: string) => rapat(b).startsWith(rapat(m));
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen tanpa perangkat; empat langkah dan tiga langkah varian dari awal", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t4-ssrf/output/batas.txt", fileVarian: "labs/t4-ssrf/output/alamat.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["mer", "Merchant (pengisi URL)"], ["fch", "Fetcher gambar versi aman"], ["tuj", "Server tujuan (uji)"]]);
    expect(skenario.perangkat ?? []).toEqual([]);
    expect(skenario.langkah).toHaveLength(4);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("pemeriksaan alamat hanya memakai IsPrivate");
    harus("**Ubah satu hal: pemeriksaan alamat hanya memakai IsPrivate**");
    harus("Widget ini mengikuti rekaman `alamat.txt` dan `batas.txt`, dengan satu varian dari `alamat.txt`.");
    harus('<WidgetLama nama="alur" src="data/skenario/t4-m36.json" />');
    expect(badan).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(readmeSsrf).toContain("make -C labs/t4-ssrf run");
    expect(skenario.sumber.catatan).toContain("make -C labs/t4-ssrf run");
    expect(skenario.sumber.catatan).toContain("go1.27.1, tanpa database, server uji hanya di 127.0.0.1 di dalam proses tes");
    expect(skenario.sumber.catatan).toContain("versi pertama Tidak dijalankan di lab ini");
    expect(skenario.sumber.catatan).toContain("Alamat contoh adalah angka karangan lab");
  });
  test("tebakan: empat pilihan, jawaban benar (kalimat tetap bukan gambar) sama dengan rekaman, bukan yang terpanjang, posisi berbeda dari tebakan lain", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.varian).toBe(false);
    expect(p.answer).toBe(0);
    expect(p.options[p.answer]).toBe(`"${galat[0]![2]}": kalimat tetap, tanpa satu byte pun isi JSON`);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    const lain = ["t4-m29", "t4-m30", "t4-m31", "t4-m32", "t4-m33", "t4-m34", "t4-topup", "t4-verifikasi"].map((n) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${n}.json`)) as Skenario).predict.answer);
    expect(lain.filter((x) => x === p.answer).length).toBeLessThanOrEqual(lain.length / 2);
    // pilihan lain bertentangan dengan rekaman: pesan 200 hanya "bukan gambar", tanpa isi; "tujuan tidak diizinkan" hanya untuk alamat; "tidak menjawab" hanya untuk nama yang tidak ada dan batas waktu
    expect(galat[0]![2]).toBe("bukan gambar");
    expect(p.options[1]).toBe("Awal isi JSON itu, supaya merchant tahu kenapa gambarnya ditolak");
    expect(p.options[2]).toBe(`"tujuan tidak diizinkan": JSON dianggap alamat yang dilarang`);
    expect(p.options[3]).toBe(`"tidak menjawab": isi JSON dianggap jawaban yang tidak lengkap`);
    expect(B.baris[bGalatAwal - 1]).not.toMatch(/tujuan tidak diizinkan|tidak menjawab/);
    expect(p.q).toBe("Server tujuan menjawab 200, tetapi isinya JSON dari layanan lain, bukan gambar. Pesan apa yang diterima merchant dari fetcher versi aman?");
    expect(p.explain).toBe(`Versi aman menilai isi dari byte-nya dan memakai kalimat tetap, jadi isi respons tidak ikut ke pesan. Rekaman batas.txt, bagian pesan galat: ${galat[0]![1]} berisi JSON layanan dalam dijawab "${galat[0]![2]}".`);
  });
  test("baris perintah dan keluaran di kirim diturunkan dari rekaman, per langkah; baris diawali pagar diringkas dari rekaman yang sama", () => {
    const [l1, l2, l3, l4] = skenario.langkah;
    expect(l1!.kirim).toBe([`ditolak fetcher aman: ${TERLARANG} dari ${TERLARANG} alamat terlarang`, B.baris[bLiteral - 1]!, B.baris[bGalatKode - 1]!.split("; ")[1]!].join("\n"));
    expect(B.baris[bGalatKode - 1]!.split("; ")[1]).toBe("server uji disentuh oleh unduhan yang ditolak: 0");
    expect(A.baris[aSimpul - 1]).toContain(`${l1!.kirim.split("\n")[0]};`);
    expect(l2!.kirim).toBe(B.baris[B.nomor((b) => b.startsWith("redirect 302 ke server lain")) - 1]);
    expect(l3!.kirim).toBe(galat.map((m) => `${m[1]} berisi JSON layanan dalam pesan: "${m[2]}"`).join("\n"));
    expect(l3!.kirim.split("\n").every((b, i) => rapat(B.baris[bGalatAwal - 1 + i]!) === b.replace(/dalam pesan/, "dalam pesan"))).toBe(true);
    expect(l4!.kirim).toBe(B.baris[bGalatKode - 1]!.split("; ")[0]);
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.kirim).toBe(A.baris[aSimpul - 1]);
    expect(v2!.kirim).toBe(A.baris[aEmpat - 1]);
    expect(v3!.kirim).toBe(`# ${KONTROL} alamat kontrol di tabel yang sama lolos, termasuk ${kontrol.filter((m) => /tepat di (bawah|atas) CGNAT/.test(m[7]!)).map((m) => m[1]).join(" dan ")} yang tepat di luar blok CGNAT`);
    expect(kontrol.map((m) => m[1])).toContain("100.63.255.255");
    expect(kontrol.map((m) => m[1])).toContain("100.128.0.1");
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["mer", "fch"], ["fch", "tuj"], ["tuj", "fch"], ["fch", "mer"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["mer", "fch"], ["fch", ""], ["fch", ""]]);
    expect(skenario.langkah.map((l) => l.nada ?? "")).toEqual(["good", "good", "", "good"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? "")).toEqual(["warn", "warn", "good"]);
    expect(sub(l1!.kirim, `ditolak fetcher aman: ${TERLARANG} dari`)).toBe(true);
  });
  test("teks langkah (judul dan jelas) dari angka rekaman; tanpa klaim di luar rekaman", () => {
    const [l1, , l3, l4] = skenario.langkah;
    expect(l1!.judul).toBe("Alamat di jaringan dalam: ditolak, server tujuan tidak tersentuh");
    expect(l1!.jelas).toBe("Alamat contoh loopback, private, link-local, dan CGNAT ditolak oleh pemeriksaan alamat. Delapan penolakan karena alamat literal memakai satu pesan yang sama, dan server uji tidak tersentuh.");
    expect(B.baris[bLiteral - 1]).toContain("8 alamat");
    expect(l3!.jelas).toBe(`Isi JSON dari server uji tidak ikut ke pesan. Jawaban ${galat[0]![1]} yang bukan gambar dijawab "${galat[0]![2]}", dan ${galat.slice(1).map((m) => m[1]).join(", ").replace(/, (\d+)$/, ", dan $1")} dijawab "${galat[1]![2]}".`);
    expect(l4!.jelas).toBe(`Kalimat tetap itu dibaca dari kode, bukan diamati di tiap jalur. Di bagian pesan galat rekaman memuat tiga kalimat itu: ${[...new Set(galat.map((m) => m[2]))].concat(["tujuan tidak diizinkan"]).join(", ").replace(/, ([^,]+)$/, ", dan $1")}.`);
    const [v1, v2, v3] = skenario.varian.langkah;
    expect(v1!.judul).toBe(`Bila IsPrivate satu-satunya pemeriksaan: ${TERLARANG - PRIVAT.length} dari ${TERLARANG} lolos`);
    expect(v1!.jelas).toBe(`Tiga alamat contoh ditandai private: ${PRIVAT.map((m) => m[1]).slice(0, 2).join(", ")}, dan ${PRIVAT[2]![1]}. Jadi ${TERLARANG} − ${PRIVAT.length} = ${TERLARANG - PRIVAT.length} alamat terlarang tidak tertahan, termasuk loopback, link-local, dan CGNAT.`);
    expect(v2!.judul).toBe(`Empat penanda bawaan Go: ${TERLARANG - EMPAT.length} dari ${TERLARANG} masih lolos`);
    // Sisa 26 alamat: yang masuk salah satu awalan di alamatKhusus (dibaca dari unduh.go, dihitung dengan CIDR sendiri) dan yang
    // tidak: alamat itu hanya tertangkap penanda bawaan Go lain, IsMulticast (baris 117 sampai 118 di unduh.go).
    const sisa = terlarang.filter((m) => ![m[2], m[3], m[4], m[5]].includes("ya"));
    const awalanKode = [...cocok(unduhGo, /var alamatKhusus = func\(\) \[\]netip\.Prefix \{([\s\S]*?)\}\(\)/)[1]!.matchAll(/"([0-9a-f:.]+\/\d+)"/g)].map((m) => m[1]!);
    expect(awalanKode.length).toBeGreaterThan(15);
    const luarAwalan = sisa.filter((m) => !awalanKode.some((c) => masukCidr(m[1]!, c)));
    expect(luarAwalan.map((m) => m[1])).toEqual(["239.255.0.1", "ff0e::1"]);
    expect(luarAwalan.every((m) => /multicast/.test(m[7]!))).toBe(true);
    expect(sisa.filter((m) => /multicast/.test(m[7]!)).length).toBe(luarAwalan.length);
    expect(unduhGo).toContain("ip.IsMulticast()");
    expect(v2!.jelas).toBe(`${Kata(EMPAT.length)} alamat tertangkap oleh salah satu dari empat penanda, jadi ${TERLARANG} − ${EMPAT.length} = ${TERLARANG - EMPAT.length}. ${Kata(luarAwalan.length)} dari ${TERLARANG - EMPAT.length} alamat itu adalah alamat multicast, yang tertangkap penanda bawaan Go lain, IsMulticast. Sisanya, termasuk CGNAT, benchmark, dan bentuk IPv6 transisi, hanya tertangkap oleh daftar awalan yang ditulis fetcher (dibaca dari kode, bukan dicatat rekaman).`);
    for (const k of ["CGNAT", "benchmark", "NAT64"]) expect(terlarang.some((m) => m[7]!.includes(k) && ![m[2], m[3], m[4], m[5]].includes("ya")), k).toBe(true);
    expect(unduhGo).toContain("var alamatKhusus = func() []netip.Prefix {");
    expect(v3!.judul).toBe(`Kontrol: ${kata(KONTROL)} alamat yang bukan terlarang tetap lolos`);
    expect(v3!.jelas).toBe(`Daftar tidak menolak semuanya. ${Kata(KONTROL)} alamat kontrol, termasuk dua yang tepat di luar blok CGNAT, tetap lolos.`);
    expect(skenario.pengantar).toBe("Fetcher gambar versi aman diuji dengan server uji di dalam proses tes. Tebak dulu pesan apa yang diterima merchant, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    harus("Tebak dulu pesan yang diterima merchant, lalu tekan Berikutnya atau panah kanan.");
  });
  test("skenario dikunci dengan sidik jari", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK.skenario);
  });
});

describe("kartu Cek diri dan konsep yang lahir", () => {
  test("tiga kartu dibangkitkan dari blok Cek diri; jawaban mengutip rekaman dengan angka dari rekaman", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-m36");
    expect(kartu.map((k) => k.id)).toEqual(["t4-m36-1", "t4-m36-2", "t4-m36-3"]);
    expect(kartu.every((k) => k.url === "tahap-4/m36-pratinjau-json/" && k.judul === "4.20 M36: Pratinjau gambar yang berisi JSON")).toBe(true);
    expect(kartu[0]!.jawab).toContain(`menaruh ${AWAL_GALAT} byte pertama isinya di pesan kesalahan`);
    expect(kartu[0]!.jawab).toContain("di kolom `galat` (dibaca dari kode, Tidak dijalankan)");
    expect(kartu[1]!.tanya).toBe(`Versi aman menolak ${TERLARANG} dari ${TERLARANG} alamat terlarang. Kenapa pemeriksaan \`IsPrivate\` saja tidak cukup?`);
    expect(kartu[1]!.jawab).toBe(`Hanya ${kata(PRIVAT.length)} dari ${TERLARANG} alamat itu ditandai private, jadi ${TERLARANG - PRIVAT.length} lolos bila hanya \`IsPrivate\` yang diperiksa (\`alamat.txt\`).`);
    expect(kartu[2]!.jawab).toContain(`server tujuan redirect tersentuh nol kali di ${kata(KODE_REDIRECT.length)} kode (\`batas.txt\`)`);
    expect(kartu[2]!.jawab).toContain("mengikuti redirect sampai 10 request beruntun (dokumentasi, Tidak dijalankan)");
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const butir = [...cek.matchAll(/\*\*(\d+)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(butir.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(kartu.map((k) => k.tanya)).toEqual(butir.map((m) => m[2]));
    expect(kartu.map((k) => k.jawab)).toEqual(butir.map((m) => m[3]));
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
  });
  test("konsep yang lahir: satu tautan; penutup tanpa klaim baru; akhir halaman memuat SkripLama; noscript memakai angka rekaman", () => {
    const blok = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'), badan.indexOf("### Cek diri"));
    expect([...blok.matchAll(/^- \[\[([^\]]+)\]\]/gm)].map((m) => m[1])).toEqual(["t4-ssrf"]);
    harus("Di M36 server sudah mengunduh gambar dengan akses jaringan dalam. Yang kurang adalah batas pada alamat tujuan, pada redirect, dan pada isi pesan kesalahan.");
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    const noscript = cocok(badan, /<noscript>([\s\S]*?)<\/noscript>/)[1]!;
    expect(noscript).toContain(`jawaban ${galat[0]![1]} yang bukan gambar dijawab "${galat[0]![2]}", dan tujuan redirect tersentuh nol kali.`);
    expect(noscript).toContain(`Bila hanya \`IsPrivate\` yang diperiksa, ${TERLARANG - PRIVAT.length} dari ${TERLARANG} alamat terlarang lolos.`);
    expect(noscript).toContain("Rekaman alamat ada di lipatan di bawah.");
    expect(badan.match(/<details>\n<summary>Rekaman alamat \(juga untuk pembaca tanpa JavaScript\)<\/summary>/g)).toHaveLength(1);
    expect(badan.match(/<details[ >]/g)).toHaveLength(1 + 1 + 3);
  });
});

// ---- tinjauan: paragraf penuh yang selamat dari putaran tanpa kunci baris ----------------------------------------------------
// Mutan "tidak", hapus kalimat terakhir, tukar dua kalimat, dan bilangan di paragraf narasi lolos saat kunci baris dimatikan.
// Tiap paragraf di bawah dibandingkan utuh (tanpa kunci baris), supaya perubahan satu kata di dalamnya tertangkap oleh tes yang
// tidak memakai KALIMAT_TERKUNCI. Paragraf yang memuat 32, 29, atau 26 diturunkan dari tabel alamat.txt.
describe("tinjauan: paragraf penuh dibandingkan utuh, tanpa kunci baris", () => {
  test("paragraf narasi dan klaim berlingkup: gejala, dugaan, kode, tes unit, lingkup lab, widget, noscript", () => {
    harus("Kolom itu tidak berisi gambar. Isinya teks JSON dengan kata `penyimpanan-internal`.");
    harus("*Angka cerita (Ilustrasi):* hari, nama toko, kata `penyimpanan-internal`, dan temuan Laras berasal dari cerita, bukan dari rekaman. Arti Ilustrasi, Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].");
    harus("Dugaan itu masuk akal. Merchant mengisi kolom `gambar_url` di file CSV sendiri, dan pratinjau dibuat dari kolom itu. Tetapi file CSV hanya memuat alamat, bukan isi gambar.");
    harus("Merchant tidak mengirim JSON itu. Server Rekeningo yang mengambilnya dari alamat yang diisi merchant, lalu mengembalikannya.");
    harus("**Server yang mengunduh, bukan merchant.** Impor katalog menerima daftar produk, dan tiap produk punya field `gambar_url`. Di cerita daftar itu berasal dari file CSV, dan di kode lab daftar itu dikirim sebagai JSON. Server mengunduh tiap alamat untuk membuat pratinjau, lalu mengembalikan hasil tiap baris: nama produk dan dua kolom hasil, `pratinjau` dan `galat` (Tidak dijalankan: dibaca dari kode):");
    harus("**Kenapa ini masalah.** Alamat itu diisi merchant, tetapi yang memintanya adalah server Rekeningo, dengan akses jaringan milik server. Merchant luar tidak punya akses ke jaringan dalam, yaitu jaringan tempat service Rekeningo saling memanggil. Server punya. Masalah seperti ini disebut SSRF (server-side request forgery): aplikasi dipakai untuk menghubungi alamat yang dipilih pihak luar.");
    harus("OWASP memakai contoh serupa, yaitu user yang mengisi URL gambar avatarnya untuk diunduh aplikasi ([OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), dibuka 2026-10-30, Tidak dijalankan). Di cerita, pihak yang mencoba adalah merchant luar yang mengisi `gambar_url` dengan nama layanan penyimpanan objek di jaringan dalam (Ilustrasi). Penyimpanan objek dibahas di [[t4-storage]]. Konsep dan keputusannya ada di [[t4-ssrf]].");
    harus("**Empat kelemahan versi pertama.** Versi pertama bernama `Rentan` di kode lab. Keempat kelemahan ini dibaca dari kode (Tidak dijalankan: dibaca dari kode):");
    harus("2. Alamat hasil resolusi tidak diperiksa. Resolusi DNS adalah proses mengubah nama di URL menjadi alamat IP, dan jawabannya langsung dipakai.");
    harus("3. Redirect diikuti. Redirect adalah jawaban server yang menyuruh client pindah ke alamat lain.");
    harus("Butir 1 adalah deny-list, yaitu daftar yang dilarang. Alamat yang sama bisa ditulis dengan cara lain, dan nama yang diselesaikan ke alamat dalam tidak memuat dua teks itu. OWASP menulis bahwa deny-list mudah dilewati dan hanya pilihan terakhir (Tidak dijalankan: dibaca dari sumber). Bentuk penulisan yang lolos bergantung pada resolver platform, yaitu bagian sistem yang mengubah nama menjadi alamat, jadi halaman ini tidak mencatatnya.");
    harus("Butir 3 datang dari client bawaan. Dokumentasi Go menulis bahwa tanpa `CheckRedirect` client berhenti sesudah 10 request beruntun ([net/http, Client](https://pkg.go.dev/net/http#Client), go1.27.3, dibuka 2026-10-30, Tidak dijalankan). OWASP menyarankan redirect dimatikan di client. Pemeriksaan teks hanya melihat URL pertama, jadi alamat luar yang menjawab redirect ke alamat dalam tidak diperiksa lagi.");
    harus("Butir 4 menjawab kenapa isi layanan dalam sampai ke merchant:");
    harus("Jadi \"kolom pratinjau\" di cerita adalah Ilustrasi, dan di kode lab teks itu ada di kolom `galat`. Dua tes unit `api-t4` menjaga butir 3 dan butir 4, dan keduanya tercatat lulus. Hanya nama tes dan hasilnya yang tercatat, tanpa rekaman tingkat endpoint (Rekaman lab api-t4, tidak dijalankan ulang di lab ini):");
    harus("**Yang direkam: sisi pembela.** Lab `t4-ssrf` hanya menjalankan versi aman dari fetcher, yaitu fungsi yang mengunduh gambar dari URL. Menjalankan versi pertama terhadap layanan tiruan di jaringan container Tidak dijalankan di lab ini, karena lingkup lab dipersempit ke verifikasi sisi pembela.");
    harus("*Kondisi rekaman:* go1.27.1, tanpa database, dan server uji hanya di 127.0.0.1 di dalam proses tes. Alamat contoh di rekaman adalah angka karangan lab.");
    harus("**Pesan galat.** Isi JSON dari server uji tidak ikut ke pesan versi aman. Delapan penolakan karena alamat literal memakai satu pesan yang sama:");
    harus("Widget ini mengikuti rekaman `alamat.txt` dan `batas.txt`, dengan satu varian dari `alamat.txt`. Tebak dulu pesan yang diterima merchant, lalu tekan Berikutnya atau panah kanan.");
    harus("Batasnya: tabel itu memuat alamat contoh, bukan semua alamat yang mungkin. Kenapa satu pemeriksaan tidak cukup dibahas di [[t4-ssrf]].");
    harus("Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: jawaban 200 yang bukan gambar dijawab \"bukan gambar\", dan tujuan redirect tersentuh nol kali.");
  });
  test("paragraf dengan bilangan: alamat, ubah satu hal, dan noscript diturunkan dari tabel alamat.txt", () => {
    const L = TERLARANG - PRIVAT.length, E = TERLARANG - EMPAT.length;
    harus(`**Alamat.** Alamat terlarang adalah alamat yang tidak boleh menjadi tujuan unduhan, misalnya alamat mesin itu sendiri (loopback) dan alamat jaringan internal (private). Rekaman menguji ${TERLARANG} alamat contoh, dan versi aman menolak ${TERLARANG} dari ${TERLARANG}.`);
    harus(`Sesudah langkah terakhir, centang **Ubah satu hal: pemeriksaan alamat hanya memakai IsPrivate**. Pemeriksaan alamat versi aman menolak ${TERLARANG} dari ${TERLARANG} alamat terlarang di tabel rekaman. Bila \`IsPrivate\` satu-satunya pemeriksaan, ${L} lolos. Bila hanya empat penanda bawaan Go yang diperiksa, ${E} lolos (Rekaman lab, \`alamat.txt\`).`);
    harus(`Bila hanya \`IsPrivate\` yang diperiksa, ${L} dari ${TERLARANG} alamat terlarang lolos. Rekaman alamat ada di lipatan di bawah.`);
  });
  test("tebakan di details: jawabannya utuh; heading Cek diri tingkat 3; Rantai tampil biasa dengan data yang diimpor", () => {
    const d = cocok(badan, /<details class="question">\n<summary>([^\n]+)<\/summary>\n\n([\s\S]*?)\n\n<\/details>/);
    expect(d[2]).toBe("Dari jawaban layanan yang beralamat di kolom itu. Server Rekeningo mengunduh alamat tersebut, dan jawabannya bukan gambar melainkan teks JSON dari layanan lain. Teks itu lalu ikut dikirim kembali ke merchant (dibaca dari kode di blok berikutnya, Tidak dijalankan).");
    expect(badan).toMatch(/^### Cek diri$/m);
    expect(badan.match(/^#+ /gm)).toEqual(["### "]);
    harus("<Rantai data={pratinjauJson} />");
    expect(badan).not.toContain("<Rantai data={pratinjauJson} ringkas />");
    expect(badan.match(/^\*\*[^*\n]+\*\*/gm)!.map((s) => s.replace(/\*/g, ""))).toEqual(["Server yang mengunduh, bukan merchant.", "Kenapa ini masalah.", "Empat kelemahan versi pertama.", "Yang direkam: sisi pembela.", "Alamat.", "Redirect.", "Pesan galat.", "Yang tidak direkam.", "1.", "2.", "3."]);
    expect(cara).toContain("Rekaman lab");
    for (const k of ["Ilustrasi", "Asumsi", "Tidak dijalankan", "[perlu verifikasi]"]) expect(cara, k).toContain(k);
  });
  test("skenario: judul langkah, judul skenario, dan catatan sumber utuh; kutipan baris riset utuh", () => {
    expect(skenario.judul).toBe("Fetcher gambar versi aman: alamat dalam, redirect, dan pesan galat");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Alamat di jaringan dalam: ditolak, server tujuan tidak tersentuh",
      "Alamat luar menjawab redirect: tidak diikuti",
      "Server menjawab 200 dengan isi JSON: bukan gambar",
      "Merchant hanya menerima kalimat tetap",
    ]);
    expect(skenario.varian.langkah[2]!.judul).toBe(`Kontrol: ${kata(KONTROL)} alamat yang bukan terlarang tetap lolos`);
    expect(skenario.sumber.catatan).toBe("Lab t4-ssrf, go1.27.1, tanpa database, server uji hanya di 127.0.0.1 di dalam proses tes (make -C labs/t4-ssrf run). Jalur utama: alamat.txt (alamat terlarang) dan batas.txt (redirect dan pesan galat). Ubah satu hal: alamat.txt, hanya IsPrivate yang diperiksa. Lab ini hanya menjalankan versi aman; versi pertama Tidak dijalankan di lab ini. Alamat contoh adalah angka karangan lab. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log.");
    expect(barisRiset("R4-205")).toContain('"Server-Side Request Forgery Prevention"');
    expect(barisRiset("R4-205")).toContain('"Deny-list (Last Resort)"');
    expect(barisRiset("R4-206")).toContain('"If CheckRedirect is nil, the Client uses its default policy, which is to stop after 10 consecutive requests."');
    expect(barisRiset("R4-206")).toContain('"If the server replies with a redirect, the Client first uses the CheckRedirect function to determine whether the redirect should be followed."');
    expect(barisRiset("R4-207")).toContain('dijawab "bukan gambar", 403, 404, dan 500 dijawab "gambar tidak bisa diunduh"');
    expect(barisRiset("R4-207")).toContain("`labs/t4-ssrf/output/alamat.txt` baris 44 sampai 45");
  });
});

const PENENTU = ["tidak", "belum", "hanya", "tetap", "sama", "sebelum", "sesudah", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "Raka", "Ratih", "Laras", "Senin", "pertama", "kedua", "bukan", "tanpa", "kecuali", "setiap", "semua", "selalu", "Rekaman lab", "Tidak dijalankan", "Ilustrasi", "Asumsi", "Hitungan", "naik", "turun", "ditolak", "lolos", "terlarang", "IsPrivate", "redirect", "deny-list", "OWASP", "200", "32", "29", "26", "10", "ADR 41", "versi aman", "versi pertama", "alamat", "galat", "pratinjau", "merchant", "server", "lab"];
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
  test("tiga baris riset utuh sama dengan nilai terkunci (tanggal akses, kutipan, kolom)", () => {
    expect(["R4-205", "R4-206", "R4-207"].map(barisRiset)).toEqual(RISET_TERKUNCI);
    expect(["R4-205", "R4-206", "R4-207"].map((id) => sidik(barisRiset(id)))).toEqual(SIDIK.riset);
  });
  test("tiap nilai diagram dan skenario (string, angka, boolean) sama dengan nilai terkunci, jalur demi jalur", () => {
    expect(daun(diagramMentah)).toEqual(DIAGRAM_DAUN);
    expect(daun(skenario)).toEqual(SKENARIO_DAUN);
  });
  test("sidik frontmatter terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("profil kata penentu tiap baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber) sama dengan nilai terkunci", () => {
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
