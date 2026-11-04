// Penjaga halaman 5.31 (keputusan 1620 sampai 1622): angka, ID halaman, nomor ADR, huruf bagian rekaman, label, dan tautan di rekap.mdx,
// kartu t5-rekap-kartu.json, dan diagram Rantai t5-rekap-kejadian.json diturunkan dari naskah Tahap 5 (bagian 5), registry (cerita.json),
// halaman Tahap 5 yang dirujuk, dan rekaman lab Tahap 5, bukan dari daftar yang ditulis sendiri. Halaman ini TANPA LAB dan merangkum
// halaman lain. Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini; (2) kata-kata halaman dikunci per baris lewat
// rekap-t5.halaman.nilai.ts, supaya satu kata yang berubah gagal. Kalimat terkunci tidak menangkap SALAHNYA kalimat, jadi klaim yang
// diucapkan dibaca dari rekaman dan halaman asal (tabel FAKTA). Halaman 5.26 belum di main saat halaman ini ditulis: tes yang membaca
// isinya hanya berjalan bila registry menandainya ada (`ada: true`).
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import kejadianMentah from "../../data/diagram/t5-rekap-kejadian.json";
import { DataRantai } from "./rantai";
import { BARIS_MDX, TEKS_DIAGRAM, TEKS_KARTU } from "./rekap-t5.halaman.nilai";

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

const mdx = baca("situs/src/content/docs/tahap-5/rekap.mdx");
const potong = mdx.split(/^---\n/m);
const frontmatter = potong[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const naskah = baca("plan/CERITA-TAHAP-5.md");
const diagram = DataRantai.parse(kejadianMentah);
interface Kartu { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }
const kartu = JSON.parse(baca("situs/lama/widgets/data/t5-rekap-kartu.json")) as Kartu[];
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as Kartu[];
const riset5 = baca("plan/RISET-TAHAP-5.md");

interface H { id: string; judul: string; tahap: number; path: string; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; prasyarat?: string[]; menit?: number; label?: string }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const fileHalaman = (id: string): string => baca(`situs/src/content/docs/${per(id).path.replace(/\.md$/, ".mdx")}`);
const urlHalaman = (id: string): string => per(id).path.replace(/\.md$/, "/");
const judulTampil = (id: string): string => {
  const h = per(id);
  if (!h.ada) return `${h.nomor} ${h.judul}`;
  return fileHalaman(id).match(/^title: "(.*)"$/m)![1]!;
};

const blok = (nama: string): string => {
  const awal = mdx.indexOf(`<Blok nama="${nama}"`);
  const akhir = mdx.indexOf("</Blok>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`halaman: blok ${nama} tidak ada`);
  return mdx.slice(awal, akhir);
};
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\|[^\]]+)?\]\]/g;
const idDalam = (teks: string): string[] => [...teks.matchAll(TOKEN)].map((m) => m[1]!);

interface Butir { no: number; kalimat: string; teks: string; ids: string[]; adr: number[] }
const butirSemua = ((): Butir[] => {
  const paham = blok("Paham");
  const bagian = paham.slice(paham.indexOf("### Enam belas kalimat"), paham.indexOf("### Yang belum diuji")).split("\n");
  const hasil: Butir[] = [];
  for (const b of bagian) {
    const m = b.match(/^(\d+)\. \*\*(.+?)\*\*/);
    if (m) hasil.push({ no: Number(m[1]), kalimat: m[2]!.replace(/\.$/, ""), teks: "", ids: [], adr: [] });
    if (hasil.length) hasil[hasil.length - 1]!.teks += b + "\n";
  }
  for (const h of hasil) {
    h.ids = idDalam(h.teks);
    h.adr = [...h.teks.matchAll(/Konsep dan ADR (\d+)/g)].map((m) => Number(m[1]));
  }
  return hasil;
})();
const butir = (no: number): Butir => butirSemua[no - 1]!;

// ---- naskah bagian 5 ---------------------------------------------------------------------------------------------------------
const barisNaskah = naskah.split("\n");
const tabelNaskah = ((): { konsep: string; kalimat: string; kejadian: string }[] => {
  const a = barisNaskah.findIndex((b) => b.startsWith("## 5. Yang dibawa pembaca keluar dari Tahap 5"));
  const z = barisNaskah.findIndex((b, i) => i > a && b.startsWith("## 6."));
  return barisNaskah.slice(a, z).filter((b) => b.startsWith("| ") && !b.startsWith("| Konsep") && !b.startsWith("| ---")).map((b) => {
    const k = b.split("|").map((x) => x.trim());
    return { konsep: k[1]!, kalimat: k[2]!, kejadian: k[3]! };
  });
})();

