// Penjaga halaman 5.2 (keputusan 1504): tabel tujuh baris, tautan konsep, tiga hal, versi pertama, tiga pertanyaan yang
// ditanam, angka beban, hitungan sel tabel peta zona, rekaman lab api-t5 dan t5-replika, kutipan dokumentasi, dan klaim
// negatif di fitur-ke-teknis.mdx dan diagram Rantai t5-fitur-inti.json diturunkan dari naskah Tahap 5 (bagian 2, 3, dan 4),
// registry cerita.json, widget peta zona t5-zona.json, halaman 5.1 dan ADR 45, rekaman labs/api-t5 dan labs/t5-replika,
// dan baris riset R5-115 sampai R5-119. Tanpa tes ini satu angka, satu ID, satu tautan, satu label, satu sel tabel, atau satu
// klaim negatif yang diubah tidak menggagalkan build. Lingkup klaim negatif: halaman ini, folder labs/api-t5/output, dan
// berkas yang disebut. BARIS_MDX di fitur-teknis-t5.halaman.nilai.ts adalah sidik teks (tiap baris persis); tes turunan di
// bawah berdiri sendiri tanpa sidik itu, supaya mutan yang mengubah makna (bukan hanya huruf) tertangkap oleh sumbernya.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-fitur-inti.json";
import zonaMentah from "../../data/widget/t5-zona.json";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX, NILAI_RANTAI } from "./fitur-teknis-t5.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  if (terlacak) expect(terlacak.has(rel) || rel.startsWith("situs/dist/"), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const BERKAS = "situs/src/content/docs/tahap-5/fitur-ke-teknis.mdx";
const mdx = baca(BERKAS);
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const prd51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const adr45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const rantai = DataRantai.parse(diagramMentah);
const rek = (lab: string, berkas: string): string[] => baca(`labs/${lab}/output/${berkas}`).split("\n");
const skema = rek("api-t5", "skema.txt");
const laporan = rek("api-t5", "laporan.txt");
const beban = rek("api-t5", "beban.txt");
const promosi = rek("t5-replika", "promosi.txt");

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; path?: string; peran?: string[]; bagian?: number | string; lab?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const hitung = (s: string, x: string): number => s.split(x).length - 1;
const sel = (b: string): string[] => b.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((s) => s.trim());
const bagian = (sumber: string, awal: string, akhir: string): string => {
  const i = sumber.indexOf(awal);
  expect(i, `bagian tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  return sumber.slice(i + awal.length).split(akhir)[0]!;
};
const barisAwal = (sumber: string, awal: string): string => {
  const b = sumber.split("\n").find((x) => x.startsWith(awal));
  expect(b, `baris tidak ada: ${awal}`).toBeDefined();
  return b!;
};
const tabelBaris = (teks: string): string[][] => teks.split("\n").filter((b) => b.startsWith("|") && !/^\|[-| ]+\|$/.test(b)).map(sel);
const blokMdx = (nama: string): string => {
  const awal = badan.indexOf(`<Blok nama="${nama}"`);
  const akhir = badan.indexOf("</Blok>", awal);
  expect(awal, `blok tidak ada: ${nama}`).toBeGreaterThanOrEqual(0);
  return badan.slice(awal, akhir);
};
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d = 1): string => n.toFixed(d).replace(".", ",");
// Pembulatan setengah ke atas seperti pembaca (toFixed membulatkan 8,684999 ke 8,68; keputusan 1138).
const bulat = (n: number, d = 0): number => Math.floor(n * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const fmt = (n: number, d: number): string => koma(bulat(n, d), d);
const polos = (s: string): string => s.replace(/\[\[[^\]|\\]+(?:\\?\|([^\]]+))?\]\]/g, "$1").replace(/\*\*/g, "").replace(/`/g, "").replace(/\\\|/g, "|").trim();

const bagian2 = bagian(naskah, "## 2. Dari fitur ke pekerjaan teknis", "\n## 3. ");
const bagian3 = bagian(naskah, "## 3. Inti teknis Tahap 5", "\n### Angka beban Tahap 5");
const bagianBeban = bagian(naskah, "### Angka beban Tahap 5", "\n## 3b.");
const bagian4 = bagian(naskah, "## 4. Masalah yang muncul, pelan-pelan", "\n### ADR yang lahir");
const naskahTabel = tabelBaru(bagian2);
function tabelBaru(teks: string): string[][] {
  return tabelBaris(teks).slice(1);
}

// ---- registry, meta, dan susunan blok ----------------------------------------------------------------------------------
describe("registry, meta, dan susunan blok", () => {
  test("5.2 ada, jenis Fitur → teknis, bagian 2, jalur inti, prasyarat 5.1, lab api-t5, peran mobile dan backend, judul sama dengan peta naskah", () => {
    const h = dari("t5-fitur-teknis");
    expect([h.tahap, h.nomor, h.jenis, h.bagian, h.inti, h.ada, h.prasyarat, h.lab, h.peran]).toEqual([5, "5.2", "fitur", 2, true, true, ["t5-prd"], ["api-t5"], ["mobile", "backend"]]);
    expect(h.path).toBe("tahap-5/fitur-ke-teknis.md");
    const peta = barisAwal(naskah, "| 5.2 |");
    expect(sel(peta)).toEqual(["5.2", "2, 3", h.judul, "Fitur → teknis", "★", "api-t5", "W5-zona"]);
    expect(front).toContain(`title: "5.2 ${h.judul}"`);
    expect(badan).toMatch(/^<p class="meta">Baca \d+ menit · Prasyarat: \[\[t5-prd\]\] · Jalur inti<\/p>$/m);
    expect(badan.match(/Baca (\d+) menit/)![1]).toBe(String(h.menit));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const kata = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(kata / 200 - dari("t5-fitur-teknis").menit!), `${kata} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat Fitur: dua pertama terbuka, tiga lain tertutup; widget hanya di blok Coba dulu", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => [x.nama, x.buka])).toEqual([
      ["Mulai", true], ["Coba dulu: di mana uang bergerak?", true], ["Dari fitur ke pekerjaan", false], ["Pertanyaan sebelum kode", false], ["Konsep yang akan dibutuhkan", false],
    ]);
    expect(cekTemplat("fitur", b)).toEqual([]);
    expect(hitung(badan, "<Blok "), "jumlah <Blok").toBe(5);
    expect(hitung(badan, "</Blok>"), "jumlah </Blok>").toBe(5);
    expect(hitung(badan, "<PetaZona />"), "jumlah widget").toBe(1);
    expect(blokMdx("Coba dulu: di mana uang bergerak?")).toContain("<PetaZona />");
    expect(hitung(badan, "<Snippet "), "jumlah Snippet").toBe(1);
    expect(blokMdx("Dari fitur ke pekerjaan")).toContain("<Snippet ");
  });
  test("tingkat heading: satu '## Inti' di blok Mulai, selebihnya label tebal; frontmatter tanpa heading", () => {
    expect(badan.match(/^#{1,6} .*$/gm)).toEqual(["## Inti"]);
    expect(blokMdx("Mulai")).toContain("\n## Inti\n");
    expect(front).not.toMatch(/^#/m);
  });
  test("deskripsi menyebut empat tokoh yang naskah beri tugas di versi pertama, dan pertanyaan pertama Tahap 5", () => {
    const deskripsi = barisAwal(front, "description:");
    const versi = bagian(bagian3, "**Versi pertama (minggu 2).**", "| Kejadian |");
    for (const [nama, kalimat] of [["Wulan", "Wulan menulis laporan"], ["Raka", "Raka memakai endpoint"], ["Hendra", "Hendra menulis cicilan"], ["Nadia", "Nadia mengusulkan event streaming"]] as const) {
      expect(deskripsi, `deskripsi tanpa ${nama}`).toContain(nama);
      expect(versi, `naskah: ${kalimat}`).toContain(kalimat);
    }
    expect(deskripsi).toContain("PRD v5");
    expect(deskripsi).toContain("pertanyaan pertama Tahap 5");
    expect(deskripsi).toContain("sebelum kode");
    expect(naskah).toContain("lahir pertanyaan pertama Tahap 5, sebelum satu baris kode");
  });
});

// ---- Inti: kalimat, Rantai, dua paragraf --------------------------------------------------------------------------------
describe("blok Mulai: Inti hasil-dulu dan diagram Rantai t5-fitur-inti.json", () => {
  const mulai = blokMdx("Mulai").split("\n").filter((b) => b.trim());
  test("susunan: judul Inti, satu kalimat, Rantai ringkas, lalu tepat dua paragraf; kalimat Inti tidak lebih dari 175 karakter", () => {
    expect(mulai[0]!.startsWith("<Blok nama=\"Mulai\" buka")).toBe(true);
    expect(mulai[1]).toBe("## Inti");
    expect(mulai[3]).toBe("<Rantai data={inti} ringkas />");
    expect(mulai).toHaveLength(6);
    expect(mulai[2]!.length).toBeLessThanOrEqual(175);
    expect(mulai[2]).toBe("PRD v5 menambah delapan tabel. Pekerjaan pertama Tahap 5 adalah satu keputusan: data mana yang boleh jadi salinan, dan di mana uang bergerak.");
    expect(badan).toContain('import inti from "../../../../data/diagram/t5-fitur-inti.json";');
    expect(hitung(badan, "<Rantai "), "jumlah Rantai").toBe(1);
  });
  test("definisi salinan dan primary diberikan di pemakaian pertama, dan pertanyaan pertama Tahap 5 sama dengan naskah", () => {
    expect(mulai[4]!.startsWith("*Salinan* adalah data yang sama yang disimpan atau dihitung di tempat lain dan bisa tertinggal dari sumbernya, misalnya replica, ringkasan, cache, dan event.")).toBe(true);
    expect(mulai[5]).toContain("yaitu database utama yang menerima semua tulisan");
    expect(badan.indexOf("*Salinan*")).toBeLessThan(badan.indexOf("salinan boleh banyak"));
    expect(badan.indexOf("yaitu database utama yang menerima semua tulisan")).toBeLessThan(badan.indexOf("satu primary menerima semua tulisan"));
    expect(mulai[5]).toContain("Dari baris laporan itu lahir pertanyaan pertama Tahap 5: salinan boleh banyak, tetapi tempat uang bergerak hanya satu.");
    expect(naskah).toContain("**salinan boleh banyak, tetapi tempat uang bergerak hanya satu**");
    expect(mulai[5]).toContain("([[t5-m40]])");
    expect(dari("t5-m40").nomor).toBe("5.4");
    expect(dari("t5-m40").jenis).toBe("masalah");
    expect(dari("t5-m40").lab).toContain("api-t5");
    expect(naskah).toContain("| M40 | 2 |");
  });
  test("Rantai: rekaman, dua baris, 22 tabel Tahap 4 + 8 = 30 dari ERD dan skema.txt, dua pembayaran Budi dan laporan Rp47.000 dari laporan.txt", () => {
    expect(rantai.id).toBe("t5-fitur-inti");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab api-t5" });
    const erd4 = JSON.parse(baca("situs/data/erd/tahap-4.json")) as { tabel: unknown[] };
    const baruLab = skema.filter((b) => /^\s*(snapshot_saldo|arsip_partisi|ringkasan_merchant_harian|jadwal_cicilan|angsuran|pengumuman|mitra_pos|sakelar) +\| r$/.test(b)).length;
    const jumlahTabel = Number(skema[skema.findIndex((b) => b.trim() === "tabel") + 2]!.trim());
    expect([erd4.tabel.length, baruLab, jumlahTabel]).toEqual([22, 8, 30]);
    expect(erd4.tabel.length + baruLab).toBe(jumlahTabel);
    const [b1, b2] = rantai.baris;
    expect(b1!.label).toBe("Database");
    expect(b1!.simpul.map((s) => s.teks)).toEqual([`${erd4.tabel.length} tabel`, `+ ${baruLab} tabel`, `${jumlahTabel} tabel`]);
    expect(b1!.simpul.map((s) => s.nada)).toEqual(["old", "system", "good"]);
    // Baris bawah: bagian A laporan.txt.
    const a = laporan.slice(laporan.findIndex((b) => b.startsWith("# --- A.")), laporan.findIndex((b) => b.startsWith("# --- B.")));
    const nominal = a.filter((b) => b.includes("POST '/transfers'")).map((b) => Number(b.match(/"nominal": (\d+)/)![1]));
    expect(nominal).toEqual([35000, 12000]);
    expect(a.filter((b) => b === "HTTP/1.1 201 Created")).toHaveLength(2);
    const jawab = a.find((b) => b.startsWith('{"merchant":505'))!;
    expect(JSON.parse(jawab)).toMatchObject({ merchant: 505, jumlah_transaksi: nominal.length, total: nominal.reduce((x, y) => x + y, 0) });
    expect(a.some((b) => b.includes("-rentan laporan-primary"))).toBe(true);
    expect(b2!.label).toBe("Laporan");
    expect(b2!.sub).toBe("mode rentan");
    expect(b2!.simpul.map((s) => s.teks)).toEqual([`${nominal.length} pembayaran`, "Jumlah posting", `Laporan Rp${titik(47000)}`]);
    expect(b2!.simpul.map((s) => s.sub ?? null)).toEqual([null, null, null]);
    expect(b2!.simpul.map((s) => s.nada)).toEqual(["biasa", "system", "warn"]);
    expect(rantai.baris).toHaveLength(2);
    expect(rantai.catatan).toBe("Abu-abu: akhir Tahap 4. Biru: yang ditambahkan. Hijau: hasilnya. Kuning: laporan yang membaca tempat uang bergerak.");
    expect(rantai.judul).toBe("Tabel dan laporan pertama");
  });
  test("paragraf Mulai menyebut angka laporan dari rekaman: Rp35.000, Rp12.000, Warung 505, 201, dua transaksi, total Rp47.000", () => {
    expect(mulai[5]).toContain("Baris bawah Rantai adalah versi pertama laporan Wulan. Budi membayar Rp35.000 dan Rp12.000 ke Warung 505, keduanya dijawab 201, dan laporan warung itu menjawab dua transaksi dengan total Rp47.000 (`laporan.txt`).");
    expect(naskah).toContain("Endpoint itu menjumlah posting hari ini milik merchant dari primary yang sama dengan pembayaran");
    expect(mulai[5]).toContain("Laporan itu menjumlah posting dari primary, yaitu database utama yang menerima semua tulisan, dan pembayaran memakai database yang sama");
    expect(laporan.some((b) => b.includes("Query laporan menjumlah posting masuk ke buku merchant hari ini langsung dari tabel posting di primary"))).toBe(true);
  });
  test("Rantai: simpul pendek supaya dua baris muat di HP, teks simpul tidak memuat angka di luar rekaman", () => {
    for (const b of rantai.baris) for (const s of b.simpul) expect(s.teks.split(" ").length, s.teks).toBeLessThanOrEqual(3);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/ADR \d|replica|failover|Kubernetes|R\d-\d+/i);
  });
});

// ---- Coba dulu: widget peta zona -----------------------------------------------------------------------------------------
const Z = zonaMentah as {
  tebak: { q: string; pilihan: string[]; jawaban: number; alasan: string };
  zona: { id: string; label: string; halaman: string[] }[];
  service: { id: string; tabel: string[] }[];
  kejadian: { id: string; masalah: string; halaman: string; sumber: string; sel: { s: string }[] }[];
  label: { status: Record<string, string>; kolom: { hal: string }; tiga: string[] };
};
describe("blok Coba dulu: widget W5-zona dan label dasar tabel", () => {
  const coba = blokMdx("Coba dulu: di mana uang bergerak?");
  test("zona, aman, dan tebakan: lima zona dari widget, jawaban benar menyebut service ledger dan satu primary", () => {
    const zona = Z.zona.map((z) => z.label);
    expect(zona).toEqual(["client", "edge", "service", "data", "operasi"]);
    expect(coba).toContain("Peta ini memuat lima zona dari PRD v5: client, edge, service, data, dan operasi.");
    const benar = Z.tebak.pilihan[Z.tebak.jawaban]!;
    expect(benar).toContain("service ledger");
    expect(benar).toContain("primary");
    const aman = coba.match(/aman="([^"]+)"/)![1]!;
    expect(aman).toBe("Kalau berhenti di sini, kamu sudah tahu: uang bergerak di service ledger dan di satu primary. Replica, ringkasan, cache, dan event hanya untuk dilihat.");
    expect(Z.tebak.alasan).toContain("Replica, ringkasan, cache, dan event hanya untuk dilihat");
    expect(Z.tebak.alasan).toContain("uang bergerak di dua zona");
  });
  test("label status, kolom Hal 1 sampai 3, dan arti Terjaga, Rusak, dan Tidak berlaku sama dengan widget", () => {
    const S = Z.label.status;
    expect([S.terjaga, S.rusak, S.tidak]).toEqual(["Terjaga", "Rusak", "Tidak berlaku"]);
    expect(coba).toContain(`Kolom ${Z.label.kolom.hal} 1, ${Z.label.kolom.hal} 2, dan ${Z.label.kolom.hal} 3 di tabel adalah tiga hal di blok Pertanyaan sebelum kode, bukan nomor halaman.`);
    expect(coba).toContain("Terjaga berarti hal itu tetap benar saat kejadian terjadi, Rusak berarti hal itu dilanggar, dan Tidak berlaku berarti kejadian itu tidak menyentuhnya.");
    expect(Z.label.tiga).toHaveLength(3);
    expect(hitung(badan, "tiga hal")).toBe(1);
  });
  test("Asumsi di peta: zona, tim, dan kejadian rancangan penulis; schema, tabel, dan hak role dari rekaman; arti label ditaut ke /cara-pakai/", () => {
    expect(coba).toContain("Zona, tim, dan delapan kejadian di peta adalah Asumsi ([Label sumber](/cara-pakai/#label-sumber)): rancangan penulis. Rekaman tiap kejadian ada di halaman masalahnya, bila ada.");
    expect(zonaMentah.sumber.jenis).toBe("asumsi");
    expect(zonaMentah.sumber.teks).toContain("Zona, pembagian tim, dan delapan kejadian adalah rancangan penulis (Asumsi)");
    expect(zonaMentah.sumber.teks).toContain("Halaman masalah di tiap kejadian memuat rekamannya sendiri, bila ada.");
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/label-sumber|Label sumber/);
    expect(hitung(badan, "(/cara-pakai/#label-sumber)")).toBe(1);
    expect(coba).toContain("Nama schema, jumlah tabel, dan hak role dibaca dari rekaman lab `api-t5`, dan di lab satu proses memegang keenam role.");
    expect(Z.service).toHaveLength(6);
    expect(Z.service.reduce((n, s) => n + s.tabel.length, 0)).toBe(30);
  });
  test("delapan kejadian × tiga hal = 24 sel; 9 Rusak: 3 di hal 1, 2 di hal 2, 4 di hal 3; hitungan sama dengan naskah", () => {
    const k = Z.kejadian;
    expect(k).toHaveLength(8);
    const sel24 = k.flatMap((x) => x.sel);
    expect(sel24).toHaveLength(24);
    const rusakPerHal = [0, 1, 2].map((i) => k.filter((x) => x.sel[i]!.s === "rusak").length);
    expect(rusakPerHal).toEqual([3, 2, 4]);
    expect(sel24.filter((c) => c.s === "rusak")).toHaveLength(9);
    expect(badan).toContain("Dari 24 sel tabelnya, 9 Rusak: tiga di hal 1, dua di hal 2, dan empat di hal 3. Itu Hitungan, yaitu dihitung dari sel yang tertulis, dan tabelnya berlabel Asumsi.");
    expect(badan).toContain("Peta zona di blok Coba dulu mencatat delapan kejadian yang menunjukkan akibatnya.");
    expect(blokMdx("Coba dulu: di mana uang bergerak?").length).toBeGreaterThan(0);
    // Naskah: baris tabel delapan kejadian dan hitungan Rusak per kolom dari kata Rusak di naskah.
    const tabelNaskah8 = tabelBaris(bagian(bagian3, "| Kejadian |", "\nMode rentan").replace(/^/, "| Kejadian |")).slice(1);
    expect(tabelNaskah8).toHaveLength(8);
    const rusakNaskah = [1, 2, 3].map((i) => tabelNaskah8.filter((r) => r[i]!.startsWith("Rusak")).length);
    expect(rusakNaskah).toEqual(rusakPerHal);
    for (let i = 0; i < 8; i++) expect(k[i]!.sel.map((c) => c.s)).toEqual([1, 2, 3].map((j) => { const t = tabelNaskah8[i]![j]!; return t.startsWith("Rusak") ? "rusak" : t.startsWith("Terjaga") ? "terjaga" : "tidak"; }));
  });
  test("baris M42 dan M47: kejadian ada di widget, penalaran dari dokumentasi dengan sumber, tanggal akses, dan batas lab", () => {
    const m42 = Z.kejadian.find((x) => x.masalah === "M42")!;
    const m47 = Z.kejadian.find((x) => x.masalah === "M47")!;
    expect([m42.id, m47.id]).toEqual(["primary-mati", "pod-notifikasi"]);
    expect([m42.sel.map((c) => c.s), m47.sel.map((c) => c.s)]).toEqual([["rusak", "tidak", "tidak"], ["rusak", "tidak", "tidak"]]);
    expect(m47.sumber).toBe("tidak-dijalankan");
    expect(bagian3).toContain("Kalimat di tabel ini tentang M42 dan M47 adalah penalaran dari dokumentasi (R5-100, R5-20), bukan kejadian yang direkam.");
    expect(coba).toContain("Dua baris tabel perlu catatan tentang dasarnya, karena keduanya penalaran dari dokumentasi, bukan kejadian yang direkam.");
    expect(coba).toContain("Baris primary mati (M42) bersandar pada dokumentasi: [PostgreSQL 17, bagian 26.2.8](https://www.postgresql.org/docs/17/warm-standby.html), dibuka 2026-11-02, Tidak dijalankan.");
    expect(coba).toContain("Dokumentasi itu menulis bahwa replikasi streaming asinkron secara bawaan, dan bila primary mati, transaksi yang sudah commit bisa belum sampai ke standby.");
    expect(coba).toContain("Baris pod notifikasi (M47) bersandar pada dokumentasi: [Kubernetes, Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/), halaman tanpa nomor versi, dibuka 2026-11-02, Tidak dijalankan.");
    expect(coba).toContain("Dokumentasi itu menulis bahwa pod tidak terisolasi untuk koneksi masuk secara bawaan, dan semua koneksi masuk diizinkan.");
    expect(coba).toContain("Bila ledger tidak memeriksa identitas pemanggil dan tidak ada NetworkPolicy yang ditegakkan, pod mana pun yang bisa menjangkaunya bisa meminta jurnal.");
    expect(coba).toContain("Rekaman `api-t5` merekam hak role di database, bukan identitas antar service di jaringan.");
    expect(hitung(badan, "dibuka 2026-11-02")).toBe(2);
    expect(hitung(badan, "Tidak dijalankan")).toBe(3);
  });
  test("akibat M42 direkam di t5-replika promosi.txt bagian A: lima jurnal 201 hilang di replica, WAL diputus, primary tidak dihentikan, fencing tidak ada", () => {
    const a = promosi.slice(promosi.findIndex((b) => b.startsWith("# --- A.")), promosi.findIndex((b) => b.startsWith("# --- B.")));
    const teks = a.join("\n");
    expect(teks).toContain("SELECT pg_terminate_backend(pid) FROM pg_stat_replication WHERE application_name = 'replika_laporan'");
    expect(teks).toContain("ALTER ROLE replikator_laporan NOLOGIN");
    expect(teks).toContain("Primary terus menerima pembayaran: lima pembayaran lagi, semuanya dijawab 201 ke client.");
    expect(teks).toContain("WHERE id IN (10204, 10205, 10206, 10207, 10208)");
    const ada = [...teks.matchAll(/ jurnal_ada\n-+\n (\d+)\n/g)].map((m) => Number(m[1]));
    expect(ada).toEqual([5, 0, 0]);
    expect(teks).toContain("Lima jurnal yang dijawab 201 ada di primary lama dan tidak ada di node baru");
    expect(teks).toContain("Fencing (menghentikan primary lama sebelum node baru menerima tulisan) tidak ada di lab ini: tidak ada yang menghentikan primary lama.");
    expect(teks).not.toMatch(/docker (stop|kill)|pg_ctl (stop|kill)|SIGKILL/);
    expect(coba).toContain("Lab `t5-replika` merekam akibatnya. Lima jurnal yang dijawab 201 ada di primary lama dan tidak ada di replica yang dipromosikan. Lab memutus koneksi WAL dan tidak mematikan primary.");
    expect(dari("t5-m42").lab).toContain("t5-replika");
  });
});

// ---- Dari fitur ke pekerjaan: tabel tujuh baris dan rekaman skema ----------------------------------------------------------
describe("blok Dari fitur ke pekerjaan: tabel tujuh baris sama dengan naskah bagian 2, delapan tabel baru, dan hak role dari skema.txt", () => {
  const blok = blokMdx("Dari fitur ke pekerjaan");
  test("tujuh baris, empat kolom pertama sama persis dengan naskah (fitur, app, backend, database)", () => {
    const m = tabelBaris(blok);
    expect(m[0]).toEqual(["Fitur", "Di app", "Di backend", "Di database"]);
    expect(naskahTabel).toHaveLength(7);
    expect(m.slice(1)).toHaveLength(7);
    expect(m.slice(1)).toEqual(naskahTabel.map((r) => r.slice(0, 4)));
    expect(tabelBaris(bagian2)[0]).toEqual(["Fitur", "Di app", "Di backend", "Di database", "Konsep yang akan dibutuhkan"]);
  });
  test("tim: lima tim produk dan tiga tim fungsi, 28 orang, dari naskah dan widget", () => {
    expect(blok).toContain("Tim yang mengerjakannya adalah lima tim produk dan tiga tim fungsi, 28 orang, seperti di [[t5-prd]] (Asumsi cerita).");
    const tim = (zonaMentah as { tim: { id: string; orang: number }[] }).tim;
    expect(tim).toHaveLength(8);
    expect(tim.reduce((n, t) => n + t.orang, 0)).toBe(28);
    expect(4 * 6 + 2 * 2).toBe(28);
    expect(naskah).toContain("5 tim produk dan 3 tim fungsi");
    expect(prd51).toContain("Isinya lima tim produk (Pembayaran, Ledger dan Tabungan, Merchant, Akun, Notifikasi) dan tiga tim fungsi (Platform, SRE, Security).");
  });
  test("delapan tabel baru dan kolom di tabel diturunkan dari skema.txt; posting dipartisi per bulan", () => {
    const baru = ["snapshot_saldo", "arsip_partisi", "ringkasan_merchant_harian", "jadwal_cicilan", "angsuran", "pengumuman", "mitra_pos", "sakelar"];
    const komentar = skema.find((b) => b.startsWith("# jenis p = tabel berpartisi"))!;
    expect(komentar).toContain("22 tabel Tahap 4 + 8 baru (snapshot_saldo, arsip_partisi,");
    expect(skema.join("\n")).toContain("ringkasan_merchant_harian, jadwal_cicilan, angsuran, pengumuman, mitra_pos, sakelar)");
    const daftar = baru.map((t) => `\`${t}\``);
    const kalimat = `Delapan tabel baru adalah ${daftar.slice(0, 7).join(", ")}, dan ${daftar[7]}.`;
    expect(blok).toContain(kalimat);
    for (const t of baru) expect(skema.some((b) => b.startsWith(`${t} |`) || b.startsWith(` ${t}`) || b.startsWith(t)), t).toBe(true);
    // Nama dalam tanda kutip balik di tabel: tiap tabel dan kolom ada di rekaman skema.
    const nama = [...tabelBaris(blok).slice(1).flatMap((r) => r[3]!.match(/`[^`]+`/g) ?? [])].map((x) => x.slice(1, -1));
    expect(nama).toEqual(["ringkasan_merchant_harian", "posting", "pengumuman", "jadwal_cicilan", "angsuran", "mitra_pos", "akun.mitra_pos_id", "sakelar"]);
    const semua = skema.join("\n");
    for (const n of nama) {
      if (n === "akun.mitra_pos_id") expect(semua).toContain("akun | kolom baru mitra_pos_id | ya");
      else expect(semua, n).toContain(n);
    }
    const c = skema.slice(skema.findIndex((b) => b.startsWith("# --- C.")));
    expect(c.join("\n")).toContain("RANGE (dibuat)");
    expect(blok).toContain("tabel `posting` dipartisi per bulan di sana.");
    expect(skema.find((b) => b.startsWith("# --- C."))).toContain("posting dipartisi per bulan menurut dibuat");
  });
  test("Snippet bagian F: rentang baris diturunkan dari rekaman, dan judul menyebut bagian yang kutipannya memuat penanda", () => {
    const nomor = (cari: (b: string) => boolean): number => skema.findIndex(cari) + 1;
    const f = nomor((b) => b.startsWith("# --- F. "));
    const ins = nomor((b) => b.startsWith("t5_notifikasi: INSERT INTO t5_ledger.posting"));
    const app = nomor((b) => b.startsWith("t5_app: SELECT count(*) FROM akun a JOIN buku b"));
    expect([f, ins, app]).toEqual([187, 190, 207]);
    expect(skema[ins]).toContain("SQLSTATE 42501");
    expect(skema[app]).toBe("t5_app: UPDATE posting SET jumlah = jumlah");
    expect(skema[app + 1]).toContain("permission denied for table posting");
    expect(skema[f - 1]!.startsWith("# --- F.")).toBe(true);
    const files = `files={["labs/api-t5/output/skema.txt:${f}:${f}", "labs/api-t5/output/skema.txt:${ins}:${ins + 1}", "labs/api-t5/output/skema.txt:${app}:${app + 2}"]}`;
    expect(blok).toContain(`<Snippet ${files} title="Rekaman lab: labs/api-t5/output/skema.txt, bagian F (hak role: notifikasi ditolak menulis posting, proses lab memegang semua role)" />`);
    expect(skema[f - 1]).toContain("t5_app) mewarisi keenam role");
    expect(blok).toContain("Role notifikasi yang mencoba INSERT ke `posting` ditolak dengan kode 42501. Server lab berjalan sebagai role `t5_app`, yang mewarisi keenam role, dan UPDATE ke `posting` tetap ditolak untuknya.");
    expect(skema.join("\n")).toContain("# --- G. Server api-t5 dalam satu proses sebagai t5_app di enam schema");
    expect(blok).toContain("Enam service dan tiga instance tiap service adalah Asumsi. Di lab satu proses memegang keenam role, jadi \"enam service\" dibaca dari schema, tabel, dan hak role:");
    expect(naskah).toContain("Enam service di Kubernetes, tiga instance tiap service");
  });
  test("klaim negatif berlingkup: Tidak dijalankan di halaman ini untuk lima komponen, dan labs/api-t5/output tidak memuat Kubernetes, Kafka, mTLS, atau WAF sebagai rekaman", () => {
    expect(blok).toContain("Di luar nama tabel, isi tabel adalah rencana kerja tim, bukan hasil ukur. Kubernetes, event streaming, mTLS, WAF, dan penyedia push Tidak dijalankan di halaman ini. Tiap halaman konsepnya memuat rekaman bila labnya ada.");
    const folder = path.join(akar, "labs/api-t5/output");
    const semua = fs.readdirSync(folder).filter((f) => f !== "testing.txt").map((f) => baca(`labs/api-t5/output/${f}`)).join("\n");
    expect(semua).not.toMatch(/kubectl|k3d|Kafka|RequireAndVerifyClientCert|Coraza/);
  });
});

// ---- Pertanyaan sebelum kode: tiga hal, versi pertama, tiga pertanyaan, beban ------------------------------------------------
describe("blok Pertanyaan sebelum kode: tiga hal, versi pertama, tiga pertanyaan yang ditanam, dan angka beban", () => {
  const blok = blokMdx("Pertanyaan sebelum kode");
  const daftar = blok.split("\n").filter((b) => /^\d\. /.test(b));
  test("tiga hal: kalimat naskah bagian 3 muncul utuh di halaman, dengan tautan ledger dan Idempotency-Key", () => {
    const naskahDaftar = bagian3.split("\n").filter((b) => /^\d\. /.test(b)).map((b) => b.replace(/ \((?:PROPOSAL|syarat)[^)]*\)\.?$/, "."));
    expect(naskahDaftar).toHaveLength(3);
    expect(daftar).toHaveLength(3);
    expect(polos(daftar[0]!)).toContain(naskahDaftar[0]!.replace("1. ", "").replace("Idempotency-Key.", "Idempotency-Key."));
    expect(polos(daftar[1]!)).toContain("Keputusan yang menentukan uang dibaca dari sumber yang sama dengan yang menggerakkan uang. Replica, ringkasan, cache, dan event hanya untuk dilihat, dan jarak ketertinggalannya diketahui dan disebut.");
    expect(polos(daftar[2]!)).toContain("Pekerjaan yang lebih panjang dari satu proses, satu hari, atau satu mesin tetap benar bila dihentikan dan diulang di titik mana pun. Contohnya batch, failover, dan deploy.");
    expect(naskahDaftar[1]).toContain("Replica, ringkasan, cache, dan event hanya untuk dilihat, dan jarak ketertinggalannya diketahui dan disebut.");
    expect(naskahDaftar[2]).toContain("Contohnya batch, failover, dan deploy.");
    expect(daftar[0]).toContain("[[t2-ledger|ledger]]");
    expect(daftar[0]).toContain("[[t2-idempotency|Idempotency-Key]]");
    expect(dari("t2-ledger").tahap).toBe(2);
    expect(dari("t2-idempotency").tahap).toBe(2);
    expect(blok).toContain("Tiga hal harus selalu benar di Tahap 5, dan tiap hal punya pemiliknya:");
  });
  test("pemilik tiap hal: Pak Hadi sejak PRD v2, Pak Hadi di PRD v5 dan aturan 2 ADR 45, Dewi dan PRD v5 (RPO nol, RTO 15 menit)", () => {
    expect(daftar[0]).toContain("Ini syarat Pak Hadi sejak PRD v2.");
    expect(prd51).toContain('| v2 | "Setiap rupiah di saldo siapa pun harus bisa ditelusuri ke kejadian yang membuatnya, tanpa tabel koreksi tangan." |');
    expect(naskah).toContain("(PROPOSAL; syarat Pak Hadi sejak Tahap 2)");
    expect(daftar[1]).toContain("Ini syarat Pak Hadi di PRD v5 ([[t5-prd]]) dan aturan 2 di [[t4-adr-45|ADR 45]].");
    expect(prd51).toContain('"Angka yang saya tanda tangani harus dibaca dari catatan yang sama dengan yang menggerakkan uang. Salinan boleh untuk dilihat, bukan untuk memutuskan."');
    expect(dari("t4-adr-45").adr).toContain(45);
    const enam = bagian(adr45, "**Keputusan: opsi C.** Enam aturan:", "**Kalau login sosial");
    expect(enam).toContain("2. Uang tidak dibaca dari salinan di luar primary. Saldo yang menentukan bayar dibaca dari `buku` di dalam transaction ([[t2-race-lock]]). Read replica, bila nanti dipasang, hanya untuk laporan.");
    expect(daftar[2]).toContain("Ini syarat Dewi dan PRD v5: RPO nol dan RTO 15 menit.");
    expect(naskah).toContain("(syarat Dewi dan PRD v5: RPO nol dan RTO 15 menit)");
    expect(prd51).toContain("RPO nol");
    expect(prd51).toContain("pulih dalam 15 menit (RTO)");
  });
  test("versi pertama minggu 2: kalimat naskah muncul utuh; staging 200 merchant dan adegan berlabel Ilustrasi", () => {
    const versi = bagian(bagian3, "**Versi pertama (minggu 2).**", "| Kejadian |").replace(/\n+/g, " ");
    for (const k of [
      "Wulan menulis laporan real-time sebagai satu endpoint.",
      "Endpoint itu menjumlah posting hari ini milik merchant dari primary yang sama dengan pembayaran, dan app memanggilnya tiap 30 detik.",
      "Raka memakai endpoint riwayat yang sama untuk layar \"Berhasil\".",
      "Hendra menulis cicilan sebagai job malam yang menagih semua jadwal jatuh tempo, lalu menandai angsuran lunas.",
      "Nadia mengusulkan event streaming untuk semuanya.",
      "Di staging dengan 200 merchant tiap bagian tampak cukup",
    ]) {
      expect(versi, `naskah: ${k}`).toContain(k);
      expect(blok, `halaman: ${k}`).toContain(k);
    }
    expect(blok).toContain("**Versi pertama (minggu 2).** Wulan menulis laporan real-time");
    expect(blok).toContain("tampak cukup (adegan dan angka cerita: Ilustrasi).");
    expect(blok).toContain("Cara pertama itu memperlakukan semua salinan seperti sumber.");
    expect(naskah).toContain("Cara pertama yang ditulis tim memperlakukan semua salinan seperti sumber");
  });
  test("tiga pertanyaan yang ditanam: kalimat naskah, dan pemetaan ke M40, M41 dan M43, M42 dari daftar fitur pemicu dan registry", () => {
    const tanam = barisAwal(bagian3, "Halaman ini menanam tiga pertanyaan.");
    expect(tanam).toContain("Halaman ini menanam tiga pertanyaan.");
    expect(blok).toContain("Halaman ini juga menanam tiga pertanyaan.");
    for (const k of [
      "Di minggu 2 Wulan bertanya siapa yang melambat bila laporan dan pembayaran membaca database yang sama.",
      "Pak Hadi bertanya angka mana yang ia tanda tangani bila ada dua salinan.",
      "Dewi bertanya apa yang hilang bila database utama mati pukul 02.10.",
    ]) {
      expect(tanam, `naskah: ${k}`).toContain(k);
      expect(blok, `halaman: ${k}`).toContain(k);
    }
    expect(bagian3).toContain("Jawabannya ada di M40 sampai M43.");
    expect(blok).toContain("Jawabannya ada di [[t5-m40]] sampai [[t5-m43]]. Pertanyaan Wulan dijawab di [[t5-m40]]. Pertanyaan Pak Hadi dijawab di [[t5-m41]] dan [[t5-m43]], dan pertanyaan Dewi di [[t5-m42]].");
    // Pak Hadi: masalah yang daftar fitur pemicunya menyebut syarat Pak Hadi.
    const pemicu = bagian4.split("\n").filter((b) => /^- M4[0-3]: /.test(b));
    expect(pemicu).toHaveLength(4);
    const denganPakHadi = pemicu.filter((b) => b.includes("syarat Pak Hadi")).map((b) => b.slice(2, 5));
    expect(denganPakHadi).toEqual(["M41", "M43"]);
    for (const [id, m] of [["t5-m40", "M40"], ["t5-m41", "M41"], ["t5-m42", "M42"], ["t5-m43", "M43"]] as const) {
      expect(dari(id).judul.startsWith(`${m}: `), id).toBe(true);
      expect(dari(id).jenis).toBe("masalah");
    }
    expect(dari("t5-m40").judul).toContain("melambat");
    expect(dari("t5-m42").judul).toContain("Database utama mati");
    expect([dari("t5-m41").nomor, dari("t5-m42").nomor, dari("t5-m43").nomor]).toEqual(["5.6", "5.8", "5.10"]);
  });
  const a4 = cerita.tahap[3]!.asumsi;
  const a5 = cerita.tahap[4]!.asumsi;
  const aktif = (a5.user * a5.aktif) / 100;
  const puncak = ((aktif * a5.req) / 86400) * a5.puncak;
  const puncak4 = (((a4.user * a4.aktif) / 100) * a4.req) / 86400 * a4.puncak;
  const trx = (n: number): number => ((aktif * n) / 86400) * a5.puncak;
  const worker = 4 / 0.3;
  const notif = (n: number): number => ((aktif * n + aktif * 0.25) / 86400) * a5.puncak;
  test("beban: 1.388,9 dan 138,9 dari registry, 69,4 dan 46,3, worker 564% dan 391%, koneksi 180 lawan 97, posting 438 juta dan 292 juta", () => {
    expect(a5.trx).toBe(2);
    expect(naskah).toContain("tahap[4].asumsi.trx` bernilai 2");
    expect(naskah).toContain("Transaksi uang 3 per user aktif per hari mengikuti naskah Tahap 2 sampai 4");
    expect(naskah).toContain("aktif × 0,25 ÷ 86.400 × puncak");
    const rataRata = (aktif * a5.req) / 86400;
    expect(fmt(puncak, 1)).toBe("1.388,9".replace(".", ""));
    expect(`${titik(Math.floor(puncak))},${Math.round((puncak % 1) * 10)}`).toBe("1.388,9");
    expect(fmt(rataRata, 1)).toBe("138,9");
    expect(fmt(puncak4, 1)).toBe("138,9");
    expect(fmt(puncak / puncak4, 0)).toBe("10");
    expect([fmt(trx(3), 1), fmt(trx(2), 1)]).toEqual(["69,4", "46,3"]);
    expect([bulat(notif(3) / worker * 100), bulat(notif(2) / worker * 100)]).toEqual([564, 391]);
    expect(worker.toFixed(2)).toBe("13.33");
    const koneksi = barisAwal(bagianBeban, "| Koneksi database");
    expect(koneksi).toContain("6 × 3 × 10 = 180 terpasang; tersedia 100 − 3 = 97");
    expect([Z.service.length * 3 * 10, 100 - 3]).toEqual([180, 97]);
    const posting = (n: number): number => aktif * n * 2 * 365;
    expect([posting(3), posting(a5.trx)]).toEqual([438_000_000, 292_000_000]);
    expect(barisAwal(bagianBeban, "| Data posting")).toContain("438 juta");
    expect(blok).toContain("Dasar hitungan beban Tahap 5 adalah 3 transaksi uang per user aktif per hari, seperti Tahap 2 sampai 4. Angka dalam kurung memakai 2 transaksi, angka registry Tahap 5. Semuanya Asumsi, dengan rumus di [[t5-prd]].");
    expect(blok).toContain("Puncak 1.388,9 request per detik naik 10 kali dari 138,9 di Tahap 4. Menurut hitungan di [[t5-prd]], yang melewati batasnya lebih dulu bukan request.");
    expect(blok).toContain("Worker notifikasi terpakai 564% (391%). Koneksi database terpasang 180 lawan 97 tersedia. Pemeriksaan saldo malam tanpa snapshot membaca 438 juta posting (292 juta) setelah satu tahun.");
    expect(blok).toContain("Kapasitas satu primary untuk 69,4 transaksi uang per detik (46,3) belum diukur di lab `api-t5`.");
    // Asal tiap angka ada di halaman 5.1 (rumus) dan naskah (kalimat kesimpulan).
    for (const k of ["564%", "391%", "180 terpasang, 97 tersedia", "438 juta", "292 juta", "1.388,9", "69,4", "46,3", "138,9"]) expect(prd51, k).toContain(k.replace("180 terpasang, 97 tersedia", "180 terpasang"));
    expect(prd51).toContain("97 tersedia");
    expect(naskah).toContain("Yang melewatinya adalah worker 564%, koneksi terpasang 180 lawan 97 tersedia, dan pemeriksaan malam yang membaca 438 juta baris.");
    expect(naskah).toContain("Kedua, tidak ada hitungan di tabel ini yang menunjukkan primary tidak sanggup 69,4 transaksi uang per detik. Itu belum diukur");
    expect(naskah).toContain("438 juta setelah 1 tahun");
  });
  test("beban.txt: 20.833 = ⌊1.388,9 × 15⌋ dijadwalkan dan selesai, batas lab bukan kapasitas produksi, kapasitas satu primary belum diukur di lab", () => {
    const a = beban.slice(beban.findIndex((b) => b.startsWith("# --- A.")));
    expect(Math.floor(1388.9 * 15)).toBe(20833);
    expect(a.join("\n")).toContain("permintaan dijadwalkan: 20833 (= ⌊1388.9 × 15⌋)");
    expect(a.join("\n")).toContain("permintaan selesai: 20833 dari 20833");
    expect(a.join("\n")).toContain("$ ./beban -rps 1388.9 -detik 15 -pengguna 200");
    expect(beban.join("\n")).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    expect(beban.join("\n")).toContain("Kapasitas satu primary untuk 69,4 transaksi uang per detik belum diukur di sini.");
    expect(blok).toContain("Lab itu menjadwalkan 20.833 permintaan dalam 15 detik pada 1.388,9 per detik di satu laptop, dan semuanya selesai (`beban.txt`). Itu batas lab, bukan kapasitas produksi.");
  });
});

// ---- Konsep yang akan dibutuhkan: kolom kelima naskah -> tautan ------------------------------------------------------------
describe("blok Konsep yang akan dibutuhkan: konsep naskah kolom kelima jadi tautan ke halaman konsep di registry", () => {
  const blok = blokMdx("Konsep yang akan dibutuhkan");
  const tabel = tabelBaris(blok);
  const harapan: [string, string, string][][] = [
    [["t5-read-replica", "Read replica", "read replica"], ["t5-rpo-rto", "failover", "failover"], ["t5-service", "service dan Kubernetes", "kubernetes"], ["t5-pooler", "pooler", "pooler"]],
    [["t5-read-replica", "Read replica", "read replica"], ["t5-lag", "read-your-writes", "read-your-writes"], ["t5-partisi", "partisi dan snapshot saldo", "snapshot saldo"]],
    [["t5-fanout", "Fan-out, backpressure, dan event streaming", "backpressure"]],
    [["t5-batch", "Batch harian, saga, dan kunci bisnis", "saga"]],
    [["t5-waf", "Rate limit per mitra dan WAF", "waf"], ["t5-mtls", "mTLS antar service", "mtls"]],
    [["t5-rollout", "Progressive delivery, feature flag, dan GitOps", "progressive delivery"]],
    [["t5-tim-infra", "OpenTelemetry, SLO, dan GitOps", "opentelemetry"], ["t5-onprem", "on-prem lawan cloud", "on-prem"]],
  ];
  test("kepala dua kolom, tujuh baris, kolom fitur sama dengan naskah, dan tiap tautan menunjuk halaman konsep di registry", () => {
    expect(tabel[0]).toEqual(["Fitur", "Konsep"]);
    expect(tabel.slice(1)).toHaveLength(7);
    expect(tabel.slice(1).map((r) => r[0])).toEqual(naskahTabel.map((r) => r[0]));
    tabel.slice(1).forEach((r, i) => {
      const token = [...r[1]!.matchAll(/\[\[([^\]|\\]+)(?:\\?\|([^\]]+))?\]\]/g)].map((m) => [m[1]!, m[2]!]);
      expect(token, `baris ${i + 1}`).toEqual(harapan[i]!.map((h) => [h[0], h[1]]));
      for (const [id, , kunci] of harapan[i]!) {
        const h = dari(id);
        expect(h.tahap, id).toBe(5);
        expect(["konsep", "tim-infra", "adr"], id).toContain(h.jenis);
        expect(h.judul.toLowerCase(), `${id} memuat ${kunci}`).toContain(kunci);
      }
    });
  });
  test("tiap istilah di kolom kelima naskah muncul di baris yang sama (tanpa huruf besar kecil)", () => {
    naskahTabel.forEach((r, i) => {
      const kata = r[4]!.split(/, | dan /).map((x) => x.trim().toLowerCase()).filter(Boolean);
      const teks = polos(tabel[i + 1]![1]!).toLowerCase();
      for (const k of kata) expect(teks, `baris ${i + 1}: ${k}`).toContain(k.replace("rate limit per mitra", "rate limit per mitra"));
    });
  });
  test("pola yang sama muncul lagi: arsip (5.26), cicilan diulang (5.20), sakelar kartu (5.22); halaman berikutnya 5.3", () => {
    expect(blok).toContain("Pola yang sama muncul lagi di arsip yang dipindah ke penyimpanan objek ([[t5-kms]]), di cicilan yang diulang ([[t5-m48]]), dan di sakelar kartu ([[t5-m49]]). Setiap salinan diberi nama, diberi umur, dan dilarang memutuskan.");
    expect(naskah).toContain("Pola yang sama muncul lagi di arsip yang dipindah ke penyimpanan objek (ADR 57), di cicilan yang diulang (M48), dan di sakelar kartu (M49). Setiap salinan diberi nama, diberi umur, dan dilarang memutuskan.");
    expect([dari("t5-kms").adr, dari("t5-m48").nomor, dari("t5-m49").nomor]).toEqual([[57], "5.20", "5.22"]);
    expect(blok).toContain("Halaman berikutnya, [[t5-skema]], membahas tabel yang lahir di Tahap 5 dan pembagiannya ke enam schema.");
    expect(dari("t5-skema").nomor).toBe("5.3");
    expect(dari("t5-skema").prasyarat).toEqual(["t5-fitur-teknis"]);
    expect(blok).toContain("Tabel ini menyebut konsep untuk tiap fitur. Tahap 5 membahasnya satu per satu, saat masalahnya muncul.");
  });
});

