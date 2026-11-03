// Penjaga halaman 5.20 (keputusan 1576 sampai 1578): angka, hitungan, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak" dan
// "paling banyak", diagram Rantai t5-m48-angsuran-dua-jurnal.json, skenario alur t5-m48.json, kartu Cek diri, dan baris riset di
// m48-angsuran-dua-kali.mdx. Nilai diturunkan dari rekaman labs/t5-cicilan/output/crash.txt, serentak.txt, dan laju.txt, rekaman Tahap 4
// labs/t4-modul/output/proses-mati.txt, kode labs/api-t5 (t5.go, idempoten.go, repo/t5.go, main.go, migrasi), README lab, naskah Tahap 5
// (baris M48 dan angka beban Cicilan), halaman ADR 14, registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis:
// (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// m48-angsuran-dua-kali.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang
// sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m48-angsuran-dua-kali.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Gejala (312 angsuran, Rp200.000, dua notifikasi, Sabtu dan Senin) tidak direkam:
// lab memerankan satu angsuran Rp100.000 dengan jam ledger +23 dan +25 jam. Baris riset tetangga tidak dikunci: hanya R5-205 sampai
// R5-209 yang diperiksa, dengan urutan naik.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m48-angsuran-dua-jurnal.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m48-angsuran-dua-kali.halaman.nilai";

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

const HALAMAN = "situs/src/content/docs/tahap-5/m48-angsuran-dua-kali.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t5-m48.json")) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const rek = baca("labs/t5-cicilan/output/crash.txt").split("\n");
const serentak = baca("labs/t5-cicilan/output/serentak.txt");
const laju = baca("labs/t5-cicilan/output/laju.txt");
const modulMati = baca("labs/t4-modul/output/proses-mati.txt");
const kodeT5 = baca("labs/api-t5/internal/service/t5.go");
const kodeIdem = baca("labs/api-t5/internal/repo/idempoten.go");
const kodeRepoT5 = baca("labs/api-t5/internal/repo/t5.go");
const kodeMain = baca("labs/api-t5/cmd/api/main.go");
const readmeLab = baca("labs/t5-cicilan/README.md");
const runLab = baca("labs/t5-cicilan/run.py");
const adr14 = baca("situs/src/content/docs/tahap-2/retry-idempotency.mdx");
const jobRekon = baca("situs/src/content/docs/tahap-2/job-rekonsiliasi.mdx");
const modul4 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const skemaLedger = baca("labs/b3-ledger/schema.sql");
const tesCicilan = baca("labs/api-t5/internal/service/cicilan_serentak_test.go");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Hp { hp: { judul: string; waktu: string; sinyal: number; saldo: number; isi: { jenis: string; teks?: string; kiri?: string; kanan?: string }[] } }
interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Hp }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string; file: string; fileVarian: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Hp;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string; adr?: number[] }
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
const pecahBaris = (b: string): string[] => b.replace(/\\\|/g, "¦").split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const rp = (n: number): string => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const angkaId = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const desimal = (n: number, d: number): string => angkaId(Math.trunc(n)) + "," + n.toFixed(d).split(".")[1]!;
const jumlah = (teks: string, k: string): number => teks.split(k).length - 1;
const harus = (kalimat: string): void => {
  expect(jumlah(badan, kalimat), `kalimat harus tepat satu kali: ${kalimat}`).toBe(1);
};

// --- naskah: baris M48 (kolom: #, minggu, gejala, dikira, sebenarnya, konsep, keputusan) dan baris beban Cicilan
const barisM48 = naskah.split("\n").find((b) => b.startsWith("| M48 |")) ?? "";
const kolomM48 = pecahBaris(barisM48);
const mingguM48 = Number(kolomM48[1]);
const gejalaM48 = kolomM48[2]!;
const dikiraM48 = kolomM48[3]!;
const sebenarnyaM48 = kolomM48[4]!;
const nominalCerita = angka(cari(/"Angsuran Rp([\d.]+) dibayar"/, gejalaM48, "nominal cerita")[1]!);
const berkurangCerita = angka(cari(/saldonya berkurang Rp([\d.]+)\./, gejalaM48, "saldo berkurang cerita")[1]!);
const jumlahCerita = Number(cari(/menemukan (\d+) angsuran dengan dua jurnal/, gejalaM48, "312")[1]);
const jamBatch = cari(/Batch Sabtu (\d\d\.\d\d) mati di tengah.*dijalankan lagi Senin (\d\d\.\d\d), (\d+) jam kemudian/, sebenarnyaM48, "Sabtu dan Senin");
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Cicilan | jadwal × bagian jatuh tempo ÷ hari |")) ?? "";
const kolomBeban = pecahBaris(barisBeban);
const jadwalAktif = angka(cari(/^([\d.]+) jadwal aktif \(10% user, Asumsi\); (\d+)% jatuh tempo di tiga hari gajian$/, kolomBeban[2]!, "jadwal aktif")[1]!);
const persenTempo = Number(cari(/^([\d.]+) jadwal aktif \(10% user, Asumsi\); (\d+)% jatuh tempo di tiga hari gajian$/, kolomBeban[2]!, "persen jatuh tempo")[2]);
const puncakNaskah = angka(cari(/^([\d.]+) angsuran per hari puncak dan 3\.333 rata-rata \(100\.000 ÷ 30\)\. Pada (\d+) per detik: (\d+) detik = ([\d,]+) menit$/, kolomBeban[3]!, "puncak")[1]!);
const lajuNaskah = Number(cari(/Pada (\d+) per detik: (\d+) detik = ([\d,]+) menit$/, kolomBeban[3]!, "laju")[1]);
const detikNaskah = Number(cari(/Pada (\d+) per detik: (\d+) detik = ([\d,]+) menit$/, kolomBeban[3]!, "detik")[2]);
const menitNaskah = cari(/Pada (\d+) per detik: (\d+) detik = ([\d,]+) menit$/, kolomBeban[3]!, "menit")[3]!;
const hariGajian = 3;
const puncakTepat = (jadwalAktif * persenTempo) / 100 / hariGajian; // 13.333,33
const detikTepat = puncakNaskah / lajuNaskah; // 666,65
const menitTepat = Math.round(detikTepat) / 60;

