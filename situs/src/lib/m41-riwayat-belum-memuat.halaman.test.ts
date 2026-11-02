// Penjaga halaman 5.6 (keputusan 1520 sampai 1522): angka, hitungan, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak",
// diagram Rantai t5-m41-riwayat-replica.json, skenario alur t5-m41.json, kartu Cek diri, dan baris riset di m41-riwayat-belum-memuat.mdx.
// Nilai diturunkan dari rekaman labs/t5-replika/output/baca.txt dan jeda.txt, kode labs/api-t5 (replika.go, kirim.go, bayar.go, ledger.go,
// handler_t5.go), naskah Tahap 5 (baris M41), halaman ADR 45, registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis:
// (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// m41-riwayat-belum-memuat.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang
// sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m41-riwayat-belum-memuat.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya punya satu rekaman (baca.txt bagian A, varian bagian B, dan jeda.txt
// bagian A); layar HP dan jeda ±2 detik tidak direkam, jadi tak satu pun angka waktu berlabel Rekaman lab selain batas 1 detik dan 100 per detik.
// Baris riset tetangga (R5-134 atau R5-140) tidak dikunci: hanya R5-135 sampai R5-139 yang diperiksa, dengan urutan naik.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m41-riwayat-replica.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m41-riwayat-belum-memuat.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  // berkas baru milik PR ini belum terlacak sebelum commit; sesudahnya semua berkas yang dibaca harus terlacak
  if (terlacak && process.env.CI) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-5/m41-riwayat-belum-memuat.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t5-m41.json")) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const baca_txt = baca("labs/t5-replika/output/baca.txt");
const rek = baca_txt.split("\n");
const jeda = baca("labs/t5-replika/output/jeda.txt");
const kodeReplika = baca("labs/api-t5/internal/service/replika.go");
const kodeKirim = baca("labs/api-t5/internal/service/kirim.go");
const kodeBayar = baca("labs/api-t5/internal/service/bayar.go");
const kodeLedger = baca("labs/api-t5/internal/repo/ledger.go");
const kodeHandlerT5 = baca("labs/api-t5/internal/handler/handler_t5.go");
const adr45 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: { hp: { saldo: number; isi: { jenis: string; teks?: string; kiri?: string; kanan?: string }[] } } }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string; file: string; fileVarian: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: { hp: { saldo: number; isi: { jenis: string; teks?: string; kiri?: string; kanan?: string }[] } };
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const pecahBaris = (b: string): string[] => b.replace(/\\\|/g, "\u00a6").split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const rp = (n: number): string => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const angkaId = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const jumlah = (teks: string, k: string): number => teks.split(k).length - 1;
const harus = (kalimat: string): void => {
  expect(jumlah(badan, kalimat), `kalimat harus tepat satu kali: ${kalimat}`).toBe(1);
};
const ada = (id: string): H => dari(id);
void ada;

// --- naskah: baris M41 (kolom: #, minggu, gejala, dikira, sebenarnya, konsep, keputusan)
const barisM41 = naskah.split("\n").find((b) => b.startsWith("| M41 |")) ?? "";
const kolomM41 = pecahBaris(barisM41);
const mingguM41 = Number(kolomM41[1]);
const gejalaM41 = kolomM41[2]!;
const dikiraM41 = kolomM41[3]!;
const sebenarnyaM41 = kolomM41[4]!;
const detikCerita = Number(cari(/selama ±(\d+) detik/, gejalaM41, "±2 detik")[1]);
const bayarCerita = cari(/Budi membayar Rp(\d+\.\d+) di warung/, gejalaM41, "Rp35.000")[1]!;

