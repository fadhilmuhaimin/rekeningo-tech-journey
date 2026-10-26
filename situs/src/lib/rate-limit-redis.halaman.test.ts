// Penjaga halaman 3.17 (keputusan 1064 sampai 1066): angka, ID, nomor ADR, rentang Snippet, tanggal akses, versi sumber, label
// sumber, dan kalimat di rate-limit-redis.mdx diturunkan dari rekaman labs/t3-instance (batas.txt), kode lab api-t3
// (redisbatas.go, batas_bersama.go, handler.go, pembatas.go, main.go, go.mod), run.py dan README lab, naskah, registry, RISET,
// dan halaman tetangga, bukan dari daftar yang ditulis sendiri. Isi halaman dikunci unit demi unit (EXPECT, nilai diisi dari
// sumber lewat «placeholder»), dan tiap klaim mekanisme dipasangkan dengan rekaman atau kode yang membuktikannya di tes terpisah,
// sebab mengunci kalimat utuh tidak menangkap kalimat yang SALAH (pelajaran 3.4 sampai 3.14). Klaim dokumentasi (Redis, GitHub,
// express-rate-limit, Laravel, Django, DRF, Serverpod, Supabase, Caddy, PostgreSQL, RFC 6585) dijaga lewat baris riset R3-180
// sampai R3-183, yang dibuka ke sumber mentah 2026-10-26 dan dikunci dengan sidik jari. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-rate-limit-redis-inti.json";
import registry from "../../data/cerita.json";
import { cekTemplat, daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataRantai } from "./rantai";

const akar = path.resolve(__dirname, "../../..");
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

