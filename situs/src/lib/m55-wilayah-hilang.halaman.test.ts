// Penjaga halaman 6.6 (keputusan 1730 sampai 1732): adegan M55, tabel RTT, angka Hitungan, skenario alur t6-m55.json, kutipan
// rekaman Tahap 5 (promosi.txt bagian A dan sinkron.txt bagian C), tabel lima bentuk daftar standby, tabel enam opsi dan delapan
// aturan ADR 64, kapan salah, Cek diri, kartu, sumber eksternal bertanggal akses, dan klaim negatif berlingkup di
// m55-wilayah-hilang.mdx diturunkan dari naskah Tahap 6 (bagian 3 dan 4), registry cerita.json, halaman Tahap 5 (ADR 37, 47, 48,
// 59, 60), rekaman labs/t5-replika, dan baris riset R6-135 sampai R6-139. Semua angka dihitung ulang di sini dari masukan naskah
// (pembulatan setengah ke atas), bukan disalin dari halaman. Tahap 6 tanpa lab: tak satu kalimat pun mengutip rekaman Tahap 6.
// BARIS_MDX di m55-wilayah-hilang.halaman.nilai.ts adalah sidik teks (tiap baris persis); tes turunan berdiri sendiri tanpa
// sidik itu, supaya mutan yang mengubah makna (bukan hanya huruf) tertangkap oleh sumbernya.
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { cekTemplat, daftarBlok } from "./blok";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX } from "./m55-wilayah-hilang.halaman.nilai";

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
const BERKAS = "situs/src/content/docs/tahap-6/m55-wilayah-hilang.mdx";
const mdx = baca(BERKAS);
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-6.md");
const riset6 = baca("plan/RISET-TAHAP-6.md");
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t6-m55.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const adr48 = baca("situs/src/content/docs/tahap-5/rpo-rto-failover.mdx");
const adr47 = baca("situs/src/content/docs/tahap-5/replication-lag.mdx");
const adr60 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const adr59 = baca("situs/src/content/docs/tahap-5/on-prem-lawan-cloud.mdx");
const adr37 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const m42 = baca("situs/src/content/docs/tahap-5/m42-database-utama-mati.mdx");
const m42Alur = baca("situs/src/content/docs/tahap-5/m42-database-utama-mati.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const rek = (berkas: string): string[] => baca(`labs/t5-replika/output/${berkas}`).split("\n");
const promosi = rek("promosi.txt");
const sinkron = rek("sinkron.txt");
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: unknown[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; pendek?: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; path?: string; peran?: string[]; bagian?: number; lab?: string[]; label?: string; masalah?: string }
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
const polos = (s: string): string => s.replace(/\[\[[^\]|\\]+(?:\\?\|([^\]]+))?\]\]/g, "$1").replace(/\*\*/g, "").replace(/`/g, "").replace(/\\\|/g, "|").trim();

// ---- masukan: hanya dari naskah (bagian 3 dan 4) dan registry; tiap konstanta dicocokkan dengan teks naskah -----------------
const naskahBeban = bagian(naskah, "### Angka beban Tahap 6", "\n## 3b.");
const barisM55 = sel(barisAwal(naskah, "| M55 |"));
const barisAdr64 = sel(barisAwal(naskah, "| 64 |"));
const petaBaris = sel(barisAwal(naskah, "| 6.6 |"));
const USER = 10_000_000;
const AKTIF = 0.2;
const PUNCAK = 10;
const HARI = 86_400;
const NEG1 = 0.6;
const MERCHANT = 0.05;
const KECEPATAN = 200_000;
const JEDA_M55 = 1.5;
const HENTI = 47;
const RTO_WIL = 30;
const RTO_MESIN = 15;
const MENIT_30HARI = 43_200;
const SLO = 0.999;
const aktif = USER * AKTIF;
const rata = (trx: number): number => (aktif * trx) / HARI;
const puncak = (trx: number): number => rata(trx) * PUNCAK;
const rtt = (km: number): number => (2 * km) / KECEPATAN;
const batas = (km: number): number => 1 / rtt(km);
const merchant = (trx: number): number => puncak(trx) * MERCHANT;
const anggaran = (1 - SLO) * MENIT_30HARI;
const neg1 = rata(3) * NEG1;

describe("masukan naskah: tiap konstanta ada di bagian 3 dan 4 naskah", () => {
  test("masukan beban dan jarak", () => {
    for (const x of ["10.000.000 × 20%", "2.000.000 × 3 = 6.000.000 per hari", "60%, 25%, dan 15%", "RTT = 2 × jarak ÷ kecepatan", "±200.000 km per detik", "1.000 km dan 3.000 km", "5% dari puncak seluruh negara", "34,7 per detik", "SLO 99,9%", "43,2", "(1 − SLO) × 43.200 menit"]) {
      expect(naskahBeban, x).toContain(x);
    }
    expect(aktif).toBe(2_000_000);
    expect(PUNCAK).toBe(10);
  });
  test("baris M55: minggu 12, kejadian, hitungan 62,55, nama dikira, nama ADR", () => {
    expect(barisM55[0]).toBe("M55");
    expect(barisM55[1]).toBe("12");
    for (const x of ["Selasa 03.40", "47 menit", "sekitar 63 transaksi uang", "jeda 1,5 detik", "69,4 × 60% = 41,7 per detik", "1,5 × 41,7 = 62,55", "batas atas, karena pukul 03.40 lebih sepi", "47 menit melewati RTO wilayah 30 menit", "Sinta bertanya kenapa tidak berpindah otomatis"]) {
      expect(barisM55[2], x).toContain(x);
    }
    expect(barisM55[3]).toContain("Nadia: aktif-aktif");
    expect(barisM55[3]).toContain("Raka: pindah ke penyedia dengan failover otomatis");
    expect(barisM55[6]).toContain("ADR 64");
    expect(bulat(JEDA_M55 * 41.7, 2)).toBe(62.55);
    expect(HENTI).toBe(47);
    expect(RTO_WIL).toBe(30);
  });
  test("baris ADR 64 di naskah: kuorum memuat paling sedikit satu standby di pasangan (bukan jaminan), opsi, dan kapan salah", () => {
    expect(barisAdr64[0]).toBe("64");
    expect(barisAdr64[1]).toContain("kuorum standby sinkron yang memuat paling sedikit satu standby di wilayah pasangan paling jauh 1.000 km");
    expect(barisAdr64[1]).not.toContain("ANY 2");
    expect(barisAdr64[1]).toContain("Failover wilayah diputuskan manusia (SRE) dengan fencing, dilatih tiap kuartal");
    const opsi = ["Aktif-aktif", "asinkron saja", "backup dan restore", "pilot light atau warm standby", "layanan terkelola multi-region", "failover otomatis penuh"];
    let posisi = -1;
    for (const o of opsi) {
      const i = barisAdr64[2]!.indexOf(o);
      expect(i, `opsi naskah: ${o}`).toBeGreaterThan(posisi);
      posisi = i;
    }
    for (const x of ["P95 commit pembayaran melewati 50 ms", "Merchant melewati 50% batas per akun", "Latihan wilayah lebih dari 30 menit", "Negara tanpa pasangan dalam 1.000 km yang diizinkan", "Standby sinkron mati"]) {
      expect(barisAdr64[3], x).toContain(x);
    }
  });
});

// ---- registry, meta, dan susunan blok ----------------------------------------------------------------------------------
describe("registry, meta, dan susunan blok", () => {
  test("6.6 ada, jenis konsep, bagian 4, jalur inti, prasyarat 6.5 dan 5.9, ADR 64, tanpa lab, judul sama dengan peta naskah", () => {
    const h = dari("t6-m55");
    expect([h.tahap, h.nomor, h.jenis, h.bagian, h.inti, h.ada, h.prasyarat, h.lab, h.peran, h.adr]).toEqual([6, "6.6", "konsep", 4, true, true, ["t6-m54", "t5-rpo-rto"], undefined, ["devops", "security", "backend"], [64]]);
    expect(h.path).toBe("tahap-6/m55-wilayah-hilang.md");
    expect(h.judul).toBe("M55: Satu wilayah hilang 47 menit + ADR 64 (multi-region aktif-pasif)");
    expect(petaBaris).toEqual(["6.6", "4", h.judul, "Masalah + ADR", "★", "–", petaBaris[6]]);
    expect(petaBaris[6]).toContain("alur (tebak, lalu pembaca mengganti jarak pasangan 1.000 atau 3.000 km)");
    expect(barisAwal(front, "title:")).toBe('title: "6.6 M55: Satu wilayah hilang 47 menit + ADR 64"');
    expect(badan).toMatch(/^<p class="meta">Baca \d+ menit · coba 3 menit · Prasyarat: \[\[t6-m54\]\], \[\[t5-rpo-rto\]\] · Jalur inti<\/p>$/m);
    const m = badan.match(/Baca (\d+) menit · coba (\d+) menit/)!;
    expect(Number(m[1]) + Number(m[2])).toBe(h.menit);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const kata = (isi.match(/\S+/g) ?? []).length;
    const baca = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(kata / 200 - baca), `${kata} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; widget hanya di Coba, Snippet hanya di Paham, SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => [x.nama, x.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(hitungKata(badan, "<Blok "), "jumlah <Blok").toBe(5);
    expect(hitungKata(badan, "</Blok>"), "jumlah </Blok>").toBe(5);
    expect(hitungKata(badan, "<WidgetLama "), "jumlah widget").toBe(1);
    expect(blokMdx("Coba")).toContain('<WidgetLama nama="alur" src="data/skenario/t6-m55.json" />');
    expect(hitungKata(badan, "<Snippet "), "jumlah Snippet").toBe(2);
    expect(hitungKata(blokMdx("Paham"), "<Snippet "), "Snippet di Paham").toBe(2);
    expect(hitungKata(badan, "<details"), "jumlah details").toBe(5);
    expect(blokMdx("Kunci").split("<details").length - 1).toBe(5);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(m42Alur).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(blokMdx("Coba")).toMatch(/aman="Kalau berhenti di sini, kamu sudah tahu: /);
  });
  test("impor mdx: jalur ada di disk dan persis lima impor", () => {
    const impor = [...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => [m[1]!, m[2]!] as const);
    expect(impor.map((x) => x[0])).toEqual(["Blok", "WidgetLama", "Snippet", "SkripLama"]);
    for (const [nama, rel] of impor) expect(fs.existsSync(path.join(akar, "situs/src/content/docs/tahap-6", rel)), `${nama}: ${rel}`).toBe(true);
  });
  test("tingkat heading: tanpa h2, sembilan h3 dengan judul persis; frontmatter tanpa heading", () => {
    expect(badan.match(/^#{1,6} .*$/gm)).toEqual([
      "### Yang dikira",
      "### Yang sebenarnya",
      "### Kuorum yang memaksa pasangan ikut",
      "### Yang masih terbuka sesudah failover wilayah",
      "### ADR 64: aktif-pasif per negara, kuorum yang memaksa pasangan ikut, dan aktif-aktif sengaja belum",
      "### Sengaja belum dilakukan",
      "### Cek diri",
      "### Saat me-review rancangan atau konfigurasi (juga buatan AI), cek ini",
      "### Bacaan lanjut",
    ]);
    expect(front).not.toMatch(/^#/m);
  });
  test("deskripsi: minggu 12, 47 menit, sekitar 63 transaksi, enam cara lain; tanpa jawaban tebakan", () => {
    const d = barisAwal(front, "description:");
    for (const x of ["Minggu 12.", "47 menit", "sekitar 63 transaksi", "ADR 64 menimbang enam cara lain"]) expect(d, x).toContain(x);
    for (const x of ["35%", "104%", "100 per detik", "10 ms"]) expect(d, `bocor: ${x}`).not.toContain(x);
  });
  test("tautan [[id]]: tiap id ada di registry, nomor halaman yang disebut cocok, dan kumpulannya persis ini", () => {
    const ids = [...new Set([...badan.matchAll(/\[\[([a-z0-9-]+)(?:\\?\|[^\]]+)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(ids).toEqual(["t4-modul", "t5-adr-60", "t5-lag", "t5-m42", "t5-onprem", "t5-prd", "t5-read-replica", "t5-rpo-rto", "t6-adr-69", "t6-fitur-teknis", "t6-m54", "t6-m56", "t6-prd", "t6-residensi", "t6-tim-infra"].sort());
    for (const id of ids) expect(dari(id).id).toBe(id);
    expect([dari("t6-residensi").nomor, dari("t6-tim-infra").nomor, dari("t6-adr-69").nomor, dari("t6-m56").nomor, dari("t6-m54").nomor]).toEqual(["6.8", "6.10", "6.11", "6.7", "6.5"]);
    expect([dari("t5-rpo-rto").nomor, dari("t5-lag").nomor, dari("t5-read-replica").nomor, dari("t5-adr-60").nomor, dari("t5-onprem").nomor, dari("t4-modul").nomor, dari("t5-m42").nomor]).toEqual(["5.9", "5.7", "5.5", "5.30", "5.28", "4.13", "5.8"]);
    expect(badan).toContain("dibahas di 6.8), karena standby sinkron memegang salinan data langsung");
    expect(badan).toContain("[[t6-residensi]], dibahas di 6.8");
    expect(badan).toContain("Halaman berikutnya, [[t6-m56|M56]], membahas jurnal tukar yang jumlah postingnya bukan nol.");
    expect(sel(barisAwal(naskah, "| 6.7 |"))[2]).toContain("Jurnal tukar yang jumlah postingnya bukan nol");
  });
});

// ---- adegan Mulai ------------------------------------------------------------------------------------------------------
describe("adegan Mulai: kejadian dari naskah M55, angka Hitungan, dan tanpa kalimat definisi", () => {
  const mulai = blokMdx("Mulai");
  const paragraf = mulai.split("\n\n").map((p) => p.trim()).filter(Boolean);
  const adegan = paragraf.slice(1, 6).join("\n\n");
  test("lima paragraf adegan menyebut kejadian naskah dan tokoh yang naskah beri tugas", () => {
    for (const x of ["Minggu 12 Tahap 6.", "Selasa pukul 03.40", "47 menit", "Sekitar 63 transaksi uang yang dijawab sukses tidak ada di sana", "Sinta", "Dewi", "Ratih", "Pak Hadi", "Budi", "Bu Marni", "Nadia", "Raka"]) {
      expect(adegan, x).toContain(x);
    }
    expect(paragraf[6]!.startsWith("*Angka cerita:*")).toBe(true);
    expect(adegan).toContain("Ia bertanya kenapa sistem tidak berpindah sendiri.");
    expect(adegan).toContain("RTO wilayah menulis 30 menit, dan wilayah itu mati 47 menit.");
    for (const t of ["Dewi", "Ratih", "Sinta", "Pak Hadi", "Bu Marni"]) expect(naskah, `tokoh naskah: ${t}`).toContain(t);
  });
  test("adegan tanpa kalimat berpenanda definisi, tanpa angka batas satu akun, dan tanpa jawaban tebakan", () => {
    expect(adegan).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    for (const x of ["35%", "100 per detik", "10 ms", "104%", "RTT", "ANY"]) expect(adegan, `bocor: ${x}`).not.toContain(x);
  });
  test("catatan angka: 69,4 × 60% = 41,7 (nilai tepat 41,667), 1,5 × 41,7 = 62,55 (nilai tepat 62,5), dibulatkan 63, label Hitungan atas Ilustrasi dan Asumsi", () => {
    expect(fmt(rata(3), 1)).toBe("69,4");
    expect(fmt(neg1, 1)).toBe("41,7");
    expect(fmt(neg1, 3)).toBe("41,667");
    expect(fmt(JEDA_M55 * bulat(neg1, 1), 2)).toBe("62,55");
    expect(fmt(JEDA_M55 * neg1, 1)).toBe("62,5");
    expect(bulat(JEDA_M55 * bulat(neg1, 1))).toBe(63);
    expect(bulat(JEDA_M55 * neg1)).toBe(63);
    const catatan = paragraf.slice(6, 9).join("\n\n");
    for (const x of ["69,4 × 60% = 41,7 transaksi uang per detik, dari nilai tepat 41,667", "1,5 × 41,7 = 62,55, dan dari nilai tepat 62,5", "Keduanya dibulatkan ke 63 (Hitungan atas Ilustrasi dan Asumsi)", "Itu batas atas, karena pukul 03.40 lebih sepi dari rata-rata", "berlabel Ilustrasi, yaitu contoh dari naskah dan bukan hasil sistem", "RTO wilayah 30 menit berlabel Asumsi produk"]) {
      expect(catatan, x).toContain(x);
    }
  });
  test("tiga istilah di cerita: wilayah, wilayah pasangan, RTO wilayah, dengan satu nama 'wilayah pasangan' di seluruh halaman", () => {
    expect(mulai).toContain("*Tiga istilah di cerita:* *wilayah* menulis satu lokasi geografis dengan pusat data.");
    expect(mulai).toContain("*Wilayah pasangan* memegang salinan database negara pertama di wilayah kedua");
    expect(mulai).toContain("*RTO wilayah* menulis lama paling lama yang boleh dipakai sampai pembayaran satu negara pulih sesudah satu wilayah hilang.");
    expect(badan.toLowerCase()).not.toContain("pasangan wilayah");
    expect(hitungKata(badan.toLowerCase(), "wilayah pasangan"), "wilayah pasangan").toBeGreaterThanOrEqual(8);
  });
});

// ---- tabel RTT dan angka Hitungan di Paham -----------------------------------------------------------------------------------
describe("blok Paham: angka dihitung ulang dari masukan naskah", () => {
  const paham = blokMdx("Paham");
  test("tabel RTT: dua baris, dari RTT = 2 × jarak ÷ 200.000 km per detik, batas 1 ÷ RTT, dan persen merchant (juga dari nilai tepat)", () => {
    const t = tabelDari(paham, "| Jarak ke wilayah pasangan |");
    expect(t[0]).toEqual(["Jarak ke wilayah pasangan", "RTT", "Batas satu akun, 1 ÷ RTT", "Merchant besar, 34,7 per detik", "2 transaksi, 23,1 per detik"]);
    const m3 = bulat(merchant(3), 1);
    const m2 = bulat(merchant(2), 1);
    const harap = [1000, 3000].map((km) => {
      const b1 = bulat(batas(km), 1);
      const p3 = bulat((m3 / b1) * 100);
      const p2 = bulat((m2 / b1) * 100);
      expect(bulat(((merchant(3) / batas(km)) * 100)), `persen tepat ${km}`).toBe(p3);
      expect(bulat(((merchant(2) / batas(km)) * 100)), `persen tepat 2 transaksi ${km}`).toBe(p2);
      return [`${titik(km)} km`, `${fmt(rtt(km) * 1000, 0)} ms`, `${fmt(batas(km), b1 === bulat(b1) ? 0 : 1)} per detik`, `${p3}%`, `${p2}%`];
    });
    expect(t.slice(1)).toEqual(harap);
    expect(harap).toEqual([["1.000 km", "10 ms", "100 per detik", "35%", "23%"], ["3.000 km", "30 ms", "33,3 per detik", "104%", "69%"]]);
    expect(t).toHaveLength(3);
  });
  test("merchant 34,7 (nilai tepat 34,722) dan 2 transaksi 23,1 (nilai tepat 23,148): 5% dari puncak 694,4 (463,0)", () => {
    expect(fmt(puncak(3), 1)).toBe("694,4");
    expect(fmt(puncak(2), 1)).toBe("463,0");
    expect(fmt(merchant(3), 1)).toBe("34,7");
    expect(fmt(merchant(3), 3)).toBe("34,722");
    expect(fmt(merchant(2), 1)).toBe("23,1");
    expect(fmt(merchant(2), 3)).toBe("23,148");
    expect(paham).toContain("Merchant besar menerima 5% dari puncak 694,4 transaksi uang di tiga negara, jadi 34,7 per detik, dari nilai tepat 34,722 (Asumsi cerita). Dengan 2 transaksi nilai tepatnya 23,148.");
    expect(naskahBeban).toContain("5% dari puncak seluruh negara (Asumsi cerita): 34,7 per detik (trx 2: 23,1)");
    expect(paham).toContain("Sinyal di serat optik merambat ±200.000 km per detik, kira-kira dua pertiga kecepatan cahaya (Asumsi).");
    expect(paham).toContain("Jadi RTT = 2 × jarak ÷ kecepatan, dan hasilnya batas bawah fisik tanpa peralatan jaringan.");
  });
  test("anggaran kegagalan: (1 − 0,999) × 43.200 = 43,2; 47 ÷ 43,2 = 108,8%; 30 ÷ 43,2 = 69,4%; 47 − 30 = 17", () => {
    expect(fmt(anggaran, 1)).toBe("43,2");
    expect(fmt((HENTI / anggaran) * 100, 1)).toBe("108,8");
    expect(fmt((RTO_WIL / anggaran) * 100, 1)).toBe("69,4");
    expect(HENTI - RTO_WIL).toBe(17);
    expect(paham).toContain("SLO pembayaran 99,9% per 30 hari memberi (1 − 0,999) × 43.200 = 43,2 menit");
    expect(paham).toContain("Maka 47 ÷ 43,2 = 108,8% (Hitungan atas Ilustrasi dan Asumsi).");
    expect(paham).toContain("anggaran itu tetap terpakai 30 ÷ 43,2 = 69,4%.");
    expect(naskahBeban).toContain("108,8% anggaran 30 hari di negara itu (30 menit RTO wilayah: 69,4%)");
  });
  test("RPO asinkron: 416,7 (277,8) negara terbesar, 694 (463) satu primary, jeda 5 detik lima kali; Tahap 5: 69 dari 5.8", () => {
    expect(fmt(puncak(3) * NEG1, 1)).toBe("416,7");
    expect(fmt(puncak(3) * NEG1, 3)).toBe("416,667");
    expect(fmt(puncak(2) * NEG1, 1)).toBe("277,8");
    expect(fmt(puncak(3), 0)).toBe("694");
    expect(fmt(puncak(2), 0)).toBe("463");
    expect(fmt((1_000_000 * AKTIF * 3 * PUNCAK) / HARI, 0)).toBe("69");
    expect(fmt(puncak(3) * NEG1 * 5, 1)).toBe("2.083,3");
    expect(fmt(puncak(3) * 5, 0)).toBe("3.472");
    expect(paham).toContain("Pada jeda 1 detik di puncak, negara terbesar kehilangan 416,7 transaksi: 60% dari 694,4, dari nilai tepat 416,667 (2 transaksi: 277,8). Bila seluruh transaksi lewat satu primary, hasilnya 694 (463). Tahap 5, satu negara dan jeda 1 detik, memberi 69 (46) ([[t5-m42]]). Jeda 5 detik mengalikan semuanya 5 kali (Hitungan atas Asumsi).");
    expect(m42).toContain("| Transaksi uang dalam jeda 1 detik | 1 × 69,4 | 69 |");
    expect(m42).toContain("dengan 2 transaksi per user aktif hasilnya 46");
    expect(fmt((1_000_000 * AKTIF * 2 * PUNCAK) / HARI, 0)).toBe("46");
    expect(naskahBeban).toContain("416,7 (277,8) dan 2.083,3 (1.388,9)");
  });
  test("klaim di Paham dari sumber: dokumentasi PostgreSQL 17 (sebanding dengan jeda, RTT minimum, lock ditahan), kode xact.c, Spanner, AWS", () => {
    for (const x of ["jumlah data yang hilang sebanding dengan replication delay saat failover", "waktu tunggu minimum sebuah commit adalah RTT antara primary dan standby", "transaction lock tetap ditahan sampai pengiriman dikonfirmasi", "transaksi masih tampak berjalan dan `continue to hold locks`", "`src/backend/access/transam/xact.c`, dibuka 2026-11-06", "satu baris menerima paling banyak satu commit per RTT. Itu penalaran dari dua sumber di atas. Batas per baris belum diukur [perlu verifikasi].", "F1 memakai lima replica di Amerika Serikat", "\"will probably\" mereplikasi data ke 3 sampai 5 datacenter di satu wilayah geografis", "memilih latensi lebih rendah daripada ketersediaan lebih tinggi, selama selamat dari 1 atau 2 kegagalan datacenter", "yang memakai jam GPS dan jam atom", "paling kompleks dan paling besar biayanya", "failover yang dipicu otomatis dari health check atau alarm harus dipakai dengan hati-hati", "supaya pemicunya seperti menekan tombol", "primary lama yang hidup kembali harus diberi tahu ia bukan primary lagi", "Dokumentasi itu menyebutnya STONITH"]) {
      expect(paham, x).toContain(x);
    }
    for (const x of ["will probably", "continue to hold locks", "most applications will choose lower latency over higher availability", "The minimum wait time is the round-trip time between primary and standby", "transaction locks continue to be held until the transfer is confirmed", "GPS and atomic clocks", "Automatically initiated failover based on health checks or alarms should be used with caution", "the push of a button", "STONITH", "most complex and costly approach to disaster recovery", "near zero"]) {
      expect(riset6, `riset: ${x}`).toContain(x);
    }
  });
  test("lab Tahap 5: lima jurnal 201 hilang dan selisih Rp150.000 (promosi.txt bagian A), tanpa fencing; kalimat halaman cocok dengan baris rekaman", () => {
    const i5 = promosi.findIndex((b) => b.startsWith("# Lima jurnal yang dijawab 201 ada di primary lama dan tidak ada di node baru"));
    const i150 = promosi.findIndex((b) => b.startsWith("# Selisih saldo Warung 505 antara primary lama dan node baru: Rp150.000"));
    expect(i5).toBeGreaterThan(0);
    expect(i150).toBeGreaterThan(i5);
    expect(paham).toContain("Bagian A merekam lima jurnal yang sudah dijawab 201 dan hilang dari node baru, dengan selisih saldo Rp150.000.");
    expect(paham).toContain("Replica di sana asinkron dan primary lama tidak dihentikan.");
    expect(promosi[promosi.findIndex((b) => b.startsWith("# --- A.")) ]).toContain("transaksi yang sudah dijawab 201 hilang");
  });
});

// ---- kutipan Snippet dari rekaman: rentang baris diturunkan dari isi berkas ------------------------------------------------
describe("Snippet: rentang baris diturunkan dari isi rekaman Tahap 5, bukan angka tulisan tangan", () => {
  const snip = [...badan.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)" title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, a: Number(m[2]), b: Number(m[3]), title: m[4]! }));
  test("dua Snippet: promosi.txt dari baris 'Tidak ada yang menghentikan primary lama' sampai baris fencing; sinkron.txt dari query SyncRep sampai komentar 'belum terlihat'", () => {
    expect(snip).toHaveLength(2);
    const p0 = promosi.findIndex((b) => b.startsWith("# Tidak ada yang menghentikan primary lama")) + 1;
    expect(p0).toBeGreaterThan(0);
    expect(promosi[p0]).toContain("# Fencing (menghentikan primary lama sebelum node baru menerima tulisan) tidak ada di lab ini");
    expect(snip[0]).toMatchObject({ file: "labs/t5-replika/output/promosi.txt", a: p0, b: p0 + 1 });
    expect(snip[0]!.title).toBe("Rekaman lab Tahap 5: labs/t5-replika/output/promosi.txt, bagian A (satu mesin, tanpa fencing)");
    const cIdx = sinkron.findIndex((b) => b.startsWith("# --- C."));
    const s0 = cIdx + 1 + sinkron.slice(cIdx).findIndex((b) => b.includes("wait_event = 'SyncRep'"));
    const s1 = sinkron.findIndex((b) => b.startsWith("# COMMIT menunggu di SyncRep dan barisnya belum terlihat oleh sesi lain")) + 1;
    expect(s0).toBeGreaterThan(0);
    expect(s1).toBeGreaterThan(s0);
    expect(snip[1]).toMatchObject({ file: "labs/t5-replika/output/sinkron.txt", a: s0, b: s1 });
    expect(sinkron.slice(cIdx, s0 - 1).join("\n")).toContain("docker compose stop sinkron");
    expect(snip[1]!.title).toBe("Rekaman lab Tahap 5: labs/t5-replika/output/sinkron.txt, bagian C (satu standby sinkron dimatikan)");
    expect(sinkron[sinkron.findIndex((b) => b.startsWith("# --- C."))]).toContain("Standby sinkron dimatikan: COMMIT macet");
    expect(sinkron.slice(s0 - 1, s1).join("\n")).toContain("uji-macet");
    expect(snip[0]!.a).toBeLessThan(snip[0]!.b);
  });
  test("klaim negatif berlingkup: output t5-replika tidak menyebut wilayah; lab memakai satu nama FIRST 1 (replika_sinkron) dan tak ada ANY 2 di folder lab", () => {
    for (const f of ["baca.txt", "promosi.txt", "jeda.txt", "konflik.txt", "replika.txt", "sinkron.txt"]) expect(rek(f).join("\n").toLowerCase(), `output ${f}`).not.toContain("wilayah");
    expect(sinkron.join("\n")).toContain("FIRST 1 (replika_sinkron)");
    const folder = path.join(akar, "labs/t5-replika");
    const semua: string[] = [];
    const jalan = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === ".alat" || e.name === "node_modules" || e.name === ".venv") continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) jalan(p);
        else if (/\.(txt|md|py|sh|yml|sql|go)$/.test(e.name) || e.name === "Makefile") semua.push(fs.readFileSync(p, "utf8"));
      }
    };
    jalan(folder);
    expect(semua.length).toBeGreaterThan(5);
    expect(semua.join("\n")).not.toContain("ANY 2");
    expect(badan).toContain("Lab itu satu mesin dan satu nama di daftar. Bentuk `ANY 2` dari dua standby hanya Penalaran dari rekaman itu dan dokumentasi, Tidak dijalankan.");
    expect(badan).toContain("karena lab Tahap 5 hanya memakai satu standby sinkron.");
    expect(badan).toContain("Lab tidak merekam wilayah, jadi 10 ms dan 30 ms di atas tetap hitungan, bukan ukuran.");
  });
});

// ---- tabel lima bentuk daftar standby ---------------------------------------------------------------------------------------
describe("blok Paham: tabel lima bentuk daftar standby dari dokumentasi PostgreSQL 17", () => {
  const paham = blokMdx("Paham");
  const t = tabelDari(paham, "| Bentuk daftar |");
  test("lima baris, empat kolom, bentuk persis; hanya ANY 1 (lokal, pasangan) yang tidak menjamin pasangan ikut", () => {
    expect(t[0]).toEqual(["Bentuk daftar", "Commit dilepas bila", "Wilayah utama hilang", "Satu standby putus"]);
    expect(t.slice(1).map((r) => r[0])).toEqual(["`ANY 1 (lokal, pasangan)`", "`ANY 2 (lokal, pasangan)`", "`FIRST 1 (pasangan, lokal)`", "`ANY 1 (pasangan_a, pasangan_b)`", "`ANY 2 (lokal, pasangan_a, pasangan_b)`"]);
    for (const r of t.slice(1)) expect(r).toHaveLength(4);
    expect(t[1]![2]).toContain("RPO nol tidak terjamin");
    for (const k of [2, 3, 4, 5]) expect(t[k]![2], `baris ${k}`).not.toContain("tidak terjamin");
    expect(t[2]![1]).toBe("Keduanya menjawab");
    expect(t[3]![1]).toContain("prioritasnya tertinggi");
    expect(t[3]![3]).toContain("lokal menggantikan segera dan jaminan itu berhenti tanpa galat");
    expect(t[5]![2]).toContain("hanya satu standby yang lokal, jadi sedikitnya satu di pasangan ikut menjawab");
    expect(t[5]![3]).toContain("satu server tambahan per negara");
  });
  test("sintaks dan perilaku dari dokumentasi: ANY (kuorum), FIRST (prioritas, kandidat menggantikan segera), commit bisa tak selesai, kurangi jumlah", () => {
    for (const x of ["`ANY` melepas commit begitu paling sedikit n standby di daftar menjawab", "Dokumentasi menulis bahwa commit bisa tidak pernah selesai bila salah satu standby sinkron yang diminta mati", "Ia menyarankan kandidat lebih banyak dari jumlah yang diminta", "jumlahnya diturunkan di `synchronous_standby_names` atau dinonaktifkan, lalu konfigurasi dimuat ulang", "Dengan satu standby lokal dan satu di wilayah pasangan, `ANY 1` bisa dilepas oleh standby lokal saja.", "Jadi \"ada satu standby di wilayah pasangan\" belum menjamin RPO nol. Daftarnya harus memaksa pasangan ikut menjawab."]) {
      expect(paham, x).toContain(x);
    }
    for (const x of ["makes transaction commits wait until their WAL records are replicated to at least num_sync listed standbys", "it will be replaced immediately with the next-highest-priority standby", "may never be completed if any one of the synchronous standbys should crash", "all the standbys appearing in the list will be used as candidates", "decrease the number of synchronous standbys"]) {
      expect(riset6, `riset: ${x}`).toContain(x);
    }
    // ADR 48 memakai ANY 1 untuk dua standby dan menulis zona, bukan wilayah (klaim negatif berlingkup: satu berkas halaman ADR 48)
    expect(adr48).toContain("`synchronous_standby_names = 'ANY 1 (r1, r2)'`");
    expect(adr48).toContain("standby di zona berbeda dari primary dan dari standby lain (Asumsi)");
    expect(adr48.split("\n").filter((b) => /wilayah/i.test(b)), "baris yang menyebut wilayah di halaman ADR 48").toEqual(["| Sinkron lintas wilayah | Jeda antar wilayah tidak diukur | [[t5-adr-60]] |"]);
    expect(adr48).toContain("| Sinkron lintas wilayah | Jeda antar wilayah tidak diukur |");
    expect(paham).toContain("Halaman itu menulis standby di zona berbeda dari primary (Asumsi), dan tidak menulis hilangnya seluruh wilayah.");
    expect(paham).toContain("ADR 48 memilih `ANY 1` untuk dua standby sinkron ([[t5-rpo-rto]]).");
  });
});

// ---- kejadian tersisa: aturan 8 ADR 47 dan efek samping primary lama -----------------------------------------------------
describe("blok Paham: yang masih terbuka sesudah failover wilayah dibaca ke halaman ADR 47 dan ADR 48", () => {
  const paham = blokMdx("Paham");
  test("aturan 8 ADR 47 dan jendela 30 detik dikutip sesuai halaman 5.7; ADR 48 tidak punya aturan efek samping (hitung aturan: delapan, tanpa kata outbox)", () => {
    expect(adr47).toContain("8. Sesudah failover, semua bacaan tampil dibaca dari primary selama jendela token. Token primary lama mungkin tidak bisa dibandingkan dengan replica baru (Asumsi: belum diuji [perlu verifikasi]).");
    expect(adr47).toContain("4. App menyimpan token selama 30 detik");
    expect(paham).toContain("Sesudah failover semua bacaan tampil dibaca dari primary selama jendela posisi WAL. Posisi dari primary lama mungkin tidak bisa dibandingkan dengan replica baru (Asumsi, belum diuji [perlu verifikasi]).");
    const aturan48 = bagian(adr48, "**Keputusan: opsi E.** Delapan aturan:", "**Kenapa E, bukan A, B, C, atau D.**");
    expect(aturan48.split("\n").filter((b) => /^\d\. /.test(b))).toHaveLength(8);
    expect(aturan48.toLowerCase()).not.toContain("outbox");
    expect(aturan48).toContain("3. Failover otomatis oleh alat dengan fencing");
    expect(paham).toContain("ADR 48 tidak punya aturan untuk ini, dan ADR 64 hanya menutup sebagian.");
  });
  test("dokumentasi: transaction yang menunggu dianggap ter-commit penuh sesudah primary pulih; rekaman: baris belum terlihat selama menunggu", () => {
    expect(paham).toContain("transaction yang menunggu konfirmasi dianggap ter-commit penuh sesudah primary pulih. Sebagian bisa tampak ter-commit di primary tetapi tidak di standby.");
    expect(paham).toContain("Wilayah utama M55 pulih 47 menit kemudian.");
    expect(paham).toContain("Rekaman di atas menulis bahwa selama COMMIT menunggu, barisnya belum terlihat oleh sesi lain.");
    expect(sinkron.join("\n")).toContain("barisnya belum terlihat oleh sesi lain di primary");
    expect(paham).toContain("Kepala `X-Lsn-Tulis` membawa posisi itu.");
    expect(adr47).toContain("X-Lsn-Tulis");
  });
});

// ---- skenario alur t6-m55.json ----------------------------------------------------------------------------------------
describe("skenario alur t6-m55.json: valid, angka dari hitungan, tebakan tanpa bocor, varian 3.000 km", () => {
  const dua = (n: number): string => fmt(n, 1);
  test("valid menurut alur-core; lima komponen; lima langkah utama; tiga langkah varian mulai dari langkah ketiga; sumber ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["app", "utama", "lokal", "pasangan", "sre"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(2);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.sumber.catatan).toContain("Batas satu akun 1 ÷ RTT adalah Penalaran [perlu verifikasi], belum diukur.");
    expect(skenario.sumber.catatan).toContain("Tahap 6 tidak punya lab: dua standby, kuorum, dan failover wilayah tidak dijalankan.");
    expect(skenario.varian.label).toBe("pasangan 3.000 km (hanya bila daftar izin negara mengizinkan, dibahas di 6.8)");
    expect(blokMdx("Coba")).toContain(`**Ubah satu hal: ${skenario.varian.label}**`);
  });
  test("tebakan: empat pilihan, jawaban di posisi pertama dengan 35% dan batas 100 (posisi paling jarang di widget Tahap 5); tiga pengecoh dari batas lain; tanpa angka varian", () => {
    const p = skenario.predict;
    const m3 = bulat(merchant(3), 1);
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(0);
    expect(p.varian).toBe(false);
    expect(p.options[0]).toBe(`Sekitar ${fmt((m3 / batas(1000)) * 100, 0)}%, karena batasnya ${fmt(batas(1000), 0)} jurnal per detik`);
    expect(p.options[1]).toBe(`Sekitar ${fmt((m3 / 1000) * 100, 1)}%, karena batasnya 1.000 jurnal per detik`);
    expect(p.options[2]).toBe(`Sekitar ${fmt((m3 / 10000) * 100, 2)}%, karena batasnya 10.000 jurnal per detik`);
    expect(p.options[3]).toBe(`Sekitar ${fmt((m3 / 10) * 100, 0)}%, karena batasnya 10 jurnal per detik`);
    expect(p.q).toContain(`${fmt(merchant(3), 1)} pembayaran uang per detik`);
    expect(p.q).toContain("tiap COMMIT menunggu wilayah pasangan sejauh 1.000 km");
    expect(p.q).toContain("Kecepatan sinyal di serat ±200.000 km per detik (Asumsi)");
    const semua = [p.q, ...p.options, skenario.pengantar].join("\n");
    for (const x of ["33,3", "104", "30 ms", "16,7", "3.000 km"]) expect(semua, `bocor varian: ${x}`).not.toContain(x);
    expect(skenario.pengantar).not.toMatch(/35%|100 jurnal|10 ms|0,01/);
    const dipakai = ["t5-kms", "t5-m40", "t5-m41", "t5-m42", "t5-m43", "t5-m44", "t5-m45", "t5-m46", "t5-m47", "t5-m48", "t5-m49", "t5-m50"].map((f) => (JSON.parse(baca(`situs/lama/widgets/data/skenario/${f}.json`)) as Skenario).predict.answer);
    const jumlah = [0, 1, 2, 3].map((i) => dipakai.filter((a) => a === i).length);
    expect(jumlah[p.answer], `posisi jawaban ${p.answer} di widget alur Tahap 5: ${jumlah.join(",")}`).toBe(Math.min(...jumlah));
    const panjang = p.options.map((o) => o.length);
    expect(panjang.filter((n) => n === Math.max(...panjang)).length === 1 && panjang[0] === Math.max(...panjang)).toBe(false);
    expect(panjang.filter((n) => n === Math.min(...panjang)).length === 1 && panjang[0] === Math.min(...panjang)).toBe(false);
  });
  test("penjelasan tebakan dan langkah utama: RTT 10 ms, batas 100, 34,7%, 35%, 23,1%, 23%, dan label Hitungan atas Asumsi serta Penalaran", () => {
    const p = skenario.predict;
    expect(p.explain).toContain(`RTT = 2 × 1.000 ÷ 200.000 = ${fmt(rtt(1000), 2)} detik, jadi batas satu akun 1 ÷ ${fmt(rtt(1000), 2)} = ${fmt(batas(1000), 0)} jurnal per detik.`);
    expect(p.explain).toContain(`Merchant besar memakai ${dua(merchant(3))} ÷ 100 = ${dua(bulat(merchant(3), 1))}%, dibulatkan 35% (Hitungan atas Asumsi).`);
    expect(p.explain).toContain(`Dengan 2 transaksi per user aktif per hari, ${dua(merchant(2))} ÷ 100 = ${dua(bulat(merchant(2), 1))}%, dibulatkan 23%.`);
    expect(p.explain).toContain("Batas 1 ÷ RTT per akun adalah Penalaran [perlu verifikasi], belum diukur.");
    const u = skenario.langkah;
    expect(u[0]!.kirim).toContain(`${dua(merchant(3))} per detik di puncak (Asumsi cerita)`);
    expect(u[0]!.jelas).toContain(`Angka ${dua(merchant(3))} adalah 5% dari puncak ${dua(puncak(3))} transaksi uang per detik di tiga negara (Hitungan atas Asumsi cerita).`);
    expect(u[2]!.kirim).toContain(`RTT = 2 × 1.000 ÷ 200.000 = 0,01 detik = ${fmt(rtt(1000) * 1000, 0)} ms (Hitungan atas Asumsi)`);
    expect(u[2]!.jelas).toContain("waktu tunggu minimum adalah round-trip time antara primary dan standby");
    expect(u[3]!.kirim).toContain(`batas satu akun: 1 ÷ 0,01 = ${fmt(batas(1000), 0)} per detik; terpakai ${dua(merchant(3))} ÷ 100 = ${dua(bulat(merchant(3), 1))}%, dibulatkan 35% (2 transaksi: 23%)`);
    expect(u[3]!.nada).toBe("good");
    expect(u[4]!.kirim).toContain(`RTO wilayah ${RTO_WIL} menit (Asumsi produk)`);
    expect(u[4]!.jelas).toContain("(aturan 1, Penalaran, Tidak dijalankan)");
    expect(u[1]!.kirim).toContain("aturan 1 ADR 64: keduanya wajib");
    expect(u[4]!.nada).toBe("good");
  });
  test("varian 3.000 km: RTT 30 ms, batas 33,3, 104% (69% dengan 2 transaksi), alert 50% di 16,7, di bawah 50 ms ADR 48", () => {
    const v = skenario.varian.langkah;
    const b3 = bulat(batas(3000), 1);
    const m3 = bulat(merchant(3), 1);
    const m2 = bulat(merchant(2), 1);
    expect(v[0]!.kirim).toContain(`RTT = 2 × 3.000 ÷ 200.000 = ${fmt(rtt(3000), 2)} detik = ${fmt(rtt(3000) * 1000, 0)} ms (Hitungan atas Asumsi)`);
    expect(v[0]!.jelas).toContain("Waktu tunggu minimum tiap COMMIT naik dari 10 ms ke 30 ms.");
    expect(v[0]!.jelas).toContain("Angka 30 ms masih di bawah 50 ms, anggaran tambahan p95 satu lompatan di ADR 48 (Asumsi).");
    expect(adr48).toContain("Saat tambahan p95 COMMIT pembayaran akibat standby sinkron melewati 50 ms, anggaran satu lompatan di [[t4-modul]] (Asumsi).");
    expect(adr37).toContain("Anggarannya 50 ms.");
    expect(v[1]!.kirim).toContain(`batas 1 ÷ 0,03 = ${fmt(b3, 1)} per detik; terpakai ${dua(m3)} ÷ ${fmt(b3, 1)} = ${fmt((m3 / b3) * 100, 0)}% (2 transaksi: ${dua(m2)} ÷ ${fmt(b3, 1)} = ${fmt((m2 / b3) * 100, 0)}%)`);
    expect(v[1]!.nada).toBe("warn");
    expect(v[1]!.jelas).toContain("(Penalaran, [perlu verifikasi])");
    expect(v[2]!.kirim).toContain(`alert pada 0,5 × ${fmt(b3, 1)} = ${fmt(0.5 * b3, 1)} per detik, sedangkan merchant itu memakai ${dua(m3)} (Hitungan atas Asumsi)`);
    expect(v[2]!.jelas).toContain("ADR 64 menulis 3.000 km hanya bila daftar izin negara mengizinkan, dengan alert pada 50% batas.");
    expect(v[2]!.nada).toBe("warn");
    expect(m3).toBeGreaterThan(0.5 * b3);
  });
  test("jalur varian tidak membuka jawaban tebakan jalur utama: tebakan jalur utama, varian.mulai di antara langkah", () => {
    expect((core as unknown as { jalurTebakan: (d: unknown) => string }).jalurTebakan(skenario)).toBe("utama");
    expect(skenario.varian.mulai).toBeGreaterThan(0);
    expect(skenario.varian.mulai).toBeLessThan(skenario.langkah.length);
  });
});

