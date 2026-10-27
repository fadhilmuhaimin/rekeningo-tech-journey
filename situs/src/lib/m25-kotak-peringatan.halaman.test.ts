// Penjaga halaman 3.22: angka, bagian rekaman, rentang Snippet, kode lab, tautan, label sumber, klaim negatif berlingkup,
// diagram Rantai, widget cari-bug, kartu Cek diri, halaman istilah XSS, dan baris riset di m25-kotak-peringatan.mdx
// diturunkan dari rekaman labs/t3-dasbor (xss.txt) dan labs/api-t3 (skema.txt), kode lab (dasbor, driver.js, run.py, notif.go,
// dasar_t3.py), README lab, naskah Tahap 3, registry, baris riset R3-205 sampai R3-208, dan halaman tetangga, bukan dari
// daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.20): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI mengunci SETIAP baris badan
// halaman, dan tes lain menurunkan nilai yang diklaim dari sumbernya karena kalimat terkunci tidak menangkap SALAHNYA kalimat.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m25-kotak-peringatan.json";
import widgetMentah from "../../data/widget/t3-m25-caribug.json";
import { DataCariBug } from "../widgets/cari-bug/skema";
import { periksa, ringkas } from "../widgets/cari-bug/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { Glosarium, HalamanIstilah } from "./istilah";

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

const BERKAS = "situs/src/content/docs/tahap-3/m25-kotak-peringatan.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const diagram = DataRantai.parse(diagramMentah);
const widget = DataCariBug.parse(widgetMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const xss = baca("labs/t3-dasbor/output/xss.txt");
const skemaTxt = baca("labs/api-t3/output/skema.txt");
const mainGo = baca("labs/t3-dasbor/go/cmd/dasbor/main.go");
const driverJs = baca("labs/t3-dasbor/js/driver.js");
const runPy = baca("labs/t3-dasbor/run.py");
const readmeLab = baca("labs/t3-dasbor/README.md");
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const bayarGo = baca("labs/api-t3/internal/service/bayar.go");
const dasarT3 = baca("labs/api-t3/dasar_t3.py");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const hal31 = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal32 = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const hal35 = baca("situs/src/content/docs/tahap-3/skema-data.mdx");
const hal28 = baca("situs/src/content/docs/tahap-2/adr-ledger.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const istilahMentah = baca("situs/data/halaman-istilah/xss.json");
const kartuMentah = baca("situs/lama/widgets/data/kartu.json");

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
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const rupiah = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ---- pembaca teks berbaris: nomor baris mulai dari 1, seperti Snippet ------------------------------------------------------
function baris(teks: string) {
  const b = teks.split("\n");
  const nomor = (ok: (x: string) => boolean, dariNomor = 1): number => {
    const i = b.findIndex((x, n) => n + 1 >= dariNomor && ok(x));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1;
  };
  const antara = (a: number, z: number) => b.slice(a - 1, z).join("\n");
  const baris1 = (n: number) => b[n - 1]!;
  return { b, nomor, antara, baris1 };
}
const X = baris(xss);
const Mn = baris(mainGo);
const Dr = baris(driverJs);
const Rp = baris(runPy);
const Nt = baris(notifGo);
const Sk = baris(skemaTxt);

const awal = (h: string) => X.nomor((x) => x.startsWith(`# --- ${h}. `));
const A0 = awal("A"), B0 = awal("B"), C0 = awal("C"), D0 = awal("D"), E0 = awal("E");
const jsonSesudah = (n: number): number => X.nomor((x) => x.startsWith("{"), n + 1);
const hasilJson = (n: number) => JSON.parse(X.baris1(jsonSesudah(n))) as Record<string, unknown> & { dialogs: { type: string; message: string }[]; elemImgDiDaftar?: number; cookieJSBisaDibaca?: boolean; cookieHttpOnly?: boolean; cookieName?: string; teksDaftar?: string; statusFetch?: number; cspPelanggaran?: unknown[] };
const jA = hasilJson(A0);
const jD = hasilJson(D0);
const jE = hasilJson(E0);
const komentarD = X.antara(D0, E0 - 1);
const hargaD = cocok(komentarD, /# harga produk 1 sebelum: Rp(\d+), sesudah skrip yang sama memanggil \/api\/menu\/harga: Rp(\d+)/);

const PAYLOAD = cocok(runPy, /^PAYLOAD = "(.*)"/m)[1]!;
const JUMLAH = Number(cocok(runPy, /"jumlah": (\d+), "catatan": PAYLOAD/)[1]);
const MAKS_CATATAN = Number(cocok(notifGo, /^const MaksCatatan = (\d+)/m)[1]);

// argumen mulai_dasbor(...) yang dipakai tiap bagian xss di run.py
const panggilan = (huruf: string): Record<string, string> => {
  const n = Rp.nomor((x) => x.includes(`bagian("${huruf}. `));
  const baris2 = Rp.baris1(n + 1);
  const isi = cocok(baris2, /mulai_dasbor\((.*?)\)/)[1]!;
  return Object.fromEntries([...isi.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));
};
const argA = panggilan("A"), argD = panggilan("D"), argE = panggilan("E");
const nomorPanggilan = (huruf: string): number => Rp.nomor((x) => x.includes(`bagian("${huruf}. `)) + 1;

// ---- rentang Snippet diturunkan dari sumber, bukan ditulis tangan --------------------------------------------------------------
const akhirFungsiGo = (T: ReturnType<typeof baris>, mulai: number): number => T.nomor((x) => x === "}", mulai);
const notifA = Nt.nomor((x) => x.startsWith("func periksaCatatan("));
const notifZ = akhirFungsiGo(Nt, notifA);
const ketA = Nt.nomor((x) => x.startsWith("func keterangan("));
const ketZ = akhirFungsiGo(Nt, ketA);
const renderA = Mn.nomor((x) => x.startsWith("// Dua baris render yang dipertukarkan"));
const renderZ = Mn.nomor((x) => x.includes("b.appendChild(kiri); b.appendChild(ket);`"));
const launchA = Dr.nomor((x) => x.startsWith("async function xss(")) + 1;
const evalA = Dr.nomor((x) => x.includes("await page.evaluate(async () => {"), Dr.nomor((x) => x.startsWith("async function xssLawanCsrf(")));
const evalZ = Dr.nomor((x) => x === "  });", evalA);
const delA = Sk.nomor((x) => x === "api_t3=> DELETE FROM jurnal WHERE id = 1;");
const skriptA = Mn.nomor((x) => x.startsWith("fetch('/api/riwayat'"));
const skriptZ = Mn.nomor((x) => x === "});", skriptA);
const kodeD = Rp.nomor((x) => x.includes('bagian("D. ')) + 1;
const kodeE = Rp.nomor((x) => x.includes('bagian("E. ')) + 1;
const rekD0 = X.nomor((x) => x.startsWith("$ node driver.js xss-lawan-csrf"), D0);
const rekDZ = X.nomor((x) => x.startsWith("# harga produk 1 sebelum:"), D0);

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
const entri = (re: RegExp): RegExpMatchArray => cocok(badan, re);
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined; lang: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return {
      berkas: atribut("file") ?? [...t.matchAll(/"([^":]+):(\d+):(\d+)"/g)].map((x) => `${x[1]}:${x[2]}:${x[3]}`).join(" + "),
      lines: atribut("lines"),
      judul: atribut("title"),
      lang: atribut("lang"),
    };
  });

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.22 ada, masalah, jalur inti, prasyarat 3.21, lab t3-dasbor, peran security dan backend; judul dan baris peta sama dengan naskah", () => {
    expect(dari("t3-m25")).toMatchObject({ ada: true, nomor: "3.22", jenis: "masalah", inti: true, prasyarat: ["t3-offline"], lab: ["t3-dasbor"], tahap: 3, peran: ["security", "backend"] });
    const minggu = cocok(naskah, /\| M25 \| (\d+) \|/)[1]!;
    expect(dari("t3-m25").label).toBe(`Masalah 25 · minggu ${minggu}`);
    harus(`Minggu ${minggu} Tahap 3.`);
    expect(dari("t3-offline").nomor).toBe("3.21");
    expect(dari("t3-xss-csrf")).toMatchObject({ nomor: "3.23", prasyarat: ["t3-m25"], lab: ["t3-dasbor"], adr: [30] });
    expect(frontmatter).toContain('title: "3.22 M25: Kotak peringatan di riwayat Ani"');
    expect(dari("t3-m25").judul).toBe("M25: Kotak peringatan di riwayat Ani");
    expect(naskah).toContain("| 3.22 | 4 | M25: Kotak peringatan di riwayat Ani | Masalah | ★ | t3-dasbor | cari-bug |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-offline\]\] · Jalur inti<\/p>/);
    expect(dari("t3-m25").menit).toBe(Number(m[1]) + Number(m[2]));
    expect(naskah).toContain("| 3.22 | 4 |");
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
    expect(id).toEqual(["A0", "t1-sql-injection", "t2-adr-ledger", "t3-offline", "t3-prd", "t3-skema", "t3-xss-csrf"]);
    const sesuai: [string, string, string][] = [
      ["t1-sql-injection", "1.20", "SQL injection"], ["t2-adr-ledger", "2.8", "ADR 6 direvisi"], ["t3-offline", "3.21", "Offline-first dan sinkron"],
      ["t3-prd", "3.1", "PRD v3"], ["t3-skema", "3.5", "Skema data"], ["t3-xss-csrf", "3.23", "Keamanan 5"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("3.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t3-offline").ada, "3.21 belum ditulis: tautannya tampil (segera) sampai halaman itu merge").toBeDefined();
    expect(dari("t3-xss-csrf").ada, "3.23 belum ditulis: tautannya tampil (segera) sampai halaman itu merge").toBeDefined();
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 3.22 ditepati: 3.5 (sesi web, token CSRF, keterangan di-encode, jurnal tidak bisa dihapus), 2.8 (data pribadi belum dijadwalkan), 3.2, 3.1 (P0 dasbor, P1 catatan)", () => {
    expect(hal35).toContain("| `sesi` (token_hash, akun_id, kedaluwarsa) | `sesi` + `jenis` (app, web) dan `csrf_hash` | Sesi dasbor memakai cookie dan token CSRF | [[t3-m25\\|M25]] |");
    expect(hal35).toContain("| `jurnal.keterangan` teks bebas | Tetap; kini juga diisi dari catatan user dan wajib di-encode saat ditampilkan | Catatan tampil di notifikasi dan dasbor; jurnal tidak bisa dihapus, dan [[t2-adr-ledger\\|halaman 2.8]] mencatat penghapusan data pribadi belum dijadwalkan | [[t3-m25\\|M25]] |");
    expect(hal28).toContain("| Data pribadi harus bisa dihapus | Jurnal tidak bisa dihapus, padahal `keterangan` berisi teks bebas");
    expect(hal28).toContain("| Belum dijadwalkan di naskah |");
    expect(hal32).toContain("| Dasbor web warung | [[t3-xss-csrf\\|XSS, CSRF, cookie, CSP, passkey]] |");
    expect(hal32).toContain("| Catatan pada pembayaran | [[B6\\|Validation]], [[t3-xss-csrf\\|output encoding]] |");
    expect(hal31).toMatch(/\| P0 \| Dasbor web warung \|/);
    expect(hal31).toContain("| P1 | Catatan pada pembayaran dan transfer | Maksimal 100 karakter; tampil di notifikasi dan di dasbor |");
    harus("- [[t3-skema]]: `jurnal.keterangan` berisi teks bebas yang wajib di-encode saat ditampilkan, dan sesi jenis web memakai cookie dan token CSRF.");
    harus("- [[t3-prd]]: dasbor web warung adalah P0 dan catatan pada pembayaran adalah P1 di PRD v3.");
    harus("- [[t2-adr-ledger]]: jurnal tidak bisa dihapus, jadi catatan teks bebas tetap ada di sana. Penghapusan data pribadi belum dijadwalkan.");
  });
  test("halaman tidak membuka isi 3.23: ADR 30, CSP, passkey, nonce, SameSite, dan token CSRF sebagai keputusan hanya disebut sebagai penunjuk", () => {
    expect(hitung(badan, "ADR 30")).toBe(1);
    expect(badan.indexOf("ADR 30")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, "CSP")).toBe(1);
    expect(badan.indexOf("CSP")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, "passkey")).toBe(1);
    expect(badan).not.toMatch(/nonce|__Host-|Content-Security-Policy|SameSite=|CRDT|WebAuthn/);
    expect(hitung(badan, "[[t3-xss-csrf]]")).toBe(2);
  });
});

