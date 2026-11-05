// Penjaga halaman 6.2 (keputusan 1714 sampai 1716): tabel delapan fitur, tiga hal, versi pertama, tabel tujuh kejadian, tiga
// pertanyaan yang ditanam, tabel angka beban 17 baris, tabel pemicu ADR 60, tabel perubahan skema, tabel pertumbuhan, tabel konsep,
// kalkulator, Rantai, kutipan rekaman t5-gabung, dan klaim negatif di fitur-ke-teknis.mdx (Tahap 6) diturunkan dari naskah Tahap 6
// (bagian 2, 3, 3b), registry cerita.json, halaman Tahap 5 (5.1, 5.3, 5.17, 5.27, 5.29, 5.30, ADR 45), rekaman labs/t5-gabung,
// data ERD Tahap 5, dan baris riset R6-115 sampai R6-119. Semua angka tabel beban dihitung ulang di sini dari masukan naskah
// (pembulatan setengah ke atas), bukan disalin dari halaman. Tahap 6 tanpa lab: tak satu kalimat pun mengutip rekaman Tahap 6.
// BARIS_MDX di fitur-teknis-t6.halaman.nilai.ts adalah sidik teks (tiap baris persis); tes turunan berdiri sendiri tanpa sidik itu,
// supaya mutan yang mengubah makna (bukan hanya huruf) tertangkap oleh sumbernya.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t6-fitur-inti.json";
import kalkulatorMentah from "../../data/widget/t6-fitur-kalkulator.json";
import kalkulator5Mentah from "../../data/widget/t5-m51-kalkulator.json";
import { DataKalkulator } from "../widgets/kalkulator/skema";
import { duaAngka, hitung as hitungKalkulator, siapkan } from "../widgets/kalkulator/logika";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX, NILAI_RANTAI } from "./fitur-teknis-t6.halaman.nilai";

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
const BERKAS = "situs/src/content/docs/tahap-6/fitur-ke-teknis.mdx";
const mdx = baca(BERKAS);
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-6.md");
const riset6 = baca("plan/RISET-TAHAP-6.md");
const prd5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const skema5 = baca("situs/src/content/docs/tahap-5/skema-data.mdx");
const pooler5 = baca("situs/src/content/docs/tahap-5/pooler-koneksi.mdx");
const timInfra5 = baca("situs/src/content/docs/tahap-5/tim-infra.mdx");
const m45 = baca("situs/src/content/docs/tahap-5/m45-pengumuman-satu-juta.mdx");
const m51 = baca("situs/src/content/docs/tahap-5/m51-prd-v6.mdx");
const adr60 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const adr45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const rantai = DataRantai.parse(diagramMentah);
const kalkulator = DataKalkulator.parse(kalkulatorMentah);
const erd5 = JSON.parse(baca("situs/data/erd/tahap-5.json")) as { tabel: unknown[] };
const service5 = JSON.parse(baca("situs/data/erd/service-tahap-5.json")) as { modul: unknown[] };
const rek = (lab: string, berkas: string): string[] => baca(`labs/${lab}/output/${berkas}`).split("\n");
const panggilan = rek("t5-gabung", "panggilan.txt");
const latensi = rek("t5-gabung", "latensi.txt");

interface H { id: string; judul: string; pendek?: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; path?: string; peran?: string[]; bagian?: number | string; lab?: string[]; masalah?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const hitungKata = (s: string, x: string): number => s.split(x).length - 1;
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
// Tabel yang dimulai di baris berawalan `awal` sampai baris kosong pertama.
const tabelDari = (sumber: string, awal: string): string[][] => {
  const i = sumber.indexOf(awal);
  expect(i, `tabel tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  return tabelBaris(sumber.slice(i).split("\n\n")[0]!);
};
const blokMdx = (nama: string): string => {
  const awal = badan.indexOf(`<Blok nama="${nama}"`);
  const akhir = badan.indexOf("</Blok>", awal);
  expect(awal, `blok tidak ada: ${nama}`).toBeGreaterThanOrEqual(0);
  return badan.slice(awal, akhir);
};
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// Pembulatan setengah ke atas seperti pembaca (toFixed membulatkan 8,684999 ke 8,68; keputusan 1138).
const bulat = (n: number, d = 0): number => Math.floor(n * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const fmt = (n: number, d: number): string => {
  const [b, p] = bulat(n, d).toFixed(d).split(".");
  return titik(Number(b)) + (p ? "," + p : "");
};
const gabung = (a: string[]): string => `${a.slice(0, -1).join(", ")}, dan ${a[a.length - 1]}`;
const polos = (s: string): string => s.replace(/\[\[[^\]|\\]+(?:\\?\|([^\]]+))?\]\]/g, "$1").replace(/\*\*/g, "").replace(/`/g, "").replace(/\\\|/g, "|").trim();
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));

const bagian2 = bagian(naskah, "## 2. Dari fitur ke pekerjaan teknis", "\n## 3. ");
const bagian3 = bagian(naskah, "## 3. Inti teknis Tahap 6", "\n### Angka beban Tahap 6");
const bagianBeban = bagian(naskah, "### Angka beban Tahap 6", "\n## 3b.");
const bagian3b = bagian(naskah, "## 3b. Skema data", "\n## 4. ");
const bagianLatar = bagian(naskah, "## Latar: dari satu negara ke tiga", "\n### Tokoh baru");
const naskahFitur = tabelDari(bagian2, "| Fitur |").slice(1);
const naskahKejadian = tabelDari(bagian3, "| Kejadian |").slice(1);
const naskahBeban = tabelDari(bagianBeban, "| Besaran |").slice(1);
const naskahAdr = tabelDari(bagianBeban, "| Butir ADR 60 |").slice(1);
const naskahSkema = tabelDari(bagian3b, "| Tahap 5 | Tahap 6 (Ilustrasi) |").slice(1);
const naskahTumbuh = tabelDari(bagian3b, "| Tahap | User |").slice(1);
const naskahTim = tabelDari(bagianLatar, "| Tim | Orang |").slice(1);

