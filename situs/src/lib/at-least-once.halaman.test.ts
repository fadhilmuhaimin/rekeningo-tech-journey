// Penjaga halaman 3.13 (keputusan 1048 sampai 1050): angka, ID, nomor ADR, nomor baris Snippet, tanggal akses, versi sumber,
// label sumber, dan kalimat di at-least-once.mdx diturunkan dari rekaman labs/ (t3-outbox, api-t3), kode lab, naskah,
// registry, RISET, dan halaman tetangga. Isi halaman dikunci unit demi unit (EXPECT, nilai diisi dari sumber lewat
// «placeholder»), dan tiap klaim mekanisme dipasangkan dengan rekaman atau kode yang membuktikannya di tes terpisah,
// sebab mengunci kalimat utuh tidak menangkap kalimat yang SALAH (pelajaran 3.4 sampai 3.10). Klaim dokumentasi (Kafka,
// Stripe, SQS, FCM, FlutterFire, pg-boss, Laravel, Django, Serverpod, pgmq) dijaga lewat baris riset R3-160 sampai R3-164,
// yang dibuka ke sumber primer 2026-10-26 dan dikunci dengan sidik jari. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-at-least-once-inti.json";
import registry from "../../data/cerita.json";
import widgetMentah from "../../data/widget/t3-outbox-worker.json";
import { acuanDari, GAGAL_SEBELUM_PULIH, jalankan, konstanta, semuaKonfig } from "../widgets/outbox-worker/logika";
import { bacaAcuan } from "../widgets/outbox-worker/rekaman";
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