// --- rekaman crash.txt: bagian A (versi pertama), B dan C (versi benar)
const garis = (pola: RegExp, dari0 = 0): number => {
  const i = rek.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan sesudah baris ${dari0}`);
  return i + 1; // 1-based
};
const stat = (n: number): string => rek[n - 1]!;
const nA = garis(/^# --- A\./);
const nB = garis(/^# --- B\./);
const nC = garis(/^# --- C\./);
const bagianDi = (n: number): string => {
  let huruf = "";
  rek.forEach((b, i) => { if (i + 1 <= n) { const m = b.match(/^# --- ([A-Z])\./); if (m) huruf = m[1]!; } });
  return huruf;
};
const sel = (n: number): string[] => stat(n).split("|").map((x) => x.trim());
const nKepala = garis(/^# Budi \(akun 419\) bersaldo/);
const kepalaBudi = cari(/^# Budi \(akun 419\) bersaldo Rp([\d.]+); jadwal 1: tiga angsuran Rp([\d.]+) ke Warung Ani, angsuran ke-1 jatuh tempo kemarin$/, stat(nKepala), "kepala Budi");
const saldoAwal = angka(kepalaBudi[1]!);
const perAngsuran = angka(kepalaBudi[2]!);
const nPost = garis(/^\$ curl -i -X POST '\/cicilan'/);
const postBody = cari(/"jumlah_per_angsuran": (\d+), "jumlah_angsuran": (\d+)/, stat(nPost), "POST /cicilan");
const nMati = garis(/^\$ api-t5 -rentan cicilan-satu-job -cicilan-sampai <tanggal> -lab-sekarang <waktu> -lab-cicilan-henti 1$/);
const nTabelMati = garis(/^ ke \| status\s+\| jurnal_di_ledger \| kunci_selesai$/, nMati);
const barisMati = sel(nTabelMati + 2); // ke, status, jurnal_di_ledger, kunci_selesai
const n23 = garis(/^# job diulang 23 jam kemudian \(key masih hidup\)$/);
const n23Cmd = garis(/^\$ api-t5 -rentan cicilan-satu-job .* -lab-sekarang <waktu \+23 jam>$/, n23);
const hasil23 = cari(/^hasil: dibaca (\d+), jurnal baru (\d+), dilewati (\d+), dicatat (\d+)$/, stat(n23Cmd + 1), "hasil 23 jam");
const nTabel23 = garis(/^ status_angsuran_ke_1 \| jurnal_di_ledger$/, n23Cmd);
const baris23 = sel(nTabel23 + 2); // status, jurnal_di_ledger
const nKomen23 = garis(/^# dalam 24 jam tidak ada tagihan ganda: satu jurnal\. Tetapi angsuran itu dilewati, bukan diselesaikan: statusnya tetap menunggu\.$/);
const n25 = garis(/^# job diulang 25 jam kemudian \(key sudah kedaluwarsa\)$/);
const n25Cmd = garis(/^\$ api-t5 -rentan cicilan-satu-job .* -lab-sekarang <waktu \+25 jam>$/, n25);
const hasil25 = cari(/^hasil: dibaca (\d+), jurnal baru (\d+), dilewati (\d+), dicatat (\d+)$/, stat(n25Cmd + 1), "hasil 25 jam");
const nTabel25 = garis(/^ ke \| status\s+\| jurnal_di_ledger$/, n25Cmd);
const baris25 = sel(nTabel25 + 2); // ke, status, jurnal_di_ledger
const nSaldoA = garis(/^# saldo Budi dari jumlah posting: /);
const saldoA = cari(/^# saldo Budi dari jumlah posting: Rp([\d.]+) \(awal Rp([\d.]+); satu angsuran Rp([\d.]+) ditagih dua kali\)$/, stat(nSaldoA), "saldo Budi");
const nCitra = garis(/^# Citra \(akun 504\), jadwal 2: tiga angsuran Rp([\d.]+) ke Warung Ani, angsuran ke-1 jatuh tempo kemarin$/);
const nMatiB = garis(/^\$ api-t5 -cicilan-sampai <tanggal> -lab-cicilan-henti 1$/, nB);
const nTabelMatiB = garis(/^ ke \| status\s+\| jurnal_dengan_referensi$/, nMatiB);
const barisMatiB = sel(nTabelMatiB + 2); // ke, status, jurnal_dengan_referensi
const nKapanSaja = garis(/^# job diulang kapan saja; jam tidak berperan \(tanpa -lab-sekarang\)$/);
const hasilB = cari(/^hasil: dibaca (\d+), jurnal baru (\d+), jurnal sudah ada (\d+), dicatat (\d+)$/, stat(nKapanSaja + 2), "hasil versi benar");
const nTabelB = garis(/^ ke \| status\s+\| terikat_jurnal \| jurnal_dengan_referensi$/, nKapanSaja);
const barisB = sel(nTabelB + 2); // ke, status, terikat_jurnal, jurnal_dengan_referensi
const nSaldoB = garis(/^# saldo Citra dari jumlah posting: /);
const saldoB = cari(/^# saldo Citra dari jumlah posting: Rp([\d.]+) \(awal Rp([\d.]+); satu angsuran Rp([\d.]+) ditagih satu kali\)$/, stat(nSaldoB), "saldo Citra");
const nUlangB = garis(/^# job dijalankan sekali lagi: dibaca 0, jurnal baru 0$/);
const nError = garis(/^ERROR: duplicate key value violates unique constraint "jurnal_referensi_key"$/);
const serentakC = serentak.slice(serentak.indexOf("# --- C.")).split("\n");
const hasilSerentakC = cari(/^jurnal baru dari kedua job (\d+), dilewati (\d+), dicatat (\d+)$/, serentakC.find((b) => b.startsWith("jurnal baru dari kedua job"))!, "serentak C");

const URL_JOB = "https://kubernetes.io/docs/concepts/workloads/controllers/job/";
const URL_CRON = "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/";
const TANGGAL = "2026-11-03";

// --- kode lab: fungsi tagihRentan di t5.go
const kt = kodeT5.split("\n");
const nFungsi = kt.findIndex((b) => b.startsWith("func (s Service) tagihRentan(")) + 1;
const nFungsiAkhir = kt.findIndex((b, i) => i >= nFungsi && b === "}") + 1;
const badanRentan = kt.slice(nFungsi, nFungsiAkhir).join("\n");
const nKunci = kt.findIndex((b, i) => i >= nFungsi && b === '\tkunci := fmt.Sprintf("cicilan:%d:%d", a.JadwalID, a.Ke)') + 1;
const nDilewati = kt.findIndex((b, i) => i >= nFungsi && b === "\t\th.Dilewati++") + 1;
const nDijurnal = kt.findIndex((b, i) => i >= nFungsi && b === "\th.Dijurnal++") + 1;
const nReturnAkhir = kt.findIndex((b, i) => i >= nFungsi && b === "\treturn false, err" && kt[i + 1] === "}" && i + 2 >= nDijurnal) + 1;
const ki = kodeIdem.split("\n");
const nExec = ki.findIndex((b) => b === "\th, err := r.db.ExecContext(ctx, `") + 1;

describe("rekaman crash.txt, serentak.txt, dan laju.txt: nilai turunan dari berkasnya sendiri", () => {
  test("kepala rekaman: PostgreSQL 17.11, go1.27.3, pgx v5.11.0; jam ledger diperankan; Budi Rp250.000 dengan tiga angsuran Rp100.000", () => {
    expect(rek[1]).toContain("PostgreSQL 17.11");
    expect(rek[1]).toContain("go1.27.3");
    expect(rek[1]).toContain("pgx v5.11.0");
    expect(rek.some((b) => b === "# Jam ledger diperankan lewat -lab-sekarang: Idempotency-Key bernilai 24 jam dari jam itu, jadi 23 dan 25 jam tidak ditunggu.")).toBe(true);
    expect(saldoAwal).toBe(250000);
    expect(perAngsuran).toBe(100000);
    expect(Number(postBody[1])).toBe(perAngsuran);
    expect(Number(postBody[2])).toBe(3);
    expect(rp(saldoAwal)).toBe("Rp250.000");
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, dan pgx v5.11.0, dari database bersih, di lab t5-cicilan. Job `api-t5` berjalan sebagai proses sendiri dengan mode `-rentan cicilan-satu-job`, versi pertama.");
    harus("Mode itu adalah kode lab yang ditulis untuk M48, bukan salinan kode yang pernah berjalan di cerita. Jam ledger diperankan lewat `-lab-sekarang`: key bernilai 24 jam dari jam itu, jadi 23 dan 25 jam tidak ditunggu.");
    expect(readmeLab).toContain("Jam ledger diperankan, 24 jam tidak ditunggu.");
  });
  test("bagian A: sesudah mati satu jurnal, key selesai, angsuran menunggu; 23 jam: satu jurnal, dilewati, tetap menunggu; 25 jam: dua jurnal, dicatat, saldo Rp50.000", () => {
    expect(barisMati).toEqual(["1", "menunggu", "1", "1"]);
    expect(stat(nMati + 1)).toBe("# job pertama: keluar dengan sinyal 9 (SIGKILL), tanpa keluaran");
    expect(stat(nMati + 2)).toBe("# sesudah mati: ledger sudah menjurnal, angsuran belum ditandai");
    expect(hasil23.slice(1).map(Number)).toEqual([1, 0, 1, 0]);
    expect(baris23).toEqual(["menunggu", "1"]);
    expect(hasil25.slice(1).map(Number)).toEqual([1, 1, 0, 1]);
    expect(baris25).toEqual(["1", "dicatat", "2"]);
    expect(angka(saldoA[1]!)).toBe(saldoAwal - 2 * perAngsuran);
    expect(angka(saldoA[1]!)).toBe(50000);
    expect(angka(saldoA[2]!)).toBe(saldoAwal);
    expect(angka(saldoA[3]!)).toBe(perAngsuran);
    expect(bagianDi(nMati)).toBe("A");
    expect(bagianDi(nSaldoA)).toBe("A");
    expect(nA).toBeLessThan(nMati);
    expect(nSaldoA).toBeLessThan(nB);
  });
  test("bagian B: versi benar satu jurnal dengan referensi, dicatat, saldo Rp150.000, job ketiga tidak mengerjakan apa pun; bagian C: referensi ganda ditolak", () => {
    expect(barisMatiB).toEqual(["1", "menunggu", "1"]);
    expect(hasilB.slice(1).map(Number)).toEqual([1, 0, 1, 1]);
    expect(barisB).toEqual(["1", "dicatat", "t", "1"]);
    expect(angka(saldoB[1]!)).toBe(saldoAwal - perAngsuran);
    expect(angka(saldoB[1]!)).toBe(150000);
    expect(angka(saldoB[2]!)).toBe(saldoAwal);
    expect(angka(saldoB[3]!)).toBe(perAngsuran);
    expect(bagianDi(nSaldoB)).toBe("B");
    expect(bagianDi(nUlangB)).toBe("B");
    expect(bagianDi(nError)).toBe("C");
    expect(nError).toBe(nC + 1);
    expect(runLab).toContain("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', 'ulangan'");
    expect(runLab).toContain('harap(e.diag.constraint_name, "jurnal_referensi_key"');
    expect(readmeLab).toContain("C: INSERT langsung dengan referensi yang sama ditolak `jurnal_referensi_key`");
  });
  test("serentak.txt bagian C: dua job serentak di versi pertama, satu jurnal dan satu dilewati; laju.txt: hitungan 13.333 dan 667 detik", () => {
    expect(hasilSerentakC.slice(1).map(Number)).toEqual([1, 1, 1]);
    expect(serentak).toContain("# --- C. Versi pertama (cicilan-satu-job): dua job serentak dalam 24 jam, Idempotency-Key diklaim satu job saja ---");
    expect(laju).toContain("# 13.333 angsuran per hari puncak (100.000 jadwal x 40% jatuh tempo di tiga hari gajian ÷ 3, naskah bagian 3) ÷ 20 per detik = 666,65 detik, dibulatkan 667 detik = 11,1 menit");
    expect(laju).toContain("laju terukur memenuhi batas 20 angsuran per detik (Asumsi naskah): ya");
  });
  test("rekaman Tahap 4: proses-mati.txt bagian C satu jurnal pada +23 jam dan dua pada +25 jam, jam ledger diperankan", () => {
    const c = modulMati.slice(modulMati.indexOf("# --- C."));
    expect(c).toContain("# jam ledger digeser 23 jam; kiriman ulang e3 untuk top-up Rp100000");
    expect(c).toContain("# jam ledger digeser 25 jam; kiriman ulang e4 untuk top-up Rp150000");
    expect(c).toContain("# sisi 23 jam: key hidup, ledger menjawab 200 dengan jurnal yang sama, satu jurnal. Sisi 25 jam: key habis, jurnal kedua, saldo naik dua kali.");
    expect(modul4).toContain("Kiriman ulang pada +23 jam menghasilkan satu jurnal. Pada +25 jam key sudah habis");
    harus("Tahap 4 mencatat pola yang sama untuk top-up (Rekaman lab, `proses-mati.txt` bagian C, [[t4-modul]]). Kiriman ulang pada +23 jam menghasilkan satu jurnal, dan pada +25 jam dua.");
  });
});

describe("kode lab: tagihRentan, KlaimKunci, titik mati, status, urutan, outbox, dan lingkup klaim 'tidak' dan 'paling banyak'", () => {
  test("tagihRentan: klaim key dengan umur 24 jam, bukan KlaimBaru berarti dilewati tanpa mengubah angsuran, lalu jurnal, key selesai, berhenti(), dan tandai dicatat", () => {
    expect(nFungsi).toBeGreaterThan(0);
    expect(kt[nKunci - 1]).toBe('\tkunci := fmt.Sprintf("cicilan:%d:%d", a.JadwalID, a.Ke)');
    expect(kt[nKunci]).toBe('\thasil, _, err := s.repo.KlaimKunci(ctx, kunci, a.AkunID, "angsuran", kini, kini.Add(24*time.Hour))');
    expect(kt[nDilewati - 2]).toBe("\tif hasil != repo.KlaimBaru {");
    expect(kt[nDilewati]).toBe("\t\treturn false, nil");
    expect(kt[nDilewati + 1]).toBe("\t}");
    // yang dilewati tidak menyentuh angsuran: tidak ada TandaiAngsuran antara klaim dan penutup cabang
    expect(kt.slice(nKunci - 1, nDilewati + 1).join("\n")).not.toContain("TandaiAngsuran");
    const i = (k: string): number => badanRentan.indexOf(k);
    expect(i("s.repo.KlaimKunci(")).toBeGreaterThan(0);
    expect(i("s.repo.DalamTx(")).toBeGreaterThan(i("s.repo.KlaimKunci("));
    expect(i("s.jurnalAngsuran(ctx, tx, a, nil)")).toBeGreaterThan(i("s.repo.DalamTx("));
    expect(i("s.repo.SelesaiKunci(")).toBeGreaterThan(i("s.jurnalAngsuran("));
    expect(i("berhenti()")).toBeGreaterThan(i("s.repo.SelesaiKunci("));
    expect(badanRentan.lastIndexOf("s.repo.TandaiAngsuran(")).toBeGreaterThan(i("berhenti()"));
    expect(jumlah(badanRentan, "berhenti()")).toBe(1);
    expect(kt[nDijurnal + 3]).toBe("\tif berhenti() {");
    expect(kt[nDijurnal + 6]).toBe('\tok, err := s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke, []string{"menunggu", "terjurnal"}, "dicatat", &jurnal)');
    expect(kt[nReturnAkhir - 1]).toBe("\treturn false, err");
    harus("**Yang dilakukan job per angsuran.** Di versi pertama, penahan jurnal kedua hanya Idempotency-Key (Tidak dijalankan: dibaca dari kode lab). Tiap angsuran melewati empat langkah: klaim key `cicilan:<jadwal>:<ke>` dengan umur 24 jam, tulis jurnal, tandai key selesai, lalu tandai angsuran `dicatat`.");
    harus("Langkah pertama memanggil `KlaimKunci` langsung, tanpa HTTP. Bila key sudah ada dan umurnya belum lewat, hasilnya bukan `KlaimBaru`: job menghitung angsuran itu sebagai dilewati dan tidak mengubahnya.");
    harus("Di antara kedua potongan, job menulis jurnal dalam satu transaction, lalu commit (Tidak dijalankan: dibaca dari kode lab). Potongan berikut memuat dua langkah terakhir:");
    // tanpa HTTP: job dijalankan dari main.go lewat service dan repo, tanpa klien atau server HTTP
    const fJob = kodeMain.slice(kodeMain.indexOf("func jalankanCicilan("), kodeMain.indexOf("// jalankanKompensasi:"));
    expect(fJob.length).toBeGreaterThan(200);
    expect(fJob).toContain("svc.JalankanCicilan(");
    expect(fJob).not.toMatch(/http\./);
    expect(kodeIdem).toContain("func (r Repo) KlaimKunci(");
  });
  test("tiga Snippet kode dan tiga Snippet rekaman: file, rentang diturunkan dari kode dan rekaman, dan judul", () => {
    const sn = [...badan.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"(?: lang="(\w+)")? title="([^"]+)" \/>/g)];
    expect(sn.map((m) => m[1])).toEqual([
      "labs/api-t5/internal/service/t5.go", "labs/api-t5/internal/repo/idempoten.go", "labs/api-t5/internal/service/t5.go",
      "labs/t5-cicilan/output/crash.txt", "labs/t5-cicilan/output/crash.txt", "labs/t5-cicilan/output/crash.txt",
    ]);
    const r = sn.map((m) => [Number(m[2]), Number(m[3])] as const);
    expect(r[0]).toEqual([nKunci, nDilewati + 2]);
    expect(r[1]).toEqual([nExec, nExec + 6]);
    expect(ki[nExec + 5]).toBe("\t\t WHERE kunci_idempotensi.kedaluwarsa <= $4`, kunci, akun, hash, kini, kedaluwarsa)");
    expect(ki[nExec - 2]).toBe("func (r Repo) KlaimKunci(ctx context.Context, kunci string, akun int64, hash string, kini, kedaluwarsa time.Time) (HasilKlaim, []byte, error) {");
    expect(r[2]).toEqual([nDijurnal, nReturnAkhir]);
    expect(nReturnAkhir).toBe(nFungsiAkhir - 1);
    expect(kt[nFungsiAkhir - 1]).toBe("}");
    // rekaman: awal dan akhir diturunkan dari penanda di crash.txt
    expect(r[3]).toEqual([nMati, nTabelMati + 3]);
    expect(stat(nTabelMati + 3)).toBe("(1 row)");
    expect(r[4]).toEqual([n23, nKomen23]);
    expect(r[5]).toEqual([n25, nSaldoA]);
    for (const i of [3, 4, 5]) {
      expect(bagianDi(r[i]![0])).toBe("A");
      expect(bagianDi(r[i]![1])).toBe("A");
      expect(sn[i]![5]).toContain("labs/t5-cicilan/output/crash.txt, bagian A");
      expect(sn[i]![4]).toBeUndefined();
    }
    expect(sn.map((m) => m[4] ?? "")).toEqual(["go", "go", "go", "", "", ""]);
    expect(sn[0]![5]).toBe(`Kode lab: labs/api-t5/internal/service/t5.go baris ${r[0]![0]} sampai ${r[0]![1]} (job mengklaim key per angsuran, dan melewati angsuran bila key masih hidup)`);
    expect(sn[1]![5]).toBe(`Kode lab: labs/api-t5/internal/repo/idempoten.go baris ${r[1]![0]} sampai ${r[1]![1]} (key yang umurnya lewat diambil ulang)`);
    expect(sn[2]![5]).toBe(`Kode lab: labs/api-t5/internal/service/t5.go baris ${r[2]![0]} sampai ${r[2]![1]} (key ditandai selesai, titik mati yang dipasang lab, lalu angsuran ditandai dicatat)`);
    expect(sn[3]![5]).toBe("Rekaman lab: labs/t5-cicilan/output/crash.txt, bagian A (job dimatikan sesudah jurnal, status angsuran dan key)");
    expect(sn[4]![5]).toBe("Rekaman lab: labs/t5-cicilan/output/crash.txt, bagian A (job diulang 23 jam kemudian)");
    expect(sn[5]![5]).toBe("Rekaman lab: labs/t5-cicilan/output/crash.txt, bagian A (job diulang 25 jam kemudian, saldo Budi)");
  });
  test("KlaimKunci mengambil ulang key yang kedaluwarsa: INSERT ... ON CONFLICT DO UPDATE ... WHERE kedaluwarsa <= jam sekarang", () => {
    const sql = ki.slice(nExec, nExec + 6).join("\n");
    expect(sql).toContain("INSERT INTO kunci_idempotensi");
    expect(sql).toContain("ON CONFLICT (kunci) DO UPDATE");
    expect(sql).toContain("WHERE kunci_idempotensi.kedaluwarsa <= $4");
    expect(kodeIdem).toContain("if n, _ := h.RowsAffected(); n == 1 {\n\t\treturn KlaimBaru, nil, nil");
    harus("Key yang umurnya sudah lewat diambil ulang. INSERT yang bentrok dengan key lama menimpanya bila kolom `kedaluwarsa` tidak lebih dari jam sekarang, dan hasilnya `KlaimBaru`:");
  });
  test("titik mati: -lab-cicilan-henti mengirim SIGKILL ke dirinya sendiri; -lab-sekarang memerankan jam; sinyal 9 dan jam hanya di versi pertama", () => {
    expect(kodeMain).toContain("-lab-cicilan-henti");
    expect(kodeMain).toContain("proses dimatikan sinyal 9 (SIGKILL) sesudah sekian jurnal ditulis, sebelum angsurannya ditandai");
    expect(kodeMain).toContain("_ = syscall.Kill(syscall.Getpid(), syscall.SIGKILL)");
    expect(kodeMain).toContain("Dengan -lab-sekarang, waktu Idempotency-Key mode rentan diperankan (24 jam tidak ditunggu).");
    expect(readmeLab).toContain("Hanya versi pertama (`cicilan-satu-job`) membaca jam, lewat `-lab-sekarang`");
    expect(readmeLab).toContain("Versi benar tidak membaca jam.");
    // berhenti() menghentikan job dan mengembalikan Dihentikan; baru main.go mengirim sinyal 9, sebelum angsuran ditandai
    expect(kt[nDijurnal + 4]).toBe("\t\treturn true, nil");
    expect(kodeT5).toContain("h.Dihentikan = stop // rentan");
    const fJob2 = kodeMain.slice(kodeMain.indexOf("func jalankanCicilan("), kodeMain.indexOf("// jalankanKompensasi:"));
    expect(fJob2.indexOf("if h.Dihentikan {")).toBeGreaterThan(fJob2.indexOf("svc.JalankanCicilan("));
    expect(fJob2.indexOf("syscall.SIGKILL")).toBeGreaterThan(fJob2.indexOf("if h.Dihentikan {"));
    harus("Baris `berhenti()` dipasang lab. Dengan `-lab-cicilan-henti 1`, job berhenti di sana, lalu `main.go` mengirim sinyal 9 (SIGKILL) ke prosesnya sendiri sebelum angsuran ditandai (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("versi pertama tidak punya status antara: tagihRentan hanya menandai dicatat atau gagal, dan 'terjurnal' hanya sebagai status asal", () => {
    expect(jumlah(badanRentan, '"terjurnal"')).toBe(1);
    expect(badanRentan).toContain('[]string{"menunggu", "terjurnal"}, "dicatat"');
    expect(badanRentan).toContain('[]string{"menunggu"}, "gagal"');
    expect(baca("labs/t5-cicilan/output/langkah.txt")).toContain("(3 nilai di versi benar: menunggu, terjurnal, dicatat)");
    // versi benar menandai terjurnal (lingkup pembanding: tagihBenar)
    expect(kodeT5).toContain('[]string{"menunggu"}, "terjurnal", &jurnal');
    harus("**Versi pertama tidak punya status antara.** Angsuran yang berhasil hanya berstatus `menunggu` lalu `dicatat`. Tidak ada status yang menyatakan jurnalnya sudah ada, jadi angsuran yang sudah dijurnal tampak sama dengan yang belum (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("klaim 'paling banyak satu angsuran': job berurutan, tanpa goroutine, daftar diurutkan menurut jadwal dan ke, tanda dipasang tepat sesudah jurnal", () => {
    const ia = kodeT5.indexOf("// --8<-- [start:job-cicilan]");
    const ib = kodeT5.indexOf("// --8<-- [end:job-cicilan]");
    const job = kodeT5.slice(ia, ib);
    expect(job).toContain("for _, a := range daftar {");
    expect(job).not.toMatch(/\bgo func\b|\bgo s\.|\bsync\.|errgroup/);
    expect(badanRentan).not.toMatch(/\bgo func\b|\bgo s\.|\bsync\.|errgroup/);
    expect(kodeRepoT5).toContain("ORDER BY a.jadwal_id, a.ke");
    expect(kodeRepoT5).toContain("WHERE a.status IN ('menunggu', 'terjurnal')");
    // jurnal dan penanda per angsuran: tidak ada kumpulan angsuran yang ditandai sekaligus di tagihRentan
    expect(badanRentan).not.toMatch(/for .*range/);
    expect(jumlah(badanRentan, "s.repo.TandaiAngsuran(")).toBe(2);
    harus("- Rekaman memuat satu angsuran yang sudah dijurnal dan belum ditandai. Job lab menagih angsuran satu per satu menurut urutan jadwal dan ke, jadi satu proses yang mati meninggalkan paling banyak satu angsuran dalam keadaan itu. 312 angsuran butuh job yang menandai per kelompok atau berjalan serentak, dan lab tidak merekamnya.");
  });
  test("selisih dengan naskah dan lingkup: saldo karyawan tidak negatif sejak Tahap 2, notifikasi angsuran tidak dibangun, tanpa pembatas laju, tanpa beberapa mesin", () => {
    expect(skemaLedger).toContain("saldo_karyawan_tidak_negatif");
    expect(tesCicilan).toContain('namaConstraint(err) != "saldo_karyawan_tidak_negatif"');
    expect(2 * nominalCerita).toBe(berkurangCerita);
    expect(berkurangCerita).toBeGreaterThan(saldoAwal);
    expect(nominalCerita).toBe(2 * perAngsuran);
    expect(readmeLab).toContain("Data awal memberi karyawan saldo Rp250.000 dan database menolak saldo karyawan negatif, jadi lab memakai Rp100.000 per angsuran.");
    const dir = "labs/api-t5/migrasi";
    const semua = fs.readdirSync(path.join(akar, dir)).filter((f) => f.endsWith(".sql")).sort().map((f) => baca(`${dir}/${f}`)).join("\n");
    const cek = semua.split("\n").filter((b) => b.includes("outbox_jenis_check CHECK"));
    expect(cek.length).toBeGreaterThan(0);
    expect(cek[cek.length - 1]).toBe("ALTER TABLE outbox ADD CONSTRAINT outbox_jenis_check CHECK (jenis = ANY (ARRAY['bayar', 'transfer', 'topup', 'promo', 'verifikasi', 'pengumuman']));");
    expect(cek.join("\n")).not.toContain("angsuran");
    expect(readmeLab).toContain("Notifikasi \"diminta\" pada langkah `dicatat` tidak dibangun (nilai `jenis` outbox untuk angsuran tidak ada");
    expect(readmeLab).toContain("Job api-t5 tidak punya pembatas laju.");
    expect(readmeLab).toContain("Beberapa instance job di mesin berbeda dan jam sistem yang berbeda tidak diperankan");
    harus(`- Gejala dan angka cerita berasal dari cerita (Ilustrasi): ${jumlahCerita} angsuran, ${rp(nominalCerita)}, dua notifikasi, Sabtu ${jamBatch[1]}, Senin ${jamBatch[2]}, dan node yang dikosongkan. Lab mematikan prosesnya sendiri dengan sinyal 9 dan memerankan jam ledger +23 dan +25 jam, bukan ${jamBatch[3]} jam.`);
    harus(`- Dua kali ${rp(nominalCerita)} butuh saldo di atas ${rp(berkurangCerita)}, sedangkan data awal lab memberi Budi ${rp(saldoAwal)}. Database menolak saldo karyawan negatif sejak Tahap 2, jadi rekaman memakai ${rp(perAngsuran)}.`);
    harus("- Notifikasi angsuran tidak dibangun: kolom `jenis` di `outbox` tidak punya nilai angsuran (Tidak dijalankan: dibaca dari migrasi lab).");
    harus(`- Job lab tidak membatasi laju pada ${lajuNaskah} angsuran per detik, dan beberapa instance job di mesin berbeda tidak diperankan. Angka ${detikNaskah} detik hanya Hitungan atas Asumsi.`);
  });
});

describe("angka cerita dan kalimat berangka: diturunkan dari naskah, rekaman, dan kode", () => {
  test("gejala: minggu 10, Rp200.000, Rp400.000, 312, Sabtu dan Senin dari baris M48 naskah; berlabel Ilustrasi", () => {
    expect(mingguM48).toBe(10);
    expect(gejalaM48).toContain("(Ilustrasi)");
    expect(jumlahCerita).toBe(312);
    expect(jamBatch.slice(1)).toEqual(["02.00", "02.00", "48"]);
    harus(`Minggu ${mingguM48} Tahap 5. Senin pagi Budi membuka app dan melihat dua notifikasi "Angsuran ${rp(nominalCerita)} dibayar". Saldonya berkurang ${rp(berkurangCerita)}, bukan ${rp(nominalCerita)}.`);
    harus(`Hendra memeriksa ledger. Ia menemukan ${jumlahCerita} angsuran yang punya dua jurnal sesudah batch hari Sabtu.`);
    harus(`*Angka cerita (Ilustrasi):* ${rp(nominalCerita)}, ${rp(berkurangCerita)}, dua notifikasi, ${jumlahCerita} angsuran, serta Sabtu dan Senin berasal dari naskah, bukan dari rekaman.`);
    harus(`Rekaman lab memakai angsuran ${rp(perAngsuran)} dan saldo ${rp(saldoAwal)}, dan alasannya ada di blok Yang sebenarnya. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].`);
  });
  test("dugaan Raka dan Hendra sama dengan kolom 'Yang dikira' naskah; batch, job, dan angsuran didefinisikan di pemakaian pertama", () => {
    expect(dikiraM48).toBe("Bug di penagihan. Hendra: batch selalu bisa diulang dari awal");
    harus("Raka membaca dua notifikasi itu dan menduga ada bug di penagihan: kode batch menagih satu angsuran dua kali dalam satu putaran.");
    harus("Hendra tidak setuju. Batch harian adalah satu putaran job cicilan, program terjadwal yang menagih semua angsuran jatuh tempo. Angsuran adalah satu pembayaran dari jadwal cicilan Budi ke merchant.");
    harus("Hendra menulis job itu dan yakin batch boleh diulang dari awal kapan saja. Tiap angsuran ditagih dengan Idempotency-Key, dan selama key itu hidup, penagihan ulang tidak menulis jurnal kedua. Key hidup 24 jam ([[t2-idempotency]]).");
    expect(naskah).toContain("Hendra menulis cicilan sebagai job malam yang menagih semua jadwal jatuh tempo, lalu menandai angsuran lunas.");
    expect(sebenarnyaM48).toContain("Ulangan dalam 24 jam aman karena key ledger menahan jurnal kedua (ADR 14, ADR 19).");
    expect(badan.indexOf("Batch harian adalah satu putaran")).toBeLessThan(badan.indexOf("batch boleh diulang"));
    expect(badan.indexOf("Batch harian adalah satu putaran")).toBeGreaterThan(badan.indexOf("Yang Raka kira"));
  });
  test("tebak dulu: 23 jam, satu jurnal dan status menunggu, dari rekaman; dugaan Hendra benar untuk jumlah jurnal", () => {
    harus(`<summary>Tebak dulu: batch mati sesudah ledger menjurnal angsuran ${rp(perAngsuran)} milik Budi, lalu dijalankan lagi 23 jam kemudian. Berapa jurnal angsuran itu, dan apa statusnya?</summary>`);
    harus("Satu jurnal, dan angsuran tetap `menunggu` (Rekaman lab, `crash.txt` bagian A). Key masih hidup, jadi batch tidak menjurnal lagi, tetapi ia juga tidak menyelesaikan angsuran itu: ia melewatinya.");
    harus("Dugaan Hendra benar untuk jumlah jurnal pada 23 jam. Blok berikutnya memuat yang terjadi pada 25 jam, ketika key sudah habis.");
    expect(baris23[1]).toBe("1");
    expect(baris23[0]).toBe("menunggu");
  });
  test("Yang sebenarnya: kalimat pembuka (Inti), rekaman tiga tahap, saldo, Hitungan di pemakaian pertama, dan dua dugaan", () => {
    harus("Batch yang mati sesudah jurnal menagih angsuran yang sama dua kali bila diulang sesudah key 24 jam habis. Diulang dalam 24 jam, ia tidak menagih ganda tetapi angsurannya tetap menunggu.");
    harus(`**Mati sesudah jurnal.** Rekaman memakai jadwal 1 Budi: tiga angsuran ${rp(perAngsuran)} ke Warung Ani, angsuran ke-1 jatuh tempo kemarin, saldo Budi ${rp(saldoAwal)}. Job pertama mati tanpa keluaran. Ledger sudah punya satu jurnal angsuran ke-1 dan key-nya selesai, tetapi angsurannya masih \`menunggu\`:`);
    harus("**Diulang 23 jam kemudian: satu jurnal, tetapi dilewati.** Key masih hidup. Job membaca angsuran itu, tidak menjurnal baru, dan tidak menandainya:");
    harus("Dalam 24 jam tidak ada tagihan ganda. Tetapi angsuran itu dilewati, bukan diselesaikan, jadi job membacanya lagi di putaran berikutnya.");
    harus("**Diulang 25 jam kemudian: dua jurnal.** Key sudah lewat umurnya, job mengklaimnya lagi, dan jurnal kedua ditulis:");
    harus(`Saldo Budi turun dari ${rp(saldoAwal)} ke ${rp(angka(saldoA[1]!))}. Itu cocok dengan Hitungan ${angkaId(saldoAwal)} − 2 × ${angkaId(perAngsuran)} = ${angkaId(saldoAwal - 2 * perAngsuran)}. Hitungan adalah angka yang dihitung dari angka lain di halaman ini.`);
    expect(badan.indexOf("Hitungan")).toBeLessThan(badan.indexOf("Hitungan adalah angka"));
    expect(badan.indexOf("Hitungan adalah angka") - badan.indexOf("Hitungan")).toBeLessThan(120);
    harus("**Dugaan Raka gugur, dugaan Hendra separuh benar.** Putaran pertama menulis satu jurnal, dan dua job serentak dalam 24 jam menghasilkan satu jurnal dan satu angsuran dilewati (Rekaman lab, `serentak.txt` bagian C). Di rekaman, jurnal kedua baru muncul pada ulangan 25 jam.");
    harus("Dugaan Hendra benar untuk jumlah jurnal pada 23 jam dan salah pada 25 jam. Batch versi pertama tidak bisa diulang kapan saja dengan hasil yang sama, karena key hanya hidup 24 jam.");
    expect(hasilSerentakC.slice(1).map(Number)).toEqual([1, 1, 1]);
    expect(hasil25[4]).toBe("1");
  });
  test("batas 24 jam: kalimat 'kapan salah' ADR 14 dan jam ledger diperankan; kutipan dari halaman ADR 14 dan 2.26", () => {
    expect(adr14).toContain("**Kapan keputusan ini salah.** Saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama.");
    expect(adr14).toContain("### ADR 14: key sekali per niat bayar, hasil disimpan 24 jam");
    expect(jobRekon).toContain("Job yang **idempoten** menghasilkan keadaan akhir yang sama, dijalankan sekali atau berkali-kali dengan input yang sama.");
    harus(`**Batas 24 jam sudah ditulis di ADR 14.** ADR 14 menulis kapan keputusannya salah: saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama ([[t2-idempotency]]). Batch yang tertunda lebih dari 24 jam memenuhi syarat itu, yaitu +25 jam di rekaman dan ${jamBatch[3]} jam di cerita (Ilustrasi). Key-nya tidak berubah.`);
    expect(naskah).toContain("Key yang kedaluwarsa tidak boleh menjadi satu-satunya penahan jurnal ganda");
    harus("Key yang kedaluwarsa tidak boleh menjadi satu-satunya penahan jurnal ganda.");
  });
  test("Hitungan 13.333 dan 667 detik: dari angka beban naskah, nilai tepat dan satu kalimat pembulatan, setengah ke atas", () => {
    expect(jadwalAktif).toBe(100000);
    expect(persenTempo).toBe(40);
    expect(puncakNaskah).toBe(13333);
    expect(lajuNaskah).toBe(20);
    expect(detikNaskah).toBe(667);
    expect(menitNaskah).toBe("11,1");
    expect(desimal(puncakTepat, 1)).toBe("13.333,3");
    expect(Math.round(puncakTepat)).toBe(puncakNaskah);
    expect(detikTepat.toFixed(2)).toBe("666.65");
    expect(Math.round(detikTepat)).toBe(detikNaskah);
    expect(menitTepat.toFixed(1)).toBe("11.1");
    harus(`**Kenapa batch bisa mati di tengah.** Naskah memperkirakan ${angkaId(jadwalAktif)} jadwal aktif, dan ${persenTempo}% jatuh tempo di tiga hari gajian (Asumsi). Per hari puncak itu ${angkaId(jadwalAktif)} × ${persenTempo}% ÷ ${hariGajian} = ${desimal(puncakTepat, 1)}, dibulatkan ke ${angkaId(puncakNaskah)} angsuran.`);
    harus(`Pada ${lajuNaskah} angsuran per detik (Asumsi naskah), batch butuh ${angkaId(puncakNaskah)} ÷ ${lajuNaskah} = ${detikTepat.toFixed(2).replace(".", ",")} detik, dibulatkan ${detikNaskah} detik atau ${menitNaskah} menit (Hitungan atas Asumsi). Dalam jendela itu node yang menjalankan job bisa dikosongkan (Ilustrasi).`);
  });
  test("Coba sendiri, noscript, Konsep yang lahir, dan Cek diri memakai angka dari rekaman", () => {
    harus("Widget ini mengikuti cerita M48. Jalur utama memakai rekaman `crash.txt` bagian A, dan layar HP digambar dari cerita (Ilustrasi). Tebak dulu, lalu tekan Berikutnya atau panah kanan.");
    harus(`Sesudah langkah terakhir, centang **Ubah satu hal: ${skenario.varian.label}**. Jalurnya berganti menjadi tiga langkah dari bagian B dan C (Rekaman lab). Langkahnya memakai Citra dengan data yang sama, job yang diulang kapan saja, dan referensi yang ditolak database.`);
    harus("Cara kerja referensi dibahas di [[t5-batch]]. Widget ini hanya menunjukkan bahwa satu hal berbeda mengubah jumlah jurnal.");
    harus(`Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: job dimatikan sesudah jurnal angsuran ke-1 ${rp(perAngsuran)} dan angsurannya tetap \`menunggu\`. Diulang 23 jam kemudian, jurnalnya tetap satu dan angsuran dilewati. Diulang 25 jam kemudian, jurnalnya dua dan saldo Budi ${rp(angka(saldoA[1]!))} (\`crash.txt\` bagian A).`);
    harus(`Bila jurnal membawa referensi unik, job yang diulang kapan saja menemukan jurnal yang sama, menandai angsurannya \`dicatat\`, dan saldo Citra ${rp(angka(saldoB[1]!))} (bagian B). INSERT dengan referensi yang sama ditolak database (bagian C).`);
    harus("- [[t5-batch]]: batch harian tahan crash, kunci bisnis, dan saga. Keputusannya ADR 54.");
    harus("- [[t2-idempotency]]: Idempotency-Key dan umurnya 24 jam, dibaca ulang di halaman ini. Keputusannya ADR 14.");
    harus("- [[t4-modul]]: pola yang sama untuk top-up yang dikirim ulang.");
    expect(naskah).toContain("| 54 | Ledger menerima `referensi` unik di `jurnal` untuk jenis jurnal berulang");
    expect(naskah).toContain("| Batch harian tahan crash | Key yang kedaluwarsa tidak boleh menjadi satu-satunya penahan jurnal ganda | M48 |");
  });
});

describe("sumber luar: dua tautan Kubernetes, tanggal buka, kutipan, dan baris riset R5-205 sampai R5-209", () => {
  test("dua tautan luar, tiap tautan ada di baris riset dengan tanggal buka 2026-11-03, dan tanggal di halaman terkunci", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(tautan).toEqual([URL_JOB, URL_CRON]);
    expect(barisRiset("R5-205")).toContain(URL_JOB.replace("https://", "").replace(/\/$/, ""));
    expect(barisRiset("R5-206")).toContain(URL_CRON.replace("https://", "").replace(/\/$/, ""));
    expect((badan.match(new RegExp(`dibuka ${TANGGAL}`, "g")) ?? []).length).toBe(2);
    expect((badan.match(/2026-1\d-\d\d/g) ?? []).length).toBe(2);
    for (const r of ["R5-205", "R5-206"]) expect(barisRiset(r)).toContain(`dibuka ${TANGGAL}`);
    harus(`**Platform tidak menjanjikan satu kali jalan.** Bila batch berjalan sebagai Job di Kubernetes, programnya kadang dimulai dua kali. Itu berlaku juga dengan \`parallelism\` 1, \`completions\` 1, dan \`restartPolicy\` \`Never\` ([Kubernetes: Jobs](${URL_JOB}), bagian Handling Pod and container failures, dibuka ${TANGGAL}, Tidak dijalankan). Lab tidak menjalankan Kubernetes.`);
    harus(`Dokumentasi CronJob menulis bahwa Job sebaiknya idempoten ([Kubernetes: CronJob](${URL_CRON}), bagian Job creation, dibuka ${TANGGAL}, Tidak dijalankan). Job yang idempoten menghasilkan keadaan akhir yang sama, dijalankan sekali atau berkali-kali ([[t2-job-rekonsiliasi]]). Di rekaman, job cicilan versi pertama tidak memenuhinya: sesudah 23 jam angsurannya tetap \`menunggu\`, dan sesudah 25 jam jurnalnya dua.`);
  });
  test("R5-205: kutipan 'the same program may sometimes be started twice' dan syarat parallelism, completions, restartPolicy; halaman tidak lebih kuat", () => {
    const b = barisRiset("R5-205");
    expect(b).toContain('Note that even if you specify .spec.parallelism = 1 and .spec.completions = 1 and .spec.template.spec.restartPolicy = "Never", the same program may sometimes be started twice.');
    expect(b).toContain('bagian "Handling Pod and container failures"');
    expect(b).toContain("terakhir diubah 2026-10-12");
    expect(b).toContain("naskah tidak menyebut jenis workload batch");
    expect(b).toContain('kalimat "programnya kadang dimulai dua kali"');
    expect(badan).toContain("kadang dimulai dua kali");
    expect(badan).not.toMatch(/Kubernetes (selalu|menjamin|memulai)/);
  });
  test("R5-206: kutipan 'should be idempotent' dengan pelunak, bagian Job creation; 'sebaiknya' ikut ke halaman", () => {
    const b = barisRiset("R5-206");
    expect(b).toContain("The scheduling is approximate because there are certain circumstances where two Jobs might be created, or no Job might be created. Kubernetes tries to avoid those situations, but does not completely prevent them. Therefore, the Jobs that you define should be idempotent.");
    expect(b).toContain('bagian "Job creation"');
    expect(b).toContain("terakhir diubah 2026-05-13");
    expect(b).toContain('Kata "should" ikut ke halaman sebagai "sebaiknya"');
    expect(badan).toContain("Job sebaiknya idempoten");
    expect(badan).not.toMatch(/Job (harus|wajib) idempoten/);
  });
  test("R5-207 sampai R5-209: sumber internal, rekaman dan kode, dan hitungan tercatat; lima baris berurutan, lima kolom, tanpa ID ganda, urutan naik", () => {
    const ids = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R5-(\d+) /)![1]));
    expect(new Set(ids).size).toBe(ids.length);
    const i = ids.indexOf(205);
    expect(ids.slice(i, i + 5)).toEqual([205, 206, 207, 208, 209]);
    for (const n of [205, 206, 207, 208, 209]) expect(pecahBaris(barisRiset(`R5-${n}`)).length, `R5-${n}`).toBe(5);
    expect(ids.every((x, k) => k === 0 || x > ids[k - 1]!)).toBe(true);
    const konsep: Record<string, [string, string]> = {
      "R5-205": ["Program Job Kubernetes kadang dimulai dua kali (halaman 5.20)", "Tidak berubah dari cara naskah memerankan node yang dikosongkan (Ilustrasi)"],
      "R5-206": ["Job dari CronJob sebaiknya idempoten (halaman 5.20)", "Tidak berubah"],
      "R5-207": ["Baris M48, angka beban cicilan, ADR 14, dan rekaman Tahap 4 yang dikutip halaman 5.20 dibaca ke naskah dan halaman, bukan ke sumber luar (Asumsi)", "Tidak berubah"],
      "R5-208": ["Rekaman dan kode lab yang dikutip halaman 5.20 dibaca ke berkas, bukan ke sumber luar (Rekaman lab dan Tidak dijalankan: dibaca dari kode lab)", "Tidak berubah"],
      "R5-209": ["Hitungan atas angka yang tertulis di halaman 5.20 (Hitungan; masukan terlemah Rekaman lab, Asumsi, dan Ilustrasi)", "Tidak berlaku (hitungan atas angka sendiri)"],
    };
    for (const [id, [k1, k4]] of Object.entries(konsep)) {
      const kol = pecahBaris(barisRiset(id));
      expect(kol[1], `${id} kolom Konsep`).toBe(k1);
      expect(kol[4], `${id} kolom Berubah sejak Okt 2026`).toBe(k4);
    }
    const r207 = barisRiset("R5-207");
    expect(r207).toContain("Dibaca 2026-11-03 di main:");
    for (const k of ['"312 angsuran dengan dua jurnal"', '"Angsuran Rp200.000 dibayar"', '"Bug di penagihan"', '"batch selalu bisa diulang dari awal"', "48 jam", "100.000 jadwal aktif", "40% jatuh tempo di tiga hari gajian", "13.333 angsuran per hari puncak", "667 detik = 11,1 menit", "proses-mati.txt", "Saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama"]) expect(r207, k).toContain(k);
    const r208 = barisRiset("R5-208");
    expect(r208).toContain("Dibaca 2026-11-03 di main:");
    for (const k of ["crash.txt", "serentak.txt", "run.py", "`labs/api-t5/internal/service/t5.go`", "`repo/idempoten.go`", "`repo/t5.go`", "`cmd/api/main.go`", "000026_nilai_baru_tahap5.up.sql", "README.md", `baris ${nMati} sampai ${nTabelMati + 3}`, `${n23} sampai ${nKomen23}`, `${n25} sampai ${nSaldoA}`, `baris ${nCitra} sampai ${nSaldoB}`, `baris ${nC} sampai ${nError}`, `baris ${nFungsi} sampai ${nFungsiAkhir}`, "`jurnal_referensi_key`", "ORDER BY a.jadwal_id, a.ke"]) expect(r208, k).toContain(k);
    const r209 = barisRiset("R5-209");
    expect(r209).toContain("dibaca 2026-11-03");
    for (const k of [`${angkaId(saldoAwal)} − ${angkaId(perAngsuran)} = ${angkaId(saldoAwal - perAngsuran)}`, `${angkaId(saldoAwal)} − 2 × ${angkaId(perAngsuran)} = ${angkaId(saldoAwal - 2 * perAngsuran)}`, `2 × ${angkaId(nominalCerita)} = ${angkaId(berkurangCerita)} > ${angkaId(saldoAwal)}`, `${angkaId(jadwalAktif)} × ${persenTempo}% ÷ ${hariGajian} = ${angkaId(puncakNaskah)}`, `${angkaId(puncakNaskah)} ÷ ${lajuNaskah} = 666,65, dibulatkan ${detikNaskah} detik`, `${detikNaskah} ÷ 60 = ${menitNaskah} menit`]) expect(r209, k).toContain(k);
  });
});