// ---- registry, meta, dan susunan blok ----------------------------------------------------------------------------------
describe("registry, meta, dan susunan blok", () => {
  test("6.2 ada, jenis Fitur → teknis, bagian 2, jalur inti, prasyarat 6.1 dan 5.3, tanpa lab, judul sama dengan peta naskah", () => {
    const h = dari("t6-fitur-teknis");
    expect([h.tahap, h.nomor, h.jenis, h.bagian, h.inti, h.ada, h.prasyarat, h.lab, h.peran]).toEqual([6, "6.2", "fitur", 2, true, true, ["t6-prd", "t5-skema"], undefined, ["mobile", "backend"]]);
    expect(h.path).toBe("tahap-6/fitur-ke-teknis.md");
    expect(h.pendek).toBe("Fitur ke pekerjaan teknis v6");
    expect(h.judul.toLowerCase()).toContain(h.pendek!.toLowerCase());
    expect(`${h.nomor} ${h.pendek}`.length).toBeLessThanOrEqual(35);
    const peta = barisAwal(naskah, "| 6.2 |");
    expect(sel(peta)).toEqual(["6.2", "2, 3, 3b", h.judul, "Fitur → teknis", "★", "–", sel(peta)[6]]);
    expect(sel(peta)[6]).toContain("kalkulator");
    expect(barisAwal(front, "title:")).toBe(`title: "6.2 ${h.judul}"`);
    expect(badan).toMatch(/^<p class="meta">Baca \d+ menit · coba 3 menit · Prasyarat: \[\[t6-prd\]\], \[\[t5-skema\]\] · Jalur inti<\/p>$/m);
    const m = badan.match(/Baca (\d+) menit · coba (\d+) menit/)!;
    expect(Number(m[1]) + Number(m[2])).toBe(h.menit);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const kata = (isi.match(/\S+/g) ?? []).length;
    const baca = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(kata / 200 - baca), `${kata} kata`).toBeLessThanOrEqual(1.5);
  });
  test("tujuh blok sesuai templat Fitur: dua pertama terbuka, lima lain tertutup; widget, Snippet, dan ERD hanya di blok masing-masing", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => [x.nama, x.buka])).toEqual([
      ["Mulai", true], ["Coba dulu: berapa request per detik?", true], ["Dari fitur ke pekerjaan", false], ["Pertanyaan sebelum kode", false],
      ["Angka beban Tahap 6", false], ["Skema: apa yang berubah dari Tahap 5", false], ["Konsep yang akan dibutuhkan", false],
    ]);
    expect(cekTemplat("fitur", b)).toEqual([]);
    expect(hitungKata(badan, "<Blok "), "jumlah <Blok").toBe(7);
    expect(hitungKata(badan, "</Blok>"), "jumlah </Blok>").toBe(7);
    expect(hitungKata(badan, "<Kalkulator "), "jumlah widget").toBe(1);
    expect(blokMdx("Coba dulu: berapa request per detik?")).toContain("<Kalkulator ");
    expect(hitungKata(badan, "<Snippet "), "jumlah Snippet").toBe(1);
    expect(blokMdx("Angka beban Tahap 6")).toContain("<Snippet ");
    expect(hitungKata(badan, "<ErdHalaman "), "jumlah ERD").toBe(1);
    expect(blokMdx("Skema: apa yang berubah dari Tahap 5")).toContain('<ErdHalaman id="erd-t6-awal" tahap={[4, 5]} />');
    expect(hitungKata(badan, "<Rantai "), "jumlah Rantai").toBe(1);
    expect(blokMdx("Mulai")).toContain("<Rantai data={inti} ringkas />");
  });
  test("impor mdx: tiap jalur ada di disk, dan data Rantai, kalkulator, dan registry diimpor dari berkas Tahap 6 yang tepat", () => {
    const impor = [...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => [m[1]!, m[2]!] as const);
    expect(impor.map((x) => x[0])).toEqual(["Blok", "Rantai", "Snippet", "ErdHalaman", "Kalkulator", "dataKalkulator", "cerita", "inti"]);
    for (const [nama, rel] of impor) expect(fs.existsSync(path.join(akar, "situs/src/content/docs/tahap-6", rel)), `${nama}: ${rel}`).toBe(true);
    expect(impor.find((x) => x[0] === "dataKalkulator")![1]).toBe("../../../../data/widget/t6-fitur-kalkulator.json");
    expect(impor.find((x) => x[0] === "inti")![1]).toBe("../../../../data/diagram/t6-fitur-inti.json");
    expect(impor.find((x) => x[0] === "cerita")![1]).toBe("../../../../data/cerita.json");
    expect(impor.find((x) => x[0] === "Kalkulator")![1]).toBe("../../../widgets/kalkulator/Kalkulator.tsx");
    expect(badan).toContain("<Rantai data={inti} ringkas />");
    expect(badan).toContain("data={dataKalkulator}");
  });
  test("tingkat heading: satu '## Inti' di blok Mulai, selebihnya label tebal; frontmatter tanpa heading", () => {
    expect(badan.match(/^#{1,6} .*$/gm)).toEqual(["## Inti"]);
    expect(blokMdx("Mulai")).toContain("\n## Inti\n");
    expect(front).not.toMatch(/^#/m);
  });
  test("deskripsi menyebut empat tokoh yang naskah beri tugas di versi pertama, dan menu pertanyaan sebelum kode", () => {
    const deskripsi = barisAwal(front, "description:");
    const versi = bagian(bagian3, "**Versi pertama (minggu 2).**", "| Kejadian |");
    for (const [nama, kalimat] of [["Arga", "Arga menulis tiga database negara"], ["Kirana", "Kirana mengusulkan satu graf"], ["Nadia", "Nadia mengusulkan aktif-aktif"], ["Bayu", "Bayu memasang portal developer"]] as const) {
      expect(deskripsi, `deskripsi tanpa ${nama}`).toContain(nama);
      expect(versi, `naskah: ${kalimat}`).toContain(kalimat);
    }
    expect(deskripsi).toBe("description: Arga, Kirana, Nadia, dan Bayu menurunkan PRD v6 jadi pekerjaan di app, backend, dan database, lalu menulis pertanyaan pertama Tahap 6 sebelum kode.");
    expect(naskah).toContain("lahir pertanyaan pertama Tahap 6, sebelum satu baris kode");
  });
});

// ---- blok Mulai ---------------------------------------------------------------------------------------------------------
describe("blok Mulai: Inti hasil-dulu dan diagram Rantai t6-fitur-inti.json", () => {
  const mulai = blokMdx("Mulai");
  const paragraf = mulai.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<") && !b.startsWith("#"));
  // Jumlah sel tabel kejadian dari halaman, dan dari naskah: keduanya harus sama.
  const hasil = (b: string[][]): string[][] => b.map((r) => r.slice(1).map((c) => polos(c).split(":")[0]!.replace(/ bila.*$/, "").trim()));
  const sebutPage = hasil(tabelDari(blokMdx("Pertanyaan sebelum kode"), "| Kejadian |").slice(1));
  const sebutNaskah = hasil(naskahKejadian);
  test("susunan: judul Inti, satu kalimat dari naskah, Rantai ringkas, lalu tepat dua paragraf; kalimat Inti tidak lebih dari 175 karakter", () => {
    expect(paragraf).toHaveLength(3);
    const inti = paragraf[0]!;
    expect(inti.length).toBeLessThanOrEqual(175);
    expect(inti).toBe("Aturan pertama Tahap 6: tiap data punya satu rumah, dan tiap rumah punya satu pemilik.");
    expect(naskah).toContain("tiap data punya satu rumah, dan tiap rumah punya satu pemilik");
    expect(mulai.indexOf(inti)).toBeLessThan(mulai.indexOf("<Rantai "));
    expect(mulai.indexOf("<Rantai ")).toBeLessThan(mulai.indexOf(paragraf[1]!));
    expect(paragraf.slice(1).every((p) => !p.startsWith("<"))).toBe(true);
  });
  test("definisi rumah, wilayah, negara, dan Hitungan diberikan di pemakaian pertama; label Asumsi produk ditaut ke /cara-pakai/", () => {
    expect(paragraf[1]).toContain("*Rumah* adalah satu-satunya tempat data boleh disimpan dan diubah.");
    expect(paragraf[1]).toContain("*Wilayah* adalah satu lokasi geografis dengan pusat data, dan *negara* adalah satu pasar dengan satu mata uang.");
    expect(naskah).toContain('"Wilayah" berarti region, yaitu satu lokasi geografis dengan pusat data. "Negara" berarti satu pasar dengan satu mata uang.');
    expect(paragraf[1]).toContain("([Asumsi produk](/cara-pakai/#label-sumber))");
    expect(paragraf[2]).toContain("*Hitungan*, yaitu hasil menghitung yang tertulis di tabel, dan labelnya ikut masukan terlemahnya, di sini Ilustrasi.");
    expect(mulai.indexOf("Asumsi produk")).toBeLessThan(mulai.indexOf("Ilustrasi"));
  });
  test("Rantai: 7 kejadian × 3 hal = 21 sel, 7 Rusak (2 + 1 + 4), dihitung dari tabel naskah DAN tabel halaman", () => {
    for (const t of [sebutNaskah, sebutPage]) {
      expect(t).toHaveLength(7);
      expect(t.flat()).toHaveLength(21);
      expect(t.flat().filter((c) => c === "Rusak")).toHaveLength(7);
      expect([0, 1, 2].map((k) => t.filter((r) => r[k] === "Rusak").length)).toEqual([2, 1, 4]);
      expect(t.every((r) => r.filter((c) => c === "Rusak").length === 1), "satu Rusak per kejadian").toBe(true);
      expect(t.flat().filter((c) => c === "Terjaga")).toHaveLength(4);
      expect(t.flat().filter((c) => c === "Tidak berlaku")).toHaveLength(10);
    }
    expect(sebutPage).toEqual(sebutNaskah);
    const bentuk = rantai.baris.map((b) => ({ label: b.label, sub: b.sub ?? null, simpul: b.simpul.map((s) => [s.teks, s.sub ?? null, s.nada ?? null]) }));
    expect(bentuk[1]!.simpul.map((s) => s[0])).toEqual(["7 kejadian", "21 sel", "7 Rusak"]);
    expect(bentuk[1]!.simpul[2]![1]).toBe("2 + 1 + 4");
    expect(bentuk[0]!.simpul.map((s) => s[0])).toEqual(["Ledger", "Satu rumah", "Satu pemilik"]);
    expect(paragraf[2]).toContain("punya tujuh kejadian dan tiga hal, jadi 21 sel, dan 7 sel Rusak");
    expect(rantai.sumber.jenis).toBe("ilustrasi");
  });
  test("paragraf kedua: versi pertama minggu 2 dan lima pelaku dari naskah; sub simpul Rantai menyebut minggu yang sama", () => {
    expect(paragraf[2]).toContain("Baris bawah Rantai adalah versi pertama minggu 2: Arga, Kirana, Nadia, Bayu, dan tim Pelaporan menulis tiap bagian seolah semua negara, wilayah, dan tim sama.");
    expect(naskah).toContain("**Versi pertama (minggu 2).**");
    expect(paragraf[2]).toContain("Aturan di atas lahir dari sel yang Rusak itu, sebelum satu baris kode ditulis.");
    expect(rantai.baris[1]!.simpul[0]!.sub).toBe("versi pertama, minggu 2");
  });
  test("Rantai: semua teks terkunci literal (id, judul, sumber, label, simpul, sub, nada, catatan); sub baris atas dari kalimat tiga hal di naskah", () => {
    expect(diagramMentah).toEqual({
      id: "t6-fitur-inti",
      judul: "Tiga hal dan tujuh kejadian",
      sumber: { jenis: "ilustrasi", teks: "Ilustrasi: rancangan penulis. Jumlah sel: Hitungan atas Ilustrasi." },
      baris: [
        { label: "Aturan", simpul: [{ teks: "Ledger", sub: "seimbang per mata uang", nada: "system" }, { teks: "Satu rumah", sub: "satu negara, satu wilayah", nada: "system" }, { teks: "Satu pemilik", sub: "service, data, jaga", nada: "system" }], sub: "tiga hal yang selalu benar" },
        { label: "Tabel", simpul: [{ teks: "7 kejadian", sub: "versi pertama, minggu 2", nada: "old" }, { teks: "21 sel", sub: "kejadian × tiga hal" }, { teks: "7 Rusak", sub: "2 + 1 + 4", nada: "warn" }], sub: "dihitung dari tabel" },
      ],
      catatan: "Biru: tiga hal yang harus selalu benar. Abu-abu: versi pertama. Kuning: sel yang Rusak, yaitu kejadian yang melanggar satu hal.",
    });
    const hal3 = bagian(bagian3, "Tiga hal harus selalu benar.", "**Versi pertama");
    expect(hal3).toContain("jurnal seimbang per mata uang");
    expect(hal3).toContain("Data satu negara punya satu rumah, yaitu wilayah negara itu");
    expect(hal3).toContain("Tiap service, data, dan giliran jaga punya satu pemilik");
  });
  test("Rantai ringkas: dua baris pendek, tiga simpul, teks simpul tanpa angka di luar hitungan tabel, tanpa ID internal", () => {
    expect(rantai.baris).toHaveLength(2);
    for (const b of rantai.baris) {
      expect(b.simpul).toHaveLength(3);
      expect(b.label.length).toBeLessThanOrEqual(8);
      for (const s of b.simpul) expect(s.teks.length, s.teks).toBeLessThanOrEqual(14);
    }
    expect(rantai.judul.length).toBeLessThanOrEqual(30);
    expect(rantai.sumber.teks).toBe("Ilustrasi: rancangan penulis. Jumlah sel: Hitungan atas Ilustrasi.");
    expect(rantai.sumber.teks.startsWith("Ilustrasi: ")).toBe(true);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d|PR #?\d/);
  });
});

// ---- blok Coba dulu: kalkulator ------------------------------------------------------------------------------------------
describe("blok Coba dulu: kalkulator, tebakan, dan jawaban yang tidak bocor", () => {
  const coba = blokMdx("Coba dulu: berapa request per detik?");
  const asumsi = cerita.tahap.map((t) => t.asumsi);
  const skenario = siapkan(kalkulator, asumsi as never);
  const puncak = skenario.map((a) => hitungKalkulator(a).puncak);
  const U = angka(bagianBeban.match(/Isinya ([\d.]+) user terdaftar/)![1]!);
  const bagi = [0.6, 0.25, 0.15];
  test("skenario dari registry Tahap 5 dengan ubah: Tahap 6 = 10.000.000 user, Aktif 10% = setengah, Negara pertama = 60% dari user", () => {
    expect(kalkulator.skenario.map((s) => s.label)).toEqual(["Tahap 5", "Tahap 6", "Aktif 10%", "Negara pertama"]);
    expect(kalkulator.skenario.every((s) => s.tahap === 5)).toBe(true);
    expect(kalkulator.awal).toBe(0);
    expect(skenario.map((a) => a.user)).toEqual([1_000_000, U, U, U * bagi[0]!]);
    expect(skenario[2]!.aktif).toBe(skenario[0]!.aktif / 2);
    expect(naskah).toContain("6.000.000, 2.500.000, dan 1.500.000 user (Asumsi cerita)");
    expect(skenario[3]!.user).toBe(6_000_000);
    expect(U * bagi[1]!).toBe(2_500_000);
    expect(U * bagi[2]!).toBe(1_500_000);
    expect(cerita.tahap[4]!.asumsi).toMatchObject({ user: 1_000_000, aktif: 20, req: 60, puncak: 10 });
    expect(bagianBeban).toContain("Pembagian per negara 60%, 25%, dan 15% adalah Asumsi cerita.");
    // Registry Tahap 6 tidak punya asumsi: kalkulator memakai tahap 5 dengan ubah (naskah, Catatan untuk T6-siap).
    expect((cerita.proyeksi[0] as Record<string, unknown>).asumsi).toBeUndefined();
    expect(naskah).toContain('"Negara pertama saja" adalah `ubah: {user: 6000000}`');
  });
  test("puncak tiap skenario dihitung ulang: 1.388,9, 13.888,9, 6.944,4, dan 8.333,3; negara pertama = 6 kali Tahap 5 = 60% Tahap 6", () => {
    expect(puncak.map((p) => fmt(p, 1))).toEqual(["1.388,9", "13.888,9", "6.944,4", "8.333,3"]);
    expect(puncak[3]! / puncak[0]!).toBeCloseTo(6, 9);
    expect(puncak[3]! / puncak[1]!).toBeCloseTo(0.6, 9);
    expect(puncak[2]! / puncak[0]!).toBeCloseTo(5, 9);
    expect(puncak[1]! / puncak[0]!).toBeCloseTo(10, 9);
    expect(m51).toContain("| Request per detik | 1.388,9 | 13.888,9 |");
  });
  test("tebakan: masukan ditulis di pertanyaan, jawaban benar dihitung dari puncak, posisi benar bukan yang pertama atau terakhir", () => {
    const t = kalkulator.tebak;
    expect(t.q).toContain("1.000.000 user");
    expect(t.q).toContain(fmt(puncak[0]!, 1));
    expect(t.q).toContain("6.000.000 dari 10.000.000 user");
    const rasio = puncak[3]! / puncak[0]!;
    expect(t.pilihan[t.jawaban]).toBe(`${Math.round(rasio)} kali`);
    expect(t.pilihan.filter((p) => p === `${Math.round(rasio)} kali`)).toHaveLength(1);
    expect(t.jawaban).toBeGreaterThan(0);
    expect(t.jawaban).toBeLessThan(t.pilihan.length - 1);
    expect(kalkulator.skenario[t.skenario]!.label).toBe("Negara pertama");
    expect(t.alasan).toContain(`${fmt(puncak[3]!, 1)} request per detik`);
    expect(t.alasan).toContain(`60% dari ${fmt(puncak[1]!, 1)}`);
    expect(kalkulator.label.lanjut).toBe("Sekarang pilih skenario “Negara pertama” di atas tabel.");
    expect(kalkulator.label.kesimpulan).toContain("{puncak}");
  });
  test("prosa blok Coba: angka masukan dari naskah, registry, dan logika kalkulator; pembulatan dua angka penting", () => {
    expect(coba).toContain(`*Puncak* adalah laju request di jam paling ramai, yaitu rata-rata harian dikali faktor puncak ${asumsi[4]!.puncak}.`);
    expect(coba).toContain(`Angka ${titik(U)} user dan pembagian ${gabung(bagi.map((x) => `${Math.round(x * 100)}%`))} per negara adalah Asumsi cerita.`);
    expect(coba).toContain("Persen aktif, request per user, dan faktor puncak diteruskan dari Tahap 5 ([[t5-prd]]).");
    expect(dari("t5-prd").tahap).toBe(5);
    expect(cerita.tahap[4]!.no).toBe(5);
    expect(coba).toContain(`Widget membulatkan ke dua angka penting, jadi puncak ${fmt(puncak[0]!, 1)} tampil ${duaAngka(puncak[0]!)}.`);
    expect(duaAngka(puncak[0]!)).toBe("1.400");
    expect(naskah).toContain("Isinya 10.000.000 user terdaftar, aktif 20%, 60 request per user aktif per hari, faktor puncak 10");
  });
  test("teks widget: id dan judul dari 5.29, label sama dengan kalkulator 5.29 kecuali lanjut dan kesimpulan, tebakan dan alasan dari angka yang dihitung ulang", () => {
    expect(kalkulatorMentah.id).toBe("t6-fitur-kalkulator");
    expect(kalkulatorMentah.judul).toBe(kalkulator5Mentah.judul);
    const { lanjut: l6, kesimpulan: k6, ...tetap6 } = kalkulatorMentah.label;
    const { lanjut: l5, kesimpulan: k5, ...tetap5 } = kalkulator5Mentah.label;
    expect(tetap6).toEqual(tetap5);
    expect([l6, l5].every((x) => x.startsWith("Sekarang pilih skenario “"))).toBe(true);
    expect(k5).toBe("Di jam paling ramai, satu request datang kira-kira tiap {jarak}.");
    expect(k6).toBe("Di jam paling ramai, puncaknya kira-kira {puncak} request per detik, satu request tiap {jarak}.");
    expect(kalkulatorMentah.sumber).toEqual({ jenis: "asumsi", teks: `Asumsi naskah dari cerita.json. Angka ${titik(U)} user dan negara pertama ${titik(skenario[3]!.user)} user (${Math.round(bagi[0]! * 100)}%) adalah Asumsi cerita, bukan pengukuran.` });
    const t = kalkulator.tebak;
    const rasio = Math.round(puncak[3]! / puncak[0]!);
    expect(t.q).toBe(`Tahap 5 punya ${titik(skenario[0]!.user)} user dan puncak ${fmt(puncak[0]!, 1)} request per detik. Negara pertama punya ${titik(skenario[3]!.user)} dari ${titik(U)} user di Tahap 6, dan persen aktif, request per user, dan faktor puncaknya sama dengan Tahap 5. Berapa kali puncak Tahap 5 yang ia hasilkan sendiri?`);
    expect(t.pilihan).toEqual([`${Math.round(puncak[1]! / puncak[0]!)} kali`, `${rasio / 2} kali`, `${rasio} kali`, `${String(bagi[0]).replace(".", ",")} kali`]);
    expect(t.alasan).toBe(`Negara pertama punya ${titik(skenario[3]!.user)} user, ${rasio} kali Tahap 5. Persen aktif, request per user, dan faktor puncak tetap, jadi puncaknya ${rasio} kali Tahap 5: ${fmt(puncak[3]!, 1)} request per detik, yaitu ${Math.round(bagi[0]! * 100)}% dari ${fmt(puncak[1]!, 1)} di Tahap 6. Database per negara membagi beban, tetapi negara terbesar tetap ${rasio} kali beban Tahap 5.`);
    expect(Object.keys(kalkulatorMentah).sort()).toEqual(["awal", "id", "judul", "label", "skenario", "sumber", "tebak"]);
  });
  test("jawaban tebakan tidak ada di teks sebelum pembaca memilih: description, aman, prosa di blok Coba, kalimat pembuka, dan Inti", () => {
    const aman = coba.match(/aman="([^"]*)"/)![1]!;
    const sebelum = mdx.slice(0, mdx.indexOf("<Kalkulator ")).replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
    const sesudah = mdx.slice(mdx.indexOf("<Kalkulator ") + 1, mdx.indexOf("</Blok>", mdx.indexOf("<Kalkulator "))).replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
    const bocor = [/\b6 kali\b/, /8\.333/, /8\.300/, /60% dari/, /enam kali/i];
    for (const [nama, teks] of [["description", front], ["aman", aman], ["sebelum widget", sebelum], ["sesudah widget", sesudah]] as const) {
      for (const r of bocor) expect(teks, `${nama}: ${r}`).not.toMatch(r);
    }
    const prosaCoba = coba.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<") && !b.startsWith("aman="));
    expect(prosaCoba).toHaveLength(5);
    expect(aman).toBe("Kalau berhenti di sini, kamu sudah tahu: puncak request per detik dihitung dari lima masukan, dan kalkulator ini tidak menilai apakah database utama sanggup menerimanya.");
  });
  test("noscript memuat jawaban tebakan dan puncak tiap skenario; prosa menyebut Tahap 6 dan Aktif 10% tanpa membuka Negara pertama", () => {
    const ns = coba.match(/<noscript>([\s\S]*?)<\/noscript>/)![1]!;
    expect(ns).toContain(`Jawaban tebakan adalah ${kalkulator.tebak.pilihan[kalkulator.tebak.jawaban]}.`);
    expect(ns).toContain(`Puncak request per detik: Tahap 5 ${fmt(puncak[0]!, 1)}, Tahap 6 ${fmt(puncak[1]!, 1)}, Aktif 10% ${fmt(puncak[2]!, 1)}, dan Negara pertama ${fmt(puncak[3]!, 1)} (Hitungan atas Asumsi).`);
    expect(coba).toContain("Pilih **Tahap 6** dan **Aktif 10%** untuk melihat baris yang berubah: user naik 10 kali, lalu persen aktif turun separuh.");
    expect(coba).toContain("Skenario **Negara pertama** membuka jawaban tebakanmu.");
    expect(coba).toContain("<Kalkulator client:visible data={dataKalkulator} asumsi={cerita.tahap.map((t) => t.asumsi)} />");
  });
  test("lima masukan, label Asumsi ditaut ke /cara-pakai/, primary didefinisikan, dan kapasitas belum terukur dengan lingkup repo dan lab api-t5", () => {
    expect(coba).toContain("Lima masukannya adalah user terdaftar, persen aktif, request per user aktif per hari, faktor puncak, dan 86.400 detik per hari.");
    expect(coba).toContain("Semua masukan Asumsi ([Label sumber](/cara-pakai/#label-sumber)).");
    expect(coba).toContain("satu primary, yaitu database utama yang menerima semua tulisan");
    expect(prd5).toContain("satu primary, yaitu database utama yang menerima semua tulisan");
    expect(coba).toContain("Kapasitas itu belum pernah diukur di repo ini: lab `api-t5` hanya memberi batas di satu laptop ([[t5-m51]]).");
    expect(m51).toContain("Kapasitas satu primary belum terukur");
    expect(m51).toContain("satu laptop");
    expect(kalkulator.sumber.jenis).toBe("asumsi");
    expect(kalkulator.sumber.teks).toContain("Asumsi cerita");
  });
});

