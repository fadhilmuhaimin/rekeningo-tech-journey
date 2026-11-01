// Penjaga halaman 5.3 (keputusan 1508 sampai 1510): jumlah dan nama tabel, kolom baru, nilai jenis, foreign key, pembagian
// service, partisi posting, rumus ukuran data, label sumber, tautan, dan klaim negatif di skema-data.mdx, diagram
// t5-skema-inti.json, dan tebakan t5-skema-tebak.json. Nilainya diturunkan dari ERD Tahap 4 dan 5 (situs/data/erd), pembagian
// service (service-tahap-5.json), rekaman labs/api-t5 dan labs/t5-partisi, kode lab, registry (cerita.json), naskah Tahap 2
// dan 5, dan baris riset R5-120 sampai R5-124. Halaman dibandingkan dengan templat
// (skema-data-t5.halaman.harapan.txt) yang kuncinya {{NAMA}} diisi dari nilai turunan di sini: angka, daftar nama, SQLSTATE,
// dan rentang Snippet datang dari sumber, dan kalimat yang tidak punya sumber untuk diturunkan ditulis apa adanya di templat
// (kunci kalimat). Tanpa tes ini, mengubah satu angka, satu nama, satu SQLSTATE, satu label, satu tautan, atau satu klaim
// negatif di halaman ini tidak menggagalkan build atau alat ukur mana pun.
// Tes hanya membaca berkas yang dilacak git (bukan hasil build atau binari lokal, pelajaran 3.2).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok } from "./blok";
import { DataTebak } from "../widgets/tebak/skema";

const akar = path.resolve(__dirname, "../../..");
const terlacak = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: akar, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean),
);
const baca = (rel: string): string => {
  if (!terlacak.has(rel)) throw new Error(`${rel} tidak dilacak git: tes tidak boleh membaca hasil build atau berkas lokal`);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const bacaJson = <T>(rel: string): T => JSON.parse(baca(rel)) as T;

// ---- sumber -------------------------------------------------------------------------------------------------------------
const HALAMAN_MDX = "situs/src/content/docs/tahap-5/skema-data.mdx";
const mdx = baca(HALAMAN_MDX);
const templat = baca("situs/src/lib/skema-data-t5.halaman.harapan.txt");
const naskah5 = baca("plan/CERITA-TAHAP-5.md");
const naskah2 = baca("plan/CERITA-TAHAP-2.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const risetBaris = riset.split("\n");
const rantaiMentah = bacaJson<unknown>("situs/data/diagram/t5-skema-inti.json");
const tebakMentah = bacaJson<unknown>("situs/data/widget/t5-skema-tebak.json");
const skemaTxt = baca("labs/api-t5/output/skema.txt").split("\n");
const pasangTxt = baca("labs/t5-partisi/output/pasang.txt").split("\n");
const lepasTxt = baca("labs/t5-partisi/output/lepas.txt");
const lepasPy = baca("labs/t5-partisi/lepas.py");
const readmeApi = baca("labs/api-t5/README.md");
const readmePartisi = baca("labs/t5-partisi/README.md");
const mig000024 = baca("labs/api-t5/migrasi/000024_posting_partisi.up.sql");
const mig000026 = baca("labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql").split("\n");
const halamanIdempotency = baca("situs/src/content/docs/tahap-2/retry-idempotency.mdx");
const halamanT4Skema = baca("situs/src/content/docs/tahap-4/skema-data.mdx");

interface Fk { nama: string; kolom: string[]; ke_tabel: string; ke_kolom: string[] }
interface Tabel {
  nama: string;
  kolom: { nama: string; tipe: string; wajib: boolean }[];
  pk: string[];
  fk: Fk[];
  unik: { nama: string; kolom: string[] }[];
  cek: { nama: string; kolom: string[]; ekspresi: string }[];
  partisi?: { kunci: string; anak: string[] };
}
interface Erd {
  tahap: number;
  sumber: { file: string[] };
  tabel: Tabel[];
  selisih: {
    terhadap: number;
    tabel_baru: string[];
    tabel_dihapus: string[];
    kolom_baru: { tabel: string; kolom: string }[];
    kolom_dihapus: unknown[];
    kolom_berubah: unknown[];
    aturan_berubah: { tabel: string; jenis: string; nama: string; ubah: string }[];
  };
}
interface Layanan { tahap: number; istilah: string; modul: { nama: string; schema: string; tabel: string[] }[]; lintas: unknown[] }
const erd4 = bacaJson<Erd>("situs/data/erd/tahap-4.json");
const erd5 = bacaJson<Erd>("situs/data/erd/tahap-5.json");
const layanan = bacaJson<Layanan>("situs/data/erd/service-tahap-5.json");
const modul4 = bacaJson<{ modul: { nama: string }[]; lintas: unknown[] }>("situs/data/erd/modul-tahap-4.json");

interface H { id: string; judul: string; tahap: number; jenis?: string; bagian?: number | string; nomor?: string; ada?: boolean; prasyarat?: string[]; menit?: number; inti?: boolean; peran?: string[]; lab?: string[]; path: string; label?: string }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const a4 = cerita.tahap[3]!.asumsi as { user: number; aktif: number };
const a5 = cerita.tahap[4]!.asumsi as { user: number; aktif: number; trx: number; baris: number; upload: number; fileKB: number };

// ---- bentuk angka --------------------------------------------------------------------------------------------------------
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas"];
const W = (n: number): string => KATA[n] ?? String(n);
const K = (n: number): string => W(n)[0]!.toUpperCase() + W(n).slice(1);
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (x: number, d: number): string => x.toFixed(d).replace(".", ",");
// Dua angka bermakna: 43,8 -> 44; 438 -> 440; 4,38 -> 4,4.
const dua = (x: number): number => {
  const f = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / f) * f;
};
const duaKoma = (x: number): string => String(Number(dua(x).toPrecision(3))).replace(".", ",");
const bt = (a: string[]): string[] => a.map((x) => `\`${x}\``);
const btDan = (a: string[]): string => `${bt(a).slice(0, -1).join(", ")}, dan ${bt(a).at(-1)}`;
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));

// ---- turunan dari ERD dan pembagian service -------------------------------------------------------------------------------
const N4 = erd4.tabel.length;
const N5 = erd5.tabel.length;
const BARU = erd5.selisih.tabel_baru;
const KBARU = erd5.selisih.kolom_baru;
const fkSemua = (e: Erd) => e.tabel.flatMap((t) => t.fk.map((f) => ({ dari: t.nama, ...f })));
const FK4 = fkSemua(erd4).length;
const FK5 = fkSemua(erd5).length;
const kunciFk = (f: { dari: string; kolom: string[]; ke_tabel: string }): string => `${f.dari}(${f.kolom.join(",")})->${f.ke_tabel}`;
const set4 = new Set(fkSemua(erd4).map(kunciFk));
const set5 = new Set(fkSemua(erd5).map(kunciFk));
const FK_HILANG = fkSemua(erd4).filter((f) => !set5.has(kunciFk(f)));
const FK_BARU_DAFTAR = fkSemua(erd5).filter((f) => !set4.has(kunciFk(f)));
const nonFk = new Set([...KBARU.map((k) => k.tabel), ...erd5.selisih.aturan_berubah.filter((a) => a.jenis !== "fk").map((a) => a.tabel)]);
const fkSaja = new Set(erd5.selisih.aturan_berubah.filter((a) => a.jenis === "fk" && !nonFk.has(a.tabel)).map((a) => a.tabel));
const TETAP = erd5.tabel.map((t) => t.nama).filter((n) => !BARU.includes(n) && !nonFk.has(n) && !fkSaja.has(n));
const NONFK = [...nonFk].sort();
const NBERUBAH = nonFk.size + fkSaja.size;
const posting5 = erd5.tabel.find((t) => t.nama === "posting")!;
const AWALAN = layanan.modul[0]!.schema.slice(0, layanan.modul[0]!.schema.indexOf(layanan.modul[0]!.nama));
const svcDari = (tabel: string): string => layanan.modul.find((m) => m.tabel.includes(tabel))!.nama;