describe("naskah M25 dan gejala: kutipan, angka cerita, dan Dimas yang hanya mencoba", () => {
  const barisM25 = naskah.split("\n").find((b) => b.startsWith("| M25 |"))!;
  test("baris M25 di naskah memuat kotak berisi 1, ucapan Wulan, dugaan ekstensi dan library tabel, payload Dimas, jurnal append-only, dan XSS lawan CSRF", () => {
    expect(barisM25).toContain('Setiap Ani membuka "Riwayat penerimaan" di dasbor, muncul kotak peringatan berisi angka 1. Wulan: "Mungkin ekstensi browser Ani."');
    expect(barisM25).toContain("Ekstensi browser atau bug library tabel");
    expect(barisM25).toContain(`Dimas menaruh \`${PAYLOAD}\` di catatan pembayaran ke warung Ani, untuk mencoba.`);
    expect(barisM25).toContain("Jurnal tidak bisa dihapus (append-only), jadi catatan itu tinggal selamanya; perbaikannya di output.");
    expect(barisM25).toContain("XSS mengalahkan CSRF yang benar dan `HttpOnly` tidak mencegah aksi atas nama Ani");
    expect(naskah).toContain("| XSS dan CSRF | Data dari sistem sendiri tetap input | M25 |");
    harus('Minggu 8 Tahap 3. Ani membuka dasbor warung di laptopnya dan memilih "Riwayat penerimaan". Sebuah kotak peringatan muncul dengan satu angka: 1.');
    harus('Ani menghubungi Wulan, web engineer yang membangun dasbor itu. Wulan: "Mungkin ekstensi browser Ani."');
    harus("Wulan dan Raka punya dua dugaan, seperti di naskah: ekstensi di browser Ani, atau bug di library tabel yang dipakai dasbor.");
    harus("Data dari sistem sendiri tetap input. Catatan bisa lolos validasi panjang, tersimpan di database sendiri, dan tetap menjalankan skrip di tempat ia tampil.");
    harus("**Data dari sistem sendiri tetap input.**");
    expect(mainGo).toContain("<h1>Riwayat penerimaan — %[2]s</h1>");
    expect(naskah).toContain("| **Wulan** | Web engineer dari tim web Lestari");
    expect(naskah).toContain("dasbor warung");
  });
  test("Dimas hanya mencoba: payload hanya satu pemanggilan alert(1), tanpa fetch, tanpa pengiriman ke luar; Rp5.000 dibayar sungguhan lewat api-t3", () => {
    expect(PAYLOAD).toBe("<img src=x onerror=alert(1)>");
    expect(PAYLOAD.match(/\w+\(/g)).toEqual(["alert("]);
    expect(PAYLOAD).not.toMatch(/fetch|XMLHttpRequest|document\.cookie|http/i);
    expect(JUMLAH).toBe(5000);
    harus(`Dimas membayar Rp${rupiah(JUMLAH)} ke Warung Ani lewat \`api-t3\` dengan catatan \`${PAYLOAD}\`, untuk mencoba.`);
    harus(`Catatan itu ${PAYLOAD.length} karakter, jauh di bawah batas ${MAKS_CATATAN}.`);
    harus(`Payload Dimas hanya \`alert(1)\`.`);
    harus(`Riwayat itu memuat satu penerimaan Rp${rupiah(JUMLAH)} dari Dimas, dengan catatan.`);
    expect(runPy).toContain('d.curl("POST", "/transfers", {"ke": 418, "jumlah": 5000, "catatan": PAYLOAD}, token=tok');
    expect(runPy).toContain('harap(status, 201, "Dimas membayar Rp5.000 ke Warung Ani dengan catatan M25 lewat api-t3")');
    expect(runPy).toContain('DIMAS = "dimas@lestari.example"');
    expect(MAKS_CATATAN).toBe(100);
  });
});

describe("rekaman xss.txt: bagian A, D, dan E, dan rentang Snippet", () => {
  test("bagian A: satu dialog alert berisi 1, satu elemen img, cookie tanpa HttpOnly dan terbaca skrip; semua sumbu rentan menyala", () => {
    expect(jA.dialogs).toEqual([{ type: "alert", message: "1" }]);
    expect(jA.elemImgDiDaftar).toBe(1);
    expect(jA.cookieJSBisaDibaca).toBe(true);
    expect(jA.cookieHttpOnly).toBe(false);
    expect(jA.cookieName).toBe("sesi");
    expect(argA).toEqual({ escape: "rentan", csp: "mati", cookie: "rentan", samesite: "none", token: "tidak" });
    harus("Rekaman bagian A menunjukkan akibatnya: satu elemen `<img>` nyata di daftar, dan satu dialog `alert` berisi 1.");
    harus("Dasbor di bagian A menyalakan semua mode rentan sekaligus. Tiga berperan di halaman ini: `-escape rentan`, `-csp mati`, dan `-cookie rentan`. Dua lainnya, `-samesite none` dan `-token tidak`, baru berperan di CSRF ([[t3-xss-csrf]]).");
    harus("Karena cookie sesi di A tanpa `HttpOnly`, `document.cookie` bisa dibaca skrip (`cookieJSBisaDibaca: true`); lab tidak mengirim isinya ke mana pun.");
    expect(readmeLab).toContain("Lab tidak mengirim token itu ke mana pun; yang terekam hanya \"bisa dibaca\".");
    expect(Object.keys(argA).length).toBe(5);
    expect(X.antara(A0, A0).startsWith("# --- A. Mode rentan: keterangan lewat innerHTML tanpa escape")).toBe(true);
  });
  test("bagian D: satu dialog berisi 1, fetch dijawab 200, harga produk 1 dari Rp25000 ke Rp2; kata 'skrip yang sama' di rekaman dijelaskan halaman", () => {
    expect(jD.dialogs).toEqual([{ type: "alert", message: "1" }]);
    expect(jD.statusFetch).toBe(200);
    expect(Number(hargaD[1])).toBe(25000);
    expect(Number(hargaD[2])).toBe(2);
    expect(runPy).toContain('harap(harga_sesudah, 2, "harga berubah walau token CSRF, Origin, dan cookie __Host- semuanya benar")');
    harus(`Jawabannya 200, dan harga Nasi goreng Warung Ani berubah dari Rp${rupiah(Number(hargaD[1]))} ke Rp${hargaD[2]}:`);
    harus('Baris terakhir rekaman itu menulis "skrip yang sama". Maksudnya skrip yang berjalan di halaman yang sama, yaitu skrip Playwright tadi.');
    expect(X.baris1(rekDZ)).toContain("sesudah skrip yang sama memanggil /api/menu/harga");
    // yang menjalankan fetch adalah page.evaluate di driver.js, bukan catatan Dimas: fetch ada di dalam xssLawanCsrf dan tidak di PAYLOAD
    const fnD = driverJs.slice(driverJs.indexOf("async function xssLawanCsrf("), driverJs.indexOf("async function csrf("));
    expect(fnD).toContain("page.evaluate(async () => {");
    expect(fnD).toContain("'X-CSRF-Token': window.csrf");
    expect(fnD).toContain("body: JSON.stringify({ produk_id: 1, harga: 2 })");
    expect(fnD).toContain("credentials: 'same-origin'");
    expect(PAYLOAD).not.toContain("fetch");
    harus("Payload Dimas hanya `alert(1)`. Bagian D memerankan skrip lain: `driver.js` menjalankan `fetch` di halaman dasbor lewat `page.evaluate`, dengan token CSRF dari variabel `csrf` di halaman itu. Skrip itu milik Playwright, bukan catatan Dimas:");
    expect(mainGo).toContain("var csrf = %[3]s;");
  });
  test("bagian E: nol dialog, nol img, nol pelanggaran CSP, tag terbaca utuh sebagai teks; D dan E memakai dasbor yang sama kecuali -escape, keduanya -csp mati", () => {
    expect(jE.dialogs).toEqual([]);
    expect(jE.elemImgDiDaftar).toBe(0);
    expect(jE.cspPelanggaran).toEqual([]);
    expect(jE.teksDaftar).toContain(PAYLOAD);
    expect(jE.cookieHttpOnly).toBe(true);
    expect(jE.cookieName).toBe("__Host-sesi");
    expect(argD).toEqual({ escape: "rentan", csp: "mati" });
    expect(argE).toEqual({ csp: "mati" });
    const bedaD = Object.keys(argD).filter((k) => argE[k] !== argD[k]);
    expect(bedaD).toEqual(["escape"]);
    expect(argD.csp).toBe(argE.csp);
    harus("Bagian D dan E memakai dasbor yang sama, kecuali cara menulis catatan: D memakai `-escape rentan`, E tidak. Keduanya `-csp mati`:");
    harus("Di E catatan tampil sebagai teks biasa: 0 elemen `<img>` dan 0 dialog.");
    harus("**Satu pengaturan diganti, dan kotaknya hilang.**");
    // driver D dan E berbeda fungsi, tetapi keduanya mencatat dialog lewat page.on('dialog')
    expect(driverJs.slice(driverJs.indexOf("async function xssLawanCsrf("))).toContain("page.on('dialog'");
    expect(driverJs.slice(driverJs.indexOf("async function xss("), driverJs.indexOf("async function xssLawanCsrf("))).toContain("page.on('dialog'");
  });
  test("tiap Snippet rekaman dan kode: berkas, rentang, bahasa, dan judul diturunkan dari sumber (nomor baris dihitung, bukan ditulis tangan)", () => {
    const s = tagSnippet();
    const harapan = [
      { berkas: `labs/api-t3/internal/service/notif.go:${notifA}:${notifZ} + labs/api-t3/internal/service/notif.go:${ketA}:${ketZ}`, lines: undefined, lang: "go",
        judul: `Kode lab: labs/api-t3/internal/service/notif.go baris ${notifA} sampai ${notifZ} dan ${ketA} sampai ${ketZ} (catatan diperiksa panjangnya, lalu masuk ke keterangan jurnal)` },
      { berkas: "labs/t3-dasbor/go/cmd/dasbor/main.go", lines: `${renderA}:${renderZ}`, lang: "go",
        judul: `Kode lab: labs/t3-dasbor/go/cmd/dasbor/main.go baris ${renderA} sampai ${renderZ} (dua cara menulis keterangan)` },
      { berkas: "labs/t3-dasbor/output/xss.txt", lines: `${A0}:${jsonSesudah(A0)}`, lang: undefined,
        judul: `Rekaman lab: labs/t3-dasbor/output/xss.txt baris ${A0} sampai ${jsonSesudah(A0)} (bagian A, dasbor rentan)` },
      { berkas: "labs/t3-dasbor/js/driver.js", lines: `${launchA}:${launchA + 1}`, lang: "js",
        judul: `Kode lab: labs/t3-dasbor/js/driver.js baris ${launchA} dan ${launchA + 1} (browser baru, konteks baru)` },
      { berkas: "labs/t3-dasbor/js/driver.js", lines: `${evalA}:${evalZ}`, lang: "js",
        judul: `Kode lab: labs/t3-dasbor/js/driver.js baris ${evalA} sampai ${evalZ} (fetch dijalankan di dalam halaman dasbor)` },
      { berkas: "labs/t3-dasbor/output/xss.txt", lines: `${rekD0}:${rekDZ}`, lang: undefined,
        judul: `Rekaman lab: labs/t3-dasbor/output/xss.txt baris ${rekD0} sampai ${rekDZ} (bagian D, skrip di halaman dasbor mengubah harga)` },
      { berkas: "labs/api-t3/output/skema.txt", lines: `${delA}:${delA + 2}`, lang: undefined,
        judul: `Rekaman lab: labs/api-t3/output/skema.txt baris ${delA} sampai ${delA + 2} (bagian D, DELETE jurnal ditolak)` },
      { berkas: `labs/t3-dasbor/run.py:${kodeD}:${kodeD} + labs/t3-dasbor/run.py:${kodeE}:${kodeE}`, lines: undefined, lang: "python",
        judul: `Kode lab: labs/t3-dasbor/run.py baris ${kodeD} dan ${kodeE} (D dan E, dasbor yang sama kecuali tampilan catatan)` },
      { berkas: "labs/t3-dasbor/output/xss.txt", lines: `${E0}:${jsonSesudah(E0)}`, lang: undefined,
        judul: `Rekaman lab: labs/t3-dasbor/output/xss.txt baris ${E0} sampai ${jsonSesudah(E0)} (bagian E, textContent)` },
    ];
    expect(s).toEqual(harapan);
    // isi tiap potongan: kepala bagian ada di baris pertama, hasil JSON di baris terakhir, tanpa ID internal
    expect(X.baris1(A0)).toMatch(/^# --- A\. /);
    expect(X.baris1(E0)).toMatch(/^# --- E\. /);
    expect(X.baris1(jsonSesudah(A0) - 1)).toMatch(/^\$ node driver\.js xss /);
    expect(X.baris1(jsonSesudah(E0) - 1)).toMatch(/^\$ node driver\.js xss /);
    for (const [a, z] of [[A0, jsonSesudah(A0)], [rekD0, rekDZ], [E0, jsonSesudah(E0)]] as [number, number][]) expect(X.antara(a, z), `rekaman ${a}:${z}`).not.toMatch(POLA_ID_INTERNAL);
    for (const [T, a, z] of [[Nt, notifA, notifZ], [Nt, ketA, ketZ], [Mn, renderA, renderZ], [Dr, launchA, launchA + 1], [Dr, evalA, evalZ], [Rp, kodeD, kodeD], [Rp, kodeE, kodeE], [Sk, delA, delA + 2]] as [ReturnType<typeof baris>, number, number][])
      expect(T.antara(a, z), `kode ${a}:${z}`).not.toMatch(POLA_ID_INTERNAL);
    // baris D tidak boleh memuat kepala bagian D: kepala itu memuat ID riset
    expect(X.baris1(D0)).toMatch(/\(R3-\d+\)/);
    expect(rekD0).toBe(D0 + 1);
    expect(X.baris1(rekD0)).toMatch(/^\$ node driver\.js xss-lawan-csrf /);
  });
});

describe("kode lab: catatan diterima apa adanya, dasbor, browser tanpa ekstensi, dan jurnal tanpa DELETE", () => {
  test("periksaCatatan hanya memotong spasi di ujung, menolak panjang dan karakter kontrol, dan tidak menyentuh tanda < atau >; keterangan = dasar + ': ' + catatan; POST /transfers memakainya", () => {
    const fn = Nt.antara(notifA, notifZ);
    expect(fn).toContain("c = strings.TrimSpace(c)");
    expect(fn).toContain("utf8.RuneCountInString(c) > MaksCatatan");
    expect(fn).toContain("r < 0x20 || r == 0x7f");
    expect(fn).toContain("return c, nil");
    expect(fn).not.toMatch(/html\.|Escape|Replace|ReplaceAll|'<'|'>'|"<"|">"|regexp/);
    expect(Nt.antara(ketA, ketZ)).toContain('return dasar + ": " + catatan');
    expect(bayarGo).toContain('keterangan(fmt.Sprintf("Bayar %s ke %s", pembayar.Nama, penerima.Nama), catatan)');
    expect(bayarGo).toContain("periksaCatatan(catatan)");
    expect(PAYLOAD.length).toBeLessThan(MAKS_CATATAN);
    expect([...PAYLOAD].some((r) => r.charCodeAt(0) < 0x20 || r.charCodeAt(0) === 0x7f)).toBe(false);
    harus("Server hanya menolak catatan yang terlalu panjang atau berisi karakter kontrol, lalu menambahkan sisanya ke teks jurnal setelah spasi di ujungnya dipangkas:");
    harus("Tanda `<` dan `>` bukan karakter kontrol, jadi catatan itu lolos. Aturan yang melarang kedua tanda itu juga akan menolak catatan sah seperti \"5 < 10\" (penalaran).");
    // klaim negatif berlingkup: di seluruh internal/service api-t3 (bukan tes), hanya periksaCatatan memeriksa isi catatan
    const svc = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/internal/service/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(svc.length).toBeGreaterThan(5);
    let panggil = 0;
    for (const f of svc) panggil += hitung(baca(f), "periksaCatatan(");
    expect(panggil).toBe(1 /* definisi */ + 3 /* Bayar, Kirim, Pesan */);
  });
  test("catatan yang sama ikut ke teks notifikasi uang (pesanUang), dan cara HP menampilkannya tidak dijalankan", () => {
    const pesan = Nt.antara(Nt.nomor((x) => x.startsWith("func pesanUang(")), Nt.nomor((x) => x === "}", Nt.nomor((x) => x.startsWith("func pesanUang("))));
    expect(pesan).toContain('isi += " Catatan: " + catatan');
    expect(bayarGo).toContain("pesanUang(pembayar.Nama, jumlah, id, catatan)");
    harus("Catatan yang sama ikut ke teks notifikasi uang (`pesanUang` di `api-t3`). Cara HP menampilkannya Tidak dijalankan.");
  });
  test("dasbor lab: render rentan memakai innerHTML dan render aman memakai textContent; halaman riwayat memuat tepat satu skrip inline dan tidak memuat berkas luar", () => {
    expect(Mn.antara(renderA, renderZ)).toContain("renderRentan = `b.innerHTML = row.jenis + ': Rp' + row.nominal + ' — ' + row.keterangan;`");
    expect(Mn.antara(renderA, renderZ)).toContain("kiri.textContent = row.jenis");
    expect(Mn.antara(renderA, renderZ)).toContain("ket.textContent = row.keterangan;");
    const halamanDasbor = mainGo.slice(mainGo.indexOf("const halamanDasbor = `"), mainGo.indexOf("func (s *server) dasborPage("));
    expect(hitung(halamanDasbor, "<script")).toBe(1);
    expect(halamanDasbor).not.toMatch(/<script[^>]*\ssrc=|<link\b|<iframe|https?:\/\//);
    harus("Halaman riwayat di dasbor lab hanya memuat satu skrip inline (dibaca dari `main.go`), dan kotaknya tetap muncul.");
    harus("Dasbor itu pengganti dasbor Wulan: ia membaca `jurnal` langsung dari database dengan query yang sama dengan `RiwayatPenerimaan` di `api-t3`.");
    expect(mainGo).toContain("// riwayat: uang masuk ke buku akun warung, sama persis dengan query RiwayatPenerimaan api-t3");
    expect(readmeLab).toContain("Ia tidak memanggil server api-t3 lewat HTTP.");
  });
  test("mode bawaan dasbor: cookie HttpOnly, SameSite Lax, dan gerbang CSRF memeriksa Sec-Fetch-Site, Origin, dan token; bagian D tidak mengubah ketiganya, dan E merekam cookie HttpOnly", () => {
    expect(mainGo).toContain('HttpOnly: s.cookie != "rentan", Secure: secure, SameSite: sameSite,');
    expect(mainGo).toContain("sameSite, secure := http.SameSiteLaxMode, s.cookie != \"rentan\"");
    expect(mainGo).toContain('r.Header.Get("Sec-Fetch-Site")');
    expect(mainGo).toContain('r.Header.Get("Origin")');
    expect(mainGo).toContain('r.Header.Get("X-CSRF-Token")');
    expect(mainGo).toContain('if s.token != "tidak" && !s.csrfSah(r, x) {');
    expect(Object.keys(argD).filter((k) => ["cookie", "samesite", "token"].includes(k))).toEqual([]);
    expect(jE.cookieHttpOnly).toBe(true);
    harus("Dasbor di bagian D memakai cookie sesi `HttpOnly` dan memeriksa token CSRF, Origin, dan Sec-Fetch-Site, karena `-cookie`, `-samesite`, dan `-token` memakai nilai bawaannya (dibaca dari `run.py`).");
  });
  test("browser baru di tiap skenario: chromium.launch() dan newContext(), tanpa persistent context dan tanpa argumen ekstensi di driver.js dan run.py; versi dari README dan package.json", () => {
    expect(Dr.baris1(launchA)).toBe("  const browser = await chromium.launch();");
    expect(Dr.baris1(launchA + 1)).toBe("  const context = await browser.newContext();");
    expect(driverJs).not.toMatch(/launchPersistentContext|--load-extension|--disable-extensions-except|\bargs:/);
    expect(runPy).not.toMatch(/launchPersistentContext|--load-extension|load_extension/);
    expect(hitung(driverJs, "chromium.launch(")).toBe(hitung(driverJs, "browser.newContext()"));
    const versi = cocok(readmeLab, /Chromium (\d+\.\d+\.\d+\.\d+) lewat Playwright (\d+\.\d+\.\d+)/);
    expect(baca("situs/package.json")).toContain(`"@playwright/test": "${versi[2]}"`);
    harus(`Browser-nya Chromium ${versi[1]} yang dikendalikan Playwright ${versi[2]} (menurut README lab). Browser lain Tidak dijalankan.`);
    expect(readmeLab).toContain("Browser selain Chromium (Firefox, Safari, Chromium versi lain): Tidak dijalankan.");
    harus("Browser di rekaman diluncurkan baru di tiap skenario, dan lab tidak memasang ekstensi apa pun:");
    harus(`Dokumentasi Playwright ${versi[2]} menulis bahwa ekstensi hanya bekerja di Chromium dengan persistent context, dan kode di atas tidak memakainya`);
    expect(barisRiset("R3-207")).toContain("Extensions only work in Chromium when launched with a persistent context");
    expect(barisRiset("R3-207")).toContain(`Playwright ${versi[2]}`);
    expect(barisRiset("R3-207")).toContain(`tag v${versi[2]}`);
    expect(badan).toContain(`blob/v${versi[2]}/docs/src/chrome-extensions-js-python.md`);
  });
  test("jurnal: rekaman skema.txt menolak DELETE (42501), role api_t3 hanya SELECT dan INSERT pada jurnal; tidak ada GRANT lain untuk jurnal di berkas non-rekaman labs/api-t3", () => {
    expect(Sk.baris1(delA + 1)).toBe("ERROR:  permission denied for table jurnal");
    expect(Sk.baris1(delA + 2)).toBe("   -- SQLSTATE 42501");
    expect(dasarT3).toContain('"GRANT SELECT, INSERT ON jurnal, posting TO api_t3",');
    // klaim negatif berlingkup: seluruh berkas .py, .sql, .go, .sh di labs/api-t3 (bukan output, README, tes)
    const berkas = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && /\.(py|sql|go|sh)$/.test(f) && !f.endsWith("_test.go"));
    expect(berkas.length).toBeGreaterThan(20);
    const grant: string[] = [];
    for (const f of berkas) for (const l of baca(f).split("\n")) if (/GRANT\b/i.test(l) && /\bjurnal\b/.test(l)) grant.push(`${f}: ${l.trim()}`);
    expect(grant).toEqual(['labs/api-t3/dasar_t3.py: "GRANT SELECT, INSERT ON jurnal, posting TO api_t3",']);
    harus("Role `api_t3` hanya punya `SELECT` dan `INSERT` pada `jurnal` dan `posting` (dibaca dari `dasar_t3.py`).");
    harus("**Perbaikannya di output, karena barisnya tidak bisa dihapus.** Role aplikasi tidak bisa menghapus baris `jurnal`:");
    expect(skemaTxt).toContain("# DELETE outbox dan operasi_sinkron diizinkan: hanya untuk job retensi (-bersih); jurnal dan posting tidak pernah.");
  });
});

describe("sumber luar: MDN innerHTML, OWASP, Playwright, MDN Set-Cookie, dan baris riset R3-205 sampai R3-208", () => {
  const kutipan = [...badan.matchAll(/\]\((https:\/\/[^)]+)\), dibuka (\d{4}-\d{2}-\d{2}), Tidak dijalankan\)/g)].map((m) => [m[1]!, m[2]!] as const);
  test("tiap tautan sumber luar berlabel 'dibuka <tanggal>, Tidak dijalankan' dan tanggalnya sama dengan baris riset", () => {
    const hostPeta: [string, string, string][] = [
      ["https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML", "R3-205", "developer.mozilla.org"],
      ["https://github.com/microsoft/playwright/blob/v1.64.0/docs/src/chrome-extensions-js-python.md", "R3-207", "microsoft/playwright"],
      ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie", "R3-208", "developer.mozilla.org"],
      ["https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html", "R3-206", "cheatsheetseries.owasp.org"],
    ];
    expect(kutipan.map((k) => k[0]).sort()).toEqual(hostPeta.map((h) => h[0]).sort());
    const semuaTautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(semuaTautan.sort()).toEqual(kutipan.map((k) => k[0]).sort());
    for (const [url, id, host] of hostPeta) {
      const tgl = kutipan.find((k) => k[0] === url)![1];
      const b = barisRiset(id);
      expect(b, id).toContain(`dibuka ${tgl}`);
      expect(b, id).toContain(host);
      expect(b.endsWith("| 3.22 | Tidak berubah, dicek 2026-10-27 |"), id).toBe(true);
    }
    for (const [, tgl] of kutipan) expect(tgl).toBe("2026-10-27");
  });
  test("baris riset memuat kalimat dokumentasi yang dikutip halaman, dan tidak ada ID riset yang tampil di halaman, widget, diagram, atau kartu", () => {
    expect(barisRiset("R3-205")).toContain("onerror='alert(1)'");
    expect(barisRiset("R3-205")).toContain("mencegah elemen `script` berjalan tetapi rentan terhadap banyak cara lain");
    expect(barisRiset("R3-205")).toContain("Node.textContent");
    expect(barisRiset("R3-206")).toContain("creates a text node without parsing HTML");
    expect(barisRiset("R3-206")).toContain("an internal REST-based web service or even an internal database");
    expect(barisRiset("R3-206")).toContain("strictly validating that data at the point that it is retrieved");
    expect(barisRiset("R3-206")).toContain("hapus rujukan ke sink tidak aman seperti `innerHTML` dan pakai `textContent` atau `value`");
    expect(barisRiset("R3-208")).toContain("will still be sent with JavaScript-initiated requests");
    expect(barisRiset("R3-93")).toContain("will still be sent with JavaScript-initiated requests");
    harus("MDN memberi contoh yang serupa, `<img src='x' onerror='alert(1)'>`: `src` bukan gambar yang valid, jadi `onerror` berjalan.");
    harus("MDN menulis juga bahwa `innerHTML` mencegah elemen `script` berjalan, tetapi tetap rentan terhadap banyak cara lain untuk menjalankan JavaScript");
    harus("OWASP menulis bahwa `textContent` membuat text node tanpa mengurai HTML. OWASP juga menyarankan menghapus rujukan ke `innerHTML` dan memakai `textContent` atau `value`");
    harus("Menurut OWASP, data dari sumber internal seperti database internal dianggap tercemar, kecuali divalidasi ketat saat diambil (bagian tentang interceptor di halaman yang sama).");
    harus("`HttpOnly` melarang skrip membaca cookie. Cookie tetap dikirim bersama request dari JavaScript, termasuk `fetch` (");
    for (const teks of [badan, JSON.stringify(widgetMentah), JSON.stringify(diagramMentah), kartuMentah.slice(kartuMentah.indexOf('"t3-m25-1"'), kartuMentah.indexOf('"t3-m25-4"') + 900)]) {
      expect(teks).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(teks).not.toMatch(POLA_ID_INTERNAL);
    }
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d\b(?!\.\d)/);
  });
  test("ID riset R3-205 sampai R3-208 ada sekali, urut, dan hanya untuk 3.22; ID yang dipakai halaman istilah XSS tercatat", () => {
    const id = [...riset.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => Number(m[1]!.slice(3)));
    expect(new Set(id).size).toBe(id.length);
    expect(id.filter((n) => n >= 205 && n <= 209)).toEqual([205, 206, 207, 208]);
    for (const n of [205, 206, 207, 208]) expect(barisRiset(`R3-${n}`)).toMatch(/\| 3\.22 \| Tidak berubah, dicek 2026-10-27 \|$/);
    for (const m of istilahMentah.matchAll(/"riset": "(R3-\d+)"/g)) expect(barisRiset(m[1]!), m[1]).toBeDefined();
    for (const m of istilahMentah.matchAll(/"riset": "(R3-\d+)"/g)) expect(["R3-205", "R3-206"]).toContain(m[1]);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman dan kode", () => {
  test("tiga baris, sumber rekaman dengan catatan bahwa langkah gambar gagal dimuat tidak terekam; nilai angka dari xss.txt, run.py, dan skema.txt", () => {
    expect(diagram.id).toBe("t3-m25-kotak-peringatan");
    expect(diagram.judul).toBe("Catatan Dimas: dari jurnal sampai kotak peringatan");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-dasbor, xss.txt bagian A dan E, dan api-t3 skema.txt bagian D; langkah gambar gagal dimuat menurut MDN, tidak terekam" });
    expect(diagram.baris.map((b) => [b.label, b.sub])).toEqual([
      ["Dasbor menulis catatan lewat innerHTML", "xss.txt bagian A"],
      ["Dasbor menulis catatan lewat textContent", "xss.txt bagian E"],
      ["Baris jurnal itu tidak bisa dihapus", "api-t3 skema.txt bagian D"],
    ]);
    const harapanSimpul = [
      [
        { teks: "Catatan Dimas: tag gambar", sub: `${PAYLOAD.length} karakter, disimpan apa adanya` },
        { teks: "Dasbor: innerHTML", sub: `${jA.elemImgDiDaftar} elemen img di daftar` },
        { teks: "Gambar x gagal dimuat", sub: "onerror berjalan (MDN)" },
        { teks: "Kotak berisi 1", sub: "satu dialog alert", nada: "warn" },
      ],
      [
        { teks: "Catatan yang sama", sub: "terbaca utuh di daftar" },
        { teks: "Dasbor: textContent", sub: `${jE.elemImgDiDaftar} elemen img` },
        { teks: "Tag tampil sebagai teks", sub: `${jE.dialogs.length} kotak peringatan`, nada: "good" },
      ],
      [
        { teks: "DELETE FROM jurnal", sub: "role aplikasi api_t3", kode: true },
        { teks: "permission denied", sub: "SQLSTATE 42501" },
        { teks: "Catatan tetap di jurnal", sub: "perbaikan di output", nada: "warn" },
      ],
    ];
    expect(diagram.baris.map((b) => b.simpul.map((s) => ({ teks: s.teks, sub: s.sub, ...(s.nada !== "biasa" ? { nada: s.nada } : {}), ...(s.kode ? { kode: true } : {}) })))).toEqual(harapanSimpul);
    expect(jA.dialogs).toHaveLength(1);
    expect(jA.dialogs[0]!.message).toBe("1");
    expect(jE.teksDaftar).toContain(PAYLOAD);
    expect(Sk.baris1(delA)).toBe("api_t3=> DELETE FROM jurnal WHERE id = 1;");
    expect(Sk.baris1(delA + 2)).toContain("42501");
    expect(diagram.catatan).toBe("Kotak oranye adalah akibat yang direkam. Langkah gambar gagal dimuat menurut MDN dan tidak terekam.");
  });
});

describe("widget cari-bug: kode dari main.go, indeks baris bug, tebakan tidak bocor, perbaikan, dan ringkas", () => {
  // skrip halaman: dari fetch('/api/riwayat' sampai }); sebelum form-harga, dengan %[4]s diganti baris render
  const skripBaris = Mn.b.slice(skriptA - 1, skriptZ);
  const renderRentan = cocok(mainGo, /const renderRentan = `(.*)`/)[1]!;
  const renderAman = cocok(mainGo, /const renderAman = `([\s\S]*?)`\n/)[1]!.split("\n");
  const gabung = (render: string[]): string[] => skripBaris.flatMap((l) => (l.trim() === "%[4]s" ? render : [l]));
  test("baris widget sama dengan skrip halaman di main.go (render rentan); perbaikan sama dengan render aman; satu baris diganti tiga baris", () => {
    expect(skripBaris.some((l) => l.trim() === "%[4]s")).toBe(true);
    expect(widget.baris).toEqual(gabung([`    ${renderRentan}`]));
    expect(widget.perbaikan.baris.map((l) => l.trim())).toEqual(gabung(renderAman.map((l) => `    ${l.trim()}`)).map((l) => l.trim()));
    expect(widget.perbaikan.baris.length - widget.baris.length).toBe(renderAman.length - 1);
    const beda = widget.baris.filter((l) => !widget.perbaikan.baris.includes(l));
    expect(beda).toEqual([`    ${renderRentan}`]);
    expect(renderAman).toHaveLength(3);
    expect(widget.bahasa).toBe("js");
    expect(widget.sumber.teks).toBe(`Skrip halaman dasbor mode rentan dari labs/t3-dasbor/go/cmd/dasbor/main.go baris ${skriptA} sampai ${skriptZ}, dengan baris render dari renderRentan (baris ${Mn.nomor((x) => x.startsWith("const renderRentan = "))}). Kodenya dari repo lab; perilakunya direkam di xss.txt bagian A.`);
    expect(widget.judul).toBe("Skrip halaman dasbor yang menulis riwayat penerimaan");
  });
  test("bug: tepat satu baris, yang menulis row.keterangan lewat innerHTML; baris aman adalah innerHTML tetap, textContent tetap, dan fetch; tiap indeks cocok dengan isi barisnya", () => {
    const sinkInnerHtml = widget.baris.map((l, i) => [i, l] as const).filter(([, l]) => l.includes("innerHTML"));
    expect(sinkInnerHtml.map(([i]) => i)).toEqual([2, 6]);
    expect(widget.bug).toEqual([widget.baris.findIndex((l) => l.includes("innerHTML = row.") && l.includes("row.keterangan"))]);
    expect(widget.baris[widget.bug[0]!]).toBe(`    ${renderRentan}`);
    expect(widget.baris[2]).toBe("  c.innerHTML = '';");
    expect(widget.baris[9]).toContain("c.textContent = '(belum ada penerimaan)'");
    expect(widget.baris[0]).toContain("fetch('/api/riwayat'");
    expect(Object.keys(widget.aman)).toEqual(["0", "2", "9"]);
    expect(widget.bug[0]).toBe(6);
    expect(widget.bug[0]).not.toBe(0);
    expect(widget.bug[0]).not.toBe(widget.baris.length - 1);
    expect(Object.keys(widget.alasan)).toEqual(["6"]);
  });
  test("teks widget: alasan memuat angka dari rekaman A, tebakan tidak menyebut baris atau kata kuncinya, label dan ringkas dikunci", () => {
    expect(widget.id).toBe("t3-m25-caribug");
    expect(widget.alasan["6"]).toBe(`Teks dari kolom keterangan ditulis lewat innerHTML, jadi browser mengurainya sebagai HTML. Catatan Dimas menjadi elemen img nyata (${jA.elemImgDiDaftar} elemen di daftar), gambar x gagal dimuat, dan onerror menjalankan alert(1) (Rekaman lab xss.txt bagian A).`);
    expect(widget.alasan["6"]).toContain(`(${jA.elemImgDiDaftar} elemen di daftar)`);
    expect(widget.alasan["6"]).toContain("onerror menjalankan alert(1) (Rekaman lab xss.txt bagian A)");
    expect(widget.alasan["6"]).toContain("Catatan Dimas menjadi elemen img nyata");
    expect(widget.alasan["6"]).not.toMatch(/`/);
    expect(JSON.stringify(widget.tebak)).not.toMatch(/innerHTML|baris 7|textContent|keterangan/);
    expect(widget.tebak).toEqual({
      q: "Satu baris di skrip ini membuat catatan dari Dimas menjadi elemen halaman, bukan teks. Baris mana?",
      petunjuk: "Untuk tiap baris, tanya: apakah ada string dari database yang masuk ke browser sebagai HTML, dan siapa yang menulis isi string itu?",
    });
    expect(widget.aman).toEqual({
      "0": "Baris ini mengambil data dan menguraikannya sebagai JSON. Tanda kurung sudut di dalam string JSON tetap karakter biasa, jadi baris ini bukan masalahnya.",
      "2": "Baris ini mengosongkan daftar dengan string tetap dari kode. Tidak ada data dari database yang masuk lewat innerHTML di baris ini.",
      "9": "textContent dengan teks tetap dari kode. textContent menulis teks tanpa mengurai HTML, dan perbaikan untuk keterangan memakai cara yang sama.",
    });
    expect(widget.perbaikan.label).toBe("Satu baris diganti tiga baris: keterangan ditulis sebagai teks");
    expect(widget.perbaikan.catatan).toBe(`Catatan Dimas tetap sama di jurnal. Di rekaman bagian E, tag tampil sebagai teks di daftar: ${jE.elemImgDiDaftar} elemen img dan ${jE.dialogs.length} kotak peringatan. textContent tidak mengurai HTML.`);
    expect(widget.label).toEqual({
      sumber: "Kode lab; perilakunya Rekaman lab",
      tebakDulu: "Tebak dulu:",
      perintah: "Klik baris yang membuat catatan menjadi elemen, lalu Periksa.",
      periksa: "Periksa tanda saya",
      ulang: "Ulang",
      benar: "sumber masalah",
      lewat: "terlewat",
      salahTanda: "baris ini tidak salah",
      perbaikanTombol: "Lihat rancangan yang benar",
      ringkas: "Kamu menandai {benar} dari {bug} baris yang bermasalah, dan {salah} baris lain ikut ditandai.",
    });
    harus("Ubah satu hal:** sesudah memeriksa, tekan Lihat rancangan yang benar. Satu baris diganti tiga baris yang memakai `textContent`, dan rekaman E menunjukkan hasilnya: 0 kotak, dan tag terlihat sebagai teks.");
    expect(badan).toContain(`tekan ${widget.label.perbaikanTombol}.`);
  });
  test("periksa dan ringkas: tanda benar, tanda meleset, dan tanda berlebih menghasilkan nilai dan kalimat yang diharapkan; skema menolak bug di luar kode", () => {
    const tepat = periksa(widget, new Set([6]));
    expect(tepat).toMatchObject({ tepat: true, jumlahBenar: 1, jumlahBug: 1 });
    expect(ringkas(widget.label.ringkas!, tepat)).toBe("Kamu menandai 1 dari 1 baris yang bermasalah, dan 0 baris lain ikut ditandai.");
    const salah = periksa(widget, new Set([2, 9]));
    expect(salah.tepat).toBe(false);
    expect(salah.nilai).toEqual({ 6: "lewat", 2: "salah", 9: "salah" });
    expect(ringkas(widget.label.ringkas!, salah)).toBe("Kamu menandai 0 dari 1 baris yang bermasalah, dan 2 baris lain ikut ditandai.");
    const rusak = structuredClone(widgetMentah) as typeof widgetMentah;
    rusak.bug = [99];
    expect(DataCariBug.safeParse(rusak).success).toBe(false);
    const rusak2 = structuredClone(widgetMentah) as typeof widgetMentah & { aman: Record<string, string> };
    rusak2.aman["6"] = "baris bug";
    expect(DataCariBug.safeParse(rusak2).success).toBe(false);
  });
  test("tanpa JavaScript: noscript sesudah widget menyebut baris yang bermasalah dengan nomor dari indeks bug, dan tidak ada tombol mati", () => {
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("<CariBug"));
    harus(`Baris yang bermasalah adalah baris ${widget.bug[0]! + 1}, yang menulis \`keterangan\` lewat \`innerHTML\`. Alasannya ada di blok "Yang sebenarnya".`);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<CariBug client:visible data=\{caribug\} \/>/g)).toHaveLength(1);
  });
});