// ---- blok Dari fitur ke pekerjaan ---------------------------------------------------------------------------------------
describe("blok Dari fitur ke pekerjaan: tabel delapan baris sama dengan naskah bagian 2 dan tim 53 orang dalam 11 tim", () => {
  const blok = blokMdx("Dari fitur ke pekerjaan");
  const tabel = tabelBaris(blok);
  test("kepala empat kolom, delapan baris, dan sel persis sama dengan empat kolom pertama naskah", () => {
    expect(tabel[0]).toEqual(["Fitur", "Di app", "Di backend", "Di database"]);
    const baris = tabel.slice(1);
    expect(baris).toHaveLength(8);
    expect(naskahFitur).toHaveLength(8);
    expect(baris.map((r) => r.map(polos))).toEqual(naskahFitur.map((r) => r.slice(0, 4).map(polos)));
    expect(sel(barisAwal(bagian2, "| Fitur |")).slice(0, 4)).toEqual(tabel[0]);
  });
  test("tim: 53 orang dalam 11 tim dari naskah (38 di delapan tim produk dan 15 di tiga tim fungsi), Asumsi cerita", () => {
    expect(naskahTim).toHaveLength(11);
    const orang = naskahTim.map((r) => Number(r[1]));
    expect(orang.reduce((a, b) => a + b, 0)).toBe(53);
    expect(orang.slice(0, 8).reduce((a, b) => a + b, 0)).toBe(38);
    expect(orang.slice(8).reduce((a, b) => a + b, 0)).toBe(15);
    expect(blok).toContain("Tim yang mengerjakannya berjumlah 53 orang dalam 11 tim, seperti di [[t6-prd]] (Asumsi cerita).");
    expect(tabel[8]![0]).toBe("53 developer, 11 tim");
    expect(naskah).toContain("jadi 53 (Hitungan atas Asumsi cerita)");
  });
  test("kalimat pembuka blok: tabel ditulis sebelum satu baris kode Tahap 6, dan tahap halaman ini adalah 6", () => {
    expect(blok).toContain("Ini tabel yang tim tulis sebelum satu baris kode Tahap 6 ada.");
    expect(dari("t6-fitur-teknis").tahap).toBe(6);
    expect(naskah).toContain("lahir pertanyaan pertama Tahap 6, sebelum satu baris kode");
  });
  test("kolom Di app terbagi 3 + 3 + 2 dihitung dari tabel: tampil atau kirim, rilis, dan tanpa perubahan terlihat", () => {
    const app = tabel.slice(1).map((r) => r[1]!);
    const tanpa = app.filter((c) => c === "Tidak ada perubahan yang terlihat");
    const rilis = app.filter((c) => /pipeline|rilis|paket/i.test(c));
    const tampil = app.filter((c) => !tanpa.includes(c) && !rilis.includes(c));
    expect([tampil.length, rilis.length, tanpa.length]).toEqual([3, 3, 2]);
    expect(blok).toContain("Tiga baris mengubah apa yang app tampilkan atau kirim: mata uang dan bahasa per negara, jumlah dalam unit terkecil, dan sinyal perangkat.");
    expect(blok).toContain("Tiga baris lain mengubah cara app dirilis: pipeline dari template, rilis bertahap, dan paket per tim. Dua baris sisanya tidak mengubah app yang terlihat.");
    expect(tampil).toEqual(["Satu app, mata uang dan bahasa per negara", "Jumlah dalam unit terkecil, tampil sesuai mata uang", "Sinyal perangkat dikirim app"]);
  });
  test("isi tabel adalah rencana (Asumsi cerita); Tahap 6 tanpa lab; unit terkecil dan eksponen rupiah 0 adalah Asumsi desain", () => {
    expect(blok).toContain("Isi tabel adalah rencana kerja tim (Asumsi cerita), bukan hasil ukur. Tahap 6 tanpa lab, jadi halaman ini tidak menjalankan satu pun isi tabel.");
    expect(blok).toContain("Rupiah memakai eksponen 0, jadi Rp100.000 tetap bilangan bulat 100000 di ledger (Asumsi desain).");
    expect(naskah).toContain("rupiah memakai eksponen 0, Asumsi desain");
    expect(blok).toContain("Konversi bentuk hanya terjadi di batas dengan pihak luar, dan [[t6-m56|M56]] membahasnya.");
    expect(naskah).toContain("mengonversi hanya di batas dengan pihak luar yang meminta bentuk lain");
    expect(fs.existsSync(path.join(akar, "labs", "t6-fitur"))).toBe(false);
  });
});

