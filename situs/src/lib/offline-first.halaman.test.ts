// Penjaga halaman 3.21 (keputusan 1080 sampai 1082): angka, ID, nomor ADR, rentang Snippet, tanggal akses, versi sumber, label
// sumber, dan kalimat di offline-first.mdx diturunkan dari rekaman labs/t3-offline (m24, versi, kunci24, sinkron14), kode
// labs/api-t3 (repo, service, cmd/api, migrasi, tes Go), naskah, registry, RISET, dan halaman tetangga. Isi halaman dikunci unit
// demi unit (EXPECT, nilai rekaman dan kode diisi lewat «placeholder»), dan tiap klaim mekanisme dipasangkan dengan rekaman atau
// kode yang membuktikannya di tes terpisah, sebab mengunci kalimat utuh tidak menangkap kalimat yang SALAH. Klaim dokumentasi
// (Android, Flutter, pub.dev, Apple, Firestore, WatermelonDB, Serverpod, Figma, arXiv) dijaga lewat baris riset R3-200 sampai
// R3-204, yang dibuka ke sumber primer 2026-10-27 dan dikunci dengan sidik jari. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-offline-inti.json";
import registry from "../../data/cerita.json";
import tebakMentah from "../../data/widget/t3-offline-tebak.json";
import { DataTebak } from "../widgets/tebak/skema";
import { cekTemplat, daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataRantai } from "./rantai";

const akar = path.resolve(__dirname, "../../..");
// Berkas yang dibaca tes ini harus terlacak git: berkas tmp/ atau salinan public/ tidak ada di CI.
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
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);

