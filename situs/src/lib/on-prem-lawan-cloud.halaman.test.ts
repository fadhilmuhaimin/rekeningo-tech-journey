// Penjaga halaman 5.28 (keputusan 1609, 1610): angka, ID, nomor ADR, versi dan tanggal sumber, tautan, rentang Snippet, tabel, klaim "tidak ada"
// dan kalimat mekanisme di on-prem-lawan-cloud.mdx, diagram t5-onprem-inti.json, widget t5-onprem-biaya.json, halaman istilah on-prem.json, dan
// baris riset R5-245 sampai R5-249. Nilai diturunkan dari registry, naskah Tahap 5, halaman ADR 39 (Tahap 4), kode lab Tahap 4 (go.mod, folder
// lab, konfigurasi OpenTofu), dan hitungan model yang ditulis ulang di sini dengan bilangan pecahan (bukan logika.ts), bukan dari daftar yang
// ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan JSON dikunci per baris
// di on-prem-lawan-cloud.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa sidik teks, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/on-prem-lawan-cloud.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Kalimat tentang sumber luar dibaca dari baris riset (kutipan Inggris aslinya ada di
// baris itu), kalimat tentang kode dibaca dari file lab, dan kalimat tentang naskah dibaca dari naskah.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import registry from "../../data/cerita.json";
import rantaiMentah from "../../data/diagram/t5-onprem-inti.json";
import widgetMentah from "../../data/widget/t5-onprem-biaya.json";
import istilahMentah from "../../data/halaman-istilah/on-prem.json";
import glosarium from "../../data/glosarium.json";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import { DataBiaya } from "../widgets/biaya-tiga-tahun/skema";
import { hitung as hitungLogika, jumlah, siapkan, titikImpas } from "../widgets/biaya-tiga-tahun/logika";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./on-prem-lawan-cloud.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-5/on-prem-lawan-cloud.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const adr39 = baca("situs/src/content/docs/tahap-4/secret-iac-alamat-keluar.mdx");
const tanpaKunci = process.env.TANPA_KUNCI === "1";

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; peran?: string[]; path?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const kali = (teks: string, cari: string): number => (cari === "" ? 0 : teks.split(cari).length - 1);
/** Kalimat harus muncul tepat `n` kali di badan halaman: toContain puas dengan satu kemunculan, jadi dihitung. */
const harusAda = (kalimat: string, n = 1): void => { expect(kali(badan, kalimat), kalimat).toBe(n); };
const barisRiset = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const tabelMdx = (awalan: string): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  return keluar;
};
const fmt = (x: number, d = 0): string => {
  const [i, f] = x.toFixed(d).split(".");
  const ribu = i!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return f ? `${ribu},${f}` : ribu;
};
const angka = (s: string): number => Number(s.replace(/\./g, ""));
const bilangan: Record<number, string> = { 0: "nol", 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam" };

// --- model biaya tiga tahun, ditulis ulang dengan bilangan pecahan (bukan logika.ts)
const W = DataBiaya.parse(widgetMentah);
type Masukan = typeof W.masukan;
interface Th { infra: number; orang: number; migrasi: number; risiko: number }
function model(ubah?: Partial<Masukan>) {
  const m = { ...W.masukan, ...ubah };
  const k = (t: number) => (1 + m.tumbuh / 100) ** (t - 1);
  const cl: Th[] = [], op: Th[] = [];
  for (let t = 1; t <= 3; t++) {
    cl.push({ infra: m.cloudInfra1 * k(t), orang: m.orangDasar * m.biayaOrang, migrasi: 0, risiko: (m.cloudRisikoPeluang * m.cloudRisikoDampak) / 100 });
    op.push({
      infra: (t === 1 ? m.perangkat1 : m.perangkat1 * (k(t) - k(t - 1))) + m.sewa,
      orang: (m.orangDasar + m.orangTambahan) * m.biayaOrang,
      migrasi: t === 1 ? m.migrasi : 0,
      risiko: (m.onpremRisikoPeluang * m.onpremRisikoDampak) / 100,
    });
  }
  const bulat = (x: number): number => { if (Math.abs(x - Math.round(x)) > 1e-6) throw new Error(`bukan bilangan bulat: ${x}`); return Math.round(x); };
  const total = (a: Th[]) => a.map((t) => bulat(t.infra + t.orang + t.migrasi + t.risiko));
  const jum = (a: Th[], f: keyof Th) => bulat(a.reduce((s, t) => s + t[f], 0));
  const tc = total(cl), to = total(op);
  const kum = (a: number[]) => a.map((_, i) => a.slice(0, i + 1).reduce((s, x) => s + x, 0));
  const kc = kum(tc), ko = kum(to);
  const f: (keyof Th)[] = ["infra", "orang", "migrasi", "risiko"];
  const impasIdx = ko.findIndex((v, i) => v < kc[i]!);
  return {
    m, cl, op, tc, to, kc, ko,
    jc: { ...Object.fromEntries(f.map((x) => [x, jum(cl, x)])), total: kc[2]! } as Record<keyof Th | "total", number>,
    jo: { ...Object.fromEntries(f.map((x) => [x, jum(op, x)])), total: ko[2]! } as Record<keyof Th | "total", number>,
    selisih: Math.abs(kc[2]! - ko[2]!),
    onpremHemat: ko[2]! < kc[2]!,
    impas: impasIdx < 0 ? null : impasIdx + 1,
  };
}
const S = W.skenario.map((s) => model(s.ubah));
const dasar = S[W.awal]!;
const i0 = W.skenario.findIndex((s) => s.ubah?.orangTambahan === 0);
const i1 = W.skenario.findIndex((s) => s.ubah?.orangTambahan === 1);
const i4 = W.skenario.findIndex((s) => s.ubah?.tumbuh !== undefined);
const satuOrang = W.masukan.biayaOrang * 3;

describe("registry, templat ADR, dan kepala halaman", () => {
  test("entri registry 5.28: ADR 59, jenis adr, prasyarat, ada, menit sama dengan baris meta, peran sama dengan jalur naskah", () => {
    const h = dari("t5-onprem");
    expect(h).toMatchObject({ nomor: "5.28", jenis: "adr", adr: [59], inti: true, ada: true, tahap: 5, prasyarat: ["t4-infra-secret", "t5-tim-infra"], peran: ["devops", "backend"] });
    expect(h.menit).toBe(18);
    expect(halaman).toContain(`<p class="meta">Baca 15 menit · coba 3 menit · Prasyarat: [[t4-infra-secret]], [[t5-tim-infra]] · Jalur inti</p>`);
    expect(halaman).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(naskah).toContain("| 5.28 | 4 | On-prem lawan cloud + ADR 59 | ADR | ★ | – | kalkulator |");
    expect(naskah).toMatch(/\*\*DevOps\*\* [^\n]*\b5\.28\b/);
    expect(naskah).toContain("5.17, 5.22, 5.23, 5.27, 5.28");
    expect(dari("t5-m51").prasyarat).toContain("t5-onprem");
  });
  test("blok mengikuti templat adr dan dua blok pertama terbuka", () => {
    const b = daftarBlok(halaman);
    expect(cekTemplat("adr", b)).toEqual([]);
    expect(b.map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi", "Yang dipilih dan kenapa", "Wujud di kode", "Coba keduanya", "Kapan keputusan ini salah"]);
    expect(b.map((x) => x.buka)).toEqual([true, true, false, false, false, false]);
  });
  test("judul bagian dan tingkat heading: h2 Inti, lima h3, tanpa h4 atau lebih dalam", () => {
    const h = [...badan.matchAll(/^(#{1,6}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(h).toEqual(["## Inti", "### Kenapa ADR ini ada", "### Rumus dan masukan model", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
  });
  test("semua [[ID]] ada di registry dan [[berikutnya]] dipakai sekali", () => {
    const id = [...halaman.matchAll(/\[\[([A-Za-z0-9.\-]+)\]\]/g)].map((m) => m[1]!).filter((x) => x !== "berikutnya");
    for (const x of id) dari(x);
    expect(kali(halaman, "[[berikutnya]]")).toBe(1);
    expect(new Set(id)).toEqual(new Set(["t4-infra-secret", "t5-tim-infra", "t5-prd", "t5-rpo-rto", "t5-pooler", "t5-service", "t5-fanout", "t5-m42", "t5-m44", "t5-adr-60", "t5-jembatan"]));
  });
  test("nomor ADR di dekat tautan sama dengan ADR halaman yang ditaut", () => {
    const pasangan = [
      ...[...badan.matchAll(/ADR (\d+) menambah [a-z ]+ \(\[\[([a-z0-9-]+)\]\]\)/g)].map((m) => [Number(m[1]), m[2]!] as const),
      ...[...badan.matchAll(/\(ADR (\d+), \[\[([a-z0-9-]+)\]\]\)/g)].map((m) => [Number(m[1]), m[2]!] as const),
    ];
    expect(pasangan).toEqual([[48, "t5-rpo-rto"], [52, "t5-pooler"], [50, "t5-service"], [51, "t5-fanout"]]);
    for (const [n, id] of pasangan) expect(dari(id).adr, `${n} di ${id}`).toEqual([n]);
    expect(dari("t5-m42").judul.startsWith("M42")).toBe(true);
    expect(dari("t5-m44").judul.startsWith("M44")).toBe(true);
    expect(dari("t4-infra-secret").adr).toEqual([39]);
    expect(dari("t5-adr-60").adr).toEqual([60]);
    harusAda("M42 menghilangkan dua top-up, dan M44 membuat lima tim berebut rilis");
    expect(naskah).toMatch(/\| M42 \|[^\n]*dua top-up/);
    expect(naskah).toMatch(/\| M44 \|[^\n]*lima tim berebut rilis/);
  });
});

describe("naskah Tahap 5 dan ADR 39: yang ditulis halaman tentang keduanya", () => {
  const barisAdr = naskah.split("\n").find((b) => b.startsWith("| 59 |")) ?? "";
  test("baris ADR 59 naskah memuat keputusan, jalan keluar, dan empat opsi yang dibaca halaman", () => {
    for (const s of ["Tahap 5 tetap di cloud milik PT (ADR 39)", "manifest Kubernetes standar", "PostgreSQL standar tanpa fitur khusus penyedia", "Kafka dan Redis tanpa layanan queue milik penyedia", "IaC dengan OpenTofu", "biaya = infrastruktur + orang operasi + migrasi + risiko",
      "Tidak dijalankan", "terkelola milik penyedia", "on-prem atau colo", "campuran", "tetap seperti Tahap 4", "37signals", "hitungan \"napkin\" pendirinya tanpa audit independen", "4 + 2", "Data yang harus tinggal di lokasi tertentu"])
      expect(barisAdr, s).toContain(s);
    expect(barisAdr).toContain("ditolak: M42, M44");
  });
  test("naskah: batasan PRD biaya tiga tahun, pilihan draf 11 dan 12, lahir dari ADR 39", () => {
    expect(naskah).toContain("Direksi meminta perbandingan biaya tiga tahun antara cloud dan perangkat sendiri sebelum anggaran tahun berikutnya (ADR 59; Asumsi cerita)");
    expect(naskah).toContain("ADR 59 (halaman 5.28, bukan halaman masalah): lahir dari ADR 39");
    expect(naskah).toContain("ADR 59 menjaga jalan keluar ke bentuk itu tanpa menyatakan database terkelola salah. Pemilik memutuskan mana yang berlaku di produksi.");
    expect(naskah).toContain("Pemilik boleh meminta lab itu.");
    expect(naskah).toContain("karena batas sumber daya di laptop tidak merekam biaya atau kapasitas dengan jujur");
  });
  test("tim: Platform 4 dan SRE 2 dari tabel naskah, jumlah 6 sama dengan masukan widget dan teks halaman", () => {
    const platform = Number(cari(/\| Platform \| (\d+) \|/, naskah, "tim Platform")[1]);
    const sre = Number(cari(/\| SRE \| (\d+) \|/, naskah, "tim SRE")[1]);
    expect([platform, sre, platform + sre]).toEqual([4, 2, 6]);
    expect(W.masukan.orangDasar).toBe(platform + sre);
    harusAda(`Hanya ${platform + sre} orang platform dan SRE yang berasal dari naskah (Asumsi).`);
    harusAda(`${platform} + ${sre} = ${platform + sre}`, 2);
    harusAda(`Platform ${platform} dan SRE ${sre} di [[t5-tim-infra]] (Asumsi naskah)`);
    expect(W.sumber.teks).toContain(`${platform + sre} orang platform dan SRE`);
    expect(naskah).toContain(`Tim platform dan SRE tumbuh melewati ${platform + sre} orang`);
  });
  test("ADR 39: halaman Tahap 4 memang menulis akun cloud PT, dua syarat salah, dan tidak menghitung biaya", () => {
    expect(adr39).toContain("berada di layanan terkelola di akun cloud PT");
    expect(adr39).toContain("Saat biaya layanan terkelola melebihi biaya mengoperasikan sendiri, atau data harus tinggal on-prem. Halaman ini tidak menghitung biaya");
    expect(adr39).toContain("Mesin app dibuat dari IaC dengan OpenTofu");
    harusAda("biaya layanan terkelola melebihi biaya mengoperasikan sendiri, atau data harus tinggal on-prem");
    harusAda("Halaman itu juga menulis bahwa ia tidak menghitung biaya.");
  });
  test("beban Tahap 5: registry dan naskah memberi 1.388,9 dan 138,9, 69,4 dengan 3 transaksi dan 46,3 dengan 2", () => {
    const a = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number; trx: number } }[])[4]!.asumsi;
    const aktif = (a.user * a.aktif) / 100;
    const rata = (aktif * a.req) / 86400;
    const puncak = rata * a.puncak;
    const trx3 = ((aktif * 3) / 86400) * a.puncak;
    const trx2 = ((aktif * a.trx) / 86400) * a.puncak;
    expect([a.user, a.aktif, a.req, a.puncak, a.trx]).toEqual([1000000, 20, 60, 10, 2]);
    expect([fmt(rata, 1), fmt(puncak, 1), fmt(trx3, 1), fmt(trx2, 1)]).toEqual(["138,9", "1.388,9", "69,4", "46,3"]);
    expect(naskah).toContain(`${fmt(rata, 1)} rata-rata dan ${fmt(puncak, 1)} puncak`);
    expect(naskah).toContain(`${fmt(trx3, 1)} puncak (trx 2: 4,63 dan ${fmt(trx2, 1)})`);
    harusAda(`Puncaknya ${fmt(puncak, 1)} request per detik, sepuluh kali rata-rata ${fmt(rata, 1)}.`);
    harusAda(`Transaksi uang puncak ${fmt(trx3, 1)} per detik dengan 3 transaksi per user aktif per hari, atau ${fmt(trx2, 1)} bila 2 (semuanya Asumsi, [[t5-prd]]).`);
    expect(puncak / rata).toBe(a.puncak);
    harusAda(`| ${a.puncak}: ${fmt(puncak, 1)} lawan ${fmt(rata, 1)} request per detik (Asumsi). Ambang di bawah 2 selama 6 bulan berturut-turut (Asumsi) |`);
  });
});

function cari(pola: RegExp, teks: string, nama: string): RegExpMatchArray {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
}

describe("model biaya: hitungan sendiri sama dengan logika.ts, widget JSON, dan tabel halaman", () => {
  test("lima skenario: dasar tanpa ubah, tanpa, satu, empat orang tambahan, dan pertumbuhan 50%", () => {
    expect(W.skenario.map((s) => s.label)).toEqual(["Tanpa orang tambahan", "Satu orang tambahan", "Dua orang tambahan", "Empat orang tambahan", "Beban tumbuh 50% per tahun"]);
    expect(W.skenario.map((s) => s.ubah ?? null)).toEqual([{ orangTambahan: 0 }, { orangTambahan: 1 }, null, { orangTambahan: 4 }, { tumbuh: 50 }]);
    expect(W.awal).toBe(2);
    expect(W.masukan).toEqual({ biayaOrang: 480, orangDasar: 6, orangTambahan: 2, tumbuh: 25, cloudInfra1: 2400, cloudRisikoPeluang: 10, cloudRisikoDampak: 3000, perangkat1: 3200, sewa: 500, migrasi: 1200, onpremRisikoPeluang: 10, onpremRisikoDampak: 4000 });
  });
  test("logika.ts sama dengan hitungan sendiri untuk tiap skenario: total, komponen, kumulatif, titik impas", () => {
    const L = siapkan(W).map(hitungLogika);
    S.forEach((s, i) => {
      const l = L[i]!;
      expect(jumlah(l.cloud), `cloud ${i}`).toEqual(s.jc);
      expect(jumlah(l.onprem), `onprem ${i}`).toEqual(s.jo);
      expect(titikImpas(l), `impas ${i}`).toBe(s.impas);
    });
  });
  test("angka kunci: cloud 18.690, on-prem 17.540 / 18.980 / 20.420 / 23.300, selisih, dan impas tahun 3 hanya tanpa orang tambahan", () => {
    expect(S.map((s) => [s.jc.total, s.jo.total])).toEqual([[18690, 17540], [18690, 18980], [18690, 20420], [18690, 23300], [20940, 22620]]);
    expect(S.map((s) => [s.onpremHemat, s.selisih, s.impas])).toEqual([[true, 1150, 3], [false, 290, null], [false, 1730, null], [false, 4610, null], [false, 1680, null]]);
    expect(satuOrang).toBe(1440);
    expect(satuOrang).toBeGreaterThan(S[i0]!.selisih);
    expect(satuOrang - S[i0]!.selisih).toBe(S[i1]!.selisih);
    expect(S[i0]!.selisih + S[i1]!.selisih).toBe(satuOrang);
    expect(dasar.jo.total - dasar.jc.total).toBe(S[i0]!.jo.total - S[i0]!.jc.total + 2 * satuOrang);
  });
  test("tabel per tahun: 10 baris dan empat kolom angka sama dengan hitungan, jumlah sama dengan jumlah tahun", () => {
    const t = tabelMdx("| Komponen | Tahun 1 | Tahun 2 | Tahun 3 | Jumlah |");
    expect(t[0]).toEqual(["Komponen", "Tahun 1", "Tahun 2", "Tahun 3", "Jumlah"]);
    const ker = (nama: string, per: number[], jum: number) => [nama, ...per.map((x) => fmt(x)), fmt(jum)];
    const d = dasar;
    const bar = (a: Th[], f: keyof Th) => a.map((x) => x[f]);
    const harap = [
      ker("Cloud: infrastruktur", bar(d.cl, "infra"), d.jc.infra), ker("Cloud: orang operasi", bar(d.cl, "orang"), d.jc.orang), ker("Cloud: migrasi", bar(d.cl, "migrasi"), d.jc.migrasi),
      ker("Cloud: risiko", bar(d.cl, "risiko"), d.jc.risiko), ker("Cloud: total", d.tc, d.jc.total),
      ker("On-prem: infrastruktur", bar(d.op, "infra"), d.jo.infra), ker("On-prem: orang operasi", bar(d.op, "orang"), d.jo.orang), ker("On-prem: migrasi", bar(d.op, "migrasi"), d.jo.migrasi),
      ker("On-prem: risiko", bar(d.op, "risiko"), d.jo.risiko), ker("On-prem: total", d.to, d.jo.total),
    ];
    expect(t.slice(2)).toEqual(harap);
    expect(t.slice(2).every((r) => r.length === 5)).toBe(true);
    for (const r of t.slice(2)) expect(angka(r[1]!) + angka(r[2]!) + angka(r[3]!), r[0]).toBe(angka(r[4]!));
  });
  test("tabel masukan: tiap sel diturunkan dari data widget", () => {
    const m = W.masukan;
    const t = tabelMdx("| Masukan | Cloud | On-prem |");
    expect(t.slice(2)).toEqual([
      ["Infrastruktur tahun 1", fmt(m.cloudInfra1), `perangkat ${fmt(m.perangkat1)} dan sewa ${fmt(m.sewa)} per tahun`],
      ["Infrastruktur tahun berikutnya", `${fmt(m.cloudInfra1)} × ${fmt(1 + m.tumbuh / 100, 2)} per tahun`, `perangkat ${fmt(m.perangkat1)} × kenaikan kapasitas, sewa tetap`],
      ["Orang operasi", `${m.orangDasar} orang × ${m.biayaOrang} per tahun`, `(${m.orangDasar} + tambahan) orang × ${m.biayaOrang} per tahun`],
      ["Migrasi", "0", `${fmt(m.migrasi)} di tahun 1`],
      ["Risiko per tahun", `${m.cloudRisikoPeluang}% × ${fmt(m.cloudRisikoDampak)}`, `${m.onpremRisikoPeluang}% × ${fmt(m.onpremRisikoDampak)}`],
    ]);
    harusAda(`Kapasitas yang dibutuhkan naik ${m.tumbuh}% per tahun (Ilustrasi).`);
    harusAda(`Satu orang operasi ${m.biayaOrang} per tahun, dampak risiko, dan pertumbuhan adalah pilihan penulis tanpa sumber.`);
  });
  test("kalimat berangka di prosa diturunkan dari hitungan, dihitung kemunculannya", () => {
    const b = bilangan[dasar.m.orangTambahan]!;
    const kc = dasar.kc, ko = dasar.ko;
    harusAda(`Dengan ${b} orang operasi tambahan di on-prem, yaitu perangkat milik PT sendiri, cloud lebih hemat ${fmt(S[W.awal]!.selisih)} juta rupiah dalam tiga tahun. Tanpa orang tambahan, on-prem lebih hemat ${fmt(S[i0]!.selisih)}.`);
    harusAda(`Satu orang tambahan memakan ${W.masukan.biayaOrang} × 3 = ${fmt(satuOrang)} juta rupiah, lebih besar dari ${fmt(S[i0]!.selisih)}.`);
    harusAda(`Kumulatif on-prem dikurangi cloud: ${fmt(ko[0]!)} − ${fmt(kc[0]!)} = ${fmt(ko[0]! - kc[0]!)} di tahun 1, lalu ${fmt(ko[1]!)} − ${fmt(kc[1]!)} = ${fmt(ko[1]! - kc[1]!)} di tahun 2. Di tahun 3 selisihnya ${fmt(ko[2]!)} − ${fmt(kc[2]!)} = ${fmt(ko[2]! - kc[2]!)}.`);
    expect(ko[0]! - kc[0]!).toBeGreaterThan(ko[1]! - kc[1]!);
    expect(ko[1]! - kc[1]!).toBeGreaterThan(ko[2]! - kc[2]!);
    harusAda(`Selisih itu menyusut karena on-prem lebih hemat tiap tahun sesudah tahun 1: ${fmt(dasar.to[1]!)} lawan ${fmt(dasar.tc[1]!)}, lalu ${fmt(dasar.to[2]!)} lawan ${fmt(dasar.tc[2]!)}.`);
    expect(dasar.to[1]!).toBeLessThan(dasar.tc[1]!);
    expect(dasar.to[2]!).toBeLessThan(dasar.tc[2]!);
    expect(dasar.to[0]!).toBeGreaterThan(dasar.tc[0]!);
    harusAda(`| Infrastruktur ${fmt(dasar.jo.infra)} lawan ${fmt(dasar.jc.infra)} di model dasar (Ilustrasi) |`);
    expect(dasar.jo.infra).toBeLessThan(dasar.jc.infra);
    harusAda(`Selisih dasar ${fmt(S[W.awal]!.selisih)} menjadi ${fmt(S[i4]!.selisih)}, jadi beban yang naik lebih cepat tidak membalik urutan di model ini.`);
    harusAda(`Satu orang tambahan menambah ${W.masukan.biayaOrang} × 3 = ${fmt(satuOrang)}, jadi cloud lebih hemat ${fmt(S[i1]!.selisih)}. Selisih sebesar ${fmt(S[i1]!.selisih)} itu kecil dibandingkan angka orang`);
    harusAda(`Di model ini nol orang tambahan membuat on-prem hemat ${fmt(S[i0]!.selisih)}, dan satu orang tambahan membaliknya.`);
    harusAda(`Di skenario pertama on-prem lebih hemat ${fmt(S[i0]!.selisih)}.`);
    harusAda(`Satu orang memakan ${W.masukan.biayaOrang} × 3 = ${fmt(satuOrang)} juta rupiah selama tiga tahun. Selisih tanpa orang tambahan hanya ${fmt(S[i0]!.selisih)}, jadi urutannya terbalik dan cloud lebih hemat ${fmt(S[i1]!.selisih)}.`);
    harusAda(`Cloud, ${fmt(dasar.selisih)} juta rupiah: ${fmt(dasar.jo.total)} − ${fmt(dasar.jc.total)}.`);
    harusAda(`Model dasar: cloud ${fmt(dasar.jc.total)} lawan on-prem ${fmt(dasar.jo.total)} (Ilustrasi). Tanpa orang tambahan urutannya terbalik: ${fmt(S[i0]!.jo.total)}`);
    harusAda(`${fmt(ko[0]! - kc[0]!)}, ${fmt(ko[1]! - kc[1]!)}, lalu ${fmt(ko[2]! - kc[2]!)} di tahun 1, 2, dan 3 (Hitungan atas Ilustrasi). Sesudah tahun 3 tidak dihitung`);
    harusAda(`on-prem menjadi lebih hemat, ${fmt(S[i0]!.selisih)} juta rupiah dalam tiga tahun`);
    expect(W.masukan.orangTambahan).toBe(2);
  });
  test("tabel noscript: lima skenario dengan total, pemenang, selisih, dan titik impas dari hitungan", () => {
    const noscript = halaman.slice(halaman.indexOf("<noscript>"), halaman.indexOf("</noscript>"));
    const baris = [...noscript.matchAll(/<tr><td>(.+?)<\/td><td>(.+?)<\/td><td>(.+?)<\/td><td>(.+?)<\/td><td>(.+?)<\/td><\/tr>/g)].map((m) => m.slice(1, 6));
    expect(baris).toEqual(W.skenario.map((sk, i) => {
      const s = S[i]!;
      return [sk.label, fmt(s.jc.total), fmt(s.jo.total), `${s.onpremHemat ? "On-prem" : "Cloud"}, ${fmt(s.selisih)}`, s.impas === null ? "tidak" : `tahun ${s.impas}`];
    }));
    expect(kali(noscript, "<table>")).toBe(1);
    expect(kali(halaman, "<noscript>")).toBe(1);
    expect(noscript).toContain(`on-prem menjadi lebih hemat, ${fmt(S[i0]!.selisih)} juta rupiah dalam tiga tahun`);
  });
  test("tebak: jawaban dari hitungan, posisi bukan pertama atau terakhir, skenario pembuka, alasan memuat angka, kesimpulan dari templat", () => {
    const hemat = S.map((s, i) => [i, s.onpremHemat] as const).filter((x) => x[1]).map((x) => x[0]);
    expect(hemat).toEqual([W.tebak.skenario]);
    expect(W.tebak.pilihan[W.tebak.jawaban]).toBe("On-prem menjadi lebih hemat");
    expect(W.tebak.pilihan.filter((p) => /on-prem/i.test(p)).length).toBe(1);
    expect(W.tebak.jawaban).toBeGreaterThan(0);
    expect(W.tebak.jawaban).toBeLessThan(W.tebak.pilihan.length - 1);
    expect(W.tebak.alasan).toBe(`Tanpa orang tambahan on-prem lebih hemat ${fmt(S[i0]!.selisih)} juta rupiah, dan satu orang tambahan (${fmt(satuOrang)} juta rupiah) sudah membalikkannya.`);
    expect(W.label.lanjut).toBe(`Sekarang pilih “${W.skenario[W.tebak.skenario]!.label}” di atas tabel.`);
    expect(W.tebak.q).toContain(bilangan[dasar.m.orangTambahan]);
    expect(W.label.kesimpulan.onpremMurah).toBe("On-prem lebih hemat {selisih} juta rupiah dalam tiga tahun, dengan kumulatif lebih rendah sejak tahun {impas}.");
    expect(W.label.kesimpulan.cloudMurah).toBe("Cloud lebih hemat {selisih} juta rupiah dalam tiga tahun, dan kumulatif on-prem tidak pernah lebih rendah.");
    expect(W.label.kesimpulan.cloudMurahImpas).toBe("Cloud lebih hemat {selisih} juta rupiah dalam tiga tahun, walau kumulatif on-prem lebih rendah sejak tahun {impas}.");
    expect(W.label).toMatchObject({ sumber: "Ilustrasi", tebakDulu: "Tebak dulu:", benar: "Tepat:", belum: "Belum tepat:", cloud: "Cloud", onprem: "On-prem" });
    expect(W.sumber.jenis).toBe("ilustrasi");
    expect(W.sumber.teks.startsWith("Semua masukan Ilustrasi, dalam juta rupiah, bukan harga penyedia mana pun.")).toBe(true);
    harusAda(`pilih ${W.skenario[i0]!.label}, lalu ${W.skenario[i1]!.label}.`);
    expect(badan).not.toMatch(/\bmurah\b/);
    expect(JSON.stringify(W)).not.toMatch(/\bmurah\b/);
  });
  test("Rantai Inti: simpul dan sub dihitung dari model, label Ilustrasi, tanpa catatan", () => {
    const r = DataRantai.parse(rantaiMentah);
    const d = dasar, n = S[i0]!;
    expect(r.sumber).toEqual({ jenis: "ilustrasi", teks: "Ilustrasi, juta rupiah" });
    expect(r.catatan).toBeUndefined();
    const sub = (j: Record<string, number>, ada: string[]) => ada.map((k) => fmt(j[k]!)).join(" + ");
    expect(r.baris.map((b) => [b.label, b.sub, b.simpul.map((s) => [s.teks, s.sub, s.nada])])).toEqual([
      ["Dasar", `${d.m.orangDasar} + ${d.m.orangTambahan} orang operasi di on-prem`, [
        [`cloud ${fmt(d.jc.total)}`, sub(d.jc, ["infra", "orang", "risiko"]), "biasa"],
        [`on-prem ${fmt(d.jo.total)}`, sub(d.jo, ["infra", "orang", "migrasi", "risiko"]), "biasa"],
        [`cloud hemat ${fmt(d.selisih)}`, `${fmt(d.jo.total)} − ${fmt(d.jc.total)}`, "good"]]],
      ["Tanpa tambahan", `${d.m.orangDasar} orang operasi di kedua sisi`, [
        [`cloud ${fmt(n.jc.total)}`, "sama", "biasa"],
        [`on-prem ${fmt(n.jo.total)}`, `${fmt(d.jo.total)} − ${fmt(d.m.orangTambahan * satuOrang)}`, "biasa"],
        [`on-prem hemat ${fmt(n.selisih)}`, `${fmt(n.jc.total)} − ${fmt(n.jo.total)}`, "warn"]]],
    ]);
    expect(n.jc.total).toBe(d.jc.total);
    expect(n.jo.total).toBe(d.jo.total - d.m.orangTambahan * satuOrang);
    expect(r.judul).toBe("Biaya tiga tahun, dua skenario orang operasi");
  });
});

describe("sumber luar: baris riset R5-245 sampai R5-249, tautan, tanggal akses, dan kata pelunak", () => {
  const ID = ["R5-245", "R5-246", "R5-247", "R5-248", "R5-249"];
  test("lima baris ada tepat sekali, berurutan naik, dan tidak mengganggu baris lain", () => {
    for (const id of ID) expect(riset.split("\n").filter((b) => b.startsWith(`| ${id} |`)).length, id).toBe(1);
    const urutan = riset.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    expect(new Set(urutan).size).toBe(urutan.length);
    const posisi = ID.map((x) => urutan.indexOf(x));
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
    expect(posisi[4]! - posisi[0]!).toBe(4);
    for (const id of ID) expect(barisRiset(id).split("|").length, `${id}: lima kolom`).toBe(7);
  });
  const SUMBER: { url: string; id: string; potong: string }[] = [
    { url: "https://world.hey.com/dhh/why-we-re-leaving-the-cloud-654b47e0", id: "R5-245", potong: "world.hey.com/dhh/why-we-re-leaving-the-cloud-654b47e0" },
    { url: "https://world.hey.com/dhh/we-have-left-the-cloud-251760fb", id: "R5-246", potong: "world.hey.com/dhh/we-have-left-the-cloud-251760fb" },
    { url: "https://opentofu.org/docs/intro/", id: "R5-247", potong: "opentofu.org/docs/intro" },
    { url: "https://www.postgresql.org/docs/17/logical-replication-restrictions.html", id: "R5-248", potong: "logical-replication-restrictions.html" },
    { url: "https://docs.k3s.io/", id: "R5-249", potong: "docs.k3s.io" },
  ];
  test.each(SUMBER)("$url: baris di halaman bertanggal sama dengan baris riset $id dan memuat alamatnya", ({ url, id, potong }) => {
    const b = badan.split("\n").filter((x) => x.includes(`](${url})`) && x.includes("dibuka "));
    expect(b.length, url).toBe(1);
    const tanggal = cari(/dibuka (\d{4}-\d{2}-\d{2})\)/, b[0]!, "tanggal akses")[1]!;
    expect(tanggal).toBe("2026-10-31");
    const baris = barisRiset(id);
    expect(baris, id).toContain(potong);
    expect(baris, id).toContain(`dibuka ${tanggal}`);
    expect(baris, id).toContain("Tidak berubah");
    expect(baris, id).toContain(`dicek ${tanggal}`);
  });
  test("tanggal akses di halaman: lima kemunculan, semuanya 2026-10-31, dan tautan Bacaan lanjut sama dengan sumber", () => {
    expect(kali(badan, "dibuka 2026-10-31")).toBe(5);
    expect([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1])).toEqual(Array(5).fill("2026-10-31"));
    const lanjut = badan.slice(badan.indexOf("### Bacaan lanjut"));
    const url = [...lanjut.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
    expect(url).toEqual([
      "https://world.hey.com/dhh/why-we-re-leaving-the-cloud-654b47e0", "https://world.hey.com/dhh/we-have-left-the-cloud-251760fb", "https://opentofu.org/docs/intro/",
      "https://www.postgresql.org/docs/17/logical-replication.html", "https://docs.k3s.io/",
    ]);
    expect(barisRiset("R5-248")).toContain("postgresql.org/docs/17/logical-replication.html");
  });
  // [frasa halaman, ID riset, frasa di baris riset]: kata pelunak sumber ikut ke kalimat halaman
  const PELUNAK: [string, string, string][] = [
    ["sebagian besar kesepakatan yang buruk bagi perusahaan menengah dengan pertumbuhan stabil", "R5-245", "(mostly) a bad deal"],
    ["secara berarti hanya karena pindah ke cloud", "R5-245", "materially shrink"],
    ["Hanya satu ujung yang relevan bagi mereka", "R5-245", "only one end was ever relevant for us"],
    ["unggul di dua ujung: aplikasi yang sangat sederhana, dan beban yang sangat tidak teratur", "R5-245", "aplikasi sangat sederhana dan beban sangat tidak teratur"],
    ["lebih dari US$500 ribu per tahun untuk layanan database dan pencarian dari satu penyedia cloud besar", "R5-245", "lebih dari US$500 ribu per tahun untuk layanan database dan pencarian dari satu penyedia"],
    ["Tulisan pertama (19 Oktober 2022)", "R5-245", "terbit 2022-10-19"],
    ["Tulisan kedua (23 Juni 2023)", "R5-246", "terbit 2023-06-23"],
    ["pindah selesai dalam enam bulan", "R5-246", "after six months"],
    ["tanpa mengubah ukuran tim operasi sama sekali", "R5-246", "at all"],
    ["Mereka memakai KVM, Docker, dan Kamal, tanpa Kubernetes", "R5-246", "KVM, Docker, dan Kamal, tanpa Kubernetes (\"dodge the complexity of Kubernetes\")"],
    ["Penghematan \"setidaknya US$1,5 juta per tahun\" ia sebut sendiri hitungan di belakang serbet", "R5-246", "at least $1.5 million per year"],
    ["hitungan di belakang serbet", "R5-246", "back of the napkin math"],
    ["Tulisan itu tidak menyebut audit independen", "R5-246", "teks tidak menyebut audit independen"],
    ["mendefinisikan resource cloud dan on-prem dalam file konfigurasi yang bisa dibaca manusia", "R5-247", "define both cloud and on-prem resources"],
    ["v1.13, dibuka", "R5-247", "OpenTofu 1.13.0"],
    ["distribusi yang sepenuhnya sesuai Kubernetes ([K3s](https://docs.k3s.io/), v1.37, dibuka", "R5-249", "fully compliant Kubernetes distribution"],
    ["v1.37, dibuka", "R5-249", "v1.37.X"],
    ["Skema, sequence, dan large object tidak ikut replikasi logikal", "R5-248", "Sequence data is not replicated"],
    ["PostgreSQL 17.11, bab 29", "R5-248", "PostgreSQL 17.11 bab 29"],
    ["replikasi logikal antar platform dan antar versi, dengan batas yang ditulisnya (skema, sequence, dan large object tidak ikut)", "R5-248", "antar versi mayor dan antar platform"],
  ];
  test.each(PELUNAK)("halaman \"%s\" cocok dengan baris riset %s (\"%s\")", (frasaHalaman, id, frasaRiset) => {
    expect(kali(badan, frasaHalaman), "halaman").toBeGreaterThanOrEqual(1);
    expect(kali(barisRiset(id), frasaRiset), "riset").toBeGreaterThanOrEqual(1);
  });
  test("baris riset memuat tiga kutipan 'not replicated', gejala napkin tanpa audit, dan lisensi OpenTofu tidak ditulis di halaman itu", () => {
    const r248 = barisRiset("R5-248");
    for (const s of ["The database schema and DDL commands are not replicated", "Sequence data is not replicated", "\"Large objects\" tidak direplikasi", "[perlu verifikasi]"]) expect(r248, s).toContain(s);
    expect(barisRiset("R5-247")).toContain("lisensi perangkat lunak tidak tertulis di halaman itu");
    expect(barisRiset("R5-246")).toContain("hitungan pendirinya sendiri");
    expect(barisRiset("R5-245")).toContain("Tulisan pendirinya tentang perusahaannya sendiri");
    expect(naskah).toContain("hitungan \"napkin\" pendirinya tanpa audit independen");
  });
});

describe("klaim 'tidak ada' berlingkup: go.mod, CREATE EXTENSION, dan konfigurasi OpenTofu di lab Tahap 4", () => {
  const mod = baca("labs/api-t4/go.mod").split("\n");
  const mulai = mod.findIndex((b) => b === "require (");
  const akhirBlok = mod.findIndex((b, i) => i > mulai && b === ")");
  const langsung = mod.slice(mulai + 1, akhirBlok).map((b) => b.trim()).filter((b) => b && !b.includes("// indirect")).map((b) => b.split(/\s+/)[0]!);
  test("Snippet go.mod menampilkan blok require langsung, dan empat paket langsung adalah driver, Redis, breaker, dan kripto", () => {
    expect(mulai).toBeGreaterThanOrEqual(0);
    harusAda(`<Snippet file="labs/api-t4/go.mod" lines="${mulai + 1}:${akhirBlok + 1}" lang="text" title="Kode lab: labs/api-t4/go.mod (dependency langsung)" />`);
    expect(langsung).toEqual(["github.com/jackc/pgx/v5", "github.com/redis/go-redis/v9", "github.com/sony/gobreaker/v2", "golang.org/x/crypto"]);
    harusAda("Empat paket: driver PostgreSQL, client Redis, circuit breaker, dan paket kripto Go.");
    expect(langsung.length).toBe(4);
  });
  test("tak satu pun modul di go.mod dan go.sum api-t4 adalah SDK penyedia cloud (hanya labs/api-t4)", () => {
    const POLA = /(^|[/.-])(aws|azure|alibaba|tencent|oracle|ibm|digitalocean|hetzner|linode|vultr|scaleway|ovh)([/.-]|$)|cloud\.google\.com|google\.golang\.org\/api|firebase|gcp/i;
    const modul = [...mod, ...baca("labs/api-t4/go.sum").split("\n")].map((b) => b.trim().split(/\s+/)[0]!).filter((x) => x.includes("/") || x.includes("."));
    expect(modul.length).toBeGreaterThan(10);
    expect(modul.filter((x) => POLA.test(x))).toEqual([]);
    for (const nama of ["github.com/aws/aws-sdk-go-v2", "cloud.google.com/go/storage", "github.com/Azure/azure-sdk-for-go"]) expect(POLA.test(nama), `pemindai harus menangkap ${nama}`).toBe(true);
    harusAda("Tak satu pun SDK penyedia cloud di `go.mod` itu (dibaca dari kode; klaim ini hanya untuk `labs/api-t4`).");
  });
  const folder = ["api-t4", ...fs.readdirSync(path.join(akar, "labs")).filter((n) => n.startsWith("t4-"))];
  function berkas(dir: string): string[] {
    const keluar: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["output", "node_modules", ".terraform", ".git", "keluaran"].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) keluar.push(...berkas(p));
      else if (fs.statSync(p).size < 5_000_000) keluar.push(p);
    }
    return keluar;
  }
  const teksLab = (nama: string) => berkas(path.join(akar, "labs", nama)).map((p) => ({ p, isi: fs.readFileSync(p).toString("latin1") })).filter((f) => !f.isi.includes("\0"));
  test("sebelas folder lab (api-t4 dan sepuluh t4-*), di luar output, tidak memuat CREATE EXTENSION; pemindai menangkap contoh buatan", () => {
    expect(folder.length).toBe(11);
    expect(folder.filter((n) => n.startsWith("t4-")).length).toBe(10);
    const POLA = /create\s+extension/i;
    let periksa = 0;
    for (const f of folder) for (const b of teksLab(f)) { periksa++; expect(POLA.test(b.isi), b.p).toBe(false); }
    expect(periksa).toBeGreaterThan(100);
    expect(POLA.test("CREATE  EXTENSION IF NOT EXISTS pg_cron;")).toBe(true);
    harusAda("sebelas folder lab Tahap 4 (`api-t4` dan sepuluh `t4-*`), di luar `output/`, dan tidak menemukan `CREATE EXTENSION`");
  });
  test("tiga konfigurasi OpenTofu hanya memakai provider local dan random; Snippet menampilkan blok terraform dan resource", () => {
    const dir = path.join(akar, "labs/t4-infra/tofu");
    const mf = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "main.tf")));
    expect(mf.length).toBe(3);
    const sumber = new Set(mf.flatMap((d) => [...fs.readFileSync(path.join(dir, d, "main.tf"), "utf8").matchAll(/source\s*=\s*"([^"]+)"/g)].map((m) => m[1]!)));
    expect([...sumber].sort()).toEqual(["hashicorp/local", "hashicorp/random"]);
    harusAda("Tiga konfigurasi OpenTofu di lab hanya memakai provider `local` dan `random`");
    harusAda("lab hanya memakai provider `local` dan `random`", 2);
    const baris = baca("labs/t4-infra/tofu/rahasia-runtime/main.tf").split("\n");
    const t = baris.findIndex((b) => b.startsWith("terraform {"));
    const tAkhir = baris.findIndex((b, i) => i > t && b === "}");
    const r = baris.findIndex((b) => b.startsWith("resource \"local_file\""));
    const rAkhir = baris.findIndex((b, i) => i > r && b === "}");
    harusAda(`<Snippet files={["labs/t4-infra/tofu/rahasia-runtime/main.tf:${t + 1}:${tAkhir + 1}", "labs/t4-infra/tofu/rahasia-runtime/main.tf:${r + 1}:${rAkhir + 1}"]} lang="hcl" title="Kode lab: labs/t4-infra/tofu/rahasia-runtime/main.tf" />`);
    expect(baris.slice(t, tAkhir + 1).join("\n")).toContain("hashicorp/local");
  });
});