// ---- blok Pertanyaan sebelum kode --------------------------------------------------------------------------------------
describe("blok Pertanyaan sebelum kode: tiga hal, versi pertama, tujuh kejadian, dan tiga pertanyaan yang ditanam", () => {
  const blok = blokMdx("Pertanyaan sebelum kode");
  const tabel = tabelDari(blok, "| Kejadian |");
  test("tiga hal: kalimat naskah bagian 3 muncul di halaman; tautan ledger dan ADR 45 aturan 2 dibaca ke halaman ADR 45", () => {
    const hal = bagian(bagian3, "Tiga hal harus selalu benar.", "**Versi pertama");
    for (const k of [
      "Uang bergerak hanya lewat ledger, dan jurnal seimbang per mata uang. Satu jurnal tidak pernah menjumlahkan dua mata uang.",
      "Data satu negara punya satu rumah, yaitu wilayah negara itu dan pasangan yang diizinkan.",
      "Uang tidak dibaca dari salinan di luar primary (ADR 45 aturan 2).",
      "Salinan, ringkasan, dan sinyal hanya untuk dilihat, bukan untuk memutuskan (syarat Pak Hadi di PRD v5), dengan jarak ketertinggalan dan batas wilayah yang disebut.",
      "Tiap service, data, dan giliran jaga punya satu pemilik yang tercatat.",
      "Perubahan oleh pemilik itu lewat jalur yang sama, dan tim lain membaca lewat API atau event, bukan lewat tabel.",
    ]) {
      expect(hal, `naskah: ${k}`).toContain(k);
      // "PRD v5" di naskah adalah tautan [[t5-prd]] di halaman.
      expect(blok.replace(/\[\[t2-ledger\|ledger\]\]/g, "ledger").replace(/\[\[t4-adr-45\|ADR 45\]\]/g, "ADR 45").replace("[[t5-prd]]", "PRD v5"), `halaman: ${k}`).toContain(k);
    }
    expect(blok).toContain("Tiga hal harus selalu benar di Tahap 6. Dua pertama melanjutkan Tahap 2 dan 5, dan yang ketiga baru:");
    expect(blok).toContain("1. Uang bergerak hanya lewat [[t2-ledger|ledger]]");
    expect(blok).toContain("([[t4-adr-45|ADR 45]] aturan 2)");
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(adr45).toContain("**Keputusan: opsi C.** Enam aturan:");
    expect(adr45).toContain("2. Uang tidak dibaca dari salinan di luar primary.");
    expect(prd5).toContain("Angka yang saya tanda tangani harus dibaca dari catatan yang sama dengan yang menggerakkan uang. Salinan boleh untuk dilihat, bukan untuk memutuskan.");
    expect(naskah).toContain("Selisih pembulatan harus punya akun, dan tidak boleh ada saldo yang berubah tanpa kejadian.");
    expect(blok).toContain("Selisih pembulatan masuk akun sendiri, sesuai syarat Pak Hadi di [[t6-prd]].");
  });
  test("tiga hal bernomor 1, 2, dan 3, dan kolom 1, 2, dan 3 di tabel kejadian menunjuk nomor yang sama", () => {
    expect([...blok.matchAll(/^(\d)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(blok).toContain("\n2. Data satu negara punya satu rumah, yaitu wilayah negara itu dan pasangan yang diizinkan.");
    expect(blok).toContain("\n3. Tiap service, data, dan giliran jaga punya satu pemilik yang tercatat.");
    expect(tabel[0]!.slice(1).map((c) => c.slice(0, 3))).toEqual(["1. ", "2. ", "3. "]);
    expect(blok).toContain("Kolom 1, 2, dan 3 adalah tiga hal di atas, bukan nomor halaman.");
    expect(bagian3).toContain("1. Uang bergerak hanya lewat ledger");
    expect(bagian3).toContain("2. Data satu negara punya satu rumah");
    expect(bagian3).toContain("3. Tiap service, data, dan giliran jaga");
  });
  test("wilayah pasangan diberi arti; versi pertama minggu 2: kalimat naskah muncul dan adegan berlabel Ilustrasi", () => {
    expect(blok).toContain("*Wilayah pasangan* adalah wilayah kedua yang menyimpan salinan sinkron data itu bila daftar izin negara mengizinkannya.");
    const versi = bagian(bagian3, "**Versi pertama (minggu 2).**", "| Kejadian |");
    for (const k of [
      "Arga menulis tiga database negara sebagai tiga salinan schema yang sama.",
      "Kirana mengusulkan satu graf akun-perangkat di wilayah pusat.",
      "Nadia mengusulkan aktif-aktif supaya tidak ada failover.",
      "Bayu memasang portal developer dan menganggap platform sudah ada.",
      "Pelaporan membaca langsung tabel tim lain supaya laporan cepat selesai.",
      "Di staging dengan tiga negara kecil tiap bagian tampak cukup.",
    ]) {
      expect(versi, `naskah: ${k}`).toContain(k);
      expect(blok, `halaman: ${k.replace(/\.$/, "")}`).toContain(k.replace(/\.$/, ""));
    }
    expect(blok).toContain("**Versi pertama (minggu 2).** Arga menulis");
    expect(blok).toContain("Di staging dengan tiga negara kecil tiap bagian tampak cukup (adegan dan angka cerita: Ilustrasi).");
  });
  test("tabel tujuh kejadian: kepala dan sel sama dengan naskah, kecuali 'tiga minggu' yang halaman tulis 17 hari mengikuti M52", () => {
    expect(tabel[0]).toEqual(sel(barisAwal(bagian3, "| Kejadian |")));
    const halaman = tabel.slice(1).map((r) => r.map(polos));
    const asli = naskahKejadian.map((r) => r.map(polos));
    expect(halaman).toHaveLength(7);
    const beda = halaman.flatMap((r, i) => r.map((c, k) => [i, k, c, asli[i]![k]!] as const)).filter((x) => x[2] !== x[3]);
    expect(beda).toEqual([[4, 0, "Service baru menunggu template 17 hari", "Service baru menunggu template tiga minggu"]]);
    expect(dari("t6-m52").judul).toContain("17 hari");
    expect(baca("plan/CERITA-TAHAP-6.md")).toContain("template dari Platform baru jadi sesudah 17 hari");
  });
  test("kode M di sel tabel menunjuk halaman yang benar menurut judul registry: M52 sampai M57 dan Keamanan 13", () => {
    const tautan = [...blok.matchAll(/\[\[([^\]|\\]+)\\?\|([^\]]+)\]\]/g)].map((m) => [m[1]!, m[2]!]);
    const dalamTabel = tautan.filter(([id, teks]) => /^(M\d\d|Keamanan 13)$/.test(teks!));
    expect(dalamTabel.map(([id, teks]) => `${teks}=${id}`)).toEqual(["M56=t6-m56", "Keamanan 13=t6-residensi", "M55=t6-m55", "M53=t6-m53", "M52=t6-m52", "M54=t6-m54", "M57=t6-m57", "M56=t6-m56", "Keamanan 13=t6-residensi"]);
    for (const [id, teks] of dalamTabel) expect(dari(id!).judul.startsWith(`${teks}:`), `${teks} → ${id}`).toBe(true);
  });
  test("tiga pertanyaan yang ditanam: kalimat naskah, dan penunjuk ke 6.7, 6.8, dan 6.10 dari registry", () => {
    for (const k of [
      "Halaman ini menanam tiga pertanyaan.",
      "Di minggu 1 Pak Hadi bertanya angka mana yang ia tanda tangani bila satu laporan memuat dua mata uang.",
      "Laras bertanya siapa yang boleh membuka data negara kedua.",
      "Dewi bertanya siapa yang dibangunkan bila pembayaran negara ketiga gagal pukul 03.10.",
      "Jawaban Pak Hadi ada di M56, jawaban Laras di halaman Keamanan 13, dan jawaban Dewi di halaman Tim dan infra.",
    ]) expect(bagian3, `naskah: ${k}`).toContain(k);
    expect(blok).toContain("Halaman ini juga menanam tiga pertanyaan. Di minggu 1 Pak Hadi bertanya angka mana yang ia tanda tangani bila satu laporan memuat dua mata uang. Laras bertanya siapa yang boleh membuka data negara kedua. Dewi bertanya siapa yang dibangunkan bila pembayaran negara ketiga gagal pukul 03.10.");
    expect(blok).toContain("Jawaban Pak Hadi ada di [[t6-m56|M56]], jawaban Laras di [[t6-residensi|Keamanan 13]], dan jawaban Dewi di [[t6-tim-infra|Tim dan infra Tahap 6]].");
    expect([dari("t6-m56").nomor, dari("t6-residensi").nomor, dari("t6-tim-infra").nomor]).toEqual(["6.7", "6.8", "6.10"]);
    expect(dari("t6-m56").judul).toContain("Jurnal tukar");
    expect(dari("t6-residensi").judul.startsWith("Keamanan 13")).toBe(true);
    expect(dari("t6-tim-infra").judul).toContain("giliran jaga");
  });
  test("label penalaran dan Ilustrasi diberi arti; Hitungan sel: 7 Rusak (2, 1, 4), 4 Terjaga, 10 Tidak berlaku; baris skor risiko bersandar pada rekaman Tahap 5", () => {
    expect(blok).toContain("Isi tiap sel adalah *penalaran*, yaitu kesimpulan dari kalimat yang sudah tertulis di halaman ini dan dari dokumentasi, tanpa menjalankan apa pun (Tidak dijalankan).");
    expect(naskah).toContain("Penalaran berarti kesimpulan dari kalimat yang sudah tertulis tanpa menjalankan apa pun");
    expect(blok).toContain("Kejadian di tabel adalah Ilustrasi, yaitu rancangan penulis. Tak satu pun baris direkam di Tahap 6.");
    expect(blok).toContain("Dari 21 sel tabelnya, 7 Rusak: dua di kolom 1, satu di kolom 2, dan empat di kolom 3. Sel yang Terjaga ada 4, dan 10 sel Tidak berlaku.");
    expect(blok).toContain("Baris skor risiko bersandar pada rekaman lab Tahap 5 untuk jumlah panggilan dan batas bawah p95, yaitu waktu jawab yang dilewati 5% transaksi paling lambat.");
    expect(blok).toContain('Kata "tidak punya pemilik" di baris itu tetap penalaran.');
    expect(naskah).toContain("Pengecualiannya baris skor risiko, yang memakai rekaman Tahap 5 `labs/t5-gabung/output/`");
    expect(naskah).toContain("Tidak satu pun baris tabel ini direkam.");
  });
});

// ---- blok Angka beban: 17 baris dihitung ulang --------------------------------------------------------------------------
describe("blok Angka beban Tahap 6: 17 baris dihitung ulang dari masukan naskah dengan pembulatan setengah ke atas", () => {
  const blok = blokMdx("Angka beban Tahap 6");
  const tabel = tabelDari(blok, "| Besaran |");
  const baris = (nama: string): string[] => {
    const r = tabel.slice(1).find((x) => x[0] === nama);
    expect(r, `baris tidak ada: ${nama}`).toBeDefined();
    return r!;
  };
  // Masukan dari naskah (kalimat "Isinya ..." di bagian Angka beban), bukan dari halaman.
  const m = bagianBeban.match(/Isinya ([\d.]+) user terdaftar, aktif (\d+)%, (\d+) request per user aktif per hari, faktor puncak (\d+), dan ([\d.]+) detik per hari/)!;
  const U = angka(m[1]!), AKTIF = Number(m[2]) / 100, REQ = Number(m[3]), PUNCAK = Number(m[4]), D = angka(m[5]!);
  const BAGI = [0.6, 0.25, 0.15];
  const dau = U * AKTIF;
  const pkReq = (dau * REQ) / D * PUNCAK;
  const pkTrx = (n: number): number => (dau * n) / D * PUNCAK;
  const t5 = cerita.tahap[4]!.asumsi as { user: number; aktif: number; req: number; puncak: number; trx: number; upload: number; fileKB: number };
  const dau5 = (t5.user * t5.aktif) / 100;
  const pk5 = (dau5 * t5.req) / D * t5.puncak;
  const TIM = naskahTim.map((r) => Number(r[1])).reduce((a, b) => a + b, 0);
  const NTIM = naskahTim.length;
  test("17 baris, label dan urutan sama dengan naskah; kepala empat kolom; tiap baris empat sel", () => {
    expect(tabel[0]).toEqual(["Besaran", "Rumus", "Masukan", "Hasil"]);
    expect(naskahBeban).toHaveLength(17);
    expect(tabel.slice(1)).toHaveLength(17);
    expect(tabel.slice(1).map((r) => r[0])).toEqual(naskahBeban.map((r) => polos(r[0]!)));
    expect(tabel.slice(1).every((r) => r.length === 4)).toBe(true);
    expect(blok).toContain("Masukan tabel ini semuanya Asumsi: 10.000.000 user terdaftar, aktif 20%, 60 request per user aktif per hari, faktor puncak 10, dan 86.400 detik per hari.");
    expect([U, AKTIF, REQ, PUNCAK, D]).toEqual([10_000_000, 0.2, 60, 10, 86_400]);
    expect(t5).toMatchObject({ user: 1_000_000, aktif: 20, req: 60, puncak: 10, trx: 2 });
  });
  test("kolom Rumus sama dengan naskah (trx ditulis transaksi); masukan yang tidak dihitung ulang di tes lain sama dengan naskah", () => {
    tabel.slice(1).forEach((r, i) => expect(r[1], r[0]).toBe(polos(naskahBeban[i]![1]!).replace(/trx/g, "transaksi")));
    const naskahBaris = (nama: string): string[] => naskahBeban.find((r) => polos(r[0]!) === nama)!;
    for (const nama of ["SLO berantai", "Hilang satu wilayah", "Frekuensi rilis", "Orang per tim"]) expect(polos(baris(nama)[2]!), nama).toBe(polos(naskahBaris(nama)[2]!).replace(/trx/g, "transaksi"));
    const ang = (slo: number): number => (1 - slo) * 43_200;
    expect(baris("SLO berantai")[2]).toBe("4 service di jalur bayar, masing-masing 99,9%, kegagalan independen (Asumsi)");
    expect(baris("SLO berantai")[3]).toContain("0,999^4");
    expect(baris("Hilang satu wilayah")[2]).toBe(`47 menit (Ilustrasi, [[t6-m55\\|M55]]) ÷ ${fmt(ang(0.999), 1)}`);
    expect(naskahBaris("Hilang satu wilayah")[2]).toContain("47 menit (Ilustrasi, M55) ÷ 43,2");
    expect(dari("t6-m55").judul).toContain("47 menit");
  });
  test("tiga atau dua transaksi: dasar 3 dan angka dalam kurung 2 (registry Tahap 5), asal ditaut ke PRD v5; pembulatan dan Asumsi dijelaskan", () => {
    expect(blok).toContain("Dasar hitungan transaksi uang adalah 3 per user aktif per hari, seperti Tahap 2 sampai 5. Angka dalam kurung memakai 2 transaksi, angka registry Tahap 5 ([[t5-prd]]).");
    expect(bagianBeban).toContain("Registry Tahap 5 memakai 2, jadi hasil dengan 2 ditulis di sebelahnya");
    expect(prd5).toContain("3 transaksi");
    expect(blok).toContain("Hasil rumus memakai label masukan terlemahnya, jadi seluruh tabel berlabel Asumsi. Hasil dihitung dari nilai tepat dan dibulatkan setengah ke atas. Mengalikan ulang angka yang sudah dibulatkan bisa selisih 0,1.");
    expect(bagianBeban).toContain("Hasil rumus memakai label masukan terlemahnya, jadi seluruh tabel berlabel Asumsi.");
    expect(fmt(pkTrx(3) * 0.6, 1), "0,6 × 694,4 dari angka dibulatkan = 416,6").toBe("416,7");
    expect(fmt(bulat(pkTrx(3), 1) * 0.6, 1)).toBe("416,6");
  });
  test("User aktif, Request per detik, Transaksi uang, dan Notifikasi uang", () => {
    expect(baris("User aktif")[3]).toBe(`${titik(dau)} per hari; per negara ${gabung(BAGI.map((s) => titik(U * s * AKTIF)))}`);
    expect(baris("User aktif")[2]).toBe(`${titik(U)} × 20%`);
    const r = baris("Request per detik");
    expect(r[2]).toBe(`${titik(dau)} × ${REQ} = ${titik(dau * REQ)} per hari`);
    expect(r[3]).toBe(`${fmt((dau * REQ) / D, 1)} rata-rata dan ${fmt(pkReq, 1)} puncak (Tahap 5: ${fmt(pk5, 1)} puncak). Per negara: ${gabung(BAGI.map((s) => fmt(pkReq * s, 1)))}`);
    expect(pkReq).toBeCloseTo(pk5 * 10, 6);
    expect(fmt((dau * REQ) / D, 1)).toBe(fmt(pk5, 1));
    const t = baris("Transaksi uang");
    expect(t[2]).toBe(`${titik(dau)} × 3 = ${titik(dau * 3)} per hari (2 transaksi: ${titik(dau * 2)})`);
    const lunch = (n: number): number => (dau * n * 0.8) / (90 * 60);
    expect(t[3]).toBe(`${fmt((dau * 3) / D, 1)} rata-rata dan ${fmt(pkTrx(3), 1)} puncak (2 transaksi: ${fmt((dau * 2) / D, 1)} dan ${fmt(pkTrx(2), 1)}). Makan siang, 80% dalam 90 menit: ${fmt(lunch(3), 1)} (2 transaksi: ${fmt(lunch(2), 1)}). Per negara pada 3 transaksi: ${gabung(BAGI.map((s) => fmt(pkTrx(3) * s, 1)))}`);
    const n = baris("Notifikasi uang");
    const notif = (k: number): number => (dau * k + dau * 0.25) / D * PUNCAK;
    expect(n[2]).toBe(`(${titik(dau * 3)} + ${titik(dau)} × 0,25) ÷ ${titik(D)} × ${PUNCAK}`);
    expect(n[3]).toBe(`${fmt(notif(3), 1)} puncak (2 transaksi: ${fmt(notif(2), 1)}), sama dengan [[t5-m51\\|M51]]`);
    expect(m51).toContain(`| Notifikasi uang per detik | 75,2 (52,1) | ${fmt(notif(3), 1)} (${fmt(notif(2), 1)}) |`);
    expect(m51).toContain(`| Transaksi uang per detik | 69,4 (46,3) | ${fmt(pkTrx(3), 1)} (${fmt(pkTrx(2), 1)}) |`);
    expect(m45).toContain("80% notifikasi sehari terjadi dalam 90 menit, yaitu 5.400 detik");
    expect(m51).toContain("0,25 per user aktif per hari");
  });
  test("Data posting, File identitas, dan Latensi antar wilayah", () => {
    const post = (n: number): number => dau * n * 2 * 365;
    const gb = (n: number): number => (post(n) * 250) / 1e9;
    const reg = (n: number, d: number, b: number): number => (d * n * 365 * b) / 1e9;
    const p = baris("Data posting");
    expect(p[2]).toBe(`${titik(dau)} × 3 × 2 × 365 = ${fmt(post(3) / 1e9, 2)} miliar posting; ±250 byte per posting`);
    expect(p[3]).toBe(`${titik(gb(3))} GB per tahun, atau ±${fmt(gb(3) / 1000, 1)} TB (2 transaksi: ${fmt(post(2) / 1e9, 2)} miliar posting dan ${titik(gb(2))} GB). Dengan satu baris 300 byte per transaksi, seperti tabel PRD lama: ${titik(reg(3, dau, 300))} GB (2 transaksi: ${titik(reg(2, dau, 300))} GB). Tahap 5: ${fmt((dau5 * 3 * 2 * 365 * 250) / 1e9, 1)} GB, dan ${fmt(reg(3, dau5, 300), 1)} serta ${fmt(reg(2, dau5, 300), 1)} GB dengan rumus lama`);
    expect(skema5).toContain("| Rumus registry dengan 2 transaksi | 200.000 × 2 × 365 × 300 byte, satu baris per transaksi | ±43,8 GB | Asumsi |");
    expect(skema5).toContain("| Rumus registry dengan 3 transaksi | 200.000 × 3 × 365 × 300 byte, satu baris per transaksi | ±65,7 GB | Asumsi |");
    expect(skema5).toContain("| Rumus ledger dengan 3 transaksi (halaman ini) | 438.000.000 posting × 250 byte | ±109,5 GB | Asumsi |");
    const upload = angka(bagianBeban.match(/(\d[\d.]*) per hari × 500 KB/)![1]!);
    const f = baris("File identitas");
    expect(f[2]).toBe(`${titik(upload)} per hari × ${t5.fileKB} KB`);
    expect(f[3]).toBe(`${titik((upload * t5.fileKB) / 1e6)} GB per hari, ${fmt((upload * t5.fileKB * 365) / 1e9, 1)} TB per tahun (Tahap 5: ${titik((t5.upload * t5.fileKB) / 1e6)} GB dan ${fmt((t5.upload * t5.fileKB * 365) / 1e9, 2)} TB; upload naik ${upload / t5.upload} kali, Asumsi)`);
    const rtt = (km: number): number => Math.round(((2 * km) / 200_000) * 1000);
    const l = baris("Latensi antar wilayah");
    expect(l[2]).toBe("1.000 km dan 3.000 km; ±200.000 km per detik di serat optik (±2/3 kecepatan cahaya, Asumsi)");
    expect(l[3]).toBe(`${rtt(1000)} ms dan ${rtt(3000)} ms, batas bawah fisik tanpa peralatan jaringan`);
    expect(naskah).toContain("±200.000 km per detik di serat (±2/3 kecepatan cahaya, Asumsi)");
  });
  test("RPO aktif-pasif asinkron dan Akun panas: hasil dan persen dihitung ulang, dua transaksi dari nilai tepat", () => {
    const r = baris("RPO aktif-pasif asinkron");
    const hilang = (n: number, jeda: number, bagi = 1): string => titik(pkTrx(n) * jeda * bagi);
    const tepat = (n: number, jeda: number, bagi: number): string => fmt(pkTrx(n) * jeda * bagi, 1);
    expect(r[2]).toBe(`jeda 1 detik dan 5 detik (Asumsi); ${fmt(pkTrx(3), 1)} (2 transaksi: ${fmt(pkTrx(2), 1)})`);
    expect(r[3]).toBe(`${hilang(3, 1)} (${hilang(2, 1)}) dan ${hilang(3, 5)} (${hilang(2, 5)}) transaksi bisa hilang saat failover (Tahap 5 pada jeda 1 detik: ${titik(((dau5 * 3) / D) * t5.puncak)}). Bila semua lewat satu primary, ini batas atas. Negara terbesar (60%): ${tepat(3, 1, 0.6)} (${tepat(2, 1, 0.6)}) dan ${tepat(3, 5, 0.6)} (${tepat(2, 5, 0.6)})`);
    const h3 = pkTrx(3) * 0.05, h2 = pkTrx(2) * 0.05;
    const batas = (rttMs: number): number => 1000 / rttMs;
    const a = baris("Akun panas");
    expect(a[2]).toBe(`satu merchant besar menerima 5% dari puncak transaksi uang seluruh negara (Asumsi cerita): ${fmt(h3, 1)} per detik (2 transaksi: ${fmt(h2, 1)}, nilai tepat ${fmt(h2, 3)})`);
    const pct = (x: number, b: number): string => String(Math.floor((x / b) * 100 + 0.5));
    expect(a[3]).toBe(`Batas ${batas(10)} per detik pada 1.000 km dan ${fmt(batas(30), 1)} pada 3.000 km. Pada 3.000 km: ${fmt(h3, 1)} ÷ ${fmt(batas(30), 1)} = ${pct(h3, batas(30))}% (2 transaksi: ${pct(h2, batas(30))}%); pada 1.000 km ${pct(h3, batas(10))}% (2 transaksi: ${pct(h2, batas(10))}%)`);
    expect(pct(h3, batas(30))).toBe("104");
    expect(pct(h3, batas(10))).toBe("35");
    expect(batas(10)).toBe(100);
  });
  test("klaim lock: komentar kode PostgreSQL 17.11 dikutip dengan lingkup (Tidak dijalankan), batas 1 ÷ RTT per baris tetap [perlu verifikasi], dan R6-115 memuat kutipannya", () => {
    expect(blok).toContain('Baris Akun panas bersandar pada satu komentar kode. Di PostgreSQL 17.11, fungsi `RecordTransactionCommit` memuat satu komentar. Saat commit menunggu replikasi sinkron, transaksi masih tampak berjalan dan `continue to hold locks`, yaitu tetap menahan lock (`src/backend/access/transam/xact.c`, dibuka 2026-11-06, Tidak dijalankan).');
    // Kutipan Inggris ditulis sebagai kode supaya tooltip glosarium tidak menempel pada kata "hold" (arti lain: dana yang ditahan kartu).
    expect(badan).not.toContain("hold locks\"");
    expect(blok).toContain("Bila transaksi berikutnya ke baris yang sama menunggu lock itu, laju satu baris dibatasi 1 ÷ RTT. Batas itu penalaran atas kode dan Asumsi RTT, dan belum diukur [perlu verifikasi].");
    const r115 = riset6.split("\n").find((b) => b.startsWith("| R6-115 |"))!;
    expect(r115).toContain("PostgreSQL 17.11 (tag REL_17_11");
    expect(r115).toContain("`RecordTransactionCommit`");
    expect(r115).toContain("continue to hold locks");
    expect(r115).toContain("dibuka dengan curl 2026-11-06");
    expect(r115).toContain("Kode tidak menyebut baris atau laju per baris");
    expect(naskah).toContain("Lock baris ditahan selama commit menunggu standby: Penalaran [perlu verifikasi]");
    expect(blok).toContain("Standby adalah salinan database yang menerima perubahan dari primary.");
    expect(blok).toContain("Dua istilah di tabel perlu arti dulu. *RTT* (round-trip time) adalah waktu satu pesan pergi dan pulang antara dua tempat. *Akun panas* adalah akun yang menerima banyak transaksi bersamaan, seperti merchant besar.");
    expect(blok.indexOf("Dua istilah di tabel perlu arti dulu")).toBeLessThan(blok.indexOf("| Besaran |"));
  });
  test("Anggaran kegagalan, SLO berantai, Hilang satu wilayah, Giliran jaga, Frekuensi rilis, dan Orang per tim", () => {
    const ang = (slo: number): number => (1 - slo) * 43_200;
    const bulan = dau * 3 * 30;
    const a = baris("Anggaran kegagalan");
    expect(a[2]).toBe("SLO 99,9%, 99,95%, dan 99,99%");
    expect(a[3]).toBe(`${fmt(ang(0.999), 1)}, ${fmt(ang(0.9995), 1)}, dan ${fmt(ang(0.9999), 2)} menit per 30 hari. Transaksi gagal pada 99,9%: 0,001 × ${titik(bulan)} per bulan = ${titik(0.001 * bulan)} (2 transaksi: ${titik(0.001 * dau * 2 * 30)})`);
    expect(timInfra5).toContain("SLO 99,9% per 30 hari memberi 43,2 menit anggaran");
    const ber = 0.999 ** 4;
    const b = baris("SLO berantai");
    expect(b[3]).toBe(`0,999^4 = ${fmt(ber, 4)}, atau ${fmt(ber * 100, 1)}%: ${fmt((1 - ber) * 43_200, 1)} menit per 30 hari, ${fmt(((1 - ber) * 43_200) / 43.2, 2)} kali anggaran satu service`);
    expect(naskah).toContain("0,999^4 = 0,9960, atau 99,6%: 172,5 menit per 30 hari, empat kali anggaran satu service");
    const w = baris("Hilang satu wilayah");
    expect(w[3]).toBe(`${fmt((47 / 43.2) * 100, 1)}% anggaran 30 hari di negara itu (30 menit RTO wilayah: ${fmt((30 / 43.2) * 100, 1)}%)`);
    const g = baris("Giliran jaga");
    expect(g[2]).toBe("2 ÷ 5, 2 ÷ 8, dan 2 ÷ 10; batas 25% (buku SRE Google, bab 11)");
    expect(g[3]).toBe(`${titik((2 / 5) * 100)}%, ${titik((2 / 8) * 100)}%, dan ${titik((2 / 10) * 100)}%, dengan primer dan sekunder dihitung penuh (Asumsi turunan). Rata-rata ${TIM} ÷ ${NTIM} = ${fmt(TIM / NTIM, 1)} orang per tim`);
    const k = baris("Frekuensi rilis");
    expect(k[2]).toBe(`${NTIM} × 4 ÷ 8`);
    expect(k[3]).toBe(`${NTIM * 4} per hari, ${fmt((NTIM * 4) / 8, 1)} per jam (Asumsi cerita)`);
    const o = baris("Orang per tim");
    expect(o[2]).toBe(`${TIM} ÷ ${NTIM}`);
    expect(o[3]).toBe(`${fmt(TIM / NTIM, 1)} (Tahap 5: 28 ÷ 8 = ${fmt(28 / 8, 1)})`);
    expect(prd5).toContain("28 engineer dalam delapan tim");
  });
  test("Koneksi database: λ × W dengan W 0,02 detik dan 97 tersedia dan server pool 60 dibaca ke halaman 5.1 dan 5.17", () => {
    const k = baris("Koneksi database");
    const w = 0.02;
    expect(k[2]).toBe(`${fmt(pkReq, 1)} × 0,02 detik; negara terbesar ${fmt(pkReq * 0.6, 1)} × 0,02; transaksi uang saja ${fmt(pkTrx(3), 1)} × 0,02 (2 transaksi: ${fmt(pkTrx(2), 1)} × 0,02)`);
    expect(k[3]).toBe(`${fmt(pkReq * w, 1)}, ${fmt(pkReq * 0.6 * w, 1)}, dan ${fmt(pkTrx(3) * w, 1)} (2 transaksi: ${fmt(pkTrx(2) * w, 1)}) koneksi tertahan lawan 97 tersedia dan server pool 60 di [[t5-pooler\\|ADR 52]]. Bacaan lewat replica dan koneksi sebenarnya belum terukur`);
    expect(prd5).toContain("× 0,02 detik lama satu request memegang koneksi (Asumsi");
    expect(pooler5).toContain("97 tersedia untuk role biasa (100 − 3, Hitungan atas Asumsi naskah)");
    expect(pooler5).toContain("60 koneksi server");
    expect(dari("t5-pooler").adr).toEqual([52]);
    expect(blok).toContain("W 0,02 detik berasal dari [[t5-prd]], dan 97 koneksi tersedia dari [[t5-pooler]].");
  });
  test("Skor risiko: 6 dan 0 panggilan dari panggilan.txt bagian B, 8,33 ms dan 60 ms dari latensi.txt bagian B, dihitung ulang", () => {
    const s = baris("Skor risiko");
    const enam = Number(panggilan[22]!.match(/: (\d+) pada 400 dari 400 transaksi/)![1]);
    const nol = Number(panggilan[19]!.match(/: (\d+) pada 400 dari 400 transaksi/)![1]);
    expect([nol, enam]).toEqual([0, 6]);
    expect(panggilan[16]!.startsWith("# --- B. ")).toBe(true);
    expect(panggilan[22]).toContain("panggilan per transaksi (dibawa pesan): 6 pada 400 dari 400 transaksi");
    expect(panggilan[19]).toContain("panggilan per transaksi (dibawa pesan): 0 pada 400 dari 400 transaksi");
    expect(panggilan[49]).toBe("per transaksi: 620,14 byte dikirim dan 620,14 byte diterima (6 panggilan)");
    expect(latensi[18]!.startsWith("# --- B. Anggaran 50 ms ---")).toBe(true);
    expect(latensi[19]).toContain("50 ms dibagi 6 panggilan = 8,33 ms per panggilan (Hitungan)");
    expect(latensi[22]).toContain("jeda 10 ms: batas bawah 60 ms");
    expect(latensi[14]).toContain("60 ms");
    expect(`${enam} × 10 = ${enam * 10}`).toBe("6 × 10 = 60");
    expect(s[2]).toBe(`${enam} panggilan per skor lewat rantai tiga proses dan queue (Rekaman lab Tahap 5, \`panggilan.txt\` bagian B) × ${fmt(pkTrx(3), 1)}`);
    expect(s[3]).toBe(`${enam} × ${fmt(pkTrx(3), 1)} = ${fmt(enam * bulat(pkTrx(3), 1), 1)} panggilan per detik (nilai tepat ${fmt(enam * pkTrx(3), 1)}; 2 transaksi: ${enam} × ${fmt(pkTrx(2), 1)} = ${fmt(enam * bulat(pkTrx(2), 1), 1)}, nilai tepat ${fmt(enam * pkTrx(2), 1)}). Anggaran skor 50 ms ÷ ${enam} = ${fmt(50 / enam, 1)} ms per panggilan. Bila tiap panggilan menambah 10 ms, ${enam} × 10 = ${enam * 10} ms`);
    expect(bagianBeban).toContain("6 × 694,4 = 4.166,4 panggilan per detik (nilai tepat 4.166,7)");
  });
  test("kutipan rekaman: satu Snippet dengan dua rentang yang kutipannya memuat penanda bagian B, dan judul menyebut bagian itu; jeda 10 ms adalah jeda buatan", () => {
    const sn = blok.match(/<Snippet files=\{\[([^\]]*)\]\} title="([^"]*)" \/>/)!;
    expect(sn[1]).toBe('"labs/t5-gabung/output/panggilan.txt:17:23", "labs/t5-gabung/output/latensi.txt:19:23"');
    expect(sn[2]).toBe("Rekaman lab Tahap 5: labs/t5-gabung/output/panggilan.txt bagian B, dan latensi.txt bagian B (jeda buatan per panggilan)");
    expect(panggilan[16]).toBe("# --- B. Panggilan jaringan antar proses per transaksi, dihitung ---");
    expect(latensi[18]).toBe("# --- B. Anggaran 50 ms ---");
    expect([...badan.matchAll(/\bbagian ([A-G])\b/g)].map((x) => x[1])).toEqual(["B", "B", "B"]);
    expect(blok).toContain("Rekaman itu menghitung panggilan lewat penghitung di kode dan memeriksa p95 terhadap batas bawah 6 × jeda. Jeda 10 ms adalah Asumsi lab, bukan jaringan antar host dan bukan RTT antar wilayah.");
    expect(blok).toContain("Bentuk lain, satu pemanggil yang memanggil tiga service tanpa queue, Tidak dijalankan di lab. Skor di lab adalah peraga, bukan model risiko.");
    expect(panggilan.join("\n")).toContain("Bentuk lain, mis. satu pemanggil yang memanggil");
    expect(panggilan.join("\n")).toContain("Skor risiko di lab ini peraga, bukan fitur produk dan bukan model risiko.");
    expect(latensi.join("\n")).toContain("Jeda buatan per panggilan (Asumsi: 0, 2, 4, 10 ms; lab tidak mengukur jaringan antar host)");
    expect(baca("labs/t5-gabung/README.md")).toContain("Jeda per panggilan adalah jeda buatan (Asumsi).");
  });
  test("tiga angka dengan dua arti disebut: 1.388,9, 10 ms, dan 50 ms; butir 7 ADR 60 memakai 50 ms dengan arti lain", () => {
    expect(blok).toContain("Tiga angka di tabel punya dua arti, jadi tiap pemakaiannya menyebut artinya. Angka 1.388,9 adalah rata-rata Tahap 6 dan puncak Tahap 5: user naik 10 kali dan faktor puncaknya 10. Angka 10 ms adalah RTT pada 1.000 km di baris Latensi, dan jeda buatan per panggilan di baris Skor risiko. Angka 50 ms adalah anggaran total satu skor, bukan tambahan p95 satu lompatan HTTP antar host di butir 7 tabel berikutnya.");
    expect(adr60).toContain("| 7. gRPC | Tambahan p95 satu lompatan HTTP melewati 50 ms antar host |");
    expect(m51).toContain("Anggaran lompatan 50 ms di ADR 37 lain: tambahan p95 satu panggilan HTTP ke ledger. Angkanya sama, artinya berbeda");
    expect(blok).toContain("Asal masukan dari halaman lain: top-up 0,25 per user aktif per hari dari [[t5-m51|M51]], dan jendela makan siang 80% dalam 90 menit dari [[t5-m45|M45]].");
    expect(blok).toContain("Anggaran skor 50 ms berasal dari [[t5-m51|M51]], dan SLO 99,9% dari [[t5-tim-infra]].");
    expect(m51).toContain("Skor risiko real-time dalam 50 ms (Asumsi naskah)");
  });
  test("tiga kesimpulan sama dengan naskah dan angkanya dari tabel: 30 ms, 33,3, 40%, 99,6%, 416,7 per detik, dan lingkup 'di tabel ini'", () => {
    for (const k of [
      "Pertama, beban 13.888,9 request per detik naik 10 kali, tetapi yang melewati batasnya lebih dulu bukan request.",
      "Yang melewatinya adalah batas yang bergantung pada jarak (30 ms, 33,3 per detik), pada orang (40% jaga), dan pada kegagalan beruntun (99,6%).",
      "Kedua, tidak ada hitungan di tabel ini yang menunjukkan satu primary tidak sanggup 416,7 transaksi uang per detik di negara terbesar.",
      "Itu tidak pernah diukur di repo ini, dan Tahap 6 tidak punya lab untuk mengukurnya.",
      "Ketiga, yang berbahaya adalah **batas yang tidak punya pemilik dan jarak yang tidak dihitung**, bukan banyaknya request.",
    ]) expect(bagianBeban.replace(/\n/g, " "), `naskah: ${k}`).toContain(k);
    expect(blok).toContain("Pertama, beban 13.888,9 request per detik naik 10 kali, tetapi yang melewati batasnya lebih dulu bukan request. Yang melewatinya adalah batas yang bergantung pada jarak (30 ms dan 33,3 per detik), pada orang (40% jaga), dan pada kegagalan beruntun (99,6%).");
    expect(blok).toContain("Kedua, tidak ada hitungan di tabel ini yang menunjukkan satu primary tidak sanggup menulis 416,7 transaksi uang per detik di negara terbesar. Itu tidak pernah diukur di repo ini, dan Tahap 6 tidak punya lab untuk mengukurnya.");
    expect(blok).toContain("Ketiga, yang berbahaya adalah batas yang tidak punya pemilik dan jarak yang tidak dihitung, bukan banyaknya request. Dasarnya sama dengan Tahap 2 sampai 5: Little's Law (L = λ × W) untuk koneksi, dan apa yang tidak diketahui sesudah sesuatu gagal.");
    for (const x of ["30 ms", "33,3", "40%", "99,6%", "416,7"]) expect(baris("Latensi antar wilayah").concat(baris("Akun panas"), baris("Giliran jaga"), baris("SLO berantai"), baris("Transaksi uang")).join(" "), x).toContain(x);
    for (const r of tabel.slice(1)) expect(r.join(" "), `${r[0]}: tak ada pembanding primary`).not.toMatch(/tidak sanggup|tidak menampung|melewati kapasitas/);
  });
});