const halamanBerkas = "situs/src/content/docs/tahap-3/at-least-once.mdx";
const mdx = baca(halamanBerkas);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const rantai = DataRantai.parse(rantaiMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const riset2 = baca("plan/RISET-TAHAP-2.md");
const retryTxt = baca("labs/t3-outbox/output/retry.txt");
const gandaTxt = baca("labs/t3-outbox/output/ganda.txt");
const listenTxt = baca("labs/t3-outbox/output/listen.txt");
const queueTxt = baca("labs/t3-outbox/output/queue.txt");
const transaksiTxt = baca("labs/t3-outbox/output/transaksi.txt");
const kursorTxt = baca("labs/t3-outbox/output/kursor.txt");
const pushTxt = baca("labs/api-t3/output/push.txt");
const readmeLab = baca("labs/t3-outbox/README.md");
const runOutbox = baca("labs/t3-outbox/run.py");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const pushGo = baca("labs/api-t3/internal/push/push.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const goMod = baca("labs/api-t3/go.mod");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal33 = baca("situs/src/content/docs/tahap-3/fitur-notifikasi.mdx");
const hal39 = baca("situs/src/content/docs/tahap-3/outbox-worker.mdx");
const caraPakai = baca("situs/src/content/docs/cara-pakai.mdx");
const komponenOutbox = baca("situs/src/components/OutboxWorker.astro");
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
const barisAkhir = (semua: string[], pola: RegExp, dari = 0): number => {
  const i = semua.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
const kata = (n: number): string => KATA[n]!;
const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
const koma = (n: number, d = 1): string => n.toFixed(d).replace(".", ",");
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;
const barisRiset = (id: string): string => {
  const b = riset.split("\n").filter((x) => x.startsWith(`| ${id} |`));
  expect(b, `baris riset ${id}`).toHaveLength(1);
  return b[0]!;
};

const RP = pecah(retryTxt);
const RA = bagian(RP, "A");
const RB = bagian(RP, "B");
const RC = bagian(RP, "C");
const RD = bagian(RP, "D");
const GP = pecah(gandaTxt);
const GA = bagian(GP, "A");
const GB = bagian(GP, "B");
const GC = bagian(GP, "C");
const GD = bagian(GP, "D");
const PP = pecah(pushTxt);
const PB = bagian(PP, "B");
const PD = bagian(PP, "D");
const PE = bagian(PP, "E");
const LC = bagian(pecah(listenTxt), "C");
const barisWorker = workerGo.split("\n");

// ---- nilai turunan dari rekaman dan kode ------------------------------------------------------------
const batasP = Number(cari(/MaksPercobaan: (\d+)/, barisWorker, "MaksPercobaan")[1]);
const backoffAwal = Number(cari(/DasarBackoff: (\d+) \* time\.Second/, barisWorker, "DasarBackoff")[1]);
const backoffMaks = Number(cari(/MaksBackoff: (\d+) \* time\.Second/, barisWorker, "MaksBackoff")[1]);
const klaim = Number(cari(/Klaim: (\d+) \* time\.Second/, barisWorker, "Klaim")[1]);
const pushTimeout = Number(cari(/BatasBawaan = (\d+) \* time\.Second/, pushGo.split("\n"), "BatasBawaan")[1]);
const bounds = RA.map((b) => b.match(/coba lagi paling lama (\d+) detik lagi \(acak antara 0 dan \d+\): ya$/)).filter((m) => m !== null).map((m) => Number(m![1]));
const jumlahBounds = bounds.join(" + ");
const jeda = bounds.reduce((a, b) => a + b, 0);
const jendela = jeda + batasP * pushTimeout;
const daftarBounds = `${bounds.slice(0, -1).join(", ")}, dan ${bounds.at(-1)}`;
const mintaA = Number(cari(/^push tiruan menerima: (\d+) permintaan untuk 1 notifikasi_id$/, RA, "retry A")[1]);
const putaranKosong = Number(cari(/^putaran (\d+): diklaim 0 \(baris mati tidak diklaim lagi\)$/, RA, "retry A putaran kosong")[1]);
const klaimC = cari(/^klaim (\d+): diklaim 1, mati 1, tanpa kirim; outbox\.status = mati, percobaan = (\d+)$/, RC, "retry C klaim mati");
const klaimMati = Number(klaimC[1]);
const mintaC = Number(cari(/^push tiruan menerima: (\d+) pesan untuk 1 notifikasi_id \(klaim ke-(\d+) tidak mengirim\)$/, RC, "retry C pesan")[1]);
const jitter = cari(/^# Batas backoff pertama (\d+) detik: (\d+) baris mendapat (\d+) waktu coba berbeda, tersebar lebih dari ([\d,]+) detik, semuanya paling lama (\d+) detik lagi: ya$/, RB, "retry B jitter");
const jitterN = Number(jitter[2]);
const sebar = jitter[4]!;
const batas1 = Number(jitter[5]);
const replayKe = Number(cari(/^ ?\d+ +\| bayar +\| terkirim +\| (\d+)$/, RD, "retry D terkirim")[1]);
const gandaA = cari(/^push tiruan menerima: (\d+) pesan, (\d+) notifikasi_id$/, GA, "ganda A");
const gandaPesan = Number(gandaA[1]);
const gandaId = Number(gandaA[2]);
const jurnalBaru = Number(GA[GA.findIndex((b) => b.trim() === "jurnal_bayar_baru") + 2]!.trim());
const penyaringC = cari(/^diterima: (\d+) pesan; ditampilkan: (\d+) /, GC, "ganda C");
const diterimaC = Number(penyaringC[1]);
const tampilC = Number(penyaringC[2]);
const klaimPendekMs = Number(cari(/Klaim (\d+) ms, layanan push menjawab permintaan pertama sesudah ([\d,]+) detik/, GB, "ganda B")[1]);
const pushLambat = cari(/Klaim (\d+) ms, layanan push menjawab permintaan pertama sesudah ([\d,]+) detik/, GB, "ganda B")[2]!;
const gandaD = cari(/^push tiruan menerima: (\d+) pesan \(dua HP, dua worker\), (\d+) notifikasi_id$/, GD, "ganda D");
const hp2 = Number(cari(/menggantung: (\d+) x (\d+) detik ---$/, [judulBagian(gandaTxt, "D")], "ganda D judul")[1]);
const retensi = Number(cari(/^# --- C\. Retensi (\d+) hari: /, listenTxt.split("\n"), "listen C")[1]);
const lambdaNaskah = cari(/\| 0,087 rata-rata dan (0,868) puncak/, naskah.split("\n"), "lambda naskah")[1]!;
const lambdaNilai = Math.round(((7500 / 86400) * 10) * 1000) / 1000;
const menitGangguan = 10;
const detikGangguan = menitGangguan * 60;
const barisMatiNilai = lambdaNilai * detikGangguan;
const perangkatPerUser = cari(/([\d,]+) perangkat per user adalah Asumsi/, riset.split("\n"), "perangkat per user")[1]!;
const tanggal = cari(/dibuka (\d{4}-\d{2}-\d{2})/, [barisRiset("R3-160")], "tanggal R3-160")[1]!;
const pg = cari(/^# PostgreSQL (\d+\.\d+) /, gandaTxt.split("\n"), "PostgreSQL")[1]!;
const pgmq = cari(/rilis terbaru v(\d+\.\d+\.\d+), (\d{4}-\d{2}-\d{2})/, [barisRiset("R3-164")], "pgmq");
const serverpod = cari(/Serverpod (\d+\.\d+\.\d+)/, [barisRiset("R3-144")], "Serverpod")[1]!;
const brookerClient = Number(cari(/pada (\d+) client yang berebut/, [barisRiset("R3-160")], "Brooker")[1]);

// ---- nilai turunan dari widget (mesin yang sama dengan jawaban) -------------------------------------
const acuan = bacaAcuan({ transaksi: transaksiTxt, kursor: kursorTxt, ganda: gandaTxt, retry: retryTxt, queue: queueTxt });
const K = konstanta(acuan);
const W = widgetMentah as unknown as {
  skenario: Record<"ulang" | "ganda", { nama: string; knob: { id: string; label: string; opsi: Record<string, string> }[] }>;
};
const nUlang = W.skenario.ulang;
const nGanda = W.skenario.ganda;
const opsiU = (id: string, nilai: string) => nUlang.knob.find((k) => k.id === id)!.opsi[nilai]!;
const opsiG = (id: string, nilai: string) => nGanda.knob.find((k) => k.id === id)!.opsi[nilai]!;
const hitungJenis = (s: "ulang" | "ganda") => {
  const j: Record<string, number> = { rekaman: 0, hitungan: 0, ilustrasi: 0, asumsi: 0 };
  for (const kf of semuaKonfig(s)) j[acuanDari(s, kf).jenis]!++;
  return { total: semuaKonfig(s).length, ...j };
};
const hu = hitungJenis("ulang");
const hg = hitungJenis("ganda");
const hasilUlang = (penyebab: string, batas: string) => jalankan("ulang", { penyebab, batas }, K);
const hasilGanda = (varian: string, penyaring: string) => jalankan("ganda", { varian, penyaring }, K);

const V: Record<string, string | number> = {
  klaim, gandaPesan, gandaId, kataJurnal: kata(jurnalBaru), mintaA, diterimaC, tampilC, kataBatas: kata(batasP),
  uTotal: hu.total, namaUlang: nUlang.nama, uRek: hu.rekaman, uHit: hu.hitungan,
  namaGanda: nGanda.nama, gTotal: hg.total, gRek: hg.rekaman, gHit: hg.hitungan, gAsu: hg.asumsi,
  lblMatiKirim: opsiU("penyebab", "worker-mati"), lblBatas: opsiU("batas", "5").replace("{n}", "5"),
  KataMintaC: cap(kata(mintaC)), percobaanC: hasilUlang("worker-mati", "5").angka.percobaan as number, klaimMati,
  lblPulih: opsiU("penyebab", "pulih-sesudah-2").replace("{gagal}", String(GAGAL_SEBELUM_PULIH)),
  pulihKe: hasilUlang("pulih-sesudah-2", "5").angka.percobaan as number,
  lblMatiKlaim: opsiG("varian", "mati-klaim-5"), lblSaring: opsiG("penyaring", "hidup"),
  KataDiterimaC: cap(kata(diterimaC)), kataTampilC: kata(tampilC), lblDuaHp: opsiG("varian", "dua-hp-klaim-5"),
  duaHpPesan: hasilGanda("dua-hp-klaim-5", "mati").angka.pesan as number, duaHpTampil: hasilGanda("dua-hp-klaim-5", "hidup").angka.tampil as number,
  bounds: daftarBounds, jeda, jumlahBounds, batasP, jitterN, sebar, batas1, brookerClient, putaranKosong, nolKlaim: 0, replayKe,
  pushTimeout, jendela, menitGangguan, lambda: lambdaNaskah, detikGangguan, barisMati: Math.round(barisMatiNilai), barisMatiPersis: koma(barisMatiNilai),
  backoffMaks, backoffAwal, retensi, hp2, klaimPendekMs, pushLambat, perangkatPerUser, tanggal, pg, pgmq: pgmq[1]!, pgmqTanggal: pgmq[2]!, serverpod, mintaC,
};
const isi = (t: string): string =>
  t.replace(/«(\w+)»/g, (_, k: string) => {
    if (!(k in V)) throw new Error(`placeholder tidak dikenal: ${k}`);
    return String(V[k]);
  });

// ---- isi halaman, unit demi unit (dipisah baris kosong); «nama» diisi dari sumber lewat isi() ----
const EXPECT: string[] = [
  "import Blok from \"../../../components/Blok.astro\";\nimport Rantai from \"../../../components/Rantai.astro\";\nimport Snippet from \"../../../components/Snippet.astro\";\nimport TabSet from \"../../../components/TabSet.astro\";\nimport OutboxWorker from \"../../../components/OutboxWorker.astro\";\nimport intiDiagram from \"../../../../data/diagram/t3-at-least-once-inti.json\";",
  "<p class=\"meta\">Baca 19 menit · coba 3 menit · Prasyarat: [[t3-m20]] · Jalur inti</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Worker mengirim ulang pemberitahuan sampai lima kali, dan app menampilkan satu pemberitahuan untuk setiap `notifikasi_id`.",
  "<Rantai data={intiDiagram} ringkas />",
  "At-least-once artinya pemberitahuan tidak hilang, tetapi bisa sampai lebih dari sekali. Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `ganda.txt` bagian A, worker berhenti sesudah layanan push menjawab dan sebelum baris ditandai `terkirim`. Klaim «klaim» detik habis, worker berikutnya mengirim ulang, dan layanan push menerima «gandaPesan» pesan dengan «gandaId» `notifikasi_id`. Jurnalnya tetap «kataJurnal».",
  "Pengiriman ulang punya batas. Di `retry.txt` bagian A, layanan push yang menjawab 503 terus menerima «mintaA» permintaan, lalu baris berstatus `mati`. Di `ganda.txt` bagian C, penyaring tiruan menerima «diterimaC» pesan dan menampilkan «tampilC». Penyaring itu lima baris Python di lab, jadi bentuk Dart-nya ada di blok Paham dan Tidak dijalankan.",
  "<details class=\"question\">\n<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Worker mati sesudah tiap push berhasil, dan batasnya «kataBatas» percobaan. Berapa pesan sampai ke layanan push, dan pada klaim ke berapa baris masuk dead-letter?\n2. Kenapa penyaring `notifikasi_id` di app tidak jalan untuk pesan notification saat app di background?\n3. Apa yang terjadi bila klaim lebih pendek daripada waktu kirim satu baris?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: mengirim ulang itu benar, dan yang harus berubah adalah penerima yang mengenali ulangan, bukan pengirim yang berhenti mengulang.\">",
  "Widget ini memerankan dua keadaan: «namaUlang», lalu «namaGanda». Tebak dulu, lalu ubah satu hal.",
  "Hitungan adalah hasil rumus dari angka rekaman, dan Asumsi adalah angka pilihan penulis tanpa rekaman. Dari «uTotal» pengaturan «namaUlang», «uRek» punya Rekaman lab dan «uHit» adalah Hitungan. Dari «gTotal» pengaturan «namaGanda», «gRek» punya Rekaman lab, «gHit» adalah Hitungan, dan «gAsu» adalah Asumsi.",
  "<OutboxWorker skenario={[\"ulang\", \"ganda\"]} />",
  "**Ubah satu hal:** di «namaUlang», pilih «lblMatiKirim» dengan «lblBatas». «KataMintaC» pesan sampai ke layanan push dan percobaan di baris menjadi «percobaanC», karena klaim ke-«klaimMati» melewati batas tanpa mengirim (`retry.txt` bagian C). Ganti ke «lblPulih»: baris terkirim pada percobaan ke-«pulihKe», dan `push.txt` bagian B di lab api-t3 merekam urutan yang sama.",
  "Di «namaGanda», pilih «lblMatiKlaim», lalu «lblSaring». «KataDiterimaC» pesan diterima dan «kataTampilC» ditampilkan (`ganda.txt` bagian C). Pilih «lblDuaHp»: «duaHpPesan» pesan sampai ke layanan push, dan penyaring menampilkan «duaHpTampil», satu per HP (Hitungan).",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t3-m20]] menunjukkan satu jurnal dan dua pemberitahuan. Pengirimnya benar mengirim ulang, dan yang kurang adalah penerima yang mengenali ulangan. Halaman ini memutuskan cara mengirim ulang yang aman dan siapa yang menyaring.",
  "Dokumentasi Kafka membedakan tiga jaminan pengiriman. At-most-once: pesan bisa hilang tetapi tidak pernah dikirim ulang. At-least-once: pesan tidak hilang tetapi bisa dikirim ulang. Exactly-once: tiap pesan diproses sekali dan hanya sekali ([Apache Kafka: Message Delivery Semantics](https://github.com/apache/kafka/blob/trunk/docs/design/design.md), dibaca dari sumber dokumentasinya, dibuka «tanggal»).",
  "PRD v3 menyebut notifikasi yang terlambat, hilang, atau muncul dua kali sebagai hal yang membuat karyawan berhenti memakai Rekeningo ([[t3-prd]]). Pemberitahuan uang juga tidak boleh hilang tanpa terdeteksi. Hanya at-least-once yang memenuhi syarat itu di sisi pengirim, dan penerima menutup syarat sisanya.",
  "Kenapa bukan exactly-once? Dokumentasi Kafka menulis bahwa menulis ke sistem luar menuntut koordinasi posisi consumer dengan output, lewat two-phase commit atau dengan menyimpan keduanya di tempat yang sama. Layanan push tidak memberi worker jalan untuk itu. Itu penalaran dari dokumentasi FCM. `MESSAGE_ACCEPTED` berarti server FCM menerima pesan, dan `MESSAGE_DELIVERED` berarti pesan sampai ke SDK di HP ([FCM: Understanding message delivery](https://firebase.google.com/docs/cloud-messaging/understand-delivery), dibuka «tanggal»).",
  "### Cara kerjanya",
  "**Empat kejadian membuat satu baris dikirim lagi, dan satu tidak.**",
  "| Kejadian | Nasib baris | Dikirim lagi | Sumber |\n|---|---|---|---|\n| Layanan push menjawab 503, atau tidak menjawab dalam «pushTimeout» detik | `menunggu`, dengan `coba_lagi` di depan | Ya, sesudah backoff | `retry.txt` bagian A; `push.txt` bagian E |\n| Worker mati sesudah push berhasil | `menunggu` sampai klaim habis | Ya, oleh worker berikutnya | `ganda.txt` bagian A |\n| Klaim habis selagi worker pertama masih mengirim | Dua worker mengirim, tanpa ada yang mati | Ya, bersamaan | `ganda.txt` bagian B dan D |\n| Satu perangkat gagal sementara, perangkat lain sudah menerima | Seluruh baris ditunda | Ya, ke semua perangkat aktif | Dibaca dari kode `kirimSatu`, tidak direkam |\n| Token ditolak dengan 404 atau 400 | `dilewati`, perangkat dinonaktifkan | Tidak | `push.txt` bagian D |",
  "Baris kelima bukan kegagalan sementara. Mengirim ulang ke token yang ditolak tidak mengubah jawabannya, jadi worker menonaktifkan perangkatnya ([[t3-notifikasi]] membahasnya).",
  "**Jeda antar percobaan makin panjang dan diacak.** Tunggu sesudah kegagalan ke-n adalah angka acak antara 0 dan min(«backoffMaks», «backoffAwal» × 2^(n−1)) detik:",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"59:68\" lang=\"go\" title=\"labs/api-t3/internal/worker/worker.go\" />",
  "Lab merekam batas atasnya, bukan nilai acaknya. Sesudah kegagalan ke-1 sampai ke-4, `coba_lagi` paling lama «bounds» detik lagi (`retry.txt` bagian A). Lab memajukan `coba_lagi` dengan `UPDATE` tangan supaya tidak menunggu. Jumlah batas itu «jeda» detik (Hitungan: «jumlahBounds»), dan kegagalan ke-«batasP» tidak menunggu lagi karena barisnya masuk dead-letter.",
  "Jitter mencegah baris yang gagal bersamaan mengulang bersamaan. Di bagian B, «jitterN» baris yang gagal pada putaran yang sama mendapat «jitterN» waktu coba berbeda. Waktunya tersebar lebih dari «sebar» detik, semuanya paling lama «batas1» detik lagi.",
  "Brooker menulis hasil serupa dari simulasi optimistic concurrency control terhadap database jarak jauh. Sesudah jitter ditambahkan, «brookerClient» client yang berebut memanggil lebih dari separuh lebih sedikit ([Brooker: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/), 2015-03-04, dibuka «tanggal»). Konteksnya bukan layanan push.",
  "**Batas lima dihitung saat klaim.** Kolom `percobaan` menghitung berapa kali baris diklaim, bukan berapa kali ia gagal. Klaim menaikkannya sebelum worker mengirim. Worker yang menerima baris dengan `percobaan` di atas «batasP» memasukkannya ke dead-letter tanpa mengirim:",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"135:144\" lang=\"go\" title=\"labs/api-t3/internal/worker/worker.go\" />",
  "Push yang gagal sementara dicatat lewat `tunda`, dan batasnya di sana sedikit berbeda:",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"187:197\" lang=\"go\" title=\"labs/api-t3/internal/worker/worker.go\" />",
  "Akibatnya dua jalan menuju `mati` punya hitungan berbeda. Push yang menjawab 503 terus menerima «mintaA» permintaan, dan barisnya `mati` pada kegagalan ke-«batasP» (`retry.txt` bagian A). Worker yang mati sesudah tiap push berhasil juga mengirim «mintaC» pesan, tetapi barisnya baru `mati` pada klaim ke-«klaimMati», tanpa kirim (bagian C). Worker yang mati tidak sempat mencatat kegagalan, jadi hanya hitungan saat klaim yang menghentikan pengulangannya.",
  "Amazon SQS memakai hitungan yang sama. `maxReceiveCount` adalah berapa kali consumer boleh menerima pesan sebelum pesan pindah ke dead-letter queue ([Amazon SQS: dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html), dibuka «tanggal»).",
  "**Dead-letter dibaca manusia dulu.** Di outbox itu status `mati`. Barisnya tetap di tabel, tidak diklaim lagi (putaran ke-«putaranKosong» di `retry.txt` bagian A mengklaim «nolKlaim» baris), dan tidak dibuang oleh `-bersih` (`listen.txt` bagian C).",
  "Seseorang membaca baris `mati`, memperbaiki penyebabnya, lalu memutarnya ulang dengan satu `UPDATE` yang mengembalikan `status` ke `menunggu` dan `percobaan` ke 0. Di bagian D baris itu terkirim pada percobaan ke-«replayKe», dengan `notifikasi_id` yang sama. Dokumentasi SQS menulis tujuan yang sama: pesan yang gagal diisolasi supaya penyebabnya bisa diperiksa, dan ada cara memindahkannya kembali.",
  "**Berapa lama jendela retry, dan berapa baris yang mati bila push mati.**",
  "| Besaran | Rumus | Hasil | Label |\n|---|---|---|---|\n| Jeda paling lama sebelum dead-letter | «jumlahBounds» | «jeda» detik | Hitungan dari batas atas di `retry.txt` bagian A |\n| Jendela retry paling lama | «jeda» + «batasP» × «pushTimeout» | «jendela» detik | Hitungan; batas push «pushTimeout» detik dari `push.txt` bagian E |\n| Baris yang masuk dead-letter bila push mati «menitGangguan» menit | «lambda» × «detikGangguan» | paling banyak «barisMati» baris («barisMatiPersis») | Asumsi: «lambda» per detik dan «menitGangguan» menit adalah angka penulis |",
  "Layanan push yang mati lebih lama dari «jendela» detik mengirim hampir semua baris yang masuk selama gangguan ke dead-letter. Barisnya tidak hilang, dan statusnya bisa dihitung.",
  "### Penyaring di app",
  "Penyaring `notifikasi_id` hanya berguna bila kode app jalan saat pesan tiba. Itu ditentukan jenis pesan FCM. Dokumentasi FCM menulis bahwa pesan notification ditampilkan FCM SDK saat app di background, dan pesan data diproses kode app sendiri ([FCM: message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type), dibuka «tanggal»).",
  "Tabel ini mengikuti dokumentasi Android untuk pesan AndroidConfig v1, yaitu field `android`. Di sana `onMessageReceived` adalah callback pesan masuk ([FCM: receive messages di Android](https://firebase.google.com/docs/cloud-messaging/android/receive), dibuka «tanggal»).",
  "| Jenis pesan | App di foreground | App di background |\n|---|---|---|\n| notification | `onMessageReceived` | Tray sistem, tanpa kode app |\n| data | `onMessageReceived` | `onMessageReceived` |\n| notification dan data | `onMessageReceived` | Notification di tray; data baru diterima saat user mengetuknya |",
  "Di Flutter, `onMessage` melayani app di foreground dan `onBackgroundMessage` melayani app di background atau tertutup ([FlutterFire: receive messages](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages), dibuka «tanggal»). Halaman FlutterFire itu tidak menulis jenis pesan mana yang sampai ke `onBackgroundMessage`. Pemetaan dari tabel Android ke Flutter adalah penalaran [perlu verifikasi di perangkat].",
  "Akibatnya bagi penyaring: pesan notification yang tiba saat app di background tidak melewati kode app, jadi ulangan dari worker tampil dua kali. Pesan notification juga selalu collapsible dan mengabaikan `collapse_key`. Pesan collapsible hanya diganti selama belum sampai ke HP, jadi collapse bukan cara menyaring ([FCM: collapsible messages](https://firebase.google.com/docs/cloud-messaging/customize-messages/collapsible-message-types), dibuka «tanggal»). Pesan data melewati kode app, jadi penyaring bisa jalan.",
  "Field `data` di FCM HTTP v1 berisi pasangan string ke string. Sumbernya [FCM HTTP v1: Message](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages), dibuka «tanggal». `notifikasi_id`, `judul`, dan `isi` di payload lab juga string, jadi bentuknya muat.",
  "`RemoteMessage` punya `messageId`. Halaman FlutterFire itu tidak menyebut apakah dua pengiriman terpisah dengan isi sama mendapat `messageId` yang sama. Karena itu id yang dipakai adalah `notifikasi_id` dari server, yang nilainya ditentukan sendiri.",
  "Kerangka Dart ini menyaring di dua tempat dengan satu fungsi. Handler latar harus fungsi top-level, bukan fungsi anonim, dan di Flutter 3.3.0 ke atas diberi `@pragma('vm:entry-point')`. Fungsi `tampilkanSekali` menampilkan dulu, lalu mencatat id:",
  "<Snippet lang=\"dart\" code={`@pragma('vm:entry-point')\nFuture<void> terimaDiLatar(RemoteMessage pesan) async {\n  await Firebase.initializeApp();\n  await tampilkanSekali(pesan);\n}",
  "Future<void> tampilkanSekali(RemoteMessage pesan) async {\n  final id = pesan.data['notifikasi_id'] as String?;\n  if (id != null && await riwayatId.sudahAda(id)) return;\n  await notifikasiLokal.tampilkan(pesan.data['judul'], pesan.data['isi']);\n  if (id != null) await riwayatId.catat(id);\n}",
  "void pasangPenerima() {\n  FirebaseMessaging.onBackgroundMessage(terimaDiLatar);\n  FirebaseMessaging.onMessage.listen(tampilkanSekali);\n}`} />",
  "*Tidak dijalankan. Kerangkanya dari [FlutterFire: receive messages](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages). `riwayatId` (penyimpanan lokal) dan `notifikasiLokal` (API notifikasi lokal) buatan sendiri. Lab hanya punya penyaring tiruan lima baris Python (`ganda.txt` bagian C).*",
  "Urutan menampilkan lalu mencatat disengaja. App yang mati di antaranya menampilkan ulangan, dan tidak kehilangan pemberitahuan. Urutan sebaliknya bisa kehilangan, padahal PRD melarang hilang tanpa terdeteksi. Dokumentasi Kafka menulis pola yang sama untuk posisi consumer: menyimpan posisi sebelum memproses memberi at-most-once, dan memproses lalu menyimpan memberi at-least-once.",
  "Dua salinan yang tiba bersamaan bisa sama-sama lolos pemeriksaan. Itu penalaran dan tidak diuji.",
  "Pesan data punya harga, dan dokumentasi menulisnya:",
  "- **iOS:** pesan dengan `content-available` menjadi silent notification yang membangunkan app. Platform Apple tidak menjamin pengiriman background notification ([FCM: receive messages di Apple](https://firebase.google.com/docs/cloud-messaging/ios/receive), dibuka «tanggal»).\n- **App ditutup paksa:** di iOS, app yang digeser keluar dari app switcher harus dibuka manual supaya pesan latar bekerja lagi. Di Android, hal yang sama berlaku bila user menutup paksa dari pengaturan.\n- **Prioritas Android:** pesan normal bisa tertunda saat Doze. Pesan high priority yang tidak menghasilkan notifikasi untuk user bisa diturunkan ke normal. FCM membaca pola 7 hari per instance app ([FCM: message priority](https://firebase.google.com/docs/cloud-messaging/android/message-priority), dibuka «tanggal»).\n- **Handler harus cepat:** FlutterFire menulis bahwa tugas lebih dari 30 detik bisa membuat perangkat mematikan prosesnya.",
  "Dokumentasi FCM juga memuat AndroidConfigV2, yang menyarankan `RemoteNotification` untuk semua pesan yang menampilkan notifikasi. Halaman itu menandainya preview (Pre-GA), jadi ADR 25 tidak bersandar padanya ([FCM: migrate ke AndroidConfigV2](https://firebase.google.com/docs/cloud-messaging/send/v2-api), dibuka «tanggal»).",
  "### Di stack lain",
  "**Skenario:** satu baris pemberitahuan gagal dikirim, atau worker-nya mati di tengah. Yang ditanyakan: berapa kali ia dicoba, berapa jedanya, ke mana ia pergi sesudah gagal terus, dan siapa menyaring ulangan.",
  "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada «tanggal». Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.",
  "Yang sama di semua stack: pengiriman at-least-once menuntut penerima yang tahan ulangan. Yang berbeda adalah siapa yang menghitung percobaan dan siapa yang menyimpan baris yang menyerah.",
  "<TabSet id=\"stack\" labels={[\"Go\", \"Node.js\", \"Laravel\", \"Django\", \"Dart (Serverpod)\", \"Supabase\"]}>\n<Fragment slot=\"t0\">",
  "*Dijalankan: lab api-t3 dan t3-outbox, PostgreSQL «pg» (rekaman `retry.txt` bagian A sampai D dan `ganda.txt`).*",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"39:42\" lang=\"go\" title=\"labs/api-t3/internal/worker/worker.go\" />",
  "**Yang berbeda di stack ini:** percobaan, jeda, dan dead-letter adalah kolom `percobaan`, `coba_lagi`, dan status `mati` di tabel outbox. Tidak ada library queue. Penyaring ganda ada di penerima, bukan di worker.",
  "</Fragment>\n<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke dokumentasi [pg-boss](https://github.com/timgit/pg-boss/blob/12.38.0/docs/api/queues.md) 12.38.0, dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"js\" code={`await boss.createQueue('notifikasi-mati')\nawait boss.createQueue('notifikasi', {\n  retryLimit: 4,\n  retryDelay: 2,\n  retryBackoff: true,\n  deadLetter: 'notifikasi-mati'\n})`} />",
  "**Yang berbeda di stack ini:** `retryLimit` menghitung ulangan dan bawaannya 2, `retryDelay` bawaannya 0, dan `retryBackoff` bawaannya false. Dokumentasi menulis jedanya `retryDelay * 2 ^ retryCount` dengan sedikit jitter. Sesudah semua ulangan gagal, payload disalin ke queue `deadLetter` yang harus sudah dibuat. Padanan lima percobaan memakai `retryLimit` 4 bila percobaan pertama tidak dihitung ulangan [perlu verifikasi].",
  "</Fragment>\n<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: Queues](https://laravel.com/docs/13.x/queues), dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"php\" code={`#[Tries(5)]\n#[Backoff([2, 4, 8, 16])]\nclass KirimNotifikasi implements ShouldQueue\n{\n    // ...\n}`} />",
  "**Yang berbeda di stack ini:** Laravel mencoba job sekali saja secara bawaan, dan `--tries=0` mengulang tanpa batas. Job yang melewati batas masuk tabel `failed_jobs` dan bisa diulang dengan `queue:retry`. Backoff berupa daftar detik, dan dokumentasi tidak menyebut jitter. `retry_after` adalah lamanya job dipegang, dan bila `--timeout` lebih panjang daripada `retry_after`, job bisa diproses dua kali. Itu pola `ganda.txt` bagian B.",
  "</Fragment>\n<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [Django 6.1: Tasks](https://docs.djangoproject.com/en/6.1/topics/tasks/), dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"python\" code={`@task(takes_context=True)\ndef kirim_notifikasi(context, jurnal_id):\n    logger.debug(f\"Percobaan {context.attempt} untuk jurnal {jurnal_id}\")\n    kirim(jurnal_id)`} />",
  "**Yang berbeda di stack ini:** Django tidak menyediakan worker. Halaman Tasks menunjukkan `context.attempt`, nomor percobaan, dan tidak menjelaskan retry otomatis, backoff, atau dead-letter. Kebijakan itu datang dari backend yang dipasang [perlu verifikasi].",
  "</Fragment>\n<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Dicek ke [Serverpod: Scheduling](https://docs.serverpod.dev/concepts/scheduling/overview), Serverpod «serverpod», dibuka «tanggal».*",
  "**Yang berbeda di stack ini:** future call berjalan at-least-once. Bila instance yang mengklaimnya mati di tengah, instance lain menjalankannya lagi, dan dokumentasi menyuruh menulis pekerjaan yang aman diulang. Bila metodenya melempar exception, Serverpod mencatat error dan tidak mengulang. Retry dan dead-letter menjadi tugas kodemu sendiri.",
  "</Fragment>\n<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke README [pgmq](https://github.com/pgmq/pgmq), rilis terbaru v«pgmq» («pgmqTanggal»), dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"sql\" code={`SELECT * FROM pgmq.read(\n  queue_name => 'notifikasi',\n  vt         => 5,\n  qty        => 4\n);`} />",
  "**Yang berbeda di stack ini:** README menjamin exactly-once ke consumer hanya selama visibility timeout (`vt`). Pesan yang tidak dihapus atau diarsipkan dalam `vt` terlihat lagi dan bisa dibaca consumer lain, sama dengan `klaim_sampai`. Kolom `read_ct` ada di hasil `read`, dan README yang dibuka tidak membahas dead-letter. Membuatnya dari `read_ct` adalah penalaran [perlu verifikasi].",
  "</Fragment>\n</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 25: at-least-once dengan batas lima percobaan, dead-letter, dan penyaring di app",
  "**Kebutuhan.** Pemberitahuan uang tidak boleh hilang tanpa terdeteksi dan tidak boleh muncul dua kali ([[t3-prd]]). Layanan push tidak ikut COMMIT, dan worker bisa mati di antara kirim dan tandai. Bebannya kecil: «lambda» pemberitahuan bayar dan transfer per detik di puncak (Asumsi, rumus di [[t3-skema]]).",
  "**Status:** diterima sesudah M20 (minggu 4), memakai tabel outbox dari ADR 23 dan klaim dari ADR 24 ([[t3-outbox]], [[t3-klaim-baris]]). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR.",
  "| | A. At-most-once | B. At-least-once, retry tanpa batas | C. Exactly-once lewat kerja sama penerima | D. At-least-once, 5 percobaan, dead-letter, penyaring di app |\n|---|---|---|---|---|\n| Cara kerja | Worker menandai baris `terkirim` sebelum mengirim, atau tidak pernah mengulang | Worker mengulang sampai berhasil, dengan atau tanpa backoff, dan penerima menyaring | Worker dan HP bertukar konfirmasi, atau menyimpan posisi bersama, supaya tiap pesan sampai sekali | Worker mengulang paling banyak 5 percobaan dengan backoff dan jitter. Baris yang gagal masuk dead-letter. App menyaring `notifikasi_id` |\n| Kelebihan | Tidak ada ulangan, jadi tidak ada penyaring | Tidak ada pemberitahuan yang menyerah | Penerima tidak pernah melihat ulangan | Tidak hilang tanpa terdeteksi, dan ulangan tidak tampil. Baris yang gagal terus tidak berputar selamanya |\n| Kekurangan | Pemberitahuan hilang saat push menjawab 503 atau worker mati, dan PRD v3 melarangnya | Baris yang tidak pernah bisa terkirim berputar tanpa akhir dan menghabiskan kapasitas worker | Layanan push tidak memberi konfirmasi dari layar HP, dan koordinasi ini menuntut two-phase commit atau penyimpanan bersama | Butuh pesan data dan kode di app. Push yang mati lebih lama dari jendela retry mengirim semua barisnya ke dead-letter |\n| Biaya operasional | Nol, tetapi kehilangan tidak terlihat | Tak ada yang mengurus baris yang menyerah, jadi queue membengkak diam-diam | Dua sisi dengan protokol konfirmasi dan penyimpanan posisi di HP | Satu pemilik untuk baris `mati`, alert jumlah `mati`, dan penyimpanan id di app |\n| Bukti | Tidak dijalankan. Definisi di dokumentasi Kafka | Tidak dijalankan. Dokumentasi Laravel menulis `--tries=0` mengulang tanpa batas. Mutasi di README lab: tanpa batas klaim, klaim ke-6 mengirim lagi | Tidak dijalankan. Dokumentasi Kafka dan FCM | Rekaman lab `retry.txt`, `ganda.txt`, dan `push.txt`. Penyaring di app Tidak dijalankan |",
  "**Keputusan: opsi D.** Tujuh aturan:",
  "1. `notifikasi_id` dibuat saat `INSERT` outbox, sebagai kolom `uuid` `UNIQUE` dengan bawaan `gen_random_uuid()`, dan sama di semua percobaan.\n2. Paling banyak «batasP» percobaan, dan `percobaan` naik saat klaim. Push yang gagal sementara masuk dead-letter pada kegagalan ke-«batasP». Baris yang mematikan worker masuk dead-letter pada klaim ke-«klaimMati», tanpa kirim (`retry.txt` bagian A dan C).\n3. Hanya kegagalan sementara diulang, dengan jeda acak antara 0 dan min(«backoffMaks», «backoffAwal» × 2^(n−1)) detik. Token yang ditolak 404 atau 400 tidak diulang: perangkatnya dinonaktifkan (`push.txt` bagian D).\n4. Baris `mati` tidak diklaim lagi dan tidak dibuang oleh `-bersih`. Satu pemilik membacanya, memperbaiki penyebabnya, lalu memutarnya ulang dengan `notifikasi_id` yang sama (`retry.txt` bagian D).\n5. Pemberitahuan uang dikirim sebagai pesan data berprioritas high dengan `notifikasi_id`, `judul`, dan `isi`. Pesan notification tidak dipakai untuk uang, karena FCM SDK menampilkannya di background tanpa kode app. Prioritas high adalah pilihan penulis dan tidak dijalankan di perangkat.\n6. App menyaring `notifikasi_id` di handler foreground dan background: menampilkan dulu, mencatat id sesudahnya, dan mengingat id «retensi» hari (Asumsi, sama dengan retensi baris outbox).\n7. Klaim sekurang-kurangnya sebanyak jumlah perangkat × batas waktu push, atau worker mengirim ke perangkat serentak. Kode lab belum memenuhinya untuk dua perangkat: «hp2» × «pushTimeout» detik lebih panjang daripada klaim «klaim» detik (`ganda.txt` bagian D).",
  "**Kenapa D, bukan A, B, atau C.**",
  "- **A ditolak** karena pemberitahuan hilang saat push menjawab 503 atau worker mati, dan PRD v3 melarang hilang tanpa terdeteksi.\n- **B ditolak** karena baris yang tidak pernah bisa terkirim berputar tanpa akhir. Lab menunjukkan arahnya lewat mutasi: tanpa batas klaim, klaim ke-6 mengirim lagi.\n- **C ditolak** karena layanan push tidak memberi jalan untuk koordinasi yang dibutuhkan. Yang tercapai adalah efek satu kali di layar: pengirim mengulang, dan penerima mengenali ulangan.",
  "**Kasus industri: webhook Stripe.** Stripe mengirim event ke endpoint merchant dengan jaminan yang sama. Dokumentasinya menulis bahwa Stripe mencoba mengirim event sampai tiga hari dengan exponential backoff di live mode, dan di sandbox tiga kali dalam beberapa jam. Endpoint bisa menerima event yang sama lebih dari sekali, dan dokumentasi menyarankan mencatat event ID yang sudah diproses ([Stripe: webhooks](https://docs.stripe.com/webhooks), dibuka «tanggal»).",
  "Stripe juga menulis bahwa event tidak dijamin datang menurut urutan terjadinya. Event bisa dikirim ulang dengan tangan sampai 15 hari lewat Dashboard atau 30 hari lewat CLI.",
  "Batasnya: ini sisi pengirim satu produk, untuk penerima yang bisa mati berjam-jam. Dokumentasi tidak menyebut cara Stripe menyimpan atau mengklaim event di dalam. Jadi kasus ini bukti jaminan at-least-once dengan penerima yang menyaring, bukan bukti outbox. Jendela retry Stripe tiga hari, sedangkan jendela worker ini «jendela» detik.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Penyaring tidak jalan saat dibutuhkan. Pesan data bisa tertunda di Doze dan tidak dijamin di iOS. Pesan juga tidak datang setelah user menutup paksa app (dokumentasi FCM dan FlutterFire, Tidak dijalankan di perangkat). Dampaknya ulangan tampil dua kali atau pemberitahuan terlambat. Pencegahannya riwayat di app yang dimuat dari API, bukan dari notifikasi, dan uji di perangkat Android dan iOS sebelum rilis.\n2. Layanan push mati lebih lama dari jendela retry, dan baris `mati` menumpuk tanpa yang membacanya. Gangguan «menitGangguan» menit memasukkan paling banyak «barisMati» baris ke dead-letter. Itu Asumsi, dengan tabel di blok Paham. `-bersih` tidak membuang baris `mati`, jadi tidak ada yang menghapusnya dan tidak ada yang melihatnya. Alert umur tertua tidak menangkapnya, karena `RingkasOutbox` menghitung umur baris `menunggu` saja. Pencegahannya satu pemilik, alert jumlah `mati` yang belum ada di ADR 32 ([[t3-tim-infra]]), dan satu `UPDATE` yang memutar ulang semuanya.\n3. Klaim lebih pendek daripada waktu kirim terburuk satu baris. Dua worker mengirim baris yang sama tanpa ada yang mati. Contohnya klaim «klaimPendekMs» milidetik lawan push «pushLambat» detik (`ganda.txt` bagian B), atau dua HP yang menggantung lawan klaim 5 detik (bagian D). Pencegahannya aturan 7 dan tes yang menaikkan jumlah perangkat.",
  "**Kapan keputusan ini salah.**",
  "- Saat penerimanya menggerakkan uang, misalnya webhook dari gateway di Tahap 4. Penyaring \"yang sudah tampil\" tidak cukup, dan penerima wajib idempoten dengan key ([[t2-idempotency]]).\n- Saat uji di perangkat menunjukkan pesan data tertunda atau hilang. Pindah ke pesan notification, terima ulangan di tray, dan saring di daftar riwayat app.\n- Saat penerima punya dua perangkat yang menggantung dan klaim tetap 5 detik (`ganda.txt` bagian D).\n- Saat urutan antar pemberitahuan penting. Retry mengacak urutan, karena baris yang ditunda tiba sesudah baris yang lebih baru. Stripe menulis bahwa urutan event tidak dijamin.",
  "**Yang akan merevisinya.** ADR 32 memuat alert umur tertua per kelas ([[t3-m27]], [[t3-tim-infra]]), dan alert jumlah baris `mati` menjadi tambahan yang diusulkan ADR ini. Webhook masuk di Tahap 4 membalik arahnya: Rekeningo menjadi penerima yang wajib idempoten.",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |\n|---|---|---|\n| Replay otomatis baris `mati` | Replay buta mengulang kegagalan yang sama, dan dead-letter dibaca manusia dulu | [[t3-tim-infra]] |\n| Satu baris outbox per perangkat | Satu baris dikirim ke semua perangkat aktif, dan penyaring di app menutup ulangannya. Pecah bila rata-rata perangkat per user naik dari «perangkatPerUser» (Asumsi) | Belum dijadwalkan |\n| Konfirmasi tampil dari app ke server | Layanan push tidak menyediakannya, dan PRD mengukur sampai pesan diserahkan ke layanan push | Belum dijadwalkan |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** Worker mati sesudah tiap push berhasil, dan batasnya «kataBatas» percobaan. Berapa pesan sampai ke layanan push, dan pada klaim ke berapa baris masuk dead-letter?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "«KataMintaC» pesan, dan baris masuk dead-letter pada klaim ke-«klaimMati». Percobaan naik saat klaim, jadi klaim ke-6 melewati batas dan memasukkan baris ke dead-letter tanpa mengirim (`retry.txt` bagian C).",
  "</details>",
  "**2.** Layanan push menjawab 503 terus. Kenapa baris masuk dead-letter pada kegagalan ke-5, bukan klaim ke-6?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Worker mencatat tiap kegagalan lewat `tunda`, dan `percobaan` yang sudah «batasP» langsung memindahkan baris ke `mati` (`retry.txt` bagian A: «mintaA» permintaan). Klaim ke-6 hanya terjadi bila worker mati sebelum sempat mencatat.",
  "</details>",
  "**3.** Pesan notification dikirim, dan app sedang di background. Kenapa penyaring `notifikasi_id` tidak jalan?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Dokumentasi FCM menulis bahwa FCM SDK menampilkan pesan notification saat app di background, jadi kode app tidak dijalankan. Penyaring butuh kode app, dan itu sebabnya ADR 25 mengirim pemberitahuan uang sebagai pesan data.",
  "</details>",
  "**4.** Kenapa app mencatat `notifikasi_id` sesudah menampilkan, bukan sebelumnya?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "App yang mati di antara dua langkah itu menampilkan ulangan, dan tidak kehilangan pemberitahuan. Urutan sebaliknya bisa kehilangan, dan PRD melarang hilang tanpa terdeteksi. Dokumentasi Kafka menulis pola yang sama untuk posisi consumer.",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] `notifikasi_id` dibuat saat `INSERT`, bukan saat kirim, dan dikirim sama di semua percobaan.\n- [ ] `percobaan` naik saat klaim, ada batas, dan baris yang melewatinya masuk `mati` tanpa dikirim.\n- [ ] Jeda retry memakai jitter, dan hanya kegagalan sementara diulang. Token yang ditolak 404 atau 400 tidak diulang.\n- [ ] Baris `mati` tidak dibuang otomatis, ada pemilik yang membacanya, dan ada alert jumlah `mati`.\n- [ ] Pemberitahuan uang dikirim sebagai pesan data, handler latar berupa fungsi top-level, dan app mencatat id sesudah menampilkan.\n- [ ] Klaim lebih panjang daripada jumlah perangkat × batas waktu push, dan ada tes dengan dua perangkat.",
  "### Bacaan lanjut",
  "- [Apache Kafka: Message Delivery Semantics](https://github.com/apache/kafka/blob/trunk/docs/design/design.md)\n- [Stripe: webhooks](https://docs.stripe.com/webhooks)\n- [Amazon SQS: dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)\n- [Brooker: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) (2015-03-04)\n- [FCM: message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type)\n- [FCM: message priority](https://firebase.google.com/docs/cloud-messaging/android/message-priority)\n- [FlutterFire: receive messages](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages)",
  "</Blok>",
];

const unitHalaman = halaman.trim().split(/\n{2,}/);
const fnWorker = (awal: RegExp, akhir: RegExp): string => {
  const a = barisAkhir(barisWorker, awal);
  return `${a}:${barisAkhir(barisWorker, akhir, a - 1)}`;
};
const sumberSnippet = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"/g)].map((m) => ({ file: m[1]!, a: Number(m[2]), b: Number(m[3]) }));

describe("halaman 3.13: isi dikunci unit demi unit, nilai diturunkan dari sumber", () => {
  test("frontmatter, meta, dan registry", () => {
    const h = (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string; adr?: number[]; topik?: string }[]).find((x) => x.id === "t3-at-least-once")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran, h.path, h.adr]).toEqual(["3.13", "konsep", 4, true, ["t3-outbox"], ["t3-m20"], ["mobile", "backend"], "tahap-3/at-least-once.md", [25]]);
    expect(h.judul).toBe("At-least-once: retry, dead-letter, penyaring di app + ADR 25");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(frontmatter).toContain(
      "description: Worker mengirim ulang pemberitahuan sampai lima kali, lalu memindahkannya ke dead-letter, dan app menampilkan satu pemberitahuan untuk tiap notifikasi_id. ADR 25 menimbang tiga cara lain dan menulis kapan pilihan ini salah.",
    );
    expect(kata(batasP)).toBe("lima");
    expect(naskah).toMatch(/\| 3\.13 \| 4 \| At-least-once: retry, dead-letter, penyaring di app \+ ADR 25 \| Konsep \+ ADR \| ★ \| t3-outbox \| W3-outbox \|/);
    const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m20\]\] · Jalur inti<\/p>$/m)!;
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
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca; satu bentuk per angka", () => {
    const tampil = halaman + JSON.stringify(rantaiMentah) + JSON.stringify(widgetMentah);
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/\bPR ?#?\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(halaman).not.toMatch(/\b0,87\b/);
    expect(hitung(halaman, /0,868/g)).toBe(3);
    expect(lambdaNilai).toBe(Number(lambdaNaskah.replace(",", ".")));
    expect(halaman.replace(/code=\{`[\s\S]*?`\}/g, "")).not.toMatch(/\bkita\b|\bAnda\b|!|\p{Extended_Pictographic}/u);
  });
});