const halamanBerkas = "situs/src/content/docs/tahap-3/rate-limit-redis.mdx";
const mdx = baca(halamanBerkas);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const rantai = DataRantai.parse(rantaiMentah);
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t3-batas-redis.json");
interface Langkah { dari: string; ke?: string; lapisan?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string; pengantar: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  komponen: { id: string; label: string; lapisan?: string[] }[];
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
const skenario = JSON.parse(skenarioMentah) as Skenario;
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
};
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const batasTxt = baca("labs/t3-instance/output/batas.txt");
const runPy = baca("labs/t3-instance/run.py");
const readmeLab = baca("labs/t3-instance/README.md");
const composeLab = baca("labs/t3-instance/docker-compose.yml");
const bg = baca("labs/api-t3/internal/service/batas_bersama.go");
const rbGo = baca("labs/api-t3/internal/redisbatas/redisbatas.go");
const hdGo = baca("labs/api-t3/internal/handler/handler.go");
const pbGo = baca("labs/api-t3/internal/service/pembatas.go");
const sesiGo = baca("labs/api-t3/internal/service/sesi.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const goMod = baca("labs/api-t3/go.mod");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const hal228 = baca("situs/src/content/docs/tahap-2/brute-force.mdx");
const hal314 = baca("situs/src/content/docs/tahap-3/m21-satu-proses-mati.mdx");
const halTeknis = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const caraPakai = baca("situs/src/content/docs/cara-pakai.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const setelah = baca("plan/SETELAH-TAHAP-3.md");

// ---- bagian rekaman -------------------------------------------------------------------------------
const barisBatas = batasTxt.split("\n");
const judulBagian = (h: string): number => {
  const i = barisBatas.findIndex((b) => b.startsWith(`# --- ${h}. `));
  if (i < 0) throw new Error(`rekaman: bagian ${h} tidak ada`);
  return i;
};
const bagian = (h: string): string[] => {
  const a = judulBagian(h);
  const z = barisBatas.findIndex((b, i) => i > a && b.startsWith("# --- "));
  return barisBatas.slice(a + 1, z < 0 ? barisBatas.length : z);
};
const akhirIsi = (h: string): number => {
  const a = judulBagian(h);
  let z = barisBatas.findIndex((b, i) => i > a && b.startsWith("# --- "));
  z = z < 0 ? barisBatas.length : z;
  while (z > 0 && !barisBatas[z - 1]!.trim()) z--;
  return z; // nomor baris 1-based dari baris isi terakhir
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const barisNo = (baris: string[], pola: RegExp, dari = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const rentang = (baris: string[], awal: RegExp, akhir: RegExp): string => {
  const a = barisNo(baris, awal);
  return `${a}:${barisNo(baris, akhir, a - 1)}`;
};
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;
const barisRiset = (id: string): string => {
  const b = riset.split("\n").filter((x) => x.startsWith(`| ${id} |`));
  expect(b, `baris riset ${id}`).toHaveLength(1);
  return b[0]!;
};
const koma = (n: number, d = 2): string => n.toFixed(d).replace(".", ",");

const A = bagian("A");
const B = bagian("B");
const C = bagian("C");
const D = bagian("D");
const E = bagian("E");
const F = bagian("F");
const G = bagian("G");
const H = bagian("H");
const I = bagian("I");
const J = bagian("J");
const kodeBg = bg.split("\n");
const kodeRb = rbGo.split("\n");
const kodeHd = hdGo.split("\n");

// ---- nilai turunan dari rekaman dan kode ------------------------------------------------------------
const hasil = (b: string[], nama: string) => cari(/^(\d+) percobaan → 401: (\d+) · 429: (\d+)/, b, nama);
const mA = hasil(A, "A");
const mB = cari(/^24 percobaan langsung ke instance a → 401: (\d+) · 429: (\d+)/, B, "B");
const mE = hasil(E, "E");
const mF = hasil(F, "F");
const mI = hasil(I, "I");
const perA = cari(/per instance: 401 a (\d+), b (\d+) · 429 a (\d+), b (\d+)/, A, "A per instance");
const perE = cari(/per instance: 401 a (\d+), b (\d+) · 429 a (\d+), b (\d+)/, E, "E per instance");
const bersamaE = cari(/"ip": \{"bersama": (\d+), "lokal": 0\}/, E, "E bersama");
const hitE = cari(/hitungannya (\d+) \(naik juga untuk yang ditolak\), sisa jendela antara 1 dan (\d+) detik: ya$/, E, "E hitungan");
const keyIP = cari(/^Redis: key per IP (\d+),/, E, "E key ip");
const keyAkun = cari(/^Redis: key per akun (\d+) /, E, "E key akun");
const baruI = cari(/Redis hidup lagi, (\d+) percobaan baru → 401: (\d+); instance a menjawab bersama lagi: ya$/, I, "I baru");
const gagalLogin = cari(/^ (\d+) +\| t$/, G, "G gagal_login");
const batasIP = Number(cari(/AmbangLoginIP += \[2\]float64\{(\d+),/, pbGo.split("\n"), "AmbangLoginIP")[1]);
const batasAkun = Number(cari(/AmbangLoginAkun = \[2\]float64\{(\d+),/, pbGo.split("\n"), "AmbangLoginAkun")[1]);
const timeoutMs = Number(cari(/"redis-timeout", (\d+)\*time\.Millisecond/, mainGo.split("\n"), "redis-timeout")[1]);
const bawaanGo = cari(/bawaan go-redis: (\d+) detik dan (\d+) retry/, J, "J bawaan");
const awalIP = cari(/"(rekeningo:rl:login:ip:)"/, mainGo.split("\n"), "awalan ip")[1]!;
const awalAkun = cari(/"(rekeningo:rl:login:akun:)"/, mainGo.split("\n"), "awalan akun")[1]!;
const goRedis = cari(/github\.com\/redis\/go-redis\/v9 (v[\d.]+)/, goMod.split("\n"), "go-redis")[1]!;
const versiRedis = cari(/Redis (\d+\.\d+\.\d+)/, barisBatas.slice(0, 3), "versi Redis")[1]!;
const rpsPrd = cari(/= (17,36) \(asumsi\)/, prd.split("\n"), "17,36 di PRD")[1]!;
const rpsNilai = (150000 / 86400) * 10;
const operasi = koma(2 * Number(rpsPrd.replace(",", ".")));
const nCoba = Number(mA[1]);
const dibagi = batasIP / 2;
const efektif = (x: number): number => Math.min(dibagi, x) + Math.min(dibagi, nCoba - x);
const efektifMin = Math.min(...Array.from({ length: nCoba + 1 }, (_, x) => efektif(x)));
const efektifMaks = Math.max(...Array.from({ length: nCoba + 1 }, (_, x) => efektif(x)));
const tanggal = cari(/dibuka (\d{4}-\d{2}-\d{2})/, [barisRiset("R3-180")], "tanggal R3-180")[1]!;
const laravel = cari(/`laravel\/framework` v(\d+\.\d+\.\d+)/, riset.split("\n"), "laravel")[1]!;
const serverpod = cari(/Serverpod (\d+\.\d+\.\d+) \(pub\.dev/, riset.split("\n"), "serverpod")[1]!;
const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m22\]\] · Jalur inti<\/p>$/m)!;
const rekamanRentang = ["A", "E", "H", "I", "J"]
  .map((h) => `"labs/t3-instance/output/batas.txt:${h === "H" ? judulBagian(h) + 2 : judulBagian(h) + 1}:${akhirIsi(h)}"`)
  .join(",");

const V: Record<string, string | number> = {
  baca: Number(meta[1]), tanggal, nCoba, sampaiA: Number(mA[2]), ditolakA: Number(mA[3]), sampaiE: Number(mE[2]), ditolakE: Number(mE[3]),
  sampaiI: Number(mI[2]), ditolakI: Number(mI[3]), baruN: Number(baruI[1]), hitunganE: Number(hitE[1]), keyIP: Number(keyIP[1]),
  keyAkun: Number(keyAkun[1]), gagalLogin: Number(gagalLogin[1]), batasIP, batasAkun, jendelaDetik: Number(hitE[2]), timeoutMs,
  detikBawaan: Number(bawaanGo[1]), retryBawaan: Number(bawaanGo[2]), awalanIP: awalIP, awalanAkun: awalAkun, goRedis, redis: versiRedis,
  rps: rpsPrd, operasi, dibagi, efektifMin, erl: "8.7.1", rlr: "6.0.1", laravel, drf: "3.18.3", serverpodDok: "4.0.0", serverpod,
  serverpodBatas: 5, serverpodMenit: 5,
  skripRentang: rentang(kodeRb, /^var skrip = redis\.NewScript\(/, /^`\)$/),
  bukaRentang: rentang(kodeRb, /^func Baru\(/, /^}$/),
  izinkanRentang: rentang(kodeBg, /^\/\/ Izinkan menaikkan hitungan key/, /^}$/),
  antarmukaRentang: rentang(kodeBg, /^\/\/ Batas adalah satu rate limit/, /^}$/),
  alamatRentang: rentang(kodeHd, /^func clientIP\(/, /^}$/),
  rekamanRentang,
};
const isi = (t: string): string =>
  t.replace(/«(\w+)»/g, (_, k: string) => {
    if (!(k in V)) throw new Error(`placeholder tidak dikenal: ${k}`);
    return String(V[k]);
  });

// ---- isi halaman, unit demi unit (dipisah baris kosong); «nama» diisi dari sumber lewat isi() ----
const EXPECT: string[] = [
  "import Blok from \"../../../components/Blok.astro\";\nimport Rantai from \"../../../components/Rantai.astro\";\nimport Snippet from \"../../../components/Snippet.astro\";\nimport TabSet from \"../../../components/TabSet.astro\";\nimport WidgetLama from \"../../../components/WidgetLama.astro\";\nimport SkripLama from \"../../../components/SkripLama.astro\";\nimport intiDiagram from \"../../../../data/diagram/t3-rate-limit-redis-inti.json\";",
  "<p class=\"meta\">Baca «baca» menit · coba 3 menit · Prasyarat: [[t3-m22]] · Jalur inti</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Agar dua instance berbagi satu batas, hitungannya disimpan di tempat yang dipakai keduanya, bukan di memori satu proses.",
  "<Rantai data={intiDiagram} ringkas />",
  "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `batas.txt` bagian A, satu alamat mengirim «nCoba» percobaan login ke «nCoba» akun berbeda lewat dua instance. Tiap instance menyimpan bucket sendiri, dan «sampaiA» percobaan sampai ke pemeriksaan password. Bagian E memakai satu hitungan di Redis dan hanya «sampaiE» yang sampai, sama dengan satu instance di bagian B.",
  "Redis menambah satu komponen yang bisa mati. Di bagian I, Redis dihentikan dan login tetap dijawab. Batas jatuh ke bucket lokal: «sampaiI» dari «nCoba» percobaan sampai ke pemeriksaan password, sama seperti sebelum ada Redis.",
  "Di bagian J, Redis dibekukan. Satu login selesai kurang dari 1 detik dengan batas waktu «timeoutMs» milidetik, dan butuh lebih dari «detikBawaan» detik dengan bawaan go-redis.",
  "<details class=\"question\">\n<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Dua instance menyimpan bucket di memori, dan batas per alamat «batasIP». Berapa dari «nCoba» percobaan satu alamat sampai ke pemeriksaan password, dan berapa bila hitungannya di Redis?\n2. Kenapa `INCR` dan `PEXPIRE` dijalankan sebagai satu skrip Lua, bukan dua perintah?\n3. Redis berhenti menjawab. Login ikut mati, ditolak semua, atau tetap dijawab?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: satu hitungan bersama menahan satu alamat di «batasIP» percobaan walau dua instance yang menerimanya, dan Redis yang mati mengembalikan batas per instance, bukan membuka login tanpa batas.\">",
  "Widget ini mengikuti rekaman `batas.txt` bagian E: satu alamat mengirim «nCoba» percobaan ke «nCoba» akun lewat dua instance, dan hitungannya di Redis. Tebak dulu berapa yang sampai ke pemeriksaan password, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t3-batas-redis.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: Redis mati**. Jalur itu mengikuti bagian I. Langkah 3 dan 4 memuat hal yang dibaca dari kode lab, bukan dari rekaman, dan catatan sumber di widget menyebutnya.",
  "<noscript>\nTanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: dengan hitungan di Redis, «sampaiE» dari «nCoba» percobaan sampai ke pemeriksaan password dan «ditolakE» ditolak 429.",
  "Bila Redis mati, login tetap dijawab dan batas jatuh ke bucket lokal: «sampaiI» sampai dan «ditolakI» ditolak. Rekaman lengkap ada di lipatan di bawah.\n</noscript>",
  "<details class=\"abstract\">\n<summary>Rekaman bagian A, E, H, I, dan J (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet files={[«rekamanRentang»]} title=\"Rekaman lab: labs/t3-instance/output/batas.txt, bagian A, E, H, I, dan J (tanpa baris kepala)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t3-m22]] menunjukkan batas login per alamat yang longgar sesudah instance kedua dipasang. Yang berlipat adalah bucket di memori. Kunci akun di database tidak berlipat: `gagal_login` berhenti di «gagalLogin» pada bagian D dan G.",
  "ADR 20 menunda Redis ke Tahap 3, saat server kedua datang ([[t2-login-aman]]). ADR 21 menulis dua syarat untuk Redis. Satu kebutuhan data bersama antar proses muncul, dan tabel PostgreSQL untuk kebutuhan itu sudah diukur dan tidak cukup ([[t2-adr-21]]). M22 memenuhi syarat pertama.",
  "Syarat kedua belum terpenuhi, karena tidak ada rekaman operasi counter di PostgreSQL.",
  "Karena itu ADR 27 di bawah adalah pilihan desain dengan alasan yang ditulis, bukan hasil ukur. Halaman ini tidak mengulang cara menahan tebakan password. Itu ada di [[t2-login-aman]].",
  "### Cara kerjanya",
  "**Dua key per login, keduanya di Redis.** Handler memeriksa alamat client, lalu service memeriksa akun. Tiap pemeriksaan menaikkan satu key: `«awalanIP»` dan `«awalanAkun»`, masing-masing diikuti hash dari alamat atau email, supaya `KEYS` dan file cadangan Redis tidak memuat email. Di bagian E, Redis berisi «keyIP» key per alamat dan «keyAkun» key per akun.",
  "**Satu skrip, bukan dua perintah.** Dokumentasi Redis memuat pola rate limiter dengan satu counter per alamat. Pola itu punya race.",
  "Client yang menjalankan `INCR` tetapi tidak sempat menjalankan `EXPIRE` meninggalkan key yang tidak pernah kedaluwarsa. Dokumentasi memperbaikinya dengan skrip Lua lewat `EVAL` ([Redis: INCR](https://redis.io/docs/latest/commands/incr/), halaman latest tanpa nomor versi, dibuka «tanggal»).",
  "Dokumentasi scripting menulis bahwa Redis menjamin eksekusi skrip yang atomik ([Redis: scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/), dibuka «tanggal»). Lab merekam bahayanya di bagian H: `INCR` saja menghasilkan `PTTL` `-1`, key tanpa masa berlaku. Skrip lab menaikkan hitungan dan memasang masa berlaku dalam satu perintah:",
  "<Snippet file=\"labs/api-t3/internal/redisbatas/redisbatas.go\" lines=\"«skripRentang»\" lang=\"go\" title=\"labs/api-t3/internal/redisbatas/redisbatas.go\" />",
  "Cabang `PTTL < 0` juga memperbaiki key yang sudah telanjur tanpa masa berlaku. Cache skrip di Redis tidak persisten. go-redis «goRedis» mengirim isi skrip lewat `EVAL` bila Redis menjawab `NOSCRIPT` (kode `script.go`, dibuka «tanggal»).",
  "**Jendela tetap menggantikan token bucket.** Bucket di memori mengisi ulang token pelan-pelan. Hitungan di Redis mulai dari percobaan pertama dan berlaku «jendelaDetik» detik. Sesudah itu key hilang dan hitungan mulai dari nol.",
  "Percobaan yang melewati «batasIP» ditolak, dan hitungannya tetap naik. Bagian E mencatat hitungan «hitunganE» untuk «nCoba» percobaan.",
  "<Snippet file=\"labs/api-t3/internal/service/batas_bersama.go\" lines=\"«izinkanRentang»\" lang=\"go\" title=\"labs/api-t3/internal/service/batas_bersama.go\" />",
  "`PEXPIRE` hanya dipasang saat key baru, jadi percobaan yang ditolak tidak memperpanjang jendela. Sisa jendela menjadi `Retry-After`, paling sedikit 1 detik. RFC 6585 bagian 4 menulis bahwa jawaban 429 boleh memuat header itu ([RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html#section-4), dibuka «tanggal»). Kode `Izinkan` yang menghitungnya tidak direkam, dan bagian E hanya mencatat bahwa sisa jendela antara 1 dan «jendelaDetik» detik.",
  "Jendela tetap punya kelemahan yang ditulis komentar kode: di batas dua jendela, paling banyak 2 × «batasIP» percobaan lolos dalam selang pendek. Itu Hitungan, Tidak dijalankan: «batasIP» percobaan di detik terakhir jendela dan «batasIP» di detik pertama jendela berikutnya.",
  "**Redis mati, login tidak ikut mati.** Bila panggilan ke Redis gagal atau lewat batas waktu, pemeriksaan memakai bucket lokal. Bagian I mencatat «sampaiI» dari «nCoba» percobaan sampai ke pemeriksaan password, sama dengan bagian A. Tiap penghitung, alamat dan akun, menulis satu baris log saat mulai gagal dan satu baris saat pulih.",
  "Sesudah Redis hidup lagi, instance tidak dimulai ulang: «baruN» percobaan baru dijawab 401, dan instance a kembali memakai Redis. Kode memanggil Redis lebih dulu pada setiap pemeriksaan, jadi tidak ada jadwal pemulihan dan tidak ada circuit breaker (dibaca dari kode).",
  "**Redis yang menggantung menguji batas waktu.** Bagian J membekukan kontainer Redis, jadi panggilan tidak mendapat jawaban. Lamanya ditentukan batas waktu client. Kode lab memasang satu batas «timeoutMs» milidetik untuk satu pemeriksaan dan mematikan retry:",
  "<Snippet file=\"labs/api-t3/internal/redisbatas/redisbatas.go\" lines=\"«bukaRentang»\" lang=\"go\" title=\"labs/api-t3/internal/redisbatas/redisbatas.go\" />",
  "Bawaan go-redis «goRedis» adalah `DialTimeout` dan `ReadTimeout` «detikBawaan» detik dan `MaxRetries` «retryBawaan» (kode `options.go`, dibuka «tanggal»). Bagian J mencatat satu login selesai kurang dari 1 detik dengan batas «timeoutMs» milidetik, dan butuh lebih dari «detikBawaan» detik dengan bawaan. Waktu pastinya bergantung pada mesin dan tidak direkam.",
  "Satu login memeriksa alamat lalu akun, dua panggilan terpisah. Tanpa circuit breaker, bawaan itu bisa menahan satu login lebih lama daripada satu batas waktu (dibaca dari kode).",
  "**Alamat client di belakang proxy.** Key per alamat hanya sebaik alamat yang dipakainya. Handler membaca alamat koneksi TCP:",
  "<Snippet file=\"labs/api-t3/internal/handler/handler.go\" lines=\"«alamatRentang»\" lang=\"go\" title=\"labs/api-t3/internal/handler/handler.go\" />",
  "Di belakang proxy, alamat koneksi adalah alamat proxy untuk semua client. Seluruh karyawan berbagi satu key per alamat, dan batas «batasIP» per menit berlaku untuk semuanya sekaligus, dengan atau tanpa Redis. Satu penyerang yang menghabiskan jatah itu menolak login semua orang (dari mekanismenya, tidak direkam). Kepala rekaman menulis hal yang sama, dan README lab menulis bahwa lab tidak bisa membedakan dua client lewat proxy di Docker Desktop.",
  "Caddy mengabaikan nilai `X-Forwarded-For` dari request masuk dan mengisi header itu sendiri, kecuali `trusted_proxies` diisi ([Caddy: reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), dibuka «tanggal»). Jadi api-t3 aman membaca header itu bila koneksinya datang dari proxy sendiri. Kode lab belum melakukannya. Itu pekerjaan berikutnya, dan ADR 27 menjadikannya syarat.",
  "### Di stack lain",
  "**Skenario:** batas login per alamat yang dijalankan oleh lebih dari satu server. Yang ditanyakan: di mana hitungan disimpan secara bawaan, apakah dua proses berbagi hitungan itu, dan apa yang terjadi bila penyimpanannya mati.",
  "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada «tanggal». Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.",
  "Yang sama di semua stack: hitungan di memori satu proses tidak dilihat proses lain. Yang berbeda adalah store bawaan dan perilaku saat store mati.",
  "<TabSet id=\"stack\" labels={[\"Go\", \"Node.js\", \"Laravel\", \"Django\", \"Dart (Serverpod)\", \"Supabase\"]}>\n<Fragment slot=\"t0\">",
  "*Dijalankan: lab api-t3 dan t3-instance, go-redis «goRedis», Redis «redis» (rekaman `batas.txt` bagian E sampai J).*",
  "<Snippet file=\"labs/api-t3/internal/service/batas_bersama.go\" lines=\"«antarmukaRentang»\" lang=\"go\" title=\"labs/api-t3/internal/service/batas_bersama.go\" />",
  "**Yang berbeda di stack ini:** tidak ada library rate limit. Dua pembatas memenuhi satu antarmuka: bucket di memori dan hitungan di Redis. Handler dan service tidak tahu mana yang dipakai, dan kegagalan Redis ditangani di `PembatasBersama`.",
  "</Fragment>\n<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke README [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit/blob/v«erl»/readme.md) «erl» dan [rate-limit-redis](https://github.com/express-rate-limit/rate-limit-redis/blob/v«rlr»/readme.md) «rlr», dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"js\" code={`import { rateLimit } from \"express-rate-limit\";\nimport { RedisStore } from \"rate-limit-redis\";",
  "const batasAlamat = rateLimit({\n  windowMs: 60_000,\n  limit: «batasIP»,\n  passOnStoreError: true,\n  store: new RedisStore({\n    sendCommand: (...args) => client.sendCommand(args),\n  }),\n});`} />",
  "**Yang berbeda di stack ini:** store bawaan ada di memori. Opsi `store` membagi hitungan antar node. `passOnStoreError` bawaannya `false`, dan README menulis lalu lintas diblokir bila store tidak tersedia. Itu berbeda dari pilihan lab, yang jatuh ke bucket lokal. Contoh di atas memilih `true`, jadi login tetap dijawab tanpa batas sama sekali selama store mati.",
  "</Fragment>\n<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: Rate Limiting](https://laravel.com/docs/13.x/rate-limiting), dibuka «tanggal», `laravel/framework` «laravel». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"php\" code={`// config/cache.php\n'default' => env('CACHE_STORE', 'database'),\n'limiter' => 'redis',",
  "// satu key per alamat\nif (RateLimiter::increment('login:'.$request->ip()) > «batasIP») {\n    abort(429);\n}`} />",
  "**Yang berbeda di stack ini:** rate limiter memakai cache aplikasi, dan kunci `limiter` di konfigurasi cache memilih driver lain. Contoh dokumentasinya memakai `database` sebagai cache bawaan. Dokumentasi menulis bahwa `increment` bersifat atomik di store redis, memcached, dan database, jadi counter di database juga jalur yang ditulis dokumentasinya.",
  "</Fragment>\n<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [Django 6.1: Cache](https://docs.djangoproject.com/en/6.1/topics/cache/) dan [Django REST framework: Throttling](https://www.django-rest-framework.org/api-guide/throttling/), dibuka «tanggal». Halaman DRF tidak menulis nomor versi, dan rilis terbaru di PyPI «drf». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"python\" code={`CACHES = {\n    \"default\": {\n        \"BACKEND\": \"django.core.cache.backends.redis.RedisCache\",\n        \"LOCATION\": \"redis://127.0.0.1:6379\",\n    }\n}`} />",
  "**Yang berbeda di stack ini:** cache bawaan Django adalah local-memory, dan dokumentasinya menulis tiap proses punya instance cache sendiri, jadi tidak ada cache lintas proses. Throttle DRF memakai cache itu, jadi dua proses menghitung sendiri-sendiri sampai backend diganti. Dokumentasi DRF juga menulis implementasinya tidak atomik dan boleh meloloskan beberapa request lebih saat concurrency tinggi, dan throttle itu bukan pengaman terhadap brute force.",
  "</Fragment>\n<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Dicek ke [Serverpod: Caching](https://docs.serverpod.dev/concepts/endpoints-and-apis/caching) dan [Serverpod: konfigurasi email](https://docs.serverpod.dev/concepts/authentication/providers/email/configuration), halaman bertanda versi dokumentasi «serverpodDok», rilis terbaru di pub.dev «serverpod», dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"dart\" code={`Future<int?> hitung(Session session, String key) async {\n  var command = await session.serverpod.redisController?.getConnection();\n  if (command == null) return null;\n  var hasil = await command.send_object(['INCR', 'login:$key']);\n  return hasil is int ? hasil : null;\n}`} />",
  "**Yang berbeda di stack ini:** batas login gagal sudah bawaan, «serverpodBatas» percobaan per «serverpodMenit» menit, dan halaman konfigurasi tidak menyebut tempat hitungannya disimpan [perlu verifikasi]. Untuk hitungan sendiri, halaman Caching menunjukkan `INCR` lewat koneksi Redis milik Serverpod. Koneksi itu `null` bila Redis mati atau tidak dikonfigurasi, jadi cabang gagalnya harus kamu tulis. Cache global jatuh diam-diam ke memori satu proses bila Redis tidak dikonfigurasi, dan readiness probe tetap lolos.",
  "</Fragment>\n<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke [Supabase: Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting), dibuka «tanggal».*",
  "**Yang berbeda di stack ini:** untuk Edge Functions buatan sendiri, dokumentasi menaruh hitungan di Redis lewat Upstash, dan menulis client HTTP/REST-nya cocok untuk serverless. Halaman itu tidak menyebut rate limiter bawaan. Kode contohnya ada di GitHub dan tidak dibuka, jadi cara kerja hitungannya dan perilaku saat Redis mati belum dicek [perlu verifikasi].",
  "</Fragment>\n</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 27: hitungan batas login di Redis, dengan batas waktu 50 milidetik dan bucket lokal sebagai cadangan",
  "**Kebutuhan.** Dua instance membuat 20 dari 24 percobaan lolos penahan per alamat, padahal batasnya 10 (`batas.txt` bagian A). Penahan itu melindungi hash password dari banjir. Kunci akun di database tetap menahan tebakan ke satu akun di 5 (bagian D).",
  "Beban penghitung kecil. Puncak request «rps» per detik (Asumsi, rumus di [[t3-prd]]). Bila semuanya login, ada paling banyak «operasi» operasi Redis per detik (Hitungan: 2 key per login × «rps»).",
  "**Status:** diterima sesudah M22 (minggu 6), memakai dua instance dari ADR 26 ([[t3-dua-instance]]). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR. ADR ini menyimpang dari syarat kedua ADR 21: counter di PostgreSQL belum diukur ([[t2-adr-21]]).",
  "| | A. Counter di PostgreSQL | B. Sticky session di proxy | C. Batas dibagi N | D. Hitungan di Redis |\n|---|---|---|---|---|\n| Cara kerja | Satu baris per key. `INSERT ... ON CONFLICT DO UPDATE` menaikkan hitungan, dan kolom waktu menandai jendela | Proxy mengirim satu alamat selalu ke instance yang sama (`ip_hash` atau `client_ip_hash` di Caddy), jadi bucket di memori cukup | Tiap instance memakai batas «batasIP» ÷ 2 = «dibagi» per alamat, dihitung dari jumlah instance | Satu hitungan per key di Redis, dinaikkan lewat skrip atomik oleh semua instance. Redis mati berarti bucket lokal |\n| Kelebihan | Tanpa komponen baru. Dokumentasi PostgreSQL menjamin hasil atomik untuk `ON CONFLICT DO UPDATE` | Tanpa komponen baru dan tanpa panggilan jaringan per login | Tanpa komponen baru dan tanpa panggilan jaringan per login | Satu jatah untuk semua instance (bagian E). Beban tulis percobaan ditolak tidak sampai ke database uang |\n| Kekurangan | Tiap percobaan, juga yang ditolak, menulis baris di database yang menyimpan jurnal. GitHub menolak opsi ini untuk batas API karena tidak mau menambah tulis ke primary MySQL | Menyamakan jatah per alamat saja. Satu akun yang diserang dari banyak alamat tetap tersebar di semua instance. `ip_hash` memakai alamat peer langsung, jadi di belakang CDN atau proxy lain semua client masuk ke satu instance | Batas efektif antara «efektifMin» dan «batasIP»: dengan pembagian acak, tiap instance menolak di «dibagi» walau total di bawah «batasIP». Jumlah instance masuk konfigurasi | Komponen baru yang bisa mati. Jendela tetap kasar di batas dua jendela. Satu panggilan jaringan per pemeriksaan |\n| Biaya operasional | Tabel kecil, tetapi butuh pembersihan baris lama dan ikut beban database yang sama | Aturan proxy dan uji bila instance bertambah | Ubah konfigurasi tiap kali jumlah instance berubah | Layanan Redis untuk dipasang, dipantau, dan dicadangkan, dengan keputusan persistence dan batas memori |\n| Bukti | Tidak dijalankan. Dokumentasi PostgreSQL 17 dan artikel GitHub | Tidak dijalankan. Dokumentasi Caddy | Hitungan: 5 + 5 = «sampaiE» dengan round_robin dan antara «efektifMin» dan «sampaiE» dengan acak. Tidak dijalankan | Rekaman lab `batas.txt` bagian E sampai J |",
  "**Keputusan: opsi D.** Enam aturan:",
  "1. Hitungan login per alamat dan per akun hidup di Redis. Jendelanya tetap «jendelaDetik» detik, dengan batas «batasIP» per alamat dan «batasAkun» per akun (bagian E dan G).\n2. Menaikkan hitungan dan memasang masa berlaku dalam satu skrip atomik. Dua perintah terpisah tidak dipakai (bagian H).\n3. Batas waktu «timeoutMs» milidetik untuk satu pemeriksaan, tanpa retry. Bila panggilan gagal, pemeriksaan memakai bucket lokal. Tiap penghitung menulis satu baris log saat mulai gagal dan satu baris saat pulih (bagian I dan J).\n4. Redis hanya menyimpan hitungan. Tidak ada uang, sesi, atau queue di sana, dan hilangnya semua key hanya membuka jendela baru.\n5. Alamat client dibaca dari `X-Forwarded-For` hanya bila koneksi datang dari proxy yang tepercaya. Aturan ini belum ada di kode lab, jadi sebelum itu ada, semua karyawan berbagi satu key per alamat dan ADR ini tidak menutup M22 sepenuhnya.\n6. Jumlah pemeriksaan yang jatuh ke bucket lokal dipantau, dan lonjakannya menjadi alert. Lab sudah menghitungnya di `/lab/batas`, tetapi belum ada alert.",
  "**Kenapa D, bukan A, B, atau C.**",
  "- **A tidak dipilih** karena percobaan yang ditolak ikut menulis baris di database yang menyimpan jurnal, dan penyerang menentukan lajunya. Bebannya sendiri kecil, jadi alasan ini penalaran, bukan ukuran. Opsi ini sah bila Redis ternyata tidak diperlukan.\n- **B ditolak** karena hanya menyamakan jatah per alamat, dan di belakang proxy lain alamat itu sama untuk semua client. Per akun tetap tersebar di semua instance.\n- **C ditolak** karena batas efektifnya tidak lagi sama dengan yang ditulis di konfigurasi, dan jumlah instance harus dikawinkan dengan konfigurasi.",
  "**Kasus industri: GitHub.** Tulisan insinyur GitHub (2021-04-05, diperbarui 2023-03-23) menceritakan pemindahan rate limiter API dari Memcached ke Redis. Alasannya: Memcached akan dipecah per datacenter, sehingga limiter berperilaku aneh bila request dirutekan ke datacenter berbeda. Cache bersama itu juga kadang membuang data limiter yang masih aktif.",
  "Logika penyimpanan ditulis dalam Lua untuk menjamin atomisitas. Key-value store di MySQL ditolak karena tulisnya menambah beban primary MySQL yang sudah sibuk ([GitHub Blog: sharded, replicated rate limiter in Redis](https://github.blog/engineering/infrastructure/how-we-scaled-github-api-sharded-replicated-rate-limiter-redis/), dibuka «tanggal»).",
  "Batasnya: ini satu produk dengan banyak server dan beberapa datacenter, dan Redis mereka dipecah di sisi aplikasi dengan primary dan replika. Tulisan itu tidak menyebut jumlah request, jadi tidak ada angka untuk dibandingkan dengan «rps» per detik.",
  "Sesudah rilis ada dua bug. Nilai `X-RateLimit-Reset` bergoyang karena dihitung dari TTL Redis. Penolakan juga muncul dengan sisa jatah penuh, karena replika belum membuang key yang kedaluwarsa. Lab ini memakai satu Redis tanpa replika, jadi bug kedua tidak berlaku di sini.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Key penghitung terbuang. Redis yang memori penuh bisa membuang key hitungan, dan penyerang mendapat jendela baru. GitHub menulis cache bersama yang membuang data limiter sebagai salah satu alasan pindah. Lab tidak mengatur `maxmemory`, jadi ini Tidak dijalankan. Pencegahannya Redis khusus untuk hitungan, terpisah dari cache katalog ([[t3-cache]]), dengan batas memori dan alert pemakaian memori.\n2. Redis mati atau menggantung lama tanpa ada yang tahu. Login tetap dijawab, tetapi batas diam-diam kembali ke N kali lipat, dan log hanya menulis satu baris per perubahan keadaan. Pencegahannya aturan 6: alert jumlah pemeriksaan yang jatuh ke bucket lokal.\n3. Alamat client salah. Tanpa aturan 5, satu penyerang menolak login semua karyawan. Dengan `X-Forwarded-For` yang dipercaya dari sembarang sumber, penyerang mengganti alamat di tiap request ([[t2-login-aman]]). Pencegahannya aturan 5 dan satu tes dengan dua client yang alamatnya berbeda, yang belum bisa direkam di lab.",
  "**Kapan keputusan ini salah.**",
  "- Saat counter di PostgreSQL ternyata cukup. Ukur W operasinya lebih dulu, lalu cabut Redis bila tidak ada komponen lain yang memakainya.\n- Saat Redis menjadi komponen kritis tanpa cadangan, atau key penting terbuang saat memori penuh.\n- Di belakang proxy tanpa `X-Forwarded-For` dari proxy tepercaya. Semua client berbagi satu key per alamat, dan satu penyerang bisa menolak login semua orang (dari mekanismenya, tidak direkam).\n- Saat jendela tetap terlalu kasar: batas dua jendela mengizinkan 2 × «batasIP» percobaan dalam selang pendek. Pindah ke sliding window atau token bucket di skrip yang sama.",
  "**Yang akan merevisinya.** [[t3-cache]] (ADR 28) menambah komponen kedua yang memakai Redis, dan membuka soal memori dan eviction. Tahap 4 membawa gateway dan penolakan per merchant, yang butuh batas dengan key baru. Pengukuran counter PostgreSQL bisa membatalkan ADR ini.",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |\n|---|---|---|\n| Penahan `/kiriman` di Redis | Hanya login yang berpindah. Penahan kiriman tetap bucket di memori dan berlipat bersama jumlah instance (penalaran dari kode, tidak direkam) | Belum dijadwalkan |\n| Sliding window atau token bucket di Redis | Jendela tetap cukup untuk «batasIP» percobaan per «jendelaDetik» detik, dan kasarnya di batas jendela sudah ditulis | Bila serangan di batas jendela terbukti |\n| Redis dengan replika atau cluster | Redis mati tidak menghapus batas: bucket lokal tetap berlaku (bagian I), jadi ketersediaan Redis tidak dibeli sekarang | Belum dijadwalkan |\n| Autentikasi dan TLS ke Redis | Lab hanya memasang Redis di 127.0.0.1 tanpa autentikasi (README lab) | Belum dijadwalkan |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** Dua instance menyimpan bucket di memori, batas per alamat «batasIP». Satu alamat mengirim «nCoba» percobaan ke «nCoba» akun. Berapa yang sampai ke pemeriksaan password, dan berapa bila hitungannya di Redis?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "«sampaiA» dengan bucket di memori, «sampaiE» dengan Redis. Tiap instance menyimpan bucket sendiri, jadi dua instance memberi dua jatah «batasIP». Redis menaikkan satu key yang sama, jadi jatahnya satu (`batas.txt` bagian A dan E).",
  "</details>",
  "**2.** Kenapa `INCR` dan `PEXPIRE` dijalankan sebagai satu skrip Lua?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Bila proses mati di antara dua perintah, key tinggal tanpa masa berlaku dan menghitung selamanya. Bagian H merekam `PTTL` `-1` sesudah `INCR` saja. Dalam satu skrip, Redis menjalankan keduanya tanpa disela perintah lain.",
  "</details>",
  "**3.** Redis dihentikan di tengah percobaan. Apa yang terjadi pada login?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Login tetap dijawab, dan batas jatuh ke bucket lokal: «sampaiI» dari «nCoba» percobaan sampai ke pemeriksaan password, sama dengan bagian A. Tiap penghitung menulis satu baris log saat gagal dan satu baris saat Redis pulih (bagian I).",
  "</details>",
  "**4.** Karyawan di dua HP berbeda login lewat proxy yang sama, dan api-t3 belum membaca `X-Forwarded-For`. Berapa key per alamat yang mereka pakai?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Satu: handler membaca alamat koneksi, dan itu alamat proxy untuk semua client. Batas «batasIP» per menit berlaku untuk keduanya sekaligus. Lab tidak merekam dua client yang berbeda, jadi ini dibaca dari kode `clientIP`.",
  "</details>",
  "**5.** App menerima 429 dengan `Retry-After: 40` dari login. Apa yang sebaiknya dilakukan app?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Menampilkan \"coba lagi dalam 40 detik\" dan menunda percobaan berikutnya. Retry langsung hanya menghasilkan 429 lagi, dan hitungan di Redis naik juga untuk percobaan yang ditolak (`batas.txt` bagian E). Angka 40 adalah contoh: nilainya sisa jendela, antara 1 dan «jendelaDetik» detik.",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] Hitungan rate limit untuk lebih dari satu instance hidup di tempat bersama, dan bukan di memori satu proses.\n- [ ] Menaikkan hitungan dan memasang masa berlaku satu operasi atomik, bukan dua perintah terpisah.\n- [ ] Ada batas waktu untuk setiap panggilan ke store, dan ada aturan tertulis saat store gagal: tolak, izinkan, atau jatuh ke batas lokal.\n- [ ] Alamat client dibaca dari proxy yang tepercaya, dan diuji dengan dua client yang berbeda di belakang proxy.\n- [ ] Kegagalan store dihitung dan menjadi alert, bukan hanya ditulis satu kali di log.\n- [ ] Key di store tidak memuat email atau alamat sebagai teks biasa. Redis untuk rate limit tidak berbagi memori dengan cache yang boleh dibuang.",
  "### Bacaan lanjut",
  "- [Redis: INCR](https://redis.io/docs/latest/commands/incr/)\n- [Redis: scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)\n- [GitHub Blog: sharded, replicated rate limiter in Redis](https://github.blog/engineering/infrastructure/how-we-scaled-github-api-sharded-replicated-rate-limiter-redis/) (2021-04-05)\n- [Caddy: reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)\n- [PostgreSQL 17: INSERT](https://www.postgresql.org/docs/17/sql-insert.html)\n- [Django REST framework: Throttling](https://www.django-rest-framework.org/api-guide/throttling/)",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
const unitHalaman = halaman.trim().split(/\n{2,}/);

describe("halaman 3.17: isi dikunci unit demi unit, nilai diturunkan dari sumber", () => {
  test("frontmatter, meta, dan registry", () => {
    const h = (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string; adr?: number[]; topik?: string; masalah?: string }[]).find((x) => x.id === "t3-rate-limit-redis")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran, h.path, h.adr, h.topik]).toEqual(["3.17", "konsep", 4, true, ["t3-instance"], ["t3-m22"], ["devops", "security", "backend"], "tahap-3/rate-limit-redis.md", [27], "Keamanan"]);
    expect(h.judul).toBe("Rate limit lintas instance dan Redis + ADR 27");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(frontmatter).toContain(
      "description: Hitungan batas login pindah dari memori tiap instance ke satu hitungan di Redis, dan login tetap dijawab saat Redis mati. ADR 27 menimbang tiga cara lain dan menulis kapan pilihan ini salah.",
    );
    expect(naskah).toMatch(/\| 3\.17 \| 4 \| Rate limit lintas instance dan Redis \+ ADR 27 \| Konsep \+ ADR \| ★ \| t3-instance \|/);
    expect(meta).not.toBeNull();
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(Number(meta[2])).toBe(3);
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
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca; satu bentuk per angka; tanpa lisensi dan merek di luar sumber", () => {
    const tampil = halaman + JSON.stringify(rantaiMentah) + skenarioMentah;
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/\bPR ?#?\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(hitung(halaman, /17,36/g)).toBe(3); // Kebutuhan, rumus 2 × 17,36, dan kasus industri
    expect(halaman).not.toMatch(/\b17,4\b|\b0,87\b/);
    expect(Number(rpsPrd.replace(",", "."))).toBe(Math.round(rpsNilai * 100) / 100);
    expect(halaman.replace(/code=\{`[\s\S]*?`\}/g, "")).not.toMatch(/\bkita\b|\bAnda\b|!|\p{Extended_Pictographic}/u);
    expect(halaman).not.toMatch(/AGPL|Valkey|lisensi/i); // catatan lisensi hanya di badan PR (PERLU-DICEK-PEMILIK)
  });
});

describe("rekaman batas.txt: angka di halaman, widget, dan diagram", () => {
  test("A: dua instance, bucket di memori, round_robin: 20 sampai, 4 ditolak, 10 per instance; B: satu instance 10 dan 14", () => {
    expect([nCoba, Number(mA[2]), Number(mA[3])]).toEqual([24, 20, 4]);
    expect([Number(perA[1]), Number(perA[2]), Number(perA[3]), Number(perA[4])]).toEqual([10, 10, 2, 2]);
    expect(judulBagian("A") >= 0 && barisBatas[judulBagian("A")]).toContain("round_robin: 24 percobaan ke 24 akun berbeda dari satu alamat");
    expect([Number(mB[1]), Number(mB[2])]).toEqual([batasIP, nCoba - batasIP]);
    expect(Number(mA[2])).toBe(2 * batasIP);
  });
  test("E: satu hitungan di Redis: 10 sampai, 14 ditolak, 5 dari tiap instance, hitungan 24, satu key alamat, sepuluh key akun, key berisi hash", () => {
    expect([Number(mE[1]), Number(mE[2]), Number(mE[3])]).toEqual([24, 10, 14]);
    expect([Number(perE[1]), Number(perE[2]), Number(perE[3]), Number(perE[4])]).toEqual([5, 5, 7, 7]);
    expect(Number(mE[2])).toBe(batasIP);
    expect([Number(hitE[1]), Number(hitE[2]), Number(keyIP[1]), Number(keyAkun[1])]).toEqual([24, 60, 1, 10]);
    expect(Number(bersamaE[1])).toBe(nCoba / 2);
    expect(E.join("\n")).toContain("key berisi hash alamat dan email, bukan teksnya: ya");
    expect(E.join("\n")).toContain(`Redis: key per akun ${keyAkun[1]} (hanya ${mE[2]} percobaan yang lolos penahan per IP sampai ke pemeriksaan akun)`);
    expect(Number(mF[2])).toBe(Number(mE[2])); // kebijakan random bawaan: hasil sama
    expect(barisBatas[judulBagian("F")]).toContain("kebijakan random bawaan Caddy: hasilnya tetap 10");
  });
  test("D dan G: kunci akun di database tidak berlipat, gagal_login berhenti di 5 dengan dan tanpa Redis", () => {
    expect(Number(gagalLogin[1])).toBe(batasAkun);
    expect(D.join("\n")).toMatch(/dua instance \(round_robin\), 12 tebakan ke satu akun dari satu alamat → 401: 10 · 429: 2/);
    expect(D.filter((b) => /^ 5 +\| t$/.test(b))).toHaveLength(2);
    expect(G.join("\n")).toContain("12 tebakan ke satu akun → 401: 5 · 429: 7");
  });
  test("H: INCR saja menghasilkan PTTL -1; skrip Lua memasang masa berlaku dalam satu perintah", () => {
    expect(H.join("\n")).toContain("INCR rekeningo:rl:demo → 1; PTTL → -1 (-1: tanpa masa berlaku; bila proses mati sebelum EXPIRE, key ini menghitung selamanya)");
    expect(barisBatas[judulBagian("H")]).toContain("INCR lalu EXPIRE sebagai dua perintah");
    expect(runPy).toContain('r.incr("rekeningo:rl:demo")');
  });
  test("I: Redis mati: login tetap dijawab, batas jatuh ke bucket lokal (sama dengan A), satu baris log per penghitung saat gagal dan saat pulih", () => {
    expect([Number(mI[1]), Number(mI[2]), Number(mI[3])]).toEqual([24, Number(mA[2]), Number(mA[3])]);
    expect(barisBatas[judulBagian("I")]).toContain("Redis mati (kontainer dihentikan): batas jatuh ke bucket lokal, login tidak ikut mati");
    expect(I.join("\n")).toContain('GET /lab/batas instance a → {"akun": {"bersama": 0, "lokal": 10}, "ip": {"bersama": 0, "lokal": 12}, "mode": "redis"}');
    expect(I.join("\n")).toContain("log instance a: batas bersama rekeningo:rl:login:ip: gagal: memakai bucket lokal | batas bersama rekeningo:rl:login:akun: gagal: memakai bucket lokal");
    expect(I.join("\n")).toMatch(/log instance a: .*gagal: memakai bucket lokal \| batas bersama rekeningo:rl:login:ip: pulih \| batas bersama rekeningo:rl:login:akun: pulih$/m);
    expect(Number(baruI[1])).toBe(6);
    expect(Number(baruI[2])).toBe(6);
    expect(runPy).toContain('redis_aksi("stop")');
  });
  test("J: Redis dibekukan: 50 ms selesai kurang dari 1 detik, bawaan go-redis lebih dari 5 detik; waktu pastinya tidak direkam", () => {
    expect(barisBatas[judulBagian("J")]).toContain("Redis menggantung (kontainer dibekukan): batas waktu 50 ms lawan bawaan go-redis");
    expect(J.join("\n")).toContain("-redis-timeout 50ms (bawaan lab): satu login → 401, selesai dalam kurang dari 1 detik: ya");
    expect(J.join("\n")).toContain("-redis-timeout 0 (bawaan go-redis: 5 detik dan 3 retry): satu login → 401, butuh lebih dari 5 detik: ya");
    expect(runPy).toContain('redis_aksi("pause")');
    expect(runPy).toContain("(tidak direkam) lama login");
    expect(readmeLab).toContain("Waktu pastinya bergantung pada mesin dan tidak direkam.");
    expect(readmeLab).toContain("Redis tanpa autentikasi.");
    expect(composeLab).toContain("caddy:2.11.7-alpine");
    expect([timeoutMs, Number(bawaanGo[1]), Number(bawaanGo[2])]).toEqual([50, 5, 3]);
  });
  test("kepala rekaman: satu key per alamat di belakang proxy, header X-Forwarded-For belum dibaca; README lab: dua client tidak direkam", () => {
    expect(barisBatas.slice(0, 7).join("\n")).toContain("jadi seluruh client di belakang proxy berbagi satu key per IP; X-Forwarded-For belum dibaca (lihat README)");
    expect(readmeLab).toContain("lab tidak bisa membedakan dua client lewat proxy di Docker Desktop, jadi perilaku ini tidak direkam");
    expect(readmeLab).toContain("Penahan kiriman.** Hanya login yang berpindah ke Redis. Penahan `/kiriman` masih bucket di memori.");
    expect(batasTxt).not.toMatch(/dua client|client kedua/i); // klaim negatif berlingkup: rekaman ini tidak punya dua client
  });
});

describe("kode lab: skrip, jendela, fallback, batas waktu, alamat client", () => {
  test("rentang Snippet diturunkan dari jangkar fungsi; tanpa ID riset, nomor keputusan, atau PR di dalamnya", () => {
    const sumber = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"/g)].map((m) => ({ file: m[1]!, rentang: `${m[2]}:${m[3]}` }));
    expect(sumber).toEqual([
      { file: "labs/api-t3/internal/redisbatas/redisbatas.go", rentang: V.skripRentang },
      { file: "labs/api-t3/internal/service/batas_bersama.go", rentang: V.izinkanRentang },
      { file: "labs/api-t3/internal/redisbatas/redisbatas.go", rentang: V.bukaRentang },
      { file: "labs/api-t3/internal/handler/handler.go", rentang: V.alamatRentang },
      { file: "labs/api-t3/internal/service/batas_bersama.go", rentang: V.antarmukaRentang },
    ]);
    const salinan: Record<string, string[]> = { "labs/api-t3/internal/redisbatas/redisbatas.go": kodeRb, "labs/api-t3/internal/service/batas_bersama.go": kodeBg, "labs/api-t3/internal/handler/handler.go": kodeHd };
    for (const s of sumber) {
      const [a, b] = s.rentang.split(":").map(Number);
      const kode = salinan[s.file]!.slice(a! - 1, b!).join("\n");
      expect(kode, s.rentang).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,3}\b|keputusan \d{3,4}/);
    }
    expect(kodeRb.slice(Number(String(V.skripRentang).split(":")[0]) - 1, Number(String(V.skripRentang).split(":")[1])).join("\n")).toContain("redis.call('INCR', KEYS[1])");
    expect(kodeHd.slice(Number(String(V.alamatRentang).split(":")[0]) - 1, Number(String(V.alamatRentang).split(":")[1])).join("\n")).toContain("net.SplitHostPort(r.RemoteAddr)");
  });
  test("skrip Lua: INCR, lalu PEXPIRE hanya bila key baru atau tanpa masa berlaku; mengembalikan hitungan dan PTTL; masa berlaku tidak diperpanjang", () => {
    expect(rbGo).toContain("local n = redis.call('INCR', KEYS[1])");
    expect(rbGo).toContain("if n == 1 or redis.call('PTTL', KEYS[1]) < 0 then");
    expect(rbGo).toContain("redis.call('PEXPIRE', KEYS[1], ARGV[1])");
    expect(rbGo).toContain("return {n, redis.call('PTTL', KEYS[1])}");
    expect(hitung(rbGo, /PEXPIRE/g)).toBe(1);
    expect(hitung(rbGo, /EXPIRE\(/g)).toBe(0);
    expect(rbGo).toContain("jendela.Milliseconds()");
    expect(bg).toContain("const JendelaLogin = time.Minute");
    expect(Number(hitE[2])).toBe(60);
  });
  test("Izinkan: Redis dipanggil lebih dulu di setiap pemeriksaan, gagal berarti bucket lokal, n di atas batas ditolak, Retry-After paling sedikit 1 detik; tanpa circuit breaker", () => {
    const f = bg.slice(bg.indexOf("func (p *PembatasBersama) Izinkan"), bg.indexOf("// Statistik:"));
    const urut = ["p.hitung.Naik(", "if err != nil {", "return p.lokal.Izinkan(key, kini)", "if n > p.batas {", "return false, max(sisa, time.Second)", "return true, 0"];
    let pos = 0;
    for (const u of urut) {
      const i = f.indexOf(u, pos);
      expect(i, u).toBeGreaterThanOrEqual(pos);
      pos = i;
    }
    expect(bg).toContain("if !p.macet.Swap(true) { // satu baris saat mulai gagal, bukan satu baris per login");
    expect(bg).toContain('log.Printf("batas bersama %s pulih", p.awalan)');
    expect(bg).toContain("Jendela tetap: paling banyak `batas` percobaan per");
    expect(bg).toContain("di batas dua jendela, paling banyak\n// 2 × batas lolos dalam selang pendek");
    // klaim negatif berlingkup: tidak ada circuit breaker di kode non-tes api-t3 (folder labs/api-t3)
    const go = [...(terlacak ?? [])].filter((f2) => f2.startsWith("labs/api-t3/") && f2.endsWith(".go") && !f2.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(10);
    for (const f2 of go) expect(baca(f2), f2).not.toMatch(/circuit ?breaker|gobreaker|sony\/gobreaker/i);
    expect(halaman).toContain("tidak ada jadwal pemulihan dan tidak ada circuit breaker (dibaca dari kode)");
  });
  test("batas waktu: satu batas untuk dial, tulis, baca, antre pool; retry mati; context; bawaan go-redis v9.23.0 dari go.mod dan baris riset", () => {
    expect(rbGo).toContain("o.DialTimeout, o.ReadTimeout, o.WriteTimeout, o.PoolTimeout = timeout, timeout, timeout, timeout");
    expect(rbGo).toContain("o.MaxRetries = -1");
    expect(rbGo).toContain("o.ContextTimeoutEnabled = true");
    expect(bg).toContain("ctx, batal = context.WithTimeout(ctx, p.timeout)");
    expect(mainGo).toContain('flag.Duration("redis-timeout", 50*time.Millisecond');
    expect(goRedis).toBe("v9.23.0");
    const r180 = barisRiset("R3-180");
    expect(r180).toContain("go-redis v9.23.0");
    expect(r180).toContain("DialTimeout 5 detik, ReadTimeout 5 detik");
    expect(r180).toContain("MaxRetries bawaan 3 (-1 mematikan)");
    expect(r180).toContain("`Script.Run` memanggil EVALSHA lalu EVAL bila NOSCRIPT");
  });
  test("dua pemeriksaan per login: alamat di handler, akun di service; keduanya penghitung bersama dengan awalan Redis sendiri", () => {
    expect(mainGo).toMatch(/batasIP = service\.PembatasBersamaBaru\(k, "rekeningo:rl:login:ip:", int\(service\.AmbangLoginIP\[0\]\), service\.JendelaLogin,/);
    expect(mainGo).toMatch(/batasAkun = service\.PembatasBersamaBaru\(k, "rekeningo:rl:login:akun:", int\(service\.AmbangLoginAkun\[0\]\), service\.JendelaLogin,/);
    expect(sesiGo).toContain("s.loginAkun.Izinkan(strings.ToLower(email), kini)");
    expect(hdGo).toContain("p.Izinkan(service.KunciAlamat(clientIP(r)), s.svc.Kini())");
    expect(bg).toContain("func kunciRedis(key string) string");
    expect(bg).toContain("h := sha256.Sum256([]byte(key))");
    expect(bg).toContain("supaya MONITOR,\n// KEYS, dan berkas cadangan Redis tidak memuat email");
  });
  test("alamat client: handler membaca RemoteAddr; X-Forwarded-For hanya muncul di komentar kode non-tes api-t3; Caddy lab tanpa trusted_proxies", () => {
    expect(hdGo).toContain("ip, _, err := net.SplitHostPort(r.RemoteAddr)");
    expect(hdGo).toContain("di belakang proxy, RemoteAddr adalah alamat proxy untuk semua client, jadi semuanya berbagi satu key per IP");
    const go = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    const pakai: string[] = [];
    for (const f of go) {
      for (const [i, b] of baca(f).split("\n").entries()) {
        if (/X-Forwarded-For|Header\.Get\("X-Real/i.test(b) && !b.trim().startsWith("//")) pakai.push(`${f}:${i + 1}`);
      }
    }
    expect(pakai).toEqual([]);
    const caddy = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/t3-instance/caddy/"));
    expect(caddy.length).toBeGreaterThan(2);
    for (const f of caddy) expect(baca(f), f).not.toMatch(/trusted_proxies/);
    expect(setelah).toContain("Baca `X-Forwarded-For` dari proxy tepercaya di `clientIP` api-t3");
  });
});

describe("hitungan: beban penghitung dan pembagian batas", () => {
  test("34,72 = 2 × 17,36 (batas atas bila semua request puncak adalah login); 17,36 dari PRD v3 dan rumusnya", () => {
    expect(operasi).toBe("34,72");
    expect(rpsNilai.toFixed(2)).toBe("17.36");
    expect(prd).toContain("150.000 ÷ 86.400 × 10 = 17,36 (asumsi)");
  });
  test("batas dibagi 2: round_robin menghasilkan 5 + 5 = 10, pembagian acak antara 5 dan 10; sesuai tabel ADR", () => {
    expect(dibagi).toBe(5);
    expect(efektif(nCoba / 2)).toBe(Number(mE[2]));
    expect([efektifMin, efektifMaks]).toEqual([5, 10]);
    expect(halaman).toContain(`Hitungan: 5 + 5 = ${mE[2]} dengan round_robin dan antara ${efektifMin} dan ${mE[2]} dengan acak. Tidak dijalankan`);
  });
});

describe("widget alur t3-batas-redis.json: valid, nilai dari rekaman dan kode, tebakan, varian, catatan sumber", () => {
  const d = core.normalize(skenario);
  const semua = (): Langkah[] => skenario.langkah.concat(skenario.varian.langkah);
  test("valid menurut alur-core; lima komponen; sumber rekaman batas.txt; tujuh langkah utama dan empat langkah varian mulai di langkah ke-3", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t3-instance/output/batas.txt", fileVarian: "labs/t3-instance/output/batas.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["client", "Client (satu alamat)"], ["proxy", "Proxy (round_robin)"], ["a", "Instance a"], ["b", "Instance b"], ["redis", "Redis"]]);
    expect(skenario.langkah).toHaveLength(7);
    expect(skenario.varian.langkah).toHaveLength(4);
    expect(skenario.varian.mulai).toBe(2);
    expect(skenario.varian.label).toBe("Redis mati");
    expect(halaman).toContain("<WidgetLama nama=\"alur\" src=\"data/skenario/t3-batas-redis.json\" />");
    expect(halaman).toContain("centang **Ubah satu hal: Redis mati**");
    expect(halaman).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
    expect(skenario.judul).toBe("Satu alamat, dua instance, satu hitungan di Redis");
  });
  test("tebakan: empat pilihan dengan angka dari rekaman; jawaban benar 10 (bagian E), bukan pilihan pertama, keempat, atau paling panjang", () => {
    const o = skenario.predict.options;
    expect(o).toHaveLength(4);
    expect(o.map((x) => Number(x.split(":")[0]))).toEqual([nCoba, Number(mA[2]), Number(mE[2]), Number(bersamaE[1])]);
    expect(skenario.predict.answer).toBe(2);
    expect(Number(o[skenario.predict.answer]!.split(":")[0])).toBe(Number(mE[2]));
    expect(skenario.predict.answer).not.toBe(0);
    expect(skenario.predict.answer).not.toBe(o.length - 1);
    expect(Math.max(...o.map((x) => x.length))).toBeGreaterThan(o[skenario.predict.answer]!.length);
    expect(skenario.predict.varian).toBe(false);
    expect(skenario.predict.q).toContain(`${nCoba} percobaan login ke ${nCoba} akun berbeda`);
    expect(skenario.predict.q).toContain(`batas per alamat ${batasIP}`);
    expect(skenario.predict.explain).toBe(`Sepuluh (batas.txt bagian E): 401 sepuluh kali, ${perE[1]} dari tiap instance, dan ${mE[3]} percobaan ditolak 429. Dua instance menaikkan satu key yang sama di Redis, jadi jatahnya satu, bukan dua.`);
    expect(perE[1]).toBe(perE[2]);
    expect(halaman).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
  });
  test("kirim: setiap langkah dari rekaman E atau I, atau dari kode lab (langkah 3), dan angkanya sama dengan rekaman", () => {
    const L = skenario.langkah;
    const V2 = skenario.varian.langkah;
    expect(L[0]!.kirim).toBe(`${nCoba} × POST /login ke ${nCoba} akun berbeda, password salah`);
    expect(barisBatas[judulBagian("E")]).toContain(`round_robin: ${nCoba} percobaan ke ${nCoba} akun`);
    expect(L[1]!.kirim).toBe(`round_robin: ${bersamaE[1]} percobaan ke a, ${bersamaE[1]} ke b`);
    expect(E.filter((b) => b.startsWith("GET /lab/batas instance")).every((b) => b.includes(`"ip": {"bersama": ${bersamaE[1]}, "lokal": 0}`))).toBe(true);
    expect(L[2]!.kirim).toBe("EVAL skrip: INCR key alamat, PEXPIRE bila key baru, kembalikan hitungan dan sisa masa berlaku");
    expect(batasTxt).not.toContain(L[2]!.kirim); // langkah 3 dibaca dari kode, bukan rekaman
    expect(rbGo).toContain("return {n, redis.call('PTTL', KEYS[1])}");
    expect(L[3]!.kirim).toBe(`hitungan 1 sampai ${hitE[1]} untuk satu key, sisa jendela antara 1 dan ${hitE[2]} detik`);
    expect(L[4]!.kirim).toBe(`${mE[2]} percobaan → 401 (${perE[1]} dari a, ${perE[2]} dari b)`);
    expect(L[5]!.kirim).toBe(`${mE[3]} percobaan → 429 (${perE[3]} dari a, ${perE[4]} dari b)`);
    expect(L[6]!.kirim).toBe(`${keyIP[1]} key per alamat (hitungan ${hitE[1]}), ${keyAkun[1]} key per akun, key berisi hash`);
    expect(V2[0]!.kirim).toBe("docker compose stop redis, lalu EVAL skrip → gagal");
    expect(V2[1]!.kirim).toBe("log: batas bersama: gagal: memakai bucket lokal (satu baris per penghitung, alamat dan akun)");
    expect(I.join("\n")).toContain("gagal: memakai bucket lokal | batas bersama rekeningo:rl:login:akun:");
    expect(V2[2]!.kirim).toBe(`${nCoba} percobaan → 401: ${mI[2]} · 429: ${mI[3]} (sama dengan bucket di memori, bagian A)`);
    expect(I.join("\n")).toContain(`${V2[2]!.kirim.split(" (")[0]}`);
    expect(V2[3]!.kirim).toBe(`${baruI[1]} percobaan baru → 401: ${baruI[2]}; instance a menjawab dengan hitungan bersama lagi`);
    expect(semua().every((l) => !l.kirim.includes("\n"))).toBe(true);
  });
  test("catatan sumber menyebut langkah 3 dan 4 sebagai kode, bukan rekaman, dan hanya itu; jelas langkah 4 memuat klaim kode (PEXPIRE hanya saat key baru)", () => {
    const c = skenario.sumber.catatan;
    expect(c).toContain("Langkah 3 dan 4 memuat hal yang dibaca dari kode lab, bukan dari rekaman");
    expect(c).toContain("labs/api-t3/internal/redisbatas/redisbatas.go");
    expect(c).toContain("jendela yang tidak diperpanjang percobaan yang ditolak (PEXPIRE hanya dipasang saat key baru)");
    expect(c).toContain("Rekaman E hanya mencatat hitungan 24 dan sisa jendela antara 1 dan 60 detik");
    expect(c).toContain("batas.txt bagian E");
    expect(c).toContain("batas.txt bagian I");
    expect(skenario.langkah[3]!.jelas).toContain("karena masa berlaku hanya dipasang saat key baru");
    expect(rbGo).toContain("if n == 1 or redis.call('PTTL', KEYS[1]) < 0 then");
    expect(halaman).toContain("Langkah 3 dan 4 memuat hal yang dibaca dari kode lab, bukan dari rekaman, dan catatan sumber di widget menyebutnya.");
  });
  test("komponen dan arah: a ke Redis, Redis ke a; varian memakai kata yang sama dengan rekaman I; angka di jelas sama dengan sumber", () => {
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? null])).toEqual([["client", "proxy"], ["proxy", "a"], ["a", "redis"], ["redis", "a"], ["a", "client"], ["a", "client"], ["redis", null]]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? null])).toEqual([["a", "redis"], ["a", null], ["a", "client"], ["redis", "a"]]);
    expect(skenario.langkah[0]!.jelas).toContain(`Batasnya ${batasIP}.`);
    expect(skenario.langkah[4]!.jelas).toContain(`${perE[1]} + ${perE[2]} = ${mE[2]}`);
    expect(skenario.langkah[5]!.jelas).toContain(`hanya ${keyAkun[1]} key per akun dibuat di Redis`);
    expect(skenario.langkah[6]!.jelas).toContain(`Key per alamat berhitungan ${hitE[1]}, bukan ${mE[2]}`);
    expect(skenario.varian.langkah[2]!.jelas).toContain(`${batasIP} di a dan ${batasIP} di b`);
    expect(skenario.langkah[1]!.jelas).toContain(`hasil di bagian F tetap ${mF[2]}`);
    expect(skenario.langkah.map((l) => l.nada ?? null)).toEqual([null, null, null, null, "good", null, null]);
    expect(skenario.varian.langkah.map((l) => l.nada ?? null)).toEqual(["warn", "warn", "warn", "good"]);
  });
});

