// Penjaga angka halaman 2.30 (keputusan 765): angka yang ditulis tangan di halaman MDX, di diagram Rantai
// t2-estimasi-inti.json, dan di teks widget t2-estimasi-kalkulator.json harus bisa diturunkan dari registry
// (cerita.json tahap[1] dan tahap[2]) dan dari rekaman labs/b2-query/output/ledger/n1.txt bagian E. logika.test.ts hanya
// menjaga rumus kalkulator; tanpa tes ini, mengubah satu angka di MDX, diagram, atau teks widget tidak menggagalkan
// build, tes, atau alat ukur mana pun. Asumsi dan hasil hitungan ikut dijaga, bukan hanya angka dari rekaman.
// Rentang baris Snippet juga dijaga: bila rekaman atau main.go bergeser, rentang lama menampilkan baris yang salah.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../../data/cerita.json";
import intiDiagram from "../../../data/diagram/t2-estimasi-inti.json";
import dataKalkulator from "../../../data/widget/t2-estimasi-kalkulator.json";
import { DaftarAsumsi, DataKalkulator } from "./skema";
import { duaAngka, hitung, siapkan, titik } from "./logika";

const akar = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(akar, rel), "utf8");
const halaman = baca("situs/src/content/docs/tahap-2/estimasi.mdx");
const rekaman = baca("labs/b2-query/output/ledger/n1.txt").split("\n");
const mainGo = baca("labs/api-t2/cmd/api/main.go").split("\n");
const riset = baca("plan/RISET-TAHAP-2.md");
const dataLab = baca("labs/b2-query/output/ledger/data.txt").split("\n");
const postingBudi = Number(dataLab.map((b) => b.match(/^ Budi\s+\|\s+\d+\s+\|\s+(\d+)\s*$/)).find((x) => x)![1]);
const skemaHalaman = baca("situs/src/content/docs/tahap-2/skema-data.mdx");

// Angka Indonesia: koma desimal, titik ribuan.
const koma = (x: number, des: number): string => titik(Math.trunc(x)) + (des > 0 ? "," + Math.abs(x).toFixed(des).split(".")[1] : "");
const desimal = (x: number, des: number): string => x.toFixed(des).replace(".", ",");

const registry = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));
const a2 = registry[1]!;
const a3 = registry[2]!;
// Zod membuang kunci di luar skema kalkulator (trx, baris), jadi keduanya dibaca dari registry mentah.
const mentah = (i: number) => cerita.tahap[i]!.asumsi as { trx: number; baris: number };
const trxRegistry2 = mentah(1).trx;
const trxRegistry3 = mentah(2).trx;
const barisRegistry3 = mentah(2).baris;
const h2 = hitung(a2);
const h3 = hitung(a3);

// Masukan yang naskah tulis di luar registry: 3 transaksi uang per user aktif per hari (naskah Tahap 2 bagian 3b),
// W 20 ms (Asumsi), panggilan luar 2 dan 30 detik (Asumsi), pool 10 (Asumsi).
const TRX = 3;
const W_DB = 0.02;
const POOL = 10;
const DETIK = 86_400;
const bayar2 = (h2.dau * TRX) / DETIK;
const bayar3 = (h3.dau * TRX) / DETIK;
const bayar2Puncak = bayar2 * a2.puncak;
const bayar3Puncak = bayar3 * a3.puncak;
const trx2Hari = h2.dau * TRX;
const trx3Hari = h3.dau * TRX;
const lL = (lambda: number, w: number) => lambda * w;

// Rekaman n1.txt bagian E: kolom tanpa index riwayat.
const waktu = (nama: string, cara: string): number => {
  const m = rekaman
    .map((b) => b.match(/^ (.+?)\s+\|\s+(N\+1|JOIN)\s+\|\s+([\d.]+) ms\s+\|\s+([\d.]+) ms\s*$/))
    .find((x) => x && x[1] === nama && x[2] === cara);
  if (!m) throw new Error(`rekaman: ${nama} ${cara} tidak ditemukan`);
  return Number(m[3]);
};
const wN1 = waktu("Seluruh riwayat Budi", "N+1");
const wJoin = waktu("Seluruh riwayat Budi", "JOIN");
const wHalaman1Index = Number(rekaman.map((b) => b.match(/^ Riwayat Budi hal\. 1\s+\|\s+JOIN\s+\|\s+[\d.]+ ms\s+\|\s+([\d.]+) ms/)).find((x) => x)![1]);