// Peta kalimat -> id halaman kejadian dan halaman konsep, diturunkan dari registry (judul M dan nomor ADR), bukan ditulis tangan.
const idM = (n: number): string => {
  const h = HALAMAN.find((x) => x.tahap === 5 && x.judul.startsWith(`M${n}:`));
  if (!h) throw new Error(`registry: M${n} tidak ada`);
  return h.id;
};
const idAdr = (n: number): string => {
  const h = HALAMAN.filter((x) => x.tahap === 5 && x.adr?.includes(n));
  if (h.length !== 1) throw new Error(`registry: ADR ${n} ada di ${h.length} halaman`);
  return h[0]!.id;
};
// Kalimat 1 sampai 16: [nomor M kejadian atau 0 bila lahir dari ADR, nomor ADR konsep, nomor ADR yang ditulis "Konsep dan ADR" (0 bila tidak ada)]
const PETA: [number, number, number][] = [
  [40, 46, 46], [41, 47, 47], [42, 48, 48], [43, 49, 49], [44, 50, 50], [0, 50, 0], [45, 51, 51], [46, 52, 52],
  [47, 53, 53], [48, 54, 54], [49, 55, 55], [50, 56, 56], [0, 57, 0], [0, 58, 58], [0, 59, 0], [51, 0, 0],
];
const kejadianId = (no: number): string => {
  const [m, adr] = PETA[no - 1]!;
  return m ? idM(m) : idAdr(adr);
};

// ---- rekaman -----------------------------------------------------------------------------------------------------------------
const rekamanAda = (lab: string, berkas: string): boolean => fs.existsSync(path.join(akar, "labs", lab, "output", berkas));
const bagianRekaman = (lab: string, berkas: string, huruf: string): string => {
  const teks = baca(`labs/${lab}/output/${berkas}`);
  const re = new RegExp(`^# --- ${huruf}\\d*\\..*?(?=^# --- |$(?![\\s\\S]))`, "gms");
  const m = teks.match(re);
  expect(m, `${lab}/${berkas}: bagian ${huruf} tidak ada`).not.toBeNull();
  return m!.join("\n");
};
const labDari = (berkas: string): string[] => fs.readdirSync(path.join(akar, "labs")).filter((l) => rekamanAda(l, berkas));

describe("registry dan naskah: enam belas kalimat, kejadian, dan ADR", () => {
  test("naskah bagian 5 punya 16 baris dan halaman memuat 16 butir berurut", () => {
    expect(tabelNaskah.length).toBe(16);
    expect(butirSemua.length).toBe(16);
    butirSemua.forEach((b, i) => expect(b.no).toBe(i + 1));
  });
  test("kalimat tiap butir sama dengan naskah, kecuali dua yang dipersempit halaman asal dan dijaga terhadap halaman itu", () => {
    for (let n = 1; n <= 16; n++) {
      const k = butir(n).kalimat;
      const naskahK = tabelNaskah[n - 1]!.kalimat.replace(/\.$/, "");
      if (n === 2) {
        expect(k).toBe("Replica bisa tertinggal, jadi apa yang baru kamu tulis dibaca dari primary sampai replica menyusul");
        expect(naskahK).toContain("selalu sedikit tertinggal");
        expect(fileHalaman("t5-lag")).toContain("Replica bisa tertinggal");
        expect(fileHalaman("t5-lag")).toContain("dibaca dari primary sampai replica menyusul");
        expect(butir(2).teks).toContain('naskah menulis replica "selalu sedikit tertinggal"');
      } else if (n === 16) {
        const asal = fileHalaman("t5-m51");
        expect(asal).toContain("Masalah Tahap 5 adalah salinan yang tertinggal dan pekerjaan yang diulang, bukan jumlah request per detik. Kapasitas satu primary belum terukur.");
        expect(`${k}.`).toBe("Masalah Tahap 5 adalah salinan yang tertinggal dan pekerjaan yang diulang, bukan jumlah request per detik. Kapasitas satu primary belum terukur.");
      } else {
        expect(k, `butir ${n}`).toBe(naskahK);
      }
    }
  });
  test("tiap butir menautkan halaman kejadian dan halaman konsep dari registry, dan 'Konsep dan ADR n' cocok dengan halaman itu", () => {
    for (let n = 1; n <= 16; n++) {
      const [m, adr, ditulis] = PETA[n - 1]!;
      const b = butir(n);
      expect(b.ids, `butir ${n} kejadian`).toContain(kejadianId(n));
      if (adr) expect(b.ids, `butir ${n} konsep`).toContain(idAdr(adr));
      if (ditulis) {
        expect(b.adr, `butir ${n} nomor ADR`).toEqual([ditulis]);
        expect(per(idAdr(ditulis)).adr).toContain(ditulis);
      } else {
        expect(b.adr, `butir ${n} tanpa 'Konsep dan ADR'`).toEqual([]);
      }
      if (m) expect(b.teks).toContain(`[[${idM(m)}]]`);
    }
  });
  test("lima belas keputusan: ADR 46 sampai 60 di tabel, tiap baris menaut halaman yang memuat ADR itu, dan 'lahir dari' cocok", () => {
    const tabel = blok("Putuskan").split("\n").filter((b) => /^\| \d+ \|/.test(b));
    expect(tabel.length).toBe(15);
    tabel.forEach((baris, i) => {
      const n = 46 + i;
      const sel = baris.split("|").map((x) => x.trim());
      expect(Number(sel[1])).toBe(n);
      const id = idAdr(n);
      expect(idDalam(sel[3]!), `ADR ${n}`).toEqual([id]);
      const m = sel[3]!.match(/^M(\d+),/);
      if (m) expect(per(idM(Number(m[1]))).label ?? "").toContain(`Masalah ${m[1]}`);
      expect(HALAMAN.filter((h) => h.adr?.includes(n)).length).toBe(1);
    });
    expect(HALAMAN.filter((h) => h.tahap === 5 && h.adr && h.adr.some((a) => a >= 46 && a <= 60)).length).toBe(15);
    expect(HALAMAN.filter((h) => h.tahap === 5 && h.adr).flatMap((h) => h.adr!).sort((a, b) => a - b)).toEqual(Array.from({ length: 15 }, (_, i) => 46 + i));
  });
  test("tiga puluh halaman Tahap 5 sebelum rekap, dan tiga yang tidak melahirkan kalimat", () => {
    const sebelum = HALAMAN.filter((h) => h.tahap === 5 && h.nomor && Number(h.nomor.split(".")[1]) < 31);
    expect(sebelum.length).toBe(30);
    expect(blok("Paham")).toContain("tersebar di tiga puluh halaman, dari [[t5-prd]] sampai [[t5-adr-60]]");
    const dipakai = new Set(butirSemua.flatMap((b) => b.ids));
    const tidak = sebelum.map((h) => h.id).filter((id) => !dipakai.has(id));
    expect(tidak.sort()).toEqual(["t5-adr-60", "t5-fitur-teknis", "t5-skema"]);
    expect(blok("Paham")).toContain("Tiga di antaranya, [[t5-fitur-teknis]], [[t5-skema]], dan [[t5-adr-60]], mendukung kalimat");
  });
  test("registry: 5.31 ada, prasyarat 5.30, menit dari baris meta, jalur inti", () => {
    const h = per("t5-rekap");
    expect(h.ada).toBe(true);
    expect(h.nomor).toBe("5.31");
    expect(h.prasyarat).toEqual(["t5-adr-60"]);
    const m = mdx.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-adr-60\]\] · Jalur inti<\/p>$/m);
    expect(m).not.toBeNull();
    expect(h.menit).toBe(Number(m![1]) + Number(m![2]));
    expect(Number(m![1])).toBeLessThanOrEqual(15);
  });
});