describe("prosa widget dan diagram dikunci; teks registry", () => {
  test("pengantar, judul, pertanyaan, pilihan, judul dan jelas tiap langkah, dan judul diagram sama dengan yang dikunci; angkanya diperiksa di tes lain", () => {
    expect({
      pengantar: skenario.pengantar, judul: skenario.judul, q: skenario.predict.q, options: skenario.predict.options,
      utama: skenario.langkah.map((l) => [l.judul, l.jelas]), varian: skenario.varian.langkah.map((l) => [l.judul, l.jelas]), rantaiJudul: rantai.judul,
    }).toEqual(PROSA);
  });
  test("registry: masalah dan pendek sama dengan naskah bagian 5 dan peta; peran sesuai peta jalur", () => {
    const h = (registry.halaman as unknown as { id: string; masalah?: string; pendek?: string; peran?: string[] }[]).find((x) => x.id === "t3-rate-limit-redis")!;
    expect(h.masalah).toBe("Yang disimpan di memori satu proses berlipat saat prosesnya dua");
    expect(naskah).toContain("| State bersama | Yang disimpan di memori satu proses berlipat saat prosesnya dua | M22 |");
    expect(h.pendek).toBe("Rate limit lintas instance dan Redis");
    expect(baca("plan/RINGKAS.md")).toContain("devops 3.14, 3.15, 3.17, 3.26, 3.27; security 3.16, 3.17, 3.22–3.25");
  });
});