describe("rekaman retry.txt dan ganda.txt: angka di halaman", () => {
  test("retry.txt A: lima putaran, batas atas 2, 4, 8, 16, lima permintaan, status mati, putaran ke-6 kosong", () => {
    expect(bounds).toEqual([2, 4, 8, 16]);
    expect(bounds.every((b, i) => b === backoffAwal * 2 ** i && b <= backoffMaks)).toBe(true);
    expect(cari(/^putaran (\d+): outbox\.status = mati, percobaan = (\d+)$/, RA, "mati A").slice(1).map(Number)).toEqual([batasP, batasP]);
    expect(mintaA).toBe(batasP);
    expect(putaranKosong).toBe(batasP + 1);
    expect(retryTxt).toContain("Antara dua putaran lab memajukan coba_lagi (UPDATE tangan) supaya tidak menunggu backoff sungguhan");
    expect(jeda).toBe(30);
    expect(jendela).toBe(45);
  });
  test("retry.txt B: dua puluh baris, dua puluh waktu berbeda, sebaran 0,5 detik, paling lama batas pertama", () => {
    expect(jitterN).toBe(20);
    expect(Number(jitter[2])).toBe(Number(jitter[3]));
    expect(sebar).toBe("0,5");
    expect(batas1).toBe(bounds[0]);
    expect(RB.join("\n")).toContain("-serentak 20");
  });
  test("retry.txt C: lima pesan, klaim ke-6 dead-letter tanpa kirim, percobaan naik saat klaim", () => {
    expect(klaimMati).toBe(batasP + 1);
    expect(Number(klaimC[2])).toBe(klaimMati);
    expect(mintaC).toBe(batasP);
    expect(RC.join("\n")).toContain("Percobaan naik saat klaim, bukan saat gagal.");
    expect(RC.filter((b) => /^klaim \d+: worker mati sesudah push berhasil; outbox\.status = menunggu, percobaan = \d+$/.test(b))).toHaveLength(batasP);
  });
  test("retry.txt D: baris mati dibaca, UPDATE memutar ulang ke menunggu dengan percobaan 0, terkirim pada percobaan ke-1, notifikasi_id sama", () => {
    expect(RD.join("\n")).toContain("=> UPDATE outbox SET status = 'menunggu', percobaan = 0, coba_lagi = now() WHERE status = 'mati'   # putar ulang");
    expect(RD.join("\n")).toContain("Putar ulang tetap membawa notifikasi_id yang sama");
    expect(replayKe).toBe(1);
    expect(cari(/^ ?\d+ +\| bayar +\| mati +\| (\d+)$/, RD, "mati D")[1]).toBe(String(klaimMati));
  });
  test("ganda.txt A: klaim bawaan, dua pesan, satu notifikasi_id, satu jurnal; B: klaim pendek; C: penyaring tiruan; D: dua HP", () => {
    expect([gandaPesan, gandaId, jurnalBaru]).toEqual([2, 1, 1]);
    expect(judulBagian(gandaTxt, "A")).toContain(`klaim ${klaim} detik (bawaan)`);
    expect(GA.join("\n")).toContain("worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0");
    expect([klaimPendekMs, pushLambat]).toEqual([300, "1,5"]);
    expect(cari(/^push tiruan menerima: (\d+) pesan, (\d+) notifikasi_id$/, GB, "ganda B").slice(1).map(Number)).toEqual([2, 1]);
    expect([diterimaC, tampilC]).toEqual([2, 1]);
    expect(GC.join("\n")).toContain("# Penyaring tiruan lima baris di run.py (kode app Dart: halaman 3.13, Tidak dijalankan di lab ini)");
    expect([Number(gandaD[1]), Number(gandaD[2])]).toEqual([4, 1]);
    expect(GD.join("\n")).toContain("HP kedua melewati batas 3 detik; ia baru selesai di detik ke-6");
    expect(hp2 * pushTimeout).toBeGreaterThan(klaim);
    expect(hasilGanda("dua-hp-klaim-5", "mati").angka.perangkat).toBe(hp2);
  });
  test("push.txt: pulih sesudah dua kegagalan terkirim di percobaan ke-3; token 404 dilewati; timeout 3 detik", () => {
    expect(PB.join("\n")).toContain("putaran 3: outbox.status = terkirim, percobaan = 3");
    expect(PB.join("\n")).toContain("push tiruan menerima: 3 permintaan untuk 1 notifikasi_id");
    expect(V.pulihKe).toBe(3);
    expect(GAGAL_SEBELUM_PULIH).toBe(2);
    expect(PD.join("\n")).toContain("worker: diklaim 1, terkirim 0, dilewati 1, ditunda 0, mati 0");
    expect(PE.join("\n")).toContain("# panggilan ke push berhenti sesudah 3 detik (batas waktu client, ADR 22); sebelum itu worker menunggu");
  });
  test("listen.txt C: retensi tujuh hari membuang baris selesai, bukan baris mati; README lab menulis hal yang sama", () => {
    expect(retensi).toBe(7);
    expect(judulBagian(listenTxt, "C")).toContain("baris yang menunggu dan yang mati tidak disentuh");
    expect(LC.join("\n")).toContain("bersih: 2 baris outbox selesai (lebih dari 7 hari)");
    expect(LC.join("\n")).toMatch(/^ 5  \| mati     \| 8$/m);
    expect(LC.join("\n")).toContain("Dead-letter dibaca manusia dulu");
    expect(readmeLab).toContain("Penyaring `notifikasi_id` di app Dart: `ganda.txt` C memakai penyaring lima baris di `run.py`.");
    expect(readmeLab).toContain("`n.Percobaan > MaksPercobaan` tidak pernah benar (batas klaim ke-5 hilang) | `retry` C | Gagal: klaim ke-6 mengirim, bukan dead-letter");
    expect(runOutbox).toContain("sudah, tampil = set(), []");
  });
});