// ---- turunan dari rekaman ----------------------------------------------------------------------------------------------
const bagianRekaman = (baris: string[], kode: string): string[] => {
  const a = baris.findIndex((b) => b.startsWith(`# --- ${kode}. `));
  if (a < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const z = baris.findIndex((b, i) => i > a && b.startsWith("# --- "));
  return baris.slice(a, z < 0 ? undefined : z);
};
const E = bagianRekaman(skemaTxt, "E");
const FK_REKAMAN = E.flatMap((b) => {
  const m = b.match(/^ {2}(\w+)\.(\w+) -> (\w+)\.(\w+)$/);
  return m ? [{ dariSvc: m[1]!, dariTabel: m[2]!, keSvc: m[3]!, keTabel: m[4]! }] : [];
});
const hitungSvc = (kunci: "dariSvc" | "keSvc", svc: string): number => FK_REKAMAN.filter((f) => f[kunci] === svc).length;
const nilaiKolom = (baris: string[], kolom: string): number => {
  const i = baris.findIndex((b) => new RegExp(`^ ${kolom}$`).test(b));
  if (i < 0) throw new Error(`rekaman: kolom ${kolom} tidak ada`);
  return Number(baris[i + 2]!.trim());
};
const FK_LINTAS_REK = nilaiKolom(E, "fk_lintas_schema");
const FK_DALAM_REK = nilaiKolom(E, "fk_di_dalam_schema");
const sqlstateSetelah = (baris: string[], pola: RegExp, dari = 0): string => {
  const i = baris.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan`);
  const s = baris.slice(i).find((b) => /-- SQLSTATE \w{5}/.test(b));
  return s!.match(/SQLSTATE (\w{5})/)![1]!;
};
const D = bagianRekaman(skemaTxt, "D");
const F = bagianRekaman(skemaTxt, "F");
const S_PK = sqlstateSetelah(D, /CREATE TEMP TABLE coba_partisi/);
const S_NOPART = sqlstateSetelah(D, /INSERT INTO posting \(jurnal_id, buku_id, jumlah, dibuat\) SELECT min\(id\), min\(id\), 5, now\(\) \+ interval '5 years'/);
const S_LEDGER = sqlstateSetelah(D, /UPDATE posting SET jumlah = jumlah \+ 1/);
const S_DITOLAK = sqlstateSetelah(F, /^t5_ledger: SELECT nama FROM t5_akun\.akun LIMIT 1$/);
const barisTertentu = (baris: string[], awal: RegExp, akhir: RegExp): [number, number] => {
  const a = baris.findIndex((b) => awal.test(b));
  const z = baris.findIndex((b, i) => i > a && akhir.test(b));
  if (a < 0 || z < 0) throw new Error(`rentang ${awal} .. ${akhir} tidak ditemukan`);
  return [a + 1, z + 1];
};
const R_PARTISI = barisTertentu(skemaTxt, /^=> SELECT pg_get_partkeydef\('posting'::regclass\)/, /^\(4 rows\)$/);
const R_PK = barisTertentu(skemaTxt, /^=> CREATE TEMP TABLE coba_partisi/, /^ {3}-- SQLSTATE 0A000$/);
const R_MIG = barisTertentu(mig000026, /^ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;$/, /ADD CONSTRAINT referensi_bentuk CHECK/);
const nomorMigrasi = (e: Erd, lab: string): string[] => e.sumber.file.filter((f) => f.startsWith(`labs/${lab}/migrasi/`)).map((f) => f.match(/migrasi\/(\d{6})_/)![1]!).sort();
const MIG4 = nomorMigrasi(erd4, "api-t4").at(-1)!;
const MIG5 = nomorMigrasi(erd5, "api-t5");
const BARIS_LEPAS = Number(lepasPy.match(/harap\(baris_delete, ([\d_]+),/)![1]!.replace(/_/g, ""));
const FAKTOR = Number(lepasPy.match(/> (\d) \* min\(p\[1\] for p in percobaan\)/)![1]);
const PERCOBAAN = 1 + (lepasPy.match(/for k in \((\d(?:, \d)*)\)\]/)![1]!.split(", ").length);

// ---- turunan dari naskah dan registry ------------------------------------------------------------------------------------
const TRX_DASAR = Number(naskah5.match(/Transaksi uang (\d) per user aktif per hari mengikuti naskah Tahap 2 sampai 4/)![1]);
const TRX_REG = a5.trx;
const RUMUS = naskah5.match(/\*Posting per tahun = transaksi per hari × (\d) × (\d+)\*, ±(\d+) byte per posting termasuk index/)!;
const POSTING_PER_TRX = Number(RUMUS[1]);
const HARI = Number(RUMUS[2]);
const BYTE_POSTING = Number(RUMUS[3]);
const BYTE_REG = a5.baris;
const aktif = (a: { user: number; aktif: number }): number => (a.user * a.aktif) / 100;
const posting = (a: { user: number; aktif: number }, trx: number): number => aktif(a) * trx * POSTING_PER_TRX * HARI;
const ENAM = naskah2.match(/^\| 6 \(proyeksi\) \| (\d+) juta \| (per negara) \| `posting` ±([\d,]+) miliar \| ±(\d+) TB \|/m)!;
const U6 = Number(ENAM[1]) * 1e6;
const a6 = { user: U6, aktif: a5.aktif };
const TAHAP_AKHIR = 6;
const U5 = a5.user;
const AKTIF5 = aktif(a5);
const P4 = posting(a4, TRX_DASAR);
const P5 = posting(a5, TRX_DASAR);
const P5_T2 = posting(a5, TRX_REG);
const P6 = posting(a6, TRX_DASAR);
const BYTE5 = P5 * BYTE_POSTING;
const GB = (b: number): number => b / 1e9;
const GB_REG2 = GB(AKTIF5 * TRX_REG * HARI * BYTE_REG);
const GB_REG3 = GB(AKTIF5 * TRX_DASAR * HARI * BYTE_REG);
const TB6 = (P6 * BYTE_POSTING) / 1e12;
const BATAS_TB = Number(riset.match(/relation size 32 TB dengan BLCKSZ bawaan (\d+) bytes/) ? "32" : NaN);
const BLOK_KB = Number(riset.match(/relation size 32 TB dengan BLCKSZ bawaan (\d+) bytes/)![1]) / 1024;
const BATAS_GB = BATAS_TB * 1000;
const RING = naskah5.match(/`ringkasan_merchant_harian` ([\d.]+) × (\d+) × (\d+) B = ([\d,]+) GB per tahun/)!;
const SNAP = naskah5.match(/1\.200\.000 buku \(1\.000\.000 user \+ 200\.000 merchant\) × (\d+) × (\d+) B \(Asumsi\) \| (\d+) MB per tahun/)!;
const ANG = naskah5.match(/`angsuran` ([\d.]+) jadwal × (\d+) angsuran per tahun = ([\d,]+) juta baris/)!;
const OB = naskah5.match(/\| ([\d.]+) × 365 × (\d+) B \| ([\d,]+) GB per tahun tanpa pembersihan, dan ([\d,]+) GB dengan retensi (\d+) hari \|/)!;
const TOPUP_RASIO = naskah5.match(/aktif × (0,\d+) ÷ 86\.400 × puncak \| ([\d.]+) per hari/)!;
const RING_HARI = num(RING[1]!);
const BYTE_RINGKASAN = Number(RING[3]);
const BULAN = Number(SNAP[1]);
const BYTE_SNAPSHOT = Number(SNAP[2]);
const BUKU_SNAPSHOT = (U5 + RING_HARI) ;
const JADWAL = num(ANG[1]!);
const ANGSURAN_TAHUN = Number(ANG[2]);
const OUTBOX_HARI = num(OB[1]!);
const BYTE_OUTBOX = Number(OB[2]);
const RETENSI = Number(OB[5]);
const TOPUP_HARI = AKTIF5 * num(TOPUP_RASIO[1]!);
const OUTBOX_GB = (OUTBOX_HARI * HARI * BYTE_OUTBOX) / 1e9;
const OUTBOX_RET_GB = (OUTBOX_HARI * RETENSI * BYTE_OUTBOX) / 1e9;
const FILE_GB = (a5.upload * a5.fileKB * HARI) / 1e6;
const TRX_HARI5 = AKTIF5 * TRX_DASAR;
const BACA = per("t5-skema").menit! - 3;
const COBA = 3;

// Naskah 3b: tabel "Apa yang berubah dan kenapa" (empat belas baris) dan selisih yang tertulis di rekaman.
const barisNaskah = ((): string[][] => {
  const a = naskah5.split("\n");
  const i = a.findIndex((b) => b.startsWith("| Tahap 4 | Tahap 5 | Alasan | Masalah atau syarat |"));
  const isi: string[][] = [];
  for (let k = i + 2; k < a.length && a[k]!.startsWith("|"); k++) isi.push(a[k]!.split(" | ").map((c) => c.replace(/^\| /, "").replace(/ \|$/, "")));
  return isi;
})();
const SELISIH_REKAMAN = ((): number => {
  const a = skemaTxt.findIndex((b) => b.startsWith("# Selisih dengan naskah, skema lab yang benar:"));
  const z = skemaTxt.findIndex((b, i) => i >= a && b.endsWith("dari sequence."));
  return (skemaTxt.slice(a, z + 1).join(" ").match(/\([1-9]\) [a-z]/gi) ?? []).length;
})();
const SELISIH_LAIN = [E.some((b) => /^# Tahap 4 menghitung 21 foreign key/.test(b)), /Nama schema dan role berawalan `t5_`/.test(readmeApi)].filter(Boolean).length;
const SELISIH = SELISIH_REKAMAN + SELISIH_LAIN;
const FK_LINTAS_T4 = modul4.lintas.length;
const ERD_NASKAH = execFileSync("python3", ["tools/erd.py", "--naskah", "5"], { cwd: akar, encoding: "utf8" }).trim();

const baruTeks = (tabel: string): string => bt([tabel])[0]!;
const TABEL_SERVICE = layanan.modul
  .map((m) => `| \`${m.nama}\` | ${bt(m.tabel).join(", ")} | ${m.tabel.length} | ${hitungSvc("dariSvc", m.nama)} |`)
  .join("\n");
const kolomBaruTeks = ((): string => {
  const urut: string[] = [];
  for (const k of KBARU) if (!urut.includes(k.tabel)) urut.push(k.tabel);
  const bagian = urut.map((t) => `\`${t}\` (${bt(KBARU.filter((k) => k.tabel === t).map((k) => k.kolom)).join(", ")})`);
  return `${bagian.slice(0, -1).join(", ")} dan ${bagian.at(-1)}`;
})();
const FK_BARU_LIST = ((): string => {
  const a = FK_BARU_DAFTAR.map((f) => `\`${f.dari}\` ke \`${f.ke_tabel}\``);
  return `${a.slice(0, -1).join(", ")}, dan ${a.at(-1)}`;
})();
const BARIS_TUMBUH = [
  `| 4 | ${titik(a4.user)} | ${a4.aktif}% | ${N4}, dibagi per modul | \`posting\` ±${duaKoma(P4 / 1e6)} juta | ±${duaKoma(GB(P4 * BYTE_POSTING))} GB |`,
  `| 5 | ${titik(U5)} | ${a5.aktif}% | ${N5}, dibagi per service | \`posting\` ±${duaKoma(P5 / 1e6)} juta, dipartisi per bulan | ±${duaKoma(GB(BYTE5))} GB |`,
  `| ${TAHAP_AKHIR} (proyeksi) | ${titik(U6)} | ${a6.aktif}% | ${ENAM[2]} | \`posting\` ±${duaKoma(P6 / 1e9)} miliar | ±${ENAM[4]} TB |`,
].join("\n");
const BARIS_TIGA = [
  `| Rumus registry dengan ${TRX_REG} transaksi | ${titik(AKTIF5)} × ${TRX_REG} × ${HARI} × ${BYTE_REG} byte, satu baris per transaksi | ±${koma(GB_REG2, 1)} GB | Asumsi |`,
  `| Rumus registry dengan ${TRX_DASAR} transaksi | ${titik(AKTIF5)} × ${TRX_DASAR} × ${HARI} × ${BYTE_REG} byte, satu baris per transaksi | ±${koma(GB_REG3, 1)} GB | Asumsi |`,
  `| Rumus ledger dengan ${TRX_DASAR} transaksi (halaman ini) | ${titik(P5)} posting × ${BYTE_POSTING} byte | ±${koma(GB(BYTE5), 1)} GB | Asumsi |`,
].join("\n");
const BARIS_KECIL = [
  `| \`ringkasan_merchant_harian\` | ${titik(RING_HARI)} × ${HARI} × ${BYTE_RINGKASAN} byte | ±${koma(GB(RING_HARI * HARI * BYTE_RINGKASAN), 1)} GB | Asumsi (satu baris per merchant per hari) |`,
  `| \`snapshot_saldo\` | ${titik(BUKU_SNAPSHOT)} × ${BULAN} × ${BYTE_SNAPSHOT} byte | ±${(BUKU_SNAPSHOT * BULAN * BYTE_SNAPSHOT) / 1e6} MB | Asumsi (${titik(U5)} user dan ${titik(RING_HARI)} merchant, satu snapshot per bulan) |`,
  `| \`angsuran\` | ${titik(JADWAL)} × ${ANGSURAN_TAHUN} | ${koma((JADWAL * ANGSURAN_TAHUN) / 1e6, 1)} juta baris | Asumsi (${titik(JADWAL)} jadwal aktif, ${(JADWAL / U5) * 100}% user, ${ANGSURAN_TAHUN} angsuran per tahun) |`,
  `| \`outbox\` tanpa pembersihan | ${titik(OUTBOX_HARI)} × ${HARI} × ${BYTE_OUTBOX} byte | ±${koma(OUTBOX_GB, 1)} GB | Asumsi (${titik(TRX_HARI5)} transaksi uang dan ${titik(TOPUP_HARI)} top-up per hari) |`,
  `| \`outbox\` dengan retensi ${RETENSI} hari | ${titik(OUTBOX_HARI)} × ${RETENSI} × ${BYTE_OUTBOX} byte | ±${koma(OUTBOX_RET_GB, 3)} GB | Asumsi |`,
].join("\n");

const NILAI: Record<string, string> = {
  K_BARU_CAP: K(BARU.length),
  K_BARU: W(BARU.length),
  N4: String(N4),
  N5: String(N5),
  K_SVC: W(layanan.modul.length),
  K_MODUL4: W(modul4.modul.length),
  TAHAP_AKHIR: String(TAHAP_AKHIR),
  BACA: String(BACA),
  COBA: String(COBA),
  BARU_LIST: btDan(BARU),
  K_KOLOM_BARU_CAP: K(KBARU.length),
  KOLOM_BARU_TEKS: kolomBaruTeks,
  POSTING5_JUTA: duaKoma(P5 / 1e6),
  FK_LINTAS_T4: String(FK_LINTAS_T4),
  MIG4,
  MIG5A: MIG5[0]!,
  MIG5Z: MIG5.at(-1)!,
  K_PERUBAHAN: W(barisNaskah.length),
  K_TETAP_CAP: K(TETAP.length),
  TETAP_LIST: btDan(TETAP),
  K_NONFK_CAP: K(NONFK.length),
  NONFK_LIST: btDan(NONFK),
  K_FKSAJA_CAP: K(fkSaja.size),
  K_BERUBAH_CAP: K(NBERUBAH - 10),
  R_MIG: `${R_MIG[0]}:${R_MIG[1]}`,
  R_PARTISI: `${R_PARTISI[0]}:${R_PARTISI[1]}`,
  R_PK: `${R_PK[0]}:${R_PK[1]}`,
  K_PARTISI_KE: "ke" + W(posting5.partisi!.anak.length),
  PART0: posting5.partisi!.anak[0]!,
  PART_SEBELUM: posting5.partisi!.anak.find((n) => n.endsWith("sebelum"))!,
  S_NOPART,
  S_LEDGER,
  S_DITOLAK,
  S_PK,
  JUMLAH_SVC_LIST: `${layanan.modul.slice(0, -1).map((m) => m.tabel.length).join(", ")}, dan ${layanan.modul.at(-1)!.tabel.length}`,
  TABEL_SERVICE,
  AWALAN,
  FK4: String(FK4),
  FK5: String(FK5),
  FK_HAPUS: String(FK_HILANG.length),
  FK_BARU: String(FK_BARU_DAFTAR.length),
  K_FK_BARU_CAP: K(FK_BARU_DAFTAR.length),
  FK_BARU_LIST,
  KE_AKUN_CAP: K(hitungSvc("keSvc", "akun")),
  KE_AKUN: String(hitungSvc("keSvc", "akun")),
  KE_LEDGER: String(hitungSvc("keSvc", "ledger")),
  KE_NOTIF: String(hitungSvc("keSvc", "notifikasi")),
  FK_LINTAS_REK: String(FK_LINTAS_REK),
  FK_DALAM_REK: String(FK_DALAM_REK),
  ERD_NASKAH,
  K_SELISIH: W(SELISIH),
  TRX_DASAR: String(TRX_DASAR),
  TRX_REG: String(TRX_REG),
  POSTING_PER_TRX: String(POSTING_PER_TRX),
  K_POSTING_PER_TRX: W(POSTING_PER_TRX),
  HARI: String(HARI),
  BYTE_POSTING: String(BYTE_POSTING),
  BYTE_REG: String(BYTE_REG),
  BYTE_LEDGER_TRX: String(POSTING_PER_TRX * BYTE_POSTING),
  BARIS_TUMBUH,
  BARIS_TIGA,
  BARIS_KECIL,
  U5: titik(U5),
  A5: String(a5.aktif),
  AKTIF5: titik(AKTIF5),
  TRX_HARI5: titik(TRX_HARI5),
  POSTING5: titik(P5),
  POSTING4: titik(P4),
  POSTING6: titik(P6),
  POSTING5_T2: titik(P5_T2),
  BYTE5: titik(BYTE5),
  GB5: koma(GB(BYTE5), 1),
  GB5_DUA: duaKoma(GB(BYTE5)),
  GB5_T2: koma(GB(P5_T2 * BYTE_POSTING), 1),
  GB_REG2: koma(GB_REG2, 1),
  GB_REG3: koma(GB_REG3, 1),
  TB6_SATU: koma(TB6, 1),
  TB6_DUA: ENAM[4]!,
  RASIO45: koma(P5 / P4, 1),
  RASIO56: koma(P6 / P5, 1),
  RASIO_TRX: koma(TRX_DASAR / TRX_REG, 1),
  RASIO_BYTE: koma((POSTING_PER_TRX * BYTE_POSTING) / BYTE_REG, 2),
  RASIO_TERBESAR: koma(Number(koma(GB(BYTE5), 1).replace(",", ".")) / Number(koma(GB_REG2, 1).replace(",", ".")), 1),
  BATAS_TB: String(BATAS_TB),
  BLOK_KB: String(BLOK_KB),
  BATAS_GB: titik(BATAS_GB),
  TAHUN_BATAS: String(Math.round(BATAS_GB / Number(koma(GB(BYTE5), 1).replace(",", ".")))),
  BARIS_LEPAS: titik(BARIS_LEPAS),
  K_PERCOBAAN: W(PERCOBAAN),
  K_FAKTOR: W(FAKTOR),
  BYTE_RINGKASAN: String(BYTE_RINGKASAN),
  BYTE_SNAPSHOT: String(BYTE_SNAPSHOT),
  TOPUP_RASIO: TOPUP_RASIO[1]!,
  TOPUP_HARI: titik(TOPUP_HARI),
  UPLOAD: titik(a5.upload),
  FILE_KB: String(a5.fileKB),
  FILE_GB: titik(FILE_GB),
  OUTBOX_HARI: titik(OUTBOX_HARI),
  BYTE_OUTBOX: String(BYTE_OUTBOX),
  OUTBOX_GB: koma(OUTBOX_GB, 1),
  OUTBOX_RET_GB: koma(OUTBOX_RET_GB, 3),
  RETENSI: String(RETENSI),
};
const isi = (t: string): string =>
  t.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k: string) => {
    if (!(k in NILAI)) throw new Error(`templat memakai kunci tanpa nilai: ${k}`);
    return NILAI[k]!;
  });