const halamanBerkas = "situs/src/content/docs/tahap-3/offline-first.mdx";
const mdx = baca(halamanBerkas);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const rantai = DataRantai.parse(rantaiMentah);
const tebak = DataTebak.parse(tebakMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const m24Txt = baca("labs/t3-offline/output/m24.txt");
const versiTxt = baca("labs/t3-offline/output/versi.txt");
const kunci24Txt = baca("labs/t3-offline/output/kunci24.txt");
const sinkron14Txt = baca("labs/t3-offline/output/sinkron14.txt");
const readmeLab = baca("labs/t3-offline/README.md");
const runLab = baca("labs/t3-offline/run.py");
const katalogRepo = baca("labs/api-t3/internal/repo/katalog.go");
const katalogSvc = baca("labs/api-t3/internal/service/katalog.go");
const idempotenSvc = baca("labs/api-t3/internal/service/idempoten.go");
const idempotenRepo = baca("labs/api-t3/internal/repo/idempoten.go");
const handlerIdempoten = baca("labs/api-t3/internal/handler/handler_idempoten.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const migrasiProduk = baca("labs/api-t3/migrasi/000018_katalog_promo.up.sql");
const migrasiSinkron = baca("labs/api-t3/migrasi/000019_operasi_sinkron.up.sql");
const tesOffline = baca("labs/api-t3/internal/service/offline_test.go");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const fiturTeknis = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const caraPakai = baca("situs/src/content/docs/cara-pakai.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");

// ---- bagian rekaman -------------------------------------------------------------------------------
const pecah = (teks: string): Record<string, string[]> => {
  const hasil: Record<string, string[]> = {};
  let kini = "";
  for (const b of teks.split("\n")) {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) {
      kini = m[1]!;
      hasil[kini] = [];
    } else if (kini) hasil[kini]!.push(b);
  }
  return hasil;
};
const judulBagian = (teks: string, huruf: string): string => {
  const b = teks.split("\n").find((x) => x.startsWith(`# --- ${huruf}. `));
  if (!b) throw new Error(`rekaman: judul bagian ${huruf} tidak ada`);
  return b;
};
const bagian = (semua: Record<string, string[]>, huruf: string): string[] => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;
const barisRiset = (id: string): string => {
  const b = riset.split("\n").filter((x) => x.startsWith(`| ${id} |`));
  expect(b, `baris riset ${id}`).toHaveLength(1);
  return b[0]!;
};
const rp = (n: number): string => `Rp${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
interface Jawaban { kode: number; badan: any }
/** Urutan jawaban HTTP dalam satu bagian: kode status dan badan JSON (baris yang diawali kurung kurawal). */
const jawaban = (baris: string[]): Jawaban[] => {
  const hasil: Jawaban[] = [];
  for (const b of baris) {
    const m = b.match(/^HTTP\/1\.1 (\d+) /);
    if (m) hasil.push({ kode: Number(m[1]), badan: null });
    else if (b.startsWith("{") && hasil.length && hasil.at(-1)!.badan === null) hasil.at(-1)!.badan = JSON.parse(b);
  }
  return hasil;
};
const fungsiGo = (kode: string, nama: string): string => {
  const a = kode.indexOf(`func ${nama}(`);
  if (a < 0) throw new Error(`kode: fungsi ${nama} tidak ada`);
  const b = kode.indexOf("\nfunc ", a + 1);
  return kode.slice(a, b < 0 ? undefined : b);
};

const M = pecah(m24Txt);
const VS = pecah(versiTxt);
const K = pecah(kunci24Txt);
const S = pecah(sinkron14Txt);
const mA = jawaban(bagian(M, "A"));
const mB = jawaban(bagian(M, "B"));
const mC = jawaban(bagian(M, "C"));
const mD = jawaban(bagian(M, "D"));
const vA = jawaban(bagian(VS, "A"));
const vB = jawaban(bagian(VS, "B"));
const vC = jawaban(bagian(VS, "C"));
const vD = jawaban(bagian(VS, "D"));
const sB = jawaban(bagian(S, "B"));
const kE = bagian(K, "E");

// ---- nilai turunan dari rekaman dan kode ------------------------------------------------------------
const jamOffline = Number(cari(/^# Jam lab: Senin 06\.50 \((\d+) jam sesudah Jumat 16\.50\)/, bagian(M, "D"), "m24 D jam")[1]);
const jam17 = Number(cari(/^# Jam lab: Sabtu 09\.50 \((\d+) jam sesudah Jumat 16\.50\)/, bagian(M, "C"), "m24 C jam")[1]);
const jamKunci = Number(cari(/const UmurKunci = (\d+) \* time\.Hour/, idempotenSvc.split("\n"), "UmurKunci")[1]);
const hariQueue = Number(cari(/const MaksUmurOperasi = (\d+) \* 24 \* time\.Hour/, katalogSvc.split("\n"), "MaksUmurOperasi")[1]);
const jamSalah = Number(cari(/const MaksJamSalah = (\d+) \* time\.Hour/, katalogSvc.split("\n"), "MaksJamSalah")[1]);
const hariKunci = Number(cari(/BersihkanOperasi\(ctx, (\d+)\*24\*time\.Hour\)/, mainGo.split("\n"), "retensi sinkron")[1]);
const hari15 = Number(cari(/^# --- D\. (\d+) hari sesudah Jumat/, [judulBagian(sinkron14Txt, "D")], "sinkron14 D hari")[1]);
const umurB = cari(/^# --- B\. Queue paling lama \d+ hari: (\d+ hari \d+ jam) diterima, (\d+ hari \d+ jam) ditolak ---$/, [judulBagian(sinkron14Txt, "B")], "sinkron14 B");
const umurOk = umurB[1]!;
const umurTolak = umurB[2]!;
const dibuang = Number(cari(/^bersih: 0 baris outbox selesai \(lebih dari \d+ hari\), (\d+) operasi sinkron \(lebih dari \d+ hari\)$/, bagian(S, "D"), "sinkron14 D bersih")[1]);
const dibuang0 = Number(cari(/^bersih: 0 baris outbox selesai \(lebih dari \d+ hari\), (\d+) operasi sinkron \(lebih dari \d+ hari\)$/, bagian(S, "A"), "sinkron14 A bersih")[1]);
const jurnalBaru = kE.map((b) => b.match(/^ (1000[6-9]) +\| (bayar|transfer) +\| .+\| -(\d+)$/)).filter((m) => m !== null).map((m) => ({ jurnal: Number(m![1]), jumlah: Number(m![3]) }));
const hariOpsiA = Number(cari(/Key semua endpoint (\d+) hari/, naskah.split("\n"), "naskah opsi A")[1]);
const fnUbah = fungsiGo(tesOffline, "TestUbahProdukBersamaanSatuPemenang");
const fnKunci = fungsiGo(tesOffline, "TestSinkronKunciSamaBersamaanSekali");
const nUbah = Number(cari(/i <= (\d+); i\+\+/, fnUbah.split("\n"), "tes ubah jumlah")[1]);
const ubahHasil = cari(/ok\.Load\(\) != (\d+) \|\| beda\.Load\(\) != (\d+)/, fnUbah.split("\n"), "tes ubah hasil");
const nKunci = Number(cari(/i < (\d+); i\+\+/, fnKunci.split("\n"), "tes kunci jumlah")[1]);
const kunciHasil = cari(/baru\.Load\(\) != (\d+) \|\| ulang\.Load\(\) != (\d+)/, fnKunci.split("\n"), "tes kunci hasil");

const V: Record<string, string | number> = {
  rp1: rp(jurnalBaru[0]!.jumlah), rp2: rp(jurnalBaru[1]!.jumlah), rp3: rp(jurnalBaru[2]!.jumlah),
  rpTotal: rp(jurnalBaru.reduce((a, b) => a + b.jumlah, 0)),
  umurOk, umurTolak, hariOpsiA, hariOpsiA1: hariOpsiA + 1, hariQueue, hariKunci, hari15, jamOffline, jam17, jamKunci,
  nUbah, nUbahOk: ubahHasil[1]!, nUbahBeda: ubahHasil[2]!, nKunci, nKunciBaru: kunciHasil[1]!, nKunciUlang: kunciHasil[2]!,
  dibuang, dibuang0,
};
const isi = (t: string): string =>
  t.replace(/«(\w+)»/g, (_, k: string) => {
    if (!(k in V)) throw new Error(`placeholder tidak dikenal: ${k}`);
    return String(V[k]);
  });

// ---- isi halaman, unit demi unit (dipisah baris kosong); «nama» diisi dari sumber lewat isi() ----
const EXPECT: string[] = [
  "import Blok from \"../../../components/Blok.astro\";\nimport Rantai from \"../../../components/Rantai.astro\";\nimport Snippet from \"../../../components/Snippet.astro\";\nimport TabSet from \"../../../components/TabSet.astro\";\nimport Tebak from \"../../../widgets/tebak/Tebak.tsx\";\nimport intiDiagram from \"../../../../data/diagram/t3-offline-inti.json\";\nimport dataTebak from \"../../../../data/widget/t3-offline-tebak.json\";",
  "<p class=\"meta\">Baca 19 menit · coba 3 menit · Prasyarat: [[t3-m24]]</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Operasi yang menunggu di HP membawa kunci dan versi: kunci mengenali kiriman ulang, dan versi menolak operasi yang sudah usang.",
  "<Rantai data={intiDiagram} ringkas />",
  "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `versi.txt` bagian C, HP Ani online lagi hari Senin, «jamOffline» jam sesudah Jumat. Operasi soto dikirim ulang dengan kunci yang sama dan dikenali: jawabannya `ulang: true`, dan stok 30 dari hari Sabtu utuh. Operasi bakso belum pernah sampai, jadi kuncinya tidak dikenal, tetapi versi dasar 1 sudah lewat. Server menjawab 409 dengan stok 30 dan versi 2, dan tidak mengubah apa pun.",
  "Jalur lama tanpa versi merekam kebalikannya. Di `m24.txt` bagian D, kunci sudah kedaluwarsa sesudah «jamKunci» jam, jadi `stok = 0` diterapkan di atas stok 30 dan jawabannya 200. Waktu di lab diperankan (Ilustrasi mekanisme), dan HP diperankan curl, jadi queue lokal dan layar konflik di app Tidak dijalankan.",
  "<details class=\"question\">\n<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Operasi bakso belum pernah sampai dan tiba hari Senin. Apa yang menolaknya, kunci atau versi?\n2. Kenapa queue di HP paling lama «hariQueue» hari, padahal kunci sinkron hidup «hariKunci» hari?\n3. Kenapa pembayaran tidak ikut lewat sinkron ini?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: kunci saja tidak cukup untuk operasi yang menunggu lama, dan versi baris yang menolak operasi dari keadaan yang sudah lewat.\">",
  "Tebak dulu apa jawaban server, lalu baca alasan tiap pilihan. Adegannya memakai bakso di `versi.txt` bagian B, C, dan D.",
  "<Tebak client:visible data={dataTebak} />",
  "<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: 409, stok tetap 30, dan jawabannya memuat stok 30 dan versi 2.</p>\n</noscript>",
  "**Ubah satu hal:** bayangkan operasi serupa untuk soto sampai ke server Jumat, sebelum Ani mengisi lewat dasbor. Versi dasarnya masih sama dengan versi di server, jadi server menerapkannya. `versi.txt` bagian A merekamnya: jawaban 200, status `diterapkan`, stok 0 dan versi 2.",
  "Ubah satu hal lagi: tab dasbor yang masih menampilkan soto versi 2 mengubah stok ke 10 sesudah Ani mengisi 30. Hasilnya 409 dan stok 30 utuh (`versi.txt` bagian B).",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t3-m24]] menunjukkan stok yang diisi Ani hari Sabtu kembali ke angka lama hari Senin. Penyebabnya dua. Kunci kirim ulang hanya hidup «jamKunci» jam ([[t2-idempotency]]), sedangkan akhir pekan warung «jamOffline» jam (Asumsi dari naskah). Dan endpoint stok versi lama menimpa tanpa memeriksa versi (`m24.txt` bagian D).",
  "PRD v3 meminta warung bisa mengubah stok dan harga tanpa sinyal, dan menegaskan pembayaran tidak pernah offline ([[t3-prd]]). Halaman ini memutuskan apa yang dijaga untuk operasi yang menunggu lama, dan operasi apa yang boleh menunggu.",
  "Dokumentasi Android menyebut tiga cara menulis, dan halaman itu bertanda Last updated 2026-10-14 UTC ([Android: Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first), dibuka 2026-10-27). Online-only writes menulis lewat jaringan dulu dan melempar exception bila gagal. Queued writes memasukkan objek ke queue dan mengosongkannya dengan exponential backoff saat online. Lazy writes menulis ke penyimpanan lokal dulu, lalu memasukkan tulis jaringan ke queue secepatnya.",
  "Dokumentasi yang sama menulis bahwa pola lazy writes tidak sederhana karena konflik bisa terjadi, dan bahwa penyelesaian konflik sering butuh versioning.",
  "Dokumentasi Flutter memberi flag `synchronized` pada data yang belum terkirim ([Flutter: Offline-first support](https://docs.flutter.dev/app-architecture/design-patterns/offline-first), dokumentasi Flutter 3.47, diperbarui 2026-05-05, dibuka 2026-10-27). Ia menyebut empat cara menyinkronkan: timer, background process dengan plugin `workmanager`, tarik untuk menyegarkan, dan push.",
  "Kata conflict dan versioning tidak ada di halaman itu, jadi aturan yang menentukan nasib stok Ani harus kamu putuskan sendiri.",
  "### Cara kerjanya",
  "**Enam hal bisa terjadi pada satu operasi di queue, dan tiap hal punya penjaga sendiri.**",
  "| Kejadian | Jawaban server | Penjaga | Sumber |\n|---|---|---|---|\n| HP mengirim ulang dengan kunci yang sama sesudah jawaban hilang | 200 dengan `ulang: true`, stok tidak berubah | Kunci sinkron | `versi.txt` bagian C (soto); `sinkron14.txt` bagian A |\n| Operasi belum pernah sampai dan tiba sesudah stok berubah | 409 dengan keadaan terkini, tidak ada yang berubah | Versi dasar | `versi.txt` bagian C (bakso) |\n| Tab dasbor di laptop masih menampilkan angka lama | 409 dengan keadaan terkini | Versi di `PATCH /produk/{id}` | `versi.txt` bagian B |\n| Operasi lebih tua dari «hariQueue» hari | 422, tidak ada baris yang dicatat | Umur queue | `sinkron14.txt` bagian B dan D |\n| Kunci yang sama dengan isi lain, atau milik akun lain | 422 | Perbandingan isi kunci | `sinkron14.txt` bagian C |\n| Jenis bayar, transfer, atau topup | 422 apa pun isinya | Daftar jenis | `sinkron14.txt` bagian E |",
  "**Versi diperiksa di dalam satu UPDATE.** Syaratnya `AND versi = $5`. Pola ini disebut optimistic lock ([[t2-race-lock]]): baris tidak dikunci saat HP membaca, dan konflik baru ketahuan saat menulis. Bila baris sudah diubah, UPDATE tidak cocok dengan baris mana pun, dan kode membaca keadaan terkini untuk jawaban 409:",
  "<Snippet file=\"labs/api-t3/internal/repo/katalog.go\" region=\"ubah-produk\" lang=\"go\" title=\"labs/api-t3/internal/repo/katalog.go\" />",
  "Dua perubahan serentak dari versi yang sama tidak bisa sama-sama menang. Bila transaction pertama sudah commit, PostgreSQL mengevaluasi ulang WHERE pada versi baru baris. UPDATE kedua melanjutkan hanya bila versinya masih cocok ([PostgreSQL 17: Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html), bagian Read Committed, dibuka 2026-10-25). Tes Go `TestUbahProdukBersamaanSatuPemenang` menjalankan «nUbah» perubahan dari versi 1: «nUbahOk» berhasil dan «nUbahBeda» mendapat versi berbeda, dan itu tes, bukan rekaman lab.",
  "RFC 9110 menulis bahwa jawaban 409 sebaiknya memuat cukup isi supaya pengirim mengenali sumber konflik ([RFC 9110 §15.5.10](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.10), dibuka 2026-10-25). Karena itu jawaban lab membawa `sekarang`, yaitu stok, harga, dan versi terkini.",
  "**Kunci dan hasilnya disimpan dalam satu transaction.** Baris produk lebih dulu dikunci dengan `FOR UPDATE`. Potongan ini menunjukkan sisanya: kunci dicari, versi dibandingkan, lalu hasilnya, diterapkan atau konflik, disimpan bersama kuncinya:",
  "<Snippet file=\"labs/api-t3/internal/repo/katalog.go\" lines=\"216:251\" lang=\"go\" title=\"labs/api-t3/internal/repo/katalog.go\" />",
  "Tes Go `TestSinkronKunciSamaBersamaanSekali` mengirim «nKunci» operasi dengan kunci yang sama serentak: «nKunciBaru» diterapkan, «nKunciUlang» dikenali sebagai ulangan, dan versi naik sekali. Server yang mati di tengah tidak meninggalkan kunci tanpa efek atau efek tanpa kunci. Itu dibaca dari kode dan sifat transaction, dan tidak direkam. Jalur Idempotency-Key di bayar tidak sama: kerja dan penyimpanan responsnya bukan satu transaction.",
  "**Kunci tetap dibutuhkan walau ada versi.** Tanpa kunci, kiriman ulang operasi yang sudah diterapkan dijawab 409, karena operasi itu sendiri sudah menaikkan versi. Ani akan melihat layar konflik untuk perubahannya sendiri. Kunci membuat server menjawab `ulang: true`, dan itu dibaca dari `TerapkanOperasi`, tidak direkam.",
  "**Tujuh hari lawan empat belas hari.** Operasi diterima bila umurnya paling lama «hariQueue» hari, dan baris kuncinya dibuang job `-bersih` bila lebih tua dari «hariKunci» hari. Keduanya dihitung dari timestamp `dibuat_di_hp`, jadi baris kunci masih ada selama operasinya masih bisa dikirim. Angka «hariQueue» dan «hariKunci» hari adalah pilihan naskah (Asumsi), dan batas «hariKunci» hari persisnya dibaca dari kode.",
  "| Titik uji | Hasil | Sumber |\n|---|---|---|\n| Sesudah «jamOffline» jam, job `-bersih` dijalankan | «dibuang0» operasi dibuang, kiriman ulang dikenali | `sinkron14.txt` bagian A |\n| Umur operasi «umurOk» | Diterima | `sinkron14.txt` bagian B |\n| Umur operasi «umurTolak» | Ditolak 422, tidak ada baris dicatat | `sinkron14.txt` bagian B |\n| Sesudah «hari15» hari, job `-bersih` dijalankan | «dibuang» operasi dibuang | `sinkron14.txt` bagian D |\n| Operasi «hari15» hari dikirim | Ditolak 422 karena umurnya, bukan karena kuncinya | `sinkron14.txt` bagian D |",
  "Rekaman melompat ke «jamOffline» jam dan «hari15» hari, jadi titik «hariKunci» hari persisnya tidak terekam. Timestamp itu datang dari jam HP. Server menolak timestamp yang lebih dari sehari di depan jam server, karena barisnya tidak akan pernah dibersihkan (`TestSinkronBatasUmurQueue`, tidak direkam). Timestamp itu hanya membatasi umur, dan versi yang menentukan siapa menang.",
  "**Respons tersimpan adalah foto lama.** Jalur Idempotency-Key menjawab ulangan dengan respons yang disimpan. Di `m24.txt` bagian C, ulangan «jam17» jam dijawab `stok 0, versi 2`, padahal database sudah menyimpan stok 50 dan versi 3. Jalur sinkron berbeda: jawaban `ulang: true` membawa keadaan terkini, yaitu stok 30 dan versi 3 di `versi.txt` bagian C.",
  "**Versi naik pada setiap penjualan.** Pesanan mengurangi stok dengan `stok = stok - $2, versi = versi + 1` (`katalog.go`). Di `kunci24.txt` bagian E, nasi goreng berversi 3 sesudah dua pesanan, jadi operasi offline untuk menu yang laku di antaranya mendapat 409. Lab tidak merekam sinkron bersama penjualan, jadi seberapa sering itu terjadi di warung ramai Tidak dijalankan.",
  "**Selisih atau nilai akhir.** Nilai akhir seperti `stok = 0` hanya benar bila keadaan yang Ani lihat masih berlaku, jadi butuh versi. Selisih seperti \"tambah 10\" bisa digabung dalam urutan apa pun. Firestore menunjuk `FieldValue.increment()` untuk mengubah angka tanpa transaction ([Firestore: Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions), komentar kode, dibuka 2026-10-27).",
  "Ani mencatat \"habis\", yaitu nilai yang ia ketahui, jadi stok memakai nilai akhir. Database menjaga stok tidak negatif dengan `CHECK (stok >= 0)`.",
  "**Jalur uang tetap tertutup.** `/sinkron` menolak bayar, transfer, dan topup dengan 422 (`sinkron14.txt` bagian E). Alasannya ada di `kunci24.txt` bagian E: tiga permintaan yang sudah diterapkan hari Jumat dan Sabtu dikerjakan lagi hari Senin, karena kuncinya sudah kedaluwarsa. Riwayat Budi mendapat tiga jurnal baru: «rp1», «rp2», dan «rp3», jumlahnya «rpTotal» (Hitungan).",
  "### Di stack lain",
  "**Skenario:** HP warung menyimpan perubahan stok saat offline dan mengirimnya sesudah sinyal kembali. Yang ditanyakan: apa yang disediakan stack itu untuk queue, sinkron, dan konflik, dan apa yang tidak ditulis dokumentasinya.",
  "Tidak ada tab yang dijalankan: lab memerankan HP dengan curl. Semua tab dicek ke dokumentasi pada 2026-10-27. Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.",
  "<TabSet id=\"stack-mobile\" labels={[\"Flutter\", \"Android\", \"iOS\", \"React Native\", \"Firestore\", \"Dart (Serverpod)\"]}>\n<Fragment slot=\"t0\">",
  "*Tidak dijalankan. Dicek ke [Flutter: Offline-first support](https://docs.flutter.dev/app-architecture/design-patterns/offline-first), dokumentasi Flutter 3.47, dan [drift](https://pub.dev/packages/drift) 2.35.3, dibuka 2026-10-27. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"dart\" code={`class AntrianOperasi extends Table {\n  TextColumn get kunci => text()();\n  IntColumn get produkId => integer()();\n  IntColumn get nilai => integer()();\n  IntColumn get versiDasar => integer()();\n  DateTimeColumn get dibuatDiHp => dateTime()();",
  "  @override\n  Set<Column> get primaryKey => {kunci};\n}`} />",
  "**Yang berbeda di stack ini:** dokumentasi Flutter memberi pola `synchronized` dan empat cara menyinkronkan, tetapi kata conflict dan versioning tidak ada di halaman itu. Kunci dan versi dasar di tabel kamu tulis sendiri.",
  "Di pub.dev, drift adalah library untuk menyimpan data relasional, sembast dan isar 3.1.0+1 adalah database NoSQL, dan hive 2.2.3 adalah database key-value. Rilis terbaru isar bertanggal 2023-04-25 dan hive 2022-06-30, sedangkan hive_ce 2.22.0 melanjutkan Hive. Deskripsi kelimanya tidak menyebut sinkron ke server.",
  "</Fragment>\n<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke [Android: Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first), Last updated 2026-10-14 UTC, dibuka 2026-10-27. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"kotlin\" code={`val syarat = Constraints.Builder()\n    .setRequiredNetworkType(NetworkType.CONNECTED)\n    .build()\nval kerja = OneTimeWorkRequestBuilder<SinkronWorker>()\n    .setConstraints(syarat)\n    .build()\nWorkManager.getInstance(context)\n    .enqueueUniqueWork(\"sinkron-stok\", ExistingWorkPolicy.KEEP, kerja)`} />",
  "**Yang berbeda di stack ini:** dokumentasi memakai Room sebagai contoh penyimpanan lokal dan WorkManager sebagai pengosong queue. Worker yang mengembalikan `Result.retry()` diulang dengan exponential backoff. Dokumentasi menulis bahwa penyelesaian konflik sering butuh versioning, dan menyebut last write wins dengan timestamp dari perangkat sebagai pendekatan yang umum untuk app mobile. Itu opsi B di ADR 29, bukan pilihannya.",
  "</Fragment>\n<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke dokumentasi Apple [NSMergePolicy](https://developer.apple.com/documentation/coredata/nsmergepolicy), [Mirroring a Core Data store with CloudKit](https://developer.apple.com/documentation/coredata/mirroring-a-core-data-store-with-cloudkit), dan [ModelConfiguration](https://developer.apple.com/documentation/swiftdata/modelconfiguration), halaman tanpa nomor versi, dibuka 2026-10-27.*",
  "**Yang berbeda di stack ini:** konflik antara store dan versi di memori diselesaikan `NSMergePolicy`. Kebijakan bawaannya `error`: bila konflik terjadi, simpan gagal. Kebijakan `mergeByPropertyObjectTrump` memenangkan perubahan di memori per properti, dan `overwrite` menyimpan seluruh objek di memori. Dua kebijakan terakhir condong ke last write wins.",
  "Sinkron ke CloudKit memakai `NSPersistentCloudKitContainer`, dan CloudKit tidak mendukung unique constraint, atribut tak terdefinisi, atau relationship wajib. Halaman Apple yang dibuka tidak menulis cara CloudKit menyelesaikan konflik antar perangkat [perlu verifikasi]. Di SwiftData, `ModelConfiguration` punya opsi `cloudKitDatabase`.",
  "</Fragment>\n<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [WatermelonDB: Synchronization](https://watermelondb.dev/docs/Sync/Intro) dan [WatermelonDB: Backend](https://watermelondb.dev/docs/Sync/Backend), paket @nozbe/watermelondb 0.28.0 (npm, 2025-04-07), dibuka 2026-10-27.*",
  "**Yang berbeda di stack ini:** WatermelonDB hanya database lokal, dan sinkronnya butuh dua endpoint backend yang kamu sediakan. Aturan push-nya mirip versi dasar. Bila record berubah di server sesudah `lastPulledAt`, endpoint harus membatalkan push dan mengembalikan galat. Frontend lalu memanggil pull lagi untuk menyelesaikan konflik.",
  "Bedanya, pembandingnya waktu pull terakhir client, bukan versi per baris. Dokumentasi juga melarang memakai `created_at` buatan client untuk membedakan record baru dari record yang diubah, karena timestamp lokal tidak bisa dipercaya.",
  "</Fragment>\n<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Dicek ke [Firestore: Access data offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline) dan [Firestore: Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions), halaman tanpa nomor versi, dibuka 2026-10-27.*",
  "**Yang berbeda di stack ini:** persistence offline aktif secara bawaan di Android dan Apple, dan nonaktif di web. Tulis offline diantrekan sampai jaringan aktif. Untuk beberapa perubahan pada satu dokumen, dokumentasi menulis last write wins, yaitu opsi B di ADR 29 tanpa pilihan lain. Transaction gagal saat client offline, jadi pembacaan lalu penulisan bersyarat di HP tidak bisa memakai transaction.",
  "</Fragment>\n<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke [Serverpod: Client-side database](https://docs.serverpod.dev/concepts/data-and-the-database/database/client-side-database), halaman bertanda versi dokumentasi 4.0.0, rilis terbaru di pub.dev 4.0.4, dibuka 2026-10-27.*",
  "**Yang berbeda di stack ini:** basis data di sisi client berbentuk SQLite di perangkat, dan tabel `database: sync` disinkronkan modul `serverpod_offline_sync`. Halaman itu memberi peringatan bahwa sinkron offline masih eksperimental dan belum siap produksi. Modulnya menggabungkan perubahan offline dan menyelesaikan konflik sendiri, dan halaman tidak menulis strateginya. Karena strategi konfliknya tidak terbaca, ADR 29 tidak bisa bersandar padanya.",
  "</Fragment>\n</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 29: offline hanya stok dan harga, operasi bersyarat versi, kunci sinkron «hariKunci» hari",
  "**Kebutuhan.** PRD v3 meminta warung mengubah stok dan harga tanpa sinyal ([[t3-prd]]). Akhir pekan warung «jamOffline» jam (Asumsi) lebih panjang daripada umur Idempotency-Key «jamKunci» jam ([[t2-idempotency]]). M24 merekam akibatnya: stok 30 dari Sabtu menjadi 0 hari Senin, dengan jawaban 200 ([[t3-m24]]).",
  "**Status:** diterima sesudah M24 (minggu 7), memakai kolom `versi` di tabel `produk` dan tabel `operasi_sinkron` ([[t3-skema]]). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR.",
  "| | A. Key semua endpoint «hariOpsiA» hari | B. Last-write-wins dengan waktu HP | C. CRDT | D. Queue pembayaran offline | E. Versi, kunci sinkron «hariKunci» hari, hanya stok dan harga |\n|---|---|---|---|---|---|\n| Cara kerja | Umur semua Idempotency-Key naik dari «jamKunci» jam ke «hariOpsiA» hari, termasuk bayar, transfer, dan stok, tanpa versi | Tiap operasi membawa waktu HP. Server menyimpan nilai dari operasi yang waktunya paling baru | Tiap perubahan disimpan sebagai tipe data yang bisa digabung otomatis, misalnya counter untuk stok | HP menyimpan pembayaran bersama key saat offline dan mengirimnya sesudah online | Stok dan harga bersyarat versi. Kunci sinkron «hariKunci» hari, queue paling lama «hariQueue» hari. Pembayaran tidak pernah offline |\n| Kelebihan | Satu angka berubah. Kiriman ulang «jamOffline» jam dikenali dan tidak dikerjakan lagi | Tidak ada layar konflik dan tidak ada kolom versi | Tidak ada konflik yang harus dipilih user | Warung bisa menerima pembayaran tanpa sinyal | Operasi usang ditolak dengan keadaan terkini, kiriman ulang dikenali, dan jam HP tidak menentukan pemenang |\n| Kekurangan | Operasi yang belum pernah sampai tidak punya kunci di server, jadi tanpa versi tidak ada yang menolaknya. Tebingnya pindah ke hari ke-«hariOpsiA1» | Pemenangnya ditentukan jam HP. Dua perubahan sah yang serentak: satu hilang tanpa tanda | Stok tidak boleh negatif, dan penyimpanan eventually consistent tidak bisa menegakkan invarian numerik tanpa tipe khusus | Pembayaran bergantung pada saldo dan stok yang tidak bisa diperiksa offline, dan bisa ditolak sesudah pembeli pergi | Butuh layar konflik di app dan kolom versi. Versi naik pada tiap penjualan, jadi menu yang laku lebih sering mendapat 409 |\n| Biaya operasional | Ketentuan ADR 14 berubah untuk semua endpoint, bukan hanya stok | Server tidak punya cara mendeteksi jam HP yang salah selain batas kasar | Tipe data, library, dan skema baru di app dan server untuk dua perangkat milik satu pemilik | Layar status tertunda, aturan batal, dan rekonsiliasi untuk pembayaran yang ditolak | Satu kolom, satu tabel, job `-bersih`, dan layar konflik |\n| Bukti | Tidak direkam. Mutasi di README lab: umur key «hariOpsiA» hari membuat ulangan «jamOffline» jam dikenali. `versi.txt` bagian C: key tidak mengenali operasi yang belum pernah sampai | Tidak dijalankan. Dokumentasi Android menyebutnya umum, dan dokumentasi WatermelonDB menulis timestamp lokal tidak bisa dipercaya | Tidak dijalankan. Preguiça (2018) dan Balegas dkk. (2015) | `kunci24.txt` bagian E: tiga jurnal baru «rpTotal». Queue pembayaran sendiri Tidak dijalankan | Rekaman lab `versi.txt`, `sinkron14.txt`, `m24.txt`, dan `kunci24.txt`. App Flutter Tidak dijalankan |",
  "**Keputusan: opsi E.** Tujuh aturan:",
  "1. Hanya stok dan harga yang lewat `POST /sinkron`. Jenis bayar, transfer, dan topup ditolak 422 apa pun isinya, dan pembayaran tidak pernah offline (`sinkron14.txt` bagian E).\n2. Perubahan stok dan harga bersyarat versi: `UPDATE ... WHERE versi = ...` menaikkan versi satu. Versi yang berbeda tidak mengubah apa pun dan dijawab 409 dengan keadaan terkini, di `PATCH /produk/{id}` dan `POST /sinkron` (`versi.txt` bagian B dan C).\n3. HP membuat kunci operasi saat Ani mengubah data, bukan saat mengirim, dan memakai kunci yang sama di setiap pengiriman ulang. Kunci berupa UUID acak. Lab memakai string tetap supaya rekaman identik, dan perilaku app Tidak dijalankan.\n4. Kunci sinkron hidup «hariKunci» hari dan queue paling lama «hariQueue» hari, keduanya dihitung dari `dibuat_di_hp` (pilihan naskah, Asumsi). Timestamp lebih dari sehari di depan jam server ditolak.\n5. Jawaban 409 membawa `sekarang`, dan app menawarkan dua pilihan. Pilihan pertama memakai angka server dan membuang operasi dari queue lokal. Pilihan kedua mengirim operasi baru dengan kunci baru dan versi dasar dari `sekarang` (`versi.txt` bagian D). Layar konflik Tidak dijalankan.\n6. Sesudah jawaban ulangan dari jalur Idempotency-Key, app membaca keadaan terbaru, karena respons tersimpan adalah foto lama (`m24.txt` bagian C).\n7. Umur Idempotency-Key di bayar, transfer, dan pesanan tetap «jamKunci» jam dan tetap opsional (ADR 14). App 1.0 dan 1.1 tanpa key tetap rentan M10 (`kunci24.txt` bagian A).",
  "**Kenapa E, bukan A sampai D.**",
  "- **A ditolak** karena key hanya mengenali kiriman yang sudah pernah sampai. Operasi bakso belum pernah sampai, dan hanya versi yang menolaknya (`versi.txt` bagian C). Umur «hariOpsiA» hari juga hanya memindahkan tebingnya ke hari ke-«hariOpsiA1».\n- **B ditolak** karena pemenangnya ditentukan jam HP, dan dua perubahan sah yang serentak berakhir dengan satu yang hilang tanpa tanda. Jam yang benar memang membuat operasi Jumat kalah dari isian Sabtu. Itu penalaran dan tidak direkam.\n- **C ditolak** karena stok punya batas bawah, dan ongkos tipe data baru terlalu besar untuk dua perangkat milik satu pemilik. Itu alasan penulis, bukan hasil ukur.\n- **D ditolak** karena `kunci24.txt` bagian E menunjukkan harganya, dan PRD v3 mengeluarkan pembayaran offline dari lingkup.",
  "CRDT adalah pendekatan untuk menggabung update konkuren pada replika yang boleh berbeda sementara ([Preguiça: Conflict-free Replicated Data Types, an overview](https://arxiv.org/abs/1806.10254), 2018-06-27, dibuka 2026-10-27). Balegas dkk. menulis bahwa penyimpanan eventually consistent tidak mampu menegakkan invarian numerik di semua replika ([Balegas dkk.: Enforcing Numeric Invariants](https://arxiv.org/abs/1503.09052), 2015-03-31, dibuka 2026-10-27). Mereka mengusulkan bounded counter sebagai tipe data baru.",
  "**Kasus industri: Figma.** Figma menghadapi pertanyaan serupa untuk dokumen desain. Artikel engineering itu menulis bahwa user boleh offline selama waktu sembarang. Sesudah online, client mengunduh salinan dokumen baru dan menerapkan ulang suntingan offline di atasnya (Evan Wallace, [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/), 2019-10-16, dibuka 2026-10-27).",
  "Bila dua client mengubah properti yang sama, dokumen berakhir dengan nilai terakhir yang dikirim ke server, dan server yang menentukan urutannya tanpa timestamp. Figma tidak memakai CRDT murni, karena CRDT dibuat untuk sistem tanpa otoritas pusat dan server Figma adalah otoritas pusat. Suntingan serentak pada satu nilai teks berakhir sebagai salah satunya, dan Figma menerimanya karena alat desain bukan editor teks.",
  "Batasnya: satu produk desain kolaboratif, tanpa angka, tanpa invarian seperti stok tidak negatif, dan artikelnya tidak menyebut berapa lama offline yang diuji.",
  "Bagi Rekeningo, kasus ini memperlihatkan dua bentuk last-write-wins. Dengan urutan kedatangan di server, operasi Senin menang atas isian Sabtu, dan itu persis M24. Opsi B memakai waktu HP, yang memperbaiki urutan itu hanya bila jam HP benar. Artikel Figma menerima hasil itu karena alat desain bukan editor teks, sedangkan stok dibaca pembeli sebagai kenyataan (penilaian penulis halaman ini).",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Layar konflik muncul terlalu sering, karena versi naik pada tiap penjualan (`katalog.go`; `kunci24.txt` bagian E). Ani yang terbiasa menekan \"pakai angka server\" tanpa membaca bisa membuang catatan habis yang benar. Lab tidak merekam sinkron bersama penjualan. Pencegahannya mengukur frekuensi 409 sebelum rilis, dan memisahkan versi stok dari versi harga bila tinggi.\n2. HP offline lebih dari «hariQueue» hari, misalnya cuti panjang. Semua operasinya ditolak 422 dengan pesan lebih dari «hariQueue» hari di queue (`sinkron14.txt` bagian B dan D), dan Ani mengetik ulang. Angka «hariQueue» hari adalah pilihan naskah. Pencegahannya app menampilkan umur operasi tertua dan peringatan sebelum hari ke-«hariQueue».\n3. Kunci bertabrakan. Kunci utama `operasi_sinkron` berlaku untuk semua akun, jadi akun lain dengan kunci yang sama mendapat 422 (`sinkron14.txt` bagian C). Dua POST bersamaan dengan kunci sama untuk produk berbeda berakhir di unique violation 500, dibaca dari kode dan Tidak dijalankan. Pencegahannya UUID acak dari HP dan kunci per perangkat.",
  "**Kapan keputusan ini salah.**",
  "- Saat warung perlu menerima pembayaran tanpa sinyal. Opsi D kembali, dengan umur key yang lebih panjang daripada umur queue pembayaran.\n- Saat banyak perangkat sering mengubah baris yang sama, atau 409 di menu yang laku menjadi biasa. Stok pindah ke selisih yang digabung, dan harga tetap bersyarat versi.\n- Saat server mati di antara COMMIT dan penyimpanan respons di jalur Idempotency-Key. Ulangan dijawab 409, jadi uang berpindah paling banyak sekali selama key berlaku. Tetapi 5xx dari COMMIT yang hasilnya tidak diketahui melepas key, dan ulangannya bisa menggandakan. Itu dibaca dari kode api-t3 dan Tidak dijalankan. Rancangan e3-idempotency menutup keduanya.",
  "**Yang akan merevisinya.** ADR 33 mencatat pembayaran offline sebagai yang sengaja belum dilakukan ([[t3-adr-33]]).",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |\n|---|---|---|\n| Pembayaran offline | Pembayaran memakai saldo dan stok yang tidak bisa diperiksa offline, dan PRD v3 mengeluarkannya dari lingkup | [[t3-adr-33]] |\n| Kunci sinkron per perangkat | Kunci utama `operasi_sinkron` berlaku untuk semua akun. Akun lain mendapat 422 yang membuka bahwa kunci itu sudah dipakai | Belum dijadwalkan |\n| Sinkron menghapus entri cache katalog | `TerapkanOperasi` tidak menghapus entri cache, dan hanya `PATCH /produk/{id}` yang menghapus. TTL cache membatasi basinya. Dibaca dari kode dan Tidak dijalankan | [[t3-cache]] |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** Operasi bakso belum pernah sampai dan tiba hari Senin. Apa yang menolaknya, kunci atau versi, dan apa isi jawabannya?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Versi. Kuncinya tidak dikenal server, tetapi versi dasar 1 sudah lewat karena dasbor mengisi bakso hari Sabtu. Jawabannya 409 dengan stok 30 dan versi 2, dan tidak ada yang berubah (`versi.txt` bagian C).",
  "</details>",
  "**2.** Kenapa queue di HP paling lama «hariQueue» hari, padahal kunci sinkron hidup «hariKunci» hari?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Keduanya dihitung dari `dibuat_di_hp`. Operasi diterima sampai umur «hariQueue» hari dan barisnya dibuang sesudah «hariKunci» hari, jadi kunci masih ada selama operasi itu masih bisa dikirim. Di `sinkron14.txt` bagian D, kunci «hari15» hari sudah dibuang dan operasinya ditolak karena umurnya, bukan karena kuncinya.",
  "</details>",
  "**3.** Pembayaran dikirim ulang dengan key yang sama «jamOffline» jam kemudian. Kenapa pembayaran tidak boleh lewat sinkron?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Key sudah lewat «jamKunci» jam, jadi server mengerjakan ulangan itu sebagai pembayaran baru. Di `kunci24.txt` bagian E, tiga permintaan dari hari Jumat dan Sabtu dikerjakan lagi hari Senin. Riwayat Budi mendapat tiga jurnal baru: «rp1», «rp2», dan «rp3». `/sinkron` menolak bayar, transfer, dan topup dengan 422.",
  "</details>",
  "**4.** HP mengirim ulang dengan key yang sama «jam17» jam sesudah Jumat, dan server menjawab stok 0 dan versi 2. Kenapa app tidak boleh menampilkan angka itu?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Jawaban itu respons yang tersimpan sejak Jumat. Database sudah menyimpan stok 50 dan versi 3 (`m24.txt` bagian C). App membaca keadaan terbaru sesudah jawaban ulangan.",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] Operasi di queue membawa kunci yang dibuat saat perubahan terjadi dan versi dasar yang Ani lihat. Kunci yang sama dipakai di setiap pengiriman ulang.\n- [ ] Server menolak versi yang berbeda dengan 409 dan keadaan terkini, bukan menimpa dan bukan membuang diam-diam.\n- [ ] Umur queue lebih pendek daripada umur kunci, dan keduanya dihitung dari timestamp yang sama.\n- [ ] Pembayaran, transfer, dan topup tidak masuk queue offline.\n- [ ] Waktu HP tidak dipakai untuk menentukan pemenang.\n- [ ] App membaca keadaan terbaru sesudah jawaban ulangan yang berasal dari respons tersimpan.",
  "### Bacaan lanjut",
  "- [Android: Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first)\n- [Flutter: Offline-first support](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)\n- [Figma: How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) (2019-10-16)\n- [WatermelonDB: Backend](https://watermelondb.dev/docs/Sync/Backend)\n- [Preguiça: Conflict-free Replicated Data Types, an overview](https://arxiv.org/abs/1806.10254) (2018)\n- [Balegas dkk.: Enforcing Numeric Invariants](https://arxiv.org/abs/1503.09052) (2015)",
  "</Blok>",
];

const unitHalaman = halaman.trim().split(/\n{2,}/);
const metodeGo = (kode: string, penerima: string, nama: string): string => {
  const a = kode.search(new RegExp(String.raw`func \(\w+ ${penerima}\) ${nama}\(`));
  if (a < 0) throw new Error(`kode: metode ${penerima}.${nama} tidak ada`);
  const b = kode.indexOf("\nfunc ", a + 1);
  return kode.slice(a, b < 0 ? undefined : b);
};
const handlerT3 = baca("labs/api-t3/internal/handler/handler_t3.go");
const barisKatalog = katalogRepo.split("\n");
const nomorBaris = (pola: RegExp): number => {
  const i = barisKatalog.findIndex((b) => pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const awalSinkron = nomorBaris(/^\t\tvar ada OperasiSinkron$/);
const akhirSinkron = nomorBaris(/o\.DibuatHP\); err != nil \{$/) + 2;
const snippetBerkas = [...halaman.matchAll(/<Snippet file="([^"]+)"(?: region="([^"]+)")?(?: lines="(\d+):(\d+)")? /g)].map((m) => ({
  file: m[1]!, region: m[2], a: m[3] ? Number(m[3]) : undefined, b: m[4] ? Number(m[4]) : undefined,
}));

// ---- nilai turunan dari rekaman: jawaban per bagian ----
const sotoC = vC[0]!.badan;
const baksoC = vC[1]!;
const versiDasarBakso = Number(cari(/"produk_id": \d+, "jenis": "stok", "nilai": 0, "versi_dasar": (\d+),/, bagian(VS, "C").filter((b) => b.includes("ani-hp1-0302")), "versi dasar bakso")[1]);
const stokIsiBakso = Number(cari(/^# Bakso juga diisi (\d+) porsi lewat dasbor/, bagian(VS, "B"), "bakso diisi")[1]);
const sebelumD = cari(/^ 61 +\| Ayam geprek +\| (\d+) +\| (\d+)$/, bagian(M, "D"), "m24 D sebelum");
const dbC = cari(/^ 1 +\| Nasi goreng +\| (\d+) +\| (\d+)$/, bagian(M, "C"), "m24 C database");
const nasiE = cari(/^ 1 +\| Nasi goreng +\| (\d+) +\| (\d+)$/, kE, "kunci24 E nasi");
const jumlahPesananE = kE.filter((b) => /\| bayar +\| Bayar Budi ke warung: 1 Nasi goreng +\|/.test(b)).length;
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];

describe("halaman 3.21: isi dikunci unit demi unit, nilai diturunkan dari sumber", () => {
  test("frontmatter, meta, registry, dan naskah", () => {
    const h = (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string; adr?: number[]; topik?: string }[]).find((x) => x.id === "t3-offline")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran, h.path, h.adr, h.topik]).toEqual(["3.21", "konsep", 4, undefined, ["t3-offline"], ["t3-m24"], ["mobile", "backend"], "tahap-3/offline-first.md", [29], "Khusus app mobile"]);
    expect(h.judul).toBe("Offline-first dan sinkron + ADR 29");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(frontmatter).toContain(
      "description: Operasi di queue HP warung membawa kunci dan versi, jadi server mengenali kiriman ulang dan menolak operasi yang sudah usang. ADR 29 menimbang empat cara lain dan menulis kapan pilihan ini salah.",
    );
    expect(naskah).toContain("| 3.21 | 4 | Offline-first dan sinkron + ADR 29 | Konsep + ADR |  | t3-offline | tebak |");
    const adr29 = naskah.split("\n").find((b) => b.startsWith("| 29 | Offline hanya stok dan harga"))!;
    expect(adr29).toContain(`key sinkron ${hariKunci} hari`);
    expect(adr29).toContain(`queue paling lama ${hariQueue} hari`);
    expect(adr29).toContain("pembayaran tidak offline");
    expect(naskah).toContain(`HP Ani lalu offline sampai Senin 07.00 (${jamOffline} jam, Asumsi`);
    expect(adr29).toContain(`| Key semua endpoint ${hariOpsiA} hari; last-write-wins dengan cap waktu HP; CRDT; queue pembayaran offline |`);
    const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m24\]\]<\/p>$/m)!;
    expect(meta).not.toBeNull();
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(Number(meta[2])).toBe(3);
    expect(halaman).not.toContain("Jalur inti");
    const isiProsa = halaman.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isiProsa.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(meta[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("EXPECT: semua unit halaman sama dengan yang diturunkan dari sumber, urutan dan isinya", () => {
    expect(unitHalaman).toEqual(EXPECT.map(isi));
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca; tanpa kita, Anda, tanda seru, emoji", () => {
    const tampil = halaman + JSON.stringify(rantaiMentah) + JSON.stringify(tebakMentah);
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/\bPR ?#?\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    const tanpaKode = halaman.replace(/code=\{`[\s\S]*?`\}/g, "");
    expect(tanpaKode).not.toMatch(/\bkita\b|\bAnda\b|!|\p{Extended_Pictographic}/u);
  });
  test("kalimat utama dipasangkan dengan nilai rekaman, bukan hanya dikunci sebagai teks", () => {
    const stokSabtu = Number(sebelumD[1]);
    const tampilkan = (kalimat: string) => expect(halaman, kalimat).toContain(kalimat);
    tampilkan(`Operasi soto dikirim ulang dengan kunci yang sama dan dikenali: jawabannya \`ulang: ${sotoC.ulang}\`, dan stok ${sotoC.sekarang.stok} dari hari Sabtu utuh.`);
    tampilkan(`Operasi bakso belum pernah sampai, jadi kuncinya tidak dikenal, tetapi versi dasar ${versiDasarBakso} sudah lewat.`);
    tampilkan(`Server menjawab ${baksoC.kode} dengan stok ${baksoC.badan.sekarang.stok} dan versi ${baksoC.badan.sekarang.versi}, dan tidak mengubah apa pun.`);
    tampilkan(`Di \`m24.txt\` bagian D, kunci sudah kedaluwarsa sesudah ${jamKunci} jam, jadi \`stok = 0\` diterapkan di atas stok ${stokSabtu} dan jawabannya ${mD[0]!.kode}.`);
    tampilkan(`ulangan ${jam17} jam dijawab \`stok ${mC[0]!.badan.stok}, versi ${mC[0]!.badan.versi}\`, padahal database sudah menyimpan stok ${dbC[1]} dan versi ${dbC[2]}.`);
    tampilkan(`\`versi.txt\` bagian A merekamnya: jawaban ${vA.at(-1)!.kode}, status \`${vA.at(-1)!.badan.status}\`, stok ${vA.at(-1)!.badan.sekarang.stok} dan versi ${vA.at(-1)!.badan.sekarang.versi}.`);
    const dasbor = vB.find((j) => j.kode === 409)!;
    tampilkan(`Hasilnya ${dasbor.kode} dan stok ${dasbor.badan.sekarang.stok} utuh (\`versi.txt\` bagian B).`);
    tampilkan(`jawaban \`ulang: true\` membawa keadaan terkini, yaitu stok ${sotoC.sekarang.stok} dan versi ${sotoC.sekarang.versi} di \`versi.txt\` bagian C.`);
    tampilkan(`nasi goreng berversi ${nasiE[2]} sesudah ${KATA[jumlahPesananE]} pesanan`);
    tampilkan(`Riwayat Budi mendapat ${KATA[jurnalBaru.length]} jurnal baru: ${rp(jurnalBaru[0]!.jumlah)}, ${rp(jurnalBaru[1]!.jumlah)}, dan ${rp(jurnalBaru[2]!.jumlah)}`);
    tampilkan(`Versi dasarnya masih sama dengan versi di server, jadi server menerapkannya.`);
    expect(stokIsiBakso).toBe(Number(sotoC.sekarang.stok));
  });
});

describe("rekaman m24, versi, kunci24, dan sinkron14: angka di halaman", () => {
  test("m24.txt: stok 0 Jumat, 30 Sabtu, ulangan 17 jam dijawab foto lama, ulangan 62 jam menimpa tanpa versi", () => {
    expect(mA[0]).toMatchObject({ kode: 200, badan: { stok: 0, versi: 2 } });
    expect(mB[0]).toMatchObject({ kode: 200, badan: { stok: 30, versi: 3 } });
    expect(mC[0]).toMatchObject({ kode: 200, badan: { stok: 0, versi: 2 } });
    expect([dbC[1], dbC[2]]).toEqual(["50", "3"]);
    expect(mD[0]).toMatchObject({ kode: 200, badan: { stok: 0, versi: 4 } });
    expect([sebelumD[1], sebelumD[2]]).toEqual(["30", "3"]);
    expect([jamOffline, jam17, jamKunci]).toEqual([62, 17, 24]);
    expect(judulBagian(m24Txt, "A")).toContain("operasi sampai ke server, jawabannya hilang di jalan");
    expect(bagian(M, "A").join("\n")).toContain("-H 'Idempotency-Key: \"00000000-0000-4000-8000-000000000011\"' -d '{\"stok\": 0}'");
    expect(bagian(M, "D").join("\n")).toContain("# 62 jam > 24 jam: baris key sudah lewat masa berlaku, server memperlakukannya belum pernah ada. 'stok = 0' diterapkan lagi, TANPA memeriksa versi, di atas stok 30 dari Sabtu");
    expect(bagian(M, "C").join("\n")).toContain("Key masih dikenali (17 jam < 24 jam): server menjawab dengan respons yang tersimpan (keadaan saat Jumat), stok 50 dan versi 3 tidak berubah");
    expect(m24Txt).toContain("# server: ./api-t3 -lab -jam-lab -rentan stok-timpa");
    expect(runLab).toContain('mulai_api("stok-timpa")');
  });
  test("versi.txt: soto dikenali, bakso 409 dengan keadaan terkini, dasbor basi 409, pilihan Ani operasi baru", () => {
    expect(vA.at(-1)).toMatchObject({ kode: 200, badan: { status: "diterapkan", ulang: false, sekarang: { stok: 0, versi: 2 } } });
    expect(vB[0]).toMatchObject({ kode: 200, badan: { stok: 30, versi: 3 } });
    expect(bagian(VS, "B").join("\n")).toContain("-d '{\"stok\": 10, \"versi\": 2}'");
    expect(vB.find((j) => j.kode === 409)!.badan).toMatchObject({ type: "/problems/versi-berbeda", status: 409, sekarang: { stok: 30, versi: 3 } });
    expect(vC[0]).toMatchObject({ kode: 200, badan: { status: "diterapkan", ulang: true, sekarang: { stok: 30, versi: 3 } } });
    expect(vC[1]).toMatchObject({ kode: 409, badan: { status: "konflik", ulang: false, sekarang: { stok: 30, versi: 2 } } });
    expect(versiDasarBakso).toBe(1);
    expect(bagian(VS, "C").join("\n")).toMatch(/ani-hp1-0302 +\| stok +\| 0 +\| 1 +\| konflik +\| f/);
    expect(vD.at(-1)).toMatchObject({ kode: 200, badan: { status: "diterapkan", sekarang: { stok: 0, versi: 3 } } });
    expect(bagian(VS, "D").join("\n")).toContain('"versi_dasar": 2');
    expect(judulBagian(versiTxt, "C")).toContain("62 jam");
  });
  test("sinkron14.txt: kunci 62 jam dikenali, queue 6 hari 23 jam diterima dan 7 hari 1 jam ditolak, 15 hari dibuang, pembayaran ditolak", () => {
    expect(dibuang0).toBe(0);
    expect(dibuang).toBe(2);
    expect(bagian(S, "A").join("\n")).toMatch(/"status":"diterapkan","ulang":true/);
    expect(hari15).toBe(15);
    expect(hari15).toBeGreaterThan(hariKunci);
    expect(umurOk).toBe("6 hari 23 jam");
    expect(umurTolak).toBe("7 hari 1 jam");
    expect(runLab).toContain("6 * 24 + 23");
    expect(runLab).toContain("7 * 24 + 1");
    expect(6 * 24 + 23).toBeLessThan(hariQueue * 24);
    expect(7 * 24 + 1).toBeGreaterThan(hariQueue * 24);
    expect(sB[0]).toMatchObject({ kode: 200, badan: { status: "diterapkan" } });
    expect(sB[1]).toMatchObject({ kode: 422, badan: { errors: [{ field: "dibuat_di_hp", pesan: `lebih dari ${hariQueue} hari di queue: ditolak, ambil keadaan terbaru lalu ubah lagi` }] } });
    expect(bagian(S, "D").join("\n")).toContain("Kunci sudah dibuang, tetapi operasinya lebih tua dari 7 hari: ditolak, tidak diterapkan sebagai operasi baru");
    const c = jawaban(bagian(S, "C"));
    expect(c.map((j) => [j.kode, j.badan.errors[0].field, j.badan.errors[0].pesan])).toEqual([[422, "kunci", "sudah dipakai untuk operasi lain; satu operasi satu kunci"], [422, "kunci", "sudah dipakai untuk operasi lain; satu operasi satu kunci"]]);
    expect(jawaban(bagian(S, "E"))[0]).toMatchObject({ kode: 422, badan: { errors: [{ field: "jenis", pesan: "pembayaran tidak pernah lewat sinkron offline; hanya stok dan harga" }] } });
    expect(bagian(S, "E").join("\n")).toContain("# transfer dan topup ditolak dengan jawaban yang sama (tidak dicetak ulang)");
  });
  test("kunci24.txt: tanpa key dua pembayaran, ulangan 17 jam sama, ulangan 62 jam menambah tiga jurnal", () => {
    expect(jurnalBaru.map((j) => [j.jurnal, j.jumlah])).toEqual([[10006, 28000], [10007, 10000], [10008, 25000]]);
    expect(rp(jurnalBaru.reduce((a, b) => a + b.jumlah, 0))).toBe("Rp63.000");
    expect([nasiE[1], nasiE[2], jumlahPesananE]).toEqual(["48", "3", 2]);
    expect(bagian(K, "A").filter((b) => /^ 1000[12] +\| bayar +\| Bayar Budi ke Warung Ani +\| -28000$/.test(b))).toHaveLength(2);
    expect(jawaban(bagian(K, "D")).map((j) => j.kode)).toEqual([422, 422, 400]);
    expect(bagian(K, "E").join("\n")).toContain("# Pembayaran yang menunggu di HP selama offline 62 jam akan dikerjakan dua kali bila jawaban pertamanya hilang.");
    expect(judulBagian(kunci24Txt, "E")).toContain("62 jam");
    // Tiga permintaan yang dikerjakan lagi hari Senin: transfer diterapkan hari Jumat (bagian B), kiriman dan pesanan hari Sabtu
    // (bagian C). Halaman menulis "hari Jumat dan Sabtu", bukan hanya Sabtu.
    expect(judulBagian(kunci24Txt, "B")).toContain("Jumat 16.50");
    expect(judulBagian(kunci24Txt, "C")).toContain("Sabtu 09.50");
    const kunciPertama = (b: string[]): string[] => b.filter((x) => x.startsWith("$ curl -i -X POST")).map((x) => `${x.match(/-X POST '([^']+)'/)![1]} ${x.match(/Idempotency-Key: "([^"]+)"/)![1]}`);
    expect(kunciPertama(bagian(K, "B"))).toEqual(["/transfers 00000000-0000-4000-8000-000000000001"]);
    expect(kunciPertama(bagian(K, "C"))).toEqual([
      "/transfers 00000000-0000-4000-8000-000000000001",
      "/kiriman 00000000-0000-4000-8000-000000000002",
      "/pesanan 00000000-0000-4000-8000-000000000003",
    ]);
    expect(kunciPertama(bagian(K, "E"))).toEqual(["/transfers 00000000-0000-4000-8000-000000000001"]);
    expect(bagian(K, "E").join("\n")).toContain("# Kiriman dan pesanan dengan key lama juga dikerjakan lagi");
    expect(readmeLab).toContain("| M2 `UmurKunci` 24 jam jadi 7 hari | gagal: `TestKunciKedaluwarsaSesudah24Jam` | gagal `kunci24` E (saldo 166.000, harus 103.000) dan `m24` D |");
  });
});

describe("kode lab: versi, kunci, umur queue, penolakan pembayaran, dan klaim negatif berlingkup", () => {
  test("rentang Snippet diturunkan dari jangkar kode; tanpa ID riset atau nomor PR di dalamnya", () => {
    expect(snippetBerkas).toEqual([
      { file: "labs/api-t3/internal/repo/katalog.go", region: "ubah-produk", a: undefined, b: undefined },
      { file: "labs/api-t3/internal/repo/katalog.go", region: undefined, a: awalSinkron, b: akhirSinkron },
    ]);
    expect(katalogRepo).toContain("// --8<-- [start:ubah-produk]");
    expect(katalogRepo).toContain("// --8<-- [end:ubah-produk]");
    const potongan = barisKatalog.slice(awalSinkron - 1, akhirSinkron).join("\n");
    expect(potongan).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,3}\b|keputusan \d{3,4}/);
    expect(barisKatalog[akhirSinkron - 1]).toBe("\t\t}");
    expect(potongan).toContain("INSERT INTO operasi_sinkron");
  });
  test("UbahProduk: UPDATE bersyarat versi menaikkan versi; versi berbeda tidak mengubah apa pun dan keadaan terkini dikembalikan", () => {
    const u = fungsiGo(katalogRepo.replace("func (r Repo) UbahProduk(", "func UbahProduk("), "UbahProduk");
    expect(u).toContain("WHERE id = $1 AND akun_id = $2 AND versi = $5");
    expect(u).toContain("versi = versi + 1");
    expect(u).toContain("SELECT id, harga, stok, versi FROM produk WHERE id = $1 AND akun_id = $2");
    expect(handlerT3).toContain('if status == "konflik" {\n\t\tkode = http.StatusConflict');
    expect(fungsiGo(tesOffline, "TestUbahProdukBersamaanSatuPemenang")).toContain("UbahProduk(ctx, warung, produk, nil, &stok, 1)");
    expect([nUbah, Number(V.nUbahOk), Number(V.nUbahBeda)]).toEqual([20, 1, 19]);
  });
  test("TerapkanOperasi: satu transaction, produk dikunci, kunci dicari, versi dibandingkan, hasil disimpan; tanpa cabang membuang diam-diam", () => {
    const t = metodeGo(katalogRepo, "Repo", "TerapkanOperasi");
    const urut = ["r.DalamTx(", "FOR UPDATE", "FROM operasi_sinkron WHERE kunci = $1", "return ErrKunciBeda", "ulang = true", "if sekarang.Versi == o.VersiDasar {", 'status = "diterapkan"', 'status = "konflik"', "INSERT INTO operasi_sinkron"];
    let pos = 0;
    for (const u of urut) {
      const i = t.indexOf(u, pos);
      expect(i, u).toBeGreaterThanOrEqual(pos);
      pos = i;
    }
    expect(t.match(/status = "/g)).toHaveLength(2);
    expect(t).toContain("o.Kunci, o.Perangkat, o.Produk, o.Jenis, o.Nilai, o.VersiDasar, status, o.DibuatHP");
    expect([nKunci, Number(V.nKunciBaru), Number(V.nKunciUlang)]).toEqual([10, 1, 9]);
    expect(fungsiGo(tesOffline, "TestSinkronKunciSamaBersamaanSekali")).toContain("versi != 2");
  });
  test("Sinkron: pembayaran ditolak lebih dulu, umur queue dari jam service, jam HP lebih dari sehari di depan ditolak, tanpa menghapus cache", () => {
    const s = metodeGo(katalogSvc, "Service", "Sinkron");
    const urut = ['o.Jenis == "bayar" || o.Jenis == "transfer" || o.Jenis == "topup"', "pembayaran tidak pernah lewat sinkron offline; hanya stok dan harga", "s.kini().Sub(o.DibuatHP) > MaksUmurOperasi", "o.DibuatHP.Sub(s.kini()) > MaksJamSalah", "s.repo.TerapkanOperasi("];
    let pos = 0;
    for (const u of urut) {
      const i = s.indexOf(u, pos);
      expect(i, u).toBeGreaterThanOrEqual(pos);
      pos = i;
    }
    expect([hariQueue, jamSalah, jamKunci, hariKunci]).toEqual([7, 24, 24, 14]);
    expect(hariKunci).toBeGreaterThan(hariQueue);
    expect(s).not.toMatch(/hapusKatalog|ubahProdukDenganCache|s\.kc\b/);
    expect(metodeGo(katalogSvc, "Service", "UbahProduk")).toContain("s.ubahProdukDenganCache(");
    expect(fungsiGo(tesOffline, "TestSinkronBatasUmurQueue")).toContain("kini.Add(MaksJamSalah+time.Hour)");
    expect(katalogSvc).toContain("Retensi operasi sinkron (14 hari) dihitung dari\n// dibuat_di_hp");
  });
  test("-bersih membuang operasi sinkron menurut dibuat_di_hp; kunci utama operasi_sinkron global; jenis hanya stok dan harga; stok tidak negatif", () => {
    expect(katalogRepo).toContain("DELETE FROM operasi_sinkron WHERE dibuat_di_hp < now() - make_interval(secs => $1::double precision)");
    expect(migrasiSinkron).toMatch(/kunci\s+text\s+PRIMARY KEY,/);
    expect(migrasiSinkron).toContain("CHECK (jenis IN ('stok', 'harga'))");
    expect(migrasiProduk).toContain("stok    integer     NOT NULL CHECK (stok >= 0)");
    expect(migrasiProduk).toContain("versi   integer     NOT NULL DEFAULT 1");
    expect(mainGo).toContain("r.BersihkanOperasi(ctx, 14*24*time.Hour)");
  });
  test("penjualan menaikkan versi, endpoint stok lama menimpa tanpa versi, dan Idempotency-Key tidak satu transaction dengan kerjanya", () => {
    expect(katalogRepo).toContain("`UPDATE produk SET stok = stok - $2, versi = versi + 1, diubah = now() WHERE id = $1`");
    expect(katalogRepo).toContain("(pembeli juga mengubah baris)");
    const t = fungsiGo(idempotenRepo.replace("func (r Repo) TimpaStok(", "func TimpaStok("), "TimpaStok");
    expect(t).toContain("WHERE id = $1 AND akun_id = $2 RETURNING id, harga, stok, versi");
    expect(t).not.toMatch(/versi = \$/);
    expect(readmeLab).toContain("Kerja dan penyimpanan respons bukan satu transaction.");
    expect(readmeLab).toContain("Respons 5xx melepas key, termasuk 5xx dari `COMMIT` yang hasilnya tidak diketahui");
    // Klaim "kapan salah" 3 dibaca dari kode handler, bukan hanya dari README: 5xx dan 429 melepas key, key yang masih
    // diproses dijawab 409, dan kerja (next) lebih dulu daripada penyimpanan respons (SelesaiKunci), jadi bukan satu transaction.
    const h = handlerIdempoten;
    expect(h).toContain("if rek.status == 0 || rek.status >= 500 || rek.status == http.StatusTooManyRequests {");
    expect(h).toContain("_ = s.svc.LepasKunci(ctx, kunci) // kegagalan sementara: ulangan mengerjakannya dari awal");
    expect(h).toMatch(/case repo\.KlaimBerjalan:\n\t\t\ttulisProblem\(w, Problem\{Type: "\/problems\/sedang-diproses", Status: 409,/);
    expect(h.indexOf("s.svc.SelesaiKunci(ctx, kunci, b)")).toBeGreaterThan(h.indexOf("next(rek, r)"));
    expect(h.indexOf("next(rek, r)")).toBeGreaterThan(h.indexOf("s.svc.KlaimKunci("));
    expect(h).not.toContain("DalamTx");
    expect(idempotenRepo).toContain("DELETE FROM kunci_idempotensi WHERE kunci = $1 AND status = 'diproses'");
  });
  test("klaim negatif berlingkup: lab t3-offline tidak punya kode Dart dan HP diperankan curl; README mengakui hal yang belum direkam", () => {
    const dart = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/t3-offline/") && /\.(dart|kt|swift)$/.test(f));
    expect(dart).toEqual([]);
    expect(readmeLab).toContain("Tidak ada client sungguhan: HP diperankan oleh curl.");
    expect(readmeLab).toContain("**Last-write-wins dengan cap waktu HP, CRDT, key 7 hari untuk semua endpoint, queue pembayaran offline.** Opsi yang ditolak ADR 29. Tidak dijalankan");
    expect(readmeLab).toContain("Tidak diilustrasikan: jam HP yang salah ke arah belakang dan jam database yang berbeda dari jam service.");
    expect(readmeLab).toContain("`TimpaStok` dan `POST /sinkron` mengubah stok tanpa menghapus entri cache katalog");
    expect(readmeLab).toContain("Pembersihan baris key.** Tidak ada job");
    expect(runLab).toContain('"nilai": nilai, "versi_dasar": versi');
  });
});

describe("widget Tebak dan diagram Inti: nilai diturunkan dari rekaman", () => {
  test("Tebak dipasang sekali sebagai island client:visible dengan noscript berisi jawaban yang tepat", () => {
    expect(hitung(halaman, /<Tebak client:visible data=\{dataTebak\} \/>/g)).toBe(1);
    const benar = tebak.pilihan.find((p) => p.benar)!;
    expect(halaman).toContain(`<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: ${benar.teks.replace(/^Menjawab /, "")}</p>\n</noscript>`);
    expect(halaman.indexOf("<noscript>")).toBeGreaterThan(halaman.indexOf("<Tebak"));
  });
  test("Tebak: posisi dan panjang jawaban benar tidak mencolok; semua string diturunkan dari rekaman dan kode", () => {
    const i = tebak.pilihan.findIndex((p) => p.benar);
    expect(i).toBe(1);
    expect(tebak.pilihan).toHaveLength(4);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[i]).toBeLessThan(Math.max(...panjang));
    const stokSabtu = Number(sebelumD[1]);
    const bakso = baksoC.badan.sekarang;
    expect(tebak.id).toBe("t3-offline-tebak");
    expect(tebak.judul).toBe("Operasi bakso yang belum pernah sampai");
    expect(tebak.sumber).toEqual({ jenis: "rekaman", teks: "labs/t3-offline/output/versi.txt bagian B, C, dan D; sinkron14.txt bagian B; waktu diperankan" });
    expect(tebak.adegan).toEqual([
      `Jumat 16.50 Ani mencatat "bakso habis" di HP, tetapi sinyalnya sudah hilang dan operasi itu tidak pernah sampai ke server. Sabtu pagi ia mengisi bakso ${stokIsiBakso} porsi lewat dasbor di laptop.`,
      `Senin 06.50 HP kembali online dan mengirim operasi "stok bakso = 0" untuk pertama kalinya, dengan kunci yang belum pernah diterima server dan versi yang Ani lihat hari Jumat.`,
    ]);
    expect(tebak.pertanyaan).toBe("Apa jawaban server, dan berapa stok bakso sesudahnya?");
    expect(tebak.pilihan.map((p) => p.teks)).toEqual([
      "Menjawab 200, dan stok jadi 0, karena server belum pernah melihat kunci ini.",
      `Menjawab ${baksoC.kode}, stok tetap ${bakso.stok}, dan jawabannya memuat stok ${bakso.stok} dan versi ${bakso.versi}.`,
      `Menjawab 422, karena operasinya lebih tua dari ${jamKunci} jam.`,
      `Menjawab 200, stok tetap ${bakso.stok}, karena server membuang operasi yang usang tanpa memberi tahu HP.`,
    ]);
    expect(tebak.pilihan.map((p) => p.alasan)).toEqual([
      `Itu hasil jalur lama di m24.txt bagian D: tanpa pemeriksaan versi, stok ${stokSabtu} menjadi 0 dengan jawaban ${mD[0]!.kode}. Jalur sinkron memeriksa versi, jadi kunci yang belum dikenal saja tidak cukup untuk menerapkan operasi.`,
      `versi.txt bagian C: kunci tidak dikenal, tetapi versi dasar ${versiDasarBakso} sudah lewat karena dasbor mengisi bakso hari Sabtu. Server tidak mengubah apa pun dan mengirim keadaan terkini supaya Ani memilih.`,
      `Batas ${jamKunci} jam milik Idempotency-Key di jalur uang. Queue sinkron menerima operasi sampai ${hariQueue} hari: ${umurOk} diterima dan ${umurTolak} ditolak (sinkron14.txt bagian B).`,
      `Kode TerapkanOperasi tidak punya cabang itu. Versi yang berbeda dicatat sebagai konflik dan dijawab ${baksoC.kode} (versi.txt bagian C). Jawaban 200 untuk operasi yang tidak diterapkan membuat HP mengira bakso sudah tercatat habis.`,
    ]);
    expect(tebak.penutup).toBe("Kunci mengenali kiriman yang sudah pernah sampai, dan versi menolak operasi yang dibuat dari keadaan yang sudah lewat. Dua pengaman itu menjawab dua pertanyaan berbeda.");
    expect(tebak.label).toEqual({ sumber: "Rekaman lab · versi.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" });
    expect(Object.keys(tebakMentah).sort()).toEqual(["adegan", "id", "judul", "label", "penutup", "pertanyaan", "pilihan", "sumber"]);
  });
  test("diagram Rantai Inti: simpul diturunkan dari versi.txt bagian C, sumber rekaman, judul pendek", () => {
    const bakso = baksoC.badan;
    expect(rantai.id).toBe("t3-offline-inti");
    expect(rantai.judul).toBe("Dua operasi lama sampai Senin, stok 30 utuh");
    expect(rantai.judul.length).toBeLessThanOrEqual(47);
    expect(rantai.judul).toContain(`stok ${sotoC.sekarang.stok} utuh`);
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-offline, versi.txt bagian C; waktu diperankan" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Soto", "dikirim Jumat, jawabannya hilang"], ["Bakso", "tidak pernah sampai"]]);
    expect(rantai.baris[0]!.simpul).toEqual([
      { teks: "kirim ulang", sub: "kunci yang sama", nada: "biasa", kode: false },
      { teks: "kunci dikenali", sub: `ulang ${sotoC.ulang}`, nada: "good", kode: false },
      { teks: `stok ${sotoC.sekarang.stok} utuh`, nada: "good", kode: false },
    ]);
    expect(rantai.baris[1]!.simpul).toEqual([
      { teks: "kirim pertama", sub: `versi dasar ${versiDasarBakso}`, nada: "biasa", kode: false },
      { teks: `versi sudah ${bakso.sekarang.versi}`, sub: "kunci tidak dikenal", nada: "warn", kode: false },
      { teks: `${baksoC.kode}, stok ${bakso.sekarang.stok} utuh`, nada: "good", kode: false },
    ]);
    expect(rantai.catatan).toBe("Kotak oranye adalah titik yang menolak operasi. HP diperankan curl dan waktu diperankan di lab, jadi queue lokal dan layar konflik di app Tidak dijalankan.");
    expect(sotoC.sekarang.stok).toBe(bakso.sekarang.stok);
    expect(vC[0]!.kode).toBe(200);
  });
});

