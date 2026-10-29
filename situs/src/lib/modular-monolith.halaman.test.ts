// Penjaga angka halaman 4.13 (modular-monolith.mdx): angka, ID, nomor ADR, versi sumber, tautan, rentang Snippet, tabel, kata bilangan,
// dan klaim "hanya" atau "tidak" ditulis tangan di halaman, diagram arsitektur, Rantai, Tebak, widget perbandingan, dan halaman istilah.
// Semuanya diturunkan dari rekaman labs/t4-modul/output, README dan kode lab, naskah 4, registry, dan RISET, bukan dari daftar yang ditulis
// sendiri. Pola: webhook-masuk.halaman.test.ts. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata
// halaman dan data dikunci per baris di modular-monolith.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci,
// dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/modular-monolith.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode dibaca terhadap kodenya (klien.go, pembayaran.go, modul.sql).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t4-modul-inti.json";
import arsitektur from "../../data/arsitektur/t4-modul.json";
import tebak from "../../data/widget/t4-modul-tebak.json";
import banding from "../../lama/widgets/data/t4-modul-banding.json";
import istilah from "../../data/halaman-istilah/modular-monolith.json";
import registry from "../../data/cerita.json";
import { Arsitektur } from "../diagram/skema";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK_HALAMAN, SIDIK_JSON, JUMLAH_LABEL } from "./modular-monolith.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/modular-monolith.mdx";
const halaman = baca(HALAMAN);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const batas = baca("labs/t4-modul/output/batas.txt");
const ledger = baca("labs/t4-modul/output/ledger.txt");
const prosesMati = baca("labs/t4-modul/output/proses-mati.txt");
const latensi = baca("labs/t4-modul/output/latensi.txt");
const readme = baca("labs/t4-modul/README.md");
const modulSql = baca("labs/t4-modul/modul.sql");
const kodeAkun = baca("labs/api-t4/internal/modul/akun/akun.go");
const kodeKlien = baca("labs/api-t4/internal/modul/ledger/klien.go");
const kodeBayar = baca("labs/api-t4/internal/modul/pembayaran/pembayaran.go");
const kodeBayarTes = baca("labs/api-t4/internal/modul/pembayaran/pembayaran_test.go");
const glosarium = baca("situs/data/glosarium.json");
const glosariumMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
// TANPA_KUNCI=1 mematikan kunci baris; TANPA_KUNCI=2 juga mematikan sidik kata dan hitungan label (hanya turunan dari sumber yang tersisa).
const tanpaKunci = process.env.TANPA_KUNCI === "1" || process.env.TANPA_KUNCI === "2";
const tanpaSidik = process.env.TANPA_KUNCI === "2";
const requireCjs = createRequire(import.meta.url);

// ---- pembaca rekaman ---------------------------------------------------------------------------
interface Bagian { awal: number; akhir: number; baris: string[] }
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
const bagian = (semua: Record<string, Bagian>, huruf: string): Bagian => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
const rentangFungsi = (teks: string, awalan: string): string => {
  const awal = noBaris(teks, awalan);
  const akhir = teks.split("\n").findIndex((b, k) => k + 1 > awal && b === "}") + 1;
  return `${awal}:${akhir}`;
};
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string, n = 1): void => expect(halaman.split(kalimat).length - 1, `kemunculan "${kalimat.slice(0, 80)}"`).toBe(n);
const BILANGAN = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
const kata = (n: number): string => BILANGAN[n]!;
const huruf1 = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

const Bag = pecah(batas);
const BB = bagian(Bag, "B").baris;
const BA = bagian(Bag, "A").baris;
const LA = bagian(pecah(ledger), "A").baris;
const LC = bagian(pecah(ledger), "C").baris;
const LD = bagian(pecah(ledger), "D").baris;
const PM = pecah(prosesMati);
const PA = bagian(PM, "A").baris;
const PB = bagian(PM, "B").baris;
const PC = bagian(PM, "C").baris;