// ---- ADR 64 -----------------------------------------------------------------------------------------------------------------
describe("blok Putuskan: ADR 64 sesuai naskah, enam opsi, delapan aturan, pre-mortem, kapan salah, sengaja belum", () => {
  const putus = blokMdx("Putuskan");
  const opsi = tabelDari(putus, "| Opsi |");
  test("kebutuhan dan status: M55, RPO nol, RTO wilayah 30 menit Asumsi produk, pemicu ADR 60 dibaca ke halaman 5.30", () => {
    expect(putus).toContain("**Kebutuhan.** M55: wilayah hilang 47 menit, melewati RTO wilayah 30 menit, dan sekitar 63 transaksi yang dijawab sukses tidak ada di pasangan (Ilustrasi).");
    expect(putus).toContain("RPO nol dan RTO wilayah 30 menit (Asumsi produk, [[t6-prd]])");
    expect(putus).toContain("Pemicu multi-region di ADR 60 terpenuhi untuk aktif-pasif ([[t5-adr-60]], [[t6-fitur-teknis]]).");
    expect(adr60).toContain("| 2. Multi-region | Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya |");
    expect(putus).toContain("**Status:** diterima sesudah M55 (minggu 12). Urutan itu dibaca dari tabel masalah naskah, karena naskah tidak menulis tanggal ADR.");
    expect(naskah).toContain("PRD v6 memintanya, dan M55 menulis 47 menit mati (Ilustrasi): terpenuhi untuk aktif-pasif");
  });
  test("tabel opsi: tujuh baris A sampai G dalam urutan naskah, enam kolom, G dipilih, tiap baris berlabel Bukti", () => {
    expect(opsi[0]).toEqual(["Opsi", "Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(opsi).toHaveLength(8);
    for (const r of opsi.slice(1)) expect(r).toHaveLength(6);
    expect(opsi.slice(1).map((r) => r[0]!.slice(0, 2))).toEqual(["A.", "B.", "C.", "D.", "E.", "F.", "G."]);
    const kata = ["Aktif-aktif", "Asinkron saja", "Backup dan restore", "Pilot light atau warm standby", "Layanan terkelola multi-region", "Failover otomatis penuh", "Aktif-pasif per negara"];
    kata.forEach((k, i) => expect(opsi[i + 1]![0], `opsi ${i}`).toContain(k));
    expect(opsi[7]![0]).toBe("G. Aktif-pasif per negara dengan `ANY 2 (lokal, pasangan)`");
    for (const r of opsi.slice(1)) expect(r[5], r[0]).toMatch(/Tidak dijalankan|Rekaman lab Tahap 5/);
    expect(opsi[2]![5]).toContain("Rekaman lab Tahap 5 (`promosi.txt` bagian A, satu mesin)");
    expect(opsi[2]![3]).toContain("RPO di atas nol: 416,7 transaksi per detik jeda di negara terbesar");
    expect(opsi[1]![3]).toContain("34,7 per detik melewati 33,3 pada 3.000 km");
    expect(opsi[5]![4]).toBe("Biaya penyedia, belum dihitung");
    expect(opsi[5]![3]).toContain("([[t5-onprem]] aturan 3)");
    expect(adr59).toContain("3. PostgreSQL dipakai dalam bentuk standar.");
    expect(adr59).toContain("Tidak ada ekstensi atau fitur yang hanya ada di satu penyedia.");
    expect(adr59).toContain("Produksi database dijalankan sendiri atau terkelola belum diputuskan.");
  });
  test("keputusan opsi G dengan delapan aturan bernomor; aturan 1 ANY 2 (lokal, pasangan) dan on; aturan 2 angka; aturan 3 34,7%; aturan 8 dua hal terbuka", () => {
    const aturan = bagian(putus, "**Keputusan: opsi G.** Delapan aturan:", "**Kenapa G, bukan A sampai F.**");
    const butir = aturan.split("\n").filter((b) => /^\d\. /.test(b));
    expect(butir).toHaveLength(8);
    butir.forEach((b, i) => expect(b.startsWith(`${i + 1}. `)).toBe(true));
    expect(butir[0]).toContain("Daftar `synchronous_standby_names` berisi `ANY 2 (lokal, pasangan)`, dan `synchronous_commit` bernilai `on`.");
    expect(butir[0]).toContain("Nama `lokal` dan `pasangan` adalah `application_name` dua standby: satu di wilayah primary dan satu di wilayah pasangan (Asumsi desain, Tidak dijalankan).");
    expect(butir[1]).toContain(`RTT paling sedikit ${fmt(rtt(1000) * 1000, 0)} ms, dan batas satu akun ${fmt(batas(1000), 0)} per detik.`);
    expect(butir[1]).toContain(`Pada jarak itu batas satu akun ${fmt(bulat(batas(3000), 1), 1)} per detik, dan alert menyala di 50% batas, yaitu ${fmt(0.5 * bulat(batas(3000), 1), 1)} per detik.`);
    expect(butir[1]).toContain("([[t6-residensi]], dibahas di 6.8)");
    expect(butir[2]).toContain(`15 ÷ ${fmt(anggaran, 1)} = ${fmt((RTO_MESIN / anggaran) * 100, 1)}% anggaran, seperti ADR 48.`);
    expect(adr48).toContain("Pemulihan manual sepanjang RTO 15 menit memakai 15 ÷ 43,2 = 34,7% anggaran.");
    expect(butir[3]).toContain("([[t5-read-replica]])");
    expect(butir[4]).toContain("Fencing lebih dulu: primary lama dan relay outbox-nya dimatikan sebelum pasangan dipromosikan. ADR 48 aturan 3 tetap untuk satu mesin di dalam satu wilayah.");
    expect(butir[5]).toContain("keadaan degenerate di dokumentasi PostgreSQL");
    expect(butir[5]).toContain("daftar yang menyebut standby yang tidak ada menahan COMMIT transaksi tulis");
    expect(butir[6]).toContain("tiap kuartal");
    expect(butir[6]).toContain("RTO wilayah 30 menit (Asumsi produk)");
    expect(butir[6]).toContain("Latihan satu mesin tiap bulan dari ADR 48 tetap berjalan.");
    expect(adr48).toContain("8. SRE melatih failover tiap bulan");
    expect(butir[7]).toContain("Dua hal tetap terbuka.");
    expect(butir[7]).toContain("Efek samping dari primary lama belum punya aturan sejak ADR 48.");
    expect(butir[7]).toContain("ADR ini tidak menentukan siapa mencocokkan jurnal dan baris outbox yang hanya ada di primary lama.");
  });
  test("kenapa G: enam butir A sampai F, ditolak atau ditunda atau dipakai bersama sesuai tabel; kasus industri Spanner dengan batas", () => {
    const kenapa = bagian(putus, "**Kenapa G, bukan A sampai F.**", "**Kasus industri: Spanner.**");
    const b = kenapa.split("\n").filter((x) => x.startsWith("- "));
    expect(b.map((x) => x.slice(2, 4))).toEqual(["**", "**", "**", "**", "**", "**"]);
    expect(b.map((x) => x.match(/^- \*\*([A-F])\b/)?.[1])).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(b[0]).toContain("A ditolak");
    expect(b[1]).toContain("B ditolak");
    expect(b[1]).toContain("5 jurnal 201 yang hilang di satu mesin");
    expect(b[1]).toContain("jeda 1 detik berarti 416,7 transaksi di negara terbesar (Hitungan atas Asumsi)");
    expect(b[2]).toContain("C ditolak untuk hilangnya wilayah");
    expect(b[3]).toContain("D dipakai bersama G untuk lapisan aplikasi");
    expect(b[4]).toContain("E ditunda");
    expect(b[5]).toContain("F ditolak untuk wilayah");
    expect(b[5]).toContain("rekaman Tahap 5 menunjukkan dua primary tanpa fencing");
    expect(putus).toContain("**Kasus industri: Spanner.** Makalah itu menulis F1 dengan lima replica di Amerika Serikat.");
    expect(putus).toContain("Batasnya: perkiraan penulis untuk infrastruktur Google dengan jam GPS dan jam atom, tahun 2012. Itu satu sistem dan satu makalah, bukan bukti untuk pembayaran Rekeningo (Tidak dijalankan).");
  });
  test("pre-mortem: tiga penyebab; kapan salah: lima butir dengan angka dari hitungan, sama dengan lima syarat naskah", () => {
    const pre = bagian(putus, "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:", "**Kapan keputusan ini salah.**");
    expect(pre.split("\n").filter((x) => /^\d\. /.test(x))).toHaveLength(3);
    const salah = bagian(putus, "**Kapan keputusan ini salah.**", "**Yang akan merevisinya.**").split("\n").filter((x) => x.startsWith("- "));
    expect(salah).toHaveLength(5);
    expect(salah[0]).toContain("Saat p95 COMMIT pembayaran melewati 50 ms.");
    expect(salah[0]).toContain("bukan anggaran skor risiko M51 (arti berbeda, Asumsi)");
    expect(salah[0]).toContain("tambahan paling sedikit 10 ms pada 1.000 km dan 30 ms pada 3.000 km");
    const m3 = bulat(merchant(3), 1);
    const m2 = bulat(merchant(2), 1);
    expect(salah[1]).toContain(`Pada 1.000 km: ${fmt(m3, 1)} ÷ 100 = 35% (2 transaksi: 23%), masih di bawah.`);
    expect(salah[1]).toContain("Pada 3.000 km: 104% (2 transaksi: 69%), sudah di atas (Hitungan atas Asumsi).");
    expect(m3 / 100).toBeLessThan(0.5);
    expect(m3 / bulat(batas(3000), 1)).toBeGreaterThan(0.5);
    expect(m2 / bulat(batas(3000), 1)).toBeGreaterThan(0.5);
    expect(salah[2]).toContain(`Pembanding: ${HENTI} menit di M55 (Ilustrasi), atau ${HENTI - RTO_WIL} menit di atas RTO wilayah.`);
    expect(salah[3]).toContain("wilayah pasangan dalam 1.000 km yang diizinkan daftar izinnya");
    expect(salah[4]).toContain(`lebih dari ${RTO_MESIN} menit, yaitu ${fmt((RTO_MESIN / anggaran) * 100, 1)}% anggaran ${fmt(anggaran, 1)} menit`);
    for (const x of ["P95 commit pembayaran melewati 50 ms", "Merchant melewati 50% batas per akun", "Latihan wilayah lebih dari 30 menit", "Negara tanpa pasangan dalam 1.000 km yang diizinkan", "Standby sinkron mati"]) expect(barisAdr64[3], x).toContain(x);
  });
  test("yang akan merevisinya menunjuk 6.8, 6.10, 6.11 tanpa mengutip isi halaman yang belum ada; sengaja belum: enam baris, tiga kolom", () => {
    const rev = bagian(putus, "**Yang akan merevisinya.**", "\n\n### Sengaja belum dilakukan");
    expect(rev).toContain("[[t6-residensi|Halaman 6.8]] membahas daftar izin negara (ADR 66), yang menentukan apakah pasangan 3.000 km boleh.");
    expect(rev).toContain("[[t6-tim-infra|Halaman 6.10]] membahas giliran jaga lintas tim (ADR 68).");
    expect(rev).toContain("[[t6-adr-69|Halaman 6.11]] membahas hal yang sengaja belum dikerjakan di Tahap 6, termasuk aktif-aktif (ADR 69).");
    const sb = tabelDari(putus, "| Yang ditunda |");
    expect(sb[0]).toEqual(["Yang ditunda", "Kenapa ditunda", "Muncul lagi di"]);
    expect(sb).toHaveLength(7);
    for (const r of sb.slice(1)) expect(r).toHaveLength(3);
    expect(sb.slice(1).map((r) => r[0])).toEqual(["Aktif-aktif", "Failover wilayah otomatis penuh", "Pilot light atau warm standby untuk lapisan aplikasi", "Standby sinkron ketiga di pasangan, yaitu `ANY 2` dari tiga", "Aturan untuk baris di primary lama", "Rekaman dua wilayah"]);
    expect(sb[1]![2]).toBe("[[t6-adr-69]]");
    expect(naskah).toContain("| 69 | Sengaja belum (Tahap 6): service mesh penuh; multi-region aktif-aktif;");
  });
});

// ---- Cek diri dan kartu ----------------------------------------------------------------------------------------------------
describe("blok Kunci: lima soal Cek diri, jawaban dari hitungan, kartu.json sama dengan soal", () => {
  const kunci = blokMdx("Kunci");
  const soal = [...kunci.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("lima soal bernomor 1 sampai 5, tiap soal satu details Jawaban", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3", "4", "5"]);
    expect(soal[0]!.tanya).toContain("`ANY 1 (lokal, pasangan)`");
    expect(soal[0]!.jawab).toContain("ADR 64 memakai `ANY 2` supaya pasangan wajib ikut (Penalaran, Tidak dijalankan).");
    expect(soal[2]!.jawab).toContain("menurut dokumentasi AWS");
    expect(soal[2]!.jawab).toContain("ADR 48 aturan 3 hanya untuk satu mesin di dalam satu wilayah.");
  });
  test("jawaban hitungan: soal 2 (35%, 104%), soal 4 (lima jurnal, aturan 1 dan 5), soal 5 (108,8%, 17 menit)", () => {
    const m3 = bulat(merchant(3), 1);
    expect(soal[1]!.tanya).toContain(`${fmt(m3, 1)} jurnal per detik`);
    expect(soal[1]!.jawab).toContain(`RTT 10 ms memberi batas 100 per detik, jadi ${fmt(m3, 1)} ÷ 100 = ${fmt((m3 / 100) * 100, 0)}%.`);
    expect(soal[1]!.jawab).toContain(`RTT 30 ms memberi batas ${fmt(bulat(batas(3000), 1), 1)}, jadi ${fmt(m3, 1)} ÷ ${fmt(bulat(batas(3000), 1), 1)} = ${fmt((m3 / bulat(batas(3000), 1)) * 100, 0)}%.`);
    expect(soal[3]!.jawab).toContain("Aturan 1 meminta pasangan menjawab sebelum jawaban terkirim.");
    expect(soal[3]!.jawab).toContain("aturan 5 meminta fencing lebih dulu");
    expect(soal[4]!.jawab).toBe(`${HENTI} ÷ ${fmt(anggaran, 1)} = ${fmt((HENTI / anggaran) * 100, 1)}%, dan ${HENTI} − ${RTO_WIL} = ${HENTI - RTO_WIL} menit di atas RTO wilayah ${RTO_WIL} menit (Hitungan atas Ilustrasi dan Asumsi).`);
    expect(soal[4]!.tanya).toContain("anggaran 43,2 menit");
  });
  test("kartu.json memuat lima kartu t6-m55 dengan id, judul registry, url, tanya dan jawab sama dengan soal", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t6-m55");
    expect(kartu).toHaveLength(5);
    kartu.forEach((k, i) => {
      expect(k.id).toBe(`t6-m55-${i + 1}`);
      expect(k.judul).toBe(`6.6 ${dari("t6-m55").judul}`);
      expect(k.url).toBe("tahap-6/m55-wilayah-hilang/");
      expect(k.tanya).toBe(soal[i]!.tanya);
      expect(k.jawab.replace(/\s+/g, " ")).toBe(soal[i]!.jawab.replace(/\s+/g, " "));
    });
  });
  test("daftar periksa review dan bacaan lanjut: lima butir; tiga tautan dokumentasi PostgreSQL, satu AWS, satu Spanner", () => {
    expect(kunci.split("\n").filter((b) => b.startsWith("- [ ] "))).toHaveLength(5);
    expect(kunci).toContain("- [ ] Daftar standby sinkron memaksa pasangan ikut. `ANY 1` dengan satu standby lokal tidak menjamin itu.");
    expect(kunci).toContain("- [ ] Tidak ada kode atau sesi yang menurunkan `synchronous_commit` ke `local` atau `off` untuk tulisan uang.");
    const lanjut = bagian(kunci, "### Bacaan lanjut", "Halaman berikutnya");
    expect([...lanjut.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1])).toEqual([
      "https://www.postgresql.org/docs/17/warm-standby.html",
      "https://www.postgresql.org/docs/17/runtime-config-replication.html",
      "https://www.postgresql.org/docs/17/warm-standby-failover.html",
      "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
      "https://www.usenix.org/system/files/conference/osdi12/osdi12-final-16.pdf",
    ]);
  });
});

