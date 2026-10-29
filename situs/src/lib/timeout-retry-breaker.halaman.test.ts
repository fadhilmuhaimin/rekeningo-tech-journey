// Penjaga angka halaman 4.11 (keputusan 1306 sampai 1308): angka, ID, nomor ADR, versi sumber, tautan, rentang Snippet, tabel, klaim "hanya"
// atau "tidak ada", dan kalimat mekanisme yang ditulis tangan di timeout-retry-breaker.mdx, diagram t4-breaker-inti.json, dan halaman istilah
// circuit-breaker.json diturunkan dari rekaman labs/t4-integrasi/output, kode labs/api-t4, pembaca rekaman widget W4-breaker, naskah, registry,
// dan RISET, bukan dari daftar yang ditulis sendiri. Pola: webhook-masuk.halaman.test.ts.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan JSON dikunci per baris di
// timeout-retry-breaker.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/timeout-retry-breaker.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode (klaim naik, lepas, redirect, 4xx) diperiksa terhadap kodenya.
// Widget CircuitBreaker memakai angka dari rekaman yang sama dan dijaga penjaganya sendiri (src/widgets/circuit-breaker).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t4-breaker-inti.json";
import registry from "../../data/cerita.json";
import { aturanDari, awalDari, bacaRekaman, daftarAcuan } from "../widgets/circuit-breaker/rekaman";
import { ringkas } from "../widgets/circuit-breaker/logika";
import { KALIMAT_TERKUNCI, KUNCI_JSON } from "./timeout-retry-breaker.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/timeout-retry-breaker.mdx";
const halaman = baca(HALAMAN);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const lajurTxt = baca("labs/t4-integrasi/output/lajur.txt");
const retryTxt = baca("labs/t4-integrasi/output/retry.txt");
const breakerTxt = baca("labs/t4-integrasi/output/breaker.txt");
const workerTxt = baca("labs/t4-integrasi/output/worker.txt");
const testingTxt = baca("labs/t4-integrasi/output/testing.txt");
const readme = baca("labs/t4-integrasi/README.md");
const kodeKlien = baca("labs/api-t4/internal/klien/klien.go");
const kodeLajur = baca("labs/api-t4/internal/lajur/lajur.go");
const kodeVerif = baca("labs/api-t4/internal/verifikasi/verifikasi.go");
const kodeKirim = baca("labs/api-t4/internal/worker/verifikasi.go");
const kodeWorker = baca("labs/api-t4/internal/worker/worker.go");
const kodeOutbox = baca("labs/api-t4/internal/repo/outbox.go");
const istilah = JSON.parse(baca("situs/data/halaman-istilah/circuit-breaker.json")) as {
  istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: null; jebakan: string[]; terkait: string[];
  sumber: { riset?: string; url?: string; rekaman?: string; judul: string; catatan: string }[];
};
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const tanpaKunci = process.env.TANPA_KUNCI === "1";

// ---- pembaca rekaman ---------------------------------------------------------------------------
interface Bagian { awal: number; akhir: number; baris: string[] }
// Bagian rekaman diawali "# --- X. ..."; awal dan akhir adalah nomor baris (mulai 1) seperti rentang Snippet.
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z]\d?)\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const L = pecah(lajurTxt);
const RT = pecah(retryTxt);
const BK = pecah(breakerTxt);
const W = pecah(workerTxt);
const bagian = (semua: Record<string, Bagian>, huruf: string): Bagian => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
// Rentang dari baris yang diawali `awal` sampai baris yang diawali `akhir` (sesudah awal), keduanya inklusif.
const rentang = (teks: string, awal: string, akhir: string): string => {
  const a = noBaris(teks, awal);
  return `${a}:${noBaris(teks, akhir, a)}`;
};
const kolom = (teks: string, rentangBaris: string): string[] => {
  const [a, b] = rentangBaris.split(":").map(Number) as [number, number];
  return teks.split("\n").slice(a - 1, b);
};
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const H = (fragmen: string, n = 1): void => expect(halaman.split(fragmen).length - 1, `kemunculan "${fragmen.slice(0, 70)}"`).toBe(n);
const tabel = (awalan: string, kol: number): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  expect(keluar.every((x) => x.length === kol), `kolom tabel ${awalan}`).toBe(true);
  return keluar;
};
const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const bilangan = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"][n]!;

// Pembaca rekaman widget: tiap pola harus cocok persis satu kali di bagiannya, dan angka yang saling bergantung diperiksa silang.
const R = bacaRekaman(breakerTxt, lajurTxt, workerTxt, readme);
const A = aturanDari(R);
const awal = awalDari(R);

// ---- nilai turunan dari rekaman ----------------------------------------------------------------
// breaker.txt A sampai D.
const BA = bagian(BK, "A").baris;
const BB = bagian(BK, "B").baris;
const BC = bagian(BK, "C").baris;
const BD = bagian(BK, "D").baris;
const gagalKe = Number(cari(/^ {2}gagal berturut-turut ke-(\d+): status open$/, BA, "gagal ke-n open")[1]);
const tutupKe = BA.filter((b) => /^ {2}gagal berturut-turut ke-\d+: status closed/.test(b)).length;
const sebelumBuka = Number(cari(/sesudah ([\d,]+) detik: status open/, BA, "open 59,999")[1]!.replace(",", ".")) ;
const sesudahBuka = Number(cari(/sesudah ([\d,]+) detik: status half-open/, BA, "half-open 60,001")[1]!.replace(",", "."));
const bukaLagi = BB.map((b) => b.match(/^ {2}(\d+) detik sesudah membuka lagi: status (open|half-open)$/)).filter((m) => m !== null);
const empat = cari(/6 jawaban 4xx berturut-turut: status (open|closed)/, BC, "4xx bawaan")[1]!;
const empatKustom = BC.find((b) => b.includes("IsSuccessful kustom (4xx sukses), 6 jawaban 4xx berturut-turut: status closed, gagal berturut-turut 0"));
const campur = BC.find((b) => b.includes("kustom, 5 gagal vendor, 1 jawaban 4xx, 1 gagal vendor: status closed"));
const dikecualikan = BD.find((b) => b.includes("v2.4.0: 5 gagal, 1 error dikecualikan: gagal berturut-turut 5, dikecualikan 1, status closed"));