describe("diagram Rantai t5-rekap-kejadian: dua belas kejadian berurut dengan minggu dari registry", () => {
  const simpul = diagram.baris.flatMap((b) => b.simpul);
  test("simpul M40 sampai M51 berurut, dua baris enam simpul, dan minggu baris cocok dengan label registry", () => {
    expect(diagram.baris.length).toBe(2);
    expect(diagram.baris.map((b) => b.simpul.length)).toEqual([6, 6]);
    simpul.forEach((s, i) => expect(s.teks.startsWith(`M${40 + i} `), s.teks).toBe(true));
    const minggu = (n: number): number => Number(per(idM(n)).label!.match(/minggu (\d+)/)![1]);
    expect(diagram.baris[0]!.label).toBe(`Minggu ${minggu(40)} sampai ${minggu(45)}`);
    expect(diagram.baris[1]!.label).toBe(`Minggu ${minggu(46)} sampai ${minggu(51)}`);
    for (let n = 40; n < 51; n++) expect(minggu(n + 1)).toBeGreaterThan(minggu(n));
  });
  test("simpul M51 bernada system, sumber Ilustrasi, dan catatan memuat dua belas dan empat", () => {
    expect(simpul[11]!.nada).toBe("system");
    const mentah = (kejadianMentah as { baris: { simpul: { nada?: string }[] }[] }).baris.flatMap((b) => b.simpul);
    mentah.slice(0, 11).forEach((s) => expect(s.nada).toBeUndefined());
    expect(diagram.sumber.jenis).toBe("ilustrasi");
    expect(diagram.catatan).toBe("Dua belas kalimat lahir dari PRD v5 dan M40 sampai M51, dan PRD v5 bersama M40 melahirkan satu; empat kalimat lahir dari ADR 50, 57, 58, dan 59.");
    expect(blok("Mulai")).toContain("Dua belas kalimat lahir dari PRD v5 dan M40 sampai M51, dan PRD v5 bersama M40 melahirkan satu. Empat kalimat lahir dari ADR 50, 57, 58, dan 59.");
    expect(PETA.filter(([m]) => m).length).toBe(12);
    expect(PETA.map((p, i) => (p[0] ? 0 : i + 1)).filter(Boolean).map((i) => PETA[i - 1]![1])).toEqual([50, 57, 58, 59]);
  });
});

