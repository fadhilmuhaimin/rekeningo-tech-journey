// Penjaga halaman 4.31 (keputusan 1386 sampai 1388): angka, nomor ADR, nomor halaman, kalimat yang dikutip dari halaman Tahap 2
// sampai 4, klaim negatif berlingkup, dan isi tebakan di jembatan-prd-v5.mdx dan t4-jembatan-tebak.json diturunkan dari registry
// cerita.json, naskah Tahap 4, dan halaman Tahap 2 sampai 4, bukan dari daftar yang ditulis sendiri. Halaman ini TANPA LAB:
// tiap angka berlabel Asumsi, Hitungan, atau Ilustrasi, dan tidak ada rekaman yang dikutip. Tebakannya tidak membuka jawaban
// Tahap 5: pilihan benar adalah yang cocok dengan kalimat halaman ADR Tahap 4, dan jawabannya dibuka di halaman pertama Tahap 5.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dan teks
// widget dikunci per baris lewat jembatan-prd-v5.halaman.nilai.ts, supaya satu kata yang berubah gagal. Kalimat terkunci tidak
// menangkap SALAHNYA kalimat, jadi tiap kalimat yang menyatakan isi halaman Tahap 4 dibaca ulang dari halaman itu.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../../data/cerita.json";
import { cekTemplat, daftarBlok } from "../../lib/blok";
import { DataTebak } from "./skema";
import { nilai } from "./logika";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX, NILAI_TEBAK } from "./jembatan-prd-v5.halaman.nilai";

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
const T2 = (f: string) => baca(`situs/src/content/docs/tahap-2/${f}`);
const T3 = (f: string) => baca(`situs/src/content/docs/tahap-3/${f}`);
const T4 = (f: string) => baca(`situs/src/content/docs/tahap-4/${f}`);

const BERKAS = "situs/src/content/docs/tahap-4/jembatan-prd-v5.mdx";
const BERKAS_JSON = "situs/data/widget/t4-jembatan-tebak.json";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const jsonMentah = baca(BERKAS_JSON);
const data = DataTebak.parse(JSON.parse(jsonMentah));
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const bagian = (naskah: string, awal: string): string => {
  const i = naskah.indexOf(awal);
  expect(i, `naskah tidak memuat bagian: ${awal}`).toBeGreaterThanOrEqual(0);
  return naskah.slice(i).split("\n## ")[0]!;
};
const bag6 = bagian(naskah4, "## 6. Jembatan ke Tahap 5");
const beban = bagian(naskah4, "### Angka beban Tahap 4 (Asumsi, rumus ditulis)");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");

interface H { id: string; judul: string; path?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; masalah?: string; pendek?: string; topik?: string; lab?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const halamanAdr = (n: number): H => {
  const h = hal.filter((x) => x.tahap === 4 && x.adr?.includes(n));
  expect(h.length, `ADR ${n} harus punya tepat satu halaman Tahap 4`).toBe(1);
  return h[0]!;
};
const isi = (h: H): string => T4(path.basename(h.path!, ".md") + ".mdx");
const r = dari("t4-jembatan");

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
const angka = (s: string): number => Number(s.replace(",", "."));
const KATA: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 10: "sepuluh" };

// Teks widget: semua nilai string, untuk dicari angkanya.
const teksWidget = [data.adegan.join(" "), data.pertanyaan, data.penutup, data.sumber.teks, data.label.sumber, ...data.pilihan.flatMap((p) => [p.teks, p.alasan])].join("\n");
const dalamWidget = (kalimat: string) => expect(teksWidget, `widget tidak memuat: ${kalimat}`).toContain(kalimat);

// "Kapan keputusan ini salah": butir daftar di halaman ADR, dan paragraf "Yang akan merevisinya".
const kapanSalah = (teks: string): string[] => {
  const i = teks.indexOf("**Kapan keputusan ini salah.**");
  expect(i, "halaman ADR tanpa bagian kapan salah").toBeGreaterThanOrEqual(0);
  const bagianSalah = teks.slice(i).split("**Yang akan merevisinya.**")[0]!;
  return bagianSalah.split("\n").filter((b) => b.startsWith("- ")).map((b) => b.slice(2));
};
const merevisi = (teks: string): string => cocok(teks, /\*\*Yang akan merevisinya\.\*\* (.+)/)[1]!;

// ---- Nilai dari registry, naskah, rumus, dan halaman tetangga -------------------------------------------------------------
type Asumsi = { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string };
const a4 = cerita.tahap[3]!.asumsi as unknown as Asumsi;
const a5 = cerita.tahap[4]!.asumsi as unknown as Asumsi;
const a3 = cerita.tahap[2]!.asumsi as unknown as Asumsi;
const N4 = cerita.tahap[3]!.no;
const N5 = cerita.tahap[4]!.no;
const dau = (a4.user * a4.aktif) / 100;
const puncak = (((dau * a4.req) / 86400) * a4.puncak);
const topupPerAktif = angka(cocok(beban, /aktif × (0,\d+) ÷ 86\.400 × puncak/)[1]!);
const notif = ((dau * a4.trx + dau * topupPerAktif) / 86400) * a4.puncak;
const barisBeban = (awal: string): string => {
  const b = beban.split("\n").filter((x) => x.startsWith(`| ${awal} |`));
  expect(b, `tabel beban: baris ${awal}`).toHaveLength(1);
  return b[0]!;
};
const [c, t] = [Number(cocok(barisBeban("Notifikasi uang dan pemakaian worker"), /c = (\d+), t = 0,\d+ detik/)[1]), angka(cocok(barisBeban("Notifikasi uang dan pemakaian worker"), /c = \d+, t = (0,\d+) detik/)[1]!)];
const kapasitas = c / t;
const persen = Math.round((notif / kapasitas) * 100);
const HP = Number(cocok(barisBeban("Pengumuman ke 100.000 HP"), /^\| Pengumuman ke ([\d.]+) HP \|/)[1]!.replace(/\./g, ""));
const menitHp = Math.round(HP / kapasitas / 60);
const koneksi = cocok(barisBeban("Koneksi database"), /\| ([\d × +]+) \| (\d+) dari (\d+)/);
const jumlahKoneksi = koneksi[1]!.split(" + ").reduce((jml, suku) => jml + suku.split(" × ").map(Number).reduce((x, y) => x * y, 1), 0);
const lima = [...bag6.matchAll(/^- (.+)\.$/gm)].map((m) => m[1]!);
const timBaru = cocok(bag6, /Tim naik dari (\d+) menjadi (\d+ sampai \d+) orang dalam (\d+ sampai \d+) tim, ditambah platform, SRE, dan security \(PROPOSAL\)/);
const barisM39 = naskah4.split("\n").filter((b) => b.startsWith("| M39 | "));
const belumDiuji = cocok(barisM39[0]!, /Yang belum pernah diuji: (.+?) \(PROPOSAL, tahap 5\)/)[1]!;
const timLama = cocok(naskah4, /\*\*Tim Pembayaran\*\* \((\d+) orang[^)]*\) .*\*\*Tim Merchant\*\* \((\d+) orang[^)]*\) .*\*\*Tim Platform\*\* \((\d+) orang/);
const timAnggota = Number(cocok(a4.tim, /^(\d+) developer, (\d+) tim$/)[1]);
const rasio = a5.user / a4.user;

