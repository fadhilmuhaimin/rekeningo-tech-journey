// Penjaga halaman 6.4 (keputusan 1722 sampai 1724): angka, hitungan, ID, nomor ADR, tautan, label sumber, rentang Snippet, klaim negatif,
// diagram Rantai t6-m53-inti.json, skenario alur t6-m53.json, kartu Cek diri, dan baris riset di m53-laporan-kosong.mdx.
// Nilai diturunkan dari naskah Tahap 6 (baris M53, ADR 62, tabel tim, peta halaman), registry, halaman ADR yang dikutip (2.4, 2.22, 4.13, 5.1, 5.5,
// 5.11, 5.13, 5.30), rekaman labs/t4-modul/output/batas.txt dan labs/api-t5/output/skema.txt, kode labs/api-t5/run.py, dasar_t5.py, dan
// labs/api-t4/internal/modul/batas_test.go, serta baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat
// berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di m53-laporan-kosong.halaman.nilai.ts. Lapis 2
// bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah:
// PERBARUI_KUNCI=1 vitest run src/lib/m53-laporan-kosong.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini tanpa lab: query Pelaporan, hak sementara, rename kolom, laporan kosong, event
// berversi, dan API tutup buku tidak direkam. Yang direkam hanya jawaban 42703 di batas.txt (kode lab yang menirukan M32), kontrak kolom Tahap 4,
// dan penolakan hak di skema.txt bagian F.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t6-m53-inti.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m53-laporan-kosong.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-6/m53-laporan-kosong.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t6-m53.json")) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-6.md");
const riset6 = baca("plan/RISET-TAHAP-6.md");
const skema = baca("labs/api-t5/output/skema.txt");
const skemaBaris = skema.split("\n");
const batas = baca("labs/t4-modul/output/batas.txt");
const batasBaris = batas.split("\n");
const batasTest = baca("labs/api-t4/internal/modul/batas_test.go");
const runPy = baca("labs/api-t5/run.py");
const runBaris = runPy.split("\n");
const dasarT5 = baca("labs/api-t5/dasar_t5.py");
const hal513 = baca("situs/src/content/docs/tahap-5/modul-ke-service.mdx");
const hal511 = baca("situs/src/content/docs/tahap-5/partisi-snapshot.mdx");
const hal530 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const hal55 = baca("situs/src/content/docs/tahap-5/read-replica.mdx");
const hal51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const hal413 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const hal222 = baca("situs/src/content/docs/tahap-2/skema-tanpa-downtime.mdx");
const hal24 = baca("situs/src/content/docs/tahap-2/fitur-tutup-buku.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; peran?: string[]; adr?: number[]; path?: string }
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
const pecahBaris = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset6.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const hitung = (teks: string, potong: string): number => teks.split(potong).length - 1;
const tabelDari = (teks: string, awalan: string): string[][] => {
  const semua = teks.slice(teks.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(pecahBaris(b)); }
  return keluar;
};
// pembulatan setengah ke atas seperti pembaca, bukan toFixed (4.28: 0,579 × 15)
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number, d = 1): string => bulat(x, d).toFixed(d).replace(".", ",");
const KATA_BILANGAN: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh", 8: "delapan", 11: "sebelas" };
const kata = (n: number): string => {
  const k = KATA_BILANGAN[n];
  if (!k) throw new Error(`kata bilangan untuk ${n} belum ada`);
  return k;
};
const nomorBaris = (baris: string[], pola: RegExp, dari0 = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`${pola} tidak ditemukan`);
  return i + 1;
};
const bagianDi = (baris: string[], n: number): string => {
  for (let i = n - 1; i >= 0; i--) {
    const m = baris[i]!.match(/^# --- ([A-G])\./);
    if (m) return m[1]!;
  }
  throw new Error(`bagian untuk baris ${n} tidak ditemukan`);
};

// --- sumber angka: naskah, halaman ADR, registry
const barisM53 = naskah.split("\n").find((b) => b.startsWith("| M53 |")) ?? "";
const kolomM53 = pecahBaris(barisM53);
const gejalaM53 = kolomM53[2]!;
const dikiraM53 = kolomM53[3]!;
const sebenarnyaM53 = kolomM53[4]!;
const mingguM53 = Number(kolomM53[1]);
const barisAdr62 = naskah.split("\n").filter((b) => b.startsWith("| 62 |"));
const kolomAdr62 = pecahBaris(barisAdr62[0] ?? "");
const tabelTim = tabelDari(naskah, "| Tim | Orang | Pemimpin | Memegang |").slice(2);
const jumlahTim = tabelTim.length;
const orangTotal = tabelTim.reduce((a, r) => a + Number(r[1]), 0);
const pasangTim = (jumlahTim * (jumlahTim - 1)) / 2;
const batasProduk = Number(cari(/lebih dari (\d+) per tim/, kolomAdr62[3]!, "batas produk data")[1]);
const batasDetik = Number(cari(/lebih dari (\d+) detik/, kolomAdr62[3]!, "batas kesegaran")[1]);
const batasDomain = cari(/lebih dari (\w+) domain/, kolomAdr62[3]!, "batas domain")[1]!;
const petaM53 = naskah.split("\n").find((b) => b.startsWith("| 6.4 |")) ?? "";
const kolomPeta = pecahBaris(petaM53);
const h = dari("t6-m53");
const adr62Opsi = ["replica lintas schema", "data warehouse pusat", "rapat sinkronisasi migration", "database terpisah per service"];

// --- hak, rekaman, dan kode lab
const lSebelumRename = nomorBaris(batasBaris, /^sesudah rename, pembayaran\.TeksTopupLangsung/);
const lNama = nomorBaris(batasBaris, /^sesudah ALTER TABLE akun RENAME COLUMN nama TO nama_tampil/);
const lKontrak = nomorBaris(batasBaris, /^ALTER TABLE akun RENAME COLUMN tingkat TO tingkat_baru/);
const lMerchant = nomorBaris(skemaBaris, /^t5_merchant: SELECT count\(\*\) FROM t5_pembayaran\.kartu/);
const lKontrakKolom = nomorBaris(skemaBaris, /^t5_ledger: SELECT id, tingkat, status FROM t5_akun\.akun/);
const lNamaDitolak = nomorBaris(skemaBaris, /^t5_ledger: SELECT nama FROM t5_akun\.akun/);
const lLuar = nomorBaris(runBaris, /^    luar = \{\}/);
const lHarapKontrak = nomorBaris(runBaris, /^    harap\(luar, kontrak,/);
const kodeBawaan = cari(/SQLSTATE (\d+)/, skemaBaris[lMerchant]!, "kode penolakan")[1]!;
const kodeKolom = cari(/\((\d{5})\)$/, batasBaris[lSebelumRename - 1]!, "kode kolom tidak ada")[1]!;
const schemaLayanan = cari(/^SCHEMA_LAYANAN = \[([^\]]+)\]/m, dasarT5, "SCHEMA_LAYANAN")[1]!.split(",").map((x) => x.trim().replace(/"/g, ""));
const versi = {
  pg: cari(/PostgreSQL (\d+\.\d+)/, batasBaris[1]!, "PostgreSQL batas")[1]!,
  pgT5: cari(/PostgreSQL (\d+\.\d+)/, skemaBaris[1]!, "PostgreSQL skema")[1]!,
};

describe("angka cerita dan hitungan: diturunkan dari naskah, halaman ADR, dan registry", () => {
  test("gejala: minggu, hari, jam, dan Pak Hadi dari baris M53 naskah; semuanya berlabel Ilustrasi", () => {
    expect(mingguM53).toBe(6);
    expect(gejalaM53).toContain("Rabu tim Pelaporan");
    expect(gejalaM53).toContain("Kamis tim Pembayaran mengganti nama satu kolom lewat migration");
    expect(gejalaM53).toContain("Jumat 06.00 laporan tutup buku negara kedua kosong");
    expect(gejalaM53).toContain("Pak Hadi menunda tanda tangan satu hari");
    expect(gejalaM53).toContain("(Ilustrasi)");
    expect(badan).toContain(`Rabu minggu ${mingguM53}. Tim Pelaporan menyiapkan laporan Keuangan per negara`);
    expect(badan).toContain("Kamis tim Pembayaran mengganti nama satu kolom lewat migration.");
    expect(badan).toContain("Jumat pukul 06.00 laporan tutup buku negara kedua kosong. Pak Hadi menunda tanda tangannya satu hari.");
    expect(badan).toContain("*Angka cerita (Ilustrasi):* hari, jam, dan tim berasal dari naskah, bukan dari rekaman.");
    expect(hitung(badan, "satu hari")).toBe(1);
    expect(badan).toContain("Hak baca sementara ke schema tim Pembayaran tidak masuk contract mana pun, dan tidak ada tes yang menjalankannya (Ilustrasi).");
  });
  test("dugaan: pengumuman migration dan rapat sinkronisasi tiap minggu antar sebelas tim, sama dengan kolom 'Yang dikira' naskah", () => {
    expect(dikiraM53).toContain("Pelaporan tidak membaca pengumuman migration");
    expect(dikiraM53).toContain("Bayu: tambah rapat sinkronisasi migration tiap minggu antar sebelas tim");
    expect(badan).toContain("Dugaan pertama: Pelaporan tidak membaca pengumuman migration. Bayu mengusulkan rapat sinkronisasi migration tiap minggu antar sebelas tim.");
    expect(jumlahTim).toBe(11);
    expect(kata(jumlahTim)).toBe("sebelas");
  });
  test("sebelas tim punya 11 × 10 ÷ 2 = 55 pasang tim, dan 53 ÷ 11 = 4,8 orang per tim, dari tabel tim naskah", () => {
    expect(orangTotal).toBe(53);
    expect(pasangTim).toBe(55);
    expect(badan).toContain(`${kata(jumlahTim).replace(/^./, (c) => c.toUpperCase())} tim punya ${jumlahTim} × ${jumlahTim - 1} ÷ 2 = ${pasangTim} pasang tim.`);
    expect(badan).toContain(`Satu tim berisi ${koma(orangTotal / jumlahTim)} orang rata-rata (${orangTotal} ÷ ${jumlahTim}, Hitungan atas Asumsi cerita)`);
    expect(badan).toContain(`Tidak terbaca di sistem. Sebelas tim berarti ${pasangTim} pasang tim |`);
    expect(badan).toContain(`11 × 3 = ${jumlahTim * batasProduk} produk untuk 11 tim`);
    expect(hitung(badan, String(pasangTim))).toBe(3);
  });
  test("ambang di tabel 'Kapan keputusan ini salah': batas tiga produk data per tim, 5 detik, dan empat domain dari baris ADR 62 naskah", () => {
    expect(barisAdr62).toHaveLength(1);
    expect(batasProduk).toBe(3);
    expect(batasDetik).toBe(5);
    expect(batasDomain).toBe("empat");
    const tabel = tabelDari(badan, "| Salah saat |");
    expect(tabel).toHaveLength(6);
    expect(tabel[2]![0]).toBe("Produk data lebih banyak dari yang sanggup dirawat pemiliknya");
    expect(tabel[2]![2]).toContain(`Batas ${kata(batasProduk)} per tim (Asumsi)`);
    expect(tabel[3]![0]).toBe(`Kesegaran event tertinggal lebih dari ${batasDetik} detik dari ledger untuk dasbor merchant`);
    expect(tabel[4]![0]).toBe(`Satu laporan butuh gabungan lebih dari ${batasDomain} domain tiap hari`);
    expect(tabel[5]![0]).toBe("Struktur tim berubah sehingga pemilik produk data hilang");
    expect(kolomAdr62[3]).toContain("Struktur tim berubah sehingga pemilik produk data hilang");
    expect(kolomAdr62[3]).toContain("pertimbangkan data warehouse");
    expect(tabel[4]![2]).toContain("pertimbangkan data warehouse (opsi B)");
  });
  test("kesegaran PRD v5: 5 detik dan 35 detik dari halaman 5.1, dengan label Asumsi produk", () => {
    expect(hal51).toContain(`tertinggal paling lama ${batasDetik} detik dari pembayaran yang tercatat`);
    const lambat = Number(cari(/terlihat paling lambat (\d+) detik/, hal51, "35 detik")[1]);
    expect(lambat).toBe(35);
    const tabel = tabelDari(badan, "| Salah saat |");
    expect(tabel[3]![2]).toContain(`Pembanding PRD v5: tertinggal paling lama ${batasDetik} detik dan terlihat paling lambat ${lambat} detik (Asumsi produk, [[t5-prd]])`);
    expect(tabel[3]![2]).toContain("Belum terukur di Tahap 6 (Tidak dijalankan)");
  });
  test("registry: halaman 6.4 jenis konsep, ada, ADR 62, prasyarat t6-m52 dan t5-service, menit = baca + coba, judul dan label dari naskah", () => {
    expect(h.nomor).toBe("6.4");
    expect(h.jenis).toBe("konsep");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.adr).toEqual([62]);
    expect(h.prasyarat).toEqual(["t6-m52", "t5-service"]);
    expect(h.peran).toEqual(["security", "backend"]);
    expect(h.label).toBe(`Masalah 53 · minggu ${mingguM53}`);
    expect(h.judul).toBe(kolomPeta[2]);
    expect(h.judul.startsWith("M53: Laporan tutup buku kosong sesudah migration + ADR 62")).toBe(true);
    expect(kolomPeta[3]).toBe("Masalah + ADR");
    expect(h.path).toBe("tahap-6/m53-laporan-kosong.md");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul.replace(/ \(.*\)$/, "")}"`);
    const m = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t6-m52\]\], \[\[t5-service\]\] · Jalur inti<\/p>/, halaman, "meta");
    expect(h.menit).toBe(Number(m[1]) + Number(m[2]));
    expect(kolomM53[5]).toContain("Kepemilikan domain");
    expect(sebenarnyaM53).toContain("laporan resmi adalah produk milik tim Ledger");
    expect(frontmatter).toContain("dan laporan resmi Keuangan ke tim Ledger.");
    expect(kolomAdr62[0]).toBe("62");
    expect(dari("t6-m52").nomor).toBe("6.3");
    expect(dari("t6-m54").nomor).toBe("6.5");
    expect(dari("t6-residensi").nomor).toBe("6.8");
    expect(dari("t6-adr-69").nomor).toBe("6.11");
  });
});