describe("kalimat berulang di badan halaman", () => {
  test("tidak ada kalimat (empat kata atau lebih) yang muncul dua kali: toContain dan harus() puas dengan satu kemunculan, jadi kalimat yang digandakan lolos tanpa kunci baris", () => {
    const kalimat = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 4);
    expect(kalimat.length).toBeGreaterThan(70);
    const hitung = new Map<string, number>();
    for (const k of kalimat) hitung.set(k, (hitung.get(k) ?? 0) + 1);
    expect([...hitung].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
    // klausa sesudah titik dua (lima kata atau lebih) juga tidak digandakan
    const klausa = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?:])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 5);
    const hitungKlausa = new Map<string, number>();
    for (const k of klausa) hitungKlausa.set(k, (hitungKlausa.get(k) ?? 0) + 1);
    expect([...hitungKlausa].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });
});

describe("ID registry, tautan, template blok, widget, kartu, dan label", () => {
  test("registry: halaman 5.20 jenis masalah, ada, prasyarat t2-idempotency dan t4-modul, lab t5-cicilan, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m48");
    expect(h.nomor).toBe("5.20");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.prasyarat).toEqual(["t2-idempotency", "t4-modul"]);
    expect(h.lab).toEqual(["t5-cicilan"]);
    expect(h.peran).toEqual(["backend"]);
    expect(h.path).toBe("tahap-5/m48-angsuran-dua-kali.md");
    expect(h.label).toBe(`Masalah ${kolomM48[0]!.slice(1)} · minggu ${mingguM48}`);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t2-idempotency]], [[t4-modul]]");
    expect(frontmatter).toContain(`title: "5.20 ${h.judul}"`);
    expect(naskah).toContain(`| 5.20 | 4 | ${h.judul} | Masalah | ★ | t5-cicilan | alur |`);
    expect(h.masalah).toBe("Angsuran Budi terdebit dua kali karena batch yang tertunda berhari-hari melewati umur Idempotency-Key");
    expect(frontmatter).toContain("description: Minggu 10. Budi menerima dua notifikasi angsuran dan saldonya berkurang dua kali, karena batch yang mati di tengah dijalankan lagi sesudah Idempotency-Key 24 jam habis. Ulangan dalam 24 jam tidak menagih ganda, tetapi angsurannya tetap menunggu.");
    expect(dari("t5-batch").nomor).toBe("5.21");
    expect(dari("t5-batch").prasyarat).toEqual(["t5-m48"]);
    expect(dari("t5-batch").adr).toEqual([54]);
  });
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci, dan nomor ADR tujuan", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ A0: 1, "t2-idempotency": 3, "t4-modul": 2, "t2-job-rekonsiliasi": 1, "t5-batch": 2 });
    expect(dari("t2-idempotency").nomor).toBe("2.14");
    expect(dari("t2-idempotency").adr).toEqual([14]);
    expect(dari("t4-modul").nomor).toBe("4.13");
    expect(dari("t2-job-rekonsiliasi").nomor).toBe("2.26");
    expect(dari("t2-job-rekonsiliasi").adr).toEqual([19]);
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
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m48.json" />');
    expect(badan).toContain("<Rantai data={angsuranDuaJurnal} ringkas />");
    expect(halaman).toContain('import angsuranDuaJurnal from "../../../../data/diagram/t5-m48-angsuran-dua-jurnal.json";');
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
  test("adegan Gejala tanpa kalimat definisi: dua paragraf adegan dan dua paragraf catatan (dipecah supaya baris tidak berpindah saat font diganti)", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala"'), badan.indexOf("</Blok>"));
    const paragraf = gejala.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<"));
    expect(paragraf).toHaveLength(4);
    const adegan = paragraf.slice(0, 2);
    expect(adegan.some((b) => b.startsWith("*"))).toBe(false);
    expect(paragraf[2]!.startsWith("*Angka cerita (Ilustrasi):*")).toBe(true);
    expect(paragraf[3]!.startsWith("Rekaman lab memakai angsuran")).toBe(true);
    for (const b of paragraf) expect(b).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/i);
  });
  test("satu kata per konsep: angsuran (bukan cicilan untuk satu pembayaran), tanpa pembeli, pelanggan, layanan, secret, rahasia, replica", () => {
    for (const k of ["pembeli", "pelanggan", "layanan", "secret", "rahasia", "replica"]) expect(badan.toLowerCase(), k).not.toContain(k);
    expect(badan).not.toMatch(/\bAnda\b/);
    expect(badan).not.toMatch(/\bkita\b/i);
    const tanpaKode = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[^>]*>/g, "");
    expect((tanpaKode.match(/\bangsuran\b/gi) ?? []).length).toBeGreaterThan(30);
    expect(tanpaKode).not.toMatch(/\bcicilan ke-\d|\bpembayaran cicilan\b/i);
  });
  test("label: 'Rekaman lab' hanya untuk crash.txt, serentak.txt, proses-mati.txt, bagian B dan C, dan definisi; tak satu angka waktu berlabel Rekaman lab selain +23 dan +25 jam", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(barisRekaman.length).toBe(8);
    for (const b of barisRekaman) {
      expect(b.includes("crash.txt") || b.includes("serentak.txt") || b.includes("proses-mati.txt") || b.includes("Arti Ilustrasi, Rekaman lab") || b.includes("bagian B dan C (Rekaman lab)") || b.includes("Rekaman lab: labs/")).toBe(true);
    }
    expect(badan).not.toMatch(/\d+ (menit|jam)[^.\n]*\(Rekaman lab\)/);
    expect(badan).not.toMatch(/48 jam[^.\n]*\(Rekaman lab\)/);
    expect(badan).not.toMatch(/\b312\b[^.\n]*\(Rekaman lab\)/);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, dan kartu", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m48"))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
  });
});

