// Penjaga halaman 5.32 (keputusan 1624 sampai 1626): angka, nomor ADR, nomor halaman, kalimat yang dikutip dari halaman ADR Tahap 5,
// klaim negatif berlingkup, dan isi tebakan di jembatan-prd-v6.mdx dan t5-jembatan-tebak.json diturunkan dari registry cerita.json,
// naskah Tahap 5, PROPOSAL, dan halaman Tahap 4 dan 5, bukan dari daftar yang ditulis sendiri. Halaman ini TANPA LAB: tiap angka
// berlabel Asumsi, Hitungan, atau Ilustrasi, dan tidak ada rekaman yang dikutip. Tebakannya tidak membuka jawaban Tahap 6:
// pilihan benar adalah yang cocok dengan kalimat halaman ADR Tahap 5, dan jawabannya dibuka di halaman pertama Tahap 6.
// Tiga lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dan teks
// widget dikunci per baris lewat jembatan-prd-v6.halaman.nilai.ts, supaya satu kata yang berubah gagal; (3) janji "dibuka di
// halaman pertama Tahap 6" punya penerima: begitu registry memuat halaman Tahap 6, halaman pertamanya diperiksa di sini.
// Kalimat terkunci tidak menangkap SALAHNYA kalimat, jadi tiap kalimat yang menyatakan isi halaman ADR dibaca ulang dari halaman itu.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../../data/cerita.json";
import { cekTemplat, daftarBlok } from "../../lib/blok";
import { DataTebak } from "./skema";
import { nilai } from "./logika";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX, NILAI_TEBAK } from "./jembatan-prd-v6.halaman.nilai";

const akar = path.resolve(__dirname, "../../../..");
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
const T4 = (f: string) => baca(`situs/src/content/docs/tahap-4/${f}`);
const T5 = (f: string) => baca(`situs/src/content/docs/tahap-5/${f}`);

const BERKAS = "situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx";
const BERKAS_JSON = "situs/data/widget/t5-jembatan-tebak.json";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const jsonMentah = baca(BERKAS_JSON);
const data = DataTebak.parse(JSON.parse(jsonMentah));
const naskah5 = baca("plan/CERITA-TAHAP-5.md");
const proposal = baca("plan/PROPOSAL.md");
const bagian = (naskah: string, awal: string): string => {
  const i = naskah.indexOf(awal);
  expect(i, `naskah tidak memuat bagian: ${awal}`).toBeGreaterThanOrEqual(0);
  return naskah.slice(i).split("\n## ")[0]!;
};
const bag6 = bagian(naskah5, "## 6. Jembatan ke Tahap 6");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");