describe("kode lab: percobaan, backoff, klaim, dead-letter, penerima", () => {
  test("rentang Snippet diturunkan dari jangkar fungsi, tanpa ID riset atau nomor PR di dalamnya", () => {
    const harapan = [
      { file: "labs/api-t3/internal/worker/worker.go", rentang: fnWorker(/^\/\/ Backoff: tunggu sebelum percobaan berikutnya/, /^}$/) },
      { file: "labs/api-t3/internal/worker/worker.go", rentang: (() => { const a = barisAkhir(barisWorker, /^func \(w \*Worker\) kirimSatu\(/); return `${a}:${barisAkhir(barisWorker, /^\t}$/, a + 2)}`; })() },
      { file: "labs/api-t3/internal/worker/worker.go", rentang: fnWorker(/^func \(w \*Worker\) tunda\(/, /^}$/) },
      { file: "labs/api-t3/internal/worker/worker.go", rentang: fnWorker(/^func Bawaan\(\)/, /^}$/) },
    ];
    expect(sumberSnippet.map((s) => ({ file: s.file, rentang: `${s.a}:${s.b}` }))).toEqual(harapan);
    for (const s of sumberSnippet) {
      const kode = barisWorker.slice(s.a - 1, s.b).join("\n");
      expect(kode, `${s.a}:${s.b}`).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,3}\b|keputusan \d{3,4}/);
    }
    expect(barisWorker[sumberSnippet[1]!.a]).toContain("// Klaim menaikkan percobaan sebelum mengirim.");
    expect(barisWorker.slice(sumberSnippet[1]!.a - 1, sumberSnippet[1]!.b).join("\n")).toContain("if n.Percobaan > w.cfg.MaksPercobaan {");
    expect(barisWorker.slice(sumberSnippet[2]!.a - 1, sumberSnippet[2]!.b).join("\n")).toContain("mati := n.Percobaan >= w.cfg.MaksPercobaan");
  });
  test("Bawaan: empat pengirim, klaim 5 detik, 5 percobaan, backoff dasar 2 detik dan maksimum 60 detik", () => {
    expect([klaim, batasP, backoffAwal, backoffMaks, pushTimeout]).toEqual([5, 5, 2, 60, 3]);
    expect(workerGo).toContain("func Backoff(percobaan int, dasar, maks time.Duration, acak float64) time.Duration {");
    expect(workerGo).toContain("return time.Duration(acak * float64(batas))");
    expect(workerGo).toContain("batas = min(batas, maks)");
  });
  test("klaim menaikkan percobaan; hanya kegagalan sementara diulang; 404 dan 400 menonaktifkan perangkat; satu perangkat gagal menunda seluruh baris", () => {
    expect(outboxGo).toContain("percobaan = o.percobaan + 1");
    expect(pushGo).toMatch(/case resp\.StatusCode == http\.StatusNotFound \|\| resp\.StatusCode == http\.StatusBadRequest:\n\t\treturn ErrTidakTerdaftar/);
    const badanKirim = workerGo.slice(workerGo.indexOf("func (w *Worker) kirimSatu"), workerGo.indexOf("func (w *Worker) tunda"));
    const urut = ["for _, p := range perangkat {", "case err == nil:\n\t\t\tok++", "case errors.Is(err, push.ErrTidakTerdaftar):", "default:\n\t\t\tsementara = err", "if sementara != nil {", "return w.tunda(ctx, n)"];
    let pos = 0;
    for (const u of urut) {
      const i = badanKirim.indexOf(u, pos);
      expect(i, u).toBeGreaterThanOrEqual(pos);
      pos = i;
    }
  });
  test("RingkasOutbox menghitung umur baris menunggu saja, dan -bersih hanya membuang terkirim dan dilewati", () => {
    expect(outboxGo).toMatch(/SELECT coalesce\(extract\(epoch FROM now\(\) - min\(dibuat\)\), 0\) FROM outbox WHERE status = 'menunggu'/);
    expect(outboxGo).toContain("DELETE FROM outbox WHERE status IN ('terkirim', 'dilewati') AND dibuat < now()");
  });
  test("notifikasi_id: uuid UNIQUE dengan bawaan gen_random_uuid, dibuat saat INSERT", () => {
    expect(migrasi).toMatch(/notifikasi_id uuid\s+NOT NULL UNIQUE DEFAULT gen_random_uuid\(\)/);
  });
  test("klaim negatif berlingkup: tanpa library queue di api-t3, dan tidak ada kode Dart di labs yang menyaring notifikasi_id", () => {
    const antre = /asynq|river|machinery|gocraft|faktory|bullmq|sidekiq|temporal|nats|amqp|rabbit|kafka|watermill/i;
    expect(goMod.split("\n").filter((b) => antre.test(b))).toEqual([]);
    const dart = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/") && f.endsWith(".dart"));
    for (const f of dart) expect(baca(f), f).not.toContain("notifikasi_id");
    expect(halaman).toContain("Tidak ada library queue.");
  });
  test("klaim 5 detik tidak muat dua perangkat yang menggantung, dan kode lab mengirim ke perangkat satu per satu", () => {
    expect(hp2 * pushTimeout).toBe(6);
    expect(klaim).toBeLessThan(hp2 * pushTimeout);
    expect(barisWorker.join("\n")).toContain("for _, p := range perangkat {");
    expect(barisWorker.join("\n")).toContain("Perangkat satu akun dikirimi bergiliran");
  });
});