// Ukuran data Tahap 3.
const posting2 = trx2Hari * 2 * 365;
const posting3 = trx3Hari * 2 * 365;
const mbRumusD1Tahap2 = (h2.dau * trxRegistry2 * 365 * mentah(1).baris) / 1e6;
const mbRumusD1Tahap3 = (h3.dau * trxRegistry3 * 365 * barisRegistry3) / 1e6;
const gbLedger3 = (posting3 * 250) / 1e9;
const mbLab3 = (posting3 * 137) / 1e6;

const harus = (kalimat: string) => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

describe("registry dan rekaman: angka turunan yang dipakai halaman", () => {
  test("masukan registry Tahap 2 dan Tahap 3", () => {
    expect([a2.user, a2.aktif, a2.req, a2.puncak]).toEqual([1000, 30, 40, 10]);
    expect([a3.user, a3.aktif, a3.req, a3.puncak]).toEqual([10000, 25, 60, 10]);
    expect(trxRegistry2).toBe(2);
    expect(trxRegistry3).toBe(3);
    expect(barisRegistry3).toBe(300);
  });
  test("puncak naik 12,5 kali = 10 × (25 ÷ 30) × (60 ÷ 40), dan pengali tidak membulatkan", () => {
    expect(h3.puncak / h2.puncak).toBeCloseTo(12.5, 10);
    expect(10 * (25 / 30) * (60 / 40)).toBeCloseTo(12.5, 10);
    expect(a3.user / a2.user).toBe(10);
    expect(a3.req / a2.req).toBe(1.5);
  });
  test("kepekaan: semua request sehari di satu jam memberi faktor 24 dan ±42", () => {
    expect(DETIK / 3600).toBe(24);
    expect(duaAngka(hitung({ ...a3, puncak: 24 }).puncak)).toBe("42");
    expect(hitung({ ...a3, puncak: 24 }).puncak / h3.puncak).toBeCloseTo(2.4, 10);
    expect(duaAngka(hitung({ ...a3, req: 40 }).puncak)).toBe("12");
  });
  test("bayar dan transfer: 5% dari request di Tahap 3, 7,5% di Tahap 2, naik 8,3 kali", () => {
    expect(trx2Hari).toBe(900);
    expect(trx3Hari).toBe(7500);
    expect(trx3Hari / h3.reqHari).toBeCloseTo(0.05, 10);
    expect(trx2Hari / h2.reqHari).toBeCloseTo(0.075, 10);
    expect(bayar3Puncak / bayar2Puncak).toBeCloseTo(25 / 3, 10);
    expect(duaAngka(bayar3Puncak)).toBe("0,87");
    expect(duaAngka(bayar2Puncak)).toBe("0,10");
    expect(h3.puncak / h2.puncak).toBeGreaterThan(bayar3Puncak / bayar2Puncak);
  });
  test("rekaman: W seluruh riwayat Budi, N+1 lawan satu query, dan halaman pertama dengan index", () => {
    expect(wN1).toBe(1936.4);
    expect(wJoin).toBe(30.6);
    expect(wHalaman1Index).toBe(1.4);
    expect(Math.round(wN1 / wJoin)).toBe(63);
    expect(rekaman.find((b) => b.includes("Median 5 kali sesudah satu pemanasan"))).toBeTruthy();
    expect(rekaman.find((b) => b.includes("tanpa jaringan antara server API dan database"))).toBeTruthy();
  });
  test("Little: Tahap 2 dengan λ yang sama, Tahap 3 tanpa dan dengan panggilan luar, dan kelas yang salah", () => {
    expect(desimal(lL(h2.puncak, wN1 / 1000), 2)).toBe("2,69");
    expect(lL(h2.puncak, wJoin / 1000)).toBeCloseTo(0.0425, 10);
    expect(duaAngka(lL(h3.puncak, W_DB))).toBe("0,35");
    expect(desimal(lL(bayar3Puncak, W_DB + 2), 2)).toBe("1,75");
    expect(duaAngka(lL(bayar3Puncak, W_DB + 30))).toBe("26");
    expect(desimal(lL(bayar3Puncak, W_DB + 30), 1)).toBe("26,1");
    expect(desimal(lL(h3.puncak, 2), 1)).toBe("34,7");
    expect(lL(h3.puncak, 2) / lL(bayar3Puncak, W_DB + 2)).toBeGreaterThan(19);
    expect(lL(h3.puncak, 2) / lL(bayar3Puncak, W_DB + 2)).toBeLessThan(20);
  });
  test("pool 10 tercapai saat 0,87 × (0,02 + t) = 10, yaitu t ≈ 11,5 detik", () => {
    expect(desimal(POOL / bayar3Puncak - W_DB, 1)).toBe("11,5");
  });
  test("ukuran data Tahap 3: tiga angka dan selisih terbesarnya", () => {
    expect(posting2).toBe(657_000);
    expect(posting3).toBe(5_475_000);
    expect(duaAngka(mbRumusD1Tahap3)).toBe("820");
    expect(duaAngka(gbLedger3)).toBe("1,4");
    expect(duaAngka(mbLab3)).toBe("750");
    expect(desimal((gbLedger3 * 1000) / mbLab3, 1)).toBe("1,8");
    expect(mbRumusD1Tahap3 / mbRumusD1Tahap2).toBeCloseTo(12.5, 10);
    expect(posting3 / posting2).toBeCloseTo(25 / 3, 10);
    // 137 byte per posting: 2.9 memuat rekamannya (±137 byte); partisi di ±440 juta posting per tahun (Tahap 5).
    expect(skemaHalaman).toContain("±137 byte per posting");
    expect(skemaHalaman).toContain("±440 juta");
  });
});