// --- rekaman baca.txt: bagian A (versi pertama) dan B (versi benar)
const garis = (pola: RegExp, dari0 = 0): number => {
  const i = rek.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan sesudah baris ${dari0}`);
  return i + 1; // 1-based
};
const nA = garis(/^# --- A\./);
const nB = garis(/^# --- B\./);
const bagianDi = (n: number): string => {
  let huruf = "";
  rek.forEach((b, i) => { if (i + 1 <= n) { const m = b.match(/^# --- ([A-Z])\./); if (m) huruf = m[1]!; } });
  return huruf;
};
const jsonDi = (dari1: number, sampai1: number): { baris: number; nilai: any }[] =>
  rek.map((b, i) => ({ b, baris: i + 1 })).filter((x) => x.baris >= dari1 && x.baris <= sampai1 && x.b.startsWith("{")).map((x) => ({ baris: x.baris, nilai: JSON.parse(x.b) }));
const jsonA = jsonDi(nA, nB - 1);
const jsonB = jsonDi(nB, rek.length);
const dibacaDari = (dari1: number, sampai1: number): string[] => rek.slice(dari1 - 1, sampai1).filter((b) => b.startsWith("X-Dibaca-Dari:")).map((b) => b.split(": ")[1]!);
const akunA = jsonA.filter((x) => x.nilai.jenis === "karyawan").map((x) => x.nilai.saldo as number); // GET /akun: awal, sesudah bayar, akhir
const riwayatA = jsonA.filter((x) => Array.isArray(x.nilai.riwayat)).map((x) => (x.nilai.riwayat as unknown[]).length);
const bayarA = jsonA.find((x) => x.nilai.id === 10201)!.nilai as { id: number; saldo: number };
const bayarNominalA = Number(cari(/-d '\{"ke": 505, "nominal": (\d+)\}'/, rek.slice(nA, nB).join("\n"), "nominal bayar A")[1]);
const kirimA = Number(cari(/"ke_nomor_karyawan": "K00504", "nominal": (\d+)/, rek.slice(nA, nB).join("\n"), "nominal kiriman")[1]);
const nSelectPrimary = garis(/^primary=> SELECT saldo_cache/);
const nSelectReplika = garis(/^replika=> SELECT saldo_cache/, nSelectPrimary);
const saldoPrimary = Number(rek[nSelectPrimary + 2]!.trim());
const saldoReplikaSelect = Number(rek[nSelectReplika + 2]!.trim());
const nKirimCurl = garis(/^\$ curl -i -X POST '\/kiriman'/);
const problemKirim = jsonA.find((x) => x.nilai.type === "/problems/saldo-kurang")!;
const bayarNominalB = Number(cari(/-d '\{"ke": 505, "nominal": (\d+)\}'/, rek.slice(nB).join("\n"), "nominal bayar B")[1]);
const bayarB = jsonB.find((x) => x.nilai.id === 10202)!.nilai as { id: number; saldo: number };
const akunB = jsonB.filter((x) => x.nilai.jenis === "karyawan").map((x) => x.nilai.saldo as number); // tanpa token, dengan token, sesudah menyusul
const riwayatB = jsonB.filter((x) => Array.isArray(x.nilai.riwayat)).map((x) => (x.nilai.riwayat as unknown[]).length);
const sumberB = dibacaDari(nB, rek.length);
const rps = Number(cari(/-rps (\d+) -detik (\d+)/, jeda, "beban jeda")[1]);
const detikBeban = Number(cari(/-rps (\d+) -detik (\d+)/, jeda, "beban jeda")[2]);
const maksBayar = Number(cari(/const MaksBayar = ([\d_]+)/, kodeBayar, "MaksBayar")[1]!.replace(/_/g, ""));
const stat = (n: number): string => rek[n - 1]!;

const URL_STANDBY = "https://www.postgresql.org/docs/17/warm-standby.html";
const URL_ADMIN = "https://www.postgresql.org/docs/17/functions-admin.html";

describe("rekaman baca.txt dan jeda.txt: nilai turunan dari berkasnya sendiri", () => {
  test("bagian A: delapan JSON dalam urutan akun, riwayat, bayar, akun, riwayat, problem, akun, riwayat; semua GET dari replika", () => {
    expect(jsonA.map((x) => (x.nilai.jenis ? "akun" : Array.isArray(x.nilai.riwayat) ? "riwayat" : x.nilai.type ? "problem" : "bayar"))).toEqual(["akun", "riwayat", "bayar", "akun", "riwayat", "problem", "akun", "riwayat"]);
    expect(dibacaDari(nA, nB - 1)).toEqual(["replika", "replika", "replika", "replika", "replika", "replika"]);
    expect(akunA).toEqual([250000, 250000, 215000]);
    expect(riwayatA).toEqual([1, 1, 2]);
    expect(bayarA.saldo).toBe(akunA[0]! - bayarNominalA);
    expect(bayarNominalA).toBe(35000);
    expect(rp(bayarNominalA).slice(2)).toBe(bayarCerita);
  });
  test("bagian A: primary Rp215.000 lawan replika Rp250.000, dan kiriman Rp240.000 ditolak 422 saldo-kurang walau saldo tampil Rp250.000", () => {
    expect(saldoPrimary).toBe(bayarA.saldo);
    expect(saldoReplikaSelect).toBe(akunA[0]);
    expect(kirimA).toBe(240000);
    expect(kirimA).toBeLessThanOrEqual(akunA[1]!);
    expect(kirimA).toBeGreaterThan(saldoPrimary);
    expect(kirimA).toBeGreaterThan(maksBayar);
    expect(maksBayar).toBe(200000);
    expect(stat(nKirimCurl + 1)).toBe("HTTP/1.1 422 Unprocessable Entity");
    expect(problemKirim.nilai.status).toBe(422);
    expect(problemKirim.baris).toBe(nKirimCurl + 4);
    expect(stat(nKirimCurl - 1)).toContain("Memakai kiriman, bukan pembayaran");
    expect(stat(nKirimCurl - 1)).toContain("Rp200.000");
  });
  test("bagian A: token tidak membantu; sesudah replika menyusul saldo 215000 dan riwayat dua baris; komentar rekaman sama dengan kalimat halaman", () => {
    expect(rek.some((b) => b === "# Token dikirim, tetapi mode ini mengabaikannya.")).toBe(true);
    expect(rek.some((b) => b === "# Jawaban bayar membawa X-Lsn-Tulis: posisi WAL primary sesudah COMMIT. App menyimpannya untuk bacaan berikutnya.")).toBe(true);
    expect(rek.some((b) => b === "# Sesudah replika menyusul, saldo tampil Rp215.000 dan riwayat dua baris: yang salah hanya yang dilihat user, dan hanya sementara.")).toBe(true);
    expect(rek.filter((b) => b.includes("pg_wal_replay_resume")).length).toBe(0);
    expect(rek.filter((b) => b.includes("pg_wal_replay_pause")).length).toBe(2);
  });
  test("bagian B: pembayaran kedua dari saldo bagian A; tanpa token replika, dengan token primary lalu replika; tiga baris riwayat", () => {
    expect(bayarNominalB).toBe(12000);
    expect(bayarB.saldo).toBe(akunA[2]! - bayarNominalB);
    expect(akunB).toEqual([215000, 203000, 203000]);
    expect(riwayatB).toEqual([3, 3]);
    expect(sumberB).toEqual(["replika", "primary", "primary", "replika", "replika"]);
  });
  test("jeda.txt bagian A: 100 pembayaran per detik selama 10 detik, jeda tertinggi di kedua standby di bawah 1 detik, nilai tidak direkam", () => {
    expect(rps).toBe(100);
    expect(detikBeban).toBe(10);
    expect(jeda).toContain("replay_lag tertinggi di kedua standby di bawah 1 detik (batas lab; nilai tidak direkam): ya");
    expect(jeda).toContain("Pada beban ini jeda alami di bawah 1 detik. Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab");
    expect(jeda.indexOf("# --- A.")).toBeLessThan(jeda.indexOf("replay_lag tertinggi"));
    expect(jeda.indexOf("replay_lag tertinggi")).toBeLessThan(jeda.indexOf("# --- B."));
  });
  test("kepala rekaman: PostgreSQL 17.11, go1.27.3, pgx v5.11.0, dan satu primary dengan replika asinkron", () => {
    expect(rek[1]).toContain("PostgreSQL 17.11");
    expect(rek[1]).toContain("go1.27.3");
    expect(rek[1]).toContain("pgx v5.11.0");
    expect(rek[1]).toContain("primary, replika asinkron, dan standby sinkron di container lokal");
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, dan pgx v5.11.0, dari database bersih, dengan satu primary dan satu replica asinkron di container lokal. Server `api-t5` berjalan dengan mode `-rentan riwayat-replika`.");
  });
});

describe("kode lab: sumberTampil, kiriman, bayar, header, dan lingkup klaim 'tidak'", () => {
  const kr = kodeReplika.split("\n");
  const kk = kodeKirim.split("\n");
  test("sumberTampil memilih replica di mode riwayat-replika dan bila token kosong, sebelum membaca token; replica nil berarti primary", () => {
    const n = kr.findIndex((b) => b.startsWith("func (s Service) sumberTampil(")) + 1;
    expect(kr[n]).toBe("\tif s.replika == nil {");
    expect(kr[n + 1]).toBe("\t\treturn s.repo, \"\", nil");
    expect(kr[n + 3]).toBe("\tif s.rentan == RentanRiwayatReplika || token == \"\" {");
    expect(kr[n + 4]).toBe("\t\treturn s.replika, SumberReplika, nil");
    expect(kr[n + 5]).toBe("\t}");
    expect(kodeReplika.indexOf("s.rentan == RentanRiwayatReplika")).toBeLessThan(kodeReplika.indexOf("polaLSN.MatchString(token)"));
    expect(kodeReplika).toContain("RentanRiwayatReplika = \"riwayat-replika\"");
  });
  test("tiga Snippet rekaman dan dua Snippet kode: file, rentang, isi pertama dan terakhir, dan huruf bagian", () => {
    const sn = [...badan.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"(?: lang="(\w+)")? title="([^"]+)" \/>/g)];
    expect(sn.map((m) => m[1])).toEqual([
      "labs/t5-replika/output/baca.txt", "labs/api-t5/internal/service/replika.go", "labs/t5-replika/output/baca.txt", "labs/api-t5/internal/service/kirim.go", "labs/t5-replika/output/baca.txt",
    ]);
    const r = sn.map((m) => [Number(m[2]), Number(m[3])] as const);
    // rekaman: awal dan akhir diturunkan dari penanda di baca.txt
    const nGetAwal = garis(/^\$ curl -i -X GET '\/akun\/419' -H 'Authorization: Bearer <token sesi Budi>'$/, nA);
    const nAkhirToken = garis(/^# Token dikirim, tetapi mode ini mengabaikannya\.$/);
    expect(r[0]).toEqual([nGetAwal, nAkhirToken]);
    expect(r[2]).toEqual([nSelectPrimary, nKirimCurl + 4]);
    const nGetSusul = garis(/^\$ curl -i -X GET '\/akun\/419'/, nKirimCurl + 4);
    const nAkhirA = garis(/^# Sesudah replika menyusul, saldo tampil/);
    expect(r[4]).toEqual([nGetSusul, nAkhirA]);
    expect(nAkhirA).toBe(nB - 2); // baris kosong, lalu penanda bagian B
    expect(r[0]![0]).toBe(nA + 4);
    // kode: awal fungsi sumberTampil sampai penutup dua cabang pertama; DalamTx sampai ErrSaldoKurang
    const nFungsi = kr.findIndex((b) => b.startsWith("func (s Service) sumberTampil(")) + 1;
    expect(r[1]).toEqual([nFungsi, nFungsi + 6]);
    const nDalam = kk.findIndex((b) => b === "\terr = s.repo.DalamTx(ctx, func(tx repo.Tx) error {") + 1;
    const nSaldo = kk.findIndex((b) => b === "\t\tif dari.Saldo < nominal {") + 1;
    expect(r[3]).toEqual([nDalam, nSaldo + 2]);
    expect(kk[nSaldo]).toBe("\t\t\treturn ErrSaldoKurang");
    expect(kk[nSaldo + 1]).toBe("\t\t}");
    expect(kk[nDalam]).toBe("\t\tbuku, err := tx.KunciBukuAkun(ctx, akun...)");
    for (const [i, [, b]] of r.entries()) expect(b, `Snippet ${i}`).toBeLessThanOrEqual(i % 2 === 0 ? rek.length : 400);
    expect(sn.map((m) => m[4] ?? "")).toEqual(["", "go", "", "go", ""]);
    // judul: huruf bagian dan berkas
    for (const i of [0, 2, 4]) {
      expect(sn[i]![5]).toContain(`bagian ${bagianDi(r[i]![0])}`);
      expect(sn[i]![5]).toContain("labs/t5-replika/output/baca.txt");
      expect(bagianDi(r[i]![0])).toBe("A");
      expect(bagianDi(r[i]![1])).toBe("A");
    }
    expect(sn[1]![5]).toBe(`Kode lab: labs/api-t5/internal/service/replika.go baris ${r[1]![0]} sampai ${r[1]![1]} (mode riwayat-replika dan bacaan tanpa token dibaca dari replica)`);
    expect(sn[3]![5]).toBe(`Kode lab: labs/api-t5/internal/service/kirim.go baris ${r[3]![0]} sampai ${r[3]![1]} (saldo dibaca di dalam transaction di primary)`);
    expect(sn[0]![5]).toBe("Rekaman lab: labs/t5-replika/output/baca.txt, bagian A (saldo dan riwayat sebelum bayar, bayar Rp35.000, lalu saldo dan riwayat dari replica)");
    expect(sn[2]![5]).toBe("Rekaman lab: labs/t5-replika/output/baca.txt, bagian A (saldo di primary dan replica, lalu kiriman Rp240.000 ditolak)");
    expect(sn[4]![5]).toBe("Rekaman lab: labs/t5-replika/output/baca.txt, bagian A (sesudah replica menyusul)");
  });
  test("klaim negatif berlingkup: kode kiriman dan bayar tidak menyebut replica; hanya dua bacaan tampil memakai sumberTampil", () => {
    expect(kodeKirim.toLowerCase()).not.toContain("replika");
    expect(kodeKirim.toLowerCase()).not.toContain("replica");
    expect(kodeBayar.toLowerCase()).not.toContain("replika");
    expect(kodeBayar.toLowerCase()).not.toContain("replica");
    expect(kodeKirim).toContain("s.repo.DalamTx(");
    expect(kodeBayar).toContain("s.repo.DalamTx(");
    expect(kodeLedger).toMatch(/KunciBukuAkun[\s\S]{0,400}FOR UPDATE/);
    expect(kodeLedger).toContain("FROM buku WHERE akun_id = ANY($1)");
    harus("Kode kiriman membuka transaction di primary, mengunci baris `buku` akun yang terlibat, lalu membandingkan saldo di baris itu dengan jumlah. Saldo tampil dari replica tidak ikut dibaca (Tidak dijalankan: dibaca dari kode lab):");
  });
  test("header X-Lsn-Tulis dan X-Dibaca-Dari berasal dari kode lab, dan jawaban bayar memuatnya", () => {
    expect(kodeHandlerT5).toContain('KepalaLSNTulis   = "X-Lsn-Tulis"');
    expect(kodeHandlerT5).toContain('KepalaDibacaDari = "X-Dibaca-Dari"');
    expect(kodeReplika).toContain("nilai header X-Dibaca-Dari, supaya lab bisa merekam dari mana jawaban datang");
    harus("Kode lab menambahkan header itu supaya rekaman menunjukkan dari mana jawaban datang (Tidak dijalankan: dibaca dari kode lab).");
    harus("Dua GET itu juga membawa `X-Lsn-Tulis`, header dari jawaban bayar yang berisi posisi WAL primary sesudah commit. Versi pertama mengabaikannya: di mode `riwayat-replika`, `sumberTampil` memilih replica sebelum membaca token. Tanpa token ia juga memilih replica (Tidak dijalankan: dibaca dari kode lab). Arti token dibahas di [[t5-lag]].");
  });
});

describe("angka cerita dan kalimat berangka: diturunkan dari naskah, rekaman, dan kode", () => {
  test("gejala: minggu, Rp35.000, ±2 detik, dua kali, dan CS dari baris M41 naskah; berlabel Ilustrasi", () => {
    expect(mingguM41).toBe(3);
    expect(detikCerita).toBe(2);
    expect(gejalaM41).toContain("dua kali, lalu menghubungi CS (Ilustrasi)");
    harus(`Minggu ${mingguM41} Tahap 5. Budi membayar ${rp(bayarNominalA)} di warung. Layar app menulis "Berhasil".`);
    harus(`Riwayat dan saldo di app masih seperti sebelum membayar selama ±${detikCerita} detik. Budi membuka riwayat dua kali, lalu menghubungi CS.`);
    harus(`*Angka cerita (Ilustrasi):* ${rp(bayarNominalA)}, ±${detikCerita} detik, dua kali membuka riwayat, dan CS berasal dari naskah, bukan dari rekaman. Rekaman lab memakai pembayaran ${rp(bayarNominalA)} yang sama, tetapi jeda ±${detikCerita} detik tidak terjadi sendiri di lab, dan alasannya ada di blok Yang sebenarnya. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].`);
  });
  test("dugaan Raka sama dengan kolom 'Yang dikira' naskah; replica dan primary didefinisikan di pemakaian pertama", () => {
    expect(dikiraM41).toContain("Pembayaran belum tercatat, atau app menyimpan data lama. Raka menambah muat ulang otomatis");
    harus(`Raka membuka riwayat Budi dan tidak menemukan baris ${rp(bayarNominalA)}. Ia menduga dua hal. Pertama, pembayaran belum tercatat, jadi uang Budi belum keluar. Kedua, app menyimpan data lama dan belum mengambil yang baru.`);
    harus("Karena dugaan kedua, Raka menambah muat ulang otomatis: layar riwayat dan saldo memanggil server lagi tiap beberapa detik.");
    expect(sebenarnyaM41).toContain("Sesudah ADR 46 tim Akun memindahkan bacaan riwayat dan saldo tampil ke replica");
    harus("Minggu ini tim Akun juga mengubah sesuatu di server. Sesudah ADR 46, tim itu membaca riwayat dan saldo tampil dari replica ([[t5-read-replica]]). Replica adalah salinan database yang hanya melayani bacaan dan sedikit tertinggal dari primary, yaitu database yang menerima semua tulisan. Saldo tampil adalah saldo yang app tulis di layar.");
    expect(badan.indexOf("replica")).toBeGreaterThan(badan.indexOf("Yang Raka kira"));
    expect(badan.indexOf("replica")).toBeLessThan(badan.indexOf("Replica adalah salinan database yang hanya melayani bacaan"));
    expect(badan.indexOf("primary")).toBeGreaterThan(badan.indexOf("Replica adalah salinan database") - 40);
  });
  test("tebak dulu: angka dari rekaman, jawaban memuat header, Penalaran didefinisikan di pemakaian pertama", () => {
    harus(`<summary>Tebak dulu: jawaban bayar memuat saldo ${rp(bayarA.saldo)}, tetapi saldo yang app terima sesudahnya ${rp(akunA[1]!)} dan riwayatnya satu baris. Dari mana server membaca keduanya?</summary>`);
    harus("Dari replica, bukan dari primary. Header `X-Dibaca-Dari: replika` di rekaman menunjukkan sumber kedua jawaban itu (Rekaman lab, bagian A). Replica belum memutar ulang pembayaran Budi, dan di rekaman pemutaran ulangnya ditahan dengan sengaja.");
    harus(`Dua dugaan Raka gugur: primary sudah memuat ${rp(bayarA.saldo)}, dan jawaban server sudah memuat ${rp(akunA[1]!)} sebelum app menampilkannya. Yang kedua adalah Penalaran, yaitu kesimpulan dari rekaman dan kode tanpa dijalankan, karena lab tidak punya app. Blok berikutnya memuat rekamannya.`);
    expect(badan.indexOf("Penalaran")).toBe(badan.indexOf("Yang kedua adalah Penalaran, yaitu kesimpulan") + "Yang kedua adalah ".length);
    expect(badan.indexOf("Penalaran")).toBeLessThan(badan.indexOf("(Penalaran)"));
  });
  test("Yang sebenarnya: kalimat pembuka (Inti), jeda di rekaman, dan kutipan dokumentasi PostgreSQL 17", () => {
    harus("Riwayat dan saldo tampil dibaca dari replica yang tertinggal, jadi Budi melihat catatan lama. Uang aman: keputusan bayar dibaca dari primary.");
    harus("Mode itu adalah kode lab yang ditulis untuk M41, bukan salinan kode yang pernah berjalan di cerita. Rekaman memakai kata \"replika\" untuk node dan nilai header. Teks halaman memakai replica.");
    harus(`**Jeda di rekaman sengaja dibuat.** Replica menerima rekaman perubahan dari primary, yaitu WAL (write-ahead log), lalu memutarnya ulang. PostgreSQL memakai replikasi streaming asinkron secara bawaan, jadi ada jeda kecil antara commit di primary dan terlihat di replica. Dokumentasi menulis jedanya biasanya di bawah satu detik bila replica sanggup mengikuti beban ([PostgreSQL 17: Log-Shipping Standby Servers](${URL_STANDBY}), bagian 26.2.5, dibuka 2026-11-03, Tidak dijalankan).`);
    harus(`Pada ${rps} pembayaran per detik selama ${detikBeban} detik, jeda pemutaran ulang tertinggi di bawah 1 detik, diukur di kedua standby lab. Lab hanya memeriksa batas itu, bukan nilainya (Rekaman lab, \`jeda.txt\` bagian A). Jeda ±${detikCerita} detik di cerita tidak terjadi sendiri, jadi bagian baca menahan pemutaran ulang di replica dengan \`pg_wal_replay_pause()\`.`);
    harus(`Selama dijeda, menurut dokumentasi replica tidak menerapkan perubahan database baru ([PostgreSQL 17: System Administration Functions](${URL_ADMIN}), bagian Recovery Control Functions, dibuka 2026-11-03, Tidak dijalankan).`);
  });
  test("Yang Budi lihat: saldo dan riwayat sebelum dan sesudah bayar, Hitungan di pemakaian pertama, dan jawaban GET dari replica", () => {
    harus(`**Yang Budi lihat.** Sebelum membayar, saldo tampil ${rp(akunA[0]!)} dan riwayat satu baris, yaitu top-up Tunjangan makan ${rp(250000)}.`);
    expect(rek.some((b) => b.includes('"lawan":"Tunjangan makan","jumlah":250000'))).toBe(true);
    harus(`Budi lalu membayar ${rp(bayarNominalA)} ke Warung 505, dan jawaban bayar memuat saldo ${rp(bayarA.saldo)}. Saldo itu cocok dengan Hitungan ${angkaId(akunA[0]!)} − ${angkaId(bayarNominalA)} = ${angkaId(bayarA.saldo)}. Hitungan adalah angka yang dihitung dari angka lain di halaman ini.`);
    expect(badan.indexOf("Hitungan")).toBeLessThan(badan.indexOf("Hitungan adalah angka"));
    expect(badan.indexOf("Hitungan adalah angka") - badan.indexOf("Hitungan")).toBeLessThan(160);
    harus(`Sesudah jawaban bayar 201, GET saldo masih menjawab ${rp(akunA[1]!)} dan GET riwayat masih satu baris. Keduanya membawa \`X-Dibaca-Dari: replika\`.`);
    expect(rek.some((b) => b === "# Jawaban bayar 201 memuat saldo Rp215.000, tetapi saldo tampil sesudahnya masih Rp250.000 dan riwayat masih satu baris.")).toBe(true);
  });
  test("dua dugaan gugur dan uang aman: primary lawan replica, 422 saldo-kurang, batas satu pembayaran", () => {
    harus(`**Dua dugaan Raka gugur, dan uang aman.** Primary memuat ${rp(saldoPrimary)} dan replica ${rp(saldoReplikaSelect)}. Kiriman ${rp(kirimA)} ke rekan ditolak dengan 422 \`saldo-kurang\`, walau saldo tampil ${rp(akunA[1]!)}:`);
    harus(`Dugaan pertama gugur: primary memuat ${rp(saldoPrimary)}, jadi pembayaran sudah tercatat. Dugaan kedua gugur: jawaban server sudah memuat ${rp(akunA[1]!)} sebelum app menampilkannya, jadi data tersimpan di app tidak mengubahnya (Penalaran). Kiriman dipakai, bukan pembayaran, karena satu pembayaran dibatasi ${rp(maksBayar)} dan ${rp(kirimA)} ditolak oleh batas itu tanpa membaca saldo.`);
  });
  test("muat ulang otomatis: jawaban berubah sesudah replica memutar ulang, dan saldo serta riwayat akhir dari rekaman", () => {
    harus(`**Muat ulang otomatis hanya menunggu.** Di versi pertama, muat ulang menanyakan hal yang sama ke replica yang sama. Jawabannya baru berubah sesudah replica memutar ulang pembayaran. Di rekaman, sesudah replica menyusul, saldo tampil ${rp(akunA[2]!)} dan riwayat dua baris:`);
    expect(riwayatA[2]).toBe(2);
    harus("Layar akhirnya benar, tetapi lewat menunggu. Muat ulang tidak membuat app tahu bahwa jawaban yang ia terima lebih tua dari pembayarannya sendiri (Penalaran).");
  });
  test("Perpindahan ini belum punya ADR: aturan 2 ADR 45 dikutip dari halaman ADR 45", () => {
    expect(adr45).toContain("2. Uang tidak dibaca dari salinan di luar primary. Saldo yang menentukan bayar dibaca dari `buku` di dalam transaction ([[t2-race-lock]]). Read replica, bila nanti dipasang, hanya untuk laporan.");
    expect(adr45).toContain("**Keputusan: opsi C.** Enam aturan:");
    harus("**Perpindahan ini belum punya ADR.**");
    harus("ADR 45 menulis aturan 2: uang tidak dibaca dari salinan di luar primary, dan read replica, bila nanti dipasang, hanya untuk laporan ([[t4-adr-45]]). Riwayat dan saldo tampil bukan laporan. Tim Akun memindahkannya ke replica tanpa ADR yang mengubah aturan itu. Uangnya tetap benar karena keputusan uang memang dibaca dari primary, bukan karena aturan itu sudah ditulis ulang.");
    expect(naskah).toContain("memperluas aturan 2 ADR 45 (\"read replica hanya untuk laporan\") ke bacaan tampil milik sendiri");
  });
  test("Yang tidak direkam: empat butir dengan lingkup, dan lab tidak punya app", () => {
    harus(`- Jeda ±${detikCerita} detik, ${rp(bayarNominalA)} di warung, dan CS berasal dari cerita (Ilustrasi). Lab menahan pemutaran ulang dengan sengaja, karena pada ${rps} pembayaran per detik jeda alaminya di bawah 1 detik.`);
    harus("- App Flutter tidak ada di lab. Layar HP di widget digambar dari cerita (Ilustrasi), dan lab hanya menjawab curl.");
    harus("- Primary dan replica berjalan di satu mesin. Jaringan antar host tidak direkam.");
    harus("- Lab tidak mengukur muat ulang otomatis di app, dan tidak mengukur seberapa sering user melihat catatan lama pada jeda alami.");
    expect(fs.existsSync(path.join(akar, "labs/t5-replika/docker-compose.yml"))).toBe(true);
    expect(baca("labs/t5-replika/README.md")).toContain("Semua node adalah container lokal");
    expect(baca("labs/t5-replika/README.md")).toContain("Jeda antar-wilayah, jaringan antar host, dan penyimpanan terkelola **Tidak dijalankan**");
  });
  test("Coba sendiri, noscript, Konsep yang lahir, dan Cek diri memakai angka dari rekaman", () => {
    harus(`Sesudah langkah terakhir, centang **Ubah satu hal: ${skenario.varian.label}**. Tiga langkah berikutnya memakai bagian B (Rekaman lab): pembayaran kedua ${rp(bayarNominalB)}, dan saldo ${rp(akunB[1]!)} terlihat di primary sebelum replica menyusul.`);
    harus(`Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: bayar ${rp(bayarNominalA)} dijawab 201 dengan saldo ${rp(bayarA.saldo)}, tetapi saldo dan riwayat dari replica yang ditahan masih ${rp(akunA[1]!)} dan satu baris (\`baca.txt\` bagian A).`);
    harus(`Kiriman ${rp(kirimA)} ditolak 422 karena saldo di primary ${rp(saldoPrimary)}. Sesudah replica menyusul, saldo tampil ${rp(akunA[2]!)} dan riwayat dua baris.`);
    harus(`Bila app mengirim X-Lsn-Tulis, server membaca primary selama replica tertinggal: saldo ${rp(akunB[1]!)} dan tiga baris riwayat (bagian B).`);
    harus("Widget ini mengikuti cerita M41. Jalur utama memakai rekaman `baca.txt` bagian A, dan layar HP digambar dari cerita (Ilustrasi). Tebak dulu, lalu tekan Berikutnya atau panah kanan.");
    harus("Perbaikannya dibahas di [[t5-lag]]. Widget ini hanya menunjukkan bahwa satu hal berbeda mengubah apa yang Budi lihat.");
    harus("- [[t5-lag]]: replication lag, read-your-writes, dan token LSN. Keputusannya ADR 47.");
    harus("- [[t5-read-replica]]: replica dan model baca untuk laporan. Keputusannya ADR 46.");
    harus("- [[t4-adr-45]]: aturan 2 tentang replica, yang dibaca ulang di halaman ini.");
    expect(naskah).toContain("| 47 | Tiga kelas baca");
    expect(naskah).toContain("| 46 | Satu read replica asinkron untuk laporan merchant dan bacaan berat.");
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R5-135 sampai R5-139", () => {
  test("dua tautan luar, tiap tautan ada di baris riset dengan tanggal buka 2026-11-03, dan tanggal di halaman terkunci", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(tautan).toEqual([URL_STANDBY, URL_ADMIN]);
    expect(barisRiset("R5-135")).toContain(URL_STANDBY.replace("https://", "").replace("www.", ""));
    expect(barisRiset("R5-136")).toContain(URL_ADMIN.replace("https://", "").replace("www.", ""));
    expect((badan.match(/dibuka 2026-11-03/g) ?? []).length).toBe(2);
    expect((badan.match(/2026-1\d-\d\d/g) ?? []).length).toBe(2);
    for (const r of ["R5-135", "R5-136"]) expect(barisRiset(r)).toContain("dibuka 2026-11-03");
  });
  test("R5-135: kutipan 'typically under one second' dan tidak ada jeda ±2 detik; kalimat halaman tidak lebih kuat dari dokumentasi", () => {
    const b = barisRiset("R5-135");
    expect(b).toContain("Streaming replication is asynchronous by default (see Section 26.2.8), in which case there is a small delay between committing a transaction in the primary and the changes becoming visible in the standby.");
    expect(b).toContain("typically under one second assuming the standby is powerful enough to keep up with the load.");
    expect(b).toContain("Dokumentasi tidak menyebut jeda ±2 detik sebagai batas atau nilai tipikal");
    expect(b).toContain("bagian 26.2.5 Streaming Replication");
    expect(badan).toContain("biasanya di bawah satu detik bila replica sanggup mengikuti beban");
    expect(badan).not.toMatch(/dokumentasi menulis[^.]*(selalu|paling lama|maksimal)/i);
  });
  test("R5-136: pg_wal_replay_pause dan 'no further database changes are applied'; kalimat halaman tidak lebih kuat", () => {
    const b = barisRiset("R5-136");
    expect(b).toContain("While recovery is paused, no further database changes are applied.");
    expect(b).toContain("A request doesn't mean that recovery stops right away");
    expect(b).toContain("pg_get_wal_replay_pause_state()");
    expect(b).toContain("Restarts recovery if it was paused.");
    expect(b).toContain("`pg_jeda`");
    expect(baca("labs/t5-replika/run.py")).toContain('c.execute("SELECT pg_wal_replay_pause()" if jeda else "SELECT pg_wal_replay_resume()")');
  });
  test("R5-137 sampai R5-139: sumber internal, rekaman dan kode, dan hitungan tercatat; lima baris berurutan, lima kolom, tanpa ID ganda", () => {
    const ids = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R5-(\d+) /)![1]));
    expect(new Set(ids).size).toBe(ids.length);
    const i = ids.indexOf(135);
    expect(ids.slice(i, i + 5)).toEqual([135, 136, 137, 138, 139]);
    for (const n of [135, 136, 137, 138, 139]) expect(pecahBaris(barisRiset(`R5-${n}`)).length, `R5-${n}`).toBe(5);
    const naik = ids.every((x, k) => k === 0 || x > ids[k - 1]!);
    expect(naik).toBe(true);
    const r137 = barisRiset("R5-137");
    expect(r137).toContain("Read replica, bila nanti dipasang, hanya untuk laporan");
    expect(r137).toContain("memperluas aturan 2 ADR 45");
    expect(r137).toContain("laporan merchant dan bacaan berat");
    const r138 = barisRiset("R5-138");
    for (const k of ["baris 9 sampai 73", "baris 77 sampai 134", "run.py", "replika.go", "kirim.go", "ledger.go", "bayar.go", "handler_t5.go", "`MaksBayar` 200.000"]) expect(r138, k).toContain(k);
    expect(rek.length).toBeGreaterThanOrEqual(134);
    expect(rek[nA + 3]).toBe(rek[9 - 1]);
    expect(stat(9)).toMatch(/^\$ curl -i -X GET '\/akun\/419'/);
    expect(stat(73)).toMatch(/^# Sesudah replika menyusul/);
    expect(stat(77)).toMatch(/^replika=> SELECT pg_wal_replay_pause\(\)/);
    expect(stat(134)).toMatch(/^# Biayanya: selama replika tertinggal/);
    const r139 = barisRiset("R5-139");
    expect(r139).toContain(`${angkaId(akunA[0]!)} − ${angkaId(bayarNominalA)} = ${angkaId(bayarA.saldo)}`);
    expect(r139).toContain(`${angkaId(bayarA.saldo)} − ${angkaId(bayarNominalB)} = ${angkaId(bayarB.saldo)}`);
    expect(r139).toContain(`${angkaId(kirimA)} ≤ ${angkaId(akunA[1]!)}`);
    expect(r139).toContain(`${angkaId(kirimA)} > ${angkaId(saldoPrimary)}`);
    expect(r139).toContain(`${angkaId(kirimA)} > ${angkaId(maksBayar)}`);
  });
});