describe("glosarium dan halaman istilah XSS", () => {
  test("baris glosarium XSS dan Output encoding menunjuk 3.22, kalimatnya paling banyak 25 kata, dan halaman istilah xss.json valid dengan nama sama", () => {
    const g = (nama: string) => glosarium.split("\n").find((l) => l.startsWith(`| **${nama}**`));
    for (const nama of ["XSS", "Output encoding"]) {
      const baris3 = g(nama);
      expect(baris3, nama).toBeDefined();
      const sel = baris3!.split("|").map((x) => x.trim());
      expect(sel[3]).toBe("[[t3-m25]]");
      expect(sel[2]!.split(/\s+/).length, nama).toBeLessThanOrEqual(25);
    }
    expect(g("XSS")).toContain("**XSS** (cross-site scripting)");
    const hi = HalamanIstilah.parse(JSON.parse(istilahMentah));
    expect(hi.istilah).toBe("XSS (cross-site scripting)");
    expect(hi.cerita![0]!.rujukan).toBe("t3-m25");
    expect(hi.cerita![0]!.teks).toContain(`Rp${rupiah(JUMLAH)}`);
    expect(hi.cerita![0]!.teks).toContain(`kotak peringatan berisi ${jA.dialogs[0]!.message}`);
    expect(hi.cerita![0]!.teks).toContain("`xss.txt` bagian A");
    expect(hi.sumber!.find((s) => "rekaman" in s)).toMatchObject({ rekaman: "labs/t3-dasbor/output/xss.txt" });
    expect(hi.stack).toBeNull();
    expect(hi.terkait).toEqual(["Output encoding", "Authentication", "Token"]);
    for (const nama of hi.terkait!) expect(g(nama), nama).toBeDefined();
    expect(hi.jebakan![0]).toContain("atribut seperti `onerror` pada `img` tetap berjalan (MDN)");
    expect(hi.mekanisme![3]).toContain("(bagian D)");
    const baris2 = JSON.parse(baca("situs/data/glosarium.json")) as unknown;
    const glos = Glosarium.parse(baris2);
    expect(glos.find((x) => x.s === "istilah-xss")).toMatchObject({ t: "XSS (cross-site scripting)" });
    expect(glos.find((x) => x.s === "istilah-output-encoding")).toMatchObject({ t: "Output encoding" });
  });
  test("halaman istilah XSS dikunci utuh; URL sumber sama dengan tautan di halaman, tanggal sama dengan baris riset, dan rekaman ada", () => {
    const hi = JSON.parse(istilahMentah) as typeof ISTILAH_TERKUNCI;
    expect(hi).toEqual(ISTILAH_TERKUNCI);
    const tautan = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    for (const s of hi.sumber.filter((x): x is Extract<(typeof hi.sumber)[number], { url: string }> => "url" in x)) {
      expect(tautan, s.url).toContain(s.url);
      expect(s.catatan, s.judul).toContain("dibuka 2026-10-27");
      expect(barisRiset(s.riset)).toContain("dibuka 2026-10-27");
    }
    const rek = hi.sumber.find((x) => "rekaman" in x) as { rekaman: string };
    expect(terlacak?.has(rek.rekaman) ?? true).toBe(true);
    expect(hi.cerita[0]!.teks).toContain(`Rp${rupiah(JUMLAH)}`);
    expect(hi.mekanisme.join(" ")).toContain("bagian D");
  });
});