// lajur.txt A sampai E.
const LA = bagian(L, "A").baris;
const LB = bagian(L, "B").baris;
const LC = bagian(L, "C").baris;
const LD = bagian(L, "D").baris;
const LE = bagian(L, "E").baris;
const permintaanA = Number(cari(/^# vendor mati: (\d+) permintaan masuk, (\d+) objek dibuat/, LA, "permintaan A")[1]);
const objekA = Number(cari(/^# vendor mati: (\d+) permintaan masuk, (\d+) objek dibuat/, LA, "objek A")[2]);
const matiA = Number(cari(/^ mati\s+\| 5\s+\| (\d+)$/, LA, "mati A")[1]);
const gagalA = Number(cari(/^ gagal\s+\| (\d+)$/, LA, "gagal A")[1]);
const klaimSesudahPulih = Number(cari(/^worker: diklaim (\d+), terkirim 0/, LA, "diklaim A")[1]);
const pendaftarA = Number(cari(/^# (\d+) pendaftar mengajukan verifikasi/, LA, "pendaftar A")[1]);
const percobaanA = Number(cari(/-maks-percobaan (\d+)(?:\s|$)/, LA, "maks percobaan A")[1]);
const permintaanBuka = Number(cari(/^# vendor mati, breaker terbuka: (\d+) permintaan masuk, (\d+) objek dibuat/, LB, "permintaan B")[1]);
const objekBuka = Number(cari(/^# vendor mati, breaker terbuka: (\d+) permintaan masuk, (\d+) objek dibuat/, LB, "objek B")[2]);
const permintaanAkhirB = Number(cari(/^# sesudah vendor pulih: (\d+) permintaan masuk, (\d+) objek dibuat/, LB, "akhir B")[1]);
const objekAkhirB = Number(cari(/^# sesudah vendor pulih: (\d+) permintaan masuk, (\d+) objek dibuat/, LB, "akhir B")[2]);
const lulusB = Number(cari(/^ lulus\s+\| (\d+)$/, LB, "lulus B")[1]);
const timeoutB = cari(/-breaker-timeout (\d+)s/, LB, "timeout B")[1]!;
const putaran = cari(/Sesudah ([\d,]+) detik \(([a-z]+) putaran worker\) lajur tetap dijeda/, LB, "putaran B");
const awalB = LB.filter((b) => /^ (mati|menunggu|terkirim)\s+\| \d+\s+\| \d+$/.test(b)).map((b) => b.trim().split(/\s*\|\s*/));
const permintaanE = Number(cari(/^# vendor sehat: (\d+) permintaan masuk, (\d+) objek dibuat/, LE, "permintaan E")[1]);
const objekE = Number(cari(/^# vendor sehat: (\d+) permintaan masuk, (\d+) objek dibuat/, LE, "objek E")[2]);
const rusakE = Number(cari(/^UPDATE (\d+)$/, LE, "rusak E")[1]);
const matiE = Number(cari(/^ mati\s+\| 5\s+\| (\d+)$/, LE, "mati E")[1]);
const lulusE = Number(cari(/^ lulus\s+\| (\d+)$/, LE, "lulus E")[1]);
const kapasitasC = Number(cari(/-serentak (\d+) /, LC, "kapasitas C")[1]);
const lulusC = Number(cari(/^ lulus\s+\| (\d+)$/, LC, "lulus C")[1]);
const pekerjaanC = lulusC; // semua pekerjaan bagian C selesai lulus sesudah vendor pulih
const rusakD = Number(cari(/^UPDATE (\d+)$/, LD, "rusak D")[1]);
const menungguD = Number(cari(/^ menunggu\s+\| 0\s+\| (\d+)$/, LD, "menunggu D")[1]);
const terbukaD = LD.some((b) => b.includes("log breaker: breaker verifikasi: closed -> open"));

// retry.txt A sampai D.
const TA = bagian(RT, "A").baris;
const TB = bagian(RT, "B").baris;
const TC = bagian(RT, "C").baris;
const TD = bagian(RT, "D").baris;
const retryA = cari(/^# retry berkunci: (\d+) permintaan masuk, (\d+) objek dibuat/, TA, "retry A");
const retryB = cari(/^# retry tanpa kunci: (\d+) permintaan masuk, (\d+) objek dibuat/, TB, "retry B");
const objekB = (TB.find((b) => b.startsWith("# Satu pendaftar, dua objek di vendor"))!.match(/VND-\d{4}/g) ?? []);
const referensiA = cari(/lulus\s+\| (VND-\d{4})$/, TA, "VND A")[1]!;
const batasC = Number(cari(/batas waktu client (\d+) ms/, retryTxt.split("\n"), "batas C")[1]);
const retryC = cari(/^# sesudah pulih: (\d+) permintaan masuk, (\d+) objek dibuat/, TC, "retry C");
const lima = cari(/^# setelah lima timeout: (\d+) permintaan masuk, (\d+) objek dibuat/, TD, "retry D");
const statusD = cari(/^ (gagal)$/, TD, "status D")[1];
const statusC = TC.filter((b) => /^ (tidak_pasti|lulus|diajukan)$/.test(b)).map((b) => b.trim());
const tagihan = TB.some((b) => b.includes("Bila vendor menagih per objek, pendaftar ini ditagih dua kali (Asumsi: tiruan tidak menagih)."));

// worker.txt A sampai C.
const WA = bagian(W, "A").baris;
const WB = bagian(W, "B").baris;
const WC = bagian(W, "C").baris;
const batasBawahA = cari(/menunggu paling sedikit ([\d,]+) detik/, WA, "batas bawah A")[1]!;
const kurangB = cari(/kurang dari ([\d,]+) detik sesudah dibayar/, WB, "batas atas B")[1]!;
const tahan = cari(/antara ([\d,]+) dan ([\d,]+) detik sampai client menyerah \(batas diperiksa; batas waktu client (\d+) detik\)/, WA, "t terukur");
const slotC = cari(/^verifikasi: ([\d,]+) per detik x (\d+) percobaan x (\d+) detik = ([\d,]+) slot worker dari (\d+)$/, WC, "slot C");
const uangC = cari(/^notifikasi uang: ([\d,]+) per detik x ([\d,]+) detik = ([\d,]+) slot$/, WC, "uang C");
const bersamaC = cari(/^bersama: ([\d,]+) \+ ([\d,]+) = ([\d,]+) dari (\d+) slot$/, WC, "bersama C");
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const bulat = (x: number, d: number): number => Math.round(x * 10 ** d + 1e-6) / 10 ** d;

// kode lab.
const batasBawaanDetik = Number(kodeKlien.match(/const BatasBawaan = (\d+) \* time\.Second/)![1]);
const hitungClientHttp = (dir: string): string[] => {
  const keluar: string[] = [];
  const jalan = (d: string): void => {
    for (const e of fs.readdirSync(path.join(akar, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) jalan(rel);
      else if (e.name.endsWith(".go") && !e.name.endsWith("_test.go") && /http\.Client\{/.test(baca(rel))) keluar.push(rel);
    }
  };
  jalan(dir);
  return keluar.sort();
};
const clientInternal = hitungClientHttp("labs/api-t4/internal");
const clientCmd = hitungClientHttp("labs/api-t4/cmd");
const sukses4xx = kodeVerif.match(/if resp\.StatusCode >= 400 \{\n\t\treturn Hasil\{\}, fmt\.Errorf\("%w: status %d", ErrDitolakVendor/);
const lima5xx = kodeVerif.match(/if resp\.StatusCode >= 500 \{\n\t\treturn Hasil\{\}, fmt\.Errorf\("%w: status %d", ErrTidakTersedia/);
const bawaanPercobaan = Number(kodeWorker.match(/MaksPercobaan: (\d+)/)![1]);
const bawaanSlot = Number(kodeWorker.match(/Konfigurasi\{Serentak: (\d+)/)![1]);

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("lajur.txt A: vendor mati, 10 pendaftar, 50 permintaan, 10 mati, 10 gagal, sesudah pulih 0 diklaim", () => {
    expect([pendaftarA, permintaanA, objekA, matiA, gagalA, klaimSesudahPulih, percobaanA]).toEqual([10, 50, 0, 10, 10, 0, 5]);
    expect(permintaanA).toBe(pendaftarA * percobaanA);
    expect(R.lajur.a).toEqual({ mati: matiA, permintaan: permintaanA });
    expect(R.lajur.pendaftar).toBe(pendaftarA);
    expect(LA.some((b) => b.includes("status | jumlah") || b.includes("gagal"))).toBe(true);
    expect(LA.filter((b) => /^ belum\s+\| 10$/.test(b))).toHaveLength(1);
  });
  test("lajur.txt B: enam permintaan membuka breaker, tabel pekerjaan, lajur tetap dijeda, 9 lulus dan 1 mati", () => {
    expect([permintaanBuka, objekBuka, permintaanAkhirB, objekAkhirB, lulusB, timeoutB, R.lajur.b.kapasitas]).toEqual([6, 0, 15, 9, 9, "3", 1]);
    expect(permintaanBuka).toBe(gagalKe);
    expect(awalB.slice(0, 3)).toEqual([["mati", "5", "1"], ["menunggu", "0", "8"], ["menunggu", "1", "1"]]);
    expect(awalB.slice(3)).toEqual([["mati", "5", "1"], ["terkirim", "1", "8"], ["terkirim", "2", "1"]]);
    expect(awalB[0]![2]).toBe(String(R.lajur.b.gagal));
    expect(R.lajur.b.gagal).toBe(1);
    expect([putaran[1], putaran[2]]).toEqual(["0,5", "sepuluh"]);
    expect(LB.some((b) => b.includes("log: breaker verifikasi: closed -> open"))).toBe(true);
    expect(LB.some((b) => b.includes("log: breaker verifikasi: open -> half-open"))).toBe(true);
    expect(LB.some((b) => b.includes("log: breaker verifikasi: half-open -> closed"))).toBe(true);
    expect(LB.some((b) => b.includes("ambang bawaan (lebih dari 5 gagal berturut-turut) lebih tinggi daripada batas percobaan satu pekerjaan (5)"))).toBe(true);
    expect(pendaftarA - R.lajur.b.gagal).toBe(lulusB);
  });
  test("lajur.txt C, D, E: kapasitas 4 tidak ada yang mati, enam dokumen rusak, 34 permintaan", () => {
    expect([kapasitasC, lulusC, R.lajur.c.mati]).toEqual([4, 8, 0]);
    expect(LC.some((b) => b.includes("paling_banyak_dua_percobaan"))).toBe(true);
    expect(LC.some((b) => b.includes("percobaan terbanyak satu pekerjaan paling banyak 2"))).toBe(true);
    expect(LC.some((b) => b.includes("-backoff 1ms"))).toBe(true);
    expect([rusakD, menungguD, terbukaD]).toEqual([6, 8, true]);
    expect([rusakE, matiE, lulusE, permintaanE, objekE]).toEqual([6, 6, 4, 34, 4]);
    expect(permintaanE).toBe(rusakE * R.lajur.percobaan + lulusE);
    expect(LE.some((b) => b.includes("log breaker: (tidak ada perpindahan status)"))).toBe(true);
    expect(pekerjaanC).toBe(8);
  });
  test("retry.txt: key sama satu objek, key baru dua objek, timeout 300 ms menjadi tidak_pasti, lima timeout menjadi gagal", () => {
    expect([retryA[1], retryA[2], referensiA]).toEqual(["2", "1", "VND-0001"]);
    expect([retryB[1], retryB[2]]).toEqual(["2", "2"]);
    expect(objekB).toEqual(["VND-0001", "VND-0002"]);
    expect(tagihan).toBe(true);
    expect([batasC, retryC[1], retryC[2]]).toEqual([300, "2", "1"]);
    expect(statusC).toEqual(["tidak_pasti", "lulus", "diajukan"]);
    expect(TC.some((b) => b.includes("tiruan menjawab 503 sebelum membuat objek; vendor nyata tidak menjamin itu"))).toBe(true);
    expect([lima[1], lima[2], statusD]).toEqual(["5", "1", "gagal"]);
    expect(TD.some((b) => b.includes("Memeriksa status ke vendor (job seperti cek status top-up) tidak ada di lab ini"))).toBe(true);
    expect(TD.filter((b) => /^ mati\s+\| 5$/.test(b))).toHaveLength(1);
  });
  test("breaker.txt: gagal ke-6 open, 59,999 open, 60,001 half-open, permintaan kedua ditolak, 4xx bawaan lawan kustom, IsExcluded", () => {
    expect([gagalKe, tutupKe, sebelumBuka, sesudahBuka]).toEqual([6, 5, 59.999, 60.001]);
    expect(BA.some((b) => b.includes("permintaan saat open: circuit breaker is open; vendor dipanggil: false"))).toBe(true);
    expect(BA.some((b) => b.includes("half-open, permintaan pertama berjalan, permintaan kedua: too many requests"))).toBe(true);
    expect(BA.some((b) => b.includes("permintaan pertama sukses: status closed"))).toBe(true);
    expect(bukaLagi.map((m) => [m![1], m![2]])).toEqual([["59", "open"], ["61", "half-open"]]);
    expect(BB.some((b) => b.includes("permintaan percobaan di half-open gagal: status open"))).toBe(true);
    expect(empat).toBe("open");
    expect(empatKustom).toBeDefined();
    expect(campur).toBeDefined();
    expect(dikecualikan).toBeDefined();
    expect(breakerTxt).toContain("github.com/sony/gobreaker/v2 v2.4.0");
    expect(breakerTxt).toContain("go1.27.1");
    expect(breakerTxt).toContain("testing/synctest");
    expect(R.breaker).toMatchObject({ versi: "v2.4.0", gagalKe: 6, lebihDari: 5, bukaDetik: 60, permintaanHalfOpen: 1, empatBawaan: 6, empatKustom: 6 });
  });
  test("worker.txt: batas bawah 2,0 detik tanpa lajur, kurang dari 2,0 detik dengan lajur, t antara 2,9 dan 3,6 detik, hitungan slot", () => {
    expect([batasBawahA, kurangB]).toEqual(["2,0", "2,0"]);
    expect([tahan[1], tahan[2], tahan[3]]).toEqual(["2,9", "3,6", "3"]);
    expect(WA.some((b) => b.includes("c terukur: permintaan bersamaan paling banyak yang sampai di vendor = 4"))).toBe(true);
    expect(WA.some((b) => b.includes("8 pekerjaan verifikasi (kelas 1) menunggu di outbox"))).toBe(true);
    expect(WA.some((b) => b.includes("Budi membayar empat kali Rp1.000 ke Warung Ani"))).toBe(true);
    const laju = num(slotC[1]!);
    expect(bulat((1000 / 86400) * 10, 3)).toBe(laju);
    expect(bulat(laju * num(slotC[2]!) * num(slotC[3]!), 2)).toBe(num(slotC[4]!));
    expect(bulat(num(uangC[1]!) * num(uangC[2]!), 2)).toBe(num(uangC[3]!));
    expect(bulat(num(slotC[4]!) + num(uangC[3]!), 1)).toBe(num(bersamaC[3]!));
    expect([bersamaC[4], slotC[5]]).toEqual(["4", "4"]);
    expect(R.worker).toMatchObject({ serentak: 4, timeoutClient: 3, laju: 0.116, slot: 1.74, lajuUang: 7.52, detikUang: 0.3, slotUang: 2.26, bersama: 4 });
    expect(WC.some((b) => b.includes("Hasilnya Asumsi, bukan beban yang dijalankan."))).toBe(true);
  });
  test("gangguan 12.600 detik: 210 permintaan percobaan, sampai 42 dari 146 pekerjaan, dari README lab", () => {
    expect(R.outage).toEqual({ detik: 12600, lajuRataRata: 0.0116, probe: 210, matiMaks: 42, pekerjaan: 146 });
    expect(R.outage.detik / A.bukaDetik).toBe(R.outage.probe);
    expect(R.outage.probe / R.lajur.percobaan).toBe(R.outage.matiMaks);
    expect(Math.round(R.outage.lajuRataRata * R.outage.detik)).toBe(R.outage.pekerjaan);
    expect(readme).toContain("outage 12.600 detik (naskah M31) memberi 210 permintaan percobaan, yaitu sampai 42 dari 146 pekerjaan mati sebelum vendor pulih, bukan nol (Hitungan atas angka naskah, tidak dijalankan)");
    expect(bulat(R.outage.lajuRataRata * R.lajur.percobaan * R.worker.timeoutClient, 3)).toBe(0.174);
    expect(testingTxt).toContain("TestLajurPermintaanPercobaanSetengahTerbukaMenghabiskanPercobaanPekerjaanTerdepan");
  });
  test("kode: client keluar dari satu pembuat, jawaban 4xx sukses bagi breaker, klaim menaikkan percobaan dan LepasOutbox menguranginya", () => {
    expect(batasBawaanDetik).toBe(3);
    expect(kodeKlien).toContain("CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }");
    expect(kodeKlien).toContain("return &http.Client{Timeout: timeout, Transport: tr,");
    expect(clientInternal).toEqual(["labs/api-t4/internal/klien/klien.go", "labs/api-t4/internal/unduh/unduh.go"]);
    expect(baca("labs/api-t4/internal/unduh/unduh.go")).toContain("(&http.Client{}).Do(req) // klien bawaan: redirect diikuti");
    expect(clientCmd).toEqual(["labs/api-t4/cmd/beban/main.go", "labs/api-t4/cmd/penerbit/main.go", "labs/api-t4/cmd/tiruan/jadwal.go", "labs/api-t4/cmd/tiruan/main.go"]);
    expect(testingTxt).toContain("TestSatuPembuatClientUntukSemuaPanggilanKeluar");
    expect(kodeVerif).toContain("return &Klien{url: alamat, http: klien.Baru(timeout)}");
    expect(sukses4xx).not.toBeNull();
    expect(lima5xx).not.toBeNull();
    expect(kodeVerif.indexOf("resp.StatusCode >= 500")).toBeLessThan(kodeVerif.indexOf("resp.StatusCode >= 400"));
    expect(kodeVerif).toContain('req.Header.Set("Idempotency-Key", kunci)');
    expect(kodeVerif).toContain("kunci := p.Referensi");
    expect(kodeKirim).toContain("req := verifikasi.Permintaan{Referensi: fmt.Sprint(v.ID)");
    expect(kodeLajur).toContain("st.IsSuccessful = func(err error) bool { return err == nil || salah(err) }");
    expect(kodeLajur).toContain("ReadyToTrip dan MaxRequests sengaja tidak diisi");
    expect(kodeKirim).toContain("return b.Jalankan(f)");
    expect(kodeKirim).toContain("// panggilVendor menjalankan panggilan lewat breaker bila ada. Tanpa breaker panggilan langsung (ADR 25 apa adanya).");
    expect(kodeOutbox).toMatch(/UPDATE outbox o SET klaim_sampai = now\(\) \+ make_interval\(secs => \$2::double precision\), percobaan = o\.percobaan \+ 1/);
    expect(kodeOutbox).toContain("percobaan = greatest(percobaan - 1, 0)");
    expect(kodeKirim).toContain("w.repo.LepasOutbox(ctx, n.ID)");
    expect(kodeKirim).toContain("w.tundaVerifikasi(ctx, n, v.ID)");
    expect(kodeWorker).toMatch(/Bawaan\(\) Konfigurasi \{\n\treturn Konfigurasi\{Serentak: 4,/);
    expect([bawaanPercobaan, bawaanSlot]).toEqual([5, 4]);
    expect(kodeWorker).toContain("func Backoff(");
    expect(kodeOutbox).toContain("AND coba_lagi <= now()");
  });
  test("tes Go di testing.txt yang disebut halaman", () => {
    for (const nama of ["TestBreakerGagalBerturutTurutTidakDihapusWaktu", "TestSatuPembuatClientUntukSemuaPanggilanKeluar", "TestLajurPermintaanPercobaanSetengahTerbukaMenghabiskanPercobaanPekerjaanTerdepan"]) {
      expect(testingTxt).toContain(`--- PASS: ${nama}`);
      expect((halaman.match(new RegExp(nama, "g")) ?? []).length).toBeGreaterThanOrEqual(0);
    }
    H("`TestSatuPembuatClientUntukSemuaPanggilanKeluar`");
    H("`TestBreakerGagalBerturutTurutTidakDihapusWaktu`");
    expect(halaman).not.toContain("TestLajurPermintaanPercobaan");
  });
});

describe("timeout-retry-breaker.mdx: tiap angka turunan dari rekaman, kode, dan naskah", () => {
  test("Inti dan Rantai", () => {
    harus("Vendor yang mati berhenti dipanggil, dan pekerjaan yang belum dicoba menunggu tanpa memakai percobaan.");
    harus(`Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) \`lajur.txt\` bagian A, layanan verifikasi tiruan mati dan ${pendaftarA} pendaftar masuk.`);
    harus(`Worker mengulang tiap pekerjaan sampai ${bilangan(R.lajur.percobaan)} percobaan, lalu memindahkannya ke dead-letter ([[t3-at-least-once]]).`);
    harus(`Hasilnya ${permintaanA} permintaan ke vendor, ${matiA} pekerjaan mati, dan ${gagalA} pengajuan berstatus \`gagal\`.`);
    harus("Sesudah vendor pulih, tidak ada pekerjaan yang diklaim lagi.");
    harus(`Breaker di lab membuka pada kegagalan ${bilangan(gagalKe).replace("enam", "keenam")}, dan lajur itu berhenti diklaim.`);
    harus(`Sesudah vendor pulih, ${lulusB} dari ${pendaftarA} pekerjaan lulus dan ${R.lajur.b.gagal} mati.`);
    harus("Lajur adalah bagian queue untuk satu vendor, dan breaker adalah penjaga yang berhenti memanggil vendor sesudah beberapa kegagalan berturut-turut.");
    // Rantai: dua baris, tiga simpul; angka dari lajur.txt A dan B.
    const [r1, r2] = rantai.baris;
    expect(rantai.baris).toHaveLength(2);
    expect(r1!.simpul.map((s) => s.teks)).toEqual([`${permintaanA} permintaan`, `${matiA} mati`, `pulih: ${klaimSesudahPulih} diklaim`]);
    expect(r1!.simpul[0]!.sub).toBe(`${R.lajur.percobaan} tiap pekerjaan`);
    expect(r1!.sub).toBe(`${pendaftarA} pekerjaan`);
    expect(r2!.simpul.map((s) => s.teks)).toEqual([`${permintaanBuka} permintaan`, "vendor pulih", `${lulusB} lulus, ${R.lajur.b.gagal} mati`]);
    expect(r2!.simpul[0]!.sub).toBe(`lajur dijeda, ${objekBuka} objek`);
    expect(r2!.sub).toBe(`${pendaftarA} pekerjaan`);
    expect(r2!.simpul[2]!.sub).toBe(`dari ${pendaftarA} pekerjaan`);
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-integrasi, lajur.txt A dan B" });
    expect(rantai.catatan).toContain(`Timeout ${timeoutB} detik, bukan ${A.bukaDetik} detik bawaan pustaka.`);
  });
  test("Mulai dan Cek diri: dua kemunculan tiap pertanyaan, kata bilangan dari rekaman", () => {
    H(`Vendor mati dan ${pendaftarA} pendaftar masuk, tanpa breaker. Berapa permintaan sampai ke vendor, dan berapa pekerjaan mati?`, 2);
    H("Balasan vendor terpotong sesudah objek dibuat. Kenapa retry dengan key yang sama tidak membuat objek kedua?", 2);
    H(`Dengan breaker, berapa dari ${pendaftarA} pekerjaan mati, dan kenapa jawabannya bukan nol?`, 2);
    H("Enam dokumen rusak (jawaban 422) datang berturut-turut dari vendor yang sehat. Apa beda breaker bawaan pustaka dan penilaian ADR 36?");
    expect(rusakD).toBe(6);
    expect(LD.filter((b) => b.includes("422"))).toHaveLength(1);
    harus(`Vendor menerima ${permintaanA} permintaan, yaitu ${R.lajur.percobaan} percobaan untuk tiap pekerjaan, dan ${matiA} pekerjaan mati. Sesudah vendor pulih, worker mengklaim ${klaimSesudahPulih} pekerjaan (\`lajur.txt\` bagian A).`);
    harus(`Vendor mengenali key yang sama dan tidak membuat objek lagi: ${retryA[1]} permintaan masuk, ${retryA[2]} objek (\`retry.txt\` bagian A). Dengan key baru di tiap percobaan, vendor membuat dua objek untuk satu pendaftar (bagian B).`);
    harus(`Satu pekerjaan mati. Breaker membuka pada kegagalan keenam, sedangkan batas percobaan satu pekerjaan ${bilangan(R.lajur.percobaan)}, jadi pekerjaan pertama habis lebih dulu.`);
    harus(`Breaker bawaan menghitung 4xx sebagai gagal, membuka, dan menjeda ${menungguD / 2} pengajuan sehat di belakang dokumen rusak (\`lajur.txt\` bagian D).`);
    harus(`Penilaian ADR 36 tidak membukanya, jadi ${lulusE} pengajuan sehat lulus. Enam dokumen rusak tetap memakai ${bilangan(R.lajur.percobaan)} percobaan, sehingga ${rusakE + lulusE} pengajuan menghasilkan ${permintaanE} permintaan (bagian E).`);
    expect(menungguD / 2).toBe(lulusE);
  });
  test("Coba: delapan rekaman, 180 detik, jawaban tebakan dari widget, tanpa breaker dan empat slot", () => {
    expect(daftarAcuan(R)).toHaveLength(8);
    harus("Hasilnya berlabel Simulasi: widget menghitungnya dengan aturan breaker yang sama dengan pustaka, dan itu bukan Rekaman lab. Bila pengaturanmu sama dengan salah satu dari delapan rekaman, widget menulis Cocok dengan rekaman.");
    harus("Widget ini mensimulasikan satu vendor selama 180 detik, di jalur sinkron atau jalur queue.");
    expect(baca("situs/src/widgets/circuit-breaker/logika.ts")).toContain("export const HORIZON = 180;");
    const dasar = ringkas(awal, A);
    const tanpa = ringkas({ ...awal, breaker: false }, A);
    const empatSlot = ringkas({ ...awal, serentak: R.worker.serentak }, A);
    expect([dasar.mati, tanpa.mati, tanpa.kevendor, empatSlot.mati, A.pekerjaan, A.pekerjaan - dasar.mati]).toEqual([1, 10, 50, 0, 10, 9]);
    expect([tanpa.mati, tanpa.kevendor]).toEqual([R.lajur.a.mati, R.lajur.a.permintaan]);
    expect([dasar.mati, dasar.kevendor]).toEqual([R.lajur.b.gagal, R.lajur.b.permintaanAkhir]);
    harus(`Tebak dulu: berapa dari ${A.pekerjaan} pekerjaan sudah mati ketika breaker membuka?`);
    harus(`Jawaban ${dasar.mati} berubah: ${tanpa.mati} pekerjaan mati sesudah ${tanpa.kevendor} permintaan, sama dengan \`lajur.txt\` bagian A.`);
    harus(`Tidak ada pekerjaan yang mati, sama dengan bagian C, yang memakai ${pekerjaanC} pekerjaan sedangkan widget memakai ${A.pekerjaan}.`);
    expect(pekerjaanC).not.toBe(A.pekerjaan);
    harus("pilih 4 pada Slot worker.");
    expect(R.worker.serentak).toBe(4);
    harus("Slot adalah tempat satu pekerjaan yang sedang berjalan di worker.");
    harus("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini. Asumsi adalah angka pilihan penulis tanpa rekaman, dan Ilustrasi adalah skenario yang bukan hasil sistem. Tidak dijalankan berarti dicek ke kode atau dokumentasi, tanpa menjalankannya.");
    expect(halaman).toContain('aman="Kalau berhenti di sini, kamu sudah tahu: breaker membuka sesudah kegagalan keenam, jadi pekerjaan pertama sudah habis lima percobaan, dan pekerjaan yang belum dicoba menunggu tanpa memakai percobaan."');
  });
  test("Client: timeout 3 detik, satu pembuat, dua tempat membuat client di internal, tes pemindai", () => {
    harus("Client HTTP Go bawaan tidak punya batas waktu: dokumentasi menulis bahwa Timeout nol berarti tanpa batas.");
    harus("Timeout itu mencakup waktu koneksi, redirect, dan pembacaan body");
    harus(`mengisi \`Timeout\` dengan konstanta \`BatasBawaan\` sebesar ${batasBawaanDetik} detik (ADR 22, [[t3-pool]]).`);
    harus("Fungsi itu juga membuat client berhenti di jawaban redirect, jadi redirect tidak diikuti.");
    harus(`Di \`labs/api-t4/internal/\`, selain tes, hanya dua tempat membuat client HTTP: \`internal/klien/klien.go\` dan fetcher gambar versi rentan M36 di \`internal/unduh/unduh.go\`, yang sengaja memakai client bawaan.`);
    expect(clientInternal.map((f) => f.replace("labs/api-t4/", ""))).toEqual(["internal/klien/klien.go", "internal/unduh/unduh.go"]);
    harus("Alat lab di `cmd/` membuat client sendiri, dan itu bukan panggilan Rekeningo.");
    expect(readme).toContain("`cmd/beban`, `cmd/tiruan`, dan `cmd/penerbit` (alat lab, bukan panggilan Rekeningo) membuat client sendiri");
  });
  test("Timeout bukan gagal: tiga hasil, 300 ms, tidak_pasti, 503", () => {
    harus("koneksi ditolak atau jawaban 5xx menjadi `ErrTidakTersedia`, timeout atau jawaban terpotong menjadi `ErrTidakPasti`, dan jawaban 4xx menjadi `ErrDitolakVendor`");
    expect(kodeVerif).toContain("ErrTidakTersedia: koneksi ditolak atau vendor menjawab 5xx.");
    expect(kodeVerif).toContain("ErrTidakPasti: timeout atau jawaban terpotong.");
    expect(kodeVerif).toContain("ErrDitolakVendor: vendor menjawab 4xx.");
    harus(`vendor menggantung dan client menyerah sesudah ${batasC} ms (lab memendekkan ${batasBawaanDetik} detik supaya rekaman cepat).`);
    harus(`Pengajuan berstatus \`${statusC[0]}\`, dan sesudah vendor pulih pengajuan yang sama lulus dengan ${retryC[1]} permintaan dan ${retryC[2]} objek.`);
    harus(`pengajuan tetap \`${statusC[2]}\`.`);
    harus("Tiruan lab menjawab 503 sebelum membuat objek, dan vendor nyata tidak menjamin itu.");
  });
  test("Retry berkunci: dua permintaan satu objek lawan dua objek, tagihan Asumsi, Stripe, tiruan tanpa kedaluwarsa", () => {
    harus("Untuk verifikasi, key adalah id pengajuan.");
    harus(`retry dengan key yang sama menghasilkan ${retryA[1]} permintaan dan ${retryA[2]} objek.`);
    harus(`dan hasilnya ${retryB[2]} objek untuk satu pendaftar`);
    harus("Bila vendor menagih per objek, pendaftar itu ditagih dua kali (Asumsi: tiruan tidak menagih).");
    harus("Key boleh sampai 255 karakter, jawaban permintaan pertama disimpan termasuk galat 500, dan key boleh dihapus sesudah 24 jam");
    harus("Vendor tiruan di lab menyimpan satu objek per key tanpa kedaluwarsa, dan perilaku vendor nyata tidak diukur.");
    expect(readme).toContain("tiruan menyimpan satu objek per key tanpa kedaluwarsa");
    const stripe = baris("R4-163");
    for (const k of ["255 karakter", "termasuk 500", "24 jam", "API v1, dibuka 2026-10-29"]) expect(stripe, k).toContain(k);
  });
  test("Breaker: bawaan v2.4.0, 59,999 dan 60,001, sesudah detik ke-60, 4xx, IsExcluded, jalur sinkron tidak dipasang", () => {
    harus(`membuka sesudah lebih dari ${R.breaker.lebihDari} gagal berturut-turut. Breaker tetap terbuka ${A.bukaDetik} detik, lalu mengizinkan satu permintaan di half-open`);
    harus(`Open pada ${koma(sebelumBuka, 3)} detik dan half-open pada ${koma(sesudahBuka, 3)} detik.`);
    harus("jadi sesudah detik ke-60, bukan tepat pada detik ke-60.");
    harus(`Di bagian B, permintaan percobaan yang gagal membuka breaker lagi selama ${A.bukaDetik} detik penuh.`);
    harus(`Di bagian C, enam jawaban 4xx berturut-turut membuka breaker bawaan`);
    expect(R.breaker.empatBawaan).toBe(6);
    harus("lima gagal, satu 4xx, lalu satu gagal tetap closed.");
    harus("Lab ini tidak memakainya.");
    expect(kodeLajur).not.toContain("IsExcluded");
    expect(readme).toContain("Lab ini tidak memakainya.");
    harus("Jalur sinkron, yaitu panggilan yang ditunggu user seperti `POST /topup-bank` ([[t4-topup-verifikasi]]), tidak dipasangi breaker di lab: Tidak dijalankan, dan widget hanya mensimulasikannya.");
    expect(readme).toContain("**Jalur sinkron**: breaker per vendor untuk panggilan yang ditunggu user (`POST /topup-bank` ke gateway) tidak dipasang.");
    expect(R.breaker.bukaLagiDetik).toBe(A.bukaDetik);
    const gb = baris("R4-160");
    for (const k of ["more than 5", "60 seconds", "allows only 1 request", "non-nil errors", "neither counted as a success nor as a failure", "expiry.Before(now)", "2026-01-01", "2026-10-29"]) expect(gb, k).toContain(k);
  });
  test("Lajur dijeda: tabel pekerjaan B, 0,5 detik, 6 permintaan, 15 permintaan, 9 terkirim, 1 mati, waktu diperkecil", () => {
    harus("Lajur yang terbuka tidak diklaim sama sekali, jadi percobaan pekerjaan tidak bertambah dan tidak ada slot yang terpakai.");
    harus("Lajur half-open hanya diklaim satu baris, yaitu permintaan percobaan:");
    harus(`satu worker mengerjakan ${pendaftarA} pekerjaan dengan lima percobaan, tanpa jeda antar percobaan, dan Timeout breaker ${timeoutB} detik.`);
    harus(`Sesudah ${bilangan(gagalKe)} percobaan gagal berturut-turut breaker membuka.`);
    harus(`Pekerjaan pertama sudah memakai kelima percobaannya, pekerjaan kedua satu, dan ${awalB[1]![2]} pekerjaan belum dicoba.`);
    harus(`Vendor menerima ${permintaanBuka} permintaan dan tidak membuat objek.`);
    harus(`Sesudah ${putaran[1]} detik, ${putaran[2]} putaran worker, lajur tetap dijeda`);
    const terkirimB = awalB.filter((r) => r[0] === "terkirim").reduce((a, r) => a + Number(r[2]), 0);
    harus(`Hasilnya ${terkirimB} pekerjaan terkirim, ${awalB[3]![2]} mati, dan ${lulusB} pendaftar lulus:`);
    expect(terkirimB).toBe(lulusB);
    expect(awalB[4]).toEqual(["terkirim", "1", "8"]);
    harus(`Timeout breaker ${timeoutB} detik dan vendor mati beberapa detik menggantikan 3 jam 30 menit di cerita (Ilustrasi).`);
    expect(naskah).toContain("Layanan verifikasi tiruan tidak menjawab selama 3 jam 30 menit (Ilustrasi)");
    expect(R.outage.detik).toBe(3 * 3600 + 30 * 60);
    harus(`Bawaan pustaka ${A.bukaDetik} detik diperiksa di \`breaker.txt\`.`);
  });
  test("Slot pemberitahuan uang: 2,0 detik, 2,9 dan 3,6, tabel hitungan dari worker.txt C", () => {
    harus("Kelas pekerjaan di `outbox` hanya mengatur urutan klaim, dan tidak membebaskan slot yang sudah dipegang.");
    harus(`Empat pemberitahuan pembayaran Rp1.000 menunggu paling sedikit ${batasBawahA} detik (batas bawah yang diperiksa, nilainya tidak direkam).`);
    harus(`keempat pemberitahuan sampai kurang dari ${kurangB} detik sesudah dibayar:`);
    harus(`Tiap percobaan yang menggantung ditahan antara ${tahan[1]} dan ${tahan[2]} detik sampai client menyerah (batas yang diperiksa, batas waktu client ${tahan[3]} detik).`);
    harus(`Hanya dua masukan yang terukur di lab, yaitu ${R.worker.serentak} slot dan timeout ${R.worker.timeoutClient} detik.`);
    harus(`Masukan lain adalah Asumsi: 1.000 pendaftar per hari, faktor puncak 10, ${koma(R.worker.lajuUang, 2)} pemberitahuan uang per detik, dan ${koma(R.worker.detikUang, 1)} detik tiap pemberitahuan:`);
    expect(titik(1000) + " ÷ " + titik(86400) + " × 10").toBe("1.000 ÷ 86.400 × 10");
    const t = tabel("| Besaran | Rumus | Hasil |", 3);
    expect(t.map((x) => x.slice(1))).toEqual([
      ["Rumus", "Hasil"], ["---", "---"],
      ["1.000 ÷ 86.400 × 10", `${koma(R.worker.laju, 3)} per detik`],
      [`${koma(R.worker.laju, 3)} × ${R.worker.percobaan} × ${R.worker.detik}`, `${koma(R.worker.slot, 2)} dari ${R.worker.kapasitas}`],
      [`${koma(R.worker.lajuUang, 2)} × ${koma(R.worker.detikUang, 1)}`, `${koma(R.worker.slotUang, 2)} dari ${R.worker.kapasitas}`],
      [`${koma(R.worker.slot, 2)} + ${koma(R.worker.slotUang, 2)}`, `${koma(R.worker.bersama, 2)} dari ${R.worker.kapasitas}`],
    ]);
    expect(t.map((x) => x[0])).toEqual(["Besaran", "---", "Laju puncak verifikasi", "Slot untuk pekerjaan yang pasti gagal", "Slot pemberitahuan uang", "Keduanya bersama"]);
    harus("Sumber tabel: `worker.txt` bagian C, Hitungan atas Asumsi. Hasil 4,00 adalah 3,99 tanpa pembulatan, sama dengan [[t4-m31]]. Premisnya tiap percobaan menunggu sampai timeout 3 detik, dan vendor mati sepanjang puncak.");
    // 3,99 dihitung dari angka di halaman tanpa pembulatan 0,116, dan kalimat yang sama ada di halaman M31 (satu bentuk per angka)
    expect(bulat((1000 / 86400) * 10 * R.worker.percobaan * R.worker.detik + R.worker.lajuUang * R.worker.detikUang, 2)).toBe(3.99);
    expect(baca("situs/src/content/docs/tahap-4/m31-verifikasi-tertahan.mdx")).toContain("Hasil 4,00 adalah 3,99 tanpa pembulatan.");
    expect(bulat(1000 / 86400 * 10, 3)).toBe(R.worker.laju);
  });
  test("Celah: ambang ke-6 lawan 5, backoff 0, 210 dan 42 dari 146, 34 permintaan, 4xx sukses, tidak_pasti menjadi gagal", () => {
    harus("Lima hal tidak sesuai dengan kalimat \"pekerjaan menunggu dan selesai sesudah vendor pulih\":");
    expect([...halaman.matchAll(/^[1-5]\. (?:Ambang breaker|Rekaman B memakai|Permintaan percobaan di half-open|Jawaban 4xx tetap|`tidak_pasti` tidak bertahan)/gm)]).toHaveLength(5);
    harus(`Ambang breaker (kegagalan keenam) lebih tinggi daripada batas percobaan satu pekerjaan (${bilangan(R.lajur.percobaan)}).`);
    harus(`satu dari sepuluh \`gagal\`. Dengan ${R.worker.serentak} slot (bagian C, ${pekerjaanC} pekerjaan, backoff 1 ms) tidak ada yang mati dan tiap pekerjaan paling banyak 2 percobaan.`);
    harus("Rekaman B memakai backoff 0. Dengan jadwal produksi, klaim hanya mengambil pekerjaan yang waktu ulangnya sudah lewat.");
    harus("Kegagalan menyebar ke pekerjaan lain, dan angka satu mendekati nol (penalaran dari kode, Tidak dijalankan).");
    harus(`Gangguan di cerita berlangsung 3 jam 30 menit, yaitu ${titik(R.outage.detik)} detik, dan pada laju rata-rata ${koma(R.outage.lajuRataRata, 4)} × ${titik(R.outage.detik)} = ${R.outage.pekerjaan} pekerjaan masuk ([[t4-m31]]). Ada paling banyak ${titik(R.outage.detik)} ÷ ${A.bukaDetik} = ${R.outage.probe} permintaan percobaan. Lalu ${R.outage.probe} ÷ ${R.lajur.percobaan} = sampai ${R.outage.matiMaks} dari ${R.outage.pekerjaan} pekerjaan mati sebelum vendor pulih (Hitungan atas angka cerita, Tidak dijalankan).`);
    expect(3 * 3600 + 30 * 60).toBe(R.outage.detik);
    expect(Math.round(R.outage.lajuRataRata * R.outage.detik)).toBe(R.outage.pekerjaan);
    harus("Satu tes Go memakunya: lima permintaan percobaan mematikan satu pekerjaan walau lajur dijeda di antaranya (`testing.txt` bagian A memuat nama tes itu, bukan keluarannya).");
    harus(`Di bagian E, ${pendaftarA} pengajuan menghasilkan ${permintaanE} permintaan: ${rusakE} × ${R.lajur.percobaan} + ${lulusE}.`);
    harus("Kode lab menghitung semua status 400 sampai 499 sebagai sukses bagi breaker, termasuk 401, 403, 408, dan 429.");
    harus(`lima timeout berturut-turut mengakhiri pekerjaan di dead-letter dan menandai pengajuan \`${statusD}\`, padahal vendor menyimpan satu objek.`);
    expect(lima[2]).toBe("1");
    harus("Job yang memeriksa status vendor belum ada.");
    expect(readme).toContain("Job pemeriksa status vendor");
    expect(kodeVerif.match(/resp\.StatusCode >= 400/g)).toHaveLength(1);
    expect(kodeVerif.match(/StatusCode/g)!.length).toBeGreaterThan(3);
  });
  test("tab stack: header, versi, tanggal, dan klaim yang dicek ke dokumentasi", () => {
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    harus("*Dijalankan: lab api-t4 dan t4-integrasi, PostgreSQL 17.11, Go 1.27.1, dan gobreaker v2.4.0 (rekaman `lajur.txt`, `retry.txt`, `breaker.txt`).*");
    expect(lajurTxt).toContain("PostgreSQL 17.11");
    expect(lajurTxt).toContain("go1.27.1");
    expect(readme).toContain("github.com/sony/gobreaker/v2` | v2.4.0");
    expect((halaman.match(/\*Tidak dijalankan\./g) ?? []).length).toBe(5);
    expect((halaman.match(/dibuka 2026-10-29/g) ?? []).length).toBe(TanggalDibuka);
    harus("`AbortSignal.timeout(ms)` menghasilkan sinyal yang membatalkan dengan `TimeoutError`, dan MDN menulis bahwa waktunya dihitung dari waktu aktif, bukan waktu berlalu.");
    harus("10.0.0 (npm, terbit 2026-06-24)");
    harus("statistik jendela bergulir yang bawaannya 10 detik dalam 10 bucket");
    harus("timeout bawaannya 30 detik dan batas koneksi bawaannya 10 detik");
    harus("Halaman itu tidak membahas Idempotency-Key maupun circuit breaker.");
    harus("timeout=(3.05, 3)");
    harus("Retry otomatis tidak ada secara bawaan; dokumentasi memberi contoh `urllib3.util.Retry` lewat `HTTPAdapter` dengan `status_forcelist` dan `allowed_methods`.");
    harus("Dokumentasi Django tidak dibaca untuk panggilan keluar [perlu verifikasi].");
    harus("`connectionTimeout` bawaannya `null`, yang berarti batas bawaan sistem operasi.");
    harus("Cara Serverpod mengatur panggilan keluar, retry, dan breaker tidak dibaca [perlu verifikasi].");
    harus("Request idle timeout 150 detik (jawaban 504 bila fungsi belum menjawab), durasi dinding 150 detik di plan gratis dan 400 detik di plan berbayar, dan waktu CPU 2 detik tanpa I/O asinkron.");
    harus("Batas 150 detik itu 50 kali timeout 3 detik di halaman ini (Hitungan).");
    expect(150 / R.worker.timeoutClient).toBe(50);
    harus("Apakah runtime fungsi mendukung `AbortSignal.timeout` tidak dibaca [perlu verifikasi].");
    const r164 = baris("R4-164");
    for (const k of ["TimeoutError", "10.0.0", "2026-06-24", "10 detik dalam 10 bucket", "timeout bawaan 30 detik", "connectTimeout bawaan 10 detik", "tanpa bahasan Idempotency-Key atau breaker", "bukan wall clock", "Dart 3.13.7", "null (batas OS)", "150 detik (504)", "400 detik di plan berbayar", "CPU 2 detik", "[perlu verifikasi]"]) expect(r164, k).toContain(k);
    expect(baris("R4-161")).toContain("A Timeout of zero means no timeout.");
    expect(baris("R4-161")).toContain("Go 1.27.3");
    harus("halaman Go 1.27.3 sedangkan lab memakai Go 1.27.1, dibuka 2026-10-29");
  });
});

describe("ADR 36: tabel opsi, enam aturan, kasus industri, pre-mortem, kapan salah, dan Sengaja belum", () => {
  const t = tabel("| | A. Retry bebas tanpa key |", 5);
  test("tabel opsi: lima baris, empat opsi, kolom bukti menunjuk rekaman yang ada", () => {
    expect(t).toHaveLength(7);
    expect(t[0]!.map((x) => x.split(". ")[0])).toEqual(["", "A", "B", "C", "D"]);
    expect(t.slice(2).map((x) => x[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(t[6]![1]).toBe("Rekaman lab `retry.txt` B: dua objek untuk satu pendaftar");
    expect(t[6]![2]).toBe("Tidak dijalankan. Dokumentasi Azure menulis pola ini mungkin kurang cocok untuk arsitektur berbasis pesan");
    expect(t[6]![3]).toBe("Tidak dijalankan. Kasus Segment di bawah");
    expect(t[6]![4]).toBe("Rekaman lab `retry.txt` A dan C, `breaker.txt` A sampai C, `lajur.txt` B, `worker.txt` B. Jalur sinkron Tidak dijalankan");
    expect(t[5]![3]).toContain(`Segment menulis lebih dari ${140} service`);
    expect(t[5]![4]).toBe("Alert untuk breaker yang terbuka lebih dari 10 menit (Asumsi)");
    expect(naskah).toContain("breaker yang terbuka lebih dari 10 menit (Asumsi)");
    expect(t[4]![4]).toContain("lima celah yang lab temukan");
    expect(t[4]![2]).toContain("(penalaran dari kode)");
    expect(t[4]![1]).toBe("Percobaan yang hasilnya tidak diketahui bisa membuat objek kedua di vendor");
  });
  test("Kebutuhan, Status, dan enam aturan sama dengan kode, rekaman, dan registry", () => {
    harus(`Tanpa pengaman, vendor yang mati menghabiskan ${matiA} dari ${pendaftarA} pekerjaan (\`lajur.txt\` bagian A).`);
    harus(`Bebannya ${koma(R.worker.laju, 3)} verifikasi per detik di puncak dan ${koma(R.worker.lajuUang, 2)} pemberitahuan uang per detik, dengan ${R.worker.kapasitas} slot worker (Asumsi, rumus di blok Paham).`);
    harus("**Status:** diterima sesudah M31, melengkapi ADR 22 yang menulis breaker sebagai Tidak dijalankan ([[t3-pool]]), dan memakai aturan lima percobaan ADR 25 ([[t3-at-least-once]]). Dibaca ulang di [[t4-m34]].");
    harus("**Keputusan: opsi D.** Enam aturan:");
    const aturan = [...halaman.matchAll(/^([1-6])\. (Semua client keluar|Panggilan yang mengubah|Jalur sinkron, yaitu|Jalur queue dijaga|Timeout menghasilkan|`IsExcluded` tidak)/gm)];
    expect(aturan.map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
    harus(`1. Semua client keluar dibuat oleh satu fungsi, \`klien.Baru\`, dengan timeout ${batasBawaanDetik} detik (ADR 22) dan tanpa mengikuti redirect. Nol berarti tanpa batas dan tidak dipakai kode produksi.`);
    expect(kodeKlien).toContain("kode produksi tidak memanggilnya dengan 0");
    harus("2. Panggilan yang mengubah keadaan di vendor membawa Idempotency-Key dari id internal. Untuk verifikasi, itu id pengajuan, dan tiap retry memakai key yang sama.");
    harus(`Breaker membuka sesudah gagal berturut-turut ke-${gagalKe}, terbuka ${A.bukaDetik} detik, dan mengizinkan satu permintaan di half-open.`);
    harus("Jawaban 4xx dihitung sukses supaya permintaan yang salah tidak membukanya. Jalur ini tidak dipasang di lab.");
    harus("4. Jalur queue dijaga breaker per `tujuan` yang menjeda klaim lajur. Lajur terbuka tidak diklaim, dan percobaan pekerjaan tidak bertambah. Lajur half-open diklaim satu baris.");
    harus("5. Timeout menghasilkan `tidak_pasti`, bukan `gagal`, dan keadaannya ditentukan lewat cek status atau webhook ([[t4-m29]]). Itu berlaku per percobaan: sesudah percobaan kelima pengajuan menjadi `gagal`.");
    harus("6. `IsExcluded` tidak dipakai, dan bagian `Interval` pustaka tidak diatur. Di lab, hitungan gagal berturut-turut tidak dihapus waktu, dan satu sukses mengembalikannya ke nol (`TestBreakerGagalBerturutTurutTidakDihapusWaktu`, `testing.txt`). Apakah 401, 403, 408, dan 429 dihitung netral belum diputuskan.");
    expect(kodeLajur).not.toMatch(/Interval\s*:/);
    expect(kodeLajur).toContain("Name:    nama,");
    expect(naskah).toContain("| 36 | Satu fungsi pembuat client untuk semua panggilan keluar, dengan timeout 3 detik (ADR 22).");
    const adr = (registry.halaman as unknown as { id: string; adr?: number[] }[]).find((h) => h.id === "t4-breaker")!.adr!;
    expect(adr).toEqual([36]);
    expect(halaman).toContain(`### ADR ${adr[0]}: satu pembuat client, key dari id internal, breaker per vendor, lajur dijeda`);
    expect(naskah).toContain("Breaker melengkapi ADR 22 (yang menandai breaker Tidak dijalankan)");
  });
  test("Kenapa D, kasus industri Segment dari baris riset, pre-mortem, dan kapan salah dengan hitungan", () => {
    harus("- **A ditolak** karena balasan yang terpotong membuat vendor menyimpan objek yang tidak dikenali oleh retry berikutnya (`retry.txt` bagian B). Polanya sama dengan [[t4-m29]], dari arah keluar: kiriman ulang tanpa kunci menghasilkan efek kedua.");
    harus("- **B ditolak** karena klaim ke lajur yang terbuka tetap menaikkan percobaan. Kode lab menaikkan percobaan saat klaim, dan `LepasOutbox` mengurangi lagi hanya untuk baris yang ditolak breaker sesudah diklaim (penalaran dari kode, Tidak dijalankan).");
    harus(`Di lab, dead-letter saja menghabiskan ${matiA} dari ${pendaftarA} pekerjaan sebelum vendor pulih (\`lajur.txt\` bagian A). Yang dipakai D bukan breaker yang menghitung, tetapi lajur yang dijeda.`);
    harus("- **C ditolak** karena isolasi per vendor tidak butuh service per vendor. Lajur per `tujuan` dalam satu queue mengisolasi percobaan, dan service terpisah hanya menambah biaya yang dibahas di kasus berikut.");
    const sg = baris("R4-162");
    for (const k of ["Alexandra Noonan", "2018-07-10", "head-of-line blocking", "lebih dari 140 service", "isolasi kegagalan jadi sulit", "bukan sistem uang", "2026-10-29"]) expect(sg, k).toContain(k);
    harus("**Kasus industri: Segment (2018).** Alexandra Noonan, engineer Segment, menulis di blog perusahaannya (kini di blog Twilio, 2018-07-10)");
    harus("yang ia sebut head-of-line blocking.");
    harus("Sesudah lebih dari 140 service, mereka menggabungkannya kembali ke satu service");
    harus("Batasnya: ini tulisan engineer perusahaan itu tentang pipeline pengiriman event ke mitra, bukan sistem uang, dan ia tidak menulis kerugian uang.");
    harus("Tulisan itu mendukung dua hal: satu queue bersama tanpa pemisahan per tujuan menimbulkan head-of-line blocking, dan 140 service menjadi beban. Ia tidak membuktikan bahwa lajur yang dijeda dalam satu service memadai.");
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    harus(`Ambang keenam lebih tinggi daripada batas ${bilangan(R.lajur.percobaan)} percobaan, jadi pekerjaan yang dicoba satu per satu habis sebelum breaker membuka: satu dari sepuluh \`gagal\` di \`lajur.txt\` bagian B.`);
    harus(`jadi pada gangguan ${titik(R.outage.detik)} detik sampai ${R.outage.matiMaks} dari ${R.outage.pekerjaan} pekerjaan mati (Hitungan, Tidak dijalankan, rumus di blok Paham).`);
    harus("Dokumentasi Azure menulis bahwa breaker bisa menguji vendor dengan ping, baik lewat operasi yang tadi gagal maupun lewat operasi pemeriksaan kesehatan khusus. Hanya cara kedua tidak memakai percobaan pekerjaan nyata (penalaran dari dokumentasi, Tidak dijalankan). Tiruan lab tidak punya endpoint status, jadi opsi itu belum ada.");
    harus("Pendaftar boleh mengajukan lagi, dan pengajuan baru punya id baru, jadi key baru. Vendor bisa menyimpan dua objek untuk satu orang (penalaran dari kode, Tidak dijalankan).");
    harus(`Di \`lajur.txt\` bagian D, enam dokumen rusak (jawaban 422) membuka breaker bawaan dan menjeda ${menungguD / 2} pengajuan sehat selagi vendor sehat. Penilaian kustom opsi D menghindarinya, dengan harga ${permintaanE} permintaan untuk ${pendaftarA} pengajuan di bagian E.`);
    harus(`Pada laju puncak ${koma(R.worker.laju, 3)} verifikasi per detik, pekerjaan yang pasti gagal memegang ${koma(R.worker.slot, 2)} dari ${R.worker.kapasitas} slot, dan ${koma(R.worker.bersama, 2)} dari ${R.worker.kapasitas} bersama pemberitahuan uang.`);
    harus(`Premisnya tiap percobaan menunggu sampai timeout ${R.worker.timeoutClient} detik (Hitungan atas Asumsi). Pada laju rata-rata ${koma(R.outage.lajuRataRata, 4)} per detik pemakaiannya ${koma(R.outage.lajuRataRata * R.worker.percobaan * R.worker.timeoutClient, 3)} slot.`);
    harus("Dua worker tidak berbagi hitungan, jadi tiap proses menunggu enam kegagalannya sendiri, dan worker yang dimulai ulang mulai dari closed.");
    expect(readme).toContain("Worker yang dimulai ulang memulai dari tertutup, dan dua worker tidak berbagi hitungan.");
    expect(R.worker.laju * 10).toBeCloseTo(R.outage.lajuRataRata * 100, 1);
    expect(naskah).toContain("0,0116 per detik × 12.600 detik = 146");
  });
  test("Sengaja belum dilakukan: empat baris, tiga kolom", () => {
    const s = tabel("| Yang ditunda | Kenapa ditunda | Muncul lagi di |", 3);
    expect(s.map((x) => x[0])).toEqual(["Yang ditunda", "---", "Job pemeriksa status vendor untuk `tidak_pasti`", "Breaker bersama antar worker", "Hasil netral (`IsExcluded`) untuk 401, 403, 408, 429", "Satu service per vendor"]);
    expect(s.map((x) => x[2])).toEqual(["Muncul lagi di", "---", "Belum dijadwalkan", "Belum dijadwalkan", "[[t4-m34]]", "Belum dijadwalkan"]);
    expect(s[2]![1]).toBe("Tiruan lab tidak punya endpoint status, dan keputusan produknya belum diambil");
    expect(s[3]![1]).toBe("Lab memakai satu worker, dan keadaan breaker ada di memori prosesnya");
    expect(s[4]![1]).toBe("Penilaian jawaban ini belum diputuskan");
    expect(s[5]![1]).toBe("Segment menggabungkan lebih dari 140 service, dan lajur per `tujuan` memberi isolasi percobaan");
    expect(readme).toContain("Job pemeriksa status vendor** untuk pengajuan `tidak_pasti`: tidak ada");
  });
});

describe("rentang Snippet diturunkan dari rekaman dan kode, bukan angka tangan", () => {
  test("daftar Snippet dan rentangnya", () => {
    const semua = [...halaman.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!.trim()).filter((x) => x.includes("file="));
    const rentangVerif = rentang(kodeVerif, "\treq.Header.Set(\"Content-Type\"", "\t\treturn Hasil{}, fmt.Errorf(\"jawaban vendor tak terduga");
    const akhirVerif = Number(rentangVerif.split(":")[1]) + 1; // kurung kurawal penutup if terakhir
    expect(semua).toEqual([
      `file="labs/api-t4/internal/verifikasi/verifikasi.go" lines="${noBaris(kodeVerif, "func Baru(")}:${noBaris(kodeVerif, "func Baru(") + 2}" lang="go" title="labs/api-t4/internal/verifikasi/verifikasi.go"`,
      `file="labs/api-t4/internal/verifikasi/verifikasi.go" lines="${rentangVerif.split(":")[0]}:${akhirVerif}" lang="go" title="labs/api-t4/internal/verifikasi/verifikasi.go"`,
      `file="labs/t4-integrasi/output/retry.txt" lines="${bagian(RT, "A").awal}:${bagian(RT, "A").akhir - 1}" title="Rekaman lab: labs/t4-integrasi/output/retry.txt (bagian A)"`,
      `file="labs/t4-integrasi/output/retry.txt" lines="${bagian(RT, "B").awal}:${bagian(RT, "B").akhir - 1}" title="Rekaman lab: labs/t4-integrasi/output/retry.txt (bagian B)"`,
      `file="labs/t4-integrasi/output/breaker.txt" lines="${bagian(BK, "A").awal}:${bagian(BK, "A").akhir - 1}" title="Rekaman lab: labs/t4-integrasi/output/breaker.txt (bagian A, jam diperankan)"`,
      `file="labs/api-t4/internal/lajur/lajur.go" region="baru" lang="go" title="labs/api-t4/internal/lajur/lajur.go"`,
      `file="labs/api-t4/internal/worker/worker.go" region="klaim-lajur" lang="go" title="labs/api-t4/internal/worker/worker.go"`,
      `file="labs/t4-integrasi/output/lajur.txt" lines="${noBaris(lajurTxt, "$ ./api-t4 -peran worker -serentak 1 -backoff 0s -maks-percobaan 5 -selang 50ms -breaker -breaker-timeout 3s")}:${noBaris(lajurTxt, "# Sesudah 0,5 detik (sepuluh putaran worker)")}" title="Rekaman lab: labs/t4-integrasi/output/lajur.txt (bagian B, lajur dijeda)"`,
      `file="labs/t4-integrasi/output/lajur.txt" lines="${noBaris(lajurTxt, "# Sesudah 0,5 detik (sepuluh putaran worker)") + 1}:${bagian(L, "B").akhir - 1}" title="Rekaman lab: labs/t4-integrasi/output/lajur.txt (bagian B, vendor pulih)"`,
      `file="labs/t4-integrasi/output/worker.txt" lines="${bagian(W, "A").awal}:${noBaris(workerTxt, "# Keempat pemberitahuan sampai di layanan push kurang dari")}" title="Rekaman lab: labs/t4-integrasi/output/worker.txt (bagian A dan B)"`,
      `file="labs/api-t4/internal/worker/verifikasi.go" lines="${noBaris(kodeKirim, "// panggilVendor menjalankan")}:${noBaris(kodeKirim, "func panggilVendor(") + 5}" lang="go" title="labs/api-t4/internal/worker/verifikasi.go"`,
    ]);
    expect(kolom(kodeVerif, `${noBaris(kodeVerif, "func Baru(")}:${noBaris(kodeVerif, "func Baru(") + 2}`).join("\n")).toBe(
      "func Baru(alamat string, timeout time.Duration) *Klien {\n\treturn &Klien{url: alamat, http: klien.Baru(timeout)}\n}",
    );
    expect(kodeKirim.split("\n")[noBaris(kodeKirim, "func panggilVendor(") + 4]).toBe("}");
    expect(kodeWorker).toContain("// --8<-- [start:klaim-lajur]");
    expect(kodeLajur).toContain("// --8<-- [start:baru]");
    expect(lajurTxt.split("\n")[bagian(L, "B").akhir - 3]).toBe("# 9 dari 10 pendaftar lulus. Yang pertama sudah dead-letter sebelum breaker terbuka: ambang bawaan (lebih dari 5 gagal berturut-turut) lebih tinggi daripada batas percobaan satu pekerjaan (5).");
  });
  test("kode di tab Node, Laravel, dan Django adalah Ilustrasi yang cocok dengan dokumentasi yang dikutip", () => {
    harus('headers: { "Idempotency-Key": String(pengajuan.id) },');
    harus("signal: AbortSignal.timeout(3000),");
    harus("$jawab = Http::timeout(3)");
    harus("->withHeaders(['Idempotency-Key' => (string) $pengajuan->id])");
    harus("->retry(5, 100, throw: false)");
    harus('headers={"Idempotency-Key": str(pengajuan.id)},');
    expect(R.lajur.percobaan).toBe(5);
    expect(R.worker.timeoutClient).toBe(3);
  });
});

describe("rujukan [[ID]] dan registry", () => {
  const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; path?: string; adr?: number[]; peran?: string[]; menit?: number; masalah?: string; pendek?: string }[]).find((h) => h.id === id);
  test("halaman 4.11 terdaftar sebagai Konsep bagian 4 ★ dengan lab t4-integrasi, ADR 36, dan prasyarat M31", () => {
    const h = entri("t4-breaker")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.adr, h.peran]).toEqual(["4.11", "konsep", 4, true, ["t4-integrasi"], ["t4-m31"], [36], ["devops", "backend"]]);
    expect(h.judul).toBe("Timeout, retry berkunci, circuit breaker, lajur per vendor + ADR 36");
    expect(h.path).toBe("tahap-4/timeout-retry-breaker.md");
    expect(h.menit).toBe(18 + 5);
    expect(halaman).toContain(`title: "4.11 ${h.judul}"`);
    expect(halaman).toContain('<p class="meta">Baca 18 menit · coba 5 menit · Prasyarat: [[t4-m31]] · Jalur inti</p>');
    expect(naskah).toMatch(/\| 4\.11 \| 4 \| Timeout, retry berkunci, circuit breaker, lajur per vendor \+ ADR 36 \| Konsep \+ ADR \| ★ \| t4-integrasi \| W4-breaker \|/);
    expect(naskah).toContain("| 36 | Satu fungsi pembuat client untuk semua panggilan keluar");
  });
  test("setiap [[ID]] ada di registry, bernama sesuai halamannya, berurutan, dan menempel pada kalimat yang menjelaskannya", () => {
    const semua = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!).filter((id) => id !== "berikutnya");
    expect([...halaman.matchAll(/\[\[berikutnya\]\]/g)]).toHaveLength(1);
    for (const id of new Set(semua)) expect(entri(id), `[[${id}]] tidak ada di registry`).toBeDefined();
    const peran: [string, string][] = [
      ["t4-m31", "m31"], ["t3-at-least-once", "at-least-once"], ["t4-dua-arah", "dua arah"], ["t3-pool", "connection pool"], ["t2-idempotency", "idempotency"],
      ["t4-topup-verifikasi", "top-up dari bank"], ["t4-m34", "m34"], ["t4-m29", "m29"], ["t4-modul", "modular monolith"],
    ];
    for (const [id, kata] of peran) expect(entri(id)!.judul.toLowerCase(), id).toContain(kata);
    expect([...new Set(semua)].sort()).toEqual(peran.map((p) => p[0]).sort());
    for (const kalimat of [
      "Prasyarat: [[t4-m31]]",
      "lalu memindahkannya ke dead-letter ([[t3-at-least-once]]).",
      "[[t4-m31]] menunjukkan layanan verifikasi yang mati: tiap pekerjaan menghabiskan lima percobaan, dan pendaftar yang tidak bersalah ikut `gagal`.",
      "[[t4-dua-arah]] menulis tiga hal yang harus selalu benar. Yang ketiga berlaku di sini: pihak luar yang lambat atau mati tidak menahan pembayaran antar akun.",
      "(ADR 22, [[t3-pool]]).",
      "supaya vendor mengenali permintaan yang sama ([[t2-idempotency]]).",
      "seperti `POST /topup-bank` ([[t4-topup-verifikasi]])",
      "Syarat ketiga di [[t4-dua-arah]]: pihak luar yang lambat atau mati tidak menahan pembayaran antar akun.",
      "ke transaction yang memegang lock ([[t3-pool]]).".replace("ke transaction", "di dalam transaction"),
      "Dibaca ulang di [[t4-m34]].",
      "ditentukan lewat cek status atau webhook ([[t4-m29]]).",
      "Hasil 4,00 adalah 3,99 tanpa pembulatan, sama dengan [[t4-m31]].",
      "pada laju rata-rata 0,0116 × 12.600 = 146 pekerjaan masuk ([[t4-m31]]).",
      "Polanya sama dengan [[t4-m29]], dari arah keluar",
      "[[t4-m34]] membahas satu jawaban 403 yang tidak membuka breaker.",
      "**Yang akan merevisinya.** [[t4-m34]] menunjukkan satu jawaban 403 yang tidak membuka breaker, dan memaksa penilaian 401 dan 403 ditinjau ulang. [[t4-modul]] memecah service pembayaran dari ledger, dan panggilan antar kedua service ikut aturan 1 dan 2.",
      "| Hasil netral (`IsExcluded`) untuk 401, 403, 408, 429 | Penilaian jawaban ini belum diputuskan | [[t4-m34]] |",
    ]) harus(kalimat);
    const hitung = Object.fromEntries([...new Set(semua)].map((id) => [id, semua.filter((x) => x === id).length]));
    expect(hitung).toEqual({ "t4-m31": 5, "t3-at-least-once": 2, "t4-dua-arah": 2, "t3-pool": 3, "t2-idempotency": 1, "t4-topup-verifikasi": 1, "t4-m34": 4, "t4-m29": 2, "t4-modul": 1 });
    expect(semua[0]).toBe("t4-m31");
  });
  test("tiap janji 'dibahas di' menunjuk halaman yang judulnya memuat topiknya", () => {
    expect(entri("t4-m34")!.judul).toContain("ditolak sesudah pindah hosting");
    expect(entri("t4-m31")!.judul).toContain("146 pendaftar");
    expect(entri("t4-modul")!.judul).toContain("ADR 37");
    expect(naskah).toContain("403 adalah jawaban 4xx dan ADR 36 menghitungnya sukses");
    expect(entri("t4-m29")!.judul).toBe("M29: Top-up Budi masuk dua kali");
    const g = glosarium.split("\n").find((b) => b.startsWith("| **Circuit breaker** |"))!;
    expect(g).toContain("| [[t4-breaker]] |");
    expect(glosarium).not.toMatch(/\*\*Circuit breaker\*\*[^\n]*\[\[B11\]\]/);
  });
});

describe("struktur: lima blok, heading, dan template", () => {
  test("lima blok berurutan dengan nama, bagian terbuka, dan teks aman", () => {
    const blok = [...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1]!);
    expect(blok).toEqual([
      'nama="Mulai" buka',
      'nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: breaker membuka sesudah kegagalan keenam, jadi pekerjaan pertama sudah habis lima percobaan, dan pekerjaan yang belum dicoba menunggu tanpa memakai percobaan."',
      'nama="Paham"',
      'nama="Putuskan"',
      'nama="Kunci"',
    ]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(5);
  });
  test("heading dan urutan komponen", () => {
    const heading = [...halaman.matchAll(/^(#{2,4}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(heading).toEqual([
      "## Inti",
      "### Kenapa ini ada",
      "### Cara kerjanya",
      "### Di stack lain",
      "### ADR 36: satu pembuat client, key dari id internal, breaker per vendor, lajur dijeda",
      "### Sengaja belum dilakukan",
      "### Cek diri",
      "### Saat me-review kode AI, cek ini",
      "### Bacaan lanjut",
    ]);
    const komponen = [...halaman.matchAll(/<(Rantai|CircuitBreaker|TabSet)\b([^>]*)>/g)].map((m) => `${m[1]}${m[2]}`.trim());
    expect(komponen).toEqual([
      "Rantai data={intiDiagram} ringkas /",
      "CircuitBreaker /",
      'TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}',
    ]);
    expect(halaman.indexOf("<Rantai")).toBeLessThan(halaman.indexOf("<CircuitBreaker"));
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect(halaman).not.toMatch(/<noscript/);
    const impor = [...halaman.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(impor).toEqual([
      "Blok ../../../components/Blok.astro",
      "Rantai ../../../components/Rantai.astro",
      "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro",
      "CircuitBreaker ../../../components/CircuitBreaker.astro",
      "intiDiagram ../../../../data/diagram/t4-breaker-inti.json",
    ]);
    expect(fs.existsSync(path.join(akar, "situs/src/components/CircuitBreaker.astro"))).toBe(true);
    expect([...halaman.matchAll(/<Snippet lang="([a-z]+)"/g)].map((m) => m[1])).toEqual(["js", "php", "python"]);
  });
  test("kata yang dilarang skill gaya-bahasa dan ID internal tidak muncul, dan label turunan didefinisikan di pemakaian pertama", () => {
    const badan = halaman.slice(halaman.indexOf("<Blok"));
    const prosa = halaman.replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "");
    expect(prosa).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(prosa).not.toMatch(/Anda|!/);
    expect(prosa).not.toMatch(/Ilustrasi mekanisme/);
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}|PR #\d+|#\d{3}\b/);
    expect(halaman).not.toMatch(/\bC2\b|\bE1\b|\bB11\b/);
    // Simulasi: arti di pemakaian pertama. Hitungan, Asumsi, Ilustrasi, Tidak dijalankan: definisi sebelum widget.
    const pertamaSimulasi = halaman.indexOf("Simulasi");
    expect(pertamaSimulasi).toBe(halaman.indexOf("Hasilnya berlabel Simulasi: widget menghitungnya dengan aturan breaker yang sama dengan pustaka") + "Hasilnya berlabel ".length);
    expect(halaman.indexOf("Hitungan adalah hasil rumus")).toBeLessThan(halaman.indexOf("<CircuitBreaker />"));
    expect(halaman.indexOf("Hitungan")).toBe(halaman.indexOf("Hitungan adalah hasil rumus"));
    expect(halaman.indexOf("Slot adalah tempat satu pekerjaan")).toBeLessThan(halaman.indexOf("<CircuitBreaker />") + 400);
    expect(badan.search(/\bslot\b/i)).toBe(badan.indexOf("Slot worker") + "Slot worker. ".length - "Slot worker. ".length);
    // Lajur dan breaker: arti di kalimat pertama yang memakainya (judul dan deskripsi di frontmatter tidak dihitung).
    expect(halaman.indexOf("Lajur adalah bagian queue untuk satu vendor")).toBeLessThan(halaman.indexOf("<details"));
    expect(badan.search(/\blajur\b(?!\.txt|\.go)/)).toBe(badan.indexOf("Di bagian B, lajur verifikasi dijaga breaker.") + "Di bagian B, ".length);
    expect(badan.indexOf("Lajur adalah bagian queue") - badan.indexOf("Di bagian B, lajur verifikasi dijaga breaker.")).toBeLessThan(80);
    expect(halaman.indexOf("Idempotency-Key adalah nilai yang dikirim ulang di tiap percobaan")).toBeGreaterThan(0);
    expect(halaman.indexOf("Idempotency-Key")).toBeLessThanOrEqual(halaman.indexOf("Idempotency-Key adalah nilai yang dikirim ulang"));
    expect(halaman.indexOf("Breaker adalah mesin keadaan dengan tiga status.")).toBeGreaterThan(halaman.indexOf("Retry aman hanya dengan key yang sama."));
    for (const kata of ["closed", "open", "half-open"]) expect(halaman.indexOf(`Di ${kata},`)).toBeGreaterThan(halaman.indexOf("Breaker adalah mesin keadaan dengan tiga status."));
  });
});

describe("kunci kalimat: teks halaman, diagram, dan halaman istilah terkunci per baris (lapis 2)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantai), istilah: tekstual(istilah) },
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat timeout-retry-breaker.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, "timeout-retry-breaker.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string diagram dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

// Penutup celah seri mutasi tanpa kunci baris: label sumber, sumber halaman istilah, tanggal akses baris riset, dan "sidik kata penentu"
// (kunci agregat yang menangkap sisipan atau pembalikan kata penentu di mana pun, termasuk kalimat naratif yang tidak punya sumber angka).
// Nilai sidik dicatat dari halaman yang sudah dibaca dan dinilai benar kalimat demi kalimat terhadap sumbernya.
describe("penutup celah mutasi tanpa kunci: label, sumber, tanggal, dan sidik kata penentu", () => {
  const sidik = (teks: string, kata: string[]): Record<string, number> =>
    Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
  const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "lebih tinggi", "sampai"];
  const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
    else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
    return keluar;
  };
  test("jumlah label per jenis, dan Asumsi tidak naik menjadi Rekaman lab", () => {
    expect((halaman.match(/Rekaman lab/g) ?? []).length).toBe(JumlahRekamanLab);
    expect((halaman.match(/Tidak dijalankan/g) ?? []).length).toBe(JumlahTidakDijalankan);
    expect((halaman.match(/Asumsi/g) ?? []).length).toBe(JumlahAsumsi);
    expect((halaman.match(/Ilustrasi/g) ?? []).length).toBe(JumlahIlustrasi);
    expect((halaman.match(/Hitungan/g) ?? []).length).toBe(JumlahHitungan);
    expect((halaman.match(/\[perlu verifikasi\]/g) ?? []).length).toBe(3);
    expect((halaman.match(/penalaran dari/g) ?? []).length).toBe(JumlahPenalaran);
    expect((halaman.match(/Simulasi|mensimulasikan/g) ?? []).length).toBe(3);
    harus("Hitungan atas angka cerita, Tidak dijalankan");
    harus("Tidak dijalankan untuk batas tepat");
  });
  test("sidik kata penentu halaman, Rantai, dan halaman istilah (kunci agregat, bukan turunan)", () => {
    expect(sidik(halaman, KATA)).toEqual(SIDIK_HALAMAN);
    expect(sidik(nilaiString(rantai).join("\n"), KATA)).toEqual(SIDIK_RANTAI);
    expect(sidik(nilaiString(istilah).join("\n"), KATA)).toEqual(SIDIK_ISTILAH);
  });
  test("frontmatter, deskripsi, dan tanggal akses semua baris riset", () => {
    expect(halaman).toContain("description: Rekeningo memberi tiap panggilan keluar batas waktu 3 detik dan Idempotency-Key, lalu menjeda lajur vendor yang mati. ADR 36 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
    expect(halaman.startsWith('---\ntitle: "4.11 Timeout, retry berkunci, circuit breaker, lajur per vendor + ADR 36"\n')).toBe(true);
    for (const id of ["R4-160", "R4-161", "R4-162", "R4-163", "R4-164"]) {
      const b = baris(id);
      expect(b, id).not.toBe("");
      expect(b.split("|").length, `${id} harus 5 kolom`).toBe(7);
      expect(b).toContain("2026-10-29");
    }
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))));
    expect(ids.filter((x) => Number(x.slice(3)) >= 160 && Number(x.slice(3)) <= 164)).toEqual(["R4-160", "R4-161", "R4-162", "R4-163", "R4-164"]);
    expect((halaman.match(/dibuka 2026-10-29/g) ?? []).length).toBe(TanggalDibuka);
    expect((halaman.match(/2026-10-29/g) ?? []).length).toBe(TanggalAkses);
  });
  test("halaman istilah circuit-breaker: tiap kalimat terkunci terhadap sumbernya", () => {
    expect(istilah.istilah).toBe("Circuit breaker");
    expect(istilah.stack).toBeNull();
    expect(istilah.cerita).toHaveLength(1);
    expect(istilah.cerita[0]!.rujukan).toBe("t4-breaker");
    expect(istilah.cerita[0]!.teks).toBe(`Layanan verifikasi tiruan mati. Tanpa breaker, ${pendaftarA} pekerjaan menghabiskan ${permintaanA} permintaan dan semuanya mati. Dengan breaker, lajur verifikasi dijeda sesudah kegagalan keenam, dan ${lulusB} dari ${pendaftarA} pekerjaan lulus sesudah vendor pulih (\`lajur.txt\` bagian A dan B).`);
    expect(permintaanA).toBe(R.lajur.a.permintaan);
    expect(matiA).toBe(pendaftarA);
    expect(istilah.mekanisme[1]).toBe(`Sesudah kegagalan ke-${gagalKe}, breaker pindah ke open: panggilan ditolak seketika dan vendor tidak dipanggil (\`breaker.txt\` bagian A).`);
    expect(istilah.mekanisme[2]).toBe(`Sesudah ${A.bukaDetik} detik, breaker pindah ke half-open dan mengizinkan satu permintaan percobaan. Permintaan kedua ditolak selama yang pertama belum selesai.`);
    expect(istilah.mekanisme[3]).toBe(`Permintaan percobaan yang sukses menutup breaker. Yang gagal membuka breaker lagi untuk ${R.breaker.bukaLagiDetik} detik penuh (\`breaker.txt\` bagian B).`);
    expect(istilah.jebakan[0]).toContain(`enam dokumen rusak dengan vendor sehat membuka breaker (\`breaker.txt\` bagian C, \`lajur.txt\` bagian D)`);
    expect(istilah.terkait).toEqual(["Timeout", "Retry", "Idempotency key", "Dead-letter queue"]);
    for (const t of istilah.terkait) expect(glosarium, t).toMatch(new RegExp(`\\| \\*\\*${t}\\*\\*`));
    expect(istilah.sumber.map((s) => [s.riset ?? null, s.url ?? s.rekaman])).toEqual([
      ["R4-160", "https://pkg.go.dev/github.com/sony/gobreaker/v2@v2.4.0"],
      ["R4-163", "https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker"],
      [null, "labs/t4-integrasi/output/breaker.txt"],
    ]);
    expect(istilah.sumber[0]!.judul).toBe("gobreaker v2.4.0 (pkg.go.dev, dibuka 2026-10-29)");
    expect(istilah.sumber[1]!.judul).toBe("Azure Architecture Center: Circuit Breaker pattern (diperbarui 2025-02-05, dibuka 2026-10-29)");
    expect(baris("R4-163")).toContain("ms.date 2025-02-05");
    expect(fs.existsSync(path.join(akar, istilah.sumber[2]!.rekaman!))).toBe(true);
  });
});


// Penutup tahap dua (keputusan 1307): seri mutasi tanpa kunci meloloskan hapus-kalimat, hapus-baris, angka, versi, sel tabel, slot tab, dan nilai
// JSON yang tidak punya sumber turunan. Di sini struktur halaman (jumlah kalimat per baris) dan semua token angka dicatat sebagai sidik agregat,
// setiap token versi dan tanggal harus ada di sumbernya, tabel opsi ADR dan objek JSON dibandingkan utuh dengan nilai turunan, dan setiap slot
// tab diperiksa isinya.
describe("penutup tahap dua: sidik struktur, sidik angka, versi di sumber, sel tabel, slot tab, objek JSON", () => {
  const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
  const isiHalaman = (): { baris: string[]; kode: string[][] } => {
    const semua = halaman.slice(halaman.indexOf("<Blok")).split("\n");
    const baris: string[] = [];
    const kode: string[][] = [];
    let dalam = false;
    for (const b of semua) {
      if (!dalam && /<Snippet lang="[a-z]+" code=\{`/.test(b)) { dalam = true; kode.push([b]); continue; }
      if (dalam) { kode[kode.length - 1]!.push(b); if (/`\} \/>$/.test(b)) dalam = false; continue; }
      if (b.trim() !== "") baris.push(b);
    }
    return { baris, kode };
  };
  const { baris: prosa, kode: blokKode } = isiHalaman();
  const struktur = prosa.map((b) => {
    if (b.startsWith("#")) return `${b.match(/^#+/)![0]}`;
    if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
    if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
    const n = b.split(SPLIT).length;
    if (b.startsWith("- ")) return `-:${n}`;
    if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
    if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
    return `p:${n}`;
  });
  const angkaToken = prosa
    .filter((b) => !b.startsWith("<Snippet") && !b.startsWith("import "))
    .flatMap((b) => [...b.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]));

  test("sidik struktur: jumlah kalimat per baris, nomor daftar, tabel, dan tag", () => {
    expect(struktur.join(" ")).toBe(SIDIK_STRUKTUR);
  });
  test("sidik angka: urutan semua token angka di prosa", () => {
    expect(angkaToken.join(" ")).toBe(SIDIK_ANGKA);
    for (const sel of ["10", "50", "6", "9", "1", "5"]) expect(angkaToken).toContain(sel);
  });
  test("tiga blok kode Ilustrasi utuh", () => {
    expect(blokKode.map((x) => x.join("\n"))).toEqual([
      '<Snippet lang="js" code={`const jawab = await fetch(url, {\n  method: "POST",\n  headers: { "Idempotency-Key": String(pengajuan.id) },\n  body,\n  signal: AbortSignal.timeout(3000),\n});`} />',
      "<Snippet lang=\"php\" code={`$jawab = Http::timeout(3)\n    ->withHeaders(['Idempotency-Key' => (string) $pengajuan->id])\n    ->retry(5, 100, throw: false)\n    ->post($url, $badan);`} />",
      '<Snippet lang="python" code={`jawab = requests.post(\n    url,\n    json=badan,\n    headers={"Idempotency-Key": str(pengajuan.id)},\n    timeout=(3.05, 3),\n)`} />',
    ]);
  });
  test("setiap token versi dan tanggal di halaman ada di sumbernya (README lab, rekaman, atau baris RISET halaman ini)", () => {
    const sumber = [readme, lajurTxt, breakerTxt, retryTxt, workerTxt, ...["R4-160", "R4-161", "R4-162", "R4-163", "R4-164"].map(baris), istilah.sumber.map((x) => x.judul).join("\n")].join("\n");
    const token = [...prosa.join("\n").replace(/\]\([^)]*\)/g, "]").matchAll(/v\d+\.\d+\.\d+|\d+\.\d+\.\d+|\d+\.x|API v\d|\b\d{4}-\d{2}-\d{2}\b|Go \d+\.\d+(?:\.\d+)?|PostgreSQL \d+\.\d+/g)].map((m) => m[0]);
    expect(token.length).toBeGreaterThan(25);
    for (const t of new Set(token)) expect(sumber, `token versi tidak ada di sumber: ${t}`).toContain(t.replace(/^Go /, "").replace(/^PostgreSQL /, ""));
    const url = [...halaman.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(url.filter((u) => u.includes("gobreaker")).every((u) => u.endsWith("@v2.4.0"))).toBe(true);
    expect(url.filter((u) => u.includes("laravel.com")).every((u) => u.includes("/docs/13.x/"))).toBe(true);
  });
  test("tabel opsi ADR 36 utuh, sel demi sel", () => {
    const t = tabel("| | A. Retry bebas tanpa key |", 5).slice(2);
    expect(t).toEqual([
      ["Cara kerja", "Tiap percobaan memakai Idempotency-Key baru, atau tanpa key", "Breaker membungkus panggilan di sinkron dan di worker. Penolakan breaker tetap lewat jalur gagal ADR 25", "Tiap vendor punya service dan queue sendiri", "Semua client lewat satu fungsi dengan timeout 3 detik. Key dari id pengajuan. Lajur per `tujuan` dijeda selagi breaker terbuka, tanpa menghitung percobaan"],
      ["Kelebihan", "Tidak ada key untuk dikelola", "Panggilan ke vendor yang mati berhenti", "Satu vendor mati hanya menjatuhkan service-nya", "Pekerjaan tidak memakai percobaan saat vendor jelas mati, dan retry tidak membuat objek kedua"],
      ["Kekurangan", "Percobaan yang hasilnya tidak diketahui bisa membuat objek kedua di vendor", "Klaim ke lajur yang terbuka menaikkan percobaan tanpa memanggil vendor (penalaran dari kode)", "Service tambahan per vendor: deploy, pemantauan, dan versi dependency sendiri-sendiri", "Satu komponen lagi, dengan keadaan di memori satu proses worker dan lima celah yang lab temukan"],
      ["Biaya operasional", "Rendah, tetapi Rekeningo tidak melihat objek kedua di vendor (`retry.txt` bagian B)", "Status breaker per proses, dan ambang yang harus dipilih", "Tinggi: Segment menulis lebih dari 140 service", "Alert untuk breaker yang terbuka lebih dari 10 menit (Asumsi)"],
      ["Bukti", "Rekaman lab `retry.txt` B: dua objek untuk satu pendaftar", "Tidak dijalankan. Dokumentasi Azure menulis pola ini mungkin kurang cocok untuk arsitektur berbasis pesan", "Tidak dijalankan. Kasus Segment di bawah", "Rekaman lab `retry.txt` A dan C, `breaker.txt` A sampai C, `lajur.txt` B, `worker.txt` B. Jalur sinkron Tidak dijalankan"],
    ]);
    const kepala = tabel("| | A. Retry bebas tanpa key |", 5)[0]!;
    expect(kepala).toEqual(["", "A. Retry bebas tanpa key", "B. Breaker di semua jalur, termasuk queue, tanpa penjeda klaim", "C. Satu service per vendor", "D. Satu pembuat client, key dari id, breaker sinkron, lajur dijeda"]);
    expect(t[3]![3]).toContain(`${baris("R4-162").match(/lebih dari (\d+) service/)![1]} service`);
  });
  test("slot tab: tiap slot memuat stack yang labelnya sama, dan baris pembuka tiap tab", () => {
    const slot = [...halaman.matchAll(/<Fragment slot="(t\d)">\n\n(.*)\n/g)].map((m) => [m[1], m[2]]);
    expect(slot).toEqual([
      ["t0", "*Dijalankan: lab api-t4 dan t4-integrasi, PostgreSQL 17.11, Go 1.27.1, dan gobreaker v2.4.0 (rekaman `lajur.txt`, `retry.txt`, `breaker.txt`).*"],
      ["t1", "*Tidak dijalankan. Dicek ke [MDN: AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static), halaman tanpa nomor versi, dan ke README [opossum](https://github.com/nodeshift/opossum) 10.0.0 (npm, terbit 2026-06-24), dibuka 2026-10-29. Kode di bawah adalah Ilustrasi.*"],
      ["t2", "*Tidak dijalankan. Dicek ke [Laravel 13.x: HTTP Client](https://laravel.com/docs/13.x/http-client), dibuka 2026-10-29. Kode di bawah adalah Ilustrasi.*"],
      ["t3", "*Tidak dijalankan. Dicek ke dokumentasi [requests: Advanced Usage](https://requests.readthedocs.io/en/latest/user/advanced/), dibuka 2026-10-29. Dokumentasi Django tidak dibaca untuk panggilan keluar [perlu verifikasi]. Kode di bawah adalah Ilustrasi.*"],
      ["t4", "*Tidak dijalankan. Dicek ke dokumentasi Dart 3.13.7: [HttpClient.connectionTimeout](https://api.dart.dev/stable/latest/dart-io/HttpClient/connectionTimeout.html) dan [Future.timeout](https://api.dart.dev/dart-async/Future/timeout.html), dibuka 2026-10-29.*"],
      ["t5", "*Tidak dijalankan. Dicek ke [Supabase: Edge Functions limits](https://supabase.com/docs/guides/functions/limits), dokumen tanpa nomor versi, dibuka 2026-10-29.*"],
    ]);
    const bagianTab = halaman.slice(halaman.indexOf('<TabSet id="stack"'), halaman.indexOf("</TabSet>"));
    const potong = bagianTab.split(/<Fragment slot="t\d">/).slice(1);
    expect(potong).toHaveLength(6);
    expect(potong[0]).toContain("labs/api-t4/internal/worker/verifikasi.go");
    expect(potong[1]).toContain("AbortSignal.timeout(3000)");
    expect(potong[2]).toContain("Http::timeout(3)");
    expect(potong[3]).toContain("requests.post(");
    expect(potong[4]).toContain("`connectionTimeout`");
    expect(potong[5]).toContain("Request idle timeout 150 detik");
    for (const k of [1, 2, 3, 4, 5]) expect(potong[k]).not.toContain("labs/api-t4/internal");
  });
  test("objek Rantai utuh dengan angka turunan dari rekaman", () => {
    expect(rantai).toEqual({
      id: "t4-breaker-inti",
      judul: "Vendor mati, tanpa dan dengan lajur dijeda",
      sumber: { jenis: "rekaman", teks: "Rekaman lab t4-integrasi, lajur.txt A dan B" },
      baris: [
        { label: "Tanpa breaker", sub: `${pendaftarA} pekerjaan`, simpul: [
          { teks: `${permintaanA} permintaan`, sub: `${R.lajur.percobaan} tiap pekerjaan` },
          { teks: `${matiA} mati`, sub: "pengajuan gagal", nada: "warn" },
          { teks: `pulih: ${klaimSesudahPulih} diklaim`, sub: "tak ada yang mengantre ulang", nada: "warn" },
        ] },
        { label: "Lajur dijeda", sub: `${pendaftarA} pekerjaan`, simpul: [
          { teks: `${permintaanBuka} permintaan`, sub: `lajur dijeda, ${objekBuka} objek` },
          { teks: "vendor pulih", sub: "satu permintaan percobaan" },
          { teks: `${lulusB} lulus, ${R.lajur.b.gagal} mati`, sub: `dari ${pendaftarA} pekerjaan`, nada: "good" },
        ] },
      ],
      catatan: `Vendor adalah layanan verifikasi tiruan lokal. Kedua baris memakai satu worker, ${bilangan(R.lajur.percobaan)} percobaan, dan tanpa jeda antar percobaan. Breaker di baris kedua memakai Timeout ${timeoutB} detik, bukan ${A.bukaDetik} detik bawaan pustaka.`,
    });
  });
  test("objek halaman istilah utuh dengan angka turunan dari rekaman", () => {
    expect(istilah).toEqual({
      istilah: "Circuit breaker",
      sehari_hari: "Circuit breaker adalah penjaga di depan layanan luar. Sesudah beberapa kegagalan berturut-turut ia berhenti memanggil layanan itu, lalu mencoba lagi sesudah jeda.",
      cerita: [{ rujukan: "t4-breaker", teks: `Layanan verifikasi tiruan mati. Tanpa breaker, ${pendaftarA} pekerjaan menghabiskan ${permintaanA} permintaan dan semuanya mati. Dengan breaker, lajur verifikasi dijeda sesudah kegagalan keenam, dan ${lulusB} dari ${pendaftarA} pekerjaan lulus sesudah vendor pulih (\`lajur.txt\` bagian A dan B).` }],
      mekanisme: [
        "Di status closed, panggilan lewat dan breaker menghitung kegagalan berturut-turut.",
        `Sesudah kegagalan ke-${gagalKe}, breaker pindah ke open: panggilan ditolak seketika dan vendor tidak dipanggil (\`breaker.txt\` bagian A).`,
        `Sesudah ${A.bukaDetik} detik, breaker pindah ke half-open dan mengizinkan satu permintaan percobaan. Permintaan kedua ditolak selama yang pertama belum selesai.`,
        `Permintaan percobaan yang sukses menutup breaker. Yang gagal membuka breaker lagi untuk ${R.breaker.bukaLagiDetik} detik penuh (\`breaker.txt\` bagian B).`,
      ],
      stack: null,
      jebakan: [
        "Menghitung jawaban 4xx sebagai kegagalan vendor. Bawaan pustaka gobreaker melakukannya, dan enam dokumen rusak dengan vendor sehat membuka breaker (`breaker.txt` bagian C, `lajur.txt` bagian D).",
        `Memasang ambang yang lebih tinggi daripada batas percobaan satu pekerjaan. Pekerjaan pertama habis ${bilangan(R.lajur.percobaan)} percobaan sebelum kegagalan keenam membuka breaker (\`lajur.txt\` bagian B).`,
        "Memakai pekerjaan nyata sebagai permintaan percobaan di half-open. Tiap permintaan percobaan yang gagal memakai satu percobaan pekerjaan terdepan.",
      ],
      terkait: ["Timeout", "Retry", "Idempotency key", "Dead-letter queue"],
      sumber: [
        { riset: "R4-160", judul: "gobreaker v2.4.0 (pkg.go.dev, dibuka 2026-10-29)", url: "https://pkg.go.dev/github.com/sony/gobreaker/v2@v2.4.0", catatan: "Bawaan: membuka bila gagal berturut-turut lebih dari 5, Timeout open 60 detik, satu permintaan di half-open, dan setiap error non-nil dihitung gagal." },
        { riset: "R4-163", judul: "Azure Architecture Center: Circuit Breaker pattern (diperbarui 2025-02-05, dibuka 2026-10-29)", url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker", catatan: "Tiga status closed, open, dan half-open. Aplikasi tidak boleh terus mengulang operasi yang kecil kemungkinannya berhasil." },
        { judul: "Rekaman lab t4-integrasi: breaker.txt bagian A sampai C", rekaman: "labs/t4-integrasi/output/breaker.txt", catatan: `Jam diperankan: open sesudah gagal ke-${gagalKe}, open pada ${koma(sebelumBuka, 3)} detik dan half-open pada ${koma(sesudahBuka, 3)} detik, 4xx bawaan lawan kustom.` },
      ],
    });
  });
  test("baris riset halaman ini: jumlah tanggal akses per baris, dan tanggal dibuka tidak berubah di sebagian saja", () => {
    const hitung = Object.fromEntries(["R4-160", "R4-161", "R4-162", "R4-163", "R4-164"].map((id) => [id, (baris(id).match(/2026-10-29/g) ?? []).length]));
    expect(hitung).toEqual({ "R4-160": 3, "R4-161": 1, "R4-162": 1, "R4-163": 2, "R4-164": 1 });
    for (const [id, kata] of [["R4-160", "more than 5"], ["R4-161", "A Timeout of zero means no timeout."], ["R4-163", "255 karakter"], ["R4-163", "ms.date 2025-02-05"]] as const) expect(baris(id), `${id} ${kata}`).toContain(kata);
  });
});

const JumlahRekamanLab = 10;
const JumlahTidakDijalankan = 19;
const JumlahAsumsi = 7;
const JumlahIlustrasi = 6;
const JumlahHitungan = 7;
const JumlahPenalaran = 6;
const TanggalDibuka = 10;
const TanggalAkses = 11;
const SIDIK_STRUKTUR = "<Blok ## p:1 <Rantai p:4 p:4 <details <summary 1.:3 2.:3 3.:2 p:2 </details </Blok <Blok p:3 p:2 p:4 <CircuitBreaker p:2 p:3 </Blok <Blok ### p:3 p:2 ### p:5 <Snippet p:3 p:2 <Snippet p:4 p:2 p:2 <Snippet <Snippet p:4 p:3 p:2 p:4 <Snippet p:4 p:4 <Snippet p:3 p:3 <Snippet p:3 p:2 <Snippet p:3 <Snippet p:2 p:3 p:1 <Snippet p:3 |:3 |:3 |:3 |:3 |:3 |:3 p:4 p:1 1.:4 2.:4 3.:6 4.:4 5.:4 ### p:2 p:3 <TabSet <Fragment p:1 <Snippet p:3 </Fragment <Fragment p:3 p:4 </Fragment <Fragment p:3 p:3 </Fragment <Fragment p:4 p:4 </Fragment <Fragment p:2 p:5 </Fragment <Fragment p:2 p:5 </Fragment </TabSet </Blok <Blok ### p:4 p:3 |:5 |:5 |:5 |:5 |:5 |:5 |:5 p:1 1.:3 2.:3 3.:5 4.:4 5.:3 6.:4 p:1 -:2 -:6 -:2 p:2 p:2 p:4 p:2 1.:5 2.:6 3.:6 p:1 -:2 -:3 -:3 -:5 -:3 p:2 ### |:3 |:3 |:3 |:3 |:3 |:3 </Blok <Blok ### **1**:2 <details <summary p:2 </details **2**:2 <details <summary p:2 </details **3**:1 <details <summary p:3 </details **4**:2 <details <summary p:3 </details ### -:1 -:1 -:1 -:1 -:1 -:1 ### -:1 -:1 -:1 -:1 -:1 -:1 -:1 -:1 -:1 -:1 -:1 </Blok";
const SIDIK_ANGKA = "10 50 10 10 9 10 1 3 1 10 2 3 10 180 10 1 10 50 4 8 10 2025 02 05 2026 10 29 3 1.27.3 1.27.1 2026 10 29 3 22 300 3 2 1 503 503 200 2 1 36 2 255 500 24 2026 10 29 5 60 2026 01 01 2026 10 29 3 59,999 60,001 60 60 60 10 3 8 6 0,5 9 1 9 3 3 30 60 2,0 2,0 2,9 3,6 3 4 3 1.000 10 7,52 0,3 1.000 86.400 10 0,116 0,116 5 3 1,74 4 7,52 0,3 2,26 4 1,74 2,26 4,00 4 4,00 3,99 3 1 4 8 1 2 2 0 3 3 30 12.600 0,0116 12.600 146 12.600 60 210 210 5 42 146 4 10 34 6 5 4 400 499 401 403 408 429 5 2026 10 29 17.11 1.27.1 25 10.0.0 2026 06 24 2026 10 29 10 10 6 13 2026 10 29 30 10 2026 10 29 3.13.7 2026 10 29 2026 10 29 150 504 150 400 2 150 50 3 36 10 10 0,116 7,52 4 22 25 25 3 140 10 1 3 22 2 3 6 60 4 5 6 401 403 408 429 10 10 2018 2018 07 10 140 2026 10 29 140 6 1 2 12.600 42 146 3 422 4 34 10 401 403 408 429 403 0,116 1,74 4 4,00 4 3 0,0116 0,174 403 401 403 1 2 401 403 408 429 140 1 10 50 5 10 0 2 2 1 3 10 4 422 36 4 36 4 10 34 13";
const SIDIK_HALAMAN: Record<string, number> = { tidak: 93, bukan: 16, belum: 15, hanya: 17, tanpa: 31, sesudah: 27, sebelum: 6, juga: 3, setiap: 2, semua: 7, "lebih dari": 6, "paling banyak": 2, selalu: 1, sama: 19, "lebih tinggi": 2, sampai: 13 };
const SIDIK_RANTAI: Record<string, number> = { tidak: 0, bukan: 1, belum: 0, hanya: 0, tanpa: 3, sesudah: 0, sebelum: 0, juga: 0, setiap: 0, semua: 0, "lebih dari": 0, "paling banyak": 0, selalu: 0, sama: 0, "lebih tinggi": 0, sampai: 0 };
const SIDIK_ISTILAH: Record<string, number> = { tidak: 2, bukan: 0, belum: 1, hanya: 0, tanpa: 1, sesudah: 7, sebelum: 1, juga: 0, setiap: 1, semua: 0, "lebih dari": 1, "paling banyak": 0, selalu: 0, sama: 0, "lebih tinggi": 1, sampai: 1 };