describe("ID registry, tautan, template blok, widget, kartu, dan label", () => {
  test("registry: halaman 5.6 jenis masalah, ada, prasyarat t5-read-replica, lab t5-replika, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m41");
    expect(h.nomor).toBe("5.6");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.prasyarat).toEqual(["t5-read-replica"]);
    expect(h.lab).toEqual(["t5-replika"]);
    expect(h.peran).toEqual(["mobile", "backend"]);
    expect(h.path).toBe("tahap-5/m41-riwayat-belum-memuat.md");
    expect(h.label).toBe(`Masalah ${kolomM41[0]!.slice(1)} · minggu ${mingguM41}`);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t5-read-replica]]");
    expect(frontmatter).toContain(`title: "5.6 ${h.judul}"`);
    expect(naskah).toContain(`| 5.6 | 4 | ${h.judul} | Masalah | ★ | t5-replika | alur |`);
    expect(naskah).toContain("- **Mobile** menonjolkan 5.2, 5.6, 5.7");
    expect(h.masalah).toBe("Budi melihat Berhasil, tetapi riwayat dan saldo belum berubah karena dibaca dari replica yang tertinggal");
    expect(frontmatter).toContain("description: Minggu 3. Budi membayar dan layar menulis Berhasil, tetapi riwayat dan saldo di app masih lama, karena tim Akun memindahkan bacaan tampilan ke replica yang tertinggal. Uang tidak ikut keliru, dan perpindahan itu belum punya ADR.");
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ A0: 1, "t5-read-replica": 2, "t5-lag": 3, "t4-adr-45": 2 });
    expect(dari("t5-lag").nomor).toBe("5.7");
    expect(dari("t5-lag").prasyarat).toEqual(["t5-m41"]);
    expect(dari("t5-read-replica").nomor).toBe("5.5");
    expect(dari("t4-adr-45").jenis).toBe("adr");
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m41.json" />');
    expect(badan).toContain("<Rantai data={riwayatReplica} ringkas />");
    expect(halaman).toContain('import riwayatReplica from "../../../../data/diagram/t5-m41-riwayat-replica.json";');
  });
  test("tidak ada tabel GFM di halaman (kolom header, pemisah, dan baris diperiksa bila ada)", () => {
    const baris = badan.split("\n");
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        const n = pecahBaris(baris[i]!).length;
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `baris ${j + 1}`).toBe(n);
      }
    }
    expect(baris.filter((b) => b.startsWith("|")).length).toBe(0);
  });
  test("adegan Gejala tanpa kalimat definisi: dua paragraf adegan dan satu catatan berawalan bintang", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala"'), badan.indexOf("</Blok>"));
    const paragraf = gejala.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<"));
    expect(paragraf).toHaveLength(3);
    const adegan = paragraf.filter((b) => !b.startsWith("*"));
    expect(adegan).toHaveLength(2);
    for (const b of paragraf) expect(b).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/i);
  });
  test("satu kata per konsep dan label: replica (bukan replika di prosa), tanpa pembeli, pelanggan, layanan, secret, rahasia", () => {
    const tanpaKode = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[^>]*>/g, "").replace(/<noscript>[\s\S]*?<\/noscript>/, "");
    const sisaReplika = tanpaKode.match(/[^.\n]*\breplika\b[^.\n]*\./gi) ?? [];
    expect(sisaReplika.map((x) => x.trim())).toEqual(["Rekaman memakai kata \"replika\" untuk node dan nilai header."]);
    for (const k of ["pembeli", "pelanggan", "layanan", "secret", "rahasia", "Anda", "kita "]) expect(badan.toLowerCase(), k).not.toContain(k.toLowerCase());
    expect(jumlah(badan, "replica")).toBeGreaterThan(15);
  });
  test("label: 'Rekaman lab' hanya untuk baca.txt, jeda.txt, dan definisi; tak satu angka waktu berlabel Rekaman lab selain batas 1 detik", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(barisRekaman.length).toBe(7);
    for (const b of barisRekaman) {
      expect(b.includes("baca.txt") || b.includes("jeda.txt") || b.includes("Arti Ilustrasi, Rekaman lab") || b.includes("Rekaman lab memakai pembayaran") || b.includes("(Rekaman lab, bagian A)") || b.includes("bagian B (Rekaman lab)") || b.includes("Rekaman lab: labs/") || b.includes("Rekaman lab, `jeda.txt`")).toBe(true);
    }
    expect(badan).not.toMatch(/\d+ (menit|jam)[^.\n]*\(Rekaman lab\)/);
    expect(badan).not.toMatch(/±2 detik[^.\n]*\(Rekaman lab\)/);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, dan kartu", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m41"))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
  });
});