// ---- rekaman: huruf bagian dan isi --------------------------------------------------------------------------------------------
// [butir, kalimat di halaman, lab/berkas, bagian, pola di rekaman]
const FAKTA: [number, string, string, string, RegExp][] = [
  [1, "1.000 dari 1.000 pembayaran dijawab 201", "api-t5/laporan.txt", "B", /pembayaran selesai: 1000 dari 1000, semua 201/],
  [1, "6.667 dari 6.667 laporan dijawab 200", "api-t5/laporan.txt", "B", /laporan selesai: 6667 dari 6667, semua 200/],
  [1, "kode 25006", "t5-replika/replika.txt", "B", /25006/],
  [1, "saldo tampil di replica Rp250.000, saldo primary Rp215.000", "t5-replika/baca.txt", "A", /saldo tampil sesudahnya masih Rp250\.000/],
  [1, "kiriman Rp240.000 ditolak dengan 422", "t5-replika/baca.txt", "A", /Rp240\.000[\s\S]*422|422[\s\S]*Rp240\.000/],
  [2, "saldo Rp215.000", "t5-replika/baca.txt", "B", /"saldo":215000[\s\S]*X-Dibaca-Dari: primary/],
  [2, "dijawab primary dengan Rp203.000", "t5-replika/baca.txt", "B", /X-Dibaca-Dari: primary[\s\S]*"saldo":203000/],
  [2, "di bawah 1 detik pada 100 pembayaran per detik", "t5-replika/jeda.txt", "A", /100 pembayaran per detik/],
  [3, "nol dari lima ada di replica yang dipromosikan", "t5-replika/promosi.txt", "A", /lima pembayaran/i],
  [3, "Jurnal keempat tidak dijawab dalam 3 detik", "t5-replika/promosi.txt", "B", /Primary lama memuat satu jurnal lagi[\s\S]*client tidak pernah menerima 201/],
  [4, "1.800.000 dari 1.800.000", "t5-partisi/snapshot.txt", "A", /1\.800\.000 dari 1\.800\.000 posting/],
  [4, "150.000, yaitu 8,3%", "t5-partisi/snapshot.txt", "C", /150\.000 dari 1\.800\.000, yaitu 8,3%/],
  [4, "SQLSTATE 23001", "t5-partisi/lepas.txt", "B", /SQLSTATE 23001/],
  [4, "menandai 10.061 dari 10.288 buku", "t5-partisi/lepas.txt", "F", /10288 buku diperiksa, 10061 tidak cocok/],
  [4, "pemeriksaan dari snapshot menandai 0", "t5-partisi/lepas.txt", "F", /dari snapshot[^\n]*10288 buku diperiksa, 0 tidak cocok/],
  [5, "kode 42501", "api-t5/skema.txt", "F", /42501/],
  [6, "0 panggilan antar proses per transaksi", "t5-gabung/panggilan.txt", "B", /0 panggilan antar proses/],
  [6, "620,14 byte per transaksi tiap arah", "t5-gabung/panggilan.txt", "D", /620,14/],
  [6, "500 dari 500 transaksi tiga proses", "t5-gabung/latensi.txt", "B", /500 dari 500/],
  [7, "enam rekaman Kafka", "t5-fanout/aliran.txt", "A", /10281/],
  [7, "504 panggilan diulang", "t5-fanout/grup.txt", "A", /504/],
  [7, "jumlah 429 tidak direkam sebagai nilai", "t5-fanout/antrean.txt", "B", /429/],
  [8, "kode 53300 pada batas 97", "api-t5/pooler.txt", "A", /53300[\s\S]*97|97[\s\S]*53300/],
  [8, "paling banyak 20 sampai ke PostgreSQL", "api-t5/pooler.txt", "B", /20/],
  [9, "jurnal top-up Rp1.000", "t5-service/rentan.txt", "A", /1000/],
  [9, "dijawab 403 untuk jenis `topup_bank`", "t5-service/mtls.txt", "C", /403[\s\S]*topup_bank|topup_bank[\s\S]*403/],
  [9, "dijawab 201", "t5-service/mtls.txt", "C", /201/],
  [9, "jurnal kedua (`idempoten.txt` bagian C)", "t5-service/idempoten.txt", "C", /201/],
  [10, "dari Rp250.000 ke Rp50.000", "t5-cicilan/crash.txt", "A", /Rp250\.000[\s\S]*Rp50\.000/],
  [10, "angsurannya `dicatat` (bagian B)", "t5-cicilan/crash.txt", "B", /dicatat/],
  [10, "INSERT dengan referensi yang sama ditolak (bagian C)", "t5-cicilan/crash.txt", "C", /referensi/],
  [11, "25,0% dari pod yang menjawab", "t5-rollout/tanpa-router.txt", "A", /= 25\.0%/],
  [11, "Dengan 20 replika bagiannya 1 dari 20", "t5-rollout/tanpa-router.txt", "A", /Pod v1: 19, pod v2: 1; replika yang diminta 20/],
  [11, "bobot 95 dan 5", "t5-rollout/gateway.txt", "B", /95/],
  [11, "`sakelar.txt` bagian D", "t5-rollout/sakelar.txt", "D", /Sakelar dari tabel/],
  [12, "520 dari 620 mendapat 429", "t5-waf/kuota.txt", "C", /429 = 520/],
  [12, "A mendapat 100 jawaban 200 dan 500 jawaban 429", "t5-waf/kuota.txt", "A", /mitra A: 600 permintaan -> 200: 100, 429: 500/],
  [12, "B tetap 20 dari 20", "t5-waf/kuota.txt", "A", /mitra B: 20 permintaan -> 200: 20, 429: 0/],
  [12, "dua baris `qr`", "t5-waf/tandatangan.txt", "A", /qr/],
  [12, "(`testing.txt` bagian A)", "t5-waf/testing.txt", "A", /./],
  [13, "token tanpa hak `decrypt` dijawab 403", "t5-kms/arsip.txt", "C", /403/],
  [13, "pemeriksaan keaslian AES-GCM gagal", "t5-kms/arsip.txt", "D", /GCM/],
  [14, "satu trace dengan tiga span di dua service", "t5-service/jejak.txt", "A", /403/],
  [14, "211 trace dan menyimpan 16", "t5-service/jejak.txt", "B", /211[\s\S]*16|16[\s\S]*211/],
  [16, "menyelesaikan 20.833 permintaan", "api-t5/beban.txt", "A", /20833/],
];