describe("sumber dokumentasi: baris riset R3-200 sampai R3-204, tanggal, versi, dan klaim negatif berlingkup", () => {
  const ids = ["R3-200", "R3-201", "R3-202", "R3-203", "R3-204"];
  const tanggal = "2026-10-27";
  test("lima baris ada sekali, urut sesudah R3-196, dibuka pada tanggal yang sama dengan halaman", () => {
    const urut = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => b.split("|")[1]!.trim());
    const i = urut.indexOf("R3-200");
    expect(urut.slice(i, i + 5)).toEqual(ids);
    expect(urut.indexOf("R3-196")).toBe(i - 1);
    expect(urut.indexOf("R3-183")).toBeLessThan(urut.indexOf("R3-195"));
    expect(new Set(urut).size).toBe(urut.length);
    for (const id of ids) expect(barisRiset(id), id).toContain(`dibuka ${tanggal}`);
    const tanggalHalaman = new Set(halaman.match(/dibuka (\d{4}-\d{2}-\d{2})/g)!.map((x) => x.slice(7)));
    expect([...tanggalHalaman].sort()).toEqual(["2026-10-25", tanggal]);
    expect(hitung(halaman, /dibuka 2026-10-25/g)).toBe(2);
    expect(barisRiset("R3-91")).toContain("dibuka 2026-10-25");
    expect(barisRiset("R3-92")).toContain("dibuka 2026-10-25");
  });
  test("isi baris riset dikunci dengan sidik jari; klaim kunci ada di baris yang dirujuk halaman", () => {
    const sj = Object.fromEntries(ids.map((id) => [id, sidik(barisRiset(id))]));
    expect(sj).toEqual(SIDIK_RISET);
    const r200 = barisRiset("R3-200");
    for (const k of ["2019-10-16", "waktu sembarang", "menerapkan ulang suntingan offline", "tanpa timestamp karena server menentukan urutan", "Figma isn't using true CRDTs", "AB atau BC, tidak pernah ABC", "tanpa angka", "2018-06-27", "2015-03-31", "bounded counter", "ketidakmampuan menegakkan invarian numerik di semua replika"]) expect(r200, k).toContain(k);
    const r201 = barisRiset("R3-201");
    for (const k of ["Last updated 2026-10-14 UTC", "queued writes", "lazy writes", "nontrivial because there can be conflicts", "Conflict resolution often requires versioning", "common approach is", "NetworkType.CONNECTED", "Result.retry()", "Flutter 3.47", "Page last updated on 2026-05-05", "`synchronized`", "kata conflict, versioning, dan last-write tidak ada di teks halaman", "drift 2.35.3", "isar 3.1.0+1", "2023-04-25", "hive 2.2.3", "2022-06-30", "hive_ce 2.22.0", "deskripsi kelimanya tidak menyebut sinkron ke server"]) expect(r201, k).toContain(k);
    const r202 = barisRiset("R3-202");
    for (const k of ["`error` adalah merge policy bawaan", "`mergeByPropertyObjectTrump`", "`overwrite` menimpa seluruh objek tersimpan", "unique constraints, undefined attributes, or required relationships", "tidak memuat kata conflict", "`cloudKitDatabase`"]) expect(r202, k).toContain(k);
    const r203 = barisRiset("R3-203");
    for (const k of ["aktif secara bawaan di Android dan Apple, nonaktif di web", "it's last write wins", "Transactions will fail when the client is offline", "FieldValue.increment()", "Watermelon is only a local database", "halaman itu tidak memuat kata conflict", "MUST abort", "created_at", "0.28.0", "2025-04-07"]) expect(r203, k).toContain(k);
    const r204 = barisRiset("R3-204");
    for (const k of ["Version: 4.0.0", "serverpod 4.0.4", "2026-10-06", "SQLite", "`database: sync`", "serverpod_offline_sync", "Offline sync is experimental", "not yet ready for production use", "resolves conflicts itself", "halaman tidak menyebut strategi konfliknya", "databaseSync"]) expect(r204, k).toContain(k);
  });
  test("versi dan tanggal sumber di halaman cocok dengan baris riset", () => {
    expect(halaman).toContain("halaman itu bertanda Last updated 2026-10-14 UTC");
    expect(halaman).toContain("dokumentasi Flutter 3.47, diperbarui 2026-05-05");
    expect(halaman).toContain("[drift](https://pub.dev/packages/drift) 2.35.3");
    expect(halaman).toContain("isar 3.1.0+1");
    expect(halaman).toContain("Rilis terbaru isar bertanggal 2023-04-25 dan hive 2022-06-30, sedangkan hive_ce 2.22.0 melanjutkan Hive.");
    expect(halaman).toContain("hive 2.2.3 adalah database key-value");
    expect(halaman).toContain("paket @nozbe/watermelondb 0.28.0 (npm, 2025-04-07)");
    expect(halaman).toContain("halaman bertanda versi dokumentasi 4.0.0, rilis terbaru di pub.dev 4.0.4");
    expect(halaman).toContain("Evan Wallace, [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/), 2019-10-16");
    expect(halaman).toContain("2018-06-27, dibuka");
    expect(halaman).toContain("2015-03-31, dibuka");
    expect(barisRiset("R3-90")).toContain("draft-ietf-httpapi-idempotency-key-header-08");
    expect(barisRiset("R3-91")).toContain("§15.5.10");
    expect(barisRiset("R3-92")).toContain("PostgreSQL 17.11 §13.2.1");
    expect(halaman).toContain("[RFC 9110 §15.5.10](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.10)");
    expect(halaman).toContain("bagian Read Committed");
  });
  test("tautan eksternal dikunci per teks dan alamat; setiap alamat ada jejaknya di baris riset; satu teks tautan, satu alamat", () => {
    const tautan = [...halaman.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    const peta = new Map<string, Set<string>>();
    for (const [t, u] of tautan) peta.set(t, (peta.get(t) ?? new Set()).add(u));
    for (const [t, us] of peta) expect(us.size, `teks tautan ganda: ${t}`).toBe(1);
    expect([...new Set(tautan.map(([, u]) => u))].sort()).toEqual(ALAMAT.map(([u]) => u).sort());
    const semuaRiset = [...ids, "R3-90", "R3-91", "R3-92"].map(barisRiset).join("\n");
    for (const [u, jejak] of ALAMAT) expect(semuaRiset, u).toContain(jejak);
    expect(caraPakai).toMatch(/^#+ Label sumber$/m);
  });
  test("klaim negatif halaman dibatasi ke halaman dokumentasi yang dibuka dan dijaga baris riset", () => {
    expect(halaman).toContain("Kata conflict dan versioning tidak ada di halaman itu, jadi aturan");
    expect(halaman).toContain("tetapi kata conflict dan versioning tidak ada di halaman itu.");
    expect(halaman).toContain("Deskripsi kelimanya tidak menyebut sinkron ke server.");
    expect(halaman).toContain("Halaman Apple yang dibuka tidak menulis cara CloudKit menyelesaikan konflik antar perangkat [perlu verifikasi].");
    expect(halaman).toContain("dan halaman tidak menulis strateginya.");
    expect(halaman).toContain("Karena strategi konfliknya tidak terbaca, ADR 29 tidak bisa bersandar padanya.");
    expect(halaman).toContain("Artikelnya tidak menyebut berapa lama offline yang diuji".replace("Artikelnya", "artikelnya"));
    expect(halaman).toContain("Tidak ada tab yang dijalankan: lab memerankan HP dengan curl.");
  });
});

describe("tab Di stack lain, kartu Cek diri, dan tetangga", () => {
  test("enam tab mobile; semua Tidak dijalankan; satu pernyataan Yang berbeda per tab; dua kode Ilustrasi", () => {
    expect(halaman).toContain('<TabSet id="stack-mobile" labels={["Flutter", "Android", "iOS", "React Native", "Firestore", "Dart (Serverpod)"]}>');
    expect([...halaman.matchAll(/^\*(Dijalankan|Tidak dijalankan)[.:]/gm)].map((m) => m[1])).toEqual(Array(6).fill("Tidak dijalankan"));
    expect(halaman.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect(halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g)).toHaveLength(6);
    expect(halaman.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(2);
    expect(halaman.match(/<Snippet lang="(dart|kotlin)" code=/g)).toHaveLength(2);
    expect(halaman).not.toMatch(/yang sama di semua stack/i);
  });
  test("Sudah tahu? Cek 3 pertanyaan sama dengan jumlah butir; Cek diri punya empat kartu dengan jawaban", () => {
    const sum = halaman.match(/<summary>Sudah tahu\? Cek (\d+) pertanyaan<\/summary>\n\n((?:\d+\. .+\n)+)/)!;
    expect(Number(sum[1])).toBe(sum[2]!.trim().split("\n").length);
    expect(halaman.match(/<details class="success">/g)).toHaveLength(4);
    expect(halaman.match(/^\*\*\d\.\*\* /gm)).toHaveLength(4);
    expect(halaman.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(4);
  });
  test("tautan [[ID]] ada di registry dan daftarnya dikunci", () => {
    const ids = [...new Set([...halaman.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(ids).toEqual(["berikutnya", "t2-idempotency", "t2-race-lock", "t3-adr-33", "t3-cache", "t3-m24", "t3-prd", "t3-skema"]);
    const reg = new Set((registry.halaman as { id: string }[]).map((h) => h.id));
    for (const id of ids.filter((x) => x !== "berikutnya")) expect(reg.has(id), id).toBe(true);
  });
  test("janji dari tetangga ditepati: 3.2 menaut halaman ini untuk optimistic lock dan offline-first; PRD menegaskan pembayaran tidak offline", () => {
    expect(fiturTeknis).toContain("[[t3-offline\\|optimistic lock]]");
    // Tautan "optimistic lock" dari 3.2 menuju halaman yang harus menyebut istilah itu dan menaut halaman yang mengajarkannya.
    expect(halaman).toContain("Pola ini disebut optimistic lock ([[t2-race-lock]])");
    expect(fiturTeknis).toContain("[[t3-offline\\|Offline-first]]");
    expect(fiturTeknis).toContain("Endpoint sinkron bersyarat versi (`POST /sinkron`)");
    expect(prd).toContain("Ubah stok dan harga tanpa sinyal, tersinkron saat sinyal kembali; pembayaran tidak pernah offline");
    expect(prd).toContain("**Bukan lingkup v3:** pembayaran offline");
    expect(naskah).toContain("| Offline | Operasi yang menunggu lama harus bisa ditolak dengan benar | M24 |");
    expect(naskah).toContain("| 33 | Sengaja belum: microservices, Kubernetes dan canary, read replica, PgBouncer, CDC, VPS kedua, cache saldo dan riwayat, pembayaran offline |");
  });
  test("E2 tetap dilebur ke halaman ini lewat registry; halaman lama tidak dihapus", () => {
    const h = registry.halaman as { id: string; lebur_ke?: string; lama?: boolean; ada: boolean }[];
    expect(h.find((x) => x.id === "E2")).toMatchObject({ ada: true, lama: true, lebur_ke: "t3-offline" });
    expect(fs.existsSync(path.join(akar, "situs/src/content/docs/e-mobile/e2-offline-first.mdx"))).toBe(true);
  });
});

describe("halaman istilah Last-write-wins dan CRDT, glosarium", () => {
  const slug = ["last-write-wins", "crdt"];
  const jalan = (s: string) => `situs/data/halaman-istilah/${s}.json`;
  test("dua halaman istilah valid, rujukan ke 3.21, rekaman dan riset ada", () => {
    for (const s of slug) {
      const d = HalamanIstilah.parse(JSON.parse(baca(jalan(s))));
      expect(d.cerita!.every((c) => c.rujukan === "t3-offline"), s).toBe(true);
      expect(d.stack).toBeNull();
      for (const x of d.sumber!) {
        if ("rekaman" in x) expect(fs.existsSync(path.join(akar, x.rekaman)), x.rekaman).toBe(true);
        if (x.riset) expect(riset, x.riset).toContain(`| ${x.riset} |`);
      }
    }
  });
  test("isi dua halaman istilah dikunci dengan sidik jari; angka di cerita diturunkan dari rekaman m24", () => {
    const isiJ = Object.fromEntries(slug.map((s) => [s, sidik(JSON.stringify(JSON.parse(baca(jalan(s)))))]));
    expect(isiJ).toEqual(SIDIK_ISTILAH);
    const l = JSON.parse(baca(jalan("last-write-wins"))) as { cerita: { teks: string }[]; mekanisme: string[] };
    expect(l.cerita[0]!.teks).toContain(`stok 0 dari hari Senin menimpa stok ${sebelumD[1]} dari hari Sabtu, dan jawabannya ${mD[0]!.kode}`);
    expect(l.mekanisme[2]).toContain(`m24.txt bagian D jawaban server tetap ${mD[0]!.kode}`);
    const c = JSON.parse(baca(jalan("crdt"))) as { cerita: { teks: string }[] };
    expect(c.cerita[0]!.teks).toContain("Opsi C di ADR 29");
    expect(c.cerita[0]!.teks).toContain("Tidak dijalankan.");
  });
  test("glosarium: CRDT dan Last-write-wins menuju 3.21, Offline-first dialihkan dari E2; istilah terkait ada", () => {
    const baris = (nama: string) => glosMdx.split("\n").find((b) => b.startsWith(`| **${nama}**`))!;
    for (const nama of ["CRDT", "Last-write-wins", "Offline-first"]) expect(baris(nama), nama).toMatch(/\| \[\[t3-offline\]\] \|$/);
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null; b: string | null }[];
    expect(glos.find((x) => x.t === "CRDT (Conflict-free Replicated Data Type)")).toMatchObject({ h: "/istilah/crdt/", b: "t3-offline" });
    expect(glos.find((x) => x.t === "Last-write-wins")).toMatchObject({ h: "/istilah/last-write-wins/", b: "t3-offline" });
    expect(glos.find((x) => x.t === "Offline-first")).toMatchObject({ h: null, b: "t3-offline" });
    for (const s of slug) for (const n of JSON.parse(baca(jalan(s))).terkait as string[]) expect(glos.some((x) => x.t === n), n).toBe(true);
  });
});

const SIDIK_RISET: Record<string, string> = {
  "R3-200": "d32d0a4b5fe72b4e",
  "R3-201": "dd29f780eecc33a6",
  "R3-202": "50cfd7489f0550af",
  "R3-203": "d833c7195d03ce8c",
  "R3-204": "fe6ac8662b8ff3dc",
};
const SIDIK_ISTILAH: Record<string, string> = {
  "last-write-wins": "743bb5dab8669094",
  "crdt": "a6d194036e982a94",
};
const ALAMAT: [string, string][] = [
  ["https://developer.android.com/topic/architecture/data-layer/offline-first", "developer.android.com/topic/architecture/data-layer/offline-first"],
  ["https://docs.flutter.dev/app-architecture/design-patterns/offline-first", "docs.flutter.dev/app-architecture/design-patterns/offline-first"],
  ["https://www.postgresql.org/docs/17/transaction-iso.html", "/docs/17/transaction-iso.html"],
  ["https://www.rfc-editor.org/rfc/rfc9110#section-15.5.10", "§15.5.10"],
  ["https://firebase.google.com/docs/firestore/manage-data/transactions", "firebase.google.com/docs/firestore/manage-data/transactions"],
  ["https://pub.dev/packages/drift", "drift 2.35.3"],
  ["https://developer.apple.com/documentation/coredata/nsmergepolicy", "coredata/nsmergepolicy"],
  ["https://developer.apple.com/documentation/coredata/mirroring-a-core-data-store-with-cloudkit", "mirroring-a-core-data-store-with-cloudkit"],
  ["https://developer.apple.com/documentation/swiftdata/modelconfiguration", "swiftdata/modelconfiguration"],
  ["https://watermelondb.dev/docs/Sync/Intro", "watermelondb.dev/docs/Sync/Intro"],
  ["https://watermelondb.dev/docs/Sync/Backend", "watermelondb.dev/docs/Sync/Backend"],
  ["https://firebase.google.com/docs/firestore/manage-data/enable-offline", "firebase.google.com/docs/firestore/manage-data/enable-offline"],
  ["https://docs.serverpod.dev/concepts/data-and-the-database/database/client-side-database", "docs.serverpod.dev/concepts/data-and-the-database/database/client-side-database"],
  ["https://arxiv.org/abs/1806.10254", "arxiv.org/abs/1806.10254"],
  ["https://arxiv.org/abs/1503.09052", "arxiv.org/abs/1503.09052"],
  ["https://www.figma.com/blog/how-figmas-multiplayer-technology-works/", "www.figma.com/blog/how-figmas-multiplayer-technology-works/"],
];