describe("diagram Rantai dan skenario alur: diturunkan dari rekaman", () => {
  test("diagram Rantai: ringkas, dua baris, sumber rekaman baca.txt bagian A, simpul dan sub dari nilai turunan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d).toEqual({
      id: "t5-m41-riwayat-replica",
      judul: "Riwayat dan saldo tampil dari replica yang tertinggal, keputusan uang dari primary",
      sumber: { jenis: "rekaman", teks: "Rekaman lab t5-replika · baca.txt bagian A (pemutaran ulang di replica ditahan dengan sengaja)" },
      baris: [
        { label: "Yang Budi lihat", sub: "dibaca dari replica", simpul: [
          { teks: "Bayar: 201", sub: `saldo di jawaban ${rp(bayarA.saldo)}`, nada: "good", kode: false },
          { teks: `Saldo tampil ${rp(akunA[1]!)}`, sub: "replica belum memutar ulang", nada: "warn", kode: false },
          { teks: `Riwayat tanpa ${rp(bayarNominalA)}`, sub: "satu baris, top-up", nada: "warn", kode: false },
        ] },
        { label: "Yang menentukan uang", sub: "dibaca dari primary", simpul: [
          { teks: `Kiriman ${rp(kirimA)}`, sub: `saldo primary ${rp(saldoPrimary)}`, nada: "biasa", kode: false },
          { teks: "Ditolak: saldo kurang", sub: `422, walau saldo tampil ${rp(akunA[1]!)}`, nada: "good", kode: false },
        ] },
      ],
      catatan: "Kotak oranye adalah yang tertinggal dari primary. Pemutaran ulang di replica ditahan dengan sengaja, karena jeda alami di lab di bawah 1 detik. Layar app tidak direkam: lab hanya menjawab curl.",
    });
    expect(bagianDi(nA)).toBe("A");
  });
  test("skenario alur: valid menurut alur-core, satu HP, tiga komponen, lima langkah dan tiga langkah varian dari awal, sumber rekaman", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("rekaman");
    expect(skenario.sumber.file).toBe("labs/t5-replika/output/baca.txt");
    expect(skenario.sumber.fileVarian).toBe("labs/t5-replika/output/baca.txt");
    expect(skenario.perangkat).toEqual([{ id: "hp", label: "HP Budi" }]);
    expect(skenario.komponen.map((k) => k.id)).toEqual(["srv", "pri", "rep"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(core.steps(skenario, true)).toHaveLength(3);
    expect(skenario.sumber.catatan).toContain("Layar HP digambar dari cerita (Ilustrasi): lab tidak punya app Flutter");
    expect(skenario.sumber.catatan).toContain("jeda buatan, bukan jeda alami");
    expect(skenario.sumber.catatan).toContain(`bagian B memakai pembayaran kedua Budi, ${rp(bayarNominalB)} dari saldo ${rp(akunA[2]!)}`);
    expect(skenario.predict.varian).toBe(false);
  });
  test("skenario: kirim tiap langkah adalah potongan berurutan dari baca.txt, bagian A untuk jalur utama dan bagian B untuk varian", () => {
    const potong = (a: number, b: number): string => rek.slice(a - 1, b).join("\n");
    const lokasi = (k: string): number => {
      const i = baca_txt.indexOf(k);
      expect(i, k).toBeGreaterThan(-1);
      expect(baca_txt.indexOf(k, i + 1), `kirim dua kali di rekaman: ${k.slice(0, 40)}`).toBe(-1);
      return baca_txt.slice(0, i).split("\n").length;
    };
    const awalAkhir = (k: string): [number, number] => { const a = lokasi(k); return [a, a + k.split("\n").length - 1]; };
    const utama = skenario.langkah.map((l) => awalAkhir(l.kirim));
    for (const [i, [a, b]] of utama.entries()) { expect(potong(a, b)).toBe(skenario.langkah[i]!.kirim); expect(bagianDi(a)).toBe("A"); expect(bagianDi(b)).toBe("A"); }
    expect(utama.map(([a]) => a)).toEqual([nA + 16, nGetAwalA(), nSelectPrimary, nKirimCurl, garis(/^\$ curl -i -X GET '\/akun\/419'/, nKirimCurl + 4)]);
    const varian = skenario.varian.langkah.map((l) => awalAkhir(l.kirim));
    for (const [i, [a, b]] of varian.entries()) { expect(potong(a, b)).toBe(skenario.varian.langkah[i]!.kirim); expect(bagianDi(a)).toBe("B"); expect(bagianDi(b)).toBe("B"); }
    expect(varian.map(([a]) => a)).toEqual([nB + 2, garis(/^# Dengan token: replika belum memutar WAL/), garis(/^replika=> SELECT pg_last_wal_replay_lsn\(\) >= /)]);
    expect(varian.map(([, b]) => b)).toEqual([nB + 9, garis(/^# Token yang bukan posisi WAL dijawab 422\./) - 1, rek.filter((b, i) => b !== "" || i < rek.length - 1).length]);
  });
  test("skenario: layar HP, saldo dan baris riwayat dari rekaman; layar awal dan tiap langkah punya satu HP", () => {
    const saldoUtama = skenario.langkah.map((l) => l.layar?.hp.saldo);
    expect(skenario.layarAwal.hp.saldo).toBe(akunA[0]);
    expect(saldoUtama).toEqual([akunA[1], akunA[1], undefined, akunA[1], akunA[2]]);
    expect(skenario.varian.langkah.map((l) => l.layar?.hp.saldo)).toEqual([akunA[2], akunB[1], akunB[2]]);
    const baris = (l: Langkah | undefined) => (l?.layar?.hp.isi ?? []).map((x) => (x.jenis === "baris" ? `${x.kiri} ${x.kanan}` : `${x.jenis}:${x.teks}`));
    expect(baris(skenario.langkah[4])).toEqual([`Warung 505 −${rp(bayarNominalA)}`, `Tunjangan makan +${rp(250000)}`]);
    expect(baris(skenario.langkah[0])).toEqual([`Tunjangan makan +${rp(250000)}`, "toast:Berhasil"]);
    expect(baris(skenario.langkah[3])).toEqual([`Tunjangan makan +${rp(250000)}`, "toast:Saldo tidak cukup"]);
    expect(baris(skenario.varian.langkah[1])).toEqual([`Warung 505 −${rp(bayarNominalB)}`, `Warung 505 −${rp(bayarNominalA)}`, `Tunjangan makan +${rp(250000)}`]);
    expect(riwayatA[2]).toBe(baris(skenario.langkah[4]).length);
    expect(riwayatB[0]).toBe(baris(skenario.varian.langkah[1]).length);
  });
  test("skenario: tebakan empat pilihan, jawaban benar di posisi kedua dan bukan pilihan terpanjang; penjelasan sama dengan rekaman", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(1);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(p.q).toBe(`Budi membayar ${rp(bayarNominalA)}, dan jawaban bayar memuat saldo ${rp(bayarA.saldo)}. Replica sedang ditahan. Apa yang app terima saat meminta saldo dan riwayat?`);
    expect(p.options[1]).toBe(`Saldo ${rp(akunA[1]!)} dan satu baris riwayat: server membaca replica yang belum memutar ulang pembayaran`);
    expect(p.options[0]).toBe(`Saldo ${rp(bayarA.saldo)} dan dua baris riwayat: server membaca primary yang sudah memuat pembayaran`);
    expect(p.options[3]).toBe(`Saldo ${rp(bayarA.saldo)} tetapi riwayat tetap satu baris: saldo dibaca dari primary, sedangkan riwayat dibaca dari replica`);
    expect(p.options[2]).toBe("Galat 5xx: replica yang ditahan tidak menjawab bacaan sampai pemutaran ulang dilanjutkan");
    expect(p.explain).toBe(`Replica yang ditahan tetap menjawab, dengan data lama: saldo ${rp(akunA[1]!)} dan satu baris riwayat, keduanya dengan X-Dibaca-Dari: replika. Saldo dan riwayat sama-sama dibaca dari replica di versi pertama. Rekaman baca.txt bagian A.`);
  });
  test("skenario: judul, dari dan ke tiap langkah, dan kalimat penjelasan dengan angka turunan", () => {
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? null])).toEqual([["srv", "pri"], ["srv", "rep"], ["pri", null], ["srv", "pri"], ["srv", "rep"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? null])).toEqual([["srv", "pri"], ["srv", "pri"], ["srv", "rep"]]);
    expect(skenario.langkah.map((l) => l.nada ?? null)).toEqual([null, "warn", null, "good", "good"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? null)).toEqual([null, "good", "good"]);
    expect(skenario.langkah[0]!.jelas).toBe(`Pemutaran ulang di replica ditahan dengan sengaja sebelum bayar (jeda buatan). Jawaban bayar 201 memuat saldo ${rp(bayarA.saldo)}, yaitu ${angkaId(akunA[0]!)} − ${angkaId(bayarNominalA)} (Hitungan). Header X-Lsn-Tulis dipakai varian.`);
    expect(skenario.langkah[1]!.jelas).toBe(`Server menjawab dari replica: saldo ${rp(akunA[1]!)} dan satu baris riwayat, tanpa pembayaran ${rp(bayarNominalA)}. Layar HP menampilkan jawaban itu apa adanya (Ilustrasi).`);
    expect(skenario.langkah[2]!.jelas).toBe(`Saldo di buku primary ${rp(saldoPrimary)}, di replica ${rp(saldoReplikaSelect)}. Pembayaran sudah tercatat, jadi dugaan pertama Raka gugur. Replica belum memutar ulang pembayaran itu.`);
    expect(skenario.langkah[3]!.jelas).toBe(`Saldo tampil ${rp(akunA[1]!)} cukup untuk ${rp(kirimA)}, tetapi server memutuskan dari saldo primary ${rp(saldoPrimary)} dan menjawab 422 saldo-kurang. Uang tidak ikut keliru. Di layar, penolakan itu bertentangan dengan saldo yang tampil (Ilustrasi). Memakai kiriman, bukan pembayaran, karena satu pembayaran dibatasi ${rp(maksBayar)}.`);
    expect(skenario.langkah[4]!.jelas).toBe(`Sesudah pemutaran ulang dilanjutkan dan replica menyusul, saldo tampil ${rp(akunA[2]!)} dan riwayat dua baris. Rekaman tidak menulis perintah pelanjutan; kode lab memanggil pg_wal_replay_resume().`);
    expect(skenario.varian.label).toBe("app mengirim X-Lsn-Tulis dari jawaban bayar, dan server memeriksanya");
    expect(skenario.varian.langkah[0]!.jelas).toBe(`Bagian B memakai pembayaran kedua Budi: saldo awal ${rp(akunA[2]!)}, bayar ${rp(bayarNominalB)}, saldo ${rp(bayarB.saldo)} (${angkaId(akunA[2]!)} − ${angkaId(bayarNominalB)}, Hitungan). Pemutaran ulang di replica ditahan lagi dengan sengaja.`);
    expect(skenario.varian.langkah[1]!.jelas).toBe(`Dengan header X-Lsn-Tulis server bertanya ke replica apakah ia sudah memutar ulang sampai posisi itu. Belum, jadi server membaca primary: saldo ${rp(akunB[1]!)} dan tiga baris riwayat.`);
    expect(skenario.varian.langkah[2]!.jelas).toBe("Biayanya: selama replica tertinggal, bacaan yang membawa token kembali ke primary. Bacaan tanpa token tetap dilayani replica (bagian B).");
    expect(skenario.pengantar).toBe(`Budi membayar ${rp(bayarNominalA)}, dan server membaca saldo serta riwayat dari replica yang ditahan. Tebak dulu apa yang app terima, lalu ikuti langkahnya sampai HP. Sesudah langkah terakhir, centang 'Ubah satu hal'.`);
    expect(skenario.judul).toBe(`Riwayat dan saldo dari replica yang tertinggal: bayar ${rp(bayarNominalA)}, layar masih lama`);
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      `Budi membayar ${rp(bayarNominalA)} ke Warung 505, dan server menulis di primary`,
      "App meminta saldo dan riwayat, dan server membaca replica",
      "Primary sudah memuat pembayaran, replica belum",
      `Kiriman ${rp(kirimA)} ke rekan ditolak dari saldo di primary`,
      "Replica menyusul, dan saldo serta riwayat jadi benar",
    ]);
    expect(skenario.varian.langkah.map((l) => l.judul)).toEqual([
      `Budi membayar lagi ${rp(bayarNominalB)}, dan jawaban membawa token`,
      "App mengirim token, replica belum sampai, dan server membaca primary",
      "Replica menyusul, dan token yang sama kini dilayani replica",
    ]);
  });
  test("kartu Cek diri: tiga kartu t5-m41, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-m41");
    expect(k.map((x) => x.id)).toEqual(["t5-m41-1", "t5-m41-2", "t5-m41-3"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    k.forEach((x, i) => expect(jawaban[i]).toContain(x.jawab.replace(/`/g, "`")));
    for (const x of k) { expect(x.url).toBe("tahap-5/m41-riwayat-belum-memuat/"); expect(x.judul).toBe(`5.6 ${dari("t5-m41").judul}`); }
    expect(jawaban[1]).toContain(`keputusan kiriman dibaca dari saldo di primary, ${rp(saldoPrimary)}`);
    expect(jawaban[1]).toContain("`baca.txt` bagian A");
  });
});

function nGetAwalA(): number { return garis(/^\$ curl -i -X GET '\/akun\/419' -H 'Authorization: Bearer <token sesi Budi>' -H 'X-Lsn-Tulis: <LSN tulis 1>'$/, nA); }

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 2: kunci kalimat dan sidik (dibangkitkan dari berkas saat ini oleh PERBARUI_KUNCI=1)
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "membantu", "menunggu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lama", "lebih", "tertinggal", "menyusul", "ditahan", "primary", "replica", "replika"];
const sidikKata = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const tekstual = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const angkaDari = (t: string): string[] => [...t.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]);
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const kartuT5m41 = kartuSemua.filter((x) => x.halaman === "t5-m41");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-03/g) ?? []).length, tanggal: (halaman.match(/2026-11-03/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  riset: ["R5-135", "R5-136", "R5-137", "R5-138", "R5-139"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m41)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m41) },
};