// ---- nilai turunan dari rekaman, kode, README, naskah, dan registry ---------------------------
const MODUL = ["ledger", "akun", "identitas", "merchant", "pembayaran", "platform"] as const;
const tabelPerSchema = Object.fromEntries(BB.flatMap((b) => { const m = b.match(/^schema t4m_(\w+): (\d+) tabel/); return m ? [[m[1]!, Number(m[2])]] : []; })) as Record<string, number>;
const peranBaris = Object.fromEntries(BB.flatMap((b) => {
  const m = b.match(/^role t4m_(\w+): (\d+) tabel terbaca \([^)]*\), (\d+) ditolak permission denied \(42501\)$/);
  return m ? [[m[1]!, [Number(m[2]), Number(m[3])]]] : [];
})) as Record<string, number[]>;
const monolit = BB.map((b) => b.match(/^role t4m_monolit: (\d+) tabel lima modul terbaca; (\d+) tabel pembayaran ditolak/)).find((m) => m)!;
const fk = BB.map((b) => b.match(/^kunci asing yang menyeberang schema modul: (\d+); tujuan: akun\.akun x(\d+), akun\.kota x(\d+), akun\.perangkat x(\d+), ledger\.jurnal x(\d+)$/)).find((m) => m)!;
const asalFk = BB.map((b) => b.match(/^asal kunci asing lintas schema: identitas (\d+), ledger (\d+), merchant (\d+), pembayaran (\d+), platform (\d+)$/)).find((m) => m)!;
const totalTabel = MODUL.reduce((a, m) => a + tabelPerSchema[m]!, 0);
const statusLedger = LA.flatMap((b) => { const m = b.match(/^HTTP\/1\.1 (\d{3}) /); return m ? [m[1]!] : []; });
const logLedger = LC.flatMap((b) => { const m = b.match(/^ledger: key=<order 2> status=(\d+) jurnal=(\d+) ulang=(true|false)$/); return m ? [[m[1]!, m[2]!, m[3]!]] : []; });
const hasilBagian = (b: string[]): string[] => b.flatMap((x) => { const m = x.match(/^hasil: (.+)$/); return m ? [m[1]!] : []; });
const hasilC = hasilBagian(PC);
const hasilD = hasilBagian(LD);
const ceKStatus = PB.map((b) => b.match(/^cek top-up: diperiksa (\d+), dikredit (\d+), selesai (\d+), tertunda (\d+), galat (\d+)$/)).find((m) => m)!;
const geser = PC.flatMap((b) => { const m = b.match(/^# jam ledger digeser (\d+) jam; kiriman ulang e\d untuk top-up Rp(\d+)$/); return m ? [[Number(m[1]), Number(m[2])]] : []; });
const barisJurnal = PC.flatMap((b) => { const m = b.match(/^ (\d+)\s+\| (\d+)\s+\| dibayar$/); return m ? [[Number(m[1]), Number(m[2])]] : []; });
const rekon = PC.map((b) => b.match(/^ (\d+)\s+\| (\d+)\s+\| (\d+)$/)).find((m) => m)!;
const p95 = latensi.match(/^batas: tambahan p95 lewat HTTP di bawah (\d+)ms: ya$/m)!;
const kali = latensi.match(/^(\d+) panggilan langsung dan (\d+) lewat HTTP bergantian/m)!;
const hitungL = latensi.match(/0,579 × 0,05 detik = (0,029) koneksi dari pool pembayaran (\d+)/)!;
const anggaran = latensi.match(/tenggat penerbit ([\d.]+) ms dikurangi lock_timeout ([\d.]+) ms menyisakan ([\d.]+) ms; (\d+)% dari sisa itu/)!;
const asumsi = (registry.tahap as unknown as { no: number; asumsi: Record<string, number | string> }[]).find((t) => t.no === 4)!.asumsi as Record<string, number>;
const aktif = (asumsi.user! * asumsi.aktif!) / 100;
const rps = (aktif * asumsi.req!) / 86400 * asumsi.puncak!;
const trx = (aktif * asumsi.trx!) / 86400 * asumsi.puncak!;
const topupPuncak = (aktif * 0.25) / 86400 * asumsi.puncak!;
const lTopup = topupPuncak * 0.05;
const tim = [5, 4, 4];
const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; path?: string; adr?: number[]; peran?: string[]; menit?: number }[]).find((h) => h.id === id);
const barisRiset = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("enam schema, 22 tabel, dan matriks hak enam role dari batas.txt bagian B", () => {
    expect(Object.keys(tabelPerSchema).sort()).toEqual([...MODUL].sort());
    expect(MODUL.map((m) => tabelPerSchema[m])).toEqual([6, 4, 1, 4, 5, 2]);
    expect(totalTabel).toBe(22);
    for (const m of MODUL) {
      const [terbaca, ditolak] = peranBaris[m]!;
      expect(terbaca! + ditolak!, `role ${m}`).toBe(totalTabel);
      harus(`| \`${m}\` | ${tabelPerSchema[m]} | \`t4m_${m}\` | ${terbaca} | ${ditolak} |`);
    }
    expect(peranBaris.ledger![0]).toBe(tabelPerSchema.ledger! + 1);
    expect(peranBaris.akun![0]).toBe(tabelPerSchema.akun);
    harus(`sehingga tabel akun terhitung terbaca untuk ledger (${tabelPerSchema.ledger} + 1 = ${peranBaris.ledger![0]})`);
    expect(batas).toContain("role t4m_ledger: 7 tabel terbaca (milik sendiri dan kolom id, tingkat, status akun)");
    harus("ledger membaca `id`, `tingkat`, dan `status` dari tabel akun");
    expect(modulSql).toContain("GRANT SELECT (id, tingkat, status) ON t4m_akun.akun TO t4m_ledger;");
    expect(modulSql).not.toMatch(/GRANT SELECT[^;]*\bnama\b[^;]*ON t4m_akun\.akun TO t4m_ledger/);
  });
  test("role monolith: tujuh belas tabel lima modul terbaca dan lima tabel pembayaran ditolak", () => {
    const [a, b] = [Number(monolit[1]), Number(monolit[2])];
    expect(a).toBe(totalTabel - tabelPerSchema.pembayaran!);
    expect(b).toBe(tabelPerSchema.pembayaran);
    harus(`Rekaman menulis: role \`t4m_monolit\` membaca ${a} tabel dari lima modul dan ditolak pada ${b} tabel pembayaran (\`batas.txt\` bagian B, ${a} + ${b} = ${a + b}).`);
    expect(a + b).toBe(totalTabel);
    expect(modulSql).toContain("GRANT t4m_ledger, t4m_akun, t4m_identitas, t4m_merchant, t4m_platform TO t4m_monolit;");
    expect(modulSql).not.toMatch(/TO t4m_monolit;[\s\S]*t4m_pembayaran TO t4m_monolit/);
    harus("Lima modul di satu proses memakai satu role, `t4m_monolit`, yang mewarisi kelima role modul tanpa `t4m_pembayaran`:");
    harus("di dalam proses monolith database tidak menahan ledger membaca tabel akun di luar kontrak. Yang menahannya hanya `internal/`, review, dan tes kontrak.");
  });
  test("kunci asing lintas schema: 21, empat belas ke akun dan tujuh ke jurnal, tujuh berasal dari pembayaran", () => {
    const [total, akun, kota, perangkat, jurnal] = fk.slice(1).map(Number) as [number, number, number, number, number];
    expect(akun + kota + perangkat + jurnal).toBe(total);
    harus(`Rekaman menghitung ${total} kunci asing yang menyeberang schema. Ada ${akun + kota + perangkat} menuju modul akun (${akun} ke \`akun\`, ${kota} ke \`kota\`, ${perangkat} ke \`perangkat\`) dan ${jurnal} menuju \`jurnal\`. ${huruf1(kata(Number(asalFk[4])))} di antaranya berasal dari schema pembayaran:`);
    expect(Number(asalFk[1]) + Number(asalFk[2]) + Number(asalFk[3]) + Number(asalFk[4]) + Number(asalFk[5])).toBe(total);
    harus("akun yang tidak ada ditolak (23503)");
    expect(BB.join("\n")).toContain('violates foreign key constraint "topup_bank_akun_id_fkey" (23503)');
    expect(BB.join("\n")).toContain("role t4m_pembayaran menulis topup_bank untuk akun yang ada: berhasil tanpa hak apa pun di schema akun");
    expect(readme).toContain("(komentar di `ri_PlanCheck` dan `ri_PerformCheck`: \"we'll do the check as that table's owner\")");
    expect(readme).toContain("Dokumentasi resmi (bab hak akses, `ddl-priv`) hanya menyebut hak REFERENCES untuk membuat constraint");
    harus("README lab mencatat bahwa dokumentasi resmi hanya menyebut hak REFERENCES untuk membuat constraint.");
    harus(`Untuk baris baru di \`topup_bank\`, itu tabel yang dirujuk (\`ri_PlanCheck\` dan \`ri_PerformCheck\` di \`ri_triggers.c\`, cabang REL_17_STABLE, dibuka 2026-10-29; Tidak dijalankan: dibaca dari kode sumber).`);
    harus(`| Database fisik terpisah per modul | ${total} kunci asing lintas schema harus dibuang. Tidak dijalankan | Belum dijadwalkan |`);
    harus(`Pada ${total} kunci asing lintas schema di lab, pemisahan lewat database berbeda akan memutus semuanya.`);
    expect(readme).toContain(`Kunci asing lintas schema tetap ada. Memisahkan database fisik memerlukan membuangnya; Tidak dijalankan.`);
  });
  test("M32 dengan batas: 42P01 tanpa awalan, 42501 dengan awalan, kontrol berhasil, dan rename di bagian A memberi 42703", () => {
    const tanpa = BB.find((b) => b.startsWith("pembayaran menjalankan SQL M32 apa adanya (SELECT nama FROM akun)"))!;
    const dengan = BB.find((b) => b.startsWith("pembayaran menulis awalan schema sendiri (SELECT nama FROM t4m_akun.akun)"))!;
    expect(tanpa).toContain('relation "akun" does not exist (42P01)');
    expect(dengan).toContain("permission denied for schema t4m_akun (42501)");
    expect(BB).toContain("kontrol: role t4m_akun menjalankan SQL yang sama pada baris yang sama: berhasil");
    expect(BA.join("\n")).toContain('column "nama" does not exist (42703)');
    expect(BA.join("\n")).toContain("# Ketiga langkah CI tidak membuka koneksi database: tes pembayaran memakai driver tiruan");
    for (const b of ["go build ./...", "go vet ./internal/modul/...", "go test -count=1 -run TestTeksTopupLangsungDenganDataTiruanLolos"]) expect(BA.join("\n")).toContain(`$ ${b}`);
    harus("`relation \"akun\" does not exist` (42P01), dan `permission denied for schema t4m_akun` (42501) bila memakai awalan schema");
    harus("fungsi pembayaran yang sama dijawab `column \"nama\" does not exist` (42703)");
    harus("Tiga langkah CI tim Pembayaran lolos tanpa membuka database, karena tesnya memakai driver tiruan.");
    expect(BB.join("\n")).toContain('use of internal package lab/apit4/internal/modul/akun/internal/data not allowed');
    expect(BB).toContain("(lolos, tanpa keluaran)");
    expect(BB.join("\n")).toContain("ALTER TABLE akun RENAME COLUMN tingkat TO tingkat_baru (kolom di kontrak ledger): tes kontrak ledger gagal: column \"tingkat\" does not exist (42703)");
    expect(BA.join("\n")).toContain("ALTER TABLE akun RENAME COLUMN nama TO nama_tampil");
    harus("Sesudah `ALTER TABLE akun RENAME COLUMN nama TO nama_tampil`");
  });
  test("API ledger: status 401, 400, 422, 201, 200, 422 dan log dua panggilan dengan satu jurnal", () => {
    expect(statusLedger).toEqual(["401", "400", "422", "201", "200", "422"]);
    harus("Tanpa kunci layanan dijawab `401`, tanpa Idempotency-Key `400`, dan key yang bukan `order_id` `422`. Permintaan sah dijawab `201`, dan ulangannya `200` dengan jurnal yang sama:");
    harus("Key yang sama dengan jumlah lain dijawab `422`.");
    expect(ledger).toContain('{"alasan":"key-dipakai-permintaan-lain"}');
    expect(ledger).toContain('{"jurnal":10201,"ulang":false}');
    expect(ledger).toContain('{"jurnal":10201,"ulang":true}');
    expect(logLedger).toEqual([["201", "10203", "false"], ["200", "10203", "true"]]);
    harus("Log ledger mencatat dua panggilan, `201` lalu `200`, dan jurnalnya satu. Webhook yang kalah menjawab `ganda`.");
    expect(LC.join("\n")).toContain("gerbang dilepas; webhook e3 menyelesaikan transaction-nya: 200 ganda");
    expect(hasilD).toEqual(["401 ditolak", "503 gagal", "200 diproses", "401 ditolak"]);
    harus("tanda tangan palsu dijawab `401`, dan kabar sah saat ledger tidak menjawab dijawab `503`, bukan 2xx, jadi gateway mengulang.");
    expect(kodeKlien).toContain('req.Header.Set("Idempotency-Key", kunci)');
    expect(kodeKlien).toMatch(/func \(k \*Klien\) kirim[\s\S]*?ErrTidakPasti[\s\S]*?resp\.StatusCode >= 500/);
    harus("Timeout atau 5xx dari ledger dibaca client sebagai hasil yang tidak diketahui (Tidak dijalankan: dibaca dari kode client ledger).");
  });
  test("proses mati: satu jurnal sesudah kiriman ulang, job cek status, dan batas key 24 jam (+23 jam satu jurnal, +25 jam dua jurnal)", () => {
    expect(PA.join("\n")).toContain("# proses service pembayaran: keluar dengan sinyal 9 (SIGKILL)");
    expect(PA.join("\n")).toMatch(/ menunggu\s+\| f\s+\| 1\s+\| 1/);
    expect(PA.join("\n")).toMatch(/ dibayar\s+\| t\s+\| 1\s+\| 1/);
    expect(PA.join("\n")).toMatch(/webhook_event_e1\n-+\n 0/);
    expect(hasilBagian(PA)).toEqual(["galat: koneksi putus, tidak ada balasan", "200 diproses"]);
    harus("tepat sesudah ledger menjawab, tanpa balasan ke gateway. Hasilnya satu jurnal, `topup_bank` masih `menunggu`, dan `webhook_event` kosong. Gateway tiruan mengirim ulang event yang sama, dijawab `200 diproses`, dan jurnalnya tetap satu.");
    expect(kodeBayar).toContain('s.titik("sesudah-ledger")');
    harus("titik `sesudah-ledger` mengirim SIGKILL ke proses pembayaran sendiri");
    expect(Number(ceKStatus[1])).toBe(1);
    expect(Number(ceKStatus[2])).toBe(1);
    harus(`yang memeriksa ${ceKStatus[1]} top-up dan mengkredit ${ceKStatus[2]}, tanpa kiriman ulang.`);
    expect(geser).toEqual([[23, 100000], [25, 150000]]);
    expect(barisJurnal).toEqual([[1, 1], [2, 1]]);
    expect(rekon.slice(1).map(Number)).toEqual([150000, 300000, 150000]);
    harus(`Kiriman ulang pada +${geser[0]![0]} jam menghasilkan satu jurnal. Pada +${geser[1]![0]} jam key sudah habis, \`topup_bank\` masih \`menunggu\`, dan jurnal kedua ditulis:`);
    harus(`SQL rekonsiliasi harian yang sama membaca ${rp(Number(rekon[1]))} dari ${rp(Number(rekon[2]))} yang dikreditkan ke akun, padahal gateway mencatat ${rp(Number(rekon[3]))}.`);
    harus(`bagian C menunjukkan jurnal kedua sesudah ${geser[1]![0]} jam. SQL rekonsiliasi yang sama membaca ${rp(Number(rekon[1]))} dari ${rp(Number(rekon[2]))} (job-nya Tidak dijalankan).`);
    expect(Number(rekon[1]) * 2).toBe(Number(rekon[2]));
    harus("SQL rekonsiliasi membaca separuh jumlah yang dikreditkan (job-nya Tidak dijalankan).");
    harus("Satu jurnal pada +23 jam, karena key ledger masih hidup. Dua jurnal pada +25 jam: key sudah habis dan `topup_bank` masih `menunggu`.");
    expect(prosesMati).toContain("# --- C. Batas: Idempotency-Key ledger hidup 24 jam;");
    harus("Idempotency-Key ledger hidup 24 jam ([[t2-idempotency]]).");
    expect(PC.join("\n")).toContain("Jam ledger diperankan (POST /lab/jam), tanpa menunggu 24 jam sungguhan");
    harus("jam ledger diperankan (`POST /lab/jam`), bukan 24 jam sungguhan.");
    expect(readme).toContain("Jalur penutupnya dalam 24 jam adalah kiriman ulang gateway dan job cek status (umur 30 menit, Asumsi naskah). Sesudah itu tidak ada penutup di kode yang diperiksa");
    harus("Dalam 24 jam penutupnya adalah kiriman ulang gateway dan job cek status (umur 30 menit, Asumsi naskah). Sesudah itu tidak ada penutup di kode yang diperiksa.");
    harus("Job-nya sendiri Tidak dijalankan di lab ini.");
    expect(PC.join("\n")).toContain("SQL yang sama, Tidak dijalankan sebagai job");
    harus("Apakah jurnal kedua boleh ditulis sesudah key habis adalah keputusan produk yang belum final, jadi halaman ini mencatatnya sebagai pertanyaan terbuka.");
  });
  test("latensi: 200 panggilan, p95 di bawah 50 ms, anggaran dari 2.000 dikurangi 1.000, dan L = 0,579 × 0,05 = 0,029", () => {
    expect(Number(p95[1])).toBe(50);
    expect(kali.slice(1).map(Number)).toEqual([200, 200]);
    expect(anggaran.slice(1)).toEqual(["2.000", "1.000", "1.000", "5"]);
    expect(Number(anggaran[3]!.replace(".", "")) * Number(anggaran[4]) / 100).toBe(Number(p95[1]));
    expect(koma(lTopup, 3)).toBe(hitungL[1]);
    expect(koma(topupPuncak, 3)).toBe("0,579");
    expect(hitungL[2]).toBe("10");
    expect(readme).toContain("tambahan p95 antara −1,4 dan 6,9 ms");
    expect(readme).toContain("lab menetapkan 50 ms untuk tambahan satu lompatan HTTP");
    expect(readme).toContain("5% adalah Asumsi lab");
    harus(`Anggarannya ${p95[1]} ms. Tenggat penerbit kartu 2.000 ms dikurangi \`lock_timeout\` 1.000 ms menyisakan 1.000 ms, dan 5% dari sisa itu adalah ${p95[1]} ms`);
    harus(`${kali[1]} kali bergantian di localhost`);
    harus(`tambahan p95 di bawah ${p95[1]} ms, ya. Nilai mentah tidak direkam. Jaringan antar host dan TLS tidak diukur.`);
    harus("README lab mencatat lima run peninjau di bawah beban CPU dengan tambahan p95 antara −1,4 dan 6,9 ms, dan angka itu tidak bisa diulang dari repo.");
    harus(`satu lompatan 50 ms menahan koneksi ${koma(topupPuncak, 3)} × 0,05 = ${hitungL[1]} dari pool pembayaran ${hitungL[2]} (Hitungan atas Asumsi naskah).`);
    harus(`Pembanding: sisa anggaran 1.000 ms dan ${hitungL[1]} koneksi dari pool ${hitungL[2]} pada ${koma(topupPuncak, 3)} top-up per detik.`);
    expect(naskah).toContain("0,579");
  });
  test("beban dan tim: 138,9 request per detik, 6,94 transaksi uang per detik, 13 developer (5 + 4 + 4), dan hitungan 13 ÷ 6 dan 1.000 ÷ 13", () => {
    expect(koma(rps, 1)).toBe("138,9");
    expect(koma(trx, 2)).toBe("6,94");
    expect(naskah).toContain("138,9");
    expect(naskah).toContain("6,94");
    expect(aktif).toBe(20000);
    harus(`Puncaknya ${titik(aktif)} × ${asumsi.req} ÷ 86.400 × ${asumsi.puncak} = ${koma(rps, 1)} request per detik dan ${titik(aktif)} × ${asumsi.trx} ÷ 86.400 × ${asumsi.puncak} = ${koma(trx, 2)} transaksi uang per detik.`);
    harus(`Masukannya Asumsi: ${titik(asumsi.user!)} user, ${asumsi.aktif}% aktif, ${asumsi.req} request dan ${asumsi.trx} transaksi per user aktif per hari, faktor puncak ${asumsi.puncak}.`);
    expect(tim.reduce((a, b) => a + b, 0)).toBe(13);
    expect(naskah).toContain("| Ukuran tim | tiga tim | 5 + 4 + 4 | 13 orang");
    expect(naskah).toContain("**Tim Pembayaran** (5 orang, dipimpin Nadia)");
    harus("Pembayaran 5 orang, Merchant 4, dan Platform 4, jadi 5 + 4 + 4 = 13 developer");
    harus("Timnya 13 developer (5 + 4 + 4, Asumsi cerita).");
    harus(`**B ditolak** untuk tim ini: 13 ÷ 6 = ${koma(13 / 6, 2)} developer per service, dan ${MODUL.length} unit deploy lawan 2 pada D (Hitungan atas Asumsi).`);
    harus(`developer lebih dari 1.000 ÷ 13 ≈ ${Math.round(1000 / 13)} kali Tahap 4 (Hitungan)`);
    harus("Dari 13 developer dan 6,94 transaksi uang per detik, itu belum terlihat (Asumsi).");
    harus("| Biaya operasional | Nol, sampai rilis rusak | 6 pipeline, 6 set secret, dan jaringan antar service | Satu pipeline, tetapi satu role membaca semua | 2 pipeline dan satu jalur HTTP internal yang dipantau |");
    harus("| Kekurangan | Rename satu kolom mematahkan modul lain tanpa peringatan | 6 modul menjadi 6 unit deploy, dan transaction antar modul hilang |");
  });
  test("ADR 37 di naskah: tujuh aturan sesuai tabel ADR, opsi ditolak, dan kondisi yang terekam", () => {
    const baris = naskah.split("\n").find((b) => b.startsWith("| 37 | Modular monolith:"))!;
    expect(baris).toContain("modul `ledger`, `akun`, `identitas`, `merchant`, `platform` dalam satu repo dan satu proses; `pembayaran` (gateway, kartu, webhook) sebagai satu service terpisah");
    expect(baris).toContain("Ini merevisi ADR 12 (service kedua)");
    expect(baris).toContain("Satu schema dan satu role database per modul");
    expect(baris).toContain("Tetap satu paket tanpa batas (ditolak: M32); semua modul menjadi service");
    expect(baris).toContain("modular monolith tanpa service pembayaran");
    expect(baris).toContain("template MADR 4.0.0 yang ringkas");
    expect(baris).toContain("50 ms untuk satu lompatan HTTP");
    expect(baris).toContain("±50 developer");
    expect(baris).toContain("Bila review CODEOWNERS menunggu lebih dari sehari (Asumsi)");
    expect(baris).toContain("Kondisi itu terekam di ADR 34 (`proses-mati.txt` C)");
    harus("Saat review CODEOWNERS menunggu lebih dari satu hari (Asumsi).");
    harus("Saat kegagalan di tengah panggilan pembayaran ke ledger menghasilkan selisih yang tidak tertutup rekonsiliasi dalam satu hari kerja.");
    harus("Naskah menyebut heuristik praktisi bahwa microservices baru masuk akal di atas ±50 developer. Itu sumber tingkat 4, bukan studi terkontrol. Pencarian 2026-10-29 tidak menemukan sumber primer untuk angka itu, dan tulisan konsultan memberi angka yang saling bertentangan [perlu verifikasi].");
    expect(baris).toContain("microservices baru masuk akal di atas ±50 developer");
    expect(riset).toContain("Ambang jumlah developer: pencarian 2026-10-29 tidak menemukan sumber primer");
    // Daftar bernomor: pertanyaan Mulai, tujuh aturan ADR, dan tiga penyebab pre-mortem.
    [3, 3, 3, 1, 1, 1, 1].forEach((jumlah, i) => harus(`\n${i + 1}. `, jumlah));
    harus("**Keputusan: opsi D.** Tujuh aturan:");
    harus("`internal/` Go memaksa batas impor di compiler untuk paket baru di `internal/modul/`. Kode ledger lama belum dipindah, dan batasnya di sana hanya tes `go list -deps` untuk modul pembayaran.");
    harus("Satu schema dan satu role database per modul (22 tabel dalam enam schema, 6, 4, 1, 4, 5, dan 2).");
    harus("**Status:** diterima sesudah M32. Revisi atas ADR 12 (service kedua), dan membuat ADR 34 dan ADR 42 menjadi dua langkah idempoten.");
  });
});

