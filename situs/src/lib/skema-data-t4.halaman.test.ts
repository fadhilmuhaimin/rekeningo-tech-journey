// Penjaga halaman 4.5 (keputusan 1282 sampai 1284): jumlah dan nama tabel, kolom baru, nilai jenis, foreign key, pembagian modul,
// rumus ukuran data, label sumber, tautan, dan klaim negatif di skema-data.mdx, diagram t4-skema-inti.json, dan tebakan
// t4-skema-tebak.json diturunkan dari ERD Tahap 3 dan 4 (situs/data/erd), pembagian modul (modul-tahap-4.json), rekaman
// labs/api-t4 dan labs/t4-modul, migration api-t4, registry (cerita.json), naskah Tahap 4 bagian 3b, dan baris riset
// R4-130 sampai R4-134. Seluruh isi halaman dibandingkan dengan teks yang dibangun di sini: angka, daftar nilai, nama tabel,
// jumlah, dan rentang Snippet diturunkan dari sumber, dan kalimat yang tidak punya sumber untuk diturunkan ditulis apa adanya
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
const HALAMAN_MDX = "situs/src/content/docs/tahap-4/skema-data.mdx";
const mdx = baca(HALAMAN_MDX);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const naskahBaris = naskah.split("\n");
const riset = baca("plan/RISET-TAHAP-4.md");
const risetBaris = riset.split("\n");
const rantaiMentah = bacaJson<unknown>("situs/data/diagram/t4-skema-inti.json");
const tebakMentah = bacaJson<unknown>("situs/data/widget/t4-skema-tebak.json");
const skemaTxt = baca("labs/api-t4/output/skema.txt").split("\n");
const kontrakTxt = baca("labs/api-t4/output/kontrak.txt");
const batasTxt = baca("labs/t4-modul/output/batas.txt").split("\n");
const ledgerTxt = baca("labs/t4-modul/output/ledger.txt").split("\n");
const readmeModul = baca("labs/t4-modul/README.md");
const readmeWebhook = baca("labs/t4-webhook/README.md");
const migrasi = ["000020_akun_tingkat_buku_jenis", "000021_topup_bank", "000022_verifikasi_qr", "000023_kartu_audit"].map((n) => ({
  nama: n,
  isi: baca(`labs/api-t4/migrasi/${n}.up.sql`),
}));

interface Fk { nama: string; kolom: string[]; ke_tabel: string; ke_kolom: string[] }
interface Tabel {
  nama: string;
  kolom: { nama: string; tipe: string; wajib: boolean }[];
  pk: string[];
  fk: Fk[];
  unik: { nama: string; kolom: string[] }[];
  cek: { nama: string; kolom: string[]; ekspresi: string }[];
  index: unknown[];
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
    aturan_berubah: { tabel: string; jenis: string; nama: string; ubah: string }[];
  };
}
interface Modul {
  tahap: number;
  modul: { nama: string; schema: string; tabel: string[] }[];
  lintas: { tabel: string; fk: string; ke_tabel: string; dari_modul: string; ke_modul: string }[];
}
const erd3 = bacaJson<Erd>("situs/data/erd/tahap-3.json");
const erd4 = bacaJson<Erd>("situs/data/erd/tahap-4.json");
const modul = bacaJson<Modul>("situs/data/erd/modul-tahap-4.json");

interface H { id: string; judul: string; tahap: number; jenis?: string; bagian?: number | string; nomor?: string; ada?: boolean; prasyarat?: string[]; menit?: number; inti?: boolean; peran?: string[]; lab?: string[]; path: string }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const a3 = cerita.tahap[2]!.asumsi as { user: number; aktif: number };
const a4 = cerita.tahap[3]!.asumsi as { user: number; aktif: number; upload: number; fileKB: number; baris: number };
const a5 = cerita.tahap[4]!.asumsi as { user: number; aktif: number };

// ---- bentuk angka --------------------------------------------------------------------------------------------------------
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas"];
const W = (n: number): string => KATA[n] ?? String(n);
const K = (n: number): string => W(n)[0]!.toUpperCase() + W(n).slice(1);
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (x: number, d: number): string => x.toFixed(d).replace(".", ",");
// Dua angka bermakna: 5.475 -> 5,5; 43,8 -> 44; 438 -> 440.
const dua = (x: number): number => {
  const f = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / f) * f;
};
const duaKoma = (x: number): string => String(Number(dua(x).toPrecision(3))).replace(".", ",");
const bt = (a: string[]): string[] => a.map((x) => `\`${x}\``);
const btDan = (a: string[]): string => `${bt(a).slice(0, -1).join(", ")}, dan ${bt(a).at(-1)}`;
const MIN = "−";

// ---- turunan dari ERD --------------------------------------------------------------------------------------------------
const per4 = new Map(erd4.tabel.map((t) => [t.nama, t]));
const per3 = new Map(erd3.tabel.map((t) => [t.nama, t]));
const N3 = erd3.tabel.length;
const N4 = erd4.tabel.length;
const BARU = erd4.selisih.tabel_baru;
const NBARU = BARU.length;
const KBARU = erd4.selisih.kolom_baru;
const NMODUL = modul.modul.length;
const sama = (n: string): boolean => JSON.stringify(per3.get(n)) === JSON.stringify(per4.get(n));
const TETAP = erd3.tabel.map((t) => t.nama).filter(sama);
const BERUBAH = erd3.tabel.map((t) => t.nama).filter((n) => !sama(n));
const fkSemua = (e: Erd) => e.tabel.flatMap((t) => t.fk.map((f) => ({ dari: t.nama, ...f })));
const menuju = (e: Erd, ke: string): number => fkSemua(e).filter((f) => f.ke_tabel === ke).length;
const penunjuk = (e: Erd, ke: string): number => new Set(fkSemua(e).filter((f) => f.ke_tabel === ke).map((f) => f.dari)).size;
const FK3 = fkSemua(erd3).length;
const FK4 = fkSemua(erd4).length;
const nilaiCek = (e: Erd, tabel: string, cek: string): string[] => {
  const c = e.tabel.find((t) => t.nama === tabel)?.cek.find((x) => x.nama === cek);
  if (!c) throw new Error(`ERD Tahap ${e.tahap}: ${tabel}.${cek} tidak ada`);
  return [...c.ekspresi.matchAll(/'([^']+)'::text/g)].map((m) => m[1]!);
};
const V = (tabel: string, cek: string): string => nilaiCek(erd4, tabel, cek).join(", ");
const V3 = (tabel: string, cek: string): string => nilaiCek(erd3, tabel, cek).join(", ");
const baruNilai = (tabel: string, cek: string): string[] => nilaiCek(erd4, tabel, cek).filter((x) => !nilaiCek(erd3, tabel, cek).includes(x));
const ATAU = (a: string[]): string => a.join(" atau ");
const kolomBaruTeks = ((): string => {
  const urut: string[] = [];
  for (const k of KBARU) if (!urut.includes(k.tabel)) urut.push(k.tabel);
  const bagian = urut.map((t) => `\`${t}\` (${bt(KBARU.filter((k) => k.tabel === t).map((k) => k.kolom)).join(", ")})`);
  return `${bagian.slice(0, -1).join(", ")}, dan ${bagian.at(-1)}`;
})();