describe("halaman ADR yang dikutip: kalimat, hitungan aturan, dan klaim negatif diturunkan dari halaman 5.13, 2.22, 4.13, 5.1, 5.5, 5.11, 5.30", () => {
  const aturan50 = hal513.slice(hal513.indexOf("**Keputusan: opsi E.**"), hal513.indexOf("**Kenapa E, bukan A, B, C, atau D.**")).split("\n").filter((b) => /^\d+\. /.test(b));
  const aturan6 = hal222.split("\n").find((b) => b.startsWith("6. Contract hanya sesudah")) ?? "";
  test("ADR 50: delapan aturan, aturan 2 dan 3, dan butir daftar periksa dikutip persis", () => {
    expect(hal513).toContain("**Keputusan: opsi E.** Delapan aturan:");
    expect(aturan50).toHaveLength(8);
    expect(kata(aturan50.length)).toBe("delapan");
    expect(aturan50[1]).toContain("satu schema dan satu role per service");
    expect(aturan50[1]).toContain("tanpa foreign key lintas service");
    expect(aturan50[2]).toContain("Ledger tetap satu-satunya tempat uang bergerak. Service lain membaca lewat API ledger atau meminta jurnal");
    expect(badan).toContain("Aturan 2 di [[t5-service]] memberi tiap service satu schema dan satu role, dan menghapus foreign key lintas service.");
    expect(badan).toContain("Aturan 3 menyuruh service lain membaca data ledger lewat API ledger atau meminta jurnal.");
    const butir = cari(/^- \[ \] (Service tidak membaca tabel service lain, dan foreign key lintas service tetap 0\.)$/m, hal513, "daftar periksa")[1]!;
    expect(badan).toContain(`Daftar periksa review di halaman itu menulis: "${butir}"`);
    expect(badan).toContain("Kedelapan aturan di halaman itu");
    expect(badan).toContain("dibaca dari teks aturan 1 sampai 8");
  });
  test("klaim negatif atas ADR 50: tak satu aturan menulis hak, katalog, lint, atau kontrak, dan aturan 3 tidak menyebut schema pembayaran", () => {
    const semua = aturan50.join("\n");
    expect(semua).not.toMatch(/\b(GRANT|REVOKE|SELECT|hak baca|katalog|lint|kontrak|contract|review)\b/i);
    expect(aturan50[2]).not.toMatch(/pembayaran/i);
    expect(badan).toContain("tidak menulis siapa yang boleh memberi hak baca ke role baru");
    expect(badan).toContain("tidak menulis cara memeriksanya selain review");
    expect(badan).toContain("Aturan 3 hanya menyebut data ledger, dan schema pembayaran tidak disebut.");
    expect(badan).toContain("ADR 50 juga tidak mengharuskan pemeriksaan itu berjalan di pipeline tim");
  });
  test("ADR 17: status berlaku untuk akun, buku, jurnal, posting; aturan 6 memuat empat syarat dan tidak menyebut tim lain", () => {
    expect(hal222).toContain("Berlaku untuk setiap perubahan skema di tabel yang dipakai jalur uang: `akun`, `buku`, `jurnal`, dan `posting`.");
    expect(aturan6).toContain("Contract hanya sesudah cek lulus dan server hanya memakai ledger, dengan salinan tabel v1 dibuat lebih dulu.");
    expect(aturan6).toContain("tetap ada selama app 1.0 dan 1.1 beredar");
    expect(aturan6).not.toMatch(/\btim\b|pembaca/i);
    expect(hal222).toContain("Tiga rilis berurutan");
    expect(badan).toContain("ADR 17 memecah perubahan skema menjadi tiga rilis, expand, migrate, dan contract, untuk tabel akun, buku, jurnal, dan posting ([[t2-skema-tanpa-downtime]]).");
    expect(badan).toContain("Syarat contract di aturan 6 menyebut cek yang lulus, server yang hanya memakai ledger, salinan tabel v1, dan app 1.0 dan 1.1 yang masih beredar. Pembaca di tim lain tidak disebut.");
    expect(badan).toContain("Bila migration M53 memakai tiga rilis, nama lama bertahan sampai langkah contract");
  });
  test("ADR 37, ADR 49, tutup buku 2.4, ADR 46, dan ADR 60 butir 3: kalimat yang dikutip ada di halaman asalnya", () => {
    expect(hal413).toContain("4. Ledger tetap satu-satunya tempat uang bergerak. Pembayaran meminta jurnal lewat API ledger");
    expect(badan).toContain("Ledger tetap satu-satunya tempat uang bergerak, dan pembayaran meminta jurnal lewat API ledger ([[t4-modul]]).");
    expect(hal413).toContain("Satu-satunya hak lintas modul pada keenam role itu adalah kontrak kolom");
    expect(hal511).toContain("4. Snapshot saldo ditulis tiap akhir bulan per buku.");
    expect(badan).toContain("ADR 49 menulis snapshot saldo tiap akhir bulan per buku ([[t5-partisi]]).");
    expect(hal24).toContain("Backend menjumlahkan posting per buku, membandingkannya dengan saldo_cache, dan memeriksa seluruh jurnal seimbang.");
    expect(badan).toContain("Tutup buku di Tahap 2 menjumlahkan posting per buku dan memeriksa bahwa semua jurnal seimbang ([[t2-tutup-buku]]).");
    expect(hal55).toContain("Replica adalah salinan yang menerima rekaman perubahan dari primary dan memutarnya ulang (replay)");
    expect(badan).toContain("Replica memutar ulang rekaman perubahan primary");
    const butir3 = hal530.split("\n").find((b) => b.startsWith("| 3. Database terpisah per service")) ?? "";
    expect(pecahBaris(butir3)[4]).toBe("Belum terukur");
    expect(hal530).toContain("3. **Database terpisah per service.** Data tiap service disimpan privat dan hanya terbuka lewat API service itu.");
    expect(badan).toContain("yaitu data tiap service terbuka hanya lewat API service itu, tanpa memisahkan database");
    expect(badan).toContain("pemicunya di [[t5-adr-60]] belum terukur");
  });
  test("tahap dan nomor ADR dari registry dan judul halaman (peninjau): Tahap 5 memberi schema per service, ADR 50 di 5.13, ADR 17 di 2.22, ADR 49 di 5.11, ADR 46 di 5.5", () => {
    const adrDi = (src: string): string => cari(/^title: "[\d.]+ .*ADR (\d+)"/m, src, "ADR di judul")[1]!;
    expect(badan).toContain(`Tahap ${dari("t5-service").tahap} memberi tiap service satu schema dan satu role, dan menghapus foreign key lintas service (ADR ${adrDi(hal513)}, [[t5-service]]).`);
    expect(badan).toContain(`ADR ${adrDi(hal222)} memecah perubahan skema`);
    expect(badan).toContain(`snapshot saldo ADR ${adrDi(hal511)}`);
    expect(badan).toContain(`ADR ${adrDi(hal511)} menulis snapshot saldo`);
    expect(badan).toContain(`Replica sudah ada di ADR ${adrDi(hal55)}.`);
    expect(badan).toContain(`Penalaran dari ADR ${adrDi(hal55)}, Tidak dijalankan`);
  });
  test("bacaan lanjut: tanggal terbit sama dengan teks dan baris riset (Datamation April 1968, 3 Desember 2020, 5 Agustus 2017)", () => {
    const lanjut = badan.slice(badan.indexOf("### Bacaan lanjut"));
    expect(lanjut).toContain("(Datamation, April 1968)");
    expect(lanjut).toContain("(3 Desember 2020)");
    expect(lanjut).toContain("(5 Agustus 2017)");
    expect(riset6.split("\n").find((b) => b.startsWith("| R6-125 |"))).toContain("Datamation, April 1968");
    expect(riset6.split("\n").find((b) => b.startsWith("| R6-126 |"))).toContain("terbit 2020-12-03");
    expect(riset6.split("\n").find((b) => b.startsWith("| R6-128 |"))).toContain("2017-08-05");
  });
  test("aturan Pak Hadi v5: kutipan sama persis dengan baris v5 di halaman 5.1, dan dipakai dua kali (Paham dan ADR)", () => {
    const kutipan = cari(/\| v5 \| Aturan v4 tetap berlaku, ditambah: "([^"]+)" \|/, hal51, "aturan v5")[1]!;
    expect(kutipan).toBe("Angka yang saya tanda tangani harus dibaca dari catatan yang sama dengan yang menggerakkan uang. Salinan boleh untuk dilihat, bukan untuk memutuskan.");
    expect(badan).toContain(`Aturan Pak Hadi di PRD v5 menulis: "${kutipan}" ([[t5-prd]]).`);
    expect(badan).toContain("Aturan Pak Hadi di PRD v5 juga menulis salinan boleh untuk dilihat, bukan untuk memutuskan");
    expect(hitung(badan, "bukan untuk memutuskan")).toBe(3);
  });
});

