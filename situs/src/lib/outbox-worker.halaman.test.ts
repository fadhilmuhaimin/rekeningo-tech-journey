// Penjaga halaman 3.9 (keputusan 1032 sampai 1034): angka, nomor halaman, nomor ADR, ID `[[...]]`, label sumber, klaim
// negatif ("tidak ada panggilan jaringan", "tidak ada catatan", "hanya di lab ini"), tabel, kode di tab stack lain, widget
// OutboxWorker, diagram Rantai, halaman istilah, dan setiap kalimat halaman harus bisa diturunkan dari rekaman lab
// (transaksi.txt, klaim.txt, listen.txt, queue.txt, outbox.txt, little.txt), kode lab (outbox.go, worker.go, notif.go,
// bayar.go, 000017), README lab, naskah Tahap 3, registry cerita.json, halaman tetangga (3.1, 3.3, 3.4, 3.5, 2.31), dan
// baris riset R3-140 sampai R3-144. Kalimat yang ditulis penulis dikunci utuh di KALIMAT_TERKUNCI: mengubah satu kata
// menggagalkan tes, dan itu tanda untuk membuka lagi sumbernya (pelajaran 3.4 dan 3.7: penjaga yang mengunci kalimat tidak
// menangkap SALAHNYA kalimat, jadi setiap angka dan klaim di bawah juga diturunkan dari rekaman, kode, atau riset).
// Klaim dokumentasi (Solid Queue, Redis, BullMQ, Debezium, Morling, Laravel, Django, pg-boss, Serverpod, pgmq) dijaga lewat
// baris riset R3-140 sampai R3-144, yang dibuka ke sumber primer 2026-10-26 dan dikunci dengan sidik jari.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-outbox-inti.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { bacaAcuan } from "../widgets/outbox-worker/rekaman";
import { acuanDari, CARA, jalankanCara, KEJADIAN, konstanta } from "../widgets/outbox-worker/logika";

const akar = path.resolve(__dirname, "../../..");
const dibaca = new Set<string>();
const baca = (rel: string): string => {
  dibaca.add(rel);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);

const mdx = baca("situs/src/content/docs/tahap-3/outbox-worker.mdx");
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const kodeBlok = [...badan.matchAll(/code=\{`([\s\S]*?)`\}/g)].map((m) => m[1]!);
const badanTanpaKode = badan.replace(/code=\{`[\s\S]*?`\}/g, "code={KODE}");
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const transaksi = baca("labs/t3-outbox/output/transaksi.txt").split("\n");
const klaimTxt = baca("labs/t3-outbox/output/klaim.txt").split("\n");
const listen = baca("labs/t3-outbox/output/listen.txt").split("\n");
const queue = baca("labs/t3-outbox/output/queue.txt").split("\n");
const kursorTxt = baca("labs/t3-outbox/output/kursor.txt");
const gandaTxt = baca("labs/t3-outbox/output/ganda.txt");
const retryTxt = baca("labs/t3-outbox/output/retry.txt");
const outboxApi = baca("labs/api-t3/output/outbox.txt").split("\n");
const little = baca("labs/t3-pool/output/little.txt");
const readmeLab = baca("labs/t3-outbox/README.md");
const runPy = baca("labs/t3-outbox/run.py");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const bayarGo = baca("labs/api-t3/internal/service/bayar.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal33 = baca("situs/src/content/docs/tahap-3/fitur-notifikasi.mdx");
const hal34 = baca("situs/src/content/docs/tahap-3/dua-tempat-commit.mdx");
const hal35 = baca("situs/src/content/docs/tahap-3/skema-data.mdx");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const diagram = DataRantai.parse(diagramMentah);

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; lebur_ke?: string; lama?: boolean }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const kata = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"][n]!;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const koma = (n: number, d = 2): string => n.toFixed(d).replace(".", ",");
const rp = (n: number): string => "Rp" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const nomorBaris = (baris: string[], ok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i;
};
const bagian = (baris: string[], huruf: string): string[] => {
  const i = nomorBaris(baris, (b) => b.startsWith(`# --- ${huruf}. `));
  const j = baris.findIndex((b, n) => n > i && b.startsWith("# --- "));
  return baris.slice(i, j < 0 ? undefined : j);
};
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};

// ---- nilai yang diturunkan dari rekaman -------------------------------------------------------------------------------
const A = bagian(transaksi, "A");
const At = A.join("\n");
const nominalA = Number(cocok(At, /"nominal": (\d+)/)[1]);
const statusA = Number(cocok(At, /^HTTP\/1\.1 (\d+) Created$/m)[1]);
const jurnalA = Number(cocok(At, /^Location: \/transfers\/(\d+)$/m)[1]);
const postingA = A.filter((b) => new RegExp(`^ ?${jurnalA} +\\| bayar \\| (karyawan|warung) +\\|`).test(b)).length;
const outboxA = cocok(At, new RegExp(`^ ?1 +\\| ${jurnalA} +\\| 418 +\\| 0 +\\| bayar +\\| (\\w+) +\\| 0 +\\| Rp25\\.000 dari Budi$`, "m"));
const pushSebelum = Number(cocok(At, /^push tiruan menerima: (\d+) \(pembayaran selesai, pemberitahuan belum dikirim/m)[1]);
const pushSesudah = Number(cocok(At, /^push tiruan menerima: (\d+)$/m)[1]);
const workerA = cocok(At, /^worker: diklaim (\d+), terkirim (\d+),/m);

const B = bagian(transaksi, "B");
const Bt = B.join("\n");
const sebelumCommit = Bt.split("=> COMMIT")[0]!;
const sesudahCommit = Bt.split("=> COMMIT")[1]!;
const workerBsebelum = cocok(sebelumCommit, /^worker: diklaim (\d+), terkirim (\d+),/m);
const workerBsesudah = cocok(sesudahCommit, /^worker: diklaim (\d+), terkirim (\d+),/m);
const hitungSesi = cocok(Bt, /# sesi tangan sendiri: (\d+); sesi lain \(worker termasuk\): (\d+)$/m);

const C = bagian(transaksi, "C").join("\n");
const E = bagian(transaksi, "E").join("\n");
const F = bagian(transaksi, "F");
const Ft = F.join("\n");
const G = bagian(transaksi, "G").join("\n");

const klA = bagian(klaimTxt, "A").join("\n");
const klC = bagian(klaimTxt, "C").join("\n");
const og = bagian(outboxApi, "G").join("\n");
const lsA = bagian(listen, "A").join("\n");
const lsB = bagian(listen, "B").join("\n");
const lsC = bagian(listen, "C").join("\n");
const qA = bagian(queue, "A").join("\n");
const qE = bagian(queue, "E").join("\n");

const kap = cocok(qA, /^kapasitas diukur: antara (\d+) dan (\d+,\d+) per detik \(batas atas c ÷ t = (\d+) ÷ (\d+,\d+) = (\d+,\d+)\)$/m);
const lambdaTxt = cocok(prd, /\| Bayar dan transfer per detik di puncak \| (\d,\d+) \| 7\.500 ÷ 86\.400 × 10 \(asumsi\) \|/)[1]!;
const lambda = Math.round(((7500 / 86400) * 10) * 1000) / 1000;
const pemicuL = Number(cocok(hal231, /\| Queue \| [^|]+\| L = λ kelas × \(0,02 \+ W luar\) mencapai (\d+) koneksi \|/)[1]);
const wLuar = pemicuL / lambda - 0.02;
const littleT10 = cocok(little, /^hitungan: L = λ × W = (\d,\d+) × \(0,02 \+ 10,0\) = (\d+,\d+) koneksi$/m);

// ---- widget: mesin yang sama dengan jawaban --------------------------------------------------------------------------
const acuan = bacaAcuan({ transaksi: transaksi.join("\n"), kursor: kursorTxt, ganda: gandaTxt, retry: retryTxt, queue: queue.join("\n") });
const K = konstanta(acuan);
const hasilCara = (c: (typeof CARA)[number], j: (typeof KEJADIAN)[number]) => jalankanCara(c, j, K);

// ---- naskah ------------------------------------------------------------------------------------------------------------
const baris = naskah3.split("\n");
const barisAdr23 = baris.find((b) => b.startsWith("| 23 | Outbox di PostgreSQL"))!;
const barisM18 = baris.find((b) => b.startsWith("| M18 |"))!;
const barisM19 = baris.find((b) => b.startsWith("| M19 |"))!;
const peta = [...naskah3.matchAll(/^\| (3\.\d+) \| (\d+b?) \| ([^|]+) \| ([^|]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|/gm)].map((m) => ({ nomor: m[1]!, judul: m[3]!.trim(), jenis: m[4]!.trim(), lab: m[6]!.trim(), widget: m[7]!.trim() }));
const petaBaris = (nomor: string) => peta.find((x) => x.nomor === nomor)!;

describe("berkas yang dibaca penjaga", () => {
  test("semua berkas terlacak git (hasil build tidak ada di checkout bersih)", () => {
    const terlacak = new Set(execFileSync("git", ["ls-files", "--", ...dibaca], { cwd: akar, encoding: "utf8" }).split("\n").filter(Boolean));
    expect([...dibaca].filter((f) => !terlacak.has(f))).toEqual([]);
  });
});

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.9 ada, konsep, ADR 23, jalur inti, prasyarat 3.8, lab t3-outbox, menit sama dengan baris meta", () => {
    expect(dari("t3-outbox")).toMatchObject({ ada: true, nomor: "3.9", jenis: "konsep", inti: true, prasyarat: ["t3-pool"], lab: ["t3-outbox"], adr: [23], tahap: 3 });
    expect(mdx).toContain('title: "3.9 Outbox transaksional dan worker + ADR 23"');
    expect(dari("t3-outbox").judul).toBe("Outbox transaksional dan worker + ADR 23");
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe("Pemberitahuan ditulis sebagai satu baris di COMMIT yang sama dengan jurnal, lalu worker mengirimnya sesudahnya. ADR 23 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-pool\]\] · Jalur inti<\/p>/);
    expect(dari("t3-outbox").menit).toBe(Number(m[1]) + Number(m[2]));
    expect(dari("t3-pool").nomor).toBe("3.8");
    expect(naskah3).toContain("| 3.9 | 4 | Outbox transaksional dan worker + ADR 23 | Konsep + ADR | ★ | t3-outbox | W3-outbox |");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const bacaMenit = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - bacaMenit), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
  });
  test("B10.1 lama dilebur ke 3.9 lewat registry dan tidak dihapus; B10.2 dilebur ke Tahap 4 (T4-siap), bukan ke 3.9", () => {
    expect(dari("B10.1")).toMatchObject({ ada: true, lama: true, lebur_ke: "t3-outbox" });
    expect(fs.existsSync(path.join(akar, "situs/src/content/docs/b-fondasi/b10-1-background-job.mdx"))).toBe(true);
    expect(dari("B10.2").lebur_ke).toBe("t4-webhook");
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
    expect(id).toEqual(["t2-adr-21", "t2-idempotency", "t3-adr-33", "t3-at-least-once", "t3-dua-tempat", "t3-klaim-baris", "t3-m18", "t3-m19", "t3-m27", "t3-notifikasi", "t3-pool", "t3-prd", "t3-skema", "t3-tim-infra"]);
    const sesuai: [string, string, string][] = [
      ["t3-dua-tempat", "3.4", "Dua tempat"], ["t3-m18", "3.6", "M18"], ["t3-pool", "3.8", "Connection pool"], ["t3-m19", "3.10", "M19"],
      ["t3-klaim-baris", "3.11", "Klaim per baris"], ["t3-at-least-once", "3.13", "At-least-once"], ["t3-m27", "3.26", "M27"],
      ["t3-tim-infra", "3.27", "Tim dan infra"], ["t3-adr-33", "3.30", "ADR 33"], ["t3-notifikasi", "3.3", "Fitur: notifikasi"],
      ["t3-skema", "3.5", "Skema data"], ["t3-prd", "3.1", "PRD v3"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(petaBaris(nomor)!.judul.startsWith(awal), `${nomor} di peta`).toBe(true);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
    }
    expect(dari("t2-adr-21").nomor).toBe("2.31");
    expect(dari("t2-idempotency").nomor).toBe("2.14");
  });
  test("janji halaman lain ke 3.9 ditepati: 3.3 (alasan susunan), 3.4 (cara kerja, alasan, kapan salah), 2.31 (pemicu queue)", () => {
    expect(hal33).toContain("[[t3-outbox]]: outbox transaksional dan worker, dengan alasan susunan di halaman ini.");
    expect(hal34).toContain("Cara kerjanya, alasan memilihnya, dan kapan keputusan itu salah ada di [[t3-outbox]].");
    expect(hal231).toMatch(/\| Queue \| [^|]+\| L = λ kelas × \(0,02 \+ W luar\) mencapai 5 koneksi \|[^\n]*\| \[\[t3-outbox\]\] \|/);
    harus("**Kapan keputusan ini salah.**");
    harus("**Kenapa D, bukan A, B, atau C.**");
    harus("[[t2-adr-21]] menunda queue sampai L = λ × (0,02 + W luar) mencapai 5 koneksi.");
    expect(hal34).toContain("| Outbox dan worker | Halaman ini hanya merumuskan pertanyaan | [[t3-outbox]] |");
  });
});

