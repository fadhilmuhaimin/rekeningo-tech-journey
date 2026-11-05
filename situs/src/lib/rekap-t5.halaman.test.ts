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

interface H { id: string; judul: string; tahap: number; path: string; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; prasyarat?: string[]; menit?: number; label?: string; masalah?: string }
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
  [4, "150.000, yaitu 8,3% (bagian C)", "t5-partisi/snapshot.txt", "C", /150\.000 dari 1\.800\.000, yaitu 8,3%/],
  [4, "SQLSTATE 23001 (`lepas.txt` bagian B)", "t5-partisi/lepas.txt", "B", /SQLSTATE 23001/],
  [4, "menandai 10.061 dari 10.288 buku, dan pemeriksaan dari snapshot menandai 0 (bagian F)", "t5-partisi/lepas.txt", "F", /10288 buku diperiksa, 10061 tidak cocok/],
  [4, "pemeriksaan dari snapshot menandai 0", "t5-partisi/lepas.txt", "F", /dari snapshot[^\n]*10288 buku diperiksa, 0 tidak cocok/],
  [5, "kode 42501", "api-t5/skema.txt", "F", /42501/],
  [6, "0 panggilan antar proses per transaksi", "t5-gabung/panggilan.txt", "B", /0 panggilan antar proses/],
  [6, "620,14 byte per transaksi tiap arah", "t5-gabung/panggilan.txt", "D", /620,14/],
  [6, "500 dari 500 transaksi tiga proses", "t5-gabung/latensi.txt", "B", /500 dari 500/],
  [7, "Satu pengumuman ke 10.281 perangkat menulis satu baris outbox dan enam rekaman Kafka", "t5-fanout/aliran.txt", "A", /10281/],
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
  [13, "Pada arsip 28.000 baris, token tanpa hak `decrypt` dijawab 403", "t5-kms/arsip.txt", "C", /403/],
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
    expect(butir(8).teks).toContain("1.388,9 × 0,02 = 27,8 (Hitungan atas Asumsi)");
    expect(butir(8).teks).toContain("tersedia 100 − 3 = 97");
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
    expect(mdx).toContain("Bacaan tanpa token dijawab replica dengan saldo Rp215.000");
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
    expect(butir(7).teks).toContain("Tiap perangkat melihat satu notifikasi berbeda, tetapi pengiriman tepat satu kali tidak dijamin.");
    expect(fileHalaman("t5-fanout")).toContain("Pengiriman tepat satu kali tidak dijamin.");
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
    expect(mdx).toContain(`<WidgetLama nama="kartu" src="data/t5-rekap-kartu.json" data-maks="${kartu.length}" />`);
    // MAKS_SESI widget kartu = 15: tanpa data-maks, kartu ke-16 tidak tampil di sesi pertama.
    expect(baca("situs/lama/widgets/kartu.js")).toMatch(/var MAKS_SESI = 15;/);
    expect(baca("situs/lama/widgets/kartu.js")).toContain("parseInt(host.dataset.maks, 10) || MAKS_SESI");
    expect(kartu.length).toBeGreaterThan(15);
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