const HARAPAN = isi(templat);

// ---- diagram Rantai dan tebakan yang diharapkan --------------------------------------------------------------------------------
const RANTAI_SUMBER = {
  id: "t5-skema-inti",
  judul: "Skema Tahap 4 ke Tahap 5: tabel dan foreign key",
  sumber: { jenis: "rekaman", teks: "Rekaman lab api-t5: skema.txt bagian A dan E" },
  baris: [
    {
      label: "Tabel",
      sub: "dari ERD lab",
      simpul: [
        { teks: `${N4} tabel`, sub: "akhir Tahap 4", nada: "old" },
        { teks: `+ ${BARU.length} tabel`, sub: "tak ada yang dihapus", nada: "system" },
        { teks: `${N5} tabel`, sub: `${W(layanan.modul.length)} service`, nada: "good" },
      ],
    },
    {
      label: "Foreign key",
      sub: "dari katalog",
      simpul: [
        { teks: String(FK4), sub: "foreign key Tahap 4", nada: "old" },
        { teks: `− ${FK_HILANG.length}, + ${FK_BARU_DAFTAR.length}`, sub: `${FK_HILANG.length} dihapus, ${FK_BARU_DAFTAR.length} baru`, nada: "system" },
        { teks: String(FK5), sub: "di dalam satu service", nada: "good" },
      ],
    },
  ],
  catatan: `Abu-abu: Tahap 4. Biru: yang berubah. Hijau: hasilnya. Jumlah foreign key dibaca dari katalog di rekaman, dan ${FK4} − ${FK_HILANG.length} + ${FK_BARU_DAFTAR.length} = ${FK5} adalah Hitungan di halaman. Tabel uang tetap tiga, dan posting dipartisi per bulan.`,
};
const TEBAK = {
  id: "t5-skema-tebak",
  judul: "PRIMARY KEY tabel posting yang dipartisi",
  sumber: {
    jenis: "rekaman",
    teks: "labs/api-t5/output/skema.txt bagian C dan D; ERD dari situs/data/erd/tahap-5.json; dokumentasi PostgreSQL 17 bagian 5.12.2.3",
  },
  adegan: [
    "Raka mempartisi posting per bulan menurut kolom dibuat, supaya bulan lama bisa dilepas dari database utama.",
    "PRIMARY KEY tabelnya masih id saja, seperti di Tahap 4. Ia menjalankan CREATE TABLE dengan PARTITION BY RANGE (dibuat).",
  ],
  pertanyaan: "Apa jawaban PostgreSQL?",
  pilihan: [
    {
      teks: "Diterima. id tetap unik di semua bulan karena PostgreSQL membuat satu index untuk seluruh tabel.",
      benar: false,
      alasan: "PostgreSQL menolaknya. Index yang membentuk PRIMARY KEY dibuat per partisi, dan masing-masing hanya menegakkan keunikan di dalam partisinya sendiri (dokumentasi PostgreSQL 17, bagian 5.12.2.3).",
    },
    {
      teks: "Diterima, tetapi id hanya dijaga unik di dalam tiap bulan.",
      benar: false,
      alasan: `Constraint seperti itu tidak bisa dibuat. Lab merekam PRIMARY KEY pada id di tabel dengan PARTITION BY RANGE (dibuat) ditolak dengan SQLSTATE ${S_PK}.`,
    },
    {
      teks: "Ditolak: tabel yang dipartisi tidak boleh punya PRIMARY KEY sama sekali.",
      benar: false,
      alasan: `Boleh punya, asalkan PRIMARY KEY memuat kolom kunci partisi. Tabel posting di lab memakai PRIMARY KEY (${posting5.pk.join(", ")}).`,
    },
    {
      teks: `Ditolak: PRIMARY KEY harus memuat kolom kunci partisi, jadi posting memakai (${posting5.pk.join(", ")}).`,
      benar: true,
      alasan: `Pesan lab: unique constraint on partitioned table must include all partitioning columns (SQLSTATE ${S_PK}). Akibatnya id sendiri tidak lagi dijaga unik lintas bulan oleh constraint. Di lab, keunikannya datang dari sequence posting_id_seq.`,
    },
  ],
  penutup: `Partisi per bulan mengubah PRIMARY KEY posting menjadi (${posting5.pk.join(", ")}). Di antara tabel Tahap 4, hanya posting yang PRIMARY KEY-nya berubah di Tahap 5.`,
  label: { sumber: "Rekaman lab · skema.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" },
};