describe("kebersihan teks: tanpa ID internal, merek, kata terlarang, label lebih kuat dari sumber, dan tabel utuh", () => {
  test("tanpa ID riset, nomor keputusan, nomor PR, atau komentar lab internal di halaman, widget, Rantai, dan istilah", () => {
    const tampil = [halaman, JSON.stringify(widgetMentah), JSON.stringify(rantaiMentah), istilahMentah.istilah, istilahMentah.sehari_hari, JSON.stringify(istilahMentah.cerita), JSON.stringify(istilahMentah.mekanisme), JSON.stringify(istilahMentah.jebakan)].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d+|\bPR #?\d+|tinjauan PR/i);
  });
  test("tanpa merek penyedia di prosa, tanpa kata murah, label Rekaman lab tidak dipakai (tidak ada rekaman), dan Tidak dijalankan didefinisikan sesudah pemakaian pertama", () => {
    expect(badan).not.toMatch(/\b(Amazon|AWS|Azure|Google Cloud|GCP|Stripe|RDS|Cloudflare)\b/);
    expect(badan).not.toMatch(/\b(murah|mahal|pengguna|klien|berkas)\b/i);
    expect(badan).not.toContain("Rekaman lab");
    expect(badan).not.toMatch(/\bkita\b|\bAnda\b/);
    // pemakaian pertama label diberi arti di kalimat itu atau sebelumnya
    const arti = 'Di kolom Bukti, "Tidak dijalankan" berarti dicek ke dokumentasi atau naskah tanpa menjalankannya.';
    expect(badan.indexOf("Tidak dijalankan")).toBe(badan.indexOf(arti) + arti.indexOf("Tidak dijalankan"));
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("(Hitungan: hasil rumus dari angka yang tertulis di halaman") + 1);
    expect(badan.indexOf("Ilustrasi")).toBe(badan.indexOf("Semua angka halaman ini Ilustrasi") + "Semua angka halaman ini ".length);
    expect(badan.indexOf("[Label sumber](/cara-pakai/#label-sumber)")).toBeLessThan(badan.indexOf("Tidak dijalankan"));
    expect(badan.indexOf("Asumsi")).toBeGreaterThan(badan.indexOf("[Label sumber](/cara-pakai/#label-sumber)"));
  });
  test("tabel GFM: kolom header, pemisah, dan tiap baris sama; jumlah tabel di MDX sama dengan yang diharapkan", () => {
    const baris = badan.split("\n");
    let tabel = 0;
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        tabel++;
        const n = baris[i]!.split("|").length;
        for (let j = i; j < baris.length && baris[j]!.startsWith("|"); j++) expect(baris[j]!.split("|").length, `tabel ${tabel} baris ${j + 1}`).toBe(n);
        expect(baris[i + 1]).toMatch(/^\|(---\|)+$/);
      }
    }
    expect(tabel).toBe(5);
    expect(kali(badan, "<table>")).toBe(1);
  });
  test("label sumber: Ilustrasi untuk semua angka biaya, tidak ada kata Rekaman untuk model, dan lima label dipakai dengan jumlah yang dikunci", () => {
    expect(W.sumber.jenis).toBe("ilustrasi");
    expect(DataRantai.parse(rantaiMentah).sumber.jenis).toBe("ilustrasi");
    harusAda("Semua angka halaman ini Ilustrasi: contoh masukan dalam juta rupiah, bukan harga penyedia mana pun dan bukan hasil sistem ([Label sumber](/cara-pakai/#label-sumber) menjelaskan label).");
    harusAda("(Hitungan: hasil rumus dari angka yang tertulis di halaman, berlabel Ilustrasi karena masukannya Ilustrasi)");
    harusAda('Di kolom Bukti, "Tidak dijalankan" berarti dicek ke dokumentasi atau naskah tanpa menjalankannya.');
    harusAda("[perlu verifikasi]", 1);
  });
  test("claim penalaran dan keputusan pemilik: database terkelola tidak dinyatakan salah, produksi menunggu pemilik, tanpa klaim kepatuhan", () => {
    harusAda("Produksi database dijalankan sendiri atau terkelola belum diputuskan. Itu keputusan produk milik pemilik, dan ADR ini hanya menjaga agar kedua jalan tetap terbuka.");
    harusAda("Ia tidak menyatakan database terkelola salah.");
    harusAda("ADR 59 menambah batas bentuk, bukan melarang layanan terkelola.");
    harusAda("halaman ini tidak menyatakan lokasi mana yang memenuhi aturan apa pun.");
    expect(badan).not.toMatch(/patuh|kepatuhan|regulasi|sertifikasi|berizin/i);
    harusAda("(penalaran, bukan pengukuran)");
  });
});