// ---- lapisan tanpa kunci baris (tinjauan 5.31, keputusan 1623) -----------------------------------------------------------------
// Tes di bawah tidak membaca BARIS_MDX atau TEKS_KARTU: halaman yang dibangkitkan ulang dengan kunci baru tetap harus lolos. Angka
// diturunkan dari halaman asal dan rekaman, label dan kutipan rekaman per butir dikunci dalam tabel tulisan tangan di bawah (ubah
// sengaja = ubah tabel ini), dan kartu, tabel ADR, serta Mulai dan Kunci dibandingkan dengan butir yang mereka ringkas.
const bersih = (s: string): string =>
  s.replace(/\[\[[^\]]*\]\]/g, " ").replace(/`[^`]*`/g, " ").replace(/\(https?:[^)]*\)/g, " ").replace(/\b(?:api-t5|t5-[a-z0-9-]+)\b/g, " ");
const angkaDari = (s: string): string[] => [...bersih(s).matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]);
const varian = (a: string): string[] => [a, a.replace(/\./g, ""), a.replace(/\./g, "").replace(",", "."), a.replace(",", ".")];
const rekamanTahap5 = ((): string => {
  const hasil: string[] = [];
  for (const lab of fs.readdirSync(path.join(akar, "labs")).filter((l) => l === "api-t5" || l.startsWith("t5-"))) {
    const dir = path.join(akar, "labs", lab, "output");
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt"))) hasil.push(baca(`labs/${lab}/output/${f}`));
  }
  return hasil.join("\n");
})();
const gudangAngka = (teks: string): Set<string> => new Set(angkaDari(teks).flatMap(varian));
const kutipan = (teks: string): string[] => {
  let berkas = "";
  const hasil: string[] = [];
  for (const p of teks.split(/(?=`[a-z0-9-]+\.txt`)/)) {
    const f = p.match(/^`([a-z0-9-]+\.txt)`/);
    if (f) berkas = f[1]!;
    for (const h of p.matchAll(/bagian ([A-Z])\b/g)) hasil.push(`${berkas}:${h[1]}`);
  }
  return hasil;
};
const hitungLabel = (s: string): Record<string, number> => {
  const n = (re: RegExp): number => (s.match(re) ?? []).length;
  const r: Record<string, number> = {};
  r.HAD = n(/Hitungan atas Asumsi dan dokumentasi/g);
  r.HA = n(/Hitungan atas Asumsi/g) - r.HAD!;
  r.HI = n(/Hitungan atas Ilustrasi/g);
  r.HR = n(/Hitungan dari rekaman/g);
  r.AP = n(/Asumsi produk/g);
  r.A = n(/Asumsi/g) - r.HA! - r.HAD! - r.AP!;
  r.I = n(/Ilustrasi/g) - r.HI!;
  r.TD = n(/Tidak dijalankan/g);
  r.PV = n(/\[perlu verifikasi\]/g);
  r.DK = n(/dibaca dari kode/g);
  r.RL = n(/Rekaman lab/g);
  return Object.fromEntries(Object.entries(r).filter(([, v]) => v > 0));
};
// Label per butir: HA = Hitungan atas Asumsi, HAD = Hitungan atas Asumsi dan dokumentasi, HI = Hitungan atas Ilustrasi, HR = Hitungan dari
// rekaman, AP = Asumsi produk, A = Asumsi, I = Ilustrasi, TD = Tidak dijalankan, PV = [perlu verifikasi], DK = dibaca dari kode.
// Tiap label dibaca ke halaman asalnya dan ke kode lab saat tinjauan 5.31 (butir 1: tutup buku resmi; butir 8: 2 × 6 × 20 dari dokumentasi;
// butir 16: 141 = 2.115 ÷ 15 dari rekaman beban).
const LABEL: Record<number, Record<string, number>> = {
  1: { HA: 1, TD: 1 }, 2: {}, 3: { AP: 1, I: 1, TD: 1 }, 4: { A: 1, I: 1 }, 5: { I: 1, TD: 1 }, 6: { TD: 1 }, 7: { HA: 2 },
  8: { HAD: 1, HA: 2, TD: 1 }, 9: { TD: 1, PV: 1 }, 10: { I: 1, TD: 1 }, 11: { HA: 1, I: 1, TD: 1, DK: 1 }, 12: { HI: 1, A: 1, I: 1 },
  13: { HA: 1, TD: 1 }, 14: { HA: 1, AP: 1, TD: 1 }, 15: { I: 2, PV: 1 }, 16: { HA: 2, HR: 1, I: 1 },
};
const CITASI: Record<number, string[]> = {
  1: ["laporan.txt:B", "replika.txt:B", "baca.txt:A"], 2: ["baca.txt:A", "baca.txt:B", "jeda.txt:A"], 3: ["promosi.txt:A", "promosi.txt:B"],
  4: ["snapshot.txt:A", "snapshot.txt:C", "lepas.txt:B", "lepas.txt:F"], 5: ["skema.txt:E", "skema.txt:F"],
  6: ["panggilan.txt:B", "latensi.txt:B", "panggilan.txt:D"], 7: ["aliran.txt:A", "grup.txt:A", "antrean.txt:B"], 8: ["pooler.txt:A", "pooler.txt:B"],
  9: ["rentan.txt:A", "mtls.txt:B", "mtls.txt:C", "idempoten.txt:C"], 10: ["crash.txt:A", "crash.txt:B", "crash.txt:C"],
  11: ["tanpa-router.txt:A", "gateway.txt:B", "sakelar.txt:D"], 12: ["kuota.txt:C", "kuota.txt:A", "tandatangan.txt:A", "testing.txt:A"],
  13: ["arsip.txt:C", "arsip.txt:D"], 14: ["jejak.txt:A", "jejak.txt:B"], 15: [], 16: ["beban.txt:A"],
};
// Angka butir yang tidak tertulis di halaman asal atau rekaman: hasil hitungan dari angka yang tertulis di butir itu sendiri.
const BEBAS: Record<number, string[]> = {};

describe("lapisan tanpa kunci baris: angka, label, kutipan, tabel ADR, Mulai, Kunci, kartu, baris riset", () => {
  test("tiap angka di tiap butir ada di halaman asal butir itu, halaman PRD, atau rekaman Tahap 5", () => {
    for (const b of butirSemua) {
      const gudang = gudangAngka([...new Set([...b.ids, "t5-prd"])].map((id) => fileHalaman(id)).join("\n") + "\n" + rekamanTahap5);
      for (const a of angkaDari(b.teks)) {
        if (BEBAS[b.no]?.includes(a)) continue;
        expect(varian(a).some((v) => gudang.has(v)), `butir ${b.no}: angka ${a}`).toBe(true);
      }
    }
  });
  test("label sumber per butir: jumlah tiap label dikunci, dan 'Rekaman lab' tidak dipakai sebagai label di badan butir", () => {
    for (const b of butirSemua) expect(hitungLabel(b.teks), `butir ${b.no}`).toEqual(LABEL[b.no]);
  });
  test("kutipan rekaman per butir: berkas dan huruf bagian dikunci, dan mencakup tiap fakta yang dijaga FAKTA", () => {
    for (const b of butirSemua) expect(kutipan(b.teks), `butir ${b.no}`).toEqual(CITASI[b.no]);
    for (const [no, kalimat, sumber, huruf] of FAKTA) {
      const berkas = sumber.split("/")[1]!;
      expect(kutipan(butir(no).teks), `butir ${no}: ${kalimat}`).toContain(`${berkas}:${huruf}`);
    }
  });
  test("tabel ADR: keputusan memuat kata penanda yang juga ada di halaman ADR-nya, dan kejadian M cocok dengan peta", () => {
    const PENANDA: Record<number, string> = {
      46: "asinkron", 47: "Tiga kelas baca", 48: "kuorum", 49: "per bulan", 50: "Enam service", 51: "Kafka", 52: "PgBouncer", 53: "mTLS",
      54: "Referensi unik", 55: "Argo Rollouts", 56: "WAF", 57: "data key per file arsip", 58: "tail sampling", 59: "cloud milik PT", 60: "Dua belas butir",
    };
    const tabel = blok("Putuskan").split("\n").filter((b) => /^\| \d+ \|/.test(b));
    expect(tabel.length).toBe(15);
    tabel.forEach((baris, i) => {
      const n = 46 + i;
      const sel = baris.split("|").map((x) => x.trim());
      expect(sel[2]!, `ADR ${n} di tabel`).toContain(PENANDA[n]!);
      expect(fileHalaman(idAdr(n)).toLowerCase(), `ADR ${n} di halaman`).toContain(PENANDA[n]!.toLowerCase());
      const m = sel[3]!.match(/^M(\d+),/);
      const diPeta = n === 60 ? 51 : PETA.find((p) => p[1] === n && p[0])?.[0];
      if (diPeta) expect(Number(m?.[1]), `ADR ${n} lahir dari`).toBe(diPeta);
      else expect(m, `ADR ${n} tanpa M`).toBeNull();
    });
    expect(blok("Putuskan")).toContain("ADR 50 menjalankan jadwal Kubernetes dari ADR 12");
    expect(fileHalaman("t5-service")).toContain("ADR 12 menjadwalkan Kubernetes di Tahap 5");
    expect(blok("Putuskan")).not.toMatch(/merevisi ADR 12|60 koneksi/);
  });
  test("Mulai: Rantai ringkas, tiga pertanyaan diturunkan dari butir 3, 10, dan 11, dan kalimat hitungan kalimat", () => {
    const mulai = blok("Mulai");
    const KATA: Record<number, string> = { 15: "Lima belas", 16: "Enam belas" };
    expect(mulai).toContain("<Rantai data={kejadian} ringkas />");
    expect((mulai.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect(mulai).toContain(`Tahap 5 meninggalkan ${KATA[butirSemua.length]!.toLowerCase()} kalimat, satu per konsep.`);
    const tanya = mulai.split("\n").filter((b) => /^\d\. /.test(b));
    expect(tanya.length).toBe(3);
    expect(mulai).toContain(`<summary>Sudah tahu? Cek ${tanya.length} pertanyaan</summary>`);
    expect(mulai).toContain("Yakin dengan ketiganya? Lompat ke [[berikutnya]].");
    expect(butir(3).teks).toContain("Lima pembayaran dijawab 201, dan nol dari lima");
    expect(tanya[0]).toContain("Lima pembayaran dijawab 201, lalu replica asinkron dipromosikan. Kenapa tak satu pun ada di node baru?");
    expect(butir(11).teks).toContain("tiga replika dan `setWeight: 5`");
    expect(tanya[1]).toContain("Satu pod versi baru dari tiga pod diberi bobot 5. Kenapa bagiannya bukan 5%?");
    expect(butir(10).teks).toContain("diulang 25 jam kemudian, saat key 24 jam");
    expect(tanya[2]).toContain("Angsuran Budi dijalankan lagi 25 jam sesudah job mati. Kenapa jurnalnya dua?");
    expect(blok("Putuskan")).toContain(`### ${KATA[tabelNaskah.filter((x) => x.kalimat).length - 1]} keputusan Tahap 5`);
    expect(blok("Paham")).toContain(`### ${KATA[butirSemua.length]} kalimat`);
  });
  test("Kunci: lima Jawaban, Cek diri 3 dan 5 diturunkan dari butir 8 dan 11, dan skrip dan label widget kartu ada", () => {
    const kunci = blok("Kunci");
    expect((kunci.match(/<summary>Jawaban<\/summary>/g) ?? []).length).toBe(5);
    const h = butir(8).teks.match(/meminta (\d+) × (\d+) × (\d+) = (\d+) koneksi/)!;
    const KATA_ANGKA: Record<string, string> = { 3: "tiga", 6: "Enam" };
    expect(kunci).toContain(`**3.** ${KATA_ANGKA[h[1]!]} service punya ${KATA_ANGKA[h[2]!]} pod tiap service dengan pool ${h[3]}`);
    expect(kunci).toContain(`Diminta ${h[1]} × ${h[2]} × ${h[3]} = ${h[4]} dan tersedia 100 − 3 = 97`);
    expect(butir(8).teks).toContain("Yang tersedia 100 − 3 = 97 (100 koneksi, 3 di antaranya cadangan)");
    expect(kunci).toContain("**5.** Rollout tanpa traffic router memakai tiga replika dan `setWeight: 5`.");
    expect(kunci).toContain("Satu pod versi baru, yaitu 25,0% dari pod yang menjawab, bukan 5%");
    expect(mdx).toContain('<SkripLama daftar={["cerita","kartu"]} />');
    expect(baca("situs/lama/widgets/kartu.js")).toContain("Ingat");
    expect(blok("Coba")).toContain("Kartu yang kamu tandai **Ingat** baru muncul lagi");
  });
  test("kartu: angka dan label di tanya dan jawab berasal dari butirnya, dan tanya tidak memuat empat kata berurutan dari kalimat butir", () => {
    kartu.forEach((k, i) => {
      const b = butir(i + 1);
      const teks = `${k.tanya} ${k.jawab}`;
      const gudang = gudangAngka(b.teks);
      for (const a of angkaDari(teks.replace(/\bM\d+\b/g, " "))) expect(varian(a).some((v) => gudang.has(v)), `${k.id}: angka ${a}`).toBe(true);
      for (const label of ["Tidak dijalankan", "Ilustrasi", "Hitungan atas Asumsi", "Asumsi produk"]) {
        if (teks.includes(label)) expect(b.teks, `${k.id}: ${label}`).toContain(label);
      }
      expect(k.jawab.includes("Rekaman lab"), `${k.id}: Rekaman lab`).toBe(false);
      if (k.jawab.includes("Batas:")) expect(b.teks, `${k.id}: Batas`).toContain("*Batas:*");
      if (k.jawab.includes("Dipersempit:")) expect(b.teks, `${k.id}: Dipersempit`).toContain("*Dipersempit:*");
      const kata = b.kalimat.split(/\s+/);
      for (let j = 0; j + 4 <= kata.length; j++) {
        const jendela = kata.slice(j, j + 4).join(" ");
        expect(k.tanya.includes(jendela), `${k.id}: tanya memuat "${jendela}"`).toBe(false);
      }
    });
  });
  test("koreksi tinjauan: bentuk lama tidak kembali (keduanya dari replica, merevisi ADR 12, qr tanpa lingkup, 25% untuk dua replika)", () => {
    expect(mdx).not.toMatch(/Keduanya dibaca dari replica|merevisi ADR 12|pada service kedua dan seterusnya|bagiannya 25,0% atau 33,3% menurut `maxSurge`\./);
    expect(butir(2).teks).toContain("Saldo tampil dan riwayat dibaca dari replica yang pemutaran ulangnya ditahan");
    expect(fileHalaman("t5-m41")).toContain("GET saldo masih menjawab Rp250.000 dan GET riwayat masih satu baris. Keduanya membawa `X-Dibaca-Dari: replika`");
    expect(butir(2).teks).toContain("jawaban bayar membawa token, yaitu posisi primary di WAL sesudah COMMIT");
    expect(butir(12).teks).toMatch(/Di mode rentan, tempat Idempotency-Key opsional seperti di Tahap 4, dua POST yang sama tanpa key membuat dua baris `qr`\. Gerbang versi benar menjawab 400 tanpa key/);
    expect(bagianRekaman("t5-waf", "tandatangan.txt", "A")).toMatch(/POST tanpa Idempotency-Key\n\s+-> 400 idempotency-key-wajib/);
    expect(bagianRekaman("t5-waf", "tandatangan.txt", "A")).toMatch(/Mode rentan tanpa-idempoten-wajib[^\n]*\n[^\n]*qr milik merchant 30001: 2/);
    expect(butir(11).teks).toContain("Dengan tiga replika bagiannya 25,0% atau 33,3% menurut `maxSurge`, dan dengan 20 replika 5,0%.");
    expect(bagianRekaman("t5-rollout", "tanpa-router.txt", "A")).toMatch(/Pod v1: 19, pod v2: 1; replika yang diminta 20/);
    expect(rekamanTahap5).toContain("20 replika: 1 pod canary dan 19 pod stabil menjawab; bagian pod v2 5.0%");
    expect(butir(16).teks).toContain("2.115 pembayaran, jadi pembayaran datang 2.115 ÷ 15 = 141 per detik (Hitungan dari rekaman)");
    expect(bagianRekaman("api-t5", "beban.txt", "A")).toMatch(/201 x2115/);
    expect(bagianRekaman("api-t5", "beban.txt", "A")).toMatch(/15 detik/);
    expect(Math.round(2115 / 15)).toBe(141);
    expect(butir(8).teks).toContain("Pada puncak 1.388,9 request per detik dengan 0,02 detik per request");
    expect(butir(14).teks).toContain("dengan 720 jam dalam 30 hari");
    expect(24 * 30).toBe(720);
    expect(Math.round(((2000000 * 60) / 86400) * 10 * 10) / 10).toBe(13888.9);
    expect(butir(15).teks).toContain("480 × 3 = 1.440 (480 per orang per tahun, tiga tahun)");
    expect(butir(4).teks).toContain("Di run lab terpisah dengan 28.000 posting per bulan");
    expect(butir(6).teks).toContain("Batas bawahnya 6 × 10 = 60 ms (`latensi.txt` bagian B)");
    expect(bagianRekaman("t5-gabung", "latensi.txt", "B")).toMatch(/jeda 10 ms: batas bawah 60 ms[^\n]*500 dari 500/);
    const KATA: Record<number, string> = { 15: "Lima belas", 16: "enam belas" };
    const tanpaRekaman = butirSemua.filter((b) => kutipan(b.teks).length === 0).map((b) => b.no);
    expect(tanpaRekaman).toEqual([15]);
    expect(blok("Paham")).toContain(`${KATA[butirSemua.length - tanpaRekaman.length]} dari ${KATA[butirSemua.length]} kalimat punya rekaman lab yang dijalankan di mesin lokal`);
    expect(blok("Paham")).toContain(`Butir ${tanpaRekaman[0]} hanya punya model Ilustrasi tanpa lab.`);
    expect(blok("Kunci")).toContain("database menerima 100 koneksi dengan 3 di antaranya cadangan");
  });
  // Kata kartu (4 huruf atau lebih) yang boleh tidak ada di butirnya atau di tabel ADR: pertanyaan baku, penghubung, dan parafrase kartu.
  const LONGGAR = new Set([
    "batasnya", "berjalan", "biayanya", "dalam", "dibuka", "dipilih", "diputus", "galat", "kalimat", "kapan", "kill", "kode", "kolom", "lahir",
    "lalu", "memuat", "menerima", "menggabungkan", "menjalankan", "menjawab", "menurut", "menyetujui", "replay", "sedangkan", "switch", "yang",
  ]);
  // Klaim kunci per butir: kalimat di butir dan kalimat sumbernya (halaman asal atau rekaman). Tes ini menjaga kalimat naratif dan angka kecil
  // yang lolos penjaga angka (angka yang sama ada di tempat lain). Tiap sumber dibaca saat tinjauan 5.31 (keputusan 1623).
  const norm = (s: string): string => s.toLowerCase().replace(/`/g, "").replace(/\s+/g, " ");
  const H = (id: string) => ({ jenis: "halaman" as const, id });
  const R = (pola: string | RegExp) => ({ jenis: "rekaman" as const, pola });
  const KLAIM: [number, string, ReturnType<typeof H> | ReturnType<typeof R>, string | RegExp][] = [
    [1, "Standby menolak UPDATE", R("cannot execute UPDATE in a read-only transaction"), ""],
    [1, "selama 10 detik", R("-detik 10 "), ""],
    [3, "RTO 15 menit", H("t5-prd"), "RTO 15 menit"],
    [3, "primary tetap menerima pembayaran", R("Primary terus menerima pembayaran"), ""],
    [3, "tiga jurnal yang dijawab 201 ada di node baru", R(/IN \(10201, 10202, 10203\)\n jurnal_ada\n-+\n 3\n/), ""],
    [3, "Latihan failover bulanan adalah aturan ADR 48, bukan rekaman", H("t5-rpo-rto"), "latihan bulanan SRE (ADR 48)"],
    [4, "Ledger menolak `DELETE` atas posting dengan SQLSTATE 23001", H("t5-m43"), "Ledger menolak `DELETE` atas posting dengan SQLSTATE 23001"],
    [4, "lab memilih 150.000 posting per bulan", H("t5-m43"), "Lab memilih 150.000 posting per bulan"],
    [4, "tetapi tidak menambah kapasitas tulis satu primary", H("t5-partisi"), "partisi tidak menambahnya"],
    [5, "Lab memecah 30 tabel ke enam schema", H("t5-m44"), "memecah 30 tabel ke enam schema"],
    [5, "rekaman memecah data, bukan proses", H("t5-m44"), "Rekaman memecah data, bukan proses"],
    [5, "Role ledger membaca `id`, `tingkat`, dan `status` tabel `akun`, sedangkan `nama` ditolak", R("SELECT id, tingkat, status FROM t5_akun.akun LIMIT 1   -- berhasil"), ""],
    [6, "satu alur skor untuk 400 transaksi", R("400 transaksi diproses"), ""],
    [6, "tiga proses dengan queue melakukan 6", R("panggilan per transaksi (dibawa pesan): 6 pada 400 dari 400"), ""],
    [6, "jeda buatan 10 ms per panggilan membuat 500 dari 500", R("jeda 10 ms: batas bawah 60 ms"), ""],
    [6, "tidak membuktikan ledger Rekeningo harus digabung", H("t5-service"), "tidak membuktikan bahwa ledger Rekeningo harus digabung"],
    [6, "ditulis karyawannya sendiri", H("t5-service"), "penulisnya karyawan perusahaan yang menulis tentang sistemnya sendiri"],
    [7, "Notifikasi uang tidak lewat Kafka", H("t5-fanout"), "uang tetap di outbox"],
    [8, "12 client dengan pool 10 meminta 120 koneksi", R("koneksi diminta: 120"), ""],
    [8, "Lewat PgBouncer, 120 koneksi berhasil", R("koneksi diminta: 120, berhasil: 120"), ""],
    [8, "rekaman bukan latihan failover", H("t5-m46"), "Rekaman ini bukan latihan failover"],
    [9, "empat sertifikat yang salah ditolak saat handshake dan jurnal tetap 0", R(/jurnal_sesudah\n-+\n 0\n/), ""],
    [9, "mTLS membuktikan siapa yang memanggil, bukan niatnya", H("t5-mtls"), "mTLS membuktikan siapa yang memanggil, bukan niatnya"],
    [9, "Key baru dengan akun dan jumlah yang sama tetap menghasilkan jurnal kedua", H("t5-mtls"), "dengan akun dan jumlah yang sama, menghasilkan jurnal kedua"],
    [10, "versi pertama tidak menagih ganda, tetapi angsurannya tetap `menunggu`", H("t5-m48"), "tidak menagih ganda, tetapi angsurannya tetap menunggu"],
    [11, "Rasio tolak 31% di cerita", H("t5-m49"), "31%"],
    [11, "Flag di memori hanya mengubah pod yang menerima permintaannya", R("Yang menolak hanya pod yang diubah; pod 2 dan pod 3 tetap menyetujui otorisasi baru"), ""],
    [11, "Dengan Gateway API, plugin menulis bobot 95 dan 5 ke HTTPRoute", R('HTTPRoute kartu-route, bobot sekarang: {"kartu-stable": 95, "kartu-canary": 5}'), ""],
    [11, "Rollout tanpa traffic router, yaitu komponen yang menggeser lalu lintas antar versi", H("t5-rollout"), "komponen yang menggeser lalu lintas antar versi"],
    [12, "satu bucket 100 per detik dipakai semua mitra", R("satu bucket 100 untuk 620 permintaan"), ""],
    [12, "mitra B 20 dalam satu detik", R("mitra B: 20 permintaan"), ""],
    [12, "jam bucket dibekukan, jadi itu hitungan token, bukan laju sungguhan", R("Jam bucket dibekukan"), ""],
    [12, "dan celah itu tidak ditutup di lab", H("t5-waf"), "Belum ada penahan untuk permintaan yang diputar ulang di dalam jendela dengan key lain"],
    [12, "dan kapasitas server belum diukur", H("t5-m50"), "kapasitas server tidak diukur"],
    [13, "Satu bit yang dibalik membuat pemeriksaan keaslian AES-GCM gagal", H("t5-kms"), "membalik satu bit di lima posisi file"],
    [13, "OpenBao dan folder arsip di lab berada di satu mesin, dan pemisahan tempat Tidak dijalankan", H("t5-kms"), "OpenBao dan folder arsip berada di satu mesin, dan pemisahan tempat Tidak dijalankan"],
    [14, "11 dari 11 trace berkesalahan", R("trace berkesalahan tersimpan   : 11 dari 11"), ""],
    [14, "Lab merekam satu Collector, dan kapasitasnya tidak diukur", H("t5-tim-infra"), "Kapasitas satu Collector tidak diukur"],
    [14, "Alert burn rate 14,4 selama 1 jam menghabiskan", H("t5-tim-infra"), "| 1 jam | 5 menit | 14,4 | 2% |"],
    [15, "ADR 59 tetap di cloud milik PT dan menjaga jalan keluar", H("t5-onprem"), "tetap di cloud milik PT dan menjaga jalan keluarnya"],
    [15, "sehingga urutannya terbalik", H("t5-onprem"), "urutannya terbalik"],
    [15, "Tanpa orang tambahan, on-prem lebih hemat 1.150", H("t5-onprem"), "on-prem lebih hemat 1.150"],
    [16, "2.000.000 × 60 ÷ 86.400 × 10 = 13.888,9", H("t5-m51"), "2.000.000 × 60 ÷ 86.400 × 10"],
    [16, "Satu rekaman beban di satu laptop", H("t5-m51"), "di satu laptop"],
    [16, "dalam 15 detik", R("15 detik pada 1388.9"), ""],
    [16, "Tiga hal yang diminta PRD v6 belum pernah diuji", H("t5-m51"), "Tiga hal yang belum pernah diuji"],
    [16, "skor risiko real-time dalam 50 ms antar host", H("t5-m51"), "Skor risiko real-time dalam 50 ms"],
    [16, "28 orang menjadi lebih dari 50", H("t5-m51"), "28 orang menjadi lebih dari 50"],
  ];
  test("klaim kunci: kalimat di butir dan kalimat sumbernya (halaman asal atau rekaman Tahap 5)", () => {
    for (const [no, kalimat, sumber, frasa] of KLAIM) {
      expect(norm(butir(no).teks), `butir ${no}: ${kalimat}`).toContain(norm(kalimat));
      if (sumber.jenis === "halaman") expect(norm(fileHalaman(sumber.id)), `${sumber.id}: ${frasa}`).toContain(norm(String(frasa)));
      else if (typeof sumber.pola === "string") expect(rekamanTahap5, `rekaman: ${sumber.pola}`).toContain(sumber.pola);
      else expect(rekamanTahap5, `rekaman: ${sumber.pola}`).toMatch(sumber.pola);
    }
    expect((bagianRekaman("t5-service", "mtls.txt", "B").match(/alert dari server/g) ?? []).length).toBe(4);
    expect(per("t5-rekap").jenis).toBe("konsep");
    expect(kartu[11]!.jawab).toContain("jam bucket dibekukan");
    expect(butir(12).teks).toContain("jam bucket dibekukan");
    expect(per("t5-rekap").masalah ?? "").toContain("enam belas konsep Tahap 5");
  });
  test("kutipan di Cek diri dan 'Di [[halaman]]' pertama tiap butir cocok dengan peta dan rekaman", () => {
    expect(kutipan(blok("Kunci"))).toEqual(["baca.txt:B", "promosi.txt:A", "promosi.txt:B", "crash.txt:C", "tanpa-router.txt:A"]);
    for (const b of butirSemua) {
      const m = b.teks.match(/\bDi \[\[([A-Za-z0-9.\-]+)\]\]/);
      if (m) expect(m[1], `butir ${b.no}`).toBe(kejadianId(b.no));
    }
    expect(blok("Putuskan")).toContain("ADR 59 menambah batas bentuk pada ADR 39 tanpa membatalkannya.");
    expect(fileHalaman("t5-onprem")).toContain("ADR ini tidak membatalkan ADR 39");
    const PERIKSA: [string, string][] = [
      ["Keputusan uang dibaca dari primary", "t5-read-replica"], ["Jawaban tulisan membawa token", "t5-lag"], ["Panggilan antar service", "t5-mtls"],
      ["Job berulang punya referensi unik", "t5-batch"], ["Kuota dihitung per mitra", "t5-waf"], ["Kapasitas satu primary", "t5-m51"],
    ];
    const periksa = blok("Kunci").split("\n").filter((b) => b.startsWith("- [ ] "));
    PERIKSA.forEach(([awal, id], i) => {
      expect(periksa[i], `periksa ${i + 1}`).toContain(awal);
      expect(idDalam(periksa[i]!), `periksa ${i + 1}`).toEqual([id]);
    });
  });
  test("sumber ingatan: tautan PubMed, volume, dan nomor terbitan di halaman sama dengan baris riset R5-260", () => {
    const r260 = riset5.split("\n").find((b) => b.startsWith("| R5-260 |")) ?? "";
    expect([...mdx.matchAll(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\//g)].map((x) => x[1]).sort()).toEqual(["16507066", "16507066", "16719566"]);
    for (const s of ["Psychological Science 17(3)", "Psychological Bulletin 132(3)"]) {
      expect(mdx, s).toContain(s);
      expect(r260, s).toContain(s);
    }
    expect(r260).toContain("PMID 16507066 = Roediger");
    expect(r260).toContain("PMID 16719566 = Cepeda");
  });
  test("kartu: kata di tanya dan jawab ada di butirnya, dan label per kartu dikunci", () => {
    const KARTU_LABEL: Record<number, Record<string, number>> = { 1: { TD: 1 }, 5: { I: 1 }, 7: { HA: 1 }, 8: { HA: 1 }, 9: { TD: 1 }, 10: { TD: 1 }, 14: { TD: 1 }, 15: { I: 2 } };
    kartu.forEach((k, i) => {
      const teks = `${k.tanya} ${k.jawab}`;
      const tabelAdr = blok("Putuskan").split("\n").filter((x) => /^\| \d+ \|/.test(x)).join("\n");
      const kataButir = new Set(norm(`${butir(i + 1).teks} ${tabelAdr}`).match(/[a-z]{4,}/g)!);
      const asing = (norm(teks).match(/[a-z]{4,}/g) ?? []).filter((w) => !kataButir.has(w) && !LONGGAR.has(w));
      expect(asing, `${k.id}: kata yang tidak ada di butir`).toEqual([]);
      expect(hitungLabel(teks), k.id).toEqual(KARTU_LABEL[i + 1] ?? {});
    });
  });
  test("baris riset R5-260 sampai R5-264: nilai yang dipakai halaman ada di barisnya", () => {
    const baris = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
    const r260 = baris("R5-260");
    for (const s of [
      "dibuka 2026-11-05", "id=16507066,16719566", "PMID 16507066 = Roediger & Karpicke",
      "Psychological Science 17(3), pubdate 2006 Mar, halaman 249-55", "Psychological Bulletin 132(3), pubdate 2006 May, halaman 354-80",
      "Test-enhanced learning: taking memory tests improves long-term retention", "Distributed practice in verbal recall tasks: A review and quantitative synthesis",
      "tes akhir 5 menit lawan 2 hari dan 1 minggu",
    ]) expect(r260, s).toContain(s);
    expect(baris("R5-261")).toContain("Enam belas kalimat naskah bagian 5");
    expect(baris("R5-262")).toContain("1.800.000 dari 1.800.000 posting di bagian A");
    expect(baris("R5-264")).toContain("Kolny, 22 Maret 2023");
  });
});