// ---- tautan, ID, label, kata, dan klaim negatif ---------------------------------------------------------------------------------
describe("tautan, ID internal, kata per konsep, dan klaim universal", () => {
  test("semua [[ID]] ada di registry; ID halaman Tahap 5 yang dirujuk dan nomor ADR cocok; tanpa nomor halaman tertulis", () => {
    const id = [...badan.matchAll(/\[\[([^\]|\\]+)/g)].map((m) => m[1]!);
    for (const x of new Set(id)) expect(hal.some((h) => h.id === x), x).toBe(true);
    expect(new Set(id.filter((x) => dari(x).tahap === 5))).toEqual(new Set(["t5-prd", "t5-m40", "t5-m41", "t5-m42", "t5-m43", "t5-m48", "t5-m49", "t5-kms", "t5-skema", "t5-read-replica", "t5-rpo-rto", "t5-service", "t5-pooler", "t5-lag", "t5-partisi", "t5-fanout", "t5-batch", "t5-waf", "t5-mtls", "t5-rollout", "t5-tim-infra", "t5-onprem"]));
    expect(new Set(id.filter((x) => dari(x).tahap !== 5))).toEqual(new Set(["t2-ledger", "t2-idempotency", "t4-adr-45", "t2-race-lock"].filter((x) => id.includes(x))));
    expect(badan).not.toMatch(/halaman 5\.\d|\]\(\/tahap-5\//);
    expect(badan).not.toMatch(/\[\[t5-fitur-teknis\]\]/);
    const tanpaTautan = badan.replace(/\[\[[^\]]+\]\]/g, "");
    expect([...new Set([...tanpaTautan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))]).toEqual([]);
    expect([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]))).toEqual([45]);
  });
  test("ID riset, nomor keputusan, nomor PR, dan huruf bagian rekaman tanpa penanda tidak tampil", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(mdx).not.toMatch(/keputusan \d{3,4}|\bPR #?\d{3}\b|#\d{3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d|PR #?\d/);
    // "bagian F" hanya di judul Snippet yang kutipannya memuat penanda bagian F; "bagian 26.2.8" adalah bab dokumentasi.
    const huruf = [...badan.matchAll(/bagian ([A-G])\b/g)].map((m) => m[1]);
    expect(huruf).toEqual(["F"]);
    expect(skema[186]!.startsWith("# --- F. ")).toBe(true);
    expect([...badan.matchAll(/bagian (\d+(?:\.\d+)*)/g)].map((m) => m[1])).toEqual(["26.2.8"]);
    expect(riset5).toContain("bagian 26.2.8");
  });
  test("satu kata per konsep: replica, secret tidak dipakai bergantian dengan replika dan rahasia; service lawan layanan; pembeli", () => {
    const prosa = badan.replace(/`[^`]*`/g, "").replace(/\[[^\]]*\]\([^)]*\)/g, " ");
    expect(prosa).not.toMatch(/\breplika\b/i);
    expect(prosa).not.toMatch(/\blayanan\b|\brahasia\b|\bpelanggan\b|\bpengguna\b/i);
    expect(prosa).not.toMatch(/\bAnda\b|\bkita\b/);
    expect(hitung(prosa.toLowerCase(), "replica")).toBeGreaterThanOrEqual(4);
    // Kata yang dihitung di halaman tetangga: replica (5.1) dan service (5.1); "replika" hanya di nama lab dan kode.
    expect(hitung(prd51.toLowerCase().replace(/`[^`]*`/g, ""), "replika")).toBe(0);
    expect(badan.match(/`t5-replika`/g)).toHaveLength(1);
    expect(hitung(badan, "t5-replika")).toBe(1);
  });
  test("kata penuh dan negatif: tiap kemunculan 'hanya', 'semua', 'setiap', 'selalu', 'tanpa', 'belum' ada di kalimat naskah atau dokumentasi yang dikutip", () => {
    const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !/^\s*(\||<|import )/.test(b)).join("\n").replace(/aman="[^"]*"/g, "");
    const kata = (k: RegExp): number => (prosa.match(k) ?? []).length;
    expect(kata(/\bhanya\b/gi), "hanya").toBe(3);
    for (const k of ["tempat uang bergerak hanya satu", "Uang bergerak hanya lewat ledger", "Replica, ringkasan, cache, dan event hanya untuk dilihat"]) expect(naskah, k).toContain(k);
    expect(kata(/\bsemua\b/gi), "semua").toBe(5);
    for (const k of ["menerima semua tulisan", "menagih semua jadwal jatuh tempo", "memperlakukan semua salinan seperti sumber"]) expect(naskah, k).toContain(k);
    expect(riset5).toContain("all inbound connections are allowed");
    expect(kata(/\bsetiap\b/gi), "setiap").toBe(1);
    expect(naskah).toContain("Setiap salinan diberi nama, diberi umur, dan dilarang memutuskan.");
    expect(kata(/\bselalu\b/gi), "selalu").toBe(1);
    expect(naskah).toContain("Tiga hal harus selalu benar:");
    expect(kata(/\btidak pernah\b/gi), "tidak pernah").toBe(0);
    expect(kata(/\btanpa\b/gi), "tanpa").toBe(2);
    expect(barisAwal(bagianBeban, "| Pemeriksaan saldo malam")).toContain("tanpa snapshot: semua posting sejak awal");
    expect(kata(/\bbelum\b/gi), "belum").toBe(2);
    expect(kata(/\btidak\b/gi), "tidak").toBe(11);
    expect(kata(/\bbukan\b/gi), "bukan").toBe(7);
    expect(kata(/\bbila\b/gi), "bila").toBe(8);
    expect(kata(/\bjika\b/gi), "jika").toBe(0);
    expect(kata(/\bbisa\b/gi), "bisa").toBe(4);
  });
  test("klaim universal 'tidak ada' dan 'belum diukur' berlingkup: di lab api-t5 (folder labs/api-t5/output) dan di halaman ini", () => {
    expect(badan).toContain("belum diukur di lab `api-t5`");
    expect(beban.join("\n")).toContain("belum diukur di sini");
    expect(prd51).toContain("Kapasitas satu server belum pernah diukur.");
    expect(badan).not.toMatch(/tidak ada rekaman|tidak pernah|tidak mungkin|pasti|selalu aman/i);
    expect(badan).toContain("Tidak dijalankan di halaman ini");
  });
  test("tanpa klaim izin atau regulasi dan tanpa merek nyata di prosa; pihak ketiga hanya sebagai sumber dokumentasi", () => {
    expect(badan).not.toMatch(/\bizin\b|\bkepatuhan\b|\bregulasi\b|\bOJK\b|Bank Indonesia|GoPay|\bOVO\b|\bDana\b|Midtrans|Xendit/i);
    // Nama alat teknis hanya di tabel naskah, kalimat Tidak dijalankan, dan tautan sumber dokumentasi (bukan di adegan cerita).
    expect(hitung(badan, "PostgreSQL"), "PostgreSQL").toBe(1);
    expect(hitung(badan, "Kubernetes"), "Kubernetes").toBe(4);
    expect(badan).toContain("[PostgreSQL 17, bagian 26.2.8](");
    expect(badan).toContain("[Kubernetes, Network Policies](");
    expect(naskah).toContain("Enam service di Kubernetes, tiga instance tiap service");
  });
});