describe("angka dan batas di enam belas kalimat: dari rekaman lab dan halaman asal", () => {
  test("tiap kutipan rekaman (berkas dan bagian) menunjuk bagian yang ada, dan lab-nya terpilih tak ambigu", () => {
    let dihitung = 0;
    for (const b of [...butirSemua.map((x) => ({ no: x.no, teks: x.teks })), { no: 0, teks: blok("Kunci") }]) {
      let sekarang = "";
      let labTerakhir = "";
      const potongan = b.teks.split(/(?=`[a-z0-9-]+\.txt`)/);
      for (const p of potongan) {
        const f = p.match(/^`([a-z0-9-]+\.txt)`/);
        if (f) sekarang = f[1]!;
        const lab = p.match(/lab ((?:api|t5)-[a-z0-9-]+)/);
        if (lab) labTerakhir = lab[1]!;
        for (const h of p.matchAll(/bagian ([A-Z])\b/g)) {
          expect(sekarang, `butir ${b.no}: bagian ${h[1]} tanpa berkas`).not.toBe("");
          const kandidat = labDari(sekarang);
          const lab2 = kandidat.length === 1 ? kandidat[0]! : labTerakhir;
          expect(kandidat, `butir ${b.no}: ${sekarang} tidak ada di labs`).toContain(lab2);
          bagianRekaman(lab2, sekarang, h[1]!);
          dihitung++;
        }
      }
    }
    expect(dihitung).toBeGreaterThanOrEqual(45);
  });
  test("fakta per butir: kalimatnya ada di butir itu dan polanya ada di bagian rekaman yang disebut", () => {
    for (const [no, kalimat, sumber, huruf, pola] of FAKTA) {
      expect(butir(no).teks, `butir ${no}: ${kalimat}`).toContain(kalimat);
      const [lab, berkas] = sumber.split("/") as [string, string];
      expect(bagianRekaman(lab, berkas, huruf), `${sumber} bagian ${huruf}`).toMatch(pola);
    }
  });
  test("butir 5: foreign key lintas schema 18 ke 0 dan bagian E rekaman skema, dari halaman asal dan rekaman", () => {
    expect(butir(5).teks).toContain("turun dari 18 ke 0 (`skema.txt` bagian E, lab api-t5)");
    expect(bagianRekaman("api-t5", "skema.txt", "E")).toMatch(/18/);
    expect(fileHalaman("t5-m44")).toContain("18 sebelum pembagian dan 0 sesudahnya (`skema.txt` bagian E)");
  });
  test("butir 4, 11, 12: huruf bagian diturunkan dari rekaman, bukan dari halaman asal", () => {
    // snapshot.txt: 1.800.000 di bagian A, 8,3% di bagian C (bagian B adalah job snapshot per bulan).
    expect(bagianRekaman("t5-partisi", "snapshot.txt", "B")).not.toMatch(/8,3%/);
    expect(bagianRekaman("t5-partisi", "lepas.txt", "E")).not.toMatch(/10061/);
    expect(bagianRekaman("t5-rollout", "sakelar.txt", "D")).toMatch(/Sakelar dari tabel/);
    expect(labDari("kuota.txt").sort()).toEqual(["t5-fanout", "t5-waf"]);
    expect(butir(12).teks).toContain("(`kuota.txt` bagian C, lab t5-waf)");
  });
  test("hitungan dari angka yang tertulis di halaman", () => {
    expect(6 * 3 * 10).toBe(180);
    expect(100 - 3).toBe(97);
    expect(180 - 97).toBe(83);
    expect(Math.round(1388.9 * 0.02 * 10) / 10).toBe(27.8);
    expect(2 * 6 * 20).toBe(240);
    expect(Math.round(((14.4 * 1) / 720) * 100)).toBe(2);
    expect(20420 - 18690).toBe(1730);
    expect(480 * 3).toBe(1440);
    expect(1440 - 1150).toBe(290);
    const t = butir(8).teks + butir(14).teks + butir(15).teks;
    for (const s of ["6 × 3 × 10 = 180", "100 − 3 = 97", "1.388,9 × 0,02 = 27,8", "2 × 6 × 20 = 240", "14,4 × 1 ÷ 720 = 2%", "20.420 − 18.690", "480 × 3 = 1.440", "1.730", "1.150"]) {
      expect(t, s).toContain(s);
    }
    expect(Math.round((1388.9 * 10 * 10) / 10) / 10).toBeCloseTo(1388.9, 1);
    expect(butir(16).teks).toContain("Puncak 1.388,9 request per detik menjadi 13.888,9");
    expect(butir(16).teks).toContain("69,4 menjadi 694,4");
    expect(butir(16).teks).toContain("46,3 dan 463,0");
    const asal = fileHalaman("t5-m51");
    for (const s of ["13.888,9", "694,4", "463,0"]) expect(asal).toContain(s);
  });
  test("tiap angka kunci di halaman asal: ada di teks halaman yang dirujuk butir itu", () => {
    const ASAL: [number, string, string][] = [
      [1, "t5-m40", "6.667 dari 6.667"], [2, "t5-m41", "Rp35.000"], [3, "t5-m42", "23 menit"], [4, "t5-m43", "438 juta"],
      [5, "t5-m44", "14 menit"], [6, "t5-service", "Prime Video"], [7, "t5-m45", "96,3"], [8, "t5-m46", "27,8"],
      [9, "t5-m47", "Rp1.000"], [10, "t5-m48", "Rp100.000"], [11, "t5-m49", "25,0%"], [12, "t5-m50", "3.000"],
      [14, "t5-tim-infra", "43,2 menit"], [15, "t5-onprem", "1.730"], [16, "t5-m51", "20.833"],
    ];
    for (const [no, id, s] of ASAL) {
      expect(fileHalaman(id), `${id}: ${s}`).toContain(s);
      expect(butir(no).teks, `butir ${no}`).toContain(s === "23 menit" ? "23 menit" : s === "14 menit" ? "14 menit" : s);
    }
    expect(fileHalaman("t5-service")).toContain("22 Maret 2023");
    expect(fileHalaman("t5-service")).toContain("lebih dari 90%");
    expect(butir(6).teks).toContain("22 Maret 2023");
    expect(butir(6).teks).toContain("lebih dari 90%");
    expect(fileHalaman("t5-onprem")).toContain("20.420 − 18.690");
    expect(fileHalaman("t5-onprem")).toContain("480 × 3 = 1.440");
    expect(fileHalaman("t5-tim-infra")).toContain("14,4 × 1 ÷ 720 = 2%");
    expect(fileHalaman("t5-pooler")).toContain("2 × 6 × 20 = 240");
  });
  test("butir 13 dibaca dari halaman 5.26 hanya bila sudah di main, dan 9,8 tahun ditulis sebagai jarak rotasi", () => {
    expect(butir(13).teks).toContain("jarak rotasi per versi kunci");
    expect(butir(13).teks).toContain("bukan umur kunci");
    expect(mdx.match(/9,8 tahun/g)!.length).toBe(1);
    if (per("t5-kms").ada) {
      const k = fileHalaman("t5-kms");
      expect(k).toContain("9,806 tahun");
      expect(k).toContain("jarak rotasi terjauh per versi kunci");
      expect(k).toContain("28.000 baris");
    } else {
      expect(per("t5-kms").path).toBe("tahap-5/arsip-envelope-encryption.md");
    }
  });
  test("bentuk lama yang dikoreksi halaman asal tidak muncul lagi", () => {
    const LAMA: RegExp[] = [
      /umur KEK/i, /FIRST 1[^.]*pilihan B/i, /8 MB/, /Parallel Append/, /tanpa token[^.]*membaca primary/i, /asinkron menjamin RPO nol/,
      /bobot 1 sampai 99/, /tidak ada rute/, /aman bila jarak/,
    ];
    for (const re of LAMA) expect(mdx, String(re)).not.toMatch(re);
    expect(mdx).toContain("replica asinkron tidak menjamin RPO nol");
    expect(mdx).toContain("bacaan tanpa token dijawab replica dengan saldo Rp215.000");
    expect(mdx).toContain("tetap dilayani replica dan bisa melihat saldo lama");
    expect(mdx).toContain("celah itu tidak ditutup di lab");
    expect(mdx).toContain("Batas uji 50 ms di lab berbeda dari anggaran lompatan 50 ms di ADR 37");
    expect(mdx).toContain("`MaxConns`".replace("`MaxConns`", "`default_pool_size` 20"));
    expect(mdx).toContain("bisa membuka 2 × 6 × 20 = 240 koneksi");
    expect(mdx).toContain("kode v1.10.1 menyisakan satu pod baru (dibaca dari kode)");
    expect(mdx).toContain("adalah batas atas, Hitungan atas Asumsi");
  });
  test("klaim negatif berlingkup: 'tidak ada' dan 'tidak' di halaman menyebut lingkupnya", () => {
    expect(butir(5).teks).toContain("`api-t5` adalah satu proses dengan satu role");
    expect(butir(6).teks).toContain("data besar tidak diperagakan");
    expect(butir(7).teks).toContain("Lab tidak mengirim pengumuman ke 1.000.000 HP");
    expect(butir(9).teks).toContain("NetworkPolicy Tidak dijalankan");
    expect(butir(10).teks).toContain("pengulangan +25 jam untuk versi benar Tidak dijalankan");
    expect(butir(13).teks).toContain("pemisahan tempat Tidak dijalankan");
    expect(blok("Paham")).toContain("Hal yang ditulis terbuka di halamannya belum diuji.");
    for (const [no, id, s] of [
      [5, "t5-m44", "tidak direkam"], [9, "t5-m47", "NetworkPolicy"], [10, "t5-batch", "Tidak dijalankan"], [12, "t5-waf", "testing.txt"],
    ] as [number, string, string][]) expect(fileHalaman(id), `${id}: ${s}`).toContain(s);
    expect(fileHalaman("t5-batch")).toContain("+25 jam untuk versi benar Tidak dijalankan");
    expect(butir(10).teks).toContain("satu proses yang mati di lab meninggalkan paling banyak satu angsuran dalam keadaan itu");
    expect(fileHalaman("t5-m48")).toContain("satu proses yang mati meninggalkan paling banyak satu angsuran dalam keadaan itu");
    expect(fileHalaman("t5-m48")).toContain("Job lab menagih angsuran satu per satu menurut urutan jadwal dan ke");
  });
});