describe("penutup celah mutasi tanpa kunci: lingkup, definisi di pemakaian pertama, atribusi, dan label", () => {
  test("label 'Tidak dijalankan: dibaca dari kode lab' hanya untuk kalimat kode lab; dokumentasi PostgreSQL berlabel Tidak dijalankan dengan tanggal buka", () => {
    expect(jumlah(badan, "(Tidak dijalankan: dibaca dari kode lab)")).toBe(3);
    expect(jumlah(badan, "dibuka 2026-11-03, Tidak dijalankan)")).toBe(2);
    expect(jumlah(badan, "Tidak dijalankan")).toBe(6);
    expect(jumlah(badan, "(Penalaran)")).toBe(3);
    expect(jumlah(badan, "Penalaran")).toBe(4);
    expect(jumlah(badan, "(Ilustrasi)")).toBe(4);
  });
  test("klaim universal: tak ada 'selalu', 'semua', 'setiap', 'tidak pernah', atau 'hanya di' di prosa halaman kecuali kalimat berlingkup", () => {
    const kalimat = badan.replace(/<noscript>[\s\S]*?<\/noscript>/, "").split(/(?<=[.!?])\s+/);
    for (const k of ["selalu", "setiap", "tidak pernah", "hanya di", "tak satu pun", "tidak satu pun"]) expect(kalimat.filter((s) => s.toLowerCase().includes(k)), k).toEqual([]);
    const semua = kalimat.filter((s) => /\bsemua\b/i.test(s));
    expect(semua.map((s) => s.trim())).toEqual(["Replica adalah salinan database yang hanya melayani bacaan dan sedikit tertinggal dari primary, yaitu database yang menerima semua tulisan."]);
  });
  test("tebakan skenario dan jawaban tebak dulu tidak membuka varian: widget tidak menyebut 'Tebakanmu', dan jalur varian tidak memuat penjelasan jalur utama", () => {
    for (const l of skenario.varian.langkah) expect(l.jelas).not.toContain("Tebakanmu");
    expect(skenario.predict.explain).toContain("Rekaman baca.txt bagian A.");
    expect(skenario.predict.explain).not.toContain("bagian B");
  });
  test("Cek diri: jawaban 1 sampai 3 memuat sumber rekaman atau Penalaran, dan jawaban 3 tidak mengklaim ADR sudah ditulis", () => {
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban[0]).toContain("(`baca.txt` bagian A)");
    expect(jawaban[0]).toContain("(Penalaran)");
    expect(jawaban[1]).toContain("(`baca.txt` bagian A)");
    expect(jawaban[2]).not.toMatch(/ADR 4[67] (menulis|memuat|mengubah)/);
    expect(jawaban[2]).toContain("ADR 45 menulis read replica hanya untuk laporan");
  });
});

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m41-riwayat-belum-memuat.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m41-riwayat-belum-memuat.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(8);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