// ---- baris riset R5-115 sampai R5-119 -----------------------------------------------------------------------------------------------
describe("baris riset R5-115 sampai R5-119: ada, urut, tanpa ganda, dan memuat kutipan dan hitungan yang dipakai halaman", () => {
  const baris = riset5.split("\n").filter((b) => /^\| R5-11[5-9] \|/.test(b));
  const semua = riset5.split("\n").filter((b) => /^\| R5-\d+ /.test(b));
  const kolom = (n: number): string[] => sel(baris[n]!);
  test("lima baris berurutan, tanpa ID ganda di seluruh berkas, lima kolom, dan R5-114 tetap di depan", () => {
    expect(baris.map((b) => sel(b)[0])).toEqual(["R5-115", "R5-116", "R5-117", "R5-118", "R5-119"]);
    const id = semua.map((b) => sel(b)[0]!);
    expect(new Set(id).size).toBe(id.length);
    const urut = id.map((x) => Number(x.slice(3)));
    const mulai = urut.indexOf(115);
    expect(urut.slice(mulai, mulai + 5)).toEqual([115, 116, 117, 118, 119]);
    expect(urut[mulai - 1]).toBe(114);
    for (const b of baris) expect(sel(b), b.slice(0, 20)).toHaveLength(5);
  });
  test("R5-115 dan R5-116: kutipan Inggris, URL, dan tanggal akses sama dengan halaman; lingkup kalimat halaman", () => {
    const [, , pg, , ] = kolom(0);
    expect(pg).toContain("postgresql.org/docs/17/warm-standby.html");
    expect(pg).toContain("dibuka 2026-11-02");
    expect(pg).toContain("PostgreSQL streaming replication is asynchronous by default. If the primary server crashes then some transactions that were committed may not have been replicated to the standby server, causing data loss.");
    expect(pg).toContain("Streaming replication is asynchronous by default (see Section 26.2.8), in which case there is a small delay between committing a transaction in the primary and the changes becoming visible in the standby.");
    expect(pg).toContain("ia tidak menulis lamanya jeda");
    const [, , k8, , ] = kolom(1);
    expect(k8).toContain("kubernetes.io/docs/concepts/services-networking/network-policies/");
    expect(k8).toContain("dibuka 2026-11-02");
    expect(k8).toContain("By default, a pod is non-isolated for ingress; all inbound connections are allowed.");
    expect(k8).toContain("Creating a NetworkPolicy resource without a controller that implements it will have no effect.");
    expect(k8).toContain("tidak membahas identitas pemanggil");
    expect(badan).toContain("(https://www.postgresql.org/docs/17/warm-standby.html)");
    expect(badan).toContain("(https://kubernetes.io/docs/concepts/services-networking/network-policies/)");
    expect(badan).toContain("halaman tanpa nomor versi, dibuka 2026-11-02");
    expect(promosi[1]).toContain("PostgreSQL 17.11");
  });
  test("R5-117: tiap persamaan dihitung ulang dan ada di baris; masukan terlemah Asumsi", () => {
    const [, , h] = kolom(2);
    const a5 = cerita.tahap[4]!.asumsi;
    const aktif = (a5.user * a5.aktif) / 100;
    const hasil: [string, number, number][] = [
      ["22 + 8 = 30", 22 + 8, 30], ["4 × 6 + 2 × 2 = 28", 4 * 6 + 2 * 2, 28], ["200.000 × 3 × 2 × 365 = 438 juta", aktif * 3 * 2 * 365, 438e6], ["200.000 × 2 × 2 × 365 = 292 juta", aktif * 2 * 2 * 365, 292e6],
      ["6 × 3 × 10 = 180", 6 * 3 * 10, 180], ["100 − 3 = 97", 100 - 3, 97], ["⌊1.388,9 × 15⌋ = 20.833", Math.floor(1388.9 * 15), 20833],
    ];
    for (const [teks, nilai, harus] of hasil) {
      expect(nilai, teks).toBe(harus);
      expect(h, teks).toContain(teks);
    }
    expect(h).toContain("1.388,89");
    expect(h).toContain("69,44");
    expect(h).toContain("46,30");
    expect(h).toContain("= 564%");
    expect(h).toContain("= 391%");
    expect(h).toContain("sel Rusak 9 = 3 (hal 1) + 2 (hal 2) + 4 (hal 3)");
    expect(h).toContain("8 kejadian × 3 hal = 24 sel");
    expect(h).toContain("jadi hasilnya Asumsi");
  });
  test("R5-118 dan R5-119: sumber naskah, halaman, dan rekaman yang dibaca disebut dengan berkas dan bagian; rekaman yang disebut ada", () => {
    const [, , n] = kolom(3);
    for (const b of ["plan/CERITA-TAHAP-5.md", "tahap-4/sengaja-belum.mdx", "tahap-5/prd-v5.mdx"]) expect(n, b).toContain(b);
    const [, , r] = kolom(4);
    for (const b of ["labs/api-t5/output/skema.txt", "labs/api-t5/output/laporan.txt", "labs/api-t5/output/beban.txt", "labs/t5-replika/output/promosi.txt"]) {
      expect(r, b).toContain(b);
      expect(fs.existsSync(path.join(akar, b)), b).toBe(true);
    }
    expect(r).toContain("20.833 dijadwalkan dan selesai, status 200 ×18.718 dan 201 ×2.115");
    expect(beban.join("\n")).toContain("status: 200 x18718, 201 x2115");
    expect(r).toContain("lima jurnal 201 ada di primary lama");
  });
});

