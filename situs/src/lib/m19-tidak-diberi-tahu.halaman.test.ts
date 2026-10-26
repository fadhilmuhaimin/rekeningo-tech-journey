// Penjaga angka halaman 3.10 (keputusan 1036 sampai 1038): setiap angka, ID, nomor ADR, nomor baris Snippet, tanggal akses,
// label sumber, dan kalimat di m19-tidak-diberi-tahu.mdx diturunkan dari rekaman labs/ (t3-outbox, api-t3), kode lab, naskah,
// registry, RISET, dan halaman tetangga. Isi halaman dikunci unit demi unit (EXPECT, nilai diisi dari sumber lewat placeholder),
// dan tiap klaim mekanisme dipasangkan dengan rekaman atau kode yang membuktikannya di tes terpisah, sebab mengunci kalimat
// utuh tidak menangkap kalimat yang SALAH (pelajaran 3.4 sampai 3.7). Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-m19-kursor-tertinggal.json";
import registry from "../../data/cerita.json";
import widgetMentah from "../../data/widget/t3-outbox-worker.json";
import { acuanDari, jalankanKursor, konstanta } from "../widgets/outbox-worker/logika";
import { bacaAcuan } from "../widgets/outbox-worker/rekaman";
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
const halamanBerkas = "situs/src/content/docs/tahap-3/m19-tidak-diberi-tahu.mdx";
const mdx = baca(halamanBerkas);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const rantai = DataRantai.parse(rantaiMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const kursorTxt = baca("labs/t3-outbox/output/kursor.txt");
const listenTxt = baca("labs/t3-outbox/output/listen.txt");
const klaimTxt = baca("labs/t3-outbox/output/klaim.txt");
const rentanTxt = baca("labs/api-t3/output/rentan.txt");
const runOutbox = baca("labs/t3-outbox/run.py");
const runApi = baca("labs/api-t3/run.py");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const ledgerGo = baca("labs/api-t3/internal/repo/ledger.go");
const kirimGo = baca("labs/api-t3/internal/service/kirim.go");
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const kursor219 = baca("situs/src/content/docs/tahap-2/pagination-kursor.mdx");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const duaTempat = baca("situs/src/content/docs/tahap-3/dua-tempat-commit.mdx");
const komponenOutbox = baca("situs/src/components/OutboxWorker.astro");

// ---- bagian rekaman -------------------------------------------------------------------------------
interface Bagian { baris: string[] }
// Bagian rekaman diawali "# --- X. ...". Nomor baris (mulai 1) dihitung dari jangkar teks di nomorBaris.
const pecah = (teks: string): Record<string, Bagian> => {
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  for (const b of teks.split("\n")) {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) {
      kini = m[1]!;
      hasil[kini] = { baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  }
  return hasil;
};
const bagian = (semua: Record<string, Bagian>, huruf: string): string[] => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b.baris;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const tabel = (baris: string[], kolom: string[], nama: string): string[][] => {
  const awal = new RegExp(`^ ${kolom.join("\\s*\\|\\s*")}`);
  const i = baris.findIndex((b) => awal.test(b));
  if (i < 0) throw new Error(`rekaman: tabel ${nama} tidak ada`);
  const hasil: string[][] = [];
  for (let k = i + 2; k < baris.length && !/^\(\d+ rows?\)/.test(baris[k]!); k++) hasil.push(baris[k]!.split("|").map((x) => x.trim()));
  return hasil;
};
const nomorBaris = (semua: string[], pola: RegExp, dari = 0): number => {
  const i = semua.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const rentang = (semua: string[], awal: RegExp, akhir: RegExp): string => {
  const a = nomorBaris(semua, awal);
  return `${a}:${nomorBaris(semua, akhir, a - 1)}`;
};
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima"];
const kata = (n: number): string => KATA[n]!;
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;

const barisKursor = kursorTxt.split("\n");
const KP = pecah(kursorTxt);
const KA = bagian(KP, "A");
const KB = bagian(KP, "B");
const KC = bagian(KP, "C");
const KD = bagian(KP, "D");
const RP = pecah(rentanTxt);
const RC = bagian(RP, "C");

// ---- nilai turunan dari rekaman ---------------------------------------------------------------------
const pg = cari(/^# PostgreSQL (\d+\.\d+) /, barisKursor, "versi PostgreSQL")[1]!;
const selang = cari(/-rentan kursor -selang (\d+)ms/, barisKursor, "selang poller")[1]!;
const citra = Number(cari(/baris buku Citra \(akun (\d+)\)/, KA, "akun Citra")[1]);
const budi = Number(cari(/sesi tangan memegang baris buku Budi \(akun (\d+)\)/, KB, "akun Budi")[1]);
const tabelA = tabel(KA, ["outbox_id", "jurnal_id", "pengirim", "urutan_dibuat", "status"], "A");
const tabelB = tabel(KB, ["outbox_id", "pengirim", "status", "urutan_dibuat"], "B");
const tabelC = tabel(KC, ["outbox_id", "pengirim", "status", "percobaan"], "C");
const tabelD = tabel(KD, ["outbox_id", "urutan_dibuat"], "D");
const dimas = Number(tabelB.find((r) => r[2] === "terkirim")![1]);
const menungguA = Number(KA[KA.findIndex((b) => b.trim() === "transaction_menunggu_lock") + 2]!.trim());
const nominal = Number(cari(/^# 2\. Budi mengirim Rp([\d.]+) ke Citra/, KB, "nominal B")[1]!.replace(/\./g, ""));
const saldoNaik = Number(KB[KB.findIndex((b) => b.trim() === "saldo_citra_naik") + 2]!.trim());
const tokenCitra = cari(/\(token (tiruan-\d+)\)/, KB, "token Citra")[1]!;
const pesanB = Number(cari(/^push tiruan menerima: (\d+) pesan \(hanya Dimas\); dalam ([\d,]+) detik pengamatan/, KB, "pesan B")[1]);
const pengamatan = cari(/dalam ([\d,]+) detik pengamatan/, KB, "pengamatan B")[1]!;
const klaimC = cari(/^worker: diklaim (\d+), terkirim (\d+), dilewati 0, ditunda 0, mati 0$/, KC, "klaim C");
const pesanC = Number(cari(/^push tiruan menerima: (\d+) pesan; HP Citra berbunyi dua kali/, KC, "pesan C")[1]);
const maksPasang = Number(cari(/^# Sampai (\d+) pasang /, KD, "pasang D")[1]);
const celahNomor = cari(/^# Nomor (\d+) sudah terpakai oleh baris yang di-ROLLBACK: nomor berikutnya (\d+), ada celah/, listenTxt.split("\n"), "celah listen A");
const tanggal = cari(/dibuka (\d{4}-\d{2}-\d{2})/, [riset.split("\n").find((b) => b.startsWith("| R3-145 |"))!], "tanggal R3-145")[1]!;
const tglMorling = cari(/morling\.dev, (\d{4}-\d{2}-\d{2})/, [riset.split("\n").find((b) => b.startsWith("| R3-145 |"))!], "tanggal Morling")[1]!;

// 2.19: nomor aturan ADR 16 yang dirujuk halaman
const aturan = (frasa: string): number => {
  const m = kursor219.split("\n").map((b) => b.match(/^(\d)\. (.*)$/)).find((x) => x && x[2]!.includes(frasa));
  if (!m) throw new Error(`2.19: aturan "${frasa}" tidak ada`);
  return Number(m[1]);
};
const aturanMuat = aturan("App memuat ulang riwayat");
const aturanCelah = aturan("Celah COMMIT belakangan diterima terbuka");
const aturanAliran = aturan("Pembaca yang menganggap riwayat sebagai aliran");

const barisNaskah = naskah.split("\n").find((b) => b.startsWith("| M19 | "))!;
const minggu = Number(barisNaskah.split("|")[2]!.trim());

// nomor baris Snippet kode lab
const barisWorker = workerGo.split("\n");
const w0 = nomorBaris(barisWorker, /^\tif w\.cfg\.Kursor \{$/);
const barisMigrasi = migrasi.split("\n");
const mig = nomorBaris(barisMigrasi, /^  dibuat        timestamptz NOT NULL DEFAULT now\(\),$/);
const snipA = rentang(barisKursor, /^# --- A\. /, /^# Nomor outbox dan urutan `dibuat` sama/);
const snipB = rentang(barisKursor, /^# --- B\. /, /^push tiruan menerima: \d+ pesan \(hanya Dimas\)/);
const snipC = rentang(barisKursor, /^# --- C\. /, /^push tiruan menerima: \d+ pesan; HP Citra/);
const snipD = rentang(barisKursor, /^# --- D\. /, /^# Pemicu tidak harus dibuat/);

const V: Record<string, string | number> = {
  pg, selang, minggu, tanggal, tglMorling, tokenCitra, pengamatan, maksPasang, snipA, snipB, snipC, snipD, w0, w1: w0 + 5, mig,
  rpSaldo: rp(saldoNaik), rpNominal: rp(nominal),
  kataKiriman: kata(tabelB.length), kataMenunggu: kata(menungguA), kataPesanB: kata(pesanB), kataPesanC: kata(pesanC), kataTransferC: kata(tabelC.length),
  a1: tabelA[0]![0]!, a2: tabelA[1]![0]!, nomorBudiB: tabelB.find((r) => r[1] === String(budi))![0]!, nomorDimasB: tabelB.find((r) => r[1] === String(dimas))![0]!,
  b1: tabelB[0]![0]!, b2: tabelB[1]![0]!, celah: celahNomor[1]!, celahBerikut: celahNomor[2]!,
  aturanMuat, aturanCelah, aturanAliran, percobaanDimas: tabelC.find((r) => r[1] === String(dimas))![3]!,
};
const isi = (t: string): string =>
  t.replace(/«(\w+)»/g, (_, k: string) => {
    if (!(k in V)) throw new Error(`placeholder tidak dikenal: ${k}`);
    return String(V[k]);
  });

// ---- isi halaman, unit demi unit (dipisah baris kosong); «nama» diisi dari sumber lewat isi() ----
const EXPECT: string[] = [
  "import Blok from \"../../../components/Blok.astro\";\nimport Rantai from \"../../../components/Rantai.astro\";\nimport Snippet from \"../../../components/Snippet.astro\";\nimport OutboxWorker from \"../../../components/OutboxWorker.astro\";\nimport kursorTertinggal from \"../../../../data/diagram/t3-m19-kursor-tertinggal.json\";",
  "<p class=\"meta\">Baca 7 menit · coba 3 menit · Prasyarat: [[t3-outbox]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu «minggu» Tahap 3. Budi dan seorang rekan mengirim patungan ke Citra hampir bersamaan, «kataKiriman» kiriman dengan jumlah «rpSaldo». Saldo Citra naik «rpSaldo», tetapi HP-nya berbunyi sekali, bukan dua kali.",
  "Dua hari kemudian Ani mencocokkan buku catatannya dengan daftar notifikasi di HP-nya. Tiga pembayaran hari Jumat ada di bukunya, tetapi tidak pernah muncul sebagai notifikasi.",
  "Saldo Citra benar dan uangnya sudah pindah. Yang hilang hanya pemberitahuannya, dan Ani yang menemukannya, bukan sistem.",
  "*Angka cerita (Ilustrasi):* tiga pembayaran dan dua hari berasal dari naskah, tanpa rekaman yang mengulangnya. Rekaman di blok \"Yang sebenarnya\" memakai «kataKiriman» kiriman «rpNominal» dari Budi dan Dimas ke Citra, bukan pembayaran ke Ani.",
  "Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka memeriksa yang paling dekat dengan HP Citra: token perangkatnya. Ia menduga token itu salah, jadi satu pesan tidak sampai.",
  "Nadia punya dugaan lain. Poller adalah bagian worker yang membaca tabel `outbox` berkala dan mengirim barisnya. Menurut Nadia, poller butuh nomor urut tanpa celah supaya tidak ada baris yang terlewat.",
  "<details class=\"question\">\n<summary>Tebak dulu: kiriman Budi mulai lebih dulu, tetapi menunggu lock. Kiriman rekannya mulai kemudian dan COMMIT lebih dulu. Keduanya ke token Citra yang sama. Pesan siapa yang sampai ke HP Citra?</summary>",
  "Pesan rekannya, yaitu kiriman yang COMMIT lebih dulu. Di rekaman lab `kursor.txt` bagian B, HP Citra (token `«tokenCitra»`) menerima «kataPesanB» pesan, dan baris Budi masih `menunggu` sesudah «pengamatan» detik pengamatan.",
  "Token itu menerima pesan yang lain, jadi token bukan sebabnya. Nomor outbox kedua baris adalah «b1» dan «b2» tanpa celah, jadi celah nomor juga bukan sebabnya. Penyebabnya ada di blok berikutnya.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Poller outbox membaca dengan kursor `(dibuat, id)`, sama seperti riwayat di ADR 16 ([[t2-kursor]]). Kursor adalah penanda baris terakhir yang sudah dibaca.",
  "`dibuat` adalah awal transaction, bukan saat COMMIT. Baris dari transaction yang mulai lebih awal tetapi COMMIT belakangan berada di belakang kursor, dan poller tidak membacanya lagi.",
  "<Rantai data={kursorTertinggal} />",
  "*Kondisi rekaman:* PostgreSQL «pg», server Go dengan poller dalam mode rentan `kursor` (selang «selang» ms), dan layanan push tiruan lokal. Akun Dimas memerankan rekan Budi.",
  "**Apa yang dibaca poller.** Query-nya mengambil baris `menunggu` dengan `(dibuat, id)` lebih besar dari kursor, urut menurut `(dibuat, id)`:",
  "<Snippet file=\"labs/api-t3/internal/repo/outbox.go\" region=\"baca-kursor\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/repo/outbox.go, region baca-kursor (poller versi pertama)\" />",
  "Komentar di kode itu juga menulis bahwa nomor `id` bukan urutan COMMIT. Lab tidak merekam bagian itu, dan klaim itu dibahas di akhir blok ini.",
  "Sesudah satu putaran, kursor pindah ke baris terakhir yang dibaca. Di kode itu kursor tidak pernah mundur:",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"«w0»:«w1»\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/worker/worker.go baris «w0» sampai «w1» (kursor hanya maju)\" />",
  "Kolom `dibuat` diisi `now()` oleh database:",
  "<Snippet file=\"labs/api-t3/migrasi/000017_perangkat_outbox.up.sql\" lines=\"«mig»:«mig»\" lang=\"sql\" title=\"Kode lab: labs/api-t3/migrasi/000017_perangkat_outbox.up.sql baris «mig» (dibuat memakai now())\" />",
  "Dokumentasi PostgreSQL 17 menyebut `now()` memakai waktu mulai transaction, dan nilainya tidak berubah selama transaction itu. Sumbernya [bagian 9.9.5](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT), dibuka «tanggal» (Tidak dijalankan).",
  "**Bila COMMIT sesuai urutan mulai, kursor bekerja.** Di bagian A sesi tangan memegang baris buku Citra, dan «kataMenunggu» transaction menunggu lock itu. Budi menunggu lebih dulu, lalu Dimas. Sesudah lock dilepas, nomor outbox dan urutan `dibuat` sama, yaitu «a1» untuk Budi dan «a2» untuk Dimas, dan kedua pesan terkirim:",
  "<Snippet file=\"labs/t3-outbox/output/kursor.txt\" lines=\"«snipA»\" title=\"Rekaman lab: labs/t3-outbox/output/kursor.txt, bagian A (dua kiriman antre di buku Citra)\" />",
  "Lab mengatur siapa yang lebih dulu. Budi dilepas lebih dulu, lab menunggu sampai ia terlihat menunggu lock, baru Dimas dilepas.",
  "Halaman explicit locking di dokumentasi PostgreSQL 17 tidak menjanjikan urutan transaction yang menunggu satu baris. Jadi \"yang tiba lebih dulu selesai lebih dulu\" hanya berlaku di rekaman ini, bukan aturan. Urutan COMMIT di bagian A tidak direkam langsung: ia dibaca dari nomor outbox, seperti di bagian D. Sumbernya [bagian 13.3.2](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS), dibuka «tanggal» (Tidak dijalankan).",
  "**Satu kiriman terhambat dan barisnya tertinggal.** Bagian B mengubah satu hal. Sebelum Budi mengirim, sesi tangan memegang baris buku Budi sendiri, mewakili permintaan lain dari Budi yang belum selesai. Kiriman Budi mulai lebih dulu lalu menunggu bukunya sendiri, sedangkan kiriman Dimas mulai kemudian, tidak terhalang, dan COMMIT lebih dulu.",
  "Poller mengirim baris Dimas dan memajukan kursornya. Baru sesudah itu lock dilepas dan kiriman Budi selesai. Barisnya bernomor «nomorBudiB» tetapi `dibuat`-nya lebih awal, jadi ia ada di belakang kursor:",
  "<Snippet file=\"labs/t3-outbox/output/kursor.txt\" lines=\"«snipB»\" title=\"Rekaman lab: labs/t3-outbox/output/kursor.txt, bagian B (baris Budi di belakang kursor)\" />",
  "Saldo Citra naik «rpSaldo», tetapi HP-nya menerima «kataPesanB» pesan. Baris Budi tetap `menunggu` selama «pengamatan» detik pengamatan dengan selang poller «selang» ms. Penghambatnya buatan: lab memanjangkan celah supaya terekam.",
  "**Tanpa penghambat buatan, urutannya juga bisa terbalik.** Bagian D melepas dua kiriman ke Citra bersamaan dari dua thread. Lab mengulang sampai paling banyak «maksPasang» pasang dan berhenti pada pasang pertama yang urutan `dibuat`-nya terbalik dari nomor outbox. Jumlah pasang yang dipakai tidak direkam, karena bergantung waktu:",
  "<Snippet file=\"labs/t3-outbox/output/kursor.txt\" lines=\"«snipD»\" title=\"Rekaman lab: labs/t3-outbox/output/kursor.txt, bagian D (urutan dibuat terbalik dari nomor outbox)\" />",
  "Nomor outbox diberikan saat INSERT, yaitu sesudah transaction memegang lock buku Citra. Lock itu baru lepas saat transaction berakhir ([bagian 13.3.2](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS)), jadi nomor «nomorDimasB» COMMIT lebih dulu dari nomor «nomorBudiB». Itu dibaca dari kode `Kirim`, tidak direkam. Transaction bernomor «nomorDimasB» mulai lebih akhir, sehingga `dibuat`-nya lebih akhir.",
  "Bagian D tidak menjalankan poller, dan seberapa sering putaran poller jatuh di antara dua COMMIT itu tidak diukur. Lab hanya merekam mekanismenya. Rekaman lain di `api-t3` (`rentan.txt` bagian C) memperlihatkan bentuk yang sama dengan pelaku berbeda. Pembayaran Dimas ke Warung Ani COMMIT lebih dulu dan terkirim, sedangkan transfer Budi ke Citra tertinggal.",
  "**Bagian C memakai worker yang mengklaim baris.** Worker itu tidak memakai kursor, dan ia mengirim baris Budi yang tertinggal. HP Citra menerima «kataPesanC» pesan untuk «kataTransferC» transfer:",
  "<Snippet file=\"labs/t3-outbox/output/kursor.txt\" lines=\"«snipC»\" title=\"Rekaman lab: labs/t3-outbox/output/kursor.txt, bagian C (klaim menemukan baris yang tertinggal)\" />",
  "Kenapa klaim itu tidak mengirim satu baris dua kali dibahas di [[t3-klaim-baris]]. Harganya juga ada di sana: urutan antar pesan tidak dijaga.",
  "**Ini celah yang ADR 16 tulis terbuka, tetapi akibatnya lain.** ADR 16 menerima celah COMMIT belakangan untuk riwayat. App memuat ulang riwayat dari atas, jadi akibatnya hanya di tampilan (aturan «aturanMuat» dan «aturanCelah» di [[t2-kursor]]). Aturan «aturanAliran» melarang kursor itu untuk pembaca aliran dan menyebut notifikasi sebagai contoh.",
  "Poller adalah pembaca aliran, dan ia tidak memuat ulang dari atas. Baris di belakang kursornya tidak dibaca lagi selama poller itu berjalan. Kursor di lab hanya ada di memori proses, jadi poller yang dimulai ulang membaca dari awal. Restart poller tidak direkam (Tidak dijalankan).",
  "**Nomor urut tanpa celah tidak menyelesaikannya.** Nadia mengusulkan nomor urut tanpa celah. Sequence PostgreSQL tidak bisa memberinya: nilai yang dipakai transaction yang batal tidak dipakai ulang.",
  "Rekaman `listen.txt` memperlihatkannya: bagian A membatalkan satu baris dengan ROLLBACK, dan baris berikutnya di bagian B bernomor «celahBerikut», jadi nomor «celah» terpakai tanpa baris. Sumbernya [bagian 9.17](https://www.postgresql.org/docs/17/functions-sequence.html), dibuka «tanggal» (Tidak dijalankan).",
  "Halaman sequence itu tidak menyebut urutan COMMIT. Morling menulis bahwa urutan pesan di tabel outbox, menurut timestamp atau kolom sequence, tidak dijamin sama dengan urutan COMMIT ([Revisiting the Outbox Pattern](https://www.morling.dev/blog/revisiting-the-outbox-pattern/), «tglMorling», dibuka «tanggal», Tidak dijalankan). Ia merujuk Kleppmann untuk masalah urutan itu dan menyebut relay bisa melewatkan pesan. Lab ini tidak merekam kasus itu: di bagian B dan D nomor «nomorDimasB» COMMIT lebih dulu, dan yang terbalik hanya `dibuat`.",
  "Jadi kursor `id` saja akan menangkap kasus M19 di lab, tetapi urutan nomor tidak dijanjikan sama dengan urutan COMMIT. Opsi nomor urut ditimbang di [[t3-klaim-baris]].",
  "**Siapa yang tahu?** Pertanyaan kedua PRD v3 ([[t3-prd]]) bertanya siapa yang tahu bila pemberitahuan gagal terkirim. Di M19 jawabannya tidak ada, sampai Ani membandingkan bukunya. Pemberitahuan itu tidak gagal terkirim, melainkan tidak dibaca poller.",
  "Poller kursor tidak mencatat percobaan: baris Dimas yang terkirim pun berpercobaan «percobaanDimas» (bagian C). Baris Budi tetap `menunggu` dan umurnya bertambah. Kode `RingkasOutbox` melaporkan umur baris `menunggu` tertua. Alert dari angka itu dibahas di [[t3-m27]], dan Tidak dijalankan untuk kasus ini.",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengulang rekaman `kursor.txt` bagian A, B, dan C. Tebak dulu berapa notifikasi yang sampai ke HP Citra. Lalu ubah satu hal: urutan COMMIT, atau cara worker mengambil baris.",
  "<OutboxWorker skenario={[\"kursor\"]} />",
  "Dengan kursor dan COMMIT terbalik, hanya satu notifikasi yang sampai (bagian B). Pilih \"Klaim per baris\" dan kedua notifikasi sampai (bagian C). Kombinasi klaim dengan COMMIT berurutan tidak dijalankan di lab, jadi widget menulisnya sebagai Hitungan.",
  "<details>\n<summary>Rekaman bagian A sampai D (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t3-outbox/output/kursor.txt\" title=\"Rekaman lab: labs/t3-outbox/output/kursor.txt\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-klaim-baris]]: klaim per baris, bukan kursor. Worker mengambil baris dengan klausa kunci `FOR UPDATE` dan `klaim_sampai`, jadi baris yang COMMIT belakangan tetap terlihat. Harganya, urutan antar pesan tidak dijaga. Keputusannya ADR 24.\n- [[t2-kursor]]: ADR 16 tetap benar untuk riwayat di layar HP. Aturan «aturanAliran» di sana, kursor tidak untuk pembaca aliran, adalah yang M19 tunjukkan.\n- [[t3-outbox]]: pemberitahuan tetap ditulis di transaction jurnal, dan barisnya ada di tabel. Yang gagal di M19 adalah cara poller membacanya.\n- [[t3-m27]]: alert umur notifikasi tertua, jawaban untuk siapa yang tahu.",
  "Urutan COMMIT tidak sama dengan urutan `dibuat`, dan kursor yang bersandar padanya melewatkan baris.",
  "</Blok>",
];

const unitHalaman = halaman.trim().split(/\n{2,}/);
const risetBaris = riset.split("\n").find((b) => b.startsWith("| R3-145 |"))!;
const bagianFn = (nama: string, sampai: string): string => runOutbox.slice(runOutbox.indexOf(`def ${nama}`), runOutbox.indexOf(`def ${sampai}`));
const fnKursor = bagianFn("rekam_kursor", "rekam_klaim");
const segmen = (awal: string, akhir: string): string => fnKursor.slice(fnKursor.indexOf(awal), fnKursor.indexOf(akhir));
const gabungGo = (): string[] => [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go"));

describe("halaman 3.10: isi dikunci unit demi unit, nilai diturunkan dari sumber", () => {
  test("frontmatter, meta, dan registry", () => {
    const h = (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string }[]).find((x) => x.id === "t3-m19")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran, h.path]).toEqual(["3.10", "masalah", 4, true, ["t3-outbox"], ["t3-outbox"], ["backend"], "tahap-3/m19-tidak-diberi-tahu.md"]);
    expect(h.judul).toBe("M19: Ani tidak diberi tahu");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(frontmatter).toContain(
      isi("description: Minggu «minggu». Saldo Citra naik «rpSaldo» tetapi HP-nya berbunyi sekali, dan Ani menemukan pembayaran yang tidak pernah diberitahukan. Poller outbox membaca dengan kursor (dibuat, id), dan baris dari transaction yang COMMIT belakangan tertinggal di belakang kursor."),
    );
    expect(naskah).toMatch(/\| 3\.10 \| 4 \| M19: Ani tidak diberi tahu \| Masalah \| ★ \| t3-outbox \| race \|/);
    const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-outbox\]\] · Jalur inti<\/p>$/m)!;
    expect(meta).not.toBeNull();
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(Number(meta[2])).toBe(3);
    // Baca N menit = kata prosa ÷ 200 dibulatkan ke atas (tanpa kode, tag, dan Snippet)
    const prosa = halaman.replace(/<Snippet[^>]*\/>/g, "").replace(/<[^>]+>/g, " ").replace(/^import .*$/gm, "");
    expect(Math.ceil(prosa.split(/\s+/).filter(Boolean).length / 200)).toBe(Number(meta[1]));
  });
  test("EXPECT: semua unit halaman sama dengan yang diturunkan dari sumber, urutan dan isinya", () => {
    expect(unitHalaman).toEqual(EXPECT.map(isi));
  });
  test("ID riset tidak tampil ke pembaca, dan hanya satu bentuk per angka", () => {
    expect(halaman + JSON.stringify(rantaiMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(hitung(halaman, new RegExp(rp(saldoNaik).replace(".", "\\."), "g"))).toBe(3);
    expect(hitung(halaman, new RegExp(rp(nominal).replace(".", "\\."), "g"))).toBe(1);
    expect(halaman).not.toMatch(/\d+ ?%/);
  });
});

describe("rekaman kursor.txt: bagian A sampai D", () => {
  test("header: PostgreSQL 17.11, schema, poller dalam mode rentan kursor selang 20 ms", () => {
    expect(barisKursor[1]).toMatch(/^# PostgreSQL 17\.11 \(Debian 17\.11-1\.pgdg13\+2\) · schema tahap3_outbox/);
    expect(pg).toBe("17.11");
    expect(barisKursor.some((b) => b === `$ ./api-t3 -peran worker -rentan kursor -selang ${selang}ms &   # poller versi pertama (ADR 16 ditiru), berputar terus`)).toBe(true);
    expect(selang).toBe("20");
    expect(runOutbox).toContain(`mulai_worker("kursor", ["-rentan", "kursor", "-selang", "${selang}ms"])`);
  });
  test("A: sesi tangan memegang buku Citra, dua transaction menunggu lock, Budi lebih dulu, nomor dan dibuat sama", () => {
    expect(KA.some((b) => b.includes(`FOR UPDATE;   # sesi tangan memegang baris buku Citra (akun ${citra})`))).toBe(true);
    expect(menungguA).toBe(2);
    expect(KA.some((b) => b.startsWith("# Dua transaction menunggu baris yang sama. Budi tiba lebih dulu (di antrean lock lebih depan), Dimas sesudahnya."))).toBe(true);
    expect(tabelA.map((r) => [r[0], r[2], r[3], r[4]])).toEqual([["1", String(budi), "1", "terkirim"], ["2", String(dimas), "2", "terkirim"]]);
    expect(KA.some((b) => b.startsWith("# Nomor outbox dan urutan `dibuat` sama (1, 2): kursor (dibuat, id) tidak melewatkan apa pun. Dua pesan terkirim."))).toBe(true);
    // Lab mengatur siapa yang lebih dulu: Budi dilepas, lab menunggu satu transaction menunggu lock, baru Dimas dilepas.
    const a = segmen('bagian("A.', 'bagian("B.');
    const i1 = a.indexOf("serentak([patungan(budi)])");
    const i2 = a.indexOf("menunggu_lock() == 1");
    const i3 = a.indexOf("serentak([patungan(dimas)])");
    const i4 = a.indexOf("menunggu_lock() == 2");
    expect(i1).toBeGreaterThan(0);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3);
    expect(a).toContain("h = tangan_kunci_buku(504)");
    expect(citra).toBe(504);
  });
  test("B: Budi menunggu bukunya sendiri, Dimas COMMIT lebih dulu, baris Budi menunggu di belakang kursor, satu pesan ke token Citra", () => {
    expect(KB.some((b) => b.includes(`# 1. Permintaan lain dari Budi masih berjalan: sesi tangan memegang baris buku Budi (akun ${budi})`))).toBe(true);
    expect(KB.some((b) => b.startsWith(`# 2. Budi mengirim ${rp(nominal)} ke Citra: mulai lebih dulu, lalu menunggu baris bukunya sendiri`))).toBe(true);
    expect(KB.some((b) => b.startsWith(`# 3. Dimas mengirim ${rp(nominal)} ke Citra: mulai sesudah Budi, tidak ada yang menghalangi, COMMIT lebih dulu`))).toBe(true);
    expect(KB.some((b) => b.startsWith("# 4. Poller sudah mengirim baris Dimas dan kursornya maju ke (dibuat Dimas, nomor Dimas). Sekarang permintaan lain Budi selesai."))).toBe(true);
    expect(tabelB).toEqual([["1", String(dimas), "terkirim", "2"], ["2", String(budi), "menunggu", "1"]]);
    expect(KB.some((b) => b.startsWith("# Baris Budi bernomor lebih besar tetapi `dibuat` (awal transaction) lebih awal: ia ada di belakang kursor poller."))).toBe(true);
    expect(saldoNaik).toBe(2 * nominal);
    expect(saldoNaik).toBe(50000);
    expect(KB.some((b) => b.startsWith(`# Saldo Citra naik ${rp(saldoNaik)} (dua transfer), tetapi HP-nya (token ${tokenCitra}) menerima satu pesan saja`))).toBe(true);
    expect(pesanB).toBe(1);
    expect(tokenCitra).toBe(`tiruan-${citra}`);
    const b = segmen('bagian("B.', 'bagian("C.');
    expect(b).toContain("time.sleep(1.5)");
    expect(pengamatan).toBe("1,5");
    expect(b).toContain('["tiruan-504"]');
    expect(b).toContain('[(417, "terkirim"), (419, "menunggu")]');
    expect([dimas, budi]).toEqual([417, 419]);
    // sesi tangan memegang buku Budi (bukan Citra) di B, dan hanya kiriman Budi yang menunggu lock
    expect(b).toContain("h = tangan_kunci_buku(419)");
    expect(b).toContain("menunggu_lock() == 1");
  });
  test("C: worker yang mengklaim baris, bukan poller kursor, mengirim baris Budi; baris Dimas dari poller kursor berpercobaan 0", () => {
    expect(KC.some((b) => b === "$ ./api-t3 -peran worker -sekali")).toBe(true);
    expect(KC.some((b) => b.includes("-rentan kursor"))).toBe(false);
    expect([klaimC[1], klaimC[2]]).toEqual(["1", "1"]);
    expect(tabelC).toEqual([["1", String(dimas), "terkirim", "0"], ["2", String(budi), "terkirim", "1"]]);
    expect(pesanC).toBe(2);
    expect(KC.some((b) => b.startsWith("push tiruan menerima: 2 pesan; HP Citra berbunyi dua kali untuk dua transfer"))).toBe(true);
  });
  test("D: dua kiriman dilepas serentak dari dua thread, paling banyak 10 pasang, jumlah pasang tidak direkam, tanpa poller", () => {
    expect(KD.some((b) => b.startsWith(`# Sampai ${maksPasang} pasang (Budi dan Dimas, Rp1.000 ke Citra); tiap pasang dilepas serentak dari dua thread; berhenti pada pasang pertama yang terbalik`))).toBe(true);
    expect(KD.some((b) => b.startsWith(`pasang terbalik ditemukan dalam paling banyak ${maksPasang} pasang (jumlah pasang yang dipakai tidak direkam: bergantung waktu)`))).toBe(true);
    expect(tabelD).toEqual([["1", "2"], ["2", "1"]]);
    expect(KD.some((b) => b.startsWith("# Nomor 1 tiba di baris buku Citra lebih dulu, tetapi transaction-nya mulai lebih akhir (`dibuat` lebih akhir)."))).toBe(true);
    expect(KD.some((b) => b.startsWith("# Pemicu tidak harus dibuat: dua transfer yang berdekatan cukup untuk membalik urutan. Apakah baris benar-benar tertinggal bergantung pada putaran poller jatuh di antara dua COMMIT; B membuat celah itu panjang supaya terekam."))).toBe(true);
    const d = fnKursor.slice(fnKursor.indexOf('bagian("D.'), fnKursor.indexOf('tulis("kursor.txt"'));
    expect(d).toContain(`for _ in range(${maksPasang}):`);
    expect(d).toContain("threading.Barrier(2)");
    expect(d).not.toContain("mulai_worker");
    expect(fnKursor.indexOf('d.stop("kursor"')).toBeLessThan(fnKursor.indexOf('bagian("D.'));
    // poller kursor dimulai sekali per rekaman: restart poller tidak direkam di lab mana pun
    expect(hitung(runOutbox, /mulai_worker\("kursor"/g)).toBe(1);
    expect(hitung(runApi, /mulai_worker\("kursor"/g)).toBe(1);
  });
  test("api-t3 rentan.txt C: pembayaran Dimas ke Warung Ani COMMIT lebih dulu dan terkirim, transfer Budi ke Citra tertinggal", () => {
    expect(RC.some((b) => b.startsWith("# 2. Budi mengirim Rp20.000 ke Citra (transaction B): mulai lebih dulu, lalu menunggu lock yang dipegang A"))).toBe(true);
    expect(RC.some((b) => b.startsWith("# 3. Dimas membayar Warung Ani (transaction C): mulai sesudah B, tidak butuh lock yang dipegang, COMMIT lebih dulu"))).toBe(true);
    expect(tabel(RC, ["outbox_id", "jurnal_id", "jenis", "status", "dibuat_sebelum_c"], "rentan C").map((r) => [r[0], r[2], r[3], r[4]])).toEqual([
      ["1", "bayar", "terkirim", "f"],
      ["2", "transfer", "menunggu", "t"],
    ]);
    expect(RC.some((b) => b.startsWith("push tiruan menerima: 1 pesan (hanya C); dalam 1,5 detik pengamatan"))).toBe(true);
  });
  test("listen.txt A: baris yang di-ROLLBACK memakai nomor 2, berikutnya 3; klaim.txt C: urutan antar pesan tidak dijaga", () => {
    expect([celahNomor[1], celahNomor[2]]).toEqual(["2", "3"]);
    // komentar A hanya tulisan lab; nomor 3 yang benar-benar dibaca dari database ada di bagian B (nomor3 dikembalikan INSERT)
    const lb = bagian(pecah(listenTxt), "B");
    expect(lb.some((b) => b === `=> SELECT id, status FROM outbox WHERE id = ${celahNomor[2]}`)).toBe(true);
    expect(lb.filter((x) => new RegExp(`^ ${celahNomor[2]}\\s+\\| (menunggu|terkirim)$`).test(x))).toHaveLength(2);
    expect(hitung(runOutbox, /sql\("SELECT id, status FROM outbox WHERE id = %d" % nomor3\)/g)).toBe(2);
    expect(klaimTxt).toContain("# --- C. Urutan antar pesan tidak dijaga: baris yang dipegang worker lain dilewati, dikirim paling akhir ---");
  });
});

describe("kode lab: kursor, now(), urutan lock, dan klaim percobaan", () => {
  test("BacaKursor: baris menunggu dengan (dibuat, id) lebih besar dari kursor, urut (dibuat, id), tanpa klaim dan tanpa lock", () => {
    const region = outboxGo.slice(outboxGo.indexOf("// --8<-- [start:baca-kursor]"), outboxGo.indexOf("// --8<-- [end:baca-kursor]"));
    expect(region).toContain("WHERE status = 'menunggu' AND (dibuat, id) > ($1, $2)");
    expect(region).toContain("ORDER BY dibuat, id LIMIT $3");
    expect(region).not.toMatch(/FOR (UPDATE|SHARE)|klaim_sampai|percobaan =/);
    expect(region).toContain("`dibuat` = awal transaction, bukan COMMIT");
  });
  test("worker: kursor hanya maju lewat satu penugasan, hanya di memori proses, dan jalur kursor tidak memanggil klaim", () => {
    expect(hitung(workerGo, /w\.kursorDibuat, w\.kursorID = /g)).toBe(1);
    const baris = workerGo.split("\n");
    expect(baris[w0 - 1]).toBe("\tif w.cfg.Kursor {");
    expect(baris[w0]).toContain("w.repo.BacaKursor(ctx, w.kursorDibuat, w.kursorID, w.cfg.Serentak)");
    expect(baris[w0 + 1]).toContain("if len(baris) > 0 { // kursor maju ke baris terakhir yang dibaca, apa pun hasil pengirimannya");
    expect(baris[w0 + 2]).toContain("akhir := baris[len(baris)-1]");
    expect(baris[w0 + 3]).toContain("w.kursorDibuat, w.kursorID = akhir.Dibuat, akhir.ID");
    expect(baris[w0 + 4]).toBe("\t\t}");
    expect(baris[w0 + 5]).toBe("\t} else {");
    expect(baris[w0 + 6]).toContain("w.repo.KlaimOutbox(");
    expect(workerGo).toContain("return &Worker{repo: r, push: p, cfg: cfg, acak: rand.Float64}");
    const berkasKursor = gabungGo().filter((f) => baca(f).includes("kursorDibuat"));
    expect(berkasKursor).toEqual(["labs/api-t3/internal/worker/worker.go"]);
    const sql = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/migrasi/") && f.endsWith(".sql"));
    expect(sql.length).toBe(5);
    expect(sql.filter((f) => /kursor/i.test(baca(f)))).toEqual([]);
  });
  test("poller kursor tidak mencatat percobaan: hanya KlaimOutbox menaikkan kolom percobaan", () => {
    expect(hitung(outboxGo, /percobaan = /g)).toBe(1);
    expect(outboxGo.slice(outboxGo.indexOf("func (r Repo) KlaimOutbox"), outboxGo.indexOf("// --8<-- [end:klaim]"))).toContain("percobaan = o.percobaan + 1");
  });
  test("dibuat = now() (awal transaction): kolom outbox.dibuat dan INSERT outbox tanpa kolom dibuat", () => {
    expect(barisMigrasi[mig - 1]).toBe("  dibuat        timestamptz NOT NULL DEFAULT now(),");
    expect(outboxGo).toContain("INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES ($1, $2, $3, $4, $5)");
  });
  test("Kirim: kedua buku (pengirim dan penerima) dikunci urut id sebelum baris outbox ditulis, lock lepas di akhir transaction", () => {
    expect(ledgerGo).toMatch(/FROM buku WHERE akun_id = ANY\(\$1\)\s+ORDER BY id\s+FOR UPDATE/);
    expect(kirimGo).toContain("akun := []int64{peminta}");
    expect(kirimGo).toContain("akun = append(akun, penerima.ID)");
    expect(kirimGo.indexOf("tx.KunciBukuAkun(ctx, akun...)")).toBeGreaterThan(0);
    expect(kirimGo.indexOf("tx.KunciBukuAkun(ctx, akun...)")).toBeLessThan(kirimGo.indexOf("tx.CatatJurnal("));
    expect(kirimGo.indexOf("tx.CatatJurnal(")).toBeLessThan(kirimGo.indexOf("s.beritahu(ctx, tx, h.ID, penerima.ID, \"transfer\""));
    expect(notifGo).toContain("return tx.TulisOutbox(ctx, jurnal, penerima, repo.KelasUang, jenis, b)");
    expect(ledgerGo).toContain("// KunciBukuAkun mengunci buku milik akun-akun ini sampai transaction selesai");
  });
  test("RingkasOutbox melaporkan umur baris menunggu tertua dari dibuat", () => {
    const f = outboxGo.slice(outboxGo.indexOf("func (r Repo) RingkasOutbox"), outboxGo.indexOf("// BersihkanOutbox"));
    expect(f).toContain("extract(epoch FROM now() - min(dibuat))");
    expect(f).toContain("FROM outbox WHERE status = 'menunggu'");
  });
});

describe("sumber lain: RISET, naskah, ADR 16 di 2.19, PRD v3, widget, Rantai", () => {
  test("RISET: tiap tautan dokumentasi di halaman punya jejak, tanggal akses sama, dan kutipan yang dipakai ada", () => {
    const tautan = [...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(tautan).toEqual([
      "https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT",
      "https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS",
      "https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS",
      "https://www.postgresql.org/docs/17/functions-sequence.html",
      "https://www.morling.dev/blog/revisiting-the-outbox-pattern/",
    ]);
    for (const k of ["postgresql.org/docs/17", "functions-datetime §9.9.5", "functions-sequence §9.17", "explicit-locking §13.3.2", "morling.dev, 2024-10-31", "Revisiting the Outbox Pattern"]) expect(risetBaris, k).toContain(k);
    expect(risetBaris).toContain("PostgreSQL 17.11 (postgresql.org/docs/17, dibuka 2026-10-26)");
    expect(tanggal).toBe("2026-10-26");
    expect(hitung(halaman, /dibuka 2026-10-26/g)).toBe(4);
    expect(risetBaris).toContain('"their values do not change during the transaction"');
    expect(risetBaris).toContain('"cannot be used to obtain gapless sequences"');
    expect(risetBaris).toContain("halaman tidak membahas urutan COMMIT lawan urutan nilai");
    expect(risetBaris).toContain('"Row-level locks are released at transaction end"');
    expect(risetBaris).toContain("halaman tidak menjanjikan urutan transaction yang menunggu satu baris");
    expect(risetBaris).toContain("urutan pesan di tabel outbox, menurut timestamp atau kolom sequence, tidak dijamin sama dengan urutan COMMIT dan relay bisa melewatkan pesan");
    expect(risetBaris).toContain('(kalimat Morling sendiri; Kleppmann dirujuk lewat tulisan di X yang tidak dibuka, hanya untuk "poor ordering semantics")');
    expect(risetBaris).toContain("3.10: M19");
    // R3-04 dan R2-145 tetap ada sebagai dasar
    expect(riset).toContain("| R3-04 |");
    expect(baca("plan/RISET-TAHAP-2.md")).toContain("| R2-145 |");
    // R3-145 satu kali, urut sesudah R3-134 dan tanpa ID ganda
    const ids = riset.split("\n").map((b) => b.match(/^\| (R3-\d+) \|/)?.[1]).filter(Boolean) as string[];
    expect(ids.filter((x) => x === "R3-145")).toHaveLength(1);
    expect(ids).toEqual([...ids].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))));
    expect(new Set(ids).size).toBe(ids.length);
  });
  test("naskah M19: gejala, dugaan Raka dan Nadia, mekanisme kursor, dan ADR 24", () => {
    expect(barisNaskah).toContain("| M19 | 4 |");
    expect(minggu).toBe(4);
    expect(barisNaskah).toContain("Budi dan seorang rekan mengirim patungan ke Citra hampir bersamaan. Saldo Citra naik Rp50.000, tetapi HP-nya berbunyi sekali, bukan dua kali. Dua hari kemudian Ani menemukan tiga pembayaran hari Jumat yang tidak pernah diberitahukan (Ilustrasi).");
    expect(barisNaskah).toContain("Token perangkat Citra salah; Nadia: poller perlu nomor urut tanpa celah");
    expect(barisNaskah).toContain("Poller outbox membaca dengan kursor `(dibuat, id)`, meniru ADR 16, padahal aturan 5 ADR 16 melarang kursor itu untuk pembaca aliran seperti notifikasi.");
    expect(barisNaskah).toContain("`dibuat` adalah awal transaction, bukan COMMIT.");
    expect(barisNaskah).toContain("Nomor urut `id` pun bukan urutan commit (R3-04).");
    expect(barisNaskah).toContain("ADR 24: worker mengklaim baris, tanpa kursor; klaim punya batas waktu");
    expect(aturanAliran).toBe(5);
    expect(naskah.split("\n").find((b) => b.startsWith("| 24 |"))).toContain("Worker mengklaim baris dengan `FOR UPDATE SKIP LOCKED` dan batas klaim, tanpa kursor.");
    expect(naskah.split("\n").find((b) => b.startsWith("| 24 |"))).toContain("nomor urut tanpa celah");
    expect(naskah.split("\n").find((b) => b.startsWith("| 24 |"))).toContain("Bila urutan antar pesan penting: klaim per baris tidak menjaga urutan, dengan atau tanpa `SKIP LOCKED`");
  });
  test("ADR 16 di 2.19: aturan 2, 3, dan 5, dan rujukan ke notifikasi", () => {
    expect([aturanMuat, aturanCelah, aturanAliran]).toEqual([2, 3, 5]);
    expect(kursor219).toContain("Celah COMMIT belakangan diterima terbuka. Akibatnya hanya di tampilan: transaksi itu tampil di muat ulang berikutnya");
    expect(kursor219).toContain("5. Pembaca yang menganggap riwayat sebagai aliran tidak boleh memakai kursor ini. Sync offline dan notifikasi butuh opsi C atau D, dan keputusan itu menunggu Tahap 3.");
    expect(kursor219).toContain("2. App memuat ulang riwayat dengan membuang daftar lalu mulai dari halaman pertama tanpa kursor.");
    expect(baca("situs/data/cerita.json")).toContain('"id": "t2-kursor"');
  });
  test("PRD v3 dan 3.4: pertanyaan kedua ditanam dan M19 dijanjikan menjawabnya", () => {
    expect(prd).toContain("2. Kalau pemberitahuan gagal terkirim, siapa yang tahu?");
    expect(prd).toContain("[[t3-m19]] untuk yang kedua");
    expect(duaTempat).toContain("Jawabannya ada di [[t3-m18]], [[t3-m19]], dan [[t3-m20]].");
  });
  test("widget kursor: dua knob, pilihan Klaim per baris, tiga kombinasi Rekaman lab dan satu Hitungan, noscript", () => {
    const k = (widgetMentah as unknown as { skenario: { kursor: { nama: string; tebak: { pertanyaan: string }; knob: { id: string; opsi: Record<string, string> }[] } } }).skenario.kursor;
    expect(k.tebak.pertanyaan).toContain("Budi mulai lebih dulu, tetapi menunggu baris bukunya sendiri. Dimas mulai kemudian dan COMMIT lebih dulu.");
    expect(k.knob.map((x) => x.id)).toEqual(["poller", "urutan"]);
    expect(k.knob[0]!.opsi.klaim).toBe("Klaim per baris");
    expect(halaman).toContain('"Klaim per baris"');
    const jenis = (poller: string, urutan: string): string => acuanDari("kursor", { poller, urutan }).jenis;
    expect([jenis("kursor", "berurutan"), jenis("kursor", "terbalik"), jenis("klaim", "terbalik"), jenis("klaim", "berurutan")]).toEqual(["rekaman", "rekaman", "rekaman", "hitungan"]);
    expect(hitung(halaman, /<OutboxWorker skenario=\{\["kursor"\]\} \/>/g)).toBe(1);
    expect(komponenOutbox).toMatch(/^<noscript>\n  <p>\{L\.tanpaJs\}<\/p>$/m);
    expect(komponenOutbox).toContain("OutboxWorkerIsland client:visible");
  });
  test("widget kursor: teks dikunci, jawaban dan nomor tiap COMMIT dan sumber diturunkan dari rekaman (alasan 'tidak pernah dibaca' lebih kuat dari kode)", () => {
    const berkas = {
      transaksi: baca("labs/t3-outbox/output/transaksi.txt"),
      kursor: kursorTxt,
      ganda: baca("labs/t3-outbox/output/ganda.txt"),
      retry: baca("labs/t3-outbox/output/retry.txt"),
      queue: baca("labs/t3-outbox/output/queue.txt"),
    };
    const k = konstanta(bacaAcuan(berkas));
    const w = (widgetMentah as unknown as { skenario: { kursor: { nama: string; tebak: { pilihanTeks: string; pilihan: { nilai: number; alasan: string }[] }; knob: { id: string; label: string; opsi: Record<string, string> }[]; peristiwa: Record<string, string>; ringkas: Record<string, string> } } }).skenario.kursor;
    const terbalik = jalankanKursor("kursor", "terbalik", k);
    const berurutan = jalankanKursor("kursor", "berurutan", k);
    const klaim = jalankanKursor("klaim", "terbalik", k);
    expect([terbalik.angka.pesan, berurutan.angka.pesan, klaim.angka.pesan]).toEqual([pesanB, tabelA.filter((r) => r[4] === "terkirim").length, pesanC]);
    expect(terbalik.angka.saldoNaik).toBe(saldoNaik);
    expect(k.nominal).toBe(nominal);
    const nilai = (h: ReturnType<typeof jalankanKursor>, kunci: string) => h.garis.find((p) => p.kunci === kunci)!.nilai;
    const nomorDi = (tb: string[][], pengirim: number) => Number(tb.find((r) => r[tb[0]!.length === 5 ? 2 : 1] === String(pengirim))![0]);
    expect([nilai(terbalik, "commit-pertama"), nilai(terbalik, "commit-kedua")]).toEqual([
      { siapa: "Dimas", nomor: nomorDi(tabelB, dimas) },
      { siapa: "Budi", nomor: nomorDi(tabelB, budi) },
    ]);
    expect([nilai(berurutan, "commit-pertama"), nilai(berurutan, "commit-kedua")]).toEqual([
      { siapa: "Budi", nomor: nomorDi(tabelA, budi) },
      { siapa: "Dimas", nomor: nomorDi(tabelA, dimas) },
    ]);
    expect(w.nama).toBe("Kursor atau klaim");
    expect(w.tebak.pilihan.map((p) => p.nilai)).toEqual([0, 1, 2]);
    expect(w.tebak.pilihan.find((p) => p.nilai === terbalik.angka.pesan)!.alasan).toBe(
      `{pesan} notifikasi: baris Dimas dikirim dan kursor maju. Baris Budi bernomor lebih besar, tetapi dibuat lebih awal, jadi ada di belakang kursor dan tidak dibaca selama poller berjalan. Saldo Citra naik {saldo}.`,
    );
    expect(w.tebak.pilihan[0]!.alasan).toBe("Poller membaca baris Dimas begitu COMMIT. Nol notifikasi hanya terjadi bila kedua baris terlewat, dan baris Dimas tidak terlewat.");
    expect(w.tebak.pilihan[2]!.alasan).toBe("Dua notifikasi benar bila yang COMMIT lebih dulu juga dibuat lebih dulu. Di sini urutan itu terbalik, dan kursor hanya melihat ke depan.");
    // "tidak pernah dibaca" melampaui kode: kursor di memori, poller yang dimulai ulang membaca dari awal (worker.go)
    expect(JSON.stringify(widgetMentah.skenario.kursor)).not.toMatch(/tidak pernah/);
    expect(w.knob.map((b) => [b.id, b.label, b.opsi])).toEqual([
      ["poller", "Cara worker mengambil", { kursor: "Kursor (dibuat, id)", klaim: "Klaim per baris" }],
      ["urutan", "Urutan COMMIT", { berurutan: "Yang mulai lebih dulu COMMIT lebih dulu", terbalik: "Yang mulai lebih dulu COMMIT belakangan" }],
    ]);
    expect(w.ringkas).toEqual({
      "ringkas-dua": "{konfig}: kedua transfer diberi tahu, saldo Citra naik {saldo}.",
      "ringkas-hilang": "{konfig}: HP Citra menerima {pesan} notifikasi, padahal saldonya naik {saldo}.",
    });
    expect(w.peristiwa).toEqual({
      "mulai-berurutan": "Budi dan Dimas mengirim ke Citra. Keduanya antre di baris buku Citra, dan Budi tiba lebih dulu.",
      "mulai-terbalik": "Budi mulai lebih dulu, tetapi menunggu baris bukunya sendiri yang dipegang permintaan lain. Dimas mulai kemudian dan tidak terhalang.",
      "commit-pertama": "COMMIT {siapa}: baris outbox bernomor {nomor}.",
      "commit-kedua": "COMMIT {siapa}: baris outbox bernomor {nomor}.",
      "kursor-kirim": "Poller kursor mengirim baris {siapa} (nomor {nomor}) dan memajukan kursor.",
      "kursor-lewat": "Poller kursor tidak membaca baris {siapa} (nomor {nomor}): waktu dibuatnya lebih awal dari kursor.",
      "klaim-kirim": "Worker mengklaim baris {siapa} (nomor {nomor}) dan mengirimnya.",
      "hp-terima": "HP Citra menerima notifikasi dari {siapa}.",
    });
    // sumber rekaman tiap kombinasi, dan Hitungan bagi yang tidak direkam
    const sumber = (poller: string, urutan: string): string => `${acuanDari("kursor", { poller, urutan }).jenis}:${acuanDari("kursor", { poller, urutan }).sumber}`;
    expect([sumber("kursor", "berurutan"), sumber("kursor", "terbalik"), sumber("klaim", "terbalik"), sumber("klaim", "berurutan")]).toEqual([
      "rekaman:kursor.txt A",
      "rekaman:kursor.txt B",
      "rekaman:kursor.txt C",
      "hitungan:kursor",
    ]);
  });
  test("Rantai: tiap nilai teks diturunkan dari rekaman bagian A, B, dan C", () => {
    const harap = {
      id: "t3-m19-kursor-tertinggal",
      judul: "Kursor (dibuat, id): kapan satu baris tertinggal",
      sumber: { jenis: "rekaman", teks: "Rekaman lab t3-outbox · kursor.txt bagian A, B, dan C" },
      baris: [
        {
          label: "COMMIT terbalik",
          sub: "bagian B, poller kursor",
          simpul: [
            { teks: "Budi mulai lebih dulu, lalu menunggu", sub: "dibuat paling awal" },
            { teks: "Dimas COMMIT lebih dulu", sub: `nomor outbox ${tabelB[0]![0]}, ${tabelB[0]![2]}` },
            { teks: "Kursor maju melewati dibuat Budi" },
            { teks: "Baris Budi tertinggal", sub: `nomor ${tabelB[1]![0]}, ${tabelB[1]![2]}; HP Citra menerima ${pesanB} pesan`, nada: "warn" },
          ],
        },
        {
          label: "COMMIT berurutan",
          sub: "bagian A, poller kursor",
          simpul: [
            { teks: "Dua kiriman antre di buku Citra", sub: `${menungguA} transaction menunggu lock` },
            { teks: `Nomor ${tabelA[0]![0]} untuk Budi, ${tabelA[1]![0]} untuk Dimas`, sub: `dibuat urut ${tabelA[0]![3]} dan ${tabelA[1]![3]}` },
            { teks: "Dua pesan terkirim", nada: "good" },
          ],
        },
        {
          label: "Sesudah B: klaim per baris",
          sub: "bagian C, tanpa kursor",
          simpul: [
            { teks: "Worker mengklaim baris yang tertinggal", sub: `diklaim ${klaimC[1]}, terkirim ${klaimC[2]}` },
            { teks: `HP Citra menerima ${pesanC} pesan`, nada: "good" },
          ],
        },
      ],
      catatan: "Kursor hanya maju. Baris dari transaction yang mulai lebih awal tetapi COMMIT belakangan ada di belakangnya.",
    };
    expect(rantaiMentah).toEqual(harap);
    expect(rantai.baris).toHaveLength(3);
    expect(tabelA.length).toBe(2);
    expect(tabelB[1]![2]).toBe("menunggu");
  });
});