// ---- turunan dari rekaman ----------------------------------------------------------------------------------------------
const bagianRekaman = (baris: string[], kode: string): string[] => {
  const a = baris.findIndex((b) => b.startsWith(`# --- ${kode}. `));
  if (a < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const z = baris.findIndex((b, i) => i > a && b.startsWith("# --- "));
  return baris.slice(a, z < 0 ? undefined : z);
};
const skemaC = bagianRekaman(skemaTxt, "C");
const bukuC = new Map(
  skemaC.flatMap((b) => {
    const m = b.match(/^\s*(\w+)\s+\|\s+(\d+)\s+\|\s+(-?\d+)\s*$/);
    return m ? [[m[1]!, { buku: Number(m[2]), saldo: Number(m[3]) }] as const] : [];
  }),
);
const SALDO_BANK = bukuC.get("bank")!.saldo;
const BUKU_PEMAKAI = bukuC.get("pemakai")!;
const rp = (n: number): string => `${n < 0 ? MIN : ""}Rp${titik(Math.abs(n))}`;
const sqlstateSetelah = (baris: string[], pola: RegExp): string => {
  const i = baris.findIndex((b) => pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan`);
  const s = baris.slice(i).find((b) => /-- SQLSTATE \d{5}/.test(b));
  return s!.match(/SQLSTATE (\d{5})/)![1]!;
};
const E = bagianRekaman(skemaTxt, "E");
const D = bagianRekaman(skemaTxt, "D");
const S_ORDER_GANDA = (() => {
  const i = E.findIndex((b) => b.includes("'X1', 10000"));
  const j = E.findIndex((b, k) => k > i && b.includes("'X1', 10000"));
  return E.slice(j).find((b) => /SQLSTATE/.test(b))!.match(/SQLSTATE (\d{5})/)![1]!;
})();
const S_POSTING_UPDATE = sqlstateSetelah(D, /UPDATE posting SET jumlah = 1/);
const S_QR = sqlstateSetelah(E, /INSERT INTO qr \(akun_id, jenis\)/);
const rentang = (baris: string[], awal: RegExp, akhir: RegExp): [number, number] => {
  const a = baris.findIndex((b) => awal.test(b));
  const z = baris.findIndex((b, i) => i > a && akhir.test(b));
  if (a < 0 || z < 0) throw new Error(`rentang ${awal} .. ${akhir} tidak ditemukan`);
  return [a + 1, z + 1];
};
const SQL000020 = migrasi[0]!.isi.split("\n");
const R_MIG = rentang(SQL000020, /^ALTER TABLE buku DROP CONSTRAINT buku_jenis_check;/, /^INSERT INTO buku \(jenis\) VALUES \('bank'/);
const R_REK = rentang(skemaTxt, /^=> INSERT INTO topup_bank .* VALUES \(419, 'X', 0,/, /^ {3}-- SQLSTATE 23505 · constraint topup_bank_order_id_key/);
const S422 = (() => {
  const i = ledgerTxt.findIndex((b) => b === "# Idempotency-Key bukan order_id");
  return ledgerTxt.slice(i).find((b) => b.startsWith("HTTP/1.1"))!.match(/HTTP\/1\.1 (\d{3})/)![1]!;
})();

// Pembagian modul: tabel, jumlah, foreign key keluar (dari modul-tahap-4.json) dan tabel terbaca (dari batas.txt bagian B).
const batasB = bagianRekaman(batasTxt, "B");
const terbaca = new Map(
  batasB.flatMap((b) => {
    const m = b.match(/^role t4m_(\w+): (\d+) tabel terbaca .*?, (\d+) ditolak permission denied \((\d{5})\)/);
    return m ? [[m[1]!, { baca: Number(m[2]), tolak: Number(m[3]), kode: m[4]! }] as const] : [];
  }),
);
const keluar = (nama: string): number => modul.lintas.filter((l) => l.dari_modul === nama).length;
const S_DITOLAK = [...terbaca.values()][0]!.kode;
const S_FK_LINTAS = (() => {
  const m = batasB.join("\n").match(/\((\d{5})\)\n--- PASS: TestKunciAsingLintasSchema/);
  return m![1]!;
})();
const LINTAS = modul.lintas.length;
const KE_AKUN_MODUL = modul.lintas.filter((l) => l.ke_modul === "akun").length;
const KE_LEDGER = modul.lintas.filter((l) => l.ke_modul === "ledger").length;
const KE_TABEL = (t: string): number => modul.lintas.filter((l) => l.ke_tabel === t).length;
const MODUL_BARIS = modul.modul
  .map((m) => {
    const t = terbaca.get(m.nama)!;
    return `| \`${m.nama}\`${m.nama === "pembayaran" ? " (service sendiri)" : ""} | ${bt(m.tabel).join(", ")} | ${m.tabel.length} | ${keluar(m.nama)} | ${t.baca} (${t.tolak}) |`;
  })
  .join("\n");
const AWALAN_SCHEMA = modul.modul[0]!.schema.slice(0, modul.modul[0]!.schema.indexOf(modul.modul[0]!.nama));

// ---- turunan dari migration -----------------------------------------------------------------------------------------------
const DROP_CHECK = migrasi.reduce((n, m) => n + (m.isi.match(/DROP CONSTRAINT/g) ?? []).length, 0);
const BUKU_SISTEM = (migrasi[0]!.isi.match(/INSERT INTO buku \(jenis\) VALUES (.*);/)![1]!.match(/\('/g) ?? []).length;
const LOCK = [...new Set(migrasi.map((m) => m.isi.match(/SET LOCAL lock_timeout = '(\w+)'/)![1]!))];
const NOMOR_MIG = migrasi.map((m) => m.nama.slice(0, 6));

// ---- turunan dari registry dan naskah ---------------------------------------------------------------------------------------
const TRX = Number(naskah.match(/\(20\.000 × (\d) × (\d) × (\d+) = 43,8 juta\)/)![1]);
const POSTING_PER_TRX = Number(naskah.match(/\(20\.000 × (\d) × (\d) × (\d+) = 43,8 juta\)/)![2]);
const HARI = Number(naskah.match(/\(20\.000 × (\d) × (\d) × (\d+) = 43,8 juta\)/)![3]);
const BYTE_POSTING = Number(naskah.match(/±(\d+) byte per posting termasuk index/)![1]);
const BYTE_REG = a4.baris;
const aktif = (a: { user: number; aktif: number }): number => (a.user * a.aktif) / 100;
const posting = (a: { user: number; aktif: number }): number => aktif(a) * TRX * POSTING_PER_TRX * HARI;
const P3 = posting(a3);
const P4 = posting(a4);
const P5 = posting(a5);
const BYTE4 = P4 * BYTE_POSTING;
const BYTE3 = P3 * BYTE_POSTING;
const BARIS5 = naskah.match(/^\| 5 \| 1 juta \| ±(\d+), sebagian di service terpisah \| `posting` ±(\d+) juta \| ±(\d+) GB \|/m)!;
const TABEL5 = Number(BARIS5[1]);
const GB = (b: number): number => b / 1e9;
const GB_REG2 = GB(aktif(a4) * 2 * HARI * BYTE_REG);
const GB_REG3 = GB(aktif(a4) * TRX * HARI * BYTE_REG);
const FILE_GB = (a4.upload * a4.fileKB * HARI) / 1e6;
const FILE_KB = a4.upload * a4.fileKB * HARI;
const KALI_LEDGER = Math.round(FILE_GB / GB(BYTE4));
const KALI_REG = Math.round(FILE_GB / GB_REG3);
const TOPUP_RATIO = Number(naskah.match(/(\d,\d+) top-up per user aktif per hari \(Asumsi\)/)![1]!.replace(",", "."));
const TOPUP_HARI = aktif(a4) * TOPUP_RATIO;
const WH = naskah.match(/`webhook_event` ([\d.]+) × 365 × (\d+) B ≈ (\d+) MB per tahun, dan (\d+) MB dengan retensi (\d+) hari/)!;
const AL = naskah.match(/`audit_log` ([\d.]+) aksi per hari \(±(\d+) staf × (\d+) aksi, Asumsi\) × 365 × (\d+) B ≈ (\d+) MB/)!;
const VR = naskah.match(/`verifikasi` ([\d.]+) × 365 × (\d+) B ≈ (\d+) MB/)!;
const OB = naskah.match(/`outbox` ([\d.]+) × 365 × (\d+) B ≈ ([\d,]+) GB tanpa pembersihan, dan [\d.]+ × (\d+) × \d+ B ≈ ([\d,]+) MB/)!;
const num = (s: string): number => Number(s.replace(/\./g, ""));
const WH_HARI = num(WH[1]!);
const WH_B = Number(WH[2]);
const WH_RET = Number(WH[5]);
const AL_HARI = num(AL[1]!);
const AL_STAF = Number(AL[2]);
const AL_AKSI = Number(AL[3]);
const AL_B = Number(AL[4]);
const VR_HARI = num(VR[1]!);
const VR_B = Number(VR[2]);
const OB_HARI = num(OB[1]!);
const OB_B = Number(OB[2]);
const OB_RET = Number(OB[4]);
const TRX_HARI4 = aktif(a4) * TRX;
const MB = (b: number): number => b / 1e6;

// Halaman yang dirujuk.
const BACA = per("t4-skema").menit! - 3;
const COBA = 3;

// ---- turunan tambahan (sesudah rekaman, registry, dan naskah) ---------------------------------------------------------------
const NOMOR_T3 = (() => {
  const n = erd3.sumber.file.filter((f) => f.startsWith("labs/api-t3/migrasi/")).map((f) => f.match(/migrasi\/(\d{6})_/)![1]!);
  return n.at(-1)!;
})();
const TB = per4.get("topup_bank")!;
const UNIK_TB = ["order_id", "jurnal_id"].filter((k) => TB.unik.some((u) => u.kolom.join() === k));
const ARUS_JURNAL = erd4.selisih.aturan_berubah.find((a) => a.tabel === "jurnal")!;
const BARIS_TUMBUH = [
  `| 3 | ${titik(a3.user)} | ${a3.aktif}% | ${N3} | \`posting\` ±${duaKoma(P3 / 1e6)} juta | ±${duaKoma(GB(BYTE3))} GB |`,
  `| 4 | ${titik(a4.user)} | ${a4.aktif}% | ${N4}, dibagi per modul | \`posting\` ±${duaKoma(P4 / 1e6)} juta | ±${duaKoma(GB(BYTE4))} GB |`,
  `| 5 | ${titik(a5.user)} | ${a5.aktif}% | ±${TABEL5} | \`posting\` ±${duaKoma(P5 / 1e6)} juta | ±${duaKoma(GB(P5 * BYTE_POSTING))} GB |`,
].join("\n");
const SEL = (x: number): string => koma(x, 1);

// Selisih rancangan (blok mermaid naskah 3b) lawan ERD Tahap 4: enam, dihitung dari kedua sumber (padanan tools/erd.py --naskah 4).
const mermaid = naskahBaris.slice(naskahBaris.findIndex((b) => b.startsWith("erDiagram")), naskahBaris.findIndex((b, i) => b.startsWith("```") && i > naskahBaris.findIndex((c) => c.startsWith("erDiagram"))));
const kolomMermaid = (tabel: string): string[] => {
  const a = mermaid.findIndex((b) => b.trimStart().startsWith(`${tabel.toUpperCase()} {`));
  if (a < 0) throw new Error(`mermaid: ${tabel} tidak ada`);
  const isi: string[] = [];
  for (let i = a; i < mermaid.length; i++) {
    const m = mermaid[i]!.replace(/^\s*\w+ \{\s*/, "").replace(/\s*\}\s*$/, "").trim().split(/\s+/);
    if (m.length >= 2) isi.push(m[1]!);
    if (/\}\s*$/.test(mermaid[i]!)) break;
  }
  return isi;
};
const barisMermaid = (tabel: string): string[] => {
  const a = mermaid.findIndex((b) => b.trimStart().startsWith(`${tabel.toUpperCase()} {`));
  const isi: string[] = [];
  for (let i = a; i < mermaid.length; i++) {
    isi.push(mermaid[i]!);
    if (/\}\s*$/.test(mermaid[i]!)) break;
  }
  return isi;
};
const kolomLab = (tabel: string): string[] => per4.get(tabel)!.kolom.map((k) => k.nama);
const jurnalUnik = (tabel: string): boolean => per4.get(tabel)!.unik.some((u) => u.kolom.join() === "jurnal_id");
const SELISIH = [
  kolomMermaid("outbox").indexOf("tujuan") !== kolomLab("outbox").indexOf("tujuan") && kolomLab("outbox").at(-1) === "tujuan",
  kolomMermaid("produk").indexOf("gambar_url") !== kolomLab("produk").indexOf("gambar_url") && kolomLab("produk").at(-1) === "gambar_url",
  !kolomMermaid("topup_bank").includes("tujuan_bayar") && kolomLab("topup_bank").includes("tujuan_bayar"),
  !/\bUK\b/.test(barisMermaid("audit_log").find((b) => /\bhash\b/.test(b) && !/hash_sebelumnya/.test(b))!) && per4.get("audit_log")!.unik.some((u) => u.kolom.join() === "hash"),
  mermaid.some((b) => /JURNAL \|o--o\| WEBHOOK_EVENT/.test(b)) && !jurnalUnik("webhook_event"),
  mermaid.some((b) => /JURNAL \|o--o\| INSIDEN_REKON/.test(b)) && !jurnalUnik("insiden_rekon"),
];

// ---- teks halaman yang diharapkan (dibangun dari nilai turunan di atas; kalimat tanpa sumber ditulis apa adanya) ----------------
const HARAPAN = `---
title: "4.5 Skema data: ERD Tahap 3 → Tahap 4 dan pertumbuhannya"
description: ${N3} tabel Tahap 3 menjadi ${N4} tabel Tahap 4, dibagi ke ${W(NMODUL)} modul. Tabel uang tidak mendapat kolom, lalu ukuran database diperkirakan sampai Tahap 5.
---
import Blok from "../../../components/Blok.astro";
import Rantai from "../../../components/Rantai.astro";
import intiDiagram from "../../../../data/diagram/t4-skema-inti.json";
import ErdHalaman from "../../../components/ErdHalaman.astro";
import Tebak from "../../../widgets/tebak/Tebak.tsx";
import dataTebak from "../../../../data/widget/t4-skema-tebak.json";
import Snippet from "../../../components/Snippet.astro";

<p class="meta">Baca ${BACA} menit · coba ${COBA} menit · Prasyarat: [[t4-dua-arah]] · Jalur inti</p>

<Blok nama="Mulai" buka>

## Inti

Tahap 4 menambah ${W(NBARU)} tabel dan ${W(KBARU.length)} kolom, lalu membagi ${N4} tabel ke ${W(NMODUL)} modul. Tabel uang tidak mendapat kolom, hanya nilai jenis baru.

<Rantai data={intiDiagram} ringkas />

ERD di halaman ini dibaca dari database lab, bukan digambar tangan. Skema akhir Tahap 3 punya ${N3} tabel, dan skema akhir Tahap 4 di lab api-t4 punya ${N4}. ${K(NBARU)} tabel baru adalah ${btDan(BARU)}. ${K(KBARU.length)} kolom baru ada di ${kolomBaruTeks}.

Uang dari bank memakai ledger yang sama. Tabel \`posting\` tetap sama, dan \`buku\` serta \`jurnal\` hanya menerima nilai baru di aturan \`jenis\`. Tabel terbesar tetap \`posting\` (±${duaKoma(P4 / 1e6)} juta baris per tahun), tetapi yang tumbuh paling cepat adalah file: ${FILE_GB} GB per tahun, ${KALI_LEDGER} kali posting. Angka ukuran adalah Asumsi dengan rumus di blok Paham, dan arti semua label ada di [Label sumber](/cara-pakai/#label-sumber).

<details class="question">
<summary>Sudah tahu? Cek 3 pertanyaan</summary>

1. Tabel Tahap 3 mana yang berubah di Tahap 4, dan mana yang tidak?
2. Kenapa uang dari bank tidak menambah kolom di \`buku\` atau \`jurnal\`?
3. Dari rumus apa ${koma(GB(BYTE4), 2)} GB posting per tahun, dan kenapa file ${FILE_GB} GB tidak masuk tabel?

Yakin dengan ketiganya? Lompat ke [[berikutnya]].

</details>

</Blok>

<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: tabel uang tidak mendapat kolom baru, dan uang dari bank masuk lewat tabel baru bernama topup_bank yang menunjuk ke jurnal.">

Tebak dulu, lalu cek jawabanmu di ERD di bawahnya. ERD adalah gambar tabel, kolom, dan foreign key di antaranya. Kedua ERD dibangun dari skema lab: Tahap 3 dari migration sampai api-t3 ${NOMOR_T3}, dan Tahap 4 dari migration yang sama ditambah api-t4 ${NOMOR_MIG[0]} sampai ${NOMOR_MIG.at(-1)}.

<Tebak client:visible data={dataTebak} />

<noscript>
<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: tidak ada kolom baru. buku dan jurnal menerima nilai jenis baru, dan posting sama persis.</p>
</noscript>

Diagram dibuka di Tahap 4. Tiap tabel diberi label baru, berubah, atau tetap menurut Tahap 3, dan kolom yang bertambah diberi label baru. Di bawah diagram ada tabel pembagian modul.

<ErdHalaman id="erd-t4" tahap={[3, 4]} />

**Ubah satu hal:** tekan **Bandingkan dengan Tahap 3**. Di layar lebar kedua skema tampil berdampingan, dan di HP skema Tahap 3 tampil di atas skema Tahap 4. Pilih \`jurnal\` di Tahap 4: tidak ada kolom berlabel baru, tetapi aturan \`${ARUS_JURNAL.nama}\` berlabel ${ARUS_JURNAL.ubah}. Lalu pilih \`topup_bank\`: ${W(TB.fk.length)} foreign key (ke ${bt(TB.fk.map((f) => f.ke_tabel)).join(" dan ke ")}) dan ${W(UNIK_TB.length)} aturan UNIQUE (${bt(UNIK_TB).join(" dan ")}).

</Blok>

<Blok nama="Paham">

### Kenapa ini ada

PRD v4 meminta top-up dari bank, verifikasi identitas, QR merchant luar, kartu virtual, dan back office ([[t4-prd]]). [[t4-fitur-teknis]] menurunkannya jadi pekerjaan, dan halaman ini menunjukkan akibatnya pada tabel.

Setiap perubahan di bawah punya alasan dan masalah yang memicunya. Tanpa catatan itu, tim berikutnya tidak tahu kenapa \`topup_bank\` menunjuk ke \`jurnal\` dan kenapa ${N4} tabel dibagi ke ${W(NMODUL)} schema. Schema adalah kelompok tabel bernama di dalam satu database PostgreSQL.

### Cara kerjanya

**Apa yang berubah dan kenapa.** Tabel pertama memuat ${W(NBARU)} tabel baru, dan tabel kedua memuat ${W(BERUBAH.length)} tabel Tahap 3 yang berubah. Nama tabel, kolom, dan nilai status ada di skema lab api-t4 (Rekaman lab, \`skema.txt\` bagian A, B, dan E). Kolom Alasan adalah pertimbangan tim, bukan hasil ukur.

Role aplikasi di tabel ini adalah login database yang dipakai server, dengan hak yang dibatasi per tabel.

| Tahap 3 | Tahap 4 | Alasan | Masalah atau syarat |
|---|---|---|---|
| (tidak ada) | \`topup_bank\` (akun, order_id, jumlah, status: ${V("topup_bank", "topup_bank_status_check")}; tujuan_bayar, kedaluwarsa_pada, jurnal_id) | Satu top-up satu baris; \`order_id\` dan \`jurnal_id\` UNIK | [[t4-m29\\|M29]], [[t4-m30\\|M30]] |
| (tidak ada) | \`webhook_event\` (event_id sebagai kunci utama, topup_id, jenis, hasil: ${V("webhook_event", "webhook_event_hasil_check")}; jurnal_id) | Event yang sama ditolak kunci utama, dan hasilnya tercatat | [[t4-m29\\|M29]] |
| (tidak ada) | \`insiden_rekon\` (tanggal, order_id, topup_id, jenis: ${V("insiden_rekon", "insiden_rekon_jenis_check")}; selisih, status, jurnal_id) | Selisih dengan laporan gateway jadi satu baris bernomor; UNIQUE pada tanggal, order_id, dan jenis | [[t4-m30\\|M30]] |
| (tidak ada) | \`verifikasi\` (akun, subjek: ${ATAU(bt(nilaiCek(erd4, "verifikasi", "verifikasi_subjek_check")))}, status, tingkat_diminta, referensi_vendor, kunci objek dan checksum kartu dan swafoto, hapus_pada) | File ada di penyimpanan objek; database hanya menyimpan kunci dan checksum | [[t4-m31\\|M31]], [[t4-m33\\|M33]] |
| (tidak ada) | \`qr\` (akun, jenis: ${ATAU(nilaiCek(erd4, "qr", "qr_jenis_check"))}, nominal, berlaku_sampai, status, jurnal_id) | QR dinamis wajib punya nominal dan batas waktu, dan paling banyak satu jurnal | [[t4-m35\\|M35]] |
| (tidak ada) | \`kartu\` (akun, token_penerbit UNIK, empat_digit, status, batas_harian) | Nomor kartu penuh tidak disimpan; hanya token dan empat digit | [[t4-m37\\|M37]] |
| (tidak ada) | \`otorisasi_kartu\` (kartu, id_penerbit UNIK, jumlah, status: ${V("otorisasi_kartu", "otorisasi_kartu_status_check")}; jurnal_tahan_id, jurnal_tangkap_id, tahan_sampai) | Otorisasi dikenali ulang, dan dana tertahan adalah jurnal di ledger | [[t4-m37\\|M37]] |
| (tidak ada) | \`audit_log\` (waktu, pelaku, peran, aksi, objek, alasan, penyetuju, hash_sebelumnya, hash UNIK) | Role aplikasi hanya menambah baris, dan tiap baris memuat hash baris sebelumnya | [[t4-m38\\|M38]] |

| Tahap 3 | Tahap 4 | Alasan | Masalah atau syarat |
|---|---|---|---|
| \`akun\` (\`jenis\`: ${V3("akun", "akun_jenis_check")}) | \`akun\` + \`tingkat\` (${V("akun", "akun_tingkat_check")}) dan \`status\` (${V("akun", "akun_status_check")}); \`jenis\` + ${bt(baruNilai("akun", "akun_jenis_check")).join(", ")} | Tingkat menentukan batas saldo; tim risk membekukan akun lewat status. ${K(baruNilai("akun", "akun_jenis_check").length)} nilai \`jenis\` baru ditandai oasdiff sebagai perubahan yang bisa merusak client berenum tertutup (Rekaman lab api-t4, \`kontrak.txt\`) | [[t4-m35\\|M35]], [[t4-m38\\|M38]] |
| \`buku\` (\`jenis\`: ${V3("buku", "buku_jenis_check")}) | \`buku\` tanpa kolom baru; \`jenis\` + ${bt(baruNilai("buku", "buku_jenis_check")).join(", ")} | Buku \`bank\` adalah lawan uang yang masuk dari luar, dan \`dana_tertahan\` menampung dana kartu yang belum ditagih | [[t4-m29\\|M29]], [[t4-m37\\|M37]] |
| \`jurnal\` (\`jenis\`: ${V3("jurnal", "jurnal_jenis_check")}) | \`jurnal\` tanpa kolom baru; \`jenis\` + ${bt(baruNilai("jurnal", "jurnal_jenis_check")).join(", ")} | Pembayaran QR memakai jenis \`bayar\` yang sudah ada | [[t4-m29\\|M29]], [[t4-m37\\|M37]] |
| \`outbox\` (kelas, jenis) | \`outbox\` + \`tujuan\` (${V("outbox", "outbox_tujuan_check")}); \`jenis\` + ${bt(baruNilai("outbox", "outbox_jenis_check")).join(", ")} | Pekerjaan verifikasi memakai mekanisme klaim yang sama dengan notifikasi, dan tidak punya jurnal | [[t4-m31\\|M31]] |
| \`produk\` | \`produk\` + \`gambar_url\` | Merchant luar mengimpor katalog dengan URL gambar | [[t4-m36\\|M36]] |

**Yang tidak berubah.** ${K(TETAP.length)} tabel Tahap 3 sama persis di kedua ERD: ${btDan(TETAP)}. Kolom, foreign key, UNIQUE, CHECK, dan index-nya sama, dan \`tools/erd.py\` menghitung selisih itu dari kedua skema. Tidak ada tabel atau kolom yang dihapus.

**Idempotency-Key lintas service.** API ledger menerima \`order_id\` top-up sebagai Idempotency-Key. Key yang berbeda dari \`order_id\` ditolak dengan ${S422}, dan permintaan dengan key yang sama menghasilkan satu jurnal (Rekaman lab t4-modul, \`ledger.txt\` bagian A). Mekanismenya dibahas di [[t2-idempotency]] dan [[t4-modul]].

**Semua bermuara di \`akun\` dan \`jurnal\`.** ${K(penunjuk(erd3, "akun"))} tabel Tahap 3 menunjuk \`akun\` dan ${W(penunjuk(erd3, "jurnal"))} menunjuk \`jurnal\`; di Tahap 4 jumlahnya ${W(penunjuk(erd4, "akun"))} dan ${W(penunjuk(erd4, "jurnal"))}. Jumlah foreign key naik dari ${FK3} ke ${FK4}, dihitung dari kedua ERD. ${K(FK4 - FK3)} yang baru menuju \`akun\` (${W(menuju(erd4, "akun") - menuju(erd3, "akun"))}), \`jurnal\` (${W(menuju(erd4, "jurnal") - menuju(erd3, "jurnal"))}), \`topup_bank\` (${W(menuju(erd4, "topup_bank"))}), dan \`kartu\` (${W(menuju(erd4, "kartu"))}).

**Tabel uang: kolom sama, nilai jenis baru.** \`buku\` dan \`jurnal\` tidak mendapat kolom. Yang berubah adalah dua aturan CHECK pada kolom \`jenis\`, dan aturan \`buku_pemilik\` yang kini menyebut \`pemakai\` dan \`merchant\` sebagai buku milik akun. Migration menulisnya sebagai berikut, dan menambah ${W(BUKU_SISTEM)} buku sistem:

<Snippet file="labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql" lines="${R_MIG[0]}:${R_MIG[1]}" lang="sql" title="labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql" />

Di data awal lab buku \`bank\` bersaldo ${rp(SALDO_BANK)}, dan ${BUKU_PEMAKAI.buku} buku \`pemakai\` berjumlah ${rp(BUKU_PEMAKAI.saldo)} (Rekaman lab, \`skema.txt\` bagian C). Itulah arti "makin negatif, makin banyak uang masuk dari luar".

**Aturan di database.** Tabel baru membawa aturan sendiri, dan lab merekam penolakannya dengan INSERT yang harus gagal (Rekaman lab, \`skema.txt\` bagian E). Jumlah nol dan \`order_id\` yang sama ditolak database, bukan hanya service. Bagian yang sama merekam penolakan \`event_id\` yang sama, QR dinamis tanpa nominal, dan jenis jurnal yang tidak dikenal:

<Snippet file="labs/api-t4/output/skema.txt" lines="${R_REK[0]}:${R_REK[1]}" title="Rekaman lab: labs/api-t4/output/skema.txt (bagian E)" />

Satu hal kecil di \`topup_bank\`: \`jurnal_id\` UNIQUE, tetapi top-up yang belum dibayar punya \`jurnal_id\` kosong. Dokumentasi PostgreSQL menulis dua hal tentangnya:

- Dua nilai kosong tidak dianggap sama dalam UNIQUE, jadi banyak baris boleh punya \`jurnal_id\` kosong ([PostgreSQL 17, 5.5.3](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)).
- Foreign key yang kolomnya kosong tidak diperiksa ([PostgreSQL 17, 5.5.5](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-FK)).

Kedua kalimat dicek ke dokumentasi dan tidak dijalankan di lab (Tidak dijalankan).

**${K(migrasi.length)} rilis yang hanya menambah.** Ke${W(migrasi.length)} migration Tahap 4, ${NOMOR_MIG[0]} sampai ${NOMOR_MIG.at(-1)}, membuat tabel, menambah kolom, dan menambah aturan. ${K(DROP_CHECK)} aturan CHECK dihapus lalu dibuat lagi dengan nilai yang lebih banyak, dan tidak ada tabel atau kolom yang dihapus. Setiap file membuka dengan \`SET LOCAL lock_timeout = '${LOCK[0]}'\`.

Lab menjalankan ke${W(migrasi.length)}nya dalam satu transaction di schema kosong (Rekaman lab, \`skema.txt\` bagian A). Tidak dijalankan: ke${W(migrasi.length)} migration di atas database berisi data sementara server Tahap 3 masih melayani request, dan lama pemeriksaan CHECK baru pada \`jurnal\` berukuran produksi. Rilis seperti itu direkam di Tahap 2 ([[t2-m13]]).

**Pembagian modul dan schema.** Di database lab, ${N4} tabel dibagi ke ${W(NMODUL)} schema, satu schema satu modul. Pembagian ini bentuk akhir dari lab t4-modul, dan nama schema di lab berawalan \`${AWALAN_SCHEMA}\`. Tabel di bawah menghitung semuanya dari katalog database lab (Rekaman lab t4-modul, \`batas.txt\` bagian B).

| Modul (schema) | Tabel | Jumlah | Foreign key keluar yang menyeberang | Tabel terbaca oleh rolenya (ditolak) |
|---|---|---|---|---|
${MODUL_BARIS}

Role \`ledger\` terhitung membaca ${W(terbaca.get("ledger")!.baca)} tabel karena tiga kolom \`akun\` (\`id\`, \`tingkat\`, \`status\`) boleh dibacanya. Role lain hanya membaca tabel sendiri, dan tabel lain ditolak dengan SQLSTATE ${S_DITOLAK}. Jumlah foreign key yang menyeberang adalah ${LINTAS}: ${KE_AKUN_MODUL} menuju modul \`akun\` (${KE_TABEL("akun")} ke \`akun\`, ${W(KE_TABEL("kota"))} ke \`kota\`, ${W(KE_TABEL("perangkat"))} ke \`perangkat\`) dan ${KE_LEDGER} menuju \`jurnal\`.

Ke${W(NMODUL)} role ada dan diuji, tetapi hanya satu proses yang memakai role modulnya sendiri. Proses monolith memakai satu role, \`t4m_monolit\`, yang mewarisi ${W(NMODUL - 1)} role modul tanpa \`pembayaran\`. Role \`t4m_pembayaran\` dipakai oleh proses terpisah, yaitu service pembayaran. Satu pool koneksi per modul belum dibangun (Rekaman lab t4-modul, README bagian "Yang belum ada").

Foreign key lintas schema tetap ada, dan akun yang tidak ada ditolak dengan SQLSTATE ${S_FK_LINTAS}. Di lab, role \`pembayaran\` menulis \`topup_bank\` untuk akun yang ada tanpa hak apa pun di schema \`akun\`. Menurut dokumentasi PostgreSQL, schema tidak terpisah ketat: user boleh mengakses objek di schema mana pun bila punya hak ([PostgreSQL 17, 5.10](https://www.postgresql.org/docs/17/ddl-schemas.html)). Pemisahan modul karena itu ada di hak role, bukan di schema saja.

Alasan modul dipisah dibahas di [[t4-m32]] dan [[t4-modul]].

**Rancangan lawan lab.** Rancangan skema Tahap 4, diagram yang ditulis tim sebelum ada migration, dicocokkan dengan skema lab. Semua tabel dan hampir semua kolom sama. ${K(SELISIH.filter(Boolean).length)} selisih ditemukan, dan yang benar adalah skema lab (Rekaman lab, \`skema.txt\` bagian B dan perintah \`tools/erd.py --naskah 4\`).

| Yang digambar rancangan | Skema lab |
|---|---|
| \`outbox.tujuan\` ada di tengah kolom | Kolom terakhir, karena migration menambahnya sesudah kolom lama |
| \`produk.gambar_url\` ada di tengah kolom | Kolom terakhir, alasan yang sama |
| \`topup_bank\` tanpa \`tujuan_bayar\` | Ada \`tujuan_bayar\`: nomor tujuan dari gateway, kosong bila gateway belum menjawab |
| \`audit_log.hash\` tanpa tanda | UNIQUE (\`audit_log_hash_key\`) |
| \`webhook_event.jurnal_id\`: satu jurnal untuk satu baris | Tanpa UNIQUE, jadi satu jurnal boleh dirujuk banyak baris |
| \`insiden_rekon.jurnal_id\`: satu jurnal untuk satu baris | Tanpa UNIQUE, alasan yang sama |

Rancangan juga hanya menyebut \`dana_tertahan\` sebagai buku sistem. Lab menambah ${W(baruNilai("buku", "buku_jenis_check").length)} jenis buku dan ${W(baruNilai("jurnal", "jurnal_jenis_check").length)} jenis jurnal, dan aturan CHECK, UNIQUE, serta index sebagian yang tidak digambar rancangan.

### Pertumbuhan skala database, Tahap 3 sampai 5

Semua angka di tabel ini adalah **Asumsi** cerita. Rumusnya ditulis supaya kamu bisa mengganti angkanya:

- transaksi per hari = user × aktif × ${TRX}
- posting per tahun = transaksi per hari × ${POSTING_PER_TRX} × ${HARI}
- ukuran per tahun = posting per tahun × ${BYTE_POSTING} byte, termasuk index

| Tahap | User | Aktif | Tabel inti | Baris terbesar per tahun | Ukuran per tahun |
|---|---|---|---|---|---|
${BARIS_TUMBUH}

Contoh Tahap 4: ${titik(a4.user)} × ${a4.aktif}% × ${TRX} = ${titik(TRX_HARI4)} transaksi per hari. ${titik(TRX_HARI4)} × ${POSTING_PER_TRX} × ${HARI} = ${titik(P4)} posting, dan ${titik(P4)} × ${BYTE_POSTING} byte = ${titik(BYTE4)} byte, ditulis ±${duaKoma(GB(BYTE4))} GB. Tahap 3 dengan cara yang sama menghasilkan ${titik(P3)} posting dan ${titik(BYTE3)} byte ([[t3-skema]]).

Posting naik ${SEL(P4 / P3)} kali dari Tahap 3 ke Tahap 4 (${titik(P4)} ÷ ${titik(P3)}) dan ${SEL(P5 / P4)} kali ke Tahap 5 (${titik(P5)} ÷ ${titik(P4)}). Tabel inti Tahap 3 dan 4 dihitung dari ERD. Tahap 5 adalah rencana naskah tanpa lab: jumlah ±${TABEL5} tabel belum dicek ke skema, dan ±${duaKoma(P5 / 1e6)} juta posting adalah hasil rumus di atas.

**Tiga angka untuk satu tahun data Tahap 4.** Ketiganya menghitung hal yang berbeda, jadi tidak ditukar. Aktif ${a4.aktif}% dari ${titik(a4.user)} user adalah ${titik(aktif(a4))} user.

| Sumber | Yang dihitung | Hasil | Label |
|---|---|---|---|
| Rumus registry dengan 2 transaksi (halaman lama Tahap 4) | ${titik(aktif(a4))} × 2 × ${HARI} × ${BYTE_REG} byte, satu baris per transaksi | ±${koma(GB_REG2, 2)} GB | Asumsi |
| Rumus registry dengan 3 transaksi | ${titik(aktif(a4))} × ${TRX} × ${HARI} × ${BYTE_REG} byte, satu baris per transaksi | ±${koma(GB_REG3, 2)} GB | Asumsi |
| Rumus ledger (halaman ini) | ${titik(P4)} posting × ${BYTE_POSTING} byte | ±${koma(GB(BYTE4), 2)} GB | Asumsi |

Selisih ketiganya bukan kesalahan hitung. Dari baris pertama ke kedua, transaksi naik dari 2 ke ${TRX} per user (${TRX} ÷ 2 = ${koma(TRX / 2, 1)}). Dari baris kedua ke ketiga, satuannya berbeda: rumus ledger menghitung ${W(POSTING_PER_TRX)} posting ${BYTE_POSTING} byte (${POSTING_PER_TRX * BYTE_POSTING} byte per transaksi), rumus registry satu baris ${BYTE_REG} byte. Perbandingannya ${POSTING_PER_TRX * BYTE_POSTING} ÷ ${BYTE_REG} = ${koma((POSTING_PER_TRX * BYTE_POSTING) / BYTE_REG, 2)}, dan ketiganya satu orde besaran.

**File tumbuh paling cepat.** Registry memakai ${titik(a4.upload)} unggahan per hari (${titik(a4.upload / 2)} pendaftar × 2 file) dan ${a4.fileKB} KB per file, keduanya Asumsi. ${titik(a4.upload)} × ${a4.fileKB} KB × ${HARI} hari = ${titik(FILE_KB)} KB, yaitu ${FILE_GB} GB per tahun (1 KB = 1.000 byte). Itu ${KALI_LEDGER} kali posting ledger (${FILE_GB} ÷ ${koma(GB(BYTE4), 2)}) dan ${KALI_REG} kali rumus registry dengan ${TRX} transaksi (${FILE_GB} ÷ ${koma(GB_REG3, 2)}).

Karena itu \`verifikasi\` hanya menyimpan kunci objek dan checksum kartu dan swafoto, bukan isi file (Rekaman lab, ERD Tahap 4). Alasannya dibahas di [[t4-m33]].

**Tabel baru Tahap 4 kecil, kecuali \`outbox\` tanpa retensi.** Retensi adalah berapa lama baris disimpan sebelum dibuang. Ukuran per baris adalah Asumsi: ${WH_B} byte untuk \`webhook_event\` dan \`audit_log\`, ${VR_B} byte untuk \`verifikasi\`, dan ${OB_B} byte untuk \`outbox\`.

| Tabel | Rumus | Hasil | Label |
|---|---|---|---|
| \`webhook_event\` tanpa pembersihan | ${titik(WH_HARI)} × ${HARI} × ${WH_B} byte | ±${titik(MB(WH_HARI * HARI * WH_B))} MB | Asumsi (satu event per top-up) |
| \`webhook_event\` dengan retensi ${WH_RET} hari | ${titik(WH_HARI)} × ${WH_RET} × ${WH_B} byte | ±${titik(MB(WH_HARI * WH_RET * WH_B))} MB | Asumsi |
| \`audit_log\` | ${titik(AL_HARI)} × ${HARI} × ${AL_B} byte | ±${titik(MB(AL_HARI * HARI * AL_B))} MB | Asumsi (±${AL_STAF} staf × ${AL_AKSI} aksi per hari) |
| \`verifikasi\` | ${titik(VR_HARI)} × ${HARI} × ${VR_B} byte | ±${titik(MB(VR_HARI * HARI * VR_B))} MB | Asumsi (${titik(VR_HARI)} pendaftar per hari) |
| \`outbox\` tanpa pembersihan | ${titik(OB_HARI)} × ${HARI} × ${OB_B} byte | ±${koma(GB(OB_HARI * HARI * OB_B), 2)} GB | Asumsi (${titik(TRX_HARI4)} transaksi uang + ${titik(TOPUP_HARI)} top-up per hari) |
| \`outbox\` dengan retensi ${OB_RET} hari | ${titik(OB_HARI)} × ${OB_RET} × ${OB_B} byte | ±${koma(MB(OB_HARI * OB_RET * OB_B), 1)} MB | Asumsi |

Top-up per hari adalah ${titik(aktif(a4))} × ${koma(TOPUP_RATIO, 2)} = ${titik(TOPUP_HARI)} (${koma(TOPUP_RATIO, 2)} top-up per user aktif per hari, Asumsi). Lab belum punya retensi untuk \`webhook_event\`: README lab t4-webhook mencatatnya sebagai belum ada. Job pembersih \`outbox\` ada di lab Tahap 3 ([[t3-skema]]).

</Blok>

<Blok nama="Putuskan">

### Trade-off: kapan pakai apa

| Situasi | Pilihan |
|---|---|
| Fitur baru membawa uang dari luar, mis. top-up dari bank atau kartu | Tabel sendiri yang menunjuk ke \`jurnal_id\`; \`posting\` tidak berubah, dan ledger hanya menerima nilai \`jenis\` baru |
| Nilai baru di kolom \`jenis\` | Aturan CHECK diganti dalam migration yang sama dengan kodenya, dan jawaban API yang memuat nilai itu dicek oasdiff |
| Aturan yang harus benar di semua jalur | CHECK, UNIQUE, dan index sebagian di database, diuji dengan INSERT yang harus ditolak |
| Batas antar tim | Schema dan role per modul; foreign key lintas schema tetap ada, jadi modul masih satu database |
| File besar, mis. foto kartu identitas | Di penyimpanan objek, dan tabel hanya menyimpan kunci dan checksum |
| Perkiraan ukuran sebelum ada data | Rumus dengan angka berlabel; besaran yang menghitung hal berbeda ditulis sebagai besaran berbeda |

**Biaya skema Tahap 4.** Foreign key naik dari ${FK3} ke ${FK4}, dan \`akun\` dirujuk ${W(penunjuk(erd4, "akun"))} tabel, bukan ${W(penunjuk(erd3, "akun"))}. Ada ${LINTAS} foreign key yang menyeberang batas modul, jadi memisahkan database fisik per modul berarti membuangnya (Tidak dijalankan di lab t4-modul). Skema belum punya status untuk top-up yang jurnalnya sudah dibalik, dan itu pertanyaan terbuka: statusnya tetap \`dibayar\` (README lab t4-webhook, bagian "Yang belum ada").

### Sengaja belum dilakukan

| Yang ditunda | Kenapa ditunda | Muncul lagi di |
|---|---|---|
| Partisi \`posting\` per bulan | ±${duaKoma(P4 / 1e6)} juta posting per tahun (Asumsi); belum ada rekaman lab dengan ${titik(P4)} posting | Tahap 5, saat \`posting\` diperkirakan ±${duaKoma(P5 / 1e6)} juta per tahun (Asumsi) |
| Database fisik terpisah per modul | ${LINTAS} foreign key lintas schema masih ada, dan satu role monolith membaca ${W(NMODUL - 1)} modul | Belum dijadwalkan; lihat [[t4-modul]] |
| Satu pool koneksi per modul | Lab t4-modul belum membangunnya; monolith memakai satu role dan satu pool | Belum dijadwalkan |

</Blok>

<Blok nama="Kunci">

### Cek diri

**1.** Tabel Tahap 3 mana yang berubah di Tahap 4, dan apa yang berubah?

<details class="success">
<summary>Jawaban</summary>

${K(BERUBAH.length)} tabel: \`akun\` (kolom ${btDan(KBARU.filter((k) => k.tabel === "akun").map((k) => k.kolom)).replace(", dan ", " dan ")}, ${W(baruNilai("akun", "akun_jenis_check").length)} nilai \`jenis\` baru), \`buku\` (${W(baruNilai("buku", "buku_jenis_check").length)} nilai \`jenis\` baru), \`jurnal\` (${W(baruNilai("jurnal", "jurnal_jenis_check").length)} nilai \`jenis\` baru), \`outbox\` (kolom \`${KBARU.find((k) => k.tabel === "outbox")!.kolom}\` dan nilai \`${baruNilai("outbox", "outbox_jenis_check")[0]}\`), dan \`produk\` (kolom \`${KBARU.find((k) => k.tabel === "produk")!.kolom}\`). ${K(TETAP.length)} tabel lainnya tidak berubah.

</details>

**2.** Kenapa \`jurnal\` tidak mendapat kolom untuk top-up dari bank?

<details class="success">
<summary>Jawaban</summary>

Pencocokan top-up dan jurnal ada di \`topup_bank\`: \`order_id\` UNIK, dan \`jurnal_id\` UNIK menunjuk jurnalnya. Baris kedua dengan \`order_id\` yang sama ditolak dengan SQLSTATE ${S_ORDER_GANDA}. \`jurnal\` hanya menerima nilai \`jenis\` baru, termasuk \`topup_bank\`.

</details>

**3.** \`qr\` menolak QR dinamis tanpa nominal. Aturan apa yang menolaknya?

<details class="success">
<summary>Jawaban</summary>

CHECK \`qr_dinamis_terikat\` mewajibkan \`nominal\` dan \`berlaku_sampai\` terisi persis ketika \`jenis\` adalah \`dinamis\`. Melanggarnya ditolak dengan SQLSTATE ${S_QR}.

</details>

**4.** Dari rumus apa ±${duaKoma(GB(BYTE4))} GB posting per tahun di Tahap 4, dan kenapa ±${koma(GB_REG3, 2)} GB dan ±${koma(GB(BYTE4), 2)} GB berbeda?

<details class="success">
<summary>Jawaban</summary>

${titik(a4.user)} × ${a4.aktif}% × ${TRX} = ${titik(TRX_HARI4)} transaksi per hari. Lalu ${titik(TRX_HARI4)} × ${POSTING_PER_TRX} posting × ${HARI} hari = ${titik(P4)} posting, dan ${titik(P4)} × ${BYTE_POSTING} byte = ${titik(BYTE4)} byte. Angka ±${koma(GB_REG3, 2)} GB menghitung satu baris ${BYTE_REG} byte per transaksi, sedangkan ±${koma(GB(BYTE4), 2)} GB menghitung ${W(POSTING_PER_TRX)} posting ${BYTE_POSTING} byte per transaksi.

</details>

**5.** Berapa kali lipat ukuran file setahun dibanding posting setahun, dan apa akibatnya pada tabel \`verifikasi\`?

<details class="success">
<summary>Jawaban</summary>

File ${titik(a4.upload)} × ${a4.fileKB} KB × ${HARI} = ${FILE_GB} GB, sekitar ${KALI_LEDGER} kali posting (${FILE_GB} ÷ ${koma(GB(BYTE4), 2)}). Karena itu \`verifikasi\` menyimpan kunci objek dan checksum, bukan isi file. Semua angka ini Asumsi.

</details>

### Saat me-review kode AI, cek ini

- [ ] Fitur uang dari luar menambah tabel yang menunjuk ke \`jurnal_id\`, dan kolom status atau sumber tidak ditambahkan ke \`jurnal\` atau \`posting\`.
- [ ] Nilai \`jenis\` baru ditulis di aturan CHECK pada migration yang sama, dan INSERT dengan nilai yang tidak dikenal diuji harus ditolak.
- [ ] Aturan yang melindungi data (CHECK, UNIQUE) ada di migration, bukan hanya di service.
- [ ] Kode satu modul tidak membaca tabel modul lain langsung, dan role modul hanya punya hak atas schema miliknya.
- [ ] Rumus ukuran data menyebut apa yang dihitung (baris atau posting), ukuran per barisnya, dan label sumbernya.

### Bacaan lanjut

- [PostgreSQL 17: Unique Constraints](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL 17: Schemas](https://www.postgresql.org/docs/17/ddl-schemas.html)

</Blok>
`;

// ---- diagram Rantai dan tebakan yang diharapkan ---------------------------------------------------------------------------
const RANTAI_HARAPAN = {
  id: "t4-skema-inti",
  judul: "Skema Tahap 3 ke Tahap 4: tabel dan ukuran",
  sumber: { jenis: "asumsi", teks: "Baris 1 rekaman lab, baris 2 Asumsi" },
  baris: [
    {
      label: "Tabel",
      sub: "dari ERD lab",
      simpul: [
        { teks: `${N3} tabel`, sub: "akhir Tahap 3", nada: "old" },
        { teks: `+ ${NBARU} tabel`, sub: "tabel uang tanpa kolom baru", nada: "system" },
        { teks: `${N4} tabel`, sub: `${W(NMODUL)} modul`, nada: "good" },
      ],
    },
    {
      label: "Per tahun",
      sub: "Asumsi",
      simpul: [
        { teks: `posting ±${duaKoma(GB(BYTE4))} GB`, sub: `${koma(GB(BYTE4), 2)} GB`, nada: "system" },
        { teks: `file ${FILE_GB} GB`, sub: `${KALI_LEDGER} kali posting`, nada: "warn" },
        { teks: "tabel simpan kunci file", sub: "kunci dan checksum", nada: "good" },
      ],
    },
  ],
  catatan: "Abu-abu: Tahap 3. Biru: yang ditambahkan. Kuning: yang tumbuh paling cepat. Hijau: hasilnya. Rumus ukuran ada di blok Paham.",
};
const PILIHAN_BENAR = `Tidak ada kolom baru. buku dan jurnal menerima nilai jenis baru, dan posting sama persis.`;
const TEBAK_HARAPAN = {
  id: "t4-skema-tebak",
  judul: "Tabel uang di Tahap 4",
  sumber: { jenis: "rekaman", teks: "labs/api-t4/output/skema.txt bagian A, C, D, dan E; ERD dari situs/data/erd/tahap-3.json dan tahap-4.json" },
  adegan: [
    `Raka membuka ERD Tahap 3 dan ERD Tahap 4 berdampingan. Tahap 3 punya ${N3} tabel dan Tahap 4 punya ${N4}.`,
    "Uang dari rekening bank harus masuk ke ledger yang sudah ada. Raka bertanya apakah tabel uang ikut berubah.",
  ],
  pertanyaan: "Apa yang berubah di tabel buku, jurnal, dan posting?",
  pilihan: [
    {
      teks: "Tidak ada yang berubah. Uang dari bank memakai jenis buku dan jenis jurnal yang sudah ada.",
      benar: false,
      alasan: `Aturan jenis berubah di buku dan jurnal. Buku menerima ${W(baruNilai("buku", "buku_jenis_check").length)} jenis baru, termasuk ${baruNilai("buku", "buku_jenis_check")[2]}, dan jurnal menerima ${W(baruNilai("jurnal", "jurnal_jenis_check").length)}, termasuk ${baruNilai("jurnal", "jurnal_jenis_check")[0]}. Uang dari bank tidak punya tempat tanpa jenis itu.`,
    },
    {
      teks: "jurnal mendapat kolom order_id dari gateway, supaya satu jurnal bisa dicocokkan dengan satu top-up.",
      benar: false,
      alasan: `Tidak ada kolom baru di jurnal. Pencocokan ada di topup_bank: ${UNIK_TB[0]} UNIK, dan ${UNIK_TB[1]} UNIK menunjuk ke jurnalnya. Baris kedua dengan ${UNIK_TB[0]} yang sama ditolak dengan SQLSTATE ${S_ORDER_GANDA}.`,
    },
    {
      teks: PILIHAN_BENAR,
      benar: true,
      alasan: `Kolom baru Tahap 4 hanya ${W(KBARU.length)}, dan tak satu pun ada di buku, jurnal, atau posting. Buku bank mencatat uang yang masuk dari luar, sebagai lawan buku pemakai. Role aplikasi bahkan tidak boleh mengubah posting: UPDATE ditolak dengan SQLSTATE ${S_POSTING_UPDATE}.`,
    },
    {
      teks: "posting mendapat kolom sumber, supaya baris dari bank dibedakan dari baris pembayaran biasa.",
      benar: false,
      alasan: `posting tidak berubah. Asal uang tercatat di jurnal dan buku: di data awal lab, buku bank bersaldo ${rp(SALDO_BANK)}, dan ${BUKU_PEMAKAI.buku} buku pemakai berjumlah ${rp(BUKU_PEMAKAI.saldo)}.`,
    },
  ],
  penutup: "Uang dari luar tidak mengubah bentuk ledger. Ia mengikuti jurnal lewat tabel baru, dan yang bertambah di tabel uang hanya nama jenis.",
  label: { sumber: "Rekaman lab · skema.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" },
};

// ---- bantu -------------------------------------------------------------------------------------------------------------------
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const front = mdx.split(/^---\n/m)[1]!;
const naskahBagian = (awal: RegExp, akhir: RegExp): string[] => {
  const a = naskahBaris.findIndex((b) => awal.test(b));
  const z = naskahBaris.findIndex((b, i) => i > a && akhir.test(b));
  if (a < 0 || z < 0) throw new Error(`naskah: ${awal} tidak ada`);
  return naskahBaris.slice(a, z);
};
const sel = (b: string): string[] => b.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((s) => s.trim());
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\\?\|[^\]]+)?\]\]/g;