describe("diagram Rantai dan skenario alur: diturunkan dari rekaman", () => {
  test("diagram Rantai: ringkas, dua baris, sumber rekaman crash.txt bagian A dan B, simpul dan sub dari nilai turunan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d).toEqual({
      id: "t5-m48-angsuran-dua-jurnal",
      judul: "Batch yang mati sesudah jurnal menagih angsuran yang sama dua kali bila diulang sesudah key 24 jam habis",
      sumber: { jenis: "rekaman", teks: "Rekaman lab t5-cicilan · crash.txt bagian A dan B (jam ledger diperankan)" },
      baris: [
        { label: "Versi pertama", sub: "key 24 jam sebagai satu-satunya penahan", simpul: [
          { teks: "Mati sesudah jurnal", sub: `${barisMati[2]} jurnal, angsuran ${barisMati[1]}`, nada: "biasa", kode: false },
          { teks: `+23 jam: ${baris23[1]} jurnal`, sub: `dilewati, tetap ${baris23[0]}`, nada: "biasa", kode: false },
          { teks: `+25 jam: ${baris25[2]} jurnal`, sub: `saldo Budi ${rp(angka(saldoA[1]!))}`, nada: "warn", kode: false },
        ] },
        { label: "Versi benar", sub: "referensi unik di jurnal", simpul: [
          { teks: "Mati sesudah jurnal", sub: `${barisMatiB[2]} jurnal, angsuran ${barisMatiB[1]}`, nada: "biasa", kode: false },
          { teks: `Kapan saja: ${barisB[3]} jurnal`, sub: `angsuran ${barisB[1]}`, nada: "good", kode: false },
        ] },
      ],
      catatan: "Kotak oranye menandai jurnal kedua di versi pertama, dan kotak hijau angsuran yang selesai di versi benar. Jam ledger diperankan, jadi 23 dan 25 jam tidak ditunggu. Versi benar tidak membaca jam.",
    });
    expect(Number(hasil23[2])).toBe(Number(baris23[1]) - 1);
  });
  test("skenario alur: valid menurut alur-core, satu HP, dua komponen, tiga langkah dan tiga langkah varian dari awal, sumber rekaman", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("rekaman");
    expect(skenario.sumber.file).toBe("labs/t5-cicilan/output/crash.txt");
    expect(skenario.sumber.fileVarian).toBe("labs/t5-cicilan/output/crash.txt");
    expect(skenario.perangkat).toEqual([{ id: "hp", label: "HP user" }]);
    expect(skenario.komponen).toEqual([{ id: "job", label: "Job cicilan" }, { id: "db", label: "Ledger (PostgreSQL)" }]);
    expect(skenario.langkah).toHaveLength(3);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(core.steps(skenario, true)).toHaveLength(3);
    expect(skenario.sumber.catatan).toBe(`Lab t5-cicilan, PostgreSQL 17.11, dari database bersih (make -C labs/t5-cicilan run BAGIAN=crash). Jalur utama: crash.txt bagian A, versi pertama (mode rentan cicilan-satu-job), dengan jam ledger diperankan lewat -lab-sekarang. Ubah satu hal: bagian B dan C, versi benar dengan referensi unik, yang memakai karyawan lain (Citra) supaya datanya terpisah; angkanya sama dengan jalur utama (saldo ${rp(saldoAwal)}, angsuran ${rp(perAngsuran)}) dan hasilnya satu jurnal. Layar HP digambar dari cerita (Ilustrasi): lab tidak punya app Flutter, jam di layar berasal dari cerita, dan notifikasi angsuran tidak dibangun. Tiap langkah menampilkan baris terpilih dari rekaman yang sama dalam urutan aslinya; baris yang tidak dibutuhkan langkah itu dilewati. Baris diawali tanda pagar adalah baris rekaman, bukan baris log.`);
    expect(rek[1]).toContain("PostgreSQL 17.11");
    expect(Object.keys(skenario).sort()).toEqual(["judul", "komponen", "langkah", "layarAwal", "pengantar", "perangkat", "predict", "sumber", "varian", "versi"]);
    expect((skenario as unknown as { versi: number }).versi).toBe(2);
    expect(skenario.predict.varian).toBe(false);
  });
  test("skenario: kirim tiap langkah adalah baris terpilih dari crash.txt dalam urutan aslinya, bagian A untuk jalur utama, bagian B dan C untuk varian", () => {
    const urut = (kirim: string, mulai: number): number[] => {
      let kursor = mulai - 1;
      const pos: number[] = [];
      for (const b of kirim.split("\n")) {
        const i = rek.findIndex((x, k) => k >= kursor && x === b);
        expect(i, `baris tidak ada di rekaman sesudah baris ${kursor}: ${b.slice(0, 60)}`).toBeGreaterThan(-1);
        pos.push(i + 1);
        kursor = i + 1;
      }
      return pos;
    };
    const utama = [
      urut(skenario.langkah[0]!.kirim, nMati),
      urut(skenario.langkah[1]!.kirim, n23Cmd),
      urut(skenario.langkah[2]!.kirim, n25Cmd),
    ];
    expect(utama).toEqual([
      [nMati, nMati + 1, nMati + 2, nTabelMati, nTabelMati + 1, nTabelMati + 2],
      [n23Cmd, n23Cmd + 1, nTabel23, nTabel23 + 1, nTabel23 + 2],
      [n25Cmd, n25Cmd + 1, nTabel25, nTabel25 + 1, nTabel25 + 2, nSaldoA],
    ]);
    const varian = [
      urut(skenario.varian.langkah[0]!.kirim, nCitra),
      urut(skenario.varian.langkah[1]!.kirim, nKapanSaja),
      urut(skenario.varian.langkah[2]!.kirim, nUlangB),
    ];
    expect(varian).toEqual([
      [nCitra, nMatiB, nMatiB + 1, nTabelMatiB, nTabelMatiB + 1, nTabelMatiB + 2],
      [nKapanSaja, nKapanSaja + 1, nKapanSaja + 2, nTabelB, nTabelB + 1, nTabelB + 2, nSaldoB],
      [nUlangB, nC, nError],
    ]);
    for (const p of utama.flat()) expect(bagianDi(p), `jalur utama baris ${p}`).toBe("A");
    for (const p of varian.flat()) expect(["B", "C"], `varian baris ${p}`).toContain(bagianDi(p));
    expect(varian[0]!.every((p) => bagianDi(p) === "B")).toBe(true);
    expect(varian[1]!.every((p) => bagianDi(p) === "B")).toBe(true);
    expect(stat(nMati)).toContain("-lab-cicilan-henti 1");
    expect(stat(n23Cmd)).toContain("<waktu +23 jam>");
    expect(stat(n25Cmd)).toContain("<waktu +25 jam>");
    expect(stat(nMatiB)).not.toContain("-lab-sekarang");
    expect(stat(nMatiB)).not.toContain("-rentan");
  });
  test("skenario: layar HP tiap langkah sama persis dengan yang dibangun dari nilai rekaman (judul, jam, sinyal, saldo, dan tiap baris)", () => {
    const ani = { jenis: "baris", kiri: "Warung Ani", kanan: `−${rp(perAngsuran)}` };
    const layar = (saldo: number, isi: object[]) => ({ hp: { judul: "Rekeningo", waktu: "07.10", sinyal: 4, saldo, isi } });
    expect(skenario.layarAwal).toEqual(layar(saldoAwal, [{ jenis: "tombol", teks: "Lihat angsuran" }]));
    expect(skenario.langkah.map((l) => l.layar)).toEqual([
      layar(saldoAwal - perAngsuran, [ani]),
      layar(saldoAwal - perAngsuran, [ani]),
      layar(angka(saldoA[1]!), [ani, ani]),
    ]);
    expect(skenario.varian.langkah.map((l) => l.layar)).toEqual([
      layar(angka(saldoB[1]!), [ani]),
      layar(angka(saldoB[1]!), [ani]),
      undefined,
    ]);
    expect(Number(barisMati[2])).toBe(1);
    expect(Number(baris25[2])).toBe(2);
  });
  test("skenario: tebakan empat pilihan, jawaban benar di posisi pertama dan bukan pilihan terpanjang; penjelasan sama dengan rekaman", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(0);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(p.q).toBe(`Budi bersaldo ${rp(saldoAwal)}. Batch mati sesudah ledger menjurnal angsuran ke-1 ${rp(perAngsuran)}, lalu dijalankan lagi 25 jam kemudian. Berapa saldo Budi sesudah putaran kedua?`);
    expect(p.options[0]).toBe(`${rp(angka(saldoA[1]!))}: key 24 jam sudah habis, jadi angsuran ke-1 ditagih untuk kedua kalinya`);
    expect(p.options[1]).toBe(`${rp(saldoAwal - perAngsuran)}: key yang sama menahan jurnal kedua, berapa pun umur batch sebelumnya`);
    expect(p.options[2]).toBe(`${rp(saldoAwal)}: job yang mati membatalkan jurnalnya, lalu putaran kedua menagih dari awal`);
    expect(p.options[3]).toBe("Rp0: putaran kedua menagih angsuran ke-1 sampai ke-3 sekaligus");
    expect(p.explain).toBe(`Pada 25 jam key sudah lewat umurnya, jadi job mengklaimnya lagi dan menulis jurnal kedua: ${angkaId(saldoAwal)} − 2 × ${angkaId(perAngsuran)} = ${angkaId(angka(saldoA[1]!))} (Hitungan, cocok dengan rekaman). Pada 23 jam saldonya ${rp(saldoAwal - perAngsuran)}, karena key masih hidup. Rekaman crash.txt bagian A.`);
    expect(p.explain).not.toContain("bagian B");
  });
  test("skenario: judul, dari dan ke tiap langkah, dan kalimat penjelasan dengan angka turunan", () => {
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? null])).toEqual([["job", "db"], ["job", "db"], ["job", "db"]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? null])).toEqual([["job", "db"], ["job", "db"], ["db", null]]);
    expect(skenario.langkah.map((l) => l.nada ?? null)).toEqual([null, null, "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? null)).toEqual([null, "good", "good"]);
    expect(skenario.judul).toBe("Angsuran Budi dijurnal dua kali: batch mati sesudah jurnal, lalu diulang 23 dan 25 jam kemudian");
    expect(skenario.pengantar).toBe("Batch cicilan Budi mati sesudah ledger menjurnal angsuran ke-1, lalu dijalankan lagi. Tebak dulu apa yang terjadi di putaran kedua, lalu ikuti langkahnya sampai HP. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Batch menagih angsuran ke-1 Budi, dan prosesnya mati sesudah jurnal",
      "Batch dijalankan lagi 23 jam kemudian, dan angsuran itu dilewati",
      "Batch dijalankan lagi 25 jam kemudian, dan jurnal kedua ditulis",
    ]);
    expect(skenario.langkah[0]!.jelas).toBe(`Job dimatikan sinyal 9 sesudah jurnal angsuran ke-1 ${rp(perAngsuran)} di-commit dan key ditandai selesai, sebelum angsurannya ditandai. Di cerita proses mati karena node dikosongkan (Ilustrasi); lab mematikan prosesnya sendiri. Saldo Budi ${rp(saldoAwal - perAngsuran)} (${angkaId(saldoAwal)} − ${angkaId(perAngsuran)}, Hitungan).`);
    expect(skenario.langkah[1]!.jelas).toBe("Key masih hidup (23 jam dari 24), jadi job tidak menjurnal lagi. Ia juga tidak menandai angsuran itu: job membacanya (dibaca 1), melewatinya, dan statusnya tetap menunggu.");
    expect(skenario.langkah[2]!.jelas).toBe(`Key sudah lewat umurnya, jadi job mengklaimnya lagi dan menjurnal angsuran ke-1 untuk kedua kalinya. Saldo Budi ${rp(angka(saldoA[1]!))} (${angkaId(saldoAwal)} − 2 × ${angkaId(perAngsuran)}, Hitungan). Notifikasi dan nominal ${rp(nominalCerita)} di cerita adalah Ilustrasi.`);
    expect(skenario.varian.label).toBe("jurnal angsuran membawa referensi unik, dan job tidak bergantung pada jam");
    expect(skenario.varian.langkah.map((l) => l.judul)).toEqual([
      "Versi benar: angsuran ke-1 Citra, dan prosesnya mati sesudah jurnal",
      "Job diulang kapan saja, dan jurnalnya tetap satu",
      "Referensi yang sama ditolak database",
    ]);
    expect(skenario.varian.langkah[0]!.jelas).toBe(`Citra memakai data yang sama dengan Budi: saldo ${rp(saldoAwal)} dan angsuran ${rp(perAngsuran)}. Job mati di titik yang sama. Jurnalnya sudah ada dengan referensi unik, dan angsurannya masih menunggu.`);
    expect(skenario.varian.langkah[1]!.jelas).toBe(`Jam tidak berperan: job tidak memakai -lab-sekarang. Ia menemukan jurnal yang sudah ada dan hanya menandai angsurannya dicatat. Saldo Citra ${rp(angka(saldoB[1]!))} (${angkaId(saldoAwal)} − ${angkaId(perAngsuran)}, Hitungan).`);
    expect(skenario.varian.langkah[2]!.jelas).toBe("INSERT langsung ke jurnal dengan referensi yang sama ditolak constraint unik, tanpa job dan tanpa key. Referensi tidak punya umur seperti key 24 jam. Cara kerjanya dibahas di halaman berikutnya.");
  });
  test("kartu Cek diri: tiga kartu t5-m48, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-m48");
    expect(k.map((x) => x.id)).toEqual(["t5-m48-1", "t5-m48-2", "t5-m48-3"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    k.forEach((x, i) => expect(jawaban[i]).toContain(x.jawab));
    for (const x of k) { expect(x.url).toBe("tahap-5/m48-angsuran-dua-kali/"); expect(x.judul).toBe(`5.20 ${dari("t5-m48").judul}`); }
    expect(jawaban[0]).toContain("(`crash.txt` bagian A)");
    expect(jawaban[0]).toContain(`saldo Budi turun dari ${rp(saldoAwal)} ke ${rp(angka(saldoA[1]!))}`);
    expect(jawaban[1]).toContain("(`serentak.txt` bagian C)");
    expect(jawaban[1]).toContain("(`crash.txt` bagian A)");
    expect(jawaban[2]).toContain("lebih dari 24 jam sesudah percobaan pertama");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 2: kunci kalimat dan sidik (dibangkitkan dari berkas saat ini oleh PERBARUI_KUNCI=1)
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "membantu", "menunggu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lama", "lebih", "dilewati", "habis", "kedaluwarsa", "referensi", "jurnal", "key", "sebaiknya", "kadang"];
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
const kartuT5m48 = kartuSemua.filter((x) => x.halaman === "t5-m48");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-03/g) ?? []).length, tanggal: (halaman.match(/2026-11-03/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  riset: ["R5-205", "R5-206", "R5-207", "R5-208", "R5-209"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m48)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m48) },
};