describe("widget OutboxWorker, diagram Inti, dan hitungan", () => {
  test("skenario ulang dan ganda dipasang sekali; island client:visible dan noscript; hitungan label dari mesin", () => {
    expect(hitung(halaman, /<OutboxWorker skenario=\{\["ulang", "ganda"\]\} \/>/g)).toBe(1);
    expect(komponenOutbox).toContain("OutboxWorkerIsland client:visible");
    expect(komponenOutbox).toContain("<noscript>");
    expect([hu.total, hu.rekaman, hu.hitungan, hu.ilustrasi, hu.asumsi]).toEqual([9, 2, 7, 0, 0]);
    expect([hg.total, hg.rekaman, hg.hitungan, hg.ilustrasi, hg.asumsi]).toEqual([8, 4, 2, 0, 2]);
  });
  test("hasil widget yang disebut halaman cocok dengan mesin", () => {
    const m = hasilUlang("worker-mati", "5");
    expect(m.angka).toMatchObject({ permintaan: mintaC, percobaan: klaimMati, mati: true });
    expect(hasilUlang("push-503", "5").angka).toMatchObject({ permintaan: mintaA, percobaan: batasP, mati: true, selang: jeda });
    expect(hasilUlang("pulih-sesudah-2", "5").angka).toMatchObject({ permintaan: 3, terkirim: true });
    expect(hasilGanda("mati-klaim-5", "hidup").angka).toMatchObject({ pesan: diterimaC, tampil: tampilC });
    expect(hasilGanda("mati-klaim-5", "mati").angka).toMatchObject({ pesan: gandaPesan, id: gandaId, tampil: gandaPesan });
    expect(hasilGanda("dua-hp-klaim-5", "mati").angka).toMatchObject({ pesan: Number(gandaD[1]), id: Number(gandaD[2]) });
    expect(acuanDari("ulang", { penyebab: "worker-mati", batas: "5" })).toEqual({ jenis: "rekaman", sumber: "retry.txt C" });
    expect(acuanDari("ganda", { varian: "mati-klaim-5", penyaring: "hidup" })).toEqual({ jenis: "rekaman", sumber: "ganda.txt C" });
    expect(acuanDari("ganda", { varian: "dua-hp-klaim-5", penyaring: "hidup" }).jenis).toBe("hitungan");
    expect(acuanDari("ganda", { varian: "dua-hp-klaim-10", penyaring: "mati" }).jenis).toBe("asumsi");
  });
  test("diagram Rantai Inti: simpul diturunkan dari ganda.txt A dan C, sumber rekaman", () => {
    const pertama = Number(cari(/^push tiruan menerima: (\d+) pesan$/, GA, "ganda A pertama")[1]);
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-outbox, ganda.txt bagian A dan C" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Worker", "bagian A dari ganda.txt"], ["HP Ani", "bagian C dari ganda.txt"]]);
    expect(rantai.baris[0]!.simpul).toEqual([
      { teks: "kirim berhasil", sub: `push menerima ${pertama} pesan`, nada: "biasa", kode: false },
      { teks: "mati sebelum menandai", sub: "baris tetap menunggu", nada: "warn", kode: false },
      { teks: "kirim ulang", sub: `sesudah klaim ${klaim} detik habis`, nada: "biasa", kode: false },
    ]);
    expect(rantai.baris[1]!.simpul).toEqual([
      { teks: `${diterimaC} pesan diterima`, sub: `${gandaId} notifikasi_id`, nada: "biasa", kode: false },
      { teks: "penyaring", sub: "id yang sudah tampil dilewati", nada: "biasa", kode: false },
      { teks: `${tampilC} ditampilkan`, nada: "good", kode: false },
    ]);
    expect(rantai.catatan).toBe("Kotak oranye adalah titik yang membuat pengiriman ulang. Penyaring di rekaman adalah lima baris Python di lab, bukan kode app Dart.");
    expect(GA.join("\n")).toContain("push tiruan menerima: 1 pesan\n");
  });
  test("hitungan di tabel dan ADR: 0,868 × 600, batas atas dijumlahkan, jendela 30 + 5 × 3", () => {
    expect(barisMatiNilai).toBeCloseTo(520.8, 5);
    expect(Math.round(barisMatiNilai)).toBe(521);
    expect(lambdaNilai).toBe(0.868);
    expect(jeda + batasP * pushTimeout).toBe(45);
    const lambdaPrd = cari(/\| Bayar dan transfer per detik di puncak \| (\d,\d+) \|/, prd.split("\n"), "lambda PRD")[1];
    expect(lambdaPrd).toBe(lambdaNaskah);
  });
});