describe("celah turunan yang ditutup sesudah uji mutasi tanpa sidik: kepala, nomor, kata bilangan, sel tabel, kutipan riset", () => {
  test("frontmatter description memuat ADR dari registry, label Ilustrasi, dan kalimat belum diukur", () => {
    const d = cari(/^description: (.+)$/m, halaman, "description")[1]!;
    expect(d).toBe(`ADR ${dari("t5-onprem").adr![0]}. Rekeningo tetap di cloud milik PT dan menjaga jalan keluarnya. Model biaya tiga tahun dengan masukan Ilustrasi menunjukkan bahwa orang operasi, bukan infrastruktur, yang membalik urutan. Biaya cloud melawan perangkat sendiri belum diukur.`);
    expect(d.length).toBeLessThan(300);
  });
  test("nomor ADR dan nomor tahap yang disebut halaman: tiap angka dihitung, dan setiap ADR punya sumber di registry atau halaman ini", () => {
    const hitung = (pola: RegExp) => { const o: Record<string, number> = {}; for (const m of badan.matchAll(pola)) o[m[1]!] = (o[m[1]!] ?? 0) + 1; return o; };
    expect(hitung(/ADR (\d+)/g)).toEqual({ 39: 4, 48: 4, 50: 1, 51: 1, 52: 2, 59: 5 });
    for (const n of [39, 48, 50, 51, 52, 59]) expect(hal.some((h) => h.adr?.includes(n)), `ADR ${n} ada di registry`).toBe(true);
    expect(hitung(/Tahap (\d)/g)).toEqual({ 4: 4, 5: 7 });
    expect(hitung(/\bM(\d\d)\b/g)).toEqual({ 42: 1, 44: 1 });
    expect(kali(badan, "37signals")).toBe(4);
    harusAda("Kubernetes (ADR 50, [[t5-service]]) dan Kafka (ADR 51, [[t5-fanout]]) ikut datang.");
    harusAda("dan ADR 48 dan 52 bisa direkam di lab");
    harusAda("ADR 59 tidak memilih dari angka itu.");
  });
  test("daftar bernomor berurutan dari 1 dan kata bilangan atas daftar dihitung ulang", () => {
    const baris = badan.split("\n");
    const daftar: number[][] = [];
    let cur: number[] = [];
    for (const b of baris) {
      const m = b.match(/^(\d+)\. /);
      if (m) cur.push(Number(m[1]));
      else if (b.trim() === "" || b.startsWith("<")) { /* jeda di dalam daftar tidak memutus */ }
      else if (cur.length) { daftar.push(cur); cur = []; }
    }
    if (cur.length) daftar.push(cur);
    for (const d of daftar) expect(d, `daftar ${d}`).toEqual(d.map((_, i) => i + 1));
    expect(daftar.map((d) => d.length)).toEqual([3, 7, 3]);
    const aturan = badan.slice(badan.indexOf("**Keputusan: opsi E.**"), badan.indexOf("Produksi database"));
    expect([...aturan.matchAll(/^\d+\. /gm)].length).toBe(7);
    harusAda("**Keputusan: opsi E.** Tujuh aturan:");
    const pre = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("</Blok>", badan.indexOf("**Pre-mortem.**")));
    expect([...pre.matchAll(/^\d+\. /gm)].length).toBe(3);
    harusAda("Tiga penyebab yang paling mungkin:");
    harusAda("Yakin dengan ketiganya?");
    harusAda("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
    harusAda("Empat jalan keluar dan keadaannya hari ini:");
    harusAda("Lima cara menjawab direksi.");
    harusAda("Total tiga tahun lima skenario, semua Ilustrasi:");
    harusAda("kodenya ada di tiga tempat");
    expect([...badan.matchAll(/^(Pertama|Kedua|Ketiga), /gm)].map((m) => m[1])).toEqual(["Pertama", "Kedua", "Ketiga"]);
    expect([...badan.matchAll(/^\*\*\d\.\*\* /gm)].length).toBe(4);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    harusAda("Dua tulisan pendirinya, David Heinemeier Hansson, menjadi bahan.");
    expect(W.skenario.length).toBe(5);
    harusAda("Tiga hal belum ada: biaya cloud dan perangkat PT sendiri, jumlah orang operasi perangkat yang dibutuhkan, dan faktor puncak dari beban nyata.");
    harusAda("Tiga konfigurasi OpenTofu");
  });
  test("angka yang tersisa di prosa: orang, faktor puncak, tahap, bulan, dan tanggal", () => {
    const m = W.masukan;
    harusAda(`Tim platform dan SRE melewati ${m.orangDasar} orang`);
    harusAda(`| ${m.orangDasar} orang × ${m.biayaOrang} per tahun |`);
    harusAda(`Faktor puncak ${registry.tahap[4]!.asumsi.puncak} (Asumsi) mengarah ke ujung beban tidak teratur.`);
    harusAda("Puncak harian sepuluh kali rata-rata belum sama dengan lonjakan yang tidak bisa ditebak (penalaran, bukan pengukuran).");
    harusAda("Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    harusAda("Selisih sebesar");
    harusAda(`kecuali ${m.orangDasar} orang: Platform 4 dan SRE 2`);
    harusAda("Tagihan cloud ditambah orang operasi 4 + 2");
    harusAda(`1. Dengan ${bilangan[dasar.m.orangTambahan]} orang operasi tambahan di on-prem, mana yang lebih hemat dalam tiga tahun, dan berapa selisihnya?`);
    harusAda(`2. Selisih kumulatif dari tahun 1 ke tahun ${dasar.kc.length} menyusut atau membesar, dan apa artinya bagi horizon lebih dari tiga tahun?`);
    harusAda("3. ADR 39 sudah menaruh data di layanan terkelola. Apa yang ditambahkan ADR 59 tanpa membatalkannya?");
    expect(dasar.ko[0]! - dasar.kc[0]!).toBeGreaterThan(dasar.ko[2]! - dasar.kc[2]!);
    harusAda("Klaim ini hanya untuk folder dan jenis file itu, dan bukan untuk migrasi Tahap 5.");
    harusAda("Ketiganya dari lab Tahap 4, bukan dari lab Tahap 5.");
    harusAda("Tahap 5 menambah komponen yang menentukan jawabannya.");
    harusAda("**Status:** diterima di Tahap 5. Naskah tidak menulis tanggal ADR.");
    harusAda("lab k3s Tahap 5 belum direkam");
    harusAda("Satuannya sama dengan beban Tahap 5: request per detik, orang, dan juta rupiah Ilustrasi.");
    harusAda("D. Tetap seperti Tahap 4", 1);
    harusAda("Pemindai otomatis atas dependency dan migrasi belum dibuat (Tidak dijalankan).");
    harusAda("Pencegahannya aturan 6: masukan diganti tagihan PT");
    harusAda("latihan pindah ke lokasi lain sekali setahun (Asumsi)");
    harusAda("6. Perbandingan biaya tiga tahun ditulis tiap tahun dengan rumus di atas.");
    expect(badan.indexOf("6. Perbandingan biaya")).toBeGreaterThan(badan.indexOf("5. Jalan keluar data"));
    harusAda("| Salah saat | Yang diperiksa | Angka sekarang | Dibaca dari |");
    harusAda("| | A. Layanan terkelola khusus penyedia | B. On-prem atau colo | C. Campuran | D. Tetap seperti Tahap 4 | E. Cloud milik PT, jalan keluar dijaga |");
    harusAda("| Yang dijaga | Cara memeriksa | Keadaan |");
  });
  test("Bacaan lanjut: lima tautan dengan nama dan alamat yang tepat", () => {
    const lanjut = badan.slice(badan.indexOf("### Bacaan lanjut")).split("\n").filter((b) => b.startsWith("- "));
    expect(lanjut).toEqual([
      "- [37signals: Why we're leaving the cloud](https://world.hey.com/dhh/why-we-re-leaving-the-cloud-654b47e0)",
      "- [37signals: We have left the cloud](https://world.hey.com/dhh/we-have-left-the-cloud-251760fb)",
      "- [OpenTofu: pengantar](https://opentofu.org/docs/intro/)",
      "- [PostgreSQL 17: replikasi logikal](https://www.postgresql.org/docs/17/logical-replication.html)",
      "- [K3s: dokumentasi](https://docs.k3s.io/)",
    ]);
  });
  // kata kunci per sel: tiap sel memuat kata yang membedakannya dari sel tetangga di kolom yang sama (menangkap sel yang tertukar)
  const SEL_OPSI: string[][] = [
    ["Cara kerja", "layanan satu penyedia", "membeli perangkat", "tanpa state di cloud", "Modular monolith", "bentuk standar"],
    ["Kelebihan", "Penyedia mengambil operasi", `Infrastruktur ${fmt(dasar.jo.infra)} lawan ${fmt(dasar.jc.infra)}`, "elastis", "Tidak ada pekerjaan baru", "dijalankan di tempat lain"],
    ["Kekurangan", "menutup jalan keluar", "belum ada", "antar lokasi", "M42", "jalan keluar harus dilatih"],
    ["Biaya operasional", "Tagihan per pemakaian", "dibeli di muka", "Dua set operasi", "Sama dengan Tahap 4", "Tagihan cloud ditambah orang operasi"],
    ["Bukti", "Tidak dijalankan: dibaca dari naskah", "kasus industri", "jaringan antar lokasi tidak diukur", "[[t5-m42]]", "dokumentasi k3s dan PostgreSQL"],
  ];
  const SEL_KELUAR: string[][] = [
    ["Manifest Kubernetes standar", "k3s dan ke cluster penyedia", "lab k3s Tahap 5 belum direkam"],
    ["PostgreSQL tanpa fitur khusus", "Memindai dependency dan migrasi", "Terbaca di `labs/api-t4`"],
    ["Data bisa keluar", "dump dan restore", "large object tidak ikut"],
    ["IaC bisa menunjuk penyedia lain", "tofu plan", "provider `local` dan `random`"],
  ];
  const SEL_SALAH: string[][] = [
    ["Biaya cloud tiga tahun melebihi on-prem", "tagihan dan harga PT", "Model dasar: cloud", "penawaran perangkat"],
    ["Beban menjadi stabil", "Faktor puncak", "request per detik (Asumsi)", "Metrik request per detik"],
    ["Data harus tinggal di lokasi tertentu", "Syarat dari PRD", "Tidak ada permintaan di PRD v5", "perjanjian dengan mitra"],
    ["melewati 6 orang", "Jumlah orang operasi", "Asumsi naskah", "Daftar tim"],
    ["Horizon melebihi tiga tahun", "Selisih kumulatif", "Sesudah tahun 3 tidak dihitung", "masukan PT"],
    ["Jalan keluar tidak bisa dijalankan", "Latihan pindah", "pemindai belum dibuat", "Catatan latihan SRE"],
  ];
  test.each([
    ["| | A. Layanan terkelola", SEL_OPSI, true],
    ["| Yang dijaga | Cara memeriksa | Keadaan |", SEL_KELUAR, false],
    ["| Salah saat | Yang diperiksa | Angka sekarang | Dibaca dari |", SEL_SALAH, false],
  ] as [string, string[][], boolean][])("tabel %s: tiap sel memuat kata kuncinya", (awalan, harap) => {
    const t = tabelMdx(awalan).slice(2);
    expect(t.length).toBe(harap.length);
    harap.forEach((baris, i) => baris.forEach((kata, j) => expect(t[i]![j], `${awalan} baris ${i} kolom ${j}`).toContain(kata)));
  });
  test("baris riset memuat kutipan, versi, angka, dan kolom 'dipakai halaman' dengan nomor halaman dari registry", () => {
    const nomor = dari("t5-onprem").nomor;
    const KUTIPAN: Record<string, string[]> = {
      "R5-245": ["2022-10-19", "US$500 ribu", "(mostly) a bad deal", "only one end was ever relevant for us", "materially shrink", `${nomor}: kasus industri ADR 59`],
      "R5-246": ["2023-06-23", "after six months", "at all", "KVM, Docker, dan Kamal, tanpa Kubernetes", "at least $1.5 million per year", "back of the napkin math", `${nomor}: kasus industri ADR 59`],
      "R5-247": ["OpenTofu 1.13.0 is released!", "a Series of LF Projects, LLC", "MPL-2.0 dan v1.13.2, terbit 2026-10-21", "R4-190", `${nomor}: Wujud di kode (IaC)`],
      "R5-248": ["PostgreSQL 17.11 bab 29", "for example Linux to Windows", "Bagian 29.7", "Large objects", `${nomor}: aturan 5 ADR 59`],
      "R5-249": ["fully compliant Kubernetes distribution", "a binary of less than 100 MB", "v1.37.X", `${nomor}: aturan 2 ADR 59`],
    };
    for (const [id, daftar] of Object.entries(KUTIPAN)) for (const k of daftar) expect(barisRiset(id), `${id}: ${k}`).toContain(k);
    harusAda("lab k3s Tahap 5 belum direkam");
  });
  test("widget: id, judul, tebak, dan label sama persis dengan yang dikunci dari sumber di halaman", () => {
    expect(W.id).toBe("t5-onprem-biaya");
    expect(W.judul).toBe("Biaya tiga tahun: cloud lawan perangkat sendiri");
    expect(W.tebak.q).toBe(`Skenario dasar menaruh ${bilangan[dasar.m.orangTambahan]} orang operasi tambahan di on-prem, dan cloud lebih hemat. Bila on-prem tidak butuh orang tambahan sama sekali, mana yang lebih hemat dalam tiga tahun?`);
    expect(W.tebak.pilihan).toEqual(["Cloud tetap lebih hemat, dengan selisih yang sama", "Cloud tetap lebih hemat, tetapi selisihnya menyusut", "On-prem menjadi lebih hemat", "Keduanya sama"]);
    expect(W.label).toEqual({
      sumber: "Ilustrasi", tebakDulu: "Tebak dulu:", lanjut: W.label.lanjut, benar: "Tepat:", belum: "Belum tepat:", ubah: "Skenario",
      captionKomponen: "Biaya tiga tahun per komponen (juta rupiah)", captionKumulatif: "Biaya kumulatif sampai akhir tiap tahun (juta rupiah)",
      cloud: "Cloud", onprem: "On-prem", komponen: { infra: "Infrastruktur", orang: "Orang operasi", migrasi: "Migrasi", risiko: "Risiko", total: "Total" },
      tahun: "Tahun", kumulatif: "Kumulatif", kesimpulan: { ...W.label.kesimpulan, sama: "Biaya tiga tahun sama, {total} juta rupiah." },
    });
    expect(DataRantai.parse(rantaiMentah).id).toBe("t5-onprem-inti");
    expect(DataRantai.parse(rantaiMentah).baris.map((b) => b.simpul.length)).toEqual([3, 3]);
  });
  test("halaman istilah: judul sumber dan catatan sama dengan baris riset dan tanggal dari riset", () => {
    const [a, b] = istilahMentah.sumber!;
    expect(a!.judul).toBe("37signals: We have left the cloud (23 Juni 2023, dibuka 2026-10-31)");
    expect(barisRiset("R5-246")).toContain("terbit 2023-06-23");
    expect(b!.judul).toBe("OpenTofu: pengantar (v1.13, dibuka 2026-10-31)");
    expect(barisRiset("R5-247")).toContain("OpenTofu 1.13.0");
    expect(a!.catatan).toBe("Pindah dari cloud ke perangkat sendiri selesai dalam enam bulan, dengan ukuran tim operasi tetap. Penghematan adalah hitungan pendirinya, tanpa audit independen yang disebut di tulisan.");
    expect(b!.catatan).toBe("Alat IaC yang mendefinisikan resource cloud dan on-prem dalam file konfigurasi.");
    expect(barisRiset("R5-246")).toContain("after six months");
    expect(barisRiset("R5-246")).toContain("at all");
    expect(istilahMentah.sehari_hari).toBe("On-prem berarti perangkat dan jaringan milik PT sendiri dijalankan di ruang milik PT. Colo berarti perangkat milik PT berdiri di ruang sewaan. Kebalikannya cloud: perangkat milik penyedia disewa sesuai pemakaian.");
    expect(istilahMentah.cerita![0]!.teks).toContain(`dengan semua masukan Ilustrasi`);
    expect(istilahMentah.cerita![0]!.teks).toContain("infrastruktur, orang operasi, migrasi, dan risiko");
    expect(naskah).toContain("biaya = infrastruktur + orang operasi + migrasi + risiko");
  });
});

describe("kartu ulang dan peta: turunan registry sama dengan Cek diri di halaman", () => {
  test("empat kartu t5-onprem: pertanyaan dan jawaban sama dengan Cek diri, judul dan url dari registry", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t5-onprem");
    const cek = badan.slice(badan.indexOf("### Cek diri"), badan.indexOf("### Saat me-review"));
    const tanya = [...cek.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    const jawab = [...cek.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(tanya.length).toBe(4);
    expect(kartu.map((k) => [k.id, k.tanya, k.jawab])).toEqual(tanya.map((t, i) => [`t5-onprem-${i + 1}`, t, jawab[i]]));
    for (const k of kartu) expect([k.judul, k.url]).toEqual([`${dari("t5-onprem").nomor} ${dari("t5-onprem").judul}`, "tahap-5/on-prem-lawan-cloud/"]);
  });
});

describe("halaman istilah on-prem", () => {
  test("nama, slug, baris glosarium, rujukan, dan sumber sama dengan riset", () => {
    expect(istilahMentah.istilah).toBe("On-prem (on-premises)");
    const g = (glosarium as { t: string; d: string; s: string; h: string | null }[]).find((x) => x.t === istilahMentah.istilah);
    expect(g).toBeDefined();
    expect(g!.s).toBe("istilah-on-prem");
    expect(g!.h).toBe("/istilah/on-prem/");
    expect(g!.d).toContain("Bila ruangnya sewaan, disebut colo.");
    expect(istilahMentah.cerita![0]!.rujukan).toBe("t5-onprem");
    expect(istilahMentah.sumber!.map((s) => s.riset)).toEqual(["R5-246", "R5-247"]);
    for (const s of istilahMentah.sumber!) {
      expect(barisRiset(s.riset!), s.riset).toContain(s.url!.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, ""));
      expect(s.judul).toContain("dibuka 2026-10-31");
    }
    expect(istilahMentah.sumber![0]!.catatan).toContain("enam bulan");
    expect(istilahMentah.sumber![0]!.catatan).toContain("tanpa audit independen");
    expect(istilahMentah.mekanisme!.length).toBe(4);
    expect(istilahMentah.jebakan![0]).toContain("halaman 5.28");
    expect(istilahMentah.terkait).toEqual(["IaC (infrastructure as code)", "ADR (Architecture Decision Record)"]);
    harusAda("On-prem di halaman ini berarti perangkat milik PT di ruang milik PT. Colo berarti perangkat milik PT di ruang sewaan.");
    expect(istilahMentah.sehari_hari).toContain("Colo berarti perangkat milik PT berdiri di ruang sewaan.");
  });
});

// --- Lapis 2: kata-kata halaman dan JSON dikunci per baris; sidik jumlah kata kunci
const sidikTeks = (teks: string) => ({
  tidak: kali(teks.toLowerCase(), " tidak "), bukan: kali(teks.toLowerCase(), " bukan "), belum: kali(teks.toLowerCase(), " belum "), hanya: kali(teks.toLowerCase(), "hanya "), hemat: kali(teks, " hemat "),
  ilustrasi: kali(teks, "Ilustrasi"), asumsi: kali(teks, "Asumsi"), hitungan: kali(teks, "Hitungan"), tidakDijalankan: kali(teks, "Tidak dijalankan"), perluVerifikasi: kali(teks, "[perlu verifikasi]"), penalaran: kali(teks, "penalaran"),
  tanggal: kali(teks, "dibuka 2026-10-31"),
});
const ratakan = (x: unknown, awal = ""): string[] => (typeof x === "string" ? [`${awal}=${x}`] : typeof x === "number" || typeof x === "boolean" ? [`${awal}=${String(x)}`] : x === null ? [`${awal}=null`] : Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${awal}[${i}]`)) : Object.entries(x as object).flatMap(([k, v]) => ratakan(v, `${awal}.${k}`)));
const sekarang = () => ({
  halaman: halaman.split("\n").map((b) => b.trim()).filter(Boolean),
  json: { widget: ratakan(widgetMentah), rantai: ratakan(rantaiMentah), istilah: ratakan(istilahMentah) } as Record<string, string[]>,
});
const sidikSekarang = () => ({
  halaman: sidikTeks(badan),
  struktur: createHash("sha1").update(badan.split("\n").filter((b) => /^(#|<Blok|<\/Blok|<details|<\/details|<summary|<noscript|<\/noscript|<Snippet|<Rantai|<BiayaTigaTahun|\|---)/.test(b)).join("\n")).digest("hex"),
  riset: ["R5-245", "R5-246", "R5-247", "R5-248", "R5-249"].map((id) => createHash("sha1").update(barisRiset(id)).digest("hex")),
});

if (process.env.PERBARUI_KUNCI === "1") {
  const s = sekarang();
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat on-prem-lawan-cloud.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang())};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(s.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(s.json, null, 1)};\n`;
  fs.writeFileSync(path.join(akar, "situs/src/lib/on-prem-lawan-cloud.halaman.nilai.ts"), isi);
}

describe.skipIf(tanpaKunci)("lapis 2: kata-kata halaman dan JSON dikunci", () => {
  test("setiap baris halaman sama dengan yang terkunci", () => {
    expect(sekarang().halaman).toEqual(KALIMAT_TERKUNCI);
  });
  test("setiap nilai JSON widget, Rantai, dan istilah sama dengan yang terkunci", () => {
    expect(sekarang().json).toEqual(KUNCI_JSON);
  });
  test("sidik: jumlah kata kunci, label, struktur, dan baris riset milik halaman ini", () => {
    const s = sidikSekarang();
    expect(s.halaman).toEqual(SIDIK.halaman);
    expect(s.struktur).toBe(SIDIK.struktur);
    expect(s.riset).toEqual(SIDIK.riset);
  });
});