// ---- tabel pemicu ADR 60 ------------------------------------------------------------------------------------------------
describe("blok Angka beban: tabel pemicu ADR 60 dua belas butir, dibaca ke halaman 5.30", () => {
  const blok = blokMdx("Angka beban Tahap 6");
  const tabel = tabelDari(blok, "| Butir ADR 60 |");
  const ke530 = tabelDari(adr60.slice(adr60.indexOf("| Komponen | Salah saat |")), "| Komponen |").slice(1);
  const halamanAdr = (n: number): string => {
    const h = hal.find((x) => x.adr?.includes(n) && x.tahap === 6);
    expect(h, `ADR ${n} tidak di registry Tahap 6`).toBeDefined();
    return h!.id;
  };
  test("kepala lima kolom, dua belas baris; butir dan pemicu sama dengan tabel di halaman 5.30 (bukan naskah), kolom Tahap 5 menyalin kolom Dibaca", () => {
    expect(tabel[0]).toEqual(["Butir ADR 60", "Pemicu yang ditulis di ADR 60", "Tahap 5", "Tahap 6 (Hitungan atas Asumsi, atau Ilustrasi)", "Dilanjutkan"]);
    expect(ke530).toHaveLength(12);
    expect(tabel.slice(1)).toHaveLength(12);
    tabel.slice(1).forEach((r, i) => {
      expect(r.length).toBe(5);
      expect(r[0], `butir ${i + 1}`).toBe(polos(ke530[i]![0]!));
      expect(polos(r[1]!), `pemicu ${i + 1}`).toBe(polos(ke530[i]![1]!));
      expect(polos(r[2]!), `dibaca ${i + 1}`).toBe(polos(ke530[i]![4]!));
      expect(r[0]!.startsWith(`${i + 1}. `)).toBe(true);
    });
    expect(blok).toContain("Kolom Tahap 5 menyalin kata dari kolom Dibaca di [[t5-adr-60|ADR 60]]: Belum terpenuhi, Belum terukur, Tidak diminta, dan Menunggu PRD v6.");
    expect(dari("t5-adr-60").adr).toEqual([60]);
  });
  test("kolom Tahap 6 sama dengan naskah (dengan satu penambahan di butir 4: definisi sharding 5.30 dan alasan residensi)", () => {
    const asli = naskahAdr.map((r) => polos(r[3]!));
    const halaman = tabel.slice(1).map((r) => polos(r[3]!));
    halaman.forEach((c, i) => {
      if (i === 3) return;
      // Butir 12: halaman menulis kata "Spesifikasi" di depan versi supaya kalimatnya berdiri sendiri.
      expect(c, `butir ${i + 1}`).toBe(i === 11 ? `Spesifikasi ${asli[i]}` : asli[i]);
    });
    expect(halaman[3]).toContain("Belum terukur: negara terbesar 416,7, seluruhnya 694,4.");
    expect(halaman[3]).toContain("Database per negara memenuhi definisi sharding di 5.30 (tiga data store, skema sama, data berbeda, dibagi menurut shard key negara).");
    expect(halaman[3]).toContain("Alasannya residensi, bukan kapasitas, jadi pemicu kapasitas butir ini tidak dibuka");
    expect(adr60).toContain("Tiap shard punya skema sama dan himpunan data sendiri");
    expect(asli[3]).toContain("memenuhi definisi sharding di 5.30 dan glosarium");
    expect(halaman[11]).toContain("Spesifikasi v0.9.0 (terbit 2026-07-29, dicek 2026-11-06) dan flag aktif banyak: satu dari dua syarat");
    expect(riset6.split("\n").find((b) => b.startsWith("| R6-117 |"))).toContain("v0.9.0, terbit 2026-07-29T17:35:02Z");
    expect(naskah).toContain("v0.9.0 (terbit 2026-07-29, dicek 2026-11-06)");
  });
  test("kolom Dilanjutkan: ADR n menunjuk halaman yang registry catat memuat ADR n, dan M atau Keamanan menunjuk judul yang cocok", () => {
    const asli = naskahAdr.map((r) => r[4]!);
    tabel.slice(1).forEach((r, i) => {
      const adr = [...asli[i]!.matchAll(/ADR (\d+)/g)].map((x) => Number(x[1]));
      const tautan = [...r[4]!.matchAll(/\[\[([^\]|\\]+)\\?\|([^\]]+)\]\]/g)].map((x) => [x[1]!, x[2]!] as const);
      expect(tautan.filter((t) => /^ADR \d+$/.test(t[1])).map((t) => t[1]), `butir ${i + 1}`).toEqual(adr.map((n) => `ADR ${n}`));
      for (const [id, teks] of tautan) {
        const m = teks.match(/^ADR (\d+)$/);
        if (m) expect(halamanAdr(Number(m[1])), `${teks}`).toBe(id);
        else expect(dari(id).judul.startsWith(`${teks}:`), teks).toBe(true);
      }
    });
    expect(tabel.slice(1).map((r) => polos(r[4]!))).toEqual(naskahAdr.map((r) => polos(r[4]!)));
  });
  test("hitungan butir: dua terpenuhi di Tahap 6 (1 dan 2), enam belum terukur, tiga tidak diminta, satu belum terpenuhi; Tahap 5 dua belum terpenuhi dan satu menunggu", () => {
    const t5 = ke530.map((r) => r[4]!);
    const idx = (kata: string): number[] => t5.flatMap((c, i) => (c === kata ? [i + 1] : []));
    expect(idx("Belum terukur")).toEqual([3, 4, 5, 7, 8, 9]);
    expect(idx("Tidak diminta")).toEqual([6, 10, 11]);
    expect(idx("Belum terpenuhi")).toEqual([1, 12]);
    expect(idx("Menunggu PRD v6")).toEqual([2]);
    const t6 = tabel.slice(1).map((r) => r[3]!);
    expect(t6.flatMap((c, i) => (/\bTerpenuhi\b|: terpenuhi\b/.test(c) ? [i + 1] : []))).toEqual([1, 2]);
    expect(blok).toContain("Dari dua belas butir, dua terpenuhi dan dikerjakan sebagian. Butir 1 hanya untuk identitas di template (ADR 61, tanpa mesh penuh). Butir 2 hanya untuk aktif-pasif (ADR 64, tanpa aktif-aktif).");
    expect(blok).toContain("Sepuluh butir tetap tidak dikerjakan. Enam belum terukur (butir 3, 4, 5, 7, 8, 9), tiga tidak diminta (butir 6, 10, 11), dan satu belum terpenuhi (butir 12). Di Tahap 5, kolom Dibaca di 5.30 menulis dua belum terpenuhi (butir 1 dan 12), satu menunggu PRD v6 (butir 2), dan sisanya sama. Sepuluh butir itu dibahas ulang dengan pemicunya di [[t6-adr-69]].");
    expect(blok).toContain("Terpenuhi berarti halaman Tahap 6 menulis keadaan yang sama dengan pemicunya, bukan bahwa komponennya terbukti perlu.");
    expect(naskah).toContain("Di Tahap 5, kolom \"Dibaca\" di 5.30 menulis dua belum terpenuhi (butir 1 dan 12), satu menunggu PRD v6 (butir 2), dan sisanya sama.");
  });
});