describe("penutup celah mutasi tanpa kunci: lingkup, definisi di pemakaian pertama, atribusi, dan label", () => {
  test("label 'Tidak dijalankan: dibaca dari kode lab' hanya untuk kalimat kode lab; dokumentasi Kubernetes berlabel Tidak dijalankan dengan tanggal buka", () => {
    expect(jumlah(badan, "(Tidak dijalankan: dibaca dari kode lab)")).toBe(4);
    expect(jumlah(badan, "(Tidak dijalankan: dibaca dari migrasi lab)")).toBe(1);
    expect(jumlah(badan, `dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(2);
    expect(jumlah(badan, "Tidak dijalankan")).toBe(8);
    expect(jumlah(badan, "(Ilustrasi)")).toBe(5);
    expect(jumlah(badan, "(Hitungan atas Asumsi)")).toBe(1);
    expect(jumlah(badan, "(Asumsi)")).toBe(1);
    expect(jumlah(badan, "(Asumsi naskah)")).toBe(1);
  });
  test("klaim universal: tak ada 'selalu', 'setiap', 'tidak pernah', 'hanya di'; 'semua' dan 'hanya' hanya di kalimat berlingkup yang terkunci", () => {
    const kalimat = badan.replace(/<noscript>[\s\S]*?<\/noscript>/, "").split(/(?<=[.!?])\s+/);
    for (const k of ["selalu", "setiap", "tidak pernah", "hanya di", "tak satu pun", "tidak satu pun"]) expect(kalimat.filter((s) => s.toLowerCase().includes(k)), k).toEqual([]);
    const semua = kalimat.filter((s) => /\bsemua\b/i.test(s));
    expect(semua.map((s) => s.trim())).toEqual(["Batch harian adalah satu putaran job cicilan, program terjadwal yang menagih semua angsuran jatuh tempo."]);
    const hanya = kalimat.filter((s) => /\bhanya\b/i.test(s)).map((s) => s.trim().replace(/\s+/g, " "));
    expect(hanya).toEqual([
      "**Yang dilakukan job per angsuran.** Di versi pertama, penahan jurnal kedua hanya Idempotency-Key (Tidak dijalankan: dibaca dari kode lab).",
      "Batch versi pertama tidak bisa diulang kapan saja dengan hasil yang sama, karena key hanya hidup 24 jam.",
      "**Versi pertama tidak punya status antara.** Angsuran yang berhasil hanya berstatus `menunggu` lalu `dicatat`.",
      "Angka 667 detik hanya Hitungan atas Asumsi.",
      "Widget ini hanya menunjukkan bahwa satu hal berbeda mengubah jumlah jurnal.",
      "### Cek diri **1.** Batch diulang 23 jam sesudah mati dan hanya ada satu jurnal.",
      "Key tidak rusak: ia memang hanya hidup 24 jam.",
    ]);
    expect(kalimat.filter((s) => /paling banyak/i.test(s)).length).toBe(1);
  });
  test("tebakan skenario dan jawaban tebak dulu tidak membuka varian: widget tidak menyebut 'Tebakanmu', dan jalur varian tidak memuat penjelasan jalur utama", () => {
    for (const l of skenario.varian.langkah) expect(l.jelas).not.toContain("Tebakanmu");
    expect(skenario.predict.explain).toContain("Rekaman crash.txt bagian A.");
    expect(skenario.predict.explain).not.toContain("bagian B");
    expect(skenario.predict.explain).not.toContain("referensi");
  });
  test("Cek diri: jawaban 1 sampai 3 memuat sumber rekaman, dan jawaban 3 tidak mengklaim ADR 54 sudah ditulis", () => {
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban[0]).toContain("(`crash.txt` bagian A)");
    expect(jawaban[1]).toContain("(`serentak.txt` bagian C)");
    expect(jawaban[2]).not.toMatch(/ADR 54 (menulis|memuat|mengubah)/);
    expect(jawaban[2]).toContain("ADR 14 menulis keputusannya salah saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama.");
  });
  test("tiga baris pertama Konsep yang lahir menyebut ADR 54 dan ADR 14 tanpa klaim sudah terbit; ADR 54 memang ada di naskah", () => {
    expect(badan).toContain("Keputusannya ADR 54.");
    expect(badan).not.toMatch(/ADR 54 (menulis|memuat|memilih)/);
    expect(naskah).toContain("| 54 |");
  });
});

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m48-angsuran-dua-kali.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m48-angsuran-dua-kali.halaman.nilai.ts"), isi);
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
    expect(sidikSekarang.label.rekamanLab).toBe(9);
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