describe("kartu Cek diri: empat kartu, sama dengan kartu.json, dan fakta yang sama dengan rekaman dan kode", () => {
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    const cek = badan.slice(badan.indexOf("### Cek diri"));
    const soal = [...cek.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    const kartu = (JSON.parse(kartuMentah) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-m25");
    expect(kartu.map((k) => k.id)).toEqual(["t3-m25-1", "t3-m25-2", "t3-m25-3", "t3-m25-4"]);
    soal.forEach((m, i) => {
      expect(kartu[i]!.tanya).toBe(m[2]);
      expect(kartu[i]!.jawab).toBe(m[3]);
      expect(kartu[i]!.judul).toBe("3.22 M25: Kotak peringatan di riwayat Ani");
      expect(kartu[i]!.url).toBe("tahap-3/m25-kotak-peringatan/");
    });
  });
  test("kartu 1 sampai 4 menyebut fakta yang sama dengan skema.txt D, bagian D dan A, driver.js, dan bagian D dan E", () => {
    const k = (n: number) => badan.slice(badan.indexOf(`**${n}.**`), badan.indexOf(`**${n + 1}.**`) > 0 ? badan.indexOf(`**${n + 1}.**`) : undefined);
    expect(k(1)).toContain("Catatan sah seperti \"5 < 10\" ikut ditolak (penalaran). Baris yang sudah ada di jurnal juga tidak bisa dihapus: role aplikasi hanya punya `SELECT` dan `INSERT`, dan `DELETE` ditolak (`skema.txt` bagian D).");
    expect(k(2)).toContain(`Di bagian D \`fetch\` membawa cookie dan token CSRF halaman itu, jadi dijawab ${jD.statusFetch} dan harga berubah ke Rp${hargaD[2]}.`);
    expect(k(2)).toContain("Skrip D diperankan Playwright, bukan catatan Dimas.");
    expect(k(3)).toContain("`driver.js` meluncurkan Chromium baru lewat `chromium.launch()` dan `newContext()`, tanpa persistent context, jadi tanpa ekstensi. Dialog berisi 1 tetap muncul di sana (`xss.txt` bagian A).");
    expect(k(4)).toContain("D memakai `innerHTML` dan satu dialog berisi 1 muncul. E memakai `textContent`: 0 dialog, 0 elemen `<img>`, dan tag terlihat sebagai teks.");
    expect(jD.dialogs).toHaveLength(1);
    expect(jE.dialogs).toHaveLength(0);
    expect(jE.elemImgDiDaftar).toBe(0);
  });
});