describe("naskah: ADR 23, urutan M18 dan M19, ADR 32 dan 33", () => {
  test("ADR 23 di naskah: keputusan, tiga opsi, kapan salah, sumber", () => {
    expect(barisAdr23).toContain("Outbox di PostgreSQL, worker terpisah; notifikasi uang dan data uang dalam satu transaction");
    expect(barisAdr23).toContain("Queue di Redis; log-based CDC dengan Kafka; kirim sesudah COMMIT tanpa outbox (ketiganya dari dokumentasi dan penalaran, Tidak dijalankan di lab t3-outbox)");
    expect(barisAdr23).toContain("Bila banyak consumer butuh urutan commit penuh, atau pesan terus mengalir ratusan per detik. Pembanding: ±20 juta job per hari di queue berbasis database (R3-24)");
    expect(barisAdr23).toContain("R3-02, R3-04, R3-22, R3-24");
    harus("| | A. Kirim sesudah COMMIT, tanpa outbox | B. Queue di Redis | C. Log-based CDC (Debezium dan Kafka) | D. Outbox di PostgreSQL, worker terpisah |");
    harus("**Keputusan: opsi D.** Enam aturan:");
  });
  test("minggu M18 dan M19 sama dengan naskah; ADR 32 merevisi ADR 23; ADR 33 memuat CDC", () => {
    const minggu = (b: string) => Number(b.split("|")[2]!.trim());
    expect([minggu(barisM18), minggu(barisM19)]).toEqual([3, 4]);
    harus(`diterima sesudah M18 (minggu ${minggu(barisM18)}) dan sebelum M19 (minggu ${minggu(barisM19)})`);
    expect(naskah3).toContain("ADR 32 (merevisi ADR 23)");
    harus("Dibuka lagi oleh ADR 32 untuk kelas queue ([[t3-tim-infra]]).");
    expect(naskah3).toMatch(/\| 33 \| Sengaja belum: [^|]*CDC[^|]*\|/);
    expect(barisM19).toContain("Poller outbox membaca dengan kursor `(dibuat, id)`");
    expect(barisM18).toContain("pool 10 penuh dalam ±11,5 detik");
    expect(barisM18).toContain("Pembayaran memanggilnya di dalam transaction");
    harus("push yang menggantung di dalam transaction menahan koneksi sampai pool penuh");
    expect(naskah3).toContain("Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal");
  });
  test("naskah tidak menulis tanggal ADR 23: urutan di halaman dibaca dari tabel masalah (usulan perubahan cerita di badan PR)", () => {
    const adrBaris = barisAdr23.split("|").map((c) => c.trim());
    expect(adrBaris.join(" ")).not.toMatch(/minggu/i);
    harus("Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR.");
  });
});

describe("rekaman transaksi.txt A sampai G: Inti, Rantai, dan rentang Snippet", () => {
  test("bagian A: 201, jurnal 10001 dengan dua posting, satu baris outbox menunggu, push 0 lalu 1 pesan", () => {
    expect([nominalA, statusA, jurnalA, postingA, outboxA[1], pushSebelum, workerA[1], workerA[2], pushSesudah]).toEqual([25000, 201, 10001, 2, "menunggu", 0, "1", "1", 1]);
    harus(`Budi membayar ${rp(nominalA)} ke warung Ani dan API menjawab ${statusA}.`);
    harus(`Jurnal ${jurnalA} punya dua posting, tabel \`outbox\` punya satu baris berstatus \`${outboxA[1]}\`, dan layanan push tiruan menerima ${pushSebelum} pesan.`);
    harus(`Sesudah worker berjalan sekali, layanan itu menerima ${pushSesudah} pesan.`);
    expect(At).toContain("push tiruan menerima: 0 (pembayaran selesai, pemberitahuan belum dikirim: pengirimannya urusan worker)");
  });
  test("bagian B: sesi tangan memegang transaction; worker mengklaim 0 sebelum COMMIT dan 1 sesudahnya; sesi tangan 1, sesi lain 0", () => {
    expect([workerBsebelum[1], workerBsebelum[2], workerBsesudah[1], workerBsesudah[2], hitungSesi[1], hitungSesi[2]]).toEqual(["0", "0", "1", "1", "1", "0"]);
    expect(Bt).toContain("# Sesi tangan (pemilik schema): jurnal 90001 seimbang");
    expect(Bt).toContain("# Worker berjalan sementara transaction terbuka: diklaim 0. Pemberitahuan tidak bisa mendahului uangnya.");
    // run.py: sesi tangan dan worker nyata (`worker()` menjalankan api-t3 -peran worker), COMMIT sesi tangan sebelum worker kedua.
    const rekam = runPy.split("def rekam_transaksi():")[1]!.split("\ndef ")[0]!;
    const rB = rekam.split('bagian("B. ')[1]!.split('bagian("C. ')[0]!;
    expect(rB).toContain("c = sambung(autocommit=False)");
    expect(rB.indexOf("h = worker()")).toBeLessThan(rB.indexOf("c.commit()"));
    expect(runPy).toContain('perintah_worker(args)');
    expect(runPy.split("def perintah_worker(args):")[1]!.split("\ndef ")[0]).toContain('"-peran", "worker"');
    harus(`Selagi sesi tangan memegang transaction yang belum COMMIT, worker mengklaim ${workerBsebelum[1]} baris, jadi pemberitahuan tidak mendahului uangnya (bagian B).`);
    harus(`Satu pertanyaan mendapat dua jawaban: sesi tangan melihat ${hitungSesi[1]} baris, dan sesi lain, termasuk worker, melihat ${hitungSesi[2]}.`);
    harus(`Setelah COMMIT, worker mengklaim ${workerBsesudah[1]} dan mengirimnya.`);
    harus(`\`transaksi.txt\` bagian B: sesi tangan melihat ${hitungSesi[1]} baris, sesi lain ${hitungSesi[2]}.`);
  });
  test("bagian C dan D: ROLLBACK dan COMMIT ditolak membuang jurnal dan baris outbox bersama (dasar Cek diri 3.4, bukan klaim baru di 3.9)", () => {
    expect(C).toMatch(/ 0 {12}\| 0\n\(1 row\)/);
    expect(bagian(transaksi, "D").join("\n")).toContain("SQLSTATE 23514 · constraint jurnal_seimbang");
    harus("Bila COMMIT gagal, baris outbox ikut hilang, dan bila berhasil, baris itu ikut tersimpan.");
  });
  test("bagian E: unique index outbox_satu_per_jurnal menolak baris kedua (SQLSTATE 23505), sama dengan 000017", () => {
    expect(E).toContain('duplicate key value violates unique constraint "outbox_satu_per_jurnal"');
    expect(E).toContain("SQLSTATE 23505");
    expect(migrasi).toMatch(/CREATE UNIQUE INDEX outbox_satu_per_jurnal ON outbox \(jurnal_id, akun_id\) WHERE jurnal_id IS NOT NULL;/);
    harus("2. Satu pemberitahuan per jurnal per penerima. Unique index `outbox_satu_per_jurnal` menolak baris kedua (`transaksi.txt` bagian E).");
  });
  test("bagian F: API dimatikan sesudah 201 (run.py: bayar lalu kill); baris menunggu lalu terkirim; opsi tanpa outbox Tidak dijalankan di lab ini", () => {
    const rekam = runPy.split("def rekam_transaksi():")[1]!.split("\ndef ")[0]!;
    const rF = rekam.split('bagian("F. ')[1]!.split('bagian("G. ')[0]!;
    expect(rF.indexOf("bayar(budi")).toBeLessThan(rF.indexOf('sinyal="kill"'));
    expect(rF.indexOf('sinyal="kill"')).toBeLessThan(rF.indexOf("h = worker()"));
    const status = F.filter((b) => /^ \d+ +\| bayar +\| (menunggu|terkirim) +\| \d+$/.test(b)).map((b) => b.split("|")[2]!.trim());
    expect(status).toEqual(["menunggu", "terkirim"]);
    expect(Ft).toContain("# Tanpa outbox (kirim sesudah COMMIT di proses API, opsi ADR 23): proses yang mati di antara COMMIT dan kirim tidak meninggalkan jejak. Opsi itu Tidak dijalankan di lab ini.");
    harus("Proses API yang dimatikan sesudah 201 tidak menghilangkan baris, dan worker mengirimnya (bagian F).");
    harus("Yang direkam hanya sisi outbox: proses API mati sesudah COMMIT, dan barisnya tetap ada (`transaksi.txt` bagian F).");
    harus("`transaksi.txt` bagian F menulis opsi ini Tidak dijalankan di lab t3-outbox.");
    // Klaim negatif berlingkup: "Tidak dijalankan" untuk kirim-sesudah-COMMIT hanya ditulis lab t3-outbox (transaksi.txt dan README); lab lain tidak merekamnya.
    expect(readmeLab).toContain("Kirim sesudah COMMIT di proses API tanpa outbox. Yang direkam hanya sisi outbox (`transaksi.txt` F: API mati sesudah COMMIT, baris tetap ada).");
  });
  test("bagian G: INSERT outbox yang gagal di kode API membatalkan pembayaran; trigger hanya memicu kegagalan (bukan constraint)", () => {
    expect(G).toContain("# Sesi tangan memasang trigger di tabel outbox yang menolak setiap INSERT; hanya untuk bagian ini");
    expect(G).toContain("HTTP/1.1 500 Internal Server Error");
    expect(G).toContain("INSERT outbox ada di transaction jurnal");
    // Rancangan pagar: tidak ada constraint yang menolak INSERT outbox di luar transaction jurnal; hanya CHECK jurnal_atau_promo, FK, dan unique.
    expect(migrasi).toContain("CONSTRAINT outbox_jurnal_atau_promo CHECK ((jurnal_id IS NULL) = (jenis = 'promo'))");
    expect(migrasi).not.toMatch(/CREATE TRIGGER/i);
    harus("Bila `INSERT` outbox di kode API gagal, pembayarannya ikut batal (bagian G, dibahas di [[t3-notifikasi]]).");
  });
  test("Rantai Inti: nilai simpul dan sub diturunkan dari bagian A, dan memakai ringkas", () => {
    expect(diagram.sumber.teks).toBe("Rekaman lab t3-outbox, transaksi.txt bagian A");
    expect(diagram.baris.map((b) => b.label)).toEqual(["Pembayaran", "Worker"]);
    expect(diagram.baris.map((b) => b.sub)).toEqual(["bagian A dari transaksi.txt", "bagian A dari transaksi.txt"]);
    expect(diagram.baris[0]!.simpul.map((s) => s.teks)).toEqual([`${statusA}: jurnal ${jurnalA}`, `1 baris outbox: ${outboxA[1]}`, `push tiruan: ${pushSebelum} pesan`]);
    expect(diagram.baris[0]!.simpul.map((s) => s.sub)).toEqual(["dua posting", "satu COMMIT dengan jurnal", "belum dikirim"]);
    expect(diagram.baris[1]!.simpul.map((s) => s.teks)).toEqual([`mengklaim ${workerA[1]} baris`, "baris: terkirim", `push tiruan: ${pushSesudah} pesan`]);
    expect(diagram.baris[1]!.simpul.map((s) => s.sub)).toEqual(["proses sendiri, sesudah COMMIT", `terkirim ${workerA[2]}`, undefined]);
    expect(diagram.catatan).toBe("Kotak hijau adalah tempat pemberitahuan menumpang pada uang dan hasilnya. Layanan push tiruan menerima 0 pesan saat pembayaran selesai.");
    expect(diagram.catatan).toContain(`menerima ${pushSebelum} pesan`);
    expect(badan).toMatch(/<Rantai data=\{intiDiagram\} ringkas \/>/);
    expect(diagram.baris[0]!.simpul[1]!.nada).toBe("good");
  });
  test("rentang Snippet diturunkan dari baris rekaman, bukan ditulis tangan", () => {
    const iB = nomorBaris(transaksi, (b) => b.startsWith("# --- B. "));
    const awal = nomorBaris(transaksi, (b) => b.startsWith("# Sesi tangan (pemilik schema): jurnal 90001"), iB) + 1;
    const iC = nomorBaris(transaksi, (b) => b.startsWith("# --- C. "), iB);
    let akhir = iC; // baris terakhir bagian B: sebelum baris kosong
    while (transaksi[akhir - 1] === "") akhir -= 1;
    harus(`<Snippet file="labs/t3-outbox/output/transaksi.txt" lines="${awal}:${akhir}" title="Rekaman lab: labs/t3-outbox/output/transaksi.txt" />`);
    expect(transaksi[awal - 1]).toBe("# Sesi tangan (pemilik schema): jurnal 90001 seimbang (-1000 dan +1000) dan satu baris outbox, belum COMMIT");
    expect(transaksi[akhir - 1]).toMatch(/^worker: diklaim 1, terkirim 1,/);
  });
});