describe("Snippet dan kode yang dirujuk halaman", () => {
  test("n1.txt baris 54 sampai 65 adalah bagian E sampai catatan pengukuran", () => {
    expect(rekaman[53]).toContain("# --- E. Waktu per permintaan");
    expect(rekaman[64]).toContain("sama: tanpa jaringan antara server API dan database");
    expect(halaman).toContain('lines="54:65"');
  });
  test("main.go baris 40 sampai 43: sql.Open, dan tidak ada SetMaxOpenConns di labs/api-t2", () => {
    expect(mainGo[39]).toContain('sql.Open("pgx", url)');
    expect(mainGo[42]!.trim()).toBe("}");
    expect(halaman).toContain('lines="40:43"');
    const cari = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "output" || e.name === "node_modules" ? [] : cari(p);
        return e.name.endsWith(".go") ? [p] : [];
      });
    const berkas = cari(path.join(akar, "labs/api-t2"));
    expect(berkas.length).toBeGreaterThan(5);
    for (const b of berkas) {
      const isi = fs.readFileSync(b, "utf8");
      expect(isi, `${b} menyebut batas koneksi`).not.toMatch(/SetMaxOpenConns|pgxpool|OpenDB/);
    }
  });
});

describe("halaman estimasi.mdx: tiap angka turunan", () => {
  test("judul, Inti, dan Cek 3 pertanyaan", () => {
    harus(`user naik 10 kali dan puncak request naik ${desimal(h3.puncak / h2.puncak, 1)} kali, dari ±${duaAngka(h2.puncak)} ke ±${duaAngka(h3.puncak)} per detik (Asumsi)`);
    harus(`Satu dari dua puluh request memanggil layanan luar selama 2 detik`);
    harus(`Baris kedua di atas mengandaikan panggilan 2 detik (Asumsi)`);
    harus(`Pool dibatasi ${POOL} koneksi`);
    expect(trx3Hari / h3.reqHari).toBeCloseTo(1 / 20, 10);
  });
  test("Coba: batas, dan dua skenario ubah satu hal", () => {
    harus(`tetap di bawah ${duaAngka(hitung({ ...a3, puncak: 24 }).puncak)} request per detik`);
    harus(`puncak turun ke ±${duaAngka(hitung({ ...a3, req: 40 }).puncak)}`);
    harus(`Selisih ±${duaAngka(h3.puncak)} ke ±${duaAngka(hitung({ ...a3, req: 40 }).puncak)} datang dari satu pengali, yaitu ${desimal(a3.req / a2.req, 1)}`);
    harus(`faktor puncaknya ${DETIK / 3600}, dan puncak naik ke ±${duaAngka(hitung({ ...a3, puncak: 24 }).puncak)}, atau ${desimal(hitung({ ...a3, puncak: 24 }).puncak / h3.puncak, 1)} kali dari Tahap 3 biasa`);
  });
  test("Paham 1: tabel hitung ulang", () => {
    for (const [t, a, h] of [[2, a2, h2], [3, a3, h3]] as const) {
      harus(`| User terdaftar (Tahap ${t}) | ${titik(a.user)} |`);
      harus(`| User aktif harian (Tahap ${t}) | ${titik(h.dau)} | ${titik(a.user)} × ${a.aktif}% |`);
      harus(`| Request per hari (Tahap ${t}) | ${titik(h.reqHari)} | ${titik(h.dau)} × ${a.req} request |`);
      harus(`| Puncak request per detik (Tahap ${t}) | ±${duaAngka(h.puncak)} | ${titik(h.reqHari)} ÷ ${titik(DETIK)} × ${a.puncak} |`);
    }
  });
  test("Paham 2: tiga pengali dan batas atas", () => {
    harus(`Puncak naik ${desimal(h3.puncak / h2.puncak, 1)} kali, bukan ${a3.user / a2.user} kali`);
    harus(`user aktif turun dari ${a2.aktif}% ke ${a3.aktif}% (× ${a3.aktif} ÷ ${a2.aktif})`);
    harus(`Request per user naik dari ${a2.req} ke ${a3.req} (× ${a3.req} ÷ ${a2.req})`);
    harus(`10 × (${a3.aktif} ÷ ${a2.aktif}) × (${a3.req} ÷ ${a2.req}) = ${desimal(h3.puncak / h2.puncak, 1)}`);
    harus(`faktor puncaknya ${titik(DETIK)} ÷ 3.600 = ${DETIK / 3600} dan puncak Tahap 3 jadi ±${duaAngka(hitung({ ...a3, puncak: 24 }).puncak)} request per detik`);
  });
  test("Paham 3: kelas request", () => {
    harus(`puncak Tahap 3 ditulis ${desimal(h3.puncak, 1)} (${desimal(h3.puncak, 2)} dibulatkan)`);
    harus(`| Semua request (Tahap 3) | ${titik(h3.reqHari)} | ${desimal(h3.puncak, 1)} |`);
    harus(`| Bayar dan transfer (Tahap 3) | ${titik(trx3Hari)} | ${duaAngka(bayar3Puncak)} | ${titik(h3.dau)} × ${TRX} transaksi; 5% dari semua request |`);
    harus(`| Bayar dan transfer (Tahap 2) | ${titik(trx2Hari)} | ${duaAngka(bayar2Puncak)} | ${h2.dau} × ${TRX} transaksi; 7,5% dari semua request |`);
    harus(`Semua request naik ${desimal(h3.puncak / h2.puncak, 1)} kali, bayar dan transfer hanya ${desimal(bayar3Puncak / bayar2Puncak, 1)} kali`);
  });
  test("Paham 4: tabel Little, rekaman, dan kesalahan kelas", () => {
    harus(`seluruh riwayat Budi, ${titik(postingBudi)} posting`);
    harus(`| Tahap 2, seluruh riwayat Budi dengan N+1 (W: Rekaman lab) | ${desimal(h2.puncak, 2)} | ${koma(wN1, 1)} ms | ${desimal(lL(h2.puncak, wN1 / 1000), 2)} |`);
    harus(`| Tahap 2, seluruh riwayat Budi dengan satu query (W: Rekaman lab) | ${desimal(h2.puncak, 2)} | ${koma(wJoin, 1)} ms | ${desimal(lL(h2.puncak, wJoin / 1000), 4)} |`);
    harus(`| Tahap 3, semua request (W: Asumsi) | ${desimal(h3.puncak, 1)} | ${W_DB * 1000} ms | ${duaAngka(lL(h3.puncak, W_DB))} |`);
    harus(`| Tahap 3, bayar dan transfer, panggilan luar 2 detik (Asumsi) | ${duaAngka(bayar3Puncak)} | ${desimal(W_DB + 2, 2)} detik | ${desimal(lL(bayar3Puncak, W_DB + 2), 2)} |`);
    harus(`| Tahap 3, bayar dan transfer, panggilan luar 30 detik (Asumsi) | ${duaAngka(bayar3Puncak)} | ${desimal(W_DB + 30, 2)} detik | ${desimal(lL(bayar3Puncak, W_DB + 30), 1)} |`);
    harus(`| Salah: semua request ikut menunggu 2 detik (Asumsi) | ${desimal(h3.puncak, 1)} | 2 detik | ${desimal(lL(h3.puncak, 2), 1)} |`);
    harus(`W yang beda ${Math.round(wN1 / wJoin)} kali, jadi L-nya juga ${Math.round(wN1 / wJoin)} kali`);
    harus(`λ ±${desimal(h2.puncak, 2)} di sana adalah batas atas`);
    harus(`W 20 ms, Asumsi yang belum diukur; riwayat halaman pertama di lab ${desimal(wHalaman1Index, 1)} ms dengan index`);
    harus(`W = ${W_DB.toString().replace(".", ",")} + t detik`);
    harus(`${desimal(h3.puncak, 1)} × 2 = ${desimal(lL(h3.puncak, 2), 1)} koneksi, padahal hanya ${duaAngka(bayar3Puncak)} request per detik`);
  });
  test("Paham 5: pool 10 dan t ≈ 11,5 detik", () => {
    harus(`sampai ${POOL} koneksi (Asumsi)`);
    harus(`${duaAngka(bayar3Puncak)} × (0,02 + t) = ${POOL}, yaitu t ≈ ${desimal(POOL / bayar3Puncak - W_DB, 1)} detik`);
  });
  test("Paham 6: ukuran data", () => {
    harus(`${titik(h3.dau)} user aktif × ${TRX} transaksi × 365 × ${barisRegistry3} byte, satu baris per transaksi | ±${duaAngka(mbRumusD1Tahap3)} MB`);
    harus(`${titik(posting3)} posting × 250 byte | ±${duaAngka(gbLedger3)} GB`);
    harus(`${titik(posting3)} posting × 137 byte per posting (batas bawah) | ±${duaAngka(mbLab3)} MB`);
    harus(`berbeda ${desimal((gbLedger3 * 1000) / mbLab3, 1)} kali`);
    harus(`Rumus [[D1]] naik ${desimal(mbRumusD1Tahap3 / mbRumusD1Tahap2, 1)} kali dari Tahap 2, sedangkan rumus ledger naik ${desimal(posting3 / posting2, 1)} kali`);
    harus(`registry menulis ${trxRegistry2} transaksi per user di Tahap 2 dan ${trxRegistry3} di Tahap 3, dan rumus ledger memakai ${TRX} di keduanya`);
  });
  test("Putuskan dan Kunci: angka di tabel, jawaban, dan daftar periksa", () => {
    harus(`17,4 request per detik terlihat aman, padahal koneksi tertahan bisa ${desimal(lL(bayar3Puncak, W_DB + 30), 1)} bila panggilan luar 30 detik`);
    harus(`Puncak semua request ${desimal(h3.puncak, 1)} per detik. Berapa koneksi tertahan, dan kenapa bukan ${desimal(lL(h3.puncak, 2), 1)}?`);
    harus(`L = ${duaAngka(bayar3Puncak)} × (0,02 + 2) = ${desimal(lL(bayar3Puncak, W_DB + 2), 2)} koneksi. Angka ${desimal(lL(h3.puncak, 2), 1)} memakai ${desimal(h3.puncak, 1)} × 2 detik`);
    harus(`jadi puncak naik dari ±${duaAngka(h2.puncak)} ke ±${duaAngka(h3.puncak)} request per detik`);
    harus(`${duaAngka(bayar3Puncak)} × (0,02 + t) = ${POOL}, jadi t ≈ ${desimal(POOL / bayar3Puncak - W_DB, 1)} detik`);
    harus(`Hitungan di halaman ini memberi ${desimal(lL(bayar3Puncak, W_DB + 2), 2)} koneksi untuk panggilan 2 detik`);
  });
  test("RISET-TAHAP-2.md memuat ID dan angka halaman ini", () => {
    for (const id of ["R2-205", "R2-206", "R2-207", "R2-208", "R2-209"]) expect(riset).toContain(`| ${id} |`);
    expect(riset).toContain("1,389 dan 17,36 RPS");
    expect(riset).toContain("0,104 dan 0,868 per detik");
  });
});