describe("sumber dokumentasi: baris riset R3-160 sampai R3-164, tanggal, versi, dan klaim negatif berlingkup", () => {
  const ids = ["R3-160", "R3-161", "R3-162", "R3-163", "R3-164"];
  test("lima baris ada sekali, urut sesudah R3-145, dibuka pada tanggal yang sama dengan halaman", () => {
    const urut = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => b.split("|")[1]!.trim());
    const i = urut.indexOf("R3-160");
    expect(urut.slice(i, i + 5)).toEqual(ids);
    expect(urut.indexOf("R3-145")).toBeLessThan(i);
    expect(new Set(urut).size).toBe(urut.length);
    for (const id of ids) expect(barisRiset(id), id).toContain(`dibuka ${tanggal}`);
    expect(halaman.match(/dibuka (\d{4}-\d{2}-\d{2})/g)!.every((x) => x === `dibuka ${tanggal}`)).toBe(true);
    expect(tanggal).toBe("2026-10-26");
  });
  test("isi baris riset dikunci dengan sidik jari; klaim kunci ada di baris yang dirujuk halaman", () => {
    const sj = Object.fromEntries(ids.map((id) => [id, sidik(barisRiset(id))]));
    expect(sj).toEqual(SIDIK_RISET);
    const r160 = barisRiset("R3-160");
    for (const k of ["At most once", "At least once", "Exactly once", "two-phase commit", "menyimpan posisi sebelum memproses memberi at-most-once", "lebih dari separuh", "100 client"]) expect(r160.toLowerCase(), k).toContain(k.toLowerCase());
    const r161 = barisRiset("R3-161");
    for (const k of ["tiga hari", "tiga kali dalam beberapa jam", "15 hari", "30 hari", "tidak dijamin berurutan", "maxReceiveCount", "redrive", "cara Stripe menyimpan atau mengklaim event di dalam tidak ditulis"]) expect(r161, k).toContain(k);
    const r162 = barisRiset("R3-162");
    for (const k of ["@pragma('vm:entry-point')", "Flutter 3.3.0", "lebih dari 30 detik", "tidak menulis jenis pesan mana yang sampai ke `onBackgroundMessage`", "Apple platforms don't guarantee the delivery of background notifications", "peta string ke string", "MESSAGE_DELIVERED", "always collapsible"]) expect(r162, k).toContain(k);
    const r163 = barisRiset("R3-163");
    for (const k of ["7 hari per instance app", "mengabaikan `collapse_key`", "Pre-GA", "android_v2"]) expect(r163, k).toContain(k);
    const r164 = barisRiset("R3-164");
    for (const k of ["12.38.0", "`retryLimit` bawaan 2", "`retryDelay` bawaan 0", "`retryBackoff` bawaan false", "`--tries=0` mengulang tanpa batas", "backoff tanpa kata jitter", "`failed_jobs`", "`queue:retry`", "`TaskContext.attempt`", "tidak ada worker bawaan", "exception dicatat dan tidak diulang", "exactly once ke consumer hanya dalam visibility timeout", "README tidak membahas dead-letter"]) expect(r164, k).toContain(k);
    expect(pgmq).not.toBeNull();
    expect(serverpod).toBe("4.0.4");
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
    expect(halaman).toContain("Halaman FlutterFire itu tidak menulis jenis pesan mana yang sampai ke `onBackgroundMessage`.");
    expect(halaman).toContain("Halaman FlutterFire itu tidak menyebut apakah dua pengiriman terpisah dengan isi sama mendapat `messageId` yang sama.");
    expect(halaman).toContain("Dokumentasi tidak menyebut cara Stripe menyimpan atau mengklaim event di dalam.");
    expect(halaman).toContain("dokumentasi tidak menyebut jitter");
    expect(halaman).toContain("README yang dibuka tidak membahas dead-letter");
    expect(halaman).toContain("tidak menjelaskan retry otomatis, backoff, atau dead-letter");
    expect(halaman).toContain("alert jumlah `mati` yang belum ada di ADR 32");
    const adr32 = naskah.split("\n").find((b) => b.startsWith("| 32 | Kelas queue"))!;
    expect(adr32).toContain("alert umur tertua");
    expect(adr32).not.toMatch(/\bmati\b|dead-letter/);
  });
});