describe("diagram Rantai Inti dan halaman istilah", () => {
  test("Rantai: dua baris dari batas.txt A dan E; angka diturunkan; sumber rekaman; catatan", () => {
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-instance, batas.txt bagian A dan E" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Bucket di memori", "bagian A dari batas.txt"], ["Hitungan di Redis", "bagian E dari batas.txt"]]);
    expect(rantai.baris[0]!.simpul).toEqual([
      { teks: `${nCoba} percobaan`, sub: `satu alamat, ${nCoba} akun`, nada: "biasa", kode: false },
      { teks: "dua bucket", sub: `${perA[1]} di a, ${perA[2]} di b`, nada: "warn", kode: false },
      { teks: `${mA[2]} sampai password`, nada: "warn", kode: false },
    ]);
    expect(rantai.baris[1]!.simpul).toEqual([
      { teks: `${nCoba} percobaan`, sub: `satu alamat, ${nCoba} akun`, nada: "biasa", kode: false },
      { teks: "satu hitungan", sub: "satu key di Redis", nada: "biasa", kode: false },
      { teks: `${mE[2]} sampai password`, nada: "good", kode: false },
    ]);
    expect(rantai.catatan).toBe("Kotak oranye adalah penyebab batas berlipat. Proxy memakai round_robin supaya angkanya tetap.");
    expect(rantai.id).toBe("t3-rate-limit-redis-inti");
  });
  test("halaman istilah Jendela tetap: valid, rujukan ke 3.17 dan 2.28, rekaman dan riset ada, isi dikunci dengan sidik jari, angka dari rekaman", () => {
    const j = JSON.parse(baca("situs/data/halaman-istilah/jendela-tetap.json")) as { istilah: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; sumber: { riset?: string; rekaman?: string; catatan: string }[] };
    const d = HalamanIstilah.parse(j);
    expect(d.istilah).toBe("Jendela tetap (fixed window)");
    expect(d.cerita!.map((c) => c.rujukan)).toEqual(["t3-rate-limit-redis", "t2-login-aman"]);
    for (const x of d.sumber!) {
      if ("rekaman" in x) expect(fs.existsSync(path.join(akar, x.rekaman))).toBe(true);
      if (x.riset) expect(riset).toContain(`| ${x.riset} |`);
    }
    expect(sidik(JSON.stringify(j))).toBe(SIDIK_ISTILAH);
    expect(j.cerita[0]!.teks).toBe(`Hitungan login di Redis berlaku ${hitE[2]} detik sejak percobaan pertama. Untuk ${nCoba} percobaan dari satu alamat, hitungannya ${hitE[1]}, dan hanya ${mE[2]} yang sampai ke pemeriksaan password (\`batas.txt\` bagian E).`);
    expect(j.mekanisme[0]).toBe(`Percobaan pertama membuat key dengan hitungan 1 dan memasang masa berlaku jendela, ${hitE[2]} detik di lab.`);
    expect(j.mekanisme[1]).toContain(`Hitungan di atas batas, ${batasIP} per alamat, ditolak`);
    expect(j.sumber[1]!.catatan).toBe(`${nCoba} percobaan dari satu alamat: hitungan ${hitE[1]}, sisa jendela antara 1 dan ${hitE[2]} detik, dan ${mE[2]} yang sampai ke pemeriksaan password.`);
    expect(j.sumber[0]!.riset).toBe("R3-180");
  });
  test("glosarium: Jendela tetap menuju 3.17 dengan halaman istilah; Rate limit dan Token bucket tidak diubah (masih C4 lama, dilebur)", () => {
    const baris = (nama: string) => glosMdx.split("\n").find((b) => b.startsWith(`| **${nama}** `))!;
    expect(baris("Jendela tetap")).toBe("| **Jendela tetap** (fixed window) | Cara menghitung batas: hitungan mulai dari nol di awal jendela waktu, naik tiap percobaan, dan dibuang saat jendelanya habis. | [[t3-rate-limit-redis]] |");
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null; b: string | null }[];
    expect(glos.find((x) => x.t === "Jendela tetap (fixed window)")).toMatchObject({ h: "/istilah/jendela-tetap/", b: "t3-rate-limit-redis" });
    expect(baris("Rate limit")).toMatch(/\| \[\[C4\]\] \|$/);
    const h = registry.halaman as { id: string; lebur_ke?: string; lama?: boolean; ada: boolean }[];
    expect(h.find((x) => x.id === "C4")).toMatchObject({ ada: true, lama: true, lebur_ke: "t3-rate-limit-redis" });
    expect(fs.existsSync(path.join(akar, "situs/src/content/docs/c-operasional/c4-security-dasar.mdx"))).toBe(true);
  });
});

