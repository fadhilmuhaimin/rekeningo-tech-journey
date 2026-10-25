// Penjaga angka halaman 2.33 (keputusan 743 sampai 745): angka, nomor ADR, nomor halaman, dan klaim "belum ada" yang
// ditulis tangan di halaman MDX dan di data widget t2-jembatan-tebak.json harus bisa diturunkan dari rekaman lab,
// registry cerita.json, naskah Tahap 3 (isi PRD v3), dan halaman Tahap 2 yang dirujuk. Tes ini tidak mengulang isi
// tebak (logika.test.ts); ia menjaga bahwa mengubah satu angka, satu ID `[[...]]`, satu nomor ADR, atau satu tautan di
// MDX atau JSON menggagalkan build, dan bahwa halaman tidak membuka isi Tahap 3 lebih dari yang diizinkan naskah
// Tahap 2 bagian 6 (jawaban: batas laju di memori saat server jadi dua, notifikasi di dalam transaction jurnal).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../../data/cerita.json";
import dataMentah from "../../../data/widget/t2-jembatan-tebak.json";
import { DataTebak } from "./skema";
import { nilai } from "./logika";

const akar = path.resolve(__dirname, "../../../..");
const baca = (p: string) => fs.readFileSync(path.join(akar, p), "utf8");
const T2 = (f: string) => baca(`situs/src/content/docs/tahap-2/${f}`);
const mdx = T2("jembatan-prd-v3.mdx");
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const data = DataTebak.parse(dataMentah);
const naskah3 = baca("plan/CERITA-TAHAP-3.md");