describe("kode lab: TulisOutbox, KlaimOutbox, worker, Bayar, 000017", () => {
  const region = (src: string, nama: string): string => cocok(src, new RegExp(`// --8<-- \\[start:${nama}\\]\\n([\\s\\S]*?)// --8<-- \\[end:${nama}\\]`))[1]!;
  test("tulis-outbox: hanya INSERT dalam transaction, tanpa panggilan jaringan; Bayar memanggil beritahu di dalam DalamTx sesudah CatatJurnal", () => {
    const r = region(outboxGo, "tulis-outbox");
    expect(r).toContain("INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload)");
    expect(r).toContain("t.tx.ExecContext(");
    expect(r).not.toMatch(/http\.|net\.|push\.|Kirim\(/);
    expect(r.replace(/\n\/\/ /g, " ")).toContain("Tidak ada panggilan jaringan di sini");
    expect(bayarGo.indexOf("s.repo.DalamTx(")).toBeLessThan(bayarGo.indexOf("CatatJurnal("));
    expect(bayarGo.indexOf("CatatJurnal(")).toBeLessThan(bayarGo.indexOf("s.beritahu("));
    const beritahu = region(notifGo, "beritahu");
    expect(beritahu).toContain("return tx.TulisOutbox(ctx, jurnal, penerima, repo.KelasUang, jenis, b)");
    // jalur benar (bukan mode rentan) tidak memanggil push
    expect(beritahu.split("if s.rentan == RentanPushDalamTx {")[1]!.split("\n\t}\n")[1]).not.toContain("s.push.Kirim(");
    harus("Tidak ada panggilan jaringan di dalamnya, dan baris outbox ditulis dengan satu `INSERT`.");
    // Klaim lingkup (keputusan 1035): transaction Bayar bukan hanya INSERT (ada SELECT ... FOR UPDATE buku dan UPDATE saldo_cache), jadi "hanya INSERT" berlaku untuk baris outbox saja.
    const dalamTx = bayarGo.split("s.repo.DalamTx(")[1]!.split("\n\t})\n")[0]!;
    for (const x of ["tx.KunciBukuAkun(", "tx.CatatJurnal(", "s.beritahu("]) expect(dalamTx, x).toContain(x);
    expect(dalamTx).not.toMatch(/http\.|net\.|\.push\.|\.Kirim\(/);
    expect(baca("labs/api-t3/internal/repo/ledger.go")).toMatch(/FOR UPDATE[\s\S]*UPDATE buku b SET saldo_cache/);
    harus('<Snippet file="labs/api-t3/internal/repo/outbox.go" region="tulis-outbox" lang="go" title="labs/api-t3/internal/repo/outbox.go" />');
  });
  test("klaim: FOR UPDATE SKIP LOCKED dan klaim_sampai; klaim 5 detik dan empat baris bawaan; jeda polling 200 milidetik; lima status akhir", () => {
    const r = region(outboxGo, "klaim");
    expect(r).toContain("FOR UPDATE SKIP LOCKED");
    expect(r).toContain("klaim_sampai = now() + make_interval(secs => $2::double precision)");
    expect(r).toContain("(klaim_sampai IS NULL OR klaim_sampai < now())");
    expect(r).toContain("Dua hal bekerja bersama. FOR UPDATE mengunci baris selama pernyataan klaim, dan klaim_sampai menahannya sesudahnya.");
    expect(r).toContain("SKIP LOCKED membuat worker lain melewati baris yang sedang dikunci klaim yang berjalan,");
    const bw = cocok(workerGo, /func Bawaan\(\) Konfigurasi \{\n\treturn Konfigurasi\{Serentak: (\d+), Klaim: (\d+) \* time\.Second, Selang: (\d+) \* time\.Millisecond, MaksPercobaan: (\d+)/);
    expect([bw[1], bw[2], bw[3], bw[4]]).toEqual(["4", "5", "200", "5"]);
    expect(Number(kap[3])).toBe(Number(bw[1]));
    harus(`Ia mengklaim sampai ${kata(Number(bw[1]))} baris, mengirimnya serentak`);
    harus(`\`klaim_sampai\` menahannya sesudahnya selama ${bw[2]} detik.`);
    harus(`ia menunggu ${bw[3]} milidetik sebelum memeriksa lagi`);
    harus(`| ${bw[3]} milidetik |`);
    // Status akhir yang ditulis kirimSatu: terkirim, dilewati, ditunda, mati.
    const kirim = region(workerGo, "kirim-satu");
    for (const s of ["terkirim", "dilewati", "ditunda", "mati"]) expect(kirim, s).toContain(`"${s}"`);
    harus("menandai tiap baris `terkirim`, `dilewati`, ditunda dengan backoff, atau `mati`.");
    // Worker = binary yang sama dengan flag peran; kapasitas klaim tidak bergantung pada urutan kelas di klaim ini.
    expect(mainGo).toContain('peran := flag.String("peran", "api", "api atau worker")');
    expect(mainGo).toContain("Satu binary, dua peran");
    harus("Worker adalah `api-t3 -peran worker`, proses yang terpisah dari server API.");
    // Snippet klaim memakai rentang baris fungsinya saja: komentar di region memuat ID riset, nomor PR, dan nama tes lab yang tidak boleh tampil ke pembaca (keputusan 1035).
    const goBaris = outboxGo.split("\n");
    const awalKlaim = goBaris.findIndex((b) => b.startsWith("func (r Repo) KlaimOutbox(")) + 1;
    const akhirKlaim = goBaris.findIndex((b, i) => i >= awalKlaim && b === "}") + 1;
    expect([awalKlaim, akhirKlaim]).toEqual([74, 94]);
    harus(`<Snippet file="labs/api-t3/internal/repo/outbox.go" lines="${awalKlaim}:${akhirKlaim}" lang="go" title="labs/api-t3/internal/repo/outbox.go" />`);
    expect(badan).not.toContain('region="klaim"');
    harus("Worker adalah binary Go yang sama dengan server API, dijalankan dengan flag peran.");
    // Klaim "mengirimnya serentak": Putaran memulai satu goroutine per baris; polling berhenti bila queue kosong (Jalankan tidur Selang).
    const putaran = workerGo.split("func (w *Worker) Putaran(")[1]!.split("\nfunc ")[0]!;
    expect(putaran).toMatch(/wg\.Add\(1\)\n\t\tgo func\(\) \{/);
    expect(workerGo.split("func (w *Worker) Jalankan(")[1]!.split("\nfunc ")[0]).toMatch(/case r\.Diklaim == 0:\n\t\t\tsleep\(ctx, w\.cfg\.Selang\)/);
    harus("mengirimnya serentak");
    // Klaim negatif berlingkup (labs/api-t3/go.mod): klaim ditulis tangan, tanpa library queue.
    const gomod = baca("labs/api-t3/go.mod");
    for (const lib of ["asynq", "river", "machinery", "faktory", "gocraft", "bull", "rabbitmq", "amqp", "kafka", "nats"]) expect(gomod.toLowerCase(), lib).not.toContain(lib);
    harus("Klaim ditulis sebagai SQL tangan, tanpa library queue.");
  });
  test("kolom outbox dan -bersih: retensi 7 hari, lab tidak menjadwalkannya", () => {
    expect(mainGo).toContain('bersih := flag.Bool("bersih", false, "buang outbox selesai lebih dari 7 hari');
    // Klaim negatif berlingkup (cmd dan internal di labs/api-t3, semua .go terlacak bukan tes): BersihkanOutbox hanya dipanggil dari
    // main.go (flag -bersih, sekali jalan), jadi tidak ada pembersih terjadwal.
    const go = execFileSync("git", ["ls-files", "--", "labs/api-t3/cmd", "labs/api-t3/internal"], { cwd: akar, encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".go") && !f.endsWith("_test.go"));
    const pemanggil = go.filter((f) => baca(f).includes("BersihkanOutbox(")).sort();
    expect(pemanggil).toEqual(["labs/api-t3/cmd/api/main.go", "labs/api-t3/internal/repo/outbox.go"]);
    expect(mainGo.split("case *bersih:")[1]!.split("\n\tcase ")[0]).not.toMatch(/Ticker|time\.After|for \{/);
    expect(lsC).toContain("$ ./api-t3 -bersih");
    expect(outboxGo).toContain("DELETE FROM outbox WHERE status IN ('terkirim', 'dilewati')");
    harus("Baris `terkirim` dan `dilewati` dibuang sesudah 7 hari oleh `-bersih`.");
    harus("Lab menjalankan `-bersih` dengan tangan dan tidak menjadwalkannya.");
  });
  test("notifikasi_id dibuat saat INSERT (DEFAULT di kolom), bukan saat kirim", () => {
    expect(migrasi).toContain("notifikasi_id uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid()");
    expect(outboxGo.split("func (t Tx) TulisOutbox")[1]!.split("\n}\n")[0]).not.toContain("notifikasi_id");
    expect(workerGo).toContain("w.push.Kirim(ctx, p.Token, n.NotifikasiID, isi.Judul, isi.Isi)");
    harus("`notifikasi_id` dibuat saat `INSERT`, bukan saat kirim, supaya tetap sama di semua percobaan.");
  });
});

describe("rekaman klaim, ganda, urutan, kapasitas, retensi, dan queue", () => {
  test("klaim.txt A: tanpa klausa kunci dua sesi memilih nomor 1 sampai 4; SKIP LOCKED hanya melewati", () => {
    expect(klA).toContain("sesi 2 memilih nomor 1, 2, 3, 4: baris yang sama dengan sesi 1");
    expect(klA).toContain("# SKIP LOCKED tidak membuat klaim lebih benar; ia membuat worker tidak antre di belakang worker lain");
    harus("Tanpa klausa kunci sama sekali, dua sesi memilih nomor 1 sampai 4 yang sama (`klaim.txt` bagian A).");
  });
  test("klaim.txt C: baris 1 dipegang worker yang macet, pesan 2 sampai 5 lebih dulu, pesan tertua paling akhir", () => {
    expect(klC).toContain("urutan di layanan push (nomor outbox): 2 -> 3 -> 4 -> 5 -> 1");
    expect(klC).toContain("# Pesan tertua (nomor 1) tiba paling akhir.");
    expect(klC).toContain("Worker A mengklaim baris 1 lalu macet");
    harus("Di `klaim.txt` bagian C, worker yang macet memegang baris 1, dan pesan 2 sampai 5 tiba lebih dulu sehingga pesan tertua tiba paling akhir.");
  });
  test("listen.txt A: nomor 2 dipakai baris yang di-ROLLBACK (nomor berikutnya 3)", () => {
    expect(lsA).toContain("# Nomor 2 sudah terpakai oleh baris yang di-ROLLBACK: nomor berikutnya 3, ada celah");
    harus("baris yang di-ROLLBACK memakai nomornya (`listen.txt` bagian A)");
  });
  test("listen.txt B: NOTIFY yang dikirim selagi listener putus tidak sampai; barisnya tetap menunggu dan dikirim worker polling", () => {
    expect(lsB).toContain("listener menerima: tidak ada (notifikasi yang dikirim selagi putus tidak diulang)");
    expect(lsB).toContain("# NOTIFY hanya membangunkan; sumbernya tetap tabel.");
    harus("`NOTIFY` hanya membangunkan, dan sumbernya tetap tabel (`listen.txt` bagian B)");
  });
  test("listen.txt C: lima baris, dua dibuang (terkirim dan dilewati, 8 hari); menunggu dan mati tidak disentuh", () => {
    const dibuang = Number(cocok(lsC, /^bersih: (\d+) baris outbox selesai \(lebih dari (\d+) hari\)/m)[1]);
    const batas = Number(cocok(lsC, /^bersih: (\d+) baris outbox selesai \(lebih dari (\d+) hari\)/m)[2]);
    const jumlahAwal = 5;
    expect([dibuang, jumlahAwal, batas]).toEqual([2, 5, 7]);
    expect(lsC).toContain("# Lima baris: terkirim 8 hari, terkirim 6 hari, dilewati 8 hari, menunggu 8 hari, mati 8 hari");
    expect(lsC).toContain("# Yang dibuang: yang selesai (terkirim atau dilewati) dan lebih tua dari 7 hari. Dead-letter dibaca manusia dulu; yang menunggu masih harus dikirim.");
    harus(`| ${dibuang} dari ${jumlahAwal} (terkirim dan dilewati, 8 hari); \`menunggu\` dan \`mati\` tetap | Rekaman lab \`listen.txt\` bagian C |`);
    harus(`retensi ${batas} hari`);
  });
  test("outbox.txt G: worker berhenti sebelum menandai; dua pesan dengan satu notifikasi_id", () => {
    expect(og).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    expect(og).toContain("Worker berhenti mendadak di antara kirim dan tandai terkirim");
    harus("Di `outbox.txt` bagian G, layanan push tiruan menerima 2 pesan dengan 1 `notifikasi_id`.");
  });
  test("queue.txt A: kapasitas 4 ÷ 0,3 = 13,33, terukur antara 12 dan 13,33; 13,33 ÷ 0,868 = ±15 kali sama dengan 3.3", () => {
    expect([kap[1], kap[2], kap[3], kap[4], kap[5]]).toEqual(["12", "13,33", "4", "0,3", "13,33"]);
    expect(Number(kap[3]) / 0.3).toBeCloseTo(13.33, 2);
    expect(lambdaTxt).toBe(koma(lambda, 3));
    const kali = 13.333 / lambda;
    expect(Math.round(kali)).toBe(15);
    expect(kali.toFixed(1)).toBe("15.4");
    expect(hal33).toContain("| Kapasitas lawan puncak | 13,33 ÷ 0,868 | ±15 kali (Asumsi) |");
    harus(`| Kapasitas worker (c ÷ t) | ${kap[3]} ÷ ${kap[4]} = ${kap[5]} per detik; terukur antara ${kap[1]} dan ${kap[2]} | Rekaman lab \`queue.txt\` bagian A; c dan t Asumsi |`);
    harus(`| Kapasitas lawan puncak | ${kap[5]} ÷ ${lambdaTxt} = ±${Math.round(kali)} kali | Asumsi |`);
  });
  test("queue.txt E: umur tertua semua kelas lebih dari 30 detik, kelas uang 0 (dasar pre-mortem 2)", () => {
    expect(qE).toContain("umur tertua semua kelas: lebih dari 30 detik (promo menumpuk)");
    expect(qE).toContain("umur tertua kelas uang: 0 (tidak ada yang menunggu)");
    harus("Umur tertua dari semua kelas lebih dari 30 detik, padahal umur tertua kelas uang 0 (`queue.txt` bagian E).");
  });
  test("ukuran outbox: 7.500 × 365 × 300 byte dan retensi 7 hari, sama dengan 3.5", () => {
    const tahun = (7500 * 365 * 300) / 1e6;
    const tujuh = (7500 * 7 * 300) / 1e6;
    expect(Math.round(tahun / 10) * 10).toBe(820);
    expect(koma(Math.round(tujuh * 10) / 10, 1)).toBe("15,8");
    expect(hal35).toContain("| `outbox` tanpa pembersihan | 7.500 × 365 × 300 byte | ±820 MB | Asumsi |");
    expect(hal35).toContain("| `outbox` dengan retensi 7 hari | 7.500 × 7 × 300 byte | ±15,8 MB | Asumsi |");
    harus("| `outbox` tanpa pembersihan | ±820 MB per tahun | Asumsi, rumus di [[t3-skema]] |");
    harus("| `outbox` dengan retensi 7 hari | ±15,8 MB | Asumsi, rumus di [[t3-skema]] |");
    harus("Tanpa pembersihan, tabel mencapai ±820 MB per tahun, dan dengan retensi 7 hari ±15,8 MB (Asumsi).");
  });
});

describe("pemicu queue di ADR 21, janji 30 detik, dan beban", () => {
  test("pemicu L = λ × (0,02 + W luar) = 5 koneksi: W luar ±5,7 detik pada λ 0,868; push menggantung 10 detik melampauinya", () => {
    expect(pemicuL).toBe(5);
    expect(lambdaTxt).toBe("0,868");
    expect(koma(wLuar, 2)).toBe("5,74");
    expect(koma(wLuar, 1)).toBe("5,7");
    expect([littleT10[1], littleT10[2]]).toEqual(["0,87", "8,717"]);
    expect(Number(littleT10[2]!.replace(",", "."))).toBeGreaterThan(pemicuL);
    harus(`Di puncak, λ = ${lambdaTxt} pembayaran per detik (Asumsi, yaitu angka beban dari cerita). Pemicu itu tercapai pada W luar ±${koma(wLuar, 1)} detik (Hitungan: ${pemicuL} ÷ ${lambdaTxt} − 0,02 = ${koma(wLuar, 2)}).`);
    harus(`untuk t = 10 detik, lab t3-pool menghitung L = ${littleT10[2]} dengan λ = ${littleT10[1]}, yaitu ${lambdaTxt} yang dibulatkan (\`little.txt\`)`);
    // Pembulatan 0,868 ke 0,87 dihitung, bukan ditulis tangan; L dari λ yang tertulis bisa diulang pembaca (0,87 × 10,02 = 8,7174).
    expect(Math.round(lambda * 100) / 100).toBe(Number(littleT10[1]!.replace(",", ".")));
    expect(koma(Number(littleT10[1]!.replace(",", ".")) * (0.02 + 10), 3)).toBe(littleT10[2]);
  });
  test("janji 95% dalam 30 detik diukur sampai pesan diserahkan ke layanan push, sama dengan 3.1", () => {
    expect(prd).toContain("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    expect(prd).toContain("Pengukurannya berhenti saat pesan diserahkan ke layanan push, seperti di blok Metrik dan batasan.");
    expect(prd).toContain("Metrik kedua mengukur sampai pesan diserahkan ke layanan push, bukan sampai HP menerimanya.");
    harus("PRD v3 menjanjikan 95% pemberitahuan bayar dan transfer diserahkan ke layanan push dalam kurang dari 30 detik ([[t3-prd]]). Pengukurannya berhenti saat pesan diserahkan, bukan saat HP menerimanya.");
    harus("Janji 30 detik diukur sampai pesan diserahkan ke layanan push.");
  });
  test("beban ADR: 7.500 bayar dan transfer per hari dan 0,868 per detik sama dengan registry", () => {
    const a = cerita.tahap[2]!.asumsi as { user: number; aktif: number; trx: number; puncak: number };
    expect((a.user * a.aktif / 100) * a.trx).toBe(7500);
    expect(Math.round((7500 / 86400) * a.puncak * 1000) / 1000).toBe(lambda);
    harus("Bebannya kecil: 7.500 bayar dan transfer per hari dan 0,868 per detik di puncak (Asumsi, rumus di [[t3-skema]]).");
    expect(hal35).toContain("7.500 ÷ 86.400 × 10 = 0,868 per detik");
    harus("Polling 200 milidetik cukup untuk 0,868 per detik.");
    harus("tiga komponen baru tidak sebanding dengan 0,868 pemberitahuan per detik");
  });
});

describe("widget OutboxWorker: tiga cara dan lima kejadian dihitung mesin yang sama dengan jawaban", () => {
  test("satu widget di blok Coba, skenario cara, sebelum Ubah satu hal", () => {
    expect(badan.match(/<OutboxWorker /g)).toHaveLength(1);
    harus('<OutboxWorker skenario={["cara"]} />');
    expect(badan.indexOf("<OutboxWorker")).toBeLessThan(badan.indexOf("**Ubah satu hal:**"));
    expect(badan.indexOf("<OutboxWorker")).toBeGreaterThan(badan.indexOf('<Blok nama="Coba"'));
    expect(badan.indexOf("<OutboxWorker")).toBeLessThan(badan.indexOf('<Blok nama="Paham">'));
    expect(CARA).toHaveLength(3);
    expect(KEJADIAN).toHaveLength(5);
    harus(`dengan ${kata(CARA.length)} cara mengirim pemberitahuan dan ${kata(KEJADIAN.length)} kejadian`);
  });
  test("proses mati: tiga cara memberi 1, 2, dan 3 dari 3 hal; hanya outbox berlabel Rekaman lab (transaksi.txt F)", () => {
    const l = (c: (typeof CARA)[number]) => hasilCara(c, "proses-mati");
    expect(l("langsung").angka.lolos).toBe(1);
    expect(l("sesudah-commit").angka.lolos).toBe(2);
    expect(l("outbox").angka.lolos).toBe(3);
    expect(l("langsung").angka).toMatchObject({ notif: 1, jurnal: 0 });
    expect(l("sesudah-commit").angka).toMatchObject({ notif: 0, jurnal: 1, outboxBaris: 0 });
    expect(l("outbox").angka).toMatchObject({ notif: 1, jurnal: 1, outboxBaris: 1 });
    expect([l("langsung").acuan.jenis, l("sesudah-commit").acuan.jenis, l("outbox").acuan.jenis]).toEqual(["ilustrasi", "ilustrasi", "rekaman"]);
    expect(l("outbox").acuan.sumber).toBe("transaksi.txt F");
    harus(`Pada Push di dalam transaction, HP Ani menerima notifikasi tentang uang yang tidak ada: ${l("langsung").angka.lolos} dari 3 hal terpenuhi.`);
    harus(`Pada Push sesudah COMMIT di permintaan yang sama, uangnya ada dan HP Ani tidak menerima apa pun, tanpa baris yang menunggu: ${l("sesudah-commit").angka.lolos} dari 3.`);
    harus(`Pada Outbox dan worker, baris tersimpan bersama jurnal dan worker mengirimnya: ${l("outbox").angka.lolos} dari 3 (\`transaksi.txt\` bagian F).`);
  });
  test("label sumber: empat dari lima kejadian pada cara outbox Rekaman lab, push menggantung Hitungan, dua cara lain semua Ilustrasi", () => {
    const outbox = KEJADIAN.map((j) => acuanDari("cara", { cara: "outbox", kejadian: j }).jenis);
    expect(outbox.filter((x) => x === "rekaman")).toHaveLength(4);
    expect(KEJADIAN.filter((j) => acuanDari("cara", { cara: "outbox", kejadian: j }).jenis === "hitungan")).toEqual(["push-menggantung"]);
    for (const c of ["langsung", "sesudah-commit"] as const) for (const j of KEJADIAN) expect(acuanDari("cara", { cara: c, kejadian: j }).jenis, `${c} ${j}`).toBe("ilustrasi");
    harus(`${cap(kata(outbox.filter((x) => x === "rekaman").length))} dari ${kata(KEJADIAN.length)} kejadian pada cara outbox punya Rekaman lab, dan Push menggantung pada cara itu adalah Hitungan`);
    harus("Semua hasil pada dua cara lain adalah Ilustrasi, yaitu penalaran dari urutan langkah.");
  });
  test("nama cara dan kejadian di teks sama dengan label widget", () => {
    const s = (labelWidgetCara as { skenario: { cara: { knob: { id: string; opsi: Record<string, string> }[] } } }).skenario.cara.knob;
    const caraOpsi = s.find((k) => k.id === "cara")!.opsi;
    const kejadianOpsi = s.find((k) => k.id === "kejadian")!.opsi;
    expect(caraOpsi["langsung"]).toBe("Push di dalam transaction");
    expect(caraOpsi["sesudah-commit"]).toBe("Push sesudah COMMIT di permintaan yang sama");
    expect(caraOpsi["outbox"]).toBe("Outbox dan worker");
    expect(kejadianOpsi["proses-mati"]).toBe("Proses API mati");
    harus("pilih kejadian Proses API mati, lalu ganti cara kirim.");
  });
});

describe("label, versi, tanggal akses, dan baris riset", () => {
  test("pemakaian pertama Rekaman lab ditautkan ke /cara-pakai/#label-sumber, anchor ada; label lain dijelaskan di pemakaian pertama", () => {
    harus("Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `transaksi.txt` bagian A");
    expect(cara).toMatch(/^#{2,3} Label sumber/m);
    expect(cara).toContain("- **Tidak dijalankan**: kode hanya dicek ke dokumentasi resmi, tidak dijalankan di lab.");
    expect(badan.indexOf("Rekaman lab (")).toBeLessThan(badan.indexOf("Hitungan"));
    harus("(Asumsi, yaitu angka beban dari cerita)");
    harus("adalah Hitungan, yaitu hasil rumus dari angka rekaman");
    harus("yaitu penalaran dari urutan langkah");
    harus("Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-10-26. Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.");
    expect(badan.indexOf("(Asumsi, yaitu")).toBeLessThan(badan.indexOf("(Asumsi)"));
  });
  test("tanggal akses sumber: semua 2026-10-26, tidak di masa depan, dan sama dengan baris riset R3-140 sampai R3-144", () => {
    const tgl = [...new Set([...badan.matchAll(/(?:dibuka|pada) (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]!))];
    expect(tgl).toEqual(["2026-10-26"]);
    expect(tgl[0]! <= new Date().toISOString().slice(0, 10)).toBe(true);
    for (const id of ["R3-140", "R3-141", "R3-142", "R3-143", "R3-144"]) expect(barisRiset(id), id).toMatch(/dibuka 2026-10-26/);
  });
  test("tautan eksternal: setiap tautan punya jejak di baris riset (path-nya muncul di baris itu)", () => {
    const peta: Record<string, string> = {
      "pgboss.io": "R3-144", "laravel.com/docs/13.x/queues": "R3-143", "docs.djangoproject.com/en/6.1/topics/tasks": "R3-143",
      "docs.djangoproject.com/en/6.1/topics/db/transactions": "R3-143", "docs.serverpod.dev/concepts/scheduling/overview": "R3-144",
      "supabase.com/docs/guides/queues": "R3-144", "github.com/pgmq/pgmq": "R3-144",
      "postgresql.org/docs/17/sql-select.html": "R3-141", "postgresql.org/docs/17/logicaldecoding-explanation.html": "R3-141",
      "microservices.io/patterns/data/transactional-outbox.html": "R3-141",
      "debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern": "R3-141",
      "morling.dev/blog/revisiting-the-outbox-pattern": "R3-141",
      "dev.37signals.com/introducing-solid-queue": "R3-140", "dev.37signals.com/solid-queue-v1-0": "R3-140",
      "redis.io/docs/latest/operate/oss_and_stack/management/persistence": "R3-142",
    };
    const tautan = [...new Set([...badanTanpaKode.matchAll(/\]\(https:\/\/([^)\s]+?)\)/g)].map((m) => m[1]!.replace(/^www\./, "").replace(/#.*/, "").replace(/\/$/, "")))];
    for (const t of tautan) {
      const id = peta[t];
      expect(id, `tautan ${t} belum punya baris riset`).toBeDefined();
      const sumber = t.replace(/^www\./, "");
      expect(barisRiset(id!), `${id} tidak memuat ${sumber}`).toContain(sumber);
    }
    expect(tautan.length).toBe(Object.keys(peta).length);
  });
  test("versi: PostgreSQL 17 sama dengan rekaman; Laravel, Django, Serverpod dari baris R3-122 sampai R3-124; pg-boss dan pgmq dari R3-144", () => {
    const pg = cocok(transaksi.join("\n"), /PostgreSQL (\d+)\.(\d+)/);
    expect(pg[1]).toBe("17");
    expect(badan.match(/postgresql\.org\/docs\/(\d+)\//g)!.every((x) => x.includes(`/${pg[1]}/`))).toBe(true);
    const laravel = cocok(barisRiset("R3-122"), /`laravel\/framework` v(\d+\.\d+\.\d+)/)[1];
    const django = cocok(barisRiset("R3-123"), /Django (\d+\.\d+\.\d+) \(PyPI/)[1];
    const serverpod = cocok(barisRiset("R3-124"), /Serverpod (\d+\.\d+\.\d+) \(pub\.dev/)[1];
    const pgboss = cocok(barisRiset("R3-144"), /pg-boss (\d+\.\d+\.\d+) tampil/)[1];
    const pgmq = cocok(barisRiset("R3-144"), /tag Docker (v\d+\.\d+\.\d+)/)[1];
    expect([laravel, django, serverpod, pgboss, pgmq]).toEqual(["13.38.0", "6.1.2", "4.0.4", "12.38.0", "v1.10.0"]);
    harus(`\`laravel/framework\` ${laravel}`);
    harus(`Django ${django}.`);
    harus(`Serverpod ${serverpod}.`);
    harus(`[pg-boss](https://pgboss.io/) ${pgboss}`);
    harus(`[pgmq](https://github.com/pgmq/pgmq) ${pgmq}`);
    expect(barisRiset("R3-143")).toContain(`${laravel} dari R3-122`);
    expect(barisRiset("R3-143")).toContain(`Django ${django} dari R3-123`);
    expect(barisRiset("R3-144")).toContain(`Serverpod ${serverpod} dari R3-124`);
  });
  test("Solid Queue: angka di halaman sama dengan R3-140; ±20 juta ÷ 86.400 = ±231 per detik", () => {
    const r = barisRiset("R3-140");
    const sepertiga = cocok(r, /sekitar sepertiga dari ±(\d+) juta job per hari/)[1];
    const v1 = cocok(r, /±(\d+) juta job per hari, (\d+) worker, (\d+) dispatcher, (\d+) scheduler, (\d+) VM di dua datacenter/);
    expect(cocok(r, /introducing-solid-queue \((\d{4}-\d{2}-\d{2})/)[1]).toBe("2023-12-18");
    expect(cocok(r, /solid-queue-v1-0 \((\d{4}-\d{2}-\d{2})/)[1]).toBe("2024-09-26");
    expect(r).toContain("Solid Queue berjalan di database sendiri, terpisah dari database aplikasi, satu primary dan dua replika");
    expect(r).toContain("posting 1.0 tidak menyebut SKIP LOCKED");
    expect(r).toContain("FOR UPDATE SKIP LOCKED");
    const perDetik = Math.round((Number(v1[1]) * 1e6) / 86400);
    expect(perDetik).toBe(231);
    harus(`sekitar sepertiga dari ±${sepertiga} juta job per hari HEY sudah berjalan di sana`);
    harus(`melaporkan ±${v1[1]} juta job per hari, ${v1[2]} worker, dan ${v1[5]} VM di dua datacenter`);
    harus(`Solid Queue melaporkan ±${v1[1]} juta job per hari, yaitu ±${perDetik} per detik rata-rata (Hitungan: ${v1[1]}.000.000 ÷ 86.400)`);
    harus("Posting 2023-12-18 menulis bahwa worker mengambil job dengan `FOR UPDATE SKIP LOCKED`");
    harus("Posting versi 1.0 (2024-09-26)");
    harus("database queue itu terpisah dari database aplikasi, dengan satu primary dan dua replika");
    expect(naskah3).toContain("±20 juta job per hari");
  });
  test("klaim dokumentasi bersandar pada isi baris riset: Redis, BullMQ, Debezium, Morling, replication slot, Laravel, Django, pg-boss, Serverpod, pgmq", () => {
    expect(barisRiset("R3-142")).toMatch(/`appendfsync everysec` \(bawaan\): bisa kehilangan 1 detik data/);
    expect(barisRiset("R3-142")).toMatch(/siapkan kehilangan "latest minutes of data"/);
    expect(barisRiset("R3-142")).toMatch(/tujuan semantik tepat sekali, "deliver at least once in the worst case scenario"/);
    expect(barisRiset("R3-141")).toMatch(/log-based CDC mengeluarkan event dalam urutan commit dengan latensi dua digit milidetik/);
    expect(barisRiset("R3-141")).toMatch(/slot bertahan saat crash, tidak tahu keadaan consumer, menahan WAL dan baris katalog/);
    expect(barisRiset("R3-141")).toMatch(/relay bisa memublikasikan lebih dari sekali sehingga consumer harus idempoten/);
    expect(barisRiset("R3-141")).toMatch(/urutan di tabel outbox tidak dijamin sama dengan urutan commit/);
    expect(barisRiset("R3-143")).toMatch(/`after_commit` true atau `afterCommit\(\)` membuat Laravel menunggu transaction terbuka COMMIT sebelum men-dispatch/);
    expect(barisRiset("R3-143")).toMatch(/job yang di-dispatch di transaction yang rollback karena exception dibuang/);
    expect(barisRiset("R3-143")).toMatch(/Django tidak menyediakan worker; backend bawaan `ImmediateBackend` dan `DummyBackend` untuk pengembangan dan uji/);
    expect(barisRiset("R3-143")).toMatch(/callback `on_commit` dijalankan sesudah COMMIT, dibuang bila rollback, kegagalan callback tidak membatalkan transaction; halaman tidak menyebut retry otomatis/);
    expect(barisRiset("R3-144")).toMatch(/memakai SKIP LOCKED, "Send or complete jobs inside your existing transaction" lewat adapter Drizzle, Knex, Kysely, dan Prisma; halaman tidak menyebut jaminan pengiriman/);
    expect(barisRiset("R3-144")).toMatch(/"runs at least once"[^|]*exception tidak diulang; halaman tidak menyebut Session atau transaction/);
    expect(barisRiset("R3-144")).toMatch(/Supabase Queues di atas ekstensi pgmq, "delivered exactly once to a consumer within a customizable visibility window"[^|]*tidak membahas transaction/);
    expect(barisRiset("R3-144")).toMatch(/"exactly once delivery of a message within a visibility timeout"[^|]*tidak membahas pemanggilan di dalam transaction/);
    // Teks halaman yang bersandar pada baris di atas.
    harus("Redis dengan AOF `everysec` bisa kehilangan 1 detik data, dan RDB beberapa menit");
    harus("BullMQ menyebut tujuannya semantik tepat sekali, dengan jaminan terkirim minimal sekali dalam kasus terburuk.");
    harus("dengan latensi dua digit milidetik menurut Morling");
    harus("Replication slot menahan WAL bila konsumennya mati");
    harus("Job yang di-dispatch di transaction yang rollback karena exception dibuang.");
    harus("Django tidak punya worker bawaan, dan backend bawaannya hanya untuk pengembangan dan uji.");
    harus("Kegagalan callback tidak membatalkan transaction, dan halaman Transactions tidak menyebut retry otomatis.");
    harus("Halaman utamanya menyebut `SKIP LOCKED` dan menyebut bahwa job bisa dibuat di dalam transaction yang sudah ada lewat adapter untuk Drizzle, Knex, Kysely, dan Prisma.");
    harus("Halaman itu tidak menyebut jaminan pengiriman, jadi penerima tetap diperlakukan sebagai penerima at-least-once.");
    harus("future call disimpan di database, bertahan saat server restart, dan dijalankan at-least-once.");
    harus("Halaman itu tidak menyebut apakah penjadwalan bisa ikut transaction database yang sama dengan datamu.");
    harus("Menurut pgmq, pesan terkirim tepat sekali selama visibility timeout");
    harus("Dokumentasi yang dibuka tidak membahas pemanggilan di dalam transaction.");
  });
  test("klaim [perlu verifikasi] ada di tab Serverpod dan Supabase saja (dua tempat)", () => {
    expect(badan.match(/\[perlu verifikasi\]/g)!.length).toBe(3); // satu penjelasan, Serverpod, Supabase
  });
  test("ID riset tidak tampil ke pembaca (halaman, diagram, kartu, halaman istilah yang tampil)", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string }[]).filter((k) => k.halaman === "t3-outbox");
    expect(kartu.length).toBe(4);
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, atau nama tes lab (keputusan 1035)", () => {
    // Meniru Snippet.astro: berkas, lalu rentang baris, lalu region, tanpa baris penanda `--8<-- [`. Komentar ikut tampil ke pembaca.
    const tampil = (tag: string): string => {
      const atr = (n: string) => tag.match(new RegExp(`${n}="([^"]*)"`))?.[1];
      const file = atr("file");
      let src = file ? baca(file) : "";
      const rentang = atr("lines");
      if (rentang) {
        const [a, b] = rentang.split(":").map(Number);
        src = src.split("\n").slice(a! - 1, b).join("\n");
      }
      const region = atr("region");
      if (region) {
        const l = src.split("\n");
        src = l.slice(l.findIndex((x) => x.includes(`--8<-- [start:${region}]`)) + 1, l.findIndex((x) => x.includes(`--8<-- [end:${region}]`))).join("\n");
      }
      return src.split("\n").filter((l) => !l.includes("--8<-- [")).join("\n");
    };
    const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!).filter((t) => /file="/.test(t));
    expect(tag.length).toBeGreaterThanOrEqual(3);
    for (const t of tag) {
      const isi = tampil(t);
      expect(isi.length, t).toBeGreaterThan(0);
      expect(isi, t).not.toMatch(/\bR\d-\d{2,3}\b|\bPR #?\d{3}\b|\bkeputusan \d{3}\b|\bTest[A-Z][A-Za-z]+/);
    }
  });
  test("baris riset R3-140 sampai R3-144 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidik jarinya", () => {
    const hasil = Object.fromEntries(["R3-140", "R3-141", "R3-142", "R3-143", "R3-144"].map((id) => [id, sidik(barisRiset(id))]));
    expect(hasil).toEqual(SIDIK_RISET);
  });
  test("halaman 3.9 tidak membuka isi halaman sesudahnya: tanpa dead-letter, jitter, kelas prioritas sebagai bahan, atau LISTEN sebagai solusi", () => {
    expect(badan).not.toMatch(/jitter/i);
    expect(badan).not.toMatch(/dead-letter/i);
    expect(badan).not.toMatch(/backoff dan jitter/);
    expect(badan).not.toMatch(/10\.000 promo ÷|750 detik/);
  });
});

describe("halaman istilah Outbox dan Worker, glosarium, dan peleburan B10.1", () => {
  const slugs = ["outbox", "worker"];
  test("dua halaman istilah valid, rujukan ke 3.9, tanpa tabel stack, rekaman dan riset ada", () => {
    for (const s of slugs) {
      const d = HalamanIstilah.parse(JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`)));
      expect(d.cerita!.some((c) => c.rujukan === "t3-outbox"), s).toBe(true);
      expect(d.stack).toBeNull();
      for (const x of d.sumber!) {
        if ("rekaman" in x) expect(fs.existsSync(path.join(akar, x.rekaman)), x.rekaman).toBe(true);
        if (x.riset) expect(riset, x.riset).toContain(`| ${x.riset} |`);
      }
    }
  });
  test("isi dua halaman istilah (arti, cerita, mekanisme, jebakan, terkait, sumber) dikunci dengan sidik jari; angkanya diturunkan dari rekaman", () => {
    const isi = Object.fromEntries(slugs.map((s) => [s, sidik(JSON.stringify(JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`))))]));
    expect(isi).toEqual(SIDIK_ISTILAH);
    const w = JSON.parse(baca("situs/data/halaman-istilah/worker.json")) as { mekanisme: string[] };
    expect(w.mekanisme[1]).toBe(`Ia mengklaim beberapa baris sekaligus, ${kata(Number(kap[3]))} di lab, dan memegangnya selama ${cocok(workerGo, /Klaim: (\d+) \* time\.Second/)[1]} detik.`);
    expect(w.mekanisme[3]).toBe(`Bila queue kosong, ia menunggu ${cocok(workerGo, /Selang: (\d+) \* time\.Millisecond/)[1]} milidetik lalu memeriksa lagi.`);
    const o = JSON.parse(baca("situs/data/halaman-istilah/outbox.json")) as { cerita: { teks: string }[]; sumber: { rekaman?: string; catatan: string }[] };
    expect(o.cerita[1]!.teks).toContain(`jurnal ${jurnalA}`);
    expect(o.sumber[2]!.catatan).toContain(`Bagian B: sebelum COMMIT worker mengklaim ${workerBsebelum[1]} baris.`);
    const wk = JSON.parse(baca("situs/data/halaman-istilah/worker.json")) as { sumber: { catatan: string }[] };
    expect(wk.sumber[1]!.catatan).toContain("Bagian B: tiga worker serentak mengirim 60 baris tanpa ganda.");
    expect(klaimTxt.join("\n")).toContain("jumlah diklaim ketiga worker: 60; jumlah terkirim: 60");
    expect(wk.sumber[2]!.catatan).toBe("Bagian G: klaim habis, baris dikirim ulang, dan layanan push menerima 2 pesan dengan 1 notifikasi_id.");
  });
  test("glosarium: Outbox, Worker, dan Queue menuju 3.9; At-least-once dan Dead-letter queue menuju 3.13; halaman istilah Outbox dan Worker terpasang; Lease tetap B10.1", () => {
    const g = baca("situs/src/content/docs/alat/glosarium.mdx");
    const barisG = (nama: string) => g.split("\n").find((b) => b.startsWith(`| **${nama}** |`))!;
    for (const nama of ["Outbox", "Worker", "Queue"]) expect(barisG(nama), nama).toMatch(/\| \[\[t3-outbox\]\] \|$/);
    for (const nama of ["At-least-once", "Dead-letter queue"]) expect(barisG(nama), nama).toMatch(/\| \[\[t3-at-least-once\]\] \|$/);
    for (const nama of ["Lease"]) expect(barisG(nama), nama).toMatch(/\| \[\[B10\.1\]\] \|$/);
    expect(barisG("Outbox")).toContain("Tabel tempat event ditulis dalam transaction yang sama dengan perubahan data, lalu dikirim oleh worker.");
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null; b: string | null }[];
    expect(glos.find((x) => x.t === "Outbox")).toMatchObject({ h: "/istilah/outbox/", b: "t3-outbox" });
    expect(glos.find((x) => x.t === "Worker")).toMatchObject({ h: "/istilah/worker/", b: "t3-outbox" });
    expect(glos.find((x) => x.t === "Queue")!.b).toBe("t3-outbox");
  });
});

describe("tab Di stack lain: kode dikunci utuh, label per tab, versi per tab", () => {
  test("enam tab sama dengan 3.5; Go dijalankan, lima lain Tidak dijalankan; kode ilustrasi dikunci", () => {
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect(hal35).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...badan.matchAll(/^\*(Dijalankan|Tidak dijalankan)[.:]/gm)].map((m) => m[1])).toEqual(["Dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan"]);
    expect(kodeBlok).toEqual(KODE_STACK);
    expect(badan.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(3);
    expect(badan.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect(badan.match(/\*\*Yang berbeda di stack ini:\*\*/g)).toHaveLength(6);
  });
  test("kode Laravel mengikuti dokumentasi (afterCommit), Django (on_commit dengan partial dan enqueue), Supabase (pgmq.send dengan nama antrean dan JSON)", () => {
    expect(kodeBlok[0]).toContain("->afterCommit()");
    expect(barisRiset("R3-143")).toContain("`afterCommit()`");
    expect(kodeBlok[1]).toContain("transaction.on_commit(partial(kirim_notifikasi.enqueue, jurnal_id=jurnal.id))");
    expect(barisRiset("R3-143")).toContain("transaction.on_commit()");
    expect(kodeBlok[2]).toContain("SELECT pgmq.send('notifikasi', '{\"jurnal_id\": 10001}');");
    expect(barisRiset("R3-144")).toContain("`pgmq.send(queue_name, msg, delay)`");
    expect(kodeBlok[2]).toContain(`"jurnal_id": ${jurnalA}`);
  });
});

describe("kartu Cek diri dan details: jumlah dan teks", () => {
  test("Sudah tahu? Cek 3 pertanyaan sama dengan jumlah butir bernomor; Cek diri punya empat kartu", () => {
    const sum = cocok(badan, /<summary>Sudah tahu\? Cek (\d+) pertanyaan<\/summary>\n\n((?:\d+\. .+\n)+)/);
    expect(Number(sum[1])).toBe(sum[2]!.trim().split("\n").length);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(4);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(4);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string; tanya: string }[]).filter((k) => k.halaman === "t3-outbox");
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
  });
  test("posisi pilihan benar tidak ditulis di halaman (widget: tebakan di mesin yang sama)", () => {
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga) benar/);
  });
});

// Baris halaman yang bukan hasil turunan: paragraf, item daftar, sel tabel, judul, dan atribut `aman`. Setiap baris
// harus ada di KALIMAT_TERKUNCI; setiap entri di KALIMAT_TERKUNCI harus ada di halaman.
function satuan(b: string): string[] {
  const hasil: string[] = [];
  for (const mentah of b.split("\n")) {
    const l = mentah.trim();
    if (!l || l.startsWith("import ") || l.startsWith("<Snippet") || l.startsWith("<Rantai") || l.startsWith("<OutboxWorker") || l.startsWith('<p class="meta"')) continue;
    if (l.startsWith("</") || l.startsWith("<details") || l.startsWith("<summary>") || /^\|[-| ]+\|$/.test(l)) continue;
    if (["<noscript>", "<ol>", "```json", "```text", "```", "</Fragment>"].includes(l) || l.startsWith("<TabSet") || l.startsWith("<Fragment")) continue;
    const aman = l.match(/^<Blok nama="[^"]+"(?: buka)?(?: aman="([^"]+)")?>$/);
    if (aman) {
      if (aman[1]) hasil.push(aman[1]);
      continue;
    }
    if (l.startsWith("|")) {
      for (const c of l.split("|").slice(1, -1)) hasil.push(c.trim());
      continue;
    }
    hasil.push(l.replace(/^#+ /, "").replace(/^(- \[ \] |\- |\d+\. )/, ""));
  }
  return hasil;
}

describe("setiap kalimat di halaman punya asal", () => {
  test("tidak ada kalimat yang bukan terkunci", () => {
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(satuan(badanTanpaKode).filter((s) => !sah.has(s))).toEqual([]);
  });
  test("tidak ada entri terkunci yang sudah hilang dari halaman, dan urutannya sama", () => {
    expect(satuan(badanTanpaKode)).toEqual(KALIMAT_TERKUNCI);
  });
  test("tabel dikunci per baris dan per kolom: jumlah sel per baris sama, tidak ada sel yang bertukar baris", () => {
    const tabel = badanTanpaKode.split("\n").filter((b) => b.startsWith("|") && !/^\|[-| ]+\|$/.test(b));
    const lebar = tabel.map((b) => b.split("|").length - 2);
    expect(lebar).toEqual(LEBAR_TABEL);
    expect(sidik(tabel.join("\n"))).toBe(SIDIK_TABEL);
  });
});

// Struktur yang tidak ikut terkunci oleh satuan(): tingkat heading, nomor daftar, slot tab, dan judul diagram (tinjauan, keputusan 1035).
// Uji mutasi peninjau: 17 dari 17 mutasi tingkat heading, 11 mutasi nomor daftar, 1 mutasi slot tab, dan 2 mutasi id/judul diagram lolos sebelum tes ini.
describe("struktur halaman: heading, daftar bernomor, slot tab, judul diagram", () => {
  test("tingkat heading dikunci: Inti h2, bagian lain h3, urutan dan teks tetap", () => {
    let dalamKode = false;
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      if (b.trim().startsWith("```")) { dalamKode = !dalamKode; continue; }
      const m = !dalamKode && b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([
      [2, "Inti"],
      [3, "Kenapa ini ada"],
      [3, "Cara kerjanya"],
      [3, "Di stack lain"],
      [3, "ADR 23: outbox di PostgreSQL, worker di proses terpisah"],
      [3, "Sengaja belum dilakukan"],
      [3, "Cek diri"],
      [3, "Saat me-review kode AI, cek ini"],
      [3, "Bacaan lanjut"],
    ]);
    // Sama dengan halaman tetangga yang memakai templat konsep yang sama (3.8).
    const hd38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx").split("\n").filter((b) => /^#{2,3} /.test(b)).map((b) => b.match(/^#+/)![0].length);
    expect(hd.map((x) => x[0])).toEqual(hd38);
  });
  test("daftar bernomor mulai dari 1 dan naik satu per butir", () => {
    const grup: number[][] = [];
    let sebelum: number | null = null;
    for (const b of badan.split("\n")) {
      const m = b.match(/^(\d+)\. /);
      if (!m) { sebelum = null; continue; }
      const n = Number(m[1]);
      if (sebelum === null) grup.push([]);
      grup[grup.length - 1]!.push(n);
      sebelum = n;
    }
    expect(grup.map((g) => g.length)).toEqual([3, 6, 3]);
    for (const g of grup) expect(g).toEqual(g.map((_, i) => i + 1));
  });
  test("slot tab berurutan t0 sampai t5 dan tiap slot memuat sumber yang sama dengan labelnya", () => {
    expect([...badan.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1])).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    const potong = badan.split(/<Fragment slot="t\d">/).slice(1);
    const penanda = ["lab api-t3 dan t3-outbox", "[pg-boss](", "[Laravel 13.x: Queues](", "[Django 6.1: Tasks](", "[Serverpod: Scheduling](", "[Supabase: Queues]("];
    penanda.forEach((p, i) => expect(potong[i]!.split("</Fragment>")[0], `slot t${i}`).toContain(p));
  });
  test("judul dan id diagram Inti", () => {
    expect(diagram.id).toBe("t3-outbox-inti");
    expect(diagram.judul).toBe("Satu pembayaran lewat outbox");
    expect(diagram.baris).toHaveLength(2);
  });
});

const labelWidgetCara = JSON.parse(baca("situs/data/widget/t3-outbox-worker.json"));
const SIDIK_RISET: Record<string, string> = {
  "R3-140": "83aab0435ddb7c85",
  "R3-141": "9d49615bb51e9dc4",
  "R3-142": "c18eb424653303b0",
  "R3-143": "b68ec9237f3bfc6e",
  "R3-144": "c7d80f383fa21501"
};
const SIDIK_ISTILAH: Record<string, string> = {
  "outbox": "2465a8311c91fcfc",
  "worker": "4a87a1da9ebf83a2"
};
const SIDIK_TABEL = "8a844c53474e7c3d";
const LEBAR_TABEL: number[] = [3,3,3,3,3,3,3,5,5,5,5,5,5,3,3,3,3];
const KODE_STACK: string[] = [
  "DB::transaction(function () use ($jurnal) {\n    // tulis jurnal dan posting\n    NotifikasiUang::dispatch($jurnal->id)->afterCommit();\n});",
  "with transaction.atomic():\n    jurnal = Jurnal.objects.create(...)\n    transaction.on_commit(partial(kirim_notifikasi.enqueue, jurnal_id=jurnal.id))",
  "BEGIN;\n-- INSERT jurnal dan posting\nSELECT pgmq.send('notifikasi', '{\"jurnal_id\": 10001}');\nCOMMIT;"
];
const KALIMAT_TERKUNCI: string[] = [
  "Inti",
  "Pembayaran menulis jurnal dan satu baris outbox di satu COMMIT, dan worker mengirim pemberitahuannya sesudah itu.",
  "Outbox adalah tabel di PostgreSQL yang menampung pemberitahuan yang belum terkirim, dan worker adalah proses terpisah yang mengirim isinya ke layanan push. Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `transaksi.txt` bagian A, Budi membayar Rp25.000 ke warung Ani dan API menjawab 201. Jurnal 10001 punya dua posting, tabel `outbox` punya satu baris berstatus `menunggu`, dan layanan push tiruan menerima 0 pesan. Sesudah worker berjalan sekali, layanan itu menerima 1 pesan.",
  "Tiga hal di [[t3-dua-tempat]] terjaga di rekaman. Selagi sesi tangan memegang transaction yang belum COMMIT, worker mengklaim 0 baris, jadi pemberitahuan tidak mendahului uangnya (bagian B). Proses API yang dimatikan sesudah 201 tidak menghilangkan baris, dan worker mengirimnya (bagian F). Uang tidak menunggu pihak luar, karena pembayaran selesai sebelum layanan push menerima apa pun (bagian A).",
  "Sesi tangan menulis jurnal dan baris outbox tetapi belum COMMIT. Kenapa worker yang berjalan saat itu mengklaim 0 baris?",
  "Proses API mati sesudah menjawab 201. Kenapa Ani tetap diberi tahu?",
  "Layanan push tiruan menerima 0 pesan saat pembayaran selesai. Apakah pemberitahuannya hilang?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Kalau berhenti di sini, kamu sudah tahu: hanya cara outbox yang menjaga ketiga hal saat proses API mati, karena pemberitahuannya sudah menjadi baris yang ikut COMMIT.",
  "Widget memerankan satu pembayaran Budi ke warung Ani dengan tiga cara mengirim pemberitahuan dan lima kejadian. Tebak dulu, lalu ubah satu hal. Empat dari lima kejadian pada cara outbox punya Rekaman lab, dan Push menggantung pada cara itu adalah Hitungan, yaitu hasil rumus dari angka rekaman. Semua hasil pada dua cara lain adalah Ilustrasi, yaitu penalaran dari urutan langkah.",
  "**Ubah satu hal:** pilih kejadian Proses API mati, lalu ganti cara kirim. Pada Push di dalam transaction, HP Ani menerima notifikasi tentang uang yang tidak ada: 1 dari 3 hal terpenuhi. Pada Push sesudah COMMIT di permintaan yang sama, uangnya ada dan HP Ani tidak menerima apa pun, tanpa baris yang menunggu: 2 dari 3. Pada Outbox dan worker, baris tersimpan bersama jurnal dan worker mengirimnya: 3 dari 3 (`transaksi.txt` bagian F).",
  "Kenapa ini ada",
  "[[t3-dua-tempat]] menunjukkan bahwa PostgreSQL dan layanan push tidak bisa COMMIT bersama. [[t3-m18]] menunjukkan harganya: push yang menggantung di dalam transaction menahan koneksi sampai pool penuh. Outbox menjawab keduanya dengan satu aturan. Apa pun yang menyentuh pihak luar dikerjakan sesudah COMMIT, dan yang tertinggal di PostgreSQL hanya satu baris yang berarti \"kirim ini\".",
  "[[t2-adr-21]] menunda queue sampai L = λ × (0,02 + W luar) mencapai 5 koneksi. Di puncak, λ = 0,868 pembayaran per detik (Asumsi, yaitu angka beban dari cerita). Pemicu itu tercapai pada W luar ±5,7 detik (Hitungan: 5 ÷ 0,868 − 0,02 = 5,74).",
  "Layanan push yang menggantung melewatinya: untuk t = 10 detik, lab t3-pool menghitung L = 8,717 dengan λ = 0,87, yaitu 0,868 yang dibulatkan (`little.txt`). Karena itu queue masuk di Tahap 3.",
  "PRD v3 menjanjikan 95% pemberitahuan bayar dan transfer diserahkan ke layanan push dalam kurang dari 30 detik ([[t3-prd]]). Pengukurannya berhenti saat pesan diserahkan, bukan saat HP menerimanya.",
  "Cara kerjanya",
  "**Tulis dan kirim dipisah oleh COMMIT.** Saat Budi membayar, service menulis jurnal, dua posting, dan satu baris `outbox` di transaction yang sama. Tidak ada panggilan jaringan di dalamnya, dan baris outbox ditulis dengan satu `INSERT`.",
  "Bila COMMIT gagal, baris outbox ikut hilang, dan bila berhasil, baris itu ikut tersimpan. Bagian B merekam akibatnya bagi worker:",
  "Satu pertanyaan mendapat dua jawaban: sesi tangan melihat 1 baris, dan sesi lain, termasuk worker, melihat 0. Kebalikannya juga terekam. Bila `INSERT` outbox di kode API gagal, pembayarannya ikut batal (bagian G, dibahas di [[t3-notifikasi]]).",
  "**Worker mengklaim baris.** Worker adalah `api-t3 -peran worker`, proses yang terpisah dari server API. Ia mengklaim sampai empat baris, mengirimnya serentak, lalu menandai tiap baris `terkirim`, `dilewati`, ditunda dengan backoff, atau `mati`.",
  "Bila queue kosong, ia menunggu 200 milidetik sebelum memeriksa lagi. Klaimnya satu pernyataan SQL:",
  "Dua hal bekerja bersama di pernyataan itu. `FOR UPDATE` mengunci baris yang dipilih selama klaim, dan `klaim_sampai` menahannya sesudahnya selama 5 detik. Itulah yang mencegah dua worker mengirim baris yang sama selagi klaim berlaku. Tanpa klausa kunci sama sekali, dua sesi memilih nomor 1 sampai 4 yang sama (`klaim.txt` bagian A).",
  "`SKIP LOCKED` tidak menambah kebenaran. Ia mengganti menunggu dengan melewati baris yang terkunci, dan dokumentasi menyebut ongkosnya: tampilan data yang tidak konsisten ([PostgreSQL 17: The Locking Clause](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE), dibuka 2026-10-26). Rinciannya ada di [[t3-klaim-baris]].",
  "**Satu baris bisa terkirim dua kali.** Worker menandai `terkirim` sesudah layanan push menjawab. Bila ia berhenti di antara dua langkah itu, klaim habis dan worker lain mengirim baris yang sama lagi. Di `outbox.txt` bagian G, layanan push tiruan menerima 2 pesan dengan 1 `notifikasi_id`.",
  "Mengirim ulang itu benar. Penerima yang mengenali `notifikasi_id` menyaring ulangannya, dan itu isi [[t3-at-least-once]].",
  "**Urutan antar pesan tidak dijaga.** Di `klaim.txt` bagian C, worker yang macet memegang baris 1, dan pesan 2 sampai 5 tiba lebih dulu sehingga pesan tertua tiba paling akhir. Nomor outbox juga bukan nomor tanpa celah: baris yang di-ROLLBACK memakai nomornya (`listen.txt` bagian A). Akibatnya bagi poller dengan kursor ada di [[t3-m19]].",
  "**Berapa cepat dan berapa besar.** Angka di tabel ini berlabel per baris, dan arti labelnya ada di [Label sumber](/cara-pakai/#label-sumber).",
  "Besaran",
  "Nilai",
  "Label",
  "Kapasitas worker (c ÷ t)",
  "4 ÷ 0,3 = 13,33 per detik; terukur antara 12 dan 13,33",
  "Rekaman lab `queue.txt` bagian A; c dan t Asumsi",
  "Kapasitas lawan puncak",
  "13,33 ÷ 0,868 = ±15 kali",
  "Asumsi",
  "Jeda worker saat queue kosong",
  "200 milidetik",
  "Kode `worker.go`; Asumsi lab",
  "`outbox` tanpa pembersihan",
  "±820 MB per tahun",
  "Asumsi, rumus di [[t3-skema]]",
  "`outbox` dengan retensi 7 hari",
  "±15,8 MB",
  "Asumsi, rumus di [[t3-skema]]",
  "Baris yang dibuang `-bersih`",
  "2 dari 5 (terkirim dan dilewati, 8 hari); `menunggu` dan `mati` tetap",
  "Rekaman lab `listen.txt` bagian C",
  "Retensi adalah berapa lama baris selesai disimpan sebelum dibuang. Baris `mati` dibaca manusia dulu, jadi tabel ini butuh satu pemilik yang memeriksanya.",
  "Di stack lain",
  "**Skenario:** satu pembayaran menulis jurnal, dan pemberitahuannya harus ikut COMMIT yang sama atau hanya dikirim sesudahnya. Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-10-26. Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.",
  "Yang sama di semua stack: pemberitahuan tidak mendahului uang, dan kegagalan push tidak membatalkan pembayaran. Yang berbeda adalah siapa yang menulis tabel queue dan siapa yang mengklaim barisnya.",
  "*Dijalankan: lab api-t3 dan t3-outbox, PostgreSQL 17.11 (rekaman `transaksi.txt` bagian A sampai G).*",
  "**Yang berbeda di stack ini:** outbox adalah tabel biasa dengan `INSERT` biasa. Worker adalah binary Go yang sama dengan server API, dijalankan dengan flag peran. Klaim ditulis sebagai SQL tangan, tanpa library queue.",
  "*Tidak dijalankan. Dicek ke [pg-boss](https://pgboss.io/) 12.38.0, dibuka 2026-10-26.*",
  "**Yang berbeda di stack ini:** pg-boss adalah job queue Node.js di atas PostgreSQL. Halaman utamanya menyebut `SKIP LOCKED` dan menyebut bahwa job bisa dibuat di dalam transaction yang sudah ada lewat adapter untuk Drizzle, Knex, Kysely, dan Prisma. Tabel dan klaim disediakan library, jadi kamu tidak menulisnya. Halaman itu tidak menyebut jaminan pengiriman, jadi penerima tetap diperlakukan sebagai penerima at-least-once.",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: Queues](https://laravel.com/docs/13.x/queues), `laravel/framework` 13.38.0. Kode di bawah adalah Ilustrasi.*",
  "**Yang berbeda di stack ini:** dengan `after_commit` atau `afterCommit()`, Laravel menunggu transaction terbuka COMMIT sebelum men-dispatch job. Job yang di-dispatch di transaction yang rollback karena exception dibuang. Itu pola \"kirim sesudah COMMIT\" di opsi A di bawah. Jendela di antara COMMIT dan dispatch tidak ditulis di dokumentasi; bahwa proses yang mati di sana kehilangan job adalah penalaran.",
  "*Tidak dijalankan. Dicek ke [Django 6.1: Tasks](https://docs.djangoproject.com/en/6.1/topics/tasks/) dan [Transactions](https://docs.djangoproject.com/en/6.1/topics/db/transactions/), Django 6.1.2. Kode di bawah adalah Ilustrasi.*",
  "**Yang berbeda di stack ini:** Django tidak punya worker bawaan, dan backend bawaannya hanya untuk pengembangan dan uji. Callback `on_commit` dijalankan sesudah COMMIT dan dibuang bila transaction rollback. Kegagalan callback tidak membatalkan transaction, dan halaman Transactions tidak menyebut retry otomatis. Sama seperti Laravel, ini pola opsi A.",
  "*Tidak dijalankan. Dicek ke [Serverpod: Scheduling](https://docs.serverpod.dev/concepts/scheduling/overview), Serverpod 4.0.4.*",
  "**Yang berbeda di stack ini:** future call disimpan di database, bertahan saat server restart, dan dijalankan at-least-once. Bila metodenya melempar exception, Serverpod mencatat error dan tidak mengulangnya. Halaman itu tidak menyebut apakah penjadwalan bisa ikut transaction database yang sama dengan datamu. Untuk COMMIT yang sama dengan jurnal, tabel outbox sendiri tetap kandidat [perlu verifikasi].",
  "*Tidak dijalankan. Dicek ke [Supabase: Queues](https://supabase.com/docs/guides/queues) dan [pgmq](https://github.com/pgmq/pgmq) v1.10.0. Kode di bawah adalah Ilustrasi.*",
  "**Yang berbeda di stack ini:** Supabase Queues memakai ekstensi pgmq, dan `pgmq.send` adalah fungsi SQL biasa di database yang sama. Menurut pgmq, pesan terkirim tepat sekali selama visibility timeout, yaitu lama pesan disembunyikan sesudah dibaca. Dokumentasi yang dibuka tidak membahas pemanggilan di dalam transaction. Bahwa pesan ikut COMMIT adalah penalaran [perlu verifikasi].",
  "ADR 23: outbox di PostgreSQL, worker di proses terpisah",
  "**Kebutuhan.** Pembayaran harus memberi tahu Ani tanpa melanggar tiga hal di [[t3-dua-tempat]]. Bebannya kecil: 7.500 bayar dan transfer per hari dan 0,868 per detik di puncak (Asumsi, rumus di [[t3-skema]]).",
  "**Status:** diterima sesudah M18 (minggu 3) dan sebelum M19 (minggu 4), karena poller yang gagal di M19 membaca tabel outbox ini ([[t3-m18]], [[t3-m19]]). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR. Dibuka lagi oleh ADR 32 untuk kelas queue ([[t3-tim-infra]]).",
  "",
  "A. Kirim sesudah COMMIT, tanpa outbox",
  "B. Queue di Redis",
  "C. Log-based CDC (Debezium dan Kafka)",
  "D. Outbox di PostgreSQL, worker terpisah",
  "Cara kerja",
  "Proses API men-COMMIT jurnal, lalu memanggil layanan push atau memasukkan job ke queue",
  "Sesudah COMMIT, API mendorong job ke Redis, dan worker membacanya dari sana",
  "API menulis baris outbox di transaction jurnal. Debezium membaca log transaksi PostgreSQL dan menerbitkan baris itu ke Kafka",
  "API menulis baris outbox di transaction jurnal. Worker mengklaim baris dan mengirimnya",
  "Kelebihan",
  "Tanpa tabel dan tanpa proses baru. Tidak ada push di dalam transaction",
  "Library queue siap pakai, dan pembacaan queue tidak menyentuh PostgreSQL",
  "Tanpa polling. Event keluar dalam urutan commit, dengan latensi dua digit milidetik menurut Morling",
  "Pemberitahuan ikut COMMIT dan ROLLBACK jurnal. Satu komponen data, yaitu PostgreSQL",
  "Kekurangan",
  "Proses yang mati di antara COMMIT dan kirim tidak meninggalkan catatan, jadi pemberitahuan hilang tanpa ada yang tahu",
  "Dua sistem tidak bisa COMMIT bersama. Redis dengan AOF `everysec` bisa kehilangan 1 detik data, dan RDB beberapa menit",
  "Butuh Kafka, Kafka Connect, dan Debezium. Replication slot menahan WAL bila konsumennya mati",
  "Polling dan klaim per baris tidak menjaga urutan antar pesan. Tabel butuh retensi",
  "Biaya operasional",
  "Tidak ada tambahan, dan tidak ada yang dipantau",
  "Komponen yang menyimpan data, dengan persistence dan alert sendiri. [[t2-adr-21]] menunda Redis sampai kebutuhannya terbukti",
  "Tiga komponen baru, satu tim yang memahaminya, dan replication slot yang diawasi",
  "Satu proses worker dan satu tabel. Alert umur baris tertua",
  "Bukti",
  "Tidak dijalankan. `transaksi.txt` bagian F menulis opsi ini Tidak dijalankan di lab t3-outbox. Laravel dan Django di tab stack lain mengikuti pola ini",
  "Tidak dijalankan. Dokumentasi Redis persistence dan BullMQ",
  "Tidak dijalankan. Debezium (2019) dan Morling (2024), PostgreSQL 17 logical decoding",
  "Rekaman lab `transaksi.txt` bagian A sampai G dan `klaim.txt`",
  "**Keputusan: opsi D.** Enam aturan:",
  "Pemberitahuan ditulis sebagai satu baris `outbox` di transaction yang sama dengan jurnal, dengan `INSERT` biasa dan tanpa panggilan jaringan.",
  "Satu pemberitahuan per jurnal per penerima. Unique index `outbox_satu_per_jurnal` menolak baris kedua (`transaksi.txt` bagian E).",
  "Worker berjalan di proses sendiri dan mengklaim baris dengan `FOR UPDATE` dan `klaim_sampai`. ADR 24 merincinya ([[t3-klaim-baris]]).",
  "Pengiriman at-least-once, `notifikasi_id` tetap sama di semua percobaan, dan penerima menyaring ulangan. ADR 25 merincinya ([[t3-at-least-once]]).",
  "Baris `terkirim` dan `dilewati` dibuang sesudah 7 hari oleh `-bersih`. Baris `menunggu` dan `mati` tidak dibuang. Lab menjalankan `-bersih` dengan tangan dan tidak menjadwalkannya.",
  "Janji 30 detik diukur sampai pesan diserahkan ke layanan push. Alert umur tertua ditentukan di ADR 32 ([[t3-tim-infra]]).",
  "**Kenapa D, bukan A, B, atau C.**",
  "**A ditolak** karena tidak ada catatan di antara COMMIT dan kirim. Yang direkam hanya sisi outbox: proses API mati sesudah COMMIT, dan barisnya tetap ada (`transaksi.txt` bagian F).",
  "**B ditolak** karena Redis bukan bagian dari COMMIT PostgreSQL, dan [[t2-adr-21]] belum punya kebutuhan yang membuka Redis. BullMQ menyebut tujuannya semantik tepat sekali, dengan jaminan terkirim minimal sekali dalam kasus terburuk.",
  "**C ditolak untuk sekarang** karena tiga komponen baru tidak sebanding dengan 0,868 pemberitahuan per detik. Morling sendiri mencatat bahwa polling punya urutan buruk dan CDC punya urutan commit, jadi C menang di urutan, bukan di beban ini.",
  "**Kasus industri: Solid Queue.** 37signals memindahkan job HEY dari Resque dan Redis ke queue di database. Posting 2023-12-18 menulis bahwa worker mengambil job dengan `FOR UPDATE SKIP LOCKED`, dan sekitar sepertiga dari ±18 juta job per hari HEY sudah berjalan di sana. Posting versi 1.0 (2024-09-26) melaporkan ±20 juta job per hari, 800 worker, dan 74 VM di dua datacenter.",
  "Batasnya: database queue itu terpisah dari database aplikasi, dengan satu primary dan dua replika. Karena itu satu COMMIT tidak mencakup keduanya (penalaran dari posting itu). Kasus ini membuktikan bahwa queue di database dan `SKIP LOCKED` bertahan di skala besar, bukan bahwa pola outbox bertahan.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "Kode baru menulis outbox di luar transaction jurnal, misalnya sesudah COMMIT. Tes biasa lolos. Di lab, mutasi itu lolos sampai `transaksi.txt` bagian G ditambah, yang membuat INSERT outbox yang gagal membatalkan pembayaran (tabel mutasi di README lab t3-outbox). Pencegahannya satu fungsi `beritahu` di dalam `DalamTx`, tes bagian G, dan checklist review di blok Kunci.",
  "Queue menumpuk dan alert tidak menunjuk yang benar. Umur tertua dari semua kelas lebih dari 30 detik, padahal umur tertua kelas uang 0 (`queue.txt` bagian E). Alert semua kelas berbunyi walau uang tepat waktu. Tanpa alert, keterlambatan baru diketahui dari Ani, seperti di [[t3-m27]]. Pencegahannya alert umur tertua per kelas uang, ditulis di ADR 32.",
  "Tabel tumbuh dan baris `mati` tidak pernah dibaca. Tanpa pembersihan, tabel mencapai ±820 MB per tahun, dan dengan retensi 7 hari ±15,8 MB (Asumsi). Pencegahannya `-bersih` yang dijadwalkan, karena lab hanya menjalankannya dengan tangan (`listen.txt` bagian C), dan satu pemilik untuk baris `mati`.",
  "**Kapan keputusan ini salah.**",
  "Saat beberapa consumer butuh urutan commit penuh. Klaim per baris tidak menjaga urutan (`klaim.txt` bagian C), dan CDC mengeluarkan event dalam urutan commit ([Morling, 2024-10-31](https://www.morling.dev/blog/revisiting-the-outbox-pattern/)).",
  "Saat pesan mengalir sampai tabel queue bersaing dengan transaksi uang. Solid Queue melaporkan ±20 juta job per hari, yaitu ±231 per detik rata-rata (Hitungan: 20.000.000 ÷ 86.400), dengan database queue sendiri. Batas database lab ini belum diukur: 13,33 per detik adalah c ÷ t, bukan batas PostgreSQL (Tidak dijalankan).",
  "Saat penerimanya sistem lain yang menggerakkan uang, misalnya webhook di Tahap 4. Penerima wajib idempoten dengan key ([[t2-idempotency]]).",
  "**Yang akan merevisinya.** ADR 32 menambah kelas queue dan alert per kelas ([[t3-m27]]). ADR 24 dan ADR 25 mengisi klaim dan pengiriman ulang. ADR 33 mencatat CDC sebagai yang sengaja belum dilakukan ([[t3-adr-33]]).",
  "Sengaja belum dilakukan",
  "Yang ditunda",
  "Kenapa ditunda",
  "Muncul lagi di",
  "`LISTEN` dan `NOTIFY` untuk membangunkan worker",
  "Polling 200 milidetik cukup untuk 0,868 per detik. `NOTIFY` hanya membangunkan, dan sumbernya tetap tabel (`listen.txt` bagian B)",
  "[[t3-klaim-baris]]",
  "Kelas queue dan batas laju promo",
  "Masalahnya baru terlihat saat 10.000 promo menumpuk di depan notifikasi uang. Lab memuat kelas karena ia memuat skema akhir Tahap 3; ADR 23 ditulis tanpanya",
  "[[t3-m27]]",
  "Log-based CDC",
  "Tiga komponen baru tanpa kebutuhan urutan commit penuh",
  "[[t3-adr-33]]",
  "Cek diri",
  "**1.** Sesi tangan menulis jurnal dan baris outbox tetapi belum COMMIT. Kenapa worker yang berjalan saat itu mengklaim 0 baris?",
  "Baris outbox ditulis di transaction yang sama dengan jurnal. Yang belum COMMIT tidak terlihat oleh sesi lain. `transaksi.txt` bagian B: sesi tangan melihat 1 baris, sesi lain 0. Setelah COMMIT, worker mengklaim 1 dan mengirimnya.",
  "**2.** Proses API mati sesudah menjawab 201. Kenapa Ani tetap diberi tahu?",
  "Pemberitahuannya sudah menjadi baris `menunggu` yang tersimpan bersama jurnal. Worker, proses lain, mengirimnya (`transaksi.txt` bagian F). Tanpa outbox, proses yang mati di antara COMMIT dan kirim tidak meninggalkan catatan. Opsi itu Tidak dijalankan di lab.",
  "**3.** Dua worker memilih baris yang sama bila klausa kunci dihapus. Apa yang mencegahnya, dan apa yang ditambah `SKIP LOCKED`?",
  "`FOR UPDATE` bersama `klaim_sampai` yang mencegahnya (`klaim.txt` bagian A). `SKIP LOCKED` hanya mengganti menunggu dengan melewati baris yang terkunci. Ongkosnya tampilan data yang tidak konsisten.",
  "**4.** Kapan ADR 23 salah, dan kenapa Solid Queue tidak cukup membuktikannya benar?",
  "ADR 23 salah saat beberapa consumer butuh urutan commit penuh, atau saat pesan membuat tabel queue bersaing dengan transaksi uang. Solid Queue memakai database queue yang terpisah dari database aplikasi, jadi ia membuktikan queue di database, bukan outbox yang ikut COMMIT.",
  "Saat me-review kode AI, cek ini",
  "`INSERT` outbox ada di fungsi yang sama dengan jurnal, di dalam satu transaction, dan tidak ada panggilan push di sana ([[t3-dua-tempat]]).",
  "Ada tes yang membuktikan jurnal dan outbox hilang bersama saat ROLLBACK.",
  "Klaim memakai `FOR UPDATE` dan `klaim_sampai`; `SKIP LOCKED` bukan satu-satunya pagar.",
  "`notifikasi_id` dibuat saat `INSERT`, bukan saat kirim, supaya tetap sama di semua percobaan.",
  "Ada retensi, ada alert umur tertua per kelas uang, dan ada yang membaca baris `mati`.",
  "Bacaan lanjut",
  "[microservices.io: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)",
  "[Debezium: Reliable Microservices Data Exchange With the Outbox Pattern](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/) (2019-02-19)",
  "[Morling: Revisiting the Outbox Pattern](https://www.morling.dev/blog/revisiting-the-outbox-pattern/) (2024-10-31)",
  "[37signals: Introducing Solid Queue](https://dev.37signals.com/introducing-solid-queue/) (2023-12-18) dan [Solid Queue 1.0](https://dev.37signals.com/solid-queue-v1-0/) (2024-09-26)",
  "[PostgreSQL 17: SELECT, The Locking Clause](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE)",
  "[PostgreSQL 17: Logical decoding](https://www.postgresql.org/docs/17/logicaldecoding-explanation.html)",
  "[Redis: persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)"
];