describe("nilai turunan: sumber dan hitungan itu sendiri", () => {
  test("beban Tahap 4 dari naskah: 138,9 puncak, 7,52 notifikasi, 13,33 kapasitas, 56%, 125 menit, 40 dari 100 koneksi", () => {
    expect(koma(puncak, 1)).toBe("138,9");
    expect(koma(notif, 2)).toBe("7,52");
    expect(koma(kapasitas, 2)).toBe("13,33");
    expect(persen).toBe(56);
    expect(titik(HP)).toBe("100.000");
    expect(menitHp).toBe(125);
    expect(jumlahKoneksi).toBe(40);
    expect(`${jumlahKoneksi} dari ${koneksi[3]}`).toBe("40 dari 100");
    expect(cocok(barisBeban("Request per detik"), /(\d+,\d) puncak/)[1]).toBe(koma(puncak, 1));
    ada(barisBeban("Notifikasi uang dan pemakaian worker"), `${koma(notif, 2)} per detik puncak = ${persen}% kapasitas`, "naskah");
    ada(barisBeban("Notifikasi uang dan pemakaian worker"), "(60.000 + 5.000)", "naskah");
    ada(barisBeban("Pengumuman ke 100.000 HP"), "satu queue urut waktu", "naskah");
    ada(barisBeban("Pengumuman ke 100.000 HP"), `±${titik(HP / kapasitas)} detik, ${menitHp} menit`, "naskah");
    ada(barisBeban("Pengumuman ke 100.000 HP"), "Tidak dijalankan", "naskah");
  });
  test("lima isi PRD v5 dan tim dari naskah bagian 6; skala 1 juta user dari registry Tahap 5 dan naskah", () => {
    expect(lima).toEqual([
      "Skala nasional: 1 juta user dan ratusan ribu merchant",
      "Laporan merchant real-time",
      "Notifikasi massal",
      "Cicilan dan tabungan, dengan proses batch harian",
      "API publik untuk POS pihak ketiga",
    ]);
    expect([timBaru[1], timBaru[2], timBaru[3]]).toEqual(["13", "20 sampai 40", "5 sampai 7"]);
    expect(Number(timBaru[1])).toBe(timAnggota);
    expect(Number(timLama[1]) + Number(timLama[2]) + Number(timLama[3])).toBe(timAnggota);
    expect(a5.user).toBe(1000000);
    expect(rasio).toBe(10);
    expect(a4.user).toBe(100000);
    expect([N4, N5]).toEqual([4, 5]);
  });
  test("M39: minggu 12, tiga hal yang belum pernah diuji (database, worker, tim)", () => {
    expect(barisM39).toHaveLength(1);
    expect(cocok(barisM39[0]!, /^\| M39 \| (\d+) \|/)[1]).toBe("12");
    expect(belumDiuji).toBe("laporan merchant dan transaksi di satu database, satu worker untuk notifikasi massal, dan 13 orang menjadi 20 sampai 40 di satu repo");
    expect(barisM39[0]!).toContain(`pengumuman ke ${titik(HP)} HP butuh ${menitHp} menit`);
    expect(barisM39[0]!).toContain("Uji coba publik lolos");
    expect(barisM39[0]!).toContain("worker notifikasi 56% terpakai");
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
    expect(r).toMatchObject({ ada: true, nomor: "4.31", jenis: "prd", inti: true, prasyarat: ["t4-rekap"], tahap: 4, topik: "Gambaran besar", pendek: "Pratinjau PRD v5" });
    expect(r.path).toBe("tahap-4/jembatan-prd-v5.md");
    expect(r.lab).toBeUndefined();
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(r.path!, ".md"));
    expect(bagian(naskah4, "## Peta halaman Tahap 4")).toContain("| 4.31 | 6 | Jembatan: pratinjau PRD v5 | PRD | ★ | – | tebak |");
    expect(r.judul).toBe("Jembatan: pratinjau PRD v5");
    expect(frontmatter).toContain('title: "4.31 Jembatan: pratinjau PRD v5"');
    expect(hal.filter((h) => h.nomor === "4.31").map((h) => h.id)).toEqual(["t4-jembatan"]);
    expect(hal.filter((h) => h.tahap === 4 && h.jenis === "prd").map((h) => h.id)).toEqual(["t4-prd", "t4-jembatan"]);
    expect(r.masalah).toContain("mana yang pecah lebih dulu");
  });
  test("front matter dikunci: title dan description memuat Minggu 12, lima isi baru, dan tebakan", () => {
    expect(frontmatter).toBe(
      `title: "4.31 Jembatan: pratinjau PRD v5"\ndescription: Minggu ${cocok(barisM39[0]!, /^\| M39 \| (\d+) \|/)[1]}. Uji coba publik lolos, lalu Sinta membagikan PRD v5 dengan ${KATA[lima.length]} isi baru dan tim yang naik. Dari ADR Tahap ${N4}, tebak mana yang pecah lebih dulu.\n`,
    );
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-rekap\]\] · Jalur inti<\/p>/);
    expect(r.menit).toBe(Number(m[1]) + Number(m[2]));
    const teksBaca = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (teksBaca.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
    expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(10);
  });
  test("empat blok; templat PRD terpenuhi; hanya blok pertama terbuka; tautan tebak dikunci", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Pratinjau PRD v5", "Ruang lingkup", "Menuju Tahap 5", "Kunci"]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Pratinjau PRD v5"]);
    expect(badan).toContain('export const hs = muat().halaman;\nexport const tautanTebak = ["t4-m39", "t4-estimasi", "t4-adr-45"]\n  .map((id) => hs.find((h) => h.id === id && h.ada))\n  .filter(Boolean)\n  .map((h) => ({ label: label(h), href: urlHalaman(h) }));');
    expect(badan).toContain('import dataTebak from "../../../../data/widget/t4-jembatan-tebak.json";');
    expect(badan).toContain('import Tebak from "../../../widgets/tebak/Tebak.tsx";');
    expect(hitung(badan, "<Tebak client:visible data={dataTebak} tautan={tautanTebak} />")).toBe(1);
    expect(dari("t4-m39")).toMatchObject({ nomor: "4.27" });
    expect(dari("t4-estimasi")).toMatchObject({ nomor: "4.28" });
    expect(dari("t4-adr-45")).toMatchObject({ nomor: "4.29", adr: [45] });
  });
  test("tautan [[id]]: himpunan, jumlah pemakaian, nomor, dan judul diturunkan dari registry dan peta naskah", () => {
    const id = [...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!);
    const hitungId: Record<string, number> = {};
    for (const x of id) hitungId[x] = (hitungId[x] ?? 0) + 1;
    expect(hitungId).toEqual({
      A0: 1, "t2-pencairan": 1, "t3-prd": 3, "t4-adr-45": 2, "t4-breaker": 1, "t4-estimasi": 2, "t4-kartu": 1, "t4-m39": 4, "t4-modul": 3, "t4-prd": 1, "t4-qr": 1,
      "t4-rekap": 1, "t4-rekonsiliasi": 1, "t4-ssrf": 1, "t4-storage": 1, "t4-tim-infra": 1, "t4-webhook": 1,
    });
    for (const x of Object.keys(hitungId)) expect(hal.some((h) => h.id === x), `[[${x}]] tidak ada di registry`).toBe(true);
    const sesuai: [string, string, string][] = [
      ["t2-pencairan", "2.5", "Fitur: pencairan warung terjadwal"], ["t3-prd", "3.1", "PRD v3"], ["t4-prd", "4.1", "PRD v4"], ["t4-webhook", "4.7", "Webhook masuk"],
      ["t4-rekonsiliasi", "4.9", "Rekonsiliasi dengan gateway"], ["t4-breaker", "4.11", "Timeout, retry berkunci, circuit breaker"], ["t4-modul", "4.13", "Modular monolith"],
      ["t4-qr", "4.19", "QR pembayaran"], ["t4-ssrf", "4.21", "Keamanan 8"], ["t4-kartu", "4.23", "Kartu virtual"], ["t4-tim-infra", "4.26", "Tim dan infra Tahap 4"],
      ["t4-m39", "4.27", "M39"], ["t4-estimasi", "4.28", "Estimasi Tahap 4"], ["t4-adr-45", "4.29", "ADR 45"], ["t4-rekap", "4.30", "Yang dibawa keluar dari Tahap 4"],
    ];
    const petaNaskah = bagian(naskah4, "## Peta halaman Tahap 4");
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
      if (idh.startsWith("t4-")) expect(petaNaskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+ \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    // Halaman yang sudah ada di main dirujuk sebagai tautan biasa; tiga halaman yang masih ditulis tetap "segera" di registry sampai merge.
    for (const x of ["t2-pencairan", "t3-prd", "t4-prd", "t4-webhook", "t4-rekonsiliasi", "t4-breaker", "t4-modul", "t4-qr", "t4-ssrf", "t4-kartu", "t4-tim-infra"]) expect(dari(x).ada, x).toBe(true);
  });
  test("tidak menautkan atau menjanjikan isi halaman Tahap 5 di luar kalimat 'dibuka di halaman pertama Tahap 5'", () => {
    const semua = badan + "\n" + teksWidget;
    expect(semua).not.toMatch(/\[\[t5-|\/tahap-5\//);
    expect(hal.filter((h) => h.tahap === 5 && /^t5-/.test(h.id))).toEqual([]);
    const baris5 = badan.split("\n").filter((b) => /Tahap 5/.test(b));
    expect(baris5.map((b) => b.trim())).toEqual([
      "Ini pratinjau PRD v5, dokumen kelima yang Sinta tulis untuk Rekeningo. Halaman ini hanya menampilkan apa yang diminta; membangunnya adalah isi Tahap 5.",
      "<p>Tanpa JavaScript tebakan tidak berjalan. Pilihan yang cocok dengan halaman ADR: ADR 36, ADR 37, ADR 44, dan ADR 45. Alasannya ada di blok Menuju Tahap 5, dan jawabannya dibuka di halaman pertama Tahap 5.</p>",
      '<Blok nama="Menuju Tahap 5">',
      "Jawaban tebakan dibuka di halaman pertama Tahap 5. Halaman ini hanya mencatat apa yang sudah tertulis di halaman Tahap 4.",
      `Di halaman ini "pecah lebih dulu" adalah penalaran dari kalimat halaman ADR (Asumsi), bukan urutan kejadian yang direkam. Halaman ini juga tidak menghitung beban tiap komponen untuk 1 juta user, yang ${rasio} kali ${titik(a4.user)} (Hitungan: ${titik(a5.user)} ÷ ${titik(a4.user)}). Hitungan beban Tahap ${N5} ada di [[t4-estimasi]] (Hitungan atas Asumsi), dan halaman ini tidak memakainya untuk memilih ADR.`,
      "Tidak ada lab yang menjalankan PRD v5. Penentuannya penalaran dari kalimat halaman ADR dan dari tiga hal yang belum pernah diuji di halaman 4.27. Jawabannya dibuka di halaman pertama Tahap 5.",
    ]);
    expect(frontmatter).not.toContain("Tahap 5");
    expect(data.penutup).toBe('Jawabannya dibuka di halaman pertama Tahap 5. Di sini hanya terlihat apa yang sudah tertulis di halaman ADR Tahap 4, dan urutan "lebih dulu" belum diuji.');
    expect(hitung(teksWidget, "Tahap 5")).toBe(1);
    expect(teksWidget).not.toMatch(/jawabannya adalah|jawaban Tahap 5 adalah|di Tahap 5 (akan )?(pecah|terbukti)/i);
  });
  test("tanpa klaim izin, lisensi, atau kepatuhan regulasi di luar kalimat penyangkal; tanpa merek nyata", () => {
    const kena = badan.split("\n").filter((b) => /izin|lisensi|kepatuhan|regulasi|OJK|Bank Indonesia|PCI|uang elektronik/i.test(b));
    expect(kena).toEqual(["Halaman ini tidak memuat klaim izin, lisensi, atau kepatuhan regulasi apa pun. Semua isi PRD v5 di atas adalah rencana cerita."]);
    expect(teksWidget).not.toMatch(/izin|lisensi|kepatuhan|regulasi|OJK|Bank Indonesia|PCI|uang elektronik/i);
  });
});

// ---- Jejak riset -------------------------------------------------------------------------------------------------------------
describe("jejak riset: lima baris R4-260 sampai R4-264, urut, lima kolom, tanggal baca, dan sumber yang dikutip ada", () => {
  const riset = baca("plan/RISET-TAHAP-4.md").split("\n");
  const baris = (id: string): string[] => {
    const b = riset.filter((x) => x.startsWith(`| ${id} |`));
    expect(b, `baris riset ${id}`).toHaveLength(1);
    const sel = b[0]!.split("|").slice(1, -1).map((x) => x.trim());
    expect(sel, `${id} harus punya lima kolom`).toHaveLength(5);
    return sel;
  };
  test("baris riset terkunci: lima baris sama dengan nilai terkunci", () => {
    expect(riset.filter((x) => /^\| R4-26[0-4] \|/.test(x))).toEqual(BARIS_RISET);
  });
  test("lima baris urut tanpa ID ganda, tiap kolom terisi, tanggal baca 2026-10-31 atau ditandai", () => {
    const urut = riset.map((x, i) => [x.match(/^\| (R4-\d+) \|/)?.[1], i] as const).filter(([id]) => id && /^R4-26[0-4]$/.test(id));
    expect(urut.map(([id]) => id)).toEqual(["R4-260", "R4-261", "R4-262", "R4-263", "R4-264"]);
    expect(urut.map(([, i]) => i)).toEqual([urut[0]![1], urut[0]![1] + 1, urut[0]![1] + 2, urut[0]![1] + 3, urut[0]![1] + 4]);
    for (const [id] of urut) for (const k of baris(id!)) expect(k.length, id).toBeGreaterThan(3);
    for (const id of ["R4-260", "R4-261", "R4-264"]) expect(baris(id)[2], id).toContain("2026-10-31");
    expect(baris("R4-263")[4]).toBe("Belum dicek ulang 2026-10-31");
  });
  test("R4-260: hitungan diulang dari angka halaman, termasuk 10 kali, 3,26%, 0,015%, 6,25, 125 menit, 40 dari 100, 13", () => {
    const h = baris("R4-260")[2]!;
    ada(h, `${titik(a5.user)} ÷ ${titik(a4.user)} = ${rasio}`, "R4-260");
    ada(h, `15 ÷ 460 = ${koma((15 / 460) * 100, 2)}%`, "R4-260");
    ada(h, `15 ÷ ${titik(a4.user)} = ${koma((15 / a4.user) * 100, 3)}%`, "R4-260");
    ada(h, `50 ÷ 8 = ${koma(50 / 8, 2)} menjadi ${Math.ceil(50 / 8)} gelombang, ${Math.ceil(50 / 8)} × 3 detik = ${Math.ceil(50 / 8) * 3} detik`, "R4-260");
    ada(h, `${c} ÷ ${koma(t, 1)} = ${koma(kapasitas, 3)} per detik`, "R4-260");
    ada(h, `${koma(notif, 2)} ÷ ${koma(kapasitas, 3)} = ${koma((notif / kapasitas) * 100, 1)}%`, "R4-260");
    ada(h, `${titik(HP)} ÷ ${koma(kapasitas, 3)} = ${titik(HP / kapasitas)} detik = ${menitHp} menit`, "R4-260");
    ada(h, `${koneksi[1]} = ${jumlahKoneksi} dari ${koneksi[3]}`, "R4-260");
    ada(h, `${timLama[1]} + ${timLama[2]} + ${timLama[3]} = ${timAnggota}`, "R4-260");
  });
  test("R4-261 dan R4-263: berkas yang dibaca ada dan memuat kalimat yang dikutip; heuristik tidak dipakai", () => {
    const b = baris("R4-261")[2]!;
    for (const f of ["timeout-retry-breaker", "modular-monolith", "qr-pembayaran", "ssrf", "tim-infra", "sengaja-belum", "m39-prd-v5"]) {
      ada(b, `tahap-4/${f}.mdx`, "R4-261");
      expect(terlacak?.has(`situs/src/content/docs/tahap-4/${f}.mdx`) ?? true, f).toBe(true);
    }
    ada(baris("R4-263")[2]!, "pencarian 2026-10-29 tidak menemukan sumber primer", "R4-263");
    ada(T4("modular-monolith.mdx"), "Pencarian 2026-10-29 tidak menemukan sumber primer", "4.13");
    expect(baris("R4-263")[3]).toContain("tidak ada hitungan yang bergantung padanya");
  });
  test("R4-264: PROPOSAL dan naskah membaca 'ditambah' berbeda; halaman memakai kalimat naskah", () => {
    const proposal = baca("plan/PROPOSAL.md");
    ada(proposal, "| 5 | 100rb–1jt | 20–40 (5–7 tim + platform + SRE + security) |", "PROPOSAL");
    ada(bag6, "20 sampai 40 orang dalam 5 sampai 7 tim, ditambah platform, SRE, dan security (PROPOSAL)", "naskah 4 bagian 6");
    const b = baris("R4-264");
    ada(b[2]!, "20–40 (5–7 tim + platform + SRE + security)", "R4-264");
    ada(b[2]!, "20 sampai 40 orang dalam 5 sampai 7 tim, ditambah platform, SRE, dan security (PROPOSAL)", "R4-264");
    ada(b[3]!, "tidak menghitung orang per tim", "R4-264");
    expect(badan).not.toMatch(/orang per tim|per tim:? \d/);
  });
});

// ---- Kepala dokumen dan tabel PRD v4 ke PRD v5 -------------------------------------------------------------------------------
describe("kepala dokumen dan tabel PRD v4 ke PRD v5", () => {
  const [skala, laporan, notifikasi, cicilan, api] = lima as [string, string, string, string, string];
  test("kepala: penulis Sinta, status rencana cerita, lingkup nasional, tim dari naskah bagian 6", () => {
    const kepala = cocok(badan, /<div class="prd-kepala"[\s\S]*?\n<\/div>/)[0];
    expect(kepala).toBe(
      `<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v${N5}">\n  <dl><div><dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd></div><div><dt>Status</dt><dd>Pratinjau: rencana cerita (Ilustrasi), bukan PRD lengkap</dd></div></dl>\n  <dl><div><dt>Lingkup</dt><dd>Nasional: ${skala.replace("Skala nasional: ", "")}</dd></div><div><dt>Tim</dt><dd>${timBaru[2]} orang dalam ${timBaru[3]} tim, ditambah platform, SRE, dan security</dd></div></dl>\n</div>`,
    );
    expect(baca("situs/src/content/docs/tahap-4/prd-v4.mdx")).toContain("<dl><div><dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd></div>");
  });
  test("pembuka: minggu 12 Tahap 4, uji coba publik lolos, kalimat pola 3.32 dengan nomor tahap berikutnya", () => {
    harus(`Ini pratinjau PRD v${N5}, dokumen kelima yang Sinta tulis untuk Rekeningo. Halaman ini hanya menampilkan apa yang diminta; membangunnya adalah isi Tahap ${N5}.`);
    ada(T3("jembatan-prd-v4.mdx"), `Ini pratinjau PRD v${N4}, dokumen keempat yang Sinta tulis untuk Rekeningo. Halaman ini hanya menampilkan apa yang diminta; membangunnya adalah isi Tahap ${N4}.`, "3.32");
    harus(`Minggu ${cocok(barisM39[0]!, /^\| M39 \| (\d+) \|/)[1]} Tahap ${N4}. Uji coba publik lolos ([[t4-m39]]). Sinta lalu membagikan PRD v${N5}, supaya Rekeningo bisa dipakai secara nasional.`);
    harus(`PRD v${N5} mengubah ${KATA[lima.length + 1]} hal dari PRD v${N4}:`);
    harus(`Tahap ${N4} selesai di sini.`);
  });
  test("tabel enam baris: v4 dari PRD v4, PRD v3, dan registry; v5 dari naskah bagian 6", () => {
    const prd4 = T4("prd-v4.mdx");
    const prd3 = T3("prd-v3.mdx");
    ada(prd3, "| P0 | Dasbor web warung | Laporan penjualan harian", "PRD v3");
    ada(prd4, "| P2 | Ditunda ke v5 | Laporan merchant real-time, notifikasi massal skala besar, cicilan dan tabungan, API publik untuk POS |", "PRD v4");
    ada(prd4, `Lingkupnya publik: ${titik(a4.user)} user terdaftar`, "PRD v4");
    ada(prd4, "merchant di luar Lestari", "PRD v4");
    for (const x of ["top-up", "QR", "Kartu virtual"]) ada(prd4, x, "PRD v4");
    ada(JSON.stringify(cerita.tahap[3]!.arsitektur), "Gateway pembayaran, layanan verifikasi, dan penerbit kartu", "registry Tahap 4");
    ada(T4("tim-infra.mdx"), `${timAnggota} developer dalam tiga tim`, "4.26");
    ada(T4("prd-v4.mdx"), `${timAnggota} engineer dalam tiga tim`, "4.1");
    const baris = badan.split("\n").filter((b) => /^\| (Lingkup|Laporan|Notifikasi|Produk uang|Integrasi|Tim) \|/.test(b));
    expect(baris).toEqual([
      `| Lingkup | Publik: ${titik(a4.user)} user terdaftar, merchant di luar Lestari | Nasional: ${skala.replace("Skala nasional: ", "")} |`,
      `| Laporan | Dasbor web warung dari PRD v3 | ${laporan} |`,
      `| Notifikasi | Notifikasi uang per kejadian, dan pengumuman promo atau top-up massal sampai ${titik(a3.user)} notifikasi sekaligus ([[t3-prd]]) | ${notifikasi} |`,
      `| Produk uang | Saldo, top-up dari bank, QR, dan kartu virtual | ${cicilan} |`,
      `| Integrasi | Gateway, layanan verifikasi, dan penerbit kartu | ${api} |`,
      `| Tim | ${timAnggota} developer dalam tiga tim (Asumsi cerita) | ${timBaru[2]} orang dalam ${timBaru[3]} tim, ditambah platform, SRE, dan security (Asumsi cerita) |`,
    ]);
    expect(badan).toContain("| | PRD v4 | PRD v5 (Ilustrasi) |\n|---|---|---|\n");
  });
  test("label: Ilustrasi, Hitungan, dan Asumsi didefinisikan; label sumber menaut ke A0", () => {
    harus("Isi PRD v5 adalah rencana cerita (Ilustrasi): contoh, bukan hasil sistem. Hitungan berarti rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya. Arti label sumber ada di [[A0]].");
    expect(badan.indexOf("Hitungan berarti rumus")).toBeLessThan(badan.indexOf("(Hitungan"));
    expect(badan.indexOf("Hitungan berarti rumus")).toBeLessThan(badan.indexOf("<Tebak"));
    harus("SRE (site reliability engineer) adalah engineer yang menjaga sistem produksi tetap berjalan, dan POS (point of sale) adalah kasir elektronik di toko.");
    expect(badan.indexOf("SRE (site reliability engineer)"), "arti SRE dan POS di blok pertama, sebelum tebakan").toBeLessThan(badan.indexOf("<Tebak"));
    expect(hitung(badan, "SRE (site reliability engineer)")).toBe(1);
    ada(T4("prd-v4.mdx"), "Hitungan adalah rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya.", "4.1");
    expect(cara).toContain("Label sumber");
  });
  test("ADR 34 sampai 45 dari registry: tiap nomor punya satu halaman Tahap 4; definisi 'pecah'", () => {
    const nomorAdr = hal.filter((h) => h.tahap === 4 && h.adr).flatMap((h) => h.adr!).sort((x, y) => x - y);
    expect(nomorAdr).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]);
    for (const n of nomorAdr) halamanAdr(n);
    harus(`Tahap ${N4} menghasilkan ADR ${nomorAdr[0]} sampai ${nomorAdr[nomorAdr.length - 1]}. Sebagian dari keputusan itu akan pecah lebih dulu daripada yang lain. Pecah berarti halaman ADR itu menulis keadaan yang sama dengan satu isi PRD v${N5}. Keadaan itu bisa berupa syarat salah, pemicu, atau hal yang direvisi tahap berikutnya.`);
    expect(data.adegan[0]).toBe(`Sinta membagikan PRD v${N5}. Raka membuka ADR ${nomorAdr[0]} sampai ${nomorAdr[nomorAdr.length - 1]} yang lahir di Tahap ${N4}.`);
  });
});