// ---- isi halaman: seluruhnya sama dengan teks yang dibangun dari sumber ---------------------------------------------------
describe("isi halaman 4.5 dibangun dari sumber", () => {
  test("skema-data.mdx sama persis dengan teks yang diturunkan dari ERD, rekaman, registry, naskah, dan kalimat terkunci", () => {
    expect(mdx).toBe(HARAPAN);
  });
  test("diagram Rantai sama dengan nilai turunan, dan lolos skema Zod", () => {
    expect(rantaiMentah).toEqual(RANTAI_HARAPAN);
    expect(() => DataRantai.parse(rantaiMentah)).not.toThrow();
  });
  test("tebakan sama dengan nilai turunan, lolos skema Zod, satu jawaban benar di pilihan ketiga", () => {
    expect(tebakMentah).toEqual(TEBAK_HARAPAN);
    const d = DataTebak.parse(tebakMentah);
    expect(d.pilihan.map((p) => p.benar)).toEqual([false, false, true, false]);
    expect(d.pilihan[2]!.teks).toBe(PILIHAN_BENAR);
  });
  test("noscript menulis jawaban yang tepat, sama dengan pilihan benar tebakan", () => {
    const m = mdx.match(/<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan\. Jawaban yang tepat: (.+)<\/p>\n<\/noscript>/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(PILIHAN_BENAR[0]!.toLowerCase() + PILIHAN_BENAR.slice(1));
  });
});

describe("registry, kepala, dan struktur blok", () => {
  const h = per("t4-skema");
  const peta = naskahBaris.find((b) => b.startsWith("| 4.5 |"))!;
  test("terdaftar sebagai Konsep bagian 3b, berprasyarat 4.4, ada, jalur inti, dan sama dengan peta naskah", () => {
    expect([h.tahap, h.jenis, h.bagian, h.prasyarat, h.ada, h.inti, h.nomor, h.peran, h.lab]).toEqual([4, "konsep", "3b", ["t4-dua-arah"], true, true, "4.5", ["backend"], ["api-t3", "api-t4"]]);
    expect(sel(peta)).toEqual(["4.5", "3b", h.judul, "Konsep", "★", "api-t3, api-t4", "ERD bertumbuh"]);
    expect(mdx).toContain(`title: "4.5 ${h.judul}"`);
    expect(h.path).toBe("tahap-4/skema-data.md");
  });
  test("lima blok: Mulai dan Coba terbuka, sisanya tertutup", () => {
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
  });
  test("menit baca: registry sama dengan baca + coba, dan sesuai jumlah kata", () => {
    expect(h.menit).toBe(BACA + COBA);
    const isi = mdx.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - BACA), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("semua tautan [[ID]] ada di registry, label M-nomor menuju halaman Masalah itu, dan | di sel tabel ditulis \\|", () => {
    const ids = [...badan.matchAll(TOKEN)].map((m) => m[1]!);
    for (const id of ids.filter((x) => x !== "berikutnya")) expect(HALAMAN.some((x) => x.id === id), `registry tanpa ${id}`).toBe(true);
    for (const m of badan.matchAll(/\[\[(t4-m(\d+))\\\|M(\d+)\]\]/g)) expect([m[2], per(m[1]!).judul.startsWith(`M${m[2]}:`)]).toEqual([m[3], true]);
    expect(badan).not.toMatch(/\[\[[^\]]*[^\\]\|[^\]]*\]\]/);
    expect(ids).toContain(h.prasyarat![0]);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca (halaman, diagram, tebakan)", () => {
    const semua = [mdx, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah)].join("\n");
    expect(semua).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(semua).not.toMatch(/keputusan \d+|PR #\d+|#\d{3}\b/i);
  });
  test("gaya: tanpa Anda, kita, tanda seru, atau emoji", () => {
    for (const t of [mdx, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah)]) {
      expect(t).not.toMatch(/\bAnda\b|\bkita\b|\bKita\b/);
      expect(t.replace(/<!--[\s\S]*?-->/g, "")).not.toMatch(/!(?!\[)/);
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
    }
    expect(front).toContain("description:");
  });
});