// ---- tes ----------------------------------------------------------------------------------------------------------------------
const RANTAI = {
  ...RANTAI_SUMBER,
  baris: RANTAI_SUMBER.baris.map((b) => ({ ...b, simpul: b.simpul.map((s) => ({ ...s, kode: false })) })),
};
describe("isi halaman 5.3 dibangun dari sumber", () => {
  test("skema-data.mdx sama persis dengan templat yang diisi dari ERD, rekaman, kode lab, registry, dan naskah", () => {
    expect(mdx.split("\n")).toEqual(HARAPAN.split("\n"));
  });
  test("templat memakai semua kunci nilai, dan nilai tidak memuat sisa kunci", () => {
    const dipakai = new Set([...templat.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]!));
    expect([...Object.keys(NILAI)].filter((k) => !dipakai.has(k))).toEqual([]);
    expect(HARAPAN).not.toMatch(/\{\{|\}\}/);
    expect(Object.values(NILAI).every((v) => v !== "NaN" && v !== "undefined" && v !== "")).toBe(true);
  });
  test("diagram Rantai sama dengan nilai turunan, dan lolos skema Zod", () => {
    expect(rantaiMentah).toEqual(RANTAI_SUMBER);
    expect(DataRantai.parse(rantaiMentah)).toEqual(RANTAI);
  });
  test("tebakan sama dengan nilai turunan, lolos skema Zod, satu jawaban benar di pilihan keempat", () => {
    expect(tebakMentah).toEqual(TEBAK);
    const t = DataTebak.parse(tebakMentah);
    expect(t.pilihan.map((p) => p.benar)).toEqual([false, false, false, true]);
  });
  test("noscript menulis jawaban yang tepat, sama dengan pilihan benar tebakan", () => {
    const n = mdx.match(/<noscript>\n<p>(.*)<\/p>\n<\/noscript>/)![1]!;
    expect(n).toBe(`Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: PostgreSQL menolak PRIMARY KEY yang tidak memuat kolom kunci partisi, jadi posting memakai (${posting5.pk.join(", ")}).`);
    expect(TEBAK.pilihan[3]!.teks).toContain("PRIMARY KEY harus memuat kolom kunci partisi");
  });
});

describe("registry, kepala, dan struktur blok", () => {
  const h = per("t5-skema");
  test("terdaftar sebagai Konsep bagian 3b, berprasyarat 5.2, ada, jalur inti, dan sama dengan peta naskah", () => {
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.ada, h.prasyarat, h.lab, h.peran, h.path]).toEqual(["5.3", "konsep", "3b", true, true, ["t5-fitur-teknis"], ["api-t4", "api-t5"], ["backend"], "tahap-5/skema-data.md"]);
    expect(per("t5-fitur-teknis").nomor).toBe("5.2");
    const peta = naskah5.match(/^\| 5\.3 \| 3b \| (.*) \| Konsep \| ★ \| (.*) \| ERD bertumbuh \|$/m)!;
    expect(peta[1]).toBe(h.judul);
    expect(peta[2]!.split(", ")).toEqual(h.lab);
    expect(mdx).toContain(`title: "5.3 ${h.judul}"`);
  });
  test("lima blok: Mulai dan Coba terbuka, sisanya tertutup", () => {
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
  });
  test("menit baca: registry sama dengan baca + coba, dan satu bentuk meta", () => {
    expect(h.menit).toBe(BACA + COBA);
    const kata = (mdx.replace(/^---[\s\S]*?---/, "").match(/\p{L}[\p{L}\p{N}_]*/gu) ?? []).length;
    // Halaman pola 4.5: 3.415 kata untuk 16 menit baca; halaman ini harus sebanding, dan lebih dari 15 menit ditulis di polesan.
    expect(kata / BACA).toBeGreaterThan(150);
    expect(kata / BACA).toBeLessThan(260);
    expect(mdx).toContain(`<p class="meta">Baca ${BACA} menit · coba ${COBA} menit · Prasyarat: [[t5-fitur-teknis]] · Jalur inti</p>`);
  });
  test("semua tautan [[ID]] ada di registry, label M-nomor menuju halaman Masalah itu, dan | di sel tabel ditulis \\|", () => {
    const ids = [...mdx.matchAll(/\[\[([^\]|\\]+)(?:\\?\|([^\]]*))?\]\]/g)];
    expect(ids.length).toBeGreaterThan(20);
    for (const m of ids) {
      if (m[1] === "berikutnya") continue;
      expect(HALAMAN.some((x) => x.id === m[1]), `[[${m[1]}]] tidak ada di registry`).toBe(true);
      if (m[2] && /^M\d+$/.test(m[2])) expect(per(m[1]!).label, `${m[1]} bukan ${m[2]}`).toContain(`Masalah ${m[2]!.slice(1)} `);
      if (m[2] && /^ADR \d+$/.test(m[2])) expect(per(m[1]!).judul).toMatch(new RegExp(`ADR ${m[2]!.slice(4)}\\b`));
    }
    expect(mdx).not.toMatch(/\[\[[^\]]*[^\\]\|[^\]]*\]\]/);
  });
  test("ID riset, nomor keputusan, nomor PR, dan komentar lab internal tidak tampil ke pembaca (halaman, diagram, tebakan)", () => {
    for (const t of [mdx, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah)]) {
      expect(t).not.toMatch(/\bR\d-\d+/);
      expect(t).not.toMatch(/\bkeputusan \d{2,}/i);
      expect(t).not.toMatch(/\bPR #?\d{3}|#\d{3}\b/);
    }
  });
  test("gaya: tanpa Anda, kita, tanda seru, emoji, layanan, replika, atau rahasia; satu kata per konsep", () => {
    const badan = mdx.replace(/^---[\s\S]*?---/, "").replace(/<Snippet[^>]*\/>/g, "");
    expect(badan).not.toMatch(/\bAnda\b|\bkita\b|!|\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/\blayanan\b|\breplika\b|\brahasia\b|\bpembeli\b/i);
    expect((badan.match(/\bservice\b/g) ?? []).length).toBeGreaterThan(10);
    expect((badan.match(/\breplica\b/g) ?? []).length).toBeGreaterThan(0);
  });
  test("tabel GFM: jumlah kolom sama di header, pemisah, dan tiap baris; delapan tabel; | tidak di dalam kode", () => {
    const baris = mdx.split("\n");
    const tabel: string[][] = [];
    let kini: string[] = [];
    for (const b of baris) {
      if (b.startsWith("|")) kini.push(b);
      else if (kini.length) { tabel.push(kini); kini = []; }
    }
    expect(tabel.length).toBe(8);
    for (const t of tabel) {
      const kolom = (b: string): number => b.replace(/\\\|/g, "").split("|").length - 2;
      expect(new Set(t.map(kolom)).size, t[0]).toBe(1);
      expect(t[1]).toMatch(/^\|(---\|)+$/);
    }
    expect(tabel.map((t) => t.length - 2)).toEqual([barisNaskah.length, 6, 6, 3, 3, 5, 8, 3]);
  });
  test("ERD memakai widget bertumbuh Tahap 4 dan 5 dengan id unik, dan tautan lompat menuju jangkar yang ada", () => {
    expect(mdx.match(/<ErdHalaman id="erd-t5" tahap=\{\[4, 5\]\} \/>/g)).toHaveLength(1);
    expect(mdx).toContain("[lompat ke Ubah satu hal](#ubah-satu-hal)");
    expect(mdx.match(/<span id="ubah-satu-hal"><\/span>/g)).toHaveLength(1);
    const ada = HALAMAN.filter((x) => x.tahap <= 5).flatMap((x) => (x.id === "t5-skema" ? [] : [x.id]));
    expect(ada.length).toBeGreaterThan(100);
  });
});