// ---- hasil build (hanya bila dist ada): tautan widget, tabel, dan Rantai --------------------------------------------------------
const distHtml = path.join(akar, "situs/dist/tahap-5/fitur-ke-teknis/index.html");
describe.runIf(fs.existsSync(distHtml))("hasil build di dist: tautan rujukan widget, tabel GFM, dan Rantai ringkas", () => {
  const html = fs.readFileSync(distHtml, "utf8");
  const url = (h: H): string => `/${h.path!.replace(/\.md$/, "")}/`;
  test("rujukan widget: halaman yang sudah ada jadi tautan, yang belum ada jadi teks 'segera' tanpa tautan (dari registry)", () => {
    const ids = [...new Set([...Z.zona.flatMap((z) => z.halaman), ...Z.kejadian.map((k) => k.halaman)])];
    const ada = ids.filter((i) => dari(i).ada);
    const belum = ids.filter((i) => !dari(i).ada);
    expect(ada).toContain("t5-m40");
    for (const i of ada) expect(html, `tautan ${i}`).toContain(`href="${url(dari(i))}"`);
    for (const i of belum) {
      expect(html, `tanpa tautan ${i}`).not.toContain(`href="${url(dari(i))}"`);
      expect(html, `segera ${i}`).toContain(`${dari(i).nomor} `);
    }
    expect(html).toContain("rujukan-menyusul");
  });
  test("dua tabel GFM halaman dirender sebagai tabel dengan kepala, dan Rantai ringkas ada di blok Mulai sebelum widget", () => {
    expect(html).toContain("<th>Di backend</th>");
    expect(html).toContain("<th>Konsep</th>");
    expect((html.match(/<th>Di backend<\/th>/g) ?? []).length).toBe(1);
    const tabelHalaman = [...html.matchAll(/<table>.*?<\/table>/gs)].map((m) => m[0]).filter((t) => t.includes("<th>Di backend</th>") || t.includes("<th>Konsep</th>"));
    expect(tabelHalaman).toHaveLength(2);
    expect(tabelHalaman[0]!.match(/<tr>/g)).toHaveLength(8);
    expect(tabelHalaman[1]!.match(/<tr>/g)).toHaveLength(8);
    expect(html.indexOf("rantai--ringkas")).toBeGreaterThan(0);
    expect(html.indexOf("rantai--ringkas")).toBeLessThan(html.indexOf("Peta ini memuat lima zona"));
  });
});

// ---- sidik teks halaman dan nilai Rantai -----------------------------------------------------------------------------------------
describe("sidik teks halaman dan nilai Rantai", () => {
  test("tiap baris isi mdx dan bentuk baris kosongnya sama dengan sidik; mdx tidak punya ekor kosong", () => {
    const baris = mdx.split("\n");
    expect(baris.filter((b) => b.trim())).toEqual(BARIS_MDX);
    expect(baris.map((b) => (b.trim() ? "#" : "-")).join("")).toBe(BENTUK_MDX);
    expect(mdx.endsWith("\n")).toBe(true);
  });
  test("nilai Rantai sama dengan sidik", () => {
    const bentuk = rantai.baris.map((b) => ({ label: b.label, sub: b.sub ?? null, simpul: b.simpul.map((s) => [s.teks, s.sub ?? null, s.nada ?? null]) }));
    expect(bentuk).toEqual(NILAI_RANTAI);
  });
  test("lima baris riset R5-115 sampai R5-119 persis sama dengan sidik", () => {
    expect(riset5.split("\n").filter((b) => /^\| R5-11[5-9] \|/.test(b))).toEqual(BARIS_RISET);
  });
});