// ---- turunan dari sumber: nilai yang dipakai di atas diperiksa terhadap naskah dan rekaman ----------------------------------
describe("nilai turunan cocok dengan naskah dan rekaman", () => {
  test("ERD: 14 + 8 = 22 tabel, 35 foreign key, empat kolom baru, tanpa yang dihapus (sesuai naskah)", () => {
    expect([N3, NBARU, N4, FK3, FK4]).toEqual([14, 8, 22, 20, 35]);
    expect(naskah).toContain(`Jumlahnya ${N4} tabel: ${N3} dari Tahap 3 dan ${NBARU} baru`);
    expect(naskah).toContain(`memberi ${N4} tabel dan ${FK4} foreign key`);
    expect(KBARU.map((k) => `${k.tabel}.${k.kolom}`)).toEqual(["akun.tingkat", "akun.status", "outbox.tujuan", "produk.gambar_url"]);
    expect(erd4.selisih.terhadap).toBe(3);
    expect([erd3.tahap, erd4.tahap]).toEqual([3, 4]);
    expect([erd4.selisih.tabel_dihapus, erd4.selisih.kolom_dihapus]).toEqual([[], []]);
    expect(mdx).toContain("<ErdHalaman id=\"erd-t4\" tahap={[3, 4]} />");
  });
  test("delapan tabel baru sama dengan baris tabel 'Apa yang berubah' di naskah, urutannya sama", () => {
    const baris = naskahBagian(/^### Apa yang berubah dan kenapa/, /^Pembagian modul dan schema berikut/).filter((b) => /^\| \(tidak ada\) \| `/.test(b));
    expect(baris.map((b) => sel(b)[1]!.match(/^`(\w+)`/)![1])).toEqual(BARU);
    expect(BARU).toEqual(["topup_bank", "webhook_event", "insiden_rekon", "verifikasi", "qr", "kartu", "otorisasi_kartu", "audit_log"]);
  });
  test("lima tabel berubah dan sembilan tetap: tepat yang ditandai selisih ERD, dan buku, jurnal, posting tanpa kolom baru", () => {
    const ditandai = [...new Set([...KBARU.map((k) => k.tabel), ...erd4.selisih.aturan_berubah.map((a) => a.tabel)])];
    expect(BERUBAH).toEqual(erd3.tabel.map((t) => t.nama).filter((n) => ditandai.includes(n)));
    expect(BERUBAH).toEqual(["akun", "buku", "jurnal", "outbox", "produk"]);
    expect(TETAP).toHaveLength(9);
    for (const t of ["buku", "jurnal", "posting"]) expect(KBARU.some((k) => k.tabel === t), `${t} punya kolom baru`).toBe(false);
    expect(TETAP).toContain("posting");
    expect(erd4.selisih.aturan_berubah.filter((a) => a.tabel === "buku" || a.tabel === "jurnal").map((a) => a.nama)).toEqual(["buku_jenis_check", "buku_pemilik", "jurnal_jenis_check"]);
  });
  test("foreign key baru: enam ke akun, enam ke jurnal, dua ke topup_bank, satu ke kartu, jumlahnya selisih 35 − 20", () => {
    const kelas = [menuju(erd4, "akun") - menuju(erd3, "akun"), menuju(erd4, "jurnal") - menuju(erd3, "jurnal"), menuju(erd4, "topup_bank"), menuju(erd4, "kartu")];
    expect(kelas).toEqual([6, 6, 2, 1]);
    expect(kelas.reduce((a, b) => a + b, 0)).toBe(FK4 - FK3);
    expect([penunjuk(erd3, "akun"), penunjuk(erd3, "jurnal"), penunjuk(erd4, "akun"), penunjuk(erd4, "jurnal")]).toEqual([8, 5, 13, 10]);
  });
  test("nilai jenis baru: lima di buku, tiga di jurnal, tiga di akun, satu di outbox; tidak ada nilai yang hilang", () => {
    expect(baruNilai("buku", "buku_jenis_check")).toEqual(["pemakai", "merchant", "bank", "dana_tertahan", "settlement_kartu"]);
    expect(baruNilai("jurnal", "jurnal_jenis_check")).toEqual(["topup_bank", "kartu_tahan", "kartu_tangkap"]);
    expect(baruNilai("akun", "akun_jenis_check")).toEqual(["pemakai", "merchant", "risk"]);
    expect(baruNilai("outbox", "outbox_jenis_check")).toEqual(["verifikasi"]);
    for (const [t, c] of [["buku", "buku_jenis_check"], ["jurnal", "jurnal_jenis_check"], ["akun", "akun_jenis_check"], ["outbox", "outbox_jenis_check"]] as const) {
      expect(nilaiCek(erd3, t, c).every((x) => nilaiCek(erd4, t, c).includes(x)), `${t}.${c} kehilangan nilai`).toBe(true);
    }
    expect(naskah).toContain("Nilai `jenis` yang bertambah di CHECK lab: `buku` (`pemakai`, `merchant`, `bank`, `dana_tertahan`, `settlement_kartu`) dan `jurnal` (`topup_bank`, `kartu_tahan`, `kartu_tangkap`)");
    expect(naskah).toContain("Blok hanya menyebut akun sistem dana tertahan.");
  });
  test("nama kolom yang disebut di sel tabel 'tabel baru' ada di ERD Tahap 4 (alias: akun, kartu, pelaku, penyetuju)", () => {
    const alias: Record<string, string> = { akun: "akun_id", kartu: "kartu_id", pelaku: "pelaku_id", penyetuju: "penyetuju_id", "event_id sebagai kunci utama": "event_id" };
    const baris = badan.split("\n").filter((b) => /^\| \(tidak ada\) \| `/.test(b));
    expect(baris).toHaveLength(NBARU);
    for (const b of baris) {
      const k = sel(b)[1]!;
      const nama = k.match(/^`(\w+)` \((.*)\)$/)!;
      const t = per4.get(nama[1]!)!;
      const kolom = t.kolom.map((c) => c.nama);
      for (let isi of nama[2]!.split(/[,;]/).map((x) => x.trim())) {
        isi = isi.replace(/^(status|jenis|hasil|subjek): /, "").replace(/ UNIK$/, "");
        const first = isi.split(" ")[0]!.replace(/`/g, "");
        if (/^(menunggu|dibayar|kedaluwarsa|gagal|tidak_pasti|diproses|ganda|diparkir|ditolak|tidak_di_ledger|tidak_di_gateway|jumlah_beda|statis|ditahan|ditangkap|dibalik|pemakai|merchant|atau|dinamis)$/.test(first)) continue;
        if (first === "kunci") { expect(kolom).toEqual(expect.arrayContaining(["berkas_kartu_kunci", "berkas_swafoto_kunci", "checksum_kartu", "checksum_swafoto"])); continue; }
        expect(kolom.includes(alias[isi] ?? first), `${t.nama}: kolom ${isi} tidak ada`).toBe(true);
      }
    }
  });
  test("klaim UNIK di tabel: order_id, jurnal_id, token_penerbit, id_penerbit, hash UNIQUE di ERD; topup_bank.jurnal_id boleh kosong", () => {
    const unik = (t: string): string[] => per4.get(t)!.unik.flatMap((u) => u.kolom);
    expect(unik("topup_bank").sort()).toEqual(["jurnal_id", "order_id"]);
    expect(unik("kartu")).toContain("token_penerbit");
    expect(unik("otorisasi_kartu")).toContain("id_penerbit");
    expect(unik("audit_log")).toEqual(["hash"]);
    expect(unik("qr")).toEqual(["jurnal_id"]);
    expect(per4.get("webhook_event")!.pk).toEqual(["event_id"]);
    expect(TB.kolom.find((k) => k.nama === "jurnal_id")!.wajib).toBe(false);
    expect(per4.get("insiden_rekon")!.unik.map((u) => u.kolom)).toEqual([["tanggal", "order_id", "jenis"]]);
    expect(per4.get("qr")!.cek.some((c) => c.nama === "qr_dinamis_terikat" && /nominal IS NOT NULL/.test(c.ekspresi) && /berlaku_sampai IS NOT NULL/.test(c.ekspresi))).toBe(true);
  });
  test("klaim 'tanpa isi file': tak ada kolom bytea di ERD Tahap 4, dan verifikasi memuat kunci objek dan checksum", () => {
    expect(erd4.tabel.flatMap((t) => t.kolom).filter((k) => /bytea/.test(k.tipe))).toEqual([]);
    expect(per4.get("verifikasi")!.kolom.map((k) => k.nama)).toEqual(expect.arrayContaining(["berkas_kartu_kunci", "berkas_swafoto_kunci", "checksum_kartu", "checksum_swafoto"]));
    expect(migrasi[2]!.isi).toContain("File identitas ada di penyimpanan objek; database hanya menyimpan kunci objek dan checksum");
  });
  test("pembagian modul: tabel sama dengan ERD, 21 foreign key lintas schema sama dengan batas.txt, asal dan tujuan per modul", () => {
    expect(modul.modul.flatMap((m) => m.tabel).sort()).toEqual(erd4.tabel.map((t) => t.nama).sort());
    expect(modul.modul.map((m) => m.tabel.length)).toEqual([6, 4, 1, 4, 5, 2]);
    expect(LINTAS).toBe(21);
    expect(batasB.join("\n")).toContain(`kunci asing yang menyeberang schema modul: ${LINTAS}; tujuan: akun.akun x${KE_TABEL("akun")}, akun.kota x${KE_TABEL("kota")}, akun.perangkat x${KE_TABEL("perangkat")}, ledger.jurnal x${KE_TABEL("jurnal")}`);
    expect(batasB.join("\n")).toContain(`asal kunci asing lintas schema: ${modul.modul.filter((m) => keluar(m.nama) > 0).map((m) => `${m.nama} ${keluar(m.nama)}`).sort().join(", ")}`);
    expect(modul.lintas.filter((l) => l.ke_modul === "ledger").every((l) => l.ke_tabel === "jurnal")).toBe(true);
    expect(modul.lintas.filter((l) => l.ke_modul === "akun").every((l) => ["akun", "kota", "perangkat"].includes(l.ke_tabel))).toBe(true);
    expect(KE_AKUN_MODUL + KE_LEDGER).toBe(LINTAS);
    for (const m of modul.modul) {
      const t = terbaca.get(m.nama)!;
      expect(t.baca + t.tolak, `${m.nama}: terbaca + ditolak`).toBe(N4);
      expect(m.schema).toBe(`${AWALAN_SCHEMA}${m.nama}`);
    }
    expect(AWALAN_SCHEMA).toBe("t4m_");
    expect(S_DITOLAK).toBe("42501");
    expect([...terbaca.values()].every((t) => t.kode === S_DITOLAK), "semua role menolak dengan kode yang sama").toBe(true);
    expect(terbaca.size).toBe(NMODUL);
  });
  test("klaim tentang role: kontrak kolom ledger, role lain hanya tabel sendiri, monolith satu role, pembayaran proses terpisah, pool belum dibangun", () => {
    const baris = (nama: string): string => batasB.find((b) => b.startsWith(`role t4m_${nama}:`))!;
    expect(baris("ledger")).toContain("(milik sendiri dan kolom id, tingkat, status akun)");
    for (const m of ["akun", "identitas", "merchant", "pembayaran", "platform"]) expect(baris(m), m).toContain("tabel terbaca (milik sendiri)");
    expect(batasB.join("\n")).toContain("t4m_monolit anggota lima role modul tanpa admin option");
    expect(batasB.join("\n")).toContain("role t4m_monolit: 17 tabel lima modul terbaca; 5 tabel pembayaran ditolak");
    expect(batasB.join("\n")).toContain("role t4m_pembayaran menulis topup_bank untuk akun yang ada: berhasil tanpa hak apa pun di schema akun");
    expect(batasB.join("\n")).toContain(`violates foreign key constraint "topup_bank_akun_id_fkey" (${S_FK_LINTAS})`);
    expect(readmeModul).toContain("keenam role ada dan dites sebagai kontrak");
    expect(readmeModul).toContain("`t4m_monolit` (mewarisi lima role modul; tanpa `t4m_pembayaran`)");
    expect(readmeModul).toContain("Role `t4m_pembayaran` dipakai sungguhan oleh proses terpisah");
    expect(readmeModul).toContain("Satu pool per modul belum dibangun");
    expect(readmeModul).toContain("## Yang belum ada di lab ini");
    expect(readmeModul).toContain("Proses monolith memakai satu role (`t4m_monolit`); satu pool per modul dan transaction yang menyeberang modul lewat API belum dibangun");
    expect(readmeModul).toContain("Memisahkan database fisik memerlukan membuangnya; Tidak dijalankan.");
    expect(S_FK_LINTAS).toBe("23503");
  });
  test("keenam role dan satu pool: pembayaran 'service sendiri' di tabel modul sama dengan README (service pembayaran)", () => {
    expect(readmeModul).toContain("`pembayaran` 5 (`topup_bank`, `webhook_event`, `insiden_rekon`, `kartu`, `otorisasi_kartu`)");
    expect(MODUL_BARIS.split("\n")).toHaveLength(NMODUL);
  });
  test("rumus ukuran: konstanta dari naskah dan registry, tiga besaran, file 365 GB, tabel kecil, dan Tahap 5 dari naskah", () => {
    expect([TRX, POSTING_PER_TRX, HARI, BYTE_POSTING, BYTE_REG]).toEqual([3, 2, 365, 250, 300]);
    expect([a4.user, a4.aktif, a4.upload, a4.fileKB]).toEqual([100000, 20, 2000, 500]);
    expect(naskah).toContain("20.000 × 2 × 365 × 300 B = 4,38 GB");
    expect(naskah).toContain("memberi 6,57 GB (20.000 × 3 × 365");
    expect(naskah).toContain("rumus ledger memberi 10,95 GB");
    expect(naskah).toContain("**File 2.000 × 500 KB × 365 = 365 GB per tahun.** Itu sekitar 33 kali posting ledger (365 ÷ 10,95) dan 56 kali rumus registry dengan 3 transaksi (365 ÷ 6,57)");
    expect([koma(GB_REG2, 2), koma(GB_REG3, 2), koma(GB(BYTE4), 2)]).toEqual(["4,38", "6,57", "10,95"]);
    expect([FILE_GB, KALI_LEDGER, KALI_REG]).toEqual([365, 33, 56]);
    expect([duaKoma(P3 / 1e6), duaKoma(P4 / 1e6), duaKoma(P5 / 1e6)]).toEqual(["5,5", "44", "440"]);
    expect([duaKoma(GB(BYTE3)), duaKoma(GB(BYTE4)), duaKoma(GB(P5 * BYTE_POSTING))]).toEqual(["1,4", "11", "110"]);
    expect([BARIS5[2], BARIS5[3]]).toEqual(["440", "110"]);
    expect(TABEL5).toBe(30);
    expect([N3, N4]).toEqual([14, 22]);
    expect(naskah).toContain("| 3 | 10.000 | 14 | `posting` ±5,5 juta | ±1,4 GB |");
    expect(naskah).toContain("| 4 | 100.000 | 22, dibagi per modul | `posting` ±44 juta (20.000 × 3 × 2 × 365 = 43,8 juta) | ±11 GB (10,95 GB) |");
    expect(naskah).toContain("1.000 pendaftar × 2 file");
    expect(naskah).toContain(`*Posting per tahun = transaksi per hari × ${POSTING_PER_TRX} × ${HARI}*, ±${BYTE_POSTING} byte per posting termasuk index`);
    expect(naskah).toContain("Halaman lama Tahap 4 menulis ±4,4 GB (rumus registry dengan 2 transaksi per user: 20.000 × 2 × 365 × 300 B = 4,38 GB)");
    expect(naskah).toContain("22 tabel (6, 4, 1, 4, 5, 2), dan 21 foreign key lintas modul");
    expect(naskah).toContain("14 menuju tabel modul `akun` (12 ke `akun`, satu ke `kota`, satu ke `perangkat`) dan 7 menuju `jurnal`");
    expect(naskah).toContain("(400 B per baris adalah Asumsi)");
    expect(naskah).toContain("(500 B Asumsi)");
    expect(naskah).toContain(`${titik(OB_HARI)} × ${OB_RET} × ${OB_B} B ≈ 136,5 MB dengan retensi ${OB_RET} hari`);
    expect([WH[3], WH[4], AL[5], VR[3], OB[3], OB[5]]).toEqual([titik(MB(WH_HARI * HARI * WH_B)), titik(MB(WH_HARI * WH_RET * WH_B)), titik(MB(AL_HARI * HARI * AL_B)), titik(MB(VR_HARI * HARI * VR_B)), koma(GB(OB_HARI * HARI * OB_B), 2), koma(MB(OB_HARI * OB_RET * OB_B), 1)]);
    expect(naskah).toContain("`audit_log` 2.000 aksi per hari");
    expect([WH_HARI, WH_B, WH_RET, AL_HARI, AL_B, VR_HARI, VR_B, OB_HARI, OB_B, OB_RET]).toEqual([5000, 400, 30, 2000, 400, 1000, 500, 65000, 300, 7]);
    expect([titik(MB(WH_HARI * HARI * WH_B)), titik(MB(WH_HARI * WH_RET * WH_B)), titik(MB(AL_HARI * HARI * AL_B)), titik(MB(VR_HARI * HARI * VR_B)), koma(GB(OB_HARI * HARI * OB_B), 2), koma(MB(OB_HARI * OB_RET * OB_B), 1)]).toEqual(["730", "60", "292", "183", "7,12", "136,5"]);
    expect([TRX_HARI4, TOPUP_HARI, TRX_HARI4 + TOPUP_HARI]).toEqual([60000, 5000, OB_HARI]);
    expect([P3, P4, P5]).toEqual([5475000, 43800000, 438000000]);
    expect(SEL(P4 / P3)).toBe("8,0");
    expect(SEL(P5 / P4)).toBe("10,0");
  });
});

