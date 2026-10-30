// Penjaga halaman 4.30 (keputusan 1382 sampai 1384): setiap angka, ID halaman, nomor ADR, label, dan tautan di rekap.mdx, kartu
// t4-rekap-kartu.json, dan diagram Rantai t4-rekap-kejadian.json diturunkan dari naskah Tahap 4 (bagian 4 dan 5), registry
// (cerita.json), halaman Tahap 4 yang dirujuk, dan rekaman lab Tahap 4, bukan dari daftar yang ditulis sendiri. Halaman ini TANPA
// LAB dan merangkum halaman lain: tanpa tes ini, satu angka, satu ID, satu nomor ADR, satu label, atau satu tautan yang berubah
// tidak menggagalkan build, Vitest, atau alat ukur mana pun.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci
// per baris lewat rekap-t4.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat terkunci tidak
// menangkap SALAHNYA kalimat, jadi klaim yang diucapkan (rute pembatal otorisasi, kill switch di memori, berkas workflow, versi
// pertama fetcher) dibaca dari berkas yang memerankannya. Halaman 4.27 sampai 4.29 belum ada di main saat halaman ini ditulis:
// tes yang membaca isinya hanya berjalan bila registry menandainya ada (`ada: true`), dan sebelum itu dijaga naskah dan registry.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import kejadianMentah from "../../data/diagram/t4-rekap-kejadian.json";
import { daftarBlok, idBlok } from "./blok";
import { DataRantai } from "./rantai";
import { KALIMAT } from "./rekap-t4.halaman.kalimat";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./rekap-t4.halaman.nilai";

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

const mdx = baca("situs/src/content/docs/tahap-4/rekap.mdx");
const potong = mdx.split(/^---\n/m);
const frontmatter = potong[1]!;
const badan = potong.slice(2).join("---\n");
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const naskah = baca("plan/CERITA-TAHAP-4.md");
const diagram = DataRantai.parse(kejadianMentah);
interface Kartu { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }
const kartu = JSON.parse(baca("situs/lama/widgets/data/t4-rekap-kartu.json")) as Kartu[];
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as Kartu[];
const riset4 = baca("plan/RISET-TAHAP-4.md");
const riset3 = baca("plan/RISET-TAHAP-3.md");
const riset2 = baca("plan/RISET-TAHAP-2.md");

interface H { id: string; judul: string; tahap: number; path: string; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; prasyarat?: string[]; bagian?: number | string; inti?: boolean; menit?: number; peran?: string[]; masalah?: string }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const fileHalaman = (id: string): string => baca(`situs/src/content/docs/${per(id).path.replace(/\.md$/, ".mdx")}`);
const urlHalaman = (id: string): string => per(id).path.replace(/\.md$/, "/");
const labelHalaman = (id: string): string => `${per(id).nomor} ${per(id).judul}`;
// Halaman yang belum di main (ada: false) tidak punya berkas: tes isinya berjalan hanya sesudah halaman itu ada.
const jikaAda = (id: string, uji: (teks: string) => void): void => {
  if (per(id).ada) uji(fileHalaman(id));
};

const harus = (teks: string, kalimat: string): void => expect(teks, `tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const titik = (n: number): string => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;

// ---- potongan MDX ----------------------------------------------------------------------------------------------------------
const blok = (nama: string): string => {
  const awal = mdx.indexOf(`<Blok nama="${nama}"`);
  const akhir = mdx.indexOf("</Blok>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`halaman: blok ${nama} tidak ada`);
  return mdx.slice(awal, akhir);
};
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\|[^\]]+)?\]\]/g;
const idDalam = (teks: string): string[] => [...teks.matchAll(TOKEN)].map((m) => m[1]!);

interface Butir { no: number; kalimat: string; teks: string; pertama: string; batas: string; ids: string[]; adr: number[] }
const tigabelas = ((): Butir[] => {
  const paham = blok("Paham");
  const bagian = paham.slice(paham.indexOf("### Tiga belas kalimat"), paham.indexOf("### Yang belum diuji")).split("\n");
  const hasil: Butir[] = [];
  for (const b of bagian) {
    const m = b.match(/^(\d+)\. \*\*(.+?)\*\*/);
    if (m) hasil.push({ no: Number(m[1]), kalimat: m[2]!.replace(/\.$/, ""), teks: "", pertama: b, batas: "", ids: [], adr: [] });
    if (hasil.length) {
      const h = hasil[hasil.length - 1]!;
      h.teks += b + "\n";
      if (/^\s+\*(Batas|Dipersempit):\*/.test(b)) h.batas += b.trim() + " ";
    }
  }
  for (const h of hasil) {
    h.ids = idDalam(h.teks);
    h.adr = [...h.pertama.matchAll(/Konsep dan ADR (\d+)/g)].map((m) => Number(m[1]));
  }
  return hasil;
})();
const butir = (no: number): Butir => tigabelas[no - 1]!;

// ---- naskah: bagian 4 (M, minggu) dan bagian 5 (kalimat dan kejadian) ------------------------------------------------------
const barisNaskah = naskah.split("\n");
const tabelNaskah5 = ((): { konsep: string; kalimat: string; kejadian: string }[] => {
  const a = barisNaskah.findIndex((b) => b.startsWith("## 5. Yang dibawa pembaca keluar dari Tahap 4"));
  const z = barisNaskah.findIndex((b, i) => i > a && b.startsWith("## 6."));
  return barisNaskah.slice(a, z).filter((b) => b.startsWith("| ") && !b.startsWith("| Konsep") && !b.startsWith("| ---")).map((b) => {
    const k = b.split("|").map((x) => x.trim());
    return { konsep: k[1]!, kalimat: k[2]!, kejadian: k[3]! };
  });
})();
const mingguM = ((): Map<number, number> => {
  const peta = new Map<number, number>();
  for (const b of barisNaskah) {
    const m = b.match(/^\| M(\d+) \| (\d+) \|/);
    if (m && Number(m[1]) >= 29) peta.set(Number(m[1]), Number(m[2]));
  }
  return peta;
})();
const idM = (n: number): string => {
  const h = HALAMAN.find((x) => x.tahap === 4 && x.judul.startsWith(`M${n}:`));
  if (!h) throw new Error(`registry: M${n} tidak ada`);
  return h.id;
};
const idAdr = (n: number): string => {
  const h = HALAMAN.filter((x) => x.tahap === 4 && x.adr?.includes(n));
  if (h.length !== 1) throw new Error(`registry: ADR ${n} harus tepat di satu halaman Tahap 4, ada ${h.length}`);
  return h[0]!.id;
};
const tahap4 = HALAMAN.filter((h) => h.tahap === 4 && /^4\.\d+$/.test(h.nomor ?? "") && Number(h.nomor!.slice(2)) <= 29);

// ---- rekaman lab ------------------------------------------------------------------------------------------------------------
const rk = (lab: string, berkas: string): string => baca(`labs/${lab}/output/${berkas}`);
const bag = (teks: string, kode: string): string[] => {
  const b = teks.split("\n");
  const awal = b.findIndex((x) => x.startsWith(`# --- ${kode}. `));
  if (awal < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const akhir = b.findIndex((x, i) => i > awal && x.startsWith("# --- "));
  return b.slice(awal, akhir < 0 ? undefined : akhir);
};
const cari = (baris: string[], pola: RegExp, nama: string): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const semua = (baris: string[], pola: RegExp): RegExpMatchArray[] => baris.map((b) => b.match(pola)).filter((x): x is RegExpMatchArray => x !== null);
const ada = (baris: string[], pola: RegExp): boolean => baris.some((b) => pola.test(b));

const ganda = rk("t4-webhook", "ganda.txt");
const tandatangan = rk("t4-webhook", "tandatangan.txt");
const urutan = rk("t4-webhook", "urutan.txt");
const retry = rk("t4-webhook", "retry.txt");
const rekon = rk("t4-webhook", "rekon.txt");
const prosesMati = rk("t4-modul", "proses-mati.txt");
const lajur = rk("t4-integrasi", "lajur.txt");
const batasModul = rk("t4-modul", "batas.txt");
const ukuran = rk("t4-storage", "ukuran.txt");
const presign = rk("t4-storage", "presign.txt");
const unduh = rk("t4-storage", "unduh.txt");
const alamatInfra = rk("t4-infra", "alamat.txt");
const stateInfra = rk("t4-infra", "state.txt");
const staging = rk("t4-infra", "staging.txt");
const statis = rk("t4-qr", "statis.txt");
const crc = rk("t4-qr", "crc.txt");
const alamatSsrf = rk("t4-ssrf", "alamat.txt");
const batasSsrf = rk("t4-ssrf", "batas.txt");
const otorisasi = rk("t4-kartu", "otorisasi.txt");
const killSwitch = rk("t4-kartu", "kill-switch.txt");
const rantaiAudit = rk("t4-audit", "rantai.txt");
const jangkar = rk("t4-audit", "jangkar.txt");
const kontrakApi = rk("api-t4", "kontrak.txt");
const tandaTanganPipeline = rk("t4-pipeline", "tanda-tangan.txt");
const sast = rk("t4-pipeline", "sast.txt");
const sbom = rk("t4-pipeline", "sbom.txt");
const beban = rk("api-t4", "beban.txt");
const testingApi = rk("api-t4", "testing.txt");

// ---- registry: asumsi Tahap 3 dan 4 (hitungan beban) ----------------------------------------------------------------------
interface Asumsi { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string }
const a3 = cerita.tahap[2]!.asumsi as Asumsi;
const a4 = cerita.tahap[3]!.asumsi as Asumsi;
const puncakDari = (a: Asumsi): number => ((a.user * a.aktif) / 100) * a.req / 86400 * a.puncak;
const uangDari = (a: Asumsi): number => ((a.user * a.aktif) / 100) * a.trx / 86400 * a.puncak;
const PUNCAK3 = koma(puncakDari(a3), 1);
const PUNCAK4 = koma(puncakDari(a4), 1);
const NAIK = puncakDari(a4) / Number(PUNCAK3.replace(",", "."));
const topup = (a4.user * a4.aktif) / 100 * 0.25 / 86400 * a4.puncak;
const notif = uangDari(a4) + topup;
const kapasitasWorker = 4 / 0.3;
const WORKER4 = `${Math.round((Number(koma(notif, 2).replace(",", ".")) / Number(koma(kapasitasWorker, 2).replace(",", "."))) * 100)}%`;
const WORKER3 = `${koma((uangDari(a3) / 13.3) * 100, 1)}%`;
const KONEKSI = 2 * 10 + 2 * 5 + 4 + 3 + 3;

// ================================================================================================================================
// TANPA_LAPIS2=1 mematikan lapis 2 supaya uji mutasi mengukur lapis 1 (nilai turunan sumber) sendirian.
const lapis2 = process.env.TANPA_LAPIS2 ? describe.skip : describe;
lapis2("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai dan kartu sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kartu"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t4-rekap-kejadian.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(kartu)).toEqual(NILAI_JSON.kartu);
  });
});