// ---- Ruang lingkup ---------------------------------------------------------------------------------------------------------
describe("ruang lingkup: lima isi PRD v5 dan tim, tiap baris dengan keadaan terdekat di Tahap 4 dari halaman yang ditaut", () => {
  test("pembuka: empat isi sudah P2 di PRD v4; kalimat dan baris tabel sama dengan sumber", () => {
    const prd4 = T4("prd-v4.mdx");
    const p2 = cocok(prd4, /\| P2 \| Ditunda ke v5 \| (.+) \|/)[1]!.split(", ");
    expect(p2).toHaveLength(lima.length - 1);
    expect(p2.map((x) => x.toLowerCase())).toEqual(["laporan merchant real-time", "notifikasi massal skala besar", "cicilan dan tabungan", "api publik untuk pos"]);
    harus(`PRD v${N4} sudah menulis ${KATA[p2.length]} isi PRD v${N5} sebagai P2 yang ditunda ke v${N5} ([[t4-prd]]). Dua hal lain, skala nasional dan tim yang naik, ikut di PRD v${N5}. Tabel ini menaruh tiap isi di samping keadaan terdekatnya di Tahap ${N4}.`);
  });
  test("tabel: sel kiri dari naskah bagian 6, sel kanan dari angka beban dan halaman yang ditaut", () => {
    const [skala, laporan, notifikasi, cicilan, api] = lima as [string, string, string, string, string];
    const baris = badan.split("\n").filter((b) => /^\| (Skala nasional|Laporan merchant|Notifikasi massal|Cicilan|API publik|20 sampai 40)/.test(b));
    expect(baris).toEqual([
      `| ${skala} | ${titik(a4.user)} user terdaftar, ±400 merchant luar, dan ±60 warung (Asumsi). Puncak ${koma(puncak, 1)} request per detik dan ${jumlahKoneksi} dari ${koneksi[3]} koneksi database (Hitungan atas Asumsi, [[t4-estimasi]]) |`,
      `| ${laporan} | Dasbor web warung dari PRD v3 ([[t3-prd]]). ADR 45 menunda read replica, yaitu salinan database untuk bacaan, dan satu pemicunya adalah laporan ini ([[t4-adr-45]]) |`,
      `| ${notifikasi} | Notifikasi uang memakai ${koma(notif, 2)} dari ${koma(kapasitas, 2)} pengiriman per detik di puncak, dan pengumuman ke ${titik(HP)} HP butuh paling sedikit ${menitHp} menit (Hitungan atas Asumsi, Tidak dijalankan; [[t4-m39]]) |`,
      `| ${cicilan} | Contoh proses terjadwal yang ada: rekonsiliasi harian dengan gateway ([[t4-rekonsiliasi]]) dan pencairan warung tiap Jumat ([[t2-pencairan]]) |`,
      `| ${api} | PRD v3 menulis API untuk kasir pihak ketiga sebagai bukan lingkup ([[t3-prd]]). Contoh pihak luar yang memanggil Rekeningo di Tahap 4: gateway lewat webhook ([[t4-webhook]]) dan penerbit kartu ([[t4-kartu]]) |`,
      `| ${timBaru[2]} orang dalam ${timBaru[3]} tim | ${timAnggota} developer dalam tiga tim: Pembayaran ${timLama[1]}, Merchant ${timLama[2]}, Platform ${timLama[3]} (Asumsi cerita), di satu repo. Lima modul berjalan di satu proses, dan modul pembayaran di service sendiri ([[t4-modul]]) |`,
    ]);
    expect(badan).toContain("| Isi PRD v5 | Keadaan terdekat di Tahap 4 |\n|---|---|\n");
  });
  test("klaim di sel kanan ada di halaman sumbernya", () => {
    ada(T4("prd-v4.mdx"), "Merchant luar (Bu Marni dan ±400 lainnya, Asumsi)", "4.1");
    ada(T4("prd-v4.mdx"), "Ani satu dari ±60 warung Lestari", "4.1");
    ada(T4("qr-pembayaran.mdx"), "±460 merchant: ±400 merchant luar dan ±60 warung Lestari", "4.19");
    ada(bagian(naskah4, "## 1. PRD v4 · Rekeningo dibuka ke publik"), "Bu Marni dan ±400 lainnya, Asumsi", "naskah 4 bagian 1");
    ada(naskah4, "Ani** satu dari ±60 warung Lestari", "naskah 4");
    ada(T3("prd-v3.mdx"), "API untuk kasir pihak ketiga", "3.1");
    ada(T3("prd-v3.mdx"), `Top-up massal tiap Senin boleh menyusul beberapa menit, karena ${titik(a3.user)} notifikasi sekaligus`, "3.1");
    ada(T3("prd-v3.mdx"), "| P1 | Promo dari HR |", "3.1");
    ada(T3("estimasi.mdx"), `di Tahap 3 angkanya 750 detik untuk ${titik(a3.user)} HP`, "3.29");
    expect(badan, "PRD v3 sudah punya pengumuman ke 10.000 HP: v4 bukan hanya satu notifikasi per kejadian").not.toContain("Satu notifikasi per kejadian uang");
    expect(T3("prd-v3.mdx").split("\n").filter((b) => b.startsWith("**Bukan lingkup v3:**"))[0]!).toContain("API untuk kasir pihak ketiga");
    ada(T4("rekonsiliasi-gateway.mdx"), "Rekonsiliasi harian", "4.9");
    ada(T2("fitur-pencairan.mdx"), "Pencairan adalah job tiap Jumat 15.00", "2.5");
    ada(T4("webhook-masuk.mdx"), "gateway", "4.7");
    ada(naskah4, "penerbit kartu yang memanggil Rekeningo dengan tenggat 2 detik", "naskah 4");
    ada(T4("modular-monolith.mdx"), "Modul `ledger`, `akun`, `identitas`, `merchant`, dan `platform` hidup di satu repo dan satu proses. Modul `pembayaran` (gateway, kartu, webhook) adalah satu service terpisah", "4.13");
    ada(T4("modular-monolith.mdx"), "Lima modul berjalan di satu proses, dan satu modul berjalan di proses sendiri.", "4.13");
    expect(badan, "13 developer tidak semuanya di satu proses: modul pembayaran adalah service sendiri").not.toMatch(/satu repo dan satu proses/);
    const adr37Naskah = naskah4.split("\n").filter((b) => b.startsWith("| 37 | "))[0]!;
    ada(adr37Naskah, "dalam satu repo dan satu proses", "naskah ADR 37");
    expect(naskah4.split("\n").filter((b) => b.startsWith("| 45 | "))[0]!).toContain("read replica dan PgBouncer (40 dari 100 koneksi; pemicu laporan merchant real-time)");
    expect(baca("situs/data/halaman-istilah/pgbouncer.json")).toContain("PgBouncer");
  });
  test("halaman ini tidak menghitung ulang beban untuk 1 juta user", () => {
    const semua = badan + "\n" + teksWidget;
    expect(semua).not.toMatch(/1\.389|1\.250 menit|75\.000 detik|20,8 jam|5,79|1\.157/);
    harus(`Halaman ini juga tidak menghitung beban tiap komponen untuk 1 juta user, yang ${rasio} kali ${titik(a4.user)} (Hitungan: ${titik(a5.user)} ÷ ${titik(a4.user)}). Hitungan beban Tahap ${N5} ada di [[t4-estimasi]] (Hitungan atas Asumsi), dan halaman ini tidak memakainya untuk memilih ADR.`);
  });
});