describe("nilai turunan cocok dengan ERD, rekaman, dan naskah", () => {
  test("ERD: 22 + 8 = 30 tabel, 35 foreign key lalu 19, dua kolom baru, tanpa tabel atau kolom yang dihapus", () => {
    expect([N4, BARU.length, N5]).toEqual([22, 8, 30]);
    expect(N5).toBe(N4 + BARU.length);
    expect([FK4, FK5, FK_HILANG.length, FK_BARU_DAFTAR.length]).toEqual([35, 19, 18, 2]);
    expect(FK5).toBe(FK4 - FK_HILANG.length + FK_BARU_DAFTAR.length);
    expect(KBARU).toEqual([{ tabel: "akun", kolom: "mitra_pos_id" }, { tabel: "jurnal", kolom: "referensi" }]);
    expect(erd5.selisih.tabel_dihapus).toEqual([]);
    expect(erd5.selisih.kolom_dihapus).toEqual([]);
    expect(erd5.selisih.kolom_berubah).toEqual([]);
    expect(erd5.selisih.terhadap).toBe(4);
    expect(new Set(erd4.tabel.map((t) => t.nama))).toEqual(new Set(erd5.tabel.map((t) => t.nama).filter((n) => !BARU.includes(n))));
  });
  test("delapan tabel baru dan urutannya sama dengan baris tabel 'Apa yang berubah' di naskah, dan empat belas baris", () => {
    expect(barisNaskah).toHaveLength(14);
    const nama = barisNaskah.map((r) => r[1]!.match(/^`(\w+)`/)?.[1]);
    expect(nama.slice(0, 9)).toEqual(["posting", ...BARU]);
    expect(nama.slice(9, 13)).toEqual(["akun", "outbox", "jurnal", "buku"]);
    const barisMdx = mdx.split("\n").filter((b) => b.startsWith("| ") && /\| \[\[t5-m\d+\\\|M\d+\]\]( , |, \[\[t5-kms\\\|ADR 57\]\])? \|$|\| \[\[t5-m\d+\\\|M\d+\]\], \[\[t5-kms\\\|ADR 57\]\] \|$/.test(b));
    expect(barisMdx).toHaveLength(14);
    const pertama = barisMdx.map((b) => b.split(" | ")[1]!.match(/^`(\w+)`/)?.[1]);
    expect(pertama.slice(0, 9)).toEqual(nama.slice(0, 9));
    expect(pertama.slice(9, 13)).toEqual(nama.slice(9, 13));
    expect(barisMdx[13]).toContain(`${N4} tabel dalam`);
  });
  test("tabel baru: kolom, kunci utama, UNIQUE, nilai status, dan 'boleh kosong' di baris tabel sama dengan ERD", () => {
    const barisMdx = mdx.split("\n");
    const cari = (t: string): string => barisMdx.find((b) => b.startsWith(`| (tidak ada) | \`${t}\` (`))!;
    for (const nama of BARU) {
      const t = erd5.tabel.find((x) => x.nama === nama)!;
      const baris = cari(nama);
      expect(baris, nama).toBeTruthy();
      const dalam = baris.match(/^\| \(tidak ada\) \| `\w+` \((.*)\) \| /)![1]!;
      // Daftar nilai ("status: menunggu, terjurnal") dibuang sebelum nama kolom dikumpulkan: "selesai" adalah nilai dan kolom.
      let tanpaNilai = dalam;
      for (const c of t.cek.filter((x) => /_(status|jenis)_check$/.test(x.nama) && /ARRAY/.test(x.ekspresi))) {
        const nilai = [...c.ekspresi.matchAll(/'([^']+)'::text/g)].map((m) => m[1]!);
        for (const s of [nilai.join(" atau "), nilai.join(", ")]) tanpaNilai = tanpaNilai.replace(`${c.kolom[0]}: ${s}`, c.kolom[0]!);
      }
      const token = tanpaNilai.match(/[a-z_]+/g)!.filter((x) => t.kolom.some((k) => k.nama === x));
      const unik = token.filter((x, i) => token.indexOf(x) === i);
      expect(unik, nama).toEqual(t.kolom.map((k) => k.nama));
      if (t.pk.length > 1) expect(dalam).toContain(`PRIMARY KEY \`(${t.pk.join(", ")})\``);
      else if (t.pk[0] !== "id") expect(dalam).toContain(`${t.pk[0]} sebagai PRIMARY KEY`);
      else expect(dalam.startsWith("id, ")).toBe(true);
      for (const k of t.kolom.filter((x) => !x.wajib)) expect(dalam, `${nama}.${k.nama}`).toMatch(new RegExp(`${k.nama}[^,;]* boleh kosong|${k.nama}(?!.*boleh kosong)`));
      for (const u of t.unik) expect(dalam).toContain(`${u.kolom[0]} UNIQUE`);
      let daftarDicek = 0;
      for (const c of t.cek.filter((x) => /_(status|jenis)_check$/.test(x.nama) && /ARRAY/.test(x.ekspresi))) {
        const nilai = [...c.ekspresi.matchAll(/'([^']+)'::text/g)].map((m) => m[1]!);
        // Baris tabel menulis daftar nilai hanya untuk kolom yang disebut "kolom: nilai"; dua nilai ditulis dengan "atau".
        if (!dalam.includes(`${c.kolom[0]}: `)) continue;
        expect(dalam, `${nama}.${c.nama}`).toContain(`${c.kolom[0]}: ${nilai.length === 2 ? nilai.join(" atau ") : nilai.join(", ")}`);
        daftarDicek++;
      }
      if (["jadwal_cicilan", "angsuran", "pengumuman"].includes(nama)) expect(daftarDicek, nama).toBe(1);
    }
    expect(barisMdx.filter((b) => b.startsWith("| (tidak ada) |"))).toHaveLength(BARU.length);
  });
  test("nilai jenis dan tujuan baru: tabungan di buku, angsuran dan tabungan di jurnal, stream dan pengumuman di outbox; tidak ada yang hilang", () => {
    const nilai = (e: Erd, tabel: string, cek: string): string[] => [...e.tabel.find((t) => t.nama === tabel)!.cek.find((c) => c.nama === cek)!.ekspresi.matchAll(/'([^']+)'::text/g)].map((m) => m[1]!);
    const baru = (tabel: string, cek: string): string[] => nilai(erd5, tabel, cek).filter((x) => !nilai(erd4, tabel, cek).includes(x));
    const hilang = (tabel: string, cek: string): string[] => nilai(erd4, tabel, cek).filter((x) => !nilai(erd5, tabel, cek).includes(x));
    expect([baru("buku", "buku_jenis_check"), baru("jurnal", "jurnal_jenis_check"), baru("outbox", "outbox_tujuan_check"), baru("outbox", "outbox_jenis_check")]).toEqual([["tabungan"], ["angsuran", "tabungan"], ["stream"], ["pengumuman"]]);
    expect([hilang("buku", "buku_jenis_check"), hilang("jurnal", "jurnal_jenis_check"), hilang("outbox", "outbox_tujuan_check"), hilang("outbox", "outbox_jenis_check")]).toEqual([[], [], [], []]);
    expect(nilai(erd4, "outbox", "outbox_tujuan_check").join(", ")).toBe("push, verifikasi");
    expect(nilai(erd5, "buku", "buku_pemilik")).toContain("tabungan");
    expect(erd5.tabel.find((t) => t.nama === "outbox")!.cek.find((c) => c.nama === "outbox_pengumuman_ke_stream")!.ekspresi).toContain("tujuan = 'stream'");
    const referensi = erd5.tabel.find((t) => t.nama === "jurnal")!;
    expect(referensi.kolom.find((k) => k.nama === "referensi")).toMatchObject({ tipe: "text", wajib: false });
    expect(referensi.unik).toContainEqual({ nama: "jurnal_referensi_key", kolom: ["referensi"] });
    expect(referensi.cek.find((c) => c.nama === "referensi_bentuk")!.ekspresi).toMatch(/\(angsuran\|tabungan\):\[0-9\]\+:\[0-9\]\+/);
    expect(erd5.tabel.find((t) => t.nama === "akun")!.kolom.find((k) => k.nama === "mitra_pos_id")).toMatchObject({ wajib: false });
    expect(erd4.tabel.find((t) => t.nama === "akun")!.kolom.some((k) => k.nama === "mitra_pos_id")).toBe(false);
  });
  test("tabel tetap, berubah karena kolom atau aturan, dan berubah hanya karena foreign key: 6, 5, 11 dari 22 tabel Tahap 4", () => {
    expect([TETAP.length, NONFK.length, fkSaja.size]).toEqual([6, 5, 11]);
    expect(TETAP.length + NONFK.length + fkSaja.size).toBe(N4);
    for (const n of TETAP) expect(JSON.stringify({ ...erd5.tabel.find((t) => t.nama === n)!, fk: undefined })).toBe(JSON.stringify({ ...erd4.tabel.find((t) => t.nama === n)!, fk: undefined }));
    for (const n of TETAP) expect(erd5.tabel.find((t) => t.nama === n)!.fk.map((f) => f.ke_tabel)).toEqual(erd4.tabel.find((t) => t.nama === n)!.fk.map((f) => f.ke_tabel));
    // Tabel yang hanya kehilangan foreign key: selisih kolom, CHECK, dan UNIQUE nol; hanya daftar fk yang menyusut.
    for (const n of fkSaja) {
      const a = erd4.tabel.find((t) => t.nama === n)!;
      const b = erd5.tabel.find((t) => t.nama === n)!;
      expect(b.kolom).toEqual(a.kolom);
      expect(b.unik.map((u) => u.kolom)).toEqual(a.unik.map((u) => u.kolom));
      expect(b.fk.length).toBeLessThan(a.fk.length);
    }
    expect(nonFk).toEqual(new Set(["akun", "buku", "jurnal", "outbox", "posting"]));
  });
  test("foreign key: yang dihapus ERD sama dengan daftar katalog di rekaman, menyeberang service, dan 19 di dalam satu service", () => {
    expect(FK_REKAMAN).toHaveLength(FK_HILANG.length);
    const pasangERD = FK_HILANG.map((f) => `${f.dari}>${f.ke_tabel}`).sort();
    const pasangRekaman = FK_REKAMAN.map((f) => `${f.dariTabel}>${f.keTabel}`).sort();
    expect(pasangRekaman).toEqual(pasangERD);
    for (const f of FK_HILANG) {
      expect(svcDari(f.dari)).not.toBe(svcDari(f.ke_tabel));
    }
    for (const f of FK_REKAMAN) {
      expect([svcDari(f.dariTabel), svcDari(f.keTabel)]).toEqual([f.dariSvc, f.keSvc]);
    }
    expect(FK_LINTAS_REK).toBe(0);
    expect(FK_DALAM_REK).toBe(FK5);
    expect(fkSemua(erd5).every((f) => svcDari(f.dari) === svcDari(f.ke_tabel))).toBe(true);
    expect([hitungSvc("keSvc", "akun"), hitungSvc("keSvc", "ledger"), hitungSvc("keSvc", "notifikasi")]).toEqual([11, 6, 1]);
    expect(hitungSvc("keSvc", "akun") + hitungSvc("keSvc", "ledger") + hitungSvc("keSvc", "notifikasi")).toBe(FK_HILANG.length);
    expect(FK_BARU_DAFTAR.map((f) => `${f.dari}>${f.ke_tabel}`)).toEqual(["snapshot_saldo>buku", "angsuran>jadwal_cicilan"]);
    expect(FK_LINTAS_T4).toBe(21);
    expect(halamanT4Skema).toContain(`Jumlah foreign key yang menyeberang adalah ${FK_LINTAS_T4}`);
    expect(ERD_NASKAH).toBe("Tahap 5: 0 selisih naskah 3b dengan lab (lab yang benar)");
  });
  test("pembagian service: tabel sama dengan ERD dan rekaman, jumlahnya sama dengan naskah, dan keluar hanya dari ledger, pembayaran, merchant, notifikasi", () => {
    expect(new Set(layanan.modul.flatMap((m) => m.tabel))).toEqual(new Set(erd5.tabel.map((t) => t.nama)));
    expect(layanan.modul.flatMap((m) => m.tabel)).toHaveLength(N5);
    const jumlahE = [...E.join("\n").matchAll(/^ (t5_\w+)\s+\| (\d+)\s+\| (.*)$/gm)].map((m) => [m[1]!.replace(AWALAN, ""), Number(m[2]), m[3]!.split(", ").sort().join(", ")]);
    expect(jumlahE.sort()).toEqual(layanan.modul.map((m) => [m.nama, m.tabel.length, [...m.tabel].sort().join(", ")]).sort());
    const naskahSvc = [...naskah5.matchAll(/^\| `(\w+)` \| (`[^|]*`) \| (\d+) \|$/gm)].filter((m) => layanan.modul.some((x) => x.nama === m[1]));
    expect(naskahSvc.map((m) => [m[1], Number(m[3])])).toEqual(layanan.modul.map((m) => [m.nama, m.tabel.length]));
    expect(layanan.modul.filter((m) => hitungSvc("dariSvc", m.nama) > 0).map((m) => m.nama)).toEqual(["ledger", "pembayaran", "merchant", "notifikasi"]);
    expect(layanan.modul.map((m) => m.schema)).toEqual(layanan.modul.map((m) => AWALAN + m.nama));
    expect(AWALAN).toBe("t5_");
    // outbox ada di service ledger (naskah: satu transaction dengan jurnal).
    expect(layanan.modul.find((m) => m.nama === "ledger")!.tabel).toContain("outbox");
    expect(layanan.modul.find((m) => m.nama === "ledger")!.tabel).toEqual(expect.arrayContaining(["buku", "jurnal", "posting"]));
    expect(per("t3-outbox").nomor).toBe("3.9");
  });
  test("posting dipartisi: satu tabel di ERD, empat partisi di rekaman, PRIMARY KEY (id, dibuat), 30 tabel bukan 34 relasi", () => {
    expect(posting5.pk).toEqual(["id", "dibuat"]);
    expect(posting5.partisi!.kunci).toBe("RANGE (dibuat)");
    const bagianC = bagianRekaman(skemaTxt, "C").join("\n");
    expect(bagianC).toContain(`${posting5.partisi!.kunci} | PRIMARY KEY (id, dibuat)`);
    const dariRekaman = [...bagianC.matchAll(/^ (posting_\w+)\s+\| FOR VALUES/gm)].map((m) => m[1]);
    expect(dariRekaman).toEqual(posting5.partisi!.anak);
    expect(erd4.tabel.find((t) => t.nama === "posting")!.pk).toEqual(["id"]);
    expect(erd5.tabel.filter((t) => t.partisi).map((t) => t.nama)).toEqual(["posting"]);
    expect(N5 + posting5.partisi!.anak.length).toBe(34);
    expect(bagianRekaman(skemaTxt, "A").join("\n")).toMatch(/\n 30\n/);
    expect(bagianRekaman(skemaTxt, "C").join("\n")).toContain("posting_sebelum  | FOR VALUES FROM (MINVALUE)");
    expect(skemaTxt.join("\n")).toContain("posting_bulan_00 = bulan berjalan");
    expect(erd5.selisih.aturan_berubah.filter((a) => a.tabel === "posting").map((a) => [a.jenis, a.ubah])).toEqual(expect.arrayContaining([["pk", "berubah"], ["partisi", "baru"]]));
  });
  test("rekaman D: tiga penolakan ledger memakai SQLSTATE yang sama, baris tanpa partisi sama di skema.txt dan pasang.txt, PRIMARY KEY tanpa kolom kunci 0A000", () => {
    const d = D.join("\n");
    expect(d.match(/SQLSTATE 23001/g)).toHaveLength(4);
    expect(S_LEDGER).toBe("23001");
    expect(sqlstateSetelah(D, /^=> DELETE FROM posting$/)).toBe(S_LEDGER);
    expect(sqlstateSetelah(D, /^=> TRUNCATE posting$/)).toBe(S_LEDGER);
    expect(S_NOPART).toBe("23514");
    expect(S_PK).toBe("0A000");
    expect(d).toContain("ERROR:  unique constraint on partitioned table must include all partitioning columns");
    expect(d).toContain('ERROR:  no partition of relation "posting" found for row');
    const pD = bagianRekaman(pasangTxt, "D");
    expect(sqlstateSetelah(pD, /^=> INSERT INTO posting/)).toBe(S_NOPART);
    expect(pD.join("\n")).toContain('ERROR:  no partition of relation "posting" found for row');
    const iPanggil = pD.findIndex((b) => b.startsWith("=> SELECT buat_partisi_posting"));
    expect(iPanggil).toBeGreaterThan(0);
    expect(pD.slice(iPanggil).some((b) => b === "INSERT 0 1")).toBe(true);
    expect(pD.some((b) => b.includes("jam diperankan") || b.includes("Jam diperankan"))).toBe(true);
    expect(skemaTxt.some((b) => b === "ERROR:  UPDATE pada posting_bulan_00 ditolak: baris posting_bulan_00 tidak pernah diubah atau dihapus")).toBe(true);
  });
  test("klaim 'setiap INSERT ke posting menghilangkan id': dipindai di labs/api-t5 tanpa tes dan rekaman, satu pengecualian migration", () => {
    const berkas = [...terlacak].filter((f) => f.startsWith("labs/api-t5/") && /\.(go|py|sql|sh)$/.test(f) && !f.endsWith("_test.go") && !f.startsWith("labs/api-t5/output/"));
    expect(berkas.length).toBeGreaterThan(10);
    const sisip: { berkas: string; kolom: string[] }[] = [];
    for (const f of berkas) {
      for (const m of baca(f).matchAll(/INSERT INTO\s+(?:\w+\.)?posting\b\s*\(([^)]*)\)/g)) sisip.push({ berkas: f, kolom: m[1]!.split(",").map((x) => x.trim()) });
      expect(baca(f), f).not.toMatch(/COPY\s+(?:\w+\.)?posting\b/);
    }
    expect(sisip.length).toBeGreaterThanOrEqual(6);
    expect(sisip.filter((s) => s.kolom.includes("id")).map((s) => s.berkas)).toEqual(["labs/api-t5/migrasi/000024_posting_partisi.up.sql"]);
    expect(new Set(sisip.map((s) => s.berkas))).toEqual(new Set(["labs/api-t5/cmd/api/seed.go", "labs/api-t5/internal/repo/ledger.go", "labs/api-t5/internal/repo/t5.go", "labs/api-t5/run.py", "labs/api-t5/migrasi/000024_posting_partisi.up.sql"]));
    expect(mig000024).toContain("ALTER SEQUENCE posting_id_seq OWNED BY posting.id;");
    expect(mig000024).toContain("id        bigint      NOT NULL DEFAULT nextval('posting_id_seq')");
    expect(mig000024).toContain("keunikannya datang dari sequence `posting_id_seq`");
    expect(skemaTxt.join("\n")).toContain("keunikannya datang dari sequence");
  });
  test("klaim hak role dan satu proses: rekaman F dan E, README api-t5", () => {
    const f = F.join("\n");
    expect(f).toContain("hanya t5_ledger yang punya, yaitu USAGE schema akun dan SELECT atas");
    expect(f).toContain("kolom id, tingkat, dan status tabel akun");
    expect(f).toContain("role lain tidak punya hak apa pun di schema service lain: ya");
    expect(f).toContain("t5_ledger: SELECT id, tingkat, status FROM t5_akun.akun LIMIT 1   -- berhasil");
    expect(f).toContain("t5_app (mewarisi enam role)");
    expect(layanan.modul).toHaveLength(6);
    expect(S_DITOLAK).toBe("42501");
    expect(readmeApi).toContain("Proses `api-t5` memakai role `t5_app` yang mewarisi keenam role service");
    expect(readmeApi).toContain("`ringkasan_merchant_harian` ada sebagai tabel, belum ada yang mengisinya");
    expect(readmeApi).toContain("Nama schema dan role berawalan `t5_`");
    expect(readmeApi).toContain("Foreign key lintas schema: 18 sebelum, 0 sesudah");
  });
  test("buku.akun_id tetap kolom tanpa foreign key di ERD Tahap 5, dan tabel uang ledger tetap tiga: buku, jurnal, posting", () => {
    expect(erd5.tabel.find((t) => t.nama === "buku")!.fk).toEqual([]);
    expect(erd4.tabel.find((t) => t.nama === "buku")!.fk.map((f) => f.ke_tabel)).toEqual(["akun"]);
    expect(erd5.tabel.find((t) => t.nama === "buku")!.kolom.some((k) => k.nama === "akun_id")).toBe(true);
    expect(layanan.modul.find((m) => m.nama === "ledger")!.tabel.slice(0, 3)).toEqual(["buku", "jurnal", "posting"]);
  });
  test("migration: 000024 mempartisi, 000026 menulis jurnal.referensi dan jenis baru; rentang Snippet menempel pada jangkar tanpa komentar", () => {
    expect(MIG5).toEqual(["000024", "000025", "000026"]);
    expect(MIG4).toBe("000023");
    expect(mig000026.slice(R_MIG[0] - 1, R_MIG[1]).join("\n")).toBe(
      [
        "ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;",
        "ALTER TABLE jurnal DROP CONSTRAINT jurnal_jenis_check;",
        "ALTER TABLE jurnal ADD CONSTRAINT jurnal_jenis_check CHECK (jenis = ANY (ARRAY['pembuka', 'selisih', 'topup', 'bayar',",
        "    'transfer', 'pencairan', 'pembalik', 'topup_bank', 'kartu_tahan', 'kartu_tangkap', 'angsuran', 'tabungan']));",
        "ALTER TABLE jurnal ADD CONSTRAINT referensi_bentuk CHECK (referensi IS NULL OR referensi ~ '^(angsuran|tabungan):[0-9]+:[0-9]+$');",
      ].join("\n"),
    );
    for (const [dari, sampai, baris] of [[R_PARTISI[0], R_PARTISI[1], skemaTxt], [R_PK[0], R_PK[1], skemaTxt], [R_MIG[0], R_MIG[1], mig000026]] as [number, number, string[]][]) {
      const potong = baris.slice(dari - 1, sampai);
      expect(potong.some((b) => /^(#|-- |--$)/.test(b)), `${dari}:${sampai}`).toBe(false);
      expect(potong.join("\n")).not.toMatch(/R\d-\d+|keputusan \d+|PR #\d+/);
    }
    expect(skemaTxt.slice(R_PARTISI[0] - 1, R_PARTISI[0]).join("")).toMatch(/^=> SELECT pg_get_partkeydef\('posting'::regclass\)/);
    expect(skemaTxt[R_PARTISI[1]]).toMatch(/^# Nama partisi relatif terhadap bulan migration/);
    expect(skemaTxt[R_PK[1] - 1]).toBe("   -- SQLSTATE 0A000");
    const snippet = [...mdx.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"/g)].map((m) => [m[1], Number(m[2]), Number(m[3])]);
    expect(snippet).toEqual([
      ["labs/api-t5/migrasi/000026_nilai_baru_tahap5.up.sql", R_MIG[0], R_MIG[1]],
      ["labs/api-t5/output/skema.txt", R_PARTISI[0], R_PARTISI[1]],
      ["labs/api-t5/output/skema.txt", R_PK[0], R_PK[1]],
    ]);
    expect(mdx.match(/<Snippet /g)).toHaveLength(3);
  });
  test("rekaman t5-partisi: DELETE 200.000 baris lawan DETACH + DROP, faktor dua, tiga percobaan, dan kode yang memeriksanya", () => {
    expect(BARIS_LEPAS).toBe(200000);
    expect(lepasTxt).toContain("DELETE 200000");
    expect(lepasTxt).toContain("waktu terkecil DELETE dari tiga percobaan lebih dari dua kali waktu terkecil DETACH + DROP");
    expect(lepasTxt).toContain("Nilai waktunya tidak direkam");
    expect(lepasTxt).toContain("tabel uji tanpa trigger ledger");
    expect([FAKTOR, PERCOBAAN]).toEqual([2, 3]);
    expect(readmePartisi).toMatch(/pg_partman \| v5\.5\.0 \| hanya disebut\. \*\*Tidak dijalankan\*\*/);
    expect(readmePartisi).toContain("buat_partisi_posting");
  });
  test("Idempotency-Key hidup 24 jam di halaman 2.x yang ditautkan, dan referensi tidak kedaluwarsa menurut naskah", () => {
    expect(halamanIdempotency).toContain("kedaluwarsa 24 jam");
    expect(per("t2-idempotency").nomor).toMatch(/^2\./);
    expect(naskah5).toContain("Referensi bisnis yang tidak kedaluwarsa menahan jurnal berulang, berbeda dari Idempotency-Key yang hidup 24 jam");
  });
  test("selisih rancangan lawan lab: empat butir bernomor di rekaman, 21 lawan 18, dan awalan t5_ memberi enam", () => {
    expect([SELISIH_REKAMAN, SELISIH_LAIN, SELISIH]).toEqual([4, 2, 6]);
    expect(mdx).toContain("Selisih di luar diagram ada enam,");
    const tabel = mdx.split("\n").filter((b) => /^\| (21 foreign key lintas modul|`outbox` mendapat|`jurnal\.referensi` UNIQUE|`posting` dipartisi, PRIMARY|Status `jadwal_cicilan`|Schema bernama)/.test(b));
    expect(tabel).toHaveLength(SELISIH);
    expect(erd5.tabel.find((t) => t.nama === "jadwal_cicilan")!.cek.find((c) => c.nama === "jadwal_cicilan_status_check")!.ekspresi).toMatch(/aktif.*selesai.*dihentikan/);
  });
});

describe("rumus ukuran: konstanta dari naskah dan registry, tiga besaran, tabel kecil, dan Tahap 6 dari naskah Tahap 2", () => {
  test("konstanta: 3 transaksi dasar naskah lawan 2 registry, 2 posting, 365 hari, 250 dan 300 byte", () => {
    expect([TRX_DASAR, TRX_REG, POSTING_PER_TRX, HARI, BYTE_POSTING, BYTE_REG]).toEqual([3, 2, 2, 365, 250, 300]);
    expect([a4.user, a4.aktif, a5.user, a5.aktif, U6]).toEqual([100000, 20, 1000000, 20, 10000000]);
    expect(per("t5-prd").nomor).toBe("5.1");
  });
  test("tiga besaran Tahap 5 dan hasil Tahap 4, 5, 6 dihitung ulang dari angka yang tertulis", () => {
    expect([titik(P4), titik(P5), titik(P6), titik(P5_T2)]).toEqual(["43.800.000", "438.000.000", "4.380.000.000", "292.000.000"]);
    expect([koma(GB_REG2, 1), koma(GB_REG3, 1), koma(GB(BYTE5), 1), koma(GB(P5_T2 * BYTE_POSTING), 1)]).toEqual(["43,8", "65,7", "109,5", "73,0"]);
    expect([duaKoma(P4 / 1e6), duaKoma(P5 / 1e6), duaKoma(P6 / 1e9), duaKoma(GB(P4 * BYTE_POSTING)), duaKoma(GB(BYTE5))]).toEqual(["44", "440", "4,4", "11", "110"]);
    expect([koma(TB6, 3), ENAM[4]]).toEqual(["1,095", "1"]);
    expect([NILAI.RASIO45, NILAI.RASIO56, NILAI.RASIO_TRX, NILAI.RASIO_BYTE, NILAI.RASIO_TERBESAR]).toEqual(["10,0", "10,0", "1,5", "1,67", "2,5"]);
    expect(NILAI.TAHUN_BATAS).toBe("292");
    expect(BATAS_GB / (BYTE5 / 1e9)).toBeCloseTo(292.2, 1);
    expect(naskah5).toContain("32.000 ÷ 109,5 = 292 tahun");
  });
  test("tabel baru kecil: ringkasan 7,3 GB, snapshot 720 MB, angsuran 1,2 juta baris, outbox 71,2 GB dan 1,365 GB, top-up, dan file", () => {
    expect([koma(GB(RING_HARI * HARI * BYTE_RINGKASAN), 1), String((BUKU_SNAPSHOT * BULAN * BYTE_SNAPSHOT) / 1e6), koma((JADWAL * ANGSURAN_TAHUN) / 1e6, 1)]).toEqual([RING[4], SNAP[3], ANG[3]]);
    expect([OB[3], OB[4]]).toEqual([koma(OUTBOX_GB, 1), koma(OUTBOX_RET_GB, 3)]);
    expect(OUTBOX_HARI).toBe(TRX_HARI5 + TOPUP_HARI);
    expect([TOPUP_HARI, FILE_GB, JADWAL / U5, BUKU_SNAPSHOT]).toEqual([50000, 3650, 0.1, 1200000]);
    expect(naskah5).toContain(`${titik(U5)} user + ${titik(RING_HARI)} merchant`);
    expect(naskah5).toContain("3.650 GB per tahun");
    expect(per("t5-prd").prasyarat).toEqual(["t4-jembatan"]);
    expect(cerita.tahap[4]!.skala.user).toContain("±200.000 merchant");
    expect(RING_HARI).toBe(200000);
  });
  test("Tahap 6 adalah proyeksi dari naskah Tahap 2: 10 juta user, per negara, ±4,4 miliar posting, ±1 TB", () => {
    expect(ENAM[3]).toBe("4,4");
    expect(naskah2).toContain("| 6 (proyeksi) | 10 juta | per negara | `posting` ±4,4 miliar | ±1 TB |");
    expect(cerita.tahap.length).toBeGreaterThanOrEqual(5);
  });
});

describe("label sumber dan baris riset R5-120 sampai R5-124", () => {
  const ambil = (id: string): string => risetBaris.find((b) => b.startsWith(`| ${id} |`))!;
  const ids = ["R5-120", "R5-121", "R5-122", "R5-123", "R5-124"];
  test("lima baris berurutan, sesudah nomor yang lebih kecil, tanpa ID ganda di seluruh berkas, lima kolom", () => {
    const semua = risetBaris.flatMap((b) => b.match(/^\| (R5-\d+)/)?.[1] ?? []);
    expect(new Set(semua).size).toBe(semua.length);
    const posisi = ids.map((i) => semua.indexOf(i));
    expect(posisi.every((p) => p >= 0)).toBe(true);
    expect(posisi.slice(1).map((p, i) => p - posisi[i]!)).toEqual([1, 1, 1, 1]);
    const angka = (s: string): number => Number(s.slice(3));
    for (const [i, s] of semua.entries()) if (i > 0 && angka(s) > 99) expect(angka(s), `${semua[i - 1]} sebelum ${s}`).toBeGreaterThan(angka(semua[i - 1]!));
    expect(angka(semua[posisi[0]! - 1]!)).toBeLessThan(120);
    for (const i of ids) expect(ambil(i).split(" | ")).toHaveLength(5);
    expect(riset).not.toMatch(/R5-(?:12[0-4])[^\d][^\n]*R5-(?:12[0-4])\b.*\n\| R5-12[0-4] \|.*R5-12[0-4]/);
  });
  test("R5-120 dan R5-123 menyebut berkas rekaman, bagian, dan kode yang dipakai halaman", () => {
    const r = ambil("R5-120");
    for (const s of ["labs/api-t5/output/skema.txt", "pasang.txt", "lepas.txt", "lepas.py", "000024", "000026", "PostgreSQL 17.11", "go1.27.3", "pgx v5.11.0", "`t5_`", "0A000", "23514", "23001", "42501", "9, 5, 6, 6, 2, 2"]) expect(r, s).toContain(s);
    expect(r).toContain(`${FK_HILANG.length} foreign key lintas schema sebelum, 0 sesudah, ${FK5} di dalam schema`);
    expect(r).toContain(`${titik(BARIS_LEPAS)} baris`);
    const x = ambil("R5-123");
    for (const s of ["python3 tools/erd.py --naskah 5", ERD_NASKAH, "2026-11-02", "cmd/api/seed.go", "internal/repo/ledger.go", "internal/repo/t5.go", "run.py", "000024_posting_partisi.up.sql", `${FK_LINTAS_T4} foreign key`, `lab menghapus ${FK_HILANG.length}`]) expect(x, s).toContain(s);
  });
  test("R5-121 menulis hitungan yang sama dengan halaman, dari angka yang tertulis", () => {
    const r = ambil("R5-121");
    for (const s of [`${FK4} − ${FK_HILANG.length} + ${FK_BARU_DAFTAR.length} = ${FK5}`, `${titik(P5)} posting`, `${NILAI.GB5} GB`, `${NILAI.GB5_T2} GB`, `${titik(P4)} posting`, `${titik(P6)} posting`, `${NILAI.GB_REG2} GB`, `${NILAI.GB_REG3} GB`, `= ${NILAI.RASIO_TRX}`, `= ${NILAI.RASIO_BYTE}`, `= ${NILAI.RASIO_TERBESAR}`, "292,2", `${titik(JADWAL)} × ${ANGSURAN_TAHUN} = ${koma((JADWAL * ANGSURAN_TAHUN) / 1e6, 1)} juta`, "71,175", "1,365 GB", `${titik(TOPUP_HARI)}`, `${titik(FILE_GB)} GB`, "2026-11-02"]) expect(r, s).toContain(s);
  });
  test("R5-122 dan R5-124 menulis halaman dokumentasi, bagian, dan tanggal akses yang dipakai halaman", () => {
    const r = ambil("R5-122");
    for (const s of ["postgresql.org/docs/17/ddl-partitioning.html", "5.12.2.3", "5.12.1", "postgresql.org/docs/17/limits.html", "32 TB dengan BLCKSZ bawaan 8192 bytes", "VACUUM", "dibuka 2026-11-02"]) expect(r, s).toContain(s);
    const u = ambil("R5-124");
    for (const s of ["postgresql.org/docs/17/ddl-constraints.html", "5.5.3", "github.com/pgpartman/pg_partman", "dibuka 2026-11-02", "tidak menampilkan nomor rilis"]) expect(u, s).toContain(s);
    // Tiap tautan luar di halaman muncul di salah satu baris dan memakai nomor bagian yang sama.
    const luar = [...mdx.matchAll(/\]\((https:\/\/www\.postgresql\.org\/docs\/17\/([\w-]+\.html)(?:#([\w-]+))?)\)/g)].map((m) => [m[2], m[3] ?? "", m[0]]);
    expect(luar.map((x) => x[0])).toEqual(["ddl-constraints.html", "ddl-partitioning.html", "limits.html", "ddl-partitioning.html", "ddl-partitioning.html", "limits.html", "ddl-constraints.html"]);
    expect(luar.map((x) => x[1])).toEqual(["DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS", "DDL-PARTITIONING-LIMITATIONS", "", "DDL-PARTITIONING-OVERVIEW", "", "", "DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS"]);
    expect(mdx).toContain("[PostgreSQL 17, 5.5.3]");
    expect(mdx).toContain("[PostgreSQL 17, 5.12.2.3]");
    expect(mdx).toContain("[PostgreSQL 17, 5.12.1]");
    expect(mdx).toContain("[PostgreSQL 17, lampiran K]");
    expect(BATAS_TB).toBe(32);
    expect(BLOK_KB).toBe(8);
  });
  test("label: README lab bukan Rekaman lab, dan tiap Tidak dijalankan menyebut dokumentasi atau lingkupnya", () => {
    expect(mdx).toContain("README lab api-t5");
    expect(mdx).not.toMatch(/Rekaman lab[^.]*README/);
    expect((mdx.match(/Tidak dijalankan/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(mdx).toContain("lab tidak mencoba itu (Tidak dijalankan)");
    expect(mdx).toContain("Hitungan: angka yang bisa kamu ulang dari angka yang tertulis di halaman");
    expect(mdx).toContain("[Label sumber](/cara-pakai/#label-sumber)");
  });
});