const kutipan4 = [...badan.matchAll(/\]\(https:\/\/[^)]+\), dibuka \d{4}-\d{2}-\d{2}, Tidak dijalankan\)/g)].length;
describe("struktur halaman: tingkat heading, nomor daftar, label sumber, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor; satu tebakan details dan empat jawaban", () => {
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
    expect(badan).not.toMatch(/<summary>[^\n]*<img/);
  });
  test("jawaban tebakan: satu kotak berisi 1, dari bagian A, dan ekstensi bukan sebabnya; posisi jawaban tidak berpola", () => {
    harus("Satu kotak, berisi 1 (`xss.txt` bagian A). Browser itu dibuat baru oleh `driver.js`, jadi ekstensi Ani bukan sebabnya.");
    harus("Tebak dulu: berapa kotak peringatan yang muncul di Chromium baru itu, dan apa isinya?");
    expect(jA.dialogs.length).toBe(1);
    expect(jA.dialogs[0]!.message).toBe("1");
    // jawaban benar widget: indeks 6 dari 11 baris (bukan baris pertama atau terakhir)
    expect(widget.bug[0]! / (widget.baris.length - 1)).toBeGreaterThan(0.3);
    expect(widget.bug[0]! / (widget.baris.length - 1)).toBeLessThan(0.7);
  });
  test("label sumber: Rekaman lab, Ilustrasi, Tidak dijalankan, dan Asumsi dipakai sesuai sumbernya; catatan Playwright memerankan skrip D diberi label eksplisit", () => {
    harus("*Angka cerita (Ilustrasi):* Minggu 8, kotak yang muncul setiap kali riwayat dibuka, dan angka 1 berasal dari naskah.");
    expect(hitung(badan, "Asumsi")).toBe(1);
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
    expect(cara).toContain("**Rekaman lab**");
    expect(cara).toContain("**Tidak dijalankan**");
    // satu penjelasan label, "Browser lain", notifikasi HP, empat tautan sumber luar, dan Cek diri 2
    expect(hitung(badan, "Tidak dijalankan")).toBe(1 + 1 + 1 + kutipan4 + 1);
    // penalaran hanya untuk catatan sah "5 < 10": satu di Yang sebenarnya dan satu di Cek diri 1
    expect(hitung(badan, "(penalaran)")).toBe(hitung(badan, '"5 < 10"'));
  });
  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa kata yang dilarang gaya-bahasa", () => {
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(badan).not.toMatch(/!/);
    expect(badan).not.toMatch(/\b(mudah|cukup|tinggal|kita|Anda)\b/i);
    expect(frontmatter).not.toMatch(POLA_ID_INTERNAL);
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (memuat Minggu 8, Rp5.000, innerHTML, dan tidak bisa dihapus)", () => {
    expect(frontmatter.trim().split("\n")).toEqual(FRONTMATTER);
    expect(FRONTMATTER[1]).toContain("Minggu 8.");
    expect(FRONTMATTER[1]).toContain(`Rp${rupiah(JUMLAH)}`);
    expect(FRONTMATTER[1]).toContain("innerHTML");
    expect(FRONTMATTER[1]).toContain("tidak bisa dihapus");
  });
});