describe("kartu tebak lalu buka t5-rekap-kartu.json", () => {
  test("16 kartu berurut: halaman kejadian, judul, dan url diturunkan dari registry dan halaman", () => {
    expect(kartu.length).toBe(16);
    kartu.forEach((k, i) => {
      expect(k.id).toBe(`t5-rekap-k${i + 1}`);
      expect(k.halaman, k.id).toBe(kejadianId(i + 1));
      expect(k.url, k.id).toBe(urlHalaman(k.halaman));
      expect(k.judul, k.id).toBe(judulTampil(k.halaman));
    });
  });
  test("jawaban diawali kalimat butir yang sama dan menyebut ADR yang sama, dan tanya tidak memuat jawabannya", () => {
    kartu.forEach((k, i) => {
      const b = butir(i + 1);
      expect(k.jawab.startsWith(b.kalimat), k.id).toBe(true);
      const adr = PETA[i]![1];
      if (adr) expect(k.jawab, k.id).toContain(`ADR ${adr}`);
      expect(k.tanya, k.id).not.toContain(b.kalimat.slice(0, 40));
      expect(k.tanya.endsWith("Kalimat apa yang lahir?"), k.id).toBe(true);
    });
  });
  test("kalimat butir belum tertulis di blok Mulai dan Coba, supaya tebakan tidak terjawab di atasnya", () => {
    const atas = blok("Mulai") + blok("Coba");
    for (const b of butirSemua) expect(atas, `butir ${b.no}`).not.toContain(b.kalimat.slice(0, 40));
  });
  test("kartu masuk kartu.json turunan sebagai 5 soal Cek diri halaman ini, dan kartu tebak memakai 16 kartu rekap", () => {
    const turunan = kartuSemua.filter((k) => k.halaman === "t5-rekap");
    expect(turunan.length).toBe(5);
    turunan.forEach((k, i) => expect(k.id).toBe(`t5-rekap-${i + 1}`));
    expect(mdx).toContain('<WidgetLama nama="kartu" src="data/t5-rekap-kartu.json" />');
  });
  test("teks kartu dan diagram dikunci per nilai", () => {
    const kumpul = (x: unknown, out: string[]): string[] => {
      if (typeof x === "string") out.push(x);
      else if (Array.isArray(x)) x.forEach((y) => kumpul(y, out));
      else if (x && typeof x === "object") for (const k of Object.keys(x).sort()) kumpul((x as Record<string, unknown>)[k], out);
      return out;
    };
    expect(kumpul(kartu, [])).toEqual(TEKS_KARTU);
    expect(kumpul(kejadianMentah, [])).toEqual(TEKS_DIAGRAM);
  });
});