// ---- rekaman, kontrak, migration, dan README: setiap rujukan menunjuk bagian yang ada --------------------------------------
describe("rujukan rekaman, README, migration, dan kontrak", () => {
  test("rujukan 'bagian X' menunjuk bagian yang ada di berkasnya", () => {
    for (const k of ["A", "B", "C", "D", "E"]) expect(skemaTxt.some((b) => b.startsWith(`# --- ${k}. `)), `skema.txt bagian ${k}`).toBe(true);
    expect(badan).toContain("(Rekaman lab api-t4, `kontrak.txt`)");
    expect(badan).toContain("(Rekaman lab, `skema.txt` bagian A, B, dan E)");
    expect(badan).toContain("(Rekaman lab, `skema.txt` bagian C)");
    expect(badan).toContain("(Rekaman lab, `skema.txt` bagian E)");
    expect(badan).toContain("(Rekaman lab, `skema.txt` bagian A)");
    expect(badan).toContain("(Rekaman lab, `skema.txt` bagian B dan perintah `tools/erd.py --naskah 4`)");
    expect(batasTxt.some((b) => b.startsWith("# --- B. "))).toBe(true);
    expect(badan).toContain("(Rekaman lab t4-modul, `batas.txt` bagian B)");
    expect(ledgerTxt.some((b) => b.startsWith("# --- A. "))).toBe(true);
    expect(badan).toContain("(Rekaman lab t4-modul, `ledger.txt` bagian A)");
    expect(skemaTxt.join("\n")).toContain("(satu transaction, schema kosong)");
    for (const n of NOMOR_MIG) expect(skemaTxt.some((b) => b.startsWith(`$ psql -1 -f migrasi/${n}_`)), `psql ${n}`).toBe(true);
  });
  test("rekaman C dan D: saldo buku bank dan pemakai, dan role aplikasi tidak bisa UPDATE posting atau audit_log", () => {
    expect(bukuC.get("bank")).toEqual({ buku: 1, saldo: -100400000 });
    expect(bukuC.get("pemakai")).toEqual({ buku: 200, saldo: 100400000 });
    expect(SALDO_BANK + BUKU_PEMAKAI.saldo).toBe(0);
    expect(S_POSTING_UPDATE).toBe("42501");
    for (const sql of ["UPDATE audit_log SET aksi = 'x' WHERE id = 1;", "DELETE FROM audit_log WHERE id = 1;", "UPDATE posting SET jumlah = 1 WHERE id = 1;"]) {
      const i = D.findIndex((b) => b.endsWith(sql));
      expect(i, sql).toBeGreaterThan(0);
      expect(D[i + 1]).toContain("permission denied");
      expect(D[i + 2]).toContain("SQLSTATE 42501");
    }
  });
  test("rekaman E: jumlah nol, order_id ganda, event_id ganda, QR dinamis tanpa nominal, dan jenis jurnal asing ditolak, dengan SQLSTATE yang ditulis", () => {
    expect([S_ORDER_GANDA, S_QR]).toEqual(["23505", "23514"]);
    expect(E.join("\n")).toContain("violates check constraint \"topup_bank_jumlah_check\"");
    expect(E.join("\n")).toContain("duplicate key value violates unique constraint \"webhook_event_pkey\"");
    expect(E.join("\n")).toContain("violates check constraint \"qr_dinamis_terikat\"");
    expect(skemaTxt.join("\n")).toContain("violates check constraint \"jurnal_jenis_check\"");
    expect(skemaTxt.join("\n")).toContain("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('kartu_bebas', 'x', 400)");
  });
  test("Snippet: dua, rentang menempel pada jangkar, dan rentang tidak memuat ID riset, nomor keputusan, atau komentar lab internal", () => {
    const tag = [...mdx.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"[^>]*\/>/g)];
    expect(tag).toHaveLength(2);
    const [mig, rek] = tag;
    expect(mig![1]).toBe("labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql");
    expect(rek![1]).toBe("labs/api-t4/output/skema.txt");
    const potong = (berkas: string, a: string, z: string): string[] => baca(berkas).split("\n").slice(Number(a) - 1, Number(z));
    const m = potong(mig![1]!, mig![2]!, mig![3]!);
    expect(m[0]).toBe("ALTER TABLE buku DROP CONSTRAINT buku_jenis_check;");
    expect(m.at(-1)).toMatch(/^INSERT INTO buku \(jenis\) VALUES \('bank'\)/);
    const r = potong(rek![1]!, rek![2]!, rek![3]!);
    expect(r[0]).toMatch(/^=> INSERT INTO topup_bank .* VALUES \(419, 'X', 0,/);
    expect(r.at(-1)).toBe("   -- SQLSTATE 23505 · constraint topup_bank_order_id_key");
    for (const baris of [...m, ...r]) expect(baris).not.toMatch(/R\d-\d+|keputusan|naskah|PR #|lab-api|\btugas\b|Tahap 4, rilis/i);
    expect(m.join("\n")).toContain("lawan top-up dari rekening bank; makin negatif = makin banyak uang masuk dari luar");
  });
  test("empat rilis: file migration berurutan, lock_timeout sama, enam DROP CONSTRAINT, tanpa DROP tabel atau kolom (lingkup: labs/api-t4/migrasi)", () => {
    expect(NOMOR_MIG).toEqual(["000020", "000021", "000022", "000023"]);
    expect(LOCK).toEqual(["3s"]);
    expect(DROP_CHECK).toBe(6);
    for (const m of migrasi) expect(m.isi, m.nama).not.toMatch(/DROP (TABLE|COLUMN)/i);
    expect(erd3.sumber.file.some((f) => f.includes("000020"))).toBe(false);
    expect(erd4.sumber.file.filter((f) => f.startsWith("labs/api-t4/migrasi/")).map((f) => f.match(/\/(\d{6})_/)![1])).toEqual(NOMOR_MIG);
    expect(NOMOR_T3).toBe("000019");
    expect(erd4.sumber.file.filter((f) => f.startsWith("labs/api-t3/migrasi/")).map((f) => f.match(/\/(\d{6})_/)![1]).at(-1)).toBe(NOMOR_T3);
  });
  test("oasdiff menandai ketiga nilai jenis akun baru sebagai perubahan yang bisa merusak client berenum tertutup", () => {
    for (const v of baruNilai("akun", "akun_jenis_check")) {
      expect(kontrakTxt, v).toContain(`added the new \`${v}\` enum value to the \`jenis\` response property for the response status \`200\``);
    }
    expect(kontrakTxt).toContain("[response-property-enum-value-added]");
  });
  test("API ledger menerima order_id sebagai Idempotency-Key, key lain ditolak 422, dan satu jurnal per key", () => {
    expect(S422).toBe("422");
    const i = ledgerTxt.findIndex((b) => b === "# Idempotency-Key bukan order_id");
    expect(ledgerTxt.slice(i, i + 8).join("\n")).toContain("{\"alasan\":\"tidak-sah\",\"field\":\"Idempotency-Key\"}");
    expect(ledgerTxt.join("\n")).toContain("top-up Rp200.000 dengan key = order_id");
    expect(ledgerTxt.join("\n")).toMatch(/jurnal_untuk_key \| posting\n-+\+-+\n 1\s+\| 2/);
  });
  test("README t4-webhook: retensi webhook_event belum ada dan status top-up tetap dibayar sesudah jurnal dibalik; job pembersih outbox di Tahap 3", () => {
    expect(readmeWebhook).toContain("## Yang belum ada di lab ini");
    expect(readmeWebhook).toContain("retensi `webhook_event` 30 hari: tidak ada");
    expect(readmeWebhook).toContain("`topup_bank.status` tetap `dibayar` dan `jurnal_id` tetap menunjuk jurnal yang sudah dibalik");
    expect(baca("labs/t3-outbox/output/listen.txt")).toContain("# --- C. ");
  });
  test("tabel uang berlabel: buku dan jurnal tidak mendapat kolom, dan jenis baru dicek di CHECK migration 000020", () => {
    const sql = migrasi[0]!.isi;
    for (const v of baruNilai("buku", "buku_jenis_check")) expect(sql).toContain(`'${v}'`);
    for (const v of baruNilai("jurnal", "jurnal_jenis_check")) expect(sql).toContain(`'${v}'`);
    expect(sql).toContain("ALTER TABLE akun\n  ADD COLUMN tingkat");
    expect(sql).toContain("ALTER TABLE outbox ADD COLUMN tujuan");
    expect(sql).toContain("ALTER TABLE produk ADD COLUMN gambar_url");
    expect(sql).not.toMatch(/ALTER TABLE (buku|jurnal|posting) ADD COLUMN/);
  });
});

describe("klaim tabel uang, modul, dan Idempotency-Key terhadap rekaman dan ERD", () => {
  test("batas.txt bagian B: tiap schema memuat jumlah dan nama tabel yang sama dengan pembagian modul", () => {
    for (const m of modul.modul) {
      const b = batasB.find((x) => x.startsWith(`schema ${m.schema}: `));
      expect(b, m.schema).toBeDefined();
      expect(b).toBe(`schema ${m.schema}: ${m.tabel.length} tabel (${[...m.tabel].sort().join(", ")})`);
    }
    expect(BUKU_SISTEM).toBe(3);
  });
  test("aturan buku_pemilik menyebut pemakai dan merchant hanya di Tahap 4, dan outbox menulis verifikasi tanpa jurnal", () => {
    const pemilik = (e: Erd): string => e.tabel.find((t) => t.nama === "buku")!.cek.find((c) => c.nama === "buku_pemilik")!.ekspresi;
    expect(pemilik(erd4)).toMatch(/'pemakai'.*'merchant'/);
    expect(pemilik(erd3)).not.toMatch(/'pemakai'|'merchant'/);
    const promo = per4.get("outbox")!.cek.find((c) => c.nama === "outbox_jurnal_atau_promo")!.ekspresi;
    expect(promo).toContain("jurnal_id IS NULL");
    expect(promo).toContain("'verifikasi'::text");
    expect(migrasi[0]!.isi).toContain("Pekerjaan verifikasi tidak punya jurnal, seperti promo.");
  });
  test("ledger.txt bagian A: permintaan sah 201, ulangan dengan key yang sama 200, dan satu jurnal untuk key itu", () => {
    const i = ledgerTxt.findIndex((b) => b === "# permintaan sah, lalu ulangan yang sama");
    const status = ledgerTxt.slice(i, i + 40).filter((b) => b.startsWith("HTTP/1.1")).map((b) => b.match(/HTTP\/1\.1 (\d{3})/)![1]);
    expect(status.slice(0, 2)).toEqual(["201", "200"]);
  });
  test("rekaman E: penolakan tiap aturan tabel baru tercatat dengan SQLSTATE dan nama aturannya", () => {
    const teks = E.join("\n");
    for (const k of ["23514 · constraint topup_bank_jumlah_check", "23505 · constraint topup_bank_order_id_key", "23514 · constraint topup_bank_status_check", "23505 · constraint webhook_event_pkey", "23514 · constraint webhook_event_hasil_check", "23514 · constraint qr_dinamis_terikat", "23514 · constraint outbox_tujuan_sesuai_jenis", "23514 · constraint jurnal_jenis_check"]) {
      expect(teks, k).toContain(k);
    }
  });
});

// ---- rancangan lawan lab -------------------------------------------------------------------------------------------------------
describe("rancangan lawan lab: enam selisih", () => {
  test("enam selisih dihitung dari blok mermaid naskah dan ERD Tahap 4, dan sama dengan baris tabel di halaman", () => {
    expect(SELISIH).toEqual([true, true, true, true, true, true]);
    const tabel = badan.split("\n").filter((b) => /^\| `(outbox|produk|topup_bank|audit_log|webhook_event|insiden_rekon)[.`]/.test(b) && b.split("|").length === 4);
    expect(tabel).toHaveLength(SELISIH.length);
    expect(tabel.map((b) => sel(b)[0]!.match(/^`(\w+)/)![1])).toEqual(["outbox", "produk", "topup_bank", "audit_log", "webhook_event", "insiden_rekon"]);
    expect(kolomLab("topup_bank")).toContain("tujuan_bayar");
    expect(naskah).toContain("`topup_bank.tujuan_bayar` ada di lab dan tidak di blok");
    expect(kolomLab("outbox").at(-1)).toBe("tujuan");
    expect(kolomLab("produk").at(-1)).toBe("gambar_url");
    expect(per4.get("audit_log")!.unik.map((u) => u.nama)).toEqual(["audit_log_hash_key"]);
    expect([jurnalUnik("webhook_event"), jurnalUnik("insiden_rekon"), jurnalUnik("topup_bank")]).toEqual([false, false, true]);
    expect(skemaTxt.join("\n")).toContain("topup_bank | id, akun_id, order_id, jumlah, status, tujuan_bayar, dibuat, kedaluwarsa_pada, jurnal_id | ya, ditambah tujuan_bayar (tidak ada di mermaid)");
    expect(skemaTxt.join("\n")).toContain("topup_bank.tujuan_bayar: gateway memberi nomor tujuan bayar, dan app menampilkannya");
    expect(baca("labs/api-t4/migrasi/000021_topup_bank.up.sql")).toContain("nomor tujuan dari gateway; kosong bila gateway belum menjawab");
  });
});

// ---- label sumber dan riset ---------------------------------------------------------------------------------------------------
describe("label sumber dan baris riset R4-130 sampai R4-134", () => {
  const baris = risetBaris.filter((b) => /^\| R4-13[0-4] \|/.test(b));
  const id = (b: string): string => sel(b)[0]!;
  test("lima baris berurutan, tepat sesudah R4-115 dan sebelum R4-300, tanpa ID ganda di seluruh berkas, lima kolom", () => {
    expect(baris.map(id)).toEqual(["R4-130", "R4-131", "R4-132", "R4-133", "R4-134"]);
    const semua = risetBaris.filter((b) => /^\| R4-\d+ \|/.test(b)).map(id);
    expect(new Set(semua).size).toBe(semua.length);
    const i = semua.indexOf("R4-115");
    expect(semua.slice(i, i + 7)).toEqual(["R4-115", "R4-130", "R4-131", "R4-132", "R4-133", "R4-134", "R4-300"]);
    for (const b of baris) expect(sel(b), b.slice(0, 20)).toHaveLength(5);
  });
  test("R4-130 dan R4-131: halaman dokumentasi, bagian, dan tanggal akses yang dipakai halaman", () => {
    const r130 = baris[0]!;
    const r131 = baris[1]!;
    for (const k of ["PostgreSQL 17", "postgresql.org/docs/17/ddl-constraints.html", "dibuka 2026-10-29", "5.5.3 Unique Constraints", "5.5.5 Foreign Keys", "`topup_bank.jurnal_id`"]) expect(r130, k).toContain(k);
    for (const k of ["PostgreSQL 17", "postgresql.org/docs/17/ddl-schemas.html", "dibuka 2026-10-29", "bab 5.10 Schemas", "tidak terpisah ketat"]) expect(r131, k).toContain(k);
    const tautan = [...mdx.matchAll(/\]\((https:\/\/www\.postgresql\.org\/docs\/17\/[^)#]+)(#[^)]*)?\)/g)].map((m) => m[1]!.replace("https://www.", ""));
    expect(tautan.length).toBeGreaterThan(0);
    for (const t of tautan) expect(`${r130}\n${r131}`, t).toContain(t);
    expect(mdx).toContain("[PostgreSQL 17, 5.5.3](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)");
    expect(mdx).toContain("[PostgreSQL 17, 5.5.5](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-FK)");
    expect(mdx).toContain("[PostgreSQL 17, 5.10](https://www.postgresql.org/docs/17/ddl-schemas.html)");
  });
  test("R4-132 dan R4-133 menulis hitungan yang sama dengan halaman, dari angka yang tertulis", () => {
    const r132 = baris[2]!;
    for (const n of [P3, P4, P5, BYTE3, BYTE4, P5 * BYTE_POSTING, aktif(a3) * TRX, TRX_HARI4, aktif(a5) * TRX]) expect(r132, String(n)).toContain(titik(n));
    const r133 = baris[3]!;
    for (const n of [GB_REG2 * 1e9, GB_REG3 * 1e9, BYTE4, FILE_KB]) expect(r133, String(n)).toContain(titik(n));
    for (const k of ["365 GB", "365 ÷ 10,95 = 33,3", "365 ÷ 6,57 = 55,6", "730 MB", "60 MB", "292 MB", "182,5 MB", "7.117.500.000", "136,5 MB"]) expect(r133, k).toContain(k);
    expect(r133).toContain("retensi `webhook_event` (README t4-webhook)");
    expect(r133).toContain("keputusan 1207");
  });
  test("R4-134 menyebut enam selisih, 21 foreign key lintas schema, dan berkas rekaman yang dipakai halaman", () => {
    const r = baris[4]!;
    for (const k of ["enam selisih", "21 foreign key lintas schema", "14 ke akun dan 7 ke jurnal", "skema.txt", "batas.txt", "modul-tahap-4.json", "tahap-4.json", "2026-10-29"]) expect(r, k).toContain(k);
  });
  test("label: kolom Label tabel hitungan berisi Asumsi, dan Rekaman lab hanya untuk rekaman", () => {
    const tabelAsumsi = badan.split("\n").filter((b) => /^\| .* \| Asumsi.*\|$/.test(b));
    expect(tabelAsumsi).toHaveLength(3 + 6);
    for (const b of badan.split("\n")) {
      if (/\|\s*Rekaman lab/.test(b) && b.startsWith("|")) throw new Error(`label Rekaman lab di sel tabel hitungan: ${b.slice(0, 80)}`);
    }
    expect(badan).toContain("Semua angka di tabel ini adalah **Asumsi** cerita.");
    expect(badan).toContain("/cara-pakai/#label-sumber");
    expect(per("t4-skema").lab).toEqual(["api-t3", "api-t4"]);
  });
  test("klaim 'Tidak dijalankan' disebut tiga kali, dan klaim negatif 'tidak ada' berlingkup ERD Tahap 3 ke 4 atau labs/api-t4/migrasi", () => {
    expect((badan.match(/Tidak dijalankan/g) ?? []).length).toBe(3);
    expect(badan).toContain("Tidak ada tabel atau kolom yang dihapus.");
    expect(badan).toContain("tidak ada tabel atau kolom yang dihapus.");
  });
});

// ---- Cek diri, daftar periksa, dan struktur ---------------------------------------------------------------------------------
describe("blok Kunci dan struktur halaman", () => {
  test("Cek diri: lima kartu, tiap kartu satu jawaban, dan 'Cek 3 pertanyaan' sama dengan jumlah butir daftar", () => {
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5"]);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(5);
    const tanya = badan.match(/<summary>Sudah tahu\? Cek (\d+) pertanyaan<\/summary>\n\n((?:\d\. .*\n)+)/);
    expect(Number(tanya![1])).toBe(tanya![2]!.trim().split("\n").length);
  });
  test("satu <Rantai>, satu <Tebak>, satu <ErdHalaman>, tanpa TabSet: Di stack lain tidak ditulis di halaman ini", () => {
    expect((mdx.match(/<Rantai /g) ?? []).length).toBe(1);
    expect((mdx.match(/<Tebak /g) ?? []).length).toBe(1);
    expect((mdx.match(/<ErdHalaman /g) ?? []).length).toBe(1);
    expect(mdx).not.toContain("TabSet");
    expect(badan).not.toContain("### Di stack lain");
  });
  test("ErdHalaman memasang pembagian modul dan memeriksanya; kontrol pemilih tersembunyi sebelum hydrate dan tanpa JavaScript", () => {
    const astro = baca("situs/src/components/ErdHalaman.astro");
    expect(astro).toContain("data/erd/modul-tahap-*.json");
    expect(astro).toContain("periksaModul(");
    expect((astro.match(/modul=\{modul\}/g) ?? []).length).toBe(2);
    const tsx = baca("situs/src/erd/ErdTumbuh.tsx");
    expect(tsx).toContain("className={`erd-tumbuh__kontrol${lebar === null ? \" is-belum\" : \"\"}`}");
    expect((tsx.match(/tampilTahapHalaman\(/g) ?? []).length).toBe(3);
    expect(tsx).not.toMatch(/[^a-zA-Z]tampilTahap\(/);
    const css = baca("situs/src/erd/erd-tumbuh.css");
    expect(css).toMatch(/\.erd-tumbuh__kontrol\.is-belum \{\n {2}visibility: hidden;\n\}/);
    expect(css).toMatch(/@media \(scripting: none\) \{\n {2}\.erd-tumbuh__kontrol \{\n {4}display: none;\n {2}\}\n\}/);
  });
});