type Hal = { id: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; prasyarat?: string[]; judul: string };
const hal = cerita.halaman as unknown as Hal[];
const dari = (id: string): Hal => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const koma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const titik = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const ada = (berkas: string, kalimat: string) => expect(T2(berkas), `${berkas} tidak memuat: ${kalimat}`).toContain(kalimat);
const harus = (kalimat: string) => expect(mdx, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

// Teks semua pilihan, alasan, adegan, dan penutup widget, untuk dicari angkanya.
const teksWidget = [data.adegan.join(" "), data.pertanyaan, data.penutup, ...data.pilihan.flatMap((p) => [p.teks, p.alasan])].join("\n");
const dalamWidget = (kalimat: string) => expect(teksWidget, `widget tidak memuat: ${kalimat}`).toContain(kalimat);

// Beban dari registry: sama dengan sinkron_cerita.py dan halaman 2.30.
const puncak = (a: { user: number; aktif: number; req: number; puncak: number }) => (((a.user * a.aktif) / 100) * a.req) / 86400 * a.puncak;
const a2 = cerita.tahap[1]!.asumsi;
const a3 = cerita.tahap[2]!.asumsi;
const p2 = puncak(a2);
const p3 = puncak(a3);
const naik = p3 / p2;
const aktif3 = (a3.user * a3.aktif) / 100;
const lambdaBayar = ((aktif3 * 3) / 86400) * a3.puncak; // 3 transaksi per user aktif per hari (naskah Tahap 2 bagian 3b)

// Rekaman c4-ratelimit bagian F.
const c4 = baca("labs/c4-ratelimit/output/login/ratelimit.txt").split("\n");
const F = (() => {
  const m = c4.map((b) => b.match(/^ {2}(\d+) percobaan satu IP, bergantian ke (\d+) instance → 401: (\d+) · 429: (\d+)$/)).find((x) => x);
  if (!m) throw new Error("rekaman c4 bagian F: baris percobaan tidak ditemukan");
  const [percobaan, instance, lolos, ditolak] = m.slice(1).map(Number) as [number, number, number, number];
  return { percobaan, instance, lolos, ditolak, perServer: lolos / instance };
})();

// Rekaman b3-race: B menunggu lock selama A belum COMMIT.
const kunci = baca("labs/b3-race/output/ledger/ledger-for-update.txt").split("\n");
const urutKunci = {
  bMenunggu: kunci.findIndex((b) => /^ ?4 \[B\] SELECT saldo_cache FROM buku WHERE id = 2 FOR UPDATE {2}-> MENUNGGU lock/.test(b)),
  aCommit: kunci.findIndex((b) => /^ ?9 \[A\] COMMIT {2}-> COMMIT/.test(b)),
  bLanjut: kunci.findIndex((b) => /^10 \[B\] SELECT saldo_cache FROM buku WHERE id = 2 FOR UPDATE {2}-> 30000/.test(b)),
};

// Rekaman b2-query: halaman pertama riwayat Budi, JOIN dengan index.
const joinIndex = (() => {
  const m = baca("labs/b2-query/output/ledger/n1.txt").match(/^ Riwayat Budi hal\. 1 {2}\| JOIN \|\s+[\d.]+ ms\s+\|\s+([\d.]+) ms\s*$/m);
  if (!m) throw new Error("n1.txt bagian E: baris JOIN dengan index tidak ditemukan");
  return Number(m[1]);
})();

// Rekaman api-t2: job malam menemukan selisih cache dan keluar dengan status 1.
const migrasi = baca("labs/api-t2/output/migrasi.txt").split("\n");
const jobMalam = (() => {
  const e = migrasi.findIndex((b) => b.startsWith("# --- E. Cek cache tiap malam"));
  const blok = migrasi.slice(e, e + 14);
  const selisih = blok.map((b) => b.match(/selisih (\d+)$/)).find((x) => x);
  const status = blok.findIndex((b) => b === "# exit status 1");
  return { selisih: selisih ? Number(selisih[1]) : -1, statusAda: status > 0 };
})();

describe("rekaman: angka turunan yang dipakai halaman dan widget", () => {
  test("bagian F: 24 percobaan ke dua instance, 20 lolos, 10 per server", () => {
    expect(F).toEqual({ percobaan: 24, instance: 2, lolos: 20, ditolak: 4, perServer: 10 });
    expect(c4.some((b) => b.startsWith("== F. Dua instance: bucket di memori tidak dibagi (ADR 20)"))).toBe(true);
    dalamWidget(`${F.percobaan} percobaan dari satu alamat meloloskan ${F.lolos}, yaitu ${F.perServer} per server (Rekaman lab, bagian F)`);
    dalamWidget(`Dua server yang bergantian menerima`);
  });
  test("b3-race: B menunggu lock sampai A COMMIT, baru lanjut", () => {
    expect(urutKunci.bMenunggu).toBeGreaterThan(0);
    expect(urutKunci.aCommit).toBeGreaterThan(urutKunci.bMenunggu);
    expect(urutKunci.bLanjut).toBeGreaterThan(urutKunci.aCommit);
    expect(kunci.some((b) => b.includes("-- akhir: A COMMIT; B ditolak kode: saldo kurang; menunggu lock 1; retry 0"))).toBe(true);
    dalamWidget("Lock buku ADR 13 dipegang sampai COMMIT, dan request kedua menunggu selama itu (Rekaman lab)");
    ada("race-lock.mdx", "Request kedua menunggu sampai yang pertama selesai");
    ada("race-lock.mdx", "4. Tidak ada panggilan jaringan atau kerja lambat selama lock dipegang.");
  });
  test("b2-query: halaman pertama riwayat Budi 1,4 ms dengan index", () => {
    expect(joinIndex).toBe(1.4);
    dalamWidget(`Query riwayat Budi halaman pertama memakan ${koma(joinIndex)} ms dengan index, diukur tanpa jaringan ke API (Rekaman lab)`);
    expect(baca("labs/b2-query/output/ledger/n1.txt")).toContain("diukur di client Python (psycopg 3) ke PostgreSQL di Docker di mesin yang");
  });
  test("api-t2 migrasi bagian E: selisih Rp5.000 dan job keluar dengan status 1", () => {
    expect(jobMalam).toEqual({ selisih: 5000, statusAda: true });
    harus(`Di rekaman yang diperankan, job malam menemukan selisih cache saldo Rp${titik(jobMalam.selisih)} dan keluar dengan status 1 (\`migrasi.txt\` bagian E`);
    expect(migrasi.some((b) => b.startsWith("# Diperankan: kode yang salah menulis cache tanpa posting"))).toBe(true);
    ada("saldo-bukan-kolom.mdx", "Job keluar dengan status 1 supaya penjadwal memberi tahu");
  });
});

describe("registry dan beban: angka turunan dari cerita.json dan halaman 2.30", () => {
  test("puncak ±1,4 dan ±17,4 request per detik, naik 12,5 kali", () => {
    expect([koma(p2), koma(p3), koma(naik)]).toEqual(["1,4", "17,4", "12,5"]);
    harus(`| Beban puncak (Asumsi) | ±${koma(p2)} request per detik | ±${koma(p3)} request per detik, naik ${koma(naik)} kali |`);
    dalamWidget(`Puncak PRD v3 ±${koma(p3)} request per detik (Asumsi), naik ${koma(naik)} kali dari ±${koma(p2)} di Tahap 2.`);
    dalamWidget(`karena request naik ${koma(naik)} kali`);
    dalamWidget(`Puncak ±${koma(p3)} request per detik adalah Asumsi`);
    harus(`puncak ±${koma(p3)} request per detik untuk PRD v3 (Asumsi)`);
    ada("estimasi.mdx", "| Puncak request per detik (Tahap 3) | ±17 | 150.000 ÷ 86.400 × 10 |");
  });
  test("lingkup dan tim v2 dan v3 cocok dengan registry dan PRD v2", () => {
    expect(a2.user).toBe(1000);
    expect(a3.user).toBe(10000);
    expect(cerita.tahap[2]!.rekap).toContain(`±${titik(a3.user)} karyawan, ±60 warung, 10 minggu`);
    expect(a3.tim).toBe("4 developer");
    expect(a2.tim).toBe("2 developer");
    ada("prd-v2.mdx", "3 gedung, ±1.000 karyawan, 12 warung");
    ada("prd-v2.mdx", "8 minggu, 2 engineer");
    harus(`<dd>Enam kota: ±${titik(a3.user)} karyawan, ±60 warung</dd>`);
    harus(`<dd>4 engineer, 10 minggu</dd>`);
    harus(`| Lingkup | Seluruh kampus pusat: ${titik(a2.user)} karyawan, 12 warung | Enam kota: ±${titik(a3.user)} karyawan, ±60 warung |`);
    harus("| Tim | 2 engineer, 8 minggu | 4 engineer, 10 minggu (Asumsi cerita) |");
    expect(naskah3).toContain("Tim jadi empat orang dalam 10 minggu (Asumsi cerita)");
    expect(naskah3).toContain("sekitar 10.000 karyawan dan ±60 warung");
  });
  test("Minggu 8, tiga jam, selisih Rp0: angka naskah yang sama dengan 2.29", () => {
    expect(naskah3).toContain("Tutup buku kedua Tahap 2 lolos dalam 3 jam dengan selisih Rp0");
    ada("m17-prd-v3.mdx", "Minggu 8 Tahap 2.");
    ada("m17-prd-v3.mdx", "Laporan selesai dalam tiga jam, dan selisihnya Rp0.");
    harus("Minggu 8 Tahap 2. Uji coba tutup buku kedua selesai dalam tiga jam dengan selisih Rp0 ([[t2-m17]])");
  });
  test("hitungan koneksi bayar dan transfer: 0,87 per detik, 1,75 dan 26,1 koneksi", () => {
    expect(koma(lambdaBayar, 2)).toBe("0,87");
    const l2 = lambdaBayar * (0.02 + 2);
    const l30 = lambdaBayar * (0.02 + 30);
    expect([koma(l2, 2), koma(l30)]).toEqual(["1,75", "26,1"]);
    // Peninjau (keputusan 746): 0,87 yang dibulatkan dikali 2,02 memberi 1,76, jadi halaman memakai angka tepat 0,868.
    expect(koma(0.87 * (0.02 + 2), 2)).toBe("1,76");
    harus(`${koma(lambdaBayar, 3)} per detik × (0,02 + 2 detik) = ${koma(l2, 2)} koneksi tertahan, dan ${koma(l30)} bila panggilannya 30 detik (Asumsi)`);
    ada("estimasi.mdx", `| Tahap 3, bayar dan transfer, panggilan luar 2 detik (Asumsi) | ${koma(lambdaBayar, 2)} | 2,02 detik | ${koma(l2, 2)} |`);
    ada("estimasi.mdx", `| Tahap 3, bayar dan transfer, panggilan luar 30 detik (Asumsi) | ${koma(lambdaBayar, 2)} | 30,02 detik | ${koma(l30)} |`);
  });
  test("ukuran data: 5.475.000 posting per tahun, partisi di ±440 juta", () => {
    const posting = aktif3 * 3 * 365 * 2;
    expect(titik(posting)).toBe("5.475.000");
    dalamWidget(`kira-kira ${titik(posting)} posting, sedangkan ADR 6 baru menjadwalkan partisi di ±440 juta posting per tahun (Asumsi)`);
    ada("estimasi.mdx", `${titik(posting)} posting × 250 byte`);
    ada("estimasi.mdx", "dijadwalkan saat ±440 juta posting per tahun di Tahap 5");
    ada("adr-ledger.mdx", "Naskah memperkirakan ±440 juta posting per tahun di Tahap 5 (Asumsi) | Tahap 5: partisi `posting` per bulan dan snapshot saldo");
  });
});

describe("nomor ADR, nomor halaman, dan tautan", () => {
  test("ADR Tahap 2: 6 direvisi, lalu 13 sampai 21, masing-masing satu halaman", () => {
    const adr = hal.filter((h) => h.tahap === 2 && h.adr).flatMap((h) => h.adr!);
    expect(adr).toEqual([6, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    dalamWidget(`ADR ${adr[1]} sampai ${adr[adr.length - 1]}, dan ADR ${adr[0]} yang direvisi`);
    harus(`menulis ADR ${adr[1]} sampai ${adr[adr.length - 1]} dan merevisi ADR ${adr[0]} ([[t2-adr-ledger]])`);
    expect(dari("t2-adr-ledger").judul).toContain("ADR 6 direvisi");
  });
  test("pilihan menyebut nomor ADR yang benar untuk halamannya", () => {
    const adrDari = (id: string) => dari(id).adr![0]!;
    const [benar, data2, kapasitas] = data.pilihan;
    expect(benar!.teks.startsWith(`ADR ${adrDari("t2-login-aman")} dan ADR ${adrDari("t2-race-lock")}:`)).toBe(true);
    expect(data2!.teks.startsWith(`ADR ${adrDari("t2-adr-ledger")}:`)).toBe(true);
    expect(data2!.alasan).toContain(`ADR ${adrDari("t2-adr-ledger")} baru menjadwalkan partisi`);
    expect(kapasitas!.teks.startsWith(`ADR ${adrDari("t2-adr-21")}:`)).toBe(true);
    expect(benar!.alasan).toContain(`Batas laju ADR ${adrDari("t2-login-aman")}`);
    expect(benar!.alasan).toContain(`Lock buku ADR ${adrDari("t2-race-lock")}`);
    harus(`dua ADR yang pecah lebih dulu: ADR ${adrDari("t2-login-aman")} dan ADR ${adrDari("t2-race-lock")}`);
    harus(`Batas laju ADR ${adrDari("t2-login-aman")}`.replace("Batas laju", "batas laju"));
    harus(`Lock buku ADR ${adrDari("t2-race-lock")}`);
    harus(`satu proses mati`);
  });
  test("jawaban benar: tepat satu, yang menyebut ADR 20 dan ADR 13; pilihan salah punya alasan sendiri", () => {
    expect(data.pilihan.filter((p) => p.benar)).toHaveLength(1);
    const j = data.pilihan.findIndex((p) => p.benar);
    expect(data.pilihan[j]!.teks).toContain("ADR 20 dan ADR 13");
    expect(nilai(data, j).benar).toBe(true);
    for (let i = 0; i < data.pilihan.length; i++) {
      if (i !== j) expect(nilai(data, i).alasan[1]).toBe(data.pilihan[j]!.alasan);
    }
    expect(new Set(data.pilihan.map((p) => p.alasan)).size).toBe(data.pilihan.length);
  });
  test("tiap [[ID]] di halaman ada di registry; yang Tahap 2 menunjuk nomor yang benar", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(
      ["t2-adr-21", "t2-adr-ledger", "t2-estimasi", "t2-idempotency", "t2-job-rekonsiliasi", "t2-kursor", "t2-login-aman", "t2-m17", "t2-prd", "t2-race-lock", "t2-rekap", "t2-saldo-bukan-kolom", "t2-transfer"].sort(),
    );
    for (const x of id) expect(hal.some((h) => h.id === x), `[[${x}]] tidak ada di registry`).toBe(true);
    expect(Object.fromEntries(["t2-prd", "t2-transfer", "t2-saldo-bukan-kolom", "t2-adr-ledger", "t2-race-lock", "t2-kursor", "t2-idempotency", "t2-job-rekonsiliasi", "t2-login-aman", "t2-m17", "t2-estimasi", "t2-adr-21"].map((x) => [x, dari(x).nomor]))).toEqual({
      "t2-prd": "2.1", "t2-transfer": "2.3", "t2-saldo-bukan-kolom": "2.6", "t2-adr-ledger": "2.8", "t2-race-lock": "2.11", "t2-kursor": "2.19", "t2-idempotency": "2.14",
      "t2-job-rekonsiliasi": "2.26", "t2-login-aman": "2.28", "t2-m17": "2.29", "t2-estimasi": "2.30", "t2-adr-21": "2.31",
    });
    // Nomor halaman yang ditulis angka di widget ("halaman 2.30") harus nomor halaman estimasi.
    dalamWidget(`Little's Law di halaman ${dari("t2-estimasi").nomor} menunjuk lama request`);
  });
  test("tautan tebak: halaman 2.28, 2.11, dan 3.1 (yang terakhir tampil bila sudah ada)", () => {
    expect(badan).toContain('export const tautanTebak = ["t2-login-aman", "t2-race-lock", "t3-prd"]');
    expect(dari("t3-prd").nomor).toBe("3.1");
    expect(dari("t3-prd").prasyarat).toContain("t2-jembatan");
  });
  test("registry: 2.33 ada, nomor 2.33, prasyarat 2.32, jenis PRD", () => {
    const j = dari("t2-jembatan") as Hal & { jenis?: string; inti?: boolean };
    expect(j).toMatchObject({ ada: true, nomor: "2.33", prasyarat: ["t2-rekap"], jenis: "prd", inti: true });
    expect(dari("t2-rekap").nomor).toBe("2.32");
    expect(mdx).toContain('title: "2.33 Jembatan: pratinjau PRD v3"');
    expect(mdx).toContain("Prasyarat: [[t2-rekap]]");
  });
  test("fitur-transfer menjanjikan jawaban 'bagaimana Citra tahu ada kiriman masuk?' di 2.33, dan halaman menjawabnya", () => {
    ada("fitur-transfer.mdx", "| Bagaimana Citra tahu ada kiriman masuk? | Notifikasi ditunda ke v3 (PRD v2, P2) | [[t2-jembatan]] |");
    harus('Ini jawaban untuk "bagaimana Citra tahu ada kiriman masuk?" di [[t2-transfer]]');
    for (const f of ["m17-prd-v3.mdx"]) {
      ada(f, "Isi PRD v3 selengkapnya ada di [[t2-jembatan]].");
      ada(f, "[[t2-jembatan]] meminta kamu menebak mana yang pecah lebih dulu.");
    }
  });
});

describe("isi PRD v3 dari naskah Tahap 3 bagian 1", () => {
  const baris = naskah3.split("\n").map((b) => b.match(/^\| (P[0-2]) \| (.+?) \| (.+?) \|$/)).filter((m): m is RegExpMatchArray => m !== null);
  const fitur = baris.filter((m) => m[1] !== "P2").map((m) => ({ p: m[1]!, nama: m[2]! }));
  test("delapan fitur P0 dan P1 dengan prioritas yang sama dengan naskah", () => {
    expect(fitur).toHaveLength(8);
    expect(fitur.filter((f) => f.p === "P0")).toHaveLength(4);
    harus("Delapan fitur diminta di PRD v3.");
    for (const f of fitur) {
      const row = mdx.split("\n").find((b) => b.startsWith(`| ${f.nama}`));
      expect(row, `baris "${f.nama}" tidak ada di tabel ruang lingkup`).toBeDefined();
      expect(row!.split("|")[2]!.trim(), `prioritas "${f.nama}"`).toBe(f.p);
    }
    const p2 = baris.find((m) => m[1] === "P2")!;
    expect(`${p2[2]} | ${p2[3]}`).toBe("Top-up dari rekening bank, kartu virtual, verifikasi identitas | Ditunda ke v4");
    harus("Ditunda ke v4 (P2): top-up dari rekening bank, kartu virtual, dan verifikasi identitas.");
  });
  test("syarat Pak Hadi dan dasbor yang memakai akun yang sama", () => {
    const kutip = "Ani tidak boleh diberi tahu uang masuk sebelum uang itu benar-benar tercatat.";
    expect(naskah3).toContain(`*"${kutip}"*`);
    harus(`"${kutip}"`);
    expect(naskah3).toContain("| P0 | Dasbor web warung | Laporan penjualan harian, ekspor CSV, kelola menu; masuk dengan akun yang sama |");
    harus("Dasbor web memakai akun yang sama ([[t2-login-aman]])");
  });
  test("tabel v2 ke v3: baris PRD v2 cocok dengan PRD v2 lengkap", () => {
    ada("prd-v2.mdx", "**Bukan lingkup v2:** integrasi bank langsung, user di luar Grup Lestari, cabang di kota lain, dashboard web untuk warung, notifikasi push, dan promo.");
    ada("prd-v2.mdx", "| P2 | Notifikasi saat menerima transfer | Diminta Budi; ditunda ke v3 |");
    ada("prd-v2.mdx", "Setiap Jumat 15.00 saldo warung dicairkan");
    const v2 = T2("prd-v2.mdx");
    for (const kata of ["katalog", "stok", "offline"]) expect(v2.toLowerCase(), `PRD v2 memuat "${kata}", padahal halaman menulis tidak ada`).not.toContain(kata);
    harus("| Warung | Pencairan terjadwal tiap Jumat; dasbor web di luar lingkup | Dasbor web, dan mode offline untuk stok dan harga |");
    harus("| Yang diberi tahu | Tidak ada notifikasi: ditunda ke v3 | Penerima uang diberi tahu tanpa membuka app |");
  });
});

describe("pertanyaan terbuka: tiap klaim ada di halaman Tahap 2 yang ditaut", () => {
  test("tiga pertanyaan PRD v3 sama dengan naskah Tahap 3", () => {
    for (const q of [
      "Kalau layanan push lambat, apakah pembayaran ikut lambat?",
      "Kalau pemberitahuan gagal terkirim, siapa yang tahu?",
      "Kalau server jadi dua, apa yang tadinya disimpan di memori satu server?",
    ]) {
      expect(naskah3).toContain(`- ${q}`);
      harus(`<summary>Tebak dulu: ${q.charAt(0).toLowerCase()}${q.slice(1)}</summary>`);
    }
  });
  test("pertanyaan 1: lock ADR 13, estimasi, kapasitas belum diukur", () => {
    ada("estimasi.mdx", "2. *Berapa lama panggilan notifikasi?* Layanan push belum ada, jadi 2 dan 30 detik adalah Asumsi.");
    ada("sengaja-belum.mdx", "Kapasitas satu server belum pernah diukur");
    harus("Yang belum ada: lama panggilan push sebenarnya, dan kapasitas satu server (Tidak dijalankan).");
  });
  test("pertanyaan 2: pemeriksa otomatis memeriksa uang, kursor tidak untuk notifikasi", () => {
    ada("m15-file-bank.mdx", "mencocokkan ledger dengan file sebelum file dibuat");
    ada("job-rekonsiliasi.mdx", "file untuk bank dicocokkan dengan ledger sebelum file diberi nama akhir");
    ada("pagination-kursor.mdx", "Sync offline dan notifikasi butuh opsi C atau D, dan keputusan itu menunggu Tahap 3.");
    ada("pagination-kursor.mdx", "Pembaca yang menganggap riwayat sebagai aliran tidak boleh memakai kursor ini.");
    harus("Rekonsiliasi mencocokkan file untuk bank dengan ledger sebelum file diberi nama akhir ([[t2-job-rekonsiliasi]]).");
    harus("halamannya menulis bahwa notifikasi butuh pembaca yang lain ([[t2-kursor]])");
  });
  test("pertanyaan 3: batas laju di memori, jumlah server tidak ada di rumus, api-t2 belum dua server", () => {
    ada("brute-force.mdx", "rekaman bagian F mencatat 20 dari 24 tebakan lolos, yaitu 10 per server");
    ada("estimasi.mdx", "Jumlah server tidak ada di rumus mana pun di halaman ini, jadi jawabannya dicari dari desain");
    ada("m17-prd-v3.mdx", "api-t2 sendiri belum pernah dijalankan dengan dua server (Tidak dijalankan)");
    harus("Jumlah server tidak ada di rumus mana pun di [[t2-estimasi]], jadi jawabannya dicari dari desain.");
    harus("api-t2 belum pernah dijalankan dengan dua server (Tidak dijalankan). Di antara lab Tahap 2, hanya c4-ratelimit yang merekam dua instance.");
  });
  test("fitur: satu proses menghentikan layanan saat deploy, jurnal tidak bisa dihapus, passkey ke Tahap 3", () => {
    ada("sengaja-belum.mdx", "Satu proses: setiap deploy dan restart menghentikan layanan sampai proses baru menyala");
    ada("sengaja-belum.mdx", "atau PRD meminta deploy tanpa jeda");
    ada("adr-ledger.mdx", "| Data pribadi harus bisa dihapus | Jurnal tidak bisa dihapus, padahal `keterangan` berisi teks bebas");
    ada("brute-force.mdx", "PROPOSAL menjadwalkan passkey di Tahap 3");
    harus("Satu proses: tiap deploy menghentikan layanan sampai proses baru menyala ([[t2-adr-21]])");
    harus("`jurnal.keterangan` berisi teks bebas, dan jurnal tidak bisa dihapus ([[t2-adr-ledger]])");
    harus("Faktor kedua dijadwalkan ke Tahap 3 ([[t2-login-aman]])");
  });
  test("empat celah Tahap 2 yang ikut ke PRD v3 tercatat di halamannya", () => {
    ada("sengaja-belum.mdx", "satu load test mengukur kapasitas api-t2 yang sekarang");
    ada("brute-force.mdx", "| Lupa password mandiri dan kabar ke pemilik saat ada percobaan |");
    ada("brute-force.mdx", "Di rekaman api-t2 polanya `sementara-<id>`");
    ada("m17-prd-v3.mdx", "mencatat penutupan periode. Keduanya belum dibuat di lab");
    ada("retry-idempotency.mdx", "`labs/api-t2` belum memasangnya");
    expect(naskah3).toContain("Tutup buku bulanan tetap selesai dalam kurang dari 1 hari, selisih Rp0.");
    harus("Satu load test dijadwalkan sebelum fitur PRD v3 pertama ([[t2-adr-21]]).");
    harus("Lupa password mandiri belum ada, dan password sementara berpola.");
    harus("PRD v3 mempertahankan tutup buku selesai dalam kurang dari satu hari dengan selisih Rp0 ([[t2-m17]])");
    harus("Idempotency-Key belum dipasang di api-t2 ([[t2-idempotency]]).");
    harus("Empat hal dari Tahap 2 belum selesai");
  });
});

describe("klaim 'belum ada' dipindai dengan lingkup sepuluh lab Tahap 2", () => {
  const LAB = ["api-t2", "b3-ledger", "b3-race", "b3-isolasi", "t2-pencairan", "e3-idempotency", "b2-query", "b4-skema", "c4-ratelimit", "e5-payload"];
  const EKSTENSI = /\.(go|py|sh|js|mjs|ts|yml|yaml|sql|json|md|toml|mod|html|conf|cfg|ini)$|(^|\/)(Makefile|Dockerfile[^/]*)$/;
  const LEWATI = new Set(["node_modules", ".venv", ".git", "output", "vendor"]);
  const jalan = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (LEWATI.has(e.name)) return [];
      const p = path.join(dir, e.name);
      return e.isDirectory() ? jalan(p) : EKSTENSI.test(p) ? [p] : [];
    });
  const berkas = LAB.flatMap((l) => jalan(path.join(akar, "labs", l)));
  const txt = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const q = path.join(dir, e.name);
      return e.isDirectory() ? txt(q) : e.name.endsWith(".txt") ? [q] : [];
    });

  test("kapasitas belum diukur: tidak ada perkakas load test di sepuluh lab", () => {
    expect(berkas.length).toBeGreaterThan(50);
    const PERKAKAS = /\b(k6|vegeta|wrk|locust|gatling|jmeter|autocannon|oha|bombardier)\b|load.?test/i;
    expect(berkas.filter((f) => PERKAKAS.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(akar, f))).toEqual([]);
  });
  test("api-t2 tidak memanggil layanan lain selain database", () => {
    const go = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`) && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(5);
    const kena = go.filter((f) => /\bhttp\.(Get|Post|PostForm|Head|NewRequest(WithContext)?|Client|DefaultClient)\b|\bnet\.Dial|\bsmtp\.|\bexec\.Command/.test(fs.readFileSync(f, "utf8")));
    expect(kena.map((f) => path.relative(akar, f))).toEqual([]);
  });
  test("dua instance hanya direkam di c4-ratelimit; rekaman api-t2 memakai satu proses", () => {
    expect(baca("labs/api-t2/output/tutup-buku.txt").split("\n")[3]).toBe("# server: ./api-t2");
    const lain = LAB.filter((l) => l !== "c4-ratelimit").flatMap((l) => {
      const out = path.join(akar, "labs", l, "output");
      return fs.existsSync(out) ? txt(out) : [];
    });
    expect(lain.length).toBeGreaterThan(10);
    expect(lain.filter((f) => /dua (instance|server|proses server)/i.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(akar, f))).toEqual([]);
  });
  test("kata 'dua instance' ada di halaman hanya dengan lingkup lab Tahap 2", () => {
    expect(badan).toContain("Di antara lab Tahap 2, hanya c4-ratelimit yang merekam dua instance.");
  });
});

describe("tidak membuka isi Tahap 3 lebih dari yang diizinkan naskah Tahap 2 bagian 6", () => {
  const TERLARANG = /outbox|SKIP LOCKED|Redis|dead-letter|at-least-once|klaim per baris|connection pool|\bpool\b|ADR (2[2-9]|3\d)\b|\bM(1[89]|2\d)\b|backoff|jitter|\bstaging\b|on-call|health check|CSP|CSRF|XSS|pinning/i;
  test("halaman dan widget tidak memuat istilah dan nomor ADR atau masalah Tahap 3", () => {
    expect(badan.match(TERLARANG), "halaman memuat istilah Tahap 3").toBeNull();
    expect(teksWidget.match(TERLARANG), "widget memuat istilah Tahap 3").toBeNull();
  });
  test("naskah Tahap 2 bagian 6 menyebut dua jawaban, dan halaman membuka tepat dua itu", () => {
    const bagian6 = baca("plan/CERITA-TAHAP-2.md").split("## 6. Jembatan ke Tahap 3")[1]!.split("\n## ")[0]!;
    expect(bagian6).toContain("rate limit di memori saat server jadi dua; notifikasi yang dipanggil di dalam transaction jurnal");
    expect(bagian6).toContain("enam kota, notifikasi push saat menerima uang, dashboard web untuk warung, mode offline untuk warung bersinyal buruk");
    const benar = data.pilihan.find((p) => p.benar)!;
    expect(benar.alasan).toContain("Batas laju ADR 20 dihitung di memori tiap server");
    expect(benar.alasan).toContain("Notifikasi yang dipanggil di dalam transaction jurnal memperpanjang lock itu");
    // Peninjau (746): kalimat penalaran tidak boleh terbaca sebagai rekaman; api-t2 tidak memanggil layanan lain.
    expect(benar.alasan).toContain("sepanjang panggilannya (penalaran dari rekaman lock, Tidak dijalankan).");
  });
});

describe("tinjauan PR 353 (keputusan 746 dan 747): mutasi yang lolos di tes pelaksana", () => {
  const naskah1 = baca("plan/CERITA-TAHAP-1.md");
  const t1 = baca("situs/src/content/docs/tahap-1/jembatan-prd-v2.mdx");
  const barisFitur = (nama: string) => {
    const row = mdx.split("\n").find((b) => b.startsWith(`| ${nama} |`));
    expect(row, `baris "${nama}" tidak ada`).toBeDefined();
    return row!.split("|").map((c) => c.trim());
  };

  test("keputusan 744: tabel dan widget tidak menyebut solusi 'dua instance API' dari keterangan naskah", () => {
    expect(naskah3).toContain("Dua instance API, staging, backup terjadwal; satu proses mati tidak terlihat oleh user");
    expect(badan).not.toMatch(/instance API/i);
    expect(teksWidget).not.toMatch(/instance API/i);
    expect(barisFitur("Tidak berhenti saat deploy atau saat satu proses mati")[3]).toBe("Satu proses: tiap deploy menghentikan layanan sampai proses baru menyala ([[t2-adr-21]])");
  });
  test("ADR 21 dibaca ulang: PRD v3 meminta deploy tanpa jeda, pemicu kapasitas belum bisa dibaca", () => {
    ada("sengaja-belum.mdx", "Membaca ulang ADR ini setiap PRD baru datang adalah satu-satunya pagar sampai alat ukurnya ada.");
    ada("sengaja-belum.mdx", "| Server kedua | Puncak yang diperkirakan mencapai separuh kapasitas satu server hasil load test, atau PRD meminta deploy tanpa jeda |");
    expect(naskah3).toContain("Direksi tidak mau app berhenti saat deploy atau saat satu proses mati");
    harus('ADR 21 meminta dibaca ulang setiap PRD baru datang. PRD v3 memenuhi satu pemicunya: baris "Tidak berhenti saat deploy" meminta deploy tanpa jeda ([[t2-adr-21]]). Pemicu kapasitas belum bisa dibaca karena kapasitas belum diukur.');
  });
  test("kolom 'Asalnya di Tahap 2' tiap fitur cocok dengan halaman yang ditaut", () => {
    const asal = Object.fromEntries(["Notifikasi saat menerima uang", "Katalog dan stok warung", "Dasbor web warung", "Promo dari HR", "Catatan pada pembayaran dan transfer", "Mode offline di app warung"].map((n) => [n, barisFitur(n)[3]]));
    expect(asal["Notifikasi saat menerima uang"]).toBe('PRD v2 prioritas P2: diminta Budi, ditunda ke v3 ([[t2-prd]]). Ini jawaban untuk "bagaimana Citra tahu ada kiriman masuk?" di [[t2-transfer]]');
    expect(asal["Katalog dan stok warung"]).toBe("Tidak ada di PRD v2");
    expect(asal["Dasbor web warung"]).toBe("Di luar lingkup PRD v2 ([[t2-prd]])");
    expect(asal["Promo dari HR"]).toBe("Di luar lingkup PRD v2 ([[t2-prd]])");
    expect(asal["Mode offline di app warung"]).toBe("Tidak ada di PRD v2. Halaman kursor menulis bahwa sync offline menunggu Tahap 3 ([[t2-kursor]])");
    ada("prd-v2.mdx", "| P2 | Notifikasi saat menerima transfer | Diminta Budi; ditunda ke v3 |");
    ada("prd-v2.mdx", "dashboard web untuk warung, notifikasi push, dan promo.");
    ada("pagination-kursor.mdx", "Sync offline dan notifikasi butuh opsi C atau D, dan keputusan itu menunggu Tahap 3.");
  });
  test("kepala dokumen: penulis dan syarat baru sama dengan naskah Tahap 1 dan halaman 1.42", () => {
    expect(naskah1).toContain("**Sinta** adalah product manager di unit Inisiatif Digital");
    expect(naskah1).toContain("| **Pak Hadi** | Kepala Divisi Keuangan. |");
    expect(t1).toContain("<dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd>");
    expect(t1).toContain("<dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd>");
    harus("<dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd>");
    harus("<dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd>");
  });
  test("enam kota dan label kejujuran di kalimat pembuka dan penutup widget", () => {
    expect(naskah3).toContain("Direksi Grup Lestari memperluas Rekeningo ke semua cabang di enam kota");
    harus("Direksi lalu memperluas Rekeningo ke semua cabang Grup Lestari di enam kota.");
    harus("Angka di dokumen ini adalah angka cerita (Ilustrasi), kecuali yang ditulis Asumsi atau Rekaman lab.");
    dalamWidget("kodenya tidak memanggil layanan lain selain database (Tidak dijalankan).");
    dalamWidget("Tahap 3 dimulai dari PRD v3 lengkap dan kedua ADR ini.");
  });
  test("aturan 4 dan rekaman bagian F disebut dengan nomor yang benar di halaman", () => {
    harus("Aturan 4 melarang panggilan jaringan selama lock dipegang.");
    ada("race-lock.mdx", "4. Tidak ada panggilan jaringan atau kerja lambat selama lock dipegang.");
    harus("batas laju ADR 20 ([[t2-login-aman]], rekaman bagian F)");
    ada("brute-force.mdx", "rekaman bagian F mencatat 20 dari 24 tebakan lolos");
  });
  test("sumber widget: jenis rekaman, dua berkas, bagian F; berkas itu ada", () => {
    expect(data.sumber.jenis).toBe("rekaman");
    expect(data.sumber.teks).toContain("labs/c4-ratelimit/output/login/ratelimit.txt bagian F");
    expect(data.sumber.teks).toContain("labs/b3-race/output/ledger/ledger-for-update.txt");
    expect(data.label.sumber).toBe("Rekaman lab · ratelimit.txt bagian F, ledger-for-update.txt");
    for (const p of ["labs/c4-ratelimit/output/login/ratelimit.txt", "labs/b3-race/output/ledger/ledger-for-update.txt"]) expect(fs.existsSync(path.join(akar, p)), p).toBe(true);
  });
  test("tabel ruang lingkup sudah memuat prioritas, jadi kalimat penutupnya hanya menunjuk rincian", () => {
    harus("| Fitur | Prioritas | Asalnya di Tahap 2 |");
    harus("Rincian tiap fitur ada di PRD v3 lengkap, di awal Tahap 3.");
    expect(badan).not.toContain("Prioritas dan rincian");
  });
  test("menit baca di registry sama dengan baca ditambah coba di baris meta", () => {
    const m = badan.match(/Baca (\d+) menit · coba (\d+) menit/);
    expect(m).not.toBeNull();
    expect((dari("t2-jembatan") as Hal & { menit?: number }).menit).toBe(Number(m![1]) + Number(m![2]));
  });
});