describe("Cek diri, daftar periksa, dan butir belum diuji", () => {
  const kunci = blok("Kunci");
  test("tepat lima soal Cek diri, dan jawabannya memuat rujukan rekaman atau label", () => {
    const soal = kunci.split("\n").filter((b) => /^\*\*\d\.\*\*/.test(b));
    expect(soal.length).toBe(5);
    expect((kunci.match(/<details class="success">/g) ?? []).length).toBe(5);
    expect(kunci).toContain("Tanpa token, replica menjawab Rp215.000, saldo lama. Dengan token, server membaca primary dan menjawab Rp203.000 (`baca.txt` bagian B).");
    expect(kunci).toContain("Nol dari lima untuk replica asinkron (`promosi.txt` bagian A).");
    expect(kunci).toContain("Satu pod versi baru, yaitu 25,0% dari pod yang menjawab, bukan 5% (`tanpa-router.txt` bagian A).");
  });
  test("enam butir daftar periksa menaut halaman yang ada dan enam butir 'belum diuji' menaut halaman yang memuatnya", () => {
    const periksa = kunci.split("\n").filter((b) => b.startsWith("- [ ] "));
    expect(periksa.length).toBe(6);
    const belum = blok("Paham").slice(blok("Paham").indexOf("### Yang belum diuji")).split("\n").filter((b) => b.startsWith("- "));
    expect(belum.length).toBe(8);
    for (const b of [...periksa, ...belum]) {
      const ids = idDalam(b);
      expect(ids.length, b).toBe(1);
      per(ids[0]!);
    }
    expect(idDalam(belum.join("\n"))).toEqual(["t5-m51", "t5-rpo-rto", "t5-service", "t5-mtls", "t5-batch", "t5-rollout", "t5-kms", "t5-onprem"]);
  });
});