// ---- Menuju Tahap 5 ---------------------------------------------------------------------------------------------------------
describe("Menuju Tahap 5: tiga keadaan yang cocok dikutip dari halaman ADR-nya; dua pilihan lain dihitung dari halaman ADR-nya", () => {
  const adr36 = isi(halamanAdr(36));
  const adr37 = isi(halamanAdr(37));
  const adr40 = isi(halamanAdr(40));
  const adr41 = isi(halamanAdr(41));
  const adr45 = isi(halamanAdr(45));
  const pemicu = cocok(adr45, /koneksi database: (\d+) dari pemicu (\d+), atau (\d+)%/);
  const persenPemicu = Number(pemicu[3]);
  const adr44 = isi(halamanAdr(44));
  const salah36 = kapanSalah(adr36);
  const salah37 = kapanSalah(adr37);
  const salah40 = kapanSalah(adr40);
  const salah41 = kapanSalah(adr41);
  const POLA_V5 = /laporan merchant|real-time|notifikasi massal|cicilan|tabungan|\bPOS\b|API publik|20 sampai 40|ratusan ribu|juta user/i;
  test("jawaban tebakan dibuka di halaman pertama Tahap 5; 'pecah lebih dulu' adalah penalaran (Asumsi)", () => {
    harus("Jawaban tebakan dibuka di halaman pertama Tahap 5. Halaman ini hanya mencatat apa yang sudah tertulis di halaman Tahap 4.");
    harus('Di halaman ini "pecah lebih dulu" adalah penalaran dari kalimat halaman ADR (Asumsi), bukan urutan kejadian yang direkam.');
    harus("Tiga keadaan yang cocok ditulis di halaman ADR-nya:");
    harus("Dua pilihan lain di tebakan tidak cocok dengan isi PRD v5:");
    harus("Tebakan hanya membandingkan tiga pilihan, jadi ADR lain tidak dinilai di sini. ADR 38, misalnya, menulis hitungan untuk beban sepuluh kali lipat di salah satu syarat salahnya, dan halaman ini tidak menilainya ([[t4-storage]]).");
    const salah38 = kapanSalah(isi(halamanAdr(38)));
    expect(halamanAdr(38).id).toBe("t4-storage");
    expect(salah38.filter((b) => /Registry Tahap 5 memberi .*sepuluh kali Tahap 4/.test(b))).toHaveLength(1);
    expect(hitung(badan, "ADR 38")).toBe(1);
  });
  test("ADR 45: pemicu read replica dan PgBouncer adalah laporan merchant real-time (naskah 4)", () => {
    harus(`- ADR 45: satu dari tiga pemicu read replica adalah laporan merchant real-time yang diminta PRD v${N5}. Empat pemicu berangka di halaman itu belum terlewati, dan yang terdekat ${persenPemicu}% ([[t4-adr-45]]).`);
    expect(halamanAdr(45).id).toBe("t4-adr-45");
    ada(adr45, "Empat pemicu berupa angka beban bisa dibaca hari ini, di tiga dari delapan butir, dan tak satu pun terlewati. Yang terdekat adalah koneksi database: 40 dari pemicu 70, atau 57%.", "4.29");
    expect(Number(pemicu[1])).toBe(jumlahKoneksi);
    expect(Math.round((Number(pemicu[1]) / Number(pemicu[2])) * 100)).toBe(persenPemicu);
    const butir4 = adr45.split("\n").filter((b) => b.startsWith("| 4. Read replica dan PgBouncer |"));
    expect(butir4.length).toBeGreaterThanOrEqual(2);
    ada(butir4.join("\n"), "atau laporan merchant real-time diminta PRD v5", "4.29");
    ada(butir4.join("\n"), "Read replica: query baca yang sudah memakai index menahan 5 koneksi, atau laporan berat membuat p95 request bayar melewati ambang", "4.29");
    ada(adr45, "[[t4-jembatan]] meminta kamu menebak keputusan Tahap 4 mana yang pecah lebih dulu. Tahap 5 membaca daftar ini terhadap PRD v5, dengan angka tahap itu.", "4.29");
    ada(T4("m39-prd-v5.mdx"), "- [[t4-jembatan]]: pratinjau PRD v5, dengan tebakan mana yang pecah lebih dulu.", "4.27");
    expect(naskah4.split("\n").filter((b) => b.startsWith("| 45 | "))[0]!).toContain("read replica dan PgBouncer (40 dari 100 koneksi; pemicu laporan merchant real-time)");
    expect(POLA_V5.test(bag6)).toBe(true);
    expect(bag6).toContain("ADR 45 menunda read replica sampai");
  });
  test("ADR 36: breaker di memori satu proses worker, dua worker tidak berbagi hitungan; 125 menit dari naskah", () => {
    harus(`- ADR 36: breaker hidup di memori satu proses worker, jadi dua worker tidak berbagi hitungan (Tidak dijalankan: dibaca dari kode; [[t4-breaker]]). Pengumuman ke ${titik(HP)} HP lewat satu queue butuh paling sedikit ${menitHp} menit (Hitungan atas Asumsi, Tidak dijalankan; [[t4-m39]]).`);
    ada(T4("m39-prd-v5.mdx"), `Pengumuman ke ${titik(HP)} HP dihitung ${titik(HP)} × 0,3 ÷ 4 = ${titik(HP / kapasitas)} detik, yaitu ${menitHp} menit (Hitungan, Tidak dijalankan: lab tidak menulis ${titik(HP)} baris).`, "4.27");
    ada(T4("m39-prd-v5.mdx"), `${menitHp} menit adalah batas bawah karena worker juga mengirim notifikasi uang`, "4.27");
    expect(salah36).toHaveLength(5);
    const butir = salah36.filter((b) => b.startsWith("Saat worker lebih dari satu."));
    expect(butir).toHaveLength(1);
    ada(butir[0]!, "Breaker hidup di memori satu proses worker (dibaca dari kode, tidak direkam). Dua worker tidak berbagi hitungan", "4.11");
    expect(halamanAdr(36).id).toBe("t4-breaker");
    expect(belumDiuji).toContain("satu worker untuk notifikasi massal");
    expect(bag6).toContain(`pengumuman ke ${titik(HP)} HP butuh ${menitHp} menit`);
  });
  test("ADR 37 dan ADR 44: tim yang membuat deploy bersama tidak lagi masuk akal; Tahap 5 menaikkan tim dan batas modul menjadi batas deploy", () => {
    harus(`- ADR 37: keputusannya salah saat tim membuat deploy bersama tidak lagi masuk akal, dan dari ${timAnggota} developer itu belum terlihat ([[t4-modul]]). ADR 44 menulis hal yang sama untuk tim: pipeline dan giliran jaga dibagi per tim, dan batas modul perlu menjadi batas deploy ([[t4-tim-infra]]).`);
    expect(salah37).toHaveLength(4);
    const butir = salah37.filter((b) => b.startsWith("Saat satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal."));
    expect(butir).toHaveLength(1);
    ada(butir[0]!, `Dari ${timAnggota} developer dan 6,94 transaksi uang per detik, itu belum terlihat (Asumsi).`, "4.13");
    const rev = merevisi(adr44);
    ada(rev, `Tahap ${N5} menaikkan tim dari ${timBaru[1]} menjadi ${timBaru[2]} orang dalam ${timBaru[3]} tim (naskah Tahap ${N4}, jembatan). Pipeline dan giliran jaga dibagi per tim, dan batas modul perlu menjadi batas deploy.`, "4.26");
    expect(halamanAdr(37).id).toBe("t4-modul");
    expect(halamanAdr(44).id).toBe("t4-tim-infra");
    expect(belumDiuji).toContain(`${timBaru[1]} orang menjadi ${timBaru[2]} di satu repo`);
  });
  test("ADR 41: lima syarat salah; syarat pertama per satu impor 50 ÷ 8 = 6,25 menjadi 7 gelombang, 7 × 3 detik = 21 detik; tanpa isi PRD v5", () => {
    harus("- ADR 41: syarat pertamanya dihitung per satu impor: 50 produk menjadi 21 detik dalam satu request ([[t4-ssrf]]).");
    expect(salah41).toHaveLength(5);
    const gelombang = Math.ceil(50 / 8);
    expect(koma(50 / 8, 2)).toBe("6,25");
    expect(gelombang).toBe(7);
    expect(gelombang * 3).toBe(21);
    ada(salah41[0]!, `Dengan 8 unduhan serentak, 50 ÷ 8 = 6,25 menjadi ${gelombang} gelombang, dan ${gelombang} × 3 detik = ${gelombang * 3} detik dalam satu request`, "4.21");
    ada(salah41[0]!, "satu impor 50 produk", "4.21");
    expect(salah41.filter((b) => POLA_V5.test(b))).toEqual([]);
    expect(salah41.map((b) => b.split(".")[0]!.slice(0, 40))).toEqual([
      "Saat satu impor 50 produk (Asumsi lab) memb", "Saat header jawaban tidak dibatasi", "Saat server merchant yang sah sering lebih lambat dari 3 detik", "Saat fitur impor URL jarang dipakai", "Saat hosting memakai NAT64 milik operator",
    ].map((x) => x.slice(0, 40)));
    dalamWidget("Halaman 4.21 menulis lima syarat salah ADR 41. Syarat pertama dihitung per satu impor: 50 produk dan 8 unduhan serentak menjadi 7 gelombang, jadi 7 × 3 detik = 21 detik dalam satu request (Hitungan atas Asumsi lab).");
    dalamWidget("Empat syarat lain tentang header jawaban, server merchant yang lambat, fitur impor yang jarang dipakai, dan NAT64.");
    expect(dari("t4-ssrf").nomor).toBe("4.21");
  });
  test("ADR 40: empat syarat salah; hanya syarat ketiga memakai ±460 merchant (15 merchant, 3,3%); 15 ÷ 100.000 = 0,015%; tanpa isi PRD v5", () => {
    harus("- ADR 40: syarat ketiganya memakai 15 merchant, atau 3,3% dari ±460 merchant. Bila merchant bertambah, pembanding persen itu mengecil ([[t4-qr]]).");
    expect(salah40).toHaveLength(4);
    const pakaiMerchant = salah40.map((b, i) => [i, /±\d+ merchant/.test(b)] as const).filter(([, ya]) => ya).map(([i]) => i);
    expect(pakaiMerchant).toEqual([2]);
    ada(salah40[2]!, "5 akun × 3 laporan = 15 merchant, atau 3,3% dari ±460 merchant", "4.19");
    expect(koma((15 / 460) * 100, 1)).toBe("3,3");
    expect(koma((15 / 100000) * 100, 3)).toBe("0,015");
    expect(salah40.filter((b) => POLA_V5.test(b))).toEqual([]);
    expect(salah40.map((b) => b.split(".")[0]!.slice(0, 32))).toEqual([
      "Saat pembeli tidak membaca nama", "Saat merchant tidak punya cara menampilkan QR dinamis", "Saat pembekuan massal mudah dilakukan", "Saat QR dinamis kedaluwarsa sebelum dibayar",
    ].map((x) => x.slice(0, 32)));
    dalamWidget("Halaman 4.19 menulis empat syarat salah ADR 40. Hanya syarat ketiga memakai jumlah merchant: 5 akun × 3 laporan = 15 merchant, atau 3,3% dari ±460. Bila merchant paling sedikit 100.000, 15 ÷ 100.000 = 0,015% (Hitungan atas Asumsi)");
    dalamWidget("Tiga syarat lain tentang pembeli yang tidak membaca nama, merchant tanpa QR dinamis, dan QR dinamis yang kedaluwarsa sebelum dibayar.");
    expect(dari("t4-qr").nomor).toBe("4.19");
    ada(naskah4, "Bu Marni dan ±400 lainnya", "naskah 4");
    ada(naskah4, "ratusan ribu merchant", "naskah 4");
  });
  test("heuristik ±50 developer: tanpa sumber primer di 4.13, [perlu verifikasi], tidak dipakai sebagai pembanding", () => {
    harus("Satu heuristik praktisi menyebut bahwa microservices baru masuk akal di atas ±50 developer. [[t4-modul]] tidak menemukan sumber primer untuk angka itu [perlu verifikasi], jadi halaman ini tidak memakainya.");
    ada(adr37, "Pencarian 2026-10-29 tidak menemukan sumber primer untuk angka itu, dan tulisan konsultan memberi angka yang saling bertentangan [perlu verifikasi]. Halaman ini tidak memakainya sebagai pembanding.", "4.13");
    expect(naskah4).toContain("±50 developer");
    expect(hitung(badan, "±50")).toBe(1);
    expect(hitung(teksWidget, "±50")).toBe(0);
    expect(hitung(badan, "[perlu verifikasi]")).toBe(1);
  });
  test("satu hal yang belum selesai: kapasitas satu server belum terukur; make beban memberi batas di satu laptop", () => {
    harus("Satu hal dari Tahap 4 belum selesai dan ikut masuk ke PRD v5. Kapasitas satu server belum terukur. `make beban` di lab `api-t4` memeriksa status 200 atau 201 dan p95 di bawah 500 ms di satu laptop. Itu batas lab (Asumsi), bukan kapasitas produksi ([[t4-m39]]).");
    ada(T4("m39-prd-v5.mdx"), "Jawaban server hanya dilihat oleh status 200 atau 201 dan p95 di bawah 500 ms, dan keduanya batas lab, bukan kapasitas produksi.", "4.27");
    ada(T4("m39-prd-v5.mdx"), "Rekaman hanya menulis bahwa p95 di bawah 500 ms, batas lab (Asumsi).", "4.27");
    ada(naskah4, "Kapasitas satu server tetap belum terukur. Target `make beban` di lab `api-t4` memberi beban berjadwal 138,9 request per detik dan mengukur koneksi dan p95 di laptop lab. Itu bukan kapasitas produksi", "naskah 4");
    expect(fs.existsSync(path.join(akar, "labs/api-t4/Makefile"))).toBe(true);
    expect(baca("labs/api-t4/Makefile")).toContain("beban:");
  });
  test("ADR dalam jawaban dan keadaan: urutan bullet 45, 36, 37 sama dengan tiga hal naskah (database, worker, tim)", () => {
    const tiga = belumDiuji.split(/, (?:dan )?/);
    expect(tiga).toHaveLength(3);
    const bullets = badan.split("\n").filter((b) => /^- ADR (45|36|37):/.test(b));
    expect(bullets.map((b) => b.slice(0, 8))).toEqual(["- ADR 45", "- ADR 36", "- ADR 37"]);
    expect(tiga[0]).toContain("database");
    expect(tiga[1]).toContain("worker");
    expect(tiga[2]).toContain("repo");
  });
});