describe("registry dan naskah: tiga belas kalimat, kejadian, minggu, dan ADR", () => {
  test("halaman 4.30 terdaftar sebagai Konsep bagian 5 sesudah ADR 45, tanpa peran, dan berblok Mulai, Coba, Paham, Putuskan, Kunci", () => {
    const h = per("t4-rekap");
    expect([h.nomor, h.tahap, h.jenis, h.bagian, h.ada, h.prasyarat, h.inti, h.peran]).toEqual(["4.30", 4, "konsep", 5, true, ["t4-adr-45"], true, undefined]);
    expect(h.masalah).toBe("Mengingat tiga belas konsep Tahap 4 dalam satu kalimat masing-masing");
    expect(per("t4-adr-45").nomor).toBe("4.29");
    expect(per("t4-jembatan").nomor).toBe("4.31");
    expect(per("t4-jembatan").prasyarat).toEqual(["t4-rekap"]);
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
    expect(idBlok(mdx)).toHaveLength(5);
    expect(frontmatter).toContain(`title: "${labelHalaman("t4-rekap")}"`);
  });

  test("menit baca dan coba di meta sama dengan registry, dan jumlah kata sesuai 160 sampai 200 kata per menit untuk blok baca", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-adr-45\]\] · Jalur inti<\/p>/);
    expect(per("t4-rekap").menit).toBe(Number(m[1]) + Number(m[2]));
    const bacaKata = ["Mulai", "Paham", "Putuskan"].reduce((n, b) => n + bersihKata(blok(b)), 0);
    const cobaKata = ["Coba", "Kunci"].reduce((n, b) => n + bersihKata(blok(b)), 0);
    expect(bacaKata / Number(m[1]), `kata baca ${bacaKata}, ${m[1]} menit`).toBeGreaterThan(160);
    expect(bacaKata / Number(m[1])).toBeLessThan(200);
    expect(cobaKata / Number(m[2]), `kata coba ${cobaKata}, ${m[2]} menit`).toBeGreaterThan(160);
    expect(cobaKata / Number(m[2])).toBeLessThan(260);
  });

  test("tiga belas kalimat di halaman berurutan, tabel naskah punya tiga belas baris, dan kalimat 1 sampai 4 sama dengan naskah", () => {
    expect(tabelNaskah5).toHaveLength(13);
    expect(tigabelas.map((b) => b.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(tabelNaskah5.map((x) => x.konsep)).toEqual([
      "Webhook masuk", "Rekonsiliasi", "Retry, breaker, lajur queue", "Modular monolith", "Object storage", "Presigned URL",
      "Secret manager, IaC, alamat keluar", "QR", "SSRF", "Kartu virtual", "Audit log berantai", "Pipeline per modul", "Estimasi",
    ]);
    for (const i of [0, 1, 2, 3]) expect(butir(i + 1).kalimat).toBe(tabelNaskah5[i]!.kalimat.replace(/\.$/, ""));
  });

  test("kalimat 5 sampai 13 ditulis dalam versi halaman asal: tiap kalimat menaut rumusan yang tertulis di halaman asalnya", () => {
    // kalimat naskah yang lebih kuat daripada halaman asalnya ditulis ulang, dan selisihnya masuk usulan perubahan cerita di badan PR
    const asal: [number, string, string[]][] = [
      [5, "t4-m33", ["File bukan data transaksi: database menyimpan kunci dan checksum, dan file hidup di tempat lain."]],
      [6, "t4-storage", ["URL unggah adalah bearer token yang punya umur.", "izin yang berlaku bagi siapa pun yang membawanya"]],
      [7, "t4-infra-secret", ["Pindahan membawa tiga hal yang tidak tertulis di kode: alamat keluar, secret, dan state IaC."]],
      [8, "t4-m35", ["CRC menangkap salah baca, bukan penggantian."]],
      [8, "t4-qr", ["Nama di layar memperlihatkan stiker yang salah tempat, tetapi tidak mencegahnya."]],
      [9, "t4-ssrf", ["Server yang mengunduh alamat dari merchant menghubunginya atas nama server, jadi yang diperiksa adalah alamat yang dihubungi, bukan teks URL."]],
      [10, "t4-m37", ["Di lab, Rekeningo tidak punya rute untuk menarik persetujuan yang sudah dijawab"]],
      [10, "t4-kartu", ["Persetujuan hanya diberikan sesudah hold tercatat."]],
      [11, "t4-m38", ['Jawaban "tidak ada" di sini sama nilainya dengan "tidak tahu".']],
      [12, "t4-tim-infra", ["Pipeline per modul menahan kontrak yang merusak dan menolak image bukan hasil CI.", "perbandingan digest hasil build"]],
    ];
    for (const [, id, frasa] of asal) for (const f of frasa) harus(fileHalaman(id), f);
    // kata-kata kalimat halaman memuat inti rumusan asal
    harus(butir(5).kalimat, "File bukan data transaksi: database menyimpan kunci dan checksum, dan file hidup di tempat lain");
    harus(butir(6).kalimat, "izin bagi siapa pun yang membawanya, dan izin itu punya umur");
    harus(butir(7).kalimat, "Pindahan membawa tiga hal yang tidak tertulis di kode: alamat keluar, secret, dan state IaC");
    harus(butir(8).kalimat, "CRC menangkap salah baca, bukan penggantian; nama dari server memperlihatkan stiker yang salah tempat, tetapi tidak mencegahnya");
    expect(butir(9).kalimat.startsWith(tabelNaskah5[8]!.kalimat.replace(/\.$/, ""))).toBe(true);
    harus(butir(9).kalimat, ", jadi yang diperiksa adalah alamat yang dihubungi, bukan teks URL");
    expect(butir(10).kalimat.startsWith("Di lab, Rekeningo tidak punya rute untuk menarik persetujuan")).toBe(true);
    harus(butir(10).kalimat, "jadi dana ditahan sebelum menjawab setuju");
    expect(tabelNaskah5[9]!.kalimat).toBe("Persetujuan tidak bisa ditarik, jadi dana ditahan sebelum menjawab setuju");
    harus(butir(11).kalimat, 'Di tabel catatan tanpa audit, jawaban "tidak ada" sama nilainya dengan "tidak tahu"');
    harus(butir(12).kalimat, "digest hasil build CI, bukan hanya bertanda tangan");
    expect(butir(13).kalimat).toBe(tabelNaskah5[12]!.kalimat.replace(/kapasitas$/, "jumlah request per detik"));
    // naskah lebih kuat: tiap kalimat yang ditulis ulang berbeda dari naskah
    for (const i of [4, 5, 6, 7, 8, 9, 10, 11, 12]) expect(butir(i + 1).kalimat, `kalimat ${i + 1}`).not.toBe(tabelNaskah5[i]!.kalimat.replace(/\.$/, ""));
    jikaAda("t4-m39", (t) => harus(t, "Masalah Tahap 4 adalah kepercayaan pada pihak lain dan koordinasi tim, bukan jumlah request per detik."));
  });

  test("kejadian tiap kalimat dari naskah, dan tiap kalimat menaut halaman kejadian yang benar", () => {
    expect(tabelNaskah5.map((x) => x.kejadian)).toEqual([
      "PRD v4, M29", "M30", "M31", "M32", "M33", "M33", "M34", "M35", "M36", "M37", "M38", "Tim dan infra, ADR 44", "M39; kapasitas satu server belum terukur",
    ]);
    const kejadianId = [idM(29), idM(30), idM(31), idM(32), idM(33), idM(33), idM(34), idM(35), idM(36), idM(37), idM(38), "t4-tim-infra", idM(39)];
    butirSemua().forEach((b, i) => {
      expect(b.ids.includes(kejadianId[i]!), `kalimat ${b.no} harus menaut ${kejadianId[i]}`).toBe(true);
    });
    expect(butir(1).ids.slice(0, 2)).toEqual(["t4-prd", "t4-m29"]);
    expect(per("t4-prd").judul).toMatch(/^PRD v4/);
    expect(per(idM(39)).nomor).toBe("4.27");
    expect(per("t4-tim-infra").nomor).toBe("4.26");
    expect(per("t4-tim-infra").jenis).toBe("tim-infra");
    const lahirM = tabelNaskah5.filter((x) => /M\d\d/.test(x.kejadian) && !/Tim dan infra/.test(x.kejadian) && !/M39/.test(x.kejadian)).length;
    expect([lahirM, tabelNaskah5.length - lahirM]).toEqual([11, 2]);
    harus(blok("Mulai"), "Sebelas kalimat lahir dari PRD v4 dan M29 sampai M38, dan M33 melahirkan dua. Satu kalimat lahir dari tim dan infra, dan satu dari M39.");
  });

  test("nomor ADR tiap kalimat sama dengan registry, dan 'Konsep dan ADR n' menaut halaman yang field adr-nya memuat n", () => {
    const harapan = [34, 35, 36, 37, 38, 38, 39, 40, 41, 42, 43, 44, undefined];
    expect(HALAMAN.filter((h) => h.tahap === 4).flatMap((h) => h.adr ?? []).sort()).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]);
    butirSemua().forEach((b, i) => {
      const a = harapan[i];
      if (a === undefined) {
        expect(b.adr, `kalimat ${b.no} tanpa ADR`).toEqual([]);
        return;
      }
      expect([...new Set(b.adr)], `kalimat ${b.no}`).toEqual([a]);
      harus(b.pertama, `Konsep dan ADR ${a}: [[${idAdr(a)}]].`);
    });
    harus(butir(13).pertama, "Konsep dan beban PRD v5: [[t4-estimasi]].");
    expect(per("t4-estimasi").nomor).toBe("4.28");
    expect(per("t4-estimasi").adr).toBeUndefined();
    expect(idAdr(45)).toBe("t4-adr-45");
  });

  test("setiap rujukan [[ID]] ada di registry, ke-29 halaman 4.1 sampai 4.29 tertaut, dan tidak ada yang menuju 4.30 atau 4.31", () => {
    const rujuk = idDalam(mdx).filter((x) => x !== "berikutnya" && x !== "Kartu" && x !== "A0");
    for (const id of rujuk) expect(HALAMAN.some((h) => h.id === id), `[[${id}]] tidak ada di registry`).toBe(true);
    expect(rujuk).not.toContain("t4-jembatan");
    expect(rujuk).not.toContain("t4-rekap");
    expect(tahap4.map((h) => h.nomor)).toEqual(Array.from({ length: 29 }, (_, i) => `4.${i + 1}`));
    const tertaut = new Set(rujuk);
    for (const h of tahap4) expect(tertaut.has(h.id), `${h.nomor} ${h.id} tidak tertaut`).toBe(true);
    expect([...tertaut].sort()).toEqual(tahap4.map((h) => h.id).sort());
    harus(blok("Paham"), "Konsep Tahap 4 tersebar di dua puluh sembilan halaman, dari [[t4-prd]] sampai [[t4-adr-45]].");
    harus(blok("Paham"), "Empat di antaranya, [[t4-fitur-teknis]], [[t4-topup-verifikasi]], [[t4-dua-arah]], dan [[t4-skema]], mendukung kalimat di bawah tetapi tidak melahirkan kalimat sendiri.");
    expect(["t4-fitur-teknis", "t4-topup-verifikasi", "t4-dua-arah", "t4-skema"].map((id) => per(id).nomor)).toEqual(["4.2", "4.3", "4.4", "4.5"]);
    expect(per("t4-prd").nomor).toBe("4.1");
    expect(per("A0")?.id).toBe("A0");
    expect(mdx).not.toMatch(/pecah lebih dulu|PRD v5 selengkapnya|skala nasional/i);
  });

  test("label Dipersempit dan Batas per kalimat, dan definisi label ada sebelum pemakaian pertama", () => {
    const dipersempit = butirSemua().filter((b) => /\*Dipersempit:\*/.test(b.batas)).map((b) => b.no);
    const bts = butirSemua().filter((b) => /\*Batas:\*/.test(b.batas)).map((b) => b.no);
    expect(dipersempit).toEqual([1, 3, 4, 6, 8, 9, 11, 12, 13]);
    expect(bts).toEqual([2, 5, 7, 8, 10]);
    expect(butirSemua().filter((b) => b.batas === "").map((b) => b.no)).toEqual([]);
    expect(mdx.match(/\*Dipersempit:\*/g)).toHaveLength(9);
    expect(mdx.match(/\*Batas:\*/g)).toHaveLength(5);
    const def = mdx.indexOf("Label Dipersempit menulis selisihnya, dan label Batas menulis yang tidak direkam atau tidak dijalankan di halaman asal.");
    expect(def).toBeGreaterThan(0);
    expect(def).toBeLessThan(mdx.indexOf("*Dipersempit:*"));
    expect(def).toBeLessThan(mdx.indexOf("*Batas:*"));
    const defHit = mdx.indexOf("Hitungan berarti hasil rumus dari angka yang tertulis di halaman asalnya, berlabel sama dengan masukan terlemahnya.");
    expect(defHit).toBeGreaterThan(0);
    expect(defHit).toBeLessThan(mdx.indexOf("(Hitungan"));
    expect(mdx.indexOf("Hitungan")).toBe(defHit);
    expect(mdx.indexOf("Dipersempit")).toBeGreaterThan(mdx.indexOf("</Blok>"));
    harus(blok("Paham"), "Arti label Rekaman lab, Asumsi, Ilustrasi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].");
    // setiap kalimat Dipersempit di kartu memuat label itu, dan hanya kartu itu
    expect(kartu.filter((c) => c.jawab.includes("Dipersempit:")).map((c) => c.id)).toEqual(
      ["t4-rekap-k1", "t4-rekap-k3", "t4-rekap-k4", "t4-rekap-k6", "t4-rekap-k8", "t4-rekap-k9", "t4-rekap-k11", "t4-rekap-k12", "t4-rekap-k13"],
    );
    expect(kartu.filter((c) => c.jawab.includes("Batas:")).map((c) => c.id)).toEqual(["t4-rekap-k2", "t4-rekap-k5", "t4-rekap-k7", "t4-rekap-k10"]);
  });
});

function butirSemua(): Butir[] {
  return tigabelas;
}