// ---- sumber eksternal, label, kata, dan ID yang tidak boleh tampil --------------------------------------------------------
describe("sumber eksternal bertanggal akses, label, satu kata per konsep, dan ID yang tidak tampil", () => {
  const teksSemua = [badan, front, skenarioMentah, JSON.stringify(kartuSemua.filter((k) => k.halaman === "t6-m55"))].join("\n");
  test("tiap tautan eksternal di prosa diikuti ', dibuka 2026-11-06'; URL ada di baris riset R6-135 sampai R6-138", () => {
    const prosa = badan.split("### Bacaan lanjut")[0]!;
    const url = [...prosa.matchAll(/\]\((https:\/\/[^)]+)\)(.{0,40})/g)];
    expect(url).toHaveLength(7);
    for (const u of url) expect(u[2], u[1]).toMatch(/^, dibuka 2026-11-06/);
    const riset = riset6.split("\n").filter((b) => /^\| R6-13[5-8] \|/.test(b)).join("\n");
    for (const f of ["warm-standby.html", "runtime-config-replication.html", "warm-standby-failover.html", "docs.aws.amazon.com", "disaster-recovery-options-in-the-cloud", "osdi12-final-16.pdf"]) {
      expect(riset, `riset memuat ${f}`).toContain(f);
      expect(badan, `halaman memuat ${f}`).toContain(f);
    }
    expect(hitungKata(badan, "xact.c")).toBe(1);
    expect(riset).toContain("baris 1536 sampai 1544 sebelum `SyncRepWaitForLSN` (baris 1546)");
  });
  test("Rekaman lab hanya untuk Tahap 5 atau kalimat 'tidak punya Rekaman lab Tahap 6'; tiga label sumber yang dipakai ada di cara-pakai", () => {
    const baris = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(baris).toHaveLength(5);
    for (const b of baris) expect(b, b.slice(0, 60)).toMatch(/Rekaman lab Tahap [56]/);
    expect(blokMdx("Coba")).toContain("Halaman ini tidak punya Rekaman lab Tahap 6, karena Tahap 6 tidak punya lab.");
    const cara = baca("situs/src/content/docs/cara-pakai.mdx");
    for (const l of ["Rekaman lab", "Ilustrasi", "Asumsi", "Tidak dijalankan", "[perlu verifikasi]"]) expect(cara, l).toContain(l);
    for (const l of ["Hitungan", "Penalaran"]) expect(blokMdx("Coba"), l).toContain(`- **${l}:**`);
  });
  test("satu kata per konsep dan tanpa kata yang punya dua arti di Tahap 3 sampai 5", () => {
    const prosa = [badan, skenarioMentah].join("\n").replace(/labs\/t5-replika/g, "labs/t5-x");
    for (const kata of ["token", "router", "client", "klien", "log", "nonce", "replika", "penerbit", "mesh", "On-call", "Sharding"]) {
      expect(prosa, `kata terlarang: ${kata}`).not.toMatch(new RegExp(`\\b${kata}\\b`, "i"));
    }
    expect(prosa).not.toMatch(/\bAnda\b|\bpengguna\b/);
    expect(prosa).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(hitungKata(badan.toLowerCase(), "zona"), "zona hanya di kalimat tentang ADR 48").toBe(1);
    expect(hitungKata(badan, "wilayah pasangan") + hitungKata(badan, "Wilayah pasangan")).toBeGreaterThanOrEqual(8);
  });
  test("ID riset, nomor keputusan, nomor PR, dan kode lab tidak tampil di halaman, widget, kartu, dan deskripsi", () => {
    expect(teksSemua).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(teksSemua).not.toMatch(/\b[Kk]eputusan \d{2,4}\b/);
    expect(teksSemua).not.toMatch(/\bPR #?\d{2,4}\b|#\d{3}\b/);
    expect(badan).not.toContain("TINJAUAN-PEMILIK");
  });
  test("klaim universal berkata penuh: 'tidak pernah', 'selalu', 'semua', 'setiap' dibatasi pada kalimat yang diperiksa", () => {
    const kalimat = badan.split(/(?<=[.!?])\s+|\n/).filter((k) => /\b(selalu|tidak pernah|tak pernah|semua|setiap|seluruh)\b/i.test(k));
    const harap = [
      "Bila seluruh transaksi lewat satu primary, hasilnya 694 (463).",
      "Jeda 5 detik mengalikan semuanya 5 kali (Hitungan atas Asumsi).",
      "Keduanya menjawab pertanyaan Sinta dengan menyingkirkan manusia dari langkah pindah.",
      "Konsistensi kuat lintas wilayah punya harga yang sama bagi perancang mana pun.",
    ];
    for (const h of harap) expect(badan, h).toContain(h);
    expect(kalimat.length, kalimat.join(" | ").slice(0, 600)).toBeLessThanOrEqual(12);
    const tanpaCatatan = kalimat.filter((k) => !k.includes("commit bisa tidak pernah selesai bila salah satu standby sinkron yang diminta mati"));
    for (const k of tanpaCatatan) expect(k, "kata penuh tanpa lingkup").not.toMatch(/\b(selalu|tidak pernah|tak pernah)\b/i);
    expect(kalimat.length - tanpaCatatan.length, "kalimat 'tidak pernah selesai' mengutip dokumentasi PostgreSQL 17 (may never be completed)").toBe(1);
  });
  test("tabel GFM: jumlah kolom sama di header, pemisah, dan tiap baris (lima tabel prosa dan empat tabel dirender)", () => {
    const blokTabel = badan.split("\n\n").filter((p) => p.trim().startsWith("|"));
    expect(blokTabel).toHaveLength(4);
    for (const t of blokTabel) {
      const baris = t.split("\n");
      const n = sel(baris[0]!).length;
      for (const b of baris) expect(sel(b).length, b.slice(0, 50)).toBe(n);
      expect(/^\|[-| ]+\|$/.test(baris[1]!)).toBe(true);
    }
    expect(blokTabel.map((t) => sel(t.split("\n")[0]!).length)).toEqual([5, 4, 6, 3]);
  });
});