describe("diagram Rantai t2-estimasi-inti.json", () => {
  const simpul = intiDiagram.baris.flatMap((b) => b.simpul);
  test("simpul baris 1: puncak Tahap 2 dan 3, dan kenaikannya", () => {
    const [s2, s3] = intiDiagram.baris[0]!.simpul;
    expect(s2!.teks).toBe(`Tahap 2: ±${duaAngka(h2.puncak)}`);
    expect(s3!.teks).toBe(`Tahap 3: ±${duaAngka(h3.puncak)}`);
    expect(s3!.sub).toBe(`naik ${desimal(h3.puncak / h2.puncak, 1)} kali`);
  });
  test("simpul baris 2: λ bayar, W, dan L", () => {
    const [lambda, w, l] = intiDiagram.baris[1]!.simpul;
    expect(lambda!.teks).toBe(`${duaAngka(bayar3Puncak)} bayar per detik`);
    expect(lambda!.sub).toBe("5% dari semua request");
    expect(w!.teks).toBe(`× ${desimal(W_DB + 2, 2)} detik`);
    expect(l!.teks).toBe(`= ${desimal(lL(bayar3Puncak, W_DB + 2), 2)} koneksi`);
    expect(simpul.map((s) => s.teks).join(" ")).not.toMatch(/\bB\d/);
  });
  test("sumber diagram jujur: Asumsi", () => {
    expect(intiDiagram.sumber.jenis).toBe("asumsi");
    expect(intiDiagram.sumber.teks).toBe("Asumsi naskah, bukan pengukuran");
    expect(intiDiagram.baris[1]!.simpul[1]!.sub).toBe("panggilan luar 2 detik, Asumsi");
  });
});