describe("kode: kontrak publik, titik gagal, dan tes batas yang dikutip Snippet", () => {
  test("akun.go membuka satu paket publik dan SQL ada di internal/data", () => {
    expect(kodeAkun).toContain('"lab/apit4/internal/modul/akun/internal/data"');
    expect(kodeAkun).toContain("func (m Modul) NamaTampil(ctx context.Context, id int64) (string, error)");
    harus("Modul akun menaruh SQL-nya di `internal/data` dan hanya membuka satu paket publik:");
    expect(readme).toContain("Aturan direktori `internal` Go melindungi paket di bawah `internal/modul/`. Kode ledger lama (`internal/repo`, `internal/service`) tetap di tempatnya");
  });
  test("tes go list -deps menolak tiga paket dan modul pembayaran memanggil ledger lewat client", () => {
    const f = kodeBayarTes.slice(kodeBayarTes.indexOf("func TestPembayaranTidakMengimporRepoDanService"));
    for (const p of ["lab/apit4/internal/repo", "lab/apit4/internal/service", "lab/apit4/internal/handler"]) expect(f.slice(0, 600)).toContain(`"${p}"`);
    expect(f).toContain('exec.Command("go", "list", "-deps", "lab/apit4/internal/modul/pembayaran")');
    harus("tes `go list -deps` memeriksa bahwa modul pembayaran tidak bergantung pada repo, service, atau handler. Itu pemeriksaan di tes, bukan penolakan compiler:");
    expect(kodeBayar).toContain("s.Ledger.KreditTopup(ctx, tp.OrderID, ledger.Permintaan{OrderID: tp.OrderID, AkunID: tp.AkunID, Jumlah: tp.Jumlah})");
    expect(kodeBayar).toContain("--8<-- [start:terapkan]");
    expect(kodeBayar).toContain("--8<-- [end:terapkan]");
    expect(modulSql).toContain("ALTER ROLE t4m_pembayaran SET search_path = t4m_pembayaran;");
  });
  test("rentang Snippet diturunkan dari rekaman dan kode, bukan angka tangan", () => {
    const props = [...halaman.matchAll(/<Snippet (file="[^>]*?)\/>/g)].map((m) => m[1]!.trim());
    const sqlKontrak = `${noBaris(modulSql, "-- Kontrak kolom lintas modul")}:${noBaris(modulSql, "GRANT SELECT (id, tingkat, status) ON t4m_akun.akun TO t4m_ledger;")}`;
    const sqlMonolit = `${noBaris(modulSql, "-- Monolith: lima modul dalam satu proses")}:${noBaris(modulSql, "GRANT t4m_ledger, t4m_akun, t4m_identitas, t4m_merchant, t4m_platform TO t4m_monolit;")}`;
    const sqlPath = `${noBaris(modulSql, "ALTER ROLE t4m_ledger SET search_path")}:${noBaris(modulSql, "ALTER ROLE t4m_monolit SET search_path")}`;
    const awalRole = noBaris(batas, "role t4m_ledger: ");
    const awalKontrak = noBaris(batas, "ledger: SELECT nama FROM t4m_akun.akun LIMIT 1");
    const awalM32 = noBaris(batas, "pembayaran menjalankan SQL M32 apa adanya");
    const awalImpor = noBaris(batas, '$ go build ./internal/modul/pembayaran/   (berkas uji menambah');
    const awalFk = noBaris(batas, "role t4m_pembayaran menulis topup_bank untuk akun yang ada");
    const akhirFk = noBaris(batas, "asal kunci asing lintas schema");
    const awalLedger = noBaris(ledger, "# permintaan sah, lalu ulangan yang sama") ;
    const akhirLedger = noBaris(ledger, '{"jurnal":10201,"ulang":true}');
    const awalRekon = noBaris(prosesMati, "=> SELECT coalesce((SELECT sum(p.jumlah)");
    const akhirRekon = noBaris(prosesMati, "(1 row)", noBaris(prosesMati, " dibaca_rekonsiliasi |"));
    const awalLat = noBaris(latensi, "200 panggilan langsung");
    const akhirLat = noBaris(latensi, "--- PASS: TestLatensiHTTPInternalDiBawahAnggaran");
    const diharapkan = [
      `file="labs/t4-modul/output/batas.txt" lines="${awalRole}:${awalRole + 5}" title="Rekaman lab: labs/t4-modul/output/batas.txt (bagian B)"`,
      `file="labs/t4-modul/output/batas.txt" lines="${awalKontrak}:${awalKontrak + 2}" title="Rekaman lab: labs/t4-modul/output/batas.txt (bagian B, kontrak kolom)"`,
      `file="labs/t4-modul/modul.sql" lines="${sqlKontrak}" lang="sql" title="labs/t4-modul/modul.sql"`,
      `file="labs/t4-modul/output/batas.txt" lines="${awalM32}:${awalM32 + 2}" title="Rekaman lab: labs/t4-modul/output/batas.txt (bagian B, M32 dengan batas)"`,
      `file="labs/api-t4/internal/modul/akun/akun.go" lines="${noBaris(kodeAkun, "// Modul memegang koneksi")}:${noBaris(kodeAkun, "func (m Modul) NamaTampil") + 2}" lang="go" title="labs/api-t4/internal/modul/akun/akun.go"`,
      `file="labs/t4-modul/output/batas.txt" lines="${awalImpor}:${noBaris(batas, "(lolos, tanpa keluaran)", awalImpor)}" title="Rekaman lab: labs/t4-modul/output/batas.txt (bagian B, impor internal/)"`,
      `file="labs/api-t4/internal/modul/pembayaran/pembayaran_test.go" lines="${rentangFungsi(kodeBayarTes, "func TestPembayaranTidakMengimporRepoDanService")}" lang="go" title="labs/api-t4/internal/modul/pembayaran/pembayaran_test.go"`,
      `file="labs/t4-modul/modul.sql" lines="${sqlMonolit}" lang="sql" title="labs/t4-modul/modul.sql"`,
      `file="labs/t4-modul/output/batas.txt" lines="${awalFk}:${akhirFk}" title="Rekaman lab: labs/t4-modul/output/batas.txt (bagian B, kunci asing)"`,
      `file="labs/t4-modul/output/ledger.txt" lines="${awalLedger}:${akhirLedger}" title="Rekaman lab: labs/t4-modul/output/ledger.txt (bagian A)"`,
      `file="labs/api-t4/internal/modul/pembayaran/pembayaran.go" region="terapkan" lang="go" title="labs/api-t4/internal/modul/pembayaran/pembayaran.go"`,
      `file="labs/t4-modul/output/proses-mati.txt" lines="${awalRekon}:${akhirRekon}" title="Rekaman lab: labs/t4-modul/output/proses-mati.txt (bagian C, yang dibaca rekonsiliasi)"`,
      `file="labs/t4-modul/output/latensi.txt" lines="${awalLat}:${akhirLat}" title="Rekaman lab: labs/t4-modul/output/latensi.txt"`,
      `file="labs/t4-modul/modul.sql" lines="${sqlPath}" lang="sql" title="labs/t4-modul/modul.sql"`,
    ];
    expect(props).toEqual(diharapkan);
    for (const p of props) for (const m of p.matchAll(/file="(labs\/[\w./-]+)"/g)) expect(fs.existsSync(path.join(akar, m[1]!)), m[1]).toBe(true);
    // Rekaman yang dikutip tidak menampilkan kepala rekaman (baris 1 sampai 4) dan tidak memuat ID riset, nomor keputusan, atau nomor PR.
    for (const p of props.filter((q) => q.includes("lines="))) {
      const [, f, a, b] = p.match(/file="([^"]+)" lines="(\d+):(\d+)"/)!;
      const teks = baca(f!).split("\n").slice(Number(a) - 1, Number(b)).join("\n");
      expect(Number(a), f).toBeGreaterThan(4);
      expect(teks, `${f} ${a}:${b}`).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|\bPR \d{3}\b|\(tinjauan/);
    }
    const kode = [...halaman.matchAll(/<Snippet lang="(\w+)" code=\{`((?:[^`\\]|\\.)+)`\} \/>/g)].map((m) => [m[1]!, m[2]!]);
    expect(kode.map((k) => k[0])).toEqual(["text", "markdown", "json", "php", "python", "sql"]);
    expect(kode[0]![1]).toContain("/internal/modul/pembayaran/     @tim-pembayaran");
    expect(kode[0]![1].split("\n")[0]).toContain("Ilustrasi: pola terakhir yang cocok menang");
    expect(kode[1]![1]).toContain("# Ganti nama kolom akun.nama (Ilustrasi)");
    expect(kode[2]![1]).toContain('"exports": { ".": "./publik.js" }');
    expect(kode[3]![1]).toContain("DB::connection('pembayaran')");
    expect(kode[4]![1]).toContain('DATABASE_ROUTERS = ["rekeningo.routers.PerModul"]');
    expect(kode[5]![1]).toContain("GRANT USAGE ON SCHEMA pembayaran TO service_role;");
  });
});

describe("sumber luar: tanggal dibuka, baris RISET R4-170 sampai R4-174, template MADR, dan halaman istilah", () => {
  test("semua tanggal dibuka 2026-10-29, tanggal terbit cocok dengan RISET, dan tidak ada ID riset atau nomor keputusan di halaman", () => {
    const dibuka = new Set([...halaman.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]));
    expect([...dibuka]).toEqual(["2026-10-29"]);
    const bulan: Record<string, string> = { Januari: "01", Februari: "02", Mei: "05", Juni: "06", Juli: "07" };
    const iso = (t: string): string => { const m = t.match(/(\d{1,2}) (\w+) (\d{4})/)!; return `${m[3]}-${bulan[m[2]!]}-${m[1]!.padStart(2, "0")}`; };
    const terbit = [...halaman.matchAll(/\[([^\]]+)\]\([^)]+\), (\d{1,2} \w+ \d{4}), dibuka/g)].map((m) => [m[1]!, iso(m[2]!)]);
    expect(terbit).toEqual([["MonolithFirst", "2015-06-03"], ["Deconstructing the Monolith", "2019-02-21"], ["Goodbye Microservices", "2018-07-10"], ["Microservice Premium", "2015-05-13"]]);
    expect(barisRiset("R4-173")).toContain("2015-06-03");
    expect(barisRiset("R4-173")).toContain("2019-02-21");
    expect(barisRiset("R4-173")).toContain("2018-07-10");
    expect(barisRiset("R4-173")).toContain("2015-05-13");
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}|\bPR #?\d{3}\b/);
    expect(JSON.stringify([rantai, arsitektur, tebak, banding, istilah])).not.toMatch(/keputusan \d{3,4}/);
    for (const j of [rantai, arsitektur, tebak, banding]) expect(JSON.stringify(j)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(istilah).match(/\bR\d-\d{2,3}\b/g)).toEqual(["R4-315", "R4-173"]);
  });
  test("tiap tautan sumber luar ada di baris RISET milik halaman ini", () => {
    const url = new Set([...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!));
    const jejak: Record<string, string> = {
      "https://martinfowler.com/bliki/MonolithFirst.html": "MonolithFirst",
      "https://martinfowler.com/bliki/MicroservicePremium.html": "Microservice Premium",
      "https://www.postgresql.org/docs/17/ddl-schemas.html": "ddl-schemas.html",
      "https://www.postgresql.org/docs/17/runtime-config-client.html": "runtime-config-client",
      "https://pkg.go.dev/cmd/go": "Go 1.27.3",
      "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners": "About code owners",
      "https://docs.github.com/en/get-started/learning-about-github/githubs-plans": "GitHub's plans",
      "https://adr.github.io/madr/": "adr.github.io/madr",
      "https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity": "Deconstructing the Monolith",
      "https://www.twilio.com/en-us/blog/developers/best-practices/goodbye-microservices": "Goodbye Microservices",
      "https://nodejs.org/api/packages.html": "Node.js v26.13.0",
      "https://node-postgres.com/apis/pool": "node-postgres",
      "https://laravel.com/docs/13.x/database": "Laravel 13.x",
      "https://laravel.com/docs/13.x/providers": "Service Providers",
      "https://docs.djangoproject.com/en/6.1/topics/db/multi-db/": "Django 6.1",
      "https://docs.djangoproject.com/en/6.1/ref/databases/": "ref/databases",
      "https://docs.serverpod.dev/concepts/server-fundamentals/modules": "Serverpod 4.0.0",
      "https://docs.serverpod.dev/concepts/data-and-the-database/database/connection": "searchPaths",
      "https://supabase.com/docs/guides/api/securing-your-api": "Securing your API",
      "https://supabase.com/docs/guides/database/postgres/row-level-security": "Row Level Security",
    };
    for (const u of url) expect(Object.keys(jejak), `jejak ${u}`).toContain(u);
    const dipakai = riset.split("\n").filter((b) => /^\| (R4-17[0-4]|R4-315) \|/.test(b)).join("\n");
    for (const u of url) expect(dipakai, `RISET R4-170 sampai 174 tidak menyebut ${u}`).toContain(jejak[u]!);
  });
  test("lima baris RISET R4-170 sampai R4-174 ada, berurutan, dan semua ID RISET unik dan menaik", () => {
    const ids = riset.split("\n").flatMap((b) => { const m = b.match(/^\| (R4-\d+) \|/); return m ? [m[1]!] : []; });
    const urut = ids.slice(0, ids.indexOf("R4-27") + 1).concat(ids.slice(ids.indexOf("R4-27") + 1).filter((i) => Number(i.slice(3)) >= 100));
    expect(new Set(ids).size).toBe(ids.length);
    const angka = ids.map((i) => Number(i.slice(3))).filter((n) => n >= 100);
    expect(angka).toEqual([...angka].sort((a, b) => a - b));
    expect(urut.length).toBeGreaterThan(0);
    for (let n = 170; n <= 174; n++) expect(ids.filter((i) => i === `R4-${n}`)).toHaveLength(1);
    expect(barisRiset("R4-171")).toContain("\"Require review from Code Owners\"");
    expect(barisRiset("R4-171")).toContain("[perlu verifikasi: plan pemilik, di UI GitHub]");
    expect(barisRiset("R4-171")).toContain("file harus di bawah 3 MB");
    expect(barisRiset("R4-171")).toContain("pola terakhir yang cocok menang");
    expect(barisRiset("R4-172")).toContain("2024-09-17");
    for (const h of ["Context and Problem Statement", "Considered Options", "Decision Outcome", "Consequences"]) expect(barisRiset("R4-172"), h).toContain(h);
    harus("Template MADR 4.0.0 yang minimal memuat empat bagian: Context and Problem Statement, Considered Options, Decision Outcome, dan Consequences");
    harus("rilis 2024-09-17");
    for (const h of ["Context and Problem Statement", "Considered Options", "Decision Outcome", "Consequences"]) expect(halaman.split(`${h}`).length - 1, h).toBeGreaterThanOrEqual(2);
    expect(barisRiset("R4-170")).toContain("is silently ignored");
    expect(barisRiset("R4-173")).toContain("lebih dari 140 service");
    expect(barisRiset("R4-173")).toContain("32 perbaikan");
    expect(barisRiset("R4-173")).toContain("46 setahun sesudahnya");
    harus("Mereka mencatat 32 perbaikan pada library bersama selama masa microservice dan 46 dalam setahun sesudah penggabungan");
    harus("lebih dari 140 service menjadi satu");
    harus("lebih dari sepuluh tahun oleh lebih dari seribu developer");
    expect(barisRiset("R4-174")).toContain("Node.js v26.13.0");
  });
  test("halaman istilah Modular monolith: glosarium, rujukan, dan sumber", () => {
    expect(istilah.istilah).toBe("Modular monolith");
    expect(istilah.cerita).toHaveLength(1);
    expect(istilah.cerita[0]!.rujukan).toBe("t4-modul");
    expect(istilah.cerita[0]!.teks).toContain(`${totalTabel} tabel ke enam schema`);
    expect(istilah.sumber.map((s) => (s as { url?: string; rekaman?: string }).url ?? (s as { rekaman?: string }).rekaman)).toEqual(["https://pkg.go.dev/cmd/go", "https://martinfowler.com/bliki/MonolithFirst.html", "labs/t4-modul/output/batas.txt"]);
    expect(istilah.terkait).toEqual(["Monolith", "CODEOWNERS", "ADR (Architecture Decision Record)"]);
    for (const t of istilah.terkait) expect(glosariumMdx, t).toContain(`| **${t.split(" (")[0]}**`);
    expect(glosariumMdx).toContain("| **Modular monolith** | Satu aplikasi yang di-deploy sebagai satu unit, tapi kodenya dibagi ke modul dengan batas yang tegas. | [[t4-modul]] |");
    expect(glosarium).toContain("modular-monolith");
    expect(istilah.stack).toBeNull();
    expect(istilah.mekanisme).toHaveLength(4);
    expect(istilah.jebakan[1]).toContain("satu role yang mewarisi lima role modul");
  });
});

describe("rujukan [[ID]], registry, struktur lima blok, dan data widget", () => {
  test("halaman 4.13 terdaftar sebagai Konsep bagian 4 dengan lab t4-modul, ADR 37, dan prasyarat M32", () => {
    const h = entri("t4-modul")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.adr, h.peran]).toEqual(["4.13", "konsep", 4, true, ["t4-modul"], ["t4-m32"], [37], ["devops", "backend"]]);
    expect(h.judul).toBe("Modular monolith, CODEOWNERS, ADR wajib + ADR 37");
    expect(h.path).toBe("tahap-4/modular-monolith.md");
    expect(h.menit).toBe(24);
    expect(halaman).toContain(`title: "4.13 ${h.judul}"`);
    expect(halaman).toContain('<p class="meta">Baca 20 menit · coba 4 menit · Prasyarat: [[t4-m32]] · Jalur inti</p>');
    expect(20 + 4).toBe(h.menit);
    expect(naskah).toMatch(/\| 4\.13 \| 4 \| Modular monolith, CODEOWNERS, ADR wajib \+ ADR 37 \| Konsep \+ ADR \| ★ \| t4-modul \| banding \|/);
    expect(entri("B7.2")).toMatchObject({ lebur_ke: "t4-modul" });
    expect(entri("D5")).toMatchObject({ lebur_ke: "t4-modul" });
  });
  test("setiap [[ID]] ada di registry, bernama sesuai halamannya, dan menempel pada kalimat yang menjelaskannya", () => {
    const semua = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!).filter((id) => id !== "berikutnya");
    expect([...halaman.matchAll(/\[\[berikutnya\]\]/g)]).toHaveLength(1);
    for (const id of new Set(semua)) expect(entri(id), `[[${id}]] tidak ada di registry`).toBeDefined();
    const peran: [string, string][] = [
      ["t4-m32", "m32"], ["t1-adr-12", "sengaja belum"], ["t4-webhook", "webhook masuk"], ["t4-skema", "skema data"], ["t2-idempotency", "idempotency"],
      ["t4-tim-infra", "pipeline per modul"], ["t4-prd", "prd v4"], ["t4-kartu", "kartu virtual"], ["t4-breaker", "circuit breaker"], ["t2-skema-tanpa-downtime", "ubah skema tanpa downtime"],
    ];
    for (const [id, k] of peran) expect(entri(id)!.judul.toLowerCase(), id).toContain(k);
    expect([...new Set(semua)].sort()).toEqual(peran.map((p) => p[0]).sort());
    for (const kalimat of [
      "Prasyarat: [[t4-m32]]",
      "[[t4-m32]] menunjukkan rilis tim Merchant yang mematahkan top-up, padahal tes tim Pembayaran lolos.",
      "ADR 12 menunda service kedua sampai beberapa tim bentrok di satu repo ([[t1-adr-12]])",
      "[[t4-webhook]] menulis janji yang ditepati di sini: ledger dipanggil lewat API di luar transaction pembayaran.",
      "Tabel modul dan tabelnya sudah ada di [[t4-skema]].",
      "ADR 12 sudah memperingatkannya ([[t1-adr-12]]).",
      "Idempotency-Key ledger hidup 24 jam ([[t2-idempotency]]).",
      "Pipeline per modul dan tes contract dikerjakan [[t4-tim-infra]].",
      "kegagalan pihak ketiga diisolasi dengan antrean dan breaker, tanpa satu service per pihak ([[t4-breaker]]).",
      "([[t4-webhook]], [[t4-kartu]])",
      "PRD v4 meminta PT berdiri sendiri: kredensial gateway dan data kartu butuh batas yang bisa diaudit ([[t4-prd]]).",
      "tidak diganti namanya dalam satu migration ([[t2-skema-tanpa-downtime]]).",
      "| Pemeriksa ADR wajib dan review CODEOWNERS di CI | Fitur GitHub, Tidak dijalankan. Plan pemilik [perlu verifikasi] | [[t4-tim-infra]] |",
    ]) harus(kalimat);
    const hitung = Object.fromEntries([...new Set(semua)].map((id) => [id, semua.filter((x) => x === id).length]));
    expect(hitung).toEqual({ "t4-m32": 4, "t1-adr-12": 2, "t4-webhook": 2, "t4-skema": 1, "t2-idempotency": 1, "t4-tim-infra": 3, "t4-prd": 1, "t4-kartu": 2, "t4-breaker": 1, "t2-skema-tanpa-downtime": 1 });
    expect(semua[0]).toBe("t4-m32");
    expect(entri("t4-webhook")!.judul).toContain("ADR 34");
    expect(entri("t4-webhook")!.ada).toBe(true);
  });
  test("lima blok, heading, komponen, impor, tab stack, dan label turunan didefinisikan di pemakaian pertama", () => {
    const blok = [...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1]!);
    expect(blok).toEqual([
      'nama="Mulai" buka',
      'nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: SQL lintas modul gagal sebelum rilis bila role dan schema dipisah, dan rename kolom hanya mematahkan modul yang membacanya lewat kontrak."',
      'nama="Paham"',
      'nama="Putuskan"',
      'nama="Kunci"',
    ]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(5);
    const luarKode = halaman.replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "");
    const heading = [...luarKode.matchAll(/^(#{2,4}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(heading).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain",
      "### ADR 37: modular monolith dengan batas yang dijaga mesin, dan satu service pembayaran", "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    const komponen = [...halaman.matchAll(/<(Rantai|Tebak|WidgetLama|DiagramArsitektur|TabSet|SkripLama)\b([^>]*)>/g)].map((m) => `${m[1]}${m[2]}`.trim());
    expect(komponen).toEqual([
      "Rantai data={intiDiagram} ringkas /",
      "Tebak client:visible data={dataTebak} /",
      'WidgetLama nama="banding" src="data/t4-modul-banding.json" /',
      'DiagramArsitektur client:visible id="diagram-t4-modul" judul="Modul dan schema Tahap 4" data={Arsitektur.parse(arsitekturModul)} /',
      'TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}',
      'SkripLama daftar={["cerita","banding"]} /',
    ]);
    expect(halaman.indexOf("<Rantai")).toBeLessThan(halaman.indexOf("<Tebak"));
    expect(halaman.indexOf("<Tebak")).toBeLessThan(halaman.indexOf("<WidgetLama"));
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((halaman.match(/<noscript>/g) ?? []).length).toBe(2);
    const impor = [...halaman.matchAll(/^import (\{ )?(\w+)( \})? from "([^"]+)";$/gm)].map((m) => `${m[2]} ${m[4]}`);
    expect(impor).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro", "TabSet ../../../components/TabSet.astro",
      "WidgetLama ../../../components/WidgetLama.astro", "SkripLama ../../../components/SkripLama.astro", "Tebak ../../../widgets/tebak/Tebak.tsx",
      "DiagramArsitektur ../../../diagram/DiagramArsitektur", "Arsitektur ../../../diagram/skema",
      "intiDiagram ../../../../data/diagram/t4-modul-inti.json", "arsitekturModul ../../../../data/arsitektur/t4-modul.json", "dataTebak ../../../../data/widget/t4-modul-tebak.json",
    ]);
    // Tab stack: Go dijalankan di lab, lima lainnya Tidak dijalankan.
    const tab = halaman.split(/<Fragment slot="t(\d)">/).slice(1);
    expect(tab.filter((_, i) => i % 2 === 0)).toEqual(["0", "1", "2", "3", "4", "5"]);
    const isi = tab.filter((_, i) => i % 2 === 1);
    const versi = batas.match(/^# PostgreSQL (\d+\.\d+) .* · go(\d+\.\d+\.\d+) ·/m)!;
    expect(isi[0]).toContain(`*Dijalankan: lab t4-modul, PostgreSQL ${versi[1]} dan Go ${versi[2]} (rekaman \`batas.txt\`).*`);
    for (const i of [1, 2, 3, 4, 5]) expect(isi[i]!, `tab ${i}`).toContain("*Tidak dijalankan.");
    for (const i of [1, 2, 3, 5]) expect(isi[i]!, `tab ${i}`).toContain("Kode di bawah adalah Ilustrasi.");
    expect(isi[4]).not.toContain("<Snippet");
    expect((halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g) ?? []).length).toBe(6);
    expect(halaman).not.toMatch(/Yang sama di semua stack|sama di semua stack/);
    expect(isi[1]).toContain("Node.js v26.13.0");
    expect(isi[2]).toContain("Laravel 13.x");
    expect(isi[3]).toContain("Django 6.1");
    expect(isi[4]).toContain("Serverpod 4.0.0");
    expect(isi[1]).toContain("Dokumentasi tidak menyatakan bahwa `exports` membatasi impor relatif antar folder dalam satu package");
    expect(isi[2]).toContain("Dokumentasi itu tidak menyediakan batas modul di sisi kode (Tidak dijalankan: dibaca dari dua halaman itu).");
    expect(isi[3]).toContain("Dokumentasi menulis bahwa Django tidak mendukung foreign key atau relasi many-to-many yang menyeberang beberapa database.");
    expect(isi[4]).toContain("Dokumentasi yang dibuka tidak membahas schema atau role per modul, dan tidak membahas batas modul di sisi kode.");
    expect(isi[5]).toContain("Dokumentasi tidak menyajikan schema per modul sebagai praktik, dan tidak membahas batas modul di sisi kode.");
    for (const b of ["Node.js v26.13.0", "Laravel 13.x", "Django 6.1", "Serverpod 4.0.0", "Securing your API"]) expect(barisRiset("R4-174"), b).toContain(b);
    // Label turunan: Hitungan didefinisikan di pemakaian pertama.
    const pertama = halaman.indexOf("Hitungan");
    expect(pertama).toBe(halaman.indexOf("Hitungan atas Asumsi lab: hasil rumus dari angka yang tertulis di halaman ini"));
    expect(halaman.indexOf("Asumsi")).toBe(halaman.indexOf("Asumsi: angka cerita atau pilihan penulis tanpa rekaman"));
    expect(halaman.indexOf("Ilustrasi")).toBe(halaman.indexOf("Ilustrasi: contoh yang bukan hasil sistem"));
    expect(halaman.indexOf("CODEOWNERS adalah file yang menunjuk pemilik")).toBeLessThan(halaman.indexOf("CODEOWNERS", halaman.indexOf("CODEOWNERS adalah file") + 10) + 1);
    expect(halaman.indexOf("Schema adalah ruang nama untuk tabel di dalam satu database, dan role adalah identitas login database dengan hak sendiri.")).toBeLessThan(halaman.indexOf("<details"));
    expect(halaman.indexOf("Modul adalah sekelompok kode dan tabel yang dipegang satu tim.")).toBeLessThan(halaman.indexOf("### Cara kerjanya"));
    expect(halaman.indexOf("Pool adalah kumpulan koneksi database yang dipakai bergantian.")).toBeLessThan(halaman.indexOf("pool pembayaran"));
    expect(halaman.indexOf("`search_path` adalah daftar schema yang dicari bila nama tabel ditulis tanpa awalan.")).toBeLessThan(halaman.indexOf("PostgreSQL mengabaikan schema di daftar itu"));
    expect(halaman.indexOf("Branch protection adalah aturan GitHub")).toBeLessThan(halaman.indexOf("Require review from Code Owners"));
    const prosa = halaman.replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "");
    expect(prosa).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(prosa).not.toMatch(/Anda|!/);
    expect(prosa).not.toMatch(/Ilustrasi mekanisme/);
  });
  test("Rantai, diagram arsitektur, Tebak, dan widget perbandingan valid dan cocok dengan rekaman", () => {
    expect(DataRantai.safeParse(rantai).success).toBe(true);
    expect(Arsitektur.safeParse(arsitektur).success).toBe(true);
    expect(DataTebak.safeParse(tebak).success).toBe(true);
    expect(requireCjs("../../lama/widgets/banding.js").cekData(banding)).toEqual([]);
    // Diagram: satu kotak per modul, jumlah tabel dari rekaman, lima di satu proses dan pembayaran di proses sendiri.
    const kotak = Arsitektur.parse(arsitektur).baris.flat();
    expect(kotak.map((k) => k.label)).toEqual(["Modul ledger", "Modul akun", "Modul identitas", "Modul merchant", "Modul platform", "Service pembayaran"]);
    for (const k of kotak) {
      const m = k.label.replace(/^(Modul|Service) /, "");
      expect(k.catatan, k.label).toContain(`Schema t4m_${m}, ${tabelPerSchema[m]} tabel`);
    }
    expect(kotak.filter((k) => k.zona === "monolith")).toHaveLength(5);
    expect(kotak.filter((k) => k.zona === "pembayaran").map((k) => [k.label, k.baru])).toEqual([["Service pembayaran", true]]);
    expect(kotak.filter((k) => k.baru)).toHaveLength(1);
    expect(Arsitektur.parse(arsitektur).zona!.map((z) => z.label)).toEqual(["Satu proses", "Proses sendiri"]);
    expect(Arsitektur.parse(arsitektur).caption).toContain("dengan role t4m_monolit, dan satu modul di proses sendiri dengan role t4m_pembayaran");
    expect(modulSql).toContain("ALTER ROLE t4m_monolit SET search_path");
    expect(kotak[5]!.catatan).toContain("Meminta jurnal lewat API ledger dengan Idempotency-Key dan tidak membaca tabel modul lain.");
    // Rantai: kode 42703, 42P01, 42501 dari rekaman bagian A dan B.
    expect(rantai.baris[0]!.simpul.map((s) => s.teks)).toEqual(["tes lolos", "rename kolom", "42703 di database"]);
    expect(rantai.baris[1]!.simpul.map((s) => s.teks)).toEqual(["SQL ditolak", "rename kolom", "pembayaran jalan"]);
    expect(rantai.baris[1]!.simpul[0]!.sub).toBe("42P01 dan 42501");
    expect(BA.join("\n")).toContain("(42703)");
    expect(rantai.baris.map((b) => b.label)).toEqual(["Tanpa batas", "Dengan batas"]);
    expect(rantai.baris[2]).toBeUndefined();
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-modul, batas.txt bagian A dan B" });
    // Tebak: jawaban benar di posisi terakhir, bukan pilihan terpanjang, dan cocok dengan rekaman bagian B.
    expect(tebak.pilihan.map((p) => p.benar)).toEqual([false, false, false, true]);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[3]).toBeLessThan(Math.max(...panjang));
    expect(tebak.pilihan[3]!.teks).toBe('relation "akun" does not exist (42P01): tabel akun tidak ditemukan.');
    expect(BB.join("\n")).toContain(tebak.pilihan[3]!.teks.split(":")[0]!);
    expect(tebak.pilihan[1]!.teks).toContain("permission denied for table akun (42501)");
    expect(tebak.pilihan[1]!.alasan).toContain("permission denied for schema t4m_akun");
    expect(tebak.pilihan[2]!.teks).toContain('column "nama" does not exist (42703)');
    expect(tebak.sumber).toEqual({ jenis: "rekaman", teks: "labs/t4-modul/output/batas.txt bagian B" });
    expect(tebak.adegan[1]).toBe("Kode pembayaran menjalankan SQL lamanya apa adanya: SELECT nama FROM akun, tanpa awalan schema.");
    expect(tebak.pilihan[3]!.alasan).toContain("search_path, daftar schema yang dicari bila nama tabel tanpa awalan, hanya memuat schema pembayaran untuk role ini.");
    expect(modulSql).toContain("ALTER ROLE t4m_pembayaran SET search_path = t4m_pembayaran;");
    // Perbandingan: tiga kejadian, dua opsi, catatan memuat kode dari rekaman.
    expect(banding.fitur.map((f) => f.label)).toEqual(["Pembayaran membaca akun.nama", "Modul akun mengganti nama kolom", "Pembayaran mengimpor paket data akun"]);
    expect(banding.opsi.map((o) => o.id)).toEqual(["satu", "modul"]);
    expect(banding.opsi.map((o) => o.nama)).toEqual(["A · Batas hanya di dokumen: satu schema, satu role", "B · Batas dijaga mesin: schema, role, dan internal/ per modul"]);
    expect(banding.opsi[0]!.baris[0]![2]!.sub).toBe(`${totalTabel} tabel di satu schema`);
    expect(banding.opsi[1]!.baris[0]![2]!.sub).toBe(`${tabelPerSchema.pembayaran} tabel`);
    expect(banding.opsi[1]!.baris[1]![2]!.sub).toBe(`${tabelPerSchema.akun} tabel`);
    expect(banding.fitur[0]!.catatan.modul).toContain('relation "akun" does not exist (42P01)');
    expect(banding.fitur[0]!.catatan.modul).toContain("permission denied for schema t4m_akun (42501)");
    expect(banding.fitur[0]!.catatan.satu).toContain('"Top-up Rp200000 masuk ke Budi"');
    expect(batas).toContain('"Top-up Rp200000 masuk ke Budi"');
    expect(banding.fitur[1]!.catatan.satu).toContain('column "nama" does not exist (42703)');
    expect(banding.fitur[2]!.catatan.satu).toContain("Tidak direkam");
    expect(banding.fitur[2]!.catatan.modul).toContain("use of internal package ... not allowed");
    expect(banding.fitur.every((f) => (f.nada as Record<string, string>).satu === "warn")).toBe(true);
    harus("Rekaman mendukung semua catatan kecuali sisi A pada kejadian ketiga, yang Tidak direkam.");
    harus("Sisi A satu schema dan satu role, sisi B enam schema dengan role dan `internal/` per modul.");
    harus("**Ubah satu hal:** pilih Modul akun mengganti nama kolom. Sisi A menjawab 42703 sesudah rename, dan sisi B tidak mematahkan pembayaran. Pilih Pembayaran mengimpor paket data akun: hanya sisi B yang menolak.");
    harus("Jawaban yang tepat: relation \"akun\" does not exist (42P01), karena schema akun tidak ada di search_path role pembayaran (batas.txt bagian B).");
  });
});