describe("sumber dokumentasi: baris riset R3-180 sampai R3-183, tanggal, versi, dan klaim negatif berlingkup", () => {
  const ids = ["R3-180", "R3-181", "R3-182", "R3-183"];
  test("empat baris ada sekali, urut sesudah R3-166, dibuka pada tanggal yang sama dengan halaman", () => {
    const urut = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => b.split("|")[1]!.trim());
    const i = urut.indexOf("R3-180");
    expect(urut.slice(i, i + 4)).toEqual(ids);
    expect(urut.indexOf("R3-166")).toBeLessThan(i);
    expect(new Set(urut).size).toBe(urut.length);
    for (const id of ids) expect(barisRiset(id), id).toContain(`dibuka ${tanggal}`);
    expect(halaman.match(/dibuka (\d{4}-\d{2}-\d{2})/g)!.every((x) => x === `dibuka ${tanggal}`)).toBe(true);
    expect(tanggal).toBe("2026-10-26");
  });
  test("isi baris riset dikunci dengan sidik jari; klaim kunci ada di baris yang dirujuk halaman", () => {
    const sj = Object.fromEntries(ids.map((id) => [id, sidik(barisRiset(id))]));
    expect(sj).toEqual(SIDIK_RISET);
    const r180 = barisRiset("R3-180");
    for (const k of ["there is a race condition", "skrip Lua lewat EVAL", "Redis guarantees the script's atomic execution", "NOSCRIPT", "SCRIPT FLUSH", "halaman latest tanpa nomor versi"]) expect(r180, k).toContain(k);
    const r181 = barisRiset("R3-181");
    for (const k of ["2021-04-05, diperbarui 2023-03-23", "satu per datacenter", "membuang data limiter yang masih aktif", "Lua untuk atomisitas", "tidak mau menambah tulis ke primary MySQL", "X-RateLimit-Reset bergoyang", "replika yang belum membuang key kedaluwarsa", "tidak menyebut jumlah request"]) expect(r181.replace("menjadi satu per datacenter", "satu per datacenter"), k).toContain(k);
    const r182 = barisRiset("R3-182");
    for (const k of ["express-rate-limit 8.7.1", "rate-limit-redis 6.0.1", "`passOnStoreError` bawaan `false`", "block (`false`, default) traffic if the store becomes unavailable", "'limiter' => 'redis'", "`RateLimiter::increment` atomik di store redis, memcached, atau database", "each process will have its own private cache instance", "Django 6.1.2", "djangorestframework 3.18.3", "bukan pengaman terhadap brute force", "a few extra requests", "README tidak menyebut jenis jendela"]) expect(r182, k).toContain(k);
    const r183 = barisRiset("R3-183");
    for (const k of ["Version: 4.0.0", "4.0.4", "The server does not warn you about this at normal logging levels, and the readiness probe still passes", "getConnection()", "5 percobaan per 5 menit", "halaman tidak menyebut tempat hitungan disimpan", "halaman tidak menyebut rate limiter bawaan", "`ip_hash` memetakan alamat peer langsung", "`client_ip_hash`", "ON CONFLICT DO UPDATE guarantees an atomic INSERT or UPDATE outcome", "boleh memuat header Retry-After"]) expect(r183, k).toContain(k);
    expect(serverpod).toBe("4.0.4");
    expect(laravel).toBe("13.38.0");
  });
  test("tautan eksternal dikunci per teks dan alamat; setiap alamat ada jejaknya di baris riset; satu teks tautan, satu alamat", () => {
    const tautan = [...halaman.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    const peta = new Map<string, Set<string>>();
    for (const [t, u] of tautan) peta.set(t, (peta.get(t) ?? new Set()).add(u));
    for (const [t, us] of peta) expect(us.size, `teks tautan ganda: ${t}`).toBe(1);
    expect([...new Set(tautan.map(([, u]) => u))].sort()).toEqual(ALAMAT.map(([u]) => u).sort());
    const semuaRiset = ids.map(barisRiset).join("\n");
    for (const [u, jejak] of ALAMAT) expect(semuaRiset, u).toContain(jejak);
    expect(caraPakai).toMatch(/^#+ Label sumber$/m);
  });
  test("klaim negatif halaman dibatasi ke halaman dokumentasi yang dibuka dan dijaga baris riset", () => {
    expect(halaman).toContain("Halaman itu tidak menyebut rate limiter bawaan.");
    expect(halaman).toContain("halaman konfigurasi tidak menyebut tempat hitungannya disimpan [perlu verifikasi]");
    expect(halaman).toContain("Tulisan itu tidak menyebut jumlah request, jadi tidak ada angka untuk dibandingkan dengan 17,36 per detik.");
    expect(halaman).toContain("Kode contohnya ada di GitHub dan tidak dibuka");
    expect(halaman).toContain("Halaman DRF tidak menulis nomor versi, dan rilis terbaru di PyPI 3.18.3.");
    expect(halaman).toContain("tidak ada rekaman operasi counter di PostgreSQL");
    expect(hal231).toContain("Satu kebutuhan data bersama antar proses muncul, dan tabel PostgreSQL untuk kebutuhan itu sudah diukur dan tidak cukup");
    expect(hal231).toContain("Belum ada kebutuhan semacam itu. Redis untuk batas laju ditunda di ADR 20 ([[t2-login-aman]])");
    // lingkup: tidak ada rekaman operasi counter PostgreSQL di labs/t3-instance dan labs/api-t3/output
    const rekaman = [...(terlacak ?? [])].filter((f) => (f.startsWith("labs/t3-instance/output/") || f.startsWith("labs/api-t3/output/")) && f.endsWith(".txt"));
    expect(rekaman.length).toBeGreaterThan(3);
    for (const f of rekaman) expect(baca(f), f).not.toMatch(/ON CONFLICT[^\n]*rl:|counter di PostgreSQL|rate_limit/i);
  });
});

describe("tab Di stack lain, ADR 27, kartu Cek diri, dan tetangga", () => {
  test("enam tab sama dengan 3.13; Go dijalankan, lima lain Tidak dijalankan; kode ilustrasi dikunci oleh EXPECT", () => {
    const label = '<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>';
    expect(halaman).toContain(label);
    expect(baca("situs/src/content/docs/tahap-3/at-least-once.mdx")).toContain(label);
    expect([...halaman.matchAll(/^\*(Dijalankan|Tidak dijalankan)[.:]/gm)].map((m) => m[1])).toEqual(["Dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan"]);
    expect(halaman.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect(halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g)).toHaveLength(6);
    expect(halaman.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(4);
  });
  test("ADR 27: empat opsi A sampai D, keputusan D dengan enam aturan, tiga penyebab pre-mortem, empat butir kapan salah, empat baris Sengaja belum", () => {
    const adr = halaman.slice(halaman.indexOf("### ADR 27"), halaman.indexOf("### Sengaja belum dilakukan"));
    expect(adr.match(/^\| \| A\. Counter di PostgreSQL \| B\. Sticky session di proxy \| C\. Batas dibagi N \| D\. Hitungan di Redis \|$/m)).not.toBeNull();
    for (const baris of ["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]) expect(adr, baris).toMatch(new RegExp(`^\\| ${baris} \\|`, "m"));
    const aturan = adr.slice(adr.indexOf("**Keputusan: opsi D.** Enam aturan:"), adr.indexOf("**Kenapa D, bukan A, B, atau C.**"));
    expect([...aturan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
    const pre = adr.slice(adr.indexOf("**Pre-mortem.**"), adr.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pre.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    const salah = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Yang akan merevisinya.**"));
    expect([...salah.matchAll(/^- /gm)]).toHaveLength(4);
    const belum = halaman.slice(halaman.indexOf("### Sengaja belum dilakukan"), halaman.indexOf('<Blok nama="Kunci">'));
    expect([...belum.matchAll(/^\| (?!Yang ditunda|---)/gm)]).toHaveLength(4);
    expect(adr).toContain("ADR ini menyimpang dari syarat kedua ADR 21: counter di PostgreSQL belum diukur");
    expect(naskahAdr27()).toContain("Redis untuk state bersama; rate limit lewat skrip atomik; timeout 50 ms; Redis mati berarti batas lokal");
    expect(naskahAdr27()).toContain("Counter di PostgreSQL (tidak direkam; pemicu Redis di ADR 21 meminta operasinya diukur dulu");
    expect(naskahAdr27()).toContain("satu penyerang bisa menolak login semua orang");
    expect(setelah).toContain("tulis di bagian \"kapan salah\" ADR 27");
  });
  test("Sudah tahu? Cek 3 pertanyaan sama dengan jumlah butir; Cek diri punya lima kartu dengan jawaban, dan kartu.json sama dengan halaman", () => {
    const sum = halaman.match(/<summary>Sudah tahu\? Cek (\d+) pertanyaan<\/summary>\n\n((?:\d+\. .+\n)+)/)!;
    expect(Number(sum[1])).toBe(sum[2]!.trim().split("\n").length);
    expect(halaman.match(/<details class="success">/g)).toHaveLength(5);
    expect(halaman.match(/^\*\*\d\.\*\* /gm)).toHaveLength(5);
    expect(halaman.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(5);
    const tanya = [...halaman.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    const jawab = [...halaman.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => m[1]!);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-rate-limit-redis");
    expect(kartu.map((k) => k.id)).toEqual([1, 2, 3, 4, 5].map((n) => `t3-rate-limit-redis-${n}`));
    expect(kartu.map((k) => k.tanya)).toEqual(tanya);
    expect(kartu.map((k) => k.jawab)).toEqual(jawab.map((j) => j.replace(/\n+/g, " ").replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")));
    for (const k of kartu) expect([k.judul, k.url]).toEqual(["3.17 Rate limit lintas instance dan Redis + ADR 27", "tahap-3/rate-limit-redis/"]);
    const gantikan = (t: string) => t.replace(/«(\w+)»/g, (_, k: string) => String(V[k]));
    expect(gantikan("«sampaiA» dengan bucket di memori, «sampaiE» dengan Redis.")).toBe("20 dengan bucket di memori, 10 dengan Redis.");
  });
  test("tautan [[ID]] ada di registry dan daftarnya dikunci", () => {
    const ids = [...new Set([...halaman.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(ids).toEqual(["berikutnya", "t2-adr-21", "t2-login-aman", "t3-cache", "t3-dua-instance", "t3-m22", "t3-prd"]);
    const reg = new Set((registry.halaman as { id: string }[]).map((h) => h.id));
    for (const id of ids.filter((x) => x !== "berikutnya")) expect(reg.has(id), id).toBe(true);
  });
  test("janji dari tetangga ditepati: 2.31 menunjuk 3.17 untuk Redis, 3.14 menyebut M22 sebagai konsekuensi instance kedua, 3.2 menaut 3.17", () => {
    expect(hal231).toContain("| [[t3-rate-limit-redis]] |");
    expect(hal314).toContain("[[t3-m22]]: instance kedua membawa masalah baru. Penahan batas login yang ada di memori tiap instance ikut berlipat.");
    expect(halTeknis).toContain("[[t3-rate-limit-redis\\|rate limit lintas instance]]");
    expect(hal228).toContain("Redis untuk batas laju | Satu server. Rekaman F menunjukkan masalahnya, dan belum terjadi | Tahap 3, saat server kedua datang");
  });
});

function naskahAdr27(): string {
  const b = naskah.split("\n").find((x) => x.startsWith("| 27 | Redis untuk state bersama"));
  if (!b) throw new Error("baris ADR 27 di naskah tidak ada");
  return b;
}

const PROSA = {
  "pengantar": "Satu alamat menebak password ke 24 akun lewat dua instance. Tebak dulu berapa yang sampai ke pemeriksaan password, lalu ikuti sampai isi Redis. Sesudah langkah terakhir, centang 'Ubah satu hal'.",
  "judul": "Satu alamat, dua instance, satu hitungan di Redis",
  "q": "Satu alamat mengirim 24 percobaan login ke 24 akun berbeda. Proxy membaginya bergantian ke dua instance, batas per alamat 10, dan hitungannya di Redis. Berapa percobaan sampai ke pemeriksaan password?",
  "options": [
    "24: Redis hanya menghitung dan tidak menolak apa pun",
    "20: tiap instance tetap menghitung di memorinya sendiri",
    "10: dua instance menaikkan satu hitungan",
    "12: separuh percobaan, karena proxy membagi dua instance"
  ],
  "utama": [
    [
      "Satu alamat mengirim 24 percobaan login",
      "Satu client menebak password dari satu alamat, satu percobaan per akun. Kunci akun di database tidak tersentuh, jadi hanya penahan per alamat yang menahannya. Batasnya 10."
    ],
    [
      "Proxy meneruskan bergantian ke a dan b",
      "Lab memakai round_robin supaya angkanya tetap. Dengan kebijakan random bawaan Caddy, pembagiannya acak, dan hasil di bagian F tetap 10."
    ],
    [
      "Instance menaikkan hitungan di Redis",
      "Instance a dan b memanggil skrip yang sama untuk key yang sama, jadi keduanya menaikkan satu hitungan. INCR dan PEXPIRE ada dalam satu skrip, jadi Redis menjalankannya tanpa disela perintah lain."
    ],
    [
      "Redis menjawab dengan hitungan",
      "Hitungan naik juga untuk percobaan yang ditolak. Jendelanya mulai dari percobaan pertama dan tidak diperpanjang percobaan berikutnya, karena masa berlaku hanya dipasang saat key baru."
    ],
    [
      "Hitungan 1 sampai 10 lolos ke pemeriksaan password",
      "Percobaan ini sampai ke pemeriksaan akun dan password, lalu ditolak sebagai password salah. 5 + 5 = 10: jatahnya satu, bukan dua."
    ],
    [
      "Hitungan 11 sampai 24 ditolak",
      "Penolakan terjadi sebelum pemeriksaan akun dan password: hanya 10 key per akun dibuat di Redis."
    ],
    [
      "Isi Redis sesudahnya",
      "Key per alamat berhitungan 24, bukan 10, karena percobaan yang ditolak ikut dihitung. Key berisi hash alamat dan email, bukan teksnya."
    ]
  ],
  "varian": [
    [
      "Instance memanggil Redis yang sudah dihentikan",
      "Panggilan ke Redis gagal. Kontainer Redis dihentikan sebelum percobaan pertama."
    ],
    [
      "Instance memakai bucket lokal",
      "Login tidak boleh ikut mati karena penghitung mati. Instance kembali ke bucket di memorinya, dan kegagalan dicatat sekali saat mulai."
    ],
    [
      "Login tetap dijawab, batasnya kembali per instance",
      "Batas tidak hilang, tetapi jatuh ke jatah per instance: 10 di a dan 10 di b."
    ],
    [
      "Redis hidup lagi",
      "Instance tidak dimulai ulang. Pemeriksaan berikutnya memakai Redis lagi, dan log mencatat bahwa penghitung pulih."
    ]
  ],
  "rantaiJudul": "Satu alamat dan dua instance: dua jatah di memori, satu jatah di Redis"
};

const SIDIK_RISET: Record<string, string> = {
  "R3-180": "438ec0d32a769963",
  "R3-181": "fc60b0ba9a787efa",
  "R3-182": "adc2c8f404ae1720",
  "R3-183": "9799e7d951bb5a4b",
};
const SIDIK_ISTILAH = "6e38613e28e3f588";
const ALAMAT: [string, string][] = [
  ["https://redis.io/docs/latest/commands/incr/", "redis.io/docs/latest/commands/incr/"],
  ["https://redis.io/docs/latest/develop/programmability/eval-intro/", "redis.io/docs/latest/develop/programmability/eval-intro/"],
  ["https://www.rfc-editor.org/rfc/rfc6585.html#section-4", "rfc-editor.org/rfc/rfc6585"],
  ["https://caddyserver.com/docs/caddyfile/directives/reverse_proxy", "caddyserver.com/docs/caddyfile/directives/reverse_proxy"],
  ["https://github.com/express-rate-limit/express-rate-limit/blob/v8.7.1/readme.md", "express-rate-limit 8.7.1"],
  ["https://github.com/express-rate-limit/rate-limit-redis/blob/v6.0.1/readme.md", "rate-limit-redis 6.0.1"],
  ["https://laravel.com/docs/13.x/rate-limiting", "laravel.com/docs/13.x/rate-limiting"],
  ["https://docs.djangoproject.com/en/6.1/topics/cache/", "docs.djangoproject.com/en/6.1/topics/cache/"],
  ["https://www.django-rest-framework.org/api-guide/throttling/", "django-rest-framework.org/api-guide/throttling/"],
  ["https://docs.serverpod.dev/concepts/endpoints-and-apis/caching", "docs.serverpod.dev/concepts/endpoints-and-apis/caching"],
  ["https://docs.serverpod.dev/concepts/authentication/providers/email/configuration", "docs.serverpod.dev/concepts/authentication/providers/email/configuration"],
  ["https://supabase.com/docs/guides/functions/examples/rate-limiting", "supabase.com/docs/guides/functions/examples/rate-limiting"],
  ["https://github.blog/engineering/infrastructure/how-we-scaled-github-api-sharded-replicated-rate-limiter-redis/", "github.blog/engineering/infrastructure/how-we-scaled-github-api-sharded-replicated-rate-limiter-redis/"],
  ["https://www.postgresql.org/docs/17/sql-insert.html", "postgresql.org/docs/17/sql-insert.html"],
];