// ---- blok Skema ---------------------------------------------------------------------------------------------------------
describe("blok Skema: ERD Tahap 5 sebagai keadaan awal, sembilan perubahan Ilustrasi, dan pertumbuhan 1.095 GB", () => {
  const blok = blokMdx("Skema: apa yang berubah dari Tahap 5");
  const t = (awal: string): string[][] => tabelDari(blok, awal);
  test("ERD dibaca dari tahap-5.json (30 tabel, enam service); tidak ada ERD Tahap 6 dan alat erd tidak dijalankan", () => {
    expect(erd5.tabel).toHaveLength(30);
    expect(service5.modul).toHaveLength(6);
    expect(fs.existsSync(path.join(akar, "situs", "data", "erd", "tahap-6.json"))).toBe(false);
    expect(blok).toContain("Tahap 6 tidak membangun skema dari database, jadi tidak ada ERD Tahap 6. ERD di bawah adalah skema akhir Tahap 5, 30 tabel dalam enam schema service, dibaca dari database lab `api-t5` ([[t5-skema]]).");
    expect(skema5).toContain("skema akhir Tahap 5 di lab api-t5 punya 30");
    expect(blok).toContain("Tombol Bandingkan dengan Tahap 4 menambahkan skema Tahap 4 di sebelahnya, dan halaman ini tidak memakainya.");
    expect(bagian3b).toContain("Tahap 6 tidak membangun skema dari database, jadi tidak ada ERD6, dan `tools/erd.py` tidak dijalankan.");
  });
  test("tabel perubahan: kepala, sembilan baris, kolom 1 sampai 3 persis naskah, kolom Masalah menunjuk halaman yang benar, dan 'dua tabel baru' dihitung dari baris", () => {
    const tabel = t("| Tahap 5 | Tahap 6 (Ilustrasi) |");
    expect(tabel[0]).toEqual(["Tahap 5", "Tahap 6 (Ilustrasi)", "Alasan", "Masalah atau syarat"]);
    expect(tabel.slice(1)).toHaveLength(9);
    expect(naskahSkema).toHaveLength(9);
    expect(tabel.slice(1).map((r) => r.slice(0, 3).map(polos))).toEqual(naskahSkema.map((r) => r.slice(0, 3).map(polos)));
    expect(tabel.slice(1).map((r) => polos(r[3]!))).toEqual(naskahSkema.map((r) => polos(r[3]!)));
    for (const r of tabel.slice(1)) {
      for (const x of r[3]!.matchAll(/\[\[([^\]|\\]+)\\?\|([^\]]+)\]\]/g)) {
        const n = x[2]!.match(/^ADR (\d+)$/);
        if (n) expect(dari(x[1]!).adr, x[2]).toContain(Number(n[1]));
        else expect(dari(x[1]!).judul.startsWith(`${x[2]}:`), x[2]).toBe(true);
      }
    }
    const baru = tabel.slice(1).filter((r) => r[0] === "(tidak ada)").map((r) => r[1]!.match(/^`(\w+)`/)![1]);
    expect(baru).toEqual(["kurs", "sinyal_risiko"]);
    expect(blok).toContain("Tabel baru hanya dua, `kurs` dan `sinyal_risiko`.");
    expect(blok).toContain("Semuanya Ilustrasi: tak satu baris pun dicocokkan dengan skema lab.");
    expect(bagian3b).toContain("Semuanya Ilustrasi: tak satu baris pun dicocokkan dengan skema lab.");
  });
  test("pertumbuhan: 4,38 miliar posting × 250 byte = 1.095 GB, ditulis ±1 TB di tabel ini dan ±1,1 TB di blok Angka beban: satu nilai, dua pembulatan", () => {
    const tabel = t("| Tahap | User |");
    expect(tabel[0]).toEqual(["Tahap", "User", "Tabel inti", "Baris terbesar per tahun", "Ukuran per tahun", "Perubahan skema penting"]);
    expect(tabel.slice(1)).toHaveLength(2);
    expect(tabel.slice(1).map((r) => r.map(polos))).toEqual(naskahTumbuh.map((r) => r.map(polos)));
    const dau = 10_000_000 * 0.2;
    const posting = dau * 3 * 2 * 365;
    const gb = (posting * 250) / 1e9;
    expect(gb).toBe(1095);
    expect(tabel[2]![3]).toBe(`\`posting\` ±4,4 miliar (${fmt(posting / 1e9, 2)} miliar)`);
    expect(tabel[2]![4]).toBe(`±1 TB (${titik(gb)} GB)`);
    expect(Math.round(gb / 1000)).toBe(1);
    expect(fmt(gb / 1000, 1)).toBe("1,1");
    const gb5 = (200_000 * 3 * 2 * 365 * 250) / 1e9;
    expect(tabel[1]![4]).toBe(`±110 GB (${fmt(gb5, 1)} GB)`);
    expect(blok).toContain("Tabel ini menulis ukuran Tahap 6 ±1 TB, dan blok Angka beban menulis 1.095 GB atau ±1,1 TB. Itu satu nilai, 1.095 GB, dengan dua pembulatan (Hitungan atas Asumsi).");
    expect(blokMdx("Angka beban Tahap 6")).toContain("1.095 GB per tahun, atau ±1,1 TB");
    expect(skema5).toContain("Tahap 6 menghasilkan 4.380.000.000 posting dan ±1,1 TB, ditulis ±1 TB");
    expect(naskah).toContain("Itu satu nilai dengan dua pembulatan (Hitungan atas Asumsi).");
    expect(blok).toContain("Pertumbuhan database memakai rumus naskah Tahap 2. Posting per tahun = transaksi per hari × 2 × 365, dengan ±250 byte per posting.");
  });
});

// ---- blok Konsep yang akan dibutuhkan ----------------------------------------------------------------------------------
describe("blok Konsep yang akan dibutuhkan: konsep naskah kolom kelima jadi tautan ke halaman Tahap 6 yang membahasnya", () => {
  const blok = blokMdx("Konsep yang akan dibutuhkan");
  const tabel = tabelBaris(blok);
  const kunci: Record<string, RegExp> = {
    "t6-m52": /platform|golden path/i, "t6-m53": /domain|data sebagai produk/i, "t6-m54": /SLO|error budget|chaos/i, "t6-m55": /wilayah|multi-region/i,
    "t6-m56": /mata uang/i, "t6-m57": /biaya|FinOps|skor/i, "t6-residensi": /negara|data per negara/i, "t6-tim-infra": /jaga|DORA|SLO/i,
  };
  test("kepala, delapan baris, kolom fitur sama dengan naskah, tiap tautan menunjuk halaman Tahap 6 yang judulnya cocok dengan konsepnya", () => {
    expect(tabel[0]).toEqual(["Fitur", "Konsep"]);
    expect(tabel.slice(1)).toHaveLength(8);
    expect(tabel.slice(1).map((r) => r[0])).toEqual(naskahFitur.map((r) => polos(r[0]!)));
    const peta = tabel.slice(1).map((r) => [...r[1]!.matchAll(/\[\[([^\]|\\]+)\\?\|([^\]]+)\]\]/g)].map((x) => `${x[2]}=${x[1]}`));
    expect(peta).toEqual([
      ["Database per negara dan residensi data=t6-residensi"],
      ["Ledger multi-mata uang, saga, dan minor unit=t6-m56"],
      ["Residensi data, kunci per wilayah, dan kebijakan sebagai kode=t6-residensi"],
      ["Multi-region aktif-pasif, RPO dan RTO, dan akun panas=t6-m55"],
      ["Fraud sebagai fungsi engineering=t6-residensi", "biaya per transaksi=t6-m57"],
      ["Platform sebagai produk dan golden path=t6-m52", "kepemilikan domain=t6-m53", "FinOps=t6-m57"],
      ["Error budget dan chaos testing=t6-m54", "data mesh sederhana=t6-m53"],
      ["On-call, SLO, dan DORA=t6-tim-infra"],
    ]);
    for (const r of tabel.slice(1)) {
      const t = [...r[1]!.matchAll(/\[\[([^\]|\\]+)\\?\|([^\]]+)\]\]/g)];
      expect(t.length, r[0]).toBeGreaterThan(0);
      for (const x of t) {
        expect(dari(x[1]!).tahap, x[1]).toBe(6);
        expect(`${dari(x[1]!).judul} ${dari(x[1]!).masalah ?? ""}`, `${x[2]} → ${x[1]}`).toMatch(kunci[x[1]!]!);
      }
    }
  });
  test("tiap istilah di label tautan ada di kolom kelima naskah pada baris yang sama (tanpa huruf besar kecil)", () => {
    const naskahKonsep = naskahFitur.map((r) => r[4]!.toLowerCase());
    tabel.slice(1).forEach((r, i) => {
      const label = [...r[1]!.matchAll(/\[\[[^\]|\\]+\\?\|([^\]]+)\]\]/g)].map((x) => x[1]!.toLowerCase());
      const istilah = label.flatMap((l) => l.split(/,| dan /).map((s) => s.trim()).filter(Boolean));
      for (const s of istilah) expect(naskahKonsep[i], `${r[0]}: ${s}`).toContain(s);
    });
    expect(naskahFitur.map((r) => r[4])).toEqual([
      "Database per negara, residensi data", "Ledger multi-mata uang, saga, minor unit", "Residensi data, kunci per wilayah, kebijakan sebagai kode",
      "Multi-region aktif-pasif, RPO dan RTO, akun panas", "Fraud sebagai fungsi engineering, biaya per transaksi", "Platform sebagai produk, golden path, kepemilikan domain, FinOps",
      "Error budget, chaos testing, data mesh sederhana", "On-call, SLO, DORA",
    ]);
  });
  test("penutup: aturan sama di tiap batas, dan halaman berikutnya M52 (6.3) dari registry", () => {
    expect(blok).toContain("Aturannya sama di tiap batas: setiap data diberi rumah, pemilik, dan jarak ketertinggalan, dan salinan tidak boleh memutuskan uang.");
    expect(naskah).toContain("Setiap data diberi rumah, pemilik, dan jarak ketertinggalan, dan tidak ada yang memutuskan uang dari salinan.");
    expect(blok).toContain("Halaman berikutnya, [[t6-m52|M52]], membahas service baru yang menunggu template dari Platform.");
    expect(dari("t6-m52").nomor).toBe("6.3");
    expect(dari("t6-m52").masalah).toContain("Service baru menunggu template dari Platform");
  });
});