// ---- Widget tebak -----------------------------------------------------------------------------------------------------------
describe("widget tebak: tepat satu pilihan cocok, posisi dan panjang tidak membocorkan, tanpa jawaban Tahap 5", () => {
  const j = data.pilihan.findIndex((p) => p.benar);
  const jawab = [36, 37, 44, 45];
  const tebakLain = ["t4-audit-tebak", "t4-kartu-tebak", "t4-qr-tebak", "t4-storage-tebak", "t4-modul-tebak", "t4-skema-tebak"].map((n) => {
    const d = DataTebak.parse(JSON.parse(baca(`situs/data/widget/${n}.json`)));
    return [n, d.pilihan.findIndex((p) => p.benar)] as const;
  });
  test("struktur: tiga pilihan, benar kedua, tidak yang terpanjang atau terpendek, semua diawali ADR", () => {
    expect(data.pilihan).toHaveLength(3);
    expect(data.pilihan.filter((p) => p.benar)).toHaveLength(1);
    expect(j).toBe(1);
    const panjang = data.pilihan.map((p) => p.teks.length);
    expect(panjang[j]!).toBeLessThan(Math.max(...panjang));
    expect(panjang[j]!).toBeGreaterThan(Math.min(...panjang));
    for (const p of data.pilihan) expect(p.teks.startsWith("ADR "), p.teks).toBe(true);
    expect(data.pilihan[j]!.teks.startsWith(`ADR ${jawab[0]}, ADR ${jawab[1]}, ADR ${jawab[2]}, dan ADR ${jawab[3]}:`)).toBe(true);
    for (let i = 0; i < data.pilihan.length; i++) {
      expect(nilai(data, i).benar).toBe(i === j);
      if (i !== j) expect(nilai(data, i).alasan[1]).toBe(data.pilihan[j]!.alasan);
    }
    expect(new Set(data.pilihan.map((p) => p.alasan)).size).toBe(3);
    expect(data.sumber.jenis).toBe("asumsi");
    expect(data.id).toBe(`${r.id}-tebak`);
    expect(data.judul).toBe(`ADR Tahap ${N4} yang pecah lebih dulu`);
    expect(data.pertanyaan).toBe(`Dari ADR Tahap ${N4}, mana yang pecah lebih dulu?`);
    expect(bag6).toContain(`Pembaca diminta menebak: dari ADR Tahap ${N4}, mana yang pecah lebih dulu?`);
  });
  test("posisi jawaban tidak sama dengan tebakan Tahap 4 yang berdekatan, dan label tidak menyatakan 'Tepat' atas jawaban Tahap 5", () => {
    const dekat = Object.fromEntries(tebakLain);
    expect(dekat["t4-audit-tebak"]).not.toBe(j);
    expect(dekat["t4-kartu-tebak"]).not.toBe(j);
    expect(data.label).toEqual({
      sumber: "Asumsi · penalaran dari halaman ADR Tahap 4",
      tebakDulu: "Tebak dulu:",
      benar: "Cocok dengan halaman ADR",
      belum: "Belum cocok dengan halaman ADR",
      ulang: "Coba pilihan lain",
      jawaban: "Yang cocok dengan halaman ADR",
    });
    expect(data.sumber.teks).toBe(`Penalaran dari kalimat halaman ADR Tahap ${N4} dan hitungan Asumsi di halaman ${dari("t4-m39").nomor}; tidak ada rekaman atau lab untuk PRD v${N5}`);
  });
  test("pilihan benar: empat ADR sama dengan bullet halaman dan keadaan naskah; tiap kalimat alasan dari halaman ADR", () => {
    harus(`Pilihan yang cocok dengan halaman ADR: ADR ${jawab[0]}, ADR ${jawab[1]}, ADR ${jawab[2]}, dan ADR ${jawab[3]}.`);
    harus('<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Pilihan yang cocok dengan halaman ADR: ADR 36, ADR 37, ADR 44, dan ADR 45. Alasannya ada di blok Menuju Tahap 5, dan jawabannya dibuka di halaman pertama Tahap 5.</p>\n</noscript>');
    harus('<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v5">');
    const a = data.pilihan[j]!.alasan;
    expect(a.startsWith("Tiga keadaan itu ditulis di halaman ADR-nya. ADR 45 menunda")).toBe(true);
    ada(a, "ADR 45 menunda read replica, dan satu dari tiga pemicunya adalah laporan merchant real-time yang diminta PRD v5.");
    ada(a, "ADR 36 menulis bahwa breaker hidup di memori satu proses worker, jadi dua worker tidak berbagi hitungan (Tidak dijalankan: dibaca dari kode).");
    ada(a, `Pengumuman ke ${titik(HP)} HP butuh paling sedikit ${menitHp} menit di satu queue (Hitungan atas Asumsi, Tidak dijalankan), jadi jumlah worker bisa menjadi pertanyaan (penalaran), dan ADR 36 sudah menulis akibatnya bila worker lebih dari satu.`);
    expect(teksWidget, "4.28: komponen untuk beban Tahap 5 belum diputuskan di Tahap 4").not.toMatch(/menambah worker|langkah yang masuk akal/);
    ada(a, "ADR 37 salah bila tim membuat deploy bersama tidak lagi masuk akal, dan ADR 44 menulis bahwa tim yang naik membagi pipeline dan giliran jaga per tim.");
    ada(a, "Ini bacaan dari halaman Tahap 4 (Asumsi), bukan hitungan beban untuk 1 juta user.");
    expect(data.pilihan[j]!.teks).toBe("ADR 36, ADR 37, ADR 44, dan ADR 45: worker notifikasi, batas modul dan pipeline per tim, dan database yang sama untuk laporan.");
    expect(new Set(jawab.map((n) => halamanAdr(n).adr![0]))).toEqual(new Set(jawab));
    expect(data.pilihan[0]!.teks).toBe("ADR 41: unduh gambar dari alamat merchant tidak lagi aman, karena ratusan ribu merchant memberi alamat gambar sendiri.");
    expect(data.pilihan[2]!.teks).toBe("ADR 40: QR merchant tidak cukup lagi, karena merchant naik dari ±460 menjadi ratusan ribu dan pembekuan massal menjadi ancaman nyata.");
    ada(data.pilihan[0]!.alasan, "Tidak satu pun menyebut laporan, notifikasi massal, cicilan, API untuk POS, atau jumlah orang di tim.");
    ada(data.pilihan[0]!.alasan, "Daftar syarat salah di halaman itu tidak menulis keadaan yang PRD v5 minta.");
    ada(data.pilihan[2]!.alasan, "Daftar syarat salah di halaman itu tidak menulis keadaan yang PRD v5 minta.");
  });
  test("adegan: PRD v5 meminta lima isi (Ilustrasi) dan tim naik dari 13 menjadi 20 sampai 40 (Asumsi cerita)", () => {
    expect(data.adegan).toHaveLength(2);
    expect(data.adegan[1]).toBe(
      "PRD v5 meminta skala nasional, laporan merchant real-time, notifikasi massal, cicilan dan tabungan, dan API untuk POS pihak ketiga (Ilustrasi). " +
        `Tim naik dari ${timBaru[1]} menjadi ${timBaru[2]} orang (Asumsi cerita).`,
    );
    for (const x of ["skala nasional", "laporan merchant real-time", "notifikasi massal", "cicilan dan tabungan"]) expect(lima.join(" ").toLowerCase()).toContain(x);
    expect(lima[4]!).toBe("API publik untuk POS pihak ketiga");
  });
  test("tanpa kata rekaman untuk angka yang bukan dari rekaman; jawaban Tahap 5 tidak dinyatakan sebagai fakta", () => {
    expect(hitung(teksWidget, "Rekaman lab")).toBe(0);
    expect((teksWidget.match(/rekaman lab\b/gi) ?? []).length).toBe(0);
    expect(teksWidget).not.toMatch(/Tepat\b|Jawaban yang tepat/);
    expect(data.pilihan.map((p) => p.benar)).toEqual([false, true, false]);
  });
});