// ---- teks terkunci (dibangkitkan dari halaman; semua tes di atas menurunkan nilainya dari sumber) ---------------------------
const FRONTMATTER: string[] = [
  "title: \"3.22 M25: Kotak peringatan di riwayat Ani\"",
  "description: Minggu 8. Setiap Ani membuka riwayat penerimaan di dasbor, muncul kotak peringatan berisi angka 1. Catatan Rp5.000 dari Dimas berisi tag gambar, dasbor menulisnya lewat innerHTML, dan baris jurnalnya tidak bisa dihapus.",
];
const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import CariBug from \"../../../widgets/cari-bug/CariBug.tsx\";",
  "import kotak from \"../../../../data/diagram/t3-m25-kotak-peringatan.json\";",
  "import caribug from \"../../../../data/widget/t3-m25-caribug.json\";",
  "<p class=\"meta\">Baca 6 menit · coba 3 menit · Prasyarat: [[t3-offline]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 8 Tahap 3. Ani membuka dasbor warung di laptopnya dan memilih \"Riwayat penerimaan\". Sebuah kotak peringatan muncul dengan satu angka: 1.",
  "Ani menutup kotak itu, lalu riwayatnya tampil seperti biasa. Setiap kali ia membuka riwayat itu lagi, kotak yang sama muncul.",
  "Ani menghubungi Wulan, web engineer yang membangun dasbor itu. Wulan: \"Mungkin ekstensi browser Ani.\"",
  "*Angka cerita (Ilustrasi):* Minggu 8, kotak yang muncul setiap kali riwayat dibuka, dan angka 1 berasal dari naskah. Rekaman di blok \"Yang sebenarnya\" membuka riwayat itu satu kali per skenario. Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Wulan dan Raka punya dua dugaan, seperti di naskah: ekstensi di browser Ani, atau bug di library tabel yang dipakai dasbor.",
  "Kedua dugaan mencari sebab di laptop Ani atau di kode tampilan. Tidak ada yang menanyakan isi riwayat itu sendiri, karena isinya datang dari sistem mereka sendiri.",
  "Lab menguji dugaan pertama dengan membuka riwayat Warung Ani di Chromium baru yang tidak dipasangi ekstensi. Riwayat itu memuat satu penerimaan Rp5.000 dari Dimas, dengan catatan.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: berapa kotak peringatan yang muncul di Chromium baru itu, dan apa isinya?</summary>",
  "Satu kotak, berisi 1 (`xss.txt` bagian A). Browser itu dibuat baru oleh `driver.js`, jadi ekstensi Ani bukan sebabnya.",
  "Yang khas di riwayat itu hanya satu baris, penerimaan dari Dimas. Blok berikutnya menunjukkan bagaimana baris itu menjadi kotak.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Kotak itu muncul karena catatan Dimas. Dasbor menulis catatan ke halaman lewat `innerHTML`, jadi browser membacanya sebagai HTML, bukan sebagai teks.",
  "<Rantai data={kotak} />",
  "*Kondisi rekaman:* PostgreSQL 17.11, server Go `api-t3` yang menulis catatan, dan dasbor kecil `t3-dasbor` yang menampilkannya. Dasbor itu pengganti dasbor Wulan: ia membaca `jurnal` langsung dari database dengan query yang sama dengan `RiwayatPenerimaan` di `api-t3`. Browser-nya Chromium 156.0.8078.4 yang dikendalikan Playwright 1.64.0 (menurut README lab). Browser lain Tidak dijalankan.",
  "**Dimas menaruh catatan.** Dimas membayar Rp5.000 ke Warung Ani lewat `api-t3` dengan catatan `<img src=x onerror=alert(1)>`, untuk mencoba. Catatan itu 28 karakter, jauh di bawah batas 100. Server hanya menolak catatan yang terlalu panjang atau berisi karakter kontrol, lalu menambahkan sisanya ke teks jurnal setelah spasi di ujungnya dipangkas:",
  "<Snippet files={[\"labs/api-t3/internal/service/notif.go:37:48\", \"labs/api-t3/internal/service/notif.go:51:56\"]} lang=\"go\" title=\"Kode lab: labs/api-t3/internal/service/notif.go baris 37 sampai 48 dan 51 sampai 56 (catatan diperiksa panjangnya, lalu masuk ke keterangan jurnal)\" />",
  "Tanda `<` dan `>` bukan karakter kontrol, jadi catatan itu lolos. Aturan yang melarang kedua tanda itu juga akan menolak catatan sah seperti \"5 < 10\" (penalaran). Catatan yang sama ikut ke teks notifikasi uang (`pesanUang` di `api-t3`). Cara HP menampilkannya Tidak dijalankan.",
  "**Dasbor menulis catatan lewat `innerHTML`.** Mode rentan dasbor memilih salah satu dari dua cara menulis `keterangan` ke halaman:",
  "<Snippet file=\"labs/t3-dasbor/go/cmd/dasbor/main.go\" lines=\"236:241\" lang=\"go\" title=\"Kode lab: labs/t3-dasbor/go/cmd/dasbor/main.go baris 236 sampai 241 (dua cara menulis keterangan)\" />",
  "`innerHTML` meminta browser mengurai string sebagai HTML. MDN memberi contoh yang serupa, `<img src='x' onerror='alert(1)'>`: `src` bukan gambar yang valid, jadi `onerror` berjalan. MDN menulis juga bahwa `innerHTML` mencegah elemen `script` berjalan, tetapi tetap rentan terhadap banyak cara lain untuk menjalankan JavaScript ([MDN, Element.innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML), dibuka 2026-10-27, Tidak dijalankan).",
  "Rekaman bagian A menunjukkan akibatnya: satu elemen `<img>` nyata di daftar, dan satu dialog `alert` berisi 1.",
  "<Snippet file=\"labs/t3-dasbor/output/xss.txt\" lines=\"7:9\" title=\"Rekaman lab: labs/t3-dasbor/output/xss.txt baris 7 sampai 9 (bagian A, dasbor rentan)\" />",
  "Dasbor di bagian A menyalakan semua mode rentan sekaligus. Tiga berperan di halaman ini: `-escape rentan`, `-csp mati`, dan `-cookie rentan`. Dua lainnya, `-samesite none` dan `-token tidak`, baru berperan di CSRF ([[t3-xss-csrf]]). Karena cookie sesi di A tanpa `HttpOnly`, `document.cookie` bisa dibaca skrip (`cookieJSBisaDibaca: true`); lab tidak mengirim isinya ke mana pun.",
  "**Ekstensi bukan sebabnya.** Browser di rekaman diluncurkan baru di tiap skenario, dan lab tidak memasang ekstensi apa pun:",
  "<Snippet file=\"labs/t3-dasbor/js/driver.js\" lines=\"22:23\" lang=\"js\" title=\"Kode lab: labs/t3-dasbor/js/driver.js baris 22 dan 23 (browser baru, konteks baru)\" />",
  "Dokumentasi Playwright 1.64.0 menulis bahwa ekstensi hanya bekerja di Chromium dengan persistent context, dan kode di atas tidak memakainya ([Playwright, Chrome extensions](https://github.com/microsoft/playwright/blob/v1.64.0/docs/src/chrome-extensions-js-python.md), dibuka 2026-10-27, Tidak dijalankan). Dugaan Wulan tidak cocok. Dugaan library tabel juga tidak diperlukan. Halaman riwayat di dasbor lab hanya memuat satu skrip inline (dibaca dari `main.go`), dan kotaknya tetap muncul.",
  "**Skrip yang lebih berbahaya tidak butuh celah tambahan.** Payload Dimas hanya `alert(1)`. Bagian D memerankan skrip lain: `driver.js` menjalankan `fetch` di halaman dasbor lewat `page.evaluate`, dengan token CSRF dari variabel `csrf` di halaman itu. Skrip itu milik Playwright, bukan catatan Dimas:",
  "<Snippet file=\"labs/t3-dasbor/js/driver.js\" lines=\"79:86\" lang=\"js\" title=\"Kode lab: labs/t3-dasbor/js/driver.js baris 79 sampai 86 (fetch dijalankan di dalam halaman dasbor)\" />",
  "Dasbor di bagian D memakai cookie sesi `HttpOnly` dan memeriksa token CSRF, Origin, dan Sec-Fetch-Site, karena `-cookie`, `-samesite`, dan `-token` memakai nilai bawaannya (dibaca dari `run.py`). Jawabannya 200, dan harga Nasi goreng Warung Ani berubah dari Rp25.000 ke Rp2:",
  "<Snippet file=\"labs/t3-dasbor/output/xss.txt\" lines=\"20:22\" title=\"Rekaman lab: labs/t3-dasbor/output/xss.txt baris 20 sampai 22 (bagian D, skrip di halaman dasbor mengubah harga)\" />",
  "Baris terakhir rekaman itu menulis \"skrip yang sama\". Maksudnya skrip yang berjalan di halaman yang sama, yaitu skrip Playwright tadi. Skrip di halaman berjalan sebagai halaman itu sendiri, jadi cookie, token, dan Origin-nya sah. `HttpOnly` melarang skrip membaca cookie. Cookie tetap dikirim bersama request dari JavaScript, termasuk `fetch` ([MDN, Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), dibuka 2026-10-27, Tidak dijalankan).",
  "**Perbaikannya di output, karena barisnya tidak bisa dihapus.** Role aplikasi tidak bisa menghapus baris `jurnal`:",
  "<Snippet file=\"labs/api-t3/output/skema.txt\" lines=\"155:157\" title=\"Rekaman lab: labs/api-t3/output/skema.txt baris 155 sampai 157 (bagian D, DELETE jurnal ditolak)\" />",
  "Role `api_t3` hanya punya `SELECT` dan `INSERT` pada `jurnal` dan `posting` (dibaca dari `dasar_t3.py`). Catatan Dimas karena itu tetap ada di jurnal, dan menyaringnya saat masuk tidak membersihkan baris yang sudah ada. Penghapusan data pribadi dari `keterangan` belum dijadwalkan ([[t2-adr-ledger]]).",
  "**Satu pengaturan diganti, dan kotaknya hilang.** Bagian D dan E memakai dasbor yang sama, kecuali cara menulis catatan: D memakai `-escape rentan`, E tidak. Keduanya `-csp mati`:",
  "<Snippet files={[\"labs/t3-dasbor/run.py:200:200\", \"labs/t3-dasbor/run.py:215:215\"]} lang=\"python\" title=\"Kode lab: labs/t3-dasbor/run.py baris 200 dan 215 (D dan E, dasbor yang sama kecuali tampilan catatan)\" />",
  "Di E catatan tampil sebagai teks biasa: 0 elemen `<img>` dan 0 dialog.",
  "<Snippet file=\"labs/t3-dasbor/output/xss.txt\" lines=\"27:29\" title=\"Rekaman lab: labs/t3-dasbor/output/xss.txt baris 27 sampai 29 (bagian E, textContent)\" />",
  "OWASP menulis bahwa `textContent` membuat text node tanpa mengurai HTML. OWASP juga menyarankan menghapus rujukan ke `innerHTML` dan memakai `textContent` atau `value` ([OWASP, XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html), dibuka 2026-10-27, Tidak dijalankan). Baris di database tidak berubah.",
  "**Data dari sistem sendiri tetap input.** Catatan itu masuk lewat `api-t3` milik sendiri, tersimpan di database sendiri, dan tampil di dasbor sendiri, tetapi isinya ditulis orang lain. Menurut OWASP, data dari sumber internal seperti database internal dianggap tercemar, kecuali divalidasi ketat saat diambil (bagian tentang interceptor di halaman yang sama).",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Di bawah ini skrip halaman dasbor mode rentan, yang dikirim server ke browser Ani. Tandai baris yang membuat catatan Dimas menjadi elemen, lalu periksa.",
  "<CariBug client:visible data={caribug} />",
  "<noscript>",
  "Tanpa JavaScript, baris tidak bisa ditandai. Baris yang bermasalah adalah baris 7, yang menulis `keterangan` lewat `innerHTML`. Alasannya ada di blok \"Yang sebenarnya\".",
  "</noscript>",
  "**Ubah satu hal:** sesudah memeriksa, tekan Lihat rancangan yang benar. Satu baris diganti tiga baris yang memakai `textContent`, dan rekaman E menunjukkan hasilnya: 0 kotak, dan tag terlihat sebagai teks.",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-xss-csrf]]: XSS tersimpan (stored XSS), output encoding, CSP, CSRF, cookie sesi, dan passkey. Keputusannya ADR 30.",
  "- [[t1-sql-injection]]: pola yang sama di tempat lain. Parameter query memisahkan data dari perintah SQL, dan encoding saat output memisahkan data dari markup HTML.",
  "- [[t2-adr-ledger]]: jurnal tidak bisa dihapus, jadi catatan teks bebas tetap ada di sana. Penghapusan data pribadi belum dijadwalkan.",
  "- [[t3-skema]]: `jurnal.keterangan` berisi teks bebas yang wajib di-encode saat ditampilkan, dan sesi jenis web memakai cookie dan token CSRF.",
  "- [[t3-prd]]: dasbor web warung adalah P0 dan catatan pada pembayaran adalah P1 di PRD v3.",
  "Data dari sistem sendiri tetap input. Catatan bisa lolos validasi panjang, tersimpan di database sendiri, dan tetap menjalankan skrip di tempat ia tampil.",
  "### Cek diri",
  "**1.** Catatan Dimas lolos validasi panjang dan karakter kontrol. Kenapa menolak tanda `<` saat catatan masuk bukan perbaikan yang baik?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Catatan sah seperti \"5 < 10\" ikut ditolak (penalaran). Baris yang sudah ada di jurnal juga tidak bisa dihapus: role aplikasi hanya punya `SELECT` dan `INSERT`, dan `DELETE` ditolak (`skema.txt` bagian D). Catatan perlu ditulis sebagai teks di tempat ia tampil.",
  "</details>",
  "**2.** Cookie sesi Ani `HttpOnly`. Kenapa skrip yang berjalan di halaman dasbor tetap bisa mengubah harga?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "`HttpOnly` melarang skrip membaca cookie, bukan memakainya: `fetch` dari halaman yang sama ikut mengirim cookie (MDN Set-Cookie, Tidak dijalankan). Di bagian D `fetch` membawa cookie dan token CSRF halaman itu, jadi dijawab 200 dan harga berubah ke Rp2. Skrip D diperankan Playwright, bukan catatan Dimas.",
  "</details>",
  "**3.** Wulan menduga ekstensi browser Ani. Apa di rekaman yang menunjukkan dugaan itu tidak cocok?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "`driver.js` meluncurkan Chromium baru lewat `chromium.launch()` dan `newContext()`, tanpa persistent context, jadi tanpa ekstensi. Dialog berisi 1 tetap muncul di sana (`xss.txt` bagian A).",
  "</details>",
  "**4.** Bagian D dan E memakai dasbor yang sama kecuali cara menulis catatan. Apa bedanya hasil, dan apa yang tidak berubah di database?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "D memakai `innerHTML` dan satu dialog berisi 1 muncul. E memakai `textContent`: 0 dialog, 0 elemen `<img>`, dan tag terlihat sebagai teks. Catatan di database sama di keduanya, dan hanya cara menulisnya ke halaman yang berbeda.",
  "</details>",
  "</Blok>",
];
const ISTILAH_TERKUNCI = {
  "istilah": "XSS (cross-site scripting)",
  "sehari_hari": "XSS adalah celah yang membuat browser menjalankan skrip dari data yang seharusnya hanya tampil sebagai teks. Skrip itu berjalan sebagai halaman yang sedang dibuka, jadi ia memakai sesi orang yang membukanya.",
  "cerita": [
    {
      "rujukan": "t3-m25",
      "teks": "Dimas membayar Warung Ani Rp5.000 dengan catatan berupa tag gambar. Dasbor menulis catatan lewat innerHTML, dan Ani melihat kotak peringatan berisi 1 setiap kali membuka riwayat (`xss.txt` bagian A)."
    }
  ],
  "mekanisme": [
    "Seseorang menaruh teks berisi markup di kolom yang nanti ditampilkan, di sini catatan pembayaran.",
    "Server menyimpan teks itu apa adanya. Di jurnal, baris itu tidak bisa dihapus.",
    "Halaman menulis teks itu lewat `innerHTML`, jadi browser mengurainya sebagai HTML dan menjalankan atribut seperti `onerror`.",
    "Skrip berjalan sebagai halaman itu: ia memakai cookie dan token halaman, jadi token CSRF yang benar tidak menahannya (bagian D).",
    "Perbaikannya menulis teks lewat `textContent`, yang tidak mengurai HTML."
  ],
  "stack": null,
  "jebakan": [
    "Mengira hanya elemen `script` yang berbahaya. `innerHTML` memang tidak menjalankan `script`, tetapi atribut seperti `onerror` pada `img` tetap berjalan (MDN).",
    "Mengira data dari database sendiri aman. Catatan yang tersimpan di sistem sendiri tetap ditulis orang lain, dan halaman harus menulisnya sebagai teks.",
    "Mengira `HttpOnly` menghentikan serangan. Ia hanya melarang skrip membaca cookie, dan skrip tetap bisa mengirim request dengan cookie itu (bagian D)."
  ],
  "terkait": [
    "Output encoding",
    "Authentication",
    "Token"
  ],
  "sumber": [
    {
      "riset": "R3-205",
      "judul": "MDN: Element.innerHTML, bagian Security considerations",
      "url": "https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML",
      "catatan": "Halaman tanpa nomor versi, dibuka 2026-10-27. innerHTML mencegah elemen script berjalan tetapi rentan terhadap cara lain, dan contohnya memakai img dengan onerror."
    },
    {
      "riset": "R3-206",
      "judul": "OWASP: Cross Site Scripting Prevention Cheat Sheet",
      "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
      "catatan": "Halaman tanpa nomor versi, dibuka 2026-10-27. textContent membuat text node tanpa mengurai HTML, dan data dari sumber internal dianggap tercemar kecuali divalidasi ketat saat diambil."
    },
    {
      "judul": "Rekaman lab t3-dasbor: xss.txt bagian A, D, dan E",
      "rekaman": "labs/t3-dasbor/output/xss.txt",
      "catatan": "A: innerHTML memunculkan satu dialog berisi 1. D: skrip di halaman dasbor mengubah harga walau cookie dan token benar. E: textContent tanpa dialog."
    }
  ]
};