// ---- tautan, ID internal, kata per konsep, dan klaim universal -----------------------------------------------------------
describe("tautan, ID internal, kata per konsep, dan klaim universal", () => {
  test("semua [[ID]] ada di registry; himpunan ID yang dirujuk tepat; tanpa nomor halaman tertulis; ADR hanya sebagai label tautan atau di tabel", () => {
    const id = [...badan.matchAll(/\[\[([^\]|\\]+)/g)].map((m) => m[1]!);
    for (const x of new Set(id)) expect(hal.some((h) => h.id === x), x).toBe(true);
    expect([...new Set(id)].sort()).toEqual([
      "t2-ledger", "t4-adr-45", "t5-adr-60", "t5-m45", "t5-m51", "t5-pooler", "t5-prd", "t5-skema", "t5-tim-infra", "t6-adr-69", "t6-m52", "t6-m53", "t6-m54",
      "t6-m55", "t6-m56", "t6-m57", "t6-prd", "t6-residensi", "t6-tim-infra",
    ]);
    expect(badan).not.toMatch(/halaman [56]\.\d|\]\(\/tahap-[56]\//);
    expect(badan).not.toMatch(/\[\[t6-fitur-teknis\]\]|\[\[berikutnya\]\]/);
    const tanpaTautan = polos(badan.replace(/\[\[[^\]]+\]\]/g, "")).replace(/aman="[^"]*"/g, "");
    const adr = [...tanpaTautan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]));
    expect(adr.every((n) => [60, 61, 64].includes(n)), adr.join(",")).toBe(true);
  });
  test("ID riset, nomor keputusan, nomor PR, dan huruf bagian rekaman tanpa penanda tidak tampil", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(mdx).not.toMatch(/keputusan \d{3,4}|\bPR #?\d{3}\b|#\d{3}\b/);
    expect(JSON.stringify(kalkulatorMentah)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d|PR #?\d/);
    expect([...badan.matchAll(/\bbagian (\d+(?:\.\d+)*)/g)].map((m) => m[1])).toEqual([]);
  });
  test("satu kata per konsep: replica (bukan replika), secret, pembeli; wilayah dan negara; golden path; tanpa token, router, client, log, nonce", () => {
    const prosa = badan.split("\n").filter((b) => !/^\s*(<|import )/.test(b)).join("\n").replace(/`[^`]*`/g, "").replace(/\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[\[[^\]]+\]\]/g, " ");
    expect(prosa).not.toMatch(/\breplika\b/i);
    expect(prosa).not.toMatch(/\blayanan\b|\brahasia\b|\bpelanggan\b|\bpengguna\b|\bAnda\b|\bkita\b/i);
    expect(prosa).not.toMatch(/\b(token|router|client|log|nonce)\b/i);
    expect(prosa).not.toMatch(/jalan beraspal/i);
    // "region" muncul hanya di kutipan pemicu ADR 60 butir 2 dan nama butir "Multi-region" di tabel (dijaga tes tabel ADR); prosa memakai "wilayah".
    expect(prosa.split("\n").filter((b) => !b.startsWith("|")).join("\n")).not.toMatch(/\bregion\b/i);
    expect(hitungKata(badan, "region")).toBe(3);
    expect(hitungKata(prosa.toLowerCase(), "replica")).toBeGreaterThanOrEqual(1);
    expect(naskah).toContain('"Replica" berarti salinan database, dan "replika" tidak dipakai untuk pod.');
    expect(naskah).toContain('"Golden path" menggantikan "jalan beraspal" di 5.27');
    // "negara" dan "wilayah" tidak dipakai bergantian dengan "kota" atau "region" sebagai arti yang sama di prosa.
    expect(prosa).not.toMatch(/\bkota\b/i);
  });
  test("kata penuh dan negatif: kalimat yang memuat 'hanya', 'semua', 'setiap', 'selalu', 'tidak pernah', 'tak satu pun', 'belum pernah' terkunci dan berlingkup", () => {
    const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !/^\s*(\||<|import )/.test(b)).join("\n").replace(/aman="[^"]*"/g, "");
    const kalimat = prosa.split("\n").flatMap((b) => b.split(/(?<=[.:])\s+(?=[A-Z*\[])/));
    const penuh = kalimat.filter((k) => /\b(hanya|semua|setiap|selalu|tidak pernah|tak satu pun|belum pernah|seluruh|pasti|tidak mungkin)\b/i.test(k));
    expect(penuh.map((k) => k.replace(/^\d\. /, "").slice(0, 70))).toEqual([
      "Arga, Kirana, Nadia, Bayu, dan tim Pelaporan menulis tiap bagian seolah semua negara, wilayah, dan tim sama.",
      "Semua masukan Asumsi ([Label sumber](/cara-pakai/#label-sumber)).",
      "Kalkulator hanya menghitung request per detik.",
      "Ia tidak menilai apakah satu primary, yaitu database utama yang menerima semua tulisan, sanggup menerimanya.",
      "Kapasitas itu belum pernah diukur di repo ini: lab `api-t5` hanya memberi batas di satu laptop ([[t5-m51]]).",
      "Konversi bentuk hanya terjadi di batas dengan pihak luar, dan [[t6-m56|M56]] membahasnya.",
      "Tiga hal harus selalu benar di Tahap 6.",
      "Uang bergerak hanya lewat [[t2-ledger|ledger]], dan jurnal seimbang per mata uang.",
      "Satu jurnal tidak pernah menjumlahkan dua mata uang.",
      "Salinan, ringkasan, dan sinyal hanya untuk dilihat, bukan untuk memutuskan (syarat Pak Hadi di [[t5-prd]]), dengan jarak ketertinggalan dan batas wilayah yang disebut.",
      "Tak satu pun baris direkam di Tahap 6.",
      "Cara pertama itu memperlakukan semua negara, wilayah, dan tim seperti satu.",
      "Hasil rumus memakai label masukan terlemahnya, jadi seluruh tabel berlabel Asumsi.",
      "Itu tidak pernah diukur di repo ini, dan Tahap 6 tidak punya lab untuk mengukurnya.",
      "Butir 1 hanya untuk identitas di template (ADR 61, tanpa mesh penuh).",
      "Butir 2 hanya untuk aktif-pasif (ADR 64, tanpa aktif-aktif).",
      "Ia hanya keadaan awal.",
      "Tabel baru hanya dua, `kurs` dan `sinyal_risiko`.",
      "Aturannya sama di tiap batas: setiap data diberi rumah, pemilik, dan jarak ketertinggalan, dan salinan tidak boleh memutuskan uang.",
    ].map((k) => k.slice(0, 70)));
    // Sumber tiap klaim: naskah, atau halaman Tahap 5 yang dikutip; lingkup (repo ini, Tahap 6, tabel ini) ada di kalimatnya.
    expect(naskah).toContain("Itu tidak pernah diukur di repo ini, dan Tahap 6 tidak punya lab untuk mengukurnya.");
    expect(naskah).toContain("Tiga hal harus selalu benar.");
    expect(naskah).toContain("Satu jurnal tidak pernah menjumlahkan dua mata uang.");
    expect(m51).toContain("belum pernah diuji");
    expect(prosa).not.toMatch(/\btidak mungkin\b|\bpasti\b|selalu aman|tidak ada rekaman/i);
  });
  test("tanpa klaim izin, lisensi, atau regulasi dan tanpa merek nyata di prosa; PostgreSQL dan Google hanya sebagai sumber yang dikutip", () => {
    const prosa = badan.replace(/\[\[[^\]]+\]\]/g, "");
    expect(prosa).not.toMatch(/\bkepatuhan\b|\bregulasi\b|\blisensi\b|\bOJK\b|Bank Indonesia|GoPay|\bOVO\b|\bDana\b|Midtrans|Xendit|\bhukum\b/i);
    expect(hitungKata(badan, "daftar izin")).toBe(2);
    // PostgreSQL: kalimat kode di blok Angka beban dan kutipan pemicu butir 9 ADR 60 ("Ledger di PostgreSQL tidak menampung tulis").
    expect(hitungKata(badan, "PostgreSQL"), "PostgreSQL").toBe(2);
    expect(adr60).toContain("Ledger di PostgreSQL tidak menampung tulis");
    expect(hitungKata(badan, "SRE Google"), "buku SRE Google").toBe(1);
    expect(naskah).toContain("Aturan per negara adalah Asumsi produk, bukan kutipan hukum.");
  });
});

// ---- struktur tabel dan paragraf ----------------------------------------------------------------------------------------
describe("struktur tabel dan paragraf di mdx", () => {
  test("tiap tabel punya kepala, garis pemisah dengan jumlah kolom sama, dan baris sama lebar; tujuh tabel", () => {
    const baris = badan.split("\n");
    const tabel: string[][] = [];
    let kini: string[] | null = null;
    for (const b of baris) {
      if (b.startsWith("|")) (kini ??= []).push(b);
      else if (kini) { tabel.push(kini); kini = null; }
    }
    if (kini) tabel.push(kini);
    expect(tabel.map((t) => sel(t[0]!).length)).toEqual([4, 4, 4, 5, 4, 6, 2]);
    for (const t of tabel) {
      const n = sel(t[0]!).length;
      expect(sel(t[1]!).length, "garis pemisah").toBe(n);
      expect(t[1]).toMatch(/^\|(---\|)+$/);
      for (const b of t) expect(sel(b).length, b.slice(0, 40)).toBe(n);
    }
    expect(tabel).toHaveLength(7);
  });
  test("tiap blok (prosa, daftar, tabel, tag) dipisah baris kosong, dan paragraf prosa satu baris", () => {
    const baris = badan.split("\n");
    baris.forEach((b, i) => {
      if (b.trim() === "") return;
      const sebelumnya = baris[i - 1] ?? "";
      const tabel = b.startsWith("|") && sebelumnya.startsWith("|");
      const daftar = /^\d\. /.test(b) && /^\d\. /.test(sebelumnya);
      const noscript = sebelumnya.startsWith("<noscript>") || b.startsWith("</noscript>");
      const impor = b.startsWith("import ") && sebelumnya.startsWith("import ");
      if (tabel || daftar || noscript || impor) return;
      expect(sebelumnya.trim(), `baris ${i + 1}: ${b.slice(0, 40)}`).toBe("");
    });
  });
});

// ---- baris riset R6-115 sampai R6-119 -----------------------------------------------------------------------------------
describe("baris riset R6-115 sampai R6-119: ada, urut, tanpa ganda, dan memuat kutipan dan hitungan yang dipakai halaman", () => {
  const semua = riset6.split("\n").filter((b) => /^\| R6-\d+/.test(b));
  const baris = semua.filter((b) => /^\| R6-11[5-9]\b/.test(b));
  const idDari = (b: string): string => b.match(/^\| (R6-\d+)/)![1]!;
  test("lima baris, tanpa ID ganda di seluruh berkas, empat berlima kolom di tabel konsep dan satu di tabel angka, urut naik di tiap tabel", () => {
    expect(baris.map(idDari)).toEqual(["R6-115", "R6-116", "R6-117", "R6-118", "R6-119"]);
    const id = semua.map(idDari);
    expect(new Set(id).size).toBe(id.length);
    for (const b of baris.slice(0, 4)) expect(sel(b), b.slice(0, 20)).toHaveLength(5);
    expect(sel(baris[4]!)).toHaveLength(5);
    const konsep = riset6.split("\n").filter((b) => /^\| R6-\d+ \|/.test(b)).map((b) => Number(idDari(b).slice(3)));
    const i = konsep.indexOf(115);
    expect(konsep.slice(i, i + 4)).toEqual([115, 116, 117, 118]);
    expect(konsep[i - 1]!).toBeLessThan(115);
    expect(konsep.slice(i - 1, i + 4).every((n, k, a) => k === 0 || n > a[k - 1]!)).toBe(true);
    expect(riset6.split("\n").findIndex((b) => b.startsWith("| R6-119 "))).toBeGreaterThan(riset6.split("\n").findIndex((b) => b.startsWith("| R6-38 ")));
  });
  test("R6-115 sampai R6-118 terkunci literal: fakta dari luar repo (kode PostgreSQL, SRE Book, GitHub API) dan rujukan rekaman t5-gabung", () => {
    expect(baris.slice(0, 4)).toEqual([
      "| R6-115 | Lock ditahan selama commit menunggu standby sinkron (6.2, baris Akun panas) | PostgreSQL 17.11 (tag REL_17_11, commit 083ac033), `src/backend/access/transam/xact.c`, fungsi `RecordTransactionCommit` (baris 1304), komentar baris 1536 sampai 1544 sebelum `SyncRepWaitForLSN` (baris 1546): \"Note that at this stage we have marked clog, but still show as running in the procarray and continue to hold locks.\" (raw.githubusercontent.com/postgres/postgres/REL_17_11/src/backend/access/transam/xact.c, teks mentah dibuka dengan curl 2026-11-06). Kode tidak menyebut baris atau laju per baris, jadi batas 1 ÷ RTT per baris adalah penalaran halaman | 6.2: baris Akun panas (Tidak dijalankan untuk komentar kodenya; batas 1 ÷ RTT per baris [perlu verifikasi]) | Menggantikan [perlu verifikasi] R6-35 untuk bagian \"lock ditahan\", dicek 2026-11-06; bagian batas per baris tetap belum terukur |",
      "| R6-116 | On-call: batas 25% dan dua orang jaga (6.2, baris Giliran jaga) | Google SRE Book, bab 11 \"Being On-Call\" (sre.google/sre-book/being-on-call/, teks dibuka dengan curl 2026-11-06): \"of the remainder, no more than 25% can be spent on-call\"; \"Assuming that there are always two people on-call (primary and secondary, with different duties), the minimum number of engineers needed for on-call duty from a single-site team is eight\". Batas 25% ditulis untuk waktu SRE; halaman memakainya untuk semua orang di rotasi sebagai Asumsi | 6.2: baris Giliran jaga | Tidak berubah dari R6-15, dicek 2026-11-06 |",
      "| R6-117 | Versi spesifikasi OpenFeature (6.2, butir 12 ADR 60) | GitHub Releases `open-feature/spec` (API `repos/open-feature/spec/releases`, dibaca 2026-11-06): rilis terbaru v0.9.0, terbit 2026-07-29T17:35:02Z, bukan prerelease; sebelumnya v0.8.0 (2024-03-11). Entri `specification/assets/provider-tck/v0.1.0` (2026-10-16) adalah aset TCK, bukan rilis spesifikasi | 6.2: baris butir 12 tabel pemicu (v0.9.0, belum 1.0) | Tidak berubah sejak naskah, dicek 2026-11-06 lewat API |",
      "| R6-118 | Rekaman t5-gabung yang dikutip 6.2 (baris Skor risiko) | `labs/t5-gabung/output/panggilan.txt` baris 17 sampai 23 (bagian B: 0 panggilan pada satu proses dan 6 pada tiga proses, 400 dari 400 transaksi) dan baris 50 (620,14 byte per transaksi, tidak dikutip 6.2); `latensi.txt` baris 11 sampai 15 (bagian A: jeda 10 ms, batas bawah 60 ms) dan baris 19 sampai 23 (bagian B: 50 ms ÷ 6 = 8,33 ms; jeda 10 ms: 500 dari 500 transaksi di atas 50 ms). `labs/t5-gabung/README.md`: jeda adalah jeda buatan di broker tiruan (Asumsi, lab tidak mengukur jaringan antar host) dan skor adalah peraga | 6.2: Snippet dan baris Skor risiko | Rekaman Tahap 5, tidak dijalankan ulang di Tahap 6 |",
    ]);
  });
  test("R6-116 dan R6-117: kutipan Inggris, URL, tanggal akses, dan lingkup sama dengan halaman", () => {
    const r116 = baris[1]!;
    expect(r116).toContain("sre.google/sre-book/being-on-call/");
    expect(r116).toContain("dibuka dengan curl 2026-11-06");
    expect(r116).toContain("of the remainder, no more than 25% can be spent on-call");
    expect(r116).toContain("Assuming that there are always two people on-call (primary and secondary, with different duties), the minimum number of engineers needed for on-call duty from a single-site team is eight");
    expect(r116).toContain("Batas 25% ditulis untuk waktu SRE; halaman memakainya untuk semua orang di rotasi sebagai Asumsi");
    expect(badan).toContain("batas 25% (buku SRE Google, bab 11)");
    expect(badan).toContain("(Asumsi turunan)");
    const r117 = baris[2]!;
    expect(r117).toContain("open-feature/spec");
    expect(r117).toContain("v0.9.0, terbit 2026-07-29T17:35:02Z, bukan prerelease");
    expect(r117).toContain("aset TCK, bukan rilis spesifikasi");
    expect(r117).toContain("dibaca 2026-11-06");
    expect(badan).toContain("(terbit 2026-07-29, dicek 2026-11-06)");
  });
  test("R6-118: rekaman t5-gabung dikutip dengan berkas dan baris yang ada; angka 0, 6, 60, dan 8,33 sama dengan rekaman", () => {
    const r118 = baris[3]!;
    expect(r118).toContain("`labs/t5-gabung/output/panggilan.txt` baris 17 sampai 23");
    expect(r118).toContain("baris 50 (620,14 byte per transaksi, tidak dikutip 6.2)");
    expect(r118).toContain("`latensi.txt` baris 11 sampai 15");
    expect(r118).toContain("baris 19 sampai 23");
    expect(r118).toContain("50 ms ÷ 6 = 8,33 ms");
    expect(r118).toContain("500 dari 500 transaksi di atas 50 ms");
    expect(latensi[22]).toContain("500 dari 500");
    expect(latensi[10]).toMatch(/^jeda ms/);
    expect(latensi[14]).toMatch(/^\s+10\s+60 ms/);
    expect(r118).toContain("jeda buatan di broker tiruan");
  });
  test("R6-119: hitungan ulang menyebut tiga catatan pembulatan, dan angkanya sama dengan hitungan tes ini", () => {
    const r119 = baris[4]!;
    expect(sel(r119)[0]).toBe("R6-119 Hitung ulang tabel angka beban 6.2");
    expect(r119).toContain("17 dari 17 baris sama dengan naskah");
    expect(r119).toContain("masukan seperti naskah: 10.000.000 user, aktif 20%, 60 request, puncak 10, 3 dan 2 transaksi, 86.400 detik");
    expect(r119).toContain("rumus per baris seperti naskah bagian 3");
    expect(r119).toContain("(skrip hitung ulang, 2026-11-06)");
    expect(sel(r119)[4]).toBe("R6-30 sampai R6-38");
    expect(r119).toContain("SLO berantai 172,5 ÷ 43,2 = 3,99 kali (naskah: empat kali)");
    expect(r119).toContain("akun panas 2 transaksi 23,148 dari nilai tepat 462,963, bukan 23,15 dari 463,0");
    expect(r119).toContain("0,6 × 694,4 = 416,6 dari angka dibulatkan, 416,7 dari nilai tepat");
    expect(fmt(((1 - 0.999 ** 4) * 43_200) / 43.2, 2)).toBe("3,99");
    expect(fmt(462.962962963 * 0.05, 3)).toBe("23,148");
  });
});

// ---- kalimat prosa terkunci per paragraf --------------------------------------------------------------------------------
describe("kalimat prosa terkunci per paragraf", () => {
  // Daftar ini milik tes, bukan sidik: dibangkitkan tangan dari mdx (tmp/gen62.py, sementara) dan dibaca diff-nya saat isi halaman diubah sengaja.
  const PROSA: string[] = [
  // PROSA-AWAL
    "## Inti",
    "Aturan pertama Tahap 6: tiap data punya satu rumah, dan tiap rumah punya satu pemilik.",
    "*Rumah* adalah satu-satunya tempat data boleh disimpan dan diubah. Untuk data satu negara, rumahnya adalah wilayah negara itu, ditambah wilayah pasangannya bila daftar izin negara itu mengizinkan ([Asumsi produk](/cara-pakai/#label-sumber)). *Wilayah* adalah satu lokasi geografis dengan pusat data, dan *negara* adalah satu pasar dengan satu mata uang. Kalau app Flutter-mu pernah menampilkan harga dalam dua mata uang, kamu sudah tahu bahwa jumlah dan mata uangnya tidak boleh dipisahkan.",
    "Baris bawah Rantai adalah versi pertama minggu 2: Arga, Kirana, Nadia, Bayu, dan tim Pelaporan menulis tiap bagian seolah semua negara, wilayah, dan tim sama. Tabelnya di blok Pertanyaan sebelum kode punya tujuh kejadian dan tiga hal, jadi 21 sel, dan 7 sel Rusak, yaitu kejadian itu melanggar hal tersebut. Jumlah sel itu *Hitungan*, yaitu hasil menghitung yang tertulis di tabel, dan labelnya ikut masukan terlemahnya, di sini Ilustrasi. Aturan di atas lahir dari sel yang Rusak itu, sebelum satu baris kode ditulis.",
    "Tebak dulu, lalu ganti skenario dan lihat baris mana yang berubah. *Puncak* adalah laju request di jam paling ramai, yaitu rata-rata harian dikali faktor puncak 10. Lima masukannya adalah user terdaftar, persen aktif, request per user aktif per hari, faktor puncak, dan 86.400 detik per hari.",
    "Semua masukan Asumsi ([Label sumber](/cara-pakai/#label-sumber)). Angka 10.000.000 user dan pembagian 60%, 25%, dan 15% per negara adalah Asumsi cerita. Persen aktif, request per user, dan faktor puncak diteruskan dari Tahap 5 ([[t5-prd]]).",
    "Tanpa JavaScript tebakan dan pilihan skenario tidak berjalan. Jawaban tebakan adalah 6 kali. Puncak request per detik: Tahap 5 1.388,9, Tahap 6 13.888,9, Aktif 10% 6.944,4, dan Negara pertama 8.333,3 (Hitungan atas Asumsi).",
    "Widget membulatkan ke dua angka penting, jadi puncak 1.388,9 tampil 1.400. Pilih **Tahap 6** dan **Aktif 10%** untuk melihat baris yang berubah: user naik 10 kali, lalu persen aktif turun separuh. Skenario **Negara pertama** membuka jawaban tebakanmu.",
    "Kalkulator hanya menghitung request per detik. Ia tidak menilai apakah satu primary, yaitu database utama yang menerima semua tulisan, sanggup menerimanya. Kapasitas itu belum pernah diukur di repo ini: lab `api-t5` hanya memberi batas di satu laptop ([[t5-m51]]).",
    "Ini tabel yang tim tulis sebelum satu baris kode Tahap 6 ada. Tim yang mengerjakannya berjumlah 53 orang dalam 11 tim, seperti di [[t6-prd]] (Asumsi cerita).",
    "Isi tabel adalah rencana kerja tim (Asumsi cerita), bukan hasil ukur. Tahap 6 tanpa lab, jadi halaman ini tidak menjalankan satu pun isi tabel.",
    "Untuk kamu yang memegang app, kolom Di app terbagi dua. Tiga baris mengubah apa yang app tampilkan atau kirim: mata uang dan bahasa per negara, jumlah dalam unit terkecil, dan sinyal perangkat. Tiga baris lain mengubah cara app dirilis: pipeline dari template, rilis bertahap, dan paket per tim. Dua baris sisanya tidak mengubah app yang terlihat.",
    "*Unit terkecil* adalah satuan paling kecil sebuah mata uang. Rupiah memakai eksponen 0, jadi Rp100.000 tetap bilangan bulat 100000 di ledger (Asumsi desain). Konversi bentuk hanya terjadi di batas dengan pihak luar, dan [[t6-m56|M56]] membahasnya.",
    "Tiga hal harus selalu benar di Tahap 6. Dua pertama melanjutkan Tahap 2 dan 5, dan yang ketiga baru:",
    "1. Uang bergerak hanya lewat [[t2-ledger|ledger]], dan jurnal seimbang per mata uang. Satu jurnal tidak pernah menjumlahkan dua mata uang. Tukar adalah dua jurnal yang terhubung. Selisih pembulatan masuk akun sendiri, sesuai syarat Pak Hadi di [[t6-prd]].",
    "2. Data satu negara punya satu rumah, yaitu wilayah negara itu dan pasangan yang diizinkan. Uang tidak dibaca dari salinan di luar primary ([[t4-adr-45|ADR 45]] aturan 2). Salinan, ringkasan, dan sinyal hanya untuk dilihat, bukan untuk memutuskan (syarat Pak Hadi di [[t5-prd]]), dengan jarak ketertinggalan dan batas wilayah yang disebut.",
    "3. Tiap service, data, dan giliran jaga punya satu pemilik yang tercatat. Perubahan oleh pemilik itu lewat jalur yang sama, dan tim lain membaca lewat API atau event, bukan lewat tabel.",
    "*Wilayah pasangan* adalah wilayah kedua yang menyimpan salinan sinkron data itu bila daftar izin negara mengizinkannya.",
    "**Versi pertama (minggu 2).** Arga menulis tiga database negara sebagai tiga salinan schema yang sama. Kirana mengusulkan satu graf akun-perangkat di wilayah pusat, yaitu daftar akun yang terhubung lewat perangkat yang sama.",
    "Nadia mengusulkan aktif-aktif supaya tidak ada failover, yaitu dua wilayah sama-sama menerima tulis. Bayu memasang portal developer dan menganggap platform sudah ada. Pelaporan membaca langsung tabel tim lain supaya laporan cepat selesai. Di staging dengan tiga negara kecil tiap bagian tampak cukup (adegan dan angka cerita: Ilustrasi).",
    "Tabel ini menunjukkan akibatnya. Kolom 1, 2, dan 3 adalah tiga hal di atas, bukan nomor halaman. Terjaga berarti hal itu tetap benar saat kejadian terjadi, Rusak berarti hal itu dilanggar, dan Tidak berlaku berarti kejadian itu tidak menyentuhnya. Isi tiap sel adalah *penalaran*, yaitu kesimpulan dari kalimat yang sudah tertulis di halaman ini dan dari dokumentasi, tanpa menjalankan apa pun (Tidak dijalankan).",
    "Kejadian di tabel adalah Ilustrasi, yaitu rancangan penulis. Tak satu pun baris direkam di Tahap 6.",
    "Baris skor risiko bersandar pada rekaman lab Tahap 5 untuk jumlah panggilan dan batas bawah p95, yaitu waktu jawab yang dilewati 5% transaksi paling lambat. Rekamannya dikutip di blok Angka beban. Kata \"tidak punya pemilik\" di baris itu tetap penalaran.",
    "Cara pertama itu memperlakukan semua negara, wilayah, dan tim seperti satu. Dari 21 sel tabelnya, 7 Rusak: dua di kolom 1, satu di kolom 2, dan empat di kolom 3. Sel yang Terjaga ada 4, dan 10 sel Tidak berlaku.",
    "Halaman ini juga menanam tiga pertanyaan. Di minggu 1 Pak Hadi bertanya angka mana yang ia tanda tangani bila satu laporan memuat dua mata uang. Laras bertanya siapa yang boleh membuka data negara kedua. Dewi bertanya siapa yang dibangunkan bila pembayaran negara ketiga gagal pukul 03.10.",
    "Jawaban Pak Hadi ada di [[t6-m56|M56]], jawaban Laras di [[t6-residensi|Keamanan 13]], dan jawaban Dewi di [[t6-tim-infra|Tim dan infra Tahap 6]].",
    "Masukan tabel ini semuanya Asumsi: 10.000.000 user terdaftar, aktif 20%, 60 request per user aktif per hari, faktor puncak 10, dan 86.400 detik per hari. Pembagian per negara 60%, 25%, dan 15% adalah Asumsi cerita. Dasar hitungan transaksi uang adalah 3 per user aktif per hari, seperti Tahap 2 sampai 5. Angka dalam kurung memakai 2 transaksi, angka registry Tahap 5 ([[t5-prd]]).",
    "Hasil rumus memakai label masukan terlemahnya, jadi seluruh tabel berlabel Asumsi. Hasil dihitung dari nilai tepat dan dibulatkan setengah ke atas. Mengalikan ulang angka yang sudah dibulatkan bisa selisih 0,1.",
    "Dua istilah di tabel perlu arti dulu. *RTT* (round-trip time) adalah waktu satu pesan pergi dan pulang antara dua tempat. *Akun panas* adalah akun yang menerima banyak transaksi bersamaan, seperti merchant besar.",
    "Rekaman di baris Skor risiko dikutip di sini, dan jeda 10 ms-nya adalah jeda buatan di lab. Satu transaksi di tiga proses melewati 6 panggilan, dan satu proses melewati 0:",
    "Rekaman itu menghitung panggilan lewat penghitung di kode dan memeriksa p95 terhadap batas bawah 6 × jeda. Jeda 10 ms adalah Asumsi lab, bukan jaringan antar host dan bukan RTT antar wilayah. Bentuk lain, satu pemanggil yang memanggil tiga service tanpa queue, Tidak dijalankan di lab. Skor di lab adalah peraga, bukan model risiko.",
    "Tiga angka di tabel punya dua arti, jadi tiap pemakaiannya menyebut artinya. Angka 1.388,9 adalah rata-rata Tahap 6 dan puncak Tahap 5: user naik 10 kali dan faktor puncaknya 10. Angka 10 ms adalah RTT pada 1.000 km di baris Latensi, dan jeda buatan per panggilan di baris Skor risiko. Angka 50 ms adalah anggaran total satu skor, bukan tambahan p95 satu lompatan HTTP antar host di butir 7 tabel berikutnya.",
    "Asal masukan dari halaman lain: top-up 0,25 per user aktif per hari dari [[t5-m51|M51]], dan jendela makan siang 80% dalam 90 menit dari [[t5-m45|M45]]. W 0,02 detik berasal dari [[t5-prd]], dan 97 koneksi tersedia dari [[t5-pooler]]. Anggaran skor 50 ms berasal dari [[t5-m51|M51]], dan SLO 99,9% dari [[t5-tim-infra]].",
    "Baris Akun panas bersandar pada satu komentar kode. Di PostgreSQL 17.11, fungsi `RecordTransactionCommit` memuat satu komentar. Saat commit menunggu replikasi sinkron, transaksi masih tampak berjalan dan `continue to hold locks`, yaitu tetap menahan lock (`src/backend/access/transam/xact.c`, dibuka 2026-11-06, Tidak dijalankan). Standby adalah salinan database yang menerima perubahan dari primary.",
    "Bila transaksi berikutnya ke baris yang sama menunggu lock itu, laju satu baris dibatasi 1 ÷ RTT. Batas itu penalaran atas kode dan Asumsi RTT, dan belum diukur [perlu verifikasi].",
    "**Tiga kesimpulan.** Pertama, beban 13.888,9 request per detik naik 10 kali, tetapi yang melewati batasnya lebih dulu bukan request. Yang melewatinya adalah batas yang bergantung pada jarak (30 ms dan 33,3 per detik), pada orang (40% jaga), dan pada kegagalan beruntun (99,6%).",
    "Kedua, tidak ada hitungan di tabel ini yang menunjukkan satu primary tidak sanggup menulis 416,7 transaksi uang per detik di negara terbesar. Itu tidak pernah diukur di repo ini, dan Tahap 6 tidak punya lab untuk mengukurnya.",
    "Ketiga, yang berbahaya adalah batas yang tidak punya pemilik dan jarak yang tidak dihitung, bukan banyaknya request. Dasarnya sama dengan Tahap 2 sampai 5: Little's Law (L = λ × W) untuk koneksi, dan apa yang tidak diketahui sesudah sesuatu gagal.",
    "**Pemicu ADR 60 dibaca ulang dengan angka di atas.** Terpenuhi berarti halaman Tahap 6 menulis keadaan yang sama dengan pemicunya, bukan bahwa komponennya terbukti perlu. Kolom Tahap 5 menyalin kata dari kolom Dibaca di [[t5-adr-60|ADR 60]]: Belum terpenuhi, Belum terukur, Tidak diminta, dan Menunggu PRD v6.",
    "Dari dua belas butir, dua terpenuhi dan dikerjakan sebagian. Butir 1 hanya untuk identitas di template (ADR 61, tanpa mesh penuh). Butir 2 hanya untuk aktif-pasif (ADR 64, tanpa aktif-aktif).",
    "Sepuluh butir tetap tidak dikerjakan. Enam belum terukur (butir 3, 4, 5, 7, 8, 9), tiga tidak diminta (butir 6, 10, 11), dan satu belum terpenuhi (butir 12). Di Tahap 5, kolom Dibaca di 5.30 menulis dua belum terpenuhi (butir 1 dan 12), satu menunggu PRD v6 (butir 2), dan sisanya sama. Sepuluh butir itu dibahas ulang dengan pemicunya di [[t6-adr-69]].",
    "Tahap 6 tidak membangun skema dari database, jadi tidak ada ERD Tahap 6. ERD di bawah adalah skema akhir Tahap 5, 30 tabel dalam enam schema service, dibaca dari database lab `api-t5` ([[t5-skema]]). Ia hanya keadaan awal. Tombol Bandingkan dengan Tahap 4 menambahkan skema Tahap 4 di sebelahnya, dan halaman ini tidak memakainya.",
    "Tabel di bawah menulis apa yang berubah secara konseptual. Semuanya Ilustrasi: tak satu baris pun dicocokkan dengan skema lab.",
    "Pertumbuhan database memakai rumus naskah Tahap 2. Posting per tahun = transaksi per hari × 2 × 365, dengan ±250 byte per posting.",
    "Tabel ini menulis ukuran Tahap 6 ±1 TB, dan blok Angka beban menulis 1.095 GB atau ±1,1 TB. Itu satu nilai, 1.095 GB, dengan dua pembulatan (Hitungan atas Asumsi).",
    "Pola yang ditanam: di Tahap 6 database tumbuh karena batas, bukan karena fitur atau salinan. Tabel baru hanya dua, `kurs` dan `sinyal_risiko`. Tabel lama memperoleh negara, mata uang, dan pemilik.",
    "Tabel ini menyebut konsep untuk tiap fitur. Tahap 6 membahasnya satu per satu, saat masalahnya muncul.",
    "Aturannya sama di tiap batas: setiap data diberi rumah, pemilik, dan jarak ketertinggalan, dan salinan tidak boleh memutuskan uang.",
    "Halaman berikutnya, [[t6-m52|M52]], membahas service baru yang menunggu template dari Platform.",
  // PROSA-AKHIR
  ];
  const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !/^\s*(\||<|import )/.test(b));
  test("tiap paragraf prosa ada di halaman tepat satu kali, dan semua baris prosa halaman ada di daftar", () => {
    expect(PROSA).toHaveLength(prosa.length);
    expect(new Set(PROSA).size, "paragraf ganda di daftar").toBe(PROSA.length);
    expect(prosa).toEqual(PROSA);
    for (const k of PROSA) expect(hitungKata(badan, k), k.slice(0, 50)).toBe(1);
  });
  test("tiap kalimat di prosa unik di dalam halaman", () => {
    const kalimat = PROSA.flatMap((b) => b.replace(/^\d+\. /, "").split(/(?<=[.:])\s+(?=[A-Z*\[])/));
    expect(new Set(kalimat).size, "kalimat ganda").toBe(kalimat.length);
    expect(kalimat.every((k) => k.split(/\s+/).length <= 40)).toBe(true);
  });
});

// ---- sidik teks halaman dan nilai Rantai --------------------------------------------------------------------------------
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
  test("lima baris riset R6-115 sampai R6-119 persis sama dengan sidik", () => {
    expect(riset6.split("\n").filter((b) => /^\| R6-11[5-9] /.test(b))).toEqual(BARIS_RISET);
  });
});