describe("tab Di stack lain, kartu Cek diri, dan tetangga", () => {
  test("enam tab sama dengan 3.9; Go dijalankan, lima lain Tidak dijalankan; kode ilustrasi dikunci oleh EXPECT", () => {
    const label = '<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>';
    expect(halaman).toContain(label);
    expect(hal39).toContain(label);
    expect([...halaman.matchAll(/^\*(Dijalankan|Tidak dijalankan)[.:]/gm)].map((m) => m[1])).toEqual(["Tidak dijalankan", "Dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan"]);
    expect(halaman.indexOf("*Tidak dijalankan. Kerangkanya dari")).toBeLessThan(halaman.indexOf("<TabSet"));
    expect(halaman.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect(halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g)).toHaveLength(6);
    expect(halaman.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(4);
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
    expect(ids).toEqual(["berikutnya", "t2-idempotency", "t3-klaim-baris", "t3-m20", "t3-m27", "t3-notifikasi", "t3-outbox", "t3-prd", "t3-skema", "t3-tim-infra"]);
    const reg = new Set((registry.halaman as { id: string }[]).map((h) => h.id));
    for (const id of ids.filter((x) => x !== "berikutnya")) expect(reg.has(id), id).toBe(true);
  });
  test("janji dari tetangga ditepati: 3.3 menanyakan siapa yang menyaring saat app tertutup, 3.9 menunjuk [[t3-at-least-once]]", () => {
    expect(hal33).toContain("| Siapa menyaring pesan ganda saat app tertutup? | Jenis pesan menentukan kapan kode app jalan | [[t3-at-least-once]] |");
    expect(hal39).toContain("itu isi [[t3-at-least-once]]");
    expect(hal33).toContain("Pesan yang sama bisa tiba dua kali.");
    expect(prd).toContain("Notifikasi terlambat, hilang, atau muncul dua kali");
    expect(prd).toContain("Pengukurannya berhenti saat pesan diserahkan ke layanan push");
  });
});

describe("halaman istilah At-least-once dan Dead-letter queue, glosarium", () => {
  const baris = (nama: string) => glosMdx.split("\n").find((b) => b.startsWith(`| **${nama}** |`))!;
  test("dua halaman istilah valid, rujukan ke 3.13, rekaman dan riset ada", () => {
    for (const s of ["at-least-once", "dead-letter-queue"]) {
      const d = HalamanIstilah.parse(JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`)));
      expect(d.cerita!.some((c) => c.rujukan === "t3-at-least-once"), s).toBe(true);
      for (const x of d.sumber!) {
        if ("rekaman" in x) expect(fs.existsSync(path.join(akar, x.rekaman)), x.rekaman).toBe(true);
        if (x.riset) expect(x.riset.startsWith("R2-") ? riset2 : riset, x.riset).toContain(`| ${x.riset} |`);
      }
    }
  });
  test("isi dua halaman istilah dikunci dengan sidik jari; angkanya diturunkan dari rekaman", () => {
    const isiJ = Object.fromEntries(["at-least-once", "dead-letter-queue"].map((s) => [s, sidik(JSON.stringify(JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`))))]));
    expect(isiJ).toEqual(SIDIK_ISTILAH);
    const a = JSON.parse(baca("situs/data/halaman-istilah/at-least-once.json")) as { cerita: { rujukan: string; teks: string }[]; sumber: { catatan: string }[] };
    expect(a.cerita[2]!.teks).toBe(`Worker yang mati sesudah push berhasil membuat pemberitahuan dikirim lagi. Layanan push menerima ${gandaPesan} pesan dengan ${gandaId} notifikasi_id, dan penyaring di app menampilkan ${kata(tampilC)}.`);
    const d = JSON.parse(baca("situs/data/halaman-istilah/dead-letter-queue.json")) as { cerita: { teks: string }[]; sumber: { catatan: string }[]; mekanisme: string[] };
    expect(d.cerita[1]!.teks).toBe(`Layanan push yang menjawab 503 terus menerima ${mintaA} permintaan, lalu barisnya mati. Worker yang mati sesudah tiap push berhasil mengirim ${mintaC} pesan, dan barisnya mati pada klaim ke-${klaimMati} tanpa dikirim.`);
    expect(d.sumber[2]!.catatan).toBe(`Bagian A: 503 terus, ${mintaA} permintaan, lalu status mati. Bagian C: worker mati, klaim ke-${klaimMati} masuk dead-letter tanpa kirim. Bagian D: satu UPDATE memutar ulang baris dan terkirim pada percobaan ke-${replayKe}.`);
    expect(d.mekanisme[3]).toContain("hitungan 0");
  });
  test("glosarium: At-least-once dan Dead-letter queue menuju 3.13, Lease tetap B10.1; halaman istilah terpasang", () => {
    for (const nama of ["At-least-once", "Dead-letter queue"]) expect(baris(nama), nama).toMatch(/\| \[\[t3-at-least-once\]\] \|$/);
    expect(baris("Lease")).toMatch(/\| \[\[B10\.1\]\] \|$/);
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null; b: string | null }[];
    expect(glos.find((x) => x.t === "At-least-once")).toMatchObject({ h: "/istilah/at-least-once/", b: "t3-at-least-once" });
    expect(glos.find((x) => x.t === "Dead-letter queue")).toMatchObject({ h: "/istilah/dead-letter-queue/", b: "t3-at-least-once" });
  });
  test("B10.1 tetap dilebur ke 3.9 dan E4 ke 3.3 lewat registry; halaman lama tidak dihapus", () => {
    const h = registry.halaman as { id: string; lebur_ke?: string; lama?: boolean; ada: boolean }[];
    expect(h.find((x) => x.id === "B10.1")).toMatchObject({ ada: true, lama: true, lebur_ke: "t3-outbox" });
    expect(h.find((x) => x.id === "E4")).toMatchObject({ ada: true, lama: true, lebur_ke: "t3-notifikasi" });
    expect(fs.existsSync(path.join(akar, "situs/src/content/docs/e-mobile/e4-push-real-time.mdx"))).toBe(true);
  });
});