describe("struktur: heading, label, sumber ingatan, tanpa ID internal, dan kata yang dilarang", () => {
  test("lima blok berurut, dua pertama terbuka, dan heading h3 tetap", () => {
    expect([...mdx.matchAll(/<Blok nama="([^"]+)"( buka)?/g)].map((m) => [m[1], !!m[2]])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
    expect(barisMdx.filter((b) => /^#{2,6} /.test(b))).toEqual([
      "## Inti", "### Kenapa ini ada", "### Enam belas kalimat", "### Yang belum diuji", "### Lima belas keputusan Tahap 5", "### Cek diri",
      "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
  });
  test("sumber ingatan: Roediger dan Cepeda dari baris riset, dengan tanggal akses yang sama di semua kemunculan", () => {
    const baris = riset5.split("\n").find((b) => b.startsWith("| R5-260 |"))!;
    expect(baris).toContain("PMID 16507066 = Roediger & Karpicke");
    expect(baris).toContain("PMID 16719566 = Cepeda dkk.");
    expect(baris).toContain("dibuka 2026-11-05");
    expect([...mdx.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1])).toEqual(["2026-11-05"]);
    expect(mdx).toContain("(https://pubmed.ncbi.nlm.nih.gov/16507066/)");
    expect(mdx).toContain("(https://pubmed.ncbi.nlm.nih.gov/16719566/)");
    expect(mdx).toContain("Roediger & Karpicke 2006");
    expect(mdx).toContain("Cepeda dkk. 2006, Psychological Bulletin 132(3)");
  });
  test("baris riset R5-260 sampai R5-264 berurut, tak ganda, dan di antara R5-259 dan R5-275", () => {
    const id = [...riset5.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => Number(m[1]!.slice(3)));
    expect(new Set(id).size).toBe(id.length);
    for (let i = 1; i < id.length; i++) expect(id[i]!).toBeGreaterThan(id[i - 1]!);
    const i260 = id.indexOf(260);
    expect(id.slice(i260 - 1, i260 + 6)).toEqual([259, 260, 261, 262, 263, 264, 275]);
    const baris = riset5.split("\n").filter((b) => /^\| R5-26[0-4] \|/.test(b));
    expect(baris.length).toBe(5);
    baris.forEach((b) => expect(b.split(/(?<!\\)\|/).length - 2, b.slice(0, 10)).toBe(5));
    expect(baris[2]).toContain("`snapshot.txt` memuat 1.800.000 dari 1.800.000 posting di bagian A dan 150.000 dari 1.800.000 (8,3%) di bagian C");
    expect(baris[2]).toContain("`lepas.txt` memuat 10.061 dari 10.288 buku tidak cocok di bagian F");
  });
  test("tanpa ID riset, nomor keputusan, nomor PR, label rekaman internal, dan komentar lab di teks tampil", () => {
    for (const s of [mdx, JSON.stringify(kartu), JSON.stringify(kejadianMentah)]) {
      expect(s).not.toMatch(/\bR\d-\d+/);
      expect(s).not.toMatch(/keputusan \d{3,4}/i);
      expect(s).not.toMatch(/\bPR #?\d{3}/);
      expect(s).not.toMatch(/#\d{3}\b/);
      expect(s).not.toMatch(/\bbagian [A-Z]\d\b/);
    }
    expect(frontmatter).toMatch(/^title: "5\.31 Yang dibawa keluar dari Tahap 5"$/m);
    expect(frontmatter).toContain("Enam belas kalimat dari Tahap 5, masing-masing terikat ke kejadian dan halaman asalnya. Ada kartu untuk menebaknya, ringkasan ADR 46 sampai 60, dan Cek diri gabungan.");
  });
  test("kata yang dilarang: emoji, 'Anda', 'layanan' (hanya untuk pihak ketiga tiruan), dan label turunan tanpa definisi", () => {
    expect(mdx).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(mdx).not.toMatch(/\bAnda\b|\bkita\b/i);
    expect(mdx).not.toMatch(/\blayanan\b/i);
    expect(mdx).toContain("Label Dipersempit menulis selisihnya, dan label Batas menulis yang tidak direkam atau tidak dijalankan di halaman asal.");
    expect(mdx).toContain("Hitungan berarti hasil rumus dari angka yang tertulis di halaman asalnya, berlabel sama dengan masukan terlemahnya.");
    expect(mdx).toContain("Arti label Rekaman lab, Asumsi, Ilustrasi, Tidak dijalankan, dan [perlu verifikasi] ada di [[A0]].");
    expect((mdx.match(/\*Dipersempit:\*/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((mdx.match(/\*Batas:\*/g) ?? []).length).toBeGreaterThanOrEqual(12);
  });
  test("kata-kata halaman dikunci per baris", () => {
    expect(barisMdx.length).toBe(BARIS_MDX.length);
    barisMdx.forEach((b, i) => expect(b, `baris ${i + 1}`).toBe(BARIS_MDX[i]));
  });
});