describe("kunci kalimat dan sidik kata penentu (lapis 2 dan penutup mutasi tanpa kunci)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sidik = (teks: string, kunci: string[]): Record<string, number> =>
    Object.fromEntries(kunci.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
  const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "satu", "dua", "tiga", "lima", "enam", "bila", "karena"];
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantai), arsitektur: tekstual(arsitektur), tebak: tekstual(tebak), banding: tekstual(banding), istilah: tekstual(istilah) },
  };
  const sidikHalaman = sidik(halaman, KATA);
  const sidikJson = Object.fromEntries(Object.entries(sekarang.json).map(([k, v]) => [k, sidik(v.join("\n"), KATA)]));
  const jumlahLabel = {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length,
    tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length,
    asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length,
    perluVerifikasi: (halaman.match(/\[perlu verifikasi/g) ?? []).length,
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat modular-monolith.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON = ${JSON.stringify(sekarang.json, null, 1)};\nexport const SIDIK_HALAMAN: Record<string, number> = ${JSON.stringify(sidikHalaman)};\nexport const SIDIK_JSON: Record<string, Record<string, number>> = ${JSON.stringify(sidikJson)};\nexport const JUMLAH_LABEL: Record<string, number> = ${JSON.stringify(jumlahLabel)};\n`;
    fs.writeFileSync(path.join(__dirname, "modular-monolith.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string Rantai, diagram, Tebak, perbandingan, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman dan data (kunci agregat, bukan turunan)", () => {
    expect(sidikHalaman).toEqual(SIDIK_HALAMAN);
    expect(sidikJson).toEqual(SIDIK_JSON);
  });
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi, Ilustrasi, Hitungan, dan Tidak dijalankan tidak naik menjadi Rekaman lab", () => {
    expect(jumlahLabel).toEqual(JUMLAH_LABEL);
    expect(jumlahLabel.perluVerifikasi).toBeGreaterThanOrEqual(3);
  });
  test("frontmatter dan deskripsi", () => {
    expect(halaman.startsWith('---\ntitle: "4.13 Modular monolith, CODEOWNERS, ADR wajib + ADR 37"\n')).toBe(true);
    expect(halaman).toContain("description: Rekeningo membagi satu codebase ke enam modul dengan batas yang dijaga compiler dan hak database, bukan ingatan tim. ADR 37 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
  });
});

describe("klaim yang dibantah sumbernya sendiri dan kalimat mekanisme", () => {
  test("kalimat mekanisme, lingkup klaim negatif, dan kata penuh", () => {
    harus("Batas antar tim dijaga mesin: database menolak SQL ke tabel tim lain, dan compiler menolak impor kodenya.");
    harus("Batas compiler hanya berlaku untuk paket baru di `internal/modul/`. Kode ledger lama di `internal/repo` dan `internal/service` belum dipindah.");
    harus("Pool per modul belum dibangun, jadi satu role per proses hanya ada di service pembayaran.");
    harus("Pemisahan schema tidak memutus foreign key.");
    harus("memisahkan database fisik per modul berarti membuangnya (Tidak dijalankan).");
    harus("Aturan \"ADR wajib\" itu sendiri dijaga review dan checklist PR, bukan mesin. Pemeriksa yang menolak PR tanpa ADR tidak ada di lab (Tidak dijalankan).");
    harus("CODEOWNERS dan review wajib Tidak dijalankan di lab, karena keduanya fitur GitHub. Cadangannya checklist PR manual.");
    harus("Plan repositori pemilik belum diketahui [perlu verifikasi: plan pemilik].");
    harus("Pemilik hanya diminta me-review.");
    harus("Review wajib menyala bila admin mengaktifkan opsi \"Require review from Code Owners\" di aturan itu.");
    harus("Pola terakhir yang cocok menang, ukuran file harus di bawah 3 MB, dan pemilik harus punya akses tulis");
    harus("file itu dicari di `.github/`, root, atau `docs/`, dan yang pertama ditemukan dipakai.");
    harus("Rekaman hanya memuat batasnya", 2);
    harus("Bebannya bukan alasan memecah.");
    harus("Kapasitas satu server tetap belum terukur.");
    harus("Rekaman lab menjalankan SQL M32 dengan role pembayaran sesudah modul dipisah.");
    harus("Baris ketiga adalah kontrol: role `t4m_akun` menjalankan SQL yang sama pada baris yang sama dan berhasil. Jadi yang berubah adalah siapa yang boleh, bukan datanya.");
    harus("Kolom `nama` bukan kontrak siapa pun, jadi ledger menerima `permission denied` bila membacanya:");
    harus("Batas compiler hanya untuk paket baru");
    // Klaim universal dan negatif berlingkup: tidak ada kata penuh tanpa lingkup.
    expect(halaman).not.toMatch(/\b(selalu|pasti|dijamin|semua stack)\b/i);
    // Kasus industri dibaca sampai batasnya, atribusi tepat.
    harus("Batasnya: satu aplikasi Rails, dengan developer lebih dari 1.000 ÷ 13 ≈ 77 kali Tahap 4 (Hitungan), dan penegakan saat runtime masih mereka riset.");
    harus("Batasnya: pipeline pengiriman event ke tujuan, bukan sistem uang.");
    harus("Pelajarannya untuk Rekeningo hanya satu: kegagalan pihak ketiga diisolasi dengan antrean dan breaker, tanpa satu service per pihak");
    harus("Halaman ini tidak memakainya sebagai pembanding.");
    harus("Martin Fowler menulis bahwa aplikasi baru sebaiknya dimulai sebagai monolith dengan modularitas yang dijaga, karena batas service yang salah mahal diperbaiki");
    harus("Fowler menulis bahwa microservices tidak perlu dipertimbangkan sebelum sistem terlalu kompleks untuk dikelola sebagai monolith");
    harus("Halaman paket GitHub mencantumkan code owners dan protected branches di bawah Pro dan Team untuk repositori privat. Halaman itu tidak menulis kalimat eksplisit tentang paket Free");
    harus("Nama tim dan folder `merchant` di contoh itu Ilustrasi: naskah hanya membagi tim menjadi Pembayaran (gateway dan kartu), Merchant (QR dan dasbor), dan Platform (sisanya).");
    expect(naskah).toContain("memegang gateway, top-up, rekonsili");
    expect(naskah).toContain("**Tim Merchant** (4 orang");
    expect(naskah).toContain("**Tim Platform** (4 orang");
  });
  test("tiga opsi ditolak masing-masing punya alasan, dan opsi D punya bukti rekaman", () => {
    harus("- **A ditolak** karena aturan \"jangan baca tabel tim lain\" hanya ada di dokumen, dan M32 melewatinya tanpa peringatan di CI (`batas.txt` bagian A).");
    harus("- **C ditolak** karena kredensial gateway dan data kartu terbuka untuk seluruh proses (Tidak dijalankan: dibaca dari naskah).");
    harus("| Bukti | Rekaman lab `batas.txt` A: CI hijau, lalu 42703 | Tidak dijalankan. Segment menggabung 140+ service kembali menjadi satu | Tidak dijalankan: dibaca dari naskah | Rekaman lab `batas.txt` B, `ledger.txt`, `proses-mati.txt`, dan `latensi.txt` |");
    harus("| | A. Satu paket tanpa batas | B. Semua modul jadi service | C. Modular monolith tanpa service pembayaran | D. Modular monolith dan satu service pembayaran |");
    expect(registryJudul("t4-breaker")).toContain("circuit breaker");
    for (const f of ["batas.txt", "ledger.txt", "proses-mati.txt", "latensi.txt"]) expect(fs.existsSync(path.join(akar, "labs/t4-modul/output", f))).toBe(true);
  });
});
function registryJudul(id: string): string { return entri(id)?.judul ?? ""; }