// ---- baris riset dan sidik -----------------------------------------------------------------------------------------------------
describe("baris riset R6-135 sampai R6-139 dan sidik teks", () => {
  test("lima baris riset berurutan naik tanpa ganda, lima kolom, bertanggal 2026-11-06; sama dengan sidik; tetangga tidak dikunci", () => {
    const baris = riset6.split("\n").filter((b) => /^\| R6-13[5-9] \|/.test(b));
    expect(baris.map((b) => b.slice(2, 8))).toEqual(["R6-135", "R6-136", "R6-137", "R6-138", "R6-139"]);
    for (const b of baris) {
      expect(sel(b), b.slice(0, 20)).toHaveLength(5);
      expect(b).toContain("2026-11-06");
    }
    expect(baris).toEqual(BARIS_RISET);
    const semuaId = [...riset6.matchAll(/^\| (R6-\d+) /gm)].map((m) => m[1]!);
    expect(new Set(semuaId).size, "ID riset ganda").toBe(semuaId.length);
    expect(riset6).toContain("KOREKSI: naskah, ANTREAN 6.6, dan R6-35 menulis dokumentasi \"tidak membahas lock\", padahal §26.2.8.3 membahasnya");
    expect(riset6).toContain("Dikoreksi 2026-11-06: semula \"dokumentasi tidak membahas lock\" (R6-35, R5-250)");
  });
  test("sidik teks: tiap baris tak kosong sama dengan BARIS_MDX, dan bentuk (baris kosong dan isi) sama dengan BENTUK_MDX", () => {
    const baris = mdx.split("\n");
    expect(baris.filter((b) => b.trim())).toEqual(BARIS_MDX);
    expect(baris.map((b) => (b.trim() ? "#" : "-")).join("")).toBe(BENTUK_MDX);
  });
});