describe("widget kalkulator t2-estimasi-kalkulator.json", () => {
  const data = DataKalkulator.parse(dataKalkulator);
  const daftar = siapkan(data, registry);
  test("empat skenario: Tahap 2, Tahap 3, 40 request, satu jam", () => {
    expect(data.skenario.map((s) => s.label)).toEqual(["Tahap 2", "Tahap 3", "40 request", "Satu jam"]);
    expect(daftar[0]).toEqual(a2);
    expect(daftar[1]).toEqual(a3);
    expect(daftar[2]!.req).toBe(a2.req);
    expect(daftar[2]!.user).toBe(a3.user);
    expect(daftar[3]!.puncak).toBe(DETIK / 3600);
  });
  test("tebakan: jawabannya 12,5 kali dan dibuka oleh skenario Tahap 3", () => {
    expect(data.tebak.pilihan[data.tebak.jawaban]).toBe(`${desimal(h3.puncak / h2.puncak, 1)} kali`);
    expect(data.skenario[data.tebak.skenario]!.tahap).toBe(3);
    expect(data.tebak.q).toContain(`${titik(a3.user)} user, sepuluh kali Tahap 2`);
    expect(data.tebak.alasan).toContain(`user aktif turun dari ${a2.aktif}% ke ${a3.aktif}% (${desimal(a3.aktif / a2.aktif, 2)} kali)`);
    expect(data.tebak.alasan).toContain(`request per user naik ${desimal(a3.req / a2.req, 1)} kali (${a2.req} ke ${a3.req})`);
    expect(data.tebak.alasan).toContain(`Hasil kalinya ${desimal(h3.puncak / h2.puncak, 1)}, jadi puncak naik dari ±${duaAngka(h2.puncak)} ke ±${duaAngka(h3.puncak)} request per detik`);
  });
  test("sumber widget: Asumsi", () => {
    expect(data.sumber.jenis).toBe("asumsi");
  });
});