// ---- Cek diri ---------------------------------------------------------------------------------------------------------------
describe("kartu Cek diri: tiga kartu sama dengan kartu.json, fakta sama dengan hitungan dan halaman", () => {
  const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3"]);
    expect(hitung(badan, '<details class="success">')).toBe(3);
    const k = kartu.filter((x) => x.halaman === "t4-jembatan");
    expect(k.map((x) => x.id)).toEqual(["t4-jembatan-1", "t4-jembatan-2", "t4-jembatan-3"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("4.31 Jembatan: pratinjau PRD v5");
      expect(x.url).toBe("tahap-4/jembatan-prd-v5/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab);
    });
  });
  test("jawaban memuat fakta yang sama dengan hitungan: 10 kali, 1.000.000 ÷ 100.000, empat ADR, halaman 4.27", () => {
    expect(soal[0]!.tanya).toBe(`Jumlah user naik ${rasio} kali di PRD v${N5}. Kenapa halaman ini tidak memakai kenaikan itu untuk memilih ADR yang pecah lebih dulu?`);
    expect(soal[0]!.jawab).toBe(
      `${titik(a5.user)} ÷ ${titik(a4.user)} = ${rasio} (Hitungan atas Asumsi cerita). Menghitung tiap komponen untuk 1 juta user adalah hitungan beban, dan halaman ini tidak menghitungnya. Yang dibandingkan adalah keadaan yang ditulis halaman ADR sendiri, dan itu Asumsi.`,
    );
    expect(soal[1]!.tanya).toBe("Sebutkan keadaan yang ditulis ADR 36, ADR 37, ADR 44, dan ADR 45 sendiri.");
    expect(soal[1]!.jawab).toBe(
      `ADR 36: breaker di memori satu proses worker, jadi dua worker tidak berbagi hitungan. ADR 37: tim yang membuat deploy bersama tidak lagi masuk akal. ADR 44: tim yang naik, sehingga pipeline dan giliran jaga dibagi per tim. ADR 45: satu pemicu read replica adalah laporan merchant real-time yang diminta PRD v${N5}.`,
    );
    expect(soal[2]!.tanya).toBe('Kenapa "pecah lebih dulu" di halaman ini berlabel Asumsi, bukan Rekaman lab?');
    expect(soal[2]!.jawab).toBe(
      `Tidak ada lab yang menjalankan PRD v${N5}. Penentuannya penalaran dari kalimat halaman ADR dan dari tiga hal yang belum pernah diuji di halaman ${dari("t4-m39").nomor}. Jawabannya dibuka di halaman pertama Tahap ${N5}.`,
    );
  });
});