interface H { id: string; judul: string; path?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; masalah?: string; pendek?: string; topik?: string; lab?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const r = dari("t5-jembatan");
const isi = (id: string): string => T5(path.basename(dari(id).path!, ".md") + ".mdx");

const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const ada = (teks: string, kalimat: string, nama = "sumber") => expect(teks, `${nama} tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const KATA: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 10: "sepuluh" };

const teksWidget = [data.adegan.join(" "), data.pertanyaan, data.penutup, data.sumber.teks, data.label.sumber, ...data.pilihan.flatMap((p) => [p.teks, p.alasan])].join("\n");

// "Kapan keputusan ini salah" di halaman ADR: butir daftar, dan baris tabel bila halaman memakai tabel (ADR 59 dan ADR 60).
const kapanSalah = (teks: string): string[] => {
  const i = teks.indexOf("**Kapan keputusan ini salah.**");
  expect(i, "halaman ADR tanpa bagian kapan salah").toBeGreaterThanOrEqual(0);
  const bagianSalah = teks.slice(i).split("**Yang akan merevisinya.**")[0]!;
  return bagianSalah.split("\n").filter((b) => b.startsWith("- ")).map((b) => b.slice(2));
};
const barisTabel = (teks: string, awal: string): string[] => {
  const b = teks.split("\n").filter((x) => x.startsWith(awal));
  expect(b, `baris tabel ${awal}`).toHaveLength(1);
  return b[0]!.split("|").slice(1, -1).map((x) => x.trim());
};

// ---- Nilai dari registry, naskah, rumus, dan halaman tetangga -------------------------------------------------------------
type Asumsi = { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string };
const a5 = cerita.tahap[4]!.asumsi as unknown as Asumsi;
const N4 = cerita.tahap[3]!.no;
const N5 = cerita.tahap[4]!.no;
const N6 = cerita.proyeksi[0]!.no;
const user6 = Number(cocok(bag6, /^- Skala: (\d+) juta user\.$/m)[1]) * 1_000_000;
const rasio = user6 / a5.user;
const timNaskah = cocok(bag6, /Tim naik dari (\d+) menjadi lebih dari (\d+) developer dalam lebih dari (\d+) tim \(PROPOSAL\)/);
const prd5 = T5("prd-v5.mdx");
const tim5 = cocok(prd5, /^Totalnya 4 × 6 \+ 2 × 2 = (\d+) orang\. Isinya lima tim produk \(.+\) dan tiga tim fungsi \(Platform, SRE, Security\)\.$/m);
const daftarAdr = hal.filter((h) => h.tahap === 5 && h.adr).flatMap((h) => h.adr!);
const adrTahap5 = Array.from(new Set(daftarAdr)).sort((x, y) => x - y);
const halamanAdr = (n: number): H => {
  const h = hal.filter((x) => x.tahap === 5 && x.adr?.includes(n));
  expect(h.length, `ADR ${n} harus punya tepat satu halaman Tahap 5`).toBe(1);
  return h[0]!;
};

describe("nilai turunan: sumber dan hitungan itu sendiri", () => {
  test("10 juta user dari naskah bagian 6 dan 1 juta dari registry Tahap 5: 10 kali; 28 orang dari 4 × 6 + 2 × 2; ADR 46 sampai 60 adalah 15", () => {
    expect(user6).toBe(10_000_000);
    expect(a5.user).toBe(1_000_000);
    expect(rasio).toBe(10);
    ada(badan, `${titik(user6)} ÷ ${titik(a5.user)} = ${rasio} (Hitungan atas Asumsi cerita)`, "halaman");
    ada(badan, `(Hitungan: ${titik(user6)} ÷ ${titik(a5.user)})`, "halaman");
    expect(4 * 6 + 2 * 2).toBe(Number(tim5[1]));
    expect([timNaskah[1], timNaskah[2], timNaskah[3]]).toEqual(["28", "50", "10"]);
    expect(Number(timNaskah[1])).toBe(Number(tim5[1]));
    expect([N4, N5, N6]).toEqual([4, 5, 6]);
    expect(adrTahap5[0]).toBe(46);
    expect(adrTahap5[adrTahap5.length - 1]).toBe(60);
    expect(adrTahap5).toHaveLength(60 - 46 + 1);
    harus(`Tahap ${N5} menghasilkan ADR ${adrTahap5[0]} sampai ${adrTahap5[adrTahap5.length - 1]}.`);
    harus(`Tebakan membandingkan lima dari lima belas ADR Tahap ${N5}`);
    expect(adrTahap5.length).toBe(15);
    ada(data.adegan[0]!, `Raka membuka ADR ${adrTahap5[0]} sampai ${adrTahap5[adrTahap5.length - 1]} yang lahir di Tahap ${N5}.`, "widget");
  });
  test("naskah bagian 6: enam isi PRD v6 dan tim; tiap frasa naskah ada di kolom PRD v6 tabel pertama", () => {
    const butir = [...bag6.matchAll(/^- (.+)\.$/gm)].map((m) => m[1]!);
    expect(butir).toEqual([
      "Skala: 10 juta user",
      "Multi-region aktif-pasif",
      "Skor risiko real-time dan graf akun-perangkat, oleh tim fraud dan compliance engineering",
      "Platform internal: golden path, service catalog, dan SLO per tim",
      "Chaos testing dan data mesh sederhana",
      "Multi-mata uang dan kurs, data per negara, dan pemisahan database per wilayah (tabel pertumbuhan naskah Tahap 2, bukan PROPOSAL)",
    ]);
    const tabel = badan.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| Isi PRD v6") && !b.startsWith("|---"));
    const pertama = tabel.slice(0, 7).map((b) => b.split("|").slice(1, -1).map((x) => x.trim()));
    expect(pertama[0]).toEqual(["", "PRD v5", "PRD v6 (Ilustrasi)"]);
    const kolomV6 = pertama.slice(1).map((x) => x[2]!.toLowerCase());
    expect(kolomV6).toHaveLength(KATA[6] ? 6 : 0);
    const gabung = kolomV6.join(" | ");
    for (const frasa of ["10.000.000 user", "multi-region aktif-pasif", "skor risiko real-time", "graf akun-perangkat", "fraud dan compliance engineering", "golden path", "service catalog", "slo per tim", "chaos testing", "data mesh sederhana", "multi-mata uang", "kurs", "data yang disimpan per negara", "database yang dipisah per wilayah"]) ada(gabung, frasa, "kolom PRD v6");
    expect(Number(timNaskah[2])).toBe(50);
    expect(kolomV6[5]).toBe(`lebih dari ${timNaskah[2]} developer dalam lebih dari ${timNaskah[3]} tim (asumsi cerita)`);
    expect(pertama[6]![1]).toBe(`${tim5[1]} orang dalam delapan tim (Asumsi cerita)`);
    expect(pertama.map((x) => x[0])).toEqual(["", "Skala", "Wilayah", "Risiko", "Platform", "Uang dan data", "Tim"]);
  });
  test("PRD v5: empat isi P2 yang ditunda ke v6, dan multi-mata uang bukan lingkup; isi lain PRD v6 tidak ada di baris P2 itu", () => {
    const p2 = barisTabel(prd5, "| P2 |");
    expect(p2).toEqual(["P2", "Ditunda ke v6", "Multi-region, skor risiko real-time, platform internal untuk lebih dari 50 developer, 10 juta user"]);
    ada(prd5, "**Bukan lingkup v5:** pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, dan multi-mata uang.", "5.1");
    for (const x of ["graf akun-perangkat", "chaos testing", "data mesh", "multi-mata uang", "per negara", "database per wilayah"]) expect(p2.join(" ").toLowerCase(), x).not.toContain(x);
    harus("PRD v5 sudah menulis empat isi PRD v6 sebagai P2 yang ditunda ke v6 ([[t5-prd]]). Keempatnya multi-region, skor risiko real-time, platform internal untuk lebih dari 50 developer, dan 10 juta user.");
    expect(hitung(prd5.toLowerCase(), "per negara")).toBe(0);
    expect(hitung(prd5, "mata uang")).toBe(1);
    expect(hitung(prd5.toLowerCase(), "database per wilayah")).toBe(0);
  });
  test("keadaan terdekat di Tahap 5 dibaca dari 5.1 dan 5.29, bukan dari ingatan", () => {
    const m51 = isi("t5-m51");
    ada(m51, "Lab `t5-gabung` memperagakan alur skor delapan aturan poin. Satu transaksi di tiga proses melewati enam panggilan", "5.29");
    ada(m51, "Jaringan antar host tidak diukur", "5.29");
    ada(m51, "Replica sinkron hanya dijalankan di satu mesin (lab `t5-replika`), dan jeda antar wilayah Tidak dijalankan", "5.29");
    ada(m51, "Tiga hal yang belum pernah diuji.", "5.29");
    ada(m51, "Skor risiko real-time dalam 50 ms (Asumsi naskah)", "5.29");
    ada(m51, "28 orang dalam delapan tim (Asumsi cerita). Ambang ±50 developer untuk microservices tidak punya sumber primer [perlu verifikasi]", "5.29");
    ada(m51, "Beban PRD v6 adalah 10 kali Tahap 5 menurut hitungan, tetapi repo ini belum mengukur kapasitas satu primary", "5.29");
    ada(prd5, "200.000 aktif per hari", "5.1");
    ada(prd5, "1.000.000 user dan ±200.000 merchant (Asumsi)", "5.1");
    ada(prd5, "| Platform: 4 orang, dipimpin Bayu |", "5.1");
    ada(prd5, "| SRE: 2 orang, dipimpin Dewi |", "5.1");
    ada(prd5, "| Security: 2 orang, dipimpin Laras |", "5.1");
    ada(prd5, "Lingkupnya satu negara", "5.1");
    harus("| 10 juta user | 1.000.000 user terdaftar, 200.000 aktif per hari, dan 1.388,9 request per detik di puncak (Asumsi, [[t5-prd]]).");
    expect(koma((a5.user * a5.aktif / 100 * a5.req / 86400) * a5.puncak, 1)).toBe("1.388,9".replace(".", ""));
    harus("| Multi-region aktif-pasif | Replica sinkron hanya dijalankan di satu mesin, dan jeda antar wilayah Tidak dijalankan ([[t5-m51]], [[t5-rpo-rto]]) |");
    harus("| Skor risiko real-time dan graf akun-perangkat | Lab `t5-gabung` memperagakan alur skor delapan aturan poin. Satu transaksi di tiga proses melewati enam panggilan, dan jaringan antar host tidak diukur ([[t5-m51]], [[t5-service]]) |");
    harus("| Platform internal, chaos testing, dan data mesh sederhana | Delapan tim: lima tim produk, Platform 4 orang, SRE 2 orang, dan Security 2 orang ([[t5-prd]]) |");
  });
});

// ---- Lapis 2 ---------------------------------------------------------------------------------------------------------------
describe("kata-kata halaman dan widget terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    expect(mdx.split("\n").map((b) => (b.trim() ? "#" : "-")).join("")).toBe(BENTUK_MDX);
  });
  test("nilai string JSON tebak sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(ratakan(JSON.parse(jsonMentah))).toEqual(NILAI_TEBAK);
  });
});

// ---- Registry, naskah, blok, dan tautan -------------------------------------------------------------------------------------
describe("registry, naskah, blok, dan tautan", () => {
  test("entri registry dan baris peta naskah cocok; halaman tanpa lab", () => {
    expect(r).toMatchObject({ ada: true, nomor: "5.32", jenis: "prd", inti: true, prasyarat: ["t5-rekap"], tahap: 5, topik: "Gambaran besar", pendek: "Pratinjau PRD v6", bagian: 6 });
    expect(r.path).toBe("tahap-5/jembatan-prd-v6.md");
    expect(r.lab).toBeUndefined();
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(r.path!, ".md"));
    expect(bagian(naskah5, "## Peta halaman Tahap 5")).toContain("| 5.32 | 6 | Jembatan: pratinjau PRD v6 | PRD | ★ | – | tebak |");
    expect(r.judul).toBe("Jembatan: pratinjau PRD v6");
    expect(frontmatter).toContain('title: "5.32 Jembatan: pratinjau PRD v6"');
    expect(hal.filter((h) => h.nomor === "5.32").map((h) => h.id)).toEqual(["t5-jembatan"]);
    expect(hal.filter((h) => h.tahap === 5 && h.jenis === "prd").map((h) => h.id)).toEqual(["t5-prd", "t5-jembatan"]);
    expect(r.masalah).toContain("mana yang pecah lebih dulu");
    expect(dari("t5-adr-60").prasyarat).toEqual(["t5-m51"]);
    expect(dari("t5-m51").masalah).toContain("PRD v6 datang");
  });
  test("front matter dikunci: title dan description memuat Minggu 16, enam perubahan, dan tebakan tanpa nomor ADR", () => {
    const minggu = cocok(isi("t5-m51"), /^Minggu (\d+) Tahap 5\./m)[1];
    expect(frontmatter).toBe(
      `title: "5.32 Jembatan: pratinjau PRD v6"\ndescription: Minggu ${minggu}. Uji coba nasional lolos, lalu Sinta membagikan PRD v6 dengan ${KATA[6]} perubahan dan tim yang naik. Dari ADR Tahap ${N5}, tebak mana yang pecah lebih dulu.\n`,
    );
    expect(frontmatter).not.toMatch(/ADR \d/);
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-rekap\]\] · Jalur inti<\/p>/);
    expect(r.menit).toBe(Number(m[1]) + Number(m[2]));
    const teksBaca = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (teksBaca.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
    expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(10);
  });
  test("empat blok; templat PRD terpenuhi; hanya blok pertama terbuka; tautan tebak dikunci", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Pratinjau PRD v6", "Ruang lingkup", "Menuju Tahap 6", "Kunci"]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Pratinjau PRD v6"]);
    expect(badan).toContain('export const hs = muat().halaman;\nexport const tautanTebak = ["t5-adr-60", "t5-onprem", "t5-tim-infra"]\n  .map((id) => hs.find((h) => h.id === id && h.ada))\n  .filter(Boolean)\n  .map((h) => ({ label: label(h), href: urlHalaman(h) }));');
    expect(badan).toContain('import dataTebak from "../../../../data/widget/t5-jembatan-tebak.json";');
    expect(badan).toContain('import Tebak from "../../../widgets/tebak/Tebak.tsx";');
    expect(hitung(badan, "<Tebak client:visible data={dataTebak} tautan={tautanTebak} />")).toBe(1);
    expect(dari("t5-adr-60")).toMatchObject({ nomor: "5.30", adr: [60] });
    expect(dari("t5-onprem")).toMatchObject({ nomor: "5.28", adr: [59] });
    expect(dari("t5-tim-infra")).toMatchObject({ nomor: "5.27", adr: [58] });
  });
  test("tautan [[id]]: himpunan, jumlah pemakaian, nomor, dan judul diturunkan dari registry dan peta naskah", () => {
    const id = [...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!);
    const hitungId: Record<string, number> = {};
    for (const x of id) hitungId[x] = (hitungId[x] ?? 0) + 1;
    expect(hitungId).toEqual({ A0: 1, "t4-jembatan": 1, "t4-modul": 1, "t5-m51": 7, "t5-prd": 6, "t5-rekap": 1, "t5-rpo-rto": 1, "t5-service": 1 });
    for (const x of Object.keys(hitungId)) expect(hal.some((h) => h.id === x), `[[${x}]] tidak ada di registry`).toBe(true);
    const sesuai: [string, string, string][] = [
      ["t4-jembatan", "4.31", "Jembatan: pratinjau PRD v5"], ["t4-modul", "4.13", "Modular monolith"], ["t5-prd", "5.1", "PRD v5"], ["t5-service", "5.13", "Dari modul ke service"],
      ["t5-rpo-rto", "5.9", "RPO, RTO"], ["t5-m51", "5.29", "M51"], ["t5-rekap", "5.31", "Yang dibawa keluar dari Tahap 5"],
    ];
    const petaNaskah = bagian(naskah5, "## Peta halaman Tahap 5");
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      if (idh.startsWith("t5-")) expect(petaNaskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+ \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    // 5.31 ditulis di PR lain dan belum tentu merge saat halaman ini merge: yang dijaga adalah id dan nomornya, bukan ada atau segera.
    for (const x of ["t4-jembatan", "t4-modul", "t5-prd", "t5-service", "t5-rpo-rto", "t5-m51"]) expect(dari(x).ada, x).toBe(true);
  });
  test("tanpa klaim izin, lisensi, atau kepatuhan regulasi di luar kalimat penyangkal; tanpa merek nyata; tanpa uang elektronik", () => {
    const kena = badan.split("\n").filter((b) => /izin|lisensi|kepatuhan|regulasi|OJK|Bank Indonesia|PCI|uang elektronik/i.test(b));
    expect(kena).toEqual(["Halaman ini tidak memuat klaim izin, lisensi, atau kepatuhan regulasi apa pun. Semua isi PRD v6 di atas adalah rencana cerita."]);
    expect(teksWidget).not.toMatch(/izin|lisensi|kepatuhan|regulasi|OJK|Bank Indonesia|PCI|uang elektronik/i);
    expect(badan).not.toMatch(/Rp\d|IDR|USD|\bEUR\b|Visa|Mastercard|Stripe|Kafka|Istio/);
  });
});

// ---- Janji "dibuka di halaman pertama Tahap 6" dengan penerima -----------------------------------------------------------------
describe("janji jawaban dibuka di halaman pertama Tahap 6: kalimat janji tertulis, dan penerimanya diperiksa begitu ada", () => {
  const nomorUrut = (n: string): number => Number(n.split(".")[1]);
  const t6 = hal.filter((h) => h.tahap === 6 && h.nomor).sort((x, y) => nomorUrut(x.nomor!) - nomorUrut(y.nomor!));
  test("halaman dan widget menulis janji itu persis di tiga tempat, dan tidak menyebut halaman Tahap 6 lain", () => {
    expect(badan.split("\n").filter((b) => /halaman pertama Tahap 6/.test(b)).map((b) => b.trim())).toEqual([
      "<p>Tanpa JavaScript tebakan tidak berjalan. Tebakan membandingkan lima ADR Tahap 5, yaitu ADR 52, 56, 58, 59, dan 60, dengan kalimat halaman ADR-nya sendiri. Jawabannya dibuka di halaman pertama Tahap 6.</p>",
      'Jawaban tebakan dibuka di halaman pertama Tahap 6, di blok "Yang dibuka lagi dari Tahap 5". Blok itu mengikuti pola [[t5-prd]], yang membuka jawaban tebakan [[t4-jembatan]] dengan bukti yang sudah tertulis di halaman ADR Tahap 4. Halaman ini hanya mencatat apa yang sudah tertulis di halaman ADR Tahap 5.',
      'Di halaman pertama Tahap 6, di blok "Yang dibuka lagi dari Tahap 5". Halaman ini hanya menaruh pilihan dan kalimat halaman ADR yang sudah tertulis, dan jawabannya menjadi isi halaman itu.',
    ]);
    expect(data.penutup).toBe('Jawabannya dibuka di halaman pertama Tahap 6. Di sini hanya terlihat apa yang sudah tertulis di halaman ADR Tahap 5, dan urutan "lebih dulu" belum diuji.');
    expect(hitung(teksWidget, "Tahap 6")).toBe(1);
    expect(badan).not.toMatch(/\[\[t6-|\/tahap-6\//);
    ada(bag6, "Jawabannya dibuka di halaman pertama Tahap 6.", "naskah 5 bagian 6");
    // Pola penerima: 5.1 membuka jawaban jembatan sebelumnya di blok bernama begitu.
    ada(prd5, '<Blok nama="Yang dibuka lagi dari Tahap 4">', "5.1");
  });
  test("penerima: bila registry sudah memuat Tahap 6, halaman pertamanya menaut 5.32 sebagai prasyarat dan memuat blok 'Yang dibuka lagi dari Tahap 5'", () => {
    // Tugas T6-siap (daftar halaman Tahap 6 di registry) dan penulis halaman pertama Tahap 6 yang memenuhi tes ini. Gagal di sini berarti
    // janji di 5.32 tidak ditepati: tambahkan "t5-jembatan" ke prasyarat halaman pertama, dan blok jawaban ke halamannya begitu `ada` true.
    if (t6.length === 0) return;
    const pertama = t6[0]!;
    expect(nomorUrut(pertama.nomor!), `halaman pertama Tahap 6 bernomor ${pertama.nomor}`).toBe(1);
    expect(pertama.prasyarat ?? [], `prasyarat ${pertama.nomor}: janji 5.32 butuh t5-jembatan`).toContain("t5-jembatan");
    if (pertama.ada) {
      const berkas = baca(`situs/src/content/docs/${pertama.path!.replace(/\.md$/, ".mdx")}`);
      expect(berkas, `${pertama.nomor} harus membuka jawaban tebakan 5.32`).toContain('<Blok nama="Yang dibuka lagi dari Tahap 5">');
      expect(berkas).toContain("[[t5-jembatan]]");
    }
  });
});

// ---- Jejak riset -------------------------------------------------------------------------------------------------------------
describe("jejak riset: lima baris R5-265 sampai R5-269, urut, lima kolom, tanggal baca, dan sumber yang dikutip ada", () => {
  const riset = baca("plan/RISET-TAHAP-5.md").split("\n");
  const baris = (id: string): string[] => {
    const b = riset.filter((x) => x.startsWith(`| ${id} |`));
    expect(b, `baris riset ${id}`).toHaveLength(1);
    const sel = b[0]!.split("|").slice(1, -1).map((x) => x.trim());
    expect(sel, `${id} harus punya lima kolom`).toHaveLength(5);
    return sel;
  };
  test("baris riset terkunci: lima baris sama dengan nilai terkunci", () => {
    expect(riset.filter((x) => /^\| R5-26[5-9] \|/.test(x))).toEqual(BARIS_RISET);
  });
  test("lima baris berurutan tanpa ID ganda, tiap kolom terisi; ID sebelum dan sesudahnya di tabel pertama tidak menyela", () => {
    const urut = riset.map((x, i) => [x.match(/^\| (R5-\d+) \|/)?.[1], i] as const).filter(([id]) => id);
    const idx = urut.findIndex(([id]) => id === "R5-265");
    expect(idx).toBeGreaterThan(0);
    expect(urut.slice(idx, idx + 5).map(([id]) => id)).toEqual(["R5-265", "R5-266", "R5-267", "R5-268", "R5-269"]);
    expect(urut.slice(idx, idx + 5).map(([, i]) => i)).toEqual([0, 1, 2, 3, 4].map((k) => urut[idx]![1] + k));
    const nomorId = urut.map(([id]) => Number(id!.slice(3)));
    expect(new Set(nomorId).size, "ID riset ganda").toBe(nomorId.length);
    expect(nomorId[idx - 1]!, "baris sebelum R5-265").toBeLessThan(265);
    for (const id of ["R5-265", "R5-266", "R5-267", "R5-268", "R5-269"]) for (const k of baris(id)) expect(k.length, id).toBeGreaterThan(3);
    for (const id of ["R5-265", "R5-266", "R5-267", "R5-268"]) expect(baris(id)[2], id).toContain("2026-11-05");
    expect(baris("R5-268")[4]).toBe("Belum dicek ulang 2026-11-05");
    expect(baris("R5-269")[4]).toBe("Belum dicek ulang 2026-11-05");
  });
  test("kolom konsep dan kolom perubahan tiap baris riset tidak tertukar", () => {
    const harapan: [string, string, string][] = [
      ["R5-265", "Hitungan atas angka yang tertulis di halaman 5.32", "Tidak berlaku (hitungan atas angka sendiri)"],
      ["R5-266", "Kalimat halaman ADR 58, 59, dan 60 yang dikutip tebakan 5.32", "Tidak berubah"],
      ["R5-267", "Kalimat halaman ADR 52 dan 56 yang dibaca 5.32", "Tidak berubah"],
      ["R5-268", "Arti istilah PRD v6: golden path, service catalog, chaos testing, data mesh", "Belum dicek ulang 2026-11-05"],
      ["R5-269", "Ukuran tim PRD v6 dan status Tahap 6", "Belum dicek ulang 2026-11-05"],
    ];
    for (const [id, konsep, berubah] of harapan) {
      const sel = baris(id);
      expect(sel[1]!.startsWith(konsep), `${id} kolom konsep`).toBe(true);
      expect(sel[4], `${id} kolom berubah sejak Okt 2026`).toBe(berubah);
    }
  });
  test("R5-265: hitungan diulang dari angka halaman, dan butir yang dihitung ada di halaman ADR-nya", () => {
    const h = baris("R5-265")[2]!;
    ada(h, `${titik(user6)} ÷ ${titik(a5.user)} = ${rasio}`, "R5-265");
    ada(h, `46 sampai 60 = ${adrTahap5.length} ADR`, "R5-265");
    ada(h, `4 × 6 + 2 × 2 = ${tim5[1]} orang`, "R5-265");
    ada(h, `lima butir "Kapan keputusan ini salah" ADR 52 dan enam butir ADR 56`, "R5-265");
    ada(h, `50 × 100 = ${titik(50 * 100)} dan ${titik(50 * 100)} ÷ 1.388,9 = ${koma((50 * 100) / 1388.9, 5)}`, "R5-265");
    const [, pod, client, batas] = cocok(isi("t5-pooler"), /(\d+) pod tiap service memberi (\d+) client lawan (\d+) per instance/);
    ada(h, `${pod} pod memberi ${client} client lawan ${batas} per instance`, "R5-265");
    expect(Math.round((50 * 100) / 1388.9 * 10) / 10).toBe(3.6);
    ada(baris("R5-265")[2]!, "Halaman tidak menghitung beban komponen untuk 10 juta user", "R5-265");
  });
  test("R5-266 dan R5-267: berkas yang dibaca ada, dan kalimat yang dikutip ada di halamannya", () => {
    const b266 = baris("R5-266")[2]!;
    for (const f of ["sengaja-belum", "on-prem-lawan-cloud", "tim-infra"]) {
      ada(b266, `tahap-5/${f}.mdx`, "R5-266");
      expect(terlacak?.has(`situs/src/content/docs/tahap-5/${f}.mdx`) ?? true, f).toBe(true);
    }
    ada(b266, "`plan/CERITA-TAHAP-5.md` bagian 6 (rencana jawaban)", "R5-266");
    ada(b266, "Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya", "R5-266");
    ada(b266, "Tidak ada permintaan di PRD v5", "R5-266");
    const b267 = baris("R5-267")[2]!;
    for (const f of ["pooler-koneksi", "pintu-mitra-waf"]) {
      ada(b267, `tahap-5/${f}.mdx`, "R5-267");
      expect(terlacak?.has(`situs/src/content/docs/tahap-5/${f}.mdx`) ?? true, f).toBe(true);
    }
    ada(b267, "lima butir", "R5-267");
    ada(b267, "enam butir", "R5-267");
    expect(baris("R5-267")[3]).toContain("Dua pilihan salah tebakan 5.32");
  });
  test("R5-268: empat sumber primer dengan tanggal yang sama dengan halaman; tanpa kutipan panjang", () => {
    const b = baris("R5-268");
    for (const u of [
      "engineering.atspotify.com/2020/08/how-we-use-golden-paths-to-solve-fragmentation-in-our-software-ecosystem/ (17 Agustus 2020",
      "backstage.io/docs/features/software-catalog/ (tanpa nomor versi, dibuka 2026-11-05)",
      'principlesofchaos.org ("Last Update: 2019 March", dibuka 2026-11-05)',
      "martinfowler.com/articles/data-mesh-principles.html (3 Desember 2020, dibuka 2026-11-05)",
    ]) ada(b[2]!, u, "R5-268");
    for (const t of ["17 Agustus 2020", "dibuka 2026-11-05", "Maret 2019", "3 Desember 2020"]) harus(t);
    ada(b[2]!, "Domain Ownership, Data as a product, Self-serve data platform, Federated computational governance", "R5-268");
    harus("yang pertama kepemilikan data oleh domain");
    expect(hitung(badan, '"opinionated and supported"')).toBe(1);
    expect(b[3]).toContain("tanpa kutipan lebih dari tiga kata");
  });
  test("R5-269: PROPOSAL, naskah, dan 5.1 memuat kalimat yang dikutip; heuristik ±50 tidak dipakai", () => {
    const b = baris("R5-269");
    ada(proposal, "| 6 (proyeksi) | 1jt–10jt | 50+ (10+ tim, platform sebagai produk) |", "PROPOSAL");
    ada(b[2]!, "50+ (10+ tim, platform sebagai produk)", "R5-269");
    ada(proposal, "Tahap 6 adalah proyeksi konseptual untuk organisasi 50+ developer, ditulis dengan label \"Ilustrasi\" dan sumber industri, tanpa klaim rekaman.", "PROPOSAL");
    ada(b[2]!, "Tahap 6 proyeksi konseptual tanpa klaim rekaman", "R5-269");
    ada(bag6, "Tim naik dari 28 menjadi lebih dari 50 developer dalam lebih dari 10 tim (PROPOSAL).", "naskah 5 bagian 6");
    ada(b[2]!, "28 menjadi lebih dari 50 developer dalam lebih dari 10 tim (PROPOSAL)", "R5-269");
    ada(b[2]!, "4 × 6 + 2 × 2 = 28 orang", "R5-269");
    ada(T4("modular-monolith.mdx"), "Pencarian 2026-10-29 tidak menemukan sumber primer", "4.13");
    ada(b[2]!, "tanpa sumber primer [perlu verifikasi]", "R5-269");
    ada(b[3]!, "perbedaan satuan 28 dan 50", "R5-269");
    harus("Angka 28 menghitung orang, termasuk SRE dan Security, sedangkan angka 50 menghitung developer.");
    harus("tidak menemukan sumber primer untuk angka itu [perlu verifikasi], jadi halaman ini tidak memakainya.");
    expect(badan).not.toMatch(/orang per tim|per tim:? \d/);
  });
});

// ---- Bukti dari halaman ADR Tahap 5 ----------------------------------------------------------------------------------------------
describe("pilihan tebakan: kalimat alasan dikutip dari halaman ADR 52, 56, 58, 59, dan 60; klaim negatif berlingkup butir daftar", () => {
  const adr60 = isi("t5-adr-60");
  const adr59 = isi("t5-onprem");
  const adr58 = isi("t5-tim-infra");
  const adr52 = isi("t5-pooler");
  const adr56 = isi("t5-waf");
  const [nol, satu, dua] = data.pilihan as [typeof data.pilihan[0], typeof data.pilihan[0], typeof data.pilihan[0]];
  const kataLarang = /multi-region|per negara|\bplatform\b|\btim\b/i;
  test("ADR 60: baris komponen Multi-region di halamannya menulis syarat salah, 'Menunggu PRD v6', dan pratinjau memintanya", () => {
    const sel = barisTabel(adr60, "| 2. Multi-region |");
    expect(sel[1]).toBe("Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya");
    expect(sel[3]).toContain("Pratinjau PRD v6 memintanya (Ilustrasi) dan belum menjadi PRD yang dikerjakan");
    expect(sel[4]).toBe("Menunggu PRD v6");
    ada(dua.alasan, `ADR 60 menulis multi-region sebagai ${sel[4]!.replace("Menunggu", "menunggu")}, dengan syarat salah "${sel[1]}" (Ilustrasi).`, "alasan benar");
    expect(halamanAdr(60).id).toBe("t5-adr-60");
  });
  test("ADR 59: baris 'Data harus tinggal di lokasi tertentu' tidak diminta PRD v5, dan 'Yang akan merevisinya' menyebut PRD v6", () => {
    const sel = barisTabel(adr59, "| Data harus tinggal di lokasi tertentu |");
    expect(sel[0]).toBe("Data harus tinggal di lokasi tertentu");
    expect(sel[2]).toBe("Tidak ada permintaan di PRD v5 ([[t5-prd]])");
    ada(adr59, "[[t5-jembatan]] membawa PRD v6, yang menurut naskah (Ilustrasi) menyebut data per negara. Syarat lokasi data di atas bisa menjadi pemicu pertama.", "ADR 59");
    ada(dua.alasan, `ADR 59 menulis "${sel[0]}" sebagai syarat salah, dan PRD v5 tidak memintanya.`, "alasan benar");
    expect(halamanAdr(59).id).toBe("t5-onprem");
    expect(hitung(prd5.toLowerCase(), "lokasi tertentu")).toBe(0);
  });
  test("ADR 58: butir pertama 'Kapan keputusan ini salah' menulis template menunggu lebih dari satu minggu dan delapan tim merilis hampir tiap hari", () => {
    const butir = kapanSalah(adr58);
    expect(butir[0]).toBe("Saat permintaan template menunggu lebih dari satu minggu (Asumsi naskah). Naskah menulis delapan tim merilis hampir tiap hari, jadi menunggu satu minggu memperlambat rilis.");
    ada(dua.alasan, "ADR 58 salah bila permintaan template menunggu lebih dari satu minggu (Asumsi naskah), dan naskah menulis delapan tim merilis hampir tiap hari.", "alasan benar");
    ada(dua.alasan, `Tim yang naik dari ${timNaskah[1]} orang menjadi lebih dari ${timNaskah[2]} developer membuat tunggu itu mungkin (penalaran).`, "alasan benar");
    ada(adr58, "Platform menjadi penghambat.", "ADR 58");
    expect(halamanAdr(58).id).toBe("t5-tim-infra");
  });
  test("ADR 52: lima butir, tak satu pun menulis multi-region, data per negara, platform, atau tim; butir jumlah pod dari halamannya", () => {
    const butir = kapanSalah(adr52);
    expect(butir).toHaveLength(5);
    ada(nol.alasan, `Halaman ${dari("t5-pooler").nomor} menulis ${KATA[butir.length]} syarat salah ADR 52.`, "alasan");
    for (const b of butir) expect(b, "butir ADR 52").not.toMatch(kataLarang);
    for (const kata of ["`SET`", "`LISTEN`", "advisory lock tingkat sesi", "`PREPARE` tingkat SQL"]) ada(butir[0]!, kata, "butir 1");
    ada(butir[1]!, "titik gagal tunggal", "butir 2");
    ada(butir[2]!, "`query_wait_timeout` 120 detik", "butir 3");
    ada(butir[3]!, "`max_client_conn`: 8 pod tiap service memberi 480 client lawan 400 per instance (Hitungan atas Asumsi)", "butir 4");
    ada(butir[4]!, "p95 lompatan tambahan melewati 50 ms", "butir 5");
    ada(nol.alasan, "Syarat pertama: service butuh SET, LISTEN, advisory lock tingkat sesi, atau PREPARE tingkat SQL.", "alasan");
    ada(nol.alasan, "Empat lainnya: pooler menjadi titik gagal tunggal, client menunggu server lebih dari query_wait_timeout 120 detik, koneksi pod melewati max_client_conn, dan p95 lompatan tambahan melewati 50 ms.", "alasan");
    ada(nol.alasan, "Tak satu pun dari lima syarat itu menulis multi-region, data per negara, platform, atau jumlah tim.", "alasan");
    ada(nol.alasan, "Syarat max_client_conn bergantung pada jumlah pod: 8 pod tiap service memberi 480 client lawan 400 per instance (Hitungan atas Asumsi).", "alasan");
    ada(nol.alasan, "Halaman ini tidak menghitung jumlah pod untuk 10 juta user (penalaran).", "alasan");
    expect(halamanAdr(52).id).toBe("t5-pooler");
  });
  test("ADR 56: enam butir, tak satu pun menulis multi-region, data per negara, platform, atau tim; hitungan kuota diulang", () => {
    const butir = kapanSalah(adr56);
    expect(butir).toHaveLength(6);
    ada(satu.alasan, `Halaman ${dari("t5-waf").nomor} menulis ${KATA[butir.length]} syarat salah ADR 56.`, "alasan");
    for (const b of butir) expect(b, "butir ADR 56").not.toMatch(kataLarang);
    ada(butir[0]!, `50 mitra × 100 per detik = ${titik(50 * 100)} per detik, yaitu ${koma((50 * 100) / 1388.9, 1)} kali puncak 1.388,9 (Hitungan atas Asumsi: 5.000 ÷ 1.388,9 = ${koma((50 * 100) / 1388.9, 5)}).`, "butir 1");
    expect(a5.puncak * (a5.user * a5.aktif / 100 * a5.req / 86400)).toBeCloseTo(1388.9, 1);
    ada(butir[0]!, "Kapasitas satu server belum diukur", "butir 1");
    ada(satu.alasan, `Syarat pertama membandingkan jumlah kuota dengan kapasitas terukur: 50 mitra × 100 per detik = ${titik(5000)} per detik, ${koma((50 * 100) / 1388.9, 1)} kali puncak 1.388,9 (Hitungan atas Asumsi), dan kapasitas satu server belum diukur.`, "alasan");
    ada(butir[1]!, "20 permintaan berjalan", "butir 2");
    ada(butir[2]!, "WAF menolak permintaan POS yang sah", "butir 3");
    ada(butir[3]!, "mTLS atau skema tanda tangan lain", "butir 4");
    ada(butir[4]!, "Coraza kehilangan pemelihara", "butir 5");
    ada(butir[5]!, "serangan volumetrik", "butir 6");
    ada(satu.alasan, "Lima lainnya: 20 permintaan berjalan, WAF yang menolak permintaan sah, mitra yang menuntut mTLS atau tanda tangan lain, pemelihara Coraza, dan serangan volumetrik.", "alasan");
    ada(satu.alasan, "Tak satu pun dari enam syarat itu menulis multi-region, data per negara, platform, atau jumlah tim.", "alasan");
    ada(satu.alasan, "Pratinjau PRD v6 di halaman ini tidak menulis jumlah mitra.", "alasan");
    expect(badan.toLowerCase()).not.toContain("mitra");
    ada(adr56, "Mitra ±50 (Asumsi)", "ADR 56");
    expect(halamanAdr(56).id).toBe("t5-waf");
  });
  test("tiga pilihan: benar di posisi ketiga, bukan yang terpanjang atau terpendek, berbeda dengan posisi tebakan jembatan Tahap 3 dan 4", () => {
    const j = data.pilihan.findIndex((p) => p.benar);
    expect(j).toBe(2);
    expect(data.pilihan.filter((p) => p.benar)).toHaveLength(1);
    const panjang = data.pilihan.map((p) => p.teks.length);
    expect(panjang[j]!).toBeLessThan(Math.max(...panjang));
    expect(panjang[j]!).toBeGreaterThan(Math.min(...panjang));
    for (const p of data.pilihan) expect(p.teks.startsWith("ADR "), p.teks).toBe(true);
    for (const [i, p] of data.pilihan.entries()) {
      expect(nilai(data, i).benar).toBe(i === j);
      if (i !== j) expect(nilai(data, i).alasan[1]).toBe(data.pilihan[j]!.alasan);
      expect(p.alasan.length).toBeGreaterThan(300);
    }
    expect(new Set(data.pilihan.map((p) => p.alasan)).size).toBe(3);
    const posisi = (n: string) => DataTebak.parse(JSON.parse(baca(`situs/data/widget/${n}.json`))).pilihan.findIndex((p) => p.benar);
    expect(posisi("t4-jembatan-tebak")).not.toBe(j);
    expect(posisi("t3-jembatan-tebak")).not.toBe(j);
    expect(nol.teks.startsWith("ADR 52:")).toBe(true);
    expect(satu.teks.startsWith("ADR 56:")).toBe(true);
    expect(dua.teks.startsWith("ADR 58, ADR 59, dan ADR 60:")).toBe(true);
    expect(data.sumber.jenis).toBe("asumsi");
    expect(data.id).toBe(`${r.id}-tebak`);
    expect(data.judul).toBe(`ADR Tahap ${N5} yang pecah lebih dulu`);
    expect(data.pertanyaan).toBe(`Dari ADR Tahap ${N5}, mana yang pecah lebih dulu?`);
    expect(bag6).toContain(`Pembaca diminta menebak: dari ADR Tahap ${N5}, mana yang pecah lebih dulu?`);
    expect(data.label).toEqual({
      sumber: "Asumsi · penalaran dari halaman ADR Tahap 5",
      tebakDulu: "Tebak dulu:",
      benar: "Cocok dengan halaman ADR",
      belum: "Belum cocok dengan halaman ADR",
      ulang: "Coba pilihan lain",
      jawaban: "Yang cocok dengan halaman ADR",
    });
    ada(bag6, "Dua pilihan lain di tebakan tidak cocok dengan isi PRD v6. Contohnya ADR 52, yang syarat salahnya tentang fitur sesi di mode transaction, dan ADR 56, yang syarat salahnya tentang jumlah kuota mitra.", "naskah 5 bagian 6");
    expect(data.sumber.teks).toBe("Penalaran dari kalimat halaman ADR Tahap 5 (ADR 52, 56, 58, 59, dan 60); tidak ada rekaman atau lab untuk PRD v6");
  });
  test("urutan kalimat alasan tiap pilihan: kalimat berurutan (menukar dua kalimat bersebelahan gagal)", () => {
    const urut = (alasan: string, awal: string[]) => {
      const pos = awal.map((k) => alasan.indexOf(k));
      expect(pos.every((p) => p >= 0), `kalimat tidak ada: ${awal.filter((_, i) => pos[i]! < 0).join(" | ")}`).toBe(true);
      expect(pos, "urutan kalimat alasan").toEqual([...pos].sort((x, y) => x - y));
    };
    urut(nol.alasan, ["Halaman 5.17 menulis lima syarat salah ADR 52.", "Syarat pertama:", "Empat lainnya:", "Tak satu pun dari lima syarat", "Syarat max_client_conn", "Halaman ini tidak menghitung jumlah pod"]);
    urut(satu.alasan, ["Halaman 5.25 menulis enam syarat salah ADR 56.", "Syarat pertama membandingkan", "Lima lainnya:", "Tak satu pun dari enam syarat", "Pratinjau PRD v6 di halaman ini"]);
    urut(dua.alasan, ["Tiga halaman ADR menulis keadaan yang sama", "ADR 60 menulis multi-region", "ADR 59 menulis", "ADR 58 salah bila", "Tim yang naik dari 28 orang", "Ini bacaan dari halaman Tahap 5"]);
    ada(dua.alasan, "Ini bacaan dari halaman Tahap 5 (Asumsi), bukan hitungan beban untuk 10 juta user.", "alasan benar");
  });
  test("adegan: PRD v6 meminta enam isi (Ilustrasi) dan tim naik dari 28 orang menjadi lebih dari 50 developer (Asumsi cerita)", () => {
    expect(data.adegan).toHaveLength(2);
    expect(data.adegan[1]).toBe(
      "PRD v6 meminta 10 juta user, multi-region aktif-pasif, skor risiko real-time, platform internal, multi-mata uang dengan kurs, data per negara, dan database per wilayah (Ilustrasi). " +
        `Tim naik dari ${timNaskah[1]} orang menjadi lebih dari ${timNaskah[2]} developer (Asumsi cerita).`,
    );
    expect(data.adegan[0]).toBe("Sinta membagikan PRD v6. Raka membuka ADR 46 sampai 60 yang lahir di Tahap 5.");
  });
  test("jawaban tidak ditulis di luar widget: nomor ADR 58, 59, dan 60 hanya muncul di noscript, tautan tebak, dan kartu Cek diri tanpa nomor", () => {
    const baris = badan.split("\n").filter((b) => /ADR.*\b(58|59|60)\b|\[\[t5-(adr-60|onprem|tim-infra)\]\]/.test(b));
    // Baris pertama menulis rentang ADR 46 sampai 60 (bukan pilihan); baris kedua noscript menyebut lima nomor yang dibandingkan.
    expect(baris).toHaveLength(2);
    expect(baris[0]!.startsWith(`Tahap ${N5} menghasilkan ADR 46 sampai 60. Sebagian dari keputusan itu akan pecah lebih dulu daripada yang lain.`)).toBe(true);
    expect(baris[0]!).not.toMatch(/ADR (58|59)|multi-region|lokasi/);
    expect(baris[1]!.trim()).toBe("<p>Tanpa JavaScript tebakan tidak berjalan. Tebakan membandingkan lima ADR Tahap 5, yaitu ADR 52, 56, 58, 59, dan 60, dengan kalimat halaman ADR-nya sendiri. Jawabannya dibuka di halaman pertama Tahap 6.</p>");
    expect(frontmatter).not.toMatch(/ADR \d/);
    expect(badan).not.toMatch(/pecah lebih dulu(:| adalah| ialah)? (ADR|multi-region|platform)/i);
    expect(teksWidget).not.toMatch(/Tepat\b|Jawaban yang tepat|jawabannya adalah|akan pecah lebih dulu/i);
    expect(hitung(teksWidget, "Rekaman lab")).toBe(0);
    expect(data.pilihan.map((p) => p.benar)).toEqual([false, false, true]);
    // Tiga pilihan memuat lima nomor ADR; noscript menyebut lima nomor yang sama dan tidak lebih.
    expect([...new Set([...data.pilihan.map((p) => p.teks).join(" ").matchAll(/ADR (\d+)/g)].map((m) => m[1]))].sort()).toEqual(["52", "56", "58", "59", "60"]);
  });
});

// ---- Cek diri ---------------------------------------------------------------------------------------------------------------
describe("kartu Cek diri: tiga kartu sama dengan kartu.json, fakta sama dengan hitungan dan halaman", () => {
  const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama (label tautan dari registry)", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3"]);
    expect(hitung(badan, '<details class="success">')).toBe(3);
    const k = kartu.filter((x) => x.halaman === "t5-jembatan");
    expect(k.map((x) => x.id)).toEqual(["t5-jembatan-1", "t5-jembatan-2", "t5-jembatan-3"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("5.32 Jembatan: pratinjau PRD v6");
      expect(x.url).toBe("tahap-5/jembatan-prd-v6/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab.replace("[[t5-m51]]", `${dari("t5-m51").nomor} M51`));
    });
  });
  test("jawaban memuat fakta yang sama dengan hitungan: 10 kali, 10.000.000 ÷ 1.000.000, penalaran, dan tempat jawaban dibuka", () => {
    expect(soal[0]!.tanya).toBe(`Jumlah user naik ${rasio} kali di PRD v${N6}. Kenapa halaman ini tidak memakai kenaikan itu untuk memilih ADR yang pecah lebih dulu?`);
    expect(soal[0]!.jawab).toBe(
      `${titik(user6)} ÷ ${titik(a5.user)} = ${rasio} (Hitungan atas Asumsi cerita). Menghitung tiap komponen untuk 10 juta user adalah hitungan beban, dan [[t5-m51]] menulisnya tanpa membandingkannya dengan batas komponen, karena kapasitas satu primary belum terukur. Halaman ini hanya membandingkan kalimat halaman ADR.`,
    );
    expect(soal[1]!.tanya).toBe('Kenapa "pecah lebih dulu" di halaman ini berlabel Asumsi, bukan Rekaman lab?');
    expect(soal[1]!.jawab).toBe('Tidak ada lab yang menjalankan PRD v6. Penentuannya penalaran dari kalimat halaman ADR (Asumsi), dan urutan "lebih dulu" belum diuji.');
    expect(soal[2]!.tanya).toBe("Di mana jawaban tebakan dibuka, dan kenapa bukan di halaman ini?");
    expect(soal[2]!.jawab).toBe('Di halaman pertama Tahap 6, di blok "Yang dibuka lagi dari Tahap 5". Halaman ini hanya menaruh pilihan dan kalimat halaman ADR yang sudah tertulis, dan jawabannya menjadi isi halaman itu.');
    ada(isi("t5-m51"), "Dasar hitungannya 3 transaksi uang per user aktif per hari", "5.29");
  });
});

// ---- Struktur dan dunia angka tertutup ---------------------------------------------------------------------------------------
describe("struktur halaman dan dunia angka tertutup", () => {
  const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
  test("hanya satu heading (h3 Cek diri, di blok terakhir); dua tabel; satu noscript; tiga success; tanpa daftar", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(2);
    const barisTab = badan.split("\n").filter((b) => b.startsWith("|"));
    const kolom = (b: string) => b.split(/(?<!\\)\|/).length - 2;
    const pertama = barisTab.filter((b) => !b.startsWith("| Isi PRD v6") && kolom(b) === 3).length;
    expect(pertama, "tabel PRD v5 ke PRD v6: header, pemisah, enam baris").toBe(2 + 6);
    expect(barisTab.filter((b) => kolom(b) === 2)).toHaveLength(2 + 6);
    expect(barisTab).toHaveLength(2 * 2 + 12);
    expect(hitung(badan, '<details class="question">')).toBe(0);
    expect(hitung(badan, "<details>")).toBe(0);
    expect(hitung(badan, "<noscript>")).toBe(1);
    expect(badan).not.toMatch(/^\d+\. /m);
    expect(badan.split("\n").filter((b) => /^- /.test(b))).toHaveLength(0);
    expect(hitung(badan, "<Blok ")).toBe(4);
    expect(hitung(badan, "</Blok>")).toBe(4);
    for (const impor of [
      'import Blok from "../../../components/Blok.astro";',
      'import Tebak from "../../../widgets/tebak/Tebak.tsx";',
      'import { muat, label, url as urlHalaman } from "../../../../tools/registri.mjs";',
    ]) expect(badan, impor).toContain(impor);
    expect(badan.split("\n").filter((b) => b.startsWith("import "))).toHaveLength(4);
  });
  test("tanpa ID internal, emoji, tanda seru, dan kata yang dilarang gaya-bahasa; 'naskah' hanya sebagai label Asumsi di widget", () => {
    for (const teks of [badan, frontmatter, teksWidget]) {
      expect(teks).not.toMatch(POLA_ID_INTERNAL);
      expect(teks).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(teks).not.toMatch(/!(?!\[)/);
      expect(teks).not.toMatch(/\b(Anda|kita|pengguna|mudah)\b|(?<!tidak )\bcukup\b/i);
      expect(teks).not.toMatch(/terbukti/i);
    }
    expect(badan).not.toMatch(/(?<!belum )terukur/i);
    // Satu-satunya "terukur" di widget mengutip butir ADR 56 ("kapasitas terukur"), bukan klaim halaman ini.
    expect(teksWidget.match(/(?<!belum )terukur/gi)).toHaveLength(1);
    ada(teksWidget, "jumlah kuota dengan kapasitas terukur:", "widget");
    expect(badan.toLowerCase()).not.toContain("naskah");
    expect(frontmatter.toLowerCase()).not.toContain("naskah");
    expect(teksWidget.match(/[^.]*naskah[^.]*\./gi)).toEqual([
      " ADR 58 salah bila permintaan template menunggu lebih dari satu minggu (Asumsi naskah), dan naskah menulis delapan tim merilis hampir tiap hari.",
    ]);
    for (const teks of [badan, teksWidget]) for (const m of teks.matchAll(/\btinggal\b/g)) expect(teks.slice(m.index!, m.index! + 30), "tinggal").toMatch(/^tinggal di lokasi tertentu/);
    expect(hitung(badan, "Rekaman lab")).toBe(1);
    expect(badan).toContain("berlabel Asumsi, bukan Rekaman lab?");
  });
  test("angka: token berkoma, ribuan, persen, ADR, dan Tahap sama dengan yang dihitung dari sumber", () => {
    expect([...new Set([...badan.matchAll(/\d+(?:\.\d{3})*,\d+/g)].map((m) => m[0]))]).toEqual(["1.388,9"]);
    expect([...new Set([...badan.matchAll(/\d{1,3}(?:\.\d{3})+/g)].map((m) => m[0]))].sort()).toEqual([titik(a5.user), titik(user6), "200.000", "1.388"].sort());
    expect(badan).not.toMatch(/\d+(?:,\d+)?%/);
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set([String(adrTahap5[0]), "52"]));
    ada(badan, "yaitu ADR 52, 56, 58, 59, dan 60, dengan", "noscript");
    expect(new Set([...badan.matchAll(/Tahap \d+/g)].map((m) => m[0]))).toEqual(new Set([`Tahap ${N4}`, `Tahap ${N5}`, `Tahap ${N6}`]));
    const bersih = badan.replace(/\[\[[^\]]+\]\]/g, "").split("\n").filter((b) => !/^(import|export|  \.)/.test(b) && !b.startsWith("<Tebak") && !b.startsWith("<Blok") && !b.startsWith("<p class=\"meta\"")).join("\n").replace(/\d{1,3}(?:[.,]\d+)+/g, "");
    const bulat = [...new Set([...bersih.matchAll(/(?<![\d,.])\d+(?![\d,.%])/g)].map((m) => m[0]))].sort((x, y) => Number(x) - Number(y));
    // Bilangan bulat yang boleh ada, dengan asalnya. Nomor ADR dalam daftar "52, 56, 58, 59, dan 60" diperiksa di tes noscript (diikuti koma).
    const minggu = cocok(isi("t5-m51"), /^Minggu (\d+) Tahap 5\./m)[1]!;
    const sre = cocok(prd5, /^\| SRE: (\d+) orang, dipimpin/m)[1]!;
    const platform = cocok(prd5, /^\| Platform: (\d+) orang, dipimpin/m)[1]!;
    const riset268 = baca("plan/RISET-TAHAP-5.md").split("\n").filter((x) => x.startsWith("| R5-268 |"))[0]!;
    for (const t of ["17 Agustus 2020", "3 Desember 2020", "Last Update: 2019 March", "2026-11-05"]) ada(riset268, t, "R5-268"); // halaman menulis "Maret 2019" untuk "2019 March"
    const harapan = [
      sre, platform, String(N4), String(N5), String(N6), // tim, nomor tahap
      String(rasio), // 10 kali; juga "lebih dari 10 tim" dari naskah
      timNaskah[3]!, minggu, tim5[1]!, timNaskah[2]!, String(adrTahap5[0]), // tim, Minggu 16, 28 orang, 50 developer, ADR 46
      "3", "17", "11", "2019", "2020", "2026", // tanggal sumber di blok Ruang lingkup (R5-268): 17 Agustus 2020, 3 Desember 2020, Maret 2019, 2026-11-05
    ];
    expect(bulat, "bilangan bulat di halaman yang tidak diturunkan dari sumber").toEqual([...new Set(harapan)].sort((x, y) => Number(x) - Number(y)));
    const tokenW = [...teksWidget.matchAll(/\d+(?:\.\d{3})*,\d+/g)].map((m) => m[0]);
    expect([...new Set(tokenW)].sort()).toEqual(["1.388,9", "3,6"]);
    expect(new Set([...teksWidget.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["46", "52", "56", "58", "59", "60"]));
    expect(new Set([...teksWidget.matchAll(/Tahap \d+/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 5", "Tahap 6"]));
  });
});