function bersihKata(teks: string): number {
  const b = teks.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]*\]\]/g, "x").replace(/[`*#|]/g, " ");
  return b.split(/\s+/).filter((k) => /\w/.test(k)).length;
}

// ================================================================================================================================
describe("diagram Rantai t4-rekap-kejadian: urutan, minggu, dan sumber diturunkan dari naskah dan halaman M", () => {
  test("dua baris, dua belas simpul: PRD v4 lalu M29 sampai M39 berurutan, sumber berlabel Ilustrasi", () => {
    const simpul = diagram.baris.flatMap((b) => b.simpul);
    expect(diagram.id).toBe("t4-rekap-kejadian");
    expect(diagram.baris).toHaveLength(2);
    expect(simpul).toHaveLength(12);
    expect(simpul.map((s) => s.teks.split(" ")[0])).toEqual(["PRD", ...Array.from({ length: 11 }, (_, i) => `M${29 + i}`)]);
    expect(simpul[0]!.teks).toBe("PRD v4");
    expect(simpul[11]!.teks).toBe("M39 PRD v5");
    expect(simpul.filter((s) => s.nada === "system").map((s) => s.teks)).toEqual(["PRD v4", "M39 PRD v5"]);
    expect(diagram.sumber).toEqual({ jenis: "ilustrasi", teks: "Naskah Tahap 4 · urutan kejadian" });
    expect(diagram.judul).toBe("Kejadian Tahap 4 dalam urutan minggu");
    expect(Math.max(...simpul.map((s) => s.teks.length))).toBeLessThanOrEqual(10);
  });

  test("batas minggu tiap baris sama dengan naskah bagian 4, dan label halaman M memuat minggu yang sama", () => {
    expect([...mingguM.keys()]).toEqual(Array.from({ length: 11 }, (_, i) => 29 + i));
    const baris1 = [29, 30, 31, 32, 33].map((n) => mingguM.get(n)!);
    const baris2 = [34, 35, 36, 37, 38, 39].map((n) => mingguM.get(n)!);
    expect(baris1).toEqual([3, 4, 5, 6, 7]);
    expect(baris2).toEqual([8, 8, 9, 10, 11, 12]);
    expect(diagram.baris[0]!.label).toBe(`Sampai minggu ${Math.max(...baris1)}`);
    expect(diagram.baris[1]!.label).toBe(`Minggu ${Math.min(...baris2)} sampai ${Math.max(...baris2)}`);
    for (const n of [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]) {
      const h = per(idM(n));
      expect(h.judul.startsWith(`M${n}:`)).toBe(true);
      if (h.ada) expect(fileHalaman(h.id).length).toBeGreaterThan(0);
      expect((cerita.halaman as unknown as { id: string; label?: string }[]).find((x) => x.id === h.id)?.label ?? `Masalah ${n} · minggu ${mingguM.get(n)}`).toBe(`Masalah ${n} · minggu ${mingguM.get(n)}`);
    }
    expect(diagram.catatan).toBe("Sebelas kalimat lahir dari PRD v4 dan M29 sampai M38, dan M33 melahirkan dua; satu kalimat lahir dari tim dan infra, dan satu dari M39.");
    expect(tabelNaskah5.filter((x) => /M(29|3\d)/.test(x.kejadian) && !/M39/.test(x.kejadian) && !/Tim/.test(x.kejadian))).toHaveLength(11);
    harus(blok("Mulai"), "<Rantai data={kejadian} ringkas />");
  });
});

// ================================================================================================================================
describe("angka di tiga belas kalimat dan batasnya: dari rekaman, registry, dan halaman asal", () => {
  test("kalimat 1: dua jurnal Rp200.000 dan saldo naik Rp400.000, handler ADR 34 menjawab 200 ganda dengan satu jurnal, byte mentah 109, dan 25 jam", () => {
    const A = bag(ganda, "A");
    const jurnal = semua(A, /^ (\d+) +\| karyawan +\| (\d+)$/);
    expect(jurnal.map((m) => m[2])).toEqual(["200000", "200000"]);
    const nominal = Number(jurnal[0]![2]);
    const total = jurnal.reduce((n, m) => n + Number(m[2]), 0);
    harus(butir(1).pertama, `Saldo Budi naik ${rp(total)} untuk ${rp(nominal)} yang dibayar`);
    const B = bag(ganda, "B");
    expect(ada(B, /^kiriman 2 \(event yang sama\): 200 ganda$/)).toBe(true);
    expect(semua(B, /^ evt-1 +\| settlement +\| diproses +\| t$/)).toHaveLength(1);
    harus(butir(1).pertama, "Handler ADR 34 menjawab `200 ganda` dan jurnalnya satu saat balasan hilang (`ganda.txt` bagian B).");
    // penyebab kiriman kedua (balasan 200 hilang) pada handler pertama adalah penalaran, bukan rekaman (halaman 4.6)
    harus(butir(1).pertama, "Penyebab kiriman kedua, balasan 200 yang hilang, adalah penalaran (Tidak dijalankan pada handler pertama).");
    harus(fileHalaman("t4-m29"), "adalah penalaran dari bagian A, bagian B, dan dokumentasi gateway (Tidak dijalankan)");
    harus(fileHalaman("t4-m29"), "Rekaman handler pertama tidak memutus balasan");
    expect(ada(A, /^hasil kiriman: 200 diproses, 200 diproses$/)).toBe(true);
    const TA = bag(tandatangan, "A");
    const bt = cocok(TA.join("\n"), /body (\d+) byte, (\d+) baris baru/);
    harus(butir(1).pertama, `Body ${bt[1]} byte cocok bila dibaca mentah, dan tidak cocok bila diurai lalu ditulis ulang (\`tandatangan.txt\` bagian A).`);
    expect(ada(TA, /^verifikasi atas byte mentah: cocok$/)).toBe(true);
    expect(ada(TA, /^verifikasi atas JSON yang diurai lalu ditulis ulang .*: tidak cocok$/)).toBe(true);
    // 25 jam: tanpa lapis status, event kedua diproses dan jurnalnya dua; key ledger hidup 24 jam
    const G = bag(urutan, "G").join("\n");
    cocok(G, /4\. tanpa lapis status, 25 jam kemudian \(key sudah habis\) +\| 25 jam +\| diproses +\| 2/);
    cocok(G, /umur 24 jam\)/);
    harus(butir(1).batas, "ditahan tiga lapis, yaitu `event_id`, status top-up yang hanya maju, dan Idempotency-Key ledger yang hidup 24 jam");
    harus(butir(1).batas, "Tanpa lapis status, event kedua yang datang 25 jam kemudian menghasilkan 2 jurnal (`urutan.txt` bagian G, kasus 4). Service pembayaran yang mati lalu menerima kiriman ulang");
    harus(butir(1).pertama, "Di [[t4-m29]], gateway mengirim kabar yang sama dua kali, dan handler pertama menjurnal tiap kiriman. Saldo Budi naik");
    const C = bag(prosesMati, "C");
    cocok(C.join("\n"), /Idempotency-Key ledger hidup 24 jam/);
    const sesudah25 = C.join("\n").slice(C.join("\n").indexOf("jam ledger digeser 25 jam"));
    cocok(sesudah25, /^ 2 +\| 1 +\| dibayar$/m);
    harus(butir(1).batas, "pada +25 jam juga menghasilkan 2 jurnal (`proses-mati.txt` bagian C, lab t4-modul), dan pencegahannya belum diputuskan. Jam lab diputar di kedua rekaman.");
    // jam diputar, bukan ditunggu: urutan.txt memakai -jam-lab dan proses-mati.txt memerankan jam ledger lewat /lab/jam
    harus(urutan, "jam service bisa diputar lewat /lab/jam");
    harus(prosesMati, "Jam ledger diperankan (POST /lab/jam)");
    harus(fileHalaman("t4-webhook"), "pencegahannya belum diputuskan");
    harus(fileHalaman("t4-prd"), "Kalau gateway mengirim kabar dua kali, terlambat, atau tidak mengirim sama sekali, siapa yang tahu?");
    harus(butir(1).pertama, "bertanya siapa yang tahu bila gateway mengirim kabar dua kali, terlambat, atau tidak sama sekali");
  });

  test("kalimat 2: enam kiriman 401 dan 0 baris event, jadwal habis 342 menit, cek status 29 lawan 31 menit, lima insiden", () => {
    const B = bag(retry, "B");
    expect(semua(B, /^ \d +\| \d+ +\| 401$/)).toHaveLength(6);
    const habis = cari(B, /^gateway berhenti: jadwal habis \((\d+) menit sesudah kiriman pertama/, "retry B habis")[1]!;
    expect(habis).toBe("342");
    const hitungEvent = B.join("\n").match(/AS webhook_event FROM webhook_event\n[^\n]*\n[^\n]*\n (\d+)\n/);
    expect(hitungEvent?.[1]).toBe("0");
    harus(butir(2).pertama, `Enam kiriman dijawab 401, dan tabel \`webhook_event\` tetap ${hitungEvent![1]} baris (\`retry.txt\` bagian B, lab t4-webhook).`);
    harus(butir(2).pertama, `Jadwal gateway tiruan habis ${habis} menit sesudah kiriman pertama, tanpa satu jurnal pun.`);
    expect(ada(B, /^ menunggu +\|?\s*$/)).toBe(true);
    const A = bag(rekon, "A");
    const cek = semua(A, /^cek top-up: diperiksa (\d+), dikredit (\d+)/);
    expect(cek.map((m) => [m[1], m[2]])).toEqual([["0", "0"], ["0", "0"], ["1", "1"]]);
    expect(ada(A, /interval '29 minutes'/) || A.some((b) => /29 menit/.test(b))).toBe(true);
    expect(ada(A, /interval '31 minutes'/) || A.some((b) => /31 menit/.test(b))).toBe(true);
    harus(butir(2).pertama, "Job cek status tidak memeriksa top-up berumur 29 menit, tetapi memeriksa dan mengkredit yang berumur 31 menit (`rekon.txt` bagian A).");
    const Br = bag(rekon, "B");
    const baru = cari(Br, /^rekon <tanggal>: (\d+) baris di laporan gateway; insiden baru: tidak_di_ledger (\d+), tidak_di_gateway (\d+), jumlah_beda (\d+)/, "rekon B");
    const lima = Number(baru[2]) + Number(baru[3]) + Number(baru[4]);
    expect(lima).toBe(5);
    const kor = cari(Br, /^koreksi rekon: diperiksa (\d+), dikoreksi lewat jurnal (\d+), selesai tanpa jurnal baru (\d+), tetap terbuka (\d+), galat 0/, "rekon B koreksi");
    expect([kor[1], kor[2], kor[3], kor[4]]).toEqual(["5", "3", "1", "1"]);
    harus(butir(2).pertama, "Rekonsiliasi harian menemukan lima insiden, dan job koreksi menutup tiga lewat jurnal dan satu tanpa jurnal baru, sedangkan satu tetap terbuka (bagian B).");
    // batas: 30 menit Asumsi, jadwal Ilustrasi, tiga dari lima batas menunggu pemilik, insiden manusia tanpa jalur penutupan
    harus(fileHalaman("t4-rekonsiliasi"), "30 menit adalah Asumsi");
    harus(fileHalaman("t4-rekonsiliasi"), "Tiga di antaranya menunggu keputusan pemilik");
    harus(fileHalaman("t4-rekonsiliasi"), "Insiden yang menunggu keputusan manusia belum punya jalur penutupan di lab.");
    harus(fileHalaman("t4-webhook"), "Ilustrasi yang mengikuti dokumentasi satu gateway nyata, dengan waktu yang diperankan");
    harus(butir(2).batas, "batas 30 menit adalah Asumsi, dan jadwal 342 menit adalah Ilustrasi yang mengikuti dokumentasi satu gateway, dengan waktu yang diperankan.");
    harus(butir(2).batas, "Tiga dari lima batas di kode lab menunggu keputusan pemilik, dan insiden yang menunggu keputusan manusia belum punya jalur penutupan di lab.");
  });

  test("kalimat 3: 50 permintaan, sepuluh mati dan gagal, 0 diklaim sesudah pulih; breaker 6 permintaan, 9 lulus, 1 mati karena ambang lebih tinggi dari lima percobaan", () => {
    const A = bag(lajur, "A");
    const permintaanA = cari(A, /^# vendor mati: (\d+) permintaan masuk, 0 objek dibuat/, "lajur A")[1]!;
    expect(permintaanA).toBe("50");
    expect(ada(A, /^ mati +\| 5 +\| 10$/)).toBe(true);
    expect(ada(A, /^ gagal +\| 10$/)).toBe(true);
    expect(ada(A, /^worker: diklaim 0, /)).toBe(true);
    harus(butir(3).pertama, `vendor menerima ${permintaanA} permintaan, sepuluh pekerjaan mati, dan sepuluh pengajuan \`gagal\`. Sesudah layanan pulih, worker mengklaim 0 pekerjaan (\`lajur.txt\` bagian A, lab t4-integrasi).`);
    const B = bag(lajur, "B");
    const permintaanB = cari(B, /^# vendor mati, breaker terbuka: (\d+) permintaan masuk, 0 objek dibuat/, "lajur B")[1]!;
    expect(permintaanB).toBe("6");
    const akhirB = B.join("\n").slice(B.join("\n").lastIndexOf("# Vendor pulih"));
    cocok(akhirB, /^ lulus +\| 9$/m);
    cocok(akhirB, /^ gagal +\| 1$/m);
    harus(butir(3).pertama, `Dengan breaker per lajur, vendor yang mati menerima ${permintaanB} permintaan, dan 9 dari 10 pendaftar lulus sesudah vendor pulih (bagian B).`);
    expect(ada(B, /^# 9 dari 10 pendaftar lulus\. Yang pertama sudah dead-letter sebelum breaker terbuka: ambang bawaan \(lebih dari 5 gagal berturut-turut\) lebih tinggi daripada batas percobaan satu pekerjaan \(5\)\./)).toBe(true);
    harus(butir(3).batas, "satu pekerjaan tetap mati, karena ambang breaker bawaan, lebih dari 5 gagal berturut-turut, lebih tinggi daripada batas lima percobaan satu pekerjaan (bagian B).");
    harus(fileHalaman("t4-breaker"), "tidak dipasangi breaker di lab");
    harus(fileHalaman("t4-breaker"), "widget hanya mensimulasikannya");
    harus(butir(3).batas, "Jalur sinkron tidak dipasangi breaker di lab, dan hanya widget di halaman itu yang menghitungnya.");
  });

  test("kalimat 4: tiga langkah CI hijau lalu 42703, dengan batas 42P01 dan impor internal ditolak, monolith 17 tabel, dan ADR 17 tidak menghentikan", () => {
    const A = bag(batasModul, "A").join("\n");
    for (const langkah of ["$ go build ./...", "$ go vet ./internal/modul/...", "$ go test -count=1 -run TestTeksTopupLangsungDenganDataTiruanLolos"]) harus(A, langkah);
    cocok(A, /column "nama" does not exist \(42703\)/);
    cocok(A, /Ketiga langkah CI tidak membuka koneksi database/);
    harus(butir(4).pertama, "Tiga langkah CI tim Pembayaran tetap hijau, tetapi top-up gagal dengan `column \"nama\" does not exist` (`batas.txt` bagian A, lab t4-modul).");
    const B = bag(batasModul, "B").join("\n");
    cocok(B, /pembayaran menjalankan SQL M32 apa adanya \(SELECT nama FROM akun\): relation "akun" does not exist \(42P01\)/);
    cocok(B, /use of internal package lab\/apit4\/internal\/modul\/akun\/internal\/data not allowed/);
    harus(butir(4).pertama, "SQL lama pembayaran ditolak `relation \"akun\" does not exist`, dan `go build` menolak impor `internal/data` milik akun (bagian B).");
    const monolit = cari(B.split("\n"), /^role t4m_monolit: (\d+) tabel lima modul terbaca/, "monolit")[1]!;
    expect(monolit).toBe("17");
    harus(butir(4).batas, `Proses monolith memakai satu role yang membaca ${monolit} tabel dari lima modul, dan kode ledger lama belum dipindah.`);
    harus(fileHalaman("t4-modul"), "`t4m_monolit`");
    harus(fileHalaman("t4-modul"), "membaca 17 tabel dari lima modul");
    harus(fileHalaman("t4-modul"), "bukan mesin");
    harus(fileHalaman("t4-m32"), "ADR 17 sudah tertulis dan tidak menghentikan migration itu");
    harus(fileHalaman("t4-m32"), "Ilustrasi mekanisme");
    harus(butir(4).pertama, "Aturan ADR 17 sudah tertulis dan tidak menghentikan migration itu.");
    harus(butir(4).batas, "kode pembayaran di bagian A ditulis lab mengikuti uraian M32 (Ilustrasi), sedangkan schema, role, dan pesan galat adalah PostgreSQL yang dijalankan.");
    expect(fileHalaman("t4-modul")).toMatch(/Kode ledger lama .{0,40}belum dipindah/);
  });

  test("kalimat 5: 16 file 8.000.000 byte, rasio 1,1 pada 2, 4, dan 8 pengajuan, di bawah 0,01 di penyimpanan objek; isi karangan 500.000 byte", () => {
    const A = bag(ukuran, "A");
    expect(ada(A, /^ 16 +\| 8000000$/)).toBe(true);
    const rasio = semua(A, /^(\d+) pengajuan \((\d[\d.]*) byte file\): rasio dump\/file = (\d,\d)$/);
    expect(rasio.map((m) => [m[1], m[3]])).toEqual([["2", "1,1"], ["4", "1,1"], ["8", "1,1"]]);
    harus(butir(5).pertama, `Delapan pengajuan menghasilkan 16 file sebesar 8.000.000 byte. Dump terkompresi membawa ${rasio[0]![3]} kali ukuran file pada 2, 4, dan 8 pengajuan (\`ukuran.txt\` bagian A, lab t4-storage).`);
    const C = bag(ukuran, "C");
    expect(semua(C, /rasio dump\/file di bawah 0,01: ya$/)).toHaveLength(3);
    harus(butir(5).pertama, "Dengan file di penyimpanan objek, dump di bawah 0,01 kali ukuran file (bagian C).");
    harus(fileHalaman("t4-m33"), "500.000 byte");
    harus(fileHalaman("t4-m33"), "pencadangan penyimpanan objek Tidak dijalankan di lab");
    harus(fileHalaman("t4-m33"), "file perlu cadangan sendiri");
    harus(butir(5).batas, "isi file di lab adalah karangan 500.000 byte (Ilustrasi), jadi rasio foto nyata dan waktu dump atau pulih tidak diukur.");
    harus(butir(5).batas, "file perlu cadangan sendiri, dan pencadangan penyimpanan objek Tidak dijalankan.");
    harus(fileHalaman("t4-m33"), "Isi file");
  });

  test("kalimat 6: PUT 120.000 lalu 90.000 byte keduanya 200 dan isi akhir 90.000, 403 sesudah umur 5 detik, unduh ditimpa 500", () => {
    const B = bag(presign, "B");
    const put1 = cari(B, /^PUT pertama dari app Dina, ([\d.]+) byte: HTTP (\d+)$/, "presign B put1");
    const put2 = cari(B, /^PUT kedua dari pemegang lain \(proses lain, isi lain, ([\d.]+) byte\): HTTP (\d+)$/, "presign B put2");
    const isi = cari(B, /^isi objek sekarang: ([\d.]+) byte, milik pemegang lain: ya$/, "presign B isi");
    expect([put1[2], put2[2]]).toEqual(["200", "200"]);
    expect(isi[1]).toBe(put2[1]);
    harus(butir(6).pertama, `Di rekaman, dua pemegang URL yang sama mengirim file ${put1[1]} byte dan ${put2[1]} byte. Keduanya dijawab ${put1[2]}, dan isi akhirnya ${isi[1]} byte milik pemegang kedua (\`presign.txt\` bagian B, lab t4-storage).`);
    const C = bag(presign, "C");
    const umur = cari(C, /\((\d+) detik\)/, "presign C umur")[1]!;
    expect(umur).toBe("5");
    expect(ada(C, /^PUT sesudah umur lewat: HTTP 403 AccessDenied$/)).toBe(true);
    expect(ada(C, /^objek tidak berubah oleh PUT yang ditolak: ya$/)).toBe(true);
    harus(butir(6).pertama, "Sesudah umur URL lewat, PUT dijawab 403 dan objek tidak berubah (bagian C).");
    harus(butir(6).batas, `Umur URL di lab ${umur} detik, dan ADR 38 memakai 5 menit (Asumsi).`);
    const D = bag(unduh, "D");
    expect(ada(D, /^unduh kartu sesudah ditimpa: HTTP 500$/)).toBe(true);
    expect(ada(D, /^baris audit bertambah satu: 1 jadi 2$/)).toBe(true);
    harus(butir(6).batas, "checksum tidak cocok dan jawabannya 500 (`unduh.txt` bagian D).");
    const UC = bag(unduh, "C");
    expect(ada(UC, /^pemegang pertama: HTTP 200, 500\.000 byte$/)).toBe(true);
    expect(ada(UC, /^pemegang kedua \(dikirim ulang oleh orang lain\): HTTP 200, 500\.000 byte$/)).toBe(true);
    expect(ada(UC, /^baris audit buka_berkas sesudah dua unduhan lewat URL: 1 \(tetap\)/)).toBe(true);
    harus(butir(6).batas, "Unduh tidak lewat URL, karena URL unduh buatan lab dibuka dua pemegang dengan 200 dan tanpa baris audit baru (bagian C).");
    harus(fileHalaman("t4-storage"), "5 menit (Asumsi)");
    harus(fileHalaman("t4-storage"), "rekaman memakai umur 5 detik supaya habisnya bisa ditunggu");
  });

  test("kalimat 7: 15 penolakan dari 3 × 5, tiga pengajuan gagal, proxy membuat tiga lulus, state memuat nilai kecuali konfigurasi hanya alamat", () => {
    const A = bag(alamatInfra, "A");
    expect(ada(A, /ditolak 403, per alamat sumber: \{'host baru': 15\}/)).toBe(true);
    expect(ada(A, /\(3 pekerjaan x 5 percobaan = 15 penolakan\)/)).toBe(true);
    expect(ada(A, /^ gagal +\| belum +\| 3$/)).toBe(true);
    harus(butir(7).pertama, "tiga pengajuan sesudah pindah hosting dijawab 403 lima kali tiap pekerjaan, yaitu 15 penolakan. Tiga pengajuan itu `gagal` walau vendor sehat (`alamat.txt` bagian A, lab t4-infra).");
    const B = bag(alamatInfra, "B");
    expect(semua(B, /^ lulus +\| terverifikasi +\| 3$/).length).toBeGreaterThanOrEqual(2);
    expect(ada(B, /ditolak 403, per alamat sumber: \(tidak ada\)/)).toBe(true);
    harus(butir(7).pertama, "Dengan proxy keluar yang didaftarkan sekali, tiga pengajuan sesudah pindahan lulus tanpa penolakan (bagian B).");
    const SA = bag(stateInfra, "A");
    expect(ada(SA, /^keluaran CLI memuat password atau kunci: tidak \(diganti "\(sensitive value\)"\)$/)).toBe(true);
    expect(ada(SA, /^state memuat nilai password dari random_password: ya$/)).toBe(true);
    expect(ada(SA, /^state memuat nilai kunci dari variabel TF_VAR_kunci_gateway: ya$/)).toBe(true);
    expect(ada(bag(stateInfra, "B"), /^state memuat nilai rahasia webhook: tidak$/)).toBe(true);
    harus(butir(7).pertama, "State OpenTofu memuat nilai password dan kunci yang dipakai satu resource, walau CLI menulis `(sensitive value)`. Bila konfigurasi hanya menulis alamat dan path OpenBao, state tidak memuat nilai rahasia (`state.txt` bagian A dan B).");
    const sb = bag(staging, "B");
    expect(semua(sb, /^(staging|penerbit)\.env:\d+: kunci produksi \(/).map((m) => m[0])).toEqual(["staging.env:2: kunci produksi (", "penerbit.env:1: kunci produksi (", "staging.env:2: kunci produksi ("]);
    expect(ada(sb, /^# exit status 1$/)).toBe(true);
    harus(butir(7).batas, "staging yang memakai kunci produksi tidak direkam, hanya pemindai atas dua file contoh (`staging.txt` bagian B).");
    expect(ada(sb, /\(Ilustrasi: naskah menulis staging memakai kunci gateway produksi\)/)).toBe(true);
    harus(fileHalaman("t4-infra-secret"), "mode dev");
    harus(fileHalaman("t4-m34"), "titik gagal tunggal baru");
    harus(fileHalaman("t4-m34"), "Hosting terkelola, akun cloud PT, dan alamat IP publik nyata Tidak dijalankan.");
  });

  test("kalimat 8: 201 dengan saldo Toko Sumber Rejeki 0, CRC B29D jadi 4D5E, nama server lawan payload, 8.562 dari 8.562 dan 104 dari 104", () => {
    const B = bag(statis, "B").join("\n");
    cocok(B, /HTTP\/1\.1 201 Created/);
    cocok(B, /"nominal":35000,"merchant":"Toko Andalan"/);
    cocok(B, /Toko Sumber Rejeki \| 0\n Toko Andalan +\| 35000/);
    harus(butir(8).pertama, "Budi membayar Rp35.000 ke stiker Toko Andalan, merchant sah. Server menjawab 201 dengan jurnal seimbang, sedangkan saldo Toko Sumber Rejeki tetap 0 (`statis.txt` bagian B, lab t4-qr).");
    const C = bag(statis, "C");
    expect(ada(C, /nama di payload 'Toko Sumber Rejeki'; kota di payload 'Jakarta'/)).toBe(true);
    expect(ada(C, /server: GET \/qr\/\{id\} -> 200; nama 'Toko Andalan'/)).toBe(true);
    expect(ada(C, /^nama dan kota di payload sama dengan jawaban server: tidak$/)).toBe(true);
    harus(butir(8).pertama, "Payload Bu Marni dengan id Toko Andalan membawa nama Toko Sumber Rejeki, tetapi server menjawab nama Toko Andalan (`statis.txt` bagian C).");
    const D = bag(crc, "D");
    const ganti = cari(D, /^selisih: id QR berubah; CRC berubah dari (\w+) menjadi (\w+)$/, "crc D");
    harus(butir(8).pertama, `Di rekaman lain, id QR di payload, yaitu isi teks stiker, diganti. CRC, angka pemeriksa di ujung payload, dihitung ulang tanpa key dari \`${ganti[1]}\` menjadi \`${ganti[2]}\`, lalu pemindai lab menerimanya (\`crc.txt\` bagian D).`);
    expect(ada(D, /^teks diganti lalu CRC dihitung ulang dengan binascii\.crc_hqx \(tanpa alat lab\): lolos/)).toBe(true);
    expect(ada(D, /"nama":"Toko Sumber Rejeki"/)).toBe(true);
    const Cc = bag(crc, "C");
    const satu = cari(Cc, /^salah baca satu karakter pada payload contoh statis milik tes \((\d+) karakter\): (\d+) dari (\d+) terdeteksi/, "crc C satu");
    const dua = cari(Cc, /^dua karakter bersebelahan bertukar tempat pada payload contoh yang sama: (\d+) dari (\d+) terdeteksi/, "crc C dua");
    expect(satu[2]).toBe(satu[3]);
    expect(dua[1]).toBe(dua[2]);
    expect(Number(satu[1]) * 62 + 6).toBe(Number(satu[2]));
    harus(butir(8).batas, `terekam untuk satu payload contoh ${satu[1]} karakter dan dua jenis kesalahan (\`crc.txt\` bagian C). Satu karakter berubah: ${titik(Number(satu[2]))} dari ${titik(Number(satu[3]))} terdeteksi. Dua karakter bersebelahan bertukar: ${dua[1]} dari ${dua[2]}. Itu bukan jaminan untuk payload lain.`);
    harus(fileHalaman("t4-m35"), "Itu hasil untuk satu payload dan dua jenis kesalahan, bukan jaminan untuk payload lain atau kesalahan lain.");
    harus(fileHalaman("t4-qr"), "tidak terukur (Asumsi)");
    harus(fileHalaman("t4-qr"), "Layar konfirmasi Tidak dijalankan");
    harus(fileHalaman("t4-m35"), "PDF EMVCo");
    harus(butir(8).batas, "dan PDF EMVCo-nya [perlu verifikasi].");
  });

  test("kalimat 9: 32 dari 32 alamat ditolak, 29 lolos bila hanya IsPrivate (3 ditandai), tujuh kode redirect dengan tujuan disentuh 0 kali", () => {
    const baris = alamatSsrf.split("\n");
    const tabel = baris.slice(baris.findIndex((b) => b.startsWith("alamat ")) + 1, baris.findIndex((b) => b.startsWith("ditolak fetcher aman:")));
    const tolak = tabel.map((b) => b.match(/^(\S+)\s+(ya|tidak)\s+(ya|tidak)\s+(ya|tidak)\s+(ya|tidak)\s+(tolak|lolos)\s/)).filter((m): m is RegExpMatchArray => m !== null);
    const terlarang = tolak.filter((m) => m[6] === "tolak");
    expect(terlarang).toHaveLength(32);
    const privat = terlarang.filter((m) => m[2] === "ya").length;
    expect(privat).toBe(3);
    const ringkas = cari(baris, /^ditolak fetcher aman: (\d+) dari (\d+) alamat terlarang; dari itu (\d+) lolos bila IsPrivate satu-satunya pemeriksaan$/, "ssrf ringkas");
    expect(Number(ringkas[2]) - privat).toBe(Number(ringkas[3]));
    expect(ringkas[1]).toBe(ringkas[2]);
    harus(butir(9).pertama, `Pemeriksaan alamat versi aman menolak ${ringkas[1]} dari ${ringkas[2]} alamat terlarang, dan ${ringkas[3]} lolos bila \`IsPrivate\`, metode bawaan Go, satu-satunya pemeriksaan (\`alamat.txt\`, lab t4-ssrf).`);
    const redirect = semua(batasSsrf.split("\n"), /^redirect (\d{3}) ke server lain: ditolak \(tujuan tidak diizinkan\); server pertama disentuh: 1, server tujuan redirect disentuh: 0$/);
    expect(redirect.map((m) => m[1])).toEqual(["300", "301", "302", "303", "304", "307", "308"]);
    harus(butir(9).pertama, "Ketujuh kode redirect 3xx ditolak, dan server tujuan redirect disentuh 0 kali (`batas.txt`).");
    expect(/Rentan|rentan/.test(alamatSsrf + batasSsrf)).toBe(false);
    expect(ada(testingApi.split("\n"), /--- PASS: TestRentanPesanGalatMembocorkanIsiLayananDalam/)).toBe(true);
    expect(ada(testingApi.split("\n"), /--- PASS: TestRentanMengikutiRedirectKeAlamatDalam/)).toBe(true);
    harus(fileHalaman("t4-m36"), "lingkup lab dipersempit ke verifikasi sisi pembela");
    harus(fileHalaman("t4-m36"), "tanpa rekaman tingkat endpoint");
    harus(fileHalaman("t4-ssrf"), "metadata cloud");
    harus(butir(9).batas, "lab t4-ssrf hanya menjalankan sisi pembela, yaitu versi aman. Versi pertama fetcher hanya dibaca dari kode dan dua tes unit api-t4 tanpa rekaman tingkat endpoint (Tidak dijalankan).");
  });

  test("kalimat 10: tiga otorisasi Rp80.000 disetujui untuk saldo Rp100.000, hold menolak yang kedua, rute pembatal hanya dari penerbit, kill switch di memori satu proses", () => {
    const A = bag(otorisasi, "A");
    const setuju = semua(A, /^(AUTH-[A-C]) Rp80\.000: setuju \(sumber: rekeningo\)$/);
    expect(setuju.map((m) => m[1])).toEqual(["AUTH-A", "AUTH-B", "AUTH-C"]);
    const jumlah = cari(A, /^ 3 +\| (\d+)$/, "otorisasi A jumlah")[1]!;
    expect(jumlah).toBe("240000");
    const B = bag(otorisasi, "B").join("\n");
    cocok(B, /Disetujui kepada toko Rp240\.000; saldo Budi Rp100\.000/);
    expect(semua(A, /^ AUTH-[AB] +\| ditahan +\| 80000 +\| f$/)).toHaveLength(2);
    harus(butir(10).pertama, "tanpa dana tertahan, dua otorisasi Rp80.000 untuk saldo Rp100.000 sama-sama disetujui, dan saldo masih Rp100.000 sesudahnya. Otorisasi ketiga juga disetujui, jadi Rp240.000 disetujui untuk saldo Rp100.000 (`otorisasi.txt` bagian A, lab t4-kartu).");
    const C = bag(otorisasi, "C");
    expect(ada(C, /^AUTH-A Rp80\.000: setuju \(sumber: rekeningo\)$/)).toBe(true);
    expect(ada(C, /^AUTH-B Rp80\.000: tolak \(sumber: rekeningo, alasan: saldo-kurang\)$/)).toBe(true);
    expect(ada(C, /^ pemakai +\| 20000$/)).toBe(true);
    expect(ada(C, /^ dana_tertahan +\| 80000$/)).toBe(true);
    harus(butir(10).pertama, "Dengan dana tertahan (hold), otorisasi pertama menahan Rp80.000, dan yang kedua membaca saldo Rp20.000 lalu ditolak karena saldo kurang (bagian C).");
    // rute: hanya satu rute yang membatalkan otorisasi, dan dibungkus dariPenerbit
    const handler = baca("labs/api-t4/internal/handler/handler_kartu.go");
    const rute = handler.split("\n").filter((b) => /mux\.HandleFunc\(/.test(b));
    expect(rute.filter((b) => /reversal/.test(b))).toHaveLength(1);
    expect(rute.filter((b) => /reversal/.test(b))[0]).toContain("s.dariPenerbit(");
    expect(rute.filter((b) => /s\.wajibLogin\(/.test(b)).map((b) => b.match(/"(POST|GET) ([^"]+)"/)![2])).toEqual(["/kartu", "/kartu", "/kartu/{id}/bekukan", "/kartu/{id}/buka"]);
    harus(fileHalaman("t4-m37"), "Satu-satunya rute yang membatalkan otorisasi, `POST /penerbit/reversal`, dipanggil penerbit (Tidak dijalankan: dibaca dari file itu).");
    harus(butir(10).batas, "dasar kalimatnya adalah pembacaan kode rute (Tidak dijalankan): satu-satunya rute yang membatalkan otorisasi dipanggil penerbit.");
    harus(fileHalaman("t4-kartu"), "Hold menutup M37, tetapi delapan hal lain tetap terbuka:");
    harus(butir(10).batas, "Hold menutup M37, tetapi delapan hal lain tetap terbuka.");
    expect(fileHalaman("t4-kartu").match(/^\d\. \*\*/gm)?.length ?? 8).toBeGreaterThanOrEqual(0);
    // kill switch: penanda di memori satu proses, kembali aktif sesudah mulai ulang
    const KB = bag(killSwitch, "B").join("\n");
    cocok(KB, /^AUTH-K3 Rp20\.000: setuju \(sumber: rekeningo\)$/m);
    cocok(KB, /flag ada di satu proses/);
    expect(baca("labs/api-t4/cmd/api/main.go") + baca("labs/api-t4/internal/handler/handler_kartu.go") + baca("labs/api-t4/internal/handler/handler.go")).toMatch(/KartuAktif/);
    harus(butir(10).batas, "Penanda itu hidup di memori satu proses, dan kembali aktif sesudah proses dimulai ulang (`kill-switch.txt` bagian B).");
  });

  test("kalimat 11: nol baris untuk Dina dan Eko, log biasa lima baris dengan pelaku berganti, rantai 7 baris utuh, jangkar menolak ekor yang dipotong", () => {
    const A = bag(rantaiAudit, "A");
    expect(semua(A, /^ baris_audit$/)).toHaveLength(1);
    expect(semua(A, /^ 0$/)).toHaveLength(1);
    expect(semua(A, /^\(0 rows\)$/)).toHaveLength(2);
    expect(ada(A, /^# Jawaban untuk Dina, yang akunnya disentuh enam aksi, dan untuk Eko, yang tidak pernah disentuh, sama: nol baris\./)).toBe(true);
    harus(butir(11).pertama, "Ratih menjalankan enam aksi atas data Dina. Tabel `audit_log` menjawab 0 baris untuk Dina, dan 0 baris untuk Eko yang tidak pernah dibuka (`rantai.txt` bagian A, lab t4-audit).");
    const B = bag(rantaiAudit, "B").join("\n");
    cocok(B, /baris \| nomor_terbesar \| nomor_bolong\n[^\n]*\n 5 +\| 6 +\| 1/);
    cocok(B, /petugas 421/);
    harus(butir(11).pertama, "satu UPDATE dan satu DELETE oleh role aplikasi menyisakan 5 baris dengan pelaku baris 3 berganti (bagian B).");
    const C = bag(rantaiAudit, "C").join("\n");
    cocok(C, /verifikasi rantai: 7 baris, utuh: ya/);
    harus(butir(11).batas, "Rantai tanpa kunci rahasia mendeteksi perubahan, bukan penulis, dan baris ke-7 dengan hash hitungan sendiri lolos (`rantai.txt` bagian C).");
    harus(butir(11).pertama, "Di log biasa, satu UPDATE dan satu DELETE oleh role aplikasi menyisakan 5 baris");
    harus(butir(11).pertama, "ADR 43 memakai rantai hash, dan jangkar, yaitu catatan hash baris terakhir di luar database, menangkap ekor yang dipotong.");
    const J = bag(jangkar, "B").join("\n");
    cocok(J, /baris=4 rantai=utuh jangkar_lama=0 temuan=0\njangkar baru: nomor 4\n# exit status 0/);
    cocok(J, /baris=4 rantai=utuh jangkar_lama=2 temuan=1\njangkar nomor 6: baris-hilang\n# exit status 2/);
    harus(butir(11).pertama, "jangkar, yaitu catatan hash baris terakhir di luar database, menangkap ekor yang dipotong. Tanpa jangkar, rantai utuh dengan 4 baris. Dengan jangkar, jangkar nomor 6 dijawab baris-hilang (`jangkar.txt` bagian B).");
    harus(fileHalaman("t4-audit"), "Ukuran 100% dari PRD juga belum terpenuhi: percobaan yang ditolak dan akses lewat role pemilik schema tidak meninggalkan baris.");
    harus(fileHalaman("t4-m38"), "Jawaban \"tidak ada\" di sini sama nilainya dengan \"tidak tahu\"");
    harus(butir(11).batas, "Ukuran 100% dari PRD v4 juga belum terpenuhi, karena percobaan yang ditolak dan akses lewat role pemilik schema tidak meninggalkan baris.");
  });

  test("kalimat 12: 3 error exit code 1, tag dipindah lulus dengan digest D lawan C, 10 kerentanan dipanggil, 15 temuan dua Critical, tanpa berkas workflow", () => {
    const k = kontrakApi.split("\n");
    const error = cari(k, /^(\d+) changes: (\d+) error, (\d+) warning, (\d+) info$/, "kontrak");
    expect([error[1], error[2]]).toEqual(["3", "3"]);
    expect(ada(k, /^\(exit code 1\)$/)).toBe(true);
    harus(butir(12).pertama, `Di [[t4-tim-infra]], oasdiff membandingkan contract OpenAPI api-t3 dan api-t4, lalu melapor ${error[2]} error dengan exit code 1 (\`kontrak.txt\`, lab api-t4).`);
    const C = bag(tandaTanganPipeline, "C");
    expect(ada(C, /^tanda tangan memuat digest <digest D>$/)).toBe(true);
    expect(ada(C, /^gerbang image \(dibangun <digest C>\): GAGAL \(digest di referensi bukan digest yang dibangun CI\)$/)).toBe(true);
    expect(ada(C, /^Error: no signatures found$/)).toBe(true);
    harus(butir(12).pertama, "Digest adalah sidik jari isi image, sedangkan tag hanya nama yang bisa dipindah. Bila tag dipindah ke image lain sebelum ditandatangani, `cosign verify` atas tag lulus dengan digest D, padahal build CI menghasilkan digest C. Hanya perbandingan dengan digest hasil build CI yang menolaknya (`tanda-tangan.txt` bagian C, lab t4-pipeline).");
    const E = bag(sast, "E");
    const dipanggil = cari(E, /^dipanggil kode: (\d+)$/, "sast E")[1]!;
    expect(semua(E, /^ {2}GO-\d{4}-\d{4} stdlib v1\.27\.1, diperbaiki di v1\.27\.\d$/)).toHaveLength(Number(dipanggil));
    harus(butir(12).pertama, `Alat govulncheck atas kodenya menemukan ${dipanggil} kerentanan stdlib yang dipanggil (\`sast.txt\` bagian E).`);
    const Cs = bag(sbom, "C");
    const grype = semua(Cs, /^ {2}GO-\d{4}-\d{4} +(Unknown|Critical|High|Medium) +(stdlib go1\.27\.1|golang\.org\/x\/crypto v0\.57\.0)/);
    expect(grype).toHaveLength(15);
    expect(grype.filter((m) => m[1] === "Critical")).toHaveLength(2);
    harus(butir(12).pertama, `Alat grype atas image-nya menemukan ${grype.length} temuan, dua di antaranya Critical (\`sbom.txt\` bagian C).`);
    expect(ada(Cs, /^gerbang SBOM dan grype atas image api-t4 \(ambang High\): GAGAL/)).toBe(true);
    harus(butir(12).pertama, "Dengan Go 1.27.1, api-t4 sendiri gagal gerbang. Alat govulncheck atas kodenya menemukan");
    harus(butir(12).pertama, "Alat grype atas image-nya menemukan");
    // govulncheck berjalan atas kode di labs/api-t4 (./...), grype atas SBOM image dari registry lab
    harus(rk("t4-pipeline", "sast.txt"), "$ govulncheck -format json -db <salinan vuln.go.dev> ./...   # di labs/api-t4");
    harus(rk("t4-pipeline", "sbom.txt"), "$ syft registry:127.0.0.1:18295/api-t4@<digest A> -o cyclonedx-json");
    harus(fileHalaman("t4-tim-infra"), "Lab tidak menaikkan Go");
    harus(fileHalaman("t4-tim-infra"), "Kunci cosign lab dibuat per run");
    harus(fileHalaman("t4-tim-infra"), "Belum diputuskan.");
    harus(fileHalaman("t4-tim-infra"), "CI sungguhan Tidak dijalankan.");
    harus(butir(12).batas, "Lab tidak menaikkan Go, dan aturan untuk kode di luar `internal/modul/` belum diputuskan.");
    harus(butir(12).batas, "Pipeline GitHub Actions, deploy blue/green, dan keyless Tidak dijalankan: lab menjalankan alat dan gerbangnya, bukan CI.");
    // klaim negatif berlingkup: lab t4-pipeline dan api-t4 tidak membawa berkas workflow GitHub Actions
    const berkasLab = [...(terlacak ?? new Set<string>())].filter((b) => /^labs\/(t4-pipeline|api-t4)\//.test(b));
    expect(berkasLab.length).toBeGreaterThan(20);
    expect(berkasLab.filter((b) => /(^|\/)\.github\/|workflow/i.test(b))).toEqual([]);
  });

  test("kalimat 13: puncak 138,9 naik 8 kali dari 17,4, worker 56% dari 6,5%, koneksi 40 dari 100, 2.778 dari 2.778, dan 125 menit, dihitung dari registry", () => {
    expect(PUNCAK3).toBe("17,4");
    expect(PUNCAK4).toBe("138,9");
    expect(Math.round(NAIK)).toBe(8);
    expect(koma(NAIK, 2)).toBe("7,98");
    expect(koma(uangDari(a4), 2)).toBe("6,94");
    expect(koma(notif, 2)).toBe("7,52");
    expect(WORKER4).toBe("56%");
    expect(WORKER3).toBe("6,5%");
    expect(KONEKSI).toBe(40);
    harus(butir(13).pertama, `Puncak ${PUNCAK4} request per detik naik 8 kali dari ${PUNCAK3} (Hitungan atas Asumsi: ${PUNCAK4} ÷ ${PUNCAK3} = ${koma(NAIK, 2)}).`);
    harus(butir(13).pertama, `Worker notifikasi terpakai ${WORKER4}, naik dari ${WORKER3}, dan koneksi database ${KONEKSI} dari 100 (Hitungan atas Asumsi).`);
    harus(butir(13).pertama, "uji coba publik lolos dengan 100.000 user terdaftar (target, Asumsi), lalu Sinta datang dengan PRD v5 (Ilustrasi).");
    expect(a4.user).toBe(100000);
    const A = bag(beban, "A");
    const jadwal = cari(A, /^permintaan dijadwalkan: (\d+) /, "beban A")[1]!;
    const selesai = cari(A, /^permintaan selesai: (\d+) dari (\d+)$/, "beban A selesai");
    expect([jadwal, selesai[1], selesai[2]]).toEqual(["2778", "2778", "2778"]);
    expect(Math.floor(Number(PUNCAK4.replace(",", ".")) * 20)).toBe(2778);
    expect(ada(A, /^p95 di bawah 500 ms \(batas lab, Asumsi; nilai ukur tidak direkam\): ya$/)).toBe(true);
    harus(butir(13).pertama, `Satu rekaman beban di satu laptop menyelesaikan ${titik(Number(selesai[1]))} dari ${titik(Number(selesai[2]))} permintaan tanpa error. Hasilnya p95, yaitu waktu jawab yang dilewati 5% permintaan paling lambat, di bawah batas lab 500 ms (\`beban.txt\` bagian A, lab api-t4).`);
    const B = bag(beban, "B").join("\n");
    cocok(B, /100000 \/ \(4 \/ 0,3\) = |hitungan: 100000 \/ \(4 \/ 0,3\) = 7500 detik|hitungan: 100000 \/ \(4 \/ 0,3\)/);
    expect(Math.round((100000 * 0.3) / 4 / 60)).toBe(125);
    harus(butir(13).batas, "Pengumuman ke 100.000 HP butuh paling sedikit 125 menit (Hitungan, Tidak dijalankan).");
    harus(fileHalaman("t4-m39"), "125 menit adalah batas bawah karena worker juga mengirim notifikasi uang");
    harus(butir(13).batas, "rekaman beban memeriksa batas lab, yaitu status 200 atau 201 dan p95 di bawah 500 ms. Itu bukan kapasitas produksi, karena memakai satu proses, satu laptop, dan 20 detik. Kapasitas satu server belum diukur.");
    expect(ada(A, /^status: 200 x\d+, 201 x\d+/)).toBe(true);
    harus(fileHalaman("t4-m39"), "p95, yaitu waktu jawab yang dilewati 5% request paling lambat");
    harus(butir(13).batas, "Tiga hal yang diminta PRD v5 belum pernah diuji. Laporan merchant akan berbagi database dengan transaksi, notifikasi massal berbagi satu worker, dan 13 orang menjadi 20 sampai 40 di satu repo (Asumsi).");
    harus(fileHalaman("t4-prd"), "13 engineer");
    expect(a4.tim).toBe("13 developer, 3 tim");
    // 4.27 sampai 4.29: hanya diperiksa terhadap isi halaman bila halamannya sudah di main
    jikaAda("t4-m39", (t) => {
      for (const f of ["138,9", "56%", "2.778 dari 2.778", "125 menit", "bukan jumlah request per detik"]) harus(t, f);
    });
    jikaAda("t4-estimasi", (t) => harus(t, "Kapasitas satu server belum terukur."));
  });
});

// ================================================================================================================================
describe("kartu tebak lalu buka t4-rekap-kartu.json", () => {
  const halamanKartu = ["t4-m29", "t4-m30", "t4-m31", "t4-m32", "t4-m33", "t4-m33", "t4-m34", "t4-m35", "t4-m36", "t4-m37", "t4-m38", "t4-tim-infra", "t4-m39"];
  test("tiga belas kartu berurutan dengan id unik, halaman ada di registry, judul dan url dari registry", () => {
    expect(kartu).toHaveLength(13);
    expect(kartu.map((c) => c.id)).toEqual(Array.from({ length: 13 }, (_, i) => `t4-rekap-k${i + 1}`));
    kartu.forEach((c, i) => {
      expect(c.halaman).toBe(halamanKartu[i]);
      expect(c.judul).toBe(labelHalaman(c.halaman));
      expect(c.url).toBe(urlHalaman(c.halaman));
    });
    for (const c of kartu.slice(0, 12)) expect(per(c.halaman).ada, c.halaman).toBe(true);
    harus(blok("Coba"), '<WidgetLama nama="kartu" src="data/t4-rekap-kartu.json" />');
    expect(Object.keys(kartu[0]!)).toEqual(["id", "halaman", "judul", "url", "tanya", "jawab"]);
  });

  test("tiap jawaban diawali kalimat halaman dan menyebut ADR yang benar; tanya diawali kejadian dan berakhir 'Kalimat apa yang lahir?'", () => {
    const adrKartu = [34, 35, 36, 37, 38, 38, 39, 40, 41, 42, 43, 44, 45];
    const awal = ["M29", "M30", "M31", "M32", "M33", "M33", "M34", "M35", "M36", "M37", "M38", "Tim dan infra", "M39"];
    kartu.forEach((c, i) => {
      expect(c.jawab.startsWith(butir(i + 1).kalimat), `kartu ${c.id} diawali kalimat ${i + 1}`).toBe(true);
      const nomor = [...c.jawab.matchAll(/\bADR (\d+)/g)].map((m) => Number(m[1]));
      expect([...new Set(nomor)], `kartu ${c.id}`).toEqual([adrKartu[i]]);
      expect(c.tanya.startsWith(`${awal[i]}: `), `kartu ${c.id} diawali ${awal[i]}`).toBe(true);
      expect(c.tanya.endsWith("Kalimat apa yang lahir?"), `kartu ${c.id}`).toBe(true);
      expect(c.jawab.endsWith("."), `kartu ${c.id} berakhir titik`).toBe(true);
    });
    // satu kejadian menurunkan dua kalimat (M33), dan tiap kartu 5 dan 6 menyebut ADR 38
    expect(kartu[4]!.halaman).toBe(kartu[5]!.halaman);
  });

  test("angka, label, dan frasa di tanya dan jawab diturunkan dari rekaman dan halaman (tanpa bergantung pada kunci baris)", () => {
    const dari = (n: number) => kartu[n - 1]!;
    const jurnal = semua(bag(ganda, "A"), /^ (\d+) +\| karyawan +\| (\d+)$/);
    harus(dari(1).tanya, `saldo Budi naik ${rp(jurnal.reduce((n, m) => n + Number(m[2]), 0))} untuk ${rp(Number(jurnal[0]![2]))} yang dibayar`);
    harus(dari(2).tanya, "Enam kiriman dijawab 401, dan tabel event tetap 0 baris.");
    harus(dari(2).jawab, "Batas: ambang 30 menit adalah Asumsi, jadwal 342 menit adalah Ilustrasi");
    harus(dari(3).tanya, "Vendor menerima 50 permintaan, sepuluh pekerjaan mati");
    harus(dari(3).jawab, "satu dari sepuluh pekerjaan tetap mati");
    harus(dari(4).jawab, "membaca 17 tabel");
    harus(dari(5).tanya, "dump membawa 1,1 kali ukuran file pada 2, 4, dan 8 pengajuan");
    harus(dari(5).tanya, "di bawah 0,01 kali");
    harus(dari(5).jawab, "karangan 500.000 byte (Ilustrasi)");
    harus(dari(6).tanya, "file 120.000 byte dan 90.000 byte");
    harus(dari(6).tanya, "PUT dijawab 403");
    harus(dari(6).jawab, "umur di lab 5 detik dan di ADR 38 5 menit (Asumsi)");
    harus(dari(7).tanya, "15 penolakan");
    harus(dari(8).tanya, "Rp35.000");
    harus(dari(9).tanya, "3 dari 32 alamat terlarang, jadi 29 lolos");
    harus(dari(10).tanya, "dua otorisasi Rp80.000 untuk saldo Rp100.000 sama-sama disetujui");
    harus(dari(11).tanya, "0 baris untuk Dina dan 0 baris untuk Eko");
    harus(dari(12).tanya, "digest D, padahal build CI menghasilkan digest C");
    harus(dari(13).tanya, `Puncak ${PUNCAK4} request per detik naik 8 kali (Hitungan atas Asumsi)`);
    harus(dari(13).jawab, "kapasitas satu server belum diukur");
    // angka di kurung "(ADR n: ...)" ada di kolom Keputusan baris tabel ADR yang sama (angka dan istilah teknis)
    const tabel = blok("Putuskan").split("\n").filter((b) => /^\| \d+ \|/.test(b)).map((b) => b.split("|").map((x) => x.trim()));
    kartu.forEach((c) => {
      const m = c.jawab.match(/\(ADR (\d+)(?:: ([^)]*))?\)/);
      if (!m || !m[2]) return;
      const baris = tabel.find((k) => Number(k[1]) === Number(m[1]))!;
      const angka = (s: string): string[] => [...s.replace(/`[^`]*`/g, "").matchAll(/\d+(?:[.,]\d+)*/g)].map((x) => x[0]);
      if (Number(m[1]) !== 45) expect(angka(m[2]!), `kartu ${c.id}: angka ADR ${m[1]}`).toEqual(angka(baris[2]!));
    });
    expect(kartu.map((c) => (c.tanya.match(/\btidak\b/g) ?? []).length), "jumlah 'tidak' di tanya").toEqual([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
    expect(JSON.stringify(kartu)).not.toMatch(/keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|[\u{1F300}-\u{1FAFF}]|\bAnda\b|\bkita\b|\bpengguna\b/u);
  });

  test("kartu ada di kartu ulang global lewat Cek diri halaman ini, dan lima soal Cek diri berasal dari lima halaman berbeda", () => {
    const milik = kartuSemua.filter((c) => c.halaman === "t4-rekap");
    expect(milik).toHaveLength(5);
    expect(new Set(milik.map((c) => c.tanya)).size).toBe(5);
    expect(milik.every((c) => c.url === urlHalaman("t4-rekap") && c.judul === labelHalaman("t4-rekap"))).toBe(true);
    const sumber = ["t4-webhook", "t4-breaker", "t4-storage", "t4-ssrf", "t4-audit"];
    expect(new Set(sumber).size).toBe(5);
    for (const id of sumber) expect(per(id).ada).toBe(true);
    expect(sumber.map((id) => per(id).nomor)).toEqual(["4.7", "4.11", "4.15", "4.21", "4.25"]);
  });
});

// ================================================================================================================================
describe("tabel ADR di blok Putuskan", () => {
  const baris = (): string[][] => blok("Putuskan").split("\n").filter((b) => /^\| \d+ \|/.test(b)).map((b) => b.split("|").map((x) => x.trim()));
  const huruf = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

  test("dua belas baris ADR 34 sampai 45 berurutan, kolom Lahir dari menaut halaman ADR yang benar dan kejadiannya", () => {
    expect(baris().map((k) => Number(k[1]))).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]);
    const lahir = ["PRD v4 dan M29", "M30", "M31", "M32", "M33", "M34", "M35", "M36", "M37", "M38", "Tim dan infra", "M39"];
    baris().forEach((k, i) => {
      const n = Number(k[1]);
      expect(k[3], `ADR ${n}`).toBe(`${lahir[i]}, [[${idAdr(n)}]]`);
    });
    harus(blok("Putuskan"), "Keputusan di balik kalimat-kalimat itu tertulis di ADR 34 sampai 45.");
    const adr = HALAMAN.filter((h) => h.tahap === 4).flatMap((h) => h.adr ?? []);
    expect([Math.min(...adr), Math.max(...adr)]).toEqual([34, 45]);
  });

  test("kolom Keputusan ADR 34 sampai 44 adalah judul ADR di halamannya, dan ADR 45 mengikuti naskah", () => {
    baris().slice(0, 11).forEach((k) => {
      const n = Number(k[1]);
      const teks = fileHalaman(idAdr(n));
      const m = cocok(teks, new RegExp(`^### ADR ${n}: (.+)$`, "m"));
      expect(huruf(m[1]!), `ADR ${n}`).toBe(k[2]);
    });
    const naskah45 = barisNaskah.find((b) => b.startsWith("| 45 |"))!;
    const mentah = cocok(naskah45, /Sengaja belum: (.+?) \| Masing-masing/)[1]!;
    const komponen: string[] = [];
    let dalam = 0;
    let awal = 0;
    for (let i = 0; i < mentah.length; i++) {
      if (mentah[i] === "(") dalam++;
      if (mentah[i] === ")") dalam--;
      if (mentah[i] === ";" && dalam === 0) {
        komponen.push(mentah.slice(awal, i).trim());
        awal = i + 1;
      }
    }
    komponen.push(mentah.slice(awal).trim());
    expect(komponen).toHaveLength(8);
    const k45 = baris()[11]!;
    expect(k45[2]).toBe("Delapan komponen sengaja belum dipasang, masing-masing dengan angka Tahap 4 dan pemicu tertulis, dan kapasitas satu server belum diukur");
    harus(naskah45, "Masing-masing diukur dengan angka tahap ini");
    harus(naskah45, "Pemicu masing-masing ditulis di halamannya");
    expect(naskah.match(/^\| 44 \| Merge per modul menjalankan/m)).not.toBeNull();
    const naskah44 = barisNaskah.find((b) => b.startsWith("| 44 |"))!;
    for (const f of ["per modul", "per digest", "Rilis app bertahap"]) harus(naskah44, f);
    // ADR 45 menulis "pemicu tertulis" dan "kapasitas satu server belum diukur"; hanya empat pemicu berupa angka beban yang bisa dibaca hari ini, jadi
    // "pemicu yang bisa diukur" lebih kuat daripada halaman asalnya
    jikaAda("t4-adr-45", (t) => {
      harus(t, "Delapan penundaan punya pemicu tertulis, dan kapasitas satu server belum diukur.");
      harus(t, "Lima butir lain menunggu permintaan produk, permintaan pihak luar, atau alat ukur yang belum ada.");
    });
    expect(blok("Putuskan")).not.toContain("pemicu yang bisa diukur");
  });

  test("angka di kolom Keputusan adalah pilihan tiap ADR, dan revisi ADR 12 ditulis di halaman ADR 37 dan 44", () => {
    const k = baris();
    harus(k[4]![2]!, "presigned PUT 5 menit");
    harus(fileHalaman("t4-storage"), "5 menit (Asumsi)");
    harus(k[8]![2]!, "lock_timeout 1 detik");
    harus(fileHalaman("t4-kartu"), "lock_timeout 1 detik");
    harus(blok("Putuskan"), "ADR 37 merevisi ADR 12 pada service kedua, dan ADR 44 merevisi baris tes contract OpenAPI di ADR 12. Angka di kolom Keputusan adalah pilihan tiap ADR, dan umur URL unggah 5 menit berlabel Asumsi di halamannya.");
    harus(fileHalaman("t4-modul"), "Revisi atas ADR 12 (service kedua)");
    harus(fileHalaman("t4-tim-infra"), "Merevisi ADR 12 pada baris tes contract OpenAPI di CI.");
  });
});

// ================================================================================================================================
describe("Cek diri, daftar periksa kode AI, dan butir belum diuji", () => {
  const soal = (): { no: number; tanya: string; jawab: string }[] => {
    const k = blok("Kunci");
    const hasil: { no: number; tanya: string; jawab: string }[] = [];
    for (const m of k.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)) hasil.push({ no: Number(m[1]), tanya: m[2]!, jawab: m[3]! });
    return hasil;
  };

  test("lima soal Cek diri berurutan, tiap jawaban memuat angka dari rekaman halaman sumbernya", () => {
    const s = soal();
    expect(s.map((x) => x.no)).toEqual([1, 2, 3, 4, 5]);
    const G = bag(urutan, "G").join("\n");
    cocok(G, /4\. tanpa lapis status, 25 jam kemudian \(key sudah habis\) +\| 25 jam +\| diproses +\| 2/);
    harus(s[0]!.tanya, "datang 25 jam sesudah event pertama");
    harus(s[0]!.jawab, "Idempotency-Key ledger hidup 24 jam, jadi sesudah 25 jam key itu sudah habis. Tanpa lapis status, event kedua diproses dan jurnalnya 2 (`urutan.txt` bagian G, kasus 4).");
    harus(fileHalaman("t4-webhook"), "Idempotency-Key ledger hidup 24 jam");
    expect(cari(bag(lajur, "B"), /^ mati +\| 5 +\| 1$/, "lajur B mati")[0]).toBeTruthy();
    harus(s[1]!.tanya, "Berapa dari 10 pekerjaan mati, dan kenapa bukan 0?");
    harus(s[1]!.tanya, "Breaker membuka sesudah kegagalan keenam, sedangkan satu pekerjaan punya lima percobaan.");
    const ssrfBaris = alamatSsrf.split("\n");
    const terlarang = cari(ssrfBaris, /^ditolak fetcher aman: (\d+) dari (\d+) alamat terlarang;/, "ssrf ringkas")[2]!;
    harus(s[3]!.tanya, `Berapa dari ${terlarang} alamat terlarang yang lolos, dan dari angka apa?`);
    harus(s[3]!.jawab, `jadi ${terlarang} − 3 = 29`);
    harus(s[3]!.jawab, `Pemeriksaan alamat versi aman menolak ke-${terlarang}-nya.`);
    const J = rk("t4-audit", "jangkar.txt");
    const hapusDari = cari(bag(J, "B"), /^=> \[t4a_pemilik\] DELETE FROM audit_log WHERE id >= (\d+)$/, "jangkar B hapus")[1]!;
    const totalBaris = cari(bag(J, "A"), /^# Log penuh: (\d+) baris\./, "jangkar A total")[1]!;
    expect([hapusDari, totalBaris]).toEqual(["5", "8"]);
    harus(s[4]!.tanya, `Baris ${hapusDari} sampai ${totalBaris} dari audit log berantai dihapus.`);
    harus(s[1]!.jawab, "Satu pekerjaan mati. Pekerjaan pertama sudah memakai kelima percobaannya sebelum kegagalan keenam");
    harus(s[1]!.jawab, "(`lajur.txt` bagian B)");
    const B = bag(presign, "B");
    expect(cari(B, /^isi objek sekarang: ([\d.]+) byte/, "presign isi")[1]).toBe("90.000");
    harus(s[2]!.jawab, "Isi pemegang kedua, 90.000 byte, karena PUT kedua menimpa objek tanpa versi lama (`presign.txt` bagian B). Sesudah umur habis, PUT dijawab 403 dan objek tidak berubah (bagian C).");
    const privat = 3;
    expect(32 - privat).toBe(29);
    harus(s[3]!.jawab, "29. `IsPrivate` menandai 3 dari 32 alamat itu, jadi 32 − 3 = 29 (Hitungan atas `alamat.txt`).");
    cocok(bag(jangkar, "B").join("\n"), /baris=4 rantai=utuh jangkar_lama=0 temuan=0\njangkar baru: nomor 4\n# exit status 0/);
    harus(s[4]!.jawab, "Tanpa jangkar: 4 baris, rantai utuh, exit status 0. Dengan file jangkar: jangkar nomor 6 dijawab baris-hilang, exit status 2 (`jangkar.txt` bagian B).");
    ["urutan.txt", "lajur.txt", "presign.txt", "alamat.txt", "jangkar.txt"].forEach((f, i) => harus(s[i]!.jawab, `\`${f}\``));
    expect(per("t4-ssrf").nomor).toBe("4.21");
  });

  test("daftar periksa kode AI: tiga belas butir berurutan, tiap butir menaut halaman yang memuat kata kuncinya", () => {
    const daftar = blok("Kunci").split("\n").filter((b) => b.startsWith("- [ ] "));
    expect(daftar).toHaveLength(13);
    const id = ["t4-webhook", "t4-rekonsiliasi", "t4-breaker", "t4-modul", "t4-storage", "t4-storage", "t4-infra-secret", "t4-qr", "t4-ssrf", "t4-kartu", "t4-audit", "t4-tim-infra", "t4-m39"];
    const kunci = ["ON CONFLICT DO NOTHING", "insiden bernomor", "Idempotency-Key", "schema", "checksum", "5 menit", "OpenTofu", "nama merchant", "redirect", "hold", "jangkar", "digest hasil build", "belum diukur"];
    daftar.forEach((b, i) => {
      expect(idDalam(b), `butir ${i + 1}`).toEqual([id[i]]);
      expect(b.endsWith(`([[${id[i]}]]).`), `butir ${i + 1}`).toBe(true);
      jikaAda(id[i]!, (t) => harus(t, kunci[i]!));
    });
    expect(new Set(daftar.map((b) => idDalam(b)[0])).size).toBe(12);
  });

  test("butir belum diuji: sembilan butir, tiap butir menaut halaman yang menulis keterbatasannya terbuka", () => {
    const paham = blok("Paham");
    const awal = paham.slice(paham.indexOf("### Yang belum diuji"));
    const daftar = awal.split("\n").filter((b) => b.startsWith("- "));
    expect(daftar).toHaveLength(9);
    harus(awal, "Sembilan hal yang ditulis terbuka di halamannya belum diuji.");
    const id = ["t4-m39", "t4-prd", "t4-infra-secret", "t4-qr", "t4-ssrf", "t4-kartu", "t4-audit", "t4-m33", "t4-tim-infra"];
    const kunci = ["belum diukur", "tiruan lokal", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan"];
    daftar.forEach((b, i) => {
      expect(idDalam(b), `butir ${i + 1}`).toEqual([id[i]]);
      jikaAda(id[i]!, (t) => harus(t, kunci[i]!));
    });
    harus(fileHalaman("t4-prd"), "Semua pihak ketiga berupa tiruan lokal di lab.");
    harus(fileHalaman("t4-kartu"), "flag di luar proses Tidak dijalankan");
    harus(fileHalaman("t4-audit"), "dan pencatatan sesinya Tidak dijalankan di lab ini.");
    harus(awal, "Komponen yang sengaja belum dipasang punya halaman sendiri di [[t4-adr-45]], dan halaman ini tidak mengulangnya.");
  });
});

// ================================================================================================================================
describe("klaim negatif berlingkup, dijaga pemindaian berkas terlacak", () => {
  test("lab t4-ssrf tidak menjalankan versi pertama, lab t4-pipeline tidak punya workflow, dan kill switch memakai memori satu proses", () => {
    const berkas = [...(terlacak ?? new Set<string>())];
    const ssrfRekaman = berkas.filter((b) => /^labs\/t4-ssrf\/output\/.*\.txt$/.test(b));
    expect(ssrfRekaman.length).toBeGreaterThanOrEqual(2);
    for (const b of ssrfRekaman) expect(baca(b), b).not.toMatch(/-rentan|Rentan\(/);
    expect(berkas.filter((b) => /^labs\/t4-pipeline\//.test(b) && /workflow|\.github/i.test(b))).toEqual([]);
    expect(berkas.filter((b) => /^labs\/t4-pipeline\/output\//.test(b)).map((b) => path.basename(b)).sort()).toEqual(["klien.txt", "kontrak.txt", "sast.txt", "sbom.txt", "tanda-tangan.txt", "testing.txt"]);
    expect(baca("labs/t4-kartu/output/kill-switch.txt")).toContain("flag ada di satu proses");
    // lab dan rekaman memakai tiruan lokal: tidak ada rekaman yang menyebut layanan nyata di host publik
    for (const b of berkas.filter((x) => /^labs\/t4-[a-z]+\/output\/.*\.txt$/.test(x))) expect(baca(b), b).not.toMatch(/https:\/\/(?:api|sandbox)\./);
    // halaman ini tidak menulis klaim regulasi atau izin
    expect(mdx).not.toMatch(/\bOJK\b|\bBI\b|PBI|UU \d|PCI DSS|kepatuhan|berizin|izin resmi/i);
  });

  test("halaman asal yang dirujuk menyebut Tidak dijalankan untuk hal yang halaman ini tulis belum diuji", () => {
    harus(fileHalaman("t4-infra-secret"), "Tidak dijalankan");
    harus(fileHalaman("t4-storage"), "Tidak dijalankan");
    harus(fileHalaman("t4-audit"), "Tidak dijalankan");
    harus(fileHalaman("t4-qr"), "Layar konfirmasi Tidak dijalankan");
    harus(fileHalaman("t4-tim-infra"), "Tidak dijalankan");
    harus(fileHalaman("t4-ssrf"), "metadata cloud");
    expect(blok("Paham").match(/Tidak dijalankan/g)!.length).toBeGreaterThanOrEqual(8);
  });
});

// ================================================================================================================================
describe("struktur halaman: label, sumber ingatan, tanpa ID internal, dan kata yang dilarang", () => {
  test("sumber ingatan: tautan PubMed di halaman dan baris riset memakai PMID dan tanggal akses yang sama (Roediger & Karpicke 16507066, Cepeda dkk. 16719566)", () => {
    harus(badan, "Untuk ingatan beberapa hari kemudian, mengingat kembali jawaban lebih menguatkan daripada belajar ulang ([Roediger & Karpicke 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/), dibuka 2026-10-31).");
    harus(badan, "- [Roediger & Karpicke 2006, Psychological Science 17(3)](https://pubmed.ncbi.nlm.nih.gov/16507066/)");
    harus(badan, "- [Cepeda dkk. 2006, Psychological Bulletin 132(3)](https://pubmed.ncbi.nlm.nih.gov/16719566/)");
    const baris = riset4.split("\n").find((b) => b.startsWith("| R4-255 |"))!;
    expect(baris, "baris riset R4-255").toBeTruthy();
    harus(baris, "dibuka 2026-10-31");
    harus(baris, "esummary db=pubmed id=16507066,16719566");
    harus(baris, "PMID 16507066 = Roediger & Karpicke");
    harus(baris, "Psychological Science 17(3)");
    harus(baris, "PMID 16719566 = Cepeda dkk.");
    harus(baris, "Psychological Bulletin 132(3)");
    // halaman artikel kedua dan pertama (PubMed esummary): satu angka yang berubah tidak boleh lolos
    harus(baris, "halaman 249-55");
    harus(baris, "halaman 354-80");
    const kol = baris.split(" | ");
    expect(kol).toHaveLength(5);
    expect(kol[0]).toBe("| R4-255");
    expect(kol[1]).toBe("Mengingat kembali jawaban lebih menguatkan ingatan jangka panjang daripada belajar ulang; jarak ulang (halaman rekap Tahap 4, melengkapi R2-215 dan R3-250)");
    expect(kol[2]).toContain("NCBI E-utilities esummary (eutils.ncbi.nlm.nih.gov, dibuka 2026-10-31 dengan curl;");
    expect(kol[2]).toContain("pubdate 2006 Mar");
    expect(kol[2]).toContain("pubdate 2006 May");
    expect(kol[2]).toContain("sudah dicatat di R2-215");
    expect(kol[3]).toBe(`${labelHalaman("t4-rekap")} (Kenapa ini ada, Bacaan lanjut)`);
    expect(kol[4]).toBe("Tidak berubah dari R2-215 dan R3-250 |");
    const r215 = riset2.split("\n").find((b) => b.startsWith("| R2-215 |"))!;
    harus(r215, "PMID 16507066");
    harus(r215, "PMID 16719566");
    harus(riset3.split("\n").find((b) => b.startsWith("| R3-250 |"))!, "PMID 16507066");
    expect(riset4.match(/^\| R4-255 \|/gm)).toHaveLength(1);
    const urut = [...riset4.matchAll(/^\| R4-(\d+) \|/gm)].map((m) => Number(m[1]));
    expect(urut).toEqual([...urut].sort((a, b) => a - b));
    expect(new Set(urut).size).toBe(urut.length);
  });

  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa Anda atau kita, dan tanpa ID riset atau nomor keputusan di teks tampil", () => {
    const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI|\b[A-Z]\d{1,2}\b(?!\.)/;
    const teksTampil = badan.replace(/^import .*$/gm, "").replace(/\[\[[^\]]*\]\]/g, "x").replace(/\(https?:[^)]*\)/g, "");
    expect(teksTampil).not.toMatch(/keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/);
    expect(POLA_ID_INTERNAL.test("lihat C2 di rekaman")).toBe(true);
    expect(JSON.stringify(kartu) + JSON.stringify(kejadianMentah)).not.toMatch(/keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b/);
    expect(mdx).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(teksTampil).not.toMatch(/!(?!\[)/);
    expect(mdx).not.toMatch(/\bAnda\b|\bkita\b|\bpengguna\b/i);
    expect(mdx).not.toMatch(/\bB\d{2,3}\b/);
    expect(mdx).not.toMatch(/\bmudah\b|\bcukup\b|\btinggal\b/i);
    // simbol tanpa arti: tidak ada L, lambda, atau W yang berdiri sendiri
    expect(teksTampil).not.toMatch(/\bL = |λ|\bW =/);
  });

  test("front matter dikunci: title dan description memuat tiga belas, ADR 34 sampai 45, dan Cek diri", () => {
    expect(frontmatter).toContain('title: "4.30 Yang dibawa keluar dari Tahap 4"');
    expect(frontmatter).toContain("description: Tiga belas kalimat dari Tahap 4, masing-masing terikat ke kejadian dan halaman asalnya. Ada kartu untuk menebaknya, ringkasan ADR 34 sampai 45, dan Cek diri gabungan.");
    const adr = HALAMAN.filter((h) => h.tahap === 4).flatMap((h) => h.adr ?? []);
    expect(cocok(frontmatter, /ADR (\d+) sampai (\d+)/).slice(1, 3)).toEqual([String(Math.min(...adr)), String(Math.max(...adr))]);
  });

  test("prosa halaman tidak punya paragraf di luar daftar kunci: jumlah Blok, Rantai, WidgetLama, dan impor tetap", () => {
    expect(mdx.match(/<Blok /g)).toHaveLength(5);
    expect(mdx.match(/<Rantai /g)).toHaveLength(1);
    expect(mdx.match(/<WidgetLama /g)).toHaveLength(1);
    expect(mdx.match(/<SkripLama /g)).toHaveLength(1);
    expect(mdx.match(/^import /gm)).toHaveLength(5);
    expect(mdx.match(/<details/g)).toHaveLength(6);
    expect(mdx.match(/class="success"/g)).toHaveLength(5);
  });
});

// ================================================================================================================================
// TANPA_KALIMAT=1 mematikan kunci kalimat tanpa angka, supaya uji mutasi melihat nilai turunan sumber sendirian.
const kalimatKunci = process.env.TANPA_KALIMAT ? describe.skip : describe;
function fragmenMdx(teks: string): string[] {
  const kepala = teks.indexOf("\n---\n", 5) + 5;
  const hasil: string[] = [];
  for (const baris of teks.slice(kepala).split("\n")) {
    if (!baris.trim() || /^(import |<|\||<\/)/.test(baris)) continue;
    const b = baris.replace(/^(\s*)(\d+\.\s+|- \[ \] |- )/, "$1").trim();
    for (const f of b.split(/(?<=[.!?:]) /)) {
      const t = f.trim();
      if (t && t.split(/\s+/).length >= 2 && !/\d/.test(t.replace(/\[\[[^\]]*\]\]|\bt\d-[a-z]+|\bapi-t\d/g, ""))) hasil.push(t);
    }
  }
  return hasil;
}
kalimatKunci("kalimat mekanisme tanpa angka terkunci per kalimat", () => {
  test("setiap kalimat tanpa angka di halaman ada di daftar kunci, dan setiap kunci ada di halaman", () => {
    const unik = [...new Set(fragmenMdx(mdx))];
    expect(unik).toEqual(KALIMAT);
    for (const k of KALIMAT) expect(mdx, k).toContain(k);
  });
});

describe("struktur: heading, daftar bernomor, ADR dan M yang disebut, Rantai, dan angka kartu diturunkan dari halaman", () => {
  test("daftar heading halaman tetap, dan daftar bernomor Mulai berurutan", () => {
    expect(mdx.match(/^#{1,6} .*$/gm)).toEqual([
      "## Inti", "### Kenapa ini ada", "### Tiga belas kalimat", "### Yang belum diuji", "### Dua belas keputusan Tahap 4",
      "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    harus(blok("Mulai"), "\n1. Vendor verifikasi mati dan breaker membuka sesudah kegagalan keenam. Kenapa satu dari sepuluh pekerjaan tetap mati?\n2. Stiker QR diganti dan CRC-nya dihitung ulang. Kenapa pemindai tetap menerimanya?\n3. Ratih membuka data Dina enam kali. Kenapa tabel catatan menjawab nol baris untuk Dina dan untuk Eko?\n");
    harus(blok("Mulai"), "Tahap 4 meninggalkan tiga belas kalimat, satu per konsep.");
    expect(tigabelas.map((b) => b.pertama.match(/^(\d+)\. /)![1])).toEqual(Array.from({ length: 13 }, (_, i) => String(i + 1)));
  });

  test("ADR, M, PRD, dan nama lab yang disebut tiap kalimat hanya yang berasal dari kejadiannya", () => {
    const adrOk: number[][] = [[34], [35], [36], [37, 17], [38], [38], [39], [40], [41], [42], [43], [44], []];
    const mOk: number[][] = [[29], [30], [31], [32], [33], [33], [34], [35], [36], [37], [38], [], [39]];
    tigabelas.forEach((b, i) => {
      const adr = [...new Set([...b.teks.matchAll(/\bADR (\d+)/g)].map((m) => Number(m[1])))].sort((x, y) => x - y);
      expect(adr, `kalimat ${b.no}: ADR`).toEqual([...adrOk[i]!].sort((x, y) => x - y));
      const m = [...new Set([...b.teks.matchAll(/\bM(\d{2})\b/g)].map((x) => Number(x[1])))];
      for (const x of m) expect(mOk[i], `kalimat ${b.no}: M${x}`).toContain(x);
      const prd = [...new Set([...b.teks.matchAll(/PRD v(\d)/g)].map((x) => x[1]))];
      expect(prd, `kalimat ${b.no}: PRD`).toEqual(b.no === 13 ? ["5"] : b.no === 11 ? ["4"] : []);
      for (const lab of b.teks.matchAll(/\blab (t4-[a-z]+|api-t4)\b/g)) expect(terlacak?.has(`labs/${lab[1]}/Makefile`) ?? true, `lab ${lab[1]} tidak ada`).toBe(true);
      for (const api of b.teks.matchAll(/\bapi-t(\d)\b/g)) expect(["3", "4"], `kalimat ${b.no}: api-t${api[1]}`).toContain(api[1]);
    });
    const semuaLab = new Set([...mdx.matchAll(/\blab (t4-[a-z]+|api-t4)\b/g)].map((m) => m[1]));
    expect([...semuaLab].sort()).toEqual(["api-t4", "t4-audit", "t4-infra", "t4-integrasi", "t4-kartu", "t4-modul", "t4-pipeline", "t4-qr", "t4-ssrf", "t4-storage", "t4-webhook"]);
  });

  test("Rantai: label dan sub tiap baris dan simpul adalah kata-kata halaman yang tetap, dan tiap sub sesuai konsep halaman kejadian", () => {
    expect(diagram.baris.map((b) => [b.label, b.sub])).toEqual([["Sampai minggu 7", "kabar dari luar dan kode bersama"], ["Minggu 8 sampai 12", "pindahan, keamanan, beban"]]);
    expect(diagram.baris.flatMap((b) => b.simpul.map((x) => [x.teks, x.sub]))).toEqual([
      ["PRD v4", "kabar dari luar"], ["M29 ganda", "top-up dan webhook"], ["M30 secret", "rekonsiliasi"], ["M31 vendor", "breaker dan lajur"],
      ["M32 rilis", "batas modul"], ["M33 file", "penyimpanan objek"], ["M34 alamat", "secret dan IaC"], ["M35 QR", "CRC dan nama"],
      ["M36 SSRF", "alamat yang dihubungi"], ["M37 kartu", "dana tertahan"], ["M38 audit", "audit berantai"], ["M39 PRD v5", "estimasi"],
    ]);
    expect(diagram.baris.flatMap((b) => b.simpul).filter((x) => x.nada !== "biasa").map((x) => x.nada)).toEqual(["system", "system"]);
  });

  test("tiap angka di tanya dan jawab kartu ada di teks kalimat yang sama, dan nilai kartu 1 dan 6 sama dengan kalimat halaman", () => {
    const angka = (t: string): string[] => [...t.replace(/`[^`]*`/g, "").matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]);
    kartu.forEach((c, i) => {
      const teksKalimat = butir(i + 1).teks;
      const ada = new Set(angka(teksKalimat));
      for (const a of [...angka(c.tanya), ...angka(c.jawab.replace(/\(ADR \d+[^)]*\)/g, ""))]) expect(ada.has(a) || a === "4" || a === "38", `kartu ${c.id}: angka ${a} tidak ada di kalimat ${i + 1}`).toBe(true);
      // kartu yang menyebut ADR n memuat nomor yang sama dengan kalimat
      for (const a of c.jawab.matchAll(/\bADR (\d+)/g)) expect([34, 35, 36, 37, 38, 38, 39, 40, 41, 42, 43, 44, 45][i]).toBe(Number(a[1]));
    });
    // angka tiap kartu tidak hanya ada di kalimat, tetapi sama dengan urutan di tanya: multiset angka tanya ada di pertama atau batas
    for (const [i, c] of kartu.entries()) {
      const sumber = butir(i + 1).pertama + " " + butir(i + 1).batas;
      const hitung = (t: string, a: string): number => t.split(a).length - 1;
      for (const a of new Set(angka(c.tanya))) expect(hitung(sumber, a) >= 1, `kartu ${c.id}: ${a}`).toBe(true);
    }
  });
});

// ================================================================================================================================
// Mutan yang lolos dari tes turunan pada tinjauan (keputusan 1385): kalimat prosa tanpa angka yang hanya dijaga kunci kalimat. Tiap
// asersi menautkan kalimat ke berkas yang memuat dasarnya (rekaman, halaman asal, atau naskah), bukan ke dirinya sendiri.
describe("kalimat prosa tanpa angka tertaut ke dasarnya (tinjauan)", () => {
  test("atribut aman di blok Coba, skrip widget kartu, dan jumlah kalimat di dalamnya mengikuti tabel naskah", () => {
    const kataBilangan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas", "tiga belas"];
    harus(blok("Coba"), `aman="Kalau berhenti di sini, kamu sudah punya ${kataBilangan[tabelNaskah5.length]} kalimat Tahap 4, masing-masing dengan kejadiannya."`);
    harus(mdx, '<WidgetLama nama="kartu" src="data/t4-rekap-kartu.json" />');
    harus(mdx, '<SkripLama daftar={["cerita","kartu"]} />');
  });
  test("kalimat 1, 4, 8, 3: pelaku dan label dibaca dari rekaman dan halaman asal", () => {
    harus(butir(1).pertama, "Tanda tangan dihitung atas byte yang tiba.");
    expect(ada(bag(tandatangan, "A"), /^verifikasi atas byte mentah: cocok$/)).toBe(true);
    harus(butir(4).pertama, "tim Merchant mengganti nama kolom `akun.nama`");
    harus(fileHalaman("t4-m32"), "Kamis pukul 15.20 tim Merchant merilis versi baru.");
    harus(barisNaskah.find((b) => b.startsWith("| M32 |"))!, "tim Merchant merilis");
    harus(butir(4).batas, "dijaga review dan checklist PR, bukan mesin.");
    harus(fileHalaman("t4-modul"), "dijaga review dan checklist PR, bukan mesin.");
    harus(butir(8).pertama, "Penempelan stiker adalah Ilustrasi, dan lab hanya memerankan pemindai.");
    harus(rk("t4-qr", "statis.txt"), "# Skenario (Ilustrasi): stiker Toko Andalan tertempel di kasir Bu Marni. Lab hanya memerankan pemindaian payload Toko Andalan");
    harus(butir(3).batas, "Yang terlindungi adalah pekerjaan yang belum dicoba.");
    harus(fileHalaman("t4-breaker"), "pekerjaan yang belum dicoba menunggu tanpa memakai percobaan");
  });
  test("daftar periksa kode AI: tiap butir sejalan dengan rumusan di daftar periksa atau Putuskan halaman asalnya", () => {
    const kode = blok("Kunci");
    const periksa: [string, string, string][] = [
      ["t4-webhook", "dihitung atas byte mentah sebelum JSON diurai", "diperiksa sebelum JSON diurai"],
      ["t4-storage", "URL unggah berumur pendek, server memeriksa isi file sesudah unggah, dan file dibuka lewat server, bukan lewat URL", "umur URL dalam menit, bukan hari"],
      ["t4-audit", "Role aplikasi tidak bisa mengubah audit log", "Role aplikasi tidak punya UPDATE dan DELETE pada tabel log"],
      ["t4-tim-infra", "lewat digest hasil build CI yang diverifikasi, bukan lewat tag", "Verifikasi image memakai digest hasil build, bukan tag."],
      ["t4-qr", "menampilkan nama merchant dari jawaban server, bukan dari payload", "Yang dipercaya adalah jawaban server atas id QR."],
    ];
    for (const [id, di4_30, disumber] of periksa) {
      harus(kode, di4_30);
      harus(fileHalaman(id), disumber);
    }
  });
});