const SIDIK_RISET: Record<string, string> = {
  "R3-160": "78b7cd3eb8b284c8",
  "R3-161": "eb1c8889118206ee",
  "R3-162": "c966705d454d7842",
  "R3-163": "ae1105eb8a7f6176",
  "R3-164": "0f5adef0ebed83b5",
};
const SIDIK_ISTILAH: Record<string, string> = {
  "at-least-once": "3ba7e3c36891784a",
  "dead-letter-queue": "9c2b588b99567403",
};
const ALAMAT: [string, string][] = [
  ["https://github.com/apache/kafka/blob/trunk/docs/design/design.md", "docs/design/design.md"],
  ["https://firebase.google.com/docs/cloud-messaging/understand-delivery", "understand-delivery"],
  ["https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/", "Exponential Backoff And Jitter"],
  ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html", "sqs-dead-letter-queues.html"],
  ["https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type", "customize-messages/set-message-type"],
  ["https://firebase.google.com/docs/cloud-messaging/android/receive", "android/receive"],
  ["https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages", "flutter/receive-messages"],
  ["https://firebase.google.com/docs/cloud-messaging/customize-messages/collapsible-message-types", "collapsible-message-types"],
  ["https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages", "projects.messages"],
  ["https://firebase.google.com/docs/cloud-messaging/ios/receive", "ios/receive"],
  ["https://firebase.google.com/docs/cloud-messaging/android/message-priority", "android/message-priority"],
  ["https://firebase.google.com/docs/cloud-messaging/send/v2-api", "send/v2-api"],
  ["https://github.com/timgit/pg-boss/blob/12.38.0/docs/api/queues.md", "docs/api/queues.md"],
  ["https://laravel.com/docs/13.x/queues", "laravel.com/docs/13.x/queues"],
  ["https://docs.djangoproject.com/en/6.1/topics/tasks/", "docs.djangoproject.com/en/6.1/topics/tasks"],
  ["https://docs.serverpod.dev/concepts/scheduling/overview", "docs.serverpod.dev/concepts/scheduling/overview"],
  ["https://github.com/pgmq/pgmq", "github.com/pgmq/pgmq"],
  ["https://docs.stripe.com/webhooks", "docs.stripe.com/webhooks"],
];