describe("rekaman Tahap 4 dan Tahap 5 dan kode lab: rentang Snippet, huruf bagian, kode galat, dan enam role diturunkan dari berkasnya", () => {
  test("batas.txt: rename nama dan kontrak ledger di bagian B (baris 81 sampai 85), galat 42703 di bagian A", () => {
    expect(lNama).toBe(lKontrak - 4);
    expect(bagianDi(batasBaris, lNama)).toBe("B");
    expect(bagianDi(batasBaris, lKontrak)).toBe("B");
    expect(bagianDi(batasBaris, lSebelumRename)).toBe("A");
    expect(kodeKolom).toBe("42703");
    expect(batasBaris[lKontrak - 1]).toContain('tes kontrak ledger gagal: column "tingkat" does not exist (42703)');
    expect(batasBaris[lNama]).toContain("modul akun membaca nama_tampil: berhasil");
    expect(batasBaris[lNama + 1]).toContain("kontrak kolom ledger (id, tingkat, status): berhasil; tidak ada modul lain yang menyentuh kolom nama");
    expect(batasBaris[lSebelumRename - 1]).toContain('column "nama" does not exist (42703)');
    expect(badan).toContain(`<Snippet file="labs/t4-modul/output/batas.txt" lines="${lNama}:${lKontrak}"`);
    expect(badan).toContain("bagian B (rename kolom nama dan kolom kontrak)");
    expect(hitung(badan, "bagian A")).toBe(3);
    expect(hitung(badan, "bagian B")).toBe(3);
    expect(batasBaris[2]).toContain("make -C labs/t4-modul run");
    expect(batasBaris.slice(lSebelumRename, lSebelumRename + 8).join("\n")).toContain("kodenya bukan rekaman kode produksi");
  });
  test("batas_test.go: tes kontrak menjalankan query pembaca sebagai role ledger, dan komentar menulis 'tim yang mengubahnya tahu sebelum rilis'", () => {
    expect(batasTest).toContain("func TestRenameKolomKontrakTerdeteksiDiCI(t *testing.T)");
    expect(batasTest).toContain("tidak lolos: tes kontrak di CI gagal dengan undefined_column,\n// jadi tim yang mengubahnya tahu sebelum rilis.");
    expect(batasTest).toContain('buka(t, "t4m_ledger").Exec(`SELECT id, tingkat, status FROM t4m_akun.akun LIMIT 1`)');
    expect(badan).toContain("Tes itu menjalankan query pembaca, dan komentar di kodenya menulis tujuannya: tim yang mengubah kolom tahu sebelum rilis (Tidak dijalankan: dibaca dari komentar di `batas_test.go`).");
  });
  test("skema.txt bagian F: role merchant ditolak membaca schema pembayaran (baris 194 sampai 195), kontrak kolom ledger (204 sampai 206)", () => {
    expect(bagianDi(skemaBaris, lMerchant)).toBe("F");
    expect(bagianDi(skemaBaris, lKontrakKolom)).toBe("F");
    expect(kodeBawaan).toBe("42501");
    expect(skemaBaris[lMerchant]).toContain("permission denied for schema t5_pembayaran");
    expect(lNamaDitolak).toBe(lKontrakKolom + 1);
    expect(skemaBaris[lNamaDitolak]).toContain("permission denied for table akun");
    expect(skemaBaris[lKontrakKolom - 1]).toContain("kontrak kolom lintas service (tanpa kolom nama)");
    expect(badan).toContain(`<Snippet file="labs/api-t5/output/skema.txt" lines="${lMerchant}:${lMerchant + 1}"`);
    expect(badan).toContain(`<Snippet file="labs/api-t5/output/skema.txt" lines="${lKontrakKolom}:${lNamaDitolak + 1}"`);
    expect(hitung(badan, "bagian F")).toBe(2);
    // peninjau: judul Snippet menurunkan tahap dari folder lab (api-t5 = 5, t4-modul = 4) dan jenis dari ekstensi
    const snippet = [...badan.matchAll(/<Snippet file="(labs\/[^"]+)"[^>]* title="([^"]+)"/g)].map((m) => ({ file: m[1]!, title: m[2]! }));
    expect(snippet).toHaveLength(4);
    for (const s of snippet) {
      const tahap = cari(/^labs\/(?:api-)?t(\d)/, s.file, "tahap dari folder lab")[1]!;
      expect(s.title.startsWith(s.file.endsWith(".txt") ? `Rekaman lab Tahap ${tahap}: ${s.file}` : `Kode lab: ${s.file}`), `judul Snippet: ${s.title}`).toBe(true);
    }
    expect(skema).toContain("hanya t5_ledger yang punya, yaitu USAGE schema akun dan SELECT atas");
    expect(versi.pg).toBe("17.11");
    expect(versi.pgT5).toBe("17.11");
    expect(skenario.langkah.map((l) => l.jelas).join(" ") + skenario.sumber.catatan).toContain("PostgreSQL 17.11");
  });
  test("run.py: pemeriksaan katalog atas enam role SCHEMA_LAYANAN dan satu kontrak t5_ledger; role ketujuh tidak ada; baris 262 sampai 268", () => {
    expect(schemaLayanan).toHaveLength(6);
    expect(kata(schemaLayanan.length)).toBe("enam");
    expect(schemaLayanan).not.toContain("t5_pelaporan");
    expect(runBaris[lLuar]).toBe("    for role in d.SCHEMA_LAYANAN:");
    expect(runBaris[lLuar + 1]).toContain("hak_dari_katalog(role, [s for s in d.SCHEMA_LAYANAN if s != role], usage=True)");
    expect(runBaris[lLuar + 4]).toBe('    kontrak = {"t5_ledger": {"akun.id:SELECT", "akun.tingkat:SELECT", "akun.status:SELECT", "schema:t5_akun:USAGE"}}');
    expect(runBaris[lHarapKontrak - 1]).toContain("harap(luar, kontrak,");
    expect(lHarapKontrak - lLuar).toBe(6);
    expect(runPy).toContain("def hak_dari_katalog(role, schemas, usage=False):");
    expect(runPy).toContain("has_table_privilege");
    expect(badan).toContain(`<Snippet file="labs/api-t5/run.py" lines="${lLuar}:${lHarapKontrak}" lang="python"`);
    expect(badan).toContain("Pemeriksaan itu berjalan atas enam role service saja. Role ketujuh, misalnya role tim Pelaporan, tidak ada di daftarnya.");
  });
  test("role proses mewarisi (peninjau): layanan.sql memberi t5_app keenam role service dan batas.txt memberi t4m_monolit lima role modul; hak lintas schema role service hanya kontrak ledger", () => {
    const layanan = baca("labs/api-t5/layanan.sql");
    const warisan = cari(/^GRANT ([a-z0-9_, ]+) TO t5_app;/m, layanan, "GRANT ke t5_app")[1]!.split(",").map((x) => x.trim());
    expect(warisan).toEqual(schemaLayanan);
    const modul = cari(/t4m_monolit anggota (\w+) role modul/, batas, "t4m_monolit")[1]!;
    expect(modul).toBe(kata(5));
    expect(badan).toContain(`satu role proses mewarisi ${modul} role modul`);
    expect(badan).toContain(`satu role proses mewarisi ke${kata(warisan.length)} role service`);
    expect(badan).toContain(`Di antara ke${kata(schemaLayanan.length)} role service, satu-satunya hak lintas schema adalah kontrak kolom`);
    expect(badan).toContain(`Role proses lab, \`t5_app\`, mewarisi ke${kata(warisan.length)} role itu, jadi ia membaca ke${kata(warisan.length)} schema.`);
    expect(skema).toContain("t5_app: SELECT count(*) FROM akun a JOIN buku b ... JOIN produk p ... JOIN perangkat g ...   -- berhasil, tanpa awalan schema");
  });
  test("klaim negatif 'tidak ada di lab mana pun' (peninjau): tak satu berkas terlacak di labs/ menyebut tim, role, atau schema Pelaporan", () => {
    expect(terlacak, "git ls-files tidak tersedia").not.toBeNull();
    const berkas = [...terlacak!].filter((f) => f.startsWith("labs/") && /(\.(go|py|sql|sh|txt|md|yaml|yml|mk|json|toml)|Makefile)$/.test(f) && fs.existsSync(path.join(akar, f)));
    expect(berkas.length).toBeGreaterThan(300);
    const kena = berkas.filter((f) => /\b(tim|role|schema) Pelaporan\b|\bt\d_pelaporan\b/i.test(fs.readFileSync(path.join(akar, f), "utf8")));
    expect(kena).toEqual([]);
    expect(badan).toContain("Hak sementara, role Pelaporan, dan query Pelaporan tidak ada di lab mana pun.");
  });
  test("klaim negatif berlingkup: run.py membaca hak dari katalog, bukan isi query, dan labs/api-t5 tidak punya lint query lintas schema", () => {
    const pyApi = fs.readdirSync(path.join(akar, "labs/api-t5")).filter((f) => f.endsWith(".py")).map((f) => baca(`labs/api-t5/${f}`)).join("\n");
    expect(pyApi).not.toMatch(/\blint\b/i);
    const fungsiHak = runPy.slice(runPy.indexOf("def hak_dari_katalog"), runPy.indexOf("# ---------- skema.txt"));
    expect(fungsiHak).toContain("pg_class");
    expect(fungsiHak).not.toMatch(/sqlparse|ast\.parse|re\.findall/);
    expect(badan).toContain("Pemeriksaan di `run.py` membaca hak dari katalog PostgreSQL, bukan isi query. Lint yang menolak query lintas schema tidak ada di `labs/api-t5` (Tidak dijalankan).");
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R6-125 sampai R6-129", () => {
  const baris = ["R6-125", "R6-126", "R6-127", "R6-128", "R6-129"].map(barisRiset);
  const tautan = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
  test("lima baris berurutan R6-125 sampai R6-129 (rentang, bukan tetangga: PR halaman lain menyisip baris), ID naik tanpa ganda, lima kolom, dan semuanya tertanggal 2026-11-06", () => {
    const urutan = riset6.split("\n").map((b) => b.match(/^\| (R6-\d+) \|/)?.[1]).filter((x): x is string => !!x);
    expect(new Set(urutan).size).toBe(urutan.length);
    const nomor = urutan.map((x) => Number(x.slice(3)));
    expect([...nomor].sort((x, y) => x - y)).toEqual(nomor);
    const i = urutan.indexOf("R6-125");
    expect(urutan.slice(i, i + 5)).toEqual(["R6-125", "R6-126", "R6-127", "R6-128", "R6-129"]);
    expect(urutan.indexOf("R6-39")).toBeLessThan(i);
    expect(urutan.indexOf("R6-170")).toBeGreaterThan(i + 4);
    for (const b of baris) {
      expect(b).not.toBe("");
      expect(pecahBaris(b)).toHaveLength(5);
      expect(b).toContain("2026-11-06");
    }
  });
  test("lima tautan luar, masing-masing dua kali (teks dan Bacaan lanjut), ada di baris riset, dan tanggal buka 2026-11-06 terkunci", () => {
    const URL_LUAR = [
      "https://www.melconway.com/Home/Committees_Paper.html",
      "https://martinfowler.com/articles/data-mesh-principles.html",
      "https://www.postgresql.org/docs/17/ddl-priv.html",
      "https://www.postgresql.org/docs/17/sql-altertable.html",
      "https://stripe.com/blog/api-versioning",
    ];
    expect([...new Set(tautan)].sort()).toEqual([...URL_LUAR].sort());
    for (const u of URL_LUAR) {
      expect(tautan.filter((x) => x === u), `tautan ${u}`).toHaveLength(2);
      expect(baris.some((b) => b.includes(u.replace(/^https:\/\/(www\.)?/, ""))), `tautan tanpa baris riset: ${u}`).toBe(true);
    }
    expect(hitung(badan, "dibuka 2026-11-06")).toBe(5);
    expect(hitung(badan, "2026-11-06")).toBe(6);
  });
  test("Conway: April 1968, 'communication structures', delegasi mempersempit, dan kebutuhan komunikasi sama dengan baris R6-125; teks tanpa schema dan database", () => {
    const b = baris[0]!;
    expect(b).toContain("Datamation, April 1968");
    expect(b).toContain("copies of the communication structures of these organizations");
    expect(b).toContain("the class of design alternatives which can be effectively pursued is also narrowed");
    expect(b).toContain("a design effort should be organized according to the need for communication");
    expect(b).toContain("Kata schema dan database tidak muncul di teks (dicari 2026-11-06)");
    expect(badan).toContain('Menurut Melvin Conway, organisasi yang merancang sistem terpaksa menghasilkan rancangan yang menyalin "communication structures" organisasi itu.');
    expect(badan).toContain("Sumbernya makalah di Datamation, April 1968");
    expect(badan).toContain("tiap delegasi mempersempit pilihan rancangan yang bisa ditempuh, dan bahwa usaha merancang sebaiknya diatur menurut kebutuhan komunikasi");
    expect(badan).toContain("kata schema dan database tidak muncul di teksnya (dicari 2026-11-06)");
  });
  test("Dehghani: byline, 3 Desember 2020, empat prinsip, 'collectively necessary and sufficient', analitik lawan operasional, dan contoh media rekaan", () => {
    const b = baris[1]!;
    expect(b).toContain("terbit 2020-12-03, byline Zhamak Dehghani");
    for (const p of ["domain-oriented decentralized data ownership and architecture", "data as a product", "self-serve data infrastructure as a platform", "federated computational governance"]) expect(b).toContain(p);
    expect(b).toContain("collectively necessary and sufficient");
    expect(b).toContain("The components here are made of analytical data");
    expect(b).toContain("sits in databases behind business capabilities");
    expect(b).toContain("is a temporal and aggregated view of the facts of the business over time");
    expect(b).toContain("a digital media company");
    expect(b).toContain("Data mesh, at core, is founded in decentralization and distribution of responsibility to people who are closest to the data");
    expect(badan).toContain("Kepemilikan domain berarti, menurut tulisan itu, tanggung jawab atas data dipegang orang yang paling dekat dengan data itu.");
    expect(b).toContain("data quality, decreased lead time of data consumption");
    expect(badan).toContain("Empat prinsip data mesh menurut Zhamak Dehghani adalah kepemilikan domain, data sebagai produk, infrastruktur data self-serve, dan tata kelola terfederasi yang dijalankan komputer.");
    expect(badan).toContain("Sumbernya tulisan 3 Desember 2020");
    expect(badan).toContain('Penulisnya menulis bahwa keempat prinsip dimaksudkan "collectively necessary and sufficient". Jadi ADR 62 bukan data mesh menurut tulisan itu.');
    expect(badan).toContain("ADR 62 meminjam tiga prinsip pertama dan menukar tata kelola terfederasi dengan tinjauan manusia atas daftar produk data.");
    expect(badan).toContain("Tulisan itu menulis tentang data analitik, yaitu pandangan data yang teragregasi dan temporal untuk laporan analitik.");
    expect(badan).toContain("Ia membedakannya dari data operasional, yaitu keadaan sekarang di database di balik fungsi bisnis.");
    expect(badan).toContain("contoh tulisan itu adalah perusahaan media rekaan, bukan kasus satu perusahaan");
    expect(badan).toContain("Tabel schema pembayaran adalah data operasional, dan contoh tulisan itu");
    expect(b).toContain("operational data");
    expect(badan).toContain("ADR 62 mencabut hak baca lintas schema. Tim lain meminta data lewat API atau event berversi milik pemilik, dan laporan resmi Keuangan dibaca dari API tutup buku tim Ledger.");
    expect(badan).toContain("Pemilik produk data bertanggung jawab atas ukuran seperti kualitas data dan lama user mendapat data.");
  });
  test("PostgreSQL 17: RENAME tidak mengubah data tersimpan, hak harus diberikan, dan hanya pemilik atau superuser memberi dan mencabut, sama dengan baris R6-127", () => {
    const b = baris[2]!;
    expect(b).toContain("There is no effect on the stored data");
    expect(b).toContain("paragraf itu tidak membahas query role lain");
    expect(b).toContain("To allow other roles to use it, privileges must be granted");
    expect(b).toContain("Ordinarily, only the object's owner (or a superuser) can grant or revoke privileges on an object");
    expect(b).toContain("To revoke a previously-granted privilege, use the fittingly named REVOKE command");
    expect(badan).toContain("Dokumentasi PostgreSQL 17 menulis bahwa RENAME tidak mengubah data tersimpan, dan paragrafnya tidak membahas query milik role lain");
    expect(badan).toContain("Untuk kebanyakan objek, dokumentasi PostgreSQL 17 menulis bahwa hak harus diberikan agar role lain memakainya.");
    expect(badan).toContain("Biasanya hanya pemilik objek, atau superuser, yang bisa memberi atau mencabut hak itu");
    expect(badan).toContain("Hak yang sudah diberikan dicabut dengan REVOKE, jadi hak sementara berlaku sampai ada yang menjalankannya (Penalaran, Tidak dijalankan).");
  });
  test("Stripe: 5 Agustus 2017, kolom yang ada tetap ada, modul perubahan versi, hampir seratus upgrade dalam enam tahun, dan batas API publik", () => {
    const b = baris[3]!;
    expect(b).toContain("stripe.com/blog/api-versioning, 2017-08-05");
    expect(b).toContain("Fields that were present before should stay present, and fields should always preserve their same type and name");
    expect(b).toContain("we encapsulate it in a version change module");
    expect(b).toContain("almost a hundred backwards-incompatible upgrades over the past six years");
    expect(b).toContain("kata database, table, dan schema tidak muncul di tulisan (dicari 2026-11-06)");
    expect(badan).toContain("Brandur Leach menulis pada 5 Agustus 2017");
    expect(badan).toContain("Perusahaannya menghindari perubahan yang tidak kompatibel mundur, dan kolom yang sudah ada sebaiknya tetap ada dengan nama dan tipe yang sama.");
    expect(badan).toContain("hampir seratus upgrade tidak kompatibel mundur terjadi dalam enam tahun");
    expect(badan).toContain("Batasnya: itu API publik untuk pengembang di luar perusahaan, ditulis karyawan tentang sistemnya sendiri pada 2017.");
    expect(badan).toContain("Tulisannya tidak membahas tabel internal antar tim");
  });
  test("baris R6-129: sumber internal menyebut baris rekaman dan kode yang dipakai Snippet", () => {
    const b = baris[4]!;
    expect(b).toContain(`baris 21 sampai 24 (bagian A) dan ${lNama} sampai ${lKontrak} (bagian B`);
    expect(b).toContain(`baris ${lMerchant} sampai ${lMerchant + 1} dan ${lKontrakKolom} sampai ${lNamaDitolak + 1} (bagian F)`);
    expect(b).toContain(`baris ${lLuar} sampai ${lHarapKontrak}`);
    expect(b).toContain("TestRenameKolomKontrakTerdeteksiDiCI");
    expect(batasBaris.slice(20, 24).join("\n")).toContain("$ T4M_SCHEMA_SATU=");
    expect(bagianDi(batasBaris, 21)).toBe("A");
  });
});

describe("ID registry, tautan, template blok, tebakan, rantai, kartu, dan istilah", () => {
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const id = [...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]!);
    const ids = new Set(hal.map((x) => x.id));
    for (const x of id) expect(ids.has(x) || x === "A0", `id tidak ada: ${x}`).toBe(true);
    const jumlah: Record<string, number> = {};
    for (const x of id) jumlah[x] = (jumlah[x] ?? 0) + 1;
    expect(jumlah).toEqual({
      "t4-modul": 3, "A0": 1, "t6-m54": 2, "t5-service": 2, "t6-prd": 2, "t2-skema-tanpa-downtime": 1, "t5-prd": 4,
      "t2-tutup-buku": 1, "t5-partisi": 2, "t5-read-replica": 1, "t6-m52": 1, "t5-adr-60": 1, "t5-m44": 1, "t6-residensi": 1, "t6-adr-69": 2,
    });
    expect(jumlah["t6-m54"]).toBe(2);
    expect(badan).toContain("Yakin dengan ketiganya? Lompat ke [[t6-m54]].");
    expect(badan).not.toContain("[[berikutnya]]");
  });
  test("template konsep: lima blok dalam urutan, dua pertama terbuka; Cek diri empat soal; satu details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(4);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t6-m53.json" />');
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(badan).toContain('<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah menjalankan satu rename kolom dengan dua cara membaca: lewat tabel milik tim lain dan lewat event berversi milik pemiliknya.">');
    expect((badan.match(/^### (Gejala|Kenapa ini ada|Yang dikira|Yang sebenarnya|Cara kerjanya|Yang tidak direkam|ADR 62.*|Sengaja belum dilakukan|Cek diri|Saat me-review kode AI, cek ini|Bacaan lanjut)$/gm) ?? []).length).toBe(11);
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; empat tabel; opsi ADR memuat A sampai E dari naskah", () => {
    const barisHalaman = badan.split("\n");
    let tabelKe = 0;
    for (let i = 0; i < barisHalaman.length; i++) {
      if (barisHalaman[i]!.startsWith("|") && !(barisHalaman[i - 1] ?? "").startsWith("|")) {
        tabelKe++;
        const n = pecahBaris(barisHalaman[i]!).length;
        for (let j = i; barisHalaman[j]?.startsWith("|"); j++) expect(pecahBaris(barisHalaman[j]!).length, `tabel ${tabelKe} baris ${j + 1}`).toBe(n);
      }
    }
    expect(tabelKe).toBe(4);
    const opsi = tabelDari(badan, "| | A. Replica lintas schema");
    expect(opsi).toHaveLength(7);
    expect(opsi[0]!.slice(1)).toHaveLength(5);
    expect(opsi[0]![0]).toBe("");
    expect(opsi[0]!.slice(1)).toEqual(["A. Replica lintas schema", "B. Data warehouse pusat", "C. Rapat sinkronisasi migration", "D. Database terpisah per service", "E. API atau event berversi, hak dicabut"]);
    expect(opsi[4]![1]).toContain("Replica memutar ulang rekaman perubahan primary");
    expect(opsi[4]![3]).toContain(`${pasangTim} pasang tim`);
    expect(opsi[4]![4]).toContain("pemicunya belum terukur");
    expect(opsi[4]![5]).toContain("Pemilik menanggung versi lama");
    expect(opsi[6]![3]).toContain(`${jumlahTim} × ${jumlahTim - 1} ÷ 2 = ${pasangTim}`);
    expect(opsi[6]![4]).toContain("butir 3 ADR 60");
    expect(kolomAdr62[2]).toMatch(/replica lintas schema \(ditolak:/);
    expect(kolomAdr62[2]).toMatch(/rapat sinkronisasi migration \(ditolak:/);
    expect(badan).toContain("- **A ditolak** karena");
    expect(badan).toContain("- **C ditolak** karena");
    expect(badan).toContain("- **B belum** karena");
    expect(badan).toContain("- **D belum** karena");
    expect(badan).toContain("| Database terpisah per service | Pemicu di ADR 60 belum terukur | [[t6-adr-69]] |");
    const kepala = opsi[0]!.slice(1).map((x) => x.replace(/^[A-E]\. /, "").toLowerCase());
    for (const o of adr62Opsi) expect(kepala.some((k) => k.startsWith(o)), `opsi tidak ada di tabel: ${o}`).toBe(true);
    for (const o of adr62Opsi) expect(kolomAdr62[2]!.toLowerCase()).toContain(o);
    expect(kolomAdr62[2]).toContain("ADR 60 butir 3");
    expect(opsi.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    const aturan = badan.slice(badan.indexOf("**Keputusan: opsi E.**"), badan.indexOf("**Kenapa E, bukan A, B, C, atau D.**")).split("\n").filter((b) => /^\d+\. /.test(b));
    expect(aturan).toHaveLength(7);
    expect(badan).toContain(`**Keputusan: opsi E.** ${kata(aturan.length).replace(/^./, (c) => c.toUpperCase())} aturan:`);
    const preMortem = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**")).split("\n").filter((b) => /^\d+\. /.test(b));
    expect(preMortem).toHaveLength(3);
    expect(badan).toContain("Tiga penyebab yang paling mungkin:");
    expect(preMortem[2]).toContain(`dengan batas ${kata(batasProduk)} produk per tim (Asumsi)`);
    expect(badan).toContain("Isinya Penalaran, Tidak dijalankan, kecuali sel yang menyebut rekaman.");
  });
  test("keputusan di naskah: aturan 62 sesuai kalimat naskah (API atau event berversi, hak SELECT dicabut, lint, API tutup buku Ledger, tiga prinsip, tanpa alat)", () => {
    const k = kolomAdr62[1]!;
    expect(k).toContain("Data untuk tim lain hanya lewat API atau event berversi (produk data) dengan pemilik, skema, dan kesegaran tertulis (Asumsi)");
    expect(k).toContain("Hak SELECT lintas schema dicabut, dan lint di pipeline menolak query lintas schema");
    expect(k).toContain("Laporan resmi Keuangan dibaca dari API tutup buku milik tim Ledger (berasal dari snapshot saldo, ADR 49)");
    expect(k).toContain("event hanya untuk dasbor dan tim lain");
    expect(k).toContain("dipakai kepemilikan domain dan data sebagai produk, self-serve lewat golden path, dan tata kelola berupa tinjauan Security dan Keuangan atas daftar produk data");
    expect(k).toContain("bukan tata kelola komputasional federasi yang otomatis");
    expect(k).toContain("Tanpa alat mesh");
    expect(badan).toContain("2. Data untuk tim lain hanya lewat API atau event berversi. Tiap produk data punya pemilik, skema, dan kesegaran yang tertulis (Asumsi).");
    expect(badan).toContain("3. Hak SELECT lintas schema dicabut. Lint di pipeline menolak query yang menyebut schema milik tim lain.");
    expect(badan).toContain("4. Laporan resmi Keuangan dibaca dari API tutup buku milik tim Ledger, yang berasal dari snapshot saldo ADR 49 ([[t5-partisi]]). Event hanya untuk dasbor dan tim lain.");
    expect(badan).toContain("5. Dari empat prinsip data mesh dipakai kepemilikan domain, data sebagai produk, dan self-serve lewat golden path.");
    expect(badan).toContain("6. Tidak memasang alat khusus data mesh.");
    expect(badan).toContain("7. Data yang belum punya event diminta lewat katalog, dan pemilik menjawab dengan jadwal tertulis. Hak baca sementara tidak ada (Asumsi desain).");
    expect(sebenarnyaM53).toContain("laporan resmi adalah produk milik tim Ledger");
    expect(sebenarnyaM53).toContain("Hak baca lintas schema adalah contract yang tidak tertulis");
  });
  test("skenario alur: valid menurut alur-core, empat komponen, lima langkah dan empat langkah varian dari awal, jenis Ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen.map((k) => k.id)).toEqual(["pembayaran", "db", "pelaporan", "hadi"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(4);
    expect(skenario.varian.mulai).toBe(0);
    expect(core.steps(skenario, true)).toHaveLength(4);
    expect(core.steps(skenario, false)).toHaveLength(5);
    expect(skenario.sumber.catatan).toContain("Jalur utama adalah Ilustrasi");
    expect(skenario.sumber.catatan).toContain("labs/t4-modul/output/batas.txt bagian A");
    expect(skenario.sumber.catatan).toContain("labs/api-t5/output/skema.txt bagian F");
    expect(skenario.sumber.catatan).toContain("Event berversi dan API tutup buku milik tim Ledger Tidak dijalankan");
    expect(badan).toContain("centang **Ubah satu hal: " + skenario.varian.label + "**");
    expect(skenario.varian.label).toBe("Pelaporan membaca lewat event berversi, bukan tabel");
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) expect(l.kirim + " " + l.jelas, `langkah tanpa label sumber: ${l.judul}`).toMatch(/Ilustrasi|Rekaman lab|Asumsi|Tidak dijalankan|Penalaran/);
    expect(skenario.langkah[3]!.kirim).toContain(`(${kodeKolom})`);
    expect(skenario.varian.langkah[2]!.kirim).toContain(`(${kodeBawaan})`);
    expect(skenario.varian.langkah[2]!.kirim).toContain("permission denied for schema t5_pembayaran");
    // peninjau: label komponen, nada, pengantar, dan huruf bagian rekaman diturunkan, bukan hanya dikunci
    expect(skenario.komponen.map((k) => k.label)).toEqual(["Tim Pembayaran", "Database negara kedua", "Tim Pelaporan", "Pak Hadi, Keuangan"]);
    expect(skenario.pengantar).toContain(`centang 'Ubah satu hal'`);
    expect(skenario.langkah.map((l) => `${l.dari}>${l.ke ?? ""}`)).toEqual(["pelaporan>db", "pembayaran>db", "pembayaran>", "pelaporan>db", "pelaporan>hadi"]);
    expect(skenario.varian.langkah.map((l) => `${l.dari}>${l.ke ?? ""}`)).toEqual(["pembayaran>pelaporan", "pembayaran>db", "pelaporan>db", "pelaporan>hadi"]);
    expect(skenario.predict.q).toContain("Jumat 06.00 job laporan menjalankan query yang menyebut nama lama");
    expect(gejalaM53).toContain("Jumat 06.00");
    expect(skenario.langkah.map((l) => l.nada)).toEqual([undefined, undefined, undefined, undefined, "warn"]);
    expect(skenario.varian.langkah.map((l) => l.nada)).toEqual([undefined, undefined, undefined, "good"]);
    expect(skenario.varian.langkah[2]!.jelas).toContain(`skema.txt bagian ${bagianDi(skemaBaris, lMerchant)}`);
    expect(skenario.varian.langkah[1]!.jelas).toContain(`Rekaman Tahap 4, bagian ${bagianDi(batasBaris, lNama)}`);
    expect(skenario.sumber.catatan).toContain(`batas.txt bagian ${bagianDi(batasBaris, lSebelumRename)}`);
    expect(skenario.sumber.catatan).toContain(`skema.txt bagian ${bagianDi(skemaBaris, lMerchant)}`);
  });
  test("tebakan skenario: empat pilihan, tepat satu benar di posisi kedua dan bukan pilihan terpanjang; jawaban tidak di prosa sebelum widget, description, atau paragraf aman", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(1);
    expect(p.varian).toBe(false);
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(p.options[p.answer]).toContain(`(${kodeKolom})`);
    expect(p.options[3]).toContain(`(${kodeBawaan})`);
    expect(p.options.filter((o) => o.includes(`(${kodeKolom})`))).toHaveLength(1);
    expect(p.explain).toContain(`column \\"nama\\" does not exist (${kodeKolom})`.replace(/\\"/g, '"'));
    expect(p.explain).toContain("rekaman lab Tahap 4, bagian A");
    expect(p.explain).toContain("laporan kosong tetap Ilustrasi");
    const sebelumWidget = badan.slice(0, badan.indexOf("<WidgetLama"));
    const jawab = [kodeKolom, "galat", "column"];
    for (const j of jawab) expect(sebelumWidget.toLowerCase(), `jawaban tebakan sebelum widget: ${j}`).not.toContain(j);
    expect(frontmatter).not.toContain(kodeKolom);
    expect(frontmatter.toLowerCase()).not.toContain("galat");
    const tanyaMulai = cari(/<details class="question">([\s\S]*?)<\/details>/, badan, "Sudah tahu")[1]!;
    expect(tanyaMulai).toContain("1. Query yang masih menyebut nama kolom lama dijalankan sesudah rename. Apa jawaban PostgreSQL di rekaman Tahap 4?\n");
    expect(tanyaMulai.toLowerCase()).not.toContain("kosong");
    const aman = cari(/<Blok nama="Coba" buka aman="([^"]+)">/, badan, "aman")[1]!;
    for (const j of jawab) expect(aman.toLowerCase()).not.toContain(j);
    expect(p.q).toContain("Apa jawaban PostgreSQL?");
    expect(p.options[3]).toContain("milik role lain");
    const noscript = cari(/<noscript>([\s\S]*?)<\/noscript>/, badan, "noscript")[1]!;
    expect(noscript).toContain(`galat kolom tidak ada (${kodeKolom}), bukan hasil kosong, pada rekaman Tahap 4 bagian ${bagianDi(batasBaris, lSebelumRename)} (batas.txt)`);
    expect(skenario.langkah[3]!.judul).toBe("Jumat 06.00: job Pelaporan menyebut nama lama");
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber Ilustrasi, simpul akhir terbaca tanpa sub, dan jalur ADR 62 sama dengan keputusan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    expect(d.sumber.jenis).toBe("ilustrasi");
    expect(d.id).toBe("t6-m53-inti");
    expect(d.baris[0]!.simpul.map((s) => s.teks)).toEqual(["Hak baca sementara", "Rename kolom", "Laporan kosong"]);
    expect(d.baris[1]!.simpul.map((s) => s.teks)).toEqual(["API atau event", "Hak lintas dicabut", "Laporan dari Ledger"]);
    expect(d.baris[1]!.label).toBe("ADR 62");
    expect(d.sumber.teks).toBe("Ilustrasi dan Asumsi desain ADR 62");
    expect(d.baris[0]!.simpul.map((s) => s.sub)).toEqual(["tim Pelaporan, schema pembayaran", "migration tim Pembayaran", "Jumat 06.00, negara kedua"]);
    expect(d.baris[1]!.simpul.map((s) => s.sub)).toEqual(["berversi, milik pemilik", "schema, lint di pipeline", "API tutup buku"]);
    expect(d.baris[0]!.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "warn"]);
    expect(d.baris[1]!.simpul.map((s) => s.nada)).toEqual(["good", "good", "good"]);
    expect(d.baris.flatMap((b) => b.simpul.map((s) => s.teks.length)).every((n) => n <= 24)).toBe(true);
    expect(kolomAdr62[1]).toContain("API tutup buku milik tim Ledger");
  });
  test("kartu Cek diri: empat kartu t6-m53, tanya sama dengan soal di halaman, dan jawaban memuat kode galat dan nomor ADR", () => {
    const kartu = kartuSemua.filter((x) => x.halaman === "t6-m53");
    expect(kartu.map((x) => x.id)).toEqual(["t6-m53-1", "t6-m53-2", "t6-m53-3", "t6-m53-4"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(soal).toHaveLength(4);
    kartu.forEach((k, i) => {
      expect(k.tanya).toBe(soal[i]!.replace(/`/g, ""));
      expect(k.url).toBe(h.path!.replace(/\.md$/, "/"));
    });
    expect(kartu[0]!.jawab).toContain(kodeKolom);
    expect(kartu[1]!.jawab).toContain("tes kontrak");
    expect(kartu[2]!.jawab).toContain("snapshot saldo ADR 49");
    expect(kartu[3]!.jawab).toContain("memutar ulang rekaman perubahan primary");
  });
  test("istilah: tak ada kata berarti ganda yang dilarang brief (token, router, client, log, nonce, replika, penerbit, wilayah) di halaman, rantai, dan skenario", () => {
    const teks = [halaman, JSON.stringify(rantaiMentah), JSON.stringify(skenario)].join("\n");
    for (const k of ["token", "router", "client", "log", "nonce", "replika", "penerbit", "wilayah", "service mesh", "sharding", "on-call"]) {
      expect(teks.match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "gi")) ?? [], `kata dilarang: ${k}`).toEqual([]);
    }
    expect(hitung(badan, "replica")).toBeGreaterThan(0);
    expect(dari("t6-m53").ada).toBe(true);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, dan kartu", () => {
    const teks = [halaman, JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t6-m53"))].join("\n");
    expect(teks).not.toMatch(/\bR\d-\d+\b/);
    expect(teks).not.toMatch(/\bkeputusan \d{3,4}\b/i);
    expect(teks).not.toMatch(/#\d{3}\b/);
  });
  test("label: 'Rekaman lab' hanya berdampingan dengan Tahap 4 atau 5, tautan Label sumber, atau sel tabel; tak satu pun angka waktu cerita berlabel rekaman", () => {
    const baris = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(baris.length).toBeGreaterThan(0);
    for (const b of baris) expect(b, `Rekaman lab tanpa tahap: ${b.slice(0, 80)}`).toMatch(/Tahap 4|Tahap 5|\[Label sumber\]|\(Rekaman lab\)|\[\[A0\]\]/);
    expect(badan).not.toMatch(/Rekaman lab[^.]*(Rabu|Kamis|Jumat|06\.00)/);
    // peninjau: per kalimat, bukan per baris; satu kalimat berlabel rekaman tanpa tahap atau bagian rekaman adalah label yang lebih kuat dari sumbernya
    for (const b of baris) for (const k of b.split(SPLIT).filter((x) => x.includes("Rekaman lab"))) expect(k, `kalimat Rekaman lab tanpa tahap, bagian, atau tautan label: ${k.slice(0, 90)}`).toMatch(/Tahap [45]|bagian [AB]|\[Label sumber\]|\[\[A0\]\]/);
    expect(badan).not.toMatch(/\[perlu verifikasi\]/);
  });
  test("adegan Gejala tanpa kalimat definisi: tiga paragraf adegan dan satu catatan berawalan bintang yang memuat angka cerita", () => {
    const awal = badan.indexOf("### Gejala\n");
    const isi = badan.slice(awal + "### Gejala\n".length, badan.indexOf('<details class="question">')).trim();
    const paragraf = isi.split("\n\n").map((x) => x.trim()).filter((x) => x !== "");
    const adegan = paragraf.filter((x) => !x.startsWith("*"));
    expect(adegan).toHaveLength(3);
    const DEFINISI = /\b(adalah|yaitu|disebut|artinya|berarti|maksudnya|merupakan)\b/;
    for (const x of adegan) for (const k of x.split(/(?<=[.!?])\s+/)) expect(k, `definisi di adegan: ${k}`).not.toMatch(DEFINISI);
    expect(paragraf.filter((x) => x.startsWith("*")).map((x) => x.match(/^\*[^*]+\*/)![0])).toEqual(["*Angka cerita (Ilustrasi):*"]);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terpenuhi", "terbukti", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "ambang", "syarat", "pemicu", "sebelas", "delapan", "tujuh", "sementara", "lintas", "kosong", "gagal", "lulus", "dicabut"];
const sidikKata = (teks: string, daftar: string[]): Record<string, number> =>
  Object.fromEntries(daftar.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
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
const kartuM53 = kartuSemua.filter((x) => x.halaman === "t6-m53");
const NAMA = ["pak hadi", "bayu", "tim ledger", "tim pembayaran", "tim pelaporan", "tim risiko", "conway", "dehghani", "leach", "stripe", "datamation", "postgresql", "replica", "contract", "kontrak", "katalog", "pipeline", "ledger", "event", "api"];
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-06/g) ?? []).length, tanggal: (halaman.match(/2026-11-06/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  nama: sidikKata(halaman, NAMA),
  kode: [...badan.matchAll(/`([^`]+)`/g)].map((m) => m[1]!),
  snippet: badan.split("\n").filter((b) => b.startsWith("<Snippet")).map(h16),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R6-125", "R6-126", "R6-127", "R6-128", "R6-129"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuM53)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuM53) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m53-laporan-kosong.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m53-laporan-kosong.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.nama).toEqual(SIDIK.nama);
    expect(sidikSekarang.kode).toEqual(SIDIK.kode);
    expect(sidikSekarang.snippet).toEqual(SIDIK.snippet);
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