// ---- Struktur dan dunia angka tertutup ---------------------------------------------------------------------------------------
describe("struktur halaman dan dunia angka tertutup", () => {
  const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI|naskah/i;
  test("hanya satu heading (h3 Cek diri, di blok terakhir); dua tabel; satu noscript; tiga success; tanpa daftar bernomor", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(2);
    expect(hitung(badan, '<details class="question">')).toBe(0);
    expect(hitung(badan, "<details>")).toBe(0);
    expect(hitung(badan, "<noscript>")).toBe(1);
    expect(badan).not.toMatch(/^\d+\. /m);
    expect(badan.split("\n").filter((b) => /^- /.test(b))).toHaveLength(3 + 2);
    expect(hitung(badan, "<Blok ")).toBe(4);
    expect(hitung(badan, "</Blok>")).toBe(4);
    for (const impor of [
      'import Blok from "../../../components/Blok.astro";',
      'import Tebak from "../../../widgets/tebak/Tebak.tsx";',
      'import { muat, label, url as urlHalaman } from "../../../../tools/registri.mjs";',
    ]) expect(badan, impor).toContain(impor);
    expect(badan.split("\n").filter((b) => b.startsWith("import "))).toHaveLength(4);
  });
  test("tanpa ID internal, emoji, tanda seru, kata yang dilarang gaya-bahasa; tanpa kata rekaman untuk angka yang bukan dari rekaman", () => {
    for (const teks of [badan, frontmatter, teksWidget]) {
      expect(teks).not.toMatch(POLA_ID_INTERNAL);
      expect(teks).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(teks).not.toMatch(/!(?!\[)/);
      expect(teks).not.toMatch(/\b(Anda|kita|pengguna|mudah|tinggal)\b|(?<!tidak )\bcukup\b/i);
      expect(teks).not.toMatch(/terbukti|(?<!belum )terukur/i);
    }
    expect(hitung(badan, "Rekaman lab")).toBe(1);
    expect(badan).toContain("berlabel Asumsi, bukan Rekaman lab?");
  });
  test("angka berkoma dan berpemisah ribuan, persen, ADR, dan Tahap: himpunan token sama dengan yang dihitung dari sumber", () => {
    const boleh = new Set([koma(puncak, 1), koma(notif, 2), koma(kapasitas, 2), koma((15 / 460) * 100, 1)]);
    const token = [...badan.matchAll(/\d+,\d+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))], "token berkoma di halaman yang tidak dihitung dari sumber").toEqual([]);
    for (const b of boleh) expect(token, `nilai yang dihitung tidak dipakai halaman: ${b}`).toContain(b);
    expect([...new Set([...badan.matchAll(/\d{1,3}(?:\.\d{3})+/g)].map((m) => m[0]))].sort()).toEqual([titik(a3.user), titik(a4.user), titik(a5.user)].sort());
    expect([...new Set([...badan.matchAll(/\d+(?:,\d+)?%/g)].map((m) => m[0]))].sort()).toEqual([`${koma((15 / 460) * 100, 1)}%`, `${Math.round((jumlahKoneksi / Number(cocok(isi(halamanAdr(45)), /dari pemicu (\d+), atau/)[1])) * 100)}%`].sort());
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["34", "36", "37", "38", "40", "41", "44", "45"]));
    expect(new Set([...badan.matchAll(/Tahap \d+/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 4", "Tahap 5"]));
    const bersih = badan.replace(/\[\[[^\]]+\]\]/g, "").split("\n").filter((b) => !/^(import|export|  \.)/.test(b) && !b.startsWith("<Tebak")).join("\n");
    const bulat = new Set([...bersih.matchAll(/(?<![\d,.])\d+(?![\d,.%])/g)].map((m) => m[0]));
    const harapan = new Set([
      cocok(barisM39[0]!, /^\| M39 \| (\d+) \|/)[1]!, String(timAnggota), ...timBaru[2]!.split(" sampai "), ...timBaru[3]!.split(" sampai "), timLama[1]!, timLama[2]!, timLama[3]!,
      cocok(badan, /<p class="meta">Baca (\d+) menit/)[1]!, "2", // menit baca; prioritas P2 di PRD v4
      String(N4), String(N5), String(cerita.tahap[2]!.no), String(rasio), "1", "15", "21", "50", koneksi[3]!, String(menitHp), "400", "460", "60",
      "34", "36", "37", "40", "41", "44", "45",
      "200", "201", "500", "95", // status 200 atau 201 dan p95 di bawah 500 ms, dari 4.27 (diperiksa di test make beban)
    ]);
    expect([...bulat].sort((x, y) => Number(x) - Number(y)), "bilangan bulat di halaman yang tidak diturunkan dari sumber").toEqual([...harapan].sort((x, y) => Number(x) - Number(y)));
    const tokenW = [...teksWidget.matchAll(/\d+,\d+/g)].map((m) => m[0]);
    const bolehW = new Set([koma((15 / 460) * 100, 1), koma((15 / 100000) * 100, 3), koma(50 / 8, 2)]);
    expect([...new Set(tokenW.filter((x) => !bolehW.has(x)))], "token berkoma di widget yang tidak dihitung dari sumber").toEqual([]);
    for (const b of [koma((15 / 460) * 100, 1), koma((15 / 100000) * 100, 3)]) expect(tokenW, b).toContain(b);
    expect(new Set([...teksWidget.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["34", "36", "37", "40", "41", "44", "45"]));
    expect(new Set([...teksWidget.matchAll(/Tahap \d+/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 4", "Tahap 5"]));
  });
});

// ---- Token versi PRD dan nomor Tahap: urutan per baris diturunkan dari registry (mutasi "PRD v4" menjadi "PRD v5" lolos tanpa ini) ----
describe("token versi PRD dan nomor Tahap: urutan di tiap baris sama dengan yang diturunkan dari registry", () => {
  const N3 = cerita.tahap[2]!.no;
  const T = (n: number) => `Tahap ${n}`;
  const P = (n: number) => `PRD v${n}`;
  const V = (n: number) => `v${n}`;
  const tok = (l: string): string[] => [...l.matchAll(/Tahap \d+|PRD v\d+|\bv\d+\b/g)].map((m) => m[0]);
  test("nomor tahap di registry berurutan 3, 4, 5", () => {
    expect([N3, N4, N5]).toEqual([3, 4, 5]);
  });
  test("urutan token tiap baris: PRD v, v, dan Tahap", () => {
    const hasil = badan.split("\n").map(tok).filter((x) => x.length > 0);
    expect(hasil).toEqual([
      [P(N5), T(N5)], // pembuka
      [P(N5)], // aria-label kepala
      [P(N5)], // nama blok pertama
      [T(N4), P(N5)], // Minggu 12 Tahap 4 ... PRD v5
      [P(N5), P(N4)], // PRD v5 mengubah enam hal dari PRD v4
      [P(N4), P(N5)], // judul kolom tabel
      [P(N3)], // baris Laporan: dasbor dari PRD v3
      [P(N5)], // Isi PRD v5 adalah rencana cerita
      [T(N4), P(N5)], // Tahap 4 menghasilkan ADR 34 sampai 45 ... isi PRD v5
      [T(N5), T(N5)], // noscript
      [P(N4), P(N5), V(N5), P(N5), T(N4)], // empat isi P2 ke v5
      [P(N5), T(N4)], // judul kolom ruang lingkup
      [P(N3)], // baris Laporan merchant real-time
      [P(N3), T(N4)], // baris API
      [P(N5)], // klaim izin
      [T(N5)], // nama blok Menuju Tahap 5
      [T(N5), T(N4)], // jawaban dibuka di halaman pertama
      [T(N5)], // hitungan beban Tahap 5 ada di 4.28
      [P(N5)], // bullet ADR 45: diminta PRD v5
      [P(N5)], // dua pilihan lain
      [T(N4), P(N5)], // satu hal belum selesai
      [P(N5)], // kartu 1
      [P(N5)], // kartu 2: ADR 45 diminta PRD v5
      [P(N5), T(N5)], // kartu 3
      [T(N4)], // penutup
    ]);
  });
  test("front matter dan baris meta: token versi dan tahap", () => {
    expect(tok(frontmatter)).toEqual([P(N5), P(N5), T(N4)]);
    expect(frontmatter).toContain(`Dari ADR ${T(N4)}, tebak mana yang pecah lebih dulu.`);
    expect(frontmatter).toContain(`Sinta membagikan ${P(N5)} dengan`);
  });
});
